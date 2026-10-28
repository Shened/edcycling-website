import EventosAdmin from "@/components/admin/EventosAdmin";
import { getSession } from "@/lib/session";
import type { Evento, Inscricao } from "@/lib/types";

export default async function EventosAdminPage() {
  const { supabase } = await getSession();
  const [{ data: eventos }, { data: insc }] = await Promise.all([
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("id,evento_id,user_id,estado,presente,perfis(nome)"),
  ]);
  return <EventosAdmin eventos={(eventos ?? []) as Evento[]} inscricoes={(insc ?? []) as unknown as Inscricao[]} />;
}
