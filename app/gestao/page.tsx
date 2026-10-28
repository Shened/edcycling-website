import { redirect } from "next/navigation";
import AdminView from "@/components/AdminView";
import { getSession } from "@/lib/session";
import type { Evento, Inscricao, Perfil } from "@/lib/types";

export default async function Gestao() {
  const { supabase, perfil, isAdmin } = await getSession();
  if (!isAdmin) redirect("/");
  const [{ data: eventos }, { data: insc }, { data: perfis }, { count }] = await Promise.all([
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("id,evento_id,user_id,estado,perfis(nome)"),
    supabase.from("perfis").select("id,nome,email,role,created_at").order("created_at", { ascending: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
  ]);
  return (
    <AdminView
      eventos={(eventos ?? []) as Evento[]}
      inscricoes={(insc ?? []) as unknown as Inscricao[]}
      perfis={(perfis ?? []) as Perfil[]}
      fotos={count ?? 0}
      meId={perfil!.id}
    />
  );
}
