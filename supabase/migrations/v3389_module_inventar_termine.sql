-- v3.389 Modulregister: vollstaendiges Inventar + Modul "termine" schaltbar. Additiv (Spalte + Zeilen + Policies); bestehende Policies unveraendert.
-- Inventar (aus Code und Tabellen abgeleitet): schaltbar = einzeln freischaltbar UND serverseitig per RESTRICTIVE-Policy abgesichert.
-- Kernmodule (projekte, massaufnahme, ausmass, regierapport, leistungen) sind registriert, aber NICHT einzeln schaltbar: ihre Tabellen und Oberflaechenwege
-- sind so verflochten, dass ein Schalter Teile des Ablaufs still abschalten wuerde. modul_aktiv() liefert fuer sie immer true; der Schalter-RPC lehnt sie ab.
-- Rueckgaengig: drop policy modul_boundary_<tabelle> on ...; delete from module_registry where modul in (...); alter table module_registry drop column schaltbar;
alter table public.module_registry add column schaltbar boolean not null default true;
insert into public.module_registry(modul, name, beschreibung, status, abhaengig_von, standard_aktiv, schaltbar) values
 ('termine','Termine und Kalender','Terminplanung, Kalender-Import (.ics), Outlook-/Google-Abgleich, Kalender-Abo','verfuegbar','{}',true,true),
 ('projekte','Projekte und Cockpit','Projekte, Projektseite, Dateien und Fotos (Kernmodul)','verfuegbar','{}',true,false),
 ('massaufnahme','Massaufnahme, Zuschnitt, Werkstatt','Massaufnahmen aller Arten, Material und Zuschnitt, Ruesten und Montage (Kernmodul)','verfuegbar','{}',true,false),
 ('ausmass','Ausmass','Ausmass und Komplettausmass (noch nicht einzeln schaltbar)','verfuegbar','{}',true,false),
 ('regierapport','Regierapport und Regieofferte','Regierapporte, Regiematerial, Stunden (noch nicht einzeln schaltbar)','verfuegbar','{}',true,false),
 ('leistungen','Leistungen','Projektleistungen und Ausfuehrungsstatus (noch nicht einzeln schaltbar)','verfuegbar','{}',true,false);
update public.module_registry set schaltbar = true where modul in ('angebote','lager','nachkalkulation');

create or replace function public.modul_aktiv(p_modul text) returns boolean
language sql stable security definer set search_path to '' as $$
  select coalesce((
    select (not r.schaltbar) or (
       coalesce(cm.aktiv, r.standard_aktiv)
       and not exists (
         select 1 from unnest(r.abhaengig_von) d(x)
         join public.module_registry r2 on r2.modul = d.x
         left join public.company_modules cm2 on cm2.company_id = public.my_company_id() and cm2.modul = r2.modul
         where r2.schaltbar and not coalesce(cm2.aktiv, r2.standard_aktiv)))
    from public.module_registry r
    left join public.company_modules cm on cm.company_id = public.my_company_id() and cm.modul = r.modul
    where r.modul = p_modul), false);
$$;

-- eigene Firma: welche Module sind frei (fuer die Oberflaeche; die Datenbank sperrt unabhaengig davon)
create or replace function public.meine_module() returns table(modul text, aktiv boolean)
language sql stable security invoker set search_path to 'public' as $$
  select r.modul, public.modul_aktiv(r.modul) from public.module_registry r;
$$;
revoke all on function public.meine_module() from public, anon;
grant execute on function public.meine_module() to authenticated;

create or replace function public.system_admin_module_uebersicht() returns table(company_id uuid, modul text, name text, beschreibung text, schaltbar boolean, aktiv boolean, ausdruecklich boolean, geaendert_am timestamptz, geaendert_von uuid)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  return query select c.id, r.modul, r.name, r.beschreibung, r.schaltbar, (not r.schaltbar) or coalesce(cm.aktiv, r.standard_aktiv), cm.modul is not null, cm.geaendert_am, cm.geaendert_von
    from public.companies c cross join public.module_registry r
    left join public.company_modules cm on cm.company_id = c.id and cm.modul = r.modul
    order by c.name, r.schaltbar desc, r.name;
end $$;
revoke all on function public.system_admin_module_uebersicht() from public, anon;
grant execute on function public.system_admin_module_uebersicht() to authenticated;
-- (system_admin_firmen_module aus v3.387 bleibt unveraendert bestehen, wird von der App nicht mehr benutzt)

create or replace function public.system_admin_set_firma_modul(p_company uuid, p_modul text, p_aktiv boolean) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare r public.module_registry; v_alt boolean; d text; x record;
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  if p_aktiv is null then raise exception 'Ungültige Angabe.'; end if;
  if not exists (select 1 from public.companies where id = p_company) then raise exception 'Firma nicht gefunden.'; end if;
  select * into r from public.module_registry where modul = p_modul;
  if r.modul is null then raise exception 'Unbekanntes Modul.'; end if;
  if not r.schaltbar then raise exception 'Dieses Modul ist ein Kernmodul und lässt sich nicht einzeln schalten.'; end if;
  select coalesce((select aktiv from public.company_modules where company_id = p_company and modul = p_modul), r.standard_aktiv) into v_alt;
  if p_aktiv then
    foreach d in array r.abhaengig_von loop
      if not coalesce((select aktiv from public.company_modules where company_id = p_company and modul = d), (select standard_aktiv from public.module_registry where modul = d)) then
        raise exception 'Das Modul braucht zuerst „%“.', (select name from public.module_registry where modul = d);
      end if;
    end loop;
  else
    for x in select r2.modul, r2.name from public.module_registry r2 where p_modul = any(r2.abhaengig_von) loop
      if coalesce((select aktiv from public.company_modules where company_id = p_company and modul = x.modul), (select standard_aktiv from public.module_registry where modul = x.modul)) then
        raise exception 'Zuerst „%“ ausschalten – es hängt von diesem Modul ab.', x.name;
      end if;
    end loop;
  end if;
  insert into public.company_modules(company_id, modul, aktiv, geaendert_von, geaendert_am) values (p_company, p_modul, p_aktiv, auth.uid(), now())
    on conflict (company_id, modul) do update set aktiv = excluded.aktiv, geaendert_von = excluded.geaendert_von, geaendert_am = excluded.geaendert_am;
  perform public.platform_log('modul_freigabe', p_company, p_modul, jsonb_build_object('alt', v_alt, 'neu', p_aktiv));
  return p_aktiv;
end $$;

-- Modul "termine": serverseitige Sperre der vier Tabellen (RESTRICTIVE)
do $$
declare t text;
begin
  foreach t in array array['termine','outlook_verbindungen','outlook_termin_map','kalender_abos'] loop
    execute format('create policy modul_boundary_%1$s on public.%1$s as restrictive for all using ((select public.modul_aktiv(%2$L))) with check ((select public.modul_aktiv(%2$L)))', t, 'termine');
  end loop;
end $$;
