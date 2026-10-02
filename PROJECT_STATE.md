# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.253`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.253 — „Materialbestand" heisst „Material & Blech"

Seine Entscheidung auf die offene Frage aus v3.251: „Ja umbenennen."

- Abschnitt **„Materialbestand" → „Material & Blech"** (index.html, Hilfe-Thema
  `lagerbestand`, 20 Stellen in der Anleitung)
- Register **„Lager" → „Blech"**. Darin stehen nur noch Material & Blech und
  Reststücke; ein Register namens „Lager", das nicht das Lager ist, wäre
  genau die Verwechslung zurück, die v3.251 aufgeräumt hat. Nicht gefragt,
  sondern entschieden und gesagt — es ist eine Beschriftung, ein Wort zurück.
- Umbenannt sind **nur Beschriftungen**. Die Schlüssel bleiben
  (`data-settings-tab="lager"`, `data-section="lagerbestand"`, Hilfe-Schlüssel
  `lagerbestand`, `tab:"lager"` in js/73 und js/75) — sie stehen in
  Sprungzielen und gespeicherten Zuständen.

**Dabei gefundener Fehler, mitbehoben:** fünf Hilfetexte und Feldhinweise
nannten den Weg „Einstellungen → **Allgemein** → Materialbestand". Dort war
der Abschnitt nie — er liegt im Register daneben. Wer dem Text folgte, suchte
am falschen Ort. Jetzt steht überall „Einstellungen → Blech → Material &
Blech" (js/61, js/42, js/33, js/29, js/41).

**Nicht angefasst:** `js/67-was-ist-neu.js` (10 Stellen) und
`CHANGELOG_HISTORIE.md` (27). Sie beschreiben, was in 3.98 bis 3.181 wahr war
— sie umzuschreiben wäre keine Umbenennung, sondern eine Fälschung der
Historie. Dasselbe gilt für zwei Hilfe-Stellen, die ausdrücklich „bis Version
3.175" sagen, und 35 Code-Kommentare, die den alten Namen in ihrer
Entstehungsgeschichte nennen.

### v3.252 — nachgezogen: das Lager als Bereich der Ansicht

Die volle Regression nach dem Veröffentlichen von v3.251 meldete **fünf
Fehlschläge**, alle dieselbe Ursache: der Lager-Knopf führt jetzt nach
`liefModal`, und dieser Schirm war nirgends als **Bereich** der Ansicht 2
eingetragen. Vorher stand dort `settingsModal`, das beides war.

- `A2_BEREICHE` (js/70) kannte `liefModal` nicht → das „‹ Zurück" oben wusste
  nichts davon; wer den Schirm über seinen eigenen Knopf schloss, hatte einen
  Zurück-Knopf ohne Wirkung (`zurueck-oben-v3-175`, D1)
- die Rahmen-Regel in `css/05-ansicht2.css` kannte ihn nicht → er legte sich
  mit z-index 500 über die untere Leiste. Genau der Fehler von v3.155, nur an
  einem neuen Schirm (`bereiche-v3-156` A4, `startknopf-v3-159` D2)

Beides eingetragen. Drei weitere Fehlschläge waren Prüfstände, die den
**alten** Lager-Bereich beschrieben; sie sind umgestellt, nicht gelöscht:

- `bereiche-v3-156` A5/A5b prüften den Ausschnitt `a2-nur-lager`, der in den
  Einstellungen die Registerleiste wegschnitt. Jetzt wird direkter gemessen:
  es sind gar keine Einstellungen mehr im Spiel (A5/A5b/A5c)
- `admin-und-lager-v3-163` A2 war die Gegenprobe „im Lager-Bereich ist die
  Lagerverwaltung da". Jetzt: dort steht das Lieferanten-Lager mit seinen vier
  Arbeitsteilen — und A1c hält fest, dass der Abschnitt gar nicht mehr im
  Dokument steht, nicht bloss ausgeblendet ist
- `cockpit-zurueck-v3-11`: „lager" aus der Soll-Liste der Cockpit-Abschnitte,
  mit Gegenprobe, dass Karte, Ladefunktion und Hilfe-Knopf wirklich weg sind

**Was daraus zu lernen war:** die Schnellprüfung deckte die geänderten Module
ab, aber nicht die Ansicht-2-Mechanik, die an einem *ausgetauschten Schirm*
hängt. Bei einem Umzug von einem Schirm auf einen anderen gehören die
Bereichs-Prüfstände künftig in die Schnellprüfung.

### v3.251 — die alte Lagerverwaltung ist abgeschafft (Schritte 2–6)

Ansage des Anwenders: „die altr lagerverwaltung wird abgeschafft", dazu „erst
einen Plan, dann entscheiden", für die Altdaten „weg, sauber löschen" und zum
Ausbuchen aus einer Massaufnahme: „Nein, brauche ich nicht, mach weiter."

Der durchgerechnete Plan steht in **`PLAN_Lagerverwaltung_abschaffen.md`**.
Umgesetzt sind die Schritte **2 bis 6**. **Schritt 7 (die Datenbank) ist
bewusst nicht Teil dieser Version** — die Tabellen, Trigger und Policies
stehen unverändert da. Das ist die Reihenfolge, die der Plan vorgibt: solange
noch etwas auffallen kann, soll nichts unwiederbringlich sein.

**Was weg ist**

- `js/68-lagerverwaltung.js` (2063 Zeilen), sein Script-Tag, sein Eintrag in
  der App-Shell (`sw.js`), der Einstellungen-Abschnitt, die zwei Dialoge
- `📤 Material ab Lager ausbuchen` aus der Massaufnahme (`measLagerModal`)
- die Projekt-Karte `📦 Material ab Lager` (`cockpitLagerCard`, js/24) — **im
  Plan nicht aufgeführt, beim Umsetzen gefunden**
- Kontrolle `position-ohne-produkt` (js/75) — ihre Grundlage ist weg
- der Barcode-Rückfall in js/82 (betraf **1** Barcode) samt dem Zweig
  `quelle!=="lieferant"` in `lfScanVerbrauch`
- 4 Hilfe-Themen, der Anleitungs-Abschnitt, der doppelte „Mehr"-Eintrag
- die `a2-nur-lager`-Regeln in `css/05-ansicht2.css`

**Was umgezogen ist statt mitzugehen**

| Fähigkeit | von | nach |
|---|---|---|
| EDV-Nr., Nummerngruppen-Erkennung, Positionsvorschlag | js/68 | **`js/83-katalog-position.js`** (neu) |
| Dialog „Neue Materialposition anlegen" | js/68 | js/83 + `katalogPositionModal` |
| Warntext beim Löschen einer Katalogposition | js/68 | js/83, gerufen von js/08 |
| Recht „Lager" (`checkLagerZugriff`) | js/68 | js/82 |
| Startweg des Lager-Knopfs | js/68 (Einstellungen) | js/82 (`lfOeffnen`) |

Die Funktionsnamen beginnen weiterhin mit `lager…`. Sie werden von js/08,
js/59 und vier Prüfständen unter diesen Namen gerufen; sie beim Umzug
umzubenennen wäre eine zweite, rein kosmetische Änderung im selben Schritt.
Ein Umbenennen bleibt als eigener, kleiner Schritt offen.

**Zwei echte Fehler, beim Umsetzen gefunden und behoben**

1. **Das Löschen im Material-Katalog warnte zu wenig.** Es fragte nur „Dieses
   Material wirklich löschen?". Die ausführliche Warnung — bei einem Blech geht
   das *Format* mit, der Zuschnitt rechnet danach nicht mehr mit diesem Blech,
   Reststücke verlieren ihre Zuordnung — gab es nur auf dem Weg über die
   Lagerverwaltung, den fast niemand ging. Sie hängt jetzt an der Löschung
   selbst (`pruefstand-blechformat-v3-177`, E2b–E2d).
2. **Die Kontrolle „Katalogposition, die nie vorkam" war blind.** Sie galt eine
   Position als benutzt, sobald es ein `lager_varianten`-Produkt dazu gab — und
   der Trigger `lager_standard_variante_trg` legt zu *jeder* Position eines an.
   **An der Produktivdatenbank gemessen: 760 Positionen, 760 mit Variante, 0
   ohne.** Sie hat also nie etwas gemeldet, und zwar nicht, weil alles in
   Ordnung war. Jetzt zählt nur, was eine Verwendung belegt: das Zählwerk und
   ein Reststück (`pruefstand-kontrollen-v3-186`, Abschnitt L2).

Nebenbei: der Blitzschutz-Katalog fragte wortgleich „Dieses Material wirklich
löschen?" wie der Material-Katalog. Jetzt nennt er sein eigenes Material —
zwei identische Fragen in zwei Listen waren genau der Befund von v3.140.

**Prüfstände**

- **weg mit dem Modul:** `lagerverwaltung-v3-98` (284 Prüfungen),
  `lager-ansicht-v3-220`
