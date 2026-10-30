import { logoPatrocinador, type Patrocinador } from "@/lib/patrocinadores";

// Faixa de patrocinadores no fundo de todas as páginas.
export default function Patrocinadores({ lista }: { lista: Patrocinador[] }) {
  if (!lista.length) return null;
  const principais = lista.filter((p) => p.principal);
  const outros = lista.filter((p) => !p.principal);
  const Item = ({ p }: { p: Patrocinador }) => {
    const logo = logoPatrocinador(p.logo_path);
    const conteudo = logo ? <img src={logo} alt={p.nome} loading="lazy" decoding="async" /> : <span>{p.nome}</span>;
    return (
      <li>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" title={p.nome}>{conteudo}</a>
        ) : (
          <span className="patro-sem" title={p.nome}>{conteudo}</span>
        )}
      </li>
    );
  };
  return (
    <section className="patro in" aria-labelledby="patroT">
      <h2 id="patroT" className="eyebrow">Os nossos patrocinadores</h2>
      {principais.length > 0 && <ul className="patro-l principal">{principais.map((p) => <Item key={p.id} p={p} />)}</ul>}
      {outros.length > 0 && <ul className="patro-l">{outros.map((p) => <Item key={p.id} p={p} />)}</ul>}
    </section>
  );
}
