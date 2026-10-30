import { redirect } from "next/navigation";
import Link from "next/link";
import PerfilEditor from "@/components/PerfilEditor";
import InstalarApp from "@/components/InstalarApp";
import { getSession } from "@/lib/session";
import { comBicicletas, type PerfilAtleta } from "@/lib/atleta";

export default async function PerfilPage() {
  const { supabase, perfil } = await getSession();
  if (!perfil) redirect("/entrar");
  const { data } = await comBicicletas((c) => supabase.from("perfis").select(c).eq("id", perfil.id).single());
  const p = (data ?? { ...perfil }) as unknown as PerfilAtleta;
  const roles = { pendente: "À espera de aprovação", membro: "Membro", admin: "Admin" };
  return (
    <section className="view perfil-v">
      <div className="sechead">
        <h2>O teu perfil</h2>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`pill ${perfil.role}`}>{roles[perfil.role]}</span>
          <Link href={`/atletas/${perfil.id}`} className="btn ghost">Ver como a equipa vê</Link>
        </span>
      </div>
      <Link href={`/atletas/${perfil.id}#atividades`} className="panel atv-link">
        <span><b>As tuas atividades</b><br /><span className="empty">Carrega os GPX das tuas voltas, mesmo as que não são treinos da equipa.</span></span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </Link>
      <PerfilEditor perfil={p} />
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span><span className="field-l">Conta</span><br /><span className="empty">{perfil.email}</span></span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/definir-password" className="btn">Alterar password</Link>
          <form action="/auth/sair" method="post"><button className="btn ghost danger">Sair</button></form>
        </span>
      </div>
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span><span className="field-l">Notificações</span><br /><span className="empty">Avisos no telemóvel e por email: novos eventos, lembretes, alterações…</span></span>
        <Link href="/definicoes" className="btn primary">Definições</Link>
      </div>
      <InstalarApp />
      <Link href="/ajuda" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>Ajuda: como instalar a app</Link>
    </section>
  );
}
