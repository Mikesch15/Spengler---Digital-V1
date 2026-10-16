-- v3.387 Firmen-Modulregister + Plattform-Aktivitaetsprotokoll (Systemadmin). Additiv; bestehende Tabellen/Policies unveraendert.
-- Geaendert werden NUR die Funktionen system_admin_set_status / system_admin_set_trial (je eine Protokollzeile zusaetzlich,
-- Logik und Rueckgabe unveraendert; das Loeschen einer Firma steht in v3387b_firma_loeschen_protokoll.sql und ist NICHT angewendet) und es kommen neue RESTRICTIVE-Policies "modul_boundary_*" auf die Tabellen der schaltbaren Module dazu.
-- Standard: Alle Module sind fuer alle Firmen aktiv (standard_aktiv = true), solange der Systemadmin nichts anderes setzt -> kein Verhalten aendert sich von selbst.
-- Rueckgaengig: drop policy modul_boundary_<tabelle> ...; drop table company_modules, module_registry, platform_audit_log; drop function modul_aktiv, system_admin_*_modul*, platform_log.

create table public.module_registry(
  modul text primary key check (modul ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null,
  beschreibung text not null default '',
  status text not null default 'verfuegbar' check (status in ('verfuegbar','in_entwicklung')),
  abhaengig_von text[] not null default '{}',
  standard_aktiv boolean not null default true
);
insert into public.module_registry(modul, name, beschreibung, status, abhaengig_von, standard_aktiv) values
 ('angebote','Offerten','Offertimport aus PDF/Foto, selbst erstellte Offerten, Offertpositionen','verfuegbar','{}',true),
 ('lager','Lieferanten-Lager','Lieferanten-Sortiment, Einkauf und Lagerbewegungen','verfuegbar','{}',true),
 ('nachkalkulation','Nachkalkulation (Abacus)','Stundenabgleich Abacus gegen die geltende Offerte','verfuegbar','{angebote}',true);
alter table public.module_registry enable row level security;
create policy module_registry_select on public.module_registry for select to authenticated using (true);
revoke all on public.module_registry from anon;
revoke insert, update, delete, truncate on public.module_registry from authenticated;

create table public.company_modules(
  company_id uuid not null references public.companies(id) on delete cascade,
  modul text not null references public.module_registry(modul),
  aktiv boolean not null,
  geaendert_von uuid,
  geaendert_am timestamptz not null default now(),
  primary key (company_id, modul)
);
alter table public.company_modules enable row level security;
create policy tenant_boundary_company_modules on public.company_modules as restrictive for all
  using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy company_modules_select_eigene on public.company_modules for select to authenticated using (company_id = public.my_company_id());
revoke all on public.company_modules from anon;
revoke insert, update, delete, truncate on public.company_modules from authenticated;   -- schreiben nur ueber system_admin_set_firma_modul

create table public.platform_audit_log(
  id bigint generated always as identity primary key,
  zeitpunkt timestamptz not null default now(),
  akteur uuid,
  aktion text not null,
  company_id uuid,          -- bewusst OHNE Fremdschluessel: der Eintrag bleibt auch nach dem Loeschen der Firma
  modul text,
  detail jsonb not null default '{}'::jsonb
);
create index platform_audit_zeit_idx on public.platform_audit_log(zeitpunkt desc);
alter table public.platform_audit_log enable row level security;
create policy platform_audit_select_sysadmin on public.platform_audit_log for select to authenticated using (public.is_system_admin());
revoke all on public.platform_audit_log from anon;
revoke insert, update, delete, truncate on public.platform_audit_log from authenticated;

create or replace function public.platform_log(p_aktion text, p_company uuid, p_modul text, p_detail jsonb) returns void
language sql security definer set search_path to 'public' as $$
  insert into public.platform_audit_log(akteur, aktion, company_id, modul, detail) values (auth.uid(), p_aktion, p_company, p_modul, coalesce(p_detail,'{}'::jsonb));
$$;
revoke all on function public.platform_log(text,uuid,text,jsonb) from public, anon, authenticated;

-- Ist das Modul fuer die Firma des angemeldeten Benutzers freigeschaltet? (eigene Freigabe UND alle Abhaengigkeiten)
create or replace function public.modul_aktiv(p_modul text) returns boolean
language sql stable security definer set search_path to '' as $$
  select coalesce((
    select coalesce(cm.aktiv, r.standard_aktiv)
       and not exists (
         select 1 from unnest(r.abhaengig_von) d(x)
         join public.module_registry r2 on r2.modul = d.x
         left join public.company_modules cm2 on cm2.company_id = public.my_company_id() and cm2.modul = r2.modul
         where not coalesce(cm2.aktiv, r2.standard_aktiv))
    from public.module_registry r
    left join public.company_modules cm on cm.company_id = public.my_company_id() and cm.modul = r.modul
    where r.modul = p_modul), false);
$$;
revoke all on function public.modul_aktiv(text) from public, anon;
grant execute on function public.modul_aktiv(text) to authenticated;

-- Systemadmin: Uebersicht aller Firmen x Module
create or replace function public.system_admin_firmen_module() returns table(company_id uuid, modul text, aktiv boolean, ausdruecklich boolean, geaendert_am timestamptz, geaendert_von uuid)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  return query select c.id, r.modul, coalesce(cm.aktiv, r.standard_aktiv), cm.modul is not null, cm.geaendert_am, cm.geaendert_von
    from public.companies c cross join public.module_registry r
    left join public.company_modules cm on cm.company_id = c.id and cm.modul = r.modul;
end $$;
revoke all on function public.system_admin_firmen_module() from public, anon;
grant execute on function public.system_admin_firmen_module() to authenticated;

-- Systemadmin: Modul fuer eine Firma ein-/ausschalten (mit Abhaengigkeitspruefung und Protokoll). Daten bleiben beim Ausschalten erhalten.
create or replace function public.system_admin_set_firma_modul(p_company uuid, p_modul text, p_aktiv boolean) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare r public.module_registry; v_alt boolean; d text; x record;
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  if p_aktiv is null then raise exception 'Ungültige Angabe.'; end if;
  if not exists (select 1 from public.companies where id = p_company) then raise exception 'Firma nicht gefunden.'; end if;
  select * into r from public.module_registry where modul = p_modul;
  if r.modul is null then raise exception 'Unbekanntes Modul.'; end if;
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
revoke all on function public.system_admin_set_firma_modul(uuid,text,boolean) from public, anon;
grant execute on function public.system_admin_set_firma_modul(uuid,text,boolean) to authenticated;

-- Serverseitige Sperre: Tabellen der schaltbaren Module sind fuer Firmen ohne Freigabe nicht lesbar/schreibbar (zusaetzlich zu tenant_boundary und feature_boundary; RESTRICTIVE)
do $$
declare t text; m text;
begin
  for t, m in select * from (values
    ('angebote','angebote'),('offerten','angebote'),
    ('lager_varianten','lager'),('lagerbestand_bewegungen','lager'),('lieferanten_artikel','lager'),('lieferanten_bewegungen','lager'),('lieferanten_einkauf','lager'),
    ('abacus_abgleich','nachkalkulation'),('abacus_importe','nachkalkulation'),('abacus_stunden','nachkalkulation')) v(t,m)
  loop
    execute format('create policy modul_boundary_%1$s on public.%1$s as restrictive for all using ((select public.modul_aktiv(%2$L))) with check ((select public.modul_aktiv(%2$L)))', t, m);
  end loop;
end $$;

-- Protokollzeile in den vorhandenen Systemadmin-Funktionen (Logik sonst unveraendert)
create or replace function public.system_admin_set_status(p_company_id uuid, p_status text) returns public.companies
language plpgsql security definer set search_path to 'public' as $$
declare result public.companies; v_alt text;
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  select subscription_status into v_alt from public.companies where id = p_company_id;
  update public.companies set subscription_status = p_status, updated_at = now() where id = p_company_id returning * into result;
  if result.id is null then raise exception 'Firma nicht gefunden.'; end if;
  perform public.platform_log('firma_status', p_company_id, null, jsonb_build_object('alt', v_alt, 'neu', p_status));
  return result;
end; $$;
create or replace function public.system_admin_set_trial(p_company_id uuid, p_trial_days integer, p_trial_started_at timestamptz, p_trial_ends_at timestamptz) returns public.companies
language plpgsql security definer set search_path to 'public' as $$
declare result public.companies;
begin
  if not public.is_system_admin() then raise exception 'Nur für System-Administratoren.' using errcode = '42501'; end if;
  update public.companies set trial_days = p_trial_days, trial_started_at = p_trial_started_at, trial_ends_at = p_trial_ends_at, updated_at = now() where id = p_company_id returning * into result;
  if result.id is null then raise exception 'Firma nicht gefunden.'; end if;
  perform public.platform_log('firma_testphase', p_company_id, null, jsonb_build_object('tage', p_trial_days, 'ende', p_trial_ends_at));
  return result;
end; $$;

