"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { evAno, isPast, nextEvento, sortEventos, today } from "@/lib/dates";
import type { EstadoInscricao, Evento, Inscricao, Membro, Perfil } from "@/lib/types";
import EventForm from "./EventForm";
import PresencasEditor from "./PresencasEditor";
import EventoCartao from "./EventoCartao";
import { useEsc } from "./useEsc";
import { avisarInscricao } from "@/lib/avisos";

interface Props { eventos: Evento[]; inscricoes: Inscricao[]; perfil: Perfil | null; isMember: boolean; isAdmin: boolean; membros: Membro[] }

export default function EventsView({ eventos, inscricoes, perfil, isMember, isAdmin, membros }: Props) {
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
  const grupos: { ano: number; evs: Evento[] }[] = [];
  lista.forEach((e) => { const a = evAno(e); const g = grupos[grupos.length - 1]; if (g && g.ano === a) g.evs.push(e); else grupos.push({ ano: a, evs: [e] }); });
  function mudar(v: string) {
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
    else void avisarInscricao("evento", evId, antes);
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
      {!lista.length && <p className="empty">{vazio}</p>}
      {grupos.map((g, gi) => (
        <div key={g.ano} className="evs-grupo">
          {(gi > 0 || g.ano !== anoAtual) && <h3 className="evs-ano">{g.ano}</h3>}
          {g.evs.map((e) => {
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
          })}
        </div>
      ))}
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
