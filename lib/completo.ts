// "Perfil completo": o que falta a cada atleta preencher ou ligar (só servidor).
import { createAdminClient } from "@/lib/supabase/admin";

export interface ItemPerfil { k: string; label: string; dica: string; feito: boolean; href: string }
export interface Completude { pct: number; feitos: number; total: number; itens: ItemPerfil[] }

interface Linha {
  id: string; avatar_path: string | null; data_nascimento: string | null; localidade: string | null; bio: string | null;
  bicicleta: string | null; bicicleta_btt?: string | null; bicicleta_cx?: string | null; tamanho_camisola: string | null; tamanho_calcao: string | null;
}

const cheio = (v?: string | null) => !!v && v.trim().length > 0;

function calcular(p: Linha, strava: boolean, push: boolean, calendario: boolean): Completude {
  const itens: ItemPerfil[] = [
    { k: "foto", label: "Foto de perfil", dica: "Para a equipa te reconhecer nas listas de quem vai.", feito: cheio(p.avatar_path), href: "/perfil#perfil-foto" },
    { k: "nascimento", label: "Data de nascimento", dica: "Só aparece a idade, nunca a data.", feito: cheio(p.data_nascimento), href: "/perfil#pNasc" },
    { k: "localidade", label: "Localidade", dica: "Ajuda a combinar boleias e pontos de encontro.", feito: cheio(p.localidade), href: "/perfil#pLoc" },
    { k: "bicicleta", label: "A tua bicicleta", dica: "Estrada, BTT ou gravel: basta uma.", feito: cheio(p.bicicleta) || cheio(p.bicicleta_btt) || cheio(p.bicicleta_cx), href: "/perfil#pBike" },
    { k: "tamanhos", label: "Tamanhos do equipamento", dica: "Camisola e calções, para as encomendas da equipa.", feito: cheio(p.tamanho_camisola) && cheio(p.tamanho_calcao), href: "/perfil#pCam" },
    { k: "bio", label: "Apresentação", dica: "Duas linhas sobre ti e como começaste a pedalar.", feito: cheio(p.bio), href: "/perfil#pBio" },
    { k: "strava", label: "Ligar o Strava", dica: "As tuas voltas entram sozinhas no site.", feito: strava, href: "/definicoes#stvT" },
    { k: "push", label: "Ativar notificações", dica: "Para saberes logo de eventos novos e alterações.", feito: push, href: "/definicoes" },
    { k: "calendario", label: "Calendário no telemóvel", dica: "Os eventos e treinos aparecem no teu calendário.", feito: calendario, href: "/definicoes#calT" },
  ];
  const feitos = itens.filter((i) => i.feito).length;
  return { pct: Math.round((feitos / itens.length) * 100), feitos, total: itens.length, itens };
}

const CAMPOS = "id,avatar_path,data_nascimento,localidade,bio,bicicleta,bicicleta_btt,bicicleta_cx,tamanho_camisola,tamanho_calcao";

/** Completude de vários perfis de uma vez (página inicial, perfil e Gestão → Membros). */
export async function completudes(ids: string[]): Promise<Map<string, Completude>> {
  const out = new Map<string, Completude>();
  if (!ids.length) return out;
  try {
    const admin = createAdminClient();
    const [{ data: perfis }, { data: strava }, { data: push }, { data: cal }] = await Promise.all([
      admin.from("perfis").select(CAMPOS).in("id", ids),
      admin.from("strava_contas").select("user_id").in("user_id", ids),
      admin.from("push_subscricoes").select("user_id").in("user_id", ids),
      admin.from("calendario_tokens").select("user_id").in("user_id", ids),
    ]);
    const s = new Set((strava ?? []).map((x) => x.user_id as string));
    const p = new Set((push ?? []).map((x) => x.user_id as string));
    const c = new Set((cal ?? []).map((x) => x.user_id as string));
    for (const l of (perfis ?? []) as unknown as Linha[]) out.set(l.id, calcular(l, s.has(l.id), p.has(l.id), c.has(l.id)));
  } catch { /* sem chave secreta ou tabela em falta: não mostra nada */ }
  return out;
}

export async function completude(id: string): Promise<Completude | null> {
  return (await completudes([id])).get(id) ?? null;
}
