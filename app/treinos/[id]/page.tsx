import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cartaoTreino, descricao } from "@/lib/partilha";

// Link curto de um treino (o que vai para o WhatsApp). Tem título e imagem próprios para a pré-visualização
// e abre o treino no calendário.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await cartaoTreino((await params).id);
  if (!c) return { title: "Treino" };
  return { title: c.titulo, description: descricao(c), robots: { index: false }, openGraph: { title: `${c.tipo}: ${c.titulo}`, description: descricao(c) } };
}

export default async function TreinoLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(/^[0-9a-f-]{36}$/i.test(id) ? `/treinos?treino=${id}` : "/treinos");
}
