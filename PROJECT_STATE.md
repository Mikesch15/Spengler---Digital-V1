# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.263`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.262 — Bleilappen und der fehlende Lattenabstand

Zwei Meldungen des Anwenders am 6.10.2026.

**1. Bleilappen: 6 statt 8.** Bei 990 mm Seitenlänge und 355 mm Lattenabstand
zeigte die App 6. Gerechnet wurde je **Zuschnittstück** und **aufgerundet**
(990/355 = 2,79 → 3 je Seite). Damit zählte die Teilung am Knick mit und die
Lattung wurde verfehlt.

Die Regel des Betriebs, wörtlich erfragt: Vorderteil (Mass C + G) und
Hinterteil (Mass N + R), **beide abgerundet**, mal zwei für links und rechts.
Der Fall: vorne 1215 → 3, hinten 455 → 1, je Seite 4, gesamt 8.

**Eine Verallgemeinerung gegenüber dem Wortlaut**, bewusst: statt `C + G`
rechnet die App `C + Seitenlänge`. Beim durchgehenden Seitenteil ist die
Seitenlänge genau G — dasselbe. Bei zwei separaten Seitenteilen ist sie
`G + I − Überlappung`; mit `C + G` wäre die Strecke dort zu kurz. Der
Prüfstand zeigt beides: 990 durchgehend und 600 + 500 − 110 ergeben dieselben
8.

**2. Der Lattenabstand fehlte im PDF** — bei Dachfenster **und** Kamin. Er
stand nur als Fussnote unter der Bleilappen-Tabelle, und die fällt ganz weg,
sobald die Bleilappen nicht berechenbar sind. Beide haben jetzt eine eigene
Zeile in den Angaben, wie die Einfassung rund längst.

**„Und prüfen ob das sonst noch irgendwo fehlt."** Dafür gibt es
`pruefstand-blatt-vollstaendig-v3-262`: er erzeugt für **jeden** Druckfall das
fertige Blatt (indem er sich an `pdfDruckVorbereiten` hängt) und hält jeden
gespeicherten Zahlenwert dagegen. Gefunden hat er genau diese eine Lücke.

Zwei Dinge, die beinahe zu **erfundenen** Fehlern geführt hätten:

- Zahlen stehen im Blatt in Schweizer Schreibweise (`1'005`, `42,5`). Ohne
  Entfernen der Trennzeichen meldete die Probe vier von sieben Treffern
  falsch.
- Vier weitere Treffer sind Absicht: Winkel werden umgerechnet gedruckt
  (Kamin 115/65 statt 25, Einfassung rund 120 statt 30), Restschwelle und
  Gehrungszugabe sind Einstellwerte. Sie stehen als **Ausnahmen mit Grund**
  im Prüfstand — und jede wird selbst geprüft: deckt eine keinen echten Fall
  mehr, fällt das auf, statt eine spätere Lücke durchzulassen.

**Offen:** Kamin und Anschlussblech waren für die neue Rundungsregel
mit angewählt. In `js/20` steht aber die ausdrückliche Anweisung des Betriebs
vom 05.09.2026, dort **aufzurunden**, beim Kamin dasselbe seit v2.70. Eine
datierte Entscheidung wird nicht still umgedreht — nachgefragt, Antwort steht
aus.

### v3.261 — die Wahl war unsichtbar, kurze Masse app-weit

Zwei Meldungen des Anwenders zu v3.260: „wo kann jetzt mit oder ohne knick
ausgewählt werden? Ich sehe es nirgends." und, zugesagt, die kurzen Masse
app-weit.

**1. Die Wahl war da, aber nicht zu sehen.** Die beiden Knöpfe standen seit
v3.260 oben im Register *Fenstermasse*. Nur: `class="gray blue"` ergibt
**grau**. In `css/01-basis.css` steht `.blue` auf Zeile 27, `.gray` auf Zeile
29, gleiche Spezifität — die spätere gewinnt. Beide Knöpfe sahen identisch
aus, und zwei gleiche graue Knöpfe liest niemand als Wahl. Es wird jetzt nur
noch **eine** Klasse gesetzt. Dieselbe Stelle steckte in *Linke Seite / Rechte
Seite* bei Dachfenster **und** Kamin — drei Schalterpaare, seit jeher ohne
ablesbaren Zustand. Eine Probe über alle `js/`-Dateien hält fest, dass kein
Knopf beide Klassen zugleich trägt.

