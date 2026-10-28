-- Feed de publicações: texto e/ou várias fotos (carrossel), evento opcional.
-- Correr uma vez no SQL Editor, depois da 008.

alter table public.posts add column if not exists fotos text[] not null default '{}';
-- As publicações antigas (uma foto) passam para a lista de fotos.
update public.posts set fotos = array[foto_path] where foto_path is not null and cardinality(fotos) = 0;
alter table public.posts alter column foto_path drop not null;

-- Cada publicação tem de ter texto ou pelo menos uma foto; no máximo 10 fotos.
alter table public.posts drop constraint if exists posts_conteudo_check;
alter table public.posts add constraint posts_conteudo_check
  check (coalesce(btrim(legenda), '') <> '' or cardinality(fotos) > 0);
alter table public.posts drop constraint if exists posts_max_fotos;
alter table public.posts add constraint posts_max_fotos check (cardinality(fotos) <= 10);
