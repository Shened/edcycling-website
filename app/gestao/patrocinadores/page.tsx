import PatrocinadoresAdmin from "@/components/admin/PatrocinadoresAdmin";
import { getSession } from "@/lib/session";
import type { Patrocinador } from "@/lib/patrocinadores";

export default async function PatrocinadoresPage() {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("patrocinadores").select("*").order("principal", { ascending: false }).order("ordem").order("nome");
  if (error) return <div className="panel"><p className="empty" style={{ margin: 0 }}>Falta correr a migration <b>021_patrocinadores.sql</b> no Supabase para gerir os patrocinadores.</p></div>;
  return <PatrocinadoresAdmin lista={(data ?? []) as Patrocinador[]} />;
}
