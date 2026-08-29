# Spengler-DIGITAL · Projektnotizen

Kurze Gebrauchsanleitung für alle, die später an dieser App arbeiten –
auch für mich selbst in einem halben Jahr. Stand: Version 1.86.

---

## 1. Was die App ist

Eine Webapp für einen Spenglerbetrieb, veröffentlicht über GitHub Pages,
mit Supabase als Backend. Sie läuft als installierbare App auf dem Handy
(PWA) und deckt vier Bereiche ab:

- **Regierapport** – Zeit- und Materialrapport mit PDF-Ausdruck
- **Massaufnahme** – Skizze/Foto, Einlaufblech gerade und konisch,
  Rinne Halbrund, Freies Profil, Mauerabdeckung,
  Lukarne Seitenverkleidung
- **Ausmass** – Offerte erfassen, Blitzschutzausmass
- **Projekte** – klammert Rapporte, Massaufnahmen und Ausmasse zusammen

---

## 2. Aufbau der Dateien

Bis Version 1.49 steckte alles in einer einzigen `index.html` mit knapp
5000 Zeilen. Seit 1.50 ist es aufgeteilt.

```
index.html          nur noch Bildschirmelemente, keine Logik
sw.js               Service Worker (Offline, Cache)
manifest.json       PWA-Angaben
css/01-basis.css    Grundlayout und Bausteine
css/02-responsive   Bildschirmgrössen
css/03-druck.css    alles fürs PDF
css/04-rechte.css   Darstellung eingeschränkter Rechte
js/01 … js/19       Programmteile, siehe unten
sql/                Datenbankschritte, einzeln nummeriert
supabase/           Edge Functions zum Einfügen ins Dashboard
```

### Die Programmteile

| Datei | Inhalt |
|---|---|
| `01-basis.js` | Konfiguration, globale Variablen, `$()`, Fehleranzeige |
| `02-feedback.js` | Feedback senden und verwalten |
| `03-login.js` | Anmeldung, Passwortpflicht bei Erstanmeldung |
| `04-start-suche.js` | Startbildschirm, globale Suche, Übersichten |
| `05-daten-laden.js` | lädt alles aus Supabase in die globalen Variablen |
| `05a-rechte.js` | Rechte je Mitarbeiter, Module in Entwicklung |
| `06-rapport.js` | Regierapport |
| `07-einstellungen.js` | Einstellungen, Konten, Sicherung |
| `08-katalog-blitzschutz.js` | Kataloge, `renderSettings()` |
| `09-projekte.js` | Projekte |
| `10-massaufnahme.js` | Liste und Öffnen von Massaufnahmen |
| `11-einlaufblech-gerade.js` | Zeichnung Einlaufblech gerade |
| `12-rinne-halbrund.js` | Rinne, **plus die geteilten Helfer** (siehe 5.) |
| `12b-mauerabdeckung.js` | Mauerabdeckung |
| `13-einlaufblech-konisch.js` | Zeichnung konisch |
| `14-freies-profil.js` | Freies Profil, **plus `abgerundeterPfad` und `ansichtsPfeilSvg`** |
| `15-einlaufblech-stueckliste.js` | Stückliste Einlaufblech |
| `16-massaufnahme-formular.js` | Formular, Speichern, **alle PDF-Ausdrucke** |
| `17-ausmass.js` | Ausmass |
| `19-lukarne.js` | Lukarne Seitenverkleidung, Plan und Scharenliste |
| `18-app-start.js` | Sitzung prüfen, Service Worker anmelden — **bleibt die letzte Zeile** |

### Zwei Regeln, die man nicht brechen darf

**Die Reihenfolge der `<script>`-Zeilen in `index.html` bleibt, wie sie
ist.** Es sind gewöhnliche Skripte, keine Module. Sie teilen sich einen
Namensraum, und spätere Dateien bauen auf früheren auf. Neues hinten
anhängen — aber **vor** `18-app-start.js`. Diese Datei prüft beim Laden
sofort die Sitzung; was danach steht, ist unter Umständen noch nicht da.
Deshalb steht `19-lukarne.js` in der Liste vor `18-app-start.js`.

