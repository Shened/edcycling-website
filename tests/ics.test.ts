import { describe, expect, it } from "vitest";
import { gerarIcs } from "@/lib/ics";

const base = { uid: "1@edcycling", titulo: "EDCycling · Volta", data: "2026-12-12", url: "https://x.pt/eventos/1" };

describe("calendário (.ics)", () => {
  it("usa a hora de Lisboa e calcula o fim pela duração", () => {
    const ics = gerarIcs([{ ...base, hora: "08:30", duracaoH: 4 }]);
    expect(ics).toContain("DTSTART;TZID=Europe/Lisbon:20261212T083000");
    expect(ics).toContain("DTEND;TZID=Europe/Lisbon:20261212T123000");
    expect(ics).toContain("BEGIN:VTIMEZONE");
  });

  it("sem hora, fica como evento de dia inteiro", () => {
    const ics = gerarIcs([{ ...base }]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261212");
    expect(ics).toContain("DTEND;VALUE=DATE:20261213");
  });

  it("escapa vírgulas e pontos e vírgula e marca cancelados", () => {
    const ics = gerarIcs([{ ...base, local: "Café, Jovim; porta 2", cancelado: true }]);
    expect(ics).toContain("LOCATION:Café\\, Jovim\\; porta 2");
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("não deixa o fim passar da meia-noite", () => {
    expect(gerarIcs([{ ...base, hora: "22:00", duracaoH: 4 }])).toContain("DTEND;TZID=Europe/Lisbon:20261212T235900");
  });

  it("dobra linhas compridas e termina linhas com CRLF", () => {
    const ics = gerarIcs([{ ...base, descricao: "x".repeat(300) }]);
    for (const l of ics.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
