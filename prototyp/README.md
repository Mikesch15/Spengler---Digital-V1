# Prototyp · Massaufnahme „Rinne Halbrund“

Weiterentwicklung des bestehenden Rinne-Halbrund-Moduls, **keine parallele
Zweitlösung**. Die gesamte Fachrechnung kommt unverändert aus
`js/12-rinne-halbrund.js` der laufenden App.

---

## 1. Wo der Prototyp liegt

    prototyp/
    ├── rinne-halbrund-testapp.html   ← DIESE Datei öffnen (alles in einer)
    ├── rinne-halbrund.html           Mehrdatei-Fassung zum Weiterentwickeln
    ├── prototyp-rinne.js             Ablauf, Eingabe, Ableitungen, Ausmass
    ├── bruecke.js                    stellt bereit, was js/12 beim Laden braucht
    ├── prototyp.css                  Darstellung
    ├── bauen.js                      baut die Testapp aus den Einzeldateien
    ├── pruefstand-proto-rinne.js     112 Prüfungen in echtem Chromium
    └── README.md                     dieses Dokument

Branch: `feature/prototype-rinne-halbrund`.

**An der laufenden App wurde nichts geändert.** `git diff main..HEAD` ausserhalb
von `prototyp/` ist leer – kein `js/`, kein `css/`, kein `index.html`, kein
`sw.js`, keine Supabase-Änderung, keine Migration.

## 2. Wie er zu starten ist

**`prototyp/rinne-halbrund-testapp.html` doppelklicken.** Das ist eine
einzige, eigenständige Datei – sie enthält alles: Darstellung, Bedienung und
die Fachrechnung. Kein Server, kein Login, kein Internet, keine weiteren
Dateien.

Auf dem Tablet oder Handy genügt es, genau diese eine Datei dorthin zu
schicken (E-Mail, Cloud, Kabel) und sie im Browser zu öffnen.

Gebaut wird sie mit `node prototyp/bauen.js` aus den Einzeldateien. Wer am
Prototyp weiterarbeitet, ändert `prototyp-rinne.js` bzw. `prototyp.css` und
lässt danach `bauen.js` laufen – `rinne-halbrund-testapp.html` wird dabei
überschrieben und ist deshalb nicht von Hand zu bearbeiten.
`prototyp/rinne-halbrund.html` ist die gleichwertige Mehrdatei-Fassung; der
Prüfstand vergleicht beide.

`bauen.js` prüft nach dem Einbetten selbst nach, dass `js/12-rinne-halbrund.js`
zeichengenau dem Original entspricht – sonst bricht es ab.

Gespeichert wird ausschliesslich im lokalen Speicher **dieses einen Browsers**
(Schlüssel `sd_prototyp_rinne_halbrund`). Es geht nichts an Supabase, es wird
nichts hochgeladen, und es werden keine Daten einer Firma berührt.

## 3. Übernommen aus dem bestehenden Modul (unverändert)

`js/12-rinne-halbrund.js` wird als Datei geladen, nicht nachgebaut.
Dadurch rechnet der Prototyp nachweislich mit derselben Fachlogik:

| Funktion | Was sie leistet |
|---|---|
| `calcRinneSegment()` | Zuschnitt je Abschnitt inkl. Anschlussmasse |
| `computeRinneBoundaries()` | Fixpunkte und Schiebestutzen im Verlauf |
| `calcDilaPositionsInStretch()` | Verteilung der Dehnungselemente |
| `calcRinneDilas()` | Dehnungselemente über den ganzen Verlauf |
| `berechneRinneStueckliste()` | Stückliste zwischen allen Grenzpunkten |
| `generateRinneGrundriss()` | massstäbliche Grundriss-Zeichnung |
| `rinneMaterialTabelle()` | Ausdehnungswerte je Material |

