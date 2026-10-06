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
  Bundler), modular als einzelne Dateien unter `js/`. Änderungen an
  `js/` wirken direkt; es gibt keine Stufe, die Fehler vorab abfängt –
  deshalb die Prüfstände.
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
- Neue Frontend-Dateien in die App-Shell-Liste in `sw.js` UND in
  `index.html` eintragen – sonst werden sie offline nicht ausgeliefert.
- Jede auf `main` gepushte fachliche Änderung erhöht den
  Versionsstand (in `index.html`/`sw.js` sowie in
  `PROJECT_STATE.md`) und beachtet den Cache (Service Worker,
  App-Shell-Liste).
- Keine bestehenden Tabellen, Policies oder Funktionen ohne
  Prüfung ersetzen.
- Committete Änderungen werden immer direkt auf `main` gepusht,
  ausser der Anwender nennt ausdrücklich einen anderen Branch oder
  verlangt einen Pull Request.
- Veröffentlicht wird nach einer **Schnellprüfung**, nicht nach der
  vollen Regression: der neue bzw. betroffene Prüfstand samt
  Gegenproben, die Prüfstände der betroffenen Module, dazu
  `hilfe` und `versionen` – zusammen rund eine Minute. Danach sofort
  auf `main`. Die volle Regression läuft **hinterher** (hier und
  automatisch in GitHub Actions). Ansage des Anwenders: 30 Minuten
  warten, bis eine fertige Funktion benutzbar ist, ist ein schlechter
  Tausch. Wird die Regression hinterher rot: sofort beheben und
  nachschieben, oder – wenn das nicht in wenigen Minuten geht – `main`
  auf den letzten grünen Stand zurücksetzen und es sagen.
  **Das gilt ausnahmslos, auch am gemeinsamen Kern.** Ansage des Anwenders
  am 5.10.2026: „Du sollst immer auf main veröffentlichen." Ich hatte hier
  zuvor eine Ausnahme eingebaut (volle Regression VOR dem Veröffentlichen
  bei Kerndateien) – die ist gestrichen. Warten ist nicht die Antwort auf
  ein Risiko; die Antwort ist: **nach** dem Push sofort die volle Regression
  und bei Rot sofort beheben oder zurücksetzen.
  Was bleibt: bei einer Änderung am **gemeinsamen Kern** – `js/01`, `js/05`,
  `js/16`, `js/20` (die Massbausteine aller Zeichnungen), `js/29`, `js/45`,
  `js/70`, `index.html`, `css/05`, App-Shell in `sw.js` – wird die
  Schnellprüfung **breiter** gewählt, nicht nach Namen zusammengesucht.
  Begründung aus echten Fällen: v3.252 und v3.258 änderten je `js/70` und
  rissen je fünf Prüfstände mit, v3.261 änderte `js/20` und riss die
  Vermassung aller zwölf Arten. Beide Male hiessen die übersehenen
  Prüfstände anders als die Änderung – ein Name ist keine Abhängigkeit.
  Bei `js/20`/`js/62` gehört `vermassung` dazu, bei `js/45`/`js/70` die
  Aufgaben- und Startseiten-Prüfstände.
- **Eine abgebrochene Regression zählt als ungeprüft veröffentlicht.** Die
  volle Regression nach dem Push ist nur dann ein Schutz, wenn sie zu Ende
  läuft UND ihr Ergebnis angeschaut wird. Kommt währenddessen die nächste
  Aufgabe: die Regression zuerst fertig laufen lassen, sonst ist der Stand
  auf `main` ungeprüft – und das gehört dann gesagt. Am 6.10.2026 habe ich
  sie für die nächste Frage abgebrochen; v3.262 war in GitHub rot, und
  gemerkt habe ich es erst zwei Versionen später beim Deploy-Nachschauen.
  Wieder grün wurde sie durch spätere Änderungen – das war Glück, nicht
  Absicht.
- **„Veröffentlicht" heisst ausgeliefert, nicht gepusht.** Nach jedem Push
  prüfen, ob GitHub Pages den Stand auch wirklich ausgeliefert hat:
  `gh api repos/Mikesch15/Spengler---Digital-V1/actions/runs?per_page=5` –
  der Lauf „pages build and deployment" für den eigenen Commit muss
  `success` sein. Ist er `failure`/`cancelled`:
  `gh api -X POST repos/.../actions/runs/<id>/rerun-failed-jobs`.
  Am 5.10.2026 liefen v3.260 und v3.261 beide ins Leere: die Jobs bekamen
  keinen Runner und wurden nach exakt 15 Minuten abgebrochen, der Build
  selbst dauert 24 Sekunden. Der Anwender sass derweil auf v3.259, während
  ich zweimal „ist online" gemeldet hatte. Erst melden, wenn der Deploy
  grün ist – und dass die Live-Seite aus dieser Sandbox nicht erreichbar
  ist, heisst: der Deploy-Status ist der einzige Beleg, den ich habe, und
  ein Blick auf die Seite selbst darf nicht behauptet werden.
