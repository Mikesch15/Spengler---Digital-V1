# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.319`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.319 — Projekt-Leistungen: Zuordnung Offertenposition ↔ Leistung ↔ Massaufnahmen abgesichert

Befund (vor der Änderung geprüft): Das Modell existiert bereits (`leistungen` mit `angebot_id`/`angebot_position`, `leistung_massaufnahmen` n:m mit Unique, RLS/tenant_boundary). Nachweisbare Lücken: (1) Position nur über Nummer gespeichert – leere/doppelte Nummern wählten beim Öffnen die falsche oder keine Position, beim nächsten Speichern ging die Zuordnung still verloren; (2) Speichern löschte ALLE Massaufnahme-Verknüpfungen und legte sie neu an (bei Fehler dazwischen weg); (3) DB erlaubte Verknüpfung mit Massaufnahme/Offerte aus anderem Projekt derselben Firma; (4) Offerte-Position ohne Nummer wurde als „Zusatzleistung“ angezeigt.
Änderung: Migration `leistungen_zuordnung_integritaet` (Spalte `angebot_position_beschreibung`, Trigger `pruefe_leistung_massaufnahme`/`pruefe_leistung_angebot`, SECURITY INVOKER, idempotent); `js/65` Hilfsfunktionen `leiPositionFinden`/`leiHerkunftText`/`leiVerknuepfungsDiff`, Diff-Speichern (upsert, dann nur Entfernte löschen), Option „Bisherige Zuordnung beibehalten“, Anzeige Massaufnahmen-Zahl + Hinweis auf nicht zugeordnete (keine Zwangszuordnung); `js/70` nutzt `leiHerkunftText`. Preise/Mengen/Workflow unverändert. Live (Rollback-Tests mit Nutzer-Impersonation): gleiche Projekt ok, Duplikat/anderes Projekt/fremde Firma abgewiesen.
Prüfstand: `pruefstand-leistungen-zuordnung-v3-319` (30), `pruefstand-leistungen-v3-37` angepasst.

### v3.318 — Nachtauftrag Paket F: Service Worker hebt nur Erfolgreiches auf

`sw.js` (Netz zuerst, Cache nur ohne Verbindung) legte JEDE Antwort in den Zwischenspeicher – auch 404/500. Ein kurzer Serverfehler überschrieb so die gute Kopie derselben Datei; ohne Verbindung kam danach die Fehlerseite statt der App. Jetzt `if (res.ok)`. Prüfstand `pruefstand-sw-cache-v3-318` (11; ohne die Änderung 3 rot): 200 aufgehoben, 500/404 überschreiben nicht, ohne Netz kommt die gute Kopie, fehlende Datei = Fehler statt falscher Antwort, nur Seitennavigation fällt auf die Startseite zurück, fremde Adressen/POST unberührt, Cache-Nummer = sichtbare Version. Rest von Paket F geprüft, keine Lücke: Cache-Version wird per `werkzeug-version.js` mitgezählt, App-Icon bleibt das blaue SD (`?v=2`), keine neuen Dateien in dieser Nacht (also nichts in App-Hülle/Script-Reihenfolge nachzutragen), Offline-Speichern wird vom Schalter `offlineSperrtSpeichern` abgefangen (Meldung statt vorgetäuschtem Erfolg).

### v3.317 — Nachtauftrag Pakete B/D/G: Datenbank-Audit (belegt) und verständliche Fehlermeldungen

**Paket B/D – nur gemessen, nichts am Workflow geändert (keine Lücke gefunden):**
- Workflow-RPCs (`measurement_freigeben/geruestet/montiert/abschliessen/zuweisen/workflow_korrigieren`) gelesen: jede prüft zuerst `mw_firma_ok` (Firma über das Projekt), dann Rolle (Aufnehmer/Admin, zugewiesener Rüster/Monteur), dann den erlaubten Vorgänger-Status; Wiederholung = deutsche Fehlermeldung, keine doppelte Wirkung. Übergänge exakt wie im Auftrag (IN BEARBEITUNG → … → ABGESCHLOSSEN); Korrektur nur Admin.
- **Mandantentrennung live gemessen (read-only, als echte Rolle `authenticated` mit den JWT-Claims der Admins, ohne zu schreiben):** Testfirma-Admin sieht 1 Projekt (eigenes) und 0 fremde Zeilen in 20 Tabellen (Projekte, Profile, Massaufnahmen, Offerten, Angebote, Leistungen, Reservierungen, Reste, Werkstoffe, Regiematerial, Lieferantensortiment, Dateien, Rapporte, Ausmass, Versionen, Verlauf, Firmen, Features, Abweisungen, Reset-Tokens, Einladungen); PETER-Admin sieht 5 eigene Projekte und 0 fremde Zeilen (die zweite sichtbare Firma ist beabsichtigt: er ist System-Administrator). `anon`: kein Zugriff (`permission denied for function my_company_id`). `login_aufloesung_versuche`/`password_reset_tokens`: für Angemeldete gesperrt bzw. leer.
- Alle 45 Tabellen haben RLS; `tenant_boundary_*` überall RESTRICTIVE – **einzige Lücke geschlossen:** `kontroll_abweisungen` hatte keine (nur company-gebundene PERMISSIVE-Policies). Migration `tenant_boundary_kontroll_abweisungen` (RESTRICTIVE, `company_id = my_company_id()`); Wirkung geprüft: PETER sieht weiter seine 12 Zeilen, 0 fremde (gesamt 16 = 12 + 4). `feature_boundary_*` nur auf angebote/offerten/lager* (unverändert, RESTRICTIVE).
- Storage: Bucket `measurements` privat, 50 MB, Policies über `storage_object_is_own_company(name)` (lesen/ändern/löschen) und `storage_object_insert_allowed(name)` (hochladen). Nicht geändert.
- Supabase-Advisor (Sicherheit): 31 Warnungen „SECURITY DEFINER für Angemeldete ausführbar“ = beabsichtigt (jede prüft intern, s. o.); `anon`: keine Warnung; Info „RLS ohne Policy“ nur für die zwei Server-Tabellen (gewollt); Warnung „Leaked Password Protection aus“ (Dashboard-Schalter, offen).
**Paket G – behoben:** `dbFehlerText(err, vorgabe)` (js/01-basis.js) übersetzt technische Meldungen (Failed to fetch, JWT expired, permission denied/RLS mit Tabellennamen, doppelter Schlüssel mit Constraint-Namen, Timeout, fehlende Funktion) in deutsche Sätze mit nächster Handlung; Datenbank-Sätze, die unsere Funktionen bewusst auf Deutsch auslösen, gehen unverändert durch. Eingebaut an allen Stellen, die `error.message` roh zeigten: js/44, 45, 46, 47, 50 (9×), 51, 52, 53. Prüfstand `pruefstand-fehlertext-v3-317` (30, inkl. Quelltext-Prüfung „keine rohe Meldung mehr“).
**Nicht gebaut / offen:** Das Roadmap-Dokument und das Fachkonzept liegen nicht im Repo (nur `Zusammenfassung_Auftrag_*.txt`), ein vollständiger Roadmap-Abgleich ist deshalb nicht möglich. Push-Benachrichtigungen/„Änderungen seit letztem Besuch“ bleiben ungebaut (kein belegter, verlässlicher Verlauf als Quelle; ein zweites Benachrichtigungssystem wäre falsch). Paket C (Cockpit) und E (Offertenimport): keine neue belegte Lücke gefunden; E-Grenzen siehe v3.316.

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
