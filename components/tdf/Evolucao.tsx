"use client";
import { useState } from "react";
import type { Evolucao as Ev } from "@/lib/tdf";

const CORES = ["#f9003d", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#eab308", "#ec4899", "#84cc16", "#6366f1", "#14b8a6", "#f97316"];

// Posição na Geral etapa a etapa. Toca num nome para o destacar.
export default function Evolucao({ series, pontos }: Ev) {
  const [foco, setFoco] = useState<string | null>(null);
  if (pontos.length < 2) return <p className="empty" style={{ margin: 0 }}>A evolução aparece aqui assim que houver pelo menos 2 etapas com resultados.</p>;

  const n = Math.max(1, ...pontos.map((p) => Object.keys(p.pos).length));
  const L = 34, R = 150, T = 14, B = 30, linha = 30;
  const W = 920, H = T + B + (n - 1) * linha;
  const x = (i: number) => L + (i * (W - L - R)) / (pontos.length - 1);
  const y = (pos: number) => T + (pos - 1) * linha;
  const ultimo = pontos[pontos.length - 1];

  return (
    <div className="tdf-evo">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Evolução das posições na classificação geral por etapa">
        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(i + 1)} y2={y(i + 1)} className="grid" />
            <text x={L - 10} y={y(i + 1) + 4} textAnchor="end" className="tick">{i + 1}</text>
          </g>
        ))}
        {pontos.map((p, i) => <text key={p.etapa} x={x(i)} y={H - 8} textAnchor="middle" className="tick">E{p.etapa}</text>)}
        {series.map((s, si) => {
          const pts = pontos.map((p, i) => (p.pos[s.id] ? [x(i), y(p.pos[s.id])] : null)).filter(Boolean) as number[][];
          if (!pts.length) return null;
          const cor = CORES[si % CORES.length];
          const dim = foco && foco !== s.id;
          const fim = ultimo.pos[s.id];
          return (
            <g key={s.id} style={{ opacity: dim ? 0.15 : 1, transition: "opacity .15s" }}>
              <polyline points={pts.map((q) => q.join(",")).join(" ")} fill="none" stroke={cor} strokeWidth={foco === s.id ? 3.5 : 2.2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={3.5} fill={cor} />)}
              {fim && (
                <text x={W - R + 10} y={y(fim) + 4} className="tdf-evo-n" fill={cor} onClick={() => setFoco(foco === s.id ? null : s.id)} style={{ cursor: "pointer" }}>
                  {s.nome}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="tdf-evo-leg" role="group" aria-label="Destacar atleta">
        {series.map((s, si) => (
          <button key={s.id} type="button" className="chip" aria-pressed={foco === s.id} onClick={() => setFoco(foco === s.id ? null : s.id)}>
            <span className="sw" style={{ background: CORES[si % CORES.length] }} aria-hidden="true" />{s.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
