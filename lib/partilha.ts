// Dados mínimos para a pré-visualização dos links partilhados (WhatsApp, etc.).
// Quem vê a pré-visualização não tem sessão iniciada, por isso lê-se com a chave secreta,
// mas só título, data, local e km (nunca quem vai, notas ou outros dados da equipa).
import { createAdminClient } from "@/lib/supabase/admin";
import { MESES_L, fmtDate } from "@/lib/dates";

export interface Cartao { tipo: string; titulo: string; quando: string; local: string | null; dist: string | null }

const TIPO_E: Record<string, string> = { passeio: "Passeio", treino: "Treino", prova: "Prova", convivio: "Convívio" };
const TIPO_T: Record<string, string> = { estrada: "estrada", gravel: "gravel", btt: "BTT", rolo: "rolo", corrida: "corrida", natacao: "natação" };
const uuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function cartaoEvento(id: string): Promise<Cartao | null> {
  if (!uuid(id)) return null;
  try {
    const { data: e } = await createAdminClient().from("eventos").select("titulo,tipo,data,hora,mes,ano,partida,km,dmais,sondagem").eq("id", id).maybeSingle();
    if (!e) return null;
    const quando = e.sondagem === "aberta" ? "Data em votação" : e.data
      ? `${maiuscula(fmtDate(e.data as string, { weekday: "long", day: "numeric", month: "long" }))}${e.hora ? ` · ${String(e.hora).slice(0, 5)}` : ""}`
      : `${MESES_L[(e.mes as number) - 1]} de ${e.ano}`;
    const dist = [e.km != null ? `${Number(e.km).toLocaleString("pt-PT")} km` : null, e.dmais ? `${Number(e.dmais).toLocaleString("pt-PT")} m D+` : null].filter(Boolean).join(" · ") || null;
    return { tipo: TIPO_E[e.tipo as string] ?? "Evento", titulo: e.titulo as string, quando, local: (e.partida as string) || null, dist };
  } catch { return null; }
}

export async function cartaoTreino(id: string): Promise<Cartao | null> {
  if (!uuid(id)) return null;
  try {
    const { data: t } = await createAdminClient().from("treinos").select("titulo,tipo,data,hora,partida,km_plano,km").eq("id", id).maybeSingle();
    if (!t) return null;
    const k = t.km ?? t.km_plano;
    return {
      tipo: `Treino de ${TIPO_T[t.tipo as string] ?? t.tipo}`, titulo: t.titulo as string,
      quando: `${maiuscula(fmtDate(t.data as string, { weekday: "long", day: "numeric", month: "long" }))}${t.hora ? ` · ${String(t.hora).slice(0, 5)}` : ""}`,
      local: (t.partida as string) || null, dist: k ? `${t.km == null ? "~" : ""}${Number(k).toLocaleString("pt-PT")} km` : null,
    };
  } catch { return null; }
}

export function descricao(c: Cartao): string {
  return [c.quando, c.local, c.dist].filter(Boolean).join(" · ");
}
