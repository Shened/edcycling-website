import PublicacoesAdmin from "@/components/admin/PublicacoesAdmin";
import { getSession } from "@/lib/session";
import type { Noticia } from "@/lib/noticias";

export default async function PublicacoesPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const { supabase } = await getSession();
  const { nova } = await searchParams;
  const { data } = await supabase.from("noticias").select("*").order("created_at", { ascending: false });
  return <PublicacoesAdmin noticias={(data ?? []) as Noticia[]} abrirNova={nova === "1"} />;
}
