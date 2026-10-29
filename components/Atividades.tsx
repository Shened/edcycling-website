"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import { fmtDuracao, fmtKm } from "@/lib/gpx";
import type { Atividade } from "@/lib/types";
import { CICLISMO_ATV, TIPOS_ATIVIDADE } from "@/lib/atividades";
import AtividadeForm from "./AtividadeForm";
import MenuAcoes from "./MenuAcoes";
import RoutePreview from "./RoutePreview";
import { useEsc } from "./useEsc";

const CICLISMO = CICLISMO_ATV;

function ritmo(tipo: string, km: number, s: number) {
  if (tipo === "corrida" || tipo === "caminhada") { const p = s / km; return { v: `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`, u: "min/km", k: "Ritmo" }; }
  if (tipo === "natacao") { const p = s / (km * 10); return { v: `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`, u: "min/100 m", k: "Ritmo" }; }
  return { v: (km / (s / 3600)).toLocaleString("pt-PT", { maximumFractionDigits: 1 }), u: "km/h", k: "Velocidade" };
}

const ICON: Record<string, React.ReactNode> = {
  bike: <><circle cx="5.5" cy="17" r="3.5" /><circle cx="18.5" cy="17" r="3.5" /><path d="M5.5 17 9 9h6l3.5 8M9 9 7.5 6H5M15 9l-3 8" /></>,
  corrida: <><circle cx="14" cy="4.5" r="2" /><path d="m6 21 4-6 3 2 1-5 4 2M10 9l3-2 2 3" /></>,
  natacao: <><path d="M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><circle cx="16" cy="7" r="2" /><path d="m7 13 4-4 3 3" /></>,
  outro: <path d="M3 17l5-6 4 4 4-7 5 9" />,
};
const iconDe = (t: string) => (CICLISMO.includes(t) ? ICON.bike : t === "corrida" || t === "caminhada" ? ICON.corrida : t === "natacao" ? ICON.natacao : ICON.outro);

interface Props { atividades: Atividade[]; userId: string; meuId: string; isAdmin: boolean; nome: string }

