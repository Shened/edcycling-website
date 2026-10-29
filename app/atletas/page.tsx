import Link from "next/link";
import AtletasLista from "@/components/AtletasLista";
import { getSession } from "@/lib/session";
import { CAMPOS_PERFIL, type PerfilAtleta } from "@/lib/atleta";

export const metadata = { title: "Atletas · EDCycling" };

// A equipa: todos os atletas ativos, com acesso ao perfil de cada um.
export default async function AtletasPage() {
  const { supabase, perfil, isMember } = await getSession();
  if (!isMember) {
    return <section className="view"><div className="sechead"><h2>Atletas</h2></div><p className="empty">A lista de atletas é só para a equipa. {perfil ? "Fica visível quando a tua conta estiver ativa." : <Link href="/entrar">Entra para a veres.</Link>}</p></section>;
  }
  const { data } = await supabase.from("perfis").select(CAMPOS_PERFIL).in("role", ["membro", "admin"]).eq("atleta", true).eq("ativo", true).order("nome");
  return <AtletasLista atletas={(data ?? []) as unknown as PerfilAtleta[]} euId={perfil!.id} />;
}
