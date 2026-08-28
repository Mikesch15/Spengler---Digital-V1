-- ============================================================
-- 08-eigene-oder-alle.sql
--
-- Ergänzt die Unterscheidung "eigene / alle Einträge" und verankert
-- sie in den Regeln für reports, measurements und ausmass.
--
-- Voraussetzung: 07-rechte-je-mitarbeiter.sql, Teil 1 bis 3, ist gelaufen.
-- Diese Datei darf am Stück und mehrfach ausgeführt werden.
--
-- Zwei getrennte Spalten, weil sehen und bearbeiten unterschiedlich
-- weit reichen dürfen:
--   scope      -> wie viel darf er SEHEN        ('own' | 'all')
--   edit_scope -> wie viel darf er BEARBEITEN   ('own' | 'all')
-- Typischer Fall: scope='all', edit_scope='own' – sieht alles,
-- ändern darf er nur seine eigenen Einträge.
-- ============================================================


-- ---- Spalten ----
alter table public.permission_settings
  add column if not exists edit_scope text;
alter table public.permission_overrides
  add column if not exists edit_scope text;

update public.permission_settings set scope      = 'all' where scope      is null;
update public.permission_settings set edit_scope = 'all' where edit_scope is null;

do $$
begin
  begin
    alter table public.permission_settings
      add constraint permission_settings_edit_scope_check
      check (edit_scope in ('own','all'));
  exception when duplicate_object then null;
  end;
  begin
    alter table public.permission_overrides
      add constraint permission_overrides_edit_scope_check
      check (edit_scope in ('own','all'));
  exception when duplicate_object then null;
  end;
end $$;


-- ---- Funktionen ----
-- Wie viel darf der angemeldete Mitarbeiter sehen?
create or replace function public.permission_scope(p_resource text)
returns text language sql stable security definer set search_path to 'public'
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

-- Wie viel darf er bearbeiten?
create or replace function public.permission_edit_scope(p_resource text)
returns text language sql stable security definer set search_path to 'public'
as $function$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then 'all'
    else coalesce(
      (select po.edit_scope from public.permission_overrides po
        where po.profile_id = auth.uid() and po.resource = p_resource and po.edit_scope is not null limit 1),
      (select ps.edit_scope from public.permission_settings ps
         join public.profiles pr on pr.role = ps.role
        where pr.id = auth.uid() and ps.resource = p_resource limit 1),
      'all')
  end;
$function$;


-- ---- Regeln ersetzen (gleiche Namen, keine Doppelungen) ----
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
               and (public.permission_edit_scope(%1$L) = 'all' or created_by = auth.uid()))
        with check (has_permission(%1$L,'edit'))
    $f$, t);

    execute format('drop policy if exists %1$s_delete_permission on public.%1$I', t);
    execute format($f$
      create policy %1$s_delete_permission on public.%1$I
        for delete to authenticated
        using (has_permission(%1$L,'edit')
               and (public.permission_edit_scope(%1$L) = 'all' or created_by = auth.uid()))
    $f$, t);
  end loop;
end $$;


-- ---- Kontrolle: so sehen die neun Regeln jetzt aus ----
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('reports','measurements','ausmass')
order by tablename, cmd;
