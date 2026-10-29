"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS, MESES, MESES_L, TIPOS, daysTo, evAno, evMes, fmtDate, isPast, parseDate } from "@/lib/dates";
import { avisarInscricao } from "@/lib/avisos";
import type { EstadoInscricao, Evento, Inscricao, Membro, Post } from "@/lib/types";
import Avatar from "./Avatar";
import EventForm from "./EventForm";
import PostCard from "./PostCard";
import PresencasEditor from "./PresencasEditor";
import Texto from "./Texto";

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

  const Pessoa = ({ i }: { i: Insc }) => (
    <Link href={`/atletas/${i.user_id}`} className={`pchip${i.user_id === eu.id ? " me" : ""}`}>
      <Avatar nome={i.perfis?.nome || "?"} path={i.perfis?.avatar_path} size={26} />
      <span>{i.perfis?.nome || "Membro"}</span>
    </Link>
  );

  return (
    <section className="view ev-page">
      <Link href="/eventos" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>‹ Eventos</Link>

      <header className={`ev-hero st-${e.estado}`}>
        <div className="bib" suppressHydrationWarning>
          {d ? (<><span className="n">{d.getDate()}</span><span className="m">{MESES[evMes(e) - 1]}</span><span className="w">{fmtDate(e.data, { weekday: "short" }).replace(".", "")}</span></>)
             : (<><span className="n">{String(evMes(e)).padStart(2, "0")}</span><span className="m">{MESES[evMes(e) - 1]}</span><span className="w num">{evAno(e)}</span></>)}
        </div>
        <div className="ev-hero-b">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="pill tipo">{TIPOS[e.tipo] ?? "Passeio"}</span>
            <span className={`pill ${e.estado}`}>{ESTADOS[e.estado] ?? "Proposta"}</span>
            {n !== null && n >= 0 && !closed && <span className="pill" suppressHydrationWarning>{n === 0 ? "É hoje" : n === 1 ? "Amanhã" : `Faltam ${n} dias`}</span>}
          </div>
          <h2 className="big" style={{ fontSize: "clamp(34px,7vw,60px)" }}>{e.titulo}</h2>
        </div>
      </header>

      <dl className="nums nums-auto">
        <div><dt>Data</dt><dd className="sm" suppressHydrationWarning>{e.data ? fmtDate(e.data, { weekday: "long", day: "numeric", month: "long" }) : `${MESES_L[evMes(e) - 1]} ${evAno(e)} · a definir`}</dd></div>
        {e.hora && <div><dt>Saída</dt><dd className="num">{e.hora.slice(0, 5)}</dd></div>}
        {e.partida && <div><dt>Encontro</dt><dd className="sm">{e.partida}</dd></div>}
        {e.km != null && <div><dt>Distância</dt><dd className="num">{e.km} km</dd></div>}
        {e.dmais != null && <div><dt>Desnível</dt><dd className="num">{e.dmais} m</dd></div>}
      </dl>

      <div className="ev-acoes">
        {!closed && souAtleta && (
          <div className="rsvp" style={{ border: 0, padding: 0 }}>
            <button className={`btn${mine === "vai" ? " on-go" : ""}`} onClick={() => rsvp(mine === "vai" ? null : "vai")}>Vou</button>
            <button className={`btn${mine === "talvez" ? " on-maybe" : ""}`} onClick={() => rsvp(mine === "talvez" ? null : "talvez")}>Talvez</button>
            <button className={`btn${mine === "nao" ? " on-no" : ""}`} onClick={() => rsvp(mine === "nao" ? null : "nao")}>Não vou</button>
          </div>
        )}
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
          {e.data && e.estado !== "cancelado" && <a className="btn" href={`/eventos/${e.id}/ics`}>Adicionar ao calendário</a>}
          <button type="button" className="btn ghost" onClick={copiar}>{copiado ? "Link copiado" : "Copiar link"}</button>
          {isAdmin && (passado || e.estado === "realizado") && e.estado !== "cancelado" && <button className="btn ghost" onClick={() => setPres(true)}>{fechadas ? "Editar presenças" : "Registar presenças"}</button>}
          {isAdmin && <button className="btn ghost" onClick={() => setEditar(true)}>Editar evento</button>}
        </span>
      </div>
      {msg && <div className="notice">{msg}</div>}

      {e.notas && <div className="panel"><span className="field-l">Informações</span><Texto texto={e.notas} /></div>}

      <div className="panel ev-part">
        {fechadas ? (
          <>
            <span className="field-l">Foram · {presentes.length + convidados.length}</span>
            <div className="pchips">
              {presentes.map((i) => <Pessoa key={i.id} i={i} />)}
              {convidados.map((c) => <span key={c} className="pchip guest"><Avatar nome={c} size={26} /><span>{c}</span></span>)}
              {!presentes.length && !convidados.length && <span className="empty">—</span>}
            </div>
          </>
        ) : (
          <>
            <div><span className="field-l" style={{ color: "var(--go)" }}>Vão · {g.vai.length}</span><div className="pchips">{g.vai.length ? g.vai.map((i) => <Pessoa key={i.id} i={i} />) : <span className="empty">Ainda ninguém. Sê o primeiro!</span>}</div></div>
            {g.talvez.length > 0 && <div><span className="field-l" style={{ color: "var(--maybe)" }}>Talvez · {g.talvez.length}</span><div className="pchips">{g.talvez.map((i) => <Pessoa key={i.id} i={i} />)}</div></div>}
            {g.nao.length > 0 && <div><span className="field-l" style={{ color: "var(--no)" }}>Não vão · {g.nao.length}</span><div className="pchips">{g.nao.map((i) => <Pessoa key={i.id} i={i} />)}</div></div>}
          </>
        )}
      </div>

      <div className="ev-posts">
        <div className="sechead" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 24 }}>Fotos e publicações</h2>
          <Link className="btn primary" href={`/fotos?evento=${e.id}`}>+ Publicar sobre este evento</Link>
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
          <div className="modal" role="dialog" aria-label={`Presenças em ${e.titulo}`}>
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
