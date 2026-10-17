-- v3.390 Ausmass, Regierapport und Leistungen werden pro Firma schaltbar (Ansage des Anwenders). Additiv: Registerzeilen aendern, fuenf neue RESTRICTIVE-Policies.
-- Zuordnung der Tabellen (aus Code und Fremdschluesseln abgeleitet): ausmass + ausmass_kandidaten -> 'ausmass'; reports -> 'regierapport';
-- leistungen + leistung_massaufnahmen -> 'leistungen'. Gemeinsam genutzte Tabellen (materials = Regiematerial, rates, blitzschutz_materials) und die Kern-Tabellen
-- (projects, measurements, ausfuehrungen ...) bleiben bewusst ohne Modulzaun.
-- Abhaengigkeit: Nachkalkulation liest die Rapportstunden (js/88: reports.work_entries) und braucht deshalb zusaetzlich 'regierapport'.
-- Rueckgaengig: drop policy modul_boundary_<tabelle> on public.<tabelle>; update public.module_registry set schaltbar=false ... (siehe unten).
update public.module_registry set schaltbar = true,
  beschreibung = 'Ausmass und Komplettausmass pro Projekt'
  where modul = 'ausmass';
update public.module_registry set schaltbar = true,
  beschreibung = 'Regierapporte mit Arbeitszeilen und Regiematerial, Rapport-Fotos und Unterschrift'
  where modul = 'regierapport';
update public.module_registry set schaltbar = true,
  beschreibung = 'Projektleistungen aus Offertpositionen und Ausfuehrungsstatus'
  where modul = 'leistungen';
update public.module_registry set abhaengig_von = '{angebote,regierapport}' where modul = 'nachkalkulation';

do $$
declare t text; m text;
begin
  for t, m in select * from (values
    ('ausmass','ausmass'),('ausmass_kandidaten','ausmass'),
    ('reports','regierapport'),
    ('leistungen','leistungen'),('leistung_massaufnahmen','leistungen')) v(t,m)
  loop
    execute format('create policy modul_boundary_%1$s on public.%1$s as restrictive for all using ((select public.modul_aktiv(%2$L))) with check ((select public.modul_aktiv(%2$L)))', t, m);
  end loop;
end $$;
