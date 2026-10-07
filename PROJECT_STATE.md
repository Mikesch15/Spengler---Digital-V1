# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.265`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.265 — alle Schnitte der Einfassung rund im PDF

Ansage: „Im pdf von einfassung rund, soll bei mehreren einfassungen alle
schnitte angezeigt werden (grösse 4 stk pro a4 seite)."

**Ursache.** Seit v2.96 liegen die Einfassungen in `d.einfassungen`, der
Datensatz spiegelt die **erste** aber zusätzlich auf oberster Ebene — und genau
die zeichnete `rsSvg(m,"Schnitt")`. Die übrigen tauchten im Ausdruck nie auf.

`js/60` gibt jetzt je Einfassung einen Eintrag aus. Der erste behält den Titel
`"Schnitt"`: Rüstansicht und `rsSvg` finden ihn seit jeher darunter, und das
alte Format (bis v2.95, ohne `d.einfassungen`) bleibt unverändert. Die
Abbildung Eintrag → Zeichnung macht `einfaEingabe()` aus `js/38` — die eine
Stelle, die sie kennt.

**Vier je Seite.** Zwei Spalten, zwei Reihen; 182 × 266 mm Satzspiegel, rund
88 mm je Zelle, 108 mm Höhengrenze je Zeichnung.

Der erste Anlauf brachte nur **zwei** auf die Seite, obwohl darunter eine
halbe Seite frei war: das Raster durfte mitten drin umbrechen. Gemessen an
einem echten A4-PDF, nicht überschlagen. Mit `page-break-inside:avoid` wandert
eine Vierergruppe geschlossen auf die nächste Seite — erst das ist die Zusage.

**Geprüft am echten Blatt** mit 1, 2, 4, 5 und 6 Einfassungen und mit dem alten
Format, samt Gegenprobe, dass die Zeichnungen **verschieden** sind — sonst
bestünde auch viermal dieselbe. Abschnitt L in
`pruefstand-einfassung-app-v2-96` verlangte wörtlich die Einzahl „Schnitt" und
ist auf den neuen Vertrag umgestellt, mit Gegenprobe gegen den alten Zustand.

### v3.264 — der Kopf der Einfassungskarte lief nicht mit

Meldung: „Wiso wird beim einfassung rund die einfassung 1 oben rechts der
zuschnitt berechnet und bei einfassung 2 nicht?"

**Gerechnet wurde immer richtig.** Nachgestellt im Browser: der Datensatz der
zweiten Einfassung trug alle Masse, `einfaBerechne` lieferte 350 × 933 — auf
der Karte stand „0 × 38".

Ursache: `einfaLive()` führt nach jedem Tastendruck Kennzahlen, Zeichnung und
den Punkt am Kontroll-Register nach, die **Kartenköpfe nicht**. Der Kopf stand
noch so da, wie die Karte beim *Anlegen* aussah. Dieselbe Ursache liess dort
„Einfassung 2" statt der eingegebenen Bezeichnung stehen. Die erste Karte sah
nur richtig aus, weil sie zuletzt mit ihren Werten gezeichnet worden war.

Der Kopf steht jetzt in `einfaKartenKopfHtml()` als **eine** Quelle für
Erstzeichnung und Nachführung. Nachgeführt wird nur der Kopf, nicht die Karte
— sonst verlöre das Feld, in dem gerade getippt wird, den Fokus.

Der Prüfstand hält **beides** fest: dass der Kopf mitläuft, und dass die Werte
nie falsch waren. Ohne das Zweite könnte der Fehler später als Rechenfehler
missverstanden werden.

### v3.263 — eine Aufnahme mit Knick liess sich nicht speichern

Dringende Meldung des Anwenders: „Diese massaufnahme muss gespeichert werden
können und darf nicht verloren gehen." Beim Speichern erschien zweimal
„Mass I, Vorderkant Knick bis Hinterkant Dachfenster, fehlt."

**1. Die Bauart wurde nicht eingelesen.** Seit v3.260 wird `seitenteilArt`
gespeichert — gelesen wurde sie nie. `dfaAusDaten()` füllt eine feste Liste
von Schlüsseln, und `seitenteilArt` stand nicht darin. Jede mit Knick erfasste
Aufnahme kam als „separat" zurück, verlangte dort Mass I und die Überlappung
— Masse, die es in dieser Bauart nicht gibt — und das Speichern bricht bei
einem Fehler hart ab (`js/16`: alert + return). **Mein Fehler aus v3.260:
Schreiben eingebaut, Lesen vergessen.** Die Probe prüfte „gespeichert", nicht
„gespeichert und wieder geöffnet".

**2. Jede Meldung kam doppelt.** In `dfaPruefungen` stand am Ende der
Seiten-Schleife `if(!a.getrennt)return;`. Ein `return` in einem `forEach`
verlässt nur den **einen Durchlauf**, nicht die Schleife — bei nicht
getrennten Seiten wurde deshalb links und rechts geprüft.

**3. Bleilappen runden jetzt überall ab.** Auf Nachfrage bestätigt, weil in
`js/20` die gegenteilige, datierte Anweisung vom 05.09.2026 stand. Gemessene
Folgen: Kamin-Testfall 8 → 4, Anschlussblech 20 → 19. Zwei Prüfstände, die die
alte Regel festschrieben, sind auf den neuen Vertrag umgestellt — je mit
Gegenprobe gegen die alte Zahl.

**Ehrlich dazu:** v3.262 war in GitHub rot. Ich hatte die volle Regression
hier abgebrochen, als die nächste Frage kam, und das Ergebnis nie angeschaut.
Durch die Änderungen in v3.263 wurde sie wieder grün — das war Glück, nicht
Absicht. Die Regression nach dem Push schützt nur, wenn sie zu Ende läuft und
ihr Ergebnis gelesen wird.

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
