export interface Equipamento {
  id: string;
  nome: string;
  descricao: string | null;
  foto_path: string | null;
  ativo: boolean;
  ordem: number;
}

/** Foto do equipamento (bucket público "noticias", pasta equipamentos/). */
export function fotoEquipamento(path: string | null | undefined): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/noticias/${path}` : null;
}