Ebenso übernommen: die Datenstruktur des Verlaufs
(`{laenge, linksTyp, rechtsTyp, winkel}`), der Anschlusstyp-Katalog
(`rinne_fitting_types`) und der Materialkatalog (`measurement_materials`) –
im Prototyp mit den echten Werten aus der Produktivdatenbank, damit ohne
Supabase getestet werden kann.

`bruecke.js` stellt nur bereit, was `js/12` beim Laden erwartet (`$`, `esc`,
die zwei Kataloge, `rinneDilaMass`). Die unsichtbaren Elemente im Block
`#p-stummel` in der HTML-Datei sind ebenfalls nur Aufhänger für diese Datei –
sie werden nie bedient.

## 4. Neu entwickelt

* **Ablauf in sechs Schritten** – Grunddaten · Verlauf · Komponenten ·
  Fotos & Skizze · Kontrolle · Ausmass & Material.
* **Grunddaten** – Bezeichnung, Material, Rinnengrösse (RG 200 … RG 500 oder
  frei), optionale gemessene Gesamtlänge zur Kontrolle.
* **Ecken ohne Fachwissen** – der Benutzer wählt nur „Aussenwinkel“ oder
  „Innenwinkel“. Der Prototyp setzt daraus selbst den Anschlusstyp AE90/IE90
  des bestehenden Katalogs; dadurch wirkt die Ecke automatisch als Fixpunkt
  in der Dila-Rechnung und bringt ihr Zuschlagsmass in die Stückliste.
* **Einhängestutzen** – Position ab START, Durchmesser, Anzahl, Fallrohr
  (bestehend / neu / unbekannt), Bemerkung. **Er ist ein Fixpunkt** und teilt
  die Dilatationsberechnung an seiner Position, siehe Punkt 5.
* **Schiebestutzen** – dieselben Felder. Er ist **kein** Fixpunkt und hat
  nachweislich keinen Einfluss auf die Dilatationsberechnung; er wird nur
  erfasst, angezeigt und im Ausmass ausgegeben.
* **Rinnenhalter** – Abstand und Anzahl, mit Vorschlag `Länge / Abstand + 1`,
  jederzeit überschreibbar.
* **Endstücke, Dehnung, Sonderteile.**
* **Verlaufsband** – der ganze Verlauf als gerades Band von START bis ENDE,
  mit Ecken (▲), Einhängestutzen (runde Marke **E**, mit Strich durch die
  Rinne und der Beschriftung **FIX**), Schiebestutzen (eckige violette Marke
  **S**, ohne Strich) und Dehnungselementen (◆) an ihrer echten Position;
  alles, was ausserhalb der Rinne läge, wird rot. Zum Prüfen auf dem Tablet
  in einem Blick; der massstäbliche Grundriss bleibt daneben unverändert.
* **Plausibilitätsprüfung** – negative Längen, Winkel ausserhalb ±180°,
  Ablauf ausserhalb der Rinne, auffällig kurze/lange Rinne, Abweichung
  zwischen gemessener Gesamtlänge und Summe der Abschnitte.
* **Zusammenfassung** auf einem Bildschirm.
* **Ausmass und Materialübersicht** – automatisch, siehe Punkt 5.
* **Fotos und Skizze** – Foto aufnehmen/wählen (verkleinert gespeichert),
  Skizze mit dem Finger zeichnen.
* **Lokal speichern, öffnen, löschen und kopieren.**

## 5. Verbessert gegenüber dem bestehenden Modul

* **Aufnehmen statt Rechnen bedienen.** Bisher trägt man Segmente mit
  Anschlusstypen und Winkeln in eine Tabelle ein – das setzt voraus, dass man
  weiss, welches Formteil ein Fixpunkt ist. Neu erfasst man den Verlauf so,
  wie man ihn abschreitet: Länge, Ecke, Länge. Die Formteile setzt der
  Prototyp selbst.
* **Ecken sind nicht mehr doppelt zu pflegen.** Im bestehenden Modul stehen
  Winkel und Anschlusstyp in getrennten Spalten und können auseinanderlaufen.
  Neu gibt es eine Auswahl, aus der beides erzeugt wird.
