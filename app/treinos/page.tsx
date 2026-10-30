import Link from "next/link";
import TrainingCalendar from "@/components/TrainingCalendar";
import { getSession } from "@/lib/session";
import type { Atividade, Evento, Membro, Treino } from "@/lib/types";

export default async function TreinosPage({ searchParams }: { searchParams: Promise<{ treino?: string }> }) {
  const { treino: abrir } = await searchParams;
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return (
      <section className="view">
        <div className="sechead"><h2>Treinos</h2></div>
        <p className="empty">
          {perfil ? "Os treinos ficam visíveis assim que a tua conta estiver ativa." : <>Os treinos são só para a equipa. <Link href="/entrar">Entra</Link> para os veres.</>}
        </p>
      </section>
    );
  }
  const [{ data: treinos }, { data: eventos }, { data: membros }, { data: atvs }] = await Promise.all([
    supabase
      .from("treinos")
      .select("id,titulo,data,hora,tipo,intensidade,partida,km_plano,notas,gpx_path,km,dmais,duracao_s,trajeto,criador_id,perfis!treinos_criador_id_fkey(nome),presencas_fechadas,convidados,treino_participantes(user_id,estado,presente)")
      .order("data", { ascending: true }),
    supabase.from("eventos").select("*").not("data", "is", null),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).eq("atleta", true).order("nome"),
    // Atividades pessoais: só as do próprio utilizador aparecem no calendário dele.
    supabase.from("atividades").select("id,user_id,titulo,tipo,data,hora,km,dmais,duracao_s,trajeto,gpx_path,notas,privada").eq("user_id", perfil!.id),
  ]);
  return (
    <TrainingCalendar
      treinos={(treinos ?? []) as unknown as Treino[]}
      eventos={(eventos ?? []) as Evento[]}
      isAdmin={isAdmin}
      userId={perfil!.id}
      membros={(membros ?? []) as Membro[]}
      atividades={(atvs ?? []) as Atividade[]}
      abrir={abrir}
    />
  );
}
