"use client";
import { useState } from "react";
import { guardarResultados } from "@/app/gestao/tour-de-freixo/actions";
import type { EstadoEtapa } from "@/lib/tdf";
import { Formulario } from "./Formulario";

export interface LinhaRes { id: string; nome: string; status: EstadoEtapa; tempo: string; vel: string }

// Tabela de resultados da etapa: estado, tempo e velocidade média de cada atleta.
export default function Resultados({ etapa, linhas }: { etapa: string; linhas: LinhaRes[] }) {
  const [rows, setRows] = useState(linhas);
  if (!rows.length) return <p className="empty" style={{ margin: 0 }}>Sem atletas ainda. Adiciona-os primeiro na página do Tour.</p>;
  const mudar = (id: string, p: Partial<LinhaRes>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <Formulario action={guardarResultados} botao="Guardar resultados" className="tdf-res">
      <input type="hidden" name="stage_id" value={etapa} />
      <div className="tw">
        <table>
          <thead>
            <tr><th scope="col">Atleta</th><th scope="col">Estado</th><th scope="col">Tempo</th><th scope="col">km/h</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const off = r.status !== "FINISHED";
              return (
                <tr key={r.id}>
                  <td className="tdf-nome">
                    {r.nome}
                    <input type="hidden" name="rider_id" value={r.id} />
                    <input type="hidden" name={`name_${r.id}`} value={r.nome} />
                  </td>
                  <td>
                    <select name={`status_${r.id}`} value={r.status} aria-label={`Estado de ${r.nome}`}
                      onChange={(e) => { const s = e.target.value as EstadoEtapa; mudar(r.id, s === "FINISHED" ? { status: s } : { status: s, tempo: "", vel: "" }); }}>
                      <option value="FINISHED">Terminou</option>
                      <option value="DNF">DNF</option>
                      <option value="DNS">DNS</option>
                    </select>
                  </td>
                  <td>
                    <input name={`time_${r.id}`} value={r.tempo} disabled={off} placeholder={off ? "—" : "h:mm:ss"} inputMode="numeric"
                      aria-label={`Tempo de ${r.nome}`} className="num tdf-in-t" onChange={(e) => mudar(r.id, { tempo: e.target.value })} />
                  </td>
                  <td>
                    <input name={`speed_${r.id}`} value={r.vel} disabled={off} placeholder={off ? "—" : "km/h"} inputMode="decimal"
                      aria-label={`Velocidade média de ${r.nome}`} className="num tdf-in-v" onChange={(e) => mudar(r.id, { vel: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ margin: 0 }}>Tempo em mm:ss ou h:mm:ss. Quem fica sem tempo (e sem DNS/DNF) não conta nesta etapa. A velocidade média da etapa é a média dos atletas que terminaram.</p>
    </Formulario>
  );
}
