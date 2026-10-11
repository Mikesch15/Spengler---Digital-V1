# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.316`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.316 — Nachtauftrag Paket A: Sicherheit der Edge Functions (Befunde, Fixes, Inventar)

Auftrag „Grosse Weiterentwicklung“ (12.10.2026, Ausgangsstand v3.315 `d13b3df`). Roadmap-Dokument und Fachkonzept liegen NICHT im Repo (nur die Zusammenfassungen `Zusammenfassung_Auftrag_*.txt`); Paket B–G siehe unten bzw. folgende Versionen.
**Behoben (alles deployt, live per pg_net gegengeprüft, Tests lokal):**
- `smart-action` (v16, verify_jwt true): Startpasswort war `Rinnen_`+Initialen (erratbar) → zufällig `Start-xxxxxxxx`; Mail über Gmail mit Resend-Rückfall; kein Doppelversand. **Bestehende Konten unverändert:** laut DB haben 10 von 15 Profilen noch kein eigenes Passwort gesetzt (`passwort_gesetzt=false`) – wurden sie über `smart-action` angelegt, gilt noch das alte Muster → Passwort per 🔑 (Admin) zurücksetzen lassen (manueller Schritt für Mike).
- `register-company` (v12): Einladung wird atomar beansprucht (`PATCH … used_at=is.null`), bei Fehler freigegeben; Rohtexte von Auth/PostgREST nicht mehr in Antworten; (Fund beim Testen: ein `if` ohne Klammern hätte jede Registrierung abgebrochen – im Prüfstand aufgefallen, vor dem Deploy behoben).
- `system-admin-storage-cron` (v4): Geheimnis jetzt im **Supabase Vault** (`storage_cron_secret`, in der DB erzeugt, nie ausgegeben); Cron-Job liest es beim Lauf aus dem Vault; die Funktion fragt `public.system_cron_secret_ok(text)` (nur service_role; anon/authenticated ohne Recht). Migration `cron_geheimnis_im_vault`. **Rotation live belegt:** Lauf mit Vault-Geheimnis 200, ohne/falsch/ALTES Geheimnis 401. **Rest-Risiko:** `cron.job_run_details` enthält in 27 alten Läufen das ALTE (jetzt ungültige) Geheimnis im Klartext; nichts gelöscht. **Rotation künftig:** `update vault.secrets` bzw. `vault.update_secret(id, neuer_wert)` – Funktion und Job brauchen keine Änderung.
- `extract-offer-positions` (v29): Abruf nur noch von https-Adressen des EIGENEN Supabase-Speichers (`/storage/v1/`), kein Redirect, Obergrenze rund 20 MB (413), Typprüfung auch für Abrufe; **Fund:** `err.message` von fetch() nennt die Gemini-Adresse samt `?key=` und ging roh an den Client → jetzt maskiert, nur in `detail`.
- `extract-profile-shape` (v9): Obergrenze Bildgrösse (413).
- `reset-password` (v7) und `password-reset`/`resolve-login-email` (v3.311): CORS-Preflight erlaubte `apikey`/`x-client-info` nicht → Admin-„Passwort zurücksetzen“ erreichte den Server vermutlich nie (aus Code und Logs der Schwesterfunktionen abgeleitet; für reset-password selbst keine Logs mehr verfügbar).
- `password-reset`, `smart-action`, `register-company`: Gmail hat Mail angenommen, aber `close()` scheitert → kein zweiter Versand über Resend. Nicht beweisbar bleibt: ein Timeout VOR der Annahme-Antwort kann theoretisch doppelt zustellen.
- Repo: neue Kopien `smart-action`, `reset-password`, `system-admin-delete-company`, `system-admin-storage-cron` (ohne Geheimnis); CI läuft jetzt mit Node 22 (Prüfstände nutzen `module.stripTypeScriptTypes`).
**Inventar (alle 12 deployten Funktionen):**
| Funktion | verify_jwt | eigene Prüfung | externe Kosten | Befund |
|---|---|---|---|---|
| extract-offer-positions | an | angemeldet + aktive Firma (my_company_id) | Gemini | oben |
| extract-profile-shape | an | dito | Gemini | oben |
| smart-action | an | angemeldet, Rolle admin, Firma aktiv | Mail | oben |
| reset-password | an | admin, gleiche Firma, Firma aktiv | – | CORS; Passwortlänge nur ≥ 8 |
| system-admin-delete-company | an | System-Admin + Firmenname exakt + Dry-Run | – | ok; liefert Rohgrund des Preflights an System-Admins |
| system-admin-storage-aufraeumen / -ansehen | an | System-Admin (gelesen: im Repo) | – | nicht erneut geprüft |
| register-company | **aus** | System-Admin ODER einmaliger Einladungstoken | Mail | oben |
| resolve-login-email | **aus** | Passwortprüfung selbst, Limit 30/IP, 8/Eingabe | – | v3.311 |
| password-reset | **aus** | Limit 3 Mails/Konto/15 Min, fester Link-Host | Mail | v3.310–313 |
| system-admin-storage-cron | **aus** | Vault-Geheimnis (fail closed) | Mail (an Betreiber) | oben |
**Offen / manuell:** (1) 10 Konten ohne eigenes Passwort prüfen/zurücksetzen (s. o.). (2) Supabase-Dashboard → Auth → „Leaked password protection“ ist AUS (Advisor-Warnung; Schalter im Dashboard, nicht per Code). (3) Mails an Dritte: Gmail-Weg läuft (Spam-Ordner); Resend nur an Kontoadresse. (4) `esm.sh/@supabase/supabase-js@2` in `reset-password` ist ungepinnt (Lieferkette). (5) Keine Live-Prüfung mit echtem Benutzer-Token (Erkennung, Mitarbeiter anlegen, Reset) – nur Absagen, Limits und Zugangsregeln am echten Endpunkt.
**Tests:** neu `pruefstand-konten-funktionen-v3-316` (36), `pruefstand-cron-geheimnis-v3-316` (11), `pruefstand-edge-cors-v3-316` (19); erweitert `erkennung-fehlerfaelle-v3-306` (48), `profil-erkennung-sicherheit-v3-308` (26), `passwort-reset-sicherheit-v3-310` (27). Gegenproben (Fix entfernt → rot) für Einladung, Gmail-close, Passwortmuster, Abruf-Ziel, Schlüssel-Maskierung, CORS.

