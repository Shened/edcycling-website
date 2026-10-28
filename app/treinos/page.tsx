import Link from "next/link";
import TrainingCalendar from "@/components/TrainingCalendar";
import { getSession } from "@/lib/session";
import type { Evento, Treino } from "@/lib/types";

export default async function TreinosPage() {
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
  const [{ data: treinos }, { data: eventos }] = await Promise.all([
    supabase
      .from("treinos")
      .select("id,titulo,data,hora,tipo,intensidade,partida,km_plano,notas,gpx_path,km,dmais,duracao_s,trajeto,criador_id,perfis(nome)")
      .order("data", { ascending: true }),
    supabase.from("eventos").select("*").not("data", "is", null),
  ]);
  return (
    <TrainingCalendar
      treinos={(treinos ?? []) as unknown as Treino[]}
      eventos={(eventos ?? []) as Evento[]}
      isAdmin={isAdmin}
      userId={perfil!.id}
    />
  );
}