* **Das Ausmass ist die Massaufnahme.** Jede Position (Rinne in Metern,
  Halter, Innen-/Aussenwinkel, Einhangstutzen je Durchmesser, Endstücke,
  Dehnungsstücke, Sonderteile) entsteht aus einer einzigen
  Ableitung. Nichts wird ein zweites Mal eingegeben, und jede Zeile nennt
  ihre Herkunft. Ändert sich die Aufnahme, ändert sich das Ausmass mit.
* **Der Einhängestutzen wirkt fachlich richtig, ohne eine zweite
  Fixpunktlogik.** Das bestehende Modul kennt Fixpunkte nur als Anschlusstyp
  an einer Segmentgrenze. Der Prototyp erzeugt deshalb eine abgeleitete
  Segmentliste **nur für die Rechnung**: er teilt den Abschnitt an der
  Stutzenposition und setzt dort beidseitig den vorhandenen Katalogeintrag
  „Ablaufstutzen" (id 4, `is_fixpunkt`, Zuschlagsmass 0 mm). Die vorhandene
  Regel greift damit unverändert, der Verlauf des Benutzers bleibt, wie er
  ist, und die Gesamtlänge verschiebt sich nicht.
* **Der Schiebestutzen kann die Rechnung strukturell nicht beeinflussen.**
  Er kommt in `segmenteFuerRechnung()` überhaupt nicht vor. Das hängt nicht
  an Sorgfalt beim Programmieren, sondern daran, dass es die Stelle nicht
  gibt, an der er einfliessen könnte. (Der Katalog führt ihn zwar als
  `is_schiebestutzen`, was im bestehenden Modul eine Grenze erzeugen würde –
  genau deshalb wird er bewusst nicht eingesetzt.)
* **Bauteile, die es bisher gar nicht gab** – Halter, Einhänge- und
  Schiebestutzen, Endstücke, Sonderteile.
* **Fehler werden gemeldet, bevor sie ins Büro gehen**, statt erst dort
  aufzufallen.
* **Für die Baustelle bedienbar** – ein Feld je Zeile, grosse Zahlenfelder,
  Knöpfe über die volle Breite, ab 320 px Bildschirmbreite ohne seitliches
  Scrollen. Ein Zahlenfeld markiert beim ersten Antippen seinen ganzen Inhalt:
  wer ein Mass korrigiert, ersetzt es, statt versehentlich davor zu tippen.
* **Materialübersicht bewusst ohne Artikelnummern und Preise** – die kommen
  später aus der Materialliste der jeweiligen Firma.

## 6. Datenstruktur

```js
{
  id, typ:"rinne_halbrund", erstellt, geaendert,
  bezeichnung, material,
  groesse:"200"|"250"|"330"|"400"|"ohne", // genau diese fünf, nichts Freies
  gesamtlaengeManuell_mm,                 // freiwillig, nur zur Kontrolle

  // exakt die Struktur des bestehenden Moduls:
  segmente:[{laenge, linksTyp, rechtsTyp, winkel}],
  //   winkel < 0 = Aussenecke, > 0 = Innenecke, 0 = gerade weiter
  //   linksTyp/rechtsTyp werden aus dem Winkel gesetzt (AE90 = 2, IE90 = 3)

  // beide Stutzenarten gleich aufgebaut, Position immer ab START:
  einhaengestutzen:[{pos_mm, durchmesser, anzahl, fallrohr, bemerkung}], // FIXPUNKT
  schiebestutzen:  [{pos_mm, durchmesser, anzahl, fallrohr, bemerkung}], // kein Fixpunkt
  halter:{anzahl, abstand_mm, typ},       // anzahl null = Vorschlag gilt
  endstuecke:{links, rechts},
  dehnung:{art:"keine"|"dehnungsstueck", anzahl},
  sonderteile:[{bezeichnung, anzahl, bemerkung}],
  fotos:[dataURL], skizze:dataURL|null, bemerkung
}
```

