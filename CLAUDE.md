# Spengler-DIGITAL – Claude Development Guide

## Projekt

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

---

## AKTUELLER ENTWICKLUNGSSTAND

Immer zuerst den aktuellen Stand des GitHub-Repositories `main`
prüfen.

Der aktuelle Code ist die verbindliche Grundlage.

Alte Abschlussberichte und frühere Versionen dürfen NICHT
als aktueller Programmstand behandelt werden.

---

## WICHTIGE REGEL

Vor jeder Entwicklungsaufgabe:

1. Aktuellen `main`-Stand prüfen.
2. Betroffene Dateien lesen.
3. Bestehende Architektur verstehen.
4. Bestehende Funktionen erhalten.
5. Nur notwendige Änderungen durchführen.
6. Nach der Änderung prüfen, ob bestehende Funktionen weiterhin
   funktionieren.

Keine komplette Neuentwicklung eines bereits funktionierenden
Moduls, wenn eine gezielte Änderung möglich ist.

---

## ARCHITEKTUR

Frontend:

- `index.html`
- `js/`
- `css/`
- `sw.js`
- `manifest.json`

Die JavaScript-Dateien sind modular aufgebaut.

Bestehende Module sollen grundsätzlich erweitert werden,
anstatt unnötig parallel neue Systeme aufzubauen.

---

## SUPABASE

Backend und Datenhaltung verwenden Supabase.

Dazu gehören unter anderem:

- PostgreSQL
- Storage
- Row Level Security
- Edge Functions

Bei Änderungen an Datenbank, Storage oder Edge Functions
immer den bestehenden Stand berücksichtigen.

Keine bestehenden Tabellen, Policies oder Funktionen
ohne Prüfung ersetzen.

---

## PROJEKTE

Projekte bilden die zentrale Struktur der Anwendung.

Funktionen wie:

- Regierapport
- Massaufnahme
- Ausmass
- Offerte

sollen soweit vorgesehen einem Projekt zugeordnet sein.

---

## ENTWICKLUNGSREGELN

- Keine unnötigen Breaking Changes.
- Keine bestehenden Funktionen entfernen, ohne dies ausdrücklich
  zu begründen.
- Keine doppelten Datenmodelle erzeugen.
- Bestehende IDs und Beziehungen beachten.
- Bestehende Supabase-RLS berücksichtigen.
- Bestehende Offline-Funktionen beachten.
- Service Worker bei neuen Frontend-Dateien berücksichtigen.
- Nach Änderungen Versionsstand und Cache beachten.

---

## OFFERTEN

Offerten sind Teil des Projekt-Workflows.

Bestehende Offerten-Funktionen zuerst prüfen, bevor neue
Import- oder Erkennungslogik erstellt wird.

PDF-Import und Foto-Import sollen nach Möglichkeit dieselbe
Positionsstruktur verwenden.

---

## LEISTUNGEN

Das Leistungen-Modul ist Bestandteil der aktuellen Architektur.

Bestehende Leistungen-Logik nicht durch eine parallele
Alternative ersetzen.

---

## HISTORISCHE DATEIEN

Dateien wie:

- `Abschlussbericht_*`
- alte Prototypen
- alte Versionen
- alte Experimente

sind historische Informationen.

Sie sind nicht automatisch Teil des aktuellen
Entwicklungsstands.

Bei Bedarf können sie gezielt untersucht werden.

---

## ARBEITSWEISE

Bei jeder Aufgabe zuerst kurz feststellen:

- Welche Dateien sind betroffen?
- Wie funktioniert die bestehende Lösung?
- Was muss wirklich geändert werden?
- Welche Abhängigkeiten gibt es?

Danach möglichst kleine, kontrollierte Änderungen durchführen.

Keine unnötigen Grossumbauten.

---

## WICHTIG

Wenn eine Aufgabe mehrere mögliche Lösungen hat:

Zuerst diejenige wählen, die am wenigsten bestehende
Funktionalität gefährdet und sich am besten in die bestehende
Architektur einfügt.

Bei Unsicherheit nicht einfach alte Funktionalität ersetzen.