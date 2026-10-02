# Plan: Die alte Lagerverwaltung abschaffen

Entscheidung des Anwenders, 02.10.2026: „die alte Lagerverwaltung wird
abgeschafft" — und: „erst einen Plan, dann entscheiden". **Heute wird nichts
gelöscht.** Altdaten später „weg, sauber löschen" (seine Wahl).

Alle Zahlen hier sind am 02.10.2026 an der Produktionsdatenbank gemessen,
nicht geschätzt.

---

## 1 · Zuerst: zwei Dinge heissen fast gleich

Das ist die wichtigste Unterscheidung des ganzen Plans. Ich habe sie selbst
zuerst verwechselt.

| | Datei | Tabelle | Was es ist |
|---|---|---|---|
| **Lagerverwaltung** | `js/68-lagerverwaltung.js` (2063 Zeilen, 75 Funktionen) | `lager_varianten`, `lagerbestand_bewegungen` | Produkte je Regie-Position, Barcode, Ein-/Ausscannen, Bewegungen, Archiv. **Das soll weg.** |
| **Materialbestand** | `js/59-lagerbestand.js` | — (liest `materials`) | Bleche mit Stärke, Ausführung, Rolle/Tafel, Tafelmass; `lagArtikelListe()`, `lagFormate()`. **Das bleibt.** Trotz des verwirrenden Dateinamens ist das nicht die Lagerverwaltung. |

**Der Zuschnitt hängt nicht an der alten Lagerverwaltung.** Die Blechformate
sind Spalten auf `materials` (`staerke_mm`, `ausfuehrung`, `form`,
`laenge_mm`, `breite_mm`); `artikelFormat()` in js/01 liest `materialFormate`,
nicht `lagerbestand`. Gemessen und gegengeprüft.

---

## 2 · Was in den Tabellen wirklich liegt

| Tabelle | Zeilen | Zustand |
|---|---|---|
| `lager_varianten` | **381** | je Regie-Position automatisch eine, erzeugt vom Trigger `lager_standard_variante` auf `materials`. **1 mit Barcode.** |
| `lagerbestand_bewegungen` | **8** | Buchungen |
| `lagerbestand` | **6** | alle `menge = 0`, alle Blech |

**Befund: `lagerbestand` ist bereits totes Gewicht.** js/05 lädt die Tabelle
in die Variable `lagerbestand` — die zur Laufzeit **niemand** liest
(`js/01:542` deklariert sie, sonst nur Kommentare und ein Sprungziel).
Der Materialbestand-Bildschirm schreibt längst nur `materials`. Zugriffe gibt
es nur noch in `js/74` (Beispielkatalog-Migration) und `js/75` (Kontrollen
lesen `artikel_id`).

**Nicht betroffen, geprüft:** `material_reservierungen` (13 Zeilen, js/50) und
`reststuecke` (2 Zeilen, js/42) zeigen auf `materials`, nicht auf die alten
Lagertabellen.

---

## 3 · Die eine echte Fähigkeit, die verschwindet

**`📤 Ab Lager ausbuchen`** aus einer Massaufnahme (`index.html:1971`,
umgesetzt in js/68, bucht in `lagerbestand_bewegungen`).

Das neue Lieferanten-Lager kann das **nicht** ersetzen: es führt 439
Handelsartikel von B-Team, kein Blech, und es ist bewusst von der
Werkstoff-Kette getrennt (`measurement_materials` → Massaufnahme → Berechnung
→ Zuschnitt). Blech kommt im B-Team-Sortiment nicht vor.

**Das ist die offene Frage, die vor dem ersten Löschen beantwortet sein
muss** (Abschnitt 6).

---

## 4 · Was alles daran hängt — vollständige Liste

**Oberfläche (`index.html`)**
- Einstellungen-Abschnitt `lagerverwaltungSection` (Zeile 2846/2847)
- Dialog „Bewegung buchen" (Zeile 982)
- Dialog „Neues Produkt erfassen" (Zeile 1023)
- Knopf `measLagerAusbuchen` (Zeile 1971)
- Script-Tag `js/68-lagerverwaltung.js`

**App-Hülle**
- `sw.js`: Eintrag `js/68-lagerverwaltung.js` in der Shell-Liste

**Andere Module**
- `js/82` (Lieferanten-Lager): Barcode-Rückfall über `lagerVarianteZuBarcode`
  → entfällt; betrifft **1** Barcode
- `js/75` (Kontrollen): Prüfung `position-ohne-produkt` beruht auf
  `lager_varianten` → wird bedeutungslos, muss **weg**. Drei weitere
  Prüfungen benutzen `abschnitt:"lagerbestand"` nur als **Sprungziel** →
  umhängen
- `js/73` (Einrichtung): Pflichtpunkt `bleche` benutzt `tab:"lager",
  abschnitt:"lagerbestand"` als Sprungziel. **Der Punkt selbst ist sicher** —
  `einrBlecheEcht()` liest `lagFormate()` aus `materials`
- `js/74` (Beispielkatalog): Migration schreibt `lagerbestand` und
  `lager_varianten` → Zugriffe entfernen

