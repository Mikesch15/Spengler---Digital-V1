# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.315`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

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

### v3.312 — Passwort-vergessen-Link zeigt in die App; Resend-Grenze belegt

Gemeldet (11.10.2026): E-Mail-Login klappt, Offerten-Erkennung klappt; die Reset-Mail kam an (an die eigene Adresse), der Link ging nicht; an die Adresse der Testfirma kam nichts.
- **Link:** `https://mikesch15.github.io/?reset=…` ohne Projektpfad der App → ins Leere. Jetzt schickt der Client `app_url` (`location.origin+location.pathname`, `js/69`); `password-reset` (Version 4) nimmt sie nur an, wenn sie mit `https://mikesch15.github.io/` beginnt und nur unauffällige Zeichen enthält (kein fremder Host, kein `//`, kein `..`), sonst Standard `https://mikesch15.github.io/Spengler---Digital-V1/` (Repo-Name angenommen, nicht geprüft – die App meldet ihren echten Pfad). Der Origin-Header wird nicht mehr benutzt.
- **Mail an andere Adressen (belegt, Funktionslog 11.10. 18:24/18:26):** Resend antwortet 403 „You can only send testing emails to your own email address (mik.ledermann@gmail.com) … verify a domain“. Solange keine eigene Domain bei Resend bestätigt und `VON` darauf umgestellt ist, kommen Reset-Mails (und Zugangsdaten-Mails von `register-company`) nur bei der Resend-Kontoadresse an. **Das kann der Code nicht lösen** – braucht Domain + DNS-Einträge durch den Auftraggeber.
- Tests: `pruefstand-passwort-reset-sicherheit-v3-310.js` 20 Prüfungen (u. a. fremder Host, Unterdomain-/Benutzerinfo-Trick, `javascript:`, Anführungszeichen, zu lang, Doppel-Slash). Deployt: `password-reset` Version 4 (`verify_jwt=false`). **Nicht geprüft:** Klick auf einen echten Link nach dem Update, Passwort setzen per Link.

### v3.311 — Sicherer Login mit Benutzername UND E-Mail (resolve-login-email neu) + Passwort-vergessen-Mail (CORS)

