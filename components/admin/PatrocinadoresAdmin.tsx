"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoPatrocinador, prepararLogo, type Patrocinador } from "@/lib/patrocinadores";
import { useEsc } from "@/components/useEsc";

// Patrocinadores que aparecem no fundo de todas as páginas do site.
export default function PatrocinadoresAdmin({ lista }: { lista: Patrocinador[] }) {
  const [editar, setEditar] = useState<Patrocinador | null | undefined>(undefined);
  return (
    <section className="view">
      <div className="sechead" style={{ marginBottom: 10 }}>
        <h3 className="adm-h">Patrocinadores</h3>
        <button className="btn primary" onClick={() => setEditar(null)}>+ Novo patrocinador</button>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>Aparecem no fundo de todas as páginas, para toda a gente (mesmo sem conta). Os <b>principais</b> ficam maiores e primeiro. Para o logótipo usa de preferência um <b>PNG com fundo transparente</b> ou um <b>SVG</b>.</p>
      {lista.length ? (
        <ul className="kit-lista">
          {lista.map((p) => (
            <li key={p.id}>
              <button type="button" className="kit-c" onClick={() => setEditar(p)}>
                {logoPatrocinador(p.logo_path) ? <span className="patro-mini"><img src={logoPatrocinador(p.logo_path)!} alt="" /></span> : <span className="kit-ph" aria-hidden="true" />}
                <span className="kit-t"><b>{p.nome}</b><span>{p.url ? p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "Sem link"}</span></span>
                {p.principal && <span className="pill confirmado">Principal</span>}
                {!p.ativo && <span className="pill pendente">Escondido</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel"><p className="empty" style={{ margin: 0 }}>Ainda não há patrocinadores. Adiciona o primeiro com o logótipo e o link para o site ou Instagram.</p></div>
      )}
      {editar !== undefined && <Editor p={editar} onClose={() => setEditar(undefined)} />}
    </section>
  );
}

function Editor({ p, onClose }: { p: Patrocinador | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ nome: p?.nome ?? "", url: p?.url ?? "", principal: p?.principal ?? false, ativo: p?.ativo ?? true, ordem: String(p?.ordem ?? 0) });
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoPatrocinador(p?.logo_path));
  const [busy, setBusy] = useState(false);
  const [armado, setArmado] = useState(false);
  const [err, setErr] = useState("");
  const fechar = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEsc(true, fechar);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return;
    let url = f.url.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    setBusy(true); setErr("");
    const sb = createClient();
    let logo_path = p?.logo_path ?? null;
    let novo: string | null = null;
    if (logo) {
      try {
        const { blob, ext, tipo } = await prepararLogo(logo);
        novo = `patrocinadores/${crypto.randomUUID()}.${ext}`;
        const up = await sb.storage.from("noticias").upload(novo, blob, { contentType: tipo });
        if (up.error) throw up.error;
        logo_path = novo;
      } catch { setBusy(false); setErr("Não foi possível enviar o logótipo (SVG até 400 KB, ou PNG/JPG/WebP)."); return; }
    }
    const body = { nome: f.nome.trim().slice(0, 80), url, principal: f.principal, ativo: f.ativo, ordem: Number(f.ordem) || 0, logo_path };
    const res = p ? await sb.from("patrocinadores").update(body).eq("id", p.id) : await sb.from("patrocinadores").insert(body);
    if (res.error) { if (novo) await sb.storage.from("noticias").remove([novo]); setBusy(false); setErr("Não foi possível guardar."); return; }
    if (novo && p?.logo_path) await sb.storage.from("noticias").remove([p.logo_path]);
    onClose(); router.refresh();
  }
  async function apagar() {
    if (!p) return;
    if (!armado) { setArmado(true); return; }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from("patrocinadores").delete().eq("id", p.id);
    if (error) { setBusy(false); setErr("Não foi possível apagar."); return; }
    if (p.logo_path) await sb.storage.from("noticias").remove([p.logo_path]);
    onClose(); router.refresh();
  }

  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && fechar()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="ptT" onSubmit={guardar}>
        <div className="stripe" />
        <div className="mbody">
          <h3 id="ptT">{p ? p.nome : "Novo patrocinador"}</h3>
          <div className="fgrid">
            <div className="field full"><label htmlFor="pNome">Nome</label><input id="pNome" required maxLength={80} autoComplete="off" placeholder="Ex.: Bicicletas Gondomar…" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="field full"><label htmlFor="pUrl">Link (site ou Instagram)</label><input id="pUrl" inputMode="url" autoComplete="off" placeholder="Ex.: www.exemplo.pt…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
            <div className="field full"><label htmlFor="pLogo">Logótipo</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {preview ? <span className="patro-mini grande"><img src={preview} alt="" /></span> : <span className="kit-ph" aria-hidden="true" />}
                <input id="pLogo" type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) { setLogo(fl); setPreview(URL.createObjectURL(fl)); } }} />
              </div>
            </div>
            <div className="field"><label htmlFor="pOrdem">Ordem</label><input id="pOrdem" type="number" inputMode="numeric" value={f.ordem} onChange={(e) => setF({ ...f, ordem: e.target.value })} /></div>
            <div className="field" style={{ justifyContent: "flex-end", gap: 8 }}>
              <label className="check"><input type="checkbox" checked={f.principal} onChange={(e) => setF({ ...f, principal: e.target.checked })} /><span>Principal (maior)</span></label>
              <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /><span>Mostrar no site</span></label>
            </div>
          </div>
          {err && <div className="notice" role="alert">{err}</div>}
          <div className="mactions">
            {p ? <button type="button" className="btn ghost danger" onClick={apagar} disabled={busy}>{armado ? "Confirmar: apagar" : "Apagar"}</button> : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn ghost" onClick={fechar} disabled={busy}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy} aria-busy={busy}>{busy ? "A guardar…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
