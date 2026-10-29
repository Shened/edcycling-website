"use client";
import { useEffect, useRef, useState } from "react";

export interface Acao { label: string; onClick: () => void; perigo?: boolean }

// Botão ⋯ com uma lista curta de ações. Fecha com Esc, com clique fora ou ao escolher.
export default function MenuAcoes({ acoes, label, claro }: { acoes: Acao[]; label: string; claro?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const fora = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [open]);
  if (!acoes.length) return null;
  return (
    <div className="macoes" ref={box}>
      <button ref={btn} type="button" className={`ico-btn mac-btn${claro ? " claro" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></svg>
      </button>
      {open && (
        <div className="mac-menu" role="menu">
          {acoes.map((a) => (
            <button key={a.label} type="button" role="menuitem" className={a.perigo ? "perigo" : undefined} onClick={() => { setOpen(false); a.onClick(); }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