Auftrag (11.10.2026, Ausgangsstand v3.310 `95fecc1`), Entscheid: beide Anmeldewege bleiben.
- **Befund resolve-login-email (v3.310: offen):** öffentliches Nachschlagen E-Mail → interne Pseudo-Adresse (`vorname.nachname@…`), sonst Eingabe zurück → Konten und interne Benutzernamen abfragbar, kein Limit, Kopfkommentar falsch. Die Auflösung MUSS serverseitig bleiben (Mitarbeiter-Auth-Adresse ist die Pseudo-Adresse), konnte aber vom Nachschlagen zum Anmelden werden.
- **Lösung:** Client (`js/03-login.js`, `loginAnmelden`): Benutzername → direkt wie immer; E-Mail → erst direkt (selbst registrierte Admins, Funktion nicht nötig), bei Absage `{login,password}` an `resolve-login-email`. Die Funktion gibt NIE eine Adresse heraus: sie löst intern auf, prüft das Passwort bei Supabase Auth (`/auth/v1/token`, öffentlicher Schlüssel) und liefert bei Erfolg die Sitzung (`setSession`), sonst immer `401 {ok:false}` (bekannt/unbekannt/falsches Passwort/ohne Mitarbeiter-E-Mail identisch; immer dieselben Schritte → kein Zeitunterschied durch übersprungene Arbeit). Eingaben: leer/zu lang (>254 / Passwort >256) → 400.
- **Limit:** neue Tabelle `login_aufloesung_versuche` (Migration, RLS an ohne Policy, anon/authenticated entzogen, nur SHA-256-Hashes): je IP 30, je Eingabe 8 Versuche / 10 Min → 429 für alle gleich; Zähler nicht les-/schreibbar → 503, es wird nichts geprüft (fail closed). **Grenzen:** die IP kommt aus dem Anfrage-Header (kein harter Beweis); wer die E-Mail eines Mitarbeiters kennt, kann dessen E-Mail-Login für 10 Min sperren (Benutzername-Login bleibt frei); bei gleichzeitigen Aufrufen zählt jeder Aufruf die der anderen mit. Alte PWAs (v≤3.310) schicken kein Passwort → Mitarbeiter-E-Mail-Login erst nach App-Neuladen.
- **Passwort-vergessen-Mail kam nicht an (gemeldet):** `password-reset` erlaubte im Preflight nur `authorization, content-type`; supabase-js schickt aber `apikey` und `x-client-info` → der Browser blockierte die POST-Anfrage (Logs 11.10. 18:02: OPTIONS ohne POST), das Formular zeigte trotzdem „Falls …“. Behoben (CORS wie die anderen Funktionen). Aus Code und Logs abgeleitet, **nicht mit echtem Versand belegt**. **Mögliche zweite Hürde, nicht geprüft:** Absender `onboarding@resend.dev` (Resend-Testabsender) darf laut Kommentar in `system-admin-storage-cron` nur an die beim Resend-Konto hinterlegte Adresse senden → Reset-Mails an andere Adressen scheitern ohne eigene verifizierte Domain; der Fehler steht dann nur im Funktionslog. Auch der Link `https://mikesch15.github.io/?reset=…` (ohne App-Pfad) ist ungeprüft.
- **Tests:** `pruefstand-login-aufloesung-v3-311.js` (29, Funktion mit Attrappen; ohne die Fixes 9 rot), `pruefstand-email-auth-v3-103.js` angepasst (56, Client: beide Wege, Funktion Nein/offline), `pruefstand-passwort-reset-sicherheit-v3-310.js` +CORS (13).
- **Deployt (live verifiziert):** `resolve-login-email` Version 2, `password-reset` Version 3, beide `verify_jwt=false` (beabsichtigt, Login-Bildschirm). **Live (pg_net, ohne echte Zugangsdaten):** unbekannte E-Mail, unbekannter Benutzername → beide `401 {ok:false}`; leer → 400; GET → 405; 11 Aufrufe auf dieselbe Eingabe → 429; Zähler enthält nur Hashes. Kein Fehler im Funktionslog (Passwortprüfung mit dem öffentlichen Schlüssel wird von Auth akzeptiert, abgeleitet). **Nicht live geprüft:** Erfolgsfall mit einem echten Mitarbeiter-Konto, echte Reset-Mail, Preflight aus dem Browser.
- Weiter offen aus dem Audit (v3.310): `system-admin-storage-cron` (Geheimnis im Code/Cron-Befehl), `register-company` (Kleinigkeiten).

### v3.310 — Audit der öffentlichen Edge Functions: password-reset gehärtet (Plattform-Version 2)

