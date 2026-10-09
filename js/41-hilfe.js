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
const HILFE_PDF="anleitung/Spengler-DIGITAL-Anleitung-v3.277.pdf";

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
<p>Nach jeder Arbeit landest du wieder im Cockpit desselben Projekts.</p>
<p><b>Die Oberfläche (seit v3.218 die einzige).</b> Die App ist nach dem
Arbeitsablauf gegliedert: unten eine Leiste mit Heute, Projekte, Werkstatt,
Lager und Mehr, und als Startseite deine offenen Aufgaben. Die alte,
nach Modulen gegliederte Startseite und der Umschalter dazu sind weg –
es gibt nur noch diese eine Ansicht. An den Formularen, den Daten und den
Rechten ändert das nichts.</p>
<p><b>Die Projektseite der neuen Ansicht (seit v3.203).</b> Oben stehen die
Register des Projekts: Übersicht, Offerte, Massaufnahme, Herstellung, Ausmass,
Rapport, Dateien. Jedes ist einen Griff entfernt – es gibt keinen Sammelpunkt
„Mehr“ mehr, hinter dem sich etwas versteckt.</p>
<p>Die <b>Ablaufkette</b> in der Übersicht (Offerte → Massaufnahme → Freigabe →
Rüsten → Montage → Ausmass) zeigt nicht nur, wie weit das Projekt ist – sie ist
<b>anklickbar</b>. Ein Tipp auf eine Station führt in ihr Register. Die Kette
und die Register sind damit dieselbe Landkarte, nicht zwei verschiedene.</p>
<p><b>Herstellung (seit v3.204)</b> ist der ganze Weg von der Massaufnahme zum
fertigen Teil, auf einer Seite und in der Reihenfolge der Werkstatt:
<b>1. Material &amp; Zuschnitt</b> – welches Blech, wie viele Teile, was ist schon
geschnitten – und <b>2. Rüsten &amp; Montieren</b> – wo jedes Teil steht und wer
es rüstet oder montiert. Über jedem Abschnitt steht ein Satz, wofür er da ist.
Vorher waren das zwei Register („Material“ und „Rüsten &amp; Montage“), die
dieselben Massaufnahmen zeigten, nur anders geordnet.</p>
<p><b>Blau bleibt, grau führt hinaus.</b> Ein blauer Knopf bleibt im Projekt –
zum Beispiel „Material &amp; Zuschnitt öffnen“. Ein grauer verlässt es – zum
Beispiel „Werkstatt aller Projekte öffnen“, der gemeinsame Arbeitsplatz, auf
dem die Teile aller Projekte nebeneinander stehen. Deshalb steht er zuunterst
und nicht oben.</p>`},

// ---- Arbeitsworkflow (v3.05) --------------------------------------------
"aufgaben":{titel:"Meine offenen Aufgaben",text:`
<p>Hier steht, was <b>du persönlich</b> noch erledigen musst. Die Liste ist
keine eigene Aufgabenverwaltung – sie entsteht direkt aus den Massaufnahmen
und ihren Zuweisungen.</p>
<p><b>Nach Projekt zusammengefasst</b> (ab 3.257): Was zum selben Objekt
gehört, steht beieinander. Die Liste startet <b>zugeklappt</b> – du siehst je
Projekt eine Zeile mit dem Namen, wie vielen Aufgaben dort offen sind und ob
etwas <b>dringend</b> ist. Das reicht, um zu entscheiden, wo du anfängst; ein
Tipp darauf klappt das Projekt auf. <b>„Alle aufklappen"</b> im Kopf zeigt
alles auf einmal.</p>
<div class="hin">Was du aufklappst, bleibt auf diesem Gerät <b>gemerkt</b> –
auch nach dem Neuladen, bis du es wieder zuklappst. Gemerkt wird das
<em>Aufgeklappte</em>: eine neu dazukommende Baustelle ist deshalb zu, wie
alle anderen auch.</div>
<div class="hin">Die <b>Reihenfolge ändert sich durch das Gruppieren nicht</b>:
Dringendes steht weiterhin zuoberst. Ein Projekt steht dort, wo seine
dringendste Aufgabe stünde – nicht alphabetisch.</div>
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
<p>Die Liste steht auf der Seite <b>Heute</b> offen da. Neben der Überschrift
steht, wie viele Aufgaben offen sind; die dringenden sind rot gekennzeichnet
und stehen zuoberst. Ist nichts offen, steht das auch so da.</p>
<p><i>Seit v3.218:</i> Die zuklappbare Karte des alten Startbildschirms und
die Einstellung „zugeklappt / geöffnet“ dazu sind mit der alten Ansicht
entfallen.</p>
<p><b>🗓 Terminieren</b> (seit v3.185): Damit verschwindet eine Aufgabe aus
der Liste, bis das gewählte Datum da ist – für Ferien oder eine Montage, die
erst in einem Monat stattfindet. Über der Liste steht dann
<b>„x terminiert – anzeigen“</b>; nichts geht verloren, und mit
<b>Termin aufheben</b> ist die Aufgabe sofort zurück.</p>
<div class="hin">Der Termin gilt für <b>einen Schritt</b>, nicht für die ganze
Massaufnahme: wer das Rüsten verschiebt, verschiebt nicht auch das Montieren.
Und er gilt nur für die <b>eigene</b> Liste – die Liste eines Kollegen bleibt
unberührt.</div>
<div class="hin">Am <b>Ablauf ändert sich nichts</b>. Im Projekt, in der
Werkstatt und in der Übersicht der Firmenleitung bleibt die Massaufnahme
sichtbar. Ein Termin räumt die eigene Startseite auf – er lässt keine Arbeit
verschwinden. Der Zähler oben zählt deshalb die <b>sichtbaren</b> Aufgaben,
nicht die terminierten dazu.</div>
<p>Ein Datum in der Vergangenheit oder auf heute wird abgewiesen: es würde
nichts ändern.</p>`},

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
(Einstellungen → Firma → Massaufnahme-Materialien). Hier wird nichts
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
<p><b>Auswahl:</b> mit den Kästchen bei „Berücksichtigte Massaufnahmen“ lässt
sich eine Massaufnahme vorübergehend ausschliessen, z. B. wenn sie noch
nicht bestätigt ist. Die Auswahl wird am Projekt gespeichert und bleibt
auch nach dem erneuten Öffnen erhalten – neu angelegte Massaufnahmen sind
automatisch dabei.</p>
<p>Der Knopf „🖨️ Rüstliste“ druckt genau die ausgewählten Massaufnahmen –
derselbe Ausdruck wie bei „Material & Zuschnitt“ und der Werkstatt. Unter
„Herkunft der Stücke“ lässt sich jedes Stück direkt abhaken; das Häkchen
gehört dabei immer zu seiner eigenen Massaufnahme (ihrer eigenen
Stücknummer), nicht zu einer hier neu vergebenen Zählung.</p>
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
<p><b>Wichtig beim Modul „Zuschnitt und Abhaken“:</b> daran hängt nicht nur
die projektweite Zusammenfassung, sondern auch das <b>Abhaken einzelner
Zuschnitte</b> – in der Massaufnahme, auf der Seite „Material &amp; Zuschnitt“
und in der Werkstatt. Ist es aus, steht die Zuschnittliste zwar da, die
Positionsnummern lassen sich aber nicht antippen. Die App sagt das an Ort und
Stelle und bietet Administratoren dort gleich den Schalter an.</p>
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
"ruestblatt":{titel:"Rüstblatt",text:`
<p>Das <b>Wichtigste einer Massaufnahme auf einen Blick</b>: das vermasste
Profil, der Grundriss (wenn die Art einen hat), Material und Stärke, und die
Zuschnittliste mit den Stücknummern zum Abhaken. Sonst nichts.</p>
<p>Es ist <b>kein Formular</b> – es gibt nichts zu tippen. Wer wirklich etwas
ändern will, tippt auf <b>„Im Formular öffnen“</b> und kommt danach wieder
hierher zurück.</p>
<p>Dasselbe Blatt steht an vier Stellen: in der Werkstatt (nach Projekt und
nach Material), auf der Seite „Material &amp; Zuschnitt“ und auf der
Projektseite. In der Liste klappt es unter der Zeile auf; <b>„Gross
ansehen“</b> zeigt es bildschirmfüllend – für die Abkantbank.</p>
<p>Gezeichnet wird aus dem <b>gespeicherten</b> Stand der Massaufnahme, mit
demselben Zeichner wie der Ausdruck. Hier wird nichts neu gerechnet: was auf
dem Blatt steht, steht auch auf der Rüstliste.</p>`},

"werkstatt":{titel:"Werkstatt und Rüsten",text:`
Hier steht, was freigegeben und zum Rüsten oder Montieren eingeteilt ist.
Es ist dieselbe Arbeitsliste wie auf der Startseite, nur aus Sicht der
Werkstatt.
<p><b>Zwei Blicke auf dasselbe (seit v3.153).</b> <b>Nach Projekt</b>
beantwortet „was gehört zusammen“ – mit dem roten Faden, den Stationen und
dem Abhaken. <b>Nach Material</b> beantwortet „was kommt von derselben
Rolle“: alle Zuschnitte einer Materialstärke zusammengezählt, quer über
Projekte hinweg. Das ist die Reihenfolge, in der tatsächlich gerichtet wird –
einmal zur Rolle, alles davon schneiden, weglegen.</p>
<p><b>Suchen statt scrollen (seit v3.217).</b> Über der Liste steht ein
Suchfeld. Gesucht wird in dem, was auf der Karte steht: Objekt, Projektname,
Auftrags-Nr., Kunde, Bezeichnung und Art der Massaufnahme. Mehrere Wörter
suchen zusammen („kirch rinne“ findet die Rinne an der Kirchgasse). Eine
reine Zahl muss als ganze Zahl vorkommen – „Musterstrasse 3“ findet nicht
jede Adresse mit der Postleitzahl 3000. Das ✕ leert die Suche; beim nächsten
Öffnen der Werkstatt ist sie ohnehin wieder leer.</p>
<p>Die Materialsicht ist eine <b>Rüstliste</b>, kein zweiter Arbeitsplatz:
abgehakt wird weiterhin an der Massaufnahme, denn dort stehen die
Stücknummern. Ein Tipp auf eine der Massaufnahmen führt hin. Der Filter
oben (Alle / Zu rüsten / Zu montieren / Nur meine) wirkt auf beide Sichten.</p>
<p>Getrennt wird nach Material <em>und</em> Stärke: 0,7er und 0,8er Titanzink
kommen von verschiedenen Rollen. Steht bei einer Massaufnahme kein Material,
erscheint sie in dieser Sicht unter „Ohne Material“.</p>

Ganz oben steht, was insgesamt ansteht. Jedes Projekt trägt darunter seinen
<b>nächsten Schritt</b> und eine Leiste mit den vier Stationen – Reserviert,
Zugeschnitten, Gerüstet, Montiert. Ein Häkchen heisst erledigt, das blaue
Dreieck ist der Schritt, der jetzt dran ist. Die Projekte stehen in genau
dieser Reihenfolge: was zuerst drankommt, steht oben. Die Massaufnahmen, um
die es beim jetzigen Schritt geht, sind blau markiert und stehen zuoberst.

Die Werkstatt ist zuerst eine <b>Liste</b>: je Projekt seine Massaufnahmen,
mehr nicht. Ein Tipp auf eine Zeile klappt sie auf – und dann steht alles da,
was zum Rüsten gebraucht wird: die <b>vermasste Skizze</b> (Profil oder
Schnitt) und der <b>Grundriss</b>, soweit es für diese Art einen gibt, darunter
die <b>abhakbare Zuschnittliste</b>. Bewusst nichts sonst aus der
Massaufnahme – Notiz, Fotos und alle Eingabemasse bleiben im Formular, das
sich mit „✂️ Im Formular öffnen“ erreichen lässt.

Die Skizze trägt seit Version 3.32 ihre <b>Masse</b>: Mass A, Restbreite und
die Umschläge beim Einlaufblech, die variablen Masse A/B/C beim Rinnenprofil,
die Stücklängen im Grundriss und bei der Kamineinfassung zusätzlich die
Breite vorne und hinten. Angeschrieben wird nur, was wirklich erfasst ist –
steht ein Wert nicht im Datensatz, bleibt es bei der Bezeichnung ohne Zahl.
Wo eine Zahl zu stehen kommt, entscheidet die App so, dass sich keine zwei
Masse verdecken; reicht der Platz nicht, weicht die Zahl weiter nach aussen
aus und ein feiner Strich zeigt, wozu sie gehört.

Nicht jede Art hat eine Zeichnung. Kehle und Skizze/Foto rechnen nur
beziehungsweise halten das Foto selbst; dort steht das ausdrücklich da,
statt einen leeren Rahmen zu zeigen.

Die Zuschnittliste erscheint auch dann, wenn das Modul „Zuschnitt und
Abhaken“ aus ist. Abhaken lässt sie sich in diesem Fall nicht; warum, steht
unter der Liste, und ein Administrator kann das Modul dort mit einem Tipp
einschalten.

Eine Station erscheint nur, wenn das zugehörige Modul eingeschaltet ist –
sonst gäbe es dazu keinen ablesbaren Zustand. Reserviert und Zugeschnitten
kommen aus dem Status der Reservierungen, Gerüstet und Montiert aus dem
Arbeitsstatus der Massaufnahmen. Es wird nichts geschätzt.

Steht als nächster Schritt „Material reservieren" oder „Zuschneiden", trägt
der Streifen einen Knopf, der genau das für das ganze Projekt auf einmal
erledigt – „📦 Alle reservieren (5)". Die Zahl ist die Zahl der Positionen,
die noch dahinter stehen; was schon weiter ist, bleibt unberührt.

