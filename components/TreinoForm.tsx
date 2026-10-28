"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDuracao, fmtKm, parseGpx, type GpxInfo } from "@/lib/gpx";
import { fmtDate } from "@/lib/dates";
import type { EstadoInscricao, Membro, Treino } from "@/lib/types";
import RoutePreview from "./RoutePreview";
import PresencasEditor from "./PresencasEditor";

export const TIPOS_TREINO: Record<string, string> = { estrada: "Estrada", gravel: "Gravel", btt: "BTT", rolo: "Rolo", corrida: "Corrida", natacao: "Natação" };
export const CICLISMO = ["estrada", "gravel", "btt", "rolo"];

/** Velocidade média na unidade habitual de cada desporto. */
export function ritmo(tipo: string, km: number, s: number): { v: string; u: string } {
  if (tipo === "corrida") { const p = s / km; return { v: `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`, u: "min/km" }; }
  if (tipo === "natacao") { const p = s / (km * 10); return { v: `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`, u: "min/100 m" }; }
  return { v: (km / (s / 3600)).toFixed(1), u: "km/h média" };
}
export const INTENSIDADES: Record<string, string> = { leve: "Leve", moderado: "Moderado", intenso: "Intenso" };

interface Props { treino: Treino | null; data: string; userId: string; isAdmin: boolean; membros: Membro[]; hoje: string; onClose: () => void }

