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
  // 1) Corta as margens à volta do logótipo (transparentes ou da cor do fundo).
  const src = document.createElement("canvas");
  src.width = bmp.width; src.height = bmp.height;
  const sx = src.getContext("2d", { willReadFrequently: true })!;
  sx.drawImage(bmp, 0, 0);
  const caixa = recorte(sx.getImageData(0, 0, src.width, src.height));
  // 2) Deixa uma pequena margem e reduz para no máximo 600 px.
  const m = Math.round(Math.max(caixa.w, caixa.h) * 0.04);
  const x0 = Math.max(0, caixa.x - m), y0 = Math.max(0, caixa.y - m);
  const w0 = Math.min(src.width - x0, caixa.w + 2 * m), h0 = Math.min(src.height - y0, caixa.h + 2 * m);
  const s = Math.min(1, 600 / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * s));
  c.height = Math.max(1, Math.round(h0 * s));
  const cx = c.getContext("2d")!;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(src, x0, y0, w0, h0, 0, 0, c.width, c.height);
  // 3) Se o logótipo vinha com um fundo de cor lisa (ex.: JPG com fundo cinzento), torna esse fundo transparente.
  if (caixa.fundo[3] >= 16) tirarFundo(cx, c.width, c.height, caixa.fundo);
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.9));
  if (!blob) throw new Error("Não foi possível converter");
  return { blob, ext: "webp", tipo: "image/webp" };
}

// Caixa útil do logótipo: ignora píxeis transparentes ou iguais à cor dos cantos (fundo).
function recorte(img: ImageData) {
  const { width: w, height: h, data } = img;
  const px = (x: number, y: number) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const cantos = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const fundo = cantos.map((c) => c.join(",")).sort((a, b) => cantos.filter((c) => c.join(",") === b).length - cantos.filter((c) => c.join(",") === a).length)[0].split(",").map(Number);
  const vazio = (x: number, y: number) => {
    const [r, g, b, a] = px(x, y);
    if (a < 16) return true;
    if (fundo[3] < 16) return false;
    return Math.abs(r - fundo[0]) + Math.abs(g - fundo[1]) + Math.abs(b - fundo[2]) < 36;
  };
  let x1 = w, y1 = h, x2 = -1, y2 = -1;
  const passo = Math.max(1, Math.floor(Math.max(w, h) / 1200));
  for (let y = 0; y < h; y += passo) for (let x = 0; x < w; x += passo) {
    if (vazio(x, y)) continue;
    if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
  }
  if (x2 < 0) return { x: 0, y: 0, w, h, fundo };
  x2 = Math.min(w - 1, x2 + passo); y2 = Math.min(h - 1, y2 + passo);
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1, fundo };
}

// Apaga o fundo a partir das bordas (só a zona ligada às bordas, para não furar o interior do logótipo).
function tirarFundo(cx: CanvasRenderingContext2D, w: number, h: number, fundo: number[]) {
  const img = cx.getImageData(0, 0, w, h);
  const d = img.data;
  const perto = (i: number) => Math.abs(d[i] - fundo[0]) + Math.abs(d[i + 1] - fundo[1]) + Math.abs(d[i + 2] - fundo[2]) < 48;
  const visto = new Uint8Array(w * h);
  const fila: number[] = [];
  for (let x = 0; x < w; x++) { fila.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { fila.push(y * w, y * w + w - 1); }
  while (fila.length) {
    const k = fila.pop()!;
    if (visto[k]) continue;
    visto[k] = 1;
    if (!perto(k * 4)) continue;
    d[k * 4 + 3] = 0;
    const x = k % w, y = (k - x) / w;
    if (x > 0) fila.push(k - 1);
    if (x < w - 1) fila.push(k + 1);
    if (y > 0) fila.push(k - w);
    if (y < h - 1) fila.push(k + w);
  }
  cx.putImageData(img, 0, 0);
}
