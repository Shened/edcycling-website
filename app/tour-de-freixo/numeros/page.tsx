import Link from "next/link";
import Barras from "@/components/tdf/Barras";
import { Cartao, Falta } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { comAno, lerTour, velocidadeEtapa, type Etapa } from "@/lib/tdf";

export const metadata = { title: "Números · Tour de Freixo" };

const fmt = (v: number) => v.toLocaleString("pt-PT", { maximumFractionDigits: 1 });

function maior(etapas: Etapa[], val: (s: Etapa) => number | null) {
  let best: Etapa | null = null, bv = -Infinity;
  for (const s of etapas) { const v = val(s); if (v != null && v > bv) { bv = v; best = s; } }
  return best ? { etapa: best, valor: bv } : null;
}

export default async function TourNumeros({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { supabase } = await getSession();
  const { ano } = await searchParams;
  const d = await lerTour(supabase, { ano });
  if (d.emFalta) return <Falta />;
  const etapas = d.stages;
  const vel = new Map(etapas.map((s) => [s.id, velocidadeEtapa(d, s.id).media]));
  const km = etapas.reduce((a, s) => a + (s.distance_km ?? 0), 0);
  const dmais = etapas.reduce((a, s) => a + (s.elevation_gain_m ?? 0), 0);
  const todas = d.stageResults.filter((r) => r.status === "FINISHED" && r.avg_speed_kmh != null).map((r) => r.avg_speed_kmh as number);
  const velMedia = todas.length ? Math.round((todas.reduce((a, b) => a + b, 0) / todas.length) * 10) / 10 : null;

  const recordes = [
    { t: "Etapa mais longa", r: maior(etapas, (s) => s.distance_km), u: " km" },
    { t: "Mais elevação", r: maior(etapas, (s) => s.elevation_gain_m), u: " m" },
    { t: "Etapa mais rápida", r: maior(etapas, (s) => vel.get(s.id) ?? null), u: " km/h" },
    { t: "Inclinação mais dura", r: maior(etapas, (s) => s.max_gradient_pct), u: "%" },
  ];
  const serie = (val: (s: Etapa) => number | null) =>
    etapas.filter((s) => val(s) != null).map((s) => ({ label: `E${s.number}`, valor: val(s) as number }));

  return (
    <div className="tdf-corpo">
      <div className="tiles tdf-tiles">
        <div className="tile"><div className="v num">{etapas.length}</div><div className="k">etapas</div></div>
        <div className="tile"><div className="v num">{d.riders.length}</div><div className="k">atletas</div></div>
        <div className="tile"><div className="v num">{km ? fmt(km) : "—"}</div><div className="k">km totais</div></div>
        <div className="tile"><div className="v num">{dmais ? fmt(Math.round(dmais)) : "—"}</div><div className="k">m de D+ total</div></div>
        <div className="tile"><div className="v num">{velMedia != null ? fmt(velMedia) : "—"}</div><div className="k">km/h média geral</div></div>
      </div>

      <Cartao titulo="Recordes">
        <div className="tdf-rec">
          {recordes.map(({ t, r, u }) => (
            <div key={t} className="tdf-rec-c">
              <span className="eyebrow">{t}</span>
              <b className="num">{r ? `${fmt(r.valor)}${u}` : "—"}</b>
              {r ? <Link href={comAno(`/tour-de-freixo/etapas/${r.etapa.id}`, d)}>E{r.etapa.number} · {r.etapa.name}</Link> : <span className="muted">Sem dados ainda</span>}
            </div>
          ))}
        </div>
      </Cartao>

      <div className="tdf-2">
        <Cartao titulo="Distância (km)"><Barras titulo="Distância por etapa" unidade="km" dados={serie((s) => s.distance_km)} /></Cartao>
        <Cartao titulo="Elevação (m)"><Barras titulo="Elevação por etapa" unidade="m" dados={serie((s) => s.elevation_gain_m)} /></Cartao>
        <Cartao titulo="Velocidade média (km/h)"><Barras titulo="Velocidade média por etapa" unidade="km/h" dados={serie((s) => vel.get(s.id) ?? null)} /></Cartao>
        <Cartao titulo="Inclinação máxima (%)"><Barras titulo="Inclinação máxima por etapa" unidade="%" dados={serie((s) => s.max_gradient_pct)} /></Cartao>
      </div>
    </div>
  );
}
