import Evolucao from "@/components/tdf/Evolucao";
import { Cartao, Falta, TabelaGeral } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { classificacaoGeral, estaForaDaGeral, evolucaoGeral, lerTour } from "@/lib/tdf";

export const metadata = { title: "Classificação geral · Tour de Freixo" };

export default async function TourGeral() {
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  if (d.emFalta) return <Falta />;
  const geral = classificacaoGeral(d);
  const fora = d.riders.filter((r) => estaForaDaGeral(d, r.id));
  const evo = evolucaoGeral(d);
  return (
    <div className="tdf-corpo">
      <Cartao titulo="Classificação geral">
        <TabelaGeral linhas={geral} />
        {fora.length > 0 && (
          <p className="tdf-fora"><b>Fora da geral</b> (DNS ou DNF numa etapa): {fora.map((r) => r.name).join(", ")}</p>
        )}
      </Cartao>
      <Cartao titulo="Evolução da classificação">
        <Evolucao series={evo.series} pontos={evo.pontos} />
      </Cartao>
    </div>
  );
}