Je Massaufnahme steht eine Karte, und <b>die Zuschnittliste steht darin
sofort</b> – kein Aufklappen, kein zweiter Klick. <b>Jede Positionsnummer ist
ein Knopf</b>: ein Tipp hakt dieses Blech als zugeschnitten ab, ein zweiter
nimmt es zurück. Es ist derselbe Haken wie im Formular der Massaufnahme,
nicht ein zweiter. Der Stand („2 von 3 zugeschnitten") steht auf der Karte,
im Streifen des Projekts und ganz oben für alle Projekte zusammen.

Ist an einer Massaufnahme <b>alles geschnitten</b>, klappt ihre Liste zu und
die Karte wird grün – was noch offen ist, steht damit vorne. „▸ Zuschnittliste
zeigen" holt sie zurück. Wer gerade an einer Karte abhakt, behält sie offen,
auch wenn das letzte Stück sie fertig macht. Unter der fertigen Liste steht
dann <b>„✓ Rüsten bestätigen"</b> – der Schritt, der als nächstes ohnehin
kommt, dort wo man gerade hinschaut. Bestätigt wird nichts von selbst.

<b>Ohne Verbindung</b> lässt sich weiter abhaken. Der Haken wird gestrichelt
dargestellt und wandert in die Warteschlange; übertragen wird er, sobald
wieder Netz da ist. Hat sich der Zuschnitt zwischenzeitlich geändert, wird
<b>nichts</b> geschrieben – der Eintrag bleibt als Konflikt stehen und ist zu
entscheiden.

Wer auf einem Haken verweilt, sieht, <b>wer ihn gesetzt hat und wann</b>.

<b>„🖨️ Rüstliste"</b> im Projektkopf druckt ein Blatt zum Mitnehmen: alle
Zuschnitte mit Kästchen zum Abhaken von Hand, bereits geschnittene Stücke
angekreuzt. Das <b>🖨️</b> an einer Karte druckt dasselbe für nur diese eine
Massaufnahme.

Der gewählte Filter (Alle, Zu rüsten, Zu montieren, Nur meine) bleibt auf
diesem Gerät gemerkt.

Wer die ganze Massaufnahme sehen will, kommt mit <b>„✂️ Im Formular"</b> direkt
in ihr Zuschnitt-Register; „Zurück" führt in die Werkstatt.

Ganz unten klappt <b>„Material und Reservierungen"</b> auf, was für dieses
Projekt gebraucht wird – dieselben Zahlen wie im Projekt selbst, es wird
nichts neu gerechnet. Dort steht nur, was man wirklich aus dem Lager holt:
Blech, Halbfabrikate, Zuschnitte. Abgeleitete Masse (Abwicklung, Blechfläche,
Stückzahl) sind Rechenergebnisse und bleiben weg; wie viele es sind, steht
darunter. Aufräumen lassen sie sich im Projekt unter „Material &amp;
Zuschnitt".

Wurde eine Massaufnahme nach ihrer Freigabe geändert, steht das rot dabei
und sie lässt sich nicht bestätigen. Zuerst muss sie erneut freigegeben
werden – damit niemand nach einem überholten Stand rüstet.`},
"cockpit-reservierung":{titel:"Materialreservierung",text:`
Hier steht, was für dieses Projekt gebraucht, reserviert, zugeschnitten und
gerüstet ist. „Bedarf übernehmen" holt genau das, was die Massaufnahmen dieses
Projekts bereits ausgerechnet haben – es wird nichts neu gerechnet und nichts
erfunden.

<b>Was übernommen wird:</b> die <b>Zuschnitte</b> und die <b>Teile</b> –
Halbfabrikate und gekaufte Artikel wie Dilas, Rinnenböden, Rinnenhalter,
Stutzen, Winkel, Schieber, Bleilappen oder GAVA-Bleche. <b>Abgeleitete Masse</b>
(Abwicklung, Blechfläche, Stückzahlen, Blechstösse, Gehrungen) kommen nicht
mit: das sind Zahlen über die Arbeit, nichts, was jemand aus dem Lager holt.
Entschieden wird das nicht am Namen, sondern von der Massaufnahme selbst.
Eine Massaufnahme, die vor Version 3.17 zuletzt gespeichert wurde, trägt diese
Angabe noch nicht – dort beantwortet die App die Frage über die Art der
Massaufnahme, also aus derselben Quelle. Geraten wird nichts.

<b>Zeilen aus einer früheren Übernahme:</b> was vor Version 3.18 übernommen
wurde, steht weiterhin in der Liste – auch die abgeleiteten Masse. Sie sind
als „abgeleitetes Mass" gekennzeichnet, und der Knopf
<b>„🧹 Abgeleitete Masse entfernen"</b> räumt genau sie weg. Zuschnitte und
Teile bleiben dabei stehen.

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
<p>Oben stehen die Kennzahlen, darunter das Material nach Werkstoff, darunter
die Zuschnitte – eine Karte je Massaufnahme, offene und teilweise zugeschnittene
zuerst. <b>Die Zuschnittliste steht seit Version 3.25 gleich auf der Karte</b>,
genau wie in der Werkstatt: Seite öffnen, Stück antippen, fertig. Gerechnet wird
dabei nichts – es ist dieselbe Liste wie im Register „Zuschnitt“ und im PDF.</p>
<p>Zugeklappt bleibt sie nur, wenn <b>alles geschnitten</b> ist oder die
Massaufnahme <b>noch nicht freigegeben</b> ist; dann steht dort
<span class="tasten">▸ Zuschnittliste zeigen</span>. Eine noch nicht freigegebene
Massaufnahme trägt ihren Arbeitsstatus und den Hinweis, dass hier noch nichts
geschnitten werden sollte – blockiert wird nichts.</p>
<p><b>Ein Tap auf eine Positionsnummer hakt dieses Stück als zugeschnitten
ab</b>, nochmals tippen nimmt den Haken zurück. Bei mehreren gleichen
Zuschnitten steht daneben „2/3 zugeschnitten“ und
<span class="tasten">✓ alle</span> hakt die ganze Zeile ab. Die Seite zeichnet
sich dabei nicht neu, es springt also nichts weg. Wer wann abgehakt hat, steht
im Änderungsverlauf.</p>
<p><span class="tasten">✂️ Im Formular</span> öffnet die Massaufnahme auf ihrem
Zuschnitt-Register; <span class="tasten">Abbrechen</span> führt von dort wieder
auf diese Seite zurück. <span class="tasten">🖨️ Rüstliste</span> druckt das
Blatt dieser einen Massaufnahme, die Überschrift der Seite das des ganzen
Projekts.</p>
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
Foto ändern nichts an der Freigabe.</p>
<p><b>Montage geplant am</b> (ab 3.160): hier lässt sich eintragen, wann
montiert werden soll. Das ist <i>Planung</i> und kein Arbeitsschritt – der
Termin lässt sich jederzeit verschieben oder wieder entfernen, und er
<b>lässt eine Freigabe nicht verfallen</b>. Eintragen darf ihn, wer auch
Rüster und Monteur einteilen darf. Steht ein Termin, zeigt die Startseite
unter „Anstehende Montage" den Tag im Klartext („morgen", „in 2 Tagen");
steht keiner, sagt sie weiterhin nur, seit wann die Teile bereitliegen –
geschätzt wird kein Datum. Nicht zu verwechseln mit <b>Montiert</b>: das
ist der Vollzug, also wann tatsächlich montiert wurde.</p>`},

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
<p>Ein Projekt braucht <b>Projektname, Auftrags-Nr. und Adresse</b>. Der
Auftraggeber ist freiwillig. Auftrags-Nr. und Auftraggeber werden in den
Regierapport übernommen.</p>
<p><b>Zugeteilt an</b> (ab 3.255): Wer auf die Baustelle geht, lässt sich
<b>schon beim Anlegen</b> ankreuzen – mehrere Personen sind möglich. Es ist
dieselbe Liste wie später in den Stammdaten des Projekts; was hier gesetzt
wird, steht dort und lässt sich jederzeit ändern.</p>
<div class="hin">Die Zuteilung entscheidet, bei wem das Projekt auf der
Startseite unter <b>„Offene Projekte"</b> erscheint – <b>nicht</b>, wer es
sehen darf. Über „Projekte" und die Suche bleibt jedes Projekt der Firma für
alle erreichbar. Kreuzt niemand jemanden an, erscheint es bei der Person, die
es angelegt hat; der Satz unter der Liste sagt das jeweils.</div>
<p>Steht im Feld <b>Auftraggeber</b> ein Kunde, bei dem schon Projekte
laufen, schlägt die App vor, wer dort sonst zugeteilt ist – zum Antippen.
Angekreuzt wird nichts von selbst.</p>
<p><b>Die Auftrags-Nr. gibt es je Firma nur einmal</b> (ab 3.164). Wird eine
Nummer eingegeben, die schon vergeben ist, meldet die App, zu welchem Projekt
sie gehört, und speichert nicht. So entstehen nicht zwei Projekte zur selben
Baustelle, auf die sich Massaufnahmen, Rapporte und Ausmasse dann aufteilen
würden.</p>
<div class="hin">Verglichen wird ohne Rand-Leerzeichen und ohne Gross-/
Kleinschreibung: „176712", „176712&nbsp;" und „A-77" / „a-77" gelten je als
dieselbe Nummer. Archivierte Projekte zählen mit – eine bereits benutzte
Nummer bleibt belegt, sonst wäre später nicht mehr nachvollziehbar, zu
welchem Auftrag ein alter Rapport gehört. Andere Firmen haben ihre eigenen
Nummernkreise und stören sich gegenseitig nicht.</div>
<p><b>Suchen:</b> das Suchfeld durchsucht Adresse, Projektname, Auftrags-Nr.
und Auftraggeber.</p>
<p><b>Status:</b> wird von Hand gesetzt und beschreibt den geschäftlichen
Zustand – Offen, In Arbeit, Abgeschlossen, Storniert. Die App leitet ihn
nicht aus den Daten ab: ein Projekt mit fünf Massaufnahmen kann geschäftlich
weiterhin offen sein.</p>
<p><b>Archiv:</b> aktive und archivierte Projekte sind zwei getrennte
Ansichten. Setzt du ein Projekt auf <b>Abgeschlossen</b>, fragt die App gleich
danach, ob es archiviert werden soll – es wird <b>nie ohne deine Bestätigung</b>
archiviert. Wählst du „Abbrechen", bleibt es abgeschlossen und sichtbar, bis es
jemand bewusst archiviert. Archivierte Projekte findest du unter „Archiv und
Filter"; dort lassen sie sich auch wieder reaktivieren.</p>
<p><b>Zugeteilt an</b> (ab 3.160er-Reihe): im Formular „Stammdaten bearbeiten"
lässt sich ankreuzen, wer an diesem Projekt arbeitet – auch mehrere. Auf der
<b>Startseite</b> erscheint das Projekt unter „Offene Projekte" dann nur noch
bei diesen Personen, zusammen mit seinen „Wichtigen Hinweisen".</p>
<div class="hin">Das ist eine <b>Anzeige</b>, keine Sperre. Über „Projekte"
und die Suche bleibt jedes Projekt für alle in der Firma erreichbar – wer
kurz in eine fremde Baustelle schauen muss, kann das. Und über den Umschalter
<b>„Alle"</b> direkt über der Liste sieht man jederzeit wieder den ganzen
Betrieb.</div>
<p><b>Das Zählwerk</b> (ab 3.170): Unter der Ankreuzliste steht, wer bei
<b>diesem Auftraggeber</b> sonst zugeteilt ist – mit der Zahl dazu und zum
Antippen. Derselbe Kunde hat oft mehrere Objekte, und wer seine Baustellen
betreut, ist meistens dieselbe Person. <b>Angekreuzt wird nichts von
selbst</b>; die Zuteilung bleibt eine Entscheidung.</p>
<p>Ist <b>niemand</b> zugeteilt, gilt die Person, die das Projekt angelegt
hat. Deshalb ändert sich für bestehende Projekte zunächst nichts; die
Trennung greift dort, wo wirklich jemand zugeteilt wird. Sobald mindestens
eine Person angekreuzt ist, zählt nur noch die Zuteilung – wer das Projekt
angelegt hat, fällt dann heraus, wenn er nicht selbst dabei ist.</p>`},

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
sich die Bilder direkt ansehen, ohne die Massaufnahme zu öffnen.</p>
<p><b>Archiv:</b> Schliesst du eine Massaufnahme ab, fragt die App gleich danach,
ob sie archiviert werden soll – wie beim Projekt, nie ohne deine Bestätigung.
Archivierte stehen nicht mehr in der Liste; <b>🗄 Archivierte anzeigen</b> zeigt
sie, <b>↩️ Reaktivieren</b> holt eine zurück. An jeder abgeschlossenen Massaufnahme
steht auch ein Knopf <b>📦 Archivieren</b>. Material-Bedarf, Zuschnitt und
Rüstliste rechnen weiter mit allen Massaufnahmen des Projekts, auch den
archivierten.</p>`},

"cockpit-angebote":{titel:"Offerte im Projekt",text:`
<p>Alle Offerten dieses Projekts. Diese Karte ist nur sichtbar, wenn die
Offertenfunktion für dich freigeschaltet ist – ein Administrator schaltet
das in den Mitarbeiter-Einstellungen frei.</p>
<p>Eine Offerte hält fest, <b>was dem Kunden angeboten wurde</b> – unabhängig
von Massaufnahme, Produktion und Ausmass. Eine bestehende Offerte lässt sich
per Foto einlesen, die erkannten Positionen werden vor dem Speichern
angezeigt und lassen sich bearbeiten.</p>
<p>Je Eintrag: <b>Öffnen</b> zum Ansehen/Weiterbearbeiten, das Kreuz löscht.</p>`},

// v3.37: Leistungen + zentrale Ausmass-Vorbereitung. Neue Ebene zwischen
// Offerte und Massaufnahme - siehe js/65-leistungen.js.
"cockpit-leistungen":{titel:"Leistungen im Projekt",text:`
<p>Eine <b>Leistung</b> ist eine konkrete auszuführende Arbeit – z. B.
"Dachentwässerung komplett" oder "Mauerabdeckung Nordseite". Sie kann aus
einer Offertenposition entstehen, muss aber nicht: eine Zusatzleistung ohne
Offertenbezug ist genauso möglich.</p>
<p>Eine Massaufnahme bleibt dabei immer <b>rein technisch</b> (Stücke,
Zuschnitte, Blechfläche …) – diese Werte werden nirgends automatisch in eine
Leistung kopiert. Eine Leistung lässt sich mit einer oder mehreren
Massaufnahmen verknüpfen, ohne dass sich an der Massaufnahme selbst etwas
ändert.</p>
<p>Der <b>Ausführungsstatus</b> (Nicht ausgeführt/Teilweise/Vollständig,
ausgeführte Menge, Bemerkung) gehört zur Leistung – nicht zu einzelnen
Massaufnahme-Positionen.</p>`},

"leistung":{titel:"Leistung erfassen",text:`
<p>Bezeichnung ist die einzige Pflichtangabe. Menge/Einheit sind optional
(z. B. "24.50 m" oder "1.00 Stk.").</p>
<p>Eine Offertenposition ist optional wählbar – ohne Auswahl ist es eine
Zusatzleistung. Die Ausführung wird direkt hier festgehalten, unabhängig
von den technischen Werten der verknüpften Massaufnahmen.</p>`},

"leistung-angebot":{titel:"Aus einer Offertenposition",text:`
<p>Die Liste zeigt alle Positionen der Offerten dieses Projekts. Eine
Auswahl übernimmt Bezeichnung, Menge und Einheit als Vorschlag – die
Offertenposition selbst bleibt unverändert, es wird nur eine Referenz
gespeichert.</p>`},

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
gefüllt.</p>
<p><b>Worum es geht</b> (ab 3.165): unter den Kopfdaten steht in einer Zeile,
was in diesem Rapport erfasst ist – die Arbeitstexte, die Stundensumme und
die Anzahl Materialzeilen. Bei mehreren Rapporten zur selben Baustelle sah
man vorher nur fünfmal dasselbe Datum und musste jeden einzeln öffnen.</p>
<div class="hin">Diese Zeile wird <b>abgeleitet</b>, nicht getippt: sie
rechnet sich aus dem, was im Rapport ohnehin steht. Deshalb gilt sie auch
für alle bestehenden Rapporte, und sie ändert sich mit, wenn jemand die
Arbeitszeilen anpasst. Ist im Rapport noch nichts erfasst, bleibt die Zeile
ganz weg – eine leere Zeile sähe aus wie eine Aussage.</div>`},

"cockpit-dateien":{titel:"Dateien und Fotos",text:`
<p>Pläne, PDF, Fotos und weitere Projektunterlagen – höchstens
<b>50 MB pro Datei</b>.</p>
<p>Bilder bekommen ein Vorschaubild, andere Dateien ein Typ-Symbol. Je Datei:
öffnen, umbenennen, ersetzen, löschen. Die neueste Änderung steht zuoberst.</p>`},

"cockpit-fotos":{titel:"Alle Fotos",text:`
<p>Jedes Bild dieses Objekts an <b>einem</b> Ort – zusammengetragen aus den
Massaufnahmen (Fotos <i>und</i> Skizzen), dem Ausmass, den Regierapporten,
den Offerten und den Projektdateien.</p>
<p>Unter jedem Bild steht, <b>woher es stammt</b>: die Art und der Titel der
Massaufnahme, das Datum des Rapports, der Dateiname. Gibt es mehrere Bilder
derselben Herkunft, sind sie durchnummeriert („Foto 2/3").</p>
<p>Die Wand ist <b>chronologisch sortiert – das Neueste zuerst</b>. Das Datum an
jedem Bild ist das des <i>Eintrags</i> (der Massaufnahme, des Rapports, des
Hochladens), nicht das Aufnahmedatum des Fotos: wann ein Bild wirklich gemacht
wurde, weiss die App nicht. Alle Fotos derselben Massaufnahme tragen deshalb
dasselbe Datum. Bilder ohne Datum stehen am Ende.</p>
<p>Mit der <b>Filterleiste</b> darüber lässt sich eine Herkunft allein anzeigen –
etwa nur die Rapportfotos. Angeboten werden nur Herkünfte, die in diesem Projekt
wirklich Bilder haben, mit der Anzahl dahinter. Die Zahl in der Überschrift bleibt
dabei die Gesamtzahl des Projekts. „Alle" zeigt wieder alles.</p>
<p>Ein Tipp auf ein Bild zeigt es gross. Es ist eine reine Übersicht –
hinzugefügt und gelöscht werden Bilder weiterhin dort, wo sie hingehören:
in der Massaufnahme, im Rapport oder unter „Dateien/Fotos".</p>
<p>Die Vorschauen werden erst geladen, wenn der Abschnitt aufgeklappt ist.</p>
<p><b>🖨️ Fotodokumentation</b> druckt die Bilder auf Papier bzw. als PDF –
mit Firmenkopf, Projekt und Auftraggeber, und unter jedem Bild wieder die Herkunft.
Das ist das Blatt, das der Kunde nach der Sanierung bekommt oder das bei einer
Reklamation auf den Tisch kommt. Gedruckt wird <b>genau das, was die Wand gerade
zeigt</b>: ist eine Herkunft gefiltert, kommen nur deren Bilder aufs Blatt, und der
Ausdruck sagt selbst, dass er ein Auszug ist.</p>
<p>Auf eine A4-Seite kommen <b>vier Bilder</b> (zwei Spalten, zwei Reihen), auf die
Folgeseiten ohne Briefkopf <b>sechs</b>. Jede Kachel ist gleich gross, egal ob das Foto
hoch oder quer aufgenommen wurde – es wird nichts abgeschnitten, hochkant aufgenommene
Bilder bekommen seitlich Luft.</p>
<p>Der Druck wartet, bis wirklich jedes Bild geladen ist – bei vielen Fotos dauert
das einen Moment. Liesse sich ein Bild nicht laden, steht an seiner Stelle ein
Platzhalter mit der Herkunft, und der Ausdruck sagt oben, wie viele es betrifft:
es verschwindet keines stillschweigend.</p>`},

"verlauf":{titel:"Änderungsverlauf",text:`
<p>Wer hat wann was gemacht – für dieses Projekt <i>und</i> seine
Massaufnahmen, Ausmasse und Rapporte. Jede Massaufnahme hat zusätzlich ihren
eigenen Verlauf.</p>
<p>Bei einer Änderung steht dabei, <b>welches Feld</b> sich wie geändert
hat. Die zwei Filterreihen (Entität und Aktion) lassen sich frei
kombinieren.</p>
<p>Abgehakte <b>Zuschnittstücke</b> werden in der Anzeige zusammengefasst:
statt 41 gleicher Zeilen steht „41 Stücke zugeschnitten" mit der Zeitspanne.
Gebündelt wird nur, was von derselben Person, an derselben Massaufnahme und
innerhalb einer halben Stunde passiert ist. In der Datenbank steht weiterhin
jede einzelne Zeile – zusammengefasst wird nur, was man liest.</p>
<p>Ein gelöschter Eintrag bleibt im Verlauf stehen. Wurde ein Mitarbeiter
entfernt, steht dort "Unbekannter Benutzer". Gezeigt werden die letzten
50 Einträge.</p>`},

// ---- Massaufnahme allgemein --------------------------------------------
"meas-arten":{titel:"Welche Funktion?",text:`
<p>Dreizehn Fachfunktionen. <b>Skizze/Foto</b> rechnet nichts und dient nur der
Dokumentation; die übrigen zwölf führen dich über <b>Register</b> Schritt
für Schritt durch die Erfassung.</p>
<p>Die Art lässt sich später nicht mehr wechseln – eine falsch gewählte
Massaufnahme wird gelöscht und neu angelegt.</p>`},

"zaehlwerk":{titel:"Was die App gelernt hat",text:`
<p>Alles, was das <b>Zählwerk</b> aus den Daten dieser Firma zählt – und wo
es in der App auftaucht. Bis hierher war die Zählung nur an ihren Wirkungen
zu erkennen: eine andere Reihenfolge in der Suche, ein Vorschlag am Feld.
Hier steht sie auf einmal.</p>
<p><b>Gerechnet, nicht gespeichert.</b> Die Zahlen entstehen beim
Nachschlagen aus euren Rapporten, Massaufnahmen und Ausmassen. Es gibt
deshalb nichts, was sich hier geradebiegen liesse: „4× benutzt“ heisst, dass
es in vier gespeicherten Datensätzen steht. Stimmt die Zahl nicht, stimmt
einer dieser Datensätze nicht – und der gehört dort korrigiert, wo er
erfasst wurde. Ein Korrekturfeld an dieser Stelle wäre eine zweite Wahrheit,
die nach dem ersten vergessenen Fall dauerhaft falsch wäre.</p>
<p><b>Widersprechen geht trotzdem:</b> der Schalter ganz unten nimmt die
Hinweise zurück. Die App verhält sich dann wie vor Version 3.168 – keine
geänderte Reihenfolge, keine Vorschläge, keine Hinweise. Diese Übersicht
bleibt, damit nachsehbar ist, worauf gerade verzichtet wird. Ändern darf den
Schalter ein Administrator; er gilt für die ganze Firma.</p>
<div class="hin">Gezählt wird ausschliesslich innerhalb der <b>eigenen
Firma</b>. Die Sichten laufen mit <i>security_invoker</i>, es greift also
dieselbe Zugriffskontrolle wie überall sonst.</div>`},

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
<b>letzten Register</b>. Der Knopf "Fertig" springt direkt dorthin.</p>
<p><b>Seit Version 3.122</b> gibt es zwei getrennte Knöpfe:
„📷 Foto aufnehmen" öffnet direkt die <b>Kamera</b> des Geräts,
„🖼️ Aus Galerie wählen" die <b>Galerie</b> – dort auch mehrere
Fotos auf einmal. Vorher entschied das Gerät selbst, was ein Antippen
öffnet, und bot je nach Modell nur eines von beidem an.</p>`},

// ---- Register, die in mehreren Funktionen gleich sind --------------------
"reg-grunddaten":{titel:"Grunddaten",text:`
<p>Was für die ganze Massaufnahme gilt: Material und die Masse, die sich von
Stück zu Stück nicht ändern.</p>
<p>Der <b>Werkstoff</b> (Kupfer, Titanzink …) kommt aus der Liste der Firma
(Einstellungen → Massaufnahmen → Werkstoffe). Bei Dachrinne und
Mauerabdeckung steuert er zusätzlich die Dehnungsabstände.</p>
<p>Bis Version 3.175 hiess dieses Feld „Material“ – genauso wie der
Materialkatalog im Regierapport und der Materialbestand im Lager. Drei
verschiedene Dinge, ein Wort. Seit 3.176 heisst hier <b>Werkstoff</b>, was
ein Werkstoff ist.</p>
<p><b>Das Zählwerk</b> (ab 3.173): Neben einer noch leeren Auswahl steht,
was dieser Betrieb an derselben Stelle üblicherweise nimmt – „3× gewählt:
Prefa 0.7 braun“. Antippen übernimmt es. Das gilt fürs Material in jeder
Art und zusätzlich für <b>Abwicklung</b> und <b>Montageseite</b> beim
Einlaufblech (gerade und konisch) sowie für die Abwicklung der Kehle.</p>
<div class="hin">Diese drei Felder starten mit einer fest einprogrammierten
Vorgabe (Abwicklung 250 mm, Montage von links, Kehle 500 mm). Das sind
Annahmen aus der Entwicklung, nicht die Gewohnheit eines bestimmten
Betriebs – deshalb darf der Hinweis sie in Frage stellen. Sobald jemand
selbst etwas anderes gewählt hat, <b>schweigt die App</b>: eine eigene
Entscheidung wird nicht kommentiert.</div>`},

"reg-zuschnitt":{titel:"Zuschnitt aus Rolle oder Tafel",text:`
<p>Ob aus <b>Rollenblech</b> oder aus <b>Tafelmaterial</b> geschnitten wird,
steht im Registernamen und in jeder Überschrift. Woher die Entscheidung kommt,
erklärt der Info-Knopf beim Feld <i>Rolle oder Tafel</i> in den Grunddaten.</p>
<p>So kommt die Rechnung zustande:</p>
<ul>
<li>Aus dem Ausgangsmaterial wird ein <b>Abschnitt</b> abgezogen – von der
Rolle so lang wie das längste Blech, bei einer Tafel so lang wie die Tafel
selbst.</li>
<li>Der Abschnitt wird quer in <b>Streifen</b> der Abwicklungsbreite
geteilt.</li>
<li>In einem Streifen dürfen mehrere Stücke hintereinander liegen, solange
sie zusammen in einen Abschnitt passen.</li>
</ul>
<p>Die App probiert alle hinterlegten Rollenbreiten beziehungsweise
Tafelformate durch und hebt das materialsparendste hervor. Unter
<i>Einzelheiten</i> stehen der Vergleich aller Formate und die Belegung jedes
Streifens.</p>
<p>Bei Rollenmaterial lässt sich über <i>Rollen für diese Massaufnahme</i>
einschränken, welche Rollen auf diese Baustelle mitkommen. Bei Tafelmaterial
gibt es diese Wahl nicht – dort ist das Format durch die Tafel gegeben.</p>
<p>Die <b>Schnittfuge</b> ist mitgerechnet, sowohl beim Längsteilen des
Ausgangsmaterials als auch zwischen zwei Stücken im selben Streifen. Steht sie auf 0 mm, kostet
sie nichts – einzustellen unter <i>Einstellungen → Allgemein</i>.</p>
<p>Die <b>Materialbilanz</b> darunter zerlegt das Ausgangsmaterial lückenlos in
Zuschnitte, Schnittfuge, verwertbare Reste und zu kleinen Verschnitt. Die vier
Zahlen ergeben zusammen immer genau das Ausgangsmaterial; geschätzt wird
nichts. Sie gilt für <b>diesen gespeicherten Plan</b> – eine später geänderte
Schnittfuge rechnet ein gedrucktes Blatt nicht um.</p>
<p><b>Reste aus früheren Aufträgen werden weiterhin nicht automatisch
eingeplant.</b> Sie werden vorgeschlagen; verwendet wird ein Rest erst, wenn
jemand ihn ausdrücklich dafür bestimmt.</p>`},

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
übernehmen.</p>
<p><b>Gehrung:</b> wer „Gehrung rechts" ankreuzt, bekommt am nächsten Stück
automatisch „Gehrung links" – es ist dieselbe Ecke. Beide Bleche bekommen
die Gehrungszugabe auf die Länge, im Ausmass zählt die Ecke aber nur
<b>einmal</b>.</p>`},

