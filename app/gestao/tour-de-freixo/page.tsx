import Link from "next/link";
import { Apagar, Formulario } from "@/components/tdf/admin/Formulario";
import { getSession } from "@/lib/session";
import { fmtDataEtapa, lerTour } from "@/lib/tdf";
import { adicionarCiclista, adicionarEtapa, criarEdicao, removerCiclista, removerEdicao, removerEtapa } from "./actions";

export default async function GestaoTour({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { ano } = await searchParams;
  const { supabase } = await getSession();
  const d = await lerTour(supabase, { ano });
  if (d.emFalta) return <div className="panel"><p className="empty" style={{ margin: 0 }}>Falta correr as migrations <b>017</b> e <b>018</b> no Supabase para gerir o Tour de Freixo.</p></div>;
  const ed = d.edicao;
  const comEdicoes = d.edicoes.length > 0;
  const proxima = (d.stages.at(-1)?.number ?? 0) + 1;
  const comRes = new Map<string, number>();
  for (const r of d.stageResults) comRes.set(r.stage_id, (comRes.get(r.stage_id) ?? 0) + 1);
  const inscritos = new Set(d.riders.map((r) => r.id));
  const outros = d.todosAtletas.filter((r) => !inscritos.has(r.id));
  const anoSeguinte = (d.edicoes.at(-1)?.ano ?? new Date().getFullYear()) + 1;
  const publica = ed && ed.ano !== d.anoPadrao ? `/tour-de-freixo?ano=${ed.ano}` : "/tour-de-freixo";
  const qs = (href: string) => (ed && ed.ano !== d.anoPadrao ? `${href}?ano=${ed.ano}` : href);

  return (
    <div className="view">
      <div className="sechead">
        <h3 className="adm-h">Tour de Freixo{ed ? ` ${ed.ano}` : ""}</h3>
        <Link href={publica} className="btn">Ver página pública</Link>
      </div>

      {!comEdicoes ? (
        <p className="notice" style={{ margin: 0 }}>Para criar edições de outros anos, corre a migration <b>019_tdf_edicoes.sql</b> no Supabase.</p>
      ) : (
        <section className="panel tdf-ed">
          <div className="tdf-ed-l">
            <span className="field-l">Edições</span>
            <nav className="tdf-ed-anos" aria-label="Escolher edição">
              {[...d.edicoes].reverse().map((e) => (
                <Link key={e.id} href={`/gestao/tour-de-freixo?ano=${e.ano}`} className="btn" aria-current={e.id === ed?.id ? "page" : undefined}>
                  {e.ano}<small>{e.etapas} et. · {e.atletas} atl.</small>
                </Link>
              ))}
            </nav>
          </div>
          <Formulario action={criarEdicao} botao="Criar edição" className="tdf-adm-f" limpar>
            <label className="field"><span className="field-l">Nova edição</span><input name="ano" type="number" min={2000} max={2100} defaultValue={anoSeguinte} required style={{ width: 100 }} /></label>
            <label className="field"><span className="field-l">Atletas</span>
              <select name="copiar" defaultValue={d.edicoes.at(-1)?.id ?? ""}>
                <option value="">Começar sem atletas</option>
                {[...d.edicoes].reverse().map((e) => <option key={e.id} value={e.id}>Copiar os de {e.ano}</option>)}
              </select>
            </label>
          </Formulario>
          {ed && ed.etapas === 0 && d.edicoes.length > 1 && (
            <div className="tdf-ed-apagar">
              <span className="hint">Esta edição ainda não tem etapas. Enquanto estiver vazia, a página pública continua a mostrar a edição anterior.</span>
              <Apagar action={removerEdicao.bind(null, ed.id)} rotulo={`Remover a edição de ${ed.ano}`} pergunta={`Apagar a edição de ${ed.ano}?`} />
            </div>
          )}
        </section>
      )}

      <div className="adm-cols">
        <section className="panel">
          <h4 className="tdf-adm-t">Etapas</h4>
          {d.stages.length === 0 ? <p className="empty" style={{ margin: 0 }}>Ainda sem etapas{ed ? ` em ${ed.ano}` : ""}.</p> : (
            <ul className="tdf-adm-lista">
              {d.stages.map((s) => (
                <li key={s.id}>
                  <Link href={qs(`/gestao/tour-de-freixo/etapas/${s.id}`)} className="tdf-adm-l">
                    <span className="tdf-etapa-n">E{s.number}</span>
                    <span><b>{s.name}</b><small>{[fmtDataEtapa(s.date), comRes.get(s.id) ? `${comRes.get(s.id)} resultados` : "sem resultados"].filter(Boolean).join(" · ")}</small></span>
                  </Link>
                  <Apagar action={removerEtapa.bind(null, s.id)} rotulo={`Remover etapa ${s.number}`} pergunta="Apaga também os resultados." />
                </li>
              ))}
            </ul>
          )}
          <Formulario action={adicionarEtapa} botao="Criar etapa" className="tdf-adm-f" limpar>
            {ed && <input type="hidden" name="edicao_id" value={ed.id} />}
            <label className="field"><span className="field-l">N.º</span><input name="number" type="number" min={1} defaultValue={proxima} required style={{ width: 80 }} /></label>
            <label className="field" style={{ flex: 1 }}><span className="field-l">Nome</span><input name="name" required placeholder="Ex: Alto do Freixo" /></label>
            <label className="field"><span className="field-l">Data</span><input name="date" type="date" /></label>
          </Formulario>
        </section>

        <section className="panel">
          <h4 className="tdf-adm-t">Atletas{ed ? ` em ${ed.ano}` : ""} <span className="muted">({d.riders.length})</span></h4>
          {d.riders.length === 0 ? <p className="empty" style={{ margin: 0 }}>Ainda sem atletas.</p> : (
            <ul className="tdf-adm-lista">
              {d.riders.map((r) => (
                <li key={r.id}>
                  <span className="tdf-adm-l"><span><b>{r.name}</b>{r.team && <small>{r.team}</small>}</span></span>
                  <Apagar
                    action={removerCiclista.bind(null, r.id, ed?.id)}
                    rotulo={`Remover ${r.name}`}
                    pergunta={ed ? `Tirar de ${ed.ano}? Apaga os resultados dele neste ano.` : "Apaga também os resultados."}
                  />
                </li>
              ))}
            </ul>
          )}
          {ed && outros.length > 0 && (
            <Formulario action={adicionarCiclista} botao="Inscrever" className="tdf-adm-f">
              <input type="hidden" name="edicao_id" value={ed.id} />
              <label className="field" style={{ flex: 1 }}><span className="field-l">Atleta de outras edições</span>
                <select name="rider_id" required>{outros.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </label>
            </Formulario>
          )}
          <Formulario action={adicionarCiclista} botao="Adicionar atleta novo" className="tdf-adm-f" limpar>
            {ed && <input type="hidden" name="edicao_id" value={ed.id} />}
            <label className="field" style={{ flex: 1 }}><span className="field-l">Nome</span><input name="name" required /></label>
            <label className="field" style={{ flex: 1 }}><span className="field-l">Equipa (opcional)</span><input name="team" /></label>
          </Formulario>
        </section>
      </div>
    </div>
  );
}
