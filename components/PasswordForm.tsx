"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PasswordForm({ id, nome, novo }: { id: string; nome: string; novo: boolean }) {
  const router = useRouter();
  const [n, setN] = useState(nome);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (p1.length < 8) { setErr("A password tem de ter pelo menos 8 caracteres."); return; }
    if (p1 !== p2) { setErr("As duas passwords não coincidem."); return; }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) {
      setBusy(false);
      setErr(error.message.toLowerCase().includes("same") ? "A password nova tem de ser diferente da anterior." : "Não foi possível guardar a password. Tenta outra vez.");
      return;
    }
    await sb.from("perfis").update({ ativo: true, ...(novo && n.trim() ? { nome: n.trim() } : {}) }).eq("id", id);
    router.push("/eventos");
    router.refresh();
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {novo && <div className="field"><label htmlFor="nome">Nome na equipa</label><input id="nome" type="text" maxLength={40} required value={n} onChange={(e) => setN(e.target.value)} /></div>}
      <div className="field"><label htmlFor="p1">Password nova</label><input id="p1" type="password" autoComplete="new-password" minLength={8} required value={p1} onChange={(e) => setP1(e.target.value)} /><span className="hint">Pelo menos 8 caracteres.</span></div>
      <div className="field"><label htmlFor="p2">Repetir password</label><input id="p2" type="password" autoComplete="new-password" minLength={8} required value={p2} onChange={(e) => setP2(e.target.value)} /></div>
      <button className="btn primary" disabled={busy} aria-busy={busy} style={{ justifyContent: "center" }}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : novo ? "Entrar na equipa" : "Guardar password"}</button>
      {err && <div className="notice">{err}</div>}
    </form>
  );
}
