"use strict";
// ===========================================================================
// "Was ist neu" - kurzer, rein informativer Hinweis beim ersten Login nach
// einem App-Update. Keine Rueckwirkung auf Daten oder Berechnung, komplett
// lokal (localStorage je Geraet, wie dfaSettings/kamSettings).
//
// WIN_CHANGELOG ist eine handverlesene KURZFASSUNG fuer Anwender - nicht der
// volle CHANGELOG_HISTORIE.md-Text (der ist fuer Entwickler gedacht). Bei
// jeder fachlichen Aenderung, die den Versionsstand erhoeht (CLAUDE.md-Regel),
// hier ein bis drei Stichpunkte fuer die neue Version ergaenzen.
// ===========================================================================
const WIN_LETZTE_VERSION="sd_letzteGesehenVersion";
const WIN_CHANGELOG={
 "3.86":["Neues App-Icon.",
  "Zuschnitt: unterschiedliche Blechbreiten können jetzt im selben Rollenabschnitt gemischt werden – spart Verschnitt.",
  "Kamineinfassung: Mass A und D können links/rechts getrennt erfasst werden."],
 "3.87":["Dachfenstereinfassung: Mass A und D können links/rechts getrennt erfasst werden."],
 "3.88":["Kamin- und Dachfenstereinfassung: alle Masse sind durchgehend von A an durchnummeriert, mit aufklappbarer Übersicht samt Beispielskizze."],
 "3.89":["Dachfenstereinfassung: Mass D wird jetzt vom Wandfuss nach oben gemessen, wie am Bau üblich.",
  "Sieben Masse umbenannt, u. a. „Winkel auf Fensterrahmen“ statt „Umschlag vorne“."],
 "3.90":["Dachfenstereinfassung: das überflüssige Mass „Umschlag hinten“ wurde entfernt."],
 "3.91":["Neu: automatische Fortschrittsanzeige „Register X von Y“ in allen Massaufnahme-Registern.",
  "Neu: dieser „Was ist neu“-Hinweis nach einem App-Update."],
 "3.92":["Kamin- und Dachfenstereinfassung: Massbezeichnungen an mehreren Stellen vereinheitlicht, kleinere Formulierungs-Unschärfen dabei behoben."],
 "3.93":["Einfassung rund und Lukarne: aufklappbare Übersicht mit Beispielskizze für alle Masse, wie bei Kamin- und Dachfenstereinfassung."],
 "3.94":["Neu: Register, die schon einmal ausgefüllt wurden, zeigen jetzt einen Haken.",
  "Neu: neue Massaufnahme nach Steildach/Flachdach/Allgemein gruppiert auswählen.",
  "Neu: Projektliste lässt sich jetzt auch nach Massaufnahme-Art filtern.",
  "Kamin- und Dachfenstereinfassung: Massbezeichnungen in den Firmen-Einstellungen und der Hilfe kommen jetzt aus derselben Quelle wie überall sonst.",
  "Regierapport: die hinterlegte Funktion eines Mitarbeiters wird jetzt auch beim nachträglichen Wechsel in der Zeile automatisch übernommen."],
 "3.95":["Regierapport: die Mitarbeiter-Auswahl in der Tabelle zeigt jetzt den vollen Namen statt nur des Kürzels - im gedruckten Rapport steht weiterhin nur das Kürzel.",
  "Regierapport: die Spalten Datum, MA und Funktion in der Tabelle sind breiter, damit der Inhalt vollständig lesbar ist."],
 "3.96":["Systemadministration: Feedback lässt sich jetzt auch für fremde Firmen löschen.",
  "Fehler behoben: verwaiste Dateien im Speicher liessen sich nicht endgültig löschen."],
 "3.97":["Regierapport: das Datumsfeld in der Material-Tabelle ist jetzt breiter und richtig beschriftet."],
 "3.98":["Neu: Lagerverwaltung (Phase 1) - Bestand je Artikel aus dem Materialbestand, geführt über einzelne Buchungen (Zugang/Abgang/Korrektur) statt einer Zahl zum Überschreiben. Sichtbar nur für eigens freigeschaltete Mitarbeitende (Einstellungen → Mitarbeiter → Lager-Zugriff)."],
 "3.99":["Neu: der Betreiber wird jetzt täglich automatisch per E-Mail benachrichtigt, wenn verwaiste Dateien im Speicher gefunden werden - es wird dabei nichts automatisch gelöscht.",
  "Fehler behoben: eine Offerten-PDF oder ein Offerten-Foto konnte fälschlich als „verwaist” gemeldet werden, obwohl sie noch von einer Offerte verwendet wird."],
 "3.100":["Neu: digitale Unterschrift im Regierapport - Auftraggeber und ausführender Mitarbeiter können direkt auf dem Gerät unterschreiben, die Unterschrift erscheint dann im Ausdruck anstelle der leeren Linie.",
  "Ohne digitale Unterschrift bleibt der Ausdruck unverändert - die Linie zum Unterschreiben von Hand steht weiterhin da."],
 "3.101":["Fehler behoben: die Unterschriften-Erfassung wurde im Ausdruck fälschlich doppelt mitgedruckt.",
  "Fehler behoben: der Buchen-Dialog in der Lagerverwaltung öffnete sich hinter den Einstellungen.",
  "Neu: Lagerverwaltung ist jetzt direkt von der Startseite aus erreichbar (mit Lager-Zugriff)."],
 "3.102":["Neu: Material lässt sich in der Lagerverwaltung jetzt per Kamera ein- und ausscannen - ein hinterlegter Barcode öffnet direkt den Buchen-Dialog mit der richtigen Richtung.",
  "Neu: ein Barcode lässt sich im Material-Katalog (Einstellungen → Material) ebenfalls per Kamera hinterlegen.",
  "Die Lagerverwaltung führt jetzt denselben Material-Katalog wie der Regierapport (Schrauben, Dichtband usw.) - der Blech-Materialbestand ist davon unabhängig und bleibt unverändert."],
 "3.103":["Neu: beim Anlegen einer neuen Firma wird das Startpasswort automatisch erzeugt und dem Admin per E-Mail zugeschickt.",
  "Neu: beim Anlegen eines Mitarbeiters lässt sich optional eine E-Mail hinterlegen - sie wird zur zusätzlichen Anmelde-Adresse und die Zugangsdaten werden zugeschickt.",
  "Neu: „Passwort vergessen“ auf dem Anmeldebildschirm - ein Link per E-Mail führt zum Setzen eines neuen Passworts (nur bei hinterlegter E-Mail).",
  "Neu: Systemadministration kann Einladungslinks erzeugen, mit denen jemand selbst eine neue Firma anlegt."],
 "3.104":["Lagerverwaltung: die Artikelliste ist jetzt klappbar - jede Zeile zeigt zunächst nur Bezeichnung und Bestand, ein Klick zeigt die letzten Buchungen.",
  "Fehler behoben: die Kamera beim Barcode-Scan stellte auf manchen Geräten nicht scharf."],
 "3.105":["Fehler behoben: beim Erzeugen eines Einladungslinks fehlte auf manchen Geräten jede Rückmeldung - der Erfolg/Fehler steht jetzt direkt im Formular statt in einer Meldung, die dort stumm blieb.",
  "Neu: Lagerverwaltung - „Alle zuklappen” blendet die komplette Artikelliste auf einen Schlag aus.",
  "Kamera-Fokus beim Barcode-Scan weiter verbessert."],
 "3.106":["Neu: Lagerverwaltung - eine Materialposition kann jetzt mehrere, einzeln buchbare Produkte enthalten (z. B. verschiedene Rohrbogen-Varianten unter derselben Position).",
  "Neu: ein unbekannter Barcode beim Einscannen bietet direkt an, daraus ein neues Produkt anzulegen und einer Materialposition zuzuordnen.",
  "Der Barcode eines Artikels wird jetzt beim einzelnen Produkt in der Lagerverwaltung hinterlegt, nicht mehr im Material-Katalog."],
 "3.107":["Neu: beim Barcode-Scan lässt sich die Kamera per Antippen des Bilds neu fokussieren - hilft, wenn sie bei kurzer Distanz nicht von selbst scharfstellt."],
 "3.108":["Barcode-Scan: das Antippen zum Fokussieren wurde verstärkt - stellt die Kamera dabei immer noch nicht scharf, wird jetzt zusätzlich ein neues Kamerabild angefordert, was auf mehr Geräten wirkt."],
 "3.109":["Barcode-Scan: das Antippen zum Fokussieren nimmt jetzt zusätzlich ein Einzelfoto auf und sucht direkt darin nach dem Code - nutzt denselben Aufnahmeweg wie die normale Kamera-App, nicht nur den Video-Autofokus."],
 "3.110":["Fehler behoben: beim Barcode-Scan konnte das Kamerabild nach dem Antippen zum Fokussieren komplett schwarz bleiben - die dafür verantwortliche Änderung wurde zurückgenommen."],
 "3.111":["Barcode-Scan: das Antippen zum Fokussieren nimmt wieder zusätzlich ein Einzelfoto auf und sucht direkt darin nach dem Code - diesmal ohne den Kamera-Neustart, der zuvor zum schwarzen Bild führte."],
 "3.112":["Fehler behoben: die Einzelfoto-Aufnahme beim Antippen zum Fokussieren konnte das Kamerabild ebenfalls schwarz werden lassen - wurde wieder entfernt. Das Antippen bleibt vorerst ohne sichtbare Wirkung bei sehr kurzer Distanz."],
 "3.113":["Barcode-Scan: der Fokus-Mechanismus wurde neu aufgebaut - die Kamera-Vorschau wird jetzt vollständig angehalten, bevor ein Einzelfoto aufgenommen wird, und danach für die Weitersuche neu gestartet. Das soll das zuvor gemeldete schwarze Bild vermeiden."],
 "3.114":["Neu: Barcode-Scan - ein Code lässt sich jetzt auch von Hand eingeben, wenn die Kamera ihn partout nicht lesen kann.",
  "Barcode-Scan: die Kamera bekommt vor dem Einzelfoto mehr Zeit zum Scharfstellen."],
 "3.115":["Neu: Barcode-Scan - ein Knopf 'Andere Kamera-App verwenden' öffnet bei Bedarf die echte Kamera-App des Geräts statt der Web-Vorschau, was auf manchen Geräten deutlich schärfer fokussiert."],
 "3.116":["Fehler behoben: Barcode-Scan per Einzelfoto (Tippen zum Fokussieren und 'Andere Kamera-App verwenden') erkannte Codes bisher gar nicht, unabhängig von der Bildschärfe - ein Programmierfehler in der Bildauswertung ist jetzt korrigiert."],
 "3.117":["Fehler behoben: Barcode-Scan per Einzelfoto zeigte immer dieselbe Meldung 'Foto konnte nicht ausgewertet werden', auch wenn einfach kein Code im Bild war - die Meldung unterscheidet jetzt korrekt zwischen beiden Fällen und die Auswertung bleibt nicht mehr unbegrenzt lange hängen."],
 "3.118":["Neu: Lagerverwaltung - im Formular 'Neues Produkt erfassen' lässt sich die Materialposition jetzt per Suchfeld filtern, statt die ganze Liste durchscrollen zu müssen."],
 "3.119":["Barcode-Scan: die Kamera-App des Geräts öffnet sich jetzt sofort automatisch beim Einscannen/Ausscannen - kein zusätzlicher Klick auf 'Andere Kamera-App verwenden' mehr nötig."],
 "3.120":["Neu: Material einer Massaufnahme lässt sich mit dem Knopf '📤 Ab Lager ausbuchen' direkt als Abgang im Lager buchen. Das passiert nie von selbst - im Dialog sind Zeilen, Produkt und Menge vorher frei anpassbar, und wurde für dieselbe Massaufnahme schon ausgebucht, steht eine Warnung da."],
 "3.121":["Ab Lager ausbuchen: jetzt stehen auch die Halbfabrikate der Massaufnahme zur Wahl - bei einer Dachrinne also Rinnenböden, Stutzen, Rinnenhalter, Winkel und Dehnungsstücke. Das Blech selbst bleibt wie bisher aussen vor.",
  "Da ein Halbfabrikat keine EDV-Nr. trägt, wählen Sie die Materialposition dort selbst - mit Suchfeld. Die App schlägt eine vor, wählt sie aber nur bei einem eindeutigen Treffer."],
 "3.122":["Fotos: überall zwei getrennte Knöpfe statt einem - '📷 Foto aufnehmen' öffnet direkt die Kamera, '🖼️ Aus Galerie wählen' die Galerie (dort weiterhin mehrere Fotos auf einmal). Gilt in Massaufnahme, Ausmass, Offerte und Regierapport.",
  "Vorher entschied das Gerät selbst, was ein Antippen öffnet - je nach Modell kam nur die Kamera oder nur die Galerie."],
 "3.123":["Lagerverwaltung: beim Buchen wird jetzt das Objekt/Projekt verlangt. 'Werkstatt / Lager' ist dabei eine ausdrückliche Wahl - so fällt keine Buchung stillschweigend aus der Auswertung.",
  "Neu im Projekt: die Karte 'Material ab Lager' zeigt je Produkt, was für dieses Projekt verbraucht wurde, und lässt sich als Materialzusammenfassung drucken.",
  "Wird direkt aus einer Massaufnahme ausgebucht, ordnet die App das Projekt automatisch zu - dort wird nicht gefragt."],
 "3.124":["Lagerverwaltung: neues Suchfeld über der Liste. Gesucht wird in EDV-Nr., Bezeichnung, Dimension, Produktname UND Barcode - bei über 370 Positionen ist Scrollen kein Bedienweg mehr.",
  "Neu: Produkte, die gar nicht in der Regiematerialliste stehen, lassen sich jetzt erfassen. Im Dialog 'Neues Produkt' gibt es dazu 'Neue Materialposition anlegen' - die EDV-Nr. schlägt die App aus einem eigenen Nummernkreis vor (999.01, 999.02 …) und bleibt änderbar."],
 "3.125":["Ab Lager ausbuchen: die Materialposition eines Halbfabrikats wird jetzt direkt beim Tippen gefunden. Die Treffer stehen sofort als Liste da und werden angetippt - vorher musste man nach der Eingabe noch das Auswahlfeld aufklappen."],
 "3.126":["Neue Materialposition: die EDV-Nr. wird jetzt aus der PASSENDEN Katalogruppe vorgeschlagen. Ein neuer Rinnenboden bekommt die nächste freie Nummer bei 203 (Rinnenzubehör), eine Holzschraube bei 826 - mit Begründung darunter. Passen mehrere Gruppen gleich gut, legt die App sie als Knöpfe nebeneinander statt zu raten.",
  "Auch im Dialog 'Neues Produkt' erscheinen die Treffer zur Materialposition jetzt sofort beim Tippen - dort stand noch das alte Auswahlfeld."],
 "3.127":["Lagerverwaltung: Produkte lassen sich jetzt entfernen. Ohne Buchung wird wirklich gelöscht; sobald gebucht wurde, wird ARCHIVIERT - das Produkt verschwindet aus allen Listen, die Buchungen bleiben als Beleg stehen und '📦 Archiv anzeigen' holt es jederzeit zurück. War es das letzte Produkt seiner Position, lässt sich auf Nachfrage auch die Katalogposition entfernen.",
  "Der Knopf '＋ Neues Produkt' steht jetzt oben in der Lagerverwaltung. Die Hilfe hatte ihn schon genannt, es gab ihn aber nur innerhalb einer aufgeklappten Position.",
  "Sicherheit: die Firmengrenze auf der Produkt-Tabelle hat seit v3.106 nicht richtig gebunden (die beiden Schranken waren oder- statt und-verknüpft). Das ist behoben - Produkte sind jetzt so abgesichert wie die Buchungen."],
 "3.128":["Im Dialog 'Neues Produkt erfassen' steht das Suchfeld für die Materialposition jetzt IMMER da - auch dann, wenn die Position schon vorbelegt ist. Bisher verschwand es genau dann, und wer den Dialog über '＋ Weiteres Produkt zu dieser Position' öffnete, bekam es nie zu sehen. Tippen öffnet die Treffer, ein Klick wechselt die Position.",
  "Dasselbe im Ausbuchen-Dialog der Massaufnahme: auch dort bleibt das Suchfeld nach der Wahl stehen, statt nur einen '✏️ Position ändern'-Knopf zu hinterlassen."],
 "3.129":["Ausmass → Offerte erfassen: die fett gedruckten Titel aus der Offerte bilden jetzt klappbare Blöcke, genau wie in der Offerte selbst. Sie starten zugeklappt – bei einer langen Offerte steht so sofort ein Überblick da statt einer endlosen Liste.",
  "Im Titel steht, wie viele Positionen des Blocks schon fertig sind (z. B. '3/8 fertig'). So sieht man auch zugeklappt, wo noch Arbeit liegt. Positionen ohne Titel stehen weiterhin einfach in der Liste."],
 "3.130":["Einstellungen → Mitarbeiter: jedem Mitarbeiter lässt sich jetzt nachträglich eine E-Mail-Adresse zuordnen – auch einem, der schon lange angelegt ist. Die Person meldet sich danach zusätzlich mit dieser Adresse an (der Benutzername gilt unverändert weiter) und kann ein vergessenes Passwort selbst zurücksetzen.",
  "Das Eintragen ändert kein Passwort und verschickt keine Nachricht. Jede Adresse kann nur zu EINEM Konto gehören; eine schon vergebene lehnt die App mit einer verständlichen Meldung ab. Leer lassen entfernt die Adresse wieder."],
 "3.131":["Lagerverwaltung, Buchen-Dialog (auch nach einem Ein- oder Ausscannen): die Projektsuche beim Feld 'Objekt / Projekt' zeigt die Treffer jetzt SOFORT beim Tippen. Bisher stand dort ein Auswahlfeld, das seine gefilterte Liste erst beim Aufklappen zeigte - die Suche wirkte dadurch wie kaputt. 'Werkstatt / Lager' steht immer zuoberst.",
  "Damit ist die letzte Stelle dieser Bauart behoben; alle drei Suchfelder der Lagerverwaltung arbeiten jetzt gleich."],
 "3.132":["Mauerabdeckung: eine Gesamtbreite von 0 mm wird jetzt als Fehler gemeldet. Bisher nahm die App sie stillschweigend an und rechnete aus Saum und Umschlägen eine Abwicklung, die brauchbar aussah, aber zu einer Mauerabdeckung ohne Mauer gehörte.",
  "Dachfenstereinfassung: beim Material aus älteren, gespeicherten Aufnahmen werden die Bleilappen wieder mitgezählt. Bei dieser einen Art fehlten sie, weil sie als einzige nicht im Rückfall für alte Datensätze stand.",
  "Ansonsten Wartungsarbeit ohne sichtbare Änderung: die Prüfstände der App wurden auf den heutigen Stand gebracht (siehe Abschlussbericht)."]
};

