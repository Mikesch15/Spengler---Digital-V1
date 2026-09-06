"use strict";
// ---------------------------------------------------------------------------
// Hilfe-System (v3.03)
// ---------------------------------------------------------------------------
// EIN Mechanismus fuer die ganze App: ein kleiner Info-Knopf neben einer
// Ueberschrift oeffnet eine kurze Erklaerung. Die Texte stehen alle hier an
// einer Stelle - so koennen Knopf und Text nicht auseinanderlaufen, und ein
// vergessener Text erzeugt gar keinen Knopf (statt eines leeren Dialogs).
//
// Zwei Wege, einen Knopf zu setzen:
//   1. statisch in index.html:  <button class="hilfe-knopf" data-hilfe="key">i</button>
//   2. aus einem Modul heraus:  hilfeKnopf("key")   -> liefert dasselbe HTML
//
// Der Klick-Handler laeuft in der ERFASSUNGSPHASE (capture) und stoppt das
// Ereignis. Sonst wuerde ein Info-Knopf in einer aufklappbaren
// Einstellungs-Ueberschrift zusaetzlich den Abschnitt auf- und zuklappen
// (der Umschalter in js/07 haengt als bubbelnder document-Handler daran).

// Pfad zur Anleitung, relativ zur App - liegt im Repo unter anleitung/.
const HILFE_PDF="anleitung/Spengler-DIGITAL-Anleitung-v3.15.pdf";

