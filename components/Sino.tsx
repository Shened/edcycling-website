"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Aviso { id: string; tipo: string; titulo: string; corpo: string | null; url: string | null; lido_em: string | null; created_at: string }

function haQuanto(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) { const d = Math.floor(s / 86400); return d === 1 ? "ontem" : `há ${d} dias`; }
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

// Sino 🔔 na barra de cima: os avisos recebidos ficam guardados no site, mesmo que o push ou o email falhem.
export default function Sino({ userId }: { userId: string }) {
  const [lista, setLista] = useState<Aviso[] | null>(null);
  const [open, setOpen] = useState(false);
  const [semTabela, setSemTabela] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const path = usePathname();

  const carregar = useCallback(async () => {
    const { data, error } = await createClient().from("avisos").select("id,tipo,titulo,corpo,url,lido_em,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(40);
    if (error) { setSemTabela(true); return; }
    setLista((data ?? []) as Aviso[]);
  }, [userId]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") void carregar(); }, 60_000);
    const vis = () => { if (document.visibilityState === "visible") void carregar(); };
    document.addEventListener("visibilitychange", vis);
    // O service worker avisa quando chega um push com a app aberta.
    const sw = (e: MessageEvent) => { if (e.data?.tipo === "push") void carregar(); };
    navigator.serviceWorker?.addEventListener("message", sw);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); navigator.serviceWorker?.removeEventListener("message", sw); };
  }, [carregar]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const fora = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [open]);

  if (semTabela) return null;
  const porLer = (lista ?? []).filter((a) => !a.lido_em).length;

  async function marcarLidos(ids?: string[]) {
    const agora = new Date().toISOString();
    const alvo = ids ?? (lista ?? []).filter((a) => !a.lido_em).map((a) => a.id);
    if (!alvo.length) return;
    setLista((l) => (l ?? []).map((a) => (alvo.includes(a.id) ? { ...a, lido_em: a.lido_em ?? agora } : a)));
    let q = createClient().from("avisos").update({ lido_em: agora }).eq("user_id", userId).is("lido_em", null);
    if (ids) q = q.in("id", ids);
    await q;
  }
  function abrir(a: Aviso) {
    if (!a.lido_em) void marcarLidos([a.id]);
    setOpen(false);
    if (a.url) router.push(a.url);
  }

  return (
    <div className="sino" ref={box}>
      <button ref={btn} type="button" className="appbar-atualizar sino-btn" aria-haspopup="dialog" aria-expanded={open}
        aria-label={porLer ? `Avisos, ${porLer} por ler` : "Avisos"} title="Avisos" onClick={() => { setOpen((o) => !o); if (!open) void carregar(); }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {porLer > 0 && <span className="sino-n" aria-hidden="true">{porLer > 9 ? "9+" : porLer}</span>}
      </button>
      {open && (
        <div className="sino-painel" role="dialog" aria-label="Avisos">
          <div className="sino-cab">
            <b>Avisos</b>
            {porLer > 0 && <button type="button" className="sino-todos" onClick={() => marcarLidos()}>Marcar todos como lidos</button>}
          </div>
          {lista === null ? <p className="sino-vazio"><span className="spinner" aria-hidden="true" /> A carregar…</p>
            : !lista.length ? <p className="sino-vazio">Ainda não recebeste avisos. Aparecem aqui os novos eventos, alterações, lembretes e respostas.</p>
            : (
              <ul className="sino-lista">
                {lista.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={`sino-i${a.lido_em ? "" : " novo"}`} onClick={() => abrir(a)}>
                      <span className="sino-t"><b>{a.titulo}</b>{a.corpo && <span>{a.corpo}</span>}</span>
                      <span className="sino-q" suppressHydrationWarning>{haQuanto(a.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          <a href="/definicoes" className="sino-def">Escolher que avisos recebo</a>
        </div>
      )}
    </div>
  );
}
