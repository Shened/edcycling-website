-- 029: votação de datas nos eventos. Um admin propõe várias datas; cada atleta marca as que lhe dão
--      jeito (pode escolher várias); o admin escolhe a data final e a votação fecha.

alter table public.eventos add column if not exists sondagem text
  check (sondagem is null or sondagem in ('aberta', 'fechada'));

create table if not exists public.evento_opcoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  data date not null,
  hora text check (hora is null or hora ~ '^[0-2][0-9]:[0-5][0-9]'),
  nota text check (nota is null or char_length(nota) <= 80),
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (evento_id, data, hora)
);
create index if not exists evento_opcoes_evento_idx on public.evento_opcoes (evento_id);

create table if not exists public.evento_opcao_votos (
  opcao_id uuid not null references public.evento_opcoes(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id uuid not null references public.perfis(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opcao_id, user_id)
);
create index if not exists evento_opcao_votos_evento_idx on public.evento_opcao_votos (evento_id);
create index if not exists evento_opcao_votos_user_idx on public.evento_opcao_votos (user_id);

alter table public.evento_opcoes enable row level security;
alter table public.evento_opcao_votos enable row level security;
revoke all on public.evento_opcoes, public.evento_opcao_votos from anon;
grant select, insert, update, delete on public.evento_opcoes to authenticated;
grant select, insert, delete on public.evento_opcao_votos to authenticated;
grant update (sondagem) on public.eventos to authenticated;

-- Opções: toda a equipa vê; só admins criam, mudam ou apagam.
drop policy if exists evento_opcoes_sel on public.evento_opcoes;
create policy evento_opcoes_sel on public.evento_opcoes for select to authenticated using (public.is_member());
drop policy if exists evento_opcoes_ins on public.evento_opcoes;
create policy evento_opcoes_ins on public.evento_opcoes for insert to authenticated with check (public.is_admin());
drop policy if exists evento_opcoes_upd on public.evento_opcoes;
create policy evento_opcoes_upd on public.evento_opcoes for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists evento_opcoes_del on public.evento_opcoes;
create policy evento_opcoes_del on public.evento_opcoes for delete to authenticated using (public.is_admin());

-- Votos: toda a equipa vê quem pode em cada data; cada um só mexe nos seus e só com a votação aberta.
drop policy if exists evento_opcao_votos_sel on public.evento_opcao_votos;
create policy evento_opcao_votos_sel on public.evento_opcao_votos for select to authenticated using (public.is_member());
drop policy if exists evento_opcao_votos_ins on public.evento_opcao_votos;
create policy evento_opcao_votos_ins on public.evento_opcao_votos for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_member()
    and exists (
      select 1 from public.evento_opcoes o join public.eventos e on e.id = o.evento_id
      where o.id = opcao_id and o.evento_id = evento_id and e.sondagem = 'aberta'
    )
  );
drop policy if exists evento_opcao_votos_del on public.evento_opcao_votos;
create policy evento_opcao_votos_del on public.evento_opcao_votos for delete to authenticated
  using (user_id = (select auth.uid()));
