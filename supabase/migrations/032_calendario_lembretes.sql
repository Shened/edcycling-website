-- 032: link pessoal para subscrever o calendário da equipa e prazo/lembrete da votação de datas.

-- 1) Um link secreto por pessoa (o calendário do telemóvel não tem sessão iniciada; o segredo faz de chave).
create table if not exists public.calendario_tokens (
  user_id uuid primary key references public.perfis(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
alter table public.calendario_tokens enable row level security;
revoke all on public.calendario_tokens from anon;
grant select, insert, delete on public.calendario_tokens to authenticated;
drop policy if exists calendario_tokens_sel on public.calendario_tokens;
create policy calendario_tokens_sel on public.calendario_tokens for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists calendario_tokens_ins on public.calendario_tokens;
create policy calendario_tokens_ins on public.calendario_tokens for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member());
drop policy if exists calendario_tokens_del on public.calendario_tokens;
create policy calendario_tokens_del on public.calendario_tokens for delete to authenticated using (user_id = (select auth.uid()));

-- 2) Votação de datas: quando abriu e (opcional) até quando se pode votar. O lembrete diário usa os dois.
alter table public.eventos
  add column if not exists sondagem_desde timestamptz,
  add column if not exists sondagem_ate date;
grant update (sondagem_desde, sondagem_ate) on public.eventos to authenticated;
