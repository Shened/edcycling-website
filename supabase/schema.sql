-- EDCycling — esquema da base de dados
-- Correr uma vez no Supabase: SQL Editor → New query → colar tudo → Run.

-- ============ TABELAS ============

create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  email text,
  role text not null default 'pendente' check (role in ('pendente','membro','admin')),
  ativo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'passeio' check (tipo in ('passeio','treino','prova','convivio')),
  estado text not null default 'proposta' check (estado in ('proposta','confirmado','realizado','cancelado')),
  data date,
  mes smallint not null check (mes between 1 and 12),
  ano smallint not null,
  hora text,
  partida text,
  km integer,
  dmais integer,
  notas text,
  votos integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos on delete cascade,
  user_id uuid not null default auth.uid() references public.perfis on delete cascade,
  estado text not null check (estado in ('vai','talvez','nao')),
  updated_at timestamptz not null default now(),
  unique (evento_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null default auth.uid() references public.perfis on delete cascade,
  legenda text,
  foto_path text not null,
  evento_id uuid references public.eventos on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inscricoes_evento_idx on public.inscricoes (evento_id);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ============ FUNÇÕES DE ACESSO ============

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and role in ('membro','admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and role = 'admin');
$$;

-- Só admins mudam roles (e ninguém muda o próprio).
create or replace function public.set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem mudar roles'; end if;
  if target = auth.uid() then raise exception 'Não podes mudar o teu próprio role'; end if;
  if new_role not in ('pendente','membro','admin') then raise exception 'Role inválido'; end if;
  update public.perfis set role = new_role where id = target;
end $$;

-- Perfil criado automaticamente no primeiro login.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============

alter table public.perfis enable row level security;
alter table public.eventos enable row level security;
alter table public.inscricoes enable row level security;
alter table public.posts enable row level security;

-- perfis: membros veem a equipa; cada um vê o seu; o próprio só edita nome e ativo.
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis for select to authenticated
  using (id = auth.uid() or public.is_member());
drop policy if exists perfis_update_own on public.perfis;
create policy perfis_update_own on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfis from authenticated;
grant update (nome, ativo) on public.perfis to authenticated;

-- eventos: calendário público; só admins escrevem.
drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select to anon, authenticated using (true);
drop policy if exists eventos_admin on public.eventos;
create policy eventos_admin on public.eventos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- inscrições: membros veem todas; cada membro gere a sua; admins podem remover.
drop policy if exists insc_select on public.inscricoes;
create policy insc_select on public.inscricoes for select to authenticated using (public.is_member());
drop policy if exists insc_insert on public.inscricoes;
create policy insc_insert on public.inscricoes for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
drop policy if exists insc_update on public.inscricoes;
create policy insc_update on public.inscricoes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists insc_delete on public.inscricoes;
create policy insc_delete on public.inscricoes for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- posts: só membros veem e publicam; autor ou admin apagam.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (public.is_member());
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (public.is_member() and autor_id = auth.uid());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (autor_id = auth.uid() or public.is_admin());

-- ============ STORAGE (fotos privadas) ============

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists fotos_select on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.is_member());
drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
