import { redirect } from "next/navigation";
import Link from "next/link";
import Definicoes from "@/components/Definicoes";
import { getSession } from "@/lib/session";
import { PREF_DEFAULTS } from "@/lib/notif-prefs";

export const metadata = { title: "Definições · EDCycling" };

export default async function DefinicoesPage() {
  const { supabase, perfil, isMember, isAdmin } = await getSession();
  if (!perfil) redirect("/entrar");
  const { data } = await supabase.from("preferencias_notif").select("*").eq("user_id", perfil.id).maybeSingle();
  const prefs = { ...PREF_DEFAULTS, ...(data ?? {}) } as typeof PREF_DEFAULTS;
  return (
    <section className="view defs">
      <div className="sechead">
        <h2>Definições</h2>
        <Link href="/perfil" className="btn ghost">‹ Perfil</Link>
      </div>
      {!isMember ? <p className="empty">As notificações ficam disponíveis quando a tua conta estiver ativa.</p> : (
        <Definicoes
          userId={perfil.id}
          email={perfil.email ?? ""}
          inicial={prefs}
          vapid={(process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? ""}
          emailAtivo={!!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD}
          isAdmin={isAdmin}
        />
      )}
    </section>
  );
}
