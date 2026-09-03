# Prototyp · Massaufnahme „Einlaufblech gerade“

Eigenständig testbar, **nicht** in `main` eingebaut. Branch:
`feature/prototype-einlaufblech-gerade`.

## Öffnen

**Auf dem Tablet – eine einzige Datei:**

    prototyp-einlaufblech/einlaufblech-gerade-testapp.html

Diese Datei enthält alles (Stile, Fachlogik, Prototyp) und braucht keinen
Server, kein Internet und keinen Login. Einfach kopieren und öffnen.

**Am Rechner – als Ordner:** `prototyp-einlaufblech/einlaufblech-gerade.html`

## Neu bauen

    node prototyp-einlaufblech/uebernehmen.js   # Fachlogik frisch schneiden
    node prototyp-einlaufblech/bauen.js         # Einzeldatei bauen
    SP=<Ordner mit node_modules> node prototyp-einlaufblech/pruefstand.js

## Woher die Rechnung kommt

Nichts ist nachgebaut. `uebernehmen.js` schneidet fünf Funktionen
**zeichengenau** aus der laufenden App und prüft danach, dass der
geschnittene Text unverändert in der Quelle vorkommt:

| Funktion | Quelle |
|---|---|
| `einlaufblechDiagramSvg()` | `js/11-einlaufblech-gerade.js` |
| `teileLaengeInStuecke()` | `js/13-einlaufblech-konisch.js` |
| `generateEbkGrundriss()` | `js/13-einlaufblech-konisch.js` |
| `baueEinlaufblechStueckeAusRinne()` | `js/13-einlaufblech-konisch.js` |
| `ansichtsPfeilSvg()` | `js/14-freies-profil.js` |

Drei Rechenregeln stehen in `js/15-einlaufblech-stueckliste.js` mitten im
Formularcode und lesen ihre Werte direkt aus den Eingabefeldern. Sie sind
hier unverändert als Formel notiert (Kopf von `prototyp-eb.js`):

    enge Seite   = Montage "links" -> "rechts", sonst "links"
    Restbreite   = Abwicklung − Mass A − Umschlag oben − Umschlag unten
    enges Mass A = max(0, Mass A − 2)

## Dateien

| Datei | Zweck |
|---|---|
| `bruecke.js` | `$`, `esc`, Einstellungen, Materialkatalog |
| `uebernehmen.js` | schneidet die Fachlogik aus `js/` (mit Gegenprobe) |
| `uebernommen.js` | **erzeugt** – die geschnittene Fachlogik |
| `prototyp-eb.js` | Oberfläche, Register, Kontrolle, Ausmass, Material |
| `prototyp.css` | Stile |
| `einlaufblech-gerade.html` | Mehrdatei-Fassung |
| `einlaufblech-gerade-testapp.html` | **erzeugt** – eine Datei für das Tablet |
| `bauen.js` | baut die Einzeldatei (mit Gegenprobe) |
| `pruefstand.js` | 140 Prüfungen in echtem Chromium |

## Register

1. **Grunddaten** – Bezeichnung, Datum, Objekt, Material, Abwicklung, Montage
2. **Geometrie** – Mass A, Winkel, live beschriftete Schnittzeichnung,
   Restbreite / enges Mass / enge Seite
3. **Ausführung** – Gesamtlänge → Stücke, Stückliste, Gehrungen,
   Endzugaben, Grundriss
4. **Fotos & Skizze**
5. **Kontrolle** – Plausibilität und Zusammenfassung
6. **Ausmass** – Ausmass, Materialübersicht, Zuschnittliste

## Nicht enthalten

Kein Supabase, keine Projektzuordnung, kein PDF, keine Artikelnummern und
keine Preise. Die Ablage liegt im Browser des Geräts (`localStorage`).
