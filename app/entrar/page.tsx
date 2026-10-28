"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { nome: nome.trim() } },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <section className="auth">
      <h2>Entrar na equipa</h2>
      {state === "sent" ? (
        <div className="panel">
          <p style={{ margin: 0 }}>Enviámos um link para <b>{email}</b>. Abre o email e toca no link para entrar.</p>
          <p className="empty" style={{ marginBottom: 0 }}>Não chegou? Vê a pasta de spam ou tenta outra vez daqui a um minuto.</p>
        </div>
      ) : (
        <form className="panel" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="nome">Nome (só na primeira vez)</label><input id="nome" type="text" maxLength={40} autoComplete="name" placeholder="Como te chamam na equipa" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <button className="btn primary" disabled={state === "busy"} style={{ justifyContent: "center" }}>{state === "busy" ? "A enviar…" : "Enviar link de entrada"}</button>
          {state === "error" && <div className="notice">Não foi possível enviar o link. Confirma o email e tenta outra vez.</div>}
          <p className="empty" style={{ margin: 0 }}>Sem passwords: recebes um link por email. Contas novas ficam à espera da aprovação de um admin.</p>
        </form>
      )}
    </section>
  );
}
