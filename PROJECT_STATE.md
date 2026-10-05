# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.259`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.259 — fünf rote Prüfstände, und sparsamer arbeiten

**1. Die fünf Regressionen aus v3.258.** Alle aus einem Grund: sie messen
Aufgaben*zeilen*, und die sind seit v3.258 zugeklappt. An der App war nichts
kaputt. Statt denselben Ablauf fünfmal einzusetzen, steht er jetzt in
`pruefstaende/aufgaben-aufklappen.js` — einmal, mit beiden Fallen
dokumentiert (Schnappschuss wird durchs Neuzeichnen ungültig; über den echten
Weg klicken, nicht über den Zustand). Der Helfer gibt es auch als
`window.__aufgabenAufklappen()` für Prüfstände, die Aufbau und Messung in
einem `evaluate` machen — derselbe Rumpf, daraus erzeugt.

**2. Warum die Schnellprüfung sie verpasst hat.** Ich hatte die Prüfstände
*nach Namen* ausgesucht. Beide Fehlschläge heute (v3.252, v3.258) betrafen
`js/70`, und beide Male hiessen die übersehenen Prüfstände anders als die
Änderung. **Ein Name ist keine Abhängigkeit.** `CLAUDE.md` nennt `js/45`,
`js/70`, `index.html` und `css/05` jetzt beim gemeinsamen Kern — und dort
läuft die volle Regression **vor** dem Veröffentlichen.

Ein Werkzeug, das die betroffenen Prüfstände aus dem Diff *ableitet*, habe
ich gebaut und **wieder weggeworfen**: es fand nur 2 der 5. Verhaltens-
änderungen lassen sich per Textsuche nicht vorhersagen — die fünf hängen an
`.a2-zeile-reihe`, und das stand im Diff gar nicht. Ein Netz, das drei von
fünf durchlässt, ist schlimmer als keines, weil man sich darauf verlässt.

**3. Tokensparend arbeiten** (Ansage des Anwenders), als Regel in `CLAUDE.md`
festgehalten, mit den gemessenen Zahlen:

