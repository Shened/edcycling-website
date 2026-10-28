// Reduz uma imagem no browser (lado maior até `max` px) e devolve um JPEG.
export async function reduzirImagem(file: File, max = 1800, qualidade = 0.86): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", qualidade));
}
