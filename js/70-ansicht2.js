"use strict";
// ===========================================================================
// ANSICHT 2.0 (v3.150) - eine zweite Oberflaeche fuer dieselbe App
// ===========================================================================
// WAS DAS IST
// Der Einstieg in die App ist heute nach Modulen gegliedert (Projekte,
// Werkstatt, Lagerverwaltung, Einstellungen). Diese Ansicht gliedert ihn
// nach dem Arbeitsablauf: Heute - Projekte - Werkstatt - Lager - Mehr,
// mit den offenen Aufgaben als Startpunkt statt einer Begruessung.
//
// WAS DAS AUSDRUECKLICH NICHT IST
// Keine zweite App und kein zweiter Schreibweg. Diese Datei speichert
// nichts, loescht nichts und rechnet nichts aus. Sie zeigt an, was die App
// ohnehin geladen hat (allProjects, aufgabenListe, die Cockpit-Listen), und
// ruft fuer jede Handlung die BESTEHENDE Funktion auf:
//
//   Aufgabe erledigen  -> aufgabeAusfuehren()      (js/45-aufgaben.js)
//   Projekt oeffnen    -> openProjectCockpit()     (js/24-projekt-cockpit.js)
//   Werkstatt          -> werkstattOeffnen()       (js/51-werkstatt.js)
//   Lagerverwaltung    -> openSettingsTo(...)      (js/07-einstellungen.js)
//   Suche/Einstellungen/Feedback/Abmelden -> die vorhandenen Knoepfe
//
// Dadurch gelten hier unveraendert dieselbe Rechtepruefung, dieselbe Row
// Level Security, dieselbe Offline-Warteschlange und dieselben Rueckfragen
// wie in der klassischen Ansicht. Ein Fehler in dieser Datei kann eine
// falsche LISTE zeigen - er kann keine falschen Daten schreiben.
// Nachpruefbar: grep -nE "\.(insert|update|delete|upsert|rpc)\(" js/70-ansicht2.js
//
// DER WEG ZURUECK
// Der Schalter setzt ausschliesslich die Klasse "a2-an" am <html>-Element
// und merkt sich das pro Geraet. Die klassische Startseite wird dabei nicht
// umgebaut, sondern nur per CSS ausgeblendet (css/05-ansicht2.css) - kein
// Element wird entfernt, kein hidden-Attribut angefasst. Zurueckschalten
// ist deshalb wirklich ein Zurueck und nicht ein Wiederaufbau.
// ===========================================================================

const A2_SPEICHER="sd_ansicht2";
const A2_HINWEIS="sd_ansicht2Hinweis";

// v3.151: Die neue Ansicht ist die VORGABE. Massgeblich ist deshalb nicht
// "steht dort ja", sondern "steht dort nicht ausdruecklich nein" - wer sich
// in v3.150 bewusst fuer die klassische Ansicht entschieden hat, behaelt sie.
// Eine getroffene Wahl umzustossen, weil sich die Vorgabe geaendert hat,
// waere das Gegenteil einer Einstellung.
// Ohne Zugriff auf den Geraetespeicher (privates Fenster, gesperrte
// Seitendaten) gilt ebenfalls die Vorgabe.
function a2Aktiv(){
 try{ return localStorage.getItem(A2_SPEICHER)!=="nein" }catch(e){ return true }
}
// Der einmalige Hinweis beim ersten Start in der neuen Ansicht. Er erscheint
// genau so lange, bis er weggeklickt wurde - wer die Ansicht selbst
// eingeschaltet hat, braucht ihn nicht und bekommt ihn deshalb auch nicht.
function a2HinweisNoetig(){
 try{
  if(localStorage.getItem(A2_HINWEIS)==="weg")return false;
  return localStorage.getItem(A2_SPEICHER)===null;
 }catch(e){ return false }
}
function a2HinweisWeg(){
 try{ localStorage.setItem(A2_HINWEIS,"weg") }catch(e){}
 a2Zeichnen();
}
function a2Setzen(an){
 try{ localStorage.setItem(A2_SPEICHER,an?"ja":"nein") }catch(e){}
 a2Anwenden();
 if(an)a2Zeichnen();
 window.scrollTo(0,0);
}
function a2Anwenden(){
 document.documentElement.classList.toggle("a2-an",a2Aktiv());
 // v3.162: Beim Umschalten muss auch die Marke mitgehen, die sagt, ob die
 // Leiste dasteht - der Beobachter feuert nur bei hidden-Aenderungen.
 // Die Funktion steht weiter unten; beim allerersten Aufruf waehrend des
 // Ladens gibt es sie noch nicht.
 if(typeof a2LeisteMarkieren==="function")a2LeisteMarkieren();
 // Die Ablaufleiste sitzt im Cockpit und wird dort beim Laden gezeichnet.
 // Beim Umschalten muss sie mitgehen - sonst bliebe sie nach dem Wechsel in
 // die klassische Ansicht als fremder Balken im Projekt stehen.
 a2AblaufZeichnen();
}

// ---- Zustand --------------------------------------------------------------
// Bewusst ein Objekt und nur zwei Werte: welche Seite offen ist und was in
// der Projektsuche steht. Alles andere ist Anzeige aus den Daten der App.
const a2Zustand={seite:"heute",suche:"",projektId:null,reg:"uebersicht",bereich:null};

// ===========================================================================
// BEREICHE  (v3.156)
// ---------------------------------------------------------------------------
// DAS PROBLEM, DAS HIER GELOEST WIRD
// Bis v3.155 oeffneten Werkstatt, Lager, Suche, Einstellungen, Feedback, die
// Admin-Uebersicht, die System-Administration, Material & Zuschnitt und das
// Cockpit als klassisches Vollbild ueber der neuen Ansicht. Ein .modal ist
// position:fixed mit inset:0 und z-index 500 - es legt sich damit UEBER die
// Kopfzeile und ueber die untere Leiste. Wer auf "Werkstatt" tippte, sah
// den alten Seitenaufbau, und die Leiste, ueber die er gekommen war, war
// weg. Gemessen: 2 von 5 Eintraegen der Leiste und 6 von 6 Eintraegen unter
// "Mehr" fielen so aus der neuen Ansicht heraus.
//
// DIE LOESUNG - UND WARUM NICHT DIE NAHELIEGENDE
// Naheliegend waere gewesen, Werkstatt und Lager als eigene Seiten dieser
// Ansicht NACHZUBAUEN. Dann gaebe es sie zweimal, und gepflegt wuerde auf
// Dauer nur eine. Stattdessen bleibt der vorhandene Schirm genau, wie er
// ist - er bekommt nur einen anderen RAHMEN: er sitzt unter der Kopfzeile
// und ueber der Leiste statt darueber. Kein Inhalt wird kopiert, keine
// Funktion doppelt geschrieben; css/05-ansicht2.css setzt dafuer top und
// bottom, sonst nichts.
//
// Geoeffnet und geschlossen wird ueber die EIGENEN Knoepfe der App
// (closeWerkstatt, closeSettings ...) - nicht ueber hidden=true von hier.
// Diese Knoepfe raeumen auf: sie laden Listen neu, verwerfen Entwuerfe und
// setzen Zustaende zurueck. Ein hidden=true von aussen taete das nicht.
//
// NICHT dabei sind die Erfassungsformulare (Massaufnahme, Ausmass, Offerte,
// Leistung, Regierapport) und die kleinen Dialoge. Wer ein Mass eintraegt,
// ist IN einer Aufgabe - dort ist Vollbild richtig, und der Weg hinaus
// steht im Formular selbst.
// ===========================================================================
const A2_BEREICHE={
 werkstattModal:    {zu:"closeWerkstatt"},
 settingsModal:     {zu:"closeSettings"},
 globalSearchModal: {zu:"closeGlobalSearch"},
 feedbackModal:     {zu:"cancelFeedback"},
 adminMeasModal:    {zu:"closeAdminMeas"},
 systemAdminModal:  {zu:"closeSystemAdmin"},
 matZuModal:        {zu:"matZuZurueck"},
 projectCockpitModal:{zu:"cockpitBack"},
 projectsModal:     {zu:"closeProjects"}
};

// Oeffnet einen Bereich ueber den vorhandenen Weg der App und merkt sich,
// dass er offen ist. Gemerkt wird NUR, wenn der Schirm wirklich aufgegangen
// ist - sonst zeigte die Kopfzeile einen Bereich, den es nicht gibt.
// marke (optional): eine Klasse am Schirm, mit der css/05-ansicht2.css die
// Teile ausblendet, die in DIESEM Bereich nichts zu suchen haben - etwa die
// Projektliste im Anlegen-Bereich. Sie wird beim Schliessen wieder entfernt,
// damit die klassische Ansicht denselben Schirm unveraendert vorfindet.
async function a2BereichStarten(id,name,tab,oeffner,marke){
 await oeffner();
 const el=$(id);
 if(!el||el.hidden){ a2Zeichnen(); return false }
 a2BereichMarkenWeg(el);
 if(marke)el.classList.add(marke);
 a2Zustand.bereich={id,name,tab,marke:marke||""};
 a2Zeichnen();
 window.scrollTo(0,0);
 return true;
}
const A2_MARKEN=["a2-nur-anlegen","a2-nur-liste","a2-nur-lager","a2-nur-stammdaten",
 "a2-nur-dateien"];
function a2BereichMarkenWeg(el){ if(el)A2_MARKEN.forEach(m=>el.classList.remove(m)) }
// Schliesst den offenen Bereich ueber seinen eigenen Knopf.
function a2BereichSchliessen(){
 const b=a2Zustand.bereich;
 a2Zustand.bereich=null;
 if(!b)return;
 a2BereichMarkenWeg($(b.id));
 const eintrag=A2_BEREICHE[b.id];
 const knopf=eintrag&&$(eintrag.zu);
 if(knopf&&!$(b.id).hidden){ knopf.click(); return }
 if($(b.id))$(b.id).hidden=true;
}
// Ein Bereich kann sich auch selbst schliessen - ueber seinen "Fertig"- oder
// "Start"-Knopf, ueber die Zurueck-Taste des Geraets oder weil die App
// weiterspringt. Dann muss die Kopfzeile das mitbekommen, sonst nennt sie
// weiter einen Bereich, der nicht mehr offen ist. Beobachtet wird deshalb
// das hidden-Attribut - dasselbe Mittel wie beim Firmenlogo weiter oben.
function a2BereichBeobachten(){
 if(!window.MutationObserver)return;
 const beob=new MutationObserver(()=>{
  const b=a2Zustand.bereich;
  if(!b)return;
  const el=$(b.id);
  if(!el||el.hidden){ a2BereichMarkenWeg(el); a2Zustand.bereich=null; if(a2Aktiv())a2Zeichnen() }
 });
 Object.keys(A2_BEREICHE).forEach(id=>{
  const el=$(id);
  if(el)beob.observe(el,{attributes:true,attributeFilter:["hidden"]});
 });
}
if(document.readyState==="loading")
 document.addEventListener("DOMContentLoaded",a2BereichBeobachten);
else a2BereichBeobachten();

// ---- Ein offenes Formular verlassen (v3.162) ------------------------------
// Seit die Leiste auch ueber einem offenen Formular liegt, ist sie dort
// bedienbar - ein Tipp auf "Heute" wechselt die Seite. Ohne diese Stelle
// waeren damit die Eingaben weg, ohne dass jemand gefragt wurde.
const A2_FORMULARE=["measurementEditModal","ausmassEditModal","angebotEditModal",
 "leistungEditModal","reportScreen"];
function a2FormularOffen(){
 return A2_FORMULARE.filter(id=>$(id)&&!$(id).hidden);
}
// Gibt true zurueck, wenn weitergegangen werden darf.
function a2FormularVerlassen(){
 const offen=a2FormularOffen();
 if(!offen.length)return true;
 // Gefragt wird NUR, wenn wirklich etwas geaendert wurde. Ob das der Fall
 // ist, fuehrt js/18 bereits fuer genau diese Formulare mit (isDirty) -
 // eine zweite Erfassung waere eine zweite Wahrheit, und sie waere die
 // schlechtere: js/18 haengt am input-Ereignis und bekommt deshalb auch
 // mit, was ein Fachmodul selbst ins Feld schreibt.
 const geaendert=(typeof isDirty!=="undefined")&&isDirty;
 if(geaendert&&!confirm("Das Formular ist noch offen und hat ungespeicherte Eingaben.\n\n"
   +"Verlassen und die Eingaben verwerfen?"))return false;
 offen.forEach(id=>{$(id).hidden=true});
 if(typeof isDirty!=="undefined")isDirty=false;
 // Dieselben Rueckkehr-Ziele zuruecksetzen wie goToStart() (js/03) -
 // sonst landete das naechste Formular am Ziel des vorigen.
 if(typeof measEditReturnTo!=="undefined")measEditReturnTo="measurementsModal";
 if(typeof amEditReturnTo!=="undefined")amEditReturnTo="ausmassModal";
 if(typeof angEditReturnTo!=="undefined")angEditReturnTo="cockpitAngebote";
 if(typeof leiEditReturnTo!=="undefined")leiEditReturnTo="cockpitLeistungen";
 if(typeof reportReturnTo!=="undefined")reportReturnTo="reportsModal";
 return true;
}

