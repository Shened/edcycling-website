-- 1) Eventos só visíveis para membros (antes eram públicos).
drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select to authenticated using (public.is_member());

-- 2) Presenças com participantes sem conta (nomes escritos à mão).
alter table public.treinos     add column if not exists convidados text[] not null default '{}';
alter table public.eventos     add column if not exists convidados text[] not null default '{}';
alter table public.eventos     add column if not exists presencas_fechadas boolean not null default false;
alter table public.inscricoes  add column if not exists presente boolean;

-- Membros só mexem na própria resposta; "presente" é só pelas funções de admin.
revoke insert, update on public.inscricoes from authenticated;
grant insert (evento_id, user_id, estado, updated_at), update (evento_id, user_id, estado, updated_at) on public.inscricoes to authenticated;

create or replace function public.limpar_nomes(p text[]) returns text[]
language sql immutable as $$
  select coalesce(array_agg(n order by n), '{}')
  from (select distinct regexp_replace(btrim(x), '\s+', ' ', 'g') as n from unnest(coalesce(p, '{}')) as x) s
  where n <> '';
$$;

drop function if exists public.registar_presencas(uuid, uuid[]);
create or replace function public.registar_presencas(p_treino uuid, p_presentes uuid[], p_convidados text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem registar presenças'; end if;
  insert into treino_participantes (treino_id, user_id, estado, presente, updated_at)
  select p_treino, u, 'vai', true, now() from unnest(coalesce(p_presentes, '{}')) as u
  on conflict (treino_id, user_id) do update set presente = true, updated_at = now();
  update treino_participantes set presente = false, updated_at = now()
   where treino_id = p_treino and not (user_id = any(coalesce(p_presentes, '{}')));
  update treinos set presencas_fechadas = true, convidados = public.limpar_nomes(p_convidados) where id = p_treino;
end $$;

create or replace function public.registar_presencas_evento(p_evento uuid, p_presentes uuid[], p_convidados text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem registar presenças'; end if;
  insert into inscricoes (evento_id, user_id, estado, presente, updated_at)
  select p_evento, u, 'vai', true, now() from unnest(coalesce(p_presentes, '{}')) as u
  on conflict (evento_id, user_id) do update set presente = true, updated_at = now();
  update inscricoes set presente = false, updated_at = now()
   where evento_id = p_evento and not (user_id = any(coalesce(p_presentes, '{}')));
  update eventos set presencas_fechadas = true, convidados = public.limpar_nomes(p_convidados) where id = p_evento;
end $$;

revoke execute on function public.registar_presencas(uuid, uuid[], text[]) from public, anon;
revoke execute on function public.registar_presencas_evento(uuid, uuid[], text[]) from public, anon;
grant execute on function public.registar_presencas(uuid, uuid[], text[]) to authenticated;
grant execute on function public.registar_presencas_evento(uuid, uuid[], text[]) to authenticated;

-- 3) Números para a página de apresentação: só totais, sem datas nem locais.
create or replace function public.resumo_publico() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'atletas', (select count(*) from perfis where role in ('membro','admin')),
    'treinos_ano', (select count(*) from treinos
                     where data <= current_date and extract(year from data) = extract(year from current_date)),
    'km_ano', (select round(
                 coalesce((select sum(coalesce(km, km_plano, 0)) from treinos
                            where data <= current_date and extract(year from data) = extract(year from current_date)), 0)
               + coalesce((select sum(km) from eventos
                            where estado = 'realizado' and coalesce(extract(year from data), ano) = extract(year from current_date)), 0)))
  );
$$;
revoke execute on function public.resumo_publico() from public;
grant execute on function public.resumo_publico() to anon, authenticated;
