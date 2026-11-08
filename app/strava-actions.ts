"use server";
import { z } from "zod";
import { Id, Pagina, StravaId, valido } from "@/lib/validar";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { contaStrava, desligar, listarAtividades, paraAtividade, procurarParecida, stravaConfigurado, tokenValido, type Existente } from "@/lib/strava";

export interface ItemStrava {
  id: number; titulo: string; tipo: string; data: string; hora: string | null;
  km: number; dmais: number; duracao_s: number | null; privada: boolean; importada: boolean;
  /** Atividade do site que parece ser a mesma (registada à mão ou com GPX/FIT). */
  parecida: { id: string; titulo: string } | null;
}

export type ListaStrava =
  | { estado: "ok"; itens: ItemStrava[]; mais: boolean }
  | { estado: "desligado" | "sem-config" | "erro" | "limite"; msg?: string };

export async function atividadesStrava(pagina = 1): Promise<ListaStrava> {
  if (!valido([Pagina, pagina])) return { estado: "erro", msg: "Pedido inválido." };
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
  if (!valido([z.array(StravaId).min(1).max(100), ids], [Pagina, pagina])) return { ok: false, n: 0, msg: "Pedido inválido." };
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
  if (!valido([StravaId, stravaId], [Id, atividadeId], [Pagina, pagina])) return { ok: false, msg: "Pedido inválido." };
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

/* ---------- sincronização automática ---------- */

// Botão "Atualizar do Strava" (forcar) e sincronização silenciosa ao abrir o site (no máximo de 30 em 30 min).
export async function sincronizarStrava(forcar = false): Promise<{ estado: string; novas: number; juntadas: number }> {
  if (typeof forcar !== "boolean") return { estado: "erro", novas: 0, juntadas: 0 };
  const { user, isMember } = await getSession();
  if (!user || !isMember || !stravaConfigurado()) return { estado: "desligado", novas: 0, juntadas: 0 };
  const { sincronizarAtleta } = await import("@/lib/strava-sync");
  const r = await sincronizarAtleta(user.id, forcar ? 2 : 30);
  if (r.novas || r.juntadas) { revalidatePath("/perfil"); revalidatePath("/eventos"); revalidatePath("/treinos"); revalidatePath("/estatisticas"); }
  return r;
}

/* ---------- webhook (Gestão) ---------- */

const PUSH = "https://www.strava.com/api/v3/push_subscriptions";

export async function estadoWebhookStrava(): Promise<{ ok: boolean; ativo: boolean; id?: number; msg?: string }> {
  const { isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, ativo: false, msg: "Só admins." };
  if (!stravaConfigurado()) return { ok: false, ativo: false, msg: "O Strava não está configurado." };
  const q = new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET! });
  const r = await fetch(`${PUSH}?${q}`, { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return { ok: false, ativo: false, msg: "O Strava não respondeu." };
  const lista = (await r.json()) as { id: number }[];
  return { ok: true, ativo: lista.length > 0, id: lista[0]?.id };
}

export async function ativarWebhookStrava(): Promise<{ ok: boolean; msg: string }> {
  const { isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, msg: "Só admins." };
  const token = process.env.STRAVA_WEBHOOK_TOKEN;
  if (!stravaConfigurado() || !token) return { ok: false, msg: "Falta a variável STRAVA_WEBHOOK_TOKEN na Vercel (e um novo deploy)." };
  const { SITE } = await import("@/lib/notificar");
  const corpo = new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, callback_url: `${SITE}/api/strava/webhook`, verify_token: token });
  const r = await fetch(PUSH, { method: "POST", body: corpo, cache: "no-store" }).catch(() => null);
  if (!r) return { ok: false, msg: "O Strava não respondeu." };
  const j = (await r.json().catch(() => ({}))) as { id?: number; errors?: { code?: string; field?: string }[] };
  if (r.ok && j.id) return { ok: true, msg: `Sincronização automática ativa (subscrição ${j.id}). Guarda este número na Vercel como STRAVA_WEBHOOK_ID.` };
  if (j.errors?.some((e) => e.code === "already exists")) return { ok: true, msg: "Já estava ativa." };
  return { ok: false, msg: `O Strava recusou (${j.errors?.map((e) => `${e.field} ${e.code}`).join(", ") || r.status}). Confirma que o site está publicado com a STRAVA_WEBHOOK_TOKEN.` };
}
