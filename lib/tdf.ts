// Tour de Freixo: tipos, tempos, pontos e classificações.
// Os dados vivem nas tabelas tdf_* do Supabase da EDCycling (leitura pública, escrita só admins).

export type EstadoEtapa = "FINISHED" | "DNS" | "DNF";
export type TipoMeta = "SPRINT" | "MOUNTAIN";

export interface Ciclista { id: string; name: string; team: string | null }
export interface Etapa {
  id: string; number: number; name: string; date: string | null;
  distance_km: number | null; elevation_gain_m: number | null; max_gradient_pct: number | null;
}
export interface ResultadoEtapa {
  id: string; stage_id: string; rider_id: string; status: EstadoEtapa;
  time_seconds: number | null; avg_speed_kmh: number | null;
}
export interface Meta { id: string; stage_id: string; type: TipoMeta; name: string; order_index: number }
export interface ResultadoMeta { id: string; goal_id: string; rider_id: string; position: number }

export interface TourDados {
  riders: Ciclista[]; stages: Etapa[]; stageResults: ResultadoEtapa[]; goals: Meta[]; goalResults: ResultadoMeta[];
  /** true quando as tabelas ainda não existem (falta correr a migration 017). */
  emFalta: boolean;
}

// Aceita o cliente do Supabase da sessão (funciona para visitantes e para membros).
type Cliente = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

export async function lerTour(sb: Cliente): Promise<TourDados> {
  const [r, s, sr, g, gr] = await Promise.all([
    sb.from("tdf_riders").select("id,name,team").order("name"),
    sb.from("tdf_stages").select("id,number,name,date,distance_km,elevation_gain_m,max_gradient_pct").order("number"),
    sb.from("tdf_stage_results").select("id,stage_id,rider_id,status,time_seconds,avg_speed_kmh"),
    sb.from("tdf_goals").select("id,stage_id,type,name,order_index").order("order_index"),
    sb.from("tdf_goal_results").select("id,goal_id,rider_id,position"),
  ]);
  const emFalta = Boolean(r.error || s.error);
  // O Postgres devolve "numeric" como texto: converte-se aqui para não haver surpresas nas contas.
  const stages = ((s.data ?? []) as Etapa[]).map((e) => ({
    ...e, distance_km: num(e.distance_km), elevation_gain_m: num(e.elevation_gain_m), max_gradient_pct: num(e.max_gradient_pct),
  }));
  const stageResults = ((sr.data ?? []) as ResultadoEtapa[]).map((x) => ({ ...x, avg_speed_kmh: num(x.avg_speed_kmh) }));
  return {
    riders: (r.data ?? []) as Ciclista[],
    stages,
    stageResults,
    goals: (g.data ?? []) as Meta[],
    goalResults: (gr.data ?? []) as ResultadoMeta[],
    emFalta,
  };
}

/* ---------- tempos ---------- */

// Aceita "mm:ss", "h:mm:ss" ou só segundos; devolve segundos totais.
export function lerTempo(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const p = t.split(":").map((x) => x.trim());
  if (p.some((x) => x === "" || Number.isNaN(Number(x)))) return null;
  let h = 0, m = 0, s = 0;
  if (p.length === 3) [h, m, s] = p.map(Number);
  else if (p.length === 2) [m, s] = p.map(Number);
  else if (p.length === 1) s = Number(p[0]);
  else return null;
  if (m >= 60 || s >= 60 || m < 0 || s < 0 || h < 0) return null;
  return Math.round(h * 3600 + m * 60 + s);
}

