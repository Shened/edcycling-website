import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Barlow_Condensed, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

// Tipos de letra servidos pelo próprio site (sem pedido extra ao Google em cada visita).
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-barlow", display: "swap" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jetbrains", display: "swap" });
import Cabecalho from "@/components/Cabecalho";
import RegistarSW from "@/components/RegistarSW";
import Analise from "@/components/Analise";
import MobileNav from "@/components/MobileNav";
import Patrocinadores from "@/components/Patrocinadores";
import type { Patrocinador } from "@/lib/patrocinadores";
import { getSession } from "@/lib/session";
import { MESES_L, daysTo, evAno, evMes, fmtDate, nextEvento } from "@/lib/dates";
import type { Evento } from "@/lib/types";

export const metadata: Metadata = {
  title: "EDCycling",
  description: "EDCycling: equipa de ciclismo desde 2023.",
  applicationName: "EDCycling",
  appleWebApp: { capable: true, title: "EDCycling", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#031D29" }, { media: "(prefers-color-scheme: light)", color: "#052F42" }], width: "device-width", initialScale: 1, viewportFit: "cover" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, perfil, isAdmin, isMember } = await getSession();
  // Eventos só são lidos para membros (o RLS também o garante).
  const [{ data }, { data: patro }] = await Promise.all([
    isMember ? supabase.from("eventos").select("id,titulo,data,mes,ano,estado") : Promise.resolve({ data: [] }),
    supabase.from("patrocinadores").select("id,nome,logo_path,url,principal,ativo,ordem").eq("ativo", true).order("principal", { ascending: false }).order("ordem").order("nome"),
  ]);
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
      <body className={isMember ? "has-mnav" : undefined}>
        <a href="#conteudo" className="skip">Saltar para o conteúdo</a>
        <Cabecalho
          isMember={isMember}
          isAdmin={isAdmin}
          perfil={perfil ? { nome: perfil.nome, avatar_path: perfil.avatar_path ?? null } : null}
          proximo={nx ? { titulo: nx.titulo, quando: `${quando} · ${vai} confirmado${vai === 1 ? "" : "s"}` } : null}
        />
        <main className="in" id="conteudo">{children}</main>
        <Patrocinadores lista={(patro ?? []) as Patrocinador[]} />
        <footer className="foot in">
          <span>EDCycling · desde 2023</span>
          <Link href="/ajuda">Ajuda e instalar a app</Link>
        </footer>
        <MobileNav isAdmin={isAdmin} isMember={isMember} />
        <RegistarSW />
        <Analise />
      </body>
    </html>
  );
}
