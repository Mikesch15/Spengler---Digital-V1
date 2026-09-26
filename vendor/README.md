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
