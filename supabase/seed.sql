-- Passeios 2027 votados na sondagem do grupo (correr depois do schema.sql).
insert into public.eventos (titulo, tipo, estado, mes, ano, votos) values
  ('Águeda',            'passeio', 'proposta', 1, 2027, 1),
  ('Ponte de Lima',     'passeio', 'proposta', 3, 2027, 2),
  ('Fátima',            'passeio', 'proposta', 5, 2027, 2),
  ('Nariz do Mundo',    'passeio', 'proposta', 6, 2027, 2),
  ('Serra da Estrela',  'passeio', 'proposta', 7, 2027, 2),
  ('Senhora da Graça',  'passeio', 'proposta', 8, 2027, 2);

-- Depois do teu primeiro login, torna-te admin (troca pelo teu email):
-- update public.perfis set role = 'admin' where email = 'o-teu-email@exemplo.com';