Auftrag „Sicherheitsprüfung öffentlich erreichbarer Edge Functions“ (11.10.2026, Ausgangsstand v3.309 `61da466`). Code aller vier Funktionen **tatsächlich gelesen** (live per `get_edge_function`), `verify_jwt=false` ist bei allen vier beabsichtigt (Login-Bildschirm / Cron).
- **HOCH, behoben – `password-reset`:** der Link in der Mail wurde aus dem frei setzbaren `Origin`-Header gebaut → mit gefälschtem Origin und einer bekannten Mitarbeiter-E-Mail kam eine ECHTE Mail mit gültigem Token und Link auf eine fremde Domain (Token-Diebstahl → Konto übernehmen, wenn die Person klickt). Fix: feste Liste `ERLAUBTE_ORIGINS` (`https://mikesch15.github.io`), alles andere fällt darauf zurück. **MITTEL, behoben:** keine Begrenzung → Postfach-/Resend-Flut; jetzt höchstens 3 Tokens je Konto in 15 Min (Zählung über `password_reset_tokens`, bei Fehler fail closed), Antwort bleibt immer `{ok:true}`.
- **MITTEL, in v3.311 behoben – `resolve-login-email`:** für eine echte E-Mail eines Mitarbeiters liefert sie die interne Pseudo-Adresse (`vorname.nachname@…`), sonst die Eingabe zurück → Konto-Existenz und interner Benutzername sind für Unangemeldete abfragbar; der Kopfkommentar („kein Leck“) stimmt so nicht; kein Limit. Fix würde den Login mit E-Mail ändern → Entscheid nötig.
- **NIEDRIG, offen – `system-admin-storage-cron`:** Zugang nur über geteiltes Geheimnis (`x-cron-secret`, live: ohne/falsch → 401), aber das Geheimnis steht im Funktionscode und im pg_cron-Befehl (kein Supabase-Secret), Vergleich nicht zeitkonstant. Wirkung gering (liest Liste, schickt Mail an Betreiber, löscht nichts). Rotation = Änderung am Cron-Job in der DB → Entscheid nötig. Das Geheimnis steht NICHT im Repo.
- **NIEDRIG, offen – `register-company`:** Zugang nur System-Admin oder gültiger, einmaliger Einladungstoken (live ohne beides → 403); Einlösung nicht atomar (doppelter Aufruf mit demselben Token theoretisch möglich), rohe Auth-Fehlertexte, Firmenname ungefiltert im Mail-HTML (nur System-Admin-Weg).
- Code liegt neu im Repo: `supabase/functions/password-reset/index.ts` (+ `HISTORIE.md`). Prüfstand `pruefstand-passwort-reset-sicherheit-v3-310.js` (12 Prüfungen; ohne die zwei Fixes 5 rot). Live (pg_net, Version 2): unbekannte E-Mail mit fremdem Origin → `{ok:true}`; Bestätigen mit Fantasie-Token → 400 „ungültig“; Cron ohne/mit falschem Geheimnis → 401; register-company ohne Anmeldung → 403. **Nicht live geprüft:** echter Versand an ein Konto. Offen/latent: der Link baut `https://mikesch15.github.io/?reset=…` ohne Pfad – ob der Reset-Link in der Praxis die App erreicht, ist nicht belegt.
- **v3.309 Nachtrag (Erkennung „Failed to fetch“):** Edge-Logs 11.10. 17:06–17:19 UTC: `extract-offer-positions` antwortete 200 (6 KB) nach **80 s** bzw. **32 s**; ein früherer Versuch 401 (Gateway). Die Funktion arbeitet, die Antwort kommt aber teils erst nach über einer Minute – im Mobilnetz bricht der Browser dann ab. Ursache nicht endgültig belegt; Folgeidee: Antwort in Stücken/Keep-alive oder Hintergrund-Erkennung.

### v3.309 — Offerten-Erkennung: „Failed to fetch“ verständlich

Gemeldet (Bildschirmfoto, PDF „Positionen erkennen“): „Fehler bei der Erkennung: Failed to fetch“. **Befund:** die Gateway-Ablehnungen (401) tragen CORS-Header (gemessen, `net._http_response`), ein 401 durch v3.307/v3.308 wäre als Satz angekommen – es ist ein reiner Netzwerkfehler von `fetch()` (Anfrage kam nicht an / Antwort riss ab). **Ursache nicht belegt:** Edge-Logs waren nicht abrufbar (`function_edge_logs` fehlt/Backend-Fehler); Vorbild ist der Fall v3.43 (langer POST im Mobilnetz). **Änderung:** `js/17` (`recognizePhoto`) und `js/63` (`angPdfDatenUrlFuerErkennung`) fangen den Netzwerkfehler und nennen den Schritt (Speicher bzw. Erkennungsdienst) und was zu tun ist. Funktion unverändert (v26). Offen: Wiederholung durch Mike mit demselben PDF; bei erneutem Fehler Edge-Logs prüfen (OPTIONS ohne POST = Verbindungsabbruch).

### v3.308 — Profilskizzen-Erkennung nur für angemeldete Personen + KI-Funktions-Inventar (Edge Function extract-profile-shape, Fassung 5)

