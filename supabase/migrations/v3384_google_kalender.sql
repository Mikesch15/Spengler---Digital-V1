-- v3.384 Google-Kalender-Abgleich (nutzt dieselben Tabellen wie der Outlook-Abgleich; additiv).
-- Pro Person gibt es weiterhin genau EINE Kalenderverbindung (unique profile_id): Microsoft ODER Google.
-- Rueckgaengig: alter table outlook_verbindungen drop column anbieter; alter table outlook_oauth_state drop column anbieter; drop function google_token_*;
alter table public.outlook_verbindungen add column anbieter text not null default 'microsoft' check (anbieter in ('microsoft','google'));
alter table public.outlook_oauth_state add column anbieter text not null default 'microsoft' check (anbieter in ('microsoft','google'));

-- Refresh-Token von Google im Vault (wie bei Microsoft; nur service_role)
create or replace function public.google_token_speichern(p_profil uuid, p_token text) returns void
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_name text := 'google_refresh_' || p_profil::text;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then perform vault.create_secret(p_token, v_name, 'Google Refresh-Token');
  else perform vault.update_secret(v_id, p_token, v_name, 'Google Refresh-Token'); end if;
end $$;
create or replace function public.google_token_holen(p_profil uuid) returns text
language sql security definer set search_path to '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'google_refresh_' || p_profil::text;
$$;
create or replace function public.google_token_loeschen(p_profil uuid) returns void
language sql security definer set search_path to '' as $$
  delete from vault.secrets where name = 'google_refresh_' || p_profil::text;
$$;
revoke all on function public.google_token_speichern(uuid,text), public.google_token_holen(uuid), public.google_token_loeschen(uuid) from public, anon, authenticated;
grant execute on function public.google_token_speichern(uuid,text), public.google_token_holen(uuid), public.google_token_loeschen(uuid) to service_role;

-- Quelle "google" fuer aus Google importierte Termine (zweite Migration "termine_quelle_google")
alter table public.termine drop constraint termine_quelle_check;
alter table public.termine add constraint termine_quelle_check check (quelle in ('app','ics','outlook','google'));
