"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PerfilForm({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [v, setV] = useState(nome);
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().from("perfis").update({ nome: v.trim() }).eq("id", id);
    setMsg(error ? "Não foi possível guardar." : "Guardado.");
    router.refresh();
  }
  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="field"><label htmlFor="pnome">Nome na equipa</label><input id="pnome" type="text" maxLength={40} required value={v} onChange={(e) => setV(e.target.value)} /></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><button className="btn primary">Guardar</button><span className="empty">{msg}</span></div>
    </form>
  );
}