- **ersetzt durch `pruefstand-katalog-position-v3-251` (40 Prüfungen):**
  `gemeinsamer-dialog-v3-138` (68) und `position-vorschlag-v3-136`. Der
  Nachfolger sagt in seinem Kopf Abschnitt für Abschnitt, welche Zusage von
  wo übernommen ist und welche mit dem Produkt-Formular weggefallen ist.
- **umgestellt, nicht gelöscht:** `kontrollen-v3-186` (L gedreht: die Kontrolle
  *muss* weg sein), `lieferanten-lager-v3-231` (A3b: js/68 ist wirklich weg;
  F5/F6 am Lager-Tab; Q4, R10/R11), `blechformat-v3-177` (E am Warntext),
  `anlegen-sichtbar-v3-140` (C auf das Lieferanten-Lager), `neue-position-nr-v3-137`

**Offen, seine Entscheidung (nicht blockierend):** der Abschnitt heisst
weiterhin „Materialbestand". Nachdem „🏭 Lagerverwaltung" daneben weg ist,
wäre „Material & Blech" klarer.

### created_by erzwingen, 02.10.2026 (ohne neue Version — am Code ändert sich nichts)

Ansage des Anwenders: „Ja created by machen." Migration
`lieferanten_tabellen_creator_meta`.

**Zuerst eine Korrektur meiner eigenen Meldung.** Ich hatte berichtet, nichts
in der App erzwinge `created_by`. Das war aus den **RLS-Regeln** geschlossen,
ohne die **Trigger** zu prüfen — und damit falsch:
`set_creator_editor_meta()` läuft seit längerem auf **18 Tabellen**, erzwingt
`created_by = auth.uid()` beim Anlegen und stellt es beim Ändern aus `OLD`
wieder her. `reports`, mein eigenes Beispiel, war die ganze Zeit abgedeckt.

**Die echte Lücke waren die Tabellen ohne diesen Trigger — und darunter waren
meine drei** aus v3.231: `lieferanten_artikel`, `lieferanten_bewegungen`,
`lieferanten_einkauf`. Ich hatte sie angelegt, ohne die Hausregel mitzunehmen.

- `lieferanten_artikel` bekommt die vorhandene `set_creator_editor_meta()`.
- Die beiden anderen führen bewusst **kein** `updated_by`/`updated_at` (eine
  Buchung ist unveränderlich, ein Einkaufswunsch wird abgehakt). Die
  Hausfunktion würde dort zur Laufzeit scheitern, weil sie `new.updated_by`
  schreibt. Deshalb `set_creator_meta()` — dieselbe Regel, nur die
  Anleger-Spalten.

**Bewiesen in zurückgerollten Transaktionen**, vor und nach dem Eingriff: ein
gefälschtes `created_by` wird beim Anlegen überschrieben und lässt sich beim
Ändern nicht nachträglich umschreiben; die übrigen Trigger derselben Tabelle
feuern weiter (`preis_stand` wird gesetzt); Buchungen und Einkaufswünsche
laufen unverändert.

**Nicht angefasst, mit Grund:**

| Tabelle | Warum nicht |
|---|---|
| `companies`, `company_invites` | entstehen in Edge Functions mit `service_role`, dort ist `auth.uid()` NULL. Der strenge Trigger würde das absichtlich gesetzte `created_by` auf NULL ziehen und die Zuordnung zerstören, die `register-company` herstellt. |
| `feedback` | `feedback_insert_own` erzwingt `created_by = auth.uid()` schon per RLS. Ein Trigger könnte einen etwaigen serverseitigen Weg still auf NULL ziehen — für den Rest kein guter Tausch. |
| `system_settings` | hat gar kein `created_by`. |

**Keine App-Änderung.** Die Hausregel ist, dass der Client `created_by`
mitschickt und die Datenbank es überschreibt — so machen es `reports`,
`projects`, `measurements`, `ausmass`. js/82 macht es genauso; es allein
umzubauen würde es zum Sonderfall machen.

**Nebenbefund, nicht behoben:** 0 von 439 Lieferantenartikeln haben ein
`created_by` — sie kamen über den Import herein, bevor es die Regel gab.
Nachträglich einen Urheber zu erfinden wäre falsch.

Nachprüfbar mit:

```sql
select c.relname, t.tgname, p.proname
from pg_trigger t join pg_class c on c.oid=t.tgrelid
 join pg_proc p on p.oid=t.tgfoid
where p.proname in ('set_creator_editor_meta','set_creator_meta')
 and not t.tgisinternal order by 1;
```

### v3.250: Auf dem Handy bedienbar — gemessen statt vermutet

**Methode.** Die Prüfstände prüfen, ob Bedienteile **da** sind — nicht, ob sie
**passen**. Also einmal gemessen, was ein Spengler auf dem Dach sieht: die
fünf Lager-Dialoge bei 320 und 390 px, auf waagrechten Überlauf und
Trefferflächen.

