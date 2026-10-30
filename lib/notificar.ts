// Envio de avisos por push (web-push) e email (Gmail). Só corre no servidor.
import webpush from "web-push";
import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "./supabase/admin";

import { PREF_DEFAULTS, type Canal, type TipoAviso } from "./notif-prefs";
export { PREF_DEFAULTS };
export type { Canal, TipoAviso };

export interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  corpo: string;
  url: string;              // caminho no site, ex.: /eventos#e-123
  destinatarios: string[];  // ids de perfis
  chave?: string;           // se já foi enviado com esta chave, não volta a enviar
  ignorarPreferencias?: boolean;
}

export const SITE = ((process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL) ?? "https://edcycling-website.vercel.app").replace(/\/$/, "");

let vapidPronto = false;
function vapid(): boolean {
  if (vapidPronto) return true;
  const pub = (process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:teamedcycling@gmail.com", pub, priv);
  vapidPronto = true;
  return true;
}

let transporte: Transporter | null = null;
function mailer(): Transporter | null {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporte ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass: pass.replace(/\s+/g, "") } });
  return transporte;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function emailHtml(titulo: string, corpo: string, url: string): string {
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#EEF2F5;font-family:Arial,Helvetica,sans-serif;color:#0A2633">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#052F42;padding:18px 26px"><span style="font:italic 900 26px 'Arial Narrow',Arial,sans-serif;text-transform:uppercase;color:#fff">ED<span style="color:#F0609A">Cycling</span></span></td></tr>
<tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:#8A6FA8;background-image:linear-gradient(90deg,#316287,#8A6FA8 52%,#E3407A)">&nbsp;</td></tr>
<tr><td style="padding:24px 26px 6px"><h1 style="margin:0 0 10px;font:italic 900 24px/1.15 'Arial Narrow',Arial,sans-serif;text-transform:uppercase">${esc(titulo)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.55">${esc(corpo).replace(/\n/g, "<br>")}</p></td></tr>
<tr><td style="padding:0 26px 24px"><a href="${SITE}${url}" style="display:inline-block;background:#E3407A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Abrir no site</a></td></tr>
<tr><td style="padding:14px 26px 20px;border-top:1px solid #D2DCE2;font-size:12px;color:#7A909C">Recebes este email por seres atleta da EDCycling. Escolhe que avisos queres em <a href="${SITE}/definicoes" style="color:#316287">Definições</a>.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Envia um aviso a uma lista de pessoas, respeitando as preferências de cada uma. Nunca lança erros. */
export async function enviarAviso(a: Aviso): Promise<{ push: number; email: number }> {
  const r = { push: 0, email: 0 };
  try {
    const ids = [...new Set(a.destinatarios)].filter(Boolean);
    if (!ids.length) return r;
    const admin = createAdminClient();
    if (a.chave) {
      const { error } = await admin.from("notif_enviadas").insert({ chave: a.chave.slice(0, 300) });
      if (error) return r; // já enviado antes
    }
    const [{ data: prefs }, { data: perfis }, { data: subs }] = await Promise.all([
      admin.from("preferencias_notif").select("*").in("user_id", ids),
      admin.from("perfis").select("id,email,ativo").in("id", ids),
      admin.from("push_subscricoes").select("id,user_id,endpoint,p256dh,auth").in("user_id", ids),
    ]);
    const quer = (uid: string, canal: Canal) => {
      if (a.ignorarPreferencias) return true;
      const p = (prefs ?? []).find((x) => x.user_id === uid) as Record<string, unknown> | undefined;
      const k = `${a.tipo}_${canal}` as keyof typeof PREF_DEFAULTS;
      const v = p?.[k];
      return typeof v === "boolean" ? v : PREF_DEFAULTS[k];
    };

    // Push
    if (vapid()) {
      const payload = JSON.stringify({ title: a.titulo, body: a.corpo, url: a.url, tag: a.chave?.split(":").slice(0, 3).join(":") });
      await Promise.all((subs ?? []).filter((s) => quer(s.user_id, "push")).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
          r.push++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from("push_subscricoes").delete().eq("id", s.id); // subscrição expirada
        }
      }));
    }

    // Email (em BCC, em grupos, para poupar a quota do Gmail)
    const m = mailer();
    if (m) {
      const emails = (perfis ?? []).filter((p) => p.ativo && p.email && quer(p.id, "email")).map((p) => p.email as string);
      for (let i = 0; i < emails.length; i += 40) {
        try {
          await m.sendMail({
            from: `EDCycling <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            bcc: emails.slice(i, i + 40),
            subject: a.titulo,
            text: `${a.corpo}\n\n${SITE}${a.url}`,
            html: emailHtml(a.titulo, a.corpo, a.url),
          });
          r.email += emails.slice(i, i + 40).length;
        } catch { /* falha de email não impede o resto */ }
      }
    }
  } catch { /* avisos são sempre "best effort" */ }
  return r;
}