**2. Kurze Masse, app-weit.** Ist ein Mass kürzer als seine eigene Zahl —
`D = 42` über 17 Bildpunkten, die Zahl braucht 50 — stand sie trotzdem mittig
und ragte beidseitig über die Masshilfslinien hinaus, die sie dann
durchstrichen. Die Regel steht jetzt in `anbMassTextLage` /
`anbMassTextLageSenk` in `js/20` und gilt damit für **alle zwölf Arten**:
passt die Zahl, bleibt sie mittig; passt sie nicht, rückt sie daneben.

**Auf welche Seite**, entscheidet die Mitte der Zeichnung: nach innen. Der
erste Anlauf wich immer nach rechts aus — damit lag `M = 120` genau auf der
Führungslinie der Abdeckkappe. Aussen sitzen Kanten, Aufbüge und Fahnen; nach
aussen auszuweichen legt die Zahl in den vollsten Teil des Bildes.

**Dieselbe Funktion liefert auch den belegten Platz**, und die Bandzuteilung in
`js/66` rechnet damit statt mit einer eigenen Annahme. Rechnete sie weiter
„immer mittig", teilte sie nach einer Lage ein, die die Zeichnung gar nicht
mehr benutzt.

**3. Gemessen.** Vorher wurden in der Dachfenster-Zeichnung **sechs** Zahlen
von Linien durchschnitten (M, H, C, D, F, Q), jetzt keine. Die neue Probe A3
im Prüfstand schneidet jede Textkiste gegen jede gezeichnete Strecke
(Liang-Barsky) und hat eine Gegenprobe; A prüft Zahl gegen Schnitt, A2 Linie
gegen Linie — A3 schliesst die Lücke dazwischen, in die `M = 120` gefallen war.

**Nebenbei korrigiert:** die Gegenprobe in A setzte den Probetext in die Mitte
des Bildausschnitts. Die lag anfangs bequem im Rumpf und rutschte heraus,
sobald die Bänder aussen herum wuchsen — ab da hätte die Gegenprobe nur noch
sich selbst geprüft. Sie hängt jetzt am Mittelpunkt einer echten Blechlinie.

### v3.260 — der Schnitt der Dachfenstereinfassung

Meldung des Anwenders zum Rüstblatt: „man sieht nicht sofort welches mass für
welche länge steht. Die masslinien/masse überschneiden sich teilweise und
stehen in der zeichnung drin."

**1. Warum die Masse aufeinanderlagen.** Die Höhenbahnen der Bemassung standen
in **Millimetern** (34, 72, 56, 28) und wurden deshalb mitskaliert. Bei einem
langen Dachfenster schrumpften sie auf wenige Bildpunkte zusammen. Gemessen am
Fall des Anwenders: `F = 100` und `D = 42` überlappten sich um 80 px². Jetzt
stehen die Bahnen in **Bildpunkten**, und welches Mass in welche Bahn kommt,
wird **gerechnet** statt eingetragen: jedes bekommt die unterste Bahn, in der
es — samt Textbreite — keinem schon gesetzten Mass in die Quere kommt. Damit
ist die Zeichnung bei *jeder* Masskombination überschneidungsfrei, nicht nur
bei der, die ich beim Bauen vor Augen hatte.

**2. Warum das niemand gemerkt hat.** `pruefstand-vermassung-v3-32` misst
genau das — Beschriftung gegen Beschriftung, in echtem Chromium, über „alle
zwölf Arten". Nur: in `faelle-druck.js` fehlte die **Dachfenstereinfassung**.
Der Kopf der Datei behauptete „alle zwölf Arten", die Liste hatte elf. Der
Prüfstand war grün, weil der Fall nie gezeichnet wurde. Beide Bauarten stehen
jetzt drin; mit dem alten Code schlägt der Prüfstand fehl (gegengeprüft).

