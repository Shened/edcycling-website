-- Tema festivo opcional nos eventos (Halloween, Natal, Páscoa…). Correr uma vez no SQL Editor.
alter table public.eventos add column if not exists tema text;
alter table public.eventos drop constraint if exists eventos_tema_check;
alter table public.eventos add constraint eventos_tema_check
  check (tema is null or tema in ('halloween','natal','ano-novo','pascoa','carnaval','sao-joao'));
