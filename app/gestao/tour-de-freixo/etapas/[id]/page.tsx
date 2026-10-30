import Link from "next/link";
import { notFound } from "next/navigation";
import { Apagar, Formulario } from "@/components/tdf/admin/Formulario";
import Resultados from "@/components/tdf/admin/Resultados";
import { getSession } from "@/lib/session";
import { fmtTempo, lerTour, POSICOES, pontosPosicao } from "@/lib/tdf";
import { adicionarMeta, adicionarResultadoMeta, guardarEtapa, removerMeta, removerResultadoMeta } from "../../actions";

export default async function GestaoEtapa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  const st = d.stages.find((s) => s.id === id);
  if (!st) notFound();
  const res = new Map(d.stageResults.filter((r) => r.stage_id === st.id).map((r) => [r.rider_id, r]));
  const dns = new Set([...res.values()].filter((r) => r.status === "DNS").map((r) => r.rider_id));
  const nome = new Map(d.riders.map((r) => [r.id, r.name]));
  const metas = d.goals.filter((g) => g.stage_id === st.id).sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="view">
      <div className="sechead">
        <h3 className="adm-h">E{st.number} · {st.name}</h3>
        <div className="adm-acoes">
          <Link href="/gestao/tour-de-freixo" className="btn">← Tour</Link>
          <Link href={`/tour-de-freixo/etapas/${st.id}`} className="btn">Ver pública</Link>
        </div>
      </div>

      <section className="panel tdf-adm-sec">
        <h4 className="tdf-adm-t">Dados da etapa</h4>
        <Formulario action={guardarEtapa} botao="Guardar" className="tdf-adm-f">
          <input type="hidden" name="id" value={st.id} />
          <label className="field"><span className="field-l">N.º</span><input name="number" type="number" min={1} defaultValue={st.number} required style={{ width: 80 }} /></label>
          <label className="field" style={{ flex: "1 1 220px" }}><span className="field-l">Nome</span><input name="name" defaultValue={st.name} required /></label>
          <label className="field"><span className="field-l">Data</span><input name="date" type="date" defaultValue={st.date ?? ""} /></label>
          <label className="field"><span className="field-l">Distância (km)</span><input name="distance_km" inputMode="decimal" defaultValue={st.distance_km ?? ""} style={{ width: 110 }} /></label>
          <label className="field"><span className="field-l">D+ (m)</span><input name="elevation_gain_m" inputMode="numeric" defaultValue={st.elevation_gain_m ?? ""} style={{ width: 110 }} /></label>
          <label className="field"><span className="field-l">Inclinação máx. (%)</span><input name="max_gradient_pct" inputMode="decimal" defaultValue={st.max_gradient_pct ?? ""} style={{ width: 110 }} /></label>
        </Formulario>
      </section>

      <section className="panel tdf-adm-sec">
        <h4 className="tdf-adm-t">Resultados</h4>
        <Resultados
          etapa={st.id}
          linhas={[...d.riders].sort((a, b) => a.name.localeCompare(b.name, "pt")).map((r) => {
            const x = res.get(r.id);
            return {
              id: r.id, nome: r.name, status: x?.status ?? "FINISHED",
              tempo: x?.status === "FINISHED" && x.time_seconds != null ? fmtTempo(x.time_seconds) : "",
              vel: x?.status === "FINISHED" && x.avg_speed_kmh != null ? String(x.avg_speed_kmh) : "",
            };
          })}
        />
      </section>

      <section className="panel tdf-adm-sec">
        <h4 className="tdf-adm-t">Metas volantes</h4>
        {metas.length === 0 && <p className="empty" style={{ margin: 0 }}>Sem metas volantes nesta etapa.</p>}
        {metas.map((g) => {
          const gr = d.goalResults.filter((x) => x.goal_id === g.id).sort((a, b) => a.position - b.position);
          const ocupadas = new Set(gr.map((x) => x.position));
          const ja = new Set(gr.map((x) => x.rider_id));
          const livres = [...d.riders].sort((a, b) => a.name.localeCompare(b.name, "pt")).filter((r) => !ja.has(r.id) && !dns.has(r.id));
          return (
            <div key={g.id} className="tdf-meta">
              <div className="tdf-meta-h">
                <b><span aria-hidden="true">{g.type === "SPRINT" ? "🚩" : "⛰️"}</span> {g.name} <span className="muted">· {g.type === "SPRINT" ? "Sprint" : "Montanha"}</span></b>
                <Apagar action={removerMeta.bind(null, st.id, g.id)} rotulo={`Remover meta ${g.name}`} />
              </div>
              {gr.length > 0 && (
                <ul className="tdf-adm-lista">
                  {gr.map((x) => (
                    <li key={x.id}>
                      <span className="tdf-adm-l"><span className="tdf-etapa-n">{x.position}.º</span><span><b>{nome.get(x.rider_id) ?? "—"}</b><small>{pontosPosicao(x.position)} pts</small></span></span>
                      <Apagar action={removerResultadoMeta.bind(null, st.id, x.id)} rotulo={`Remover ${nome.get(x.rider_id)} da meta`} />
                    </li>
                  ))}
                </ul>
              )}
              {livres.length === 0 ? <p className="hint" style={{ margin: 0 }}>Já pontuaram todos os atletas disponíveis (quem está em DNS não pontua).</p> : (
                <Formulario action={adicionarResultadoMeta} botao="Adicionar" className="tdf-adm-f">
                  <input type="hidden" name="stage_id" value={st.id} />
                  <input type="hidden" name="goal_id" value={g.id} />
                  <label className="field"><span className="field-l">Atleta</span>
                    <select name="rider_id" required>{livres.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                  </label>
                  <label className="field"><span className="field-l">Posição</span>
                    <select name="position" required defaultValue={POSICOES.find((p) => !ocupadas.has(p)) ?? 1}>
                      {POSICOES.map((p) => <option key={p} value={p}>{p}.º · {pontosPosicao(p)} pts{ocupadas.has(p) ? " (substitui)" : ""}</option>)}
                    </select>
                  </label>
                </Formulario>
              )}
            </div>
          );
        })}
        <Formulario action={adicionarMeta} botao="Adicionar meta" className="tdf-adm-f tdf-meta-nova" limpar>
          <input type="hidden" name="stage_id" value={st.id} />
          <label className="field"><span className="field-l">Tipo</span>
            <select name="type"><option value="SPRINT">Sprint</option><option value="MOUNTAIN">Montanha</option></select>
          </label>
          <label className="field" style={{ flex: 1 }}><span className="field-l">Nome da meta</span><input name="name" required placeholder="Ex: Alto do Freixo" /></label>
        </Formulario>
      </section>
    </div>
  );
}
