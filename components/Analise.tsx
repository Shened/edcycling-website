"use client";
import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics. Antes de enviar, tira do endereço tudo o que possa identificar alguém
// (query strings e âncoras); só fica o separador dos eventos (?ver=), que é útil para ver o uso.
export default function Analise() {
  return (
    <Analytics
      beforeSend={(e) => {
        try {
          const u = new URL(e.url);
          if (u.pathname.startsWith("/auth")) return null;
          const ver = u.searchParams.get("ver");
          u.search = ver ? `?ver=${ver}` : "";
          u.hash = "";
          return { ...e, url: u.toString() };
        } catch {
          return e;
        }
      }}
    />
  );
}
