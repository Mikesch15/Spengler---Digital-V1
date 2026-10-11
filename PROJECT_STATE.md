# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.306`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.306 — Offert-Import aus PDF/Foto: zuverlässiger und ohne Doppelte (Edge Function v25)

Auftrag (11.10.2026, Ausgangsstand v3.305 `4a01ee9`). **So läuft es:** Foto → `resizeImageFile` (maxDim 1400/2200 je
«Bildqualität») → `data:`-URL; PDF → `fileZuDataUrl` (max. Erkennungsgrösse `ANG_PDF_ERKENNEN_MAX_BYTES`); beide gehen
durch `recognizePhoto()` (js/17) an `extract-offer-positions`, das MIME-Typ und Inhalt unverändert als `inline_data` an
Gemini reicht (PDF als `application/pdf`); gleiche Positionsstruktur (`pos, description, quantity, unit, preis,
abschnitt`). **Empfehlung:** digitales PDF mit Text > scharfes Foto ≈ gescanntes PDF; Foto/Scan nur, wenn es kein
Original-PDF gibt. **Belegte Lücken (Code):** (a) «Alle Fotos erkennen» las nach einem Teilfehler beim erneuten Tippen
ALLE Fotos nochmals → doppelte Positionen; ebenso Einzelfoto und «Positionen aus dem PDF erkennen»; der Abschlusssatz
sagte «aus N Foto(s) erkannt», auch wenn eines scheiterte; (b) leeres Ergebnis wurde nicht erklärt; (c) Edge Function:
Fehler ausser 503/429 kamen als rohes Englisch, MIME wurde nicht geprüft, Google-Rohtext konnte den API-Key enthalten.
**Behoben:** `js/17` `erkennungQuellen`/`erkenneAlleFotos`/`erkenneEinzeln` (genutzt von js/17 und js/63): schon erkannte
Quellen werden übersprungen, Einzelerkennung fragt nach und ERSETZT, Liste ändert sich erst nach gelungener Erkennung,
ehrlicher Abschlusssatz inkl. fehlgeschlagener Foto-Nummern; Erklärung bei 0 Positionen; Edge Function **v25** (siehe
`supabase/functions/extract-offer-positions/HISTORIE.md`), **deployt** (Version 25, `verify_jwt` unverändert false,
Inhalt gegen das Repo geprüft). **Nicht geändert:** Modell, Prompt, Wiederholungsregel (nur 503/429), Positionsstruktur.
Prüfstände: `erkennung-fehlerfaelle-v3-306` (23, Edge-Datei mit Gemini-Attrappe; v24 → 13 rot),
`erkennung-wiederholung-v3-306` (11, Client; Altverhalten → 8 rot). **Nicht belegt:** ein echter Gemini-Aufruf (kein Netz/
Key hier), die Ursache des gemeldeten Fehlers (Logs ohne Eintrag), Erkennungsgüte.

### v3.305 — Prüfung deaktivierter Module und Workflow-Übergänge (Auftrag 11.10.2026, Ausgangsstand v3.304 `6b57d3a`)

**Matrix (Code + Live-DB-Funktionen lesend; Client-Verhalten durch Prüfstand `module-workflow-v3-305`):**
| Einstellung (firmenweit) | Erwartung | Befund | Prüfstand |
|---|---|---|---|
| Arbeitsablauf AN, Werkstatt AN | Werkstatt, Aufgaben, Badge, Archivieren nur für Abgeschlossene | ok | module-workflow-305 A, werkstatt-v3-09 |
| Arbeitsablauf AUS (`workflow_aktiv=false`) | Aufgaben/Badge/Cockpit-Karte aus | ok (js/44, js/45) | workflow-v3-05, 305 B |
| Arbeitsablauf AUS + Werkstatt-Modul AN | Werkstatt ebenfalls aus | **Lücke**: Werkstatt zeigte alte Stati samt «Rüsten bestätigen» | 305 B (vorher rot) |
| Arbeitsablauf AUS | Massaufnahme archivierbar | **Lücke**: Archivieren nur für `abgeschlossen`, das nie erreicht wird → für immer unerreichbar | 305 B (vorher rot) |
| Arbeitsablauf AN, Werkstatt AUS | Rüsten/Montage weiter über «Heute» | ok | 305 C, ruesten-montage-v3-292 |
| Reservierung/Zuschnitt AUS | Blöcke/Abhaken weg, Hinweis | ok | werkstatt-v3-09 H, reservierung-v3-09 |
| Hauptschalter AUS | alles aus, Unterschalter bleiben gespeichert | ok | projektmodule-v3-09 |
**Server:** `feature_boundary_*` (RESTRICTIVE, `(SELECT auth.uid())`) betrifft nur angebote/lager-Tabellen; die
Projektmodule (Reservierung, Versionierung, Werkstatt…) und `workflow_aktiv` sind laut Code (js/01, js/47)
**reine Bedienung** – die Absicherung liegen in `schuetze_measurement_workflow` und den `measurement_*`-Funktionen
(Firma `mw_firma_ok`, Rolle, Status), unverändert und nicht angefasst. **Behoben (kleinste Änderung):** `werkAktiv()`
(js/51) verlangt zusätzlich den Arbeitsablauf; `js/09` bietet «Archivieren» bei ausgeschaltetem Ablauf für jede
Massaufnahme an; Hinweis in den Modul-Einstellungen («Wirkt nur bei eingeschaltetem Arbeitsablauf»). Keine Migration.
**Nicht belegt:** Live-Test mit zwei Firmen/echten Konten (keine echte DB in dieser Umgebung); Prüfstände belegen
keine RLS/Mandantentrennung. Hinweis: bei ausgeschaltetem Ablauf erzwingt der Trigger weiterhin das Verfallen der
Freigabe bei Datenänderung (harmlos, da nichts am Status hängt).

### v3.304 — Prozessprüfung, 2. Lücke: Werkstatt lädt nach Rückkehr in die App neu

Fortsetzung der End-to-End-Prozessprüfung (Punkt 9 «keine veralteten Stände nach Rückkehr in die App»). Bestand:
`js/45 aufgabenBeiRueckkehr` lädt «Heute» ab einer Minute Alter nach (visibilitychange/online), die Werkstatt
(`js/51`) nicht – nach Stunden im Hintergrund zeigte sie den alten Stand samt «Rüsten bestätigen» an einer
Aufnahme, die nicht mehr dran ist (serverseitig würde die Aktion ehrlich abgelehnt, aber der Stand war falsch).
Neu: `werkBeiRueckkehr` (`werkStandZeit`, 60 s) – nur bei offener Werkstatt und angemeldeter Person, über
`werkstattNeuLaden`. Prüfstand `werkstatt-rueckkehr-v3-304` (5; gemessen wird die Anzeige, nicht der Speicher;
Gegenproben frischer Stand / geschlossene Werkstatt; Mutation rot). **Geprüft und für in Ordnung befunden:**
Projektmaterial/Bedarf rechnet bewusst über ALLE Massaufnahmen inkl. archivierter (js/09-Kommentar); Freigabe-
verfall, Zuweisungsketten und Rüsten-Überspringen serverseitig (siehe v3.300). **Weiter offen:** Live-Test mit
zwei Firmen/echten Konten; Verhalten ausgeschalteter Module je Übergang nur über vorhandene Prüfstände.

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
