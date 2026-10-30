"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_AVISO, type Canal, type Prefs, type TipoAviso } from "@/lib/notif-prefs";
import { testarAviso } from "@/lib/avisos";

type EstadoPush = "?" | "sem-suporte" | "ios-instalar" | "bloqueado" | "desligado" | "ligado" | "sem-chave";

function b64ToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registo(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

export default function Definicoes({ userId, email, inicial, vapid, emailAtivo, isAdmin = false }: { userId: string; email: string; inicial: Prefs; vapid: string; emailAtivo: boolean; isAdmin?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>(inicial);
  const [guardado, setGuardado] = useState<"" | "a guardar" | "guardado" | "erro">("");
  const [push, setPush] = useState<EstadoPush>("?");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!vapid) { setPush("sem-chave"); return; }
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setPush(ios && !standalone ? "ios-instalar" : "sem-suporte"); return; }
      if (Notification.permission === "denied") { setPush("bloqueado"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub ? "ligado" : "desligado");
    })().catch(() => setPush("sem-suporte"));
  }, [vapid]);

  async function ligar() {
    setBusy(true); setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPush(perm === "denied" ? "bloqueado" : "desligado"); setBusy(false); return; }
      const reg = await registo();
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapid) as BufferSource });
      const j = sub.toJSON();
      const { error } = await createClient().from("push_subscricoes").upsert(
        { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "", dispositivo: navigator.userAgent.slice(0, 200) },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
      setPush("ligado");
      setMsg("Notificações ativadas neste dispositivo.");
    } catch {
      setMsg("Não foi possível ativar. Se estás no iPhone, abre o site pela app instalada no ecrã principal.");
    }
    setBusy(false);
  }
  async function desligar() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await createClient().from("push_subscricoes").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
      setPush("desligado");
    } catch { setMsg("Não foi possível desativar."); }
    setBusy(false);
  }
  async function testar() {
    setBusy(true); setMsg("");
    const r = await testarAviso();
    setBusy(false);
    setMsg(r.erro ? r.erro : `Teste enviado: ${r.push} notificaç${r.push === 1 ? "ão" : "ões"} push${r.email ? " e 1 email" : ""}.`);
  }

  async function mudar(tipo: TipoAviso, canal: Canal, valor: boolean) {
    const novo = { ...prefs, [`${tipo}_${canal}`]: valor };
    setPrefs(novo); setGuardado("a guardar");
    const { error } = await createClient().from("preferencias_notif").upsert({ user_id: userId, ...novo, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setGuardado(error ? "erro" : "guardado");
  }

  const pushTxt: Record<EstadoPush, string> = {
    "?": "A verificar…",
    "sem-chave": "As notificações push ainda não estão configuradas no servidor.",
    "sem-suporte": "Este browser não suporta notificações push. Experimenta no Chrome (Android) ou na app instalada (iPhone).",
    "ios-instalar": "No iPhone, as notificações só funcionam na app instalada. Instala-a (Partilhar → Adicionar ao ecrã principal) e abre esta página a partir dela.",
    bloqueado: "Bloqueaste as notificações para este site. Ativa-as nas definições do browser ou do telemóvel e volta aqui.",
    desligado: "Ainda não ativaste as notificações neste dispositivo.",
    ligado: "Ativas neste dispositivo.",
  };

  return (
    <div className="defs-in">
      <div className="panel defs-push">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <span className="field-l">Notificações no telemóvel</span>
          <span className={push === "ligado" ? "ok-txt" : "empty"}>{pushTxt[push]}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {push === "desligado" && <button type="button" className="btn primary" disabled={busy} aria-busy={busy} onClick={ligar}>{busy ? <><span className="spinner" aria-hidden="true" />A ativar…</> : "Ativar neste dispositivo"}</button>}
          {push === "ligado" && <><button type="button" className="btn" disabled={busy} onClick={testar}>Enviar teste</button><button type="button" className="btn ghost danger" disabled={busy} onClick={desligar}>Desativar</button></>}
        </div>
        {msg && <p className="hint" style={{ margin: 0, flexBasis: "100%" }}>{msg}</p>}
      </div>

      <div className="panel">
        <div className="sechead" style={{ marginBottom: 6 }}>
          <span className="field-l">Que avisos queres receber</span>
          <span className="hint" aria-live="polite">{guardado === "a guardar" ? "A guardar…" : guardado === "guardado" ? "Guardado" : guardado === "erro" ? "Não foi possível guardar" : ""}</span>
        </div>
        <table className="prefs">
          <thead><tr><th></th><th className="c">Telemóvel</th><th className="c">Email</th></tr></thead>
          <tbody>
            {TIPOS_AVISO.filter((t) => isAdmin || !t.soAdmin).map((t) => (
              <tr key={t.k}>
                <td><b>{t.t}</b><span className="hint" style={{ display: "block" }}>{t.d}</span></td>
                {(["push", "email"] as Canal[]).map((c) => (
                  <td key={c} className="c">
                    <label className="sw-toggle">
                      <input type="checkbox" checked={prefs[`${t.k}_${c}`]} onChange={(e) => mudar(t.k, c, e.target.checked)} aria-label={`${t.t} por ${c === "push" ? "notificação" : "email"}`} />
                      <span aria-hidden="true" />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ margin: "10px 0 0" }}>
          Os emails vão para <b>{email}</b>.{!emailAtivo && " O envio de emails ainda não está configurado no servidor."}
        </p>
      </div>
    </div>
  );
}
