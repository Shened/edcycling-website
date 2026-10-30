import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { guardarLigacao } from "@/lib/strava";

// O Strava devolve o atleta aqui depois de autorizar (ou cancelar).
export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const q = req.nextUrl.searchParams;
  const volta = req.cookies.get("strava_volta")?.value ?? "/definicoes";
  const fim = (estado: string) => {
    const url = new URL(volta, origem);
    url.searchParams.set("strava", estado);
    const res = NextResponse.redirect(url);
    res.cookies.delete("strava_state");
    res.cookies.delete("strava_volta");
    return res;
  };

  const { user, isMember } = await getSession();
  if (!user || !isMember) return NextResponse.redirect(`${origem}/entrar`);
  if (q.get("error")) return fim("cancelado");
  const state = req.cookies.get("strava_state")?.value;
  const code = q.get("code");
  if (!code || !state || state !== q.get("state")) return fim("erro");
  const scope = q.get("scope") ?? "";
  if (!/activity:read/.test(scope)) return fim("sem-permissao");

  try {
    await guardarLigacao(user.id, code, scope);
  } catch (e) {
    return fim(e instanceof Error && e.message === "ja-ligada" ? "ja-ligada" : "erro");
  }
  return fim("ligado");
}
