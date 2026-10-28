"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type Resultado = { ok: boolean; msg: string };

async function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function convidarMembro(form: FormData): Promise<Resultado> {
  const { isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, msg: "Só admins podem convidar membros." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const nome = String(form.get("nome") ?? "").trim();
  const role = form.get("role") === "admin" ? "admin" : "membro";
  const atleta = form.get("atleta") === "on";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, msg: "Esse email não parece válido." };

  let admin;
  try { admin = createAdminClient(); } catch { return { ok: false, msg: "Falta configurar a SUPABASE_SECRET_KEY no servidor." }; }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${await siteUrl()}/definir-password`,
  });
  if (error || !data.user) {
    const m = error?.message ?? "";
    if (/already|registered|exists/i.test(m)) return { ok: false, msg: "Esse email já tem conta." };
    if (/rate/i.test(m)) return { ok: false, msg: "Limite de emails atingido. Tenta daqui a uma hora ou liga um SMTP no Supabase." };
    return { ok: false, msg: `Não foi possível enviar o convite (${m}).` };
  }
  // O trigger cria o perfil como "pendente"; aqui fica já com o role escolhido.
  await admin.from("perfis").upsert({ id: data.user.id, email, nome: nome || email.split("@")[0], role, ativo: false, atleta }, { onConflict: "id" });
  revalidatePath("/gestao");
  return { ok: true, msg: `Convite enviado para ${email}.` };
}

export async function removerMembro(id: string): Promise<Resultado> {
  const { isAdmin, perfil } = await getSession();
  if (!isAdmin) return { ok: false, msg: "Só admins podem remover membros." };
  if (id === perfil?.id) return { ok: false, msg: "Não te podes remover a ti próprio." };
  let admin;
  try { admin = createAdminClient(); } catch { return { ok: false, msg: "Falta configurar a SUPABASE_SECRET_KEY no servidor." }; }
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { ok: false, msg: "Não foi possível remover o membro." };
  revalidatePath("/gestao");
  return { ok: true, msg: "Membro removido." };
}

// Volta a enviar o convite a quem ainda não o aceitou (link novo, mesmos dados).
export async function reenviarConvite(id: string): Promise<Resultado> {
  const { isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, msg: "Só admins podem reenviar convites." };
  let admin;
  try { admin = createAdminClient(); } catch { return { ok: false, msg: "Falta configurar a SUPABASE_SECRET_KEY no servidor." }; }
  const { data: p } = await admin.from("perfis").select("email,nome,role,atleta,ativo").eq("id", id).single();
  if (!p?.email) return { ok: false, msg: "Não encontrei esse membro." };
  if (p.ativo) return { ok: false, msg: "Essa pessoa já aceitou o convite." };
  // Um convite pendente não pode ser reenviado diretamente: apaga-se a conta por ativar e convida-se de novo.
  const del = await admin.auth.admin.deleteUser(id);
  if (del.error) return { ok: false, msg: "Não foi possível preparar o novo convite." };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(p.email, {
    data: { nome: p.nome },
    redirectTo: `${await siteUrl()}/definir-password`,
  });
  if (error || !data.user) {
    return { ok: false, msg: /rate/i.test(error?.message ?? "") ? "Limite de emails atingido. Tenta daqui a uma hora." : `Não foi possível reenviar (${error?.message ?? "erro"}).` };
  }
  await admin.from("perfis").upsert({ id: data.user.id, email: p.email, nome: p.nome, role: p.role, atleta: p.atleta, ativo: false }, { onConflict: "id" });
  revalidatePath("/gestao/membros");
  return { ok: true, msg: `Convite reenviado para ${p.email}.` };
}
