// Mensagens prontas para colar no grupo do WhatsApp (negrito com *…*, como o WhatsApp formata).
import { MESES_L, fmtDate } from "./dates";
import type { Evento, OpcaoData, Treino } from "./types";

const TIPO_E: Record<string, string> = { passeio: "Passeio", treino: "Treino", prova: "Prova", convivio: "Convívio" };
const TIPO_T: Record<string, string> = { estrada: "estrada", gravel: "gravel", btt: "BTT", rolo: "rolo", corrida: "corrida", natacao: "natação" };
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const km = (n: number) => Number(n).toLocaleString("pt-PT", { maximumFractionDigits: 1 });

function quem(nomes: string[], verbo = "Vão"): string | null {
  if (!nomes.length) return null;
  const p = nomes.map((n) => (n || "Atleta").trim().split(/\s+/)[0]);
  const lista = p.length > 5 ? `${p.slice(0, 4).join(", ")} e mais ${p.length - 4}` : p.length > 1 ? `${p.slice(0, -1).join(", ")} e ${p[p.length - 1]}` : p[0];
  return `👥 ${p.length === 1 ? verbo.replace("Vão", "Vai") : verbo} ${p.length}: ${lista}`;
}

export function mensagemEvento(e: Evento, o: { link: string; vao?: string[]; opcoes?: OpcaoData[] }): string {
  const linhas: string[] = [`🚴 *${TIPO_E[e.tipo] ?? "Evento"}: ${e.titulo}*`];
  const votacao = e.sondagem === "aberta" && (o.opcoes?.length ?? 0) > 0;
  if (votacao) {
    const datas = [...o.opcoes!].sort((a, b) => a.data.localeCompare(b.data))
      .map((x) => `   • ${maiuscula(fmtDate(x.data, { weekday: "short", day: "numeric", month: "short" }))}${x.hora ? ` às ${x.hora.slice(0, 5)}` : ""}`);
    linhas.push(`🗳️ Data a escolher entre:`, ...datas);
    if (e.sondagem_ate) linhas.push(`⏳ Votação até ${fmtDate(e.sondagem_ate, { weekday: "long", day: "numeric", month: "long" })}`);
  } else if (e.data) {
    linhas.push(`📅 ${maiuscula(fmtDate(e.data, { weekday: "long", day: "numeric", month: "long" }))}${e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}`);
  } else {
    linhas.push(`📅 ${MESES_L[e.mes - 1]} de ${e.ano} (dia a definir)`);
  }
  if (e.partida) linhas.push(`📍 ${e.partida}`);
  const dist = [e.km != null ? `${km(Number(e.km))} km` : null, e.dmais ? `${Number(e.dmais).toLocaleString("pt-PT")} m D+` : null].filter(Boolean).join(" · ");
  if (dist) linhas.push(`📏 ${dist}`);
  if (e.equipamento?.nome) linhas.push(`👕 Equipamento: ${e.equipamento.nome}`);
  if (e.estado === "proposta") linhas.push("💡 Proposta: ainda por confirmar");
  if (!votacao) { const q = quem(o.vao ?? []); if (q) linhas.push(q); }
  linhas.push("", votacao ? `Vota nos dias que te dão jeito 👉 ${o.link}` : `Diz se vais 👉 ${o.link}`);
  return linhas.join("\n");
}

export function mensagemTreino(t: Pick<Treino, "titulo" | "data" | "hora" | "tipo" | "intensidade" | "partida" | "km_plano" | "km">, o: { link: string; vao?: string[]; criador?: string | null }): string {
  const linhas: string[] = [`🚴 *Treino de ${TIPO_T[t.tipo] ?? t.tipo}: ${t.titulo}*`];
  linhas.push(`📅 ${maiuscula(fmtDate(t.data, { weekday: "long", day: "numeric", month: "long" }))}${t.hora ? ` · ${t.hora.slice(0, 5)}` : ""}`);
  if (t.partida) linhas.push(`📍 ${t.partida}`);
  const det = [t.km != null ? `${km(Number(t.km))} km` : t.km_plano ? `~${km(Number(t.km_plano))} km` : null, t.intensidade ? `ritmo ${t.intensidade}` : null].filter(Boolean).join(" · ");
  if (det) linhas.push(`📏 ${det}`);
  const q = quem(o.vao ?? []);
  if (q) linhas.push(q);
  if (o.criador) linhas.push(`🙋 Marcado por ${o.criador.trim().split(/\s+/)[0]}`);
  linhas.push("", `Junta-te 👉 ${o.link}`);
  return linhas.join("\n");
}
