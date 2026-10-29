"use client";
import Link from "next/link";
import { ESTADOS, MESES, MESES_L, TIPOS, daysTo, evAno, evMes, fmtDate, parseDate, today } from "@/lib/dates";
import type { EstadoInscricao, Evento, Inscricao } from "@/lib/types";
import Avatar from "./Avatar";
import MenuAcoes, { type Acao } from "./MenuAcoes";

type Insc = Inscricao & { perfis: { nome: string; avatar_path?: string | null } | null };

const primeiro = (n?: string | null) => (n || "Membro").trim().split(/\s+/)[0];
function juntar(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
function quemVai(vai: Insc[], talvez: number, euId?: string) {
  const t = talvez ? `${talvez} talvez` : "";
  if (!vai.length) return talvez ? `Ninguém confirmou ainda; ${t}.` : "";
  const eu = vai.some((p) => p.user_id === euId);
  const outros = vai.filter((p) => p.user_id !== euId).map((p) => primeiro(p.perfis?.nome));
  const lista = outros.length > 3 ? [...outros.slice(0, 2), `mais ${outros.length - 2}`] : outros;
  const s = eu ? (outros.length ? `Vais tu, com ${juntar(lista)}` : "Vais tu") : `${outros.length === 1 ? "Vai" : "Vão"} ${juntar(lista)}`;
  return `${s}${t ? `; ${t}` : ""}.`;
}

// Etiqueta curta e em frase: "Prova confirmada", "Passeio proposto"...
export function estadoFrase(e: Evento) {
  const tipo = TIPOS[e.tipo] ?? "Passeio";
  const fem = e.tipo === "prova";
  const est: Record<string, string> = { proposta: fem ? "proposta" : "proposto", confirmado: fem ? "confirmada" : "confirmado", realizado: fem ? "realizada" : "realizado", cancelado: fem ? "cancelada" : "cancelado" };
  return `${tipo} ${est[e.estado] ?? (ESTADOS[e.estado] ?? "").toLowerCase()}`;
}

export function DataBloco({ e, grande }: { e: Evento; grande?: boolean }) {
  const d = parseDate(e.data);
  const n = e.data ? daysTo(e.data) : null;
  const ano = evAno(e);
  const mesL = MESES_L[evMes(e) - 1].toLowerCase();
  const futuro = n !== null && n >= 0 && e.estado !== "cancelado" && e.estado !== "realizado";
  return (
    <div className={`evc-data${grande ? " grande" : ""}`} suppressHydrationWarning>
      <div className="topo" aria-hidden="true" />
      <div className="evc-scrim" aria-hidden="true" />
      <div className="evc-data-in">
        {d ? <span className="evc-dia">{d.getDate()}</span> : <span className="evc-dia mes">{MESES[evMes(e) - 1]}</span>}
        <span className="evc-dl">
          <b>{mesL}{ano !== today().getFullYear() ? ` de ${ano}` : ""}</b>
          <span>{d ? fmtDate(e.data, { weekday: "long" }) : "dia por marcar"}</span>
          {futuro && <span className="evc-falta">{n === 0 ? "É hoje" : n === 1 ? "Amanhã" : `Faltam ${n} dias`}</span>}
        </span>
      </div>
    </div>
  );
}

export function Meta({ e }: { e: Evento }) {
  const it = [
    e.hora && { k: "h", t: <>Saída às <b>{e.hora.slice(0, 5)}</b></>, i: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
    e.partida && { k: "p", t: <b>{e.partida}</b>, i: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></> },
    e.km != null && { k: "k", t: <b>{Number(e.km).toLocaleString("pt-PT")}&nbsp;km</b>, i: <path d="M3 17l5-6 4 4 4-7 5 9" /> },
    e.dmais != null && { k: "d", t: <b>{Number(e.dmais).toLocaleString("pt-PT")}&nbsp;m D+</b>, i: <path d="M3 20 10 8l4 6 3-4 4 10z" /> },
  ].filter(Boolean) as { k: string; t: React.ReactNode; i: React.ReactNode }[];
  if (!it.length) return <p className="evc-meta vazio">Hora e local por definir</p>;
  return (
    <ul className="evc-meta">
      {it.map((x) => (
        <li key={x.k}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{x.i}</svg>{x.t}</li>
      ))}
    </ul>
  );
}

export function Resposta({ mine, onPick, busy, titulo }: { mine: EstadoInscricao | null | undefined; onPick: (v: EstadoInscricao | null) => void; busy?: boolean; titulo: string }) {
  return (
    <div className="resp" role="group" aria-label={`A tua resposta para ${titulo}`}>
      <button type="button" className={`btn${mine === "vai" ? " on-go" : ""}`} aria-pressed={mine === "vai"} disabled={busy} onClick={() => onPick(mine === "vai" ? null : "vai")}>Vou</button>
      <button type="button" className={`btn${mine === "talvez" ? " on-maybe" : ""}`} aria-pressed={mine === "talvez"} disabled={busy} onClick={() => onPick(mine === "talvez" ? null : "talvez")}>Talvez</button>
      <button type="button" className={`btn${mine === "nao" ? " on-no" : ""}`} aria-pressed={mine === "nao"} disabled={busy} onClick={() => onPick(mine === "nao" ? null : "nao")}>Não vou</button>
    </div>
  );
}

interface Props {
  e: Evento;
  insc: Insc[];
  euId?: string;
  mine: EstadoInscricao | null | undefined;
  podeResponder: boolean;
  aviso?: string;
  busy?: boolean;
  onPick: (v: EstadoInscricao | null) => void;
  acoes: Acao[];
  proximo?: boolean;
}

export default function EventoCartao({ e, insc, euId, mine, podeResponder, aviso, busy, onPick, acoes, proximo }: Props) {
  const fechado = e.estado === "cancelado" || e.estado === "realizado" || !!e.presencas_fechadas;
  const vai = insc.filter((p) => p.estado === "vai").sort((a, b) => (a.user_id === euId ? -1 : b.user_id === euId ? 1 : (a.perfis?.nome ?? "").localeCompare(b.perfis?.nome ?? "", "pt")));
  const talvez = insc.filter((p) => p.estado === "talvez").length;
  const presentes = insc.filter((p) => p.presente);
  const nConv = e.convidados?.length ?? 0;
  const href = `/eventos/${e.id}`;
  const gente = e.presencas_fechadas ? presentes : vai;
  const frase = e.presencas_fechadas
    ? `Foram ${presentes.length + nConv} atleta${presentes.length + nConv === 1 ? "" : "s"}.`
    : quemVai(vai, talvez, euId);
  return (
    <article className={`evc st-${e.estado}`} id={`e-${e.id}`}>
      <DataBloco e={e} />
      <div className="evc-b">
        <div className="evc-top">
          <div className="evc-tit">
            <p className="evc-tipo">{proximo ? `Próximo evento: ${estadoFrase(e).toLowerCase()}` : estadoFrase(e)}</p>
            <h3><Link href={href}>{e.titulo}</Link></h3>
          </div>
          <MenuAcoes acoes={acoes} label={`Ações para ${e.titulo}`} />
        </div>
        <Meta e={e} />
        <div className="evc-foot">
          <Link href={href} className="evc-gente">
            {gente.length > 0 && (
              <span className="av-stack" aria-hidden="true">
                {gente.slice(0, 4).map((p) => <Avatar key={p.id} nome={p.perfis?.nome || "?"} path={p.perfis?.avatar_path} size={30} />)}
              </span>
            )}
            <span className={frase ? undefined : "evc-ninguem"}>{frase || (fechado ? "Sem presenças registadas." : "Ainda ninguém respondeu. Sê o primeiro.")}</span>
          </Link>
          {!fechado && podeResponder && <Resposta mine={mine} onPick={onPick} busy={busy} titulo={e.titulo} />}
          {!fechado && !podeResponder && aviso && <span className="evc-aviso">{aviso}</span>}
        </div>
      </div>
    </article>
  );
}
