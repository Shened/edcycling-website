"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Botão "Instalar app" (Android/Chrome) ou instruções (iPhone).
export default function InstalarApp() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [estado, setEstado] = useState<"?" | "instalada" | "ios" | "pronto" | "outro">("?");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) { setEstado("instalada"); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setEstado(ios ? "ios" : "outro");
    const on = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); setEstado("pronto"); };
    const done = () => setEstado("instalada");
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);

  async function instalar() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setEstado("instalada");
    setEvt(null);
  }

  if (estado === "?") return null;
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="field-l">App no telemóvel</span>
      {estado === "instalada" && <p className="empty" style={{ margin: 0 }}>Já estás a usar a app.</p>}
      {estado === "pronto" && (
        <>
          <p style={{ margin: 0 }}>Instala o site como app: abre com um toque no ecrã inicial, sem a barra do browser.</p>
          <button type="button" className="btn primary" style={{ alignSelf: "flex-start" }} onClick={instalar}>Instalar app</button>
        </>
      )}
      {estado === "ios" && (
        <p style={{ margin: 0 }}>No Safari, toca no botão <b>Partilhar</b> (o quadrado com a seta) e escolhe <b>Adicionar ao ecrã principal</b>.</p>
      )}
      {estado === "outro" && (
        <p className="empty" style={{ margin: 0 }}>No telemóvel, abre o menu do browser e escolhe <b>Instalar app</b> ou <b>Adicionar ao ecrã principal</b>.</p>
      )}
    </div>
  );
}
