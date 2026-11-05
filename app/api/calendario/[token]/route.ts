import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/notificar";
import { gerarIcs, type ItemCalendario } from "@/lib/ics";
import { hojeLisboa } from "@/lib/avisos-texto";

export const dynamic = "force-dynamic";

const TIPO_T: Record<string, string> = { estrada: "estrada", gravel: "gravel", btt: "BTT", rolo: "rolo", corrida: "corrida", natacao: "natação" };

// Calendário da equipa para subscrever (Google, Apple, Outlook). O link tem um segredo por pessoa,
// porque o calendário do telemóvel não tem sessão iniciada no site. Gerar um link novo invalida o antigo.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!/^[0-9a-f]{64}$/.test(token)) return new Response("Link inválido.", { status: 404 });
  const admin = createAdminClient();
  const { data: t } = await admin.from("calendario_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!t) return new Response("Este link já não é válido. Gera um novo em Definições.", { status: 404 });
  const { data: p } = await admin.from("perfis").select("id,role,ativo").eq("id", t.user_id).maybeSingle();
  if (!p || !p.ativo || !["membro", "admin"].includes(p.role as string)) return new Response("Conta inativa.", { status: 403 });

  const desde = hojeLisboa(-60);
  const [{ data: eventos }, { data: treinos }, { data: minhas }, { data: meusTreinos }] = await Promise.all([
    admin.from("eventos").select("id,titulo,data,hora,partida,notas,km,estado").not("data", "is", null).gte("data", desde),
    admin.from("treinos").select("id,titulo,data,hora,partida,tipo,km_plano,notas").gte("data", desde),
    admin.from("inscricoes").select("evento_id,estado").eq("user_id", p.id),
    admin.from("treino_participantes").select("treino_id,estado").eq("user_id", p.id),
  ]);
  const vou = new Map((minhas ?? []).map((i) => [i.evento_id as string, i.estado as string]));
  const vouT = new Map((meusTreinos ?? []).map((i) => [i.treino_id as string, i.estado as string]));
  const marca = (e?: string) => (e === "vai" ? " ✓" : e === "talvez" ? " ?" : "");

  const itens: ItemCalendario[] = [
    ...(eventos ?? []).filter((e) => e.estado !== "proposta").map((e) => ({
      uid: `${e.id}@edcycling`,
      titulo: `EDCycling · ${e.titulo}${marca(vou.get(e.id as string))}`,
      data: String(e.data), hora: e.hora as string | null, duracaoH: 4, local: e.partida as string | null,
      descricao: [e.km ? `${e.km} km` : null, e.notas as string | null].filter(Boolean).join("\n") || null,
      url: `${SITE}/eventos/${e.id}`, cancelado: e.estado === "cancelado", alarme: vou.get(e.id as string) === "vai",
    })),
    ...(treinos ?? []).map((tr) => ({
      uid: `treino-${tr.id}@edcycling`,
      titulo: `Treino · ${tr.titulo}${marca(vouT.get(tr.id as string))}`,
      data: String(tr.data), hora: tr.hora as string | null, duracaoH: 2.5, local: tr.partida as string | null,
      descricao: [`Treino de ${TIPO_T[tr.tipo as string] ?? tr.tipo}`, tr.km_plano ? `~${tr.km_plano} km` : null, tr.notas as string | null].filter(Boolean).join("\n"),
      url: `${SITE}/treinos?treino=${tr.id}`, alarme: vouT.get(tr.id as string) === "vai",
    })),
  ];
  return new Response(gerarIcs(itens, "EDCycling"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