**Wer eine Funktion beim Laden aufruft, muss sie vorher definiert haben.**
Innerhalb einer Datei sorgt JavaScript selbst dafür, über Dateigrenzen
hinweg nicht. Deshalb steht `debounce` in `01-basis.js` und nicht dort,
wo es ursprünglich stand.

---

## 3. Veröffentlichen

1. Dateien in GitHub hochladen – am besten immer den **ganzen**
   ZIP-Inhalt, nicht einzelne Dateien
2. Unter **Actions** warten, bis der grüne Haken kommt (1–2 Minuten)
3. App auf dem Handy komplett schliessen und neu öffnen

**Kontrolle:** Auf dem Startbildschirm steht unten die Versionsnummer.
Stimmt sie nicht, ist mindestens die `index.html` nicht angekommen.

Bei jeder Änderung sind **zwei Stellen** hochzuzählen: die Zeile in
`index.html` unter den Startknöpfen und `const CACHE` in `sw.js`. Beide
tragen dieselbe Nummer.

**Wenn eine Änderung nicht ankommt:** Datei direkt aufrufen und ein
Fragezeichen anhängen, etwa
`…/js/12b-mauerabdeckung.js?test=1`. Das umgeht jeden Zwischenspeicher
und zeigt, was wirklich auf dem Server liegt. Diese eine Zeile hat uns
mehr Fehlersuchen erspart als alles andere.

**Bei einem Programmfehler** erscheint unten ein roter Balken mit
Meldung, Datei und Zeilennummer (`01-basis.js`, ganz oben). Am Handy
gibt es keine Entwicklerkonsole – ohne den Balken tappt man im Dunkeln.

---

## 4. Datenbank

Die Dateien in `sql/` sind einzeln nummeriert und dürfen mehrfach laufen.
Sie bauen aufeinander auf, also der Reihe nach ausführen.

| Datei | Zweck |
|---|---|
| `07-rechte-je-mitarbeiter.sql` | Tabelle `permission_overrides`, erweitert `has_permission` |
| `08-eigene-oder-alle.sql` | Spalten `scope` / `edit_scope`, neun Zugriffsregeln |
| `09-feedback-regeln.sql` | Zugriffsregeln für `feedback` (fehlten ganz) |
| `10-rinne-dila-mass.sql` | Mass des Dilatationselements |
| `11-mauerabdeckung.sql` | Masse für Boden und Schieber |
| `12-module-test.sql` | Module in Entwicklung |
| `13-passwort-erstanmeldung.sql` | Kennzeichen `passwort_gesetzt` |
| `14-lukarne.sql` | Standardwerte und Zugaben der Lukarne |

**Die wichtigste Falle:** Postgres verknüpft mehrere Zugriffsregeln auf
derselben Tabelle mit **ODER**, nicht mit UND. Eine alte Regel, die allen
Angemeldeten alles erlaubt, macht jede neue Einschränkung wirkungslos.
Vor jeder Änderung an den Regeln also erst nachschauen, was schon da ist:

```sql
select tablename, policyname, cmd, qual from pg_policies
where schemaname='public' order by tablename, policyname;
```

### Rechtesystem

Drei Ebenen, in dieser Reihenfolge ausgewertet:

1. `profiles.role = 'admin'` → darf alles
2. `permission_overrides` → Ausnahme für diesen einen Mitarbeiter
3. `permission_settings` → Vorgabe für seine Rolle

Je Bereich gibt es **sehen** (eigene / alle) und **bearbeiten** (nichts /
eigene / alle). Die Zuordnung läuft über `created_by`, das bei
`reports`, `measurements` und `ausmass` mitgeschrieben wird.

`js/05a-rechte.js` bildet dieselbe Logik im Browser nach, aber **nur zum
Ausblenden von Knöpfen**. Wirksam ist allein die Datenbank. Wer etwas
ändert, muss beides anfassen.

### Edge Functions

- `smart-action` – legt Mitarbeiterkonten an. Verlangt bisher den
  Firmen-Code. **Offen:** sollte stattdessen prüfen, ob der Aufrufer
  Administrator ist.
- `reset-password` – setzt ein Passwort zurück, Vorlage in
  `supabase/reset-password.ts`. Prüft die Rolle selbst.

