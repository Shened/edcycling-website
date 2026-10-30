import EquipamentosAdmin from "@/components/admin/EquipamentosAdmin";
import { getSession } from "@/lib/session";
import type { Equipamento } from "@/lib/equipamentos";

export default async function EquipamentosPage() {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("equipamentos").select("*").order("ordem").order("nome");
  if (error) return <div className="panel"><p className="empty" style={{ margin: 0 }}>Falta correr a migration <b>016_equipamentos.sql</b> no Supabase para gerir os equipamentos.</p></div>;
  return <EquipamentosAdmin kits={(data ?? []) as Equipamento[]} />;
}
