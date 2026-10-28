"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Barra de navegação em baixo, só no telemóvel (como numa app).
const I = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  eventos: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  treinos: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  fotos: <><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 17-5-5-8 8" /></>,
  stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  gestao: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

export default function MobileNav({ isAdmin, isMember }: { isAdmin: boolean; isMember: boolean }) {
  const path = usePathname();
  if (!isMember) return null;
  const tabs = [
    { href: "/eventos", label: "Eventos", icon: I.eventos },
    { href: "/treinos", label: "Treinos", icon: I.treinos },
    { href: "/fotos", label: "Feed", icon: I.fotos },
    { href: "/estatisticas", label: "Números", icon: I.stats },
    { href: "/perfil", label: "Perfil", icon: I.perfil },
    ...(isAdmin ? [{ href: "/gestao", label: "Gestão", icon: I.gestao }] : []),
  ];
  return (
    <nav className="mnav" aria-label="Secções">
      {tabs.map((t) => {
        const on = t.href === "/" ? path === "/" : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className="mnav-i" aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
