import Link from "next/link";

export const metadata = { title: "Página não encontrada · EDCycling" };

// Link partido, evento apagado ou endereço mal escrito.
export default function NaoEncontrado() {
  return (
    <section className="view erro-pg">
      <p className="eyebrow">Erro 404</p>
      <h1>Saímos da estrada</h1>
      <p>Esta página não existe ou já foi apagada (por exemplo, um evento ou uma publicação que alguém removeu).</p>
      <div className="acoes">
        <Link href="/" className="btn primary">Ir para o início</Link>
        <Link href="/eventos" className="btn">Ver eventos</Link>
      </div>
    </section>
  );
}
