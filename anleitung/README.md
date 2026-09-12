# Anleitung als PDF

`Spengler-DIGITAL-Anleitung-v3.44.pdf` – Bedienungsanleitung der App,
85 Seiten, mit Bildschirmfotos aus der App selbst.

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
    PDF=anleitung/Spengler-DIGITAL-Anleitung-v3.44.pdf \
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

## Videoanleitung

`video.js` erzeugt ein Bildschirmvideo mit echtem Durchklicken: dieselbe
Attrappe (`stub.js`), derselbe Demozustand wie bei den Bildschirmfotos, aber
ein sichtbarer, animierter Mauszeiger bewegt sich zu den echten Knöpfen und
Feldern der echten `index.html` und klickt/tippt dort wirklich (echte
`page.mouse`/`page.keyboard`-Ereignisse, kein `dispatchEvent()` und kein
direktes Setzen von `.value`). Dazu läuft eine gesprochene deutsche
Erklärung: `espeak-ng` mit einer `mbrola`-Stimme (lokal, ohne
Internetverbindung und ohne API-Schlüssel - klingt deshalb hörbar
synthetisch, nicht wie eine natürliche Stimme). Jeder Text wird einmalig als
WAV-Clip erzeugt (Cache nach Inhalt in `AUS/sprache/*.wav`), seine echte
Länge abgewartet, und Clip-Datei + Startzeitpunkt werden in
`AUS/sprachspuren.json` notiert.

Vorbereitung einmalig (systemweit, nicht nur im Node-Ordner):

    apt-get install -y espeak-ng mbrola mbrola-de3 ffmpeg

Dann:

    SP=<Ordner mit node_modules> AUS=anleitung/video-out STUB=anleitung/stub.js \
    node anleitung/video.js

    AUS=anleitung/video-out node anleitung/vertonen.js

Der erste Schritt zeichnet das stumme Bildschirmvideo auf (Playwrights
eigenes, mitgeliefertes ffmpeg kann nur WebM/VP8 ohne Ton). Der zweite Schritt
(`vertonen.js`) baut aus `sprachspuren.json` mit dem echten, systemweiten
ffmpeg eine Tonspur (jeder Clip per `adelay` an seinen Startzeitpunkt
verschoben, dann mit `amix` gemischt) und muxt sie zum fertigen
`AUS/Spengler-DIGITAL-Videoanleitung.mp4` (H.264/AAC, läuft überall).

Video, Sprach-Clips und die fertige MP4 liegen bewusst **nicht** im Repo
(mehrere MB, in wenigen Minuten neu erzeugbar). Nur die Skripte sind
eingecheckt.

Enthält dieselben erfundenen Demodaten wie die Bildschirmfotos - siehe
"Wichtig" oben.
