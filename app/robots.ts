import type { MetadataRoute } from "next";

const SITE = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://edcycling-website.vercel.app").replace(/\/$/, "");

// Só as páginas públicas interessam aos motores de busca; o resto é da equipa.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/noticias/", "/tour-de-freixo"], disallow: ["/gestao", "/api/", "/auth/", "/definicoes", "/perfil"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