// v3.162: #a2Screen liegt IN #startScreen. Drei Stellen der App verstecken
// #startScreen beim Oeffnen eines Formulars (js/04 aus der Suche, js/09
// beim Regierapport, js/45 aus der Aufgabenliste) - damit war die halbe
// neue Ansicht weg, Kopf und Leiste inbegriffen. Das war beim Rapport die
// EIGENTLICHE Ursache, nicht der z-index.
//
// Beobachtet wird deshalb beides: die Formulare und #startScreen selbst.
// Nur so ist die Reihenfolge egal - js/09 versteckt erst #startScreen und
// oeffnet danach den Rapport, andere machen es umgekehrt.
//
// Eingegriffen wird ausschliesslich, solange wirklich ein Formular offen
// ist. Beim Anmelden und Abmelden ist keines offen; dort bleibt das
// Verstecken unangetastet, und der Login-Schirm arbeitet weiter wie
// bisher.
function a2LeisteHalten(){
 const s=$("startScreen");
 if(!s)return;
 if(a2Aktiv()&&a2FormularOffen().length&&s.hidden)s.hidden=false;
 a2LeisteMarkieren();
}
// Spiegelt in eine Klasse am <html>, ob die Leiste WIRKLICH dasteht.
// css/05-ansicht2.css haengt den Rahmen der Formulare daran: ein Rahmen,
// der Platz fuer eine Leiste laesst, die es nicht gibt, zeigt zwei leere
// Streifen. Die Klasse ist bewusst eine Zustandsspiegelung und keine
// zweite Entscheidung - sie sagt nur, was ohnehin der Fall ist.
function a2LeisteMarkieren(){
 const s=$("startScreen");
 const da=!!(a2Aktiv()&&s&&!s.hidden);
 document.documentElement.classList.toggle("a2-leiste-da",da);
}
function a2LeisteBeobachten(){
 if(!window.MutationObserver)return;
 const beob=new MutationObserver(a2LeisteHalten);
 A2_FORMULARE.concat(["startScreen"]).forEach(id=>{
  const el=$(id);
  if(el)beob.observe(el,{attributes:true,attributeFilter:["hidden"]});
 });
}
if(document.readyState==="loading")
 document.addEventListener("DOMContentLoaded",a2LeisteBeobachten);
else a2LeisteBeobachten();

