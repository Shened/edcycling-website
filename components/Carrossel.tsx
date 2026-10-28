"use client";
import { useRef, useState } from "react";

// Carrossel de fotos ao estilo Instagram: desliza com o dedo, setas no computador.
export default function Carrossel({ urls, alt }: { urls: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  // Como no Instagram: o formato segue a primeira foto, entre 4:5 (vertical) e 1,91:1 (horizontal).
  const [ratio, setRatio] = useState(1);
  const n = urls.length;
  function go(k: number) {
    const el = ref.current;
    if (!el) return;
    const j = Math.max(0, Math.min(n - 1, k));
    el.scrollTo({ left: j * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return (
    <div className="car" style={{ ["--ratio" as string]: String(ratio) }} role="region" aria-roledescription="carrossel" aria-label={alt}>
      <div className="car-track" ref={ref} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}>
        {urls.map((u, k) => (
          <img key={u} src={u} alt={n > 1 ? `${alt} (${k + 1} de ${n})` : alt} loading={k === 0 ? "eager" : "lazy"} draggable={false}
            onLoad={k === 0 ? (e) => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setRatio(Math.min(1.91, Math.max(0.8, im.naturalWidth / im.naturalHeight))); } : undefined} />
        ))}
      </div>
      {n > 1 && (
        <>
          <span className="car-n num" aria-hidden="true">{i + 1}/{n}</span>
          <button type="button" className="car-btn prev" aria-label="Foto anterior" disabled={i === 0} onClick={() => go(i - 1)}>‹</button>
          <button type="button" className="car-btn next" aria-label="Foto seguinte" disabled={i === n - 1} onClick={() => go(i + 1)}>›</button>
          <div className="car-dots" aria-hidden="true">{urls.map((u, k) => <span key={u} className={k === i ? "on" : ""} />)}</div>
        </>
      )}
    </div>
  );
}
