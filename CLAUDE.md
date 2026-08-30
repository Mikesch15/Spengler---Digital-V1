# Spengler Digital – Claude Code Instructions

## Projekt
Spengler Digital ist eine Web-App für einen Spenglerbetrieb.

Der aktuelle Code im Repository ist maßgeblich. Project Knowledge enthält zusätzliche Architektur-, Entscheidungs- und Projektinformationen.

## Grundregeln

- Bestehende funktionierende Funktionen nicht ohne Prüfung verändern oder entfernen.
- Vor jeder Änderung zuerst den relevanten bestehenden Code lesen.
- Abhängigkeiten und Aufrufer prüfen.
- Kleine, gezielte Änderungen bevorzugen.
- Keine komplette Datei unnötig neu schreiben.
- Keine Produktionsdaten löschen oder verändern, wenn es nicht erforderlich ist.
- Bei Fehlern zuerst die tatsächliche Ursache ermitteln.
- Keine Workarounds bauen, wenn die eigentliche Ursache behoben werden kann.
- Niemals behaupten, etwas getestet oder geändert zu haben, wenn es nicht tatsächlich durchgeführt wurde.
- Bei Unsicherheit den vorhandenen Code prüfen statt Annahmen zu treffen.

## Git

- `main` ist der stabile Produktionsstand.
- Größere Änderungen zuerst auf einem separaten Branch durchführen.
- Aktueller Entwicklungsbranch: `refactor/safe-split-v1-49`.
- Keine Änderungen direkt an `main`, sofern dies nicht ausdrücklich verlangt wird.
- Vor einem Commit den Diff prüfen.
- Keine unnötigen Dateien oder Änderungen committen.

## Architektur

Die ursprüngliche Anwendung war weitgehend eine große `index.html` und wird schrittweise modularisiert.

Aktuelle Zielstruktur:

```text
index.html
css/
js/
supabase/