"ebk-geometrie":{titel:"Geometrie",text:`
<p>Anders als beim geraden Einlaufblech hat hier <b>jedes Stück</b> ein
eigenes Mass links und rechts – daher konisch. Was hier steht, gilt für alle
Stücke: Abwicklung, Dachneigung und Montageseite.</p>`},

"ebk-stuecke":{titel:"Stücke",text:`
<p>Je Stück Mass links und rechts; die App rechnet daraus das mittlere Mass
und die Zuschnittlänge.</p>
<p>Beim Anlegen wird das rechte Mass des vorherigen Stücks als linkes Mass
übernommen. Danach ist der Wert frei änderbar – eine spätere Änderung
wirkt nicht rückwirkend.</p>
<p><b>Gehrung:</b> wie beim geraden Blech – „Gehrung rechts" setzt am
nächsten Stück automatisch „Gehrung links", weil es dieselbe Ecke ist.
Beide Bleche bekommen die Zugabe, gezählt wird die Ecke nur <b>einmal</b>.</p>`},

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
unter "Dachrinne". Ist dort nichts hinterlegt, wird nicht gerechnet –
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

// v3.94: text als Funktion statt fester Zeichenkette - die genannten
// Buchstaben kommen live aus KAM_MASSLISTE (kamaBuchstabe), siehe
// hilfeOeffnen() fuer die Begruendung.
"kam-masse":{titel:"Kaminmasse",text:()=>`
<p>Alle Masse sind der Reihe nach von vorne (${kamaBuchstabe("a")}) nach hinten
(${kamaBuchstabe("breiteHinten")}) durchnummeriert - die aufklappbare Übersicht
am Anfang dieses Registers zeigt eine Beispielskizze mit allen Buchstaben.</p>
<p>Die Masse längs des Dachs, von vorne nach hinten. <b>${kamaBuchstabe("b")}</b>
und <b>${kamaBuchstabe("c")}</b> überlappen sich im Knick – die Kaminlänge ist
deshalb ${kamaBuchstabe("b")} + ${kamaBuchstabe("c")} minus der Überlappung
(${kamaBuchstabe("ueberlappung")}).</p>
<p>Die beiden <b>Winkel</b> (${kamaBuchstabe("winkelVorne")} vorne,
${kamaBuchstabe("winkelHinten")} hinten) sind der Innenwinkel zwischen
Dachfläche und Kaminwand: vorne stumpf, hinten spitz. Auf einem 25°-Dach mit
lotrechtem Kamin also 115° und 65°; zusammen ergeben sie dann 180°.</p>`},

"kam-umschlaege":{titel:"Umschläge",text:`
<p>Die Zugaben, die in die Abwicklung der sechs Teile eingehen. Vorbelegt sind
die Werte aus den Einstellungen; hier gelten sie nur für diese
Massaufnahme.</p>`},

"kam-stueckliste":{titel:"Stückliste",text:`
<p>Sechs Zuschnitte: Vorderteil, Hinterteil und je zwei Seitenteile vorne und
hinten.</p>
<p>Die <b>Bleilappen</b> werden je Seitenteil aus Zuschnittlänge und
Lattenabstand gerechnet und <b>abgerundet</b> (Betriebsregel seit v3.263).</p>`},

// v3.94: text als Funktion statt fester Zeichenkette - die genannten
// Buchstaben kommen live aus DFA_MASSLISTE (dfaBuchstabe), siehe
// hilfeOeffnen() fuer die Begruendung. Insbesondere "hinter R"/"vor C"
// verweisen auf einen ANDEREN Buchstaben als den des eigenen Absatzes - vor
// v3.94 stand hier "R" fest getippt, obwohl genau dieser Buchstabe durch die
// Entfernung von Mass R in v3.90 einem ANDEREN Mass zugewiesen wurde (siehe
// CLAUDE.md 155). Zufällig noch richtig, aber genau die Gefahr, die diese
// Umstellung beseitigt.
"dfa-masse":{titel:"Fenstermasse",text:()=>`
<p>Alle Masse sind der Reihe nach von vorne (${dfaBuchstabe("anreiff")}) nach
hinten (${dfaBuchstabe("breiteHinten")}) durchnummeriert - die aufklappbare
Übersicht am Anfang dieses Registers zeigt eine Beispielskizze mit allen
Buchstaben.</p>
<p><b>Zuerst die Bauart des Seitenteils wählen</b> (Dropdown, Pflichtfeld) – sie bestimmt, welche
Masse es überhaupt gibt:</p>
<ul>
<li><b>Separate Seitenteile:</b> zwei Teile, die sich im Knick überlappen.
<b>${dfaBuchstabe("b")}</b> und <b>${dfaBuchstabe("c")}</b> überlappen sich
dort – die Länge des Seitenteils ist deshalb ${dfaBuchstabe("b")} +
${dfaBuchstabe("c")} minus der Überlappung
(${dfaBuchstabe("ueberlappung")}).</li>
<li><b>Durchgehend mit Knick:</b> ein Stück, das geknickt wird. Dann gibt es
nichts zu überlappen: <b>${dfaBuchstabe("b")}</b> ist die ganze Länge des
Seitenteils, ${dfaBuchstabe("ueberlappung")} und ${dfaBuchstabe("c")}
entfallen – die Felder verschwinden, und die Kontrolle verlangt sie nicht
mehr.</li>
</ul>
<p><b>Dann die Ausführung wählen</b> (ebenfalls Pflicht-Dropdown): <b>gepunktet</b> (die Seitenteile werden
seitlich an Vorder- und Hinterteil angepunktet) oder <b>gefalzt</b> (senkrechter
Falz, die Seitenteile laufen durch). Die Wahl lässt sich auch bei einer schon
gespeicherten Aufnahme noch ändern – die Zuschnitte rechnen sich neu, sobald die
Aufnahme wieder gespeichert wird.</p>
<p>Beide Felder beginnen <b>leer</b> – ohne Wahl lässt sich das Register nicht verlassen und die Aufnahme nicht speichern. Umschalten ist gefahrlos: die schon eingegebenen Masse bleiben stehen und
sind beim Zurückschalten unverändert wieder da. Eine vor dieser Version
gespeicherte Aufnahme ist immer eine mit separaten Seitenteilen.</p>
<p>Die Masse längs des Dachs laufen von vorne nach hinten – genau gleich
vermasst wie bei der Kamineinfassung.</p>
<p>Vorne ist die Aufbordung <b>niedriger</b> (${dfaMassLabel("saumVorne")}) und
hat oben einen Saum (Rückschlag); hinten ist sie <b>höher</b>
(${dfaMassLabel("aufHinten")}) und bewusst <b>trapezförmig</b> – Breite oben
(${dfaBuchstabe("breiteOben")}) ist kleiner als Breite unten
(${dfaBuchstabe("breiteUnten")}). Die <b>${dfaMassLabel("aufVorne")}</b> gilt
für die ganze Seite und wird nicht links/rechts getrennt erfasst.</p>
<p>An der oberen Ecke sitzt ein kleiner gestrichelter Strich –
${dfaBezeichnung("randAbstand")} (${dfaBuchstabe("randAbstand")}) ist der
Abstand ab der Ecke, ${dfaBezeichnung("randStrich")} (${dfaBuchstabe("randStrich")})
seine Länge.</p>
<p>Ganz hinten, hinter ${dfaBuchstabe("d")}, sitzt ein kleiner
<b>90°-Aufbug (${dfaBuchstabe("e")})</b> – genau wie bei der Kamineinfassung –
mit einem eigenen 180°-Umschlag (${dfaBuchstabe("eUmschlag")}) an seiner
Spitze. Ganz vorne, vor ${dfaBuchstabe("a")}, sitzt spiegelbildlich der
<b>Anreiff (${dfaBuchstabe("anreiff")})</b>, ebenfalls mit eigenem
180°-Umschlag (${dfaBuchstabe("anreiffUmschlag")}).</p>
<p>Bei den <b>seitlichen Massen</b> kommen – genau wie bei der Kamineinfassung –
<b>${dfaBuchstabe("f")}</b> (seitlich bis Deckmaterial) und
<b>${dfaBuchstabe("g")}</b> (seitlich unter Deckmaterial) dazu; sie gehen in
die Abwicklung der Seitenteile ein, haben aber keinen Vorgabewert.</p>`},

"dfa-umschlaege":{titel:"Umschläge",text:()=>`
<p>Die Zugaben, die in die Abwicklung der sechs Teile eingehen. Vorbelegt sind
die Werte aus den Einstellungen; hier gelten sie nur für diese
Massaufnahme.</p>
<p><b>Breite vorne/hinten (${dfaBuchstabe("breiteVorne")}/${dfaBuchstabe("breiteHinten")})</b>
sind vom Anwender erfasste Fenstermasse – die tatsächliche Zuschnittlänge von
Vorderteil und Hinterteil kommt zusätzlich dazu, sie reicht seitlich bis zu
den Seitenteilen (2× Umschlag Seite (${dfaBuchstabe("umschlagSeite")}) +
${dfaBuchstabe("f")} links/rechts + ${dfaBuchstabe("g")} links/rechts dazu).</p>`},

