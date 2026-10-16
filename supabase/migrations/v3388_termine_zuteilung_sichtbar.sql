-- v3.388 Termine: Zuteilung bestimmt die Sichtbarkeit. Additiv: eine neue RESTRICTIVE-Policy auf termine; bestehende Policies unveraendert.
-- Regel: leere Zuteilung (mitarbeiter = '{}') = fuer alle sichtbar wie bisher. Mit Zuteilung sehen/aendern den Termin nur die zugeteilten Personen,
-- die erstellende Person und Firmen-Admins (damit ein Termin nie unerreichbar wird). tenant_boundary_termine bleibt bestehen (Firmengrenze).
-- Die Edge Functions (Outlook/Google/Abo) schreiben mit dem Service-Schluessel und sind davon nicht betroffen; ihre Termine tragen mitarbeiter = [Person].
-- WITH CHECK (true): Schreibrechte regeln weiter die bestehenden permissiven Policies (projects/edit), diese Policy beschraenkt nur, WELCHE Zeilen erreichbar sind.
-- Rueckgaengig: drop policy termine_zuteilung_sichtbar on public.termine;
create policy termine_zuteilung_sichtbar on public.termine as restrictive for all
  using (
    coalesce(cardinality(mitarbeiter), 0) = 0
    or (select auth.uid()) = any(mitarbeiter)
    or created_by = (select auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = (select auth.uid()) and pr.role = 'admin')
  )
  with check (true);
