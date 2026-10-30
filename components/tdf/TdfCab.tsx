"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import TdfNav from "./TdfNav";

interface Ed { ano: number; etapas: number; atletas: number }

// Cabeçalho do Tour: grande na página de resumo, compacto nas restantes, com escolha da edição (ano).
export default function TdfCab({ edicoes, anoPadrao, etapas, atletas }: { edicoes: Ed[]; anoPadrao: number | null; etapas: number; atletas: number }) {
  const path = usePathname();
  const resumo = path === "/tour-de-freixo";
  const pedido = Number(useSearchParams().get("ano")) || anoPadrao;
  const atual = edicoes.find((e) => e.ano === pedido) ?? null;
  const nEtapas = atual ? atual.etapas : etapas, nAtletas = atual ? atual.atletas : atletas;
  // Ao mudar de ano dentro de uma etapa volta-se à lista de etapas (a etapa é de outro ano).
  const base = /^\/tour-de-freixo\/etapas\/.+/.test(path) ? "/tour-de-freixo/etapas" : path;

  return (
    <header className={`tdf-cab${resumo ? " grande" : ""}`}>
      <div className="tdf-cab-in">
        <Link href="/tour-de-freixo" className="tdf-logo-l" aria-label="Tour de Freixo, resumo">
          <img src="/tdf/logo.webp" alt="" className="tdf-logo" width={452} height={420} />
        </Link>
        <div className="tdf-cab-t">
          <p className="eyebrow">By EDCycling{atual ? ` · Edição ${atual.ano}` : ""}</p>
          <h1>Tour de Freixo</h1>
          {resumo && (
            <>
              <p className="tdf-lead">Uma brincadeira a sério entre amigos, sobre duas rodas, em Gondomar. Acompanha a classificação geral, os pontos de sprint e de montanha, etapa a etapa.</p>
              <div className="tdf-chips">
                <span>{nEtapas} etapa{nEtapas === 1 ? "" : "s"}</span>
                <span>{nAtletas} atleta{nAtletas === 1 ? "" : "s"}</span>
              </div>
              <a href="https://www.instagram.com/edcycling_gondomar/" target="_blank" rel="noopener noreferrer" className="tdf-insta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
                Vê os vídeos das etapas no Instagram
              </a>
            </>
          )}
        </div>
        {edicoes.length > 1 && (
          <nav className="tdf-anos" aria-label="Edição">
            {[...edicoes].reverse().map((e) => (
              <Link key={e.ano} href={e.ano === anoPadrao ? base : `${base}?ano=${e.ano}`} aria-current={e.ano === atual?.ano ? "true" : undefined}>
                {e.ano}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <TdfNav />
    </header>
  );
}
