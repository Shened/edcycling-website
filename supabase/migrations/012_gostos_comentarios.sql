-- Gostos e comentários nas publicações do feed. Correr uma vez no SQL Editor, depois da 011.

create table if not exists public.post_gostos (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references public.perfis on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_gostos enable row level security;
drop policy if exists pg_select on public.post_gostos;
create policy pg_select on public.post_gostos for select to authenticated using (public.is_member());
drop policy if exists pg_insert on public.post_gostos;
create policy pg_insert on public.post_gostos for insert to authenticated with check (public.is_member() and user_id = auth.uid());
drop policy if exists pg_delete on public.post_gostos;
create policy pg_delete on public.post_gostos for delete to authenticated using (user_id = auth.uid());

create table if not exists public.post_comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfis on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_com_post_idx on public.post_comentarios (post_id, created_at);
alter table public.post_comentarios enable row level security;
drop policy if exists pc_select on public.post_comentarios;
create policy pc_select on public.post_comentarios for select to authenticated using (public.is_member());
drop policy if exists pc_insert on public.post_comentarios;
create policy pc_insert on public.post_comentarios for insert to authenticated with check (public.is_member() and autor_id = auth.uid());
drop policy if exists pc_delete on public.post_comentarios;
create policy pc_delete on public.post_comentarios for delete to authenticated using (autor_id = auth.uid() or public.is_admin());

-- Novo tipo de aviso: gostos e comentários nas tuas publicações.
alter table public.preferencias_notif
  add column if not exists reacoes_push boolean not null default true,
  add column if not exists reacoes_email boolean not null default false;
