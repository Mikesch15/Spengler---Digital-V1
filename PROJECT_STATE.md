# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.294`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.294 — Rüstblatt: bei Dachfenster und Kamin nur die kurze Auswahl

Ansage (10.10.2026): „Jetzt steht mir zu viel dort, z. B. beim Dachfenster. Es reicht, wenn die Breite
vorne und hinten sowie der Lattenabstand, die Gesamtzahl Bleilappen, die Eindeckart und das Material
da steht und ob gefalzt oder nicht; die restlichen Infos stehen zum Teil doppelt da.“
`js/80 RB_ANGABEN` + `rbKurzeAngabenHtml`: für `dachfenstereinfassung` (Deckungsmaterial, Material,
Ausführung, Breite vorne / hinten, Lattenabstand + „Bleilappen gesamt“ aus `data.bleilappen.gesamt`) und
`kamineinfassung` (dasselbe ohne Ausführung, **zusätzlich Kaminlänge längs Dach** — Annahme: sie steht
nicht in der Zeichnung) nur diese Zellen, gelesen aus dem PDF-Aufbau; Stückliste und Bleilappen-Tabelle
entfallen (Zuschnittliste und Zeichnung bleiben). Alle übrigen Arten behalten den vollen Block (v3.293);
ob die auch gekürzt werden sollen, ist offen. Prüfstand `ruestblatt-masse-v3-293` um Abschnitt D erweitert
(keine weiteren Angaben, ein Block, Gesamtzahl stimmt mit dem Datensatz; Mutation rot).

### v3.293 — Rüstblatt: alle Produktionsmasse ohne Klick

Ansage (10.10.2026): „Auf dem Rüstblatt müssen wirklich alle für die Produktion nötigen Masse vorhanden
sein, es darf kein zusätzlicher Klick brauchen.“ **Befund:** das Blatt (js/80) zeigte nur Zeichnungen und
Zuschnittliste; die Angaben (Abwicklung, Gesamtlänge, Winkel, Montage, Mass A, Segmente, Stücke mit
Gehrung, Bleilappen, Normlängen …) standen nur im Formular und im PDF. Mit abgeschaltetem Block fielen
im neuen Prüfstand 28 von 48 Prüfungen (z. B. Kamineinfassung: Lattenabstand, Umschläge, f/g; Kehle: nh, nl,
gl, Abwicklung; Einlaufblech: Abwicklung, Gesamtlänge).
**Umsetzung (eine Quelle, kein zweiter Zusammenbau):** `js/16 measPdfAufbau(m,ctx)` — der synchrone
Druckkörper aus `printMeasurement` herausgezogen (das PDF druckt unverändert denselben Aufbau).
`js/80 rbMasseHtml(m)` zerlegt ihn mit `pdfAbschnitteZerlegen` (js/35) und nimmt die Kategorien
masse/zusammenfassung/stückliste/Normlängen; Zeichnungen (kommen schon aus `rbSkizzenHtml`), der
abhakbare Zuschnitt, Ausmass, Material, Kontrolle und Bilder entfallen. Eingebaut in `rbBlattHtml` →
wirkt überall (Werkstatt, Projektseite, Ausführungsansicht, gross). Bildschirm-CSS `.rb-masse` am Ende von
`css/05-ansicht2.css` (Tabellen scrollen seitlich). Hilfe „Rüstblatt“ angepasst.
Prüfstand `ruestblatt-masse-v3-293` (48): dieselbe Regel wie `blatt-vollstaendig-v3-262` am Rüstblatt —
jedes gespeicherte Mass jeder Art steht im Blatt (gleiche Ausnahmen mit Grund), alle PDF-Angaben stehen
im Blatt ohne Knopf, das PDF druckt weiter genau den Aufbau. **Nicht auf echtem Gerät geprüft.**

### v3.292 — Rüsten und Montage: Aufgabe führt in die Ausführungsansicht (Roadmap-Priorität 3)

Auftrag (10.10.2026, direkt auf main). **Bestand (Code):** Statuskette, Zuweisung
(`measurement_zuweisen`), `measurement_geruestet`/`_montiert` (Berechtigung zugewiesene Person oder
Admin, serverseitig), Audit-Log, Aufgaben (js/45), Werkstatt-Karte mit Rüstblatt + „Rüsten bestätigen“,
„Material & Zuschnitt“ — alles vorhanden. **Belegte Lücke:** Die Aufgabe „Zu rüsten“/„Zu montieren“
auf Heute öffnete das VOLLE Formular (`aufgabeOeffnen`), der blaue Knopf bestätigte ohne dass man
etwas gesehen hatte; das Rüstblatt (`rbGross`) zeigte weder Baustelle, Hinweise, Fotos, Status noch
Zuständige und hatte keinen Bestätigen-Knopf.
**Umsetzung (bestehende Ansicht erweitert, kein neuer Schirm):** `js/45 aufgabeAusfuehrungOeffnen`
lädt die volle Zeile und öffnet `rbGross(id,"startScreen",{ausfuehrung})`. `js/80`: `rbInfoHtml`
(Projekt/Auftrag, Status, Aufgenommen von/Rüster/Monteur, Projekthinweis, Notiz, „Freigabe
verfallen“, „Alter Zuschnitt“ (Dachfenster, v3.282), Foto-/Skizzen-Kacheln), Monteur ohne
Zuschnittliste, fehlender Zuschnitt wie bisher gekennzeichnet; `rbAktionZeichnen`: Knopf
„Rüsten/Montage bestätigen“ (Marke `data-aufgabe`, also dieselbe Rückfrage und derselbe RPC wie
Werkstatt) nur für zugewiesene Person/Admin und passenden Status, sonst „Bestätigen kann <Name>“.
Erfolg schliesst die Ansicht und lädt Liste/Werkstatt neu; Fehler: Meldung, Ansicht bleibt.
`js/70 a2AufgabeHtml`: Zeile → `ausfuehrung_ruesten|montieren`. Keine Migration, keine neue Statuslogik.
Prüfstand `ruesten-montage-v3-292` (24; vier Mutationsproben rot); `startseite-v3-158`,
`workflow-v3-05`, `aufgaben-je-projekt-v3-257` auf den neuen Vertrag umgestellt (mit Gegenprobe:
Freigeben/Zuweisen öffnen weiter das Formular). **Nicht live gegen Supabase geprüft.**
**Nächste Priorität:** laut Roadmap nicht feststellbar (Dokument liegt nicht im Repo).

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
