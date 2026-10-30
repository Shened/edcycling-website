export interface Patrocinador {
  id: string;
  nome: string;
  logo_path: string | null;
  url: string | null;
  principal: boolean;
  ativo: boolean;
  ordem: number;
}

/** Logótipo do patrocinador (bucket público "noticias", pasta patrocinadores/). */
export function logoPatrocinador(path: string | null | undefined): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/noticias/${path}` : null;
}

/**
 * Prepara o logótipo para enviar: SVG vai tal como está; imagens grandes são reduzidas
 * para no máximo 600 px, em WebP, mantendo o fundo transparente.
 */
export async function prepararLogo(file: File): Promise<{ blob: Blob; ext: string; tipo: string }> {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    if (file.size > 400 * 1024) throw new Error("SVG demasiado grande");
    return { blob: file, ext: "svg", tipo: "image/svg+xml" };
  }
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.9));
  if (!blob) throw new Error("Não foi possível converter");
  return { blob, ext: "webp", tipo: "image/webp" };
}
