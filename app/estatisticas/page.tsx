import Link from "next/link";
import Estatisticas from "@/components/Estatisticas";
import { getSession } from "@/lib/session";
import type { InscricaoMin } from "@/lib/stats";
import type { Evento, Membro, Treino } from "@/lib/types";

export default async function EstatisticasPage() {
  const { supabase, perfil, isMember } = await getSession();
  if (!isMember) {
    return (
      <section className="view">
        <div className="sechead"><h2>Estatísticas</h2></div>
        <p className="empty">{perfil ? "As estatísticas ficam visíveis assim que a tua conta estiver ativa." : <>As estatísticas são só para a equipa. <Link href="/entrar">Entra</Link> para as veres.</>}</p>
      </section>
    );
  }
  const [{ data: treinos }, { data: eventos }, { data: inscricoes }, { data: membros }] = await Promise.all([
    supabase.from("treinos").select("id,titulo,data,tipo,km,km_plano,dmais,duracao_s,presencas_fechadas,convidados,treino_participantes(user_id,estado,presente)"),
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("evento_id,user_id,estado,presente"),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).eq("atleta", true).order("nome"),
  ]);
  return (
    <Estatisticas
      treinos={(treinos ?? []) as unknown as Treino[]}
      eventos={(eventos ?? []) as Evento[]}
      inscricoes={(inscricoes ?? []) as InscricaoMin[]}
      membros={(membros ?? []) as Membro[]}
      userId={perfil!.id}
    />
  );
}
