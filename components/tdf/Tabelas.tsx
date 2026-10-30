import Link from "next/link";
import { MEDALHAS, fmtDif, fmtTempo, type Ciclista, type LinhaGeral, type LinhaPontos } from "@/lib/tdf";

export function Falta() {
  return <div className="panel"><p className="empty" style={{ margin: 0 }}>O Tour de Freixo ainda não tem dados neste site (falta correr as migrations <b>017</b> e <b>018</b> no Supabase).</p></div>;
}

// O nome liga ao perfil na equipa quando o atleta tem conta (só para quem tem sessão de membro).
export function Nome({ r, ligar }: { r: Pick<Ciclista, "name" | "perfil_id">; ligar?: boolean }) {
  return ligar && r.perfil_id ? <Link href={`/atletas/${r.perfil_id}`} className="tdf-perfil">{r.name}</Link> : <>{r.name}</>;
}

const Pos = ({ p }: { p: number }) => <td className="tdf-pos num">{MEDALHAS[p] ?? p}</td>;

export function TabelaGeral({ linhas, completa = true, ligar }: { linhas: LinhaGeral[]; completa?: boolean; ligar?: boolean }) {
  if (!linhas.length) return <p className="empty" style={{ margin: 0 }}>Ainda sem resultados.</p>;
  const lider = linhas[0].total;
  return (
    <div className="tw">
      <table className="tdf-t">
        <thead>
          <tr><th scope="col">#</th><th scope="col">Atleta</th>{completa && <th scope="col" className="r">Etapas</th>}<th scope="col" className="r">Tempo</th></tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rider.id} className={l.pos === 1 ? "lider" : undefined}>
              <Pos p={l.pos} />
              <td className="tdf-nome"><Nome r={l.rider} ligar={ligar} />{completa && l.rider.team && <span className="tdf-eq">{l.rider.team}</span>}</td>
              {completa && <td className="r muted num">{l.etapas}</td>}
              <td className="r num">{l.pos === 1 ? fmtTempo(l.total) : fmtDif(l.total - lider)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TabelaPontos({ linhas, ligar }: { linhas: LinhaPontos[]; ligar?: boolean }) {
  if (!linhas.length) return <p className="empty" style={{ margin: 0 }}>Sem pontos ainda.</p>;
  return (
    <div className="tw">
      <table className="tdf-t">
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rider.id} className={l.pos === 1 ? "lider" : undefined}>
              <Pos p={l.pos} />
              <td className="tdf-nome"><Nome r={l.rider} ligar={ligar} /></td>
              <td className="r num">{l.pontos} pts</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Cartao({ titulo, href, children }: { titulo: React.ReactNode; href?: string; children: React.ReactNode }) {
  return (
    <section className="tdf-sec">
      <div className="tdf-sec-h">
        <h2>{titulo}</h2>
        {href && <Link href={href} className="tdf-mais">Ver tudo</Link>}
      </div>
      {children}
    </section>
  );
}
