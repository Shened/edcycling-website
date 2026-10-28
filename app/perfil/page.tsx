import { redirect } from "next/navigation";
import Link from "next/link";
import PerfilForm from "@/components/PerfilForm";
import { getSession } from "@/lib/session";

export default async function PerfilPage() {
  const { perfil } = await getSession();
  if (!perfil) redirect("/entrar");
  const roles = { pendente: "À espera de aprovação", membro: "Membro", admin: "Admin" };
  return (
    <section className="auth">
      <h2>O teu perfil</h2>
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span className={`pill ${perfil.role}`}>{roles[perfil.role]}</span></div>
        <p className="empty" style={{ margin: 0 }}>{perfil.email}</p>
        <PerfilForm id={perfil.id} nome={perfil.nome} />
        <Link href="/definir-password" className="btn" style={{ alignSelf: "flex-start" }}>Alterar password</Link>
      </div>
    </section>
  );
}
