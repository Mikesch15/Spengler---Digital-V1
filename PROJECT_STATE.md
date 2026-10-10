# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.298`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.298 — Rüstblatt: bei mehreren Streifenbreiten der echte Abschnitt

Rückmeldung (10.10.2026, Handy-Screenshot): bei vier Streifenbreiten stand überall „Abschnitt 1“, beim Hinterteil
(507 mm) gar keiner, obwohl die Fusszeile „1 × 1'215 + 1 × 595 mm ab Rolle“ zwei Abschnitte nennt. Ursache:
`zuStreifenTitel` (js/33) zählt die Abschnitte **je Streifenbreite-Gruppe**; eine mitfahrende Gruppe
(Trittbrett-Mischung, js/29) hat keinen eigenen. Das Rüstblatt zeigt bei mehreren Gruppen jetzt
**„Abschnitt 1'215 mm“ / „Abschnitt 595 mm“** (`st.abschnittLaenge`, sonst Gruppenlänge, bei Mischung
Länge − Rest) – das stimmt mit der Fusszeile überein. Eine Gruppe allein und Tafeln bleiben wie bisher; die
Material-Seite (`zuBelegungHtml`) ist unverändert und zählt weiter je Gruppe (**offen:** dort derselbe Effekt).
Grenze: zwei gleich lange Abschnitte in einer Mischung erscheinen unter derselben Überschrift (gespeichert ist
keine Abschnitts-ID). Prüfstand `ruestblatt-abschnitte-v3-297` um Fall H (der Handyfall) erweitert, 13; Mutation rot.

### v3.297 — Rüstblatt: Herkunft direkt in der abhakbaren Liste

Ansage (10.10.2026): „Welches Stück aus welchem Abschnitt ist so noch nicht ideal, das sollte auch in der
abhakbaren Liste stehen und nicht in einer separaten Liste.“ Der Block aus v3.295 (`zuBelegungKurzHtml`,
CSS `.zu-belegung-kurz`) ist **entfernt**. Stattdessen trägt jedes Stück in `zuAlleStuecke` (js/33) seine
`herkunft` („Abschnitt 1 · Streifen 2“, „Stange 1 · 6'000 mm“; Titel aus `zuStreifenTitel`), und
`zuListeHtml(p,{herkunft:true})` zeigt in jeder Zeile je Herkunft eine Nummernreihe mit den weiterhin
antippbaren Haken. Nur auf dem Rüstblatt (`rbBlattHtml`) und nur bei mehr als einem Streifen/einer Stange
(`zuHerkunftNoetig`); Material-Seite, Werkstatt-Liste und Register bleiben unverändert. Prüfstand
`ruestblatt-abschnitte-v3-297` (aus `-v3-295` umgebaut, 12; Mutation rot). Die Regel «Breite quer zur Rolle,
Länge längs» gilt im Plan bereits (`ebaStreifenJeAbschnitt`), nichts geändert.

### v3.296 — Rüstblatt: keine Masse doppelt

Ansage (10.10.2026), auf die Frage nach den übrigen Arten: „Ja, alle Angaben kürzen, so dass nirgends Masse
doppelt stehen.“ `js/80 rbDoppeltesEntfernen`: ein Wert in den Angaben/Stückzeilen entfällt, wenn jede
Zahl darin (ab 10 oder mit Nachkommastelle) schon im Text der Zeichnung oder der Zuschnittliste desselben
Blattes steht; der Wert bleibt dort sichtbar, nichts geht verloren. Worte, kleine Zahlen und Werte, die sonst
nirgends stehen (z. B. Gesamtlänge, Montage), bleiben. Der Monteur sieht keine Zuschnittliste → dort bleibt
alles. Dachfenster/Kamin behalten ihre feste Kurzauswahl (v3.294). Verträge angepasst, mit Gegenproben:
`ruestblatt-masse-v3-293` (Beschriftung darf fehlen, wenn der Wert anderswo steht),
`werkstatt-liste-v3-30`. Neuer Prüfstand `ruestblatt-doppelt-v3-296` (6; Mutation rot).

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
