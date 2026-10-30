import type { Metadata } from "next";
import TdfCab from "@/components/tdf/TdfCab";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tour de Freixo · EDCycling",
  description: "Tour de Freixo, by EDCycling: classificação geral, pontos de sprint e de montanha, etapa a etapa.",
};

export default async function TourLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await getSession();
  const [{ count: etapas }, { count: atletas }] = await Promise.all([
    supabase.from("tdf_stages").select("id", { count: "exact", head: true }),
    supabase.from("tdf_riders").select("id", { count: "exact", head: true }),
  ]);
  return (
    <div className="tdf">
      <TdfCab etapas={etapas ?? 0} atletas={atletas ?? 0} />
      {children}
    </div>
  );
}
