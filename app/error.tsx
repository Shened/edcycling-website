"use client";
import { useEffect } from "react";
import Link from "next/link";

// Erro inesperado numa página: mostra uma mensagem em português e deixa tentar outra vez.
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="view erro-pg">
      <p className="eyebrow">Algo correu mal</p>
      <h1>Furo pelo caminho</h1>
      <p>Não conseguimos carregar esta página. Os teus dados estão guardados; tenta outra vez daqui a pouco.{error.digest ? ` (código ${error.digest})` : ""}</p>
      <div className="acoes">
        <button type="button" className="btn primary" onClick={reset}>Tentar outra vez</button>
        <Link href="/" className="btn">Ir para o início</Link>
      </div>
    </section>
  );
}
