# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.274`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.274 — verwaiste Dateien ansehen, „Archiv und Filter" in der neuen Ansicht

**1. Verwaiste Dateien ansehen** (Ansage 9.10.2026). Die Liste in der
System-Administration zeigte nur Pfade. Jetzt hat jede Zeile **👁 Ansehen**
(`js/22`): Bild inline, PDF/Tabelle als Link, zweiter Klick schliesst.
Die Storage-Policy `tenant read own storage files` verlangt eine Referenz der
eigenen Firma — der Client kann verwaiste Dateien also nicht selbst lesen. Darum
eine **neue, rein lesende Edge Function `system-admin-storage-ansehen`**
(repo: `supabase/functions/…`, im Projekt **v1 bereitgestellt**): prüft den
Aufrufer gegen `system_admins`, prüft den Pfad gegen
`system_admin_verwaiste_storage()` (mit dem Nutzer-JWT), stellt einen
Signed-URL-Link (300 s) aus. Bewusst **nicht** in die Löschfunktion eingebaut.
**Nicht live getestet** (Sandbox ohne Verbindung zu Supabase): geprüft ist die
Oberfläche mit gestubbter Antwort; die Funktion selbst ist nur bereitgestellt.

**Fund:** die Datei `system-admin-storage-aufraeumen/index.ts` im **Repo** ruft
noch das alte, nicht existierende `POST /object/remove/{bucket}` auf; die im
Projekt **bereitgestellte v3** nutzt das richtige `DELETE /object/{bucket}`
(seit v3.95). Das Repo hinkt nach. Nicht angefasst (das Ändern der Löschfunktion
wurde in dieser Sitzung blockiert und war für das Ansehen nicht nötig) — beim
nächsten Mal das Repo auf den bereitgestellten Stand ziehen, nicht umgekehrt
deployen.

**2. „Archiv und Filter"** (Ansage 9.10.2026: „noch die alte Ansicht"). Der
Schirm ist derselbe (v3.156), seine Karten waren die klassischen. Jetzt
dieselbe Zeile wie auf der Projektseite (`js/09 renderProjectList`): Titel,
Zusatz, Statusmarke, Pfeil; Nebenaktionen klein darunter. **Nur das Aussehen:**
gleiche `data-open-cockpit` / `data-edit-project` / `data-archive-project` /
`data-del-project`, derselbe Handler; `.project-row` bleibt als Marke
(Warteschlangen-Prüfstand). CSS in `css/05` unter `.a2-nur-liste` (Suchfeld,
Filter in je einer wischbaren Zeile, Erklärsatz weg), Archiv-Knopf trägt die
Klassen `a2-knopf a2-k-grau a2-k-voll` (`index.html`).

Prüfstände: `archiv-ansicht-v3-274` (neu, 15), `verwaiste-dateien-v3-95` 21
(vorher 11: Ansehen, PDF-Link, Fehler, Gegenprobe „ruft nie die Löschfunktion").

### v3.273 — Dachfenster „separat": zwei Seitenteile je Seite

Ansage (8.10.2026): „Es braucht bei separat zwei Seitenteile. Das mittlere ist
einfach Mass I, und das vordere Seitenteil wird gerechnet wie jetzt. Alles
andere bleibt gleich." Dazu: das „+10" beim Seitenteil gefalzt **bleibt B**.

**Korrektur an v3.270:** dort hatte ich „bei zwei separaten Teilen wird auch so
gerechnet" falsch gelesen — beide Bauarten rechneten *ein* Seitenteil mit
G + I − H. Nun: **Knick** = sechs Zuschnitte wie bisher; **separat** = acht
(je Seite *Seitenteil vorne*, *Seitenteil Mitte*, *Seitenteil hinten*).
- vorne: Länge **G** (gefalzt C + G + B), Breite wie das durchgehende (190);
- Mitte: Länge **I**, gleiche Breite;
- H (Überlappung) steckt in G und I und ändert keines der Teile;
- Vorderteil, Hinterteil, Seitenteil hinten unverändert; Bleilappen rechnen
  weiter mit der Gesamtlänge (G + I − H).

**ANNAHME:** „wie jetzt" = Regel des durchgehenden Seitenteils, aber mit **G**
(nicht der Summe) als Länge — sonst wäre I doppelt gezählt. Falls der Anwender
das vordere Seitenteil über die Summe meint, ist es eine Zeile in
`dfaZuschnitte` (`dfaSeite("b")` → `dfaLaenge`).

Prüfstand `dachfenster-ausfuehrung-v3-270` 101 (separat: acht Zuschnitte, G/I/H
einzeln verändert, Gegenproben; Mutation „separat wie Knick" → 12 rot),
`dachfenster-schnitt-v3-260` 57 (separat wieder acht; die Zwischenfassung
„Summe als ein Stück" steht als Gegenprobe).

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
