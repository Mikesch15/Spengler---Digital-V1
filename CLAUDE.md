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
- sichtbare App-Version: **2.16**
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
