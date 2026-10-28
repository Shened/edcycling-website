"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/gestao", label: "Resumo" },
  { href: "/gestao/membros", label: "Membros" },
  { href: "/gestao/publicacoes", label: "Publicações" },
  { href: "/gestao/eventos", label: "Eventos" },
];

export default function AdminNav({ alertas }: { alertas: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Painel de admin">
      {ITENS.map((i) => (
        <Link key={i.href} href={i.href} className="adm-link" aria-current={path === i.href ? "page" : undefined}>
          {i.label}
          {alertas[i.href] ? <span className="adm-badge num">{alertas[i.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
