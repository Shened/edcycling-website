// Sincronização automática do Strava (só servidor): traz as atividades novas de um atleta para o site.
// Usada pelo botão "Atualizar do Strava", pela sincronização ao abrir o site e pelo webhook do Strava.
import { createAdminClient } from "@/lib/supabase/admin";
import { listarAtividades, obterAtividade, paraAtividade, procurarParecida, tokenValido, type AtividadeStrava, type Existente } from "@/lib/strava";

export interface ResultadoSync { estado: "ok" | "desligado" | "recente" | "limite" | "erro"; novas: number; juntadas: number }

/** Guarda uma atividade do Strava: se já existe, ignora; se parece uma registada à mão, junta; senão cria. */
async function guardar(userId: string, a: AtividadeStrava, existentes: Existente[]): Promise<"nova" | "juntada" | "ja"> {
  const admin = createAdminClient();
  if (existentes.some((e) => Number(e.strava_id) === a.id)) return "ja";
  const x = paraAtividade(a);
  const p = procurarParecida(x, existentes);
  if (p) {
    const { data: atual } = await admin.from("atividades").select("trajeto").eq("id", p.id).maybeSingle();
    await admin.from("atividades").update({ strava_id: a.id, ...(!atual?.trajeto && x.trajeto ? { trajeto: x.trajeto } : {}), updated_at: new Date().toISOString() }).eq("id", p.id).eq("user_id", userId);
    p.strava_id = a.id;
    return "juntada";
  }
  const { error } = await admin.from("atividades").upsert({ ...x, user_id: userId }, { onConflict: "user_id,strava_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  existentes.push({ id: "", titulo: x.titulo, data: x.data, hora: x.hora, km: x.km, duracao_s: x.duracao_s, strava_id: a.id });
  return "nova";
}

async function existentesDe(userId: string, desde: string, ate: string): Promise<Existente[]> {
  const { data } = await createAdminClient().from("atividades").select("id,titulo,data,hora,km,duracao_s,strava_id").eq("user_id", userId).gte("data", desde).lte("data", ate);
  return (data ?? []) as Existente[];
}

/**
 * Traz as atividades recentes (até 30) de um atleta. `intervaloMin` evita pedir ao Strava várias vezes seguidas:
 * se a última sincronização foi há menos tempo do que isso, não faz nada.
 */
export async function sincronizarAtleta(userId: string, intervaloMin = 0): Promise<ResultadoSync> {
  const admin = createAdminClient();
  const { data: conta, error } = await admin.from("strava_contas").select("sincronizado_em").eq("user_id", userId).maybeSingle();
  if (error || !conta) return { estado: "desligado", novas: 0, juntadas: 0 };
  const ultima = conta.sincronizado_em ? new Date(conta.sincronizado_em as string).getTime() : 0;
  if (intervaloMin && Date.now() - ultima < intervaloMin * 60_000) return { estado: "recente", novas: 0, juntadas: 0 };
  const token = await tokenValido(userId).catch(() => null);
  if (!token) return { estado: "desligado", novas: 0, juntadas: 0 };
  let lista: AtividadeStrava[];
  try { lista = await listarAtividades(token, 1, 30); }
  catch (e) { return { estado: e instanceof Error && e.message === "limite" ? "limite" : "erro", novas: 0, juntadas: 0 }; }
  await admin.from("strava_contas").update({ sincronizado_em: new Date().toISOString() }).eq("user_id", userId);
  if (!lista.length) return { estado: "ok", novas: 0, juntadas: 0 };
  const datas = lista.map((a) => a.start_date_local.slice(0, 10)).sort();
  const existentes = await existentesDe(userId, datas[0], datas[datas.length - 1]);
  let novas = 0, juntadas = 0;
  for (const a of lista) {
    const r = await guardar(userId, a, existentes).catch(() => "ja" as const);
    if (r === "nova") novas++; else if (r === "juntada") juntadas++;
  }
  return { estado: "ok", novas, juntadas };
}

/** Evento do webhook do Strava: atividade criada, alterada ou apagada, ou atleta que retirou a autorização. */
export async function tratarEventoStrava(ev: { object_type: string; aspect_type: string; object_id: number; owner_id: number; updates?: Record<string, unknown> }) {
  const admin = createAdminClient();
  const { data: conta } = await admin.from("strava_contas").select("user_id").eq("athlete_id", ev.owner_id).maybeSingle();
  if (!conta) return;
  const userId = conta.user_id as string;

  if (ev.object_type === "athlete") {
    if (ev.updates?.authorized === "false" || ev.updates?.authorized === false) await admin.from("strava_contas").delete().eq("user_id", userId);
    return;
  }
  if (ev.object_type !== "activity") return;

  if (ev.aspect_type === "delete") {
    await admin.from("atividades").delete().eq("user_id", userId).eq("strava_id", ev.object_id);
    return;
  }
  const token = await tokenValido(userId).catch(() => null);
  if (!token) return;
  const a = await obterAtividade(token, ev.object_id).catch(() => null);
  if (!a) return;
  const x = paraAtividade(a);
  if (ev.aspect_type === "update") {
    // Título, tipo ou privacidade mudaram no Strava: atualiza só esses campos (os km e o percurso ficam).
    await admin.from("atividades").update({ titulo: x.titulo, tipo: x.tipo, privada: x.privada, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("strava_id", ev.object_id);
    return;
  }
  const existentes = await existentesDe(userId, x.data, x.data);
  await guardar(userId, a, existentes);
}
