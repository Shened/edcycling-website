export type Role = "pendente" | "membro" | "admin";
export type EstadoEvento = "proposta" | "confirmado" | "realizado" | "cancelado";
export type TipoEvento = "passeio" | "treino" | "prova" | "convivio";
export type EstadoInscricao = "vai" | "talvez" | "nao";

export interface Perfil {
  id: string;
  nome: string;
  email: string | null;
  role: Role;
  ativo?: boolean;
  atleta?: boolean;
  avatar_path?: string | null;
  created_at?: string;
}

export interface Evento {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  data: string | null;
  mes: number;
  ano: number;
  hora: string | null;
  partida: string | null;
  km: number | null;
  dmais: number | null;
  notas: string | null;
  votos: number | null;
  presencas_fechadas?: boolean;
  convidados?: string[];
  tema?: string | null;
  equipamento_id?: string | null;
  equipamento?: { nome: string; descricao: string | null; foto_path: string | null } | null;
}

export interface Inscricao {
  id: string;
  evento_id: string;
  user_id: string;
  estado: EstadoInscricao;
  presente?: boolean | null;
  perfis: { nome: string; avatar_path?: string | null } | null;
}

export interface Post {
  id: string;
  autor_id: string;
  legenda: string | null;
  foto_path: string | null;
  fotos: string[];
  evento_id: string | null;
  created_at: string;
  perfis: { nome: string; avatar_path?: string | null } | null;
  eventos: { titulo: string } | null;
  urls?: string[];
  post_gostos?: { user_id: string; perfis: { nome: string } | null }[];
  post_comentarios?: Comentario[];
}

export interface Comentario {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  perfis: { nome: string; avatar_path?: string | null } | null;
}

export type TipoTreino = "estrada" | "gravel" | "btt" | "rolo" | "corrida" | "natacao";
export type Intensidade = "leve" | "moderado" | "intenso";

export interface Treino {
  id: string;
  titulo: string;
  data: string;
  hora: string | null;
  tipo: TipoTreino;
  intensidade: Intensidade | null;
  partida: string | null;
  km_plano: number | null;
  notas: string | null;
  gpx_path: string | null;
  km: number | null;
  dmais: number | null;
  duracao_s: number | null;
  trajeto: [number, number][] | null;
  criador_id: string;
  perfis: { nome: string } | null;
  presencas_fechadas?: boolean;
  convidados?: string[];
  treino_participantes?: Participante[];
}

export interface Participante {
  user_id: string;
  estado: EstadoInscricao;
  presente: boolean | null;
}

export interface Membro { id: string; nome: string }

export interface Atividade {
  id: string;
  user_id: string;
  titulo: string;
  tipo: string;
  data: string;
  hora: string | null;
  km: number | null;
  dmais: number | null;
  duracao_s: number | null;
  trajeto: [number, number][] | null;
  gpx_path: string | null;
  notas: string | null;
  privada: boolean;
  created_at?: string;
}
