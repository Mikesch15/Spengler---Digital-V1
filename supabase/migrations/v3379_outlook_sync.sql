-- v3.379 Outlook-Synchronisation (pro Mitarbeiter, Microsoft Graph). Additiv; bestehende Tabellen/Policies unveraendert,
-- ausser: termine (Kennzeichen 'outlook' bei quelle, neue Spalte projekt_pruefen) und die Trigger-Funktion enforce_termine_firma
-- (siehe unten, bewusst eng gefasst).
-- Rueckgaengig: drop table outlook_termin_map, outlook_verbindungen, outlook_oauth_state; drop function outlook_*; alter table termine drop column projekt_pruefen.

-- 1. termine: Quelle 'outlook' zulassen, Pruef-Kennzeichen fuer unsichere Projektzuordnung
alter table public.termine drop constraint termine_quelle_check;
alter table public.termine add constraint termine_quelle_check check (quelle in ('app','ics','outlook'));
alter table public.termine add column projekt_pruefen boolean not null default false;

-- 2. Trigger: Die Edge Function schreibt mit dem Service-Schluessel (auth.uid() ist dann NULL, my_company_id() ebenfalls). Nur in diesem Fall
--    wird die mitgegebene company_id uebernommen - das Projekt muss weiterhin zur selben Firma gehoeren. Fuer jeden eingeloggten
--    Benutzer gilt unveraendert: company_id kommt vom Server (my_company_id()). anon kann nicht schreiben (kein Insert-Recht per RLS;
--    zusaetzlich verlangt tenant_boundary_termine company_id = my_company_id()).
create or replace function public.enforce_termine_firma() returns trigger language plpgsql set search_path to 'public' as $$
declare v_firma uuid;
begin
  if auth.uid() is null and new.company_id is not null then
    null; -- Service-Rolle: company_id wurde von der Edge Function nach eigener Pruefung gesetzt
  else
    new.company_id := public.my_company_id();
  end if;
  if new.company_id is null then raise exception 'Keine aktive Firma.'; end if;
  if new.project_id is not null then
    select company_id into v_firma from public.projects where id = new.project_id;
    if v_firma is null or v_firma <> new.company_id then raise exception 'Projekt gehoert nicht zur eigenen Firma.'; end if;
  end if;
  return new;
end $$;

