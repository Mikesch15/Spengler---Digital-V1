# Spengler-DIGITAL – Claude Development Guide

Diese Datei enthält nur dauerhaft gültige Projektregeln.
Für den aktuellen Entwicklungsstand (Version, Branch, Workflow)
siehe **`PROJECT_STATE.md`** – das ist die verbindliche
Zustandsquelle, nicht diese Datei.

---

## 1. Projektziel

Spengler-DIGITAL ist eine Web-App für einen Spenglerbetrieb.

Die Anwendung unterstützt unter anderem:

- Projekte
- Regierapporte
- Massaufnahmen
- Ausmass
- Offerten
- Leistungen
- Material
- Zuschnitt
- weitere Spengler-spezifische Funktionen

Immer zuerst den aktuellen Stand des GitHub-Repositories `main`
prüfen. Der aktuelle Code ist die verbindliche Grundlage. Alte
Abschlussberichte, Prototypen und frühere Versionen dürfen NICHT
als aktueller Programmstand behandelt werden.

---

## 2. Aktuelle Architektur

Frontend:

- `index.html` – Einstiegspunkt
- `js/` – modulare, fachlich gegliederte JavaScript-Dateien
- `css/` – Styles
- `sw.js` – Service Worker (Offline-Cache, App-Shell)
- `manifest.json` – PWA-Manifest

Backend:

- Supabase (PostgreSQL, Auth, Storage, Row Level Security,
  Edge Functions)

Projekte bilden die zentrale Struktur der Anwendung. Funktionen
wie Regierapport, Massaufnahme, Ausmass und Offerte sind, soweit
vorgesehen, einem Projekt zugeordnet.

Die JavaScript-Dateien sind modular aufgebaut. Bestehende Module
sollen grundsätzlich erweitert werden, anstatt unnötig parallel
neue Systeme aufzubauen.

Das Offerten-Modul und das Leistungen-Modul sind fester
Bestandteil der Architektur. Bestehende Offerten- und
Leistungen-Logik nicht durch eine parallele Alternative ersetzen.
PDF-Import und Foto-Import bei Offerten sollen nach Möglichkeit
dieselbe Positionsstruktur verwenden.

---

## 3. Tech-Stack

- Vanilla JavaScript (kein Build-Schritt, kein Framework, kein
  Bundler), modular als einzelne Dateien unter `js/`.
- HTML/CSS ohne Präprozessor.
- Service Worker für Offline-Fähigkeit und App-Cache.
- Supabase als Backend-as-a-Service:
  - PostgreSQL als Datenbank
  - Supabase Auth für Login/Rechte
  - Supabase Storage für Fotos, Skizzen, PDFs
  - Row Level Security (RLS) als zentrale Zugriffskontrolle
  - Edge Functions (Deno/TypeScript) für serverseitige Logik,
    u. a. `extract-offer-positions`, `extract-profile-shape`,
    `system-admin-storage-aufraeumen`
  - KI-gestützte Positions-/Formerkennung über ein LLM (aus den
    Edge Functions heraus aufgerufen)

---

## 4. Zentrale Projekt-/Massaufnahme-Struktur

Zentraler fachlicher Ablauf:

```text
PROJEKT
→ OFFERTE
→ MASSAUFNAHME
→ BERECHNUNG
→ MATERIAL & ZUSCHNITT
→ ZUSCHNITT
→ STÜCK ABHAKEN
→ WERKSTATT / RÜSTLISTE
→ RÜSTEN / MONTIEREN
→ AUSMASS
```

Eine Massaufnahme gehört zu genau einer der aktuell unterstützten
Massaufnahme-Arten:

- Skizze / Foto
- Einlaufblech gerade
- Rinne halbrund
- Einlaufblech konisch
- Freies Profil
- Mauerabdeckung
- Lukarne
- Anschlussblech
- Einfassung rund
- Kamineinfassung
- Dachfenstereinfassung
- Kehle
- Rinne (Profil)

Jede Art hat ihr eigenes Fachmodul unter `js/`, wird aber über das
zentrale Massaufnahme-Formular (`js/16-massaufnahme-formular.js`)
verbunden. Gemeinsame Daten (Fotos/Skizzen, Regierapport-Material,
Materialstärke, Zuschnittform) werden zentral verarbeitet, nicht
je Art dupliziert. Alte, bereits gespeicherte Massaufnahmen müssen
weiterhin geöffnet werden können, auch wenn sich Formulare oder
Datenfelder weiterentwickeln.

---

## 5. Aktueller Security-/RLS-Stand

- Zugriffskontrolle erfolgt primär über Row Level Security auf
  den PostgreSQL-Tabellen, nicht über Anwendungslogik im Frontend.
