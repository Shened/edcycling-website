-- Participantes dos treinos + registo de presenças pelos admins (correr uma vez no SQL Editor).

alter table public.treinos add column if not exists presencas_fechadas boolean not null default false;

create table if not exists public.treino_participantes (
  treino_id uuid not null references public.treinos on delete cascade,
  user_id uuid not null references public.perfis on delete cascade,
  estado text not null default 'vai' check (estado in ('vai','talvez','nao')),
  presente boolean,            -- preenchido pelo admin no fim do treino
  updated_at timestamptz not null default now(),
  primary key (treino_id, user_id)
);
create index if not exists treino_part_user_idx on public.treino_participantes (user_id);

alter table public.treino_participantes enable row level security;
drop policy if exists tp_select on public.treino_participantes;
create policy tp_select on public.treino_participantes for select to authenticated using (public.is_member());
-- As escritas fazem-se só pelas duas funções abaixo.
revoke insert, update, delete on public.treino_participantes from authenticated, anon;

-- Membro responde Vou / Talvez / Não vou (null = retirar resposta).
create or replace function public.marcar_treino(p_treino uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Só membros podem responder'; end if;
  if p_estado is null then
    delete from treino_participantes where treino_id = p_treino and user_id = auth.uid();
  elsif p_estado in ('vai','talvez','nao') then
    insert into treino_participantes (treino_id, user_id, estado, updated_at)
    values (p_treino, auth.uid(), p_estado, now())
    on conflict (treino_id, user_id) do update set estado = excluded.estado, updated_at = now();
  else
    raise exception 'Estado inválido';
  end if;
end $$;

-- Admin regista quem foi ao treino (lista final; substitui a anterior).
create or replace function public.registar_presencas(p_treino uuid, p_presentes uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só admins podem registar presenças'; end if;
  insert into treino_participantes (treino_id, user_id, estado, presente, updated_at)
  select p_treino, u, 'vai', true, now() from unnest(coalesce(p_presentes, '{}')) as u
  on conflict (treino_id, user_id) do update set presente = true, updated_at = now();
  update treino_participantes set presente = false, updated_at = now()
   where treino_id = p_treino and not (user_id = any(coalesce(p_presentes, '{}')));
  update treinos set presencas_fechadas = true where id = p_treino;
end $$;

revoke execute on function public.marcar_treino(uuid, text) from public, anon;
revoke execute on function public.registar_presencas(uuid, uuid[]) from public, anon;
grant execute on function public.marcar_treino(uuid, text) to authenticated;
grant execute on function public.registar_presencas(uuid, uuid[]) to authenticated;
