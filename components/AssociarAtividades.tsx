"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import { fmtKm } from "@/lib/gpx";
import { marcar } from "@/lib/metricas";
import type { Candidato, Pendente } from "@/lib/associar";

// "Esta volta foi no treino X?" — liga a atividade do atleta ao treino/evento do mesmo dia.
// Assim cada um conta os seus km (quem vem de mais longe faz mais) e fica marcado como presente.
export default function AssociarAtividades({ pendentes, userId }: { pendentes: Pendente[]; userId: string }) {
  const router = useRouter();
  const [feitas, setFeitas] = useState<Record<string, { c: Candidato | null }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [todas, setTodas] = useState(false);

  const visiveis = pendentes.filter((p) => !(p.id in feitas) || feitas[p.id]);
  if (!pendentes.length) return null;

  async function responder(p: Pendente, c: Candidato | null) {
    setBusy(p.id); setErr("");
    const sb = createClient();
    const { error } = await sb.from("atividades").update(
      c ? { evento_id: c.k === "evento" ? c.id : null, treino_id: c.k === "treino" ? c.id : null, associacao_recusada: false } : { associacao_recusada: true },
    ).eq("id", p.id).eq("user_id", userId);
    if (error) { setBusy(null); setErr(/evento_id|treino_id|associacao/.test(error.message) ? "Falta correr a migration 034 no Supabase." : "Não foi possível guardar."); return; }
    // Fica também marcado como "vou" no treino/evento, se ainda não estava.
    if (c && !c.vou) {
      if (c.k === "treino") await sb.rpc("marcar_treino", { p_treino: c.id, p_estado: "vai" });
      else await sb.from("inscricoes").upsert({ evento_id: c.id, user_id: userId, estado: "vai", updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" });
    }
    setBusy(null);
    setFeitas((f) => ({ ...f, [p.id]: { c } }));
    marcar("Atividade associada", { resposta: c ? c.k : "nao" });
    router.refresh();
  }
  async function desfazer(p: Pendente) {
    setBusy(p.id);
    await createClient().from("atividades").update({ evento_id: null, treino_id: null, associacao_recusada: false }).eq("id", p.id).eq("user_id", userId);
    setBusy(null);
    setFeitas((f) => { const n = { ...f }; delete n[p.id]; return n; });
    router.refresh();
  }

  const lista = todas ? visiveis : visiveis.slice(0, 2);
  return (
    <section className="assoc" aria-labelledby="assocT">
      <h3 id="assocT">Estas voltas foram com a equipa?</h3>
      <p className="hint" style={{ margin: 0 }}>Associa a tua atividade ao treino ou evento: contam os teus km (de casa, com desvios…) e ficas marcado como presente.</p>
      <ul className="assoc-l">
        {lista.map((p) => {
          const r = feitas[p.id];
          return (
            <li key={p.id} className="assoc-i">
              <div className="assoc-a">
                <b>{p.titulo}</b>
                <span suppressHydrationWarning>{fmtDate(p.data, { weekday: "long", day: "numeric", month: "short" })}{p.hora ? ` · ${p.hora.slice(0, 5)}` : ""}{p.km != null ? ` · ${fmtKm(Number(p.km))} km` : ""}</span>
              </div>
              {r ? (
                <div className="assoc-ok" role="status">
                  <span>{r.c ? <>Associada a <b>{r.c.titulo}</b> ✓</> : "Ok, fica como volta tua."}</span>
                  <button type="button" className="btn ghost" disabled={busy === p.id} onClick={() => desfazer(p)}>Desfazer</button>
                </div>
              ) : (
                <div className="assoc-b">
                  {p.candidatos.map((c) => (
                    <button key={c.id} type="button" className="btn primary" disabled={busy === p.id} onClick={() => responder(p, c)}>
                      Sim, no {c.k === "treino" ? "treino" : "evento"} <b>&nbsp;{c.titulo}</b>{c.hora ? ` (${c.hora.slice(0, 5)})` : ""}
                    </button>
                  ))}
                  <button type="button" className="btn ghost" disabled={busy === p.id} onClick={() => responder(p, null)}>Não, foi outra volta</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!todas && visiveis.length > 2 && <button type="button" className="btn ghost" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setTodas(true)}>Ver mais {visiveis.length - 2}</button>}
      {err && <div className="notice" role="alert">{err}</div>}
    </section>
  );
}
