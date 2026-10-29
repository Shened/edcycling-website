// Leitura de ficheiros .fit (Garmin, Wahoo, Coros, Strava…) no browser.
// Serve também para natação em piscina, que não tem GPS: usa os totais da sessão.
import { Decoder, Stream } from "@garmin/fitsdk";
import { distanciaKm, ganhoAltitude } from "./gpx";

export interface FitInfo {
  km: number;
  dmais: number;
  duracaoS: number | null;
  pontos: [number, number][];
  nome: string | null;
  inicio: string | null;
  hora: string | null;
  tipo: string | null;
}

const SEMI = 180 / 2 ** 31;
const pad = (n: number) => String(n).padStart(2, "0");

function tipoDe(sport?: string, sub?: string): string | null {
  const s = (sport ?? "").toLowerCase(), b = (sub ?? "").toLowerCase();
  if (s === "cycling" || s === "e_biking") {
    if (b.includes("indoor") || b.includes("virtual") || b === "spin") return "rolo";
    if (b.includes("mountain") || b.includes("downhill") || b.includes("cyclocross")) return "btt";
    if (b.includes("gravel")) return "gravel";
    return "estrada";
  }
  if (s === "training" && b.includes("indoor_cycling")) return "rolo";
  if (s === "running" || s === "trail_running") return "corrida";
  if (s === "swimming") return "natacao";
  if (s === "walking" || s === "hiking") return "caminhada";
  return sport ? "outro" : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type M = Record<string, any>;

export function parseFit(buf: ArrayBuffer): FitInfo {
  const decoder = new Decoder(Stream.fromArrayBuffer(buf));
  if (!decoder.isFIT()) throw new Error("Não é um ficheiro FIT");
  const { messages } = decoder.read({ convertDateTimesToDates: true, applyScaleAndOffset: true });
  const ses: M = (messages.sessionMesgs?.[0] as M) ?? {};
  const recs: M[] = (messages.recordMesgs as M[]) ?? [];

  const pts: [number, number][] = [];
  const eles: number[] = [];
  for (const r of recs) {
    if (typeof r.positionLat === "number" && typeof r.positionLong === "number") pts.push([r.positionLat * SEMI, r.positionLong * SEMI]);
    const e = r.enhancedAltitude ?? r.altitude;
    if (typeof e === "number") eles.push(e);
  }

  // Distância: o total da sessão (vale para piscina); senão o último registo; senão o GPS.
  const ultimoDist = [...recs].reverse().find((r) => typeof r.distance === "number")?.distance;
  const metros = typeof ses.totalDistance === "number" ? ses.totalDistance : typeof ultimoDist === "number" ? ultimoDist : pts.length > 1 ? distanciaKm(pts) * 1000 : 0;
  const dmais = typeof ses.totalAscent === "number" ? ses.totalAscent : Math.round(ganhoAltitude(eles));
  const dur = ses.totalTimerTime ?? ses.totalElapsedTime;

  const t0: Date | undefined = ses.startTime instanceof Date ? ses.startTime : recs.find((r) => r.timestamp instanceof Date)?.timestamp;
  const step = Math.max(1, Math.ceil(pts.length / 200));
  const pontos = pts
    .filter((_, i) => i % step === 0 || i === pts.length - 1)
    .map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5] as [number, number]);

  return {
    km: Math.round((metros / 1000) * 100) / 100,
    dmais: Math.round(dmais || 0),
    duracaoS: typeof dur === "number" && dur > 0 ? Math.round(dur) : null,
    pontos,
    nome: null,
    inicio: t0 ? `${t0.getFullYear()}-${pad(t0.getMonth() + 1)}-${pad(t0.getDate())}` : null,
    hora: t0 ? `${pad(t0.getHours())}:${pad(t0.getMinutes())}` : null,
    tipo: tipoDe(ses.sport, ses.subSport),
  };
}
