# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.358`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.358 — Logo weiss im Kopf; Titelbild wird beim Speichern nicht mehr überschrieben

Meldung (Bild): „Jetzt sieht das Logo komisch aus.“ Das (dunkelblaue, transparente) Logo war auf dem Blau kaum zu lesen. Jetzt erscheint es im Kopf der Startseite weiss (`filter:brightness(0) invert(1)`, css/05) – wie in der Vorlage; ein farbiges Logo wird dort bewusst einfarbig weiss gezeigt. **Titelbild:** Beim Nachprüfen stand `app_settings.kopf_bild_url` leer, obwohl vorher gespeichert (Spaltenwert nachgeprüft). Ursache im Code: `saveCompanyName` schrieb das Titelbild bei JEDEM Speichern der Firmendaten mit (auch mit leerem Stand) und konnte ein vorhandenes Bild so löschen. Behoben (js/01, js/07): `kopfBildGeaendert` – das Feld wird nur mitgeschrieben, wenn ein neues Bild gewählt oder „Titelbild entfernen“ gedrückt wurde. Das Bild muss einmal neu hochgeladen werden; der Lesezugriff (Migration v3.356) ist vorhanden. Prüfstand `projektseiten-wunschbild-v3-356` auf 27; Mutationen (Feld immer geschrieben, Logo ohne Weiss-Filter) erkannt.

### v3.357 — Stammdaten nach dem Wunschbild

Wunsch („Danach das umbauen“, Bild der Seite Stammdaten). Nur Darstellung im Rahmen der Ansicht (`a2-nur-stammdaten`, css/05; dieselben Felder, derselbe Speichern-Weg `cockpitSaveStammdaten`): Titel gross in Blau, Status-Zeile mit Beschriftung und Auswahl mit farbigem Punkt (die doppelte Marke daneben entfällt; die Optionen heissen ohne unklares Zeichen, js/24), Überschrift „Projektinformationen“ (index.html, `.stamm-kopf`), Beschriftungen in normaler Schrift, grosse Eingabefelder, „Zugeteilt an“ als Abschnitt mit zweispaltigen Personenfeldern, Speichern-Knopf voll breit, „Zurück zur Projektübersicht“ als ruhiger Rahmen-Knopf statt grün. Prüfstand `projektseiten-wunschbild-v3-356` auf 25 (Abschnitt E); Mutationen (Zeichen in Optionen, doppelte Marke, einspaltige Zuteilung, fehlende Überschrift) erkannt.

### v3.356 — Projektliste und Projektseite nach dem Wunschbild; Titelbild lesbar; grösseres, transparentes Logo

Wünsche: (1) Projektliste und Projektseite nach den Wunschbildern umbauen; (2) „Titelbild wird nicht gespeichert und dadurch nicht angezeigt“; (3) Firmenlogo grösser und transparent wie in der Vorlage.
**Titelbild – Ursache:** gespeichert war es (Spalte `kopf_bild_url` gefüllt), aber die Lese-Policy für Storage (`tenant read own storage files` → `storage_object_is_own_company`) erkennt flache Pfade nur über bekannte Referenzen (bisher `app_settings.logo_url`); das Titelbild bekam deshalb keine signierte Adresse. **Behoben** mit einer additiven Migration `storage_zugriff_kopf_bild`: in dieser einen Funktion zählt zusätzlich `kopf_bild_url` derselben Firma (`company_id = my_company_id()`); der übrige Funktionstext und alle Policies sind unverändert (Datei `supabase/migrations/v3356_storage_zugriff_kopf_bild.sql` dokumentiert die Stelle). Nicht live gegen die echte App getestet.
**Logo:** im Kopf der Startseite ohne weissen Kasten (transparent), bis 60 px hoch / 260 px breit.
**Projektliste (js/70, js/09, css/05):** Karten mit Symbolkreis, Titel + Status-Marke (Punkt statt unklarem Zeichen), Adresszeile und Stand-Zeile mit farbigen Punkten (`projektStandTeile`; der Satz „n Massaufnahmen · k offen · z zu rüsten“ bleibt derselbe), Suchfeld mit Filterknopf (öffnet „Archiv und Filter“).
**Projektseite:** Register als Symbolleiste mit Unterstreichung (seitlich wischbar), „Als Nächstes“ mit Symbolfeld, Projektübersicht mit Symbol je Bezeichnung und Status-Marke, Material-/Mengentabelle mit Werkstoff-Farbfeld (nur Orientierung), Komplettausmass mit drei Kennzahlen-Feldern und Positionen als Zeilen mit Symbol und Pfeil (js/85, css/01). Nicht übernommen: Status-Auswahlliste in der Marke (wäre ein Schreibweg; Status wird weiter über „Stammdaten bearbeiten“ geändert).
Prüfstand `projektseiten-wunschbild-v3-356` (18); `uebersichtlichkeit-v3-289` (Filterknopf im Suchfeld erlaubt). Bericht: `ABSCHLUSSBERICHT_Projektseiten_v3.356.txt`.

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
