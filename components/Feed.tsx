"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marcar } from "@/lib/metricas";
import { reduzirImagem } from "@/lib/image";
import { MESES, evAno, evMes } from "@/lib/dates";
import type { Evento, Post } from "@/lib/types";
import PostCard from "./PostCard";
import Link from "next/link";
import { dataPub, imagemUrl, resumo, type Noticia } from "@/lib/noticias";
import { avisarFeed } from "@/lib/avisos";

const MAX = 10;
interface Escolhida { id: string; blob: Blob; url: string }


export default function Feed({ posts, eventos, userId, isAdmin, eu, eventoInicial = "", noticias = [] }: { posts: Post[]; eventos: Evento[]; userId: string; isAdmin: boolean; eu: { id: string; nome: string; avatar: string | null }; eventoInicial?: string; noticias?: Noticia[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<Escolhida[]>([]);
  const [evento, setEvento] = useState(eventoInicial);
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
    const { data: novo, error } = await sb.from("posts").insert({ autor_id: userId, legenda: texto.trim() || null, fotos: paths, evento_id: evento || null }).select("id").single();
    setBusy(false);
    if (!error && novo) { void avisarFeed((novo as { id: string }).id); marcar("Publicação no feed", { fotos: paths.length, comEvento: !!evento, comTexto: !!texto.trim() }); }
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

  // As novidades da gestão entram no feed pela data; a mais recente fica fixada no topo durante 7 dias.
  const quando = (n: Noticia) => n.publicado_em ?? n.created_at;
  const fixada = noticias.find((n) => Date.now() - new Date(quando(n)).getTime() < 7 * 86400_000) ?? null;
  const maisAntigo = posts.length >= 60 ? posts[posts.length - 1].created_at : "";
  const lista: ({ k: "p"; p: Post; t: string } | { k: "n"; n: Noticia; t: string })[] = [
    ...posts.map((p) => ({ k: "p" as const, p, t: p.created_at })),
    ...noticias.filter((n) => n.id !== fixada?.id && quando(n) >= maisAntigo).map((n) => ({ k: "n" as const, n, t: quando(n) })),
  ].sort((a, b) => b.t.localeCompare(a.t));

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
          {fixada && <NoticiaCard n={fixada} fixada />}
          {lista.map((it) => it.k === "n"
            ? <NoticiaCard key={`n-${it.n.id}`} n={it.n} />
            : <PostCard key={it.p.id} p={it.p} eu={eu} isAdmin={isAdmin} armed={armed === it.p.id} onApagar={() => apagar(it.p)} />)}
        </div>
      ) : (
        <p className="empty">Ainda não há publicações. Partilha a primeira: o resumo do último treino, fotos de um passeio ou um aviso para a equipa.</p>
      )}
    </section>
  );
}

// Publicação da gestão (Gestão → Publicações) mostrada no feed.
function NoticiaCard({ n, fixada }: { n: Noticia; fixada?: boolean }) {
  const img = imagemUrl(n.imagem_path);
  return (
    <article className={`fpost nfeed${fixada ? " fixada" : ""}`}>
      <header className="fpost-h">
        <span className="nfeed-logo" aria-hidden="true">ED</span>
        <span className="fpost-who">
          <b>EDCycling</b>
          <span>{fixada ? "Novidade da equipa · fixada" : "Novidade da equipa"} · {dataPub(n)}</span>
        </span>
      </header>
      {img && <Link href={`/noticias/${n.id}`} className="fpost-media"><img src={img} alt="" loading="lazy" style={{ width: "100%", display: "block" }} /></Link>}
      <div className="fpost-t solo nfeed-b">
        <h3><Link href={`/noticias/${n.id}`}>{n.titulo}</Link></h3>
        {n.texto && <p>{resumo(n.texto, 280)}</p>}
        <Link href={`/noticias/${n.id}`} className="nfeed-mais">Ler tudo →</Link>
      </div>
    </article>
  );
}
