"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseDate } from "@/lib/dates";
import { fmtDuracao, fmtKm, parseGpx } from "@/lib/gpx";
import type { FitInfo } from "@/lib/fit";
import type { Atividade } from "@/lib/types";
import { TIPOS_ATIVIDADE } from "@/lib/atividades";
import RoutePreview from "./RoutePreview";
import ImportarStrava from "./ImportarStrava";
import { useEsc } from "./useEsc";
import { marcar } from "@/lib/metricas";

const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// Adicionar ou editar uma atividade pessoal: a partir de um GPX ou à mão.
export default function AtividadeForm({ userId, atividade, dataInicial, onClose }: { userId: string; atividade?: Atividade | null; dataInicial?: string; onClose: () => void }) {
  const router = useRouter();
  const a = atividade ?? null;
  const [f, setF] = useState({
    titulo: a?.titulo ?? "",
    tipo: a?.tipo ?? "estrada",
    data: a?.data ?? (dataInicial && dataInicial <= hojeISO() ? dataInicial : hojeISO()),
    hora: a?.hora ?? "",
    km: a?.km != null ? String(a.km) : "",
    dmais: a?.dmais != null ? String(a.dmais) : "",
    h: a?.duracao_s ? String(Math.floor(a.duracao_s / 3600)) : "",
    min: a?.duracao_s ? String(Math.round((a.duracao_s % 3600) / 60)) : "",
    notas: a?.notas ?? "",
    privada: a?.privada ?? false,
  });
  const [gpx, setGpx] = useState<(Omit<FitInfo, "tipo" | "hora"> & { tipo?: string | null; hora?: string | null }) | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [modo, setModo] = useState<"form" | "strava">("form");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const fechar = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEsc(true, fechar);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > 20 * 1024 * 1024) { setErr("O ficheiro é demasiado grande (máx. 20 MB)."); return; }
    const ehFit = /\.fit$/i.test(file.name);
    try {
      const info = ehFit ? (await import("@/lib/fit")).parseFit(await file.arrayBuffer()) : parseGpx(await file.text());
      setGpx(info); setGpxFile(file);
      setF((p) => ({
        ...p,
        titulo: p.titulo || info.nome || "",
        tipo: ("tipo" in info && typeof info.tipo === "string") ? info.tipo : p.tipo,
        data: info.inicio ?? p.data,
        hora: info.hora ?? p.hora,
        km: String(info.km),
        dmais: String(info.dmais),
        h: info.duracaoS ? String(Math.floor(info.duracaoS / 3600)) : p.h,
        min: info.duracaoS ? String(Math.round((info.duracaoS % 3600) / 60)) : p.min,
      }));
    } catch {
      setErr(ehFit ? "Não consegui ler esse ficheiro .fit. Confirma que é o ficheiro original da atividade (Garmin Connect: ⚙ e Exportar original)." : "Não consegui ler esse ficheiro. Confirma que é um .gpx exportado do Strava, Garmin ou Komoot.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const km = f.km ? Number(f.km.replace(",", ".")) : null;
    const dur = (Number(f.h) || 0) * 3600 + (Number(f.min) || 0) * 60;
    if (km == null && !dur && !gpx && !a?.trajeto) { setErr("Indica pelo menos a distância ou a duração, ou carrega um GPX."); return; }
    if (km != null && (!Number.isFinite(km) || km < 0 || km > 2000)) { setErr("A distância não parece certa. Escreve os km, por exemplo 42,5."); return; }
    setBusy(true); setErr("");
    const sb = createClient();
    let novo: string | null = null;
    if (gpxFile && gpx) {
      const fit = /\.fit$/i.test(gpxFile.name);
      novo = `${userId}/${crypto.randomUUID()}.${fit ? "fit" : "gpx"}`;
      const up = await sb.storage.from("gpx").upload(novo, gpxFile, { contentType: fit ? "application/vnd.ant.fit" : "application/gpx+xml" });
      if (up.error) { setBusy(false); setErr("Não foi possível enviar o ficheiro. Tenta outra vez."); return; }
    }
    const body = {
      titulo: f.titulo.trim().slice(0, 80) || `${TIPOS_ATIVIDADE[f.tipo] ?? "Atividade"} de ${(parseDate(f.data) ?? new Date()).toLocaleDateString("pt-PT", { weekday: "long" })}`,
      tipo: f.tipo,
      data: f.data,
      hora: f.hora || null,
      km: km != null ? Math.round(km * 100) / 100 : null,
      dmais: f.dmais ? Math.max(0, Math.round(Number(f.dmais))) : null,
      duracao_s: dur || null,
      notas: f.notas.trim() || null,
      privada: f.privada,
      updated_at: new Date().toISOString(),
      ...(gpx && novo ? { gpx_path: novo, trajeto: gpx.pontos.length > 1 ? gpx.pontos : null } : {}),
    };
    const res = a ? await sb.from("atividades").update(body).eq("id", a.id) : await sb.from("atividades").insert(body);
    if (res.error) {
      if (novo) await sb.storage.from("gpx").remove([novo]);
      setBusy(false);
      setErr("Não foi possível guardar a atividade. Tenta outra vez.");
      return;
    }
    if (novo && a?.gpx_path) await sb.storage.from("gpx").remove([a.gpx_path]);
    if (!a) marcar("Atividade registada", { fonte: gpxFile ? (/\.fit$/i.test(gpxFile.name) ? "fit" : "gpx") : "manual", tipo: f.tipo, privada: f.privada });
    onClose();
    router.refresh();
  }

  const pontos = gpx?.pontos ?? a?.trajeto ?? null;
  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && fechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="atvT">
        <div className="stripe" />
        {modo === "strava" ? (
          <div className="mbody"><ImportarStrava onVoltar={() => setModo("form")} onFeito={() => { onClose(); router.refresh(); }} /></div>
        ) : (
        <form className="mbody" onSubmit={save}>
          <h3 id="atvT">{a ? "Editar atividade" : "Nova atividade"}</h3>

          {!a && (
            <button type="button" className="stv-entrada" onClick={() => setModo("strava")}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M15.4 17.9 13.3 13.7h-3.1l5.2 10.3 5.2-10.3h-3.1zM10.3 2 3.3 15.7h4.1l2.9-5.6 2.9 5.6h4.1z" /></svg>
              <span><b>Importar do Strava</b><span>Escolhe as tuas últimas atividades, sem ficheiros.</span></span>
            </button>
          )}
          <label className="atv-gpx">
            <input type="file" accept=".gpx,.fit,application/gpx+xml" onChange={pick} />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
            <span><b>{gpx ? "Ficheiro carregado" : a?.gpx_path ? "Substituir o ficheiro" : "Carregar ficheiro GPX ou FIT"}</b><span>{gpx ? `${fmtKm(gpx.km)} km${gpx.duracaoS ? `, ${fmtDuracao(gpx.duracaoS)}` : ""}${gpx.dmais ? `, ${gpx.dmais} m D+` : ""}` : "GPX do Strava ou Komoot, ou o .fit original do relógio (funciona para natação em piscina). Também podes registar à mão."}</span></span>
          </label>
          {pontos && pontos.length > 1 && <RoutePreview pontos={pontos} />}

          <div className="fgrid">
            <div className="field full"><label htmlFor="atvTit">Título</label><input id="atvTit" name="titulo" maxLength={80} autoComplete="off" placeholder="Ex.: Volta à Serra da Freita…" value={f.titulo} onChange={set("titulo")} /></div>
            <div className="field"><label htmlFor="atvTipo">Tipo</label>
              <select id="atvTipo" value={f.tipo} onChange={set("tipo")}>
                {Object.entries(TIPOS_ATIVIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="atvData">Data</label><input id="atvData" type="date" required max={hojeISO()} value={f.data} onChange={set("data")} /></div>
            <div className="field"><label htmlFor="atvHora">Hora de início</label><input id="atvHora" type="time" value={f.hora} onChange={set("hora")} /></div>
            <div className="field"><label htmlFor="atvKm">Distância (km)</label><input id="atvKm" inputMode="decimal" autoComplete="off" placeholder="Ex.: 62,4…" value={f.km} onChange={set("km")} /></div>
            <div className="field"><label htmlFor="atvD">Desnível (m)</label><input id="atvD" type="number" inputMode="numeric" min={0} autoComplete="off" placeholder="Ex.: 850…" value={f.dmais} onChange={set("dmais")} /></div>
            <div className="field"><span className="atv-lab" id="atvDurL">Duração</span>
              <span className="atv-dur" role="group" aria-labelledby="atvDurL">
                <input aria-label="Horas" type="number" inputMode="numeric" min={0} max={99} placeholder="h" value={f.h} onChange={set("h")} /><span aria-hidden="true">h</span>
                <input aria-label="Minutos" type="number" inputMode="numeric" min={0} max={59} placeholder="min" value={f.min} onChange={set("min")} /><span aria-hidden="true">min</span>
              </span>
            </div>
            <div className="field full"><label htmlFor="atvN">Notas</label><textarea id="atvN" rows={3} maxLength={2000} placeholder="Como correu? Sensações, vento, paragens…" value={f.notas} onChange={set("notas")} /></div>
            <label className="check check-big full"><input type="checkbox" checked={f.privada} onChange={set("privada")} /><span>Só eu vejo esta atividade</span></label>
          </div>

          {err && <div className="notice" role="alert">{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn ghost" onClick={fechar} disabled={busy}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : a ? "Guardar alterações" : "Guardar atividade"}</button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
