-- Ligar os atletas do Tour de Freixo às contas dos atletas da equipa (quando são a mesma pessoa).
-- Correr uma vez no SQL Editor do Supabase, depois da 019.

alter table public.tdf_riders add column if not exists perfil_id uuid references public.perfis(id) on delete set null;
create unique index if not exists tdf_riders_perfil on public.tdf_riders (perfil_id) where perfil_id is not null;

-- Liga já os que têm exatamente o mesmo nome no Tour e no site (o resto liga-se na Gestão).
update public.tdf_riders r
set perfil_id = p.id
from public.perfis p
where r.perfil_id is null
  and p.role in ('membro', 'admin')
  and lower(trim(r.name)) = lower(trim(p.nome))
  and (select count(*) from public.perfis q where lower(trim(q.nome)) = lower(trim(p.nome))) = 1
  and (select count(*) from public.tdf_riders x where lower(trim(x.name)) = lower(trim(r.name))) = 1;
