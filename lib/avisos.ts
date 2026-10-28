"use server";
// Ações chamadas pelo site depois de criar/alterar algo. Verificam quem pede e enviam os avisos.
import { getSession } from "./session";
import { createAdminClient } from "./supabase/admin";
import { enviarAviso } from "./notificar";
import { admins, hojeLisboa, inscritos, linhaTreino, membrosAtivos, quando, type Kind } from "./avisos-texto";

const sem = (ids: string[], quem?: string | null) => ids.filter((i) => i !== quem);

export async function avisarNovo(kind: Kind, id: string): Promise<void> {
  try {
    const { user, isAdmin } = await getSession();
    if (!user) return;
    const admin = createAdminClient();
    if (kind === "evento") {
      if (!isAdmin) return;
      const { data: e } = await admin.from("eventos").select("*").eq("id", id).single();
      if (!e || e.estado === "cancelado") return;
      await enviarAviso({
        tipo: "novo", chave: `novo:evento:${id}`,
        titulo: `Novo evento: ${e.titulo}`,
        corpo: `${quando(e)}${e.partida ? ` · ${e.partida}` : ""}. Diz se vais.`,
        url: `/eventos#e-${id}`,
        destinatarios: sem(await membrosAtivos(admin), user.id),
      });
    } else {
      const { data: t } = await admin.from("treinos").select("*").eq("id", id).single();
      if (!t || (t.criador_id !== user.id && !isAdmin)) return;
      if (t.data < hojeLisboa()) return; // treinos passados registados agora não geram aviso
      await enviarAviso({
        tipo: "novo", chave: `novo:treino:${id}`,
        titulo: `Treino marcado: ${t.titulo}`,
        corpo: linhaTreino(t),
        url: "/treinos",
        destinatarios: sem(await membrosAtivos(admin), user.id),
      });
    }
  } catch { /* sem bloquear quem guardou */ }
}

type Antes = { data?: string | null; hora?: string | null; partida?: string | null; estado?: string | null };

export async function avisarAlteracao(kind: Kind, id: string, antes: Antes): Promise<void> {
  try {
    const { user, isAdmin } = await getSession();
    if (!user) return;
    const admin = createAdminClient();
    const tabela = kind === "evento" ? "eventos" : "treinos";
    const { data: r } = await admin.from(tabela).select("*").eq("id", id).single();
    if (!r) return;
    if (kind === "evento" ? !isAdmin : r.criador_id !== user.id && !isAdmin) return;
    const norm = (v: unknown) => (v == null || v === "" ? null : String(v).slice(0, 10));
    const mudouData = norm(antes.data) !== norm(r.data);
    const mudouHora = (antes.hora ?? "").slice(0, 5) !== (r.hora ?? "").slice(0, 5);
    const mudouLocal = (antes.partida ?? "").trim() !== (r.partida ?? "").trim();
    const cancelado = kind === "evento" && r.estado === "cancelado" && antes.estado !== "cancelado";
    if (!cancelado && !mudouData && !mudouHora && !mudouLocal) return;
    if (!cancelado && r.data && r.data < hojeLisboa()) return; // já passou
    const url = kind === "evento" ? `/eventos#e-${id}` : "/treinos";
    const dest = sem(await inscritos(admin, kind, id), user.id);
    await enviarAviso(cancelado ? {
      tipo: "alteracao", chave: `cancel:${kind}:${id}`,
      titulo: `Cancelado: ${r.titulo}`,
      corpo: `${kind === "evento" ? "O evento" : "O treino"} de ${quando(r)} foi cancelado.`,
      url, destinatarios: dest,
    } : {
      tipo: "alteracao", chave: `alt:${kind}:${id}:${r.data}:${(r.hora ?? "").slice(0, 5)}:${(r.partida ?? "").slice(0, 40)}`,
      titulo: `Alteração: ${r.titulo}`,
      corpo: `Novo horário: ${quando(r)}${r.partida ? ` · ${r.partida}` : ""}.`,
      url, destinatarios: dest,
    });
  } catch { /* nada */ }
}

/** Apaga um treino e avisa quem ia. Devolve null se correu bem, ou a mensagem de erro. */
export async function apagarTreinoComAviso(id: string): Promise<string | null> {
  const { supabase, user } = await getSession();
  if (!user) return "Sessão expirada.";
  const { data: t } = await supabase.from("treinos").select("*").eq("id", id).single();
  if (!t) return "Treino não encontrado.";
  const admin = createAdminClient();
  const dest = sem(await inscritos(admin, "treino", id), user.id);
  const { error } = await supabase.from("treinos").delete().eq("id", id); // o RLS confirma a permissão
  if (error) return "Não foi possível apagar o treino.";
  if (t.gpx_path) await supabase.storage.from("gpx").remove([t.gpx_path]);
  if (t.data >= hojeLisboa()) {
    await enviarAviso({
      tipo: "alteracao", chave: `cancel:treino:${id}`,
      titulo: `Treino cancelado: ${t.titulo}`,
      corpo: `O treino de ${quando(t)} foi desmarcado.`,
      url: "/treinos", destinatarios: dest,
    });
  }
  return null;
}

