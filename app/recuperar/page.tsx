"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/definir-password` });
    // Mostramos sempre a mesma mensagem, para não revelar que emails têm conta.
    setState("sent");
  }

  return (
    <section className="auth">
      <h2>Recuperar password</h2>
      {state === "sent" ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}>Se <b>{email}</b> tiver conta, vais receber um email com um link para definires uma password nova.</p>
          <Link href="/entrar">Voltar a entrar</Link>
        </div>
      ) : (
        <form className="panel" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field"><label htmlFor="email">Email da tua conta</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn primary" disabled={state === "busy"} aria-busy={state === "busy"} style={{ justifyContent: "center" }}>{state === "busy" ? <><span className="spinner" aria-hidden="true" />A enviar…</> : "Enviar link"}</button>
          <Link href="/entrar" style={{ fontSize: 14 }}>Voltar a entrar</Link>
        </form>
      )}
    </section>
  );
}
