"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro") === "link")
      setErr("O link expirou ou já foi usado. Pede um novo em “Esqueci-me da password” ou pede outro convite a um admin.");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setBusy(false); setErr("Email ou password errados."); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <section className="auth">
      <h2>Entrar</h2>
      <form className="panel" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn primary" disabled={busy} aria-busy={busy} style={{ justifyContent: "center" }}>{busy ? <><span className="spinner" aria-hidden="true" />A entrar…</> : "Entrar"}</button>
        {err && <div className="notice">{err}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 14 }}>
          <Link href="/recuperar">Esqueci-me da password</Link>
          <span className="empty">Sem conta? Pede um convite a um admin.</span>
        </div>
      </form>
    </section>
  );
}
