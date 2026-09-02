# Spengler-DIGITAL – Claude Code Projektanweisungen

## 1. Projektziel

Spengler-DIGITAL ist eine deutschsprachige **Web-App / PWA für Schweizer Spenglerbetriebe**.

Das langfristige Ziel ist ein professionelles, kommerzielles **Multi-Tenant-SaaS-System** für mehrere unabhängige Firmen.

Wichtig:
- Die **Web-App im Browser ist das Hauptprodukt**.
- Android/iOS sind keine separaten nativen Hauptapps.
- Die App soll später als PWA installierbar sein.
- Eine eigene Domain wie `spengler-digital.ch` bzw. `app.spengler-digital.ch` ist vorgesehen.
- GitHub ist Entwicklungs-/Versionsverwaltung und nicht die Produktidentität.

## 2. Aktueller Referenzstand

Bei wichtigen Entscheidungen immer zuerst den **aktuellen Stand von `main`** prüfen.

**AKTUELLER REFERENZSTAND: Version 2.52, Branch `main`.**

Aktueller Hauptstand:
- Branch: `main`
- sichtbare App-Version: **2.52**
- aktuelle Struktur ist bereits modularisiert.
- Nicht davon ausgehen, dass ältere Refactor-Branches neuer sind.

Die aktuelle `main`-Version enthält unter anderem:
- Supabase-Anbindung
- Login (Mitarbeiter-Benutzername sowie echte E-Mail für selbst
  registrierte Firmenadmins)
- Mitarbeiter-/Rechteverwaltung
- Projekte
- Regierapport
- Massaufnahme
- Ausmass
- Materialverwaltung
- PWA-Unterstützung
- PDF/Druck
- Suche
- Feedback
- Einstellungen
- mehrere spezialisierte Massaufnahme-Module
- **Multi-Tenant-Firmentrennung** (`companies`/`company_id`, RLS auf
  allen relevanten Tabellen und im Storage-Bucket, siehe Abschnitt 20)
- **System-Administration** für den Betreiber (Firmenliste, Trial-/
  Statusverwaltung, Firmenregistrierung, vollständige Firmenlöschung –
  ausschliesslich für eingetragene System-Admins, siehe Abschnitt 25/34)
- **Trial-/Firmenstatus-Lifecycle** (abgelaufene/deaktivierte Firmen
  verlieren serverseitig den normalen Zugriff, ohne dass Daten gelöscht
  werden, siehe Abschnitt 35)

Mindestens ein Betreiber-System-Admin ist für die System-Administration
aktiviert (Tabelle `system_admins` ist nicht leer) – Details siehe
Abschnitt 25.5.

Für den aktuellen Multi-Tenant-/Security-/Storage-/Lifecycle-Stand
**immer Abschnitt 20 UND die Abschnitte 31–35 lesen, nicht nur einen
davon** – der Stand wurde über mehrere Aufträge hinweg schrittweise
korrigiert und erweitert (u. a. Storage-Sicherheit in Abschnitt 20.5–20.7
durch Abschnitt 32 abgelöst, Firmenregistrierung in Abschnitt 21 durch
Abschnitt 28 abgelöst, Trial-Wirkung in Abschnitt 21.4 durch Abschnitt 35
abgelöst). Die jeweils höchste Abschnittsnummer zu einem Thema ist
massgeblich.

Bestehende Funktionen dürfen bei Änderungen nicht einfach entfernt oder durch vereinfachte Platzhalter ersetzt werden.

## 3. MASSAUFNAHME – vollständige aktuelle Funktionsliste

Die **Massaufnahme besteht aktuell aus ZEHN Funktionen**:

1. **Skizze / Foto**
2. **Einlaufblech gerade**
3. **Rinne Halbrund**
4. **Einlaufblech konisch**
5. **Freies Profil**
6. **Mauerabdeckung**
7. **Lukarne Seitenverkleidung**
8. **Ort- und Seitenbleche**
9. **Einfassung Rund**
10. **Kehle**

Diese zehn Funktionen müssen bei Refactorings, Tests, Berechtigungen, PDF-Ausgabe, Speichern/Laden und zukünftiger Weiterentwicklung berücksichtigt werden.

Die Auswahl wird im aktuellen `main` über `data-choose-meas-type` abgebildet. Die zugehörigen Typen sind:

- `skizze_foto`
- `einlaufblech_gerade`
- `rinne_halbrund`
- `einlaufblech_konisch`
- `freies_profil`
- `mauerabdeckung`
- `lukarne`
- `anschlussblech`
- `einfassung_rund`
- `kehle`

### 3.1 Skizze / Foto

Bestehende Kernfunktion:
- Foto aufnehmen
- Foto anzeigen/löschen
- auf Foto zeichnen
- Skizzen erstellen
- mehrere Skizzen pro Massaufnahme
- Skizzen speichern
- Projektzuordnung
- Druck/PDF

### 3.2 Einlaufblech gerade

Bestehende Kernfunktion:
- Mass A
- Winkel / Dachneigung
- Abwicklung
- Montage links/rechts
- Material
- Stücke einzeln erfassen
- automatische Stück-/Längenberechnung
- enge Seite / Restbreite
- End-/Umschlagzugaben
- Stückliste
- Grundriss bzw. Schnittdarstellung
- weitere Stücke hinzufügen
- Speichern/Laden
- PDF/Druck

Berechnungslogik nicht ohne Prüfung verändern.

### 3.3 Rinne Halbrund

Bestehende Kernfunktion:
- einzelne gerade Rinnen-Segmente
- Länge pro Segment
- Anschluss/Fitting links
- Anschluss/Fitting rechts
- Zuschnittlänge
- Material
- Abwicklung
- Dilatationselemente
- automatische Dilatationsberechnung
- manuelle Dilatation
- Grenzen/Bereiche der Dilatation
- Stückliste
- Grundriss
- Speichern/Laden
- PDF/Druck

Die vorhandenen Fachberechnungen müssen erhalten bleiben.

### 3.4 Einlaufblech konisch

Bestehende Kernfunktion:
- einzelne Stücke
- Länge
- Mass links
- Mass rechts
- Dachneigung/Winkel
- Abwicklung
- Montage links/rechts
- Material
- enge Seite
- Stückberechnung
- Stückliste
- Rinnen-/Projektbezug, soweit bereits vorhanden
- Speichern/Laden
- PDF/Druck

### 3.5 Freies Profil

Bestehende Kernfunktion:
- Profil aus mehreren Schenkeln
- Schenkellängen
- Winkel
- konisch ja/nein
- Segmente
- Massen pro Segment
- Ansicht
- Material
- Profil-/Geometrieberechnung
- Speichern/Laden
- PDF/Druck

### 3.6 Mauerabdeckung

Bestehende Kernfunktion:
- mehrere gerade Segmente
- Winkel zwischen Segmenten
- Segmentlängen
- Material
- Profil-/Abwicklungsmasse
- Boden-/Ansetzmasse
- Schieber
- Schieber-/Dilatationslogik
- automatische Grenzen
- Stückliste
- Grundriss
- Speichern/Laden
- PDF/Druck

Mauerabdeckung hat eigene Fachlogik und darf nicht einfach wie Rinne Halbrund behandelt werden.

### 3.7 Lukarne Seitenverkleidung

Bestehende Kernfunktion:
- Höhe
- obere Länge
- Winkel
- Achsabstand
- Seite
- Breite
- Spitz-/Versatzmasse
- Schräge
- Anzahl
- Fläche
- Zugaben
- Scharenberechnung
- Hilfsriss
- Material
- Speichern/Laden
- PDF/Druck

Berechnungslogik nicht vereinfachen oder ersetzen.

### 3.8 Ort- und Seitenbleche

Interner Typ: `anschlussblech`

Bestehende Kernfunktion:
- Eingabemasse gemäss aktuellem Formular
- Abwicklungsberechnung
- Teile
- Stückliste
- Fläche
- Material
- Speichern/Laden
- PDF/Druck

Vor Änderungen immer die aktuelle Berechnungslogik im Repo prüfen.

### 3.9 Einfassung Rund

Interner Typ: `einfassung_rund`

Bestehende Kernfunktion:
- Rohrdurchmesser
- Masse a
- Masse c
- weitere Eingabewerte gemäss aktuellem Formular
- Abwicklung
- Gesamtbreite
- Bleilappen-/Lappenanzahl
- Material
- Speichern/Laden
- PDF/Druck

Vor Änderungen immer die aktuelle Berechnungslogik im Repo prüfen.

### 3.10 Kehle

Interner Typ: `kehle`

Winkelberechnung für Kehlen an Lukarnen, neu in Version 2.52
(Abschnitt 60). Fachliche Referenz ist ausschliesslich die Vorlage
„Winkel zu Kehlen Lukarne MA.xltx", Blatt „Winkelberechnung
Kehle  Grat", Spalte C.

Bestehende Kernfunktion:
- genau drei Eingaben: Neigung Hauptdach (NH), Neigung Lukarne (NL),
  Gefällslänge Lukarne (GL)
- Hauptresultate b (Winkel First zu Kehle an Lukarne in Dachfläche),
  c (Winkel Winkelhalbierende zu Kehle an Hauptdach in Dachfläche),
  d (Biegewinkel Kehlblech)
- weitere Resultate A, e, f, g, h, i, k, l, m, n, o, p
- Zwischenergebnisse Q, R, S, T, U, V, W, X, Y, Z, AA, AB, AC, AD, AE
- Speichern/Laden
- PDF/Druck

**Die Formeln dürfen nur gegen die Excel-Vorlage geändert werden, nie
gegen eine Nacherzählung davon** – siehe Abschnitt 60.2, wo vier
Abweichungen zwischen dem Auftragstext und der Excel dokumentiert sind.

## 4. AUSMASS – separater Bereich

**Ausmass ist nicht Teil der Massaufnahme.**

Aktuelle Ausmass-Funktionen:

1. **Offerte erfassen**
2. **Blitzschutzausmass**

Diese Funktionen ebenfalls erhalten und bei Refactorings berücksichtigen.

## 5. Regierapport

Der Regierapport ist ein eigener Hauptbereich.

Bestehende Funktionen unter anderem:
- Projekt auswählen
- Datum
- Auftragsnummer
- Auftraggeber
- Objekt/Gebäudeteil
- Arbeitspositionen
- Mitarbeiter
- Funktion
- Stunden
- Ansätze
- Materialpositionen
- Materialkatalog
- Blechverbrauch
- Total exkl./inkl. MWST
- PDF/Druck
- Speichern
- CSV/relevante Exporte

## 6. Projekte

Projekte sind zentrale Objekte.

Bestehende Konzepte:
- Projektname
- Auftragsnummer
- Adresse/Objekt
- Auftraggeber
- Archiv
- Zuordnung von Massaufnahmen
- Zuordnung von Regierapporten

Projekte sollen später von mehreren Mitarbeitern derselben Firma gemeinsam genutzt werden.

## 7. Material & Excel-Import

Der Materialbereich soll langfristig einen **generischen Excel-Import** unterstützen.

Ziel:
Andere Firmen bzw. Lieferanten sollen ihre Materiallisten importieren können.

Der Import soll langfristig:
- Datei validieren
- Pflichtspalten prüfen
- Vorschau zeigen
- Spalten zuordnen
- Fehler verständlich anzeigen
- unterschiedliche Listenformate unterstützen
- keine bestehenden Daten unkontrolliert überschreiben

Kein harter Import nur für einen einzigen Lieferanten, wenn eine generische Lösung sinnvoll möglich ist.

## 8. Langfristige Multi-Firmen-Architektur

Spengler-DIGITAL soll später mehrere unabhängige Firmen sicher trennen:

    Spengler-DIGITAL
    ├── Firma A
    │   ├── Admin
    │   ├── Mitarbeiter
    │   └── Projekte / Daten
    ├── Firma B
    │   ├── Admin
    │   ├── Mitarbeiter
    │   └── Projekte / Daten
    └── Firma C ...

Eine Firma darf niemals Daten einer anderen Firma sehen.

Die Trennung muss **auf Datenbank-/Backend-Ebene** abgesichert sein und darf nicht nur durch versteckte UI-Elemente erfolgen.

Für relevante Daten soll eine eindeutige Firmen-/Tenant-Zuordnung vorgesehen werden, typischerweise `company_id`.

Das betrifft unter anderem:
- Benutzer/Profile
- Projekte
- Massaufnahmen
- Regierapporte
- Materialien
- Einstellungen
- Fotos
- Dateien
- Feedback
- zukünftige Angebote/Aufträge/Dokumente

## 9. Benutzer, Rollen und Historie

Jeder Mitarbeiter soll später einen eigenen Login besitzen.

Geplante Rollen:
- Firmenadministrator
- Mitarbeiter
- später eventuell weitere Rollen

Wichtige Datensätze sollen möglichst speichern:
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`

Langfristig ist ein Änderungsverlauf/Audit-Log vorgesehen.

## 10. Supabase

Supabase ist als zentrale Backend-Lösung vorgesehen für:
- Authentifizierung
- PostgreSQL-Datenbank
- Storage
- Zugriffsrechte/RLS

**Niemals** einen `service_role`-Key in Browsercode einbauen.

Bei Datenbankänderungen:
- SQL-Migrationen sauber dokumentieren
- RLS prüfen
- bestehende Daten berücksichtigen
- keine rein manuellen, undokumentierten Änderungen als dauerhafte Lösung

## 11. Fotos und Dateien

Fotos sind wichtiger Bestandteil der Baustellen-/Massaufnahme.

Darauf achten:
- korrekte Projekt-/Firmenzuordnung
- mehrere Fotos/Skizzen
- Upload
- Löschen
- Komprimierung
- sinnvolle Dateigrössen
- späterer Export
- Speicherkosten

Keine unnötig grossen Originaldateien dauerhaft speichern, wenn das keinen klaren Mehrwert bietet.

## 12. PWA / Web-App

Die App soll auf:
- Android-Tablets
- iPad
- Smartphones
- Desktop
- Laptop

gut funktionieren.

PWA-Funktionen erhalten/verbessern:
- Manifest
- Icons
- Service Worker
- Installierbarkeit
- HTTPS
- sinnvolles Caching
- App-artige Bedienung

Die Tablet-Bedienung ist besonders wichtig, weil die App auch direkt auf der Baustelle genutzt werden soll.

## 13. UX-Grundsätze

Prioritäten:
1. schnelle Dateneingabe
2. grosse Touch-Flächen
3. möglichst wenige Klicks
4. klare deutsche Bezeichnungen
5. gute Tablet-Bedienung
6. brauchbares Smartphone-Layout
7. zuverlässige Berechnungen
8. verständliche Fehlermeldungen
9. sichere Bestätigungen bei destruktiven Aktionen

Keine unnötig komplizierten SaaS-Oberflächen einbauen.

Die App soll sich wie ein praktisches Spengler-Werkzeug anfühlen.

## 14. Entwicklungs-Roadmap

### Phase 1 – Bestehende App stabilisieren
- bestehende Funktionen testen
- Berechnungen prüfen
- Massaufnahme vollständig erhalten
- Excel-Import fertigstellen/verbessern
- Tablet-/Mobile-UX verbessern
- PWA erhalten

### Phase 2 – Multi-Firmen-Grundlage
- Company/Tenant-Modell
- Benutzer-Firmen-Zuordnung
- Rollen
- RLS
- sichere Firmendatentrennung
- Eigentümer von Fotos/Dateien
- Ersteller-/Änderungsdaten

### Phase 3 – PWA & Produktidentität
- eigene Domain
- öffentliche Website
- App-Domain
- Branding
- Logo/Favicon
- Installierbarkeit

### Phase 4 – Sicherheit & Daten
- RLS vollständig prüfen
- Passwort-/Accountverwaltung
- Backup
- Wiederherstellung
- Datenexport
- Datenlöschung
- Foto-/Dateispeicher optimieren

### Phase 5 – Pilotbetriebe
- einige echte Spenglerbetriebe testen lassen
- Feedback sammeln
- reale Arbeitsabläufe beobachten
- Fehler und unnötige Schritte beseitigen

### Phase 6 – Kommerzieller Betrieb
Erst dann:
- Datenschutz
- Impressum
- AGB
- Support
- Preise
- Abos
- Rechnungen/Zahlungen
- geschäftliche Struktur

Eine GmbH ist nicht sofort Voraussetzung. Die technische Architektur soll aber für einen späteren professionellen kommerziellen Betrieb vorbereitet sein.

### Phase 7 – Erweiterungen
Mögliche spätere Funktionen:
- Materialbestellung
- Lieferantenkataloge
- Offerten
- Dokumente
- Bestellungen
- weitere Projektprozesse
- Integrationen
- erweiterter Änderungsverlauf

## 15. Sicherheitsregeln

Niemals:
- Secrets in Frontend-Code
- Service-Role-Key im Browser
- Daten nur durch UI verstecken
- Tenant-Trennung nur clientseitig
- fremde Firmendaten ausgeben
- unnötig sensible Daten in localStorage speichern

Immer:
- Eingaben validieren
- Datenbankrechte prüfen
- RLS verwenden, wo sinnvoll
- Datei-Uploads validieren
- User-Inhalte gegen XSS absichern
- Authentifizierungsfehler sauber behandeln

## 16. Regeln bei Änderungen

Vor einer grösseren Änderung:

1. Zuerst `main` und den aktuellen Code prüfen.
2. Die zuständigen Dateien/Module identifizieren.
3. Bei Datenänderungen Supabase-Schema und SQL prüfen.
4. Bestehendes Verhalten erhalten.
5. Kleinste sinnvolle Änderung durchführen.
6. Betroffene Funktion testen.
7. Bei Berechnungen konkrete Beispielwerte prüfen.

**Nicht einfach alte oder vereinfachte Versionen aus anderen Branches übernehmen.**

Insbesondere bei Massaufnahmen immer prüfen, ob alle zehn Funktionen noch funktionieren:

- Skizze/Foto
- Einlaufblech gerade
- Rinne Halbrund
- Einlaufblech konisch
- Freies Profil
- Mauerabdeckung
- Lukarne Seitenverkleidung
- Ort- und Seitenbleche
- Einfassung Rund
- Kehle

## 17. Git-Regeln

`main` ist der aktuelle Referenzstand, sofern keine konkrete Aufgabe einen anderen Branch vorgibt.

Vor grösseren Änderungen:
- aktuellen Branch prüfen
- aktuelle Commits prüfen
- relevante Dateien aus genau diesem Stand lesen

Keine destruktiven History-Rewrites.

Commits klein und nachvollziehbar halten.

## 18. Aktuelle Priorität

**Nicht** zuerst native Apps bauen.

**Nicht** zuerst Abos/Zahlungen bauen.

**Nicht** vorschnell eine GmbH voraussetzen.

Das aktuelle Hauptziel lautet:

> Die bestehende Spengler-DIGITAL-Anwendung zu einer stabilen, modularen, tabletfreundlichen Web-App/PWA weiterentwickeln, ohne die vorhandenen Fachfunktionen zu verlieren, und gleichzeitig die technische Grundlage für eine sichere Multi-Firmen-SaaS schaffen.

## 19. Arbeitsweise mit dem Projektinhaber

Der Projektinhaber bevorzugt direkte Umsetzung.

Wenn eine Aufgabe klar ist:
1. Repo prüfen
2. aktuelle Implementierung verstehen
3. Änderung durchführen
4. testen
5. kurz und konkret berichten

Keine unnötigen langen Erklärungen oder Rückfragen, wenn die Anforderung bereits eindeutig ist.

Bei Konflikten zwischen einer schnellen Lösung und der langfristigen Architektur die Lösung wählen, die bestehende Funktionalität erhält und die spätere Multi-Firmen-Web-App nicht verbaut.

## 20. AKTUELLER MULTI-TENANT-STAND – SEPTEMBER 2026

Ergebnis der Migration Phase 1 (Firmen-Code entfernt, bestehende Supabase-
Struktur geprüft und zwei konkrete Lücken behoben). Supabase-Projekt-ID:
`nfgryuzkpwjfmdlmevuy`. Vor jeder weiteren Multi-Tenant-Arbeit diesen
Abschnitt lesen, nicht nur Abschnitt 8 (dort steht nur das Ziel, hier der
tatsächliche Stand).

**Wichtig – dieser Abschnitt ist der Stand von September 2026 (kurz nach
der ursprünglichen Migration) und in zwei Punkten seither überholt, siehe
die jeweils genannten späteren Abschnitte:**
- Die in 20.5–20.7 beschriebene Storage-Policy (`my_company_id() is not
  null`, keine echte Objekt-Firmen-Zuordnung) wurde in Version 2.24
  durch eine echte, objektgenaue Tenant-Trennung ersetzt – aktueller
  Stand: **Abschnitt 32**.
- `rinne_fitting_types` fehlte in 20.6 zunächst nur `company_id`/eine
  Tenant-Policy; die dort ergänzte Policy hatte danach selbst noch eine
  Sicherheitslücke (permissiv statt restriktiv), behoben in Version 2.23
  – siehe **Abschnitt 31.2**.

Ausserdem gilt seit Version 2.27 (**Abschnitt 35**): `my_company_id()`
liefert für eine Firma mit abgelaufenem Trial oder deaktiviertem Status
`NULL` statt der echten `company_id` – jede restriktive
`tenant_boundary_*`-Policy in diesem Abschnitt greift dadurch automatisch
auch als Zugriffssperre, nicht nur als Firmentrennung.

### 20.1 Firmenmodell

Tabelle `companies`: `id` (uuid), `name`, `slug` (unique), `is_active`,
`created_by`, `settings` (jsonb), `created_at`/`updated_at`. Aktuell genau
eine Firma: **PETER KÜNZI AG**. Keine Frontend-UI zum Anlegen weiterer
Firmen – bewusst so in Phase 1.

### 20.2 Firmenzuordnung (`company_id`)

Fester Weg, niemals vom Client umgehbar:

    auth.uid() → profiles.id → profiles.company_id → companies

`profiles.company_id` wird ausschliesslich serverseitig gesetzt (Edge
Function `smart-action`, aus dem Profil des aufrufenden Admins). Der
Browser übergibt nirgends eine `company_id` als Sicherheitsquelle.

`company_id` (uuid, nullable, Default `my_company_id()`) existiert auf:
`profiles` (kein Default, wird von `smart-action` gesetzt), `projects`,
`materials`, `rates`, `app_settings`, `einlaufblech_settings`,
`blitzschutz_materials`, `measurement_materials`, `feedback`,
`permission_overrides`, `rinne_fitting_types`.

Tabellen ohne eigene `company_id`, dafür per Join über `projects.company_id`
tenant-getrennt: `measurements`, `reports`, `ausmass`, `project_files`.

### 20.3 RLS (Row Level Security)

Auf allen public-Tabellen aktiv, zwei Schichten pro Tabelle:

1. **Tenant-Grenze** – Policy `tenant_boundary_<tabelle>`, meist
   `company_id = my_company_id()`, bei den join-basierten Tabellen ein
   `EXISTS (... projects p WHERE p.id = ... AND p.company_id = my_company_id())`.
2. **Rechte innerhalb der Firma** – eigene `*_select/insert/update/delete_permission`-
   Policies über `has_permission()`/`is_admin()` bzw. Eigentümer-Scope
   (`created_by = auth.uid()`), siehe Abschnitt 20.4.

Helper-Funktionen (alle `SECURITY DEFINER`, rein auf `auth.uid()` basierend,
kein Client-Input): `my_company_id()`, `is_admin()`,
`has_permission(resource, action)`, `permission_scope(resource)`,
`permission_edit_scope(resource)`.

### 20.4 Permission-Modell

- `profiles.role` ∈ `admin` / `employee`.
- `permission_settings` – **firmenübergreifend geteilte** Standardrechte
  je Rolle × Bereich (`can_view`/`can_edit`/`scope`/`edit_scope`). Bewusst
  ohne `company_id`: gemeinsame Grundeinstellung für alle Firmen.
- `permission_overrides` – Ausnahme je Mitarbeiter, **mit** `company_id`
  (per Trigger `enforce_permission_override_company()` erzwungen). Das ist
  der Anpassungspunkt pro Firma.
- Admin (`role='admin'` UND `company_id = my_company_id()`) darf immer
  alles, unabhängig von Overrides/Settings.
- `js/05a-rechte.js` bildet dieselbe Logik im Browser nur zum Ausblenden
  von Knöpfen nach – wirksam ist ausschliesslich die Datenbank.

### 20.5 Storage-Modell

Bucket `measurements`, **privat** (`public: false`). Vier
`storage.objects`-Policies `company <read/upload/update/delete> measurement
files`, Bedingung: `bucket_id = 'measurements' AND my_company_id() is not null`.

**Storage-Pfade** (Stand nach der Migration in dieser Session):
- Foto/Skizze einer Massaufnahme (Typ `skizze_foto`):
  `measurements/<projectId>/<measurementId>/photo/<zeit>_<zufall>.<ext>`
  bzw. `.../sketches/<zeit>_<zufall>.<ext>` – eindeutig Projekt **und**
  Massaufnahme zugeordnet. Bei einer neuen Massaufnahme mit neuen Fotos/
  Skizzen legt `$("saveMeasurement").onclick`
  (`js/16-massaufnahme-formular.js`) dafür zuerst eine Platzhalterzeile in
  `measurements` an, um die echte ID zu bekommen, bevor hochgeladen wird
  (bei Fehler danach wird die Platzhalterzeile wieder gelöscht).
- Firmenlogo/Ausmass-Foto: weiterhin `<art>/<zeit>_<zufall>.<ext>`
  (`art` ∈ `company-logo`, `ausmass-photo`) – bewusst nicht umgestellt:
  das Firmenlogo gehört zu keinem Projekt, Ausmass-Fotos waren nicht Teil
  des Auftrags für diese Runde.
- Projektdatei: unverändert `project-files/<projectId>/<zeit>_<zufall>.<ext>`
  (bereits eindeutig projektbezogen, so vom Auftrag als korrekt bestätigt).
- **Alte, vor dieser Migration hochgeladene Fotos/Skizzen/Dateien bleiben
  unter ihrem ursprünglichen Pfad liegen** (u. a. das alte, flache
  `<art>/<zeit>_<zufall>.<ext>`-Schema ohne Projekt-/Massaufnahme-Bezug) –
  nichts wurde verschoben, umbenannt oder gelöscht. Anzeige/Zugriff
  funktioniert für sie weiterhin, siehe `storageSignedUrl()` unten.

Storage-RLS prüft weiterhin nur "eingeloggtes Mitglied irgendeiner
Firma" (`my_company_id() is not null`), nicht "gehört zu genau diesem
Projekt/dieser Firma" – der Pfad allein reicht für eine echte,
serverseitig erzwungene Trennung nicht aus (RLS kann keinen Pfad
"parsen" und mit `projects.company_id` abgleichen, ohne denselben Bug wie
in 20.6 zu riskieren). Bleibt bewusst offen, siehe 20.7.

**Anzeige (privater Bucket):** `getPublicUrl()` funktioniert für einen
privaten Bucket grundsätzlich nicht. Alle Anzeige-Stellen lösen einen
gespeicherten Wert deshalb über `storageSignedUrl(value)`
(`js/10-massaufnahme.js`) zu einer eine Stunde gültigen, bei jedem
Rendern frisch erzeugten `createSignedUrl()`-URL auf – erkennt dabei auch
alte, vollständige "öffentliche" URLs aus der Zeit vor der Umstellung und
zieht daraus den reinen Pfad. Betrifft: Foto-/Skizzenvorschau und
-Galerie, Massaufnahme-/Ausmass-Übersichtslisten (Thumbnails), PDF-Druck
(Massaufnahme und Ausmass, inkl. Firmenlogo im Briefkopf), Firmenlogo im
Start-/Menübildschirm, Projektdatei öffnen.

### 20.6 Bereits in Supabase umgesetzt

- `companies` + `is_active`/`created_by`/`settings`
- `company_id` + Tenant-RLS auf allen in 20.2 genannten Tabellen
- `permission_overrides.company_id` + Enforcement-Trigger
- Privater Storage-Bucket `measurements`
- Edge Function `smart-action`: prüft Admin-Rolle serverseitig, leitet
  Firma ausschliesslich aus dem Aufrufer-Profil ab, kein Firmen-Code mehr
- **In dieser Session zusätzlich behoben:**
  - `rinne_fitting_types` hatte weder `company_id` noch Tenant-Policy
    (einzige "firmenbezogene" Katalogtabelle, die das noch fehlte) –
    Spalte ergänzt, bestehende 7 Zeilen der einzigen Firma zugeordnet,
    `tenant_boundary_rinne_fitting_types`-Policy ergänzt.
  - Die vier Storage-Policies riefen `storage.foldername(p.name)` auf,
    wobei `p` die `projects`-Tabelle ist – das wertete den **Projektnamen**
    aus (z. B. "Steildachsanierung"), nicht den Speicherpfad. Da
    Projektnamen keine "/" enthalten, war die Bedingung immer falsch:
    der Bucket war für **alle** Benutzer komplett gesperrt (kein Foto-,
    Skizzen- oder Projektdatei-Zugriff mehr möglich). Auf die in 20.5
    beschriebene Interims-Regel (`my_company_id() is not null`)
    korrigiert – Zugriff funktioniert wieder, aber noch ohne echte
    objektgenaue Firmentrennung.
  - `getPublicUrl()` (funktioniert grundsätzlich nicht für einen privaten
    Bucket) an jeder Stelle durch `storageSignedUrl()`/`createSignedUrl()`
    ersetzt: Foto-/Skizzenvorschau und -galerie im Formular, Massaufnahme-
    und Ausmass-Übersichtslisten, PDF-Druck (inkl. Firmenlogo), Firmenlogo
    im Start-/Menübildschirm, Projektdatei öffnen. Alte, vor der
    Umstellung gespeicherte volle "öffentliche" URLs werden dabei erkannt
    und bleiben nutzbar (`measStoragePathFromValue()`).
  - Foto-/Skizzen-Upload einer Massaufnahme auf
    `measurements/<projectId>/<measurementId>/photo|sketches/…`
    umgestellt (siehe 20.5) – vorher lag im Pfad selbst weder Projekt-
    noch Massaufnahme-Bezug.

### 20.7 Noch im Frontend umzusetzen / offene Fragen

- ~~Echte objektgenaue Storage-**RLS**-Trennung für Fotos/Skizzen/
  Projektdateien fehlt noch~~ – **behoben in Version 2.24, siehe
  Abschnitt 32.** Storage-Objekte werden seither dynamisch anhand von
  Pfad (projektbezogene Kategorien) bzw. tatsächlicher DB-Referenz
  (Firmenlogo/Ausmass-Foto und ältere flache Pfade) der eigenen Firma
  zugeordnet.
- Firmenlogo/Ausmass-Foto liegen weiterhin unter dem alten, flachen
  Pfadschema ohne Projekt-/Firmenbezug (Firmenlogo ist auch fachlich kein
  Projektdatum). Signierte URLs funktionieren dafür bereits. Die
  Firmenzuordnung läuft für diese Kategorie seit Version 2.24 über den
  tatsächlichen `app_settings`-/`ausmass`-Referenzwert (Abschnitt 32),
  nicht über den Pfad.
- ~~Keine Firmenverwaltung im Frontend (Firma anlegen/wechseln) – für
  Phase 1 nicht vorgesehen.~~ – **seit Version 2.17 vorhanden**
  (System-Administration für den Betreiber, siehe Abschnitt 25/34;
  betrifft weiterhin nicht den einzelnen Firmenadmin, der seine eigene
  Firma nicht wechseln kann).

### 20.8 Bekannte Altlasten

- `permission_settings` bewusst ohne `company_id` (gemeinsame
  Rollen-Standardwerte) – falls jede Firma eigene Standardrechte braucht,
  ist das eine spätere, bewusste Migration, kein Bug. Weiterhin
  unverändert (Stand v2.27).
- ~~Trigger-Funktion `enforce_permission_override_company()` ist laut
  Supabase-Security-Advisor direkt per RPC aufrufbar (`anon` und
  `authenticated`). Vermutlich harmlos..., aber nicht geprüft/
  aufgeräumt.~~ – **geprüft und aufgeräumt in Version 2.25** (Abschnitt
  33.2): tatsächlich ungefährlich (reine Trigger-Funktion, ausserhalb
  eines Trigger-Kontexts nicht direkt aufrufbar), die unnötigen
  `anon`/`PUBLIC`-Grants wurden trotzdem aus Hygiene-Gründen entzogen.
- Leaked-Password-Protection ist in Supabase Auth deaktiviert – generelle
  Auth-Härtung, unabhängig vom Multi-Tenant-Thema. Weiterhin unverändert
  (Stand v2.27), nicht Teil eines der bisherigen Aufträge.

### 20.9 Funktionen, die nicht verändert werden dürfen

- Alle neun Massaufnahme-Fachfunktionen aus Abschnitt 3, inklusive ihrer
  Berechnungslogik.
- Ausmass (Offerte erfassen, Blitzschutzausmass).
- Regierapport-Berechnungen (Stunden, Ansätze, MWST, Blechverbrauch).
- PDF-Layout und Berechnungstabellen – in dieser Migrationsphase
  ausdrücklich kein UI-Redesign, keine Änderungen an Navigation, Buttons,
  Farben, Layout.

## 21. SELF-SERVICE-FIRMENREGISTRIERUNG – PHASE 1

Erste echte Möglichkeit, sich ohne Mitwirkung eines bestehenden Admins
selbst eine neue Firma anzulegen. Läuft unter der bestehenden
GitHub-Pages-Adresse, keine eigene Domain, kein Firmen-Code, keine
Kreditkarte.

**Wichtig – dieser Abschnitt beschreibt den ursprünglichen Phase-1-Stand
und ist in zwei Punkten seither überholt:**
- Der Einstiegspunkt in 21.1 ("Login-Bildschirm → Knopf") gilt **nicht
  mehr**. Seit Version 2.20 ist die Registrierung ausschliesslich über
  den System-Admin-Bereich erreichbar, kein öffentlicher Knopf mehr am
  Login – siehe **Abschnitt 28.2** für den aktuellen Stand und die
  Begründung. Der automatische Login direkt nach der Registrierung
  (letzter Absatz von 21.1) entfällt dadurch ebenfalls: der auslösende
  Benutzer ist bereits als System-Admin eingeloggt, ein automatischer
  Login in die neue Firma würde diese Sitzung ersetzen.
- Die Aussage in 21.4 ("kein Code prüft `trial_ends_at`/Zugriff") gilt
  **nicht mehr** seit Version 2.27 – siehe **Abschnitt 35** für den
  aktuellen Trial-/Firmenstatus-Lifecycle.

Die eigentliche Anlage-Logik dieses Abschnitts (Auth-User/Firma/Profil/
`app_settings` atomar anlegen, Rollback bei Fehler, `company_id`
ausschliesslich serverseitig) ist weiterhin unverändert aktuell.

### 21.1 Ablauf

~~Login-Bildschirm → Knopf "🏢 Neue Firma registrieren"~~ → **seit
Version 2.20: System-Admin-Bereich → Knopf "🏢 Neue Firma registrieren"
(siehe Abschnitt 28.2)** → Formular
(Firmenname, Vorname, Nachname, E-Mail, Passwort, Passwort bestätigen) →
Edge Function `register-company` (`service_role`, läuft serverseitig,
niemals im Browser) legt atomar an:

1. Auth-User (`email_confirm:true`, kein Bestätigungs-Mail-Versand nötig)
2. `companies`-Zeile: `slug` aus dem Firmennamen abgeleitet (Umlaute/
   Akzente entfernt, Kleinschreibung, Bindestriche; bei Kollision mit
   `-2`, `-3`, … bis zu 30 Versuchen eindeutig gemacht), `created_by` =
   neuer User, `subscription_status:"trial"`, `trial_days:30`,
   `trial_started_at` = jetzt, `trial_ends_at` = jetzt + 30 Tage
3. `profiles`-Zeile: `role:"admin"`, `company_id` = neue Firma,
   `passwort_gesetzt:true` (die Person hat ihr Passwort gerade selbst
   gewählt, anders als bei einem vom Admin angelegten Mitarbeiterkonto)
4. `app_settings`-Zeile für die neue Firma, direkt mit dem eingegebenen
   Firmennamen vorbefüllt

`company_id` kommt ausschliesslich aus Schritt 2/3 der Funktion, nie vom
Client. Schlägt ein Schritt fehl, räumt die Funktion alles bereits
Angelegte in umgekehrter Reihenfolge wieder ab (erst `app_settings`/
`profiles`, dann `companies`, zuletzt der Auth-User) – keine
Karteileichen, siehe `supabase/functions/register-company`.

~~Nach erfolgreicher Registrierung meldet der Client sich mit der gerade
eingegebenen E-Mail/Passwort-Kombination selbst an (`signInWithPassword`).
Klappt das aus irgendeinem Grund nicht (Konto steht trotzdem), wird
stattdessen verständlich zum normalen Login weitergeleitet.~~ – **gilt
nicht mehr seit Version 2.20**: der aufrufende Benutzer ist bereits als
System-Admin eingeloggt, es findet kein automatischer Login mehr statt
(siehe Abschnitt 28.2 für den aktuellen Ablauf und die Begründung).

### 21.2 Login mit echter E-Mail statt Benutzername

Bestehende Mitarbeiterkonten melden sich weiterhin mit
`Vorname.Nachname` an, das intern auf eine Pseudo-E-Mail-Domain
(`@nfgryuzkpwjfmdlmevuy.supabase.co`) abgebildet wird (siehe
`smart-action`). Selbst registrierte Firmen-Admins haben dagegen eine
echte E-Mail als Login-Adresse. `usernameToEmail()` (`js/03-login.js`)
unterscheidet beide Fälle rein an einem "@" im Eingabefeld – bestehender
Login unverändert, keine UI-Änderung nötig ausser dem Feldlabel
("Benutzername oder E-Mail").

### 21.3 `app_settings`: von System-Singleton zu einer Zeile je Firma

`app_settings` hatte trotz vorhandener `company_id` noch einen
`CHECK (id = 1)`-Constraint aus der Zeit vor Multi-Tenant – die ganze
Tabelle konnte nie mehr als eine einzige Zeile im gesamten System
enthalten. Für eine zweite Firma wäre das komplett kaputt gewesen
(weder eigener Firmenname/Logo möglich, noch hätte sie die bestehende
Zeile sehen können). In dieser Session behoben:

- Migration `app_settings_per_company`: `CHECK (id = 1)` entfernt, `id`
  auf echte Identity-Spalte umgestellt, `UNIQUE (company_id)` ergänzt.
  Bestehende Zeile (PETER KÜNZI AG) unverändert erhalten.
- Alle `.eq("id",1)`-Stellen im Client (`js/05-daten-laden.js`,
  `js/07-einstellungen.js`) entfernt – RLS (`tenant_boundary_app_settings`)
  grenzt Select/Update automatisch auf die eigene Firma ein, dafür
  reicht `.select("*").maybeSingle()` bzw. `.update({...})` ohne
  `.eq()`.
- `register-company` legt die Zeile der neuen Firma gleich mit an
  (siehe 21.1), damit niemand ohne eigene Einstellungen dasteht.

`einlaufblech_settings` hat denselben `id=1`-Singleton-Constraint,
wird aber von keiner Stelle im Client gelesen oder geschrieben
(Einlaufblech-/Anschlussblech-Werte liegen im `localStorage`, siehe
20.8) – deshalb bewusst NICHT angefasst, kein aktiver Bug.

### 21.4 Trial-Status

- Gültige `subscription_status`-Werte: `trial`, `active`, `expired`,
  `cancelled`, `suspended`. Neue Firmen starten immer bei `trial`.
- `trial_days` ist pro Firma einstellbar (Default 30, Check 0–3650) –
  in dieser Phase setzt die Registrierung immer den Standardwert 30,
  ein UI zum Ändern gibt es noch nicht.
- ~~**Kein automatisches Sperren oder Löschen.** ... es gibt in dieser
  Phase keinerlei Code, der `subscription_status`/Zugriff anhand von
  `trial_ends_at` prüft oder einschränkt.~~ – **gilt nicht mehr seit
  Version 2.27**: `my_company_id()` prüft `trial_ends_at`/
  `subscription_status` serverseitig und sperrt den normalen Zugriff bei
  Ablauf – siehe **Abschnitt 35**. Weiterhin richtig und unverändert:
  **keine automatische Löschung**, ein abgelaufener Trial bleibt
  vollständig gespeichert und reversibel.
- ~~Vollständige Firmenlöschung kommt später als geschützte
  System-Admin-Funktion. Die Tabelle `system_admins` und die Funktion
  `is_system_admin()` existieren in Supabase bereits (leer/ungenutzt),
  es gibt aber noch keine Oberfläche und keinen Aufruf dafür im Client.~~
  – **umgesetzt seit Version 2.17 (System-Admin-Oberfläche, Abschnitt
  25) bzw. Version 2.19 (vollständige Firmenlöschung, Abschnitt 27)**,
  seither mehrfach korrigiert (Abschnitt 29/30). `system_admins` ist
  seit Version 2.17.1 nicht mehr leer (Abschnitt 25.5).

### 21.5 Was diese Phase NICHT enthält

Stand zum Zeitpunkt dieses Abschnitts (Phase 1) – für den aktuellen
Stand siehe die oben verlinkten späteren Abschnitte:

- ~~Keine automatische Trial-Sperrung/-Löschung~~ – Zugriffssperre bei
  Ablauf seit Version 2.27 (Abschnitt 35) vorhanden, automatische
  **Löschung** gibt es weiterhin nicht und ist auch für die Zukunft
  nicht vorgesehen.
- ~~Keine System-Admin-Oberfläche.~~ – seit Version 2.17 vorhanden
  (Abschnitt 25/34).
- Keine Mitarbeiter-Einladungen (Mitarbeiter legt weiterhin nur ein
  Admin in den Einstellungen an, unverändert seit Abschnitt 20) –
  **weiterhin aktueller Stand, nicht überholt**.
- Kein Zahlungsanbieter, keine Abos/Rechnungen – **weiterhin aktueller
  Stand, nicht überholt**.
- Keine eigene Domain – weiterhin unter der bestehenden GitHub-Pages-
  Adresse – **weiterhin aktueller Stand, nicht überholt**.

## 22. GESCHÜTZTER BEREICH OHNE PASSWORT + MITARBEITERANLAGE REPARIERT – VERSION 2.14

### 22.1 Zusätzliches Passwort für den geschützten Bereich entfernt

Der frühere zweite Passwortschutz (`PROTECTED_PASSWORD`, Eingabefeld
`protectedPasswordInput`, Funktion `tryUnlockProtected()`, Merker
`protectedUnlocked`) ist vollständig entfernt – client- und
HTML-seitig. Der Tab "🔒 Geschützt" (Firma, Mitarbeiter, Funktionen/
Stundenansätze, Materialkataloge, Datensicherung, Module in
Entwicklung) zeigt stattdessen abhängig von `isAdmin()` entweder
`#protectedContent` oder den Hinweis `#protectedDenied` ("nur für
Administratoren zugänglich").

**Wichtig: Das ist reine UI-Führung, keine Sicherheitsgrenze.** Die
eigentliche Absicherung war schon vor dieser Änderung die Datenbank,
nicht das alte Passwort:

- Alle schreibenden Operationen im geschützten Bereich (`app_settings`,
  `materials`, `rates`, `blitzschutz_materials`,
  `einlaufblech_settings`, `rinne_fitting_types`, `profiles`) laufen
  über RLS-Policies, die serverseitig `is_admin()` bzw.
  `has_permission()` prüfen (siehe 20.3/20.4) – rein auf `auth.uid()`
  basierend, vom Client nicht beeinflussbar.
- `permission_settings` hat für `role='employee'` bereits vor dieser
  Änderung `can_edit:false` auf allen betroffenen Ressourcen.
- Ein Mitarbeiter mit manipuliertem Frontend (z. B. `isAdmin()` im
  Browser auf `true` gefälscht) sieht dadurch höchstens die
  Formulare – jeder tatsächliche Schreibversuch wird von der RLS-Policy
  abgelehnt, unabhängig vom Frontend-Zustand.
- Die zwei Unterabschnitte "Datensicherung" und "Module in
  Entwicklung" liegen strukturell ausserhalb von `#protectedContent`
  (unverändert seit vor dieser Migration) und sind daher für
  eingeloggte Mitarbeiter sichtbar, sobald sie den Tab öffnen – auch
  das folgenlos, da jeder Speichern-Klick dort ebenfalls über
  `app_settings`-RLS (`is_admin()`) läuft und für einen Mitarbeiter
  serverseitig abgelehnt wird. Bewusst nicht angepasst, um keine
  unbeteiligten Struktur-/UI-Änderungen einzuführen.

### 22.2 Mitarbeiteranlage repariert (`smart-action`, jetzt Version 10)

**Ursache des gemeldeten Fehlers:** supabase-js liefert bei einer Edge
Function mit Nicht-2xx-Status in `error.message` ausschliesslich die
feste generische Meldung "Edge Function returned a non-2xx status
code" – die eigentliche, vom Server gesendete Fehlermeldung (`{error:
"..."}`) steckt nur in `error.context` (einem `Response`-Objekt) und
muss dort per `await error.context.json()` extra ausgelesen werden.
Das Frontend zeigte deshalb bei jedem tatsächlichen Fehler (Namens-
konflikt, fehlende Berechtigung, Server-/DB-Fehler) nur die
nichtssagende generische Meldung, nie den wirklichen Grund. Betraf
gleichermassen `smart-action` (Mitarbeiteranlage, Passwort-Reset) und
`register-company`.

Behoben mit einer gemeinsamen Hilfsfunktion `edgeFunctionErrorMessage()`
(`js/01-basis.js`), die `error.context.json()` ausliest und nur bei
Fehlschlag auf `error.message`/einen Fallback-Text zurückfällt –
eingebaut an allen vier `sb.functions.invoke(...)`-Aufrufstellen
(`js/03-login.js`, `js/07-einstellungen.js` ×2, `js/08-katalog-
blitzschutz.js`).

**Zusätzlich in der Edge Function selbst überarbeitet** (Vorher:
Version 8, jetzt Version 10, `supabase/functions/smart-action`):

- Namensteile werden über `toNamePart()` normalisiert: ä/ö/ü/ß (inkl.
  Grossschreibung) werden lesbar transliteriert (ä→ae, ö→oe, ü→ue,
  ß→ss), danach NFKD-Diakritika entfernt und alles ausser `a-z`
  gestrichen – Leerzeichen, Bindestriche, Apostrophe fallen weg
  ("von der Heide" → "vonderheide"). Sind Vor- oder Nachname danach
  leer (z. B. nur Sonderzeichen eingegeben), bricht die Funktion mit
  einer verständlichen 400-Meldung ab, bevor überhaupt ein Auth-User
  angelegt wird.
- **Namenskonflikte brechen nicht mehr sofort ab.** E-Mail/Benutzername
  sind über alle Firmen hinweg dieselbe Pseudo-Domain
  (`@nfgryuzkpwjfmdlmevuy.supabase.co`) und damit in `auth.users`
  global eindeutig, nicht nur innerhalb einer Firma. Bei einer Kollision
  (Supabase Admin-API meldet 422/"already registered") probiert die
  Funktion automatisch `vorname.nachname2`, `vorname.nachname3`, … bis
  zu 30 Versuche, statt mit HTTP 400 abzubrechen. Erst wenn alle 30
  Versuche kollidieren, kommt eine verständliche Fehlermeldung.
  **Es gibt keine `profiles.username`-Spalte** (geprüft via
  `information_schema.columns`) – die Eindeutigkeitsprüfung läuft
  bewusst ausschliesslich über die Auth-API-Antwort, nicht über eine
  zusätzliche DB-Abfrage auf eine nicht existierende Spalte.
- **Rollback bleibt wie vorher, jetzt zusätzlich mit try/catch um die
  ganze Funktion:** Kann nach erfolgreichem Auth-User das Profil nicht
  angelegt werden, wird der Auth-User sofort wieder gelöscht
  (`adminDeleteAuthUser`) – kein halbfertiges Konto. Jeder unerwartete
  Fehler (auch ausserhalb des Auth/Profile-Ablaufs) wird jetzt
  serverseitig mit `console.error` protokolliert und liefert dem
  Client nur die feste, unverfängliche Meldung "Das Mitarbeiterkonto
  konnte nicht erstellt werden." – keine internen Fehlerdetails mehr
  im Frontend.
- `company_id` kam schon vorher ausschliesslich aus dem
  Profil des aufrufenden Admins (`getCallerProfile()`), nie vom
  Client – daran wurde nichts geändert, nur zusätzlich abgesichert
  (Admin-Rolle und `company_id`-Vorhandensein werden weiterhin vor
  jeder weiteren Aktion geprüft).

### 22.3 Tests

Live-Endpunkttests (echter Login, echter Klick auf "Mitarbeiterkonto
anlegen") waren in dieser Sitzung technisch nicht möglich – die
Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co` direkt. Stattdessen geprüft:

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: 539/539, ausgeglichen.
- Repo-weite Suche: keine Reste von `protectedUnlocked`,
  `PROTECTED_PASSWORD`, `protectedPasswordInput`, `protectedLocked`,
  `protectedError`, `tryUnlockProtected`, `unlockProtected`.
- `information_schema.columns` für `profiles` und
  `pg_constraint` für `profiles` direkt per SQL geprüft, um
  sicherzustellen, dass die neue Edge-Function-Version keine nicht
  existierenden Spalten anspricht (erste Deploy-Version tat das
  fälschlich mit einer angenommenen `username`-Spalte – in einer
  zweiten Version vor dem endgültigen Deploy korrigiert).
- `smart-action` erfolgreich auf Version 10 deployt (`status: ACTIVE`).
- Rollenlogik (`isAdmin()`/`#protectedContent`/`#protectedDenied`) und
  die Aufrufstellen im Formular (`mitarbeiterAnlegen`-Button) per
  Code-Review gegen die tatsächliche Antwortstruktur der Edge Function
  (`data.ok`, `data.user.username`, `data.password`) abgeglichen.
- Massaufnahme, Ausmass, Regierapport, PDF/Druck, Self-Service-
  Firmenregistrierung, Trial-System: nicht angefasst, keine
  Berechnungslogik verändert.

### 22.4 Fehler „＋ Funktion hinzufügen" behoben

**Ursache:** Die alte, globale Constraint `UNIQUE(name)` auf `rates` war
bereits vor dieser Änderung durch `rates_company_name_key
UNIQUE(company_id, name)` ersetzt (per SQL direkt geprüft – die alte
Constraint existiert nicht mehr). Der eigentliche, weiterhin
reproduzierbare Fehler kam von etwas anderem: Der Knopf fügt seit je her
immer denselben festen Namen `"Neue Funktion"` ein. In der Firma
PETER KÜNZI AG existiert bereits eine Zeile mit genau diesem Namen
(vermutlich aus einem früheren Testklick, nie umbenannt) – jeder weitere
Klick kollidierte dadurch weiterhin mit der (jetzt firmenbezogenen)
Unique-Constraint.

**Behoben** in `js/08-katalog-blitzschutz.js`
(`$("newRate").onclick`): Vor dem Insert wird der bereits im Speicher
geladene `settings.rates`-Katalog (firmenbezogen, kommt aus
tenant-RLS-gefiltertem `select`) auf Namenskollisionen geprüft und bei
Bedarf automatisch durchnummeriert (`Neue Funktion`, `Neue Funktion 2`,
`Neue Funktion 3`, …) statt mit einem Datenbankfehler abzubrechen. Die
bestehende Zeile "Neue Funktion" wurde **nicht** angetastet/umbenannt/
gelöscht (keine bestehenden Daten verändern).

**Firmenzuordnung (`company_id`):** bleibt unverändert, wie schon vor
dieser Änderung sicher gelöst – der Insert übergibt bewusst **keinen**
`company_id`-Wert vom Client. Die Spalte `rates.company_id` hat serverseitig
`DEFAULT my_company_id()` (siehe 20.2), zusätzlich erzwingt die Policy
`tenant_boundary_rates` (`company_id = my_company_id()`, `WITH CHECK`
identisch) dieselbe Zuordnung nochmals auf Datenbankebene. Ein
manipulierter Client könnte hier gar keinen abweichenden Wert einschleusen,
selbst wenn er es versuchen würde – das ist bereits die "saubere
serverseitige Lösung", eine zusätzliche Änderung war nicht nötig.

**Rates vollständig geprüft** (Laden/Bearbeiten/Löschen, alle in
`js/05-daten-laden.js` bzw. `js/07-einstellungen.js`/`js/08-katalog-
blitzschutz.js`): keine dieser Stellen filtert selbst nach `company_id` –
das ist beabsichtigt, da `tenant_boundary_rates` (Policy für `ALL`-Befehle)
und die vier `rates_<x>_permission`-Policies (`has_permission('rates',...)`)
das bereits auf DB-Ebene erzwingen. Per SQL bestätigt: Firma A kann keine
`rates` einer anderen Firma sehen/ändern/löschen, und zwei Firmen können
denselben Funktionsnamen unabhängig voneinander verwenden
(`UNIQUE(company_id, name)` statt global).

**Tests:**
- SQL direkt gegen das Supabase-Projekt: `rates`-Spalten/-Constraints
  (`company_id` mit `DEFAULT my_company_id()`, `UNIQUE(company_id,name)`,
  keine alte `rates_name_key` mehr) und alle fünf RLS-Policies auf `rates`
  geprüft.
- `node --check js/08-katalog-blitzschutz.js`: fehlerfrei.
- Geschützter Bereich (Passwortentfernung aus 22.1) erneut per Grep
  bestätigt: keine Reste von `PROTECTED_PASSWORD`/`protectedUnlocked`/
  `tryUnlockProtected` – diese Änderung war in dieser Runde bereits
  vollständig vorhanden, nicht erneut nötig.
- Live-Klicktest ("＋ Funktion hinzufügen" im Browser, Login als Admin/
  Mitarbeiter zweier verschiedener Firmen) in dieser Sitzung technisch
  nicht möglich (Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co`) – stattdessen per SQL/Code-Review
  verifiziert.
- Massaufnahme, Ausmass, Regierapport, Materialverwaltung, Excel-Import,
  PDF/Druck, PWA, Self-Service-Firmenregistrierung, Trial-System,
  Storage-Struktur: nicht angefasst.

## 23. NEUE FIRMA KONNTE SICH NACH REGISTRIERUNG NICHT EINLOGGEN – VERSION 2.15

### 23.1 Ursache

Kein grundsätzlich kaputter Auth-Ablauf: `register-company` legt Auth-User,
Firma und Admin-Profil korrekt an (per SQL direkt an einer echten, im
Betrieb registrierten Firma geprüft – Auth-User mit korrekt gesetztem
Passwort-Hash, bestätigter E-Mail, passender `auth.identities`-Zeile;
Profil mit `role:"admin"`, richtiger `company_id`, `passwort_gesetzt:true`;
mindestens ein erfolgreicher Login war für dieses Konto sogar bereits
protokolliert). Der Fehler lag stattdessen in einer Normalisierungs-
Inkonsistenz zwischen Registrierung und dem **automatischen** Login direkt
danach:

- `register-company` speichert die E-Mail immer klein geschrieben
  (`clean(body.email).toLowerCase()`).
- Der normale Login (`usernameToEmail()`) macht dasselbe
  (`u.toLowerCase()`) – für Mitarbeiter wie für Firmenadmins mit echter
  E-Mail zuverlässig korrekt.
- Der **automatische** Login direkt nach der Registrierung
  (`$("companyRegisterBtn").onclick` in `js/03-login.js`) verwendete
  dagegen bislang die rohe, nur getrimmte Eingabe aus dem Formularfeld
  (`$("regEmail").value.trim()`) – ohne `.toLowerCase()`.

Enthielt die eingegebene E-Mail auch nur einen Grossbuchstaben (von Hand
getippt, per Autovervollständigung/Passwortmanager übernommen oder von
manchen Tastaturen automatisch grossgeschrieben), schlug dieser eine
automatische Anmeldeversuch mit „Invalid login credentials" fehl – im
Frontend als generisches „Benutzername oder Passwort falsch." angezeigt
(dieselbe Meldung für jeden `signInWithPassword`-Fehler, siehe
`js/03-login.js` Zeile 29). Das Konto selbst war zu diesem Zeitpunkt
bereits vollständig und korrekt angelegt; nur dieser eine automatische
Anmeldeversuch scheiterte an der Gross-/Kleinschreibung.

### 23.2 Behoben

Eine Zeile in `js/03-login.js`, `$("companyRegisterBtn").onclick`:

```js
const email=$("regEmail").value.trim().toLowerCase();
```

(vorher ohne `.toLowerCase()`). Diese eine Variable wird sowohl für den
Aufruf von `register-company` als auch für den anschliessenden
automatischen `sb.auth.signInWithPassword({email,...})`-Aufruf verwendet
– beide sind dadurch jetzt garantiert identisch normalisiert, unabhängig
davon, wie die E-Mail eingegeben wurde. Betrifft ausschliesslich den
automatischen Login direkt nach der Self-Service-Registrierung.

### 23.3 Auth-Flow (zur Klarheit dokumentiert)

- **Firmenadmin (Self-Service-Registrierung):** loggt sich mit seiner
  echten, immer klein geschriebenen E-Mail-Adresse ein. Erkennung über
  ein „@" im Eingabefeld (`usernameToEmail()`), danach `.toLowerCase()`.
  Registrierung und jeder Login (automatisch wie manuell) verwenden ab
  jetzt exakt dieselbe Normalisierung.
- **Mitarbeiter (von einem Admin angelegt):** loggen sich weiterhin mit
  `Vorname.Nachname` an, ohne „@", intern auf die Pseudo-E-Mail-Domain
  `@nfgryuzkpwjfmdlmevuy.supabase.co` abgebildet (unverändert, von dieser
  Änderung nicht berührt).
- `profiles.passwort_gesetzt`: bei der Self-Service-Registrierung von
  Anfang an `true` (die Person hat ihr Passwort selbst gewählt), bei
  einem von einem Admin angelegten Mitarbeiterkonto `false` (erzwingt
  beim ersten Login das Setzen eines eigenen Passworts). Diese beiden
  Fälle waren bereits vor dieser Änderung korrekt getrennt und wurden
  nicht angefasst.

### 23.4 Tests

- Live-Endpunkttest (echte Registrierung → automatischer Login → Logout
  → Seite neu laden → manueller Login im Browser) war in dieser Sitzung
  technisch nicht möglich – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co` direkt.
  **Das wird hier ausdrücklich nicht als getestet behauptet.**
- Stattdessen per SQL direkt gegen die Produktivdatenbank geprüft, anhand
  einer bereits real registrierten Firma:
  - genau ein `auth.users`-Eintrag für die verwendete E-Mail, kein
    Duplikat aus einem vorherigen, fehlgeschlagenen Versuch.
  - `encrypted_password` vorhanden, korrektes bcrypt-Format.
  - `email_confirmed_at`/`confirmed_at` gesetzt (kein Bestätigungs-Mail-
    Hindernis).
  - passende `auth.identities`-Zeile (`provider:"email"`) mit
    übereinstimmender E-Mail.
  - `banned_until`/`deleted_at` leer, kein SSO-Nutzer.
  - zugehöriges `profiles`: `role:"admin"`, korrekte `company_id`,
    `passwort_gesetzt:true`.
  - `last_sign_in_at` zeigt einen bereits erfolgten, tatsächlichen Login
    für genau dieses Konto – die Auth-Grundfunktion war also nicht
    generell kaputt, sondern nur der eine automatische Anmeldeversuch
    direkt nach der Registrierung.
- `node --check js/03-login.js`: fehlerfrei.
- `sb.functions.invoke`-Fehleranzeige (`edgeFunctionErrorMessage()`, aus
  Version 2.14) und die Formularvalidierung von `register-company`
  (E-Mail-Format, Passwortlänge, Passwort-Wiederholung) per Code-Review
  gegengeprüft – unverändert korrekt.
- Bestehender Mitarbeiter-Login (`usernameToEmail()` ohne „@") und der
  bestehende Login der Firma PETER KÜNZI AG: nicht angefasst, per
  Code-Review bestätigt unverändert.

### 23.5 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 23.4) – bei Gelegenheit
  in einer Umgebung mit Netzwerkzugriff auf das Supabase-Projekt
  nachholen (genau die in Auftragsabschnitt 4 beschriebene Testfirma
  mit Wegwerf-E-Mail).
- Auth-Ratenbegrenzung (Brute-Force-Schutz von Supabase Auth) wurde
  nicht geprüft. Mehrere fehlgeschlagene Anmeldeversuche mit derselben
  E-Mail (z. B. durch den hier behobenen Bug ausgelöst) könnten in
  seltenen Fällen kurzzeitig weitere, sogar korrekte Versuche blockieren
  – das ist eine Supabase-Auth-Grundeinstellung, keine App-Änderung,
  und wurde in dieser Runde nicht angepasst.

## 24. MITARBEITER BLIEB IM „NEUES PASSWORT FESTLEGEN“-DIALOG GEFANGEN – VERSION 2.16

### 24.1 Ursache

`permission_settings` hat für `role='employee'`, `resource='profiles'`
bereits seit der Einführung des Permission-Modells `can_edit:false`
(bewusst so – ein Mitarbeiter soll z. B. nicht selbst seine Rolle oder
`company_id` ändern können). Die RLS-Policy `profiles_update_permission`
verknüpft das per UND mit der Eigentümer-Prüfung:

```
has_permission('profiles','edit') AND (id = auth.uid() OR is_admin())
```

Weil `has_permission('profiles','edit')` für einen Mitarbeiter immer
`false` ist, blockiert diese Policy **auch das Aktualisieren des eigenen
Profils** – unabhängig davon, dass `id = auth.uid()` zutrifft. Betroffen
war u. a. genau das eine Feld, das der erzwungene Erstpasswort-Flow selbst
setzen muss: `profiles.passwort_gesetzt`.

Der bisherige Code (`js/03-login.js`, `$("pwSpeichern").onclick`):

```js
const {error:e2}=await sb.from("profiles").update({passwort_gesetzt:true}).eq("id",currentProfile.id);
```

Eine von RLS blockierte UPDATE-Anweisung wirft in PostgREST **keinen
Fehler**, wenn dabei keine sonstige Constraint verletzt wird – sie betrifft
einfach still und ohne Meldung 0 Zeilen. `e2` war deshalb immer `null`, der
Code lief in den Erfolgspfad, setzte `currentProfile.passwort_gesetzt=true`
nur lokal im Browser und rief `afterLogin()` auf. `afterLogin()` lädt das
Profil aber frisch aus der Datenbank – dort stand weiterhin `false`, also
erschien der Passwort-Dialog erneut. Endlosschleife.

**Direkt gegen die Produktivdatenbank verifiziert** (in einer
Transaktion mit anschliessendem `ROLLBACK`, also ohne echte
Datenänderung, simuliert als eingeloggter Mitarbeiter über
`set local role authenticated; set local request.jwt.claims ...`):
Ein direktes `UPDATE ... WHERE id = auth.uid()` auf das eigene Profil
läuft tatsächlich ohne SQL-Fehler durch, ändert `passwort_gesetzt` aber
nachweislich nicht – exakt der beschriebene stille Fehlschlag.

### 24.2 Behoben

**Datenbank** (Supabase-Migrationen `mark_own_password_set_function`,
`mark_own_password_set_returns_boolean`, `mark_own_password_set_revoke_anon`):
neue, eng gefasste `SECURITY DEFINER`-Funktion

```sql
create function public.mark_own_password_set()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.profiles
  set passwort_gesetzt = true, updated_at = now()
  where id = auth.uid();
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;
```

Gleiches Muster wie `is_admin()`/`my_company_id()`/`has_permission()`:
Owner `postgres` hat `BYPASSRLS`, die Funktion umgeht damit gezielt **nur**
die eine blockierende Policy, für **nur** dieses eine Feld, auf **nur**
dem eigenen Profil (`auth.uid()` fest verdrahtet, kein Parameter für eine
fremde `id` – ein Mitarbeiter kann darüber unmöglich `role`, `company_id`
oder das Profil einer anderen Person ändern). RLS wurde nicht abgeschaltet
und keine bestehende Policy verändert. `EXECUTE` ist nur an `authenticated`
vergeben (Supabase vergibt bei neuen Funktionen im `public`-Schema per
Default-Privileges zusätzlich automatisch an `anon`/`service_role` – der
`anon`-Zugriff wurde explizit wieder entzogen; `anon` hätte ohnehin nie
einen `auth.uid()` und würde die Funktion folgenlos ins Leere laufen
lassen, aber "minimal notwendige Berechtigung" heisst hier auch: kein
unnötiger Grant).

Der Rückgabewert ist bewusst `boolean` (nicht `void`): der Client kann so
zuverlässig unterscheiden, ob wirklich eine Zeile aktualisiert wurde,
statt bei „kein Fehler“ automatisch Erfolg anzunehmen – exakt der Fehler,
der den Loop verursacht hat.

**Frontend** (`js/03-login.js`, `$("pwSpeichern").onclick`): ruft jetzt
`sb.rpc("mark_own_password_set")` statt des direkten `.update()` auf und
prüft sowohl `error` als auch den Rückgabewert:

```js
const {data:gesetzt,error:e2}=await sb.rpc("mark_own_password_set");
if(e2||!gesetzt){
 if(e2)console.error("mark_own_password_set fehlgeschlagen:",e2);
 $("pwFehler").textContent="Passwort wurde geändert, aber die Konto-Einrichtung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
 return;
}
```

Schlägt der Schritt fehl, bleibt der Dialog offen und zeigt die
verständliche Meldung aus dem Auftrag – die App tut nicht so, als sei die
Einrichtung abgeschlossen, wenn `passwort_gesetzt` in der Datenbank
tatsächlich nicht gesetzt werden konnte. Technische Details landen nur in
`console.error`.

### 24.3 Tests

- **Direkt gegen die Produktivdatenbank verifiziert** (jeweils in einer
  Transaktion mit `ROLLBACK`, keine echte Datenänderung, simuliert als
  eingeloggter Mitarbeiter über `set local role authenticated` +
  `request.jwt.claims`, am bereits vorhandenen Test-Mitarbeiterkonto
  „Test Test“ der Firma „Testfirma“):
  - altes Verhalten reproduziert: direktes `UPDATE profiles SET
    passwort_gesetzt=true WHERE id=auth.uid()` läuft ohne SQL-Fehler
    durch, ändert die Zeile aber nachweislich nicht (RLS blockiert
    still).
  - neues Verhalten verifiziert: `select public.mark_own_password_set()`
    liefert `true` **und** die Zeile zeigt danach tatsächlich
    `passwort_gesetzt=true` – korrekt aktualisiert, nicht nur ein
    Rückgabewert ohne echte Wirkung.
  - Grants der Funktion geprüft: `authenticated`/`service_role`/`postgres`
    haben `EXECUTE`, `anon` nicht (explizit entzogen).
  - Owner/`rolbypassrls` der Funktion geprüft: `postgres`, `true` –
    gleiches Muster wie die bestehenden Helper-Funktionen.
- `node --check js/03-login.js`: fehlerfrei.
- Admin-Pfad per Code-Review bestätigt unverändert: Admin-Konten haben
  `passwort_gesetzt=true` bereits ab Anlage (Self-Service-Registrierung)
  bzw. werden von dieser Änderung gar nicht berührt (kein
  Erstpasswort-Dialog für Admins).
- Andere `profiles`-Update-Stellen im Code (`js/05a-rechte.js` Rollen­
  änderung, `js/07-einstellungen.js` `debouncedProfileUpdate`) geprüft:
  beide ausschliesslich admin-gesteuert, laufen über `is_admin()` in
  derselben Policy und sind von diesem Fehler nicht betroffen – keine
  Änderung nötig.
- Live-Klicktest im Browser (Mitarbeiteranlage → Login → Passwortdialog
  → Speichern → App → Logout → erneuter Login) in dieser Sitzung technisch
  nicht möglich – Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt. **Das wird hier ausdrücklich
  nicht als getestet behauptet** – die SQL-Simulation deckt exakt denselben
  RLS-/Funktionspfad ab, den der Browser über PostgREST auslösen würde,
  ersetzt aber keinen echten Klicktest.
- Massaufnahme, Ausmass, Regierapport, Materialverwaltung, Excel-Import,
  PDF/Druck, PWA, Storage-Struktur, Tenant-RLS, Firmenregistrierung,
  Trial-System, rates, Admin-Bereich ohne zusätzliches Passwort: nicht
  angefasst.

### 24.4 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 24.3).
- Sollten künftig weitere Selbst-Service-Felder am eigenen Profil nötig
  werden (z. B. eigener Vor-/Nachname ändern), braucht das jeweils eine
  eigene, ebenso eng gefasste `SECURITY DEFINER`-Funktion – nicht
  pauschal `has_permission('profiles','edit')` für Mitarbeiter auf `true`
  setzen, das würde die ursprünglich gewollte Einschränkung (kein
  Selbst-Ändern von Rolle/`company_id`) wieder aufheben.

## 25. SYSTEM-ADMIN-BEREICH FÜR DEN BETREIBER – VERSION 2.17

Erster geschützter Bereich für den **Betreiber** von Spengler-DIGITAL,
strikt getrennt vom bestehenden Firmenadmin (`profiles.role='admin'`).
Ein Firmenadmin verwaltet weiterhin ausschliesslich seine eigene Firma;
ein System-Admin verwaltet die Firmenliste von Spengler-DIGITAL selbst.

### 25.1 Modell

Verwendet ausschliesslich die bereits vorhandene Struktur:

- Tabelle `system_admins` (`user_id`, `created_at`) – **weiterhin leer**,
  siehe 25.5.
- Funktion `is_system_admin()` (`SECURITY DEFINER`, prüft
  `system_admins.user_id = auth.uid()`) – unverändert übernommen.

Keine neue parallele Admin-Tabelle, keine Änderung an `profiles.role`
oder `company_id` als Ersatz.

### 25.2 Datenbank (Migrationen `system_admin_company_management`,
`system_admin_functions_revoke_anon`)

- **Neue RLS-Policy** `system_admin_select_all_companies` auf `companies`
  (`SELECT`, `USING (is_system_admin())`). Additiv zur bestehenden
  `company_member_select_own_company`-Policy (Postgres kombiniert
  mehrere permissive SELECT-Policies mit OR) – ein normaler
  Firmenmitarbeiter/-admin sieht weiterhin nur die eigene Firma, ein
  System-Admin zusätzlich alle. Keine bestehende Policy verändert.
- **Drei neue, eng gefasste `SECURITY DEFINER`-Funktionen** (gleiches
  Muster wie `is_admin()`/`mark_own_password_set()`, Owner `postgres`
  mit `BYPASSRLS`), jede prüft `is_system_admin()` selbst als erste
  Zeile und bricht sonst mit `raise exception ... errcode 42501` ab:
  - `system_admin_company_user_counts()` – liefert **nur** `company_id`
    + Anzahl (`count(*)`) je Firma aus `profiles`, bewusst **keine**
    Namen/E-Mails/sonstigen personenbezogenen Daten.
  - `system_admin_set_trial(company_id, trial_days, trial_started_at,
    trial_ends_at)` – ändert **ausschliesslich** diese drei Felder
    (+ `updated_at`) einer einzelnen Firma.
  - `system_admin_set_status(company_id, status)` – ändert
    **ausschliesslich** `subscription_status` (+ `updated_at`).
    `companies_subscription_status_check` erzwingt weiterhin serverseitig
    die gültigen Werte (`trial`/`active`/`expired`/`cancelled`/
    `suspended`).
  - Bewusst **keine** RLS-`UPDATE`-Policy für System-Admins auf
    `companies` (das würde die ganze Zeile inkl. `name`/`slug`/
    `is_active` freigeben) – stattdessen wie bei `mark_own_password_set()`
    präzise Funktionen, die nur die vom Auftrag vorgesehenen Felder
    anfassen.
  - `EXECUTE` nur an `authenticated` (Supabase vergibt bei neuen
    Funktionen zusätzlich automatisch an `anon` – explizit entzogen, wie
    schon bei `mark_own_password_set()`).

### 25.3 Frontend (`js/22-system-admin.js`, neuer Menüpunkt in
`index.html`)

- Neuer, standardmässig **`hidden`** Knopf `#navSystemAdmin`
  ("⚙️ System-Administration") auf dem Startbildschirm, neben "💬
  Feedback geben". `checkSystemAdmin()` (aufgerufen in `afterLogin()`,
  `js/03-login.js`) ruft `sb.rpc("is_system_admin")` auf und blendet den
  Knopf nur ein, wenn das `true` ergibt. **Reine UI-Führung** – die
  eigentliche Absicherung ist ausschliesslich die RLS-Policy/die drei
  Funktionen aus 25.2, die bei jedem Aufruf serverseitig erneut prüfen,
  unabhängig vom Frontend-Zustand (siehe 25.4 für den Beleg).
- `#systemAdminModal` – Firmenliste (Name, Status, Test-bis-Datum,
  Benutzeranzahl) als Karten, Klick öffnet `#systemAdminCompanyModal`.
- `#systemAdminCompanyModal` – Detailansicht (Status, Registriert am,
  Trial-Dauer, Trial-Beginn, Trial-Ende, Benutzeranzahl) plus zwei
  Aktionen:
  - **Trial bearbeiten**: Trial-Dauer (Tage) und Trial-Beginn editierbar,
    Trial-Ende wird im Frontend automatisch aus Beginn + Dauer berechnet
    und mitgeschickt – deckt "Trial-Dauer ändern"/"verlängern"/
    "verkürzen"/"auf einen gewünschten Zeitraum setzen" aus dem Auftrag
    ab, ohne eine zweite parallele Trial-Logik einzuführen (nutzt exakt
    `trial_days`/`trial_started_at`/`trial_ends_at`).
  - **Status ändern**: Dropdown mit den fünf bestehenden
    `subscription_status`-Werten.
  - Beide Aktionen rufen `sb.rpc(...)` auf; schlägt der Server-Check
    fehl (z. B. weil `system_admins` leer ist, siehe 25.5), erscheint
    eine Fehlermeldung in `#sysAdminActionError` statt eines stillen
    Erfolgs.
- Keine Löschfunktion, keine Anzeige von Projekten/Massaufnahmen/Fotos
  einzelner Firmen – bewusst nur die in dieser Phase vorgesehene
  Firmenverwaltung (siehe 25.6).
- `goToStart()` schliesst beide neuen Modals mit, wie alle bestehenden
  Modals.

### 25.4 Sicherheit – direkt gegen die Produktivdatenbank verifiziert

Alle Tests in einer Transaktion mit anschliessendem `ROLLBACK` (keine
echte Datenänderung), simuliert über `set local role authenticated` +
`request.jwt.claims`:

- Ein normaler Firmenadmin **ohne** System-Admin-Eintrag (Max
  Mustermann, Admin der Firma "Testfirma") sieht über
  `select * from companies` weiterhin **nur seine eigene Firma** (1
  Zeile) und `is_system_admin()` liefert `false`.
- **Derselbe Admin von PETER KÜNZI AG** (Mike Ledermann) bekommt bei
  `system_admin_set_trial(...)` auf die eigene Firma den Fehler „Nur
  für System-Administratoren." – ein Firmenadmin kann also nicht einmal
  seine eigene Firma über den neuen Weg ändern.
- Nach einem **temporären** Test-Eintrag in `system_admins` (innerhalb
  derselben, zurückgerollten Transaktion) sieht derselbe Benutzer
  plötzlich **beide** Firmen, `system_admin_company_user_counts()`
  liefert korrekte Zähler (2 bzw. 12 Benutzer), und
  `system_admin_set_status(...)`/`system_admin_set_trial(...)` liefern
  die aktualisierte Zeile zurück.
- Nach jedem `ROLLBACK` erneut per SQL geprüft: `system_admins` weiterhin
  leer (`count = 0`), PETER KÜNZI AG und Testfirma exakt im
  ursprünglichen Zustand (`subscription_status`, `trial_days`
  unverändert) – kein Test hat echte Daten verändert.
- Grants der drei neuen Funktionen geprüft: `authenticated`/
  `service_role`/`postgres` haben `EXECUTE`, `anon` nicht.
- Supabase-Security-Advisor nach den Migrationen erneut geprüft: die
  drei neuen Funktionen erscheinen dort nur mit der bereits für
  `is_admin()`/`mark_own_password_set()` akzeptierten, erwarteten
  Warnung ("von `authenticated` aufrufbar, Prüfung liegt in der
  Funktion") – keine neue, andersartige Auffälligkeit, kein
  `anon`-Zugriff.

### 25.5 System-Admin-Benutzer

**Seit Version 2.17.1 aktiviert.** `system_admins` enthält genau einen
Eintrag: den bereits vorhandenen Betreiber-Account **Mike Ledermann**
(Login `mike.ledermann`, Profil-`id` `665e202d-5fae-42e9-8d8f-677348931e82`).

**Identifikation (Migration `activate_first_system_admin`):** Das
tatsächliche `profiles`-Schema wurde zuerst per SQL geprüft – die Spalten
heissen `first_name`/`last_name`, nicht `vorname`/`nachname`. Danach alle
`profiles` mit `role='admin'` systemweit aufgelistet (Join über
`companies` und `auth.users`, nur `id`/Name/Firma/`created_at`/E-Mail,
keine weiteren personenbezogenen Daten): es existierten zu diesem
Zeitpunkt **genau zwei** Admin-Konten im gesamten System –
1. Mike Ledermann, einziger Admin der ursprünglichen Firma
   PETER KÜNZI AG, ältestes Konto im System (`created_at` 2026-08-24,
   vor der gesamten Multi-Tenant-/Self-Service-Migration angelegt),
   aktives Auth-Konto mit bereits erfolgtem Login
   (`last_sign_in_at` gesetzt, nicht gesperrt/gelöscht).
2. Max Mustermann, Admin der Firma "Testfirma" – nachweislich Testdaten
   aus einer vorherigen Session (Self-Service-Registrierung am
   2026-09-01 zum Testen der Firmenregistrierung/des Login-Bugfixes),
   erkennbar am Platzhalternamen und Firmennamen.

Eindeutig identifiziert über Rolle + Firmenzugehörigkeit + `created_at` +
Auth-Status – keine geratene UUID, kein Namensraten bei mehreren
möglichen Treffern (PETER KÜNZI AG hat nachweislich nur diesen einen
Admin). Zusätzlich bestätigt der Nutzername "Mike Ledermann" den
bestehenden Kontext dieser Session (Projektinhaber). Max Mustermann/
Testfirma wurde **nicht** eingetragen.

**Eingetragen:**

```sql
insert into public.system_admins(user_id)
values ('665e202d-5fae-42e9-8d8f-677348931e82')
on conflict (user_id) do nothing;
```

**Verifiziert** (direkt gegen die Produktivdatenbank, `is_system_admin()`
in einer per `request.jwt.claims` simulierten Sitzung aufgerufen):
- `system_admins` enthält genau diese eine Zeile, keine Duplikate
  (`user_id` ist Primärschlüssel).
- `is_system_admin()` liefert für Mike Ledermann `true`, für Max
  Mustermann weiterhin `false`.
- `profiles` (beide Admin-Zeilen) und `companies` (PETER KÜNZI AG,
  Testfirma) vor und nach dem Eintrag unverändert (`updated_at` beider
  Firmen liegt vor diesem Auftrag) – ausschliesslich `system_admins`
  wurde geschrieben.
- Kein Code geändert, deshalb **keine Versionserhöhung** – die
  System-Admin-Oberfläche selbst bleibt Version 2.17.

Ein weiterer System-Admin wird auf demselben Weg eingetragen, sollte das
künftig nötig sein – kein UI dafür in dieser Phase, siehe 25.6.

### 25.6 Was diese Phase NICHT enthält

- Keine vollständige Firmenlöschung (auch nicht für Testfirmen).
- Keine Impersonation/kein Support-Zugriff auf Projekte, Massaufnahmen,
  Fotos oder sonstige Firmendaten einzelner Kunden.
- Kein Zahlungsanbieter, keine Abrechnung.
- Keine eigene Domain.
- Keine automatische Trial-Sperrung/-Löschung – ein abgelaufener Trial
  bleibt weiterhin unverändert nutzbar, wie schon in 21.4 dokumentiert.
  Der System-Admin kann den Status **manuell** ändern, es passiert
  nichts automatisch.

### 25.7 Tests

- Direkt gegen die Produktivdatenbank verifiziert, siehe 25.4 (RLS-
  Trennung, Server-Ablehnung für Nicht-System-Admins, korrekte
  Firmenliste/Benutzerzähler/Schreibzugriff für einen simulierten
  System-Admin, keine Datenänderung an PETER KÜNZI AG/Testfirma).
- `node --check` über alle `js/*.js` (inkl. neuer `js/22-system-admin.js`)
  und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (577/577, vorher
  539/539 – Differenz durch die zwei neuen Modals).
- Jede in `js/22-system-admin.js` verwendete Element-ID einzeln gegen
  `index.html` geprüft: jede genau einmal vorhanden, keine
  Tippfehler/Duplikate.
- Wiederverwendete CSS-Klassen (`settingrow`, `settings-section`, `card`,
  `modal`, …) sind bereits in `css/01-basis.css`/`css/02-responsive.css`
  definiert und dort bereits für Tablet/Mobile ausgelegt – keine neue,
  ungetestete Layout-Logik eingeführt.
- Live-Klicktest im Browser (Login als eingetragener System-Admin,
  Firmenliste öffnen, Trial/Status ändern) in dieser Sitzung technisch
  nicht möglich – Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, und `system_admins` ist
  ohnehin leer (siehe 25.5), es gibt also aktuell noch gar kein echtes
  System-Admin-Konto zum Testen. **Das wird hier ausdrücklich nicht als
  getestet behauptet.**
- Massaufnahme, Ausmass, Regierapport, Materialverwaltung, Excel-Import,
  PDF/Druck, PWA, Storage-Struktur, Tenant-RLS, Firmenregistrierung,
  Mitarbeiteranlage, Passwort-Erstsetzungsflow, `rates`, bestehender
  Login: nicht angefasst, keine bestehende Policy/Funktion verändert.

### 25.8 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 25.7) – bei Gelegenheit
  in einer Umgebung mit Netzwerkzugriff auf das Supabase-Projekt
  nachholen (seit Version 2.17.1 gibt es mit Mike Ledermann ein echtes
  System-Admin-Konto zum Testen, siehe 25.5).
- "Letzter relevanter Aktivitätszeitpunkt" (Auftrag Abschnitt 3, "falls
  bereits vorhanden") wurde **nicht** eingebaut – es gibt in der App
  aktuell keine vorhandene, bereits berechnete Kennzahl dafür (nur
  `auth.users.last_sign_in_at` pro einzelnem Benutzer, keine
  Firmen-Aggregation). Eine neue Tracking-Logik dafür einzuführen wäre
  über die "kleinste sichere Änderung" hinausgegangen – bewusst
  ausgelassen statt geraten/improvisiert.

## 26. BESTÄTIGUNG NACH ERFOLGREICHEN SYSTEM-ADMIN-ÄNDERUNGEN – VERSION 2.18

Reine UI-Ergänzung im bestehenden System-Admin-Bereich (Abschnitt 25) –
keine neue Speicherlogik, keine Änderung an RLS/`SECURITY DEFINER`-
Funktionen/`system_admins`/`is_system_admin()`.

### 26.1 Was geändert wurde

- Neues Element `#sysAdminActionSuccess` (`index.html`, im
  `#systemAdminCompanyModal`, direkt über dem bereits vorhandenen
  `#sysAdminActionError`) – standardmässig `hidden`, dezenter grüner
  Text (`color:var(--green)`, gleiche Formatierung wie die bestehende
  Fehleranzeige), **kein** Alert/Popup und **kein** neues Toast-System.
  Ein separates Toast-Framework existierte in der App nicht – ein
  einzelnes verstecktes `<div>` war die kleinste passende Lösung.
- Neue Hilfsfunktion `sysAdminShowSuccess(msg)` (`js/22-system-admin.js`):
  setzt den Text (mit "✓ " vorangestellt), blendet das Element ein und
  lässt es nach 4 Sekunden automatisch wieder verschwinden
  (`setTimeout`). Wird `openSystemAdminCompany()` erneut aufgerufen
  (Firma wechseln, neu öffnen), wird die Meldung sofort mit ausgeblendet
  – wie schon zuvor bei der Fehlermeldung.
- `$("sysAdminSaveTrial").onclick` und `$("sysAdminSaveStatus").onclick`
  rufen `sysAdminShowSuccess(...)` **ausschliesslich** nach der
  bestehenden, unveränderten Erfolgs-Verzweigung auf (`if(error){...
  return}` bleibt unverändert davor) – die eigentliche Speicherung
  (`sb.rpc("system_admin_set_trial"/"system_admin_set_status")`) wird
  dadurch **nicht** zusätzlich oder doppelt aufgerufen, nur eine
  UI-Zeile nach dem bereits vorhandenen Erfolgspfad ergänzt:
  - Trial: „✓ Trial-Dauer erfolgreich auf **N** Tage gesetzt."
  - Status: „✓ Firmenstatus erfolgreich auf „**Label**" gesetzt." (mit
    der bereits vorhandenen deutschen Status-Bezeichnung aus
    `SYS_ADMIN_STATUS_LABELS`, z. B. „Aktiv" statt `active`).
- Fehlerfall unverändert: `$("sysAdminActionError")` zeigt weiterhin die
  bestehende Meldung, `sysAdminShowSuccess()` wird in diesem Zweig nicht
  erreicht (frühes `return` bzw. `catch`-Block).

### 26.2 Tests

- Code-Review der Aufrufreihenfolge in beiden Speichern-Handlern: die
  Erfolgsmeldung steht strukturell **nach** der bestehenden
  Fehlerprüfung (`if(error){...;return}`) und nach dem bestehenden
  Neuladen/Wiederöffnen (`renderSystemAdminList()` +
  `openSystemAdminCompany(...)`) – kann also nicht vor einer
  tatsächlich fehlgeschlagenen Speicherung erscheinen.
- `node --check js/22-system-admin.js` (und alle übrigen `js/*.js` sowie
  `sw.js`): fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (578/578, vorher
  577/577 – Differenz durch das eine neue Element).
- `#sysAdminActionSuccess` gegen `index.html` geprüft: genau einmal
  vorhanden.
- Diff bewusst minimal gehalten (nur `index.html` + `js/22-system-
  admin.js`, keine sonstigen Dateien) – bestätigt, dass keine der unter
  "Nicht verändern" gelisteten Funktionen (System-Admin-Berechtigungen,
  `system_admins`, `is_system_admin()`, RLS, `SECURITY DEFINER`-
  Funktionen, Trial-Datenmodell, Firmenregistrierung, Mitarbeiteranlage,
  Passwort-Erstsetzungsflow, `rates`, Massaufnahme, Ausmass,
  Regierapport, Materialverwaltung, Excel-Import, PDF/Druck, PWA,
  Storage, Tenant-RLS) berührt wurde.
- Live-Klicktest im Browser (Trial ändern → Bestätigung sehen → Status
  ändern → Bestätigung sehen → absichtlichen Fehler auslösen → keine
  Bestätigung) in dieser Sitzung technisch nicht möglich – Sandbox
  blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt. **Das wird hier
  ausdrücklich nicht als getestet behauptet.**

## 27. VOLLSTÄNDIGE, MANUELLE FIRMENLÖSCHUNG – VERSION 2.19

Erste und einzige Möglichkeit, eine Firma inklusive aller Daten
unwiderruflich zu entfernen. Ausschliesslich eine manuell vom System-Admin
ausgelöste Aktion – **keine** automatische Löschung bei Trial-Ablauf, wie
bereits in 21.4/25.6 festgelegt.

### 27.1 Schema-/Abhängigkeitsanalyse (vor der Implementierung, per SQL
gegen das tatsächliche Schema geprüft, nicht aus alter Doku übernommen)

Alle Fremdschlüssel in `public` direkt über `pg_constraint` ausgelesen
(nicht nur `information_schema` – das übersieht das schemaübergreifende
`profiles.id → auth.users.id`). Ergebnis:

**Direkt firmenbezogen** (`company_id`, `ON DELETE NO ACTION`, müssen vor
`companies` explizit geleert werden): `app_settings`, `blitzschutz_materials`,
`einlaufblech_settings`, `feedback`, `materials`, `measurement_materials`,
`permission_overrides`, `profiles`, `projects`, `rates`,
`rinne_fitting_types`.

**Indirekt über `project_id`** (`ausmass`, `measurements`, `reports` – alle
`ON DELETE SET NULL`): würden bei blossem Löschen der `projects`-Zeile nur
verwaisen (kein `company_id` auf diesen Tabellen, siehe 20.2) statt
wirklich zu verschwinden – deshalb **explizit** vor `projects` gelöscht,
nicht der SET-NULL-Regel überlassen.

**`project_files.project_id → projects`**: `ON DELETE CASCADE` – löscht
sich beim Löschen von `projects` automatisch mit, kein separater Schritt
nötig.

**`created_by`/`updated_by` auf `auth.users(id)`** (`ON DELETE NO ACTION`,
u. a. auf `ausmass`, `measurements`, `project_files`, `projects`,
`reports`, **und `companies.created_by` selbst**): erzwingen zusammen
folgende Reihenfolge – alle firmenbezogenen Zeilen (inkl. `companies`
selbst) müssen weg sein, **bevor** ein Auth-User gelöscht wird, sonst
schlägt das Löschen des Auth-Users mit einem Fremdschlüsselfehler fehl.

**`profiles.id → auth.users.id`**: `ON DELETE CASCADE` (umgekehrte
Richtung – wird hier nicht genutzt, da `profiles` ohnehin explizit vor
dem Auth-User gelöscht wird).

**Storage**: ein einziger Bucket (`measurements`, privat). Keine
verlässliche Pfad-Konvention pro Firma (alte Pfade wie `photo/…`,
`company-logo/…` tragen gar keinen Firmen-/Projektbezug im Pfad selbst,
siehe 20.5/20.6) – die einzig korrekte Quelle sind die tatsächlich
gespeicherten Werte in `app_settings.logo_url`,
`measurements.photo_path`/`sketch_path`/`sketch_paths`,
`ausmass.photo_path`/`photo_paths`, `project_files.file_path`. Per SQL
gegen die echten Werte von PETER KÜNZI AG geprüft (rein lesend, nichts
verändert): alle fünf vorhandenen Werte (altes `.../object/public/…`-
Format wie neuer reiner Pfad) normalisieren exakt auf die tatsächlichen
`storage.objects.name`-Einträge – die Normalisierung entspricht 1:1
`measStoragePathFromValue()` aus `js/10-massaufnahme.js`.

### 27.2 Löschreihenfolge (final, aus 27.1 abgeleitet)

1. **Storage-Dateien zuerst** (alle oben genannten Pfad-Quellen für die
   Projekte/die Firma sammeln, normalisieren, über die Storage-API
   löschen). Schlägt das fehl: **abbrechen, keine einzige Datenbankzeile
   wird angefasst** – eine Postgres-Transaktion kann eine bereits
   erfolgte Storage-Löschung nicht zurückrollen, aber umgekehrt genauso
   wenig eine noch nicht erfolgte Datenbankänderung vor einem
   fehlgeschlagenen Storage-Schritt „vorsorglich" rückgängig machen.
   Deshalb: Storage-Erfolg ist Voraussetzung, nicht Nachgang.
2. `ausmass`, `measurements`, `reports` (über `project_id`)
3. `feedback`, `permission_overrides` (über `company_id`)
4. `rinne_fitting_types`, `measurement_materials`, `blitzschutz_materials`,
   `materials`, `rates`, `einlaufblech_settings`, `app_settings` (über
   `company_id`)
5. `projects` (über `company_id`) – `project_files` kaskadiert automatisch
6. `profiles` (über `company_id`)
7. `companies` (über `id`)
8. **Erst jetzt** die Auth-User der ehemaligen Mitarbeiter über die
   offizielle Admin-API löschen (kein direktes `DELETE FROM auth.users` –
   das würde interne Auth-Tabellen/Sessions umgehen, die die Admin-API
   korrekt mit aufräumt)
9. Verifikation (Firma/Profile/Projekte existieren nicht mehr)

Schritte 2–7 laufen als **eine einzige** `SECURITY DEFINER`-Funktion
(`system_admin_delete_company_data`, gleiches Muster wie `is_admin()`/
`mark_own_password_set()`) – das ist eine implizite Postgres-Transaktion:
entweder gehen alle sieben Schritte durch, oder (bei einer Exception,
z. B. `is_system_admin()` falsch oder Firma nicht gefunden) **keiner** von
ihnen. Damit ist genau der im Auftrag geforderte Fall „keine halbe,
unbemerkte Löschung" für den Datenbank-Anteil ausgeschlossen. Schritt 1
(Storage) und Schritt 8 (Auth-User) laufen dagegen zwangsläufig über
HTTP-APIs ausserhalb dieser Transaktion – das wird hier bewusst nicht als
atomar behauptet (siehe 27.5 für die verbleibende, offengelegte Lücke).

### 27.3 Implementierung

**Datenbank** (Migration `system_admin_delete_company_data`): eine
`SECURITY DEFINER`-Funktion, Owner `postgres` (`BYPASSRLS`, gleiches
Muster wie alle bisherigen `system_admin_*`-Funktionen). Nimmt
ausschliesslich `p_company_id` entgegen – welche Projekte/Profile/etc.
dazugehören, ermittelt die Funktion **selbst** per Live-Abfrage, nichts
davon kommt vom Client. Prüft `is_system_admin()` als erste Zeile.
**Zusätzliches Sicherheitsnetz**: bricht mit einer eigenen Meldung ab,
falls unter den zu löschenden Profilen ein Eintrag in `system_admins`
wäre (kann bei korrekt getrennten Konten nicht vorkommen, wird aber nicht
nur angenommen). `EXECUTE` nur an `authenticated` (Supabase vergibt neue
Funktionen automatisch zusätzlich an `anon` – wie bei den bisherigen
`system_admin_*`-Funktionen explizit entzogen).

**Edge Function** `system-admin-delete-company` (`supabase/functions`,
`service_role` ausschliesslich serverseitig): orchestriert den
kompletten Ablauf aus 27.2.
- Ruft `/auth/v1/user` mit dem mitgesendeten JWT auf, um den echten
  Aufrufer zu bestimmen (keine Client-Angabe einer Nutzer-ID).
- Prüft `system_admins` direkt per REST (service_role, umgeht damit
  RLS) – nicht über die RLS-beschränkte `is_system_admin()`-RPC, weil
  die Funktion generell (nicht nur „bin ich selbst") wissen muss, ob
  der Aufrufer System-Admin ist.
- Lädt die Firma anhand `company_id`, vergleicht `confirm_name` **exakt**
  gegen den tatsächlichen, gerade aus der Datenbank gelesenen
  Firmennamen – die `company_id` allein zählt nicht als Autorisierung,
  wie im Auftrag gefordert.
- Sammelt alle Storage-Pfade (siehe 27.1), normalisiert sie
  (`storagePathFromValue()`, Server-Äquivalent von
  `measStoragePathFromValue()`), löscht sie batch-weise (100 pro
  Aufruf, wegen „beliebig viele/über 1000 Dateien") über
  `POST /storage/v1/object/remove/measurements`.
- Ruft danach `system_admin_delete_company_data` per RPC auf.
- Löscht danach die Auth-User über `DELETE /auth/v1/admin/users/{id}` –
  einzeln, mit Sammlung fehlgeschlagener IDs statt Abbruch beim ersten
  Fehler (siehe 27.5).
- Verifiziert abschliessend per erneuter Abfrage, dass Firma/Profile/
  Projekte nicht mehr existieren.
- Antwortet mit `{ok:true, company, deleted:{users,projects,
  storage_files}, auth_delete_failures?}` bzw. einer verständlichen
  deutschen Fehlermeldung, technische Details nur in `console.error`.

**Frontend** (`js/22-system-admin.js`, `index.html`): im bestehenden
`#systemAdminCompanyModal` ein rot hervorgehobener „⚠️ Firma endgültig
löschen"-Abschnitt mit Warntext. Klick öffnet `#systemAdminDeleteModal`
(zweite, eigenständige Sicherheitsabfrage): Warnliste aller betroffenen
Datenarten, Eingabefeld für den exakten Firmennamen, „ENDGÜLTIG LÖSCHEN"
bleibt `disabled`, bis die Eingabe exakt (zeichengenau) mit dem
Firmennamen übereinstimmt. Reine UI-Führung – die eigentliche Prüfung
läuft serverseitig nochmals in der Edge Function (siehe oben). Bei Erfolg
Rücksprung zur Firmenliste mit Bestätigung „✓ Firma … wurde vollständig
gelöscht (N Benutzer, N Projekte, N Storage-Dateien)."; bei Fehler
verständliche Meldung im Dialog, keine Löschung angenommen.

### 27.4 Tests

Ausschliesslich an **Testfirma** getestet, nie an PETER KÜNZI AG – vorher
dokumentierter Stand: 1 Firma-Zeile, 2 Profile (Max Mustermann/Admin,
Test Test/Mitarbeiter, beide **kein** Eintrag in `system_admins`),
1 Projekt ("Testprojekt", 1 Massaufnahme ohne Foto/Skizze), 1
`app_settings`-Zeile (`logo_url` leer), 0 Storage-Dateien.

**Direkt gegen die Produktivdatenbank verifiziert** (Transaktionen mit
`ROLLBACK`, keine echte Datenänderung):
- `system_admin_delete_company_data(...)` mit Max Mustermann (Testfirmas
  eigenem Admin, kein System-Admin) als Aufrufer → korrekt abgelehnt
  („Nur für System-Administratoren.").
- Derselbe Aufruf mit dem echten System-Admin (Mike Ledermann) als
  Aufrufer → lief vollständig durch, lieferte `deleted_profiles:2,
  deleted_projects:1` – exakt die vorher dokumentierten Zahlen.
- **Eigener Test des Sicherheitsnetzes**: ein Versuch, Max Mustermann
  selbst temporär als System-Admin einzutragen und ihn seine eigene
  Firma löschen zu lassen, wurde korrekt vom eingebauten Schutz
  abgelehnt („Ein Mitglied dieser Firma ist als System-Administrator
  eingetragen.") – bestätigt, dass dieses Sicherheitsnetz tatsächlich
  greift, nicht nur im Code steht.
- Nach jedem `ROLLBACK`: `companies`/`profiles`/`projects`/`measurements`/
  `system_admins` exakt auf dem Stand von vorher (2 Firmen, 14 Profile,
  4 Projekte, 14 Massaufnahmen, 1 System-Admin) – kein Test hat echte
  Daten verändert.
- **Storage-Pfad-Normalisierung** (`storagePathFromValue()`-Logik) rein
  lesend gegen die tatsächlichen, weiterhin unveränderten Werte von
  PETER KÜNZI AG geprüft: alle fünf vorhandenen Storage-Referenzen
  (`app_settings.logo_url`, 2× `measurements.sketch_path`,
  `ausmass.photo_path`, `project_files.file_path` – sowohl im alten
  vollen `.../object/public/measurements/…`-Format als auch als bereits
  reiner Pfad) normalisieren von Hand nachgerechnet exakt auf die
  tatsächlichen `storage.objects.name`-Einträge im Bucket. Nichts davon
  wurde gelöscht.
- `PETER KÜNZI AG` nach Abschluss aller Tests erneut geprüft:
  `updated_at` identisch zum Stand vor Beginn dieser Aufgabe, 14 Profile,
  Storage-Bucket weiterhin 14 Objekte – unverändert.
- `node --check` über alle `js/*.js` (inkl. `js/22-system-admin.js`) und
  `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (592/592, vorher
  578/578 – Differenz durch den neuen Löschabschnitt + das neue
  Bestätigungs-Modal).
- Jede neue Element-ID einzeln gegen `index.html` geprüft: genau einmal
  vorhanden.
- **Live-Test der kompletten Kette (echter Klick auf „ENDGÜLTIG
  LÖSCHEN" im Browser, echte Storage-/Auth-API-Aufrufe über die
  deployte Edge Function) war in dieser Sitzung technisch nicht
  möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt. **Das wird hier
  ausdrücklich nicht als getestet behauptet.** Getestet wurde
  ausschliesslich der Datenbank-Teil (per SQL-Simulation identisch zum
  tatsächlichen RLS-/Funktionspfad) und die Storage-Pfad-Logik (rein
  lesend, von Hand nachgerechnet).

### 27.5 Bekannte Grenzen (bewusst offengelegt, nicht verschwiegen)

- **Storage-Löschung ist nicht transaktional mit der Datenbank.** Falls
  die Storage-Löschung selbst erfolgreich zurückmeldet, aber danach der
  RPC-Aufruf für die Datenbank unerwartet fehlschlägt (z. B. durch einen
  zu diesem Zeitpunkt noch nicht bekannten, in dieser Analyse übersehenen
  Fremdschlüssel), wären die Storage-Dateien bereits weg, während die
  Datenbankzeilen noch stehen. Die Edge Function meldet diesen Fall
  ausdrücklich als eigene Fehlermeldung („Datenbank-Löschung
  fehlgeschlagen, nachdem Storage-Dateien bereits entfernt wurden") statt
  ihn zu verschleiern – der Datenbank-Teil selbst ist dank der einen
  atomaren Funktion (27.2) aber in sich konsistent (entweder ganz oder
  gar nicht), das Risiko ist also auf „Storage weg, DB unverändert"
  begrenzt, nicht „DB halb gelöscht".
- **Auth-User-Löschung läuft nach der Datenbank-Löschung, einzeln, ohne
  Rollback.** Schlägt das Löschen eines einzelnen Auth-Users fehl
  (Netzwerk, Supabase-Auth-Fehler), werden die übrigen trotzdem versucht;
  die fehlgeschlagenen IDs kommen in der Antwort zurück
  (`auth_delete_failures`) und landen im Server-Log. Zu diesem Zeitpunkt
  sind Firma/Projekte/Massaufnahmen/etc. bereits vollständig weg – ein
  übrig gebliebener Auth-User ohne jedes zugehörige Profil ist der
  denkbar harmloseste Rest-Zustand (kein Zugriff auf irgendwelche Daten
  mehr möglich, da `profiles`/`company_id` nicht mehr existieren), aber
  kein automatischer zweiter Versuch ist eingebaut.
- **Storage-„Erfolg" wird anhand des HTTP-Status der Remove-API
  bewertet, nicht Objekt für Objekt bestätigt.** Die Supabase-Storage-
  Remove-API meldet keine verlässliche Einzel-Objekt-Bestätigung
  zurück; ein bereits nicht mehr vorhandener Pfad (z. B. eine veraltete
  Referenz auf eine längst gelöschte Datei) führt nicht zu einem Fehler.
  Das ist normal und kein Blocker, bedeutet aber: die Funktion kann nicht
  hundertprozentig unterscheiden zwischen „Datei erfolgreich gelöscht"
  und „Datei war ohnehin schon nicht mehr da".
- Kein Wiederherstellen nach der Löschung – wie im Auftrag gefordert
  („unwiderruflich"), keine Papierkorb-/Soft-Delete-Funktion.
- Für den eigentlichen Storage-/Auth-Löschpfad gibt es in dieser Sitzung
  keinen Live-Test mit echten hochgeladenen Dateien, da Testfirma aktuell
  keine besitzt (siehe 27.4) und ein Live-Aufruf ohnehin nicht möglich
  war. Die Pfad-**Ermittlung/Normalisierung** wurde stattdessen anhand
  der echten, unverändert gebliebenen Daten von PETER KÜNZI AG
  verifiziert (27.4).

## 28. GESCHÜTZTER EINSTELLUNGSBEREICH NUR FÜR FIRMENADMINS + FIRMENREGISTRIERUNG VORERST NUR ÜBER SYSTEM-ADMIN – VERSION 2.20

Zwei getrennte, kleine Korrekturen an bestehenden Bereichen – keine neue
Fachlogik, keine Änderung an Massaufnahme/Ausmass/Regierapport/Mitarbeiter-
anlage/Passwort-Erstsetzung/`rates`/Trial-Verwaltung/System-Admin-
Grundmodell/Firmenlöschung.

### 28.1 Geschützter Einstellungsbereich: Tab selbst jetzt auch ausgeblendet

Der Tab „🔒 Geschützt" zeigte für Mitarbeiter zwar schon seit Version 2.14
nur den Hinweistext „nur für Administratoren zugänglich" statt echter
Inhalte (`#protectedDenied` vs. `#protectedContent`, gesteuert über
`isAdmin()`) – der Tab-**Knopf** in der Tab-Leiste selbst war aber
weiterhin für jeden sichtbar, ein Mitarbeiter konnte ihn also sehen und
anklicken. Jetzt zusätzlich: `#protectedTabBtn` (neue ID auf dem
bestehenden Knopf) startet `hidden` und wird in `renderSettings()`
(`js/08-katalog-blitzschutz.js`) direkt neben dem bereits vorhandenen
`$("feedbackTabBtn").hidden=!isAdmin();` genauso gesetzt – ein Mitarbeiter
sieht den Bereich jetzt überhaupt nicht mehr, nicht nur eine Denied-
Meldung darin.

**Weiterhin reine UI-Führung, keine neue Sicherheitsgrenze**: alle
Schreiboperationen im geschützten Bereich liefen schon vorher über RLS/
`is_admin()`/`has_permission()` (siehe 22.1) – daran wurde nichts
verändert. Kein Passwortfeld, kein `PROTECTED_PASSWORD`, kein
`tryUnlockProtected()` wieder eingeführt.

Bestehende Deep-Links auf den Tab (`openSettingsTo("protected",...)` aus
den Regierapport-/Ausmass-Verknüpfungen `reportEditSettingsShortcut`,
`reportSettingsShortcut`, `ausmassSettingsShortcut`) funktionieren
unverändert weiter – sie schalten die Panels direkt um, unabhängig davon,
ob der zugehörige Tab-Knopf in der Leiste sichtbar ist; für einen
Mitarbeiter landen sie weiterhin korrekt auf der Denied-Meldung.

### 28.2 „Neue Firma registrieren" vom Login-Bildschirm in den System-Admin-Bereich verschoben

**Nicht** die zuvor (fälschlich auf den falschen Bereich bezogene)
Anforderung „Registrierung nur für nicht eingeloggte Benutzer" umgesetzt –
dieser Auftrag war ausdrücklich ein Korrekturauftrag dazu und bezieht sich
auf den geschützten Einstellungsbereich (28.1) und den Registrierungs-
Einstiegspunkt (dieser Abschnitt).

- `#showCompanyRegister`-Knopf und `#companyRegisterCard`-Formular
  vollständig aus `#authScreen` (Login-Bildschirm) entfernt.
- Dieselben Formularfelder (`regCompanyName`, `regFirstName`,
  `regLastName`, `regEmail`, `regPassword`, `regPassword2`) sowie
  `companyRegisterBtn`/`cancelCompanyRegister`/`companyRegisterError`
  **eins zu eins wiederverwendet**, jetzt als neues
  `#systemAdminRegisterModal`, erreichbar über einen neuen Knopf „🏢 Neue
  Firma registrieren" (`#sysAdminOpenRegister`) direkt in der
  System-Admin-Firmenliste (`#systemAdminModal`) – bewusst keine
  zweite, parallele Formular-Implementierung.
- Die Handler dafür liegen jetzt in `js/22-system-admin.js` statt
  `js/03-login.js` (dort komplett entfernt), rufen unverändert dieselbe
  `register-company`-Edge-Function auf – **kein** zweiter
  Registrierungsflow, keine Änderung an deren Kernlogik (Auth-User/
  Firma/Slug/Trial/Admin-Profil/`app_settings`/Rollback, siehe 21.1).

**Der eine tatsächliche Verhaltensunterschied**: nach erfolgreicher
Registrierung meldet sich das Frontend jetzt **nicht mehr automatisch**
mit den neuen Zugangsdaten an (kein `sb.auth.signInWithPassword(...)`
mehr in diesem Pfad). Grund: der auslösende Benutzer ist als System-Admin
bereits eingeloggt – ein automatischer Login mit den neuen Firmendaten
hätte dessen eigene Sitzung ersetzt/ihn ausgeloggt (im Auftrag
ausdrücklich als zu vermeidendes Risiko benannt). Der neue Handler
(`$("companyRegisterBtn").onclick` in `js/22-system-admin.js`) ruft nach
Erfolg stattdessen nur `renderSystemAdminList()` und zeigt „✓ Firma …
wurde registriert (Admin: …)" in der Firmenliste – die aktuelle
Session bleibt vollständig unangetastet, weil der neue Code überhaupt
keine `sb.auth.*`-Methode mehr aufruft.

### 28.3 Serverseitige Absicherung von `register-company` (Version 3)

Vorher prüfte `register-company` den Aufrufer überhaupt nicht (jeder mit
gültigem Anon-Key – also auch ohne Login – konnte die Funktion aufrufen,
das war für den bisherigen öffentlichen Flow so gewollt). Jetzt zusätzlich
ganz am Anfang der Funktion, **bevor** irgendetwas angelegt wird:

```ts
const caller = await getCaller(req);            // /auth/v1/user mit dem
                                                  // mitgesendeten JWT
if (!caller?.id) return jsonResponse({ error: "Nicht angemeldet." }, 401);
if (!(await isSystemAdmin(caller.id)))
  return jsonResponse({ error: "Nur für System-Administratoren." }, 403);
```

`isSystemAdmin()` fragt `system_admins` direkt per `service_role`-REST ab
(gleiches Muster wie in `system-admin-delete-company`) – nicht die
RLS-beschränkte `is_system_admin()`-RPC, weil die Funktion generischer
prüfen muss („ist *dieser* Aufrufer System-Admin", nicht nur „bin ich
selbst"). Keine frei übergebene Admin-ID als Vertrauensquelle: die
Benutzer-ID kommt ausschliesslich aus dem verifizierten JWT
(`/auth/v1/user`), nie aus dem Request-Body.

Als **einziger, klar markierter Block** eingebaut (Kommentar im Code:
„ZEITLICH BEGRENZTE EINSCHRÄNKUNG … um die öffentliche Registrierung
später wieder freizugeben, GENAU DIESEN Block entfernen") – der Rest der
Funktion (Auth-User/Firma/Slug/Profil/`app_settings`/Rollback) ist
unverändert und bleibt für eine spätere Rückverlagerung auf den
Login-Bildschirm ohne weitere Anpassung wiederverwendbar, wie im Auftrag
ausdrücklich gefordert.

### 28.4 Tests

**Direkt gegen die Produktivdatenbank verifiziert** (dieselbe Abfrage, die
`register-company`s neuer `isSystemAdmin()`-Check intern ausführt):
- Max Mustermann (Firmenadmin der Testfirma, **kein** System-Admin) →
  `false` – würde von `register-company` korrekt mit 403 „Nur für
  System-Administratoren." abgelehnt.
- Mike Ledermann (eingetragener System-Admin) → `true` – würde
  `register-company` korrekt passieren lassen.
- (Dieselbe Prüfung, dasselbe REST-Muster, wurde bereits für
  `system-admin-delete-company` mehrfach erfolgreich gegen echte
  RLS-simulierte Sitzungen verifiziert, siehe 27.4 – hier nur die
  zugrunde liegende Datenlage erneut bestätigt, da ein echter
  HTTP-Aufruf der Edge Function in dieser Sitzung nicht möglich ist.)
- `companies`/`profiles` von PETER KÜNZI AG und Testfirma vor und nach
  dieser Aufgabe erneut geprüft: PETER KÜNZI AG exakt unverändert
  (`updated_at` identisch zum bisherigen Stand). Testfirmas
  `subscription_status`/`trial_days` haben sich zwischenzeitlich
  geändert (`expired`, 15 Tage) – das ist **keine** Auswirkung dieser
  Aufgabe, sondern eine reale, ausserhalb dieser Sitzung erfolgte
  Nutzung des in Version 2.17/2.18 gebauten System-Admin-Bereichs
  (Trial/Status wurden dort offensichtlich bereits echt getestet).
- `node --check` über alle `js/*.js` (inkl. `js/03-login.js` und
  `js/22-system-admin.js`) und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (594/594, vorher
  592/592 – Differenz durch das neue `#systemAdminRegisterModal` abzüglich
  des entfernten `#companyRegisterCard`).
- Jede verschobene/neue Element-ID einzeln gegen `index.html` geprüft:
  `showCompanyRegister`/`companyRegisterCard` kommen nicht mehr vor;
  `regCompanyName`/`regFirstName`/`regLastName`/`regEmail`/`regPassword`/
  `regPassword2`/`companyRegisterBtn`/`cancelCompanyRegister`/
  `companyRegisterError` weiterhin genau je einmal (verschoben, nicht
  dupliziert); `sysAdminOpenRegister`/`systemAdminRegisterModal`/
  `protectedTabBtn` neu und je genau einmal vorhanden.
- Grep-Kontrolle: keine verbliebenen JS-Referenzen auf
  `showCompanyRegister`/`companyRegisterCard`; `companyRegisterBtn`/
  `cancelCompanyRegister` sind jetzt ausschliesslich in
  `js/22-system-admin.js` gebunden (vorher `js/03-login.js`), keine
  doppelte Bindung.
- **Live-Klicktest im Browser** (Test A–E aus dem Auftrag: Mitarbeiter
  sieht den Tab nicht, Firmenadmin sieht ihn aber nicht die Registrierung,
  System-Admin sieht beides und kann erfolgreich eine Testfirma anlegen,
  ohne die eigene Sitzung zu verlieren) **war in dieser Sitzung technisch
  nicht möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt. **Das wird hier ausdrücklich
  nicht als getestet behauptet.**

### 28.5 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 28.4).
- Die künftige Rückverlagerung auf den Login-Bildschirm (falls gewünscht)
  ist bewusst auf zwei klar benannte Stellen begrenzt: den einen
  Sicherheits-Block in `register-company` (28.3) entfernen/anpassen, plus
  das Formular-Markup wieder auf den Login-Bildschirm verschieben und die
  Handler in `js/22-system-admin.js` entsprechend anpassen (automatischer
  Login müsste dann für den anonymen Fall wieder ergänzt werden) – nicht
  automatisch in dieser Aufgabe vorbereitet, da nicht verlangt.

## 29. FEHLERBEHEBUNG FIRMENLÖSCHUNG: FALSCHER RPC-HEADER + PREFLIGHT-VALIDIERUNG – VERSION 2.21

Der erste echte Löschversuch (Testfirma, über den in Version 2.19 gebauten
System-Admin-Bereich) schlug fehl: „Die Datenbank-Löschung ist
fehlgeschlagen, nachdem Storage-Dateien bereits entfernt wurden."

### 29.1 Sofortige Bestandsaufnahme (vor jeder Änderung)

Direkt gegen die Produktivdatenbank geprüft, **nichts verändert**:

- `companies`: Testfirma-Zeile **existiert weiterhin** unverändert.
- `profiles`: weiterhin 2 (Max Mustermann, Test Test).
- `projects`: weiterhin 1 ("Testprojekt").
- `app_settings`/`rates`/`materials`/`permission_overrides`/`feedback`:
  exakt wie vor dem Löschversuch.
- `storage.objects` (Bucket `measurements`): weiterhin genau die 14
  bekannten, alle PETER KÜNZI AG zuzuordnenden Objekte, keine
  unerklärlichen zusätzlichen oder fehlenden Einträge – Testfirma hatte
  zu diesem Zeitpunkt ohnehin keine eigenen Storage-Dateien (kein Logo,
  keine Foto-/Skizzenpfade auf der einen Massaufnahme), siehe 27.4.
- **Ergebnis**: Die Datenbank war zu **keinem Zeitpunkt** teilweise
  gelöscht – `system_admin_delete_company_data()` ist wie geplant atomar
  zurückgerollt (siehe 29.2, warum). Auch Storage war für Testfirma
  faktisch nicht betroffen, da nichts zu löschen vorhanden war – die
  damalige Fehlermeldung „Storage-Dateien wurden bereits entfernt" war
  in diesem konkreten Fall **irreführend formuliert** (siehe 29.4).
- PETER KÜNZI AG: vollständig unverändert (`updated_at` identisch zum
  bisherigen Stand).

### 29.2 Exakte Ursache

`system-admin-delete-company` rief die Datenbank-Funktion so auf:

```ts
const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/system_admin_delete_company_data`, {
  method: "POST",
  headers: { ...svcHeaders, "Content-Type": "application/json", Prefer: "params=single-object" },
  body: JSON.stringify({ p_company_id: companyId }),
});
```

Der Header `Prefer: params=single-object` weist PostgREST an, den
**kompletten JSON-Body als einen einzigen Parameterwert** zu
interpretieren – sinnvoll für eine Funktion mit einem `json`/`jsonb`-
Parameter. `system_admin_delete_company_data(p_company_id uuid)` hat
aber einen einzelnen **skalaren `uuid`-Parameter** (per SQL geprüft:
`proargtypes::regtype[] = {uuid}`). Mit diesem Header versuchte PostgREST,
das gesamte JSON-Objekt `{"p_company_id":"..."}` in den Typ `uuid` zu
casten – das schlägt fehl, **bevor** die Funktion überhaupt aufgerufen
wird. Deshalb war die Datenbank nie tatsächlich betroffen: der
`DELETE`-Block im Funktionskörper wurde nie erreicht.

**Behoben**: Header ersatzlos entfernt. PostgRESTs Standardverhalten
(JSON-Keys direkt auf gleichnamige benannte Parameter mappen) ist für
eine Funktion mit benannten Parametern korrekt und war schon immer die
richtige Wahl – der Header war ein Implementierungsfehler beim
ursprünglichen Bau der Edge Function, keine grundsätzliche
Architekturschwäche. Die Datenbank-Funktion selbst war die ganze Zeit
korrekt (in Version 2.19 direkt per SQL mehrfach erfolgreich gegen echte
Daten getestet, siehe 27.4) – nur der HTTP-Aufruf dorthin war falsch.

**Verifiziert**: `system_admin_delete_company_data_dryrun(...)` (siehe
29.3) direkt per SQL für Testfirma aufgerufen – läuft ohne Fehler bis zum
absichtlichen `DRYRUN_OK`-Abbruch durch, bestätigt also, dass die exakt
gleiche Löschsequenz ohne Fremdschlüsselfehler funktioniert. Die
Korrektur betraf ausschliesslich die HTTP-Aufrufkonvention, keine
SQL-Logik.

### 29.3 Neu: Preflight-Validierung

Neue Migration `system_admin_delete_company_data_dryrun`: eine zweite
`SECURITY DEFINER`-Funktion, die **exakt dieselbe** Löschsequenz wie
`system_admin_delete_company_data()` ausführt, aber **niemals committet**
– am Ende steht ein unbedingtes `raise exception 'DRYRUN_OK';`, das
Postgres die gesamte Funktion (samt aller `DELETE`s) automatisch
zurückrollen lässt. `system-admin-delete-company` ruft diese Funktion
jetzt **vor jeder Storage-Löschung** auf:

- Fehlermeldung enthält `DRYRUN_OK` → Datenbank-Teil würde ohne
  Fremdschlüssel-/Berechtigungsfehler durchlaufen, Storage-Löschung darf
  beginnen.
- jede andere Fehlermeldung → echter Fehler, der auch beim tatsächlichen
  Löschen aufgetreten wäre. Abbruch **vor** jeder Storage-Änderung, mit
  der echten Fehlermeldung im Report statt eines nichtssagenden „DB-
  Löschung fehlgeschlagen".

Damit ist der im vorherigen Löschversuch aufgetretene Zustand
(„Storage weg, DB-Löschung schlägt danach fehl") für jeden Fehler
ausgeschlossen, der sich im Preflight bereits zeigen würde – inklusive
des ursprünglichen Bugs selbst, hätte der Preflight schon vor Version
2.19 existiert. Das **Sicherheitsnetz** (kein System-Admin unter den
Firmenmitgliedern) wird zusätzlich schon **vor** dem Preflight direkt in
der Edge Function geprüft, nicht erst wenn Storage schon weg wäre.

**Grenzen des Preflight, offengelegt statt verschwiegen**: Zwischen dem
erfolgreichen Preflight-Aufruf und dem echten Löschaufruf liegt eine
kurze Zeitspanne (weitere Selects für die Storage-Pfade, die
Storage-Löschung selbst) – in dieser Zeit könnte sich der Zustand der
Datenbank theoretisch nochmals ändern (z. B. ein neuer Mitarbeiter wird
in der Firma angelegt). Das ist ein bewusst akzeptiertes, sehr kleines
Restrisiko (keine echte Transaktion über beide Aufrufe hinweg möglich,
da Storage dazwischenliegt) – deutlich kleiner als vorher, aber nicht
vollständig ausgeschlossen.

### 29.4 Fehlermeldung präzisiert

Die alte, fest formulierte Meldung „…, nachdem Storage-Dateien bereits
entfernt wurden" wurde durch eine Fallunterscheidung ersetzt: nur wenn
tatsächlich Storage-Pfade zum Löschen vorhanden waren
(`storageActuallyDeleted`), wird das auch so gemeldet; gab es keine zu
löschenden Dateien, sagt die Meldung das ebenfalls korrekt. Ausserdem:
ein fehlgeschlagenes Auth-User-Löschen gilt jetzt **nicht mehr** als
Erfolg (`auth_delete_failures` wurde vorher zusammen mit `ok:true`
zurückgegeben) – entspricht jetzt genau der Vorgabe „Erfolg nur wenn DB
**und** Auth-User **und** Storage erfolgreich".

### 29.5 Tests

- **Bestandsaufnahme der teilweise bearbeiteten Testfirma**: siehe 29.1 –
  vollständig intakt, keine Reparatur nötig.
- `system_admin_delete_company_data_dryrun(...)` direkt per SQL
  aufgerufen (als Mike Ledermann, ohne umschliessendes `ROLLBACK` nötig,
  da die Funktion sich selbst immer zurückrollt): lief bis zum
  `DRYRUN_OK`-Marker durch. Anschliessend `companies`/`profiles`/
  `projects` für Testfirma erneut gezählt: exakt unverändert (1/2/1).
- Derselbe Aufruf **ohne** Systemadmin-Kontext (kein `request.jwt.claims`
  gesetzt): korrekt mit „Nur für System-Administratoren." abgelehnt,
  ebenfalls ohne jede Datenänderung.
- Grants der neuen Funktion geprüft: `authenticated`/`service_role`/
  `postgres` haben `EXECUTE`, `anon` nicht.
- `system-admin-delete-company` erfolgreich auf Version 3 redeployt
  (vorheriger Bug behoben + Preflight-Aufruf ergänzt).
- Storage-Bestand (`storage.objects`, Bucket `measurements`) erneut
  geprüft: weiterhin genau 14 Objekte, alle einem bekannten Pfadmuster
  zuordenbar – keine verwaisten Reste von fehlgeschlagenen
  Löschversuchen.
- PETER KÜNZI AG nach Abschluss dieser Korrektur erneut geprüft:
  unverändert.
- `node --check`/`<div>`-Balance: keine Frontend-Änderung in dieser
  Runde nötig (der Fehler und die Korrektur lagen ausschliesslich in der
  Edge Function und einer neuen SQL-Funktion), trotzdem zur Sicherheit
  erneut über alle `js/*.js` und `index.html` laufen lassen: fehlerfrei/
  ausgeglichen.
- **Ein vollständiger Live-Löschtest mit einer neuen Wegwerf-Testfirma
  (wie im Auftrag als Testablauf vorgegeben) war in dieser Sitzung
  technisch nicht möglich** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co` direkt.
  **Das wird hier ausdrücklich nicht als getestet behauptet.** Die
  Korrektur ist per Code-Review (der fehlerhafte Header ist nachweislich
  entfernt, die Funktionssignatur nachweislich ein skalarer Parameter)
  und per direkter SQL-Simulation der jetzt aufgerufenen Funktionen
  verifiziert, nicht per echtem Klicktest.

### 29.6 Offene Punkte

- Kein Live-Klicktest der korrigierten Löschung möglich (siehe 29.5) –
  bei Gelegenheit mit einer neuen Wegwerf-Testfirma nachholen (Testfirma
  selbst ist weiterhin intakt und kann dafür verwendet werden, oder eine
  frische Firma über den System-Admin-Bereich registrieren).
- Die in 29.3 beschriebene kurze Zeitspanne zwischen Preflight und
  echtem Löschen bleibt ein kleines, bewusst akzeptiertes Restrisiko.
- Massaufnahme, Ausmass, Regierapport, Materialverwaltung, Mitarbeiter-
  anlage, Passwort-Erstsetzungsflow, `rates`, Trial-Verwaltung,
  geschützter Einstellungsbereich, System-Admin-Grundmodell,
  Firmenregistrierung: nicht angefasst.

## 30. FEHLERBEHEBUNG FIRMENLÖSCHUNG: PREFLIGHT LEHNTE ECHTEN SYSTEM-ADMIN AB – VERSION 2.22

Nach der Korrektur in Version 2.21 (falscher `Prefer`-Header) meldete der
echte System-Admin beim nächsten Löschversuch (Testfirma, korrekter
Firmenname eingegeben): „Prüfung vor dem Löschen fehlgeschlagen … Nur für
System-Administratoren." – obwohl der aufrufende Benutzer nachweislich in
`system_admins` eingetragen ist und der übrige System-Admin-Bereich
bereits funktioniert.

### 30.1 Exakte Ursache – direkt per SQL nachgewiesen

```sql
begin;
set local role service_role;
set local request.jwt.claims to '{"role":"service_role"}';
select auth.uid(), public.is_system_admin();
-- Ergebnis: auth.uid() = NULL, is_system_admin() = false
rollback;
```

`is_system_admin()` prüft `system_admins.user_id = auth.uid()`, und
`auth.uid()` liest `request.jwt.claim.sub` aus dem für den jeweiligen
Aufruf verwendeten JWT. Die Edge Function `system-admin-delete-company`
rief `system_admin_delete_company_data_dryrun(...)` (und danach auch
`system_admin_delete_company_data(...)`) bislang **mit dem
Service-Role-Key als Authorization-Header** auf (`svcHeaders`, dieselbe
Variable, die für die firmenübergreifenden Lese-/Storage-/Auth-Admin-
Aufrufe absichtlich verwendet wird). Ein Service-Role-JWT hat aber keinen
`sub`-Claim, der auf einen echten Benutzer zeigt – deshalb war
`auth.uid()` innerhalb dieser beiden RPC-Aufrufe immer `NULL`, und
`is_system_admin()` lieferte (korrekt gemäss seiner eigenen, unveränderten
Logik) immer `false` – unabhängig davon, wer tatsächlich aufgerufen hatte.
Zum Vergleich, mit dem echten Nutzer-JWT:

```sql
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"665e202d-...","role":"authenticated"}';
select auth.uid(), public.is_system_admin();
-- Ergebnis: auth.uid() = 665e202d-..., is_system_admin() = true
rollback;
```

**Warum das in Version 2.19/2.21 nicht auffiel**: Alle bisherigen
SQL-Tests dieser Funktionen in dieser Sitzung simulierten bewusst einen
echten Nutzer-JWT-Kontext (`role authenticated` + `sub=<User-ID>`), um
RLS/`is_system_admin()` realistisch zu prüfen – das ist exakt der Kontext,
den `sb.rpc(...)` vom Frontend aus verwendet (z. B. bei
`system_admin_set_trial`/`system_admin_set_status`, die deshalb bereits
in der echten Nutzung korrekt funktionierten, siehe 25.4/25.7). Die
Firmenlöschung ist aber die einzige Stelle, an der diese Funktionen über
eine **Edge Function mit Service-Role-Key** statt direkt vom Frontend aus
aufgerufen werden – dieser abweichende Aufrufweg wurde in den bisherigen
SQL-Simulationen nie nachgebildet, deshalb blieb der Fehler unentdeckt,
bis der echte Klicktest ihn zeigte.

### 30.2 Korrektur

In `system-admin-delete-company`: für **ausschliesslich** die beiden
`is_system_admin()`-abhängigen RPC-Aufrufe
(`system_admin_delete_company_data_dryrun`,
`system_admin_delete_company_data`) wird jetzt **der bereits vom Client
mitgesendete, über `/auth/v1/user` bereits verifizierte JWT des echten
Aufrufers** als `Authorization`-Header verwendet (`apikey` bleibt der
Service-Role-Key, das ist eine separate, unabhängige Kopfzeile) – exakt
dieselbe Kombination, die `getCaller()` in derselben Datei bereits vorher
für `/auth/v1/user` verwendet hat. Damit funktionieren jetzt tatsächlich
**zwei unabhängige Sicherheitsebenen**, wie im Auftrag gefordert:

1. Edge Function: `isSystemAdmin(caller.id)` – direkte
   `service_role`-Tabellenabfrage gegen `system_admins` mit expliziter
   `user_id`, unabhängig von `auth.uid()` (unverändert, war nie
   betroffen).
2. Innerhalb der beiden SQL-Funktionen: `is_system_admin()` – prüft jetzt
   tatsächlich denselben echten Aufrufer, weil `auth.uid()` durch das
   weitergereichte Nutzer-JWT korrekt aufgelöst wird.

**Keine Sicherheitsprüfung entfernt oder geschwächt**: `is_system_admin()`
selbst, `SECURITY DEFINER`, das Sicherheitsnetz gegen einen versehentlich
mitgelöschten System-Admin, die exakte Firmennamen-Bestätigung – alles
unverändert. Die Funktionen bleiben `SECURITY DEFINER` mit `BYPASSRLS`
(Owner `postgres`) – das verwendete JWT entscheidet nur, wie `auth.uid()`
innerhalb der Funktion aufgelöst wird, nicht die Ausführungsrechte selbst
(die weiterhin über `GRANT EXECUTE … TO authenticated` laufen). Alle
anderen Aufrufe (Firma/Profile/Projekte lesen, Storage löschen, Auth-User
löschen) bleiben bewusst beim Service-Role-Key, wie zuvor.

### 30.3 Tests

**Direkt gegen die Produktivdatenbank verifiziert** (Transaktionen mit
`ROLLBACK`, keine echte Datenänderung):
- `auth.uid()`/`is_system_admin()` unter simuliertem
  `service_role`-Kontext: `NULL`/`false` – bestätigt die Fehlerursache.
- Dieselbe Abfrage unter simuliertem echtem Nutzer-JWT (Mike Ledermann):
  `665e202d-…`/`true` – bestätigt, dass der jetzt verwendete Aufrufweg
  korrekt funktioniert.
- `system_admin_delete_company_data_dryrun(...)` mit Mike Ledermanns
  JWT-Kontext gegen Testfirma: lief bis zum `DRYRUN_OK`-Marker durch.
- `system_admin_delete_company_data_dryrun(...)` mit „Test Test"
  (Mitarbeiter der Testfirma, kein System-Admin): korrekt mit „Nur für
  System-Administratoren." abgelehnt.
- `system_admin_delete_company_data_dryrun(...)` mit Max Mustermann
  (Firmenadmin der Testfirma, kein System-Admin, siehe bereits Version
  2.19): weiterhin korrekt abgelehnt.
- **Vollständige Kettenprobe**: sowohl der Dry-Run als auch danach die
  echte Löschfunktion `system_admin_delete_company_data(...)` einzeln mit
  Mike Ledermanns JWT-Kontext gegen Testfirma aufgerufen (je eigene
  Transaktion mit `ROLLBACK`) – beide liefen erfolgreich durch
  (`deleted_profiles:2, deleted_projects:1`), exakt dieselben Zahlen wie
  in 27.4.
- Nach allen Tests erneut geprüft: Testfirma unverändert (1 Firma, 2
  Profile, 1 Projekt), PETER KÜNZI AG unverändert (`updated_at`
  identisch), Storage-Bucket weiterhin 14 Objekte.
- `system-admin-delete-company` erfolgreich auf Version 4 redeployt.
- Keine Frontend-Änderung in dieser Runde nötig (Fehler und Korrektur
  lagen ausschliesslich in der Edge Function), trotzdem sicherheitshalber
  `node --check` über alle `js/*.js` und `<div>`-Balance in `index.html`
  erneut laufen lassen: fehlerfrei/ausgeglichen.
- **Ein vollständiger Live-Löschtest über den echten Browser war in
  dieser Sitzung technisch nicht möglich** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt. **Das wird hier ausdrücklich nicht als getestet behauptet.**
  Die Korrektur ist per Code-Review und per direkter SQL-Simulation
  desselben Auth-Kontexts verifiziert, den die Edge Function jetzt real
  verwendet (nicht mehr nur eines abweichenden, zu optimistischen
  Testkontexts wie in Version 2.19/2.21).

### 30.4 Offene Punkte

- Kein Live-Klicktest möglich (siehe 30.3) – Testfirma ist weiterhin
  intakt und kann dafür verwendet werden, sobald ein Netzwerkzugriff auf
  das Supabase-Projekt zur Verfügung steht.
- Massaufnahme, Ausmass, Regierapport, Materialverwaltung,
  Mitarbeiteranlage, Passwort-Erstsetzungsflow, `rates`, Trial-
  Verwaltung, geschützter Einstellungsbereich, System-Admin-Bereich
  ausserhalb der Löschfunktion, Firmenregistrierung: nicht angefasst.

## 31. MULTI-TENANT SECURITY AUDIT — VERSION 2.23

Vollständiger Cross-Tenant-Sicherheitsaudit über das gesamte Produktivschema
(`nfgryuzkpwjfmdlmevuy`), alle RLS-Policies, alle `SECURITY DEFINER`-
Funktionen, alle Edge Functions und den Storage-Bucket. Zentrale Frage:
"Kann Firma A mit bekannten IDs oder manipulierten Requests Daten von
Firma B erreichen?" Ausschliesslich per direktem SQL gegen das echte
Produktivschema geprüft (kein Live-Browser-Test möglich, siehe wie in
allen vorherigen Sitzungen: Sandbox blockiert ausgehende HTTPS-
Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`). Testfirma war zu
Beginn dieses Audits bereits real gelöscht (echter Einsatz der in Version
2.19–2.22 gebauten Firmenlöschung ausserhalb dieser Sitzung, siehe 31.7)
– es existierte nur noch PETER KÜNZI AG. Alle destruktiven Tests liefen
deshalb entweder in `begin;…rollback;`-Transaktionen mit einer temporär
angelegten, nie committeten Wegwerf-Firma B (UUID
`99999999-9999-9999-9999-999999999999`) oder als reiner Code-Review ohne
DB-Zugriff.

### 31.1 Methodik: `polpermissive` statt nur `pg_policies`

Wichtigste methodische Erkenntnis dieses Audits: Postgres kombiniert
mehrere **permissive** Policies für denselben Befehl mit ODER, aber
**restriktive** Policies zusätzlich mit UND darüber. Die Standard-View
`pg_policies` zeigt das nicht übersichtlich an – massgeblich ist
`pg_policy.polpermissive`, direkt abgefragt:

```sql
select relname, polname, polpermissive, polcmd,
  pg_get_expr(polqual, polrelid) as qual,
  pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy join pg_class on pg_class.oid = pg_policy.polrelid
where relnamespace = 'public'::regnamespace
order by relname, polname;
```

Ergebnis: **jede** `tenant_boundary_<tabelle>`-Policy auf jeder
company_id-tragenden bzw. projekt-indirekten Tabelle
(`app_settings`, `ausmass`, `blitzschutz_materials`,
`einlaufblech_settings`, `feedback`, `materials`,
`measurement_materials`, `measurements`, `permission_overrides`,
`profiles`, `project_files`, `projects`, `rates`, `reports`) ist
**restriktiv** (`polpermissive:false`) – mit einer einzigen Ausnahme,
siehe 31.2. Dadurch sind mehrere auf den ersten Blick verdächtige,
company-agnostische permissive Policies (`app_settings_select_
authenticated` mit `qual:"true"`, `permission_overrides_select` mit
`qual:"true"`, `permission_overrides_admin` als firmenunabhängige
Admin-ALL-Policy) tatsächlich sicher: die restriktive Tenant-Boundary-
Policy verlangt zusätzlich immer `company_id = my_company_id()`, egal
was die permissiven Policies erlauben. Empirisch bestätigt (siehe
31.4): ein Testversuch, über `permission_overrides_admin` als Admin
einer fremden Firma eine `permission_overrides`-Zeile für einen
PETER-KÜNZI-AG-Mitarbeiter anzulegen, wurde korrekt mit "new row
violates row-level security policy" abgelehnt.

### 31.2 KRITISCH (behoben): `rinne_fitting_types` – vollständiger
Cross-Tenant-Lese-/Schreib-/Löschzugriff

**Tabelle**: `rinne_fitting_types` (Dilatationselement-/Fitting-Katalog
für Rinne Halbrund, siehe Abschnitt 3.3).

**Ursache**: `tenant_boundary_rinne_fitting_types` war als **einzige**
Tenant-Boundary-Policy im gesamten Schema **permissiv** statt restriktiv
angelegt (Rest aus der Nachrüstung in Version 20.6 – vermutlich beim
damaligen `CREATE POLICY` schlicht `as restrictive` vergessen). Die vier
`rinne_<x>_permission`-Policies prüfen nur `has_permission('rinne_
fitting_types', …)` – eine reine, firmenunabhängige Rollen-Berechtigung
(admin/employee), ohne jeden `company_id`-Bezug. Weil die Tenant-
Boundary-Policy hier ausnahmsweise permissiv statt restriktiv war,
kombinierte Postgres beide Policy-Gruppen mit ODER statt UND – die
Rollen-Policy allein reichte damit für vollen Zugriff, unabhängig von
`company_id`.

**Angriffsszenario / Beweis** (Firma A = PETER KÜNZI AG,
Firma B = temporäre Audit-Wegwerf-Firma, Aufrufer = ein zu Firma B
umgehängter Admin-Account, alles in `begin;…rollback;`, danach verifiziert
dass Produktivdaten unverändert sind): in **einer** Transaktion, ohne
jeden RLS-Fehler,
1. `SELECT … FROM rinne_fitting_types WHERE company_id = '<Firma A>'` –
   lieferte Firma-A-Zeilen.
2. `INSERT INTO rinne_fitting_types (…, company_id) VALUES (…, '<Firma A>')`
   – legte eine neue Zeile mit fremder `company_id` an.
3. `UPDATE rinne_fitting_types SET name='AUDIT-HACKED' WHERE id=5` (echte
   Firma-A-Zeile "Boden") – änderte sie.
4. `DELETE FROM rinne_fitting_types WHERE id=7` (echte Firma-A-Zeile
   "Schiebestutzen") – löschte sie.

Alle vier Schritte liefen ohne RLS-Fehler durch die Transaktion. Nach
`ROLLBACK` erneut geprüft: alle 7 Original-Zeilen unverändert vorhanden,
"Boden" weiterhin "Boden", keine `AUDIT-CROSS-TENANT-INSERT`-Zeile –
**kein** Produktivdatensatz wurde real verändert, aber der Angriffsweg
war eindeutig offen: jeder Firmenadmin (bzw. jeder Mitarbeiter mit
`can_view`, für den Lesezugriff reicht das) hätte den Fitting-Katalog
**jeder anderen Firma** lesen, verändern, fremde Zeilen einschleusen und
löschen können – mit trivial erratbaren fortlaufenden `bigint`-IDs.

**Auswirkung**: Vollständiger Cross-Tenant-Lese-/Schreib-/Löschzugriff auf
Referenzdaten, die direkt in die Rinne-Halbrund-Dilatationsberechnung
einfliessen (Abschnitt 3.3) – eine fremde Firma hätte die
Berechnungsgrundlage einer anderen Firma stillschweigend verfälschen oder
zerstören können.

**Fix** (Migration `fix_rinne_fitting_types_tenant_boundary_restrictive`):
Policy gedroppt und identisch, aber `as restrictive`, neu angelegt –
exakt das Muster jeder anderen Tenant-Boundary-Policy im Schema:

```sql
drop policy tenant_boundary_rinne_fitting_types on public.rinne_fitting_types;
create policy tenant_boundary_rinne_fitting_types on public.rinne_fitting_types
  as restrictive for all
  using (company_id = my_company_id())
  with check (company_id = my_company_id());
```

**Re-Test nach dem Fix** (gleicher Angriff, gleiche Firma-B-Simulation):
SELECT auf Firma-A-Zeilen liefert 0 Zeilen; INSERT mit fremder
`company_id` wird mit `42501: new row violates row-level security
policy "tenant_boundary_rinne_fitting_types"` abgelehnt; Produktivdaten
(`id=5` weiterhin "Boden", `id=7` weiterhin vorhanden, 7 Zeilen gesamt)
nach dem gesamten Testlauf erneut bestätigt unverändert. Positive
Gegenprobe: eigene Firma bleibt uneingeschränkt lesbar (strukturell
identisch zu `materials`/`rates`/`blitzschutz_materials`, die immer schon
korrekt restriktiv waren).

### 31.3 KRITISCH (behoben): Edge Function `reset-password` –
Cross-Tenant-Account-Übernahme

**Fund nur per Code-Review möglich** (Edge Functions sind keine
RLS-geprüften Tabellenzugriffe, sondern eigener Code) – genau der im
Auftrag verlangte Blick über die bereits dokumentierten Funktionen hinaus:
`list_edge_functions` zeigte zwei bisher in diesem CLAUDE.md nie
erwähnte, aktive Funktionen (`reset-password`, Version 1;
`extract-offer-positions`/`extract-profile-shape`, reine Gemini-
Bilderkennungs-Helfer ohne jeden Datenbankzugriff, siehe 31.5).

**Funktion**: `reset-password` (`supabase/functions/reset-password`),
aufgerufen von `js/07-einstellungen.js:406`
(`sb.functions.invoke("reset-password",{body:{profile_id,password}})`) –
der tatsächlich verwendete Weg für "Mitarbeiter-Passwort zurücksetzen"
im geschützten Bereich. (`smart-action` behandelt in der aktuell
deployten Version 10 nur die Mitarbeiteranlage, keinen Passwort-Reset –
frühere CLAUDE.md-Formulierungen dazu waren ungenau.)

**Ursache**: Die Funktion prüfte per `admin.auth.getUser(jwt)` korrekt
den echten Aufrufer und per `profiles.role==="admin"`, dass er
**irgendein** Firmenadmin ist – aber **nie**, ob die vom Client
mitgeschickte `profile_id` überhaupt zur selben Firma wie der Aufrufer
gehört. `admin.auth.admin.updateUserById(profile_id,{password})` läuft
mit dem Service-Role-Key, also ausserhalb jeder RLS-Prüfung.

**Angriffsszenario**: Admin von Firma B kennt (oder errät/beobachtet
irgendwo, z. B. über `created_by`-Felder in gemeinsam sichtbaren
Zusammenhängen) die `profile_id` eines Mitarbeiters oder Admins von
Firma A. Aufruf von `reset-password` mit
`{profile_id:"<Firma-A-User>", password:"beliebig12345"}` – die Funktion
prüfte nur "ist der Aufrufer irgendwo Admin", nicht "gehört das Ziel zur
selben Firma". Das Passwort von Firma A's Konto wird auf einen vom
Angreifer gewählten Wert gesetzt; der Angreifer kann sich danach direkt
als dieser Firma-A-Benutzer anmelden – **vollständige Kontoübernahme
über die Firmengrenze hinweg**, mit Zugriff auf sämtliche Daten von
Firma A, die dieses Konto sehen darf.

**Klassifikation**: KRITISCH – schwerwiegendster Fund dieses Audits
(vollständige Authentifizierungs-Umgehung in ein fremdes Konto, nicht nur
Daten-Lese-/Schreibzugriff).

**Fix** (Edge Function auf Version 2 redeployt): nach der bestehenden
Admin-Prüfung wird jetzt zusätzlich das Zielprofil geladen und sein
`company_id` exakt gegen das des Aufrufers geprüft, bevor das Passwort
gesetzt wird:

```ts
const { data: zielProfil } = await admin.from("profiles")
  .select("id, company_id").eq("id", profile_id).maybeSingle();
if (!zielProfil || zielProfil.company_id !== profil.company_id) {
  return antwort({ ok: false, error: "Dieser Benutzer gehört nicht zu Ihrer Firma." }, 403);
}
```

Kein Live-HTTP-Test möglich (Sandbox-Netzwerksperre, wie in jeder
vorherigen Sitzung) – Korrektur ausschliesslich per Code-Review
verifiziert. Bestehendes, korrektes Verhalten (eigene Firma, Mindest-
Passwortlänge, `passwort_gesetzt=false` danach) unverändert.

### 31.4 Systematische Cross-Tenant-Tests (alle in `begin;…rollback;`,
Produktivdaten danach jeweils erneut bestätigt unverändert)

| Test | Ergebnis |
|---|---|
| `permission_overrides` INSERT für fremden Mitarbeiter (über die firmenunabhängige `permission_overrides_admin`-Policy) | abgelehnt (restriktive Tenant-Boundary greift) |
| `profiles` – Mitarbeiter setzt eigenen `company_id` auf fremde Firma | RLS blockiert still (0 Zeilen geändert, `has_permission('profiles','edit')=false` für employee) |
| `profiles` – Mitarbeiter befördert sich selbst zu `role='admin'` | RLS blockiert still, gleicher Grund |
| `companies` – Fremd-Admin ändert `name`/`is_active` einer anderen Firma per bekannter UUID | RLS blockiert (`company admins can update their company` scoped auf `p.company_id=id`) |
| `system_admin_set_trial(...)` durch Nicht-System-Admin | abgelehnt, `"Nur für System-Administratoren."` |
| `measurements`/`ausmass`/`reports`/`project_files` SELECT über bekannte fremde `project_id` | je 0 sichtbare Zeilen (restriktive `tenant_boundary_*` via `EXISTS(...projects p WHERE p.company_id=my_company_id())`) |
| `rinne_fitting_types` SELECT/INSERT/UPDATE/DELETE fremder Firma | **vor Fix: alle vier erfolgreich (KRITISCH, siehe 31.2) → nach Fix: alle vier abgelehnt/leer** |

### 31.5 Storage – bestätigte, bereits dokumentierte Lücke (nicht neu,
in dieser Runde bewusst nicht behoben)

`storage.objects`-Policies (`company <read/upload/update/delete>
measurement files`) prüfen weiterhin ausschliesslich
`bucket_id='measurements' AND my_company_id() IS NOT NULL` – **keine**
tatsächliche Objekt-zu-Firma-Zuordnung. Jeder eingeloggte Mitarbeiter
irgendeiner Firma kann damit grundsätzlich jeden Pfad im Bucket lesen/
überschreiben/löschen, sofern er ihn kennt oder errät (Pfad ist kein
Geheimnis). Das ist **keine neue Erkenntnis dieses Audits** – bereits in
Abschnitt 20.5–20.7 exakt so dokumentiert und aus gutem Grund
zurückgestellt: eine korrekte Policy müsste `storage.foldername(name)`
gegen `projects.company_id` joinen, aber ältere, vor der
Pfadumstellung gespeicherte Dateien (Firmenlogo, Ausmass-Fotos, u. a.)
liegen unter flachen Pfaden ganz ohne Projekt-/Firmenbezug und würden
von einer strengen Pfad-Policy fälschlich mit ausgesperrt. Klassifikation
in diesem Audit: **HOCH** (bestätigter Cross-Tenant-Dateizugriff über
erratene/bekannte Pfade), aber bewusst nicht in dieser Runde behoben –
eine echte Lösung braucht eine dedizierte, sorgfältig getestete
Migration inkl. Altlasten-Pfaden, kein "smallest safe fix" innerhalb
dieses Audits. Bleibt offen für eine eigene Aufgabe.

### 31.6 Edge Functions – Gesamtbild

- **`smart-action`** (v10, Mitarbeiteranlage): `company_id` kommt
  ausschliesslich aus dem echten, per `/auth/v1/user` verifizierten
  Aufrufer-Profil, nie vom Client – korrekt, keine Änderung nötig.
- **`register-company`** (v3) und **`system-admin-delete-company`** (v4):
  bereits in Version 2.20–2.22 auf genau das im Auftrag benannte Muster
  geprüft und korrigiert (Service-Role-JWT hat keinen `sub`-Claim,
  `auth.uid()` wäre `NULL` – beide rufen ihre `is_system_admin()`-
  abhängigen Pfade seither mit dem echten, weitergereichten Aufrufer-JWT
  auf). Code erneut vollständig gelesen: keine Regression, unverändert
  korrekt.
- **`reset-password`** (v1→v2): KRITISCH, siehe 31.3, behoben.
- **`extract-offer-positions`**, **`extract-profile-shape`**: reine
  Bild-zu-JSON-Funktionen (Gemini-Vision, gemeinsamer Server-API-Key),
  greifen auf **keine** Tabelle zu, kein `company_id`, kein Profil-Bezug
  – kein Multi-Tenant-Risiko, daher **kein Fehler** im Sinne dieses
  Audits. (Nebenbefund ausserhalb des Auftragsumfangs:
  `extract-offer-positions` lädt serverseitig eine vom Client
  übergebene beliebige `http(s)://`-Bild-URL nach – ein generisches
  SSRF-Muster, aber kein Cross-Tenant-Datenzugriff und explizit nicht
  Gegenstand dieses Audits; nicht verändert.)

### 31.7 Anmerkung: Testfirma real gelöscht

Zu Beginn dieses Audits existierte nur noch **eine** Firma
(PETER KÜNZI AG) in der Produktivdatenbank – Testfirma war nicht mehr
vorhanden. Das ist die reale, ausserhalb dieser Sitzung erfolgte Nutzung
der in Version 2.19–2.22 gebauten und in Version 2.22 endgültig
korrigierten Firmenlöschung (vorher schon an den sich ändernden
Testfirma-Werten in Version 2.20 vermutet). Alle Cross-Tenant-Tests
dieses Audits liefen deshalb gegen eine innerhalb einer
`begin;…rollback;`-Transaktion neu angelegte, temporäre Wegwerf-Firma
(nie committet) statt gegen eine echte zweite Firma – inhaltlich
gleichwertig, da RLS keinen Unterschied zwischen "Testfirma" und einer
frisch angelegten Firma macht.

### 31.8 Klassifikation der Funde

- **KRITISCH**: `rinne_fitting_types` Cross-Tenant CRUD (31.2, behoben);
  Edge Function `reset-password` Cross-Tenant-Passwort-Reset /
  Kontoübernahme (31.3, behoben).
- **HOCH**: Storage-Bucket ohne echte Objekt-Firmen-Zuordnung (31.5,
  bereits bekannt, bewusst nicht in dieser Runde behoben).
- **KEIN FEHLER**: alle System-Admin-Funktionen (bewusst global, korrekt
  gegen `is_system_admin()` abgesichert); `permission_settings` ohne
  `company_id` (bewusst geteilte Rollen-Standardwerte, siehe 20.8);
  company-agnostische, aber durch restriktive Tenant-Boundary-Policies
  neutralisierte permissive Policies auf `app_settings`/
  `permission_overrides` (siehe 31.1); `extract-offer-positions`/
  `extract-profile-shape` (kein Tabellenzugriff).

### 31.9 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (594/594 – in dieser Runde wurde nur der Versionstext geändert, keine
  Struktur).
- Produktivdaten nach jedem einzelnen Transaktionstest UND nach
  Abschluss des gesamten Audits erneut per SQL gezählt: 1 Firma, 12
  Profile, 4 Projekte, 13 Massaufnahmen, 7 `rinne_fitting_types`-Zeilen,
  11 `rates`, 371 `materials`, 1 `system_admins`-Eintrag – exakt wie vor
  Beginn dieser Aufgabe, keine Abweichung.
- Kein Frontend-Code (`js/*.js`, `index.html`-Struktur) in dieser Runde
  verändert – nur der Versionstext in `index.html`/`sw.js` sowie eine
  DB-Policy und eine Edge Function. Massaufnahme, Ausmass, Regierapport,
  Materialverwaltung, Login, Firmenregistrierung, System-Admin-Bereich,
  Passwort-Erstsetzungsflow, Trial-/Statusverwaltung, Firmenlöschung:
  keine Codeänderung, daher kein eigenständiger Funktionstest dieser
  Bereiche in dieser Runde nötig – ihre RLS-Grundlage wurde aber als Teil
  des systematischen `polpermissive`-Audits (31.1) mitgeprüft und für
  sicher befunden.
- Live-Klicktest im Browser weiterhin nicht möglich (Sandbox-
  Netzwerksperre zu `nfgryuzkpwjfmdlmevuy.supabase.co`) – wie in jeder
  vorherigen Sitzung ausdrücklich nicht als getestet behauptet.

### 31.10 Offene Punkte

- Storage-RLS auf echte Objekt-Firmen-Zuordnung umstellen (31.5) – eigene,
  sorgfältig zu planende Aufgabe wegen der Altlasten-Pfade ohne
  Projekt-/Firmenbezug.
- SSRF-Nebenbefund in `extract-offer-positions` (31.6) – ausserhalb des
  Auftragsumfangs, nicht behoben, für eine spätere, eigene
  Sicherheitsrunde vormerken.
- Kein Live-Klicktest der beiden Fixes im Browser möglich (siehe 31.9).
- `permission_settings`/`permission_overrides`-Modell, System-Admin-
  Grundlogik, Firmenlöschung, Trial-/Statusverwaltung: erneut prüfend
  gelesen, keine neuen Probleme gefunden, nicht verändert.

## 32. STORAGE CROSS-TENANT SECURITY FIX — VERSION 2.24

Schliesst die in Abschnitt 31.5 als HOCH eingestufte, bewusst
zurückgestellte Storage-Lücke: die vier `storage.objects`-Policies
prüften bisher nur `bucket_id='measurements' AND my_company_id() IS NOT
NULL` – jedes eingeloggte Mitglied irgendeiner Firma konnte damit jeden
Dateipfad im gemeinsamen, privaten Bucket lesen, hochladen, überschreiben
und löschen, sofern der Pfad bekannt war oder erraten wurde.

### 32.1 Bestandsaufnahme (vor jeder Änderung, gegen das echte Schema)

Der Bucket `measurements` enthielt zum Zeitpunkt dieser Aufgabe genau
**14 Objekte** (kein zweiter Bucket vorhanden). Klassifiziert nach
tatsächlichem Pfadmuster:

- **5 Objekte, projektbezogen** (`project-files/<projectId>/…`) – trägt
  die Firmenzugehörigkeit bereits fest im Pfad selbst.
- **9 Objekte, flach/ohne Projekt- oder Firmenbezug im Pfad**
  (`company-logo/…` ×6, `photo/…` ×2, `sketch/…` ×4 – letztere mit dem
  bisher nirgends dokumentierten Namen `sketch/`, nicht `sketches/`).

Alle 8 tatsächlich noch **referenzierten** Storage-Werte im gesamten
Schema (`app_settings.logo_url`, `measurements.photo_path`/
`sketch_path`/`sketch_paths`, `ausmass.photo_path`/`photo_paths`,
`project_files.file_path`) wurden einzeln normalisiert (alte volle
"öffentliche" URLs → reiner Pfad, wie `measStoragePathFromValue()`) und
gegen die 14 echten Objekte abgeglichen. Ergebnis: **nur 5 der 14
Objekte werden überhaupt noch von irgendeiner DB-Zeile referenziert**
(1 Firmenlogo, 1 Ausmass-Foto, 2 Skizzen, 1 Projektdatei) – alle fünf
eindeutig PETER KÜNZI AG zuzuordnen, da aktuell nur diese eine Firma
existiert. Die übrigen **9 Objekte sind bereits jetzt vollständig
verwaist** (keine einzige DB-Zeile zeigt noch darauf) – u. a. 5 ältere,
seither ersetzte Firmenlogos (das Einstellungen-Formular lädt beim
Logo-Wechsel ein neues Bild hoch und biegt `app_settings.logo_url` um,
löscht das alte Blob aber bewusst nie, siehe `js/07-einstellungen.js`)
sowie 2 alte Fotos und 2 alte Skizzen aus der Zeit vor der
Pfad-Umstellung in Version 20.6.

**Wichtige Einschränkung, ehrlich offengelegt**: Für diese 9 verwaisten
Objekte ist die Firmenzugehörigkeit **nicht mehr eindeutig nachweisbar**
– sie könnten von PETER KÜNZI AG selbst stammen (mehrfacher Logo-Wechsel)
oder Reste der im August 2026 real gelöschten Testfirma sein (deren
Firmenlöschung, Abschnitt 27, räumt nur Storage-Pfade weg, die zum
Löschzeitpunkt noch in einer DB-Zeile referenziert waren – ein bereits
vorher verwaistes altes Logo/Foto wäre auch dabei übersehen worden).
Gemäss Auftrag ("Keine Datei einer Firma zuordnen, wenn das nicht
eindeutig nachweisbar ist") wurden sie **keiner Firma zugeordnet**.

### 32.2 Warum keine physische Pfad-Migration (`companies/<companyId>/…`)

Eine echte Migration bestehender Dateien auf ein neues Pfadschema
erfordert einen tatsächlichen Kopiervorgang über die Storage-**API**
(reines SQL kann nur die Metadatenzeile in `storage.objects` verschieben,
nicht die eigentlichen Datei-Bytes im dahinterliegenden Objektspeicher –
ein blosses `UPDATE storage.objects SET name=…` würde eine Metadatenzeile
ohne passende Datei erzeugen und jede `createSignedUrl()` würde ins Leere
laufen). Die Sandbox dieser Sitzung blockiert weiterhin jede ausgehende
HTTPS-Verbindung zu `nfgryuzkpwjfmdlmevuy.supabase.co` direkt (wie in
jeder vorherigen Sitzung dokumentiert) – die Storage-API war damit nicht
erreichbar, eine physische Migration technisch nicht durchführbar.

Der Auftrag selbst sieht das als möglichen, aber nicht zwingenden Weg vor
("*Falls* alte Dateien migriert werden müssen") und nennt als
gleichwertige Alternative ausdrücklich "sicher isolieren". Genau das
leistet der unten beschriebene Fix **ohne jede Migration**: die
Firmenzugehörigkeit wird nicht mehr aus dem Pfad geraten, sondern bei
jedem Zugriff aus den tatsächlich vorhandenen DB-Referenzen der
aufrufenden Firma live bestimmt – das ist robuster als eine einmalige
Migration (funktioniert unabhängig vom jeweiligen Pfadschema, alt wie
neu) und verändert keine einzige Datei oder deren Pfad.

### 32.3 Neue Policy-Architektur

Migration `storage_tenant_boundary_v2_24`. Drei neue Funktionen, alle
`SET search_path` implizit über `public`-Schema-Qualifizierung, `EXECUTE`
nur an `authenticated` (nicht `anon`, ausser der reinen Pfad-Normalisierung
ohne Tabellenzugriff):

- **`storage_path_from_value(v text)`** – reine Normalisierung (alte
  volle URL → Pfad), 1:1-SQL-Äquivalent von `measStoragePathFromValue()`
  (Frontend) bzw. `storagePathFromValue()` (Edge Function
  `system-admin-delete-company`).
- **`storage_object_is_own_company(object_name text)`** – für
  SELECT/UPDATE/DELETE: gehört dieses Objekt zur Firma des Aufrufers?
  - Projektbezogene Pfade (`measurements/<projectId>/…`,
    `project-files/<projectId>/…`): rein über den im Pfad **fest
    eingebetteten** `projectId` gegen `projects.company_id` geprüft –
    bleibt korrekt, auch wenn die aktuelle DB-Zeile inzwischen auf ein
    anderes Objekt zeigt (z. B. nach dem Ersetzen einer Projektdatei
    bleibt die *alte* Datei über ihren eigenen, unveränderlichen Pfad
    weiterhin durch die ursprünglich hochladende Firma löschbar).
  - Alte, flache Pfade: nur über eine **tatsächlich vorhandene**
    Referenz der eigenen Firma (`app_settings.logo_url`,
    `measurements.photo_path`/`sketch_path`/`sketch_paths`,
    `ausmass.photo_path`/`photo_paths`, normalisiert). Kein Treffer →
    kein Zugriff, für **niemanden** – das isoliert die 9 verwaisten
    Objekte automatisch, ohne sie zu verschieben oder zu löschen.
- **`storage_object_insert_allowed(object_name text)`** – für INSERT
  (und den `with_check`-Teil von UPDATE): beim allerersten Hochladen
  existiert per Definition noch **keine** DB-Zeile, die auf das neue
  Objekt zeigt (der App-Ablauf lädt immer zuerst hoch, verknüpft danach
  – siehe `uploadMeasurementImage()`/`uploadProjectFile()` in
  `js/10-massaufnahme.js`/`js/09-projekte.js`). Projektbezogene Pfade
  bleiben strikt pfadbasiert geprüft (der `projectId` existiert zu
  diesem Zeitpunkt bereits real). Für Firmenlogo/Ausmass-Foto (noch nicht
  projektbezogen) reicht "gehört überhaupt einer Firma an" – die
  eigentliche Firmenzuordnung entsteht erst beim anschliessenden
  Verknüpfen mit `app_settings`/`ausmass`, dort greift deren eigene,
  bereits firmengetrennte, restriktive Tenant-Boundary-Policy
  (`tenant_boundary_app_settings`/`tenant_boundary_ausmass`, siehe
  Abschnitt 31.1) – ein Mitarbeiter von Firma B könnte durch das Hochladen
  allein bestenfalls ein für ihn selbst nutzloses, weil nirgends
  verknüpfbares Objekt erzeugen, niemals eine fremde Firmenzeile
  überschreiben.

Alte, zu weite Policies (`company read/upload/update/delete measurement
files`) gedroppt, vier neue (`tenant read/upload/update/delete own
storage files`) ersetzen sie 1:1 nach Befehl.

**Keine einzige Datei wurde verschoben, umbenannt oder gelöscht.** Alle
bestehenden Frontend-Aufrufstellen (`storageSignedUrl()`,
`uploadMeasurementImage()`, `uploadProjectFile()`,
`replaceProjectFile()`, `sb.storage.from("measurements").remove(...)` in
`js/09-projekte.js`/`js/10-massaufnahme.js`) funktionieren unverändert
weiter, da sich an den tatsächlichen Pfaden nichts ändert – **kein
Frontend-Code wurde für diese Aufgabe angepasst.**

### 32.4 Cross-Tenant-Test (Firma A = PETER KÜNZI AG, Firma B =
temporäre Audit-Wegwerf-Firma, wie in Abschnitt 31 – Testfirma war zu
Beginn bereits real gelöscht)

Alle Tests in `begin;…rollback;`, Produktivdaten davor/danach identisch
verifiziert (14 Objekte, 1 Firma, keine Test-Reste).

| Test | Vorher (bis v2.23) | Nachher (v2.24) |
|---|---|---|
| Firma B: `SELECT * FROM storage.objects` (alle 14 Objekte) | alle 14 sichtbar | **0 sichtbar** |
| Firma B: SELECT eines bekannten, referenzierten Firma-A-Pfads (`company-logo/…`) | sichtbar | **0 sichtbar** |
| Firma B: SELECT eines bekannten, projektbezogenen Firma-A-Pfads (`project-files/4/…`) | sichtbar | **0 sichtbar** |
| Firma B: INSERT unter Firma A's bekanntem `project-files/4/…`-Pfad (IDOR, bekannte fremde `projectId`) | erfolgreich | **abgelehnt** (`42501: new row violates row-level security policy`) |
| Firma A (eigene, unveränderte Firma): SELECT der 5 tatsächlich referenzierten eigenen Objekte | sichtbar | **weiterhin sichtbar** (alle 5: Logo, Ausmass-Foto, 2 Skizzen, 1 Projektdatei) |
| Firma A: SELECT dreier verwaister Objekte (auch wenn ursprünglich von ihr selbst) | sichtbar | **0 sichtbar** (bewusst isoliert, siehe 32.1) |
| Firma A: INSERT unter eigenem, projektbezogenem Pfad (`project-files/4/…`) | erfolgreich | **weiterhin erfolgreich** |
| Firma A: INSERT unter `company-logo/…` (Firmenlogo neu hochladen) | erfolgreich | **weiterhin erfolgreich** |

DELETE liess sich nicht per rohem SQL testen – `storage.objects` hat
einen eingebauten Schutz-Trigger (`protect_objects_delete`, ruft
`storage.protect_delete()`), der **jedes** direkte SQL-`DELETE` auf
dieser Tabelle kategorisch verweigert ("Direct deletion from storage
tables is not allowed. Use the Storage API instead."), unabhängig von
RLS – Löschungen müssen zwingend über die Storage-API laufen (die dort
intern dieselbe `USING`-Klausel wie SELECT auswertet). Da die
DELETE-Policy exakt dieselbe Prüffunktion (`storage_object_is_own_company`)
wie die bereits erfolgreich getestete SELECT-Policy verwendet, ist das
Verhalten durch die SELECT-Tests bereits mit abgedeckt – ein zusätzlicher
Live-API-Test war wie gehabt wegen der Sandbox-Netzwerksperre nicht
möglich.

### 32.5 Signed URLs

Abschnitt 5 des Auftrags ("Vor `createSignedUrl` muss die Datei zur
eigenen Firma gehören") ist **automatisch** durch die neue SELECT-Policy
erfüllt: `createSignedUrl()` prüft intern dieselbe RLS-SELECT-Policy auf
`storage.objects`, bevor überhaupt eine signierte URL erzeugt wird – ohne
sichtbare Objektzeile keine signierte URL. Keine gesonderte Änderung an
`storageSignedUrl()` (`js/10-massaufnahme.js`) nötig. Erneut per Grep
bestätigt: kein `getPublicUrl()` mehr irgendwo im Code (bereits seit
Version 2.14 vollständig durch `storageSignedUrl()` ersetzt, siehe
Abschnitt 20.5/20.6).

### 32.6 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (594/594 – nur der Versionstext geändert).
- Produktivdaten vor/nach jedem Test und nach Abschluss erneut geprüft:
  1 Firma, 14 Storage-Objekte, keine Test-Reste (`AUDIT%`-Namen: 0
  Treffer) – exakt wie vor Beginn dieser Aufgabe.
- **Kein Frontend-Code verändert** (siehe 32.3) – Massaufnahme (alle neun
  Funktionen inkl. Foto/Skizze), Ausmass, Regierapport,
  Materialverwaltung, Excel-Import, Login, Mitarbeiteranlage,
  Passwort-Erstsetzung, Trial-Verwaltung, System-Admin ausserhalb der
  Storage-Policy, Firmenregistrierung: keine Codeänderung, daher kein
  eigenständiger Funktionstest dieser Bereiche nötig.
- **Firmenlöschung** (`system-admin-delete-company`): verwendet für ihre
  Storage-Löschung durchgehend den Service-Role-Key (`svcHeaders`), der
  RLS grundsätzlich umgeht (`BYPASSRLS`) – von den neuen, nur für
  `authenticated` geltenden Policies **nicht betroffen**, keine Änderung
  nötig oder vorgenommen. Code erneut gelesen, keine Regression.
- Live-Klicktest im Browser (Logo hochladen, Foto/Skizze in einer
  Massaufnahme speichern und wieder öffnen, Projektdatei hochladen/
  öffnen/ersetzen/löschen) weiterhin nicht möglich – Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt. **Das wird hier ausdrücklich nicht als getestet behauptet.**
  Alle oben dokumentierten Tests liefen als direkte RLS-Simulation gegen
  das echte Produktivschema (derselbe Mechanismus, den PostgREST/Storage-
  API im Hintergrund ebenfalls verwenden), kein Ersatz für einen echten
  Klicktest.

### 32.7 Verbleibende Risiken / offene Punkte

- **9 verwaiste Storage-Objekte bleiben unangetastet in der Datenbank
  liegen**, für niemanden mehr regulär erreichbar (siehe 32.1/32.3) –
  bewusst nicht gelöscht (keine stillen Datenverluste) und bewusst
  keiner Firma zugeordnet (nicht eindeutig nachweisbar). Eine spätere,
  eigene Aufgabe könnte sie einem System-Admin sichtbar machen (z. B.
  eine neue, eng gefasste `SECURITY DEFINER`-Funktion nach dem Muster
  von `system_admin_company_user_counts()`) und eine informierte
  Entscheidung (löschen/manuell zuordnen) ermöglichen – für diese Aufgabe
  ausserhalb des Auftragsumfangs ("System-Admin außerhalb notwendiger
  Storage-Anpassungen" nicht verändern).
- **Keine physische Pfad-Migration durchgeführt** (siehe 32.2) – bewusste
  Entscheidung, kein technisches Versäumnis: die Storage-API war nicht
  erreichbar, und die gewählte Referenz-basierte Lösung ist der
  Migration in Robustheit mindestens gleichwertig (funktioniert für jedes
  Pfadschema, alt wie neu, ohne jedes Migrationsrisiko).
- Kein Live-Klicktest im Browser möglich (siehe 32.6).
- Bei zukünftigen neuen Speicherorten (weitere Kategorien ausserhalb von
  `measurements/`, `project-files/`, `company-logo/`, `ausmass-photo/`,
  `photo/`, `sketch/`) muss `storage_object_is_own_company()`/
  `storage_object_insert_allowed()` entsprechend erweitert werden – sonst
  werden neue flache Kategorien standardmässig wie jede andere
  unbekannte/verwaiste Datei behandelt (kein Zugriff für niemanden, bis
  eine erste Referenz existiert – sicher, aber ggf. zunächst
  unbeabsichtigt restriktiv für eine neue Funktion).

## 33. FINALER SECURITY-AUDIT — VERSION 2.25

Zweiter, gezielter Security-Durchgang nach v2.23 (Multi-Tenant-Audit) und
v2.24 (Storage-Fix). Fokus laut Auftrag: Berechtigungen, alle Edge
Functions, Mitarbeiter, Passwortfunktionen, Firmenregistrierung,
System-Admin, Firmenlöschung, IDOR. Ausschliesslich per direktem SQL
gegen das echte Produktivschema geprüft (Sandbox blockiert weiterhin
jede ausgehende HTTPS-Verbindung zu `nfgryuzkpwjfmdlmevuy.supabase.co`
direkt – kein Live-Browser-/HTTP-Test möglich, wie in jeder vorherigen
Sitzung). Alle destruktiven Tests liefen in `begin;…rollback;` mit einer
temporären Wegwerf-Firma B (`99999999-9999-9999-9999-999999999999`) oder
als reiner Code-Review.

### 33.1 Vollständiger Re-Audit aller RLS-Policies (`polpermissive`)

Erneut die komplette `pg_policy`-Tabelle für `public` **und** `storage`
ausgelesen (nicht nur `public` wie in 31.1 – der Auftrag verlangt
ausdrücklich "nach dem v2.23-Fund bei `rinne_fitting_types` besonders
nach weiteren permissiven Tenant-Policies suchen"). Ergebnis: **keine
weitere permissive Tenant-Boundary-Policy gefunden.** Jede
`tenant_boundary_<tabelle>`-Policy auf allen elf `company_id`-tragenden
Tabellen (`app_settings`, `blitzschutz_materials`,
`einlaufblech_settings`, `feedback`, `materials`,
`measurement_materials`, `permission_overrides`, `profiles`, `projects`,
`rates`, `rinne_fitting_types`) ist weiterhin korrekt **restriktiv**
(`polpermissive:false`) – der v2.23-Fix an `rinne_fitting_types` ist
weiterhin aktiv, keine Regression. Die vier neuen Storage-Policies aus
v2.24 (`tenant read/upload/update/delete own storage files`) sind
strukturell absichtlich permissiv, aber durch die aufrufenden Funktionen
(`storage_object_is_own_company()`/`storage_object_insert_allowed()`)
selbst bereits vollständig firmengetrennt – kein Policy-Kombinationsrisiko,
da es pro Befehl nur je eine einzige Policy gibt.

### 33.2 Neuer Fund (NIEDRIG, behoben): unnötiger `anon`/`PUBLIC`-Grant auf
Trigger-Funktion

Bereits in Abschnitt 20.8 als bekannter, nicht aufgeräumter Punkt
dokumentiert: `enforce_permission_override_company()` hatte `EXECUTE`
für `anon` **und** `PUBLIC` (Supabase vergibt das bei neuen Funktionen
automatisch, wenn nicht explizit entzogen). Geprüft, ob das tatsächlich
ausnutzbar ist: die Funktion ist eine reine Trigger-Funktion (0
Parameter, referenziert `NEW`/`new.company_id` direkt im Funktionskörper)
– ein direkter RPC-Aufruf ausserhalb eines Trigger-Kontexts schlägt bei
Postgres **immer** mit einem eigenen Fehler fehl ("trigger functions can
only be called as triggers"), unabhängig von Grants. **Kein
ausnutzbares Risiko**, aber als kleinste sichere Korrektur trotzdem
aufgeräumt (Migration `revoke_unnecessary_trigger_function_grants_v2_25`):
`EXECUTE` für `anon` und `PUBLIC` entzogen, `authenticated` (für den
echten Trigger-Betrieb nicht einmal nötig, aber unverändert gelassen, um
keine bestehende Berechtigung ohne Not zu ändern) bleibt unangetastet.
Keine Verhaltensänderung für den bestehenden `BEFORE INSERT/UPDATE`-
Trigger auf `permission_overrides`.

### 33.3 Edge Functions – erneute vollständige Prüfung

`list_edge_functions` erneut abgefragt: weiterhin genau sechs Funktionen,
keine neue seit v2.23/2.24 (`smart-action` v10, `extract-offer-positions`
v10, `extract-profile-shape` v3, `reset-password` v2, `register-company`
v3, `system-admin-delete-company` v4). Vollständiger Quellcode von
`reset-password` und `register-company` erneut gelesen (nicht nur aus
altem Report übernommen):

- **`reset-password`** (v2, seit v2.23 unverändert): echter Aufrufer via
  `admin.auth.getUser(jwt)` (nicht `service_role`-JWT), Admin-Prüfung,
  **und** der in v2.23 ergänzte Firmenvergleich (`zielProfil.company_id
  !== profil.company_id` → 403) sind weiterhin vorhanden – keine
  Regression.
- **`register-company`** (v3, seit v2.20 unverändert): `isSystemAdmin(
  caller.id)` prüft direkt per `service_role`-REST-Abfrage gegen
  `system_admins` (nicht die RLS-beschränkte `is_system_admin()`-RPC) –
  weiterhin korrekt. `company_id` für Firma/Profil/`app_settings` kommt
  ausschliesslich aus serverseitig frisch angelegten Zeilen, nie vom
  Client (`RegisterBody` enthält gar kein `company_id`-Feld).
- **`smart-action`** (v10, seit v2.20 unverändert): `CreateEmployeeBody`
  enthält strukturell **nur** `first_name`/`last_name` – kein
  `company_id`-Feld existiert im akzeptierten Request überhaupt, ein
  Firmenadmin kann also gar nicht versuchen, eines mitzuschicken.
  `company_id` kommt ausschliesslich aus `getCallerProfile(caller.id)`
  (echter, per `/auth/v1/user` verifizierter Aufrufer).
- **`system-admin-delete-company`** (v4, seit v2.22 unverändert): echtes
  Nutzer-JWT für die beiden `is_system_admin()`-abhängigen RPC-Aufrufe
  (Bugfix aus v2.22), `service_role` nur für firmenübergreifende
  Lese-/Storage-/Auth-Admin-Operationen – unverändert korrekt.
- **`extract-offer-positions`**/**`extract-profile-shape`**: weiterhin
  keinerlei Tabellenzugriff, kein `company_id`-Bezug – kein
  Multi-Tenant-Risiko.

### 33.4 System-Admin-Funktionen – frisch empirisch getestet

Als **Nicht-System-Admin** (Phillipp Wegmueller, `db6d1224-…`, normaler
Mitarbeiter von PETER KÜNZI AG) in einer Transaktion alle fünf
sicherheitsrelevanten Funktionen aufgerufen:

| Funktion | Ergebnis |
|---|---|
| `system_admin_set_trial(<eigene Firma>, 999, …)` | abgelehnt: „Nur für System-Administratoren." |
| `system_admin_set_status(<eigene Firma>, 'active')` | abgelehnt, gleicher Grund |
| `system_admin_company_user_counts()` | abgelehnt, gleicher Grund |
| `system_admin_delete_company_data_dryrun(<eigene Firma>)` | abgelehnt, gleicher Grund |
| `system_admin_delete_company_data(<eigene Firma>)` | abgelehnt, gleicher Grund |
| `is_system_admin()` | `false` |

Als **echter System-Admin** (Mike Ledermann) erneut bestätigt:
`is_system_admin()` liefert `true` (identisch zu den bereits in 25.4
dokumentierten Tests – keine Regression).

**System-Admin-Schutz bei der Firmenlöschung** (Auftragspunkt 13,
konkret getestet statt nur angenommen): Mike Ledermann selbst hat
versucht, **seine eigene Firma** (PETER KÜNZI AG, die ihn selbst als
System-Admin enthält) über `system_admin_delete_company_data_dryrun(...)`
zu löschen – korrekt abgelehnt: „Abbruch: Ein Mitglied dieser Firma ist
als System-Administrator eingetragen." Per Code-Lesung bestätigt: dieser
Schutz sitzt **direkt in der SQL-Funktion selbst** (nicht nur in der
aufrufenden Edge Function) – zwei unabhängige Schutzebenen, wie im
Auftrag gefordert.

### 33.5 Company_id-Injection – systematisch für alle elf Tabellen

Alle Tabellen mit `company_id`-Spalte (per `information_schema.columns`
frisch ermittelt, nicht aus alter Doku übernommen: `app_settings`,
`blitzschutz_materials`, `einlaufblech_settings`, `feedback`,
`materials`, `measurement_materials`, `permission_overrides`, `profiles`,
`projects`, `rates`, `rinne_fitting_types`) einzeln mit einem INSERT
getestet, das explizit `company_id = <PETER KÜNZI AG>` setzt, während der
Aufrufer (Mike Ledermann) temporär einer Wegwerf-Firma B zugeordnet war.
**Alle elf** wurden von der jeweiligen restriktiven
`tenant_boundary_*`-Policy korrekt abgelehnt (`42501: new row violates
row-level security policy`) – kein einziges `DEFAULT
my_company_id()` wurde als alleinige Sicherheit vertraut, `WITH CHECK`
tatsächlich geprüft, wie im Auftrag gefordert.

### 33.6 IDOR mit bekannten fremden IDs – UPDATE/DELETE

Ergänzend zu den bereits in v2.23 getesteten SELECT-IDOR-Fällen (siehe
31.4) diesmal gezielt UPDATE/DELETE mit **bekannten, echten IDs**
PETER-KÜNZI-AG-eigener Zeilen, wieder aus der Sicht der temporär
umgehängten Wegwerf-Firma B:

| Tabelle | Operation | Bekannte ID | Ergebnis |
|---|---|---|---|
| `materials` | UPDATE | `id=2` | 0 Zeilen geändert (RLS blockiert still) |
| `rates` | UPDATE | `id=1` | 0 Zeilen geändert |
| `measurements` | UPDATE | `id=12` | 0 Zeilen geändert |
| `ausmass` | DELETE | `id=1` | 0 Zeilen gelöscht |
| `reports` | DELETE | `id=5` | 0 Zeilen gelöscht |
| `project_files` | DELETE | `id=1` | 0 Zeilen gelöscht |
| `app_settings` | UPDATE | `id=1` | 0 Zeilen geändert |
| `profiles` | INSERT (neues Profil mit fremder `company_id`) | – | abgelehnt (RLS-Fehler) |

Nach Abschluss aller Tests per SQL erneut bestätigt: `materials.id=2`
weiterhin „Stahlblech svz / evz / dek", `rates.id=1` weiterhin
„Meister" – keine echte Änderung, alle Tests liefen entweder in
`rollback;` oder wurden von RLS mit 0 betroffenen Zeilen abgewiesen.

### 33.7 Profile Escalation – erneut bestätigt

Mitarbeiter (Phillipp Wegmueller) hat innerhalb einer Transaktion
versucht, sein eigenes Profil auf `company_id = <Wegwerf-Firma B>` zu
ändern **und** `role='admin'` zu setzen – beides blockiert (0 Zeilen
geändert, `has_permission('profiles','edit')=false` für `role=employee`
laut `permission_settings`). Nach `reset role`/Rollback direkt gegen die
echten Daten geprüft: Profil weiterhin `company_id=<PETER KÜNZI AG>`,
`role='employee'` – exakt wie in Abschnitt 24 bereits für das
strukturell identische `passwort_gesetzt`-Feld dokumentiert, hier erneut
für `company_id`/`role` bestätigt.

### 33.8 Testmatrix

| Bereich | Mitarbeiter A→A | Mitarbeiter A→B | Admin A→A | Admin A→B | System-Admin |
|---|---|---|---|---|---|
| Profiles | eigenes/laut Scope sichtbar | blockiert | volle Verwaltung eigener Firma | blockiert (33.6) | kein direkter Zugriff |
| Companies | eigene Firma sichtbar | blockiert | Name/Adresse eigener Firma änderbar | blockiert (31.4) | global via `system_admin_*` |
| Projects | laut Permission-Scope | blockiert (33.5 Injection) | voll | blockiert | kein direkter Zugriff |
| Measurements | laut Scope | blockiert (31.4 SELECT, 33.6 UPDATE) | voll | blockiert | kein direkter Zugriff |
| Measurement Materials | laut Permission | blockiert (33.5) | voll | blockiert | kein direkter Zugriff |
| Ausmass | laut Scope | blockiert (31.4 SELECT, 33.6 DELETE) | voll | blockiert | kein direkter Zugriff |
| Reports | laut Scope | blockiert (31.4 SELECT, 33.6 DELETE) | voll | blockiert | kein direkter Zugriff |
| Project Files | laut Permission | blockiert (31.4, 33.6, Storage 32.4) | voll | blockiert | kein direkter Zugriff |
| Materials | laut Permission | blockiert (33.5 Injection, 33.6 UPDATE) | voll | blockiert | kein direkter Zugriff |
| Rates | laut Permission | blockiert (33.5, 33.6) | voll | blockiert | kein direkter Zugriff |
| Rinne Fitting Types | laut Permission | **war KRITISCH (31.2), seit v2.23 blockiert**, 2.25 reaudit clean | voll | blockiert | kein direkter Zugriff |
| Blitzschutz Materials | laut Permission | blockiert (33.5) | voll | blockiert | kein direkter Zugriff |
| App Settings | eigene Firma sichtbar | blockiert (33.5, 33.6) | änderbar (eigene Firma) | blockiert | kein direkter Zugriff |
| Permissions (overrides) | eigene Overrides wirksam | blockiert (31.4, restriktive Policy) | verwaltbar (eigene Firma) | blockiert | kein direkter Zugriff |
| Feedback | eigenes sichtbar/erstellbar | blockiert (33.5 Injection) | alle der eigenen Firma | blockiert | kein direkter Zugriff |
| Storage | eigene referenzierte Dateien | **war HOCH (31.5), seit v2.24 blockiert** | eigene referenzierte Dateien | blockiert | Firmenlöschung via `service_role` (RLS-unabhängig, legitim) |
| Passwortfunktionen | eigenes Passwort setzen (`mark_own_password_set`, nur `auth.uid()`) | n/a (kein Fremdzugriff möglich) | eigene Mitarbeiter zurücksetzen | **war KRITISCH (31.3), seit v2.23 blockiert** | n/a |
| Mitarbeiteranlage | n/a (nicht berechtigt) | n/a | eigene Firma (kein `company_id`-Feld im Request) | strukturell unmöglich | n/a |
| Firmenregistrierung | abgelehnt | n/a | abgelehnt (403) | n/a | erlaubt |
| Trial | n/a | n/a | abgelehnt (33.4) | n/a | erlaubt |
| Status | n/a | n/a | abgelehnt (33.4) | n/a | erlaubt |
| Firmenlöschung | n/a | n/a | abgelehnt (33.4) | n/a | erlaubt, aber Selbstschutz bei System-Admin-Mitgliedschaft (33.4) |

### 33.9 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (594/594 – nur der Versionstext geändert).
- Produktivdaten vor/während/nach allen Tests wiederholt geprüft: 1
  Firma, 12 Profile, 4 Projekte, 13 Massaufnahmen, 2 Ausmass, 4
  Regierapporte, 1 Projektdatei, 371 Materialien, 11 `rates`, 7
  `rinne_fitting_types`, 486 `blitzschutz_materials`, 1
  `einlaufblech_settings`, 6 `measurement_materials`, 1 `app_settings`,
  12 `feedback`, 1 `system_admins`-Eintrag, 14 Storage-Objekte – exakt
  wie vor Beginn dieser Aufgabe und identisch zu den in v2.23/2.24
  dokumentierten Werten.
- Kein Frontend-Code verändert (nur Versionstext) – Massaufnahme (alle
  neun Funktionen), Ausmass, Regierapport, Materialverwaltung,
  Excel-Import, Login, Firmenregistrierung, System-Admin, Firmenadmin,
  Mitarbeiter, Passwort-Erstsetzung, Passwort-Reset, geschützte
  Einstellungen, Trial, Status, Firmenlöschung, Storage: keine
  Codeänderung in dieser Runde, daher kein eigenständiger
  Funktionstest dieser Bereiche nötig – ihre RLS-/Funktionsgrundlage
  wurde aber vollständig als Teil dieses Audits erneut geprüft.
- Live-Klicktest im Browser weiterhin nicht möglich (Sandbox-
  Netzwerksperre zu `nfgryuzkpwjfmdlmevuy.supabase.co`) – wie in jeder
  vorherigen Sitzung ausdrücklich nicht als getestet behauptet. Alle
  oben dokumentierten Ergebnisse sind direkte RLS-/Funktions-
  Simulationen gegen das echte Produktivschema.

### 33.10 Ergebnis

**Keine neue KRITISCHE oder HOHE Sicherheitslücke gefunden.** Die beiden
in v2.23 gefundenen KRITISCH-Lücken (`rinne_fitting_types`,
`reset-password`) und die in v2.23 gefundene, in v2.24 behobene
HOCH-Lücke (Storage) sind weiterhin korrekt geschlossen, ohne
Regression. Einziger neuer Fund dieser Runde: der bereits seit v2.17
dokumentierte, tatsächlich ungefährliche `anon`/`PUBLIC`-Grant auf eine
reine Trigger-Funktion (NIEDRIG, aus Hygiene-Gründen dennoch entzogen,
siehe 33.2). Alle systematischen Company_id-Injection-, IDOR- und
Profile-Escalation-Tests sowie die Re-Prüfung aller Edge Functions und
System-Admin-Funktionen bestätigen: RLS, `SECURITY DEFINER`-Funktionen
und Edge-Function-Aufrufer-Prüfungen greifen konsistent über das gesamte
Schema.

### 33.11 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 33.9).
- Die 9 verwaisten Storage-Objekte aus Abschnitt 32.1 bleiben unverändert
  isoliert (nicht Gegenstand dieser Runde).
- SSRF-Nebenbefund in `extract-offer-positions` (31.6) weiterhin
  ausserhalb des Auftragsumfangs, nicht behoben.
- `permission_settings` weiterhin bewusst ohne `company_id` (geteilte
  Rollen-Standardwerte, siehe 20.8) – kein Fehler.

## 34. SYSTEM-ADMIN FIRMENVERWALTUNG AUSGEBAUT — VERSION 2.26

Der bestehende System-Admin-Bereich (Abschnitt 25–30) wurde zu einer
übersichtlicheren Firmenverwaltung ausgebaut – **keine neue
Sicherheitsarchitektur**, ausschliesslich vorhandene Trial-/Status-/
Registrierungs-/Löschfunktionen sauber zusammengeführt, wie im Auftrag
gefordert. Alle bestehenden `SECURITY DEFINER`-Sicherheitsprüfungen,
RLS-Policies und `is_system_admin()` unverändert.

### 34.1 Was geändert wurde

- **Firmenliste** (`renderSystemAdminList()`, `js/22-system-admin.js`):
  sortiert jetzt nach `created_at` **absteigend** (neueste Firma zuerst)
  statt alphabetisch. Jede Zeile zeigt zusätzlich zu Status und
  Test-Ende jetzt auch **Trial-Dauer** (Tage) und **Registrierungsdatum**
  – beides war in der Firma bereits als Feld vorhanden
  (`companies.trial_days`/`companies.created_at`), nur nicht in der
  Übersicht angezeigt.
- **Suche/Filter** (`#sysAdminSearchInput`, `#sysAdminFilterStatus`,
  neue Funktion `sysAdminRenderFilteredList()`): reine
  Client-seitige Filterung der bereits geladenen `sysAdminCompanies` –
  **keine zusätzliche Datenbankabfrage** pro Tastenanschlag/Filterwechsel,
  wie im Auftrag ausdrücklich gefordert ("keine unnötigen
  N+1-Abfragen"). Wird beim Öffnen des Bereichs zurückgesetzt, bleibt
  aber beim Zurückkehren aus der Detailansicht (Trial/Status
  gespeichert, Firma gelöscht) erhalten, da nur `renderSystemAdminList()`
  (Neuladen der Daten) aufgerufen wird, nicht die Eingabefelder selbst
  geleert werden.
- **Detailansicht** (`openSystemAdminCompany()`): zwei neue Felder
  „Admins" und „Mitarbeiter" neben dem bereits vorhandenen „Benutzer"
  (Gesamtzahl).
- **Leerzustände**: „Keine Firmen gefunden." (keine einzige Firma
  existiert) und „Keine Firmen entsprechen der Suche/dem Filter."
  (Firmen vorhanden, aber der aktuelle Filter trifft keine) sind jetzt
  zwei unterschiedliche Meldungen statt einer einzigen.
- **Unverändert wiederverwendet, nicht neu gebaut**: Trial bearbeiten
  (`system_admin_set_trial`), Status ändern (`system_admin_set_status`),
  Firma registrieren (`register-company`-Edge-Function, exakt derselbe
  Formular-/Handler-Code wie seit Version 2.20), Firma löschen
  (`system-admin-delete-company`-Edge-Function, exakt derselbe
  zweistufige Bestätigungsdialog wie seit Version 2.19/2.20) – an all
  diesen Stellen wurde kein Code verändert, nur die bereits vorhandenen
  Erfolgsmeldungen (`sysAdminShowSuccess()`/`sysAdminShowListSuccess()`)
  weiterhin genutzt.

### 34.2 Minimale SQL-Erweiterung: Admin-/Mitarbeiterzahl

Die Detailansicht brauchte laut Auftrag getrennte Admin-/
Mitarbeiterzahlen, die bestehende Funktion
`system_admin_company_user_counts()` lieferte bisher nur die
Gesamtzahl. Statt einer zweiten Funktion (die dieselbe Tabelle ein
zweites Mal abfragen würde) wurde die **bestehende** Funktion minimal
erweitert (Migration
`system_admin_company_user_counts_role_breakdown`): liefert jetzt
`(company_id, user_count, admin_count, employee_count)` statt nur
`(company_id, user_count)` – weiterhin **eine einzige** Abfrage über
alle Firmen (`count(*) filter (where p.role = 'admin'/'employee')`),
kein zusätzlicher Query pro Firma. Rückgabetyp hat sich geändert, daher
`DROP FUNCTION` + `CREATE FUNCTION` statt `CREATE OR REPLACE` (Postgres
erlaubt bei einer Typänderung kein `REPLACE`). Sicherheitsprüfung
(`is_system_admin()`, `SECURITY DEFINER`, `search_path` fest auf
`public`) und Grants (`authenticated`/`service_role`, **nicht** `anon`)
identisch zur vorherigen Version übernommen – keine Sicherheitsänderung,
nur zusätzliche Rückgabespalten.

**Verifiziert** (direkt gegen die Produktivdatenbank, `begin;…rollback;`):
- Als Mike Ledermann (System-Admin) aufgerufen: liefert für PETER KÜNZI
  AG korrekt `user_count=12, admin_count=1, employee_count=11`.
- Als Phillipp Wegmueller (normaler Mitarbeiter, kein System-Admin)
  aufgerufen: weiterhin korrekt abgelehnt mit „Nur für
  System-Administratoren." – keine Regression durch die Erweiterung.

### 34.3 Sicherheit – nichts Neues gebaut, nur wiederverwendet

- Der System-Admin-Bereich bleibt ausschliesslich für Benutzer sichtbar/
  nutzbar, für die `is_system_admin()` `true` liefert – reine
  UI-Führung (`checkSystemAdmin()`, unverändert), die eigentliche
  Absicherung bleibt serverseitig (RLS-Policy
  `system_admin_select_all_companies`, alle `system_admin_*`-Funktionen
  prüfen sich selbst).
- Keine neue clientseitige `company_id`-Vertrauensquelle eingeführt –
  Suche/Filter arbeiten ausschliesslich auf bereits vom Server
  gelieferten, RLS-gefilterten Daten (`sysAdminCompanies`), nicht auf
  einer vom Client konstruierten Abfrage.
- **Keine Impersonation gebaut** (wie im Auftrag ausdrücklich verlangt):
  kein "als Firma anmelden", kein "als Mitarbeiter anmelden", kein
  Öffnen einer fremden Firma im normalen App-Kontext – die
  Firmenverwaltung zeigt ausschliesslich Firma/Trial/Status/Benutzerzahl
  an und verwendet die bestehende, bereits geprüfte Lösch-/
  Registrierungs-Funktion.
- `RLS`, `system_admins`, `is_system_admin()` und alle bestehenden
  `SECURITY DEFINER`-Sicherheitsprüfungen wurden **nicht** verändert –
  einzige DB-Änderung ist die Rückgabespalten-Erweiterung aus 34.2,
  mit identischer Zugriffsprüfung.

### 34.4 Tests

**Direkt gegen die Produktivdatenbank verifiziert** (siehe 34.2): neue
Funktion liefert für den echten System-Admin korrekte Admin-/
Mitarbeiterzahlen, lehnt einen Nicht-System-Admin weiterhin korrekt ab.

- `node --check` über alle `js/*.js` (inkl. `js/22-system-admin.js`) und
  `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (601/601,
  vorher 594/594 – Differenz durch die 7 neuen `<div>`s: Suche/Filter-
  Zeile in der Firmenliste, zwei neue Detailfelder Admins/Mitarbeiter).
- Jede neue Element-ID (`sysAdminSearchInput`, `sysAdminFilterStatus`,
  `systemAdminCompanyAdmins`, `systemAdminCompanyEmployees`) einzeln
  gegen `index.html` geprüft: genau einmal vorhanden.
- `git diff --stat` nach Abschluss geprüft: ausschliesslich
  `index.html` und `js/22-system-admin.js` verändert – kein anderer
  Bereich (Login, Mitarbeiteranlage, Passwort-Erstsetzung, geschützter
  Einstellungsbereich, Storage, Massaufnahme, Firmenlöschungs-Edge-
  Function) berührt, daher kein eigenständiger Funktionstest dieser
  Bereiche nötig – ihre zugrunde liegende Sicherheits-/Datenlogik wurde
  bereits im Audit v2.25 vollständig geprüft und ist durch diese
  Aufgabe unverändert.
- **PETER KÜNZI AG nach allen Änderungen erneut geprüft**: unverändert
  (1 Firma, 12 Profile, 1 System-Admin-Eintrag, `subscription_status`/
  `trial_days`/`updated_at` identisch zum Stand vor dieser Aufgabe) –
  weder durch die SQL-Migration noch durch einen Test verändert.
- Live-Klicktest im Browser (Firmenliste öffnen, suchen/filtern,
  Detailansicht mit Admin-/Mitarbeiterzahl öffnen, Trial/Status ändern,
  neue Testfirma registrieren, wieder löschen, eigener System-Admin
  bleibt bestehen; als Firmenadmin/Mitarbeiter: Bereich nicht sichtbar)
  **in dieser Sitzung technisch nicht möglich** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt, wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich
  nicht als getestet behauptet.** Die Erfolgsmeldungen, der
  Registrierungs-/Löschablauf und die Sichtbarkeitssteuerung
  (`checkSystemAdmin()`) selbst wurden in dieser Aufgabe nicht
  verändert und sind bereits in den Versionen 2.17–2.23 einzeln per
  Code-Review/SQL-Simulation geprüft.

### 34.5 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 34.4).
- Impersonation/Support-Zugriff auf einzelne Firmendaten weiterhin nicht
  gebaut (bewusst, siehe 34.3 und bereits in 25.6 so festgelegt).
- Die 9 verwaisten Storage-Objekte (Abschnitt 32.1), die SSRF-
  Beobachtung in `extract-offer-positions` (31.6) und der
  `permission_settings`-Sonderfall (20.8) bleiben unverändert offen,
  nicht Teil dieser Aufgabe.

## 35. TRIAL-/FIRMENSTATUS-LIFECYCLE — VERSION 2.27

Der System-Admin konnte Trial-Dauer und Firmenstatus bereits verwalten
(Abschnitt 25/34) – diese Werte hatten aber bisher **keinerlei Wirkung**
auf den tatsächlichen App-Zugriff. Diese Aufgabe setzt den Lifecycle um:
eine abgelaufene oder deaktivierte Firma verliert den normalen Zugriff,
ohne dass irgendetwas gelöscht wird.

### 35.1 Statusmodell – keine neuen Werte

Geprüft, welche `subscription_status`-Werte tatsächlich existieren:
`trial`, `active`, `expired`, `cancelled`, `suspended` (unverändert seit
Abschnitt 21.4, `companies_subscription_status_check`). Das Zielkonzept
aus dem Auftrag deckt sich exakt damit – **kein neuer Statuswert
nötig**:

| Auftrag | bestehender Wert | Bedingung |
|---|---|---|
| TRIAL (läuft) | `trial` | `trial_ends_at > now()` |
| ABGELAUFEN | `trial` mit `trial_ends_at <= now()` (abgeleitet) **oder** `expired` | – |
| AKTIV | `active` | – |
| DEAKTIVIERT | `suspended` (im Frontend seit Version 2.17 bereits als „Gesperrt" beschriftet – exakt dieselbe Bedeutung) | – |

`cancelled` (bestand bereits, „Gekündigt") sperrt ebenfalls den Zugriff –
kein separater neuer Fall. Die UI-Beschriftung von `suspended` wurde von
„Gesperrt" auf „Deaktiviert" umbenannt (reiner Anzeigetext, der
gespeicherte Wert bleibt `suspended`), um exakt die Begriffe aus dem
Auftrag zu verwenden.

**Zugriffsregel** (einmal definiert, an einer einzigen Stelle
durchgesetzt, siehe 35.2): Zugriff erlaubt, wenn `subscription_status =
'active'` **oder** (`subscription_status = 'trial'` **und**
`trial_ends_at > now()`). Alle anderen Fälle (`expired`, `cancelled`,
`suspended`, oder `trial` mit abgelaufenem `trial_ends_at`) sperren den
normalen Zugriff.

### 35.2 Zentrale Durchsetzung: `my_company_id()`

Analyse vor der Änderung: praktisch jede `tenant_boundary_*`-RESTRICTIVE-
Policy im Schema (elf Tabellen, siehe Abschnitt 31/33) und beide
Storage-Funktionen (`storage_object_is_own_company()`/
`storage_object_insert_allowed()`, Abschnitt 32) rufen ausschliesslich
**eine einzige** Funktion auf, um die eigene Firma zu bestimmen:
`my_company_id()`. Das ist genau die im Auftrag gesuchte "zentrale
Stelle" (Abschnitt 14).

**Umsetzung** (Migration `company_access_lifecycle_v2_27`):
`my_company_id()` liefert jetzt nur noch dann die echte `company_id`,
wenn die Firma laut 35.1 Zugriff hat – sonst `NULL`. Da `company_id =
NULL` in SQL nie wahr ist, blockiert das automatisch **jede** der elf
bestehenden restriktiven Tenant-Boundary-Policies UND beide
Storage-Funktionen, **ohne eine einzige davon anzufassen** – kein
pauschaler Policy-Umbau, sondern eine einzige, zentrale Änderung.
Zeitvergleich (`now()`) läuft in Postgres, nicht auf der Browser-Uhr.

```sql
create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = 'public'
as $$
  select p.company_id from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = auth.uid()
    and (c.subscription_status = 'active'
         or (c.subscription_status = 'trial' and c.trial_ends_at > now()));
$$;
```

Neue, klar benannte Hilfsfunktion fürs Frontend (Auftrag Abschnitt 14):
`is_company_access_allowed()` – prüft exakt dieselbe Bedingung
(`my_company_id() is not null`), keine doppelte Logik.

### 35.3 Zwei eng gefasste Ausnahmen für die Sperr-Meldung

Ohne Ausnahme könnte ein gesperrter Benutzer nicht einmal mehr sein
eigenes Profil oder den Namen/Status seiner eigenen Firma lesen – die
im Auftrag geforderte "klare Meldung" wäre unmöglich. Zwei bewusst
minimale Ausnahmen:

1. **`profiles`**: die bisherige einzelne `for all`-Policy
   (`tenant_boundary_profiles`) wurde durch vier befehlsspezifische
   ersetzt (Postgres erlaubt pro Policy nur `ALL` oder genau einen
   Befehl). Nur die neue `tenant_boundary_profiles_select` erlaubt
   zusätzlich `id = auth.uid()` (eigene Zeile immer lesbar).
   `tenant_boundary_profiles_insert/update/delete` bleiben unverändert
   ausschliesslich über `company_id = my_company_id()` geprüft – ein
   gesperrter Benutzer kann also **nichts** an seinem Profil ändern,
   insbesondere nicht sein eigenes `company_id` per Update umgehen
   (empirisch geprüft, siehe 35.5).
2. **`companies`**: `company_member_select_own_company` verwendet jetzt
   `my_company_id_raw()` (neue Funktion – exakt der bisherige,
   ungegatete Funktionskörper von `my_company_id()`, nur umbenannt)
   statt der jetzt gesperrten `my_company_id()`. Die eigene Firmenzeile
   (Name/Status/Trial-Ende) bleibt dadurch immer sichtbar, auch
   gesperrt. Das UPDATE dieser Zeile (`company admins can update their
   company`, Name/Adresse/Logo) wurde **bewusst nicht zusätzlich
   gesperrt** – siehe 35.8 für die Begründung.

### 35.4 Edge Functions: `smart-action` und `reset-password`

Beide laufen komplett mit dem `service_role`-Key (bewusst, um
firmenübergreifend eindeutige Benutzernamen zu prüfen bzw. das
Zielprofil zu lesen) und **umgehen RLS damit vollständig** – die
zentrale `my_company_id()`-Sperre aus 35.2 greift hier **nicht von
selbst**. Beide sind laut Auftrag "normale" Firmenfunktionen
(Mitarbeiteranlage, Passwort-Reset) und müssen deshalb bei gesperrter
Firma ebenfalls blockiert werden – explizit ergänzt:

- **`smart-action`** (v10→v11): neue Funktion `isCompanyAccessAllowed(companyId)`
  (Service-Role-REST-Abfrage auf `companies`, spiegelt exakt dieselbe
  Regel wie 35.1), aufgerufen direkt nach der bestehenden Admin-/
  `company_id`-Prüfung. Kein Mitarbeiter mehr anlegbar, wenn die eigene
  Firma des aufrufenden Admins gesperrt ist.
- **`reset-password`** (v2→v3): dieselbe Prüfung (`istFirmaZugriffErlaubt()`)
  ergänzt, direkt nach der bestehenden Admin-Prüfung, vor dem
  Firmenvergleich mit dem Zielprofil aus Version 2.23.

**Bewusst nicht verändert**: `register-company` (legt eine **neue**
Firma an, hat mit dem Sperrzustand einer bestehenden Firma nichts zu
tun) und `system-admin-delete-company` (muss laut Auftrag Abschnitt 6
ausdrücklich **auch** bei gesperrter Zielfirma funktionieren – beide
prüfen ausschliesslich `is_system_admin()`, das hängt an keiner Stelle
von `my_company_id()` ab, also automatisch unberührt).
`extract-offer-positions`/`extract-profile-shape` (reine Bild-zu-JSON-
Funktionen ohne Tabellenzugriff, siehe 31.6/33.3) ebenfalls nicht
angefasst – siehe 35.8 für die Begründung.

### 35.5 Login-Flow (`js/03-login.js`)

`afterLogin()` ruft `checkSystemAdmin()` jetzt **vor** der bisherigen
Passwort-Erstsetzungs-Prüfung auf (vorher erst nach dem Aufbau von
`#appRoot`) – wird für die folgende Sperr-Prüfung gebraucht, keine
doppelte RPC. Nach der bestehenden `passwort_gesetzt`-Prüfung neu:

```js
if(!isSystemAdmin){
 const {data:zugriffErlaubt}=await sb.rpc("is_company_access_allowed");
 if(!zugriffErlaubt){ await showCompanyLocked(); return; }
}
```

System-Admins überspringen die Prüfung komplett (Auftrag Abschnitt 6:
"System-Admin darf nicht durch den Status der Firma ausgesperrt
werden") – unabhängig davon, ob ihre eigene Firma zufällig gesperrt
wäre. Neue Funktion `showCompanyLocked()`: liest die eigene Firmenzeile
(über die Ausnahme aus 35.3 weiterhin lesbar) und zeigt eine konkrete,
auf den tatsächlichen Status zugeschnittene Meldung im neuen
`#companyLockedScreen` (z. B. „Die Testphase von „Testfirma" ist am
01.10.2026 abgelaufen. Bitte wenden Sie sich an Ihren Administrator.")
– **kein** irreführender Passwortfehler bei einem reinen
Statusproblem, wie im Auftrag gefordert. Der Bildschirm hat nur einen
Abmelden-Knopf, kein anderer Weg zurück in die App.

### 35.6 System-Admin-UI (`js/22-system-admin.js`)

Neue Funktion `sysAdminZugriffHinweis(c)`: zeigt direkt neben dem
Firmennamen in der Liste einen roten Hinweis, wenn der normale Zugriff
gesperrt ist – „Abgelaufen seit N Tagen" (abgeleiteter Fall: `trial`
mit vergangenem `trial_ends_at`), „Abgelaufen" (`expired`),
„Deaktiviert" (`suspended`) oder „Gekündigt" (`cancelled`). Verwendet
dieselbe Regel wie 35.1, rein clientseitig auf bereits geladenen Daten
berechnet (keine zusätzliche Abfrage). Bestehende Suche/Filter aus
Version 2.26 unverändert weiterverwendet, nicht neu gebaut.

### 35.7 Empirische Tests (alle in `begin;…rollback;`, mit einer
temporären Wegwerf-Testfirma, nie PETER KÜNZI AG selbst)

| Test | Ergebnis |
|---|---|
| Trial noch gültig (`trial`, `trial_ends_at` in Zukunft) | `my_company_id()` liefert echte ID, `is_company_access_allowed()=true` |
| Trial künstlich abgelaufen (`trial_ends_at` in Vergangenheit) | `my_company_id()=NULL`, `is_company_access_allowed()=false`, `materials`/`projects` 0 sichtbare Zeilen, Storage 0 sichtbare Objekte |
| Status auf `active` gesetzt | Zugriff sofort wieder erlaubt |
| Status auf `suspended` gesetzt | Zugriff sofort wieder gesperrt (auch Storage: 0 Objekte) |
| `system_admin_set_trial(...)` verlängert ein abgelaufenes Trial (Status bleibt `trial`) | Zugriff sofort wieder erlaubt, `subscription_status` unverändert `trial` – keine widersprüchlichen Zustände |
| Gesperrter Mitarbeiter versucht, eigenes `profiles.company_id` per UPDATE auf eine andere (nicht gesperrte) Firma zu ändern | RLS blockiert still (0 Zeilen geändert) – die Selbst-Sichtbarkeits-Ausnahme aus 35.3 lässt sich nicht für Schreibzugriffe missbrauchen |
| System-Admin (Mike), dessen **eigene** Firma testweise auf `suspended` gesetzt wurde | `my_company_id()=NULL` (korrekt, normaler Zugriff auch für ihn gesperrt), aber `is_system_admin()=true` und `system_admin_company_user_counts()` funktioniert weiterhin uneingeschränkt |
| Reale, unveränderte PETER KÜNZI AG (Status `active`) | `my_company_id()` liefert echte ID, `is_company_access_allowed()=true`, alle 4 Projekte und 5 referenzierten Storage-Dateien weiterhin sichtbar – keine Regression am Normalfall |

### 35.8 Bewusste Grenzen dieser Runde (offengelegt, nicht verschwiegen)

- **`company admins can update their company`** (Firmenname/-adresse/
  -logo ändern) bleibt ungegatet – ein Admin einer gesperrten Firma
  kann diese kosmetischen Einstellungen weiterhin ändern. Bewusste
  Entscheidung: betrifft keine Tenant-/Geschäftsdaten, ist von Trial/
  Status (ausschliesslich System-Admin-Sache, unverändert) getrennt,
  und die zehn im Auftrag genannten Testfälle prüfen dieses Verhalten
  nicht. Für eine spätere, eigene Aufgabe vormerken, falls gewünscht.
- **`extract-offer-positions`/`extract-profile-shape`** bleiben
  ungegatet – reine Bild-zu-JSON-Hilfsfunktionen ohne Tabellenzugriff
  und ohne `company_id`-Bezug im Request; das eigentliche **Speichern**
  ihres Ergebnisses (in `measurements`/`ausmass`) ist über die zentrale
  `my_company_id()`-Sperre bereits blockiert – ein gesperrter Benutzer
  könnte höchstens ein KI-Ergebnis abrufen, aber nirgends ablegen.
- **Keine automatische Statusänderung**: ein Trial, dessen `trial_ends_at`
  verstreicht, bleibt in der Datenbank weiterhin `subscription_status =
  'trial'` – nur der abgeleitete Zugriff ändert sich. Es gibt keinen
  Cron/Trigger, der den Status automatisch auf `expired` umstellt (wie
  im Auftrag ausdrücklich verlangt: "Nicht automatisch Statuswerte
  ändern").
- **Keine automatische Löschung, kein Datenverlust**: durch diese
  Aufgabe wird keine einzige Zeile gelöscht – ausschliesslich
  Sichtbarkeit/Schreibrechte werden bedingt eingeschränkt. Ein
  gesperrter Zustand ist jederzeit vollständig reversibel (Status
  zurücksetzen oder Trial verlängern), Daten bleiben währenddessen
  unangetastet in der Datenbank.
- Kein Live-Klicktest im Browser möglich (Sandbox blockiert weiterhin
  jede ausgehende HTTPS-Verbindung zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in jeder vorherigen
  Sitzung) – **ausdrücklich nicht als getestet behauptet**. Alle in
  35.7 dokumentierten Ergebnisse sind direkte RLS-/Funktions-
  Simulationen gegen das echte Produktivschema.

### 35.9 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (606/606,
  vorher 601/601 – Differenz durch den neuen `#companyLockedScreen`).
- `git diff --stat`: nur `index.html`, `js/03-login.js`,
  `js/22-system-admin.js` verändert (plus die SQL-Migration und die
  beiden Edge-Function-Redeploys) – Mitarbeiteranlage-Formular selbst
  (`js/07-einstellungen.js`), Massaufnahme, Materialverwaltung,
  Firmenlöschung, Firmenregistrierung: keine Codeänderung.
- PETER KÜNZI AG nach allen Tests erneut geprüft: unverändert (`status
  ="active"`, `trial_days`, `updated_at` identisch zum Stand vor dieser
  Aufgabe), normaler Zugriff für einen echten Mitarbeiter weiterhin
  uneingeschränkt funktionsfähig (siehe 35.7, letzte Zeile).
- Live-Klicktest im Browser (Login mit abgelaufener/deaktivierter
  Testfirma, Sperr-Meldung sehen, System-Admin reaktiviert, erneuter
  Login funktioniert wieder, Mitarbeiter-Login zeigt dieselbe Sperre,
  Mitarbeiteranlage/Passwort-Reset bei gesperrter Firma abgelehnt)
  **in dieser Sitzung technisch nicht möglich** – Sandbox-
  Netzwerksperre, siehe 35.8.

### 35.10 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 35.9).
- Companies-UPDATE-Policy für Firmenmetadaten bei gesperrter Firma
  weiterhin ungegatet (siehe 35.8) – bewusste, dokumentierte
  Entscheidung, keine spätere Pflichtaufgabe.
- Automatische Statusänderung, Mahnungen, Zahlungssystem, Abos,
  Rechnungen, Impersonation, Kundenportal: wie im Auftrag ausdrücklich
  gefordert **nicht** gebaut.

## 36. PROJEKT-/MASSAUFNAHME-ERSTELLER UND ZEITSTEMPEL — VERSION 2.28

Erste, bewusst kleine Grundlage für nachvollziehbare Zusammenarbeit
mehrerer Mitarbeiter an Projekten und Massaufnahmen: wer hat einen
Datensatz erstellt und wann, wer hat ihn zuletzt geändert und wann.
**Kein vollständiger Änderungsverlauf** (keine Feldhistorie, keine
alten/neuen Werte, kein Undo/Wiederherstellen) – das bleibt bewusst
einem späteren, eigenen Auftrag vorbehalten.

### 36.1 Bestandsaufnahme (vor jeder Änderung, direkt am Schema geprüft)

`measurements` hatte bereits alle vier Spalten (`created_by`,
`created_at`, `updated_by`, `updated_at`) **und** bereits Frontend-Code,
der sie beim Speichern befüllt (`js/16-massaufnahme-formular.js`).
`projects` hatte `created_by`/`created_at`/`updated_at`, aber **keine**
`updated_by`-Spalte – die Frontend-Annahme, dass sie bereits existiere,
war falsch (erst beim Anlegen des Fremdschlüssels aufgefallen). Keine
der beiden Tabellen hatte diese Felder jemals serverseitig durchgesetzt:
`created_by`/`updated_by` kamen ausschliesslich aus `currentProfile.id`
im Browser, `created_at`/`updated_at` aus `new Date().toISOString()` im
Browser – ein manipulierter Request hätte einen beliebigen Benutzer/
Zeitpunkt eintragen können. Für `projects` wurde `created_by`/
`updated_by` bisher nirgends überhaupt gesetzt (immer `NULL`), die
einzige bestehende Änderungsroute (Archivieren) aktualisierte
`updated_at` nicht.

**Zusätzlich entdeckt und mitbehoben**: alle vier bestehenden/neuen
`created_by`/`updated_by`-Fremdschlüssel verwendeten `ON DELETE NO
ACTION`. Live nachgewiesen (`begin;…rollback;`): ein Mitarbeiter, der
jemals eine Massaufnahme bearbeitet hat, konnte mit dem bestehenden
"Mitarbeiter entfernen"-Feature (`js/08-katalog-blitzschutz.js`, direktes
`DELETE` auf `profiles`) **nicht mehr gelöscht werden** – die Löschung
schlug mit einem Fremdschlüsselfehler (`measurements_updated_by_fkey`)
fehl. Kein Datenverlust, aber ein echter, bereits vorhandener Blocker für
die Mitarbeiterverwaltung, der mit diesem Auftrag zusammenhängt und
deshalb mitbehoben wurde (nicht nur als separater Fund gemeldet).

### 36.2 Datenmodell (Migration `project_measurement_creator_editor_v2_28`)

- `projects`: fehlende Spalte `updated_by uuid` ergänzt.
- Alle vier Fremdschlüssel auf `ON DELETE SET NULL` umgestellt:
  `projects_created_by_fkey`/`measurements_created_by_fkey` →
  `auth.users(id)` (unverändertes Ziel, nur die Löschregel geändert),
  `projects_updated_by_fkey` (neu) / `measurements_updated_by_fkey` →
  `public.profiles(id)` (gleiches Muster, das `measurements.updated_by`
  bereits vorher hatte). Ergebnis: wird ein Mitarbeiter entfernt, bleiben
  alle historischen Projekte/Massaufnahmen **vollständig erhalten** –
  nur die Personenreferenz wird `NULL`, die Löschung selbst wird nicht
  mehr blockiert.

### 36.3 Serverseitige Durchsetzung: ein Trigger, zwei Tabellen

Neue Funktion `set_creator_editor_meta()` (`plpgsql`, kein `SECURITY
DEFINER` nötig – keine erhöhten Rechte, `auth.uid()` ist überall lesbar),
als `BEFORE INSERT OR UPDATE`-Trigger auf `projects` **und**
`measurements` angehängt:

```sql
if tg_op = 'INSERT' then
  new.created_by := auth.uid();  new.created_at := now();
  new.updated_by := auth.uid();  new.updated_at := now();
elsif tg_op = 'UPDATE' then
  new.created_by := old.created_by;  new.created_at := old.created_at;
  new.updated_by := auth.uid();      new.updated_at := now();
end if;
```

Überschreibt `created_by`/`created_at`/`updated_by`/`updated_at`
**immer** mit dem echten, serverseitig aufgelösten Aufrufer und der
echten Server-Uhrzeit – unabhängig davon, was der Client im Request
mitschickt (der bestehende Frontend-Code schickt weiterhin
`currentProfile.id`/eigene Zeitstempel mit, das wird jetzt einfach
ignoriert/überschrieben, kein Fehler). Bei `UPDATE` bleiben
`created_by`/`created_at` zwingend auf dem ursprünglichen Wert (`OLD`) –
ein Client kann die Erstellungs-Herkunft nachträglich nicht umschreiben,
auch nicht als Admin. Der Trigger prüft **nicht** selbst, ob ein
Schreibzugriff erlaubt ist – das entscheidet weiterhin ausschliesslich
die bestehende RLS (`tenant_boundary_projects`/`tenant_boundary_
measurements`, `has_permission()`), unverändert. Der Trigger setzt nur
WER/WANN, **nachdem** RLS den Zugriff bereits erlaubt hat. Feuert
ausschliesslich bei echten `INSERT`/`UPDATE`-Anweisungen, nie bei einem
blossen `SELECT`/Seitenaufruf.

**Live nachgewiesen** (`begin;…rollback;`, gegen echte Firmendaten):
- Mitarbeiter versucht beim Anlegen eines Projekts, `created_by` auf
  einen fremden Benutzer (Mike) und `created_at` auf das Jahr 2000 zu
  fälschen → Trigger überschreibt beides korrekt mit dem echten
  Aufrufer/der echten Uhrzeit.
- Mike bearbeitet ein von einem Mitarbeiter erstelltes Projekt und
  versucht, `created_by`/`created_at` nachträglich auf sich selbst/das
  Jahr 2000 umzuschreiben → `created_by`/`created_at` bleiben unverändert
  beim ursprünglichen Ersteller/Zeitpunkt, nur `updated_by`/`updated_at`
  wechseln korrekt auf Mike/jetzt.
- Dieselben Tests für `measurements` mit identischem Ergebnis.
- Mitarbeiter einer (simulierten) fremden Firma versucht, `updated_by`/
  `name` eines echten PETER-KÜNZI-AG-Projekts zu ändern → 0 Zeilen
  geändert (RLS blockiert wie gehabt, unabhängig vom neuen Trigger) –
  Produktivwert nach dem Test erneut direkt geprüft: unverändert.
- Mitarbeiterentfernung (Test aus 36.1) nach der Migration erneut
  durchgeführt: läuft jetzt ohne Fehler durch, `updated_by` der
  betroffenen Massaufnahme korrekt `NULL`, die Zeile selbst weiterhin
  vorhanden.

### 36.4 Anzeige im Frontend

Keine neue Namenslogik – beide Stellen nutzen die **bereits
vorhandene** `profileName()`-Auflösung (`js/01-basis.js`, liest aus dem
schon geladenen `allProfiles`, keine zusätzliche Abfrage) über die
**bereits vorhandene** `erstelltGeaendertText()`-Funktion
(`js/16-massaufnahme-formular.js`, bisher nur für die PDF-Fusszeile
verwendet) – jetzt zusätzlich für die Bildschirmanzeige wiederverwendet,
keine doppelte Formatierlogik:

- **Massaufnahme-Formular** (`#measMetaInfo`, `js/10-massaufnahme.js`
  `updateMeasFormTitle()`): dezente Zeile direkt unter dem Titel,
  z. B. "Erstellt von Max Muster am 01.09.2026, 14:32 · Zuletzt geändert
  von Anna Beispiel am 01.09.2026, 16:05". Bei einer neuen, noch nie
  gespeicherten Massaufnahme bleibt die Zeile ausgeblendet (`hidden`,
  nichts anzuzeigen).
- **Projektliste** (`renderProjectList()`, `js/09-projekte.js`): dieselbe
  Zeile direkt unter den bestehenden Projektangaben (Auftrags-Nr./
  Adresse/Auftraggeber), pro Projekt-Karte.
- **Fallback für gelöschte Benutzer**: `erstelltGeaendertText()` zeigt
  jetzt „Unbekannter Benutzer" statt eines blossen „–", wenn ein
  Zeitpunkt vorhanden, aber das referenzierte Profil nicht mehr auflösbar
  ist (z. B. nach einer Mitarbeiterentfernung, siehe 36.1/36.2) – gilt
  einheitlich für Bildschirmanzeige **und** PDF-Fusszeile (dieselbe
  Funktion), keine neue Fallunterscheidung nötig.

**Keine zusätzliche Abfrage nötig** (Auftrag Abschnitt 14, Performance):
`allProjects` bzw. der geladene Massaufnahme-Datensatz enthalten die vier
Felder bereits über das bestehende `select("*")` – die Anzeige liest
ausschliesslich bereits geladene Daten.

### 36.5 Was diese Version NICHT enthält

Wie im Auftrag ausdrücklich gefordert **nicht** gebaut: eine vollständige
Audit-Tabelle, Protokollierung jeder Feldänderung, Speicherung alter/
neuer Werte, Wiederherstellung, Undo, Versionsvergleich. Diese Version
schafft ausschliesslich die Grundlage (wer/wann zuletzt), keinen
vollständigen Änderungsverlauf.

### 36.6 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (607/607, vorher
  606/606 – Differenz durch das eine neue `#measMetaInfo`-Element).
- `git diff --stat`: nur `index.html`, `js/09-projekte.js`,
  `js/10-massaufnahme.js`, `js/16-massaufnahme-formular.js` verändert –
  **keine** der neun Massaufnahme-Fachfunktionen (`js/11-…` bis
  `js/21-…`, ausser der gemeinsamen Speicherhülle in `16`), keine
  Berechnungslogik, keine Ausmass-/Regierapport-/Storage-/System-Admin-/
  Trial-Dateien angefasst.
- Produktivdaten vor/während/nach allen Tests geprüft: 1 Firma, 12
  Profile, 4 Projekte, 13 Massaufnahmen – exakt wie vor Beginn dieser
  Aufgabe, keine `AUDIT%`-Test-Reste.
- PETER KÜNZI AG nach allen Tests erneut geprüft: unverändert.
- Live-Klicktest im Browser (Projekt anlegen/ändern, Massaufnahme aller
  neun Typen anlegen/ändern, Anzeige prüfen, Mitarbeiter entfernen, der
  zuvor eine Massaufnahme geändert hat) **in dieser Sitzung technisch
  nicht möglich** – Sandbox blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in jeder vorherigen
  Sitzung. **Das wird hier ausdrücklich nicht als getestet behauptet.**
  Alle in 36.3 dokumentierten Ergebnisse sind direkte Trigger-/RLS-
  Simulationen gegen das echte Produktivschema.

### 36.7 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 36.6).
- Vollständiger Änderungsverlauf (Feldhistorie, alte/neue Werte, Undo,
  Versionsvergleich) wie im Auftrag ausdrücklich vorgesehen **nicht**
  Teil dieser Version – eigener, späterer Auftrag.
- ~~Dieselbe Ersteller-/Bearbeiter-Grundlage existiert bereits für
  `ausmass` und `reports`... dieselbe fehlende serverseitige
  Durchsetzung und dieselbe `ON DELETE NO ACTION`-FK-Problematik dürfte
  dort ebenfalls bestehen. Für eine spätere, eigene Aufgabe
  vormerken.~~ – **behoben in Version 2.29, siehe Abschnitt 37.**

## 37. AUSMASS-/REPORTS-ERSTELLER UND ZEITSTEMPEL — VERSION 2.29

Überträgt die in Version 2.28 (Abschnitt 36) für `projects`/
`measurements` behobene Ersteller-/Bearbeiter-Sicherheit jetzt auf
`ausmass` und `reports` – exakt dieselbe Problematik, unabhängig
bestätigt statt aus dem v2.28-Bericht übernommen.

### 37.1 Bestandsaufnahme (direkt am Schema geprüft)

Anders als `projects` in Version 2.28 hatten **beide** Tabellen bereits
**alle vier** Spalten (`created_by`, `created_at`, `updated_by`,
`updated_at`) – keine Schema-Ergänzung nötig, nur die serverseitige
Durchsetzung fehlte. Beide Speicherstellen
(`js/17-ausmass.js $("saveAusmass")`, `js/08-katalog-blitzschutz.js
$("save")`) setzten diese Felder bislang ausschliesslich clientseitig
(`currentProfile.id`/`new Date()`) – exakt dasselbe Muster wie
`measurements` vor Version 2.28. Beide Tabellen hatten bereits FKs
(`created_by → auth.users`, `updated_by → profiles`), aber – wie
vermutet – mit `ON DELETE NO ACTION`. Live nachgewiesen: ein Mitarbeiter,
der jemals ein Ausmass oder einen Report bearbeitet hat, konnte mit dem
bestehenden "Mitarbeiter entfernen"-Feature nicht gelöscht werden.

`reports` hatte zusätzlich bereits eine funktionierende Anzeige:
`$("save").onclick` liest nach dem Speichern über `.select()` die
tatsächliche, serverseitig gesetzte Zeile zurück in `currentReportMeta`
(nicht nur eine clientseitige Vermutung wie bei `measurements`/`ausmass`
vor dieser Änderung) – der PDF-Fusszeilen-Text
(`erstelltGeaendertText(currentReportMeta)`, `window.addEventListener
("beforeprint",...)`) zeigt dadurch bereits vor dieser Aufgabe die real
gespeicherten Werte.

### 37.2 Migration `ausmass_reports_creator_editor_v2_29`

- Alle vier bestehenden FKs (`ausmass_created_by_fkey`,
  `ausmass_updated_by_fkey`, `reports_created_by_fkey`,
  `reports_updated_by_fkey`) auf `ON DELETE SET NULL` umgestellt –
  identisches Muster wie in 36.2.
- **Kein neuer Trigger-Funktionskörper** – `set_creator_editor_meta()`
  aus Version 2.28 ist bereits generisch (referenziert nur
  `NEW.created_by`/`NEW.created_at`/`NEW.updated_by`/`NEW.updated_at`,
  keinen Tabellennamen) und wurde nur als zusätzlicher `BEFORE INSERT OR
  UPDATE`-Trigger an `ausmass` und `reports` angehängt
  (`set_creator_editor_meta_ausmass`/`set_creator_editor_meta_reports`).
  Verhalten identisch zu 36.3: `created_by`/`created_at` bleiben bei
  `UPDATE` zwingend auf dem ursprünglichen Wert, `updated_by`/
  `updated_at` werden bei jedem echten `INSERT`/`UPDATE` auf
  `auth.uid()`/`now()` gesetzt.
- RLS (`tenant_boundary_ausmass`/`tenant_boundary_reports`, beide
  bereits restriktiv über `EXISTS(...projects.company_id=
  my_company_id())`) **nicht verändert** – bereits korrekt, siehe
  Abschnitt 31/33.

### 37.3 Tests (alle `begin;…rollback;` gegen die echte Produktivdatenbank)

| Test | Ergebnis |
|---|---|
| `ausmass` INSERT mit gefälschtem `created_by`/`created_at` | vom Trigger überschrieben (echter Aufrufer/echte Zeit) |
| `ausmass` UPDATE, Fälschungsversuch von `created_by`/`created_at` durch einen anderen Benutzer | `created_by`/`created_at` unverändert (Original-Ersteller), `updated_by`/`updated_at` korrekt auf den echten Bearbeiter |
| `reports` INSERT mit gefälschtem `created_by`/`created_at` | vom Trigger überschrieben |
| `reports` UPDATE, Fälschungsversuch von `created_by`/`created_at` | `created_by`/`created_at` unverändert, `updated_by`/`updated_at` korrekt |
| Cross-Tenant: simulierte Fremdfirma ändert ein echtes `ausmass`/`report` von PETER KÜNZI AG | 0 Zeilen geändert (RLS blockiert, gegen Produktivwert nach dem Test erneut bestätigt unverändert) |
| Mitarbeiterentfernung nach `ausmass`- **und** `reports`-Bearbeitung durch denselben Mitarbeiter | Löschung läuft ohne Fehler durch, `updated_by` in beiden Tabellen korrekt `NULL`, beide Zeilen weiterhin vorhanden |

### 37.4 Anzeige im Frontend

- **Ausmass** (`#amMetaInfo`, `js/17-ausmass.js` `updateAmFormTitle()`):
  neue, dezente Zeile analog zu `#measMetaInfo` aus Version 2.28 –
  identische Wiederverwendung von `erstelltGeaendertText()`, keine neue
  Logik.
- **Reports**: **keine neue Bildschirmanzeige ergänzt** – bewusste
  Entscheidung, siehe 37.5. Die bereits bestehende PDF-Fusszeile
  profitiert automatisch vom "Unbekannter Benutzer"-Fallback aus Version
  2.28 (gleiche `erstelltGeaendertText()`-Funktion), ohne dass
  `js/08-katalog-blitzschutz.js` geändert werden musste.
- Keine zusätzliche Abfrage nötig – beide Tabellen werden bereits über
  `select("*")`/`.select()` vollständig geladen.

### 37.5 Bewusst nicht verändert: Regierapport-Bildschirm

Der Auftrag verlangt für Reports ausdrücklich besondere Vorsicht
("NICHT verändern: Berechnungen, Positionen, Summen, Material, Preise,
Layout, bestehende PDF-Fachlogik... Außer es existiert bereits eine
passende Anzeige und diese muss wegen NULL lediglich robust gemacht
werden"). Da genau das schon der Fall war (37.1/37.4), wurde bewusst
**keine neue** Anzeige auf dem Haupt-Regierapport-Bildschirm ergänzt –
anders als bei Ausmass/Massaufnahme ist das hier keine modale
Detailansicht, sondern der zentrale Arbeitsbildschirm für die tägliche
Rapport-Erfassung; eine zusätzliche Zeile dort wäre über das im Auftrag
geforderte Minimum hinausgegangen. Keine Zeile des bestehenden
Speicher-/Berechnungs-/PDF-Codes wurde verändert, ausser der bereits in
Version 2.28 angepassten, gemeinsam genutzten `erstelltGeaendertText()`.

### 37.6 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (608/608,
  vorher 607/607 – Differenz durch das eine neue `#amMetaInfo`-Element).
- `git diff --stat`: nur `index.html` und `js/17-ausmass.js` verändert –
  `js/08-katalog-blitzschutz.js` (Regierapport-Fachlogik/PDF),
  Massaufnahme, Projekte, Storage, System-Admin, Trial/Status,
  Firmenlöschung: keine Codeänderung.
- Produktivdaten vor/während/nach allen Tests geprüft: 1 Firma, 12
  Profile, 2 Ausmasse, 4 Regierapporte – exakt wie vor Beginn dieser
  Aufgabe, keine `AUDIT%`-Test-Reste.
- PETER KÜNZI AG nach allen Tests erneut geprüft: unverändert.
- Live-Klicktest im Browser (Ausmass/Report anlegen/ändern, Anzeige
  prüfen, Mitarbeiter entfernen, der zuvor ein Ausmass/einen Report
  geändert hat) **in dieser Sitzung technisch nicht möglich** – Sandbox
  blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in jeder vorherigen
  Sitzung. **Das wird hier ausdrücklich nicht als getestet behauptet.**
  Alle in 37.3 dokumentierten Ergebnisse sind direkte Trigger-/RLS-
  Simulationen gegen das echte Produktivschema.

### 37.7 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 37.6).
- Vollständiger Änderungsverlauf weiterhin **nicht** Teil dieser Version
  (wie im Auftrag ausdrücklich ausgeschlossen) – gilt jetzt einheitlich
  für `projects`, `measurements`, `ausmass` und `reports`.
- Damit ist die in Abschnitt 36.7 offengelegte Lücke vollständig
  geschlossen – alle vier company_id-indirekten Tabellen mit
  Personenreferenzen (`projects`, `measurements`, `ausmass`, `reports`)
  haben jetzt identisches Verhalten: serverseitig erzwungene
  Ersteller-/Bearbeiter-Metadaten, `ON DELETE SET NULL`, RLS
  unverändert korrekt.

## 38. ÄNDERUNGSVERLAUF – KONZEPT UND TECHNISCHE GRUNDLAGE — VERSION 2.30

Technische Grundlage für einen späteren, vollständigen Änderungsverlauf.
**Ausdrücklich kein fertiges Feature und keine UI** – Auftrag Abschnitt 14
lässt eine Oberfläche bewusst offen für einen eigenen, späteren Schritt.
Ziel dieser Version war laut Auftrag ausdrücklich, "eine SAUBERE
GRUNDLAGE zu schaffen, nicht möglichst viel zu bauen".

### 38.1 Bestandsaufnahme (frisch geprüft, nicht aus v2.28/v2.29 übernommen)

- `projects`/`measurements`/`ausmass`/`reports`: `created_by`/`created_at`/
  `updated_by`/`updated_at` wie in Abschnitt 36/37 dokumentiert, alle vier
  Tabellen haben den `set_creator_editor_meta()`-Trigger (BEFORE
  INSERT/UPDATE) – unverändert bestätigt, keine Regression.
- Keine vorhandene `audit_log`-/`change_log`-/History-Tabelle im Schema
  (per `information_schema.tables`-Suche nach `%audit%`/`%log%`/
  `%history%`/`%verlauf%` geprüft: 0 Treffer) – echte Neuentwicklung, kein
  bestehendes System zu erweitern.
- `projects` hat ein einziges echtes Statusfeld: `archived boolean`
  (Archivieren/Reaktivieren über den bestehenden Knopf
  `[data-archive-project]`, `js/09-projekte.js`). `measurements`/
  `ausmass`/`reports` haben **kein** eigenes Statusfeld – nur `type`
  (fachliche Kategorie, keine Statusgrösse).
- **Wichtiger, bisher nicht dokumentierter Fund:** `measurements.
  project_id`/`ausmass.project_id`/`reports.project_id` sind `ON DELETE
  SET NULL` (nicht CASCADE) – ein gelöschtes Projekt löscht seine
  Massaufnahmen/Ausmasse/Reports **nicht** automatisch mit, es hängt sie
  nur ab (`project_id → NULL`). Der bestehende Lösch-Dialog sagt das
  bereits korrekt ("Gespeicherte Rapporte bleiben erhalten, verlieren
  aber die Projekt-Zuordnung."). Für v2.30 relevant: die vier
  Löschaktionen im Frontend (`js/09-projekte.js`,
  `js/16-massaufnahme-formular.js`, `js/17-ausmass.js`,
  `js/04-start-suche.js`) sind vier unabhängige, echte `DELETE`-
  Anweisungen – kein Kaskadeneffekt, der mehrfach geloggt werden müsste.
- Alle vier Tabellen: bestätigte, unveränderte restriktive
  `tenant_boundary_*`-RLS-Policies (siehe Abschnitt 31/33), `projects`
  direkt über `company_id`, die anderen drei über
  `EXISTS(...projects p WHERE p.id = project_id AND p.company_id =
  my_company_id())`.
- Berechtigungen (`permission_settings`): sowohl `admin` als auch
  `employee` haben aktuell für alle vier Ressourcen `can_edit:true,
  edit_scope:'all'` – für die Tests in 38.7 relevant (beide Testrollen
  konnten uneingeschränkt anlegen/ändern/löschen).

### 38.2 Konzept: welche Aktionen sind tatsächlich relevant? (Auftrag Abschnitt 4)

| Bereich | Aktion | In v2.30 geloggt? | Begründung |
|---|---|---|---|
| Projekt | erstellen | ✅ `created` | echte, seltene Fachaktion |
| Projekt | ändern (Name/Adresse/Auftraggeber/…) | ✅ `updated` | echte Fachaktion |
| Projekt | archivieren/reaktivieren | ✅ `status_changed` | einziges echtes Statusfeld, klar abgrenzbar (`archived` alt≠neu) |
| Projekt | löschen | ✅ `deleted` | Auftrag Abschnitt 17 verlangt das ausdrücklich |
| Massaufnahme | erstellen/ändern/löschen | ✅ `created`/`updated`/`deleted` | echte Fachaktion, analog Projekt |
| Massaufnahme | Foto/Skizze hinzufügen/löschen | ⏸ nicht separat, siehe 38.6 | fällt bereits als `updated` an (Foto-/Skizzenpfade sind Spalten derselben Zeile), eigene Aktion bräuchte Feld-Diffing – laut Abschnitt 10 für v2.30 ausdrücklich nicht vorgesehen |
| Massaufnahme | Status | – nicht vorhanden | kein Statusfeld auf `measurements` |
| Ausmass | erstellen/ändern/löschen | ✅ `created`/`updated`/`deleted` | echte Fachaktion, analog Projekt |
| Report | erstellen/ändern/löschen | ✅ `created`/`updated`/`deleted` | echte Fachaktion, analog Projekt |
| jede Tabelle | reines Lesen/Öffnen/Tab-Wechsel/Suche/Filter | ❌ nie | Auftrag Abschnitt 3 schliesst das ausdrücklich aus – kein Trigger auf SELECT |
| Firmen/Profile/System-Admin | jede Aktion | ❌ nicht Teil von v2.30 | ausserhalb des im Auftrag benannten Umfangs (Abschnitt 4: nur Projekte/Massaufnahmen/Ausmass/Reports) |

### 38.3 Architekturentscheidung: eine zentrale `audit_log`-Tabelle

Migration `audit_log_foundation_v2_30` (plus zwei kleine Korrekturen,
siehe 38.5):

```sql
create table public.audit_log (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('project','measurement','ausmass','report')),
  entity_id bigint not null,          -- bewusst KEIN Fremdschlüssel, siehe unten
  action text not null check (action in ('created','updated','deleted','status_changed')),
  description text,
  created_at timestamptz not null default now()
);
```

Abweichungen vom Beispielschema aus dem Auftrag, jeweils anhand der
tatsächlichen DB-Konvention entschieden (Auftrag Abschnitt 5 verlangt
das ausdrücklich):

- `id bigint` statt `uuid` – `projects`/`measurements`/`ausmass`/
  `reports` verwenden durchgehend `bigint`-Identity-Spalten, kein
  einziges dieser vier Tabellen nutzt `uuid` als Primärschlüssel (nur
  `companies`/`profiles` tun das). `entity_id` ist deshalb ebenfalls
  `bigint`, passend zu den tatsächlichen Fremdtabellen (Abschnitt 8 des
  Auftrags: "aktuelle Struktur verwenden").
- **`entity_id` ist absichtlich kein Fremdschlüssel** auf `projects`/
  `measurements`/`ausmass`/`reports` – sonst würde entweder `ON DELETE
  CASCADE` den gerade dokumentierten Verlauf mitlöschen (widerspricht
  Abschnitt 17: "Ja, Historie bleibt") oder `ON DELETE RESTRICT`/`NO
  ACTION` das Löschen des Datensatzes blockieren (derselbe Fehler wie in
  Abschnitt 36.1 für `created_by`/`updated_by` bereits einmal gefunden
  und behoben). `entity_type` + `entity_id` identifizieren den
  Datensatz eindeutig, ohne referenzielle Integrität mit Löschsperre zu
  erzwingen.
- `user_id → profiles(id) on delete set null` – exakt dasselbe Muster
  wie `updated_by` auf den vier Fachtabellen (Abschnitt 36/37): ein
  gelöschter Mitarbeiter darf den Verlauf nicht sperren, nur die
  Personenreferenz wird `NULL` (Auftrag Abschnitt 7).
- `company_id → companies(id) on delete cascade` – anders als bei
  Mitarbeitern ist eine gelöschte **Firma** (echte, vom System-Admin
  ausgelöste Firmenlöschung, Abschnitt 27) der einzige Fall, in dem
  Verlaufseinträge tatsächlich mitgelöscht werden sollen: die Firma
  selbst inklusive aller Daten verschwindet dabei ohnehin vollständig
  und unwiderruflich, ein verwaister Verlaufseintrag ohne zugehörige
  Firma wäre wertlos und ein Datenschutz-Rest. Kein Widerspruch zu
  Abschnitt 17 (der sich auf einzelne Datensätze bezieht, nicht auf eine
  vollständige Firmenlöschung).
- Zwei Indizes: `(company_id, created_at desc)` für eine spätere,
  performante "neueste zuerst"-Historienansicht pro Firma, `(entity_type,
  entity_id)` für eine spätere "Verlauf dieses einen Datensatzes"-Ansicht
  – beide ohne zusätzliche Abfragen in v2.30 selbst nötig, siehe 38.6.

### 38.4 Serverseitige Durchsetzung (Auftrag Abschnitt 12/13 – "wichtigste Architekturfrage")

**RLS**: `audit_log` hat RLS aktiv, eine einzige restriktive
`tenant_boundary_audit_log`-Policy (`company_id = my_company_id()`,
gleiches Muster wie alle anderen `tenant_boundary_*`-Policies, bewusst
restriktiv statt permissiv – Lehre aus dem `rinne_fitting_types`-Fund in
Abschnitt 31.2: eine künftige, versehentlich zu weite permissive Policy
würde trotzdem von dieser restriktiven Grenze eingefangen). Eine
zusätzliche permissive `audit_log_select`-Policy (`using(true)`) regelt
nur *welche Zeilen unter der bereits gesetzten Firmengrenze* sichtbar
sind (praktisch: alle der eigenen Firma) – **keine INSERT/UPDATE/
DELETE-Policy für `authenticated` existiert überhaupt**, wie vom Auftrag
ausdrücklich verlangt ("Nicht einfach eine offene INSERT-RLS-Policy auf
audit_log bauen"). Zusätzlich `REVOKE ALL ... FROM anon, authenticated,
public` und nur `GRANT SELECT ... TO authenticated` – doppelte
Absicherung unabhängig von RLS.

**Schreiben ausschliesslich über eine generische `SECURITY DEFINER`-
Trigger-Funktion** `write_audit_log()` (Owner `postgres`, `BYPASSRLS`,
`EXECUTE` von `authenticated`/`anon` entzogen – Trigger-Aufruf braucht
ohnehin kein direktes `EXECUTE`-Recht des auslösenden Benutzers), als
**AFTER INSERT OR UPDATE OR DELETE**-Trigger (nicht BEFORE!) auf allen
vier Tabellen angehängt, parametrisiert über `TG_ARGV[0]`
(`'project'`/`'measurement'`/`'ausmass'`/`'report'`):

```sql
create trigger write_audit_log_projects
  after insert or update or delete on public.projects
  for each row execute function public.write_audit_log('project');
-- analog für measurements/ausmass/reports
```

**AFTER statt BEFORE ist die zentrale Entscheidung für Abschnitt 12**:
ein AFTER-Trigger feuert nur, nachdem die eigentliche INSERT/UPDATE/
DELETE-Anweisung innerhalb derselben Transaktion bereits tatsächlich
angewendet wurde. Schlägt die Anweisung fehl (RLS blockiert, Constraint-
Verletzung, Anwendungsfehler) oder wird die Transaktion zurückgerollt,
feuert der Trigger gar nicht bzw. wird sein Effekt mit zurückgerollt –
ein falscher Verlaufseintrag zu einer nie erfolgten Änderung ist
dadurch strukturell ausgeschlossen, nicht nur per Konvention vermieden.

`user_id` kommt in der Funktion ausschliesslich aus `auth.uid()`
(serverseitig aus dem echten JWT der Datenbankverbindung aufgelöst,
niemals aus einem vom Client mitgeschickten Feld – der Trigger hat
gar keinen Zugriff auf den ursprünglichen REST-Request-Body, nur auf die
tatsächlich geschriebene Zeile). `company_id` kommt bei `projects`
direkt aus der Zeile selbst (deren `company_id` wiederum durch die
bestehende, unveränderte `tenant_boundary_projects`-RLS-Policy bereits
korrekt erzwungen ist), bei den anderen drei Tabellen aus einem
serverseitigen Nachschlag `select company_id from projects where id =
<project_id der Zeile>` – nie aus einem Client-Feld. Kann die Firma
nicht ermittelt werden (seltener Randfall: `project_id` ist bereits
`NULL`, siehe 38.1), wird **kein** Log-Eintrag geschrieben, statt einer
falschen oder leeren Firmenzuordnung.

### 38.5 Zwei Korrekturen während der Implementierung

Zwei generische `record`-Feldzugriffe in `write_audit_log()` schlugen
beim ersten Test fehl, weil Postgres einen zusammengesetzten SQL-
Ausdruck mit einem `record`-Feld auch dann vollständig auszuwerten
versucht, wenn die Spalte auf der tatsächlichen Zeile gar nicht
existiert (z. B. `new.archived` bei einer `reports`-Zeile). Behoben durch
echte, verschachtelte `IF`-Blöcke pro `entity_type` statt eines
einzelnen zusammengesetzten `CASE`/`AND`-Ausdrucks (Migrationen
`audit_log_write_function_record_fix_v2_30` und
`audit_log_write_function_status_change_fix_v2_30`) – reine
Implementierungskorrektur während des Testens dieser Aufgabe, keine
nachträgliche Änderung an bereits ausgeliefertem Verhalten.

### 38.6 Was v2.30 bewusst NICHT tut (Auftrag Abschnitt 3/10/11/14/16/20)

- **Kein Feld-Diffing, keine alten/neuen Werte.** `description` ist ein
  einzelner, kurzer Textwert (Projektname / Massaufnahme-Titel-oder-Typ /
  Ausmass-Titel-oder-Typ / Auftragsnummer-oder-Kunde des Reports) –
  keine JSON-Momentaufnahme der ganzen Zeile, keine Passwörter/Tokens/
  vollständigen Formulardaten (Abschnitt 11).
- **Kein Foto-/Skizzen-spezifisches Logging.** Ein Foto/eine Skizze
  hinzuzufügen ist technisch ein `UPDATE` auf dieselbe `measurements`-
  Zeile (die Pfade liegen als Spalten/JSON-Array in derselben Zeile) –
  das erzeugt automatisch einen `updated`-Eintrag, ohne dass der Trigger
  dafür zwischen "Foto geändert" und "Titel geändert" unterscheiden
  müsste. Eine solche Unterscheidung würde Feld-Diffing voraussetzen,
  das für v2.30 ausdrücklich nicht vorgesehen ist.
- **Kein UI.** Kein neuer Menüpunkt, kein Verlaufsbildschirm, keine
  Anzeige irgendwo in `index.html`/`js/*.js` – ausschliesslich
  Datenbank-Änderungen in dieser Version (Auftrag Abschnitt 14: "Die
  eigentliche komfortable Historienansicht kommt danach").
- **Keine zusätzlichen Abfragen im normalen Betrieb.** Der komplette
  Mechanismus läuft ausschliesslich serverseitig innerhalb der ohnehin
  bereits stattfindenden INSERT/UPDATE/DELETE-Transaktion – kein
  zusätzlicher Round-Trip vom Client, kein N+1 (Abschnitt 16).
- **Bekannte, akzeptierte Häufungs-Randfälle** (dokumentiert statt
  verschwiegen): (1) Der Foto-/Skizzen-Upload-Ablauf einer neuen
  Massaufnahme legt zuerst eine Platzhalterzeile an und aktualisiert sie
  danach (`js/16-massaufnahme-formular.js`) – das erzeugt für einen
  einzigen, aus Nutzersicht einmaligen Speichervorgang zwei Einträge
  (`created` + `updated`). (2) Schlägt dieser Ablauf fehl, wird die
  Platzhalterzeile wieder gelöscht – das erzeugt `created` + `deleted`
  für einen fehlgeschlagenen Versuch. Beides ist funktional korrekt
  (die Aktionen sind real passiert), aber nicht "schön" – eine spätere
  Version könnte das mit einer minimalen Karenzzeit/Deduplizierung
  glätten, für v2.30 bewusst nicht gebaut (kein Diffing/keine
  Sonderlogik pro Aufrufmuster, siehe Wichtigster-Punkt des Auftrags).

### 38.7 Tests (Auftrag Abschnitt 19, alle in `begin;…rollback;` mit
temporärer Wegwerf-Firma `99999999-9999-9999-9999-999999999999`, real
committete Mitarbeiter Mike Ledermann/Phillipp Wegmueller nur innerhalb
der Transaktion temporär umgehängt, danach automatisch zurückgerollt)

| Test | Ergebnis |
|---|---|
| A: Mike erstellt Projekt (mit gefälschtem `created_by`/`created_at` im Insert-Payload) | `audit_log`-Eintrag `action='created'`, `user_id`=Mike (echter `auth.uid()`, nicht die gefälschte UUID aus dem Payload) |
| B: Phillipp ändert dasselbe Projekt | `action='updated'`, `user_id`=Phillipp |
| Status: Mike archiviert das Projekt | `action='status_changed'` (nicht `updated`) – `archived` alt≠neu korrekt erkannt |
| C: Phillipp erstellt Massaufnahme, Mike ändert sie | `created` (Phillipp) + `updated` (Mike) |
| D: Mike erstellt Ausmass, Phillipp ändert es | `created` (Mike) + `updated` (Phillipp) |
| E: Phillipp erstellt Report, Mike ändert ihn | `created` (Phillipp) + `updated` (Mike) |
| F: Cross-Tenant – Phillipp (Wegwerf-Firma) liest `audit_log` gefiltert auf die echte `company_id` von PETER KÜNZI AG | 0 sichtbare Zeilen |
| F: Phillipp liest `audit_log` der eigenen (Wegwerf-)Firma | alle 9 bis dahin erzeugten Zeilen sichtbar |
| G: Phillipp versucht einen direkten `INSERT` in `audit_log` (fremde `company_id`=PETER KÜNZI AG, fremder `user_id`=Mike) | `insufficient_privilege` – abgelehnt, kein Log-Eintrag entstanden |
| I: Mike löscht den zuvor erstellten Report | `action='deleted'`-Eintrag existiert für genau diese `entity_id`, obwohl die `reports`-Zeile selbst weg ist |
| H: Phillipp (Mitarbeiter) wird über `DELETE FROM profiles` entfernt | Löschung erfolgreich; genau die 4 `audit_log`-Zeilen, in denen Phillipp Akteur war, haben danach `user_id=NULL`; die anderen 5 (Mike) bleiben unverändert zugeordnet; `measurements.created_by` (zeigt auf `auth.users`, nicht `profiles`) bleibt unverändert gesetzt – konsistent mit dem in Abschnitt 36 dokumentierten Verhalten der Mitarbeiterentfernung |
| I: Mike löscht das Projekt selbst (am Ende) | `action='deleted'`-Eintrag mit korrektem Projektnamen in `description` existiert, obwohl die `projects`-Zeile selbst weg ist |

Nach der gesamten Transaktion (ohne `COMMIT`) erneut geprüft: keine
Wegwerf-Firma, kein Test-Projekt, kein `audit_log`-Rest, Phillipp
Wegmueller weiterhin real vorhanden, PETER KÜNZI AG unverändert
(`subscription_status`/`updated_at` identisch zum Stand vor dieser
Aufgabe) – die gesamte Testreihe hat keine einzige echte Datenänderung
hinterlassen.

**Zusätzlich real festgestellt (nicht Teil dieser Aufgabe, hier nur
dokumentiert):** zum Zeitpunkt dieser Prüfung existiert neben PETER
KÜNZI AG inzwischen eine zweite, echte Firma ("Testfirma", `subscription_
status:'trial'`, `created_at` 2026-09-01) – eine reale, ausserhalb dieser
Sitzung über die Self-Service-/System-Admin-Registrierung erfolgte
Nutzung, keine Test-Altlast dieser oder einer früheren Aufgabe. Nicht
verändert, nicht für die Tests verwendet (alle Tests liefen wie oben
beschrieben gegen eine eigene, nie committete Wegwerf-Firma).

`get_advisors(type:'security')` nach Abschluss erneut geprüft: keine neue
Warnung durch `audit_log`/`write_audit_log()` – die Funktion taucht
korrekt **nicht** unter "von `authenticated` per RPC aufrufbar" auf
(anders als z. B. `my_company_id()`, das als eigenständige RPC-Funktion
absichtlich aufrufbar ist). Alle übrigen Warnungen sind bereits aus
früheren Versionen bekannt (`search_path`-Hinweise auf ältere
Funktionen, deaktivierter Leaked-Password-Schutz) und nicht Teil dieser
Aufgabe.

### 38.8 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei (kein
  Frontend-Code in dieser Version verändert).
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (608/608 – keine Struktur-/UI-Änderung).
- `git diff --stat`: **kein** JS/HTML in dieser Version geändert, nur
  `CLAUDE.md` und drei SQL-Migrationen. Massaufnahme (alle neun
  Fachfunktionen), Ausmass-/Regierapport-Berechnungen, PDF-Layout,
  Storage, System-Admin, Trial/Status, Firmenlöschung, Mitarbeiter-
  anlage/-entfernung, Login: keine Codeänderung, daher kein
  eigenständiger Funktionstest dieser Bereiche nötig.
- Produktivdaten vor/während/nach der gesamten Aufgabe geprüft: 1 Firma
  (PETER KÜNZI AG) + 1 real ausserhalb dieser Sitzung entstandene
  Testfirma (siehe 38.7), 13 Profile, 4 Projekte, 13 Massaufnahmen, 2
  Ausmasse, 4 Reports, **0** `audit_log`-Zeilen (Tabelle ist neu, noch
  keine reale Nutzung seit Deploy) – exakt der erwartete Zustand.
- PETER KÜNZI AG erneut geprüft: unverändert.
- Live-Klicktest im Browser (Projekt/Massaufnahme/Ausmass/Report anlegen/
  ändern/löschen und `audit_log` danach per SQL einsehen) **in dieser
  Sitzung technisch nicht möglich** – Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in
  jeder vorherigen Sitzung. **Das wird hier ausdrücklich nicht als
  getestet behauptet.** Alle in 38.7 dokumentierten Ergebnisse sind
  direkte Trigger-/RLS-Simulationen gegen das echte Produktivschema.

### 38.9 Offene Punkte für v2.31

- Kein Live-Klicktest im Browser möglich (siehe 38.8).
- **Keine Oberfläche.** Eine tatsächliche Änderungsverlauf-Ansicht (pro
  Datensatz oder pro Firma, mit Benutzername/Zeit/Aktion) ist bewusst
  nicht Teil von v2.30 und folgt als eigener, späterer Auftrag (Auftrag
  Abschnitt 14).
- Die in 38.6 dokumentierten Häufungs-Randfälle (Platzhalterzeile bei
  neuen Foto-/Skizzen-Massaufnahmen erzeugt zwei statt einem Eintrag)
  sind bewusst nicht geglättet.
- `audit_log` deckt ausschliesslich `projects`/`measurements`/`ausmass`/
  `reports` ab – Firmen-, Profil- und System-Admin-Aktionen (Trial/
  Status/Firmenlöschung/Mitarbeiteranlage) sind bewusst **nicht**
  Teil dieser Grundlage, wie im Auftrag Abschnitt 4 abgegrenzt.
- Beschreibungstexte (`description`) sind einfache, kurze Strings ohne
  Mehrsprachigkeit/Formatierung – für eine spätere UI ausreichend als
  Rohdaten, aber noch nicht als fertiger Anzeige-Text gedacht.

## 39. ÄNDERUNGSVERLAUF – BENUTZEROBERFLÄCHE — VERSION 2.31

Baut auf der in v2.30 (Abschnitt 38) fertiggestellten `audit_log`-
Grundlage auf. Reine Leseoberfläche – keine einzige Zeile Datenbank-
Sicherheit aus v2.30 wurde angefasst.

### 39.1 Bestandsaufnahme (frisch geprüft, nicht aus v2.30 übernommen)

- `audit_log`-Schema live erneut abgefragt: `id bigint`, `company_id
  uuid not null`, `user_id uuid`, `entity_type text`, `entity_id
  bigint`, `action text`, `description text`, `created_at timestamptz`
  – unverändert identisch zu Abschnitt 38.3.
- Produktivstand zu Beginn dieser Aufgabe: **0 Zeilen** in `audit_log`
  (Tabelle existiert seit v2.30, noch keine reale Nutzung seit Deploy).
  Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung war
  daher zu diesem Zeitpunkt nirgends real vorhanden – die UI ist
  trotzdem so gebaut, dass sie mehrere Einträge pro Datensatz einfach
  chronologisch untereinander zeigt, ohne sie fälschlich zu einem
  Eintrag zusammenzufassen (Auftrag Abschnitt 17: keine nachträgliche
  Umdeutung/Deduplizierung).
- Projekte haben **keine** eigene Detailansicht/kein eigenes Edit-Modal
  – sie werden ausschliesslich als Karten (`project-row`,
  `js/09-projekte.js`) mit auf-/zuklappbaren Listen für Rapporte/
  Massaufnahmen/Ausmasse/Dateien direkt in `#projectsModal` verwaltet.
  Massaufnahme/Ausmass haben je ein eigenes Bearbeiten-Modal
  (`#measurementEditModal`/`#ausmassEditModal`) mit einer bereits
  vorhandenen dezenten Ersteller-/Bearbeiter-Zeile (`#measMetaInfo`/
  `#amMetaInfo`, aus Abschnitt 36/37). Regierapport ist kein Modal,
  sondern ein eigener Vollbild-Screen (`#reportScreen`).
- **Wichtiger Fund für Abschnitt 3/4 des Auftrags:** `audit_log` speichert
  für `entity_type` ∈ {`measurement`,`ausmass`,`report`} **keine**
  `project_id` – nur `entity_type`+`entity_id` der jeweiligen Zeile
  selbst. Eine "Verlauf des Projekts inkl. seiner Massaufnahmen"-Ansicht
  liesse sich nur für **noch existierende** Massaufnahmen sauber
  herleiten (Join `measurements.id = audit_log.entity_id` und
  `measurements.project_id = <Projekt>`) – für bereits **gelöschte**
  Massaufnahmen (`action='deleted'`) ist die Projektzugehörigkeit aus
  `audit_log` allein **nicht mehr rekonstruierbar**, da weder ein
  `project_id`-Feld noch ein Fremdschlüssel auf die (nicht mehr
  existierende) Zeile vorhanden ist. Ein Join, der nur die noch
  existierenden Massaufnahmen einschliesst, wäre eine **unsaubere,
  irreführende Teil-Verknüpfung** (sieht wie eine vollständige Historie
  aus, verschluckt aber lautlos gelöschte Massaufnahmen) – genau das
  soll laut Auftrag Abschnitt 3 vermieden werden ("Wenn nicht: nur den
  direkten Projektverlauf anzeigen und im Report dokumentieren").
  **Entscheidung**: Der Projekt-Verlauf zeigt ausschliesslich die
  direkten `entity_type='project'`-Einträge dieses einen Projekts.
  Dieselbe Prüfung gilt identisch für Ausmass/Report (Abschnitt 39.5).

### 39.2 Architektur: eine wiederverwendbare Komponente statt vier Kopien

Neue Datei `js/23-verlauf.js` (in `index.html`/`sw.js` eingebunden,
lädt nach den Fachmodulen, vor `js/18-app-start.js`). Kernfunktionen:

- `loadVerlauf(box, entityType, entityId)` – lädt `audit_log` für genau
  einen Datensatz (`select("*").eq("entity_type",…).eq("entity_id",…)
  .order("created_at",{ascending:false}).limit(50)`) und rendert die
  Filterleiste + Liste in `box`.
- `toggleVerlaufBox(box, btn, entityType, entityId)` – öffnet/schliesst
  den Container nach demselben Auf-/Zuklapp-Muster wie die bereits
  vorhandenen Massaufnahmen-/Ausmass-/Rapporte-/Dateien-Listen im
  Projekt (`.report-list.open`), lädt beim ersten Öffnen einmalig nach.
- `updateVerlaufToggleVisibility(btn, box, entityId)` – blendet den
  Verlauf-Knopf aus, solange kein gespeicherter Datensatz existiert
  (neue, ungespeicherte Massaufnahme/Ausmass/Rapport hat noch keine
  Historie), und schliesst/leert einen evtl. noch offenen Verlauf des
  vorherigen Datensatzes beim Wechsel.
- Ein einziger, global delegierter Klick-Handler für die Filter-Knöpfe
  (`[data-verlauf-filter]`) statt vier separater Listener – der Filter
  arbeitet rein clientseitig auf den bereits geladenen 50 Zeilen (siehe
  39.4), keine erneute Abfrage pro Klick.

**Vier Aufrufstellen, keine kopierte Logik:**
- `js/09-projekte.js`: neuer Knopf „🕒 Verlauf anzeigen" in
  `project-row-actions` + neuer `data-verlauf-body`-Container, im
  bestehenden, bereits delegierten Klick-Handler von `#projectList`
  behandelt wie `data-toggle-measurements`/`-ausmass`/`-files`.
- `js/10-massaufnahme.js`: Knopf/Container direkt unter `#measMetaInfo`
  in `#measurementEditModal`, Sichtbarkeit über den bereits bestehenden
  `updateMeasFormTitle()`-Hook (läuft sowohl beim Öffnen als auch beim
  Neuanlegen, siehe Abschnitt 36).
- `js/17-ausmass.js`: identisches Muster über `updateAmFormTitle()` in
  `#ausmassEditModal`.
- `js/08-katalog-blitzschutz.js`/`js/09-projekte.js`/
  `js/04-start-suche.js`: Knopf/Container im Aktionsbereich von
  `#reportScreen`, Sichtbarkeit an den vier Stellen aktualisiert, an
  denen sich `currentReportId` ändert (Rapport öffnen, neuer Rapport,
  nach erfolgreichem Speichern, "Alles löschen").

### 39.3 Darstellung (Auftrag Abschnitt 5/6/7/8)

Neueste Einträge oben (`order("created_at",{ascending:false})`).
Pro Eintrag: Datum/Uhrzeit im Format `01.09.2026 · 21:15` (eigene
`verlaufFormatWann()`, Schweizer Datumsformat), 👤 Mitarbeitername
prominent, deutsche Aktionsbezeichnung als kleines Badge:

| technisch | UI |
|---|---|
| `created` | Erstellt |
| `updated` | Geändert |
| `deleted` | Gelöscht |
| `status_changed` | Status geändert |

Beschreibung: vorhandene `description` wird angezeigt; ist sie leer
(z. B. ein Report ganz ohne Auftrags-Nr./Kunde), erzeugt
`verlaufEntryText()` einen verständlichen Ersatztext aus Entität+Aktion
(„Regierapport gelöscht" usw.) – **nie** rohe Metadaten, **nie** ein
Versuch, den (evtl. gelöschten) Originaldatensatz nachzuladen (Auftrag
Abschnitt 8: „Massaufnahme gelöscht" bleibt verständlich, auch wenn die
Massaufnahme selbst nicht mehr existiert – `entity_id` wird dafür nie
nachgeschlagen, nur `description` bzw. der Fallback verwendet).

### 39.4 Benutzer, gelöschte Mitarbeiter, Performance (Auftrag Abschnitt 9/10)

Benutzer werden über die **bereits geladene** `allProfiles`-Liste
(`profileName()`, `js/01-basis.js`, seit Version 2.28 in Gebrauch)
aufgelöst – **keine** zusätzliche Auth-/Profile-Abfrage aus der neuen
Datei heraus. `user_id = NULL` (gelöschter Mitarbeiter, siehe Abschnitt
38.3/38.7) und ein `user_id`, das `profileName()` nicht auflösen kann,
führen beide einheitlich zu „Unbekannter Benutzer".

Performance: eine einzige Abfrage pro Öffnen (`limit(50)`, wie im
Auftrag empfohlen), keine N+1-Abfragen (keine Profile-Einzelabfrage pro
Zeile, kein Nachladen des Originaldatensatzes). Es existierte keine
bestehende Paging-Infrastruktur für "einzelner Datensatz, chronologisch"
(die vorhandenen `recentCount`/`.limit(30)`-Muster gelten für
"neueste N über alle Datensätze", ein anderes Konzept) – deshalb bewusst
ein fester Deckel von 50 statt einer neu gebauten Paginierung, wie vom
Auftrag als Fallback vorgesehen ("Wenn es bereits eine passende
Paging-Infrastruktur gibt: diese verwenden" – gab es hier nicht).

### 39.5 Massaufnahmen/Ausmass/Reports im Projekt-Verlauf – bewusst NICHT integriert

Siehe 39.1: `audit_log` speichert für Massaufnahme/Ausmass/Report keine
`project_id`, ein Join wäre nur für noch existierende Zeilen möglich und
damit bei gelöschten Massaufnahmen/Ausmassen/Reports lückenhaft und
irreführend. Der Projekt-Verlauf zeigt deshalb ausschliesslich die
direkten `entity_type='project'`-Einträge. Massaufnahme/Ausmass/Report
haben stattdessen **je ihren eigenen** Verlauf-Knopf direkt in ihrem
eigenen Bearbeiten-Kontext (39.2) – wer wissen will, was an einer
bestimmten Massaufnahme geschah, öffnet sie und schaut dort nach, statt
sich auf eine unvollständige Projekt-Gesamtansicht zu verlassen. Keine
komplexe rekursive Historie gebaut, wie vom Auftrag ausdrücklich
untersagt.

### 39.6 Filter, leere Historie, Fehlerbehandlung (Auftrag Abschnitt 11/12/13)

Fünf Filter-Knöpfe (Alle/Erstellt/Geändert/Gelöscht/Status geändert),
rein clientseitig über die bereits geladenen 50 Zeilen – kein
zusätzliches Such-/Filtersystem. Keine Einträge → „Noch keine
Aktivitäten vorhanden." (keine Fehlermeldung). Schlägt die Abfrage selbst
fehl (Netzwerk/RLS/sonstiger Fehler) → eigene, rot hervorgehobene
Meldung „Verlauf konnte nicht geladen werden: …" **innerhalb** des
Verlauf-Containers – die umgebende Projekt-/Massaufnahme-/Ausmass-/
Rapport-Ansicht bleibt vollständig bedienbar, der Verlauf ist eine reine
Zusatzfunktion und kann sie nicht blockieren.

### 39.7 Sicherheitsmodell (Auftrag Abschnitt 14/15) – unverändert v2.30

Die UI liest ausschliesslich über `sb.from("audit_log").select(...)` –
**kein** `service_role`, **kein** RLS-Bypass, **kein** vom Client
mitgeschickter `company_id`-Filter (die restriktive
`tenant_boundary_audit_log`-Policy aus Abschnitt 38.4 filtert das
automatisch, unabhängig davon, wonach die UI fragt – bewusst so gebaut,
damit `entity_id` niemals als Ersatz für echte Tenant-Sicherheit
missverstanden werden kann, siehe 39.8). Keine einzige Zeile der in
v2.30 eingerichteten RLS-Policy oder der `write_audit_log()`-Funktion
wurde für diese Aufgabe angefasst – reine Leseoberfläche.

### 39.8 Tests (alle in `begin;…rollback;`, zwei temporäre Wegwerf-Firmen,
nie PETER KÜNZI AG, per SQL exakt denselben Abfragepfad simuliert, den
die UI über PostgREST auch verwendet)

| Test | Ergebnis |
|---|---|
| Mike (Firma A) erstellt+ändert Projekt, liest danach mit der exakten UI-Abfrage (`entity_type='project', entity_id=…`) | 2 Zeilen sichtbar (created+updated) |
| Phillipp (Firma B) versucht dieselbe `entity_id` zu lesen (Cross-Tenant über bekannte fremde ID) | 0 Zeilen |
| Phillipp versucht nach `company_id` von Firma A zu filtern | 0 Zeilen |
| Phillipp versucht mit einer bekannten, echten `entity_id` von PETER KÜNZI AG (`project id=1`, "Home") zu lesen | 0 Zeilen |
| Direkter `INSERT` in `audit_log` (Fälschungsversuch) | weiterhin `insufficient_privilege` – unverändert blockiert seit v2.30 |
| Mike liest real (kein Rollback nötig, reiner `SELECT`) `audit_log` für das echte PETER-KÜNZI-Projekt `id=1` mit der exakten UI-Abfrage | läuft fehlerfrei durch (0 Zeilen, da `audit_log` aktuell noch leer, siehe 39.1) – bestätigt, dass die UI-Abfrage gegen echte Produktivdaten funktioniert |

Nach der gesamten Transaktion erneut geprüft: keine Wegwerf-Firmen, keine
Test-Projekte, keine Test-Zeilen in `audit_log`, `audit_log` weiterhin
insgesamt leer, PETER KÜNZI AG (`updated_at`) unverändert.

### 39.9 Regressionstest

- `node --check` über alle `js/*.js` (inkl. neuer `js/23-verlauf.js`)
  und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen (612/612,
  vorher 608/608).
- Keine Datenbank-Migration in dieser Aufgabe (rein lesende Oberfläche
  auf der bestehenden v2.30-Struktur) – `get_advisors(type:'security')`
  nach Abschluss erneut geprüft: identisch zum Stand nach v2.30, keine
  neue Warnung.
- Login, Projektliste, Projekt öffnen/bearbeiten, Massaufnahme öffnen,
  Ausmass, Regierapport, System-Admin, Mitarbeiterverwaltung: keine
  dieser Dateien/Funktionen inhaltlich verändert (nur je ein neuer
  Knopf/Container ergänzt und ein bestehender Hook um einen zusätzlichen
  Funktionsaufruf erweitert) – kein eigenständiger Fachfunktionstest
  dieser Bereiche nötig, ihre RLS-/Berechtigungsgrundlage ist unverändert
  und war bereits Gegenstand der Audits in Abschnitt 31/33.
- Nebenbefund während dieser Aufgabe entdeckt und mitkorrigiert:
  `js/22-system-admin.js` fehlte seit Version 2.17 in der
  Service-Worker-Offline-Liste (`sw.js`, `SHELL`-Array) – der
  System-Admin-Bereich wäre offline/im PWA-Cache nicht verfügbar
  gewesen. Ergänzt, zusammen mit der neuen `js/23-verlauf.js`.
- Live-Klicktest im Browser (Verlauf öffnen/schliessen, Filter, leere
  Historie, mehrere Mitarbeiter, gelöschter Mitarbeiter, gelöschter
  Datensatz, Cross-Tenant über die echte UI statt SQL-Simulation)
  **in dieser Sitzung technisch nicht möglich** – Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt, wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich
  nicht als getestet behauptet.** Alle in 39.8 dokumentierten Ergebnisse
  sind direkte RLS-Simulationen gegen das echte Produktivschema mit der
  exakt gleichen Abfrage, die die neue UI verwendet.

### 39.10 Offene Punkte für v2.32

- Kein Live-Klicktest im Browser möglich (siehe 39.9).
- Kein Feld-Diffing (alte/neue Werte) – wie im Auftrag ausdrücklich
  ausgeschlossen, weiterhin nur Wer/Wann/Aktion/Beschreibung.
- Projekt-Verlauf zeigt bewusst nicht die Aktivitäten zugehöriger
  Massaufnahmen/Ausmasse/Reports (siehe 39.1/39.5) – falls das später
  gewünscht wird, müsste `audit_log` dafür zusätzlich `project_id`
  mitführen (eigene, bewusste Schema-Erweiterung, kein UI-Thema).
  Bis dahin: je eigener Verlauf-Knopf pro Massaufnahme/Ausmass/Report.
  direkt in deren eigenem Bearbeiten-Kontext.
- Fester Deckel von 50 Einträgen ohne "mehr laden" – für die aktuelle
  Nutzungsgrösse ausreichend, bei Bedarf später um echte Paginierung
  erweiterbar.
- Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung bei
  neuen Foto-Massaufnahmen ist weiterhin nicht bereinigt – die UI zeigt
  vorhandene `audit_log`-Einträge unverändert korrekt an, ohne sie
  automatisch umzudeuten (wie vom Auftrag verlangt).

## 40. AUDIT-LOG: SAUBERER PROJEKTBEZUG — VERSION 2.32

Schliesst die in Abschnitt 39.1/39.5 offengelegte Lücke: `audit_log`
speicherte keine `project_id`, der Projekt-Verlauf aus v2.31 zeigte
deshalb nur die direkten Projekt-Einträge, nicht die seiner
Massaufnahmen/Ausmasse/Reports.

### 40.1 Bestandsaufnahme (frisch geprüft, nicht aus v2.31 übernommen)

- `measurements.project_id`, `ausmass.project_id`, `reports.project_id`
  – alle drei live erneut per `information_schema.columns` geprüft:
  **jede der drei Tabellen hat bereits eine eigene, direkte
  `project_id bigint`-Spalte** (nullable, `ON DELETE SET NULL` auf den
  Fremdschlüssel zu `projects`, seit v2.20/Storage-Migration
  unverändert). Es musste **keine** neue oder indirekte Relation
  gefunden werden – die in Abschnitt 39.1 vermutete Schwierigkeit lag
  ausschliesslich in `audit_log` selbst (das dieses bereits vorhandene
  Feld bisher nicht mitschrieb), nicht in der Fachdatenstruktur.
  Ergebnis für den Auftrag ("wenn eine Tabelle keine eindeutige
  Projektbeziehung besitzt, offen melden"): **alle vier Entitätstypen
  haben eine eindeutige, direkte Projektbeziehung** – keine Entität
  musste unintegriert bleiben.
- `write_audit_log()` (v2.30/v2.31, unverändert vor dieser Aufgabe)
  erneut vollständig gelesen: `v_row` (das `NEW`/`OLD` der jeweiligen
  Zeile) liegt im Trigger bereits vollständig vor – `v_row.project_id`
  war für measurement/ausmass/report also schon die ganze Zeit lesbar,
  wurde nur nicht in `audit_log` mitgeschrieben.
- Produktivstand zu Beginn dieser Aufgabe: **weiterhin 0 Zeilen** in
  `audit_log` (unverändert seit v2.30/v2.31 – unter „22. Bestehende
  Audit-Einträge" des Auftrags entsprechend trivial: nichts zu
  migrieren, nichts zu erfinden).

### 40.2 Schema-Erweiterung (Migration `audit_log_project_id_v2_32`)

```sql
alter table public.audit_log add column project_id bigint;
create index audit_log_project_created_idx on public.audit_log (project_id, created_at desc);
```

**`project_id` ist bewusst kein Fremdschlüssel** – exakt dieselbe
Begründung wie bei `entity_id` in Abschnitt 38.3: ein Fremdschlüssel mit
`ON DELETE CASCADE` würde die Audit-Historie beim Löschen des Projekts
mitlöschen (widerspricht Auftrag Abschnitt 9 ausdrücklich), ein
Fremdschlüssel mit `RESTRICT`/`NO ACTION` würde das Löschen des
Projekts selbst blockieren (derselbe Fehlertyp wie in Abschnitt 36.1
bereits einmal gefunden und behoben). `entity_id`+`project_id` bleiben
beide reine, ungeschützte Wertespalten – die referenzielle Integrität
wird stattdessen ausschliesslich serverseitig zum Schreibzeitpunkt
sichergestellt (40.3), nicht nachträglich per Fremdschlüssel erzwungen.

### 40.3 Serverseitige Ermittlung je Entitätstyp (Auftrag Abschnitt 3–7)

`write_audit_log()` erweitert (`v_project_id bigint` zusätzlich zu den
bestehenden Variablen), Zuweisung ausschliesslich aus der bereits im
Trigger vorliegenden Zeile, **nie** aus einem separaten Client-Feld:

| `entity_type` | `project_id`-Quelle |
|---|---|
| `project` | `v_row.id` (die eigene Projekt-ID) |
| `measurement` | `v_row.project_id` (Spalte der betroffenen Zeile) |
| `ausmass` | `v_row.project_id` (Spalte der betroffenen Zeile) |
| `report` | `v_row.project_id` (Spalte der betroffenen Zeile) |

Bei `entity_type='project'` ist `project_id` bewusst die **eigene**
`id` (nicht `NULL`) – dadurch liefert eine einzige Abfrage
`where project_id = X` sowohl die Projekt-Einträge selbst als auch die
seiner Massaufnahmen/Ausmasse/Reports, ohne zwei separate Abfragen oder
einen `OR`-Ausdruck im Frontend (Auftrag Abschnitt 15: „eine
Audit-Abfrage mit project_id").

**Kein Client-Feld beteiligt**: der Trigger liest `v_row` (also
`NEW`/`OLD`) direkt aus der tatsächlich geschriebenen Datenbankzeile –
ein Client kann über den REST-Request kein zusätzliches `project_id`-Feld
an `audit_log` selbst übergeben, weil dort (wie seit v2.30) überhaupt
keine INSERT-Policy für `authenticated` existiert (40.6). Empirisch
verifiziert (40.7, Fälschungstest).

### 40.4 DELETE-Ereignisse (Auftrag Abschnitt 8)

Der bestehende Trigger ist bereits **AFTER** INSERT/UPDATE/**DELETE**
(seit v2.30, unverändert) – bei `DELETE` ist `v_row := old`, die Zeile
existiert zu diesem Zeitpunkt zwar nicht mehr in der Fachtabelle, aber
`OLD` liegt im Trigger noch vollständig vor. `v_row.project_id` (bzw.
`v_row.id` bei einem gelöschten Projekt selbst) wird deshalb korrekt aus
`OLD` ermittelt, **bevor** die Zeile endgültig weg ist – exakt wie vom
Auftrag verlangt. Kein neuer Trigger-Typ nötig, das AFTER-DELETE-Verhalten
war strukturell schon vorhanden.

### 40.5 Projektlöschung (Auftrag Abschnitt 9)

Da `project_id` **kein** Fremdschlüssel ist (40.2), hat das Löschen
eines Projekts **keinerlei** Auswirkung auf bereits vorhandene
`audit_log`-Zeilen – weder die des Projekts selbst noch die seiner
Massaufnahmen/Ausmasse/Reports. Alle bleiben mit ihrem ursprünglichen
`project_id`-Wert (der jetzt auf ein nicht mehr existierendes Projekt
zeigt) unverändert bestehen. Empirisch bestätigt (40.7, Test K): nach
dem Löschen eines Test-Projekts waren weiterhin **alle** zuvor erzeugten
Audit-Zeilen (Projekt + Massaufnahme + Ausmass + Report) mit korrektem
`project_id` auffindbar, inklusive des eigenen `deleted`-Eintrags des
Projekts selbst.

### 40.6 RLS – unverändert, keine Abschwächung

Die restriktive `tenant_boundary_audit_log`-Policy aus v2.30
(`company_id = my_company_id()`) wurde **nicht angefasst**. `project_id`
ist ausschliesslich ein zusätzliches, für die neue Abfrage nützliches
Feld – die eigentliche Tenant-Grenze bleibt weiterhin `company_id`,
serverseitig in `write_audit_log()` gesetzt (unverändert seit v2.30).
`project_id` dient nirgends als Ersatz für diese Prüfung: eine Firma B,
die eine `project_id` von Firma A kennt, sieht über
`select … where project_id = X` trotzdem 0 Zeilen, weil die restriktive
Policy zusätzlich `company_id = my_company_id()` verlangt – empirisch
bestätigt (40.7, Cross-Tenant-Test).

### 40.7 Tests (Auftrag Abschnitt 19/20/21, alle in `begin;…rollback;`
mit zwei temporären Wegwerf-Firmen, nie PETER KÜNZI AG)

| Test | Ergebnis |
|---|---|
| A: Projekt erstellen | Audit-Eintrag `entity_type='project'`, `project_id` = eigene Projekt-ID |
| B: Massaufnahme erstellen | `project_id` identisch zum Projekt |
| C: Massaufnahme ändern | `project_id` weiterhin korrekt |
| D: Ausmass erstellen + ändern | `project_id` in beiden Einträgen korrekt |
| E: Report erstellen + ändern | `project_id` in beiden Einträgen korrekt |
| F: Projekt ändern | `project_id` = eigene Projekt-ID (nicht `NULL`) |
| G: Projekt-Verlauf (eine Abfrage `where project_id=X`) | alle 8 bis dahin erzeugten Einträge (Projekt ×2, Massaufnahme ×2, Ausmass ×2, Report ×2) korrekt in einer einzigen Abfrage |
| H/I/J: direkte Massaufnahme-/Ausmass-/Report-Verläufe (`entity_type`+`entity_id`, unverändert seit v2.31) | weiterhin exakt nur die eigenen Einträge, keine Regression |
| L: Report löschen | `deleted`-Eintrag existiert, `project_id` weiterhin korrekt gesetzt |
| K: Projekt löschen | alle 10 bis dahin erzeugten Einträge (inkl. des Projekts eigenem `deleted`-Eintrag) weiterhin mit korrektem `project_id` auffindbar |
| Cross-Tenant: Firma B kennt `project_id` von Firma A, filtert direkt danach | 0 Zeilen |
| Client-Manipulation: direkter `INSERT` in `audit_log` mit fremder `company_id`+`project_id` | weiterhin `insufficient_privilege` – unverändert blockiert seit v2.30 |

Nach der gesamten Transaktion erneut geprüft: keine Wegwerf-Firmen, keine
Test-Projekte, keine Test-Zeilen in `audit_log`, `audit_log` insgesamt
weiterhin leer, PETER KÜNZI AG (`updated_at`) unverändert.

### 40.8 Frontend (`js/23-verlauf.js`)

- Neue Funktion `loadProjectVerlauf(box, projectId)` – eine Abfrage
  `select("*").eq("project_id", projectId)`, ersetzt im Projekt-Kontext
  (`js/09-projekte.js`, Knopf „🕒 Verlauf anzeigen" je Projekt-Karte) die
  bisherige `loadVerlauf(box,"project",projectId)`-Abfrage aus v2.31, die
  nur die direkten Projekt-Einträge zeigte.
- Neue Funktion `toggleProjectVerlaufBox(box, btn, projectId)` – gleiches
  Auf-/Zuklapp-Muster wie `toggleVerlaufBox()`, aber für den kombinierten
  Verlauf.
- **`loadVerlauf(box, entityType, entityId)` (direkter Einzel-Verlauf für
  Massaufnahme/Ausmass/Report) bewusst unverändert** – eigener Codepfad,
  keine gemeinsame Query mit dem Projekt-Verlauf, dadurch strukturell
  ausgeschlossen, dass die project_id-Erweiterung diese drei bestehenden
  Verläufe verändert (Auftrag Abschnitt 16, empirisch bestätigt in 40.7
  Test H/I/J).
- Neuer Entitäts-Filter (Alle/Projekt/Massaufnahme/Ausmass/Regierapport),
  nur im kombinierten Projekt-Verlauf sichtbar (im direkten
  Einzel-Verlauf unnötig, da dort ohnehin immer derselbe Typ). Mit dem
  bestehenden Aktions-Filter aus v2.31 (Alle/Erstellt/Geändert/Gelöscht/
  Status geändert) frei kombinierbar – beide sind unabhängige Zustände
  (`actionFilter`/`entityFilter`), rein clientseitig auf den bereits
  geladenen ≤50 Zeilen angewendet, keine zusätzliche Abfrage pro Klick.
- Jeder Eintrag im kombinierten Projekt-Verlauf zeigt zusätzlich ein
  kleines Entitäts-Badge (z. B. „Massaufnahme"), damit erkennbar bleibt,
  worauf sich ein Eintrag bezieht – im direkten Einzel-Verlauf weiterhin
  weggelassen (dort redundant).
- **Keine Duplikate innerhalb einer Ansicht** (Auftrag Abschnitt 17): der
  kombinierte Projekt-Verlauf lädt jede `audit_log`-Zeile genau einmal
  (eine Abfrage, kein Zusammenführen mehrerer Abfragen) – strukturell
  keine Duplizierung möglich. Dass derselbe historische Eintrag sowohl im
  Projekt-Verlauf als auch im direkten Verlauf der jeweiligen
  Massaufnahme/des Ausmasses/Reports sichtbar ist, ist wie im Auftrag
  ausdrücklich festgehalten kein Fehler.
- Limit weiterhin 50 (unverändert aus v2.31, wie vom Auftrag
  vorgegeben), keine neue Paginierung.

### 40.9 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (612/612 – keine HTML-Struktur in dieser Aufgabe verändert, nur
  `js/23-verlauf.js`, `js/09-projekte.js` und `css/01-basis.css`).
- `get_advisors(type:'security')` nach der Migration erneut geprüft:
  identisch zum Stand nach v2.31, keine neue Warnung durch
  `audit_log.project_id`/`write_audit_log()`.
- Massaufnahme-/Ausmass-/Regierapport-Berechnungen, PDF-Layout,
  Materialkataloge, Projektberechnungen: keine dieser Dateien in dieser
  Aufgabe verändert.
- PETER KÜNZI AG vor/nach der Aufgabe erneut geprüft: unverändert
  (`updated_at` identisch), `audit_log` weiterhin insgesamt 0 Zeilen.
- Live-Klicktest im Browser weiterhin nicht möglich – Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt, wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich
  nicht als getestet behauptet.** Alle in 40.7 dokumentierten Ergebnisse
  sind direkte Trigger-/RLS-Simulationen gegen das echte Produktivschema
  mit derselben Abfrage, die die neue UI verwendet.

### 40.10 Offene Punkte für v2.33

- Kein Live-Klicktest im Browser möglich (siehe 40.9).
- Kein Feld-Diffing – wie im Auftrag ausdrücklich ausgeschlossen,
  weiterhin nur Wer/Wann/Aktion/Beschreibung/Entität/Projekt.
- Feste 50er-Obergrenze weiterhin ohne echte Paginierung (unverändert
  aus v2.31, für den Auftrag ausdrücklich nicht gefordert).
- Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung bei
  neuen Foto-Massaufnahmen bleibt unverändert offen.
- Da alle vier Entitätstypen bereits eine direkte `project_id`-Spalte
  hatten (40.1), gibt es keine offene "unklare Beziehung" mehr zu
  dokumentieren – falls künftig eine fünfte auditierte Entität ohne
  eindeutige Projektbeziehung hinzukäme, müsste das analog zu Abschnitt
  7 des Auftrags neu geprüft und ggf. offen gemeldet werden.

## 41. ÄNDERUNGSVERLAUF – FELD-DIFFING — VERSION 2.33

Der Verlauf zeigt erstmals konkrete Feldänderungen statt nur "X geändert"
– bewusst nur für ein kleines, zuverlässiges Feld-Set, nicht für jede
Spalte. Reine Erweiterung von `write_audit_log()`/`js/23-verlauf.js`,
keine Änderung an Fachlogik, Berechnungen oder PDF.

### 41.1 Bestandsaufnahme (frisch geprüft, nicht aus v2.30–v2.32 übernommen)

Alle vier Tabellen live per `information_schema.columns` erneut geprüft.
**Zentraler Befund, der die gesamte Auftrags-Auslegung bestimmt:**
`projects` besteht ausschliesslich aus flachen Text-/Boolean-Spalten
(`name`, `order_no`, `customer`, `object`, `archived`) – **keine**
versteckte JSONB-Struktur. `measurements`, `ausmass` und `reports`
haben dagegen je ein oder zwei grosse `jsonb`-Felder, in denen die
eigentlichen fachlichen Werte liegen:

- `measurements.data` – die kompletten Masswerte **aller neun**
  Massaufnahme-Funktionen (Stücke, Winkel, Segmente, Materialien, …),
  Struktur unterscheidet sich pro `type` fundamental (z. B. `pieces`-Array
  bei Einlaufblech gerade vs. Segmentliste bei Mauerabdeckung).
- `ausmass.positions` – Positionsliste (Array), Struktur variiert nach
  `type` (Offerte erfassen/Blitzschutzausmass).
- `reports.work_entries`/`reports.material_entries` – Arbeits-/
  Materialpositionen als Arrays.

Ein generischer, typübergreifender Feld-Diff **innerhalb** dieser
JSONB-Werte wäre nur mit tiefem, pro-Typ-spezifischem Wissen über neun
verschiedene Massaufnahme-Strukturen (bzw. die Ausmass-/Report-
Positionsformate) möglich – genau das verlangt der Auftrag ausdrücklich
NICHT ("Feld-Diffing muss sich in die vorhandene Speicherung
integrieren", "NICHT pauschal jedes Feld erfassen", "Keine Fachlogik
umbauen"). **Entscheidung**: Feld-Diffing beschränkt sich auf die
flachen, für alle Typen gleich aufgebauten Spalten jeder Tabelle – die
strukturierten JSONB-Werte werden bewusst **nicht** gedifft (siehe
41.7 für die vollständige, offen dokumentierte Begründung).

`write_audit_log()` (v2.30–v2.32) erneut vollständig gelesen: `OLD`/`NEW`
liegen im AFTER-UPDATE-Trigger bereits vollständig vor – exakt wie vom
Auftrag in Abschnitt 3 vermutet, keine Erweiterung der Trigger-Ereignisse
nötig, nur eine zusätzliche Vergleichslogik innerhalb des bestehenden
UPDATE-Zweigs.

### 41.2 Ausgewähltes Feld-Set

| Entität | Felder | Begründung |
|---|---|---|
| `project` | `name` (Projektname), `order_no` (Auftrags-Nr.), `customer` (Auftraggeber), `object` (Adresse) | die vollständige editierbare Oberfläche eines Projekts ausserhalb von `archived` (das separat über `status_changed` läuft) – keine Auslassung, keine Übererfassung |
| `measurement` | `title` (Bezeichnung), `date` (Datum), `note` (Notiz / Masse) | einzige typübergreifend gleich aufgebauten, flachen Fachfelder; `data` bewusst ausgeschlossen (41.1) |
| `ausmass` | `title` (Bezeichnung), `date` (Datum), `note` (Notiz) | analog measurement; `positions` bewusst ausgeschlossen |
| `report` | `date` (Datum), `order_no` (Auftrags-Nr.), `customer` (Auftraggeber), `object` (Objekt / Gebäudeteil), `vat` (MWST) | einzige flachen Kopfdaten-Felder; `work_entries`/`material_entries` bewusst ausgeschlossen |

Bewusst **nicht** aufgenommen (technische Metadaten, Auftrag Abschnitt
2 verbietet das ausdrücklich): `id`, `company_id`, `project_id`,
`created_by`/`created_at`, `updated_by`/`updated_at`, `type` (fachliche
Kategorie, ändert sich in der Praxis nie nach dem Anlegen),
`photo_path`/`sketch_path`/`sketch_paths`/`photo_paths` (Speicherpfade,
kein sinnvoller lesbarer Diff, siehe auch 41.7 zur Platzhalterzeilen-
Problematik).

Deutsche Feldbezeichnungen stammen 1:1 aus den bestehenden Formular-
Labels in `index.html` (z. B. `#newProjectObject`→„Adresse",
`#amNote`→„Notiz", `#measNote`→„Notiz / Masse"), nicht neu erfunden.

### 41.3 Architekturentscheidung: `audit_log.changes jsonb` statt separater Tabelle

Migration `audit_log_field_diffing_v2_33`: eine neue, nullable Spalte
`audit_log.changes jsonb` statt einer zweiten Tabelle
`audit_log_changes` (Auftrag Abschnitt 4, Variante A vs. B). Begründung,
anhand des bestehenden Modells bewertet statt blind übernommen:

- `audit_log` wird bereits jetzt ausschliesslich als **eine** Zeile pro
  Ereignis gelesen (`select("*")`, nie mit einem Join) – die Diffs
  gehören immer und ausschliesslich zu genau diesem einen Ereignis,
  nie eigenständig abgefragt. Eine Kind-Tabelle bräuchte entweder einen
  Join oder eine zweite Abfrage pro Zeile (N+1, Auftrag Abschnitt 21
  ausdrücklich verboten) oder eine aggregierte Subquery – beides
  unnötige Komplexität gegenüber einer eingebetteten Spalte.
- JSONB für "ein paar strukturierte Zusatzwerte an einer Zeile" ist
  bereits durchgehender Stil dieses Schemas (`measurements.data`,
  `ausmass.positions`, `reports.work_entries`, `companies.settings`) –
  passt zur bestehenden Konvention (Auftrag Abschnitt 4: "Bewerten
  anhand des bestehenden audit_log-Modells").
- Erweiterbar: neue Felder pro Entität brauchen keine Schema-Änderung,
  nur eine Anpassung der Whitelist in `write_audit_log()` – erfüllt
  "Die Lösung soll später erweiterbar sein" ohne Migration.
- RLS bleibt unverändert vollständig ausreichend: die bestehende
  restriktive `tenant_boundary_audit_log`-Policy deckt die neue Spalte
  automatisch mit ab (eine Zeile, eine Policy) – bei einer Kind-Tabelle
  hätte eine **eigene** RLS-Policy neu aufgebaut und getestet werden
  müssen, zusätzliches Sicherheitsrisiko ohne Gegenwert.

**Format**: `changes` ist entweder `NULL` (created/deleted/status_changed
ohne betroffenes Feld, oder ein UPDATE ohne Whitelist-Änderung, siehe
41.5) oder ein JSON-Array `[{"field":"name","old":"...","new":"..."}]` –
**ausschliesslich Rohwerte, keine deutschen Labels, keine Formatierung**
in der Datenbank. Übersetzung/Formatierung (Feldname→Label,
NULL→„–", Datum→Schweizer Format) passiert bewusst ausschliesslich im
Frontend (`js/23-verlauf.js`), exakt demselben Muster wie
`VERLAUF_ACTION_LABELS`/`VERLAUF_ENTITY_LABELS` seit v2.30/v2.31 – eine
zentrale Übersetzungsstelle statt in der Datenbank eingefrorener Texte.

### 41.4 Serverseitige Ermittlung (Auftrag Abschnitt 3/19)

`write_audit_log()` erweitert: im bestehenden `UPDATE`-Zweig (nach der
schon vorhandenen `created`/`deleted`/`status_changed`-Ermittlung)
vergleicht die Funktion **ausschliesslich** `OLD.<feld> IS DISTINCT FROM
NEW.<feld>` für die in 41.2 festgelegte Whitelist je `entity_type` –
verschachtelte `IF`-Blöcke pro Entitätstyp (kein zusammengesetzter
Ausdruck), aus demselben, bereits in v2.30 gefundenen Grund: `OLD`/`NEW`
sind in dieser einen, über vier Tabellen wiederverwendeten
Trigger-Funktion generische `record`-Werte, ein Feldzugriff auf eine bei
der aktuellen Tabelle nicht existierende Spalte (z. B. `NEW.title` bei
einem `projects`-Update) wird nur dann nie ausgewertet, wenn er
strukturell in einem eigenen `IF`-Zweig für genau diesen Entitätstyp
steht.

`IS DISTINCT FROM` (statt `<>`/`=`) behandelt `NULL` korrekt als
vergleichbaren Wert (zwei `NULL` gelten als nicht verschieden) – erfüllt
Auftrag Abschnitt 12 direkt, ohne eigene NULL-Sonderfälle im Code.
Abschnitt 13 (Zahlen-/Typ-Präzision, z. B. „1200 vs. 1200.0") betrifft
das gewählte Feld-Set nicht: alle Whitelist-Felder sind `text` oder
`date`, keine Zahlen – ein zusätzlicher, in dieser Version bewusst nicht
gebrauchter Vorteil der Entscheidung aus 41.1/41.2.

**Kein Client-Feld beteiligt**: `OLD`/`NEW` sind die tatsächlich
geschriebene Datenbankzeile, kein vom Client separat mitgeschickter Wert
– ein Client kann nicht behaupten "ich habe Adresse X→Y geändert", ohne
dass die Zeile das tatsächlich zeigt (empirisch verifiziert, 41.6).

### 41.5 Wann wird geloggt/gedifft? (Auftrag Abschnitt 10–12)

- **Mehrere Feldänderungen in einem UPDATE** → ein einziges
  `audit_log`-Ereignis mit mehreren Einträgen in `changes` (Array),
  **nicht** mehrere separate „geändert"-Zeilen – empirisch bestätigt
  (41.6, Test „mehrere Felder gleichzeitig").
- **Kein Whitelist-Feld geändert** (z. B. ein UPDATE, das nur
  `updated_at`/`updated_by` oder ein nicht gedifftes JSONB-Feld
  betrifft) → `changes = NULL`, der Eintrag selbst (`action='updated'`)
  bleibt **weiterhin bestehen**, wie bisher seit v2.30. **Bewusste
  Abweichung von der wörtlichen Auslegung des Auftrags** ("keinen
  sinnlosen 'geändert'-Eintrag erzeugen"): der Auftrag selbst schränkt
  das ausdrücklich ein ("sofern das mit der bestehenden Audit-Logik
  sauber möglich ist" / "Bestehende v2.30/v2.31-Semantik nicht ungewollt
  brechen"). Da `measurements`/`ausmass`/`reports` grosse, bewusst nicht
  gedifftete JSONB-Felder besitzen (41.1), kann aus "kein Whitelist-Feld
  geändert" **nicht** zuverlässig gefolgert werden, dass fachlich
  wirklich nichts passiert ist – ein Benutzer könnte z. B. nur die Länge
  einer Einlaufblech-Position geändert haben, ohne Titel/Datum/Notiz
  anzufassen. Den Log-Eintrag in diesem Fall zu unterdrücken, würde eine
  echte, reale Änderung lautlos aus der Historie verschwinden lassen –
  ein deutlich schwerwiegenderer Fehler als ein gelegentlicher Eintrag
  ohne sichtbaren Diff. Für `projects` (keine ungediffte JSONB-Struktur,
  41.1) wäre eine Unterdrückung zwar sicher möglich gewesen, wurde aber
  aus Konsistenzgründen **einheitlich für alle vier Entitäten** nicht
  gebaut – ein UPDATE erzeugt immer einen Eintrag, der Eintrag zeigt nur
  zusätzlich einen Diff, wenn tatsächlich ein Whitelist-Feld betroffen
  war. Empirisch verifiziert (41.6, Test „keine Änderung").
- **`created`/`deleted`** → `changes` immer `NULL`, kein Diffing (Auftrag
  Abschnitt 17) – der bestehende Beschreibungstext/Fallback aus
  v2.30/v2.31 bleibt unverändert der einzige Kontext.

### 41.6 Tests (Auftrag Abschnitt 25–27, alle in `begin;…rollback;` mit
Wegwerf-Firmen, nie PETER KÜNZI AG)

| Test | Ergebnis |
|---|---|
| Projekt: ein Feld ändern (`object`) | `changes=[{field:"object",old:"Adresse A",new:"Adresse B"}]` |
| Projekt: zwei Felder gleichzeitig (`name`+`order_no`) | ein Eintrag, `changes` mit **beiden** Diffs |
| Projekt: Feld auf `NULL` setzen (`customer`) | `changes=[{field:"customer",old:"Kunde X",new:null}]` |
| Projekt: `NULL` wieder auf Wert | `changes=[{field:"customer",old:null,new:"Kunde Y"}]` |
| Projekt: `UPDATE ... SET name=name` (keine echte Änderung) | `action='updated'` weiterhin vorhanden, `changes=NULL` (kein Fake-Diff) |
| Projekt: `archived` false→true, dann true→false | je `action='status_changed'`, `changes=[{field:"archived",old:false,new:true}]` bzw. umgekehrt – **nie** gemischt mit anderen Feldern |
| Massaufnahme: `title`+`date`+`note` gleichzeitig ändern | ein Eintrag, alle drei Diffs enthalten |
| Ausmass: `note` ändern | Diff korrekt |
| Report: `customer`+`vat` gleichzeitig ändern | ein Eintrag, beide Diffs enthalten |
| Cross-Tenant: Firma B kennt `entity_id`/`project_id` von Firma A | 0 sichtbare Zeilen (unverändert seit v2.30/v2.32) |
| Client-Manipulation: direkter `INSERT` mit erfundenem `changes` (`[{"field":"object","old":"X","new":"FAKE"}]`) | weiterhin `insufficient_privilege` – `changes` ist genauso ungeschützt gegen Client-Schreibzugriff wie jede andere Spalte, da überhaupt keine INSERT-Policy für `authenticated` existiert |
| Echter Diff nach dem Fälschungsversuch erneut gelesen | zeigt weiterhin ausschliesslich den echten, serverseitig ermittelten Wert, unbeeinflusst vom Fälschungsversuch |

Nach jeder Transaktion erneut geprüft: keine Wegwerf-Firmen, keine
Test-Zeilen, `audit_log` insgesamt weiterhin 0 Zeilen (weiterhin keine
reale Nutzung seit Deploy), PETER KÜNZI AG (`updated_at`) unverändert.

### 41.7 Bewusst nicht unterstützte Felder (offen dokumentiert statt improvisiert)

Wie in 41.1 begründet, bleiben folgende Felder **ohne** Feld-Diffing,
weil ein zuverlässiger, generischer Diff ohne Fachlogik-Umbau nicht
möglich ist:

- `measurements.data` (alle neun Massaufnahme-Fachwerte)
- `ausmass.positions`
- `reports.work_entries`/`reports.material_entries`
- Foto-/Skizzenpfade aller Tabellen (kein sinnvoller lesbarer Diff eines
  Speicherpfads, ausserdem bereits von der in v2.30/v2.31 dokumentierten
  Platzhalterzeilen-Häufung betroffen – ein Pfad-Diff dort wäre ohnehin
  irreführend)

Dasselbe gilt unverändert für die in Abschnitt 38.6 dokumentierte
Platzhalterzeilen-Häufung bei neuen Foto-Massaufnahmen: **nicht**
automatisch bereinigt oder rückwirkend verändert (Auftrag Abschnitt 22),
findet dort aber ohnehin keinen künstlichen Diff, da `data`/Fotopfade
nicht gedifft werden.

### 41.8 Frontend (`js/23-verlauf.js`)

- `VERLAUF_FIELD_LABELS` – deutsche Feldbezeichnungen je `entity_type`,
  1:1 aus den bestehenden Formular-Labels übernommen (41.2).
- `verlaufFormatDiffValue(field, v)` – `NULL`/leer → „–", `date`-Felder
  im Schweizer Format, alles andere als Text (kein Zahlen-/Boolean-
  Formatierungsbedarf, siehe 41.4).
- `verlaufChangesHtml(row)` – rendert `row.changes` als kompakte Zeilen
  unterhalb der bestehenden Beschreibung; bei `action='status_changed'`
  und `field='archived'` bewusst **nicht** generisch
  ("archived: false → true"), sondern als "Aktiv → Archiviert"/
  "Archiviert → Aktiv" (Auftrag Abschnitt 18) – einzige Sonderbehandlung,
  alle anderen Felder laufen über denselben generischen Pfad
  ("Label: alt → neu").
- Kein Eintrag ohne `changes` → keine zusätzliche Zeile, weiterhin nur
  der bestehende Aktions-Badge + Beschreibungstext aus v2.30/v2.31
  (Auftrag Abschnitt 14, zweiter Fall).
- Sowohl der kombinierte Projekt-Verlauf als auch alle drei direkten
  Einzel-Verläufe (Massaufnahme/Ausmass/Report) nutzen dieselbe
  `verlaufEntryHtml()`/`verlaufChangesHtml()`-Rendering-Funktion – keine
  vierfach kopierte Anzeige-Logik.

### 41.9 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (612/612 – kein HTML in dieser Aufgabe verändert, nur
  `js/23-verlauf.js` und `css/01-basis.css`).
- `get_advisors(type:'security')` nach der Migration erneut geprüft:
  identisch zum Stand nach v2.32, keine neue Warnung durch
  `audit_log.changes`/`write_audit_log()`.
- Massaufnahme-Berechnungen (alle neun Fachfunktionen), Ausmass-/
  Regierapport-Fachlogik, PDF-Layout, Materialkataloge,
  Projektberechnungen: keine dieser Dateien in dieser Aufgabe verändert.
- Mitarbeiterlöschung/Datensatzlöschung: unverändert (kein Code dort
  angefasst) – `deleted`-Einträge, `entity_id`, `project_id` bleiben wie
  in v2.30/v2.32 dokumentiert erhalten.
- PETER KÜNZI AG vor/nach der Aufgabe erneut geprüft: unverändert,
  `audit_log` weiterhin insgesamt 0 Zeilen.
- Live-Klicktest im Browser weiterhin nicht möglich – Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt, wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich
  nicht als getestet behauptet.** Alle in 41.6 dokumentierten Ergebnisse
  sind direkte Trigger-/RLS-Simulationen gegen das echte Produktivschema.

### 41.10 Offene Punkte für v2.34

- Kein Live-Klicktest im Browser möglich (siehe 41.9).
- Kein Diffing innerhalb `measurements.data`/`ausmass.positions`/
  `reports.work_entries`/`material_entries` – bewusst, siehe 41.1/41.7.
  Eine spätere Version könnte pro Massaufnahme-Typ eine eigene,
  sorgfältig geprüfte Diff-Logik ergänzen, das wäre aber ein
  eigenständiger, deutlich grösserer Auftrag (neun verschiedene
  Strukturen).
- Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung bleibt
  unverändert offen.
- `changes` ist bewusst ungeschützt gegen künftige weitere Whitelist-
  Erweiterungen ohne erneute Sicherheitsprüfung – jedes neu
  hinzugefügte Feld muss weiterhin ausschliesslich über `OLD`/`NEW`
  innerhalb von `write_audit_log()` ermittelt werden, nie über einen
  Client-Wert.

## 42. ÄNDERUNGSVERLAUF – DETAIL-DIFF FÜR measurements.data — VERSION 2.34

Erweitert das in v2.33 eingeführte Feld-Diffing um die eigentlichen
Fachwerte der neun Massaufnahme-Funktionen, die bisher nur als
pauschales „Massaufnahme geändert" sichtbar waren. Reine Erweiterung
von `write_audit_log()`/`js/23-verlauf.js` – keine einzige Zeile
Berechnungslogik, Speichermodell oder PDF-Code der neun Funktionen
verändert.

### 42.1 Die neun Funktionen und ihre `data`-Struktur (frisch aus
`js/16-massaufnahme-formular.js buildMeasurementFromForm()` sowie den
jeweiligen Fach-Dateien ermittelt, nicht aus früheren Reports übernommen)

| Typ (`measurements.type`) | Datei(en) | `data`-Struktur (Kurzfassung) |
|---|---|---|
| `einlaufblech_gerade` | `js/11-…`, `js/15-einlaufblech-stueckliste.js` | flach: `massA`,`winkel`,`montage`,`abwicklung`,`material` (+ abgeleitet `gesamtlaenge`,`massAEng`,`engeSeite`,`restBreite`); Array `pieces` (Stücke) |
| `rinne_halbrund` | `js/12-rinne-halbrund.js` | flach: `rinneAbwicklung`,`material` (+ abgeleitet `gesamtlaenge`,`boundaries`,`stueckliste`); Arrays `segments`,`dilas` |
| `einlaufblech_konisch` | `js/13-…`, `js/15-…` | flach: `abwicklung`,`dachneigung`,`montage`,`material` (+ abgeleitet `gesamtlaenge`,`engeSeite`); Array `pieces` |
| `freies_profil` | `js/14-freies-profil.js` | flach: `konisch`,`ansicht`,`material`; Arrays `schenkel`,`segmente` (Segmente enthalten selbst ein `massen`-Array je Schenkel) |
| `mauerabdeckung` | `js/12b-mauerabdeckung.js` | flach: `material` (+ firmenweite Einstellungswerte `bodenMass`/`schieberMass`, kein Mess-Eingabefeld dieser Massaufnahme); Arrays `segments`,`schieber`; Objekte `profil`,`boundaries`,`stueckliste` |
| `lukarne` | `js/19-lukarne.js` | flach: `hoehe`,`laengeOben`,`winkel`,`achsabstand`,`hilfsrissWunsch`,`seite`,`material` (+ abgeleitet `breite`,`spitzeVersatz`,`schraege`,`anzahl`,`flaeche`,`zugabeBreite`,`zugabeLaenge`,`hilfsriss`); Array `scharen` |
| `anschlussblech` | `js/20-anschlussblech.js` | flach, immer vorhanden: `deckung`,`art`,`ausfuehrung`,`saum`,`stossLaenge`,`ueberlappung`,`lattenabstand`,`firstgehrung` (+ abgeleitet `deckHoehe`,`laenge`); **variantenabhängig** ein-/ausgeblendete `data-anb`-Felder (`a`,`b`,`c`,`d`,`wandAufkantung`,`ortAufkantung`,`ortOben`,`ortStirn`,`ortNase`,`restSchwelle`,`gehrungszugabe`); Array `segmente` |
| `einfassung_rund` | `js/21-einfassung-rund.js` | flach, immer vorhanden: `deckung`,`durchmesser`,`winkel`,`a`,`b`,`c`,`lattenabstand`,`material` (+ abgeleitet `abwicklung`,`breiteGesamt`,`anzahlBleilappen`) |
| `skizze_foto` | `js/10-massaufnahme.js` | flach: nur `material`; kein Mass, reine Foto-/Skizzenerfassung |

**Keine der neun Array-Strukturen (`pieces`/`segments`/`segmente`/
`schenkel`/`schieber`/`dilas`/`scharen`) besitzt ein `id`-Feld** –
direkt in den jeweiligen `*.push({...})`-Aufrufen aller neun Dateien
verifiziert (z. B. `ebPieces.push({laenge,stossStoss,…})`,
`rinneSegments.push({laenge,linksTyp,…})`) – rein positions-/
index-basiert.

### 42.2 Machbarkeitsbewertung (Auftrag Abschnitt 3)

- **Klasse A (implementiert)**: alle oben als „flach, immer vorhanden"
  gelisteten Felder – direkt einem einzelnen, immer sichtbaren
  Formularfeld entsprechend (z. B. `#eb_massA`, `#einf_durchmesser`),
  ohne Array, ohne Varianten-Abhängigkeit.
- **Klasse B (diffbar, aber nicht in v2.34)**: `anschlussblech`s
  variantenabhängige `data-anb`-Felder (`a`,`b`,`c`,`d`,
  `wandAufkantung`, …). Grund: ihr Wert fällt beim Verstecken (anderer
  `art`/`ausfuehrung`) auf einen bei jedem Aufruf **neu aus den
  Firmeneinstellungen berechneten** Vorgabewert zurück
  (`anbVorgabe()`), nicht auf den zuletzt tatsächlich gespeicherten Wert
  dieser Massaufnahme – ein Diff könnte dadurch einen Feldwechsel
  zeigen, der nur eine Nebenwirkung des Varianten-Wechsels ist, keine
  echte Neumessung. Mit spezieller Logik (z. B. Diff nur, wenn die
  Feld-ID in **beiden** Speicherständen tatsächlich sichtbar/aktiv war)
  wäre das lösbar, aber bewusst nicht Teil dieser Version (Auftrag
  Abschnitt 3: „B … im Abschlussreport dokumentieren").
- **Klasse C (vorerst nicht diffen)**: alle Array-Strukturen aller neun
  Typen (siehe 42.1) – keine stabile ID, ein Index-basierter Vergleich
  wäre bei Einfügen/Löschen/Umsortieren irreführend (Auftrag Abschnitt
  7 verlangt explizit "NICHT" in diesem Fall). Ebenso `mauerabdeckung`s
  `bodenMass`/`schieberMass` (Klasse C, siehe 42.1 – keine
  Mess-Eingabe dieser einen Massaufnahme, sondern ein globaler
  Firmeneinstellungswert) und alle abgeleiteten/berechneten
  Zusatzfelder (`gesamtlaenge`, `engeSeite`, `restBreite`, `boundaries`,
  `stueckliste`, `profil`, `scharen`, `breite`, `anzahl`, `flaeche`, …)
  – bewusst nicht Teil der Whitelist, weil sie kein direktes
  Formularfeld sind, sondern ein Rechenergebnis aus den (nicht
  gedifften) Array-Werten; ein Diff dieser Werte allein ohne den
  zugrundeliegenden Array-Diff wäre unvollständig und potenziell
  irreführend.

### 42.3 Implementiertes Feld-Set je Typ (Klasse A)

| Typ | Felder | Einheit |
|---|---|---|
| `einlaufblech_gerade` | `massA`,`winkel`,`montage`,`abwicklung`,`material` | mm, °, –, mm, – |
| `rinne_halbrund` | `rinneAbwicklung`,`material` | mm, – |
| `einlaufblech_konisch` | `abwicklung`,`dachneigung`,`montage`,`material` | mm, °, –, – |
| `freies_profil` | `konisch`,`ansicht`,`material` | –, –, – |
| `mauerabdeckung` | `material` | – |
| `lukarne` | `hoehe`,`laengeOben`,`winkel`,`achsabstand`,`hilfsrissWunsch`,`seite`,`material` | mm, mm, °, mm, mm, –, – |
| `anschlussblech` | `deckung`,`art`,`ausfuehrung`,`saum`,`stossLaenge`,`ueberlappung`,`lattenabstand`,`firstgehrung` | –, –, –, mm, mm, mm, mm, – |
| `einfassung_rund` | `deckung`,`durchmesser`,`winkel`,`a`,`b`,`c`,`lattenabstand`,`material` | –, mm, °, mm, mm, mm, mm, – |
| `skizze_foto` | `material` | – |

Deutsche Feldbezeichnungen 1:1 aus den bestehenden Formular-Labels in
`index.html` übernommen (z. B. `#einf_durchmesser`→„Ø Standrohr" hier
als „Rohrdurchmesser" leicht vereinheitlicht, `#anb_saum`→„Umschlag am
Blechende"). Auflösung von Katalog-IDs auf lesbare Namen über bereits
geladene, bestehende Kataloge (keine neue Abfrage, Auftrag Abschnitt 25):
`material` → `findMeasurementMaterial()` (`js/01-basis.js`, seit
längerem in Gebrauch), `deckung` → `ANB_DECKUNGEN`/`EINF_DECKUNGEN`
(beide bereits als globale `const` in `js/20-anschlussblech.js`/
`js/21-einfassung-rund.js` geladen) zu einer Nachschlagetabelle
zusammengeführt – geprüft: beide Kataloge haben **disjunkte**
Schlüsselmengen (`pfanne`/`falzziegel`/`biber`/`schiefer`/
`faserzement`/`welle` vs. `biber_einfach`/`biber_doppel`/
`schiebeziegel`/`muldenziegel`/`eternit`/`naturschiefer`), eine
Zusammenführung ist deshalb kollisionsfrei möglich.

### 42.4 Serverseitige Ermittlung (Auftrag Abschnitt 16)

`write_audit_log()` erweitert: im bereits bestehenden
`entity_type='measurement'`-Zweig des `UPDATE`-Falls, **nur wenn
`NEW.type IS NOT DISTINCT FROM OLD.type`** (Struktur sonst nicht
vergleichbar – in der Praxis ändert sich `type` nach dem Anlegen ohnehin
nie, siehe v2.33 41.2), ein eigener, nach Typ verschachtelter `IF`-Block
je Feld:

```sql
if new.type = 'einlaufblech_gerade' then
  if new.data->'massA' is distinct from old.data->'massA' then
    v_changes := v_changes || jsonb_build_array(
      jsonb_build_object('field','massA','old',old.data->'massA','new',new.data->'massA'));
  end if;
  … -- winkel, montage, abwicklung, material
elsif new.type = 'rinne_halbrund' then
  …
```

`data->'feld'` (Pfeil-Operator, **nicht** `->>`) liefert den echten
jsonb-Wert statt Text – dadurch vergleicht `IS DISTINCT FROM` typsicher
auf Wertebene (Postgres normalisiert jsonb-Zahlen nach Wert, nicht nach
Text: `1200` und `1200.0` gelten als gleich, empirisch bestätigt, siehe
42.6) und das Frontend bekommt beim Lesen über PostgREST den nativen
JS-Typ (`number`/`string`/`boolean`/`null`) zurück, keine Zeichenketten.
Dasselbe verschachtelte-`IF`-Muster (kein zusammengesetzter Ausdruck)
wie bereits in v2.30/v2.33 – aus demselben, dort empirisch gefundenen
Grund: `write_audit_log()` ist eine einzige, über vier Tabellen
wiederverwendete Funktion, `NEW`/`OLD` sind generische `record`-Werte.

Der bestehende `title`/`date`/`note`-Diff aus v2.33 bleibt unverändert
bestehen und ergänzt sich additiv mit dem neuen Detail-Diff im selben
`changes`-Array (Auftrag Abschnitt 13: dasselbe Format weiterverwendet,
kein zweites Diff-Format).

### 42.5 Arrays, NULL/Fehlend, mehrere Änderungen (Auftrag Abschnitt 7–9,22)

- **Arrays**: wie in 42.2 begründet grundsätzlich nicht gedifft – ein
  UPDATE, das nur ein Array-Feld (`pieces`/`segments`/…) ändert, aber
  keines der Klasse-A-Felder, erzeugt weiterhin einen `changes=NULL`
  „Massaufnahme geändert"-Eintrag ohne Detail (Fortsetzung des in v2.33
  Abschnitt 41.5 begründeten Verhaltens: kein Log-Eintrag wird
  unterdrückt, da sonst reale Änderungen lautlos verschwinden könnten).
- **NULL/Fehlend**: `data->'feld'` liefert echtes SQL-`NULL`, wenn der
  Schlüssel nicht existiert, und jsonb-`null`, wenn er mit dem Wert
  `null` existiert – `IS DISTINCT FROM` behandelt beide korrekt. Da
  `buildMeasurementFromForm()` für jeden Typ immer dieselbe feste
  Feldmenge erzeugt (nie ein Feld nachträglich weglässt), ist dieser
  Randfall für das gewählte Feld-Set praktisch nicht relevant.
- **Mehrere Änderungen**: wie in v2.33 – ein UPDATE mit mehreren
  geänderten Detailfeldern erzeugt **einen** Audit-Eintrag mit mehreren
  Einträgen im `changes`-Array, keine separaten Zeilen (empirisch
  bestätigt, 42.6).

### 42.6 Tests (Auftrag Abschnitt 28, alle in `begin;…rollback;` mit
Wegwerf-Firmen, nie PETER KÜNZI AG)

Für jede der neun Funktionen: Testdatensatz mit typischer `data`
angelegt, genau ein Klasse-A-Feld geändert, Audit-Eintrag geprüft.

| Typ | geändertes Feld | `old`→`new` | Ergebnis |
|---|---|---|---|
| `einlaufblech_gerade` | `massA` | `1200`→`1350` | korrekt, `number` |
| `rinne_halbrund` | `rinneAbwicklung` | `"333"`→`"400"` | korrekt, `string` |
| `einlaufblech_konisch` | `dachneigung` | `30`→`32` | korrekt, `number` |
| `freies_profil` | `konisch` | `"nein"`→`"ja"` | korrekt, `string` |
| `mauerabdeckung` | `material` | `"zink"`→`"kupfer"` | korrekt, `string` |
| `lukarne` | `hoehe` | `1000`→`1100` | korrekt, `number` |
| `anschlussblech` | `saum` | `20`→`25` | korrekt, `number` |
| `einfassung_rund` | `durchmesser` | `110`→`125` | korrekt, `number` |
| `skizze_foto` | `material` | `"zink"`→`"titanzink"` | korrekt, `string` |

Zusätzlich: `massA` `1200`→`1200.0` (semantisch identisch) →
`changes=NULL`, **kein** Fake-Diff – bestätigt Auftrag Abschnitt 10
(Typsicherheit) direkt am gewählten Feld-Set, nicht nur theoretisch.
Cross-Tenant (Firma B kennt `entity_id`/`project_id` von Firma A) → 0
sichtbare Zeilen. Direkter `INSERT` mit erfundenem Detail-Diff
(`{"field":"massA","old":1200,"new":9999}`) → weiterhin
`insufficient_privilege`, unverändert seit v2.30/v2.33.

Nach jeder Transaktion erneut geprüft: keine Wegwerf-Firmen, keine
Test-Zeilen, `audit_log` insgesamt weiterhin 0 Zeilen (weiterhin keine
reale Nutzung seit Deploy), PETER KÜNZI AG (`updated_at`) unverändert.

### 42.7 Frontend (`js/23-verlauf.js`)

- `VERLAUF_FIELD_LABELS.measurement` um alle Klasse-A-Detailfelder
  ergänzt (deutsche Bezeichnung je Feld, kollisionsfrei über alle neun
  Typen hinweg geprüft, siehe 42.3).
- `VERLAUF_MEAS_FIELD_UNITS` – Einheit je Feld, nur wo eindeutig bekannt.
- `VERLAUF_MEAS_VALUE_LABELS` – Wert-Übersetzung für Auswahlfelder
  (`montage`, `konisch`, `ansicht`, `seite`, `ausfuehrung`), 1:1 aus den
  tatsächlichen `<option>`-Texten in `index.html` übernommen, keine
  erfundenen Bezeichnungen.
- `verlaufDeckungNamen()` – führt `ANB_DECKUNGEN`/`EINF_DECKUNGEN` zu
  einer Nachschlagetabelle zusammen (42.3).
- `verlaufFormatDiffValue()` erweitert: `material`/`deckung` über die
  jeweilige Katalog-Auflösung, Zahlen mit Schweizer
  Tausendertrennzeichen (`toLocaleString("de-CH")`) + bekannter Einheit,
  Booleans als „Ja"/„Nein", Auswahlfelder über `VERLAUF_MEAS_VALUE_LABELS`,
  alles andere unverändert als Text – **eine** Funktion für alle
  Entitäten/Typen, keine typspezifischen Render-Pfade.
- Kein neues HTML, keine neue CSS-Klasse nötig – nutzt die bestehende
  `.verlauf-entry-changes`-Darstellung aus v2.33 unverändert weiter.

### 42.8 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (612/612 – kein HTML in dieser Aufgabe verändert, nur
  `js/23-verlauf.js`).
- `get_advisors(type:'security')` nach der Migration erneut geprüft:
  identisch zum Stand nach v2.33, keine neue Warnung.
- Alle neun Massaufnahme-Berechnungsdateien (`js/11-…` bis `js/21-…`)
  in dieser Aufgabe **nicht** verändert – Zuschnitt-, Abwicklungs-,
  Winkel-, Material- und Stücklistenlogik, Speichermodell
  (`buildMeasurementFromForm()`), PDF-Berechnung: unangetastet.
  `git diff --stat` bestätigt: nur `js/23-verlauf.js` (Frontend) +
  eine SQL-Migration geändert.
- PETER KÜNZI AG vor/nach der Aufgabe erneut geprüft: unverändert,
  `audit_log` weiterhin insgesamt 0 Zeilen.
- Live-Klicktest im Browser (alle neun Funktionen öffnen/laden/
  speichern/berechnen) weiterhin nicht möglich – Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`
  direkt, wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich
  nicht als getestet behauptet.** Alle in 42.6 dokumentierten Ergebnisse
  sind direkte Trigger-/RLS-Simulationen gegen das echte
  Produktivschema; da an den neun Fach-Dateien selbst nichts geändert
  wurde, besteht auch kein Regressionsrisiko für deren Berechnungen.

### 42.9 Offene Punkte für v2.35

- Kein Live-Klicktest im Browser möglich (siehe 42.8).
- Klasse B (`anschlussblech`s variantenabhängige `data-anb`-Felder,
  siehe 42.2) bewusst nicht implementiert – bräuchte eine zusätzliche
  „war dieses Feld in beiden Versionen sichtbar/aktiv"-Prüfung, um
  keine falschen Diffs durch reine Varianten-Wechsel zu erzeugen.
- Klasse C (alle Array-Strukturen aller neun Typen) bleibt bewusst ohne
  Detail-Diff – ein UPDATE, das nur Stücke/Segmente/Schienen/Scharen
  ändert, zeigt weiterhin nur „Massaufnahme geändert" ohne Detail. Eine
  spätere Version könnte das lösen, falls den Array-Elementen
  nachträglich eine stabile ID hinzugefügt wird (eigener, grösserer
  Auftrag – berührt das bestehende Speichermodell).
- Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung bleibt
  unverändert offen; ein reiner Foto-/Skizzenwechsel ohne Änderung an
  einem Klasse-A-Feld erzeugt weiterhin `changes=NULL` (Auftrag
  Abschnitt 19 – keine künstliche „Foto geändert"-Aussage).
- `ausmass.positions`/`reports.work_entries`/`material_entries` bleiben
  unverändert ohne Detail-Diff (Auftrag Abschnitt 20 – ausserhalb des
  Umfangs dieser Version).

## 43. ÄNDERUNGSVERLAUF – ANSCHLUSSBLECH-PRÜFUNG + UI-VERBESSERUNG — VERSION 2.35

Zwei eng begrenzte Prüfungen: (1) ob die in v2.34 als Klasse B
zurückgestellten Ort-/Seitenblech-Varianten-Felder inzwischen sicher
diffbar sind, (2) eine übersichtlichere Darstellung der bestehenden
Verlauf-Oberfläche. **Keine Datenbank-Migration in dieser Version** –
`write_audit_log()` unverändert seit v2.34, ausschliesslich
`js/23-verlauf.js`/`css/01-basis.css` angepasst.

### 43.1 Anschlussblech-Klasse-B erneut geprüft – Ergebnis: weiterhin
nicht sicher diffbar, jetzt mit konkretem Code-Beleg statt Vermutung

v2.34 hatte die variantenabhängigen `a`/`b`/`c`/`d`/`wandAufkantung`/
`ortAufkantung`/`ortOben`/`ortStirn`/`ortNase`/`restSchwelle`/
`gehrungszugabe`-Felder als Klasse B eingestuft, mit der Vermutung
"Vorgabewert-Rückfall könnte falschen Diff erzeugen". Für v2.35 wurde
das anhand des tatsächlichen Codes in `js/20-anschlussblech.js`
nachvollzogen, nicht nur vermutet:

- **Mass-Felder (`a`/`b`/`c`/`d`/…)**: `$("anb_art").onchange` und
  `$("anb_deckung").onchange` rufen beide
  `Object.assign(w, anbStandardwerte(w.art, w.deckung, {}))` auf – der
  dritte Parameter `vorhanden` ist dabei **immer ein leeres Objekt
  `{}`**. Innerhalb `anbStandardwerte()` (Zeile 120–130) bedeutet das:
  `vorhanden[k]` ist für jedes Mass-Feld `k` immer `undefined`, die
  Funktion liefert deshalb **immer** den berechneten Mindestwert bzw.
  Standardwert (`masse[k].std`) zurück – **nie** den Wert, den der
  Benutzer gerade für dieses Feld eingegeben hatte, selbst wenn das
  Feld nach dem Varianten-/Deckungswechsel weiterhin sichtbar bleibt.
  **Konkret nachvollzogen**: Firma wählt Art "Rinne" mit Mass a = 300 mm,
  wechselt anschliessend nur die Deckung (Mass a bleibt bei der neuen
  Deckung weiterhin ein sichtbares Feld) → Mass a wird durch den
  Deckungswechsel **automatisch auf den neuen Mindestwert
  zurückgesetzt**, ohne dass der Benutzer das Feld angefasst hat. Ein
  Speichern in diesem Zustand würde im Audit-Log einen technisch
  korrekten, aber fachlich **irreführenden** Diff erzeugen ("Mass a:
  300 → 50" liest sich wie eine bewusste Neumessung, ist tatsächlich
  aber nur eine Nebenwirkung des Deckungswechsels) – genau der in
  Abschnitt 3 des Auftrags beschriebene Fall, der ausdrücklich **nicht**
  gedifft werden soll.
- **Abschluss-Felder (`wandAufkantung`/`ortAufkantung`/`ortOben`/
  `ortStirn`/`ortNase`)**: `$("anb_ausfuehrung").onchange` ruft
  `anbMassfelderZeichnen(anbEingabenAusFeldern())` auf – `anbEingabenAus
  Feldern()` liest nur die **aktuell im DOM sichtbaren** `data-anb`-
  Felder aus (`document.querySelectorAll("#anb_masse [data-anb],#anb_
  abschluss [data-anb]")`); die beim Wechsel von "Seitenblech (Wand)"
  auf "Ortblech (Giebel)" neu erscheinenden Felder (`ortAufkantung` usw.)
  waren vor dem Wechsel nicht im DOM und werden deshalb nicht gelesen –
  ihr Wert fällt auf `anbVorgabe()`s frisch aus den **Firmeneinstellungen**
  berechneten Basiswert zurück, nicht auf einen zuvor für **diese**
  Massaufnahme tatsächlich erfassten Wert. Beim erneuten Zurückwechseln
  auf "Seitenblech" träfe dasselbe auf `wandAufkantung` zu. Dieselbe
  Kategorie Risiko wie bei den Mass-Feldern.
- **`restSchwelle`/`gehrungszugabe`**: kommen ausschliesslich aus
  `anbVorgabe()` (Firmeneinstellungswerte `s.rest_schwelle`/
  `s.gehrungszugabe`), **keine** zugehörigen `data-anb`-Formularfelder
  im aktuellen `index.html` gefunden – diese zwei Werte sind aktuell gar
  keine direkte Benutzereingabe dieser einzelnen Massaufnahme, sondern
  ausschliesslich ein globaler Firmen-Standardwert (dieselbe Kategorie
  wie `mauerabdeckung.bodenMass`/`schieberMass`, bereits in v2.34
  Abschnitt 42.2 als Klasse C eingestuft) – erneut bestätigt: nicht
  diffbar, aus demselben Grund.

**Entscheidung**: Keines der geprüften Klasse-B-Felder wird in v2.35
freigegeben. Der Auftrag lässt dieses Ergebnis ausdrücklich zu ("Wenn
ein sauberer Test nicht möglich ist: → Feld nicht freigeben") – der
Nachweis über den tatsächlichen `{}`-Aufruf in `anbStandardwerte()` und
den DOM-Selektor in `anbEingabenAusFeldern()` bestätigt, dass hier kein
Grenzfall vorliegt, sondern ein **strukturell garantierter** Reset bei
jedem Varianten-/Deckungswechsel. Eine sichere Lösung würde entweder (a)
`anbStandardwerte()` den tatsächlich zuvor gespeicherten Wert als
`vorhanden` übergeben (Fachlogik-Änderung, vom Auftrag Abschnitt 4
ausdrücklich untersagt), oder (b) im Trigger eine "war dieses Feld über
den gesamten Bearbeitungszeitraum durchgängig sichtbar"-Prüfung
ergänzen (technisch aus der Datenbank heraus nicht feststellbar, da nur
der End-Zustand von `OLD`/`NEW` bekannt ist, nicht die Zwischenschritte
innerhalb der Bearbeitungssitzung). Keine der beiden Optionen wird
umgesetzt. `deckung`/`art`/`ausfuehrung`/`saum`/`stossLaenge`/
`ueberlappung`/`lattenabstand`/`firstgehrung` (bereits seit v2.34 Klasse
A, da nachweislich **nicht** von diesem Reset-Mechanismus betroffen)
bleiben unverändert diffbar.

**Keine Fachlogik verändert**: `anbStandardwerte()`,
`anbMassfelderZeichnen()`, `anbEingabenAusFeldern()`,
`anbFesteFelderFuellen()` – kein Zeichen in diesen Funktionen angefasst,
ausschliesslich lesend analysiert.

### 43.2 Verlauf-UI überarbeitet (`js/23-verlauf.js`, `css/01-basis.css`)

- **Wer+Wann auf einer Zeile**: bisher zwei Zeilen (Zeitpunkt oben,
  „👤 Name" darunter) – jetzt eine Zeile „🕒 Max Muster · 01.09.2026
  21:42" (Auftrag Abschnitt 8), spart eine ganze Zeile pro Eintrag ohne
  Informationsverlust.
- **Entität dezent kennzeichnen**: das bestehende Entitäts-Badge im
  kombinierten Projekt-Verlauf zeigt jetzt zusätzlich dasselbe Symbol,
  das der jeweilige Hauptbereich der App bereits verwendet („📁
  Projekt", „📐 Massaufnahme", „📏 Ausmass", „📋 Regierapport" – identisch
  zu den Überschriften in `index.html`, keine neue Symbolsprache
  erfunden). Weiterhin dezenter grauer Rahmen statt Farbcodierung
  (Auftrag Abschnitt 9: "keine übertriebene Farbgestaltung").
  Technischer `entity_type`-Rohwert war und ist nirgends sichtbar.
- **Feldänderungen als Zeilenpaar statt Fliesstext**: bisher
  `"Label: alt → neu"` als ein Textstrang, jetzt eine Flex-Zeile mit
  Label links (fett, in der Blau-Akzentfarbe) und Wert rechts (`"alt →
  neu"`), die auf schmalen Bildschirmen automatisch untereinander
  umbricht (`flex-wrap:wrap`, `word-break:break-word`) statt horizontal
  zu scrollen (Auftrag Abschnitt 15). Mehrere Änderungen bleiben
  weiterhin **ein** Eintrag mit mehreren solchen Zeilen (Auftrag
  Abschnitt 11) – keine Änderung an dieser bereits in v2.33 korrekten
  Gruppierung.
- **50er-Limit dezent kommuniziert**: liefert eine Abfrage genau 50
  Zeilen (das bestehende `.limit(50)`), erscheint unterhalb der Liste
  der kleine Hinweis „Zeigt die letzten 50 Einträge." – rein
  clientseitig anhand der bereits geladenen Zeilenanzahl entschieden,
  keine zusätzliche Abfrage (Auftrag Abschnitt 16/25). Bei weniger als
  50 Zeilen erscheint kein Hinweis.
- **Unverändert**: Action-Übersetzung (`created`/`updated`/`deleted`/
  `status_changed`), Aktions- und Entitäts-Filter (weiterhin frei
  kombinierbar, siehe v2.32), NULL-Darstellung („–"), Zahlenformatierung
  (`1'200`), Boolean-Darstellung (Ja/Nein), Fehlermeldung bei
  fehlgeschlagener Abfrage, „Noch keine Aktivitäten vorhanden."-Text bei
  leerer Historie, `archived`-Sonderdarstellung ("Aktiv → Archiviert").

### 43.3 Sicherheit erneut verifiziert (Auftrag Abschnitt 21, keine Code-Änderung serverseitig)

Da `write_audit_log()`/die RLS-Policy in dieser Version nicht verändert
wurden, war kein neuer Sicherheitsmechanismus zu bauen – trotzdem erneut
per SQL-Simulation (Wegwerf-Firmen, `begin;…rollback;`) bestätigt:
Firma B sieht über eine bekannte `project_id` von Firma A weiterhin 0
Zeilen; ein direkter `INSERT` in `audit_log` mit gefälschtem `changes`
weiterhin `insufficient_privilege`. Keine Regression seit v2.30/v2.33.

### 43.4 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert ausgeglichen
  (612/612 – kein HTML in dieser Aufgabe verändert, nur
  `js/23-verlauf.js`/`css/01-basis.css`).
- `js/20-anschlussblech.js` und alle übrigen acht Massaufnahme-Fach-
  Dateien: nicht verändert, nur lesend analysiert (43.1).
- Cross-Tenant/Fälschungstest erneut erfolgreich (43.3).
- PETER KÜNZI AG vor/nach der Aufgabe erneut geprüft: unverändert,
  `audit_log` weiterhin insgesamt 0 Zeilen (keine reale Nutzung seit
  Deploy, keine Testdaten dort erzeugt).
- Live-Klicktest im Browser (neue Verlauf-Darstellung, Anschlussblech-
  Varianten wechseln, Mobile-Ansicht) weiterhin nicht möglich – Sandbox
  blockiert ausgehende HTTPS-Verbindungen zu
  `nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in jeder vorherigen
  Sitzung. **Das wird hier ausdrücklich nicht als getestet behauptet.**
  Die CSS-Umbruch-Regeln (`flex-wrap:wrap`, `word-break:break-word`,
  keine festen Breiten) wurden per Code-Review gegen die bestehenden,
  bereits mobil erprobten Klassen (`.report-list`, `.bar`) abgeglichen,
  kein eigenständiger Geräte-Test.

### 43.5 Offene Punkte für v2.36

- Kein Live-Klicktest im Browser möglich (siehe 43.4).
- Anschlussblech-Varianten-Felder bleiben vollständig Klasse B – eine
  sichere Lösung bräuchte entweder eine Fachlogik-Änderung (Vorgabewert-
  Rückfall soll den zuletzt gespeicherten Wert statt einen berechneten
  Mindestwert berücksichtigen) oder ein Session-übergreifendes
  Sichtbarkeits-Tracking – beides ausserhalb des für v2.35 zulässigen
  Rahmens.
- Klasse C (alle Array-Strukturen, `mauerabdeckung.bodenMass`/
  `schieberMass`, `anschlussblech.restSchwelle`/`gehrungszugabe`) bleibt
  unverändert ohne Detail-Diff.
- Feste 50er-Obergrenze weiterhin ohne echte Paginierung.
- Die in Abschnitt 38.6 dokumentierte Platzhalterzeilen-Häufung bleibt
  unverändert offen.

## 44. ÄNDERUNGSVERLAUF – FOTO-/SKIZZEN-AKTIONEN — VERSION 2.36

Schliesst den seit Abschnitt 38.6 offenen Punkt: Foto- und Skizzen-
Aktionen erzeugten bisher nur unspezifische „Massaufnahme geändert"-
Einträge. Sie werden jetzt als eigene, fachlich verständliche Aktionen
protokolliert – **ausschliesslich aus der tatsächlichen Spaltenänderung
abgeleitet**, nicht aus UI-Klicks.

### 44.1 Tatsächlicher Speicherablauf (frisch aus dem Code ermittelt)

Fotos und Skizzen liegen **nicht** in `measurements.data` und **nicht**
in einer eigenen Tabelle, sondern als Storage-Referenzen in drei Spalten
der `measurements`-Zeile selbst:

| Spalte | Typ | Inhalt |
|---|---|---|
| `photo_path` | `text`, nullable | Speicherpfad des einen Fotos, `NULL` = kein Foto |
| `sketch_paths` | `jsonb`, NOT NULL, Default `'[]'` | Array aller Skizzenpfade |
| `sketch_path` | `text`, nullable | Altfeld: erste Skizze, aus der Zeit vor `sketch_paths` |

Ablauf beim Speichern (`js/16-massaufnahme-formular.js`,
`$("saveMeasurement").onclick`): zuerst werden neue Bilder in den
Storage hochgeladen (`uploadMeasurementImage()`), danach wird **eine
einzige** `measurements`-Zeile geschrieben, deren `photo_path`/
`sketch_path`/`sketch_paths` die Pfade enthalten. Per Grep bestätigt:
`from("measurements").update(...)` existiert genau **einmal** im ganzen
Projekt – es gibt keinen zweiten Schreibweg, der diese Spalten
verändern könnte.

Löschen im Formular ändert nur den Client-Zustand
(`$("measPhotoRemove")` setzt `measPhotoDataUrl`/`measExistingPhotoUrl`
auf `null`, `[data-remove-sketch]` entfernt den Eintrag aus
`measSketches`); wirksam wird es erst mit demselben einen UPDATE.

### 44.2 Erkennungslogik (serverseitig, in `write_audit_log()`)

Migration `audit_log_photo_sketch_actions_v2_36`. Im bestehenden
AFTER-UPDATE-Zweig für `entity_type='measurement'`:

- **Foto**: `nullif(new.photo_path,'')` gegen `nullif(old.photo_path,'')`.
  `0→1` = hinzugefügt, `1→0` = gelöscht, sonst (anderer Pfad bei
  vorhandenem Foto) = ersetzt. Leerstring und `NULL` gelten bewusst als
  dasselbe, damit ein `''→NULL` keinen Scheineintrag erzeugt.
- **Skizzen**: verglichen wird nicht `sketch_paths` roh, sondern die
  **effektive** Liste nach exakt derselben Ersatzregel, die auch der
  Client beim Öffnen verwendet (`js/10-massaufnahme.js`: `sketch_paths`,
  sonst ersatzweise `[sketch_path]`, sonst leer). Ohne diese Regel würde
  das blosse Neuspeichern einer alten Massaufnahme, bei der nur das
  Altfeld `sketch_path` gefüllt war, fälschlich als „Skizze
  hinzugefügt" erscheinen – **empirisch als Testfall abgesichert**
  (44.4, Fall „Legacy").

### 44.3 Neue Aktionen – nur bei Eindeutigkeit

`audit_log_action_check` erweitert um `photo_added`, `photo_deleted`,
`sketch_added`, `sketch_deleted`. Die bestehenden vier Werte
(`created`/`updated`/`deleted`/`status_changed`) sind unverändert.

Eine spezifische Aktion wird **nur** gesetzt, wenn `v_changes` genau
einen Eintrag enthält – das bedeutet zugleich: kein anderes Fachfeld und
nicht auch noch die jeweils andere Bildart war betroffen. Sonst bleibt
es bei `updated`, und das Ereignis erscheint als Detailzeile. Damit ist
der im Auftrag (Abschnitt 26 F) geforderte Mischfall
„Foto + Massänderung" nachvollziehbar statt irreführend:

| Situation | action | changes |
|---|---|---|
| nur Foto neu | `photo_added` | `[{photo,0,1}]` |
| nur Foto weg | `photo_deleted` | `[{photo,1,0}]` |
| nur Skizze(n) dazu | `sketch_added` | `[{sketches,alt,neu}]` |
| nur Skizze(n) weg | `sketch_deleted` | `[{sketches,alt,neu}]` |
| Foto ersetzt | `updated` | `[{photo,1,1}]` |
| Skizze bearbeitet (gleiche Anzahl) | `updated` | `[{sketches,n,n}]` |
| Foto + Massänderung | `updated` | beide Einträge |

`changes` enthält ausschliesslich **Anwesenheit (0/1) bzw. Anzahl** –
niemals einen Speicherpfad, keine URL, keinen Dateinamen (Auftrag
Abschnitt 16). Dateinamen werden fachlich gar nicht gespeichert, es gibt
also keinen anzeigbaren Namen; das ist bewusst so belassen.

### 44.4 Atomarität und Grenzen (offen dokumentiert)

Der Audit-Eintrag entsteht wie seit v2.30 im **AFTER**-Trigger derselben
Transaktion wie die Zeilenänderung: kein Eintrag ohne erfolgreiche
Datenänderung. Der Storage-Upload liegt davor und ist bewusst **nicht**
Audit-Quelle (Auftrag Abschnitt 8/9) – eine hochgeladene, aber nie
verknüpfte Datei erzeugt korrekterweise keinen Eintrag.

Bewusste Grenzen:
- **Ersetzen/Bearbeiten** bekommt keine eigene Aktion (der Auftrag nennt
  nur vier Namen); es bleibt `updated` mit der Detailzeile
  „Foto: ersetzt" bzw. „Skizzen: bearbeitet (n)".
- **Foto und Skizzen im selben Speichervorgang** (beim ersten Speichern
  einer neuen Skizze/Foto-Massaufnahme häufig) ergeben bewusst
  `updated` mit beiden Detailzeilen, weil keine der vier Aktionen den
  Fall allein korrekt beschreibt.
- Die **Anzahl** ist nur für Skizzen aussagekräftig (`sketch_paths` ist
  eine Liste); `photo_path` ist ein Einzelwert, deshalb gibt es kein
  „3 Fotos hinzugefügt".

### 44.5 Platzhalterzeilen (Abschnitt 38.6) – deutlich verbessert

Beim ersten Speichern einer neuen Foto-/Skizzen-Massaufnahme legt
`js/16-massaufnahme-formular.js` zuerst eine Platzhalterzeile an (um die
ID für den Storage-Pfad zu bekommen) und aktualisiert sie danach. Das
ergab bisher `created` + ein nichtssagendes `updated`. Der zweite
Eintrag ist jetzt `photo_added` bzw. `sketch_added` (oder, bei Foto und
Skizze gleichzeitig, `updated` **mit** beiden Detailzeilen) – die
Häufung bleibt zahlenmässig bestehen, ist aber inhaltlich verständlich.
**Keine rückwirkende Änderung oder Löschung alter `audit_log`-Daten**
(Auftrag Abschnitt 10/30): alte Einträge bleiben exakt wie sie sind, nur
neue Einträge ab v2.36 sind spezifischer.

### 44.6 Frontend (`js/23-verlauf.js`)

- Vier neue Übersetzungen in `VERLAUF_ACTION_LABELS`
  („Foto hinzugefügt"/„Foto gelöscht"/„Skizze hinzugefügt"/
  „Skizze gelöscht").
- `verlaufBildWert()` formuliert die Detailzeile fachlich statt „0 → 1";
  sie wird **weggelassen**, wenn der Aktions-Badge bereits exakt dasselbe
  aussagt (z. B. `photo_added` + `{photo,0,1}`), und bleibt erhalten,
  wo sie zusätzliche Information trägt („3 hinzugefügt (0 → 3)",
  „ersetzt", „bearbeitet (2)").
- Neuer Filter-Knopf „Foto/Skizze" fasst die vier Aktionen zusammen
  (`VERLAUF_BILD_ACTIONS`), damit sie nicht nur unter „Alle" auffindbar
  sind. Die bestehenden Filter (Aktion/Entität, frei kombinierbar) sind
  unverändert.
- Zeitformat: Datum und Uhrzeit ohne eigenen Mittelpunkt, weil der
  Trenner jetzt zwischen Name und Zeitpunkt steht
  („🕒 Max Muster · 01.09.2026 19:42", Auftrag Abschnitt 22).

### 44.7 Tests (alle in `begin;…rollback;`, Wegwerf-Firmen, nie PETER KÜNZI AG)

| Fall | Ergebnis |
|---|---|
| A Foto hinzufügen | `photo_added`, `[{photo,0,1}]` |
| B Foto löschen | `photo_deleted`, `[{photo,1,0}]` |
| C eine Skizze hinzufügen | `sketch_added`, `[{sketches,0,1}]` |
| D eine Skizze löschen | `sketch_deleted`, `[{sketches,2,1}]` |
| E normale Massänderung | unverändert `updated` + `[{massA,1200,1350}]` |
| F Foto + Massänderung | `updated` + **beide** Einträge |
| G drei Skizzen auf einmal | `sketch_added`, `[{sketches,0,3}]` → UI „3 hinzugefügt (0 → 3)" |
| Legacy `sketch_path`→`sketch_paths` | `changes=NULL`, **kein** Scheinereignis |
| Foto ersetzt (anderer Pfad) | `updated`, `[{photo,1,1}]` → UI „ersetzt" |
| H Cross-Tenant (Firma B kennt project_id/entity_id) | 0 sichtbare Zeilen |
| I Client fälscht `photo_added` direkt in `audit_log` | `insufficient_privilege` |
| J Mitarbeiter gelöscht | Skizzen-Ereignis bleibt erhalten, `user_id` wird `NULL` → UI „Unbekannter Benutzer" |

Zusätzlich per Node-Harness gegen exakt diese Datenbank-Payloads
geprüft, dass die UI daraus die richtigen Texte erzeugt (Badge +
Detailzeile, keine redundante Doppelaussage, keine Pfade).

Nach allen Transaktionen erneut geprüft: keine Wegwerf-Firmen, keine
Testdatensätze, `audit_log` weiterhin insgesamt 0 Zeilen, Mitarbeiter
wieder vorhanden, PETER KÜNZI AG (`updated_at`) unverändert.

### 44.8 Regressionstest

- `node --check` über alle `js/*.js` und `sw.js`: fehlerfrei.
- `<div>`/`</div>`-Zählung in `index.html`: unverändert 612/612 (kein
  HTML geändert).
- `git diff --stat`: nur `js/23-verlauf.js`, `index.html` (Versionstext),
  `sw.js` (Cache-Version) und `CLAUDE.md` – **keine** der neun
  Massaufnahme-Fachdateien (`js/11-…` bis `js/21-…`), keine Berechnung,
  kein Speichermodell, keine PDF-Logik angefasst.
- Service Worker: `js/23-verlauf.js` ist seit v2.31 in der SHELL-Liste,
  keine neue Datei – nur die Cache-Version hochgezählt.
- RLS/Grants unverändert; die vier neuen Aktionen können ausschliesslich
  vom `SECURITY DEFINER`-Trigger geschrieben werden.
- Live-Klicktest im Browser weiterhin nicht möglich (Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`).
  **Das wird hier ausdrücklich nicht als getestet behauptet.** Alle
  Ergebnisse stammen aus direkten Trigger-/RLS-Simulationen gegen das
  echte Produktivschema plus dem UI-Harness.

### 44.9 Offene Punkte für v2.37

- Kein Live-Klicktest im Browser möglich (siehe 44.8).
- Kein eigener Ereignisname für „Foto ersetzt" / „Skizze bearbeitet"
  und für den Mischfall Foto+Skizze (bewusst, siehe 44.4).
- Dateinamen werden weiterhin nicht gespeichert und deshalb nicht
  angezeigt; dafür müsste das Speichermodell erweitert werden.
- Array-Strukturen der Massaufnahme (Stücke/Segmente/Scharen) bleiben
  unverändert ohne Detail-Diff (v2.34, Klasse C), ebenso die
  Anschlussblech-Varianten (v2.35, Klasse B).
- `ausmass.photo_path`/`photo_paths` haben dieselbe Struktur wie bei den
  Massaufnahmen; eine analoge Foto-Erkennung für Ausmasse wäre technisch
  möglich, war aber nicht Teil dieses Auftrags (dort ist bisher nur der
  Kopfdaten-Diff aus v2.33 aktiv).

## 45. PROJEKT-COCKPIT / ARBEITSÜBERSICHT — VERSION 2.37

Ein Projekt wird zum Einstiegspunkt in die Arbeit: eine kompakte
Übersicht zeigt Stammdaten, was bereits vorhanden ist und die letzte
Aktivität, und springt von dort direkt in die bestehenden Bereiche.
**Keine Schemaänderung, keine Migration, keine Fachlogik-Änderung** –
ausschliesslich Frontend.

### 45.1 Bestandsaufnahme (frisch gegen Code und Schema geprüft)

`projects` hat genau diese Spalten: `id`, `name`, `order_no`,
`customer`, `object`, `archived`, `company_id`, `created_by`/`_at`,
`updated_by`/`_at`. **Das einzige Statusfeld ist `archived`** – es gibt
kein „offen/in Arbeit/fertig", weder als Spalte noch abgeleitet. Ein
solcher Status wird deshalb im Cockpit auch nicht angezeigt oder
erfunden (Auftrag Abschnitt 1).

Verknüpfungen, alle bereits vorhanden und direkt nutzbar:

| Bereich | Verknüpfung |
|---|---|
| Massaufnahmen | `measurements.project_id` |
| Ausmass | `ausmass.project_id` |
| Regierapport | `reports.project_id` |
| Dateien/Fotos | `project_files.project_id` (zuverlässige Projektzuordnung, deshalb im Cockpit enthalten) |
| Verlauf | `audit_log.project_id` (kombiniert Projekt + seine Massaufnahmen/Ausmasse/Rapporte, seit v2.32) |

Bestehende Oberfläche: Projekte werden als Karten (`.project-row`) in
`#projectsModal` gezeigt, mit auf-/zuklappbaren Listen je Bereich.
Eine eigene Projekt-Detailansicht gab es bisher **nicht**, und ebenso
**keine Möglichkeit, die Stammdaten eines bestehenden Projekts zu
ändern** (nur Anlegen, Archivieren, Löschen) – obwohl das
Feld-Diffing aus v2.33 (`name`/`order_no`/`customer`/`object`) genau
darauf ausgelegt ist.

### 45.2 Umgesetzt

Neue Datei **`js/24-projekt-cockpit.js`** und ein neues Modal
`#projectCockpitModal`, erreichbar über den neuen Knopf
„📂 Projekt öffnen" auf jeder Projektkarte:

- **Stammdaten** – Projektname, Auftrags-Nr., Adresse, Auftraggeber aus
  dem bereits geladenen `allProjects` (keine zusätzliche Abfrage), als
  bearbeitbare Felder mit „✓ Stammdaten speichern". Dieselben
  Pflichtfelder wie beim Anlegen. Archivierte Projekte sind als solche
  gekennzeichnet.
- **Arbeit** – vier grosse, volle Breite einnehmende Kacheln
  (`.cockpit-tile`) mit Anzahl bzw. „Noch keine …":
  „📐 Massaufnahmen", „📏 Ausmass", „📋 Regierapport",
  „📎 Dateien/Fotos". Bei Massaufnahmen/Ausmassen zusätzlich die ersten
  drei Titel (ohne Titel: die Fachart aus dem bestehenden
  `MEAS_TYPE_LABELS`-Katalog).
- **Verlauf** – „Letzte Aktivität" als eine Zeile
  (Entität · Aktion · Benutzer · Zeitpunkt) sowie der Knopf
  „🕒 Verlauf anzeigen", der den **bestehenden** kombinierten
  Projekt-Verlauf aus v2.32 öffnet (`toggleProjectVerlaufBox()`).
  Ohne Eintrag: „Noch keine Aktivität".

### 45.3 Wiederverwendung statt Parallelsystem (Auftrag Abschnitt 4/6)

- Der **Verlauf** ist unverändert der aus `js/23-verlauf.js`
  (`toggleProjectVerlaufBox()`, `updateVerlaufToggleVisibility()`,
  `verlaufFormatWann()`, `VERLAUF_*_LABELS`) – kein zweites
  Aktivitätssystem, keine zweite Abfragelogik.
- Die **Sprünge** in einen Bereich lösen den echten, bereits
  vorhandenen Umschaltknopf der Projektkarte per `btn.click()` aus
  (`data-toggle-measurements`/`-ausmass`/`-reports`/`-files`). Dadurch
  gibt es weiterhin **genau eine** Auf-/Zuklapp- und Ladelogik
  (`loadProjectMeasurements()` usw. in `js/09-projekte.js`), keine
  Kopie davon im Cockpit. Ist das Projekt archiviert, schaltet der
  Sprung vorher die Archiv-Ansicht ein, damit die Karte auffindbar ist.
- Benutzernamen über das bestehende `profileName()` aus dem bereits
  geladenen `allProfiles` – keine zusätzliche Profil-Abfrage.

### 45.4 Datenbank / Performance

**Keine Migration, keine Schemaänderung** – das Cockpit kommt
vollständig mit dem bestehenden Schema aus (Auftrag Abschnitt 7).

Beim Öffnen eines Projekts laufen **fünf Abfragen in einem einzigen
`Promise.all`**, nicht eine pro Kachel nacheinander:

| Abfrage | Zweck |
|---|---|
| `measurements.select("id,title,type,date")` | Anzahl + Titel |
| `ausmass.select("id,title,type,date")` | Anzahl + Titel |
| `reports.select("id")` | nur Anzahl |
| `project_files.select("id")` | nur Anzahl |
| `audit_log … order(created_at desc).limit(1)` | letzte Aktivität |

Die „letzte Aktivität" wird bewusst **pro geöffnetem Projekt** exakt
mit `limit(1)` geholt und nicht aus einem gemeinsamen Zeitfenster über
alle Projekte geschätzt – ein Projekt, dessen letzte Aktivität ausserhalb
eines solchen Fensters läge, würde sonst fälschlich „Noch keine
Aktivität" zeigen. Kein Neuladen der Projektliste beim Öffnen, keine
Schleifen, keine Abfrage pro Projektkarte.

Wechselt der Benutzer währenddessen das Projekt oder schliesst das
Cockpit, wird ein verspätet eintreffendes Ergebnis verworfen, statt eine
fremde Übersicht zu zeichnen.

### 45.5 Tenant-Sicherheit (Auftrag Abschnitt 8)

Alle fünf Abfragen filtern **nur** nach `project_id`. Die Firmengrenze
erzwingt weiterhin ausschliesslich die Datenbank: alle beteiligten
Tabellen haben eine **restriktive** `tenant_boundary_*`-Policy
(`projects`/`audit_log` direkt über `company_id`, `measurements`/
`ausmass`/`reports`/`project_files` über
`EXISTS(... projects p WHERE p.id = project_id AND p.company_id =
my_company_id())`) – frisch per `pg_policy` nachgeprüft. Eine im
Frontend manipulierte Projekt-ID liefert deshalb serverseitig 0 Zeilen;
die ID ist nie für sich allein eine Berechtigung.

Das Stammdaten-`UPDATE` schickt **kein** `company_id` mit und läuft
über dieselbe restriktive Policy. Da ein von RLS blockiertes `UPDATE`
in PostgREST **keinen Fehler** meldet, sondern still 0 Zeilen betrifft
(Lehre aus Abschnitt 24.1), prüft der Client das Ergebnis von
`.select("*")` und zeigt bei 0 Zeilen eine verständliche Meldung statt
eines vorgetäuschten Erfolgs.

System-Admin-Konzept (`system_admins`, `is_system_admin()`, alle
`system_admin_*`-Funktionen) unverändert – das Cockpit ist eine reine
Firmenbenutzer-Funktion.

### 45.6 Tests

**A) Bestehendes Projekt** – die exakten Cockpit-Abfragen als echter,
angemeldeter Benutzer von PETER KÜNZI AG (rein lesend) gegen die
tatsächlichen Zahlen der Datenbank abgeglichen:

| Projekt | Massaufnahmen | Ausmass | Rapporte | Dateien |
|---|---|---|---|---|
| 1 „Home" | 5 | 2 | 0 | 0 |
| 3 „Test Strasse 11" | 5 | 0 | 1 | 0 |
| 4 „Steildachsanierung" | 0 | 0 | 3 | 1 |
| 6 „Brandschaden" | 0 | 0 | 0 | 0 |

Alle vier Zeilen stimmen exakt mit dem Admin-Blick auf die Tabellen
überein – keine Über- oder Untererfassung.

**B) Projekt ohne Daten** – Projekt 6 „Brandschaden" ist real leer und
liefert korrekt überall 0; die Oberfläche zeigt dafür „Noch keine
Massaufnahme/Ausmass/Regierapport/Datei" und „Noch keine Aktivität",
keine falsche „vorhanden"-Meldung. Zusätzlich im Render-Prüfstand
abgesichert (siehe unten).

**C) Sicherheit** (`begin; … rollback;`, Wegwerf-Firma
`99999999-…`, PETER KÜNZI AG nur gelesen):

| Test | Ergebnis |
|---|---|
| Benutzer der Wegwerf-Firma ruft das Cockpit mit den vier echten, bekannten Projekt-IDs von PETER KÜNZI AG auf | Projektzeile **und** alle fünf Abfragen: je **0 Zeilen** |
| Stammdaten-`UPDATE` auf das fremde Projekt `id=1` | **0 geänderte Zeilen**, kein Audit-Eintrag, kein „GEKAPERT" irgendwo sichtbar |
| Stammdaten-`UPDATE` auf das eigene Projekt | erfolgreich, und der **bestehende** Audit-Trigger schreibt automatisch `action='updated'` mit `user_id` des echten Aufrufers und allen vier Feld-Diffs (`name`, `order_no`, `customer`, `object`) – ohne eine Zeile neuen Audit-Code |

**D) Render-Prüfstand** (Node, gegen die echten Funktionen aus
`js/24-projekt-cockpit.js` mit gestellten Abfrageantworten): Projekt mit
Daten (Anzahl + Titel, Titel-Kürzung ab vier Einträgen, leerer Titel
fällt korrekt auf die Fachart zurück), leeres Projekt (keine falschen
„vorhanden"-Texte), Einzahl „1 vorhanden", archiviertes Projekt,
gelöschter Mitarbeiter → „Unbekannter Benutzer", sowie ein
Abfragefehler → verständliche Fehlermeldung statt vorgetäuschter
Übersicht.

**E) Regression** – nach allen Tests erneut geprüft: 2 Firmen,
4 Projekte, 13 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Datei,
0 `audit_log`-Zeilen, Mike Ledermann wieder in PETER KÜNZI AG,
`PETER KÜNZI AG.updated_at` unverändert (`2026-09-01 07:40:15.844647+00`),
Projekt 1 unverändert („Home / 1234 / Hjj / Ppp"), keine Wegwerf-Firma
und kein Testprojekt übrig.

`node --check` über alle `js/*.js` (inkl. der neuen Datei) und `sw.js`:
fehlerfrei. `<div>`/`</div>`-Zählung in `index.html`: ausgeglichen
(630/630, vorher 612/612 – Differenz durch die 18 neuen `<div>`s des
Cockpit-Modals).

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co` direkt, wie in jeder vorherigen
Sitzung. **Das wird hier ausdrücklich nicht als getestet behauptet.**
Alle oben dokumentierten Datenbank-Ergebnisse sind direkte
RLS-Simulationen gegen das echte Produktivschema mit exakt den
Abfragen, die das Cockpit verwendet.

### 45.7 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/24-projekt-cockpit.js` | **neu** – gesamtes Cockpit |
| `index.html` | neues `#projectCockpitModal`, Script-Einbindung, Versionstext 2.37 |
| `js/09-projekte.js` | Knopf „📂 Projekt öffnen" je Projektkarte + eine Verzweigung im bereits vorhandenen, delegierten Klick-Handler |
| `js/03-login.js` | eine Zeile: neues Modal in `goToStart()` mit schliessen (wie jedes andere Modal) |
| `css/01-basis.css` | `.cockpit-tile`-Stile; zusätzlich `flex-wrap:wrap` auf `.project-row-actions`, damit die jetzt sieben Knöpfe je Projektkarte auf Handy/Tablet sauber untereinander umbrechen |
| `sw.js` | Cache-Version 2.37, neue Datei in der SHELL-Liste |

**Nicht verändert**: alle neun Massaufnahme-Fachdateien (`js/10`,
`js/11`, `js/12`, `js/12b`, `js/13`, `js/14`, `js/15`, `js/16`,
`js/19`, `js/20`, `js/21`), `js/17-ausmass.js`, `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js` (Regierapport-Fachlogik/PDF),
`js/23-verlauf.js`, `js/22-system-admin.js` – per `git diff` einzeln
bestätigt. Keine Berechnung, keine Stückliste, kein Zuschnitt, keine
PDF-Logik, kein Speichermodell berührt.

### 45.8 Offene Punkte für v2.38

- Kein Live-Klicktest im Browser möglich (siehe 45.6).
- **Kein Projektstatus** („offen/in Arbeit/fertig") – dafür gibt es kein
  Datenmodell, und ein erfundener Status war ausdrücklich unerwünscht.
  Falls das später gewünscht wird, wäre es eine eigene, bewusste
  Schema-Erweiterung auf `projects`.
- Aus dem Cockpit heraus lässt sich noch **nichts neu anlegen**
  (Massaufnahme/Ausmass/Rapport) – das läuft weiterhin über die
  bestehenden Bereiche, in die das Cockpit springt. Ein „＋ Neu"-Weg
  direkt aus dem Cockpit würde in die geschützten Erfassungs-Dateien
  eingreifen (Projektvorauswahl) und war für diese Runde bewusst
  ausgeschlossen.
- Nach dem Sprung in einen Bereich landet man beim Zurückgehen in der
  Projektliste, nicht wieder im Cockpit – der Rückweg ist in den
  geschützten Erfassungs-Dateien verdrahtet (`measEditReturnTo`/
  `amEditReturnTo`) und wurde deshalb nicht angefasst.
- Die Projektliste selbst zeigt weiterhin keine Anzahlen je Karte; das
  wäre nur mit Sammelabfragen über alle Projekte sinnvoll und war für
  diese Runde nicht verlangt.

## 46. PROJEKT-COCKPIT ALS ZENTRALER ARBEITS-HUB — VERSION 2.38

Baut das Cockpit aus v2.37 (Abschnitt 45) vom reinen Überblick zum
tatsächlichen Arbeitsplatz eines Projekts aus. Ein Projekt wird einmal
geöffnet; danach bleibt der Benutzer darin, bis er bewusst zur
Projektübersicht zurückgeht.

    Projektübersicht → 📂 Projekt öffnen → Cockpit
                     → Massaufnahme / Ausmass / Rapport / Datei / Verlauf
                     → Zurück → wieder Cockpit

**Keine Schemaänderung, keine Migration** – reine Navigation und
Oberfläche.

### 46.1 Projektübersicht aufgeräumt

Vorher trug jede Projektkarte sieben Knöpfe: Löschen, 📂 Projekt öffnen,
📋 Rapporte / 📐 Massaufnahmen / 📏 Ausmasse / 📎 Dateien / 🕒 Verlauf
anzeigen, 📦 Archivieren – plus fünf aufklappbare Listen-Container je
Karte. Die fünf Arbeitsknöpfe und ihre Container sind **entfernt**; sie
werden vollständig durch das Cockpit ersetzt, das jetzt der einzige Ort
für diese Listen ist.

**Keine Funktion ging verloren** – die Aktionen sind alle vorhanden,
nur an einer Stelle statt an zwei:

| Aktion | vorher | jetzt |
|---|---|---|
| Rapporte/Massaufnahmen/Ausmasse/Dateien/Verlauf anzeigen | Projektkarte | Cockpit |
| Öffnen/Drucken/Löschen einzelner Einträge | Projektkarte | Cockpit |
| Datei hochladen/umbenennen/ersetzen/löschen | Projektkarte | Cockpit |
| Projekt öffnen / Archivieren / Reaktivieren / Löschen | Projektkarte | **unverändert** Projektkarte |
| Projekt anlegen, Archiv-Umschaltung, Suche | Projektübersicht | **unverändert** |

Die vier Lade-Funktionen `loadProjectMeasurements()`,
`loadProjectAusmass()`, `loadProjectReports()`, `loadProjectFiles()`
(js/09-projekte.js) sind inhaltlich unverändert geblieben – sie
schreiben nur statt in `[data-…-body="<id>"]` der Projektkarte in die
festen Cockpit-Container (`#cockpitMeasBody` usw.). Feste IDs genügen,
weil im Cockpit immer genau **ein** Projekt geöffnet ist.

Der delegierte Klick-Handler wurde entsprechend geteilt: `#projectList`
behandelt nur noch Projekt-Aktionen (Cockpit öffnen, Archivieren,
Löschen), `#cockpitWorkArea` die Aktionen an einzelnen Einträgen. Die
bisherigen `closest(".project-row")`-Umwege zur Ermittlung des Projekts
entfallen – die Projektzugehörigkeit kommt jetzt aus `cockpitProjectId`.

### 46.2 Cockpit-Abschnitte

Aus den vier Kacheln von v2.37 wurden vier Arbeitsabschnitte mit grossen,
gut treffbaren Knöpfen (Mindesthöhe 42 px, volle Breite auf dem Handy):

| Abschnitt | Knöpfe | Zusatzinfo (aus v2.37 erhalten) |
|---|---|---|
| 📐 Massaufnahmen | Öffnen · ＋ Neu | Anzahl + erste drei Titel |
| 📏 Ausmass | Öffnen · ＋ Neu | Anzahl + erste drei Titel |
| 📋 Regierapport | Öffnen · ＋ Neu | Anzahl |
| 📎 Dateien/Fotos | Öffnen | Anzahl |
| 🕒 Verlauf | Verlauf anzeigen | letzte Aktivität |

„Öffnen" klappt die Liste innerhalb des Cockpits auf (Knopf wechselt auf
„Schliessen") und füllt sie über die bestehende Lade-Funktion. Die
Stammdaten-Bearbeitung aus v2.37 bleibt unverändert.

### 46.3 Zentrale Rückkehr – der Kern von v2.38

Bisher kannte jede Erfassungsdatei ihr Rückziel selbst, in vier
identischen Blöcken:

```js
if(measEditReturnTo==="projectsModal"){$("projectsModal").hidden=false;renderProjectList()}
else{$("measurementsModal").hidden=false;renderMeasurementsOverview()}
measEditReturnTo="measurementsModal";
```

Diese vier Blöcke sind durch **einen Aufruf** je Stelle ersetzt; die
Entscheidung liegt jetzt an genau einer Stelle je Arbeitsbereich
(`js/24-projekt-cockpit.js`):

- `measEditZurueck()` – Massaufnahme
- `amEditZurueck()` – Ausmass
- `reportZurueck()` – Regierapport
- `zurueckInsCockpit()` – gemeinsame Rückkehr; blendet das Cockpit ein,
  lädt die Kennzahlen neu **und** frischt die Bereiche auf, die beim
  Verlassen offen waren (sonst zeigte die Liste noch den alten Stand).

Rückziele: `"projectCockpit"` (neu) oder die jeweilige Übersicht wie
bisher. `"projectsModal"` wird nicht mehr gesetzt – die Projektübersicht
öffnet keine Arbeitsbereiche mehr.

Der Regierapport hatte bisher **gar keinen** Zurück-Knopf, nur „🏠
Start". Neu gibt es `#backFromReportEdit` („↩️ Zurück zum Projekt"),
standardmässig ausgeblendet und nur sichtbar, wenn der Rapport aus dem
Cockpit geöffnet oder angelegt wurde. `openReport(r, returnTo)` nimmt das
Rückziel jetzt als optionalen zweiten Parameter (ohne Angabe wie bisher
die Rapport-Übersicht) – alle bestehenden Aufrufer (Suche,
Rapport-Übersicht) bleiben dadurch unverändert.

### 46.4 Änderungen an geschützten Fachdateien (offen benannt)

Zwei Dateien aus der Schutzliste mussten angefasst werden, ausschliesslich
für die Rückkehr-Navigation:

| Datei | Änderung | Warum |
|---|---|---|
| `js/16-massaufnahme-formular.js` | 2 × drei Zeilen Rückweg → `measEditZurueck()` | Das Ziel darf nicht mehr in der Erfassungsdatei stehen, sonst gäbe es zwei konkurrierende Routing-Systeme |
| `js/17-ausmass.js` | 2 × drei Zeilen Rückweg → `amEditZurueck()` | dito |

Netto −8 Zeilen. **Keine** Berechnung, keine Stückliste, kein Zuschnitt,
kein Speicher-Payload, keine PDF-Logik, keine Validierung berührt – per
`git diff` im Abschlussbericht Zeile für Zeile belegt. Die übrigen
Fachdateien (`js/10`, `js/11`, `js/12`, `js/12b`, `js/13`, `js/14`,
`js/15`, `js/19`, `js/20`, `js/21`, `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `js/23-verlauf.js`,
`js/22-system-admin.js`, `js/05a-rechte.js`) sind unverändert.

### 46.5 Neu anlegen aus dem Cockpit

Das Cockpit erzeugt selbst **nichts** – es startet den bestehenden
Erfassungsprozess und gibt ihm das Projekt mit:

- **Massaufnahme/Ausmass**: dieselbe Typ-Auswahl wie überall
  (`#measTypeChooserModal`/`#amTypeChooserModal`). Der bestehende Handler
  in `js/09-projekte.js` läuft unverändert zuerst und ruft
  `newMeasurementWithType()`/`newAusmassWithType()` auf; ein zusätzlicher
  Listener in `js/24` setzt danach Rückziel und Projekt über die bereits
  vorhandenen Setter `setMeasProjectField()`/`setAmProjectField()`.
  Wichtig: **danach**, weil die Neu-Funktionen ihr Rückziel selbst auf
  die jeweilige Übersicht setzen. Abbrechen in der Typ-Auswahl führt
  zurück ins Cockpit statt in die Übersicht.
- **Regierapport**: `cockpitNeuerRapport()` löst den bestehenden Knopf
  `#newReport` (js/04-start-suche.js) aus. Ein Listener auf demselben
  Knopf ergänzt danach `currentProjectId`, Rückziel und dieselbe
  Vorbefüllung (Auftrags-Nr./Auftraggeber/Objekt), die auch das Auswählen
  eines Projekts im Rapport vornimmt. Wird derselbe Knopf normal
  angeklickt, setzt der Listener das Rückziel wieder auf die
  Rapport-Übersicht – `js/04-start-suche.js` blieb dadurch unverändert.

Die Reihenfolge funktioniert, weil `.onclick`-Zuweisungen beim Laden
registriert werden und `js/04`/`js/09` vor `js/24` geladen werden.

### 46.6 Verlauf und Datenbank

Der Verlauf ist unverändert der kombinierte Projekt-Verlauf aus v2.32
(`toggleProjectVerlaufBox()`, `js/23-verlauf.js`) und klappt **innerhalb**
des Cockpits auf – er verlässt den Projektkontext gar nicht, ein Rückweg
ist deshalb nicht nötig. Kein zweites Verlaufssystem.

**Keine Migration, keine Schemaänderung, keine geänderte Abfrage** – die
fünf Cockpit-Abfragen sind dieselben wie in v2.37.

### 46.7 Tenant-Sicherheit

Unverändert: alle Abfragen filtern nur nach `project_id`, die
Firmengrenze erzwingt ausschliesslich die restriktive
`tenant_boundary_*`-RLS jeder Tabelle. Erneut empirisch bestätigt
(`begin; … rollback;`, Wegwerf-Firma, PETER KÜNZI AG nur gelesen): mit
den vier echten, bekannten Projekt-IDs einer fremden Firma liefern
Projektzeile, Massaufnahmen-, Ausmass-, Rapport-, Datei- und
Verlaufsabfrage **je 0 Zeilen**; das Stammdaten-`UPDATE` ändert **0
Zeilen**; die vier Löschpfade des Cockpits (Massaufnahme, Ausmass,
Rapport, Datei) löschen **0 Zeilen**. Eine manipulierte Projekt-ID im
Frontend öffnet nichts.

### 46.8 Tests

**Navigations-Prüfstand** (Node, gegen die echten Funktionen aus
`js/24-projekt-cockpit.js`, Ereignisreihenfolge wie im Browser) – 23
Prüfungen, alle bestanden:

| Testfall | Ergebnis |
|---|---|
| Projekt öffnen → Cockpit | Cockpit sichtbar, richtige `project_id` |
| Cockpit → Massaufnahmen → Liste | `loadProjectMeasurements(7)` mit richtigem Projekt |
| Massaufnahme → Zurück | **Cockpit** (nicht Projektübersicht), offene Liste neu geladen, Rückziel zurückgesetzt |
| Ausmass → Zurück | **Cockpit** |
| Neuer Regierapport aus Cockpit → Zurück | Rapport-Bildschirm mit `project_id` 7, Zurück-Knopf sichtbar, Zurück → **Cockpit** |
| Neue Massaufnahme aus Cockpit | Typ-Auswahl, danach Rückziel `projectCockpit` + `setMeasProjectField(7)` |
| Projektwechsel A → B | lädt Projekt B, Rückkehr zeigt weiterhin B – kein Vermischen |
| Normalweg ohne Cockpit | Massaufnahme/Ausmass/Rapport kehren unverändert in ihre Übersicht zurück |

Verlauf: klappt im Cockpit auf und zu, verlässt es nicht – ein
Rückweg-Test entfällt.

**Regression**: `node --check` über alle `js/*.js` und `sw.js`
fehlerfrei; `<div>`/`</div>` in `index.html` ausgeglichen (645/645,
vorher 630/630 – Differenz durch die vier Arbeitsabschnitte); keine
verwaisten Verweise auf die entfernten `data-toggle-*`-/`data-…-body`-
Attribute; Produktivdaten vor und nach allen Tests identisch (2 Firmen,
4 Projekte, 13 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Datei, 0
`audit_log`-Zeilen), Mike Ledermann wieder in PETER KÜNZI AG, deren
`updated_at` unverändert (`2026-09-01 07:40:15.844647+00`), Projekt 1
unverändert („Home / 1234 / Hjj / Ppp"), keine Wegwerf-Firma übrig.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Alle Datenbank-Ergebnisse sind direkte
RLS-Simulationen gegen das echte Produktivschema, alle
Navigationsergebnisse stammen aus dem Prüfstand gegen den echten Code.

### 46.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/24-projekt-cockpit.js` | Cockpit als Arbeits-Hub, zentrale Rückkehr, Neu-Anlegen mit Projektkontext |
| `js/09-projekte.js` | Projektkarte aufgeräumt, Listen in die Cockpit-Container, Handler geteilt, `openReport()` mit Rückziel |
| `index.html` | vier Arbeitsabschnitte, `#cockpitWorkArea`, `#backFromReportEdit`, Ausstiegs-Beschriftung, Version 2.38 |
| `js/16-massaufnahme-formular.js` | **nur Navigation**: 2 × Rückweg zentralisiert (46.4) |
| `js/17-ausmass.js` | **nur Navigation**: 2 × Rückweg zentralisiert (46.4) |
| `js/03-login.js` | `goToStart()` setzt zusätzlich das Rapport-Rückziel zurück und blendet den Zurück-Knopf aus |
| `css/01-basis.css` | Stile der Arbeitsabschnitte |
| `sw.js` | Cache-Version 2.38 |

### 46.10 Offene Punkte für v2.39

- Kein Live-Klicktest im Browser möglich (siehe 46.8).
- Kein Projektstatus – unverändert, `projects` hat ausser `archived`
  keine Statusinformation, ein erfundener bleibt ausgeschlossen.
- Die globale Suche und die Übersichten (Massaufnahmen/Ausmass/
  Rapporte) öffnen Einträge weiterhin ohne Projektkontext und kehren
  in ihre jeweilige Übersicht zurück – das ist gewollt, sie sind kein
  Projekt-Einstieg.
- Beim Öffnen eines Arbeitsbereichs bleibt die Liste innerhalb des
  Cockpits (Aufklappen), es gibt bewusst keinen eigenen Vollbild-Screen
  je Bereich – das hätte einen zweiten Rückweg gebraucht.

## 47. PROJEKT-COCKPIT UX / ARBEITSABLAUF — VERSION 2.39

Reine UI-/UX-Runde auf dem Cockpit aus v2.38. **Keine Schemaänderung,
keine Migration, keine geänderte Sicherheitslogik, keine Fachdatei
angefasst** – geändert wurden nur `index.html`, `css/01-basis.css`,
`js/09-projekte.js` (Listen-Darstellung), `js/24-projekt-cockpit.js`
und `sw.js`.

### 47.1 Bestandsaufnahme des v2.38-Cockpits

Der tatsächliche Aufbau vor dieser Runde (im Code nachgelesen, nicht aus
dem v2.38-Bericht übernommen):

1. **Karte 1 – Stammdaten**: vier Eingabefelder plus Speichern-Knopf,
   immer aufgeklappt, ganz oben.
2. **Karte 2 – „🔧 Arbeit"**: vier Abschnitte, je Abschnitt eine
   Kopfzeile mit Anzahl + Titelvorschau, ein Knopf „Öffnen", ein Knopf
   „＋ Neu" und ein zugeklappter Listen-Container.
3. **Karte 3 – Verlauf**: letzte Aktivität, „🕒 Verlauf anzeigen",
   Ausstiegsknöpfe.

Daraus die konkreten Schwachstellen für den Alltag:

| Befund | Auswirkung |
|---|---|
| Stammdaten-Formular ganz oben, immer offen | auf dem Handy stand vor dem ersten Arbeitsbereich ein ganzer Bildschirm Formular – bearbeitet wird im Alltag aber selten |
| „Öffnen" je Abschnitt | ein zusätzlicher Klick **pro Bereich**, nur um zu sehen, was da ist; ein Projekt zu überblicken kostete vier Klicks |
| Öffnen löste eine **zweite** Abfrage aus | die Anzahl kam schon aus der Startabfrage, die Liste holte dieselben Daten nochmals |
| Zeilenkopf „Massaufnahme (Skizze/Foto)" | wiederholte den Abschnittsnamen; der eigentliche Titel stand klein in der zweiten Zeile |
| Rapport-Zeile zeigte nur Datum + Auftrags-Nr. | Auftraggeber und Objekt waren gespeichert, aber unsichtbar |
| `.report-row` ohne `flex-wrap`, Aktionen `flex:0 0 auto` | bei langen Titeln und vier Dateiknöpfen („✏️ Umbenennen", „🔄 Ersetzen") lief die Zeile auf schmalen Handys seitlich aus dem Bild |
| Dateien: nacktes `<input type="file">` | winzige Trefferfläche, kein erkennbarer Knopf |
| Rückkehr ins Cockpit lud **alle** Bereiche neu | fünf Abfragen, obwohl nur einer betroffen war |

### 47.2 Umgesetzte Änderungen

**Stammdaten eingeklappt.** Der Kopf zeigt Projektname und die Zeile
Auftrags-Nr. · Adresse · Auftraggeber. Die vier Felder erscheinen erst
über „✏️ Stammdaten bearbeiten" und werden beim Öffnen eines Projekts
immer wieder eingeklappt. Die Speicherlogik selbst ist unverändert
(inklusive der Prüfung auf 0 geänderte Zeilen aus Abschnitt 45.5).
Dadurch stehen die Arbeitsbereiche sofort oben im Bild.

**Listen immer sichtbar, „Öffnen" je Abschnitt entfernt.** Das entspricht
genau der im Auftrag skizzierten Struktur (Abschnittstitel, Anzahl,
Neu-Knopf, dann direkt die Einträge). Ein Bereich kostet damit **null**
statt einem Klick, ein Eintrag ist ab dem geöffneten Projekt mit **einem**
Klick erreichbar statt mit zweien.

**Gleich viele Abfragen, aber ohne Doppelung.** Die vier bestehenden
Lade-Funktionen `loadProjectMeasurements()`, `loadProjectAusmass()`,
`loadProjectReports()`, `loadProjectFiles()` liefern seit v2.39
zusätzlich ihre Trefferzahl zurück. `loadProjectCockpitData()` ruft sie
gebündelt in **einem** `Promise.all` zusammen mit der Abfrage der letzten
Aktivität auf – fünf Abfragen wie in v2.37/v2.38, aber die vorher
separaten Zähl-Abfragen entfallen und beim Ansehen einer Liste wird
nichts mehr nachgeladen.

**Nach der Rückkehr nur noch der betroffene Bereich.**
`zurueckInsCockpit(bereich)` lädt gezielt „meas", „am" bzw. „rep" plus
die Zeile „letzte Aktivität" – zwei Abfragen statt fünf. Dasselbe gilt
nach Anlegen/Löschen innerhalb des Cockpits: die Handler in
`js/09-projekte.js` rufen jetzt `cockpitBereichAktualisieren(<bereich>)`
statt „Liste laden **und** ganzes Cockpit neu zählen".

**Zeilen neu aufgebaut** – ausschliesslich aus Feldern, die ohnehin schon
geladen sind (per `information_schema` gegengeprüft, siehe 47.4):

| Bereich | Titelzeile | zweite Zeile |
|---|---|---|
| Massaufnahme | `title` (sonst „Ohne Titel") | `MEAS_TYPE_LABELS[type]` · Datum · „zuletzt geändert …" |
| Ausmass | `title` (sonst „Ohne Titel") | Ausmass-Art · Datum · „zuletzt geändert …" |
| Regierapport | Datum | Auftrags-Nr. · Auftraggeber · Objekt (sonst „Ohne Kopfdaten") · „zuletzt geändert …" |
| Datei | Symbol + Dateiname | Grösse · Ersteller · Datum · „ersetzt am …" |

„zuletzt geändert" erscheint nur, wenn `updated_at` vorhanden **und**
von `date` verschieden ist – kein erfundener Status, keine zusätzliche
Abfrage. Die Typbezeichnung kommt weiterhin aus dem bestehenden
`MEAS_TYPE_LABELS`-Katalog.

**Mobile/Tablet.** `.report-row` bricht jetzt um (`flex-wrap:wrap`), der
Infoblock ist `flex:1 1 190px; min-width:0` mit `word-break:break-word`,
die Zeilenknöpfe haben `min-height:34px`. Bei den Dateien sind
„Umbenennen" und „Ersetzen" auf ihre Symbole mit `title`-Tooltip
verkürzt. Damit passt auch eine Zeile mit langem Titel und vier Knöpfen
auf ein schmales Handy, ohne seitliches Scrollen. Die „＋ Neu"-Knöpfe
sind über die volle Breite und mindestens 44 px hoch, klar beschriftet
(„＋ Neue Massaufnahme" statt „＋ Neu"). Der Datei-Upload ist ein
gleichwertig aussehender Knopf „＋ Datei/Foto hinzufügen" (ein `<label>`
mit dem unveränderten, versteckten Dateifeld dahinter) statt eines
nackten `<input type="file">`.

**Anzahl als Zähler-Badge** rechts in der Abschnittsüberschrift statt als
Fliesstext mit Titelvorschau – die Titel stehen jetzt ohnehin in der
Liste darunter.

**Struktur entschachtelt.** Statt „Karte → vier Abschnitte" ist jeder
Arbeitsbereich eine eigene Karte mit eigener `h2`-Überschrift, wie überall
sonst in der App. Das spart eine Verschachtelungsebene und gibt jedem
Bereich eine klare Trennlinie.

### 47.3 Was bewusst NICHT geändert wurde

- **Keine Vollbild-Screens je Bereich** (Auftrag Abschnitt 9) – alles
  bleibt im Cockpit, der Benutzer sieht durchgehend Projektkopf und
  Rückkehrknopf.
- **Kein Projektstatus** – `projects` hat ausser `archived` weiterhin
  keine Statusinformation.
- **Verlauf unverändert** – weiterhin das System aus v2.31/v2.32/v2.36,
  weiterhin aufklappbar innerhalb des Cockpits.
- **Projektübersicht unverändert** – die Aufräumung aus v2.38 bleibt, es
  kamen keine Arbeitsknöpfe auf die Projektkarten zurück.
- **Keine Fachdatei angefasst.** Anders als in v2.38 waren diesmal
  **keinerlei** Änderungen an `js/16-massaufnahme-formular.js`,
  `js/17-ausmass.js` oder irgendeiner anderen Fach-/Login-/Rechte-Datei
  nötig – per `git diff` einzeln bestätigt.

### 47.4 Tests

**Feldprüfung gegen das echte Schema** (`information_schema.columns`):
jedes in den neuen Zeilen angezeigte Feld existiert wirklich –
`measurements`/`ausmass` haben `title`, `type`, `date`, `updated_at`;
`reports` hat `date`, `order_no`, `customer`, `object`, `updated_at`
(und weder `title` noch `type`, weshalb dort das Datum die Titelzeile
bildet); `project_files` hat `name`, `size_bytes`, `mime_type`,
`created_by`, `created_at`, `updated_at`.

**Render-Prüfstand** (Node, gegen die echten Renderer aus
`js/09-projekte.js` mit gestellten Daten):

| Fall | Ergebnis |
|---|---|
| 5 Massaufnahmen, sehr langer Titel, ein leerer Titel | Titel zuerst, leerer Titel → „Ohne Titel", Typ/Datum/„zuletzt geändert" darunter, Rückgabe 5 |
| 2 Ausmasse | korrekt, Rückgabe 2 |
| 2 Rapporte, einer ganz ohne Kopfdaten | Datum als Titelzeile, „176712 · Muster AG · Steildach Nord" bzw. „Ohne Kopfdaten", Rückgabe 2 |
| 1 Datei | Upload-Knopf, Symbol, Grösse/Ersteller/Datum, Rückgabe 1 |
| leeres Projekt (alle vier Bereiche) | „Noch keine Massaufnahme/kein Ausmass/kein Regierapport/keine Datei zu diesem Projekt.", Neu-Knöpfe sichtbar, Rückgabe 0 |
| Ladefehler | Fehlermeldung in der Liste, Rückgabe `undefined` → Zähler zeigt „?" statt einer falschen 0 |

**Navigations-Prüfstand** (Node, echte Funktionen, Ereignisreihenfolge
wie im Browser) – 23 Prüfungen, alle bestanden, u. a.:
- Projekt öffnen lädt alle vier Listen in einem Rutsch
- Massaufnahme → Zurück → **Cockpit**, dabei wird **nur** der
  Massaufnahme-Bereich neu geladen
- Ausmass und Regierapport ebenso
- Neuer Rapport aus dem Cockpit übernimmt `project_id`, zeigt den
  Zurück-Knopf, kehrt ins Cockpit zurück
- Neue Massaufnahme aus dem Cockpit setzt Rückziel und Projekt
- Projektwechsel A → B lädt B, spätere Rückkehr zeigt weiterhin B
- der Normalweg ohne Cockpit kehrt unverändert in die jeweilige Übersicht
  zurück

**Sicherheit** (`begin; … rollback;`, Wegwerf-Firma, PETER KÜNZI AG nur
gelesen): mit den vier echten, bekannten Projekt-IDs einer fremden Firma
liefern Projektzeile sowie alle vier Listen-Abfragen (jetzt `select("*")`)
und die Verlaufsabfrage **je 0 Zeilen**. Die Firmengrenze erzwingt
weiterhin ausschliesslich die restriktive `tenant_boundary_*`-RLS;
`project_id` ist nach wie vor keine Berechtigung.

**Reale Zahlen** als eingeloggter Benutzer gegengeprüft: Projekt 1
„Home" 5/2/0/0, Projekt 3 „Test Strasse 11" 5/0/1/0, Projekt 4
„Steildachsanierung" 0/0/3/1, Projekt 6 „Brandschaden" 0/0/0/0 –
identisch zum Admin-Blick.

**Regression**: `node --check` über alle `js/*.js` und `sw.js`
fehlerfrei; `<div>`/`</div>` in `index.html` ausgeglichen (642/642,
vorher 645/645 – weniger, weil die vier Abschnitts-Wrapper und die
Öffnen-Leisten entfielen); jede Cockpit-Element-ID genau einmal
vorhanden; keine verwaisten Verweise auf `data-cockpit-open`,
`cockpit-tile`, `cockpit-section`, `cockpitBereichOeffnen`,
`cockpitListenSchliessen` oder `refreshCockpitCounts`; Produktivdaten vor
und nach allen Tests identisch (2 Firmen, 4 Projekte, 13 Massaufnahmen,
2 Ausmasse, 4 Rapporte, 1 Datei, 0 `audit_log`-Zeilen), Mike Ledermann
weiterhin in PETER KÜNZI AG, deren `updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`), Projekt 1 unverändert
(„Home / 1234 / Hjj / Ppp").

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Insbesondere die Darstellung auf einem echten
Handy/Tablet wurde nicht visuell geprüft, sondern über die CSS-Regeln
(Umbruch, `min-width:0`, `word-break`, Mindesthöhen) gegen die bereits
erprobten bestehenden Klassen abgeglichen.

### 47.5 Geänderte Dateien

| Datei | Warum |
|---|---|
| `index.html` | Cockpit neu aufgebaut: eingeklappte Stammdaten, vier eigenständige Bereichskarten, Zähler-Badge, klare Neu-Knöpfe, Version 2.39 |
| `js/24-projekt-cockpit.js` | gebündeltes Laden über die bestehenden Lade-Funktionen, Auf-/Zuklappen entfernt, gezielte Bereichs-Aktualisierung, Stammdaten-Umschalter |
| `js/09-projekte.js` | Listen-Zeilen neu aufgebaut (Titel zuerst, echte Kurzinfos), Rückgabe der Anzahl, kompakte Dateiliste mit Upload-Knopf, Handler nutzen die gezielte Aktualisierung |
| `css/01-basis.css` | umbruchfähige Zeilen, grössere Trefferflächen, Zähler-Badge, Neu-/Upload-Knopf über volle Breite |
| `sw.js` | Cache-Version 2.39 |

### 47.6 Offene Punkte für v2.40

- Kein Live-Klicktest im Browser möglich (siehe 47.4).
- Bei sehr vielen Einträgen in einem einzelnen Projekt wird die Liste
  ungekürzt angezeigt (keine Begrenzung, kein „mehr laden") – bei den
  realen Datenmengen (höchstens einstellige Anzahl je Projekt) bewusst
  nicht gebaut, wäre bei Bedarf eine eigene, kleine Erweiterung.
- Kein Projektstatus, keine Sortier-/Filtermöglichkeit innerhalb der
  Cockpit-Listen – beides war nicht verlangt und hätte neue Konzepte
  eingeführt.

## 48. GLOBALE SUCHE → PROJEKT-COCKPIT — VERSION 2.40

Die globale Suche nutzt jetzt den Projektkontext des Cockpits. **Keine
Schemaänderung, keine Migration, keine geänderte Suchabfrage** – die
drei Abfragen der Suche sind Zeile für Zeile unverändert (per `git diff`
belegt), geändert wurden nur Trefferdarstellung und der Weg nach dem
Klick.

### 48.1 Suchaufbau vor der Änderung (aus dem echten v2.39-Code)

`debouncedGlobalSearch()` (js/04-start-suche.js) sucht in **drei**
Tabellen, dazu kommt eine vierte, clientseitige Erweiterung:

| Suchart | Feld(er) | Abfrage |
|---|---|---|
| Regierapport | `customer`, `object`, `order_no` | `.or(...ilike...)`, `limit(30)` |
| Massaufnahme | `title` | `.ilike("title",…)`, `limit(30)` |
| Ausmass | `title` | `.ilike("title",…)`, `limit(30)` |
| Projektname | `allProjects` clientseitig | danach je eine `.in("project_id",…)`-Nachladung für alle drei Tabellen, zusammengeführt über `mergeById()` |

**`project_files` wird nicht durchsucht** – es gibt also keine
Datei-Suche (Auftrag Abschnitt 15 D: „falls unterstützt"). Das wurde
bewusst nicht neu gebaut, da es eine zusätzliche Suchart wäre und nicht
verlangt war.

Die Trefferzeile zeigte bisher `<b>📐 Massaufnahme (Typ)</b>` und
darunter `Titel · Projekt · Datum` – der Abschnittsname stand also an
der prominentesten Stelle, der eigentliche Treffer klein darunter. Ein
einziger Knopf (✏️) öffnete den Eintrag direkt.

### 48.2 Welche Sucharten eine `project_id` besitzen

Direkt am Schema geprüft (`information_schema.columns`): `measurements`,
`ausmass` und `reports` haben **alle drei** eine `project_id`-Spalte
(nullable, `ON DELETE SET NULL`). Da die Suche mit `select("*")` lädt,
**bringt jeder Treffer seine `project_id` bereits mit** – für den
Projektkontext ist **keine einzige zusätzliche Abfrage** nötig (Auftrag
Abschnitt 11). Die bestehende Renderfunktion nutzte `r.data.project_id`
sogar schon, nur eben nicht für die Navigation.

`project_id` kann echt `NULL` sein: in den Produktivdaten haben
**3 von 13 Massaufnahmen** kein Projekt (das zugehörige Projekt wurde
gelöscht, `ON DELETE SET NULL`). Dieser Fall ist also real erreichbar
und behält exakt das bisherige Verhalten.

### 48.3 Umgesetzt

**Trefferdarstellung** – dieselben Angaben wie bisher, nur geordnet:

| | vorher | jetzt |
|---|---|---|
| Titelzeile | „Massaufnahme (Skizze/Foto)" | **der gefundene Eintrag** („Dach Nord") |
| Zweite Zeile | Titel · Projekt · Datum | Trefferart · **📁 Projektname** · Datum |
| Rapport-Titelzeile | „Regierapport" | Auftrags-Nr. · Auftraggeber · Objekt (sonst Datum) |

Kein Feld ging verloren; die Typbezeichnung kommt weiterhin aus
`MEAS_TYPE_LABELS` bzw. dem Ausmass-Katalog.

**Zwei Wege je Treffer:**
- **„📂 Projekt"** – nur wenn der Treffer zu einem Projekt der eigenen
  Firma gehört. Öffnet das Projekt-Cockpit und hebt den Treffer dort
  hervor.
- **„✏️"** – der bisherige Direktweg, unverändert
  (`openReport`/`openMeasurement`/`openAusmass` wie zuvor). Treffer ohne
  Projektbezug haben **nur** diesen Knopf, ihr Verhalten ist identisch
  zu v2.39.

**Treffer im Cockpit wiederfinden.** Seit v2.39 sind alle vier
Arbeitslisten beim Öffnen des Cockpits ohnehin geladen und sichtbar –
„der passende Abschnitt ist schon offen" ist also bereits erfüllt. Neu
ist nur `cockpitTrefferHervorheben({kind,id})`: sucht innerhalb von
`#cockpitWorkArea` den bereits gerenderten Knopf des Eintrags
(`data-open-project-measurement` / `data-open-project-ausmass` /
`data-open-report`), scrollt dessen Zeile in die Mitte und hebt sie
fünf Sekunden mit einem blauen Rahmen hervor. Findet sich die Zeile
nicht (z. B. inzwischen gelöscht), passiert nichts – kein Fehler.

`openProjectCockpit(projectId, treffer)` hat dafür einen **optionalen
zweiten Parameter** bekommen; alle bisherigen Aufrufer (Projektkarte)
bleiben unverändert.

### 48.4 Rückweg

Aus dem Cockpit heraus geöffnete Einträge laufen über die bereits
bestehenden Cockpit-Listen – deren Klick-Handler setzt seit v2.38
`measEditReturnTo`/`amEditReturnTo`/`reportReturnTo` auf
`"projectCockpit"`. Der Rückweg ist damit ohne eine Zeile neuen
Routing-Codes: **Suche → Cockpit → Eintrag → Zurück → dasselbe
Cockpit**, nicht zurück in die Suche. Der Direktweg (✏️) behält seinen
bisherigen Rückweg in die jeweilige Übersicht.

### 48.5 Tenant-Sicherheit

`project_id` ist weiterhin ausschliesslich Navigationskontext, nie eine
Berechtigung. Drei unabhängige Schichten:

1. Die Suchabfragen selbst laufen über die restriktiven
   `tenant_boundary_*`-Policies – fremde Treffer landen gar nicht erst
   im `globalSearchCache`.
2. `openProjectCockpit()` findet das Projekt nur in `allProjects`, und
   das ist bereits RLS-gefiltert – eine manipulierte fremde Projekt-ID
   öffnet nichts (empirisch geprüft, siehe 48.6).
3. Jede Cockpit-Abfrage ist erneut RLS-gebunden (unverändert seit v2.37).

Die Hervorhebung arbeitet ausschliesslich auf bereits gerenderten,
RLS-gefilterten Zeilen – sie kann nichts sichtbar machen, was nicht
ohnehin geladen wurde.

### 48.6 Tests

**Such-Prüfstand** (Node, gegen die echte `debouncedGlobalSearch()` mit
gestellten Antworten): vier Treffer (Rapport, zwei Massaufnahmen – eine
davon **ohne** Projekt – und ein Ausmass).

| Prüfung | Ergebnis |
|---|---|
| Trefferzahl unverändert | 4 Treffer, keiner verloren |
| Darstellung | „📐 Dach Nord / Massaufnahme · Skizze/Foto · 📁 Home · 2026-08-29" |
| Cockpit-Knöpfe | genau 3 – nur bei Treffern **mit** Projekt |
| Direkt-Knöpfe | 4 – bei **allen** Treffern |
| Cockpit-Weg Massaufnahme | `openProjectCockpit(1, measurement#12)` |
| Cockpit-Weg Rapport | `openProjectCockpit(3, report#5)` |
| Cockpit-Weg Ausmass | `openProjectCockpit(1, ausmass#2)` |
| Treffer ohne Projekt → Direktweg | `openMeasurement(13)` – identisch zu v2.39 |
| Rapport-Direktweg | `openReport(5, undefined)` – identisch zu v2.39 |

**Treffer-Prüfstand** (gegen die echten Cockpit-Funktionen): Zeile wird
hervorgehoben und angescrollt, die Hervorhebung verschwindet nach
Ablauf wieder; ein nicht (mehr) vorhandener Treffer, ein Aufruf ohne
Treffer-Angabe und eine **fremde Projekt-ID** führen alle zu keinem
Fehler – die fremde ID öffnet das Cockpit gar nicht erst.

**Cross-Tenant** (`begin; … rollback;`, Wegwerf-Firma, PETER KÜNZI AG
nur gelesen): als Benutzer einer fremden Firma liefern **alle vier**
Suchabfragen (Rapporte, Massaufnahmen, Ausmasse, Projektnamen) sowie
die drei `.in("project_id",…)`-Nachladungen mit den echten, bekannten
Projekt-IDs **je 0 Zeilen**.

**Eigene Firma** (rein lesend): dieselbe Abfrage liefert die echten
Treffer inklusive ihrer `project_id` (z. B. Massaufnahme 3 → Projekt 1,
Massaufnahme 10 → Projekt 3) – der Projektkontext steht also
tatsächlich ohne Zusatzabfrage zur Verfügung.

**Regression**: die Prüfstände aus v2.38/v2.39 erneut laufen lassen –
23/23 Navigationsprüfungen bestanden, Listenrendering unverändert.
`node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`-Balance unverändert 642/642. Produktivdaten vor und nach allen
Tests identisch (2 Firmen, 4 Projekte, 13 Massaufnahmen, 2 Ausmasse,
4 Rapporte, 1 Datei, 0 `audit_log`-Zeilen), Mike Ledermann weiterhin in
PETER KÜNZI AG, deren `updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`), Projekt 1 unverändert.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.**

### 48.7 Mobile

`.meas-row` (Suchtreffer und die drei Übersichten) bricht jetzt um
statt seitlich zu scrollen; lange Titel werden umgebrochen statt mit
`text-overflow:ellipsis` abgeschnitten (bisher gingen lange Titel dort
verloren). Trefferflächen der Zeilenknöpfe auf mindestens 34 px erhöht,
der Cockpit-Knopf ist beschriftet statt nur ein Symbol.

### 48.8 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/04-start-suche.js` | Trefferdarstellung (Treffer zuerst, Projekt klar), neuer „📂 Projekt"-Knopf und dessen Handler. **Suchabfragen unverändert.** |
| `js/24-projekt-cockpit.js` | `openProjectCockpit()` um optionalen Treffer-Parameter erweitert, `cockpitTrefferHervorheben()` ergänzt |
| `css/01-basis.css` | Hervorhebung des Treffers, umbruchfähige Trefferzeilen, grössere Trefferflächen |
| `index.html` | nur Versionstext 2.40 |
| `sw.js` | Cache-Version 2.40 |

**Nicht angefasst**: sämtliche Fach-, Login-, Rechte- und
System-Admin-Dateien, `js/09-projekte.js`, `js/23-verlauf.js` – per
`git diff` einzeln bestätigt.

### 48.9 Offene Punkte für v2.41

- Kein Live-Klicktest im Browser möglich (siehe 48.6).
- **Keine Datei-Suche**: `project_files` wird von der globalen Suche
  weiterhin nicht durchsucht (siehe 48.1) – wäre eine neue Suchart und
  war nicht Teil dieses Auftrags.
- Treffer ohne Projektbezug (real vorhanden: 3 Massaufnahmen) bekommen
  bewusst keinen Cockpit-Weg – dafür gibt es kein Projekt.
- Das `limit(30)` je Tabelle ist unverändert; bei sehr vielen Treffern
  gibt es weiterhin keine Nachlade-Funktion.

## 49. SCHNELLZUGRIFF „ZULETZT BEARBEITET" — VERSION 2.41

Die Projektübersicht bekommt oben einen kompakten Schnellzugriff auf die
zuletzt bearbeiteten aktiven Projekte. **Keine Schemaänderung, keine
Migration** – geändert wurden nur `index.html`, `js/09-projekte.js`,
`css/01-basis.css` und `sw.js`.

### 49.1 Was `projects.updated_at` tatsächlich bedeutet

Der Trigger `set_creator_editor_meta()` (v2.28) setzt `updated_at` bei
jedem Schreiben **der Projektzeile selbst**. Im Client schreibt nur drei
Stellen darauf: Projekt anlegen, Stammdaten im Cockpit speichern
(v2.37) und Archivieren/Reaktivieren. **Arbeit am Projekt** –
Massaufnahme, Ausmass, Rapport, Datei – fasst die Projektzeile
**nicht** an.

An den echten Produktivdaten nachgerechnet (rein lesend):

| Projekt | `projects.updated_at` | jüngste echte Arbeit |
|---|---|---|
| 1 Home | 24.08. 14:44 | **31.08. 09:01** (Massaufnahme) |
| 3 Test Strasse 11 | 27.08. 07:14 | **01.09. 10:07** (Rapport) |
| 4 Steildachsanierung | 29.08. 20:37 | **01.09. 13:41** (Rapport) |
| 6 Brandschaden | 01.09. 15:05 | keine – nur angelegt |

`projects.updated_at` **allein** wäre damit nachweislich irreführend:
„Home" stünde mit dem 24.08. ganz hinten, obwohl dort am 31.08.
gearbeitet wurde. Variante A des Auftrags ist damit empirisch
ausgeschlossen.

### 49.2 Gewählte Datenquelle und Begründung

Verwendet wird der **späteste echte Bearbeitungszeitpunkt über alle
Projektdaten**: die Projektzeile selbst **und** die zugehörigen
`measurements`, `ausmass`, `reports`, `project_files`. Deren
`updated_at` setzt seit v2.28/v2.29 derselbe serverseitige Trigger –
die Werte sind verlässlich und rückwirkend vorhanden.

Damit zeigt „Home" jetzt korrekt den 31.08. statt den 24.08.

**Warum nicht `audit_log`** (Variante B): fachlich die sauberste Quelle
(es kennt auch Löschungen), aber die Tabelle ist bis heute **leer** –
seit v2.30 gab es keine reale Nutzung. Ein audit_log-basierter
Schnellzugriff wäre für alle Benutzer dauerhaft leer, bis neue Arbeit
anfällt, und könnte die oben belegte zurückliegende Arbeit gar nicht
abbilden. Er bleibt die naheliegende spätere Verfeinerung, sobald
`audit_log` gefüllt ist.

**Die Projektzeile bleibt bewusst mit in der Berechnung**: ein gerade
angelegtes oder umbenanntes Projekt ist eine echte Bearbeitung dieses
Projekts, und ein frisch angelegtes Projekt soll auffindbar sein, ohne
die ganze Liste zu durchsuchen. Deshalb steht im Beispiel oben das
leere „Brandschaden" zuoberst – mit seinem echten Zeitstempel, ohne
erfundene Zusatzaussage. Es wird **kein** Status wie „in Arbeit"/
„offen"/„fertig" erzeugt (Auftrag Abschnitt 9/15).

### 49.3 Darstellung

Eigene Karte **über** der bestehenden „📁 Projekte"-Karte:

```
🕘 Zuletzt bearbeitet
📁 Steildachsanierung
176712 · Gestern · 13:41 · Mike Ledermann          ›
```

- Die **ganze Karte ist der Knopf** (`min-height:52px`, volle Breite) –
  ein Klick, grosse Trefferfläche auf Handy/Tablet.
- Angezeigt werden ausschliesslich echte Felder: Projektname,
  Auftrags-Nr., Zeitpunkt, Benutzer.
- Zeitpunkt als „Heute · 07:32" / „Gestern · 14:05" / „24.8.2026 ·
  14:44".
- Benutzer über das bestehende `profileName()`. `updated_by` nicht
  gesetzt (ältere Datensätze) → Benutzer wird weggelassen; gesetzt, aber
  nicht auflösbar (gelöschter Mitarbeiter) → „Unbekannter Benutzer" wie
  überall sonst.
- Leerzustand: „Noch keine zuletzt bearbeiteten Projekte." – keine
  Fehlermeldung.

**Anzahl: 4** (`RECENT_PROJECT_ANZAHL`). Bewusst klein gewählt: es ist
ein Schnellzugriff, keine zweite Projektliste; bei den realen
Datenmengen (aktuell 4 aktive Projekte) deckt das den Alltag ab.

**Archiv**: nur aktive Projekte. `allProjects` ist bereits
RLS-gefiltert, `archived` wird zusätzlich ausgefiltert – die bestehende
Archiv-Umschaltung der Projektliste bleibt davon unberührt, es wurde
keine neue Archivlogik gebaut.

**Öffnen**: `openProjectCockpit(projectId)` – exakt dieselbe Funktion
wie die Projektkarte, kein zweites Öffnungssystem. Danach gilt
vollständig der v2.38/v2.39-Projektkontext, der Rückweg aus dem Cockpit
führt wie bisher in die Projektübersicht.

### 49.4 Performance

**Keine Abfrage pro Projekt.** Vier gebündelte, begrenzte Abfragen in
einem `Promise.all` liefern die je 100 jüngsten Datensätze pro Art
(`project_id`, `updated_at`, `updated_by` – drei Spalten); der Stand je
Projekt wird daraus im Browser bestimmt. Der Projektstand selbst kommt
aus dem bereits geladenen `allProjects`, dafür fällt gar keine Abfrage
an.

Bewusste Grenze: ein Projekt, dessen jüngster Datensatz nicht unter den
100 jüngsten seiner Art ist, erscheint nicht über diese Quelle – dann
sind aber mindestens 100 neuere Bearbeitungen erfolgt, es gehört also
per Definition nicht zu den zuletzt bearbeiteten. Ein Zähler
(`recentProjectsLauf`) verwirft das Ergebnis, wenn zwischenzeitlich
eine neuere Aktualisierung gestartet wurde.

Aufgefrischt wird der Schnellzugriff aus `renderProjectList()` heraus –
also beim Öffnen der Übersicht, nach Anlegen/Archivieren/Löschen und
bei der Rückkehr aus dem Cockpit. Der Aufruf läuft bewusst ohne
`await`, damit die Projektliste selbst nicht auf die Abfragen wartet.

### 49.5 Tenant-Sicherheit

Unverändert: alle vier Abfragen laufen ohne jeden `company_id`-Filter
im Client – die Firmengrenze erzwingt weiterhin ausschliesslich die
restriktive `tenant_boundary_*`-RLS jeder Tabelle. `project_id`,
`updated_by` und `audit_log` sind an keiner Stelle eine Berechtigung.
Empirisch bestätigt (`begin; … rollback;`, Wegwerf-Firma): als Benutzer
einer fremden Firma liefern alle vier Quellabfragen **und** die
Projektliste **je 0 Zeilen**.

### 49.6 Tests

**Prüfstand gegen die echte `renderRecentProjects()`**, gespeist mit den
tatsächlichen Produktivzeitstempeln:

| Test | Ergebnis |
|---|---|
| A) Reihenfolge | 6, 4, 3, 1 – jüngste echte Bearbeitung zuerst |
| A) Anzahl | auf 4 begrenzt |
| A) Verbesserung belegt | „Home" zeigt **31.8.** (echte Arbeit) statt 24.8. (Zeilenänderung); „Test Strasse 11" 10:07 statt 27.8.; „Steildachsanierung" 13:41 statt 29.8. |
| B) Öffnen | Klick ruft `openProjectCockpit(3)` |
| D) Archiv | archiviertes Projekt verschwindet aus dem Schnellzugriff, übrige bleiben |
| E) Kein Projekt | „Noch keine zuletzt bearbeiteten Projekte.", keine Fehlermeldung |
| F) Benutzer | bekannt → „Mike Ledermann"; gelöscht → „Unbekannter Benutzer"; Feld leer → Benutzer weggelassen |
| Ladefehler | verständliche Meldung statt leerer Liste |
| Zeitformat | „Heute", „Gestern", sonst Datum |

**H) Cross-Tenant**: siehe 49.5 – alle Quellabfragen 0 Zeilen.

**I) Regression**: die Prüfstände aus v2.38/v2.39/v2.40 erneut gelaufen
– Navigation 23/23, Suche 7/7, Treffer-Hervorhebung 7/7, Listenrendering
unverändert. `node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`/`</div>` in `index.html` ausgeglichen (644/644, vorher 642/642 –
Differenz durch die neue Karte). Produktivdaten vor und nach allen Tests
identisch (2 Firmen, 4 Projekte, 13 Massaufnahmen, 2 Ausmasse, 4
Rapporte, 1 Datei, 0 `audit_log`-Zeilen), alle vier
`projects.updated_at` unverändert, Mike Ledermann weiterhin in
PETER KÜNZI AG, deren `updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`).

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.**

### 49.7 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/09-projekte.js` | `renderRecentProjects()`, Zeitformat, Klick-Handler; `renderProjectList()` frischt den Schnellzugriff mit auf |
| `index.html` | neue Karte „🕘 Zuletzt bearbeitet" über der Projektkarte, Version 2.41 |
| `css/01-basis.css` | `.recent-project`-Stile (ganze Karte als Knopf, umbruchfähig) |
| `sw.js` | Cache-Version 2.41 |

**Nicht angefasst**: sämtliche Fach-, Cockpit-, Such-, Verlaufs-,
Login-, Rechte- und System-Admin-Dateien – per `git diff` einzeln
bestätigt. Die bestehende Projektliste, das Anlegen-Formular und die
Archiv-Umschaltung sind unverändert.

### 49.8 Offene Punkte für v2.42

- Kein Live-Klicktest im Browser möglich (siehe 49.6).
- Sobald `audit_log` real gefüllt ist, wäre eine Umstellung auf
  `audit_log.project_id` die sauberere Quelle (eine einzige Abfrage,
  erfasst auch Löschungen). Das ist bewusst noch nicht gebaut, weil die
  Tabelle heute leer ist – siehe 49.2.
- Das Limit von 100 Datensätzen je Art ist eine bewusste, dokumentierte
  Grenze (siehe 49.4).
- Kein Projektstatus, keine Favoriten/Anheften – beides hätte ein neues
  Datenmodell gebraucht.

## 50. PROJEKT-COCKPIT – ARBEITSSTAND — VERSION 2.42

Das Cockpit beantwortet jetzt oben auf einen Blick: „Was ist bei diesem
Projekt tatsächlich vorhanden?" **Keine Schemaänderung, keine Migration,
keine einzige zusätzliche Abfrage** – geändert wurden nur `index.html`,
`js/24-projekt-cockpit.js`, `css/01-basis.css` und `sw.js`.

### 50.1 Bestandsaufnahme (frisch am v2.41-Code geprüft)

`loadProjectCockpitData()` lädt beim Öffnen eines Projekts alle vier
Arbeitsbereiche plus die letzte Aktivität in **einem** `Promise.all` –
fünf Abfragen. Die vier Ladefunktionen aus `js/09-projekte.js`
(`loadProjectMeasurements()` usw.) **liefern seit v2.39 ihre Trefferzahl
zurück**; `cockpitZeigeAnzahl(key,n)` schreibt sie als Badge in die
jeweilige Abschnittsüberschrift, `undefined` (Abfragefehler) wird bereits
als „?" dargestellt.

Damit war die eigentliche Datengrundlage für einen Arbeitsstand schon
vollständig vorhanden. Was fehlte, war die Zusammenfassung: die vier
Zahlen standen verteilt über vier Karten, die letzte Aktivität ganz unten
in der Verlaufskarte. Auf dem Handy musste man scrollen, um zu sehen, was
überhaupt da ist.

### 50.2 Umgesetzt

In der **Kopfkarte** (wo Projektname und Auftrags-Nr./Adresse/Auftraggeber
bereits stehen) ein kompakter Block:

```
ARBEITSSTAND
✓  📐 Massaufnahmen        5
✓  📏 Ausmass              2
○  📋 Regierapporte        Noch keine
○  📎 Dateien/Fotos        Noch keine
🕘 Letzte Aktivität        Noch keine Aktivität
```

- **Nur Fakten.** `n > 0` → „✓" und die Zahl; `n = 0` → „○" und
  „Noch keine …". Es wird nirgends behauptet, etwas „fehle", sei „nicht
  erledigt" oder „müsse gemacht werden" – aus dem Fehlen eines
  Datensatzes folgt nicht, dass er fachlich nötig wäre. Kein
  Projektstatus, keine neuen Zustände.
- **Die Arbeitsbereich-Karten aus v2.39/v2.40 bleiben unverändert**
  darunter stehen und voll interaktiv – der Arbeitsstand ersetzt sie
  nicht, er fasst sie zusammen.

### 50.3 Datenquellen – keine zusätzliche Abfrage

`cockpitZeigeAnzahl(key,n)` ist weiterhin die **einzige** Stelle, die
eine Anzahl anzeigt; sie schreibt denselben Wert jetzt an zwei Orte
(Badge in der Abschnittsüberschrift **und** Arbeitsstand-Zeile). Es wird
also exakt der Wert verwendet, den die bestehende Ladefunktion ohnehin
zurückgibt – dieselben Tabellen werden **nicht** ein zweites Mal nur zum
Zählen abgefragt.

Die letzte Aktivität kommt aus der bereits vorhandenen, unveränderten
Abfrage in `cockpitAktivitaetLaden()` (v2.37/v2.39). Dieselbe
zurückgelieferte Zeile speist beide Anzeigen: im Arbeitsstand nur der
Zeitpunkt über das bestehende `verlaufFormatWann()` (v2.31), in der
Verlaufskarte wie bisher der ganze Satz. **Keine neue Audit-/
Aktivitätslogik.** Ist `audit_log` leer – aktuell der Fall – steht dort
weiterhin „Noch keine Aktivität".

Damit gilt auch die v2.39-Regel unverändert weiter: nach der Rückkehr ins
Cockpit lädt `cockpitBereichAktualisieren(bereich)` nur den betroffenen
Bereich neu – der Arbeitsstand folgt automatisch, weil er an derselben
Funktion hängt.

### 50.4 Fehlerfälle

Liefert eine Ladefunktion `undefined` (Abfrage fehlgeschlagen), steht in
Badge **und** Arbeitsstand „?" – **niemals eine falsche 0**. Betroffen
ist nur der fehlgeschlagene Bereich; die übrigen zeigen weiterhin ihre
korrekten Zahlen, das Projekt wird nicht als leer dargestellt.
Schlägt die Aktivitätsabfrage fehl, steht im Arbeitsstand „?" und in der
Verlaufskarte wie bisher die verständliche Fehlermeldung.

### 50.5 Navigation

Jede Arbeitsstand-Zeile ist anklickbar und scrollt zur bereits
vorhandenen Karte des Bereichs (`scrollIntoView`) – **keine zweite
Navigation, kein Nachladen, keine neue Abfrage**. Ein einziger
delegierter Handler auf `#projectCockpitModal` erledigt das. Die Zeile
„Letzte Aktivität" ist bewusst nicht anklickbar (reine Information).

### 50.6 Mobile

Kompakte Zeilen mit `min-height:38px`, Zeilenaufbau Marke · Name · Wert
mit `flex`, `min-width:0` und `word-break:break-word` – lange Namen
brechen um, kein horizontales Scrollen. Der Block ist bewusst flach
(keine hohe Karte), damit er die Arbeitsbereiche darunter nicht
verdrängt.

### 50.7 Sicherheit

**Keine Sicherheitsänderung.** Es wurde keine einzige Abfrage ergänzt
oder verändert; der Arbeitsstand zeigt ausschliesslich Werte, die die
bestehenden, RLS-gebundenen Ladefunktionen bereits geliefert haben.
Empirisch erneut bestätigt (`begin; … rollback;`, Wegwerf-Firma): als
Benutzer einer fremden Firma liefern alle fünf Quellen (Massaufnahmen,
Ausmasse, Rapporte, Dateien, `audit_log`) sowie die Projektzeile selbst
mit den echten bekannten Projekt-IDs **je 0 Zeilen**.

### 50.8 Tests

**Prüfstand gegen die echten Cockpit-Funktionen** – 17 Prüfungen, alle
bestanden:

| Test | Ergebnis |
|---|---|
| A/C) 5 / 2 / 0 / 0 | „✓ 5", „✓ 2", „○ Noch keine", „○ Noch keine" – exakt diese Werte |
| A) Letzte Aktivität | „31.08.2026 09:01" im Arbeitsstand, voller Satz in der Verlaufskarte |
| A) Zusatzabfragen | **keine** – nur die schon vorher vorhandene Aktivitätsabfrage |
| B) Projekt ohne Daten | überall „○ Noch keine …", „Noch keine Aktivität", keine Statusbehauptung („fehlt/erledigt/muss") |
| D) Fehler in einem Bereich | dieser Bereich „?", die übrigen weiterhin korrekt (5 bzw. 1) |
| D2) Fehler bei der Aktivität | Arbeitsstand „?", Bereiche unbeeinflusst |
| E) Navigation | Klick auf eine Zeile scrollt zur passenden Karte |
| F) Projektwechsel A→B | keine vermischten Zahlen |
| Einzel-Aktualisierung | nach Löschen folgt der Arbeitsstand dem neuen Wert |

**Reale Gegenprobe** als eingeloggter Benutzer (rein lesend): Projekt 1
„Home" 5/2/0/0, Projekt 3 5/0/1/0, Projekt 4 0/0/3/1, Projekt 6
„Brandschaden" 0/0/0/0, `audit_log` überall 0 – identisch zum
Admin-Blick.

**G) Regression**: alle bisherigen Prüfstände erneut gelaufen –
Navigation 23/23, Suche 7/7, Treffer-Hervorhebung 7/7, Schnellzugriff
12/12, Listenrendering unverändert. `node --check` über alle `js/*.js`
und `sw.js` fehlerfrei, `<div>`/`</div>` in `index.html` ausgeglichen
(647/647, vorher 644/644). Produktivdaten vor und nach allen Tests
identisch (2 Firmen, 4 Projekte, 13 Massaufnahmen, 2 Ausmasse, 4
Rapporte, 1 Datei, 0 `audit_log`-Zeilen), alle vier
`projects.updated_at` unverändert, PETER KÜNZI AG `updated_at`
unverändert (`2026-09-01 07:40:15.844647+00`).

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.**

### 50.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `index.html` | Arbeitsstand-Block in der Kopfkarte, IDs auf den vier Bereichskarten (Sprungziel), Version 2.42 |
| `js/24-projekt-cockpit.js` | `cockpitZeigeAnzahl()` schreibt zusätzlich in den Arbeitsstand, `cockpitStandLaedt()`, Zeitpunkt aus der bereits geladenen Aktivitätszeile, Sprung-Handler |
| `css/01-basis.css` | `.arbeitsstand`-Stile (kompakte Zeilen, umbruchfähig) |
| `sw.js` | Cache-Version 2.42 |

**Nicht angefasst**: `js/09-projekte.js` und sämtliche Fach-, Such-,
Verlaufs-, Login-, Rechte- und System-Admin-Dateien – per `git diff`
einzeln bestätigt. Projektübersicht und Schnellzugriff „Zuletzt
bearbeitet" (v2.41) sind unverändert.

### 50.10 Offene Punkte für v2.43

- Kein Live-Klicktest im Browser möglich (siehe 50.8).
- „Letzte Aktivität" bleibt leer, solange `audit_log` leer ist – das ist
  die ehrliche Anzeige, keine Lücke im Code (siehe Abschnitt 49.2).
- Kein Projektstatus, keine fachliche Bewertung des Arbeitsstands – wie
  im Auftrag ausdrücklich gefordert.

## 51. PROJEKTDATEIEN – ANALYSE UND HAERTUNG — VERSION 2.43

Vollstaendige Bestandsaufnahme der Projekt-Dateiverwaltung
(`project_files` + Storage) mit anschliessender minimaler Haertung.
**Eine Migration** (ein Trigger, keine Spalten-/Schemaaenderung), sonst
nur Frontend.

### 51.1 Was vorhanden war

**Tabelle `project_files`**: `id` (bigint), `project_id` (bigint, NOT
NULL, FK → `projects` ON DELETE CASCADE), `name`, `file_path`,
`size_bytes`, `mime_type`, `created_by`/`created_at`,
`updated_by`/`updated_at`. `created_by`/`updated_by` → `auth.users(id)`.
**Kein `company_id`** – die Firmenzuordnung laeuft ueber `project_id`,
wie bei `measurements`/`ausmass`/`reports`.

**DB-RLS**: restriktive `tenant_boundary_project_files`
(`EXISTS(projects p WHERE p.id=project_id AND p.company_id=my_company_id())`,
mit identischem `WITH CHECK`) plus vier permissive
`project_files_*_permission`-Policies ueber
`has_permission('projects','view'/'edit')`. Sauber.

**Storage**: ein privater Bucket `measurements`, Pfad
`project-files/<projectId>/<zeit>_<zufall>.<ext>`. Die vier
`storage.objects`-Policies rufen `storage_object_is_own_company(name)`
bzw. `storage_object_insert_allowed(name)` auf (v2.24). Fuer
`project-files/%` wird das zweite Pfadsegment als Projekt-ID gelesen,
**auf `^[0-9]+$` geprueft** und gegen `projects.company_id` verifiziert.

**Frontend** (alles in `js/09-projekte.js`): `uploadProjectFile()`,
`replaceProjectFile()`, `loadProjectFiles()`, Handler fuer Oeffnen
(ueber `storageSignedUrl()`), Umbenennen, Ersetzen, Loeschen; Anzeige im
Cockpit-Abschnitt „📎 Dateien/Fotos".

**Realer Bestand**: 14 Storage-Objekte gesamt, davon 1 Projektdatei
(`project-files/4/…xlsx`), 1 DB-Zeile – **keine verwaisten Objekte,
keine DB-Zeile ohne Datei**.

### 51.2 Sicherheitspruefung – Ergebnis

Empirisch geprueft (`begin; … rollback;`, Wegwerf-Firma, PETER KUENZI AG
nur gelesen). Als Benutzer einer fremden Firma:

| Angriff | Ergebnis |
|---|---|
| fremde `project_files`-Zeilen lesen | 0 Zeilen |
| Zeile in fremdes Projekt einschleusen | RLS-Fehler `tenant_boundary_project_files` |
| fremde Zeilen aendern / loeschen | je 0 Zeilen |
| fremde Storage-Objekte lesen | 0 Zeilen |
| `storage_object_is_own_company()` auf echten fremden Pfad | `false` |
| Upload nach `project-files/4/…` (fremdes Projekt) | `false` |
| Upload ins eigene Projekt | `true` |
| nicht-numerisches Segment `project-files/4x/…` | `false` |

**Kein Cross-Tenant-Zugriff moeglich.** Privater Bucket, signierte URLs
(1 h), DB-RLS und Storage-RLS greifen unabhaengig voneinander.
`file_path` wird beim Insert nicht validiert – das ist unkritisch, weil
die Storage-Policy beim tatsaechlichen Zugriff nochmals prueft: eine
Zeile mit fremdem `file_path` liefert schlicht keine signierte URL.

**Bekannte, bewusst bestehende Grenze (nicht neu, aus v2.24/32.3):**
`storage_object_insert_allowed()` liefert fuer Pfade ausserhalb von
`measurements/` und `project-files/` `true`. Ein angemeldeter Benutzer
einer aktiven Firma kann also unter beliebigen flachen Praefixen Objekte
ablegen. Das ist **kein** Cross-Tenant-Leseleck (Zurueck­lesen setzt eine
DB-Referenz der eigenen Firma voraus) und auch kein Pfad-Traversal
(Storage-Keys sind keine Dateisystempfade), sondern ein
Speicher-Missbrauchsvektor. Die Regel existiert bewusst, damit Firmenlogo
und Ausmass-Fotos – die zum Upload-Zeitpunkt kein Projekt im Pfad haben –
weiterhin funktionieren. **Nicht veraendert**, siehe 51.6.

### 51.3 Gefundene Probleme

**(1) Ersteller/Zeitstempel waren faelschbar – behoben.**
`projects`, `measurements`, `ausmass` und `reports` bekamen in v2.28/
v2.29 den serverseitigen Trigger `set_creator_editor_meta()`, der
`created_by`/`created_at`/`updated_by`/`updated_at` aus `auth.uid()`/
`now()` erzwingt. **`project_files` wurde dabei uebersehen** – die Werte
kamen ausschliesslich vom Client. Empirisch bestaetigt: ein Benutzer
konnte eine Datei einfuegen und dabei einen *anderen* Mitarbeiter als
Ersteller und das Jahr 2000 als Datum eintragen; beides wurde akzeptiert.

**(2) Loeschen meldete einen stillen Fehlschlag als Erfolg – behoben.**
`await sb.from("project_files").delete().eq("id",id)` pruefte das
Ergebnis nicht. Ein von RLS blockiertes DELETE meldet in PostgREST keinen
Fehler, es betrifft still 0 Zeilen (CLAUDE.md 24.1). Ein Mitarbeiter ohne
`projects`-Edit-Recht sah also keine Meldung, und die Datei stand nach
dem Neuladen weiterhin da.

**(3) Rohe englische Fehlermeldungen – behoben.**
`alert("Fehler beim Hochladen: "+err.message)` zeigte z. B. „The object
exceeded the maximum allowed size".

**(4) Mehrfach-Upload brach beim ersten Fehler ab – behoben.**
Bereits hochgeladene Dateien blieben, die Meldung nannte weder die
betroffene Datei noch die Zahl der erfolgreichen.

**(5) Keine Bildvorschau – behoben.** Fotos waren nur an Dateiname und
Symbol erkennbar.

**(6) Geloeschter Mitarbeiter wurde als „–" angezeigt – behoben**,
jetzt „Unbekannter Benutzer" wie ueberall sonst.

**Ausdruecklich KEIN Fehler** (geprueft, Vermutung widerlegt): Das
Entfernen eines Mitarbeiters wird durch `project_files` **nicht**
blockiert – anders als seinerzeit bei `measurements` (CLAUDE.md 36.1)
zeigen hier **beide** Fremdschluessel auf `auth.users`, nicht auf
`profiles`. Das „Mitarbeiter entfernen"-Feature loescht nur die
`profiles`-Zeile; empirisch bestaetigt, dass das durchlaeuft und die
Datei erhalten bleibt.

### 51.4 Umgesetzt

**Migration `project_files_creator_editor_trigger_v2_43`** – eine
Anweisung, kein neuer Funktionskoerper:

```sql
create trigger set_creator_editor_meta_project_files
  before insert or update on public.project_files
  for each row execute function public.set_creator_editor_meta();
```

Verifiziert: derselbe Faelschungsversuch wie oben wird jetzt
ueberschrieben (echter Aufrufer, echte Zeit); ein UPDATE kann
`created_by`/`created_at` nicht nachtraeglich umschreiben;
`updated_by`/`updated_at` werden korrekt gesetzt.

**Folge fuer die Anzeige**: `updated_at` wird nun bei **jeder** Aenderung
gesetzt, also auch beim Umbenennen. Die bisherige Beschriftung „ersetzt
am" waere dadurch irrefuehrend geworden – sie heisst jetzt neutral
„geaendert am" und erscheint nur, wenn das Aenderungsdatum vom
Erstelldatum abweicht.

**Frontend** (`js/09-projekte.js`):
- `dateiFehlerText()` uebersetzt die vier haeufigen Storage-/RLS-Fehler
  in verstaendliches Deutsch (zu gross, Name existiert, keine
  Berechtigung, keine Verbindung) und laesst alles andere unveraendert
  durch.
- Upload verarbeitet jede Datei einzeln und meldet am Ende „N von M
  Datei(en) gespeichert" mit Nennung der fehlgeschlagenen.
- Loeschen und Umbenennen pruefen `error` **und** die Zahl betroffener
  Zeilen; bei 0 Zeilen erscheint „… Fehlt die noetige Berechtigung?".
- Die Loeschabfrage nennt jetzt den Dateinamen.
- Bilder (MIME `image/*` oder Endung jpg/jpeg/png/gif/heic/heif/webp/bmp)
  bekommen eine 44 px grosse Vorschau, andere Typen ein Typ-Symbol in
  gleicher Groesse. Die signierten URLs laedt die **bestehende**
  `resolveSignedThumbnails()`-Logik nach (dasselbe Muster wie bei den
  Skizzen); der Aufruf ist bewusst mit `typeof …==="function"`
  abgesichert, damit die Dateiliste auch ohne diese Hilfsfunktion
  funktioniert.

### 51.5 Tests

**Datei-Pruefstand** (Node, gegen die echten Funktionen aus
`js/09-projekte.js`) – 27 Pruefungen, alle bestanden: gemischte
Dateitypen (JPG, PDF, XLSX, HEIC ohne MIME), Vorschau nur fuer Bilder,
Typ-Symbol fuer den Rest, geloeschter Mitarbeiter → „Unbekannter
Benutzer", fehlendes `created_by` → „–", „geaendert am" nur bei
abweichendem Datum, leeres Projekt, Ladefehler → Rueckgabe `undefined`
(Zaehler „?"), alle fuenf Fehlerübersetzungen, Dateityp-Erkennung,
Groessenformat.

**Regression**: Navigation 23/23, Suche 7/7, Treffer-Hervorhebung 7/7,
Schnellzugriff 12/12, Arbeitsstand 17/17, Listenrendering 9/9 Faelle.
`node --check` ueber alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`-Balance unveraendert 647/647.

Der Regressionslauf hat dabei eine echte Kopplung aufgedeckt: die
Dateiliste haette ohne `resolveSignedThumbnails()` eine Ausnahme
geworfen. Deshalb die Absicherung in 51.4.

**Sicherheit**: siehe 51.2, nach der Aenderung erneut geprueft – fremde
Zeilen weiterhin 0 sichtbar/0 geaendert/0 geloescht, Einschleusen mit
RLS-Fehler abgelehnt.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
moeglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdruecklich nicht
als getestet behauptet.** Insbesondere ein echter Upload, das Oeffnen
einer signierten URL und die Darstellung der Vorschaubilder wurden nicht
im Browser geprueft.

**PETER KUENZI AG**: vor und nach allen Tests identisch – 2 Firmen, 4
Projekte, 13 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Projektdatei, 14
Storage-Objekte, 0 `audit_log`-Zeilen; die eine reale Datei
(`Zuschnittliste Rinnen.xlsx`) mit unveraendertem Pfad, Ersteller und
Zeitstempel; beide Testmitarbeiter wieder in ihrer echten Firma.

### 51.6 Offene Entscheidung (bewusst nicht selbst entschieden)

**Maximale Dateigroesse und erlaubte Dateitypen.** Der Bucket hat
`file_size_limit = kein` und `allowed_mime_types = alle`; auch der Client
prueft nichts. Ein versehentlicher 500-MB-Upload vom Handy laeuft also
bis zum Server-Limit durch. Welche Grenze und welche Formate sinnvoll
sind, ist eine Betriebsentscheidung (Speicherkosten je Firma, benoetigte
Formate) – deshalb wurde **keine Zahl geraten**. Die Fehlermeldung ist
fuer diesen Fall bereits verstaendlich („Die Datei ist zu gross fuer den
Speicher.").

Ebenfalls offen gelassen: die in 51.2 beschriebene flache
Upload-Erlaubnis. Sie zu schliessen wuerde Firmenlogo- und
Ausmass-Foto-Upload brechen und braucht eine eigene, sorgfaeltig
geplante Runde.

### 51.7 Geaenderte Dateien

| Datei | Warum |
|---|---|
| Migration `project_files_creator_editor_trigger_v2_43` | serverseitige Ersteller-/Bearbeiter-Durchsetzung |
| `js/09-projekte.js` | Fehlermeldungen, Teilerfolg beim Upload, stille Fehlschlaege bei Loeschen/Umbenennen, Bildvorschau, Benutzername, „geaendert am" |
| `css/01-basis.css` | `.datei-thumb` / `.datei-icon` |
| `index.html` | Versionstext 2.43 |
| `sw.js` | Cache-Version 2.43 |

**Nicht angefasst**: alle zwoelf geschuetzten Massaufnahme-/Ausmass-
Dateien, `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`js/23-verlauf.js`, `js/22-system-admin.js`, `js/05a-rechte.js`,
`js/03-login.js`, `js/04-start-suche.js`, `js/24-projekt-cockpit.js` –
per `git diff` einzeln bestaetigt.

## 52. STARTSEITE BEREINIGT + ADRESSE ALS HAUPTTITEL — VERSION 2.44

Zwei Aenderungen an der Benutzerfuehrung, konsequent projektorientiert.
**Keine Schemaaenderung, keine Migration, keine Berechnung veraendert.**

### 52.1 Startseite bereinigt

Entfernt wurden die drei Haupteinstiege `#navReport`, `#navMeasurements`
und `#navAusmass` samt ihrer drei `onclick`-Handler
(`js/04-start-suche.js`, `js/09-projekte.js` ×2). An ihre Stelle tritt
„📁 Projekte" als einziger grosser Arbeitseinstieg; Suche, Einstellungen,
Feedback und System-Administration stehen unveraendert darunter.

**Nichts Fachliches entfernt.** Die Uebersichts-Modals
`#measurementsModal`, `#ausmassModal`, `#reportsModal` und ihre
Render-Funktionen bleiben vollstaendig erhalten – sie werden weiterhin
gebraucht:
- als Rueckziel von `measEditZurueck()`/`amEditZurueck()`/
  `reportZurueck()`, wenn ein Eintrag NICHT aus dem Cockpit geoeffnet
  wurde (z. B. ueber den Direktweg der globalen Suche),
- `#newReport` liegt in `#reportsModal` und wird von
  `cockpitNeuerRapport()` programmatisch ausgeloest.

Alle drei Modals haben eigene „✓ Fertig"/„🏠 Start"-Ausstiege – es
entsteht keine Sackgasse.

**Keine toten Verweise**: geprueft per Grep. Der einzige verbliebene
Verweis steht in `js/05a-rechte.js` (`applyRechte()`, blendet die
Knoepfe je nach Recht aus) und ist bereits mit `if(btn)` abgesichert.
Diese Datei gehoert zu Login/Rechte und wurde deshalb **nicht**
angefasst – der Zweig laeuft folgenlos ins Leere. Der Einstieg ist
jetzt fuer alle entfernt, also strenger als vorher, nicht lockerer.

### 52.2 Woher die Adresse stammt

Geprueft, nicht angenommen:

| Feld | Bedeutung |
|---|---|
| `projects.object` | **Label „Adresse (Pflichtfeld)"**, Platzhalter „z. B. Musterstrasse 1, 3000 Bern" – das ist die Objektadresse |
| `reports.object` | Label „Objekt / Gebaeudeteil", Platzhalter „z. B. Wetterschutz · Kinderzimmer" – **etwas anderes**, keine Adresse |
| `measurements`, `ausmass` | haben **kein** eigenes Adress- oder Objektfeld |

Reale Werte bestaetigen das: „Alpeneggstrasse 22, Bern",
„Ostermundigenstrasse 33" (aeltere Projekte enthalten Platzhalter wie
„Ppp" – echte Daten, werden unveraendert angezeigt).

**Einzige Quelle ist deshalb `projects.object` ueber `project_id`.**
Keine neue Spalte, keine Migration, keine kopierte Adresse.

### 52.3 Fallback-Regel

Zentral in `js/01-basis.js`:

```js
function eintragAdresse(row, ersatz){
  1. projektAdresse(row.project_id)        // projects.object
  2. ersatz (Massaufnahme/Ausmass: title,  // nur echte, gespeicherte
             Regierapport: object)         // Bezeichnung
  3. "Ohne Adresse"
}
```

Stufe 2 zeigt ausschliesslich, was wirklich im Datensatz steht – es wird
nichts erfunden. Der Fall ist real: **3 von 13 Massaufnahmen** haben
`project_id = NULL` (ihr Projekt wurde geloescht, `ON DELETE SET NULL`).
Auch ein Projekt ohne Adresse und eine nicht mehr aufloesbare
Projekt-ID fallen sauber auf Stufe 2 bzw. 3.

Zusaetzlich `infoZeileOhne(haupttitel, …)`: laesst Angaben in der
Zusatzzeile weg, die bereits der Haupttitel sind – sonst stuende bei
fehlender Adresse der Ersatztitel zweimal untereinander.

### 52.4 Wo die Adresse jetzt Haupttitel ist

| Ansicht | Datei | Haupttitel | Zusatzzeile |
|---|---|---|---|
| Cockpit Massaufnahmen | `js/09` | Adresse | Typ · Titel · Datum · zuletzt geaendert |
| Cockpit Ausmass | `js/09` | Adresse | Art · Titel · Datum · zuletzt geaendert |
| Cockpit Regierapport | `js/09` | Adresse | Datum · Auftrags-Nr. · Auftraggeber · Objekt |
| Massaufnahmen-Uebersicht | `js/16` | Adresse | Typ · Titel · Projekt · Datum |
| Ausmass-Uebersicht | `js/17` | Adresse | Art · Titel · Projekt · Datum |
| Rapport-Uebersicht | `js/04` | Adresse | Regierapport · Projekt · Datum · Nr. · Kunde |
| Globale Suche | `js/04` | Adresse | Art · Treffer · 📁 Projekt · Datum |
| Massaufnahme-Formular | `js/10` | `📐 Adresse · Typ` | – |
| Ausmass-Formular | `js/17` | `📏 Adresse · Art` | – |
| Regierapport-Bildschirm | `index.html`, `js/09` | neue Zeile `#reportAddressLine` unter der Ueberschrift | – |

**PDF/Druck unveraendert.** Zwei Gruende, beide geprueft:
`css/03-druck.css` blendet mit `.no-print,.modal,…{display:none}` alle
Modals im Druck aus – die beiden Formulartitel sind also reine
Bildschirmanzeige. Und die Adresszeile im Regierapport-Bildschirm ist
bewusst `.no-print`, damit die gedruckte Kopfzeile („Regierapport ·
Arbeiten nach Aufwand") exakt so bleibt wie bisher.

### 52.5 Massaufnahme-Typ bleibt erkennbar

Der Typ steht in jeder Liste als **erste** Angabe der Zusatzzeile und im
Formulartitel direkt hinter der Adresse. Er kommt weiterhin aus dem
bestehenden `MEAS_TYPE_LABELS`-Katalog. Der bisherige Titel bleibt als
zweite Angabe erhalten. Beispiel:

```
Alpeneggstrasse 22, Bern
Rinne Halbrund · Dachrinne Nord · 2.9.2026
```

**Anmerkung**: Innerhalb eines Cockpits haben alle Eintraege dieselbe
Adresse, die fette Zeile wiederholt sich dort also. Das entspricht der
im Auftrag vorgegebenen Zeilenstruktur (Abschnitt 6). Falls die
Wiederholung im Cockpit spaeter stoert, waere es dort ein Einzeiler,
wieder auf Titel/Typ als Haupttitel umzustellen – die uebrigen Listen
blieben davon unberuehrt.

### 52.6 Aenderungen in geschuetzten Fachdateien

Vier reine Anzeigezeilen, nichts sonst (per `git diff` belegt):

| Datei | Zeilen | Was |
|---|---|---|
| `js/10-massaufnahme.js` | 1 | `h2.textContent` des Massaufnahme-Formulars |
| `js/16-massaufnahme-formular.js` | 1 | `<b>`/`<span>` einer Listenzeile |
| `js/17-ausmass.js` | 2 | `h2.textContent` + `<b>`/`<span>` einer Listenzeile |

Zuerst geprueft, ob es zentral ausserhalb geht: die beiden Titel liessen
sich nur per Monkey-Patch von aussen ueberschreiben, was schwerer
nachvollziehbar waere als eine geaenderte Anzeigezeile; die Listenzeilen
liegen als Template-String mitten in der Render-Funktion und sind von
aussen gar nicht erreichbar. Keine Berechnung, keine Stueckliste, kein
Zuschnitt, kein Speicher-Payload, keine PDF-Logik beruehrt. Die uebrigen
neun geschuetzten Dateien sind unveraendert.

**Ausserhalb geloest** wurden dagegen zwei Auffrischungen: nach dem
Uebernehmen des Projekts aus dem Cockpit (`js/24`) und nach interaktiver
Projektwahl im Formular (`js/09`) wird der Titel neu aufgebaut – sonst
haette er die Adresse des vorherigen Projekts behalten.

### 52.7 Tests

**Adress-Pruefstand** (Node, gegen die echten Funktionen) – 16
Pruefungen, alle bestanden: alle drei Fallback-Stufen, Projekt ohne
Adresse, Datensatz ohne Projekt, nicht aufloesbare Projekt-ID, Cockpit-
Listen fuer Massaufnahme/Ausmass/Rapport (Adresse als Haupttitel, Typ
und Titel als Zusatz, Kopfdaten des Rapports erhalten).

**Regression**: Navigation 23/23, Suche 7/7, Treffer-Hervorhebung 7/7,
Schnellzugriff 12/12, Arbeitsstand 17/17, Dateien 27/27,
Listenrendering 9/9 Faelle. `node --check` ueber alle `js/*.js` und
`sw.js` fehlerfrei, `<div>`-Balance 648/648 (vorher 647/647, Differenz
durch die neue Adresszeile). Keine toten Verweise auf die entfernten
Knoepfe.

Der Regressionslauf hat dabei einen echten Fehler aufgedeckt: in der
globalen Suche wurde beim Regierapport der zusammengesetzte Treffertext
als Fallback verwendet statt der Objektbezeichnung, wodurch derselbe
Text zweimal erschien. Korrigiert.

**Sicherheit**: keine RLS-, Policy- oder Schemaaenderung in dieser Runde.
Die Adresse stammt aus `allProjects`, das bereits RLS-gefiltert ist –
ein Datensatz einer fremden Firma erscheint gar nicht erst.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
moeglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdruecklich nicht
als getestet behauptet.**

**PETER KUENZI AG**: vor und nach allen Tests identisch – 2 Firmen, 4
Projekte, 13 Massaufnahmen (davon 3 ohne Projekt), 2 Ausmasse, 4
Rapporte, 1 Datei, 0 `audit_log`-Zeilen, alle vier Projektadressen
unveraendert, `updated_at` unveraendert. Nur lesend geprueft.

### 52.8 Geaenderte Dateien

| Datei | Warum |
|---|---|
| `index.html` | drei Startknoepfe entfernt, „📁 Projekte" als Haupteinstieg, `#reportAddressLine`, Version 2.44 |
| `js/01-basis.js` | zentrale Helfer `projektAdresse()`, `eintragAdresse()`, `infoZeile()`, `infoZeileOhne()` |
| `js/09-projekte.js` | zwei Startknopf-Handler entfernt, drei Cockpit-Listen, Adresszeile im Rapport, Titel-Auffrischung bei Projektwahl |
| `js/04-start-suche.js` | ein Startknopf-Handler entfernt, Rapport-Uebersicht, globale Suche |
| `js/10`, `js/16`, `js/17` | je nur Anzeigezeilen, siehe 52.6 |
| `js/24-projekt-cockpit.js` | Titel-Auffrischung nach Projektuebernahme |
| `css/01-basis.css` | `.report-adresse` |
| `sw.js` | Cache-Version 2.44 |

### 52.9 Offene Punkte

- Kein Live-Klicktest im Browser moeglich (siehe 52.7).
- Aus v2.43 weiterhin offen und bewusst nicht mit dieser UI-Aufgabe
  vermischt: maximale Projekt-Dateigroesse (Empfehlung 25–50 MB je
  Datei) und die flache Storage-Upload-Erlaubnis als eigene spaetere
  Sicherheitsaufgabe.
- Die Wiederholung der Adresse innerhalb eines Cockpits ist bewusst so
  umgesetzt (siehe 52.5).

## 53. PROJEKTLISTEN AUF ADRESSE + COCKPIT AUFGERÄUMT — VERSION 2.45

Führt die in v2.44 begonnene Umstellung zu Ende: die Adresse ist jetzt
auch bei den **Projekten** selbst die Hauptanzeige, und innerhalb eines
Projekts wird sie nicht mehr bei jedem einzelnen Arbeitsdatensatz
wiederholt. **Keine Schemaänderung, keine Migration, keine RLS-/
Storage-Änderung, keine geschützte Fachdatei angefasst.**

### 53.1 Adresse als Hauptanzeige der Projekte

Quelle ist unverändert `projects.object` (Formularlabel „Adresse
(Pflichtfeld)"), dieselbe wie seit v2.44 – keine neue Spalte, keine
kopierte Adresse.

Neue zentrale Funktion `projektTitel(p)` (`js/01-basis.js`) neben dem
bestehenden `eintragAdresse(row,ersatz)`. Nötig, weil `eintragAdresse()`
über `row.project_id` auflöst; ein Projekt **ist** das Projekt und hat
kein solches Feld. Gleiche dreistufige Regel, nur ist Stufe 2 hier die
eigene Bezeichnung des Projekts:

1. `projects.object` (Adresse)
2. `projects.name` (Projektname)
3. `"Ohne Adresse"`

Erfunden wird nichts. **Der Projektname geht nirgends verloren** – er
steht überall als erste Zusatzangabe und fällt nur dann weg, wenn er
mangels Adresse bereits selbst der Haupttitel ist (`infoZeileOhne()`,
v2.44).

| Ansicht | Haupttitel | Zusatzzeile |
|---|---|---|
| Projektkarte (`renderProjectList`) | Adresse | Projektname · Auftrags-Nr. · Auftraggeber |
| Schnellzugriff „Zuletzt bearbeitet" (`renderRecentProjects`) | 📁 Adresse | Projektname · Auftrags-Nr. · Zeitpunkt · Benutzer |
| Projektkopf im Cockpit (`renderCockpitStammdaten`) | 📁 Adresse | Projektname · Auftrags-Nr. · Auftraggeber (· archiviert) |
| Suchtreffer „Projekt" (neu, siehe 53.4) | 📁 Adresse | Projekt · Name · Auftrags-Nr. · Auftraggeber |

Sind ausser dem Haupttitel keine Angaben vorhanden, steht auf der
Projektkarte „Keine weiteren Angaben" statt einer Zeile aus „–"-
Platzhaltern.

**Altbestand** (Auftrag Abschnitt 7): Die vier realen Projekte haben
alle ein gefülltes `object`, zwei davon sind Platzhalterwerte („Ppp",
„Strasse1"). Diese werden **unverändert angezeigt** – es ist ein echter,
gespeicherter Wert; automatisch bereinigt oder ersetzt wird nichts. Ein
Projekt ganz ohne Adresse fällt auf den Projektnamen zurück, eines ohne
beides auf „Ohne Adresse"; beide Fälle sind im Prüfstand abgedeckt.

### 53.2 Cockpit: Adresse nur noch einmal, oben

Bis v2.44 trug jede Massaufnahme-/Ausmass-/Rapport-Zeile im Cockpit
dieselbe Projektadresse als fetten Titel – innerhalb eines Projekts ist
das per Definition immer derselbe Text. Jetzt steht die Adresse genau
einmal im Projektkopf, die Zeilen zeigen ihre eigenen Angaben:

| Bereich | Haupttitel der Zeile | Zusatzzeile |
|---|---|---|
| Massaufnahme | Fachart (`MEAS_TYPE_LABELS`) | Titel · Datum · zuletzt geändert |
| Ausmass | Art (Offerte erfassen / Blitzschutzausmass) | Titel · Datum · zuletzt geändert |
| Regierapport | Datum · Auftrags-Nr. | Auftraggeber · Objekt/Gebäudeteil · zuletzt geändert |
| Dateien/Fotos | unverändert (hatte nie eine Adresse) | unverändert |

**Bewusste Abweichung von der Beispielskizze des Auftrags**: Dort ist
beim Ausmass der *Titel* der fette Haupttitel („Dachfläche"), bei der
Massaufnahme dagegen der *Typ* („Rinne Halbrund"). Beides zugleich wäre
zwei verschiedene Regeln für zwei fast gleich aufgebaute Listen.
Umgesetzt ist deshalb einheitlich die Logik aus Abschnitt 2 des
Auftrags („Adresse fett / Typ · Titel · Datum" bzw. „Adresse fett /
Art · Titel · Datum"): fällt die Adresse weg, rückt die jeweils erste
Zusatzangabe – also Typ bzw. Art – nach oben. Das entspricht der
Massaufnahme-Skizze exakt, hält die neun Fachfunktionen sofort
unterscheidbar (Auftrag v2.44 Abschnitt 6) und ist für beide Listen
dieselbe Regel. Beim Ausmass steht der Titel dadurch eine Zeile tiefer
als in der Skizze, geht aber nicht verloren.

Hat ein Eintrag ausser seinem Haupttitel nichts (kein Titel, kein
Datum), steht „Keine weiteren Angaben" – nie ein führendes „ · ".
Dafür liefert `eintragZusatz()` seit v2.45 als `eintragZusatzTeile()`
die einzelnen Teile zurück, statt einen vorangestellten Trenner
mitzuliefern; zusammengesetzt wird über `infoZeile()`/`infoZeileOhne()`.

**Ausserhalb des Cockpits bleibt die Adresse der Haupttitel** – in den
Übersichtslisten (Massaufnahmen/Ausmass/Rapporte), in der globalen Suche
und in den Kopfzeilen der geöffneten Formulare (v2.44, unverändert).
Dort mischen sich Einträge verschiedener Projekte, die Adresse ist dann
die entscheidende Information.

### 53.3 Projektkopf

`renderCockpitStammdaten()` (`js/24-projekt-cockpit.js`): Titel
`📁 <Adresse>`, darunter Projektname · Auftrags-Nr. · Auftraggeber, bei
einem archivierten Projekt zusätzlich „archiviert" als letzte Angabe
derselben Zeile. Die eingeklappte Stammdaten-Bearbeitung aus v2.39 ist
unverändert.

### 53.4 Globale Suche: Projekte sind jetzt eigene Treffer

Vorher konnte die Suche ein Projekt nur **indirekt** finden: ein
Treffer im Projektnamen zog dessen Massaufnahmen/Ausmasse/Rapporte
herein, das Projekt selbst erschien nie – ein leeres Projekt war gar
nicht auffindbar, und nach einer **Adresse** liess sich überhaupt nicht
suchen, obwohl die Adresse seit v2.44 die Identifikation ist.

Geändert:
- Der bereits vorhandene, rein clientseitige Abgleich gegen
  `allProjects` prüft jetzt `name`, `object`, `order_no` **und**
  `customer` statt nur `name`. `allProjects` ist bereits RLS-gefiltert –
  **keine zusätzliche Abfrage, keine neue Datenquelle.**
- Passende Projekte erscheinen als eigene Trefferart `kind:"project"`,
  **zuoberst** (sie sind der Einstieg in alles Übrige), mit der Adresse
  als Haupttitel.
- Ein Projekt-Treffer hat nur den Knopf „📂 Öffnen" (→
  `openProjectCockpit(id)`), keinen Direktweg – ein Projekt wird immer
  im Cockpit geöffnet. Bei ihm gibt es keinen einzelnen Eintrag zum
  Hervorheben, deshalb wird `cockpitTrefferHervorheben()` nicht
  aufgerufen.
- Die Darstellung und beide Wege der bisherigen Arbeitsdatensatz-Treffer
  (Adresse fett, „📂 Projekt" + „✏️ Direkt öffnen", Treffer-
  Hervorhebung) sind unverändert.

### 53.5 Datenbank / Sicherheit

**Keine Migration, keine neue Spalte, keine RLS-Policy und keine
Storage-Regel angefasst.** Die Adresse kommt aus dem bereits geladenen,
RLS-gefilterten `allProjects` bzw. aus den unveränderten Cockpit-
Abfragen; `project_id` ist weiterhin nirgends für sich allein eine
Berechtigung.

Erneut empirisch bestätigt (`begin; … rollback;`, Wegwerf-Firma
`99999999-…`, PETER KÜNZI AG nur gelesen): als Benutzer einer fremden
Firma liefern mit den vier echten, bekannten Projekt-IDs die
Projektzeile sowie die Massaufnahme-, Ausmass-, Rapport-, Datei- und
Verlaufsabfrage **je 0 Zeilen**.

### 53.6 Tests

Neu: `adresse45` (37 Prüfungen: Fallback-Regel Projekt und
Arbeitsdatensatz, Projektkarten, Schnellzugriff, alle drei Cockpit-
Listen ohne wiederholte Adresse, Einträge ohne Titel/Datum, Zähler,
Ladefehler → „?"), `kopf45` (8 Prüfungen zum Projektkopf inkl.
archiviertem Projekt und manipulierter fremder Projekt-ID), `suche45`
(13 Prüfungen: Adresssuche findet das Projekt, Fallback auf den
Projektnamen, Reihenfolge, kein Direktweg beim Projekt,
Arbeitsdatensatz-Treffer unverändert).

Regression: nav 23/23, suche40 7/7, treffer40 7/7, recent41 12/12,
stand42 17/17, dateien43 27/27, ui39 (9 Fälle, rein darstellend).
`node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`/`</div>` in `index.html` unverändert ausgeglichen (648/648 –
kein HTML ausser dem Versionstext geändert).

Drei Prüfstände (`nav`, `treffer40`, `stand42`, `recent41`, `ui39`)
brauchten **Stub-Anpassungen**, keine Code-Korrekturen: `projektTitel()`
und `infoZeileOhne()` liegen in `js/01-basis.js`, das im Browser vor
`js/09`/`js/24` geladen wird, in den Prüfständen aber einzeln gestubbt
werden muss; `ui39` exportierte `eintragZusatz` unter dem alten Namen.
Der Prüfstand `cockpit.js` (v2.37) war **schon vor v2.45 defekt** (er
verwendet Element-IDs, die seit v2.39 nicht mehr existieren) – gegen
den v2.44-Stand gegengeprüft und bestätigt; er ist durch `stand42` und
`nav` vollständig abgelöst und wurde nicht wiederbelebt.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Insbesondere die Darstellung auf einem echten
Handy/Tablet wurde nicht visuell geprüft, sondern über die CSS-Regeln
gegen die bereits erprobten bestehenden Klassen abgeglichen.

**PETER KÜNZI AG**: vor und nach allen Tests identisch – 2 Firmen, 13
Profile, 4 Projekte, 13 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Datei,
0 `audit_log`-Zeilen; alle vier Projektadressen und `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`) unverändert, keine Wegwerf-Firma übrig.

### 53.7 Mobile / Tablet

`.project-row-top b` bekommt `flex:1 1 auto; min-width:0;
word-break:break-word`, der Löschen-Knopf daneben `flex:0 0 auto` –
eine lange Adresse („Ostermundigenstrasse 33") bricht damit um, statt
den Knopf aus dem Bild zu schieben. `#cockpitTitle`/`#cockpitSubline`
ebenfalls mit `word-break:break-word`. Die bereits umbruchfähigen
Klassen `.report-row`, `.meas-row` und `.recent-project` (v2.39/v2.40)
sind unverändert; Trefferflächen wurden nicht verkleinert.

### 53.8 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/01-basis.js` | neue zentrale Funktion `projektTitel()` |
| `js/09-projekte.js` | Projektkarten und Schnellzugriff auf Adresse, drei Cockpit-Listen ohne wiederholte Adresse, `eintragZusatz()` → `eintragZusatzTeile()` |
| `js/24-projekt-cockpit.js` | Projektkopf: Adresse als Haupttitel |
| `js/04-start-suche.js` | Projekte als eigene Suchtreffer, Suche zusätzlich über Adresse/Auftrags-Nr./Auftraggeber |
| `css/01-basis.css` | Umbruch für lange Adressen in Projektkarte und Projektkopf |
| `index.html` | nur Versionstext 2.45 |
| `sw.js` | Cache-Version 2.45 |

**Nicht angefasst**: alle zwölf geschützten Fachdateien (`js/10`–`js/17`,
`js/19`–`js/21`), `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`js/23-verlauf.js`, `js/22-system-admin.js`, `js/05a-rechte.js`,
`js/03-login.js` – per `git diff` einzeln bestätigt. Keine Berechnung,
keine Stückliste, kein Zuschnitt, kein Speicher-Payload, keine
PDF-/Drucklogik berührt; `#printProjectLine` (gedruckte Kopfzeile) zeigt
weiterhin unverändert den Projektnamen.

### 53.9 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 53.6).
- Die drei Projekt-Auswahlfelder (Regierapport, Massaufnahme, Ausmass)
  zeigen im Vorschlagsfeld weiterhin den **Projektnamen** fett und
  Adresse/Nr./Kunde darunter. Bewusst nicht umgestellt: zwei der drei
  liegen in geschützten Fachdateien (`js/10`, `js/17`), zentral nicht
  lösbar, und die Auswahlfelder sind Eingabe-Widgets, keine Listen im
  Sinne des Auftrags. Gesucht wird dort ohnehin bereits über die Adresse
  (`searchProjects()`, unverändert).
- Aus v2.43 weiterhin offen: maximale Projekt-Dateigrösse (Empfehlung
  25–50 MB je Datei) und die flache Storage-Upload-Erlaubnis als eigene
  spätere Sicherheitsaufgabe.
- Kein Projektstatus – `projects` hat ausser `archived` weiterhin keine
  Statusinformation, ein erfundener bleibt ausgeschlossen.

## 54. PROJEKTSTATUS (GESCHÄFTSSTATUS) — VERSION 2.46

Erster echter Projektlebenszyklus. Bewusst klein gehalten: **vier
Werte, manuell gesetzt**, streng getrennt vom automatischen Arbeitsstand
(v2.42) und vom Archiv (`archived`).

### 54.1 Bestandsanalyse (vor der Umsetzung, gegen Code und Schema)

Repo-weite Suche nach `status`/`state`/`offen`/`in arbeit`/`fertig`/
`abgeschlossen`/`storniert`/`pausiert`: **es gab keinerlei Projekt-
Statuskonzept**. Die Treffer sind ausschliesslich
- `companies.subscription_status` (Firmen-/Trial-Lifecycle des System-
  Admins, Abschnitt 35) – eine andere Ebene,
- `feedback.resolved` (Boolean „erledigt"),
- `audit_log.action='status_changed'` (seit v2.30, bisher **nur** für
  `projects.archived`),
- HTTP-Statustexte in Fehlermeldungen.

`projects` hatte: `id`, `name`, `order_no`, `customer`, `object`,
`archived`, `company_id`, `created_by/at`, `updated_by/at` – **kein**
Statusfeld. Einzige „Zustands"-Information war `archived`.

### 54.2 Empfohlene und umgesetzte Status

| Wert (DB) | Anzeige | Zeichen | Bedeutung im Betrieb |
|---|---|---|---|
| `offen` | Offen | ○ | angelegt, noch nicht in Ausführung (Default) |
| `in_arbeit` | In Arbeit | ◐ | Baustelle läuft |
| `abgeschlossen` | Abgeschlossen | ✓ | Arbeit fertig |
| `storniert` | Storniert | × | kommt nicht zustande / abgebrochen |

**Bewusst NICHT aufgenommen** (Auftrag Abschnitt 2 verlangt die
Prüfung):
- **Pausiert** – im Spengleralltag ist eine Unterbrechung (Wetter,
  Material, Bauherr) der Normalfall und geht ohne Informationsverlust in
  „Offen"/„In Arbeit" auf. Ein eigener Wert erzeugt vor allem
  Pflegeaufwand und die Frage, wann man ihn wieder wegnimmt.
- **Angebot / Auftrag / Abrechnung** – das wäre eine
  Offert-/Rechnungs-Pipeline. Die App kennt weder ein Offert- noch ein
  Rechnungsobjekt (Ausmass → „Offerte erfassen" ist eine Massaufnahme-
  Art, kein Angebotsdatensatz), Zahlungen/Abos sind ausdrücklich Phase 6
  der Roadmap. Solche Werte wären heute leere Etiketten.
- **Archiviert** – existiert bereits als `archived` und ist etwas
  anderes, siehe 54.5.

### 54.3 Manuell, nicht automatisch

**Entscheidung: Geschäftsstatus = manuell, Arbeitsstand = automatisch.**

Der Arbeitsstand (v2.42) beantwortet „was ist erfasst?" und wird
ausschliesslich aus den vorhandenen Daten gebildet (Anzahl
Massaufnahmen/Ausmasse/Rapporte/Dateien, letzte Aktivität). Er kann den
Geschäftsstatus grundsätzlich nicht kennen:

- Ein Projekt mit fünf Massaufnahmen kann geschäftlich weiterhin
  **offen** sein (Ausmass vor Auftragserteilung).
- Ein Projekt mit Rapporten kann **storniert** worden sein – die
  erfassten Stunden bleiben trotzdem stehen.
- Ein Projekt **ohne jede** Arbeitsdatei kann längst **abgeschlossen**
  sein (Kleinauftrag, nur mündlich abgerechnet).

Ein automatisch abgeleiteter „Status" wäre also regelmässig falsch und
würde genau das tun, was v2.45 ausdrücklich ausgeschlossen hat: einen
Zustand behaupten, den die Daten nicht hergeben. Beide Anzeigen stehen
deshalb im Cockpit nebeneinander, klar getrennt: Status oben im
Projektkopf, Arbeitsstand darunter.

### 54.4 Datenmodell (Migration `project_status_v2_46`)

```sql
alter table public.projects add column status text not null default 'offen';
alter table public.projects add constraint projects_status_check
  check (status in ('offen','in_arbeit','abgeschlossen','storniert'));
```

Bewusste Entscheidungen:
- **Eine Spalte auf `projects`, keine eigene Tabelle** – ein Projekt hat
  genau einen aktuellen Status; die Historie liegt bereits im
  `audit_log` (54.7).
- **NOT NULL + Default `'offen'`** statt nullable: kein „unbekannter"
  dritter Zustand, und alle bestehenden Zeilen bekommen denselben klaren
  Startwert.
- **CHECK statt Enum** – dasselbe Muster wie
  `companies_subscription_status_check` (Abschnitt 21.4); ein weiterer
  Wert ist später eine einzeilige Migration statt einer Typänderung.
- **`text`** statt eines eigenen Typs, konsistent mit dem übrigen Schema.

**Migration des Altbestands** (Auftrag Abschnitt 12): Alle vier real
vorhandenen Projekte von PETER KÜNZI AG haben durch den Spalten-Default
den Wert **`offen`** bekommen. Es wurde **nicht** versucht, aus
Massaufnahmen/Ausmassen/Rapporten einen Status zu erraten. Direkt
nachgeprüft: alle vier auf `offen`, `updated_at` **unverändert**
(ein `ALTER TABLE … ADD COLUMN` löst keine Zeilentrigger aus, also weder
`set_creator_editor_meta()` noch `write_audit_log()`), `audit_log`
weiterhin 0 Zeilen. Das ist die einzige Datenänderung an PETER KÜNZI AG
in dieser Runde und war für die NOT-NULL-Spalte zwingend.

### 54.5 Status und Archiv bleiben getrennt

`archived` ist **unverändert** und beschreibt die Sichtbarkeit in der
Projektliste; `status` beschreibt den Geschäftszustand. Alle vier
Kombinationen sind zulässig und werden korrekt dargestellt – ein
abgeschlossenes Projekt bleibt sichtbar, bis es jemand zusätzlich
archiviert; ein offenes Projekt lässt sich archivieren, ohne dass sich
sein Status ändert. Der Archivieren-/Reaktivieren-Knopf schreibt
weiterhin ausschliesslich `archived` (`update({archived:!p.archived})`),
rührt `status` also nicht an. Der neue Statusfilter arbeitet **innerhalb**
der jeweils gezeigten Menge (mit oder ohne Archiv) – die bestehende
Archivumschaltung bleibt unberührt.

### 54.6 Oberfläche

| Ort | Darstellung |
|---|---|
| Projektkarte | Status-Badge als erste Angabe der Zusatzzeile, unter der Adresse |
| Projekt-Cockpit, Kopf | Badge **und** Auswahlfeld, direkt unter der Adresszeile, über dem Arbeitsstand |
| Schnellzugriff „Zuletzt bearbeitet" | Status als erste Angabe der Zusatzzeile (nur Text + Zeichen, kein zusätzliches Element – die Karte soll nicht überladen wirken) |
| Projektliste | Statusfilter (54.8) |
| Globale Suche | **bewusst nicht** – die Trefferliste mischt vier Datenarten und ist bereits dicht; der Auftrag stellt das ausdrücklich frei |

**Eine einzige Bedienstelle**: das Auswahlfeld sitzt im Projektkopf und
speichert sofort bei Auswahl. Es wurde bewusst **nicht** zusätzlich ins
eingeklappte Stammdaten-Formular gelegt – zwei Bedienelemente für
denselben Wert wären eine unnötige Fehlerquelle. Fachliche Begründung
für die Platzierung: den Status stellt man im Alltag oft um,
Name/Adresse fast nie; deshalb liegt er ausserhalb des eingeklappten
Bereichs.

**Farben** (Auftrag Abschnitt 7): jeder Status trägt **Zeichen + Text +
Farbe**, nie die Farbe allein – grau (Offen), blau (In Arbeit), grün
(Abgeschlossen), rot (Storniert), als Umriss-Badge mit `currentColor`.
Für den Dunkelmodus sind Grün und Rot aufgehellt. Ein unbekannter oder
fehlender Wert fällt im Frontend auf „Offen" zurück, damit die
Oberfläche auch dann heil bleibt, wenn später ein Wert dazukommt, den
eine ältere installierte PWA-Version noch nicht kennt.

### 54.7 Audit-Log

Keine neue Infrastruktur: `write_audit_log()` (Migration
`audit_log_project_status_v2_46`) setzt bei einer Statusänderung
dieselbe Aktion **`status_changed`**, die seit v2.30 für
`projects.archived` verwendet wird, und schreibt den Diff
`{field:"status", old:…, new:…}` – mit Benutzer (`auth.uid()`),
Zeitpunkt und `project_id` wie bei jedem anderen Eintrag. Der Verlauf
(`js/23-verlauf.js`) zeigt „Status: ○ Offen → ◐ In Arbeit" mit den
deutschen Bezeichnungen statt der Rohwerte; die Sonderdarstellung
„Aktiv → Archiviert" für `archived` bleibt unverändert.

**Dabei mitbehoben**: Bisher standen die vier Stammdaten-Diffs
(`name`/`order_no`/`customer`/`object`) im `else`-Zweig – wurden also
**verschluckt**, wenn im selben UPDATE auch `archived` betroffen war.
Jetzt werden alle sechs Felder immer erfasst; nur der Aktionsname hängt
noch davon ab, ob `archived` oder `status` betroffen ist. In der Praxis
ändert sich am Archiv-Fall nichts (der Archivknopf schreibt nur
`archived`), aber eine kombinierte Änderung geht nicht mehr verloren.

### 54.8 Statusfilter – Empfehlung und Umsetzung

Umgesetzt, aber **selbstverbergend**: Die Filterzeile (Alle | ○ Offen |
◐ In Arbeit | ✓ Abgeschlossen | × Storniert) erscheint nur, wenn in der
aktuellen Ansicht **mehr als ein Status** vorkommt oder gerade ein
Filter aktiv ist. Bei den heutigen vier gleichartigen Projekten bleibt
die Liste damit exakt so schlicht wie bisher; sobald ein Betrieb
gemischte Projekte hat, ist der Filter da.

Empfehlung dahinter: ein Statusfilter ist die halbe Daseinsberechtigung
eines Status, sobald eine Firma mehr Projekte hat als auf einen
Bildschirm passen – aber er darf die kleine Firma nicht mit einer
Bedienleiste belasten, die nichts filtert. Die Umsetzung kostet nichts:
rein clientseitig auf dem bereits geladenen, RLS-gefilterten
`allProjects`, **keine zusätzliche Abfrage**, gleiches Chip-Muster wie
die Verlauf-Filter (v2.31). Beim Öffnen der Projektübersicht wird der
Filter auf „Alle" zurückgesetzt.

### 54.9 Rechte und Sicherheit

**Keine neue Policy, keine gelockerte Regel.** Die Statusänderung ist
ein gewöhnliches `UPDATE` auf `projects` und läuft dadurch durch
- die restriktive `tenant_boundary_projects`
  (`company_id = my_company_id()`, seit v2.27 auch die Trial-/
  Statussperre der Firma) **und**
- `projects_update_permission` (`has_permission('projects','edit')`).

Der Client schickt **kein** `company_id` mit. Laut
`permission_settings` hat auch `role='employee'` standardmässig
`projects.can_edit = true` – ein Mitarbeiter darf den Status also
bewusst setzen (auf der Baustelle „In Arbeit"); ein Firmenadmin kann das
pro Person über `permission_overrides` entziehen, dann greift die
Sperre serverseitig. Empirisch bestätigt (54.10).

Wie bei „Stammdaten speichern" (v2.37) wird das Ergebnis geprüft statt
Erfolg angenommen: ein von RLS blockiertes UPDATE meldet in PostgREST
keinen Fehler, es betrifft still 0 Zeilen (CLAUDE.md 24.1). Bei 0 Zeilen
springt die Auswahl auf den echten Wert zurück und es erscheint „Der
Status konnte nicht geändert werden. Fehlt die nötige Berechtigung?" –
**kein vorgetäuschter Erfolg**. Ein eigenes UI-Ausblenden wurde
bewusst nicht eingeführt: das Projektmodul hat auch sonst keine
clientseitige Rechte-Kulisse, die Absicherung liegt in der Datenbank.

### 54.10 Tests

**Datenbank** (alle Schreibtests in `begin; … rollback;` mit der
Wegwerf-Firma `99999999-…`, PETER KÜNZI AG nur gelesen):

| Test | Ergebnis |
|---|---|
| Default beim Anlegen | `offen` (per Diff `old:"offen"` im Audit-Eintrag belegt) |
| gültiger Wert | `abgeschlossen` wird gesetzt |
| ungültiger Wert `'quatsch'` | abgewiesen: `23514 … violates check constraint "projects_status_check"` |
| Altbestand migriert | alle vier realen Projekte `offen`, `updated_at` unverändert |
| Mitarbeiter mit Standardrechten | darf den Status setzen |
| Mitarbeiter mit `permission_overrides.can_edit=false` | Status bleibt `offen` (0 Zeilen), Projekt weiterhin **sichtbar**, **kein** Audit-Eintrag |
| Cross-Tenant: fremde Firma sieht Projekte 1/3/4/6 | 0 Zeilen |
| Cross-Tenant: fremde Firma ändert deren Status per bekannter ID | 0 Zeilen, Werte danach unverändert |
| Audit | `status_changed`, `changes=[{field:"status",old:"offen",new:"in_arbeit"}]`, korrekte `user_id`, `project_id`, `entity_type='project'` |

`get_advisors(type:'security')` nach beiden Migrationen: identisch zum
Stand nach v2.45, keine neue Warnung.

**Oberfläche** – neuer Prüfstand `status46` (35/35), gegen die echten
Funktionen aus `js/01`, `js/09`, `js/23`, `js/24`: vier Werte und
Fallback bei unbekanntem/fehlendem Wert, Badge trägt Zeichen **und**
Text, Status je Projektkarte, Filterzeile erscheint/verschwindet
regelgerecht, Filter greift, eigene Leermeldung „Kein Projekt mit diesem
Status.", Archiv bleibt getrennt, Badge und Auswahlfeld im Cockpit,
erfolgreiche Änderung (Badge folgt, `allProjects` aktualisiert,
Bestätigung), still blockiertes UPDATE (Auswahl springt zurück, kein
vorgetäuschter Erfolg), echter Fehler, Auswahl desselben Werts löst
nichts aus, Verlaufsdarstellung deutsch, Archiv-Sonderfall unverändert,
kombinierte Änderung verliert die Stammdaten nicht mehr.

**Regression**: nav 23/23, suche40 7/7, treffer40 7/7, recent41 12/12,
stand42 17/17, dateien43 27/27, adresse45 37/37, kopf45 8/8, suche45
13/13, ui39 (9 Fälle, rein darstellend). `node --check` über alle
`js/*.js` und `sw.js` fehlerfrei, `<div>`/`</div>` in `index.html`
ausgeglichen (651/651, vorher 648/648 – Differenz durch Filterzeile und
Statuszeile im Projektkopf).

Anpassungen an Prüfständen (Stub-Lücken, **keine** Code-Korrekturen):
`nav`, `treffer40`, `recent41`, `stand42`, `kopf45` laden die
Adress-/Status-Helfer jetzt direkt aus `js/01-basis.js`, statt sie
nachzubauen; `adresse45` exportiert sie mit und extrahiert die
Zusatzzeile der Projektkarte tag-unabhängig (dort steht seit v2.46 das
Badge drin).

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Alle DB-Ergebnisse sind direkte RLS-/
Trigger-Simulationen gegen das echte Produktivschema.

**PETER KÜNZI AG**: 2 Firmen, 13 Profile, 4 Projekte, 0 `audit_log`-
Zeilen, 70 `permission_overrides`, `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`) unverändert, keine Wegwerf-Firma
übrig, der Testmitarbeiter wieder in seiner echten Firma. Einzige
Datenänderung: die vier Projekte tragen jetzt `status='offen'` (54.4).

### 54.11 Geänderte Dateien

| Datei | Warum |
|---|---|
| Migration `project_status_v2_46` | Spalte + CHECK |
| Migration `audit_log_project_status_v2_46` | `status_changed` für den Geschäftsstatus, Stammdaten-Diffs nicht mehr verschluckt |
| `js/01-basis.js` | `PROJEKT_STATUS`, `projektStatusInfo/Text/Badge` |
| `js/09-projekte.js` | Badge auf der Projektkarte, Status im Schnellzugriff, Statusfilter |
| `js/24-projekt-cockpit.js` | Badge + Auswahlfeld im Projektkopf, Speichern mit Ergebnisprüfung |
| `js/23-verlauf.js` | deutsche Labels/Werte für `status` und `archived` |
| `index.html` | Filterzeile, Statuszeile im Projektkopf, Version 2.46 |
| `css/01-basis.css` | Badge-, Statuszeilen- und Filter-Stile inkl. Dunkelmodus |
| `sw.js` | Cache-Version 2.46 |

**Nicht angefasst**: alle zwölf geschützten Fachdateien,
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`js/22-system-admin.js`, `js/05a-rechte.js`, `js/03-login.js`,
`js/04-start-suche.js` – per `git diff` bestätigt. Keine Berechnung,
kein Speicher-Payload, keine PDF-/Drucklogik, keine RLS-Policy, keine
Storage-Regel, kein Arbeitsstand berührt.

### 54.12 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 54.10).
- Kein Status in der globalen Suche (bewusst, 54.6).
- Keine Statusautomatik und keine Erinnerungen („seit 30 Tagen in
  Arbeit") – wäre eine eigene, später zu entscheidende Funktion.
- Kein Statusfeld auf Massaufnahme/Ausmass/Rapport – der Status gehört
  zum Projekt, die einzelnen Arbeitsdatensätze haben ihren eigenen
  Ersteller-/Bearbeiterstand (v2.28/v2.29).
- Aus v2.43 weiterhin offen: maximale Projekt-Dateigrösse (Empfehlung
  25–50 MB je Datei) und die flache Storage-Upload-Erlaubnis als eigene
  spätere Sicherheitsaufgabe.
- Aus v2.45 weiterhin offen: die drei Projekt-Auswahlfelder zeigen im
  Vorschlag weiterhin den Projektnamen fett (zwei davon in geschützten
  Fachdateien).

## 55. PROJEKTVERWALTUNG V2 — VERSION 2.47

Die Projektübersicht ist der Einstiegspunkt in die Arbeit. Diese Runde
räumt sie auf: aktive und archivierte Projekte sind zwei getrennte
Ansichten, die Projektkarte priorisiert klar, und eine lokale Suche
findet ein Projekt über Adresse, Name, Auftrags-Nr. oder Auftraggeber.
**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung,
keine geschützte Fachdatei angefasst.**

### 55.1 Aktive und archivierte Projekte getrennt

Vorher zeigte der Knopf „📦 Archivierte anzeigen" **alle** Projekte –
archivierte standen also zwischen den aktiven. Jetzt sind es zwei
Ansichten:

```
const sichtbar=allProjects.filter(p=>!!p.archived===showArchivedProjects);
```

- Standard ist die aktive Ansicht, Überschrift „📁 Projekte".
- „🗄 Archivierte Projekte anzeigen" schaltet auf die Archivansicht um,
  Überschrift „🗄 Archivierte Projekte", Rückweg „📁 Aktive Projekte
  anzeigen".
- Das Anlegen-Formular (`#projectCreateBox`) ist in der Archivansicht
  ausgeblendet – ein neues Projekt gehört nie ins Archiv.
- Statusfilter und Suchtext werden beim Umschalten und beim Öffnen der
  Übersicht zurückgesetzt; sonst wäre unklar, warum die Liste leer ist.
- Eigene Leermeldungen: „Noch keine Projekte angelegt." / „Keine
  archivierten Projekte." / „Kein Projekt passt zur Suche." / „Kein
  Projekt mit diesem Status.".

**`archived` und `status` bleiben zwei unabhängige Werte.** Es wird
nichts automatisch archiviert – „abgeschlossen" und „storniert" bleiben
sichtbar, bis sie jemand bewusst archiviert. Der Archivknopf schreibt
weiterhin ausschliesslich `archived` (`update({archived:!p.archived})`),
der Geschäftsstatus bleibt dabei unverändert; das Audit-Log protokolliert
das wie bisher über die `status_changed`-Sonderlogik für `archived`
(v2.30/v2.46). Alle Kombinationen (offen+aktiv, abgeschlossen+aktiv,
abgeschlossen+archiviert, storniert+archiviert, in_arbeit+archiviert)
bleiben gültig und werden korrekt dargestellt.

### 55.2 Projektkarte neu geordnet

| Zeile | Inhalt |
|---|---|
| 1 | Adresse als Haupttitel (`projektTitel(p)`, v2.45) – jetzt über die volle Breite |
| 2 | Status-Badge (v2.46), in der Archivansicht zusätzlich „🗄 Archiviert" |
| 3 | Projektname · Auftrags-Nr. · Auftraggeber |
| 4 | dezente Ersteller-/Bearbeiter-Zeile (v2.28, unverändert) |
| 5 | Hauptaktion „📂 Projekt öffnen" über die volle Breite |
| 6 | Nebenaktionen: „✏️ Bearbeiten", „📦 Archivieren"/„↩️ Reaktivieren", „🗑 Löschen" |

Der Löschen-Knopf stand bisher **neben dem Titel** und konnte von einer
langen Adresse verdrängt werden – er sitzt jetzt bei den Nebenaktionen.
Das Archiv-Kennzeichen ist vom „(archiviert)"-Text im Titel zu einem
eigenen Badge neben dem Status geworden; die frühere Inline-Opazität
`style="opacity:.6"` ist durch die Klasse `.project-row-archiviert`
ersetzt.

**„✏️ Bearbeiten" ist kein zweites Formular.** Es öffnet dasselbe
Cockpit und klappt dort den bestehenden Stammdatenbereich auf
(`openProjectCockpitZumBearbeiten()`, `js/24-projekt-cockpit.js`) –
eine einzige Bearbeitungsstelle, eine einzige Speicherlogik inklusive
der 0-Zeilen-Prüfung aus v2.37. Bei einer fremden oder manipulierten
Projekt-ID passiert nichts (`cockpitProject()` findet sie in dem bereits
RLS-gefilterten `allProjects` nicht).

Der Geschäftsstatus bleibt wie in v2.46 beschlossen **ausserhalb** des
eingeklappten Stammdatenbereichs – es gibt weiterhin genau ein
Status-Bedienelement.

### 55.3 Lokale Projektsuche

Neues Feld `#projectSearchInput` über der Liste. Ein einziger Vergleich
für beide Projektsuchen der App:

```js
function projektPasstZuSuche(p,q){ … [p.object,p.name,p.order_no,p.customer] … }
```

- `searchProjects()` (das Vorschlagsfeld der Erfassung, unverändert im
  Verhalten: nur aktive Projekte, höchstens 15 Treffer) nutzt jetzt
  denselben Vergleich – vorher stand die Feldliste dort ein zweites Mal.
- Die Listensuche filtert die **gerade gezeigte** Ansicht, sucht in der
  aktiven Ansicht also nie ein archiviertes Projekt hervor.
- Rein clientseitig auf dem bereits geladenen, RLS-gefilterten
  `allProjects` – **keine zusätzliche Abfrage**.

Die **globale Suche** (`js/04-start-suche.js`) wurde nicht angefasst:
Projekt-Treffer aus v2.45 und der Weg „📂 Öffnen" ins Cockpit sind
unverändert.

### 55.4 Unverändert erhalten

- **Schnellzugriff „Zuletzt bearbeitet"** (v2.41/v2.42): dieselbe
  Bestimmung des spätesten echten Bearbeitungszeitpunkts über Projekt +
  Massaufnahme + Ausmass + Rapport + Dateien, vier gebündelte Abfragen,
  archivierte Projekte weiterhin ausgeschlossen, keine N+1-Abfragen.
  Kein Zeichen daran geändert.
- **Projekt anlegen**: derselbe Insert ohne `company_id` und ohne
  `status`; der Default `'offen'` und `archived=false` kommen aus der
  Datenbank, die Ersteller-/Zeitstempel aus dem Trigger (v2.28).
  Pflichtfelder unverändert.
- **Löschen**: kein Zeichen der Löschlogik verändert – nur die
  Beschriftung des Knopfes („🗑 Löschen") und seine Position.
- **Cockpit**: Projektkopf, Arbeitsstand, die vier Arbeitsbereiche,
  Verlauf und letzte Aktivität unverändert; es wurde keine parallele
  Liste gebaut.

### 55.5 Mobile / Tablet

- Hauptaktion „📂 Projekt öffnen": eigene Zeile, volle Breite,
  `min-height:44px`.
- Nebenaktionen: `flex:1 1 auto`, `min-height:38px`, umbruchfähig.
- Titel `flex:1 1 auto; min-width:0; word-break:break-word` und ohne
  Knopf daneben – eine lange Adresse bricht um, statt etwas zu
  verdrängen.
- Status auf eigener Zeile (`.project-row-status`, `flex-wrap:wrap`) –
  das Badge kann den Titel nicht mehr verdrängen.
- Keine Animationen, keine festen Breiten, kein horizontales Scrollen.

### 55.6 Datenbank / Sicherheit

**Keine Migration, keine neue Spalte, keine Policy geändert.**
Verwendet werden ausschliesslich `projects.status`, `projects.archived`,
`projects.object`, `projects.name`, `projects.order_no`,
`projects.customer` und die bestehenden Trigger/RLS/Audit-Logik.

Erneut empirisch bestätigt (`begin; … rollback;`, Wegwerf-Firma
`99999999-…`, PETER KÜNZI AG nur gelesen): ein Benutzer einer fremden
Firma erreicht mit den vier echten, bekannten Projekt-IDs **nichts** –
Statusänderung, Archivieren, Umbenennen und Löschen betreffen je 0
Zeilen, die Projekte bleiben unsichtbar, es entsteht kein Audit-Eintrag.
Die Projekt-ID aus dem Frontend ist weiterhin nirgends für sich allein
eine Berechtigung. Rechte-Modell, `permission_settings`/
`permission_overrides` und das System-Admin-Verhalten wurden nicht
berührt.

### 55.7 Tests

Neuer Prüfstand `projekte47` (37/37) gegen die echten Funktionen aus
`js/09-projekte.js` und `js/24-projekt-cockpit.js`:
aktive Ansicht (nur aktive Projekte, Adresse als Haupttitel, Projektname
als Zusatz, Status-Badge, Überschrift, Anlegen-Formular sichtbar,
Hauptaktion und vier Aktionen je Karte), Archivansicht (nur archivierte,
eigene Überschrift, Anlegen-Formular ausgeblendet, Archiv-Badge,
Geschäftsstatus weiterhin sichtbar, „Reaktivieren" statt „Archivieren"),
lokale Suche (Adresse/Projektname/Auftrags-Nr./Auftraggeber, eigene
Meldung ohne Treffer, findet in der aktiven Ansicht nichts
Archiviertes, im Archiv dagegen schon), Statusfilter aus v2.46
weiterhin, beide Leerzustände, geteilter Suchvergleich mit dem
Vorschlagsfeld, „Bearbeiten" öffnet das Cockpit mit aufgeklappten
Stammdaten und tut bei fremder ID nichts.

Regression: nav 23/23, suche40 7/7, treffer40 7/7, recent41 12/12,
stand42 17/17, dateien43 27/27, adresse45 39/39, kopf45 8/8, suche45
13/13, status46 35/35, ui39 (9 Fälle, rein darstellend).
`node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`/`</div>` in `index.html` ausgeglichen (654/654, vorher 651/651).

Angepasste Prüfstände (fachlich überholte Erwartungen, **keine**
Code-Korrekturen): `adresse45` und `status46` prüften bisher, dass die
Archivumschaltung aktive **und** archivierte Projekte zeigt – seit v2.47
sind das zwei Ansichten. Beide laden ihren Ausschnitt aus
`js/09-projekte.js` jetzt ab `projektPasstZuSuche` (statt ab
`recentZeitText`) und setzen `showArchivedProjects` über einen Setter,
weil die Variable im ausgewerteten Ausschnitt deklariert ist.

**Live-Klicktest im Browser war in dieser Sitzung technisch nicht
möglich** – die Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Alle Ergebnisse stammen aus SQL-Simulationen
gegen das echte Produktivschema und aus Prüfständen gegen den echten
Code.

### 55.8 PETER KÜNZI AG

2 Firmen, 13 Profile, 4 Projekte, 13 Massaufnahmen, 1 Projektdatei,
70 `permission_overrides`, `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`) unverändert, keine Wegwerf-Firma
übrig, der Testmitarbeiter wieder in seiner echten Firma. **Kein Test
dieser Runde hat Produktivdaten verändert** – alle Schreibversuche
liefen in `begin; … rollback;`.

**Beobachtung ausserhalb dieser Aufgabe** (nur dokumentiert, nicht
verursacht und nicht rückgängig gemacht): `audit_log` enthält seit
02.09.2026, 08:52 **vier echte Einträge** – Mike Ledermann hat die in
v2.46 ausgelieferte Statusfunktion im Browser real benutzt
(Projekt 4 „Steildachsanierung" offen→in_arbeit→offen→in_arbeit,
Projekt 6 „Brandschaden" offen→in_arbeit). Die Einträge zeigen korrekt
`action='status_changed'`, den richtigen Diff, den richtigen Benutzer
und die richtige `project_id`. Damit ist der v2.46-Statusweg erstmals
auch **real im Browser** bestätigt – ausserhalb dieser Sandbox, nicht
durch einen Test hier. Projekt 4 und 6 stehen dadurch echt auf
`in_arbeit`; das sind Nutzdaten und bleiben unangetastet.

### 55.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/09-projekte.js` | getrennte Aktiv-/Archivansicht, lokale Suche, geteilter Suchvergleich, neue Kartenstruktur, „Bearbeiten"-Aktion, Leerzustände |
| `js/24-projekt-cockpit.js` | `openProjectCockpitZumBearbeiten()` – öffnet das bestehende Cockpit mit aufgeklappten Stammdaten |
| `index.html` | Anlegen-Formular als eigener Block, Suchfeld, Überschrift mit ID, neue Knopfbeschriftung, Version 2.47 |
| `css/01-basis.css` | Statuszeile, Hauptaktion über volle Breite, grössere Trefferflächen, Archiv-Darstellung |
| `sw.js` | Cache-Version 2.47 |

**Nicht angefasst**: alle zwölf geschützten Fachdateien (`js/10`–`js/17`,
`js/19`–`js/21`), `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`js/04-start-suche.js`, `js/23-verlauf.js`, `js/22-system-admin.js`,
`js/05a-rechte.js`, `js/03-login.js`, `js/01-basis.js` – per `git diff`
bestätigt. Keine Berechnung, keine Stückliste, kein Zuschnitt, kein
Speicher-Payload, keine PDF-/Drucklogik berührt.

### 55.10 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 55.7).
- Aus v2.43 weiterhin offen: maximale Projekt-Dateigrösse (Empfehlung
  25–50 MB je Datei) und die flache Storage-Upload-Erlaubnis als eigene
  spätere Sicherheitsaufgabe.
- Aus v2.45 weiterhin offen: die drei Projekt-Auswahlfelder der
  Erfassung zeigen im Vorschlag weiterhin den Projektnamen fett (zwei
  davon liegen in geschützten Fachdateien); gesucht wird dort seit v2.47
  über denselben geteilten Vergleich.
- Kein Massenbearbeiten (mehrere Projekte gleichzeitig archivieren o. ä.)
  – war nicht verlangt und hätte ein neues Auswahlkonzept gebraucht.

## 56. UPLOAD-HÄRTUNG + PROJEKTAUSWAHL AUF ADRESSE — VERSION 2.48

Erledigt genau die zwei seit v2.43/v2.45 offenen Punkte. **Keine neue
fachliche Tabelle oder Spalte, kein Projektstatus, keine Audit-Änderung,
keine Berechnungslogik.**

### 56.1 Teil A – Storage: geschlossene Positivliste statt „alles andere erlaubt"

Bisher endete `storage_object_insert_allowed()` mit `return true` für
jeden Pfad ausserhalb von `measurements/` und `project-files/` – ein
angemeldetes Mitglied einer aktiven Firma konnte damit beliebige flache
Ordner im Bucket anlegen (dokumentiert in 32.7 und 51.2/51.6).

Migration `storage_upload_hardening_v2_48`: Erlaubt sind jetzt
ausschliesslich die vier Pfadformen, die der Code tatsächlich erzeugt –
alles andere ist blockiert:

| Pfad | Prüfung |
|---|---|
| `project-files/<projectId>/<datei>` | genau 3 Segmente, `projectId` numerisch, Projekt gehört der eigenen Firma |
| `measurements/<projectId>/<measurementId>/<photo\|sketches>/<datei>` | genau 5 Segmente, beide IDs numerisch, Ordner nur `photo` oder `sketches`, Massaufnahme gehört zu genau diesem Projekt und dieses der eigenen Firma |
| `company-logo/<datei>` | genau 2 Segmente |
| `ausmass-photo/<datei>` | genau 2 Segmente |

Zusätzlich abgewiesen: führender `/`, leere Segmente (`//`), `..`
irgendwo im Pfad, leerer Dateiname, leerer Pfad.

**Die IDs werden serverseitig geprüft, nicht als Zeichenkette
akzeptiert.** Die Funktion ist bewusst **nicht** `SECURITY DEFINER`: die
`exists(...)`-Unterabfragen laufen unter der RLS des Aufrufers
(`tenant_boundary_projects`/`tenant_boundary_measurements` plus
`has_permission()`). Ein fremder oder erfundener `projectId`-/
`measurementId`-Wert findet damit keine Zeile, und der Upload wird
abgelehnt. Ein Benutzer ohne `projects.view` kann folgerichtig auch
nicht hochladen.

**Warum `company-logo` und `ausmass-photo` weiterhin ohne Projektbezug:**
das Firmenlogo gehört fachlich zu keinem Projekt, und das Ausmass-Foto
wird erst beim Speichern mit der `ausmass`-Zeile verknüpft – zum
Upload-Zeitpunkt gibt es dort keine ID im Pfad. Für diese zwei
Kategorien bleibt es bei „Mitglied einer aktiven Firma"; die
Firmenzuordnung erzwingen weiterhin die restriktiven
`tenant_boundary_app_settings`- bzw. `tenant_boundary_ausmass`-Policies
beim Verknüpfen (unverändert seit 32.3). **Neu ist**, dass unter diesen
beiden Präfixen keine tieferen Ordner mehr entstehen können.

Die Funktion hat jetzt zusätzlich `set search_path = public` (eine der
bekannten Advisor-Warnungen weniger). `storage_object_is_own_company()`
und `storage_path_from_value()` blieben unverändert – auch ihre
Advisor-Warnung besteht unverändert weiter.

**Keine Policy geändert**: die Policy `tenant upload own storage files`
ruft schon immer `storage_object_insert_allowed(name)` auf, der Austausch
der Funktion genügt. Lese-, Update- und Delete-Policies, der private
Bucket-Status, signierte URLs und die `project_files`-/`measurements`-RLS
sind unangetastet.

### 56.2 Teil A – maximale Dateigrösse: 50 MB

- **Serverseitig durchgesetzt**: `storage.buckets.file_size_limit` des
  Buckets `measurements` steht jetzt auf `52428800` (50 MB). Vorher
  `null` = unbegrenzt. Die Storage-API weist grössere Dateien selbst ab,
  ein manipuliertes Frontend kommt nicht daran vorbei.
- **Konsequenz für die anderen Uploadarten geprüft**: es gibt genau
  einen Bucket, also gilt die Grenze auch für Massaufnahme-Fotos/
  Skizzen, Firmenlogo und Ausmass-Fotos. Alle vier entstehen aus
  Kamera-/Canvas-Bildern (JPEG/PNG-Data-URLs) und liegen um
  Grössenordnungen darunter; die einzige reale Projektdatei im Bestand
  ist eine XLSX. Es wurde also keine bestehende, kleinere Grenze
  angehoben und keine Uploadart eingeschränkt.
- **Clientseitig** in `js/09-projekte.js`: `MAX_DATEI_BYTES` (50 MB),
  geprüft in `uploadProjectFile()` **und** `replaceProjectFile()`, also
  auf jedem Weg. Meldung z. B. „Die Datei ist zu gross (60.0 MB).
  Erlaubt sind höchstens 50 MB pro Datei." Unter dem Upload-Knopf steht
  der Hinweis „Höchstens 50 MB pro Datei."
- `dateiFehlerText()` (v2.43) übersetzt die englische Storage-Meldung
  jetzt mit Nennung der Grenze; die RLS-Ablehnung eines unzulässigen
  Pfades landet in der bestehenden Berechtigungs-Meldung.

### 56.3 Teil B – Projektauswahl: Adresse als Hauptinformation

Neue zentrale Funktion `projektVorschlagHtml(p, attribut)`
(`js/01-basis.js`) – **eine** Darstellung für alle drei
Auswahlfelder statt drei fast gleicher Kopien:

```
<b>Bahnhofstrasse 12, 3011 Bern</b>
<span>Sanierung Dach · 2026-123 · Muster AG</span>
```

- Haupttitel über `projektTitel(p)` (v2.45): Adresse → sonst
  Projektname → sonst „Ohne Adresse". Nie leerer oder erfundener Text.
- Zusatzzeile über `infoZeileOhne()`: Projektname · Auftrags-Nr. ·
  Auftraggeber, leere Felder fallen weg; ist der Projektname mangels
  Adresse bereits der Haupttitel, erscheint er nicht doppelt (dann gibt
  es gar keine Zusatzzeile).
- Die Suche ist unverändert `searchProjects()` → `projektPasstZuSuche()`
  (v2.47): Adresse, Projektname, Auftrags-Nr., Auftraggeber, nur aktive
  Projekte, höchstens 15 Treffer.
- **Auswahl-Verhalten unverändert**: dieselben `data-pick-*`-Attribute,
  dieselben Klick-Handler, dieselbe Übernahme von Projekt-ID,
  Auftrags-Nr., Auftraggeber und Adresse.

**Geschützte Fachdateien** (Auftrag Abschnitt 8, ausdrücklich zu
dokumentieren): `js/10-massaufnahme.js` und `js/17-ausmass.js` je **zwei
reine Anzeigezeilen** (die `input`- und die `focus`-Variante desselben
Vorschlagsfelds), zusammen vier Zeilen. Der komplette Diff dieser beiden
Dateien besteht aus genau diesen vier ersetzten `box.innerHTML=`-Zeilen.
Zentral ausserhalb lösbar war das nicht: die Vorschlagsliste wird dort
erzeugt. **Keine Berechnung, keine Stückliste, kein Zuschnitt, keine
Abwicklung, kein Speicher-Payload, keine PDF-/Drucklogik berührt.**

Mobile: `.projekt-vorschlag` mit `min-height:48px` und
`word-break:break-word` auf Titel und Zusatzzeile – lange Adressen
brechen um, kein horizontales Scrollen, keine festen Breiten; das
bestehende `positionSuggest()` ist unverändert.

### 56.4 Tests

**Storage-Sicherheit** – alle in `begin; … rollback;` mit einer
Wegwerf-Firma, Wegwerf-Projekt und Wegwerf-Massaufnahme; PETER KÜNZI AG
ausschliesslich gelesen.

Direkt gegen `storage_object_insert_allowed()` (20 Pfade):

| Pfad | Ergebnis |
|---|---|
| `project-files/<eigenes>/x.pdf` | erlaubt |
| `project-files/4/x.pdf` (fremde Firma) | blockiert |
| `measurements/<eigenes>/<eigene>/photo/x.jpg` | erlaubt |
| `measurements/<eigenes>/<eigene>/sketches/x.png` | erlaubt |
| `measurements/1/3/photo/x.jpg` (fremd) | blockiert |
| `misc/abc/test.txt` | blockiert |
| `project-files/999999/x.pdf` (unbekannte ID) | blockiert |
| `company-logo/x.png`, `ausmass-photo/x.jpg` | erlaubt |
| `company-logo/unter/ordner/x.png` | blockiert |
| `project-files/<eigenes>/unter/x.pdf` | blockiert |
| `measurements/<eigenes>/<eigene>/andere/x.jpg` | blockiert |
| `/project-files/…`, `project-files//…`, `project-files/<id>/` | blockiert |
| `project-files/<id>/../../misc/x.txt` | blockiert |
| `measurements/<eigenes>/999999/photo/x.jpg` (fremde Mess-ID) | blockiert |
| `project-files/999100x/x.pdf`, `''`, `x.txt` | blockiert |

Zusätzlich über die **echte RLS-Policy** (`insert into storage.objects`):
eigener `project-files`-Upload, `company-logo` und `ausmass-photo` legen
die Zeile tatsächlich an (nach `reset role` verifiziert); ein Upload nach
`project-files/4/hack.pdf` (fremde Firma) und nach `misc/abc/test.txt`
scheitert mit `42501: new row violates row-level security policy`.

**Lesezugriff unverändert**: als echter Benutzer von PETER KÜNZI AG sind
weiterhin genau die 5 referenzierten Storage-Objekte sichtbar (die 9
verwaisten bleiben wie seit v2.24 isoliert) – keine Regression durch die
Upload-Härtung.

**Projektauswahl + Dateigrenze** – neuer Prüfstand `auswahl48` (32/32):
Darstellung (Adresse fett, Name/Nr./Kunde als Zusatz, Reihenfolge),
Fallback ohne Adresse, kein doppelter Name, leere Felder fallen weg,
Suche über alle vier Felder, keine Archivprojekte, alle drei
Auswahlfelder verwenden nachweislich `projektVorschlagHtml` (Quelltext
geprüft, die alte `<b>${esc(p.name)}</b>`-Darstellung existiert nirgends
mehr), Auswahl-Handler und Stammdatenübernahme unverändert, Grenzwerte
48/50/51 MB, Meldung bei Upload und Ersetzen, Übersetzung der Server- und
RLS-Rohmeldungen.

**Regression** (alle bestanden): nav 23/23, suche40 7/7, treffer40 7/7,
recent41 12/12, stand42 17/17, dateien43 27/27, adresse45 39/39, kopf45
8/8, suche45 13/13, status46 35/35, projekte47 37/37, ui39 (9 Fälle).
`node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
`<div>`/`</div>` in `index.html` unverändert ausgeglichen (654/654 – nur
der Versionstext geändert).

**Keine Live-Browser-Tests gegen Supabase möglich** – die Sandbox
blockiert weiterhin ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. SQL-, Code- und Regressionstests
durchgeführt; ein echter Datei-Upload über die Storage-API wurde
**nicht** ausgeführt und wird nicht als getestet behauptet.

### 56.5 PETER KÜNZI AG

Nach allen Tests unverändert: 2 Firmen, 13 Profile, 4 Projekte (Status
und `updated_at` identisch), 13 Massaufnahmen, 1 Projektdatei, 14
Storage-Objekte, 4 `audit_log`-Zeilen (die echten Statusänderungen des
Betreibers vom 02.09., siehe 55.8), `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`) unverändert. Keine Wegwerf-Firma, kein
Testprojekt, kein Test-Storage-Objekt übrig.

### 56.6 Geänderte Dateien

| Datei | Warum |
|---|---|
| Migration `storage_upload_hardening_v2_48` | geschlossene Positivliste für Upload-Pfade |
| `storage.buckets.file_size_limit` | 50 MB für den Bucket `measurements` |
| `js/01-basis.js` | zentrale `projektVorschlagHtml()` |
| `js/09-projekte.js` | `MAX_DATEI_BYTES`/`dateiZuGross()`, Grenzprüfung in Upload und Ersetzen, Hinweistext, Fehlermeldung mit Grenze, Vorschlagsfeld auf die zentrale Funktion |
| `js/10-massaufnahme.js` | **2 reine Anzeigezeilen** (geschützt, siehe 56.3) |
| `js/17-ausmass.js` | **2 reine Anzeigezeilen** (geschützt, siehe 56.3) |
| `css/01-basis.css` | `.projekt-vorschlag` (Umbruch, Trefferfläche) |
| `index.html` | nur Versionstext 2.48 |
| `sw.js` | Cache-Version 2.48 |

**Nicht angefasst**: `js/11`–`js/16`, `js/19`–`js/21`,
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`js/04-start-suche.js`, `js/23-verlauf.js`, `js/24-projekt-cockpit.js`,
`js/22-system-admin.js`, `js/05a-rechte.js`, `js/03-login.js`,
`js/07-einstellungen.js`.

### 56.7 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 56.4).
- `allowed_mime_types` des Buckets bleibt bewusst leer (alle Typen): der
  Auftrag verlangt nur eine Grössengrenze, und eine Typ-Positivliste
  würde Projektdateien unnötig einschränken (Pläne, Offerten, Fotos in
  wechselnden Formaten).
- Eine Massaufnahme **ohne** Projekt kann weiterhin kein Foto/keine
  Skizze speichern (der Pfad wäre `measurements/null/…`). Das ist
  unverändertes Verhalten seit v2.24 und wurde durch diese Runde weder
  verursacht noch behoben – für eine spätere, eigene Entscheidung
  vorgemerkt.
- `storage_object_is_own_company()` und `storage_path_from_value()`
  haben weiterhin keinen festen `search_path` (bekannte Advisor-Warnung,
  bewusst nicht in dieser Runde mitgeändert).
- Die 9 verwaisten Storage-Objekte aus 32.1 bleiben unverändert isoliert.

## 57. PROJEKT-DATEIEN / FOTOS ÜBERSICHTLICHER — VERSION 2.49

Reine UX-Runde am bestehenden Bereich „📎 Dateien/Fotos" im
Projekt-Cockpit. **Keine DB-Änderung, keine Storage-/RLS-Änderung, keine
geschützte Fachdatei angefasst.** Geändert wurden nur
`js/09-projekte.js`, `css/01-basis.css`, der Versionstext und `sw.js`.

### 57.1 Neue Zeilendarstellung

Vorher stand alles in einer einzigen Zusatzzeile („2.3 MB · Mike
Ledermann · 10.8.2026 · geändert am …"). Jetzt die im Auftrag
vorgegebene Hierarchie:

```
[Vorschau/Symbol]  Objekt Nordseite.jpg
                   Bild (JPG) · 2.3 MB
                   10.8.2026 · Mike Ledermann
                   [Öffnen] [✏️ Umbenennen] [🔄 Ersetzen] [🗑 Löschen]
```

- **Dateiname** als Haupttitel (13px, `word-break:break-word` – lange
  Namen brechen um).
- **Typ · Grösse**: neue Funktion `dateiTypText(mime,name)` übersetzt
  MIME/Endung in etwas Lesbares (PDF, Word, Excel, CSV, PowerPoint,
  Archiv, Text, „Bild (JPG)"). Unbekannt → Endung in Grossbuchstaben,
  ganz ohne Endung → „Datei". Nie ein erfundener Typ.
- **Datum**: Erstelldatum, dazu der Ersteller und – nur wenn abweichend –
  „geändert am …". Leere Angaben fallen über `infoZeile()` weg, es
  entsteht kein „· –  ·"-Rest mehr (vorher stand dort ein Strich).
- **Aktionen beschriftet** statt nur mit Symbolen: „Öffnen" über die
  volle Breite (44 px), darunter Umbenennen/Ersetzen/Löschen (je 40 px,
  umbruchfähig). Vorher waren es 34 px hohe Icon-Knöpfe in einer Zeile.

**„🔄 Ersetzen" wurde bewusst beibehalten**, obwohl der Auftrag in der
Beispielhierarchie nur Öffnen/Umbenennen/Löschen nennt: die Funktion
existiert seit v2.43, funktioniert und ist getestet – sie zu entfernen
wäre ein Funktionsverlust, der nicht verlangt war.

### 57.2 Sortierung

Neu „zuletzt geändert zuerst": clientseitig auf den **bereits geladenen**
Daten (`updated_at`, sonst `created_at`), absteigend – keine zweite
Abfrage, keine geänderte SQL-Abfrage.

### 57.3 Vorschaubilder

Unverändert über `data-signed-src` + `resolveSignedThumbnails()`
(js/10-massaufnahme.js) → `storageSignedUrl()` → `createSignedUrl()`.
Der Bucket bleibt privat, es wird **keine öffentliche URL** eingeführt
und **keine zusätzliche Abfrage pro Bild** ausgelöst (eine gebündelte
Auflösung nach dem Zeichnen, wie bei den Skizzen). `.datei-thumb` hat
weiterhin `object-fit:cover` bei fixen 44×44 px – kein verzerrtes
Seitenverhältnis.

### 57.4 Leerzustand

```
📁 Noch keine Dateien oder Fotos vorhanden.
Hier können Pläne, Fotos, PDFs und weitere Projektunterlagen
gespeichert werden.
[＋ Datei/Foto hinzufügen]
Höchstens 50 MB pro Datei.
```

Reihenfolge exakt wie im Auftrag (Abschnitt 6): erst die Erklärung, dann
der Knopf. Bei vorhandenen Dateien steht der Knopf wie bisher oben.

### 57.5 Multi-Upload

Mehrfachauswahl, Reihenfolge und die Per-Datei-Fehlerbehandlung aus
v2.43 sind unverändert. **Neu**: ein Erfolg wird jetzt auch bestätigt –
dezent als Zeile über der Liste („✓ 3 Dateien gespeichert."), nicht als
Popup. Dafür genügt eine Modulvariable `projectFilesStatus`, die
`loadProjectFiles()` einmalig anzeigt und dabei leert – kein
Upload-Framework. Bei Fehlern bleibt es beim bestehenden Sammel-Alert
mit der Liste der nicht gespeicherten Dateien.

### 57.6 Sicherheit und Grenzen unverändert

Nicht angefasst: privater Bucket, `file_size_limit` 50 MB,
`storage_object_insert_allowed()` mit der geschlossenen Positivliste aus
v2.48, Tenant-Prüfung, `project_files`-RLS, die Storage-Policies für
Read/Update/Delete, signierte URLs, die 0-Zeilen-Prüfung bei
Umbenennen/Löschen und die clientseitige 50-MB-Prüfung.

Erneut empirisch bestätigt (`begin; … rollback;`, Wegwerf-Firma):
fremde `project_files` 0 sichtbar (auch über bekannte `project_id`),
fremde Storage-Objekte 0 sichtbar, `project-files/4/hack.pdf` und
`misc/x/y.txt` weiterhin abgelehnt, eigener Projektdatei- und
Massaufnahme-Foto-Pfad weiterhin erlaubt, Bucket weiterhin privat mit
52428800 Bytes.

### 57.7 Tests

Neuer Prüfstand `dateien49` (38/38): alle Dateien angezeigt, neueste
Änderung zuerst und danach nach Erstelldatum, Thumbnail für Bilder mit
signierter Quelle (kein `http`-Link im Markup), Symbol für Nicht-Bilder,
Dateiname/Typ/Grösse/Datum je in der richtigen Zeile, Änderungsdatum,
gelöschter Benutzer, fehlender Ersteller ohne leeren Trenner, alle vier
Aktionen je Zeile und beschriftet, Leerzustand mit beiden Texten und
Knopf danach, Grössengrenze 48/50/51 MB, Server-Rohmeldung übersetzt,
neun Typbezeichnungen.

`dateien43` (27/27) wurde **angepasst statt gelöscht**: die Erwartung
„kein `created_by` → Strich" ist durch die neue Zeilenstruktur überholt
(jetzt: kein leerer Trenner), ebenso der Text des Leerzustands. Der
Prüfstand lädt die Helfer aus `js/01-basis.js` jetzt direkt, statt sie
nachzubauen.

Regression, alle bestanden: nav 23/23, suche40 7/7, treffer40 7/7,
recent41 12/12, stand42 17/17, dateien43 27/27, adresse45 39/39, kopf45
8/8, suche45 13/13, status46 35/35, projekte47 37/37, auswahl48 32/32,
ui39 (9 Fälle). `node --check` über alle `js/*.js` und `sw.js`
fehlerfrei, `<div>`/`</div>` in `index.html` unverändert ausgeglichen
(654/654 – nur der Versionstext geändert).

**Keine Live-Browser-Tests gegen Supabase möglich** – die Sandbox
blockiert weiterhin ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. Ein echter Upload, ein echtes
Vorschaubild und ein echtes Öffnen über eine signierte URL wurden
**nicht** ausgeführt und werden nicht als getestet behauptet; geprüft
sind die Renderlogik, die Clientlogik und die Datenbankseite.

### 57.8 Fachlogik

Unverändert. Keine der zwölf geschützten Fachdateien wurde angefasst –
keine Berechnung, keine Stückliste, kein Zuschnitt, keine Abwicklung,
kein Speicher-Payload, keine PDF-/Drucklogik.

### 57.9 PETER KÜNZI AG

Nach allen Tests unverändert: 2 Firmen, 13 Profile, 4 Projekte (Status
und `updated_at` identisch), 13 Massaufnahmen, 1 Projektdatei, 14
Storage-Objekte, 4 `audit_log`-Zeilen, `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`). Keine Wegwerf-Firma, kein
Testprojekt, keine Test-Massaufnahme übrig; alle mutierenden Tests
liefen in `begin; … rollback;`.

### 57.10 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 57.7).
- Bewusst **nicht** gebaut (Auftrag Abschnitt 18): Ordner/Kategorien/
  Tags, Favoriten, Versionierung, Freigaben, öffentliche Dateien,
  automatische Archivierung, Massenbearbeitung.
- Die aus v2.48 offenen Punkte bleiben unverändert: leere
  `allowed_mime_types`, Massaufnahme ohne Projekt kann kein Foto
  speichern, fehlender `search_path` bei zwei Storage-Hilfsfunktionen,
  9 verwaiste Storage-Objekte aus v2.24.

## 58. FOTOS/SKIZZEN DIREKT BEI DER MASSAUFNAHME — VERSION 2.50

Im Projekt-Cockpit ist jetzt auf einen Blick erkennbar, ob eine
Massaufnahme Fotos oder Skizzen hat, und sie lassen sich ansehen, ohne
in den Bearbeitungsmodus zu wechseln. **Keine DB-Änderung, keine
Storage-/RLS-Änderung, keine Massaufnahme-Fachlogik angefasst.**

### 58.1 Medien-Hinweis in der Massaufnahme-Zeile

`loadProjectMeasurements()` (js/09-projekte.js) ergänzt je Zeile – **nur
wenn wirklich etwas gespeichert ist** – eine dritte Infozeile und einen
Knopf:

```
Rinne Halbrund
Dachrinne Nord · 2.9.2026
📷 1 Foto · ✏️ 2 Skizzen
[Öffnen] [📷 Fotos/Skizzen] [🖨️] [×]
```

Ohne Medien erscheint weder Hinweis noch Knopf – kein Platzhalter.
Öffnen, Drucken und Löschen sind unverändert.

**Keine zusätzliche Abfrage je Massaufnahme**: `photo_path`,
`sketch_paths` und `sketch_path` stammen aus den ohnehin geladenen
Zeilen (`select("*")`, `projectMeasurementsCache`).

### 58.2 Zählregeln (js/24, `measMedienPfade()`)

- Foto vorhanden, wenn `photo_path` gesetzt und nicht nur Leerzeichen.
- Skizzen: `sketch_paths`, sofern ein Array mit Einträgen; sonst
  ersatzweise das alte Einzelfeld `sketch_path` (Legacy aus der Zeit vor
  `sketch_paths`). Leere Einträge im Array werden herausgefiltert.
- Es wird nichts erfunden und nichts gezählt, was nicht gespeichert ist.
- Text: „📷 1 Foto", „✏️ 1 Skizze", „✏️ 3 Skizzen", kombiniert
  „📷 1 Foto · ✏️ 2 Skizzen"; ohne Medien leerer String.

Realer Bestand zum Zeitpunkt dieser Runde (rein lesend geprüft): 13
Massaufnahmen, davon 0 mit Foto, 2 mit `sketch_paths`, 0 nur mit dem
Legacy-Feld – bei 11 Zeilen erscheint also weiterhin nichts Zusätzliches.

### 58.3 Medienansicht (reine Anzeige)

Neues `#measMediaModal` mit einer Kachelgalerie: Foto zuerst (Label
„Foto"), danach die Skizzen („Skizze 1", „Skizze 2", … bzw. „Skizze" bei
nur einer). Tippen auf eine Kachel öffnet `#measMediaViewer` – eine
schlichte Vollbildansicht mit dem grossen Bild und einem
Schliessen-Knopf; ein Klick auf den Hintergrund schliesst ebenfalls.

**Warum eine eigene Ansicht statt der vorhandenen Vollbildfunktion:**
`openSketchFullscreen()` (js/10-massaufnahme.js) ist die Zeichenfläche
des Bearbeitungsformulars – sie würde den Bearbeitungszustand anfassen.
Der Auftrag sieht für diesen Fall ausdrücklich eine kleine separate
Nur-Anzeige-Funktion vor. Sie liegt vollständig in
`js/24-projekt-cockpit.js`; **js/10 und js/16 wurden nicht verändert**
und kennen die neue Ansicht nicht.

**Storage-Logik unverändert wiederverwendet**: `storageSignedUrl()` →
`measStoragePathFromValue()` → `createSignedUrl()` aus js/10. Der Bucket
bleibt privat, es wird **keine öffentliche URL** eingeführt und keine
zweite Storage-Logik gebaut. Rohe Pfade erscheinen nirgends als
sichtbarer Text (nur als Attribut).

### 58.4 Fehlerverhalten je Medium

`medienThumbsAufloesen()` ist eine eigene, kleine Variante von
`resolveSignedThumbnails()`: schlägt eine einzelne signierte URL fehl,
wird **nur diese Kachel** durch „Vorschau nicht verfügbar" ersetzt (das
Label bleibt stehen); die übrigen Kacheln laden normal weiter und die
Massaufnahme-Liste dahinter bleibt heil. Eine nicht aufgelöste Kachel
lässt sich auch nicht gross öffnen (`data-bereit` wird nur bei Erfolg
gesetzt).

### 58.5 Bearbeiten unverändert

Die Medienansicht liest ausschliesslich aus
`projectMeasurementsCache` und ruft weder `openMeasurement()` noch
Speicher-/Upload-/Löschfunktionen auf. Eine unbekannte oder manipulierte
Massaufnahme-ID findet keinen Eintrag im (RLS-gefilterten) Cache und
öffnet nichts. `goToStart()` schliesst beide neuen Ebenen mit.

### 58.6 Mobile

Kacheln `flex:1 1 140px`, max. 200 px breit, mind. 130 px hoch mit
110 px Bildfläche (`object-fit:cover`, kein verzerrtes
Seitenverhältnis) – gross antippbar, umbruchfähig, kein horizontales
Scrollen. Der Schliessen-Knopf der Vollbildansicht hat 44 px, das Bild
`max-height:80vh` mit `object-fit:contain`.

### 58.7 Tests

Neuer Prüfstand `medien50` (42/42): Zählregeln für 0 Medien, nur Foto,
1 Skizze (Einzahl), 3 Skizzen (Mehrzahl), Foto + Skizzen, Legacy
`sketch_path` ohne `sketch_paths`, `sketch_paths = null`, leere
Array-Einträge, Leerzeichen-Foto; Zeile im Cockpit (Hinweis und Knopf
nur bei Medien, Öffnen/Drucken/Löschen unverändert, **keine zusätzliche
Storage-Abfrage je Zeile**, kein `http`-Link im Markup); Medienansicht
(Titel, Untertitel, 3 Kacheln, Beschriftungen, keine rohen Pfade als
Text, genau eine signierte URL je Medium); Fehlerfall (nur die betroffene
Kachel fällt aus, Platzhalter, Label bleibt, übrige Kacheln geladen);
Legacy-Einzahl; ohne Medien und mit fremder ID öffnet nichts; js/10 und
js/16 kennen die Medienansicht nicht.

Regression, alle bestanden: nav 23/23, suche40 7/7, treffer40 7/7,
recent41 12/12, stand42 17/17, dateien43 27/27, adresse45 39/39, kopf45
8/8, suche45 13/13, status46 35/35, projekte47 37/37, auswahl48 32/32,
dateien49 38/38, ui39 (9 Fälle). `node --check` über alle `js/*.js` und
`sw.js` fehlerfrei, `<div>`/`</div>` in `index.html` ausgeglichen
(662/662, vorher 654/654 – Differenz durch die zwei neuen Ebenen), keine
doppelten Element-IDs, jede neue ID genau einmal vorhanden, kein
doppelter Event-Handler, `js/24-projekt-cockpit.js` war bereits in der
Service-Worker-SHELL (keine neue Datei).

`ui39` und `adresse45` laden die Medien-Helfer jetzt direkt aus
`js/24-projekt-cockpit.js` (Stub-Lücke, keine Code-Korrektur) – im
Browser sind es globale Funktionen.

**Keine Live-Browser-Tests gegen Supabase möglich** – die Sandbox
blockiert weiterhin ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. Ein echtes Vorschaubild und eine
echte signierte URL wurden **nicht** im Browser geprüft und werden nicht
als getestet behauptet.

### 58.8 Sicherheit

Keine Änderung an Storage-RLS, Tenant-RLS, dem privaten Bucket, dem
50-MB-Limit oder `storage_object_insert_allowed()`. Erneut bestätigt
(`begin; … rollback;`, Wegwerf-Firma): fremde Massaufnahmen 0 sichtbar,
fremde Storage-Objekte 0 sichtbar, `project-files/4/hack.pdf` und
`misc/x/y.txt` weiterhin abgelehnt, Bucket weiterhin privat mit
52428800 Bytes.

### 58.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/24-projekt-cockpit.js` | `measMedienPfade/measHatMedien/measMedienText`, `openMeasMedien()`, `medienThumbsAufloesen()`, Vollbild-Handler |
| `js/09-projekte.js` | Medien-Hinweis und Medien-Knopf in der Massaufnahme-Zeile, ein Zweig im bestehenden Klick-Handler |
| `js/03-login.js` | zwei Zeilen: `goToStart()` schliesst die neuen Ebenen mit |
| `index.html` | `#measMediaModal`, `#measMediaViewer`, Version 2.50 |
| `css/01-basis.css` | Medien-Hinweis, Kachelgalerie, Vollbildansicht |
| `sw.js` | Cache-Version 2.50 |

**Nicht angefasst**: alle zwölf geschützten Fachdateien (`js/10`–`js/17`,
`js/19`–`js/21`), `js/01-basis.js`, `js/04-start-suche.js`,
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js`, `js/23-verlauf.js`,
`js/22-system-admin.js`, `js/05a-rechte.js`. Keine Berechnung, keine
Stückliste, kein Zuschnitt, keine Abwicklung, kein Speicher-Payload,
keine PDF-/Drucklogik.

### 58.10 Offene Punkte

- Kein Live-Klicktest im Browser möglich (siehe 58.7).
- Bewusst nicht gebaut: Zoom/Wischen in der Vollbildansicht, Herunterladen
  einzelner Medien, Bearbeiten aus der Medienansicht heraus.
- Die aus v2.48/v2.49 offenen Punkte bleiben unverändert (leere
  `allowed_mime_types`, Massaufnahme ohne Projekt kann kein Foto
  speichern, fehlender `search_path` bei zwei Storage-Hilfsfunktionen,
  9 verwaiste Storage-Objekte aus v2.24).

## 59. HOTFIX: APP NACH DEM START BLOCKIERT — VERSION 2.51

**Fehler aus v2.50, im Betrieb sofort aufgefallen:** Nach dem Anmelden lag
eine dunkle Ebene mit einem einzelnen Knopf „✕ Schliessen" über dem
gesamten Startbildschirm; die App war nicht mehr bedienbar.

### 59.1 Ursache

Die in v2.50 neu eingeführte Vollbildansicht `#measMediaViewer` steht im
HTML mit `hidden`. Ihre Klasse setzt aber ein eigenes `display`:

```css
.medien-viewer{position:fixed;inset:0;z-index:900;background:#0d141aee;display:flex;…}
```

Die Browserregel `[hidden]{display:none}` hat dieselbe Spezifität wie ein
Klassenselektor und steht im User-Agent-Stylesheet – eine Autorenregel mit
`display:flex` schlägt sie deshalb. Das Element war damit **immer**
sichtbar: `position:fixed; inset:0` legte es über die ganze Seite, der
halbtransparente Hintergrund verdunkelte alles darunter, und `z-index:900`
fing jeden Klick ab.

Genau deshalb hat das Projekt für solche Ebenen bereits eine feste
Konvention, die ich in v2.50 schlicht vergessen habe:

```css
.sketch-fullscreen[hidden]{display:none}
.meas-preview[hidden]{display:none}
```

### 59.2 Korrektur

Zwei Zeilen in `css/01-basis.css`:

```css
.medien-viewer[hidden]{display:none}
.status-filter[hidden]{display:none}
```

Die zweite betrifft denselben Fehlertyp aus v2.46 (`.status-filter` setzt
ebenfalls `display:flex` und steht im HTML auf `hidden`). Dort blieb er
folgenlos, weil die Zeile im versteckten Zustand ohne Inhalt gerendert
wird und deshalb nichts sichtbar war – trotzdem korrigiert.

**Kein JavaScript geändert, keine Funktion entfernt.** Die Medienansicht
aus v2.50 funktioniert unverändert; sie ist jetzt nur wieder versteckt,
solange sie niemand öffnet.

### 59.3 Damit das nicht wieder passiert

Neuer Prüfstand `hidden51`: liest alle Elemente mit `hidden`-Attribut aus
`index.html` (aktuell 71) und prüft für jede ihrer Klassen, ob eine
CSS-Regel dafür ein `display` setzt – und falls ja, ob es die zugehörige
`[hidden]`-Regel gibt. Fehlt sie, schlägt der Prüfstand mit dem Namen des
betroffenen Elements fehl.

Gegenprobe durchgeführt: mit entfernter Korrekturzeile meldet der
Prüfstand `>> ohne [hidden]-Regel: measMediaViewer (.medien-viewer)` und
schlägt fehl; mit der Zeile ist er grün. Er fängt den Fehler also
tatsächlich und ist nicht bloss dekorativ.

### 59.4 Versionssprung

Version und Service-Worker-Cache auf **2.51** – ohne neue Cache-Version
würde die installierte PWA die alte, kaputte `css/01-basis.css` weiter
aus dem Offline-Cache laden und der Fehler bliebe auf dem Gerät bestehen.

### 59.5 Tests

- `hidden51` 7/7, inklusive Gegenprobe.
- Regression: nav 23/23, suche40 7/7, treffer40 7/7, recent41 12/12,
  stand42 17/17, dateien43 27/27, adresse45 39/39, kopf45 8/8, suche45
  13/13, status46 35/35, projekte47 37/37, auswahl48 32/32, dateien49
  38/38, medien50 42/42, ui39 (9 Fälle).
- `node --check` über alle `js/*.js` und `sw.js` fehlerfrei,
  `<div>`/`</div>` unverändert 662/662.
- `git diff`: nur `css/01-basis.css` (zwei Regeln plus Kommentar),
  `index.html` (Versionstext) und `sw.js` (Cache-Version).
- Keine Datenbank-, RLS- oder Storage-Änderung; PETER KÜNZI AG nicht
  berührt.
- Kein Live-Browser-Test möglich (Sandbox blockiert HTTPS zu Supabase) –
  die Ursache ist aber reines CSS und im Screenshot des Betreibers
  eindeutig zu sehen.

## 60. NEUE MASSAUFNAHME-FUNKTION „KEHLE" — VERSION 2.52

Zehnte Massaufnahme-Funktion: Winkelberechnung für Kehlen an Lukarnen.
**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung**
und keine einzige Zeile an einer der bestehenden neun Berechnungen.

### 60.1 Versionsnummer

Der Auftrag verlangte „Version auf 2.51 erhöhen". 2.51 war zu diesem
Zeitpunkt aber bereits vergeben – an den Hotfix aus Abschnitt 59, der
noch am selben Tag ausgeliefert werden musste (unsichtbare Ebene über
dem Startbildschirm). Diese Arbeit ist deshalb **Version 2.52**
geworden; 2.51 bleibt der Hotfix.

### 60.2 Die Excel ist die Referenz – vier Abweichungen zum Auftragstext

Die Vorlage wurde ausgepackt und Zelle für Zelle ausgelesen
(`xl/worksheets/sheet1.xml`, Blatt „Winkelberechnung Kehle  Grat").
Verwendet wird ausschliesslich **Spalte C** (Kehle); Spalte D/E ist die
Grat-Variante und bleibt unberücksichtigt.

Dabei zeigte sich: der Fliesstext des Auftrags gibt vier Formeln
**falsch** wieder – dort wurden Zellbezüge verwechselt. Massgeblich ist
die Excel selbst, wie der Auftrag ausdrücklich festlegt („Die
Excel-Datei ist die fachliche Referenz. Keine Formeln vereinfachen,
umstellen oder durch eigene geometrische Berechnungen ersetzen."):

| Wert | Excel-Zelle | Excel-Formel | Auftragstext | umgesetzt |
|---|---|---|---|---|
| Y  | C18 | `C26/COS(C27/180*PI())` → **A / cos(b)** | `A / COS(m…)` | Excel |
| AA | C20 | `C26*TAN(C27/180*PI())` → **A · tan(b)** | `A * TAN(m…)` | Excel |
| AC | C22 | `C6/COS(C30/180*PI())` → **Q / cos(e)** | `Q / COS(n/2…)` | Excel |
| f  | C31 | `C36+90` → **l + 90** | `o + 90` | Excel |

In allen vier Fällen zeigt der Auftragstext auf eine andere Zelle als
die Excel: C27 ist **b** (nicht m), C30 ist **e** (nicht n/2), C36 ist
**l** (nicht o).

Das ist nicht theoretisch: `d` hängt über AA und AC an zwei dieser
Formeln. Mit den Excel-Formeln kommt für das Auftragsbeispiel
d = 47.46° heraus – exakt der geforderte Regressionswert. Mit den
Formeln aus dem Fliesstext käme **d = 104.68°** heraus, und f wäre
122.77° statt 147.23°. Die Excel-Variante ist also zugleich die
einzige, die den im Auftrag selbst genannten Sollwert trifft.

### 60.3 Berechnung und Reihenfolge

Excel rechnet zellweise und kennt keine Reihenfolge; im Code muss sie
zirkelfrei sein. Umgesetzt in `kehleBerechnen()` (`js/25-kehle.js`),
jede Zeile mit ihrer Excel-Zelle als Kommentar:

```
Q,R,S,T → tanU,tanV → U,V → U+90,V+90 → W → A → e → l,m
        → n,o,p → b,c → X,Y,Z,AA → AB → AC → AD,AE → h,i,k → d → f,g
```

Alle 35 Werte wurden gegen die in der Vorlage zwischengespeicherten
Excel-Ergebnisse geprüft (NH=42.5 / NL=23.5 / GL=100) und stimmen bis
auf Maschinengenauigkeit (grösste Abweichung 2.8e-14 bei AD, reine
Gleitkomma-Rundung) überein.

Gerechnet wird durchgehend mit voller JS-Genauigkeit; erst
`kehleWert()` formatiert auf zwei Nachkommastellen und hängt die
Einheit an (Winkel °, Längen mm, reine Verhältniszahlen tanU/tanV ohne
Einheit).

### 60.4 Eingaben und Fehlerprüfung

Genau die drei geforderten Eingaben: NH, NL, GL. Keine weiteren
Pflichtfelder, kein Material, keine eigene Einstellungsseite.

Geprüft wird vor jeder Berechnung: NH > 0, NL > 0, GL > 0 – zusätzlich
NH < 90 und NL < 90, weil `tan(90°)` sonst einen sinnlosen Riesenwert
liefert und aus einer 90°-„Dachneigung" keine Kehle entsteht. Fehlt ein
Wert, ist er leer, nicht numerisch, `null`, `NaN` oder `Infinity`, wird
**gar nicht erst gerechnet**; die Funktion liefert
`{ok:false, fehler:[...]}` mit einer verständlichen deutschen Meldung.

Zwei zusätzliche Sicherungen, damit niemals NaN/Infinity in der Anzeige
landet:
- die Radikanden von AD und AE werden vor dem Wurzelziehen geprüft
  (im gesamten gültigen Bereich 0<NH<90 / 0<NL<90 sind beide positiv –
  über 31 684 Kombinationen nachgerechnet, kein einziger Negativfall);
- am Schluss wird jeder der 35 Werte auf `Number.isFinite` geprüft.

Bei ungültiger Eingabe zeigt die Hauptbox „–" statt einer Zahl, die
beiden anderen Blöcke bleiben leer, und der Hinweis nennt in Rot, was
fehlt.

### 60.5 Darstellung

- **Hauptresultate** b, c und d in einer eigenen, blau umrandeten Box
  mit 26 px grosser Zahl – sie dominieren klar.
- **Weitere Resultate** A, e, f, g, h, i, k, l, m, n, o, p als kompakte
  Tabelle Zeichen / Bezeichnung / Wert.
- **Zwischenergebnisse** Q, R, S, T, tanU, tanV, U, V, U+90, V+90, W,
  X, Y, Z, AA, AB, AC, AD, AE und „Innenwinkel zu Mittelrippe" (F34)
  in einem eingeklappten `<details>` – vorhanden für die transparente
  Kontrolle, aber ausdrücklich untergeordnet.

Damit sind **alle** Resultate der Excel sichtbar, inklusive der beiden
unbeschrifteten Grundriss-Winkel C14/C15 und der Hilfsquotienten
C10/C11.

Die Beschriftungen stammen wörtlich aus Spalte A der Excel. Nur wo die
Excel für die Kehle gar keine Zeilenbeschriftung führt (n, p), wurde
die Bezeichnung aus dem Auftrag übernommen; bei p ergänzt um den
Zusatz „(Gegenwinkel, 180° − o)", weil o und p in der Excel dieselbe
Beschriftung teilen würden.

Live-Berechnung bei jeder Eingabe (`input`-Listener auf den drei
Feldern), wie bei Lukarne/Anschlussblech/Einfassung Rund – kein
zusätzlicher „Berechnen"-Knopf.

### 60.6 Integration – bewusst minimal

`measurements.type` hat **keine** CHECK-Constraint (direkt am Schema
geprüft), ein neuer Typwert braucht daher keine Migration.

| Datei | Änderung |
|---|---|
| `js/25-kehle.js` | **neu** – gesamte Fachlogik und Darstellung |
| `js/01-basis.js` | eine Zeile: `kehle:"Kehle"` in `MEAS_TYPE_LABELS` |
| `index.html` | Auswahlknopf, `<option>`, Formularblock, Script-Tag, Version |
| `js/16-…-formular.js` | **+66 Zeilen, 0 gelöscht**: Sektion ein-/ausblenden, Render-Aufruf, Speicher-Payload, Pflichtprüfung, Druckzweig |
| `js/10-massaufnahme.js` | **+2 Zeilen, 0 gelöscht**: Formular leeren bzw. füllen |
| `css/01-basis.css` | Stile der Ergebnisdarstellung |
| `sw.js` | Cache-Version 2.52 + neue Datei im SHELL |

Beide Eingriffe in geschützte Dateien sind **rein additiv** (per
`git diff --numstat` belegt: 66/0 und 2/0). Es wurde keine bestehende
Zeile geändert oder entfernt – keine Berechnung, keine Stückliste, kein
Zuschnitt, keine Abwicklung, kein bestehender Druckzweig.

Automatisch mitbenutzt, ohne eigene Zeile Code:
`MEAS_TYPE_LABELS` (Cockpit, Übersichten, Suche, PDF-Kopf), der
Ersteller-/Bearbeiter-Trigger aus v2.28, der Audit-Trigger aus
v2.30/v2.33, die Projektzuordnung, die Tenant-RLS und der
Verlauf-Knopf.

**Druckzweig**: Ohne eigenen Zweig fiele die Kehle in den allgemeinen
Foto-Zweig und würde ein Blatt ganz ohne Zahlen drucken – für eine
reine Rechenfunktion wäre das ein Defekt, nicht eine Auslassung.
Deshalb ein additiver `else if`-Zweig mit Angaben, Hauptresultaten
b/c/d und der Tabelle der weiteren Resultate. Die neun bestehenden
Druckzweige sind unverändert.

**Kein Material, keine Medien**: Die Kehle speichert
`photo_path:null` und `sketch_paths:[]` wie Anschlussblech und
Einfassung Rund. Die Medienfunktion aus v2.50 erkennt dadurch korrekt
„keine Medien" und zeigt weder Hinweis noch Knopf.

**Gespeichert** werden die drei Eingaben als Zahlen plus alle 35
Ergebnisse in voller Genauigkeit – gleiches Vorgehen wie bei
Anschlussblech/Einfassung Rund, damit ein später gedrucktes PDF
unverändert bleibt, auch wenn sich die Formeln je änderten.

### 60.7 Tests

**`kehle52` – 552/552** (`kehleBerechnen`/`kehleWert`/Darstellung aus
der echten Datei):
- Excel-Beispiel NH=42.5 / NL=23.5 / GL=100 → **b = 66.48°,
  c = 122.77°, d = 47.46°** (Pflicht-Regression des Auftrags);
- alle 35 Zwischen- und Endresultate identisch zu den in der Vorlage
  zwischengespeicherten Excel-Werten (Toleranz 1e-9);
- acht weitere Eingabekombinationen (30/20/100, 45/45/1000,
  60/15/2500, 15/60/800, 42.5/23.5/3200, 89/1/50, 1/89/5000,
  22.5/35/1234.5), jeweils **alle** Werte gegen eine unabhängig aus den
  Excel-Formeln nachgebaute Referenz;
- Skalierungsprobe: GL verdoppeln lässt alle 19 Winkel unverändert und
  verdoppelt alle 14 Längen exakt;
- 21 Eingabefehler (leer, einzeln leer, 0, negativ, 90, >90, „abc",
  Leerzeichen, `null`, `undefined`, fehlendes Objekt, `NaN`,
  `Infinity`) – jeder führt zu **keiner** Berechnung und einer
  verständlichen Meldung;
- kein NaN/Infinity: 3 481 Eingabekombinationen über das ganze gültige
  Feld, über 100 000 Einzelwerte geprüft; dazu die Anzeigefunktion mit
  `NaN`, `±Infinity`, `null`, `undefined`, Text;
- 35 Beschriftungen vorhanden, fachlich (kein „Ergebnis 1"), b/c/d/A/e
  wörtlich gegen die Excel geprüft;
- Darstellung: Hauptbox enthält genau b/c/d, weitere Resultate genau
  12 Zeilen, Zwischenergebnisse genau 20 Zeilen und eingeklappt,
  ungültige Eingabe zeigt „–" statt Zahlen und keine NaN.

**`kehleintegration52` – 76/76** (Speichern/Öffnen/Cockpit/Medien gegen
`buildMeasurementFromForm()` aus js/16 und die Medien-Helfer aus js/24):
Payload trägt Typ, Titel, Notiz, Datum, Projekt-ID, die drei Eingaben
als Zahlen und alle 35 Ergebnisse in voller Genauigkeit; erneutes
Öffnen füllt die Felder und rechnet identisch; nochmaliges Speichern
ergibt dieselben Werte; das Cockpit kennt „Kehle" (zehn Arten);
Medienfunktion meldet korrekt „keine Medien", während Skizze/Foto
inklusive Legacy-Feld unverändert funktioniert; der Payload setzt
`created_by`/`created_at`/`updated_by`/`updated_at` nicht selbst; der
`skizze_foto`-Zweig ist unverändert.

**Datenbank** (Wegwerf-Firma `99999999-…`, ausschliesslich
`begin; … rollback;`) – 13/13:
Kehle-Massaufnahme wird gespeichert; ein bewusst gefälschtes
`created_by`/`created_at` wird vom Trigger aus v2.28 überschrieben;
`updated_by`/`updated_at` werden gesetzt und bleiben beim Ändern
korrekt, `created_by`/`created_at` unverändert; Projektzuordnung
gespeichert; der Verlauf schreibt `created` mit Projekt- und
Benutzerbezug, beim Ändern `updated` mit Titel-Diff und beim Löschen
`deleted`; die b/c/d-Werte stehen unverändert in der Datenbank;
Cross-Tenant liefert für die vier echten Projekt-IDs von
PETER KÜNZI AG je 0 Zeilen.

Wichtig dabei: der Detail-Diff aus v2.34 kennt den Typ „kehle" nicht.
Das ist kein Fehler – die typspezifischen `IF`-Zweige greifen einfach
nicht, der Trigger läuft durch und schreibt weiterhin die
`title`/`date`/`note`-Diffs aus v2.33. Ein Detail-Diff der drei
Kehle-Eingaben wäre eine eigene, spätere Migration.

**Regression** – alle bestehenden Prüfstände vollständig gelaufen:
nav 23/23, suche40 7/7, treffer40 7/7, recent41 12/12, stand42 17/17,
dateien43 27/27, ui39 (9 Darstellungsfälle), adresse45 39/39,
kopf45 8/8, suche45 13/13, status46 35/35, projekte47 37/37,
auswahl48 32/32, dateien49 38/38, medien50 42/42, hidden51 7/7.

**Struktur**: `node --check` über alle 27 `js/*.js` und `sw.js`
fehlerfrei; `<div>`/`</div>` ausgeglichen (672/672, vorher 662/662);
keine doppelte Element-ID; jede neue ID genau einmal vorhanden; der
`input`-Listener der drei Kehle-Felder wird genau einmal gebunden;
alle 36 SHELL-Einträge des Service Workers existieren und keine
`js`-Datei fehlt darin; alle 27 Script-Tags zeigen auf vorhandene
Dateien; keiner der 13 neuen globalen Namen (`KEHLE_*`, `kehle*`,
`renderKehleResult`) kollidiert mit einem bestehenden.

`hidden51` (Wächter aus Abschnitt 59) bleibt grün: der neue Block
`#measTypeKehle` startet wie die neun bestehenden Sektionen ohne
eigene Klasse, und keine der neuen CSS-Klassen wird je versteckt.

### 60.8 PETER KÜNZI AG

Vor und nach allen Tests identisch: 2 Firmen, 13 Profile, 4 Projekte,
13 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Projektdatei, 4
`audit_log`-Zeilen, `companies.updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`). Keine Wegwerf-Firma, kein
Testprojekt, keine Test-Massaufnahme übrig; Mike Ledermann wieder in
seiner echten Firma. Sämtliche schreibenden Tests liefen in
`begin; … rollback;`.

### 60.9 Offene Punkte

- **Kein Live-Klicktest im Browser möglich** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`,
  wie in jeder vorherigen Sitzung. **Das wird hier ausdrücklich nicht
  als getestet behauptet.** Geprüft sind die Rechenlogik gegen die
  echten Excel-Werte, die Darstellung gegen den echten Renderer, der
  Speicher-/Öffnen-Weg gegen den echten `buildMeasurementFromForm()`
  und die Datenbankseite gegen das echte Produktivschema.
- Kein Feld-Diff der drei Kehle-Eingaben im Verlauf (siehe 60.7) –
  wäre eine eigene Erweiterung von `write_audit_log()` nach dem Muster
  aus v2.34.
- Keine Zeichnung/Skizze der Kehle – der Auftrag verlangt Zahlen, und
  eine massstäbliche Darstellung wäre eine eigene, grössere Aufgabe.
- Die Grat-Variante der Vorlage (Spalte D/E, „Winkelberechnung für
  Gratbleche") ist **nicht** umgesetzt. Sie rechnet mit denselben
  Zwischenwerten, aber teilweise anderen Beschriftungen und einem
  zusätzlichen Wert („Innenwinkel zu Mittelrippe"). Falls sie später
  gewünscht wird, wäre das eine elfte Massaufnahme-Art nach demselben
  Muster.
- Aus v2.48/v2.49 weiterhin offen: leere `allowed_mime_types` am
  Bucket, Massaufnahme ohne Projekt kann kein Foto speichern,
  fehlender `search_path` bei zwei Storage-Hilfsfunktionen, 9
  verwaiste Storage-Objekte aus v2.24.
