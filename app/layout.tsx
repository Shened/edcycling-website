import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Barlow_Condensed, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

// Tipos de letra servidos pelo próprio site (sem pedido extra ao Google em cada visita).
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-barlow", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jetbrains", display: "swap" });
import NavTabs from "@/components/NavTabs";
import { getSession } from "@/lib/session";
import { MESES_L, daysTo, evAno, evMes, fmtDate, nextEvento } from "@/lib/dates";
import type { Evento } from "@/lib/types";

export const metadata: Metadata = {
  title: "EDCycling",
  description: "EDCycling: equipa de ciclismo desde 2023.",
};
export const viewport: Viewport = { themeColor: "#052F42", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, perfil, isAdmin, isMember } = await getSession();
  // Eventos só são lidos para membros (o RLS também o garante).
  const { data } = isMember ? await supabase.from("eventos").select("id,titulo,data,mes,ano,estado") : { data: [] };
  const evs = (data ?? []) as Evento[];
  const nx = nextEvento(evs);
  let vai = 0;
  if (nx && isMember) {
    const { count } = await supabase.from("inscricoes").select("id", { count: "exact", head: true }).eq("evento_id", nx.id).eq("estado", "vai");
    vai = count ?? 0;
  }
  const n = nx?.data ? daysTo(nx.data) : null;
  const quando = nx
    ? nx.data
      ? `${fmtDate(nx.data)} · ${n === 0 ? "é hoje" : n === 1 ? "amanhã" : `faltam ${n} dias`}`
      : `${MESES_L[evMes(nx) - 1]} ${evAno(nx)} · data a definir`
    : "";

  return (
    <html lang="pt-PT" className={`${barlow.variable} ${publicSans.variable} ${jetbrains.variable}`}>
      <body>
        <header className="hero">
          <div className="topo" aria-hidden="true" />
          <div className="in">
            <Link href="/" className="brand">
              <p className="eyebrow">A bicicleta como estilo de vida · est 2023</p>
              <h1>ED<span>Cycling</span></h1>
            </Link>
            {isMember ? (
            <div className="next">
              <div className="l">Próximo evento</div>
              {nx ? (
                <>
                  <div className="d">{nx.titulo}</div>
                  <div className="s" suppressHydrationWarning>{quando}{isMember ? ` · ${vai} confirmado${vai === 1 ? "" : "s"}` : ""}</div>
                </>
              ) : (
                <div className="d">Nada marcado</div>
              )}
            </div>
            ) : (
              <Link href="/entrar" className="next next-cta">
                <div className="l">Atletas da equipa</div>
                <div className="d">Entrar</div>
                <div className="s">Eventos, treinos, fotos e estatísticas</div>
              </Link>
            )}
          </div>
          <div className="stripe" />
        </header>
        <nav className="nav" aria-label="Secções">
          <div className="in">
            <NavTabs isAdmin={isAdmin} isMember={isMember} />
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
