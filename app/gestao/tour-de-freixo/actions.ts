"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { lerTempo, type EstadoEtapa } from "@/lib/tdf";

export type Res = { ok: boolean; msg: string };

async function admin() {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) throw new Error("Só admins podem editar o Tour de Freixo.");
  return supabase;
}

function refrescar(etapaId?: string) {
  revalidatePath("/tour-de-freixo", "layout");
  revalidatePath("/gestao/tour-de-freixo");
  if (etapaId) revalidatePath(`/gestao/tour-de-freixo/etapas/${etapaId}`);
}

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const numero = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const erro = (m: string): Res => ({ ok: false, msg: m });

/* ---------- atletas ---------- */

// Cria um atleta novo ou inscreve um que já correu noutra edição.
export async function adicionarCiclista(f: FormData): Promise<Res> {
  const sb = await admin();
  const edicao = txt(f, "edicao_id");
  let id = txt(f, "rider_id");
  let name = "";
  if (!id) {
    name = txt(f, "name");
    if (!name) return erro("Escolhe um atleta ou escreve o nome de um novo.");
    const { data, error } = await sb.from("tdf_riders").insert({ name, team: txt(f, "team") || null }).select("id").single();
    if (error || !data) return erro(`Não foi possível adicionar (${error?.message ?? "erro"}).`);
    id = data.id;
  }
  if (edicao) {
    const { error } = await sb.from("tdf_participantes").upsert({ edicao_id: edicao, rider_id: id }, { onConflict: "edicao_id,rider_id" });
    if (error) return erro(`Não foi possível inscrever (${error.message}).`);
  }
  refrescar();
  return { ok: true, msg: name ? `${name} adicionado.` : "Atleta inscrito." };
}

// Tira o atleta desta edição (e os resultados dele nela). Sem edições, apaga o atleta.
export async function removerCiclista(id: string, edicao?: string): Promise<Res> {
  const sb = await admin();
  if (!edicao) {
    const { error } = await sb.from("tdf_riders").delete().eq("id", id);
    if (error) return erro(`Não foi possível remover (${error.message}).`);
    refrescar();
    return { ok: true, msg: "Atleta removido." };
  }
  const { data: st } = await sb.from("tdf_stages").select("id").eq("edicao_id", edicao);
  const etapas = ((st ?? []) as { id: string }[]).map((x) => x.id);
  if (etapas.length) {
    const { data: gs } = await sb.from("tdf_goals").select("id").in("stage_id", etapas);
    const metas = ((gs ?? []) as { id: string }[]).map((x) => x.id);
    await sb.from("tdf_stage_results").delete().eq("rider_id", id).in("stage_id", etapas);
    if (metas.length) await sb.from("tdf_goal_results").delete().eq("rider_id", id).in("goal_id", metas);
  }
  const { error } = await sb.from("tdf_participantes").delete().eq("edicao_id", edicao).eq("rider_id", id);
  if (error) return erro(`Não foi possível remover (${error.message}).`);
  refrescar();
  return { ok: true, msg: "Atleta retirado desta edição." };
}

/* ---------- edições ---------- */

export async function criarEdicao(f: FormData): Promise<Res> {
  const sb = await admin();
  const ano = numero(f, "ano");
  if (!ano || ano < 2000 || ano > 2100) return erro("Indica o ano da edição.");
  const { data, error } = await sb.from("tdf_edicoes").insert({ ano }).select("id").single();
  if (error || !data) return erro(/duplicate|unique/i.test(error?.message ?? "") ? `Já existe a edição de ${ano}.` : `Não foi possível criar (${error?.message ?? "erro"}).`);
  const copiar = txt(f, "copiar");
  if (copiar) {
    const { data: ps } = await sb.from("tdf_participantes").select("rider_id").eq("edicao_id", copiar);
    const linhas = ((ps ?? []) as { rider_id: string }[]).map((p) => ({ edicao_id: data.id, rider_id: p.rider_id }));
    if (linhas.length) await sb.from("tdf_participantes").insert(linhas);
  }
  refrescar();
  return { ok: true, msg: `Edição de ${ano} criada.` };
}

export async function removerEdicao(id: string): Promise<Res> {
  const sb = await admin();
  const { error } = await sb.from("tdf_edicoes").delete().eq("id", id);
  if (error) return erro(`Não foi possível remover (${error.message}).`);
  refrescar();
  return { ok: true, msg: "Edição removida." };
}

/* ---------- etapas ---------- */

export async function adicionarEtapa(f: FormData): Promise<Res> {
  const sb = await admin();
  const number = numero(f, "number"), name = txt(f, "name");
  if (!number || !name) return erro("Falta o número ou o nome da etapa.");
  const edicao = txt(f, "edicao_id");
  const { error } = await sb.from("tdf_stages").insert({ number, name, date: txt(f, "date") || null, ...(edicao ? { edicao_id: edicao } : {}) });
  if (error) return erro(/duplicate|unique/i.test(error.message) ? `Já existe a etapa ${number}.` : `Não foi possível criar (${error.message}).`);
  refrescar();
  return { ok: true, msg: `Etapa ${number} criada.` };
}

export async function guardarEtapa(f: FormData): Promise<Res> {
  const sb = await admin();
  const id = txt(f, "id"), number = numero(f, "number"), name = txt(f, "name");
  if (!id || !number || !name) return erro("Falta o número ou o nome da etapa.");
  const { error } = await sb.from("tdf_stages").update({
    number, name, date: txt(f, "date") || null,
    distance_km: numero(f, "distance_km"), elevation_gain_m: numero(f, "elevation_gain_m"), max_gradient_pct: numero(f, "max_gradient_pct"),
  }).eq("id", id);
  if (error) return erro(/duplicate|unique/i.test(error.message) ? `Já existe a etapa ${number}.` : `Não foi possível guardar (${error.message}).`);
  refrescar(id);
  return { ok: true, msg: "Etapa guardada." };
}

