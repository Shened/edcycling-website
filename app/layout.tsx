import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import NavTabs from "@/components/NavTabs";
import { getSession } from "@/lib/session";
import { MESES_L, daysTo, evAno, evMes, fmtDate, nextEvento } from "@/lib/dates";
import type { Evento } from "@/lib/types";

export const metadata: Metadata = {
  title: "EDCycling",
  description: "Equipa de ciclismo EDCycling — eventos, inscrições e fotos.",
};
export const viewport: Viewport = { themeColor: "#052F42", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, perfil, isAdmin } = await getSession();
  const { data } = await supabase.from("eventos").select("*");
  const evs = (data ?? []) as Evento[];
  const nx = nextEvento(evs);
  let vai = 0;
  if (nx && user) {
    const { count } = await supabase.from("inscricoes").select("id", { count: "exact", head: true }).eq("evento_id", nx.id).eq("estado", "vai");
    vai = count ?? 0;
  }
  const n = nx?.data ? daysTo(nx.data) : null;
  const quando = nx
    ? nx.data
      ? `${fmtDate(nx.data)} · ${n === 0 ? "é hoje" : n === 1 ? "amanhã" : `faltam ${n} dias`}`
      : `${MESES_L[evMes(nx) - 1]} ${evAno(nx)} · data por marcar`
    : "";

  return (
    <html lang="pt-PT">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;1,700;1,800&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" />
      </head>
      <body>
        <header className="hero">
          <div className="topo" aria-hidden="true" />
          <div className="in">
            <Link href="/" className="brand">
              <p className="eyebrow">Equipa de ciclismo · desde 2023</p>
              <h1>ED<span>Cycling</span></h1>
            </Link>
            <div className="next">
              <div className="l">Próximo evento</div>
              {nx ? (
                <>
                  <div className="d">{nx.titulo}</div>
                  <div className="s" suppressHydrationWarning>{quando}{user ? ` · ${vai} confirmado${vai === 1 ? "" : "s"}` : ""}</div>
                </>
              ) : (
                <div className="d">Nada marcado</div>
              )}
            </div>
          </div>
          <div className="stripe" />
        </header>
        <nav className="nav" aria-label="Secções">
          <div className="in">
            <NavTabs isAdmin={isAdmin} />
            <div className="who">
              {perfil ? (
                <>
                  <Link href="/perfil" className="btn ghost"><b>{perfil.nome || "Perfil"}</b></Link>
                  <form action="/auth/sair" method="post"><button className="btn ghost">Sair</button></form>
                </>
              ) : (
                <Link href="/entrar" className="btn primary">Entrar</Link>
              )}
            </div>
          </div>
        </nav>
        <main className="in">{children}</main>
      </body>
    </html>
  );
}
