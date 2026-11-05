import { getSession } from "@/lib/session";
import { SITE } from "@/lib/notificar";
import { gerarIcs } from "@/lib/ics";

// Ficheiro de calendário (.ics) para adicionar um evento ao Google/Apple Calendar.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isMember } = await getSession();
  if (!isMember) return new Response("Só para a equipa.", { status: 401 });
  const { data: e } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle();
  if (!e || !e.data) return new Response("Este evento ainda não tem data.", { status: 404 });
  const ics = gerarIcs([{
    uid: `${id}@edcycling`, titulo: `EDCycling · ${e.titulo}`, data: String(e.data), hora: e.hora, duracaoH: 4,
    local: e.partida, descricao: [e.notas, e.km ? `${e.km} km` : null].filter(Boolean).join("\n") || null,
    url: `${SITE}/eventos/${id}`, cancelado: e.estado === "cancelado", alarme: true,
  }]);
  const nome = String(e.titulo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="edcycling-${nome}.ics"` },
  });
}