// {titel, text} - text darf <p>, <ul>/<li>, <b> enthalten (fester Text aus
// dieser Datei, kein Benutzerinhalt).
const HILFE_TEXTE={

// ---- Grundlegendes ------------------------------------------------------
"start":{titel:"So arbeitet die App",text:`
<p>Alles hängt am <b>Projekt</b> – also an der Baustelle, erkennbar an ihrer
Adresse. Massaufnahmen, Ausmasse, Regierapporte und Dateien gehören immer zu
einem Projekt.</p>
<p>Der Weg ist deshalb immer derselbe:</p>
<ul><li><b>Projekte</b> öffnen</li>
<li>Projekt anlegen oder auswählen</li>
<li>Im <b>Cockpit</b> die Arbeit anlegen und wiederfinden</li></ul>
<p>Nach jeder Arbeit landest du wieder im Cockpit desselben Projekts.</p>`},

// ---- Arbeitsworkflow (v3.05) --------------------------------------------
"aufgaben":{titel:"Meine offenen Aufgaben",text:`
<p>Hier steht, was <b>du persönlich</b> noch erledigen musst. Die Liste ist
keine eigene Aufgabenverwaltung – sie entsteht direkt aus den Massaufnahmen
und ihren Zuweisungen.</p>
<ul><li><b>Massaufnahme freigeben</b> – deine eigene Aufnahme ist noch nicht
freigegeben.</li>
<li><b>Erneut freigeben</b> – sie wurde nach der Freigabe geändert, die
Freigabe ist verfallen und die eingeteilten Leute warten.</li>
<li><b>Monteur zuweisen</b> – das Material ist gerüstet, aber es ist noch
niemand für die Montage eingeteilt.</li>
<li><b>Abschliessen</b> – die Arbeit ist montiert und muss zum Schluss noch
abgeschlossen werden.</li>
<li><b>Rüster/Monteur zuweisen</b> – sie ist freigegeben, aber es ist noch
niemand eingeteilt.</li>
<li><b>Zu rüsten</b> – du bist als Rüster eingeteilt.</li>
<li><b>Zu montieren</b> – du bist als Monteur eingeteilt.</li></ul>
<p>Ein Klick führt direkt zur richtigen Massaufnahme. Aufgaben anderer
Mitarbeiter siehst du hier nie.</p>
<p>Die Karte ist <b>zugeklappt</b> und braucht dann eine Zeile: sie nennt die
Anzahl und – rot – wie viele davon jetzt dran sind. Ein Tipp darauf klappt die
Liste auf. Ob sie beim Start offen oder zu ist, stellst du unter
<b>Einstellungen → Allgemein → Anzeige</b> ein; das gilt nur für dieses Gerät.
Sind keine Aufgaben offen, erscheint die Karte gar nicht.</p>`},

"cockpit-material":{titel:"Material des Projekts",text:`
<p>Führt zusammen, was die einzelnen Massaufnahmen dieses Projekts ohnehin
schon ausgerechnet haben: welches Material, welche Menge, welche Zuschnitte.</p>
<p><b>Es wird nichts neu gerechnet.</b> Angezeigt wird genau das, was beim
Speichern jeder Massaufnahme abgelegt wurde – dieselben Werte, die auch das
PDF druckt. Übersicht und Ausdruck können deshalb nicht auseinanderlaufen.</p>
<p>Zusammengefasst wird nur, was fachlich dasselbe ist: gleiches Material,
gleiche Bezeichnung, gleiche Einheit. Zwei Einlaufbleche mit verschiedener
Abwicklung bleiben getrennt, weil die Bezeichnung die Abwicklung schon
nennt. Was sich nicht als Zahl lesen lässt, wird nicht summiert, sondern
einzeln aufgeführt.</p>
<p>Jede Position lässt sich zu ihrer Massaufnahme zurückverfolgen – der
Knopf darunter öffnet sie.</p>
<p>Das Material selbst kommt aus der bestehenden Materialverwaltung
(Einstellungen → Geschützt → Massaufnahme-Materialien). Hier wird nichts
fest eingebaut.</p>
`},
"cockpit-zuschnitt":{titel:"Zuschnitt des ganzen Projekts",text:`
<p>Derselbe Rollenblech-Plan wie im Register „Zuschnitt“ der einzelnen
Massaufnahme – nur über <b>alle</b> Massaufnahmen des Projekts zusammen.
Stücke mehrerer Aufnahmen können dadurch aus denselben Abschnitten kommen,
was in der Regel Material spart.</p>
<p><b>Es ist dieselbe Berechnung.</b> Gepackt wird mit derselben Funktion,
mit derselben Schnittfuge und denselben Rollenbreiten des Blechlagers; das
Reststücke-Lager ist dasselbe. Es gibt in der App nur eine
Zuschnittberechnung.</p>
<p>Getrennt wird nach <b>Material</b> – Stücke aus verschiedenen Materialien
können nicht aus derselben Rolle kommen. Innerhalb eines Materials werden
Stücke mit gleicher Streifenbreite zusammen gepackt.</p>
<p>Unter „Herkunft der Stücke“ steht, welches Stück aus welcher Massaufnahme
kommt. Ist die Freigabe einer beteiligten Massaufnahme verfallen, steht das
dort – dann sollte vor dem Zuschneiden erst wieder freigegeben werden.</p>
`},
"einst-projektmodule":{titel:"Erweiterter Projekt-/Material-/Werkstattworkflow",text:`
<p>Dieser Block führt zusammen, was heute je Massaufnahme einzeln dasteht:
das <b>Material</b> und den <b>Zuschnitt</b> eines ganzen Projekts, die
<b>Reservierung</b> von Material und Reststücken, eine <b>Werkstattansicht</b>
für den Rüster, <b>Vorlagen</b> und <b>Serienaufnahmen</b> für wiederkehrende
Arbeiten und die <b>Versionierung</b> der Massaufnahme.</p>
<p><b>Standardmässig ist alles aus.</b> Solange der Hauptschalter aus ist,
verhält sich die App genau wie vorher – es gibt keine neuen Pflichtfelder,
keine neuen Karten, keine Reservierungs- und keine Versionierungspflicht. Wer
das nicht braucht, muss nichts tun.</p>
<p>Der Hauptschalter gibt die sieben Untermodule frei; jedes lässt sich
einzeln ein- und ausschalten. Einige bauen aufeinander auf: der projektweite
Zuschnitt und die Reservierung brauchen die Materialübersicht,
Serienaufnahmen brauchen Vorlagen. Fehlt die Grundlage, ist das Untermodul
gesperrt und sagt auch warum.</p>
<p><b>Beim Ausschalten wird nichts gelöscht.</b> Bereits erfasste
Reservierungen, Vorlagen und Versionen bleiben gespeichert; nur die
Bedienung verschwindet. Wird der Ablauf später wieder eingeschaltet, ist
alles unverändert da – auch die vorher gewählten Untermodule.</p>
<p>Gilt für die <b>ganze Firma</b>. Ändern kann das nur ein Administrator;
die Datenbank prüft das bei jedem Speichern selbst.</p>
`},
"versionen":{titel:"Freigegebene Fassungen",text:`
Jede Freigabe hält den Stand fest, der ab diesem Moment für Zuschnitt und
Rüsten verbindlich ist. Diese Fassung lässt sich nicht mehr ändern – auch
nicht von einem Administrator.

Wird nach der Freigabe etwas Wesentliches geändert, verfällt sie: der
Arbeitsstatus fällt auf „In Bearbeitung" zurück, und die nächste Freigabe
erzeugt die nächste Fassung. Damit kann kein Zuschnitt und kein Rüsten
unbemerkt auf einem veralteten Stand weiterlaufen.

Der Vergleich zeigt, was sich zwischen zwei Fassungen oder gegenüber dem
aktuellen Stand geändert hat. Verglichen werden die einzelnen Masse. Bei
Listen (Stücke, Segmente, Scharen) und bei zusammengesetzten Werten wie dem
Zuschnittplan steht bewusst nur, DASS sich etwas geändert hat – dort wäre
ein Feldvergleich eine Scheingenauigkeit.
`},
"vorlagen-bibliothek":{titel:"Vorlagen",text:`
Eine Vorlage ist ein gespeicherter Satz Masse einer Massaufnahme-Art – mehr
nicht. Sie enthält bewusst kein Projekt, keine Adresse, keine Bezeichnung,
keine Notiz, kein Datum, keine Fotos und keinen Arbeitsstatus. Damit lässt
sich eine wiederkehrende Konstruktion auf jeder Baustelle neu verwenden, ohne
dass Angaben der letzten Baustelle stillschweigend mitkommen.

Eine daraus erzeugte Massaufnahme ist vollständig eigenständig. Es gibt keine
Verknüpfung zurück: eine spätere Änderung an der Vorlage verändert bereits
erfasste Massaufnahmen nicht, und eine Änderung an einer Massaufnahme
verändert die Vorlage nicht.

Angelegt wird eine Vorlage in einer geöffneten Massaufnahme über
„📄 Als Vorlage speichern". Die Liste hier dient zum Umbenennen und Löschen.
Löschen ändert nichts an bestehenden Massaufnahmen.
`},
"vorlage-speichern":{titel:"Als Vorlage speichern",text:`
Übernommen werden nur die Masse dieser Art. Projekt, Bezeichnung, Notiz,
Datum, Fotos und Skizzen bleiben aussen vor – sie gehören zum einzelnen
Objekt und wären auf der nächsten Baustelle falsch.

Gibt es für dieselbe Art schon eine Vorlage mit demselben Namen, wird
nachgefragt, ob sie überschrieben werden soll. Bereits erfasste
Massaufnahmen bleiben dabei unverändert.
`},
"serie":{titel:"Serienaufnahme",text:`
Aus einer Vorlage entstehen mehrere Massaufnahmen auf einmal – etwa acht
gleiche Lukarnen auf demselben Dach. Die Bezeichnungen werden aus dem Präfix
und einer laufenden Nummer gebildet und vorher angezeigt.

Jede entstandene Massaufnahme ist eigenständig: sie lässt sich einzeln
bearbeiten, freigeben, zuschneiden, rüsten und montieren. Eine Änderung an
einer wirkt nicht auf die anderen. Alle starten im Arbeitsstatus
„In Bearbeitung" – eine Serie kann den Ablauf nicht überspringen.

Die Serie wird im gerade geöffneten Projekt angelegt; deshalb steht der
Knopf im Projekt und nicht in der allgemeinen Übersicht.
`},
"werkstatt":{titel:"Werkstatt und Rüsten",text:`
Hier steht, was freigegeben und zum Rüsten oder Montieren eingeteilt ist –
nach Projekt gruppiert, nicht nach Person. Es ist dieselbe Arbeitsliste wie
auf der Startseite, nur aus Sicht der Werkstatt.

Ganz oben steht, was insgesamt ansteht. Jedes Projekt trägt darunter seinen
<b>nächsten Schritt</b> und eine Leiste mit den vier Stationen – Reserviert,
Zugeschnitten, Gerüstet, Montiert. Ein Häkchen heisst erledigt, das blaue
Dreieck ist der Schritt, der jetzt dran ist. Die Projekte stehen in genau
dieser Reihenfolge: was zuerst drankommt, steht oben. Die Massaufnahmen, um
die es beim jetzigen Schritt geht, sind blau markiert und stehen zuoberst.

Eine Station erscheint nur, wenn das zugehörige Modul eingeschaltet ist –
sonst gäbe es dazu keinen ablesbaren Zustand. Reserviert und Zugeschnitten
kommen aus dem Status der Reservierungen, Gerüstet und Montiert aus dem
Arbeitsstatus der Massaufnahmen. Es wird nichts geschätzt.

Steht als nächster Schritt „Material reservieren" oder „Zuschneiden", trägt
der Streifen einen Knopf, der genau das für das ganze Projekt auf einmal
erledigt – „📦 Alle reservieren (5)". Die Zahl ist die Zahl der Positionen,
die noch dahinter stehen; was schon weiter ist, bleibt unberührt.

„Rüstgrundlage anzeigen" klappt auf, was für dieses Projekt gebraucht wird:
Material, Zuschnitt, Reservierungen und die dafür reservierten Reststücke.
Das sind genau dieselben Zahlen wie im Projekt selbst – es wird nichts neu
gerechnet.

Wurde eine Massaufnahme nach ihrer Freigabe geändert, steht das rot dabei
und sie lässt sich nicht bestätigen. Zuerst muss sie erneut freigegeben
werden – damit niemand nach einem überholten Stand rüstet.`},
"cockpit-reservierung":{titel:"Materialreservierung",text:`
Hier steht, was für dieses Projekt gebraucht, reserviert, zugeschnitten und
gerüstet ist. „Bedarf übernehmen" holt genau die Positionen, die die
Massaufnahmen dieses Projekts bereits ausgerechnet haben – es wird nichts
neu gerechnet und nichts erfunden.

Der Status wird von Hand weitergestellt: Benötigt → Verfügbar → Reserviert →
Zugeschnitten → Gerüstet. Jede Änderung steht mit altem und neuem Wert im
Projekt-Verlauf.

<b>Alles auf einmal:</b> beim Öffnen ist jede Zeile angehakt – „→ Reserviert (12)"
reserviert also das ganze Objekt mit einem Druck. Die Zahl am Knopf ist die
Zahl der Zeilen, die er wirklich ändert; steht dort (0), ist er gesperrt. Ein
Schritt hebt nur Positionen, die noch dahinter stehen – eine bereits
zugeschnittene wird nie zurückgezogen. Wer nur einen Teil will, nimmt Haken
weg oder tippt auf einen der Filter über der Liste.

Ein Reststück aus dem Lager wird nie automatisch eingeplant. Bei den
Reststücken ist deshalb – anders als bei den Bedarfszeilen – <b>nichts</b>
vorgewählt: das ganze Lager für ein Projekt vorzuwählen wäre genau dieses
stillschweigende Einplanen. Erst wenn Sie eines ausdrücklich für dieses
Projekt reservieren, ist es für andere Projekte gesperrt. Freigeben macht es wieder verfügbar, „Als verwendet buchen" nimmt
es aus dem Lager – die Projektzuordnung bleibt im Verlauf nachvollziehbar.`},
"einst-workflow":{titel:"Arbeitsablauf der Massaufnahme",text:`
<p>Schaltet den ganzen Ablauf für die <b>ganze Firma</b> ein oder aus: Freigabe
durch den Aufnehmer, Zuweisung von Rüster und Monteur, Bestätigung von Rüsten
und Montage – und die Aufgabenliste auf dem Startbildschirm.</p>
<p><b>Aus</b> heisst: die Karte „Arbeitsstatus“ verschwindet aus der
Massaufnahme und der Startbildschirm zeigt keine Aufgaben mehr. Für einen
Betrieb, in dem dieselbe Person misst, rüstet und montiert, ist der Ablauf
unnötiger Aufwand.</p>
<p><b>Es wird nichts gelöscht.</b> Der Stand bereits laufender Massaufnahmen
bleibt gespeichert und ist unverändert wieder da, sobald der Ablauf erneut
eingeschaltet wird.</p>
<p>Ändern kann das nur ein Administrator. Der Schalter blendet nur aus – wer
den Ablauf verwendet, ist weiterhin an die Regeln gebunden: freigeben darf nur
der Aufnehmer, rüsten nur der eingeteilte Rüster. Das prüft die Datenbank
selbst, unabhängig von dieser Einstellung.</p>`},

"admin-uebersicht":{titel:"Alle Massaufnahmen",text:`
<p>Diese Übersicht sehen nur Firmenadministratoren. Sie zeigt <b>jede</b>
Massaufnahme der Firma mit ihrer Zuordnung – Projekt und Adresse, wer sie
aufgenommen hat, wer rüstet, wer montiert – und ihrem Arbeitsstatus.</p>
<p>Mit dem Suchfeld und den Filtern lässt sich eingrenzen: nach Status,
Projekt, Art der Massaufnahme oder nach einer Person. Gesucht wird über
Adresse, Projektname, Bezeichnung und Personennamen. Die Filter arbeiten auf
der bereits geladenen Liste, sie lösen keine neue Abfrage aus.</p>
<p><b>„Ohne Projekt"</b> in Rot heisst: diese Massaufnahme wurde ohne Projekt
gespeichert. Sie ist dadurch in der normalen App <i>nirgends</i> sichtbar und
lässt sich auch nicht bearbeiten. Über „📁 Projekt zuordnen" bekommt sie ein
Projekt und ist danach eine ganz normale Massaufnahme.</p>
<p>Der Status wird hier nur angezeigt. Ändern lässt er sich wie immer in der
Massaufnahme selbst, damit es dafür nur einen Weg gibt.</p>`},
"admin-zuordnen":{titel:"Projekt zuordnen",text:`
<p>Eine Massaufnahme ohne Projekt gehört zu keiner Baustelle und zu keiner
Adresse. Die App zeigt sie deshalb nirgends an – sie ist weder in der
Projektübersicht noch in der Suche zu finden und lässt sich nicht öffnen.</p>
<p>Hier bekommt sie ein Projekt der eigenen Firma. Danach erscheint sie
überall wie jede andere Massaufnahme und kann normal bearbeitet, freigegeben
und gerüstet werden. Es wird nichts überschrieben: Masse, Fotos, Skizzen und
der Ersteller bleiben unverändert.</p>
<p>Die Zuordnung steht im Änderungsverlauf der Massaufnahme.</p>`},
"matzu":{titel:"Material & Zuschnitt",text:`
<p>Eine Seite je Projekt, die drei Fragen beantwortet: <b>welches Material</b>
braucht das Projekt, <b>welche Massaufnahme liefert welche Zuschnitte</b>, und
<b>was davon ist schon geschnitten</b>.</p>
<p>Oben stehen die Kennzahlen, darunter das Material nach Materialart, darunter
die Zuschnitte – eine Karte je Massaufnahme, offene und teilweise erledigte
zuerst. <span class="tasten">✂️ Zuschnitt öffnen</span> führt direkt in die
Zuschnittansicht genau dieser Massaufnahme. Dort wird nichts neu gerechnet: es
ist dieselbe Liste, die auch das PDF druckt.</p>
<p><b>Ein Tap auf eine Positionsnummer hakt dieses Stück als zugeschnitten
ab</b>, nochmals tippen nimmt den Haken zurück. Bei mehreren gleichen
Zuschnitten steht daneben „2/3 erledigt“ und <span class="tasten">✓ alle</span>
hakt die ganze Zeile ab. Wer wann abgehakt hat, steht im Änderungsverlauf.</p>
<p><b>Zugeschnitten entsteht nur so</b> – nicht dadurch, dass Material
reserviert oder verfügbar ist. Das sind getrennte Dinge: <i>Material</i> ist
benötigt/verfügbar/reserviert, <i>Zuschnitt</i> ist offen/teilweise/vollständig,
und <i>gerüstet/montiert</i> gehört zum Arbeitsablauf der Massaufnahme.</p>
<p>Die Reservierung und das Reststücke-Lager stehen weiter unten unter
<b>Einzelheiten</b>. Ein Reststück wird nie automatisch eingeplant.</p>
<p>Die Seite gibt es nur, wenn mindestens eines der Module Material, Zuschnitt
oder Reservierung eingeschaltet ist (Einstellungen → Allgemein →
Projektmodule).</p>`},

"workflow":{titel:"Arbeitsstatus",text:`
<p>Der Weg einer Massaufnahme in fünf Stationen – die Leiste oben zeigt, wo
sie gerade steht:</p>
<ul><li><b>Aufgenommen</b> → <b>Freigegeben</b> → <b>Gerüstet</b> →
<b>Montiert</b> → <b>Abschluss</b></li></ul>
<p>Ein Häkchen heisst erledigt, der ausgefüllte Punkt ist der Schritt, der
gerade dran ist, ein Strich heisst <i>übersprungen</i> – das passiert bei
„Gerüstet", wenn niemand zum Rüsten eingeteilt wurde.</p>
<p>Direkt darunter steht in einem Satz, <b>was als Nächstes zu tun ist und
wer dran ist</b>. Derselbe Satz steht auch ganz oben im Formular, damit du
ihn in jedem Register siehst.</p>
<p><b>Freigeben</b> kann nur die Person, welche die Massaufnahme aufgenommen
hat. Freigegeben heisst <i>nicht</i>, dass ein Meister die Masse fachlich
geprüft hat – es heisst: der Aufnehmer bestätigt, dass die Aufnahme aus
seiner Sicht vollständig und kontrolliert ist.</p>
<p><b>Rüster und Monteur werden bei der Freigabe automatisch auf die Person
gesetzt, welche die Massaufnahme aufgenommen hat.</b> Das ist nur eine
Vorgabe: mit „👥 Rüster und Monteur ändern" lässt sie sich jederzeit auf
jemand anderen oder auf „– niemand –" stellen. War schon jemand eingeteilt
– etwa nach einer verfallenen Freigabe –, wird nichts überschrieben.</p>
<p><b>Gerüstet</b> bestätigt der eingeteilte Rüster, <b>Montiert</b> der
eingeteilte Monteur. Jeder Schritt wird mit Person und Zeitpunkt gespeichert
und steht im Änderungsverlauf.</p>
<p><b>Wird eine freigegebene Massaufnahme fachlich geändert</b> – an den
Massen, an der Art, am Projekt, oder es verschwindet ein Foto oder eine
Skizze –, dann <b>verfällt die Freigabe</b> automatisch und sie muss erneut
freigegeben werden. So baut niemand nach einem Stand, den es nicht mehr gibt.
Rüster und Monteur bleiben eingeteilt und sind nach der erneuten Freigabe
sofort wieder dran. Bezeichnung, Notiz, Datum und ein <i>zusätzliches</i>
Foto ändern nichts an der Freigabe.</p>`},

"winkel-meter":{titel:"Winkel im Meter (i.M.)",text:`
<p>Neben jedem Winkelfeld steht ein kleiner Knopf <b>i.M.</b> Er rechnet
zwischen dem am Gliedermeter abgelesenen Mass und Grad um – in beide
Richtungen.</p>
<p><b>Meter → Grad:</b> Das Mass A eintippen, das am Meter abgelesen wurde
(50 bis 79.75 cm). Es erscheinen zwei Winkel: der Keil, den der Meter
tatsächlich aufspannt, und der Nachbarkeil daneben (der Rest auf 180°).
Welcher gemeint ist, weiss nur der, der gemessen hat – deshalb sind beide
zum Übernehmen da.</p>
<p><b>Grad → Meter:</b> Den gewünschten Winkel eintippen und ablesen, auf
welches Mass der Meter zu stellen ist – zum Nachkontrollieren auf dem Dach.</p>
<p>Grundlage ist die Umrechnungstabelle „Winkel in Meter – Grad" der GABS AG,
Zeile für Zeile hinterlegt. Zwischen zwei Zeilen wird gerade interpoliert; das
steht dann auch so da.</p>
<p><b>Das Feld selbst hält immer Grad.</b> Die Umrechnung ist eine reine
Eingabehilfe – es kann also nie versehentlich ein Zentimeterwert als Winkel
gespeichert werden.</p>`},
"korrigieren":{titel:"Arbeitsstatus korrigieren",text:`
<p>Nur für den Fall, dass ein Schritt versehentlich bestätigt wurde – etwa
wenn jemand „Gerüstet" gedrückt hat, bevor das Material wirklich bereit war.
Der Status lässt sich damit auf einen beliebigen Punkt der Kette
zurücksetzen oder vorsetzen.</p>
<p>Das darf <b>nur ein Firmenadministrator</b>, und die Datenbank prüft das
noch einmal selbst. Die Korrektur steht mit Person und Zeitpunkt im
Änderungsverlauf – sie verschwindet nicht spurlos.</p>
<p>Zuweisungen bleiben dabei erhalten.</p>`},

"zuweisen":{titel:"Rüster und Monteur",text:`
<p>Nach der Freigabe teilst du ein, wer <b>rüstet</b> und wer <b>montiert</b>.
Beides ist freiwillig: du kannst nur einen Rüster, nur einen Monteur oder
beide setzen.</p>
<p>Aufnehmer, Rüster und Monteur sind getrennte Rollen – dieselbe Person darf
mehrere davon übernehmen. Zuweisen darf der Aufnehmer oder ein
Administrator; jede Änderung steht im Änderungsverlauf.</p>
<p>Eine Zuweisung überlebt es, wenn die Freigabe verfällt: nach der erneuten
Freigabe geht es ohne neues Einteilen dort weiter, wo es aufgehört hat.</p>`},

// ---- Projekte -----------------------------------------------------------
"zuletzt":{titel:"Zuletzt bearbeitet",text:`
<p>Die Projekte, an denen zuletzt wirklich gearbeitet wurde. Gerechnet wird
über das Projekt selbst <i>und</i> seine Massaufnahmen, Ausmasse, Rapporte
und Dateien – nicht nur über Änderungen am Projektnamen.</p>
<p>Archivierte Projekte erscheinen hier nicht.</p>`},

"projekte":{titel:"Projekte",text:`
<p>Ein Projekt braucht <b>Projektname und Adresse</b>. Auftrags-Nr. und
Auftraggeber sind freiwillig, werden aber in den Regierapport übernommen.</p>
<p><b>Suchen:</b> das Suchfeld durchsucht Adresse, Projektname, Auftrags-Nr.
und Auftraggeber.</p>
<p><b>Status:</b> wird von Hand gesetzt und beschreibt den geschäftlichen
Zustand – Offen, In Arbeit, Abgeschlossen, Storniert. Die App leitet ihn
nicht aus den Daten ab: ein Projekt mit fünf Massaufnahmen kann geschäftlich
weiterhin offen sein.</p>
<p><b>Archiv:</b> aktive und archivierte Projekte sind zwei getrennte
Ansichten. Es wird nichts automatisch archiviert – ein abgeschlossenes Projekt
bleibt sichtbar, bis es jemand bewusst archiviert.</p>`},

// ---- Cockpit ------------------------------------------------------------
"cockpit":{titel:"Das Projekt-Cockpit",text:`
<p>Der Arbeitsplatz eines Projekts. Von hier wird alles angelegt und
wiedergefunden.</p>
<p>Der <b>Arbeitsstand</b> zeigt, was tatsächlich vorhanden ist: ein Häkchen
mit der Anzahl, oder "Noch keine ...". Es steht dort nie, dass etwas fehle
oder erledigt sei – aus einem fehlenden Datensatz folgt nicht, dass er nötig
wäre.</p>
<p>Steht dort ein <b>?</b>, konnte dieser Bereich nicht geladen werden. Das
ist ehrlicher als eine falsche 0.</p>
<p>Ein Klick auf eine Zeile springt zum passenden Bereich – und klappt ihn
dabei auf.</p>
<p><b>Alles ist klappbar.</b> Jeder Bereich startet zugeklappt; die Anzahl
steht in der Überschrift, man sieht also auch zugeklappt, was da ist. Ein
Tipp auf die Überschrift öffnet ihn. Was offen war, merkt sich dieses Gerät
und öffnet es beim nächsten Projekt wieder. „⬇️ Alles aufklappen" öffnet und
schliesst alles auf einmal.</p>
<p>Der Weg zurück steht bewusst ganz unten <b>ausserhalb</b> der klappbaren
Bereiche – er kann nie hinter einem zugeklappten Abschnitt verschwinden.
Auf dem Handy führt auch die Zurück-Taste des Geräts einen Schirm
zurück.</p>`},

"cockpit-meas":{titel:"Massaufnahmen im Projekt",text:`
<p>Alle Massaufnahmen dieses Projekts. "＋ Neue Massaufnahme" führt zur
Auswahl der zwölf Fachfunktionen.</p>
<p>Je Eintrag: <b>Öffnen</b> zum Weiterarbeiten, das Druckersymbol erzeugt
das PDF, das Kreuz löscht. Steht bei einem Eintrag ein Foto-Hinweis, lassen
sich die Bilder direkt ansehen, ohne die Massaufnahme zu öffnen.</p>`},

"cockpit-am":{titel:"Ausmass im Projekt",text:`
<p>Alle Ausmasse dieses Projekts – "Offerte erfassen" und
"Blitzschutzausmass".</p>
<p>Je Eintrag: <b>Öffnen</b> zum Weiterarbeiten, das Druckersymbol erzeugt das
PDF, das Kreuz löscht.</p>
<p>Ein Ausmass ist die Mengenermittlung für Offerte und Abrechnung – anders
als die Massaufnahme, aus der die Werkstatt ihre Zuschnitte bekommt.</p>`},

"cockpit-rep":{titel:"Regierapporte im Projekt",text:`
<p>Alle Regierapporte dieses Projekts. Wird ein Rapport von hier aus
angelegt, sind Projekt, Auftrags-Nr., Auftraggeber und Objekt bereits
gefüllt.</p>`},

"cockpit-dateien":{titel:"Dateien und Fotos",text:`
<p>Pläne, PDF, Fotos und weitere Projektunterlagen – höchstens
<b>50 MB pro Datei</b>.</p>
<p>Bilder bekommen ein Vorschaubild, andere Dateien ein Typ-Symbol. Je Datei:
öffnen, umbenennen, ersetzen, löschen. Die neueste Änderung steht zuoberst.</p>`},

"verlauf":{titel:"Änderungsverlauf",text:`
<p>Wer hat wann was gemacht – für dieses Projekt <i>und</i> seine
Massaufnahmen, Ausmasse und Rapporte. Jede Massaufnahme hat zusätzlich ihren
eigenen Verlauf.</p>
<p>Bei einer Änderung steht dabei, <b>welches Feld</b> sich wie geändert
hat. Die zwei Filterreihen (Entität und Aktion) lassen sich frei
kombinieren.</p>
<p>Ein gelöschter Eintrag bleibt im Verlauf stehen. Wurde ein Mitarbeiter
entfernt, steht dort "Unbekannter Benutzer". Gezeigt werden die letzten
50 Einträge.</p>`},

// ---- Massaufnahme allgemein --------------------------------------------
"meas-arten":{titel:"Welche Funktion?",text:`
<p>Zwölf Fachfunktionen. <b>Skizze/Foto</b> rechnet nichts und dient nur der
Dokumentation; die übrigen elf führen dich über <b>Register</b> Schritt
für Schritt durch die Erfassung.</p>
<p>Die Art lässt sich später nicht mehr wechseln – eine falsch gewählte
Massaufnahme wird gelöscht und neu angelegt.</p>`},

"meas-kopf":{titel:"Massaufnahme",text:`
<p>Oben stehen Projekt, Bezeichnung und Datum – sie gelten für die ganze
Massaufnahme.</p>
<p>Darunter führen die <b>Register</b> durch die Erfassung. Das letzte
Register ist immer die <b>Kontrolle</b>. Notiz und Speichern sind aus jedem
Register erreichbar.</p>
<p>Felder mit einem <b>roten Stern</b> müssen ausgefüllt sein – ohne sie lässt
sich nicht speichern. Alle übrigen sind freiwillig.</p>`},

"medien":{titel:"Fotos und Skizzen",text:`
<p>Eine Massaufnahme kann <b>mehrere Fotos und mehrere Skizzen</b> tragen.</p>
<p>Auf einem Foto lässt sich direkt zeichnen (Stiftsymbol an der Kachel),
eine Skizze lässt sich frei aufziehen.</p>
<p>Bei den Funktionen mit Registern erscheint dieser Bereich erst im
<b>letzten Register</b>. Der Knopf "Fertig" springt direkt dorthin.</p>`},

// ---- Register, die in mehreren Funktionen gleich sind --------------------
"reg-grunddaten":{titel:"Grunddaten",text:`
<p>Was für die ganze Massaufnahme gilt: Material und die Masse, die sich von
Stück zu Stück nicht ändern.</p>
<p>Das <b>Material</b> kommt aus dem Katalog der Firma (Einstellungen →
Geschützt → Material). Bei Rinne Halbrund und Mauerabdeckung steuert es
zusätzlich die Dehnungsabstände.</p>`},

"reg-zuschnitt":{titel:"Zuschnitt aus Rollenblech",text:`
<p>So kommt die Rechnung zustande:</p>
<ul>
<li>Von der Rolle wird ein <b>Abschnitt</b> abgezogen – immer so lang wie das
längste Blech.</li>
<li>Der Abschnitt wird quer in <b>Streifen</b> der Abwicklungsbreite
geteilt.</li>
<li>In einem Streifen dürfen mehrere Stücke hintereinander liegen, solange
sie zusammen in einen Abschnitt passen.</li>
</ul>
<p>Die App probiert alle hinterlegten Rollenbreiten durch und hebt die
materialsparendste hervor. Unter <i>Einzelheiten</i> stehen der Vergleich
aller Breiten und die Belegung jedes Streifens.</p>
<p>Über <i>Rollen für diese Massaufnahme</i> lässt sich einschränken,
welche Rollen auf diese Baustelle mitkommen.</p>
<p><b>Wichtig:</b> gerechnet wird ohne Schnittfuge und ohne Reststücke aus
früheren Aufträgen. Die Zahlen sind deshalb etwas optimistisch.</p>`},

"reg-ausmass":{titel:"Ausmass und Material",text:`
<p>Entsteht ohne zweite Eingabe aus dem, was du erfasst hast – Längen,
Flächen, Stückzahlen.</p>
<p>Bewusst <b>ohne Artikelnummern und ohne Preise</b>: die App kennt die
Einkaufskonditionen der Firma nicht. Die Liste ist als Grundlage für die
Bestellung und die Abrechnung gedacht.</p>`},

"reg-kontrolle":{titel:"Kontrolle",text:`
<p>Steht immer zuletzt. Gibt es etwas zu sehen, trägt das Register schon in
der Leiste einen Punkt.</p>
<ul>
<li><b>Fehler</b> (rot): etwas geht rechnerisch nicht auf oder ein Mindestmass
ist verletzt.</li>
<li><b>Hinweis</b> (orange): etwas ist ungewöhnlich, aber erlaubt.</li>
</ul>
<p>Ein Hinweis blockiert das Speichern nicht.</p>`},

// ---- Register je Funktion ----------------------------------------------
"eb-geometrie":{titel:"Geometrie",text:`
<p><b>Mass A</b> ist das Mass des Blechs vor dem Knick, der <b>Winkel</b> die
Dachneigung. Daraus rechnet die App die enge Seite und die Restbreite.</p>
<p>Wird die Restbreite negativ, passt das Blech nicht in die gewählte
Abwicklung – die Kontrolle sagt es.</p>`},

"eb-stuecke":{titel:"Stücke",text:`
<p>Je Stück: Länge Stoss/Stoss, Gehrung links/rechts, Endzugabe. Die
<b>Zuschnittlänge</b> rechnet die App und zeigt sie als Länge × Breite.</p>
<p>Aus einer <b>Gesamtlänge</b> lassen sich die Stücke automatisch
aufteilen – mit Stosslänge und Überlappung aus den Einstellungen.</p>
<p>Sind für dieses Projekt schon Rinnen erfasst, lassen sich deren Längen
übernehmen.</p>`},

"ebk-geometrie":{titel:"Geometrie",text:`
<p>Anders als beim geraden Einlaufblech hat hier <b>jedes Stück</b> ein
eigenes Mass links und rechts – daher konisch. Was hier steht, gilt für alle
Stücke: Abwicklung, Dachneigung und Montageseite.</p>`},

"ebk-stuecke":{titel:"Stücke",text:`
<p>Je Stück Mass links und rechts; die App rechnet daraus das mittlere Mass
und die Zuschnittlänge.</p>
<p>Beim Anlegen wird das rechte Mass des vorherigen Stücks als linkes Mass
übernommen. Danach ist der Wert frei änderbar – eine spätere Änderung
wirkt nicht rückwirkend.</p>`},

"rh-verlauf":{titel:"Rinnenverlauf",text:`
<p>Die Rinne wird als Kette aus <b>Abschnitten</b> und <b>Übergängen</b>
erfasst – so, wie draussen gemessen wird. Jedes Mass beginnt beim Abschnitt
davor, nicht bei START.</p>
<p>Ein Übergang trägt entweder eine <b>Ecke</b> oder einen <b>Stutzen</b>:</p>
<ul>
<li>Aussen- und Innenwinkel sowie der Einhängestutzen sind <b>Fixpunkte</b>
und teilen die Rinne.</li>
<li>Der <b>Schiebestutzen</b> ist kein Fixpunkt und wirkt wie ein
Dehnungselement.</li>
</ul>`},

"rh-komponenten":{titel:"Komponenten",text:`
<p><b>Rinnenhalter:</b> Anzahl aus Länge und Abstand.</p>
<p><b>Rinnenboden:</b> sitzt an den beiden Aussenenden und geht in den
Zuschnitt des ersten und letzten Stücks ein.</p>
<p><b>Dehnung:</b> die App rechnet aus Material und Verlauf, wie viele
Dehnungselemente nötig sind und wo sie sitzen. Die Positionen lassen sich im
Register "Stückliste" von Hand überschreiben; "Zurück zur Berechnung"
stellt die Automatik wieder her.</p>`},

"rh-stueckliste":{titel:"Stückliste",text:`
<p>Die einzelnen Rinnenstücke mit ihrer Zuschnittlänge, dazu die
Dehnungselemente mit ihrer Position ab START.</p>
<p>Der Abstand jeder Dehnungszeile lässt sich überschreiben. Ab dem ersten
Eingriff bleibt die Liste von Hand stehen, auch bei geänderter Länge –
das steht dann ausdrücklich dabei.</p>`},

"rh-normlaengen":{titel:"Normlängen",text:`
<p>Eine Rinne wird nicht von der Rolle geschnitten, sondern als fertiges
Profil in <b>Normlängen</b> bezogen. Deshalb rechnet die App hier mit
Stangen statt mit Streifen.</p>
<p>Welche Längen es je Material und Grösse gibt, steht in den Einstellungen
unter "Rinne Halbrund". Ist dort nichts hinterlegt, wird nicht gerechnet –
die App sagt, wo es einzutragen ist, statt eine Länge zu erfinden.</p>`},

"fp-profil":{titel:"Profil",text:`
<p>Das Profil besteht aus <b>Schenkeln</b>. Je Schenkel eine Länge und ein
<b>Winkel</b> – die Richtungsänderung gegenüber dem Schenkel davor.</p>
<p><b>180°</b> ist ein Umschlag: das Blech läuft auf sich selbst zurück.
Der Knopf zum Umkehren klappt ihn auf die andere Seite.</p>`},

"fp-zeichnung":{titel:"Zeichnung",text:`
<p>Der Schnitt aus den erfassten Schenkeln, mit abgerundeten Kanten. Die
Zeichnung rechnet nichts – sie stellt dar, was du eingegeben hast.</p>
<p>Die <b>Ansicht</b> legt fest, von welcher Seite geschaut wird.</p>`},

"fp-skizze":{titel:"Skizze zu Profil",text:`
<p>Ein Foto oder eine Handskizze des Profils wird ausgewertet und als
Schenkel vorgeschlagen.</p>
<p>Das Ergebnis wird <b>zuerst gezeigt</b> und erst mit "Übernehmen"
wirksam – das bestehende Profil bleibt bis dahin unberührt. Erkennt die App
keine eindeutige Form, sagt sie das, statt zu raten.</p>`},

"fp-segmente":{titel:"Segmente",text:`
<p>Ein <b>Segment</b> ist ein Stück dieses Profils mit eigener Länge. Bei
konisch hat es zwei Sätze Masse – für den Zuschnitt zählt dann die grössere
Abwicklung, weil das breitere Ende Platz braucht.</p>`},

"mad-verlauf":{titel:"Verlauf",text:`
<p>Die Mauerabdeckung wird als Kette aus geraden Segmenten mit Ecken dazwischen
erfasst.</p>
<p>Der <b>Boden</b> gilt nur an den beiden Aussenenden. Wird ein Segment
verschoben oder gelöscht, holt die App ihn dorthin zurück, statt ihn
unsichtbar wirkungslos stehen zu lassen.</p>`},

"mad-schieber":{titel:"Boden und Schieber",text:`
<p>Die <b>Grenzpunkte</b> ergeben sich aus Ecken und Boden. Daraus rechnet die
App, wie viele <b>Schieber</b> nötig sind und wo sie sitzen – abhängig vom
Material.</p>
<p>Die Positionen lassen sich von Hand setzen; "Zurück zur Berechnung"
stellt die Automatik wieder her.</p>`},

"mad-profil":{titel:"Profil und Norm",text:`
<p>Aus Breite, Gefälle, Bodenmass und Biegewinkeln rechnet die App die
<b>Abwicklung</b>.</p>
<p>Die Normhinweise beziehen sich auf die hinterlegten Mindestmasse. Sie sind
Hinweise, keine Freigabe – die fachliche Verantwortung bleibt beim
Spengler.</p>`},

"mad-stueckliste":{titel:"Stückliste",text:`
<p>Die einzelnen Bleche mit ihrer Zuschnittlänge, dazu die Schieber mit ihrer
Position.</p>`},

"kehle-winkel":{titel:"Winkel",text:`
<p>Drei Eingaben genügen: <b>Neigung Hauptdach</b>, <b>Neigung Lukarne</b>
und <b>Gefällslänge</b>. Daraus kommen alle Winkel.</p>
<p>Die drei Hauptresultate sind <b>b</b> (First zu Kehle an der Lukarne),
<b>c</b> (Winkelhalbierende zu Kehle am Hauptdach) und <b>d</b> (der
Biegewinkel des Kehlblechs).</p>
<p>Ohne Firstgehrung wird gar nicht gerechnet – die App sagt dann, warum,
statt Zahlen zu erfinden.</p>`},

"kehle-segmente":{titel:"Segmente",text:`
<p>Die einzelnen Kehlbleche. Je Stoss eine eigene <b>Überlappung</b>; der
Zuschnitt ist Länge plus Überlappung.</p>
<p>"Segmente aus Kehllänge A berechnen" teilt die gerechnete Kehllänge auf.
Das ist ein <b>Vorschlag</b> – die Kehle darf bewusst kürzer oder länger
ausgeführt sein. Trauf- und Firststück werden dabei vorne bzw. hinten
gesetzt.</p>`},

"luk-geometrie":{titel:"Geometrie",text:`
<p>Aus Höhe, oberer Länge, Winkel und Achsabstand rechnet die App Breite,
Schräge, Fläche und die Anzahl Scharen.</p>
<p>Ist die Wange an der letzten Scharlinie niedriger als der gewünschte
<b>Hilfsriss</b>, kürzt die App ihn und sagt, mit welchem Mass sie
tatsächlich rechnet.</p>`},

"luk-scharen":{titel:"Scharen",text:`
<p>Alle Werte kommen aus der Rechnung – hier ist nichts von Hand einzugeben.</p>
<p>Die letzte Schar ist die <b>Restbreite</b> und deshalb meist schmaler als
die übrigen. Sie ist als solche gekennzeichnet.</p>`},

"kam-masse":{titel:"Kaminmasse",text:`
<p>Die Masse längs des Dachs, von vorne nach hinten. <b>B</b> und <b>C</b>
überlappen sich im Knick – die Kaminlänge ist deshalb B + C minus der
Überlappung.</p>
<p>Die beiden <b>Winkel</b> sind der Innenwinkel zwischen Dachfläche und
Kaminwand: vorne stumpf, hinten spitz. Auf einem 25°-Dach mit lotrechtem
Kamin also 115° und 65°; zusammen ergeben sie dann 180°.</p>`},

"kam-umschlaege":{titel:"Umschläge",text:`
<p>Die Zugaben, die in die Abwicklung der sechs Teile eingehen. Vorbelegt sind
die Werte aus den Einstellungen; hier gelten sie nur für diese
Massaufnahme.</p>`},

"kam-stueckliste":{titel:"Stückliste",text:`
<p>Sechs Zuschnitte: Vorderteil, Hinterteil und je zwei Seitenteile vorne und
hinten.</p>
<p>Die <b>Bleilappen</b> werden je Seitenteil aus Zuschnittlänge und
Lattenabstand gerechnet und aufgerundet – ein abgerundeter Wert würde die
Länge nicht decken.</p>`},

"einf-liste":{titel:"Einfassungen",text:`
<p>Auf einem Dach steht selten nur ein Rohr – hier lassen sich mehrere
Einfassungen mit eigener Bezeichnung, eigenen Massen und eigener Stückzahl
erfassen.</p>
<p>Eindeckungsart und Lattenabstand gelten für die ganze Massaufnahme; sie
gehören zum Dach, nicht zum einzelnen Rohr.</p>
<p>Der <b>Winkel</b> ist der Innenwinkel zwischen Dachfläche und Rohr,
gemessen auf der Talseite – also immer über 90°. Auf einem 25°-Dach
sind das 115°.</p>`},

"einf-stueckliste":{titel:"Stückliste",text:`
<p>Je Einfassung die Abwicklung, die Gesamtbreite und der Zuschnitt als
Länge × Breite, dazu die Bleilappen.</p>`},

"rp-profil":{titel:"Profil",text:`
<p>Das Rinnenprofil ist <b>frei definierbar</b>. Je Segment eine Bezeichnung,
ein Winkel und die Art:</p>
<ul>
<li><b>fix</b> – bei jedem Stück gleich, mit eigener Länge</li>
<li><b>variabel</b> – je Stück links und rechts ein eigener Wert</li>
</ul>
<p>Variable Segmente heissen automatisch A, B, C ... Die Stückliste bekommt
genau so viele Spalten, wie das Profil variable Masse hat.</p>
<p><b>180°</b> ist ein Umschlag.</p>`},

"rp-stuecke":{titel:"Rinnenstücke",text:`
<p>Je Stück die variablen Masse links und rechts, die Länge M/M und das
Ansetzen an beiden Enden.</p>
<p>Beim Anlegen wird rechts des vorherigen Stücks als links übernommen –
danach frei änderbar, nie rückwirkend.</p>
<p>Der Zuschnitt ist Länge M/M plus Ansetzen links plus Ansetzen rechts.
Ein Ansetztyp kann auch abziehen (z. B. Dila).</p>`},

"anb-schnitt":{titel:"Schnitt",text:`
<p>Welche Masse hier erscheinen, hängt von Anschlussart und Ausführung ab –
die App blendet nur ein, was zur gewählten Variante gehört.</p>
<p>Die Zeichnung zeigt den Schnitt mit den erfassten Massen. Unterschreitet
ein Mass die Norm, sagt es die Kontrolle.</p>`},

"anb-segmente":{titel:"Segmente",text:`
<p>Die einzelnen Längen des Anschlusses. Mehrere Segmente ergeben zusammen
die Gesamtlänge; ein Knick dazwischen bekommt Winkel und Mass.</p>`},

"anb-stueckliste":{titel:"Stückliste",text:`
<p>Aus Gesamtlänge, Stücklänge und Überlappung rechnet die App die
einzelnen Bleche.</p>
<p>Die <b>Restschwelle</b> legt fest, ab welcher Restlänge ein eigenes Stück
entsteht, statt das vorherige zu verlängern.</p>`},

// ---- Ausmass ------------------------------------------------------------
"am-arten":{titel:"Welches Ausmass?",text:`
<p><b>Offerte erfassen:</b> freie Positionen mit Menge und Einheit. Positionen
lassen sich aus einem Foto einer Offerte erkennen.</p>
<p><b>Blitzschutzausmass:</b> Positionen aus dem Blitzschutz-Katalog mit
Artikelnummer.</p>`},

"am-kopf":{titel:"Ausmass",text:`
<p>Auch ein Ausmass gehört zu einem Projekt, trägt Fotos und lässt sich als
PDF drucken.</p>`},

"am-positionen":{titel:"Erfasste Positionen",text:`
<p>Je Zeile Position, Beschreibung, Menge und Einheit. Beim Blitzschutzausmass
kommen Bezeichnung und Einheit aus dem Katalog.</p>`},

"am-ki":{titel:"Positionen aus einem Foto",text:`
<p>Ein Foto einer Offerte oder Liste wird ausgewertet und als Positionen
vorgeschlagen.</p>
<p>Das Ergebnis wird zuerst gezeigt und erst nach Bestätigung übernommen –
bitte vor dem Übernehmen durchsehen.</p>`},

// ---- Regierapport -------------------------------------------------------
"rapport-kopf":{titel:"Regieauftrag",text:`
<p>Wird der Rapport aus dem Cockpit angelegt, sind Projekt, Auftrags-Nr.,
Auftraggeber und Objekt bereits gefüllt.</p>
<p><b>Objekt / Gebäudeteil</b> ist etwas anderes als die Projektadresse –
hier steht, wo genau gearbeitet wurde (z. B. "Dachfläche Nord").</p>`},

"rapport-arbeit":{titel:"Ausführende Arbeiten",text:`
<p>Je Zeile Datum, Beschreibung, Mitarbeiter, Funktion und Stunden.</p>
<p>Der <b>Ansatz</b> kommt aus der Funktion (Einstellungen → Geschützt →
Funktionen / Stundenansätze). Das Total rechnet die App.</p>`},

"rapport-material":{titel:"Material",text:`
<p>Die EDV-Nr. schlägt aus dem Materialkatalog vor; Bezeichnung, Dimension,
Einheit und Preis kommen von dort.</p>
<p><b>Material, das nicht im Katalog steht:</b> die Nummern <b>999.90</b> bis
<b>999.99</b> sind freie Positionen. Bezeichnung, Dimension, Einheit und Preis
werden dann direkt in der Zeile eingetragen. Die App schlägt beim Tippen die
nächste noch freie Nummer vor.</p>`},

"rapport-liste":{titel:"Regierapporte",text:`
<p>Alle Rapporte der Firma, neueste zuerst. Der CSV-Export enthält Arbeits-
und Materialzeilen mit ihren Totalen – zur Weiterverarbeitung in der
Buchhaltung.</p>`},

// ---- Suche, Feedback, PDF ----------------------------------------------
"suche":{titel:"Suche",text:`
<p>Durchsucht Rapporte (Auftraggeber, Objekt, Auftrags-Nr.), Massaufnahmen und
Ausmasse (Bezeichnung) sowie die Projekte selbst (Adresse, Name, Auftrags-Nr.,
Auftraggeber). Projekt-Treffer stehen zuoberst.</p>
<p>Je Treffer zwei Wege: <b>📂 Projekt</b> öffnet das Cockpit und hebt den
Treffer dort hervor; das Stiftsymbol öffnet den Eintrag direkt.</p>`},

"feedback":{titel:"Feedback",text:`
<p>Rückmeldungen gehen an den Firmenadministrator und an den Betreiber der
App. Bitte den Bereich wählen und möglichst konkret beschreiben, was
passiert ist.</p>
<p>Die eingegangenen Rückmeldungen stehen in den Einstellungen im Register
"Feedback" – dort lassen sie sich sortieren, als erledigt markieren und
herunterladen.</p>`},

"pdf-listen":{titel:"PDF erstellen",text:`
<p>Hier wählst du, welche Listen auf das PDF kommen. Kopf, Projekt und
Adresse stehen immer darauf.</p>
<p>Was diese Massaufnahme nicht hat, ist ausgegraut – es entsteht nie ein
leerer Abschnitt.</p>
<p>Der Ausdruck läuft über den Druckdialog des Browsers. Dort
"Als PDF speichern" wählen, um eine Datei zu bekommen.</p>`},

// ---- Einstellungen ------------------------------------------------------
"einstellungen":{titel:"Anzeige und Geltung",text:`
<p>Diese Anzeige-Einstellungen gelten nur für <b>dieses Gerät</b>. Ein zweites
Tablet hat also seine eigenen.</p>
<p>In den Einstellungen stehen drei Arten von Werten nebeneinander:</p>
<ul>
<li><b>Nur dieses Gerät</b> – Anzeige und die Vorgabemasse der einzelnen
Massaufnahme-Arten.</li>
<li><b>Firmenweit</b> – Firma, Mitarbeiter, Stundenansätze, Materialkataloge,
Rollenbreiten und die Anschlusstypen der Rinne.</li>
<li><b>Nur für Administratoren</b> – das Register „Geschützt“ und das Register
„Feedback“.</li>
</ul>
<p>Bei jedem Abschnitt steht dabei, was davon gilt.</p>`},

"einst-rollen":{titel:"Rollenbreiten des Blechlagers",text:`
<p>Welche Blechrollen die Firma an Lager führt. Gilt <b>firmenweit</b> und
für alle Massaufnahmen mit Rollenblech-Zuschnitt.</p>
<p>In der einzelnen Massaufnahme lässt sich im Register "Zuschnitt"
einschränken, welche davon dort verwendet werden.</p>`},

"einst-massvorgaben":{titel:"Vorgabemasse",text:`
<p>Diese Werte füllen eine <b>neue</b> Massaufnahme vor und sind darin danach
frei änderbar.</p>
<p>Eine Änderung hier wirkt <b>nie rückwirkend</b> auf bereits erfasste
Massaufnahmen – eine einmal gespeicherte Massaufnahme rechnet weiter mit den
Werten, die beim Erfassen galten.</p>
<p>Die Vorgabemasse gelten je Gerät, nicht firmenweit.</p>`},

"vorlage":{titel:"Als Vorlage",text:`
<p>Übernimmt <b>Typ, Material und alle Masse</b> einer bestehenden Massaufnahme
in eine neue. Gedacht für die Konstruktion, die immer wieder gleich kommt –
statt sie jedes Mal neu einzutippen.</p>
<p>Nicht übernommen werden Bezeichnung, Notiz, Datum, <b>Fotos und Skizzen</b>
(sie zeigen ein anderes Dach) und das Projekt – die Vorlage ist gerade dann
nützlich, wenn dieselbe Konstruktion auf einer <b>anderen</b> Baustelle
wiederkommt. Das Projekt bleibt deshalb das gerade gewählte.</p>
<p>Die Kopie ist ein eigenständiger Datensatz. Sie ist mit der Vorlage nicht
verbunden: eine spätere Änderung wirkt nicht auf die andere.</p>`},
"zugangsdaten":{titel:"Zugangsdaten weitergeben",text:`
<p>Benutzername und Startpasswort des neu angelegten Kontos – zum Kopieren
oder direkt Weitergeben. <b>Das Startpasswort wird nur dieses eine Mal
angezeigt</b> und lässt sich danach nicht mehr abrufen; es liegt serverseitig
nur verschlüsselt. Geht es verloren, setzt ein Administrator in der
Mitarbeiterliste ein neues.</p>
<p>Beim ersten Anmelden muss die Person ein eigenes Passwort vergeben – das
Startpasswort gilt also nur für den einen ersten Zugang.</p>`},
"excel-import":{titel:"Liste aus Excel einlesen",text:`
<p>Eine Lieferantenliste als Excel- oder CSV-Datei einlesen, statt sie
abzutippen. Die Datei muss <b>keine bestimmte Spaltenreihenfolge</b> haben:
nach dem Auswählen wird gezeigt, welche Spalte die App wofür hält, und das
lässt sich für jedes Feld ändern.</p>
<p>Pflichtfelder sind mit einem roten Stern gekennzeichnet. Zeilen, bei denen
ein Pflichtfeld leer ist, werden <b>nicht</b> importiert – wie viele das sind,
steht über der Vorschau. Erst was in der Vorschau steht, wird auch gespeichert.</p>
<p>Der Import <b>ergänzt</b> die bestehende Liste. Es wird nichts gelöscht und
nichts überschrieben; eine bereits vorhandene Nummer kommt dadurch ein zweites
Mal in die Liste – vorher prüfen, ob sie schon da ist.</p>`},
"einst-material":{titel:"Material",text:`
<p>Diese Liste füllt das Material-Dropdown bei jeder Massaufnahme-Art. Gilt
<b>firmenweit</b>.</p>
<p>Die beiden Zahlenfelder (maximaler Abstand und Abstand ab Fixpunkt) werden
nur bei "Rinne Halbrund" und "Mauerabdeckung" für die Dehnungsabstände
gebraucht – bei allen anderen Arten leer lassen.</p>`},

"einst-rinne-typen":{titel:"Rinne Halbrund",text:`
<p><b>Normlängen:</b> in welchen Längen das Rinnenprofil je Material und
Grösse bezogen wird. Ist nichts hinterlegt, rechnet die App den
Materialbedarf nicht – statt mit einer geratenen Stangenlänge.</p>
<p><b>Anschlusstypen:</b> Ecken und Stutzen mit ihrem Zuschlag. Ob ein Typ ein
<b>Fixpunkt</b> ist, entscheidet, ob er die Rinne für die Dehnungsberechnung
teilt.</p>`},

"einst-sicherung":{titel:"Datensicherung",text:`
<p>Speichert die Einstellungen und Kataloge als Datei auf diesem Gerät.</p>
<p>Das ist <b>keine</b> Sicherung der Projekte, Massaufnahmen und Fotos –
die liegen auf dem Server und werden dort gesichert.</p>`},

"einst-firma":{titel:"Firma",text:`
<p>Firmenname, Adresse, Logo und MWST-Satz. Erscheinen im Kopf jedes PDF und
auf dem Startbildschirm.</p>
<p>Gilt <b>firmenweit</b> – eine Änderung sehen alle Mitarbeiter.</p>`},

"einst-mitarbeiter":{titel:"Mitarbeiter",text:`
<p>Hier werden Mitarbeiterkonten angelegt. Der Benutzername ist
<b>Vorname.Nachname</b>; beim ersten Anmelden wählt die Person selbst ein
Passwort.</p>
<p>Ein Passwort lässt sich zurücksetzen – die Person wählt dann beim
nächsten Anmelden wieder ein eigenes.</p>
<p>Wird ein Mitarbeiter entfernt, bleiben seine Projekte, Massaufnahmen und
Rapporte vollständig erhalten. Im Verlauf steht dann "Unbekannter
Benutzer".</p>`},

"einst-ansaetze":{titel:"Funktionen und Stundenansätze",text:`
<p>Die Funktionen, die im Regierapport zur Auswahl stehen, mit ihrem
Stundenansatz. Gilt <b>firmenweit</b>.</p>
<p>Eine Änderung wirkt nicht rückwirkend: ein bereits gespeicherter Rapport
behält seine Beträge.</p>`},

"einst-rapportmaterial":{titel:"Material (Regierapport)",text:`
<p>Der Materialkatalog für den Regierapport, mit EDV-Nr., Bezeichnung,
Dimension, Einheit und Preis. Gilt <b>firmenweit</b>.</p>
<p>Material, das hier fehlt, lässt sich im Rapport über die freien Nummern
999.90 bis 999.99 direkt eintragen.</p>`},

"einst-blitzschutz":{titel:"Blitzschutz-Katalog",text:`
<p>Der Artikelkatalog für das Blitzschutzausmass. Lässt sich als Excel-Datei
importieren.</p>`},

// ---- Betreiber ----------------------------------------------------------
"sysadmin":{titel:"System-Administration",text:`
<p>Nur für den <b>Betreiber</b> von Spengler-DIGITAL sichtbar, nicht für
Firmenadministratoren.</p>
<p>Verwaltet ausschliesslich die Firmen: Status, Testphase, Registrierung und
vollständige Löschung. Es gibt bewusst <b>keinen</b> Zugriff auf Projekte,
Massaufnahmen oder Fotos einzelner Kundenfirmen.</p>`},

"sysadmin-feedback":{titel:"Feedback aller Firmen",text:`
<p>Die Rückmeldungen aus allen Firmen – der Weg, auf dem Pilotbetriebe
Probleme melden.</p>
<p>Löschen ist hier bewusst nicht möglich: das Feedback gehört der
jeweiligen Firma.</p>`},

"verwaiste-dateien":{titel:"Verwaiste Dateien im Speicher",text:`
<p>Beim Wechseln des Firmenlogos oder aus der Zeit vor der Pfadumstellung
bleiben gelegentlich Dateien im Speicher liegen, auf die keine Massaufnahme,
kein Ausmass, kein Projekt und keine Firma mehr zeigt.</p>
<p>Sie sind für <b>niemanden</b> mehr erreichbar – auch nicht für die Firma,
von der sie ursprünglich stammen – belegen aber weiterhin Speicherplatz. Die
Liste zeigt sie mit Pfad, Grösse und Datum.</p>
<p>Es wird nichts automatisch gelöscht. Beim Löschen prüft der Server die
Liste nochmals selbst: eine Datei, auf die noch etwas zeigt, kann darüber
nicht entfernt werden.</p>`},
"warteschlange":{titel:"Wartet auf die Übertragung",text:`
<p>Ohne Verbindung – auf dem Dach, im Keller, im Funkloch – lässt sich
trotzdem erfassen: Projekt anlegen, Massaufnahme, Ausmass, Regierapport und
Feedback. Der Eintrag liegt dann auf <b>diesem Gerät</b> und wird gesendet,
sobald wieder eine Verbindung besteht. Das geschieht von selbst; mit
&bdquo;Jetzt übertragen&ldquo; lässt es sich anstossen.</p>
<p><b>Solange etwas hier steht, ist es noch nicht in der Datenbank.</b> Bitte
das Gerät nicht zurücksetzen, den Browser-Speicher nicht löschen und die App
nicht neu installieren, bevor die Liste leer ist.</p>
<p>Hat jemand anderes einen geänderten Datensatz zwischenzeitlich bearbeitet,
wird <b>nichts überschrieben</b>. Der Eintrag bleibt als Konflikt stehen, und
du entscheidest: die eigene Fassung nehmen oder verwerfen.</p>
<p>Löschen, Archivieren und die Verwaltung (Mitarbeiter, Rechte,
Einstellungen, Kataloge) brauchen weiterhin eine Verbindung.</p>`},
"rapport-fotos":{titel:"Fotos zum Rapport",text:`
<p>Fotos, die zu diesem Regierapport gehören – etwa der Zustand vor dem
Eingriff oder die ausgeführte Arbeit. Sie werden <b>mitgedruckt</b> und
stehen im Ausdruck vor den Unterschriften.</p>
<p>Ein Rapport muss dafür einem Projekt zugeordnet sein: der Speicherort
hängt am Projekt, so wie bei den Massaufnahmen.</p>`},

"einst-schnittfuge":{titel:"Schnittfuge und Reste",text:`
<p>Die <b>Schnittfuge</b> ist die Breite, die Schere oder Säge beim Trennen
wegnimmt. Sie wird bei jedem Schnitt abgezogen – sowohl beim Längsteilen der
Rolle in Streifen als auch zwischen zwei Stücken im selben Streifen.</p>
<p>Steht sie auf <b>0 mm</b>, wird gerechnet wie bisher, ganz ohne Abzug. Das
ist der Startwert: so ändert sich keine bestehende Zahl, bis der Betrieb den
echten Wert einträgt.</p>
<p><b>Reste aufheben ab</b> legt fest, wie lang ein Rest mindestens sein muss,
damit er im Reststücke-Lager vorgeschlagen wird.</p>`},

"reststuecke":{titel:"Reststücke-Lager",text:`
<p>Was beim Zuschnitt übrig bleibt und sich noch verwenden lässt. Im Register
„Zuschnitt“ einer Massaufnahme steht, welche Reste dabei anfallen – von dort
lassen sie sich mit einem Klick hier aufnehmen.</p>
<p>Beim nächsten Zuschnitt werden Reste angezeigt, die breit genug wären.
Sie werden bewusst <b>nicht automatisch eingeplant</b>: ein Rest liegt
physisch irgendwo und ist vielleicht schon verbraucht. Die Entscheidung
trifft der Spengler.</p>
<p>„Verbraucht“ nimmt einen Rest aus der Liste, ohne ihn zu löschen.</p>`},

"module-test":{titel:"Module in Entwicklung",text:`
<p>Was hier angehakt ist, sehen <b>nur Administratoren</b> – bei allen Firmen
gemeinsam. So lässt sich eine noch nicht fertige Funktion ausliefern, ohne
dass sie bei Mitarbeitern auftaucht.</p>`},

"anleitung":{titel:"Anleitung",text:`
<p>Die vollständige Bedienungsanleitung als PDF – alle Bereiche der App mit
Bildschirmfotos, Begriffserklärungen und einem Kapitel dazu, was ohne
Internet geht.</p>
<p>Sie öffnet sich in einem neuen Fenster und lässt sich von dort speichern
oder ausdrucken.</p>`}
};

