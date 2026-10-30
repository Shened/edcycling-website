-- Correções encontradas na revisão da base de dados (30/10/2026).
-- Correr uma vez no SQL Editor do Supabase.

-- 1) Os atletas só podem alterar algumas colunas do próprio perfil; faltava autorizar as bicicletas novas (023).
grant update (bicicleta_btt, bicicleta_cx) on public.perfis to authenticated;

-- 2) Aviso de segurança do Supabase: fixar o search_path desta função.
alter function public.limpar_nomes(text[]) set search_path = public;

-- 3) A função do trigger de novos utilizadores não precisa de ser chamada pela API.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 4) Índices para as ligações mais usadas (avisos do Supabase sobre desempenho).
create index if not exists conversas_autor_idx on public.conversas (autor_id);
create index if not exists inscricoes_user_idx on public.inscricoes (user_id);
create index if not exists treinos_criador_idx on public.treinos (criador_id);
create index if not exists posts_autor_idx on public.posts (autor_id);
create index if not exists posts_evento_idx on public.posts (evento_id);
