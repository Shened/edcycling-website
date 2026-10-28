"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Eventos" },
    { href: "/fotos", label: "Fotos" },
    ...(isAdmin ? [{ href: "/gestao", label: "Gestão" }] : []),
  ];
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