---

## 5. Geteilte Bausteine

Diese Funktionen werden von mehreren Modulen benutzt. Wer sie ändert,
ändert überall mit:

- **`calcDilaPositionsInStretch`** (`12-rinne-halbrund.js`) – verteilt
  Dehnungselemente auf einer Strecke. Alle Stücke gleich lang; wer an
  eine Ecke oder einen Fixpunkt stösst, wird auf sein Maximum begrenzt,
  der Rest verteilt sich neu. Benutzt von Rinne **und** Mauerabdeckung.
- **`generateRinneGrundriss`** – Grundriss mit Masszahlen und
  Ansichtspfeilen. Der vierte, freiwillige Wert setzt bei der
  Mauerabdeckung das Bodenzeichen ans Linienende.
- **`abgerundeterPfad`** (`14-freies-profil.js`) – macht aus einem
  Linienzug einen Pfad mit echten Kreisbögen an den Ecken.
- **`ansichtsPfeilSvg`** (`14-freies-profil.js`) – roter Blickrichtungs-
  pfeil, wahlweise links / oben / rechts / unten.

- **`MEAS_TYPE_LABELS`** (`01-basis.js`) – die Bezeichnungen der
  Massaufnahme-Arten. Sie standen früher in fünf Dateien einzeln; eine
  neue Art musste überall nachgetragen werden und wurde vergessen. Jetzt
  gibt es sie nur noch einmal. Eine neue Art braucht hier eine Zeile und
  einen Knopf mit `data-choose-meas-type` in `index.html` – die Liste
  „Module in Entwicklung" liest sich daraus selbst zusammen.

**Wichtig bei den PDFs:** `16-massaufnahme-formular.js` enthält für jede
Art einen eigenen Zweig, der die Darstellung **ein zweites Mal** aufbaut.
Ändert man etwas an einer Tabelle in der App, muss man den PDF-Zweig von
Hand nachziehen. Genau das ist mehrfach vergessen gegangen. Jeder Zweig
definiert ausserdem `cell` und `extraCss` für sich selbst und schreibt
das Ergebnis nach `bodyHtml`.

---

## 6. Fachliche Grundlagen

**Dehnungselemente nach SIA 271** – maximale Abstände in Metern:

| Baustoff | zwischen zwei | ab Ecke (L/2) |
|---|---|---|
| Kupfer, CrNi-Stahl, Chromstahl verzinnt | 6.00 | 3.00 |
| Titanzink | 5.00 | 2.50 |
| Aluminium (Aluman) | 4.00 | 2.00 |

Bei der Mauerabdeckung zählt ein **Boden wie ein Fixpunkt**, dort gilt
also ebenfalls der halbe Abstand. Ein **Schieber** übernimmt die Rolle
des Dehnungselements.

**Mauerabdeckung, Mindestmasse:** Aufkantung 50 mm, bei windexponierter
Lage 100 mm. Die App warnt, sperrt aber nicht.

**Blechlauf im Querschnitt**, von links nach rechts:
Saum 180° → Umschlag links 135° → Schenkel links → Deckfläche mit
Gefälle nach rechts → Schenkel rechts → Umschlag rechts 90° → Saum 180°.
Die Abwicklung nimmt die Gesamtbreite so, wie sie eingegeben wurde –
sie wird **nicht** über die Schräge verlängert.

**Lukarne Seitenverkleidung.** Die Wange ist ein Dreieck: vordere Kante
senkrecht (Höhe H), obere Kante (Länge L) im Innenwinkel α dazu, beide
treffen sich hinten in der Spitze. Mit β = α − 90° gilt

    waagerechte Breite  W  = L · cos β
    Spitze liegt um     dy = L · sin β  über der vorderen Oberkante
    Schräge am Dach     A  = √(W² + (H + dy)²)

Die Scharlänge an der Stelle x ist H · (1 − x / W), läuft also gleichmässig
auf null aus. Die Scharen stehen senkrecht, Achsabstand und Scharbreite
werden **waagerecht** gemessen, die letzte Schar bekommt die Restbreite.

