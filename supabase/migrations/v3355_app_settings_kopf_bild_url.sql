-- v3.355: Titelbild im Kopfbereich der Startseite (Firmeneinstellungen).
-- Bereits per Migration "app_settings_kopf_bild_url" auf das Projekt angewendet (diese Datei dokumentiert sie im Repo).
-- Nur eine neue, leere Textspalte (Speicherpfad im Bucket measurements, wie logo_url). Keine RLS-/Policy-Änderung:
-- die bestehenden Policies und Rechte der Tabelle gelten spaltenunabhängig.
alter table public.app_settings add column if not exists kopf_bild_url text;
comment on column public.app_settings.kopf_bild_url is 'Titelbild im Kopfbereich der Startseite (Speicherpfad im Bucket measurements, wie logo_url). Leer = kein Bild.';
