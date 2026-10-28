"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ isAdmin, isMember }: { isAdmin: boolean; isMember: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Início" },
    ...(isMember ? [{ href: "/eventos", label: "Eventos" }] : []),
    ...(isMember ? [{ href: "/treinos", label: "Treinos" }] : []),
    ...(isMember ? [{ href: "/fotos", label: "Fotos" }] : []),
    ...(isMember ? [{ href: "/estatisticas", label: "Estatísticas" }] : []),
    ...(isAdmin ? [{ href: "/gestao", label: "Gestão" }] : []),
  ];
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={(t.href === "/" ? path === "/" : path === t.href || path.startsWith(t.href + "/")) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
