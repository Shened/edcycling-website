"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Secções principais (no computador). Perfil, Definições e Gestão ficam no menu da conta.
export default function NavTabs({ isMember }: { isAdmin?: boolean; isMember: boolean }) {
  const path = usePathname();
  if (!isMember) return <nav className="tabs" aria-label="Secções" />;
  const tabs = [
    { href: "/eventos", label: "Eventos" },
    { href: "/treinos", label: "Treinos" },
    { href: "/fotos", label: "Feed" },
    { href: "/atletas", label: "Atletas" },
    { href: "/estatisticas", label: "Números" },
  ];
  return (
    <nav className="tabs" aria-label="Secções">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={path === t.href || path.startsWith(t.href + "/") ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
