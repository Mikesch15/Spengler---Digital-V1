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
  "Neu: Lagerverwaltung ist jetzt direkt von der Startseite aus erreichbar (mit Lager-Zugriff)."]
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
