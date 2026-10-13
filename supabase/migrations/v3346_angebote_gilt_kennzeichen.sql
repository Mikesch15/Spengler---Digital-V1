-- v3.346: Kennzeichen, welche importierten Offerten eines Projekts gelten.
-- Bereits per Migration "angebote_gilt_kennzeichen" auf das Projekt angewendet (diese Datei dokumentiert sie im Repo).
-- Standard true = nichts ändert sich für bestehende Offerten.
-- RLS: keine Änderung; die bestehenden Policies (has_permission angebote edit, tenant_boundary_angebote, feature_boundary_angebote)
-- gelten spaltenunabhängig.
alter table public.angebote add column if not exists gilt boolean not null default true;
comment on column public.angebote.gilt is 'Gilt diese importierte Offerte für die Offertmengen des Projekts? Mehrere dürfen gelten; sie werden getrennt angezeigt, nie addiert.';
