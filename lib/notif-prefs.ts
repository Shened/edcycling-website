// Preferências de notificação (partilhado entre servidor e browser).
export type TipoAviso = "novo" | "lembrete" | "alteracao" | "feed" | "inscricao" | "reacoes";
export type Canal = "push" | "email";
export type Prefs = Record<`${TipoAviso}_${Canal}`, boolean>;

export const PREF_DEFAULTS: Prefs = {
  novo_push: true, novo_email: false,
  lembrete_push: true, lembrete_email: true,
  alteracao_push: true, alteracao_email: true,
  feed_push: true, feed_email: false,
  inscricao_push: true, inscricao_email: false,
  reacoes_push: true, reacoes_email: false,
};

export const TIPOS_AVISO: { k: TipoAviso; t: string; d: string }[] = [
  { k: "novo", t: "Novos eventos e treinos", d: "Quando é marcado um evento ou alguém agenda um treino." },
  { k: "lembrete", t: "Lembrete na véspera", d: "Na véspera, se disseste “vou” ou “talvez”: hora e ponto de encontro." },
  { k: "alteracao", t: "Alterações e cancelamentos", d: "Quando muda a data, hora ou local de algo em que estás inscrito, ou é cancelado." },
  { k: "inscricao", t: "Quem vai e quem sai", d: "Quando alguém se junta ou deixa um evento/treino onde também vais (os admins recebem todos)." },
  { k: "feed", t: "Publicações no feed", d: "Quando alguém publica no feed da equipa." },
  { k: "reacoes", t: "Gostos e comentários", d: "Quando alguém gosta ou comenta uma publicação tua (e respostas onde comentaste)." },
];