"dfa-stueckliste":{titel:"Stückliste",text:`
<p>Sechs Zuschnitte: Vorderteil, Hinterteil und je Seite ein
<b>Seitenteil</b> und ein <b>Seitenteil hinten</b> (das Trapezstück am Ende).
Bei <b>separaten Seitenteilen</b> sind es <b>acht</b>: je Seite ein <b>vorderes</b>
Seitenteil (Länge G) und ein <b>mittleres</b> (Länge I), beide gleich breit.
Wie sie sich zusammensetzen, hängt von der <b>Ausführung</b> ab:</p>
<ul>
<li><b>Gepunktet:</b> Vorder- und Hinterteil sind gleich lang (Breite vorne +
2 × Umschlag Seite + J + K) und reichen seitlich bis zu den Seitenteilen. Das
Seitenteil ist so lang wie das Fenster.</li>
<li><b>Gefalzt:</b> Vorderteil = Breite vorne + 10 mm, Hinterteil =
Breite hinten + 25 mm (beides Standard-Falzzugaben). Das Seitenteil läuft durch: C + Seitenlänge +
Umschlag am Anreiff.</li>
</ul>
<p>Das Vorderteil rechnet ohne den Anreiff selbst (er steckt in C) und ohne die
Aufbordungshöhe der Seite. Das Seitenteil nimmt die Aufbordungshöhe <b>vorne</b>;
beim Seitenteil hinten kommt Breite vorne minus Breite hinten ins Spiel, weil
das Fenster hinten breiter ist. Seine Länge ist gepunktet N + 15 mm
(Standard-Nahtüberlappung), gefalzt N + R + S + Umschlag am Aufbug.</p>
<p>Die <b>Bleilappen</b> werden je Seitenteil aus <b>Vorderteil</b> (Mass C +
Seitenlänge) und <b>Hinterteil</b> (Mass N + R) gerechnet: Länge ÷ Lattenabstand,
jeweils <b>abgerundet</b>, links und rechts zusammen.</p>`},

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
kommen Bezeichnung und Einheit aus dem Katalog.</p>
<p><b>Seit Version 3.129</b> bilden die <b>fett gedruckten Titel</b> aus der
Offerte klappbare Blöcke – genau wie in der Offerte selbst. Sie starten
<b>zugeklappt</b>, damit bei einer langen Offerte sofort ein Überblick da
steht statt einer endlosen Liste; ein Tippen auf den Titel klappt den Block
auf.</p>
<p>Im Titel steht, wie viele Positionen des Blocks schon <b>fertig</b> sind
(z. B. „3/8 fertig“). So sieht man auch zugeklappt, wo noch Arbeit liegt.
Positionen <b>ohne</b> Titel – von Hand hinzugefügte oder ältere – stehen
weiterhin einfach in der Liste.</p>
<p><b>Das Zählwerk</b> (ab 3.169): An einer Position, die in früheren
Ausmassen fast nie eine Menge bekommen hat, steht ein Hinweis – etwa
„⚠️ in 7 von 8 Ausmassen nicht gebraucht“.</p>
<div class="hin">Das ist ein <b>Hinweis, keine Sperre</b>: Die Zeile bleibt
sichtbar, an ihrem Platz und ganz normal bedienbar. Ausblenden wäre hier
besonders verlockend und besonders falsch – die Position, die „wir nie
brauchen“, ist genau die, die beim fünften Auftrag fehlt.<br><br>
Die App sagt erst etwas, wenn dieselbe Position <b>mindestens dreimal</b>
vorgekommen ist. Aus einem einzigen Ausmass etwas zu folgern, wäre geraten,
und geraten wird hier nicht.</div>`},

"am-ki":{titel:"Positionen aus einem Foto",text:`
<p>Ein Foto einer Offerte oder Liste wird ausgewertet und als Positionen
vorgeschlagen.</p>
<p>Das Ergebnis wird zuerst gezeigt und erst nach Bestätigung übernommen –
bitte vor dem Übernehmen durchsehen.</p>`},

"ang-ki":{titel:"Positionen aus einem Foto",text:`
<p>Ein Foto der bestehenden Offerte wird ausgewertet und als Positionen
vorgeschlagen – dieselbe Erkennung wie beim Ausmass "Offerte erfassen".</p>
<p>Das Ergebnis landet in der Tabelle darüber und lässt sich dort vor dem
Speichern noch prüfen und korrigieren.</p>
<p>Fett gedruckte Zwischentitel im Dokument (z. B. "Bedachung") werden als
eigene, klappbare Abschnitte mit fett gedrucktem Titel dargestellt – zur
besseren Übersicht standardmässig zugeklappt. Ein Klick auf den Titel klappt
den jeweiligen Abschnitt auf oder zu. Die ganze Liste lässt sich über die
Überschrift "Erkannte Positionen" ebenso auf- und zuklappen.</p>
<p>Wird ein Einzelpreis erkannt (oder von Hand eingetragen), erscheint
daneben automatisch der Betrag (Menge × Preis) sowie das Total über alle
Positionen.</p>
<p>"🗑 Alle Positionen löschen" entfernt die ganze Liste auf einmal – nach
Rückfrage, zum Beispiel um mit einer neuen Erkennung von vorne zu
beginnen.</p>`},

"cockpit-offerten":{titel:"Offerte erstellen",text:`
<p>Hier entsteht eine <b>eigene Offerte für den Kunden</b> – mit Preisen aus
deinen Katalogen, Rabatt, MwSt und einem PDF zum Verschicken. Sie wird
geschrieben, <b>bevor</b> gearbeitet wird.</p>
<p>Nicht zu verwechseln mit der Karte <b>„📥 Offerte importieren“</b> darüber.
Die ist für den umgekehrten Fall: eine <b>bestehende, fremde</b> Offerte kommt
als Foto oder PDF in die App, die App erkennt die Positionen, und daraus lassen
sich die Massaufnahmen ableiten. Dort wird aufgenommen, was es schon gibt –
hier entsteht etwas Neues.</p>
<p>Beide gehören zum selben Zugriff: wer Offerten sehen und bearbeiten darf,
darf beide Arten (Einstellungen → Mitarbeiter → Offerten-Zugriff).</p>`},

"offerte-erstellen":{titel:"Die eigene Offerte",text:`
<p>Eine Offerte gehört <b>immer zu einem Projekt</b>, wie Massaufnahme,
Regierapport und Ausmass auch. Ohne Projekt lässt sie sich nicht speichern.</p>
<p><b>Offert-Nr.</b> trägst du selbst ein – die App vergibt keine. So passen
die Nummern zu dem, was du in der Buchhaltung führst.</p>
<p><b>Gültig bis</b> ist beim Anlegen schon ausgefüllt: Datum plus die
Gültigkeit aus den Einstellungen. Es lässt sich für jede Offerte ändern.</p>
<p>Dein <b>Briefkopf</b> – Firmenname, Adresse, Logo – kommt aus den
Einstellungen. Dieselben Angaben, die auch der Regierapport druckt; du
erfasst sie also nicht zweimal.</p>`},

"offerte-kunde":{titel:"Der Kunde auf der Offerte",text:`
<p>Diese vier Zeilen bilden das <b>Anschriftsfeld</b> oben rechts auf dem
PDF – gesetzt für ein gewöhnliches Fenstercouvert. Leere Zeilen fallen weg,
es entsteht also keine Lücke, wenn es keinen Zusatz gibt.</p>
<p>Der Kunde wird <b>je Offerte</b> erfasst und nicht aus dem Projekt
übernommen: am Projekt hängt das Objekt (wo gearbeitet wird), und das ist
nicht zwingend die Adresse dessen, der die Offerte bekommt – bei einer
Verwaltung oder einem Architekten ist es das fast nie.</p>`},

"offerte-katalog":{titel:"Positionen aus dem Katalog",text:`
<p>Die <b>Stundenansätze</b> und das <b>Regiematerial</b> aus den
Einstellungen stehen hier nebeneinander. Wo du eine <b>Menge</b> einträgst,
entsteht eine Offertposition: die Stunden im einen Abschnitt, das Material im
anderen.</p>
<p>Die <b>Preise kommen unverändert aus dem Katalog</b>. Die App schlägt
nichts auf und rundet nichts. Was anders sein soll, änderst du danach in der
Offerte – dort steht jede übernommene Zeile ganz normal zum Bearbeiten.</p>
<p>Die beiden <b>Abschnittsnamen</b> im Dialog sind frei. Steht dort ein
Abschnitt, den die Offerte schon hat, kommen die Zeilen zu ihm dazu (er
erscheint also nie zweimal); ein neuer Name ergibt einen neuen Abschnitt. So
lassen sich auch Gerüst, Regie oder Entsorgung getrennt ausweisen. Ohne
Katalog geht das über <b>„＋ Abschnitt“</b>, und jeder Abschnittstitel in der
Liste lässt sich anklicken und umbenennen.</p>
<p>Das Material wird wie im Regierapport <b>gesucht</b>. Was schon eine Menge
hat, bleibt dabei oben stehen – eine Eingabe geht beim Weitersuchen nicht
verloren.</p>
<p><b>Ohne Dialog geht es auch:</b> tippst du in der Positionsliste eine
<b>EDV-Nr.</b> ins Feld „Pos.“, erscheinen die passenden Materialpositionen
sofort darunter. Ein Klick übernimmt Nummer, Bezeichnung, Einheit und Preis;
eine schon eingetragene Menge bleibt stehen.</p>
<p>Der Vorschlag ist ein <b>Angebot, kein Zwang</b>. Tippst du eine Nummer,
die es im Katalog nicht gibt, behältst du sie, und Bezeichnung, Einheit und
Preis füllst du wie bisher von Hand aus. Ohne Klick wird nie etwas
überschrieben.</p>`},

"offerte-texte":{titel:"Vortext und Schlusstext",text:`
<p>Der <b>Vortext</b> steht über den Positionen, der <b>Schlusstext</b> unter
dem Total – dort gehören Zahlungskonditionen, Ausführungsfrist und ähnliche
Angaben hin.</p>
<p>Beide sind bei einer neuen Offerte mit der <b>Vorgabe aus den
Einstellungen</b> gefüllt und lassen sich hier für diese eine Offerte
anpassen. Eine spätere Änderung der Vorgabe formuliert eine bereits
geschriebene Offerte <b>nicht</b> um.</p>`},

"offerte-pdf":{titel:"Das PDF für den Kunden",text:`
<p><b>„📄 PDF erzeugen“</b> baut die Offerte als fertiges Dokument: Briefkopf,
Anschrift, Positionen nach Abschnitten mit Zwischensummen, Rabatt, MwSt,
Total und Schlusstext.</p>
<p>Was du in der Vorschau siehst, <b>ist das PDF selbst</b> – keine
nachgebaute Ansicht. Es gibt also keine zwei Fassungen, die auseinanderlaufen
könnten: was hier steht, bekommt der Kunde.</p>
<p><b>„Im Projekt ablegen“</b> speichert es beim Projekt, wie ein
hochgeladenes Dokument. Von dort lässt es sich öffnen, weiterschicken und
drucken. Die Offerte wird dabei <b>gleich mitgespeichert</b> – sonst läge eine
Datei im Speicher, zu der es keinen Eintrag gibt.</p>
<p>Änderst du danach etwas an den Positionen, ist das abgelegte PDF der
<b>alte</b> Stand. Dann erzeugst du es neu und legst es noch einmal ab; das
vorherige bleibt als Beleg dessen, was verschickt wurde.</p>`},

"ang-massaufnahmen":{titel:"Massaufnahmen aus der Offerte",text:`
<p>Der Ablauf des Betriebs ist <b>Projekt → Offerte → Massaufnahme</b>. Was in
der Offerte als Position steht, musste bisher danach als Massaufnahme von Hand
noch einmal angelegt und benannt werden – bei zwölf Positionen zwölfmal.</p>
<p>Hier entsteht daraus mit einem Schritt je angehakter Position eine
<b>leere</b> Massaufnahme im Projekt: mit der Bezeichnung der Position als
Titel, der vorgeschlagenen Art und dem Bezug zur Offerte in der Notiz.
<b>Gemessen wird danach wie gewohnt</b> – hier wird nichts gerechnet.</p>
<p>Die <b>Art</b> rät die App aus der Bezeichnung: „Dachrinne halbrund 333mm"
wird zur Dachrinne, „Einlaufblech konisch" zum konischen Einlaufblech. Woran
sie es erkannt hat, steht daneben. Lässt sich nichts erkennen – etwa bei
„Diverse Anpassungsarbeiten" –, sagt sie das und schlägt <b>Skizze/Foto</b>
vor, die Auffangart. Die Position fällt also nie stillschweigend weg, und die
Art lässt sich in jeder Zeile von Hand umstellen.</p>
<p>Eine Massaufnahme, die im Projekt bereits unter demselben Titel steht, ist
<b>nicht</b> angehakt – damit beim zweiten Durchgang keine Doppel entstehen.
Anhaken lässt sie sich trotzdem, wenn es wirklich zwei sein sollen.</p>
<p>Die <b>Menge</b> der Offerte landet in der Notiz, nicht in einem Massfeld:
was dort als „24 m" steht, ist eine Schätzung des Verkaufs und kein
aufgenommenes Mass. Beim Ausmessen gilt, was am Bau gemessen wird.</p>
<p>Für eine einzelne Position gibt es den Knopf <b>📐</b> direkt in der
Positionszeile. Er öffnet das gewohnte Massaufnahme-Formular vorbelegt –
gespeichert wird erst beim Speichern, und danach geht es zurück in dieselbe
Offerte.</p>`},

"ang-pdf":{titel:"PDF der Offerte",text:`
<p>Hier wird das eigentliche Offert-Dokument als PDF hochgeladen – das ist
das fertige Dokument selbst, so wie es dem Kunden vorliegt oder geschickt
wurde.</p>
<p>Höchstens 50 MB. Ein bereits hochgeladenes PDF lässt sich öffnen oder
entfernen; ein neu gewähltes wird erst beim Speichern der Offerte
tatsächlich hochgeladen.</p>
<p>"🔎 Positionen erkennen" liest die Positionen direkt aus diesem PDF
heraus – dieselbe Erkennung wie bei einem Foto, auch mehrseitige
PDF-Dokumente werden dabei ausgewertet. Für die Erkennung selbst gilt eine
eigene, kleinere Grenze von 15 MB (unabhängig vom 50-MB-Limit für den
reinen Upload) – ein sehr grosses PDF lässt sich also weiterhin hochladen
und ablegen, aber nicht mehr automatisch auslesen. Das Ergebnis landet wie
bei den Fotos in der Tabelle darüber und lässt sich dort vor dem
Speichern noch prüfen und korrigieren.</p>
<p>Die Erkennung ist auf sehr umfangreiche Dokumente ausgelegt – auch eine
Offerte mit mehreren hundert Positionen wird normalerweise vollständig
ausgelesen. Nur wenn ein Dokument diesen (sehr grosszügig bemessenen)
Rahmen doch einmal sprengt, meldet die Erkennung das ausdrücklich, statt
eine unvollständige Liste zu erfinden – dann hilft es, das Dokument in
kleineren Abschnitten hochzuladen oder die restlichen Positionen von
Hand zu erfassen.</p>
<p>Seit Version 3.42 läuft die Erkennung zuverlässig durch: ein interner
Fehler, der bei manchen Anfragen sofort mit einer Fehlermeldung abbrach
statt überhaupt erst zu versuchen zu lesen, ist behoben.</p>
<p>Seit Version 3.43 ist ein zweiter, seltenerer Fall behoben: bei
manchen Mobilverbindungen brach die Erkennung mit „Failed to fetch" ab,
bevor überhaupt eine Antwort ankam – die KI brauchte für ihre eigene,
unsichtbare Vorüberlegung länger, als die mobile Verbindung offen blieb.
Die Erkennung ist jetzt gezielt auf schnelles Lesen einer Tabelle statt
auf langes Nachdenken eingestellt; auch das ändert an der Bedienung
selbst nichts.</p>
<p>Seit Version 3.44 erfasst die Erkennung jede Position vollständig: eine
Position besteht in vielen Offerten aus einer ersten Zeile mit
Positionsnummer und einem oder mehreren Fliesstext-Zeilen darunter
(Material, Ausführung, Masse, Bemerkungen) – vorher wurde oft nur die
erste Zeile übernommen, jetzt landet der ganze zusammengehörige Text in
der Beschreibung. Fett gedruckte Zwischentitel im Dokument (z. B.
"Bedachung" oder "Spenglerarbeiten Dach Nord") werden dabei erkannt und
nicht mehr als eigene, unbrauchbare Position ausgegeben – ihr Text wird
stattdessen den darunterstehenden Positionen als Bezug vorangestellt, bis
der nächste Zwischentitel folgt. Auch das ändert an der Bedienung selbst
nichts.</p>`},

// ---- Regierapport -------------------------------------------------------
"rapport-kopf":{titel:"Regieauftrag",text:`
<p>Wird der Rapport aus dem Cockpit angelegt, sind Projekt, Auftrags-Nr.,
Auftraggeber und Objekt bereits gefüllt.</p>
<p><b>Objekt / Gebäudeteil</b> ist etwas anderes als die Projektadresse –
hier steht, wo genau gearbeitet wurde (z. B. "Dachfläche Nord").</p>`},

"rapport-arbeit":{titel:"Ausführende Arbeiten",text:`
<p>Je Zeile Datum, Beschreibung, Mitarbeiter, Funktion und Stunden.</p>
<p>Der <b>Ansatz</b> kommt aus der Funktion (Einstellungen → Firma →
Funktionen / Stundenansätze). Das Total rechnet die App.</p>
<p><b>Vorschläge</b> (ab 3.171): Beim Tippen in die <b>Beschreibung</b>
schlägt die App die Sätze vor, die <b>in diesem Rapport</b> schon stehen – in
der Reihenfolge der Zeilen. In einem Rapport wiederholt sich dieselbe Arbeit
oft über mehrere Tage; genau dort spart das Tipparbeit.</p>
<div class="hin">Bewusst <b>nur dieser Rapport</b>, nicht alle: Sätze aus
fremden Baustellen wären hier nur Beiwerk. Ein frischer Rapport hat deshalb
noch keine Vorschläge – es gibt dann nichts, was sich wiederholen könnte.<br><br>
Das Feld bleibt ein <b>freies Feld</b>: ein neuer Text lässt sich wie bisher
einfach eintippen. Die Liste schlägt vor, sie schreibt nichts fest.</div>`},

"rapport-material":{titel:"Material",text:`
<p>Die EDV-Nr. schlägt aus dem Materialkatalog vor; Bezeichnung, Dimension,
Einheit und Preis kommen von dort.</p>
<p><b>📷 Material scannen</b> spart das Tippen: Barcode am Artikel scannen, und
die Zeile trägt die passende <b>EDV-Nr.</b> aus eurem Katalog – mit eurem Preis.
Gesucht wird im <b>Lieferanten-Lager</b> und in der <b>Lagerverwaltung</b>; ein
Barcode zeigt auf eine Ware, nicht auf ein Modul.</p>
<div class="hin"><b>Dreimal scannen heisst drei Stück.</b> Derselbe Artikel am
selben Tag wird hochgezählt statt ein zweites Mal angelegt. Ein anderer Tag
bleibt eine eigene Zeile – sie sagt aus, wann das Material verbraucht wurde.</div>
<p><b>Beim Scannen wird auch ausgebucht.</b> Der Schalter darunter ist
eingeschaltet: jeder Scan zieht die Menge im <b>Lieferanten-Lager</b> ab, mit
Projekt und Herkunft „Regierapport“. Erst dadurch stimmt der Bestand im Alltag –
sonst müsste jemand zusätzlich von Hand ausbuchen, und das passiert nie. Nach
jedem Scan steht da, was gebucht wurde: „1 ausgebucht, Bestand jetzt 9“.</p>
<div class="hin"><b>Wer nur nachsehen will, was etwas kostet, schaltet ihn aus.</b>
Eine Lagerbuchung lässt sich nicht zurückholen – ein Fehler wird im Lager mit
einer <b>Korrektur</b> ausgeglichen. Die Wahl wird je Gerät gemerkt.</div>
<p><b>Gebucht wird, was gescannt wurde</b> – nicht, was am Ende in der Zeile
steht. Änderst du die Menge hinterher von Hand, ändert sich die Buchung nicht.
Ein negativer Bestand wird gebucht und benannt: er heisst nicht „Fehler“, sondern
„hier fehlt ein Zugang im Lager“.</p>
<div class="hin"><b>Das fällt jetzt auf (ab 3.242).</b> Läuft eine Zeile von der
Buchung weg, steht über der Material-Tabelle: „Zeile 2 (409.373): 3 ausgebucht,
die Zeile steht auf 5.“ Verrechnet wird, was in der Zeile steht – im Lager steht,
was gescannt wurde. Soll der Bestand stimmen, buchst du im Lieferanten-Lager am
Artikel eine <b>Korrektur</b>.<br>
Nachgebucht wird <b>nicht</b> automatisch, und zwar mit Grund: hinter einer
EDV-Nr. können mehrere Lieferantenartikel stehen („Rinnenseiher, alle
Materialien“). „Die Zeile steht jetzt auf 5“ sagt deshalb nicht, welcher Artikel
die zwei zusätzlichen Stück liefert. Das weiss nur, wer im Lager steht.</div>
<p>Ist ein Code <b>nicht bekannt</b> oder hat der Artikel <b>noch keine
Regie-Position</b>, entsteht <b>keine Zeile</b> – und darunter steht, woran es
liegt. Fehlt nur die Zuordnung, trägst du sie im Lieferanten-Lager unter
<b>🔗 Zuordnen</b> nach, danach geht das Scannen. Eine Zeile auf Verdacht wäre
Material im Rapport, das niemand verbaut hat.</p>
<p><b>Material, das nicht im Katalog steht:</b> die Nummern <b>999.90</b> bis
<b>999.99</b> sind freie Positionen. Bezeichnung, Dimension, Einheit und Preis
werden dann direkt in der Zeile eingetragen. Die App schlägt beim Tippen die
nächste noch freie Nummer vor.</p>
<p><b>Das Zählwerk</b> (ab 3.168): Die Vorschläge sind nach der
<b>eigenen Benutzung</b> geordnet – was dieser Betrieb häufig verbaut, steht
oben. Daneben steht, worauf sich das stützt: „5× benutzt“. Gezählt wird über
Regierapporte und über das Material an den Massaufnahmen, immer nur innerhalb
der eigenen Firma.</p>
<div class="hin">Es wird <b>nichts ausgeblendet</b>. Dieselben Treffer wie
vorher, dieselbe Obergrenze von fünfzehn Vorschlägen – nur die Reihenfolge
ändert sich. Und es wird <b>keine Zahl gesetzt</b>: Mengen und Preise bleiben
unberührt, das Zählwerk ordnet nur an.<br><br>
Am Anfang ist es fast still: solange wenig erfasst ist, gibt es wenig zu
zählen, und wo nichts bekannt ist, steht auch nichts. Es fängt an zu helfen,
sobald es etwas weiß – und behauptet vorher nichts.</div>`},

"rapport-liste":{titel:"Regierapporte",text:`
<p>Alle Rapporte der Firma, neueste zuerst. Der CSV-Export enthält Arbeits-
und Materialzeilen mit ihren Totalen – zur Weiterverarbeitung in der
Buchhaltung.</p>`},

// ---- Suche, Feedback, PDF ----------------------------------------------
"suche":{titel:"Suche",text:`
<p>Durchsucht Rapporte (Auftraggeber, Objekt, Auftrags-Nr.), Massaufnahmen und
Ausmasse (Bezeichnung) sowie die Projekte selbst (Adresse, Name, Auftrags-Nr.,
Auftraggeber). Projekt-Treffer stehen zuoberst.</p>
<p>Je Treffer zwei Wege: <b>📂 Projekt</b> öffnet das Projekt und springt dort
an den Treffer; das Stiftsymbol öffnet den Eintrag direkt.</p>
<div class="hin">Ab 3.167 springt die Projektseite dafür ins passende
Register – Massaufnahme, Ausmass oder Regierapport – und hebt die getroffene
Zeile kurz hervor. Gibt es den Eintrag nicht mehr, geht das Projekt trotzdem
auf, nur eben ohne Hervorhebung.</div>`},

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
<li><b>Nur für Administratoren</b> – das Register „Firma“ und das Register
„Feedback“.</li>
</ul>
<p>Bei jedem Abschnitt steht dabei, was davon gilt.</p>
<p><b>Beispiel-Positionen</b> (ab 3.184): Eine neu registrierte Firma bekommt
acht Beispiel-Positionen mit, damit sich die App sofort ausprobieren lässt.
Sie tragen <b>keinen Preis</b> und zählen in der Einrichtung nicht mit. Sobald
die erste eigene Position angelegt oder eine Liste importiert wird, lösen sie
sich auf. Wurde eine davon schon benutzt, fragt die App, was damit geschehen
soll – behalten, ersetzen, löschen oder später entscheiden.</p>
<p><b>Einrichtung prüfen</b> (ab 3.183): Solange einer Firma noch eine
Grundlage fehlt – Katalog, Werkstoffe, Rollenbreiten, Stundenansätze –, steht
zuoberst auf der Startseite eine Karte, die sagt was fehlt und warum, und die
direkt an die richtige Stelle führt. Sie verschwindet von selbst, sobald alles
steht, und ist über <b>Mehr → Einrichtung prüfen</b> wieder aufrufbar. Der
Stand ist nicht gemerkt, sondern aus den Daten gelesen: wird etwas später
wieder geleert, meldet sich der Punkt zurück.</p>
<p><b>Speichern in den Katalogen</b> (ab 3.182): Die Felder in den Listen –
Leistungen, Material, Profile, Blitzschutz-Material, Werkstoffe – haben keinen
eigenen Speichern-Knopf. Geschrieben wird kurz nach der letzten Eingabe, und
unten erscheint dann <i>„✓ Gespeichert.“</i>. Geht es nicht durch, steht dort
stattdessen der Grund. Bis 3.181 wurde bei diesen Feldern gar nichts
geschrieben, ohne dass es auffiel.</p>`},

"abwicklung":{titel:"Abwicklung: Rundrohr und Tablett",text:`
<p>Der Rechner kennt zwei <b>Bauteile</b>. Oben wird gewählt, welches gerade
gerechnet wird; Vorschau, Ergebnis, DXF, Schablone und die gespeicherte Liste
sind für beide dieselben.</p>
<h4>Rundrohr</h4>
<p>Berechnet den Zuschnitt für ein rundes Blechrohr, das unten schräg
angeschnitten ist – etwa eine Dachdurchführung –, mit angebogenem
<b>Schweifbord</b> und liegendem <b>Längsfalz</b>.</p>
<p>Die Vorschau ist massstäblich: durchgezogen der Zuschnitt, rot
gestrichelt die Biegelinie des Schweifbords, blau gestrichelt der Falz.</p>
<div class="hin"><b>Ein Schweifbord lässt sich nicht abwickeln.</b> Das Blech
wird dabei gestreckt; die Tabelle nennt die Streckung am Rand. Gelöst wird es
auf der <b>Schweifmaschine</b>. <b>Lappeneinschnitte gibt es seit v3.196
nicht mehr</b> – sie entsprechen nicht mehr dem Stand der Technik, und der
Hinweis, der früher dazu kam, ist mit ihnen weggefallen. Die Zahl bleibt:
sie steht als <b>Streckung Schweifbord-Rand</b> in der Ergebnistabelle.</div>
<div class="hin"><b>Ø Standrohr und Dachneigung α gelten für beide
Bauteile</b> und stehen deshalb nur <b>einmal</b> da, oben über den Massen.
Es ist dasselbe Rohr und dasselbe Dach; bis v3.195 gab es dafür je zwei
Felder, und wer eines nachträglich änderte, hatte zwei verschiedene Zahlen
für dieselbe Sache.<br>
<b>Nicht</b> zusammengelegt ist <b>b</b>: beim Rohr ist das die
Schweifbord-Breite, beim Tablett das Mass von Mitte Rohr nach hinten.
Derselbe Buchstabe, zwei völlig verschiedene Masse.</div>
<div class="hin"><b>Die Zugabe ist über den ganzen Zuschnitt gleich</b>
(seit v3.190). Gerechnet wird sie mit 90°: <i>Z = (b + t/2) − 2ρ·tan45° +
ρ·π/2</i> mit ρ = r + t/2, bei den Standardmassen 11,34 mm. Ein Streifen,
der über die Länge schwankt, lässt sich nicht anreissen – und geschweift
wird nachher ohnehin, dabei wandert das Material.</div>
<div class="hin"><b>Was das kostet, steht in der Tabelle.</b> Der
Biegewinkel ist beim schrägen Anschnitt nicht überall gleich: auf der langen
Mantellinie 60°, auf der kurzen 120° (allgemein 90° ∓ α). Mit einer
konstanten Zugabe wird das fertige Bord deshalb nicht überall exakt so breit
wie eingegeben – bei den Standardmassen 11,2 bis 14,2 mm statt 12. Die Zeile
<b>Bord fertig (rechnerisch)</b> zeigt es an. Der Unterschied hängt allein
am Biegeradius, nicht an der eingegebenen Breite.</div>
<div class="hin">Die <b>Falzfaktoren 1 und 2</b> sind die Werkstattregel für
den einfachen liegenden Falz: links eine Falzbreite Zugabe, rechts zwei. Sie
bleiben änderbar. Im Bereich des Schweifbords wird der Falz nicht besonders
ausgebildet – in der Praxis flachdrücken oder ausklinken.</div>
<p><b>Ausgeben:</b> DXF (Layer ZUSCHNITT, BIEGELINIE_SCHWEIFBORD,
BIEGELINIE_FALZ), SVG im Massstab 1:1, oder als Schablone 1:1
mit Überlappung und Passmarken.</p>
<div class="hin"><b>Das Papierformat schlägt die App vor</b> (seit v3.193).
Sie rechnet A4, A3, A2 und A1 in beiden Lagen durch und wählt das Format mit
den <b>wenigsten Blättern</b> vor. Bei jedem Format steht in der Auswahl, wie
viele Blätter es wären – so ist sichtbar, was grösseres Papier spart: das
Tablett braucht auf A4 sechs Blatt, auf A3 quer drei, auf A1 eines.
Umstellen geht jederzeit.<br>
Bei gleicher Blattzahl gewinnt das <b>kleinere</b> Papier – sonst ginge jeder
kleine Zuschnitt zum Plotter. <b>A0</b> steht nicht zur Wahl, weil es im
Betrieb nicht gedruckt werden kann.</div>
<div class="warn"><b>Beim Drucken 100 % einstellen</b>, nicht „an Seite
anpassen“. Auf jedem Blatt steht ein <b>100-mm-Kontrollmass</b>: einmal
nachmessen, bevor nach der Schablone geschnitten wird. Eine um wenige
Prozent verkleinerte Schablone fällt sonst erst am Blech auf.<br>
Im Druckdialog muss das <b>gleiche Format</b> eingestellt sein, das die App
nennt – sie sagt es dem Drucker zwar mit, aber manche Treiber übergehen das.</div>
<p>Gespeichert werden die <b>Masse</b>, nicht die gezeichnete Kontur – die
wird beim Laden neu gerechnet. Weicht das Ergebnis vom gespeicherten ab,
sagt die App es ausdrücklich, statt stillschweigend andere Zahlen zu
zeigen.</p>
<div class="hin"><b>Aus der Einfassung rund heraus</b> (seit v3.191): Dort
steht bei jeder Einfassung <b>⭕ Abwicklung Rohr</b>. Damit kommen
<b>Ø Standrohr</b>, der <b>Winkel Dach/Rohr</b> und die <b>Materialstärke</b>
der Massaufnahme herüber, dazu Projekt und ein Vorschlag für die
Bezeichnung. Die Abwicklung gehört danach zu genau dieser Massaufnahme.<br>
Oben steht, <b>was übernommen wurde und was nicht</b> – die nicht
übernommenen Felder sind die, die Sie prüfen müssen. Mit
<b>Verbindung lösen</b> oder <b>Standardmasse</b> ist der Bezug wieder
weg.</div>
<div class="hin">Das passt fachlich zusammen: die Einfassung rund rechnet
den <b>Querschnitt</b> (a, b, c) und lässt das Rohr selbst ausdrücklich
offen – genau das rechnet die Abwicklung. <b>Rohrhöhe</b> und
<b>Schweifbord-Breite</b> gibt es dort nicht; sie stehen als Richtwert
unter <b>Einstellungen → Massaufnahmen → Einfassung Rund</b>. Eine
<b>0</b> heisst dort „nicht gesetzt“, dann bleibt der Wert in der
Abwicklung stehen – es wird nichts erfunden.</div>
<h4>Tablett der Einfassung rund</h4>
<p>Das <b>Tablett</b> ist das flache Blech, das auf dem Dach liegt und durch
das das Rohr steigt. Sein Zuschnitt ist ein Rechteck; interessant ist das
Loch.</p>
<div class="hin"><b>Das Loch ist eine Ellipse, kein Kreis.</b> Das Tablett
liegt in der <b>Dachfläche</b>, das Rohr steht im <b>Lot</b>. Ein senkrechtes
Rohr, das eine geneigte Ebene schneidet, ergibt eine Ellipse: quer zum
Gefälle so breit wie das Rohr, in Gefällerichtung um <i>1/cos α</i> länger.
Bei Ø 110 und 30° Dachneigung sind das 110 × 127 mm – ein rundes Loch wäre
17 mm zu kurz.</div>
<div class="hin"><b>Luft am Lochausschnitt:</b> gerechnet wird der Schnitt
eines gedachten Rohrs mit <b>Ø + 2 × Zugabe</b>. Damit wächst die Luft in
Gefällerichtung genauso mit, wie das Rohr nachher im Loch steht. Die Vorgabe
steht unter <b>Einstellungen → Massaufnahmen → Einfassung Rund</b>;
<b>0</b> ist dort ein gültiger Wert und heisst „Loch exakt auf Rohrmass“.</div>
<div class="hin">Die <b>Zuschnittlänge</b> ist dieselbe Zahl, die die
Massaufnahme Einfassung rund als <b>Zuschnittbreite (Querschnitt)</b>
ausgibt: Umschlag + Anreiff + a + b + c + Umschlag. Ein <b>Biegeausgleich</b>
wird bewusst nicht dazugerechnet – die Einfassung rechnet auch keinen, und
zwei Längen für dasselbe Blech wären eine zu viel.</div>
<div class="hin">Die vier <b>Ecken</b> sind doppelt belegt: der seitliche
Umschlag trifft auf den vorderen und den oberen. Sie werden wie gewohnt
ausgeklinkt; die Abwicklung zeigt das Blech als Rechteck.</div>
<p>DXF-Layer beim Tablett: <b>ZUSCHNITT</b>, <b>BIEGELINIE</b>,
<b>LOCHAUSSCHNITT</b>.</p>
<h4>Massaufnahme laden</h4>
<div class="hin">Der Weg geht in <b>beide Richtungen</b> (seit v3.192). In der
Massaufnahme stehen bei jeder Einfassung <b>⭕ Abwicklung Rohr</b> und
<b>▭ Abwicklung Tablett</b>. Umgekehrt holt hier
<b>📥 Masse aus einer Massaufnahme holen</b> die Masse aus einer bereits
<b>gespeicherten</b> Aufnahme „Einfassung rund“ – übernommen wird in das
oben gewählte Bauteil. Die Materialstärke kommt dabei aus dem gespeicherten
Datensatz, nicht aus einem zufällig offenen Formular.</div>`},

