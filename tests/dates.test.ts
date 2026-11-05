import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPast, nextEvento, sortEventos } from "@/lib/dates";
import { ehDesporto, type Evento } from "@/lib/types";

const ev = (o: Partial<Evento>): Evento => ({ id: "x", titulo: "X", tipo: "passeio", estado: "confirmado", data: null, mes: 1, ano: 2026, hora: null, partida: null, km: null, dmais: null, notas: null, votos: null, ...o }) as Evento;

describe("datas dos eventos", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 5, 12)); }); // 5 nov 2026
  afterEach(() => vi.useRealTimers());

  it("um evento de ontem já passou; o de hoje ainda não", () => {
    expect(isPast(ev({ data: "2026-11-04" }))).toBe(true);
    expect(isPast(ev({ data: "2026-11-05" }))).toBe(false);
  });

  it("sem dia marcado, só passa quando acaba o mês", () => {
    expect(isPast(ev({ data: null, mes: 11, ano: 2026 }))).toBe(false);
    expect(isPast(ev({ data: null, mes: 10, ano: 2026 }))).toBe(true);
  });

  it("realizado conta sempre como passado", () => {
    expect(isPast(ev({ estado: "realizado", data: "2026-12-01" }))).toBe(true);
  });

  it("ordena por data; os sem dia ficam no fim do mês", () => {
    const l = sortEventos([ev({ id: "semdia", mes: 11 }), ev({ id: "d20", data: "2026-11-20" }), ev({ id: "d01", data: "2026-11-01" })]);
    expect(l.map((e) => e.id)).toEqual(["d01", "d20", "semdia"]);
  });

  it("o próximo evento ignora cancelados e passados", () => {
    const p = nextEvento([ev({ id: "c", estado: "cancelado", data: "2026-11-10" }), ev({ id: "ok", data: "2026-11-12" }), ev({ id: "old", data: "2026-11-01" })]);
    expect(p?.id).toBe("ok");
  });
});

describe("ehDesporto", () => {
  it("respeita a opção e, sem ela, trata o convívio como não desportivo", () => {
    expect(ehDesporto({ desporto: false, tipo: "passeio" })).toBe(false);
    expect(ehDesporto({ desporto: true, tipo: "convivio" })).toBe(true);
    expect(ehDesporto({ tipo: "convivio" })).toBe(false);
    expect(ehDesporto({ tipo: "prova" })).toBe(true);
  });
});