- **Jede Antwort endet mit einem Statusblock**, immer gleich aufgebaut,
  immer zuunterst – Ansage des Anwenders: "Ich weiss manchmal nicht wann
  du fertig bist und wann nicht."

  ```
  ── Stand ──
  ✅ Fertig: <was jetzt benutzbar/online ist – oder "nichts">
  ⏳ Läuft: <was noch läuft, + ob ich mich melde – oder "nichts">
  ❓ Von dir: <worauf ich warte – oder "nichts">
  ```

  Alle drei Zeilen kommen immer, auch wenn eine "nichts" lautet. Steht bei
  "Läuft" und "Von dir" nichts, ist die Arbeit fertig und ich tue nichts
  mehr, bis der Anwender schreibt. Keine Prosa im Block, keine Details –
  die stehen darüber.
- **So tokensparend wie möglich arbeiten** – Ansage des Anwenders. Das
  kostet nichts an Sorgfalt, es verbietet nur Verschwendung:
  - **Nie eine grosse Datei ganz lesen.** `index.html` sind ~55 000 Token,
    `js/41` ~42 000, `js/70` ~30 000. Mit `grep -n` die Stelle suchen und
    mit `sed -n 'a,bp'` nur sie lesen.
  - **Nicht erneut lesen, was schon im Kontext steht**, und nach einer
    Änderung nicht zur Kontrolle nachlesen – `Edit` meldet Fehlschläge
    selbst.
  - **Ausgaben kurz halten**: Prüfstände über `grep -c "FEHLGESCHLAGEN:"`
    statt vollem Protokoll, `ci-lauf.js` über `tail`.
  - **Wiederkehrende Rituale als Skript**, nicht als jedes Mal neu
    getippter Code – der Versionswechsel läuft über
    `node werkzeug-version.js <alt> <neu>`.
  - **Messen statt vermuten** bleibt die Ausnahme, die sich immer lohnt:
    eine Abfrage an die echten Daten ist billiger als eine falsch gebaute
    Funktion.
  - `PROJECT_STATE.md` hält nur den aktuellen Stand, die **letzten drei
    Versionen** und die dauerhaften Regeln. Ältere Versionen wandern nach
    `CHANGELOG_HISTORIE.md`. Gemessen am 5.10.2026 war die Datei auf
    67 000 Zeichen (~17 000 Token) gewachsen und wuchs um ~2 000 Zeichen je
    Version; sie wird bei fast jeder Aufgabe gelesen.
- Diese Anleitung (`CLAUDE.md`) so knapp wie möglich halten. Sie
  wird bei jeder Session automatisch in den Kontext geladen und
  kostet dadurch bei jeder Aufgabe Tokens – neue Versions-Details,
  Abschlussberichte, Fehlerbehebungs-Protokolle und Verlauf gehören
  in `PROJECT_STATE.md` bzw. `CHANGELOG_HISTORIE.md`, nicht in
  diese Datei. Nicht wieder zu einem grossen, langsamen
  Tokenfresser anwachsen lassen.

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

---

## 8. Aktueller Stand

Der laufend aktuelle Entwicklungsstand (Branch, Version,
Workflow-Details) steht in **`PROJECT_STATE.md`** und wird dort
gepflegt, nicht hier. Diese Datei (`CLAUDE.md`) beschreibt nur
dauerhafte Regeln und Architektur und wird nicht mit jeder Version
erweitert.

Das ist bewusst so aufgeteilt und keine Formsache: `CLAUDE.md` lädt
bei jeder Session automatisch in den Kontext und kostet dadurch bei
jeder einzelnen Aufgabe Tokens, egal wie klein die Aufgabe ist.
Deshalb bleibt diese Datei dauerhaft schlank; ausführliche
Fehlerbehebungs-Protokolle, Versions-Changelogs und
Abschlussberichte gehören nach `CHANGELOG_HISTORIE.md` bzw. in
eigene `Abschlussbericht_*`-Dateien. `CLAUDE.md` soll nie wieder zu
einem riesigen Tokenfresser anwachsen.
