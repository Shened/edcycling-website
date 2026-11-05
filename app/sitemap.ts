import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://edcycling-website.vercel.app").replace(/\/$/, "");

// Páginas públicas: início, notícias publicadas e o Tour de Freixo.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = await createClient();
  const { data } = await sb.from("noticias").select("id,updated_at").eq("publicado", true).order("publicado_em", { ascending: false }).limit(200);
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/tour-de-freixo`, changeFrequency: "monthly", priority: 0.6 },
    ...(data ?? []).map((n) => ({ url: `${SITE}/noticias/${n.id}`, lastModified: n.updated_at as string, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
