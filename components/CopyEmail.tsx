"use client";
import { useState } from "react";

export default function CopyEmail({ email }: { email: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(email); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem permissão: o email continua visível */ }
  }
  return (
    <p className="mail">
      <a href={`mailto:${email}`}>{email}</a>
      <button type="button" className="btn ghost" onClick={copy}>{ok ? "Copiado" : "Copiar"}</button>
    </p>
  );
}
