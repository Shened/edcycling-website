"use client";
import { useEffect, useRef } from "react";

// Curvas de nível como as do peito da camisola.
export default function Topo() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      const g = c.getContext("2d");
      if (!g) return;
      g.scale(dpr, dpr);
      const W = r.width, H = r.height;
      g.lineWidth = 1;
      const peaks: [number, number, number][] = [[W * 0.78, H * 0.35, 1], [W * 0.18, H * 1.05, 0.8], [W * 0.52, -H * 0.2, 0.7]];
      for (const [cx, cy, s] of peaks) {
        for (let k = 1; k < 16; k++) {
          const R = k * 22 * s;
          g.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) {
            const w = 1 + 0.18 * Math.sin(a * 3 + k * 0.7) + 0.08 * Math.sin(a * 7 - k);
            const x = cx + Math.cos(a) * R * w * 1.5, y = cy + Math.sin(a) * R * w * 0.8;
            if (a) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.strokeStyle = k % 5 === 0 ? "rgba(240,96,154,.55)" : "rgba(140,190,215,.28)";
          g.stroke();
        }
      }
    };
    draw();
    let t: ReturnType<typeof setTimeout>;
    const onR = () => { clearTimeout(t); t = setTimeout(draw, 150); };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return <canvas ref={ref} aria-hidden="true" />;
}
