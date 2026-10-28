export type Role = "pendente" | "membro" | "admin";
export type EstadoEvento = "proposta" | "confirmado" | "realizado" | "cancelado";
export type TipoEvento = "passeio" | "treino" | "prova" | "convivio";
export type EstadoInscricao = "vai" | "talvez" | "nao";

export interface Perfil {
  id: string;
  nome: string;
  email: string | null;
  role: Role;
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
}

export interface Inscricao {
  id: string;
  evento_id: string;
  user_id: string;
  estado: EstadoInscricao;
  perfis: { nome: string } | null;
}

export interface Post {
  id: string;
  autor_id: string;
  legenda: string | null;
  foto_path: string;
  evento_id: string | null;
  created_at: string;
  perfis: { nome: string } | null;
  eventos: { titulo: string } | null;
  url?: string | null;
}
