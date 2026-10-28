import { createClient } from "./supabase/server";
import type { Perfil } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let perfil: Perfil | null = null;
  if (user) {
    const { data } = await supabase.from("perfis").select("id,nome,email,role,ativo").eq("id", user.id).single();
    perfil = (data as Perfil) ?? null;
  }
  const isMember = perfil?.role === "membro" || perfil?.role === "admin";
  const isAdmin = perfil?.role === "admin";
  return { supabase, user, perfil, isMember, isAdmin };
}
