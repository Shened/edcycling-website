-- Ligação ao Strava: importar atividades sem ficheiros.
-- Os tokens de cada atleta ficam numa tabela sem políticas: só o servidor (chave secreta) lhes chega.

create table if not exists public.strava_contas (
  user_id uuid primary key references public.perfis(id) on delete cascade,
  athlete_id bigint not null unique,
  nome text,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.strava_contas enable row level security;

-- Cada atividade do Strava só entra uma vez por atleta.
alter table public.atividades add column if not exists strava_id bigint;
create unique index if not exists atividades_user_strava on public.atividades (user_id, strava_id);
