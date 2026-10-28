import { redirect } from "next/navigation";
import PasswordForm from "@/components/PasswordForm";
import { getSession } from "@/lib/session";

// Usada no fim do convite, na recuperação e para alterar a password no perfil.
export default async function DefinirPassword() {
  const { user, perfil } = await getSession();
  if (!user || !perfil) redirect("/entrar?erro=link");
  const novo = !perfil.ativo;
  return (
    <section className="auth">
      <h2>{novo ? "Bem-vindo à equipa" : "Definir password"}</h2>
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {novo && <p style={{ margin: 0 }}>Escolhe a password com que vais entrar no site da EDCycling.</p>}
        <p className="empty" style={{ margin: 0 }}>{perfil.email}</p>
        <PasswordForm id={perfil.id} nome={perfil.nome} novo={novo} />
      </div>
    </section>
  );
}