export default function TreinoForm({ treino, data, userId, isAdmin, membros, hoje, onClose }: Props) {
  const router = useRouter();
  const canEdit = !treino || treino.criador_id === userId || isAdmin;
  const [f, setF] = useState({
    titulo: treino?.titulo ?? "",
    data: treino?.data ?? data,
    hora: treino?.hora?.slice(0, 5) ?? "",
    tipo: treino?.tipo ?? "estrada",
    intensidade: treino?.intensidade ?? "",
    partida: treino?.partida ?? "",
    km_plano: treino?.km_plano?.toString() ?? "",
    notas: treino?.notas ?? "",
  });
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpx, setGpx] = useState<GpxInfo | null>(null);
  const [removeGpx, setRemoveGpx] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const guardado = treino?.gpx_path && !removeGpx && !gpx && treino.km != null
    ? { km: Number(treino.km), dmais: treino.dmais ?? 0, duracaoS: treino.duracao_s, pontos: treino.trajeto ?? [] }
    : null;
  const shown = gpx ?? guardado;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > 20 * 1024 * 1024) { setErr("O ficheiro GPX é demasiado grande (máx. 20 MB)."); return; }
    try {
      const info = parseGpx(await file.text());
      setGpx(info);
      setGpxFile(file);
      setRemoveGpx(false);
      setF((p) => ({ ...p, titulo: p.titulo || info.nome || "" }));
    } catch {
      setErr("Não consegui ler esse ficheiro. Confirma que é um .gpx exportado do Garmin, Strava ou Komoot.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true); setErr("");
    const sb = createClient();
    let gpxPatch: Record<string, unknown> = {};
    let oldPath: string | null = null;
    let newPath: string | null = null;
    if (gpxFile && gpx) {
      newPath = `${userId}/${crypto.randomUUID()}.gpx`;
      const up = await sb.storage.from("gpx").upload(newPath, gpxFile, { contentType: "application/gpx+xml" });
      if (up.error) { setBusy(false); setErr("Não foi possível enviar o GPX. Tenta outra vez."); return; }
      gpxPatch = { gpx_path: newPath, km: gpx.km, dmais: gpx.dmais, duracao_s: gpx.duracaoS, trajeto: gpx.pontos };
      oldPath = treino?.gpx_path ?? null;
    } else if (removeGpx) {
      gpxPatch = { gpx_path: null, km: null, dmais: null, duracao_s: null, trajeto: null };
      oldPath = treino?.gpx_path ?? null;
    }
    const body = {
      titulo: f.titulo.trim() || `Treino de ${TIPOS_TREINO[f.tipo].toLowerCase()}`,
      data: f.data,
      hora: f.hora || null,
      tipo: f.tipo,
      intensidade: f.intensidade || null,
      partida: f.partida.trim() || null,
      km_plano: f.km_plano ? Math.round(+f.km_plano * 100) / 100 : null,
      notas: f.notas.trim() || null,
      updated_at: new Date().toISOString(),
      ...gpxPatch,
    };
    const { error } = treino
      ? await sb.from("treinos").update(body).eq("id", treino.id)
      : await sb.from("treinos").insert(body);
    if (error) {
      if (newPath) await sb.storage.from("gpx").remove([newPath]);
      setBusy(false);
      setErr("Não foi possível guardar o treino. Tenta outra vez.");
      return;
    }
    if (oldPath) await sb.storage.from("gpx").remove([oldPath]);
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!treino) return;
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from("treinos").delete().eq("id", treino.id);
    if (error) { setBusy(false); setErr("Não foi possível apagar o treino."); return; }
    if (treino.gpx_path) await sb.storage.from("gpx").remove([treino.gpx_path]);
    onClose();
    router.refresh();
  }

  async function download() {
    if (!treino?.gpx_path) return;
    const nome = (treino.titulo || "treino").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    const { data } = await createClient().storage.from("gpx").createSignedUrl(treino.gpx_path, 60, { download: `${nome}-${treino.data}.gpx` });
    if (data?.signedUrl) window.location.href = data.signedUrl;
    else setErr("Não foi possível descarregar o GPX.");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} autoComplete="off">
        <div className="stripe" />
        <div className="mbody">
          <div>
            <p className="eyebrow" style={{ color: "var(--muted)" }}>{treino ? "Treino" : "Novo treino"} · <span suppressHydrationWarning>{fmtDate(f.data, { weekday: "long", day: "numeric", month: "long" })}</span></p>
            <h3>{treino ? treino.titulo : "Planear treino"}</h3>
          </div>
          <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="fgrid">
              <div className="field full"><label htmlFor="tTitulo">Título</label><input id="tTitulo" type="text" maxLength={60} placeholder="ex.: Subida à Senhora do Salto" value={f.titulo} onChange={set("titulo")} /></div>
              <div className="field"><label htmlFor="tData">Data</label><input id="tData" type="date" required value={f.data} onChange={set("data")} /></div>
              <div className="field"><label htmlFor="tHora">Hora de saída</label><input id="tHora" type="time" value={f.hora} onChange={set("hora")} /></div>
              <div className="field"><label htmlFor="tTipo">Tipo</label><select id="tTipo" value={f.tipo} onChange={set("tipo")}>{Object.entries(TIPOS_TREINO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label htmlFor="tInt">Intensidade</label><select id="tInt" value={f.intensidade} onChange={set("intensidade")}><option value="">—</option>{Object.entries(INTENSIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label htmlFor="tPartida">Ponto de encontro</label><input id="tPartida" type="text" maxLength={80} value={f.partida} onChange={set("partida")} /></div>
              <div className="field"><label htmlFor="tKm">Distância planeada (km)</label><input id="tKm" type="number" min={0} step={0.1} value={f.km_plano} onChange={set("km_plano")} /></div>
              <div className="field full"><label htmlFor="tNotas">Notas</label><textarea id="tNotas" maxLength={800} placeholder="Séries, ritmo, paragem para café…" value={f.notas} onChange={set("notas")} /></div>
            </div>
          </fieldset>

          <div className="gpx">
            <div className="gpx-h">
              <span className="field-l">Treino feito (GPX)</span>
              {canEdit && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{shown ? "Substituir GPX" : "Carregar GPX"}</button>
                  {shown && <button type="button" className="btn ghost danger" onClick={() => { setGpx(null); setGpxFile(null); setRemoveGpx(true); }}>Remover</button>}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden onChange={pick} />
            {shown ? (
              <>
                <div className="gpx-stats">
                  <div><b className="num">{fmtKm(shown.km)}</b><span>km</span></div>
                  {f.tipo !== "natacao" && <div><b className="num">{shown.dmais.toLocaleString("pt-PT")}</b><span>m D+</span></div>}
                  {shown.duracaoS ? <div><b className="num">{fmtDuracao(shown.duracaoS)}</b><span>tempo</span></div> : null}
                  {shown.duracaoS && shown.km > 0 ? (() => { const r = ritmo(f.tipo, shown.km, shown.duracaoS); return <div><b className="num">{r.v}</b><span>{r.u}</span></div>; })() : null}
                </div>
                {shown.pontos.length > 1 && <RoutePreview pontos={shown.pontos} />}
                {gpxFile ? (
                  <span className="hint">{gpxFile.name} · {gpx?.inicio && gpx.inicio !== f.data ? <>o GPX é de {fmtDate(gpx.inicio, { day: "numeric", month: "short" })} · </> : null}por guardar</span>
                ) : treino?.gpx_path ? (
                  <button type="button" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={download}>Descarregar GPX</button>
                ) : null}
              </>
            ) : (
              <p className="empty" style={{ margin: 0 }}>{removeGpx ? "O GPX vai ser removido quando guardares." : "Depois da volta, carrega o GPX (Garmin, Strava, Komoot…) para contar os km feitos."}</p>
            )}
          </div>

          {treino && <Participantes treino={treino} userId={userId} isAdmin={isAdmin} membros={membros} hoje={hoje} />}

          {treino && <p className="empty" style={{ margin: 0 }}>Criado por {treino.perfis?.nome || "um membro"}{!canEdit ? ". Só quem criou ou um admin pode alterar." : ""}</p>}
          {err && <div className="notice">{err}</div>}
          <div className="mactions">
            {treino && canEdit ? <button type="button" className="btn ghost danger" onClick={remove} disabled={busy}>{armed ? "Confirmar: apagar" : "Apagar treino"}</button> : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>{canEdit ? "Cancelar" : "Fechar"}</button>
              {canEdit && <button type="submit" className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : "Guardar"}</button>}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Participantes({ treino, userId, isAdmin, membros, hoje }: { treino: Treino; userId: string; isAdmin: boolean; membros: Membro[]; hoje: string }) {
  const router = useRouter();
  const ps = treino.treino_participantes ?? [];
  const fechadas = !!treino.presencas_fechadas;
  const nome = (id: string) => membros.find((m) => m.id === id)?.nome || "Membro";
  const [mineOpt, setMineOpt] = useState<EstadoInscricao | null | undefined>(undefined);
  useEffect(() => setMineOpt(undefined), [treino]);
  const mine = mineOpt !== undefined ? mineOpt ?? undefined : ps.find((p) => p.user_id === userId)?.estado;
  const passado = hoje ? treino.data <= hoje : false;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editar, setEditar] = useState(false);

  async function marcar(estado: EstadoInscricao | null) {
    setMineOpt(estado);
    setBusy(true); setErr("");
    const { error } = await createClient().rpc("marcar_treino", { p_treino: treino.id, p_estado: estado });
    setBusy(false);
    if (error) { setErr("Não foi possível guardar a tua resposta."); setMineOpt(undefined); }
    router.refresh();
  }
  async function guardar(ids: string[], convidados: string[]) {
    const { error } = await createClient().rpc("registar_presencas", { p_treino: treino.id, p_presentes: ids, p_convidados: convidados });
    if (error) return "Não foi possível guardar as presenças.";
    setEditar(false);
    router.refresh();
    return null;
  }
  const iniciais = fechadas ? ps.filter((p) => p.presente).map((p) => p.user_id) : ps.filter((p) => p.estado === "vai").map((p) => p.user_id);
  const respostas = Object.fromEntries(ps.map((p) => [p.user_id, p.estado]));
  const convidados = treino.convidados ?? [];

  const chips = (list: string[]) => list.length
    ? list.map((id) => nome(id)).sort((a, b) => a.localeCompare(b, "pt")).map((n, i) => <span key={i} className="chip">{n}</span>)
    : <span className="empty">—</span>;
  const g = (e: EstadoInscricao) => ps.filter((p) => p.estado === e).map((p) => p.user_id);
  const presentes = ps.filter((p) => p.presente).map((p) => p.user_id);

  return (
    <div className="gpx">
      <div className="gpx-h">
        <span className="field-l">{fechadas ? `Presenças · ${presentes.length + convidados.length}` : "Quem vai"}</span>
        {isAdmin && passado && !editar && (
          <button type="button" className="btn" onClick={() => { setErr(""); setEditar(true); }}>{fechadas ? "Editar presenças" : "Registar presenças"}</button>
        )}
      </div>

      {editar ? (
        <PresencasEditor membros={membros} iniciais={iniciais} convidadosIniciais={convidados} respostas={respostas} onSave={guardar} onCancel={() => setEditar(false)} />
      ) : fechadas ? (
        <div className="grp go">{presentes.length || !convidados.length ? chips(presentes) : null}{convidados.map((c) => <span key={c} className="chip guest">{c}</span>)}</div>
      ) : (
        <div className="groups">
          <div className="grp go"><span className="gl">Vão <span className="num">{g("vai").length}</span></span>{chips(g("vai"))}</div>
          {g("talvez").length > 0 && <div className="grp maybe"><span className="gl">Talvez <span className="num">{g("talvez").length}</span></span>{chips(g("talvez"))}</div>}
          {g("nao").length > 0 && <div className="grp no"><span className="gl">Não vão <span className="num">{g("nao").length}</span></span>{chips(g("nao"))}</div>}
        </div>
      )}

      {!fechadas && !editar && membros.some((m) => m.id === userId) && (
        <div className="rsvp" style={{ paddingTop: 8 }}>
          <span className="lbl">A tua resposta:</span>
          <button type="button" className={`btn${mine === "vai" ? " on-go" : ""}`} onClick={() => !busy && marcar(mine === "vai" ? null : "vai")}>Vou</button>
          <button type="button" className={`btn${mine === "talvez" ? " on-maybe" : ""}`} onClick={() => !busy && marcar(mine === "talvez" ? null : "talvez")}>Talvez</button>
          <button type="button" className={`btn${mine === "nao" ? " on-no" : ""}`} onClick={() => !busy && marcar(mine === "nao" ? null : "nao")}>Não vou</button>
        </div>
      )}
      {err && <div className="notice">{err}</div>}
    </div>
  );
}
