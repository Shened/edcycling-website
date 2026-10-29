"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { avisarReacao } from "@/lib/avisos";
import type { Comentario, Post } from "@/lib/types";
import Avatar from "./Avatar";
import Carrossel from "./Carrossel";
import Texto from "./Texto";

export const quando = (iso: string) => {
  const d = new Date(iso), min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`;
  if (min < 60 * 24 * 7) return `há ${Math.round(min / 1440)} d`;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

interface Eu { id: string; nome: string; avatar: string | null }
interface Props { p: Post; eu: Eu; isAdmin: boolean; armed: boolean; onApagar: () => void }

const Coracao = ({ cheio }: { cheio: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3z"
      fill={cheio ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);
const Balao = () => (
  <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true">
    <path d="M20.5 11.5c0 4.4-3.8 8-8.5 8-1.2 0-2.4-.2-3.4-.7L4 20l1.2-3.7c-1.1-1.4-1.7-3-1.7-4.8 0-4.4 3.8-8 8.5-8s8.5 3.6 8.5 8z"
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);

export default function PostCard({ p, eu, isAdmin, armed, onApagar }: Props) {
  const router = useRouter();
  const nome = p.perfis?.nome || "Alguém da equipa";

  // Gostos (otimista)
  const servidorGostos = p.post_gostos ?? [];
  const [gosto, setGosto] = useState(servidorGostos.some((g) => g.user_id === eu.id));
  const [nGostos, setNGostos] = useState(servidorGostos.length);
  const [pulso, setPulso] = useState(false);
  useEffect(() => { setGosto(servidorGostos.some((g) => g.user_id === eu.id)); setNGostos(servidorGostos.length); }, [p.post_gostos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarGosto(forcar?: boolean) {
    const novo = forcar ?? !gosto;
    if (novo === gosto) { if (forcar) { setPulso(true); setTimeout(() => setPulso(false), 700); } return; }
    setGosto(novo); setNGostos((n) => n + (novo ? 1 : -1));
    if (novo) { setPulso(true); setTimeout(() => setPulso(false), 700); }
    const sb = createClient();
    const { error } = novo
      ? await sb.from("post_gostos").insert({ post_id: p.id, user_id: eu.id })
      : await sb.from("post_gostos").delete().eq("post_id", p.id).eq("user_id", eu.id);
    if (error && !/duplicate/i.test(error.message)) { setGosto(!novo); setNGostos((n) => n + (novo ? -1 : 1)); return; }
    if (novo) void avisarReacao("gosto", p.id);
  }

  // Comentários
  const [coms, setComs] = useState<Comentario[]>(p.post_comentarios ?? []);
  useEffect(() => setComs(p.post_comentarios ?? []), [p.post_comentarios]);
  const [todos, setTodos] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviar, setEnviar] = useState(false);
  const [armedCom, setArmedCom] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const visiveis = todos || coms.length <= 2 ? coms : coms.slice(-2);

  async function comentar(e?: React.FormEvent) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviar) return;
    setEnviar(true);
    const tmp: Comentario = { id: "tmp-" + Date.now(), autor_id: eu.id, texto: t, created_at: new Date().toISOString(), perfis: { nome: eu.nome, avatar_path: eu.avatar } };
    setComs((c) => [...c, tmp]); setTexto("");
    const { data, error } = await createClient().from("post_comentarios").insert({ post_id: p.id, autor_id: eu.id, texto: t }).select("id").single();
    setEnviar(false);
    if (error || !data) { setComs((c) => c.filter((x) => x.id !== tmp.id)); setTexto(t); return; }
    setComs((c) => c.map((x) => (x.id === tmp.id ? { ...x, id: (data as { id: string }).id } : x)));
    void avisarReacao("comentario", p.id, (data as { id: string }).id);
    router.refresh();
  }
  async function apagarCom(id: string) {
    if (armedCom !== id) { setArmedCom(id); return; }
    setArmedCom(null);
    const antes = coms;
    setComs((c) => c.filter((x) => x.id !== id));
    const { error } = await createClient().from("post_comentarios").delete().eq("id", id);
    if (error) setComs(antes);
  }

  const outros = servidorGostos.filter((g) => g.user_id !== eu.id).map((g) => g.perfis?.nome).filter(Boolean) as string[];
  const quemGosta = (() => {
    const nomes = [...(gosto ? ["Tu"] : []), ...outros];
    if (!nomes.length) return "";
    if (nomes.length <= 2) return nomes.join(" e ");
    return `${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}`;
  })();

  return (
    <article className="fpost">
      <header className="fpost-h">
        <Link href={`/atletas/${p.autor_id}`} aria-label={`Perfil de ${nome}`}><Avatar nome={nome} path={p.perfis?.avatar_path} /></Link>
        <span className="fpost-who">
          <Link href={`/atletas/${p.autor_id}`} className="who-link"><b>{nome}</b></Link>
          <span suppressHydrationWarning>{quando(p.created_at)}{p.eventos?.titulo ? <> · <span className="tag">{p.eventos.titulo}</span></> : null}</span>
        </span>
        {(isAdmin || p.autor_id === eu.id) && (
          <button type="button" className="btn ghost danger" style={{ marginLeft: "auto", padding: "4px 8px" }} onClick={onApagar}>{armed ? "Confirmar" : "Apagar"}</button>
        )}
      </header>

      {p.urls && p.urls.length > 0 && (
        <div className="fpost-media" onDoubleClick={() => alternarGosto(true)}>
          <Carrossel urls={p.urls} alt={p.legenda ? p.legenda.slice(0, 80) : `Publicação de ${nome}`} />
          {pulso && <span className="burst" aria-hidden="true"><Coracao cheio /></span>}
        </div>
      )}
      {p.legenda && <div className={`fpost-t${p.urls?.length ? "" : " solo"}`}><Texto texto={p.legenda} /></div>}

      <div className="fpost-acoes">
        <button type="button" className={`ico-btn${gosto ? " on" : ""}${pulso && gosto ? " pop" : ""}`} aria-pressed={gosto} aria-label={gosto ? "Retirar gosto" : "Gostar"} onClick={() => alternarGosto()}>
          <Coracao cheio={gosto} />{nGostos > 0 && <span className="num">{nGostos}</span>}
        </button>
        <button type="button" className="ico-btn" aria-label="Comentar" onClick={() => { setTodos(true); inputRef.current?.focus(); }}>
          <Balao />{coms.length > 0 && <span className="num">{coms.length}</span>}
        </button>
        {quemGosta && <span className="quem">{quemGosta === "Tu" ? "Gostaste disto" : `${quemGosta} ${quemGosta.includes(" e ") ? "gostam" : "gosta"} disto`}</span>}
      </div>

      {(
        <div className="coms">
          {!todos && coms.length > 2 && (
            <button type="button" className="coms-mais" onClick={() => setTodos(true)}>Ver os {coms.length} comentários</button>
          )}
          {visiveis.map((c) => {
            const cn = c.perfis?.nome || "Membro";
            return (
              <div key={c.id} className={`com${c.id.startsWith("tmp-") ? " pend" : ""}`}>
                <Link href={`/atletas/${c.autor_id}`} aria-label={`Perfil de ${cn}`}><Avatar nome={cn} path={c.perfis?.avatar_path} size={28} /></Link>
                <div className="com-b">
                  <p><Link href={`/atletas/${c.autor_id}`} className="who-link"><b>{cn}</b></Link> {c.texto}</p>
                  <span className="com-m">
                    <span suppressHydrationWarning>{quando(c.created_at)}</span>
                    {(c.autor_id === eu.id || isAdmin) && !c.id.startsWith("tmp-") && (
                      <button type="button" onClick={() => apagarCom(c.id)}>{armedCom === c.id ? "Confirmar" : "Apagar"}</button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
          <form className="com-form" onSubmit={comentar}>
            <Avatar nome={eu.nome} path={eu.avatar} size={28} />
            <textarea ref={inputRef} rows={1} maxLength={1000} placeholder="Escreve um comentário…" aria-label="Comentário" value={texto}
              onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); comentar(); } }} />
            <button type="submit" className="com-send" disabled={!texto.trim() || enviar}>Publicar</button>
          </form>
        </div>
      )}
    </article>
  );
}
