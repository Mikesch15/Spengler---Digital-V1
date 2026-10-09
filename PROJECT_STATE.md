# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.284`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

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

### v3.283 — Massaufnahme im Projekt öffnet sich; Freigeben aus der Liste

Ansage (9.10.2026): „Wenn ich eine Massaufnahme im Projekt anklicke, sollte diese
sich öffnen und nicht die Rüstliste aufklappen. Ausserdem möchte ich die
Massaufnahmen freigeben können, ohne diese öffnen zu müssen."

`js/70 a2MessZeileHtml` (nur Register „Massaufnahme" der Projektseite): die Zeile
trägt `data-a2-meas` (öffnet das Formular); das Rüstblatt klappt ein eigener Knopf
`data-a2-rb` darunter auf (v3.211-Blatt unverändert, Herstellung nutzt weiter
`a2RbZeileHtml`). `data-a2-freigeben` erscheint, wenn `mwNaechsterSchritt(m)` sagt,
dass ICH freigeben bzw. erneut freigeben darf (Aufnehmer; Workflow an).
`js/44 mwFreigebenAusListe(id)` nimmt die Zeile aus den Zwischenspeichern, setzt
`mwStand` und ruft dasselbe `mwFreigeben()` (Rückfrage, RPC `measurement_freigeben`,
Zuweisen-Dialog) – keine zweite Freigabe-Logik. Sprung aus der Suche
(`A2_TREFFER`, `data-a2-rb`) trifft den Rüstblatt-Knopf, bleibt wirksam.
Prüfstand `freigeben-liste-v3-283` (11; zwei Mutationsproben rot);
`ansicht2-projekt-v3-151` auf den neuen Vertrag umgestellt (Zeile öffnet,
Rüstblatt per Knopf), Hilfe „Rüstblatt" angepasst.

### v3.282 — Alter Dachfenster-Zuschnitt: Warnung, bewusste Wahl; „Was ist neu" höchstens 5

Ansage (9.10.2026): „Beides machen und bei der Meldung, wenn eine neue Version
erscheint, nur die letzten 5 Versionen anzeigen."

**(1) Warnung:** `js/66 dfaZuschnittVeraltet(m)` = Dachfenster ohne gespeicherte
`data.ausfuehrung` (vor v3.270 erfasst; Rüstliste/Werkstatt/Material lesen den
GESPEICHERTEN Plan, also stehen dort noch die alten Abwicklungen). Eine Stelle
entscheidet; `dfaVeraltetHinweis(m)` liefert den Text. Angezeigt: Badge
„⚠️ Alter Zuschnitt" in `mwBadgeFuerListe` (js/44; Massaufnahme-Listen js/09 und
js/70), Hinweiszeile im Rüstlisten-Block (js/58, wird mitgedruckt) und auf der
Werkstatt-Karte (js/51). Es wird **nichts** automatisch umgerechnet.
**(2) Bewusste Wahl:** `dfaFuellen` lässt `ausfuehrung` bei fehlendem/unbekanntem
Wert **leer** (Pflicht-Dropdown); bisher stillschweigend „gepunktet". Die
Seitenteil-Art bleibt bei fehlendem Feld „separat" (das war echtes Altverhalten).
Speichern setzt bei freigegebenen Aufnahmen die Freigabe zurück (Workflow-Trigger).
**(3)** `js/67 winPruefen` zeigt nach einer Pause höchstens die neuesten
`WIN_MAX_VERSIONEN`=5 Versionen.
Prüfstand `alt-warnung-v3-282` (10; Mutationsproben je rot);
`dachfenster-ausfuehrung-v3-270` auf den neuen Vertrag umgestellt, mit Gegenprobe.

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
