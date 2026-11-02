-- 028: cada evento diz se é desportivo. Os desportivos contam como treino nos números da equipa
--      (treinos, km, D+); os outros (ex.: jantares, convívios) ficam só como eventos.
alter table public.eventos add column if not exists desporto boolean not null default true;
update public.eventos set desporto = false where tipo = 'convivio';
grant update (desporto) on public.eventos to authenticated;

-- Números da página inicial pública: eventos desportivos já feitos contam como treinos e somam km.
create or replace function public.resumo_publico()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'atletas', (select count(*) from perfis where role in ('membro','admin') and atleta),
    'treinos_ano', (select count(*) from treinos
                     where data <= current_date and extract(year from data) = extract(year from current_date))
                 + (select count(*) from eventos
                     where desporto and estado <> 'cancelado' and estado <> 'proposta'
                       and (estado = 'realizado' or data <= current_date)
                       and coalesce(extract(year from data), ano) = extract(year from current_date)),
    'km_ano', (select round(
                 coalesce((select sum(coalesce(km, km_plano, 0)) from treinos
                            where data <= current_date and extract(year from data) = extract(year from current_date)
                              and tipo in ('estrada','gravel','btt','rolo')), 0)
               + coalesce((select sum(km) from eventos
                            where desporto and estado = 'realizado'
                              and coalesce(extract(year from data), ano) = extract(year from current_date)), 0)))
  );
$$;
