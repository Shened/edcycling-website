// Validação dos dados que chegam às ações do servidor (vêm do browser, por isso não são de confiança).
import { z } from "zod";

export const Id = z.string().uuid();
export const Kind = z.enum(["evento", "treino"]);
export const Estado = z.enum(["vai", "talvez", "nao"]);
export const Pagina = z.number().int().min(1).max(200);
export const StravaId = z.number().int().positive();
export const Convite = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  nome: z.string().trim().max(60),
  role: z.enum(["membro", "admin"]),
  atleta: z.boolean(),
});

/** true se todos os pares [esquema, valor] forem válidos. */
export function valido(...pares: [z.ZodTypeAny, unknown][]): boolean {
  return pares.every(([s, v]) => s.safeParse(v).success);
}
