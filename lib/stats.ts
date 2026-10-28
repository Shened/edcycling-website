// Cálculo das estatísticas da equipa (puro, sem React, para ser fácil de testar).
import type { Evento, Membro, Treino } from "./types";

export const CICLISMO = new Set(["estrada", "gravel", "btt", "rolo"]);

export interface InscricaoMin { evento_id: string; user_id: string; estado: string; presente?: boolean | null }

export interface LinhaAtleta {
  id: string;
  nome: string;
  treinos: number;
  eventos: number;
  km: number;
  dmais: number;
  segundos: number;
  kmCorrida: number;
  kmNatacao: number;
  presenca: number; // 0..1 dos treinos realizados no período
  convidado?: boolean; // participante sem conta (nome escrito pelo admin)
}

export interface Estatisticas {
  treinosRealizados: number;
  eventosRealizados: number;
  kmEquipa: number;          // km das voltas (cada treino/evento conta uma vez)
  dmaisEquipa: number;
  segundosEquipa: number;
  kmAtletas: number;         // soma dos km de todos os atletas
  mediaAtletas: number;      // atletas por treino realizado
  kmEstimados: boolean;      // algum treino sem GPX usou os km planeados
  porMes: { mes: number; km: number; treinos: number }[];
  porTipo: { tipo: string; km: number; treinos: number }[];
  temCorrida: boolean;
  temNatacao: boolean;
  atletas: LinhaAtleta[];
}

const anoDe = (d: string) => +d.slice(0, 4);
const mesDe = (d: string) => +d.slice(5, 7);

/** Quem conta como presente: a lista do admin, se existir; senão quem disse "vou". */
export function presentes(t: Treino): string[] {
  const ps = t.treino_participantes ?? [];
  return (t.presencas_fechadas ? ps.filter((p) => p.presente) : ps.filter((p) => p.estado === "vai")).map((p) => p.user_id);
}

export function calcular(
  treinos: Treino[],
  eventos: Evento[],
  inscricoes: InscricaoMin[],
  membros: Membro[],
  ano: number,
  hoje: string,
): Estatisticas {
  const tr = treinos.filter((t) => anoDe(t.data) === ano && t.data <= hoje);
  const ev = eventos.filter((e) => {
    if (e.estado === "cancelado") return false;
    const a = e.data ? anoDe(e.data) : e.ano;
    if (a !== ano) return false;
    return e.estado === "realizado" || (!!e.data && e.data <= hoje);
  });

  const kmT = (t: Treino) => (t.km != null ? Number(t.km) : t.km_plano ?? 0);
  const atletas = new Map<string, LinhaAtleta>();
  const atletaIds = new Set(membros.map((m) => m.id)); // contas de gestão não contam
  const linha = (id: string, nomeConvidado?: string) => {
    let l = atletas.get(id);
    if (!l) {
      l = { id, nome: nomeConvidado ?? (membros.find((m) => m.id === id)?.nome || "Ex-membro"), treinos: 0, eventos: 0, km: 0, dmais: 0, segundos: 0, kmCorrida: 0, kmNatacao: 0, presenca: 0, convidado: !!nomeConvidado };
      atletas.set(id, l);
    }
    return l;
  };
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const convidado = (nome: string) => linha("g:" + norm(nome), nome.trim());
  membros.forEach((m) => linha(m.id));

  const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, km: 0, treinos: 0 }));
  const tipos = new Map<string, { tipo: string; km: number; treinos: number }>();
  let kmEquipa = 0, dmaisEquipa = 0, segundosEquipa = 0, somaAtletas = 0;

  for (const t of tr) {
    const km = kmT(t);
    const bike = CICLISMO.has(t.tipo);
    // Os totais de km e D+ da equipa e o gráfico mensal são só de bicicleta.
    if (bike) { kmEquipa += km; dmaisEquipa += t.dmais ?? 0; porMes[mesDe(t.data) - 1].km += km; }
    segundosEquipa += t.duracao_s ?? 0;
    porMes[mesDe(t.data) - 1].treinos += 1;
    const tp = tipos.get(t.tipo) ?? { tipo: t.tipo, km: 0, treinos: 0 };
    tp.km += km; tp.treinos += 1; tipos.set(t.tipo, tp);
    const ps = presentes(t).filter((u) => atletaIds.has(u)).map((u) => linha(u));
    if (t.presencas_fechadas) (t.convidados ?? []).forEach((c) => ps.push(convidado(c)));
    somaAtletas += ps.length;
    for (const l of ps) {
      l.treinos += 1; l.segundos += t.duracao_s ?? 0;
      if (bike) { l.km += km; l.dmais += t.dmais ?? 0; }
      else if (t.tipo === "corrida") l.kmCorrida += km;
      else if (t.tipo === "natacao") l.kmNatacao += km;
    }
  }
  for (const e of ev) {
    const km = e.km ?? 0;
    kmEquipa += km;
    dmaisEquipa += e.dmais ?? 0;
    porMes[(e.data ? mesDe(e.data) : e.mes) - 1].km += km;
    const foram = inscricoes
      .filter((i) => i.evento_id === e.id && (e.presencas_fechadas ? i.presente === true : i.estado === "vai"))
      .filter((i) => atletaIds.has(i.user_id))
      .map((i) => linha(i.user_id));
    if (e.presencas_fechadas) (e.convidados ?? []).forEach((c) => foram.push(convidado(c)));
    for (const l of foram) {
      l.eventos += 1; l.km += km; l.dmais += e.dmais ?? 0;
    }
  }

  const lista = [...atletas.values()];
  lista.forEach((l) => {
    l.presenca = tr.length ? l.treinos / tr.length : 0;
    l.km = Math.round(l.km * 10) / 10; l.kmCorrida = Math.round(l.kmCorrida * 10) / 10; l.kmNatacao = Math.round(l.kmNatacao * 100) / 100;
  });

  return {
    treinosRealizados: tr.length,
    eventosRealizados: ev.length,
    kmEquipa: Math.round(kmEquipa * 10) / 10,
    dmaisEquipa,
    segundosEquipa,
    kmAtletas: Math.round(lista.reduce((a, l) => a + l.km, 0) * 10) / 10,
    mediaAtletas: tr.length ? somaAtletas / tr.length : 0,
    kmEstimados: tr.some((t) => t.km == null && (t.km_plano ?? 0) > 0),
    porMes: porMes.map((m) => ({ ...m, km: Math.round(m.km * 10) / 10 })),
    porTipo: [...tipos.values()].sort((a, b) => b.km - a.km),
    temCorrida: tr.some((t) => t.tipo === "corrida"),
    temNatacao: tr.some((t) => t.tipo === "natacao"),
    atletas: lista.filter((l) => l.treinos + l.eventos > 0 || membros.some((m) => m.id === l.id)),
  };
}

/** Passo "redondo" para o eixo (1, 2, 5 × 10^n). */
export function passoEixo(max: number, alvo = 4): number {
  if (max <= 0) return 10;
  const bruto = max / alvo;
  const p = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
