"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS, MESES, TIPOS, evAno, evMes, isPast, sortEventos, today } from "@/lib/dates";
import type { Evento, Inscricao, Perfil, Role } from "@/lib/types";
import EventForm from "./EventForm";
import { convidarMembro, removerMembro } from "@/app/gestao/actions";

const ROLES: Record<Role, string> = { pendente: "Pendente", membro: "Membro", admin: "Admin" };

export default function AdminView({ eventos, inscricoes, perfis, fotos, meId }: { eventos: Evento[]; inscricoes: Inscricao[]; perfis: Perfil[]; fotos: number; meId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const [convite, setConvite] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingInvite, startInvite] = useTransition();
  const [armedRm, setArmedRm] = useState<string | null>(null);
  const sorted = sortEventos(eventos);
  const up = sorted.filter((e) => !isPast(e) && e.estado !== "cancelado");
  const pendentes = perfis.filter((p) => p.role === "pendente");
  const porAtivar = perfis.filter((p) => !p.ativo);
  const vai = inscricoes.filter((i) => i.estado === "vai" && up.some((e) => e.id === i.evento_id)).length;
  const nx = up[0];
  const [ano, setAno] = useState(nx ? evAno(nx) : today().getFullYear());
  const years = [...new Set([...eventos.map(evAno), today().getFullYear()])].sort();

  function convidar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setConvite(null);
    startInvite(async () => {
      const r = await convidarMembro(fd);
      setConvite(r);
      if (r.ok) { form.reset(); router.refresh(); }
    });
  }
  async function remover(id: string) {
    if (armedRm !== id) { setArmedRm(id); return; }
    setArmedRm(null);
    const r = await removerMembro(id);
    setMsg(r.ok ? "" : r.msg);
    router.refresh();
  }

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
        <div className="tile"><div className="v num">{porAtivar.length}</div><div className="k">Convites pendentes</div></div>
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
        <div className="sechead" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 24 }}>Membros</h2><span className="empty">Só entra quem for convidado.</span></div>
        <form className="panel" onSubmit={convidar} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12, padding: 14 }}>
          <div className="field" style={{ flex: "1 1 160px" }}><label htmlFor="cNome">Nome</label><input id="cNome" name="nome" type="text" maxLength={40} placeholder="ex.: Fábio" /></div>
          <div className="field" style={{ flex: "2 1 220px" }}><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" required placeholder="nome@exemplo.com" /></div>
          <div className="field" style={{ flex: "0 1 130px" }}><label htmlFor="cRole">Role</label><select id="cRole" name="role" defaultValue="membro"><option value="membro">Membro</option><option value="admin">Admin</option></select></div>
          <button className="btn primary" disabled={pendingInvite} aria-busy={pendingInvite}>{pendingInvite ? <><span className="spinner" aria-hidden="true" />A enviar…</> : "Enviar convite"}</button>
          {convite && <div className="notice" style={{ flexBasis: "100%", background: convite.ok ? "var(--go-soft)" : undefined }}>{convite.msg}</div>}
        </form>
        <div className="tw">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Estado</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {[...pendentes, ...perfis.filter((p) => p.role !== "pendente")].map((p) => (
                <tr key={p.id}>
                  <td><b>{p.nome || "—"}</b></td>
                  <td>{p.email}</td>
                  <td>{p.ativo ? <span className="empty">Ativo</span> : <span className="pill pendente">Convite enviado</span>}</td>
                  <td>
                    {p.id === meId ? <span className={`pill ${p.role}`}>{ROLES[p.role]}</span> : (
                      <select aria-label={`Role de ${p.nome}`} value={p.role} onChange={(e) => setRole(p.id, e.target.value as Role)}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {p.id === meId ? <span className="empty">És tu</span> : (
                      <button className="btn ghost danger" onClick={() => remover(p.id)}>{armedRm === p.id ? "Confirmar remoção" : "Remover"}</button>
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
