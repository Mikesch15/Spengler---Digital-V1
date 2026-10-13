# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.352`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.352 — Startseite: Handlungen, Arbeitsstand, „Nächster Schritt“

Auftrag „Professionelle Startseite“ (Datei). Bestandsaufnahme: beim Start öffnet die Ansicht (js/70) die Seite „Heute“ (`a2SeiteHeute`) mit Einrichtung, Kontrolle, Hinweisen, Aufgaben (je Projekt, zugeklappt), Werkstatt heute, Montage, Offene Projekte – alles aus echten Quellen; es fehlten Handlungen im Kopf, ein Arbeitsstand auf einen Blick und der nächste Schritt je Projekt. Umgesetzt (nur js/70 + css/05, keine Migration, keine neue Abfrage): Handlungsleiste „＋ Neues Projekt“ (nur wenn `startOpenProjects` sichtbar), „📁 Projekt öffnen“, „🔍 Suche“ (nur wenn `openGlobalSearch` sichtbar; öffnet die vorhandene Suche); Arbeitsstand „Offene Projekte“ (= `a2OffeneProjekte(false)`, öffnet die Projektliste) und „Offene Aufgaben“ (= Aufgabenliste, springt zum Abschnitt; bei unsicherem Stand „–“ statt einer Zahl); „Nächster Schritt“ in der Projektkarte = dringendste offene Aufgabe aus derselben Aufgabenliste. Werkstattzahlen bleiben nur im Abschnitt Werkstatt (keine doppelte Kennzahl); Schnellzugriffe auf Werkstatt/Lager nicht doppelt – dafür gibt es die Leiste. Prüfstand `startseite-dashboard-v3-352` (16), Mutationen (Zahl trotz unsicherem Stand, Neues Projekt/Suche ohne Freigabe, falsches Ziel, falsche Zahl, Überlaufen) erkannt. Bericht: `ABSCHLUSSBERICHT_Startseite_v3.352.txt`.

### v3.351 — Freies Profil: „Freies Profil, <Name der Massaufnahme>“

Wunsch (Screenshot): statt „Freies Profil, 6 Schenkel“ soll „Freies Profil, PV Brustblech“ stehen. js/31 `fpaAusmassZeilen` schreibt „Freies Profil, <Titel>“ (ohne Titel wie bisher); js/85 `kaSammeln` zeigt für ältere gespeicherte Zeilen „Freies Profil, N Schenkel“ den Titel der Massaufnahme (nur Anzeige, nichts wird umgeschrieben; die Herkunft zeigt den Originaltext). Prüfstand `bleilappen-hand-v3-350` auf 24.

### v3.350 — Anzahl Bleilappen von Hand, Bleilappen nur einmal, Freies Profil mit Bezeichnung, Komplettausmass im Ausmass

Wünsche: (1) Bleilappen standen doppelt im Komplettausmass → feste Zeile oben entfernt, die Kachel heisst jetzt „Bleilappen“ ohne „(Teil)“. (2) Anzahl Bleilappen in allen Massaufnahmen mit Bleilappen anpassbar: neues Feld „Anzahl Bleilappen von Hand (leer = berechnet)“ bei Dachfenster (js/66), Kamin (js/37), Einfassung rund (js/38, Gesamtzahl) und Anschlussblech Art Bleilappen (js/20, index.html `anb_bleilappenManuell`); `bleilappenManuell` wird gespeichert/wiederhergestellt, ersetzt die berechnete Gesamtzahl (auch im Ausmass und damit im Komplettausmass; Herkunft „von Hand gesetzt (berechnet: n)“); leer = wie bisher. 0 ist ein gültiger Handwert. (3) Freies Profil: erste Ausmass-Zeile trägt die Bezeichnung der Massaufnahme (Titelfeld), ohne Bezeichnung die bisherige Zeile. (4) Im Ausmass-Formular (`ausmassEditModal`) gibt es „📊 Komplettausmass dieses Projekts ansehen“ (nur Anzeige; nur wenn das Ausmass aus dem Projekt geöffnet wurde, sonst Hinweis).
Prüfstand `bleilappen-hand-v3-350` (23); Mutationen (Handwert ignoriert je Modul, Freies Profil ohne Bezeichnung) erkannt; `komplettausmass-v3-341` angepasst.

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
