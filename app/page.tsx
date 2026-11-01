import Link from "next/link";
import { EQUIPA } from "@/lib/equipa";
import { dataPub, imagemUrl, resumo, type Noticia } from "@/lib/noticias";
import { getSession } from "@/lib/session";
import InicioMembro, { type PostMin, type TreinoMin } from "@/components/InicioMembro";
import type { Evento } from "@/lib/types";

const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// Página inicial: para quem tem conta, um resumo do que aí vem; para visitantes, a apresentação pública.
export default async function Inicio() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (isMember && perfil) {
    const hoje = hojeIso();
    const [{ data: evs }, { data: trs }, { data: nots }, { data: postsRaw }, votos] = await Promise.all([
      supabase.from("eventos").select("*"),
      supabase.from("treinos").select("id,titulo,data,hora,tipo,partida").gte("data", hoje).order("data").limit(10),
      supabase.from("noticias").select("*").eq("publicado", true).order("publicado_em", { ascending: false }).limit(3),
      supabase.from("posts").select("id,autor_id,legenda,foto_path,fotos,created_at,perfis!posts_autor_id_fkey(nome),eventos(titulo)").order("created_at", { ascending: false }).limit(4),
      supabase.from("evento_votos").select("evento_id").eq("user_id", perfil.id),
    ]);
    const eventos = (evs ?? []) as Evento[];
    const jaVotei = new Set(((votos.data ?? []) as { evento_id: string }[]).map((v) => v.evento_id));
    const propostas = votos.error ? 0 : eventos.filter((e) => e.estado === "proposta" && !jaVotei.has(e.id)).length;
    const porFechar = eventos.filter((e) => e.data && e.data < hoje && (e.estado === "confirmado" || e.estado === "proposta")).length;
    const raw = (postsRaw ?? []) as unknown as (PostMin & { fotos: string[] | null; foto_path: string | null })[];
    const primeiras = raw.map((p) => (p.fotos?.length ? p.fotos[0] : p.foto_path)).filter((x): x is string => !!x);
    const urls = new Map<string, string>();
    if (primeiras.length) {
      const { data: signed } = await supabase.storage.from("fotos").createSignedUrls(primeiras, 60 * 60);
      (signed ?? []).forEach((x) => { if (x.path && x.signedUrl) urls.set(x.path, x.signedUrl); });
    }
    const posts: PostMin[] = raw.map((p) => { const f = p.fotos?.length ? p.fotos[0] : p.foto_path; return { ...p, foto: f ? urls.get(f) ?? null : null }; });
    return (
      <InicioMembro
        nome={perfil.nome || ""}
        eventos={eventos}
        treinos={(trs ?? []) as TreinoMin[]}
        noticias={(nots ?? []) as Noticia[]}
        posts={posts}
        propostas={propostas}
        porFechar={porFechar}
        isAdmin={isAdmin}
      />
    );
  }
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

      <Link href="/tour-de-freixo" className="tdf-promo">
        <img src="/tdf/logo.webp" alt="" width={452} height={420} />
        <div>
          <span className="eyebrow">By EDCycling</span>
          <b>Tour de Freixo</b>
          <p>Uma brincadeira a sério entre amigos, em Gondomar: classificação geral, sprint e montanha, etapa a etapa.</p>
          <span className="cta">Ver classificações →</span>
        </div>
      </Link>

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
