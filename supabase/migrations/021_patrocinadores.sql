-- Patrocinadores da equipa, mostrados no fundo de todas as páginas do site.
-- Correr uma vez no SQL Editor do Supabase.

create table if not exists public.patrocinadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  logo_path text,
  url text check (url is null or url ~* '^https?://'),
  principal boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.patrocinadores enable row level security;

-- Qualquer visitante vê os ativos; os admins veem e gerem todos.
drop policy if exists patrocinadores_ler on public.patrocinadores;
create policy patrocinadores_ler on public.patrocinadores for select to anon, authenticated
  using (ativo or public.is_admin());
drop policy if exists patrocinadores_admin on public.patrocinadores;
create policy patrocinadores_admin on public.patrocinadores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Os logótipos ficam no bucket público "noticias", na pasta patrocinadores/ (só admins enviam).
