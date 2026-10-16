-- v3.385 Kalender-Abo: ein veroeffentlichter Kalender-Link (ICS) wird regelmaessig gelesen (nur lesen, nie zurueckschreiben).
-- Additiv: neue Tabelle kalender_abos, neue Spalte termine.abo_id, Quelle 'abo' erlaubt. Keine bestehende Policy wird ersetzt.
-- Der Link ist wie ein Passwort: er liegt NUR im Supabase Vault (Funktionen nur fuer service_role), nie in einer lesbaren Tabelle.
-- Rueckgaengig: drop table kalender_abos cascade (loescht die importierten Termine); drop function kalender_abo_url_*; alter table termine drop column abo_id.

create table public.kalender_abos(
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Arbeitskalender' check (char_length(btrim(name)) between 1 and 60),
  host text,
  status text not null default 'verbunden' check (status in ('verbunden','fehler')),
  letzter_lauf timestamptz,
  letzter_erfolg timestamptz,
  letzte_meldung text check (letzte_meldung is null or char_length(letzte_meldung) <= 300),
  anz_gefunden int not null default 0,
  anz_neu int not null default 0,
  anz_geaendert int not null default 0,
  anz_entfernt int not null default 0,
  erstellt_am timestamptz not null default now(),
  constraint kalender_abo_profil_uk unique (profile_id)
);
alter table public.kalender_abos enable row level security;
create policy tenant_boundary_kalender_abos on public.kalender_abos as restrictive for all
  using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
-- Lesen: nur die eigene Verbindung. Schreiben: nur die Edge Function (Service-Rolle), keine Schreib-Policy fuer Benutzer.
create policy kalender_abos_select_eigene on public.kalender_abos for select using (profile_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.kalender_abos from anon, authenticated;

-- termine: Kennzeichen fuer abonnierte Termine; sie sind schreibgeschuetzt und verschwinden mit dem Abo
alter table public.termine drop constraint termine_quelle_check;
alter table public.termine add constraint termine_quelle_check check (quelle in ('app','ics','outlook','google','abo'));
alter table public.termine add column abo_id bigint references public.kalender_abos(id) on delete cascade;
create index termine_abo_idx on public.termine(abo_id) where abo_id is not null;
-- Benutzer koennen weder abonnierte Termine aendern/loeschen noch selbst welche erfinden (die Edge Function nutzt die Service-Rolle, sie umgeht RLS)
create policy termine_abo_schreibschutz_upd on public.termine as restrictive for update using (abo_id is null) with check (abo_id is null);
create policy termine_abo_schreibschutz_del on public.termine as restrictive for delete using (abo_id is null);
create policy termine_abo_schreibschutz_ins on public.termine as restrictive for insert with check (abo_id is null);

-- Link im Vault (wie die Kalender-Token): nur service_role
create or replace function public.kalender_abo_url_speichern(p_abo bigint, p_url text) returns void
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_name text := 'kalender_abo_url_' || p_abo::text;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then perform vault.create_secret(p_url, v_name, 'Kalender-Abo-Link');
  else perform vault.update_secret(v_id, p_url, v_name, 'Kalender-Abo-Link'); end if;
end $$;
create or replace function public.kalender_abo_url_holen(p_abo bigint) returns text
language sql security definer set search_path to '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'kalender_abo_url_' || p_abo::text;
$$;
create or replace function public.kalender_abo_url_loeschen(p_abo bigint) returns void
language sql security definer set search_path to '' as $$
  delete from vault.secrets where name = 'kalender_abo_url_' || p_abo::text;
$$;
revoke all on function public.kalender_abo_url_speichern(bigint,text), public.kalender_abo_url_holen(bigint), public.kalender_abo_url_loeschen(bigint) from public, anon, authenticated;
grant execute on function public.kalender_abo_url_speichern(bigint,text), public.kalender_abo_url_holen(bigint), public.kalender_abo_url_loeschen(bigint) to service_role;

-- Geplanter Aufruf alle 15 Minuten (separat per SQL angelegt; Job kalender-abo-15min; Entfernen: select cron.unschedule('kalender-abo-15min');)
-- select cron.schedule('kalender-abo-15min','*/15 * * * *', $job$select net.http_post(url := 'https://nfgryuzkpwjfmdlmevuy.supabase.co/functions/v1/kalender-abo',
--   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='outlook_cron_secret')),
--   body := '{"modus":"cron"}'::jsonb, timeout_milliseconds := 120000)$job$);
