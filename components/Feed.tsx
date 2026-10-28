"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reduzirImagem } from "@/lib/image";
import { MESES, evAno, evMes } from "@/lib/dates";
import type { Evento, Post } from "@/lib/types";
import Carrossel from "./Carrossel";
import Texto from "./Texto";
import Avatar from "./Avatar";
import Link from "next/link";

const MAX = 10;
interface Escolhida { id: string; blob: Blob; url: string }

const quando = (iso: string) => {
  const d = new Date(iso), agora = Date.now(), min = Math.round((agora - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export default function Feed({ posts, eventos, userId, isAdmin }: { posts: Post[]; eventos: Evento[]; userId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<Escolhida[]>([]);
  const [evento, setEvento] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => fotos.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const livres = MAX - fotos.length;
    if (files.length > livres) setStatus(`Máximo ${MAX} fotos por publicação. Ficaram as primeiras ${livres}.`);
    else setStatus("A preparar as fotos…");
    const novas: Escolhida[] = [];
    for (const f of files.slice(0, livres)) {
      try { const blob = await reduzirImagem(f); novas.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) }); }
      catch { setStatus("Uma das imagens não pôde ser lida (experimenta JPG ou PNG)."); }
    }
    setFotos((a) => [...a, ...novas]);
    if (files.length <= livres) setStatus("");
  }
  function tirar(id: string) {
    setFotos((a) => { const f = a.find((x) => x.id === id); if (f) URL.revokeObjectURL(f.url); return a.filter((x) => x.id !== id); });
  }
  function mover(id: string, d: number) {
    setFotos((a) => { const i = a.findIndex((x) => x.id === id), j = i + d; if (j < 0 || j >= a.length) return a; const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() && !fotos.length) { setStatus("Escreve alguma coisa ou junta pelo menos uma foto."); return; }
    setBusy(true);
    const sb = createClient();
    const paths: string[] = [];
    for (let k = 0; k < fotos.length; k++) {
      setStatus(`A enviar foto ${k + 1} de ${fotos.length}…`);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from("fotos").upload(path, fotos[k].blob, { contentType: "image/jpeg" });
      if (up.error) {
        if (paths.length) await sb.storage.from("fotos").remove(paths);
        setBusy(false); setStatus("Não foi possível enviar as fotos. Tenta outra vez."); return;
      }
      paths.push(path);
    }
    setStatus("A publicar…");
    const { error } = await sb.from("posts").insert({ autor_id: userId, legenda: texto.trim() || null, fotos: paths, evento_id: evento || null });
    setBusy(false);
    if (error) { if (paths.length) await sb.storage.from("fotos").remove(paths); setStatus("Não foi possível publicar. Tenta outra vez."); return; }
    fotos.forEach((f) => URL.revokeObjectURL(f.url));
    setTexto(""); setFotos([]); setEvento(""); setStatus("Publicado.");
    router.refresh();
  }

  async function apagar(p: Post) {
    if (armed !== p.id) { setArmed(p.id); return; }
    const sb = createClient();
    const { error } = await sb.from("posts").delete().eq("id", p.id);
    const lista = p.fotos?.length ? p.fotos : p.foto_path ? [p.foto_path] : [];
    if (!error && lista.length) await sb.storage.from("fotos").remove(lista);
    setArmed(null);
    router.refresh();
  }

  return (
    <section className="view feed-v">
      <div className="sechead"><h2>Feed da equipa</h2></div>

      <form className="composer" onSubmit={publicar}>
        <textarea maxLength={2000} rows={3} placeholder="Partilha algo com a equipa: um treino, uma foto, um aviso…" aria-label="Texto da publicação" value={texto} onChange={(e) => setTexto(e.target.value)} />
        {fotos.length > 0 && (
          <div className="thumbs">
            {fotos.map((f, k) => (
              <div key={f.id} className="thumb">
                <img src={f.url} alt={`Foto ${k + 1}`} />
                <span className="thumb-n num">{k + 1}</span>
                <div className="thumb-a">
                  {k > 0 && <button type="button" aria-label="Mover para a esquerda" onClick={() => mover(f.id, -1)}>‹</button>}
                  {k < fotos.length - 1 && <button type="button" aria-label="Mover para a direita" onClick={() => mover(f.id, 1)}>›</button>}
                  <button type="button" aria-label="Retirar foto" onClick={() => tirar(f.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="composer-bar">
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={fotos.length >= MAX}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 17-5-5-8 8" /></svg>
            {fotos.length ? `Fotos (${fotos.length}/${MAX})` : "Fotos"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={escolher} />
          <select aria-label="Evento associado" value={evento} onChange={(e) => setEvento(e.target.value)}>
            <option value="">Sem evento</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo} · {MESES[evMes(e) - 1]} {evAno(e)}</option>)}
          </select>
          <button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A publicar…</> : "Publicar"}</button>
        </div>
        {status && <span className="hint">{status}</span>}
      </form>

      {posts.length ? (
        <div className="feed-list">
          {posts.map((p) => {
            const nome = p.perfis?.nome || "Alguém da equipa";
            return (
              <article key={p.id} className="fpost">
                <header className="fpost-h">
                  <Link href={`/atletas/${p.autor_id}`} aria-label={`Perfil de ${nome}`}><Avatar nome={nome} path={p.perfis?.avatar_path} /></Link>
                  <span className="fpost-who">
                    <Link href={`/atletas/${p.autor_id}`} className="who-link"><b>{nome}</b></Link>
                    <span suppressHydrationWarning>{quando(p.created_at)}{p.eventos?.titulo ? <> · <span className="tag">{p.eventos.titulo}</span></> : null}</span>
                  </span>
                  {(isAdmin || p.autor_id === userId) && (
                    <button type="button" className="btn ghost danger" style={{ marginLeft: "auto", padding: "4px 8px" }} onClick={() => apagar(p)}>
                      {armed === p.id ? "Confirmar" : "Apagar"}
                    </button>
                  )}
                </header>
                {p.urls && p.urls.length > 0 && <Carrossel urls={p.urls} alt={p.legenda ? p.legenda.slice(0, 80) : `Publicação de ${nome}`} />}
                {p.legenda && <div className={`fpost-t${p.urls?.length ? "" : " solo"}`}><Texto texto={p.legenda} /></div>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty">Ainda não há publicações. Partilha a primeira: o resumo do último treino, fotos de um passeio ou um aviso para a equipa.</p>
      )}
    </section>
  );
}
