// Leitura de ficheiros GPX no browser: distância, desnível, duração e um traçado simplificado.

export interface GpxInfo {
  km: number;
  dmais: number;
  duracaoS: number | null;
  pontos: [number, number][];
  nome: string | null;
  inicio: string | null; // YYYY-MM-DD local
}

const R = 6371.0088; // raio médio da Terra em km

function haversine(a: [number, number], b: [number, number]): number {
  const toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR;
  const dLon = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Soma só subidas acima de 3 m, para o ruído do GPS/barómetro não inflacionar o D+. */
export function ganhoAltitude(eles: number[], limiar = 3): number {
  let gain = 0;
  let ref = NaN;
  for (const e of eles) {
    if (!Number.isFinite(e)) continue;
    if (!Number.isFinite(ref)) { ref = e; continue; }
    if (e > ref + limiar) { gain += e - ref; ref = e; }
    else if (e < ref - limiar) ref = e;
  }
  return gain;
}

export function distanciaKm(pts: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += haversine(pts[i - 1], pts[i]);
  return km;
}

function first(el: Element | Document, tag: string): Element | undefined {
  return el.getElementsByTagNameNS("*", tag)[0];
}

export function parseGpx(text: string): GpxInfo {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("GPX inválido");
  let nodes = Array.from(doc.getElementsByTagNameNS("*", "trkpt"));
  if (nodes.length < 2) nodes = Array.from(doc.getElementsByTagNameNS("*", "rtept"));
  if (nodes.length < 2) throw new Error("GPX sem pontos");

  const pts: [number, number][] = [];
  const eles: number[] = [];
  const times: number[] = [];
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute("lat") ?? "");
    const lon = parseFloat(n.getAttribute("lon") ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    pts.push([lat, lon]);
    eles.push(parseFloat(first(n, "ele")?.textContent ?? ""));
    times.push(Date.parse(first(n, "time")?.textContent ?? ""));
  }
  if (pts.length < 2) throw new Error("GPX sem pontos");

  const tv = times.filter(Number.isFinite);
  const duracaoS = tv.length > 1 ? Math.round((tv[tv.length - 1] - tv[0]) / 1000) : null;
  let inicio: string | null = null;
  if (tv.length) {
    const d = new Date(tv[0]);
    inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const step = Math.max(1, Math.ceil(pts.length / 200));
  const pontos = pts
    .filter((_, i) => i % step === 0 || i === pts.length - 1)
    .map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5] as [number, number]);

  const trk = first(doc, "trk");
  const nome = ((trk && first(trk, "name")) ?? first(doc, "name"))?.textContent?.trim() || null;

  return {
    km: Math.round(distanciaKm(pts) * 100) / 100,
    dmais: Math.round(ganhoAltitude(eles)),
    duracaoS: duracaoS && duracaoS > 0 ? duracaoS : null,
    pontos,
    nome,
    inicio,
  };
}

export function fmtDuracao(s: number | null | undefined): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function fmtKm(km: number): string {
  return km.toLocaleString("pt-PT", { minimumFractionDigits: km < 100 ? 1 : 0, maximumFractionDigits: km < 100 ? 1 : 0 });
}
