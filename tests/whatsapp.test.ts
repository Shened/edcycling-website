import { describe, expect, it } from "vitest";
import { mensagemEvento, mensagemTreino } from "@/lib/whatsapp";
import type { Evento, OpcaoData } from "@/lib/types";

const ev = (o: Partial<Evento>): Evento => ({ id: "e", titulo: "Tróia-Sagres", tipo: "prova", estado: "confirmado", data: "2026-12-12", mes: 12, ano: 2026, hora: "15:00", partida: "Casa do Gilberto", km: 202, dmais: 1500, notas: null, votos: null, ...o }) as Evento;

describe("mensagens para o WhatsApp", () => {
  it("evento com data, local, distância, quem vai e link", () => {
    const m = mensagemEvento(ev({}), { link: "https://x.pt/eventos/e", vao: ["Rui Costa", "Ana Silva"] });
    expect(m).toContain("*Prova: Tróia-Sagres*");
    expect(m).toContain("📅 Sábado, 12 de dezembro · 15:00");
    expect(m).toContain("📍 Casa do Gilberto");
    expect(m).toContain("📏 202 km · 1500 m D+");
    expect(m).toContain("👥 Vão 2: Rui e Ana");
    expect(m.endsWith("Diz se vais 👉 https://x.pt/eventos/e")).toBe(true);
  });

  it("uma só pessoa: “Vai 1”; muitas: resume", () => {
    expect(mensagemEvento(ev({}), { link: "l", vao: ["Rui"] })).toContain("👥 Vai 1: Rui");
    expect(mensagemEvento(ev({}), { link: "l", vao: ["A", "B", "C", "D", "E", "F"] })).toContain("👥 Vão 6: A, B, C, D e mais 2");
  });

  it("votação de datas: lista as datas e pede voto", () => {
    const opcoes = [{ id: "1", evento_id: "e", data: "2026-12-06", hora: "08:00", nota: null, ordem: 0 }, { id: "2", evento_id: "e", data: "2026-12-05", hora: null, nota: null, ordem: 1 }] as OpcaoData[];
    const m = mensagemEvento(ev({ sondagem: "aberta", data: null }), { link: "l", opcoes });
    expect(m).toContain("🗳️ Data a escolher entre:");
    const datas = m.split("\n").filter((l) => l.includes("•"));
    expect(datas[0]).toMatch(/\b5\b/);
    expect(datas[1]).toMatch(/\b6\b/);
    expect(m).toContain("às 08:00");
    expect(m).toContain("Vota nos dias que te dão jeito 👉 l");
  });

  it("treino com km previstos e quem marcou", () => {
    const m = mensagemTreino({ titulo: "Volta a Valongo", data: "2026-11-07", hora: "08:30", tipo: "estrada", intensidade: "moderado", partida: "Jovim", km_plano: 70, km: null }, { link: "l", criador: "Rui Costa" });
    expect(m).toContain("*Treino de estrada: Volta a Valongo*");
    expect(m).toContain("📏 ~70 km · ritmo moderado");
    expect(m).toContain("🙋 Marcado por Rui");
  });
});
