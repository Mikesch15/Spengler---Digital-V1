# Prototyp · Massaufnahme „Rinne Halbrund“

Weiterentwicklung des bestehenden Rinne-Halbrund-Moduls, **keine parallele
Zweitlösung**. Die gesamte Fachrechnung kommt unverändert aus
`js/12-rinne-halbrund.js` der laufenden App.

---

## 1. Wo der Prototyp liegt

    prototyp/
    ├── rinne-halbrund.html   Die Seite selbst
    ├── prototyp-rinne.js     Ablauf, Eingabe, Ableitungen, Ausmass
    ├── bruecke.js            stellt bereit, was js/12 beim Laden erwartet
    ├── prototyp.css          Darstellung (eigene Datei)
    ├── pruefstand-proto-rinne.js  86 Prüfungen in echtem Chromium
    └── README.md             dieses Dokument

Branch: `feature/prototype-rinne-halbrund`.

**An der laufenden App wurde nichts geändert.** `git diff main..HEAD` ausserhalb
von `prototyp/` ist leer – kein `js/`, kein `css/`, kein `index.html`, kein
`sw.js`, keine Supabase-Änderung, keine Migration.

## 2. Wie er zu starten ist

`prototyp/rinne-halbrund.html` im Browser öffnen – doppelklicken genügt,
es braucht keinen Server, keinen Login und kein Internet.

Auf dem Tablet/Handy: den Ordner `prototyp/` zusammen mit `css/` und
`js/12-rinne-halbrund.js` ablegen (die Seite lädt beide über relative Pfade)
und die Datei im Browser öffnen.

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
* **Abläufe / Einhangstutzen** – Position ab Start, Durchmesser, Fallrohr
  (bestehend / neu / unbekannt), Bemerkung.
* **Rinnenhalter** – Abstand und Anzahl, mit Vorschlag `Länge / Abstand + 1`,
  jederzeit überschreibbar.
* **Endstücke, Verbinder, Dehnung, Sonderteile.**
* **Verlaufsband** – der ganze Verlauf als gerades Band von START bis ENDE,
  mit Ecken (▲), Abläufen (● nummeriert, rot wenn ausserhalb) und
  Dehnungselementen (◆) an ihrer echten Position. Zum Prüfen auf dem Tablet
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
  Verbinder, Dehnungsstücke, Sonderteile) entsteht aus einer einzigen
  Ableitung. Nichts wird ein zweites Mal eingegeben, und jede Zeile nennt
  ihre Herkunft. Ändert sich die Aufnahme, ändert sich das Ausmass mit.
* **Bauteile, die es bisher gar nicht gab** – Halter, Abläufe, Endstücke,
  Verbinder, Sonderteile.
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
  bezeichnung, material, groesse, groesseFrei,
  gesamtlaengeManuell_mm,                 // freiwillig, nur zur Kontrolle

  // exakt die Struktur des bestehenden Moduls:
  segmente:[{laenge, linksTyp, rechtsTyp, winkel}],
  //   winkel < 0 = Aussenecke, > 0 = Innenecke, 0 = gerade weiter
  //   linksTyp/rechtsTyp werden aus dem Winkel gesetzt (AE90 = 2, IE90 = 3)

  ablaeufe:[{pos_mm, durchmesser, fallrohr, bemerkung}],
  halter:{anzahl, abstand_mm, typ},       // anzahl null = Vorschlag gilt
  endstuecke:{links, rechts},
  verbinder:{anzahl, bemerkung},
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

Prüfstand `proto-rinne.js` – **86 Prüfungen, alle bestanden**, in echtem
Chromium mit echter Bedienung (Tippen Zeichen für Zeichen, Auswählen,
Klicken). Enthält die fünf Testfälle des Auftrags:

| Testfall | Ergebnis |
|---|---|
| 1 · gerade Rinne 10 000 mm, Kupfer, RG 333 | 1 Dehnungselement bei 5 000 mm, 21 Halter, Ausmass 10.00 m, Zuschnitt 2 × 5 000 mm |
| 2 · 12 400 mm mit zwei Ecken (4850 / AE90 / 3200 / IE90 / 4350) | Ecken an 4 850 und 8 050 mm, als AE90/IE90 im Verlauf gesetzt, zwei Fixpunkte, je 1 Innen-/Aussenwinkel im Ausmass, 26 Halter |
| 3 · zwei Abläufe bei 4 800 und 9 200 mm | beide im Verlaufsband, Einhangstutzen Ø 100 und Ø 120 im Ausmass; ein Ablauf ausserhalb wird rot gemeldet |
| 4 · 4850 + 3200 + 4250 gegen Gesamtlänge 12 400 | genau eine Warnung mit beiden Werten und der Differenz +100 mm, Aufnahme bleibt speicherbar |
| 5 · Massaufnahme kopieren | eigene ID, alles übernommen, Änderung an der Kopie lässt das Original unberührt |

Dazu: Bildschirmbreiten 320 / 360 / 412 / 768 / 1280 px über alle sechs
Schritte ohne seitliches Scrollen, keine JS-Fehler, alle Knöpfe ≥ 34 px hoch.

**Gegenproben** (jede baut einen Fehler ein und muss den Prüfstand
umwerfen): Ecke setzt keinen Anschlusstyp → 3 Fehlschläge · Halter fehlen im
Ausmass → 1 · Kopie behält die ID → 2 · Tippen zeichnet neu (Fokusverlust)
→ 5 · keine Differenzwarnung → 4.

**Nicht getestet:** Der Prototyp wurde nicht auf einem echten Handy oder
Tablet bedient und nicht mit einer echten Baustellenaufnahme gegengerechnet.
Beides ist der nächste Schritt.
