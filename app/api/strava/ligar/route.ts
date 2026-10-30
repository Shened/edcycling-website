import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { stravaConfigurado, urlAutorizacao } from "@/lib/strava";

// Envia o atleta para o Strava para autorizar o site a ler as atividades dele.
export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const { isMember } = await getSession();
  if (!isMember) return NextResponse.redirect(`${origem}/entrar`);
  if (!stravaConfigurado()) return NextResponse.redirect(`${origem}/definicoes?strava=sem-config`);
  const state = crypto.randomUUID();
  const volta = req.nextUrl.searchParams.get("volta");
  const res = NextResponse.redirect(urlAutorizacao(origem, state));
  res.cookies.set("strava_state", state, { httpOnly: true, secure: origem.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });
  if (volta?.startsWith("/") && !volta.startsWith("//")) res.cookies.set("strava_volta", volta, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