"lieferanten-lager":{titel:"Lieferanten-Lager",text:`
<p>Ein <b>zweites, eigenes Lager</b> f\u00fcr die Handelsware der Lieferanten \u2013
Rinnen, Stutzen, Haken, B\u00f6den. Es steht vollst\u00e4ndig <b>neben</b> der normalen
Lagerverwaltung: eigene Artikel, eigene Buchungen, eigene Zahlen.</p>
<div class="hin"><b>Warum getrennt?</b> Der Materialkatalog der Firma tr\u00e4gt
<i>eure</i> EDV-Nummern und f\u00fcllt Regierapport, Ausmass und Zuschnitt. Das
Sortiment des Lieferanten hat <i>seine</i> Artikelnummern. Beides in eine Liste
zu werfen, w\u00fcrde zwei Nummernkreise vermischen. Die bestehende
Lagerverwaltung und die Regiematerial-Liste bleiben unber\u00fchrt.</div>
<p><b>Neue Positionen</b> kommen als <b>Excel- oder CSV-Datei</b> herein. Das ist
derselbe Import wie beim Materialkatalog: Spalten frei zuordnen, vor dem
Speichern steht da, was neu ist und was sich \u00e4ndert. Eine Artikel-Nr., die es
beim gleichen Lieferanten schon gibt, wird <b>aktualisiert</b> statt doppelt
angelegt; <b>gel\u00f6scht wird nie</b> \u2013 was in der Datei fehlt, bleibt stehen.</p>
<div class="hin"><b>Von welchem Lieferanten ist die Datei?</b> Das wird
<i>einmal oben</i> gew\u00e4hlt und steht nicht in der Datei \u2013 eine Preisliste
kommt von genau einem H\u00e4ndler. Es ist auch mehr als eine H\u00f6flichkeit:
Artikelnummern sind nur <b>je Lieferant</b> eindeutig. Eine \u201e1001\u201c gibt es bei
jedem H\u00e4ndler, und ohne diese Angabe w\u00fcrde der n\u00e4chste Import stillschweigend
die Artikel des anderen \u00fcberschreiben.</div>
<p><b>\u2b07 Startsortiment einlesen</b> holt die Artikelliste, die mit der App
ausgeliefert wird \u2013 f\u00fcr den ersten Start, ohne selbst eine Datei zu suchen.</p>
<p><b>\U0001f4e5 Einscannen</b> und <b>\U0001f4e4 Ausscannen</b> \u00f6ffnen die Kamera. Der
erkannte Barcode f\u00fchrt direkt zum Buchen-Dialog \u2013 zu best\u00e4tigen ist nur noch
die Menge, vorgeschlagen ist die Verpackungseinheit. Ein Code, der hier nicht
bekannt ist, legt <b>nichts</b> an: dieses Lager ist das Sortiment des
Lieferanten, kein Ort f\u00fcr selbst erfundene Artikel. Geh\u00f6rt er zum eigenen
Material, ist er in der normalen Lagerverwaltung richtig.</p>
<div class="hin">Der <b>Bestand ist kein Feld</b>, sondern immer die Summe der
Buchungen. Eine Buchung l\u00e4sst sich nicht \u00e4ndern und nicht l\u00f6schen \u2013 ein
Fehler wird mit einer <b>Korrektur</b> ausgeglichen. So bleibt nachvollziehbar,
was wirklich passiert ist.</div>
<p><b>\U0001f4cb Einkaufsliste \u2013 was muss bestellt werden.</b> Auf die Liste kommt
etwas auf <b>zwei Wegen</b>, und beide beginnen damit, den Artikel in der Liste
<b>anzutippen</b>:</p>
<p><b>1. Dauerhaft \u2013 \u00fcber den Mindestbestand.</b> Trage die Menge ein, die da
sein soll. F\u00e4llt der Bestand darunter, f\u00e4llt das schon in der Lagerzeile auf
(rot, \u201e3 von 10\u201c) und der Artikel steht von selbst in der Einkaufsliste. Das ist
eine <b>Regel</b>, sie gilt weiter.</p>
<p><b>2. Einmalig \u2013 \U0001f6d2 Auf die Einkaufsliste.</b> Menge eintragen, bei Bedarf
dazuschreiben wof\u00fcr (\u201eBaustelle M\u00fcller\u201c), fertig. Daf\u00fcr braucht es
<i>keinen</i> Mindestbestand \u2013 gedacht f\u00fcr die Sonderbestellung. Abgehakt wird
sie in der Einkaufsliste mit <b>\u2713</b>.</p>
<div class="hin"><b>\U0001f6d2 heisst hinzuf\u00fcgen, \U0001f4cb heisst ansehen.</b> Stand ein
Artikel schon von Hand auf der Liste, kommen Menge und Grund beim \u00d6ffnen mit,
und der Knopf \u00e4ndert die vorhandene Zeile \u2013 je Artikel gibt es genau
<b>einen</b> offenen Wunsch. Eine Liste, in der derselbe Artikel dreimal steht,
sagt nicht, wie viel bestellt werden soll.</div>
<p>Steht ein Artikel <b>aus beiden Gr\u00fcnden</b> auf der Liste, werden die Mengen
<b>addiert</b> \u2013 beide Bedarfe sind echt: der Mindestbestand sagt, was ins Regal
zur\u00fcck muss, die Handmenge, was zus\u00e4tzlich auf die Baustelle geht. In der Zeile
steht, woraus sich die Bestellmenge zusammensetzt, damit nichts versteckt
gerechnet wird.</p>
<div class="hin"><b>Warum zwei Zahlen?</b> Die Fehlmenge ist die Wahrheit \u00fcber
den Mangel, die Bestellmenge die \u00fcber die Bestellung: wer 3 braucht und der
H\u00e4ndler liefert F\u00fcnferpackungen, bestellt 5. Aufgerundet wird auf die
<b>VPE</b> des Artikels.</div>
<p>Leer oder 0 heisst <b>nicht \u00fcberwachen</b>. Das ist Absicht: ein Sortiment
von 439 Artikeln, das jeden davon \u00fcberwacht, meldet 439-mal Mangel und wird nie
gelesen. \u00dcberwacht wird nur, was wirklich vorr\u00e4tig sein soll. Der
Mindestbestand l\u00e4sst sich auch in der <b>Excel-Datei</b> mitliefern (Spalte
\u201eMindestbestand\u201c).</p>
<p><b>\U0001f4cb Als Text kopieren</b> gibt die Liste als Text \u2013 zum Einf\u00fcgen in eine
E-Mail oder WhatsApp an den H\u00e4ndler. Erlaubt das Ger\u00e4t das Kopieren nicht,
steht der Text im Feld darunter und l\u00e4sst sich von Hand markieren.</p>
<p><b>Preise</b> sind freiwillig. Steht am Artikel einer, rechnet die
Einkaufsliste den Zeilenwert und unten eine Summe. <b>Fehlt er, wird die
Position NICHT mitgerechnet</b> \u2013 und die Liste sagt darunter, wie viele
Positionen ihr fehlen. Das ist Absicht: eine Summe, die fehlende Preise als
0 mitnimmt, sieht vollst\u00e4ndig aus und ist zu klein. Ist \u00fcberhaupt kein Preis
hinterlegt, steht gar keine Summe da.</p>
<div class="hin"><b>Ein Preis von 0 ist etwas anderes als kein Preis.</b> 0 heisst
\u201egratis\u201c und z\u00e4hlt in der Summe mit; ein leeres Feld heisst \u201eunbekannt\u201c. Beim
Preis steht auch, von wann er ist \u2013 ist er \u00e4lter als ein Jahr, sagt die App das.
Einzelne Preise tr\u00e4gst du am Artikel ein; die <b>Preisliste des H\u00e4ndlers</b>
kommt als Excel-Datei \u00fcber denselben Import wie alles andere (Spalte
\u201ePreis\u201c).</div>
<div class="hin"><b>Eine Preisliste darf nur zwei Spalten haben</b> (ab 3.245):
<b>Artikel-Nr.</b> und <b>Preis</b>. Die <b>Bezeichnung</b> braucht nur eine
<i>neue</i> Position \u2013 wer einen vorhandenen Artikel pflegt, hat sie schon in
der App, und eine Spalte, die in der Datei fehlt, wird ohnehin nie geleert. Eine
Nummer, die das Lager noch nicht kennt, wird dabei <b>ausgelassen</b> und
gez\u00e4hlt: ein neuer Artikel ohne Bezeichnung w\u00e4re eine Zeile ohne Namen.
Genauso l\u00e4uft eine Datei nur mit <b>Mindestbestand</b> oder nur mit
<b>Barcodes</b> durch.</div>
<p><b>\U0001f517 Zuordnen \u2013 die Br\u00fccke zur Regieliste.</b> Jeder Lieferantenartikel
kann auf eine <b>Regie-Position</b> zeigen: die Zeile eures Katalogs, mit der
er im <b>Regierapport</b> verrechnet wird \u2013 eure EDV-Nr., euer Preis.</p>
<div class="hin"><b>Warum nicht einfach zusammenlegen?</b> Weil es zwei
<i>Ebenen</i> sind, nicht zwei Listen. Eure Regieliste f\u00fchrt
\u201eRinnenseiher, alle Materialien\u201c \u2013 eine Abrechnungsposition. Der H\u00e4ndler
f\u00fchrt \u201eRinnenseiher 60 mm\u201c, \u201e75 mm\u201c und \u201e100 mm\u201c \u2013 drei Artikel.
<b>Viele Artikel zeigen auf dieselbe Position</b>, und das ist richtig so.</div>
<p><b>Zuordnen</b> arbeitet <b>gruppenweise</b>: oben eine <b>Produktgruppe</b>
w\u00e4hlen, darunter stehen nur deren Artikel. Daneben grenzt ein Suchfeld weiter
ein \u2013 nach Mass (\u201e250\u201c) oder Werkstoff (\u201eKupfer\u201c). So l\u00e4sst sich ein
Gr\u00f6ssenpaar getrennt behandeln, wenn 250 und 330 auf verschiedene Positionen
gehen.</p>
<p><b>Alle angezeigten setzen</b> legt die ganze sichtbare Auswahl auf eine
Position \u2013 EDV-Nr. eintippen oder w\u00e4hlen, best\u00e4tigen, fertig. <b>Was du siehst,
wird gesetzt</b>, nichts Unsichtbares.</p>
<div class="hin"><b>Die App lernt aus deiner Entscheidung.</b> Hast du in einer
Gruppe einen Artikel von Hand zugeordnet, schl\u00e4gt sie genau diese Position f\u00fcr
die \u00fcbrigen derselben Gruppe vor \u2013 \u201ewie 40\u00d7 in dieser Gruppe\u201c. Das schl\u00e4gt
jede Wort\u00e4hnlichkeit: ein <i>Rinnenstutzen</i> ist bei euch ein
<i>Einh\u00e4ngestutzen gerade</i>, und das kann die App am Namen nicht erkennen \u2013
sobald du es einmal sagst, gilt es f\u00fcr die Gruppe. Andere Gruppen lernen davon
nichts mit.</div>
<p><b>\u2705 Sichere Vorschl\u00e4ge einsetzen</b> nimmt in einem Zug alle angezeigten,
bei denen die App sicher ist oder das Gruppenmuster passt. <b>Gespeichert wird
erst</b>, wenn du <b>Speichern</b> dr\u00fcckst \u2013 oben steht, wie viele \u00c4nderungen
offen sind.</p>
<p><b>Ein Artikel ohne passende Regie-Position bleibt ohne.</b> Das ist kein
Fehler: nicht jeder Artikel des H\u00e4ndlers hat bei euch eine Position, und
umgekehrt gibt es Regie-Positionen, die gar keine Ware sind (Rollger\u00fcst,
Elektromaschinen). Erfunden wird nichts.</p>
<p><b>Die Gr\u00f6sse entscheidet (ab 3.243).</b> Oben steht, wie viele der
offenen Artikel wirklich <i>zu entscheiden</i> sind \u2013 und wie viele sich
<b>nicht</b> zuordnen lassen, weil die Regieliste ihre Gr\u00f6sse nicht
f\u00fchrt. Gemessen an eurem Bestand: 63 Artikel in 400 und 46 in 200, und die
Regieliste f\u00fchrt die Rinnenpositionen nur in 250 und 330. Das ist keine
Arbeit, die noch wartet \u2013 es gibt die Position nicht.</p>
<div class="hin"><b>Darum setzt die App dort nichts.</b> Eine 400er-Rinne auf
die 250er-Position w\u00e4re ein falscher Preis im Regierapport, und gesehen
h\u00e4tte es niemand. Weder das Gruppenmuster noch <b>\u2705 Sichere
Vorschl\u00e4ge</b> noch <b>Alle angezeigten setzen</b> greifen deshalb \u00fcber
eine widersprechende Gr\u00f6sse hinweg \u2013 ausgelassen wird benannt, nicht
stillschweigend. In der Auswahl steht bei so einer Zeile <b>\u26a0 ANDERE
GR\u00d6SSE</b>. Von Hand geht es weiterhin: es gibt F\u00e4lle, die nur du
kennst.</div>
<p><b>\U0001f4cb Was fehlt</b> macht daraus eine <b>Arbeitsliste</b> (ab 3.244)
\u2013 je Zeile <i>eine</i> Position, die du anlegen k\u00f6nntest, nicht je
Artikel. Sie steht direkt im Dialog und ist zus\u00e4tzlich kopiert. Zwei Teile,
weil sie Verschiedenes bedeuten:</p>
<p><b>A) Vorhandene Position in anderer Gr\u00f6sse.</b> Deine Liste f\u00fchrt sie
schon \u2013 <b>Name und Einheit stehen fest</b>, es fehlen nur EDV-Nr. und Preis.
Dabei folgt die App dem Stil <i>deiner</i> Liste: beim Blech je Werkstoff
(201.01 Kupfer, 201.11 Titanzink, 201.13 Chromnickelstahl), beim Formteil als
\u201ealle Materialien\u201c (203.41 Einh\u00e4ngestutzen, 203.21 Rinnenboden). Welcher
Stil in einer Gruppe gilt, verr\u00e4t sie selbst \u2013 geraten wird nichts.</p>
<p><b>B) Warenart fehlt ganz.</b> Rinnenhaken eckig, Rinnenkugelb\u00f6den,
Schr\u00e4gstutzen: hier ist es keine Kopie, sondern eine fachliche Entscheidung
\u2013 gibt es die Position bei euch, und unter welchem Namen? Die App nennt dazu
die \u00e4hnlichste vorhandene zur Orientierung.</p>
<div class="hin"><b>EDV-Nr. und Preis schl\u00e4gt die App bewusst NICHT vor.</b>
Eine geratene Nummer landet in deinem Nummernsystem, ein geratener Preis auf
einer Rechnung. Angelegt wird in der <b>Lagerverwaltung</b> unter \u201eneues
Material anlegen\u201c; die App legt in der Regieliste von selbst nichts an.
Solange die Position fehlt, bleiben diese Artikel ohne und lassen sich im
Regierapport nicht scannen \u2013 auch das ist eine Antwort.</div>
<p><b>„Dafür gibt es bei uns keine Regie-Position"</b> (ab 3.249). Nicht jeder
Artikel des Händlers hat bei euch eine Abrechnungsposition, und manche werden
auch keine bekommen. Das lässt sich jetzt <b>festhalten</b> – je Zeile mit dem
Schalter, oder für alle angezeigten mit <b>🚫 Alle angezeigten: keine
Regie-Position</b>. Zurücknehmen geht genauso.</p>
<div class="hin"><b>Entschieden ist nicht erledigt, und erst recht nicht
archiviert.</b> Der Artikel bleibt im Lager <i>voll nutzbar</i>: Bestand,
Mindestbestand, Einkaufsliste und Inventur brauchen keine Regie-Position – nur
das <b>Verrechnen im Regierapport</b> braucht sie. Deshalb wird er nicht
archiviert, er zählt nur nicht mehr als „offen" und steht nicht mehr in
<b>📋 Was fehlt</b>.<br>
<b>Warum das wichtig ist:</b> ein Knopf, der dauerhaft „158 offen" meldet,
zeigt Arbeit an, die keine ist – und verdeckt die echte, sobald eine neue
Lieferantenliste dazukommt. Wie viele entschieden sind, steht oben weiterhin
da; verschwiegen wird nichts.</div>
<div class="hin"><b>Beim Scannen sagt die App dann etwas anderes.</b> Solange
ein Artikel nur <i>noch nicht</i> zugeordnet ist, rät sie zum Nachtragen. Ist
entschieden, dass es keine Position gibt, rät sie das <b>nicht</b> mehr – ein
Rat ins Leere ist schlimmer als keiner. Sie sagt dann, dass sich der Artikel
nicht übernehmen lässt und das Material von Hand erfasst wird.<br>
Ein Artikel <b>mit</b> Zuordnung kann die Entscheidung nicht tragen: erst die
Zuordnung entfernen. Diese Regel steht in der Datenbank, nicht im Formular –
zwei Wahrheiten über dieselbe Frage gibt es nicht.</div>
<div class="hin">Auch eine <b>bereits gespeicherte</b> Zuordnung wird gefragt,
wenn die Gr\u00f6ssen nicht zusammenpassen: \u201ezugeordnet auf Gr\u00f6sse 250 \u2013
stimmt das?\u201c. Ge\u00e4ndert wird nichts von selbst. Eine Dimension, die
<i>keine</i> Gr\u00f6sse ist \u2013 \u201ebis 120\u201c, \u201eB 122\u201c \u2013 l\u00f6st
nie eine Warnung aus; ein 60er-Seiher auf \u201ebis 120\u201c ist richtig.</div>
<div class="hin">Die <b>Regieliste selbst wird dabei nur gelesen</b>. An euren
EDV-Nummern, Preisen und am Regierapport \u00e4ndert sich nichts.</div>
<p><b>Mehrere Lieferanten.</b> Sobald mehr als einer da ist, erscheint oben eine
<b>Übersicht</b> (je Lieferant: Artikel, zugeordnet, mit Preis, mit Bestand) und
ein <b>Filter</b>. Der Filter ist <i>einer</i> für alle <b>vier</b> Ansichten –
Artikelliste, Zuordnen, Inventur und <b>Einkaufsliste</b> (ab 3.246): „an welchem
Lieferanten arbeite ich gerade“ ist eine Frage, nicht vier. Mit nur einem
Lieferanten bleiben beide weg.</p>
<div class="hin"><b>Bei der Einkaufsliste ist das mehr als Übersicht:</b> eine
Bestellung geht an <b>genau einen</b> Händler. Deshalb gehören auch die
<b>Summe</b> und der <b>verschickte Text</b> zum gewählten Lieferanten – der Text
trägt ihn im Titel und enthält den anderen nicht. Eine Summe quer über zwei
Händler wäre eine Zahl, die zu keiner Bestellung gehört.<br>
Was der Filter ausblendet, <b>steht da</b>: „Bei anderen Lieferanten fehlen
zusätzlich 4 Positionen." Und der Zähler am Knopf <b>📋 Einkaufsliste (7)</b>
zählt weiterhin <i>alle</i> – er ist das Signal „es liegt Arbeit", nicht die
Bestellung. Eine Bestellung, die niemand aufgibt, weil sie hinter einem Filter
lag, wäre der teure Fall.</div>
<div class="hin">Wichtig dabei: <b>„Alle angezeigten setzen“</b> greift nie über
den gewählten Lieferanten hinaus – weder beim Zuordnen noch beim
Mindestbestand. Und die Gruppenauswahl zeigt nur die Gruppen dieses
Lieferanten.</div>
<p>Beim <b>Hochladen</b> warnt die App, wenn der eingetippte Lieferantenname
einem vorhandenen zu ähnlich ist („bteam“ neben „B-Team“) – sonst entstünde
ein <b>zweiter</b> Lieferant mit eigenem Nummernkreis, und auffallen würde das
erst viel später. Geblockt wird nichts: es kann einen Händler geben, der
wirklich so ähnlich heisst.</p>
<p><b>\U0001f9ee Inventur – Bestand und Mindestbestand erfassen.</b> Regal für Regal
durchgehen: oben die <b>Produktgruppe</b> wählen, dann je Zeile <b>gezählt</b>
eintragen und gleich daneben, wie viel immer da sein soll. Mit
<b>Setzen</b> bekommen alle angezeigten Artikel in einem Zug denselben
Mindestbestand.</p>
<div class="hin"><b>Ein leeres Feld heisst „nicht gezählt“</b>, nicht „null
Stück“. Nur so lässt sich ein einzelnes Regal zählen und der Rest in Ruhe
lassen. Gespeichert wird erst mit <b>Speichern</b>.</div>
<p>Eine Abweichung wird als <b>Korrektur</b> gebucht, nicht als Zugang: eine
Korrektur sagt „der Bestand ist in Wirklichkeit dieser“, ein Zugang würde
behaupten, Ware sei angekommen. Gebucht wird die <b>Differenz</b> – bei Bestand
10 und gezählten 14 also +4. In den Bewegungen steht sie mit der Herkunft
<i>inventur</i>.</p>
<p><b>\U0001f4e5 Wareneingang – wenn die Lieferung kommt.</b> In der Einkaufsliste
steht bei jeder Zeile ein <b>\U0001f4e5</b>: es öffnet den Zugang mit der
<b>Bestellmenge</b> vorbelegt – mit der Liste in der Hand ist das die Zahl vom
Lieferschein. Beim Ein- und Ausscannen geht es genauso.</p>
<div class="hin"><b>Die Regel ist eine einzige: was da ist, fehlt nicht mehr.</b>
Buchst du den Zugang, wird ein offener Einkaufswunsch nachgeführt –
<b>vollständig geliefert</b> hakt ihn ab, eine <b>Teillieferung verringert</b>
ihn. Schon vor dem Buchen steht im Dialog, was passieren wird: „Offener
Einkaufswunsch: 12 · danach bleiben 7 offen.“</div>
<p>Den Wunsch bei einer Teillieferung auf der alten Menge stehen zu lassen wäre
der teure Fehler – die Liste würde weiter die ganze Menge verlangen, und beim
nächsten Bestellen käme das Zuwenig doppelt.</p>
<p><b>Rest streichen</b> ist die Ausnahme: der Rest kommt gar nicht mehr
(abgesagt, ersetzt). Der Haken ist immer <b>aus</b>, solange du nichts sagst –
ein stillschweigend gestrichener Rest wäre Ware, die niemand mehr bestellt und
die auf der Baustelle fehlt. Die <i>gewünschte</i> Menge bleibt dabei
unverändert festgehalten.</p>
<p><b>\U0001f4dc Bewegungen</b> zeigt jede Buchung dieses Lagers, die neueste
zuoberst: Zeitpunkt, Art, Menge, Artikel, Grund, Ziel, Projekt und wer sie
gemacht hat. Filtern nach Zugang / Abgang / Korrektur, suchen nach Artikel,
Projekt oder Person.</p>
<div class="hin"><b>Warum das wichtig ist:</b> seit dem Scannen im Regierapport
bucht die App <i>selbst</i>. Hier siehst du nach, was sie getan hat \u2013 eine
Buchung, die niemand ansehen kann, ist eine Buchung, die niemand pr\u00fcfen kann.
Gerechnet wird in dieser Liste nichts; der Bestand steht in der Artikelliste,
und zwei Rechnungen \u00fcber dasselbe w\u00e4ren zwei Wahrheiten.</div>
<p>Die Liste ist <b>vollst\u00e4ndig</b>: eine Buchung l\u00e4sst sich nicht \u00e4ndern und
nicht l\u00f6schen, ein Fehler wird mit einer <b>Korrektur</b> ausgeglichen. Auch
eine Buchung auf einen inzwischen entfernten Artikel steht noch da \u2013 sie ist
ja trotzdem passiert.</p>
<p>Sichtbar ist der Punkt f\u00fcr alle mit <b>Lager-Zugriff</b> \u2013 dieselbe
Freigabe wie f\u00fcr die Lagerverwaltung (Einstellungen \u2192 Mitarbeiter).</p>`},