function winVersionVergleich(a,b){
 const pa=String(a).split(".").map(Number),pb=String(b).split(".").map(Number);
 for(let i=0;i<Math.max(pa.length,pb.length);i++){
  const x=pa[i]||0,y=pb[i]||0;
  if(x!==y)return x-y;
 }
 return 0;
}

function winAktuelleVersion(){
 const el=$("appVersion");
 if(!el)return "";
 const m=/([0-9]+\.[0-9]+)/.exec(el.textContent);
 return m?m[1]:"";
}

// Wird nach dem Login aufgerufen (js/03-login.js, afterLogin()). Zeigt die
// Kurzfassung aller WIN_CHANGELOG-Versionen zwischen der zuletzt gesehenen
// und der aktuellen Version - beim allerersten Start (noch nichts gemerkt)
// wird nichts angezeigt, nur die aktuelle Version gemerkt, damit eine neue
// Installation nicht durch die gesamte Versionsgeschichte gefuehrt wird.
function winPruefen(){
 const aktuell=winAktuelleVersion();
 if(!aktuell)return;
 let gesehen;
 try{gesehen=localStorage.getItem(WIN_LETZTE_VERSION)}catch(e){gesehen=null}
 if(gesehen===null){
  try{localStorage.setItem(WIN_LETZTE_VERSION,aktuell)}catch(e){}
  return;
 }
 if(gesehen===aktuell)return;
 const versionen=Object.keys(WIN_CHANGELOG)
  .filter(v=>winVersionVergleich(v,gesehen)>0&&winVersionVergleich(v,aktuell)<=0)
  .sort(winVersionVergleich);
 try{localStorage.setItem(WIN_LETZTE_VERSION,aktuell)}catch(e){}
 if(versionen.length)winAnzeigen(versionen);
}

function winAnzeigen(versionen){
 const body=$("wasIstNeuBody");
 if(!body||!$("wasIstNeuModal"))return;
 body.innerHTML=versionen.map(v=>`<div style="margin-bottom:10px">
<div style="font-weight:800;color:var(--blue-dark)">Version ${esc(v)}</div>
<ul style="margin:4px 0 0 18px;padding:0">${WIN_CHANGELOG[v].map(z=>`<li>${esc(z)}</li>`).join("")}</ul>
</div>`).join("");
 $("wasIstNeuModal").hidden=false;
}

(function winBinden(){
 if(!$("wasIstNeuFertig"))return;
 $("wasIstNeuFertig").onclick=()=>{$("wasIstNeuModal").hidden=true};
})();