// Liefert das Markup fuer einen Info-Knopf. Ohne hinterlegten Text kommt
// bewusst gar kein Knopf - lieber keiner als einer, der nichts sagt.
function hilfeKnopf(key){
 if(!HILFE_TEXTE[key])return "";
 // Beschriftung fuer Tastatur und Screenreader gleich mitgeben: ein zur
 // Laufzeit erzeugter Knopf wird von hilfeKnoepfeBeschriften() sonst nur
 // erfasst, wenn das aufrufende Modul daran denkt (v3.05).
 const wozu="Erklärung: "+HILFE_TEXTE[key].titel;
 const a=String(wozu).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 return `<button type="button" class="hilfe-knopf no-print" data-hilfe="${key}" aria-label="${a}" title="${a}">i</button>`;
}

// Der Info-Knopf einer Register-Karte. Er erscheint nur bei der HAUPTKARTE
// eines Registers - deren Titel beginnt mit der Registernummer ("4 · ...").
// Ein Register mit mehreren Karten (Rinne Halbrund, Register 3) bekommt so
// genau einen Knopf statt drei.
function hilfeKarte(titel,register){
 const m=/^\s*(\d+)\s*[·.]/.exec(String(titel||""));
 if(!m||!Array.isArray(register))return "";
 const r=register[Number(m[1])-1];
 return (r&&r.hilfe)?hilfeKnopf(r.hilfe):"";
}