"fingerabdruck":{titel:"Fingerabdruck",text:`
<p>Ist er eingeschaltet, ist die App auf <b>diesem Gerät</b> gesperrt: beim
Öffnen steht ein Schloss davor, Finger auflegen, drin – ohne Benutzername und
Passwort zu tippen.</p>
<p>Der Abdruck <b>verlässt das Gerät nie</b>. Die App bekommt vom
Betriebssystem nur ein Ja oder Nein; gespeichert wird lediglich, dass zu
diesem Konto auf diesem Gerät ein Schlüssel hinterlegt ist. Der Schalter
erscheint nur, wenn das Gerät wirklich einen Sensor anbietet – sonst steht
hier, dass es das Gerät nicht kann, statt eines Knopfes, der nichts tut.</p>
<div class="hin"><b>Jeder für sich.</b> Das ist keine Firmeneinstellung: wer
den Fingerabdruck will, schaltet ihn auf seinem eigenen Gerät ein, und wer
nicht, lässt es. Niemand schaltet ihn für jemand anderen ein oder aus.</div>
<div class="hin"><b>Der Weg über das Passwort bleibt immer offen.</b> Am
Schloss steht auch <b>Abmelden und mit Passwort anmelden</b> – ein zickiger
Sensor darf niemanden aus seiner eigenen App aussperren. Wird der Finger
nicht erkannt, steht der Grund sichtbar auf dem Schloss.</div>
<div class="hin"><b>Nach dem Abmelden braucht es einmal das Passwort.</b> Das
ist Absicht und keine Störung: Abmelden macht den gespeicherten Zugang
ungültig, und der Fingerabdruck kann ihn nicht ersetzen – er sperrt die
laufende Anmeldung nur auf und zu. Eingerichtet bleibt er dabei und sperrt
nach der nächsten Anmeldung wieder.</div>
<div class="warn"><b>Nur für ein persönliches Gerät.</b> Wer das entsperrte
Gerät in der Hand hat, kommt damit in dein Konto. Auf einem geteilten
Werkstatt-Tablet deshalb ausgeschaltet lassen.<br><br>
Ehrlich dazugesagt, damit die Einschätzung stimmt: es ist ein <i>Schloss</i>
vor einem Zugang, den die App ohnehin schon auf dem Gerät speichert – keine
Verschlüsselung. Es macht die App sicherer als vorher, denn davor stand gar
nichts.</div>`},

"kontowechsel":{titel:"Konto wechseln",text:`
<div class="hin"><b>Der Firmenadministration vorbehalten.</b>
Mitarbeitende sehen diesen Punkt nicht. Der <b>Fingerabdruck</b> hat einen
eigenen Punkt:
<b>Mehr → Dieses Gerät → Fingerabdruck</b> – den stellt weiterhin jeder
für sich ein.</div>
<p>Wer zwei Konten hat – etwa das eigene und eines in einer Testfirma –,
musste sich bisher jedes Mal ab- und wieder anmelden. Hier lässt sich
zwischen Konten wechseln, die auf diesem Gerät <b>schon einmal angemeldet
waren</b>, ohne das Passwort erneut einzugeben.</p>
<p>Mit <b>＋ Weiteres Konto hinzufügen</b> kommt der Anmeldebildschirm; das
bisherige Konto bleibt dabei gespeichert, und <b>↩ Zurück</b> führt ohne
Abmelden wieder hinein.</p>
<div class="hin"><b>Die App lädt beim Wechsel neu.</b> Das ist Absicht: so
kann nichts aus der einen Firma in der anderen stehenbleiben – keine Liste,
keine Zahl, kein Zwischenspeicher.</div>
<div class="hin"><b>An den Rechten ändert sich nichts.</b> Es sind zwei
getrennte Anmeldungen; für die Datenbank ist ein Wechsel dasselbe wie eine
neue Anmeldung. Niemand sieht dadurch mehr, als ihm sein Konto zeigt.</div>
<div class="warn">Ein gemerktes Konto lässt sich auf diesem Gerät
<b>ohne Passwort</b> öffnen. Auf einem persönlichen Arbeitsgerät ist das der
Zweck; auf einem geteilten Gerät gehört es mit <b>entfernen</b> wieder weg.
„Entfernen“ wirkt nur auf diesem Gerät – das Konto selbst bleibt
unangetastet.</div>
<p>Zwei Fälle, in denen nicht gewechselt wird, mit Begründung auf dem
Bildschirm: <b>ohne Verbindung</b> (die andere Firma hätte keine Daten) und
solange <b>etwas auf die Übertragung wartet</b> (das gehört zur jetzigen
Firma und ginge verloren). Gilt der gespeicherte Zugang nicht mehr – etwa
nach einer Passwortänderung –, sagt die App das und entfernt ihn.</p>`},

"einst-kontrollen":{titel:"Kontrolle der Stammdaten",text:`
<p>Die Einrichtungs-Checkliste fragt, <b>ob</b> etwas da ist. Diese Liste
fragt, ob das, was da ist, auch <b>stimmt</b>. Ein Katalog mit 381 Positionen
kann vollständig aussehen und trotzdem vier Zeilen ohne Einheit enthalten –
das sieht im Alltag niemand, weil niemand 381 Zeilen durchgeht.</p>
<ul>
<li><b>Rot</b> heisst: die App rechnet an dieser Stelle nicht oder falsch.
Ein Blech ohne Werkstoff bekommt keine Dilatation, eine Tafel ohne Format
keinen Zuschnittplan.</li>
<li><b>Blau</b> ist ein Hinweis. Es funktioniert, sieht aber nach einem
Versehen aus – etwa ein Reststück, das kleiner ist als das eigene
Mindestmass und deshalb nie verwendet wird.</li>
</ul>
<p>Jeder Punkt hat den Knopf <b>öffnen</b>: er führt dorthin, wo sich der
Befund beheben lässt. Es gibt hier <b>kein eigenes Formular</b> – korrigiert
wird immer an der Stelle, an der das Feld ohnehin steht.</p>
<div class="hin"><b>„Ist so gewollt“.</b> Manche Befunde sind Absicht: eine
Position mit Preis 0.00 kann eine Beistellung des Kunden sein, und ein
<b>Werkstoff ohne Dehnungswerte</b> ist bei Blei genau richtig – Blei liegt
nicht in langen Bahnen, da ist nichts zu dilatieren. Der Knopf hakt genau
diesen einen Eintrag ab; er zählt dann nicht mehr mit, bleibt aber unter
<b>„x abgehakt – anzeigen“</b> sichtbar und lässt sich jederzeit wieder
melden. Abhaken darf nur der Firmenadministrator.<br>
Abgehakt wird immer der <b>einzelne Eintrag</b>, nie die Prüfung: ein später
angelegter Werkstoff ohne Dehnungswerte meldet sich wieder.</div>
<div class="hin">Nichts wird hier von selbst geändert, und nichts wird
gespeichert ausser dem Abhaken: Der Befund selbst wird <b>jedes Mal neu</b>
aus den echten Daten gerechnet. Verschwindet die Ursache, verschwindet auch
die Meldung – ohne dass jemand etwas quittieren muss.</div>
<p>Die Prüfung „Katalogposition, die nie vorkam“ braucht das Zählwerk. Ist es
ausgeschaltet, fällt sie aus und sagt das – ohne Zählung wäre jede Position
„nie benutzt“.</p>
<p><b>Lieferanten-Lager</b> (ab 3.247): zwei Prüfungen, und bewusst nur diese
zwei – nämlich die Zustände, die man sonst <i>nicht sieht</i>.</p>
<ul>
<li><b>Artikel auf einer Position anderer Grösse</b> (rot). Der Artikel zeigt
auf eine Regie-Position, deren Grösse nicht zu ihm passt – eine 400er Rinne
auf der 250er. Wird er gescannt, steht der Preis der anderen Grösse auf der
Rechnung. Seit 3.243 setzt die App das nicht mehr von selbst; bestehende
Zuordnungen sind aus der Zeit davor. <b>Abhakbar</b>, denn es kann fachlich
gewollt sein.</li>
<li><b>Artikel mit negativem Bestand</b> (rot). Es wurde mehr ausgebucht als
je eingebucht – meist ein Scan ohne erfassten Zugang. <b>Nicht abhakbar</b>:
eine falsche Zahl bleibt falsch, behoben wird sie mit einem Zugang oder einer
Korrektur.</li>
</ul>
<div class="hin"><b>Warum nicht mehr?</b> „158 Artikel ohne Regie-Position“ und
„in dieser Gruppe ist noch nichts zugeordnet“ stehen schon am Knopf
<b>🔗 Zuordnen</b> und im Kopf der Zuordnen-Ansicht. Hier wären sie eine
zweite Stelle für dieselbe Zahl – und zwei Stellen laufen irgendwann
auseinander.<br>
Beide Prüfungen brauchen das <b>geladene</b> Lieferanten-Lager. Warst du noch
nicht dort, fallen sie aus und sagen das – eine leere Liste wäre sonst die
Auskunft „alles in Ordnung“, und das ist der teure Irrtum.</div>`},

"einst-rollen":{titel:"Rollenbreiten des Blechlagers",text:`
<p>Welche Blechrollen die Firma an Lager führt. Gilt <b>firmenweit</b> und
für alle Massaufnahmen mit Rollenblech-Zuschnitt.</p>
<p>In der einzelnen Massaufnahme lässt sich im Register "Zuschnitt"
einschränken, welche davon dort verwendet werden.</p>`},

"einst-massvorgaben":{titel:"Vorgabemasse",text:`
<p>Diese Werte sind <b>Richtwerte</b>. Seit 3.65 füllen sie eine neue
Massaufnahme <b>nicht mehr von selbst</b> vor: im Formular steht neben dem
leeren Feld ein kleiner Knopf mit der Zahl, und erst ein Antippen trägt sie
ein. So kann kein Mass unbemerkt im Datensatz landen, das für diesen Bau nie
jemand gemessen hat.</p>
<p><b>Das Zählwerk</b> (ab 3.172): Daneben steht, was dieser Betrieb an
derselben Stelle <b>tatsächlich gemessen</b> hat – „3× so gemessen“. Weichen
Richtwert und eigene Messung voneinander ab, stehen <b>beide</b> Knöpfe da,
farblich unterschieden; welcher gilt, entscheidet weiterhin die Person am
Bau. Gezählt wird nur innerhalb der eigenen Firma und nur über wirklich
gemessene Felder – Abwicklungen, Zuschnitte und Flächen sind gerechnet und
werden deshalb nicht zurückgespiegelt.</p>
<p>Ab der <b>zweiten</b> Messung desselben Feldes sagt die App etwas. Eine
einzelne Aufnahme ist ein Bau, keine Gewohnheit.</p>
<p>Eine Änderung hier wirkt <b>nie rückwirkend</b> auf bereits erfasste
Massaufnahmen – eine einmal gespeicherte Massaufnahme rechnet weiter mit den
Werten, die beim Erfassen galten.</p>
<p>Die Vorgabemasse gelten je Gerät, nicht firmenweit. Die Zählung der
eigenen Messungen dagegen gilt für die <b>ganze Firma</b>: sie kommt aus den
gespeicherten Massaufnahmen, nicht vom Gerät.</p>`},

"am-uebernehmen":{titel:"Aus Massaufnahme \u00fcbernehmen",text:`
<p>Holt die <b>fertig gerechneten Massen</b> einer Massaufnahme dieses Projekts
ins Ausmass \u2013 L\u00e4ngen, St\u00fcckzahlen, Fl\u00e4chen. Getippt werden muss nichts.</p>
<p>Ausgew\u00e4hlt wird <b>zeilenweise</b>: was nicht gebraucht wird, bleibt stehen.
Nichts wird automatisch \u00fcbernommen \u2013 was im Ausmass steht, wird verrechnet,
und das soll bewusst entschieden sein.</p>
<div class="hin">Die \u00fcbernommene Zeile ist danach eine <b>eigene</b>
Ausmasszeile. \u00c4ndert die Massaufnahme sp\u00e4ter, \u00e4ndert sie sich nicht mit \u2013
dann noch einmal \u00fcbernehmen.</div>`},

"rapport-blech":{titel:"Blechverbrauch",text:`
<p>Rechnet mehrere Zuschnitte zu <b>einer Fl\u00e4che in m\u00b2</b> zusammen und schreibt
sie als eine Zeile in den Regierapport. Material w\u00e4hlen, dann beliebig viele
L\u00e4ngen und Breiten in Millimetern erfassen.</p>
<p>Gedacht f\u00fcr Blech, das <b>nicht</b> aus einer Massaufnahme kommt \u2013 der
Zuschnitt von Hand auf der Baustelle. Was aus einer Massaufnahme stammt, kommt
besser \u00fcber <b>Material aus den Massaufnahmen \u00fcbernehmen</b> in den Rapport:
dort rechnet die App die Fl\u00e4che ohnehin schon.</p>`},

