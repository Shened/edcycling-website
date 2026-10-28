import Link from "next/link";
import EventsView from "@/components/EventsView";
import { getSession } from "@/lib/session";
import type { Evento, Inscricao, Membro } from "@/lib/types";

// Eventos: só para atletas da equipa.
export default async function EventosPage() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return (
      <section className="view">
        <div className="sechead"><h2>Eventos</h2></div>
        <p className="empty">
          {perfil ? "Os eventos ficam visíveis assim que a tua conta estiver ativa." : <>Os eventos são só para atletas da equipa. <Link href="/entrar">Entra</Link> para os veres.</>}
        </p>
      </section>
    );
  }
  const [{ data: eventos }, { data: inscricoes }, { data: membros }] = await Promise.all([
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("id,evento_id,user_id,estado,presente,perfis(nome)"),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).order("nome"),
  ]);
  return (
    <EventsView
      eventos={(eventos ?? []) as Evento[]}
      inscricoes={(inscricoes ?? []) as unknown as Inscricao[]}
      perfil={perfil}
      isMember={isMember}
      isAdmin={isAdmin}
      membros={(membros ?? []) as Membro[]}
    />
  );
}
