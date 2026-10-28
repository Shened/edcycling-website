"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reduzirImagem } from "@/lib/image";
import { imagemUrl, resumo, type Noticia } from "@/lib/noticias";

export default function PublicacoesAdmin({ noticias, abrirNova }: { noticias: Noticia[]; abrirNova: boolean }) {
  const [editing, setEditing] = useState<Noticia | null | undefined>(abrirNova ? null : undefined);
  const publicadas = noticias.filter((n) => n.publicado).length;
  return (
    <section className="view">
      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h3 className="adm-h">Publicações</h3>
          <button className="btn primary" onClick={() => setEditing(null)}>+ Nova publicação</button>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>As publicações aparecem na página inicial, visíveis para toda a gente. <span className="num">{publicadas}</span> publicada{publicadas === 1 ? "" : "s"}, <span className="num">{noticias.length - publicadas}</span> em rascunho.</p>
        {noticias.length ? (
          <div className="pub-list">
            {noticias.map((n) => (
              <button key={n.id} type="button" className="pub-row" onClick={() => setEditing(n)}>
                {n.imagem_path ? <img src={imagemUrl(n.imagem_path)!} alt="" /> : <span className="pub-ph" aria-hidden="true" />}
                <span className="pub-main">
                  <span className="pub-t">{n.titulo}</span>
                  <span className="pub-x">{resumo(n.texto, 120) || "Sem texto"}</span>
                </span>
                <span className="pub-meta">
                  <span className={`pill ${n.publicado ? "confirmado" : "pendente"}`}>{n.publicado ? "Publicada" : "Rascunho"}</span>
                  <span className="empty" suppressHydrationWarning>{new Date(n.publicado_em ?? n.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="panel"><p className="empty" style={{ margin: 0 }}>Ainda não há publicações. Escreve a primeira: um resultado de prova, a apresentação do equipamento novo, o resumo de um passeio…</p></div>
        )}
      </div>
      {editing !== undefined && <EditorNoticia noticia={editing} onClose={() => setEditing(undefined)} />}
    </section>
  );
}

function EditorNoticia({ noticia, onClose }: { noticia: Noticia | null; onClose: () => void }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(noticia?.titulo ?? "");
  const [texto, setTexto] = useState(noticia?.texto ?? "");
  const [publicado, setPublicado] = useState(noticia?.publicado ?? false);
  const [img, setImg] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(imagemUrl(noticia?.imagem_path ?? null));
  const [tirarImg, setTirarImg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const b = await reduzirImagem(f, 1600);
      setImg(b); setPreview(URL.createObjectURL(b)); setTirarImg(false); setErr("");
    } catch { setErr("Não consegui ler essa imagem. Experimenta um JPG ou PNG."); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setBusy(true); setErr("");
    const sb = createClient();
    let imagem_path = tirarImg ? null : noticia?.imagem_path ?? null;
    let novo: string | null = null;
    if (img) {
      novo = `${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from("noticias").upload(novo, img, { contentType: "image/jpeg" });
      if (up.error) { setBusy(false); setErr("Não foi possível enviar a imagem."); return; }
      imagem_path = novo;
    }
    const body = {
      titulo: titulo.trim(),
      texto: texto.trim(),
      imagem_path,
      publicado,
      publicado_em: publicado ? noticia?.publicado_em ?? new Date().toISOString() : noticia?.publicado_em ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = noticia ? await sb.from("noticias").update(body).eq("id", noticia.id) : await sb.from("noticias").insert(body);
    if (error) {
      if (novo) await sb.storage.from("noticias").remove([novo]);
      setBusy(false); setErr("Não foi possível guardar a publicação."); return;
    }
    if (noticia?.imagem_path && noticia.imagem_path !== imagem_path) await sb.storage.from("noticias").remove([noticia.imagem_path]);
    onClose(); router.refresh();
  }

  async function apagar() {
    if (!noticia) return;
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from("noticias").delete().eq("id", noticia.id);
    if (error) { setBusy(false); setErr("Não foi possível apagar."); return; }
    if (noticia.imagem_path) await sb.storage.from("noticias").remove([noticia.imagem_path]);
    onClose(); router.refresh();
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-lg" onSubmit={save} autoComplete="off">
        <div className="stripe" />
        <div className="mbody">
          <h3>{noticia ? "Editar publicação" : "Nova publicação"}</h3>
          <div className="field"><label htmlFor="nTitulo">Título</label><input id="nTitulo" type="text" required maxLength={100} placeholder="ex.: Equipamento novo para 2027" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field">
            <span className="field-l">Imagem</span>
            <div className="pub-img">
              {preview && !tirarImg ? <img src={preview} alt="Pré-visualização" /> : <span className="pub-ph big" aria-hidden="true" />}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{preview && !tirarImg ? "Trocar imagem" : "Escolher imagem"}</button>
                {preview && !tirarImg && <button type="button" className="btn ghost danger" onClick={() => { setTirarImg(true); setImg(null); }}>Remover</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nTexto">Texto</label>
            <textarea id="nTexto" rows={10} maxLength={8000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreve aqui. Deixa uma linha em branco para começar um novo parágrafo." />
            <span className="hint">{texto.length.toLocaleString("pt-PT")} / 8 000 caracteres</span>
          </div>
          <label className="check" style={{ alignSelf: "flex-start" }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
            <span>Publicar na página inicial</span>
          </label>
          {!publicado && <p className="hint" style={{ margin: 0 }}>Fica guardada como rascunho, só visível para admins.</p>}
          {err && <div className="notice">{err}</div>}
          <div className="mactions">
            {noticia ? <button type="button" className="btn ghost danger" onClick={apagar} disabled={busy}>{armed ? "Confirmar: apagar" : "Apagar"}</button> : <span />}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {noticia?.publicado && <a className="btn ghost" href={`/noticias/${noticia.id}`} target="_blank" rel="noreferrer">Ver</a>}
              <button type="button" className="btn" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : publicado ? "Guardar e publicar" : "Guardar rascunho"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
