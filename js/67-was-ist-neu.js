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
  "Ansonsten Wartungsarbeit ohne sichtbare Änderung: die Prüfstände der App wurden auf den heutigen Stand gebracht (siehe Abschlussbericht)."],
 "3.133":["Regierapport drucken: die EDV-Nr. des Materials steht jetzt auch auf dem Papier. Die Spalte war im Ausdruck die ganze Zeit vorhanden – mit Überschrift und eigener Breite – aber leer, weil die Nummer in einem Suchfeld steht und im Druck jede Suche ausgeblendet wurde.",
  "Die Suchfelder über der Seite (Projektsuche, Materialsuche) bleiben im Ausdruck weiterhin weg, ebenso die Vorschlagsliste unter dem EDV-Feld."],
 "3.134":["Einstellungen → Material (und Blitzschutz-Material): der Excel-Import gleicht die Datei jetzt mit dem bestehenden Katalog ab, statt alles blind anzulegen. Eine Nummer, die es schon gibt, wird aktualisiert – bisher scheiterte der ganze Import daran oder erzeugte eine zweite Zeile.",
  "Vor dem Speichern steht da, was passiert: wie viele Positionen neu sind, wie viele geändert werden (mit altem und neuem Wert je Feld) und wie viele unverändert bleiben. Geschrieben wird nur, was sich wirklich ändert.",
  "Gelöscht wird nie: Positionen, die in der Datei fehlen, bleiben stehen. Und ein Feld, für das die Datei keine Spalte hat, behält seinen Wert, statt geleert zu werden. Dieselbe Nummer zweimal in einer Datei bricht den Import ab, bevor irgendetwas geschrieben wird."],
 "3.135":["Einstellungen → Material (und Blitzschutz-Material): über dem Excel-Import steht jetzt „Wie muss die Excel-Datei aufgebaut sein?\" – aufklappbar, und zwar BEVOR man die Datei auswählt. Darin steht jede Spalte, ob sie Pflicht ist und wie ihre Überschrift heissen darf. Bisher stand das erst im Vorschaufenster, also erst nach der Dateiwahl.",
  "Der Hinweis wird aus den Feldern des Imports selbst erzeugt. Kommt später eine Spalte dazu, steht sie automatisch auch im Hinweis – er kann nicht veralten.",
  "Steht in einer Preisspalte Text statt einer Zahl (z. B. „Fr. 7.90\"), sagt die Vorschau das jetzt. Bisher wurde daraus stillschweigend 0.00 – und das fiel erst auf, wenn jemand den Preis brauchte. Eine echte Null („0.00\" oder „-\") gilt weiterhin als gewollt."],
 "3.136":["Lagerverwaltung, neues Produkt (auch nach einem Scan): sobald die Bezeichnung getippt ist, stehen die passenden Materialpositionen ganz oben in der Trefferliste – ohne zusätzlichen Klick. Ein Tipp übernimmt sie.",
  "Passt genau eine Position deutlich am besten, steht „✓ Vorschlag der App\" daneben. Passen mehrere ähnlich gut, sagt die App das ausdrücklich statt sich festzulegen. Passt nichts, behauptet sie nichts. Vorgewählt wird nie etwas – ein Tippfehler soll keinen Bestand auf die falsche Position buchen.",
  "Der ganze Katalog bleibt darunter erreichbar, und wer selbst sucht, hat Vorrang: während getippt wird, tritt der Vorschlag zurück."],
 "3.137":["Einstellungen → Material: „＋ Material hinzufügen\" brach ab dem zweiten Klick mit einer Datenbankmeldung ab („duplicate key value violates unique constraint\"). Der Knopf trug die EDV-Nr. als festen Text ein – beim zweiten Mal war sie schon vergeben.",
  "Die Nummer wird jetzt berechnet, mit derselben Funktion wie in der Lagerverwaltung: die nächste freie Nummer im eigenen Kreis (999.xx), die Sie danach überschreiben können. Sollte eine Nummer im selben Augenblick von jemand anderem belegt werden, rechnet die App neu und meldet erst dann – in verständlichen Worten statt mit dem rohen Datenbanktext."],
 "3.138":["Neues Material anlegen geht jetzt überall gleich: „＋ Material hinzufügen\" in den Einstellungen öffnet denselben Dialog wie „Neue Materialposition anlegen\" in der Lagerverwaltung – mit Bezeichnung, Dimension, Einheit, Preis und dem begründeten Nummernvorschlag. Bisher legte der Knopf stumm eine leere Zeile an, die man danach in der Liste ausfüllen musste.",
  "Ein Schalter oben im Dialog entscheidet, ob zur Katalogposition gleich ein Lager-Produkt (mit Barcode) entsteht. Aus der Lagerverwaltung ist er gesetzt, aus dem Katalog nicht – umstellen lässt er sich jederzeit, man kann also nicht im falschen Dialog landen.",
  "Aus der Lagerverwaltung bleibt der Ablauf unverändert."],
 "3.139":["Wird zusammen mit der Materialposition gleich ein Lager-Produkt angelegt, gibt es die Bezeichnung nur noch EINMAL. Bisher standen zwei Felder da – eines fürs Produkt, eines für die Position – und dasselbe musste zweimal getippt werden.",
  "Die EDV-Nr. hängt an dieser Bezeichnung: „Rinnenstutzen 120mm\" bekommt eine Nummer aus der Rinnen-Gruppe 203, „Spenglerschrauben 5x50\" eine aus 826 – mit der Begründung daneben („✓ Gruppe 203 – dort steht bereits ‚Rinnenstutzen 100mm'\"). Passt nichts, gibt es eine Nummer aus dem eigenen Lager-Kreis 999. Das rechnet sich bei jedem getippten Zeichen neu, solange Sie die Nummer nicht selbst anfassen."],
 "3.140":["Neues Material anlegen ist nicht mehr versteckt. In der Lagerverwaltung steht „＋ Neues Material / Produkt\" jetzt als erster, blauer Knopf der Leiste – damit brauchen Sie die Einstellungen dafür gar nicht mehr zu öffnen.",
  "In den Einstellungen steht der Anlege-Knopf jetzt ÜBER der Liste statt darunter. Bisher sass er hinter bis zu 20 Materialzeilen und den Blätter-Knöpfen – zu finden nur, wenn man ohnehin bis ans Ende scrollte.",
  "Und jeder Knopf sagt jetzt, was er anlegt: „＋ Neue Materialposition\" (Regierapport), „＋ Material für Massaufnahmen\", „＋ Neuer Blitzschutz-Artikel\", „＋ Blech erfassen (Rolle / Tafel)\". Vorher hiessen drei davon wortgleich „＋ Material hinzufügen\"."],
 "3.141":["Im Anlege-Dialog steht jetzt „Gewählt: …\" vor der Materialposition, und der Knopf daneben heisst „↩ andere wählen\" statt „✏️ ändern\". „Ändern\" klang nach „diese Position bearbeiten\" – gemeint war immer „eine andere wählen\".",
  "Zur Erinnerung, weil danach gefragt wurde: „➕ Neue Materialposition anlegen …\" ist der letzte Eintrag der Trefferliste und die Alternative zu den Positionen darüber – passt keine, legen Sie eine neue an. Der Knopf daneben ist der Rückweg: er nimmt die getroffene Wahl zurück und öffnet die Liste wieder."],
 "3.142":["Im Projekt gibt es jetzt den Abschnitt „📷 Alle Fotos\": jedes Bild des Objekts an EINEM Ort – aus den Massaufnahmen (Fotos und Skizzen), dem Ausmass, den Regierapporten, den Offerten und den Projektdateien.",
  "Unter jedem Bild steht, woher es stammt – zum Beispiel „📐 Kamineinfassung · Ost · Foto 2/3\" oder „📋 Regierapport · 14.03.2026\". Ein Tipp zeigt das Bild gross.",
  "Es ist eine reine Übersicht: hinzugefügt und gelöscht werden Fotos weiterhin dort, wo sie hingehören. Die Vorschauen werden erst geladen, wenn der Abschnitt aufgeklappt ist."],
 "3.143":["Die EDV-Nr. im Materialkatalog und die Artikel-Nr. beim Blitzschutz sind jetzt JE FIRMA eindeutig. Bisher galten sie firmenübergreifend: sobald eine Firma eine Nummer benutzte, war sie für jede andere Firma für immer gesperrt – obwohl die den fremden Katalog gar nicht sehen kann.",
  "Für Sie heisst das: beim Anlegen einer Materialposition oder beim Excel-Import kann der Fehler „duplicate key … materials_edv_nr_key\" nicht mehr aus dem Nichts auftauchen. Innerhalb Ihrer eigenen Firma bleibt jede Nummer weiterhin nur einmal vergeben – daran ändert sich nichts.",
  "Die Firmengrenze selbst ist unverändert: welche Daten Sie sehen, entscheidet weiterhin allein die Datenbank."],
 "3.144":["Der Abschnitt „📷 Alle Fotos\" hat einen Knopf „🖨️ Fotodokumentation\" bekommen: alle Bilder des Objekts auf Papier oder als PDF – mit Firmenkopf, Projekt und Auftraggeber, und unter jedem Bild wieder die Herkunft.",
  "Gedacht als das Blatt, das der Kunde nach der Sanierung bekommt oder das bei einer Reklamation auf den Tisch kommt. Gedruckt wird genau das, was der Abschnitt zeigt.",
  "Der Druck wartet, bis jedes Bild wirklich geladen ist – sonst blieben auf dem Papier leere Kästen. Bei vielen Fotos dauert das einen Moment; das Fenster sagt so lange, dass es vorbereitet wird."],
 "3.145":["Die Fotodokumentation nutzt das Blatt jetzt richtig aus: vier Bilder auf der ersten A4-Seite (zwei Spalten, zwei Reihen), sechs auf jeder Folgeseite ohne Briefkopf. Vorher bestimmte das Bildformat die Höhe – ein hochkant aufgenommenes Foto riss die Reihe auseinander und es passten oft nur zwei aufs Blatt.",
  "Jede Kachel ist jetzt gleich gross, egal ob hoch, quer oder quadratisch aufgenommen. Abgeschnitten wird nichts: ein Hochformat bekommt seitlich Luft, statt die Reihe zu sprengen."],
 "3.146":["Die Anleitung ist wieder aktuell. Sie stand auf Version 3.44 – die App war 100 Versionen weiter, und das PDF beschrieb eine App, die es so nicht mehr gibt.",
  "Neu beschrieben: die Lagerverwaltung mit Barcode, Material ab Lager buchen, die Unterschriften im Regierapport, „Was ist neu\", die Fotowand und die Fotodokumentation. Korrigiert: es sind dreizehn Massaufnahme-Arten, nicht zwölf – die Dachfenstereinfassung fehlte ganz.",
  "Öffnen lässt sie sich wie bisher über den i-Knopf („📖 Ganze Anleitung\") oder unter Einstellungen → Allgemein → 📖 Anleitung."],
 "3.147":["Der Abschnitt „📷 Alle Fotos\" ist jetzt chronologisch sortiert – das Neueste zuerst. An jedem Bild steht neu auch das Datum seines Eintrags (Massaufnahme, Rapport, Hochladen); wann ein Foto wirklich aufgenommen wurde, weiss die App nicht.",
  "Neu: eine Filterleiste zeigt eine einzelne Herkunft allein an – etwa nur die Rapportfotos. Die Fotodokumentation druckt dann genau diesen Auszug und sagt es auch."],
 "3.148":["Beim Anlegen eines Mitarbeiterkontos lässt sich jetzt gleich eine E-Mail-Adresse angeben. Sie wird zur zusätzlichen Anmeldeadresse, und die Zugangsdaten gehen zusätzlich per E-Mail hinaus. Bisher liess sie sich erst nachtragen – und dann kam keine E-Mail mehr, weil der Versand am Anlegen hängt.",
  "Lagerverwaltung: wird ein Produkt samt neuer Materialposition angelegt, darf die Position jetzt anders heissen als das Produkt („Stahlblech svz\" gegenüber „Stahlblech svz 0,6 × 670 Rolle\"). Voreingestellt bleibt es wie bisher bei einer Bezeichnung für beide."],
 "3.149":["Neu: aus den Positionen einer Offerte lassen sich die Massaufnahmen des Auftrags ableiten. Ein Dialog schlägt zu jeder Position die passende Massaufnahme-Art vor – „Dachrinne halbrund 333mm\" wird zur Dachrinne –, und die angehakten entstehen auf einen Schlag im Projekt: leer, aber mit Titel, Art und dem Bezug zur Offerte.",
  "Was die App nicht einordnen kann, sagt sie und schlägt „Skizze/Foto\" vor; was im Projekt schon unter demselben Titel steht, wird nicht noch einmal angehakt. Für eine einzelne Position gibt es den Knopf 📐 direkt in der Positionszeile."],
 "3.150":["Neu: eine zweite Ansicht, die nach dem Arbeitsablauf gegliedert ist statt nach Modulen – unten eine Leiste mit Heute, Projekte, Werkstatt, Lager und Mehr, und als Startseite die eigenen offenen Aufgaben. Einzuschalten auf der Startseite mit „✨ Neue Ansicht testen“.",
  "Im Projekt zeigt eine Ablaufleiste auf einen Blick, wo es steht: Offerte, Massaufnahme, Freigabe, Rüsten, Montage, Ausmass.",
  "Die klassische Ansicht bleibt vollständig erhalten. Beide arbeiten mit denselben Formularen und denselben Daten – zurück geht es jederzeit unter „Mehr“."],
 "3.151":["Die neue Ansicht ist jetzt die Vorgabe. Wer lieber die gewohnte will, findet sie unverändert unter „Mehr → Zurück zur klassischen Ansicht“ – die Wahl merkt sich jedes Gerät für sich.",
  "Neu: ein Projekt öffnet eine eigene Seite mit sechs Registern – Übersicht, Aufmass, Produktion, Werkstatt, Ausmass und Mehr. Die Produktion zeigt den Zuschnitt-Fortschritt je Massaufnahme und fürs ganze Projekt.",
  "Das Firmenlogo steht wieder auf der Startseite, und die Einstellungen sehen jetzt aus wie die neue Ansicht."],
 "3.152":["Das Massaufnahme-Formular sieht jetzt ebenfalls aus wie die neue Ansicht: grössere Eingabefelder, die sich mit Handschuhen treffen lassen, und eine Schriftgrösse, bei der das Handy beim Hineintippen nicht mehr ins Feld hineinzoomt.",
  "Die Stück- und Zuschnittlisten bleiben absichtlich schmal – dort stehen mehrere Felder in einer Zeile, und grössere Felder würden die Liste unlesbar machen.",
  "An den Massen, der Abwicklung und dem Zuschnitt wurde nichts geändert."],
 "3.153":["Neu in der Werkstatt: der Umschalter „Nach Projekt / Nach Material“. Nach Material zählt alle Zuschnitte einer Materialstärke zusammen – quer über Projekte hinweg. Das ist die Reihenfolge, in der tatsächlich gerichtet wird: einmal zur Rolle, alles davon schneiden, weglegen.",
  "Getrennt wird nach Material UND Stärke – 0,7er und 0,8er Titanzink kommen von verschiedenen Rollen.",
  "Die Materialsicht ist eine Rüstliste; abgehakt wird weiterhin an der Massaufnahme, wo die Stücknummern stehen. Ein Tipp führt hin."],
 "3.154":["Jetzt sehen auch Regierapport, Ausmass, Offerte und Leistung aus wie die neue Ansicht: grössere Eingabefelder für Finger mit Handschuhen, rundere Knöpfe, ruhigere Überschriften.",
  "Der gedruckte Regierapport bleibt davon unberührt – auf Papier und im PDF steht Zeichen für Zeichen dasselbe wie vorher.",
  "Die Felder innerhalb der Arbeits-, Material- und Positionszeilen bleiben absichtlich schmal: dort stehen sechs bis sieben nebeneinander.",
  "Behoben: die Knöpfe „Foto aufnehmen“ und „Aus Galerie wählen“ waren in der neuen Ansicht kleiner geworden statt grösser."],
 "3.155":["Die Anleitung zeigt jetzt die neue Ansicht – also das, was du beim Öffnen der App tatsächlich siehst. Bisher zeigten ihre Bilder die klassische, obwohl seit Version 3.151 niemand mehr mit ihr startet.",
  "Neu abgebildet: die Projektseite mit ihren sechs Registern. Sie war beschrieben, aber nie zu sehen.",
  "Drei Bilder bleiben absichtlich klassisch – Startseite und Aufgabenkarte gibt es nur dort; in der neuen Ansicht sind sie die Seite „Heute“."],
 "3.156":["Werkstatt, Lager, Suche, Einstellungen und alles Weitere bleiben jetzt IM Rahmen der neuen Ansicht: die untere Leiste verschwindet nicht mehr, und oben steht, wo du bist. Bisher legte sich der alte Seitenaufbau darüber.",
  "Das Lager ist ein eigener Bereich, keine Einstellungsseite mehr.",
  "„＋ Neues Projekt“ zeigt nur noch das Formular – nicht noch einmal die Projektliste, von der du gerade kamst. Archiv und Filter haben einen eigenen Knopf.",
  "Der Regierapport steht neben den anderen Registern des Projekts statt unter „Mehr …“.",
  "Felder und Knöpfe sind wieder so gross wie vorher – die Vergrösserung aus 3.152/3.154 ist zurückgenommen.",
  "Behoben: im gedruckten Regierapport standen in zwei Feldern unten rechts zwei kleine Schrägstriche. Das war der Anfasser des Textfelds; auf Papier hat er nichts zu suchen."],
 "3.157":["Im Lager steht jetzt wirklich nur die Lagerverwaltung. Materialbestand und Reststücke sind Firmeneinstellungen und stehen weiterhin unter Einstellungen → Lager.",
  "„Anleitung“ öffnet jetzt die Anleitung. Bisher führte der Eintrag in die Einstellungen – genauso wie „Einstellungen“ direkt darüber.",
  "Die offenen Aufgaben und die Listen der einzelnen Massaufnahmen sind deutlich kompakter: kleinere Karten, kleinere Knöpfe, und der blaue Knopf spannt sich nicht mehr über die ganze Karte.",
  "Das Register „Aufmass“ heisst jetzt „Massaufnahme“."],
 "3.158":["Die Startseite ist neu aufgebaut – nach dem Prototyp: zuoberst, was dringend ist, darunter deine Aufgaben, die Werkstatt in drei Zahlen, die anstehenden Montagen und die offenen Projekte mit ihrem Produktionsstand.",
  "Die Aufgaben sind jetzt Zeilen statt Karten. Ein Tippen öffnet die Massaufnahme; wo es einen eigenen Schritt gibt (rüsten, montieren, zuweisen), steht er als Knopf daneben.",
  "„Werkstatt heute“ rechnet mit denselben Zahlen wie die Werkstatt selbst – nicht mit einer zweiten Rechnung.",
  "Die anstehende Montage zeigt bewusst kein geplantes Datum: einen Montagetermin führt die App nicht. Sie zeigt, seit wann etwas bereitliegt und wer eingeteilt ist."],
 "3.159":["In den Bereichen der neuen Ansicht (Werkstatt, Lager, Projekte, Suche, Cockpit) ist der Knopf „🏠 Start“ verschwunden. Er führte dort an dieselbe Stelle wie „✓ Fertig“ – und trug dabei den falschen Namen. Der Weg nach Hause ist „Heute“ in der Leiste unten.",
  "In den Formularen (Massaufnahme, Ausmass, Offerte, Regierapport) bleibt „🏠 Start“ stehen: dort liegt die Leiste verdeckt unter dem Formular."],
 "3.160":["Neu: ein Feld <b>Wichtige Hinweise</b> beim Projekt (Stammdaten bearbeiten) – „Baustellenzufahrt nur bis 16:00 Uhr“, „Schlüssel beim Hauswart“. Die Notiz steht auf der Startseite ganz oben und auf der Projektseite.",
  "Neu: <b>Montage geplant am</b> im Arbeitsstatus der Massaufnahme. Die Startseite sagt unter „Anstehende Montage“ jetzt „morgen“ oder „in 2 Tagen“ statt nur, seit wann die Teile bereitliegen – und die Zeilen mit Termin stehen zuoberst.",
  "Der Montagetermin ist Planung, kein Arbeitsschritt: er lässt sich jederzeit verschieben und lässt eine Freigabe nicht verfallen.",
  "Ohne eingetragenen Termin wird weiterhin keiner geschätzt."],
 "3.161":["Ein Projekt lässt sich jetzt <b>Mitarbeitern zuteilen</b> – in den Stammdaten, auch an mehrere. Auf der Startseite erscheint es unter „Offene Projekte“ dann nur noch bei diesen Personen.",
  "Über der Liste stehen <b>Meine</b> und <b>Alle</b>. „Meine“ ist die Vorgabe; „Alle“ zeigt wieder den ganzen Betrieb – derselbe Umschalter, den die Werkstatt schon hat.",
  "Das ist eine Anzeige, keine Sperre: über „Projekte“ und die Suche bleibt jedes Projekt für alle erreichbar.",
  "Ist niemand zugeteilt, gilt die Person, die das Projekt angelegt hat. Für bestehende Projekte ändert sich damit zunächst nichts."],
 "3.162":["Die <b>Leiste unten bleibt überall stehen</b> – auch während eine Massaufnahme, ein Ausmass, eine Offerte, eine Leistung oder ein Regierapport offen ist. Bisher verschwand sie dort.",
  "Sind dabei ungespeicherte Eingaben im Formular, fragt die App vor dem Wechsel nach. Bei „Nein“ bleibt alles, wie es war.",
  "„Stammdaten bearbeiten“ zeigt jetzt nur noch die Stammdaten – nicht mehr das ganze Projekt-Cockpit mit allen Bereichen darunter.",
  "Die Knöpfe der Massaufnahme-Auswahl sind deutlich kompakter: Symbol und Text nebeneinander statt untereinander.",
  "Folge davon: „🏠 Start“ verschwindet auch in den Formularen – die Leiste mit „Heute“ liegt jetzt ja darunter."],
 "3.163":["<b>Der letzte Administrator einer Firma kann sich das Recht nicht mehr selbst entziehen.</b> Vorher führte das in eine Sackgasse: ohne Administrator kann niemand mehr Rechte vergeben – auch nicht, um ihn zurückzugeben. Der Haken ist jetzt gesperrt, und die Datenbank weist es zusätzlich ab.",
  "Die Lagerverwaltung steht nicht mehr in den Einstellungen. Sie hat seit 3.157 ihren eigenen Bereich in der Leiste; in den Einstellungen bleiben Materialbestand und Reststücke.",
  "Projekt → „Mehr …“ → „Dateien, Fotos und Verlauf“ zeigt jetzt genau das – und nicht mehr das ganze Projekt-Cockpit."],
 "3.164":["<b>Eine Auftrags-Nr. gibt es je Firma nur noch einmal.</b> Wird eine Nummer eingegeben, die schon vergeben ist – beim Anlegen eines Projekts oder beim Bearbeiten der Stammdaten – meldet die App, zu welchem Projekt sie gehört, und speichert nicht.",
  "Damit entstehen nicht mehr zwei Projekte zur selben Baustelle, auf die sich Massaufnahmen, Rapporte und Ausmasse dann aufteilen.",
  "Verglichen wird ohne Rand-Leerzeichen und ohne Gross-/Kleinschreibung. Archivierte Projekte halten ihre Nummer belegt; andere Firmen haben ihre eigenen Nummernkreise."],
 "3.165":["<b>In der Rapportliste steht jetzt, worum es in jedem Rapport geht.</b> Unter den Kopfdaten: die Arbeitstexte, die Stundensumme und die Anzahl Materialzeilen – in der Projektliste, in der neuen Ansicht und in der Rapport-Übersicht.",
  "Vorher sahen fünf Rapporte zur selben Baustelle alle gleich aus; man musste jeden einzeln öffnen.",
  "Die Zeile wird abgeleitet, nicht getippt: sie gilt rückwirkend für alle bestehenden Rapporte und ändert sich mit, wenn jemand die Arbeitszeilen anpasst. Ist nichts erfasst, bleibt sie weg."],
 "3.166":["<b>Ein Projekt geht jetzt überall auf der Projektseite auf</b> – auch wenn der Klick aus der <b>Werkstatt</b>, aus der Projektliste oder aus der Suche kommt. Vorher klappte dort mitten in der neuen Ansicht das vollständige alte Cockpit auf.",
  "„Bearbeiten“ in der Projektliste zeigt ebenfalls nur noch die Stammdatenfelder statt des ganzen Cockpits.",
  "Ein Suchtreffer auf eine einzelne Massaufnahme, ein Ausmass oder einen Rapport führte vorübergehend noch ins Cockpit – seit 3.167 nicht mehr, siehe unten."],
 "3.167":["<b>Ein Suchtreffer springt jetzt auch auf der Projektseite an die richtige Stelle.</b> Die App schlägt das passende Register auf – Massaufnahme, Ausmass oder Regierapport – und hebt den getroffenen Eintrag kurz hervor.",
  "Damit führt kein Weg aus der Suche mehr ins alte Cockpit.",
  "Gibt es den Eintrag nicht mehr, geht das Projekt trotzdem auf – einfach ohne Hervorhebung. Es wird nichts erfunden und keine Meldung über etwas gezeigt, das man nicht zu verantworten hat."],
 "3.168":["<b>Das Zählwerk: die App lernt aus der eigenen Firmengeschichte.</b> Den Anfang macht die EDV-Nr.-Suche im Regierapport – die Vorschläge sind jetzt nach der eigenen Benutzung geordnet, mit „5× benutzt“ daneben.",
  "Es wird nichts ausgeblendet: dieselben Treffer, dieselbe Obergrenze von fünfzehn, nur eine bessere Reihenfolge. Und es wird keine Zahl gesetzt – Mengen und Preise bleiben unberührt.",
  "Gezählt wird über Rapporte und das Material an den Massaufnahmen, immer nur innerhalb der eigenen Firma. Am Anfang ist das Zählwerk fast still: es fängt an zu helfen, sobald es etwas weiß, und behauptet vorher nichts."],
 "3.169":["<b>Das Zählwerk kennt jetzt auch die Massaufnahme-Art.</b> Beim Material an einer Massaufnahme steht vorne, was bei <b>dieser Art</b> schon erfasst wurde – „7× bei dieser Art“. Ist dazu noch nichts bekannt, zählt wie bisher die Gesamtzahl des Betriebs.",
  "<b>Im Ausmass</b> trägt eine Position, die in früheren Ausmassen fast nie eine Menge bekommen hat, einen Hinweis: „⚠️ in 7 von 8 Ausmassen nicht gebraucht“.",
  "Das ist ein Hinweis, keine Sperre – die Zeile bleibt sichtbar und bedienbar. Und die App sagt erst etwas, wenn dieselbe Position mindestens dreimal vorgekommen ist; aus einem einzigen Ausmass etwas zu folgern wäre geraten."],
 "3.170":["<b>Arbeitstexte im Regierapport werden vorgeschlagen.</b> Beim Tippen in das Feld „Arbeit“ erscheinen die Sätze, die der Betrieb schon geschrieben hat – die häufigsten zuerst. Das Feld bleibt frei: ein neuer Text lässt sich wie bisher einfach eintippen.",
  "<b>Bei der Zuteilung</b> steht unter der Ankreuzliste, wer bei <b>diesem Auftraggeber</b> sonst zugeteilt ist – zum Antippen. Angekreuzt wird nichts von selbst; die Zuteilung bleibt eine Entscheidung.",
  "Beides rechnet aus dem, was ohnehin da ist. Der Zuteilungs-Vorschlag braucht dafür nicht einmal eine zusätzliche Abfrage."]
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
