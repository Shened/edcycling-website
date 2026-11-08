import { cartaoEvento } from "@/lib/partilha";
import { imagemCartao, OG_TAMANHO } from "@/lib/og-cartao";

export const size = OG_TAMANHO;
export const contentType = "image/png";
export const alt = "Evento EDCycling";

export default async function Imagem({ params }: { params: Promise<{ id: string }> }) {
  return imagemCartao(await cartaoEvento((await params).id));
}
