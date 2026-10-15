-- v3.373: Wetter auf der Startseite (Firmenstandort). Bereits per Migration "app_settings_wetter" angewendet (diese Datei dokumentiert sie).
-- Nur neue Spalten in der bestehenden Firmen-Einstellungstabelle; Policies unveraendert (SELECT authenticated, UPDATE nur Admin, tenant_boundary RESTRICTIVE).
alter table public.app_settings add column if not exists wetter_aktiv boolean not null default false;
alter table public.app_settings add column if not exists wetter_ort text;
alter table public.app_settings add column if not exists wetter_lat numeric;
alter table public.app_settings add column if not exists wetter_lon numeric;
alter table public.app_settings add constraint app_settings_wetter_koordinaten_chk check ((wetter_lat is null or (wetter_lat between -90 and 90)) and (wetter_lon is null or (wetter_lon between -180 and 180)));