Auftrag (11.10.2026, Ausgangsstand v3.307 `573df27`). **Befund:** `extract-profile-shape` (js/14, Freies Profil → Gemini) hatte
`verify_jwt=true`, der Client schickte aber den **öffentlichen** App-Schlüssel als Bearer und die Funktion prüfte selbst nichts;
der Gateway lässt diesen Schlüssel durch (live an v26 gemessen) → ohne Anmeldung aufrufbar, jeder Aufruf = Gemini-Kosten.
Missbrauch nicht belegt. **Änderung:** gemeinsamer Helfer `erkennungsToken()` (js/17; Token der Sitzung, ohne Sitzung keine
Anfrage + Satz) für `recognizePhoto` und `recognizeProfileSketch` (js/14; 401 des Gateways → Satz); Funktion: `pruefeZugang()`
(`my_company_id()` mit dem Benutzer-Token: anon → 401, ohne aktive Firma → 403, Prüfung nicht erreichbar → 503), Google-Fehler als
deutscher Satz, Rohtext ohne Schlüssel nur in `detail`. Prompt/Modell/Format unverändert, `verify_jwt` bleibt true.
**KI-Inventar (Gemini = einziger externer KI-Anbieter):** `extract-offer-positions` (Aufrufer js/17 → js/63, Gemini, v26 gesichert),
`extract-profile-shape` (js/14, Gemini, jetzt gesichert). `smart-action` ist **keine** KI-Funktion (legt Mitarbeiter an, Resend-
Mail), prüft den Aufrufer selbst sauber (angemeldet + Administrator + aktive Firma). Übrige Funktionen (`reset-password`,
`register-company`, `resolve-login-email`, `password-reset`, `system-admin-*`) rufen nach Name/Aufrufer keine KI auf – ihr Code
liegt nicht im Repo und wurde **nicht** gelesen; öffentlich (`verify_jwt=false`) sind bewusst `register-company`,
`resolve-login-email`, `password-reset`, `system-admin-storage-cron`. **Folgeauftrag (nicht angefasst):** die öffentlichen Funktionen
auf Missbrauch (E-Mail-Versand, Registrierung) ansehen. **Lokal belegt:** `profil-erkennung-sicherheit-v3-308` (22; ohne Prüfung
7 rot, mit altem Bearer 1 rot); Wächter-Prüfstände grün. **Live (11.10.2026, pg_net, Version 6, verify_jwt true):** ohne Header → 401 Gateway; erfundenes Token → 401 Gateway; öffentlicher Schlüssel als Bearer → 401 aus der Funktion; extract-offer-positions (v26) mit Schlüssel → 401 unverändert; Erfolgsfall mit echter Sitzung am
Endpunkt **nicht** durchgeführt (kein Benutzer-Token verfügbar), nur die Voraussetzung in der Datenbank (aktive Person bekommt
über `my_company_id()` eine Firma). **Offen:** manueller Test in der App (Freies Profil: Skizze erkennen, angemeldet und mit
abgelaufener Sitzung), kein Limit je Benutzer.

### v3.307 — Offert-Erkennung nur für angemeldete Personen (Sicherheit; Edge Function v26)

Auftrag (11.10.2026, Ausgangsstand v3.306 `9d2d119`). **Befund:** `extract-offer-positions` hatte `verify_jwt=false`, der Client
sandte als Bearer den **öffentlichen** App-Schlüssel (kein Benutzer-Token) → ohne Anmeldung aufrufbar, jeder Aufruf =
Gemini-Kosten. Ein konkreter Missbrauch ist **nicht belegt** (Logs reichen nicht zurück). **Änderung:** (1) `js/17 recognizePhoto`
sendet das Token der angemeldeten Person (`sb.auth.getSession()`), ohne Sitzung keine Anfrage + verständlicher Satz, 401 → Satz;
(2) Funktion `verify_jwt=true`; (3) `pruefeZugang()` in der Funktion: `public.my_company_id()` mit diesem Token → nur angemeldete
Person mit aktiver Firma (anon → 401, ohne aktive Firma → 403, Prüfung nicht erreichbar → 503, fail closed). Keine Migration,
RLS/Policies unverändert. Modell/Prompt/Wiederholung/Antwortformat unverändert. Details und Grenzen: `supabase/functions/
extract-offer-positions/HISTORIE.md` v26. **Lokal belegt:** `erkennung-fehlerfaelle-v3-306` (35, Datei geladen, Supabase/Gemini
als Attrappe; ohne Prüfung 8 rot), `erkennung-wiederholung-v3-306` (14; alter Bearer → 2 rot); Verträge in
`erkennung-ueberlastet-v3-254`, `angebote-v3-34`, `angebot-pdf-erkennen-v3-39` (Attrappen liefern erst nach dem Start eine Sitzung).
**Live (am echten Endpunkt, per `pg_net` aus der Datenbank ausgelöst, leerer Body, keine Gemini-Kosten, deployte Version 26,
`verify_jwt=true`):** ohne Authorization → 401 (Gateway «Missing authorization header»); erfundenes Token → 401 (Gateway
«Invalid JWT»); falsches Schema → 401; **öffentlicher App-Schlüssel als Bearer → 401 von der Funktion selbst** («Anmeldung
abgelaufen oder ungültig») – der Gateway lässt diesen Schlüssel durch, `verify_jwt` allein hätte also NICHT geschützt.
**Nicht live geprüft:** der Erfolgsfall mit dem Token einer echten angemeldeten Person (kein Konto/Token verfügbar) – er ist
nur lokal belegt (Attrappe). **Offen:** manueller Test in der App (angemeldet → Erkennung geht; Sitzung abgelaufen → Satz),
`extract-profile-shape` (js/14) schickt ebenfalls den öffentlichen Schlüssel und hat **keine** Prüfung in der Funktion →
wegen des Gateway-Verhaltens vermutlich offen aufrufbar (Gemini-Kosten) – eigener Auftrag, nicht angefasst; kein Limit je Benutzer;
ein bereits geladener alter App-Stand (PWA-Cache) bekommt bis zum Neuladen ein 401.

