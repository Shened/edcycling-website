"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDuracao, fmtKm, parseGpx } from "@/lib/gpx";
import { TIPOS_ATIVIDADE } from "@/lib/atividades";
import { ehDesporto, type Evento } from "@/lib/types";
import RoutePreview from "./RoutePreview";
import { useEsc } from "./useEsc";
import { marcar } from "@/lib/metricas";

interface Percurso { km: number | null; dmais: number | null; duracao_s: number | null; trajeto: [number, number][] | null }
interface AtvOpcao { id: string; titulo: string; tipo: string; hora: string | null; km: number | null; dmais: number | null; duracao_s: number | null; trajeto: [number, number][] | null; strava_id?: number | null; perfis: { nome: string | null } | null }

// Dar um evento como terminado: o percurso vem da atividade de quem foi, de um GPX/FIT ou é escrito à mão.
// Os km ficam no evento e passam a contar para os totais da equipa.
export default function TerminarEvento({ evento: e, quemFoi, userId, onClose, onFeito }: {
  evento: Evento; quemFoi: string[]; userId: string; onClose: () => void; onFeito?: () => void;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"atividade" | "ficheiro" | "mao">("atividade");
  const [atvs, setAtvs] = useState<AtvOpcao[] | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [ficheiro, setFicheiro] = useState<{ file: File; p: Percurso } | null>(null);
  const [mao, setMao] = useState({ km: e.km != null ? String(e.km) : "", dmais: e.dmais != null ? String(e.dmais) : "", h: "", min: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fechar = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEsc(true, fechar);

  // Atividades desse dia de quem disse que ia (ou esteve presente).
  useEffect(() => {
    if (!e.data) { setAtvs([]); setModo("mao"); return; }
    (async () => {
      let q = createClient().from("atividades")
        .select("id,titulo,tipo,hora,km,dmais,duracao_s,trajeto,strava_id,perfis!atividades_user_id_fkey(nome)")
        .eq("data", e.data!).order("km", { ascending: false, nullsFirst: false });
      if (quemFoi.length) q = q.in("user_id", quemFoi);
      const { data } = await q;
      const lista = (data ?? []) as unknown as AtvOpcao[];
      setAtvs(lista);
      if (!lista.length) setModo("ficheiro");
      else setEscolhida(lista[0].id);
    })();
  }, [e.data, quemFoi]);

  async function escolherFicheiro(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setErr("");
    try {
      const fit = /\.fit$/i.test(file.name);
      const info = fit ? (await import("@/lib/fit")).parseFit(await file.arrayBuffer()) : parseGpx(await file.text());
      setFicheiro({ file, p: { km: info.km, dmais: info.dmais, duracao_s: info.duracaoS ?? null, trajeto: info.pontos.length > 1 ? info.pontos : null } });
    } catch {
      setErr("Não consegui ler esse ficheiro. Usa o .gpx ou o .fit original da atividade.");
    }
  }

  function percurso(): Percurso | null {
    if (modo === "atividade") {
      const a = atvs?.find((x) => x.id === escolhida);
      return a ? { km: a.km != null ? Number(a.km) : null, dmais: a.dmais, duracao_s: a.duracao_s, trajeto: a.trajeto } : null;
    }
    if (modo === "ficheiro") return ficheiro?.p ?? null;
    const km = mao.km ? Number(mao.km.replace(",", ".")) : null;
    const dur = (Number(mao.h) || 0) * 3600 + (Number(mao.min) || 0) * 60;
    if (km != null && (!Number.isFinite(km) || km < 0 || km > 2000)) return null;
    return { km, dmais: mao.dmais ? Math.max(0, Math.round(Number(mao.dmais))) : null, duracao_s: dur || null, trajeto: null };
  }

  const desporto = ehDesporto(e);
  async function guardar() {
    if (!desporto) {
      setBusy(true); setErr("");
      const { error } = await createClient().from("eventos").update({ estado: "realizado", updated_at: new Date().toISOString() }).eq("id", e.id);
      setBusy(false);
      if (error) { setErr("Não foi possível guardar."); return; }
      marcar("Evento terminado", { fonte: "sem-desporto" });
      onClose(); onFeito?.(); router.refresh();
      return;
    }
    const p = percurso();
    if (!p || p.km == null) { setErr(modo === "mao" ? "Indica os km do evento (ex.: 62,4)." : "Escolhe uma atividade ou carrega um ficheiro."); return; }
    setBusy(true); setErr("");
    const sb = createClient();
    let gpx_path: string | null = null;
    if (modo === "ficheiro" && ficheiro) {
      const fit = /\.fit$/i.test(ficheiro.file.name);
      gpx_path = `${userId}/evento-${e.id}-${Date.now()}.${fit ? "fit" : "gpx"}`;
      const up = await sb.storage.from("gpx").upload(gpx_path, ficheiro.file, { contentType: fit ? "application/vnd.ant.fit" : "application/gpx+xml" });
      if (up.error) { setBusy(false); setErr("Não foi possível enviar o ficheiro."); return; }
    }
    const { error } = await sb.from("eventos").update({
      estado: "realizado",
      km: Math.round(p.km * 100) / 100,
      dmais: p.dmais,
      duracao_s: p.duracao_s,
      trajeto: p.trajeto,
      ...(gpx_path ? { gpx_path } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", e.id);
    setBusy(false);
    if (error) {
      if (gpx_path) await sb.storage.from("gpx").remove([gpx_path]);
      setErr(/duracao_s|trajeto|gpx_path/.test(error.message) ? "Falta correr a migration 026 no Supabase." : "Não foi possível guardar.");
      return;
    }
    marcar("Evento terminado", { fonte: modo });
    onClose();
    onFeito?.();
    router.refresh();
  }

  const p = percurso();
  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && fechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="terT">
        <div className="stripe" />
        <div className="mbody">
          <div>
            <p className="eyebrow" style={{ color: "var(--muted)" }}>Dar como terminado</p>
            <h3 id="terT">{e.titulo}</h3>
            <p className="hint" style={{ margin: "4px 0 0" }}>{desporto ? "Conta como treino: os km passam a contar para os totais da equipa." : "Evento não desportivo: fica como realizado, sem km nem treino nos números."}</p>
          </div>

          {desporto && <><div className="tabseg ter-modos" role="tablist" aria-label="De onde vem o percurso">
            {([["atividade", "Atividade de quem foi"], ["ficheiro", "GPX ou FIT"], ["mao", "À mão"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={modo === k} onClick={() => { setModo(k); setErr(""); }}>{l}</button>
            ))}
          </div>

          {modo === "atividade" && (
            atvs === null ? <p className="empty" style={{ margin: 0 }}><span className="spinner" aria-hidden="true" /> A procurar atividades…</p>
            : !atvs.length ? <p className="empty" style={{ margin: 0 }}>Ninguém que foi tem atividades registadas nesse dia. Carrega o GPX ou escreve os km à mão.</p>
            : (
              <ul className="ter-lista" role="radiogroup" aria-label="Atividades do dia">
                {atvs.map((a) => (
                  <li key={a.id}>
                    <label className={`ter-item${escolhida === a.id ? " on" : ""}`}>
                      <input type="radio" name="ter-atv" checked={escolhida === a.id} onChange={() => setEscolhida(a.id)} />
                      <span className="ter-t">
                        <b>{a.perfis?.nome ?? "Atleta"} · {a.titulo}</b>
                        <span>{[TIPOS_ATIVIDADE[a.tipo] ?? a.tipo, a.hora ? a.hora.slice(0, 5) : null, a.strava_id ? "Strava" : null].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="ter-n num">{a.km != null ? `${fmtKm(Number(a.km))} km` : "—"}<small>{a.duracao_s ? fmtDuracao(a.duracao_s) : ""}</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            )
          )}

          {modo === "ficheiro" && (
            <label className="atv-gpx">
              <input type="file" accept=".gpx,.fit,application/gpx+xml" onChange={escolherFicheiro} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
              <span><b>{ficheiro ? ficheiro.file.name : "Carregar GPX ou FIT do evento"}</b><span>{ficheiro ? `${fmtKm(ficheiro.p.km ?? 0)} km${ficheiro.p.dmais ? ` · ${ficheiro.p.dmais} m D+` : ""}${ficheiro.p.duracao_s ? ` · ${fmtDuracao(ficheiro.p.duracao_s)}` : ""}` : "Do Strava, Garmin ou Komoot."}</span></span>
            </label>
          )}

          {modo === "mao" && (
            <div className="fgrid">
              <div className="field"><label htmlFor="terKm">Distância (km)</label><input id="terKm" inputMode="decimal" placeholder="ex.: 62,4…" value={mao.km} onChange={(ev) => setMao({ ...mao, km: ev.target.value })} /></div>
              <div className="field"><label htmlFor="terD">Desnível (m)</label><input id="terD" type="number" min={0} inputMode="numeric" value={mao.dmais} onChange={(ev) => setMao({ ...mao, dmais: ev.target.value })} /></div>
              <div className="field"><span className="atv-lab" id="terDurL">Duração (opcional)</span>
                <span className="atv-dur" role="group" aria-labelledby="terDurL">
                  <input aria-label="Horas" type="number" min={0} max={99} placeholder="h" value={mao.h} onChange={(ev) => setMao({ ...mao, h: ev.target.value })} /><span aria-hidden="true">h</span>
                  <input aria-label="Minutos" type="number" min={0} max={59} placeholder="min" value={mao.min} onChange={(ev) => setMao({ ...mao, min: ev.target.value })} /><span aria-hidden="true">min</span>
                </span>
              </div>
            </div>
          )}

          {p?.trajeto && p.trajeto.length > 1 && <RoutePreview pontos={p.trajeto} />}</>}
          {err && <div className="notice" role="alert">{err}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn ghost" onClick={fechar} disabled={busy}>Cancelar</button>
            <button type="button" className="btn primary" onClick={guardar} disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : "Dar como terminado"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