// Atividades pessoais no perfil, ao estilo Strava.
export default function Atividades({ atividades, userId, meuId, isAdmin, nome }: Props) {
  const router = useRouter();
  const meu = userId === meuId;
  const [form, setForm] = useState<Atividade | null | undefined>(undefined);
  const [apagar, setApagar] = useState<Atividade | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mostra, setMostra] = useState(10);
  const fecharApagar = useCallback(() => { if (!busy) setApagar(null); }, [busy]);
  useEsc(!!apagar, fecharApagar);

  const ano = new Date().getFullYear();
  const doAno = atividades.filter((a) => a.data.startsWith(String(ano)));
  const kmBike = doAno.filter((a) => CICLISMO.includes(a.tipo)).reduce((s, a) => s + Number(a.km ?? 0), 0);
  const kmPe = doAno.filter((a) => a.tipo === "corrida" || a.tipo === "caminhada").reduce((s, a) => s + Number(a.km ?? 0), 0);
  const tempo = doAno.reduce((s, a) => s + (a.duracao_s ?? 0), 0);
  const dmais = doAno.reduce((s, a) => s + (a.dmais ?? 0), 0);

  async function confirmarApagar() {
    if (!apagar) return;
    setBusy(true); setErr("");
    const sb = createClient();
    const { error } = await sb.from("atividades").delete().eq("id", apagar.id);
    if (!error && apagar.gpx_path) await sb.storage.from("gpx").remove([apagar.gpx_path]);
    setBusy(false);
    if (error) { setErr("Não foi possível apagar a atividade."); return; }
    setApagar(null);
    router.refresh();
  }

  return (
    <section className="atv" id="atividades" aria-labelledby="atvH">
      <div className="atv-cab">
        <h2 id="atvH">Atividades</h2>
        {meu && <button className="btn primary" onClick={() => setForm(null)}>+ Adicionar atividade</button>}
      </div>

      {doAno.length > 0 && (
        <div className="tiles atv-tot" aria-label={`Totais de ${ano}`}>
          <div className="tile"><div className="v num">{doAno.length}</div><div className="k">atividades em {ano}</div></div>
          {kmBike > 0 && <div className="tile"><div className="v num">{fmtKm(kmBike)}</div><div className="k">km de bicicleta</div></div>}
          {kmPe > 0 && <div className="tile"><div className="v num">{fmtKm(kmPe)}</div><div className="k">km a correr ou a pé</div></div>}
          {tempo > 0 && <div className="tile"><div className="v num">{fmtDuracao(tempo)}</div><div className="k">de movimento</div></div>}
          {dmais > 0 && <div className="tile"><div className="v num">{dmais.toLocaleString("pt-PT")}</div><div className="k">m de D+</div></div>}
        </div>
      )}
      {err && <div className="notice" role="alert">{err}</div>}

      {!atividades.length ? (
        <div className="atv-vazio">
          {meu
            ? <><p>Ainda não tens atividades. Carrega o GPX de uma volta (do Strava, Garmin ou Komoot) ou regista-a à mão.</p><button className="btn" onClick={() => setForm(null)}>Adicionar a primeira</button></>
            : <p>{nome.split(" ")[0]} ainda não registou atividades.</p>}
        </div>
      ) : (
        <ol className="atv-lista">
          {atividades.slice(0, mostra).map((a) => {
            const km = Number(a.km ?? 0);
            const r = km > 0 && a.duracao_s ? ritmo(a.tipo, km, a.duracao_s) : null;
            const acoes = [
              ...(meu ? [{ label: "Editar", onClick: () => setForm(a) }] : []),
              ...(meu || isAdmin ? [{ label: "Apagar…", onClick: () => setApagar(a), perigo: true }] : []),
            ];
            return (
              <li key={a.id} className="atv-c">
                <div className="atv-top">
                  <span className="atv-ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{iconDe(a.tipo)}</svg></span>
                  <div className="atv-t">
                    <h3>{a.titulo}</h3>
                    <p suppressHydrationWarning>{fmtDate(a.data, { weekday: "long", day: "numeric", month: "long", year: a.data.startsWith(String(ano)) ? undefined : "numeric" })}{a.hora ? ` às ${a.hora.slice(0, 5)}` : ""}, {(TIPOS_ATIVIDADE[a.tipo] ?? "Atividade").toLowerCase()}{a.privada ? <span className="atv-priv">, só tu vês</span> : null}</p>
                  </div>
                  <MenuAcoes acoes={acoes} label={`Ações para ${a.titulo}`} />
                </div>
                <dl className="atv-st">
                  {km > 0 && <div><dt>Distância</dt><dd>{fmtKm(km)}<small> km</small></dd></div>}
                  {a.dmais != null && a.dmais > 0 && <div><dt>Desnível</dt><dd>{a.dmais.toLocaleString("pt-PT")}<small> m</small></dd></div>}
                  {a.duracao_s ? <div><dt>Tempo</dt><dd>{fmtDuracao(a.duracao_s)}</dd></div> : null}
                  {r && <div><dt>{r.k}</dt><dd>{r.v}<small> {r.u}</small></dd></div>}
                </dl>
                {a.trajeto && a.trajeto.length > 1 && <RoutePreview pontos={a.trajeto} />}
                {a.notas && <p className="atv-notas">{a.notas}</p>}
              </li>
            );
          })}
        </ol>
      )}
      {atividades.length > mostra && <button className="btn" style={{ alignSelf: "center" }} onClick={() => setMostra((m) => m + 10)}>Ver mais atividades</button>}

      {form !== undefined && <AtividadeForm userId={meuId} atividade={form} onClose={() => setForm(undefined)} />}
      {apagar && (
        <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && fecharApagar()}>
          <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="apT" aria-describedby="apD">
            <div className="mbody">
              <h3 id="apT">Apagar esta atividade?</h3>
              <p id="apD" className="empty" style={{ margin: 0 }}>{apagar.titulo}. O GPX também é apagado e não se pode recuperar.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn ghost" onClick={fecharApagar} disabled={busy} autoFocus>Cancelar</button>
                <button className="btn perigo" onClick={confirmarApagar} disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A apagar…</> : "Apagar atividade"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
