# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.44`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

## ARCHITEKTUR

Spengler-DIGITAL ist eine modulare Web-App.

### Frontend
- `index.html` – Einstiegspunkt
- `js/` – modulare JavaScript-Fachlogik
- `css/` – Styles
- `sw.js` – Service Worker / Offline / App-Cache
- `manifest.json` – PWA

### Backend
- Supabase
- PostgreSQL
- Auth
- Storage
- Row Level Security (RLS)
- Edge Functions

`sw.js` enthält aktuell die JavaScript-App-Shell der Module `01` bis `65`.

## ZENTRALER WORKFLOW

```text
PROJEKT
→ OFFERTE
→ MASSAUFNAHME
→ BERECHNUNG
→ MATERIAL & ZUSCHNITT
→ ZUSCHNITT
→ STÜCK ABHAKEN
→ WERKSTATT / RÜSTLISTE
→ RÜSTEN / MONTIEREN
→ AUSMASS