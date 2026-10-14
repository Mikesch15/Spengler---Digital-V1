-- v3.361: Zuordnung Standrohr-Durchmesser -> Mantelrohr-Durchmesser (Einfassung rund) gilt firmenweit.
-- Bereits per Migration "app_settings_einfassung_mantel_zuordnung" auf das Projekt angewendet (diese Datei dokumentiert sie im Repo).
-- Nur eine neue jsonb-Spalte mit Standard '[]' in der bestehenden Firmen-Einstellungstabelle; keine RLS-/Policy-Änderung
-- (die bestehenden Policies von app_settings gelten spaltenunabhängig).
alter table public.app_settings add column if not exists einfassung_mantel_zuordnung jsonb not null default '[]'::jsonb;
comment on column public.app_settings.einfassung_mantel_zuordnung is 'Einfassung rund, firmenweit: Zuordnung Standrohr-Durchmesser -> Mantelrohr-Durchmesser (mm) als Liste von {standrohr, mantel}. Leer = keine Zuordnung.';
