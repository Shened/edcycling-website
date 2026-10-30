"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { avisarConversa } from "@/lib/avisos";
import { marcar } from "@/lib/metricas";
import Avatar from "./Avatar";

interface Msg { id: string; autor_id: string; texto: string; created_at: string; perfis: { nome: string | null; avatar_path: string | null } | null }

const quando = (iso: string) => {
  const d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
};

// Comentários de um evento ou treino: dúvidas, sugestões, combinar boleias…
export default function Conversa({ tipo, id, userId, isAdmin, criadorId, titulo = "Conversa" }: {
  tipo: "evento" | "treino"; id: string; userId: string; isAdmin: boolean; criadorId?: string | null; titulo?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [erroTabela, setErroTabela] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviar, setEnviar] = useState(false);
  const [erro, setErro] = useState("");
  const [armado, setArmado] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const coluna = tipo === "evento" ? "evento_id" : "treino_id";

  const carregar = useCallback(async () => {
    const { data, error } = await createClient()
      .from("conversas")
      .select("id,autor_id,texto,created_at,perfis!conversas_autor_id_fkey(nome,avatar_path)")
      .eq(coluna, id)
      .order("created_at", { ascending: true });
    if (error) { setErroTabela(true); setMsgs([]); return; }
    setMsgs((data ?? []) as unknown as Msg[]);
  }, [coluna, id]);

  useEffect(() => { carregar(); }, [carregar]);
  // Atualiza quando se volta a esta janela (para ver respostas novas).
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [carregar]);

  async function publicar() {
    const t = texto.trim();
    if (!t || enviar) return;
    setEnviar(true); setErro("");
    const { data, error } = await createClient().from("conversas").insert({ [coluna]: id, autor_id: userId, texto: t }).select("id").single();
    setEnviar(false);
    if (error || !data) { setErro("Não foi possível enviar. Tenta outra vez."); return; }
    setTexto("");
    await carregar();
    setTimeout(() => fim.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
    void avisarConversa(tipo, id, (data as { id: string }).id);
    marcar("Comentário", { em: tipo });
  }

  async function apagar(mid: string) {
    if (armado !== mid) { setArmado(mid); return; }
    setArmado(null);
    const antes = msgs;
    setMsgs((m) => (m ?? []).filter((x) => x.id !== mid));
    const { error } = await createClient().from("conversas").delete().eq("id", mid);
    if (error) setMsgs(antes);
  }

  if (erroTabela) return null; // migration 024 ainda não corrida

  return (
    <section className="conv" aria-label={titulo}>
      <div className="conv-h">
        <h3>{titulo}{msgs && msgs.length > 0 && <span className="num"> · {msgs.length}</span>}</h3>
        <span className="hint">Dúvidas, sugestões ou alterações? Escreve aqui; {tipo === "treino" ? "quem criou o treino" : "a organização"} recebe um aviso.</span>
      </div>
      {msgs === null ? (
        <p className="empty" style={{ margin: 0 }}><span className="spinner" aria-hidden="true" /> A carregar…</p>
      ) : msgs.length === 0 ? (
        <p className="empty" style={{ margin: 0 }}>Ainda ninguém comentou.</p>
      ) : (
        <div className="coms conv-l">
          {msgs.map((m) => {
            const nome = m.perfis?.nome || "Membro";
            const org = criadorId && m.autor_id === criadorId;
            return (
              <div key={m.id} className="com">
                <Link href={`/atletas/${m.autor_id}`} aria-label={`Perfil de ${nome}`}><Avatar nome={nome} path={m.perfis?.avatar_path} size={28} /></Link>
                <div className="com-b">
                  <p><Link href={`/atletas/${m.autor_id}`} className="who-link"><b>{nome}</b></Link>{org && <span className="conv-org">{tipo === "treino" ? "criou o treino" : "organização"}</span>} {m.texto}</p>
                  <span className="com-m">
                    <span suppressHydrationWarning>{quando(m.created_at)}</span>
                    {(m.autor_id === userId || isAdmin) && <button type="button" onClick={() => apagar(m.id)}>{armado === m.id ? "Confirmar" : "Apagar"}</button>}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={fim} />
        </div>
      )}
      <div className="com-form conv-f">
        <textarea rows={1} maxLength={1000} placeholder="Escreve um comentário…" aria-label="Comentário" value={texto}
          onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); publicar(); } }} />
        <button type="button" className="com-send" disabled={!texto.trim() || enviar} onClick={publicar}>{enviar ? "…" : "Enviar"}</button>
      </div>
      {erro && <div className="notice" role="alert">{erro}</div>}
    </section>
  );
}
