-- v3.290 (angewendet 10.10.2026 als Migration "v3290_freigabe_stellvertretung_admin")
-- Ein Firmen-Administrator darf stellvertretend freigeben.
-- Einzige Aenderung gegenueber der Fassung davor: die Berechtigungspruefung
-- (Aufnehmer ODER Admin). Die Mandantenpruefung mw_firma_ok() steht davor und bleibt:
-- ein Admin einer ANDEREN Firma scheitert dort mit "Massaufnahme nicht gefunden.".
-- freigegeben_von = die handelnde Person (der Admin) -> im Verlauf (audit_log.user_id,
-- measurement_versionen.freigegeben_von) als Stellvertreter erkennbar (weicht von created_by ab).
-- Rueckfall: dieselbe Funktion mit "if z.created_by is distinct from auth.uid() then" wieder einsetzen.
CREATE OR REPLACE FUNCTION public.measurement_freigeben(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare z public.measurements; neu text; v_company uuid; v_nr integer; v_standard uuid;
begin
  if not public.mw_firma_ok(p_id) then
    raise exception 'Massaufnahme nicht gefunden.' using errcode = '42501';
  end if;
  z := public.mw_zeile(p_id);
  if z.created_by is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Nur die Person, die die Massaufnahme aufgenommen hat, oder ein Administrator kann sie freigeben.' using errcode = '42501';
  end if;
  if z.workflow_status <> 'in_bearbeitung' then
    raise exception 'Diese Massaufnahme ist bereits freigegeben.' using errcode = '42501';
  end if;

  if z.ruester_id is null and z.monteur_id is null
     and exists (select 1 from public.profiles pr
                  where pr.id = z.created_by and pr.company_id = public.my_company_id()) then
    v_standard := z.created_by;
  end if;

  if v_standard is not null then neu := 'zu_ruesten';
  elsif z.ruester_id is not null then neu := 'zu_ruesten';
  elsif z.monteur_id is not null then neu := 'zu_montieren';
  else neu := 'freigegeben'; end if;

  perform set_config('app.workflow_ok','1',true);
  update public.measurements
     set workflow_status = neu,
         freigegeben_von = auth.uid(),
         freigegeben_am = now(),
         freigabe_verfallen = false,
         ruester_id = coalesce(v_standard, ruester_id),
         ruester_zugewiesen_von = case when v_standard is not null then auth.uid() else ruester_zugewiesen_von end,
         ruester_zugewiesen_am  = case when v_standard is not null then now() else ruester_zugewiesen_am end,
         monteur_id = coalesce(v_standard, monteur_id),
         monteur_zugewiesen_von = case when v_standard is not null then auth.uid() else monteur_zugewiesen_von end,
         monteur_zugewiesen_am  = case when v_standard is not null then now() else monteur_zugewiesen_am end
   where id = p_id;
  perform set_config('app.workflow_ok','0',true);

  select p.company_id into v_company from public.projects p where p.id = z.project_id;
  if v_company is not null then
    select coalesce(max(nummer),0)+1 into v_nr
      from public.measurement_versionen where measurement_id = p_id;
    insert into public.measurement_versionen
      (company_id, measurement_id, nummer, type, title, project_id, data, freigegeben_von)
    values (v_company, p_id, v_nr, z.type, z.title, z.project_id, z.data, auth.uid());
  end if;

  return public.mw_ergebnis(p_id);
end;
$function$;
