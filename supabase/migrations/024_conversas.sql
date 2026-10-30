-- Conversa (comentários) nas páginas dos eventos e dos treinos.
-- Correr uma vez no SQL Editor do Supabase.

create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.eventos on delete cascade,
  treino_id uuid references public.treinos on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfis on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((evento_id is null) <> (treino_id is null))
);
create index if not exists conversas_evento_idx on public.conversas (evento_id, created_at);
create index if not exists conversas_treino_idx on public.conversas (treino_id, created_at);

alter table public.conversas enable row level security;

-- A equipa lê e escreve; cada um apaga as suas mensagens (os admins apagam qualquer uma).
drop policy if exists conversas_select on public.conversas;
create policy conversas_select on public.conversas for select to authenticated using (public.is_member());
drop policy if exists conversas_insert on public.conversas;
create policy conversas_insert on public.conversas for insert to authenticated with check (public.is_member() and autor_id = auth.uid());
drop policy if exists conversas_delete on public.conversas;
create policy conversas_delete on public.conversas for delete to authenticated using (autor_id = auth.uid() or public.is_admin());
