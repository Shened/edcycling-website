"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS, MESES, TIPOS, daysTo, evAno, evMes, fmtDate, isPast, parseDate, sortEventos, today } from "@/lib/dates";
import type { EstadoInscricao, Evento, Inscricao, Perfil } from "@/lib/types";
import EventForm from "./EventForm";

interface Props { eventos: Evento[]; inscricoes: Inscricao[]; perfil: Perfil | null; isMember: boolean; isAdmin: boolean }

export default function EventsView({ eventos, inscricoes, perfil, isMember, isAdmin }: Props) {
  const router = useRouter();
  const sorted = useMemo(() => sortEventos(eventos), [eventos]);
  const years = useMemo(() => [...new Set([...eventos.map(evAno), today().getFullYear()])].sort(), [eventos]);
  const [ano, setAno] = useState(() => { const nx = sorted.find((e) => !isPast(e) && e.estado !== "cancelado"); return nx ? evAno(nx) : today().getFullYear(); });
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const up = sorted.filter((e) => !isPast(e));
  const past = sorted.filter(isPast).reverse();
  const byMonth: Record<number, Evento[]> = {};
  sorted.filter((e) => evAno(e) === ano && e.estado !== "cancelado").forEach((e) => (byMonth[evMes(e)] ??= []).push(e));

  async function rsvp(evId: string, estado: EstadoInscricao | null) {
    if (!perfil) return;
    setPending(evId); setMsg("");
    const sb = createClient();
    const { error } = estado
      ? await sb.from("inscricoes").upsert({ evento_id: evId, user_id: perfil.id, estado, updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" })
      : await sb.from("inscricoes").delete().eq("evento_id", evId).eq("user_id", perfil.id);
    setPending(null);
    if (error) setMsg("Não foi possível guardar a inscrição. Tenta outra vez.");
    router.refresh();
  }
  function jump(id: string) {
    const el = document.getElementById("e-" + id);
    if (!el) return;
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  function Card({ e }: { e: Evento }) {
    const ps = inscricoes.filter((i) => i.evento_id === e.id).sort((a, b) => (a.perfis?.nome ?? "").localeCompare(b.perfis?.nome ?? "", "pt"));
    const g = { vai: ps.filter((p) => p.estado === "vai"), talvez: ps.filter((p) => p.estado === "talvez"), nao: ps.filter((p) => p.estado === "nao") };
    const mine = perfil ? ps.find((p) => p.user_id === perfil.id)?.estado : undefined;
    const n = e.data ? daysTo(e.data) : null;
    const closed = e.estado === "cancelado" || e.estado === "realizado";
    const d = parseDate(e.data);
    const grp = (k: keyof typeof g, lab: string, cls: string) => (
      <div className={`grp ${cls}`}>
        <span className="gl">{lab} <span className="num">{g[k].length}</span></span>
        {g[k].length ? g[k].map((p) => <span key={p.id} className={`chip${p.user_id === perfil?.id ? " me" : ""}`}>{p.perfis?.nome || "Membro"}</span>) : <span className="empty">—</span>}
      </div>
    );
    return (
      <article className={`ev st-${e.estado}`} id={`e-${e.id}`}>
        <div className="bib" suppressHydrationWarning>
          {d ? (<><span className="n">{d.getDate()}</span><span className="m">{MESES[evMes(e) - 1]}</span><span className="w">{fmtDate(e.data, { weekday: "short" }).replace(".", "")}</span></>)
             : (<><span className="n">{String(evMes(e)).padStart(2, "0")}</span><span className="m">{MESES[evMes(e) - 1]}</span><span className="w num">{evAno(e)}</span></>)}
        </div>
        <div className="evb">
          <div className="evh">
            <h3>{e.titulo}</h3>
            <span className="pill tipo">{TIPOS[e.tipo] ?? "Passeio"}</span>
            <span className={`pill ${e.estado}`}>{ESTADOS[e.estado] ?? "Proposta"}</span>
          </div>
          <dl className="facts">
            <div><dt>Data</dt><dd suppressHydrationWarning>{e.data ? <>{fmtDate(e.data, { weekday: "long", day: "numeric", month: "long" })}{n !== null && n >= 0 && !closed && <> · <span className="num">{n}</span> dias</>}</> : <span className="tbd">por marcar</span>}</dd></div>
            {e.hora && <div><dt>Saída</dt><dd className="num">{e.hora.slice(0, 5)}</dd></div>}
            {e.partida && <div><dt>Encontro</dt><dd>{e.partida}</dd></div>}
            {e.km != null && <div><dt>Distância</dt><dd><span className="num">{e.km}</span> km</dd></div>}
            {e.dmais != null && <div><dt>Desnível</dt><dd><span className="num">{e.dmais}</span> m D+</dd></div>}
          </dl>
          {e.notas && <p className="notes">{e.notas}</p>}
          {isMember && (
            <div className="groups">
              {grp("vai", e.estado === "realizado" ? "Foram" : "Vão", "go")}
              {grp("talvez", "Talvez", "maybe")}
              {g.nao.length > 0 && grp("nao", "Não vão", "no")}
            </div>
          )}
          {!closed && (
            <div className="rsvp">
              {isMember ? (
                <>
                  <span className="lbl">A tua resposta:</span>
                  <button className={`btn${mine === "vai" ? " on-go" : ""}`} disabled={pending === e.id} onClick={() => rsvp(e.id, mine === "vai" ? null : "vai")}>Vou</button>
                  <button className={`btn${mine === "talvez" ? " on-maybe" : ""}`} disabled={pending === e.id} onClick={() => rsvp(e.id, mine === "talvez" ? null : "talvez")}>Talvez</button>
                  <button className={`btn${mine === "nao" ? " on-no" : ""}`} disabled={pending === e.id} onClick={() => rsvp(e.id, mine === "nao" ? null : "nao")}>Não vou</button>
                </>
              ) : perfil ? (
                <span>A tua conta está à espera de aprovação de um admin para te poderes inscrever.</span>
              ) : (
                <span><Link href="/entrar">Entra</Link> para veres quem vai e te inscreveres.</span>
              )}
            </div>
          )}
          <div className="evf">
            <span>{e.votos ? `${e.votos} voto${e.votos === 1 ? "" : "s"} na sondagem do grupo` : ""}</span>
            {isAdmin && <button className="btn ghost" onClick={() => setEditing(e)}>Editar evento</button>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="view">
      {msg && <div className="notice">{msg}</div>}
      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h2>Calendário</h2>
          <div className="yearbar">
            <button className="btn ghost" aria-label="Ano anterior" disabled={ano <= years[0]} onClick={() => setAno(years[Math.max(0, years.indexOf(ano) - 1)])}>‹</button>
            <span className="y num">{ano}</span>
            <button className="btn ghost" aria-label="Ano seguinte" disabled={ano >= years[years.length - 1]} onClick={() => setAno(years[Math.min(years.length - 1, years.indexOf(ano) + 1)])}>›</button>
          </div>
        </div>
        <nav className="year" aria-label="Meses">
          {MESES.map((m, i) => {
            const es = byMonth[i + 1] ?? [];
            return (
              <button key={m} className={`mo${es.length ? " has" : ""}`} tabIndex={es.length ? 0 : -1} aria-disabled={!es.length} onClick={() => es.length && jump(es[0].id)}>
                <span className="ml">{m}</span><span className="md">{es.length ? es.map((x) => x.titulo).join(", ") : " "}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div>
        <div className="sechead" style={{ marginBottom: 14 }}>
          <h2>Próximos eventos</h2>
          {isAdmin && <button className="btn primary" onClick={() => setEditing(null)}>+ Criar evento</button>}
        </div>
        <div className="list">
          {up.length ? up.map((e) => <Card key={e.id} e={e} />) : <p className="empty">Sem eventos marcados.</p>}
        </div>
      </div>
      {past.length > 0 && (
        <details className="past">
          <summary>Eventos anteriores</summary>
          <div className="list">{past.map((e) => <Card key={e.id} e={e} />)}</div>
        </details>
      )}
      {editing !== undefined && <EventForm evento={editing} onClose={() => setEditing(undefined)} />}
    </section>
  );
}
