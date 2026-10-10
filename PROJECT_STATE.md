# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.291`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.291 — Aufgabenliste „Heute“ zuverlässiger (Auftrag Aufgaben-/Benachrichtigungszentrale)

Auftrag (10.10.2026, direkt auf main): vorhandene Zentrale vervollständigen, nichts doppelt bauen.
**Bestand (Code):** js/45 leitet die persönlichen Aufgaben aus `measurements` ab (Aufnehmer →
freigeben/zuweisen/gerüstet-Monteur/abschliessen, Rüster → zu_ruesten, Monteur → zu_montieren), kein
zweites System, RLS/Mandant unverändert, Klick führt zur Massaufnahme, Liste lädt nach jeder
Statusaktion nach (`mwNachAenderung`), Admin-Gesamtübersicht getrennt, Stellvertretungsfreigabe v3.290
unverändert (die persönliche Liste bleibt bewusst „meine“). **Belegte Lücken, jetzt geschlossen:**
(A) archivierte Massaufnahmen / Massaufnahmen in archivierten Projekten erschienen als offene Aufgaben
(`archived=false` in allen drei Abfragen, Projektfilter über `allProjects`); (B) ein gescheiterter Abruf oder
Offline-Zustand hielt die Liste still auf altem Stand (jetzt Hinweis „… Stand von HH:MM Uhr“,
`aufgabenStandHinweis`, Anzeige in `a2SeiteHeute`); (C) kein Nachladen beim Zurückkehren in die App
(`visibilitychange`/`online`, ab 60 s Alter, `aufgabenBeiRueckkehr`). Keine Migration, keine neue Tabelle.
Prüfstand `aufgaben-zuverlaessig-v3-291` (15; vier Mutationsproben rot). Nicht live gegen Supabase geprüft.
**Bewusst nicht gebaut:** Push-Benachrichtigungen, „Änderungen seit letztem Besuch“ (kein Nachweis, dass
sie zuverlässig aus dem Verlauf herleitbar sind), Glocke/Zähler.

### v3.290 — Freigabe: Admin darf stellvertretend freigeben

Auftrag (Massaufnahme-Workflow) + Ansage 10.10.2026: „Ja, Admin darf stellvertretend freigeben."
**Bestandsaufnahme:** Der Workflow war vollständig vorhanden (sieben Status, getrennte Rollen,
Freigeber/Zeit, Verlauf über `audit_log` und `measurement_versionen`, Aufgaben aus dem Status,
Admin-Übersicht, serverseitige RPCs). Einzige echte Lücke: `measurement_freigeben` liess nur den
Aufnehmer zu.
**Datenbank (live eingespielt, Migration `v3290_freigabe_stellvertretung_admin`, Datei
`supabase/migrations/…`):** nur `measurement_freigeben()` — Berechtigung „Aufnehmer ODER
`is_admin()`", NACH `mw_firma_ok` (Mandantengrenze). Policies/RLS unverändert. Serverseitig mit vier
Fällen getestet (Rollback, keine Datenänderung: Zeile war abgeschlossen → Abbruch vor jeder
Änderung): fremder MA abgewiesen, Admin gleiche Firma Berechtigung ok, Admin fremde Firma „nicht
gefunden", Aufnehmer ok. **Nicht live geprüft:** eine echte Freigabe durch den Admin.
**Client:** `js/44 mwSchrittDarfIch` (Aufnehmer || Admin), Rückfrage „Du gibst stellvertretend für X
frei", `mwStellvertretungText` bei „Freigegeben von"; Liste/Als Nächstes folgen automatisch.
`freigegeben_von` = Admin ≠ `created_by` → im Verlauf erkennbar. Prüfstand
`freigabe-stellvertretung-v3-290` (9; zwei Mutationsproben rot), `workflow-v3-05` umgestellt.
Zusammenfassung: `Zusammenfassung_v3.290_Freigabe_Stellvertretung.txt`.

### v3.289 — Übersichtlichkeit: Projektliste und Projekt-Übersicht (Branch `ui/uebersichtlichkeit-cockpit`, NICHT auf main)

Auftrag (10.10.2026, Datei „Auftrag_Claude_Spengler-DIGITAL_Uebersichtlichkeit"): Oberfläche
gezielt vereinfachen, ohne Abläufe zu beschädigen; zuerst nur Projektübersicht und Cockpit;
Entwicklung auf Feature-Branch, nicht auf main (Auftrag überstimmt hier die Regel „immer main").
**Befund (Code):** `a2SeiteProjekte` (js/70) war schon schlank (Suche, Liste, Neues Projekt,
Archiv und Filter) — nur die Zeile war knapp. `a2RegUebersicht` (js/70) zeigte oben den grossen
Ablauf, erst danach den Nächsten Schritt; Kennzahlen als grosse bunte Kacheln; Stammdaten mit
vollbreitem Bearbeiten-Knopf; „Material & Zuschnitt" als vollbreiter Knopf. Die Kopfzeile trägt die
Projektidentität bereits (Adresse, Name, Auftrag) — unverändert.
**Umgesetzt (nur Markup/CSS, keine Fachlogik, keine IDs/Data-Attribute entfernt):** Reihenfolge
Nächster Schritt → Hinweise (nur wenn vorhanden, Zeilenumbruch-Lücke behoben) → Ablauf (leise,
kleinere Marken) mit kleinem Schnellzugriff „Material & Zuschnitt" → Stand (kleine Kennzahlen) →
Stammdaten (kompakt, „Stammdaten bearbeiten" klein rechts, ≥ 40 px). Projektliste: Klasse
`a2-zeile-projekt` (≥ 50 px, 15 px Titel, Umbruch langer Namen). Neue CSS-Regeln am Ende von
`css/05-ansicht2.css` mit vorhandenen Variablen. Nicht angefasst: Navigation, Heute-Seite, Cockpit-
Rückkehrlogik (js/24), Formulare, Druck, RLS.
Prüfstand `uebersichtlichkeit-v3-289` (21; Reihenfolge-Mutation rot) — misst Reihenfolge, Vollständigkeit,
kein seitliches Scrollen und Touch-Höhen bei 360/412/768 px (Chromium kopflos, **kein echtes Gerät**).

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
