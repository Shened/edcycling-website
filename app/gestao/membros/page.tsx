import MembrosAdmin from "@/components/admin/MembrosAdmin";
import { getSession } from "@/lib/session";
import type { Perfil } from "@/lib/types";
import { completudes } from "@/lib/completo";

export default async function MembrosPage() {
  const { supabase, perfil } = await getSession();
  const { data } = await supabase.from("perfis").select("id,nome,email,role,ativo,atleta,avatar_path,created_at").order("created_at", { ascending: true });
  const lista = (data ?? []) as Perfil[];
  const comp = await completudes(lista.filter((p) => p.ativo).map((p) => p.id));
  return <MembrosAdmin perfis={lista} meId={perfil!.id} completos={Object.fromEntries([...comp].map(([id, c]) => [id, c.pct]))} />;
}