**Befund 1 (echter Fehler).** Im Lager-Dialog stand eine Tabelle von
**1000 px in einem 342 px Behälter**: die Aufbau-Tabelle der Excel-Importe
(„Wie muss die Datei aufgebaut sein?"). 46 bzw. 60 Elemente ausserhalb des
Bildes. Weder Tabelle noch Behälter scrollen (`overflow-x:visible`) — die
dritte Spalte war **unerreichbar**, also genau die mit den erlaubten
Spaltenüberschriften.

Die Ursache war eine **richtige Regel an der falschen Stelle**:
`table{…min-width:1000px…}` in `css/01-basis.css` Zeile 36 — korrekt für die
breiten Stücklisten, die in einem scrollenden Kasten stehen. `.ra-tab`,
`.fpa-tab` und `.pmat-tab` setzen das längst zurück; die Aufbau-Tabelle hatte
den Rücksetzer nie bekommen.

Behoben mit **einer** Regel auf der Klasse `.import-aufbau`, die schon an
allen vier Importen im Dokument stand und nur nie eine Regel hatte — kein
JavaScript angefasst, alle vier Importe (Materialkatalog, Blitzschutz,
Lieferanten-Lager) auf einmal.

**Befund 2 (Verbesserung).** Das Kästchen eines `.rechte-schalter` ist 13 px,
die Trefferfläche ist aber das **Label**: 340 px breit, **19 px hoch**. Breit
genug, hoch nicht. Jetzt `min-height:30px`. Bewusst nicht die 44 px der
Mobilrichtlinien — die Rechtematrix hat viele Zeilen und würde unnötig
wachsen.

**Abschnitt AB im Prüfstand** hält beides fest: AB1/AB2 kein Überlauf bei
320 und 390 px in allen fünf Dialogen, AB3/AB4 die Aufbau-Tabelle setzt die
globale Regel zurück und passt in ihren Behälter, AB5/AB6 der Tipp landet im
Label und die Zeile ist hoch genug.

**Zwei eigene Messfehler dabei**, beide im Prüfstand vermerkt: `elementFromPoint`
gibt bei einem entschiedenen Artikel das `<b>` im Label zurück (ein Klick
darauf schaltet trotzdem — Containment prüfen, nicht Identität), und bei acht
Artikeln liegt die erste Zeile unter dem Fenster, dann gibt es `null` — erst
`scrollIntoView`, dann messen.

### v3.249: „Dafür gibt es bei uns keine Regie-Position"

**Entscheidung des Anwenders (02.10.2026):** „Punkt 1 wird so bleiben, wir
haben keine Positionen für die fehlenden Artikel." Die 158 unzugeordneten
Artikel bleiben unzugeordnet.

**Was das von der App verlangt.** Ohne einen Platz für diese Entscheidung
hätte der Knopf **dauerhaft „158 offen"** gemeldet. Das ist nicht bloss
unschön: ein Zähler, der Arbeit anzeigt, die keine ist, **verdeckt die echte**
— kommt eine neue Lieferantenliste, deren Artikel sich wirklich zuordnen
lassen, fällt sie zwischen 158 Dauerposten nicht mehr auf.

Die App kann das **nicht selbst erkennen**: ob es für eine 400er Rinne eine
Abrechnungsposition geben soll, ist eine betriebliche Entscheidung.

- Migration `lieferanten_artikel_keine_regie_position`: Spalte
  `keine_regie_position boolean not null default false`, mit `comment on`.
- **Bewusst nicht über `archiviert`:** ein Artikel ohne Regie-Position ist im
  Lager **voll brauchbar** — Bestand, Mindestbestand, Einkaufsliste und
  Inventur brauchen sie nicht; nur das Verrechnen im Regierapport braucht sie
  (AA5). Archivieren würde etwas anderes behaupten.
- `lfOffeneZuordnung(a)` ist jetzt die **eine** Antwort auf „ist hier noch was
  zu tun" — benutzt vom Knopf-Zähler, der Gruppenzählung, `lfZuordnenNurOffene`,
  `lfZuordnenBefundStand`, `lfFehlendeRegie` und `lfOhneMuster`.
- Gesetzt wird **sofort**, nicht mit „Speichern": die Entscheidung hängt an
  keiner Regie-Position, es gibt nichts durchzusehen — und eine Entscheidung,
  die man noch speichern muss, geht beim Schliessen verloren.
- Gruppenweise bedienbar (`🚫 Alle angezeigten`), wie beim Zuordnen selbst.
  158 Artikel einzeln anzutippen wäre ein Nachmittag.
- **Der Scanner rät nicht mehr ins Leere** (AA6/AA7/AA8): „noch nicht
  zugeordnet" → nachtragen; „keine Position" → es gibt nichts nachzutragen,
  Material von Hand erfassen.
- Entschiedene werden **genannt**, nicht verschwiegen (AA4).

**Die Probe hat vor dem Eingriff einen Widerspruch gefunden:** ein Artikel
konnte *beides* tragen — eine Zuordnung **und** die Marke. Zwei Wahrheiten
über dieselbe Frage. Deshalb ein CHECK in der **Datenbank**
(`lieferanten_artikel_keine_regie_nur_ohne_zuordnung`), nicht im Formular;
in einer zurückgerollten Transaktion in **beide** Richtungen belegt.

**Und der Prüfstand hat einen echten Fehler von mir gefunden** (AA10): ich
hatte `lfZuordnenSichereUebernehmen` abgesichert, **`lfZuordnenAlleSetzen`
aber nicht** — der hätte die Entschiedenen in einem Zug doch zugeordnet, also
genau das Gegenteil der Entscheidung. AA11/AA12 waren dagegen mein
Testaufbau: `lfKeinePositionSetzen()` lädt am Ende neu (wie die App nach jedem
Schreiben), und die Attrappe trug andere Artikel als der Aufbau — jetzt im
Prüfstand vermerkt.

### v3.248: Eine Passwortregel, an einer Stelle

**Rahmenbedingung, nicht Mangel** (Ansage des Anwenders, 02.10.2026):
„Leaked Password Protection" (HaveIBeenPwned) ist ein **Supabase-Pro-Merkmal**
und steht diesem Konto **nicht** zur Verfügung. Das ist damit entschieden und
wird bei künftigen Durchsichten **nicht wieder als offener Punkt gemeldet**.

**Befund.** „Mindestens 8 Zeichen" stand an **drei** Stellen als je eigene
Zeile: js/03 (eigenes Passwort), js/69 zweimal (Zurücksetzen, Registrierung).
Drei Kopien derselben Regel laufen auseinander, sobald eine erweitert wird —
genau das war hier fällig. Und 8 Zeichen allein lassen `12345678` durch.

**Gut und so geblieben:** die 8-Zeichen-Grenze gilt **auch serverseitig** —
beide Edge Functions (`password-reset`, `register-company`) prüfen sie selbst.
Eine Umgehung am Formular vorbei greift nicht.

`passwortSchwach(pw,{vorname,nachname,email,firma})` in **js/01**, benutzt von
allen drei Formularen. Sie gibt den **Grund** zurück, nicht true/false.

| Abgewiesen | Angenommen |
|---|---|
| `12345678`, `23456789`, `87654321` (durchlaufende Reihe) | `48271936` (Ziffern **ohne** Reihe) |
| `aaaaaaaa` | `korrekt pferd batterie` |
| `passwort`, `Passwort!`, `spengler`, `Spengler123` | `Regenrinne-Nordseite` |
| `Künzi1x`, `KÜNZI1x`, `künzi-spengler` | `Mike-Winterdach-7` |
| `mike1234`, `peter-kuenzi-dach`, `ledermann1` | `Hornbach-Dienstag`, `Kupferrinne2026` |

- **Keine** erzwungene Komplexität: keine Sonderzeichen, keine Ziffern, keine
  Grossbuchstaben. Das erzeugt „Sommer2026!" und Zettel am Bildschirm.
- Der Namensteil weist **nicht** blosses Vorkommen ab. `pwEigenerRest()`
  entfernt alle bekannten Bausteine in **einem** Durchgang — Vorname,
  Nachname, Firma, Teil vor dem @, und **wortweise** (sonst käme
  `peter-kuenzi-dach` durch, weil der ganze Firmenname so nie im Passwort
  steht) — plus die Liste der geratenen Wörter; danach müssen **6** Zeichen
  bleiben. Längste Bausteine zuerst, sonst bleiben Reste stehen.
- Umlaute und Gross-/Kleinschreibung werden gefaltet (`pwNormal`), sonst wäre
  `KÜNZI1x` eine Umgehung.

**Gemessen, nicht geschätzt:** 18 erratbare und 7 brauchbare Beispiele, beide
Richtungen im Prüfstand (6a/6b). Eine Regel, die zu viel abweist, ist genauso
schädlich wie eine, die zu wenig abweist.

**Der Hilfe-Prüfstand hat mich dabei korrigiert:** im Hilfetext stand
„kuenzi1x" — er verlangt echte Umlaute im Benutzertext. Richtig: der Name
heisst Künzi. Gegengeprüft, dass die Regel alle drei Schreibweisen abweist,
und das Beispiel steht jetzt so da, wie der Name sich schreibt.

### v3.247: Das Lieferanten-Lager steht in der Stammdaten-Kontrolle

Das Lager ist seit v3.231 da und kam in `js/75-kontrollen.js` nicht vor. Die
Befunde aus v3.243/v3.244 sah er nur, wenn er den Zuordnen-Dialog öffnet.

**Vor dem Bauen gemessen** (01.10.2026, PETER KÜNZI AG): 0 negative Bestände,
0 firmenfremde Regie-Positionen, 0 Buchungen ohne Artikel, 0 Wünsche ohne
Artikel, 0 Artikel ohne Lieferant, 0 archivierte mit Bestand. Die einzigen
echten Befunde sind die zwei Grössen-Widersprüche aus v3.243.

**Genau zwei Prüfungen, und das ist eine Entscheidung** (M7): aufgenommen
wurde nur, was sonst **unsichtbar** ist.

| Prüfung | Schwere | abweisbar |
|---|---|---|
| `lieferant-groesse-widerspruch` | fehler (falscher Preis auf der Rechnung) | **ja** — kann fachlich gewollt sein |
| `lieferant-negativer-bestand` | fehler | **nein** — eine falsche Zahl bleibt falsch |

**Nicht aufgenommen, mit Grund:** „158 Artikel ohne Regie-Position" und
„Gruppe ohne Muster" stehen schon am Knopf `🔗 Zuordnen (158 offen)` und im
Kopf der Zuordnen-Ansicht. In den Kontrollen wären sie eine **zweite Stelle
für dieselbe Zahl** — und zwei Stellen laufen auseinander. Dieselbe Regel, die
ich dem Code auferlege, gilt für mich.

- Beide hängen an `nurMit:()=>lfGeladen===true` mit `nichtMoeglich`-Text —
  dem **vorhandenen** Mechanismus des Moduls (wie `position-nie-benutzt` am
  Zählwerk). Ohne geladenes Lager melden sie nichts und sagen warum (M1/M2);
  die leere Liste wäre sonst die Auskunft „alles in Ordnung".
- Der Sprung-Knopf wurde **erweitert, nicht verdoppelt**: eine Prüfung darf
  statt `tab`/`abschnitt` ein eigenes `oeffnen()` tragen, weil das Lager ein
  eigener Dialog ist (`lfOeffnen`, js/82) und nicht in den Einstellungen liegt
  (M10/M11).
- Gegenproben: ein Artikel **ohne** Zuordnung ist kein Grössen-Widerspruch
  (M5), ein **archivierter** zählt in beidem nicht (M6).

### Datenbank-Durchsicht 01.10.2026 (ohne neue Version — am Code ändert sich nichts)

Erstmals in dieser Sitzung den **Supabase-Linter** befragt statt weiter am
Lager zu bauen. Migration `trigger_funktionen_aufraeumen`.

**Behoben, beides von mir verursacht:**

| Befund | Schwere |
|---|---|
| `lieferanten_artikel_normalisieren` ohne `search_path` — die **einzige** Funktion im Schema ohne | echt, aber klein: `SECURITY INVOKER`, ruft nur Eingebautes (`btrim`, `nullif`, `current_date`) |
| Drei **Trigger**-Funktionen trugen noch `PUBLIC EXECUTE` (`lieferanten_artikel_normalisieren`, `lieferanten_artikel_regie_pruefen`, `lager_standard_variante`) | Unordnung, **kein** ausnutzbares Loch |

Zum zweiten Punkt, ohne Übertreibung: alle drei geben `trigger` zurück und
sind über PostgREST nicht aufrufbar — der Aufruf scheitert, bevor etwas
geschieht. Es war nur das Standardrecht, das beim Anlegen mitkommt.

**Bewiesen statt vermutet** (zweimal, je in einer sich selbst zurückrollenden
Transaktion gegen die *Testfirma*): nach dem Entzug feuern alle drei Trigger
unverändert — Lager-Variante entsteht, `artikelnr` wird geputzt, `preis_stand`
gesetzt, fremde Regie-Position weiterhin abgelehnt. PostgreSQL prüft `EXECUTE`
beim **Anlegen** eines Triggers, nicht beim Feuern. Kein echter Datensatz
wurde verändert.

**Geprüft und in Ordnung** — der Punkt, der nach einem Loch aussah: 13
`system_admin_*`-Funktionen sind für jeden angemeldeten Nutzer aufrufbar,
darunter `system_admin_delete_company_data`. **Alle prüfen `is_system_admin()`
selbst**; die `measurement_*` prüfen `is_admin` oder die Firma,
`admin_*` und `set_projektmodule` die Firma, `mark_own_password_set` wirkt nur
auf `auth.uid()`. Nachprüfbar mit:

```sql
select p.proname, p.prosecdef,
 coalesce(array_to_string(p.proconfig,','),'(kein search_path)') as config,
 (p.prosrc ~* 'is_system_admin') as prueft_system_admin,
 (p.prosrc ~* 'is_admin') as prueft_admin,
 (p.prosrc ~* 'my_company_id') as prueft_firma
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
 and (p.proname like 'system_admin%' or p.proname like 'admin_%'
      or p.proname like 'measurement_%') order by 1;
```

**Bewusst NICHT gemacht, mit Grund:**

- **62 fehlende FK-Indizes** — fast alle auf `created_by`/`updated_by`, nach
  denen niemand sucht. 62 Indizes verlangsamen jedes Schreiben für Abfragen,
  die es nicht gibt. Wird relevant, wenn `lieferanten_bewegungen` zehntausende
  Zeilen trägt; dann zuerst `artikel_id`.
- **19 „unbenutzte" Indizes** — bei einem Lager, das nicht in Betrieb ist,
  heisst das „noch nicht benutzt". `lieferanten_einkauf_artikel` zu löschen
  wäre falsch.
- **16 mehrfache Policies** — bestehende RLS-Entwürfe (feedback, companies,
  feature_access). Zusammenlegen könnte Zugriffsrechte verschieben; dafür ist
  ein Leistungshinweis auf Tabellen mit einer Handvoll Zeilen kein Grund
  (CLAUDE.md 6: keine Policies ohne Prüfung ersetzen).
- `password_reset_tokens` hat RLS **ohne** Policies = deny-all. Gemessen: im
  Frontend kommt die Tabelle nicht vor, sie wird nur serverseitig benutzt.
  Gewollt, kein Mangel.

**~~Offen~~ ENTSCHIEDEN (02.10.2026):** „Leaked Password Protection" ist aus
und **bleibt** es — das Merkmal gehört zum Supabase-Pro-Plan, den dieses Konto
nicht hat. Keine offene Aufgabe, sondern eine Rahmenbedingung; nicht wieder
melden. Der freie Ersatz dafür ist die Passwortregel in v3.248.

### v3.246: Die Einkaufsliste gehört zu einem Lieferanten — und der Rundgang

**Zwei Dinge, beide Aufräumen an der eigenen Arbeit.**

**1. Vier Ansichten, ein Filter.** v3.241 hat `lfLieferant` für Artikelliste,
Zuordnen und Inventur eingeführt — die Einkaufsliste blieb aussen. Dabei geht
eine Bestellung an **genau einen** Händler, und `lfEinkaufsWert()` rechnete
quer über alle: eine Zahl, die zu keiner Bestellung gehört.

- `lfEinkaufsliste()` bleibt die **eine Wahrheit** darüber, was überhaupt
  fehlt. Gefiltert wird erst an der Ansicht: `lfEinkaufAnzeige()` (Z1/Z2).
- Liste, Summe und **verschickter Text** gehören zum gewählten Lieferanten;
  der Text trägt ihn im Titel und enthält den anderen nicht (Z3/Z4). Ohne
  Wahl bleibt alles wie bisher (Z5).
- `lfEinkaufVerdeckt()` wird **genannt** (Z6), und eine leere Auswahl sagt,
  dass es an *diesem* Händler liegt (Z7).
- **Der Knopf-Zähler filtert NICHT mit** (Z8). Er ist das Signal „es liegt
  Arbeit" und steht ausserhalb der gefilterten Ansicht. Ein Zähler, der still
  einen Händler unterschlägt, wäre die gefährliche Richtung: eine Bestellung,
  die niemand aufgibt, weil sie hinter einem Filter lag.

**2. `pruefstand-lager-rundgang-v3-246.js` — der ganze Kreis in einem
Durchgang.** v3.231–v3.246 haben je ein Stück gebaut, jedes mit eigenem
Prüfstand. Die **Übergaben** dazwischen waren nirgends gemessen, weil jeder
Einzelprüfstand sich seinen eigenen Anfangszustand baut. Der Rundgang läuft in
**einer** Sitzung:

```
Inventur (10 gezählt, Mindest 8) → Bestand 10, Liste leer
3× scannen im Rapport           → Bestand 7, Liste meldet 1 fehlend
Wareneingang (VPE-Rundung 5)    → Bestand 12, Zeile verschwindet von selbst
Wunsch von Hand 3 → Teillieferung 2 → Rest 1 → erledigt
Bewegungen: 2 Korrektur, 3 Abgang, 3 Zugang
Bestand = Summe der Buchungen (und ein Feld `bestand` ändert nichts)
```

**Ergebnis: 32 von 32, kein App-Fehler.** Die drei Fehlschläge beim ersten
Lauf waren meine eigenen falschen Erwartungen: die EDV-Nr. kommt als
`t.regie.edv_nr` (nicht `t.no`), der Kasten heisst `liefBuchenWunschHinweis`,
und ohne Buchungen fehlen **beide** überwachten Artikel, nicht einer.

### v3.245: Eine Pflegedatei darf eine Spalte weniger haben

**Gefunden, bevor die Datei da war.** Eine Preisliste vom Händler hat zwei
Spalten: Artikel-Nr. und Preis. Keine Bezeichnung. Die war in
`initExcelImport` unbedingt `pflicht:true`, und `verwendbar()` verwirft jede
Zeile, bei der ein Pflichtfeld fehlt — sein Upload hätte **0 Zeilen**
importiert, mit „Das Pflichtfeld „Bezeichnung" ist keiner Spalte zugeordnet".
Gemessen (01.10.2026): 0 von 439 Artikeln haben einen Preis, 427 haben einen
Barcode. Der Preis ist die eine Lücke, die noch kommt.

Die Verwechslung lag in meinem eigenen Code: eine Bezeichnung braucht, wer
einen Artikel **anlegt**. Wer einen vorhandenen **pflegt**, hat sie in der
Datenbank — und `zugeordneteFelder()` nimmt ein nicht zugeordnetes Feld
ohnehin nicht in den Datensatz, es wird also nie geleert. Dass `bezeichnung`
`NOT NULL` ist, sagt beides: für neue Zeilen bleibt sie Pflicht, sonst bricht
der **ganze** Upsert ab, nicht nur die Zeile.

- `cfg.pflichtNurNeu:[keys]` — **freiwillig**, wie `festwerte`/`onConflict` in
  v3.231. Ohne die Angabe verhält sich jeder vorhandene Aufrufer genau wie
  vorher (F11: der Materialkatalog verlangt den Namen weiterhin unbedingt).
- js/82 setzt `pflichtNurNeu:["bezeichnung"]` (H6).
- Die Meldung ist keine Fehlermeldung mehr, sondern eine Auskunft: „Ohne
  Spalte „Bezeichnung": bestehende Positionen werden trotzdem gepflegt … N
  Zeile(n) sind noch nicht im Lager und werden ausgelassen" (F3/F4).
- Auch die Zeilen-Meldung stimmt jetzt: eine leere Zelle in einem solchen Feld
  lässt eine **vorhandene** Position weiter pflegen — „werden nicht
  importiert" wäre falsch gewesen, und wer das liest, sucht einen Fehler, den
  es nicht gibt.
- Der Aufbau-Hinweis sagt es ebenfalls („nur für neue" statt „Pflicht") samt
  dem Hinweis auf die Preisliste (H7).
- Nebenbei frei mit: eine Datei nur mit **Mindestbestand** oder nur mit
  **Barcodes** läuft genauso durch.

**Eine zweite Vermutung durch Messen verworfen, statt sie zu bauen:**
`preis_stand` wird schon von `lieferanten_artikel_normalisieren` gesetzt (seit
v3.233) — und zwar nur bei echter Preisänderung, sonst würde ein Import mit
400 unveränderten Zeilen 400 alte Preise auf heute datieren.

### v3.244: „Was fehlt" wird eine Arbeitsliste

v3.243 sagt, **was** nicht geht. v3.244 beantwortet „und was muss ich tun?" —
und die Antwort steht in **seiner eigenen Liste**.

**Befund** (01.10.2026): seine Regie-Liste benutzt **zwei Stile**, je Warenart
verschieden.

| Stil | Beispiele |
|---|---|
| je Werkstoff | 201.01/02 Dachrinnen halbrund Kupfer · 201.11/12 Titanzink · 201.13/14 Chromnickelstahl |
| alle Materialien | 203.41/42 Einhängestutzen · 203.21/22 Rinnenboden · 203.01/02 Rinnenwinkel · 203.31/32 Dehnungselement |

Beim Blech ist der Werkstoff der Preis, beim Formteil nicht. Das ist eine
fachliche Unterscheidung, die er getroffen hat — **geraten wird sie nicht**:
`lfMusterFuer(a)` liest sie aus den bereits zugeordneten Artikeln derselben
Gruppe ab. Ein Name für die Gruppe → `alle`; mehrere Namen → `werkstoff`, und
das Muster ist der Name, den die Artikel **mit demselben Werkstoff** benutzen,
nicht der häufigste (Y2).

- `lfFehlendeRegie()` fasst jetzt nach der **Position** zusammen, nicht nach
  dem Artikel: eine Zeile ist eine Position, die er anlegen könnte (Y5).
- Zwei Arten von Lücke, weil sie Verschiedenes bedeuten (Y6):
  `muster` (Name + Einheit stehen fest, es fehlen EDV-Nr. und Preis) und
  `neu` (die Warenart fehlt ganz — Rinnenhaken eckig, Kugelböden,
  Schrägstutzen; dazu die ähnlichste vorhandene zur Orientierung, Y9).
- **EDV-Nr. und Preis schlägt die App nicht vor** (Y12). Eine geratene Nummer
  landet in seinem Nummernsystem, ein geratener Preis auf einer Rechnung.
- Der Knopf **zeigt** die Liste im Dialog und kopiert sie zusätzlich (Y14) —
  eine Arbeitsliste nur in der Zwischenablage muss man erst irgendwohin
  einfügen, um sie zu lesen.
- **Die Zusage bleibt** (Y17): js/82 **liest** die Regie-Liste, legt dort aber
  nichts an — weder direkt noch über `katalogPositionAnlegen()` aus js/59.
  Angelegt wird in der Lagerverwaltung, wie bisher.

**Grenze, offen benannt:** die angezeigte Grösse kommt aus `zuschnitt_mm`. Bei
den Rinnenstutzen 100/120 ist das der **Ablauf**, nicht die Rinnengrösse (die
steht in der Artikelnummer: `20.160.400.100` = 400er Rinne, 100 mm Ablauf).
Betrifft 6 der 158 Artikel. Statt das zu erraten — die Nummer trägt auch
Codesegmente wie `160`, und ein dritter Fehlalarm wäre teurer als eine offene
Angabe — stehen je Zeile **ein bis zwei Beispielartikel** (Y8), und der Text
sagt diese Grenze ausdrücklich.

**Arbeitsregel (aus diesem Lauf gelernt):** während `ci-lauf.js` läuft, nicht
am Arbeitsbaum ändern. Die Prüfstände lesen die Dateien zur Laufzeit; der
v3.243-Lauf war ab etwa Prüfstand 96 schon gegen v3.244-Code unterwegs.
Beides grün, aber der Lauf war dadurch nicht mehr sauber einer Version
zuzuordnen.

### v3.243: Die Grösse entscheidet mit — kein Beinahe-Treffer

**Befund vor dem Bauen** (01.10.2026, an den echten 439 Artikeln gemessen):

| Grösse | Artikel | zugeordnet |
|---|---|---|
| 400 | 63 | **0** |
| 200 | 46 | **0** |
| 250 | 143 | 124 |
| 330 | 148 | 130 |

115 der 158 offenen Artikel sind 200er und 400er. Die Regie-Liste führt die
Rinnenpositionen nur in **250 und 330** — es gibt die Position nicht. Dazu
Formen, die ganz fehlen: Rinnenhaken eckig (17), Rinnenkugelböden (15),
Schrägstutzen (15).

**Das Gefährliche war nicht das Offenbleiben, sondern das Gegenteil.** Für eine
400er-Rinne bot das Zuordnen die 333er-Position an — mit „wie 44× in dieser
Gruppe" davor. `lfZuordnenSichereUebernehmen` hätte sie gesetzt, und
`lfZuordnenAlleSetzen` 11 Artikel auf einen Schlag. Eine 400er-Rinne mit dem
Preis der 250er im Regierapport ist ein falscher Betrag auf einer Rechnung.

- `lfGroesseWiderspricht(a,r)` — **kein** automatischer Weg geht darüber
  hinweg: Gruppenmuster (X5), „Sichere Vorschläge" (X6), „Alle angezeigten
  setzen" (X8). Was ausgelassen wird, wird **benannt** (X7/X9).
- `lfGroessenBefund(a)` — **ein** Befund je Artikel: `ok` /
  `groesse-fehlt` / `nichts`. Der Grund, aus dem ein Artikel offen bleibt,
  wird **vor** der Sicherheitsfrage festgestellt — sonst hing die Begründung
  an der Reihenfolge der Prüfungen (das war X7s erster Fehlschlag, ein echter
  Fehler, kein falsche Erwartung).
- Kopf: wie viele **zu entscheiden** sind und wie viele **nicht zuordenbar**.
  `📋 Fehlendes kopieren` gibt die Liste je Gruppe und Grösse.
- Eine **bestehende** Zuordnung mit widersprechender Grösse wird gefragt
  („stimmt das?"), nie von selbst geändert (X23/X24). Gemessen: 2 Fälle.

**Zwei Fehlalarme, die der Prüfstand gefangen hat — beide waren meine:**

1. `zuschnitt_mm` allein ist **nicht** „die Grösse". Bei „Rinnenstutzen 100 mm
   20.160.330.100" steht dort der **Ablauf** (100), die Rinnengrösse 330 sitzt
   in der Nummer; bei „Rinnenstutzen 50 mm 20.160.200.050" steht in demselben
   Feld 200, also die Rinnengrösse. Eine Regel nur auf `zuschnitt_mm` hätte
   **12 richtige** Zuordnungen rot markiert und künftig blockiert. Verglichen
   werden jetzt alle Zahlen des Artikels — mit `rmatZahlen()` aus js/57, plus
   den reinen Ziffergruppen, weil `rmatZahlen` „20.160.330.100" als Dezimalzahlen
   liest und die 330 darin nie vorkommt (X17/X18).
2. Eine Dimension, die **keine Grösse** ist, entscheidet nichts. „bis 120" ist
   eine Obergrenze (60, 75, 100 passen alle), „B 122" eine Breite, „250-330" ein
   Bereich. Hätte das gegolten, wären **9 richtige** Zuordnungen rot geworden
   (X20–X22). Entschieden wird nur bei einer blanken Zahl oder einer
   Aufzählung blanker Zahlen.

Nach der Korrektur bleiben an den echten Daten **2** von 281 bestehenden
Zuordnungen als fragwürdig übrig — beide echt (330er Uginox-Rinne auf der
250er Chromnickelstahl-Position), keine Fehlalarme.

### v3.242: „gebucht ≠ Zeile" wird sichtbar

Das war **meine eigene offene Stelle**, in v3.237 selbst vermerkt: gebucht wird,
was **gescannt** wurde, nicht was am Ende in der Zeile steht. Bisher stand das
nur in der Hilfe — also dort, wo es niemand liest, wenn es passiert.

- `rapportGebuchtMerken(m,artikelId,menge)` führt die Buchungen **je Artikel**
  mit, nicht je Zeile — weil eine EDV-Nr. mehrere Lieferantenartikel tragen kann
  (n:1 aus v3.234). `m.gebucht=[{artikel_id,menge}]`.
- `rapportBuchAbweichungen()` meldet **nur** Zeilen, auf die wirklich gebucht
  wurde und bei denen Zeile und Buchung auseinanderlaufen. Eine von Hand
  erfasste Zeile ohne Buchung ist **keine** Abweichung (W7).
- `rapportBuchWarnungZeichnen()` hängt in **`updateTotals()`** — dem einen Weg,
  den jede Änderung nimmt (Zeichnen, Mengenänderung, Laden eines gespeicherten
  Rapports) (W10). Keine zweite Stelle, die sich ans Zeichnen erinnern muss.
- Die Meldung sagt alle drei Dinge: was **gilt** (verrechnet wird die Zeile),
  was **nicht** gilt (das Lager ist nicht nachgeführt) und was **zu tun** ist
  (Korrektur am Artikel) (W6).
- **Keine Migration nötig:** `reports.material_entries` ist `jsonb`, und
  Speichern/Laden geben das **ganze** Zeilen-Objekt durch (js/08 ↔ js/09) —
  `gebucht` überlebt mit (W9).

**Bewusst nicht gebaut: automatisches Nachbuchen.** Hinter einer EDV-Nr. können
mehrere Lieferantenartikel stehen („Rinnenseiher, alle Materialien"). „Die Zeile
steht jetzt auf 5" sagt deshalb nicht, **welcher** Artikel die zwei zusätzlichen
Stück liefert. Eine geratene Buchung wäre schlimmer als eine sichtbare
Differenz — sie sähe richtig aus. Ebenso weiterhin offen (und hier bewusst
vermerkt): ein echter Abgleich beim **Speichern** des Rapports; v3.242 macht die
Abweichung nur sichtbar.

### v3.241: Mehrere Lieferanten in der Bedienung

Ansage: „weitere produkte werden folgen." Das Datenmodell ist seit v3.231
mehrlieferantenfähig, die **Bedienung** war es nicht.

- **Ein** Filter `lfLieferant` für **alle drei** Ansichten (Artikelliste,
  Zuordnen, Inventur) — drei Schalter, die dasselbe meinen, laufen auseinander.
  Beim Wechsel werden Gruppen-/Suchfilter zurückgesetzt (eine Gruppe des alten
  Lieferanten gibt es beim neuen meist nicht).
- **Übersicht je Lieferant** (`lfLieferantenStand`): Artikel, zugeordnet, mit
  Preis, mit Bestand, unter Mindestbestand — abgeleitet, nicht geführt.
- Filter und Übersicht **bleiben weg bei nur einem Lieferanten**, und ein Rest
  aus einer früheren Wahl wird zurückgesetzt (V8/V9).
- **„Alle angezeigten setzen" greift nie über den Lieferanten hinaus** — weder
  beim Zuordnen (V5) noch beim Mindestbestand (V6). Das war der teure Fall.
- Gruppenauswahl zeigt nur die Gruppen des gewählten Lieferanten (V4).
- **Tippfehler-Schutz beim Import**: „bteam" neben „B-Team" warnt und bietet
  Übernahme (V10–V12). Geblockt wird nichts — es kann einen Händler geben, der
  wirklich so ähnlich heisst.

### v3.240: Inventur — Bestand und Mindestbestand gruppenweise

**Befund vor dem Bauen:** 0 von 439 Artikeln hatten einen Mindestbestand, 2 eine
Buchung. Die Einkaufsliste aus v3.231 lief leer — nicht weil sie fehlt, sondern
weil 439 Artikel einzeln zu erfassen eine Wand ist.

- Gruppenwahl + Suche, je Zeile **gezählt** und **Mindestbestand**; „Setzen"
  gibt allen **angezeigten** denselben Mindestbestand.
- **Ein leeres Feld heisst „nicht gezählt"**, nicht „null Stück" (U3) — nur so
  lässt sich ein einzelnes Regal zählen.
- Gebucht wird die **Differenz** als **Korrektur** mit `ziel='inventur'` (U6–U8),
  nicht als Zugang: ein Zugang würde behaupten, Ware sei angekommen.
- Alle Korrekturen in **einem** insert, alle Minima in **einem** RPC
  (`lieferanten_mindestbestand_setzen`, ohne `security definer`).
- **Reihenfolge mit Absicht:** erst die Buchungen, dann die Minima. Scheitern
  die Buchungen, bleiben die Minima unberührt (U12) — einer ohne den gezählten
  Bestand meldet sofort falschen Mangel.

### v3.239: Wareneingang — die Einkaufsliste führt sich selbst nach

**Die Regel ist eine einzige: was da ist, fehlt nicht mehr.**

| Lage | Was mit dem Einkaufswunsch passiert |
|---|---|
| gebucht ≥ gewünscht | `erledigt_am` gesetzt |
| gebucht < gewünscht | `menge` auf den Rest **verringert** |
| „Rest streichen" angehakt | `erledigt_am` gesetzt, **`menge` unverändert** |

Den Wunsch bei einer Teillieferung auf der alten Menge stehen zu lassen wäre der
teure Fehler: die Einkaufsliste verlangte weiter die ganze Menge, und beim
nächsten Bestellen käme das Zuwenig doppelt.

- Bei einem **Zugang mit offenem Wunsch** ist dessen Menge vorbelegt, nicht die
  VPE — das ist, was bestellt wurde.
- Der **📥 in der Einkaufsliste** belegt die **Bestellmenge** vor (VPE-gerundet).
- Der Haken „Rest streichen" ist beim Öffnen **immer aus** (T11) — ein
  stillschweigend gestrichener Rest wäre Ware, die niemand mehr bestellt.
- Ein **Abgang** fasst den Wunsch nie an (T13).
- Nachführen erst **nach** der Buchung; scheitert es, bleibt die Buchung stehen
  (die Ware ist da) und der Fehlschlag wird gesagt (T15/T16).
- Die Regel `menge > 0` bleibt gewahrt: `rest <= 0` läuft über `erledigt_am`,
  nie über eine Menge von 0.

### v3.238: Bewegungen ansehen

Seit v3.237 bucht die App **selbständig** bei jedem Scan. Diese Ansicht ist das
Netz darunter — sie kam bewusst **vor** neuen Funktionen.

- `📜 Bewegungen` im Lieferanten-Lager: Zeitpunkt, Art, Menge, Artikel, Grund,
  Ziel, Projekt, Person. Filter nach Art, Suche über Artikel/Projekt/Person.
- **Es wird nichts gerechnet.** Der Bestand bleibt die Summe in der
  Artikelliste; zwei Rechnungen über dasselbe wären zwei Wahrheiten (S10).
- **Es wird nichts geschrieben** (S8) — die Ansicht sieht nur nach.
- Vorzeichen kommt aus der **Art**, der Betrag aus der Menge: eine Korrektur
  von −2 erscheint als `±2`, nicht als doppeltes Minus (S4).
- Eine Buchung auf einen entfernten Artikel wird **angezeigt**, nicht
  verschluckt — sie ist trotzdem passiert (S3).
- Gezeigt werden die neuesten 300; Älteres über das Suchfeld.

### v3.237: Beim Scannen auch ausbuchen

Ansage: „Ja, beim scannen auch gleich ausbuchen."

Ein Scan im Rapport tut jetzt **zweierlei**: verrechnen und Lagerbestand
ändern. Aufgelöst **und** gebucht wird in `lfScanVerbrauch()` (js/82); js/06
ruft weiterhin genau eine Funktion auf und setzt dort nichts (A3a).

Gebucht als Abgang mit `project_id` und `ziel='regierapport'`.

**Die Regeln, alle mit Gegenprobe im Prüfstand (Abschnitt R):**
- ohne Regie-Position **nicht** gebucht — sonst wäre Ware weg, die nie
  verrechnet wurde
- Buchen fehlgeschlagen → Rapportzeile bleibt gültig, der Fehlschlag wird
  **nicht** verschwiegen
- Bestand unter null wird gebucht **und benannt** („hier fehlt ein Zugang")
- Treffer in der **alten** Lagerverwaltung: Zeile ja, Buchung nein — dort
  schreibt dieses Modul nicht hinein
- Schalter sichtbar, eingeschaltet, je Gerät gemerkt
  (`sd_rapport_scan_buchen`)

**Bewusst offen:** gebucht wird, was *gescannt* wurde, nicht was am Ende in
der Zeile steht. Der saubere Weg wäre ein Abgleich beim Speichern des
Rapports — eigener Umbau am Speicherweg, kommt wenn gebraucht.

### v3.236: Material im Regierapport scannen

Barcode → Lieferantenartikel → Regie-Position → Rapportzeile mit **eurer**
EDV-Nr. und **eurem** Preis. Die Kette aus v3.234 ist damit geschlossen.

- **`lfBarcodeZuRegie(code)` liegt in js/82**, nicht im Regierapport. js/06
  **fragt nur**: genau ein Aufruf, null Zuweisungen — der Prüfstand misst das
  (A3a). Damit bleibt gewahrt, dass der Regierapport das Lieferanten-Lager
  nicht anfasst.
- Gesucht wird in **beiden** Lagern (Lieferantensortiment, dann
  `lagerVarianteZuBarcode` aus js/68). Ein Barcode zeigt auf eine Ware, nicht
  auf ein Modul.
- **Immer mit Grund geantwortet**, nie nur `null`: leer / unbekannt /
  archiviert / ohne-zuordnung. Und in **keinem** Fehlerfall entsteht eine
  Zeile — sonst stünde Material im Rapport, das niemand verbaut hat.
- Derselbe Artikel am selben Tag wird **hochgezählt**; ein anderes Datum bleibt
  eine eigene Zeile.
- Der Knopf wird **auf DOMContentLoaded** sichtbar gemacht: js/06 läuft vor
  js/82, ein im Dateikörper gesetztes `hidden` bliebe für immer stehen
  (Fehlertyp aus v3.228).

Stand der Zuordnung bei Auslieferung: **281 von 439** Artikeln, auf 23
Regie-Positionen; alle 281 mit Barcode, also sofort scanbar. Ganz offen sind
noch Rinnenhaken eckig (17), Rinnenkugelböden (15), Schrägstutzen (15).

### v3.235: Zuordnen je Gruppe, und die App lernt aus der Entscheidung

Ansage: „können wir das so machen das ich die zuordnung pro kategorie machen
kann damit es übersichtlicher ist" — und der gemeldete Fehler dazu: „zb
rinnenstutzen ist ein einhängestutzen gerade, da lag die app daneben".

- **Gruppenwahl + Suchfeld** in der Zuordnen-Ansicht (439 Artikel, 13 Gruppen).
  Das Suchfeld grenzt innerhalb der Gruppe nach Mass oder Werkstoff ein — nötig,
  weil viele Regie-Positionen als Paar 250/330 vorliegen.
- **„Alle angezeigten setzen"**: was sichtbar ist, wird gesetzt. Nichts
  Unsichtbares — der Knopf respektiert Gruppen-, Such- und „nur offene"-Filter.
- **`lfGruppenVorschlag()`**: die häufigste bereits gewählte Position derselben
  Gruppe (gespeicherte **und** offene Zuordnungen) schlägt jede Textähnlichkeit.
  Genau der gemeldete Fall: die Bewertung zieht „Rinnen…" zu Rinnenwinkel und
  Rinnenboden; **eine** Handzuordnung genügt, und die Gruppe weiss es.
  Andere Gruppen lernen davon **nicht** mit.
- `rmatBewerte()` in js/57 wurde **bewusst nicht angefasst** — sie hängt an der
  Massaufnahme → Regierapport-Übernahme. Das Gruppenmuster löst den Fall, ohne
  eine geteilte Bewertung zu verstellen.

### v3.234: Die Brücke Lieferantenartikel → Regie-Position

Ansage: „die artikel aus unserer regieliste decken sich viele mit der bteam
liste... aber nicht alle." / „Ja, bau die brücke."

**Nachgemessen: die beiden Listen sind zwei EBENEN, nicht zwei Fassungen.**
Regie = `„Rinnenseiher, alle Materialien"` (Abrechnungsposition),
B-Team = `„Rinnenseiher 60 mm Stahl verzinkt"` (Artikel). **Das Verhältnis ist
n:1 und nie 1:1** — deshalb wird verbunden, nicht zusammengeführt.

- Spalte `lieferanten_artikel.material_id` → `materials(id)`, ON DELETE SET NULL.
  **NULL ist ein gültiger, erwarteter Zustand** („nicht alle").
- Trigger `lieferanten_artikel_regie_pruefen_trg`: der FK prüft nur, *dass* es
  die Zeile gibt, nicht *wem* sie gehört. Ohne ihn liesse sich auf die
  Regie-Position einer anderen Firma zeigen.
- Funktion `lieferanten_zuordnen(jsonb)` für viele Zuordnungen in einem Aufruf,
  **bewusst ohne `security definer`** — RLS, Firmen-Grenze und Trigger greifen
  wie bei einem gewöhnlichen update.
- **`materials` wird nur gelesen**, über `lagArtikelListe()` (js/59).
- Vorgeschlagen wird mit `rmatVorschlaege()`/`rmatIstSicher()` aus js/57 — der
  vorhandenen Bewertung. Angepasst ist nur: die Einheit ist dort ein harter
  Filter, Lieferantenartikel haben keine, deshalb werden **beide** Klassen
  gefragt, die für Ware in Frage kommen (Stück 182, Länge 81).
- **Vorgewählt wird nur, wo die Bewertung deutlich führt.** Ein vorgewählter
  Halbtreffer wäre schlimmer als gar keiner.

### VERBINDLICH: welche Materialliste wofür da ist

Ansage des Anwenders (30.09.2026): „unsere regiematerialliste soll nur für den
regierapport und die regieofferte dienen und die lieferantenmaterialliste für
den rest".

Es gibt **drei** Listen, nicht zwei. Sie dürfen nicht vermischt werden:

| Liste | Tabelle | Zeilen | Wofür – und NUR dafür |
|---|---|---|---|
| **Werkstoff** | `measurement_materials` | 16 | Massaufnahme → Berechnung → Zuschnitt → Reservierung. Coil und Blech (Titanzink 0.7 …), samt Dehnungsabständen |
| **Regiematerial** | `materials` | 380 | **nur** Regierapport und Regieofferte. Eure EDV-Nummern, eure Preise |
| **Lieferantensortiment** | `lieferanten_artikel` | 439 | Handelsware: Bestand, Barcode, Mindestbestand, Einkaufsliste |

Nachgemessen an den Fremdschlüsseln (nicht angenommen):
`material_reservierungen.material_id` → `measurement_materials`,
`lagerbestand.material_id` → `measurement_materials`,
`lager_varianten.material_id` → `materials`.

**Massaufnahme, Berechnung, Zuschnitt und Ausmass fassen `materials` nicht an** –
sie waren nie dort. Die Liste `measurements.rapport_material` (js/57) trägt zwar
EDV-Nummern, ist aber ausdrücklich *Material für den Regierapport* und damit
regelkonform.

**Offen und NICHT entschieden:** `lager_varianten` (381 Produkte) sitzt auf
`materials` und ist praktisch 1:1 dessen Spiegel. Nach der Regel oben wäre das
Handelsware und gehörte ins Lieferanten-Lager. Das widerspricht aber der früheren
Ansage „die alte lagerverwaltung und die regiematerialliste nicht anfassen".
**Ohne ausdrückliches neues Ja des Anwenders wird daran nichts geändert.**

### v3.233: Preis am Lieferantenartikel

Ansage: „Ich denke wir können schon starten bevor ich die preise habe."

- Spalten `preis` (≥ 0 oder NULL) und `preis_stand` (Migration
  `lieferanten_artikel_preis`). Kommt die Preisliste des Händlers, ist sie ein
  gewöhnlicher Excel-Upload in eine Spalte, die es schon gibt.
- **Kein Preis ist nicht 0.** Ohne Preis rechnet die Einkaufsliste die Position
  nicht mit und sagt, wie viele ihr fehlen; ohne jeden Preis steht gar keine
  Summe da. Ein Preis von 0 dagegen ist ein Preis („gratis") und zählt mit.
- `preis_stand` setzt der **Trigger**, nur wenn sich der Preis wirklich ändert –
  sonst würde ein Import mit 400 unveränderten Zeilen alle Preise auf heute
  datieren. Über ein Jahr alte Preise werden in der App als solche benannt.

### v3.232: Von Hand auf die Einkaufsliste

Ansage des Anwenders: „Wo kann ich etwas in den einkaufswagen legen?" – bis
v3.231 nirgends. Das 🛒 versprach ein Hinzufügen, das es nicht gab.

- Neue Tabelle `lieferanten_einkauf` (Migration `lieferanten_einkauf_von_hand`):
  `artikel_id`, `menge` (>0), `grund`, `erledigt_am`, `erledigt_von`.
  **`UNIQUE (company_id, artikel_id) WHERE erledigt_am IS NULL`** – je Artikel
  genau ein offener Wunsch; ein zweites Setzen ändert die Menge.
- **Kein DELETE-Recht**: Abhaken setzt `erledigt_am`, die Zeile verschwindet von
  der Liste und bleibt nachvollziehbar. Danach ist der Artikel wieder setzbar.
- Kein Feld am Artikel: der Wunsch hat Menge, Grund, Urheber und ein Ende – das
  ist ein Vorgang. Ausserdem müssen die beiden Herkünfte unterscheidbar bleiben.
- **Die Mengen beider Herkünfte werden ADDIERT**, nicht die grössere genommen.
  Beide Bedarfe sind echt und unabhängig. Jede Zeile nennt beide Anteile –
  in der Liste und im verschickten Text, aus einer Funktion (`lfHerkunftText`).
- Symbol: **🛒 = hinzufügen, 📋 = ansehen**. Der Listen-Knopf zählt die ganze
  Liste, nicht nur die unterschrittenen Mindestbestände.
- Nebenbei behoben: die Lieferanten-Überschrift in der Einkaufsliste trug seit
  v3.231 die Klasse `a2-abschnitt-titel`, die es in keiner CSS-Datei gibt.

### v3.231: Lieferanten-Lager statt „Lager B-Team", Mindestbestand, Einkaufsliste

Umbenannt wurde, solange es billig war: 439 Artikel, **null Buchungen**. Danach
wäre es eine Migration statt eines Umbenennens gewesen.

- Tabellen: `bteam_artikel` → `lieferanten_artikel`, `bteam_bewegungen` →
  `lieferanten_bewegungen` (samt Indizes, Regeln, Trigger, Funktion, Policies).
- Neue Spalte `lieferant`, not null, Regel „nicht leer". **Der Schlüssel lautet
  jetzt `UNIQUE (company_id, lieferant, artikelnr)`** – Artikelnummern sind nur
  je Lieferant eindeutig. Ohne den Lieferanten darin hätte die nächste
  Preisliste die Artikel des ersten Händlers stillschweigend überschrieben.
- Der **Barcode bleibt ohne Lieferant eindeutig**: ein EAN zeigt auf ein
  physisches Produkt, nicht auf einen Händler – und beim Scannen muss
  entscheidbar bleiben, welcher Artikel gemeint ist.
- Neue Spalte `mindestbestand` (not null, 0, „nicht negativ"). **0 heisst „nicht
  überwacht"**, nicht „Mindestbestand null".
- Dateien: `js/82-bteam-lager.js` → `js/82-lieferanten-lager.js`,
  `daten/bteam-sortiment.json` → `daten/sortiment-bteam.json`, Prüfstand →
  `pruefstand-lieferanten-lager-v3-231.js` (73 Fälle).
- Gemeinsamer Excel-Import `initExcelImport` (js/08) hat zwei **freiwillige**
  Zusätze – bestehende Aufrufer unverändert: `cfg.onConflict` für Regeln, die
  nicht `company_id,<schluessel>` lauten, und `cfg.festwerte()` für Angaben, die
  für die ganze Datei gelten (hier der Lieferant). Fehlt die Angabe, wird nicht
  importiert.
- Einkaufsliste zeigt **Fehlmenge und Bestellmenge**: aufgerundet auf die VPE.
  Der Text zum Verschicken entsteht aus derselben Liste.

Offen aus der Durchsicht, noch nicht entschieden: Scannen im Regierapport;
Brücke Katalogposition ↔ Lieferantenartikel (**berührt `materials`, braucht
ausdrückliches OK**); Preisliste beim Händler anfragen (ohne Preise bleibt jede
Bestell- und Kalkulationsfunktion Fassade); Projektbedarf → Reservierung,
angedockt an Berechnung/Zuschnitt und **nicht** an die Offerte.

### v3.218: es gibt nur noch EINE Ansicht

Ansage des Anwenders: „Klassische alte ansicht kann komplett weg." Entfallen sind
der klassische Startbildschirm in `index.html` (Willkommen, Firmenzeile,
Aufgabenkarte, die Karte „Was möchtest du tun?", `#topUserBar`), der Umschalter
(`a2Setzen`, `#a2Ein`, der gemerkte Wert `sd_ansicht2`), der Weg zurück unter
„Mehr", die Geräte-Einstellung „Aufgaben zugeklappt/geöffnet" und die CSS-Regeln,
die die eine Ansicht zugunsten der anderen ausblendeten.

**Was bewusst geblieben ist – und warum:**

- `#appAnker` in `index.html`: neun Knöpfe (`startOpenProjects`, `navWerkstatt`,
  `navLagerverwaltung`, `openGlobalSearch`, `settings`, `openFeedback`,
  `navAdminMeas`, `navSystemAdmin`, `logout`) plus `#startLogo` und
  `#appVersion`, alle `hidden`. Das ist **keine Ansicht**: es sind die Stellen,
  an denen die Fachmodule seit jeher ihren Handler anmelden (`$("settings")
  .onclick` in js/07 usw.), und zwei Datenträger. Vier davon führen ausserdem
  die Sichtbarkeit (`werkAktiv()`, `lagerverwaltungZugriff`, `isAdmin`,
  `isSystemAdmin` setzen ihr `hidden`; `a2KnopfSichtbar()` in js/70 liest genau
  das). Sie zu entfernen hiesse, neun Module umzubauen, ohne dass sich für den
  Anwender etwas ändert.
- Die Klasse `a2-an` am `<html>`-Element: an ihr hängen rund dreihundert
  CSS-Regeln. Sie wird beim Start einmal gesetzt. Mehrere Prüfstände nehmen sie
  kurz ab, um zu belegen, dass eine gemessene Form wirklich von dort kommt.
- `a2Aktiv()` gibt `true` zurück und bleibt: die Funktion wird an vielen Stellen
  gefragt, und dort soll kein zweiter Weg entstehen.
- `renderAufgaben()` zeichnet nichts mehr, bleibt aber als Zeichen „die Aufgaben
  haben sich geändert" (acht Aufrufe in js/45, einer in js/07; js/70 hängt sich
  daran).

### Zwei Datenbank-Regeln, die seit v3.206 gelten (und geprüft gehören)

Beide kamen aus dem App-Audit und sind in der Datenbank umgesetzt. Die
Prüfstände können sie NICHT nachweisen – sie laufen ohne Datenbank. Nachsehen
lässt sich das über den Supabase-Advisor oder mit den SQL-Abfragen darunter.

**1. `auth.uid()` immer als `( SELECT auth.uid() )`.**
Nackt geschrieben ruft PostgreSQL es für jede geprüfte Zeile neu auf; in
Klammern einmal je Anweisung. Bedeutungsgleich, weil `auth.uid()` als STABLE
deklariert ist. Nachsehen:

```sql
select tablename, policyname from pg_policies
where schemaname='public'
  and ( (qual       ~* 'auth\.(uid|jwt|role)\(\)' and qual       !~* '\(\s*select\s+auth\.')
     or (with_check ~* 'auth\.(uid|jwt|role)\(\)' and with_check !~* '\(\s*select\s+auth\.') );
-- muss LEER sein
```

**2. Jede `tenant_boundary_*` und `feature_boundary_*` muss RESTRICTIVE sein.**
PERMISSIVE heisst ODER (eine zusätzliche Erlaubnis), RESTRICTIVE heisst UND
(eine echte Schranke). Eine Schranke, die PERMISSIVE steht, ist keine – sie
öffnet. Genau das war bei `tenant_boundary_abwicklungen` der Fall (als
einziger von 35), siehe `Abschlussbericht_v3.206_Datenbank.txt`. Nachsehen:

```sql
select tablename, policyname from pg_policies
where schemaname='public'
  and (policyname ilike '%boundary%' or policyname ilike '%tenant%')
  and permissive='PERMISSIVE';
-- muss LEER sein
```

**3. Wer ohne eigene Prüfung arbeitet, darf nicht über die API erreichbar sein.**
Seit v3.217, ausgelöst vom Supabase-Advisor: 32 `SECURITY DEFINER`-Funktionen
sind für Angemeldete aufrufbar – darunter `system_admin_delete_company_data`.
Nachgesehen: **alle** prüfen intern selbst (`is_system_admin()`, `is_admin()`,
`auth.uid()` …), es war kein Loch offen. Die Abfrage hält diesen Zustand fest.
Dazu die zweite Hälfte: Trigger-Funktionen (Rückgabetyp `trigger`) gehören
überhaupt nicht in die API – sie werden nur von ihrem Trigger gerufen. Bei
zehn von ihnen stand das EXECUTE-Recht trotzdem bei `authenticated`/`anon`
bzw. `PUBLIC`; es wurde entzogen (`service_role` behält es). Dass Trigger
danach weiterhin feuern, ist nachgewiesen: eine Buchung mit fremder Firma
wurde von `enforce_lager_bewegung_firma` abgewiesen wie zuvor (PostgreSQL
prüft `EXECUTE` beim ANLEGEN des Triggers, nicht beim Auslösen). Nachsehen:

```sql
select 'REGEL 3a' as regel, p.oid::regprocedure::text as funktion
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and p.prokind='f'
  and p.prorettype <> 'pg_catalog.trigger'::regtype
  and not (p.prosrc ~* 'is_system_admin|is_admin|has_permission|my_company_id|mw_firma_ok|auth\.uid')
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
union all
select 'REGEL 3b', p.oid::regprocedure::text
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prorettype='pg_catalog.trigger'::regtype
  and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
       or has_function_privilege('anon', p.oid, 'EXECUTE'));
-- muss LEER sein
```

**Kein Fehler, sondern Absicht:** `password_reset_tokens` hat RLS an und
**keine** Policy. Das ist richtig so – nur die Edge Function (service_role)
schreibt und liest dort; über die API kommt niemand an die Tabelle. Der
Supabase-Advisor meldet das als INFO („RLS Enabled No Policy"). Wer das
„repariert", indem er eine Policy hinzufügt, macht die Tabelle erreichbar.

**Offen, bewusst nicht erledigt:** „Leaked Password Protection" in Supabase
(Authentication → Providers → Email) ist aus. Das ist eine Dashboard-
Einstellung, kein Code – sie lässt sich von hier aus nicht umlegen, und sie
setzt den Pro-Plan voraus, den der Betrieb nicht hat (Stand 28.09.2026).

## ARCHITEKTUR

Spengler-DIGITAL ist eine modulare Web-App.

### Frontend
- `index.html` – Einstiegspunkt
- `js/` – modulare JavaScript-Fachlogik
- `css/` – Styles
- `sw.js` – Service Worker / Offline / App-Cache
- `manifest.json` – PWA

### Backend
- Supabase
- PostgreSQL
- Auth
- Storage
- Row Level Security (RLS)
- Edge Functions

`sw.js` enthält aktuell die JavaScript-App-Shell der Module `01` bis `78`.

## ZENTRALER WORKFLOW

```text
PROJEKT
→ OFFERTE
→ MASSAUFNAHME
→ BERECHNUNG
→ MATERIAL & ZUSCHNITT
→ ZUSCHNITT
→ STÜCK ABHAKEN
→ WERKSTATT / RÜSTLISTE
→ RÜSTEN / MONTIEREN
→ AUSMASS