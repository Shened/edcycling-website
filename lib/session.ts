import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Perfil } from "./types";

// Uma única leitura da sessão por pedido: o layout e a página partilham o resultado
// (antes cada um fazia a sua ida ao Supabase).
export const getSession = cache(async () => {
  const supabase = await createClient();
  // getClaims valida o token localmente quando o projeto usa chaves assimétricas,
  // sem ir ao servidor de autenticação em cada página.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user = claims?.sub ? { id: claims.sub as string, email: (claims.email as string | undefined) ?? null } : null;
  let perfil: Perfil | null = null;
  if (user) {
    const { data: p } = await supabase.from("perfis").select("id,nome,email,role,ativo,atleta,avatar_path").eq("id", user.id).single();
    perfil = (p as Perfil) ?? null;
  }
  const isMember = perfil?.role === "membro" || perfil?.role === "admin";
  const isAdmin = perfil?.role === "admin";
  return { supabase, user, perfil, isMember, isAdmin };
});
