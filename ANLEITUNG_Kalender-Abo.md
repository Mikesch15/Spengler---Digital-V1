# Kalender-Abo (v3.385) – was du tun musst

Ziel: Dein Firmen-Outlook-Kalender erscheint in Spengler-DIGITAL (nur lesen), ohne Admin-Zustimmung, ohne Google, ohne eigene Domain.

## 1. Kalender in Outlook veröffentlichen (am Computer)
1. Mit dem **Firmenkonto** auf outlook.office.com (oder outlook.office365.com) anmelden.
2. Zahnrad → **Kalender → Freigegebene Kalender**.
3. Unter **Kalender veröffentlichen**: Kalender «Kalender» wählen, Berechtigung **Alle Details anzeigen**, **Veröffentlichen**.
4. Den **ICS-Link** kopieren (nicht den HTML-Link). Er ist wie ein Passwort – nicht weitergeben.
   - Falls das Veröffentlichen fehlt, hat der IT-Anbieter es gesperrt. Dann geht dieser Weg nicht.

## 2. In der App einfügen
Mehr → **Termine** → ganz unten **Arbeitskalender per Link abonnieren** → Link einfügen → **Kalender abonnieren**.
Die Termine erscheinen mit 🔒. Danach läuft der Abgleich alle 15 Minuten von selbst.

## 3. Einmalig für den Betreiber (Bereitstellung, nur wenn noch nicht geschehen)
- Edge Function `kalender-abo` bereitstellen (Dateien: `index.ts`, `abo.js`, `ics.js`) – verify_jwt aus.
- Migration `v3385_kalender_abo.sql` ausführen.
- Geplanten Aufruf anlegen (Statement am Ende der Migration, als Kommentar).
- `outlook-sync` neu bereitstellen (Export-Sperre für abonnierte Termine in `core.js`).

## Grenzen
- Nur Outlook → App. Nichts geht zurück. Pro Person ein Abo.
- Verzögerung: so lange, wie der Anbieter den veröffentlichten Kalender nachführt (oft 15 Minuten bis einige Stunden).
- Link neu veröffentlicht? Dann in der App den neuen Link einfügen.