| Massnahme | gemessen |
|---|---|
| `PROJECT_STATE.md` auf Stand + 3 Versionen + Regeln gekürzt | 67 053 → ~14 800 Zeichen (**−13 000 Token je Lektüre**) |
| Architektur/Workflow hier gelöscht (stand doppelt in `CLAUDE.md`, und falsch: „Module 01 bis 78") | eine Wahrheit statt zwei |
| `werkzeug-version.js` statt elf Handgriffe je Version | ~600 Token und eine Fehlerquelle je Version |
| Nie grosse Dateien ganz lesen | `index.html` ~55 000, `js/41` ~42 000, `js/70` ~30 000 Token |

`CLAUDE.md` wuchs dabei netto um 1 556 Zeichen — die neue Regel kam dazu,
zwei doppelte Regeln fielen weg. Das sind ~400 Token je Sitzung, gegen
~13 000 gesparte je PROJECT_STATE-Lektüre.

### v3.258 — die Aufgabenliste startet zugeklappt

Ansage des Anwenders: „Drehe es um, so dad zugeklappt standart ist."

In v3.257 war die Vorgabe **aufgeklappt**, begründet mit einer Messung (7
offene Aufgaben auf 4 Projekte, im Schnitt 1,8 — da verbirgt Zuklappen wenig).
Die Messung stimmt weiterhin; sie beantwortet aber nur, wie **viel** auf dem
Schirm steht, nicht, wie der Betrieb morgens arbeiten will. Das entscheidet
der Anwender, und er hat entschieden. Die Zahl steht weiter im Code — als
Nachvollziehbarkeit, nicht als Gegenargument.

**Mit der Vorgabe dreht sich das Gemerkte.** Bei „zugeklappt ist Standard"
muss gemerkt werden, was jemand **geöffnet** hat; das Zugeklappte zu merken
wäre wirkungslos, es ist ja ohnehin alles zu. Aus `a2AufgabenZu` wird
`a2AufgabenAuf`.

**Der localStorage-Schlüssel ist ein neuer** (`sd_a2AufgabenAuf`), und der
alte (`sd_a2AufgabenZu`) wird beim Laden einmal weggeräumt. Das ist der Punkt,
an dem es sonst still schiefgegangen wäre: die alte Liste steht in jedem
Browser, der v3.257 geladen hat, und bedeutet das **Gegenteil** — unter dem
neuen Namen weitergelesen hätte sie genau die Projekte aufgeklappt, die der
Anwender zugeklappt hatte. `pruefstand-aufgaben-je-projekt-v3-257` C9 hält das
fest.

Der Prüfstand ist durchgehend **umgestellt, nicht abgeschwächt** (30 statt 27
Prüfungen): C1/C1a/C1b auf die neue Vorgabe, C8 auf die umgekehrte
Merk-Richtung, E auf die umgekehrte Knopfbeschriftung. Abschnitt B klappt für
die Reihenfolgemessung ausdrücklich auf und setzt danach auf die Vorgabe
zurück — sonst hätte er C den Zustand vorweggenommen.

**Zwei weitere Prüfstände mussten mit**, beide aus demselben Grund (sie messen
Aufgaben*zeilen*, und die sind jetzt zugeklappt). Beide **erweitert, nicht
angepasst**:
- `ansicht2-v3-150` B5: klappt über den echten Weg auf und prüft die alte
  Zusage dort; neu B5a (zugeklappt steht keine Zeile da) und B5c (dafür nennt
  jeder Kopf seine Anzahl) als Gegenproben zur neuen Vorgabe.
- `bereiche-v3-156` H: klappt vor der Breitenmessung auf.

Dabei zweimal dieselbe Falle: ein Schnappschuss aus `querySelectorAll` wird
durch das Neuzeichnen nach dem ersten Klick ungültig — die übrigen Elemente
hängen nicht mehr im Dokument, ein Klick darauf tut nichts. Beide Stellen
suchen jeden Kopf jetzt einzeln neu. Steht als Kommentar dort.

### v3.257 — die Tagesaufgaben je Projekt, zuklappbar

Ansage des Anwenders: „Fasse die tagesaufgaben auf der startseite pro projekt
zusammen und mach die projekte zuklappbar."

- `a2AufgabenNachProjekt()` (js/70) legt die Aufgaben **in der Reihenfolge von
  js/45** in Eimer. Ein Projekt steht damit dort, wo seine dringendste Aufgabe
  stünde — keine eigene Rangfolge, keine zweite Meinung darüber, was zuerst
  drankommt. Das war die Zusage, die beim Gruppieren am leichtesten kaputtgeht;
  `pruefstand-aufgaben-je-projekt-v3-257` Abschnitt B hält sie fest.
- Der Gruppenkopf nennt Projekt, Anzahl und ob etwas dringend ist — genug, um
  ohne Aufklappen zu entscheiden.
- Zuklappen je Projekt, gemerkt in `localStorage` (`sd_a2AufgabenZu`).
  Gemerkt wird das **Zugeklappte**: eine neu dazukommende Baustelle ist dadurch
  von selbst offen.
- `Alle zuklappen` / `Alle aufklappen` im Abschnittskopf, nur ab zwei Gruppen.

**Voreingestellt ist aufgeklappt — gemessen, nicht geraten.** Am 5.10.2026
standen in der Produktionsdatenbank **7 offene Aufgaben auf 4 Projekten**, im
Schnitt 1,8 je Projekt. Alles zuzuklappen hätte kaum etwas verborgen und jeden
Handgriff einen Tipp teurer gemacht.

**An den Aufgaben selbst ändert sich nichts** — dieselben Zeilen, dieselben
`data`-Marken, derselbe Weg nach js/45. Abschnitt F prüft das, samt der
Gegenprobe, dass ein Tipp auf den Gruppenkopf **keine** Aufgabe ausführt
(beide liegen in derselben Liste und tragen data-Marken).

**Dabei eine Prüfung geschärft statt umgangen:** `ansicht2-v3-150` F1 hält
fest, dass js/70 nichts in die Datenbank schreibt — suchte das aber per
Textsuche nach `.delete(` und schlug deshalb bei `Set.delete()` an. Sie prüft
jetzt den Supabase-Weg (`sb.from(`), mit Gegenprobe F1a, dass ein echter
Schreibweg weiterhin gefunden würde.

### v3.256 — Korrektur an v3.254: die Statusnummer gehört nicht ganz weg

Die volle Regression hat gefunden, was ich in v3.254 zu weit korrigiert habe.
`pruefstand-angebote-v3-34` hält seit v3.34 fest: ein HTTP-Fehler der Edge
Function **nennt seinen Status** und scheitert nicht still. v3.254 liess die
Nummer ganz weg, sobald eine lesbare Meldung da war.

**Gemeldet war die Schachtelung, nicht die Zahl** („Server antwortete mit
Status 502: Server antwortete mit Status 503: {rohes JSON}"). Beides ist jetzt
erfüllt: der lesbare Satz zuerst, die Nummer als Anhang —
`… nochmals auf „Erkennen" tippen. (Status 503)`.

Beide Prüfstände sind **umgestellt, nicht abgeschwächt**:
- `angebote-v3-34`: prüft jetzt, dass die Zahl da ist **und** nach dem Satz
  steht, plus die Gegenprobe, dass kein zweiter Status-Vorsatz im ersten
  steckt — genau das war gemeldet.
- `erkennung-ueberlastet-v3-254`: A4b/A4c halten die neue Stellung fest.

**Offen angemerkt:** `js/17-ausmass.js` steht in `angebote-v3-34` auf einer
„nicht anzufassen"-Liste aus v3.34. Die Änderung dort war nötig —
`recognizePhoto()` ist die eine Stelle, die alle vier Erkennungswege benutzen;
sie in js/63 zu überschreiben wäre eine zweite Wahrheit. Zu wissen ist dabei:
diese Prüfung liest `git diff HEAD`, sieht also **nur den offenen Arbeitsbaum**
und ist nach jedem Commit wieder grün. Sie ist ein Schutz während einer
Änderung, keine dauerhafte Zusicherung über die Historie. Was wirklich schützt,
steht daneben und bleibt grün: `recognizePhoto` ist im ganzen Repo ein Unikat.

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
