# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.239`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

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