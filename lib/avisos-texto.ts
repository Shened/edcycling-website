// Textos e destinatários dos avisos (só servidor).
import { createAdminClient } from "./supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
export type Kind = "evento" | "treino";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const TIPOS_T: Record<string, string> = { estrada: "estrada", gravel: "gravel", btt: "BTT", rolo: "rolo", corrida: "corrida", natacao: "natação" };

export function quando(r: { data?: string | null; hora?: string | null; mes?: number; ano?: number }): string {
  let s = "";
  if (r.data) {
    const [y, m, d] = r.data.slice(0, 10).split("-").map(Number);
    s = new Date(y, m - 1, d).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  } else if (r.mes && r.ano) s = `${MESES[r.mes - 1]} de ${r.ano} (data a definir)`;
  if (r.hora) s += ` às ${r.hora.slice(0, 5)}`;
  return s;
}

export function linhaTreino(t: { data: string; hora?: string | null; partida?: string | null; tipo?: string; km_plano?: number | null }): string {
  return [quando(t), t.partida, t.tipo ? TIPOS_T[t.tipo] : null, t.km_plano ? `~${t.km_plano} km` : null].filter(Boolean).join(" · ");
}

/** Atletas e admins ativos (sem contas de gestão, a menos que `incluirGestao`). */
export async function membrosAtivos(admin: Admin, incluirGestao = false): Promise<string[]> {
  let q = admin.from("perfis").select("id").in("role", ["membro", "admin"]).eq("ativo", true);
  if (!incluirGestao) q = q.eq("atleta", true);
  const { data } = await q;
  return (data ?? []).map((p) => p.id as string);
}

export async function admins(admin: Admin): Promise<string[]> {
  const { data } = await admin.from("perfis").select("id").eq("role", "admin").eq("ativo", true);
  return (data ?? []).map((p) => p.id as string);
}

/** Quem disse "vou" (e, se pedido, "talvez") num evento ou treino. */
export async function inscritos(admin: Admin, kind: Kind, id: string, comTalvez = true): Promise<string[]> {
  const estados = comTalvez ? ["vai", "talvez"] : ["vai"];
  const { data } = kind === "evento"
    ? await admin.from("inscricoes").select("user_id").eq("evento_id", id).in("estado", estados)
    : await admin.from("treino_participantes").select("user_id").eq("treino_id", id).in("estado", estados);
  return (data ?? []).map((p) => p.user_id as string);
}

export function hojeLisboa(offsetDias = 0): string {
  const d = new Date(Date.now() + offsetDias * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