Gesamtlänge, Ecken, Dehnungselemente, Stückliste, Ausmass und
Materialübersicht sind **abgeleitet** und stehen nicht in den Daten – sie
können deshalb nicht veralten.

Beim späteren Einbau in die App passt das ohne Schemaänderung in
`measurements.data` (jsonb) mit `type:"rinne_halbrund"`; die Felder
`segmente`, `material` und die Dila-Ergebnisse haben dort bereits ihren Platz.

## 7. Noch offen

* **Nicht in die App eingebaut.** Der Prototyp ist eine eigene Seite. Der
  Einbau (Projektzuordnung, Supabase, Rechte, PDF, Verlauf/Audit, Offline)
  ist bewusst nicht Teil dieser Runde.
* **Fotos im lokalen Speicher.** Sie werden auf 1280 px verkleinert
  gespeichert. Der Browser-Speicher fasst nur wenige Megabyte – nach etwa
  15–25 Fotos ist er voll und das Speichern meldet einen Fehler. In der App
  gehen die Bilder wie gehabt in den privaten Supabase-Speicher.
* **Nur der 90°-Winkel ist ein Formteil.** Der Katalog kennt AE90 und IE90.
  Ein anderer Winkel wird gezeichnet und gerechnet, verwendet aber die Werte
  des 90°-Winkels. Der Prototyp sagt das an der Ecke ausdrücklich.
* **Halterabstand** ist eine freie Eingabe mit Vorgabe 500 mm; eine
  Regel je Material/Grösse gibt es noch nicht.
* **Dehnungsstücke** werden nicht automatisch gesetzt: die berechnete Anzahl
  wird angeboten, übernehmen muss man sie selbst. Das ist Absicht – ob ein
  Dehnungsstück oder ein Schiebestutzen eingebaut wird, entscheidet der
  Spengler.
* **Anzahl beim Stutzen.** Ein Stutzen hat genau eine Position. Eine Anzahl
  grösser 1 zählt im Ausmass mit, erzeugt aber nur **einen** Fixpunkt – für
  mehrere Stutzen an verschiedenen Stellen gehören mehrere Einträge angelegt.
* **Nur der 90°-Fixpunkt ist im Katalog hinterlegt.** Für den
  Einhängestutzen verwendet der Prototyp den vorhandenen Eintrag
  „Ablaufstutzen“ (id 4). Bekommt der Einhängestutzen später einen eigenen
  Katalogeintrag mit eigenem Zuschlagsmass, ist das eine Zeile in
  `prototyp-rinne.js` (`EINHAENGE_FITTING_ID`).
* **Kein PDF, kein Druck.** Die Zusammenfassung ist für den Bildschirm.
* **Keine Mehrfachauswahl von Rinnen**, kein Kopieren einzelner Abschnitte.

## 8. Empfehlungen nach dem ersten Test

1. **Zuerst mit einem echten Aufmass gegenprüfen.** Eine Rinne, die schon
   verrechnet ist: stimmen Meter, Halterzahl, Winkel und Stutzen mit dem
   überein, was tatsächlich bestellt wurde? Erst danach weiterbauen.
2. **Halterabstand als Firmeneinstellung**, nicht als freie Eingabe je
   Aufnahme – jeder Betrieb hat da seine feste Regel.
3. **Rinnengrössen aus dem Materialkatalog** statt aus einer festen Liste,
   sobald der Prototyp in die App wandert.
4. **Ablaufposition auch antippbar** statt nur als Zahl: auf dem Verlaufsband
   die Stelle antippen und den Wert danach feinjustieren.
5. **Sonderteile aus einer Vorschlagsliste** der zuletzt verwendeten
   Bezeichnungen – „Kesselblech Sonderform“ tippt man sonst jedes Mal neu.
