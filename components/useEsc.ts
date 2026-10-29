"use client";
import { useEffect } from "react";

// Fecha uma janela com a tecla Esc enquanto está aberta.
export function useEsc(ativo: boolean, fechar: () => void) {
  useEffect(() => {
    if (!ativo) return;
    const t = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [ativo, fechar]);
}
