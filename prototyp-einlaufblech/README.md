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
| `pruefstand.js` | 220 Prüfungen in echtem Chromium |

## Register

1. **Grunddaten** – Bezeichnung, Datum, Objekt, Material, Abwicklung, Montage
2. **Geometrie** – Mass A, Winkel, live beschriftete Schnittzeichnung,
   Restbreite / enges Mass / enge Seite
3. **Ausführung** – Gesamtlänge → Stücke, Stückliste, Gehrungen,
   Endzugaben, Haltebleche („GAVA Blech“), Grundriss
4. **Fotos & Skizze**
5. **Kontrolle** – Plausibilität und Zusammenfassung
6. **Ausmass** – Ausmass (inkl. m²), Materialübersicht,
   Rollenblech und Verschnitt, Zuschnittliste

## Nachgetragen (Rückmeldung vom 03.09.)

* Restbreite und enges Mass laufen beim Tippen mit (vorher erst nach dem
  nächsten vollen Zeichnen – es sah aus, als fehle Mass A in der Formel).
* Der Blickrichtungspfeil am linken Rand ist aus dem **Grundriss**
  entfernt. `js/13` zeichnet ihn weiterhin; der Prototyp nimmt genau
  diesen einen Pfeil wieder heraus.
* **Haltebleche („GAVA Blech“)**: Kästchen in Register 3. Angehakt gibt
  es Abstand und Anzahl; gerechnet wird wie der Halterabstand bei Rinne
  Halbrund in der App: `ganzzahlig(Länge ÷ Abstand) + 1`.
* **Fläche in m²**: Gesamtlänge × Abwicklung, im Ausmass und in der
  Materialübersicht.
* **Rollenblech und Verschnitt**: von der Rolle wird eine **Tafel**
  abgeschnitten – so lang wie das längste Einlaufblechstück – und quer in
  Streifen der Abwicklung geteilt. In einem Streifen dürfen mehrere Stücke
  **hintereinander** liegen, wie bei der Rinne aus einer Normlänge.
  `Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)`,
  `Tafeln = aufgerundet(Streifen ÷ Streifen je Tafel)`.
  Standard sind 1'000 und 670 mm; 500/400/330/250/200 mm liegen bereit
  und lassen sich in den Einstellungen dazuschalten.

## Rinnenlängen übernehmen

Wie in der laufenden App: aus den Segmenten einer Rinne-Halbrund-
Massaufnahme werden Einlaufblech-Stücke gerechnet – mit
`baueEinlaufblechStueckeAusRinne()` aus `js/13`, unverändert. Eine Ecke
im Rinnenverlauf wird zur Gehrung, zu lange Segmente werden aufgeteilt.

Woher die Rinnen kommen: in der App aus Supabase, im Prototyp aus dem
Speicher des Rinnen-Prototyps auf demselben Gerät
(`sd_prototyp_rinne_halbrund`). Liegen die beiden Testapps getrennt,
lässt sich eine Massaufnahme auch als Text einfügen – im Format des
Rinnen-Prototyps (`segmente`) oder der App (`data.segments`).

## Nicht enthalten

Kein Supabase, keine Projektzuordnung, kein PDF, keine Artikelnummern und
keine Preise. Die Ablage liegt im Browser des Geräts (`localStorage`).
