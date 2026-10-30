"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TdfNav from "./TdfNav";

// Cabeçalho do Tour: grande na página de resumo, compacto nas restantes.
export default function TdfCab({ etapas, atletas }: { etapas: number; atletas: number }) {
  const resumo = usePathname() === "/tour-de-freixo";
  return (
    <header className={`tdf-cab${resumo ? " grande" : ""}`}>
      <div className="tdf-cab-in">
        <Link href="/tour-de-freixo" className="tdf-logo-l" aria-label="Tour de Freixo, resumo">
          <img src="/tdf/logo.webp" alt="" className="tdf-logo" width={452} height={420} />
        </Link>
        <div className="tdf-cab-t">
          <p className="eyebrow">By EDCycling</p>
          <h1>Tour de Freixo</h1>
          {resumo && (
            <>
              <p className="tdf-lead">Uma brincadeira a sério entre amigos, sobre duas rodas, em Gondomar. Acompanha a classificação geral, os pontos de sprint e de montanha, etapa a etapa.</p>
              <div className="tdf-chips">
                <span>{etapas} etapa{etapas === 1 ? "" : "s"}</span>
                <span>{atletas} atleta{atletas === 1 ? "" : "s"}</span>
              </div>
              <a href="https://www.instagram.com/edcycling_gondomar/" target="_blank" rel="noopener noreferrer" className="tdf-insta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
                Vê os vídeos das etapas no Instagram
              </a>
            </>
          )}
        </div>
      </div>
      <TdfNav />
    </header>
  );
}
