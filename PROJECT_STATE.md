# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.348`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.348 — Komplettausmass: Ecken, Scharen, Knicke ausgeblendet

Wunsch: „Raus kann noch Ecken, Scharen, Knicke.“ js/85 `KA_AUSGEBLENDET` um `^ecken?`, `^schar(en)?`, `^knick` ergänzt (Stückzahlen wie „Ecken“ bei Mauerabdeckung, „Scharen“ bei Lukarne, „Knicke im Verlauf“ bei Anschlussblech); Hinweistext und Prüfstand `komplettausmass-v3-341` (58, Mutationen je Muster erkannt) angepasst. Weiterhin NICHT ausgeblendet: Schieber, Boden, Rinnenboden, Aussenwinkel, Dehnungsstücke, Schiebestutzen, Rinnenhalter, Längen in m.

### v3.347 — Komplettausmass aufgeräumt, als Kacheln, offen auf der Projektübersicht

Wunsch (3 Nachrichten): ins Komplettausmass gehören nicht: Biegungen, Blechstösse, Umschläge, Einfassungen nur als Komplettstückzahl je Einfassungsart, Endzugaben, Gehrungen, GAVA-Haltebleche, Segmente, Stücke; nicht so versteckt platzieren; schöner auflisten wie die Bleilappen. Grundlage: alle echten Ausmass-Bezeichnungen der Firma abgefragt (nur lesend). js/85: `kaAusgeblendet` (Muster für biegung, stoss/stösse, umschlag/umschläge, endzugabe, ^gehrung, gava/haltebleche, ^segment, stück/zuschnitte – Stückzahlen; „Blechfläche Zuschnitt“ in m² bleibt) – solche Zeilen werden vor allem anderen verworfen (auch ungültige Mengen erscheinen nicht unter „Zu prüfen“), ihre Zahl steht als Hinweis dabei; `kaEinfassungArt`: „Dachfenstereinfassung, <Deckart>“ → „Dachfenstereinfassungen“, „Kamineinfassung, …“ → „Kamineinfassungen“, „Einfassungen rund“ bleibt, „Einfassung N · Titel“ entfällt; Quellen bleiben in der Gruppe. Stk-Spalte der Material- und Mengenübersicht = diese Einfassungs-Stückzahlen. Anzeige: je Mengenposition eine Kachel (Name, fette Summe, „aus n Massaufnahmen“, Dubletten-Hinweis), Bleilappen weiter als feste Zeile oben. Platzierung: `kaA2Html()` jetzt offen auf der Projektübersicht (js/70, zwischen Projekt-/Mengenübersicht und Ablauf; auch weiter im Register Ausmass); die Kurzzeile „Komplettausmass“ mit Knopf entfällt. Bewusst NICHT ausgeblendet (nicht genannt): Ecken, Scharen, Knicke, Schieber, Boden, Rinnenboden, Aussenwinkel, Dehnungsstücke, Schiebestutzen, Rinnenhalter, Längen in m. Keine Datenänderung.
Prüfstand `komplettausmass-v3-341` 58; Mutationen (Biegungen/GAVA/Segmente nicht ausgeblendet, Einfassung nicht je Art, Einzel-Einfassungen bleiben, Komplettausmass wieder versteckt, nichts ausgeblendet) erkannt; `cockpit-dashboard-v3-343` angepasst.

### v3.346 — Geltende Offerten wählbar (angebote.gilt)

Wunsch: „Die geltenden Offerten sollen ausgewählt werden können, wenn mehrere dann getrennt anzeigen.“ Das ist die seit v3.335 offene Frage „welche Offerte gilt“. Einzige Datenbankänderung (additiv, vorab geprüft: Spalten und Policies von `angebote` angesehen – `has_permission('angebote','edit')` plus RESTRICTIVE `tenant_boundary_angebote`/`feature_boundary_angebote`, spaltenunabhängig): Migration `angebote_gilt_kennzeichen` = `alter table public.angebote add column gilt boolean not null default true` (Standard true: bestehende Offerten gelten, nichts ändert sich). Rollback-Test mit Nutzer-Impersonation (alles per Exception zurückgerollt): PETER-Admin ändert 1 Zeile, Mitarbeiter ohne Offerten-Freigabe 0, Testfirma-Admin 0 und sieht 0. Code: js/63 – `angGeltende` (nur ein ausdrückliches false schliesst aus), `angMengenKurz`/`angMengenHtml` zeigen nur geltende (mehrere = je Offerte getrennt, nie addiert; Hinweis „n von m nicht als geltend markiert“; keine geltend = ausdrücklicher Text), `angGiltHtml` (Kontrollkästchen je Offerte, ab zwei Offerten; im Register Offerte der Ansicht und in der Cockpit-Karte), Handler schreibt genau `{gilt}` auf die eine Offerte (`update … eq id … select id`; 0 Zeilen = RLS blockiert → Kästchen springt zurück, Meldung). js/85 – Material- und Mengenübersicht: jede geltende Offerte bekommt eine eigene Spalte (kein Umschalter mehr zwischen Offerten, `kaMaterialZeilen` nimmt eine Liste). js/70 enthält nur das Markup, keinen Schreibweg. Nicht geändert: Offertpositionen, Massaufnahmen, Rechenkerne.
Prüfstand `offerte-gilt-v3-346` (14); Mutationen (gilt ignoriert, falsches Flag, RLS-0-Zeilen nicht geprüft, Summe statt getrennt, Karte ignoriert gilt) erkannt; `cockpit-dashboard-v3-343` (36), `komplettausmass-v3-341`, `projektuebersicht-v3-340` angepasst.

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
