import { cartaoTreino } from "@/lib/partilha";
import { imagemCartao, OG_TAMANHO } from "@/lib/og-cartao";

export const size = OG_TAMANHO;
export const contentType = "image/png";
export const alt = "Treino EDCycling";

export default async function Imagem({ params }: { params: Promise<{ id: string }> }) {
  return imagemCartao(await cartaoTreino((await params).id));
}