**3. Was der Prüfstand nicht prüfte.** „Keine Masse direkt im Schnitt" war
durch nichts abgedeckt. Neu: `pruefstand-dachfenster-schnitt-v3-260` misst den
Hüllkasten der Blechlinien und hält jede Beschriftung dagegen — mit Gegenprobe
(ein Text mitten im Rumpf *muss* gefunden werden, sonst misst die Probe nur
nichts). Mit dem alten Code: `H = 130` steht mit 190 px² im Schnitt,
`O / P = 10 / 12` mit 289 px².

**4. Neue Bauart: durchgehendes Seitenteil mit Knick.** Auf Nachfrage
entschieden: `B` ist dann die **ganze Länge**, `H` (Überlappung) und `I`
entfallen. Aus acht Zuschnitten werden sechs. Die Bauart steht an **einer**
Stelle (`dfaMassGilt`), auf die sich Formular, Kontrolle, Übersicht und
Zeichnung gleichermassen beziehen. Vorgabe bleibt „separat", und eine Aufnahme
ohne das Feld ist eine mit separaten Seitenteilen — jede gespeicherte Aufnahme
verhält sich unverändert (eigene Probe).

**5. Die verdeckte Oberkante begann zu weit vorne.** Sie war ab dem *Fuss* der
Trapezschräge gestrichelt. Der Fuss liegt auf dem Dach (Höhe 0), die Oberkante
auf Höhe `aufVorne` — dazwischen läuft die Schräge noch darunter durch und
verdeckt nichts. Gestrichelt gehört sie erst ab der **Kreuzung**. Im geprüften
Fall 620 mm statt 885 mm, also 265 mm zu früh.

**6. Nebenbefund auf dem Rüstblatt.** Dort stand „Überlappung waagr. / senkr.
0 / 0 mm" — `ueberlappungT` und `ueberlappungH` gibt es im Datenmodell der
Dachfenstereinfassung gar nicht, sie kamen aus einer anderen Art. Die Zeile
nennt jetzt die Bauart mit der tatsächlichen Überlappung. Ausserdem wurde
`seitenteilArt` beim Speichern vergessen — ohne das Feld wäre jede mit Knick
erfasste Aufnahme beim Öffnen still auf „separat" zurückgefallen.

## DAUERHAFT GÜLTIGE REGELN

Alles hier gilt weiter – es ist keine Historie und gehört deshalb nicht ins
Changelog.

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

---

## ÄLTERE VERSIONEN

Die Versionsgeschichte von **v3.218 bis v3.255** steht in
`CHANGELOG_HISTORIE.md`. Sie stand bis v3.259 hier und machte rund 80 % der
Datei aus.

**Warum sie weg ist:** `PROJECT_STATE.md` ist laut `CLAUDE.md` die
verbindliche Zustandsquelle und wird deshalb bei fast jeder Aufgabe gelesen.
Gemessen am 5.10.2026 war sie auf **68 000 Zeichen** gewachsen (~17 000
Token) und wuchs mit **~2 000 Zeichen je Version** weiter – in zwölf
Versionen um 52 %. Wer den aktuellen Stand wissen will, zahlt sonst jedes Mal
für die Geschichte mit.

Hier stehen ab jetzt: der aktuelle Stand, die **letzten drei Versionen** und
die dauerhaft gültigen Regeln. Alles Ältere wandert beim nächsten
Versionswechsel nach `CHANGELOG_HISTORIE.md` – dieselbe Aufteilung, die
`CLAUDE.md` für sich selbst vorschreibt.

**Die Architektur und der zentrale Arbeitsablauf standen hier ebenfalls** –
als zweite Fassung dessen, was in `CLAUDE.md` Abschnitt 2 und 4 steht. Die
Kopie war bereits falsch („App-Shell der Module 01 bis 78“, während es js/83
gibt). Sie ist gelöscht; eine zweite Wahrheit über die Architektur ist
schlimmer als keine.
