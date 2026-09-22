# Spengler-DIGITAL 2.0 — Prototyp

Ein **Entwurf der Oberfläche**, nicht die App. Er beantwortet eine einzige
Frage:

> Ist Spengler-DIGITAL wesentlich übersichtlicher, wenn die ganze App nach
> dem tatsächlichen Arbeitsablauf organisiert ist statt nach Modulen?

## Beispieldaten oder echte Daten

Ganz oben steht ein Umschalter: **Beispiel** / **Echt (nur lesen)**.

Voreingestellt ist **Beispiel** — wer den Prototyp zum ersten Mal öffnet,
baut keine Verbindung zur Firmendatenbank auf.

**Echt** liest die eigenen Projekte und Massaufnahmen, damit sich die
Bedienung an der eigenen Arbeit beurteilen lässt. Dabei gilt ohne Ausnahme:

> Der Prototyp liest **ausschliesslich**. Kein Speichern, kein Ändern, kein
> Löschen. In `js/echt.js` steht kein einziger Schreibweg — nachprüfbar mit
> `grep -nE "insert|update|delete|upsert" prototype/js/echt.js`.

Gezeigt wird genau das, was das angemeldete Konto auch in der App sieht: die
Zugriffsrechte entscheidet die Datenbank (Row Level Security), nicht der
Prototyp.

Wer auf demselben Gerät in der App angemeldet ist, muss sich nicht noch
einmal anmelden — App und Prototyp liegen auf derselben Adresse und teilen
sich den angemeldeten Zustand. Sonst genügen Benutzername und Passwort.

**Was mit echten Daten NICHT angezeigt wird**, weil es sich nicht ehrlich
herleiten lässt:

| | warum |
| --- | --- |
| Stückzahlen in der Produktion | rechnet das Zuschnitt-Modul der App aus dem gespeicherten Plan; der Prototyp rechnet das bewusst nicht nach |
| Termin am Projekt | die Tabelle `projects` führt keinen |
| Offertbetrag | steckt in den Positionen, nicht als Summe |
| Lagerbestände | kommen aus den Buchungen der Lagerverwaltung |

An diesen Stellen steht der Grund, nicht eine erfundene Zahl.

## Was er ist — und was nicht

| | |
| --- | --- |
| **Arbeitet mit** | Beispieldaten aus `js/daten.js` — oder echten, nur lesend |
| **Speichert** | nichts |
| **Rechnet** | nichts |
| **Verbindet sich mit** | nichts (kein Supabase, kein Netz) |
| **Verändert an der bestehenden App** | nichts |

Jeder Knopf, hinter dem noch nichts liegt, sagt das beim Antippen —
ausdrücklich, statt so zu tun, als hätte er gespeichert.

## Testen

**1. Am einfachsten: Datei direkt öffnen.**
`prototype/index.html` im Browser öffnen (Doppelklick genügt). Es braucht
keinen Server: alles ist im Ordner, es wird nichts nachgeladen.

**2. Auf dem Handy oder Tablet.**
Sobald der Ordner auf `main` liegt, ist er über GitHub Pages erreichbar:
`…/Spengler---Digital-V1/prototype/`
Das **verändert die bestehende App nicht** — es kommt ein Ordner dazu, mehr
nicht. Die App liegt unverändert unter `…/Spengler---Digital-V1/`.

**3. Ohne Veröffentlichung, im eigenen WLAN.**
Im Projektordner einen kleinen Server starten und vom Handy aus die
IP-Adresse des Rechners aufrufen:

```
python3 -m http.server 8080
```
→ am Rechner `http://localhost:8080/prototype/`
→ am Handy   `http://<IP-des-Rechners>:8080/prototype/`

## Was es zu beurteilen gibt

- **Heute** — beantwortet die Startseite „was ist heute dran?“, ohne dass man
  suchen muss?
- **Projekt** — sagt die Ablaufleiste oben auf einen Blick, wo das Projekt
  steht?
- **Aufmass** — ist die Liste der Positionen mit Schrittfolge besser als ein
  langes Formular?
- **Werkstatt** — der Umschalter **Nach Projekt / Nach Material**. Das ist der
  eigentliche Vorschlag: an der Abkantbank rüstet man die *Maschine* um,
  sobald Material oder Stärke wechseln.
- **Wörter** — steht irgendwo noch ein Modulname statt einer Tätigkeit?

## Aufbau

```
prototype/
  index.html        lädt nur Dateien aus diesem Ordner
  css/prototype.css eigenständig, gleiche Farben wie die App
  js/daten.js       Beispieldaten
  js/app.js         Rahmen, Navigation, Adresszeile
  js/heute.js  projekte.js  projekt.js  werkstatt.js  lager.js  mehr.js
```

Die Adresse trägt den Zustand (`#/projekt/1/produktion`). Damit tut die
**Zurück-Taste** des Geräts, was man von ihr erwartet, und ein Bildschirm
lässt sich als Link verschicken.

## Zwei technische Hinweise

**Kein eigener Service Worker.** Der bestehende (`../sw.js`) ist für die ganze
Adresse zuständig und holt immer zuerst aus dem Netz — der Prototyp läuft
damit ohne Weiteres. Ein zweiter wäre ein Konflikt.

**Offline aufgerufen, ohne ihn je besucht zu haben**, zeigt derselbe Service
Worker die bestehende App statt des Prototyps (er fällt auf `index.html`
zurück). Einmal online geöffnet, ist er auch offline da. Beim Öffnen als
Datei (Weg 1) spielt das keine Rolle.
