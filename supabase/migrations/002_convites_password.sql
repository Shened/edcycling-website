-- Login com password + convites (correr uma vez no SQL Editor se já correste o schema.sql antes).
alter table public.perfis add column if not exists ativo boolean not null default false;

-- Quem já existe (os admins atuais) fica marcado como ativo.
update public.perfis set ativo = true;

-- Cada pessoa pode mudar o próprio nome e marcar a conta como ativa (ao definir a password).
grant update (nome, ativo) on public.perfis to authenticated;
