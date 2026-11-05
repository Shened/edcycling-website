import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarAviso } from "@/lib/notificar";
import { hojeLisboa, inscritos, linhaTreino, membrosAtivos, quando } from "@/lib/avisos-texto";

// Corre uma vez por dia (vercel.json → crons) e lembra os eventos e treinos de amanhã.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const amanha = hojeLisboa(1);
  const admin = createAdminClient();
  const [{ data: eventos }, { data: treinos }] = await Promise.all([
    admin.from("eventos").select("*").eq("data", amanha).neq("estado", "cancelado"),
    admin.from("treinos").select("*").eq("data", amanha),
  ]);
  const enviados: string[] = [];
  for (const e of eventos ?? []) {
    const r = await enviarAviso({
      tipo: "lembrete", chave: `lembrete:evento:${e.id}:${amanha}`,
      titulo: `Amanhã: ${e.titulo}`,
      corpo: `${quando(e)}${e.partida ? ` · ${e.partida}` : ""}${e.notas ? `\n${String(e.notas).slice(0, 160)}` : ""}`,
      url: `/eventos/${e.id}`,
      destinatarios: await inscritos(admin, "evento", e.id),
    });
    enviados.push(`evento ${e.titulo}: ${r.push} push, ${r.email} email`);
  }
  for (const t of treinos ?? []) {
    const r = await enviarAviso({
      tipo: "lembrete", chave: `lembrete:treino:${t.id}:${amanha}`,
      titulo: `Amanhã: ${t.titulo}`,
      corpo: linhaTreino(t),
      url: "/treinos",
      destinatarios: await inscritos(admin, "treino", t.id),
    });
    enviados.push(`treino ${t.titulo}: ${r.push} push, ${r.email} email`);
  }
  // Votações de datas: lembra quem ainda não votou (na véspera do prazo ou, sem prazo, 3 dias depois de abrir).
  const hoje = hojeLisboa();
  const { data: votacoes } = await admin.from("eventos").select("id,titulo,sondagem_desde,sondagem_ate").eq("sondagem", "aberta");
  for (const e of votacoes ?? []) {
    const desde = e.sondagem_desde ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(e.sondagem_desde as string)) : null;
    const tresDias = desde ? hojeLisboa(-3) === desde : false;
    const vespera = e.sondagem_ate === amanha;
    const ultimoDia = e.sondagem_ate === hoje;
    if (!(e.sondagem_ate ? vespera || ultimoDia : tresDias)) continue;
    const { data: votos } = await admin.from("evento_opcao_votos").select("user_id").eq("evento_id", e.id);
    const votaram = new Set((votos ?? []).map((v) => v.user_id as string));
    const falta = (await membrosAtivos(admin)).filter((id) => !votaram.has(id));
    if (!falta.length) continue;
    const r = await enviarAviso({
      tipo: "lembrete", chave: `votacao:${e.id}:${hoje}`,
      titulo: ultimoDia ? `Último dia para votar: ${e.titulo}` : `Ainda não votaste: ${e.titulo}`,
      corpo: e.sondagem_ate ? `A votação da data fecha ${ultimoDia ? "hoje" : "amanhã"}. Marca os dias que te dão jeito.` : "Marca os dias que te dão jeito para a equipa escolher a data.",
      url: `/eventos/${e.id}`,
      destinatarios: falta,
    });
    enviados.push(`votação ${e.titulo}: ${r.push} push, ${r.email} email`);
  }
  return NextResponse.json({ dia: amanha, enviados });
}
