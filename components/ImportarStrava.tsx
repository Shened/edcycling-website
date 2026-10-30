"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { atividadesStrava, importarStrava, juntarStrava, type ItemStrava, type ListaStrava } from "@/app/strava-actions";
import { TIPOS_ATIVIDADE } from "@/lib/atividades";
import { fmtDuracao, fmtKm } from "@/lib/gpx";
import { marcar } from "@/lib/metricas";

type Item = ItemStrava & { pagina: number };

const fmtDia = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });

export function BotaoLigarStrava({ volta, children = "Ligar ao Strava" }: { volta?: string; children?: React.ReactNode }) {
  return (
    <a href={`/api/strava/ligar${volta ? `?volta=${encodeURIComponent(volta)}` : ""}`} className="btn stv-ligar">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M15.4 17.9 13.3 13.7h-3.1l5.2 10.3 5.2-10.3h-3.1zM10.3 2 3.3 15.7h4.1l2.9-5.6 2.9 5.6h4.1z" /></svg>
      {children}
    </a>
  );
}

// Lista as últimas atividades do Strava e importa as escolhidas para o site.
export default function ImportarStrava({ onVoltar, onFeito }: { onVoltar: () => void; onFeito: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const [estado, setEstado] = useState<ListaStrava | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar(p: number) {
    setBusy(true);
    const r = await atividadesStrava(p);
    setBusy(false);
    setEstado(r);
    if (r.estado !== "ok") return;
    const novos = r.itens.map((x) => ({ ...x, pagina: p }));
    setItens((v) => (p === 1 ? novos : [...v, ...novos]));
    setMais(r.mais);
    setPagina(p);
    // Por omissão ficam escolhidas as que ainda não estão no site.
    if (p === 1) setSel(new Set(novos.filter((x) => !x.importada && !x.parecida).slice(0, 10).map((x) => x.id)));
  }
  useEffect(() => { carregar(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function alternar(id: number) {
    setMsg("");
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function importar() {
    if (!sel.size) return;
    setBusy(true); setMsg("");
    const porPagina = new Map<number, number[]>();
    for (const it of itens) if (sel.has(it.id)) porPagina.set(it.pagina, [...(porPagina.get(it.pagina) ?? []), it.id]);
    let total = 0;
    for (const [p, ids] of porPagina) {
      const r = await importarStrava(ids, p);
      if (!r.ok) { setBusy(false); setMsg(r.msg ?? "Não foi possível importar."); return; }
      total += r.n;
    }
    setItens((v) => v.map((x) => (sel.has(x.id) ? { ...x, importada: true } : x)));
    setSel(new Set());
    setBusy(false);
    setMsg(total === 1 ? "1 atividade importada." : `${total} atividades importadas.`);
    marcar("Atividade importada do Strava", { n: total });
    router.refresh();
  }

  async function juntar(x: Item) {
    if (!x.parecida) return;
    setBusy(true); setMsg("");
    const r = await juntarStrava(x.id, x.parecida.id, x.pagina);
    setBusy(false);
    if (!r.ok) { setMsg(r.msg ?? "Não foi possível juntar."); return; }
    setItens((v) => v.map((y) => (y.id === x.id ? { ...y, importada: true, parecida: null } : y)));
    setSel((s) => { const n = new Set(s); n.delete(x.id); return n; });
    setMsg(`Ficou ligada a “${x.parecida.titulo}”, sem duplicar.`);
    router.refresh();
  }

  const novas = itens.filter((x) => !x.importada && !x.parecida);
  const repetidas = itens.filter((x) => sel.has(x.id) && x.parecida).length;
  return (
    <div className="stv">
      <div className="stv-cab">
        <h3 id="atvT">Importar do Strava</h3>
        <button type="button" className="btn ghost" onClick={onVoltar}>‹ Registar à mão</button>
      </div>

      {!estado && <p className="empty stv-load"><span className="spinner" aria-hidden="true" /> A falar com o Strava…</p>}

      {estado?.estado === "desligado" && (
        <div className="stv-vazio">
          <p>Liga a tua conta do Strava uma vez e passas a importar as atividades daqui, sem ficheiros.</p>
          <BotaoLigarStrava volta={path} />
        </div>
      )}
      {estado?.estado === "sem-config" && <p className="notice">A ligação ao Strava ainda não está ativa no site. Fala com um admin.</p>}
      {estado?.estado === "limite" && <p className="notice">O Strava está a limitar os pedidos neste momento. Tenta daqui a 15 minutos.</p>}
      {estado?.estado === "erro" && <p className="notice">{estado.msg ?? "Algo correu mal."}</p>}

      {estado?.estado === "ok" && (
        <>
          {itens.length === 0 ? <p className="empty">Não há atividades no teu Strava.</p> : (
            <>
              <div className="stv-barra">
                <span className="hint">{sel.size ? `${sel.size} escolhida${sel.size === 1 ? "" : "s"}` : novas.length ? "Nenhuma escolhida" : "Não há atividades novas."}</span>
                {novas.length > 0 && (
                  <button type="button" className="btn ghost" onClick={() => setSel(sel.size ? new Set() : new Set(novas.map((x) => x.id)))}>
                    {sel.size ? "Limpar escolha" : "Escolher todas as novas"}
                  </button>
                )}
              </div>
              <ul className="stv-lista">
                {itens.map((x) => (
                  <li key={x.id} className={x.parecida ? "dup" : undefined}>
                    <label className={`stv-item${x.importada ? " feito" : ""}`}>
                      <input type="checkbox" checked={x.importada || sel.has(x.id)} disabled={x.importada || busy} onChange={() => alternar(x.id)} />
                      <span className="stv-t">
                        <b>{x.titulo}</b>
                        <span>{fmtDia(x.data)}{x.hora ? ` · ${x.hora}` : ""} · {TIPOS_ATIVIDADE[x.tipo] ?? "Outro"}{x.privada ? " · só tu vês" : ""}</span>
                      </span>
                      <span className="stv-n num">
                        {x.km > 0 && <>{fmtKm(x.km)} km</>}
                        {x.duracao_s ? <small>{fmtDuracao(x.duracao_s)}</small> : null}
                      </span>
                      {x.importada && <span className="stv-ok">No site</span>}
                    </label>
                    {x.parecida && (
                      <div className="stv-dup">
                        <span>Parece já estar no site como <b>“{x.parecida.titulo}”</b>.</span>
                        <button type="button" className="btn" disabled={busy} onClick={() => juntar(x)}>É a mesma, juntar</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {mais && <button type="button" className="btn" disabled={busy} onClick={() => carregar(pagina + 1)}>Ver mais antigas</button>}
            </>
          )}
          {repetidas > 0 && <div className="notice" role="status">{repetidas === 1 ? "1 das escolhidas parece" : `${repetidas} das escolhidas parecem`} já estar no site. Se importares, fica repetida; usa “É a mesma, juntar” para evitar.</div>}
          {msg && <div className={/importad|sem duplicar/.test(msg) ? "ok-msg" : "notice"} role="status">{msg}</div>}
          <div className="stv-acoes">
            <span className="stv-pw">Dados do Strava</span>
            <button type="button" className="btn ghost" onClick={onFeito} disabled={busy}>Fechar</button>
            <button type="button" className="btn primary" disabled={busy || !sel.size} onClick={importar} aria-busy={busy}>
              {busy ? <><span className="spinner" aria-hidden="true" />A importar…</> : `Importar${sel.size ? ` (${sel.size})` : ""}`}
            </button>
          </div>
        </>
      )}
      {estado && estado.estado !== "ok" && (
        <div className="stv-acoes"><button type="button" className="btn ghost" onClick={onFeito}>Fechar</button></div>
      )}
    </div>
  );
}