// Beschriftung fuer Tastatur und Screenreader nachtragen. Wird beim Start und
// nach jedem Zeichnen aufgerufen; bereits beschriftete Knoepfe bleiben, wie
// sie sind.
function hilfeKnoepfeBeschriften(wurzel){
 const w=wurzel||document;
 w.querySelectorAll(".hilfe-knopf[data-hilfe]").forEach(b=>{
  if(b.getAttribute("aria-label"))return;
  const t=HILFE_TEXTE[b.dataset.hilfe];
  const wozu=t?"Erklärung: "+t.titel:"Erklärung anzeigen";
  b.setAttribute("aria-label",wozu);
  b.setAttribute("title",wozu);
 });
}

function hilfeOeffnen(key){
 const t=HILFE_TEXTE[key];
 const modal=document.getElementById("hilfeModal");
 if(!t||!modal)return false;
 document.getElementById("hilfeTitel").textContent=t.titel;
 document.getElementById("hilfeText").innerHTML=t.text;
 modal.hidden=false;
 const zu=document.getElementById("hilfeSchliessen");
 if(zu)zu.focus();
 return true;
}
function hilfeSchliessen(){
 const modal=document.getElementById("hilfeModal");
 if(modal)modal.hidden=true;
}

// ERFASSUNGSPHASE: laeuft vor den bubbelnden Handlern. Ohne das wuerde ein
// Info-Knopf in einer aufklappbaren Einstellungs-Ueberschrift zusaetzlich den
// Abschnitt umschalten (js/07-einstellungen.js).
document.addEventListener("click",e=>{
 const b=e.target.closest?e.target.closest(".hilfe-knopf[data-hilfe]"):null;
 if(!b)return;
 e.preventDefault();
 e.stopPropagation();
 hilfeOeffnen(b.dataset.hilfe);
},true);

const hilfeZu=document.getElementById("hilfeSchliessen");
if(hilfeZu)hilfeZu.addEventListener("click",hilfeSchliessen);

document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!document.getElementById("hilfeModal").hidden)hilfeSchliessen();
});
