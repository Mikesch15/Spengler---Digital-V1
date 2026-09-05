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

**AKTUELLER REFERENZSTAND: Version 2.79, Branch `main`.**

Aktueller Hauptstand:
- Branch: `main`
- sichtbare App-Version: **2.79**
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

Die **Massaufnahme besteht aktuell aus ELF Funktionen**:

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
11. **Rinne**

Diese elf Funktionen müssen bei Refactorings, Tests, Berechtigungen, PDF-Ausgabe, Speichern/Laden und zukünftiger Weiterentwicklung berücksichtigt werden.

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
- `rinne`

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

### 3.11 Rinne

Interner Typ: `rinne`

Zuschnittliste für Rinnen, neu in Version 2.56 (Abschnitt 64), seit
Version 2.57 mit **frei definierbarem Profil** (Abschnitt 65). Fachliche
Referenz der Rechnung ist die Vorlage „Zuschnittliste Rinnen.xlsx",
Blatt „Tabelle1".

Bestehende Kernfunktion:
- **frei definierbares Profil** (wie beim Freien Profil): je Segment
  Bezeichnung, Winkel und die Art **fix** (bei jedem Stück gleich, eigene
  Länge) oder **variabel** (je Stück links/rechts eigener Wert)
- variable Segmente heissen automatisch A, B, C … – die Stückliste zeigt
  genau so viele Spalten, wie das Profil variable Masse hat
- Segmente hinzufügen, verschieben, löschen; Winkel frei änderbar,
  180° = Umschlag
- mehrere Rinnenstücke je Massaufnahme
- je Stück: variable Masse links/rechts, Länge M/M, Ansetzen links/rechts
- automatische Verkettung: rechts des Stücks N wird links des Stücks N+1
  (nur beim Anlegen, danach frei änderbar, nie rückwirkend)
- Abwicklung links/rechts, finale Zuschnittlänge
- dynamische SVG-Profilskizze aus dem definierten Profil
- Ansetztypen und Standardprofil zentral in den Einstellungen
- Material
- Speichern/Laden
- PDF/Druck

**Die drei Formeln dürfen nur gegen die Excel geändert werden:**
`Abw. L = Summe der variablen Masse links + Summe aller Fixmasse`,
`Abw. R = Summe der variablen Masse rechts + Summe aller Fixmasse`,
`Zuschnitt = Länge M/M + Ansetzen L + Ansetzen R`.
Mit dem mitgelieferten Standardprofil (Fixmasse 15+150+40+40+250+15
= 510, drei variable Masse A/B/C) ist das rechnerisch identisch mit der
Excel – der Prüfstand rechnet weiterhin alle 35 Datenzeilen dagegen.

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

Insbesondere bei Massaufnahmen immer prüfen, ob alle elf Funktionen noch funktionieren:

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
- Rinne

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

**Kurzbezeichnungen auf dem Bildschirm (nachgereicht auf Rückmeldung
des Betreibers, gleiche Version):** Die vollen Excel-Bezeichnungen sind
für eine Tabelle auf dem Handy zu lang – „Total Winkel Dachfläche
Lukarne zu Dachfläche Hauptdach in Ebene senkrecht zu Kehllinie" allein
füllt mehrere Zeilen. `KEHLE_KURZ`/`KEHLE_HAUPT_KURZ` liefern deshalb
eine gekürzte Fassung für die Anzeige (längste 30 Zeichen bei den
weiteren Resultaten, 35 bei den Zwischenergebnissen), sodass jede Zeile
einzeilig bleibt. Der **volle Excel-Wortlaut geht nirgends verloren**:
er hängt als `title`-Tooltip an jeder Tabellenzeile und an den drei
Hauptresultaten und steht im **PDF unverändert und ungekürzt** (der
Druckzweig verwendet weiterhin `KEHLE_LABELS`). Gekürzt wird nur, nichts
umbenannt oder erfunden. Dazu engere Spalten (Zeichen 32 px, Wert
74 px, `table-layout:fixed`) und 11.5 px Schrift; b/c/d bleiben mit
24 px unverändert dominant.

**Der eigentliche Grund, warum zunächst alles rechts aus dem Bild lief
– wichtig für jede künftige Tabelle:** `css/01-basis.css` setzt in
Zeile 33 eine **globale** Regel

```css
table{width:100%;border-collapse:collapse;min-width:1000px;table-layout:fixed}
```

Das `min-width:1000px` gilt für **jede** Tabelle der App. Es ist
Absicht: die Stücklisten-Tabellen sollen breit sein und stehen deshalb
alle in einem `<div class="scroll">`, das seitwärts scrollt. Eine neue
Tabelle, die sich in die Seitenbreite einfügen soll, muss dieses
`min-width` deshalb ausdrücklich zurücksetzen – `width:100%` allein
reicht nicht und wird wirkungslos überschrieben:

```css
table.kehle-tabelle{width:100%;min-width:0;…}
```

Ohne diese eine Zeile war die Kehle-Tabelle 1000 px breit, obwohl ihr
Elternelement nur 312 px mass. Gefunden wurde das nicht durch Raten,
sondern durch Messen im echten Chromium (siehe Prüfstand `breite52`
in 60.7). Gleiche Kategorie Falle wie die `[hidden]`-Regel aus
Abschnitt 59: eine globale Basisregel, die eine neue Komponente still
überstimmt.

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

**Breiten-Prüfstand `breite52` – 52/52** (echtes Chromium über
playwright-core, das im Container bereits installiert ist): fünf
Gerätebreiten (320, 360, 412, 768, 1280 px), jeweils mit
eingeklappten und aufgeklappten Zwischenergebnissen. Geprüft wird,
dass kein Element des Kehle-Formulars über den rechten Bildrand
hinausragt, dass Modal und Seite nicht seitwärts scrollen, dass die
Tabelle in ihr Elternelement passt und dass b/c/d dabei unverändert
66.48° / 122.77° / 47.46° zeigen. Gegenprobe: die bestehenden
Stücklisten-Tabellen behalten ihr `min-width:1000px` und stehen
weiterhin in `.scroll`.

Nach der Kürzung (siehe 60.5) auf **698/698** erweitert: jede der 32
angezeigten Kurzbezeichnungen existiert, ist höchstens so lang wie die
Excel-Bezeichnung, bleibt fachlich (kein „Ergebnis 1") und passt mit
höchstens 38 Zeichen in die schmale Spalte; jede Tabellenzeile trägt
den vollen Excel-Wortlaut als Tooltip; die lange Excel-Bezeichnung
steht nicht mehr im Zellentext; Zeilenzahlen (12/20/3) und die Werte
b/c/d sind unverändert.

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

## 61. PROFESSIONELLES PDF-LAYOUT — VERSION 2.53

Alle PDF-Ausgaben ausser dem Regierapport wurden auf ein gemeinsames,
professionelles Dokumentlayout umgestellt. **Keine Schemaänderung,
keine Migration, keine RLS-/Storage-Änderung, keine Berechnung, keine
Stückliste, kein Zuschnitt und kein Speicher-Payload verändert.**

### 61.1 Bestandsaufnahme: es gibt genau drei Druckwege

Nicht angenommen, sondern gesucht (`window.open`, `.print()`,
`beforeprint`, gemeinsame PDF-Bausteine):

| Weg | Mechanismus | Betroffen |
|---|---|---|
| `printMeasurement()` (js/16) | eigenes `window.open()`-Dokument mit Inline-CSS, zehn Typ-Zweige | **ja** |
| `printAusmass()` (js/17) | eigenes `window.open()`-Dokument mit Inline-CSS | **ja** |
| Regierapport (js/08 + `css/03-druck.css`) | `window.print()` auf der **App-Seite selbst**, `@media print` | **nein – geschützt** |

Zwei weitere Treffer sind keine PDF-Ausgaben: `js/09-projekte.js:670`
öffnet eine Projektdatei über eine signierte URL, und
`js/20-anschlussblech.js:962` hängt an einem Knopf `anb_drucken`, den es
in `index.html` gar nicht gibt (Rest einer eigenständigen Testfassung).

**Entscheidende Trennung:** `css/03-druck.css` gilt ausschliesslich für
den Regierapport. Die beiden anderen PDFs sind eigenständige Dokumente
und teilen keine Zeile CSS mit ihm. Deshalb war ein vollständiger
Umbau ihres Layouts ohne jedes Risiko für den Regierapport möglich.

### 61.2 Vorher: elfmal fast dasselbe CSS

Jeder der zehn Massaufnahme-Zweige definierte ein eigenes `extraCss`
mit denselben Klassen (`.eb-section-head`, `.eb-info-table`,
`.eb-cutlist`, `.eb-diagram`) – zusammen 10 Blöcke mit nur drei echten
Abweichungen (Schriftgrösse 9.5/10/8.5 pt, eine rechtsbündige Tabelle,
eine dreispaltige Angabentabelle). Das Ausmass-PDF wiederholte
dieselben Regeln nochmals unter `.am-*`. Dazu kam ein doppelter Rand
(`body{margin:14mm}` **und** `@page{margin:12mm}` = 26 mm), sehr
gemischte Schriftgrössen von 5.5 bis 16 pt und in jedem Zweig eine
Kopfzeile aus `<h1>Bezeichnung</h1>` plus vier wiederholten Feldern
(Projekt/Datum/Funktion/Sachbearbeiter).

### 61.3 Nachher: ein Layout, eine Stelle

Die bereits vorhandenen gemeinsamen Bausteine in js/16 wurden an Ort
und Stelle ausgebaut, statt eine neue Datei einzuführen:

- **`PDF_LAYOUT_CSS`** (ersetzt `PDF_HEAD_FOOT_CSS`) – ein einziges
  Stylesheet für beide Dokumentarten, inklusive aller vorher
  duplizierten Klassen. Alle zehn `extraCss`-Blöcke sind entfallen.
- **`pdfLetterheadHtml()`** – Briefkopf: Logo (oder Firmenname als
  Ersatz), Dokumenttyp, Firmenanschrift rechts, kräftige Trennlinie.
  Ohne Logo steht der Firmenname nur links, nicht doppelt.
- **`pdfDokumentKopf()`** (neu) – Objektadresse gross als Dokumenttitel
  über die **bestehende** zentrale Adresslogik (`eintragAdresse`,
  js/01-basis.js – keine zweite Adressquelle), darunter die
  Bezeichnung und ein dreispaltiges Raster mit Projekt, Auftrags-Nr.,
  Auftraggeber, Datum, Art und Sachbearbeiter. **Leere Werte fallen
  weg**, das Raster wird auf ein Vielfaches von drei aufgefüllt, damit
  keine angebrochene Zeile mit hängendem Rand entsteht.
- **`pdfZahlenRechts()`** (neu) – setzt Spalten rechtsbündig, deren
  Werte durchgehend Zahlen sind. Arbeitet auf dem fertigen HTML und
  fasst nur einfache Zellen ohne verschachtelte Elemente an; die
  Inhalte der einzelnen Druckzweige bleiben dadurch unangetastet.
  Rechtsbündige Spalten bekommen zusätzlich `width:1%;white-space:
  nowrap`, sodass Zahlenspalten nur so breit sind wie nötig und
  Textspalten den Rest erhalten.
- **`pdfFooterHtml()`** – Firma · Erstellt/Geändert · Druckdatum.

Typografie: durchgehend 8.5 pt Grundschrift, 14 pt Dokumenttitel,
9.5 pt Bezeichnung, 6.9 pt Abschnittsbalken, 8 pt Tabellenwerte,
6.5 pt Tabellenköpfe, 6.2 pt Fusszeile. Farben monochrom
(#17202a / Grautöne) – schwarz/weiss druckbar, keine App-Optik.
Ränder nur noch über `@page` (14 mm, unten 17 mm), kein doppelter Rand
mehr.

### 61.4 Seitenumbrüche

- `thead{display:table-header-group}` – Tabellenkopf wiederholt sich
  auf jeder Folgeseite.
- `tr{break-inside:avoid}` – keine geteilte Tabellenzeile.
- `.eb-section-head{break-after:avoid}` – keine Überschrift allein am
  Seitenende.
- `.eb-info-table`, `.pdf-meta`, `.eb-diagram`, `.note`,
  `.kehle-print-haupt` jeweils `break-inside:avoid`.
- Skizzen behalten `page-break-before:always` (eine Skizze je Seite).

**Seitenzahlen**: `@page{@bottom-right{content:"Seite " counter(page)
" von " counter(pages)}}`. Ob das überhaupt zuverlässig geht, wurde
gemessen statt vermutet: in Chromium wächst der Inhaltsstrom jeder
Seite mit gesetzter Randbox um ~330 Bytes, ohne sie nicht – die Randbox
wird also gerendert. Firefox und Safari unterstützen `@page`-Randboxen
nicht; dort fehlt die Seitenzahl ersatzlos, ohne dass etwas kaputt
aussieht. Die übrige Fusszeile ist ein `position:fixed`-Element und
funktioniert überall.

### 61.5 Kehle

b, c und d bleiben in einer eigenen, kräftig umrandeten Box mit 15 pt
Zahlen deutlich hervorgehoben – jetzt monochrom statt farbig, damit sie
auch im Schwarz-Weiss-Druck dominiert. Alle weiteren Resultate und die
Excel-Berechnung selbst sind unverändert; der Abschnitt mit NH/NL/GL
heisst jetzt „Eingaben" statt „Angaben", damit Eingaben und Resultate
klar getrennt sind (Auftrag Abschnitt „Massaufnahmen").

### 61.6 Fotos und Skizzen

`max-width`/`max-height` ohne feste Breite – das Seitenverhältnis
bleibt immer erhalten (im Prüfstand mit 16:9- und 9:16-Bildern
nachgemessen). Foto und jede Skizze bekommen einen eigenen
Abschnittsbalken; die Skizzen behalten ihren Seitenumbruch. Die
private Storage-/Signed-URL-Logik (`storageSignedUrl`) ist
unverändert, es entstehen keine öffentlichen URLs.

Zeichnungen (SVG) sind auf 95 mm Höhe begrenzt (im Zweispalter 72 mm)
und bekommen 5 mm seitlichen Freiraum: einzelne Zeichnungen setzen
Beschriftungen bis an den Rand ihrer viewBox, ohne diesen Abstand
würde ein Text am Blattrand abgeschnitten. Die Zeichenfunktionen
selbst wurden nicht angefasst.

### 61.7 Ausmass

Gleicher Dokumentkopf und dieselben Tabellen wie bei den
Massaufnahmen. Positionen mit Anzahl im Abschnittstitel. **Preise,
Beträge, Summen und MwSt. gibt es im Ausmass-Datenmodell nicht**
(`positions` enthält bei „Offerte erfassen" nur pos/description/
quantity/unit, beim Blitzschutzausmass artikel_nr/bezeichnung/
material/einheit/menge) – es wurde deshalb nichts dergleichen
erfunden. Ausmass-Fotos waren bisher nicht im PDF und wurden nicht
neu aufgenommen (siehe 61.11).

### 61.8 Regierapport – nachweislich unverändert

- `js/06-rapport.js`, `js/08-katalog-blitzschutz.js` und
  `css/03-druck.css` sind **nicht im Diff**.
- Der Regierapport nutzt **keinen** der geänderten Bausteine (per Grep
  über `pdfLetterheadHtml`/`pdfFooterHtml`/`PDF_LAYOUT_CSS`/
  `pdfDokumentKopf`/`pdfZahlenRechts`/`eb-*`: null Treffer).
- Die zwei Funktionen, die er aus js/16 mitbenutzt
  (`erstelltGeaendertText`, `pdfDateiname`, dazu `formatDatumZeit`),
  sind bytegleich geblieben – einzeln per Prüfsumme gegen `HEAD`
  verglichen.
- **Pixelvergleich**: der Regierapport-Bildschirm wurde in echtem
  Chromium unter `media:print` mit ausgelöstem `beforeprint` gerendert,
  einmal auf dem Stand v2.52 und einmal mit den Änderungen. Bild und
  DOM sind **identisch** (`cmp` ohne Unterschied, 121 600 Bytes,
  gleicher SHA-256).

### 61.9 Tests

**Visueller PDF-Prüfstand `pdf52` – 240/240**, im echten Chromium
(playwright-core, im Container vorhanden): 17 Dokumente – alle zehn
Massaufnahme-Arten, Kehle mit langem Text, Massaufnahme ohne Projekt,
Foto mit vier Skizzen, Ausmass Offerte, Ausmass Blitzschutz, leeres
Ausmass und ein Ausmass mit 70 Positionen. Je Dokument geprüft:

- der Druck läuft ohne Fehler und erzeugt HTML
- **kein NaN, Infinity oder undefined**
- kein Bildschirm-UI (keine Buttons, Modals, Karten)
- gemeinsames Stylesheet aktiv
- genau ein Briefkopf, genau eine Fusszeile
- **die Objektadresse ist der Haupttitel**
- nichts läuft seitlich hinaus – gemessen in echter Druckbreite
  (A4 minus 14 mm Rand = 182 mm ≈ 688 px) unter `media:print`
- jedes Bild unverzerrt (Soll- gegen Ist-Seitenverhältnis)
- die Umbruchregeln sind wirksam (`table-header-group`,
  `break-inside:avoid`, `break-after:avoid` als *computed style*)
- das PDF wird tatsächlich erzeugt; Seitenzahlen 1 bis 5

Zusätzlich vier Dokumente einzeln als Bild angesehen und daraufhin
nachgebessert: doppelter Firmenname im Briefkopf entfernt, Zeichnungen
in der Höhe begrenzt, Zahlenspalten auf Inhaltsbreite, Notiz als
eigener Abschnitt.

**Ehrlichkeitshinweis zu den Testdaten:** Drei Zweige zeigten zunächst
NaN in den Zeichnungen und in der Scharen-Tabelle. Gegenprobe auf dem
Stand **vor** der Änderung: identisches Verhalten – es waren Lücken in
meinen Testdaten (`dilas`/`schieber` brauchen `posAbStart`, die
Scharen kommen aus der Fachberechnung), keine Regression. Nach
Korrektur der Testdaten sind alle Ausgaben sauber.

**Regression** – alle bestehenden Prüfstände grün: nav 23/23,
suche40 7/7, treffer40 7/7, recent41 12/12, stand42 17/17,
dateien43 27/27, ui39 (9 Fälle), adresse45 39/39, kopf45 8/8,
suche45 13/13, status46 35/35, projekte47 37/37, auswahl48 32/32,
dateien49 38/38, medien50 42/42, hidden51 7/7, kehle52 698/698,
kehleintegration52 76/76, breite52 52/52.

`node --check` über alle 27 `js/*.js` und `sw.js` fehlerfrei,
`<div>`-Balance unverändert 672/672, keine doppelten IDs, keine Reste
von `PDF_HEAD_FOOT_CSS`.

### 61.10 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/16-massaufnahme-formular.js` | gemeinsame PDF-Bausteine ausgebaut, 10 duplizierte `extraCss`-Blöcke entfernt, Dokumentkopf zentralisiert, Foto-/Skizzen-Zweig neu aufgebaut |
| `js/17-ausmass.js` | Ausmass-PDF auf dieselben Bausteine umgestellt, eigenes CSS entfallen |
| `index.html` | nur Versionstext 2.53 |
| `sw.js` | Cache-Version 2.53 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css`, `css/01-basis.css`, alle Zeichen- und
Berechnungsdateien (`js/11`–`js/15`, `js/19`–`js/21`, `js/25`),
`js/09`, `js/23`, `js/24`, `js/22`, `js/05a`, `js/03`, `js/01`.

### 61.11 Offene Punkte

- Die Prüfung erfolgte in headless Chromium über `page.pdf()`. Ein
  Ausdruck aus dem echten Browser-Druckdialog des Betreibers (und
  damit die Seitenzahl in dessen Browser) wurde **nicht** getestet.
- Seitenzahlen erscheinen nur in Chromium-basierten Browsern
  (siehe 61.4).
- Dass sich der Tabellenkopf auf Seite 2 tatsächlich wiederholt, ist
  über den *computed style* `table-header-group` belegt, nicht durch
  Betrachten einer gerasterten zweiten PDF-Seite – im Container fehlt
  ein PDF-Rasterer.
- Ausmass-Fotos (`ausmass.photo_path`/`photo_paths`) sind weiterhin
  nicht im PDF. Sie waren es vorher auch nicht; das wäre neuer Inhalt
  und nicht Teil dieses Auftrags.
- Die Zeichnungen enthalten intern viel Leerraum (eigene viewBox der
  Fachdateien). Eine engere Beschneidung wäre eine Änderung an den
  geschützten Zeichenfunktionen und wurde bewusst unterlassen.

## 62. EINHEITLICHER PROFESSIONELLER PDF-KOPF — VERSION 2.54

Der in v2.53 eingeführte Kopf war ein sichtbares 3-Spalten-Raster mit
umrandeten Kästchen je Kopfdatum – korrekt, aber formularhaft. Er ist
jetzt durch einen ruhigen Briefkopf ersetzt. **Nur der Kopf wurde
umgebaut**; Tabellen, Seitenumbrüche, Fotos/Skizzen, Kehle-Ergebnisse
und Fusszeile aus v2.53 sind unverändert.

### 62.1 Zwei Bausteine wurden zu einem

Vorher gab es zwei getrennte Funktionen, die jedes PDF nacheinander
aufrief: `pdfLetterheadHtml()` (Briefkopf) und `pdfDokumentKopf()`
(Titel + Datenraster). Dadurch konnten Massaufnahme und Ausmass
theoretisch auseinanderlaufen.

Jetzt gibt es **genau eine** Komponente `pdfKopfHtml(opt)`
(js/16-massaufnahme-formular.js). Beide Druckwege rufen sie mit
demselben Objekt auf; unterschiedlich sind nur zwei Werte:

```js
pdfKopfHtml({datensatz:m, projekt:proj, bezeichnung:m.title,
  dokumenttyp:"Massaufnahme", unterart:typeLabels[m.type]||m.type,
  datum:m.date||"", bearbeiter:…, logoSrc});
```

`pdfLetterheadHtml` und `pdfDokumentKopf` existieren nicht mehr (per
Grep bestätigt), der separate Briefkopf-Aufruf im Dokumentgerüst ist
entfallen. Es gibt keine zweite Kopfvariante und keinen duplizierten
CSS-Block.

### 62.2 Aufbau

```
Peter Künzi AG                                  MASSAUFNAHME
Spenglerei & Bedachungen                          02.09.2026
Industriestrasse 8
3006 Bern

Bahnhofstrasse 12, 3011 Bern
Sanierung Dach Nord · Auftrag 2026-123 · Muster Immobilien AG

Massaufnahme:  Kehle
Bezeichnung:   Kehle Lukarne Nord
Bearbeiter:    Mike Ledermann
────────────────────────────────────────────────────────────
```

- **Dokumenttyp** oben rechts, rechtsbündig, immer an derselben Kante
  (`MASSAUFNAHME` bzw. `AUSMASS`), darunter das Datum im Schweizer
  Format (`pdfDatumKurz()` wandelt `2026-09-02` → `02.09.2026`).
- **Firmenblock** oben links: Logo, sonst der Firmenname an dessen
  Stelle; darunter die Firmenanschrift klein. Mit Logo steht der
  Firmenname darunter, ohne Logo nicht doppelt.
- **Objektadresse** als grosser Haupttitel über die **bestehende**
  zentrale `eintragAdresse()`-Logik – keine zweite Adressquelle.
- **Projektzeile** als ruhiger Fliesstext `Projektname · Auftrag Nr. ·
  Auftraggeber`, nicht als Tabelle; nur vorhandene Werte.
- **Info-Zeilen** im Stil `Etikett: Wert` mit ausgerichteter
  Etikettenspalte (`min-width:24mm`), ohne Rahmen.
- **Eine** Trennlinie unter dem ganzen Kopf.

Kein `<table>`, keine `.pdf-meta`, keine Kästchen, keine Kartenoptik –
im Prüfstand ausdrücklich abgesichert.

**Die Bezeichnung bleibt erhalten.** Der Auftragsentwurf zeigt sie
nicht, sie ist aber eine echte Benutzereingabe – sie steht deshalb als
eigene Info-Zeile und entfällt nur, wenn sie mangels Projekt ohnehin
schon der Haupttitel ist (dann stünde sie doppelt).

### 62.3 Nachweis der Gleichheit

Der Prüfstand `pdf52` misst je Dokument im echten Chromium:

- **Pflichtteile** (Firmenblock, Dokumenttyp, Adresstitel, Trennlinie)
  als Struktur-Skelett ohne Textinhalte → müssen in **jedem** der 19
  Dokumente identisch sein.
- **Typografie** (Schriftgrösse, -stärke, Laufweite, Farbe von
  Dokumenttyp, Datum, Titel, Projektzeile, Info, Trennlinie, Logo,
  Firmenblock) → identisch, verglichen über alle Elemente, die im
  jeweiligen Dokument vorkommen.
- **Lage**: rechte Kante und Oberkante des Dokumenttyp-Blocks, linke
  Kante und Oberkante des Firmenblocks, linke und rechte Kante der
  Trennlinie → identisch. Die *Breite* des Dokumenttyps unterscheidet
  sich naturgemäss („MASSAUFNAHME" ist länger als „AUSMASS"); geprüft
  wird deshalb die rechtsbündige Kante, nicht die linke.
- **Vollständiger Kopf**: 16 der 19 Dokumente haben alle optionalen
  Daten – ihr komplettes Kopf-Skelett ist **byteidentisch**.
- Die drei übrigen (Massaufnahme ohne Projekt, Ausmass ohne
  Kopfdaten, leeres Ausmass) lassen genau die Blöcke weg, deren Daten
  fehlen – auch das wird geprüft: Datum genau dann, wenn ein Datum
  vorhanden ist; Projektzeile genau dann, wenn ein Projekt vorhanden
  ist.

Zusätzliche Fälle in dieser Runde: sehr lange Adresse, sehr langer
Projektname, sehr lange Auftrags-Nr. und Auftraggeber (eigenes
Testprojekt) sowie ein Dokument ganz ohne optionale Daten.

**pdf52: 416/416** über 19 Dokumente (v2.53: 240/240 über 17).

### 62.4 Regierapport – erneut pixelgleich

Wie in v2.53 geprüft, diesmal gegen den v2.53-Stand: der
Regierapport-Bildschirm wurde in echtem Chromium unter `media:print`
mit ausgelöstem `beforeprint` gerendert, einmal auf v2.53 und einmal
mit den v2.54-Änderungen. Bild und DOM sind **identisch** (gleicher
SHA-256, 122 696 Bytes). `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im
Diff.

### 62.5 Fachlogik und v2.53-Inhalt unverändert

Einzeln gegen `HEAD` gezählt und identisch geblieben: alle 14
Berechnungs- und Zeichenaufrufe (`einfBerechnen`,
`berechneAnschlussblech`, `berechneLukarne`, `berechneRinneStueckliste`,
`berechneMadStueckliste`, `kehleBerechnen`, `einlaufblechDiagramSvg`,
`generateEbkGrundriss`, `generateRinneGrundriss`, `madProfilSvgAus`,
`lukScharenZeilen`, `rinneMaterialTabelle`, `madMaterialTabelle`,
`calcRinneSegment`) sowie `pdfZahlenRechts`, `pdfFooterHtml` und
`PDF_LAYOUT_CSS`.

Ebenso unverändert: `eb-section-head`, `eb-info-table`, `eb-cutlist`,
`eb-diagram`, `kehle-print-haupt`, `pdf-bild`, `sketch-page`,
`pdf-foot`, `table-header-group` – jeweils identische Trefferzahl.

Kehle: b, c und d bleiben in ihrer hervorgehobenen Box, alle weiteren
Ergebnisse vollständig, Berechnung nicht angefasst.

### 62.6 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/16-massaufnahme-formular.js` | `pdfLetterheadHtml`+`pdfDokumentKopf` → eine `pdfKopfHtml`, neues Kopf-CSS, `pdfDatumKurz` |
| `js/17-ausmass.js` | nutzt dieselbe Komponente, separater Briefkopf-Aufruf entfallen |
| `index.html` | nur Versionstext 2.54 |
| `sw.js` | Cache-Version 2.54 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css`, `css/01-basis.css`, alle Zeichen- und
Berechnungsdateien, `js/09`, `js/22`–`js/25`, `js/05a`, `js/03`,
`js/01`.

### 62.7 Offene Punkte

- Wie in v2.53: geprüft in headless Chromium, nicht im echten
  Browser-Druckdialog des Betreibers.
- Seitenzahlen weiterhin nur in Chromium-basierten Browsern
  (Abschnitt 61.4, unverändert).
- Die Höhe des Kopfblocks hängt naturgemäss vom Inhalt ab (Anzahl
  Info-Zeilen, Umbruch einer langen Adresse). Geprüft wird deshalb die
  Gleichheit von Aufbau, Typografie und seitlicher Lage – nicht eine
  identische absolute Höhe.

## 63. VOLLSTÄNDIGE DRUCKPFAD-BESTANDSAUFNAHME — VERSION 2.55

Der Auftrag verlangte, das **gesamte Repository** nach Druck-/PDF-Pfaden
zu durchsuchen und alle Nicht-Regierapport-PDFs auf einen gemeinsamen
Kopf zu bringen. Die Kopf-Vereinheitlichung war bereits mit Version
2.54 erledigt (Abschnitt 62); der eigentliche Beitrag dieser Runde ist
die **lückenlose Bestandsaufnahme** und ihr dauerhafter Wächter.

### 63.1 Vollständige Suche

Gesucht wurde über **alle** `.js`-, `.html`- und `.css`-Dateien nach:
`window.open`, `.print()`, `@media print`, `media="print"`, `@page`,
`document.write`, PDF-Bibliotheken (jsPDF, html2pdf, pdfmake, pdf-lib,
printJS, html2canvas), `<iframe>`/dynamisch erzeugte iframes sowie
Blob-/Download-Ausgaben.

**Ergebnis: keine PDF-Bibliothek, kein iframe-Druck.** Druckdokumente
werden an genau **zwei** Stellen erzeugt.

### 63.2 Die drei Kategorien

**A – Nicht-Regierapport-Druckwege (verwenden den gemeinsamen Kopf):**

| Pfad | Deckt ab |
|---|---|
| `printMeasurement()` js/16 | alle **zehn** Massaufnahme-Arten (je eigener Zweig, `skizze_foto` über den generischen Zweig) |
| `printAusmass()` js/17 | beide Ausmass-Arten (Offerte erfassen, Blitzschutzausmass) |

Alle vier Druck-Auslöser der App münden in genau diese zwei Funktionen:
`#printMeasurementBtn` (js/16), `#printAusmassBtn` (js/17),
`[data-print-project-measurement]` und `[data-print-project-ausmass]`
(js/09), `[data-print-ausmass]` (js/17).

**B – Regierapport (unberührt):** `js/08-katalog-blitzschutz.js`
(`window.print()` auf der App-Seite + `beforeprint`-Aufbereitung),
`js/06-rapport.js`, `css/03-druck.css`. Nutzt **keinen** der
gemeinsamen Bausteine – per Prüfstand abgesichert.

**C – Kein echter Druckpfad (dokumentiert, damit es niemand dafür hält):**

| Fund | Was es wirklich ist |
|---|---|
| `js/09-projekte.js:670` `window.open` | öffnet eine Projektdatei über eine signierte URL |
| `js/07-einstellungen.js` `createObjectURL` | JSON-Datensicherung als Download |
| `js/04-start-suche.js` `createObjectURL` | CSV-Export als Download |
| `js/20-anschlussblech.js:962` `anb_drucken` | **toter Pfad** – der Knopf existiert 0× in `index.html` (Rest einer eigenständigen Testfassung). Er würde die App-Seite drucken; da er nicht existiert, kann er nie auslösen. Bewusst nicht entfernt, um die geschützte Fachdatei nicht anzufassen. |
| `spengler-digital-regierapport-v47.html` | **1 Byte grosse, leere Restdatei** im Wurzelverzeichnis, ohne jede Druckmechanik, nirgends verlinkt |
| `js/15-einlaufblech-stueckliste.js` | reine Berechnungs-/Renderdatei, kein eigener Druckpfad |

### 63.3 Neuer Prüfstand `pfade55` (36/36)

Sichert die Bestandsaufnahme dauerhaft ab und schlägt fehl, sobald ein
neuer Druckpfad entsteht, der den zentralen Kopf nicht verwendet – oder
der Regierapport ihn versehentlich doch:

- keine PDF-Bibliothek, kein iframe-Druck
- `document.write` nur in js/16 und js/17
- beide nutzen `pdfKopfHtml`, `PDF_LAYOUT_CSS` und `pdfFooterHtml` und
  bauen **keinen** eigenen Kopf
- `pdfKopfHtml` und `PDF_LAYOUT_CSS` sind je **genau einmal** definiert
- js/06, js/08 und css/03-druck.css enthalten keinen der Bausteine
- `css/03-druck.css` ist die einzige `@media print`-Datei der App-Seite
- die vier C-Funde sind als solche verifiziert (inkl. „Knopf existiert
  nicht im HTML" und „Restdatei ist leer und nirgends verlinkt")
- jede der zehn Arten aus `MEAS_TYPE_LABELS` hat einen Druckzweig, und
  die Auswahlknöpfe im HTML decken genau diese zehn Arten ab

### 63.4 Einzige Designänderung: dezente Trennlinie

Der Auftrag verlangt unter „DANN" eine **dezente** horizontale
Trennlinie. Sie war seit v2.54 mit `1.2pt solid #17202a` kräftig
(fast schwarz). Jetzt `.75pt solid #a7b1b8`.

Das ist der **gesamte Code-Diff** dieser Runde – eine einzige Zeile in
`PDF_LAYOUT_CSS`. Dass danach **alle 19 geprüften Dokumente** die neue
Linie tragen, ist zugleich der geforderte Nachweis, dass der Kopf
wirklich zentral ist: `pdf52` vergleicht die Typografie inklusive
`.pdf-trenner` über alle Dokumente und bleibt bei 416/416.

### 63.5 Tests

- **`pfade55` 36/36** – statische Bestandsaufnahme (Auftragspunkt 12A)
- **`pdf52` 416/416** – 19 Dokumente in echtem Chromium erzeugt: alle
  zehn Massaufnahme-Arten, Kehle mit langem Text, Massaufnahme ohne
  Projekt, Foto mit vier Skizzen, Ausmass Offerte, Ausmass Blitzschutz,
  leeres Ausmass, Ausmass mit 70 Positionen, sehr lange Adresse/
  Projekt/Auftrags-Nr./Kunde, Dokument ohne optionale Daten
- **Regierapport**: Druckbild und DOM v2.54 gegen v2.55 identisch
  (gleicher SHA-256, 122 548 Bytes); js/06, js/08 und css/03-druck.css
  nicht im Diff
- **Visuell geprüft** (Auftragspunkt 12E, mindestens vier):
  Rinne halbrund, Lukarne, Ausmass Blitzschutz, Massaufnahme mit sehr
  langen Werten – alle mit identischem Kopf
- Regression: alle 19 bestehenden Prüfstände grün, `node --check` über
  alle 27 `js/*.js` und `sw.js` fehlerfrei, div-Balance 672/672, keine
  doppelten IDs
- Fachlogik: alle Berechnungs- und Zeichenaufrufe sowie `pdfKopfHtml`/
  `pdfZahlenRechts`/`pdfFooterHtml` mit identischer Trefferzahl
- PETER KÜNZI AG: kein Schreibzugriff in dieser Runde

### 63.6 Offener Punkt mit konkreter Zahl

Die Zeichnungen enthalten viel Leerraum, weil die Zeichenfunktionen
eine feste, oft quadratische `viewBox` ausgeben. **Gemessen** am
Rinne-Grundriss: `viewBox="0 0 368 368"`, der tatsächliche Inhalt
belegt nur `y=21..77` – **291 von 368 Einheiten (79 %) sind leer.**

Das liesse sich im Druckdokument beheben, ohne die Zeichenfunktionen
anzufassen (ein kleines Skript im erzeugten Fenster, das die `viewBox`
jedes `.eb-diagram svg` auf die gemessene Inhalts-Bounding-Box
zuschneidet). **Bewusst nicht umgesetzt**: der Auftrag listet
„Fotos, Skizzen" ausdrücklich unter „nicht verändern" und betrifft den
Kopf. Für eine eigene, bewusste Entscheidung vorgemerkt.

## 64. NEUE MASSAUFNAHME „RINNE" (ZUSCHNITTLISTE) — VERSION 2.56

Elfte Massaufnahme-Funktion: Zuschnittliste für Rinnen. **Keine
Schemaänderung, keine Migration, keine RLS-/Storage-Änderung** und keine
Zeile an einer der bestehenden zehn Berechnungen.

### 64.1 Excel vollständig ausgelesen und nachgerechnet

Die Vorlage wurde ausgepackt und Zelle für Zelle gelesen
(`xl/worksheets/sheet1.xml`, ein Blatt „Tabelle1", Datenzeilen 7–41).
Anschliessend wurde **jede der 35 Datenzeilen** gegen die hier
umgesetzten Formeln nachgerechnet: **105 Werte, keine einzige
Abweichung.**

Formeln (wörtlich aus der Excel):

| Excel | Formel | Bedeutung |
|---|---|---|
| `N7` | `B7+C7+D7+$R$14` | Abw. L = Links A + B + C + Summe |
| `O7` | `E7+F7+G7+$R$14` | Abw. R = Rechts A + B + C + Summe |
| `M7` | `L7+IFERROR(VLOOKUP(I7,$U$8:$V$13,2,FALSE),0)+IFERROR(VLOOKUP(K7,$U$8:$V$13,2,FALSE),0)` | Zuschnitt = Länge M/M + Ansetzen L + Ansetzen R |
| `R14` | `SUM(R8:R13)` = **510** | Summe der Zusatzmasse |
| `B8/C8/D8` | `=E7 / =F7 / =G7` | Verkettung rechts → links |

Es wird **nichts gerundet** – alle Excel-Werte sind ganzzahlige
Millimeter, die Summe einer Summe bleibt exakt.

**Zusatzmasse (Excel R8:S13):**

| Zeile | Bezeichnung (Spalte S) | mm |
|---|---|---|
| R8 | Umschlag | 15 |
| R9 | Anschl. Flachdach | 150 |
| R10 | Keil | 40 |
| R11 | Keil | 40 |
| R12 | Anschl. Unterdach | 250 |
| R13 | Umschlag | 15 |
| **R14** | **Summe** | **510** |

**Ansetztypen (Excel U8:V13, Dropdown `I7:I41` und `K7:K41` über
`$U$8:$U$13`):**

| Dropdown | mm | Beschreibung (Spalte W) |
|---|---|---|
| Dila | −165 | 1/2 Dila inkl. Naht |
| Boden | 0 | – |
| Ablauf | −230 | Zugabe/Abzug bei Ablauf |
| Gehrung | +250 | Zugabe bei Gehrung |
| Naht | +15 | Nahtzugabe |
| Nichts | (V13 leer) | von `IFERROR` als 0 gefangen |

### 64.2 Drei Abweichungen zwischen Auftragstext und Excel

Abschnitt 9 des Auftrags nennt eine vorläufige Werteliste und verlangt
ausdrücklich, sie vor der Umsetzung gegen die Excel zu prüfen. Dabei
zeigten sich drei Punkte – massgeblich ist jeweils die Excel:

1. **„Naht 15 mm" ist kein Zusatzmass.** Die Excel führt Naht +15
   ausschliesslich als **Ansetztyp** (V12), nicht in der Zusatzmass-
   Tabelle R8:R13. Wäre Naht dort mitgezählt worden, ergäbe die Summe
   525 statt 510 und **jede** Abwicklung wäre um 15 mm zu gross.
2. **Umschlag und Keil kommen je zweimal vor.** Die Auftragsliste nennt
   beide einmal; in der Excel stehen Umschlag 15 in R8 **und** R13 und
   Keil 40 in R10 **und** R11. Nur mit je zwei Einträgen kommt die
   Summe 510 zustande (15+150+40+40+250+15).
3. **Die Reihenfolge R8..R13 ist zugleich der Profilverlauf.** Die
   beiden Keil-Zeilen (R10/R11) stehen genau dort, wo A/B/C liegen.
   Daraus ergibt sich der Verlauf
   `Umschlag – Anschl. Flachdach – Keil – A – B – C – Keil – Anschl.
   Unterdach – Umschlag`. Das ist die Grundlage der Skizze; für die
   Rechnung selbst ist die Reihenfolge ohne Bedeutung (reine Addition).

### 64.3 Fix, dynamisch und „Rest"

| Auftrag | Umsetzung |
|---|---|
| 40 mm Kante links | `keil_links` (Excel R10) |
| 40 mm Kante rechts | `keil_rechts` (Excel R11) |
| 150 mm Dachanschluss | `anschluss_flachdach` (Excel R9) |
| A, B, C | je Stück und je Seite erfasst |
| Rest | `umschlag_flachdach + anschluss_unterdach + umschlag_unterdach` = 15+250+15 = **280** |

„Rest" ist **nirgends als Zahl hart codiert**, sondern wird immer aus
`RINNE_REST_TEILE` über dieselbe Wertetabelle gebildet – ebenso die
Summe 510. Der Prüfstand kontrolliert das ausdrücklich: die Zahlen
`510` und `280` kommen im Code gar nicht vor, `150` genau einmal (in
der Standardtabelle), `40` genau zweimal.

### 64.4 Verkettung

`rinneNeuesStueck()` übernimmt beim **Anlegen** eines neuen Stücks
A/B/C der rechten Seite des letzten Stücks als linke Seite. Danach ist
der Wert eine gewöhnliche, frei änderbare Eingabe. Es gibt keinerlei
Rückkopplung: eine spätere Änderung an Stück 1 lässt Stück 2 und 3
unberührt.

Das entspricht auch der Excel: nur die Zeilen 8 und 9 tragen noch die
Formel `=E7` usw.; ab Zeile 10 sind es getippte Werte, und in vier
Fällen weicht der übernommene Wert bewusst ab – `C36` trägt sogar die
Formel `=F35+5`. Die Verkettung ist dort also ebenfalls eine Vorgabe,
die überschrieben werden darf.

### 64.5 Einstellungen ändern nichts rückwirkend

Zusatzmasse und Ansetztypen liegen zentral in den Einstellungen
(Massaufnahmen → „Rinne – Zusatzmasse & Ansetztypen"), pro Gerät im
`localStorage` – dasselbe Muster wie Anschlussblech und Einfassung Rund.

Beim Speichern legt `buildMeasurementFromForm()` eine **Momentaufnahme**
der gerade gültigen Werte mit in `measurements.data` ab (`data.zusatz`,
`data.ansetz`). Beim Öffnen rechnet die App mit dieser Kopie, nicht mit
den aktuellen Einstellungen. Eine spätere Änderung in den Einstellungen
verändert deshalb kein gespeichertes Rinnenstück – im Prüfstand
ausdrücklich nachgewiesen (Abschnitt 7 von `rinne56`).

### 64.6 Datenstruktur – keine Migration

`measurements.data` ist `jsonb NOT NULL` (direkt am Schema geprüft) und
`measurements.type` hat **keine CHECK-Constraint** (nur vier
Fremdschlüssel/Primärschlüssel). Ein neuer Typ und eine neue
Datenstruktur brauchen deshalb **weder eine neue Tabelle noch eine neue
Spalte noch eine Migration**.

```
data = {
  zusatz: {umschlag_flachdach, anschluss_flachdach, keil_links,
           keil_rechts, anschluss_unterdach, umschlag_unterdach},
  ansetz: {dila, boden, ablauf, gehrung, naht, nichts},
  zusatzSumme, rest, material,
  stuecke: [{links:{a,b,c}, rechts:{a,b,c}, laenge,
             ansetzL, ansetzR,
             abwicklungLinks, abwicklungRechts, zuschnitt}]
}
```

Die Ergebnisse werden mitgespeichert, damit ein später gedrucktes PDF
unverändert bleibt – gleiches Vorgehen wie bei Anschlussblech,
Einfassung Rund und Kehle.

Tenant-Trennung, RLS, Ersteller-/Bearbeiter-Trigger (v2.28) und das
Audit-Log (v2.30) gelten unverändert und ohne eine Zeile neuen Code:
in der rollbacked SQL-Probe wurde `created_by` korrekt aus `auth.uid()`
gesetzt und ein `created`-Eintrag im `audit_log` geschrieben.

### 64.7 SVG-Skizze

`rinneSvg()` zeichnet den Profilschnitt aus `RINNE_PROFIL` – einer
einzigen Tabelle, die je Segment Quelle (fix/dynamisch), Knickwinkel und
die Seite der Beschriftung festlegt. Die Skizze **rechnet nichts**, sie
stellt nur die Eingaben dar.

- gleicher Massstab in x und y → keine Verzerrung
- die viewBox wird **nach** dem Zeichnen exakt um alles Gezeichnete
  gelegt, einschliesslich der geschätzten Textkästen jeder Beschriftung.
  Ohne das liefen die beiden Umschlag-Fahnen aus dem Bild – im visuellen
  PDF-Prüfstand tatsächlich gemessen und dort behoben.
- Beschriftungen zeigen nach aussen. Für den Boden B ist das die
  Gegenseite (`seite: -1`), sonst zeigte die Beschriftung in die Wanne.
- Die zwei Umschlag-Fahnen zeigen nach unten aussen, weil ihre
  Nachbarsegmente nach oben beschriftet sind – sonst überdeckten sich
  die Texte.
- Fusszeile mit Rest und Abwicklungsformel bekommt eigenen Platz unter
  der Zeichnung.
- Alle Sonderfälle liefern eine gültige SVG ohne `NaN`/`Infinity`:
  leere Felder, Text statt Zahl, `NaN`, `±Infinity`, 0, negative Werte,
  sehr grosse und sehr kleine Profile.

### 64.8 PDF

Verwendet den **zentralen** Kopf `pdfKopfHtml()` und die bestehenden
Drucktabellen aus v2.53/v2.54 – **kein eigener Kopf**. Ausgegeben
werden Adresse/Projekt, Dokumenttyp Massaufnahme · Rinne,
Bearbeiter/Datum, die Angaben (Material, Zusatzmasse-Summe,
Dachanschluss, Keil links/rechts, Rest, Stückzahl), die Profilskizze,
die vollständige Stückliste mit Abwicklung links/rechts und
Zuschnittlänge, die Gesamtsumme und die Notiz.

Gerechnet wird beim Druck ausschliesslich mit den **im Datensatz
gespeicherten** Werten.

### 64.9 Tests

**`rinne56` – 317/317** (Excel gegen JavaScript):
- alle sechs Zusatzmasse und alle sechs Ansetztypen gegen die Excel,
  Summe 510, Dropdown-Reihenfolge, Rest 280
- **alle 35 Datenzeilen** der Excel: Abw. L, Abw. R und Zuschnittlänge,
  Toleranz 1e-9 (rein technische Floating-Point-Toleranz)
- alle 36 Kombinationen der sechs Ansetztypen links × rechts
- Standardfall, kurze Rinne (500 mm), lange Rinne (12 000 mm),
  unterschiedliche A/B/C, alle Masse 0, leere Felder, Text statt Zahl,
  negativer Zuschnitt, unbekannter Ansetztyp (`IFERROR` → 0)
- geänderte Einstellungen, teilweise gesetzte Werte (Rückfall auf den
  Excel-Standard)
- Verkettung: Stück 1 → 2 → 3, Übernahme editierbar, Änderung an Stück 1
  verändert Stück 2 und 3 **nicht**
- gespeicherte Stücke bleiben von Einstellungsänderungen unberührt
- neun SVG-Fälle inkl. NaN/Infinity/negativ/sehr gross
- Integration (Katalog, Knopf, Option, Formular, Einstellungen, Script,
  Service Worker, Version, alle fünf Stellen in js/16 und js/10)
- Kontrolle, dass 510/280/150/40 nicht mehrfach hart codiert sind

**Gegenprobe:** mit einem absichtlich um 1 mm verfälschten Ablauf-Wert
meldet der Prüfstand 15 Fehlschläge – er kann also wirklich fehlschlagen.

**`breite56` – 40/40** (echtes Chromium, fünf Gerätebreiten 320/360/412/
768/1280 px): nichts läuft seitlich hinaus, Seite und Modal scrollen
nicht horizontal, die Skizze passt in die Breite, kein NaN, und die
angezeigten Zuschnitt-/Abwicklungswerte stimmen mit der Excel überein.

**`pdf52` – 460/460** (vorher 416/416): zwei neue Rinnen-Dokumente
(sieben Stücke und ein Stück) werden wirklich als PDF gerendert; geprüft
werden Kopfgleichheit, Typografie, Umbruchregeln, kein NaN, kein
Bildschirm-UI und dass nichts über die Druckbreite läuft.

**Datenbank** (Wegwerf-Firma, `begin; … rollback;`): Rinnen-Datensatz
gespeichert, `created_by` aus `auth.uid()`, `audit_log`-Eintrag
`created`, Verkettung im gespeicherten JSON nachweisbar, Werte 976 und
1280 unverändert – und mit den vier echten Projekt-IDs der
PETER KÜNZI AG als fremde Firma **je 0 Zeilen** sichtbar.

**Regression** – alle bestehenden Prüfstände grün: nav, suche40,
treffer40, recent41, stand42, dateien43, ui39, adresse45 39/39,
kopf45 8/8, suche45 13/13, status46 35/35, projekte47 37/37,
auswahl48 32/32, dateien49 38/38, medien50 42/42, hidden51 7/7,
kehle52 698/698, kehleintegration52 76/76, breite52 52/52,
pfade55 37/37, pdf52 460/460.

Zwei Prüfstände hatten eine **fachlich überholte Erwartung** („genau
zehn Massaufnahme-Arten") und wurden auf elf angepasst – das ist keine
Regression, sondern der Zweck dieser Version.

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>`/`</div>` in `index.html` ausgeglichen (701/701, vorher 672/672),
keine doppelten Element-IDs.

**Live-Klicktest im Browser gegen Supabase war nicht möglich** – die
Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Geprüft sind die Rechenlogik gegen die echten
Excel-Werte, Formular und Skizze live in echtem Chromium, die
PDF-Ausgabe als wirklich gerendertes PDF und die Datenbankseite als
RLS-/Trigger-Simulation gegen das echte Produktivschema.

### 64.10 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/26-rinne.js` | **neu** – Konstanten, Einstellungen, Berechnung, SVG, Stückliste, Formular |
| `index.html` | Auswahlknopf, `<option>`, Formularblock, Einstellungsblock, Script-Tag, Version 2.56 |
| `js/16-massaufnahme-formular.js` | **+77 Zeilen, 0 gelöscht** – Sektion, Render, Payload, Pflichtprüfung, Druckzweig |
| `js/10-massaufnahme.js` | **+4 Zeilen, 0 gelöscht** – zurücksetzen und füllen |
| `js/01-basis.js` | eine Zeile: `rinne:"Rinne"` im Typkatalog |
| `css/01-basis.css` | Stile der Stückliste (mit ausdrücklichem `min-width`, siehe Abschnitt 60.5) |
| `sw.js` | Cache-Version 2.56, neue Datei im SHELL |

**Nicht angefasst** (per `git diff` einzeln bestätigt): `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `css/03-druck.css` (Regierapport), sowie
`js/11`–`js/15`, `js/17`, `js/19`–`js/21`, `js/25` und alle übrigen
Fach-, Login-, Rechte-, Cockpit-, Such-, Verlaufs- und
System-Admin-Dateien. Keine Berechnung, keine Stückliste, kein
Zuschnitt, keine Abwicklung, kein Speicher-Payload und keine
PDF-/Drucklogik einer bestehenden Art berührt.

### 64.11 PETER KÜNZI AG

Vor und nach allen Tests identisch: 2 Firmen, 13 Profile, 4 Projekte,
15 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Projektdatei, 10
`audit_log`-Zeilen, `companies.updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`), Mike Ledermann wieder in seiner
echten Firma, keine Wegwerf-Firma und kein Testdatensatz übrig. Alle
schreibenden Tests liefen in `begin; … rollback;`.

**Beobachtung ausserhalb dieser Aufgabe** (nur dokumentiert, nicht
verursacht): seit der letzten Runde sind aus 13 Massaufnahmen 15 und aus
4 `audit_log`-Zeilen 10 geworden – reale Nutzung der App durch den
Betreiber. Nicht angetastet.

### 64.12 Offene Punkte

- Kein Live-Klicktest im Browser gegen Supabase möglich (siehe 64.9).
- **Der Profilverlauf der Skizze** (Reihenfolge und Knickwinkel) folgt
  der Zeilenreihenfolge R8..R13 der Excel und der Beschreibung im
  Auftrag. Die Excel selbst enthält **keine Winkel und keine Geometrie**
  – nur die sechs additiven Werte. Die Zuordnung „A = hintere
  Aufkantung, B = Boden, C = vordere Aufkantung" ist deshalb eine
  Darstellungsannahme aus den Wertebereichen der Excel (B ist durchweg
  der grösste Wert) und beeinflusst **keine** Berechnung.
- Die Spalten `H`, `J` und `P` der Excel (Wahr/Falsch-Schalter) speisen
  ausschliesslich einen Zählblock `S18:S23`, der nur die Zeilen 7–35 von
  41 erfasst und dessen Zellen `S20:S23` gar keine Formel mehr tragen
  (eingefrorene Werte). Der Block ist in sich unstimmig und wurde
  bewusst **nicht** übernommen. Stattdessen zählt die App die tatsächlich
  verwendeten Ansetztypen über **alle** erfassten Stücke und zeigt das
  als Zusammenfassung an.
- Kein Detail-Diff der Rinnenstücke im Änderungsverlauf – wie bei den
  Array-Strukturen der übrigen Arten (Klasse C, siehe 42.2). Ein
  `updated`-Eintrag entsteht, aber ohne Feldvergleich innerhalb der
  Stückliste.
- Aus v2.55 weiterhin offen: der Leerraum in den viewBox-Ausgaben der
  **bestehenden** Zeichenfunktionen (Abschnitt 63.6). Die neue
  Rinnen-Skizze ist davon nicht betroffen, sie schneidet ihre viewBox
  selbst zu.

## 65. RINNE – FREI DEFINIERBARES PROFIL — VERSION 2.57

Das Rinnenprofil war in v2.56 eine feste Tabelle mit neun Segmenten. Es
ist jetzt vollständig frei definierbar – wie beim Freien Profil. **Keine
Schemaänderung, keine Migration, keine RLS-/Storage-Änderung**, und keine
Zeile an einer der zehn übrigen Massaufnahme-Berechnungen.

### 65.1 Modell

Jedes Profilsegment hat:

| Feld | Bedeutung |
|---|---|
| `name` | freie Bezeichnung, z. B. „Anschl. Flachdach" |
| `art` | `fix` (bei jedem Rinnenstück gleich) oder `var` (variabel) |
| `laenge` | nur bei `fix` – die feste Länge in mm |
| `winkel` | Richtungsänderung gegenüber dem vorherigen Segment in Grad; **dieselbe Bedeutung wie beim Freien Profil**, 180° = Umschlag |

Variable Segmente bekommen ihren Buchstaben **automatisch aus ihrer
Position**: das erste heisst A, das zweite B usw. (über Z hinaus AA, AB
…). Die Stückliste zeigt exakt so viele Spalten, wie das Profil variable
Masse hat – nicht mehr und nicht weniger.

### 65.2 Verallgemeinerte Formeln

```
Abw. L    = Summe der variablen Masse links  + Summe aller Fixmasse
Abw. R    = Summe der variablen Masse rechts + Summe aller Fixmasse
Zuschnitt = Länge M/M + Ansetzen L + Ansetzen R
```

Das ist die direkte Verallgemeinerung der Excel: dort war die „Summe
aller Fixmasse" die Konstante `$R$14` = 510 und es gab genau drei
variable Masse A/B/C. Mit dem mitgelieferten **Standardprofil** ergibt
sich exakt dieselbe Rechnung, und der Prüfstand `rinne57` rechnet
weiterhin **alle 35 Datenzeilen** der Vorlage dagegen – 105 Werte, keine
Abweichung.

Das Standardprofil (Fixmasse in Klammern):

```
Umschlag (15) – Anschl. Flachdach (150) – Keil (40) –
A Aufkantung hinten – B Boden – C Aufkantung vorne –
Keil (40) – Anschl. Unterdach (250) – Umschlag (15)
                                        Fixmasse gesamt 510 mm
```

**Der Winkel beeinflusst die Rechnung nicht** – er bestimmt
ausschliesslich die Zeichnung. Im Prüfstand ausdrücklich abgesichert.

### 65.3 Wegfall von „Rest"

Der Begriff „Rest" aus v2.56 (Summe minus die drei benannten Fixmasse)
ergibt bei einem frei definierbaren Profil keinen Sinn mehr und ist
entfallen. An seine Stelle tritt **Fixmasse gesamt** – die Summe aller
als `fix` markierten Segmente. Angezeigt wird sie über der Profiltabelle,
in der Skizzen-Fusszeile und im PDF.

### 65.4 Was das Formular kann

- Segment hinzufügen, nach oben/unten verschieben, löschen (mit
  Rückfrage; Abbrechen löscht nichts – eigens getestet)
- Bezeichnung frei eintippen
- zwischen `fix` und `variabel` umschalten. Beim Umschalten auf
  `variabel` verschwindet das Längenfeld (die Länge kommt dann je Stück),
  die Buchstaben werden neu vergeben und die Stückliste bekommt sofort
  eine Spalte mehr bzw. weniger.
- Winkel frei eintippen, dazu die beiden Knöpfe aus dem Freien Profil:
  🔄 kehrt den Winkel um, 180° macht das Segment zum Umschlag
- „Standardprofil" setzt auf das Profil der Excel-Vorlage zurück
- „Als Vorgabe speichern" macht das aktuelle Profil zur Vorgabe für neue
  Rinnen-Massaufnahmen (nur auf diesem Gerät)

Ändert sich die Anzahl variabler Masse, werden die bereits erfassten
Rinnenstücke angepasst: vorhandene Werte bleiben stehen, fehlende werden
leer ergänzt, überzählige entfallen.

### 65.5 Datenstruktur – weiterhin keine Migration

`measurements.data` ist `jsonb NOT NULL`, `measurements.type` hat keine
CHECK-Constraint (beides erneut direkt am Schema geprüft). Es braucht
weiterhin **keine neue Tabelle, keine neue Spalte, keine Migration**.

```
data = {
  profil:  [ {name, art:"fix"|"var", laenge, winkel} ],
  ansetz:  {dila, boden, ablauf, gehrung, naht, nichts},
  fixSumme, varMasse: [{buchstabe, name}],
  material,
  stuecke: [ {links:[…], rechts:[…], laenge, ansetzL, ansetzR,
              abwicklungLinks, abwicklungRechts, zuschnitt} ]
}
```

`links`/`rechts` sind jetzt **Arrays** in der Reihenfolge der variablen
Masse (vorher feste Objekte `{a,b,c}`).

**Gespeicherte v2.56-Daten werden beim Öffnen automatisch übernommen**:
eine alte `zusatz`-Tabelle wird auf das entsprechende Standardprofil
abgebildet, alte `{a,b,c}`-Objekte auf ein dreielementiges Array. Im
Prüfstand nachgewiesen: ein v2.56-Datensatz liefert danach weiterhin
exakt 976 / 1006 / 1280. Es wird nichts umgeschrieben – die Umsetzung
geschieht beim Lesen.

### 65.6 Ein leeres Profil bleibt leer

Beim ersten Entwurf fiel ein **ausdrücklich geleertes** Profil still auf
das Standardprofil zurück – die App hätte also etwas gezeichnet und
gerechnet, was der Benutzer gerade gelöscht hatte. Der Prüfstand hat das
aufgedeckt. Jetzt gilt: nur ein **fehlendes** Profil (alte Datensätze)
fällt auf den Standard zurück, ein leeres bleibt leer, die Skizze sagt
„Noch kein Profil definiert", und das Speichern verlangt mindestens ein
Segment.

### 65.7 Skizze

Wird vollständig aus dem definierten Profil erzeugt. Gleicher Massstab
in x und y (keine Verzerrung), die viewBox wird nach dem Zeichnen exakt
um alles Gezeichnete gelegt (einschliesslich der geschätzten Textkästen).
Segmente mit 180° werden – wie beim Freien Profil – leicht parallel
versetzt gezeichnet, sonst lägen sie unsichtbar auf dem Nachbarsegment.
Fixmasse werden mit Bezeichnung und Wert beschriftet, variable Masse mit
ihrem Buchstaben und ihrer Bezeichnung in der Blechfarbe.

Zwei Darstellungsfehler wurden dabei **gemessen und behoben**, nicht
vermutet: `display:flex` auf einem `<td>` sprengte das Tabellenlayout
(die Winkel-Knöpfe liefen in die Nachbarspalte), und der Führungsstrich
einer Fahne lief mitten durch ihre eigene Beschriftung.

### 65.8 PDF

Weiterhin über den zentralen Kopf `pdfKopfHtml()`, kein eigener Kopf. Neu
enthält das PDF eine **Profiltabelle** (Nr./Buchstabe, Bezeichnung, Art,
Länge, Winkel); die Stückliste zeigt die variablen Masse als
„A / B / C"-Spalte in der Reihenfolge des Profils.

### 65.9 Tests

**`rinne57` – 340/340** (Gegenprobe: mit einem um 1 mm verfälschten
Fixmass meldet er 95 Fehlschläge):
- Standardprofil gegen die Excel-Zusatzmasse (Multiset, Summe, drei
  variable Masse A/B/C)
- **alle 35 Datenzeilen** der Vorlage, Toleranz 1e-9
- alle 36 Kombinationen der sechs Ansetztypen
- Grenzwerte (0, leer, Text, NaN, Infinity, negativ, unbekannter Typ)
- freies Profil: nur fix, ein variables Mass, fünf variable Masse A–E,
  Buchstaben über Z hinaus, Umschalten fix↔variabel, geänderte
  Fixlängen, leeres Profil
- Winkel: Geometrie folgt dem Winkel, 180° und −180° werden als Umschlag
  erkannt, **der Winkel ändert die Rechnung nicht**
- Verkettung (auch bei anderer Anzahl variabler Masse)
- Stückliste passt sich dem Profil an, Werte bleiben erhalten
- v2.56-Altformat
- gespeicherte Stücke bleiben von geänderten Vorgaben unberührt
- elf SVG-Fälle
- Integration und Kontrolle gegen mehrfach hart codierte Werte

**`breite57` – 58/58** (echtes Chromium, live bedient): Standardprofil,
Umschalten auf variabel (Spaltenzahl und Abwicklung folgen sofort),
Winkel ändern / 180° / Flip, Segment hinzufügen/verschieben/löschen,
Abbrechen löscht nichts, Profil ganz ohne variable Masse, fünf
Gerätebreiten 320–1280 px ohne seitlichen Überlauf.
Dabei aufgefallen: Playwright verwirft `confirm()`-Dialoge automatisch –
ohne Dialog-Behandlung sah es aus wie ein Löschfehler, war aber ein
Prüfstand-Artefakt.

**`pdf52` – 504/504** (vorher 460/460): vier Rinnen-Dokumente, darunter
eines mit frei definiertem Profil und eines ganz ohne variable Masse.

**Datenbank** (Wegwerf-Firma, `begin … rollback`): Datensatz mit eigenem
Profil gespeichert, vier Segmente, ein variables Mass, Winkel −90 und
Art `var` korrekt abgelegt, `created_by` aus `auth.uid()`,
`audit_log`-Eintrag `created`, Cross-Tenant je 0 Zeilen.

**Regression**: alle bestehenden Prüfstände grün (adresse45 39/39,
kopf45 8/8, suche45 13/13, status46 35/35, projekte47 37/37,
auswahl48 32/32, dateien49 38/38, medien50 42/42, hidden51 7/7,
kehle52 698/698, kehleintegration52 76/76, breite52 52/52,
pfade55 37/37, nav, suche40, treffer40, recent41, stand42, dateien43,
ui39). `node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` ausgeglichen (697/697), keine doppelten IDs.

**Live-Klicktest gegen Supabase war nicht möglich** – die Sandbox
blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird hier ausdrücklich nicht
als getestet behauptet.** Formular und Skizze wurden live in echtem
Chromium bedient, die PDF-Ausgabe wirklich gerendert, die Datenbankseite
als RLS-/Trigger-Simulation gegen das echte Produktivschema geprüft.

### 65.10 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/26-rinne.js` | vollständig überarbeitet: freies Profil, dynamische Buchstaben, dynamische Stückliste, neue Skizze |
| `index.html` | Profil-Editor im Formular, dynamischer Tabellenkopf, Einstellungsblock, Version 2.57 |
| `js/16-massaufnahme-formular.js` | Payload speichert das Profil; Pflichtprüfung; Druckzweig um die Profiltabelle erweitert |
| `css/01-basis.css` | Stile für Profil- und Stücktabelle (`table-layout:auto`, ausdrückliches `min-width`) |
| `sw.js` | Cache-Version 2.57 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport) sowie `js/10`, `js/11`–`js/15`,
`js/17`, `js/19`–`js/21`, `js/25` und alle übrigen Dateien – per
`git diff` bestätigt.

### 65.11 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (siehe 65.9).
- Die Zuordnung der Buchstaben folgt der Reihenfolge im Profil. Wird ein
  Segment verschoben, ändern sich dadurch die Buchstaben der variablen
  Masse – die bereits erfassten Werte bleiben aber an ihrer Position in
  der Liste stehen und wandern nicht mit. Das ist bewusst so: die App
  kann nicht wissen, ob eine Verschiebung eine Umbenennung oder eine
  echte Umstellung sein soll.
- Kein Detail-Diff der Rinnenstücke im Änderungsverlauf (unverändert
  gegenüber v2.56).
- Die Skizze zeichnet variable Segmente ohne erfasstes Mass mit einem
  neutralen Beispielwert, damit das Profil auch vor der ersten Eingabe
  erkennbar ist. Sobald ein Stück Werte hat, wird mit diesen gezeichnet.

## 66. RINNE – ZWEI BEDIENFEHLER BEHOBEN + NEUES STANDARDPROFIL — VERSION 2.58

Zwei vom Betreiber gemeldete Fehler aus v2.57 und das Standardprofil nach
seiner Vorlage. **Keine Schemaänderung, keine Migration.**

### 66.1 Die zwei Fehler – eine gemeinsame Ursache

Gemeldet wurde: „kann fix und variabel nicht ändern" und „die
Eingabefelder verlieren den Fokus nach erster Eingabe".

Beides kam aus **derselben Zeile** im `input`-Handler der Profiltabelle:

```js
if ($("rp_profilInfo")) renderRinneProfilTabelle();   // bei JEDEM input
```

`renderRinneProfilTabelle()` setzt `rp_profilBody.innerHTML` neu. Damit:

- **Fokusverlust**: nach dem ersten Zeichen wird das gerade bearbeitete
  Eingabefeld durch ein neues ersetzt – Fokus und Cursor sind weg, es
  bleibt genau ein Zeichen stehen.
- **fix/variabel nicht änderbar**: ein `<select>` feuert erst `input`,
  dann `change`. Der `input`-Handler zeichnete die Tabelle neu und ersetzte
  dabei das Auswahlfeld durch ein neues mit dem **alten** Wert; das
  anschliessende `change` erreichte den delegierten Handler nicht mehr,
  weil das ursprüngliche Element nicht mehr im Dokument hing.

**Behoben**: Die Info-Zeile ist als eigene Funktion
`renderRinneProfilInfo()` herausgelöst. Der `input`-Handler zeichnet die
Profiltabelle **nie** neu, sondern nur die Info-Zeile, die Skizze und –
bei einer Längenänderung – die Stückliste. `art` wird im `input`-Handler
ausdrücklich übersprungen und allein im `change`-Handler behandelt.

### 66.2 Warum die Prüfstände das nicht gefunden hatten

Der v2.57-Prüfstand setzte Werte **synthetisch**:

```js
w.value="120"; w.dispatchEvent(new Event("input"));       // ein Ereignis
sel.value="var"; sel.dispatchEvent(new Event("change"));  // ohne input
```

Ein einzelnes Ereignis kann keinen Fokusverlust zeigen, und ein `change`
ohne vorangehendes `input` umgeht den fehlerhaften Pfad vollständig.

Der Prüfstand `breite57` bedient das Formular jetzt **wie ein Mensch**:
`page.selectOption()` (feuert input **und** change) und `keyboard.type()`
Zeichen für Zeichen. Geprüft wird zusätzlich, dass das Feld den Fokus
behält und der vollständige Text ankommt – für Länge, Winkel,
Bezeichnung und die Masse in der Stückliste.

**Gegenprobe**: mit wieder eingebautem Fehler meldet der Prüfstand 17
Fehlschläge, darunter „Länge vollständig getippt [1]" und „Auswahl bleibt
auf 'variabel' stehen [fix]" – also exakt die beiden gemeldeten Symptome.

### 66.3 Neues Standardprofil nach der Vorlage des Betreibers

Aus der Handskizze übernommen, gelesen vom rechten Ende her, damit die
variablen Masse in der Reihenfolge der Vorlage A – B – C heissen:

| Nr. | Bezeichnung | Art | Länge | Winkel |
|---|---|---|---|---|
| 1 | Umschlag | fix | 15 mm | 0° |
| 2 | Anschl. Flachdach | fix | 150 mm | 180° |
| A | *(leer)* | variabel | je Stück | 70° |
| 4 | Keil | fix | 40 mm | −25° |
| B | *(leer)* | variabel | je Stück | −45° |
| 6 | Keil | fix | 40 mm | −45° |
| C | *(leer)* | variabel | je Stück | −45° |
| 8 | Rest | fix | 200 mm | 56° |
| 9 | Umschlag | fix | 15 mm | 180° |

**Fixmasse gesamt: 460 mm.**

Die Winkel ergeben genau die Geometrie der Vorlage: Anschl. Flachdach
waagerecht, A fällt mit 70° steil ab, beide Keil sind 45°-Faschen, B
waagerecht, C senkrecht, der Rest steigt mit 34° an. Im Prüfstand gegen
die Richtungsfolge `0/180/250/225/180/135/90/146/326` abgesichert.

**Wichtig – die Abwicklung ändert sich gegenüber der Excel:** die Excel
rechnet mit 510 mm Fixmass (Anschl. Unterdach 250 statt Rest 200), die
Vorlage mit 460 mm. Dieselben Masse ergeben deshalb eine um 50 mm
kleinere Abwicklung (Beispiel A=127/B=192/C=202: **981 mm** statt
1031 mm). Das ist die Folge der Vorlage, kein Rechenfehler – die
Zuschnittlänge bleibt unberührt.

Drei Stellen, an denen die Vorlage nichts hergibt, sind offen gelassen
statt geraten:
- die beiden **Umschläge** sind nicht bemasst → 15 mm aus der Excel
- **A/B/C** sind nicht benannt → Bezeichnungen bleiben leer
- **„Rest (Max 200)"** ist eine Obergrenze, kein rechenbarer Wert → das
  Segment heisst „Rest" und ist mit 200 mm vorbelegt

Alles davon ist im Formular frei änderbar.

### 66.4 Der Excel-Vergleich bleibt vollständig erhalten

Der Prüfstand baut das Vergleichsprofil jetzt **aus der Excel selbst**
(die sechs Fixmasse aus R8..R13 plus drei variable Masse), nicht mehr aus
einer Konstante der App. Damit hängt der Excel-Test an den echten Werten
der Vorlage und bleibt gültig, obwohl das ausgelieferte Standardprofil
ein anderes ist. **Alle 35 Datenzeilen stimmen weiterhin exakt.**

Gespeicherte v2.56-Daten werden weiterhin auf das **Excel**-Profil
abgebildet (nicht auf das neue Standardprofil), sonst würde sich ihre
Abwicklung nachträglich ändern. Die sechs Excel-Fixmasse stehen dafür als
eigene benannte Tabelle `RINNE_EXCEL_FIXMASSE` im Code.

### 66.5 Tests

- **`rinne57` 359/359** – Excel-Profil (alle 35 Zeilen), neues
  Standardprofil (Segmente, Fixmasse 460, Bezeichnungen, Richtungsfolge,
  gezeichnete Längen, Beispielrechnung 981/1280), freies Profil, Winkel,
  Verkettung, Altformat, SVG, Integration
- **`breite57` 77/77** – echtes Chromium, echtes Tippen und echte
  Auswahl (siehe 66.2), fünf Gerätebreiten
- **`pdf52` 504/504**
- volle Regression aller übrigen Prüfstände grün, `node --check`
  fehlerfrei, `<div>` 697/697, keine doppelten IDs
- Regierapport nicht im Diff

**Live-Klicktest gegen Supabase weiterhin nicht möglich** (Sandbox
blockiert HTTPS dorthin) – **das wird nicht als getestet behauptet.**

### 66.6 Geänderte Dateien

`js/26-rinne.js` (Handler, Standardprofil, `RINNE_EXCEL_FIXMASSE`,
`renderRinneProfilInfo`), `index.html` und `sw.js` (Version 2.58),
`CLAUDE.md`. Sonst nichts.

## 67. RINNE – UMSCHLAG UMKEHRBAR + RUNDE ECKEN — VERSION 2.59

Zwei gemeldete Punkte an der Profilskizze. **Nur `js/26-rinne.js`,
Versionstext und Cache-Version geändert** – keine Datenbank, kein
anderes Modul, `js/14-freies-profil.js` nur gelesen, nicht verändert.

### 67.1 Der Umkehren-Knopf wirkte beim Umschlag nicht

Ein Umschlag läuft geometrisch **exakt** auf dem vorherigen Segment
zurück. `+180°` und `−180°` sind deshalb dieselbe Linie – der
Umkehren-Knopf setzte zwar den Wert um, aber es war nichts zu sehen.

Gelöst über die **Zeichnung**: `rinneProfilPunkte()` merkt sich pro
Segment zusätzlich `seite = winkel < 0 ? −1 : +1`. Der parallele Versatz,
mit dem ein Umschlag sichtbar gemacht wird, klappt damit auf die andere
Seite. Die Rechnung bleibt unberührt – im Prüfstand ausdrücklich
abgesichert (`Umkehren ändert die Fixsumme nicht`, `Endpunkt identisch`).

Ergebnis: 🔄 am Umschlag klappt ihn auf die Gegenseite, nochmal drücken
führt zurück. Live im Browser geprüft (Prüfstand `breite57`, Block C2).

### 67.2 Runde Ecken wie beim Freien Profil

Die Skizze zeichnete jedes Segment als eigene gerade Linie. Jetzt
dasselbe Muster wie `generateProfilDiagramSvg()` im Freien Profil:

- zusammenhängende Abschnitte werden als **eine** Polyline mit
  abgerundeten Ecken gezeichnet
- Umschlag-Segmente bekommen eine eigene, leicht versetzte Linie mit
  einer **Kehre** (Halbkreis) um die Spitze

Dafür wird die **bestehende** Funktion `abgerundeterPfad()` aus
`js/14-freies-profil.js` benutzt – dieselbe Rundung wie dort, keine
zweite Implementierung. `js/14` wurde dabei **nicht** verändert (per
`git diff` bestätigt); der Aufruf ist mit
`typeof abgerundeterPfad === "function"` abgesichert und fällt sonst auf
gerade Linien zurück.

Der Prüfstand lädt für seine Tests die **echte** Funktion aus `js/14`
(Quelltext-Ausschnitt in den Kontext geladen), prüft also die
tatsächliche Zusammenarbeit und nicht einen Ersatz. Getestet wird: Bögen
im Pfad vorhanden, ein durchgehender Zug, und der Rückfallweg ohne die
Funktion liefert weiterhin eine gültige SVG ohne Bögen.

Zusätzlich stehen die Beschriftungen etwas weiter aussen
(`38 + (i % 2) * 26` statt `34 + (i % 2) * 20`), damit sie nicht mehr auf
der Profillinie liegen.

### 67.3 Tests

- **`rinne57` 373/373** (vorher 359) – neu: Bögen im Pfad, durchgehender
  Zug, Rückfallweg ohne `abgerundeterPfad`, `+180`/`−180` beide als
  Umschlag erkannt und auf verschiedene Seiten gezeichnet, Endpunkt und
  Fixsumme dabei identisch
- **`breite57` 84/84** (vorher 77) – neuer Block C2: Umschlag steht auf
  180, Umkehren setzt −180 **und ändert die Zeichnung sichtbar**,
  nochmal umkehren führt zurück, Rechnung unverändert (981), kein NaN,
  Ecken abgerundet
- **Gegenprobe**: mit fester Umschlagseite meldet `breite57`
  „Umkehren ändert die Zeichnung sichtbar" als Fehler
- `pdf52` 504/504, volle Regression aller übrigen Prüfstände grün
- `node --check` fehlerfrei, `<div>` 697/697
- Regierapport und `js/14-freies-profil.js` nicht im Diff

## 68. RINNE – ALLE BIEGUNGEN ABGERUNDET — VERSION 2.60

Nachtrag zu v2.59: die Ecken waren zwar bereits in einem gerundeten Pfad,
sichtbar gerundet war aber praktisch nichts. **Nur `js/26-rinne.js`,
Versionstext und Cache-Version geändert.**

### 68.1 Zwei Ursachen, beide gemessen

**(1) Der Biegeradius war viel zu klein.** Ich hatte `BIEGERADIUS = 5`
aus dem Freien Profil übernommen. Dort ist die Zeichnung rund 300 px
breit, die Rinnen-Skizze dagegen 680 px – 5 px sind darauf optisch nichts.
Jetzt `14`, also derselbe Anteil an der Bildbreite (5/300 ≈ 14/680).
`abgerundeterPfad()` begrenzt den Radius bei kurzen Segmenten ohnehin
selbst (`min(radius, len·0.45)`), grosse Werte sind also ungefährlich.

**(2) Beim 180°-Knick wurde das falsche Blech versetzt gezeichnet.**
Beim Nachmessen der erzeugten Pfade fiel auf: der Profilzug hatte nur
**fünf** Bögen statt sechs – die Ecke zwischen „Anschl. Flachdach" und A
fehlte. Grund: die Umschlag-Erkennung nahm immer das Segment, das den
180°-Winkel trägt. Im Standardprofil trägt aber das **150er Blech** den
180er und der eigentliche Umschlag ist das **15er Segment davor**. Also
wurde das lange Blech aus dem Profilzug herausgenommen und versetzt
gezeichnet – und seine Ecke zu A ging verloren.

Jetzt wird bei einem 180°-Knick das **kürzere der beiden Bleche**
versetzt gezeichnet, unabhängig davon, welches den Winkel trägt:

```js
const j = (!vor || seg.laenge <= vor.laenge) ? i : i - 1;
versetzt[j] = { richtung: seg.richtung, seite: seg.seite, knick: i };
```

Versatzrichtung und -seite kommen weiterhin vom 180°-Segment selbst, die
Kehre sitzt am Knickpunkt. Ergebnis: der Profilzug hat jetzt alle sechs
Innenecken, jede gerundet.

`GAP` von 9 auf 11 erhöht, damit der Umschlag etwas Luft hat.

### 68.2 Tests

Neu in `rinne57` (jetzt **377/377**, vorher 373), alle gegen die
tatsächlich erzeugten Pfade gemessen statt nur auf Vorhandensein geprüft:

- „jede Innenecke des Profilzugs ist gerundet" – Anzahl der Bögen im
  längsten Pfad muss der Anzahl Innenecken entsprechen (6)
- „Rundung ist sichtbar gross (Radius ≥ 10 px)" – die gemessenen Radien
  liegen bei 20–63 px
- „zwei Umschläge als eigene Kehre gezeichnet"
- „Kehren gehören zum kurzen Blech (nicht zum 150er)" – die versetzte
  Linie muss kurz sein

**Gegenproben** (beide reproduzieren den alten Zustand):
- `BIEGERADIUS` zurück auf 5 → „Rundung ist sichtbar gross" schlägt fehl
- immer das 180°-Segment versetzen → „jede Innenecke des Profilzugs ist
  gerundet" und „Kehren gehören zum kurzen Blech" schlagen fehl

`breite57` 84/84, `pdf52` 504/504, volle Regression grün, `node --check`
fehlerfrei, `<div>` 697/697. Regierapport und `js/14-freies-profil.js`
nicht im Diff.

## 69. RINNE – RUNDUNG ZURÜCKGENOMMEN + UMSCHLAG SAUBER — VERSION 2.61

Zwei Korrekturen an der Skizze aus v2.60. **Nur `js/26-rinne.js`,
Versionstext und Cache-Version geändert.**

### 69.1 Zu rund

`BIEGERADIUS` 14 → **7**. 14 liess aus einer Blechkantung eine weiche
Kurve werden – besonders sichtbar an der 70°-Ecke zwischen „Anschl.
Flachdach" und A. Gemessene Bogenradien jetzt 10/32/17/17/17/13 px statt
20/64/34/34/34/26.

Zum Vergleich: das Freie Profil verwendet 5 px auf rund 300 px Bildbreite
(≈ 1,7 %); 7 px auf 680 px sind ≈ 1,0 % – also bewusst zurückhaltender.

### 69.2 Der Umschlag verschmolz zu einem Balken

Der Versatz war mit 11 bzw. 9 px fest. Ein 15-mm-Umschlag ist im Bild
aber nur rund 13 px lang – ein fester Versatz ist dort entweder fast so
gross wie der Umschlag selbst (sieht wie ein Haken aus) oder, nach dem
Herunterrechnen auf 4,6 px, zu eng: bei 3,4 px Strichbreite bleiben dann
1,2 px Weiss und die beiden Lagen verschmelzen zu einem Balken.

Jetzt hängt der Versatz an der gezeichneten Umschlaglänge, mit beiden
Grenzen:

```js
const umschlagVersatz = laengePx =>
  Math.min(Math.max(7, Math.min(9, laengePx / 3)), Math.max(3, laengePx * 0.8));
```

- **Untergrenze 7 px**, damit zwischen den Lagen sichtbar Weiss bleibt
- **Obergrenze 80 % der Umschlaglänge**, damit die Kehre bei einem sehr
  kurzen Umschlag nicht breiter wird als er lang ist
- der Kehrenradius folgt automatisch (Versatz/2)

Der Wert 7 wurde nicht geraten: die Umschlag-Region wurde mit 4,6 / 6 /
7 / 8 px gerendert und verglichen.

### 69.3 Tests

`rinne57` jetzt **378/378**. Die Rundungsprüfung ist von einer reinen
Untergrenze auf ein **Band** umgestellt, damit sie beide Richtungen
fängt:

- „Rundung sichtbar, aber nicht zu weich (6 ≤ r ≤ 45 px)"
- „Umschlag-Kehre ist weit genug offen (≥ 3 px Radius)" (neu)

**Gegenproben** – jede reproduziert genau einen der beiden Fehler:
- Versatz zurück auf 4,6 px → „Umschlag-Kehre ist weit genug offen"
  schlägt fehl
- `BIEGERADIUS` auf 20 → „Rundung sichtbar, aber nicht zu weich" schlägt
  fehl

`breite57` 84/84, `pdf52` 504/504, volle Regression grün, `node --check`
fehlerfrei, `<div>` 697/697. Regierapport und `js/14-freies-profil.js`
nicht im Diff.

## 70. RINNE – UMSCHLAG-KEHRE WÖLBT NACH AUSSEN — VERSION 2.62

Gemeldet: „umschlag ist noch immer falsch", mit einer vergrösserten
Aufnahme des rechten Umschlags. **Nur `js/26-rinne.js` geändert** (sechs
Zeilen in der Zeichenfunktion) – keine Datenbank, keine Berechnung,
keine andere Datei.

### 70.1 Ursache

Ein Umschlag wird als zwei parallele Lagen mit einer halbkreisförmigen
Kehre am Ende gezeichnet. Welche Seite der Halbkreis wölbt, bestimmt in
SVG das `sweep`-Flag des `A`-Befehls. Die bisherige Formel bezog sich auf
das **Nachbarsegment** und lieferte dadurch für die beiden Umschläge des
Standardprofils **unterschiedliche** Ergebnisse:

```
rechts: M 610.0 242.8 A 3.5 3.5 0 0 0 610.0 249.8 L 596.7 249.8   ← sweep 0
links:  M  70.0  70.0 A 3.5 3.5 0 0 1  73.9  64.2 L  84.9  71.7   ← sweep 1
```

Grund: der Codeweg unterscheidet, ob das versetzt gezeichnete Blech
**vor** oder **nach** dem 180°-Knick liegt (seit v2.60 wird immer das
kürzere Blech versetzt). In beiden Fällen wurde derselbe Ausdruck auf
zwei verschiedene Nachbarsegmente angewandt – einmal traf er, einmal
nicht. Beim rechten Umschlag wölbte die Kehre dadurch **nach innen**,
zwischen die beiden Lagen hinein, und Bogen und Blech verschlangen sich
zu der vom Betreiber fotografierten S-Form.

### 70.2 Korrektur

Statt eines Nachbarschafts-Vergleichs jetzt eine ausdrückliche
geometrische Regel: die Kehre wölbt in Verlaufsrichtung des Blechs, das
**auf den Knickpunkt zuläuft** – also nach aussen, weg von den beiden
Lagen.

```js
const einlauf = vorDemKnick ? p.segmente[i] : p.segmente[i - 1];
const radE = (einlauf ? einlauf.richtung : seg.richtung + 180) * Math.PI / 180;
const ex = Math.cos(radE), ey = -Math.sin(radE);   // Bildkoordinaten: y nach unten
const gap = Math.hypot(u1[0] - sp[0], u1[1] - sp[1]) || 1;
const dx0 = (u1[0] - sp[0]) / gap, dy0 = (u1[1] - sp[1]) / gap;
// Bei sweep=1 liegt der Bogenscheitel auf der Seite (dy, -dx).
const sweep = (dy0 * ex - dx0 * ey) > 0 ? 1 : 0;
```

Beide Umschläge liefern jetzt `sweep 1` und zeichnen einen sauberen,
nach aussen gewölbten Falz. Vergrössert nachgesehen (beide Umschläge
nebeneinander, `viewBox` auf die jeweilige Region beschnitten): Blech
läuft ein, kehrt am äusseren Ende um 180°, liegt parallel zurück – keine
Überschneidung mehr.

**Die Rechnung ist nicht betroffen.** Der Umschlag ist ein gewöhnliches
Fixmass; `sweep` steuert ausschliesslich die Darstellung. Fixmasse 460,
Abwicklung und Zuschnittlänge unverändert (im Prüfstand abgesichert).

### 70.3 Warum es zweimal nicht auffiel

v2.59 und v2.60 haben am Umschlag gearbeitet, ohne die **Wölbrichtung**
zu prüfen – getestet wurden nur Radius, Öffnungsweite und die Zuordnung
zum kürzeren Blech. Diese Lücke ist jetzt geschlossen: `rinne57` prüft
die Richtung direkt am gezeichneten Pfad. Aus Startpunkt, Endpunkt,
Radius und `sweep` wird der Scheitel des Halbkreises berechnet; er muss
auf der **Gegenseite** der Laufrichtung des versetzten Blechs liegen:

```js
const s2 = sw ? 1 : -1;
const sx = cx + s2*r*dy, sy = cy - s2*r*dx;
return ((sx-cx)*(x3-x2) + (sy-cy)*(y3-y2)) < 0;
```

**Gegenprobe durchgeführt**: mit umgedrehtem `sweep` meldet der
Prüfstand „FEHLGESCHLAGEN: Kehre woelbt nach aussen (kein S)" und
378/379 – die Prüfung greift also wirklich und ist keine Zierde.

### 70.4 Tests

- **`rinne57` 379/379** (vorher 378) – neu: Wölbrichtung beider Kehren,
  mit Gegenprobe. Unverändert bestanden: alle 35 Excel-Datenzeilen,
  Standardprofil (Fixmasse 460, Richtungsfolge, Beispiel 981/1280),
  freies Profil, Winkel, Verkettung, v2.56-Altformat, Rundungsband
  6–45 px, Kehrenöffnung ≥ 3 px, Zuordnung zum kürzeren Blech.
- **`breite57` 84/84** – echtes Chromium, echtes Tippen/Auswählen,
  fünf Gerätebreiten, kein seitlicher Überlauf, kein NaN.
- **`pdf52` 504/504** – vier Rinnen-Dokumente wirklich als PDF gerendert.
- **Volle Regression grün**: nav 23/23, suche40 7/7, treffer40 7/7,
  recent41 12/12, stand42 17/17, dateien43 27/27, ui39 (9 Fälle),
  adresse45 39/39, kopf45 8/8, suche45 13/13, status46 35/35,
  projekte47 37/37, auswahl48 32/32, dateien49 38/38, medien50 42/42,
  hidden51 7/7, kehle52 698/698, kehleintegration52 76/76,
  breite52 52/52, pfade55 37/37.
- `node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
  `<div>` 697/697, keine doppelten Element-IDs.
- Regierapport (`js/06`, `js/08`, `css/03-druck.css`) und
  `js/14-freies-profil.js` nicht im Diff.

**Live-Klicktest gegen Supabase war weiterhin nicht möglich** – die
Sandbox blockiert ausgehende HTTPS-Verbindungen zu
`nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird ausdrücklich nicht als
getestet behauptet.** Die Skizze wurde in echtem Chromium gerendert und
vergrössert angesehen.

### 70.5 Geänderte Dateien

`js/26-rinne.js` (sechs Zeilen `sweep`-Berechnung), `index.html` und
`sw.js` (Version 2.62), `CLAUDE.md`. Sonst nichts.

## 71. FEEDBACK SORTIEREN + ALS EXCEL/TEXTDATEI HERUNTERLADEN — VERSION 2.63

Die Feedback-Liste im geschützten Einstellungsbereich lässt sich jetzt
nach fünf Kriterien sortieren und in der gewählten Reihenfolge als
`.xlsx` und `.txt` herunterladen. **Keine Schemaänderung, keine
Migration, keine RLS-/Storage-Änderung, keine Fachdatei angefasst.**

### 71.1 Bestandsaufnahme

`feedback` hat: `id`, `module`, `message`, `created_by`, `created_at`,
`resolved`, `company_id`. Real vorhanden sind 14 Meldungen (4 erledigt,
6 Module) – echte Nutzdaten, in dieser Runde ausschliesslich gelesen.

`renderFeedbackList()` lag bisher in `js/01-basis.js`, obwohl es
ausschliesslich Feedback betrifft; die Sortierung steckte fest in der
Abfrage (`.order("resolved").order("created_at")`) und war deshalb nicht
umstellbar. Es gab keinen Export.

Die Excel-Bibliothek **SheetJS (xlsx 0.18.5) ist bereits im Kopf von
`index.html` eingebunden** – sie wird seit langem für den Material-Import
gebraucht (`js/08-katalog-blitzschutz.js`). Für den Export kommt also
keine neue Abhängigkeit dazu, dieselbe Bibliothek schreibt jetzt auch.

### 71.2 Sortierung

Fünf Chips über der Liste, gleiche Optik wie die Verlauf-Filter (v2.31):

| Chip | Reihenfolge |
|---|---|
| Offen zuerst (Standard) | offen vor erledigt, darin neueste zuerst |
| Neueste zuerst | `created_at` absteigend |
| Älteste zuerst | `created_at` aufsteigend |
| Modul (A–Z) | Modulname, bei gleichem Modul neueste zuerst |
| Mitarbeiter (A–Z) | Name, bei gleichem Namen neueste zuerst |

Sortiert wird **clientseitig auf den bereits geladenen Zeilen** – wie
überall sonst in der App (Verlauf-Filter, Statusfilter, Projektsuche).
Ein Chip-Klick löst **keine** neue Abfrage aus; im Prüfstand
ausdrücklich gezählt. Die Sortierfunktionen ändern `feedbackCache` nicht
(`slice().sort(...)`).

Ein unbekannter Sortierwert fällt auf „Offen zuerst" zurück, statt eine
leere Liste zu zeigen. Namensvergleiche laufen über
`localeCompare(...,"de")`, damit Umlaute richtig einsortiert werden.

### 71.3 Downloads

Beide Downloads speisen sich aus **einer** Funktion
(`feedbackExportZeilen()`), damit Excel und Textdatei nie auseinander
laufen, und übernehmen die **gerade gewählte Sortierung**.

Spalten: `Nr.`, `Datum`, `Modul`, `Status`, `Mitarbeiter`, `Feedback`.

- **Excel** (`Feedback_JJJJ-MM-TT.xlsx`): echtes `.xlsx` über SheetJS,
  ein Blatt „Feedback", Kopfzeile, gesetzte Spaltenbreiten. Eine
  mehrzeilige Meldung bleibt in **einer** Zelle.
- **Textdatei** (`Feedback_JJJJ-MM-TT.txt`): Kopf mit Firmenname, Stand,
  Zählung und **genannter Sortierung**, danach ein lesbarer Block je
  Meldung. CRLF-Zeilenenden und BOM, damit die Datei auch im
  Windows-Editor mit Umlauten sauber aussieht.

`Status` steht auf Deutsch („Offen"/„Erledigt"), ein gelöschter
Mitarbeiter erscheint wie überall sonst als „Unbekannter Benutzer",
ein fehlendes oder unlesbares Datum als „–" statt `NaN`.

Fehlt SheetJS einmal (CDN nicht erreichbar), sagt die App das
verständlich und verweist auf den Textexport – statt eine kaputte Datei
zu erzeugen.

### 71.4 Leerer Zustand und Fehlerfall

Sortierleiste und Export-Leiste starten `hidden` und erscheinen erst,
wenn wirklich Feedback vorhanden ist. Schlägt das Laden fehl, bleiben
beide weg und die Fehlermeldung steht wie bisher in der Liste – es gibt
keinen Knopf, der dann eine leere Datei erzeugen würde.

### 71.5 Wiedergefundene Falle: `.bar` schlug `[hidden]`

`.bar{display:flex}` (`css/01-basis.css`) ist eine Autorenregel und
schlägt damit das `[hidden]{display:none}` des Browsers – exakt der
Fehler aus **Abschnitt 59**. Beide neuen Leisten tragen die Klasse
`bar`, wären also trotz `hidden` sichtbar geblieben. Ergänzt wurde
deshalb die **allgemeine** Regel

```css
.bar[hidden]{display:none}
```

die zugleich jede künftige versteckte Leiste schützt. Im echten Browser
gemessen: ohne die Regel meldet der Prüfstand
`{"hidden":true,"display":"flex","h":76}`, mit ihr `display:"none"`,
Höhe 0.

### 71.6 Sicherheit – unverändert

Die Abfrage filtert weiterhin **nirgends** selbst nach `company_id`; die
Firmengrenze erzwingt ausschliesslich die restriktive Policy
`tenant_boundary_feedback` (`company_id = my_company_id()`), darüber die
bestehenden Rollen-Policies (`is_admin()` / `has_permission('feedback',…)`).
Keine Policy, kein Grant und keine Funktion wurde angefasst.

Erneut empirisch bestätigt (`begin; … rollback;`, Wegwerf-Firma
`99999999-…`): ein Benutzer einer fremden Firma sieht über exakt die
Abfrage der Feedback-Liste **0 Zeilen**. Der Export kann folglich nur
enthalten, was RLS ohnehin herausgibt.

Der Export ist ein reiner Client-Download (`Blob` + `URL.createObjectURL`,
dasselbe Muster wie der bestehende CSV-Export der Regierapporte) – es
verlässt nichts das Gerät, es entsteht keine öffentliche URL.

### 71.7 Tests

**`feedback63` – 78/78** (echte Funktionen aus `js/02-feedback.js` in
einem vm-Kontext): alle fünf Sortierungen mit Zweitkriterium, „neu" und
„alt" exakt umgekehrt, Sortieren verändert die Daten nicht, Sortieren
löst keine zweite Abfrage aus, aktiver Chip markiert, Anzeige, leerer
Zustand, Fehlerfall, Excel-Aufbau (Kopfzeile, Zeilenzahl, Spaltenbreiten,
Reihenfolge, deutscher Status), Textaufbau (Kopf, Sortierung genannt,
CRLF, BOM, mehrzeilige Meldung), Dateinamen, fehlende Bibliothek,
fehlendes/unlesbares Datum, unbekannte Sortierung, Einbindung.

**`feedbackbrowser63` – 44/44** (echtes Chromium, **echte
SheetJS-Bibliothek** aus `node_modules` statt einer Attrappe): die
Chips werden wirklich geklickt und die Reihenfolge im DOM geprüft, beide
Downloads werden wirklich ausgelöst und gespeichert – die `.xlsx` wird
anschliessend **in Node wieder eingelesen** (17 496 Bytes, gültiges ZIP,
ein Blatt „Feedback", Umlaute unbeschädigt, mehrzeilige Meldung in einer
Zelle). Dazu: Sichtbarkeit als *computed style* gemessen, leerer
Zustand, Ladefehler, vier Gerätebreiten (320/390/768/1280 px) ohne
seitlichen Überlauf, keine JS-Fehler auf der Seite.

**Zwei Gegenproben durchgeführt** – beide reproduzieren einen echten
Fehler:
- Sortierung ignoriert die Auswahl → `feedback63` 71/78, sieben
  Fehlschläge (auch in den Export-Prüfungen).
- `.bar[hidden]` entfernt → `feedbackbrowser63` 41/44, die Leisten
  bleiben trotz `hidden` sichtbar.

**Volle Regression grün**: rinne57 379/379, breite57 84/84,
pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7, suche40 7/7,
treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 700/700, keine doppelten Element-IDs.

**Nebenbei behoben**: `rinne57` und `feedback63` prüften die
Versionsnummer als fest verdrahteten Text und schlugen deshalb bei jedem
Versionssprung an. Sie prüfen jetzt, dass `index.html` und `sw.js`
**dieselbe** Version tragen – inhaltlich strenger und ohne Pflege.

**Nicht getestet – ausdrücklich**: ein Live-Klicktest gegen Supabase war
wie in jeder vorherigen Sitzung nicht möglich (die Sandbox blockiert
HTTPS zu `nfgryuzkpwjfmdlmevuy.supabase.co`). Das wird nicht behauptet.
Die Downloads wurden dafür mit echter Bibliothek in echtem Chromium
erzeugt und die Excel-Datei wieder eingelesen.

### 71.8 PETER KÜNZI AG

Vor und nach allen Tests identisch: 2 Firmen, 13 Profile, 14 Feedbacks
(4 erledigt), `companies.updated_at` unverändert
(`2026-09-01 07:40:15.844647+00`), Mike Ledermann wieder in seiner
echten Firma, keine Wegwerf-Firma übrig. Der einzige Schreibversuch lief
in `begin; … rollback;`.

### 71.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/02-feedback.js` | Sortierung, Zählzeile, beide Exporte; `renderFeedbackList()` hierher verschoben |
| `js/01-basis.js` | `renderFeedbackList()` entfernt (liegt jetzt im Feedback-Modul) |
| `index.html` | Sortierleiste, Export-Leiste, Zählzeile, Version 2.63 |
| `css/01-basis.css` | `.bar[hidden]` (allgemein, siehe 71.5) und die Sortier-Chips |
| `sw.js` | Cache-Version 2.63 |

**Nicht angefasst**: alle Massaufnahme-Fachdateien, `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `css/03-druck.css` (Regierapport),
`js/23-verlauf.js`, `js/24-projekt-cockpit.js`, `js/22-system-admin.js`,
`js/05a-rechte.js`, `js/03-login.js`, `js/09-projekte.js`.

### 71.10 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (siehe 71.7).
- Die Liste lädt weiterhin **alle** Feedbacks einer Firma in einem Zug,
  ohne Obergrenze – bei den realen Mengen (14) unproblematisch, aber
  PostgREST liefert höchstens 1000 Zeilen je Anfrage. Sollte eine Firma
  je darüber kommen, bräuchte es echtes Nachladen; das war hier nicht
  verlangt und wurde bewusst nicht vorgebaut.
- Kein Filter (nur Sortierung) – „nur offene anzeigen" wäre eine kleine
  Erweiterung nach demselben Muster, war aber nicht Teil des Auftrags.
- Der Export enthält keine `id` und keine `company_id` – bewusst, die
  Datei ist für Menschen gedacht, nicht als Re-Import.

## 72. FEEDBACK VOR DEM EXPORT AUSWÄHLEN — VERSION 2.64

Ergänzt den Export aus v2.63: vor dem Herunterladen lässt sich
auswählen, welche Feedbacks in die Datei sollen. **Keine
Schemaänderung, keine Migration, keine RLS-Änderung, keine Fachdatei
angefasst** – geändert wurden nur `index.html`, `js/02-feedback.js` und
`css/01-basis.css`.

### 72.1 Bedienung

- Jede Feedback-Zeile hat ein Auswahlkästchen. **Die ganze Kopfzeile
  (Modul · Mitarbeiter · Datum) ist das Label** – auf dem Handy muss
  also nicht das kleine Kästchen getroffen werden.
- Drei Knöpfe über der Liste: **☑ Alle auswählen**, **☐ Keine
  auswählen**, **Nur offene**.
- Die Zählzeile nennt die Auswahl mit
  („14 Feedbacks · 10 offen · 4 erledigt · 3 zum Herunterladen
  ausgewählt"), die Download-Knöpfe tragen die Anzahl im Text
  („📊 Als Excel herunterladen (3)").
- Eine ausgewählte Zeile ist zusätzlich am blauen Balken links
  erkennbar – also nicht nur am Häkchen.

**Beim Öffnen des Bereichs ist alles ausgewählt.** Der Download
verhält sich damit genau wie in v2.63, bis der Benutzer eingrenzt –
niemand muss erst etwas anhaken, um überhaupt exportieren zu können.

### 72.2 Kein Weg in eine Sackgasse

Ist nichts ausgewählt, sind beide Download-Knöpfe **gesperrt** und die
Zählzeile sagt „nichts ausgewählt". Ein gesperrter Knopf ohne Erklärung
wäre schlechter als eine Fehlermeldung – deshalb beides zusammen. Wird
der Knopf trotzdem programmatisch ausgelöst, kommt „Bitte mindestens
ein Feedback auswählen." statt einer leeren Datei.

### 72.3 Wann die Auswahl erhalten bleibt

Ausgewählt wird über die **IDs** (`Set`), nicht über Positionen:

| Aktion | Auswahl |
|---|---|
| Umsortieren (Chip klicken) | bleibt vollständig erhalten |
| „Als erledigt markieren" | bleibt erhalten (`{behalten:true}`) |
| Feedback löschen | bleibt erhalten, die gelöschte ID fällt raus |
| Feedback-Bereich neu öffnen | alles wieder ausgewählt |

`renderFeedbackList()` nimmt dafür ein optionales `{behalten:true}`.
Der Aufruf aus `js/07-einstellungen.js` (Tab öffnen) bleibt unverändert
und bedeutet weiterhin „frisch anfangen" – die beiden Aufrufe nach
erledigt/gelöscht in `js/02` reichen `{behalten:true}` mit. Dadurch
musste `js/07` nicht angefasst werden.

Beim Anhaken wird die Liste **nicht** neu gezeichnet – nur die
Kopfzeile und die Zeilenmarkierung. Sonst würde bei jedem Tippen die
ganze Liste neu aufgebaut und auf dem Handy springen. Im Browser
geprüft: das Kästchen-Element überlebt den Klick (Merkmal am DOM-Knoten
gesetzt, danach wiedergefunden).

### 72.4 Downloads

Beide Downloads verwenden `feedbackAusgewaehlt()` = die Auswahl **in
der gerade gewählten Sortierung**. Die gemeinsame Zeilenfunktion aus
v2.63 bleibt die einzige Quelle für Excel und Textdatei.

Die Nummerierung läuft in der Datei weiterhin von 1 an (sie ist eine
Zeilennummer, keine Datenbank-ID). Der Kopf der Textdatei nennt jetzt
Auswahl und Gesamtzahl: „3 von 14 Feedbacks ausgewählt · 1 offen ·
2 erledigt".

### 72.5 Dritte Wiederholung derselben CSS-Falle

Nach `.bar{display:flex}` gegen `[hidden]` (Abschnitt 59/71.5) und
`table{min-width:1000px}` (Abschnitt 60.5) hat hier die globale
Grundregel

```css
input,select,textarea{width:100%;min-height:40px;border:…;padding:8px;…}
```

zugeschlagen: das Auswahlkästchen wurde dadurch **40 px hoch** und trug
einen zweiten Rahmen – das Häkchen rutschte unter die Kopfzeile. Ebenso
machte `label{…text-transform:uppercase;font-size:9px}` aus der
Kopfzeile GROSSBUCHSTABEN.

Beides **gemessen, nicht vermutet** (`getBoundingClientRect` und
`getComputedStyle` in echtem Chromium: `19x40`, `text-transform:
uppercase`). Korrektur ist ein gezieltes Zurücksetzen in der eigenen
Regel (`min-height:0;padding:0;border:0` bzw. `text-transform:none`).

Der Browser-Prüfstand misst das jetzt dauerhaft: Kästchengrösse
zwischen 16 und 24 px, Kästchen links **neben** der Kopfzeile statt
darunter, keine Grossbuchstaben. Gegenprobe mit entferntem Zurücksetzen
schlägt fehl.

**Merksatz für künftige Komponenten:** `css/01-basis.css` setzt in den
ersten ~35 Zeilen sehr breite Grundregeln (`input`, `label`, `table`,
`.bar`). Jede neue Komponente, die eines dieser Elemente verwendet,
muss die betroffenen Eigenschaften ausdrücklich zurücksetzen – und das
gehört gemessen, nicht angenommen.

### 72.6 Sicherheit – unverändert

Die Auswahl ist eine reine Anzeigefrage: sie entscheidet nur, welche
der **ohnehin schon geladenen** Zeilen in die Datei kommen. Es wurde
keine Abfrage geändert, keine Policy, kein Grant. Die Firmengrenze
erzwingt weiterhin allein die restriktive Policy
`tenant_boundary_feedback`; der Client filtert nirgends selbst nach
`company_id`. Der Export kann folglich nur enthalten, was RLS ohnehin
herausgibt.

### 72.7 Tests

**`feedback63` – 105/105** (vorher 78): neuer Abschnitt „Auswahl vor
dem Export" – beim Öffnen alles ausgewählt, Kästchen je Zeile,
Zählzeile und Knopftext nennen die Anzahl, Export enthält nur die
Auswahl (Excel und Text), Nummerierung läuft trotzdem von 1,
abgewähltes Feedback fehlt in beiden Dateien, ohne Auswahl sind beide
Knöpfe gesperrt und es entsteht keine Datei, „Alle"/„Keine"/„Nur
offene" wirken, Auswahl überlebt das Umsortieren.

**`feedbackbrowser63` – 67/67** (vorher 44): in echtem Chromium mit
echter SheetJS – Kästchen werden wirklich über das **Label** geklickt,
die erzeugte `.xlsx` wird in Node wieder eingelesen und enthält
nachweislich nur die ausgewählten Zeilen; „Nur offene" erzeugt eine
Datei ohne das erledigte Feedback; gesperrte Knöpfe als echtes
`disabled` geprüft; Kästchengrösse und -position gemessen (72.5); vier
Gerätebreiten ohne seitlichen Überlauf; keine JS-Fehler.

**Vier Gegenproben, jede reproduziert einen echten Fehler:**
- Export ignoriert die Auswahl → `feedback63` 100/105
- „Nur offene" ohne Wirkung → `feedback63` 104/105
- Kästchen-Handler zeichnet die Liste neu → `feedbackbrowser63` 63/64
  („Kästchen wird beim Anhaken nicht ersetzt")
- CSS-Zurücksetzen entfernt → `feedbackbrowser63` 65/67 (40 px hohes
  Kästchen, Grossbuchstaben)

**Ehrlich dokumentiert:** eine fünfte Gegenprobe (Kästchen-Handler auf
`click` statt `change`) blieb grün. Meine ursprüngliche Annahme, ein
`click`-Listener würde beim Label-Klick doppelt umschalten, war
**falsch** – der Klick aufs Label kommt als ein einzelnes Ereignis am
Kästchen an. `change` bleibt trotzdem das richtige Ereignis (es meldet
die Zustandsänderung auch bei Tastaturbedienung), aber der
Code-Kommentar behauptet jetzt keinen Fehler mehr, den es nicht gibt.

**Volle Regression grün**: rinne57 379/379, breite57 84/84,
pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7, suche40 7/7,
treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 701/701, keine doppelten Element-IDs.

**Nicht getestet – ausdrücklich**: ein Live-Klicktest gegen Supabase
war wie immer nicht möglich (Sandbox blockiert HTTPS zu
`nfgryuzkpwjfmdlmevuy.supabase.co`). Das wird nicht behauptet.

### 72.8 PETER KÜNZI AG

Unverändert: 2 Firmen, 13 Profile, 14 Feedbacks (4 erledigt),
`companies.updated_at` (`2026-09-01 07:40:15.844647+00`), keine
Wegwerf-Firma. In dieser Runde wurde **kein einziges Mal** in die
Datenbank geschrieben – nur gelesen.

### 72.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/02-feedback.js` | Auswahl-Zustand, Kästchen je Zeile, drei Auswahl-Knöpfe, Exporte auf die Auswahl beschränkt, Knopfsperre |
| `index.html` | Auswahl-Leiste, Version 2.64 |
| `css/01-basis.css` | Kästchen-Zeile inkl. Zurücksetzen der Grundregeln (72.5), Markierung ausgewählter Zeilen |
| `sw.js` | Cache-Version 2.64 |

### 72.10 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (siehe 72.7).
- Die Auswahl wirkt nur auf den Export, nicht auf die Anzeige – es
  gibt weiterhin keinen Filter „nur offene anzeigen" (nur den
  Auswahl-Knopf „Nur offene"). Wäre eine kleine Erweiterung nach
  demselben Muster, war aber nicht verlangt.
- Keine Massenaktion auf der Auswahl (etwa „ausgewählte als erledigt
  markieren" oder „ausgewählte löschen") – bewusst nicht gebaut, der
  Auftrag betraf ausschliesslich den Export.

## 73. REGIEMATERIAL: FREIE POSITION 999.99 — VERSION 2.65

Im Regierapport lässt sich jetzt Material erfassen, das **nicht im
Katalog steht**: EDV-Nr. `999.99`. Bezeichnung, Dim., Einheit und Preis
werden dann direkt in der Zeile eingetragen. **Keine Schemaänderung,
keine Migration, kein Katalogeintrag.**

### 73.1 Änderung an einer geschützten Datei – offen benannt

`js/06-rapport.js` steht seit dem v2.56-Auftrag auf der Liste
„Regierapport absolut nicht ändern". Diese Runde ändert sie – der
Auftrag verlangt ausdrücklich eine Erweiterung genau dieses Bereichs.
Was **nicht** angefasst wurde:

- `js/08-katalog-blitzschutz.js` (Speichern, PDF-Aufbereitung,
  Blechverbrauch) und `css/03-druck.css` – nicht im Diff.
- Arbeitspositionen, Stundenansätze, MWST-Rechnung, Summenstruktur,
  Sortierung, Projektauswahl – unverändert.
- Der Materialkatalog selbst (Tabelle `materials`) – kein Eintrag,
  keine Migration.

**Beweis, dass der Ausdruck unverändert ist:** der Regierapport-Druck
(`window.print()` auf der App-Seite) wurde in echtem Chromium unter
`media:print` mit ausgelöstem `beforeprint` gerendert, einmal auf dem
v2.64-Stand und einmal mit den Änderungen. Der Druck-DOM ist
**bytegleich** (Hash `a9da1681711b631a`). Die Bilder unterschieden
sich zunächst – die Ursache wurde eingekreist, indem nur der
Versionstext zurückgedreht wurde: danach war auch das Bild
bytegleich (`7843254639d00fad`). Der gesamte Unterschied kam also
allein aus der Versionsnummer, **nicht** aus dieser Änderung. Zwei
Läufe desselben Codes liefern identische Bilder – der Vergleich ist
also aussagekräftig und kein Rauschen.

### 73.2 Warum 999.99 und nicht ein Katalogeintrag

Ein Katalogeintrag hätte einen festen Preis und eine feste
Bezeichnung – genau das, was hier frei sein soll. Ausserdem müsste er
für **jede** Firma einzeln angelegt werden; eine neu registrierte
Firma hätte ihn nicht.

Die Nummer ist frei: über alle 372 Katalogzeilen hinweg gibt es
**keine** mit `999.99` und keine, die mit `999` beginnt (per SQL
geprüft). Eine Kollision ist damit ausgeschlossen.

### 73.3 Wie es arbeitet

```js
const FREIE_POSITION_NR="999.99";
function istFreiePosition(no){return String(no??"").trim()===FREIE_POSITION_NR}
function matPreis(m){
 if(istFreiePosition(m.no))return matZahl(m.price);   // aus der Zeile
 const x=materialFor(m.no); return x?matZahl(x[4]):0; // aus dem Katalog
}
function matZeileTotal(m){return matPreis(m)*(Number(m&&m.qty)||0)}
```

`matZeileTotal()` ist ab sofort die **einzige** Stelle, an der ein
Material-Zeilentotal entsteht – im Zeilentotal, im Materialtotal und
im CSV-Export der Regierapporte (`js/04-start-suche.js`). Vorher
stand dieselbe Rechnung dreimal ausgeschrieben da.

Die Werte liegen in der Rapportzeile selbst
(`m.desc`, `m.dim`, `m.unit`, `m.price`) und reisen über das
bestehende `material_entries`-JSONB mit – deshalb keine Migration.

### 73.4 Bedienung

- In der Vorschlagsliste der EDV-Nr. steht **zuoberst**
  „999.99 · Freie Position – Bezeichnung, Dim., Einheit und Preis
  frei eintragen". Sie erscheint bei leerer Eingabe und bei „999",
  „999.99", „frei", „Freie Pos" – nicht bei einer Katalogsuche.
- Auswählen (oder die Nummer von Hand eintippen) macht Material,
  Dim., Einheit und Fr./E zu Eingabefeldern. Menge und Total
  verhalten sich wie immer.
- Eine andere Nummer schaltet die Zeile wieder auf Katalogtext um.

**`searchMaterials()` wurde bewusst NICHT erweitert** – diese Funktion
speist auch den Blechverbrauch-Picker in `js/08`, der mit
`selectedSheet=materialFor(...)` arbeitet und bei einer nicht im
Katalog vorhandenen Nummer abstürzen würde. Die freie Position wird
deshalb nur in der Materialzeile des Rapports ergänzt. Der Prüfstand
sichert beides ab (Gegenprobe: die Nummer in `searchMaterials`
schleusen → zwei Fehlschläge).

### 73.5 Kein Fokusverlust beim Tippen

Die vier neuen Felder aktualisieren beim Tippen nur das Modell, das
Zeilentotal und die Summe – die Tabelle wird **nicht** neu gezeichnet.
Sonst wiederholte sich der Fehler aus Abschnitt 66 (Fokusverlust nach
dem ersten Zeichen). Umgeschaltet wird die Zeile erst beim **Verlassen**
des EDV-Feldes (`change`), und auch dann nur, wenn sich die Art
tatsächlich ändert.

Im echten Browser geprüft: ganze Wörter werden getippt, das Feld
behält den Fokus. Gegenprobe mit `renderMain()` im Eingabe-Handler
schlägt fehl.

### 73.6 Druck

Der Regierapport druckt die Bildschirmseite selbst. `css/03-druck.css`
stellt Eingabefelder rahmenlos dar (`border:0`, `padding:0`) – die
neuen Felder drucken deshalb wie gewöhnlicher Text, ohne dass am
Druck-Stylesheet etwas geändert werden musste. In echtem Chromium
unter `media:print` gemessen: alle Felder `border-width: 0px`, keine
Spalte läuft aus der Tabelle.

### 73.7 Tests

**`freipos65` – 75/75**: Erkennung (auch `999.9`, `999.990`, leer,
Katalognummer), Preis und Zeilentotal (Komma, leer, Text, negativ,
Katalogpreis unverändert, unbekannte Nummer 0), Zeilendarstellung
(Katalogzeile ohne Felder, freie Zeile mit vier Feldern, neun Spalten,
kein NaN), Gesamttotal gemischt, Eingabe in alle vier Felder inklusive
„kein Neuzeichnen", Vorschlagsliste, Umschalten beim Verlassen des
Feldes, Sortierung, Speichern/Wiederladen, alte Rapporte ohne die
neuen Felder.

**`freiposbrowser65` – 23/23** (echtes Chromium): Vorschlag wirklich
angeklickt, alle vier Felder Zeichen für Zeichen getippt mit
Fokus-Prüfung, Totale gerechnet, Katalog- und freie Zeile gemischt,
von Hand eingetippte Nummer schaltet um und wieder zurück, Druckansicht
(Werte vorhanden, rahmenlos, kein Überlauf), keine JS-Fehler.

**Drei Gegenproben, jede reproduziert einen echten Fehler:**
- freier Preis wird im Total ignoriert → `freipos65` 11 Fehlschläge
- Eingabe-Handler zeichnet neu → `freipos65` 2 Fehlschläge
  (u. a. „Tippen zeichnet die Tabelle NICHT neu")
- freie Position in `searchMaterials` → `freipos65` 2 Fehlschläge

**Volle Regression grün**: feedback63 105/105,
feedbackbrowser63 67/67, rinne57 379/379, breite57 84/84,
pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7,
suche40 7/7, treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 701/701, keine doppelten Element-IDs.

**Nicht getestet – ausdrücklich**: ein Live-Klicktest gegen Supabase
war wie immer nicht möglich (Sandbox blockiert HTTPS zu
`nfgryuzkpwjfmdlmevuy.supabase.co`). Das wird nicht behauptet.

### 73.8 PETER KÜNZI AG

In dieser Runde wurde **kein einziges Mal** in die Datenbank
geschrieben – nur eine lesende Abfrage auf `materials`, um die
Kollisionsfreiheit von 999.99 zu prüfen.

### 73.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/06-rapport.js` | freie Position: Helfer, Zeilendarstellung, Eingabe-Handler, Vorschlag, Umschalten |
| `js/04-start-suche.js` | CSV-Export nutzt `matZeileTotal()` statt einer eigenen Rechnung |
| `css/01-basis.css` | eine Zeile für das Preisfeld in der `.money`-Zelle |
| `index.html` | nur Versionstext 2.65 |
| `sw.js` | Cache-Version 2.65 |

### 73.10 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (siehe 73.7).
- Die Spalte **Dim.** ist schmal (6.5 % am Bildschirm, 10 mm im
  Druck) – sie war für Katalogwerte wie „0.7 mm" ausgelegt. Ein
  langer freier Text wird darin optisch abgeschnitten (der Wert
  bleibt vollständig gespeichert und gedruckt wird, was hineinpasst).
  Die Spalte zu verbreitern würde das Druck-Layout des Regierapports
  ändern – bewusst nicht getan.
- Nur **eine** freie Nummer (999.99). Mehrere freie Positionen in
  einem Rapport sind möglich (jede Zeile hat ihre eigenen Werte), sie
  tragen dann alle dieselbe EDV-Nr.
- Der Blechverbrauch kennt die freie Position nicht – dort wird ein
  echtes Katalogmaterial mit Abmessungen gebraucht.

## 74. FREIE POSITIONEN 999.90 BIS 999.99 — VERSION 2.66

Erweitert Abschnitt 73: statt einer einzigen freien Nummer gibt es
jetzt **zehn gleichwertige** – 999.90, 999.91, … 999.99. Damit kann ein
Rapport mehrere freie Positionen mit **unterschiedlichen** EDV-Nummern
enthalten (die in 73.10 offengelegte Einschränkung). **Keine
Schemaänderung, keine Migration, kein Katalogeintrag.** Geändert wurde
nur `js/06-rapport.js`.

### 74.1 Alle zehn verhalten sich identisch

```js
const FREIE_POSITION_NRN=Object.freeze(Array.from({length:10},(_,i)=>"999."+(90+i)));
function istFreiePosition(no){
 return FREIE_POSITION_NRN.indexOf(String(no==null?"":no).trim())>=0;
}
```

`istFreiePosition()` ist die einzige Stelle, die entscheidet, ob eine
Zeile frei ist – Preis, Zeilentotal, Darstellung, Umschalten und
CSV-Export hängen alle daran. Es gibt deshalb keine Möglichkeit, dass
sich eine der zehn Nummern anders verhält als die übrigen; der
Prüfstand belegt das trotzdem ausdrücklich für alle zehn (Erkennung,
Preis, Zeilentotal, `matBekannt`, gerenderte Eingabefelder).

Weiterhin **nicht** erkannt: `999`, `999.9`, `999.89`, `999.100`,
`999.990` – die Prüfung ist auf die zehn exakten Schreibweisen
festgelegt.

Kollisionsfreiheit erneut per SQL geprüft, diesmal für den ganzen
Bereich: **0** Katalogzeilen mit `edv_nr like '999%'` (von 372) und
**0** Zeilen in bestehenden Rapporten (`material_entries`) mit einer
Nummer, die mit 999 beginnt.

### 74.2 Der Vorschlag vergibt die nächste freie Nummer

Zehn gleich aussehende Einträge in der Vorschlagsliste wären nur Lärm.
Stattdessen zeigt die Liste **einen** Eintrag mit der nächsten in
diesem Rapport noch unbenutzten Nummer:

```
999.91 · Freie Position
Bezeichnung, Dim., Einheit und Preis frei eintragen · 999.90–999.99
```

- Die angebotene Nummer steht sichtbar im Eintrag – nichts passiert
  im Verborgenen; der Zusatz nennt den ganzen Bereich.
- Lücken werden genutzt: ist nur 999.92 belegt, kommt wieder 999.90.
- Katalogzeilen im Rapport stören die Zählung nicht.
- Wird eine **bestimmte** Nummer getippt (`999.93`), bietet die Liste
  genau diese an – auch wenn sie schon belegt ist. Die Eingabe des
  Benutzers schlägt die Automatik.
- Sind alle zehn belegt, wird die letzte erneut angeboten. Doppelte
  Nummern sind unschädlich: jede Zeile trägt ihre eigenen Werte.

`naechsteFreiePositionNr()` liest dafür ausschliesslich das bereits im
Speicher stehende `mats` – keine zusätzliche Abfrage.

### 74.3 Unverändert aus v2.65

Rechenweg (`matPreis`/`matZeileTotal` als einzige Quelle), Speicherung
in `material_entries`, kein Neuzeichnen beim Tippen, Umschalten erst
beim Verlassen des EDV-Feldes, `searchMaterials()` weiterhin
unangetastet (Blechverbrauch), Druckdarstellung.

Sortierung: mehrere freie Nummern sortieren numerisch untereinander und
stehen weiterhin hinter den Katalognummern desselben Tages
(`101.10, 999.90, 999.95`).

### 74.4 Tests

**`freipos65` – 99/99** (vorher 75): alle zehn Nummern einzeln bei
Erkennung, Preis, Zeilentotal und gerenderten Eingabefeldern; die
Nicht-Treffer (999, 999.9, 999.89, 999.100); neuer Abschnitt „nächste
freie Nummer" (leer → 999.90, belegt → nächste, Lücken, Katalogzeilen
stören nicht, alle belegt, getippte Nummer schlägt die Automatik);
mehrere freie Nummern in der Sortierung.

**`freiposbrowser65` – 33/33** (vorher 23, echtes Chromium): erster
Vorschlag 999.90, nach dem Übernehmen bietet der zweite 999.91 an,
beide Zeilen tragen eigene Nummern und eigene Werte, rechnen
eigenständig (20.00 / 15.00 → 35.00), Wechsel auf 999.97 behält die
erfassten Werte, Druckansicht unverändert.

**Zwei Gegenproben, beide reproduzieren einen echten Fehler:**
- nur 999.99 gilt → `freipos65` 5 Fehlschläge
- nächste Nummer ignoriert die Belegung → `freipos65` 4 Fehlschläge

Beim Anpassen der Prüfstände fielen fünf **veraltete Erwartungen**
auf, die alle noch die feste 999.99 bzw. eine feste Zeilenreihenfolge
annahmen. Da `sortMaterialsLive()` die Zeilen legitim umordnet, suchen
die Browser-Prüfungen ihre Zeilen jetzt über den Inhalt statt über
einen angenommenen Index.

**Volle Regression grün**: feedback63 105/105,
feedbackbrowser63 67/67, rinne57 379/379, breite57 84/84,
pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7,
suche40 7/7, treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 701/701.

**Nicht getestet – ausdrücklich**: kein Live-Klicktest gegen Supabase
(Sandbox blockiert HTTPS dorthin). In dieser Runde wurde **nicht** in
die Datenbank geschrieben – nur zwei lesende Abfragen zur
Kollisionsprüfung.

### 74.5 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/06-rapport.js` | zehn Nummern statt einer, `naechsteFreiePositionNr()`, Vorschlag |
| `index.html` | nur Versionstext 2.66 |
| `sw.js` | Cache-Version 2.66 |

`js/08-katalog-blitzschutz.js`, `css/03-druck.css`, `js/04-start-suche.js`
und `css/01-basis.css` sind in dieser Runde **nicht** im Diff.

### 74.6 Offene Punkte

- Die schmale **Dim.**-Spalte bleibt wie in 73.10 beschrieben.
- Mehr als zehn freie Positionen in **einem** Rapport führen zu
  doppelten Nummern (die Zeilen bleiben trotzdem eigenständig). Bei
  Bedarf liesse sich der Bereich in einer Zeile erweitern
  (`{length:10}`), solange er kollisionsfrei bleibt.

## 75. FEHLER: „UPDATE requires a WHERE clause" + MODULE IN ENTWICKLUNG IN DEN SYSTEM-ADMIN-BEREICH — VERSION 2.67

Zwei Dinge in einer Runde: ein vom Betreiber gemeldeter Speicherfehler
(der **fünf** Stellen betraf, nicht nur die gemeldete) und der Umzug von
„Module in Entwicklung" aus den Firmeneinstellungen in den
System-Admin-Bereich.

### 75.1 Der Fehler und sein wahrer Umfang

Gemeldet: „Module in Entwicklung" liess sich nicht mehr speichern,
Meldung `Konnte nicht gespeichert werden: UPDATE requires a WHERE
clause`.

Ursache: Abschnitt 21.3 hatte alle `.eq("id",1)`-Filter aus den
`app_settings`-Aufrufen entfernt, mit der Begründung „RLS grenzt
automatisch ein". Das ist für die **Sichtbarkeit** richtig, aber
PostgREST verweigert grundsätzlich ein `UPDATE` **ohne jede
Filterbedingung** – unabhängig von RLS. Die damals dokumentierte
Annahme war also falsch.

**Betroffen waren fünf Stellen, nicht eine** (per Grep gefunden, nicht
geraten):

| Speichern-Knopf | Wirkung |
|---|---|
| Module in Entwicklung | gemeldet |
| Mauerabdeckung: Boden-/Schiebermass | ebenso kaputt |
| Lukarne: Achsabstand/Hilfsriss/Zugaben | ebenso kaputt |
| Rinne Halbrund: Dilatationsmass | ebenso kaputt |
| **Firma: Name/Adresse/MWST/Logo** | ebenso kaputt |

Alle fünf hätten dieselbe Meldung gebracht. Der Betreiber hatte nur die
erste ausprobiert.

### 75.2 Ein Helfer statt fünf Kopien

```js
async function speichereAppSettings(felder){
 if(appSettingsId==null) return {fehler:"… Bitte die Seite neu laden."};
 const {data,error}=await sb.from("app_settings")
  .update({...felder,updated_at:new Date().toISOString()})
  .eq("id",appSettingsId)          // PostgREST verlangt eine Bedingung
  .select();                        // 0 Zeilen = still gescheitert
 if(error)          return {fehler:error.message};
 if(!data||!data.length) return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 return {fehler:null};
}
```

Zwei Fallen auf einmal geschlossen: die fehlende Bedingung **und** der
stille Fehlschlag aus Abschnitt 24.1 (ein von RLS geblocktes UPDATE
meldet keinen Fehler, es betrifft einfach 0 Zeilen). Ohne `.select()`
hätte die App „gespeichert" gemeldet, obwohl nichts geschrieben wurde.

`appSettingsId` wird beim Laden aus der eigenen Zeile gemerkt
(`js/05-daten-laden.js`). Sie ist **keine Berechtigung** – die
Firmengrenze erzwingt weiterhin allein die restriktive
`tenant_boundary_app_settings`; die ID ist nur die von PostgREST
verlangte Bedingung. Ein manipulierter Wert träfe eine fremde Zeile
nicht, weil RLS sie gar nicht sichtbar macht.

Nach dem Umzug (75.3) nutzen **vier** Stellen den Helfer; die fünfte
läuft jetzt über eine RPC.

### 75.3 „Module in Entwicklung" ist eine Betreiber-, keine Firmenfrage

Ob eine Funktion fertig ist, entscheidet der Betreiber von
Spengler-DIGITAL – nicht der Admin einer einzelnen Firma. Bisher stand
der Wert in `app_settings.module_test`, also **je Firma**, und jeder
Firmenadmin konnte ihn ändern. Beides passt nicht zum Zweck.

**Neu: genau eine Zeile für das ganze System.**

Migration `system_module_test_v2_67`:

- Tabelle `public.system_settings` (`id smallint check (id=1)`,
  `module_test jsonb not null default '{}'`, `updated_by`,
  `updated_at`).
- Der bestehende Wert wurde übernommen, damit sich nichts ändert:
  `{"meas:anschlussblech":true,"meas:einfassung_rund":true}`.
- RLS an. **SELECT für alle Angemeldeten** – `applyModuleTest()`
  blendet damit Knöpfe aus; das ist reine UI-Führung, keine
  Sicherheitsgrenze (22.1), und es steht nichts Schützenswertes drin.
- **Keine** insert/update/delete-Policy, dazu
  `revoke all … from anon, authenticated` und nur `grant select`.
- Geschrieben wird ausschliesslich über
  `system_admin_set_module_test(jsonb)` – `SECURITY DEFINER`, prüft
  `is_system_admin()` als erste Zeile, weist einen Nicht-Objekt-Wert
  ab, gibt die geschriebene Zeile zurück. Gleiches Muster wie alle
  übrigen `system_admin_*`-Funktionen (25.2).

`app_settings.module_test` bleibt als Spalte bestehen und wird nicht
mehr gelesen – **nichts gelöscht**, der alte Wert steht unverändert da.

### 75.4 Empirisch geprüft (alles in `begin; … rollback;`)

| Test | Ergebnis |
|---|---|
| Mitarbeiter liest `system_settings` | 1 Zeile – nötig fürs Ausblenden |
| Mitarbeiter: direktes `UPDATE` | `42501 permission denied for table system_settings` |
| Mitarbeiter: `system_admin_set_module_test(...)` | „Nur für System-Administratoren." |
| System-Admin: dieselbe Funktion | schreibt, setzt `updated_by` auf den echten Aufrufer |
| System-Admin: ungültiger Wert (kein Objekt) | abgelehnt |
| nach dem Rollback | Ursprungswert unverändert |

`get_advisors(security)`: die neue Funktion erscheint mit **derselben**
erwarteten Warnung wie jede andere `system_admin_*`-Funktion („von
`authenticated` aufrufbar, die Prüfung liegt in der Funktion", siehe
25.4). Keine RLS-Lücke für die neue Tabelle, keine neue Art von
Warnung.

### 75.5 Oberfläche

Der Abschnitt liegt jetzt als eigene Karte „🧪 Module in Entwicklung"
im System-Admin-Bereich, direkt unter der Firmenliste, mit dem Hinweis
**„Gilt für alle Firmen"**. Er wird beim Öffnen des Bereichs gezeichnet.
Statt eines `alert()` erscheint eine Zeile unter der Liste („✓
Gespeichert – 2 Module in Entwicklung (gilt für alle Firmen)."), bei
Ablehnung rot.

Aus den Einstellungen ist er verschwunden – ein Firmenadmin sieht ihn
nicht mehr. Der Zugang ist doppelt gesichert: der Menüpunkt
`#navSystemAdmin` ist für Nicht-System-Admins ausgeblendet (UI), und
die RPC lehnt sie serverseitig ab.

**Folge, die bewusst in Kauf genommen wird:** die Einstellung gilt jetzt
für alle Firmen gemeinsam. Für Testfirma (bisher `null`) sind die zwei
Module dadurch neu ebenfalls nur für Administratoren sichtbar. Das ist
genau der Zweck – eine unfertige Funktion soll nirgends bei
Mitarbeitern auftauchen.

### 75.6 Änderung an einer geschützten Datei

Aus `js/08-katalog-blitzschutz.js` wurde **eine Zeile** entfernt:
`if(typeof renderModuleTestListe==="function")renderModuleTestListe();`
in `renderSettings()`. Das ist die Verdrahtung des umgezogenen
Abschnitts, keine Regierapport-Logik. `js/06-rapport.js` und
`css/03-druck.css` sind nicht im Diff.

### 75.7 Tests

**`module67` – 42/42**: Speicher-Helfer (WHERE-Bedingung, richtige
Tabelle, `updated_at`, stiller Fehlschlag, echter Fehler, nicht
geladene Zeile), alle vier Aufrufstellen umgestellt und **kein**
UPDATE ohne Filter mehr im Code, Umzug (Liste und Knopf im
System-Admin-Modal, nicht mehr in den Einstellungen, Logik aus js/07
verschwunden, in js/22 vorhanden, kein Aufruf mehr aus js/08,
`moduleImTest` kommt aus `system_settings`), Speichern über die RPC
(nur angehakte Module, kein direkter Tabellenzugriff, Rückgabewert wird
übernommen, Ablehnung rot, leere Antwort gilt nicht als Erfolg, leerer
Fall).

**`modulebrowser67` – 16/16** (echtes Chromium): der Abschnitt liegt
wirklich im System-Admin-Modal und ist sichtbar, alle elf
Massaufnahmen und beide Ausmasse werden gelistet, der bestehende Wert
ist angehakt, Speichern setzt genau **einen** Aufruf ab und zwar die
geschützte Funktion, die Knöpfe der Testmodule werden für Nicht-Admins
ausgeblendet und für Admins wieder sichtbar, und „Firmenname
speichern" setzt ein UPDATE **mit** `eq("id",…)` ab.

**Zwei Gegenproben, beide reproduzieren den gemeldeten Fehler:**
- `.eq("id",appSettingsId)` entfernt → `module67` 2 Fehlschläge
- 0 betroffene Zeilen wieder als Erfolg werten → 3 Fehlschläge

**Volle Regression grün**: freipos65 99/99, freiposbrowser65 33/33,
feedback63 105/105, feedbackbrowser63 67/67, rinne57 379/379,
breite57 84/84, pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7, suche40 7/7,
treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 701/701, keine doppelten Element-IDs.

**Nicht getestet – ausdrücklich**: kein Live-Klicktest gegen Supabase
(Sandbox blockiert HTTPS dorthin). Der eigentliche Speichervorgang
gegen die echte API ist damit nicht im Browser bestätigt; geprüft sind
die abgesetzten Aufrufe im Browser und die Datenbankseite per
SQL-Simulation.

### 75.8 PETER KÜNZI AG

Unverändert: 2 Firmen, 13 Profile, 4 Rapporte, `companies.updated_at`
(`2026-09-01 07:40:15.844647+00`), `app_settings.module_test`
unverändert. Einziger Schreibzugriff dieser Runde: die Migration
(neue Tabelle + Übernahme des bestehenden Werts).

### 75.9 Geänderte Dateien

| Datei | Warum |
|---|---|
| Migration `system_module_test_v2_67` | `system_settings` + `system_admin_set_module_test()` |
| `js/07-einstellungen.js` | `speichereAppSettings()`, vier Aufrufstellen, Modul-Logik entfernt |
| `js/22-system-admin.js` | Modul-Liste und Speichern über die RPC |
| `js/05-daten-laden.js` | `appSettingsId` merken, `module_test` aus `system_settings` |
| `js/01-basis.js` | `appSettingsId` deklariert |
| `js/08-katalog-blitzschutz.js` | eine Zeile Verdrahtung entfernt (75.6) |
| `index.html` | Abschnitt verschoben, Version 2.67 |
| `sw.js` | Cache-Version 2.67 |

### 75.10 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (75.7).
- `app_settings.module_test` bleibt als ungenutzte Spalte bestehen –
  bewusst nicht gelöscht (keine stillen Datenverluste). Ein späteres
  Aufräumen wäre eine eigene, bewusste Migration.
- Abschnitt 21.3 dieses Dokuments enthält die widerlegte Aussage,
  ein `.update()` ohne `.eq()` sei ausreichend. Sie bleibt dort als
  historischer Stand stehen, ist aber durch diesen Abschnitt überholt.

## 76. EINSTELLUNGEN SPRINGEN BEI JEDER ART AN DIE RICHTIGE STELLE + VERLAUFSDATEN AUS DER PROJEKTLISTE — VERSION 2.68

Zwei gemeldete Punkte. **Keine Schemaänderung, keine Migration, keine
RLS-Änderung, keine Berechnung angefasst.**

### 76.1 Der Einstellungs-Knopf kannte nur zwei von elf Arten

`$("measurementEditSettingsShortcut")` (der Knopf „⚙️ Einstellungen" im
Massaufnahme-Formular) war so verdrahtet:

```js
if(type==="rinne_halbrund")      openSettingsTo("measurements","rinne");
else if(type==="einlaufblech_gerade") openSettingsTo("measurements","einlaufblech");
else                              openSettingsTo("measurements");
```

Bei den übrigen **neun** Arten öffnete sich also nur das Register, ohne
an die passende Stelle zu springen. Fünf Arten haben zwar einen eigenen
Knopf direkt im Formular (Einlaufblech, Lukarne, Ort-/Seitenbleche,
Einfassung Rund, Rinne-Profil) – für Einlaufblech konisch,
Mauerabdeckung, Skizze/Foto, Freies Profil und Kehle war der obere Knopf
aber der einzige Weg.

**Behoben** mit einer vollständigen Zuordnung, die direkt neben der
Liste der Arten steht (`js/01-basis.js`), damit eine zwölfte Art beides
gleichzeitig bekommt:

| Art | Abschnitt |
|---|---|
| Skizze/Foto | `material` (nur Materialkatalog) |
| Einlaufblech gerade | `einlaufblech` |
| Rinne Halbrund | `rinne` (Anschlusstypen) |
| Einlaufblech konisch | `einlaufblech-konisch` |
| Freies Profil | `material` (kein eigener Abschnitt) |
| Mauerabdeckung | `mauerabdeckung` |
| Lukarne Seitenverkleidung | `lukarne` |
| Ort- und Seitenbleche | `anschlussblech` |
| Einfassung Rund | `einfassung-rund` |
| **Kehle** | **keiner** – rechnet nur, hat kein Material |
| Rinne | `rinne-profil` (Standardprofil & Ansetztypen) |

Kehle bekommt bewusst keinen Abschnitt: sie hat als einzige Art kein
Material-Feld und keine Einstellungen (Abschnitt 60.6, per Grep auf
`id="kehle_material"` bestätigt). Dort öffnet sich weiterhin nur das
Register – das ist die ehrliche Antwort, nicht eine erfundene Stelle.

Dasselbe für die beiden Ausmass-Arten
(`AM_TYPE_SETTINGS_SECTION`): Blitzschutzausmass → `blitzschutz`,
Offerte erfassen → keiner (hat keine eigenen Einstellungen).

Die fünf modul-eigenen Knöpfe **innerhalb** der Formulare sind
unverändert – sie funktionierten bereits und setzen zusätzlich
`settingsReturnToMeasurement`, damit das Schliessen ins Formular
zurückführt.

### 76.2 Verlaufsdaten raus aus der Projektliste

Jede Projektkarte trug zwei Zeilen „Erstellt von … am … · Zuletzt
geändert von … am …". In einer Übersicht sucht man ein Projekt, nicht
seine Historie – die zwei Zeilen haben Adresse, Status und Knöpfe
verdrängt (siehe Screenshot des Betreibers).

Die Zeile ist jetzt **nach dem Auswählen des Projekts** im Projektkopf
des Cockpits (`#cockpitMetaInfo`), also genau dort, wo man sich mit dem
einzelnen Projekt befasst. Sie verwendet dieselbe Funktion wie
Massaufnahme und Ausmass (`erstelltGeaendertText()`, js/16) – keine
zweite Formatierlogik – und bleibt weg, wenn ein Projekt noch keine
Verlaufsdaten hat.

**Unverändert in der Liste**: Adresse als Haupttitel, Status-Badge,
Projektname/Auftrags-Nr./Auftraggeber und alle vier Knöpfe.

**Unverändert in den Cockpit-Listen**: das knappe „zuletzt geändert
<Datum>" bei Massaufnahme/Ausmass/Rapport (`eintragZusatzTeile()`,
v2.39) bleibt – diese Listen erscheinen ohnehin erst nach dem Auswählen
des Projekts.

### 76.3 Tests

**`einst68` – 43/43**: für jede der elf Arten ist ein Eintrag
hinterlegt, keine überzähligen, jeder hinterlegte Abschnitt existiert
wirklich im HTML und liegt im richtigen Register, nur Kehle ohne
Abschnitt (und hat auch kein Material-Feld), die Knöpfe nutzen die
Tabelle statt fester Fälle, die Projektkarte ruft
`erstelltGeaendertText` nicht mehr auf, Adresse/Status/Zusatz/Knöpfe
bleiben, der Projektkopf füllt die Zeile und zeigt sie nur bei Inhalt.

**`einstbrowser68` – 47/47** (echtes Chromium): für **jede** der elf
Arten wird der echte Knopf geklickt und gemessen, ob das Register aktiv
ist und der erwartete Abschnitt wirklich aufgeklappt **und sichtbar**
ist (Höhe > 40 px). Zusätzlich beide Ausmass-Arten. Dann: die
Projektliste enthält „Erstellt von"/„Zuletzt geändert von" nicht mehr,
Adresse/Status/Knöpfe schon; der Projektkopf zeigt die Zeile nach dem
Öffnen; ein Projekt ohne Verlaufsdaten lässt sie weg; keine JS-Fehler.

Der Browser-Prüfstand zählt **unabhängig von der Tabelle** mit, wie
viele Arten wirklich einen Abschnitt aufklappen (genau zehn von elf) –
sonst hätte er nur seine eigene Erwartung bestätigt und eine
leergeräumte Tabelle wäre still durchgegangen. Genau das ist beim
ersten Anlauf passiert und wurde behoben.

**Zwei Gegenproben, beide reproduzieren den gemeldeten Zustand:**
- Zuordnung auf die alten zwei Arten zurückgesetzt → `einst68` 1
  Fehlschlag, `einstbrowser68` „2 von 11"
- Verlaufszeile zurück in die Projektliste → `einst68` 1 Fehlschlag

**Volle Regression grün**: module67 42/42, modulebrowser67 16/16,
freipos65 99/99, freiposbrowser65 33/33, feedback63 105/105,
feedbackbrowser63 67/67, rinne57 379/379, breite57 84/84,
pdf52 504/504, breite52 52/52, kehle52 698/698,
kehleintegration52 76/76, medien50 42/42, dateien49 38/38,
adresse45 39/39, projekte47 37/37, pfade55 37/37, status46 35/35,
auswahl48 32/32, dateien43 27/27, nav 23/23, stand42 17/17,
suche45 13/13, recent41 12/12, kopf45 8/8, hidden51 7/7, suche40 7/7,
treffer40 7/7, ui39 (9 Darstellungsfälle).

`node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 702/702, keine doppelten Element-IDs.

**Nicht getestet – ausdrücklich**: kein Live-Klicktest gegen Supabase
(Sandbox blockiert HTTPS dorthin). In dieser Runde wurde **nicht** in
die Datenbank geschrieben und nicht gelesen.

### 76.4 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/01-basis.js` | `MEAS_TYPE_SETTINGS_SECTION` und `AM_TYPE_SETTINGS_SECTION` neben der Liste der Arten |
| `js/04-start-suche.js` | Knopf nutzt die Tabelle statt zweier fester Fälle |
| `js/17-ausmass.js` | **eine Zeile**: derselbe Umbau für die Ausmass-Arten, keine Fachlogik |
| `js/09-projekte.js` | Verlaufszeile aus der Projektkarte entfernt |
| `js/24-projekt-cockpit.js` | Verlaufszeile im Projektkopf |
| `index.html` | `#cockpitMetaInfo`, Version 2.68 |
| `sw.js` | Cache-Version 2.68 |

`js/06-rapport.js`, `js/08-katalog-blitzschutz.js` und
`css/03-druck.css` sind **nicht** im Diff.

### 76.5 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (76.3).
- `openSettingsTo()` klappt den Zielabschnitt auf, schliesst aber
  vorher geöffnete nicht – unverändertes Verhalten seit v2.14.
- Kehle und „Offerte erfassen" haben weiterhin keine eigenen
  Einstellungen; falls dort je welche dazukommen, genügt ein Eintrag in
  der jeweiligen Tabelle.

## 77. KNOPFABSTÄNDE IN DER GESAMTEN APP GEPRÜFT — VERSION 2.69

Gemeldet mit Screenshot: der Knopf „🗄 Archivierte Projekte anzeigen"
klebt an den Statusfilter-Chips darunter. Auftrag war ausdrücklich, die
**gesamte App** zu prüfen, nicht nur diese eine Stelle. **Keine
Datenbank-, RLS- oder Storage-Änderung; keine Fachdatei angefasst** –
geändert wurde eine CSS-Zeile.

### 77.1 Messen statt suchen

Statt den Code nach verdächtigen Stellen abzusuchen, misst der neue
Prüfstand `abstand69` die tatsächliche Darstellung in echtem Chromium:

- alle knopfartigen Elemente (`button`, `label.cockpit-upload`,
  `.settings-tab`, `a.button`), die wirklich sichtbar sind
- **6 Gerätebreiten** (320 / 360 / 390 / 412 / 768 / 1280 px)
- **23 Bereiche** (Startbildschirm, Projektübersicht, Cockpit, alle
  Übersichten, Regierapport, alle Einstellungs-Tabs, System-Admin,
  Feedback, Medien, elf Massaufnahme-Formulare)
- gemeldet wird jede Überlappung und jedes benachbarte Paar mit
  **weniger als 6 px Luft**; dieselbe Stelle über mehrere Breiten wird
  zusammengefasst

**Zwei Nachbesserungen am Prüfstand waren nötig** (beide erst durch das
Ergebnis aufgefallen):

1. Der erste Lauf fand die **gemeldete** Stelle nicht. Grund: die Listen
   waren nie gezeichnet – `#projectStatusFilter` erscheint erst, wenn
   `renderProjectList()` gelaufen ist. Der Prüfstand ruft jetzt je
   Bereich die echten Render-Funktionen auf (`renderProjectList`,
   `openProjectCockpit`, `renderMeasurementsOverview`,
   `renderAusmassOverview`, `renderReportsOverview`, `renderMain`,
   `renderSettings`, `renderModuleTestListe`, `fuelleFeedbackModule`,
   `showMeasTypeSection`). Danach fand er sie sofort.
2. Zwei Gruppen sind **absichtlich** eng und ausdrücklich ausgenommen
   (`ENG_GEWOLLT`): die Arbeitsstand-Zeilen im Cockpit (eine Liste mit
   Trennlinien) und die Einstellungs-Tabs (eine Reiterleiste). Beides
   ist kein Knopfpaar im Sinne der Meldung.

### 77.2 Ergebnis: genau eine echte Stelle

Über alle 6 × 23 Messungen: **keine Überlappung**, und genau **eine**
zu enge Stelle – exakt die gemeldete, auf allen sechs Breiten:

```
[senkrecht] 0 px  projectsModal
    "🗄 Archivierte Projekte anzeigen" (toggleArchivedProjects)
    "Alle" / "○ Offen"
```

Ursache, im CSS nachgelesen:

```css
.bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}      /* kein margin-bottom */
.status-filter{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}  /* kein margin-top */
```

Beide Zeilen sind je für sich richtig, treffen aber im Projektmodal
direkt aufeinander – 10 px oben, 8 px unten, **0 px dazwischen**.

### 77.3 Korrektur

```css
.status-filter{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 8px}
```

`.status-filter` kommt in der ganzen App genau **einmal** vor (per Grep
geprüft) – die Änderung wirkt also nur an dieser Stelle. Bewusst **nicht**
`.bar{margin-bottom}` gesetzt: `.bar` ist eine der am häufigsten
verwendeten Klassen und ein Bottom-Margin hätte Abstände quer durch die
App verschoben, ohne dass es irgendwo nötig wäre.

### 77.4 Tests

- **`abstand69` 2/2** – keine Überlappung, überall ≥ 6 px Luft.
- **Gegenprobe**: mit `margin:0 0 8px` zurückgesetzt meldet der Prüfstand
  wieder „2 Stellen / 0 px" auf allen sechs Breiten – er greift also
  wirklich.
- Optisch nachgesehen (390 px, echtes Chromium): zwischen Knopf und
  Chips steht jetzt sichtbar Luft.
- **Volle Regression grün**: einst68 43/43, einstbrowser68 47/47,
  module67 42/42, modulebrowser67 16/16, freipos65 99/99,
  freiposbrowser65 33/33, feedback63 105/105, feedbackbrowser63 67/67,
  rinne57 379/379, breite57 84/84, pdf52 504/504, breite52 52/52,
  kehle52 698/698, kehleintegration52 76/76, medien50 42/42,
  dateien49 38/38, adresse45 39/39, projekte47 37/37, pfade55 37/37,
  status46 35/35, auswahl48 32/32, dateien43, nav, stand42, suche45,
  recent41, kopf45, hidden51 7/7, suche40, treffer40, ui39 – alle ohne
  Fehlschlag.
- `node --check` über alle 28 `js/*.js` und `sw.js` fehlerfrei,
  `<div>` 702/702, keine doppelten Element-IDs.
- Keine Datenbankabfrage in dieser Runde – weder lesend noch schreibend.
  PETER KÜNZI AG nicht berührt.

### 77.5 Geänderte Dateien

| Datei | Warum |
|---|---|
| `css/01-basis.css` | eine Zeile: `margin-top` für `.status-filter` (mit Begründung im Kommentar) |
| `index.html` | nur Versionstext 2.69 |
| `sw.js` | Cache-Version 2.69 |

### 77.6 Offene Punkte

- Geprüft wird der **Abstand** knopfartiger Elemente. Andere
  Überschneidungen (Text unter Bildern, abgeschnittene Tabellenspalten)
  deckt `abstand69` nicht ab – dafür gibt es die bestehenden
  Breiten-Prüfstände (`breite52`, `breite57`, und die Breitenblöcke in
  `feedbackbrowser63`/`freiposbrowser65`/`einstbrowser68`).
- Die Schwelle liegt bei 6 px. Aufgeklappte Bereiche, die nur nach einer
  weiteren Bedienung sichtbar werden (z. B. jede einzelne Cockpit-Liste
  in jedem Zustand), sind nicht erschöpfend durchgespielt – gemessen
  wurde der jeweils geöffnete Grundzustand jedes Bereichs.

## 78. NEUN OFFENE FEEDBACKS ABGEARBEITET — VERSION 2.70

Auftrag: das gesamte Repo prüfen und die neun am 03.09.2026 offenen
Feedbacks der Firma PETER KÜNZI AG abarbeiten – jeden Punkt zuerst
reproduzieren, dann die Ursache beheben und dauerhaft absichern.

### 78.1 Versionsnummer

Der Auftrag nennt „Version 2.69". Diese Nummer war zu diesem Zeitpunkt
bereits vergeben – an die Knopfabstands-Runde (Abschnitt 77), die am
selben Tag ausgeliefert wurde. Diese Arbeit ist deshalb **Version 2.70**.
Gleicher Fall wie in Abschnitt 60.1 (2.51 → 2.52).

### 78.2 Repo-Audit vor der Umsetzung

Gesucht und gelesen: `index.html`, alle 29 `js/*.js`, alle vier
`css/*.css`, `sw.js`, alle sechs Edge Functions, alle RLS-Policies der
betroffenen Tabellen, das Storage-Modell, die 30 bestehenden Prüfstände
und dieses Dokument. Ergebnis je Feedback in 78.3 bis 78.11.

**Elf Massaufnahme-Arten** (unverändert): Skizze/Foto, Einlaufblech
gerade, Rinne Halbrund, Einlaufblech konisch, Freies Profil,
Mauerabdeckung, Lukarne, Ort-/Seitenbleche, Einfassung Rund, Kehle,
Rinne. Keine ihrer Berechnungen wurde ersetzt oder vereinfacht.

### 78.3 Feedback 1 · „Feedback funktioniert nicht mit anderer firma"

**Zustand vorher, direkt gegen die Produktivdatenbank geprüft:** die
Firmengrenze auf `feedback` ist **in Ordnung**. Als Admin der Testfirma
liessen sich Feedback anlegen, lesen (inkl. Namens-Join), erledigen und
löschen; PETER KÜNZI AG sah davon nichts und umgekehrt. Es gibt sogar
ein echtes, ausserhalb dieser Sitzung geschriebenes Testfirma-Feedback
(ID 21, „Testfeedback", 01.09.2026).

**Ursache:** Genau diese korrekte Trennung ist die gemeldete Wirkung –
der **Betreiber sieht das Feedback seiner Kundenfirmen nie**. Feedback
ist der Weg, auf dem Pilotbetriebe Probleme melden; landet es nur in
ihrer eigenen Firma, erreicht es niemanden.

**Zweiter, unabhängig belegter Fehler:** `feedback_created_by_fkey` zeigte
mit `ON DELETE NO ACTION` auf `profiles`. Ein Mitarbeiter, der je ein
Feedback geschrieben hat, liess sich damit **nicht mehr entfernen** –
dieselbe Lücke wie in Abschnitt 36.1/37/51, `feedback` war dabei
übersehen worden.

**Änderung** (Migration `feedback_operator_view_v2_70`):
- Fremdschlüssel auf `ON DELETE SET NULL`. Live nachgewiesen: der
  Mitarbeiter lässt sich löschen, das Feedback bleibt, `created_by`
  wird `NULL`.
- `system_admin_all_feedback()` – `SECURITY DEFINER`, prüft
  `is_system_admin()` als erste Zeile, liefert Feedback aller Firmen
  mit Firmenname und Absender. Gleiches Muster wie alle übrigen
  `system_admin_*`-Funktionen.
- `system_admin_set_feedback_resolved(id, boolean)` – ebenso geschützt,
  ändert ausschliesslich `resolved`.
- **Keine** zusätzliche RLS-Policy auf `feedback`, keine Lockerung der
  Firmengrenze.

**Frontend:** `js/02-feedback.js` kennt jetzt zwei Ansichten
(`FEEDBACK_ANSICHTEN.firma` / `.betreiber`) mit **einer** Umsetzung –
Sortierung, Auswahl, Zählzeile und beide Downloads sind derselbe Code.
Unterschiedlich sind nur die Element-IDs, die Spalte „Firma", die
zusätzliche Sortierung „Firma (A–Z)" und der Schreibweg. Die
Betreiber-Ansicht hat **bewusst keinen Löschknopf**: das Feedback gehört
der jeweiligen Firma.

**Mitbehoben:** Erledigt-Schalter und Löschen prüfen jetzt die Zahl der
betroffenen Zeilen (`.select()`). Ein von RLS blockiertes UPDATE/DELETE
meldet in PostgREST keinen Fehler, es betrifft still 0 Zeilen
(CLAUDE.md 24.1) – vorher wäre das als Erfolg durchgegangen.

**Test:** `feedback70` (47/47), zwei Gegenproben. SQL-Nachweise wie oben.

### 78.4 Feedback 2 · Mauerabdeckung „Winkel (95°) muss änderbar sein"

**Ursache, im Code nachgerechnet:** 95° war kein fester Wert, sondern
ein **Ergebnis**. Der linke Schenkel wurde immer senkrecht gezeichnet,
die Deckfläche um das Gefälle geneigt – daraus folgt zwingend
links `90° + Gefälle`, rechts `90° − Gefälle`, bei 5° Gefälle also
95°/85°. Die beiden Winkel liessen sich also nur gemeinsam und nur
indirekt über das Gefälle verstellen, nie einzeln.

**Änderung:** zwei neue Eingaben „Biegewinkel links/rechts". Fehlen sie
(ältere gespeicherte Massaufnahmen, leeres Feld), gilt exakt der frühere
Wert – `madBiegeVorgabe(gef)`. Die Zeichnung leitet beide Schenkel- und
Umschlagrichtungen daraus ab; **die Abwicklung bleibt die Summe der
Schenkellängen und hängt nicht vom Winkel ab** (nachgemessen). Der PDF-
Ausdruck nennt beide Winkel.

**Test:** `mad70` (45/45): alte Daten zeichnen byteweise identisch, jeder
Winkel wirkt sichtbar, „95" steht nirgends mehr fest im Code, Abwicklung
bei jedem Winkel 460 mm, keine NaN bei leeren/negativen/Textwerten.
Gegenprobe: Winkel fest verdrahtet → 9 Fehlschläge.

### 78.5 Feedback 3 · Freies Profil „von ki nicht zuverlässig erkannt"

**Ursache:** Die Edge Function reichte **jede** KI-Antwort ungeprüft
durch (`return json({ok:true, schenkel})`). Der Client machte daraus
`Math.round(Number(s.laenge))||0` – aus „keine Zahl" wurde also stumm
ein Schenkel der **Länge 0**, und dieses ungültige Profil ersetzte nach
einem einzigen `confirm()` sofort die bestehende Arbeit. Dazu: keine
Zeitgrenze, keine Obergrenze für die Schenkelzahl, kein Weg, das
Ergebnis vor der Übernahme anzusehen.

**Änderung, Edge Function Version 4** (Quelle jetzt auch im Repo unter
`supabase/functions/extract-profile-shape/`):
- `pruefeSchenkel()`: nur endliche Längen > 0, Winkel auf ±180 begrenzt,
  erster Winkel 0, höchstens 24 Schenkel, mindestens 2 – sonst
  „Keine eindeutige Form erkannt – bitte manuell erfassen."
- Der Prompt verlangt ein Objekt mit `"sicher": true|false`; meldet das
  Modell Unsicherheit, wird **nichts** geliefert statt geraten.
- 25 s Zeitgrenze über `AbortController`.

**Änderung, Client:**
- Dieselbe Prüfung nochmals im Browser – der Client vertraut der Antwort
  nicht.
- **Vorschau statt Sofortübernahme**: erkannte Form wird als Zeichnung
  und Tabelle gezeigt und erst mit „✓ Übernehmen" wirksam; „✕ Verwerfen"
  lässt das bestehende Profil unangetastet.
- Eigene Zeitgrenze, verständliche Meldungen für Netzwerkfehler und
  Abbruch. Rohe Serverbrocken landen im Protokoll, nicht am Bildschirm.

**Test:** `fp70` (83/83) in echtem Chromium – elf schlechte Antworten
(leer, ein Schenkel, Länge 0, negativ, Text, `null`, kein Array,
Serverfehler, HTTP 500, unlesbar, leer) übernehmen ausnahmslos nichts
und lassen das Profil stehen; Netzwerkfehler und Zeitüberschreitung
ebenso. Gegenprobe (Sofortübernahme wie vorher): 15 Fehlschläge.

### 78.6 Feedback 4 · Rinne Halbrund „Maximalmasse ausnutzen"

**Zustand vorher:** `calcDilaPositionsInStretch()` sucht bereits die
**kleinste** Anzahl Teilstrecken. Für 18 m bei 6 m Maximum: 3 Abschnitte
à 6.0 m, 2 Dilas – exakt der geforderte Fall. **Keine Codeänderung
nötig**, aber bisher durch keinen Test abgesichert.

**Änderung:** neuer Prüfstand `dila70` (85/85). Er prüft den Pflichtfall
und rechnet die minimale Dila-Zahl unabhängig nach
(`lm + (k−2)·mm + rm ≥ L`), statt die Erwartung aus dem geprüften Code
abzuschreiben. Dazu Fixpunkte, Schiebestutzen, mehrere Segmente, alle
drei Materialien und Grenzfälle. Gegenprobe (eine Dila mehr): 33
Fehlschläge.

Beim Schreiben zeigten sechs meiner eigenen Erwartungen in Abschnitt C
zu wenige Dilas – **der Code hatte recht, mein Testwert war falsch**;
korrigiert und durch die unabhängige Nachrechnung ersetzt.

### 78.7 Feedback 5 · Einlaufblech gerade: Längen aus Rinne Halbrund

**Zustand vorher:** die Übernahme gab es nur bei Einlaufblech **konisch**
(`js/14`, eigene Fassung).

**Änderung:** die Bausteine liegen jetzt einmal in `js/13`
(`ladeRinneHalbrundMassaufnahmen`, `baueEinlaufblechStueckeAusRinne`,
`zeigeRinneUebernahmeListe`, `teileLaengeInStuecke`) und werden von
**beiden** Arten benutzt. Einlaufblech gerade bekommt denselben
Abschnitt „↩️ Stücke aus Rinne Halbrund übernehmen", mit **seinen
eigenen** Einstellungen (Überlappung 30 statt 40). Bestehende Stücke
werden nur nach ausdrücklicher Bestätigung ersetzt; eine spätere
Änderung der Rinne verändert bereits übernommene Längen nicht.

**Test:** `ebg70` (49/49). Die erste Gegenprobe blieb still grün – der
Prüfstand rief die Bausteine direkt auf statt den Formularweg. Nach dem
Nachschärfen („Formularweg nutzt die Einstellungen von gerade (2030)")
schlägt sie korrekt fehl. **Zweiter Fall in dieser Sitzung, in dem ein
Prüfstand nur seine eigene Annahme bestätigt hätte.**

### 78.8 Feedback 6 · „Alle Pflichtfelder mit rotem Stern"

**Inventar:** Pflicht ist ein Feld, wenn das Speichern ohne es abbricht.
Aus allen Abbruchprüfungen ergeben sich **37 Felder** in 13 Bereichen
(Anmeldung, Erstpasswort, Firmenregistrierung, Mitarbeiter, Projekt
anlegen, Projekt-Stammdaten, Massaufnahme, Einlaufblech gerade/konisch,
Lukarne, Ort-/Seitenbleche, Einfassung Rund, Kehle, Ausmass,
Regierapport, Einstellungen). Optionale Felder bleiben unmarkiert.

**Umsetzung:** die Felder tragen `data-pflicht="1"`; `markierePflicht­felder()`
(`js/01-basis.js`) setzt zentral `required`, `aria-required` und hängt
den roten Stern ins Label – nie in den Eingabewert, also vom Benutzer
nicht eintippbar. Das Label bekommt zusätzlich ein ausgeschriebenes
`aria-label` („… (Pflichtfeld)"), weil ein Stern einem Screenreader
nichts sagt. Die Massfelder der Ort-/Seitenbleche entstehen erst zur
Laufzeit und rufen die Funktion für ihren Bereich selbst nochmals auf.
Die alten Texte „(Pflichtfeld)" sind entfallen.

**Der Stern trägt `no-print`** – im gedruckten Regierapport hat er
nichts verloren; dort stand vorher auch der Hinweistext schon als
`.no-print`. Dadurch musste `css/03-druck.css` nicht angefasst werden.

**Test:** `required70` (359/359) in echtem Chromium: je Feld wird
gemessen, dass der Stern existiert, **rot** ist (R deutlich über G und B
und anders als die Labelfarbe), fett, mindestens 12 px, dass `required`
und `aria-required` gesetzt sind und dass nichts davon im Eingabewert
steht. Elf optionale Felder als Gegenprobe. Die erste Fassung der
Farbprüfung war zu lasch (eine graue Farbe wäre durchgegangen) – nach
dem Nachschärfen meldet die Gegenprobe 72 Fehlschläge.

### 78.9 Feedback 7 · Offline-Funktion

**Zustand vorher, ehrlich geprüft:** der Service Worker hält nur die
App-Hülle. Ohne Netz startete die App zwar, aber `loadAllData()` lieferte
für jede Abfrage `null` – und der Code machte daraus stillschweigend
leere Listen. **Ein Projekt, das es gibt, sah aus wie „keine Projekte".**
Speichern brach mit einer rohen Netzwerkmeldung ab.

**Umsetzung (klar abgegrenzt, neues Modul `js/27-offline.js`):**

| Geht offline | Geht offline nicht |
|---|---|
| App starten und bedienen | Speichern (Projekt, Massaufnahme, Ausmass, Regierapport, Feedback) |
| zuletzt geladene Stammdaten ansehen: Projekte, Material, Ansätze, Blitzschutz-Katalog, Massaufnahme-Materialien, Firmeneinstellungen | Fotos/Skizzen hochladen, PDF mit Fotos |
| **alle** Rechenmodule (elf Arten, Kehle, Rinne, Lukarne, Einfassung, Anschlussblech) | Anmelden ohne bestehende Sitzung, Datenbanksuche, Verlauf, System-Administration |

- Der lokale Zwischenspeicher gehört **genau einer Firma** und wird beim
  Abmelden und bei jedem Firmenwechsel geleert. Fragt eine andere Firma
  danach, wird nichts herausgegeben **und** der Rest sofort gelöscht.
- Ein deutlicher Hinweis nennt die fehlende Verbindung und den Stand der
  angezeigten Daten.
- Eine zentrale Sperre `offlineSperrtSpeichern()` an allen fünf
  Speicherwegen: klare Absage statt kryptischer Netzwerkmeldung, mit dem
  Hinweis, dass die Eingaben im Formular stehen bleiben.

**Bewusst NICHT gebaut:** Warteschlange, eigene IDs, Wiederholung,
Konfliktlösung, Synchronisation. Halb umgesetzt wäre das gefährlicher
als gar nicht – der Auftrag lässt diese Abgrenzung ausdrücklich zu.

**Test:** `offline70` (105/105): App-Hülle vollständig im Cache (jede
der 29 JS-Dateien, jede eingebundene Datei, Cache-Version = App-Version),
Firmentrennung des Zwischenspeichers, Hinweis, Sperre an allen fünf
Wegen, Rückfall beim Laden, und drei Rechnungen (Kehle, Dila, Einfassung)
laufen offline weiter. Zwei Gegenproben (Fremdfirma lesbar / Sperre
wirkungslos): 2 bzw. 4 Fehlschläge.

### 78.10 Feedback 8 · „Zu jedem Modul die Möglichkeit Fotos einzufügen"

**Zustand vorher:** Foto und Skizzen gab es nur bei „Skizze / Foto"; die
zehn übrigen Arten schrieben fest `photo_path:null, sketch_paths:[]`.
Beim Ausmass hingen die Fotos im Abschnitt „Offerte erfassen", das
Blitzschutzausmass hatte keine.

**Umsetzung – ein Baustein, keine elf Kopien:**
- Der Foto-/Skizzenblock liegt jetzt **einmal** ausserhalb aller
  Typ-Abschnitte (`#measMedienBereich`) und ist bei jeder Art sichtbar.
- `measMedienAusFormular()` liefert die Medien; alle zwölf Rückgabe­
  zweige nutzen sie.
- Das Hochladen ist nicht mehr auf `skizze_foto` begrenzt.
- Der PDF-Druck holt die signierten URLs für jede Art und hängt Foto und
  Skizzen einheitlich ans Dokument.
- Ausmass: Fotos für **beide** Arten (`#amMedienBereich`); die
  KI-Positionserkennung bleibt der Offerte vorbehalten.

**Sicherheit unverändert:** derselbe private Pfad
`measurements/<projectId>/<measurementId>/photo|sketches`, dieselbe
Storage-Positivliste aus v2.48, signierte URLs, kein `getPublicUrl`,
kein `company_id` im Client.

**Nicht umgesetzt:** Fotos im **Regierapport**. Dafür gibt es weder
Spalten noch Storage-Anbindung; es wäre eine Schemaänderung plus ein
Eingriff in die ausdrücklich geschützte Rapport-Drucklogik. Ebenso
weiterhin **keine Fotos im Ausmass-PDF** – die gab es dort auch vorher
nicht (Abschnitt 61.11).

**Test:** `fotos70` (88/88): jede der elf Arten zeigt den Bereich und
trägt Foto und beide Skizzen im Payload; ohne Medien bleibt es bei
`null`/leer. Gegenprobe (Upload wieder auf `skizze_foto` begrenzt):
1 Fehlschlag.

### 78.11 Feedback 9 · Einfassung Rund: „Anzahl bleilappen nicht korrekt"

**Ursache:** `Math.floor((π·D)/Lattenabstand)`. Abrunden lässt einen
Rest des Umfangs **unbedeckt**: ein 200er Rohr hat 628 mm Umfang, bei
330 mm Lattenabstand ergab die Rechnung **1** Lappen – ein Lappen kann
628 mm nicht abdecken. Dazu verschwand die Zeile ganz, wenn der
Durchmesser fehlte, und ein leerer Lattenabstand führte über
`Math.max(1, 0)` zu absurden Zahlen.

**Änderung:** `Math.ceil` statt `Math.floor` (eine Deckungszahl muss
aufrunden), `Number.isFinite`-Schutz, und ohne Lattenabstand gibt es
**keine erfundene Zahl**, sondern „–" plus einen Hinweis. Die Zeile
bleibt immer stehen, damit sichtbar ist, *warum* keine Zahl kommt.

**Test:** `einf70` (185/185): für zwölf Durchmesser × sechs
Lattenabstände wird geprüft, dass die Lappen den Umfang decken **und**
kein Lappen zu viel gerechnet wird; dazu fehlende Angaben, NaN/Infinity
und die Gleichheit von Formular, Zusammenfassung und PDF (eine einzige
Rechnung). Gegenprobe (`floor`): 63 Fehlschläge.

### 78.12 Regression

Alle 30 bestehenden Prüfstände grün, dazu die neun neuen:
mad70 45/45, dila70 85/85, einf70 185/185, ebg70 49/49,
feedback70 47/47, required70 359/359, fotos70 88/88, fp70 83/83,
offline70 105/105. Ausserdem pdf52 504/504, rinne57 379/379,
kehle52 698/698, feedback63 108/108, required-nahe Prüfstände
einst68 43/43, module67 42/42, abstand69 2/2 und alle übrigen ohne
Fehlschlag.

`node --check` über alle 29 `js/*.js` und `sw.js`: fehlerfrei.
`<div>`/`</div>` in `index.html`: ausgeglichen (724/724, vorher 702/702).
Keine doppelten Element-IDs. Version 2.70 in `index.html` und `sw.js`.

**Regierapport nachweislich unverändert:** der Druck wurde in echtem
Chromium unter `media:print` gegen den v2.69-Stand gerendert. Der
Druck-DOM unterscheidet sich in genau zwei Zeilen – dem Pflichtfeld-
Kennzeichen des Projektfelds, beide Fassungen `no-print`. Das **Bild
ist byteidentisch**, sobald die Versionsnummer angeglichen wird (gleiche
Methode wie in Abschnitt 62.4).

Drei überholte Erwartungen in bestehenden Prüfständen wurden angepasst,
keine davon war ein Codefehler: `FEEDBACK_SPALTEN` heisst jetzt
`feedbackSpalten()`, es gibt sechs statt fünf Sortierungen (Firma kam
dazu) und zwei Sortierleisten statt einer.

### 78.13 Datenbestand PETER KÜNZI AG

Vor und nach der Arbeit: 2 Firmen, 13 Profile, 5 Projekte,
16 Massaufnahmen, 2 Ausmasse, 4 Rapporte, 1 Projektdatei, 14 Feedbacks
(4 erledigt), 21 `audit_log`-Zeilen, 14 Storage-Objekte, 1 System-Admin,
`companies.updated_at` unverändert (`2026-09-01 07:40:15.844647+00`).
Alle schreibenden Tests liefen in `begin; … rollback;` mit Wegwerf-Firmen.
Einzige echte Schreibvorgänge: die Migration und der Edge-Function-Deploy.

`get_advisors(security)` nach den Änderungen: die beiden neuen Funktionen
erscheinen nur mit derselben erwarteten Warnung wie alle übrigen
`system_admin_*`-Funktionen („von `authenticated` aufrufbar, Prüfung
liegt in der Funktion"). Keine neue Art von Warnung, keine fehlende RLS.

### 78.14 Geänderte Dateien

| Datei | Warum |
|---|---|
| Migration `feedback_operator_view_v2_70` | FK auf SET NULL, zwei Betreiber-Funktionen |
| Edge Function `extract-profile-shape` v4 | harte Prüfung, Zeitgrenze, ehrliche Absage |
| `supabase/functions/extract-profile-shape/Index.ts` | **neu** – Quelle jetzt im Repo |
| `js/27-offline.js` | **neu** – Offline-Modul |
| `js/01-basis.js` | `markierePflichtfelder()` |
| `js/02-feedback.js` | zwei Ansichten, Betreiber-Abfrage, Ergebnisprüfung |
| `js/03-login.js` | Abmelden räumt den Zwischenspeicher |
| `js/05-daten-laden.js` | Rückfall auf gesicherte Daten, Offline-Hinweis |
| `js/08-katalog-blitzschutz.js` | **eine Zeile** Offline-Sperre |
| `js/09-projekte.js` | Offline-Sperre |
| `js/10-massaufnahme.js` | Biegewinkel laden/zurücksetzen, Rinnenliste |
| `js/12b-mauerabdeckung.js` | Biegewinkel als Eingabe |
| `js/13-einlaufblech-konisch.js` | gemeinsame Rinnen-Bausteine |
| `js/14-freies-profil.js` | Vorschau und Härtung der Erkennung |
| `js/15-einlaufblech-stueckliste.js` | Rinnen-Übernahme für gerade |
| `js/16-massaufnahme-formular.js` | Medien für jede Art, PDF, Offline-Sperre |
| `js/17-ausmass.js` | Fotos für beide Arten, Offline-Sperre |
| `js/18-app-start.js` | Pflichtfelder markieren |
| `js/20-anschlussblech.js` | Mass a als Pflichtfeld |
| `js/21-einfassung-rund.js` | Bleilappen aufrunden, ehrliches „–" |
| `js/22-system-admin.js` | Feedback aller Firmen einbinden |
| `index.html`, `css/01-basis.css`, `sw.js` | Markup, Stile, Version 2.70 |

**Nicht angefasst:** `js/06-rapport.js`, `css/03-druck.css`,
`js/11`, `js/12`, `js/19`, `js/23`–`js/26`, `js/04`, `js/05a`, `js/07`.

### 78.15 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`,
  wie in jeder vorherigen Sitzung. **Das wird ausdrücklich nicht als
  getestet behauptet.** Geprüft ist die Datenbankseite per SQL gegen das
  echte Produktivschema und die Oberfläche in echtem Chromium.
- **Die KI-Erkennung wurde nicht mit einer echten Skizze gegen Gemini
  getestet** – dafür bräuchte es einen echten Aufruf der Edge Function.
  Geprüft ist der gesamte Weg mit gestellten Antworten, inklusive elf
  schlechter Fälle.
- **Offline: keine Erfassung.** Neue Einträge brauchen weiterhin eine
  Verbindung (78.9). Eine echte Warteschlange bleibt ein eigener,
  grösserer Auftrag.
- **Fotos im Regierapport** und **Fotos im Ausmass-PDF**: nicht gebaut,
  Begründung in 78.10.
- **Bleilappen:** korrigiert wurde das nachweisbar falsche Abrunden. Ob
  der Umfang wirklich durch den **Lattenabstand** zu teilen ist (statt
  durch eine Lappenbreite), ist eine fachliche Festlegung des Betriebs –
  die Formel wurde nicht eigenmächtig ausgetauscht. Falls hier eine
  andere Regel gilt, genügt eine Zeile in `einfBerechnen()`.
- Aus früheren Runden unverändert offen: leere `allowed_mime_types` am
  Bucket, Massaufnahme ohne Projekt kann kein Foto speichern, fehlender
  `search_path` bei zwei Storage-Hilfsfunktionen, 9 verwaiste
  Storage-Objekte (v2.24), Leaked-Password-Protection deaktiviert.

## 79. RINNE HALBRUND NEU ERFASST + NORMLÄNGEN — VERSION 2.71

Die Massaufnahme **Rinne Halbrund** wird nicht mehr als Segmenttabelle mit
Anschlusstyp-Spalten erfasst, sondern so, wie draussen gemessen wird:
Abschnitt · Übergang · Abschnitt. Dazu kommen Rinnenhalter, Rinnenboden,
ein automatisches Ausmass und die Berechnung der nötigen Normlängen mit dem
geringsten Verschnitt.

Grundlage ist der Prototyp aus `prototyp/` (Branch
`feature/prototype-rinne-halbrund`, Abschnitte in `prototyp/README.md`).
Wie dort von Anfang an gefordert: **Weiterentwicklung des bestehenden
Moduls, keine Parallellösung.**

### 79.1 js/12-rinne-halbrund.js bleibt unverändert

Die Fachrechnung wird nicht angefasst – nicht eine Zeile. `calcRinneSegment`,
`computeRinneBoundaries`, `calcDilaPositionsInStretch`, `calcRinneDilas`,
`berechneRinneStueckliste`, `generateRinneGrundriss` und
`rinneMaterialTabelle` rechnen weiter wie bisher.

Die Brücke sind seine eigenen Variablen: `raBruecke()` (js/28) setzt vor
jeder Rechnung `rinneSegments` und `rinneDilas` aus dem erfassten Verlauf
und schreibt Material und Grösse in die beiden alten Formularfelder. Die
zehn Elemente, die js/12 beim Laden erwartet, stehen weiterhin im HTML –
jetzt als unsichtbarer Block `#rinneStummel`. Dadurch konnte js/12
byteweise unverändert bleiben und ist weiterhin die einzige Fachquelle.

### 79.2 Der Übergang IST die Segmentgrenze

Erfasst wird eine Kette aus Abschnitten und Übergängen. Ein Übergang trägt
**entweder** eine Ecke **oder** einen Stutzen, ausgewählt in einer einzigen
Liste (gerade / Aussenwinkel / Innenwinkel / Einhängestutzen /
Schiebestutzen). Vier gleichwertige Knöpfe hängen an: ＋ Rinnenabschnitt,
＋ Ecke, ＋ Einhängestutzen, ＋ Schiebestutzen.

Daraus folgt unmittelbar, dass jedes Element **ab dem Abschnitt davor**
vermasst ist und nicht ab START – so, wie draussen gemessen wird. Und weil
der Übergang genau die Segmentgrenze des bestehenden Moduls ist, muss für
die Rechnung nichts geteilt oder umgerechnet werden.

| Element | Anschlusstyp | Wirkung |
|---|---|---|
| Aussenwinkel | AE90 | Fixpunkt |
| Innenwinkel | IE90 | Fixpunkt |
| Einhängestutzen | ABL | **Fixpunkt** – teilt die Dila-Berechnung |
| Schiebestutzen | SS | **kein** Fixpunkt, wirkt wie ein Dehnungselement |
| Rinnenboden links/rechts | BD | am ersten/letzten Grenzpunkt |

**Der Rinnenboden ist der Anschlusstyp am äussersten Grenzpunkt.** Dadurch
rechnet `berechneRinneStueckliste()` sein Mass ohne eine Zeile neuer
Fachlogik in den Zuschnitt des ersten und letzten Stücks. Die
Dila-Berechnung bleibt unberührt, weil der Boden weder Fixpunkt noch
Schiebestutzen ist.

**Die Katalog-IDs stehen NICHT im Code.** `rinne_fitting_types` ist
firmenbezogen, die IDs sind je Firma verschieden – und eine frisch
registrierte Firma hat **gar keinen** Katalog (per SQL geprüft: von zwei
Firmen hat genau eine einen). `raTypFuer()` sucht deshalb zuerst über das
Symbol (AE90/IE90/ABL/SS/BD), ersatzweise über die fachliche Eigenschaft
(`is_fixpunkt` + Vorzeichen von `angle_deg`, `is_schiebestutzen`). Fehlt
ein Typ, sagt das Formular das ausdrücklich und rechnet an dieser Stelle
keinen Fixpunkt – statt eine ID zu erfinden.

### 79.3 Dehnungselemente von Hand

Die Zuschnitt-Tabelle im Formular ist editierbar: der Abstand jeder
Dila-Zeile lässt sich überschreiben, Zeilen lassen sich hinzufügen und
löschen, und „↻ Zurück zur Berechnung" stellt die Automatik wieder her.
Ab dem ersten Eingriff bleibt die Handliste stehen, auch bei geänderter
Länge oder anderem Material – das steht ausdrücklich am Bildschirm und im
PDF. Eine Position ausserhalb der Rinne ist ein **Fehler** und wird nicht
still zurechtgerückt.

### 79.4 Normlängen und Verschnitt

Neue Firmeneinstellung `app_settings.rinne_normlaengen` (jsonb, Migration
`app_settings_rinne_normlaengen_v2_71`), Form
`{"<material_id>|<groesse>":[laengen_mm]}`. Einzutragen unter
**Einstellungen → Massaufnahmen → Rinne**, je Material und Rinnengrösse,
in Metern.

Ausgelieferte Vorgabe nach Angabe des Betreibers:

| Material | 200 | 250 | 330 | 400 |
|---|---|---|---|---|
| Stahl verzinkt | 6 m | 6 m | 6 m | 6 m |
| Kupfer | 6 m | 4/5/6 m | 4/5/6 m | 6 m |
| CrNi-Stahl | 6 m | 5/6 m | 5/6 m | 6 m |
| Titanzink | 6 m | 5/6 m | 4/5/6 m | **–** |

**Nicht angegeben und deshalb bewusst leer**: Titanzink 400, Chromstahl
verzinnt, Aluminium. Dort wird der Materialbedarf **nicht** gerechnet und
das auch so gesagt – es würde sonst auf einer geratenen Stangenlänge
beruhen.

Rechenweg (`raNormPlan`): zuerst eine gierige Lösung als Obergrenze, danach
alle Stangen-Kombinationen mit kleinerer oder gleicher Gesamtlänge der
Reihe nach; die erste, die aufgeht, hat den kleinsten Materialeinsatz und
damit den geringsten Verschnitt – die Summe der Stücke ist ja fest.
Mehrere Stücke dürfen aus derselben Stange kommen. Reicht das Suchbudget
nicht, wird die gierige Lösung zurückgegeben und ausdrücklich **nicht** als
beste ausgewiesen. Zuschnitte, die länger sind als die längste Normlänge,
werden gemeldet statt stillschweigend weggelassen.

### 79.5 Gespeichert wird ein Superset – alte Datensätze bleiben lesbar

`js/16` schreibt **unverändert** dieselben Felder wie bisher
(`rinneAbwicklung`, `material`, `segments`, `gesamtlaenge`, `dilas`,
`boundaries`, `stueckliste`, `dilaMass`) und ergänzt sie nur:
`groesse`, `gesamtlaengeManuell_mm`, `halter`, `rinnenboden`, `dehnung`,
`dilasManuell`, `ausmass`, `normlaengen`, `normplan`. `segments[i].stutzen`
reist als zusätzliches Feld mit.

Die vier real vorhandenen `rinne_halbrund`-Aufnahmen (IDs 6, 8, 9, 12;
eine davon ohne `material`/`boundaries`/`dilas`) öffnen dadurch unverändert.
`raAusData()` liest `groesse` aus `rinneAbwicklung`, wenn es fehlt, und
**erfindet keinen Rinnenboden**: eine alte Aufnahme hat keinen erfasst, also
steht er auf „nicht vorhanden". Der bestehende Druckzweig ist rein additiv
erweitert (Rinnenhalter, Rinnenboden, Ausmass, Normlängen); der
Normlängen-Abschnitt druckt den **gespeicherten** Plan, damit ein einmal
gedrucktes Blatt gleich bleibt, auch wenn die Normlängen später geändert
werden.

### 79.6 Register wie in der Testapp

Die Erfassung führt durch **sechs Register**, wie die Testapp:

| Nr. | Register | Inhalt |
|---|---|---|
| 1 | Grunddaten | Material, Rinnengrösse, gemessene Gesamtlänge |
| 2 | Rinnenverlauf | Abschnitte und Übergänge, Verlaufsband, Grundriss |
| 3 | Komponenten | Halter, Rinnenboden, Dehnung |
| 4 | Kontrolle | Plausibilität und Zusammenfassung |
| 5 | Ausmass | Ausmass und Materialübersicht |
| 6 | Zuschnitt | Stückliste und Normlängen/Verschnitt |

Immer nur ein Register ist sichtbar; dazu „‹ Zurück" und „Weiter › …".
Die Daten liegen **ausschliesslich im Modell `rinneA`**, nicht im Formular –
ein Registerwechsel kann deshalb nichts verlieren; im Prüfstand wird das
ausdrücklich nachgemessen (durch alle Register blättern und danach das
Modell vergleichen).

Das Register **Kontrolle trägt einen Punkt**, sobald es dort etwas zu
sehen gibt (rot bei einem Fehler, orange bei einem Hinweis) – sonst müsste
man das Register aufsuchen, um zu merken, dass etwas fehlt.

Die Registerleiste scrollt auf schmalen Geräten seitwärts; das aktive
Register wird dabei in den sichtbaren Bereich gerückt. Gemessen wird das
über die tatsächlichen Rechtecke (`getBoundingClientRect`), **nicht** über
`offsetLeft` – das bezieht sich auf den `offsetParent` und nicht auf die
Leiste; mit `offsetLeft` war die Rechnung falsch, und der Prüfstand hat es
gefunden.

Ein ursprünglich gestapelter Aufbau (alle Abschnitte untereinander, wie bei
den zehn anderen Arten) war der erste Entwurf; der Betreiber hat die
Register-Führung der Testapp ausdrücklich verlangt.

Fotos, Skizze, Bezeichnung, Datum, Projekt und PDF kommen weiterhin aus der
App – der Prototyp brachte dafür eigene Lösungen mit, die hier bewusst
nicht übernommen wurden.

**Verdrahtet wird aus `renderRinneAufnahme()` heraus**, nicht nur beim
Zurücksetzen/Füllen: `showMeasTypeSection()` zeichnet das Formular auch,
ohne vorher eines von beiden aufzurufen – auf diesem Weg war die Bedienung
sichtbar, aber tot. `raVerdrahten()` merkt sich, dass es schon lief.
Gefunden wurde das nicht durch Nachdenken, sondern weil ein Bildschirmfoto
dem Prüfstand widersprach.

### 79.7 Getestet

- **`pruefstaende/pruefstand-rinne-app-v2-71.js` – 99/99**, echtes Chromium
  gegen die echte `index.html` mit den echten Katalogwerten der
  Produktivdatenbank: Modul verdrahtet, Brücke zu js/12 (Abschnitte,
  Fixpunkt-IDs, Rinnenboden an beiden Enden, Material/Grösse in den alten
  Feldern), Dehnungselemente bei 4 000 und 10 000 mm, Zuschnitte
  3835/2835/2835/3335, Normlängenplan 14 000 mm mit 1 160 mm Verschnitt,
  Speichern liefert alle acht bisherigen **und** alle acht neuen Felder,
  ein alter Datensatz öffnet unverändert, Dilas von Hand, fehlender Katalog
  wird gemeldet statt still falsch gerechnet, Speichern → Wiederöffnen
  ergibt denselben Verlauf, die sechs Register (nur eines sichtbar, Blättern,
  nichts geht beim Wechseln verloren, Markierung der Kontrolle, aktives
  Register bleibt sichtbar), fünf Bildschirmbreiten **je Register** ohne
  seitliches Scrollen, keine JS-Fehler.
- **`pruefstaende/pruefstand-verschnitt-app.js` – 1 578/1 578**: die
  Verschnitt-Rechnung der App gegen eine **unabhängige, vollständige
  Suche**, die stur alle Stangen-Kombinationen und Zuordnungen durchprobiert
  – für kleine Fälle beweisbar das Optimum. 120 Zufallsfälle, dazu
  Handrechnungen, zu lange Stücke, fehlende Normlänge und ein Fall mit 24
  Zuschnitten. Bei jedem Plan wird nachgerechnet, dass keine Stange
  überladen ist, jedes Stück genau einmal vorkommt und Gesamtlänge und
  Verschnitt zur Stückliste passen.
- **Gegenproben** (jede baut einen Fehler ein und muss den Prüfstand
  umwerfen): Brücke setzt `rinneSegments` nicht → Abbruch · Rinnenboden
  nicht an die Enden → 2 · Stutzen geht beim Speichern verloren → 5 ·
  Zusatzfelder werden nicht gespeichert → 18 · alter Datensatz erfindet
  einen Rinnenboden → 2 · fehlender Katalog wird verschwiegen → Abbruch ·
  alle Register auf einmal statt geführt → 7 · Registerwechsel setzt das
  Modell zurück → Abbruch · Kontroll-Register wird nie markiert → 2 ·
  geöffnete Aufnahme bleibt auf dem alten Register → 2 · Verdrahtung nur
  beim Zurücksetzen → Abbruch · Registerleiste scrollt nicht mit → 3.
- **Zwei echte Fehler kamen dabei heraus**, nicht aus dem Nachdenken:
  (1) die gespeicherten `segments` verloren das Feld `stutzen`, ein
  wiedergeöffneter Datensatz hätte seine Stutzen eingebüsst;
  (2) eine Sammelumbenennung hatte `raHalterAnzahl` zu `raHalterAnraZahl`
  verstümmelt; (3) nach `showMeasTypeSection()` allein war das Formular
  sichtbar, aber nicht bedienbar; (4) die Registerleiste rückte das aktive
  Register nicht ins Bild, weil `offsetLeft` sich nicht auf die Leiste
  bezieht. Alle behoben und je mit einer Gegenprobe abgesichert.
- **Volle App-Regression grün**: pfade55 38/38, required70 359/359,
  kehle52 698/698, kehleintegration52 76/76, rinne57 379/379,
  breite52 52/52, breite57 84/84, einf70 185/185, offline70 107/107,
  feedback63 108/108, freipos65 99/99, dila70 85/85, fotos70 88/88,
  fp70 83/83, mad70 45/45, ebg70 49/49, feedback70 47/47,
  einstbrowser68 47/47, einst68 43/43, module67 43/43,
  medien50 42/42, adresse45 39/39, dateien49 38/38, projekte47 37/37,
  status46 35/35, auswahl48 32/32, modulebrowser67 16/16,
  suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2 sowie nav,
  stand42, dateien43, suche40, treffer40, recent41 ohne Fehlschlag.
- **Die Tabellen der Rinnen-Aufnahme mussten `min-width` ausdrücklich
  zurücksetzen** (`.eb-table.ra-tab{min-width:0}`). Die globale Grundregel
  `table{min-width:1000px}` in `css/01-basis.css` ist für die breiten
  Stücklisten gedacht und hätte in der Normlängen-Tabelle ausgerechnet die
  Spalte „Zuschnitte" aus dem Bild geschoben – gemessen, nicht vermutet
  (dieselbe Falle wie in Abschnitt 60.5).
- `node --check` über alle 29 `js/*.js` und `sw.js`: fehlerfrei.
  `<div>`/`</div>` in `index.html` ausgeglichen (721/721), keine doppelten
  Element-IDs, `js/28-rinne-aufnahme.js` in der Service-Worker-Liste.
- **`module67` hatte eine überholte Erwartung** („genau vier Aufrufstellen
  nutzen `speichereAppSettings`") – durch die zwei neuen Normlängen-Knöpfe
  sind es sechs. Die Prüfung testet jetzt die Eigenschaft (jeder
  app_settings-Schreibzugriff geht über den Helfer) statt eine Zahl.

### 79.8 Datenbestand

Migration `app_settings_rinne_normlaengen_v2_71` angewandt (eine additive,
nullable jsonb-Spalte). PETER KÜNZI AG danach unverändert: 2 Firmen, 16
Massaufnahmen (davon 4 `rinne_halbrund`), `rinne_dila_mass_mm` weiterhin
−165, `rinne_normlaengen` NULL, `app_settings.updated_at` unverändert
(`2026-08-31 11:34:28.805+00`) – ein `ALTER TABLE … ADD COLUMN` löst keine
Zeilentrigger aus. Sonst wurde **nicht** in die Datenbank geschrieben, nur
gelesen.

### 79.9 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert weiterhin
  jede ausgehende HTTPS-Verbindung zu `nfgryuzkpwjfmdlmevuy.supabase.co`.
  **Das wird ausdrücklich nicht als getestet behauptet.** Geprüft ist die
  Oberfläche in echtem Chromium gegen die echte `index.html` (die
  Supabase-Bibliothek wird dabei durch eine Attrappe ersetzt, gerechnet
  wird ausschliesslich mit dem echten Code) und die Datenbankseite per SQL.
- **Der Verschnitt rechnet ohne Schnittfuge und ohne Reststücke-Lager.**
  Die Scheren-/Sägebreite ist nicht abgezogen, und ein Rest aus einer
  früheren Stange wird nicht wiederverwendet.
- Bei sehr vielen Zuschnitten wird nicht jede Möglichkeit durchgerechnet;
  das Ergebnis heisst dann „beste gefundene Kombination", nicht „optimal".
- **Eine frisch registrierte Firma hat keinen Anschlusstyp-Katalog.**
  `register-company` legt Auth-User, Firma, Profil und `app_settings` an,
  aber keine `rinne_fitting_types`. Das Formular meldet das jetzt
  ausdrücklich; ein „Standardtypen anlegen"-Knopf wäre die naheliegende
  Ergänzung und ist bewusst nicht Teil dieser Runde.
- Die alte Segmenttabelle ist aus der Oberfläche verschwunden, der
  unsichtbare `#rinneStummel` bleibt als Aufhänger für js/12 stehen. Ihn
  aufzulösen hiesse, js/12 anzufassen – bewusst nicht getan.

## 80. RINNE HALBRUND: DEHNUNGSELEMENTE SICHTBAR — VERSION 2.72

Rückmeldung des Betreibers: *"dilas werden nur im hintergrund berechnet,
das ist nicht so wie in der testapp"*. Zutreffend – nachgemessen, nicht
angenommen. **Keine Schemaänderung, keine Migration, keine Rechnung
verändert**; `js/12-rinne-halbrund.js` ist weiterhin byteweise identisch.

### 80.1 Was tatsächlich fehlte (im Browser gemessen)

Register 3 und die Verlaufsdarstellung wurden gegen die Testapp
verglichen. Die Rechnung war vorhanden und richtig, die **Anzeige** nicht:

| Testapp | App vor v2.72 |
|---|---|
| Legende unter dem Verlaufsband, u. a. „◆ zusätzlich berechnetes Dehnungselement" | **fehlte** – die Rauten waren die einzige unbeschriftete Marke im Band (Ecke, E1/FIX und S1/DEHNT tragen alle eine Beschriftung) |
| eigene Karte „Rinnenboden und Dehnung" | Dehnung lag als eines von sieben Feldern in einer Reihe, der Satz zur Anzahl stand am Ende eines Absatzes über links/rechts |
| Knopf „Übernehmen" (Anzahl → Dehnungsstücke) | **fehlte** |
| Verweis „die Positionen stehen in Schritt 6 · Zuschnitt" | **fehlte** |
| eigene Karte „Stutzen" mit Anzahl und Rückweg | **fehlte** |

Die anpassbaren Positionen in Register 6 (Feld je Dila-Zeile,
„＋ Dehnungselement von Hand", „↻ Zurück zur Berechnung") gab es bereits
seit v2.71 – nur wies nichts darauf hin.

### 80.2 Umgesetzt

- **Register 2**: Legende unter dem Verlaufsband, wörtlich wie in der
  Testapp, mit dem Zeichen der Raute.
- **Register 3** in drei Karten geteilt, wie in der Testapp:
  „3 · Rinnenhalter", „Rinnenboden und Dehnung", „Stutzen".
- Im Dehnungs-Block steht jetzt **jede berechnete Position einzeln**
  („Dehnungselement 1 bei 4'667 mm ab START"), dazu die Anzahl und ob sie
  gerechnet oder von Hand gesetzt ist. Das geht über die Testapp hinaus,
  die dort nur die Anzahl nennt – die Positionen sind der eigentliche
  Punkt der Rückmeldung.
- Knopf **„Als Dehnungsstücke übernehmen"** (`ra_dehnungUebernehmen`)
  setzt `dehnung.art` und `dehnung.anzahl` auf die berechnete Zahl –
  dieselbe Zahl, nur damit sie im Ausmass als Position erscheint.
  **Es wird nichts neu gerechnet.**
- Knopf **„Positionen anpassen (6 · Zuschnitt)"** und im Stutzen-Block
  **„↩︎ Zum Rinnenverlauf"** – ein gemeinsames `data-ra-zu="<n>"`, das
  über das bestehende `raSetzeSchritt()` läuft.
- Ohne Dehnungselement steht ausdrücklich „0 – für <Material> ist bei
  diesem Verlauf kein zusätzliches Dehnungselement nötig", der
  Übernehmen-Knopf fehlt dann, und es wird **keine Position erfunden**.

### 80.3 Rechnung unverändert

`raBruecke()` übergibt weiterhin dieselben Positionen an
`js/12-rinne-halbrund.js`; im Prüfstand direkt gegen
`raDilasGerechnet()` verglichen. Der Zuschnitt, die Fixpunkt-Logik, der
Rinnenboden am äussersten Grenzpunkt und der Verschnitt sind nicht
berührt.

### 80.4 Getestet

Neuer Prüfstand `pruefstaende/pruefstand-dila-sichtbar.js` (**57/57**),
echtes Chromium gegen die echte `index.html`: Legende, die drei Karten,
Anzahl und jede Position, Übernehmen (Art, Anzahl, Feld erscheint,
Ausmass zieht nach), Sprung in Register 6, Anpassen von Hand → Register 3
sagt „Von Hand festgelegt" und zeigt die neue Position, „Zurück zur
Berechnung" stellt 4667/9333 wieder her, ehrliche Anzeige ohne
Dehnungselement, Brücke zu js/12 unverändert, Stutzen-Zähler, keine
JS-Fehler, fünf Bildschirmbreiten × drei Register ohne seitlichen
Überlauf.

**Fünf Gegenproben**, jede baut einen Fehler ein und wirft den Prüfstand
um: Legende entfernt (3), Positionen nicht aufgelistet (3), Übernehmen
schreibt die falsche Zahl (1), Sprungknöpfe wirkungslos (11), Register 3
wieder als eine Karte (27).

Zwei Prüfstand-Korrekturen, beides **überholte Erwartungen, keine
Codefehler**:
- Die App schreibt Überschriften und kleine Etiketten per CSS gross
  (`text-transform:uppercase`), und `innerText` gibt genau das zurück.
  Die neuen Prüfungen vergleichen deshalb den Inhalt, nicht die
  Schreibweise. Erst im Browser gemessen (`getComputedStyle`), nicht
  vermutet.
- `pruefstand-rinne-app-v2-71.js` verlangte „höchstens zwei
  Überschriften je Register" – eine Zahl als Behelf für „zeigt nur den
  eigenen Inhalt". Register 3 hat jetzt drei Karten. Geprüft wird jetzt
  die Eigenschaft: die erste Überschrift trägt die eigene
  Registernummer, keine weitere trägt eine fremde. Mit einer Gegenprobe
  bestätigt, dass die Prüfung „alle Register auf einmal" weiterhin
  fängt.

Volle Regression: rinneapp71 99/99, verschnitt-app 1578/1578, dazu alle
bestehenden Prüfstände (kehle52 698/698, required70 359/359,
rinne57 379/379, einf70 185/185, offline70 107/107, feedback63 108/108,
freipos65 99/99, dila70 85/85, fotos70 88/88, fp70 83/83, breite57 84/84,
kehleintegration52 76/76, feedback70 47/47, einstbrowser68 47/47,
ebg70 49/49, mad70 45/45, module67 43/43, einst68 43/43, medien50 42/42,
adresse45 39/39, pfade55 38/38, dateien49 38/38, projekte47 37/37,
status46 35/35, auswahl48 32/32, breite52 52/52, modulebrowser67 16/16,
suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2 sowie nav,
suche40, treffer40, recent41, stand42, dateien43, ui39) – ohne
Fehlschlag. `node --check` über alle `js/*.js`, `sw.js` und die
Prüfstände fehlerfrei, `<div>`/`</div>` ausgeglichen (721/721), keine
doppelten Element-IDs, Version in `index.html` und `sw.js` gleich.

Zwei Prüfstände geben eine Zeile aus, die nach einem Fehler aussieht und
keiner ist – **vor und nach dieser Änderung identisch**: `ui39` druckt
im eigenen Fehlerfall-Test „Fehler: permission denied" (das ist der
geprüfte Fall), `recent41` enthält den Text „Leerzustand ohne Fehler".

### 80.5 Service Worker

Der Kommentar oben in `sw.js` behauptete, ohne hochgezählte
CACHE-Version zeigten Handys die alte App. Seit der Umstellung auf
„zuerst Netz" stimmt das nicht mehr (siehe Abschnitt 79 bzw. den
Bericht zur Veröffentlichung). Der Kommentar ist jetzt richtig; die
Version wird weiterhin mitgezählt, damit der Offline-Bestand zur
ausgelieferten Fassung passt.

### 80.6 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`.
  **Das wird ausdrücklich nicht als getestet behauptet.** Geprüft ist
  die Oberfläche in echtem Chromium gegen die echte `index.html`.
- Die Rauten im Verlaufsband tragen weiterhin **keine eigene
  Beschriftung** – wie in der Testapp; erklärt werden sie über die
  Legende. Eine Nummerierung (D1, D2) im Band wäre die naheliegende
  nächste Stufe, ginge aber über die Testapp hinaus und wurde deshalb
  nicht eigenmächtig gebaut.
- Weiterhin offen, weil dafür die Zahlen des Betriebs fehlen:
  Schnittfuge und Wiederverwendung von Reststücken im Verschnitt.
- Eine frisch registrierte Firma hat weiterhin keinen
  Anschlusstyp-Katalog (Abschnitt 79.9).

## 81. RINNE HALBRUND: DER FERTIG-KNOPF TUT ETWAS — VERSION 2.73

Rückmeldung: *"fertig button funktioniert nicht"*. Zutreffend, und zwar
buchstäblich: auf dem letzten Register hiess der Knopf „Fertig" und war
**gesperrt** (`disabled`) – er sah aus wie die Abschlussaktion und bewirkte
nichts.

### 81.1 Herkunft

Aus dem Prototyp übernommen: dort ist derselbe Knopf am Ende ebenfalls
gesperrt (`weiter.disabled=schritt>=SCHRITTE.length`). In der Testapp fällt
das kaum auf, weil Speichern, Kopieren und PDF dort in einer festen Leiste
ausserhalb der Schritte liegen. In der App ist das anders: unter den
Registern folgen noch **Fotos/Skizzen, Notiz und der Speichern-Knopf** –
der Ablauf geht also weiter, und ein toter Knopf steht mitten darin.

### 81.2 Umgesetzt

`ra_weiter` ist auf dem letzten Register nicht mehr gesperrt, heisst
**„Fertig › Fotos und Speichern"** und führt über `raAbschluss()` zum Rest
des Formulars: `#measMedienBereich` wird angescrollt und für 2,5 Sekunden
umrandet (`.ra-ziel`), der Speichern-Knopf steht dann im selben Bild.

**Es wird bewusst nicht selbst gespeichert.** `#saveMeasurement` bleibt der
einzige Speicherweg – mit seiner Prüfung von Projekt und Pflichtfeldern.
Automatisches Speichern würde ausserdem die Fotos übergehen, die erst
darunter erfasst werden.

„‹ Zurück" bleibt auf dem ersten Register gesperrt – dort gibt es
tatsächlich nichts davor.

### 81.3 Getestet

`pruefstand-rinne-app-v2-71.js` **102/102** (vorher 99): der Knopf heisst
auf dem letzten Register „Fertig", ist bedienbar, führt nachweislich zu
Fotos/Notiz/Speichern (die Markierung sitzt auf `#measMedienBereich`) und
blättert nicht ins Leere.

Drei Gegenproben:

| eingebauter Fehler | Ergebnis |
|---|---|
| „Fertig" wieder gesperrt | 100/102 |
| `raAbschluss()` ohne Wirkung | 101/102 |
| „Fertig" blättert auf Register 7 | 101/102 |

Die erste Gegenprobe hat zunächst den **Prüfstand abstürzen** lassen:
`page.click` auf einen gesperrten Knopf läuft in einen Timeout, und ein
abgebrochener Prüfstand sieht aus wie „keine Fehler" – derselbe Fehlertyp
wie in Abschnitt 78. Der Klick läuft jetzt über `evaluate` mit Prüfung,
damit ein gesperrter Knopf einen sauberen Fehlschlag ergibt.

Im echten Chromium nachgesehen (412 px): der Knopf ist 242 × 46 px gross,
nach dem Klick steht der Fotoblock umrandet im Bild und „💾 Speichern"
direkt darunter.

Volle Regression grün: dila-sichtbar 57/57, verschnitt-app 1578/1578,
kehle52 698/698, rinne57 379/379, required70 359/359, offline70 107/107,
fotos70 88/88, breite57 84/84, kehleintegration52 76/76, breite52 52/52,
einstbrowser68 47/47, module67 43/43, einst68 43/43, medien50 42/42,
pfade55 38/38, modulebrowser67 16/16, hidden51 7/7, abstand69 2/2.
`node --check` fehlerfrei, `<div>` 721/721, keine doppelten IDs, Version
in `index.html` und `sw.js` gleich.

### 81.4 Warum 2.73 und nicht 2.72

Version 2.72 war zum Zeitpunkt dieser Korrektur bereits veröffentlicht
(13:03 Uhr). Dieselbe Versionsnummer mit zwei verschiedenen Inhalten wäre
nicht nachvollziehbar gewesen.

### 81.5 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (Sandbox blockiert HTTPS
  dorthin) – **wird nicht als getestet behauptet**.
- Der Prototyp behält seinen gesperrten Knopf; er hat eine eigene
  Speicherleiste und ist nicht Teil der App.


## 82. EINLAUFBLECH GERADE IN DIE APP EINGEBAUT — VERSION 2.74

Die Massaufnahme **Einlaufblech gerade** wird nicht mehr als ein langes
Formular erfasst, sondern über **sechs Register** – nach demselben Muster
wie die Rinne seit v2.71. Grundlage ist der Prototyp unter
`prototyp-einlaufblech/`, der unverändert bestehen bleibt.

    1 Grunddaten · 2 Geometrie · 3 Stücke · 4 Kontrolle ·
    5 Ausmass · 6 Zuschnitt aus Rollenblech

### 82.1 js/11 und js/15 bleiben unverändert

`js/11-einlaufblech-gerade.js` (Schnittzeichnung) und
`js/15-einlaufblech-stueckliste.js` (enge Seite, Restbreite, Aufteilung,
Gehrung, Endzugabe, Rinnen-Übernahme) sind gegenüber v2.73 **byteweise
identisch**, ebenso `js/13-einlaufblech-konisch.js`.

Die Brücke sind ihre eigenen Variablen und Felder. `ebaBruecke()` setzt
`ebPieces` und die alten Formularelemente; danach liefern die Funktionen
aus js/15 direkt die richtigen Werte:

```js
function ebaEngeSeite(){ebaBruecke();return ebEngeSeite()}
function ebaRestbreite(){ebaBruecke();return ebRestbreite()}
```

Es gibt **keine zweite Rechnung**, die auseinanderlaufen könnte.
`ebPieces` ist dasselbe Array wie `ebA.stuecke` – eine Wahrheit, kein
Abgleich.

Die alten Formularelemente stehen weiterhin im HTML, unsichtbar als
**`#ebStummel`**: js/15 hängt beim Laden Handler an sie. Der
Übernahme-Block (`#eb_rinneHint`/`#eb_rinneList`) steht dagegen **fest
und sichtbar** im HTML und wird von js/29 nur in Register 3 eingehängt –
ein per `innerHTML` neu erzeugtes Element hätte den Handler von js/15
nicht.

**Dabei ein echter Fehler gefunden:** beim Umbau war
`#openEinlaufblechSettings` verschwunden, an den js/16 einen Handler
hängt – die App warf beim Laden einen TypeError. Der Prüfstand hat es
gemeldet, nicht das Lesen des Codes.

### 82.2 Speichern: Superset

js/16 schreibt weiterhin genau dieselben acht Felder wie bisher
(`gesamtlaenge`, `massA`, `massAEng`, `winkel`, `montage`, `abwicklung`,
`engeSeite`, `restBreite`) plus `pieces` und `material` – Zeichen für
Zeichen unverändert. Dazu kommen `gava`, `flaeche_m2`, `ausmass` und
`rollen`.

Die Ergebnisse werden mitgespeichert, damit ein später gedrucktes Blatt
gleich bleibt – dasselbe Vorgehen wie bei Rinne, Kehle und
Anschlussblech. Eine vor v2.74 gespeicherte Aufnahme öffnet unverändert;
es werden **keine Haltebleche erfunden** (eine alte Aufnahme hat keine
erfasst, also steht das Kästchen aus).

### 82.3 Neu gegenüber v2.73

- **Haltebleche „GAVA Blech"** – Kästchen, Abstand, Anzahl. Dieselbe
  Rechnung wie der Rinnenhalter-Abstand in js/28:
  `Anzahl = ganzzahlig(Länge ÷ Abstand) + 1`. Ohne Haken wird nichts
  gerechnet und nichts ins Ausmass gestellt.
- **Blechfläche in m²** = Gesamtlänge × Abwicklung.
- **Zuschnitt aus Rollenblech.** Von der Rolle wird eine **Tafel**
  abgeschnitten und quer in Streifen der Abwicklungsbreite geteilt; die
  Tafel ist höchstens so lang wie das längste Stück, ein Streifen kann
  mehrere Stücke hintereinander aufnehmen (dasselbe Problem wie die
  Normlängen bei der Rinne).

      Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)
      Tafeln            = aufgerundet(Streifen ÷ Streifen je Tafel)
      Verschnitt        = Tafelfläche − Blechfläche

  Jedes Blech steht mit **seiner Nummer und seiner genauen Länge** in
  der Streifenliste. Reicht das Suchbudget nicht, wird die gierige
  Lösung gezeigt und ausdrücklich **nicht** als beste ausgewiesen.
- **Ausmass und Materialübersicht** ohne zweite Eingabe, ohne
  Artikelnummern und ohne Preise.
- **Kontrolle** mit rotem Punkt am Register, sobald etwas fehlt.

### 82.4 Rollenbreiten firmenweit, GAVA-Abstand gerätebezogen

Migration `app_settings_blech_rollenbreiten_v2_74`: additive nullable
`jsonb`-Spalte `app_settings.blech_rollenbreiten`. Kein Zeilentrigger
feuert, keine bestehende Zeile ändert sich (beide Firmen haben
unverändertes `updated_at`). `NULL` = noch nichts hinterlegt und fällt
auf **1000/670 mm** zurück; wählbar sind zusätzlich 500, 400, 330, 250
und 200 mm.

Bewusst firmenweit und nicht gerätebezogen: es ist der Lagerbestand, und
die Liste ist für andere Massaufnahmen wiederverwendbar. Der
**GAVA-Abstand** liegt dagegen bei den übrigen Einlaufblech-Massen im
`localStorage`, weil er ein Zuschnitt-/Montagemass ist wie Umschlag oder
Endzugabe.

### 82.5 Getestet

Neuer Prüfstand `pruefstaende/pruefstand-einlaufblech-app-v2-74.js`,
**87/87**, echtes Chromium gegen die echte `index.html`: Modul und
Brücke, sechs Register, Geometrie, Stücke/Gehrung/Endzugabe, GAVA,
Fläche und Rollenplan, Ausmass, Kontrolle, Speichern und Wiederöffnen,
ein Datensatz im Format bis v2.73, leerer Zustand, Fertig-Knopf, Druck,
fünf Bildschirmbreiten × sechs Register, keine JS-Fehler.

**Neun Gegenproben**, jede wirft den Prüfstand um und keine lässt ihn
abstürzen: Brücke setzt `ebPieces` nicht (76/87) · eigene Restbreite
statt der aus js/15 (76/87) · Zusatzfelder nicht gespeichert (73/87) ·
alter Datensatz erfindet Haltebleche (78/87) · Tafellänge = Summe statt
längstes Stück (76/87) · Fertig-Knopf gesperrt (77/87) · alle Register
auf einmal (77/87) · Druck rechnet den Rollenplan neu (85/87) · Ausmass
fehlt im Druck (86/87).

`pdf52` um einen v2.74-Fall erweitert: **526/526** (vorher 504/504).
Volle Regression grün (required70 359/359, kehle52 698/698,
rinne57 379/379, verschnitt-app 1578/1578, rinneapp71 102/102 und alle
übrigen). `node --check` über alle 30 `js/*.js` und `sw.js` fehlerfrei,
`<div>` 714/714, keine doppelten IDs.

**Regierapport nachweislich unverändert:** der Ausdruck wurde in echtem
Chromium unter `media:print` gegen den v2.73-Stand gerendert –
Bild-Hash `85706e5d7a1eb615` und DOM-Hash `3066be99c3200173` sind in
beiden Fassungen identisch (110584 Bytes). `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.

**Zwei überholte Erwartungen** in bestehenden Prüfständen angepasst,
keine davon ein Codefehler: `required70` kannte die Pflichtfelder noch
als `eb_massA`/`eb_winkel` (sie heissen jetzt `eba_massA`/`eba_winkel`
und entstehen erst beim Zeichnen), `pdf52` brauchte einen
Ausgabeordner. Dabei aber ein **echter** Fehler gefunden: die neuen
Pflichtfelder entstehen erst zur Laufzeit, `markierePflichtfelder()`
beim App-Start erreichte sie nicht – der rote Stern fehlte.
`renderEinlaufblechAufnahme()` ruft die Funktion jetzt für seinen
Bereich noch einmal auf, wie js/20 es für die Massfelder der
Ort-/Seitenbleche tut.

### 82.6 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`.
  **Das wird ausdrücklich nicht als getestet behauptet.**
- Die **2 mm** beim engen Mass A sind weiterhin fest verdrahtet, so wie
  bisher in js/15 und js/16.
- Der **GAVA-Abstand von 500 mm** ist ein Vorgabewert, keine Norm.
- Der Verschnitt rechnet **ohne Schnittfuge** und ohne Wiederverwendung
  von Reststücken.
- Bei sehr vielen Stücken wird nicht jede Kombination durchgerechnet;
  das Ergebnis heisst dann „beste gefundene Verteilung".
- Der Prototyp unter `prototyp-einlaufblech/` bleibt unverändert
  bestehen – er ist jetzt die Vorlage, nicht mehr die einzige Stelle.

## 83. FOTOS UND SKIZZEN ANS ENDE DER REGISTER — VERSION 2.75

Bei **Rinne Halbrund** und **Einlaufblech gerade** ist der Bereich
„📷 Fotos und Skizzen" während der Register ausgeblendet. Er erscheint
erst mit **„Fertig › Fotos und Speichern"** – dann wird er eingeblendet,
angescrollt und kurz hervorgehoben. Die neun übrigen Arten haben keine
Register; dort bleibt er unverändert sofort sichtbar.

Zwei bewusste Ausnahmen: eine Aufnahme, die **bereits** ein Foto oder
eine Skizze hat, zeigt den Bereich sofort (sonst sähe es aus, als wären
sie weg), und einmal offen bleibt er offen – auch beim Zurückblättern.
**Notiz und Speichern bleiben immer erreichbar**, sie gehören allen elf
Arten.

Eine Stelle entscheidet (js/16):

```js
const MEAS_MEDIEN_AM_ENDE=["rinne_halbrund","einlaufblech_gerade"];
box.hidden = MEAS_MEDIEN_AM_ENDE.indexOf(art)>=0
             && !measMedienAufgeklappt && !measFormularHatMedien();
```

**Namenskollision beim Bauen** (echter Fehler, vom Prüfstand gefunden):
Die Hilfsfunktion hiess zuerst `measHatMedien()` – diesen Namen gibt es
bereits in `js/24-projekt-cockpit.js` (v2.50), und js/24 lädt später und
überschrieb sie still. Eine Aufnahme mit Fotos blieb dadurch zugeklappt.
Sie heisst jetzt `measFormularHatMedien()`; der Prüfstand kontrolliert
beide Namen dauerhaft.

### 83.1 „Längen von Rinne übernehmen" wieder sichtbar

Beim Umbau auf Register war der Übernahme-Block zwar noch da, aber
zugeklappt. Beim Nachmessen kamen drei echte Fehler heraus:

1. Der Block wurde in den Container geschoben, der bei jedem Neuzeichnen
   per `innerHTML` überschrieben wird – dabei wurde er **samt dem
   Klick-Handler von js/15 vernichtet**. `#einlaufblechAufnahme` hat
   jetzt ein festes Gerüst (`#eba_kopf`, Block, `#eba_fuss`); neu
   geschrieben werden nur Kopf und Fuss.
2. Er blieb zugeklappt. In Register 3 wird er aufgeklappt gezeigt, in
   den übrigen ausgeblendet.
3. `ebaFuellen()` setzte nur das Modell, ohne neu zu zeichnen. Beim
   Öffnen läuft `showMeasTypeSection()` **vor** dem Füllen – das
   Register zeigte den Stand von vorher. Die Rinne (js/28) machte es
   richtig, jetzt beide.

Register 3 lädt die Rinnenliste nur nach, wenn sie für das gewählte
Projekt noch nie geladen wurde – sonst liefe bei jedem Klick eine
Abfrage. Gerechnet wird unverändert mit `baueEinlaufblechStueckeAusRinne()`
aus js/13 über den bestehenden Handler in js/15.

### 83.2 Getestet

Neuer Prüfstand `pruefstaende/pruefstand-medien-am-ende-v2-75.js`,
**38/38**, echtes Chromium. Sichtbarkeit wird **gemessen**
(`getComputedStyle` + Höhe), nicht aus dem `hidden`-Attribut geschlossen
– eine Klassenregel mit `display` würde `[hidden]` schlagen (Abschnitt
59/71.5).

Sechs Gegenproben: Bereich nie ausblenden 28/38 · auch die neun anderen
Arten 36/38 · Fertig klappt nicht auf 36/38 · vorhandene Fotos zählen
nicht 36/38 · Namenskollision zurück 35/38 · beim Öffnen nicht
zurücksetzen 36/38.

Einlaufblech-Prüfstand auf **95/95** erweitert (Abschnitt Q), vier
weitere Gegenproben: Block in den innerHTML-Container 89/95 · Block
bleibt zugeklappt 93/95 · Füllen zeichnet nicht neu 94/95 · Block auch
in Register 2 93/95.

**Zwei dieser Gegenproben deckten Schwächen im Prüfstand selbst auf:**
eine stürzte ab statt fehlzuschlagen, eine blieb grün. Beide Prüfungen
sind jetzt schärfer (vorher auf Register 6 stellen und den sichtbaren
Registerknopf lesen, fallunabhängig – `innerText` liefert die
CSS-Grossschreibung).

`fotos70` prüfte „bei jeder Art sofort sichtbar" – überholt, aber nicht
gestrichen, sondern verschärft: bei den zwei Register-Arten vorher zu
und nach `measMedienAufklappen()` offen, sonst sofort. 88/88.

Volle Regression grün. `node --check` über alle 30 `js/*.js` und `sw.js`
fehlerfrei, `<div>` 714/714, keine doppelten IDs.

**Regierapport unverändert**: Bild-Hash `85706e5d7a1eb615` und DOM-Hash
`3066be99c3200173` identisch zu v2.73/v2.74. js/06, js/08,
`css/03-druck.css` sowie js/11, js/12, js/13 und js/15 nicht im Diff.

### 83.3 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** (Sandbox-Netzwerksperre) –
  **das wird ausdrücklich nicht als getestet behauptet.**
- Die Rinnenliste in Register 3 zeigt „Bitte zuerst oben ein Projekt
  auswählen", solange kein Projekt gewählt ist – unverändert aus js/13.
- Aus v2.74 offen: die fest verdrahteten 2 mm beim engen Mass A, der
  GAVA-Vorgabewert 500 mm, Schnittfuge und Reststücke im Verschnitt.

## 84. EINLAUFBLECH KONISCH IN DIE APP EINGEBAUT — VERSION 2.76

Die Massaufnahme **Einlaufblech konisch** wird nicht mehr als ein langes
Formular erfasst, sondern über **sechs Register** – nach demselben Muster
wie Rinne Halbrund (v2.71) und Einlaufblech gerade (v2.74). Grundlage ist
der Prototyp unter `prototyp-einlaufblech-konisch/`
(Branch `feature/prototype-einlaufblech-konisch`), der unverändert bestehen
bleibt.

    1 Grunddaten · 2 Geometrie · 3 Stücke · 4 Kontrolle ·
    5 Ausmass · 6 Zuschnitt aus Rollenblech

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 84.1 Der Rechenkern liegt in js/14, nicht in js/13

Wichtigster Befund der Analyse, weil er der Dateiname widerspricht:
`js/13-einlaufblech-konisch.js` enthält **nicht** den Rechenkern des
konischen Blechs, sondern die Bausteine, die sich das gerade und das
konische Blech teilen – `teileLaengeInStuecke()`,
`splitLengthIntoPieces()`, `generateEbkGrundriss()`,
`baueEinlaufblechStueckeAusRinne()`. Der Rechenkern liegt in
**`js/14-freies-profil.js`**: `calcEbkPiece()` (enges Mass = Mass − 2 je
Seite), `ebkRestbreite()`, `ebkEngeSeite()`, `renderEbkDiagram()`,
`renderEbkPiecesTable()`, `refreshEbkRinneList()` und das Array
`ebkPieces`. Die Schnittzeichnung kommt aus
`js/11-einlaufblech-gerade.js`.

**Alle drei Dateien sind byteweise unverändert** – per `git diff`
bestätigt.

### 84.2 Brücke statt Nachbau

`ebkaBruecke()` (js/30) setzt `ebkPieces` und die alten Formularfelder
aus dem erfassten Stand; danach liefern die Funktionen der App direkt die
richtigen Werte:

```js
function ebkaEngeSeite(){ebkaBruecke();return ebkEngeSeite()}
function ebkaRestbreite(p){return ebkRestbreite(ebkaMassEngerSeite(p),ebkA.abwicklung)}
```

`ebkPieces` **ist** `ebkA.stuecke` – eine Wahrheit, kein Abgleich. Die
zehn Elemente, die js/14 beim Laden erwartet, stehen weiterhin im HTML,
jetzt als unsichtbarer Block `#ebkStummel`. Der Übernahme-Block
(`#ebk_rinneHint`/`#ebk_rinneList`) steht **fest und sichtbar** im HTML
und wird von js/30 nur in Register 3 eingehängt – ein per `innerHTML` neu
erzeugtes Element hätte den Klick-Handler von js/14 verloren.

### 84.3 Ein echter Fehler in der Rinnen-Übernahme (v2.74/v2.75) behoben

Beim Bauen der Brücke fiel auf, dass derselbe Mechanismus beim **geraden**
Blech seit v2.74 kaputt war. Im Browser nachgemessen, nicht vermutet:

| Schritt | ebPieces | ebA.stuecke | Speicher-Payload |
|---|---|---|---|
| nach der Übernahme | 5 | 0 | – |
| nach dem nächsten Zeichnen | **0** | 0 | **0 Stücke** |

Ursache: js/15 ersetzt bei der Übernahme `ebPieces` durch ein **neues**
Array; `ebaBruecke()` schrieb beim nächsten Zeichnen wieder `ebPieces =
ebA.stuecke` und warf den übernommenen Stand damit lautlos weg. Der
Benutzer sah „5 Stück übernommen“ und speicherte anschliessend ein leeres
Blech – genau das Feedback FB6 aus v2.70.

Behoben in js/29 und von Anfang an richtig in js/30: die Übernahme wird
**dort abgeholt, wo sie passiert**, im Klick-Handler, der durch das
Blubbern nach dem Handler der Fachdatei läuft:

```js
if(e.target.closest("[data-pick-eb-rinne]")){
 if(Array.isArray(ebPieces)&&ebPieces!==ebA.stuecke)ebA.stuecke=ebPieces;
 renderEinlaufblechAufnahme(); return;
}
```

Hat die Fachdatei abgebrochen (kein Segment, Rückfrage verneint), ist
`ebPieces` unverändert und die Bedingung greift nicht. **Keine Heuristik
in der Brücke** – ein erster Versuch, den fremden Stand dort zu erkennen,
hat einen bewusst geleerten Stand wieder auferstehen lassen und wurde
verworfen.

Der Prüfstand der geraden Aufnahme hatte die Übernahme bis dahin nur
**nachgerechnet**, nie geklickt – deshalb blieb der Fehler unentdeckt. Er
klickt jetzt den echten Knopf und prüft Modell und Payload.

### 84.4 Speichern: Superset

js/16 schreibt **unverändert** dieselben sieben Felder wie bisher
(`abwicklung`, `dachneigung`, `montage`, `engeSeite`, `pieces`,
`gesamtlaenge`, `material`) und ergänzt sie nur um `flaeche_m2`,
`ausmass` und `rollen`. Eine vor v2.76 gespeicherte Aufnahme öffnet
unverändert und druckt ohne die neuen Abschnitte – beides im Prüfstand
abgesichert.

### 84.5 Neu gegenüber v2.75

- **Weg „Gesamtlänge eintragen → Stücke berechnen“.**
  `splitLengthIntoPieces()` war vorhanden, im konischen Formular aber
  nirgends erreichbar. Jetzt derselbe Weg wie beim geraden Blech, über
  dieselbe Funktion – keine zweite Aufteilungsrechnung.
- **Skizze je Stück** (Draufsicht): zeigt, wo Mass links und Mass rechts
  gemessen werden; die enge Seite ist rot. Reine Darstellung der
  erfassten Werte, es wird nichts gerechnet.
- **Konizität** (rechts − links) je Stück. Im bestehenden Modul gibt es
  dafür weder Feld noch Funktion – sie wird angezeigt, nicht erfunden.
- **Verkettung** rechts → links beim Tippen, wie in js/14, danach frei
  überschreibbar.
- **Kontrolle** mit rotem Punkt am Register: fehlende Pflichtmasse,
  negative Werte, Winkel ausserhalb 0–180°, Restbreite ≤ 0, Stück länger
  als Stoss/Stoss + Überlappung, widersprüchliche Masse an einer
  Stossstelle. Keine erfundenen Grenzwerte.
- **Ausmass und Materialübersicht** ohne zweite Eingabe, ohne
  Artikelnummern und ohne Preise.
- **Zuschnitt aus Rollenblech**, dieselbe Rechnung wie beim geraden
  Blech: die Konizität entsteht beim Anreissen **innerhalb** des
  Streifens und ändert die benötigte Fläche nicht. Gepackt wird mit
  `ebaPackeInStreifen()` aus js/29 – es gibt bewusst nur **eine**
  Packrechnung in der App.
- **Fotos und Skizzen am Ende**: `MEAS_MEDIEN_AM_ENDE` um
  `einlaufblech_konisch` erweitert (v2.75-Mechanik, unverändert).

### 84.6 Getestet

- **`pruefstaende/pruefstand-einlaufblech-konisch-app-v2-76.js` –
  113/113**, echtes Chromium gegen die echte `index.html`: Modul und
  Brücke (inkl. zwei Rechenproben direkt gegen js/14), sechs Register,
  Geometrie (mittleres Mass gegen die Rohwerte unabhängig nachgerechnet,
  und es muss die **enge**, nicht die breite Seite sein), Stücke mit
  Tippen Zeichen für Zeichen und Fokusprüfung, Verkettung, Gehrung
  (Nachbarstück bleibt unberührt – anders als beim geraden Blech),
  Endzugabe, Aufteilung aus `splitLengthIntoPieces()`, Fläche und
  Rollenplan, Ausmass, Kontrolle, **Rinnen-Übernahme über den echten
  Knopf mit Prüfung von Modell und Payload**, Speichern/Wiederöffnen,
  ein Datensatz im Format bis v2.75, leerer Zustand, Fotos erst nach
  „Fertig“, Druck, fünf Bildschirmbreiten × sechs Register, keine
  JS-Fehler.
- **13 Gegenproben**, jede baut einen echten Fehler ein und wirft den
  Prüfstand um: Brücke setzt `ebkPieces` nicht (108/113) · Übernahme
  kommt nicht ins Modell (112) · eigene Stückaufteilung (112) ·
  Verkettung entfernt (111) · mittleres Mass von der breiten Seite (111)
  · Zusatzfelder nicht gespeichert (105) · Tafellänge = Summe (109) ·
  Kontrolle meldet nie etwas (108) · Gehrung setzt das Nachbarstück doch
  mit (112) · Füllen zeichnet nicht neu (112) · Fotos schon während der
  Register sichtbar (112) · Übernahme-Block in den bei jedem Zeichnen neu
  geschriebenen Teil (106) · Druck nimmt nicht den gespeicherten
  Rollenplan (112).

  Der erste Versuch für die Übernahme-Block-Gegenprobe blieb **grün** –
  er hatte die folgende `insertBefore`-Zeile stehen lassen, die den
  Block wieder eingehängt hat. Eine Gegenprobe, die nicht fehlschlägt,
  ist kein Beweis: sie wurde durch eine ersetzt, die den Block wirklich
  in den neu geschriebenen Teil legt, und schlägt jetzt mit 106/113 fehl.
- **Volle Regression grün**: einlaufblech-app 98/98 (um die
  Übernahme-Prüfung erweitert), medien-am-ende 49/49 (um den konischen
  Typ erweitert), rinneapp71 102/102, verschnitt-app 1578/1578,
  dila-sichtbar 57/57.
- **Regierapport nachweislich unverändert**: der Druck wurde in echtem
  Chromium unter `media:print` mit ausgelöstem `beforeprint` gegen den
  v2.75-Stand gerendert – der Druck-DOM ist **byteidentisch**
  (`22159288c1b3ec8568bff783f3a13b48`, 5345 Bytes). `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im
  Diff.
- `node --check` über alle 30 `js/*.js` und `sw.js` fehlerfrei,
  `<div>`/`</div>` in `index.html` ausgeglichen (706/706), keine
  doppelten Element-IDs.

**Zwei überholte Erwartungen** in bestehenden Prüfständen angepasst,
keine davon ein Codefehler: `medien-am-ende` führte
`einlaufblech_konisch` unter den Arten, die den Fotobereich sofort
zeigen; `einlaufblech-app` prüfte die Rinnen-Übernahme nur rechnerisch.
Die zweite Anpassung ist zugleich die Lücke, durch die der Fehler aus
84.3 gerutscht ist.

### 84.7 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/30-einlaufblech-konisch-aufnahme.js` | **neu** – sechs Register, Brücke, Skizze je Stück, Ausmass, Rollenplan |
| `index.html` | Registercontainer, Übernahme-Block, `#ebkStummel`, Script-Tag, Version 2.76 |
| `js/16-massaufnahme-formular.js` | Modul zeichnen, Payload-Superset, Medien am Ende, Druck um Ausmass/Fläche/Rollenplan erweitert |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `js/29-einlaufblech-aufnahme.js` | Rinnen-Übernahme-Fehler behoben (84.3) |
| `sw.js` | Cache-Version 2.76, neue Datei im SHELL |

**Nicht angefasst**: `js/11`, `js/13`, `js/14`, `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `css/03-druck.css`, `js/12`, `js/12b`,
`js/15`, `js/17`, `js/19`–`js/28`, `css/01-basis.css` – per `git diff`
einzeln bestätigt. Keine Berechnung, keine Stückliste, kein Zuschnitt,
keine Abwicklung, kein Speichermodell und keine PDF-Kopflogik berührt.

### 84.8 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`,
  wie in jeder vorherigen Sitzung. **Das wird ausdrücklich nicht als
  getestet behauptet.** Geprüft ist die Oberfläche in echtem Chromium
  gegen die echte `index.html`.
- Die **2 mm** beim engen Mass (`calcEbkPiece`) sind in js/14 fest
  verdrahtet und wurden übernommen, nicht hinterfragt.
- Bei einer Gehrung wird das Nachbarstück **nicht** automatisch
  mitgesetzt – so wie im bestehenden konischen Modul. Beim geraden Blech
  ist es anders; ob der Unterschied gewollt ist, gehört in den
  Praxistest.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei sehr vielen Stücken heisst das Ergebnis „beste
  gefundene Verteilung“.
- Der Prototyp unter `prototyp-einlaufblech-konisch/` bleibt auf seinem
  Branch bestehen – er ist jetzt die Vorlage, nicht mehr die einzige
  Stelle.


## 85. FREIES PROFIL ALS REGISTER-AUFNAHME IN DIE APP — VERSION 2.77

Die Massaufnahme **Freies Profil** wird nicht mehr als ein langes Formular
erfasst, sondern über **sieben Register** – nach demselben Muster wie Rinne
Halbrund (v2.71), Einlaufblech gerade (v2.74) und Einlaufblech konisch
(v2.76). Grundlage ist der Prototyp unter `prototyp-freies-profil/`
(Branch `feature/prototype-freies-profil`), der unverändert bestehen bleibt.

    1 Grunddaten · 2 Profil · 3 Zeichnung · 4 Skizze → Profil ·
    5 Segmente & Ausmass · 6 Zuschnitt · 7 Kontrolle

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 85.1 Ein echter Zeichnungsfehler in js/14 behoben

Am 04.09.2026 mit Bildschirmfoto gemeldet: Profil 12 mm / 50 mm (180°
Umschlag) / 60 mm (−90°). Der dritte Schenkel richtete sich am **ersten**
aus, zwischen Schenkel 2 und 3 klaffte eine Lücke.

Ursache, an den gezeichneten Pfaden gemessen: ein Umschlag wird als
parallel **versetzte** Linie gezeichnet, der Schenkel danach setzte aber
wieder am **unversetzten** Punkt an.

| | Pfad 1 endet | Pfad 2 beginnt |
|---|---|---|
| vorher | (30/21) | (30/30) → Lücke 9 |
| nachher | (30/21) | (30/21) → keine Lücke |

Korrigiert **in `js/14-freies-profil.js` selbst** (vier Stellen in
`generateProfilDiagramSvg()`): der Versatz eines Umschlags wird auf alle
folgenden Schenkel mitgenommen – so liegt das Blech nach einem Umschlag
auch wirklich. Der Endpunkt des Beispielprofils liegt damit bei (30/261)
statt (30/270).

Das ist die **einzige** inhaltliche Änderung an js/14. Sie betrifft
ausschliesslich die Darstellung; an Massen, Speichermodell und
Fachrechnung ändert sich nichts. Der Fall steht dauerhaft im Prüfstand
(Endpunkt und Lückenmass werden gemessen, nicht nur „es sieht gut aus").

### 85.2 Brücke statt Nachbau

`js/14-freies-profil.js` bleibt die Fachquelle: `generateProfilDiagramSvg()`,
`abgerundeterPfad()`, `ansichtsPfeilSvg()`, `fpPruefeErkannteSchenkel()`,
`renderFpSegmenteList()` (füllt leere Segment-Masse aus dem Profil) und die
**ganze Skizzen-Erkennung** (Knöpfe, Vorschau, Übernehmen/Verwerfen).

`fpaBruecke()` (js/31) setzt `fpSchenkel`, `fpSegmente` und die alten
Formularfelder aus dem erfassten Stand. `fpSchenkel` **ist** danach
`fpA.schenkel` – eine Wahrheit, kein Abgleich. Die alten, unsichtbaren
Formularelemente stehen weiterhin im HTML als `#fpStummel`, damit js/14
unverändert laden kann.

**Der Erkennungs-Block liegt NICHT im Stummel**, sondern als eigenes
Element `#fpaSkizzeBox` zwischen Kopf und Fuss: js/14 hängt seine Handler
beim Laden an `fp_sketchRecognize` / `fp_sketchUebernehmen` /
`fp_sketchVerwerfen`, und ein per `innerHTML` neu geschriebener Container
würde sie samt Element vernichten (dieselbe Falle wie bei der
Rinnen-Übernahme in v2.74/v2.76).

Und: `fp_sketchUebernehmen` **ersetzt** `fpSchenkel` durch ein neues Array.
Der Klick-Handler in js/31 holt es dort ab, wo es passiert – sonst ginge
die erkannte Form beim nächsten Zeichnen lautlos verloren (genau der Fehler,
der in v2.74 bei der Rinnen-Übernahme steckte).

### 85.3 Zuschnitt aus Rollenblech (Register 6)

Gleiches Vorgehen wie beim Einlaufblech: von der Rolle wird eine **Tafel**
abgeschnitten und quer in Streifen der Abwicklungsbreite geteilt; ein
Streifen kann mehrere Stücke hintereinander aufnehmen. Gepackt wird mit
`ebaPackeInStreifen()` aus **js/29** – es gibt bewusst nur EINE
Packrechnung in der App.

**Der eine Unterschied**: dort hat die ganze Aufnahme eine Abwicklung, hier
hat **jedes Segment** seine eigene. Deshalb bilden Segmente mit gleicher
Streifenbreite eine Gruppe, und jede Gruppe wird für sich gepackt.

Konisch: die Streifenbreite ist die **grössere** der beiden Abwicklungen –
der Zuschnitt muss das breitere Ende enthalten. Die Fläche bleibt die
Trapezfläche; die Differenz ist echter Verschnitt.

Ehrlich angezeigt statt stillschweigend gerechnet: Segmente ohne Länge oder
ohne Masse werden mit ihrer Nummer gemeldet; ist keine Rolle breit genug,
steht das als Warnung da; reicht das Suchbudget nicht, heisst das Ergebnis
„beste gefundene Verteilung".

Die Rollenbreiten kommen aus `app_settings.blech_rollenbreiten`
(firmenweit, seit v2.74) – **keine neue Einstellung**.

### 85.4 Weitere Neuerungen

- **Blechfläche, Ausmass und Materialübersicht** ohne zweite Eingabe, ohne
  Artikelnummern und ohne Preise.
- **Kontrolle** mit Punkt am Register (rot bei Fehler), nur Prüfungen, die
  sich aus dem bestehenden Modul ableiten lassen (≥2 Schenkel wie
  `fpPruefeErkannteSchenkel`, ≤`FP_MAX_SCHENKEL`, gültige Zahlen, Winkel
  ±180°, Geometrie zeichenbar).
- **Verwaiste Masse werden gekürzt**: werden Schenkel weniger (etwa weil
  eine erkannte Skizze das Profil ersetzt), blieben sonst Masse zu
  Schenkeln stehen, die es nicht mehr gibt – unsichtbar, aber in der
  Abwicklung mitgezählt. Im Prüfstand belegt: 210 mm → 170 mm.
- **Schenkel als grosse Karten**, Zeichnung klebt beim Erfassen oben, der
  Knopf „＋ Schenkel hinzufügen" steht **unter** den Karten.
- **Fotos und Skizzen am Ende** (`MEAS_MEDIEN_AM_ENDE` um `freies_profil`
  erweitert, v2.75-Mechanik unverändert).

### 85.5 Speichern: Superset

js/16 schreibt **unverändert** dieselben fünf Felder wie bisher
(`schenkel`, `konisch`, `segmente`, `ansicht`, `material`) und ergänzt sie
nur um `flaeche_m2`, `ausmass` und `zuschnitt`. Eine vor v2.77 gespeicherte
Aufnahme öffnet unverändert und druckt ohne die neuen Abschnitte – es wird
**nicht** nachgerechnet, damit ein einmal gedrucktes Blatt gleich bleibt.

### 85.6 Getestet

- **`pruefstaende/pruefstand-freies-profil-app-v2-77.js` – 114/114**,
  echtes Chromium gegen die echte `index.html`: Modul und Brücke, sieben
  Register, Grunddaten, Profil (Tippen Zeichen für Zeichen mit
  Fokusprüfung, Umschlag, Umkehren, Verschieben, Löschen, 24er-Grenze,
  Knopf unter den Karten, klebende Zeichnung gemessen), der behobene
  Zeichnungsfehler (Lücke **und** Endpunkt), Erkennungs-Block nur in
  Register 4 und ausserhalb des neu geschriebenen Kopfs, Übernahme aus
  js/14 landet im Modell und überlebt das Neuzeichnen, Segmente und
  Ausmass, verwaiste Masse, Zuschnitt mit von Hand gerechneten
  Erwartungen, Kontrolle, Speicher-Payload, Wiederöffnen, ein Datensatz
  im Format bis v2.76, Fotos erst nach „Fertig", Druck (neu und alt),
  vier Bildschirmbreiten × sieben Register, keine JS-Fehler.
- **12 Gegenproben**, jede baut einen echten Fehler ein und wirft den
  Prüfstand um: Brücke setzt `fpSchenkel` nicht (113) · Skizzen-Übernahme
  kommt nicht ins Modell (113) · verwaiste Masse nicht gekürzt (113) ·
  konisch von der schmalen Seite (113) · Tafellänge = Summe (108) ·
  eigene Packrechnung (113) · Segment ohne Länge still mitrechnen (112) ·
  Knopf wieder über die Karten (106) · Erkennungs-Block in den
  innerHTML-Kopf (108) · Umschlag-Korrektur zurückgenommen (112) ·
  Zusatzfelder nicht gespeichert (106) · Fotos schon während der
  Register sichtbar (113).
  Eine davon liess den Prüfstand zuerst **abbrechen** statt fehlschlagen
  (der Erkennungs-Block verschwand, ein Klick lief ins Leere) – ein
  abgebrochener Lauf sieht aus wie „keine Fehler". Der Prüfstand ist
  jetzt an beiden Stellen abgesichert.
- **Regression grün**: einlaufblech-app 98/98, konisch-app 113/113,
  rinne-app 102/102, medien-am-ende 60/60, dila-sichtbar 57/57,
  verschnitt-app 1578/1578, kehle52 698/698, required70 359/359,
  pfade55 38/38, module67 43/43, einst68 43/43, hidden51 7/7,
  abstand69 2/2.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` gerendert, gegen v2.76 verglichen –
  **Bild und DOM byteidentisch** (DOM `43b2ed7142cfd6fa`, 5297 Bytes;
  Bild `5743c9c239f38898`, 45830 Bytes). `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 31 `js/*.js` und `sw.js`: fehlerfrei;
  `<div>`/`</div>` in `index.html` ausgeglichen (702/702); keine doppelten
  Element-IDs; jede js-Datei in der Service-Worker-Liste.

**Zwei überholte Erwartungen in bestehenden Prüfständen angepasst**, keine
davon ein Codefehler: `medien-am-ende` führte `freies_profil` noch unter
den Arten, die den Fotobereich sofort zeigen; `required70` suchte das
Pflichtfeld der konischen Dachneigung noch unter der alten ID
`ebk_dachneigung`. Die zweite hat eine echte **Lücke seit v2.76**
aufgedeckt: das Feld heisst dort `ebka_dachneigung` und wurde vom
Prüfstand seither gar nicht mehr geprüft. Nachgemessen: der rote Stern,
`required` und `aria-required` sitzen korrekt – der Prüfstand deckt es
jetzt wieder ab (359/359 statt 351/359).

### 85.7 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/31-freies-profil-aufnahme.js` | **neu** – sieben Register, Brücke, Ausmass, Zuschnitt, Kontrolle |
| `js/14-freies-profil.js` | **vier Stellen** in `generateProfilDiagramSvg()` – der Umschlag-Versatz (85.1). Sonst unverändert. |
| `index.html` | Registercontainer, `#fpaSkizzeBox`, `#fpStummel`, Script-Tag, Version 2.77 |
| `js/16-massaufnahme-formular.js` | Modul zeichnen, Payload-Superset, Medien am Ende, Druck um Ausmass/Fläche/Zuschnitt erweitert |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `css/01-basis.css` | klebende Zeichnung, `.eb-table.fpa-tab{min-width:0}`, gedrückter 180°-Knopf |
| `sw.js` | Cache-Version 2.77, neue Datei im SHELL |
| `pruefstaende/pruefstand-freies-profil-app-v2-77.js` | **neu** |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport), `js/11`, `js/12`, `js/12b`, `js/13`,
`js/15`, `js/17`, `js/19`–`js/30` – per `git diff` bestätigt.

### 85.8 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`,
  wie in jeder vorherigen Sitzung. **Das wird ausdrücklich nicht als
  getestet behauptet.** Geprüft ist die Oberfläche in echtem Chromium
  gegen die echte `index.html`.
- **Die Skizzen-Erkennung wurde nicht gegen die echte Edge Function
  getestet** – geprüft ist der Weg mit der Vorschau von js/14 und
  gestellten Schenkeln.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei sehr vielen Segmenten heisst das Ergebnis „beste
  gefundene Verteilung".
- Fachlich im Praxistest zu bestätigen: wird bei mehreren Abwicklungen je
  Breite eine eigene Tafel geschnitten, oder legt man schmale und breite
  Streifen auf dieselbe Tafel? Der Prototyp und die App rechnen je Breite
  getrennt – die vorsichtige Annahme, sie kann Material kosten.
- Zählt der Betrieb einen Umschlag als eine Biegung oder als zwei? Gezählt
  werden Schenkel mit einem Winkel ≠ 0°.


## 86. FREIES PROFIL: UMSCHLAG KEHRT DIE RICHTUNG UM — VERSION 2.78

Gemeldet am 04.09.2026: „Umschlag ändert in der Zeichnung die Richtung
nicht, wenn ich Richtung umkehren anklicke."

### 86.1 Ursache

Ein Umschlag wird als parallel **versetzte** Linie gezeichnet. Auf welche
Seite versetzt wird, kam bisher allein aus der Laufrichtung:

```js
const radDir=dirs[i+1]*Math.PI/180;
const nx=-Math.sin(radDir),ny=Math.cos(radDir);
```

`+180°` und `−180°` ergeben aber **dieselbe** Laufrichtung (Unterschied
360°) – also denselben Sinus und Kosinus und damit denselben Versatz.
„Richtung umkehren" setzte das Vorzeichen zwar um, an der Zeichnung
änderte sich dadurch nichts.

Nachgemessen an den gezeichneten Pfaden (Profil 12 / 50 Umschlag / 60):

| | +180° | −180° |
|---|---|---|
| vorher | `A 4.5 … 230,21` → Ende (30/261) | **identisch** |
| nachher | `A 4.5 … 230,21` → Ende (30/261) | `A 4.5 … 230,39` → Ende (30/279) |

Der einzige Unterschied im ganzen SVG war vorher eine Beschriftung mit
`rotate(360)` statt `rotate(0)` – optisch dasselbe.

### 86.2 Korrektur

Die Seite kommt jetzt aus dem **Vorzeichen** des Winkels – dieselbe
Lösung wie in `js/26-rinne.js` seit Version 2.59 (Abschnitt 67.1):

```js
const seite=(Number(s.winkel)||0)<0?-1:1;
const nx=-Math.sin(radDir)*seite,ny=Math.cos(radDir)*seite;
```

Der laufende Versatz aus Version 2.77 (Abschnitt 85.1) nimmt das mit, der
Rest des Profils klappt also ebenfalls auf die andere Seite. Die Kehre
folgt automatisch, weil ihre Wölbrichtung aus den tatsächlich
gezeichneten Punkten abgeleitet wird (`nx2=(ux1-sx)/GAP`), und wölbt in
beiden Fällen nach aussen – von Hand nachgerechnet.

**Reine Darstellung.** An Massen, Abwicklung, Fläche, Zählung der
Biegungen und Umschläge, Speichermodell und Fachrechnung ändert sich
nichts – im Prüfstand ausdrücklich gemessen (vorher/nachher identisch).

**Nur das Freie Profil war betroffen.** `js/26-rinne.js` (Rinne
Zuschnittliste) trägt die Seite seit Version 2.59 selbst mit
(`seite: w < 0 ? -1 : 1`) und ist unverändert.

### 86.3 Getestet

- `pruefstand-freies-profil-app-v2-77.js` **118/118** (vorher 114) – vier
  neue Prüfungen: die Zeichnung ändert sich sichtbar, der Umschlag klappt
  auf die andere Seite (Endpunkt 30/279 statt 30/261), er bleibt in
  beiden Fällen ein Umschlag, und die Masse und die Zählung ändern sich
  dabei **nicht**.
- **Gegenprobe**: Seite wieder ohne Vorzeichen → 116/118, genau die zwei
  Prüfungen zur Richtungsänderung schlagen fehl.
- Regression grün: einlaufblech-app 98/98, konisch-app 113/113,
  rinne-app 102/102, medien-am-ende 60/60, dila-sichtbar 57/57,
  verschnitt-app 1578/1578.
- Regierapport unter `media:print` unmittelbar nacheinander gegen v2.77
  gerendert: **Bild und DOM byteidentisch** (DOM `4c17082dcf6e6307`,
  5297 Bytes; Bild `5743c9c239f38898`, 45830 Bytes).
- `node --check` über alle 31 `js/*.js` und `sw.js` fehlerfrei,
  `<div>`-Balance 702/702, keine doppelten Element-IDs.

Geändert: `js/14-freies-profil.js` (drei Zeilen),
`pruefstaende/pruefstand-freies-profil-app-v2-77.js`, `index.html` und
`sw.js` (Version 2.78). Sonst nichts.

## 87. MAUERABDECKUNG ALS REGISTER-AUFNAHME IN DIE APP — VERSION 2.79

Die Massaufnahme **Mauerabdeckung** wird nicht mehr als ein langes Formular
erfasst, sondern über **neun Register** – nach demselben Muster wie Rinne
Halbrund (v2.71), Einlaufblech gerade (v2.74), Einlaufblech konisch (v2.76)
und Freies Profil (v2.77). Grundlage ist der Prototyp unter
`prototyp-mauerabdeckung/` (Branch `feature/prototype-mauerabdeckung`), der
unverändert bestehen bleibt.

    1 Grunddaten · 2 Verlauf · 3 Boden & Schieber · 4 Profil & Norm ·
    5 Stückliste · 6 Zuschnitt · 7 Ausmass · 8 Kontrolle · 9 Fotos & Speichern

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 87.1 js/12b bleibt byteweise unverändert

`js/12b-mauerabdeckung.js` ist die Fachquelle und wurde **nicht angefasst** –
ebenso wenig `js/12-rinne-halbrund.js` (Verteilung der Dehnungselemente,
Grundriss) und `js/29-einlaufblech-aufnahme.js` (Packrechnung). Per
`git diff` einzeln bestätigt.

`madaBruecke()` (js/32) setzt vor jeder Rechnung `madSegments`, `madSchieber`
und die alten Formularfelder aus dem Modell; danach liefern
`computeMadBoundaries()`, `calcMadSchieber()`, `berechneMadStueckliste()`,
`madProfilMasse()`, `madNormHinweise()` und `madProfilSvgAus()` direkt die
richtigen Werte. `madSegments` **ist** `madA.segmente` – eine Wahrheit, kein
Abgleich.

`madProfilMasse()` liest seine Werte direkt aus den Eingabefeldern. Damit die
Funktion unverändert bleiben kann, stehen dieselben Felder unsichtbar im
Block **`#madStummel`**; js/12b hängt dort auch seine Handler an. Gleiches
Vorgehen wie `#rinneStummel`, `#ebStummel`, `#ebkStummel` und `#fpStummel`.

### 87.2 Speichern: Superset

js/16 schreibt **unverändert** dieselben zehn Felder wie bisher (`material`,
`profil`, `abwicklung`, `segments`, `schieber`, `boundaries`,
`gesamtlaenge`, `stueckliste`, `bodenMass`, `schieberMass`) und ergänzt sie
nur um `flaeche_m2`, `ausmass` und `rollen`. Eine vor v2.79 gespeicherte
Aufnahme öffnet unverändert und druckt ohne die neuen Abschnitte – es wird
**nichts nachgerechnet** und **kein Boden erfunden**, den der Datensatz nicht
hatte.

Beim Öffnen gilt `schieberManuell = true`: die gespeicherten Schieber dürfen
nicht durch eine Neuberechnung überschrieben werden – genau das machte vorher
das Kästchen „Schieber von Hand".

### 87.3 Neu gegenüber v2.78

- **Verlauf als Karten** statt einer Tabelle: Länge, Ecke, 🔄, verschieben,
  löschen mit Rückfrage. Der Boden gilt nur an den beiden Aussenenden – nach
  Verschieben oder Löschen wird er dorthin zurückgeholt, statt unsichtbar
  wirkungslos stehen zu bleiben.
- **Boden und Schieber** mit Grenzpunkt-Tabelle, den gerechneten Positionen
  und dem Weg „von Hand" mit Rückkehr zur Rechnung.
- **Zuschnitt aus Rollenblech**, wie bei den drei anderen Register-Arten: von
  der Rolle wird eine Tafel abgeschnitten und quer in Streifen der
  Abwicklungsbreite geteilt; ein Streifen nimmt mehrere Stücke hintereinander
  auf. Gepackt wird mit `ebaPackeInStreifen()` aus js/29 – es gibt in der App
  nur **eine** Packrechnung. Anders als beim Freien Profil hat die
  Mauerabdeckung nur **eine** Abwicklung, also auch nur eine Streifenbreite.
  Die Rollenbreiten kommen aus `app_settings.blech_rollenbreiten` (seit
  v2.74), **keine neue Einstellung**.
- **Ausmass und Materialübersicht** ohne zweite Eingabe, ohne Artikelnummern
  und ohne Preise.
- **Kontrolle** mit Punkt am Register (rot bei Fehler): fehlende Masse,
  ungültige Zahlen, Verlauf, Boden, Schieber, Profil, Normhinweise, Ausmass,
  Zuschnitt.
- **Fotos und Skizzen am Ende** (`MEAS_MEDIEN_AM_ENDE` um `mauerabdeckung`
  erweitert, v2.75-Mechanik unverändert).
- Der Druck bekommt zusätzlich Blechfläche, Rollenblech-Plan und Ausmass –
  jeweils nur, wenn sie im Datensatz stehen.

### 87.4 Ein echter Fehler, den eine Gegenprobe gefunden hat

Die Boden-Kästchen an den Segmentkarten hiessen zuerst
`data-mada-bodenL="${i}"`. **HTML macht aus einem Attributnamen
Kleinbuchstaben**, also `data-mada-bodenl` → `dataset.madaBodenl`. Der
Handler prüfte `dataset.madaBodenL` und lief ins Leere: die Kästchen waren
sichtbar, aber tot. Behoben durch `data-mada-boden-l` / `-r` /
`data-mada-schieber-weg`; der Prüfstand kontrolliert seither ausdrücklich,
dass die Kästchen an der Segmentkarte wirken.

**Merksatz:** in einem `data`-Attributnamen niemals einen Grossbuchstaben –
immer mit Bindestrich schreiben.

### 87.5 Getestet

- **`pruefstaende/pruefstand-mauerabdeckung-app-v2-79.js` – 143/143**, echtes
  Chromium gegen die echte `index.html`: Modul und Brücke (madSegments ist
  madA.segmente, Stummelfelder gefüllt, Abstände aus dem Material-Katalog),
  neun Register (nur eigener Inhalt, Blättern verliert nichts, aktives
  Register bleibt sichtbar), Verlauf mit echtem Tippen und Fokusprüfung,
  Boden (ohne 1 Schieber, mit 2), Schieber automatisch und von Hand,
  Materialwechsel (5/4/3/2 Schieber), Profil, Gefälle, Biegewinkel, Wind,
  Norm, Stückliste, Zuschnitt aus Rollenblech (1000 mm → 4 Tafeln, 12.08 m²,
  3.75 m² Verschnitt; 670 mm → 8 Tafeln, 16.19 m²), Ausmass, Kontrolle,
  Fotos erst nach „Fertig", Speicher-Payload (alle zehn alten **und** die
  drei neuen Felder), Wiederöffnen, ein Datensatz im Format bis v2.78, Druck
  (neu und alt), fünf Bildschirmbreiten × neun Register, keine JS-Fehler.
- **12 Gegenproben**, jede baut einen echten Fehler ein und wirft den
  Prüfstand um; keine bricht ihn ab: Brücke setzt madSegments nicht (134) ·
  Stummelfelder nicht gefüllt (130) · Zusatzfelder nicht gespeichert (135) ·
  alter Datensatz bekommt einen Boden angedichtet (139) · Fotos schon während
  der Register (139) · alle Register auf einmal (119) · Eingabe zeichnet neu
  → Fokusverlust (135) · eigene Packrechnung (138) · Druck nimmt den
  gespeicherten Rollenplan nicht (139) · Boden wandert beim Verschieben mit
  (141) · dazu die beiden aus 87.4.
  **Fünf davon deckten zuerst Lücken im Prüfstand auf** (zwei Abbrüche statt
  Fehlschlägen, drei Kontrollen, die grün blieben) – alle geschlossen, danach
  bissen alle zwölf.
- **Regression grün**: rinne-app 102/102, einlaufblech-app 98/98,
  konisch-app 113/113, freies-profil-app 118/118, verschnitt-app 1578/1578,
  medien-am-ende 71/71, dila-sichtbar 57/57.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` gegen v2.78 gerendert – **DOM und Bild
  byteidentisch** (DOM `880d9fbdd4f04bb9`, 4979 Zeichen; Bild
  `26d89e102e3f452f`, 52606 Bytes), und zwei Läufe desselben Codes liefern
  dasselbe Ergebnis. `js/06-rapport.js`, `js/08-katalog-blitzschutz.js` und
  `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 34 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`/`</div>` in `index.html` ausgeglichen (686/686, vorher
  702/702 – weniger, weil das alte Formular durch die Registerfläche und den
  Stummel ersetzt wurde); keine doppelten Element-IDs; jede js-Datei in der
  Service-Worker-Liste.

**Eine überholte Erwartung** angepasst, kein Codefehler:
`pruefstand-medien-am-ende-v2-75.js` führte `mauerabdeckung` noch unter den
Arten, die den Fotobereich sofort zeigen (jetzt 71/71 statt 60/60).

### 87.6 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/32-mauerabdeckung-aufnahme.js` | **neu** – neun Register, Brücke, Ausmass, Zuschnitt, Kontrolle |
| `index.html` | Registerfläche `#mauerabdeckungAufnahme`, `#madStummel`, Script-Tag, Version 2.79 |
| `js/16-massaufnahme-formular.js` | Modul zeichnen, Payload-Superset, Medien am Ende, Druck um Blechfläche/Rollenblech/Ausmass erweitert |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `sw.js` | Cache-Version 2.79, neue Datei im SHELL |
| `pruefstaende/pruefstand-mauerabdeckung-app-v2-79.js` | **neu** |

**Nicht angefasst**: `js/12b-mauerabdeckung.js`, `js/12-rinne-halbrund.js`,
`js/29-einlaufblech-aufnahme.js`, `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `css/03-druck.css`, `css/01-basis.css`
(die `ra-*`-Klassen der übrigen Register-Arten reichten unverändert),
`js/11`, `js/13`–`js/15`, `js/17`, `js/19`–`js/28`, `js/30`, `js/31`.

### 87.7 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
  Geprüft ist die Oberfläche in echtem Chromium gegen die echte `index.html`.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei sehr vielen Stücken heisst das Ergebnis „beste gefundene
  Verteilung".
- Fachlich im Praxistest zu bestätigen: ob ein Innenwinkel wirklich dieselbe
  halbe Regel bekommt wie ein Aussenwinkel. Die bestehende Logik behandelt
  beide gleich (so steht es im Kommentar von js/12b), die Aufnahme übernimmt
  das unverändert.
- Der Prototyp unter `prototyp-mauerabdeckung/` bleibt auf seinem Branch
  bestehen – er ist jetzt die Vorlage, nicht mehr die einzige Stelle.

## 87. GLEICHE REGISTER, GLEICHE ZUSCHNITT-OPTIMIERUNG — VERSION 2.80

Die fünf umgebauten Massaufnahme-Arten (Rinne Halbrund, Einlaufblech gerade,
Einlaufblech konisch, Freies Profil, Mauerabdeckung) hatten dieselben Schritte,
aber in unterschiedlicher Reihenfolge und mit unterschiedlich benannten
Registern; die Zuschnitt-Optimierung war fünfmal eigenständig gebaut. Beides ist
jetzt vereinheitlicht. **Keine Schemaänderung, keine Migration, keine
RLS-/Storage-Änderung, keine Fachdatei angefasst, keine Rechnung verändert.**

### 87.1 Register: gleicher Name, gleiche Reihenfolge

Der Abschluss ist in **allen fünf** Arten derselbe:
**… → Zuschnitt → Ausmass → Kontrolle**, mit „Grunddaten" immer als Register 1
und der Kontrolle immer zuletzt.

| Art | vorher | jetzt |
|---|---|---|
| Rinne Halbrund | Grunddaten · Verlauf · Komponenten · **Kontrolle · Ausmass · Zuschnitt** (Stückliste und Normlängen in einem Register) | Grunddaten · Verlauf · Komponenten · **Stückliste · Zuschnitt · Ausmass · Kontrolle** |
| Einlaufblech gerade | Grunddaten · Geometrie · Stücke · **Kontrolle · Ausmass · Zuschnitt** | Grunddaten · Geometrie · Stücke · **Zuschnitt · Ausmass · Kontrolle** |
| Einlaufblech konisch | wie gerade | wie gerade |
| Freies Profil | … · **Segmente & Ausmass · Zuschnitt · Kontrolle** | … · **Segmente · Zuschnitt · Ausmass · Kontrolle** |
| Mauerabdeckung | … · Stückliste · Zuschnitt · Ausmass · Kontrolle · **Fotos & Speichern** | … · Stückliste · Zuschnitt · Ausmass · **Kontrolle** |

Zwei Register wurden dafür geteilt (Rinne: Stückliste/Zuschnitt; Freies Profil:
Segmente/Ausmass), eines entfiel (Mauerabdeckung: „Fotos & Speichern"). **Kein
Inhalt ging verloren** – die Mauerabdeckung führt jetzt wie die übrigen vier
Arten über den letzten Weiter-Knopf „Fertig › Fotos und Speichern" zum
Fotobereich, statt dafür ein eigenes Register zu haben.

Die Marke am Kontroll-Register hing in jedem Modul an einer **festen Nummer**
(`r.nr===4` bzw. `===7`). Sie hängt jetzt überall an `*_KONTROLLE =
*_REGISTER.length` – wird ein Register eingefügt, wandert sie mit, statt still
am falschen zu sitzen.

### 87.2 Eine Darstellung für den Zuschnitt: js/33-zuschnitt.js

Neue Datei mit **einer** Renderfunktion `zuschnittHtml(plan)`. Jede Art bringt
ihren Plan in dieselbe Form (`*ZuschnittPlan()`) und ruft sie auf. Aufbau, in
jeder Art identisch:

1. Einleitungssatz (was geschnitten wird)
2. **Kennzahlen – immer zuerst die STREIFENBREITE**
3. Fehler und Hinweise
4. Tabelle je Rollenbreite bzw. je Normlänge, beste Zeile hervorgehoben
5. Belegung: welches Stück liegt in welchem Streifen bzw. in welcher Stange
6. Fusszeile: woher die Breiten/Längen kommen

**Gerechnet wird weiterhin in den Modulen.** Es gibt unverändert genau **eine**
Packrechnung (`ebaPackeInStreifen` in js/29) und **eine** Normlängen-Rechnung
(`raNormPlan` in js/28) – js/33 stellt nur dar. Die alten, je Modul eigenen
Tabellen sind entfallen; der Prüfstand kontrolliert dauerhaft, dass keine
zurückkommt.

### 87.3 Die Streifenbreite steht überall

Sie ist die erste Kennzahl und wird darunter noch einmal als Satz genannt:
„Auf **330 mm** muss der Streifen geschnitten werden – das ist die Abwicklung
des Profils."

- **Freies Profil** hat als einzige Art mehrere Streifenbreiten (jedes Segment
  hat seine eigene Abwicklung). Die Kennzahl heisst dann „Streifenbreiten" und
  listet alle; „Str./Tafel" steht ehrlich auf „–", weil das bei mehreren
  Breiten keine einzelne Zahl ist.
- **Rinne Halbrund** schneidet keinen Streifen von der Rolle, sondern bezieht
  ein fertiges Profil in Normlängen. Die Kennzahl steht trotzdem an derselben
  Stelle und sagt **„entfällt"**, dazu ein Satz mit der Begründung – statt sie
  wegzulassen (dann wüsste man nicht, ob sie fehlt oder nicht gilt) oder eine
  Zahl zu erfinden.

### 87.4 Nichts verschwiegen

- „Zu lang für eine Tafel/Stange" nennt die betroffenen Stücke mit ihrer Nummer
  und sagt ausdrücklich, dass sie **nicht** im Plan enthalten sind.
- Zu schmale Rollen werden aufgezählt.
- Reicht das Suchbudget nicht, heisst es „beste gefundene Verteilung" und
  **nicht** die günstigste.
- Freies Profil: Segmente ohne Länge oder ohne Masse werden mit ihrer Nummer
  genannt, statt still weggelassen zu werden.
- Rinne: ohne hinterlegte Normlänge wird **nicht** gerechnet; die Karte sagt,
  wo sie einzutragen ist. Der Zusatz nennt Material und Grösse, für die der
  Plan gilt.

### 87.5 Getestet

**Neuer Prüfstand `pruefstaende/pruefstand-register-zuschnitt-v2-80.js` –
125/125**, echtes Chromium gegen die echte `index.html`: Registernamen und
-reihenfolge je Art, die Leiste zeigt genau diese Namen, der letzte Knopf heisst
überall „Fertig › Fotos und Speichern" und ist bedienbar, alle fünf Arten
zeichnen mit `zuschnittHtml`, keine Art hat eine eigene Tabelle mehr, mit echten
Daten vier Kennzahlen mit der Streifenbreite zuerst, kein NaN, Belegung und
Fusszeile vorhanden, leerer Zustand, vier Bildschirmbreiten.

**Sechs Gegenproben**, jede baut einen echten Fehler ein und wirft den Prüfstand
um: Kontrolle bei Einlaufblech wieder auf Register 4 (116/125) · Streifenbreite
nicht mehr zuerst (121/125) · Mauerabdeckung mit eigener Tabelle (116/125) ·
Mauerabdeckung behält „Fotos & Speichern" (122/125) · Rinne erfindet eine
Streifenbreite statt „entfällt" (124/125) · Freies Profil mit eigenen Tabellen
(116/125).

**Volle Regression grün**: rinneapp71 104/104, einlaufblech-app 98/98,
konisch-app 113/113, freies-profil-app 118/118, mauerabdeckung-app 144/144,
medien-am-ende 76/76, dila-sichtbar 57/57, verschnitt-app 1578/1578,
pdf52 526/526, kehle52 698/698, rinne57 379/379, required70 359/359,
einf70 185/185, offline70 117/117, feedback63 108/108, freipos65 99/99,
dila70 85/85, fotos70 88/88, fp70 83/83, breite57 84/84,
kehleintegration52 76/76, feedback70 47/47, einstbrowser68 47/47,
ebg70 49/49, mad70 45/45, module67 43/43, einst68 43/43, medien50 42/42,
adresse45 39/39, pfade55 38/38, dateien49 38/38, projekte47 37/37,
status46 35/35, auswahl48 32/32, breite52 52/52, modulebrowser67 16/16,
suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2 sowie nav, suche40,
treffer40, recent41, stand42, dateien43, ui39 ohne Fehlschlag.

**Regierapport nachweislich unverändert**: der Druck wurde in echtem Chromium
unter `media:print` mit ausgelöstem `beforeprint` gegen den v2.79-Stand
gerendert – **Bild und DOM byteidentisch** (Bild `85706e5d7a1eb615`, DOM
`3066be99c3200173`, 110 584 Bytes). `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.

`node --check` über alle 31 `js/*.js`, `sw.js` und alle Prüfstände fehlerfrei;
`<div>`/`</div>` in `index.html` ausgeglichen (686/686); keine doppelten
Element-IDs; jede js-Datei in der Service-Worker-Liste und in `index.html`.

**Angepasste Erwartungen in bestehenden Prüfständen** – alle **überholt**, keine
davon ein Codefehler: die Registernummern in den fünf Modul-Prüfständen, die
Registerzahl (9→8 bei der Mauerabdeckung, 7→8 beim Freien Profil, 6→7 bei der
Rinne), der Wortlaut der „keine Rolle breit genug"-Warnung und der Sprungknopf
aus dem Dehnungs-Block (zeigt jetzt auf die Stückliste). Der Prüfstand
`medien-am-ende` liest die Registerzahl jetzt aus der Leiste statt sie
anzunehmen. `fotos70` führte konisch, Freies Profil und Mauerabdeckung noch
unter den Arten, die den Fotobereich sofort zeigen – **das war schon vor dieser
Runde falsch** (gegen den v2.79-Stand nachgemessen: ebenfalls 85/88) und ist
jetzt mitkorrigiert.

**Zwei Beobachtungen aus dem echten Browser** (gemessen, nicht vermutet):
- Die langen Spaltenköpfe der Rollentabelle brachen auf 412 px mitten im Wort
  („ROLLENBREI TE"). Sie heissen jetzt kurz „Rolle · Str./Tafel · Tafeln ·
  Fläche · Verschnitt · Anteil".
- Der Prüfstand `medien-am-ende` scheiterte an der 2,5-Sekunden-Hervorhebung
  der jeweils vorigen Art. Das ist eine Eigenheit des Laufs, nicht der App; der
  Prüfstand wartet jetzt ab, statt eine Zahl zu raten.

### 87.6 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
- Zwei Arten klappt „Fertig" die Hervorhebung des Fotobereichs für 2,5 s auf.
  Werden zwei Arten kurz nacheinander abgeschlossen, nimmt der ältere Timer die
  neue Hervorhebung weg – rein kosmetisch, seit v2.71 so, nicht Teil dieser
  Runde.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei vielen Stücken heisst das Ergebnis „beste gefundene
  Verteilung".
- Die übrigen sechs Massaufnahme-Arten (Skizze/Foto, Lukarne,
  Ort-/Seitenbleche, Einfassung Rund, Kehle, Rinne-Zuschnittliste) haben keine
  Register und keinen Zuschnitt aus Rollenblech – sie sind von dieser
  Vereinheitlichung nicht berührt.

## 88. ZUSCHNITTLISTEN MIT LÄNGE × BREITE — VERSION 2.81

In allen fünf umgebauten Massaufnahme-Arten steht jedes Zuschnittstück jetzt
als **Länge × Breite**, z. B. `2'170 mm × 250 mm` – auf dem Bildschirm und im
Ausdruck. **Keine Schemaänderung, keine Migration, keine Rechnung verändert.**

### 88.1 Woher die Breite kommt

Nie geraten, immer das Mass, auf das das Blech tatsächlich geschnitten wird:

| Art | Breite |
|---|---|
| Rinne Halbrund | die Rinnengrösse (`groesse`) – im alten Modul hiess das Feld `rinne_abwicklung` |
| Einlaufblech gerade | die Abwicklung |
| Einlaufblech konisch | die Abwicklung |
| Mauerabdeckung | die Abwicklung aus `madProfilMasse()` |
| Freies Profil | die Abwicklung **je Segment**; konisch die grössere der beiden Seiten, weil der Streifen das breitere Ende enthalten muss |

Ist keine Breite bekannt, steht nur die Länge – es wird keine erfunden
(`zuMasse()` in js/33, `pdfLxB()` in js/16).

### 88.2 Wo es steht

**Bildschirm**
- Belegung im Zuschnitt-Register (js/33): Spaltenkopf „Zuschnitt (Länge ×
  Breite)", jedes Stück als Paar. Auch die Meldung „zu lang für eine Tafel/
  Stange" nennt jetzt das Mass, nicht nur die Nummer.
- Rinne · Stückliste und Mauerabdeckung · Stückliste: Spalte „Zuschnitt
  (Länge × Breite)".
- Einlaufblech gerade · Stücke: die Länge bleibt ein Eingabefeld, die Breite
  steht darunter („mm × 330 mm").
- Einlaufblech konisch: im Kopf jeder Stück-Karte, dazu das Feldlabel
  „Zuschnittlänge (mm) × 250 mm breit".
- Freies Profil: im Kopf jeder Segment-Karte, bei konisch zusätzlich beide
  Abwicklungen in Klammern.

**Ausdruck** (js/16, aus dem **gespeicherten** Datensatz – ein einmal
gedrucktes Blatt bleibt gleich): Einlaufblech gerade und konisch, Rinne
(Stückliste **und** Segmenttabelle), Mauerabdeckung, Freies Profil. Die
Spalten heissen dort „Zuschnitt L × B (mm)".

### 88.3 Zwei Dinge, die erst das Bild gezeigt hat

- Die Breite **neben** dem Eingabefeld drückte dieses in der schmalen Spalte
  auf rund 30 px zusammen – die eingetippte Zahl war nicht mehr lesbar
  (im Browser gemessen: `2` statt `2170`). Sie steht jetzt **unter** dem Feld.
  Der Prüfstand misst seither die Feldbreite und schlägt unter 70 px fehl.
- Ein Mass brach mitten im Wert um („6'085 mm ×" / „250 mm" war noch in
  Ordnung, „585 mm × 250" / „mm" nicht). Zwischen Zahl und Einheit steht
  jetzt ein geschütztes Leerzeichen. In js/33 muss das ein echtes Zeichen
  sein (` `), weil `&nbsp;` dort durch `esc()` als Text ausgegeben würde.

### 88.4 Getestet

- `pruefstand-register-zuschnitt-v2-80` auf **172/172** erweitert: die
  Belegung und die Stück-/Stücklisten jeder Art tragen das Paar (bei
  Eingabefeldern wird der Feldwert eingesetzt, weil `innerText` ihn nicht
  enthält), plus die Breitenmessung je Register.
- Neuer `pruefstand-laenge-mal-breite-druck-v2-81` – **24/24**: für alle fünf
  Arten wird ein Ausdruck erzeugt und geprüft, dass **die richtigen Paare**
  darin stehen (2070 × 250, 12000 × 250, 8000 × 460, 3000 × 300 …) und kein
  NaN/undefined.
- **Fünf Gegenproben**, jede reproduziert einen echten Fehler: Breite im Druck
  weglassen (11/24) · falsche Breite im Druck (21/24) · `zuMasse` ohne Breite
  (135/140) · Rinne-Stückliste ohne Breite (139/140) · Breite wieder neben das
  Feld (168/172).
- Volle Regression grün, Regierapport-Ausdruck byteidentisch zu v2.80
  (Bild `85706e5d7a1eb615`, DOM `3066be99c3200173`). `node --check` über alle
  31 js-Dateien und alle Prüfstände fehlerfrei, `<div>` 686/686, keine
  doppelten IDs.
- Zwei Fehlschläge kamen aus **meinen Testdaten**, nicht aus dem Code: ein
  Profil ohne Vor-/Nachname ergab „Bearbeiter: undefined undefined", und
  `konisch:"nein"` als Zeichenkette ist im gespeicherten Datensatz ein
  **Boolean** (js/16 legt `$("fp_konisch").value==="ja"` ab).

### 88.5 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (Sandbox-Netzwerksperre) – **das
  wird ausdrücklich nicht als getestet behauptet.**
- Die Stück-Tabelle des Einlaufblechs hat acht Spalten und scrollt auf dem
  Handy weiterhin seitwärts – das ist unverändert seit v2.74 und Absicht
  (`.scroll`).
- Die übrigen sechs Massaufnahme-Arten sind nicht berührt. Lukarne
  („Zuschnitt B × L") und Einfassung Rund („Zuschnitt Länge/Breite") nennen
  beide Masse ohnehin schon.

## 89. SKIZZE / FOTO PASST ZUM REST — VERSION 2.82

Die Massaufnahme „Skizze / Foto" war die einzige Art, die weder Register noch
einen erklärenden Block hatte und die das nackte Browser-Dateifeld zeigte.
Angepasst wurde nur, was dafür wirklich nötig war. **Keine Schemaänderung,
keine Migration, keine Rechnung, keine Fachdatei angefasst.**

### 89.1 Bewusst KEINE Register

Die Art hat genau **ein** Eingabefeld (Material); alles andere ist der
gemeinsame Foto-/Skizzenbereich, Notiz und Speichern. Register würden nur
Klicks kosten, ohne etwas zu ordnen – anders als bei den fünf Arten, die
Verlauf, Geometrie, Stückliste, Zuschnitt, Ausmass und Kontrolle haben.
Der Prüfstand hält das fest: Skizze/Foto hat **keine** Registerleiste, die
fünf anderen haben weiterhin ihre.

Ihre Bezugsgruppe sind die vier übrigen Arten ohne Register – Kehle, Lukarne,
Ort-/Seitenbleche, Einfassung Rund. Deren Bauform ist: erklärender
`.info`-Block, darunter ein `.grid` mit den Eingaben. Genau das fehlte
Skizze/Foto als einziger.

### 89.2 Was geändert wurde

- **Erklärender Block** wie bei den vier anderen: wofür die Art gedacht ist,
  dass hier nichts gerechnet wird (und es deshalb keine Schritte gibt) und
  dass Foto oder Skizze nötig ist.
- **Statuszeile** `#fotoStatus`: „Noch kein Foto und keine Skizze – mindestens
  eines von beiden ist zum Speichern nötig." bzw. „✓ 1 Foto · 3 Skizzen
  erfasst." Die übrigen Arten zeigen ihr Rechenergebnis; diese hat keines,
  also zeigt sie, was tatsächlich da ist. Bis dahin sagte das nur ein
  `alert()` beim Speichern. `measMedienStatus()` hängt an
  `renderSketchGallery()` (deckt Skizzen, Zurücksetzen und Füllen ab), an den
  beiden Foto-Stellen und an `showMeasTypeSection()`.
- **Foto-Knopf wie jeder andere Datei-Knopf der App**: bisher das nackte
  `<input type="file">` – winzig, englisch („Choose File / No file chosen")
  und auf der Baustelle kaum zu treffen. Jetzt ein `label.cockpit-upload`
  über die volle Breite (44 px hoch) mit dem versteckten Feld darin, genau
  wie der Projektdatei-Knopf aus v2.49. `capture="environment"` und `accept`
  bleiben erhalten. **Betrifft alle elf Massaufnahme-Arten**, weil der
  Foto-/Skizzenbereich gemeinsam ist.
- **Derselbe Knopf im Ausmass** (`#amPhotoInput`, Mehrfachauswahl bleibt) –
  sonst wäre die App an einer Stelle neu und an der anderen alt.
- **`label.cockpit-upload` nicht mehr in GROSSBUCHSTABEN**: die globale Regel
  `label{text-transform:uppercase}` schlug seit v2.49 auch auf diesen Knopf
  durch. Im Browser gemessen: der bestehende Projektdatei-Knopf las sich
  „＋ DATEI/FOTO HINZUFÜGEN", während jeder echte `button` daneben gemischt
  geschrieben ist. Ein `text-transform:none` in der eigenen Regel – dritter
  Fall derselben Falle nach `[hidden]` (59), `table{min-width}` (60.5) und
  den Eingabefeldern (72.5).

Unverändert: Vorschau, „✏️ Auf Foto zeichnen", „✕ Foto entfernen",
Skizzengalerie, Speicher-Payload (weiterhin genau das eine Feld `material`),
die Pflichtprüfung beim Speichern und der Druck.

### 89.3 Getestet

Neuer Prüfstand `pruefstaende/pruefstand-skizze-foto-v2-82.js` – **42/42**,
echtes Chromium gegen die echte `index.html`: keine Registerleiste bei
Skizze/Foto und weiterhin welche bei den fünf anderen; erklärender Block
vorhanden und inhaltlich passend, dazu die Gegenprobe, dass Kehle, Lukarne,
Ort-/Seitenbleche und Einfassung Rund ebenfalls einen haben; Statuszeile in
allen fünf Zuständen (nichts, 1 Skizze, 3 Skizzen, Foto+Skizzen, nach dem
Entfernen) und nach dem Umschalten der Art; Foto-Knopf (Höhe ≥ 44 px, volle
Breite, deutsch, keine Grossbuchstaben, Zeiger, verstecktes Feld darin,
`capture`/`accept` erhalten, **ein Klick öffnet wirklich die Dateiauswahl**);
derselbe Knopf im Ausmass; kein nacktes Dateifeld mehr im Formular; Vorschau/
Zeichnen/Entfernen/Galerie unverändert; Speicher-Payload unverändert; fünf
Bildschirmbreiten.

**Fünf Gegenproben**, jede baut einen echten Fehler ein: Knopf zurück auf das
nackte Feld (32/42) · erklärender Block entfernt (39/42) · Statuszeile lügt
(40/42) · Grossbuchstaben zurück (41/42) · Register auch für Skizze/Foto
(41/42).

Die erste Gegenprobe hat den Prüfstand zuerst **abstürzen** lassen (Klick auf
ein nicht vorhandenes Label) – ein abgebrochener Lauf sieht aus wie „keine
Fehler". Die Stelle meldet jetzt sauber „nein". Ausserdem kamen zwei
`Uncaught (in promise)`-Meldungen aus **meinen Testdaten**: Skizzen als nackte
Zeichenketten statt `data:`-URLs liessen die Galerie eine signierte URL beim
Storage holen, den es im Prüfstand nicht gibt.

Volle Regression grün (alle 11 Repo-Prüfstände, alle 40 archivierten).
Regierapport-Ausdruck byteidentisch zu v2.81 (Bild `85706e5d7a1eb615`, DOM
`3066be99c3200173`). `node --check` fehlerfrei, `<div>` 688/688, keine
doppelten IDs.

### 89.4 Offene Punkte

- Kein Live-Klicktest gegen Supabase möglich (Sandbox-Netzwerksperre) – **das
  wird ausdrücklich nicht als getestet behauptet.** Insbesondere ein echter
  Foto-Upload vom Handy ist nicht geprüft.
- **Nur ein Foto je Massaufnahme** – `photo_path` ist ein Einzelwert. Mehrere
  Fotos wären eine Schema-Erweiterung und waren nicht verlangt; Skizzen sind
  weiterhin beliebig viele.
- `#logoInput` (Firmenlogo in den Einstellungen) ist das letzte verbliebene
  nackte Dateifeld der App – ausserhalb dieses Auftrags, bewusst nicht
  angefasst.

## 88. MEHRERE FOTOS + KEHLE ALS REGISTER-AUFNAHME — VERSION 2.83

Zwei Dinge in einer Runde: eine Massaufnahme kann jetzt **mehrere Fotos**
tragen, und die **Kehle** ist nach demselben Muster umgebaut wie die fünf
Arten davor. Grundlage der Kehle-Rechnung bleibt unverändert
`js/25-kehle.js` (die 35 Werte der Vorlage „Winkel zu Kehlen Lukarne MA",
Spalte C).

    1 Grunddaten · 2 Winkel · 3 Segmente · 4 Zuschnitt · 5 Ausmass · 6 Kontrolle

### 88.1 Teil A – mehrere Fotos

Bisher trug eine Aufnahme genau **ein** Foto (`measurements.photo_path`).
Skizzen waren seit je mehrere (`sketch_paths`). Fotos gehen jetzt denselben
Weg.

Migration `measurements_photo_paths_v2_83`:

```sql
alter table public.measurements
  add column if not exists photo_paths jsonb not null default '[]'::jsonb;
```

Additiv und nullfrei – keine bestehende Zeile ändert sich, kein
Zeilentrigger feuert.

**`photo_path` bleibt und trägt weiterhin das erste Foto.** Alle Stellen,
die nur dieses eine Feld kennen (Vorschaubild in den Übersichtslisten, das
Cockpit, ältere Ausdrucke), funktionieren dadurch unverändert weiter. Eine
vor v2.83 gespeicherte Aufnahme öffnet mit genau ihrem einen Foto – es wird
keines erfunden.

| Stelle | vorher | jetzt |
|---|---|---|
| Zustand (js/10) | `measPhotoDataUrl` + `measExistingPhotoUrl` | **eine Liste** `measPhotos` – wie `measSketches` |
| Formular | ein Vorschaubild, „✕ Foto entfernen", „✏️ Auf Foto zeichnen" | **Galerie** mit ✏️ und ✕ **je Foto**, gleiche Bausteine wie die Skizzengalerie |
| Auswahl | eine Datei | `multiple`; alle gewählten Dateien werden übernommen, misslungene einzeln gemeldet |
| Statuszeile | „1 Foto" | „3 Fotos · 2 Skizzen" |
| Speichern | ein Upload | jedes neue Foto einzeln, `photo_path` = erstes, `photo_paths` = alle |
| Druck | ein Abschnitt „Foto" | „Foto 1 von 3", „Foto 2 von 3" … |
| Cockpit (js/24) | `{foto,skizzen}` | `{fotos,skizzen}`, „📷 2 Fotos", eine Kachel je Foto |

Der Bucket bleibt privat: ein gespeichertes Foto wird vor dem Zeichnen über
`storageSignedUrl()` aufgelöst, es entsteht **keine** öffentliche URL.
Dabei mitgehärtet: `storageSignedUrl()` prüfte nur `error` und griff sonst
auf `data.signedUrl` zu – bei einer leeren Antwort war das ein Absturz.

### 88.2 Teil B – js/25 bleibt byteweise unverändert

`js/25-kehle.js` wurde **nicht angefasst** – per `git diff` bestätigt.
`keaBruecke()` (js/34) setzt `#kehle_nh`, `#kehle_nl`, `#kehle_gl` aus dem
erfassten Stand; danach liefern `kehleEingabenAusFeldern()`,
`kehleBerechnen()` und `renderKehleResult()` direkt die richtigen Werte.

Der Prüfstand vergleicht `keaErgebnis()` Zeichen für Zeichen mit
`kehleBerechnen(kehleEingabenAusFeldern())` – es gibt nur **eine** Wahrheit,
keinen Nachbau. Die Excel-Werte sind unverändert: NH 42.5 / NL 23.5 →
**b = 66.48°, c = 122.77°, d = 47.46°**.

Die drei Felder stehen jetzt unsichtbar in **`#kehleStummel`**, die
Ergebnisanzeige der Vorlage als festes Gerüst **`#keaErgebnisBox`** – sie
wird nur ein- und ausgeblendet (sie gehört zu Register 2). Ein Neuschreiben
per `innerHTML` würde die Handler von js/25 samt Element vernichten.

### 88.3 Neu gegenüber v2.82

- **Abwicklung 400 / 500 / 670 mm.** Sie wird **gewählt, nicht gerechnet** –
  die Vorlage kennt keine Abwicklung.
- **Kehle mit oder ohne Mittelrippe.** Ohne Mittelrippe ist der Biegewinkel
  Kehlblech (**d**) der führende Winkel, mit Mittelrippe der Innenwinkel zur
  Mittelrippe (**k / 2**, in der Vorlage `mitte` / F34). Beide Werte kommen
  unverändert aus js/25, es wird nichts neu gerechnet.
- **Mehrere Segmente** mit Länge Stoss/Stoss und **eigener Überlappung je
  Stoss**. Zuschnitt = Länge + Überlappung.
- **„Segmente aus Kehllänge A berechnen"** teilt über die bestehende
  `teileLaengeInStuecke()` (js/13) mit den neuen Kehle-Einstellungen auf.
  Beispiel: A = 5453 mm bei 2000 mm Stoss/Stoss → 2000+70, 2000+70, 1453 →
  Zuschnitt 5593 mm. Die Aufteilung ist ein **Vorschlag**, nichts wird
  erzwungen; die Kehle kann bewusst kürzer oder länger ausgeführt sein.
- **Zuschnitt aus Rollenblech** über die gemeinsame Darstellung (js/33) und
  die **eine** Packrechnung `ebaPackeInStreifen()` (js/29). Beispiel:
  Abwicklung 500, Tafel 2070 mm → beste Rolle 1000 mm, 2 Streifen je Tafel,
  2 Tafeln, 4.14 m² gegen 2.80 m² netto.
- **Ausmass und Materialübersicht** ohne zweite Eingabe, ohne
  Artikelnummern und ohne Preise.
- **Kontrolle** mit Punkt am Register. Weicht die Summe der Segmente
  deutlich von der berechneten Kehllänge A ab, ist das ein **Hinweis**, kein
  Fehler.
- **Fotos und Skizzen am Ende** (`MEAS_MEDIEN_AM_ENDE` um `kehle` erweitert,
  v2.75-Mechanik unverändert).

### 88.4 Neue Einstellung

`KEHLE_STANDARD` in js/01 (`stoss_laenge` 2000, `ueberlappung` 70,
`rest_schwelle` 500), im `localStorage` unter `sd_kehleSettings` – gleiche
Form wie `EINLAUFBLECH_STANDARD`, damit `teileLaengeInStuecke()` unverändert
damit rechnet. Zu finden unter **Einstellungen → Massaufnahmen → Kehle**.
Die Rollenbreiten bleiben firmenweit (`app_settings.blech_rollenbreiten`,
seit v2.74) – **keine neue firmenweite Einstellung**.

### 88.5 Speichern: Superset

js/16 schreibt **unverändert** die drei Eingaben und alle 35 Werte der
Vorlage und ergänzt nur `material`, `abwicklung`, `mittelrippe`, `segmente`,
`zuschnittSumme`, `flaeche_m2`, `ausmass` und `rollen`. Eine vor v2.83
gespeicherte Kehle öffnet unverändert und druckt ohne die neuen Abschnitte –
es wird **nichts nachgerechnet** und **kein Segment erfunden**.

### 88.6 Ein Fehler, den erst eine Gegenprobe gefunden hat

Der `change`-Handler zeichnete nach einer Zahleneingabe alles neu. Springt
man vom Längen- ins Überlappungsfeld, feuert `change` beim Verlassen – das
gerade fokussierte Zielfeld wurde dabei ersetzt und die ersten Zeichen
gingen verloren. Genau der Fehlertyp aus Abschnitt 66, nur über `change`
statt `input` ausgelöst.

Behoben wie in js/29: Zahleneingaben zeichnen **nicht** neu. `keaLive()`
aktualisiert die abgeleiteten Anzeigen Zelle für Zelle (`data-kea-zu`), dazu
Summen und die Marke am Kontroll-Register. Der Prüfstand tippt seither
Zeichen für Zeichen und prüft den Fokus.

### 88.7 Getestet

- **`pruefstaende/pruefstand-kehle-app-v2-83.js` – 109/109**, echtes
  Chromium gegen die echte `index.html`: Modul und Brücke (inkl.
  Zeichen-für-Zeichen-Vergleich mit js/25), sechs Register, Grunddaten,
  Winkel, Segmente (echtes Tippen mit Fokusprüfung, Vorgabe aus den
  Einstellungen, Löschen mit Rückfrage), Zuschnitt (Streifenbreite zuerst,
  von Hand nachgerechnete Zahlen, **Nachweis, dass die gemeinsame
  Packrechnung wirklich gerufen wird**), Ausmass, Kontrolle, Speicher-
  Payload, Wiederöffnen, ein Datensatz im Format bis v2.82, Fotos erst nach
  „Fertig", Druck (neu und alt), fünf Bildschirmbreiten × sechs Register,
  keine JS-Fehler.
- **Zwölf Gegenproben**, jede baut einen echten Fehler ein, jede wirft den
  Prüfstand um, keine bricht ihn ab: Brücke setzt die Stummelfelder nicht
  (66/109) · eigene Aufteilung statt `teileLaengeInStuecke` (79) ·
  Überlappung fällt aus dem Zuschnitt (94) · Vorgabe nicht aus den
  Einstellungen (106) · Zusatzfelder nicht gespeichert (96) · alter
  Datensatz bekommt Segmente angedichtet (106) · Tafellänge = Summe (102) ·
  eigene Packrechnung (107) · eigene Zuschnitt-Darstellung (106) · Register
  in anderer Reihenfolge (108) · Fotos schon während der Register (108) ·
  Neuzeichnen beim Feldwechsel (107).
- **Zwei Gegenproben deckten Schwächen im Prüfstand selbst auf**: eine liess
  ihn **abbrechen** statt fehlschlagen (ein abgebrochener Lauf sieht aus wie
  „keine Fehler") – alle Indexzugriffe sind jetzt abgesichert; eine blieb
  **grün** (die eigene Packrechnung lieferte für den Testfall zufällig
  dasselbe) – geprüft wird jetzt, dass `ebaPackeInStreifen` tatsächlich
  gerufen wird **und** dass zwei kurze Stücke im selben Streifen landen.
- **`pruefstand-skizze-foto-v2-82.js` – 54/54** mit einem neuen Abschnitt
  für mehrere Fotos: drei Kacheln, ✏️/✕ je Foto, „3 Fotos" in der
  Statuszeile, `multiple` am Eingabefeld, genau das mittlere Foto entfernen,
  `photo_path` trägt weiterhin das erste, ein älterer Datensatz mit nur
  `photo_path` öffnet mit einem Foto, das Cockpit zählt mehrere.
- **Kehle in die gemeinsamen Prüfstände aufgenommen**:
  `register-zuschnitt` 197/197 (vorher 172), `lxb-druck` 29/29 (vorher 24),
  `medien-am-ende` 88/88 (vorher 76).
- **Volle Regression grün**: rinne-app 104/104, einlaufblech-app 98/98,
  konisch-app 113/113, freies-profil-app 118/118, mauerabdeckung-app 144/144,
  dila-sichtbar 57/57, verschnitt-app 1578/1578, pdf52 526/526,
  required70 368/368, kehle52 698/698, kehleintegration52 76/76,
  fotos70 88/88, medien50 42/42, offline70 119/119, einf70 185/185,
  rinne57 379/379, breite57 84/84, feedback63 108/108, freipos65 99/99,
  dila70 85/85, fp70 83/83, pfade55 38/38, abstand69 2/2 und alle übrigen
  Archiv-Prüfstände.
- **Angepasste Erwartungen** (alle **überholt**, keine davon ein Codefehler):
  `required70` kannte die Kehle-Pflichtfelder noch als `kehle_nh/nl/gl` (sie
  heissen jetzt `kea_nh/nl/gl`, dazu `kea_material`, und entstehen erst beim
  Zeichnen des jeweiligen Registers – die Zählprüfungen sammeln deshalb jetzt
  über mehrere Zustände statt einen einzigen Blick zu nehmen);
  `kehleintegration52` und `medien50` kannten `measMedienPfade().foto` als
  Einzelwert; `fotos70`, `medien-am-ende` und `mauerabdeckung-app` führten
  `kehle` noch unter den Arten ohne Register.
- **`breite56` (Archiv) schlägt mit 35/40 fehl – schon vor dieser Runde.**
  Gegen den v2.82-Stand nachgemessen: identisch 35/40. Er erwartet noch die
  Excel-Fixmasse 510 statt der seit v2.58 ausgelieferten 460 (Abschnitt 66.3)
  und ist durch `rinne57` (379/379) und `breite57` (84/84) abgelöst.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` gegen den v2.82-Stand gerendert – **Bild und DOM
  byteidentisch** (Bild `7843254639d00fad`, DOM `3066be99c3200173`,
  109 744 Bytes). `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
  `css/03-druck.css` und alle zwölf Fachdateien sind nicht im Diff.
- **Der echte Kehle-Datensatz der Produktivdatenbank** (NH 68 / NL 45 /
  GL 1500, vom Betreiber am 02.09. angelegt) wurde im Browser geöffnet:
  b = 74.06°, d = 74.64° unverändert, kein Material und kein Segment
  erfunden, die Kontrolle nennt beides als offen.

### 88.8 Ehrlich: unversionierte Arbeit zerstört

Bei einer Gegenprobe habe ich den eingebauten Fehler mit
`git checkout -- js/ index.html` zurückgenommen. Der Arbeitsbaum war nicht
sauber – der Befehl hat **alle** noch nicht eingecheckten Änderungen
verworfen: Teil A (mehrere Fotos) **und** die fertige Kehle-Verdrahtung.
`git stash`, `git fsck` und die Ablage brachten nichts zurück; beides wurde
neu gebaut und danach erneut vollständig geprüft (die Zahlen oben sind vom
neu gebauten Stand). Nur `js/34-kehle-aufnahme.js` überlebte, weil es
unversioniert war – dort steckte allerdings noch die Gegenprobe drin, was
erst der Prüfstand gemeldet hat.

**Regel daraus**: vor einer Gegenprobe den ganzen Baum sichern
(`cp -r js index.html sw.js css /tmp/sicher/`) und daraus zurückstellen –
niemals `git checkout` auf einem Baum mit unversionierter Arbeit.

### 88.9 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet
  behauptet.** Geprüft ist die Oberfläche in echtem Chromium gegen die echte
  `index.html`; ein echter Foto-Upload wurde nicht ausgeführt.
- Die Abwicklung des Kehlblechs wird **gewählt**, nicht aus NH/NL/GL
  abgeleitet – die Vorlage enthält dafür keine Rechnung.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei sehr vielen Segmenten heisst das Ergebnis „beste
  gefundene Verteilung".
- Kein Detail-Diff der Kehle-Segmente im Änderungsverlauf (wie bei allen
  Array-Strukturen, Klasse C aus Abschnitt 42.2).

## 89. LÄNGE × BREITE IN JEDEM DRUCK + KEHLE: FIRSTGEHRUNG UND TRAUF-/FIRSTSTÜCK — VERSION 2.84

Zwei Punkte aus der Rückmeldung. **Keine Schemaänderung, keine Migration,
keine RLS-/Storage-Änderung.**

### 89.1 Teil A – der Druck: alle elf Arten geprüft

v2.81 hatte `pdfLxB` nur in den damals fünf umgebauten Arten eingesetzt.
Diese Runde prüft **jede** Art einzeln:

| Art | vorher | jetzt |
|---|---|---|
| Einlaufblech gerade / konisch, Rinne Halbrund, Mauerabdeckung, Freies Profil, Kehle | `L × B` (v2.81/v2.83) | unverändert |
| **Lukarne** | „Zuschnitt B × L", beide Werte da | unverändert – siehe 89.2 |
| **Ort- und Seitenbleche** | zwei getrennte Spalten „Zuschnitt Länge" / „Zuschnitt Breite" | **eine** Spalte `Zuschnitt L × B (mm)` |
| **Einfassung Rund** | nur „Zuschnittbreite (Querschnitt)" und „Breite der gesamten Einfassung" – **kein Zuschnitt** | zusätzliche Zeile `Zuschnitt L × B` (Gesamtbreite × Abwicklung) |
| **Rinne (Zuschnittliste)** | Spalte „Zuschnitt" nur mit der Länge | `Zuschnitt L × B`; **B ist die grössere** der beiden Abwicklungen, weil ein Stück mit unterschiedlicher Abwicklung links/rechts auf der breiteren Seite Platz braucht – dazu ein Satz unter der Tabelle |
| Skizze / Foto | keine Stückliste | nichts zu tun |

### 89.2 Lukarne bewusst nicht umgestellt

Die Lukarne nennt beide Masse seit je (`Zuschnitt B × L`), nur in der
anderen Reihenfolge. Die Zeilen kommen aus `lukScharenZeilen()` in
**js/19-lukarne.js** und speisen Bildschirm **und** Druck. Für eine reine
Reihenfolge hätte eine geschützte Fachdatei geändert werden müssen –
bewusst unterlassen. Die Angabe ist vollständig vorhanden.

### 89.3 Teil B – Kehle: Firstgehrung ja/nein

Neues Häkchen **„Firstgehrung vorhanden"** in `1 · Grunddaten`.

- **Vorgabe ist „ja"** – eine bereits erfasste Kehle und der bisherige
  Zweck des Moduls ändern sich dadurch nicht. Ein Datensatz ohne das Feld
  (vor v2.84) gilt als „mit Firstgehrung": das Modul konnte gar nichts
  anderes.
- **Ohne Firstgehrung wird gar nicht gerechnet.** `keaErgebnis()` liefert
  dann sofort „nicht gerechnet", ohne `kehleBerechnen()` überhaupt
  aufzurufen. Register 2 zeigt statt der drei Eingaben den Grund; die
  Ergebnisanzeige der Vorlage bleibt zu; es gibt keine Kehllänge A und
  damit auch keine Aufteilung daraus.
- Die Kontrolle bemängelt dann **keine** fehlenden Neigungen, das
  Speichern verlangt sie nicht, und der Payload legt **keine** Winkel ab
  statt Platzhalter. Der Druck lässt Eingaben, Hauptresultate und weitere
  Resultate weg und sagt in einem Satz warum – Zuschnittliste, Ausmass
  und Rollenblech bleiben.
- Erneut angekreuzt rechnet alles unverändert weiter (b = 66.48° usw.).

**js/25-kehle.js bleibt byteweise unverändert** – das Häkchen entscheidet
nur, ob die Fachdatei überhaupt gefragt wird.

### 89.4 Teil B – Trauf- und Firststück

Zwei Eingaben in `3 · Segmente`: **Länge Traufstück** und **Länge
Firststück**. Ohne Eingabe wird keine Länge erfunden (Vorgabe 0 = nicht
festgelegt).

Sie wirken **beim Anlegen**, danach ist die Länge in der Liste frei
änderbar – dasselbe Prinzip wie die Verkettung bei der Rinne (Abschnitt
64.4). Eine spätere Änderung der Vorgabe wirkt **nie rückwirkend**.

- „🔄 Segmente aus Kehllänge A berechnen" setzt das Traufstück nach
  **vorne**, das Firststück nach **hinten** und teilt nur den Rest
  dazwischen über die bestehende `teileLaengeInStuecke()` auf. Die Summe
  bleibt die Kehllänge A.
- „＋ Traufstück" / „＋ Firststück" legen ein solches Stück von Hand an –
  vorne bzw. hinten, jeder Knopf nur einmal, gesperrt solange keine Länge
  festgelegt ist. Die Knopfzustände werden ohne Neuzeichnen nachgeführt,
  damit das Eingabefeld den Fokus behält.
- Die Rolle steht in der Stückliste, im Ausmass (eigene Position je
  Stück) und im Druck; sie bleibt beim Ändern der Länge erhalten.
- Ist eine Länge festgelegt, aber kein solches Stück in der Liste, ist
  das ein **Hinweis** in der Kontrolle – kein Fehler.

### 89.5 Zwei Darstellungsfehler, im Browser gemessen

1. „Traufstück" in der schmalen Nr.-Spalte brach **Buchstabe für
   Buchstabe** um („Tra ufst ück") – `.eb-table.ra-tab` setzt
   `word-break:break-word`.
2. Die Korrektur (`white-space:nowrap`) verbreiterte die Spalte und
   **drückte die Längenfelder auf 8 px zusammen**: aus „800" wurde „8".
   Exakt die Falle aus v2.81.

Gelöst mit einer kurzen Kennzeichnung („Trauf" / „First", voller Name als
Tooltip) **und** `min-width:62px` auf den Zahlenfeldern dieser Tabelle.
Der Prüfstand misst seither Zeilenhöhe der Kennzeichnung, Feldbreite und
den tatsächlich sichtbaren Wert – beide Gegenproben schlagen fehl.

### 89.6 Getestet

- **`pruefstand-kehle-app-v2-83.js` – 157/157** (vorher 109): neu die
  Abschnitte „Firstgehrung" und „Trauf- und Firststück" sowie die drei
  Layout-Messungen.
- **`pruefstand-laenge-mal-breite-druck-v2-81.js` – 46/46** (vorher 29):
  deckt jetzt **alle** Arten mit Stückliste ab, also auch Ort-/
  Seitenbleche, Einfassung Rund, Rinne und Lukarne.
- **Zehn neue Gegenproben**, jede wirft den Prüfstand um: Winkel wird
  auch ohne Firstgehrung gerechnet (148/157) · alter Datensatz gilt als
  ohne Firstgehrung (152) · Traufstück bei der Aufteilung übergangen
  (151) · Traufstück hinten statt vorne (151) · Längenfeld zeichnet neu
  (149) · neue Felder nicht gespeichert (151) · Payload speichert Winkel
  ohne Firstgehrung (153) · Druck bringt den Winkelteil trotzdem (153) ·
  Kennzeichnung bricht im Wort (156) · Längenfelder zusammengedrückt
  (156). Dazu drei für Teil A: Ort-/Seitenbleche ohne Breite (43/46) ·
  Einfassung ohne Zuschnitt (44) · Rinne nur Länge (44).
- **Ein echter Fehler kam aus einer dieser Prüfungen**: ohne Firstgehrung
  blieb die Ergebnisanzeige der Vorlage in Register 2 offen stehen.
- Volle Regression grün, Regierapport unverändert.

### 89.7 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert
  ausgehende HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`.
  **Das wird ausdrücklich nicht als getestet behauptet.**
- Lukarne bleibt bei `B × L` (89.2).
- Trauf- und Firstlänge gehören zur einzelnen Massaufnahme, nicht zu den
  Einstellungen – sie hängen vom Dach ab. Ein Vorgabewert je Gerät wäre
  eine spätere, eigene Entscheidung.

## 90. ROLLENBLECH-ZUSCHNITT UND PDF-LISTENAUSWAHL ALS STANDARD — VERSION 2.85

Zwei ab jetzt verbindliche gemeinsame Standards für alle umgebauten und alle
künftigen Massaufnahme-Module: **eine** Darstellung des Rollenblech-Zuschnitts
und **ein** Auswahldialog vor jedem PDF. Dazu die Verlagerung des Blechlagers
in die allgemeinen Einstellungen mit einer Auswahl je Massaufnahme.

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.** Keine
Fachrechnung verändert: es gibt weiterhin genau **eine** Packrechnung
(`ebaPackeInStreifen`, js/29) und **eine** Normlängenrechnung (`raNormPlan`,
js/28).

### 90.1 Ausgangszustand (frisch am Repo geprüft, nicht aus Berichten)

| Ort | Was |
|---|---|
| js/29 | `ebaPackeInStreifen()` – die einzige Packrechnung, von allen Rollen-Arten benutzt |
| js/28 | `raNormPlan()` – die Normlängenrechnung der Rinne, fachlich eigenständig |
| js/33 | `zuschnittHtml()` – seit v2.80 die einzige Bildschirm-Darstellung |
| js/16 | `printMeasurement()` mit **elf** Zweigen, darin **fünf** kopierte Rollenblech-Druckblöcke |
| js/17 | `printAusmass()` – der zweite und letzte Druckerzeuger |

Die Bildschirmdarstellung war eine Kennzahlenzeile plus zwei technische
Tabellen – korrekt, aber auf dem Handy viel Text, bevor überhaupt klar war,
**was** zugeschnitten wird. Die fünf Druckblöcke waren fast gleich und liefen
seit v2.74 langsam auseinander.

### 90.2 Zuschnittliste: STÜCKZAHL × LÄNGE × ABWICKLUNG

Neue Hauptansicht in js/33, in jeder Art identisch:

```
ROLLENBLECH 1'000 mm
  2 ×  1'850 × 250 mm     Gehrung links · Stück 1, 2
  1 ×  1'850 × 250 mm     Stück 3
  2 ×  1'420 × 250 mm     Stück 4, 5
  1 ×    980 × 250 mm     Stück 6
2 Tafeln à 1'850 mm
```

Stückzahl und Mass mit 19 px – auf dem Handy aus dem Stand lesbar. Alles
Technische (Kennzahlen, Rollenbreiten-Vergleich, Belegung der Streifen,
Herkunft der Breiten) steht unverändert darunter in einem zugeklappten
`<details>`; es ging **nichts** verloren.

**Zusammengefasst wird nur, was für den Zuschnitt wirklich gleich ist.** Der
Gruppenschlüssel ist `Länge | Abwicklung | merkmal`. Das `merkmal` liefert das
Modul selbst, aus seiner eigenen Fachlogik:

| Art | merkmal (trennt die Gruppe) | hinweis (nur Beschriftung) |
|---|---|---|
| Einlaufblech gerade | Gehrung links/rechts | – |
| Einlaufblech konisch | Mass links/rechts + Gehrung | – |
| Freies Profil | beide Abwicklungen bei konisch | – |
| Mauerabdeckung | – | „START → ECKE" |
| Kehle | – | „Traufstück" / „Firststück" |

Zwei Stücke mit gleicher Länge, aber unterschiedlicher Bearbeitung stehen
dadurch in getrennten Zeilen – eine fachlich relevante Bearbeitung kann nicht
in einer Sammelzeile verschwinden. Reine Beschriftungen stehen in der
Zusatzzeile, ohne die Gruppe zu zerlegen.

**Rinne Halbrund bleibt eigenständig.** Sie bezieht ein fertiges Profil in
Normlängen; die Streifenbreite steht an derselben Stelle wie überall und sagt
ehrlich **„entfällt"**, die Fusszeile zählt Stangen statt Tafeln.

**Mitbehoben:** „Keine hinterlegte Rollenbreite ist so breit wie die
Abwicklung" stand bisher in der Vergleichstabelle – also seit dieser Runde in
den zugeklappten Einzelheiten. Die Meldung steht jetzt in der Hauptansicht;
sonst hätte die Liste Zuschnitte gezeigt, ohne zu sagen, dass sie so gar nicht
zu schneiden sind.

### 90.3 Dieselbe Liste im PDF

Neue Funktion `zuDruckHtml(rollen,breite,einheit,zusatz)` in js/33. Die **fünf**
kopierten Druckblöcke in js/16 sind durch je einen Aufruf ersetzt:

| Zeile | vorher | jetzt |
|---|---|---|
| Einlaufblech gerade | 17 Zeilen eigener Block | `${zuDruckHtml(d.rollen,d.abwicklung,"Stück")}` |
| Mauerabdeckung | 12 Zeilen | dito |
| Einlaufblech konisch | 17 Zeilen | dito, mit Zusatz zur Konizität |
| Freies Profil | 12 Zeilen | `zuDruckHtml(zu,0,"Segment")` |
| Kehle | 17 Zeilen | dito |

`zuPlanAusGespeichert()` bringt beide historisch gewachsenen Speicherformen
(flach mit `streifen` bzw. `verteilung`, gruppiert mit `gruppen`) in dieselbe
Form. **Gerechnet wird nichts** – gedruckt wird ausschliesslich der beim
Speichern abgelegte Plan, damit ein einmal gedrucktes Blatt gleich bleibt.

Damit die Unterscheidungen bis ins PDF durchhalten, tragen die gespeicherten
`stuecke` jetzt `merkmal` und `hinweis` mit (additiv, alte Datensätze öffnen
und drucken unverändert).

### 90.4 Eine PDF-Listenauswahl für alles (js/35-pdf-listen.js)

Vor jedem PDF fragt **ein** Dialog, welche Listen gedruckt werden. Zehn
Kategorien, überall gleich benannt und gleich angeordnet:

```
1 Kopf / Projekt / Adresse   (immer, nicht wählbar)
2 Zusammenfassung            6 Ausmass
3 Massaufnahme / Masse       7 Materialliste
4 Stückliste                 8 Kontrolle / Hinweise
5 Rollenblech-Zuschnitt      9 Fotos      10 Skizze
```

Wie es zusammenhängt – ohne einen einzigen der elf Druckzweige umzubauen:

1. Der Zweig baut sein Dokument wie bisher.
2. `pdfAbschnitteZerlegen()` schneidet es an den **bereits vorhandenen**
   `<div class="eb-section-head">`- bzw. `am-section-head`-Überschriften auf.
3. `PDF_LISTE_FUER` ordnet jede Überschrift einer Kategorie zu (30 Einträge,
   der Prüfstand kontrolliert, dass keine in den Notnagel fällt).
4. `pdfListenZusammenbauen()` setzt **nur die gewählten** Abschnitte in der
   verbindlichen Reihenfolge wieder zusammen.

**Geschnitten wird über den DOM, nicht mit einem regulären Ausdruck.** Eine
Skizze steht als `<div class="sketch-page"><div class="eb-section-head">…` im
Dokument – ein Textschnitt an der Überschrift würde diesen Rahmen zerreissen
und offene `<div>` hinterlassen. Der Prüfstand misst das (Gegenprobe: mit
Textschnitt schlägt er fehl).

Nicht vorhandene Listen sind ausgegraut und lassen sich nicht anhaken – es
entsteht **nie** ein leerer Abschnitt. Nicht gewählte Abschnitte werden **gar
nicht erzeugt**, nicht per CSS versteckt.

**Das Druckfenster öffnet erst im Klick auf „PDF erstellen"** – das ist eine
frische Benutzeraktion, der Browser blockiert es deshalb nicht. Vorher wurde es
ganz am Anfang geöffnet; mit einem Dialog dazwischen wäre der Benutzer sonst
vor einem leeren Fenster gestanden.

`printMeasurement(m,opt)` und `printAusmass(a,opt)` nehmen ein optionales
`opt.listen` („alle" oder eine Liste von Schlüsseln) – damit drucken die
Prüfstände und spätere automatische Ausdrucke ohne Dialog.

Der PDF-Kopf ist unverändert der gemeinsame `pdfKopfHtml()` aus v2.54
(Firma, Dokumenttyp, Datum, **Objektadresse als Haupttitel**, Projekt,
Auftrags-Nr., Auftraggeber, Bearbeiter) und wird immer gedruckt.

### 90.5 Blechlager firmenweit, Auswahl je Massaufnahme

Der Kasten „Rollenbreiten des Blechlagers" stand unter *Einstellungen →
Massaufnahmen → Einlaufblech gerade* – er gilt aber für alle Arten und für die
ganze Firma. Er steht jetzt unter **Einstellungen → Allgemein**.

Im Register **Zuschnitt** jeder Rollen-Art gibt es dafür einen aufklappbaren
Kasten „Rollen für diese Massaufnahme": das Lager der Firma zum Anhaken. Damit
lässt sich für eine einzelne Aufnahme einschränken, was tatsächlich verwendet
wird – z. B. weil auf diese Baustelle nur die 1000er Rolle mitkommt.

- Gespeichert als `data.rollen.auswahl` bzw. `data.zuschnitt.auswahl`
  (additiv). Eine Aufnahme vor v2.85 hat das Feld nicht und rechnet
  unverändert mit dem ganzen Lager.
- **Leere Auswahl = ganzes Lager.** Es wird nie mit einer leeren Rollenliste
  gerechnet.
- Das Blechlager der Firma bleibt dabei unangetastet.
- Der Kasten bleibt nach dem Anhaken offen (sonst klappte er bei jedem Haken
  zu, weil das Modul neu zeichnet).

### 90.6 Getestet

**Neuer Prüfstand `pruefstaende/pruefstand-rollenblech-pdf-v2-85.js` – 65/65**,
echtes Chromium gegen die echte `index.html`, deckt die Tests 1–28 des Auftrags
ab: ein Stück · mehrere gleiche · mehrere verschiedene · gleiche Länge mit
anderer Abwicklung (nicht gruppieren) · gleiche Länge und Abwicklung
(gruppieren) · Stückzahl · zu schmale Rolle · mehrere Rollenbreiten ·
Tafellänge · mehrere Tafeln · Verschnitt · Stücknummern bleiben · Gehrungen
bleiben · konische Stücke · Rinne bleibt eigene Logik · leere Liste ·
keine Liste gewählt · nur Rollenblech · nur Ausmass · mehrere Listen ·
Alle/Keine auswählen · nicht verfügbare Liste · keine leeren Abschnitte ·
gleiche Reihenfolge bei verschiedenen Modulen · Kopf mit Adresse ·
Seitenumbrüche · keine JavaScript-Fehler. Dazu die Blechlager-Verlagerung und
die Auswahl je Massaufnahme.

**Elf Gegenproben**, jede baut einen echten Fehler ein und wirft einen
Prüfstand um:

| Gegenprobe | Ergebnis |
|---|---|
| Gruppierung ignoriert das `merkmal` | 63/65 |
| Auswahl wird ignoriert (alles drucken) | 46/52 |
| Fenster schon vor der Auswahl öffnen | 49/52 |
| Zerlegen wieder mit regulärem Ausdruck | 52/54 |
| Reihenfolge des Moduls statt der gemeinsamen | 52/53 |
| „Alle auswählen" aktiviert auch nicht vorhandene | 53/54 |
| Einzelheiten wieder aufgeklappt | register-zuschnitt 233/239 |
| gar keine Liste, nur die alten Tabellen | register-zuschnitt 197/215 |
| Rollenauswahl wirkt nicht auf die Rechnung | 64/65 |
| Kasten klappt beim Anhaken zu | 64/65 |
| Auswahl wird nicht gespeichert | 64/65 |

**Vier davon deckten zuerst Schwächen im Prüfstand auf** und wurden erst danach
scharf: zwei blieben grün (Test 24 prüfte eine Auswahl, in der die Skizze gar
nicht vorkam; Test 21 zählte `disabled&&checked` statt der Schlüssel), zwei
liessen ihn **abbrechen** statt fehlschlagen – ein abgebrochener Lauf sieht aus
wie „keine Fehler". Alle Indexzugriffe sind jetzt abgesichert.

**Volle Regression grün** – alle 13 Prüfstände im Repo (register-zuschnitt
239/239, mauerabdeckung 144/144, kehle 157/157, freies-profil 118/118, konisch
113/113, rinne 104/104, einlaufblech 98/98, medien-am-ende 88/88, dila-sichtbar
57/57, skizze-foto 54/54, lxb-druck 46/46, verschnitt 1578/1578) und die
archivierten (required70 368/368, kehle52 698/698, rinne57 379/379, offline70
121/121, einf70 185/185, feedback63 108/108, freipos65 99/99, dila70 85/85,
fotos70 88/88, fp70 83/83, breite57 84/84, breite52 52/52, kehleintegration52
76/76, pfade55 38/38, module67 43/43, einst68 43/43, medien50 42/42,
dateien49 38/38, adresse45 39/39, projekte47 37/37, status46 35/35,
auswahl48 32/32, suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2,
einstbrowser68 47/47, modulebrowser67 16/16, feedbackbrowser63 67/67,
freiposbrowser65 33/33, mad70 45/45, ebg70 49/49, feedback70 47/47,
normbrute 1578/1578, sowie nav, suche40, treffer40, recent41, stand42,
dateien43, ui39 ohne Fehlschlag).

**Regierapport nachweislich unverändert:** der Ausdruck wurde in echtem
Chromium unter `media:print` mit ausgelöstem `beforeprint` unmittelbar
nacheinander gegen den v2.84-Stand gerendert – **Bild und DOM byteidentisch**
(DOM `c222edf6b60ca2e2`, 5424 Zeichen; Bild `b6769f8a7ba7f95a`, 51354 Bytes).
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind
nicht im Diff.

`node --check` über alle 32 `js/*.js`, `sw.js` und alle Prüfstände: fehlerfrei.
`<div>`-Verschachtelung in `index.html` ausgeglichen (Tiefe 0), keine doppelten
Element-IDs, jede js-Datei in `index.html` **und** in der
Service-Worker-Liste.

**Angepasste Erwartungen in bestehenden Prüfständen** – alle **überholt**,
keine davon ein Codefehler: die Einzelheiten stehen jetzt in `<details>` (die
Prüfstände klappen sie vor der Prüfung auf), die gedruckte Tafellänge heisst
jetzt „2 Tafeln à 2'170 mm" statt „Tafellänge 2170 mm", die Fusszeile nennt
„Einstellungen → Allgemein" statt „→ Massaufnahmen → Einlaufblech gerade", und
alle Druckaufrufe der Prüfstände sagen jetzt ausdrücklich `{listen:"alle"}`.

### 90.7 Geänderte Dateien

| Datei | Warum |
|---|---|
| `js/35-pdf-listen.js` | **neu** – Kategorien, Zerlegen, Auswahl, Zusammensetzen |
| `js/33-zuschnitt.js` | Zuschnittliste, Druckvariante, Rollenauswahl je Aufnahme |
| `js/16-massaufnahme-formular.js` | fünf Druckblöcke → ein Aufruf, Listenauswahl |
| `js/17-ausmass.js` | dieselbe Listenauswahl |
| `js/29`–`js/32`, `js/34` | `merkmal`/`hinweis`, Rollenauswahl je Aufnahme |
| `js/03-login.js` | `goToStart()` bricht einen offenen Dialog ab |
| `index.html` | Dialog, Blechlager in „Allgemein", Version 2.85 |
| `css/01-basis.css` | Liste, Dialog, Rollenauswahl |
| `sw.js` | Cache-Version 2.85, neue Datei im SHELL |

**Nicht angefasst:** `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport) sowie `js/11`, `js/12`, `js/12b`, `js/13`,
`js/14`, `js/15`, `js/19`–`js/21`, `js/25`, `js/26`, `js/28` – per `git diff`
einzeln bestätigt. Keine Berechnung, keine Stückliste, kein Zuschnitt, keine
Abwicklung und keine Packrechnung berührt.

### 90.8 Verbindlich für künftige Module

- **keine eigene Rollenblech-Hauptdarstellung** – `zuschnittHtml(plan)` für den
  Bildschirm, `zuDruckHtml(rollen,breite,einheit)` fürs PDF
- **kein eigener PDF-Auswahldialog** – Abschnitte mit
  `<div class="eb-section-head">` überschreiben, den Rest macht js/35
- **keine zweite Packrechnung** – `ebaPackeInStreifen()` bleibt die einzige
- ein neuer Abschnittsname braucht **einen** Eintrag in `PDF_LISTE_FUER`
- `rollenAuswahl` im Zustand und `auswahl` im Speicher-Payload, dann greift die
  Rollenauswahl automatisch

### 90.9 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
  Geprüft ist die Oberfläche in echtem Chromium gegen die echte `index.html`;
  ein echter Ausdruck aus dem Browser-Druckdialog wurde nicht ausgeführt.
- **Materialliste (Kategorie 7) hat noch keinen eigenen Abschnitt** – das
  Material steht in „Angaben". Die Kategorie ist deshalb überall ausgegraut.
  Sie ist bewusst vorgesehen, damit ein künftiges Modul sie ohne Umbau
  benutzen kann; eine eigene Materialliste wäre neuer Inhalt und war nicht
  verlangt.
- **Kategorie 8 „Kontrolle / Hinweise" enthält heute nur die Notiz** – die
  Kontroll-Register der Aufnahmen werden nicht gedruckt (das war vorher auch
  nicht so).
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei vielen Stücken heisst das Ergebnis „beste gefundene
  Verteilung".
- Ausmass-Fotos bleiben wie seit v2.53 nicht im PDF.

### 90.10 Nachtrag v2.86: Tafellänge statt Tafelfläche

Rückmeldung nach dem ersten echten Ausdruck: im Rollenbreiten-Vergleich ist die
**Tafellänge** die brauchbare Angabe, nicht die Tafelfläche – man muss wissen,
wie lang die Tafel von der Rolle zu schneiden ist.

Die Spalte heisst deshalb in **allen** Modulen jetzt „Tafellänge" statt
„Fläche" (Bildschirm) bzw. „Tafelfläche (m²)" (PDF) und zeigt das Mass in mm.
Geändert an **einer** Stelle – `zuPlanTabelleHtml()` und `zuDruckHtml()` in
js/33 – also automatisch in Einlaufblech gerade und konisch, Freies Profil,
Mauerabdeckung und Kehle.

Neuer Helfer `zuTafelLaenge(x,p)`: beim **Freien Profil** hat jede
Streifenbreite ihre eigene Tafel, dort stehen alle vorkommenden Längen
(z. B. „3'000 · 2'000"); sonst die eine Tafellänge des Plans. Fehlt sie, steht
„–" – es wird keine erfunden.

Der Verschnitt bleibt in m² (das ist die Materialgrösse), ebenso die
Zusammenfassung „Am wenigsten Material: … m² Blech".

Geprüft in echtem Chromium für alle fünf Arten, Bildschirm und Ausdruck
(Einlaufblech gerade 2'070 mm, konisch 2'070 mm, Freies Profil 3'000 mm,
Mauerabdeckung 3'020 mm, Kehle 2'070 mm). Prüfstand
`pruefstand-rollenblech-pdf-v2-85.js` auf **70/70** erweitert, Gegenprobe
(Spalte wieder die Tafelfläche) schlägt mit 68/70 fehl. Volle Regression grün,
Regierapport-Ausdruck weiterhin byteidentisch.

## 91. LUKARNE SEITENVERKLEIDUNG ALS REGISTER-AUFNAHME — VERSION 2.87

Die Massaufnahme **Lukarne Seitenverkleidung** wird nicht mehr als ein langes
Formular erfasst, sondern über **sechs Register** – nach demselben Muster wie
Rinne Halbrund (v2.71), Einlaufblech gerade (v2.74), Einlaufblech konisch
(v2.76), Freies Profil (v2.77), Mauerabdeckung (v2.79) und Kehle (v2.83).

    1 Grunddaten · 2 Geometrie · 3 Scharen · 4 Zuschnitt · 5 Ausmass · 6 Kontrolle

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 91.1 js/19-lukarne.js bleibt byteweise unverändert

Die Fachrechnung ist die Wahrheit: `berechneLukarne()`, `lukPlanSvg()`,
`lukScharenZeilen()`, `lukMass()` und die Hilfsriss-Kürzung stammen
unverändert aus `js/19-lukarne.js` – per `git diff` bestätigt, ebenso
`js/11`, `js/12`, `js/13` und `js/14` (die im Auftrag ausdrücklich
geschützten Dateien).

`lukaBruecke()` (js/36) setzt vor jeder Rechnung `luk_hoehe`,
`luk_laengeOben`, `luk_winkel`, `luk_achsabstand`, `luk_hilfsriss`,
`luk_seite` und `luk_material` aus dem erfassten Stand; danach liefert
`berechneLukarne(lukaEingaben())` direkt die richtigen Werte. Es gibt
**keinen Nachbau** – der Prüfstand vergleicht `lukaErgebnis()` gegen den
direkten Aufruf der Fachdatei.

Die alten Formularelemente stehen weiterhin im HTML, unsichtbar als
**`#lukStummel`** – js/19 hängt dort beim Laden seine Handler an. Gleiches
Vorgehen wie `#rinneStummel`, `#ebStummel`, `#ebkStummel`, `#fpStummel`,
`#madStummel` und `#kehleStummel`.

### 91.2 Die Scharentabelle hat kein einziges Eingabefeld

Register 3 zeigt Scharnummer, Abstand ab Front, Breite, Länge vorne, Länge
hinten, Hilfsriss oben, Hilfsriss unten, Zuschnittbreite und Zuschnittlänge –
**alles aus `berechneLukarne()`**, nichts von Hand. Die Restbreite der letzten
Schar ist als solche gekennzeichnet (`merkmal:"Breite N mm (Restbreite)"`),
und die bestehende Kürzungsmeldung von js/19 wird wörtlich übernommen:
ist die Wange der letzten Scharlinie niedriger als der gewünschte Hilfsriss,
steht in Register 2, mit welchem Mass tatsächlich gerechnet wird.

„Abstand ab Front" zeigt bei der ersten Schar **0**, nicht „–":
`lukMass()` behandelt Werte ≤ 0.5 mm als Rundungsrest, deshalb formatiert die
Aufnahme diese Spalte mit `lukaMm()`.

### 91.3 Zuschnitt und Ausmass über die gemeinsame Infrastruktur

- **Zuschnitt**: `zuschnittHtml()` / `zuDruckHtml()` aus **js/33**, die
  Packrechnung ist unverändert `ebaPackeInStreifen()` aus **js/29** – es gibt
  in der App weiterhin genau **eine**. Die Einheit heisst `"Schar"`,
  gruppiert wird nach Zuschnittbreite; Scharen mit gleicher Länge **und**
  gleicher Breite bilden eine Zeile, die Restbreiten-Schar bleibt über ihr
  `merkmal` getrennt. Die Rollenbreiten kommen aus
  `app_settings.blech_rollenbreiten` (firmenweit, seit v2.74) mit der
  Auswahl je Massaufnahme (v2.85) – **keine neue Einstellung**.
- **Ausmass**: sechs Positionen, vollständig aus den Scharen abgeleitet
  (Fläche, Anzahl Scharen, Blechfläche Zuschnitt, Schräge A, vordere Kante,
  Achsabstand) – ohne zweite Eingabe, **ohne Artikelnummern und ohne Preise**,
  damit spätere Firmen-Materiallisten greifen können.
- **PDF**: die Listenauswahl aus **js/35**, keine eigene Auswahllogik. Der
  Druckzweig ist um Ausmass und `zuDruckHtml(d.zuschnitt,0,"Schar")` erweitert.
- **Fotos und Skizzen am Ende**: `MEAS_MEDIEN_AM_ENDE` um `lukarne` erweitert
  (v2.75-Mechanik unverändert).

### 91.4 Speichern: Superset

js/16 schreibt **unverändert** dieselben 15 Felder wie bisher (`hoehe`,
`laengeOben`, `winkel`, `achsabstand`, `hilfsrissWunsch`, `hilfsriss`,
`seite`, `breite`, `spitzeVersatz`, `schraege`, `anzahl`, `flaeche`,
`zugabeBreite`, `zugabeLaenge`, `scharen`, `material`) und ergänzt nur
`flaeche_m2`, `ausmass` und `zuschnitt`. Eine vor v2.87 gespeicherte Lukarne
öffnet unverändert und druckt ohne die neuen Abschnitte – es wird **nichts
nachgerechnet**.

Die Zugaben (Längen-/Breitenzugabe) sind jetzt Werte **dieser** Massaufnahme
statt nur der Geräteeinstellung; sie werden beim Anlegen einmal aus den
Einstellungen übernommen und sind danach frei änderbar. Ohne das Modul fällt
js/16 weiterhin auf `lukEingabenAusFeldern()` zurück.

### 91.5 Vier echte Pflichtfelder

Höhe H, obere Länge L, Winkel α und Achsabstand blockieren das Speichern
(`berechneLukarne()` liefert sonst `null`) – sie tragen deshalb `data-pflicht`
und den roten Stern. Sie entstehen erst beim Zeichnen von Register 2, also
ruft `renderLukarneAufnahme()` `markierePflichtfelder()` für seinen Bereich
noch einmal auf – wie js/20 und die fünf übrigen Register-Module.
Der Prüfstand `required70` hat das gefunden (die IDs sind von `luk_*` auf
`luka_*` gewandert) und deckt es jetzt wieder ab: **377/377** statt 368.

### 91.6 Getestet

- **`pruefstaende/pruefstand-lukarne-app-v2-87.js` – 82/82**, echtes Chromium
  gegen die echte `index.html`, deckt die Testliste des Auftrags ab: leeres
  Formular · Pflichtfelder · normale Lukarne · verschiedene Höhen/Längen/
  Winkel · links/rechts · verschiedene Achsabstände · Hilfsriss ·
  Hilfsriss-Kürzung · mehrere Scharen · Restbreite · Zugaben · Zuschnitt ·
  Gruppierung · Ausmass · PDF · Speichern/Laden/Kopieren · Fotos/Skizze/Notiz ·
  Navigation · keine JavaScript-Fehler.
- **Zehn Gegenproben**, jede baut einen echten Fehler ein und wirft den
  Prüfstand um (81, 79, 78, 77, 81, 75, 80, 81, 81, 80).
- **Vier Fehlschläge waren meine Testfehler, keine Codefehler**: (1) nur zwei
  statt vier Pflichtfelder leer, weil `lukaLeer()` Winkel und Achsabstand aus
  den Einstellungen vorbelegt; (2) bei H = 1200 / L = 2500 / α = 100 / p = 500
  ist `maxHilfsriss` = 0, dort wird **jeder** Hilfsriss gekürzt – die
  Teilprüfung läuft jetzt mit p = 1300 (max = 337); (3) die „ohne Zugabe"-
  Messung hatte die Zugaben aus einem früheren Abschnitt noch stehen;
  (4) mein eigener Infotext enthält das Wort „Preise" – geprüft werden jetzt
  nur die Tabellenzeilen.
- **Volle Regression grün** – alle 14 Prüfstände im Repo (verschnitt 1578,
  register-zuschnitt 239, kehle 157, mauerabdeckung 144, freies-profil 118,
  konisch 113, rinne 104, medien-am-ende 100, einlaufblech 98, lukarne 82,
  rollenblech-pdf 70, dila-sichtbar 57, skizze-foto 54, lxb-druck 46) und die
  archivierten (kehle52 698/698, pdf52 526/526, rinne57 379/379,
  required70 377/377, einf70 185/185, offline70 123/123, feedback63 108/108,
  freipos65 99/99, fotos70 88/88, dila70 85/85, breite57 84/84, fp70 83/83,
  kehleintegration52 76/76, feedbackbrowser63 67/67, breite52 52/52,
  ebg70 49/49, einstbrowser68 47/47, feedback70 47/47, mad70 45/45,
  module67 43/43, einst68 43/43, medien50 42/42, adresse45 39/39,
  pfade55 38/38, dateien49 38/38, projekte47 37/37, status46 35/35,
  freiposbrowser65 33/33, auswahl48 32/32, modulebrowser67 16/16,
  suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2, normbrute
  1578/1578 sowie nav, suche40, treffer40, recent41, stand42, dateien43,
  ui39 ohne Fehlschlag).
- **Zwei überholte Erwartungen** angepasst, keine davon ein Codefehler:
  `pruefstand-medien-am-ende-v2-75.js` und
  `pruefstand-mauerabdeckung-app-v2-79.js` führten `lukarne` noch unter den
  Arten **ohne** Register; `fotos70` ebenso.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` unmittelbar nacheinander gegen den v2.86-Stand
  gerendert – **Bild und DOM byteidentisch** (DOM `d2a56a6519b3bf50`,
  4878 Zeichen; Bild `82af9acca400e6bd`, 45941 Bytes). `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 33 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`-Verschachtelung in `index.html` ausgeglichen (Tiefe 0);
  keine doppelten Element-IDs; jede js-Datei in `index.html` **und** in der
  Service-Worker-Liste.
- **Kein Datenbankzugriff** in dieser Runde – weder lesend noch schreibend.

### 91.7 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/36-lukarne-aufnahme.js` | **neu** – sechs Register, Brücke, Ausmass, Zuschnitt, Kontrolle |
| `index.html` | Registerfläche `#lukarneAufnahme`, `#lukStummel`, Script-Tag, Version 2.87 |
| `js/16-massaufnahme-formular.js` | Modul zeichnen, Payload-Superset, Medien am Ende, Druck um Ausmass und Zuschnitt erweitert |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `sw.js` | Cache-Version 2.87, neue Datei im SHELL |
| `pruefstaende/pruefstand-lukarne-app-v2-87.js` | **neu** |

**Nicht angefasst**: `js/19-lukarne.js`, `js/11`, `js/12`, `js/13`, `js/14`
(die im Auftrag geschützten Fachdateien), `js/06-rapport.js`,
`js/08-katalog-blitzschutz.js`, `css/03-druck.css` (Regierapport), dazu
`js/12b`, `js/15`, `js/17`, `js/20`, `js/21`, `js/25`–`js/35` und
`css/01-basis.css` – per `git diff` bestätigt.

### 91.8 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
  Geprüft ist die Oberfläche in echtem Chromium gegen die echte `index.html`.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei vielen Scharen heisst das Ergebnis „beste gefundene
  Verteilung".
- Die Seite links/rechts dreht nur die Ansicht – gerechnet wird gleich,
  unverändert wie in js/19.
- Kein Detail-Diff der Scharen im Änderungsverlauf (wie bei allen
  Array-Strukturen, Klasse C aus Abschnitt 42.2).
- Damit haben **sieben** der elf Massaufnahme-Arten Register; ohne sind
  weiterhin Skizze/Foto, Ort-/Seitenbleche, Einfassung Rund und die
  Rinne-Zuschnittliste.

## 92. ZUSCHNITT: JEDES STÜCK AUF SEINE LÄNGE + POSITIONSNUMMERN + SEITENUMBRÜCHE — VERSION 2.88

Drei Punkte aus der Rückmeldung nach dem ersten echten Ausdruck der Lukarne.
**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 92.1 Das alte Modell und warum es so viel Verschnitt erzeugte

Bis v2.87 wurde von der Rolle eine **Tafel** abgeschnitten, so lang wie das
**längste** Stück, und quer in Streifen geteilt. Alle Streifen einer Tafel
waren damit gleich lang. Bei ungleichen Längen – und bei einer Lukarne hat
**jede** Schar eine andere – blieb der Rest jedes kürzeren Streifens stehen.

Am echten Beispiel gemessen (Lukarne H 1500 / L 4000 / α 100° / p 500,
acht Scharen von 1530 bis 197 mm, netto 3.581 m²):

| Rolle | v2.87 | v2.88 |
|---|---|---|
| 670 mm | 5.257 m² · **32 %** Verschnitt | **4.629 m²** · 23 % |
| 1000 mm | 7.847 m² · **54 %** | **6.909 m²** · 48 % |

Einlaufblech gerade mit 2000/1800/1600/1400/1200 mm, Abwicklung 250:

| Rolle | v2.87 | v2.88 |
|---|---|---|
| 1000 mm | 4.000 m² · **50 %** | **2.600 m²** · 23 % |
| 670 mm | 4.020 m² · 50 % | **2.814 m²** · 29 % |

### 92.2 Neues Modell: Streifen längs von der Rolle

    Streifen nebeneinander = ganzzahlig(Rollenbreite ÷ Abwicklung)
    Rollenlänge            = der vollste Streifen
    Blechfläche            = Rollenbreite × Rollenlänge

Von der Rolle werden längs Streifen der Abwicklungsbreite abgetrennt; in
einem Streifen liegen die Stücke hintereinander und **jedes wird auf seine
genaue Länge geschnitten**. Verschnitt entsteht dadurch nur noch an zwei
Stellen: an der Restbreite der Rolle (Rollenbreite − Streifen × Abwicklung)
und am Rest der Streifen, die nicht so voll werden wie der vollste.

**Damit stimmt die Vermutung aus der Rückmeldung – und zwar messbar.** Mit
einer Rolle, deren Breite zur Abwicklung passt, geht der Verschnitt wirklich
auf null. Dasselbe Einlaufblech mit einer 250er Rolle im Lager:

| Rolle | Streifen | Rollenlänge | Fläche | Verschnitt |
|---|---|---|---|---|
| **250 mm** | 1 | 8'000 mm | 2.000 m² | **0.000 m² · 0 %** |
| 500 mm | 2 | 4'200 mm | 2.100 m² | 0.100 m² · 5 % |
| 1000 mm | 4 | 2'600 mm | 2.600 m² | 0.600 m² · 23 % |
| 670 mm | 2 | 4'200 mm | 2.814 m² | 0.814 m² · 29 % |

Im alten Modell hätte dieselbe 250er Rolle 2.5 m² und 20 % Verschnitt
angezeigt (fünf Tafeln à 2000 mm) – sie wurde also **bestraft**, obwohl sie
die beste ist. Der Rollenvergleich ist damit erst jetzt aussagekräftig.

### 92.3 Weiterhin genau EINE Packrechnung

Der Auftrag aus v2.85 („keine zweite Packrechnung") gilt unverändert.
`ebaPackeInStreifen` und die neue `ebaPackeInBaender` sitzen beide auf
**demselben** rekursiven Kern `ebaVerteile(stuecke,k,L,budget)` in js/29:

| Eingang | Frage |
|---|---|
| `ebaPackeInStreifen(bleche,L)` | kleinste Streifen**zahl** bei fester Länge |
| `ebaPackeInBaender(bleche,k)` | kleinste **Länge** bei fester Streifenzahl |

Der zweite ist der, den der Zuschnitt aus Rollenblech braucht: die
Streifenzahl steht durch die Rollenbreite fest, gesucht ist die Länge.
Gesucht wird als Binärsuche zwischen der Untergrenze
(`max(längstes Stück, Summe ÷ Streifen)`) und einer gierigen Lösung
(längstes Stück zuerst in den leersten Streifen), die zugleich der Rückfall
ist, wenn das Suchbudget nicht reicht. Dann heisst es weiterhin ausdrücklich
„beste gefundene Verteilung – nicht nachweislich die günstigste".

**Gepackt wird jetzt je Rollenbreite neu**, denn erst sie entscheidet, wie
viele Streifen nebeneinander liegen. Vorher lief die Packung einmal
ausserhalb der Schleife.

`raNormPlan` (Rinne Halbrund, Normlängen) ist unverändert – eine Rinne wird
als fertiges Profil bezogen und nicht von der Rolle geschnitten.

### 92.4 Positionsnummern: wo sie hingehören

Gemeldet: „man sieht schlecht, welche Positionsnummer auf welchem Zuschnitt
platziert werden muss". Zutreffend – die Nummern standen als kleiner grauer
Nachsatz am Zeilenende.

**In der Zuschnittliste** stehen sie jetzt auf einer eigenen Zeile als
abgesetzte Marken in Lesegrösse:

```
1 ×   2'000 × 250 mm
STÜCK  1

3 ×   1'850 × 250 mm
STÜCK  1  4  7        Gehrung links
```

**In der Belegung** ist aus der Tabelle mit einer Sammelzelle
(„Stück 1 · 2'070 mm + Stück 4 · 1'420 mm") eine Karte je Streifen geworden,
mit einer eigenen Zeile je Stück:

```
Streifen 4      2'600 mm belegt · 0 mm Rest
  4    1'400 mm × 250 mm
  5    1'200 mm × 250 mm
```

**Im PDF** haben die Nummern eine eigene Spalte („Stück Nr."), und die
Belegung nennt je Streifen „Stück 4 = 1'400 mm · Stück 5 = 1'200 mm".

Gilt für **alle** Arten, weil es eine Stelle ist (js/33).

### 92.5 Der Rollenvergleich

Die Spalte „Tafellänge" heisst jetzt **„Rollenlänge"** – das ist das Mass,
das tatsächlich von der Rolle abgezogen werden muss. Die Spalte „Fläche"
ist entfallen: sie ist netto + Verschnitt, und netto steht als Kennzahl
direkt darüber. Sechs Spalten brachen auf dem Handy die Überschriften
**mitten im Wort** („ROLLENLÄNG E", „VERSCHNIT T") – im echten Browser
gemessen, nicht vermutet. Fünf Spalten mit `white-space:nowrap` stehen auf
320, 360, 412 und 768 px einzeilig.

**Ältere gespeicherte Pläne (bis v2.87) drucken unverändert ihre eigenen
Zahlen.** `zuRollenLaengeMm()` leitet die Rollenlänge dort aus
`Tafeln × Tafellänge` ab – derselbe Wert, nur anders benannt. Es wird nichts
nachgerechnet, ein einmal gedrucktes Blatt bleibt gleich.

### 92.6 Seitenumbrüche brechen keine Tabelle mehr auf

`table.eb-cutlist`/`am-cutlist` tragen jetzt `break-inside:avoid`. Passt eine
Tabelle nicht mehr auf die angebrochene Seite, wandert sie als Ganzes auf die
nächste. Ist sie länger als eine ganze Seite, teilt der Browser sie weiterhin
– dann wiederholt sich der Tabellenkopf (`table-header-group`, unverändert)
und es bricht keine einzelne Zeile auf (`tr{break-inside:avoid}`,
unverändert). Eine Abschnittsüberschrift steht wie bisher nie allein am
Seitenende (`break-after:avoid`).

Gemessen im echten Druck-Dokument bei A4-Inhaltsbreite (688 px) und
-höhe (1005 px): alle fünf Tabellen eines normalen Einlaufblech-Ausdrucks
sind 25–506 px hoch, passen also auf eine Seite – die Regel greift dort
tatsächlich. Mit 60 Stücken ist eine Tabelle länger als eine Seite und darf
umbrechen.

### 92.7 Getestet

- **`pruefstand-rollenblech-pdf-v2-85.js` – 85/85** (vorher 70), neuer
  Abschnitt 29: Umbruchregeln als *computed style* im echten Druck-Dokument,
  für einen normalen und einen überlangen Ausdruck, dazu das wirklich
  erzeugte PDF.
- **Sechs Gegenproben**, jede baut einen echten Fehler ein und wirft einen
  Prüfstand um: PDF-Tabellen wieder aufteilbar (83/85) · keine Längensuche,
  nur gierig (Mauerabdeckung 144/146) · Nummern wieder als grauer Nachsatz
  (82/85 bzw. 81/82) · Belegung ohne Nummern (register-zuschnitt 239/245) ·
  alte gespeicherte Pläne verlieren die Rollenlänge (83/85) · nicht je
  Rollenbreite packen (einlaufblech 95/99).
- **Volle Regression grün** – 14 Repo-Prüfstände (verschnitt 1578,
  register-zuschnitt 245, kehle 158, mauerabdeckung 146, freies-profil 118,
  konisch 114, rinne 104, medien-am-ende 100, einlaufblech 99,
  rollenblech-pdf 85, lukarne 82, dila-sichtbar 57, skizze-foto 54,
  lxb-druck 46) und alle archivierten (kehle52 698/698, pdf52 526/526,
  rinne57 379/379, required70 377/377, einf70 185/185, offline70 123/123,
  feedback63 108/108, freipos65 99/99, fotos70 88/88, dila70 85/85,
  breite57 84/84, fp70 83/83, kehleintegration52 76/76,
  feedbackbrowser63 67/67, breite52 52/52, ebg70 49/49,
  einstbrowser68 47/47, feedback70 47/47, mad70 45/45, module67 43/43,
  einst68 43/43, medien50 42/42, adresse45 39/39, pfade55 38/38,
  dateien49 38/38, projekte47 37/37, status46 35/35,
  freiposbrowser65 33/33, auswahl48 32/32, modulebrowser67 16/16,
  suche45 13/13, kopf45 8/8, hidden51 7/7, abstand69 2/2,
  normbrute 1578/1578, sowie nav, suche40, treffer40, recent41, stand42,
  dateien43, ui39 ohne Fehlschlag).
- **Angepasste Erwartungen** – alle **überholt**, keine davon ein Codefehler:
  die Prüfstände von Einlaufblech gerade/konisch, Freies Profil,
  Mauerabdeckung, Kehle, Lukarne und register-zuschnitt kannten
  `tafelLaenge`/`tafeln`/`verteilung` und die alte Belegungstabelle. Die
  neuen Erwartungen sind **von Hand nachgerechnet** und stehen als Kommentar
  daneben (z. B. Mauerabdeckung: acht Stücke, Summe 18'100 mm, Rolle 1000 ÷
  460 = 2 Streifen, 3020+2010+2010+2010 = 9050 und 2510+2510+2020+2010 =
  9050 → 9'050 mm ab Rolle).
- **Zwei Fallen erneut**: die Belegung steht im zugeklappten `<details>` –
  `innerText` lässt sie weg, `textContent` nicht. Und `.ra-tab` setzt
  `word-break:break-word`, was die Spaltenköpfe mitten im Wort brach.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` unmittelbar nacheinander gegen v2.87 gerendert –
  **Bild und DOM byteidentisch** (DOM `455d0fb03b8fa575`, 4878 Zeichen;
  Bild `82af9acca400e6bd`, 45941 Bytes). `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 33 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`-Verschachtelung ausgeglichen (Tiefe 0); keine
  doppelten Element-IDs; jede js-Datei in der Service-Worker-Liste.
- **Kein Datenbankzugriff** in dieser Runde.

### 92.8 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/29-einlaufblech-aufnahme.js` | gemeinsamer Packkern `ebaVerteile`, neuer Eingang `ebaPackeInBaender`, Bändermodell |
| `js/30`, `js/32`, `js/34` | Rollenplan je Rollenbreite gepackt |
| `js/31`, `js/36` | dasselbe je Streifenbreiten-Gruppe |
| `js/33-zuschnitt.js` | Rollenlänge, Positionsnummern als Marken, Belegung als Karten, Rollenvergleich, Druckvariante |
| `js/16-massaufnahme-formular.js` | `break-inside:avoid` auf den Drucktabellen |
| `css/01-basis.css` | `.zu-pos`/`.zu-nr`, `.zu-belegung`/`.zu-platz`, Spaltenköpfe des Vergleichs |
| `index.html`, `sw.js` | Version 2.88 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport), `js/28-rinne-aufnahme.js` (Normlängen),
sowie `js/11`–`js/15`, `js/17`, `js/19`–`js/27`, `js/35`.

### 92.9 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird
  ausdrücklich nicht als getestet behauptet.**
- **Die Seitenumbrüche sind über die Umbruchregeln im echten Druck-Dokument
  belegt, nicht durch Rastern der PDF-Seiten** – im Container fehlt ein
  PDF-Rasterer. Geprüft ist, dass jede Tabelle `break-inside:avoid` trägt,
  dass sie auf eine Seite passt und dass das PDF erzeugt wird.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken.
- Die Rollenlänge kann bei vielen Stücken gross werden (z. B. 18 m bei
  einem Streifen). Das ist bei Rollenblech richtig, wäre bei bezogenen
  **Tafeln** aber etwas anderes – dafür bräuchte es eine eigene Angabe der
  Tafellänge im Lager.
- Beim Freien Profil und bei der Lukarne wird je Streifenbreite ein eigener
  Abschnitt von der Rolle gezogen; schmale und breite Streifen werden nicht
  auf derselben Rollenbreite kombiniert. Das ist die vorsichtige Annahme –
  sie kann Material kosten und gehört in den Praxistest.

## 93. ZUSCHNITT IN ABSCHNITTE STATT EINER DURCHGEHENDEN BAHN — VERSION 2.89

Rückmeldung mit Bildschirmfoto zum v2.88-Ausdruck: bei vielen gleich langen
Blechen stand dort „6'210 mm ab Rolle". Das ist in der Werkstatt nicht
handhabbar – der Zuschnitt soll **immer nur so lang sein wie das längste
Blech**, also „3 × 2'070 mm".

### 93.1 Was v2.88 falsch machte

v2.88 hatte die Rolle als **eine durchgehende Bahn** gerechnet: `jeTafel`
Streifen laufen nebeneinander, jeder so lang wie nötig, die Rollenlänge ist
die des vollsten Streifens. Rechnerisch sparsam – aber der Streifen wurde
dadurch beliebig lang (im gemeldeten Fall 6'210 mm), und niemand zieht 6 m
Blech am Stück durch die Abkantbank.

### 93.2 Neues Modell

    Abschnittlänge        = längstes Stück
    Streifen je Abschnitt = ganzzahlig(Rollenbreite ÷ Abwicklung)
    Abschnitte            = aufgerundet(Streifen ÷ Streifen je Abschnitt)
    Rollenlänge           = Abschnitte × Abschnittlänge
    Blechfläche           = Rollenbreite × Rollenlänge

Von der Rolle werden **Abschnitte** abgezogen und quer in Streifen der
Abwicklungsbreite geteilt. Ein Abschnitt ist immer so lang wie das längste
Blech; es werden so viele gezogen, wie es braucht. **In einem Streifen dürfen
weiterhin mehrere Stücke hintereinander liegen**, solange sie zusammen in
EINEN Abschnitt passen – dafür ist die Packrechnung da. Kein Stück läuft über
eine Abschnittgrenze.

Der gemeldete Fall, nachgerechnet (9× 2'070, 1× 1'600, 1× 1'100,
Abwicklung 250, netto 5.33 m²):

| | v2.88 | v2.89 |
|---|---|---|
| Rolle 1'000 | 6'210 mm am Stück | **3 × 2'070 mm** |
| Streifen je Abschnitt | 4 | 4 |
| Blechfläche | 6.21 m² | **6.21 m²** |
| Verschnitt | 0.88 m² · 14 % | 0.88 m² · 14 % |

**Die Fläche ändert sich hier nicht** – nur der Zuschnitt ist jetzt
handhabbar. In anderen Fällen kostet die Vorgabe Material (Beispiel
2000/1800/1600/1400/1200 bei Rolle 1'000: 4.00 m² statt 2.60 m²), weil ein
Streifen nicht mehr über die Abschnittgrenze hinaus gefüllt werden darf. Das
ist die bewusste Folge der Vorgabe und in 93.6 offengelegt.

### 93.3 Weiterhin genau EINE Packrechnung

`ebaPackeInBaender` aus v2.88 ist entfallen – gebraucht wird wieder nur
`ebaPackeInStreifen(bleche, L)` (kleinste Streifenzahl bei fester
Abschnittlänge) auf dem gemeinsamen Kern `ebaVerteile` in js/29. Da die
Abschnittlänge nicht von der Rollenbreite abhängt, wird **einmal** gepackt;
je Rollenbreite folgt daraus nur noch die Zahl der Abschnitte.

`raNormPlan` (Rinne Halbrund, Normlängen) unverändert.

### 93.4 Anzeige

- Fusszeile der Liste: „**3 × 2'070 mm ab Rolle** · 4 Streifen je Abschnitt"
- Kennzahl „Ab Rolle": `3 × 2'070 mm` (statt einer Gesamtlänge)
- Rollenvergleich: Spalten **Rolle · Str./Abschn. · Ab Rolle · Verschnitt ·
  Anteil**. „Str./Abschn." ist jetzt die Zahl der Streifen **nebeneinander**
  (1'000 → 4, 670 → 2) und damit je Rolle verschieden – vorher stand dort für
  beide dieselbe Gesamtzahl.
- Belegung: jede Karte nennt **Abschnitt und Streifen** („Abschnitt 2 ·
  Streifen 3"), im PDF als „2.3".

**Ältere gespeicherte Pläne drucken unverändert ihre eigenen Zahlen.** Bis
v2.87 hiessen die Felder `tafeln`/`tafelLaenge` – dieselbe Sache unter
anderem Namen, sie werden als „2 × 2'070 mm" gelesen. Ein v2.88-Plan hat nur
die durchgehende `rollenLaenge` und wird als **ein** Abschnitt gezeigt, weil
er genau so gerechnet wurde. Es wird nichts nachgerechnet.

### 93.5 Getestet

- **`pruefstand-rollenblech-pdf-v2-85.js` – 95/95** (vorher 85), neuer
  Abschnitt 30 mit genau dem gemeldeten Fall: der Abschnitt ist so lang wie
  das längste Blech, kein Streifen ist länger belegt als ein Abschnitt,
  11 Streifen, Rolle 1'000 → 4 je Abschnitt und 3 × 2'070 mm, Fläche
  unverändert 6.21 m², die Anzeige sagt „3 × 2'070 mm ab Rolle" und
  **nirgends** „6'210 mm", die Belegung nennt Abschnitt und Streifen.
- **Vier Gegenproben**, jede baut einen echten Fehler ein: durchgehende Bahn
  statt Abschnitten (92/95) · Abschnitt doppelt so lang wie das längste Blech
  (89/95) · Belegung ohne Abschnittzuordnung (94/95) · alter Plan verliert
  die Abschnitte (92/95).
- **Volle Regression grün** – 14 Repo-Prüfstände (verschnitt 1578,
  register-zuschnitt 245, kehle 158, mauerabdeckung 146, freies-profil 118,
  konisch 114, rinne 104, medien-am-ende 100, einlaufblech 99,
  rollenblech-pdf 95, lukarne 82, dila-sichtbar 57, skizze-foto 54,
  lxb-druck 46) und alle archivierten (kehle52 698, pdf52 526, rinne57 379,
  required70 377, einf70 185, offline70 123, feedback63 108, freipos65 99,
  fotos70 88, dila70 85, breite57 84, fp70 83, kehleintegration52 76,
  feedbackbrowser63 67, breite52 52, ebg70 49, einstbrowser68 47,
  feedback70 47, mad70 45, module67 43, einst68 43, medien50 42,
  adresse45 39, pfade55 38, dateien49 38, projekte47 37, status46 35,
  freiposbrowser65 33, auswahl48 32, modulebrowser67 16, suche45 13,
  kopf45 8, hidden51 7, abstand69 2, normbrute 1578, sowie nav, suche40,
  treffer40, recent41, stand42, dateien43, ui39).
- **Angepasste Erwartungen** – alle **überholt**, keine davon ein Codefehler:
  die Prüfstände der sechs Rollenblech-Arten kannten die v2.88-Felder
  `rollenLaenge`/`verteilung`. Die neuen Erwartungen sind **von Hand
  nachgerechnet** und stehen als Kommentar daneben (z. B. Kehle: Zuschnitte
  2070/2070/1453 → Abschnitt 2070, drei Streifen, Rolle 1'000 ÷ 500 = 2 je
  Abschnitt → 2 Abschnitte → 4'140 mm → 4.14 m²).
- **Dabei gefunden**: die Fusszeile sagte „11 Streifen nebeneinander" –
  nebeneinander liegen aber nur 4. `zuStreifenZahl()` liefert jetzt die
  Streifen **je Abschnitt**, nicht die Gesamtzahl; die Kennzahl heisst
  „Streifen gesamt".
- Spaltenköpfe des Vergleichs bei 320/360/412/768 px gemessen: alle
  einzeilig.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` unmittelbar nacheinander gegen v2.88 gerendert –
  **Bild und DOM byteidentisch** (DOM `e8f755c688bd77f9`, 4878 Zeichen;
  Bild `82af9acca400e6bd`, 45941 Bytes).
- `node --check` über alle 33 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`-Tiefe 0; keine doppelten Element-IDs.
- **Kein Datenbankzugriff** in dieser Runde.

### 93.6 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird
  ausdrücklich nicht als getestet behauptet.**
- **Die Abschnittvorgabe kostet in manchen Fällen Material.** Weil ein
  Streifen nicht über die Abschnittgrenze hinaus gefüllt werden darf, bleibt
  Rest stehen, den eine durchgehende Bahn genutzt hätte (Beispiel in 93.2:
  4.00 m² statt 2.60 m²). Das ist die bewusste Folge der Vorgabe „nie länger
  als das längste Blech" und kein Rechenfehler. Sollte sich in der Praxis
  zeigen, dass ein längerer Abschnitt doch handhabbar ist, wäre eine
  einstellbare Höchstlänge je Firma die naheliegende Erweiterung – dafür
  bräuchte es eine Angabe, wie lang ein Abschnitt sein darf.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken.
- Beim Freien Profil und bei der Lukarne bekommt jede Streifenbreite ihre
  eigenen Abschnitte; schmale und breite Streifen werden nicht auf derselben
  Rollenbreite kombiniert.

## 94. NEUES MODUL „KAMINEINFASSUNG" — VERSION 2.90

Zwölfte Massaufnahme-Art: Einfassung eines rechteckigen Kamins. Gleiche
fachliche Logik wie die Einfassung Rund (Deckungsmaterial, Lattenabstand,
Bleilappen), aber rechteckig und mit sechs getrennten Zuschnitten. Erfasst
wird über **sieben Register**:

    1 Grunddaten · 2 Kaminmasse · 3 Umschläge · 4 Stückliste ·
    5 Zuschnitt · 6 Ausmass · 7 Kontrolle

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**
`measurements.type` hat keine CHECK-Constraint und `data` ist `jsonb` – ein
neuer Typ braucht deshalb weder Tabelle noch Spalte noch Migration.

### 94.1 Die DXF: was tatsächlich drinsteht

`Schnitt_Kamineinfassung.dxf` enthält **keinen Text, keine Bemassung, keine
Layernamen** – nur 8 echte Linien plus Pfeilspitzen-Dekoration. Auf die
Dachlinie projiziert (t = längs, bergwärts positiv; h = senkrecht darüber):

| Element | Lage | Deutung |
|---|---|---|
| Dach | t 0…798, h 0, Pfeile beidseits | Deckmaterial, läuft weiter |
| Vorderkant | t 199→255, h 0→120 | lotrecht = 25° zur Dachsenkrechten |
| Hinterkant | t 590→632, h 29→120 | ebenso |
| Keil | t 590→608, h 29→0 | Wasserkeil hinter dem Kamin |
| Schnittkante | t 632→255, h 120 | der Kamin ist abgeschnitten |
| Knick voll | t 349, h 120→0 | ? |
| Knick gestrichelt | t 469, h 120→0 | ? |

8 Linien können die 13 verlangten Masse nicht tragen, und B/C überlappen
sich laut Beschreibung. Die Zuordnung wurde deshalb – wie vom Anwender
ausdrücklich verlangt – **vor dem Bauen mit ihm geklärt**:

- Der **Knick ist die Überlappung der beiden Seitenteile**. Die volle Linie
  ist seine Vorderkant, die gestrichelte seine Hinterkant (gestrichelt =
  verdeckte Kante des unteren Blechs). **B ist die Zuschnittlänge des
  vorderen, C die des hinteren Seitenteils.** In der DXF geht das exakt auf:
  `B + C − Kaminlänge = (469−199) + (590−349) − 391 = 120` = Knickbreite.
- **E** (90°-Aufbug hinten) gehört in die Abwicklung des **Hinterteils**.
- **„Breite vorne/hinten"** sind die **Zuschnittlängen** von Vorder- und
  Hinterteil; die Umschläge sind davon getrennt.

### 94.2 Die sechs Zuschnitte

Genau die Formeln des Anwenders, ergänzt um E (94.1):

| Nr. | Teil | Länge | Abwicklung |
|---|---|---|---|
| 1 | Vorderteil | Breite vorne | Umschlag vorne + A + Höhe / cos(Winkel vorne) |
| 2 | Hinterteil | Breite hinten | Umschlag hinten + E + D + Keil + Höhe / cos(Winkel hinten) |
| 3/5 | Seitenteil vorne links/rechts | **B** | Umschlag Seite + G + F + seitliche Höhe |
| 4/6 | Seitenteil hinten links/rechts | **C** | dieselbe Abwicklung |

Nachgerechnet mit A 300, D 250, E 60, Keil 80, Winkel je 25°, Höhe 400,
Breiten 900, Umschläge 20, B 500, C 400, F 150, G 100:
cos 25° = 0.90631 → 400/0.90631 = 441.35 →
**900 × 761**, **900 × 851**, **500 × 670**, **400 × 670** (je zweimal),
Blechfläche **2.6568 m²**, Kaminlänge **780 mm**.

Der Winkel ist „vom Senkrechten auf Blech" gemessen, also relativ zum Dach.
Die **Dachneigung wird deshalb gar nicht erfasst** und auch nicht gebraucht.
Sind links und rechts unterschiedlich hoch, rechnen Vorder- und Hinterteil
mit der **grösseren** Höhe – ein zu kurzer Zuschnitt wäre unbrauchbar, ein
zu langer lässt sich kürzen.

### 94.3 Links und rechts getrennt

Ein Schalter „Links und rechts getrennt erfassen". Ohne Haken gilt jedes
seitliche Mass für beide Seiten (der rechte Wert wird trotzdem mitgeführt,
damit ein späteres Einschalten nichts leert). Mit Haken bekommen **B, C, F,
G und die seitliche Höhe** je zwei Felder. Alles andere gehört zur Vorder-
bzw. Hinterseite und ist einmal vorhanden.

### 94.4 Bleilappen

Wie bei der Einfassung Rund **aufgerundet**, nicht abgerundet (die Korrektur
aus v2.70) – und je Seitenteil, denn jedes bekommt seine eigenen Lappen:
`ceil(Zuschnittlänge ÷ Lattenabstand)`, summiert über die vier Seitenteile.
Im Beispiel: 500/330 → 2 und 400/330 → 2, je Seite, **8 gesamt**. Ohne
Lattenabstand bleibt die Zahl `null` und die Anzeige zeigt „–", statt eine
zu erfinden.

### 94.5 Schnittskizze nach der DXF

Gezeichnet werden genau die Elemente der Vorlage: Dach mit Pfeilen an beiden
Enden, Vorder- und Hinterkant, die dachparallele Schnittkante oben, der Keil
und die beiden Knickkanten (voll = vorne, gestrichelt = hinten). Dazu alle
verlangten Masse.

Zwei bewusste Darstellungsentscheidungen, beide an der Skizze angeschrieben:

- **Das Dach wird waagerecht gezeichnet**, nicht wie in der DXF unter 25°.
  Die Dachneigung ist kein erfasstes Mass; sie schräg zu zeichnen hiesse,
  eine Zahl zu erfinden.
- ~~**Der Keil wird unter 45° zur Kaminwand dargestellt.**~~ – **gilt nicht
  mehr seit Version 2.91**: der Keilwinkel ist die Winkelhalbierende des
  Knicks zwischen Dachblech und Wand und wird gerechnet, nicht gewählt –
  siehe **Abschnitt 95.3**. Die Skizze zeichnet ihn seither geometrisch.

Die **viewBox wird nach dem Zeichnen exakt um alles Gezeichnete gelegt**,
einschliesslich der geschätzten Textkästen – ohne das liefen die
Beschriftungen an den Rändern aus dem Bild (im Browser gemessen, nicht
vermutet; gleiches Vorgehen wie in js/26). Die Fahnen zeigen nach **innen**
in den leeren Kamin, sonst wäre die Zeichnung doppelt so breit und der Text
entsprechend klein.

Ohne die nötigen Masse liefert die Funktion einen **Hinweis statt einer
Zeichnung** – im PDF wird dieser Fall abgefangen, dort steht dann gar kein
Schnitt.

### 94.6 Gemeinsame Bausteine, nichts nachgebaut

- **Packrechnung**: `ebaPackeInStreifen()` aus js/29 – es gibt in der App
  weiterhin nur EINE. Gepackt wird je Abwicklung (die sechs Teile haben
  unterschiedliche Streifenbreiten), genau wie beim Freien Profil und bei
  der Lukarne.
- **Zuschnitt-Darstellung**: `zuschnittHtml()` / `zuDruckHtml()` aus js/33.
- **PDF-Listenauswahl**: js/35; neu zugeordnet ist nur die Überschrift
  „Bleilappen" (→ Stückliste).
- **Deckungsarten**: `EINF_DECKUNGEN` aus js/21.
- **Zeichenbausteine**: `anbMassWaag`, `anbMassSenk`, `anbFahne`,
  `ANB_FARBE`, `anbEsc` aus js/20.
- **Rollenbreiten**: `app_settings.blech_rollenbreiten` (firmenweit, seit
  v2.74) mit der Auswahl je Massaufnahme (v2.85) – **keine neue firmenweite
  Einstellung**.
- **Fotos und Skizzen am Ende**: `MEAS_MEDIEN_AM_ENDE` (v2.75-Mechanik).

Eigene Einstellungen (je Gerät, `sd_kaminSettings`, wie Anschlussblech und
Einfassung Rund): Standard-Deckmaterial, Lattenabstand, die drei Umschläge,
die Überlappung der Seitenteile und E. Sie sind Vorgaben beim Anlegen und
danach je Aufnahme frei änderbar.

### 94.7 Zwei echte Befunde des gemeinsamen Prüfstands

Der Standard-Prüfstand aus v2.80/v2.85 hat beim Aufnehmen der neuen Art
zwei Fehler in meinem Modul gefunden – beides Abweichungen von den
verbindlichen Vorgaben:

1. **Die Seite stand im `merkmal`.** Dadurch erschienen zwei *identische*
   Zuschnitte (Seitenteil vorne links und rechts, beide 500 × 670) als zwei
   Zeilen statt als „2 ×". Die Seite ist eine reine Beschriftung und gehört
   nach `hinweis` – wie „START → ECKE" bei der Mauerabdeckung.
2. **Die Stückliste schrieb „900 × 761"** mit der Einheit nur im
   Spaltenkopf. Der Standard aus v2.81 ist `900 mm × 761 mm`; verwendet wird
   dafür `zuMasse()` aus js/33, damit jede Art einen Zuschnitt gleich
   schreibt.

### 94.8 Mitbehoben: der Einstellungs-Knopf der Kehle

`MEAS_TYPE_SETTINGS_SECTION.kehle` stand noch auf `""` („rechnet nur, hat
keine Einstellungen") – seit v2.83 hat die Kehle aber einen eigenen
Abschnitt (Stoss/Überlappung). Der Knopf „⚙️ Einstellungen" sprang dort
deshalb nur ins Register statt an die Stelle. Eintrag nachgetragen; damit
hat jetzt **jede** der zwölf Arten einen Einstellungs-Abschnitt.

### 94.9 Getestet

**Neuer Prüfstand `pruefstaende/pruefstand-kamin-app-v2-90.js` – 97/97**,
echtes Chromium gegen die echte `index.html`: Modul und geteilte Bausteine,
sieben Register (nur eigener Inhalt, Reihenfolge, Marke am Kontroll-
Register), Grunddaten und der Links/rechts-Schalter, echtes Tippen mit
Fokusprüfung, alle sechs Zuschnitte gegen von Hand nachgerechnete Zahlen,
getrennte Erfassung, Bleilappen, Rollenblech (drei Streifenbreiten, beste
Rolle 1000 mm mit 3.8 m², 670 mm zu schmal), Ausmass, Kontrolle, Skizze
(jedes Mass, gestrichelte Knickkante, Hinweis statt Zeichnung ohne Masse),
Speichern und Wiederöffnen, Fotos erst nach „Fertig", Druck (auch ein
Datensatz ohne Masse), fünf Bildschirmbreiten × sieben Register.

**14 Gegenproben**, jede baut einen echten Fehler ein und wirft den
Prüfstand um; keine bricht ihn ab:

| Gegenprobe | Ergebnis |
|---|---|
| Winkel wirkt nicht auf die Abwicklung | 90/96 |
| E fehlt in der Hinterteil-Abwicklung | 93/96 |
| B und C vertauscht | 92/96 |
| Überlappung nicht abgezogen | 94/96 |
| Bleilappen abgerundet | 94/96 |
| eigene Packrechnung | 95/97 |
| Zuschnitte/Bleilappen nicht gespeichert | 94/97 |
| Skizze zeichnet auch ohne Masse | 95/96 |
| Fotos schon während der Register | 95/96 |
| Register in anderer Reihenfolge | 95/96 |
| Eingabe zeichnet neu (Fokusverlust) | 93/96 |
| Vorderteil rechnet mit der kleineren Höhe | 94/96 |
| Hinterkant Knick nicht gestrichelt | 95/96 |
| Schnittskizze fehlt im PDF | 95/96 |

Zwei dieser Gegenproben deckten zuerst **Schwächen im Prüfstand** auf: eine
liess ihn abstürzen statt fehlschlagen (ein abgebrochener Lauf sieht aus wie
„keine Fehler"), eine blieb grün, weil die naive Ersatzrechnung für den
Testfall zufällig dasselbe lieferte. Beide Prüfungen sind jetzt schärfer –
geprüft wird zusätzlich, dass zwei kurze Teile im **selben** Streifen landen
(3 statt 4).

**Die neue Art wurde in die gemeinsamen Prüfstände aufgenommen**:
`register-zuschnitt` 276/276 (vorher 245), `medien-am-ende` 113/113
(vorher 100), `lxb-druck` 53/53 (vorher 46).

**Volle Regression grün** – alle 15 Prüfstände im Repo (verschnitt 1578,
register-zuschnitt 276, kehle 158, mauerabdeckung 146, freies-profil 118,
konisch 114, medien-am-ende 113, rinne 104, einlaufblech 99, kamin 97,
rollenblech-pdf 95, lukarne 82, dila-sichtbar 57, skizze-foto 54,
lxb-druck 53) und die archivierten (kehle52 698, pdf52 526, rinne57 379,
required70 377, offline70 125, feedback63 108, freipos65 99, fotos70 88,
dila70 85, breite57 84, fp70 83, kehleintegration52 76, feedbackbrowser63
67, breite52 52, einstbrowser68 51, ebg70 49, feedback70 47, einst68 47,
mad70 45, module67 43, medien50 42, pfade55 39, adresse45 39, dateien49 38,
projekte47 37, status46 35, freiposbrowser65 33, auswahl48 32,
modulebrowser67 16, suche45 13, kopf45 8, hidden51 7, abstand69 2,
normbrute 1578 sowie nav, suche40, treffer40, recent41, stand42,
dateien43, ui39 ohne Fehlschlag).

**Angepasste Erwartungen** – alle **überholt**, keine davon ein Codefehler:
sechs Prüfstände zählten „elf Massaufnahme-Arten" (jetzt zwölf), zwei
führten `kamineinfassung` noch unter den Arten ohne Register bzw. mit sofort
sichtbarem Fotobereich, einer prüfte „nur Kehle ohne eigenen Abschnitt"
(seit 94.8 hat jede Art einen), einer zählte die Payload-Zweige.

**Regierapport nachweislich unverändert**: der Ausdruck wurde in echtem
Chromium unter `media:print` mit ausgelöstem `beforeprint` unmittelbar
nacheinander gegen den v2.89-Stand gerendert – **Bild und DOM byteidentisch**
(DOM `631410f5a5ecc8c6`, 4304 Zeichen; Bild `48fff995380cd305`, 41606 Bytes).
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js` und `css/03-druck.css`
sind nicht im Diff.

`node --check` über alle 39 `js/*.js`, `sw.js` und alle Prüfstände:
fehlerfrei; `<div>`-Verschachtelung in `index.html` ausgeglichen (Tiefe 0);
keine doppelten Element-IDs; jede js-Datei in `index.html` **und** in der
Service-Worker-Liste.

**Kein Datenbankzugriff** in dieser Runde – weder lesend noch schreibend.

### 94.10 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | **neu** – sieben Register, Zuschnitte, Bleilappen, Skizze, Ausmass, Kontrolle, Einstellungen |
| `index.html` | Auswahlknopf, `<option>`, `#measTypeKamin`/`#kaminAufnahme`, Einstellungsblock, Script-Tag, Version 2.90 |
| `js/01-basis.js` | Art im Katalog, Einstellungs-Abschnitt (dazu die Kehle-Korrektur, 94.8) |
| `js/16-massaufnahme-formular.js` | Sektion zeichnen, Payload, Pflichtprüfung, Medien am Ende, Druckzweig |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `js/35-pdf-listen.js` | **1 Zeile**: „Bleilappen" → Stückliste |
| `css/01-basis.css` | `.kam-schalter` (setzt die globalen `input`/`label`-Regeln zurück, CLAUDE.md 72.5) |
| `sw.js` | Cache-Version 2.90, neue Datei im SHELL |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport) sowie `js/11`–`js/34` und `js/36` – keine
Berechnung, keine Stückliste, kein Zuschnitt, keine Abwicklung und keine
Packrechnung einer bestehenden Art berührt.

### 94.11 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
  Geprüft ist die Oberfläche in echtem Chromium gegen die echte `index.html`.
- ~~**Der Keilwinkel in der Skizze ist eine Darstellungsannahme** (45° zur
  Wand).~~ – **erledigt in Version 2.91** (Abschnitt 95.3): der Betrieb hat
  die Regel genannt (Winkelhalbierende), sie geht gegen die DXF exakt auf.
- **Die Überlappung der Seitenteile** ist ein eigenes Mass mit Vorgabe 120
  (dem DXF-Wert). Ohne sie liesse sich die Kaminlänge aus B und C nicht
  bestimmen – geraten wird sie nicht, sie steht als Feld da.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei vielen Teilen heisst das Ergebnis „beste gefundene
  Verteilung".
- Kein Detail-Diff der Zuschnitte im Änderungsverlauf (wie bei allen
  Array-Strukturen, Klasse C aus Abschnitt 42.2).
- Damit haben **acht** der zwölf Massaufnahme-Arten Register; ohne sind
  weiterhin Skizze/Foto, Ort-/Seitenbleche, Einfassung Rund und die
  Rinne-Zuschnittliste.


## 95. KAMINEINFASSUNG: VORDER- UND HINTERTEIL KORRIGIERT — VERSION 2.91

Nach dem ersten echten Ausdruck gemeldet: *"die berechnung vom vorder und
hinterteil stimmt nicht, vorne kannst du nicht einfach Mass A plus seitliche
Höhe rechnen … die seitliche Höhe wird ja vorne höher, da die Fläche schräg
ist … und hinten dasselbe, nur dass du da zusätzlich auch noch den Keil
berücksichtigen musst."*

Zutreffend – es waren **zwei getrennte Fehler**, beide vor der Änderung
nachgewiesen. **Keine Schemaänderung, keine Migration, keine RLS-/
Storage-Änderung**, und keine Fachdatei angefasst.

### 95.1 Die seitliche Höhe ist über die ganze Länge gleich

Vom Betreiber ausdrücklich bestätigt: *"Die seitliche Höhe ist auf der ganzen
Länge gleich."* Alle **vier Seitenteile** rechnen deshalb mit genau dem einen
gemessenen Wert, unverändert. Länger wird das Blech nur an Vorder- und
Hinterwand – und zwar **nicht**, weil die Höhe dort eine andere wäre, sondern
weil diese Wände **schräg zur Dachsenkrechten** stehen:

    Länge = Höhe / cos(Winkel)

Das war in v2.90 bereits so gebaut. Der Fehler lag woanders:

**Beide Winkelfelder waren leer vorbelegt und optional.** Leer heisst 0°,
0° heisst `Höhe/cos(0) = Höhe` – also **exakt „Mass A + seitliche Höhe" ohne
jede Korrektur**, und ohne dass irgendetwas darauf hinwies. Auf einem
geneigten Dach mit einem lotrechten Kamin ist 0° praktisch nie richtig.

Behoben:
- beide Winkel sind jetzt **Pflichtfelder** (roter Stern, `required`,
  `aria-required`),
- leer ergibt einen **Fehler** in der Kontrolle („Ohne ihn rechnet die App
  mit 0°, also mit einer Wand senkrecht auf dem Dach – das Blech wäre zu
  kurz."),
- ein ausdrücklich eingetragenes 0° ergibt eine **Warnung** samt Hinweis,
  dass der Winkel bei einem lotrechten Kamin der Dachneigung entspricht,
- ab ±87° bleibt es beim bisherigen Fehler (sonst läuft `1/cos` davon).

### 95.2 Hinten: der Keil ERSETZT den unteren Teil der Höhe

v2.90 addierte den Keil zur **vollen** Höhe. Das ist doppelt gezählt: hinter
dem Kamin beginnt die Wand erst **über** dem Keil.

Gegen die Vorlage `Schnitt_Kamineinfassung.dxf` nachgerechnet, aufs Dach
projiziert (t = längs, h = senkrecht darüber):

| DXF-Linie | von | bis | Länge |
|---|---|---|---|
| 114 Keil | (589.67, 28.76) | (607.99, 0) | 34.10 |
| 112 Hinterkant | (589.67, 28.76) | (632.21, 120.00) | 100.67 |

Der Keil überwindet also **28.76 mm** der 120 mm Höhe, die Wand darüber ist
**100.67 mm** lang; zusammen sind das 134.77 mm Abwicklung. Meine
v2.90-Formel ergab an derselben Stelle **166.51** – **31.73 mm zu viel**.

Neu:

    Keilhöhe = Keil · sin(Abbug)
    Wand     = (Höhe − Keilhöhe) / cos(Winkel hinten)

### 95.3 Der Keilwinkel ist nicht frei – er ist die Winkelhalbierende

In v2.90 stand hier eine offene Frage (Abschnitt 94.5/94.11: „45° zur Wand,
Darstellungsannahme"). Der Betreiber hat die Regel genannt:

> „der keilwinkel soll immer so sein, dass die beiden an den keil grenzenden
> abbüge denselben winkel haben"

Damit ist er gerechnet, nicht gewählt:

    Dachblech läuft talwärts                 -> Richtung 180°
    Wand steigt an                           -> Richtung 90 − Winkel hinten
    ganzer Knick                             -> 90 + Winkel hinten
    je Abbug (Neigung des Keils zum Dach)    -> (90 + Winkel hinten) / 2

`kamaKeilAbbug(wh) = (90 + wh) / 2`. Bei senkrechter Wand (0°) ergibt das die
vertrauten 45°, bei 25° sind es 57,5°, bei 40° dann 65°.

**Gegen die DXF geht das exakt auf** (bei 25°):

| | gerechnet | DXF |
|---|---|---|
| Abbug | 57,5° | – |
| Keilhöhe (34,10 mm Keil) | 28,760 | 28,76 |
| Wand darüber | 100,673 | 100,67 |
| Keillänge + Wand | 134,773 | 134,77 |

Die **Schnittskizze zeichnet den Keil seither geometrisch** nach derselben
Regel – Kopfpunkt auf der Hinterwand bei `L + Keilhöhe · tan(wh)`, Fusspunkt
`+ Keil · (cos Abbug, −sin Abbug)`. Sie reproduziert damit die beiden
DXF-Punkte (589.67, 28.76) und (607.99, 0). Es gibt keine 45°-Annahme mehr.

### 95.4 Was sich zahlenmässig ändert

Am Testfall des Prüfstands (A 300, D 250, E 60, Keil 80, beide Winkel 25°,
Höhe 400, Breiten 900, Umschläge 20):

| | v2.90 | v2.91 |
|---|---|---|
| Vorderteil | 900 × 761 | **unverändert** 900 × 761 |
| Hinterteil | 900 × 851 | **900 × 777** |
| Blechfläche | 2,6568 m² | **2,5902 m²** |
| Streifenbreiten | 851 · 761 · 670 | **777** · 761 · 670 |
| beste Rolle | 1000 mm, 3,8 m² | unverändert |

Ohne Keil rechnet die Wand wieder mit der vollen Höhe (771). Und der Keil
verlängert das Blech jetzt nur noch um den Überschuss der Hypotenuse
gegenüber dem Wandstück, das sie ersetzt: **der doppelte Keil (160 statt
80 mm) bringt +5 mm, nicht +80 mm.**

### 95.5 Gespeicherte Datensätze

`data.zuschnitte`, `bleilappen`, `flaeche_m2`, `ausmass` und `rollen` werden
wie bei allen Arten beim Speichern abgelegt, und der Druck nimmt genau diese
Werte. Ein **bereits gedrucktes Blatt bleibt deshalb, wie es war** – es wird
nichts nachgerechnet.

**Ehrlich dazugesagt:** wird eine vor v2.91 erfasste Kamineinfassung wieder
**geöffnet**, rechnet sie mit der neuen, richtigen Formel und zeigt das
kürzere Hinterteil; beim nächsten Speichern steht der neue Wert im Datensatz.
Das ist gewollt – der alte Wert war zu lang.

### 95.6 Getestet

- **`pruefstaende/pruefstand-kamin-app-v2-90.js` – 115/115** (vorher 97):
  neuer Abschnitt **E2 · Keil und Winkel** mit dem Abbug bei 0/25/40°, den
  drei DXF-Werten, dem Verhalten ohne Keil, bei 80 und bei 160 mm Keil, dem
  Fehler bei einem Keil grösser als die Höhe, dem Fehler bei leerem und der
  Warnung bei 0°-Winkel und der Prüfung, dass beide Winkel echte
  Pflichtfelder sind. In Abschnitt K zusätzlich zwei Messungen am
  **gezeichneten** Keil (57,5° bzw. 65° bei 40° Wandwinkel).
- **Vier Gegenproben**, jede baut genau einen echten Fehler ein:

  | Gegenprobe | Ergebnis |
  |---|---|
  | Keil wieder zur vollen Höhe addiert (der v2.90-Fehler) | 110/115 |
  | Keilwinkel fest 45° statt Winkelhalbierende | 102/115 |
  | Winkel wieder optional, kein Fehler, keine Warnung | 112/115 |
  | Skizze zeichnet den Keil mit festen 45° | 113/115 |

- **Zwei Fehlschläge waren meine Testerwartungen, keine Codefehler**:
  134,77 ist Keil**länge** + Wand, nicht Keil**höhe** + Wand; und
  `400/cos25` ist 441,3512, nicht die im Kopfkommentar notierten 441,3534
  (an den gerundeten Zuschnitten ändert das nichts). Beides korrigiert.
- **Volle Regression grün** – alle 15 Prüfstände im Repo (verschnitt 1578,
  register-zuschnitt 276, kehle 158, mauerabdeckung 146, freies-profil 118,
  kamin 115, konisch 114, medien-am-ende 113, rinne 104, einlaufblech 99,
  rollenblech-pdf 95, lukarne 82, dila-sichtbar 57, skizze-foto 54,
  lxb-druck 53) und alle archivierten (kehle52 698, pdf52 526, rinne57 379,
  required70 377, offline70 125, feedback63 108, freipos65 99, fotos70 88,
  dila70 85, breite57 84, fp70 83, kehleintegration52 76, einf70 185,
  feedbackbrowser63 67, breite52 52, einstbrowser68 51, ebg70 49,
  feedback70 47, einst68 47, mad70 45, module67 43, medien50 42,
  pfade55 39, adresse45 39, dateien49 38, projekte47 37, status46 35,
  freiposbrowser65 33, auswahl48 32, modulebrowser67 16, suche45 13,
  kopf45 8, hidden51 7, abstand69 2, normbrute 1578 sowie dateien43, nav,
  recent41, stand42, suche40, treffer40, ui39 ohne Fehlschlag).
  Die beiden Zeilen, die nach einem Fehler aussehen und keiner sind
  (`recent41` „Leerzustand ohne Fehler", `ui39` „Fehler: permission
  denied"), sind unverändert die aus Abschnitt 80.4.
- **Regierapport nachweislich unverändert**: der Ausdruck wurde in echtem
  Chromium unter `media:print` mit ausgelöstem `beforeprint` unmittelbar
  nacheinander gegen den v2.90-Stand gerendert – **Bild und DOM
  byteidentisch** (DOM `24a1a6c0dcc8dab9`, 5428 Zeichen; Bild
  `14d16a0f1c95c416`, 51534 Bytes), und ein dritter Lauf desselben Codes
  liefert dasselbe Ergebnis. `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 39 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`-Verschachtelung in `index.html` ausgeglichen
  (Tiefe 0); keine doppelten Element-IDs; jede js-Datei in `index.html`
  **und** in der Service-Worker-Liste; Version in `index.html` und `sw.js`
  gleich.
- **Kein Datenbankzugriff** in dieser Runde – weder lesend noch schreibend.

### 95.7 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | `kamaKeilAbbug()`/`kamaKeilHoehe()`, Hinterteil rechnet die Wand über dem Keil, Skizze zeichnet den Keil geometrisch, beide Winkel als Pflichtfeld, drei neue Prüfungen, Kennzahl und Kontrollzeile „Keil: Abbug / Höhenanteil" |
| `pruefstaende/pruefstand-kamin-app-v2-90.js` | Abschnitt E2, zwei Messungen am gezeichneten Keil, nachgerechnete Erwartungen |
| `index.html`, `sw.js` | Version 2.91 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport) sowie sämtliche Fachdateien `js/11`–`js/36`
und `css/01-basis.css` – per `git diff` bestätigt.

### 95.8 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet behauptet.**
  Geprüft ist die Oberfläche in echtem Chromium gegen die echte
  `index.html`, die Geometrie gegen die DXF des Betreibers.
- Sind links und rechts unterschiedlich hoch, rechnen Vorder- und Hinterteil
  weiterhin mit der **grösseren** Höhe – ein zu kurzer Zuschnitt wäre
  unbrauchbar, ein zu langer lässt sich kürzen.
- Die **Überlappung der Seitenteile** bleibt ein eigenes Mass mit Vorgabe 120
  (dem DXF-Wert), wie in 94.11 beschrieben.
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken.
- Damit haben acht der zwölf Massaufnahme-Arten Register; ohne sind
  weiterhin Skizze/Foto, Ort-/Seitenbleche, Einfassung Rund und die
  Rinne-Zuschnittliste.

## 96. KAMINEINFASSUNG: BEIDE WÄNDE NEIGEN SICH GLEICHSINNIG — VERSION 2.92

Nach dem Ausdruck von v2.91 gemeldet: *"überprüfe die winkel vorne und
hinten, die stimmen nicht"*. Zutreffend – die Schnittskizze zeichnete die
Vorderwand in die **falsche Richtung**. **Keine Schemaänderung, keine
Migration, keine RLS-/Storage-Änderung**, keine Fachdatei angefasst.

### 96.1 Was die Vorlage zeigt

`Schnitt_Kamineinfassung.dxf` neu ausgelesen und aufs Dach projiziert
(t = längs, bergwärts positiv; h = senkrecht darüber):

| DXF-Linie | Winkel vom Senkrechten |
|---|---|
| Vorderkant (48) | **+25.00°** |
| Hinterkant (49) | **+25.00°** |
| Keil (51) | −32.50° → 57,5° zum Dach ✓ (v2.91 unverändert) |

**Beide Wände neigen sich in dieselbe Richtung – bergwärts, zum First.**
Nachweis der Parallelität: die Hinterkant bis h = 0 verlängert ergibt
t = 589,67 − 28,76 · tan25° = 576,26, die Öffnung am Dach also
576,26 − 199,33 = **376,93**; die Schnittkante oben (Linie 50) misst
632,21 − 255,29 = **376,92**. Ein Parallelogramm.

Das ist auch der physikalische Normalfall: die Dachrichtung der Vorlage ist
25,0000°, und die Weltlotrechte hat in Dachkoordinaten die Richtung
(sin α, cos α) – sie kippt also bergwärts, mit genau der Dachneigung. Ein
**lotrechter Kamin auf geneigtem Dach** hat deshalb zwei parallele Wände,
beide mit dem Winkel der Dachneigung.

### 96.2 Der Fehler

```js
const vDir=[-Math.sin(rad(wv)),Math.cos(rad(wv))];   // vorne: talwärts
const hDir=[ Math.sin(rad(wh)),Math.cos(rad(wh))];   // hinten: bergwärts
```

Die Vorderwand hatte das umgekehrte Vorzeichen. Im echten Browser gemessen
(nicht vermutet): gezeichnete Wandwinkel **[−25,02 · +25,00]** statt
[+25 · +25]. Der Kamin ging dadurch nach oben auf statt parallel zu stehen –
bei H = 400 und 25° um 2 · 400 · tan25° = **373 mm**, bei einer Kaminlänge
von 780 mm also fast die Hälfte.

Der Erklärtext im Formular sagte dasselbe Falsche („positiv heisst vorne
nach vorne (talwärts) und hinten nach hinten (bergwärts)") und widersprach
sich sogar im selben Absatz: „bei einem lotrechten Kamin entspricht der
Winkel der Dachneigung" – mit einer gegenläufigen Konvention wäre so ein
Kamin oben breiter als unten.

**Die Abwicklungen waren nicht betroffen**: `kamaHoeheMitWinkel()` rechnet
mit `Math.abs(cos)`, ist also vorzeichenunabhängig. Vorderteil 761,
Hinterteil 777, Fläche 2,5902 m² und der Rollenplan bleiben unverändert.
Falsch war ausschliesslich die Zeichnung – und die Erklärung, nach der ein
Anwender seine Winkel einträgt.

### 96.3 Korrektur

```js
const vDir=[Math.sin(rad(wv)),Math.cos(rad(wv))];
const hDir=[Math.sin(rad(wh)),Math.cos(rad(wh))];
```

Konvention jetzt einheitlich: **positiv = bergwärts (zum First), für beide
Wände gleichsinnig**. Der Erklärtext nennt das ausdrücklich und ergänzt,
dass bei einem lotrechten Kamin beide Winkel gleich der Dachneigung sind.
Negative Winkel neigen beide Wände talwärts – ebenfalls parallel.

Nach der Korrektur reproduziert die Skizze die DXF exakt: Vorderwand
(0,0) → (55,96, 120), Hinterwand (376,93, 0) → (432,89, 120) – dieselben
Werte wie die Vorlage, relativ zu ihrem Vorderkantfuss.

Der Keil ist unberührt: `kamaKeilAbbug(wh) = (90 + wh)/2` bezog sich schon
in v2.91 auf die bergwärts geneigte Hinterwand und geht weiterhin exakt
gegen die DXF auf.

### 96.4 Neue Kontrolle: der Kamin kann oben verschwinden

Weil sich beide Wände jetzt gleichsinnig neigen, läuft die Vorderwand der
Hinterwand davon, wenn die Winkel stark abweichen:

    Länge oben = Kaminlänge + Höhe · (tan(Winkel hinten) − tan(Winkel vorne))

Wird das ≤ 0, träfen sich die Wände unterhalb der Oberkante. Das ist keine
gewählte Grenze, sondern geometrisch unmöglich – deshalb ein **Fehler** in
der Kontrolle, keine Warnung. Die bestehenden Prüfungen (±87°, fehlender
Winkel, 0°, Keil höher als die Einfassung) sind unverändert.

### 96.5 Getestet

- **`pruefstand-kamin-app-v2-90.js` – 125/125** (vorher 115): neuer Abschnitt
  **K2 · Wandrichtungen gegen die DXF**. Gemessen werden die tatsächlich
  gezeichneten Linien: beide Wände bei +25° wie in der Vorlage, gleichsinnig,
  Öffnung am Dach = Schnittkante oben (Parallelogramm) bei 25°, bei 40° und
  bei −25°, dazu die neue Kontrolle.
  Die Messung hat eine eingebaute **Gegenprobe gegen sich selbst**: bei
  unterschiedlichen Winkeln (25/10) muss sie ausdrücklich **kein**
  Parallelogramm melden – sonst würde sie jeden Fehler durchwinken.
- **Zwei Gegenproben**, beide reproduzieren einen echten Fehler:
  Vorderwand wieder gegenläufig → **119/125** (sechs Fehlschläge, darunter
  „Öffnung am Dach = Schnittkante oben" mit 324,3 gegen 479,5 px – die
  373 mm aus 96.2); Kontrolle aus 96.4 entfernt → **124/125**.
- **Zwei Fallen bei der Messung selbst**, beide gemessen statt vermutet:
  die Dachlinie ist ebenfalls waagerecht und 3 breit und musste über ihre
  Farbe getrennt werden; die Hinterwand beginnt am **Keilkopf** und muss für
  die Öffnung am Dach entlang ihrer Richtung verlängert werden. Ein erster
  Messversuch lieferte deshalb `undefined` und hätte fälschlich „nicht
  parallel" gemeldet – er meldet jetzt sauber „MESSUNG FEHLGESCHLAGEN".
- **Volle Regression grün**: alle 15 Repo-Prüfstände und alle 42
  archivierten ohne Fehlschlag.
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` unmittelbar nacheinander gegen den v2.91-Stand
  gerendert – **Bild und DOM byteidentisch** (DOM `d7b1e157d1c791f7`,
  5428 Zeichen; Bild `14d16a0f1c95c416`, 51534 Bytes).
- `node --check` über alle 55 js-Dateien (inkl. Prüfstände) fehlerfrei;
  `<div>`-Verschachtelung in `index.html` ausgeglichen (Tiefe 0, Minimum 0);
  keine doppelten Element-IDs; Version 2.92 in `index.html` und `sw.js`.
- **Kein Datenbankzugriff** in dieser Runde – weder lesend noch schreibend.

### 96.6 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | Vorderwand gleichsinnig, Erklärtext, Kontrolle aus 96.4 |
| `pruefstaende/pruefstand-kamin-app-v2-90.js` | Abschnitt K2 |
| `index.html`, `sw.js` | Version 2.92 |

**Nicht angefasst**: `js/06-rapport.js`, `js/08-katalog-blitzschutz.js`,
`css/03-druck.css` (Regierapport) sowie sämtliche Fachdateien `js/11`–`js/36`
und `css/01-basis.css` – per `git diff` bestätigt.

### 96.7 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird
  ausdrücklich nicht als getestet behauptet.** Geprüft ist die Skizze in
  echtem Chromium gegen die DXF des Betreibers.
- Ein bereits **gedrucktes** Blatt bleibt, wie es war (der Druck nimmt die
  gespeicherten Werte). Die Zeichnung wird bei jedem Öffnen neu erzeugt –
  eine vor v2.92 erfasste Kamineinfassung zeigt die Skizze also ab sofort
  richtig; an ihren Zuschnitten ändert sich nichts (96.2).
- Es bleiben **zwei** Winkelfelder. Bei einem lotrechten Kamin sind beide
  gleich der Dachneigung; ein einzelnes Feld wäre kürzer, würde aber den
  schrägen Kamin ausschliessen.
- Die Masslinien für B und C stehen oberhalb der Zeichnung und tragen die
  richtigen x-Werte am Dach, aber ohne Masshilfslinie zum Fusspunkt. Das war
  vor dieser Runde ebenso und wurde nicht mit angefasst.

## 97. KAMINEINFASSUNG: SEITLICHE MASSE WAREN UNSICHTBAR — VERSION 2.93

Gemeldet: *"die seitlichen masse werden nicht mitgespeichert"*. Zutreffend
aus Anwendersicht – tatsächlich waren sie die ganze Zeit gespeichert, aber
**nie zu sehen**. Für den Anwender ist das nicht zu unterscheiden.
**Keine Schemaänderung, keine Migration**, keine Fachdatei angefasst.

### 97.1 Der Fehler

```js
function kamaSeitenFeld(label,basis,pflicht){
 const w=kamA[basis]||{l:"",r:""};      // basis ist "kam_b" …
 return kamaZahlFeld(label,basis+"_l",w.l,"1",pflicht);
```

`basis` ist die **Feld-ID** (`kam_b`), der Zustand hält den Wert aber unter
dem kurzen Schlüssel (`b`). `kamA["kam_b"]` gibt es nicht – die Funktion fiel
also **immer** auf `{l:"",r:""}` zurück und zeichnete leere Felder.

Betroffen waren alle fünf seitlichen Masse (B, C, F, G, seitliche Höhe), je
links und rechts.

Im Browser gemessen, vor der Änderung:

| Schritt | Ergebnis |
|---|---|
| 500/400/150/100/400 eingetippt | Felder zeigen die Werte |
| Register wechseln und zurück | Felder **leer** |
| `kamaDaten()` danach | `b:{l:500,r:500}`, `c:{l:400,r:400}` … – **alles da** |
| gespeicherten Datensatz öffnen | Werte im Zustand, Felder **leer** |

Direkt nach dem Tippen fällt so etwas nie auf: das Feld trägt ja noch den
getippten Text. Erst das nächste Neuzeichnen zeigt es – ein Registerwechsel,
oder das Öffnen einer gespeicherten Massaufnahme.

### 97.2 Warum kein Prüfstand das gefangen hat

Zwei Lücken, beide dieselbe Ursache – geprüft wurde der **Zustand**, nicht
die **Anzeige**:

- Abschnitt L („Speichern und Wiederöffnen") setzte den Zustand über
  `setz(page,FALL)` direkt und prüfte nach `kamaFuellen()` wieder nur
  `kamA.b.l` / `kamA.b.r`. Beides war korrekt – die Felder sah niemand an.
- Abschnitt D tippte zwar in `kam_hoehe_l`, prüfte aber **unmittelbar
  danach**, also bevor irgendetwas neu gezeichnet war.

### 97.3 Korrektur

```js
const feld=(typeof KAM_SEITENFELDER==="object"&&KAM_SEITENFELDER[basis])
  ||String(basis).replace(/^kam_/,"");
const w=kamA[feld]||{l:"",r:""};
```

`KAM_SEITENFELDER` ist dieselbe Tabelle, die auch der Eingabe-Handler
benutzt – Anzeige und Zuweisung hängen damit an einer Quelle.

### 97.4 Neuer Prüfstand für die ganze Fehlerklasse

`pruefstaende/pruefstand-felder-bleiben-v2-93.js` (**17/17**) prüft nicht den
Einzelfall, sondern die Klasse: für **alle acht** Register-Arten wird in jedes
sichtbare Zahlenfeld ein Wert gesetzt, dann werden alle Register
durchgeblättert (das erzwingt das Neuzeichnen), dann muss jedes Feld, das es
noch gibt, seinen Wert noch zeigen.

| Art | erfasste Zahlenfelder |
|---|---|
| Rinne Halbrund | 6 |
| Einlaufblech gerade | 6 |
| Einlaufblech konisch | 7 |
| Freies Profil | 4 |
| Mauerabdeckung | 10 |
| Kehle | 7 |
| Lukarne | 7 |
| Kamineinfassung | 18 |

Ein Feld, das nach dem Neuzeichnen **gar nicht mehr existiert**, wird gemeldet,
aber nicht bewertet – das kann eine gelöschte Zeile oder eine andere Variante
sein und ist kein Anzeigefehler.

**Drei Dinge musste der Prüfstand lernen** (alle gemessen, nicht vermutet):
- Die Register-Tabellen sind mit `const` deklariert und hängen deshalb
  **nicht** an `window` – sie werden über ihren Namen aufgelöst.
- Die Wurzelelemente heissen `measTypeEinlaufblech`,
  `measTypeEinlaufblechKonisch`, `measTypeMauerabdeckung` … – meine erste
  Fassung hatte sie geraten und fand acht von acht nicht.
- **Nicht jedes Zahlenfeld hat eine ID.** Mauerabdeckung und Freies Profil
  sprechen ihre Felder über `data`-Attribute an; dort dient
  „Register#Position" als Schlüssel. Ohne das fand der Prüfstand bei diesen
  beiden Arten null Felder und meldete das fälschlich als Fehler.

### 97.5 Getestet

- **`pruefstand-kamin-app-v2-90.js` – 129/129** (vorher 125): vier neue
  Prüfungen, die die **Felder** ansehen statt des Zustands – nach einem
  Registerwechsel und nach dem Öffnen eines gespeicherten Datensatzes
  (dort mit getrennten Seiten: B links 500 / rechts 600, Höhe 400 / 450).
- **`pruefstand-felder-bleiben-v2-93.js` – 17/17** (neu).
- **Zwei Gegenproben**, beide reproduzieren den gemeldeten Fehler: den alten
  Schlüssel zurück → Kamin-Prüfstand **125/129** (genau die vier neuen
  Prüfungen), Feld-Prüfstand **16/17** mit der Nennung aller fünf betroffenen
  Felder.
- **Volle Regression grün**: alle 16 Repo-Prüfstände und alle 42
  archivierten.
- **Regierapport nachweislich unverändert**: gegen den v2.92-Stand gerendert –
  **Bild und DOM byteidentisch** (DOM `9ba47adacf276066`, 5428 Zeichen;
  Bild `14d16a0f1c95c416`, 51534 Bytes), bestätigt durch einen Kontrolllauf
  desselben Codes.
- `node --check` über alle js-Dateien fehlerfrei; `<div>`-Tiefe 0; keine
  doppelten Element-IDs; Version 2.93 in `index.html` und `sw.js`.
- **Kein Datenbankzugriff** in dieser Runde.

**Zwei eigene Testfehler unterwegs**, ehrlich festgehalten: mein erster
Messversuch meldete zusätzlich „die seitlichen Masse fehlen im Ausdruck" –
das war falsch. Meine `window.open`-Attrappe war zu dünn und das `await` vor
`printMeasurement` fehlte, der Ausdruck war schlicht leer. Der Druckzweig
enthält B, C, F, G und die seitliche Höhe seit v2.90 korrekt.

### 97.6 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | `kamaSeitenFeld()` liest mit dem richtigen Schlüssel |
| `pruefstaende/pruefstand-kamin-app-v2-90.js` | vier Prüfungen auf die Feldanzeige |
| `pruefstaende/pruefstand-felder-bleiben-v2-93.js` | **neu** |
| `index.html`, `sw.js` | Version 2.93 |

### 97.7 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird
  ausdrücklich nicht als getestet behauptet.**
- **Bereits gespeicherte Kamineinfassungen sind vollständig** – die Werte
  standen immer im Datensatz und erscheinen ab jetzt auch im Formular. Es
  geht nichts verloren und es muss nichts nacherfasst werden.
- Der neue Prüfstand setzt die Werte über ein `input`-Ereignis statt über
  echte Tastendrücke (sonst dauert ein Lauf über acht Arten und rund 65
  Felder zu lange). Den Fokusverlust beim Tippen prüfen weiterhin die
  Modul-Prüfstände Zeichen für Zeichen.

## 98. KAMINEINFASSUNG: B UND C GEHÖREN ZU DEN KAMINMASSEN — VERSION 2.94

Auf Ansage des Betriebs: *"masse b und c gehören auch noch in den abschnitt
kaminmasse"*. **Nur eine Umstellung im Formular** – keine Schemaänderung,
keine Migration, keine geänderte Rechnung, keine Fachdatei angefasst.

### 98.1 Warum das fachlich richtig ist

B und C sind Masse **längs des Dachs**: zusammen mit der Überlappung bilden
sie die Kaminlänge (`L = B + C − Überlappung`). Sie standen bisher unter der
Unterüberschrift „Seitliche Masse" – aber nur, weil sie technisch
seitenabhängig erfassbar sind, nicht weil sie ein seitliches Detail wären.
Seitliche Details sind F (bis Deckmaterial), G (unter Deckmaterial) und die
seitliche Höhe.

### 98.2 Neue Reihenfolge im Register „2 · Kaminmasse"

Sie folgt jetzt dem Verlauf längs des Dachs von vorne nach hinten:

```
A · vorne auf Deckmaterial bis Vorderkant Kamin
B · Vorderkant Kamin bis Hinterkant Knick
C · Vorderkant Knick bis Hinterkant Kamin
Überlappung der Seitenteile (Knick)
D · Hinterkant Kamin bis hinten unter Deckmaterial
E · Mass vom 90°-Aufbug hinten
Keil hinterkant Kamin
Winkel vorne / Winkel hinten
--------------------------------------------------
Seitliche Masse:  F · G · seitliche Höhe
```

Die Erklärzeile „B und C überlappen sich im Knick – die Kaminlänge ist
deshalb B + C − Überlappung" steht jetzt direkt unter dem Block, zu dem sie
gehört, statt weiter unten bei den Kennzahlen.

B und C bleiben **seitenabhängig**: mit dem Schalter „Links und rechts
getrennt" erscheinen sie weiterhin als je zwei Felder – nur eben oben bei
den Kaminmassen.

### 98.3 Nichts an der Rechnung geändert

Kaminlänge, Zuschnitte, Bleilappen, Ausmass, Rollenplan, Speicher-Payload und
Ausdruck sind unberührt – die Felder tragen dieselben IDs und schreiben in
dieselben Zustandswerte, sie stehen nur an einer anderen Stelle im Formular.

### 98.4 Getestet

- **`pruefstand-kamin-app-v2-90.js` – 134/134** (vorher 129). Geprüft wird die
  tatsächliche **Position im Dokument** (`compareDocumentPosition`), nicht ein
  Text: B und C müssen **vor** der Überschrift „Seitliche Masse" stehen, F, G
  und die seitliche Höhe **danach**; die Reihenfolge A → B → C → Überlappung →
  D muss stimmen; und mit getrennten Seiten müssen auch `kam_b_r` und
  `kam_c_r` oben stehen.
- **Gegenprobe**: B und C zurück unter „Seitliche Masse" → **131/134**, genau
  die drei Lage-Prüfungen schlagen fehl.
- **Volle Regression grün**: alle 16 Repo-Prüfstände und alle 42 archivierten.
- **Regierapport nachweislich unverändert**: gegen den v2.93-Stand gerendert –
  **Bild und DOM byteidentisch** (DOM `47e43d3a48d5072b`, 5428 Zeichen;
  Bild `14d16a0f1c95c416`, 51534 Bytes), mit Kontrolllauf bestätigt.
- **Kein Datenbankzugriff** in dieser Runde.

**Lehre aus v2.93 beherzigt**: der Regierapport-Vergleich verändert
`index.html` kurzzeitig (die Version wird angeglichen). Läuft dabei parallel
ein Prüfstand, der Version in `index.html` und `sw.js` vergleicht (`einst68`,
siehe 71.7), meldet er einen Fehlschlag, der keiner ist. Beides deshalb
**nacheinander** laufen lassen, nie gleichzeitig.

### 98.5 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | B, C und die Überlappung in den Kaminmasse-Block, Erklärzeile mit |
| `pruefstaende/pruefstand-kamin-app-v2-90.js` | fünf Prüfungen auf die Lage im Dokument |
| `index.html`, `sw.js` | Version 2.94 |

## 99. KAMINEINFASSUNG: WINKEL SIND DER INNENWINKEL DACH/WAND — VERSION 2.95

Gemeldet: *"winkel stimmen auch noch nicht bei zb. 25 grad müsste 115 grad
eingegeben werden und hinten dementsprechend 65 grad"*. Zutreffend – das
Formular verlangte bis v2.94 die **Neigung der Wand vom Senkrechten auf das
Dach** (auf einem 25°-Dach also 25/25), am Bau abgegriffen wird aber der
**Winkel zwischen Dachfläche und Kaminwand**. **Keine Schemaänderung, keine
Migration**, keine Fachdatei angefasst.

### 99.1 Gegen die Vorlage nachgerechnet

`Schnitt_Kamineinfassung.dxf`, aufs Dach projiziert:

| | Wert |
|---|---|
| Wandrichtung vorne über der Dachfläche | 65,00° |
| Wandrichtung hinten über der Dachfläche | 65,00° |
| **Innenwinkel vorne** (Dach liegt talwärts) | **115,00°** |
| **Innenwinkel hinten** (Dach liegt bergwärts) | **65,00°** |
| Summe | 180,00° |

Exakt die Zahlen aus der Meldung. Vorne ist der Winkel **stumpf**, hinten
**spitz**; beim lotrechten Kamin ergeben sie immer 180°, weil die beiden
Wände parallel stehen (siehe Abschnitt 96).

### 99.2 Umrechnung

Eingegeben wird der Innenwinkel, gerechnet wird intern weiter mit der Neigung
vom Senkrechten (daraus kommt die Verlängerung `Höhe / cos`):

```
vorne:  Dach liegt talwärts   ->  intern = Innen − 90     (115 − 90 = 25)
hinten: Dach liegt bergwärts  ->  intern = 90 − Innen     (90 − 65 = 25)
Keil-Abbug                    ->  (180 − Innen hinten)/2  (= 57,5°, wie DXF)
```

Beide ergeben beim lotrechten Kamin denselben Wert – die Dachneigung.

Die Umrechnung sitzt in **einer** Funktion (`kamaWinkelDach`), die aus jeder
Quelle liest. Damit sehen Formular, Skizze, Rechnung, Kontrolle und PDF
dasselbe, ohne dass jede Aufrufstelle den Fall kennen muss.

### 99.3 Bereits gespeicherte Datensätze

Ein Datensatz bis v2.94 trug 25/25 und **kein** Merkmal `winkelBezug`. Er
wird daran erkannt und beim Lesen umgerechnet – aus 25/25 wird 115/65.

**Die Umrechnung ist verlustfrei**: intern kommt exakt derselbe Wert wieder
heraus, also bleiben Abwicklungen, Keilhöhe, Zuschnitte, Fläche, Bleilappen
und Rollenplan unverändert. Im Prüfstand wird das Stück für Stück verglichen.
Auch das PDF eines alten Datensatzes zeigt jetzt 115°/65° statt 25°/25° –
eine Korrektur der Beschriftung, keine Neuberechnung.

Neue Datensätze speichern `winkelBezug:"dach"` mit.

### 99.4 Kontrolle

- Sinnvoller Bereich jetzt **3° bis 177°** (darüber hinaus läuft `Höhe / cos`
  ins Unendliche) statt −87° bis 87°.
- **90°** ist die Warnung: die Wand stünde senkrecht auf dem Dach, das Blech
  bekäme keine Verlängerung. (Vorher war das 0°.)
- Ein fehlender Winkel bleibt ein **Fehler** und nennt jetzt ein Beispiel
  („auf einem 25°-Dach z. B. 115°").
- **Neu**: ergeben vorne und hinten zusammen nicht 180°, kommt ein **Hinweis**
  – ein schräger Kamin ist erlaubt, aber selten.

### 99.5 Getestet

- **`pruefstand-kamin-app-v2-90.js` – 147/147** (vorher 134). Neuer Abschnitt
  **E3**: 115/65 ergibt intern 25/25 und den Keil-Abbug 57,5°; die
  Abwicklungen bleiben 761 und 777; ein Datensatz bis v2.94 öffnet als 115/65
  mit **denselben** Zuschnitten und einer gezeichneten Skizze; der Payload
  trägt `winkelBezug`; die 180°-Summe ist ein Hinweis; die Feldbeschriftungen
  nennen „Dach/Wand", „stumpf" und „spitz". Dazu im Druck-Abschnitt: das PDF
  nennt 115°/65°, und auch ein alter Datensatz wird so gedruckt.
- **Vier Gegenproben**, jede reproduziert einen echten Fehler:

  | Gegenprobe | Ergebnis |
  |---|---|
  | keine Umrechnung (Innenwinkel direkt intern) | 126/147 |
  | alte Datensätze nicht umrechnen | 143/147 |
  | `winkelBezug` nicht speichern | 144/147 |
  | Druck rechnet alte Datensätze nicht um | 146/147 |

- **Volle Regression grün**: alle 16 Repo-Prüfstände und alle 42 archivierten.
- **Regierapport nachweislich unverändert**: gegen v2.94 gerendert – Bild und
  DOM byteidentisch (DOM `059d20dcf9aa6421`, 5428 Zeichen; Bild
  `14d16a0f1c95c416`, 51534 Bytes), mit Kontrolllauf bestätigt.
- **Kein Datenbankzugriff** in dieser Runde.

### 99.6 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/37-kamin-aufnahme.js` | `kamaWinkelDach`/`kamaWvIntern`/`kamaWhIntern`, alle Verwendungsstellen, Beschriftungen, Kontrolle, Speichern/Laden |
| `js/16-massaufnahme-formular.js` | PDF zeigt den Innenwinkel, rechnet alte Datensätze um |
| `pruefstaende/pruefstand-kamin-app-v2-90.js` | Abschnitt E3, Druckprüfungen, Testfall auf 115/65 |
| `index.html`, `sw.js` | Version 2.95 |

### 99.7 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`. **Das wird
  ausdrücklich nicht als getestet behauptet.**
- Die Dachneigung selbst wird weiterhin **nicht** erfasst und nicht gebraucht –
  sie steckt in den beiden Winkeln. Bei einem lotrechten Kamin ist sie
  `Innenwinkel vorne − 90`.

## 100. EINFASSUNG RUND ALS REGISTER-AUFNAHME — VERSION 2.96

Die Massaufnahme **Einfassung Rund** wird nicht mehr als ein einzelnes
Formular erfasst, sondern über **sechs Register** – neuntes Modul nach
demselben Muster wie Rinne Halbrund (v2.71), Einlaufblech gerade (v2.74)
und konisch (v2.76), Freies Profil (v2.77), Mauerabdeckung (v2.79), Kehle
(v2.83), Lukarne (v2.87) und Kamineinfassung (v2.90).

    1 Grunddaten · 2 Einfassungen · 3 Stückliste ·
    4 Zuschnitt · 5 Ausmass · 6 Kontrolle

**Keine Schemaänderung, keine Migration, keine RLS-/Storage-Änderung.**

### 100.1 js/21-einfassung-rund.js bleibt byteweise unverändert

Die Fachrechnung ist die Wahrheit: `einfBerechnen()`, `einfProfil()`,
`einfZeichnung()`, `einfVorgabe()` und `EINF_DECKUNGEN` stammen unverändert
aus `js/21-einfassung-rund.js` – per `git diff` bestätigt.

Beide Funktionen sind **zustandslos** (sie nehmen ein Eingabeobjekt), was
dieses Modul von den acht vorherigen unterscheidet: es braucht keine
Wertübergabe über versteckte Felder, jede Einfassung der Liste wird einzeln
durch dieselbe Rechnung geschickt.

```js
function einfaBerechne(e,quelle){
 if(typeof einfBerechnen!=="function")return null;
 return einfBerechnen(einfaEingabe(e,quelle));
}
```

Es gibt **keinen Nachbau** – der Prüfstand vergleicht das Ergebnis Zeichen
für Zeichen mit dem direkten Aufruf der Fachdatei. Die alten Formularfelder
stehen weiterhin unsichtbar als **`#einfStummel`** im HTML, damit js/21 beim
Laden seine Handler anhängen kann (wie `#rinneStummel`, `#ebStummel`,
`#ebkStummel`, `#fpStummel`, `#madStummel`, `#kehleStummel`, `#lukStummel`
und `#kamStummel`).

### 100.2 Mehrere Einfassungen je Massaufnahme

Das war die einzige echte fachliche Lücke: auf einem Dach steht selten nur
ein Rohr. Jede Einfassung hat jetzt eine eigene Bezeichnung, eigene Masse
(Durchmesser, Dachneigung, a, b, c) und eine **Stückzahl**.

Gerechnet wird je Einfassung mit der unveränderten Fachrechnung; die
Eindeckungsart und der Lattenabstand gelten für die ganze Aufnahme, weil sie
zum Dach gehören und nicht zum einzelnen Rohr.

Vorbelegt ist die Vorgabe aus js/21 (Ø110, 30°) – unverändertes Verhalten,
das alte Formular war ebenso vorbelegt. Der wirklich leere Zustand ist
deshalb ein **leerer Durchmesser**, nicht eine leere Liste; der Prüfstand
prüft ihn genau so.

### 100.3 Neu gegenüber v2.95

- **Stückliste** je Einfassung mit Zuschnitt `Länge × Breite`
  (Gesamtbreite × Abwicklung, v2.81-Standard) und Bleilappen.
- **Zuschnitt aus Rollenblech** über die gemeinsamen Bausteine:
  `zuschnittHtml()` / `zuDruckHtml()` aus js/33, gepackt mit
  `ebaPackeInStreifen()` aus js/29 – es gibt in der App weiterhin genau
  **eine** Packrechnung. Gepackt wird je Abwicklung (jede Rohrgrösse hat
  ihre eigene Streifenbreite), wie beim Freien Profil und bei der Lukarne.
  Die Rollenbreiten kommen aus `app_settings.blech_rollenbreiten`
  (firmenweit, seit v2.74) mit der Auswahl je Massaufnahme (v2.85) –
  **keine neue Einstellung**.
- **Ausmass und Materialübersicht** ohne zweite Eingabe, ohne
  Artikelnummern und **ohne Preise**, damit spätere Firmen-Materiallisten
  greifen können.
- **Kontrolle** mit Marke am Register (rot bei Fehler): fehlendes Material,
  fehlende Eindeckungsart, fehlender Lattenabstand, fehlende Pflichtmasse
  je Einfassung, negative Werte, Dachneigung ausserhalb 0–90°, Stückzahl
  unter 1, zu schmale Rollen.
- **PDF-Listenauswahl** über js/35 – keine eigene Auswahllogik; neu
  zugeordnet ist nur die Überschrift „Bleilappen“ (→ Stückliste, bereits
  aus v2.90 vorhanden).
- **Fotos und Skizzen am Ende**: `MEAS_MEDIEN_AM_ENDE` um
  `einfassung_rund` erweitert (v2.75-Mechanik unverändert).

### 100.4 Speichern: Superset

js/16 schreibt **unverändert** dieselben zehn Felder wie bisher (`material`,
`deckung`, `lattenabstand`, `durchmesser`, `winkel`, `a`, `b`, `c`,
`abwicklung`, `breiteGesamt`, `anzahlBleilappen` – die flachen Werte der
**ersten** Einfassung) und ergänzt nur `einfassungen`, `zuschnitte`,
`bleilappenGesamt`, `flaeche_m2`, `ausmass` und `rollen`.

Eine vor v2.96 gespeicherte Einfassung öffnet unverändert: `einfaFuellen()`
übernimmt die flachen Felder als **eine** Einfassung und erfindet dabei
nichts – genommen wird genau, was dort steht. Der Druck nimmt die
gespeicherten Werte, ein einmal gedrucktes Blatt bleibt gleich.

### 100.5 Getestet

- **`pruefstaende/pruefstand-einfassung-app-v2-96.js` – 78/78**, echtes
  Chromium gegen die echte `index.html`: Modul und geteilte Bausteine,
  sechs Register (nur eigener Inhalt, Reihenfolge, Marke am
  Kontroll-Register), Grunddaten, echtes Tippen mit Fokusprüfung, mehrere
  Einfassungen mit Stückzahl, von Hand nachgerechnete Zuschnitte
  (Ø110 → 350 × 278, Ø160 → 400 × 308), Bleilappen (aufgerundet, die
  Korrektur aus v2.70), Blechfläche, Rollenblech gegen die **wirklich
  gerufene** gemeinsame Packrechnung, Ausmass, Kontrolle, Speichern und
  Wiederöffnen, Datensatz im Format bis v2.95, Fotos erst nach „Fertig“,
  Druck, fünf Bildschirmbreiten × sechs Register, keine JavaScript-Fehler.
- **XSS gemessen, nicht behauptet.** Die Bezeichnung einer Einfassung ist
  Benutzertext und reist bis in die Zuschnittliste, das Ausmass und den
  Ausdruck. Geprüft wird nicht „es steht `esc()` im Code“, sondern dass aus
  `<img src=x onerror=alert(1)>` an keiner dieser fünf Stellen ein echtes
  Element entsteht und der Text stattdessen sichtbar dasteht. Gegenprobe
  (Bezeichnung ungeschützt eingesetzt): 77/78. Escapt wird durchgehend mit
  der zentralen `esc()` aus js/03 – auch in js/33 und im Druckzweig.
- **Sechs Gegenproben**, jede baut einen echten Fehler ein und wirft den
  Prüfstand um; keine bricht ihn ab:

  | Gegenprobe | Ergebnis |
  |---|---|
  | eigene Rechnung statt `einfBerechnen` | 66/73 |
  | Stückzahl ignoriert | 68/73 |
  | Superset verletzt (alte Felder nicht mehr gespeichert) | 72/73 |
  | alter Datensatz wird nicht übernommen | 71/73 |
  | eigene Packrechnung | 71/73 |
  | Fotos schon während der Register | 72/73 |

- **Die zweite Gegenprobe liess den Prüfstand zuerst abbrechen** statt
  fehlschlagen – ein abgebrochener Lauf sieht aus wie „keine Fehler“. Alle
  Indexzugriffe der Zuschnittprüfung sind jetzt abgesichert; danach beisst
  sie mit 68/73.
- **Die neue Art wurde in die gemeinsamen Prüfstände aufgenommen**:
  `register-zuschnitt` 307/307 (vorher 276), `medien-am-ende` 125/125
  (vorher 113), `lxb-druck` 58/58 (vorher 53), `felder-bleiben` 19/19
  (vorher 17).
- **Volle Regression grün** – alle 17 Prüfstände im Repo (verschnitt 1578,
  register-zuschnitt 307, kehle 158, mauerabdeckung 146, kamin 147,
  medien-am-ende 125, konisch 114, freies-profil 118, rinne 104,
  einlaufblech 99, rollenblech-pdf 95, lukarne 82, einfassung 78,
  lxb-druck 58, dila-sichtbar 57, skizze-foto 54, felder-bleiben 19) und
  die archivierten (kehle52 698, pdf52 526, required70 386, rinne57 379,
  einf70 185, offline70 127, feedback63 108, freipos65 99, fotos70 88,
  dila70 85, breite57 84, fp70 83, kehleintegration52 76,
  feedbackbrowser63 67, breite52 52, einstbrowser68 51, ebg70 49,
  einst68 47, feedback70 47, mad70 45, module67 43, medien50 42,
  pfade55 39, adresse45 39, dateien49 38, projekte47 37, status46 35,
  freiposbrowser65 33, auswahl48 32, modulebrowser67 16, suche45 13,
  kopf45 8, hidden51 7, abstand69 2, normbrute 1578 sowie dateien43, nav,
  recent41, stand42, suche40, treffer40, ui39 ohne Fehlschlag).
- **Drei überholte Erwartungen** angepasst, keine davon ein Codefehler:
  * `required70` kannte die Pflichtfelder noch als `einf_durchmesser`/
    `einf_a`/`einf_c`. Sie heissen jetzt `einfa_durchmesser_0` usw. und
    entstehen erst beim Zeichnen von Register 2 – dieselbe Verschiebung
    wie bei Kehle (v2.83) und Lukarne (v2.87). 386/386.
  * `fotos70` führte `einfassung_rund` noch unter den Arten mit sofort
    sichtbarem Fotobereich. Dabei fiel eine **Zählprüfung** auf
    („genau 13 Zweige nutzen die gemeinsame Funktion“) – eine feste Zahl
    als Behelf für eine Eigenschaft. Sie prüft jetzt die Eigenschaft
    selbst (jeder `return {...base,`-Zweig muss `measMedienAusFormular()`
    nutzen), braucht keine Pflege mehr und meldet einen vergessenen Zweig,
    was die Zahl nicht tat. Gegenprobe: 85/88. Jetzt 88/88.
  * Die **Archivkopie** `rinneapp71.js` ist eine veraltete Fassung von
    v2.71 (kennt die Register nicht und nicht die `<details>` aus v2.85).
    Sie schlägt **schon gegen den v2.95-Stand** mit denselben drei Zeilen
    fehl – nachgemessen, nicht angenommen. Abgelöst durch die gepflegte
    Fassung `pruefstaende/pruefstand-rinne-app-v2-71.js` (104/104); die
    Kopie wurde aus dem Archivlauf genommen, statt sie weiter falschen
    Alarm geben zu lassen.
  * Unverändert kein Fehlschlag, sondern der geprüfte Fall selbst:
    `ui39` druckt in seinem eigenen Fehlerfall-Test die Zeile
    „Fehler: permission denied“ (bekannt seit Abschnitt 80.4).
- **Regierapport nachweislich unverändert**: unter `media:print` mit
  ausgelöstem `beforeprint` unmittelbar nacheinander gegen den v2.95-Stand
  gerendert – **DOM byteidentisch** (5468 Bytes), bestätigt durch einen
  dritten Lauf desselben Codes. `js/06-rapport.js`,
  `js/08-katalog-blitzschutz.js` und `css/03-druck.css` sind nicht im Diff.
- `node --check` über alle 39 `js/*.js`, `sw.js` und alle Prüfstände:
  fehlerfrei; `<div>`-Verschachtelung in `index.html` ausgeglichen
  (Tiefe 0); keine doppelten Element-IDs; jede js-Datei in `index.html`
  **und** in der Service-Worker-Liste; Version in `index.html` und `sw.js`
  gleich.
- **Kein Datenbankzugriff** in dieser Runde – weder lesend noch schreibend.

### 100.6 Merksatz: der Druck-DOM enthält die Uhrzeit

Beim Regierapport-Vergleich wichen zwei Läufe **desselben** Codes im
DOM-Hash voneinander ab. Nachgemessen: der Druck-Fusszeilentext enthält das
Druckdatum **mit Uhrzeit** (`05.09.2026, 12:57`). Zwei Läufe über eine
Minutengrenze hinweg unterscheiden sich deshalb naturgemäss – das ist kein
Codeunterschied.

**Der Vergleich ist nur aussagekräftig, wenn beide Stände unmittelbar
nacheinander im selben Aufruf gerendert werden** (so wurde er in allen
bisherigen Abschnitten auch geführt). Ein Lauf über die Minutengrenze
erzeugt sonst einen falschen Alarm.

### 100.7 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `js/38-einfassung-aufnahme.js` | **neu** – sechs Register, mehrere Einfassungen, Stückliste, Zuschnitt, Ausmass, Kontrolle |
| `index.html` | Registerfläche `#einfassungAufnahme`, `#einfStummel`, Script-Tag, Version 2.96 |
| `js/16-massaufnahme-formular.js` | Modul zeichnen, Payload-Superset, Pflichtprüfung, Medien am Ende, Druckzweig um Stückliste/Zuschnitt/Ausmass erweitert |
| `js/10-massaufnahme.js` | **2 Zeilen**: Zurücksetzen und Füllen |
| `sw.js` | Cache-Version 2.96, neue Datei im SHELL |
| `pruefstaende/pruefstand-einfassung-app-v2-96.js` | **neu** |
| vier gemeinsame Prüfstände | Einfassung Rund aufgenommen |
| `required70`, `fotos70` (Archiv) | überholte Erwartungen, siehe 100.5 |

**Nicht angefasst**: `js/21-einfassung-rund.js` (die Fachdatei),
`js/06-rapport.js`, `js/08-katalog-blitzschutz.js`, `css/03-druck.css`
(Regierapport) sowie `js/11`–`js/20` und `js/22`–`js/37` – per `git diff`
bestätigt. Keine Berechnung, keine Stückliste, kein Zuschnitt, keine
Abwicklung und keine Packrechnung einer bestehenden Art berührt.

### 100.8 Offene Punkte

- **Kein Live-Klicktest gegen Supabase** – die Sandbox blockiert ausgehende
  HTTPS-Verbindungen zu `nfgryuzkpwjfmdlmevuy.supabase.co`, wie in jeder
  vorherigen Sitzung. **Das wird ausdrücklich nicht als getestet
  behauptet.** Geprüft ist die Oberfläche in echtem Chromium gegen die
  echte `index.html`.
- Der **Umschlag** und das **seitliche Mass** kommen weiterhin aus den
  Firmeneinstellungen und gelten für alle Einfassungen einer Aufnahme –
  unverändert aus js/21, dort steckt die Gesamtbreite-Formel
  (`D + 2·Umschlag + 2·seitliches Mass`).
- Verschnitt weiterhin **ohne Schnittfuge** und ohne Wiederverwendung von
  Reststücken; bei vielen Einfassungen heisst das Ergebnis „beste gefundene
  Verteilung“.
- Kein Detail-Diff der Einfassungsliste im Änderungsverlauf (wie bei allen
  Array-Strukturen, Klasse C aus Abschnitt 42.2).
- Damit haben **neun** der zwölf Massaufnahme-Arten Register; ohne sind
  weiterhin Skizze/Foto, Ort-/Seitenbleche und die Rinne-Zuschnittliste.
