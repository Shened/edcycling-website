import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, Falta } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { fmtDataEtapa, fmtDif, fmtTempo, lerTour, MEDALHAS, pontosPosicao, velocidadeEtapa } from "@/lib/tdf";

export default async function TourEtapa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  if (d.emFalta) return <Falta />;
  const i = d.stages.findIndex((s) => s.id === id);
  if (i < 0) notFound();
  const st = d.stages[i];
  const ant = d.stages[i - 1], seg = d.stages[i + 1];
  const nome = new Map(d.riders.map((r) => [r.id, r.name]));
  const res = d.stageResults.filter((r) => r.stage_id === st.id);
  const term = res.filter((r) => r.status === "FINISHED").sort((a, b) => (a.time_seconds ?? 0) - (b.time_seconds ?? 0));
  const outros = [...res.filter((r) => r.status === "DNF"), ...res.filter((r) => r.status === "DNS")];
  const lider = term[0]?.time_seconds ?? 0;
  const vel = velocidadeEtapa(d, st.id);
  const metas = d.goals.filter((g) => g.stage_id === st.id).sort((a, b) => a.order_index - b.order_index);
  const fmt = (v: number | null, u = "") => (v == null ? "—" : `${v.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}${u}`);

  return (
    <div className="tdf-corpo">
      <div className="tdf-etapa-cab">
        <p className="eyebrow">Etapa {st.number}{st.date ? ` · ${fmtDataEtapa(st.date)}` : ""}</p>
        <h2>{st.name}</h2>
      </div>

      <div className="tiles">
        <div className="tile"><div className="v num">{fmt(st.distance_km)}</div><div className="k">km</div></div>
        <div className="tile"><div className="v num">{fmt(st.elevation_gain_m)}</div><div className="k">m de D+</div></div>
        <div className="tile"><div className="v num">{fmt(st.max_gradient_pct, "%")}</div><div className="k">inclinação máx.</div></div>
        <div className="tile"><div className="v num">{fmt(vel.media)}</div><div className="k">km/h média{vel.n ? ` (${vel.n})` : ""}</div></div>
      </div>

      <Cartao titulo="Classificação da etapa">
        {!res.length ? <p className="empty" style={{ margin: 0 }}>Ainda sem resultados.</p> : (
          <div className="tw">
            <table className="tdf-t">
              <tbody>
                {term.map((r, k) => (
                  <tr key={r.id} className={k === 0 ? "lider" : undefined}>
                    <td className="tdf-pos num">{MEDALHAS[k + 1] ?? k + 1}</td>
                    <td className="tdf-nome">{nome.get(r.rider_id) ?? "—"}</td>
                    <td className="r muted num">{r.avg_speed_kmh != null ? `${fmt(r.avg_speed_kmh)} km/h` : ""}</td>
                    <td className="r num">{k === 0 ? fmtTempo(r.time_seconds ?? 0) : fmtDif((r.time_seconds ?? 0) - lider)}</td>
                  </tr>
                ))}
                {outros.map((r) => (
                  <tr key={r.id} className="tdf-fora-l">
                    <td className="tdf-pos muted">—</td>
                    <td className="tdf-nome muted">{nome.get(r.rider_id) ?? "—"}</td>
                    <td />
                    <td className="r"><span className={`tdf-st ${r.status === "DNF" ? "dnf" : ""}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {metas.length > 0 && (
        <div className="tdf-2">
          {metas.map((g) => {
            const gr = d.goalResults.filter((x) => x.goal_id === g.id).sort((a, b) => a.position - b.position);
            return (
              <Cartao key={g.id} titulo={<><span aria-hidden="true">{g.type === "SPRINT" ? "🚩 " : "⛰️ "}</span>{g.name}<span className="sr-only"> ({g.type === "SPRINT" ? "sprint" : "montanha"})</span></>}>
                {!gr.length ? <p className="empty" style={{ margin: 0 }}>Sem resultados.</p> : (
                  <div className="tw">
                    <table className="tdf-t">
                      <tbody>
                        {gr.map((x) => (
                          <tr key={x.id}>
                            <td className="tdf-pos num">{x.position}</td>
                            <td className="tdf-nome">{nome.get(x.rider_id) ?? "—"}</td>
                            <td className="r num">{pontosPosicao(x.position)} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Cartao>
            );
          })}
        </div>
      )}

      <nav className="tdf-pag" aria-label="Outras etapas">
        {ant ? <Link href={`/tour-de-freixo/etapas/${ant.id}`} className="btn">← E{ant.number} · {ant.name}</Link> : <span />}
        {seg && <Link href={`/tour-de-freixo/etapas/${seg.id}`} className="btn">E{seg.number} · {seg.name} →</Link>}
      </nav>
    </div>
  );
}
