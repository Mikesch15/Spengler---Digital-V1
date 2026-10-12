# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.330`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.330 — Rollen nachträglich ändern wirkt in Rüstblatt/Rüstliste/Werkstatt/Material

Rückmeldung: nachträglich geänderte verfügbare Rollen wurden nicht berücksichtigt. `zuNeuMischen` (js/33, aus `pmatPlanFuer`) rechnet jetzt jeden gespeicherten Rollenplan aus den JETZT gültigen Rollen neu: Blechlager der Firma (`zuLagerbreiten`) eingeschränkt auf die gespeicherte Wahl der Massaufnahme (`rollen.auswahl`, leer = ganzes Lager); ohne Lager die gespeicherten `breiten` ∩ Wahl. Gleiche Rollen wie beim Speichern und schon gemischt/nicht mischbar → gespeicherter Plan unverändert; passt keine Rolle → gespeicherter Plan bleibt. Nichts wird zurückgeschrieben. Prüfstand `rollen-mischen-v3-328` Abschnitt F (40 gesamt).

### v3.329 — Rollen-Mischung auch für bereits gespeicherte Pläne (Rüstliste/Rüstblatt/Werkstatt)

Rückmeldung: die Rüstliste zeigte die Mischung nicht. Ursache: Rüstblatt, Rüstliste, Werkstatt und Materialsicht lesen den GESPEICHERTEN Plan (`pmatPlanFuer`, js/48); vor v3.328 gespeicherte Massaufnahmen kannten die Mischung nicht. Neu `zuNeuMischen(p,r)` (js/33), gerufen in `pmatPlanFuer`: ein gespeicherter Rollenplan ohne `mischung` mit ≥2 Streifenbreiten und ≥2 gespeicherten Rollenbreiten (`r.breiten`, nach Auswahl der Massaufnahme) wird mit derselben Packrechnung `ebaFormatPlan` neu gerechnet (Stücke regroupiert nach ihrer Breite); übernommen wird NUR eine echte Mischung, sonst bleibt der gespeicherte Plan. Nichts wird zurückgeschrieben (kein Verfall erteilter Freigaben, Trigger schuetze_measurement_workflow), Stücknummern/Längen bleiben, Abhaken unberührt. Prüfstand `rollen-mischen-v3-328` um Abschnitt E erweitert (35).

### v3.328 — Zuschnitt: Rollen mischen (je Streifenbreite eine der angewählten Rollen)

Auftrag des Anwenders: mehrere Rollen dürfen in einer Massaufnahme gemischt werden, automatisch, aber nur mit den in der Massaufnahme angewählten Rollen. Umsetzung am EINEN Formatplan `ebaFormatPlan` (js/29): neue `ebaRollenMischung()` sucht per Teilmengen-DP die Aufteilung der Streifenbreiten (Gruppen) auf die angewählten Rollen mit der kleinsten Blechfläche; innerhalb einer Rolle rechnet unverändert `ebaFormatZeilen` (inkl. Mischung verschiedener Breiten in einem Abschnitt). Nur Rolle (nie Tafel), 2–6 Gruppen, ≥2 Rollen; Mischung ersetzt das beste Einzelformat nur bei Gewinn ≥ 0,02 m² und ≥ 2 %, jeder weitere Rollenwechsel muss ≥ 0,03 m² sparen (`EBA_MISCH_*`). Ergebnis: `moeglich[0]` mit `mischung:[{breite,gruppen,format}]`, `gruppen[].rolleBreite`, `zeilen[].rolleBreite`; Pläne ohne `mischung` (alle alten) laufen unverändert. js/33: `zuMischBloecke` – jeder Block wird wie ein eigener Plan behandelt (`zuGeometrie`, `zuAbschnittInfo` mit fortlaufenden Abschnittsnummern über alle Rollen → Bilanz, Reste, Zuschnittliste/Rüstblatt „ab 670er Rolle“); `zuFormatText`/`zuAbschnittText` nennen die Rollen. Beispiel (Dachfenster Süd Rechts): 670er + 1000er statt nur 670er = 1,416 statt 1,558 m².
Prüfstand: `pruefstand-rollen-mischen-v3-328` (29). Angepasst: `kamin-app-v2-90` (beste Lösung jetzt gemischt 3,006 m², 1000er allein 3,6 m²); `ruestliste-offline-v3-23`, `reste-schnittfuge-v3-26`, `rolle-tafel-v3-33` prüfen das alte Rüstlisten-Kästchendokument (Rückfall) und schalten den neuen Druckweg (v3.325) ab. Vorher-Lauf der vollen Regression auf dem Arbeitsstand: nur diese vier rot.

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