export async function removerEtapa(id: string): Promise<Res> {
  const sb = await admin();
  const { error } = await sb.from("tdf_stages").delete().eq("id", id);
  if (error) return erro(`Não foi possível remover (${error.message}).`);
  refrescar();
  return { ok: true, msg: "Etapa removida." };
}

/* ---------- resultados da etapa ---------- */

const ESTADOS: EstadoEtapa[] = ["FINISHED", "DNS", "DNF"];

export async function guardarResultados(f: FormData): Promise<Res> {
  const sb = await admin();
  const etapa = txt(f, "stage_id");
  const ids = f.getAll("rider_id").map(String);
  if (!etapa || !ids.length) return erro("Sem atletas para guardar.");
  const invalidos: string[] = [];
  const linhas: { stage_id: string; rider_id: string; status: EstadoEtapa; time_seconds: number | null; avg_speed_kmh: number | null }[] = [];
  for (const rid of ids) {
    const raw = txt(f, `status_${rid}`) as EstadoEtapa;
    const status = ESTADOS.includes(raw) ? raw : "FINISHED";
    const tRaw = txt(f, `time_${rid}`);
    const t = status === "FINISHED" ? lerTempo(tRaw) : null;
    if (status === "FINISHED" && tRaw && t == null) invalidos.push(txt(f, `name_${rid}`) || rid);
    // Quem terminou mas ainda não tem tempo não é gravado (fica por preencher).
    if (status === "FINISHED" && t == null) continue;
    const v = numero(f, `speed_${rid}`);
    linhas.push({ stage_id: etapa, rider_id: rid, status, time_seconds: t, avg_speed_kmh: status === "FINISHED" ? v : null });
  }
  if (invalidos.length) return erro(`Tempo inválido para ${invalidos.join(", ")}. Usa mm:ss ou h:mm:ss.`);
  if (linhas.length) {
    const { error } = await sb.from("tdf_stage_results").upsert(linhas, { onConflict: "stage_id,rider_id" });
    if (error) return erro(`Não foi possível guardar (${error.message}).`);
  }
  // Atletas que ficaram sem tempo nem DNS/DNF deixam de ter resultado nesta etapa.
  const sem = ids.filter((rid) => !linhas.some((l) => l.rider_id === rid));
  if (sem.length) await sb.from("tdf_stage_results").delete().eq("stage_id", etapa).in("rider_id", sem);
  refrescar(etapa);
  return { ok: true, msg: "Resultados guardados." };
}

/* ---------- metas volantes ---------- */

export async function adicionarMeta(f: FormData): Promise<Res> {
  const sb = await admin();
  const etapa = txt(f, "stage_id"), name = txt(f, "name");
  const type = txt(f, "type") === "MOUNTAIN" ? "MOUNTAIN" : "SPRINT";
  if (!etapa || !name) return erro("Falta o nome da meta.");
  const { count } = await sb.from("tdf_goals").select("id", { count: "exact", head: true }).eq("stage_id", etapa);
  const { error } = await sb.from("tdf_goals").insert({ stage_id: etapa, type, name, order_index: count ?? 0 });
  if (error) return erro(`Não foi possível criar (${error.message}).`);
  refrescar(etapa);
  return { ok: true, msg: "Meta adicionada." };
}

export async function removerMeta(etapa: string, id: string): Promise<Res> {
  const sb = await admin();
  const { error } = await sb.from("tdf_goals").delete().eq("id", id);
  if (error) return erro(`Não foi possível remover (${error.message}).`);
  refrescar(etapa);
  return { ok: true, msg: "Meta removida." };
}

export async function adicionarResultadoMeta(f: FormData): Promise<Res> {
  const sb = await admin();
  const etapa = txt(f, "stage_id"), meta = txt(f, "goal_id"), rider = txt(f, "rider_id");
  const position = Number(f.get("position"));
  if (!meta || !rider || !(position >= 1 && position <= 10)) return erro("Escolhe o atleta e a posição.");
  const { data: r } = await sb.from("tdf_stage_results").select("status").eq("stage_id", etapa).eq("rider_id", rider).maybeSingle();
  if (r?.status === "DNS") return erro("Esse atleta está em DNS nesta etapa.");
  // Se a posição já está ocupada por outro atleta, liberta-a primeiro (a posição é única por meta).
  const { error: e1 } = await sb.from("tdf_goal_results").delete().eq("goal_id", meta).eq("position", position).neq("rider_id", rider);
  if (e1) return erro(`Não foi possível gravar (${e1.message}).`);
  const { error } = await sb.from("tdf_goal_results").upsert({ goal_id: meta, rider_id: rider, position }, { onConflict: "goal_id,rider_id" });
  if (error) return erro(`Não foi possível gravar (${error.message}).`);
  refrescar(etapa);
  return { ok: true, msg: "Resultado gravado." };
}

export async function removerResultadoMeta(etapa: string, id: string): Promise<Res> {
  const sb = await admin();
  const { error } = await sb.from("tdf_goal_results").delete().eq("id", id);
  if (error) return erro(`Não foi possível remover (${error.message}).`);
  refrescar(etapa);
  return { ok: true, msg: "Removido." };
}
