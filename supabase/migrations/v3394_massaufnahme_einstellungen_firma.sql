-- v3.394 Einstellungen der Massaufnahme-Arten firmenweit (bisher nur im Browser des Geraets, localStorage).
-- Additiv: eine Spalte in der bestehenden Firmen-Zeile app_settings. Lesen/Schreiben regeln unveraendert die bestehenden Policies
-- (lesen: Firma; schreiben: Administrator). Format: { "<localStorage-Schluessel>": { ...Einstellungen... }, ... }
-- Rueckgaengig: alter table public.app_settings drop column massaufnahme_einstellungen;
alter table public.app_settings add column if not exists massaufnahme_einstellungen jsonb not null default '{}'::jsonb;
alter table public.app_settings add constraint app_settings_massaufnahme_einstellungen_obj check (jsonb_typeof(massaufnahme_einstellungen) = 'object');
