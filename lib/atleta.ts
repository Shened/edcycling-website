// Dados de perfil do atleta e cálculos derivados.
export interface PerfilAtleta {
  id: string;
  nome: string;
  email?: string | null;
  role?: string;
  avatar_path: string | null;
  data_nascimento: string | null;
  peso: number | null;
  altura: number | null;
  ftp: number | null;
  fc_max: number | null;
  localidade: string | null;
  bicicleta: string | null;
  bio: string | null;
  strava_url: string | null;
  tamanho_camisola: string | null;
  tamanho_calcao: string | null;
  mostrar_peso: boolean;
}

export const CAMPOS_PERFIL =
  "id,nome,email,role,avatar_path,data_nascimento,peso,altura,ftp,fc_max,localidade,bicicleta,bio,strava_url,tamanho_camisola,tamanho_calcao,mostrar_peso";

export const TAMANHOS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatares/${path}`;
}

export function idade(nasc: string | null | undefined): number | null {
  if (!nasc) return null;
  const [y, m, d] = nasc.split("-").map(Number);
  const hoje = new Date();
  let a = hoje.getFullYear() - y;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) a--;
  return a >= 0 && a < 120 ? a : null;
}

export function wkg(ftp: number | null | undefined, peso: number | null | undefined): number | null {
  if (!ftp || !peso) return null;
  return Math.round((ftp / Number(peso)) * 100) / 100;
}

/** Zonas de potência de Coggan (% do FTP). */
export function zonasPotencia(ftp: number) {
  const z: [string, number, number | null][] = [
    ["Z1 Recuperação", 0, 0.55], ["Z2 Resistência", 0.56, 0.75], ["Z3 Tempo", 0.76, 0.9],
    ["Z4 Limiar", 0.91, 1.05], ["Z5 VO2máx", 1.06, 1.2], ["Z6 Anaeróbio", 1.21, 1.5], ["Z7 Neuromuscular", 1.51, null],
  ];
  return z.map(([nome, a, b]) => ({ nome, de: Math.round(ftp * a), ate: b ? Math.round(ftp * b) : null }));
}
