import { after } from "next/server";
import { tratarEventoStrava } from "@/lib/strava-sync";

export const dynamic = "force-dynamic";

// Webhook do Strava: o Strava avisa aqui sempre que um atleta ligado grava, altera ou apaga uma atividade.
// GET: confirmação feita uma vez quando a subscrição é criada (Gestão → Strava).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = process.env.STRAVA_WEBHOOK_TOKEN;
  if (!token || u.searchParams.get("hub.mode") !== "subscribe" || u.searchParams.get("hub.verify_token") !== token) {
    return new Response("Não autorizado", { status: 403 });
  }
  return Response.json({ "hub.challenge": u.searchParams.get("hub.challenge") });
}

// POST: o Strava espera resposta em menos de 2 segundos; o trabalho corre depois de responder.
export async function POST(req: Request) {
  let ev: { object_type?: unknown; aspect_type?: unknown; object_id?: unknown; owner_id?: unknown; subscription_id?: unknown; updates?: unknown };
  try { ev = await req.json(); } catch { return new Response("ok"); }
  const esperado = process.env.STRAVA_WEBHOOK_ID;
  if (esperado && String(ev.subscription_id) !== esperado) return new Response("ok");
  if (typeof ev.object_type === "string" && typeof ev.aspect_type === "string" && Number.isInteger(ev.object_id) && Number.isInteger(ev.owner_id)) {
    const dados = {
      object_type: ev.object_type, aspect_type: ev.aspect_type, object_id: ev.object_id as number, owner_id: ev.owner_id as number,
      updates: (ev.updates && typeof ev.updates === "object" ? ev.updates : {}) as Record<string, unknown>,
    };
    after(() => tratarEventoStrava(dados).catch((e) => console.error("strava webhook:", e)));
  }
  return new Response("ok");
}
