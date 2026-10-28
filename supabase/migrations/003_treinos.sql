-- Treinos da equipa + ficheiros GPX (correr uma vez no SQL Editor).

create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  hora text,
  tipo text not null default 'estrada' check (tipo in ('estrada','gravel','btt','rolo')),
  intensidade text check (intensidade in ('leve','moderado','intenso')),
  partida text,
  km_plano integer,
  notas text,
  -- Preenchidos a partir do GPX
  gpx_path text,
  km numeric(7,2),
  dmais integer,
  duracao_s integer,
  trajeto jsonb,
  criador_id uuid not null default auth.uid() references public.perfis on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists treinos_data_idx on public.treinos (data);

alter table public.treinos enable row level security;

-- Membros veem e criam treinos; quem criou (ou um admin) altera e apaga.
drop policy if exists treinos_select on public.treinos;
create policy treinos_select on public.treinos for select to authenticated using (public.is_member());
drop policy if exists treinos_insert on public.treinos;
create policy treinos_insert on public.treinos for insert to authenticated
  with check (public.is_member() and criador_id = auth.uid());
drop policy if exists treinos_update on public.treinos;
create policy treinos_update on public.treinos for update to authenticated
  using (criador_id = auth.uid() or public.is_admin())
  with check (criador_id = auth.uid() or public.is_admin());
drop policy if exists treinos_delete on public.treinos;
create policy treinos_delete on public.treinos for delete to authenticated
  using (criador_id = auth.uid() or public.is_admin());

-- Bucket privado para os GPX (máx. 20 MB por ficheiro).
insert into storage.buckets (id, name, public, file_size_limit)
values ('gpx', 'gpx', false, 20971520)
on conflict (id) do nothing;

drop policy if exists gpx_select on storage.objects;
create policy gpx_select on storage.objects for select to authenticated
  using (bucket_id = 'gpx' and public.is_member());
drop policy if exists gpx_insert on storage.objects;
create policy gpx_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'gpx' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists gpx_delete on storage.objects;
create policy gpx_delete on storage.objects for delete to authenticated
  using (bucket_id = 'gpx' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
