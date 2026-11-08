"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sincronizarStrava } from "@/app/strava-actions";

const CHAVE = "edc-strava-sync";

/** Sincronização silenciosa ao abrir o site (no máximo de 30 em 30 minutos por dispositivo). */
export function StravaAuto() {
  const router = useRouter();
  useEffect(() => {
    let ultima = 0;
    try { ultima = Number(localStorage.getItem(CHAVE) ?? 0); } catch { /* sem storage */ }
    if (Date.now() - ultima < 30 * 60_000) return;
    try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* nada */ }
    sincronizarStrava(false).then((r) => { if (r.novas || r.juntadas) router.refresh(); }).catch(() => null);
  }, [router]);
  return null;
}

/** Botão "Atualizar do Strava". */
export default function SincronizarStrava({ compacto }: { compacto?: boolean }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState("");
  function clicar() {
    setMsg("");
    start(async () => {
      const r = await sincronizarStrava(true);
      try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* nada */ }
      const n = r.novas + r.juntadas;
      setMsg(r.estado === "desligado" ? "Liga o Strava em Definições." : r.estado === "limite" ? "O Strava pediu para esperar. Tenta daqui a 15 minutos."
        : r.estado === "erro" ? "O Strava não respondeu." : r.estado === "recente" ? "Já está atualizado." : n ? `${n} atividade${n === 1 ? "" : "s"} nova${n === 1 ? "" : "s"}.` : "Já está tudo atualizado.");
      if (n) router.refresh();
    });
  }
  return (
    <span className={`stv-sync${compacto ? " compacto" : ""}`}>
      <button type="button" className="btn stv-sync-b" onClick={clicar} disabled={pend} aria-busy={pend}>
        <svg className={pend ? "gira" : undefined} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
        {pend ? "A atualizar…" : "Atualizar do Strava"}
      </button>
      {msg && <span className="hint" role="status">{msg}</span>}
    </span>
  );
}