### v3.306 — Offert-Import aus PDF/Foto: zuverlässiger und ohne Doppelte (Edge Function v25)

Auftrag (11.10.2026, Ausgangsstand v3.305 `4a01ee9`). **So läuft es:** Foto → `resizeImageFile` (maxDim 1400/2200 je
«Bildqualität») → `data:`-URL; PDF → `fileZuDataUrl` (max. Erkennungsgrösse `ANG_PDF_ERKENNEN_MAX_BYTES`); beide gehen
durch `recognizePhoto()` (js/17) an `extract-offer-positions`, das MIME-Typ und Inhalt unverändert als `inline_data` an
Gemini reicht (PDF als `application/pdf`); gleiche Positionsstruktur (`pos, description, quantity, unit, preis,
abschnitt`). **Empfehlung:** digitales PDF mit Text > scharfes Foto ≈ gescanntes PDF; Foto/Scan nur, wenn es kein
Original-PDF gibt. **Belegte Lücken (Code):** (a) «Alle Fotos erkennen» las nach einem Teilfehler beim erneuten Tippen
ALLE Fotos nochmals → doppelte Positionen; ebenso Einzelfoto und «Positionen aus dem PDF erkennen»; der Abschlusssatz
sagte «aus N Foto(s) erkannt», auch wenn eines scheiterte; (b) leeres Ergebnis wurde nicht erklärt; (c) Edge Function:
Fehler ausser 503/429 kamen als rohes Englisch, MIME wurde nicht geprüft, Google-Rohtext konnte den API-Key enthalten.
**Behoben:** `js/17` `erkennungQuellen`/`erkenneAlleFotos`/`erkenneEinzeln` (genutzt von js/17 und js/63): schon erkannte
Quellen werden übersprungen, Einzelerkennung fragt nach und ERSETZT, Liste ändert sich erst nach gelungener Erkennung,
ehrlicher Abschlusssatz inkl. fehlgeschlagener Foto-Nummern; Erklärung bei 0 Positionen; Edge Function **v25** (siehe
`supabase/functions/extract-offer-positions/HISTORIE.md`), **deployt** (Version 25, `verify_jwt` unverändert false,
Inhalt gegen das Repo geprüft). **Nicht geändert:** Modell, Prompt, Wiederholungsregel (nur 503/429), Positionsstruktur.
Prüfstände: `erkennung-fehlerfaelle-v3-306` (23, Edge-Datei mit Gemini-Attrappe; v24 → 13 rot),
`erkennung-wiederholung-v3-306` (11, Client; Altverhalten → 8 rot). **Nicht belegt:** ein echter Gemini-Aufruf (kein Netz/
Key hier), die Ursache des gemeldeten Fehlers (Logs ohne Eintrag), Erkennungsgüte.

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
