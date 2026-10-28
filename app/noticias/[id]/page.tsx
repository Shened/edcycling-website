import Link from "next/link";
import { notFound } from "next/navigation";
import Texto from "@/components/Texto";
import { getSession } from "@/lib/session";
import { dataPub, imagemUrl, type Noticia } from "@/lib/noticias";

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, isAdmin } = await getSession();
  const { data } = await supabase.from("noticias").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const n = data as Noticia;
  const img = imagemUrl(n.imagem_path);
  return (
    <article className="artigo">
      <Link href="/" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>‹ Voltar</Link>
      <p className="eyebrow" style={{ color: "var(--pink)" }}>{n.publicado ? dataPub(n) : "Rascunho"}</p>
      <h2 className="big" style={{ fontSize: "clamp(30px,5vw,48px)" }}>{n.titulo}</h2>
      {img && <img className="artigo-img" src={img} alt="" />}
      <Texto texto={n.texto} />
      {isAdmin && <Link href="/gestao/publicacoes" className="btn" style={{ alignSelf: "flex-start" }}>Editar no painel</Link>}
    </article>
  );
}
