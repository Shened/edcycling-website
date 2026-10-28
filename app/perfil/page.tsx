import { redirect } from "next/navigation";
import Link from "next/link";
import PerfilEditor from "@/components/PerfilEditor";
import InstalarApp from "@/components/InstalarApp";
import { getSession } from "@/lib/session";
import { CAMPOS_PERFIL, type PerfilAtleta } from "@/lib/atleta";

export default async function PerfilPage() {
  const { supabase, perfil } = await getSession();
  if (!perfil) redirect("/entrar");
  const { data } = await supabase.from("perfis").select(CAMPOS_PERFIL).eq("id", perfil.id).single();
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
      <PerfilEditor perfil={p} />
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span><span className="field-l">Conta</span><br /><span className="empty">{perfil.email}</span></span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/definir-password" className="btn">Alterar password</Link>
          <form action="/auth/sair" method="post"><button className="btn ghost danger">Sair</button></form>
        </span>
      </div>
      <InstalarApp />
      <Link href="/ajuda" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>Ajuda: como instalar a app</Link>
    </section>
  );
}
