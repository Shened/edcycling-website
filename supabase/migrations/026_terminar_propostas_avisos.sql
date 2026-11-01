-- 026: eventos terminados com percurso, propostas de eventos pelos atletas (com votação)
--      e lista de avisos no site (o sino 🔔).

-- 1) Percurso real do evento (vem da atividade de quem foi, de um GPX/FIT ou à mão)
alter table public.eventos alter column km type numeric(7,2) using km::numeric;
alter table public.eventos
  add column if not exists duracao_s integer check (duracao_s is null or duracao_s >= 0),
  add column if not exists trajeto jsonb,
  add column if not exists gpx_path text,
  add column if not exists criador_id uuid references public.perfis(id) on delete set null;
alter table public.eventos alter column criador_id set default auth.uid();
create index if not exists eventos_criador_idx on public.eventos (criador_id);
grant update (km, duracao_s, trajeto, gpx_path) on public.eventos to authenticated;

-- 2) Qualquer atleta pode propor um evento; só pode mexer nas suas propostas enquanto forem propostas.
drop policy if exists eventos_proposta_ins on public.eventos;
create policy eventos_proposta_ins on public.eventos for insert to authenticated
  with check (public.is_member() and estado = 'proposta' and criador_id = (select auth.uid()));
drop policy if exists eventos_proposta_upd on public.eventos;
create policy eventos_proposta_upd on public.eventos for update to authenticated
  using (estado = 'proposta' and criador_id = (select auth.uid()))
  with check (estado = 'proposta' and criador_id = (select auth.uid()));
drop policy if exists eventos_proposta_del on public.eventos;
create policy eventos_proposta_del on public.eventos for delete to authenticated
  using (estado = 'proposta' and criador_id = (select auth.uid()));

-- 3) Votação "Vale a pena fazer?" (um voto por atleta, enquanto o evento é proposta)
create table if not exists public.evento_votos (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id uuid not null references public.perfis(id) on delete cascade,
  voto text not null check (voto in ('sim', 'talvez', 'nao')),
  comentario text check (comentario is null or char_length(comentario) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evento_id, user_id)
);
create index if not exists evento_votos_user_idx on public.evento_votos (user_id);
alter table public.evento_votos enable row level security;
revoke all on public.evento_votos from anon;
grant select, insert, update, delete on public.evento_votos to authenticated;
drop policy if exists evento_votos_sel on public.evento_votos;
create policy evento_votos_sel on public.evento_votos for select to authenticated using (public.is_member());
drop policy if exists evento_votos_ins on public.evento_votos;
create policy evento_votos_ins on public.evento_votos for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member()
    and exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'proposta'));
drop policy if exists evento_votos_upd on public.evento_votos;
create policy evento_votos_upd on public.evento_votos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'proposta'));
drop policy if exists evento_votos_del on public.evento_votos;
create policy evento_votos_del on public.evento_votos for delete to authenticated using (user_id = (select auth.uid()));

-- 4) Avisos guardados no site (aparecem no sino, mesmo que o push/email falhe ou esteja desligado).
--    Só o servidor (chave secreta) escreve; cada pessoa lê e marca como lidos os seus.
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  url text,
  lido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists avisos_user_idx on public.avisos (user_id, created_at desc);
create index if not exists avisos_por_ler_idx on public.avisos (user_id) where lido_em is null;
alter table public.avisos enable row level security;
revoke all on public.avisos from anon, authenticated;
grant select on public.avisos to authenticated;
grant update (lido_em) on public.avisos to authenticated;
drop policy if exists avisos_sel on public.avisos;
create policy avisos_sel on public.avisos for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists avisos_upd on public.avisos;
create policy avisos_upd on public.avisos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
