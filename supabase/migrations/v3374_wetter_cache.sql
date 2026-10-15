-- v3.374: Zwischenspeicher fuer die Wettervorhersage von MeteoSchweiz (Edge Function wetter-meteoschweiz).
-- Bereits per Migration "wetter_cache" angewendet (diese Datei dokumentiert sie im Repo).
-- Oeffentliche Wetterdaten je Postleitzahl, KEINE Firmendaten. RLS ist eingeschaltet und es gibt bewusst KEINE Policy:
-- Clients (anon/authenticated) kommen nicht heran, nur die Edge Function ueber den Service-Schluessel.
create table if not exists public.wetter_cache(
  plz text primary key check (plz ~ '^[1-9][0-9]{3}$'),
  stand timestamptz not null default now(),
  daten jsonb not null
);
alter table public.wetter_cache enable row level security;
revoke all on public.wetter_cache from anon, authenticated;
comment on table public.wetter_cache is 'Zwischenspeicher der MeteoSchweiz-Vorhersage je PLZ; nur Edge Function wetter-meteoschweiz (Service-Schluessel).';