"beispielkatalog":{titel:"Beispiel-Positionen",text:`
<p>Bei der Registrierung legt die App ein paar Beispiel-Positionen an, damit sich
Rapport, Lager und Zuschnitt sofort ausprobieren lassen, bevor der eigene Katalog
steht.</p>
<p>Hier lassen sie sich wieder entfernen, sobald der eigene Katalog da ist.
Entfernt werden <b>nur Positionen, die nirgends benutzt werden</b> \u2013 wurde auf
eine davon schon gebucht oder verweist ein Rapport darauf, bleibt sie stehen und
die App sagt, warum.</p>`},

"sysadmin-neue-firma":{titel:"Neue Firma registrieren",text:`
<p>Legt eine Firma mit <b>30 Tagen Testphase</b> an, samt erstem
Administratorkonto. Das Passwort erzeugt die App selbst und schickt es an die
angegebene E-Mail-Adresse \u2013 es wird hier nicht angezeigt und ist auch sp\u00e4ter
nirgends nachlesbar.</p>
<div class="hin">Der eigene System-Admin-Zugang bleibt dabei unver\u00e4ndert: es
findet <b>keine</b> automatische Anmeldung als neue Firma statt.</div>`},

"sysadmin-firma":{titel:"Eine Firma verwalten",text:`
<p>Zeigt Status und Testphase einer Firma und l\u00e4sst beides \u00e4ndern \u2013 Testphase
verl\u00e4ngern, auf Abo setzen, sperren oder wieder freigeben. Eine gesperrte Firma
kommt nicht mehr hinein; ihre Daten bleiben unber\u00fchrt.</p>
<p>Es gibt hier bewusst <b>keinen</b> Zugriff auf Projekte, Massaufnahmen oder
Rapporte dieser Firma. Das ist keine Anzeigefrage, sondern in der Datenbank so
abgesichert.</p>`},

