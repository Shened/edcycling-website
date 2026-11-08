-- 034: associar uma atividade (Strava, GPX ou à mão) ao treino ou evento em que foi feita.
--      Cada atleta passa a contar os SEUS km nesse treino/evento (quem vem de mais longe faz mais km).
alter table public.atividades
  add column if not exists evento_id uuid references public.eventos(id) on delete set null,
  add column if not exists treino_id uuid references public.treinos(id) on delete set null,
  add column if not exists associacao_recusada boolean not null default false;
alter table public.atividades drop constraint if exists atividades_um_so_destino;
alter table public.atividades add constraint atividades_um_so_destino check (evento_id is null or treino_id is null);
create index if not exists atividades_evento_idx on public.atividades (evento_id) where evento_id is not null;
create index if not exists atividades_treino_idx on public.atividades (treino_id) where treino_id is not null;
-- Cada um só mexe nas suas atividades (a regra de update já existente garante user_id = utilizador).
grant update (evento_id, treino_id, associacao_recusada) on public.atividades to authenticated;