**Datenbank**
- Tabellen `lager_varianten`, `lagerbestand_bewegungen`, `lagerbestand`
- Trigger `lager_standard_variante_trg` auf `materials` samt Funktion
  (sie erzeugt je neuer Position automatisch eine Variante)
- Trigger `enforce_lager_firma`, `enforce_lager_variante_firma`,
  `enforce_lager_bewegung_firma` samt Funktionen
- RLS-Policies der drei Tabellen

**Hilfe und Anleitung**
- Hilfe-Themen `lagerverwaltung`, `lager-suche`, `meas-lager-ausbuchen`,
  und `lagerbestand` prüfen (letzteres beschreibt den **Materialbestand** und
  bleibt)
- Anleitung: 14 Stellen nennen „Lagerverwaltung"

**Prüfstände** — der grösste Posten
- `pruefstand-lagerverwaltung-v3-98.js`: **284 Prüfungen**
- `pruefstand-lager-ansicht-v3-220.js`
- Teile in `blechformat-v3-177`, `gemeinsamer-dialog-v3-138`,
  `kontrollen-v3-186` (Abschnitt L), `lieferanten-lager-v3-231`
  (Abschnitt A prüft, dass js/82 die alten Tabellen **nicht** anfasst — das
  wird gegenstandslos), `position-vorschlag-v3-136`

---

## 5 · Reihenfolge, damit die App nie zwischendurch kaputt ist

1. **Entscheidung zu „Ab Lager ausbuchen"** (Abschnitt 6) — blockierend.
2. **Oberfläche abhängen**: Einstellungen-Abschnitt, die zwei Dialoge, der
   Massaufnahme-Knopf. Danach ist die Lagerverwaltung nicht mehr erreichbar,
   aber noch vollständig vorhanden — **jederzeit rückholbar**.
3. **Fremde Abhängigkeiten lösen**: Barcode-Rückfall in js/82, Kontrolle
   `position-ohne-produkt` samt Abschnitt L im Kontrollen-Prüfstand, die drei
   Sprungziele, js/74.
4. **Modul entfernen**: js/68, Script-Tag, Shell-Liste in sw.js.
5. **Prüfstände**: `lagerverwaltung-v3-98` und `lager-ansicht-v3-220` gehen
   mit dem Modul. Die Teile in den fünf anderen Prüfständen umstellen, nicht
   löschen.
6. **Hilfe, Anleitung, Was-ist-neu, PROJECT_STATE**, Version, Anleitung neu
   erzeugen.
7. **Zuletzt die Datenbank**: Trigger, dann Policies, dann Tabellen. Erst
   wenn Schritte 2–6 eine Version lang im Betrieb standen.

Schritte 2–6 sind eine Version. Schritt 7 ist eine zweite, bewusst später.

---

## 6 · Was ich von dir brauche, bevor etwas gelöscht wird

**Die blockierende Frage: `📤 Ab Lager ausbuchen` aus einer Massaufnahme.**

- **Weg, ohne Ersatz** — du buchst Blech nicht ab Lager aus. Dann ist der Rest
  geradeaus.
- **Ersatz bauen** — dann baue ich das Ausbuchen von **Blech** auf eine
  Grundlage, die bleibt. Das ist eine eigene Version und mehr Arbeit als die
  ganze Abschaffung.

**Zweitens, kleiner:** der Einstellungen-Abschnitt heisst heute
„🏭 Lagerverwaltung", der andere „Materialbestand". Wenn der erste weg ist,
wäre „Material & Blech" als Name für den zweiten klarer. Deine Entscheidung.

---

## 7 · Was unwiederbringlich ist

- **Schritt 7** (Tabellen und Trigger). Besonders
  `lager_standard_variante_trg`: er erzeugt je Regie-Position automatisch eine
  Variante. Ist er weg und die Tabelle gelöscht, lässt sich der Zustand nur
  durch erneutes Ableiten über alle 381 Positionen herstellen.
- **8 Buchungen und 1 Barcode** — deine Wahl: weg, sauber löschen.
- **`pruefstand-lagerverwaltung-v3-98.js` mit 284 Prüfungen.** Er hält die
  Zusagen eines Moduls fest, das es danach nicht mehr gibt. Er geht mit dem
  Modul; das ist der eine Fall, in dem „Prüfstände nicht einfach löschen"
  nicht greift — es gibt nichts mehr zu prüfen. Was **weiterhin** gilt (etwa
  Blechformate, gemeinsamer Dialog), steht in den anderen fünf Prüfständen und
  wird dort umgestellt, nicht gelöscht.

---

## 8 · Was der Plan ausdrücklich NICHT tut

- `materials` (die Regie-Liste) anfassen. Sie ist die Grundlage der
  Verrechnung und bleibt unberührt.
- `js/59-lagerbestand.js` (Materialbestand/Blechformate) anfassen.
- Die Werkstoff-Kette anfassen: `measurement_materials` → Massaufnahme →
  Berechnung → Zuschnitt.
- `material_reservierungen` oder `reststuecke` anfassen.