"sysadmin-loeschen":{titel:"Firma endg\u00fcltig l\u00f6schen",text:`
<p>L\u00f6scht die Firma mit <b>allem, was daran h\u00e4ngt</b>: Konten, Projekte,
Massaufnahmen, Rapporte, Offerten, Lagerbuchungen, Fotos und Dateien.</p>
<div class="warn"><b>Das l\u00e4sst sich nicht r\u00fcckg\u00e4ngig machen.</b> Es gibt keinen
Papierkorb und keine Wiederherstellung aus der App heraus. Deshalb muss der
Firmenname von Hand eingetippt werden \u2013 ein Klick allein gen\u00fcgt nicht.</div>
<p>Gedacht f\u00fcr Testfirmen und f\u00fcr Betriebe, die ihre L\u00f6schung ausdr\u00fccklich
verlangen. F\u00fcr alles andere ist <b>sperren</b> der richtige Weg.</p>`},

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
Startpasswort gilt also nur für den einen ersten Zugang.</p>
<div class="hin"><b>Was ein eigenes Passwort erfüllen muss</b> (ab 3.248):
mindestens <b>8 Zeichen</b>, und es darf nicht das Offensichtliche sein. Die
App weist ab, was als Erstes durchprobiert wird – <b>12345678</b>, eine
durchlaufende Zahlenreihe, immer dasselbe Zeichen, „passwort", „spengler", und
den eigenen Namen oder den Firmennamen, wenn danach kaum etwas übrig bleibt
(„Künzi1x" nein, „Mike-Winterdach-7" ja). Jede Ablehnung sagt, <i>woran</i>
es liegt.<br>
<b>Sonderzeichen, Ziffern und Grossbuchstaben verlangt die App bewusst
nicht.</b> Erzwungene Komplexität erzeugt „Sommer2026!" und Zettel am
Bildschirm. Was wirklich trägt: <b>ein paar Wörter hintereinander</b> –
leicht zu merken, schwer zu raten. Die Regel gilt überall gleich: beim
eigenen Passwort, beim Zurücksetzen und bei der Registrierung.</div>
<p>Wurde beim Anlegen eine <b>E-Mail-Adresse</b> angegeben, steht sie im Text
mit dabei (die Anmeldung geht dann mit dem Benutzernamen <i>oder</i> der
Adresse), und die Zugangsdaten gehen zusätzlich per E-Mail hinaus. Ob der
Versand geklappt hat, steht unter dem Textfeld – und zwar so, wie der Server
es meldet. Hat er <b>nicht</b> geklappt, ist der Text hier der einzige Weg:
bitte weitergeben, bevor die Box geschlossen wird.</p>`},
"excel-import":{titel:"Liste aus Excel einlesen",text:`
<p><b>📄 Wie muss die Datei aufgebaut sein?</b> klappt eine Tabelle auf, in der
jede Spalte steht – und darunter, wie ihre Überschrift heissen darf. Das ist
die Stelle zum Nachsehen, bevor du eine Datei hochlädst. <i>Ab 3.250 passt
diese Tabelle auch auf das Handy:</i> sie war 1000 px breit und lief rechts aus
dem Bild, ohne sich schieben zu lassen – ausgerechnet die Spalte mit den
erlaubten Überschriften war damit unerreichbar.</p>
<p>Eine Lieferantenliste als Excel- oder CSV-Datei einlesen, statt sie
abzutippen. Die Datei muss <b>keine bestimmte Spaltenreihenfolge</b> haben:
nach dem Auswählen wird gezeigt, welche Spalte die App wofür hält, und das
lässt sich für jedes Feld ändern.</p>
<p>Pflichtfelder sind mit einem roten Stern gekennzeichnet. Zeilen, bei denen
ein Pflichtfeld leer ist, werden <b>nicht</b> importiert – wie viele das sind,
steht über der Vorschau. Erst was in der Vorschau steht, wird auch gespeichert.</p>
<p>Der Import <b>gleicht ab</b>: eine Nummer, die es schon gibt, wird
aktualisiert statt ein zweites Mal angelegt. Über der Vorschau steht vorher,
wie viele Positionen <b>neu</b> sind, wie viele <b>geändert</b> werden und wie
viele <b>unverändert</b> bleiben; bei jeder Änderung steht der alte und der
neue Wert nebeneinander – so fällt ein verrutschter Preis vor dem Speichern
auf.</p>
<p><b>Gelöscht wird nie.</b> Positionen, die in der Datei fehlen, bleiben
unverändert stehen. Auch ein Feld, für das die Datei keine Spalte mitbringt
(z. B. Dim.), behält seinen bisherigen Wert – es wird nicht geleert.</p>
<p>Kommt dieselbe Nummer in der Datei <b>zweimal</b> vor, wird der Import
abgebrochen und die Nummer genannt: dann ist nicht bestimmt, welche Zeile
gelten soll. In diesem Fall wird gar nichts geschrieben.</p>
<p>Wie die Datei aufgebaut sein muss, steht direkt über dem Import-Knopf unter
<b>„Wie muss die Excel-Datei aufgebaut sein?"</b> – mit allen Spalten und den
Überschriften, die dafür erkannt werden. Preise gehören als reine Zahl in die
Zelle (<code>7.90</code>, <code>7,90</code>, <code>1'250.00</code>); steht dort
Text wie <code>Fr. 7.90</code>, kann die Zahl nicht gelesen werden – die
Vorschau sagt dann, wie viele Zeilen das betrifft.</p>`},
"einst-material":{titel:"Werkstoffe",text:`
<p>Diese Liste füllt die <b>Werkstoff</b>-Auswahl bei jeder
Massaufnahme-Art. Gilt <b>firmenweit</b>.</p>
<div class="hin"><b>Werkstoff, Artikel, Bestand – drei Dinge</b> (ab 3.176).
Sie hiessen bis hierher alle „Material“, und das war nicht
auseinanderzuhalten:
<ul>
<li><b>Werkstoff</b> – Kupfer, Titanzink, Aluminium. Diese Liste. Trägt die
Dehnungswerte und steuert die Massaufnahme.</li>
<li><b>Artikel</b> – die EDV-Nr. im Materialkatalog, mit Preis und Einheit.
Steuert die Verrechnung. Ein Werkstoff hat oft mehrere Artikel (Kupfer:
0,6 Rolle, 0,8 Tafel, 1,0 Tafel).</li>
<li><b>Bestand</b> – <b>Material &amp; Blech</b> im Register Blech, mit Stärke
und Rolle/Tafel. Steuert den Zuschnitt.</li>
</ul>
Zusammengelegt werden sie bewusst nicht: ein Werkstoff muss wählbar sein,
auch wenn er gerade nicht am Lager liegt, und die Dehnungswerte gehören zum
Werkstoff – nicht an jede einzelne Katalogposition.</div>
<p><b>＋ Neue Materialposition</b> (über der Liste) öffnet denselben Dialog
wie „＋ Neues Material / Produkt" in der Lagerverwaltung: Bezeichnung, Dimension,
Einheit und Preis, dazu ein Vorschlag für die EDV-Nr. mit Begründung. Ein
Schalter oben entscheidet, ob gleich auch ein <b>Lager-Produkt</b> (mit
Barcode) dazu entsteht – aus dieser Liste heraus ist er aus, aus der
Lagerverwaltung an. Umstellen lässt er sich jederzeit.</p>
<p>Die beiden Zahlenfelder (maximaler Abstand und Abstand ab Fixpunkt) werden
nur bei "Dachrinne" und "Mauerabdeckung" für die Dehnungsabstände
gebraucht – bei allen anderen Arten leer lassen.</p>
<p><b>Woraus ist ein Artikel?</b> (ab 3.176) Im Materialkatalog trägt jede
Position ein Feld <b>Werkstoff</b>. Nur bei Blech nötig – Schrauben und
Dichtband brauchen keinen. Bis hierher stand diese Antwort nur im
Materialbestand: eine neue Blechposition musste an zwei Stellen gepflegt
werden, und beim Löschen der Lagerzeile war die Information weg.</p>`},

"einst-rinne-typen":{titel:"Dachrinne",text:`
<p><b>Normlängen:</b> in welchen Längen das Rinnenprofil je Material und
Grösse bezogen wird. Ist nichts hinterlegt, rechnet die App den
Materialbedarf nicht – statt mit einer geratenen Stangenlänge.</p>
<p><b>Dilatationselement (Dila):</b> zwei getrennte Werte – der eine wirkt nur
auf den <b>Zuschnitt</b> (Materialbedarf), der andere nur auf die
<b>Ausmass</b>-Länge (was in der Massaufnahme als Meterzahl erscheint). Beide
sind unabhängig voneinander.</p>
<p><b>Anschlusstypen:</b> Ecken und Stutzen, je mit zwei Werten – einem
Zuschlag für den <b>Zuschnitt</b> und einem eigenen, unabhängigen Zuschlag nur
für die <b>Ausmass</b>-Länge. Ob ein Typ ein <b>Fixpunkt</b> ist, entscheidet,
ob er die Rinne für die Dehnungsberechnung teilt.</p>`},

"einst-sicherung":{titel:"Datensicherung",text:`
<p>Speichert die Einstellungen und Kataloge als Datei auf diesem Gerät.</p>
<p>Das ist <b>keine</b> Sicherung der Projekte, Massaufnahmen und Fotos –
die liegen auf dem Server und werden dort gesichert.</p>`},

"einst-firma":{titel:"Firma",text:`
<p>Firmenname, Adresse, Logo und MWST-Satz. Erscheinen im Kopf jedes PDF und
auf dem Startbildschirm.</p>
<p>Gilt <b>firmenweit</b> – eine Änderung sehen alle Mitarbeiter.</p>`},

"meas-rapportmaterial":{titel:"Material für den Regierapport",text:`
<div class="hin"><b>Das Zählwerk</b> (ab 3.169): Weil diese Liste zu
<em>einer</em> Massaufnahme gehört, ordnet die Suche hier zuerst nach dem,
was bei <b>dieser Art</b> Massaufnahme schon erfasst wurde – „7× bei dieser
Art“. Ist zur Art noch nichts bekannt, zählt wie überall sonst die
Gesamtzahl des Betriebs. Ausgeblendet wird auch hier nichts.</div>
<p>Hier wird festgehalten, welches <b>Material auf dieser Baustelle
verbraucht</b> wird – Schrauben, Dichtmasse, Halter und alles andere, was
nicht aus der Berechnung der Massaufnahme entsteht.</p>
<p>Gesucht wird im gewöhnlichen Materialkatalog über die EDV-Nummer. Es
entsteht kein zweiter Katalog, und es wird <b>kein Preis</b> gespeichert –
der kommt erst im Regierapport aus dem Katalog.</p>
<p>Im Regierapport dieses Projekts lässt sich alles hier Erfasste mit dem
Knopf <b>„🧱 Aus Massaufnahmen übernehmen"</b> in einem Schritt in die
Materialliste holen.</p>
<p>Eine Materialzeile lässt die <b>Freigabe nicht verfallen</b> – sie ändert
nichts an der fachlichen Grundlage, nach der gerüstet und montiert wird.</p>`},

"rmat-uebernehmen":{titel:"Material aus den Massaufnahmen",text:`
<p>Angeboten wird, was in den Massaufnahmen <b>dieses Projekts</b> unter
„Material für den Regierapport" erfasst ist.</p>
<p>Eine EDV-Nummer, die bereits im Rapport steht, ist <b>nicht vorgewählt</b> –
sonst stünde sie nach einem zweiten Klick doppelt da. Sie lässt sich trotzdem
anhaken, wenn an einem anderen Tag noch einmal Material gebraucht wurde.</p>
<p>Übernommen wird als gewöhnliche Materialzeile: Bezeichnung, Dimension,
Einheit und Preis kommen wie immer aus dem Katalog. Das Datum ist das der
Massaufnahme.</p>
<p><b>Seit Version 3.24</b> stehen auch die <b>berechneten Blechzuschnitte</b>
und die <b>Halbfabrikate</b> zur Auswahl – bei einer Dachrinne also
Halter, Innen- und Aussenwinkel, Einhänge- und Schiebestutzen, Rinnenböden
und Dehnungsstücke, bei den übrigen Arten z. B. Haltebleche, Schieber oder
Bleilappen. Reine Rechenwerte (Abwicklung, Flächen, Stückzahlen) erscheinen
nicht – die holt niemand aus dem Lager.</p>
<p><b>Die Position schlägt die App vor.</b> Sie sucht im Materialkatalog nach
der Einheit, der Grösse und dem Material. Ist sie sich sicher, ist die Zeile
vorgewählt und es steht „✓ Vorschlag der App" daneben. Sonst steht dort
„Vorschlag – bitte prüfen" und nichts ist vorgewählt – Sie entscheiden mit
einem Tipp. Die Auswahl lässt sich immer ändern.</p>
<p>Findet die App <b>nichts Passendes</b>, geht die Zeile als <b>freie
Position</b> (999.9x) mit ihrer Bezeichnung in den Rapport. Dort ist noch der
Preis einzutragen. Eine Katalognummer wird nie erfunden.</p>
<p>Beim Blech entscheiden Sie, was verrechnet wird: die <b>Summe der
Zuschnitte</b> oder die Fläche <b>ab Rolle</b> mit Verschnitt. Beide Zahlen
stehen im gespeicherten Zuschnittplan – die App wählt keine
Abrechnungsgrundlage still aus.</p>`},

"einst-mitarbeiter":{titel:"Mitarbeiter",text:`
<p>Hier werden Mitarbeiterkonten angelegt. Der Benutzername ist
<b>Vorname.Nachname</b>; beim ersten Anmelden wählt die Person selbst ein
Passwort.</p>
<p>Ein Passwort lässt sich zurücksetzen – die Person wählt dann beim
nächsten Anmelden wieder ein eigenes.</p>
<p>Wird ein Mitarbeiter entfernt, bleiben seine Projekte, Massaufnahmen und
Rapporte vollständig erhalten. Im Verlauf steht dann "Unbekannter
Benutzer".</p>
<p><b>E-Mail (optional):</b> steht seit Version 3.148 <b>gleich im
Anlege-Formular</b> – und lässt sich weiterhin jederzeit nachtragen,
auch bei einem Mitarbeiter, der schon lange angelegt ist. Die Person kann
sich danach <b>zusätzlich</b> mit dieser Adresse anmelden (der Benutzername
gilt unverändert weiter) und ein vergessenes Passwort über „Passwort
vergessen“ auf dem Anmeldebildschirm selbst zurücksetzen – ohne diese
Adresse geht das nur über einen Administrator.</p>
<p>Ein Unterschied zwischen den beiden Wegen: wird die Adresse <b>beim
Anlegen</b> angegeben, gehen die Zugangsdaten zusätzlich an diese Adresse –
ob das geklappt hat, steht danach unter dem Textfeld. Wird sie
<b>nachträglich</b> eingetragen, ändert das <b>kein</b> Passwort und
verschickt <b>keine</b> Nachricht.</p>
<p>Jede Adresse kann nur zu <b>einem</b> Konto gehören; sonst wäre
beim Anmelden nicht entscheidbar, wer gemeint ist – eine schon vergebene
Adresse lehnt die App deshalb ab. Das Feld leer zu lassen entfernt die
Adresse wieder.</p>
<p><b>Funktion / Stundenansatz:</b> was hier hinterlegt ist, wird im
Regierapport bei einer neuen Arbeitsposition automatisch vorgeschlagen –
zusammen mit dem angemeldeten Benutzer selbst. Ändern lässt es sich in der
Zeile jederzeit. Ohne Hinterlegung bleibt es beim bisherigen Verhalten
(erster Mitarbeiter, Standard-Funktion aus den Einstellungen).</p>`},

"einst-ansaetze":{titel:"Funktionen und Stundenansätze",text:`
<p>Die Funktionen, die im Regierapport zur Auswahl stehen, mit ihrem
Stundenansatz. Gilt <b>firmenweit</b>.</p>
<p>Eine Änderung wirkt nicht rückwirkend: ein bereits gespeicherter Rapport
behält seine Beträge.</p>`},

"einst-rapportmaterial":{titel:"Material (Regierapport)",text:`
<p>Der Materialkatalog für den Regierapport, mit EDV-Nr., Bezeichnung,
Dimension, Einheit und Preis. Gilt <b>firmenweit</b>.</p>
<p>Material, das hier fehlt, lässt sich im Rapport über die freien Nummern
999.90 bis 999.99 direkt eintragen.</p>
<p>Derselbe Katalog ist die Grundlage der Lagerverwaltung: jede Position hier
kann dort ein oder mehrere einzeln buchbare Produkte haben (z. B.
verschiedene Rohrbogen-Varianten unter der Position "Rohrbogen"). Barcode
und Bezeichnung des Produkts stehen dafür in der Lagerverwaltung selbst,
nicht hier im Regierapport-Katalog.</p>
<p><b>Als Excel exportieren</b> (v3.208) gibt die ganze Liste als Datei
heraus: EDV-Nr., Material, Dim., Einheit und Preis, dazu Werkstoff und
Blechformat. Die ersten fünf Spalten sind genau die, die der Import wieder
einliest – herunterladen, in Excel ändern, wieder importieren. Die EDV-Nr.
ist dabei der Schlüssel: eine Position, die es schon gibt, wird
<b>aktualisiert</b>, und gelöscht wird beim Import nie.</p>`},

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

"sysadmin-einladungen":{titel:"Einladungslinks",text:`
<p>Eine Alternative zu "Neue Firma registrieren": statt die Firma selbst
anzulegen, erzeugst du einen Link und verschickst ihn selbst (per Mail,
WhatsApp o. ä.) an die Person, die die Firma anlegen soll.</p>
<p>Ein Link funktioniert genau <b>einmal</b> und ist <b>7 Tage</b> gültig.
Die eingeladene Person füllt das Formular selbst aus und wählt dabei ihr
eigenes Passwort - anders als bei der direkten Registrierung wird dafür
keine E-Mail mit Zugangsdaten verschickt, sie hat ihr Passwort ja gerade
selbst eingegeben.</p>
<p>Ein noch nicht verwendeter, noch gültiger Link lässt sich jederzeit
zurückziehen.</p>`},

"sysadmin-feedback":{titel:"Feedback aller Firmen",text:`
<p>Die Rückmeldungen aus allen Firmen – der Weg, auf dem Pilotbetriebe
Probleme melden.</p>
<p>Über <b>Löschen</b> lässt sich ein erledigtes oder irrtümlich
eingegangenes Feedback endgültig entfernen – auch das einer fremden
Firma, geprüft serverseitig gegen die System-Administratoren-Liste.</p>`},

"verwaiste-dateien":{titel:"Verwaiste Dateien im Speicher",text:`
<p>Beim Wechseln des Firmenlogos oder aus der Zeit vor der Pfadumstellung
bleiben gelegentlich Dateien im Speicher liegen, auf die keine Massaufnahme,
kein Ausmass, kein Projekt und keine Firma mehr zeigt.</p>
<p>Sie sind für <b>niemanden</b> mehr erreichbar – auch nicht für die Firma,
von der sie ursprünglich stammen – belegen aber weiterhin Speicherplatz. Die
Liste zeigt sie mit Pfad, Grösse und Datum.</p>
<p>Mit <b>👁 Ansehen</b> öffnet sich die Datei unter ihrer Zeile – Bilder
direkt, PDF und Tabellen als Link. Der Link gilt fünf Minuten und lässt sich nur
für eine Datei ausstellen, die der Server selbst als verwaist kennt; so lässt
sich vor dem Löschen prüfen, was weg soll.</p>
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
hängt am Projekt, so wie bei den Massaufnahmen.</p>
<p><b>Seit Version 3.122</b> gibt es zwei getrennte Knöpfe:
„📷 Foto aufnehmen" öffnet direkt die <b>Kamera</b> des Geräts,
„🖼️ Aus Galerie wählen" die <b>Galerie</b> – dort auch mehrere
Fotos auf einmal. Vorher entschied das Gerät selbst, was ein Antippen
öffnet, und bot je nach Modell nur eines von beidem an.</p>`},

"rapport-unterschriften":{titel:"Unterschriften",text:`
<p>Auftraggeber und ausführender Mitarbeiter können direkt auf dem Gerät
unterschreiben – mit dem Finger oder Stift auf demselben Feld, das auch
für Skizzen verwendet wird.</p>
<p>Eine erfasste Unterschrift erscheint im Ausdruck <b>anstelle</b> der
leeren Linie. Ohne digitale Unterschrift bleibt die Linie wie bisher zum
Unterschreiben von Hand auf dem Papierausdruck.</p>
<p>„✕ Löschen” entfernt nur die digitale Unterschrift in diesem Formular –
erst „Speichern” schreibt die Änderung in den Rapport.</p>`},

"einst-schnittfuge":{titel:"Schnittfuge und Reste",text:`
<p>Die <b>Schnittfuge</b> ist die Breite, die Schere oder Säge beim Trennen
wegnimmt. Sie wird bei jedem Schnitt abgezogen – sowohl beim Längsteilen der
Rolle in Streifen als auch zwischen zwei Stücken im selben Streifen.</p>
<p>Steht sie auf <b>0 mm</b>, wird gerechnet wie bisher, ganz ohne Abzug. Das
ist der Startwert: so ändert sich keine bestehende Zahl, bis der Betrieb den
echten Wert einträgt.</p>
<p><b>Reste aufheben ab Länge</b> und <b>ab Breite</b> legen zusammen fest, was
verwertbar ist. Ein Rest muss <b>beide</b> Grenzen erfüllen – ein 6 m langer,
40 mm breiter Streifen ist keine brauchbare Kantung mehr. Was darunter liegt,
verschwindet nicht stillschweigend: es steht im Zuschnitt als <i>zu klein zum
Aufheben</i> und zählt in der Materialbilanz als echter Verschnitt.</p>
<p><b>Reststücke beim Zuschnitt verwenden</b> ist die einzige Einstellung, die
die Rechnung ändert. Steht sie auf <i>Nein</i> – das ist der Startwert –,
werden Reste nur gespeichert und vorgeschlagen; gerechnet wird wie bisher.
Steht sie auf <i>Ja</i>, ziehen passende Reste den Bedarf ab, <b>bevor</b> von
der Rolle gerechnet wird.</p>
<p>Passend heisst: gleicher Werkstoff, gleiche Stärke, gleiche Ausführung.
0,70 mm Titanzink ist <b>kein</b> Ersatz für 0,80 mm. Woher die App Stärke und
Ausführung kennt, steht im Register <b>Blech</b> unter <b>Material &amp; Blech</b>.</p>
<p>Verbucht wird dabei nichts: der Plan zeigt, welche Stücke aus welchem Rest
kämen. Ob ein Rest wirklich verbraucht ist, bleibt ein ausdrücklicher Klick.</p>`},

"material-position-anlegen":{titel:"Neue Materialposition anlegen",text:`
<p>Dieser Dialog legt eine <b>Position im Material-Katalog</b> an – dieselbe
Liste, aus der der Regierapport verrechnet. Danach steht sie überall zur
Verfügung: Regierapport, Regieofferte, Material &amp; Blech.</p>
<p><b>Die EDV-Nr. schlägt die App vor, und sie sagt warum.</b> Der Katalog ist
nach Gruppen geordnet – 201 Dachrinnen, 202 Rinnenhalter, 203 Rinnenzubehör,
251 Ablaufrohre, 811 Dichtstoffe, 826 Schrauben. Aus der <b>Bezeichnung</b>
erkennt die App die passende Gruppe und nimmt deren nächste freie Nummer. Unter
dem Feld steht, welche Gruppe es war und welche bestehende Position den
Ausschlag gab.</p>
<p>Passen <b>mehrere Gruppen ähnlich gut</b>, behauptet die App nichts: sie
nimmt den eigenen Nummernkreis <b>999.xx</b> und legt die Kandidaten als Knöpfe
daneben. Ein Antippen setzt die Nummer dieser Gruppe.</p>
<p>Die Nummer ist <b>vorgeschlagen, nicht vorgeschrieben</b>. Wer sie selbst
tippt, behält sie – die Bezeichnung überschreibt sie danach nicht mehr. Eine
schon vergebene EDV-Nr. wird abgewiesen, <b>bevor</b> etwas geschrieben wird.</p>
<div class="hin"><b>Ab Version 3.251</b> hiess dieser Dialog „Neues Produkt
erfassen" und legte auf Wunsch zugleich ein Lager-Produkt mit Barcode an. Mit
der Abschaffung der alten Lagerverwaltung ist dieser zweite Teil weggefallen;
die Position – der Teil, den der Katalog braucht – ist geblieben, samt
Nummernvorschlag.</div>
`},
"lagerbestand":{titel:"Material & Blech",text:`
<p>Diese Liste legt fest, <b>welche</b> Bleche die Firma führt – Werkstoff,
Stärke und Ausführung. Sonst nichts: seit Version 3.31 <b>keine Mengen, keine
Längen, keine Tafelgrössen</b>. Es war nie eine Lagerverwaltung, es wurde nie
etwas abgebucht, und die Zahlen dort haben nichts bewirkt.</p>
<p><b>Material &amp; Blech oder Reststück?</b> Der Bestand sagt, was der Betrieb
grundsätzlich führt. Ein <b>Reststück</b> ist ein einzelnes, konkretes Stück,
das beim Zuschnitt übrig geblieben ist, mit genau einer Länge und Breite – und
nach der Verwendung ist es verbraucht.</p>
<p>Wofür die Liste gebraucht wird: Eine Massaufnahme kennt nur den
<b>Werkstoff</b> („Titanzink“) – Stärke und Ausführung stehen dort nirgends.
Was hier steht, ist deshalb zweierlei: die Auswahl für die <b>Materialstärke</b>
in der Massaufnahme, und die Grundlage dafür, was ein passender Rest ist.</p>
<p>Führt ein Werkstoff <b>mehrere</b> Stärken (0,70 <i>und</i> 0,80), war
bis Version 3.30 für ihn kein Rest automatisch verwendbar – die App rät nicht,
welche gemeint war. Seit die Massaufnahme ihre Stärke selbst nennt, ist die
Frage in der Regel beantwortet.</p>
<div class="hin"><b>Ein Blech ist EIN Eintrag</b> (ab 3.177). Bis dahin war ein
Blech zweimal erfasst: der Artikel im Katalog trug den Namen, eine eigene Zeile
hier trug Stärke, Ausführung und Rolle/Tafel. Jetzt steht das <b>Format am
Artikel selbst</b>. Ein Eintrag braucht deshalb einen Artikel aus dem Katalog –
ohne ihn hätte das Format keinen Ort.</div>
<p><b>Woran erkennt die App ein Blech?</b> An der Form. Ein Katalogartikel mit
<b>Rolle</b> oder <b>Tafel</b> ist ein geführtes Blech; Schrauben und Dichtband
haben keine Form und tauchen hier gar nicht auf. Der Katalog hat über 380
Positionen – gepflegt werden muss nur das Blech.</p>
<p><b>Ein neues Blech, ein Dialog</b> (ab 3.179): In der Artikel-Auswahl steht
<b>„＋ neue Katalogposition anlegen …“</b>. Damit erscheinen EDV-Nr.,
Bezeichnung und Einheit gleich hier – einmal speichern legt die Position an und
setzt ihr Format. Vorher musste beides getrennt erfasst werden. Eine schon
vergebene EDV-Nr. wird abgewiesen, bevor etwas geschrieben wird.</p>
<p>Fehlt auch der <b>Werkstoff</b> noch, geht es genauso (ab 3.180): in der
Werkstoff-Auswahl steht <b>„＋ neuen Werkstoff anlegen …“</b>, mit Name und den
beiden Dehnungswerten. Gespeichert wird dann in einem Zug – Werkstoff,
Position, Format.</p>
<p><b>Nachtragen ohne Dialog</b> (ab 3.181): Über der Liste steht aufklappbar,
welche Katalogpositionen <b>nach Blech aussehen, aber nicht geführt werden</b>.
Erkannt wird an der Einheit <b>m²</b> zusammen mit einer blossen Zahl bei
„Dim.“. Jede Zeile bringt die Stärke schon mit; zu wählen bleiben Werkstoff,
Ausführung und Rolle/Tafel. Ein Klick auf „Als Blech führen“ genügt.</p>
<p>Den <b>Werkstoff schlägt die App vor</b> (ab 3.182): er steht meist schon im
Positionstext – „Kupferblech 0.6mm“ ist Kupfer, „Alublech“ ist Aluminium.
Verglichen wird mit der eigenen Werkstoff-Liste der Firma, ein neu angelegter
Werkstoff wird also sofort miterkannt. Gesucht wird nur am <b>Wortanfang</b>:
„Chromnickelstahl“ gilt deshalb nicht als Stahl. Passt kein Wort eindeutig,
bleibt die Auswahl leer – geraten wird nicht.</p>
<p>Bei einer <b>Tafel</b> öffnet sich der Dialog – dort fehlen noch Länge und
Breite, und ohne die lässt sich kein Zuschnitt planen. Halb angelegt wird
nichts.</p>
<div class="hin">Die Dehnungswerte bleiben dabei <b>beim Werkstoff</b>. Sie
gehören zum Material, nicht zum Artikel: es gibt sechs Werkstoffe und über 380
Katalogpositionen. An die Position gehängt stünden dieselben zwei Zahlen
hunderte Male da – und ein Werkstoff muss wählbar bleiben, auch wenn gerade
kein Blech daraus am Lager liegt.</div>
<p><b>„Entfernen“ löscht nichts.</b> Es nimmt dem Artikel nur sein Format,
sodass der Zuschnitt nicht mehr mit ihm rechnet. Der Katalogartikel bleibt
vollständig erhalten – mit EDV-Nr., Preis, Barcode und allen Buchungen.</p>
<p>Werkstoffe kommen aus den Massaufnahme-Werkstoffen, Artikel aus dem
Materialkatalog der Firma. Beides ist firmeneigen und wird hier nicht neu
erfunden. Wird ein Artikel gewählt, schlägt das Formular Stärke und Werkstoff
vor, soweit sie dort hinterlegt sind – beides bleibt frei änderbar. Der Name
kommt aus dem Katalog und wird dort geändert.</p>`},

"meas-staerke":{titel:"Materialstärke",text:`
<p>Welche Stärke das Blech dieser Massaufnahme hat. Die Auswahl kommt
<b>ausschliesslich</b> aus <b>Material &amp; Blech</b> (Einstellungen → Blech →
Material &amp; Blech) – es wird nichts vorgeschlagen, was der Betrieb
nicht führt, und nichts erfunden.</p>
<p>Steht für das gewählte Material dort noch nichts, sagt das Feld das
ausdrücklich. Dann ist zuerst <b>Material &amp; Blech</b> dran; die Massaufnahme
lässt sich trotzdem ohne Stärke speichern.</p>
<p>Wofür sie gebraucht wird: sie macht den Bedarf eindeutig. Führt die Firma
0,70 <b>und</b> 0,80 mm derselben Art, konnte die App bis Version 3.30 kein
Reststück zuordnen. Mit der Stärke an der Massaufnahme geht das – und ein
eingelagerter Rest bekommt sie gleich mit.</p>
<p>Sie steht ausserdem im Kopf des Ausdrucks, in der Werkstatt und auf der
Rüstliste: wer rüstet, muss wissen, welches Blech vom Stapel kommt.</p>
<p><b>Achtung:</b> Wird die Stärke nach der Freigabe <i>geändert</i>, verfällt
die Freigabe – der Rüster hätte sonst das falsche Blech gerüstet. Sie zum
ersten Mal einzutragen ist dagegen kein Verfall, da fehlte vorher nur die
Angabe.</p>`},

"meas-zuschnitt-form":{titel:"Rolle oder Tafel",text:`
<p>Woraus das Blech dieser Massaufnahme geschnitten wird. Die Wahl gilt für
den <b>gesamten</b> Zuschnitt: Registername, Formatvergleich, Belegung,
Materialbilanz, PDF und Rüstliste sagen danach einheitlich, ob von der Rolle
oder aus der Tafel geschnitten wird.</p>
<p><b>Automatisch (Material &amp; Blech)</b> ist die Vorgabe. Dann entscheidet
<b>Material &amp; Blech</b>: ist für Material und Stärke dort ein Tafelformat
hinterlegt, wird aus der Tafel geschnitten, sonst von der Rolle. Steht im
Bestand noch nichts, bleibt es bei der Rolle – das Feld sagt das
ausdrücklich.</p>
<p><b>Rolle</b> oder <b>Tafel</b> überstimmt den Bestand für genau diese
Massaufnahme. Wird <i>Tafel</i> gewählt, ohne dass ein Tafelformat hinterlegt
ist, rechnet die App weiterhin von der Rolle und nennt den Grund – es wird
<b>kein Format erfunden</b>.</p>
<p>Der Unterschied in der Rechnung: von der Rolle ist der Abschnitt so lang
wie das längste Blech, bei einer Tafel ist er so lang wie die Tafel. Alles
Übrige – Streifen quer, mehrere Stücke hintereinander, Schnittfuge, Reste –
bleibt gleich.</p>
<p>Das Feld erscheint nicht bei <i>Skizze/Foto</i> (dort wird nichts gerechnet)
und nicht bei <i>Dachrinne</i> (die bezieht ein fertiges Profil in
Normlängen – dort gibt es weder Rollenbreite noch Tafelformat).</p>
<p><b>Achtung:</b> Wird die Wahl nach der Freigabe <i>geändert</i>, verfällt
die Freigabe – der Rüster hätte sonst das falsche Ausgangsmaterial geholt. Sie
zum ersten Mal zu treffen ist dagegen kein Verfall.</p>`},

"rest-verwendet":{titel:"Zuletzt verwendete Reste",text:`
<p>Ein Rest, der für eine Massaufnahme gebraucht wurde, verschwindet aus dem
Lager – er ist ja verbraucht. Hier steht, <b>wofür</b> er gebraucht wurde, und
falls die Stücke angegeben wurden, auch für welche.</p>
<p>Bis Version 3.28 hielt die App das zwar fest, zeigte es aber nirgends. Der
Rest war nach dem Klick spurlos.</p>
<p>Die Liste ist eine Nachschau, kein zweites Lager: sie zeigt die zwanzig
zuletzt verwendeten Reste. Zurückholen lässt sich ein verwendeter Rest nicht –
wer sich vertan hat, erfasst ihn neu von Hand.</p>`},
"rest-verwenden":{titel:"Rest verwenden",text:`
<p>Hält fest, dass dieser Rest für diese Massaufnahme gebraucht wurde. Er gilt
danach als verbraucht und verschwindet aus dem Lager.</p>
<p><b>Der Zuschnittplan wird nicht neu gerechnet.</b> Das ist Absicht: ein Rest
liegt physisch irgendwo und ist vielleicht längst weg. Die App plant deshalb
nichts um – sie schreibt nur auf, was Sie entschieden haben.</p>
<p>Welche Stücke aus dem Rest geschnitten werden, ist eine <b>freiwillige</b>
Angabe. Machen Sie sie, steht auf der Rüstliste bei diesen Stücken „aus Rest“.
Sie bleiben dort mit ihrem Kästchen stehen – ist der Rest beim Rüsten doch
nicht da, wird das Stück von der Rolle geschnitten und die Liste stimmt
trotzdem.</p>
<p>Vorgeschlagen werden nur Stücke, die von Länge und Breite her überhaupt in
den Rest passen. Ohne Angabe bleibt es beim reinen Vermerk.</p>`},
"reststuecke":{titel:"Reststücke-Lager",text:`
<p>Ein Reststück ist ein <b>einzelnes, konkretes Stück</b> mit genau einer
Länge und Breite – nicht zu verwechseln mit <b>Material &amp; Blech</b>
darüber, das führt, welche Bleche der Betrieb überhaupt hat.</p>
<p>Was beim Zuschnitt übrig bleibt und sich noch verwenden lässt. Im Register
„Zuschnitt“ einer Massaufnahme steht, welche Reste dabei anfallen – von dort
lassen sie sich mit einem Klick hier aufnehmen.</p>
<p>Beim nächsten Zuschnitt werden Reste angezeigt, die breit genug wären.
Ob sie den Bedarf auch <b>abziehen</b>, entscheidet die Einstellung
„Reststücke beim Zuschnitt verwenden“ (Register Allgemein). Sie steht
standardmässig auf Nein – ein Rest liegt physisch irgendwo und ist vielleicht
schon verbraucht.</p>
<p>Auch eingeschaltet wird <b>nichts verbucht</b>: der Plan zeigt nur, welche
Stücke aus welchem Rest kämen. Verwendet werden darf ein Rest nur, wenn
Werkstoff, <b>Stärke</b> und <b>Ausführung</b> exakt stimmen. Fehlt eine
dieser Angaben, steht das an der Zeile – mit „✏️ Merkmale“ lässt sie sich
nachtragen.</p>
<p>„Verbraucht“ nimmt einen Rest aus der Liste, ohne ihn zu löschen.
<b>Hier verwenden</b> im Zuschnitt tut dasselbe und hält zusätzlich fest, für
welche Massaufnahme er gebraucht wurde. Der Zuschnittplan wird dadurch
<b>nicht</b> neu gerechnet – er bleibt, wie er gespeichert ist.</p>
<p>Ein aus einem Zuschnitt aufgenommener Rest merkt sich, aus welcher
Massaufnahme und welchem Projekt er stammt. Dieselbe Massaufnahme lässt sich
deshalb nicht zweimal einlagern.</p>`},

"module-test":{titel:"Module in Entwicklung",text:`
<p>Was hier angehakt ist, sehen <b>nur Administratoren</b> – bei allen Firmen
gemeinsam. So lässt sich eine noch nicht fertige Funktion ausliefern, ohne
dass sie bei Mitarbeitern auftaucht.</p>`},

"sysadmin-kategorien":{titel:"Massaufnahme-Arten zuordnen",text:`
<p>Legt für <b>alle Firmen gemeinsam</b> fest, unter welcher Kategorie
(Steildach, Flachdach, Allgemein) eine Massaufnahme-Art in der Auswahl
erscheint, wenn jemand eine neue Massaufnahme anlegt. Rein sortierend – es
wird dadurch keine Art gesperrt oder verändert.</p>`},

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
// Ein Register mit mehreren Karten (Dachrinne, Register 3) bekommt so
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
 // v3.94: text ist bei Kamin/Dachfenster (kam-*/dfa-*) eine Funktion statt
 // einer festen Zeichenkette, damit die genannten Buchstaben live aus
 // KAM_MASSLISTE/DFA_MASSLISTE kommen (kamaBuchstabe()/dfaBuchstabe()) statt
 // hier erneut getippt zu sein - siehe CLAUDE.md 157.1 fuer die R/U-Verwechs-
 // lung, die genau das vermeiden soll. Wird erst BEIM OEFFNEN ausgewertet,
 // nicht beim Laden dieser Datei - js/66 (dfaBuchstabe) laedt NACH js/41.
 document.getElementById("hilfeText").innerHTML=typeof t.text==="function"?t.text():t.text;
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
