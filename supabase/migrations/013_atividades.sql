-- Atividades pessoais (GPX ou registo manual), ao estilo Strava.
-- Não contam como treinos da equipa; aparecem no perfil de cada atleta.
-- Correr uma vez no SQL Editor do Supabase.

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.perfis on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 80),
  tipo text not null default 'estrada' check (tipo in ('estrada','gravel','btt','rolo','corrida','natacao','caminhada','outro')),
  data date not null,
  hora text,
  km numeric(7,2) check (km is null or km >= 0),
  dmais integer check (dmais is null or dmais >= 0),
  duracao_s integer check (duracao_s is null or duracao_s >= 0),
  trajeto jsonb,
  gpx_path text,
  notas text check (notas is null or char_length(notas) <= 2000),
  privada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists atividades_user_data_idx on public.atividades (user_id, data desc);

alter table public.atividades enable row level security;

-- A equipa vê as atividades públicas; as privadas só o próprio.
drop policy if exists atividades_select on public.atividades;
create policy atividades_select on public.atividades for select to authenticated
  using (public.is_member() and (not privada or user_id = auth.uid()));
drop policy if exists atividades_insert on public.atividades;
create policy atividades_insert on public.atividades for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
drop policy if exists atividades_update on public.atividades;
create policy atividades_update on public.atividades for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists atividades_delete on public.atividades;
create policy atividades_delete on public.atividades for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Os ficheiros GPX usam o bucket "gpx" que já existe (pasta de cada utilizador).
