-- v3.387b (NICHT angewendet - die Umgebung hat das Ueberschreiben der Loesch-Funktion auch am 19.10.2026 trotz Freigabe des Betreibers abgebrochen; manuell im SQL-Editor ausfuehren): eine Protokollzeile in system_admin_delete_company_data.
-- Nur die Zeile 'perform public.platform_log(firma_loeschen ...)' ist neu; alles andere ist der unveraenderte Stand der Funktion (geprueft am 16.10.2026).
-- Anwenden nur nach ausdruecklicher Freigabe durch den Betreiber.

-- Firma loeschen: eine Protokollzeile VOR dem Loeschen (der Eintrag bleibt bestehen, platform_audit_log.company_id hat keinen Fremdschluessel)
create or replace function public.system_admin_delete_company_data(p_company_id uuid) returns table(deleted_profiles integer, deleted_projects integer)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_profile_count integer;
  v_project_count integer;
begin
  if not public.is_system_admin() then
    raise exception 'Nur für System-Administratoren.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Firma nicht gefunden.';
  end if;

  select count(*) into v_profile_count from public.profiles where company_id = p_company_id;
  select count(*) into v_project_count from public.projects where company_id = p_company_id;

  if exists (
    select 1 from public.profiles p
    join public.system_admins sa on sa.user_id = p.id
    where p.company_id = p_company_id
  ) then
    raise exception 'Abbruch: Ein Mitglied dieser Firma ist als System-Administrator eingetragen. Es wurde nichts gelöscht.';
  end if;

  perform public.platform_log('firma_loeschen', p_company_id, null,
    jsonb_build_object('name', (select name from public.companies where id = p_company_id), 'benutzer', v_profile_count, 'projekte', v_project_count));

  delete from public.ausmass where project_id in (select id from public.projects where company_id = p_company_id);
  delete from public.measurements where project_id in (select id from public.projects where company_id = p_company_id);
  delete from public.reports where project_id in (select id from public.projects where company_id = p_company_id);
  delete from public.feedback where company_id = p_company_id;
  delete from public.permission_overrides where company_id = p_company_id;
  delete from public.rinne_fitting_types where company_id = p_company_id;
  delete from public.measurement_materials where company_id = p_company_id;
  delete from public.blitzschutz_materials where company_id = p_company_id;
  delete from public.materials where company_id = p_company_id;
  delete from public.rates where company_id = p_company_id;
  delete from public.einlaufblech_settings where company_id = p_company_id;
  delete from public.app_settings where company_id = p_company_id;
  delete from public.projects where company_id = p_company_id;
  delete from public.profiles where company_id = p_company_id;
  delete from public.companies where id = p_company_id;

  return query select v_profile_count, v_project_count;
end;
$$;
