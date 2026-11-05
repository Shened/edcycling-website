import Link from "next/link";
import EventsView from "@/components/EventsView";
import { getSession } from "@/lib/session";
import type { Atividade, Evento, Inscricao, Membro, OpcaoData, Treino } from "@/lib/types";

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
  const [{ data: eventos }, { data: inscricoes }, { data: membros }, { data: atvs }, { data: treinos }, { data: opcoes }] = await Promise.all([
    // Com o equipamento definido; se a migration 016 ainda não correu, lê sem ele.
    supabase.from("eventos").select("*, equipamento:equipamentos(nome,descricao,foto_path)").then(async (r) => (r.error ? await supabase.from("eventos").select("*") : r)),
    supabase.from("inscricoes").select("id,evento_id,user_id,estado,presente,perfis(nome,avatar_path)"),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).eq("atleta", true).order("nome"),
    // Atividades pessoais: só as do próprio utilizador.
    supabase.from("atividades").select("id,user_id,titulo,tipo,data,hora,km,dmais,duracao_s,trajeto,gpx_path,notas,privada").eq("user_id", perfil!.id),
    // Treinos de equipa: aparecem também na lista, misturados por data.
    supabase.from("treinos").select("id,titulo,data,hora,tipo,intensidade,partida,km_plano,km,dmais,duracao_s,criador_id,presencas_fechadas,convidados,treino_participantes(user_id,estado,presente)").order("data"),
    // Datas em votação (se a migration 029 ainda não correu, fica vazio).
    supabase.from("evento_opcoes").select("id,evento_id,data,hora,nota,ordem,evento_opcao_votos(user_id)").order("data").then((r) => (r.error ? { data: [] } : r)),
  ]);
  return (
    <EventsView
      eventos={(eventos ?? []) as Evento[]}
      inscricoes={(inscricoes ?? []) as unknown as Inscricao[]}
      perfil={perfil}
      isMember={isMember}
      isAdmin={isAdmin}
      membros={(membros ?? []) as Membro[]}
      atividades={(atvs ?? []) as Atividade[]}
      treinos={(treinos ?? []) as unknown as Treino[]}
      opcoes={(opcoes ?? []) as OpcaoData[]}
    />
  );
}
