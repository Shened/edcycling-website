-- 030: desempenho da base de dados (sem mudar quem pode ver ou fazer o quê).
--  1) As regras de acesso passam a calcular o utilizador uma vez por consulta, em vez de uma vez por linha.
--  2) Índices nas chaves estrangeiras que ainda não tinham.

alter policy atividades_delete on public.atividades
  using ((user_id = (select auth.uid())) OR public.is_admin());
alter policy atividades_insert on public.atividades
  with check (public.is_member() AND (user_id = (select auth.uid())));
alter policy atividades_select on public.atividades
  using (public.is_member() AND ((NOT privada) OR (user_id = (select auth.uid()))));
alter policy atividades_update on public.atividades
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy conversas_delete on public.conversas
  using ((autor_id = (select auth.uid())) OR public.is_admin());
alter policy conversas_insert on public.conversas
  with check (public.is_member() AND (autor_id = (select auth.uid())));
alter policy insc_delete on public.inscricoes
  using ((user_id = (select auth.uid())) OR public.is_admin());
alter policy insc_insert on public.inscricoes
  with check (public.is_member() AND (user_id = (select auth.uid())));
alter policy insc_update on public.inscricoes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy perfis_select on public.perfis
  using ((id = (select auth.uid())) OR public.is_member());
alter policy perfis_update_own on public.perfis
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
alter policy pc_delete on public.post_comentarios
  using ((autor_id = (select auth.uid())) OR public.is_admin());
alter policy pc_insert on public.post_comentarios
  with check (public.is_member() AND (autor_id = (select auth.uid())));
alter policy pg_delete on public.post_gostos
  using (user_id = (select auth.uid()));
alter policy pg_insert on public.post_gostos
  with check (public.is_member() AND (user_id = (select auth.uid())));
alter policy posts_delete on public.posts
  using ((autor_id = (select auth.uid())) OR public.is_admin());
alter policy posts_insert on public.posts
  with check (public.is_member() AND (autor_id = (select auth.uid())));
alter policy pn_own on public.preferencias_notif
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy ps_own on public.push_subscricoes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy treinos_delete on public.treinos
  using ((criador_id = (select auth.uid())) OR public.is_admin());
alter policy treinos_insert on public.treinos
  with check (public.is_member() AND (criador_id = (select auth.uid())));
alter policy treinos_update on public.treinos
  using ((criador_id = (select auth.uid())) OR public.is_admin())
  with check ((criador_id = (select auth.uid())) OR public.is_admin());

create index if not exists eventos_equipamento_idx on public.eventos (equipamento_id);
create index if not exists noticias_autor_idx on public.noticias (autor_id);
create index if not exists post_comentarios_autor_idx on public.post_comentarios (autor_id);
create index if not exists post_gostos_user_idx on public.post_gostos (user_id);
create index if not exists tdf_goal_results_rider_idx on public.tdf_goal_results (rider_id);
create index if not exists tdf_goals_stage_idx on public.tdf_goals (stage_id);
create index if not exists tdf_participantes_rider_idx on public.tdf_participantes (rider_id);
create index if not exists tdf_stage_results_rider_idx on public.tdf_stage_results (rider_id);
