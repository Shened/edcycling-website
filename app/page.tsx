import Link from "next/link";
import { EQUIPA } from "@/lib/equipa";
import { dataPub, imagemUrl, resumo, type Noticia } from "@/lib/noticias";
import { getSession } from "@/lib/session";

// Página pública de apresentação da equipa. Não mostra eventos, datas nem locais.
export default async function Inicio() {
  const { supabase } = await getSession();
  const [{ data }, { data: nots }] = await Promise.all([
    supabase.rpc("resumo_publico"),
    supabase.from("noticias").select("*").eq("publicado", true).order("publicado_em", { ascending: false }).limit(5),
  ]);
  const noticias = (nots ?? []) as Noticia[];
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

      {noticias.length > 0 && (
        <div className="novidades">
          <div className="sechead" style={{ marginBottom: 14 }}><h2>Novidades</h2></div>
          <div className="nov-grid">
            {noticias.map((n, i) => (
              <Link key={n.id} href={`/noticias/${n.id}`} className={`nov${i === 0 ? " first" : ""}`}>
                {n.imagem_path ? <img src={imagemUrl(n.imagem_path)!} alt="" loading="lazy" /> : <span className="nov-ph" aria-hidden="true" />}
                <span className="nov-b">
                  <span className="nov-d">{dataPub(n)}</span>
                  <span className="nov-t">{n.titulo}</span>
                  {n.texto && <span className="nov-x">{resumo(n.texto, i === 0 ? 240 : 140)}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
