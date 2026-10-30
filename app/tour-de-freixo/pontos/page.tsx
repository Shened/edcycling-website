import { Cartao, Falta, TabelaPontos } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { classificacaoPontos, lerTour, POSICOES, pontosPosicao } from "@/lib/tdf";

export const metadata = { title: "Pontos · Tour de Freixo" };

export default async function TourPontos({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { supabase, isMember } = await getSession();
  const { ano } = await searchParams;
  const d = await lerTour(supabase, { ano });
  if (d.emFalta) return <Falta />;
  return (
    <div className="tdf-corpo">
      <div className="tdf-2">
        <Cartao titulo={<><span aria-hidden="true">🚩 </span>Sprint</>}>
          <TabelaPontos ligar={isMember} linhas={classificacaoPontos(d, "SPRINT")} />
        </Cartao>
        <Cartao titulo={<><span aria-hidden="true">⛰️ </span>Montanha</>}>
          <TabelaPontos ligar={isMember} linhas={classificacaoPontos(d, "MOUNTAIN")} />
        </Cartao>
      </div>
      <p className="tdf-nota">Em cada meta volante pontuam os 10 primeiros: {POSICOES.map((p) => `${p}.º ${pontosPosicao(p)}`).join(" · ")}. Estas classificações não dependem da geral.</p>
    </div>
  );
}