6. **Foto direkt bei der Stelle**, an der es aufgenommen wurde (Abschnitt
   oder Ablauf), statt in einem gemeinsamen Bereich.
7. **Weitere Winkel im Katalog** (135°, 45°), sobald klar ist, welche
   Formteile der Lieferant tatsächlich führt.
8. **Skizze auf dem Grundriss** statt auf einer leeren Fläche – der berechnete
   Verlauf als Hintergrund, darauf von Hand ergänzen.

---

## Getestet

Prüfstand `prototyp/pruefstand-proto-rinne.js` – **112 Prüfungen, alle
bestanden**, in echtem Chromium mit echter Bedienung (Tippen Zeichen für
Zeichen, Auswählen, Klicken). Geprüft wird die eigenständige Testapp, also
genau die Datei, die geöffnet wird; zusätzlich, dass die Mehrdatei-Fassung
dasselbe liefert.

| Testfall | Ergebnis |
|---|---|
| 1 · gerade Rinne 10 000 mm ohne Stutzen | ein Dehnungselement bei 5 000 mm, keine Fixpunkte, Zuschnitt 2 × 5 000 mm |
| 2 · Einhängestutzen bei 5 000 mm | Rinne wird für die Rechnung dort geteilt, beidseitig Anschlusstyp id 4, `computeRinneBoundaries()` meldet einen Fixpunkt, **zwei** Dehnungselemente bei 2 500 und 7 500 mm, Gesamtlänge unverändert |
| 3 · Schiebestutzen bei 5 000 mm | keine Teilung, Anschlusstyp id 7 kommt in der Rechnung nicht vor, keine Grenze, Dehnungselemente **identisch** zur Rinne ohne Stutzen – trotzdem im Ausmass |
| 4 · Einhängestutzen 3 000 + Schiebestutzen 7 000 | nur bei 3 000 mm geteilt, genau ein Fixpunkt, ein Dehnungselement bei 6 000 mm; ohne den Schiebestutzen dasselbe Ergebnis |
| 5 · Rinnengrössen | genau fünf: 200 / 250 / 330 / 400 mm und „ohne RG“; kein 280, 333, 500, nichts Freies; bei „ohne RG“ steht die Grösse in keiner Bezeichnung |
| 6 · Verbinder | in keinem der sechs Schritte, in keinem Element, nicht in den Daten, nicht im Ausmass, nicht in der Materialübersicht, nicht in der Zusammenfassung |

Dazu: Plausibilität (negative Position, Position ausserhalb, Anzahl 0 –
für beide Stutzenarten), Stutzen genau auf einer Segmentgrenze und am
START, Anzahl > 1 zählt im Ausmass mit, aber nur als **ein** Fixpunkt,
Ecken bleiben Fixpunkte, Stutzen auf einer Ecke erzeugt keinen doppelten
Fixpunkt, alte gespeicherte Aufnahmen werden übernommen (RG 333 → 330 mm,
Abläufe → Einhängestutzen, Verbinder verschwinden), Kopieren,
Längendifferenz-Warnung, Fokusverhalten beim Tippen, Bildschirmbreiten
320 / 360 / 412 / 768 / 1280 px über alle sechs Schritte ohne seitliches
Scrollen, alle Knöpfe ≥ 34 px hoch, keine JS-Fehler.

**Gegenproben** (jede baut einen Fehler ein und muss den Prüfstand
umwerfen): Einhängestutzen nicht als Fixpunkt → 12 Fehlschläge ·
Schiebestutzen fälschlich als Fixpunkt → 10 · RG 333 und freie Grösse
wieder angeboten → 4 · Verbinder wieder im Ausmass → 4 · Position
ausserhalb nicht mehr geprüft → 2.

**Nicht getestet:** Der Prototyp wurde nicht auf einem echten Handy oder
Tablet bedient und nicht mit einer echten Baustellenaufnahme
gegengerechnet. Beides ist der nächste Schritt.
