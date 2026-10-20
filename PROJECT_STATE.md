# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.407`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.
- v3.374: Wetter auf der Startseite kommt von MeteoSchweiz über die Edge Function `wetter-meteoschweiz` (Ort = PLZ der Firmenadresse, Zwischenspeicher-Tabelle `wetter_cache` ohne Policy). Kein Wind. Live-Abruf nicht aus der Sandbox testbar. Details: `CHANGELOG_HISTORIE.md`.
- v3.375: Terminplanung (Mehr > Termine, Karte auf Heute): Tabelle `termine` (RLS Firma + projects view/edit), Kalenderimport .ics (js/91 Parser, js/92 Oberfläche), Projekt nur vorgeschlagen, Doppelte über `ics_uid`.
- v3.376: Zeitmessung (js/93): Stoppuhr Start/Pause/Weiter/Stopp, nur localStorage, Rundung auf 15 min, Übernahme als Arbeitsposition im Regierapport; Karte auf Heute. v3.377: Zeitmessung erweitert (Handeingabe, Projekt/Massaufnahme, zuklappbar, Benachrichtigung; Hintergrund nur solange die App aktiv ist). Rapport-Vorschlag aus der Werkstatt folgt.
- v3.378: Systemadmin getrennt von Firmen: Betreiber-Konto OHNE Profil (Einstieg `?betreiber`, js/22 `betreiberModusStarten`), kein Systemadmin-Knopf mehr in der Firmen-App; Firmenadmins können `companies` nicht mehr ändern (Migration v3376). Altes Konto steht bis zur Bestätigung noch in `system_admins`.
- v3.379: Outlook-Abgleich (pro Mitarbeiter): Edge Functions `outlook-sync` (Cron alle 5 Min + Handtipp) und `outlook-callback`, Tabellen `outlook_verbindungen`/`outlook_termin_map`/`outlook_oauth_state`, Tokens im Supabase Vault. Server-Secret `MS_CLIENT_SECRET` muss vom Anwender im Dashboard gesetzt sein. Kein Webhook, keine Aufgaben-Sync (noch offen). Echte Microsoft-Anbindung nicht getestet.
- v3.380: Zeitmessung: fertige Messungen bleiben erhalten, wenn eine neue startet/erfasst wird (Liste `sd_zeitmessung_liste`, max. 30, je Eintrag Übernehmen/Verwerfen). Betreiber-Konto bestätigt; Entfernen des alten Systemadmin-Eintrags wartet auf ausdrückliche Bestätigung.
- v3.381: Zeitmessung „Für wen?“: eine oder mehrere Personen je Messung (`ma`, Namen wie in `settings.employees`); Übernehmen legt je Person eine Arbeitszeile mit deren Funktion an.
- v3.382: Link „Betreiber-Anmeldung“ auf dem Anmeldebildschirm (führt zu `?betreiber`), auf der Betreiber-Seite Link zurück; nirgends in der Firmen-App.
- v3.383: Outlook-Diagnose (Anzahl gefundener Ereignisse).
- v3.384: Google-Kalender-Abgleich: gleiche Tabellen/Funktion wie Outlook (`anbieter` google, Adapter `gcal.js`), Edge Function `google-callback`, Server-Secrets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` vom Anwender nötig (Anleitung: `ANLEITUNG_Google-Kalender_Einrichtung.md`). Fenster der Abfrage +/- 1 Tag, leere Antwort löscht nichts. Edge Functions `outlook-sync` + `google-callback` müssen mit den Repo-Dateien bereitgestellt sein.
- v3.385: Kalender-Abo per ICS-Link (nur lesen): Edge Function `kalender-abo` (Cron alle 15 Min + Handtipp), Tabelle `kalender_abos`, Link im Vault (`kalender_abo_url_*`), Termine `quelle='abo'`/`abo_id` (schreibgeschützt per RESTRICTIVE-Policy), Serien-Auflösung in js/91 (`opt.fenster`), nur bekannte Anbieter-Hosts, UI js/96. Einrichtung/Deploy durch Anwender nötig (Anleitung: `ANLEITUNG_Kalender-Abo.md`). Live nicht testbar.
- v3.386: Schirm Termine: Outlook-/Google-/Abo-Boxen und .ics-Import gesammelt in `<details id="terKalenderDetails">` ganz unten, zugeklappt; `terKalenderOeffnen()` öffnet nach Rückkehr von Outlook/Google.
- v3.387: Firmen-Modulregister: Tabellen `module_registry`/`company_modules` (nur Systemadmin schreibt via `system_admin_set_firma_modul`), `modul_aktiv()`, 10 RESTRICTIVE-Policies `modul_boundary_*` (angebote/lager/nachkalkulation), Standard = aktiv; `platform_audit_log` (nur Systemadmin liest; Status/Testphase/Module protokolliert). UI: js/22 + `modulErlaubt` (js/05a). NICHT angewendet: `v3387b_firma_loeschen_protokoll.sql` (Protokollzeile beim Firma-Löschen, Umgebung hat abgebrochen).
- v3.388: Termine: Zuteilung bestimmt Sichtbarkeit. RESTRICTIVE-Policy `termine_zuteilung_sichtbar` (leer = alle; sonst zugeteilte, Ersteller, Admins), Editor «Zuteilen an», 👥 in der Liste; importierte Termine (Outlook/Google/Abo) sind nur für die verbundene Person sichtbar. In Produktion in Rollback-Transaktionen gemessen.
- v3.389: Modulregister vollständig inventarisiert (`module_registry.schaltbar`): schaltbar = angebote, lager, nachkalkulation, termine (je RESTRICTIVE-Policies; Edge Functions `outlook-sync`/`kalender-abo` prüfen das Modul zusätzlich); Kern (nicht einzeln schaltbar, immer an) = projekte, massaufnahme, ausmass, regierapport, leistungen. `meine_module()` + `firmaModule`/`modulAn()` (js/05a) für die Anzeige, Admin-Übersicht `system_admin_module_uebersicht()`.
- v3.390: `ausmass` (+ausmass_kandidaten), `regierapport` (reports), `leistungen` (+leistung_massaufnahmen) pro Firma schaltbar (RESTRICTIVE `modul_boundary_*`, jetzt 19 Policies); Nachkalkulation hängt von angebote UND regierapport ab. Kern bleibt: projekte, massaufnahme. Oberfläche: Body-Klassen `modul-aus-*` (`modulKlassenSetzen`, css/04-rechte.css) + `modulAn()`-Filter in js/70 + `modulPruefen()`-Guards.
- v3.391: Dachrandblech (js/89): Stossart «Schieber» (SIA 271 wie Mauerabdeckung: `madMaterialTabelle`, `calcDilaPositionsInStretch`, Zugabe = `madSchieberMass` oder Wert der Massaufnahme) und Eckschieber als Gehrung pro Ecke mit eigenem Abzug (`dachrand.stoss`, `dachrand.schieber{zugabe,abzug}`, `kanten[].eckschieber`). Alt-Daten bleiben Überlappung. Keine DB-Änderung.
- v3.407: Rüstblatt/Rüstliste: gruppierte Liste (wie Massaufnahme) bei einem Streifen je Abschnitt (js/33 zuHerkunftNoetig).
- v3.406: Rüstblatt drucken: grafische Rolleneinteilung (Schnittbild) wählbar (js/80).
- v3.405: Dachrandblech: Eckschieber mit Zugabe oder Abzug (`schieber.eckModus`, js/89).
- v3.404: Bleilappen: immer 2 gerade (links/rechts); Einfassung rund: Mantelrohr-Abwicklung im Zuschnittplan und Ausmass (js/38, js/77).
- v3.403: Bleilappen: Biber-Wahl (Ortbleche), Position «Bleilappen Fläche» im Ausmass; Metalldach: Randfalze mit Pfeil (Untergriff vorbelegt).
- v3.402: Bleilappen-Zuschnitt nach Deckmaterial (js/101; Karte im Register Zuschnitt, Ausdruck, Rüstblatt); Metalldach beim Neuanlegen zurückgesetzt.
- v3.401: Metalldach: Innenwinkel der Ecken (Tabelle, Plan, Ausdruck).
- v3.400: Metalldach: Falzrichtung je Falz (2 je Bahn), gebogene Pfeile quer zum Falz, Ober-/Untergriff daraus.
- v3.399: Korrektur zu v3.398 (Stärkefeld im Metalldach; Prüfstände nachgeführt).
- v3.398: Neue Massaufnahme-Art «Metalldach» (js/99 Fachrechnung, js/100 Bedienung): Grundriss aus Seiten + Diagonalen, Scharen unter freiem Winkel, Passbahn, Falzrichtung.
- v3.397: Korrektur zu v3.396 (Feld «Wunschlänge für alle Kanten» behält den Wert).
- v3.396: Dachrandblech: Einteilung je Kante nach Anzahl oder Wunschlänge im Register «Stücke» (`kanten[].wunsch`, js/89).
- v3.395: Warnung bei veraltetem Zuschnitt für alle Arten mit Einstellungen (`data._einst`, js/98/js/16/js/80).
- v3.394: Zuschnitt-Einstellungen der Massaufnahme-Arten firmenweit (`app_settings.massaufnahme_einstellungen`, js/98); Warnung im Rüstblatt bei veraltetem Zuschnitt (Einfassung rund, js/80).
- v3.393: Dachrandblech: je Kante «In gleich lange Stücke teilen» (`kanten[].teile`, js/89); Überlappung und Schieber; Warnungen; keine DB-Änderung.
- v3.392: Massaufnahme zur Bearbeitung freigeben: Spalte `measurements.bearbeiter uuid[]`, Policies `measurements_select_geteilt`/`_update_geteilt` (permissiv, verlangen weiter has_permission), Schutz-Trigger `measurements_bearbeiter_schutz` (nur Ersteller/Admin/«alle»; gleiche Firma, max. 25). UI js/97 (Kasten unter dem Arbeitsstatus), `darfBearbeiten(...,bearbeiter)` (js/05a), Vermerk in der Projektliste. Löschen unverändert. In Produktion in Rollback-Transaktionen gemessen.

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
