"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { associarPerfil } from "@/app/gestao/tour-de-freixo/actions";

// Escolher qual atleta da equipa (conta no site) é este atleta do Tour.
export default function AssociarPerfil({ riderId, nome, atual, perfis }: { riderId: string; nome: string; atual: string | null; perfis: { id: string; nome: string; ocupado: boolean }[] }) {
  const [valor, setValor] = useState(atual ?? "");
  const [pend, start] = useTransition();
  const [erro, setErro] = useState("");
  const router = useRouter();
  return (
    <span className="tdf-assoc">
      <select
        aria-label={`Atleta da equipa correspondente a ${nome}`}
        value={valor}
        disabled={pend}
        onChange={(e) => {
          const v = e.target.value;
          const antes = valor;
          setValor(v); setErro("");
          start(async () => {
            const r = await associarPerfil(riderId, v || null);
            if (!r.ok) { setValor(antes); setErro(r.msg); } else router.refresh();
          });
        }}
      >
        <option value="">Sem conta na equipa</option>
        {perfis.map((p) => <option key={p.id} value={p.id} disabled={p.ocupado && p.id !== atual}>{p.nome}{p.ocupado && p.id !== atual ? " (já ligado)" : ""}</option>)}
      </select>
      {erro && <small className="tdf-erro-mini" role="alert">{erro}</small>}
    </span>
  );
}