### v3.315 — App-Symbol wieder „SD“

Auftraggeber: Logo wieder auf das blaue „SD“-Symbol (Bildschirmfoto Handy-Ordner). `icon-192.png`/`icon-512.png` = Stand Commit `3bf9d3a` (flaches Blau, weisses SD) statt Dach-Logo (v3.146); Cache-Parameter `?v=1` → `?v=2` in `index.html`, `manifest.json`, `sw.js`. Das Dach-Logo bleibt in der Git-Historie (`aeb63e1`). Das Symbol auf dem Handy aktualisiert Android nicht sofort – App vom Startbildschirm entfernen und neu hinzufügen. Datei dem Auftraggeber als Bild geschickt.

### v3.314 — register-company: Zugangsdaten-Mail über Gmail

Rückmeldung zu v3.313: Reset-Mail kommt an (im Spam), Link funktioniert → Gmail-Weg belegt. Jetzt dieselbe Umstellung für `register-company` (Zugangsdaten-Mail an neue Firmenadmins; scheiterte an Resend-Testabsender).
- `register-company` (Plattform-Version 11, `verify_jwt=false`, beabsichtigt): `zugangsdatenMailen()` bevorzugt Gmail-SMTP (gleiche Secrets, dynamischer Import in try/catch), Rückfall auf Resend; Firmenname/E-Mail/Passwort im Mail-HTML jetzt maskiert (`htmlEsc`). Rest der Funktion unverändert (Zugang nur System-Admin oder Einladungstoken). Live: Aufruf ohne Anmeldung → 403 (Funktion bootet), **Mailversand nicht live geprüft** (würde eine echte Firma anlegen).
- `system-admin-storage-cron` unverändert auf Resend (Empfänger = Resend-Kontoadresse, funktioniert); Geheimnis im Code weiter offen (Audit v3.310).
- Die Plattform-Version springt bei Secret-Änderungen im Dashboard (register-company 8 → 11 ohne Code-Deployment durch uns).

### v3.313 — Reset-Mails über Gmail (SMTP) statt Resend-Testabsender

Weg 2 aus der Rückfrage (keine eigene Domain): Auftraggeber hat das Konto `spenglerdigital1@gmail.com` angelegt, ein App-Passwort erstellt und die Edge-Secrets `GMAIL_USER` + `GMAIL_APP_PASSWORD` im Supabase-Dashboard gesetzt (Wert nie im Chat/Repo).
- `password-reset` (Plattform-Version 7, `verify_jwt=false`): neue `mailSenden()` – bevorzugt Gmail-SMTP (`denomailer@1.6.0`, `smtp.gmail.com:465` TLS, dynamischer Import in try/catch), bei fehlenden Secrets oder Fehler Rückfall auf Resend. Fehlerlog ohne Passwort. Absender = `GMAIL_USER`.
- **Live (pg_net):** Reset-Anfrage für die Adresse der Testfirma → `200 {ok:true}`, Token angelegt, im Funktionslog KEIN Fehler (weder Gmail noch Resend) – das spricht für einen erfolgreichen Versand, **ist aber kein Zustellbeleg**; der Empfang muss der Auftraggeber bestätigen (Spam-Ordner prüfen).
- **Grenzen:** Gmail ~500 Mails/Tag; Mails einer Privatadresse landen eher im Spam; Betrieb hängt am Google-Konto (Passwortwechsel/Löschen des App-Passworts stoppt den Versand). Die Plattform-Version sprang von 4 auf 7 (zwischenzeitliche Deployments ausserhalb dieser Session, z. B. durch Dashboard-Aktionen; Inhalt jetzt = Repo).
- **Noch auf Resend (offen):** `register-company` (Zugangsdaten-Mail an neue Firmenadmins – genau die Testfirmen-Adresse betrifft das) und `system-admin-storage-cron` (geht an die Resend-Kontoadresse, funktioniert). Umstellung von `register-company` ist der nächste Schritt, sobald der Empfang bestätigt ist.
- Tests: `pruefstand-passwort-reset-sicherheit-v3-310.js` 24 Prüfungen (neu: Rückfall auf Resend wenn Gmail scheitert, Passwort nirgends in Log/Antwort/Mail). **Nicht lokal testbar:** der echte SMTP-Versand.

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
