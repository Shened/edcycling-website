-- Perfil de atleta: foto, dados físicos, bicicleta, tamanhos de equipamento.
-- Correr uma vez no SQL Editor, depois da 009.

alter table public.perfis
  add column if not exists avatar_path text,
  add column if not exists data_nascimento date,
  add column if not exists peso numeric(5,1)  check (peso is null or peso between 25 and 250),
  add column if not exists altura integer       check (altura is null or altura between 100 and 230),
  add column if not exists ftp integer          check (ftp is null or ftp between 50 and 700),
  add column if not exists fc_max integer       check (fc_max is null or fc_max between 100 and 230),
  add column if not exists localidade text,
  add column if not exists bicicleta text,
  add column if not exists bio text,
  add column if not exists strava_url text,
  add column if not exists tamanho_camisola text,
  add column if not exists tamanho_calcao text,
  add column if not exists mostrar_peso boolean not null default false;

-- Cada pessoa edita estes campos no próprio perfil (o role e o estado continuam só para admins).
grant update (nome, ativo, avatar_path, data_nascimento, peso, altura, ftp, fc_max, localidade, bicicleta, bio,
              strava_url, tamanho_camisola, tamanho_calcao, mostrar_peso) on public.perfis to authenticated;

-- Fotos de perfil (bucket público, nomes aleatórios; máx. 2 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists avatares_insert on storage.objects;
create policy avatares_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatares_delete on storage.objects;
create policy avatares_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
