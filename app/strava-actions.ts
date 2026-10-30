"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { contaStrava, desligar, listarAtividades, paraAtividade, stravaConfigurado, tokenValido } from "@/lib/strava";

export interface ItemStrava {
  id: number; titulo: string; tipo: string; data: string; hora: string | null;
  km: number; dmais: number; duracao_s: number | null; privada: boolean; importada: boolean;
  /** Atividade do site que parece ser a mesma (registada à mão ou com GPX/FIT). */
  parecida: { id: string; titulo: string } | null;
}

interface Existente { id: string; titulo: string; data: string; hora: string | null; km: number | null; duracao_s: number | null; strava_id?: number | null }

const minutos = (h: string | null) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : null);

// A mesma atividade: mesmo dia, hora de início próxima (quando há) e distância ou duração parecidas.
function procurarParecida(x: { data: string; hora: string | null; km: number; duracao_s: number | null }, lista: Existente[]) {
  return lista.find((e) => {
    if (e.strava_id || e.data !== x.data) return false;
    const h1 = minutos(x.hora), h2 = minutos(e.hora);
    if (h1 != null && h2 != null && Math.abs(h1 - h2) > 45) return false;
    const km = Number(e.km ?? 0);
    if (x.km > 0 && km > 0) return Math.abs(x.km - km) <= Math.max(0.5, x.km * 0.05);
    if (x.duracao_s && e.duracao_s) return Math.abs(x.duracao_s - e.duracao_s) <= Math.max(300, x.duracao_s * 0.1);
    return h1 != null && h2 != null;
  }) ?? null;
}

export type ListaStrava =
  | { estado: "ok"; itens: ItemStrava[]; mais: boolean }
  | { estado: "desligado" | "sem-config" | "erro" | "limite"; msg?: string };

export async function atividadesStrava(pagina = 1): Promise<ListaStrava> {
  const { supabase, user, isMember } = await getSession();
  if (!user || !isMember) return { estado: "erro", msg: "Precisas de ter sessão iniciada." };
  if (!stravaConfigurado()) return { estado: "sem-config" };
  let token: string | null;
  try { token = await tokenValido(user.id); } catch { return { estado: "erro", msg: "Não foi possível falar com o Strava. Tenta ligar outra vez em Definições." }; }
  if (!token) return { estado: "desligado" };
  try {
    const lista = await listarAtividades(token, pagina, 30);
    const convertidas = lista.map((a) => ({ a, x: paraAtividade(a) }));
    const datas = convertidas.map(({ x }) => x.data).sort();
    const { data } = datas.length
      ? await supabase.from("atividades").select("id,titulo,data,hora,km,duracao_s,strava_id").eq("user_id", user.id).gte("data", datas[0]).lte("data", datas[datas.length - 1])
      : { data: [] };
    const existentes = (data ?? []) as Existente[];
    const ja = new Set(existentes.filter((e) => e.strava_id).map((e) => Number(e.strava_id)));
    return {
      estado: "ok",
      mais: lista.length === 30,
      itens: convertidas.map(({ a, x }) => {
        const importada = ja.has(a.id);
        const p = importada ? null : procurarParecida(x, existentes);
        return {
          id: a.id, titulo: x.titulo, tipo: x.tipo, data: x.data, hora: x.hora, km: x.km, dmais: x.dmais, duracao_s: x.duracao_s, privada: x.privada,
          importada, parecida: p ? { id: p.id, titulo: p.titulo } : null,
        };
      }),
    };
  } catch (e) {
    if (e instanceof Error && e.message === "limite") return { estado: "limite" };
    return { estado: "erro", msg: "O Strava não respondeu. Tenta daqui a pouco." };
  }
}

// Importa as atividades escolhidas (pelo id do Strava). Vai buscar a lista outra vez ao Strava
// para não confiar nos dados que vêm do browser.
export async function importarStrava(ids: number[], pagina = 1): Promise<{ ok: boolean; n: number; msg?: string }> {
  const { supabase, user, isMember } = await getSession();
  if (!user || !isMember) return { ok: false, n: 0, msg: "Precisas de ter sessão iniciada." };
  const token = await tokenValido(user.id).catch(() => null);
  if (!token) return { ok: false, n: 0, msg: "Liga primeiro o Strava em Definições." };
  let lista;
  try { lista = await listarAtividades(token, pagina, 30); } catch { return { ok: false, n: 0, msg: "O Strava não respondeu. Tenta daqui a pouco." }; }
  const escolhidas = lista.filter((a) => ids.includes(a.id)).map((a) => ({ ...paraAtividade(a), user_id: user.id }));
  if (!escolhidas.length) return { ok: true, n: 0 };
  const { error } = await supabase.from("atividades").upsert(escolhidas, { onConflict: "user_id,strava_id", ignoreDuplicates: true });
  if (error) return { ok: false, n: 0, msg: /strava_id/.test(error.message) ? "Falta correr a migration 020 no Supabase." : "Não foi possível guardar. Tenta outra vez." };
  revalidatePath("/perfil");
  revalidatePath("/treinos");
  revalidatePath("/eventos");
  return { ok: true, n: escolhidas.length };
}

export async function estadoStrava(): Promise<{ configurado: boolean; ligado: boolean; nome: string | null; tabela: boolean }> {
  const { user } = await getSession();
  if (!user || !stravaConfigurado()) return { configurado: stravaConfigurado(), ligado: false, nome: null, tabela: true };
  const c = await contaStrava(user.id).catch(() => ({ erro: true as const }));
  if (c.erro) return { configurado: true, ligado: false, nome: null, tabela: false };
  return { configurado: true, ligado: !!c.conta, nome: c.conta?.nome ?? null, tabela: true };
}

export async function desligarStrava(): Promise<void> {
  const { user } = await getSession();
  if (!user) return;
  await desligar(user.id);
  revalidatePath("/definicoes");
}

// Marca uma atividade que já estava no site como sendo esta do Strava (não cria outra).
// Se a do site não tiver mapa, fica com o percurso do Strava.
export async function juntarStrava(stravaId: number, atividadeId: string, pagina = 1): Promise<{ ok: boolean; msg?: string }> {
  const { supabase, user, isMember } = await getSession();
  if (!user || !isMember) return { ok: false, msg: "Precisas de ter sessão iniciada." };
  const token = await tokenValido(user.id).catch(() => null);
  if (!token) return { ok: false, msg: "Liga primeiro o Strava em Definições." };
  let lista;
  try { lista = await listarAtividades(token, pagina, 30); } catch { return { ok: false, msg: "O Strava não respondeu. Tenta daqui a pouco." }; }
  const a = lista.find((x) => x.id === stravaId);
  if (!a) return { ok: false, msg: "Não encontrei essa atividade no Strava." };
  const { data: atual } = await supabase.from("atividades").select("trajeto").eq("id", atividadeId).eq("user_id", user.id).maybeSingle();
  if (!atual) return { ok: false, msg: "Não encontrei a atividade no site." };
  const x = paraAtividade(a);
  const { error } = await supabase.from("atividades").update({
    strava_id: stravaId,
    ...(!atual.trajeto && x.trajeto ? { trajeto: x.trajeto } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", atividadeId).eq("user_id", user.id);
  if (error) return { ok: false, msg: "Não foi possível juntar. Tenta outra vez." };
  revalidatePath("/perfil");
  return { ok: true };
}
