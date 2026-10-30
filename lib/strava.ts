import { createAdminClient } from "@/lib/supabase/admin";

// Ligação ao Strava (só no servidor). Os tokens ficam na tabela strava_contas,
// que só a chave secreta consegue ler: nunca chegam ao browser.

const API = "https://www.strava.com/api/v3";
export const STRAVA_SCOPE = "read,activity:read_all";

export const stravaConfigurado = () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

export function urlAutorizacao(origem: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: `${origem}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPE,
    state,
  });
  return `https://www.strava.com/oauth/authorize?${p}`;
}

interface Token { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } }

async function pedirToken(extra: Record<string, string>): Promise<Token> {
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...extra }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Strava respondeu ${r.status}`);
  return r.json();
}

export async function guardarLigacao(userId: string, code: string, scope: string) {
  const t = await pedirToken({ code, grant_type: "authorization_code" });
  if (!t.athlete) throw new Error("Resposta do Strava sem atleta");
  const admin = createAdminClient();
  const { error } = await admin.from("strava_contas").upsert({
    user_id: userId,
    athlete_id: t.athlete.id,
    nome: [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ") || null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    scope,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error(/athlete_id|duplicate/i.test(error.message) ? "ja-ligada" : error.message);
}

export async function contaStrava(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("strava_contas").select("athlete_id,nome,access_token,refresh_token,expires_at").eq("user_id", userId).maybeSingle();
  if (error) return { erro: true as const };
  return { erro: false as const, conta: data as { athlete_id: number; nome: string | null; access_token: string; refresh_token: string; expires_at: number } | null };
}

// Devolve um access token válido, renovando-o se estiver quase a expirar (duram 6 horas).
export async function tokenValido(userId: string): Promise<string | null> {
  const c = await contaStrava(userId);
  if (c.erro || !c.conta) return null;
  if (c.conta.expires_at > Date.now() / 1000 + 120) return c.conta.access_token;
  const t = await pedirToken({ grant_type: "refresh_token", refresh_token: c.conta.refresh_token });
  await createAdminClient().from("strava_contas").update({
    access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return t.access_token;
}

export async function desligar(userId: string) {
  const token = await tokenValido(userId).catch(() => null);
  if (token) {
    await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  }
  await createAdminClient().from("strava_contas").delete().eq("user_id", userId);
}

export interface AtividadeStrava {
  id: number; name: string; sport_type?: string; type?: string; start_date_local: string;
  distance: number; total_elevation_gain: number; moving_time: number; elapsed_time: number;
  private?: boolean; visibility?: string; map?: { summary_polyline?: string | null };
}

export async function listarAtividades(token: string, pagina = 1, porPagina = 30): Promise<AtividadeStrava[]> {
  const r = await fetch(`${API}/athlete/activities?page=${pagina}&per_page=${porPagina}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (r.status === 429) throw new Error("limite");
  if (!r.ok) throw new Error(`Strava respondeu ${r.status}`);
  return r.json();
}

/* ---------- conversão para as atividades do site ---------- */

const TIPOS: Record<string, string> = {
  Ride: "estrada", EBikeRide: "estrada", Velomobile: "estrada", Handcycle: "estrada",
  GravelRide: "gravel", MountainBikeRide: "btt", EMountainBikeRide: "btt", VirtualRide: "rolo",
  Run: "corrida", TrailRun: "corrida", VirtualRun: "corrida",
  Swim: "natacao", Walk: "caminhada", Hike: "caminhada",
};

// Polyline do Google (formato usado pelo Strava) → pontos [lat, lon].
export function descodificarPolyline(s: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < s.length) {
    for (const k of [0, 1]) {
      let res = 0, sh = 0, b: number;
      do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i < s.length);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (k === 0) lat += d; else lon += d;
    }
    pts.push([lat / 1e5, lon / 1e5]);
  }
  return pts;
}

export function paraAtividade(a: AtividadeStrava) {
  const pts = a.map?.summary_polyline ? descodificarPolyline(a.map.summary_polyline) : [];
  const step = Math.max(1, Math.ceil(pts.length / 200));
  const trajeto = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5] as [number, number]);
  return {
    strava_id: a.id,
    titulo: (a.name || "Atividade").slice(0, 80),
    tipo: TIPOS[a.sport_type ?? a.type ?? ""] ?? "outro",
    // start_date_local vem com a hora local mas marcado com "Z": usa-se tal como está.
    data: a.start_date_local.slice(0, 10),
    hora: a.start_date_local.slice(11, 16) || null,
    km: Math.round((a.distance / 1000) * 100) / 100,
    dmais: Math.round(a.total_elevation_gain || 0),
    duracao_s: a.moving_time || a.elapsed_time || null,
    trajeto: trajeto.length > 1 ? trajeto : null,
    privada: a.private === true || a.visibility === "only_me",
  };
}
