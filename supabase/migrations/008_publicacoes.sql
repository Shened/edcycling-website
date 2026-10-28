-- Publicações (notícias) para a página inicial. Correr uma vez no SQL Editor, depois da 007.

create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null default '',
  imagem_path text,
  publicado boolean not null default false,
  publicado_em timestamptz,
  autor_id uuid default auth.uid() references public.perfis on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists noticias_pub_idx on public.noticias (publicado, publicado_em desc);

alter table public.noticias enable row level security;
-- Qualquer pessoa vê as publicadas; os rascunhos só os admins.
drop policy if exists noticias_select on public.noticias;
create policy noticias_select on public.noticias for select to anon, authenticated
  using (publicado or public.is_admin());
drop policy if exists noticias_admin on public.noticias;
create policy noticias_admin on public.noticias for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bucket público para as imagens das publicações (máx. 5 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('noticias', 'noticias', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists noticias_img_insert on storage.objects;
create policy noticias_img_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'noticias' and public.is_admin());
drop policy if exists noticias_img_delete on storage.objects;
create policy noticias_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'noticias' and public.is_admin());
