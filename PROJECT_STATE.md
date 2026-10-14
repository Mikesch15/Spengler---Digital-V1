# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.360`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.360 — Einfassung rund: Mantelrohr-Durchmesser, bemasster Lochausschnitt

Wunsch: (1) Einfassung rund braucht ein Eingabefeld für das Mantelrohr; in den Einstellungen wird festgelegt, welcher Standrohr-Durchmesser welchen Mantelrohr-Durchmesser ergibt; der Mantelrohr-Durchmesser gilt für die Abwicklung, der Standrohr-Durchmesser ist rein informativ. (2) In der Zeichnung des Lochausschnitts sollen die Masse von Mitte Loch bis vorne und bis hinten vermasst sein.
**Umsetzung:** Pro Einfassung neues Feld `standrohr` (Information, js/38); das bisherige Feld `durchmesser` bleibt das rechnerische Mass und heisst jetzt „Ø Mantelrohr“ – alte Datensätze öffnen unverändert (ihr Durchmesser gilt als Mantelrohr, Standrohr leer). Gibt es in den Einstellungen (Einfassung rund, nur dieses Gerät wie die übrigen Werte, `mantel_zuordnung` in js/21) eine Zuordnung, wird beim Eintippen des Standrohr-Ø der Mantelrohr-Ø übernommen (danach von Hand änderbar), mit Hinweis; ohne Zuordnung bleibt es von Hand (nichts erfunden). Die Abwicklungsrechner-Bücke (`einfaAbwVorgabe`) und der Zuschnitt nutzen den Mantelrohr-Ø; das Ausmass nennt beide (Standrohr als Info). **Zeichnung (js/77/78):** `abwTablett` liefert `massVorne`/`massHinten` (Mitte Loch bis Vorder-/Hinterkante des Zuschnitts); Vorschau und SVG-Datei zeigen links die Masslinien mit Zahlen und ein Kreuz in der Lochmitte, die DXF-Datei dieselben Linien/Texte auf dem Layer BEMASSUNG. Keine Datenbankänderung (Einstellungen sind lokal wie bisher). Prüfstand `mantelrohr-v3-360` (16); Mutationen (Zuordnung ignoriert, falsches Hintermass, keine Bemassung, Standrohr rechnet, keine Übernahme) erkannt; `abwicklung-einfassung-v3-191` und `einfassung-app-v2-96` auf die neuen Bezeichnungen angepasst.

### v3.359 — Einheitliches Erscheinungsbild für alle Seiten

Auftrag: „Überarbeite alle Seiten der App nach den bisherigen Entwürfen – die App soll modern und übersichtlich wirken.“ Umgesetzt als EINE gemeinsame Gestaltungsschicht am Ende von css/05 (nur Darstellung, keine Struktur/Logik): ruhiger flacher Grund statt Blaugrau-Verlauf (Seite und Fenster), flache Karten (Rundung 12px, feine Linie, kein Schatten), ruhige Knöpfe (grau mit Rand, blau/grün ohne Schatten, Rundung 10px), Tabellenkopf/Zeilen/Einstellungsabschnitte in den neuen Tönen, Dunkelmodus über dieselben Variablen; Register der Projektseite etwas dichter und der aktive Reiter bleibt sichtbar. **Bewusst nicht geändert:** Feldgrössen und Beschriftungen der Formulare (früherer Entscheid, geprüft in `einstellungen-optik-v3-151`, `formulare-optik-v3-154`, `massaufnahme-optik-v3-152`; ein erster Versuch mit grösseren Feldern wurde deshalb zurückgenommen). Bereits einzeln nach Wunschbild gestaltet: Startseite, Projektliste, Projektseite, Stammdaten. Nicht einzeln umgebaut (nur die gemeinsame Schicht): Massaufnahme-Formulare, Regierapport, Ausmass, Offerte, Werkstatt, Lager, Einstellungen, Mehr – für eine Seite nach eigenem Bild bitte den Entwurf nennen. Prüfstand `design-einheitlich-v3-359` (11; Grund, Karten, Knöpfe, Felder unberührt, kein Überlaufen auf 12 Seiten bei 390/768/1280 px, Dunkelmodus); Mutationen erkannt. Bericht: `ABSCHLUSSBERICHT_Design_v3.359.txt`.

### v3.358 — Logo weiss im Kopf; Titelbild wird beim Speichern nicht mehr überschrieben

Meldung (Bild): „Jetzt sieht das Logo komisch aus.“ Das (dunkelblaue, transparente) Logo war auf dem Blau kaum zu lesen. Jetzt erscheint es im Kopf der Startseite weiss (`filter:brightness(0) invert(1)`, css/05) – wie in der Vorlage; ein farbiges Logo wird dort bewusst einfarbig weiss gezeigt. **Titelbild:** Beim Nachprüfen stand `app_settings.kopf_bild_url` leer, obwohl vorher gespeichert (Spaltenwert nachgeprüft). Ursache im Code: `saveCompanyName` schrieb das Titelbild bei JEDEM Speichern der Firmendaten mit (auch mit leerem Stand) und konnte ein vorhandenes Bild so löschen. Behoben (js/01, js/07): `kopfBildGeaendert` – das Feld wird nur mitgeschrieben, wenn ein neues Bild gewählt oder „Titelbild entfernen“ gedrückt wurde. Das Bild muss einmal neu hochgeladen werden; der Lesezugriff (Migration v3.356) ist vorhanden. Prüfstand `projektseiten-wunschbild-v3-356` auf 27; Mutationen (Feld immer geschrieben, Logo ohne Weiss-Filter) erkannt.

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
