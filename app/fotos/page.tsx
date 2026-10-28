import Link from "next/link";
import Feed from "@/components/Feed";
import { getSession } from "@/lib/session";
import { sortEventos } from "@/lib/dates";
import type { Evento, Post } from "@/lib/types";

export default async function Fotos() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return (
      <section className="view">
        <div className="sechead"><h2>Fotos da equipa</h2></div>
        <p className="empty">
          {perfil ? "As fotos ficam visíveis assim que um admin aprovar a tua conta." : <>As fotos são só para a equipa. <Link href="/entrar">Entra</Link> para as veres.</>}
        </p>
      </section>
    );
  }
  const [{ data: postsRaw }, { data: eventos }] = await Promise.all([
    supabase.from("posts").select("id,autor_id,legenda,foto_path,evento_id,created_at,perfis(nome),eventos(titulo)").order("created_at", { ascending: false }).limit(120),
    supabase.from("eventos").select("*"),
  ]);
  const posts = (postsRaw ?? []) as unknown as Post[];
  if (posts.length) {
    const { data: signed } = await supabase.storage.from("fotos").createSignedUrls(posts.map((p) => p.foto_path), 60 * 60);
    const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    posts.forEach((p) => (p.url = map.get(p.foto_path) ?? null));
  }
  const evs = sortEventos((eventos ?? []) as Evento[]).filter((e) => e.estado !== "cancelado");
  return <Feed posts={posts} eventos={evs} userId={perfil!.id} isAdmin={isAdmin} />;
}
