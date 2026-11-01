"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { avisarAlteracao, avisarVoto } from "@/lib/avisos";
import { marcar } from "@/lib/metricas";
import type { Evento, Voto, VotoProposta } from "@/lib/types";
import Avatar from "./Avatar";

const OPCOES: { k: Voto; l: string; e: string }[] = [
  { k: "sim", l: "Sim", e: "👍" },
  { k: "talvez", l: "Talvez", e: "🤔" },
  { k: "nao", l: "Não", e: "👎" },
];

// Votação "Vale a pena fazer?" numa proposta de evento. Os admins confirmam ou rejeitam aqui.
export default function VotacaoProposta({ evento: e, votos, euId, podeVotar, isAdmin, compacto }: {
  evento: Evento; votos: VotoProposta[]; euId?: string; podeVotar: boolean; isAdmin: boolean; compacto?: boolean;
}) {
  const router = useRouter();
  const meu = votos.find((v) => v.user_id === euId) ?? null;
  const [mine, setMine] = useState<Voto | null>(meu?.voto ?? null);
  const [coment, setComent] = useState(meu?.comentario ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [armed, setArmed] = useState<"" | "rejeitar">("");
  useEffect(() => { setMine(meu?.voto ?? null); setComent(meu?.comentario ?? ""); }, [meu?.voto, meu?.comentario]);

  // Contagem com o meu voto otimista.
  const outros = votos.filter((v) => v.user_id !== euId);
  const cont = { sim: 0, talvez: 0, nao: 0 } as Record<Voto, number>;
  outros.forEach((v) => cont[v.voto]++);
  if (mine) cont[mine]++;
  const total = cont.sim + cont.talvez + cont.nao;

  async function votar(v: Voto | null, comentario = coment) {
    if (!euId || busy) return;
    const antes = mine;
    setMine(v); setBusy(true); setErr("");
    const sb = createClient();
    const { error } = v
      ? await sb.from("evento_votos").upsert({ evento_id: e.id, user_id: euId, voto: v, comentario: comentario.trim() || null, updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" })
      : await sb.from("evento_votos").delete().eq("evento_id", e.id).eq("user_id", euId);
    setBusy(false);
    if (error) { setMine(antes); setErr(/evento_votos/.test(error.message) ? "Falta correr a migration 026 no Supabase." : "Não foi possível guardar o voto."); return; }
    if (v && !antes) void avisarVoto(e.id);
    marcar("Voto em proposta", { voto: v ?? "retirou" });
    router.refresh();
  }

  async function decidir(estado: "confirmado" | "cancelado") {
    if (estado === "cancelado" && armed !== "rejeitar") { setArmed("rejeitar"); return; }
    setBusy(true); setErr("");
    const { error } = await createClient().from("eventos").update({ estado, updated_at: new Date().toISOString() }).eq("id", e.id);
    setBusy(false);
    if (error) { setErr("Não foi possível mudar o estado."); return; }
    void avisarAlteracao("evento", e.id, { data: e.data, hora: e.hora, partida: e.partida, estado: "proposta" });
    marcar("Proposta decidida", { estado });
    router.refresh();
  }

  const barra = (k: Voto) => (total ? Math.round((cont[k] / total) * 100) : 0);
  return (
    <div className={`vot${compacto ? " compacto" : ""}`}>
      <div className="vot-h">
        <b>Vale a pena fazer?</b>
        <span className="muted">{total ? `${total} voto${total === 1 ? "" : "s"}` : "Ainda sem votos"}</span>
      </div>
      {podeVotar ? (
        <div className="vot-op" role="group" aria-label={`O teu voto em ${e.titulo}`}>
          {OPCOES.map((o) => (
            <button key={o.k} type="button" className={`btn vot-b v-${o.k}${mine === o.k ? " on" : ""}`} aria-pressed={mine === o.k} disabled={busy} onClick={() => votar(mine === o.k ? null : o.k)}>
              <span aria-hidden="true">{o.e}</span> {o.l}{total > 0 && <span className="vot-n">{cont[o.k]}</span>}
            </button>
          ))}
        </div>
      ) : total > 0 ? (
        <p className="vot-res">{OPCOES.filter((o) => cont[o.k]).map((o) => `${o.e} ${cont[o.k]}`).join("  ·  ")}</p>
      ) : null}
      {total > 0 && (
        <div className="vot-barra" aria-hidden="true">
          {OPCOES.map((o) => barra(o.k) > 0 && <span key={o.k} className={`v-${o.k}`} style={{ width: `${barra(o.k)}%` }} />)}
        </div>
      )}

      {!compacto && podeVotar && mine && (
        <form className="vot-com" onSubmit={(ev) => { ev.preventDefault(); void votar(mine, coment); }}>
          <label htmlFor="votCom" className="sr-only">Comentário ao teu voto</label>
          <input id="votCom" maxLength={300} placeholder="Comentário (opcional): ex.: só se for de manhã" value={coment} onChange={(ev) => setComent(ev.target.value)} />
          <button type="submit" className="btn" disabled={busy || coment.trim() === (meu?.comentario ?? "")}>Guardar</button>
        </form>
      )}

      {!compacto && votos.length > 0 && (
        <ul className="vot-quem">
          {OPCOES.flatMap((o) => votos.filter((v) => v.voto === o.k).map((v) => (
            <li key={v.user_id}>
              <Avatar nome={v.perfis?.nome || "?"} path={v.perfis?.avatar_path} size={30} />
              <span><b>{v.perfis?.nome || "Atleta"}{v.user_id === euId ? " (tu)" : ""}</b> <span aria-label={o.l}>{o.e}</span>{v.comentario && <span className="vot-c">{v.comentario}</span>}</span>
            </li>
          )))}
        </ul>
      )}

      {isAdmin && (
        <div className="vot-adm">
          <button type="button" className="btn primary" disabled={busy} onClick={() => decidir("confirmado")}>Confirmar evento</button>
          <button type="button" className="btn ghost danger" disabled={busy} onClick={() => decidir("cancelado")}>{armed === "rejeitar" ? "Confirmar: rejeitar" : "Rejeitar"}</button>
        </div>
      )}
      {err && <div className="notice" role="alert">{err}</div>}
    </div>
  );
}
