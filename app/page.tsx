import EventsView from "@/components/EventsView";
import { getSession } from "@/lib/session";
import type { Evento, Inscricao } from "@/lib/types";

export default async function Home() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  const { data: eventos } = await supabase.from("eventos").select("*");
  let inscricoes: Inscricao[] = [];
  if (isMember) {
    const { data } = await supabase.from("inscricoes").select("id,evento_id,user_id,estado,perfis(nome)");
    inscricoes = (data ?? []) as unknown as Inscricao[];
  }
  return <EventsView eventos={(eventos ?? []) as Evento[]} inscricoes={inscricoes} perfil={perfil} isMember={isMember} isAdmin={isAdmin} />;
}
