"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import { avisarDataDecidida } from "@/lib/avisos";
import { marcar } from "@/lib/metricas";
import type { Evento, Membro, OpcaoData } from "@/lib/types";

const quandoOp = (o: OpcaoData) => `${fmtDate(o.data, { weekday: "short", day: "numeric", month: "short" })}${o.hora ? ` · ${o.hora.slice(0, 5)}` : ""}`;

// Votação de datas: cada atleta marca todas as datas que lhe dão jeito; um admin escolhe a data final.
export default function VotacaoDatas({ evento: e, opcoes, euId, membros, podeVotar, isAdmin, compacto }: {
  evento: Evento; opcoes: OpcaoData[]; euId?: string; membros: Membro[]; podeVotar: boolean; isAdmin: boolean; compacto?: boolean;
}) {
  const router = useRouter();
  const doServidor = new Set(opcoes.filter((o) => o.evento_opcao_votos?.some((v) => v.user_id === euId)).map((o) => o.id));
  const chaveServ = [...doServidor].sort().join(",");
  const [meus, setMeus] = useState<Set<string>>(doServidor);
  useEffect(() => setMeus(new Set(chaveServ ? chaveServ.split(",") : [])), [chaveServ]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [armed, setArmed] = useState<string | null>(null);

  const ord = [...opcoes].sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? "")));
  const votosDe = (o: OpcaoData) => {
    const outros = (o.evento_opcao_votos ?? []).map((v) => v.user_id).filter((u) => u !== euId);
    return meus.has(o.id) && euId ? [euId, ...outros] : outros;
  };
  const max = Math.max(1, ...ord.map((o) => votosDe(o).length));
  const melhor = ord.some((o) => votosDe(o).length) ? max : -1;
  const quemVotou = new Set(ord.flatMap(votosDe)).size;
  const nome = (id: string) => (id === euId ? "tu" : (membros.find((m) => m.id === id)?.nome || "Atleta").split(" ")[0]);

  async function alternar(o: OpcaoData) {
    if (!euId || busy) return;
    const tinha = meus.has(o.id);
    const novo = new Set(meus); if (tinha) novo.delete(o.id); else novo.add(o.id);
    setMeus(novo); setBusy(o.id); setErr("");
    const sb = createClient();
    const { error } = tinha
      ? await sb.from("evento_opcao_votos").delete().eq("opcao_id", o.id).eq("user_id", euId)
      : await sb.from("evento_opcao_votos").insert({ opcao_id: o.id, evento_id: e.id, user_id: euId });
    setBusy(null);
    if (error) { setMeus(meus); setErr("Não foi possível guardar. A votação pode já ter fechado."); return; }
    marcar("Voto em data", { acao: tinha ? "tirou" : "marcou" });
    router.refresh();
  }

  async function escolher(o: OpcaoData) {
    if (armed !== o.id) { setArmed(o.id); return; }
    setBusy(o.id); setErr("");
    const { error } = await createClient().from("eventos").update({
      data: o.data, mes: +o.data.slice(5, 7), ano: +o.data.slice(0, 4),
      ...(o.hora ? { hora: o.hora.slice(0, 5) } : {}),
      sondagem: "fechada", updated_at: new Date().toISOString(),
    }).eq("id", e.id);
    setBusy(null);
    if (error) { setErr("Não foi possível marcar a data."); return; }
    void avisarDataDecidida(e.id);
    marcar("Data escolhida por votação", {});
    router.refresh();
  }

  if (!ord.length) return compacto ? null : <p className="empty">Ainda não há datas para votar.</p>;

  if (compacto) {
    const top = ord.filter((o) => votosDe(o).length === melhor);
    return (
      <div className="vd compacto">
        <div className="vd-h"><b>Data em votação{e.sondagem_ate ? <span className="muted" suppressHydrationWarning> · até {fmtDate(e.sondagem_ate, { day: "numeric", month: "short" })}</span> : null}</b><span className="muted">{quemVotou ? `${quemVotou} ${quemVotou === 1 ? "atleta votou" : "atletas votaram"}` : "Ainda sem votos"}</span></div>
        <div className="vd-chips" role="group" aria-label="Datas que te dão jeito">
          {ord.map((o) => (
            <button key={o.id} type="button" className={`vd-chip${meus.has(o.id) ? " on" : ""}${votosDe(o).length === melhor ? " top" : ""}`}
              aria-pressed={meus.has(o.id)} disabled={!podeVotar || busy === o.id} onClick={() => alternar(o)} suppressHydrationWarning>
              {quandoOp(o)} <span className="vd-n">{votosDe(o).length}</span>
            </button>
          ))}
        </div>
        <p className="vd-dica">{podeVotar ? "Toca nas datas que te dão jeito (podes escolher várias)." : ""}{top.length === 1 && melhor > 0 ? ` A mais votada: ${quandoOp(top[0])}.` : ""} <Link href={`/eventos/${e.id}`}>Ver quem pode</Link></p>
        {err && <div className="notice" role="alert">{err}</div>}
      </div>
    );
  }

  return (
    <div className="vd">
      <div className="vd-h"><b>Que dia te dá jeito?</b><span className="muted">{quemVotou ? `${quemVotou} ${quemVotou === 1 ? "atleta votou" : "atletas votaram"}` : "Ainda sem votos"}</span></div>
      {podeVotar && <p className="vd-dica" style={{ margin: 0 }}>Marca todas as datas em que podes ir. A data final é escolhida por um admin.{e.sondagem_ate ? <> Votação até <b suppressHydrationWarning>{fmtDate(e.sondagem_ate, { weekday: "long", day: "numeric", month: "long" })}</b>.</> : null}</p>}
      <ul className="vd-lista">
        {ord.map((o) => {
          const vs = votosDe(o);
          return (
            <li key={o.id} className={`vd-op${vs.length === melhor ? " top" : ""}`}>
              <label className="vd-l">
                <input type="checkbox" checked={meus.has(o.id)} disabled={!podeVotar || busy === o.id} onChange={() => alternar(o)} />
                <span className="vd-t">
                  <b suppressHydrationWarning>{fmtDate(o.data, { weekday: "long", day: "numeric", month: "long" })}{o.hora ? ` · ${o.hora.slice(0, 5)}` : ""}</b>
                  {o.nota && <span>{o.nota}</span>}
                  <span className="vd-quem">{vs.length ? vs.map(nome).join(", ") : "Ninguém ainda"}</span>
                </span>
                <span className="vd-n grande num">{vs.length}</span>
              </label>
              <span className="vd-barra" aria-hidden="true"><span style={{ width: `${(vs.length / max) * 100}%` }} /></span>
              {isAdmin && (
                <button type="button" className={`btn${armed === o.id ? " primary" : " ghost"} vd-esc`} disabled={!!busy} onClick={() => escolher(o)}>
                  {armed === o.id ? "Confirmar: fica esta data" : "Escolher esta data"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {err && <div className="notice" role="alert">{err}</div>}
    </div>
  );
}
