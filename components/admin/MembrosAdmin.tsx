"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marcar } from "@/lib/metricas";
import type { Perfil, Role } from "@/lib/types";
import { convidarMembro, reenviarConvite, removerMembro } from "@/app/gestao/actions";
import Avatar from "@/components/Avatar";
import MenuAcoes from "@/components/MenuAcoes";

const ROLES: Record<Role, string> = { pendente: "Pendente", membro: "Membro", admin: "Admin" };

export default function MembrosAdmin({ perfis, meId }: { perfis: Perfil[]; meId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const [convite, setConvite] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingInvite, startInvite] = useTransition();
  const [aRemover, setARemover] = useState<Perfil | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [reenviando, setReenviando] = useState<string | null>(null);

  async function reenviar(id: string) {
    setReenviando(id); setMsg("");
    const r = await reenviarConvite(id);
    setReenviando(null);
    setMsg(r.msg); setMsgOk(r.ok);
    router.refresh();
  }

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = perfis
    .filter((p) => !filtro || norm(`${p.nome} ${p.email}`).includes(norm(filtro)))
    .sort((a, b) => Number(!!a.ativo) - Number(!!b.ativo) || (a.nome || "").localeCompare(b.nome || "", "pt"));
  const atletas = perfis.filter((p) => p.atleta !== false && p.role !== "pendente").length;
  const admins = perfis.filter((p) => p.role === "admin").length;
  const pendentes = perfis.filter((p) => !p.ativo).length;

  async function setAtleta(id: string, valor: boolean) {
    setMsg(""); setMsgOk(false);
    const { error } = await createClient().rpc("set_atleta", { target: id, valor });
    if (error) setMsg("Não foi possível mudar a opção de atleta.");
    router.refresh();
  }
  async function setRole(id: string, role: Role) {
    setMsg(""); setMsgOk(false);
    const { error } = await createClient().rpc("set_role", { target: id, new_role: role });
    if (error) setMsg("Não foi possível mudar o papel.");
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
      if (r.ok) { form.reset(); router.refresh(); marcar("Convite enviado"); }
    });
  }
  async function remover() {
    if (!aRemover) return;
    setRemovendo(true);
    const r = await removerMembro(aRemover.id);
    setRemovendo(false);
    setARemover(null);
    setMsg(r.ok ? "" : r.msg); setMsgOk(false);
    router.refresh();
  }
  useEffect(() => {
    if (!aRemover) return;
    const t = (e: KeyboardEvent) => { if (e.key === "Escape" && !removendo) setARemover(null); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [aRemover, removendo]);

  return (
    <section className="view">
      <div id="convidar">
        <div className="sechead" style={{ marginBottom: 10 }}><h3 className="adm-h">Convidar atleta</h3><span className="empty">O convidado recebe um email para definir a password.</span></div>
        <form className="panel" onSubmit={convidar} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", padding: 14 }}>
          <div className="field" style={{ flex: "1 1 160px" }}><label htmlFor="cNome">Nome</label><input id="cNome" name="nome" type="text" maxLength={40} placeholder="Ex.: Fábio…" autoComplete="off" /></div>
          <div className="field" style={{ flex: "2 1 220px" }}><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" required placeholder="nome@exemplo.com…" autoComplete="off" spellCheck={false} /></div>
          <div className="field" style={{ flex: "0 1 130px" }}><label htmlFor="cRole">Papel</label><select id="cRole" name="role" defaultValue="membro"><option value="membro">Membro</option><option value="admin">Admin</option></select></div>
          <label className="check check-big" style={{ flex: "0 1 auto" }} title="Desmarca para contas só de gestão (ex.: email da equipa)"><input type="checkbox" name="atleta" defaultChecked /> <span>É atleta</span></label>
          <button className="btn primary" disabled={pendingInvite} aria-busy={pendingInvite}>{pendingInvite ? <><span className="spinner" aria-hidden="true" />A enviar…</> : "Enviar convite"}</button>
          {convite && <div className="notice" role="status" style={{ flexBasis: "100%", background: convite.ok ? "var(--go-soft)" : undefined }}>{convite.msg}</div>}
        </form>
      </div>

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h3 className="adm-h">Membros</h3>
          <span className="empty">{atletas} atleta{atletas === 1 ? "" : "s"}, {admins} admin{admins === 1 ? "" : "s"}{pendentes ? ` e ${pendentes} convite${pendentes === 1 ? "" : "s"} por aceitar` : ""}</span>
        </div>
        {msg && <div className="notice" role={msgOk ? "status" : "alert"} style={{ marginBottom: 10, background: msgOk ? "var(--go-soft)" : undefined }}>{msg}</div>}
        {perfis.length > 8 && <input type="search" placeholder="Procurar por nome ou email…" aria-label="Procurar membro" autoComplete="off" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ width: "100%", maxWidth: 360, marginBottom: 10 }} />}
        <div className="mbr" role="table" aria-label="Membros">
          <div className="mbr-row mbr-head" role="row">
            <span role="columnheader">Membro</span><span role="columnheader">Papel</span><span role="columnheader">Atleta</span><span role="columnheader">Estado</span><span role="columnheader" className="sr-only">Ações</span>
          </div>
          {lista.map((p) => {
            const eu = p.id === meId;
            const atleta = p.atleta !== false;
            const acoes = eu ? [] : [
              ...(!p.ativo ? [{ label: reenviando === p.id ? "A enviar…" : "Reenviar convite", onClick: () => { void reenviar(p.id); } }] : []),
              p.role === "admin" ? { label: "Tornar membro", onClick: () => { void setRole(p.id, "membro"); } } : { label: "Tornar admin", onClick: () => { void setRole(p.id, "admin"); } },
              atleta ? { label: "Não contar como atleta", onClick: () => { void setAtleta(p.id, false); } } : { label: "Contar como atleta", onClick: () => { void setAtleta(p.id, true); } },
              { label: "Remover membro…", onClick: () => setARemover(p), perigo: true },
            ];
            return (
              <div key={p.id} className={`mbr-row${p.ativo ? "" : " pend"}`} role="row">
                <span className="mbr-quem" role="cell">
                  {p.ativo ? <Avatar nome={p.nome || p.email || "?"} path={p.avatar_path} size={40} /> : <span className="mbr-env" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>}
                  <span className="mbr-nome">
                    <b>{p.nome || "Sem nome"}{eu && <span className="pessoa-tu"> (tu)</span>}</b>
                    <span>{p.email}</span>
                  </span>
                </span>
                <span className="mbr-tags">
                <span role="cell" className="mbr-c"><span className={`pill ${p.role}`}>{ROLES[p.role]}</span></span>
                <span role="cell" className="mbr-c">{atleta ? <span className="pill tipo">Atleta</span> : <span className="pill">Só gestão</span>}</span>
                <span role="cell" className="mbr-c">{p.ativo ? <span className="pill confirmado">Ativo</span> : <span className="pill pendente">Convite pendente</span>}</span>
                </span>
                <span role="cell" className="mbr-a"><MenuAcoes acoes={acoes} label={`Ações para ${p.nome || p.email}`} /></span>
              </div>
            );
          })}
          {!lista.length && <p className="empty" style={{ padding: 16 }}>Ninguém encontrado.</p>}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Admin gere o site; Membro só usa. Desmarca “Atleta” nas contas só de gestão para não contarem nas presenças e estatísticas.</p>
      </div>
      {aRemover && (
        <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && !removendo && setARemover(null)}>
          <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="rmT" aria-describedby="rmD">
            <div className="mbody">
              <h3 id="rmT">Remover {aRemover.nome || aRemover.email}?</h3>
              <p id="rmD" className="empty" style={{ margin: 0 }}>Deixa de conseguir entrar no site. Esta ação não se pode desfazer.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="btn ghost" onClick={() => setARemover(null)} disabled={removendo} autoFocus>Cancelar</button>
                <button className="btn perigo" onClick={remover} disabled={removendo} aria-busy={removendo}>{removendo ? <><span className="spinner" aria-hidden="true" />A remover…</> : "Remover membro"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
