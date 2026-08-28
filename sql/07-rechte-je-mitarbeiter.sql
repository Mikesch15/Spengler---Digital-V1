-- ============================================================
-- 07-rechte-je-mitarbeiter.sql
--
-- Baut auf der bestehenden Rechteverwaltung auf, statt sie zu ersetzen.
--
-- Heute:  Rechte hängen an der ROLLE (admin / employee) in
--         permission_settings. Alle Mitarbeiter mit derselben Rolle
--         haben dieselben Rechte.
-- Neu:    Zusätzlich Ausnahmen je Mitarbeiter (permission_overrides)
--         und die Unterscheidung eigene / alle Einträge (scope).
--
-- Die 38 bestehenden Regeln bleiben unverändert, bis auf neun, die
-- um die Bedingung "eigene / alle" ergänzt werden (Teil 4).
--
-- Teile 0 bis 3 sind gefahrlos und beliebig oft ausführbar.
-- Teil 4 verändert Zugriffsrechte – vorher Teil 0 anschauen.
-- ============================================================


-- ------------------------------------------------------------
-- TEIL 0: Kontrolle vorab – bitte Ergebnis anschauen
--
-- Steht bei permission_settings oder permission_overrides "false",
-- ist die Tabelle ungeschützt: Dann kann jeder mit dem öffentlichen
-- Schlüssel die Rechte selbst umschreiben. Das wäre der wichtigste
-- Fund und muss vor allem anderen geklärt werden.
-- ------------------------------------------------------------
select tablename, rowsecurity as rls_aktiv
from pg_tables
where schemaname = 'public'
order by tablename;


-- ------------------------------------------------------------
-- TEIL 1: Meine überflüssigen Reste von vorhin entfernen
-- ------------------------------------------------------------
drop trigger  if exists trg_rechte_nur_durch_admin on public.profiles;
drop function if exists public.rechte_nur_durch_admin();
drop function if exists public.recht_sehen(text);
drop function if exists public.recht_bearbeiten(text);
drop function if exists public.recht_einstellungen();
drop function if exists public.ist_admin();
alter table public.profiles drop column if exists rechte;


-- ------------------------------------------------------------
-- TEIL 2: Neue Tabelle für Ausnahmen je Mitarbeiter
--
-- Ein Eintrag hier sticht den Wert der Rolle. Felder dürfen leer
-- (null) bleiben – dann gilt weiterhin der Wert der Rolle.
-- ------------------------------------------------------------
create table if not exists public.permission_overrides (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  resource   text not null,
  can_view   boolean,
  can_edit   boolean,
  scope      text check (scope in ('own','all')),
  updated_at timestamptz not null default now(),
  primary key (profile_id, resource)
);

-- scope auch bei den Rollen-Vorgaben, Standard "alle sehen"
alter table public.permission_settings
  add column if not exists scope text
  check (scope in ('own','all'));

update public.permission_settings set scope = 'all' where scope is null;

-- Nur Administratoren dürfen Rechte vergeben.
alter table public.permission_overrides enable row level security;
drop policy if exists permission_overrides_select on public.permission_overrides;
drop policy if exists permission_overrides_admin  on public.permission_overrides;

create policy permission_overrides_select on public.permission_overrides
  for select to authenticated
  using (true);

create policy permission_overrides_admin on public.permission_overrides
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Die Rollen-Vorgaben dürfen alle Angemeldeten LESEN, damit die App in
-- den Einstellungen anzeigen kann, was ohne Ausnahme gelten würde.
-- Geschrieben wird dort weiterhin nur über das Supabase-Dashboard.
drop policy if exists permission_settings_select on public.permission_settings;
create policy permission_settings_select on public.permission_settings
  for select to authenticated
  using (true);


-- ------------------------------------------------------------
-- TEIL 3: has_permission erweitern, permission_scope ergänzen
--
-- Reihenfolge der Auswertung:
--   1. Administrator      -> darf alles
--   2. Ausnahme für diesen Mitarbeiter (permission_overrides)
--   3. Vorgabe der Rolle  (permission_settings)
--   4. sonst              -> nein
-- ------------------------------------------------------------
create or replace function public.has_permission(p_resource text, p_action text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then true
    when p_action not in ('view','edit') then false
    else coalesce(
      (select case when p_action = 'view' then po.can_view else po.can_edit end
         from public.permission_overrides po
        where po.profile_id = auth.uid()
          and po.resource = p_resource
          and (case when p_action = 'view' then po.can_view else po.can_edit end) is not null
        limit 1),
      (select case when p_action = 'view' then ps.can_view else ps.can_edit end
         from public.permission_settings ps
         join public.profiles pr on pr.role = ps.role
        where pr.id = auth.uid()
          and ps.resource = p_resource
        limit 1),
      false)
  end;
$function$;

create or replace function public.permission_scope(p_resource text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then 'all'
    else coalesce(
      (select po.scope from public.permission_overrides po
        where po.profile_id = auth.uid() and po.resource = p_resource and po.scope is not null limit 1),
      (select ps.scope from public.permission_settings ps
         join public.profiles pr on pr.role = ps.role
        where pr.id = auth.uid() and ps.resource = p_resource limit 1),
      'all')
  end;
$function$;


-- ============================================================
-- TEIL 4: "eigene / alle" in den Regeln verankern
-- ERST AUSFÜHREN, wenn Teil 0 geklärt ist.
--
-- Ersetzt neun bestehende Regeln durch gleichnamige mit einer
-- zusätzlichen Bedingung. Es entstehen keine doppelten Regeln.
-- Das Anlegen neuer Einträge bleibt unverändert.
-- ============================================================
/*
do $$
declare t text;
begin
  foreach t in array array['reports','measurements','ausmass']
  loop
    execute format('drop policy if exists %1$s_select_permission on public.%1$I', t);
    execute format($f$
      create policy %1$s_select_permission on public.%1$I
        for select to authenticated
        using (has_permission(%1$L,'view')
               and (public.permission_scope(%1$L) = 'all' or created_by = auth.uid()))
    $f$, t);

    execute format('drop policy if exists %1$s_update_permission on public.%1$I', t);
    execute format($f$
      create policy %1$s_update_permission on public.%1$I
        for update to authenticated
        using (has_permission(%1$L,'edit')
               and (public.permission_scope(%1$L) = 'all' or created_by = auth.uid()))
        with check (has_permission(%1$L,'edit'))
    $f$, t);

    execute format('drop policy if exists %1$s_delete_permission on public.%1$I', t);
    execute format($f$
      create policy %1$s_delete_permission on public.%1$I
        for delete to authenticated
        using (has_permission(%1$L,'edit')
               and (public.permission_scope(%1$L) = 'all' or created_by = auth.uid()))
    $f$, t);
  end loop;
end $$;
*/
