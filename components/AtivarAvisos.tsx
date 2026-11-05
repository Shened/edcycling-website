"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ativarPush, estadoPush, type EstadoPush } from "@/lib/push";
import { marcar } from "@/lib/metricas";

const CHAVE = "edc-avisos-faixa";

// Faixa na página inicial para quem ainda não tem notificações neste dispositivo.
export default function AtivarAvisos({ userId, vapid }: { userId: string; vapid: string }) {
  const [estado, setEstado] = useState<EstadoPush>("?");
  const [fechada, setFechada] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let dispensada = false;
    try { const t = Number(localStorage.getItem(CHAVE) ?? 0); dispensada = Date.now() - t < 14 * 864e5; } catch { /* sem storage */ }
    setFechada(dispensada);
    void estadoPush(vapid).then(setEstado);
  }, [vapid]);

  if (fechada || !["desligado", "ios-instalar"].includes(estado)) return null;
  function dispensar() {
    try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* nada */ }
    setFechada(true);
  }
  async function ligar() {
    setBusy(true); setMsg("");
    try {
      const r = await ativarPush(userId, vapid);
      setEstado(r);
      if (r === "ligado") { marcar("Notificações ativadas", { onde: "faixa" }); setMsg("Feito! Vais receber os avisos neste dispositivo."); }
      else if (r === "bloqueado") setMsg("O browser bloqueou as notificações. Podes autorizá-las nas definições do site.");
    } catch { setMsg("Não foi possível ativar. Tenta em Definições."); }
    setBusy(false);
  }
  return (
    <div className="ativar-avisos" role="region" aria-label="Notificações">
      <span className="ativar-ico" aria-hidden="true">🔔</span>
      <div className="ativar-t">
        <b>Recebe os avisos da equipa</b>
        <span>{estado === "ios-instalar"
          ? <>No iPhone, primeiro instala a app no ecrã principal (<Link href="/ajuda">ver como</Link>) e ativa lá as notificações.</>
          : "Novos eventos, alterações de hora, lembretes na véspera e comentários, diretamente neste dispositivo."}</span>
        {msg && <span role="status">{msg}</span>}
      </div>
      <div className="ativar-a">
        {estado === "desligado" && <button type="button" className="btn primary" onClick={ligar} disabled={busy}>{busy ? "A ativar…" : "Ativar"}</button>}
        <button type="button" className="btn ghost" onClick={dispensar}>Agora não</button>
      </div>
    </div>
  );
}
