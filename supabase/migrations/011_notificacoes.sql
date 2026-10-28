-- Notificações (push no telemóvel e email). Correr uma vez no SQL Editor, depois da 010.

-- Preferências de cada pessoa: que avisos recebe e por onde.
create table if not exists public.preferencias_notif (
  user_id uuid primary key references public.perfis on delete cascade,
  novo_push boolean not null default true,       novo_email boolean not null default false,
  lembrete_push boolean not null default true,   lembrete_email boolean not null default true,
  alteracao_push boolean not null default true,  alteracao_email boolean not null default true,
  feed_push boolean not null default true,       feed_email boolean not null default false,
  inscricao_push boolean not null default true,  inscricao_email boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.preferencias_notif enable row level security;
drop policy if exists pn_own on public.preferencias_notif;
create policy pn_own on public.preferencias_notif for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Telemóveis/browsers onde a pessoa ativou o push.
create table if not exists public.push_subscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.perfis on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  created_at timestamptz not null default now()
);
create index if not exists push_sub_user_idx on public.push_subscricoes (user_id);
alter table public.push_subscricoes enable row level security;
drop policy if exists ps_own on public.push_subscricoes;
create policy ps_own on public.push_subscricoes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Registo do que já foi enviado (evita avisos repetidos). Só o servidor escreve.
create table if not exists public.notif_enviadas (
  chave text primary key,
  created_at timestamptz not null default now()
);
alter table public.notif_enviadas enable row level security;
