import Link from "next/link";
import { Apagar, Formulario } from "@/components/tdf/admin/Formulario";
import { getSession } from "@/lib/session";
import { fmtDataEtapa, lerTour } from "@/lib/tdf";
import { adicionarCiclista, adicionarEtapa, removerCiclista, removerEtapa } from "./actions";

export default async function GestaoTour() {
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  if (d.emFalta) return <div className="panel"><p className="empty" style={{ margin: 0 }}>Falta correr as migrations <b>017</b> e <b>018</b> no Supabase para gerir o Tour de Freixo.</p></div>;
  const proxima = (d.stages.at(-1)?.number ?? 0) + 1;
  const comRes = new Map<string, number>();
  for (const r of d.stageResults) comRes.set(r.stage_id, (comRes.get(r.stage_id) ?? 0) + 1);

  return (
    <div className="view">
      <div className="sechead">
        <h3 className="adm-h">Tour de Freixo</h3>
        <Link href="/tour-de-freixo" className="btn">Ver página pública</Link>
      </div>
      <div className="adm-cols">
        <section className="panel">
          <h4 className="tdf-adm-t">Etapas</h4>
          {d.stages.length === 0 ? <p className="empty" style={{ margin: 0 }}>Ainda sem etapas.</p> : (
            <ul className="tdf-adm-lista">
              {d.stages.map((s) => (
                <li key={s.id}>
                  <Link href={`/gestao/tour-de-freixo/etapas/${s.id}`} className="tdf-adm-l">
                    <span className="tdf-etapa-n">E{s.number}</span>
                    <span><b>{s.name}</b><small>{[fmtDataEtapa(s.date), comRes.get(s.id) ? `${comRes.get(s.id)} resultados` : "sem resultados"].filter(Boolean).join(" · ")}</small></span>
                  </Link>
                  <Apagar action={removerEtapa.bind(null, s.id)} rotulo={`Remover etapa ${s.number}`} pergunta="Apaga também os resultados." />
                </li>
              ))}
            </ul>
          )}
          <Formulario action={adicionarEtapa} botao="Criar etapa" className="tdf-adm-f" limpar>
            <label className="field"><span className="field-l">N.º</span><input name="number" type="number" min={1} defaultValue={proxima} required style={{ width: 80 }} /></label>
            <label className="field" style={{ flex: 1 }}><span className="field-l">Nome</span><input name="name" required placeholder="Ex: Alto do Freixo" /></label>
            <label className="field"><span className="field-l">Data</span><input name="date" type="date" /></label>
          </Formulario>
        </section>

        <section className="panel">
          <h4 className="tdf-adm-t">Atletas <span className="muted">({d.riders.length})</span></h4>
          {d.riders.length === 0 ? <p className="empty" style={{ margin: 0 }}>Ainda sem atletas.</p> : (
            <ul className="tdf-adm-lista">
              {d.riders.map((r) => (
                <li key={r.id}>
                  <span className="tdf-adm-l"><span><b>{r.name}</b>{r.team && <small>{r.team}</small>}</span></span>
                  <Apagar action={removerCiclista.bind(null, r.id)} rotulo={`Remover ${r.name}`} pergunta="Apaga também os resultados." />
                </li>
              ))}
            </ul>
          )}
          <Formulario action={adicionarCiclista} botao="Adicionar atleta" className="tdf-adm-f" limpar>
            <label className="field" style={{ flex: 1 }}><span className="field-l">Nome</span><input name="name" required /></label>
            <label className="field" style={{ flex: 1 }}><span className="field-l">Equipa (opcional)</span><input name="team" /></label>
          </Formulario>
        </section>
      </div>
    </div>
  );
}
