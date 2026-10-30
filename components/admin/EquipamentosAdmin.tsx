"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reduzirImagem } from "@/lib/image";
import { fotoEquipamento, type Equipamento } from "@/lib/equipamentos";
import { useEsc } from "@/components/useEsc";

// Equipamentos da equipa, para escolher qual levar em cada evento.
export default function EquipamentosAdmin({ kits }: { kits: Equipamento[] }) {
  const [editar, setEditar] = useState<Equipamento | null | undefined>(undefined);
  return (
    <section className="view">
      <div className="sechead" style={{ marginBottom: 10 }}>
        <h3 className="adm-h">Equipamentos</h3>
        <button className="btn primary" onClick={() => setEditar(null)}>+ Novo equipamento</button>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>Ao criar ou editar um evento escolhes um destes; os atletas veem-no no cartão e na página do evento. Os inativos deixam de aparecer na escolha.</p>
      {kits.length ? (
        <ul className="kit-lista">
          {kits.map((k) => (
            <li key={k.id}>
              <button type="button" className="kit-c" onClick={() => setEditar(k)}>
                {fotoEquipamento(k.foto_path) ? <img src={fotoEquipamento(k.foto_path)!} alt="" width={64} height={64} /> : <span className="kit-ph" aria-hidden="true" />}
                <span className="kit-t"><b>{k.nome}</b><span>{k.descricao || "Sem descrição"}</span></span>
                <span className={`pill ${k.ativo ? "confirmado" : "pendente"}`}>{k.ativo ? "Ativo" : "Inativo"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel"><p className="empty" style={{ margin: 0 }}>Ainda não há equipamentos. Cria, por exemplo, “Equipamento novo” e “Equipamento antigo”, com uma foto de cada.</p></div>
      )}
      {editar !== undefined && <EditorKit kit={editar} onClose={() => setEditar(undefined)} />}
    </section>
  );
}

function EditorKit({ kit, onClose }: { kit: Equipamento | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ nome: kit?.nome ?? "", descricao: kit?.descricao ?? "", ativo: kit?.ativo ?? true, ordem: String(kit?.ordem ?? 0) });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(fotoEquipamento(kit?.foto_path));
  const [busy, setBusy] = useState(false);
  const [armado, setArmado] = useState(false);
  const [err, setErr] = useState("");
  const fechar = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useEsc(true, fechar);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return;
    setBusy(true); setErr("");
    const sb = createClient();
    let foto_path = kit?.foto_path ?? null;
    let novo: string | null = null;
    if (foto) {
      try {
        const blob = await reduzirImagem(foto, 900);
        novo = `equipamentos/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from("noticias").upload(novo, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        foto_path = novo;
      } catch { setBusy(false); setErr("Não foi possível enviar a foto."); return; }
    }
    const body = { nome: f.nome.trim().slice(0, 60), descricao: f.descricao.trim() || null, ativo: f.ativo, ordem: Number(f.ordem) || 0, foto_path };
    const res = kit ? await sb.from("equipamentos").update(body).eq("id", kit.id) : await sb.from("equipamentos").insert(body);
    if (res.error) { if (novo) await sb.storage.from("noticias").remove([novo]); setBusy(false); setErr("Não foi possível guardar."); return; }
    if (novo && kit?.foto_path) await sb.storage.from("noticias").remove([kit.foto_path]);
    onClose(); router.refresh();
  }
  async function apagar() {
    if (!kit) return;
    if (!armado) { setArmado(true); return; }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from("equipamentos").delete().eq("id", kit.id);
    if (error) { setBusy(false); setErr("Não foi possível apagar."); return; }
    if (kit.foto_path) await sb.storage.from("noticias").remove([kit.foto_path]);
    onClose(); router.refresh();
  }

  return (
    <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && fechar()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="kitT" onSubmit={guardar}>
        <div className="stripe" />
        <div className="mbody">
          <h3 id="kitT">{kit ? kit.nome : "Novo equipamento"}</h3>
          <div className="fgrid">
            <div className="field full"><label htmlFor="kNome">Nome</label><input id="kNome" required maxLength={60} autoComplete="off" placeholder="Ex.: Equipamento novo (rosa)…" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="field full"><label htmlFor="kDesc">Descrição</label><input id="kDesc" maxLength={300} autoComplete="off" placeholder="Ex.: Camisola rosa, calção preto, meias brancas…" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
            <div className="field full"><label htmlFor="kFoto">Foto</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {preview ? <img src={preview} alt="" width={72} height={72} style={{ objectFit: "cover", borderRadius: 10 }} /> : <span className="kit-ph" aria-hidden="true" />}
                <input id="kFoto" type="file" accept="image/*" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) { setFoto(fl); setPreview(URL.createObjectURL(fl)); } }} />
              </div>
            </div>
            <div className="field"><label htmlFor="kOrdem">Ordem na lista</label><input id="kOrdem" type="number" inputMode="numeric" value={f.ordem} onChange={(e) => setF({ ...f, ordem: e.target.value })} /></div>
            <label className="check check-big" style={{ alignSelf: "end" }}><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /><span>Ativo</span></label>
          </div>
          {err && <div className="notice" role="alert">{err}</div>}
          <div className="mactions">
            {kit ? <button type="button" className="btn ghost danger" onClick={apagar} disabled={busy}>{armado ? "Confirmar: apagar" : "Apagar"}</button> : <span />}
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
