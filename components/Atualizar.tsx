"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const app = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

// Na app instalada (PWA): puxar para baixo no topo da página atualiza os dados,
// e ao voltar à app depois de algum tempo os dados atualizam sozinhos.
export default function Atualizar() {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [puxar, setPuxar] = useState(0);
  const y0 = useRef<number | null>(null);
  const escondida = useRef<number | null>(null);
  const LIMITE = 70;

  const atualizar = () => start(() => router.refresh());

  // Voltar à app depois de 30 s fora: atualiza.
  useEffect(() => {
    const f = () => {
      if (document.visibilityState === "hidden") { escondida.current = Date.now(); return; }
      if (escondida.current && Date.now() - escondida.current > 30_000) atualizar();
      escondida.current = null;
    };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Puxar para atualizar (só na app instalada; no browser já existe o do próprio browser).
  useEffect(() => {
    if (!app()) return;
    const bloqueado = () => window.scrollY > 0 || !!document.querySelector(".overlay, [role=dialog]");
    const ini = (e: TouchEvent) => { y0.current = bloqueado() ? null : e.touches[0].clientY; };
    const mov = (e: TouchEvent) => {
      if (y0.current == null) return;
      const dy = e.touches[0].clientY - y0.current;
      if (dy <= 0 || window.scrollY > 0) { setPuxar(0); return; }
      setPuxar(Math.min(LIMITE * 1.4, dy * 0.5));
    };
    const fim = () => {
      if (y0.current != null && puxarRef.current >= LIMITE) atualizar();
      y0.current = null;
      setPuxar(0);
    };
    window.addEventListener("touchstart", ini, { passive: true });
    window.addEventListener("touchmove", mov, { passive: true });
    window.addEventListener("touchend", fim);
    window.addEventListener("touchcancel", fim);
    return () => {
      window.removeEventListener("touchstart", ini);
      window.removeEventListener("touchmove", mov);
      window.removeEventListener("touchend", fim);
      window.removeEventListener("touchcancel", fim);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const puxarRef = useRef(0);
  puxarRef.current = puxar;

  const visivel = pend || puxar > 8;
  const pronto = puxar >= LIMITE;
  return (
    <div className={`ptr${visivel ? " on" : ""}`} style={{ transform: `translate(-50%, ${pend ? 18 : Math.max(0, puxar - 30)}px)` }} aria-hidden={!pend}>
      <span className={`ptr-ic${pend ? " gira" : ""}`} style={!pend ? { transform: `rotate(${puxar * 4}deg)`, opacity: pronto ? 1 : 0.6 } : undefined}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
      </span>
      {pend && <span className="sr-only" role="status">A atualizar</span>}
    </div>
  );
}

// Botão de atualizar para a barra de topo (só aparece na app instalada, via CSS).
export function BotaoAtualizar() {
  const router = useRouter();
  const [pend, start] = useTransition();
  return (
    <button type="button" className="appbar-atualizar" aria-label="Atualizar" title="Atualizar" disabled={pend} onClick={() => start(() => router.refresh())}>
      <svg className={pend ? "gira" : undefined} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
    </button>
  );
}
