"use client";
import { useId } from "react";

// Desenho simples do traçado do GPX, com as cores da camisola.
export default function RoutePreview({ pontos }: { pontos: [number, number][] }) {
  const gid = "rg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (pontos.length < 2) return null;
  const lats = pontos.map((p) => p[0]);
  const lons = pontos.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const w = Math.max((maxLon - minLon) * k, 1e-6);
  const h = Math.max(maxLat - minLat, 1e-6);
  const W = 300, H = 150, pad = 10;
  const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
  const d = pontos
    .map(([la, lo], i) => `${i ? "L" : "M"}${(ox + (lo - minLon) * k * s).toFixed(1)},${(oy + (maxLat - la) * s).toFixed(1)}`)
    .join("");
  const [sx, sy] = d.slice(1).split("L")[0].split(",");
  return (
    <svg className="route" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Traçado do treino">
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--blue)" />
          <stop offset=".55" stopColor="var(--violet)" />
          <stop offset="1" stopColor="var(--pink)" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="4" fill="var(--surface)" stroke="var(--blue)" strokeWidth="2" />
    </svg>
  );
}
