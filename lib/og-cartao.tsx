import { ImageResponse } from "next/og";
import type { Cartao } from "./partilha";

export const OG_TAMANHO = { width: 1200, height: 630 };

// Imagem da pré-visualização (1200×630) com as cores da EDCycling.
export function imagemCartao(c: Cartao | null) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#052F42", color: "#fff", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 900, fontStyle: "italic", letterSpacing: -1 }}>
          ED<span style={{ color: "#F0609A" }}>CYCLING</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#F0609A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 3 }}>{c?.tipo ?? "Equipa de ciclismo"}</div>
          <div style={{ display: "flex", fontSize: (c?.titulo.length ?? 0) > 28 ? 64 : 84, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", lineHeight: 1 }}>{c?.titulo ?? "EDCycling"}</div>
          {c && <div style={{ display: "flex", fontSize: 36, color: "#CFE0E8" }}>📅 {c.quando}</div>}
          {c && (c.local || c.dist) && <div style={{ display: "flex", fontSize: 32, color: "#A9C4CF" }}>{[c.local ? `📍 ${c.local}` : null, c.dist ? `📏 ${c.dist}` : null].filter(Boolean).join("     ")}</div>}
        </div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, background: "linear-gradient(90deg,#316287,#8A6FA8 52%,#E3407A)" }} />
      </div>
    ),
    { ...OG_TAMANHO, emoji: "twemoji" },
  );
}
