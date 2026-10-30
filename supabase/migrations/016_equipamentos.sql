-- Equipamentos da equipa (camisolas/kits) e equipamento definido para cada evento.
-- Correr uma vez no SQL Editor do Supabase.

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  descricao text check (descricao is null or char_length(descricao) <= 300),
  foto_path text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.equipamentos enable row level security;

drop policy if exists equipamentos_select on public.equipamentos;
create policy equipamentos_select on public.equipamentos for select to authenticated
  using (public.is_member());
drop policy if exists equipamentos_admin on public.equipamentos;
create policy equipamentos_admin on public.equipamentos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.eventos add column if not exists equipamento_id uuid references public.equipamentos on delete set null;

-- As fotos dos equipamentos ficam no bucket público "noticias", na pasta equipamentos/ (só admins enviam).
