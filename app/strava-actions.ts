"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { contaStrava, desligar, listarAtividades, paraAtividade, stravaConfigurado, tokenValido } from "@/lib/strava";

export interface ItemStrava {
  id: number; titulo: string; tipo: string; data: string; hora: string | null;
  km: number; dmais: number; duracao_s: number | null; privada: boolean; importada: boolean;
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
    const ids = lista.map((a) => a.id);
    const { data } = ids.length ? await supabase.from("atividades").select("strava_id").eq("user_id", user.id).in("strava_id", ids) : { data: [] };
    const ja = new Set(((data ?? []) as { strava_id: number }[]).map((x) => Number(x.strava_id)));
    return {
      estado: "ok",
      mais: lista.length === 30,
      itens: lista.map((a) => {
        const x = paraAtividade(a);
        return { id: a.id, titulo: x.titulo, tipo: x.tipo, data: x.data, hora: x.hora, km: x.km, dmais: x.dmais, duracao_s: x.duracao_s, privada: x.privada, importada: ja.has(a.id) };
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
