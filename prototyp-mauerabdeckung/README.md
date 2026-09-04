# Prototyp · Massaufnahme Mauerabdeckung

Eigenständiger Prototyp. **Nicht in `main` integriert** – er liegt allein auf
dem Branch `feature/prototype-mauerabdeckung` und verändert die laufende App
nicht.

## Aufmachen

Am einfachsten: **`mauerabdeckung-testapp.html`** – eine einzige Datei, ohne
Server, ohne Internet, ohne Login. Auf ein Android-Handy oder -Tablet kopieren
und antippen, oder im Browser öffnen:

    xdg-open prototyp-mauerabdeckung/mauerabdeckung-testapp.html

Gespeichert wird im Gerät (`localStorage`), nichts geht nach aussen.

Zum Weiterentwickeln gibt es dieselbe Oberfläche als Einzeldateien
(`mauerabdeckung.html`). Nach jeder Änderung neu bauen:

    node prototyp-mauerabdeckung/uebernehmen.js   # Fachlogik frisch schneiden
    node prototyp-mauerabdeckung/bauen.js         # Testapp neu bauen

## Prüfstand

    SP=<Ordner mit node_modules> node prototyp-mauerabdeckung/pruefstand.js

Läuft in echtem Chromium gegen die gebaute Testapp – also gegen genau die
Datei, die auf dem Tablet geöffnet wird.

## Woher die Rechnung kommt

Der Prototyp rechnet **nichts selbst**. Die gesamte Fachlogik wird
zeichengenau aus der laufenden App geschnitten (`uebernehmen.js` →
`uebernommen.js`) und beim Bauen nochmals gegen die Quelldateien geprüft;
weicht auch nur ein Zeichen ab, bricht der Bau ab.

| Übernommen | aus |
|---|---|
| `madMaterialTabelle`, `computeMadBoundaries`, `calcMadSchieber`, `berechneMadStueckliste`, `madBiegeVorgabe`, `madProfilMasse`, `madNormHinweise`, `madProfilSvgAus`, `generateMadProfilSvg`, `MAD_BIEGERADIUS`, `MAD_SAUM_LUFT`, `MAD_MIN_HOEHE`/`_WIND` | `js/12b-mauerabdeckung.js` |
| `calcDilaPositionsInStretch`, `generateRinneGrundriss` | `js/12-rinne-halbrund.js` |
| `abgerundeterPfad`, `ansichtsPfeilSvg` | `js/14-freies-profil.js` |
| `ebaPackeInStreifen`, `ebaZahl` (Zuschnitt aus Rollenblech) | `js/29-einlaufblech-aufnahme.js` |
| `findMeasurementMaterial`, `measurementMaterialOrFallback`, `MEASUREMENT_MATERIAL_FALLBACK` | `js/01-basis.js` |

`madProfilMasse()` liest seine Werte in der App direkt aus den Eingabefeldern.
Damit die Funktion unverändert bleiben kann, stehen dieselben Felder unsichtbar
in der Seite (`#p-stummel`); `madBrueckeSetzen()` füllt sie vor jeder Rechnung
aus dem Modell. Gleiches Vorgehen wie `#rinneStummel` und `#ebStummel` in der
laufenden App.

Der Prüfstand kontrolliert das dauerhaft: `prototyp-mad.js` darf keine der
Fachfunktionen selbst definieren, muss sie alle aufrufen und darf keine eigene
Geometrie rechnen (`Math.sin/cos/tan` kommen darin nicht vor).

## Die neun Register

1. **Grunddaten** – Bezeichnung, Datum, Objekt, Material. Dazu die Abstände,
   die dieses Material erlaubt (aus dem Material-Katalog, SIA 271).
2. **Verlauf** – START → Segment → Ecke → Segment → … → ENDE. Jedes Segment
   eine eigene Karte mit grossen Feldern, verschiebbar und löschbar. Grundriss
   darunter.
3. **Boden & Schieber** – Boden am Anfang/Ende (wirkt wie ein Fixpunkt),
   Grenzpunkte, automatische Schieberpositionen, wahlweise von Hand.
4. **Profil & Norm** – alle neun Profilmasse, Querschnittszeichnung,
   Abwicklung, Normhinweise.
5. **Stückliste** – Nummer, von/bis, Abstand, Zuschnitt, Position.
6. **Zuschnitt** – aus Rollenblech, wie bei Einlaufblech gerade, Einlaufblech
   konisch und Freies Profil: von der Rolle wird eine Tafel abgeschnitten und
   quer in Streifen von der Breite der Abwicklung geteilt; ein Streifen nimmt
   mehrere Stücke hintereinander auf. Je Rollenbreite Tafeln, Fläche und
   Verschnitt, dazu die Belegung jedes Streifens mit Stücknummer und Länge.
7. **Ausmass** – vollständig aus den erfassten Daten abgeleitet.
8. **Kontrolle** – fehlende Masse, ungültige Zahlen, Verlauf, Boden, Schieber,
   Profil, Normhinweise, Ausmass, Zuschnitt. Das Register trägt einen Punkt,
   sobald es etwas zu sehen gibt.
9. **Fotos & Speichern** – wie bei den fertigen Modulen erst am Schluss:
   Fotos → Skizze → Notiz → Speichern.

## Was der Prototyp NICHT tut

- keine Supabase-Anbindung (alles im Gerät)
- keine Artikelnummern und keine Preise im Ausmass
- keine eigenen Normwerte und keine eigene Fachrechnung
- kein PDF-Druck
- der Verschnitt rechnet ohne Schnittfuge und ohne Wiederverwendung von
  Reststücken – wie bei den übrigen Modulen

## Einstellungen

Die zwei Zuschnittzugaben (Boden, Schieberseite) liegen gerätebezogen im
`localStorage`; in der App stehen dieselben Werte firmenweit in `app_settings`.
Vorgabe ist der Stand der laufenden App: Boden 0 mm, Schieber 10 mm.

Die **Rollenbreiten** für den Zuschnitt liegen ebenfalls dort (Vorgabe 1000 und
670 mm, weitere zuschaltbar); in der App stehen sie firmenweit in
`app_settings.blech_rollenbreiten`.

Die **Abstände zwischen zwei Schiebern** lassen sich bewusst nicht einstellen –
sie kommen aus dem Material-Katalog.
