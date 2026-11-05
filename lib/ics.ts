// Geração de ficheiros de calendário (iCalendar / .ics) para eventos e treinos.

export interface ItemCalendario {
  uid: string;
  titulo: string;
  data: string;            // YYYY-MM-DD
  hora?: string | null;    // HH:MM
  duracaoH?: number;       // duração estimada (horas), quando há hora
  local?: string | null;
  descricao?: string | null;
  url: string;
  cancelado?: boolean;
  alarme?: boolean;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const p2 = (n: number) => String(n).padStart(2, "0");

// Linhas com mais de 75 octetos são dobradas, como pede a norma (alguns calendários cortam-nas).
function dobrar(l: string): string {
  const out: string[] = [];
  let resto = l;
  while (new TextEncoder().encode(resto).length > 75) {
    let n = 73;
    while (new TextEncoder().encode(resto.slice(0, n)).length > 73) n--;
    out.push(resto.slice(0, n));
    resto = " " + resto.slice(n);
  }
  out.push(resto);
  return out.join("\r\n");
}

function vevent(it: ItemCalendario, stamp: string): string[] {
  const d = it.data.slice(0, 10).replace(/-/g, "");
  let inicio: string, fim: string;
  if (it.hora) {
    const [h, m] = it.hora.split(":").map(Number);
    const total = h * 60 + (m || 0) + Math.round((it.duracaoH ?? 3) * 60);
    const fimMin = Math.min(total, 23 * 60 + 59);
    inicio = `DTSTART;TZID=Europe/Lisbon:${d}T${p2(h)}${p2(m || 0)}00`;
    fim = `DTEND;TZID=Europe/Lisbon:${d}T${p2(Math.floor(fimMin / 60))}${p2(fimMin % 60)}00`;
  } else {
    const dt = new Date(`${it.data.slice(0, 10)}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    inicio = `DTSTART;VALUE=DATE:${d}`;
    fim = `DTEND;VALUE=DATE:${dt.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  return [
    "BEGIN:VEVENT",
    `UID:${it.uid}`,
    `DTSTAMP:${stamp}`,
    inicio, fim,
    `SUMMARY:${esc(it.titulo + (it.cancelado ? " (cancelado)" : ""))}`,
    ...(it.cancelado ? ["STATUS:CANCELLED"] : []),
    ...(it.local ? [`LOCATION:${esc(it.local)}`] : []),
    `DESCRIPTION:${esc([it.descricao, it.url].filter(Boolean).join("\n"))}`,
    `URL:${it.url}`,
    ...(it.alarme && !it.cancelado ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(it.titulo)}`, "TRIGGER:-PT12H", "END:VALARM"] : []),
    "END:VEVENT",
  ];
}

/** Calendário completo, com o fuso de Lisboa declarado (para as horas não mudarem no verão/inverno). */
export function gerarIcs(itens: ItemCalendario[], nome = "EDCycling"): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const linhas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EDCycling//Calendario//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(nome)}`, "X-WR-TIMEZONE:Europe/Lisbon", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    "BEGIN:VTIMEZONE", "TZID:Europe/Lisbon",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0100", "TZNAME:WEST", "DTSTART:19700329T010000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0000", "TZNAME:WET", "DTSTART:19701025T020000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    ...itens.flatMap((it) => vevent(it, stamp)),
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
