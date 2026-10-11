# password-reset – Historie

## Fassung 2 (11.10.2026, App v3.310, Plattform-Version 2) – Härtung
Befund (Audit): Reset-Link aus dem anfragenden `Origin`-Header (fälschbar → Token-Diebstahl); keine Begrenzung (Mail-Flut).
Fix: feste Liste eigener Adressen; höchstens 3 Tokens je Konto in 15 Minuten (fail closed bei Zählfehler), Antwort immer `{ok:true}`.
Prüfstand: `pruefstaende/pruefstand-passwort-reset-sicherheit-v3-310.js`. Live (pg_net): siehe PROJECT_STATE v3.310.

## Fassung 1 (v3.103)
Selfservice-Reset per Mail (request/confirm), Token 30 Min, einmalig.
