export interface Noticia {
  id: string;
  titulo: string;
  texto: string;
  imagem_path: string | null;
  publicado: boolean;
  publicado_em: string | null;
  created_at: string;
  updated_at?: string;
  url?: string | null;
}

/** URL pública da imagem (o bucket "noticias" é público). */
export function imagemUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/noticias/${path}`;
}

export function resumo(texto: string, n = 180): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
}

export function dataPub(n: Noticia): string {
  return new Date(n.publicado_em ?? n.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}
