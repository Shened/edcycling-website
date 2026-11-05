import Link from "next/link";
import { notFound } from "next/navigation";
import Texto from "@/components/Texto";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dataPub, imagemUrl, resumo, type Noticia } from "@/lib/noticias";

// Título, resumo e imagem próprios para quando a notícia é partilhada (WhatsApp, Facebook…).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  const sb = await createClient();
  const { data } = await sb.from("noticias").select("titulo,texto,imagem_path,publicado").eq("id", id).maybeSingle();
  if (!data?.publicado) return { title: "Notícia" };
  const img = imagemUrl(data.imagem_path as string | null);
  const desc = resumo((data.texto as string) ?? "", 160);
  return {
    title: data.titulo as string,
    description: desc,
    alternates: { canonical: `/noticias/${id}` },
    openGraph: { type: "article", title: data.titulo as string, description: desc, ...(img ? { images: [{ url: img }] } : {}) },
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, isAdmin, isMember } = await getSession();
  const { data } = await supabase.from("noticias").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const n = data as Noticia;
  const img = imagemUrl(n.imagem_path);
  return (
    <article className="artigo">
      <Link href={isMember ? "/fotos" : "/"} className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>‹ Voltar</Link>
      <p className="eyebrow" style={{ color: "var(--pink)" }}>{n.publicado ? dataPub(n) : "Rascunho"}</p>
      <h2 className="big" style={{ fontSize: "clamp(30px,5vw,48px)" }}>{n.titulo}</h2>
      {img && <img className="artigo-img" src={img} alt="" />}
      <Texto texto={n.texto} />
      {isAdmin && <Link href="/gestao/publicacoes" className="btn" style={{ alignSelf: "flex-start" }}>Editar no painel</Link>}
    </article>
  );
}
