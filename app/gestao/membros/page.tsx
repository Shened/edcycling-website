import MembrosAdmin from "@/components/admin/MembrosAdmin";
import { getSession } from "@/lib/session";
import type { Perfil } from "@/lib/types";

export default async function MembrosPage() {
  const { supabase, perfil } = await getSession();
  const { data } = await supabase.from("perfis").select("id,nome,email,role,ativo,atleta,avatar_path,created_at").order("created_at", { ascending: true });
  return <MembrosAdmin perfis={(data ?? []) as Perfil[]} meId={perfil!.id} />;
}
