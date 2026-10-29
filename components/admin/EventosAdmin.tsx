"use client";
import { useState } from "react";
import { ESTADOS, MESES, TIPOS, evAno, evMes, sortEventos, today, isPast } from "@/lib/dates";
import type { Evento, Inscricao } from "@/lib/types";
import EventForm from "../EventForm";

export default function EventosAdmin({ eventos, inscricoes }: { eventos: Evento[]; inscricoes: Inscricao[] }) {
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const sorted = sortEventos(eventos);
  const nx = sorted.find((e) => !isPast(e) && e.estado !== "cancelado");
  const [ano, setAno] = useState(nx ? evAno(nx) : today().getFullYear());
  const years = [...new Set([...eventos.map(evAno), today().getFullYear()])].sort();
  const season = sorted.filter((e) => evAno(e) === ano && e.estado !== "cancelado");
  const names = [...new Map(inscricoes.filter((i) => season.some((e) => e.id === i.evento_id)).map((i) => [i.user_id, i.perfis?.nome || "Membro"])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt"));
  const sym = { vai: <span className="c-vai">●</span>, talvez: <span className="c-talvez">◐</span>, nao: <span className="c-nao">✕</span> };

  return (
    <section className="view">
      <div>
        <div className="sechead" style={{ marginBottom: 10 }}><h3 className="adm-h">Eventos</h3><button className="btn primary" onClick={() => setEditing(null)}>+ Criar evento</button></div>
        <div className="tw">
          <table>
            <thead><tr><th>Data</th><th>Evento</th><th>Tipo</th><th>Estado</th><th className="c">Vão</th><th className="c">Talvez</th><th className="c">Presenças</th><th></th></tr></thead>
            <tbody>
              {sorted.length ? sorted.map((e) => {
                const c = (s: string) => inscricoes.filter((i) => i.evento_id === e.id && i.estado === s).length;
                const foram = inscricoes.filter((i) => i.evento_id === e.id && i.presente).length + (e.convidados?.length ?? 0);
                return (
                  <tr key={e.id}>
                    <td className="num">{e.data ? e.data.split("-").reverse().join("/") : `${MESES[evMes(e) - 1]} ${evAno(e)}`}</td>
                    <td><b>{e.titulo}</b></td>
                    <td>{TIPOS[e.tipo] ?? "Passeio"}</td>
                    <td><span className={`pill ${e.estado}`}>{ESTADOS[e.estado] ?? "Proposta"}</span></td>
                    <td className="c num c-vai">{c("vai")}</td>
                    <td className="c num c-talvez">{c("talvez")}</td>
                    <td className="c num">{e.presencas_fechadas ? foram : "—"}</td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="btn ghost" onClick={() => setEditing(e)}>Editar</button>
                      <a className="btn ghost" href={`/eventos/${e.id}`}>Ver</a>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={8} className="empty">Ainda não há eventos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>As presenças registam-se no próprio evento, na página Eventos, depois da data.</p>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h3 className="adm-h">Quem vai a quê</h3>
          <div className="yearbar">
            <button className="btn ghost" aria-label="Ano anterior" disabled={ano <= years[0]} onClick={() => setAno(years[Math.max(0, years.indexOf(ano) - 1)])}>‹</button>
            <span className="y num">{ano}</span>
            <button className="btn ghost" aria-label="Ano seguinte" disabled={ano >= years[years.length - 1]} onClick={() => setAno(years[Math.min(years.length - 1, years.indexOf(ano) + 1)])}>›</button>
          </div>
        </div>
        <div className="tw mx">
          {names.length ? (
            <table>
              <thead><tr><th>Nome</th>{season.map((e) => <th key={e.id} className="c" title={e.titulo}>{MESES[evMes(e) - 1]}</th>)}<th className="c">Total</th></tr></thead>
              <tbody>
                {names.map(([uid, nome]) => {
                  let t = 0;
                  return (
                    <tr key={uid}>
                      <td>{nome}</td>
                      {season.map((e) => {
                        const p = inscricoes.find((i) => i.evento_id === e.id && i.user_id === uid);
                        if (p?.estado === "vai") t++;
                        return <td key={e.id} className="c">{p ? sym[p.estado] : ""}</td>;
                      })}
                      <td className="c num"><b>{t}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="empty" style={{ padding: 12, margin: 0 }}>Ainda ninguém se inscreveu nos eventos desta temporada.</p>}
        </div>
        <div className="legend"><span><b className="c-vai">●</b> vai</span><span><b className="c-talvez">◐</b> talvez</span><span><b className="c-nao">✕</b> não vai</span></div>
      </div>
      {editing !== undefined && <EventForm evento={editing} onClose={() => setEditing(undefined)} />}
    </section>
  );
}
