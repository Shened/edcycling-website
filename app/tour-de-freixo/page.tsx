import Link from "next/link";
import { Cartao, Falta, TabelaGeral, TabelaPontos } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { comAno, classificacaoGeral, classificacaoPontos, fmtDataEtapa, lerTour, vencedorEtapa } from "@/lib/tdf";

export default async function TourResumo({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { supabase } = await getSession();
  const { ano } = await searchParams;
  const d = await lerTour(supabase, { ano });
  if (d.emFalta) return <Falta />;
  const geral = classificacaoGeral(d).slice(0, 5);
  const sprint = classificacaoPontos(d, "SPRINT").slice(0, 3);
  const montanha = classificacaoPontos(d, "MOUNTAIN").slice(0, 3);
  const comResultados = new Set(d.stageResults.map((r) => r.stage_id));
  const ultima = [...d.stages].reverse().find((s) => comResultados.has(s.id));
  const venc = ultima ? vencedorEtapa(d, ultima.id) : null;

  return (
    <div className="tdf-corpo">
      {ultima && (
        <Link href={comAno(`/tour-de-freixo/etapas/${ultima.id}`, d)} className="tdf-ultima">
          <span className="eyebrow">Última etapa · E{ultima.number}{ultima.date ? ` · ${fmtDataEtapa(ultima.date)}` : ""}</span>
          <b>{ultima.name}</b>
          {venc && <span>Vencedor: {venc.name}</span>}
        </Link>
      )}
      <Cartao titulo="Classificação geral" href={comAno("/tour-de-freixo/geral", d)}>
        <TabelaGeral linhas={geral} completa={false} />
      </Cartao>
      <div className="tdf-2">
        <Cartao titulo={<><span aria-hidden="true">🚩 </span>Sprint</>} href={comAno("/tour-de-freixo/pontos", d)}>
          <TabelaPontos linhas={sprint} />
        </Cartao>
        <Cartao titulo={<><span aria-hidden="true">⛰️ </span>Montanha</>} href={comAno("/tour-de-freixo/pontos", d)}>
          <TabelaPontos linhas={montanha} />
        </Cartao>
      </div>
    </div>
  );
}