export function fmtTempo(seg: number | null): string {
  if (seg == null) return "—";
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0"), ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const fmtDif = (seg: number) => (seg < 0 ? "—" : `+${fmtTempo(seg)}`);

/* ---------- pontos das metas volantes ---------- */

const PONTOS: Record<number, number> = { 1: 50, 2: 45, 3: 40, 4: 35, 5: 30, 6: 25, 7: 20, 8: 15, 9: 10, 10: 5 };
export const pontosPosicao = (pos: number) => PONTOS[pos] ?? 0;
export const POSICOES = Object.keys(PONTOS).map(Number);

/* ---------- classificações ---------- */

export function velocidadeEtapa(d: TourDados, stageId: string) {
  const v = d.stageResults
    .filter((r) => r.stage_id === stageId && r.status === "FINISHED" && r.avg_speed_kmh != null)
    .map((r) => r.avg_speed_kmh as number);
  if (!v.length) return { media: null as number | null, n: 0 };
  return { media: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10, n: v.length };
}

// Quem teve DNS/DNF em qualquer etapa sai da Geral.
const foraDaGeral = (d: TourDados) => new Set(d.stageResults.filter((r) => r.status !== "FINISHED").map((r) => r.rider_id));
export const estaForaDaGeral = (d: TourDados, riderId: string) => foraDaGeral(d).has(riderId);

export interface LinhaGeral { rider: Ciclista; total: number; etapas: number; pos: number }

export function classificacaoGeral(d: TourDados): LinhaGeral[] {
  const fora = foraDaGeral(d);
  const linhas: LinhaGeral[] = [];
  for (const rider of d.riders) {
    if (fora.has(rider.id)) continue;
    const res = d.stageResults.filter((r) => r.rider_id === rider.id && r.status === "FINISHED");
    if (!res.length) continue;
    linhas.push({ rider, total: res.reduce((a, r) => a + (r.time_seconds ?? 0), 0), etapas: res.length, pos: 0 });
  }
  linhas.sort((a, b) => a.total - b.total);
  linhas.forEach((l, i) => (l.pos = i + 1));
  return linhas;
}

export interface LinhaPontos { rider: Ciclista; pontos: number; pos: number }

// Sprint e montanha somam os pontos de todas as metas desse tipo; não dependem da Geral.
export function classificacaoPontos(d: TourDados, tipo: TipoMeta): LinhaPontos[] {
  const metas = new Set(d.goals.filter((g) => g.type === tipo).map((g) => g.id));
  const tot = new Map<string, number>();
  for (const gr of d.goalResults) {
    if (!metas.has(gr.goal_id)) continue;
    tot.set(gr.rider_id, (tot.get(gr.rider_id) ?? 0) + pontosPosicao(gr.position));
  }
  const linhas = d.riders.filter((r) => tot.has(r.id)).map((rider) => ({ rider, pontos: tot.get(rider.id) ?? 0, pos: 0 }));
  linhas.sort((a, b) => b.pontos - a.pontos);
  linhas.forEach((l, i) => (l.pos = i + 1));
  return linhas;
}

export interface Evolucao { series: { id: string; nome: string }[]; pontos: { etapa: number; pos: Record<string, number> }[] }

// Posição de cada atleta na Geral acumulada, etapa a etapa.
export function evolucaoGeral(d: TourDados): Evolucao {
  const fora = foraDaGeral(d);
  const incluidos = d.riders.filter((r) => !fora.has(r.id));
  const acum = new Map<string, number>();
  const correu = new Set<string>();
  const pontos: Evolucao["pontos"] = [];
  for (const st of [...d.stages].sort((a, b) => a.number - b.number)) {
    const res = d.stageResults.filter((r) => r.stage_id === st.id && r.status === "FINISHED");
    if (!res.length) continue;
    for (const r of res) {
      if (fora.has(r.rider_id)) continue;
      acum.set(r.rider_id, (acum.get(r.rider_id) ?? 0) + (r.time_seconds ?? 0));
      correu.add(r.rider_id);
    }
    const pos: Record<string, number> = {};
    incluidos.filter((r) => correu.has(r.id))
      .map((r) => ({ id: r.id, t: acum.get(r.id) ?? 0 }))
      .sort((a, b) => a.t - b.t)
      .forEach((x, i) => (pos[x.id] = i + 1));
    pontos.push({ etapa: st.number, pos });
  }
  return { series: incluidos.map((r) => ({ id: r.id, nome: r.name })), pontos };
}

export function vencedorEtapa(d: TourDados, stageId: string) {
  const v = d.stageResults
    .filter((r) => r.stage_id === stageId && r.status === "FINISHED" && r.time_seconds != null)
    .sort((a, b) => (a.time_seconds ?? 0) - (b.time_seconds ?? 0))[0];
  return v ? d.riders.find((r) => r.id === v.rider_id) ?? null : null;
}

export const fmtDataEtapa = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : null;

export const MEDALHAS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
