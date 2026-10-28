-- Treinos de corrida e natação (correr uma vez no SQL Editor, depois da 005).

alter table public.treinos drop constraint if exists treinos_tipo_check;
alter table public.treinos add constraint treinos_tipo_check
  check (tipo in ('estrada','gravel','btt','rolo','corrida','natacao'));

-- Distância planeada com decimais (ex.: 1,5 km de natação).
alter table public.treinos alter column km_plano type numeric(7,2);

-- Os km da página pública contam só bicicleta.
create or replace function public.resumo_publico() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'atletas', (select count(*) from perfis where role in ('membro','admin')),
    'treinos_ano', (select count(*) from treinos
                     where data <= current_date and extract(year from data) = extract(year from current_date)),
    'km_ano', (select round(
                 coalesce((select sum(coalesce(km, km_plano, 0)) from treinos
                            where data <= current_date and extract(year from data) = extract(year from current_date)
                              and tipo in ('estrada','gravel','btt','rolo')), 0)
               + coalesce((select sum(km) from eventos
                            where estado = 'realizado' and coalesce(extract(year from data), ano) = extract(year from current_date)), 0)))
  );
$$;