Der **Hilfsriss** ist die waagerechte Reisslinie unter der vorderen
Oberkante, ab der jede Schar nach oben und unten abgemessen wird. Er wird
automatisch so weit abgesenkt, dass er die **letzte** senkrechte
Scharlinie noch schneidet – dort ist die Wange am niedrigsten. Ein
gewünschter Wert von 600 mm kann dadurch auf wenige Zentimeter
zusammenschrumpfen; die App sagt dann, warum. Das ist keine Panne,
sondern die Geometrie.

In der Tabelle heissen die beiden Scharkanten **vorne** (Richtung Front)
und **hinten** (Richtung Spitze) statt links/rechts. So bleiben die Zahlen
für beide Wangen gleich; nur die Zeichnung wird gespiegelt.

**Zuschnitt:** Jedes Stück bekommt an seinen eigenen Enden das Mass des
dort sitzenden Teils zugerechnet. Negative Masse ziehen ab, etwa −165 mm
je Seite bei einer Dila. An einer Ecke bekommen **beide** angrenzenden
Stücke das Mass – die Summe der Zuschnitte ist deshalb grösser als die
Gesamtlänge, das ist so gewollt.

Die Stückliste wird beim Speichern mit abgelegt. Ein einmal gedrucktes
PDF bleibt dadurch gleich, auch wenn später ein Katalogmass geändert wird.

---

## 7. Was offen ist

- **Firmen-Code und Registrierung.** Das Repo ist öffentlich, der Code
  steht lesbar in `index.html`. Die Selbstregistrierung ist zwar aus der
  App entfernt, aber `smart-action` liesse sich mit dem Code weiterhin
  direkt aufrufen. Sauber wird es erst, wenn die Funktion die Rolle prüft.
- **Einlaufblech-Einstellungen** hängen am Gerät (localStorage), nicht am
  Konto. Bewusst so: jeder soll eigene Werte haben. Nachteil: Wer das
  Gerät wechselt, fängt bei den Standardwerten an.
- **Module in Entwicklung** verstecken nur das Anlegen. Bereits
  gespeicherte Einträge bleiben für alle sichtbar.
- **Datensicherung** läuft von Hand über den Knopf in den Einstellungen.
  Ein automatischer Ablauf existiert nicht.
- Der **Ansichtspfeil** ist bei der Mauerabdeckung fest auf rechts, beim
  Freien Profil wählbar, bei den Einlaufblechen fest auf links.
- **Lukarne:** Die Zugaben für den Zuschnitt stehen standardmässig auf 0,
  der Zuschnitt entspricht dann genau dem gemessenen Mass. Ob die letzte,
  ganz schmale Schar an der Spitze den Hilfsriss wirklich braucht, ist
  offen – nimmt man sie von der Begrenzung aus, wird der Hilfsriss
  brauchbarer, die Zahlen ändern sich aber.

---

## 8. Kleine Merkposten

- Eingabefelder verlieren den Fokus, wenn beim Tippen die ganze Tabelle
  neu gezeichnet wird. Beim `input`-Ereignis darum nur die Auswertung
  auffrischen, nicht die Tabelle selbst.
- Eine leere Vorschlagsbox hinterlässt sonst einen feinen Strich quer
  über den Bildschirm – dagegen `.suggest:empty{display:none}`.
- Der Service Worker holt Dateien mit `cache: "reload"`, sonst liefert
  GitHub Pages bis zu zehn Minuten lang die alte Fassung.
- `sw.js` gehört in den Hauptordner, nicht nach `js/`. Ein Service Worker
  gilt nur für seinen eigenen Ordner und dessen Unterordner.
- Eine **neue Datei unter `js/`** muss zusätzlich in die `SHELL`-Liste in
  `sw.js`. Fehlt sie dort, lädt die App online sauber und offline nicht.
- Zeichnungen bekommen ihre Beschriftung mit `paint-order="stroke"` und
  weissem Rand hinterlegt, sonst verschwinden Zahlen auf Linien.
- Ein breiter Plan bekommt in der App feste Pixelbreite in einem Kasten
  mit `overflow-x:auto` (`.eb-diagram-scroll`), im PDF dagegen
  `width:100%`. Ohne das ist er entweder am Handy unlesbar klein oder auf
  dem Papier abgeschnitten.
