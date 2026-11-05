-- 031: funções "security definer" com search_path vazio (todas as tabelas com o schema escrito por extenso),
--      para não poderem ser enganadas por objetos com o mesmo nome noutro schema.
--      As funções que só fazem sentido com sessão iniciada deixam de poder ser chamadas por visitantes (anon).
--      O comportamento é exatamente o mesmo.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and role in ('membro', 'admin'));
$$;

create or replace function public.marcar_treino(p_treino uuid, p_estado text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'Só membros podem responder'; end if;
  if p_estado is null then
    delete from public.treino_participantes where treino_id = p_treino and user_id = auth.uid();
  elsif p_estado in ('vai', 'talvez', 'nao') then
    insert into public.treino_participantes (treino_id, user_id, estado, updated_at)
    values (p_treino, auth.uid(), p_estado, now())
    on conflict (treino_id, user_id) do update set estado = excluded.estado, updated_at = now();
  else
    raise exception 'Estado inválido';
  end if;
end $$;

create or replace function public.registar_presencas(p_treino uuid, p_presentes uuid[], p_convidados text[] default '{}'::text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem registar presenças'; end if;
  insert into public.treino_participantes (treino_id, user_id, estado, presente, updated_at)
  select p_treino, u, 'vai', true, now() from unnest(coalesce(p_presentes, '{}')) as u
  on conflict (treino_id, user_id) do update set presente = true, updated_at = now();
  update public.treino_participantes set presente = false, updated_at = now()
   where treino_id = p_treino and not (user_id = any(coalesce(p_presentes, '{}')));
  update public.treinos set presencas_fechadas = true, convidados = public.limpar_nomes(p_convidados) where id = p_treino;
end $$;

create or replace function public.registar_presencas_evento(p_evento uuid, p_presentes uuid[], p_convidados text[] default '{}'::text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem registar presenças'; end if;
  insert into public.inscricoes (evento_id, user_id, estado, presente, updated_at)
  select p_evento, u, 'vai', true, now() from unnest(coalesce(p_presentes, '{}')) as u
  on conflict (evento_id, user_id) do update set presente = true, updated_at = now();
  update public.inscricoes set presente = false, updated_at = now()
   where evento_id = p_evento and not (user_id = any(coalesce(p_presentes, '{}')));
  update public.eventos set presencas_fechadas = true, convidados = public.limpar_nomes(p_convidados) where id = p_evento;
end $$;

create or replace function public.resumo_publico()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'atletas', (select count(*) from public.perfis where role in ('membro', 'admin') and atleta),
    'treinos_ano', (select count(*) from public.treinos
                     where data <= current_date and extract(year from data) = extract(year from current_date))
                 + (select count(*) from public.eventos
                     where desporto and estado <> 'cancelado' and estado <> 'proposta'
                       and (estado = 'realizado' or data <= current_date)
                       and coalesce(extract(year from data), ano) = extract(year from current_date)),
    'km_ano', (select round(
                 coalesce((select sum(coalesce(km, km_plano, 0)) from public.treinos
                            where data <= current_date and extract(year from data) = extract(year from current_date)
                              and tipo in ('estrada', 'gravel', 'btt', 'rolo')), 0)
               + coalesce((select sum(km) from public.eventos
                            where desporto and estado = 'realizado'
                              and coalesce(extract(year from data), ano) = extract(year from current_date)), 0)))
  );
$$;

create or replace function public.set_atleta(target uuid, valor boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem mudar esta opção'; end if;
  update public.perfis set atleta = valor where id = target;
end $$;

create or replace function public.set_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem mudar roles'; end if;
  if target = auth.uid() then raise exception 'Não podes mudar o teu próprio role'; end if;
  if new_role not in ('pendente', 'membro', 'admin') then raise exception 'Role inválido'; end if;
  update public.perfis set role = new_role where id = target;
end $$;

-- Visitantes sem sessão não precisam destas (is_admin/is_member/resumo_publico ficam como estão:
-- são usadas nas regras de acesso e na página pública).
revoke execute on function public.set_role(uuid, text) from anon, public;
revoke execute on function public.set_atleta(uuid, boolean) from anon, public;
revoke execute on function public.marcar_treino(uuid, text) from anon, public;
revoke execute on function public.registar_presencas(uuid, uuid[], text[]) from anon, public;
revoke execute on function public.registar_presencas_evento(uuid, uuid[], text[]) from anon, public;
grant execute on function public.set_role(uuid, text) to authenticated;
grant execute on function public.set_atleta(uuid, boolean) to authenticated;
grant execute on function public.marcar_treino(uuid, text) to authenticated;
grant execute on function public.registar_presencas(uuid, uuid[], text[]) to authenticated;
grant execute on function public.registar_presencas_evento(uuid, uuid[], text[]) to authenticated;
