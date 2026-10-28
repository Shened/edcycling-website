-- Contas de gestão: admins que não são atletas (ex.: o email da equipa).
-- Não aparecem nas listas de presenças, no ranking nem na contagem de atletas.

alter table public.perfis add column if not exists atleta boolean not null default true;

-- Só admins mudam esta opção.
create or replace function public.set_atleta(target uuid, valor boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem mudar esta opção'; end if;
  update public.perfis set atleta = valor where id = target;
end $$;
revoke execute on function public.set_atleta(uuid, boolean) from public, anon;
grant execute on function public.set_atleta(uuid, boolean) to authenticated;

-- Contagem de atletas da página pública sem as contas de gestão.
create or replace function public.resumo_publico() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'atletas', (select count(*) from perfis where role in ('membro','admin') and atleta),
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

-- Marca já a conta da equipa como conta de gestão:
update public.perfis set atleta = false where email = 'teamedcycling@gmail.com';
