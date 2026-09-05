# Anleitung als PDF

`Spengler-DIGITAL-Anleitung-v3.03.pdf` – Bedienungsanleitung der App,
35 Seiten, mit Bildschirmfotos aus der App selbst.

## Wie sie entsteht

Die Bildschirmfotos werden **nicht** von Hand gemacht, sondern aus der echten
`index.html` erzeugt: ein Browser lädt die App, ein Skript stellt einen
Demozustand her und fotografiert die Bildschirme. Dadurch ist die Anleitung bei
jeder Version in Minuten wieder aktuell.

Die Bilder liegen bewusst **nicht** im Repo (rund 4 MB, in Sekunden neu
erzeugbar). Nur das fertige PDF und die Skripte sind eingecheckt.

## Neu erzeugen

Vorbereitung einmalig (irgendein Ordner mit `node_modules`):

    npm install playwright-core pdfjs-dist @napi-rs/canvas

Dann im Wurzelverzeichnis des Repos:

    SP=<Ordner mit node_modules> \
    AUS=anleitung/bilder STUB=anleitung/stub.js \
    node anleitung/schuss.js

    SP=<Ordner mit node_modules> \
    HTML=$PWD/anleitung/anleitung.html \
    PDF=anleitung/Spengler-DIGITAL-Anleitung-v3.03.pdf \
    node anleitung/pdf.js

## Die Dateien

| Datei | Wozu |
|---|---|
| `anleitung.html` | Der Text der Anleitung mit Druck-Layout (A4) |
| `schuss.js` | Erzeugt die Bildschirmfotos aus der echten App |
| `stub.js` | Supabase-Attrappe mit **erfundenen** Demodaten |
| `pdf.js` | Rendert `anleitung.html` zu PDF |
| `raster.js` | Einzelne PDF-Seiten als Bild ansehen (Kontrolle) |
| `pruef.js` | Prüft alle Seiten auf leere oder kaputte Seiten |

## Wichtig

`stub.js` baut **keine Verbindung zur Produktivdatenbank** auf. Firma,
Personen, Adressen, Projekte und Preise in den Bildern sind erfunden. Es darf
für die Anleitung nie ein echter Kundendatensatz verwendet werden.

Bei einer neuen Version: Versionsnummer in `anleitung.html` (Titelseite,
Fusszeile, Abschnitt 22) anpassen und die Datei umbenennen.
