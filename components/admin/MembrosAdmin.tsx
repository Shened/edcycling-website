"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Perfil, Role } from "@/lib/types";
import { convidarMembro, removerMembro } from "@/app/gestao/actions";

const ROLES: Record<Role, string> = { pendente: "Pendente", membro: "Membro", admin: "Admin" };

export default function MembrosAdmin({ perfis, meId }: { perfis: Perfil[]; meId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [convite, setConvite] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingInvite, startInvite] = useTransition();
  const [armedRm, setArmedRm] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = perfis
    .filter((p) => !filtro || norm(`${p.nome} ${p.email}`).includes(norm(filtro)))
    .sort((a, b) => Number(!!a.ativo) - Number(!!b.ativo) || (a.nome || "").localeCompare(b.nome || "", "pt"));
  const atletas = perfis.filter((p) => p.atleta !== false && p.role !== "pendente").length;
  const admins = perfis.filter((p) => p.role === "admin").length;
  const pendentes = perfis.filter((p) => !p.ativo).length;

  async function setAtleta(id: string, valor: boolean) {
    setMsg("");
    const { error } = await createClient().rpc("set_atleta", { target: id, valor });
    if (error) setMsg("Não foi possível mudar a opção de atleta.");
    router.refresh();
  }
  async function setRole(id: string, role: Role) {
    setMsg("");
    const { error } = await createClient().rpc("set_role", { target: id, new_role: role });
    if (error) setMsg("Não foi possível mudar o role.");
    router.refresh();
  }
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

  return (
    <section className="view">
      <div id="convidar">
        <div className="sechead" style={{ marginBottom: 10 }}><h3 className="adm-h">Convidar atleta</h3><span className="empty">O convidado recebe um email para definir a password.</span></div>
        <form className="panel" onSubmit={convidar} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", padding: 14 }}>
          <div className="field" style={{ flex: "1 1 160px" }}><label htmlFor="cNome">Nome</label><input id="cNome" name="nome" type="text" maxLength={40} placeholder="ex.: Fábio" /></div>
          <div className="field" style={{ flex: "2 1 220px" }}><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" required placeholder="nome@exemplo.com" /></div>
          <div className="field" style={{ flex: "0 1 130px" }}><label htmlFor="cRole">Role</label><select id="cRole" name="role" defaultValue="membro"><option value="membro">Membro</option><option value="admin">Admin</option></select></div>
          <label className="check" style={{ flex: "0 1 auto" }} title="Desmarca para contas só de gestão (ex.: email da equipa)"><input type="checkbox" name="atleta" defaultChecked /> <span>É atleta</span></label>
          <button className="btn primary" disabled={pendingInvite} aria-busy={pendingInvite}>{pendingInvite ? <><span className="spinner" aria-hidden="true" />A enviar…</> : "Enviar convite"}</button>
          {convite && <div className="notice" style={{ flexBasis: "100%", background: convite.ok ? "var(--go-soft)" : undefined }}>{convite.msg}</div>}
        </form>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h3 className="adm-h">Membros</h3>
          <span className="empty"><span className="num">{atletas}</span> atletas · <span className="num">{admins}</span> admins{pendentes ? <> · <span className="num">{pendentes}</span> convites por aceitar</> : null}</span>
        </div>
        {msg && <div className="notice" style={{ marginBottom: 10 }}>{msg}</div>}
        {perfis.length > 8 && <input type="text" placeholder="Procurar por nome ou email…" aria-label="Procurar membro" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ width: "100%", maxWidth: 360, marginBottom: 10 }} />}
        <div className="tw">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Estado</th><th>Role</th><th className="c">Atleta</th><th></th></tr></thead>
            <tbody>
              {lista.map((p) => (
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
                  <td className="c">
                    <input type="checkbox" aria-label={`${p.nome} é atleta`} checked={p.atleta !== false} onChange={(e) => setAtleta(p.id, e.target.checked)} style={{ accentColor: "var(--go)", width: 16, height: 16 }} />
                  </td>
                  <td>
                    {p.id === meId ? <span className="empty">És tu</span> : (
                      <button className="btn ghost danger" onClick={() => remover(p.id)}>{armedRm === p.id ? "Confirmar remoção" : "Remover"}</button>
                    )}
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={6} className="empty">Ninguém encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Admin gere o site; Membro só usa. Desmarca “Atleta” nas contas só de gestão para não contarem nas presenças e estatísticas.</p>
      </div>
    </section>
  );
}
