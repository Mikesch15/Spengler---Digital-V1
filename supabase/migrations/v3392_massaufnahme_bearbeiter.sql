-- v3.392 Massaufnahmen zur Bearbeitung an andere Mitarbeiter freigeben. Additiv: eine Spalte, zwei neue PERMISSIVE-Policies, ein Schutz-Trigger.
-- Bisher: Wer nur "eigene" bearbeiten darf (permission_edit_scope = 'own'), kommt nur an Massaufnahmen, die er selbst angelegt hat. Neu kann die Person, die eine
-- Massaufnahme angelegt hat (oder ein Admin bzw. wer alle bearbeiten darf), sie einzelnen Kolleginnen und Kollegen zur Bearbeitung freigeben (measurements.bearbeiter).
-- Die Freigabe ersetzt KEIN Recht: wer das Recht "Massaufnahmen bearbeiten/ansehen" gar nicht hat, bekommt dadurch keines (has_permission wird weiter verlangt).
-- Loeschen bleibt bei der ersten Person / Admin / "alle bearbeiten". tenant_boundary_measurements (RESTRICTIVE) und alle bestehenden Policies bleiben unveraendert.
-- Dies ist NICHT die Arbeitsfreigabe fuer Ruesten/Montage (Workflow, measurement_freigeben) - die bleibt davon unberuehrt.
-- Rueckgaengig: drop trigger measurements_bearbeiter_schutz ...; drop policy measurements_select_geteilt/measurements_update_geteilt ...; alter table measurements drop column bearbeiter;
alter table public.measurements add column bearbeiter uuid[] not null default '{}';

create policy measurements_select_geteilt on public.measurements for select
  using (public.has_permission('measurements','view') and (select auth.uid()) = any(bearbeiter));
create policy measurements_update_geteilt on public.measurements for update
  using (public.has_permission('measurements','edit') and (select auth.uid()) = any(bearbeiter))
  with check (public.has_permission('measurements','edit'));

-- Wer die Freigabe aendern darf, und dass nur Mitglieder derselben Firma darin stehen (auch fuer den Service-Schluessel, der auth.uid() = null hat, gilt die Firmenpruefung)
create or replace function public.schuetze_measurement_bearbeiter() returns trigger
language plpgsql set search_path to 'public' as $$
declare v_firma uuid; v_ok int; v_ids uuid[];
begin
  if tg_op = 'UPDATE' and new.bearbeiter is not distinct from old.bearbeiter then return new; end if;
  if tg_op = 'INSERT' and coalesce(cardinality(new.bearbeiter),0) = 0 then return new; end if;
  if auth.uid() is not null
     and not (public.permission_edit_scope('measurements') = 'all'
              or coalesce(new.created_by, auth.uid()) = auth.uid()) then
    raise exception 'Nur wer die Massaufnahme angelegt hat (oder ein Administrator) darf sie zur Bearbeitung freigeben.' using errcode = '42501';
  end if;
  select array(select distinct x from unnest(coalesce(new.bearbeiter,'{}')) x) into v_ids;
  if cardinality(v_ids) > 25 then raise exception 'Höchstens 25 Personen.'; end if;
  new.bearbeiter := v_ids;
  if cardinality(v_ids) > 0 then
    select company_id into v_firma from public.projects where id = new.project_id;
    select count(*) into v_ok from public.profiles pr where pr.id = any(v_ids) and pr.company_id = v_firma;
    if v_firma is null or v_ok <> cardinality(v_ids) then
      raise exception 'Freigegeben werden kann nur an Mitarbeitende derselben Firma.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger measurements_bearbeiter_schutz before insert or update on public.measurements
  for each row execute function public.schuetze_measurement_bearbeiter();
