import { describe, expect, it } from "vitest";
import { calcular } from "@/lib/stats";
import type { Evento, Membro, Treino } from "@/lib/types";

const membros: Membro[] = [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bruno" }];
const HOJE = "2026-11-05";

const treino = (o: Partial<Treino>): Treino => ({
  id: "t", titulo: "Treino", data: "2026-10-01", hora: "08:00", tipo: "estrada", intensidade: null, partida: null,
  km_plano: null, notas: null, gpx_path: null, km: 50, dmais: 500, duracao_s: 7200, trajeto: null, criador_id: "a",
  perfis: null, presencas_fechadas: true, convidados: [], treino_participantes: [], ...o,
}) as Treino;

const evento = (o: Partial<Evento>): Evento => ({
  id: "e", titulo: "Evento", tipo: "passeio", estado: "realizado", data: "2026-09-20", mes: 9, ano: 2026, hora: null,
  partida: null, km: 80, dmais: 1000, notas: null, votos: null, presencas_fechadas: true, convidados: [], ...o,
}) as Evento;

describe("calcular (Números da equipa)", () => {
  it("soma km e D+ só dos treinos de bicicleta", () => {
    const st = calcular([
      treino({ id: "t1", tipo: "estrada", km: 50, dmais: 500, treino_participantes: [{ user_id: "a", estado: "vai", presente: true }] }),
      treino({ id: "t2", tipo: "corrida", km: 10, dmais: 50, treino_participantes: [{ user_id: "a", estado: "vai", presente: true }] }),
    ], [], [], membros, 2026, HOJE);
    expect(st.kmEquipa).toBe(50);
    expect(st.dmaisEquipa).toBe(500);
    expect(st.treinosRealizados).toBe(2);
    const ana = st.atletas.find((l) => l.id === "a")!;
    expect(ana.km).toBe(50);
    expect(ana.kmCorrida).toBe(10);
  });

  it("evento desportivo conta como treino, com km, D+ e presença", () => {
    const st = calcular(
      [treino({ id: "t1", treino_participantes: [{ user_id: "a", estado: "vai", presente: true }] })],
      [evento({ id: "e1", desporto: true, km: 80, dmais: 1000 })],
      [{ evento_id: "e1", user_id: "b", estado: "vai", presente: true }],
      membros, 2026, HOJE,
    );
    expect(st.treinosRealizados).toBe(2);
    expect(st.eventosRealizados).toBe(1);
    expect(st.kmEquipa).toBe(130);
    const bruno = st.atletas.find((l) => l.id === "b")!;
    expect(bruno.treinos).toBe(1);
    expect(bruno.km).toBe(80);
    expect(bruno.presenca).toBeCloseTo(0.5);
  });

  it("evento não desportivo (jantar, convívio) não conta km nem treino", () => {
    const st = calcular([], [evento({ id: "e2", tipo: "convivio", desporto: false, km: 20 })],
      [{ evento_id: "e2", user_id: "a", estado: "vai", presente: true }], membros, 2026, HOJE);
    expect(st.kmEquipa).toBe(0);
    expect(st.treinosRealizados).toBe(0);
    expect(st.eventosRealizados).toBe(1);
    expect(st.atletas.find((l) => l.id === "a")!.treinos).toBe(0);
  });

  it("sem a coluna desporto, o convívio não conta (compatibilidade)", () => {
    const st = calcular([], [evento({ tipo: "convivio", desporto: undefined, km: 20 })], [], membros, 2026, HOJE);
    expect(st.kmEquipa).toBe(0);
  });

  it("ignora propostas, cancelados, eventos futuros e de outros anos", () => {
    const st = calcular([treino({ data: "2026-12-01" }), treino({ data: "2025-05-01" })], [
      evento({ id: "p", estado: "proposta", data: "2026-10-01" }),
      evento({ id: "c", estado: "cancelado", data: "2026-10-01" }),
      evento({ id: "f", estado: "confirmado", data: "2026-12-20", mes: 12 }),
      evento({ id: "o", estado: "realizado", data: "2025-08-01", ano: 2025, mes: 8 }),
    ], [], membros, 2026, HOJE);
    expect(st.treinosRealizados).toBe(0);
    expect(st.eventosRealizados).toBe(0);
    expect(st.kmEquipa).toBe(0);
  });

  it("usa os km planeados quando o treino não tem GPX e assinala a estimativa", () => {
    const st = calcular([treino({ km: null, km_plano: 70 })], [], [], membros, 2026, HOJE);
    expect(st.kmEquipa).toBe(70);
    expect(st.kmEstimados).toBe(true);
  });

  it("sem presenças registadas, conta quem disse “vou”", () => {
    const st = calcular([treino({ presencas_fechadas: false, treino_participantes: [
      { user_id: "a", estado: "vai", presente: null }, { user_id: "b", estado: "talvez", presente: null },
    ] })], [], [], membros, 2026, HOJE);
    expect(st.atletas.find((l) => l.id === "a")!.treinos).toBe(1);
    expect(st.atletas.find((l) => l.id === "b")!.treinos).toBe(0);
  });

  it("convidados sem conta entram na lista de atletas", () => {
    const st = calcular([treino({ convidados: ["Zé Amigo"] })], [], [], membros, 2026, HOJE);
    expect(st.atletas.some((l) => l.convidado && l.nome === "Zé Amigo")).toBe(true);
  });
});

describe("atividades associadas (km de cada atleta)", () => {
  it("cada atleta conta os km da sua atividade; a equipa conta o treino uma vez", () => {
    const st = calcular(
      [treino({ id: "t1", km: 60, treino_participantes: [{ user_id: "a", estado: "vai", presente: true }, { user_id: "b", estado: "vai", presente: true }] })],
      [], [], membros, 2026, HOJE,
      [{ user_id: "a", treino_id: "t1", km: 74.5, dmais: 800, duracao_s: 9000 }],
    );
    expect(st.kmEquipa).toBe(60);
    expect(st.atletas.find((l) => l.id === "a")!.km).toBe(74.5);
    expect(st.atletas.find((l) => l.id === "b")!.km).toBe(60);
  });

  it("quem associou a atividade conta como presente, mesmo sem ter dito “vou”", () => {
    const st = calcular([], [evento({ id: "e1", km: 80, presencas_fechadas: false })], [], membros, 2026, HOJE,
      [{ user_id: "b", evento_id: "e1", km: 95, dmais: 1200, duracao_s: 12000 }]);
    const b = st.atletas.find((l) => l.id === "b")!;
    expect(b.eventos).toBe(1);
    expect(b.km).toBe(95);
  });
});
