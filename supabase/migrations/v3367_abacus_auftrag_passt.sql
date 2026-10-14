-- v3.367: Serverseitige Schutzprüfung - eine Abacus-Zeile mit Auftragsnummer darf nur in ein Projekt mit DERSELBEN Auftragsnummer.
-- Additiv: neue Funktion + neuer Trigger auf abacus_stunden. RLS/Policies unverändert (tenant_boundary_*/feature_boundary_* bleiben RESTRICTIVE).
-- Grund: Der Client prüft zwar, darf aber nie allein vertrauenswürdig sein (manipulierter Aufruf). Zeilen ohne Nummer bleiben erlaubt
-- (der Client verlangt dafür die ausdrückliche Projektbestätigung); hat das Projekt keine Nummer, ist nichts zu vergleichen.
create function public.enforce_abacus_auftrag_passt() returns trigger language plpgsql set search_path to 'public' as $$
declare v_nr text; v_row text;
begin
  select order_no into v_nr from public.projects where id = new.project_id;
  v_nr := upper(regexp_replace(regexp_replace(coalesce(v_nr,''), '^\s*(auftrag|projekt|proj\.?|auftr\.?)\s*(nr\.?|nummer)?\s*[:\-]?\s*', '', 'i'), '\s+', '', 'g'));
  v_row := upper(regexp_replace(coalesce(new.auftrag_nr,''), '\s+', '', 'g'));
  if v_row <> '' and v_nr <> '' and v_row <> v_nr then
    raise exception 'Auftragsnummer % gehoert nicht zu diesem Projekt (%).', v_row, v_nr;
  end if;
  return new;
end $$;
create trigger enforce_abacus_auftrag_trg before insert on public.abacus_stunden for each row execute function public.enforce_abacus_auftrag_passt();
