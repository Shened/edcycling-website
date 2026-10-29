// Temas festivos para os eventos: só mudam o aspeto do cartão e da página do evento.
export const TEMAS: Record<string, { label: string; icon: React.ReactNode }> = {
  halloween: { label: "Halloween", icon: <><path d="M12 6.5c-5 0-8.5 3-8.5 7s3.5 7 8.5 7 8.5-3 8.5-7-3.5-7-8.5-7z" /><path d="M12 6.5c-1.6 3.2-1.6 10.8 0 14M12 6.5c1.6 3.2 1.6 10.8 0 14M12 6.5V3.5l2.5-1.5" /></> },
  natal: { label: "Natal", icon: <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" /> },
  "ano-novo": { label: "Ano Novo", icon: <path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.6 3.6M15.5 15.5l3.6 3.6M19.1 4.9l-3.6 3.6M8.5 15.5l-3.6 3.6" /> },
  pascoa: { label: "Páscoa", icon: <><path d="M12 2.5c-4 0-7 6-7 11.5a7 7 0 0 0 14 0c0-5.5-3-11.5-7-11.5z" /><path d="M5.3 12.5l3.2 2 3.5-2 3.5 2 3.2-2" /></> },
  carnaval: { label: "Carnaval", icon: <><path d="M2.5 8c3 0 5.5-1 9.5-1s6.5 1 9.5 1c0 6-3 9.5-6.5 9.5-2 0-2-2.2-3-2.2s-1 2.2-3 2.2C5.5 17.5 2.5 14 2.5 8z" /><circle cx="8.3" cy="11" r="1.6" /><circle cx="15.7" cy="11" r="1.6" /></> },
  "sao-joao": { label: "São João", icon: <><path d="M12 2.5c-4 0-6.5 3-6.5 6.5 0 4.2 4.3 7.5 6.5 9.5 2.2-2 6.5-5.3 6.5-9.5 0-3.5-2.5-6.5-6.5-6.5z" /><path d="M5.5 9h13M10.5 18.5h3v3h-3z" /></> },
};

function pascoa(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia);
}

/** Sugere um tema pela data do evento (YYYY-MM-DD), ou null. */
export function temaSugerido(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const t = new Date(y, m - 1, d).getTime();
  const perto = (alvo: Date, antes: number, depois: number) => t >= alvo.getTime() - antes * 864e5 && t <= alvo.getTime() + depois * 864e5;
  if ((m === 10 && d >= 24) || (m === 11 && d <= 1)) return "halloween";
  if (m === 12 && d <= 26) return "natal";
  if ((m === 12 && d >= 27) || (m === 1 && d <= 6)) return "ano-novo";
  if (m === 6 && d >= 19 && d <= 25) return "sao-joao";
  const p = pascoa(y);
  if (perto(p, 7, 2)) return "pascoa";
  if (perto(new Date(p.getTime() - 47 * 864e5), 4, 1)) return "carnaval";
  return null;
}

export function TemaDeco({ tema }: { tema?: string | null }) {
  const t = tema ? TEMAS[tema] : null;
  if (!t) return null;
  return (
    <span className="tema-deco" title={`Tema: ${t.label}`}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
      <span className="sr-only">Tema {t.label}</span>
    </span>
  );
}
