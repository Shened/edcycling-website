-- Tour de Freixo com várias edições (uma por ano). Correr depois da 017 e da 018.
-- O que já existe fica na edição de 2026, com todos os atletas como participantes.

create table if not exists public.tdf_edicoes (
  id uuid primary key default gen_random_uuid(),
  ano int not null unique,
  created_at timestamptz default now()
);

create table if not exists public.tdf_participantes (
  edicao_id uuid not null references public.tdf_edicoes(id) on delete cascade,
  rider_id uuid not null references public.tdf_riders(id) on delete cascade,
  primary key (edicao_id, rider_id)
);

alter table public.tdf_stages add column if not exists edicao_id uuid references public.tdf_edicoes(id) on delete cascade;

insert into public.tdf_edicoes (ano) values (2026) on conflict (ano) do nothing;

update public.tdf_stages
set edicao_id = (select id from public.tdf_edicoes where ano = 2026)
where edicao_id is null;

insert into public.tdf_participantes (edicao_id, rider_id)
select e.id, r.id from public.tdf_edicoes e cross join public.tdf_riders r
where e.ano = 2026
on conflict do nothing;

alter table public.tdf_stages alter column edicao_id set not null;

-- O número da etapa passa a ser único dentro de cada edição (cada ano recomeça na etapa 1).
alter table public.tdf_stages drop constraint if exists tdf_stages_number_key;
create unique index if not exists tdf_stages_edicao_numero on public.tdf_stages (edicao_id, number);

-- Leitura pública, escrita só para admins (como as outras tabelas do Tour).
alter table public.tdf_edicoes enable row level security;
alter table public.tdf_participantes enable row level security;

drop policy if exists tdf_edicoes_ler on public.tdf_edicoes;
create policy tdf_edicoes_ler on public.tdf_edicoes for select to anon, authenticated using (true);
drop policy if exists tdf_edicoes_admin on public.tdf_edicoes;
create policy tdf_edicoes_admin on public.tdf_edicoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists tdf_participantes_ler on public.tdf_participantes;
create policy tdf_participantes_ler on public.tdf_participantes for select to anon, authenticated using (true);
drop policy if exists tdf_participantes_admin on public.tdf_participantes;
create policy tdf_participantes_admin on public.tdf_participantes for all to authenticated using (public.is_admin()) with check (public.is_admin());
