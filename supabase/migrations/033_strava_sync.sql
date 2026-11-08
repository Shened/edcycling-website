-- 033: sincronização automática do Strava. Guarda quando foi a última vez que as atividades de cada atleta
--      foram trazidas (para o botão "Atualizar" e a sincronização ao abrir o site não pedirem demasiado ao Strava).
alter table public.strava_contas add column if not exists sincronizado_em timestamptz;
create index if not exists strava_contas_athlete_idx on public.strava_contas (athlete_id);
