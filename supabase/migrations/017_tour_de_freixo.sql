-- Tour de Freixo dentro do site da EDCycling: classificações públicas, edição só por admins.
-- Correr uma vez no SQL Editor do Supabase da EDCycling. Depois corre 018 para copiar os dados.

create table if not exists public.tdf_riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text,
  created_at timestamptz default now()
);

create table if not exists public.tdf_stages (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  name text not null,
  date date,
  distance_km numeric,
  elevation_gain_m numeric,
  max_gradient_pct numeric,
  created_at timestamptz default now()
);

create table if not exists public.tdf_stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tdf_stages(id) on delete cascade,
  rider_id uuid not null references public.tdf_riders(id) on delete cascade,
  status text not null default 'FINISHED' check (status in ('FINISHED', 'DNS', 'DNF')),
  time_seconds int,
  avg_speed_kmh numeric,
  created_at timestamptz default now(),
  unique (stage_id, rider_id)
);

create table if not exists public.tdf_goals (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tdf_stages(id) on delete cascade,
  type text not null check (type in ('SPRINT', 'MOUNTAIN')),
  name text not null,
  order_index int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.tdf_goal_results (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.tdf_goals(id) on delete cascade,
  rider_id uuid not null references public.tdf_riders(id) on delete cascade,
  position int not null check (position between 1 and 10),
  created_at timestamptz default now(),
  unique (goal_id, rider_id),
  unique (goal_id, position)
);

-- Leitura pública (qualquer visitante); escrita só para admins da EDCycling.
do $$
declare t text;
begin
  foreach t in array array['tdf_riders','tdf_stages','tdf_stage_results','tdf_goals','tdf_goal_results'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_ler', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_ler', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;
