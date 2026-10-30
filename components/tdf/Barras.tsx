// Gráfico de barras simples por etapa (SVG, sem bibliotecas), com o valor por cima de cada barra.
export default function Barras({ dados, unidade, titulo }: { dados: { label: string; valor: number }[]; unidade: string; titulo: string }) {
  if (!dados.length) return <p className="empty" style={{ margin: "8px 0 4px" }}>Sem dados ainda.</p>;
  const W = 440, H = 210, base = H - 24, topo = 22;
  const max = Math.max(...dados.map((d) => d.valor)) || 1;
  const passo = W / dados.length;
  const larg = Math.min(44, passo * 0.62);
  const fmt = (v: number) => v.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart tdf-barras" role="img" aria-label={`${titulo}: ${dados.map((d) => `${d.label} ${fmt(d.valor)} ${unidade}`).join(", ")}`}>
      <line x1="0" x2={W} y1={base} y2={base} className="axis" />
      {dados.map((d, i) => {
        const h = Math.max(2, ((base - topo) * d.valor) / max);
        const x = i * passo + (passo - larg) / 2;
        return (
          <g key={d.label}>
            <rect x={x} y={base - h} width={larg} height={h} rx="4" className="tdf-bar" />
            <text x={x + larg / 2} y={base - h - 6} textAnchor="middle" className="val">{fmt(d.valor)}</text>
            <text x={x + larg / 2} y={H - 6} textAnchor="middle" className="tick">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
