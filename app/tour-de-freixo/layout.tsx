import type { Metadata } from "next";
import { Suspense } from "react";
import TdfCab from "@/components/tdf/TdfCab";
import { getSession } from "@/lib/session";
import { lerTour } from "@/lib/tdf";

export const metadata: Metadata = {
  title: "Tour de Freixo · EDCycling",
  description: "Tour de Freixo, by EDCycling: classificação geral, pontos de sprint e de montanha, etapa a etapa.",
};

export default async function TourLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  return (
    <div className="tdf">
      <Suspense>
        <TdfCab
          edicoes={d.edicoes.map(({ ano, etapas, atletas }) => ({ ano, etapas, atletas }))}
          anoPadrao={d.anoPadrao}
          etapas={d.stages.length}
          atletas={d.riders.length}
        />
      </Suspense>
      {children}
    </div>
  );
}
