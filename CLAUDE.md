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
- sichtbare App-Version: **2.22**
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
