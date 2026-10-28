"use client";
import { useEffect, useMemo, useState } from "react";
import { MESES, MESES_L } from "@/lib/dates";
import { fmtKm } from "@/lib/gpx";
import { calcular, passoEixo, type InscricaoMin, type LinhaAtleta } from "@/lib/stats";
import type { Evento, Membro, Treino } from "@/lib/types";
import { TIPOS_TREINO } from "./TreinoForm";

type Col = "nome" | "treinos" | "presenca" | "km" | "dmais" | "segundos" | "eventos" | "kmCorrida" | "kmNatacao";
const horas = (s: number) => (s ? `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, "0")}` : "—");
const isoHoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

interface Props { treinos: Treino[]; eventos: Evento[]; inscricoes: InscricaoMin[]; membros: Membro[]; userId: string }

export default function Estatisticas({ treinos, eventos, inscricoes, membros, userId }: Props) {
  const [hoje, setHoje] = useState("");
  useEffect(() => setHoje(isoHoje()), []);
  const anoAtual = new Date().getFullYear();
  const anos = useMemo(() => {
    const s = new Set<number>([anoAtual]);
    treinos.forEach((t) => s.add(+t.data.slice(0, 4)));
    eventos.forEach((e) => s.add(e.data ? +e.data.slice(0, 4) : e.ano));
    return [...s].filter((a) => a <= anoAtual).sort((a, b) => b - a);
  }, [treinos, eventos, anoAtual]);
  const [ano, setAno] = useState(anoAtual);
  const [col, setCol] = useState<Col>("km");
  const [desc, setDesc] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const st = useMemo(() => calcular(treinos, eventos, inscricoes, membros, ano, hoje || isoHoje()), [treinos, eventos, inscricoes, membros, ano, hoje]);

  const atletas = useMemo(() => {
    const l = [...st.atletas];
    l.sort((a, b) => {
      const va = a[col], vb = b[col];
      const r = typeof va === "string" ? (va as string).localeCompare(vb as string, "pt") : (va as number) - (vb as number);
      return desc ? -r : r;
    });
    return l;
  }, [st, col, desc]);
  function sortBy(c: Col) { if (c === col) setDesc(!desc); else { setCol(c); setDesc(c !== "nome"); } }
  const th = (c: Col, label: string, num = true) => (
    <th className={num ? "r" : ""} aria-sort={col === c ? (desc ? "descending" : "ascending") : "none"}>
      <button type="button" className="sortbtn" onClick={() => sortBy(c)}>{label}{col === c ? (desc ? " ↓" : " ↑") : ""}</button>
    </th>
  );

  // gráfico de barras: km por mês
  const W = 640, H = 220, L = 40, R = 8, T = 22, B = 26;
  const maxKm = Math.max(...st.porMes.map((m) => m.km), 0);
  const passo = passoEixo(maxKm);
  const topo = Math.max(passo, Math.ceil(maxKm / passo) * passo);
  const ticks = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const bw = (W - L - R) / 12;
  const y = (v: number) => T + (H - T - B) * (1 - v / topo);
  const barPath = (x: number, w: number, v: number) => {
    const y0 = H - B, y1 = y(v), r = Math.min(4, (y0 - y1), w / 2);
    if (v <= 0) return "";
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  };
  const maxIdx = maxKm > 0 ? st.porMes.findIndex((m) => m.km === maxKm) : -1;
  const maxTipo = Math.max(...st.porTipo.map((t) => t.km), 1);

  return (
    <section className="view">
      <div className="sechead">
        <h2>Estatísticas</h2>
        <div className="seg" role="group" aria-label="Época">
          {anos.map((a) => <button key={a} type="button" aria-pressed={a === ano} onClick={() => setAno(a)}>{a}</button>)}
        </div>
      </div>

      <div className="tiles">
        <div className="tile"><div className="v num">{fmtKm(st.kmEquipa)}</div><div className="k">km de bicicleta</div></div>
        <div className="tile"><div className="v num">{st.dmaisEquipa.toLocaleString("pt-PT")}</div><div className="k">m de D+</div></div>
        <div className="tile"><div className="v num">{st.treinosRealizados}</div><div className="k">treinos{st.eventosRealizados ? ` · ${st.eventosRealizados} eventos` : ""}</div></div>
        <div className="tile"><div className="v num">{st.mediaAtletas.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}</div><div className="k">atletas por treino</div></div>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="sechead" style={{ marginBottom: 6 }}>
          <h3 className="chart-t">Km de bicicleta por mês · {ano}</h3>
          <span className="empty">Voltas da equipa (treinos de bicicleta e eventos)</span>
        </div>
        <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Km por mês em ${ano}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? "axis" : "grid"} />
                <text x={L - 6} y={y(t) + 4} textAnchor="end" className="tick">{t.toLocaleString("pt-PT")}</text>
              </g>
            ))}
            {st.porMes.map((m, i) => {
              const x = L + i * bw + bw * 0.18, w = bw * 0.64;
              const on = hover === i;
              return (
                <g key={m.mes} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${MESES_L[i]}: ${fmtKm(m.km)} km em ${m.treinos} treinos`}>
                  <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
                  <path d={barPath(x, w, m.km)} className={`bar${hover !== null && !on ? " dim" : ""}`} />
                  <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="tick">{MESES[i]}</text>
                  {(on || (hover === null && i === maxIdx)) && m.km > 0 && (
                    <text x={L + i * bw + bw / 2} y={y(m.km) - 6} textAnchor="middle" className="val">{fmtKm(m.km)}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div className="tip" style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%` }}>
              <b>{MESES_L[hover]}</b>
              <span>{fmtKm(st.porMes[hover].km)} km · {st.porMes[hover].treinos} treino{st.porMes[hover].treinos === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
        <details className="tview">
          <summary>Ver em tabela</summary>
          <div className="tw" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>Mês</th><th className="r">Km</th><th className="r">Treinos</th></tr></thead>
              <tbody>{st.porMes.map((m, i) => <tr key={m.mes}><td>{MESES_L[i]}</td><td className="r num">{fmtKm(m.km)}</td><td className="r num">{m.treinos}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </div>

      {st.porTipo.length > 0 && (
        <div className="panel" style={{ padding: 16 }}>
          <h3 className="chart-t" style={{ marginBottom: 10 }}>Distância por tipo de treino</h3>
          <div className="hbars">
            {st.porTipo.map((t) => (
              <div key={t.tipo} className="hbar">
                <span className="hl">{TIPOS_TREINO[t.tipo] ?? t.tipo}</span>
                <span className="ht"><span style={{ width: `${(t.km / maxTipo) * 100}%` }} /></span>
                <span className="hv num">{fmtKm(t.km)} km · {t.treinos}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 24 }}>Atletas</h2>
          <span className="empty">{fmtKm(st.kmAtletas)} km pedalados por todos · toca no cabeçalho para ordenar</span>
        </div>
        <div className="tw">
          <table className="rank">
            <thead>
              <tr>
                <th className="r">#</th>
                {th("nome", "Atleta", false)}
                {th("km", "Km bicicleta")}
                {th("treinos", "Treinos")}
                {th("presenca", "Presença")}
                {th("dmais", "D+")}
                {th("segundos", "Tempo")}
                {st.temCorrida && th("kmCorrida", "Km corrida")}
                {st.temNatacao && th("kmNatacao", "Km natação")}
                {th("eventos", "Eventos")}
              </tr>
            </thead>
            <tbody>
              {atletas.map((a: LinhaAtleta, i) => (
                <tr key={a.id} className={a.id === userId ? "me" : ""}>
                  <td className="r num muted">{i + 1}</td>
                  <td><b>{a.nome}</b>{a.id === userId && <span className="pill admin" style={{ marginLeft: 6 }}>tu</span>}{a.convidado && <span className="pill" style={{ marginLeft: 6 }}>sem conta</span>}</td>
                  <td className="r num"><b>{fmtKm(a.km)}</b></td>
                  <td className="r num">{a.treinos}</td>
                  <td className="r">
                    <span className="pct"><span className="pb"><span style={{ width: `${Math.round(a.presenca * 100)}%` }} /></span><span className="num">{Math.round(a.presenca * 100)}%</span></span>
                  </td>
                  <td className="r num">{a.dmais.toLocaleString("pt-PT")}</td>
                  <td className="r num">{horas(a.segundos)}</td>
                  {st.temCorrida && <td className="r num">{a.kmCorrida ? fmtKm(a.kmCorrida) : "—"}</td>}
                  {st.temNatacao && <td className="r num">{a.kmNatacao ? a.kmNatacao.toLocaleString("pt-PT", { maximumFractionDigits: 2 }) : "—"}</td>}
                  <td className="r num">{a.eventos}</td>
                </tr>
              ))}
              {!atletas.length && <tr><td colSpan={10} className="empty">Ainda não há membros ativos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Conta a lista de presenças do admin (incluindo participantes sem conta, juntados pelo nome); nos treinos sem presenças registadas, conta quem disse “vou”. Os km de cada treino vêm do GPX
          {st.kmEstimados ? "; nos treinos sem GPX são usados os km planeados" : ""}. Km e D+ contam só bicicleta; corrida e natação têm colunas próprias. O tempo só inclui treinos com GPX.
        </p>
      </div>
    </section>
  );
}
