import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// Cliente com a chave secreta: só pode ser usado no servidor (server actions / route handlers).
// Nunca o importes num componente "use client".
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY nas variáveis de ambiente");
  return createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
