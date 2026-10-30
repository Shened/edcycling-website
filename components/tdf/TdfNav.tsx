"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/tour-de-freixo", label: "Resumo" },
  { href: "/tour-de-freixo/geral", label: "Geral" },
  { href: "/tour-de-freixo/pontos", label: "Pontos" },
  { href: "/tour-de-freixo/etapas", label: "Etapas" },
  { href: "/tour-de-freixo/numeros", label: "Números" },
];

export default function TdfNav() {
  const path = usePathname();
  return (
    <nav className="tdf-nav" aria-label="Tour de Freixo">
      {ITENS.map((i) => {
        const on = i.href === "/tour-de-freixo" ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} className="tdf-link" aria-current={on ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
