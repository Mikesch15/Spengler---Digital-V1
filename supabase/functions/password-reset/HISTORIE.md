# password-reset – Historie

## Fassung 2 (11.10.2026, App v3.310, Plattform-Version 2) – Härtung
Befund (Audit): Reset-Link aus dem anfragenden `Origin`-Header (fälschbar → Token-Diebstahl); keine Begrenzung (Mail-Flut).
Fix: feste Liste eigener Adressen; höchstens 3 Tokens je Konto in 15 Minuten (fail closed bei Zählfehler), Antwort immer `{ok:true}`.
Prüfstand: `pruefstaende/pruefstand-passwort-reset-sicherheit-v3-310.js`. Live (pg_net): siehe PROJECT_STATE v3.310.

## Fassung 1 (v3.103)
Selfservice-Reset per Mail (request/confirm), Token 30 Min, einmalig.

## Fassung 3 (11.10.2026, App v3.311, Plattform-Version 3) – CORS
Preflight erlaubte nur `authorization, content-type`; supabase-js schickt zusätzlich `apikey` und `x-client-info` → der Browser
blockierte die POST-Anfrage (Logs: OPTIONS ohne POST), es ging nie eine Reset-Mail raus. Jetzt wie die anderen Funktionen.
Offen: ob Resend an beliebige Empfänger sendet (Testabsender `onboarding@resend.dev`), und der Link ohne App-Pfad.

## Fassung 4 (11.10.2026, App v3.312, Plattform-Version 4) – Link mit App-Pfad
Link war `https://mikesch15.github.io/?reset=…` (ohne Projektpfad). Neu: Client schickt `app_url`; Host fest (Präfix `https://mikesch15.github.io/`), nur
unauffällige Zeichen, sonst Standardadresse. Origin-Header wird nicht mehr verwendet.
Belegt: Resend-Testabsender sendet nur an die Kontoadresse (403 im Funktionslog) – für andere Empfänger ist eine verifizierte Domain nötig.

## Fassung 5 (11.10.2026, App v3.313, Plattform-Version 7) – Gmail-Versand
`mailSenden()`: Gmail-SMTP (Secrets `GMAIL_USER`, `GMAIL_APP_PASSWORD`) mit Rückfall auf Resend. Grund: Resend-Testabsender sendet nur an die Kontoadresse (403).
