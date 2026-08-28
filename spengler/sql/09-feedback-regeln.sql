-- ============================================================
-- 09-feedback-regeln.sql
--
-- Die Tabelle feedback hat Zeilenschutz an, aber keine einzige Regel.
-- Dadurch kann niemand Feedback senden oder lesen – der Knopf in der
-- App läuft ins Leere. Diese Datei ergänzt die fehlenden vier Regeln.
--
-- Darf am Stück und mehrfach ausgeführt werden.
-- ============================================================

alter table public.feedback enable row level security;

drop policy if exists feedback_select_own_or_admin on public.feedback;
drop policy if exists feedback_insert_own          on public.feedback;
drop policy if exists feedback_update_admin        on public.feedback;
drop policy if exists feedback_delete_admin        on public.feedback;

-- Lesen: der Administrator sieht alles, jeder andere nur seine eigenen Meldungen
create policy feedback_select_own_or_admin on public.feedback
  for select to authenticated
  using (is_admin() or created_by = auth.uid());

-- Senden: jeder Angemeldete, aber nur auf den eigenen Namen
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (created_by = auth.uid());

-- Als erledigt markieren und löschen: nur der Administrator
create policy feedback_update_admin on public.feedback
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy feedback_delete_admin on public.feedback
  for delete to authenticated
  using (is_admin());


-- Kontrolle
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'feedback'
order by cmd;