- Daten sind grundsätzlich nach Firma (Mandant) getrennt; Policies
  prüfen die Zugehörigkeit zur Firma des angemeldeten Nutzers
  (`auth.uid()`-basiert) statt globaler Freigaben.
- `SECURITY DEFINER`-Funktionen/Trigger werden nur eingesetzt, wenn
  es fachlich zwingend nötig ist, und so geschrieben, dass sie RLS
  nicht faktisch umgehen (z. B. weiterhin auf eine normale,
  RLS-geprüfte Tabelle wirken statt Prüfungen zu ersetzen).
- Edge Functions sind der kontrollierte serverseitige Zugang für
  Vorgänge, die nicht direkt im Client laufen sollen (z. B.
  KI-Positionserkennung, Storage-Aufräumarbeiten). Timeouts und
  Fehlerfälle dort sind bewusst gesetzt und nicht ohne Grund zu
  verändern.
- Storage-Zugriffe (Fotos, Skizzen, PDFs, Anleitungen) unterliegen
  ebenfalls Policies; bestehende Policies nicht ohne Prüfung des
  aktuellen Stands ersetzen.
- Bei jeder Änderung an Datenbank, Storage oder Edge Functions
  immer zuerst den bestehenden Stand (Tabellen, Policies,
  Funktionen) prüfen, bevor etwas ersetzt oder migriert wird.

---

## 6. Verbindliche Entwicklungsregeln

Vor jeder Entwicklungsaufgabe:

1. Aktuellen `main`-Stand prüfen.
2. Betroffene Dateien lesen.
3. Bestehende Architektur verstehen.
4. Bestehende Funktionen erhalten.
5. Nur notwendige Änderungen durchführen.
6. Nach der Änderung prüfen, ob bestehende Funktionen weiterhin
   funktionieren.

Weitere Regeln:

- Keine komplette Neuentwicklung eines bereits funktionierenden
  Moduls, wenn eine gezielte Änderung möglich ist.
- Keine unnötigen Breaking Changes.
- Keine bestehenden Funktionen entfernen, ohne dies ausdrücklich
  zu begründen.
- Keine doppelten Datenmodelle erzeugen.
- Bestehende IDs und Beziehungen beachten.
- Bestehende Supabase-RLS berücksichtigen.
- Bestehende Offline-Funktionen beachten.
- Service Worker bei neuen Frontend-Dateien berücksichtigen.
- Nach Änderungen Versionsstand und Cache beachten.
- Keine bestehenden Tabellen, Policies oder Funktionen ohne
  Prüfung ersetzen.

Bei jeder Aufgabe zuerst kurz feststellen: Welche Dateien sind
betroffen? Wie funktioniert die bestehende Lösung? Was muss
wirklich geändert werden? Welche Abhängigkeiten gibt es? Danach
möglichst kleine, kontrollierte Änderungen durchführen – keine
unnötigen Grossumbauten.

Wenn eine Aufgabe mehrere mögliche Lösungen hat: zuerst diejenige
wählen, die am wenigsten bestehende Funktionalität gefährdet und
sich am besten in die bestehende Architektur einfügt. Bei
Unsicherheit nicht einfach alte Funktionalität ersetzen.

---

## 7. Aktuelle wichtige Einschränkungen

- Dateien wie `Abschlussbericht_*`, alte Prototypen, alte
  Versionen und alte Experimente sind historische Informationen.
  Sie sind nicht automatisch Teil des aktuellen
  Entwicklungsstands, können bei Bedarf aber gezielt untersucht
  werden (siehe `CHANGELOG_HISTORIE.md` für die vollständige
  Versionshistorie bis v3.44).
- Ausgehende HTTPS-Verbindungen zu Supabase/dem LLM-Anbieter sind
  aus der Entwicklungs-Sandbox heraus i. d. R. nicht möglich –
  Live-Tests gegen Produktion sind entsprechend nicht ohne
  Weiteres durchführbar und dürfen nicht als durchgeführt
  behauptet werden, wenn sie es nicht wurden.
- `sw.js` enthält die JavaScript-App-Shell-Liste; neue
  Frontend-Dateien müssen dort ergänzt werden, sonst werden sie
  offline nicht ausgeliefert.
- Kein Build-Schritt vorhanden: Änderungen an `js/`-Dateien wirken
  direkt, es gibt keine Kompilier- oder Bundling-Stufe, die Fehler
  vorab abfängt.

---

## 8. Aktueller Stand

Der laufend aktuelle Entwicklungsstand (Branch, Version,
Workflow-Details) steht in **`PROJECT_STATE.md`** und wird dort
gepflegt, nicht hier. Diese Datei (`CLAUDE.md`) beschreibt nur
dauerhafte Regeln und Architektur und wird nicht mit jeder Version
erweitert.
