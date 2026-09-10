# Spengler-DIGITAL

## Projekt

Spengler-DIGITAL ist eine modulare Web-App für einen Spenglerbetrieb.

Die Anwendung unterstützt unter anderem:

- Projekte
- Regierapporte
- Massaufnahmen
- Offerten
- Ausmass
- Berechnungen
- Material
- Zuschnitt
- Werkstatt / Rüstlisten
- Ausführung
- Leistungen
- Aufgaben
- Offline-Funktionen

## Aktueller Stand

Der aktuelle Code auf dem Branch `main` ist die verbindliche Grundlage.

Für den kompakten technischen Projektstand siehe:

`PROJECT_STATE.md`

Alte Abschlussberichte, Prototypen, Backups und frühere Versionen sind nicht automatisch aktuell.

## Architektur

Die Anwendung ist modular aufgebaut.

### Frontend

- `index.html`
- `js/`
- `css/`
- `sw.js`
- `manifest.json`

### Backend

- Supabase
- PostgreSQL
- Auth
- Storage
- Row Level Security (RLS)
- Edge Functions

Die JavaScript-Fachlogik befindet sich in den nummerierten Modulen unter `js/`.

## Projekt-Workflow

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