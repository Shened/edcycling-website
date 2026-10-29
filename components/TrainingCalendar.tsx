"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEsc } from "./useEsc";
import { ESTADOS, MESES, MESES_L, TIPOS } from "@/lib/dates";
import { fmtDuracao, fmtKm } from "@/lib/gpx";
import type { Atividade, Evento, Membro, Treino } from "@/lib/types";
import AtividadeForm from "./AtividadeForm";
import { TIPOS_ATIVIDADE } from "@/lib/atividades";
import TreinoForm, { TIPOS_TREINO } from "./TreinoForm";
import EventForm from "./EventForm";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const longDate = (s: string) => fromIso(s).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

type Modal =
  | { k: "dia"; data: string }
  | { k: "treino"; treino: Treino | null; data: string }
  | { k: "evento"; evento: Evento | null; data: string }
  | { k: "atividade"; atividade: Atividade | null; data: string }
  | null;

interface Props { treinos: Treino[]; eventos: Evento[]; isAdmin: boolean; userId: string; membros: Membro[]; atividades?: Atividade[] }

export default function TrainingCalendar({ treinos, eventos, isAdmin, userId, membros, atividades = [] }: Props) {
  const [view, setView] = useState<"mes" | "semana">("mes");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [modal, setModal] = useState<Modal>(null);
  const fecharDia = useCallback(() => setModal(null), []);
  useEsc(modal?.k === "dia", fecharDia);
  const [hoje, setHoje] = useState("");
  useEffect(() => setHoje(iso(new Date())), []);

  // Lembra a vista escolhida neste browser.
  useEffect(() => { try { const v = localStorage.getItem("edc-cal-view"); if (v === "semana" || v === "mes") setView(v); } catch {} }, []);
  function pickView(v: "mes" | "semana") { setView(v); try { localStorage.setItem("edc-cal-view", v); } catch {} }

  const byDay = useMemo(() => {
    const m = new Map<string, { t: Treino[]; e: Evento[]; a: Atividade[] }>();
    const get = (k: string) => { let v = m.get(k); if (!v) { v = { t: [], e: [], a: [] }; m.set(k, v); } return v; };
    atividades.forEach((a) => get(a.data.slice(0, 10)).a.push(a));
    treinos.forEach((t) => get(t.data.slice(0, 10)).t.push(t));
    eventos.forEach((e) => { if (e.data && e.estado !== "cancelado") get(e.data.slice(0, 10)).e.push(e); });
    m.forEach((v) => { v.t.sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99")); v.a.sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99")); });
    return m;
  }, [treinos, eventos, atividades]);

  let days: Date[] = [];
  let label = "";
  if (view === "mes") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const end = addDays(startOfWeek(last), 6);
    for (let d = startOfWeek(first); d <= end; d = addDays(d, 1)) days.push(d);
    label = `${MESES_L[cursor.getMonth()]} ${cursor.getFullYear()}`;
  } else {
    const s = startOfWeek(cursor);
    days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
    const e = days[6];
    label = `${s.getDate()} ${MESES[s.getMonth()]} – ${e.getDate()} ${MESES[e.getMonth()]} ${e.getFullYear()}`;
  }
  const inPeriod = (d: Date) => view === "semana" || d.getMonth() === cursor.getMonth();
  const periodo = days.filter(inPeriod).flatMap((d) => byDay.get(iso(d))?.t ?? []);
  const feitos = periodo.filter((t) => t.km != null);
  const kmFeitos = feitos.reduce((a, t) => a + Number(t.km), 0);
  const dFeitos = feitos.reduce((a, t) => a + (t.dmais ?? 0), 0);
  const kmPlano = periodo.filter((t) => t.km == null).reduce((a, t) => a + (t.km_plano ?? 0), 0);
  const minhas = days.filter(inPeriod).flatMap((d) => byDay.get(iso(d))?.a ?? []);
  const kmMinhas = minhas.reduce((s, a) => s + Number(a.km ?? 0), 0);

  function move(n: number) {
    const d = new Date(cursor);
    if (view === "mes") { d.setDate(1); d.setMonth(d.getMonth() + n); } else d.setDate(d.getDate() + 7 * n);
    setCursor(d);
  }
  function goToday() { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); }

  const nAtletas = (t: Treino) => (t.treino_participantes ?? []).filter((p) => (t.presencas_fechadas ? p.presente : p.estado === "vai")).length + (t.presencas_fechadas ? t.convidados?.length ?? 0 : 0);
  const kmLabel = (t: Treino) => (t.km != null ? `${fmtKm(Number(t.km))} km` : t.km_plano ? `~${t.km_plano} km` : "");

  const atvLabel = (a: Atividade) => [a.km ? `${fmtKm(Number(a.km))} km` : "", a.duracao_s ? fmtDuracao(a.duracao_s) : ""].filter(Boolean).join(" · ");
  function Chip({ t, e, a }: { t?: Treino; e?: Evento; a?: Atividade }) {
    if (a) return (
      <button type="button" className="cal-chip pessoal" title={`${a.titulo} (atividade tua)${a.km ? " · " + fmtKm(Number(a.km)) + " km" : ""}`}
        onClick={(ev) => { ev.stopPropagation(); setModal({ k: "atividade", atividade: a, data: a.data }); }}>
        <span className="t">{a.hora ? a.hora.slice(0, 5) + " " : ""}{a.titulo}</span><span className="k">{a.km ? `${fmtKm(Number(a.km))} km` : ""}</span>
      </button>
    );
    if (t) return (
      <button type="button" className={`cal-chip treino${t.km != null ? " done" : ""}`} title={`${t.titulo}${kmLabel(t) ? " · " + kmLabel(t) : ""}`}
        onClick={(ev) => { ev.stopPropagation(); setModal({ k: "treino", treino: t, data: t.data }); }}>
        <span className="t">{t.hora ? t.hora.slice(0, 5) + " " : ""}{t.titulo}</span><span className="k">{kmLabel(t)}</span>
      </button>
    );
    if (e) return (
      <button type="button" className={`cal-chip evento st-${e.estado}`} title={`${e.titulo} · ${ESTADOS[e.estado]}`}
        onClick={(ev) => { ev.stopPropagation(); setModal({ k: "evento", evento: e, data: e.data! }); }}>
        <span className="t">{e.titulo}</span>
      </button>
    );
    return null;
  }

  function Card({ t, e, a }: { t?: Treino; e?: Evento; a?: Atividade }) {
    if (a) return (
      <button type="button" className="wk-card pessoal" onClick={() => setModal({ k: "atividade", atividade: a, data: a.data })}>
        <span className="tt">{a.titulo}</span>
        <span className="mt">{[a.hora?.slice(0, 5), TIPOS_ATIVIDADE[a.tipo], atvLabel(a)].filter(Boolean).join(" · ")}</span>
        <span className="mt">Atividade tua, só tu vês no calendário</span>
      </button>
    );
    if (t) return (
      <button type="button" className={`wk-card treino${t.km != null ? " done" : ""}`} onClick={() => setModal({ k: "treino", treino: t, data: t.data })}>
        <span className="tt">{t.titulo}</span>
        <span className="mt">{[t.hora?.slice(0, 5), TIPOS_TREINO[t.tipo], kmLabel(t), t.dmais ? `${t.dmais} m D+` : ""].filter(Boolean).join(" · ")}</span>
        {nAtletas(t) > 0 && <span className="mt">{nAtletas(t)} atleta{nAtletas(t) === 1 ? "" : "s"}{t.presencas_fechadas ? " (presenças)" : ""}</span>}
        {t.km == null && t.data < hoje && <span className="mt">Sem GPX</span>}
      </button>
    );
    if (e) return (
      <button type="button" className={`wk-card evento st-${e.estado}`} onClick={() => setModal({ k: "evento", evento: e, data: e.data! })}>
        <span className="tt">{e.titulo}</span>
        <span className="mt">{[TIPOS[e.tipo], ESTADOS[e.estado], e.km ? `${e.km} km` : ""].filter(Boolean).join(" · ")}</span>
      </button>
    );
    return null;
  }

  const diaModal = modal?.k === "dia" ? byDay.get(modal.data) : undefined;
  const treinoAtual = modal?.k === "treino" && modal.treino ? treinos.find((t) => t.id === modal.treino!.id) ?? modal.treino : null;

  return (
    <section className="view">
      <div className="sechead">
        <h2>Treinos</h2>
        <div className="cal-ctrl">
          <div className="seg" role="group" aria-label="Vista">
            <button type="button" aria-pressed={view === "mes"} onClick={() => pickView("mes")}>Mês</button>
            <button type="button" aria-pressed={view === "semana"} onClick={() => pickView("semana")}>Semana</button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" className="btn ghost" aria-label="Anterior" onClick={() => move(-1)}>‹</button>
            <button type="button" className="btn" onClick={goToday}>Hoje</button>
            <button type="button" className="btn ghost" aria-label="Seguinte" onClick={() => move(1)}>›</button>
          </div>
        </div>
      </div>

      <div className="cal-sum">
        <span className="lbl">{label}</span>
        <span className="st"><b>{periodo.length}</b> treino{periodo.length === 1 ? "" : "s"}</span>
        <span className="st"><b>{fmtKm(kmFeitos)}</b> km feitos</span>
        <span className="st"><b>{dFeitos.toLocaleString("pt-PT")}</b> m D+</span>
        {kmPlano > 0 && <span className="st"><b>~{kmPlano}</b> km planeados</span>}
        {minhas.length > 0 && <span className="st st-pessoal"><b>{minhas.length}</b> atividade{minhas.length === 1 ? "" : "s"} tua{minhas.length === 1 ? "" : "s"}{kmMinhas > 0 ? <>, <b>{fmtKm(kmMinhas)}</b> km</> : null}</span>}
      </div>

      {view === "mes" ? (
        <div className="cal-grid" role="grid" aria-label={label}>
          {DIAS.map((d) => <div key={d} className="cal-h" role="columnheader">{d}</div>)}
          {days.map((d) => {
            const k = iso(d);
            const it = byDay.get(k);
            return (
              <div key={k} role="gridcell" className={`cal-day${inPeriod(d) ? "" : " out"}${k === hoje ? " today" : ""}`} onClick={() => setModal({ k: "dia", data: k })}>
                <div className="cal-dn">
                  <span>{d.getDate()}</span>
                  <button type="button" className="cal-add" aria-label={`Adicionar em ${longDate(k)}`} onClick={(ev) => { ev.stopPropagation(); setModal({ k: "dia", data: k }); }}>+</button>
                </div>
                <div className="cal-items">
                  {it?.e.map((e) => <Chip key={e.id} e={e} />)}
                  {it?.t.map((t) => <Chip key={t.id} t={t} />)}
                  {it?.a.map((a) => <Chip key={a.id} a={a} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal-week">
          {days.map((d, i) => {
            const k = iso(d);
            const it = byDay.get(k);
            return (
              <div key={k} className={`cal-col${k === hoje ? " today" : ""}`}>
                <h4><span>{DIAS[i]}</span><span className="num">{d.getDate()}</span></h4>
                {it?.e.map((e) => <Card key={e.id} e={e} />)}
                {it?.t.map((t) => <Card key={t.id} t={t} />)}
                {it?.a.map((a) => <Card key={a.id} a={a} />)}
                <button type="button" className="btn ghost add" onClick={() => setModal({ k: "dia", data: k })}>+ Adicionar</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="legend">
        <span><i className="sw treino" /> treino planeado</span>
        <span><i className="sw treino done" /> treino feito (com GPX)</span>
        <span><i className="sw evento" /> evento da equipa</span>
        <span><i className="sw pessoal" /> atividade tua (só tu vês aqui)</span>
      </div>

      {modal?.k === "dia" && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={longDate(modal.data)}>
            <div className="stripe" />
            <div className="mbody">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h3 style={{ textTransform: "none", fontStyle: "normal" }}>{longDate(modal.data)}</h3>
                <button type="button" className="btn ghost" aria-label="Fechar" onClick={() => setModal(null)}>✕</button>
              </div>
              {diaModal && (diaModal.e.length > 0 || diaModal.t.length > 0 || diaModal.a.length > 0) ? (
                <div className="day-list">
                  {diaModal.e.map((e) => <Card key={e.id} e={e} />)}
                  {diaModal.t.map((t) => <Card key={t.id} t={t} />)}
                  {diaModal.a.map((a) => <Card key={a.id} a={a} />)}
                </div>
              ) : <p className="empty" style={{ margin: 0 }}>Nada marcado para este dia.</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn primary" onClick={() => setModal({ k: "treino", treino: null, data: modal.data })}>+ Novo treino</button>
                {modal.data <= hoje && <button type="button" className="btn" onClick={() => setModal({ k: "atividade", atividade: null, data: modal.data })}>+ Atividade pessoal</button>}
                {isAdmin && <button type="button" className="btn" onClick={() => setModal({ k: "evento", evento: null, data: modal.data })}>+ Novo evento</button>}
              </div>
            </div>
          </div>
        </div>
      )}
      {modal?.k === "treino" && <TreinoForm key={modal.treino?.id ?? "novo"} treino={treinoAtual} data={modal.data} userId={userId} isAdmin={isAdmin} membros={membros} hoje={hoje} onClose={() => setModal(null)} />}
      {modal?.k === "atividade" && <AtividadeForm key={modal.atividade?.id ?? "nova"} userId={userId} atividade={modal.atividade} dataInicial={modal.data} onClose={() => setModal(null)} />}
      {modal?.k === "evento" && (isAdmin
        ? <EventForm evento={modal.evento} dataInicial={modal.data} onClose={() => setModal(null)} />
        : modal.evento && <EventoInfo e={modal.evento} onClose={() => setModal(null)} />)}
    </section>
  );
}

function EventoInfo({ e, onClose }: { e: Evento; onClose: () => void }) {
  useEsc(true, onClose);
  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={e.titulo}>
        <div className="stripe" />
        <div className="mbody">
          <p className="eyebrow" style={{ color: "var(--muted)" }}>{TIPOS[e.tipo]} · {ESTADOS[e.estado]}</p>
          <h3>{e.titulo}</h3>
          <dl className="facts">
            {e.data && <div><dt>Data</dt><dd>{longDate(e.data)}</dd></div>}
            {e.hora && <div><dt>Saída</dt><dd className="num">{e.hora.slice(0, 5)}</dd></div>}
            {e.partida && <div><dt>Encontro</dt><dd>{e.partida}</dd></div>}
            {e.km != null && <div><dt>Distância</dt><dd>{e.km} km</dd></div>}
          </dl>
          {e.notas && <p className="notes">{e.notas}</p>}
          <div className="mactions"><a className="btn" href={`/eventos/${e.id}`}>Ver e inscrever-me</a><button type="button" className="btn" onClick={onClose}>Fechar</button></div>
        </div>
      </div>
    </div>
  );
}
