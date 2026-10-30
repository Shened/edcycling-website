"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESES_L, daysTo, evAno, evMes, fmtDate, isPast, parseDate } from "@/lib/dates";
import { avisarInscricao } from "@/lib/avisos";
import type { EstadoInscricao, Evento, Inscricao, Membro, Post } from "@/lib/types";
import Avatar from "./Avatar";
import EventForm from "./EventForm";
import PostCard from "./PostCard";
import PresencasEditor from "./PresencasEditor";
import Texto from "./Texto";
import MenuAcoes from "./MenuAcoes";
import { TemaDeco } from "@/lib/temas";
import { fotoEquipamento } from "@/lib/equipamentos";
import { useEsc } from "./useEsc";
import { marcar } from "@/lib/metricas";
import { Resposta, estadoFrase } from "./EventoCartao";

type Insc = Inscricao & { perfis: { nome: string; avatar_path?: string | null } | null };
interface Props { evento: Evento; inscricoes: Insc[]; membros: Membro[]; posts: Post[]; eu: { id: string; nome: string; avatar: string | null }; isAdmin: boolean }

export default function EventoDetalhe({ evento: e, inscricoes, membros, posts, eu, isAdmin }: Props) {
  const router = useRouter();
  const [editar, setEditar] = useState(false);
  const [pres, setPres] = useState(false);
  const [msg, setMsg] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [armedPost, setArmedPost] = useState<string | null>(null);

  const souAtleta = membros.some((m) => m.id === eu.id);
  const meuServidor = inscricoes.find((i) => i.user_id === eu.id)?.estado ?? null;
  const [mine, setMine] = useState<EstadoInscricao | null>(meuServidor);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMine(meuServidor), [meuServidor]);
  const fecharPres = useCallback(() => setPres(false), []);
  useEsc(pres, fecharPres);

  const fechadas = !!e.presencas_fechadas;
  const closed = e.estado === "cancelado" || e.estado === "realizado" || fechadas;
  const passado = isPast(e);
  const d = parseDate(e.data);
  const n = e.data ? daysTo(e.data) : null;
  const ord = (l: Insc[]) => [...l].sort((a, b) => (a.perfis?.nome ?? "").localeCompare(b.perfis?.nome ?? "", "pt"));
  const g = { vai: ord(inscricoes.filter((i) => i.estado === "vai")), talvez: ord(inscricoes.filter((i) => i.estado === "talvez")), nao: ord(inscricoes.filter((i) => i.estado === "nao")) };
  const presentes = ord(inscricoes.filter((i) => i.presente));
  const convidados = e.convidados ?? [];

  async function rsvp(estado: EstadoInscricao | null) {
    if (busy) return;
    const antes = meuServidor;
    setMine(estado); setBusy(true); setMsg("");
    const sb = createClient();
    const { error } = estado
      ? await sb.from("inscricoes").upsert({ evento_id: e.id, user_id: eu.id, estado, updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" })
      : await sb.from("inscricoes").delete().eq("evento_id", e.id).eq("user_id", eu.id);
    setBusy(false);
    if (error) { setMine(antes); setMsg("Não foi possível guardar a tua resposta."); return; }
    void avisarInscricao("evento", e.id, antes);
    marcar("Resposta a evento", { resposta: estado ?? "retirou", onde: "pagina" });
    router.refresh();
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(window.location.href); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* ignora */ }
  }
  async function apagarPost(p: Post) {
    if (armedPost !== p.id) { setArmedPost(p.id); return; }
    const sb = createClient();
    const { error } = await sb.from("posts").delete().eq("id", p.id);
    const lista = p.fotos?.length ? p.fotos : p.foto_path ? [p.foto_path] : [];
    if (!error && lista.length) await sb.storage.from("fotos").remove(lista);
    setArmedPost(null); router.refresh();
  }

  async function partilhar() {
    const url = window.location.href;
    marcar("Partilhar evento", { modo: "share" in navigator ? "nativo" : "copiar" });
    if (navigator.share) { try { await navigator.share({ title: e.titulo, url }); return; } catch { /* cancelado */ } }
    await copiar();
  }
  const acoes = isAdmin ? [
    { label: "Editar evento", onClick: () => setEditar(true) },
    ...((passado || e.estado === "realizado") && e.estado !== "cancelado" ? [{ label: fechadas ? "Editar presenças" : "Registar presenças", onClick: () => setPres(true) }] : []),
  ] : [];
  const mostraResp = !closed && souAtleta;

  const Pessoa = ({ i }: { i: Insc }) => (
    <li>
      <Link href={`/atletas/${i.user_id}`} className="pessoa">
        <Avatar nome={i.perfis?.nome || "?"} path={i.perfis?.avatar_path} size={36} />
        <span className="pessoa-n">{i.perfis?.nome || "Membro"}{i.user_id === eu.id && <span className="pessoa-tu"> (tu)</span>}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </Link>
    </li>
  );
  const Linha = ({ icon, t, s, extra }: { icon: React.ReactNode; t: React.ReactNode; s: string; extra?: React.ReactNode }) => (
    <li className="evd-l">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      <span className="evd-t"><b>{t}</b><span>{s}</span></span>
      {extra}
    </li>
  );
  const frase = estadoFrase(e) + (n !== null && n >= 0 && !closed ? (n === 0 ? ", é hoje" : n === 1 ? ", é amanhã" : `, faltam ${n} dias`) : "");

  return (
    <section className={`view ev-page${mostraResp ? " com-resp" : ""}`}>
      <Link href="/eventos" className="ev-voltar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        Eventos
      </Link>

      <header className={`ev-cabeca st-${e.estado}${e.tema ? ` tema tema-${e.tema}` : ""}`}>
        <div className="topo" aria-hidden="true" />
        <div className="ev-cabeca-scrim" aria-hidden="true" />
        <TemaDeco tema={e.tema} />
        <div className="ev-cabeca-in">
          <div className="ev-cabeca-t">
            <p suppressHydrationWarning>{frase}</p>
            <h1>{e.titulo}</h1>
          </div>
          <div className="ev-cabeca-a">
            <button type="button" className="ico-btn mac-btn claro" onClick={partilhar} aria-label={copiado ? "Link copiado" : "Partilhar evento"} title={copiado ? "Link copiado" : "Partilhar"}>
              {copiado
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>}
            </button>
            <MenuAcoes acoes={acoes} label={`Ações para ${e.titulo}`} claro />
          </div>
        </div>
      </header>
      <p className="sr-only" aria-live="polite">{copiado ? "Link copiado" : ""}</p>

      <div className="evd-grid">
        <div className="evd-main">
          <ul className="evd-lista">
            <Linha
              icon={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>}
              t={<span suppressHydrationWarning>{d ? fmtDate(e.data, { weekday: "long", day: "numeric", month: "long", year: evAno(e) !== new Date().getFullYear() ? "numeric" : undefined }) : `${MESES_L[evMes(e) - 1]} de ${evAno(e)}`}</span>}
              s={e.hora ? `Saída às ${e.hora.slice(0, 5)}` : d ? "Hora por definir" : "Dia por marcar"}
              extra={e.data && e.estado !== "cancelado" ? <a className="evd-cal" href={`/eventos/${e.id}/ics`}>Adicionar ao calendário</a> : undefined}
            />
            {e.partida && <Linha icon={<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>} t={e.partida} s="Ponto de encontro" />}
            {e.km != null && <Linha icon={<path d="M3 17l5-6 4 4 4-7 5 9" />} t={<>{Number(e.km).toLocaleString("pt-PT")}&nbsp;km</>} s="Distância" />}
            {e.equipamento && (
              <Linha
                icon={<path d="M8 3 4 5.5 2.5 10l3 1.2L6 21h12l.5-9.8 3-1.2L20 5.5 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3z" />}
                t={e.equipamento.nome}
                s={e.equipamento.descricao || "Equipamento para este evento"}
                extra={fotoEquipamento(e.equipamento.foto_path) ? <img className="evd-kit" src={fotoEquipamento(e.equipamento.foto_path)!} alt={`Equipamento ${e.equipamento.nome}`} width={56} height={56} loading="lazy" /> : undefined}
              />
            )}
            {e.dmais != null && <Linha icon={<path d="M3 20 10 8l4 6 3-4 4 10z" />} t={<>{Number(e.dmais).toLocaleString("pt-PT")}&nbsp;m</>} s="Desnível positivo" />}
          </ul>

          {e.notas && <div className="evd-bloco"><h2>Informações</h2><Texto texto={e.notas} /></div>}

          {msg && <div className="notice" role="alert">{msg}</div>}

          {mostraResp && (
            <div className="evd-resp">
              <span>Vais a este evento?</span>
              <Resposta mine={mine} onPick={rsvp} busy={busy} titulo={e.titulo} />
            </div>
          )}
          {!closed && !souAtleta && <p className="empty">Conta de gestão: não responde como atleta.</p>}
        </div>

        <div className="evd-bloco evd-gente">
          {fechadas ? (
            <>
              <h2>Foram {presentes.length + convidados.length}</h2>
              <ul className="pessoas">
                {presentes.map((i) => <Pessoa key={i.id} i={i} />)}
                {convidados.map((c) => <li key={c}><span className="pessoa"><Avatar nome={c} size={36} /><span className="pessoa-n">{c}<span className="pessoa-tu"> (convidado)</span></span></span></li>)}
              </ul>
              {!presentes.length && !convidados.length && <p className="empty">Sem presenças registadas.</p>}
            </>
          ) : (
            <>
              <h2>{g.vai.length ? `Vão ${g.vai.length}` : "Quem vai"}</h2>
              {g.vai.length ? <ul className="pessoas">{g.vai.map((i) => <Pessoa key={i.id} i={i} />)}</ul> : <p className="evc-ninguem">Ainda ninguém respondeu. Sê o primeiro.</p>}
              {g.talvez.length > 0 && <><h3>Talvez {g.talvez.length}</h3><ul className="pessoas">{g.talvez.map((i) => <Pessoa key={i.id} i={i} />)}</ul></>}
              {g.nao.length > 0 && <><h3>Não vão {g.nao.length}</h3><ul className="pessoas">{g.nao.map((i) => <Pessoa key={i.id} i={i} />)}</ul></>}
            </>
          )}
        </div>
      </div>

      <div className="ev-posts">
        <div className="sechead" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 26 }}>Fotos e publicações</h2>
          <Link className="btn" href={`/fotos?evento=${e.id}`}>Publicar sobre este evento</Link>
        </div>
        {posts.length ? (
          <div className="feed-list">
            {posts.map((p) => <PostCard key={p.id} p={p} eu={eu} isAdmin={isAdmin} armed={armedPost === p.id} onApagar={() => apagarPost(p)} />)}
          </div>
        ) : <p className="empty">Ainda não há publicações sobre este evento.</p>}
      </div>

      {editar && <EventForm evento={e} onClose={() => { setEditar(false); router.refresh(); }} />}
      {pres && (
        <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && setPres(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Presenças em ${e.titulo}`}>
            <div className="stripe" />
            <div className="mbody">
              <div><p className="eyebrow" style={{ color: "var(--muted)" }}>Presenças</p><h3>{e.titulo}</h3></div>
              <PresencasEditor
                membros={membros}
                iniciais={(fechadas ? inscricoes.filter((i) => i.presente) : inscricoes.filter((i) => i.estado === "vai")).map((i) => i.user_id)}
                convidadosIniciais={convidados}
                respostas={Object.fromEntries(inscricoes.map((i) => [i.user_id, i.estado]))}
                onCancel={() => setPres(false)}
                onSave={async (ids, conv) => {
                  const { error } = await createClient().rpc("registar_presencas_evento", { p_evento: e.id, p_presentes: ids, p_convidados: conv });
                  if (error) return "Não foi possível guardar as presenças.";
                  setPres(false); router.refresh(); return null;
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
