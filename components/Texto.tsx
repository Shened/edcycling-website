// Mostra texto simples: linha em branco = novo parágrafo, Enter = quebra de linha.
export default function Texto({ texto }: { texto: string }) {
  const pars = texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="texto">
      {pars.map((p, i) => (
        <p key={i}>{p.split("\n").map((l, j, a) => <span key={j}>{l}{j < a.length - 1 && <br />}</span>)}</p>
      ))}
    </div>
  );
}