// ---- Navigation -----------------------------------------------------------
// Die Symbole sind gezeichnet, nicht als Emoji gesetzt: Emoji sehen auf jedem
// Geraet anders aus und wirken fuer eine Produktionssoftware verspielt.
const A2_SYMBOL={
 heute:'<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10v9h12v-9"/>',
 projekte:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 werkstatt:'<path d="M14.5 4.5a4.5 4.5 0 0 0-6 5.9L4 15v4h4l4.6-4.6a4.5 4.5 0 0 0 5.9-6L16 11l-3-3z"/>',
 lager:'<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
 mehr:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
function a2Symbol(k){
 return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" '
  +'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
  +'stroke-linejoin="round" aria-hidden="true">'+(A2_SYMBOL[k]||"")+'</svg>';
}

// Ob Werkstatt und Lagerverwaltung ueberhaupt erscheinen, entscheidet NICHT
// diese Datei. Beide Knoepfe der klassischen Startseite werden von der App
// selbst ein- und ausgeblendet (werkstattKnopfAktualisieren() in js/51,
// checkLagerZugriff() in js/68). Hier wird nur abgelesen, was dort bereits
// entschieden wurde - eine zweite Rechtepruefung waere eine zweite Wahrheit.
function a2KnopfSichtbar(id){
 const k=$(id);
 return !!k&&!k.hidden;
}
function a2Leisten(){
 const raus=[{k:"heute",name:"Heute"},{k:"projekte",name:"Projekte"}];
 if(a2KnopfSichtbar("navWerkstatt"))raus.push({k:"werkstatt",name:"Werkstatt",oeffnet:true});
 if(a2KnopfSichtbar("navLagerverwaltung"))raus.push({k:"lager",name:"Lager",oeffnet:true});
 raus.push({k:"mehr",name:"Mehr"});
 return raus;
}

// ---- kleine Helfer --------------------------------------------------------
// "1 Aufgabe" / "4 Aufgaben" - nicht "4 Aufgabe(n)". Eine Klammer im Satz
// ist der Verzicht darauf, den Satz zu Ende zu schreiben.
function a2Anzahl(n,einzahl,mehrzahl){ return n+" "+(n===1?einzahl:mehrzahl) }
function a2Kuerzel(profil){
 if(!profil)return "··";
 const v=String(profil.first_name||"").trim(), n=String(profil.last_name||"").trim();
 const k=(v.slice(0,1)+n.slice(0,1)).toUpperCase();
 return k||"··";
}
function a2Name(profil){
 if(!profil)return "Angemeldet";
 return `${profil.first_name||""} ${profil.last_name||""}`.trim()||"Angemeldet";
}
// Das Firmenlogo. Es wird NICHT ein zweites Mal aus dem Speicher geholt:
// applyCompanyName() (js/05) loest den privaten Speicherpfad bereits in eine
// signierte Adresse auf und setzt sie an #startLogo. Hier wird genau diese
// Adresse abgelesen - eine zweite Aufloesung waere eine zweite Abfrage und
// koennte einen anderen Stand zeigen.
function a2LogoQuelle(){
 const el=$("startLogo");
 if(!el||el.hidden)return "";
 return el.getAttribute("src")||"";
}
// Markenzeile: Logo und Firmenname. Ohne hinterlegtes Logo steht nur der
// Name da - ein Platzhalterkasten waere schlechter als nichts.
function a2MarkeHtml(klasse){
 const logo=a2LogoQuelle();
 const name=(typeof companyName!=="undefined"&&companyName)?companyName:"SPENGLER-DIGITAL";
 return `<div class="${klasse}">`
  +(logo?`<img src="${esc(logo)}" alt="${esc(name)}">`:"")
  +`<span>${esc(name)}</span>`
  +`</div>`;
}
// Der runde Info-Knopf der App. hilfeKnopf() (js/41) gibt ihn samt
// Beschriftung fuer Tastatur und Screenreader zurueck - ein hier selbst
// gebauter Knopf haette sie nicht, weil hilfeKnoepfeBeschriften() nur beim
// Start einmal ueber das Dokument geht. Fehlt der Text zu einem Schluessel,
// liefert die Funktion absichtlich gar nichts: lieber kein Knopf als einer,
// der nichts sagt.
function a2Hilfe(schluessel){
 return (typeof hilfeKnopf==="function")?hilfeKnopf(schluessel):"";
}
function a2Datum(iso){
 if(!iso)return "";
 const d=new Date(iso);
 if(isNaN(d))return "";
 return d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear();
}
// Die Aufgaben der App sind bereits gefiltert und sortiert (js/45). Hier wird
// nur gelesen - nie neu abgeleitet, was als Naechstes dran ist.
function a2Aufgaben(){
 return (typeof aufgabenListe!=="undefined"&&Array.isArray(aufgabenListe))?aufgabenListe:[];
}
function a2Projekte(){
 return (typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
}
// Ein einzelnes Projekt. allProjects ist bereits von der Row Level Security
// gefiltert - was hier nicht steht, gibt es fuer diesen Benutzer nicht.
// Eine manipulierte ID findet deshalb nichts, ohne dass hier eigens geprueft
// werden muesste, wem das Projekt gehoert.
function a2Projekt(id){
 return a2Projekte().find(p=>String(p.id)===String(id))||null;
}
function a2AufgabenAktiv(){
 return typeof aufgabenAktiv!=="function"||aufgabenAktiv();
}

// ===========================================================================
// HEUTE  (v3.158 - nach dem Prototyp prototype/js/heute.js)
// ===========================================================================
// WORAUS DIESE SEITE BESTEHT UND WOHER JEDE ZAHL KOMMT
// Der Prototyp im Ordner prototype/ zeigt diese Seite mit Beispieldaten.
// Hier steht dieselbe Gliederung - aber JEDE Zahl kommt aus den echten
// Daten der App. Wo der Prototyp etwas zeigt, wofuer es in der Datenbank
// keine Quelle gibt, steht hier NICHTS statt einer erfundenen Zahl:
//
//   Warnung oben      freigabe_verfallen, ueber aufgabenListe (js/45)
//   Meine Aufgaben    aufgabenListe (js/45) - dieselbe Liste wie klassisch
//   Werkstatt heute   werkZeilen (js/51) + zeStandListe (js/56)
//   Anstehende Montage werkZeilen mit workflow_status "zu_montieren"
//   Offene Projekte   allProjects + derselbe Zuschnittstand je Projekt
//
// NICHT UEBERNOMMEN: "Wichtige Hinweise". Der Prototyp zeigt dort freie
// Notizen ("Baustellenzufahrt nur bis 16:00 Uhr") und einen Offertenstand
// ("Offerte noch nicht verschickt"). Die Tabelle projects fuehrt kein
// Notizfeld und angebote keinen Status - beides gaebe es nur als neue
// Spalte samt Eingabe. Der Prototyp selbst gibt das in seinem Echt-Modus
// zu (prototype/js/echt.js: hinweis nur bei freigabe_verfallen). Eine
// Rubrik, die immer leer bleibt, waere schlechter als keine.
//
// WAS DIESE SEITE KOSTET
// Zwei zusaetzliche Abfragen, beide ueber die VORHANDENEN Ladefunktionen
// der App: werkLaden() (js/51) und zeLaden() (js/56). Keine eigene Abfrage,
// keine zweite Rechnung - sonst koennten Startseite und Werkstatt
// verschiedene Zahlen zeigen.
// ===========================================================================

let a2WerkGeladen=false;       // schon geladen?
let a2WerkLaeuft=false;        // laeuft gerade?
let a2WerkFehler="";

// Ob es die Werkstatt ueberhaupt gibt, entscheidet NICHT diese Datei.
// werkstattKnopfAktualisieren() (js/51) blendet navWerkstatt ein und aus und
// beruecksichtigt dabei bereits das Modul und die Rechte. Hier wird genau
// dasselbe abgelesen wie in der unteren Leiste - haette diese Stelle eine
// eigene Bedingung, koennte die Leiste "Werkstatt" anbieten, waehrend die
// Startseite die Rubrik weglaesst. Genau das ist beim ersten Versuch
// passiert und wurde vom Pruefstand v3.150 gemeldet.
function a2WerkstattSichtbar(){
 return a2KnopfSichtbar("navWerkstatt");
}
// Die Zeilen der Werkstatt. Geladen hat sie werkLaden() (js/51) - hier wird
// nur abgelesen.
function a2Werk(){
 return (typeof werkZeilen!=="undefined"&&Array.isArray(werkZeilen))?werkZeilen:[];
}
// Einmal laden, wenn HEUTE zum ersten Mal gezeigt wird. Die Seite erscheint
// sofort; die Werkstattzahlen kommen nach, statt dass alles wartet.
async function a2HeuteLaden(neu){
 if(!a2WerkstattSichtbar())return;
 if(a2WerkLaeuft)return;
 if(a2WerkGeladen&&!neu)return;
 a2WerkLaeuft=true; a2WerkFehler="";
 try{
  if(typeof werkLaden==="function")await werkLaden();
  if(typeof werkFehler!=="undefined"&&werkFehler)a2WerkFehler=werkFehler;
  // Die Haken des Zuschnitts. Ohne sie zaehlt zeStand jedes Stueck als
  // offen - die Startseite behauptete dann, nichts sei produziert.
  if(typeof zeLaden==="function"&&a2Modul("zuschnitt"))
   await zeLaden(a2Werk().map(z=>z.id),!!neu);
  a2WerkGeladen=true;
 }catch(e){ a2WerkFehler=(e&&e.message)||String(e) }
 a2WerkLaeuft=false;
 if(a2Aktiv()&&a2Zustand.seite==="heute"&&!a2Zustand.bereich)a2Zeichnen();
}

// Der Zuschnittstand einer Liste von Massaufnahmen. EINE Quelle: zeStandListe
// (js/56) - dieselbe Rechnung wie in der Werkstatt und auf der Projektseite.
function a2Stand(liste){
 if(typeof zeStandListe!=="function")return {gesamt:0,erledigt:0,offen:0,aufnahmen:0};
 return zeStandListe(liste||[]);
}
function a2WerkZahlen(){
 const zeilen=a2Werk();
 const stand=a2Stand(zeilen);
 // "Ruestlisten": Massaufnahmen, an denen noch etwas zu schneiden ist.
 const ruestlisten=zeilen.filter(z=>{
  const s=(typeof zeStand==="function")?zeStand(z):null;
  return s&&s.gesamt>0&&s.offen>0;
 }).length;
 const montagen=zeilen.filter(z=>z.workflow_status==="zu_montieren").length;
 return {teile:stand.offen,ruestlisten,montagen};
}
// Anstehende Montage: was geruestet ist und auf die Montage wartet.
// KEIN Termin - die Datenbank fuehrt kein geplantes Montagedatum. Statt
// "morgen" zu erfinden, steht hier, seit wann es bereitliegt und wer
// eingeteilt ist. Beides sind echte Spalten (geruestet_am, monteur_id).
function a2MontageListe(){
 // v3.160: Wer einen Termin hat, steht zuerst - und zwar nach Tag sortiert.
 // Alles ohne Termin folgt danach in der bisherigen Reihenfolge (seit wann
 // es bereitliegt). Ein fehlender Termin wird NICHT geschaetzt: die Zeile
 // sagt dann weiterhin nur, seit wann geruestet ist.
 const mit=[],ohne=[];
 a2Werk().filter(z=>z.workflow_status==="zu_montieren")
  .forEach(z=>{(z.montage_am?mit:ohne).push(z)});
 mit.sort((a,b)=>String(a.montage_am).localeCompare(String(b.montage_am)));
 ohne.sort((a,b)=>String(a.geruestet_am||"").localeCompare(String(b.geruestet_am||"")));
 return mit.concat(ohne).slice(0,8);
}
// v3.160: Welche Projekte gelten als offen - EINE Stelle. Sie beantwortet
// dieselbe Frage fuer den Abschnitt "Offene Projekte" und fuer "Wichtige
// Hinweise"; zwei Filter waeren zwei Meinungen darueber, was offen ist.
//
// v3.161: dazu die Zuteilung. Die Startseite zeigt in der Vorgabe nur, was
// dem Angemeldeten zugeteilt ist - das war der Auftrag. Der Umschalter
// "Alle" daneben ist derselbe Weg, den die Werkstatt seit v3.09 anbietet
// (werkFilter, js/51): Vorgabe "meine", auf Wunsch der ganze Betrieb. So
// braucht es KEINE Sonderregel fuer Administratoren - wer den Ueberblick
// will, tippt einmal auf "Alle".
//
// Wer zustaendig ist, entscheidet projektIstMeines() (js/01), nicht diese
// Datei. Dort steht auch, warum ohne Zuteilung der Ersteller gilt.
let a2ProjektFilter="meine";   // "meine" | "alle"
function a2OffeneProjekte(nurMeine){
 const ich=(typeof currentProfile!=="undefined"&&currentProfile)?currentProfile.id:null;
 const meine=(nurMeine===undefined)?(a2ProjektFilter==="meine"):!!nurMeine;
 return a2Projekte()
  .filter(p=>!p.archived&&p.status!=="abgeschlossen"&&p.status!=="storniert")
  .filter(p=>!meine||(typeof projektIstMeines!=="function")||projektIstMeines(p,ich))
  .slice().sort((x,y)=>String(y.updated_at||"").localeCompare(String(x.updated_at||"")));
}
// v3.160: Die freien Notizen der offenen Projekte. Leere und reine
// Leerzeichen zaehlen als "kein Hinweis" - sonst entstuende ein Abschnitt
// mit leeren Zeilen.
function a2HinweisProjekte(){
 return a2OffeneProjekte().filter(p=>p&&typeof p.hinweis==="string"&&p.hinweis.trim());
}

function a2PersonName(id){
 if(!id||typeof allProfiles==="undefined"||!Array.isArray(allProfiles))return "";
 const p=allProfiles.find(x=>String(x.id)===String(id));
 return p?a2Name(p):"";
}
// Der Zuschnittstand EINES Projekts - aus denselben Werkstattzeilen.
function a2ProjektStand(p){
 return a2Stand(a2Werk().filter(z=>String(z.project_id)===String(p.id)));
}
// Ein Zeichen je Aufgabenart - wie im Prototyp.
const A2_AUFGABE_ZEICHEN={
 erneut_freigeben:"✓", freigeben:"✓", zuweisen:"👤", monteur:"👤",
 ruesten:"🔧", montieren:"🏠", abschliessen:"📏"
};
// Das heutige Datum, ausgeschrieben - "Sonntag, 21. September".
function a2HeuteDatum(){
 const d=new Date();
 const tage=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
 const monate=["Januar","Februar","März","April","Mai","Juni","Juli","August",
               "September","Oktober","November","Dezember"];
 return tage[d.getDay()]+", "+d.getDate()+". "+monate[d.getMonth()];
}

function a2SeiteHeute(){
 const auf=a2Aufgaben();
 let html=a2MarkeHtml("a2-marke");

 // Der einmalige Hinweis nach der Umstellung. Er sagt, was sich geaendert
 // hat und wo der Weg zurueck steht - eine Ansicht, die sich ungefragt
 // aendert und nichts dazu sagt, ist eine Zumutung.
 if(a2HinweisNoetig()){
  html+=`<div class="a2-karte a2-karte-hinweis">
   <div class="a2-karte-titel">Die Ansicht ist neu</div>
   <p class="a2-karte-unter">Die App ist jetzt nach dem Arbeitsablauf
   gegliedert: unten die Leiste, hier deine offenen Aufgaben. Es sind
   dieselben Formulare, dieselben Daten, dieselben Rechte wie bisher –
   nur anders sortiert.</p>
   <p class="a2-karte-unter" style="margin-top:6px">Die gewohnte Ansicht ist
   unverändert da: <b>Mehr → Zurück zur klassischen Ansicht</b>.</p>
   <div class="a2-knopf-reihe">
    <button type="button" class="a2-knopf a2-k-blau" data-a2-tu="hinweisweg">Verstanden</button>
    <button type="button" class="a2-knopf a2-k-grau" data-a2-tu="klassisch">Lieber die gewohnte</button>
   </div></div>`;
 }

 // Ohne Verbindung wird die Aufgabenliste NICHT geleert (js/45 laesst sie
 // stehen). Der Hinweis sagt deshalb, dass der Stand aelter sein kann -
 // "nichts offen" waere hier eine Behauptung, die niemand geprueft hat.
 if(typeof offlineIstOffline==="function"&&offlineIstOffline()){
  html+=`<div class="a2-hinweis a2-h-warnung"><b>Keine Verbindung</b>
   Die Liste zeigt den zuletzt geladenen Stand. Erfasstes wird gesammelt und
   übertragen, sobald wieder Netz da ist.</div>`;
 }

 // ---- Warnung: nach der Freigabe geaendert -------------------------------
 // Die dringendste Meldung steht ganz oben, mit dem Weg ins Projekt. Sie
 // kommt aus derselben Aufgabenliste wie alles andere - keine zweite Regel
 // darueber, was dringend ist.
 auf.filter(a=>a.art==="erneut_freigeben").slice(0,3).forEach(a=>{
  const p=a2Projekt(a.m&&a.m.project_id);
  const b=(typeof aufgabenBeschriftung==="function")?aufgabenBeschriftung(a.m):{adresse:"",zusatz:""};
  html+=`<div class="a2-hinweis a2-h-warnung">
   <b>⚠ ${esc(p?(p.name||b.adresse):b.adresse)}</b>
   Massaufnahme „${esc(a.m&&a.m.title?a.m.title:b.adresse)}“ wurde nach der
   Freigabe geändert – sie muss erneut freigegeben werden.
   ${p?`<div class="a2-knopf-reihe">
    <button type="button" class="a2-knopf a2-knopf-klein a2-k-grau"
     data-a2-projekt="${esc(p.id)}">Projekt öffnen</button></div>`:""}
  </div>`;
 });

 // ---- Wichtige Hinweise --------------------------------------------------
 // v3.160: Die freie Notiz am Projekt (Zufahrt, Schluessel,
 // Ansprechpartner). Sie steht oben, weil sie vor der Abfahrt gilt und
 // nicht nach der Ankunft. Gezeigt wird ausschliesslich, was jemand
 // eingetragen hat - gibt es keine Notiz, gibt es auch keinen Abschnitt.
 const hinweise=a2HinweisProjekte().slice(0,5);
 if(hinweise.length){
  html+=`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Wichtige Hinweise</h2></div>`
   +hinweise.map(p=>{
    const titel=(typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||"Projekt");
    return `<button type="button" class="a2-zeile" data-a2-projekt="${esc(p.id)}">
     <span class="a2-zeile-nr">📌</span>
     <span class="a2-zeile-text"><b>${esc(p.name||titel)}</b>
      <span>${esc(p.hinweis.trim())}</span></span>
     <span class="a2-zeile-pfeil">›</span></button>`;
   }).join("")+"</div>";
 }

 // ---- Meine Aufgaben -----------------------------------------------------
 if(!a2AufgabenAktiv()){
  html+=`<div class="a2-abschnitt"><div class="a2-leer">Der Arbeitsablauf ist
   für diese Firma ausgeschaltet. Es gibt deshalb keine Aufgabenliste –
   gearbeitet wird direkt über die Projekte.</div></div>`;
 }else{
  html+=`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Meine Aufgaben ${a2Hilfe("aufgaben")}</h2>
    ${auf.length?`<span class="a2-marke a2-m-blau">${auf.length} offen</span>`:""}</div>`;
  html+=auf.length
   ? auf.map(a2AufgabeHtml).join("")
   : '<div class="a2-leer">Nichts offen. Alles, was dir zugeteilt ist, ist erledigt.</div>';
  html+="</div>";
 }

 // ---- Werkstatt heute ----------------------------------------------------
 if(a2WerkstattSichtbar()){
  const z=a2WerkZahlen();
  html+=`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Werkstatt heute</h2>
    <button type="button" data-a2-tab="werkstatt">Werkstatt öffnen ›</button></div>`;
  if(a2WerkFehler){
   html+=`<div class="a2-hinweis a2-h-warnung"><b>Die Werkstattzahlen fehlen</b>
    ${esc(a2WerkFehler)}</div>`;
  }else if(!a2WerkGeladen){
   html+='<div class="a2-leer">Werkstatt wird geladen …</div>';
  }else{
   html+=`<div class="a2-zahlen">
    <div class="a2-zahl a2-z-orange"><b>${z.teile}</b><span>Teile zu produzieren</span></div>
    <div class="a2-zahl a2-z-blau"><b>${z.ruestlisten}</b><span>Rüstlisten</span></div>
    <div class="a2-zahl a2-z-gruen"><b>${z.montagen}</b><span>Montagen vorbereitet</span></div>
   </div>`;
  }
  html+="</div>";

  // ---- Anstehende Montage ----------------------------------------------
  const montage=a2MontageListe();
  if(a2WerkGeladen&&montage.length){
   html+=`<div class="a2-abschnitt">
    <div class="a2-abschnitt-kopf"><h2>Anstehende Montage</h2></div>`
    +montage.map(m=>{
     const p=a2Projekt(m.project_id);
     const b=(typeof aufgabenBeschriftung==="function")?aufgabenBeschriftung(m):{adresse:m.title||"",zusatz:""};
     const wer=a2PersonName(m.monteur_id);
     // v3.160: Steht ein Termin in der Datenbank, sagt die Zeile ihn -
     // "morgen", "in 2 Tagen", mit Datum. Gerechnet wird er in
     // montageTermin() (js/01), derselben Stelle wie im Formular.
     // Steht KEINER da, wird auch keiner erfunden: dann sagt die Zeile
     // weiterhin nur, seit wann geruestet bereitliegt (geruestet_am).
     const t=(typeof montageTermin==="function")?montageTermin(m.montage_am):null;
     const unten=[t?t.wort+" · "+t.datum:(m.geruestet_am?"gerüstet am "+a2Datum(m.geruestet_am):""),
                  wer||"noch niemand eingeteilt"].filter(Boolean).join(" · ");
     return `<button type="button" class="a2-zeile" data-a2-projekt="${esc(m.project_id)}">
      <span class="a2-zeile-nr${t&&(t.ueberfaellig||t.dringend)?" ist-rot":""}">🏠</span>
      <span class="a2-zeile-text"><b>${esc((p?p.name+" – ":"")+(b.adresse||""))}</b>
       <span>${esc(unten)}</span></span>
      <span class="a2-zeile-pfeil">›</span></button>`;
    }).join("")+"</div>";
  }
 }

 // ---- Offene Projekte ----------------------------------------------------
 // v3.161: In der Vorgabe nur die zugeteilten. Der Abschnitt erscheint
 // jetzt AUCH, wenn nichts uebrig bleibt - sonst verschwaende er wortlos,
 // und niemand wuesste, dass es am Filter liegt und nicht an fehlenden
 // Projekten. Die Zahl hinter "Alle" sagt, was der Umschalter braechte.
 const offen=a2OffeneProjekte().slice(0,8);
 const offenAlle=a2OffeneProjekte(false);
 if(offen.length||offenAlle.length){
  html+=`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Offene Projekte</h2>
    <button type="button" data-a2-tab="projekte">Alle Projekte ›</button></div>
   <div class="a2-register a2-register-klein">
    <button type="button" data-a2-pfilter="meine"${a2ProjektFilter==="meine"?' class="ist-auf"':""}>Meine</button>
    <button type="button" data-a2-pfilter="alle"${a2ProjektFilter==="alle"?' class="ist-auf"':""}>Alle (${offenAlle.length})</button>
   </div>`;
  if(!offen.length){
   html+=`<div class="a2-leer">Dir ist gerade kein offenes Projekt zugeteilt.
    Mit „Alle“ siehst du, was im Betrieb sonst noch läuft.</div></div>`;
  }else{
  html+=`<div class="a2-liste-zwei">`
   +offen.map(p=>{
    const st=(typeof projektStatusInfo==="function")?projektStatusInfo(p):null;
    const titel=(typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||"Projekt");
    const stand=a2WerkGeladen?a2ProjektStand(p):null;
    return `<button type="button" class="a2-karte a2-karte-klick" data-a2-projekt="${esc(p.id)}">
     <div class="a2-karte-kopf">
      <div class="a2-karte-kopf-text">
       <div class="a2-karte-titel">${esc(p.name||titel)}</div>
       <p class="a2-karte-unter">${esc(p.object||"")}</p>
      </div>
      ${st?`<span class="a2-marke a2-m-grau">${esc(st.icon+" "+st.label)}</span>`:""}
     </div>
     ${stand&&stand.gesamt?a2FortschrittHtml(stand.erledigt,stand.gesamt,"Produziert")
       :`<p class="a2-karte-unter" style="margin-top:8px">${
         a2WerkstattSichtbar()&&!a2WerkGeladen?"Zuschnittstand wird geladen …"
                                              :"Noch keine Teile erfasst."}</p>`}
    </button>`;
   }).join("")
   +"</div></div>";
  }
 }
 return html;
}

// Eine Aufgabe. Titel, Farbe und Knopfbeschriftung kommen aus js/45 - dieselbe
// Quelle wie in der klassischen Ansicht, damit dort und hier nie zwei
// verschiedene Dinge stehen.
//
// v3.158: als ZEILE wie im Prototyp, nicht mehr als Karte mit Knopfreihe.
// Ein Unterschied zum Prototyp ist Absicht: dort fuehrt die Zeile nur ins
// Projekt. Hier fuehrt sie in die Massaufnahme, um die es geht - und wo die
// Aufgabe einen eigenen Schritt hat (ruesten, montieren, zuweisen), steht er
// als kleiner Knopf rechts daneben. Ohne ihn waere aus jedem Einzeltipp des
// Ruesters ein Weg ueber drei Schirme geworden.
function a2AufgabeHtml(a){
 if(!a||typeof aufgabenArt!=="function")return "";
 const art=aufgabenArt(a.art);
 const b=(typeof aufgabenBeschriftung==="function")?aufgabenBeschriftung(a.m):{adresse:"Massaufnahme",zusatz:""};
 const dringend=art.farbe==="rot";
 const zeichen=A2_AUFGABE_ZEICHEN[a.art]||"•";
 const eigenerSchritt=(a.art!=="freigeben"&&a.art!=="erneut_freigeben");
 return `<div class="a2-zeile-reihe">
  <button type="button" class="a2-zeile" data-a2-aufgabe="oeffnen" data-a2-id="${esc(a.m.id)}">
   <span class="a2-zeile-nr${dringend?" ist-rot":""}">${zeichen}</span>
   <span class="a2-zeile-text"><b>${esc(art.titel)}</b>
    <span>${esc([b.adresse,b.zusatz].filter(Boolean).join(" · "))}${dringend?" · dringend":""}</span></span>
   <span class="a2-zeile-pfeil">›</span></button>
  ${eigenerSchritt?`<button type="button" class="a2-knopf a2-knopf-klein a2-k-blau a2-zeile-tat"
    data-a2-aufgabe="${esc(a.art)}" data-a2-id="${esc(a.m.id)}">${esc(art.knopf)}</button>`:""}
 </div>`;
}

// ===========================================================================
// PROJEKTE
// ===========================================================================
function a2SeiteProjekte(){
 // Das Suchfeld steht AUSSERHALB von #a2ProjListe und wird beim Tippen
 // deshalb nicht neu gebaut. Wuerde es mitgezeichnet, verloere es bei jedem
 // Anschlag den Fokus - auf dem Handy klappt damit die Tastatur zu, und
 // ein Suchfeld, das sich nach einem Buchstaben schliesst, ist keines.
 return `<div class="a2-suche">
  <input id="a2Suche" type="search" placeholder="Adresse, Projekt, Auftrags-Nr."
   value="${esc(a2Zustand.suche)}" autocomplete="off" enterkeyhint="search"></div>
 <div id="a2ProjListe">${a2ProjListeHtml()}</div>
 <div class="a2-knopf-reihe">
  <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="neuesprojekt">
   ＋ Neues Projekt</button></div>
 <div class="a2-knopf-reihe">
  <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="projektarchiv">
   🗄 Archiv und Filter</button></div>`;
}
// Gesucht wird mit projektPasstZuSuche() aus js/09 - genau derselbe Vergleich
// wie in der klassischen Projektliste und in den Auswahlfeldern. Eine zweite
// Suchregel waere eine zweite Wahrheit darueber, was ein Treffer ist.
function a2ProjListeHtml(){
 const q=a2Zustand.suche;
 const treffer=a2Projekte()
  .filter(p=>!p.archived&&(typeof projektPasstZuSuche!=="function"||projektPasstZuSuche(p,q)));
 if(!treffer.length){
  return `<div class="a2-leer">${q?"Kein Projekt passt zu dieser Suche.":"Noch keine Projekte."}</div>`;
 }
 return `<div class="a2-abschnitt-kopf"><h2>${esc(a2Anzahl(treffer.length,"Projekt","Projekte"))}</h2></div>`
  +'<div class="a2-liste-zwei">'+treffer.map(a2ProjektZeileHtml).join("")+"</div>";
}
function a2ProjektZeileHtml(p){
 const titel=(typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||"Projekt");
 const s=(typeof projektStatusInfo==="function")?projektStatusInfo(p):null;
 const unten=[p.name&&p.name!==titel?p.name:"",p.order_no?"Auftrag "+p.order_no:""]
  .filter(Boolean).join(" · ");
 return `<button type="button" class="a2-zeile" data-a2-projekt="${esc(p.id)}">
  <span class="a2-zeile-text"><b>${esc(titel)}</b>
   <span>${esc(unten||"—")}</span></span>
  ${s?`<span class="a2-marke a2-m-grau">${esc(s.icon+" "+s.label)}</span>`:""}
  <span class="a2-zeile-pfeil">›</span></button>`;
}

// ===========================================================================
// MEHR
// ===========================================================================
// Jeder Eintrag loest den vorhandenen Knopf der klassischen Ansicht aus.
// Deshalb steht hier keine einzige eigene Bedingung darueber, wer was darf -
// ein Eintrag erscheint genau dann, wenn sein Knopf dort sichtbar ist.
function a2SeiteMehr(){
 const eintraege=[
  {id:"suche",      zeichen:"🔍", text:"Suche",                 unter:"Projekte, Massaufnahmen, Rapporte"},
  {id:"einstell",   zeichen:"⚙️", text:"Einstellungen",         unter:"Firma, Katalog, Module"},
  {id:"anleitung",  zeichen:"📖", text:"Anleitung",             unter:"Das ganze Handbuch als PDF"},
  {id:"feedback",   zeichen:"💬", text:"Feedback geben",        unter:"Fehler melden, Wunsch äussern"}
 ];
 if(a2KnopfSichtbar("navAdminMeas"))
  eintraege.push({id:"adminmeas",zeichen:"📋",text:"Alle Massaufnahmen",unter:"Übersicht für die Firmenleitung"});
 if(a2KnopfSichtbar("navSystemAdmin"))
  eintraege.push({id:"sysadmin",zeichen:"⚙️",text:"System-Administration",unter:"Betreiber-Einstellungen"});

 const version=$("appVersion")?$("appVersion").textContent.trim():"";
 return eintraege.map(e=>`
  <button type="button" class="a2-zeile" data-a2-tu="${esc(e.id)}">
   <span class="a2-zeile-nr">${e.zeichen}</span>
   <span class="a2-zeile-text"><b>${esc(e.text)}</b><span>${esc(e.unter)}</span></span>
   <span class="a2-zeile-pfeil">›</span></button>`).join("")
 +`<div class="a2-abschnitt" style="margin-top:22px">
   <div class="a2-abschnitt-kopf"><h2>Ansicht</h2></div>
   <div class="a2-karte">
    <div class="a2-karte-titel">Neue Ansicht</div>
    <p class="a2-karte-unter">Du arbeitest gerade mit der neuen, nach dem
    Arbeitsablauf gegliederten Oberfläche. Die klassische Ansicht ist
    unverändert da – alle Formulare, Listen und Auswertungen sind in beiden
    dieselben.</p>
    <div class="a2-knopf-reihe">
     <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="klassisch">
      ↩ Zurück zur klassischen Ansicht</button></div>
   </div>
   <div class="a2-karte">
    <div class="a2-karte-titel">${esc(a2Name(typeof currentProfile!=="undefined"?currentProfile:null))}</div>
    <p class="a2-karte-unter">${esc(version)}</p>
    <div class="a2-knopf-reihe">
     <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="abmelden">
      🔓 Abmelden</button></div>
   </div>
  </div>`;
}

// ===========================================================================
// Zeichnen
// ===========================================================================
function a2Zeichnen(){
 if(!a2Aktiv())return;
 const schirm=$("a2Screen");
 if(!schirm||!$("a2Inhalt")||!$("a2Kopf")||!$("a2Leiste"))return;

 const leisten=a2Leisten();
 // Eine Seite, die es nicht (mehr) gibt - etwa weil die Werkstatt firmenweit
 // abgeschaltet wurde - faellt auf HEUTE zurueck statt leer zu bleiben.
 if(a2Zustand.seite!=="projekt"&&!leisten.some(e=>e.k===a2Zustand.seite))a2Zustand.seite="heute";

 const eintrag=leisten.find(e=>e.k===a2Zustand.seite);
 const profil=(typeof currentProfile!=="undefined")?currentProfile:null;
 // Auf der Projektseite traegt die Kopfzeile das Projekt und einen
 // Zurueck-Knopf. 44px breit: das ist die Mindestgroesse fuer einen Finger,
 // und diese Taste wird auf dem Dach mit Handschuhen getroffen.
 const proj=(a2Zustand.seite==="projekt")?a2Projekt(a2Zustand.projektId):null;
 // Ein offener Bereich steht in der Kopfzeile ueber allem anderen: er ist
 // das, was der Anwender gerade sieht.
 const ber=a2Zustand.bereich;
 const titel=ber?ber.name
  :(proj?((typeof projektTitel==="function")?projektTitel(proj):(proj.object||proj.name||"Projekt"))
        :(eintrag?eintrag.name:"Heute"));
 const unter=ber?""
  :(proj
  ? [proj.name&&proj.name!==titel?proj.name:"",proj.order_no?"Auftrag "+proj.order_no:""].filter(Boolean).join(" · ")
  : (a2Zustand.seite==="heute"
      // v3.158: das Datum statt des Firmennamens. Der Firmenname steht
      // ohnehin direkt darunter in der Markenzeile, zusammen mit dem Logo -
      // zweimal derselbe Name ist kein Hinweis.
      ? a2HeuteDatum()+" · "+a2Name(profil)
      : ""));
 $("a2Kopf").innerHTML=
  (ber?'<button type="button" class="a2-kopf-zurueck" data-a2-bereich-zu aria-label="Bereich schliessen">‹</button>'
     :(proj?'<button type="button" class="a2-kopf-zurueck" data-a2-zurueck aria-label="Zurück zur Projektliste">‹</button>':""))
  +`<div class="a2-kopf-titel"><b>${esc(titel)}</b>`
  +(unter?`<span>${esc(unter)}</span>`:"")
  +`</div>`
  // "So arbeitet die App" steht in der Kopfzeile von HEUTE: dort ist er bei
  // jeder Bildschirmbreite sichtbar (die Markenzeile weicht auf dem Desktop
  // der Seitenleiste) und er ist der erste Info-Knopf im Dokument - wer die
  // Erklaerung zum Bildschirm sucht, trifft ihn zuerst. Auf der
  // Projektseite waere die Kopfzeile mit Zurueck, Titel und Kuerzel zu voll.
  +((a2Zustand.seite==="heute"&&!ber)?a2Hilfe("start"):"")
  +`<div class="a2-kopf-ich" title="${esc(a2Name(profil))}">${esc(a2Kuerzel(profil))}</div>`;

 const offen=a2AufgabenAktiv()?a2Aufgaben().length:0;
 // Der Markenblock steht nur in der Seitenleiste (ab 1000px) - in der
 // unteren Leiste eines Handys ist kein Platz dafuer, und dort steht das
 // Logo ohnehin oben auf der Heute-Seite.
 $("a2Leiste").innerHTML=a2MarkeHtml("a2-marke-leiste")+leisten.map(e=>{
  // Auf der Projektseite bleibt "Projekte" markiert - man ist ja darin.
  // Liegt ein Bereich offen, ist SEIN Eintrag markiert, nicht die Seite
  // dahinter: sonst zeigte die Leiste "Heute", waehrend die Werkstatt offen
  // ist. Genau das war der Zustand bis v3.155.
  const auf=ber?(ber.tab===e.k)
   :((a2Zustand.seite===e.k)||(a2Zustand.seite==="projekt"&&e.k==="projekte"));
  const punkt=(e.k==="heute"&&offen)?`<span class="a2-punkt">${offen}</span>`:"";
  return `<button type="button" class="${auf?"ist-auf":""}" data-a2-tab="${esc(e.k)}">
   <i>${a2Symbol(e.k)}</i>${punkt}<span>${esc(e.name)}</span></button>`;
 }).join("");

 let inhalt="";
 if(a2Zustand.seite==="projekt")inhalt=a2SeiteProjekt();
 else if(a2Zustand.seite==="projekte")inhalt=a2SeiteProjekte();
 else if(a2Zustand.seite==="mehr")inhalt=a2SeiteMehr();
 else inhalt=a2SeiteHeute();
 $("a2Inhalt").innerHTML=inhalt;

 // Die Werkstattzahlen der Startseite kommen nach: die Seite steht sofort
 // da, die Zahlen erscheinen, sobald werkLaden() zurueck ist. Der Aufruf
 // schuetzt sich selbst gegen Mehrfachlauf (a2WerkLaeuft/a2WerkGeladen) -
 // ein Wiederholen beim naechsten Zeichnen kostet deshalb nichts.
 if(a2Zustand.seite==="heute"&&!a2Zustand.bereich)a2HeuteLaden();
}

// ===========================================================================
// Bedienung
// ===========================================================================
// Ein einziger Klick-Beobachter auf dem ganzen Schirm. Die Inhalte werden bei
// jeder Aenderung neu gezeichnet - einzeln angehaengte Handler waeren damit
// nach dem ersten Neuzeichnen tot.
document.addEventListener("click",async e=>{
 if(!a2Aktiv())return;

 const tab=e.target.closest("[data-a2-tab]");
 if(tab&&$("a2Screen")&&$("a2Screen").contains(tab)){
  // v3.162: Liegt ein Formular offen, wird es geschlossen - bei
  // ungespeicherten Eingaben erst nach Rueckfrage. Sagt der Anwender
  // nein, passiert gar nichts: er bleibt, wo er war.
  if(!a2FormularVerlassen())return;
  const k=tab.getAttribute("data-a2-tab");
  const eintrag=a2Leisten().find(x=>x.k===k);
  // Ein offener Bereich wird ZUERST geschlossen. Ohne das wechselte die
  // Seite dahinter, waehrend sichtbar der alte Bereich stehen bliebe.
  if(a2Zustand.bereich)a2BereichSchliessen();
  // Werkstatt und Lager sind keine eigenen Seiten dieser Ansicht, sondern
  // die vorhandenen Arbeitsplaetze der App. Sie werden geoeffnet, nicht
  // nachgebaut - sonst gaebe es sie zweimal und nur eine waere gepflegt.
  // Seit v3.156 aber IM Rahmen: Kopf und Leiste bleiben stehen.
  if(eintrag&&eintrag.oeffnet){
   if(k==="werkstatt"&&$("navWerkstatt"))
    await a2BereichStarten("werkstattModal","Werkstatt","werkstatt",()=>$("navWerkstatt").click());
   if(k==="lager"&&$("navLagerverwaltung"))
    await a2BereichStarten("settingsModal","Lager","lager",
     ()=>$("navLagerverwaltung").click(),"a2-nur-lager");
   return;
  }
  const warSchon=(a2Zustand.seite===k);
  a2Zustand.seite=k;
  a2Zeichnen();
  window.scrollTo(0,0);
  // Wer auf HEUTE tippt, will den Stand von jetzt - gerade wenn er eben aus
  // der Werkstatt kommt und dort etwas abgehakt hat.
  if(k==="heute"&&warSchon)a2HeuteLaden(true);
  return;
 }

 const projekt=e.target.closest("[data-a2-projekt]");
 if(projekt){
  await a2ProjektOeffnen(projekt.getAttribute("data-a2-projekt"));
  return;
 }

 // v3.161: Umschalter "Meine / Alle" ueber den offenen Projekten. Er
 // aendert nur, was gezeigt wird - geladen ist ohnehin alles, was die RLS
 // hergibt. Deshalb keine Abfrage, nur neu zeichnen.
 const pf=e.target.closest("[data-a2-pfilter]");
 if(pf&&$("a2Screen")&&$("a2Screen").contains(pf)){
  a2ProjektFilter=(pf.getAttribute("data-a2-pfilter")==="alle")?"alle":"meine";
  a2Zeichnen();
  return;
 }

 // Register innerhalb der Projektseite
 const reg=e.target.closest("[data-a2-reg]");
 if(reg&&$("a2Screen")&&$("a2Screen").contains(reg)){
  a2Zustand.reg=reg.getAttribute("data-a2-reg");
  a2Zeichnen(); window.scrollTo(0,0);
  return;
 }

 // Eine Massaufnahme, ein Ausmass, eine Offerte, eine Leistung, ein Rapport.
 // Jedes oeffnet das BESTEHENDE Formular mit der echten Zeile aus dem
 // Zwischenspeicher - hier wird nichts nachgebaut und nichts neu abgefragt.
 const meas=e.target.closest("[data-a2-meas]");
 if(meas){ a2Oeffne("meas",meas.getAttribute("data-a2-meas")); return }
 const am=e.target.closest("[data-a2-am]");
 if(am){ a2Oeffne("am",am.getAttribute("data-a2-am")); return }
 const ang=e.target.closest("[data-a2-ang]");
 if(ang){ a2Oeffne("ang",ang.getAttribute("data-a2-ang")); return }
 const lei=e.target.closest("[data-a2-lei]");
 if(lei){ a2Oeffne("lei",lei.getAttribute("data-a2-lei")); return }
 const rep=e.target.closest("[data-a2-rep]");
 if(rep){ a2Oeffne("rep",rep.getAttribute("data-a2-rep")); return }

 // Zurueck von der Projektseite in die Projektliste
 const bereichZu=e.target.closest("[data-a2-bereich-zu]");
 if(bereichZu&&$("a2Screen")&&$("a2Screen").contains(bereichZu)){
  a2BereichSchliessen();
  a2Zeichnen();
  return;
 }

 const zurueck=e.target.closest("[data-a2-zurueck]");
 if(zurueck&&$("a2Screen")&&$("a2Screen").contains(zurueck)){
  a2Zustand.seite="projekte"; a2Zustand.projektId=null;
  a2Zeichnen(); window.scrollTo(0,0);
  return;
 }

 const aufgabe=e.target.closest("[data-a2-aufgabe]");
 if(aufgabe){
  const art=aufgabe.getAttribute("data-a2-aufgabe");
  const id=aufgabe.getAttribute("data-a2-id");
  // Genau derselbe Weg wie in der klassischen Ansicht, samt Rueckfragen,
  // Offline-Sperre und serverseitiger Pruefung.
  if(typeof aufgabeAusfuehren==="function")await aufgabeAusfuehren(art,id);
  return;
 }

 const tu=e.target.closest("[data-a2-tu]");
 if(tu&&$("a2Screen")&&$("a2Screen").contains(tu)){
  const was=tu.getAttribute("data-a2-tu");
  if(was==="hinweisweg"){a2HinweisWeg();return}
  if(was==="klassisch"){a2Setzen(false);return}
  // Alle folgenden oeffnen einen BEREICH: den vorhandenen Schirm der App,
  // aber im Rahmen der neuen Ansicht (v3.156). Kein Inhalt wird nachgebaut.
  // Zwei getrennte Wege statt eines Sammelknopfs (v3.156). Wer "Neues
  // Projekt" tippt, will ein Projekt anlegen - und bekam bis v3.155 die
  // vollstaendige Projektliste darunter ein zweites Mal, obwohl er gerade
  // von ihr kam. Das Anlegen-Formular steht jetzt allein.
  if(was==="neuesprojekt"&&$("startOpenProjects")){
   await a2BereichStarten("projectsModal","Neues Projekt","projekte",
    ()=>$("startOpenProjects").click(),"a2-nur-anlegen");return}
  if(was==="projektarchiv"&&$("startOpenProjects")){
   await a2BereichStarten("projectsModal","Archiv und Filter","projekte",
    ()=>$("startOpenProjects").click(),"a2-nur-liste");return}
  if(was==="suche"&&$("openGlobalSearch")){
   await a2BereichStarten("globalSearchModal","Suche","mehr",()=>$("openGlobalSearch").click());return}
  if(was==="einstell"&&$("settings")){
   await a2BereichStarten("settingsModal","Einstellungen","mehr",()=>$("settings").click());return}
  if(was==="feedback"&&$("openFeedback")){
   await a2BereichStarten("feedbackModal","Feedback","mehr",()=>$("openFeedback").click());return}
  if(was==="adminmeas"&&$("navAdminMeas")){
   await a2BereichStarten("adminMeasModal","Alle Massaufnahmen","mehr",()=>$("navAdminMeas").click());return}
  if(was==="sysadmin"&&$("navSystemAdmin")){
   await a2BereichStarten("systemAdminModal","System-Administration","mehr",()=>$("navSystemAdmin").click());return}
  if(was==="abmelden"&&$("logout")){$("logout").click();return}
  // v3.157: bis v3.156 fuehrte dieser Eintrag ueber openSettingsTo() in die
  // EINSTELLUNGEN - genau dorthin, wo der Eintrag "Einstellungen" direkt
  // darueber auch schon hinfuehrte. Zwei Eintraege, ein Ziel. Jetzt oeffnet
  // er die Anleitung selbst. HILFE_PDF (js/41) ist die eine Quelle fuer den
  // Pfad; ein zweiter hier wuerde beim naechsten Versionswechsel veralten.
  if(was==="anleitung"){
   const pfad=(typeof HILFE_PDF!=="undefined")?HILFE_PDF:"";
   if(pfad)window.open(pfad,"_blank","noopener");
   return;
  }

  // ---- Aktionen der Projektseite ----
  if(was==="neuemeas"){a2NeuerEintrag("meas");return}
  if(was==="neuesam"){a2NeuerEintrag("am");return}
  if(was==="neuerrapport"){a2NeuerEintrag("rep");return}
  if(was==="neueang"){a2NeuerEintrag("ang");return}
  if(was==="neuelei"){a2NeuerEintrag("lei");return}
  // Material & Zuschnitt und die Werkstatt sind eigene Arbeitsplaetze der
  // App - sie werden geoeffnet, nicht nachgebaut.
  if(was==="matzu"&&typeof openMaterialZuschnitt==="function"){
   await a2BereichStarten("matZuModal","Material & Zuschnitt","projekte",
    ()=>openMaterialZuschnitt(Number(a2Zustand.projektId)));
   return;
  }
  if(was==="werkstatt"&&$("navWerkstatt")){
   await a2BereichStarten("werkstattModal","Werkstatt","werkstatt",()=>$("navWerkstatt").click());return}
  // Dateien, Fotos und Verlauf stehen im Cockpit - und NUR sie werden
  // gezeigt (v3.163, gemeldet: "oeffnet sich das alte projekt cockpit,
  // das ist falsch"). Die Marke blendet den Rest aus; nachgebaut wird
  // nichts, sonst gaebe es das Hochladen zweimal.
  if(was==="cockpit"&&typeof openProjectCockpit==="function"){
   a2AusNeuerAnsicht=true;
   const auf=await a2BereichStarten("projectCockpitModal","Dateien, Fotos und Verlauf","projekte",
    ()=>openProjectCockpit(Number(a2Zustand.projektId)),"a2-nur-dateien");
   if(!auf)a2AusNeuerAnsicht=false;
   return;
  }
  // Stammdaten aendert man im Cockpit - ein zweites Formular dafuer waere
  // ein zweiter Schreibweg auf dieselben vier Felder.
  if(was==="stammdaten"){ await a2StammdatenOeffnen(a2Zustand.projektId); return }
  return;
 }
});

// Die Projektsuche tippt sich fluessig: neu gezeichnet wird nur die Liste,
// nicht das Feld - sonst verloere es bei jedem Anschlag den Fokus.
document.addEventListener("input",e=>{
 if(!a2Aktiv())return;
 if(!e.target||e.target.id!=="a2Suche")return;
 a2Zustand.suche=e.target.value;
 const liste=$("a2ProjListe");
 if(liste)liste.innerHTML=a2ProjListeHtml();
});

// Der Knopf auf der klassischen Startseite, der hierher fuehrt.
if($("a2Ein"))$("a2Ein").onclick=()=>a2Setzen(true);


// ===========================================================================
// PROJEKTSEITE  (v3.151)
// ===========================================================================
// Sechs Register wie im Prototyp: Uebersicht, Aufmass, Produktion, Werkstatt,
// Ausmass, Mehr. Der Unterschied zum Prototyp ist, dass hier echte Daten
// stehen und jeder Knopf das bestehende Formular oeffnet.
//
// WOHER DIE DATEN KOMMEN
// Aus GENAU denselben Abfragen wie das Projekt-Cockpit: die Ladefunktionen
// in COCKPIT_BEREICHE (js/24) plus loadProjectAngebote/loadProjectLeistungen.
// Diese Seite baut keine eigene Abfrage. Das ist nicht nur sparsam - zwei
// Abfragen auf dieselbe Sache koennten zwei verschiedene Staende zeigen.
//
// Ein Nebeneffekt davon ist erwuenscht: die Ladefunktionen fuellen zugleich
// die Listen des klassischen Cockpits. Wer mitten im Projekt auf die
// klassische Ansicht wechselt, findet sie dort also fertig vor.
// ===========================================================================

// v3.156: Der Regierapport steht neben den uebrigen Begriffen, nicht mehr
// unter "Mehr …". Er ist kein Nebenschauplatz - er ist das, was am Abend
// geschrieben und am Ende verrechnet wird. "Mehr …" bleibt fuer Offerte,
// Leistungen, Dateien und Verlauf; ohne das waeren die nicht erreichbar.
const A2_PROJ_REGISTER=[
 {k:"uebersicht",name:"Übersicht"},
 // v3.157: Der Schluessel bleibt "aufmass" - er steht im Zustand, in den
 // Pruefstaenden und in gespeicherten Sitzungen. Umbenannt ist nur, was der
 // Anwender liest.
 {k:"aufmass",   name:"Massaufnahme"},
 // Produktion und Werkstatt gibt es nur, wenn die Firma die zugehoerigen
 // Untermodule eingeschaltet hat (js/47). Die Entscheidung faellt dort,
 // nicht hier - pmAktiv() ist die eine Quelle dafuer.
 {k:"produktion",name:"Produktion",wenn:()=>a2Modul("material")},
 {k:"werkstatt", name:"Werkstatt", wenn:()=>a2Modul("werkstatt")},
 {k:"ausmass",   name:"Ausmass"},
 {k:"rapport",   name:"Regierapport"},
 {k:"mehr",      name:"Mehr …"}
];
function a2Modul(k){ return typeof pmAktiv==="function"&&pmAktiv(k) }
function a2ProjRegister(){
 return A2_PROJ_REGISTER.filter(r=>!r.wenn||r.wenn());
}

let a2ProjLaedt=false;
let a2ProjFehler="";

// Die Listen des Projekts. Sie werden nicht hier gehalten, sondern in den
// Zwischenspeichern der App gelesen - dieselben, die das Cockpit fuellt.
function a2Rep(){
 return (typeof projectReportsCache!=="undefined"&&Array.isArray(projectReportsCache))
  ?projectReportsCache:[];
}
function a2Lei(){
 return (typeof projectLeistungenCache!=="undefined"&&Array.isArray(projectLeistungenCache))
  ?projectLeistungenCache:[];
}

// ---- Laden ----------------------------------------------------------------
// Die Stammdaten eines Projekts in der NEUEN Ansicht oeffnen.
//
// Stammdaten aendert man im Cockpit - ein zweites Formular dafuer waere ein
// zweiter Schreibweg auf dieselben Felder. Mit Marke (v3.162), sonst steht
// dort das ganze Cockpit samt Arbeitsstand und allen Arbeitsbereichen, und
// die Felder, um die es geht, liegen darunter.
//
// v3.166: auch das ist jetzt EINE Stelle - gerufen aus "Mehr" und aus der
// Projektliste ("Bearbeiten"), die vorher direkt ins volle Cockpit sprang.
async function a2StammdatenOeffnen(id){
 if(typeof openProjectCockpitZumBearbeiten!=="function")return false;
 // Wie bei a2ProjektOeffnen: ein offener Bereich (etwa die Projektliste,
 // aus der geklickt wurde) wird ueber seinen eigenen Knopf geschlossen.
 if(a2Zustand.bereich)a2BereichSchliessen();
 a2AusNeuerAnsicht=true;
 const auf=await a2BereichStarten("projectCockpitModal","Stammdaten","projekte",
  ()=>openProjectCockpitZumBearbeiten(Number(id)),"a2-nur-stammdaten");
 if(!auf)a2AusNeuerAnsicht=false;
 return auf;
}

// Ein Projekt in der NEUEN Ansicht oeffnen - die eine Stelle dafuer.
//
// Seit v3.151 fuehrt das in die eigene Projektseite (sechs Register), nicht
// mehr ins klassische Cockpit. Das Cockpit bleibt ueber "Mehr" erreichbar -
// dort stehen Dateien und Verlauf, die hier nicht nachgebaut sind.
//
// v3.166: Gerufen wird das jetzt auch von aussen - aus der Werkstatt und aus
// der Projektliste, ueber projektOeffnen() in js/01. Vorher sprangen diese
// beiden Wege an der neuen Ansicht vorbei direkt ins alte Cockpit (gemeldet:
// "wenn ich ueber die werkstatt ein projekt direkt oeffne, oeffnet sich noch
// komplett die alte ansicht").
// Wo liegt ein Suchtreffer auf der Projektseite? Register und Kennzeichen
// je Art - dieselbe Rolle, die COCKPIT_TREFFER_ATTR/_KLAPP im Cockpit
// spielen (js/24). Eine weitere Art aufzunehmen heisst: eine Zeile hier.
//
// Die drei Arten sind genau die, die die Suche erzeugt (js/04). Alle drei
// Register gibt es immer - sie haengen an keinem Modulschalter, ein Treffer
// kann also nicht in einem abgeschalteten Register landen.
const A2_TREFFER={
 measurement:{reg:"aufmass", attr:"data-a2-meas"},
 ausmass:    {reg:"ausmass", attr:"data-a2-am"},
 report:     {reg:"rapport", attr:"data-a2-rep"}
};

// Den Treffer auf der bereits gezeichneten Projektseite hervorheben.
// Gibt es ihn dort nicht (geloescht, oder er gehoert zu einem anderen
// Projekt), passiert NICHTS - kein Sprung ins Leere, keine Meldung ueber
// etwas, das der Anwender nicht zu verantworten hat.
function a2TrefferHervorheben(treffer){
 const t=treffer&&A2_TREFFER[treffer.kind];
 if(!t||!treffer.id)return false;
 const el=$("a2Inhalt")&&$("a2Inhalt").querySelector(`[${t.attr}="${treffer.id}"]`);
 if(!el)return false;
 el.classList.add("treffer");
 el.scrollIntoView({block:"center"});
 // Dieselben 5 Sekunden wie im Cockpit - lange genug zum Finden, kurz
 // genug, dass die Markierung nicht als Zustand missverstanden wird.
 setTimeout(()=>el.classList.remove("treffer"),5000);
 return true;
}

async function a2ProjektOeffnen(id,treffer){
 if(!a2Projekt(id)){ a2Zeichnen(); return false }  // fremde/geloeschte ID: nichts tun
 // Kommt der Sprung aus einem offenen Bereich - Werkstatt, Projektliste,
 // Suche -, wird der zuerst ueber seinen EIGENEN Schliessen-Knopf zugemacht.
 // Das Fenster einfach zu verstecken wuerde den Aufraeumteil dieses Knopfes
 // ueberspringen (er stellt u. a. den Startschirm wieder her).
 if(a2Zustand.bereich)a2BereichSchliessen();
 // v3.167: Kommt der Sprung aus der Suche, wird gleich das Register
 // aufgeschlagen, in dem der Treffer liegt. Sonst landete man auf der
 // Uebersicht und muesste ihn selbst suchen - genau das, was die Suche
 // einem abnehmen soll.
 const ziel=treffer&&A2_TREFFER[treffer.kind];
 a2Zustand.seite="projekt"; a2Zustand.projektId=id;
 a2Zustand.reg=ziel?ziel.reg:"uebersicht";
 window.scrollTo(0,0);
 await a2ProjektLaden(id);
 // Erst NACH dem Laden: a2ProjektLaden zeichnet zweimal (Ladezustand und
 // Ergebnis); vorher gaebe es die Zeile noch gar nicht.
 if(treffer)a2TrefferHervorheben(treffer);
 return true;
}

async function a2ProjektLaden(id){
 a2ProjLaedt=true; a2ProjFehler="";
 a2Zeichnen();
 try{
  // cockpitProjectId ist die Projekt-ID, an der die bestehenden
  // Ladefunktionen und Rueckwege haengen. Sie wird hier gesetzt, damit ein
  // Wechsel in die klassische Ansicht mitten im Projekt dort ankommt.
  cockpitProjectId=Number(id);
  // COCKPIT_BEREICHE ist vollstaendig: js/63 und js/65 tragen Offerte und
  // Leistungen dort SELBST ein (jeweils direkt nach ihrer Definition). Sie
  // hier zusaetzlich zu laden hiesse, dieselbe Tabelle zweimal zu fragen -
  // genau das prueft die Gegenprobe A5 im Pruefstand nach.
  // Die Freigabe fuer die Offerte braucht hier ebenfalls keine eigene
  // Pruefung: loadProjectAngebote() gattert selbst VOR der Abfrage.
  await Promise.all(Object.keys(COCKPIT_BEREICHE).map(k=>COCKPIT_BEREICHE[k].load(id)));
  // Die Haken der Zuschnittliste. Ohne sie zeigte die Produktionsseite jedes
  // Teil als offen - also einen Fortschritt, den es so nicht gibt.
  if(typeof zeLaden==="function"&&a2Modul("zuschnitt")){
   await zeLaden(a2Mess().map(m=>m.id));
  }
 }catch(e){
  a2ProjFehler=(e&&e.message)||String(e);
 }
 a2ProjLaedt=false;
 a2Zeichnen();
}
// Nach einer Aenderung im Formular: dieselben Listen noch einmal holen.
async function a2ProjektNeuLaden(){
 if(a2Zustand.projektId)await a2ProjektLaden(a2Zustand.projektId);
 else a2Zeichnen();
}

// ---- Der Rahmen der Projektseite -----------------------------------------
function a2SeiteProjekt(){
 const p=a2Projekt(a2Zustand.projektId);
 if(!p)return '<div class="a2-leer">Dieses Projekt ist nicht (mehr) verfügbar.</div>';
 const reg=a2ProjRegister();
 if(!reg.some(r=>r.k===a2Zustand.reg))a2Zustand.reg="uebersicht";

 let html=`<div class="a2-register">${reg.map(r=>
  `<button type="button" class="${r.k===a2Zustand.reg?"ist-auf":""}"
    data-a2-reg="${esc(r.k)}">${esc(r.name)}</button>`).join("")}</div>`;

 if(a2ProjFehler){
  html+=`<div class="a2-hinweis a2-h-warnung"><b>Es konnte nicht alles geladen werden</b>
   ${esc(a2ProjFehler)}</div>`;
 }
 if(a2ProjLaedt)return html+'<div class="a2-leer">Lädt …</div>';

 if(a2Zustand.reg==="aufmass")   return html+a2RegAufmass(p);
 if(a2Zustand.reg==="produktion")return html+a2RegProduktion(p);
 if(a2Zustand.reg==="werkstatt") return html+a2RegWerkstatt(p);
 if(a2Zustand.reg==="ausmass")   return html+a2RegAusmass(p);
 if(a2Zustand.reg==="rapport")   return html+a2RegRapport(p);
 if(a2Zustand.reg==="mehr")      return html+a2RegMehr(p);
 return html+a2RegUebersicht(p);
}

// ---- Übersicht ------------------------------------------------------------
function a2RegUebersicht(p){
 const stand=a2AblaufStand();
 const stationen=a2StationenFuerFirma();
 const jetzt=stationen.findIndex(s=>!stand[s.k]);
 const ablauf='<div class="a2-ablauf">'+stationen.map((s,i)=>{
  const fertig=stand[s.k], dran=(i===jetzt);
  return `<div class="a2-ablauf-st ${a2AblaufKlasse(fertig,dran,i,jetzt)}">
   <div class="a2-ablauf-marke">${fertig?"✓":(dran?"●":"○")}</div>
   <div class="a2-ablauf-text">${esc(s.name)}</div></div>`;
 }).join("")+"</div>";

 // Was als Naechstes ansteht, entscheidet mwNaechsterSchritt() in js/44 -
 // dieselbe Quelle wie das Formular, die Aufgabenliste und die Werkstatt.
 const schritt=a2NaechsterSchrittHtml();

 const zeilen=[
  ["Auftrags-Nr.", p.order_no||"—"],
  ["Auftraggeber", p.customer||"—"],
  ["Adresse",      p.object||"—"],
  ["Projektname",  p.name||"—"],
  // Der Hinweis steht oben als eigener Kasten. Hier erscheint er nur,
  // WENN es einen gibt - eine Zeile "Hinweise: —" waere eine Aussage
  // ueber nichts.
  ...(p.hinweis&&String(p.hinweis).trim()?[["Hinweise",String(p.hinweis).trim()]]:[]),
  // v3.161: Wem das Projekt zugeteilt ist. Hier steht die Zeile IMMER -
  // anders als beim Hinweis ist "niemand zugeteilt" eine echte Auskunft:
  // sie erklaert, warum das Projekt bei manchen auf der Startseite steht
  // und bei anderen nicht.
  ["Zugeteilt an", a2ZuteilungText(p)]
 ];
 // Der Weg zur Zuschnittliste darf nicht laenger werden als in der
 // klassischen Ansicht. Dort sind es drei Klicks (Projekte, Projekt,
 // Material & Zuschnitt). Ohne diesen Knopf waeren es hier vier, weil man
 // erst das Register Produktion oeffnen muesste - der haeufigste Weg des
 // Tages waere durch die neue Ansicht einen Griff teurer geworden.
 const schnell=a2Modul("material")
  ? `<div class="a2-knopf-reihe" style="margin:0 0 12px">
      <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="matzu">
       🧱 Material &amp; Zuschnitt</button></div>`
  : "";
 // v3.160: Die freie Notiz zum Projekt - direkt unter dem Ablauf, damit
 // sie gelesen wird, bevor jemand losfaehrt. Gibt es keine, steht hier
 // nichts: ein leerer Kasten "Hinweise" waere schlechter als gar keiner.
 const hinweis=(p.hinweis&&String(p.hinweis).trim())
  ? `<div class="a2-hinweis a2-h-merk"><b>📌 Wichtige Hinweise</b>
     ${esc(String(p.hinweis).trim())}</div>`
  : "";
 return `<div class="a2-karte">${ablauf}</div>
  ${schritt}
  ${hinweis}
  ${schnell}
  <div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Stand</h2></div>
   <div class="a2-zahlen">
    <div class="a2-zahl a2-z-blau"><b>${a2Mess().length}</b><span>Massaufnahmen</span></div>
    <div class="a2-zahl a2-z-gruen"><b>${a2Am().length}</b><span>Ausmasse</span></div>
    <div class="a2-zahl a2-z-orange"><b>${a2Rep().length}</b><span>Rapporte</span></div>
   </div>
  </div>
  <div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Stammdaten</h2></div>
   <div class="a2-karte"><dl class="a2-daten">${zeilen.map(([k,v])=>
     `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <div class="a2-knopf-reihe">
     <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="stammdaten">
      ✏️ Stammdaten bearbeiten</button></div>
   </div>
  </div>`;
}
// v3.161: Die Zuteilung als Satz. Steht niemand drin, wird gesagt, was
// dann gilt (der Ersteller) - "niemand" allein liesse offen, bei wem das
// Projekt dann auf der Startseite erscheint.
function a2ZuteilungText(p){
 const ids=(typeof projektZugeteilt==="function")?projektZugeteilt(p):[];
 if(ids.length){
  const namen=ids.map(id=>a2PersonName(id)||"Unbekannter Benutzer");
  return namen.join(", ");
 }
 const ersteller=a2PersonName(p&&p.created_by);
 return ersteller?("niemand – es gilt "+ersteller+" (hat es angelegt)")
                 :"niemand";
}

// Der eine naechste Schritt des Projekts. Er wird nicht hier abgeleitet -
// js/44 entscheidet das fuer die ganze App an einer Stelle.
function a2NaechsterSchrittHtml(){
 if(typeof mwSchrittSchluessel!=="function"||typeof MW_SCHRITTE==="undefined")return "";
 const offen=a2Mess().filter(m=>{
  const k=mwSchrittSchluessel(m);
  return k&&k!=="fertig";
 });
 if(!offen.length)return "";
 const rang={erneut_freigeben:0,ruesten:1,freigeben:2,zuweisen:3,monteur:4,montieren:5,abschliessen:6};
 offen.sort((a,b)=>(rang[mwSchrittSchluessel(a)]??9)-(rang[mwSchrittSchluessel(b)]??9));
 const m=offen[0], k=mwSchrittSchluessel(m);
 const s=MW_SCHRITTE[k];
 if(!s)return "";
 return `<div class="a2-auf a2-auf-${esc(s.farbe)}">
  <div class="a2-auf-schritt">Als Nächstes</div>
  <div class="a2-auf-titel">${esc(s.kurz)}</div>
  <div class="a2-auf-zusatz">${esc(a2MessTitel(m))}${offen.length>1
    ?" · und "+a2Anzahl(offen.length-1,"weitere Massaufnahme","weitere Massaufnahmen"):""}</div>
  <div class="a2-knopf-reihe">
   <button type="button" class="a2-knopf a2-knopf-klein a2-k-blau"
     data-a2-meas="${esc(m.id)}">Massaufnahme öffnen</button></div>
 </div>`;
}
function a2MessTitel(m){
 const art=(typeof MEAS_TYPE_LABELS!=="undefined"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=String(m.title||"").trim();
 return t?art+" · "+t:art;
}

// ---- Aufmass --------------------------------------------------------------
function a2RegAufmass(p){
 const liste=a2Mess();
 let html=`<div class="a2-knopf-reihe" style="margin:0 0 12px">
  <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="neuemeas">
   ＋ Neue Massaufnahme</button></div>`;
 if(!liste.length)return html+'<div class="a2-leer">Noch keine Massaufnahme in diesem Projekt.</div>';
 html+=`<div class="a2-abschnitt-kopf"><h2>${esc(a2Anzahl(liste.length,"Massaufnahme","Massaufnahmen"))}</h2></div>`;
 return html+'<div class="a2-liste-zwei">'+liste.map(m=>{
  const badge=(typeof mwBadgeFuerListe==="function")?mwBadgeFuerListe(m):"";
  const art=(typeof MEAS_TYPE_LABELS!=="undefined"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
  const t=String(m.title||"").trim();
  return `<button type="button" class="a2-zeile" data-a2-meas="${esc(m.id)}">
   <span class="a2-zeile-text"><b>${esc(art)}</b>
    <span>${esc([t,a2Datum(m.date)].filter(Boolean).join(" · ")||"—")}</span></span>
   ${badge?`<span class="a2-badge">${badge}</span>`:""}
   <span class="a2-zeile-pfeil">›</span></button>`;
 }).join("")+"</div>";
}

// ---- Produktion -----------------------------------------------------------
// "Ich moechte dieses Teil produzieren" statt "ich muss das Modul Zuschnitt
// oeffnen". Deshalb steht hier die Massaufnahme mit ihrem Zuschnitt-
// Fortschritt, und der Zuschnitt ist der Knopf daran.
//
// Die Zahlen kommen aus zeStand()/pmatStuecke() (js/56, js/48) - denselben
// Funktionen, die die Seite "Material & Zuschnitt" und die Werkstatt
// verwenden. Hier wird kein Stueck ein zweites Mal gezaehlt.
function a2RegProduktion(p){
 const liste=a2Mess();
 let html=`<div class="a2-knopf-reihe" style="margin:0 0 12px">
  <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="matzu">
   🧱 Material &amp; Zuschnitt öffnen</button></div>`;
 if(!liste.length)return html+'<div class="a2-leer">Ohne Massaufnahme gibt es nichts zu produzieren.</div>';
 if(typeof zeStand!=="function"||!a2Modul("zuschnitt")){
  return html+`<div class="a2-leer">Das Untermodul „Zuschnitt und Abhaken“ ist
   ausgeschaltet. Material und Zuschnitt stehen auf der Seite oben.</div>`;
 }
 const gesamt=(typeof zeStandListe==="function")?zeStandListe(liste):null;
 if(gesamt&&gesamt.gesamt){
  html+=a2FortschrittHtml(gesamt.erledigt,gesamt.gesamt,"Zuschnitt im ganzen Projekt");
 }
 const mitPlan=liste.filter(m=>zeStand(m).gesamt>0);
 if(!mitPlan.length){
  return html+`<div class="a2-leer">Noch keine Massaufnahme dieses Projekts hat
   eine Zuschnittliste. Sie entsteht, sobald die Masse vollständig sind.</div>`;
 }
 html+=`<div class="a2-abschnitt-kopf"><h2>Teile je Massaufnahme</h2></div>`;
 return html+mitPlan.map(m=>{
  const st=zeStand(m);
  return `<div class="a2-karte">
   <div class="a2-karte-titel">${esc(a2MessTitel(m))}</div>
   ${a2FortschrittHtml(st.erledigt,st.gesamt,"Zugeschnitten")}
   ${st.veraltet?`<div class="a2-hinweis a2-h-warnung" style="margin:9px 0 0">
     <b>${esc(a2Anzahl(st.veraltet,"Haken passt","Haken passen"))} nicht mehr zum Mass</b>
     Die Zuschnittliste hat sich nach dem Abhaken geändert.</div>`:""}
   <div class="a2-knopf-reihe">
    <button type="button" class="a2-knopf a2-knopf-klein a2-k-grau" data-a2-tu="matzu">
     Zuschnitt öffnen</button>
    <button type="button" class="a2-knopf a2-knopf-klein a2-k-grau" data-a2-meas="${esc(m.id)}">
     Massaufnahme</button>
   </div></div>`;
 }).join("");
}
function a2FortschrittHtml(fertig,gesamt,text){
 const prozent=gesamt?Math.round(fertig/gesamt*100):0;
 return `<div class="a2-fort">
  <div class="a2-fort-kopf"><span>${esc(text)}</span>
   <span><b>${fertig}</b> von ${gesamt} Stück · ${prozent}%</span></div>
  <div class="a2-balken${prozent>=100?" ist-fertig":""}"><i style="width:${prozent}%"></i></div>
 </div>`;
}

// ---- Werkstatt ------------------------------------------------------------
// Was in diesem Projekt zu ruesten und zu montieren ist. Die Werkstatt als
// Ganzes (alle Projekte) bleibt der bestehende Arbeitsplatz - hier steht nur
// der Ausschnitt dieses Projekts.
function a2RegWerkstatt(p){
 const liste=a2Mess();
 const gruppen=[
  {titel:"Zu rüsten",   status:["zu_ruesten"],  farbe:"rot"},
  {titel:"Gerüstet",    status:["geruestet"],   farbe:"orange"},
  {titel:"Zu montieren",status:["zu_montieren"],farbe:"orange"},
  {titel:"Montiert",    status:["montiert"],    farbe:"gruen"}
 ];
 let html=`<div class="a2-knopf-reihe" style="margin:0 0 12px">
  <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="werkstatt">
   🔧 Ganze Werkstatt öffnen</button></div>`;
 const offen=gruppen.filter(g=>liste.some(m=>g.status.indexOf(m.workflow_status)>=0));
 if(!offen.length){
  return html+`<div class="a2-leer">In diesem Projekt wartet nichts in der
   Werkstatt. Massaufnahmen erscheinen hier, sobald sie freigegeben und
   jemandem zugeteilt sind.</div>`;
 }
 return html+offen.map(g=>{
  const drin=liste.filter(m=>g.status.indexOf(m.workflow_status)>=0);
  return `<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>${esc(g.titel)}</h2>
    <span class="a2-marke a2-m-${esc(g.farbe)}">${drin.length}</span></div>`
   +drin.map(m=>`<button type="button" class="a2-zeile" data-a2-meas="${esc(m.id)}">
     <span class="a2-zeile-text"><b>${esc(a2MessTitel(m))}</b>
      <span>${esc(a2ZugeteiltText(m))}</span></span>
     <span class="a2-zeile-pfeil">›</span></button>`).join("")
   +"</div>";
 }).join("");
}
function a2ZugeteiltText(m){
 const wer=id=>{
  if(!id||typeof allProfiles==="undefined")return "";
  const pr=allProfiles.find(x=>x.id===id);
  return pr?`${pr.first_name||""} ${pr.last_name||""}`.trim():"";
 };
 const r=wer(m.ruester_id), mo=wer(m.monteur_id);
 const t=[r?"Rüster: "+r:"",mo?"Monteur: "+mo:""].filter(Boolean).join(" · ");
 return t||"Niemand zugeteilt";
}

// ---- Ausmass --------------------------------------------------------------
function a2RegAusmass(p){
 const liste=a2Am();
 let html=`<div class="a2-knopf-reihe" style="margin:0 0 12px">
  <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="neuesam">
   ＋ Neues Ausmass</button></div>`;
 if(!liste.length)return html+'<div class="a2-leer">Noch kein Ausmass in diesem Projekt.</div>';
 html+=`<div class="a2-abschnitt-kopf"><h2>${esc(a2Anzahl(liste.length,"Ausmass","Ausmasse"))}</h2></div>`;
 return html+'<div class="a2-liste-zwei">'+liste.map(a=>{
  // COCKPIT_AM_TYPE_LABELS (js/24) ist die vorhandene Beschriftungsquelle.
  const art=(typeof COCKPIT_AM_TYPE_LABELS==="object"&&COCKPIT_AM_TYPE_LABELS[a.type])||a.type||"Ausmass";
  const t=String(a.title||"").trim();
  return `<button type="button" class="a2-zeile" data-a2-am="${esc(a.id)}">
   <span class="a2-zeile-text"><b>${esc(art)}</b>
    <span>${esc([t,a2Datum(a.date)].filter(Boolean).join(" · ")||"—")}</span></span>
   <span class="a2-zeile-pfeil">›</span></button>`;
 }).join("")+"</div>";
}

// ---- Mehr -----------------------------------------------------------------
// Was zum Projekt gehoert, aber nicht im taeglichen Ablauf steht: Offerte,
// Leistungen, Regierapporte, Dateien, Verlauf.
function a2RegMehr(p){
 let html="";
 if(a2KnopfSichtbar("cockpitStandAngeboteZeile")){
  const ang=a2Ang();
  html+=a2MehrBlockHtml("🧾 Offerten",ang.length,
   ang.map(a=>`<button type="button" class="a2-zeile" data-a2-ang="${esc(a.id)}">
     <span class="a2-zeile-text"><b>${esc(a.title||"Ohne Bezeichnung")}</b>
      <span>${esc(a2Datum(a.date)||"—")}</span></span>
     <span class="a2-zeile-pfeil">›</span></button>`).join(""),
   "neueang","＋ Neue Offerte","Noch keine Offerte.");
 }
 const lei=a2Lei();
 html+=a2MehrBlockHtml("🧩 Leistungen",lei.length,
  lei.map(l=>{
   const zusatz=[l.angebot_position?"Offerte-Pos. "+l.angebot_position:"Zusatzleistung",
                 l.menge?String(l.menge)+" "+(l.einheit||""):""].filter(Boolean).join(" · ");
   return `<button type="button" class="a2-zeile" data-a2-lei="${esc(l.id)}">
    <span class="a2-zeile-text"><b>${esc(l.bezeichnung||"Ohne Bezeichnung")}</b>
     <span>${esc(zusatz)}</span></span>
    <span class="a2-zeile-pfeil">›</span></button>`}).join(""),
  "neuelei","＋ Neue Leistung","Noch keine Leistung erfasst.");

 // Dateien und Verlauf bleiben im Cockpit: beides sind Listen mit eigenen
 // Hochlade- und Vorschauwegen, die hier nur nachgebaut waeren.
 html+=`<div class="a2-abschnitt">
  <div class="a2-abschnitt-kopf"><h2>Weiteres</h2></div>
  <button type="button" class="a2-zeile" data-a2-tu="cockpit">
   <span class="a2-zeile-nr">📎</span>
   <span class="a2-zeile-text"><b>Dateien, Fotos und Verlauf</b>
    <span>Öffnet die vollständige Projektansicht</span></span>
   <span class="a2-zeile-pfeil">›</span></button></div>`;
 return html;
}
// ---- Regierapport ---------------------------------------------------------
// Seit v3.156 ein eigenes Register. Derselbe Block wie zuvor unter "Mehr",
// nur an der Stelle, an der man ihn sucht. Der Knopf zum Anlegen steht gross
// obenan: einen Rapport schreibt man, man sucht ihn nicht.
function a2RegRapport(p){
 const rep=a2Rep();
 return `<div class="a2-knopf-reihe" style="margin:0 0 12px">
   <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-a2-tu="neuerrapport">
    ＋ Neuer Regierapport</button></div>`
  +`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>${esc(a2Anzahl(rep.length,"Regierapport","Regierapporte"))}</h2></div>
   ${rep.length?rep.map(r=>{
     // v3.165: dieselbe Zusammenfassung wie im Cockpit und in der
     // Rapport-Uebersicht - eine Quelle, siehe rapportKurz in js/01.
     const worum=(typeof rapportKurz==="function")?rapportKurz(r):"";
     return `<button type="button" class="a2-zeile" data-a2-rep="${esc(r.id)}">
     <span class="a2-zeile-text"><b>${esc(a2Datum(r.date)||"Ohne Datum")}</b>
      <span>${esc([r.order_no?"Auftrag "+r.order_no:"",r.customer||""].filter(Boolean).join(" · ")||"—")}</span>
      ${worum?`<span class="rapport-kurz">${esc(worum)}</span>`:""}</span>
     <span class="a2-zeile-pfeil">›</span></button>`}).join("")
    :'<div class="a2-leer">Noch kein Regierapport.</div>'}
  </div>`;
}

function a2MehrBlockHtml(titel,anzahl,zeilen,neuTu,neuText,leerText){
 return `<div class="a2-abschnitt">
  <div class="a2-abschnitt-kopf"><h2>${esc(titel)}</h2>
   <span class="a2-marke a2-m-grau">${anzahl}</span></div>
  ${zeilen||`<div class="a2-leer">${esc(leerText)}</div>`}
  <div class="a2-knopf-reihe">
   <button type="button" class="a2-knopf a2-knopf-klein a2-k-grau" data-a2-tu="${esc(neuTu)}">
    ${esc(neuText)}</button></div>
 </div>`;
}


// ---- Einen Eintrag oeffnen ------------------------------------------------
// Immer mit der ECHTEN Zeile aus dem Zwischenspeicher - dieselbe, die auch
// das Cockpit oeffnen wuerde. Eine Zeile, die dort nicht steht, gibt es fuer
// diesen Benutzer nicht (RLS); dann passiert nichts, statt eine ID an das
// Formular zu reichen, die es nicht auflösen kann.
function a2Oeffne(art,id){
 const finde=liste=>liste.find(x=>String(x.id)===String(id));
 if(art==="meas"){
  const m=finde(a2Mess()); if(!m||typeof openMeasurement!=="function")return;
  measEditReturnTo="a2Projekt";
  openMeasurement(m);
  return;
 }
 if(art==="am"){
  const a=finde(a2Am()); if(!a||typeof openAusmass!=="function")return;
  amEditReturnTo="a2Projekt";
  openAusmass(a);
  return;
 }
 if(art==="ang"){
  const a=finde(a2Ang()); if(!a||typeof openAngebot!=="function")return;
  openAngebot(a);
  angEditReturnTo="a2Projekt";     // openAngebot setzt es selbst - danach gilt unseres
  return;
 }
 if(art==="lei"){
  const l=finde(a2Lei()); if(!l||typeof openLeistung!=="function")return;
  openLeistung(l);
  leiEditReturnTo="a2Projekt";
  return;
 }
 if(art==="rep"){
  const r=finde(a2Rep()); if(!r||typeof openReport!=="function")return;
  openReport(r,"a2Projekt");
  // js/09 blendet den Zurueck-Knopf nur fuer das Cockpit ein. Aus der
  // Projektseite gilt dasselbe - ohne ihn gaebe es aus dem Rapport keinen
  // Weg zurueck ausser ueber die Zurueck-Taste des Geraets.
  if($("backFromReportEdit"))$("backFromReportEdit").hidden=false;
  return;
 }
}

// ---- Etwas Neues anlegen --------------------------------------------------
// Die Typ-Auswahl ist dieselbe wie ueberall sonst. a2TypWahl merkt sich nur,
// dass sie aus der neuen Projektseite heraus geoeffnet wurde - genau das
// Muster, das js/24 mit cockpitTypWahl fuer das Cockpit verwendet. Die
// bestehenden Handler laufen unveraendert zuerst; der hier ergaenzt danach
// Projekt und Rueckziel.
let a2TypWahl=null;
function a2NeuerEintrag(was){
 const id=a2Zustand.projektId;
 if(!id)return;
 if(was==="meas"&&$("measTypeChooserModal")){a2TypWahl="meas";$("measTypeChooserModal").hidden=false;return}
 if(was==="am"&&$("amTypeChooserModal")){a2TypWahl="am";$("amTypeChooserModal").hidden=false;return}
 if(was==="rep"&&typeof cockpitNeuerRapport==="function"){
  cockpitNeuerRapport();              // setzt Projekt, Vorbefuellung und Zurueck-Knopf
  reportReturnTo="a2Projekt";         // danach gilt unser Rueckziel
  return;
 }
 if(was==="ang"&&typeof newAngebot==="function"){newAngebot();angEditReturnTo="a2Projekt";return}
 if(was==="lei"&&typeof newLeistung==="function"){newLeistung();leiEditReturnTo="a2Projekt";return}
}
(function a2TypWahlAnschluss(){
 const meas=$("measTypeChooserModal"), am=$("amTypeChooserModal");
 if(meas){
  meas.addEventListener("click",e=>{
   if(!e.target.closest("[data-choose-meas-type]")||a2TypWahl!=="meas")return;
   a2TypWahl=null;
   measEditReturnTo="a2Projekt";
   if(typeof setMeasProjectField==="function")setMeasProjectField(Number(a2Zustand.projektId));
   if(typeof updateMeasFormTitle==="function")updateMeasFormTitle();
  });
 }
 if(am){
  am.addEventListener("click",e=>{
   if(!e.target.closest("[data-choose-am-type]")||a2TypWahl!=="am")return;
   a2TypWahl=null;
   amEditReturnTo="a2Projekt";
   if(typeof setAmProjectField==="function")setAmProjectField(Number(a2Zustand.projektId));
   if(typeof updateAmFormTitle==="function")updateAmFormTitle();
  });
 }
 // Abbrechen: js/09 zeigt dann die Uebersicht aller Massaufnahmen. Aus der
 // Projektseite heraus ist das der falsche Ort - sie wird wieder zugemacht,
 // die Projektseite steht ohnehin noch da (sie wurde nie ausgeblendet).
 const ab=(knopf,welches,modal)=>{
  if(!$(knopf))return;
  $(knopf).addEventListener("click",()=>{
   if(a2TypWahl!==welches)return;
   a2TypWahl=null;
   if($(modal))$(modal).hidden=true;
  });
 };
 ab("cancelMeasTypeChooser","meas","measurementsModal");
 ab("cancelAmTypeChooser","am","ausmassModal");
})();

// ---- Rueckwege aus den Formularen ----------------------------------------
// Fuenf bestehende Funktionen entscheiden, wohin es nach dem Schliessen
// eines Formulars geht. Sie werden umhuellt statt veraendert: steht dort
// unser Rueckziel, fuehrt der Weg auf die Projektseite - und die Listen
// werden neu geholt, denn im Formular kann sich etwas geaendert haben.
(function a2Rueckwege(){
 if(typeof measEditZurueck==="function"){
  const vorher=measEditZurueck;
  measEditZurueck=async function(){
   if(a2Aktiv()&&measEditReturnTo==="a2Projekt"){
    measEditReturnTo="measurementsModal";
    await a2ProjektNeuLaden();
    return;
   }
   return vorher.apply(this,arguments);
  };
 }
 if(typeof amEditZurueck==="function"){
  const vorher=amEditZurueck;
  amEditZurueck=async function(){
   if(a2Aktiv()&&amEditReturnTo==="a2Projekt"){
    amEditReturnTo="ausmassModal";
    await a2ProjektNeuLaden();
    return;
   }
   return vorher.apply(this,arguments);
  };
 }
 if(typeof reportZurueck==="function"){
  const vorher=reportZurueck;
  reportZurueck=async function(){
   if(a2Aktiv()&&reportReturnTo==="a2Projekt"){
    $("reportScreen").hidden=true;
    reportReturnTo="reportsModal";
    isDirty=false;
    await a2ProjektNeuLaden();
    return;
   }
   return vorher.apply(this,arguments);
  };
 }
 if(typeof angEditZurueck==="function"){
  const vorher=angEditZurueck;
  angEditZurueck=async function(){
   if(a2Aktiv()&&angEditReturnTo==="a2Projekt"){
    angEditReturnTo="cockpitAngebote";
    await a2ProjektNeuLaden();
    return;
   }
   return vorher.apply(this,arguments);
  };
 }
 if(typeof leiEditZurueck==="function"){
  const vorher=leiEditZurueck;
  leiEditZurueck=async function(){
   if(a2Aktiv()&&leiEditReturnTo==="a2Projekt"){
    leiEditReturnTo="cockpitLeistungen";
    if($("leistungEditModal"))$("leistungEditModal").hidden=true;
    await a2ProjektNeuLaden();
    return;
   }
   return vorher.apply(this,arguments);
  };
 }
})();

// ===========================================================================
// Anschluss an die bestehende App
// ===========================================================================
// Drei bestehende Funktionen werden umhuellt statt veraendert: so steht in
// js/03, js/45 und js/24 keine Zeile ueber diese Ansicht, und die klassische
// Ansicht laeuft auch dann unveraendert weiter, wenn diese Datei fehlt.
(function a2Anschluss(){
 // Nach der Anmeldung und bei jeder Rueckkehr auf die Startseite.
 if(typeof showStart==="function"){
  const vorher=showStart;
  showStart=function(){ vorher.apply(this,arguments); a2Anwenden(); a2Zeichnen(); };
 }
 // Das Firmenlogo liegt in einem privaten Speicher und wird erst nach dem
 // Zeichnen in eine signierte Adresse aufgeloest (js/05, asynchron). Ohne
 // diesen Beobachter bliebe die Markenzeile bis zum naechsten Neuzeichnen
 // leer - also meist den ganzen Besuch lang.
 if(typeof MutationObserver==="function"&&$("startLogo")){
  new MutationObserver(()=>{ if(a2Aktiv())a2Zeichnen() })
   .observe($("startLogo"),{attributes:true,attributeFilter:["src","hidden"]});
 }
 // Sobald die Aufgabenliste neu geladen wurde (js/45 zeichnet dann die
 // klassische Karte - hier kommt die neue Ansicht dazu).
 if(typeof renderAufgaben==="function"){
  const vorher=renderAufgaben;
  renderAufgaben=function(){ vorher.apply(this,arguments); if(a2Aktiv())a2Zeichnen(); };
 }
 // Sobald die Listen eines Projekts geladen sind, steht fest, wo das Projekt
 // im Ablauf steht - erst dann laesst sich die Ablaufleiste zeichnen.
 if(typeof loadProjectCockpitData==="function"){
  const vorher=loadProjectCockpitData;
  loadProjectCockpitData=async function(){
   const r=await vorher.apply(this,arguments);
   a2AblaufZeichnen();
   return r;
  };
 }
})();

// Wurde das Cockpit aus der neuen Ansicht heraus geoeffnet? Dann fuehrt sein
// Zurueck-Knopf auch dorthin zurueck. Ohne das landete man in der
// KLASSISCHEN Projektliste - dem Schirm, den der Knopf seit je oeffnet,
// weil das bis v3.149 der einzige Weg ins Cockpit war.
let a2AusNeuerAnsicht=false;
(function a2CockpitZurueck(){
 const knopf=$("cockpitBack");
 if(!knopf)return;
 const vorher=knopf.onclick;
 knopf.onclick=function(ereignis){
  if(a2Aktiv()&&a2AusNeuerAnsicht){
   a2AusNeuerAnsicht=false;
   $("projectCockpitModal").hidden=true;
   // #startScreen wurde beim Oeffnen nie ausgeblendet - die neue Ansicht
   // steht also schon da. Die Listen werden trotzdem neu geholt: im Cockpit
   // kann sich etwas geaendert haben (Stammdaten, eine geloeschte Zeile).
   $("startScreen").hidden=false;
   if(a2Zustand.seite==="projekt")a2ProjektNeuLaden(); else a2Zeichnen();
   return;
  }
  // Sonst unveraendert der bisherige Weg (zurueck in die Projektliste).
  if(typeof vorher==="function")return vorher.call(this,ereignis);
 };
 // Der Sprung auf die Startseite beendet den Ausflug ebenfalls.
 const start=$("cockpitStart");
 if(start){
  const vorherStart=start.onclick;
  start.onclick=function(ereignis){
   a2AusNeuerAnsicht=false;
   if(typeof vorherStart==="function")return vorherStart.call(this,ereignis);
  };
 }
})();

// ===========================================================================
// Ablaufleiste im Projekt
// ===========================================================================
// Die eine Frage, die beim Oeffnen eines Projekts zuerst kommt: WO STEHT DAS?
// Der Arbeitsstand darunter zaehlt auf, WAS vorhanden ist - die Leiste sagt,
// wie weit es ist. Sie rechnet nichts Neues aus, sondern liest die Listen,
// die das Cockpit soeben geladen hat.
const A2_STATIONEN=[
 {k:"offerte",     name:"Offerte"},
 {k:"massaufnahme",name:"Mass­aufnahme"},
 {k:"freigabe",    name:"Freigabe"},
 {k:"ruesten",     name:"Rüsten"},
 {k:"montage",     name:"Montage"},
 {k:"ausmass",     name:"Ausmass"}
];
// Wie weit eine einzelne Massaufnahme ist. Die Zustandsnamen stammen aus
// js/44-workflow.js; ein unbekannter Wert zaehlt als "noch nicht angefangen"
// statt die ganze Leiste zum Absturz zu bringen.
const A2_WF_RANG={in_bearbeitung:0,freigegeben:1,zu_ruesten:1,geruestet:2,
                  zu_montieren:2,montiert:3,abgeschlossen:3};
function a2MessRang(m){
 // Eine verfallene Freigabe ist keine Freigabe - die Massaufnahme faellt
 // dadurch zurueck, genau wie im Arbeitsablauf selbst.
 if(m&&m.freigabe_verfallen)return 0;
 const r=A2_WF_RANG[m&&m.workflow_status];
 return (typeof r==="number")?r:0;
}
// Die drei Listen des Cockpits. Sie sind mit "let" auf oberster Ebene
// angelegt (js/01, js/63) und stehen deshalb NICHT als window.name zur
// Verfuegung - ein Zugriff ueber window[...] waere hier immer leer und die
// Ablaufleiste stuende dauerhaft auf der ersten Station. Deshalb werden sie
// beim Namen genannt; typeof faengt ab, dass eine davon fehlt (die Offerte
// gibt es nur mit Freigabe).
function a2Mess(){
 return (typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))
  ?projectMeasurementsCache:[];
}
function a2Ang(){
 return (typeof projectAngeboteCache!=="undefined"&&Array.isArray(projectAngeboteCache))
  ?projectAngeboteCache:[];
}
function a2Am(){
 return (typeof projectAusmassCache!=="undefined"&&Array.isArray(projectAusmassCache))
  ?projectAusmassCache:[];
}
// Welche Stationen ueberhaupt gezeigt werden. Ist der Arbeitsablauf
// firmenweit aus, gibt es die drei mittleren Stationen nicht - dann waere
// eine Leiste mit ewig offenen Schritten eine Luege.
function a2StationenFuerFirma(){
 const wf=(typeof workflowAktiv==="undefined")||workflowAktiv!==false;
 const offerte=a2KnopfSichtbar("cockpitStandAngeboteZeile");
 return A2_STATIONEN.filter(s=>{
  if(s.k==="offerte")return offerte;
  if(s.k==="freigabe"||s.k==="ruesten"||s.k==="montage")return wf;
  return true;
 });
}
function a2AblaufStand(){
 const mess=a2Mess(), ang=a2Ang(), am=a2Am();
 // Ohne Massaufnahmen ist keine der drei Ablauf-Stationen erreicht. Ohne
 // diese Zeile waere jede von ihnen "fertig" - eine leere Menge erfuellt
 // jede Bedingung, und das Projekt stuende faelschlich auf "montiert".
 const alleAb=r=>mess.length>0&&mess.every(m=>a2MessRang(m)>=r);
 return {
  offerte:ang.length>0,
  massaufnahme:mess.length>0,
  freigabe:alleAb(1),
  ruesten:alleAb(2),
  montage:alleAb(3),
  ausmass:am.length>0
 };
}
// Die Linie ZWISCHEN zwei Stationen zeigt den Weg, nicht den Zustand der
// einzelnen Station. Sie ist deshalb nur bis zur aktuellen Station gruen -
// sonst faerbte eine spaetere, schon erledigte Station (etwa ein bereits
// erfasstes Ausmass) die Strecke davor gruen und behauptete damit, alles
// dazwischen sei erledigt. Der Haken der spaeteren Station bleibt gruen; er
// stimmt ja.
function a2AblaufKlasse(fertig,dran,i,jetzt){
 return (fertig?"ist-fertig":(dran?"ist-jetzt":""))
  +((jetzt>=0&&i>jetzt)?" ist-spaeter":"");
}
function a2AblaufZeichnen(){
 const box=$("a2Ablauf");
 if(!box)return;
 if(!a2Aktiv()){box.hidden=true;box.innerHTML="";return}
 const stationen=a2StationenFuerFirma();
 const stand=a2AblaufStand();
 // Die aktuelle Station ist die erste, die noch nicht fertig ist. Ist alles
 // fertig, ist keine "dran" - dann sind schlicht alle abgehakt.
 const jetzt=stationen.findIndex(s=>!stand[s.k]);
 box.hidden=false;
 box.innerHTML='<div class="a2-ablauf">'+stationen.map((s,i)=>{
  const fertig=stand[s.k], dran=(i===jetzt);
  const kl=a2AblaufKlasse(fertig,dran,i,jetzt);
  const z=fertig?"✓":(dran?"●":"○");
  return `<div class="a2-ablauf-st ${kl}">
   <div class="a2-ablauf-marke">${z}</div>
   <div class="a2-ablauf-text">${esc(s.name)}</div></div>`;
 }).join("")+"</div>";
}

// Beim Laden der Seite gilt, was zuletzt gewaehlt wurde. Gezeichnet wird
// erst nach der Anmeldung (ueber showStart) - vorher gibt es keine Daten.
a2Anwenden();
