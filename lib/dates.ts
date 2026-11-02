import type { Evento } from "./types";

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_L = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const ESTADOS: Record<string, string> = { proposta: "Proposta", confirmado: "Confirmado", realizado: "Realizado", cancelado: "Cancelado" };
export const TIPOS: Record<string, string> = { passeio: "Passeio", treino: "Treino", prova: "Prova", convivio: "Convívio" };

export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function daysTo(s?: string | null): number | null {
  const d = parseDate(s);
  return d ? Math.round((d.getTime() - today().getTime()) / 864e5) : null;
}
export function fmtDate(s: string | null | undefined, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("pt-PT", o) : "";
}
export const evAno = (e: Evento) => (e.data ? +e.data.slice(0, 4) : e.ano);
export const evMes = (e: Evento) => (e.data ? +e.data.slice(5, 7) : e.mes);
const key = (e: Evento) => evAno(e) * 10000 + evMes(e) * 100 + (e.data ? +e.data.slice(8, 10) : 99);
export const sortEventos = (l: Evento[]) => [...l].sort((a, b) => key(a) - key(b));
export function isPast(e: Evento): boolean {
  if (e.estado === "realizado") return true;
  const t = today();
  if (e.data) return (daysTo(e.data) ?? 0) < 0;
  return evAno(e) < t.getFullYear() || (evAno(e) === t.getFullYear() && evMes(e) < t.getMonth() + 1);
}
export function nextEvento(l: Evento[]): Evento | undefined {
  return sortEventos(l).find((e) => e.estado !== "cancelado" && !isPast(e));
}
