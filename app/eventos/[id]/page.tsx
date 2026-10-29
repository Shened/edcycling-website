import Link from "next/link";
import { notFound } from "next/navigation";
import EventoDetalhe from "@/components/EventoDetalhe";
import { getSession } from "@/lib/session";
import type { Evento, Inscricao, Membro, Post } from "@/lib/types";

// Página dedicada a um evento (só para a equipa).
export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return <section className="view"><p className="empty">Os eventos são só para atletas da equipa. {perfil ? "Ficam visíveis quando a tua conta estiver ativa." : <Link href="/entrar">Entra para os veres.</Link>}</p></section>;
  }
  const [{ data: ev }, { data: insc }, { data: membros }, { data: postsRaw }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).maybeSingle(),
    supabase.from("inscricoes").select("id,evento_id,user_id,estado,presente,perfis(nome,avatar_path)").eq("evento_id", id),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).eq("atleta", true).order("nome"),
    supabase.from("posts")
      .select("id,autor_id,legenda,foto_path,fotos,evento_id,created_at,perfis!posts_autor_id_fkey(nome,avatar_path),eventos(titulo),post_gostos(user_id,perfis!post_gostos_user_id_fkey(nome)),post_comentarios(id,autor_id,texto,created_at,perfis!post_comentarios_autor_id_fkey(nome,avatar_path))")
      .eq("evento_id", id)
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "post_comentarios", ascending: true })
      .limit(30),
  ]);
  if (!ev) notFound();
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
  const eu = { id: perfil!.id, nome: perfil!.nome || "Eu", avatar: perfil!.avatar_path ?? null };
  return (
    <EventoDetalhe
      evento={ev as Evento}
      inscricoes={(insc ?? []) as unknown as (Inscricao & { perfis: { nome: string; avatar_path?: string | null } | null })[]}
      membros={(membros ?? []) as Membro[]}
      posts={posts}
      eu={eu}
      isAdmin={isAdmin}
    />
  );
}
