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

Aktueller Hauptstand:
- Branch: `main`
- sichtbare App-Version: **2.13**
- aktuelle Struktur ist bereits modularisiert.
- Nicht davon ausgehen, dass ältere Refactor-Branches neuer sind.

Die aktuelle `main`-Version enthält unter anderem:
- Supabase-Anbindung
- Login
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

Bestehende Funktionen dürfen bei Änderungen nicht einfach entfernt oder durch vereinfachte Platzhalter ersetzt werden.

## 3. MASSAUFNAHME – vollständige aktuelle Funktionsliste

Die **Massaufnahme besteht aktuell aus NEUN Funktionen**:

1. **Skizze / Foto**
2. **Einlaufblech gerade**
3. **Rinne Halbrund**
4. **Einlaufblech konisch**
5. **Freies Profil**
6. **Mauerabdeckung**
7. **Lukarne Seitenverkleidung**
8. **Ort- und Seitenbleche**
9. **Einfassung Rund**

Diese neun Funktionen müssen bei Refactorings, Tests, Berechtigungen, PDF-Ausgabe, Speichern/Laden und zukünftiger Weiterentwicklung berücksichtigt werden.

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

Insbesondere bei Massaufnahmen immer prüfen, ob alle neun Funktionen noch funktionieren:

- Skizze/Foto
- Einlaufblech gerade
- Rinne Halbrund
- Einlaufblech konisch
- Freies Profil
- Mauerabdeckung
- Lukarne Seitenverkleidung
- Ort- und Seitenbleche
- Einfassung Rund

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

- Echte objektgenaue Storage-**RLS**-Trennung für Fotos/Skizzen/
  Projektdateien fehlt noch – der Pfad trägt jetzt zwar Projekt-/
  Massaufnahme-Bezug (20.5), aber die Policy prüft weiterhin nur
  "eingeloggtes Mitglied irgendeiner Firma", nicht ob genau dieses
  Projekt zur eigenen Firma gehört. Für eine spätere Runde: Policy auf
  `storage.foldername(name)` (des Objekts selbst, nicht von
  `projects.name` – siehe der oben behobene Bug) und einen Join auf
  `projects.company_id` umstellen.
- Firmenlogo/Ausmass-Foto liegen weiterhin unter dem alten, flachen
  Pfadschema ohne Projekt-/Firmenbezug (Firmenlogo ist auch fachlich kein
  Projektdatum). Signierte URLs funktionieren dafür bereits.
- Keine Firmenverwaltung im Frontend (Firma anlegen/wechseln) – für
  Phase 1 nicht vorgesehen.

### 20.8 Bekannte Altlasten

- `permission_settings` bewusst ohne `company_id` (gemeinsame
  Rollen-Standardwerte) – falls jede Firma eigene Standardrechte braucht,
  ist das eine spätere, bewusste Migration, kein Bug.
- Trigger-Funktion `enforce_permission_override_company()` ist laut
  Supabase-Security-Advisor direkt per RPC aufrufbar (`anon` und
  `authenticated`). Vermutlich harmlos (reiner `BEFORE INSERT/UPDATE`-
  Trigger), aber nicht geprüft/aufgeräumt.
- Leaked-Password-Protection ist in Supabase Auth deaktiviert – generelle
  Auth-Härtung, unabhängig vom Multi-Tenant-Thema.

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

### 21.1 Ablauf

Login-Bildschirm → Knopf "🏢 Neue Firma registrieren" → Formular
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

Nach erfolgreicher Registrierung meldet der Client sich mit der gerade
eingegebenen E-Mail/Passwort-Kombination selbst an
(`signInWithPassword`). Klappt das aus irgendeinem Grund nicht (Konto
steht trotzdem), wird stattdessen verständlich zum normalen Login
weitergeleitet.

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
- **Kein automatisches Sperren oder Löschen.** Ein abgelaufener Trial
  (`trial_ends_at` in der Vergangenheit) bleibt unverändert nutzbar und
  gespeichert – es gibt in dieser Phase keinerlei Code, der
  `subscription_status`/Zugriff anhand von `trial_ends_at` prüft oder
  einschränkt. Das ist bewusst so; automatische Sperrung ist eine
  spätere, eigene Aufgabe.
- Vollständige Firmenlöschung kommt später als geschützte
  System-Admin-Funktion. Die Tabelle `system_admins` und die Funktion
  `is_system_admin()` existieren in Supabase bereits (leer/ungenutzt),
  es gibt aber noch keine Oberfläche und keinen Aufruf dafür im Client.

### 21.5 Was diese Phase NICHT enthält

- Keine automatische Trial-Sperrung/-Löschung (siehe 21.4).
- Keine System-Admin-Oberfläche.
- Keine Mitarbeiter-Einladungen (Mitarbeiter legt weiterhin nur ein
  Admin in den Einstellungen an, unverändert seit Abschnitt 20).
- Kein Zahlungsanbieter, keine Abos/Rechnungen.
- Keine eigene Domain – weiterhin unter der bestehenden GitHub-Pages-
  Adresse.
