-- Mais bicicletas no perfil do atleta: além da de estrada, a de BTT e a de ciclocrosse/gravel.
-- Correr uma vez no SQL Editor do Supabase.
alter table public.perfis add column if not exists bicicleta_btt text check (bicicleta_btt is null or char_length(bicicleta_btt) <= 80);
alter table public.perfis add column if not exists bicicleta_cx text check (bicicleta_cx is null or char_length(bicicleta_cx) <= 80);
