import { getSession } from "@/lib/session";
import { SITE } from "@/lib/notificar";

// Ficheiro de calendário (.ics) para adicionar o evento ao Google/Apple Calendar.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isMember } = await getSession();
  if (!isMember) return new Response("Só para a equipa.", { status: 401 });
  const { data: e } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle();
  if (!e || !e.data) return new Response("Este evento ainda não tem data.", { status: 404 });
  const d = String(e.data).slice(0, 10).replace(/-/g, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  let inicio: string, fim: string;
  if (e.hora) {
    const [h, m] = String(e.hora).split(":").map(Number);
    const fimH = Math.min(23, h + 4);
    inicio = `DTSTART;TZID=Europe/Lisbon:${d}T${String(h).padStart(2, "0")}${String(m || 0).padStart(2, "0")}00`;
    fim = `DTEND;TZID=Europe/Lisbon:${d}T${String(fimH).padStart(2, "0")}${String(m || 0).padStart(2, "0")}00`;
  } else {
    const dt = new Date(`${String(e.data).slice(0, 10)}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    inicio = `DTSTART;VALUE=DATE:${d}`;
    fim = `DTEND;VALUE=DATE:${dt.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  const url = `${SITE}/eventos/${id}`;
  const desc = [e.notas, e.km ? `${e.km} km` : null, url].filter(Boolean).join("\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EDCycling//Eventos//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@edcycling`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    inicio, fim,
    `SUMMARY:${esc(`EDCycling · ${e.titulo}${e.estado === "cancelado" ? " (cancelado)" : ""}`)}`,
    e.partida ? `LOCATION:${esc(e.partida)}` : null,
    `DESCRIPTION:${esc(desc)}`,
    `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Evento EDCycling", "TRIGGER:-PT12H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const nome = String(e.titulo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="edcycling-${nome}.ics"` },
  });
}
