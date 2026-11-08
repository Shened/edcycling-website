"use client";
import { useEffect, useState, useTransition } from "react";
import { ativarWebhookStrava, estadoWebhookStrava } from "@/app/strava-actions";

// Gestão: liga a sincronização automática (o Strava passa a avisar o site de cada atividade nova).
export default function StravaWebhookAdmin() {
  const [estado, setEstado] = useState<{ ok: boolean; ativo: boolean; id?: number; msg?: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [pend, start] = useTransition();
  useEffect(() => { estadoWebhookStrava().then(setEstado).catch(() => setEstado({ ok: false, ativo: false, msg: "Erro." })); }, []);
  return (
    <div className="panel stv-defs">
      <div className="stv-defs-h"><h3>Strava automático</h3>{estado?.ativo && <span className="stv-ok">Ativo</span>}</div>
      <p className="hint" style={{ margin: 0 }}>Com isto ligado, as atividades que os atletas gravam no Strava entram sozinhas no site, em segundos. Faz-se uma vez para toda a equipa.</p>
      {estado === null ? <p className="empty" style={{ margin: 0 }}>A verificar…</p>
        : estado.ativo ? <p className="hint" style={{ margin: 0 }}>Ligado (subscrição {estado.id}).</p>
        : <button type="button" className="btn primary" style={{ alignSelf: "flex-start" }} disabled={pend || !estado.ok}
            onClick={() => start(async () => { const r = await ativarWebhookStrava(); setMsg(r.msg); if (r.ok) setEstado(await estadoWebhookStrava()); })}>
            {pend ? "A ligar…" : "Ligar sincronização automática"}
          </button>}
      {(msg || (estado && !estado.ok && estado.msg)) && <p className="hint" role="status" style={{ margin: 0 }}>{msg || estado?.msg}</p>}
    </div>
  );
}