-- 3. Verbindung je Mitarbeiter (KEINE Tokens hier - die liegen im Vault)
create table public.outlook_verbindungen(
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ms_konto text,
  kalender_id text,
  import_modus text not null default 'alle' check (import_modus in ('alle','markierte')),
  status text not null default 'verbunden' check (status in ('verbunden','fehler','getrennt')),
  letzter_lauf timestamptz,
  letzter_erfolg timestamptz,
  letzte_meldung text check (letzte_meldung is null or char_length(letzte_meldung) <= 300),
  anz_neu int not null default 0,
  anz_geaendert int not null default 0,
  anz_uebersprungen int not null default 0,
  anz_konflikte int not null default 0,
  erstellt_am timestamptz not null default now(),
  constraint outlook_verbindung_profil_uk unique (profile_id)
);
-- 4. Zuordnung Termin <-> Outlook-Ereignis (Idempotenz, Schleifen- und Konflikterkennung)
create table public.outlook_termin_map(
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  verbindung_id bigint not null references public.outlook_verbindungen(id) on delete cascade,
  termin_id bigint references public.termine(id) on delete set null,
  event_id text not null,
  herkunft text not null check (herkunft in ('app','outlook')),
  etag text,
  app_hash text,
  konflikt boolean not null default false,
  ignoriert boolean not null default false,
  letzter_abgleich timestamptz not null default now(),
  constraint outlook_map_event_uk unique (verbindung_id, event_id)
);
create unique index outlook_map_termin_uk on public.outlook_termin_map(verbindung_id, termin_id) where termin_id is not null;
create index outlook_map_verbindung_idx on public.outlook_termin_map(verbindung_id);
-- 5. Einmal-Kennungen fuer den Microsoft-Anmeldevorgang (CSRF-Schutz, 10 Minuten gueltig)
create table public.outlook_oauth_state(
  nonce text primary key,
  company_id uuid not null,
  profile_id uuid not null,
  rueck text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.outlook_verbindungen enable row level security;
alter table public.outlook_termin_map enable row level security;
alter table public.outlook_oauth_state enable row level security;   -- bewusst OHNE Policy: nur die Edge Function (service_role)
create policy tenant_boundary_outlook_verbindungen on public.outlook_verbindungen as restrictive for all
  using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy tenant_boundary_outlook_termin_map on public.outlook_termin_map as restrictive for all
  using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
-- Lesen: nur die eigene Verbindung bzw. deren Zuordnungen. Schreiben: nur ueber die Edge Function (keine Insert/Update/Delete-Policy).
create policy outlook_verbindungen_select_eigene on public.outlook_verbindungen for select using (profile_id = (select auth.uid()));
create policy outlook_map_select_eigene on public.outlook_termin_map for select
  using (exists (select 1 from public.outlook_verbindungen v where v.id = verbindung_id and v.profile_id = (select auth.uid())));
revoke all on public.outlook_oauth_state from anon, authenticated;
revoke insert, update, delete, truncate on public.outlook_verbindungen from anon, authenticated;
revoke insert, update, delete, truncate on public.outlook_termin_map from anon, authenticated;
revoke all on public.outlook_verbindungen, public.outlook_termin_map from anon;

-- 6. Tokens im Supabase Vault (verschluesselt gespeichert, Schluessel nicht per SQL lesbar). Nur service_role darf diese Funktionen aufrufen.
create or replace function public.outlook_token_speichern(p_profil uuid, p_token text) returns void
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_name text := 'outlook_refresh_' || p_profil::text;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then perform vault.create_secret(p_token, v_name, 'Outlook Refresh-Token');
  else perform vault.update_secret(v_id, p_token, v_name, 'Outlook Refresh-Token'); end if;
end $$;
create or replace function public.outlook_token_holen(p_profil uuid) returns text
language sql security definer set search_path to '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'outlook_refresh_' || p_profil::text;
$$;
create or replace function public.outlook_token_loeschen(p_profil uuid) returns void
language sql security definer set search_path to '' as $$
  delete from vault.secrets where name = 'outlook_refresh_' || p_profil::text;
$$;
create or replace function public.outlook_cron_pruefen(p_geheimnis text) returns boolean
language sql security definer set search_path to '' as $$
  select coalesce(p_geheimnis is not null and p_geheimnis <> '' and exists (select 1 from vault.decrypted_secrets where name = 'outlook_cron_secret' and decrypted_secret = p_geheimnis), false);
$$;
revoke all on function public.outlook_token_speichern(uuid,text), public.outlook_token_holen(uuid), public.outlook_token_loeschen(uuid), public.outlook_cron_pruefen(text) from public, anon, authenticated;
grant execute on function public.outlook_token_speichern(uuid,text), public.outlook_token_holen(uuid), public.outlook_token_loeschen(uuid), public.outlook_cron_pruefen(text) to service_role;

-- 7. Geheimnis fuer den Cron-Aufruf (zufaellig, wird nirgends angezeigt)
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'outlook_cron_secret', 'Geheimnis fuer den geplanten Aufruf von outlook-sync')
 where not exists (select 1 from vault.secrets where name = 'outlook_cron_secret');

-- 8. Geplanter Aufruf (separat per SQL angelegt, hier zur Dokumentation; Job-Name outlook-sync-5min). Entfernen: select cron.unschedule('outlook-sync-5min');
-- select cron.schedule('outlook-sync-5min','*/5 * * * *', $job$select net.http_post(url := 'https://nfgryuzkpwjfmdlmevuy.supabase.co/functions/v1/outlook-sync',
--   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='outlook_cron_secret')),
--   body := '{"modus":"cron"}'::jsonb, timeout_milliseconds := 120000)$job$);
