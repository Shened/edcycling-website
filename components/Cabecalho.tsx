"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavTabs from "./NavTabs";
import AccountMenu from "./AccountMenu";

interface Props {
  isMember: boolean;
  isAdmin: boolean;
  perfil: { nome: string; avatar_path: string | null } | null;
  proximo: { titulo: string; quando: string } | null;
}

// Barra fina em todas as páginas; o herói grande só aparece na página inicial.
export default function Cabecalho({ isMember, isAdmin, perfil, proximo }: Props) {
  const path = usePathname();
  const inicio = path === "/";
  return (
    <>
      <header className="appbar">
        <div className="in appbar-in">
          <Link href={isMember ? "/eventos" : "/"} className="appbar-brand" translate="no" aria-label="EDCycling, início">ED<span>CYCLING</span></Link>
          <NavTabs isAdmin={isAdmin} isMember={isMember} />
          <div className="appbar-r">
            {isAdmin && <Link href="/gestao" className="btn appbar-gestao" aria-current={path.startsWith("/gestao") ? "page" : undefined}>Gestão</Link>}
            {perfil ? (
              <AccountMenu nome={perfil.nome} avatar={perfil.avatar_path} isAdmin={isAdmin} isMember={isMember} />
            ) : (
              path !== "/entrar" && <Link href="/entrar" className="btn primary">Entrar</Link>
            )}
          </div>
        </div>
      </header>
      {inicio && (
        <section className="hero" aria-label="EDCycling">
          <div className="topo" aria-hidden="true" />
          <div className="in">
            <div className="brand">
              <p className="hero-sub">A bicicleta como estilo de vida, desde 2023</p>
              <h1>ED<span>Cycling</span></h1>
            </div>
            {isMember ? (
              <Link href="/eventos" className="next">
                <div className="l">Próximo evento</div>
                <div className="d">{proximo ? proximo.titulo : "Nada marcado"}</div>
                {proximo && <div className="s" suppressHydrationWarning>{proximo.quando}</div>}
              </Link>
            ) : (
              <Link href="/entrar" className="next next-cta">
                <div className="l">Atletas da equipa</div>
                <div className="d">Entrar</div>
                <div className="s">Eventos, treinos, fotos e estatísticas</div>
              </Link>
            )}
          </div>
          <div className="stripe" />
        </section>
      )}
    </>
  );
}
