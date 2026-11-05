"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { marcar } from "@/lib/metricas";

// Link pessoal para ver os eventos e treinos da equipa no calendário do telemóvel (atualiza sozinho).
export default function CalendarioSub({ userId, site }: { userId: string; site: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    createClient().from("calendario_tokens").select("token").eq("user_id", userId).maybeSingle()
      .then(({ data, error }) => setToken(error ? null : (data?.token as string | undefined) ?? null));
  }, [userId]);

  async function criar(novo = false) {
    setBusy(true); setMsg("");
    const sb = createClient();
    if (novo) await sb.from("calendario_tokens").delete().eq("user_id", userId);
    const { data, error } = await sb.from("calendario_tokens").insert({ user_id: userId }).select("token").single();
    setBusy(false); setArmed(false);
    if (error) { setMsg(/calendario_tokens/.test(error.message) ? "Falta correr a migration 032 no Supabase." : "Não foi possível criar o link."); return; }
    setToken(data.token as string);
    if (novo) setMsg("Link novo criado. O antigo deixou de funcionar: volta a adicioná-lo no telemóvel.");
    marcar("Calendário subscrito", { novo });
  }

  const https = token ? `${site}/api/calendario/${token}.ics` : "";
  const webcal = https.replace(/^https?:/, "webcal:");
  async function copiar() {
    try { await navigator.clipboard.writeText(https); setMsg("Link copiado."); } catch { setMsg("Não foi possível copiar; seleciona o texto e copia à mão."); }
  }

  return (
    <section className="panel stv-defs" aria-labelledby="calT">
      <div className="stv-defs-h"><h3 id="calT">Calendário no telemóvel</h3></div>
      <p className="hint" style={{ margin: 0 }}>
        Os eventos e treinos da equipa aparecem no calendário do teu telemóvel e atualizam-se sozinhos.
        Os que marcaste como &ldquo;vou&rdquo; ficam com ✓ e um lembrete na véspera.
      </p>
      {token === undefined ? <p className="empty" style={{ margin: 0 }}><span className="spinner" aria-hidden="true" /> A carregar…</p>
        : !token ? (
          <button type="button" className="btn primary" style={{ alignSelf: "flex-start" }} onClick={() => criar()} disabled={busy}>{busy ? "A criar…" : "Criar o meu link"}</button>
        ) : (
          <>
            <div className="cal-sub-acoes">
              <a className="btn primary" href={webcal}>Adicionar ao iPhone / Mac</a>
              <a className="btn" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">Adicionar ao Google Calendar</a>
            </div>
            <div className="cal-sub-link">
              <label htmlFor="calLink" className="sr-only">Link do calendário</label>
              <input id="calLink" readOnly value={https} onFocus={(e) => e.currentTarget.select()} spellCheck={false} />
              <button type="button" className="btn" onClick={copiar}>Copiar</button>
            </div>
            <p className="hint" style={{ margin: 0 }}>O link é pessoal: não o partilhes. No Google Calendar, os eventos novos podem demorar algumas horas a aparecer.</p>
            {!armed
              ? <button type="button" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setArmed(true)}>Gerar um link novo</button>
              : <span className="tdf-conf"><span>O link atual deixa de funcionar.</span><button type="button" className="btn perigo" disabled={busy} onClick={() => criar(true)}>Gerar novo</button><button type="button" className="btn ghost" onClick={() => setArmed(false)}>Cancelar</button></span>}
          </>
        )}
      {msg && <p className="hint" role="status" style={{ margin: 0 }}>{msg}</p>}
    </section>
  );
}