/** Apaga um evento e avisa quem estava inscrito. */
export async function apagarEventoComAviso(id: string): Promise<string | null> {
  const { supabase, user, isAdmin } = await getSession();
  if (!user || !isAdmin) return "Só admins podem apagar eventos.";
  const { data: e } = await supabase.from("eventos").select("*").eq("id", id).single();
  if (!e) return "Evento não encontrado.";
  const admin = createAdminClient();
  const dest = sem(await inscritos(admin, "evento", id), user.id);
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) return "Não foi possível apagar o evento.";
  if (e.estado !== "cancelado" && e.estado !== "realizado") {
    await enviarAviso({
      tipo: "alteracao", chave: `cancel:evento:${id}`,
      titulo: `Cancelado: ${e.titulo}`,
      corpo: `O evento de ${quando(e)} foi cancelado.`,
      url: "/eventos", destinatarios: dest,
    });
  }
  return null;
}

export async function avisarFeed(postId: string): Promise<void> {
  try {
    const { user } = await getSession();
    if (!user) return;
    const admin = createAdminClient();
    const { data: p } = await admin.from("posts").select("id,autor_id,legenda,fotos,evento_id,perfis(nome),eventos(titulo)").eq("id", postId).single();
    if (!p || p.autor_id !== user.id) return;
    const nome = (p.perfis as unknown as { nome: string } | null)?.nome || "Alguém da equipa";
    const ev = (p.eventos as unknown as { titulo: string } | null)?.titulo;
    const n = (p.fotos as string[] | null)?.length ?? 0;
    const texto = (p.legenda ?? "").replace(/\s+/g, " ").trim();
    await enviarAviso({
      tipo: "feed", chave: `feed:${postId}`,
      titulo: `${nome} publicou no feed${ev ? ` · ${ev}` : ""}`,
      corpo: texto ? (texto.length > 140 ? texto.slice(0, 140) + "…" : texto) : `${n} foto${n === 1 ? "" : "s"} nova${n === 1 ? "" : "s"}.`,
      url: "/fotos",
      destinatarios: sem(await membrosAtivos(admin), user.id),
    });
  } catch { /* nada */ }
}

/** Alguém respondeu a um evento/treino: avisa os admins e quem já vai. */
export async function avisarInscricao(kind: Kind, id: string, antes: string | null): Promise<void> {
  try {
    const { user, perfil } = await getSession();
    if (!user || !perfil) return;
    const admin = createAdminClient();
    const { data: me } = kind === "evento"
      ? await admin.from("inscricoes").select("estado").eq("evento_id", id).eq("user_id", user.id).maybeSingle()
      : await admin.from("treino_participantes").select("estado").eq("treino_id", id).eq("user_id", user.id).maybeSingle();
    const agora = (me?.estado as string | undefined) ?? null;
    if (agora === antes) return;
    const { data: r } = await admin.from(kind === "evento" ? "eventos" : "treinos").select("titulo,data").eq("id", id).single();
    if (!r || (r.data && r.data < hojeLisboa())) return;
    const nome = perfil.nome || "Um atleta";
    let frase: string;
    if (agora === "vai") frase = `${nome} vai a ${r.titulo}`;
    else if (agora === "talvez") frase = `${nome} talvez vá a ${r.titulo}`;
    else if (antes === "vai" || antes === "talvez") frase = `${nome} já não vai a ${r.titulo}`;
    else return;
    const dest = sem([...new Set([...(await admins(admin)), ...(await inscritos(admin, kind, id, false))])], user.id);
    const total = (await inscritos(admin, kind, id, false)).length;
    await enviarAviso({
      tipo: "inscricao", chave: `insc:${kind}:${id}:${user.id}:${agora ?? "sai"}:${hojeLisboa()}`,
      titulo: frase,
      corpo: `${total} atleta${total === 1 ? "" : "s"} confirmado${total === 1 ? "" : "s"}.`,
      url: kind === "evento" ? `/eventos#e-${id}` : "/treinos",
      destinatarios: dest,
    });
  } catch { /* nada */ }
}

/** Envia um aviso de teste à própria pessoa (push e email, ignorando as preferências). */
export async function testarAviso(): Promise<{ push: number; email: number; erro?: string }> {
  const { user } = await getSession();
  if (!user) return { push: 0, email: 0, erro: "Sessão expirada." };
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { push: 0, email: 0, erro: "O push ainda não está configurado no servidor (chaves VAPID)." };
  const r = await enviarAviso({
    tipo: "novo", ignorarPreferencias: true,
    titulo: "Teste de notificação",
    corpo: "Se estás a ler isto, os avisos da EDCycling estão a chegar.",
    url: "/definicoes", destinatarios: [user.id],
  });
  return r;
}
