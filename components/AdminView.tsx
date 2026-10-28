"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS, MESES, TIPOS, evAno, evMes, isPast, sortEventos, today } from "@/lib/dates";
import type { Evento, Inscricao, Perfil, Role } from "@/lib/types";
import EventForm from "./EventForm";

const ROLES: Record<Role, string> = { pendente: "Pendente", membro: "Membro", admin: "Admin" };

export default function AdminView({ eventos, inscricoes, perfis, fotos, meId }: { eventos: Evento[]; inscricoes: Inscricao[]; perfis: Perfil[]; fotos: number; meId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const sorted = sortEventos(eventos);
  const up = sorted.filter((e) => !isPast(e) && e.estado !== "cancelado");
  const pendentes = perfis.filter((p) => p.role === "pendente");
  const vai = inscricoes.filter((i) => i.estado === "vai" && up.some((e) => e.id === i.evento_id)).length;
  const nx = up[0];
  const [ano, setAno] = useState(nx ? evAno(nx) : today().getFullYear());
  const years = [...new Set([...eventos.map(evAno), today().getFullYear()])].sort();

  async function setRole(id: string, role: Role) {
    setMsg("");
    const { error } = await createClient().rpc("set_role", { target: id, new_role: role });
    if (error) setMsg("Não foi possível mudar o role.");
    router.refresh();
  }

  const season = sorted.filter((e) => evAno(e) === ano && e.estado !== "cancelado");
  const names = [...new Map(inscricoes.filter((i) => season.some((e) => e.id === i.evento_id)).map((i) => [i.user_id, i.perfis?.nome || "Membro"])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt"));
  const sym = { vai: <span className="c-vai">●</span>, talvez: <span className="c-talvez">◐</span>, nao: <span className="c-nao">✕</span> };

  return (
    <section className="view">
      <div className="sechead"><h2>Painel de gestão</h2><button className="btn primary" onClick={() => setEditing(null)}>+ Criar evento</button></div>
      {msg && <div className="notice">{msg}</div>}
      <div className="tiles">
        <div className="tile"><div className="v num">{up.length}</div><div className="k">Próximos eventos</div></div>
        <div className="tile"><div className="v num">{vai}</div><div className="k">Inscrições confirmadas</div></div>
        <div className={`tile${pendentes.length ? " alert" : ""}`}><div className="v num">{pendentes.length}</div><div className="k">Contas por aprovar</div></div>
        <div className="tile"><div className="v num">{fotos}</div><div className="k">Fotos no feed</div></div>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 24 }}>Eventos</h2></div>
        <div className="tw">
          <table>
            <thead><tr><th>Data</th><th>Evento</th><th>Tipo</th><th>Estado</th><th className="c">Vão</th><th className="c">Talvez</th><th></th></tr></thead>
            <tbody>
              {sorted.length ? sorted.map((e) => {
                const c = (s: string) => inscricoes.filter((i) => i.evento_id === e.id && i.estado === s).length;
                return (
                  <tr key={e.id}>
                    <td className="num">{e.data ? e.data.split("-").reverse().join("/") : `${MESES[evMes(e) - 1]} ${evAno(e)}`}</td>
                    <td><b>{e.titulo}</b></td>
                    <td>{TIPOS[e.tipo] ?? "Passeio"}</td>
                    <td><span className={`pill ${e.estado}`}>{ESTADOS[e.estado] ?? "Proposta"}</span></td>
                    <td className="c num c-vai">{c("vai")}</td>
                    <td className="c num c-talvez">{c("talvez")}</td>
                    <td><button className="btn ghost" onClick={() => setEditing(e)}>Editar</button></td>
                  </tr>
                );
              }) : <tr><td colSpan={7} className="empty">Ainda não há eventos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 24 }}>Membros</h2><span className="empty">Aprova quem se registou e escolhe os admins.</span></div>
        <div className="tw">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {[...pendentes, ...perfis.filter((p) => p.role !== "pendente")].map((p) => (
                <tr key={p.id}>
                  <td><b>{p.nome || "—"}</b></td>
                  <td>{p.email}</td>
                  <td><span className={`pill ${p.role}`}>{ROLES[p.role]}</span></td>
                  <td>
                    {p.id === meId ? <span className="empty">És tu</span> : (
                      <div style={{ display: "flex", gap: 6 }}>
                        {p.role === "pendente" && <button className="btn primary" onClick={() => setRole(p.id, "membro")}>Aprovar</button>}
                        <select aria-label={`Role de ${p.nome}`} value={p.role} onChange={(e) => setRole(p.id, e.target.value as Role)}>
                          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 24 }}>Quem vai a quê</h2>
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
