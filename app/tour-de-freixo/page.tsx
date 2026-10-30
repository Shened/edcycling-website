import Link from "next/link";
import { Cartao, Falta, TabelaGeral, TabelaPontos } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { classificacaoGeral, classificacaoPontos, fmtDataEtapa, lerTour, vencedorEtapa } from "@/lib/tdf";

export default async function TourResumo() {
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
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
        <Link href={`/tour-de-freixo/etapas/${ultima.id}`} className="tdf-ultima">
          <span className="eyebrow">Última etapa · E{ultima.number}{ultima.date ? ` · ${fmtDataEtapa(ultima.date)}` : ""}</span>
          <b>{ultima.name}</b>
          {venc && <span>Vencedor: {venc.name}</span>}
        </Link>
      )}
      <Cartao titulo="Classificação geral" href="/tour-de-freixo/geral">
        <TabelaGeral linhas={geral} completa={false} />
      </Cartao>
      <div className="tdf-2">
        <Cartao titulo={<><span aria-hidden="true">🚩 </span>Sprint</>} href="/tour-de-freixo/pontos">
          <TabelaPontos linhas={sprint} />
        </Cartao>
        <Cartao titulo={<><span aria-hidden="true">⛰️ </span>Montanha</>} href="/tour-de-freixo/pontos">
          <TabelaPontos linhas={montanha} />
        </Cartao>
      </div>
    </div>
  );
}
