import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarAviso } from "@/lib/notificar";
import { hojeLisboa, inscritos, linhaTreino, quando } from "@/lib/avisos-texto";

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
  return NextResponse.json({ dia: amanha, enviados });
}
