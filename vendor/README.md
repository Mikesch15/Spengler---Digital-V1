# vendor/

Fremde Bibliotheken, die **fest im Projekt liegen** statt zur Laufzeit von
einem CDN geholt zu werden.

## Warum fest hier und nicht per CDN?

Die App hat keinen Build-Schritt; eine Bibliothek muss also als fertige Datei
vorliegen. Drei Gruende gegen das CDN:

1. **Offline.** Der Service Worker liefert die App-Shell auch ohne Verbindung
   aus. Eine Datei von einem fremden Host kann er nicht zuverlaessig cachen -
   eine Offerte liesse sich dann auf dem Dach nicht erzeugen.
2. **Keine fremde Abhaengigkeit zur Laufzeit.** Faellt das CDN aus oder
   aendert eine Version stillschweigend ihr Verhalten, waere das ein Fehler
   in der Produktion, den niemand ausgeloest hat.
3. **Die Pruefstaende fangen `cdn.jsdelivr.net` ab** (dort wird der
   Supabase-Client durch einen Stub ersetzt). Eine zweite Bibliothek vom
   selben Host wuerde dabei mit abgefangen.

## Inhalt

| Datei | Version | Lizenz | Wofuer |
| --- | --- | --- | --- |
| `jspdf.umd.min.js` | jsPDF 4.2.1 | MIT (`jspdf-LICENSE.txt`) | erzeugt das PDF der selbst erstellten Offerte (js/79) |

Aktualisiert wird eine Bibliothek von Hand: neue Datei hierher kopieren,
Version in dieser Tabelle nachfuehren, Pruefstaende laufen lassen. Dateien
hier werden **nicht** veraendert - Anpassungen gehoeren in den eigenen Code.

## supabase.umd.min.js (v3.205)

`@supabase/supabase-js` 2.117.2, MIT (siehe `supabase-LICENSE.txt`).
Bis v3.204 kam die Datei von `cdn.jsdelivr.net`. Das war die riskanteste
Fremdabhängigkeit der App: **ohne sie startet die App überhaupt nicht**, und
der Service Worker kann fremde Adressen gar nicht aufheben – `sw.js` gibt
alles, was nicht aus dem eigenen Haus kommt, unverändert ans Netz weiter.
Ob die App ohne Verbindung hochkam, hing damit allein am
Browser-Zwischenspeicher, also am Zufall. Jetzt liegt sie in der App-Shell.

Die Fassung ist zugleich **festgenagelt**: die CDN-Adresse lautete `@2`, also
„was auch immer dort gerade als 2.x liegt". Eine Produktiv-App, die ihre
Datenbankbibliothek stillschweigend wechselt, ist nicht prüfbar.

## xlsx.full.min.js (v3.205)

SheetJS `xlsx` 0.18.5, Apache-2.0 (siehe `xlsx-LICENSE.txt`).
Hing bis v3.204 ebenfalls im Kopf von `index.html`: 880 kB, die bei **jedem
Start** geladen und ausgeführt wurden, bevor das erste Bild kam – für zwei
Funktionen, die man selten und nie auf dem Dach braucht (Feedback-Export,
Katalog-Import). Sie wird jetzt mit `xlsxLaden()` (js/01) nachgeladen, wenn
sie gebraucht wird.

**Absichtlich nicht in der App-Shell**: sonst bezahlte jede Installation die
880 kB wieder, nur vorher. Der Service Worker hebt sie beim ersten Gebrauch
von selbst auf – ab dann geht der Export auch ohne Verbindung. Vorher ging
er ohne Verbindung überhaupt nie.

## Damit gilt für die ganze App

Zur Laufzeit wird **kein fremder Server** mehr angefragt – ausser Supabase
selbst (die eigene Datenbank). `pruefstand-fremdserver-v3-205.js` hält das
fest.
