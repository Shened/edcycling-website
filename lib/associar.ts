// Associação de atividades a treinos/eventos: que atividades do atleta ainda estão por confirmar
// e em que treinos/eventos podem ter sido feitas (mesmo dia).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Candidato { k: "evento" | "treino"; id: string; titulo: string; hora: string | null; km: number | null; vou: boolean }
export interface Pendente { id: string; titulo: string; data: string; hora: string | null; km: number | null; candidatos: Candidato[] }

const TIPOS_BIKE = new Set(["estrada", "gravel", "btt", "rolo"]);
const min = (h: string | null) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : null);

/** Treinos e eventos desportivos de cada dia (não cancelados nem propostas), com a resposta do atleta. */
async function candidatosPorDia(sb: SupabaseClient, userId: string, datas: string[]): Promise<Map<string, Candidato[]>> {
  const out = new Map<string, Candidato[]>();
  if (!datas.length) return out;
  const [{ data: evs }, { data: trs }, { data: insc }, { data: part }] = await Promise.all([
    sb.from("eventos").select("id,titulo,data,hora,km,estado,desporto,tipo").in("data", datas),
    sb.from("treinos").select("id,titulo,data,hora,km,km_plano").in("data", datas),
    sb.from("inscricoes").select("evento_id,estado").eq("user_id", userId),
    sb.from("treino_participantes").select("treino_id,estado").eq("user_id", userId),
  ]);
  const vouE = new Set((insc ?? []).filter((i) => i.estado === "vai").map((i) => i.evento_id as string));
  const vouT = new Set((part ?? []).filter((i) => i.estado === "vai").map((i) => i.treino_id as string));
  const add = (d: string, c: Candidato) => out.set(d, [...(out.get(d) ?? []), c]);
  for (const e of evs ?? []) {
    if (e.estado === "cancelado" || e.estado === "proposta") continue;
    if ((e.desporto ?? e.tipo !== "convivio") === false) continue;
    add(e.data as string, { k: "evento", id: e.id as string, titulo: e.titulo as string, hora: e.hora as string | null, km: e.km as number | null, vou: vouE.has(e.id as string) });
  }
  for (const t of trs ?? []) add(t.data as string, { k: "treino", id: t.id as string, titulo: t.titulo as string, hora: t.hora as string | null, km: (t.km ?? t.km_plano) as number | null, vou: vouT.has(t.id as string) });
  return out;
}

/** Ordena: primeiro onde disse "vou", depois pela hora mais próxima da atividade. */
function ordenar(c: Candidato[], hora: string | null): Candidato[] {
  const h = min(hora);
  return [...c].sort((a, b) => Number(b.vou) - Number(a.vou) || (h == null ? 0 : Math.abs((min(a.hora) ?? h) - h) - Math.abs((min(b.hora) ?? h) - h)));
}

/** Atividades de bicicleta/corrida dos últimos 21 dias ainda por associar, com treinos/eventos possíveis. */
export async function pendentesAssociacao(sb: SupabaseClient, userId: string): Promise<Pendente[]> {
  const desde = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await sb.from("atividades").select("id,titulo,data,hora,km,tipo")
    .eq("user_id", userId).gte("data", desde).is("evento_id", null).is("treino_id", null).eq("associacao_recusada", false)
    .order("data", { ascending: false }).limit(20);
  if (error || !data?.length) return [];
  const atvs = data.filter((a) => TIPOS_BIKE.has(a.tipo as string) || a.tipo === "corrida");
  const cands = await candidatosPorDia(sb, userId, [...new Set(atvs.map((a) => a.data as string))]);
  return atvs
    .filter((a) => cands.has(a.data as string))
    .map((a) => ({ id: a.id as string, titulo: a.titulo as string, data: a.data as string, hora: a.hora as string | null, km: a.km as number | null, candidatos: ordenar(cands.get(a.data as string)!, a.hora as string | null) }));
}

/** Para o aviso depois de importar do Strava: há treino/evento nesse dia? (chave secreta, sem sessão). */
export async function candidatosParaAtividade(userId: string, data: string, hora: string | null): Promise<Candidato[]> {
  const c = await candidatosPorDia(createAdminClient(), userId, [data]).catch(() => new Map<string, Candidato[]>());
  return ordenar(c.get(data) ?? [], hora);
}
