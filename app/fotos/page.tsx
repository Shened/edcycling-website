import Link from "next/link";
import Feed from "@/components/Feed";
import { getSession } from "@/lib/session";
import { sortEventos } from "@/lib/dates";
import type { Evento, Post } from "@/lib/types";

// Feed da equipa: publicações com texto e/ou fotos, opcionalmente ligadas a um evento.
export default async function FeedPage() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return (
      <section className="view">
        <div className="sechead"><h2>Feed da equipa</h2></div>
        <p className="empty">
          {perfil ? "O feed fica visível assim que a tua conta estiver ativa." : <>O feed é só para a equipa. <Link href="/entrar">Entra</Link> para o veres.</>}
        </p>
      </section>
    );
  }
  const [{ data: postsRaw, error: erroPosts }, { data: eventos }] = await Promise.all([
    supabase.from("posts").select("id,autor_id,legenda,foto_path,fotos,evento_id,created_at,perfis!posts_autor_id_fkey(nome,avatar_path),eventos(titulo),post_gostos(user_id,perfis!post_gostos_user_id_fkey(nome)),post_comentarios(id,autor_id,texto,created_at,perfis!post_comentarios_autor_id_fkey(nome,avatar_path))")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "post_comentarios", ascending: true })
      .limit(60),
    supabase.from("eventos").select("id,titulo,data,mes,ano,estado,tipo"),
  ]);
  if (erroPosts) {
    console.error("feed:", erroPosts.message);
    return (
      <section className="view">
        <div className="sechead"><h2>Feed da equipa</h2></div>
        <div className="notice">Não foi possível carregar o feed. As publicações estão guardadas; tenta recarregar daqui a pouco.</div>
      </section>
    );
  }
  const posts = (postsRaw ?? []) as unknown as Post[];
  const paths = [...new Set(posts.flatMap((p) => (p.fotos?.length ? p.fotos : p.foto_path ? [p.foto_path] : [])))];
  const map = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("fotos").createSignedUrls(paths, 60 * 60);
    (signed ?? []).forEach((s) => { if (s.path && s.signedUrl) map.set(s.path, s.signedUrl); });
  }
  posts.forEach((p) => {
    const lista = p.fotos?.length ? p.fotos : p.foto_path ? [p.foto_path] : [];
    p.urls = lista.map((f) => map.get(f)).filter((u): u is string => !!u);
  });
  const evs = sortEventos((eventos ?? []) as Evento[]).filter((e) => e.estado !== "cancelado");
  const eu = { id: perfil!.id, nome: perfil!.nome || "Eu", avatar: (perfil as { avatar_path?: string | null }).avatar_path ?? null };
  return <Feed posts={posts} eventos={evs} userId={perfil!.id} isAdmin={isAdmin} eu={eu} />;
}
