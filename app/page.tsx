import { EQUIPA } from "@/lib/equipa";
import { getSession } from "@/lib/session";

// Página pública de apresentação da equipa. Não mostra eventos, datas nem locais.
export default async function Inicio() {
  const { supabase } = await getSession();
  const { data } = await supabase.rpc("resumo_publico");
  const r = (data ?? null) as { atletas: number; km_ano: number; treinos_ano: number } | null;
  const fund = new Date(EQUIPA.fundacao);
  const epocas = new Date().getFullYear() - fund.getFullYear() + 1;
  const ano = new Date().getFullYear();

  return (
    <section className="view landing">
      <div className="intro">
        <div className="intro-txt">
          <p className="eyebrow" style={{ color: "var(--pink)" }}>Quem somos</p>
          <h2 className="big">{EQUIPA.titulo}</h2>
          <p className="lead">{EQUIPA.intro}</p>
        </div>
        <dl className="nums">
          {r && <div><dt>Atletas</dt><dd className="num">{r.atletas}</dd></div>}
          {r && <div><dt>Km em {ano}</dt><dd className="num">{Number(r.km_ano).toLocaleString("pt-PT")}</dd></div>}
          {r && <div><dt>Treinos em {ano}</dt><dd className="num">{r.treinos_ano}</dd></div>}
          <div><dt>{epocas === 1 ? "Época" : "Épocas"}</dt><dd className="num">{epocas}</dd></div>
        </dl>
      </div>

      <div className="pilares">
        {EQUIPA.pilares.map((p) => (
          <article key={p.titulo} className="pilar">
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </article>
        ))}
      </div>

    </section>
  );
}
