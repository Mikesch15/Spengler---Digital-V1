# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.344`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.344 — Korrektur zu v3.343 (Regression)

Die volle Regression zu v3.343 war rot (2 Prüfstände): `uebersichtlichkeit-v3-289` prüfte die alte Reihenfolge (Stammdaten zuunterst) – die Projektübersicht steht jetzt gewollt vor Ablauf und Stand, Erwartung angepasst; `navigation-v3-203` verlangt in JEDEM Register einen bedienbaren Knopf – das Register Rüstblatt hatte im Leer-/Ladezustand keinen. Fix: Knopfreihe über dem Rüstblatt (Zu den Massaufnahmen; Material & Zuschnitt nur mit Modul Material). Keine Logikänderung. Die Schnellprüfung zu v3.343 hatte diese zwei Prüfstände nicht enthalten (Auswahl nach Namen) – ab sofort bei Änderungen an js/70 und css/05 alle `ansicht2`-, `navigation`-, `uebersichtlichkeit`- und `startseite`-Prüfstände mitnehmen.

### v3.343 — Projekt-Cockpit im Dashboard-Stil (Übersicht, Reiter Rüstblatt, Rollenband)

Wunsch: Cockpit „in dieser Art“ (Mockup: Projektübersicht + Material-/Mengenübersicht, Massaufnahme-Auswahl, Rüstblatt erstellen, Zuschnittoptimierung mit Rollenbalken). Entscheide des Anwenders: alles in einem Auftrag; „m² (Massaufn.)“ = Zeilen „Blechfläche Zuschnitt“; Rüstblatt als eigener Reiter. Umsetzung (Ansicht2, js/70): Übersicht – Raster `a2-dash` (ab 900 px zwei Spalten, darunter untereinander): links „Projektübersicht“ (Stammdaten + Status), rechts `kaMengenKarteHtml()` (js/85): je Werkstoff + Stärke Spalten Offerte und Massaufnahme (m² oder Stk., Umschalter); Offerte = genau EINE Offerte (Auswahl bei mehreren, nie addiert), Quellen getrennt, fehlende Quelle „–“ (null, nie 0), Summe nur über Zeilen mit Wert und so gekennzeichnet; reiner Kern `kaMaterialZeilen`, `angMengenUebersicht` liefert zusätzlich `nachMatStaerke` (js/63). Reiter „Rüstblatt“ (`a2RegRuestblatt`, nur mit Modul Zuschnitt/Material): das bestehende Projekt-Rüstblatt (js/80 `rbProjektOeffnen` mit `inline:true`, Container `#a2RbProjekt`; selber Zustand/Druck/Haken wie im Fenster der Werkstatt): Auswahl mit Status, m² und Stk., Rollenwahl, „Rüstblatt erstellen/aktualisieren“, „Rüstblatt als PDF“ (Vorschau = Druck). Neu im gemeinsamen Plan (auch im Fenster und im Druck): Summenleiste (offene Zuschnitte, Rollenlänge, Blechfläche, Verschnitt; „spart x m²“ nur wenn gemeinsam wirklich weniger braucht, sonst „keine Einsparung“; nur bei vollständigen Zahlen) und `zuRollenbandHtml` (js/33): Abschnitte fortlaufend auf der Rolle (Reihen à ca. 6 m), Streifen/Stücke nach Massaufnahme eingefärbt, mit Legende – reine Darstellung der bestehenden Packrechnung. Nicht übernommen (bewusst): Projektfoto im Kopf (kein verlässliches Titelbild), Gruppen-Chips als reiner Anzeigefilter (würden Vorschau und Druck auseinanderlaufen lassen), erfundene Beispielzahlen. Keine Migration, keine RLS-/Edge-Änderung, nichts wird geschrieben.
Prüfstand `cockpit-dashboard-v3-343` (33); sechs Mutationen (Quellen vertauscht, fehlend als 0, Stärke ignoriert, Rollenband fehlt, Einsparung immer, Stückzahl falsch) erkannt. Angepasst: `komplettausmass-v3-341` (Abgrenzung), CSS-Regeln ausserhalb `.a2-` nach css/01 (Prüfstand ansicht2-v3-150 F3).

### v3.342 — Projektstand und Komplettausmass in der sichtbaren Ansicht (Ansicht2)

Rückmeldung: „Ich sehe keine Veränderungen im Cockpit.“ Ursache (am Code festgestellt): v3.340/v3.341 hatten die Neuerungen nur in das klassische Cockpit-Fenster (js/09, js/24, index.html) gebaut; die sichtbare Oberfläche ist seit v3.151 die Ansicht2 (js/70: Projektliste `a2ProjektZeileHtml`, Projektseite mit Registern), die ihre Daten aus denselben Zwischenspeichern liest, aber eigene Darstellung hat. Fix, nur Darstellung: js/70 – `a2ProjektZeileHtml` zeigt die Stand-Zeile (`projektStandZeile`, js/09; stösst die eine Abfrage `ladeProjectMeasTypen` an, danach zeichnet js/09 die Liste neu); Übersicht der Projektseite: `a2MengenZeilen()` = zwei getrennte Zeilen „📏 Offertmengen (nur aus der Offerte)“ und „📊 Komplettausmass (Übersicht)“ mit Knopf ins Register Ausmass; `a2RegAusmass` zeigt `kaA2Html()` (js/85) zuoberst – das Komplettausmass ist nicht die Liste der Ausmassdokumente darunter. js/85: Rechenkern und Renderer gemeinsam (`kaBauen(host)`), Öffnen in der Ansicht über den bestehenden Weg `data-a2-meas`. Die Cockpit-Karte bleibt für das klassische Fenster. Keine Logikänderung am Rechenkern, keine Migration. Lehre: Neuerungen am Projekt zuerst in js/70 prüfen.
Prüfstand `komplettausmass-v3-341` auf 46 erweitert; drei Mutationen (Ansicht ohne Komplettausmass, Liste ohne Stand, Zeilen vermischt) erkannt.

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
