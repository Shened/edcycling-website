"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";

// Menu da conta (no avatar): perfil, definições, gestão, ajuda e sair.
export default function AccountMenu({ nome, avatar, isAdmin, isMember }: { nome: string; avatar: string | null; isAdmin: boolean; isMember: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const fora = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [open]);

  const primeiro = (nome || "").trim().split(/\s+/)[0] || "Conta";
  return (
    <div className="acct" ref={box}>
      <button ref={btn} type="button" className="acct-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Menu da conta de ${nome || "utilizador"}`} onClick={() => setOpen((o) => !o)}>
        <Avatar nome={nome || "?"} path={avatar} size={34} />
        <span className="acct-nome">{primeiro}</span>
        <svg className="acct-seta" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-cab"><b>{nome || "Sem nome"}</b></div>
          {isMember && <Link role="menuitem" href="/perfil">O meu perfil</Link>}
          {isMember && <Link role="menuitem" href="/definicoes">Definições e notificações</Link>}
          {isAdmin && <Link role="menuitem" href="/gestao">Gestão do site</Link>}
          <Link role="menuitem" href="/ajuda">Ajuda e instalar a app</Link>
          <form action="/auth/sair" method="post"><button role="menuitem" type="submit" className="acct-sair">Sair</button></form>
        </div>
      )}
    </div>
  );
}
