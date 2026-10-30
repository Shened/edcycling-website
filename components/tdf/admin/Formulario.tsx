"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Res } from "@/app/gestao/tour-de-freixo/actions";

// Formulário de admin com mensagem de sucesso/erro, sem sair da página.
export function Formulario({ action, children, botao, className, limpar = false }: {
  action: (f: FormData) => Promise<Res>; children: React.ReactNode; botao: string; className?: string; limpar?: boolean;
}) {
  const [pend, start] = useTransition();
  const [res, setRes] = useState<Res | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(f);
          setRes(r);
          if (r.ok) { if (limpar) ref.current?.reset(); router.refresh(); }
        });
      }}
      onChange={() => res && setRes(null)}
    >
      {children}
      <div className="tdf-f-acoes">
        <button className="btn primary" disabled={pend}>{pend ? "A guardar…" : botao}</button>
        {res && <span role="status" className={res.ok ? "ok-msg" : "tdf-erro"}>{res.msg}</span>}
      </div>
    </form>
  );
}

// Botão de apagar em dois toques: o primeiro pede confirmação.
export function Apagar({ action, rotulo, pergunta = "Confirmar?" }: { action: () => Promise<Res>; rotulo: string; pergunta?: string }) {
  const [conf, setConf] = useState(false);
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState("");
  const router = useRouter();
  if (!conf) return <button type="button" className="btn ghost danger" aria-label={rotulo} onClick={() => setConf(true)}>Remover</button>;
  return (
    <span className="tdf-conf" role="group" aria-label={rotulo}>
      <span>{msg || pergunta}</span>
      <button type="button" className="btn perigo" disabled={pend} onClick={() => start(async () => {
        const r = await action();
        if (r.ok) { setConf(false); router.refresh(); } else setMsg(r.msg);
      })}>{pend ? "…" : "Sim, remover"}</button>
      <button type="button" className="btn ghost" onClick={() => { setConf(false); setMsg(""); }}>Cancelar</button>
    </span>
  );
}
