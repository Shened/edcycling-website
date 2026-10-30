// Eventos de utilização (Vercel Web Analytics). Nunca enviar nomes, emails nem ids de pessoas.
import { track } from "@vercel/analytics";

type Valor = string | number | boolean | null;

export function marcar(nome: string, props?: Record<string, Valor>) {
  try { track(nome, props); } catch { /* as métricas nunca podem partir o site */ }
}
