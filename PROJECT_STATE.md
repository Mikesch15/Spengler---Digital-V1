# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.363`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.363 — Rotes Ausrufezeichen bei ungewöhnlichem Mass

Anlass: Beim Dachfenster Ost war „seitlich unter Deckmaterial“ mit 60 statt der üblichen 50 erfasst (Tippfehler, erst an der zu grossen Abwicklung gemerkt). Wunsch: nur ein **rotes Ausrufezeichen** am Feld, das man antippen kann, um das Problem zu sehen.
**Umsetzung (js/86-plausibilitaet.js, neu; index.html, sw.js, css/01):** Quelle des „Üblichen“ ist das Zählwerk (Sicht `messwert_nutzung`, js/71) – keine feste Annahme im Code. Das Zeichen erscheint, wenn es ≥ 5 bisherige Messungen des Feldes gibt, EIN Wert ≥ 70 % davon ausmacht, der eingetragene Wert ein anderer ist und selbst < 20 % der Fälle ausmacht; wechselnde Masse (a, d) lösen nie etwas aus. Antippen zeigt „Ungewöhnlicher Wert: 60. Üblich ist 50 (bei 9 von 11 bisherigen Aufnahmen); 60 kam bisher 1× vor …“, nochmal Antippen klappt zu. Kein Fehler, nichts blockiert, die Eingabe bleibt unverändert. Geprüft werden Dachfenster (f, g links/rechts, Richtwert-Felder) und Kamineinfassung (Richtwert-Felder). **Datenbank (additiv, geprüft):** die Sicht `messwert_nutzung` zählt jetzt für das Dachfenster auch f und g (Migration „messwert_nutzung_dachfenster_seitenmasse“, Datei `supabase/migrations/v3363_…sql`; geändert eine Zeile ARRAY['a','d'] → ['a','d','f','g']; Spalten, Rechte und `security_invoker=true` unverändert – nachgeprüft). Prüfstand `plausibilitaet-v3-363` (21; alle Schwellen einzeln durch Mutationen abgesichert). Bericht: `ABSCHLUSSBERICHT_Plausibilitaet_v3.363.txt`.

### v3.362 — Tablett: Zeichnung wählbar (ganz / nur Lochausschnitt), Gesamtmasse bemasst

Wunsch: Bei der Zeichnung des Tabletts soll wählbar sein, ob das ganze Tablett oder nur der Lochausschnitt mit den Massen angezeigt/gedruckt wird; Gesamtlänge und Gesamtbreite sollen in beiden Fällen bemasst und zu sehen sein.
**Umsetzung (js/77, js/78, index.html):** Auswahlfeld „Zeichnung“ im Abwicklungsdialog beim Tablett (`abw_tab_ansicht`: Ganzes Tablett / Nur Lochausschnitt mit Massen; gilt für Vorschau, Druck, SVG und DXF, wird nicht mit der Abwicklung gespeichert; Rechenwerte unverändert). `abwTablett` liefert `ansicht`, `gesamtLaenge`/`gesamtBreite` und die Geometrie `zeichnungLoch` (Loch in wahrer Grösse mit 35 mm Blechstreifen rundum, Weg zur Kante GEKÜRZT dargestellt). Eine Zeichen-Geometrie für alles, was zeichnet/druckt/exportiert: `abwZ(r)`. Bemassung (`abwMassSvg`, beide Zeichnungen): Mitte Loch bis vorne/hinten, Gesamtlänge (links aussen), Gesamtbreite (unten), Kreuz in der Lochmitte; die Zahlen sind immer die wahren Masse, im Ausschnitt mit Unterbrechungszeichen. Druck 1:1: Bemassung auf dem Blatt (Schrift 4 mm), Papierberechnung mit Platz dafür (ganzes Tablett auf A4: 9 statt 6 Blatt, weil 350 + 20 mm nicht mehr in zwei Spalten passen; Ausschnitt: 1 Blatt A3). DXF: Layer BEMASSUNG mit vier Texten. Prüfstand `mantelrohr-v3-360` auf 37; angepasst: `abwicklung-papier-v3-193` (A4 hoch 9 Blatt). Bericht: Nachtrag in `ABSCHLUSSBERICHT_Mantelrohr_v3.360.txt`.

### v3.361 — Einfassung rund: Umschläge einzeln, Anreiff in Mass a, Zuordnung firmenweit

Wunsch: In den Einstellungen müssen separat erfassbar sein: Umschlag hinten am 90°-Aufbug, Umschläge seitlich, Anreiff vorne; **Mass a (vorne bis Mitte Rohr) ist inklusive Anreiff**; die Zuordnung Standrohr→Mantelrohr gilt firmenweit.
**Umsetzung:** Einstellungen Einfassung rund (js/21, index.html): `umschlag` = vorne (180°), neu `umschlag_hinten`, `umschlag_seitlich`, `anreiss` (Standard 20/20/18; ältere Geräte-Stände übernehmen beim Laden ihren bisherigen `umschlag` für hinten und seitlich). `einfProfil`: p0→p1 = Anreiff, p1→Mitte Rohr = a − Anreiff (Gesamt a); Umschlag hinten am p4→p5; `einfBerechnen`: Breite mit `umschlag_seitlich`. Tablett (js/77): Länge = vorne + a + b + c + hinten (Anreiff nicht mehr zusätzlich), Breite mit seitlichem Umschlag, Anreiff-Knick liegt in a, Warnung „Loch reicht in den Anreiff“ prüft a − Anreiff; Abwicklungsrechner (js/78/index.html) neue Felder, Vorgaben aus den Einstellungen (js/38). **Folge:** gleiche Eingaben ergeben nun 18 mm kürzere Zuschnitte/Abwicklungen als bis v3.360 (a enthält den Anreiff); gespeicherte Massaufnahmen rechnen beim Öffnen neu, bereits gedruckte Werte bleiben unverändert. **Zuordnung firmenweit:** neue Spalte `app_settings.einfassung_mantel_zuordnung jsonb` (Migration „app_settings_einfassung_mantel_zuordnung“, additiv, Datei `supabase/migrations/v3361_…sql`; Policies unverändert), Knopf „Zuordnung speichern (ganze Firma)“ über `speichereAppSettings`; die lokale Liste aus v3.360 gilt nur ersatzweise. Prüfstand `mantelrohr-v3-360` auf 26; angepasst wegen der neuen Geometrie: `abwicklung-tablett-v3-192`, `abwicklung-papier-v3-193` (Tablett 350×525 passt jetzt auf A2), `einfassung-app-v2-96`. Bericht: `ABSCHLUSSBERICHT_Mantelrohr_v3.360.txt` (Nachtrag).

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

Die Versionsgeschichte von **v3.218 bis v3.312** steht in
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
