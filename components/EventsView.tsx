"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESES, evAno, evMes, fmtDate, isPast, nextEvento, parseDate, sortEventos, today } from "@/lib/dates";
import { fmtDuracao, fmtKm } from "@/lib/gpx";
import { TIPOS_ATIVIDADE } from "@/lib/atividades";
import AtividadeForm from "./AtividadeForm";
import type { Atividade, EstadoInscricao, Evento, Inscricao, Membro, Perfil } from "@/lib/types";
import EventForm from "./EventForm";
import PresencasEditor from "./PresencasEditor";
import EventoCartao from "./EventoCartao";
import { useEsc } from "./useEsc";
import { marcar } from "@/lib/metricas";
import { avisarInscricao } from "@/lib/avisos";

interface Props { eventos: Evento[]; inscricoes: Inscricao[]; perfil: Perfil | null; isMember: boolean; isAdmin: boolean; membros: Membro[]; atividades?: Atividade[] }

export default function EventsView({ eventos, inscricoes, perfil, isMember, isAdmin, membros, atividades = [] }: Props) {
  const [atvEdit, setAtvEdit] = useState<Atividade | null>(null);
  const [presEv, setPresEv] = useState<Evento | null>(null);
  const router = useRouter();
  const sorted = useMemo(() => sortEventos(eventos), [eventos]);
  const params = useSearchParams();
  const pathname = usePathname();
  const ver = (params.get("ver") as "proximos" | "passados" | "todos" | null) ?? "proximos";
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const up = sorted.filter((e) => !isPast(e));
  const past = sorted.filter(isPast).reverse();
  const lista = ver === "passados" ? past : ver === "todos" ? sorted : up;
  const prox = nextEvento(eventos);
  const souAtleta = !!perfil && membros.some((m) => m.id === perfil.id);
  const anoAtual = today().getFullYear();
  // As atividades pessoais (só do próprio) entram em Passados e Todos, pela ordem das datas.
  type Item = { k: "e"; e: Evento; ano: number; chave: string } | { k: "a"; a: Atividade; ano: number; chave: string };
  const chaveEv = (e: Evento) => e.data ?? `${evAno(e)}-${String(evMes(e)).padStart(2, "0")}-99`;
  const itens: Item[] = lista.map((e) => ({ k: "e" as const, e, ano: evAno(e), chave: chaveEv(e) }));
  if (ver !== "proximos" && atividades.length) {
    atividades.forEach((a) => itens.push({ k: "a", a, ano: +a.data.slice(0, 4), chave: `${a.data}${a.hora ?? ""}` }));
    itens.sort((x, y) => (ver === "passados" ? y.chave.localeCompare(x.chave) : x.chave.localeCompare(y.chave)));
  }
  // Passados e Todos: o passado mostra-se por semanas (4 de cada vez), para a lista não crescer sem fim.
  const [semanas, setSemanas] = useState(4);
  useEffect(() => setSemanas(4), [ver]);
  const hojeIso = (() => { const d = today(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const passado = (it: Item) => (it.k === "a" ? true : isPast(it.e));
  const iniSemana = (chave: string) => {
    const [y, m, dd] = [+chave.slice(0, 4), +chave.slice(5, 7), Math.min(28, +chave.slice(8, 10) || 1)];
    const d = new Date(y, m - 1, chave.slice(8, 10) === "99" ? 1 : +chave.slice(8, 10) || dd);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  let escondidos = 0;
  if (ver !== "proximos") {
    const semanasPassadas = [...new Set(itens.filter(passado).map((it) => iniSemana(it.chave)))].sort().reverse();
    const limite = semanasPassadas[semanas - 1];
    if (limite) {
      const antes = itens.length;
      const visiveis = itens.filter((it) => !passado(it) || iniSemana(it.chave) >= limite);
      escondidos = antes - visiveis.length;
      itens.splice(0, itens.length, ...visiveis);
    }
  }
  const semanaTxt = (ini: string) => {
    const a = new Date(ini + "T12:00:00"), b = new Date(a); b.setDate(a.getDate() + 6);
    const f = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]}`;
    return ini <= hojeIso && hojeIso <= `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}` ? "Esta semana" : `Semana de ${f(a)} a ${f(b)}`;
  };
  const grupos: { ano: number; itens: Item[] }[] = [];
  itens.forEach((it) => { const g = grupos[grupos.length - 1]; if (g && g.ano === it.ano) g.itens.push(it); else grupos.push({ ano: it.ano, itens: [it] }); });
  function mudar(v: string) {
    marcar("Separador de eventos", { ver: v });
    const q = new URLSearchParams(params.toString());
    if (v === "proximos") q.delete("ver"); else q.set("ver", v);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  }

  // Resposta otimista: o botão muda logo, o servidor confirma depois.
  const [otimista, setOtimista] = useState<Record<string, EstadoInscricao | null>>({});
  useEffect(() => setOtimista({}), [inscricoes]);
  const fecharPres = useCallback(() => setPresEv(null), []);
  useEsc(!!presEv, fecharPres);

  async function rsvp(evId: string, estado: EstadoInscricao | null) {
    if (!perfil) return;
    const antes = inscricoes.find((i) => i.evento_id === evId && i.user_id === perfil.id)?.estado ?? null;
    setOtimista((o) => ({ ...o, [evId]: estado }));
    setPending(evId); setMsg("");
    const sb = createClient();
    const { error } = estado
      ? await sb.from("inscricoes").upsert({ evento_id: evId, user_id: perfil.id, estado, updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" })
      : await sb.from("inscricoes").delete().eq("evento_id", evId).eq("user_id", perfil.id);
    setPending(null);
    if (error) { setMsg("Não foi possível guardar a inscrição. Tenta outra vez."); setOtimista((o) => { const n = { ...o }; delete n[evId]; return n; }); }
    else { void avisarInscricao("evento", evId, antes); marcar("Resposta a evento", { resposta: estado ?? "retirou", onde: "lista" }); }
    router.refresh();
  }
  const vazio = ver === "passados" ? "Ainda não há eventos passados." : ver === "todos" ? "Ainda não há eventos." : "Sem eventos marcados.";
  return (
    <section className="view evs">
      {msg && <div className="notice" role="status">{msg}</div>}
      <div className="evs-cab">
        <h2>Eventos</h2>
        <div className="evs-ctrl">
          <div className="tabseg" role="tablist" aria-label="Que eventos mostrar">
            {([["proximos", "Próximos"], ["passados", "Passados"], ["todos", "Todos"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={ver === k} onClick={() => mudar(k)}>{l}</button>
            ))}
          </div>
          {isAdmin && <button className="btn primary evs-novo" onClick={() => setEditing(null)} aria-label="Criar evento"><span aria-hidden="true">+</span><span className="evs-novo-t"> Criar evento</span></button>}
        </div>
      </div>
      {!itens.length && <p className="empty">{vazio}</p>}
      {ver !== "proximos" && atividades.length > 0 && <p className="hint evs-nota">Inclui as tuas atividades pessoais, com contorno lilás. Só tu as vês aqui.</p>}
      {grupos.map((g, gi) => (
        <div key={g.ano} className="evs-grupo">
          {(gi > 0 || g.ano !== anoAtual) && <h3 className="evs-ano">{g.ano}</h3>}
          {g.itens.map((it, ii) => {
            const sem = ver !== "proximos" && passado(it) ? iniSemana(it.chave) : null;
            const ant = ii > 0 ? g.itens[ii - 1] : null;
            const cab = sem && (!ant || !passado(ant) || iniSemana(ant.chave) !== sem) ? <p className="evs-semana" key={`s-${sem}-${ii}`} suppressHydrationWarning>{semanaTxt(sem)}</p> : null;
            const el = (() => {
            if (it.k === "a") return <AtvCartao key={it.a.id} a={it.a} onEdit={() => setAtvEdit(it.a)} />;
            const e = it.e;
            const ps = inscricoes.filter((i) => i.evento_id === e.id);
            const mine = e.id in otimista ? otimista[e.id] : perfil ? ps.find((p) => p.user_id === perfil.id)?.estado ?? null : null;
            const acoes = isAdmin ? [
              { label: "Editar evento", onClick: () => setEditing(e) },
              ...((isPast(e) || e.estado === "realizado") && e.estado !== "cancelado" ? [{ label: e.presencas_fechadas ? "Editar presenças" : "Registar presenças", onClick: () => setPresEv(e) }] : []),
            ] : [];
            return (
              <EventoCartao
                key={e.id}
                e={e}
                insc={ps}
                euId={perfil?.id}
                mine={mine}
                podeResponder={isMember && souAtleta}
                aviso={isMember && !souAtleta ? "Conta de gestão: não responde como atleta." : undefined}
                busy={pending === e.id}
                onPick={(v) => rsvp(e.id, v)}
                acoes={acoes}
                proximo={ver === "proximos" && prox?.id === e.id}
              />
            );
            })();
            return cab ? [cab, el] : el;
          })}
        </div>
      ))}
      {escondidos > 0 && (
        <button type="button" className="btn evs-mais" onClick={() => setSemanas((n) => n + 4)}>
          Mostrar mais 4 semanas <span className="muted">({escondidos} mais antig{escondidos === 1 ? "o" : "os"})</span>
        </button>
      )}
      {atvEdit && perfil && <AtividadeForm userId={perfil.id} atividade={atvEdit} onClose={() => setAtvEdit(null)} />}
      {editing !== undefined && <EventForm evento={editing} onClose={() => setEditing(undefined)} />}
      {presEv && (() => {
        const ps = inscricoes.filter((i) => i.evento_id === presEv.id);
        const iniciais = (presEv.presencas_fechadas ? ps.filter((p) => p.presente) : ps.filter((p) => p.estado === "vai")).map((p) => p.user_id);
        return (
          <div className="overlay" onClick={(ev) => ev.target === ev.currentTarget && setPresEv(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={`Presenças em ${presEv.titulo}`}>
              <div className="stripe" />
              <div className="mbody">
                <div><p className="eyebrow" style={{ color: "var(--muted)" }}>Presenças</p><h3>{presEv.titulo}</h3></div>
                <PresencasEditor
                  membros={membros}
                  iniciais={iniciais}
                  convidadosIniciais={presEv.convidados ?? []}
                  respostas={Object.fromEntries(ps.map((p) => [p.user_id, p.estado]))}
                  onCancel={() => setPresEv(null)}
                  onSave={async (ids, convidados) => {
                    const { error } = await createClient().rpc("registar_presencas_evento", { p_evento: presEv.id, p_presentes: ids, p_convidados: convidados });
                    if (error) return "Não foi possível guardar as presenças.";
                    setPresEv(null);
                    router.refresh();
                    return null;
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

// Atividade pessoal na lista de eventos (só o próprio a vê).
function AtvCartao({ a, onEdit }: { a: Atividade; onEdit: () => void }) {
  const d = parseDate(a.data);
  const det = [TIPOS_ATIVIDADE[a.tipo] ?? "Atividade", a.km ? `${fmtKm(Number(a.km))} km` : "", a.dmais ? `${a.dmais.toLocaleString("pt-PT")} m D+` : "", a.duracao_s ? fmtDuracao(a.duracao_s) : ""].filter(Boolean);
  return (
    <article className="atvc">
      <div className="atvc-d" suppressHydrationWarning>
        <span className="atvc-n">{d?.getDate()}</span>
        <span className="atvc-m">{d ? MESES[d.getMonth()] : ""}</span>
      </div>
      <div className="atvc-b">
        <p className="atvc-k" suppressHydrationWarning>A tua atividade, {fmtDate(a.data, { weekday: "long" })}{a.hora ? ` às ${a.hora.slice(0, 5)}` : ""}</p>
        <h3>{a.titulo}</h3>
        <ul className="atvc-st">{det.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <button type="button" className="btn ghost atvc-ed" onClick={onEdit}>Editar</button>
    </article>
  );
}
