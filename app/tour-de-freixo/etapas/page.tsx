import Link from "next/link";
import { Falta } from "@/components/tdf/Tabelas";
import { getSession } from "@/lib/session";
import { fmtDataEtapa, lerTour, vencedorEtapa } from "@/lib/tdf";

export const metadata = { title: "Etapas · Tour de Freixo" };

export default async function TourEtapas() {
  const { supabase } = await getSession();
  const d = await lerTour(supabase);
  if (d.emFalta) return <Falta />;
  if (!d.stages.length) return <p className="empty">Ainda sem etapas criadas.</p>;
  return (
    <ul className="tdf-etapas">
      {d.stages.map((s) => {
        const v = vencedorEtapa(d, s.id);
        const meta = [s.distance_km != null && `${s.distance_km} km`, s.elevation_gain_m != null && `${s.elevation_gain_m} m D+`].filter(Boolean).join(" · ");
        return (
          <li key={s.id}>
            <Link href={`/tour-de-freixo/etapas/${s.id}`} className="tdf-etapa">
              <span className="tdf-etapa-n">E{s.number}</span>
              <span className="tdf-etapa-b">
                <b>{s.name}</b>
                <span>{[fmtDataEtapa(s.date), meta].filter(Boolean).join(" · ") || "Detalhes por definir"}</span>
              </span>
              <span className="tdf-etapa-v">{v ? <><small>Vencedor</small>{v.name}</> : <small>Sem resultados</small>}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
