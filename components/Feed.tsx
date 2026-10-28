"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESES, evAno, evMes } from "@/lib/dates";
import type { Evento, Post } from "@/lib/types";

// Reduz a foto para no máx. 1800px em JPEG antes do upload.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.86));
}

export default function Feed({ posts, eventos, userId, isAdmin }: { posts: Post[]; eventos: Evento[]; userId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [legenda, setLegenda] = useState("");
  const [evento, setEvento] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setStatus("A preparar a foto…");
    try {
      const b = await shrink(f);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      setStatus("");
    } catch {
      setBlob(null); setPreview(null);
      setStatus("Não consegui ler essa imagem. Experimenta um JPG ou PNG.");
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!blob) { setStatus("Escolhe primeiro uma foto."); return; }
    setBusy(true); setStatus("A enviar…");
    const sb = createClient();
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) { setBusy(false); setStatus("Não foi possível enviar a foto. Tenta outra vez."); return; }
    const { error } = await sb.from("posts").insert({ autor_id: userId, legenda: legenda.trim() || null, foto_path: path, evento_id: evento || null });
    setBusy(false);
    if (error) { await sb.storage.from("fotos").remove([path]); setStatus("Não foi possível publicar. Tenta outra vez."); return; }
    setBlob(null); setPreview(null); setLegenda(""); setEvento(""); setStatus("Publicada.");
    router.refresh();
  }

  async function remove(p: Post) {
    if (armed !== p.id) { setArmed(p.id); return; }
    const sb = createClient();
    const { error } = await sb.from("posts").delete().eq("id", p.id);
    if (!error) await sb.storage.from("fotos").remove([p.foto_path]);
    setArmed(null);
    router.refresh();
  }

  return (
    <section className="view">
      <div className="sechead"><h2>Fotos da equipa</h2><span className="empty">{posts.length ? `${posts.length} foto${posts.length === 1 ? "" : "s"}` : ""}</span></div>
      <form className="post-form" onSubmit={publish}>
        <label className="drop">
          {preview ? <img src={preview} alt="Pré-visualização" /> : <span>Escolher<br />foto</span>}
          <input type="file" accept="image/*" onChange={pick} />
        </label>
        <div className="pf-fields">
          <textarea maxLength={400} placeholder="Legenda (onde foi, quem estava…)" aria-label="Legenda" value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          <div className="pf-row">
            <select aria-label="Evento" value={evento} onChange={(e) => setEvento(e.target.value)}>
              <option value="">Sem evento associado</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo} · {MESES[evMes(e) - 1]} {evAno(e)}</option>)}
            </select>
            <button className="btn primary" type="submit" disabled={busy}>Publicar</button>
          </div>
          <span className="empty">{status}</span>
        </div>
      </form>
      {posts.length ? (
        <div className="feed">
          {posts.map((p) => (
            <figure className="post" key={p.id}>
              {p.url ? <img src={p.url} alt={p.legenda || "Foto da equipa"} loading="lazy" /> : <div style={{ minHeight: 160, background: "var(--sunk)" }} />}
              <figcaption className="pc">
                {p.legenda && <p className="cap">{p.legenda}</p>}
                <div className="meta">
                  <b>{p.perfis?.nome || "Alguém da equipa"}</b>
                  <span suppressHydrationWarning>{new Date(p.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {p.eventos?.titulo && <span className="tag">{p.eventos.titulo}</span>}
                  {(isAdmin || p.autor_id === userId) && (
                    <button className="btn ghost danger" style={{ marginLeft: "auto", padding: "2px 6px" }} onClick={() => remove(p)}>
                      {armed === p.id ? "Confirmar" : "Remover"}
                    </button>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="empty">Ainda não há fotos. Partilha a primeira do último treino ou passeio.</p>
      )}
    </section>
  );
}
