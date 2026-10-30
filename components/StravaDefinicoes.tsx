"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { desligarStrava } from "@/app/strava-actions";
import { BotaoLigarStrava } from "./ImportarStrava";

const AVISOS: Record<string, { ok: boolean; t: string }> = {
  ligado: { ok: true, t: "Strava ligado. Já podes importar atividades em + Atividade." },
  cancelado: { ok: false, t: "Ligação cancelada no Strava." },
  "sem-permissao": { ok: false, t: "Para importar precisamos que autorizes a leitura das atividades (deixa essa opção marcada no Strava)." },
  "ja-ligada": { ok: false, t: "Essa conta do Strava já está ligada a outro atleta do site." },
  "sem-config": { ok: false, t: "A ligação ao Strava ainda não está ativa no site." },
  erro: { ok: false, t: "Não foi possível ligar ao Strava. Tenta outra vez." },
};

export default function StravaDefinicoes({ configurado, ligado, nome, tabela, aviso }: { configurado: boolean; ligado: boolean; nome: string | null; tabela: boolean; aviso?: string }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [conf, setConf] = useState(false);
  const av = aviso ? AVISOS[aviso] : null;
  return (
    <section className="panel stv-defs" aria-labelledby="stvT">
      <div className="stv-defs-h">
        <h3 id="stvT">Strava</h3>
        {ligado && <span className="stv-ok">Ligado{nome ? ` · ${nome}` : ""}</span>}
      </div>
      {av && <div className={av.ok ? "ok-msg" : "notice"} role="status">{av.t}</div>}
      {!configurado ? (
        <p className="empty" style={{ margin: 0 }}>A ligação ao Strava ainda não está ativa no site.</p>
      ) : !tabela ? (
        <p className="empty" style={{ margin: 0 }}>Falta correr a migration <b>020_strava.sql</b> no Supabase.</p>
      ) : ligado ? (
        <>
          <p className="hint" style={{ margin: 0 }}>Em <b>+ Atividade</b> escolhe <b>Importar do Strava</b> para trazer as tuas atividades. As que são privadas no Strava ficam só para ti aqui também.</p>
          {!conf ? (
            <button type="button" className="btn ghost danger" onClick={() => setConf(true)} style={{ alignSelf: "flex-start" }}>Desligar o Strava</button>
          ) : (
            <span className="tdf-conf">
              <span>As atividades já importadas ficam no site.</span>
              <button type="button" className="btn perigo" disabled={pend} onClick={() => start(async () => { await desligarStrava(); setConf(false); router.refresh(); })}>{pend ? "…" : "Desligar"}</button>
              <button type="button" className="btn ghost" onClick={() => setConf(false)}>Cancelar</button>
            </span>
          )}
        </>
      ) : (
        <>
          <p className="hint" style={{ margin: 0 }}>Liga a tua conta uma vez e passas a importar as atividades do Strava sem exportar ficheiros. O site só lê as atividades; não publica nada no teu Strava.</p>
          <BotaoLigarStrava volta="/definicoes" />
        </>
      )}
    </section>
  );
}
