-- Aviso aos admins quando um convidado aceita o convite e entra na equipa.
-- Correr uma vez no SQL Editor (os avisos já funcionam sem isto; serve para guardar a preferência).
alter table public.preferencias_notif
  add column if not exists membros_push boolean not null default true,
  add column if not exists membros_email boolean not null default true;
