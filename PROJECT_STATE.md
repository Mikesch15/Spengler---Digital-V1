# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.286`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.286 — Eigene Dialoge statt Browser-Dialoge

Meldung (9.10.2026, Bildschirmfoto): der Dialog beginne mit „Auf mikesch15.github.io
wird Folgendes angezeigt:“ — muss das sein? **Nein, aber der Kopf gehört dem Browser**
und lässt sich bei `alert()/confirm()/prompt()` nicht weglassen. Ansage: „Ja, das
kannst du alles umsetzen“ (alle ersetzen).
**Neu:** `js/84-app-dialoge.js` mit `appAlert(text)`, `appConfirm(text,{ok,abbrechen,gefahr})`,
`appPrompt(text,vorgabe)` (Promise; Reihe, Escape/Enter, Zurück-Taste = Abbrechen über
`ZURUECK_EXTRA`/`ZURUECK_WEG` in js/54); Markup `#appDialogModal` in `index.html` **vor
den Skripten** (js/54 sucht den Schirm beim Start), CSS `.app-dialog` in `css/01-basis.css`,
Eintrag in `sw.js` UND `index.html`.
**Umbau:** 397 Aufrufe in 38 Dateien mit einem AST-Werkzeug (acorn): `alert(`→`appAlert(`,
`confirm(`/`prompt(`→`await appConfirm(`/`await appPrompt(`, umgebende Funktionen `async`,
Aufrufer der so geänderten benannten Funktionen (`a2FormularVerlassen`,
`einlaufblechZuruecksetzen`, `lfInvMindestAlle`, `lfZuordnenAlleSetzen`) ebenfalls `await`.
Danach von Hand: `await appAlert` vor `location.href` in `js/69`; drei **echte Folgefehler**,
die die Regression gefunden hat — js/15/js/14 (Rinnen-/Skizzen-Übernahme) tauschten das Array
im Handler, und der Wurzel-Handler in js/29/30/31 las es im selben Blubbern **vor** der
Rückfrage-Antwort → neue Hooks `ebaNachUebernahme`/`ebkaNachUebernahme`/`fpaNachUebernahme`.
**Prüfstände:** automatisierte Browser (`navigator.webdriver`) behalten die NATIVEN Dialoge
(sonst müssten ~106 Prüfstände mit `page.on("dialog")` umgebaut werden); `window.__appDialogEcht=true`
schaltet auf die eigenen. `app-dialoge-v3-286` (22; drei Mutationsproben rot) prüft die eigenen
Dialoge einschliesslich eines echten Ablaufs und dass im Quelltext kein nativer Aufruf mehr steht.
Angepasst an „jetzt asynchron“ (nur `await`/Wartezeit, keine Erwartung gelockert): `leiste-ueberall-v3-162`,
`einlaufblech-app-v2-74`, `einlaufblech-konisch-app-v2-76`, `freies-profil-app-v2-77`, `lieferanten-lager-v3-231`.
**Nicht live geprüft:** der Anblick auf dem Handy und der Ablauf gegen echte Daten.
**Dauerregel:** neue Rückfragen/Hinweise nur mit `appConfirm`/`appAlert`/`appPrompt` (der Prüfstand
schlägt bei einem nativen Aufruf an); wer eine Antwort braucht, schreibt `await` und macht die Funktion `async`.

### v3.285 — Massaufnahmen im Projekt sortiert

Ansage (9.10.2026): „1. nach Status (abgeschlossene am Ende), 2. nach Bezeichnung
(alphabetisch)." `js/09 measSortiert(liste)`: nicht abgeschlossene vor
`workflow_status==="abgeschlossen"`, darin nach `title` (de, numerisch: Tor 2 vor
Tor 10, ohne Bezeichnung am Ende, dann nach Art). Wirkt in der Projektliste
(`loadProjectMeasurements`) und im Register „Massaufnahme" der neuen Ansicht
(`a2RegAufmass`). `projectMeasurementsCache` bleibt unsortiert (Bedarf, Zuschnitt,
Rüstliste unberührt). Annahme: „Bezeichnung" = das Feld Titel der Aufnahme.
Prüfstand `massaufnahmen-sortierung-v3-285` (5; zwei Mutationsproben rot).

### v3.284 — Zurück-Taste des Handys: Seiten der neuen Ansicht

Meldung (9.10.2026): „Der Zurück-Knopf vom Handy funktioniert nicht überall,
manchmal schliesst sich die ganze App, obwohl es eine vorherige Seite gäbe."

**Ursache 1:** `js/54` legt Platzhalter in der Browser-Verlaufsliste nur für
**Schirme** (`.modal`, Viewer …) ab. Heute → Projekte → Projekt → Register der
neuen Ansicht (`a2Zustand`) sind keine Schirme; der Browser sah eine Seite, die
Taste verliess die App. **Fix:** `js/70 a2Ebene()` (heute 0, andere Tabs 1,
Projekt 2, Projekt-Register 3; 0 wenn `#startScreen` nicht sichtbar) zählt in
`zurueckAbgleichen()` mit — Einträge `a2:n` liegen **unten** im Stapel, Dialoge
darüber gehen zuerst weg. Oberster Eintrag `a2:n` → `a2EbeneZurueck()` (Register →
Übersicht → Projektliste → Heute, dieselben Wege wie der Kopfzeilen-Zurück).
`a2Zeichnen()` ruft am Ende `zurueckAbgleichen()`.
**Ursache 2:** `history.go(-n)` löst **ein** popstate aus, `js/54` überhörte aber `n`
→ nach `goToStart` o. ä. verpufften die nächsten Zurück-Tasten. Jetzt `zurueckIgnoriere++`.
**Nicht erfasst:** Unterseiten *innerhalb* eines Schirms (z. B. Tabs im Cockpit) —
dort bleibt es, wie es war; wer eine konkrete Stelle findet, soll sie nennen.
Prüfstand `zurueck-seiten-v3-284` (10; zwei Mutationsproben rot);
`zurueck-oben-v3-175` zählt `a2:`-Stufen nicht als Schirme.

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
