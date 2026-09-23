"use strict";
// ===========================================================================
// Dachfenstereinfassung - Erfassung in sieben Registern
// ===========================================================================
// Gleiches Prinzip wie die Kamineinfassung (js/37): eine senkrechte Aufbordung
// wird eingefasst, Deckungsmaterial und Lattenabstand bestimmen die Anzahl
// Bleilappen, Zuschnitt/PDF laufen ueber dieselben gemeinsamen Bausteine
// (js/29, js/33, js/35). Die Laengsmasse sind - auf ausdruecklichen Wunsch
// des Anwenders - GENAU GLEICH vermasst wie bei der Kamineinfassung: A, B, C,
// D und eine Ueberlappung (Knick), aus der sich die Laenge ergibt
// (Laenge = B + C - Knick, wie kamaKaminLaenge() in js/37).
//
// GRUNDLAGE: Dachfenstereinfassung_Schnitt.dxf
// Die Datei enthaelt keinen Text und keine Bemassungs-Beschriftung, nur Linien
// und 16 Bemassungen (Wert bereits masstabsbereinigt). Auf die Dachlinie
// projiziert (t = laengs des Dachs, h = senkrecht darueber, NULL = Dachlinie -
// siehe Kopf von js/37 fuer dieselbe Projektion) ergibt sich fuer EIN
// Seitenteil, von vorne (t=0) nach hinten:
//
//   Vorderkant Aufbordung   t=0            h  0 -> 80   (senkrecht + Saum/
//                                                         Ruecklauf, siehe unten)
//   A  (Bemassung)          t -183 -> 0                 (Referenz auf
//                                                         Deckmaterial bis hierher)
//   Knick, Vorderkant       t=183.1 ab Vorderkant Aufbordung
//   B  (Bemassung)          t=0 -> 250     (Vorderkant Aufbordung bis
//                                            HINTERKANT Knick)
//   Knick, Hinterkant       t=250 ab Vorderkant Aufbordung (gestrichelt -
//                                            verdeckte Kante wie bei js/37)
//   C  (Bemassung)          t=130 -> 600   (VORDERKANT Knick, t=130, bis
//                                            Hinterkant Aufbordung, t=600 -
//                                            eucl. 469.9, siehe unten)
//   Hinterkant Aufbordung   t=600          h steigt via Trapezform auf 120
//                                            und faellt senkrecht auf 0
//   D  (Bemassung)          t=600 -> 800   (Hinterkant Aufbordung bis
//                                            hinten unter Deckmaterial)
//
// Gegenprobe: B + C - Knick = 250 + 469.885 - 120 = 599.885 ~ 600 mm - GENAU
// die Laenge der durchgezeichneten Dachlinie in der Vorlage (600.00 mm). Das
// bestaetigt die Zuordnung zweifelsfrei (v3.55).
//
// Die Zuordnung wurde mit dem Anwender geklaert:
//   * v3.52: ALLE Linien zusammen sind die EINE senkrechte Aufbordung - wie
//     bei der Kamineinfassung, mit einer Stufe (Saum vorne) und einer bewusst
//     TRAPEZFOERMIGEN Kopfform hinten statt eines einfachen Rechtecks (Absicht,
//     nicht auszugleichen). Zwei separat erfassbare Seiten (links/rechts) wie
//     bei der Kamineinfassung ueber "getrennt".
//   * v3.55: die Laengsmasse sind GENAU GLEICH vermasst wie bei der
//     Kamineinfassung - A, B, C, D und die Ueberlappung (Knick), keine
//     einzelne "Laenge" mehr. Der Knick liegt zwei Drittel vorne im Lauf
//     (t=183..433 ab Referenz), nicht am hinteren Eck wie zunaechst
//     angenommen - die vormals dort modellierte "Ueberlappung waagrecht/
//     senkrecht" (10/15 mm) entfaellt ersatzlos, sie war eine Fehldeutung
//     eines kleinen Rand-Details, nicht die eigentliche Ueberlappung.
//   * Die genaue Aufteilung in Vorderteil/Hinterteil/Seitenteile und die
//     Feldnamen A-D/Knick sind dieselbe Modellierung wie in js/37 - keine
//     Uebernahme wortwoertlicher Bezeichnungen aus der Vorlage, denn die hat
//     keine.
//   * v3.60: E (Aufbug hinten) und Anreiff (vorne) direkt aus den LINE- und
//     DIMENSION-Entitaeten der Vorlage vermessen (Projektion wie oben, in
//     REALEN mm nach Multiplikation mit dem gefundenen Massstab 3.0 - die
//     rohen Koordinaten liegen im Papierformat 1:3, waehrend die DIMENSION-
//     Werte (Gruppencode 42) bereits echte mm sind). Ergebnis, GENAU
//     entgegen der ersten Annahme (v3.59, senkrechter Haken beidseits):
//       - E bleibt SENKRECHT (90 Grad, wie die Kamineinfassung), sein
//         Umschlag ist aber eine EINZELNE 45-Grad-Schraege von der Spitze
//         zurueck Richtung Dach (kein rechtwinkliger Haken).
//       - Der Anreiff ist KEIN senkrechter Aufbug, sondern eine FLACHE,
//         25 Grad nach UNTEN (unters Dach) abgewinkelte Kante - seine
//         Spitze liegt GENAU bei t=-A (A misst in der Vorlage bis zu dieser
//         Spitze, nicht bis zu einem Punkt davor). Der Umschlag liegt als
//         zweite, dazu PARALLELE Linie knapp darunter an (angelegter
//         180-Grad-Saum, kein Haken) - beide Linien zeigen im Winkel in
//         dieselbe Richtung, nicht spiegelbildlich zueinander.
//
// Die Dachneigung selbst wird NICHT erfasst und auch nicht gebraucht: alle
// Masse liegen im Dachsystem (dieselbe Begruendung wie im Kopf von js/37).
// Die Skizze zeichnet das Dach deshalb waagerecht, mit den zwei Knick-Linien
// (voll = Vorderkant, gestrichelt = Hinterkant) genau wie beim Knick der
// Kamineinfassung.
//
// Acht Zuschnitte (v3.64, nach Rueckmeldung des Anwenders - mehr als bei der
// Kamineinfassung, die nur sechs hat): Vorderteil und Hinterteil (quer zum
// Fenster), dazu JE SEITE DREI Seitenteile statt zwei - "Seitenteil vorne"
// (Laenge B, bis zum Knick), "Seitenteil Mitte" (Vorderkant Knick bis 10mm
// vor der Hinterkant Aufbordung - der "zweiten gestrichelten Linie") und
// "Seitenteil hinten" (die letzten 10mm bis zur Hinterkant Aufbordung
// selbst, dem schraegen Trapezstrich). Die Abwicklung jedes Seitenteils
// besteht aus Umschlag + F (seitlich bis Deckmaterial) + G (seitlich unter
// Deckmaterial) + der GROESSEREN der beiden Aufbordungshoehen dieser Seite -
// dieselbe Vereinfachung wie bei der Kamineinfassung, die durchgehend mit
// der groesseren Hoehe rechnet statt eine ueber die Laenge veraenderliche
// Blechbreite anzunehmen. F und G sind, wie bei der Kamineinfassung, reine
// Aufnahme-Masse ohne Vorgabewert (v3.63). Vorderteil/Hinterteil bekommen
// seit v3.64 ihre Zuschnittlaenge nicht mehr nur aus Breite vorne/hinten,
// sondern zusaetzlich der seitlichen Zugabe (2x Umschlag Seite + F links +
// F rechts + G links + G rechts) - sie reichen seitlich bis zu den
// Seitenteilen. Hinterteil bekommt in der Abwicklung zusaetzlich
// Rand-Abstand und D dazu.
// ===========================================================================

const DFA_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Fenstermasse",hilfe:"dfa-masse"},
 {nr:3,kurz:"Umschläge",hilfe:"dfa-umschlaege"},{nr:4,kurz:"Stückliste",hilfe:"dfa-stueckliste"},
 {nr:5,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:6,kurz:"Ausmass",hilfe:"reg-ausmass"},
 {nr:7,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
const DFA_KONTROLLE=DFA_REGISTER.length;
let dfaSchritt=1;
// v3.94: welche Register schon einmal per "Weiter" bestaetigt wurden (bzw.
// bei einer geladenen Aufnahme ohne Fehler waren) - nur fuer den kleinen
// Haken am Register-Knopf, siehe raRegisterHakenHtml()/Kommentar in
// js/01-basis.js fuer die bewusste Grenze dieser Anzeige.
let dfaBestaetigt=new Set();
// Siehe kamaZeichnet (js/37) fuer die Begruendung dieser Sperre.
let dfaZeichnet=false;

const dfaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const dfaMm=v=>Math.round(dfaZahl(v)).toLocaleString("de-CH");
const dfaQm=v=>dfaZahl(v).toFixed(2).replace(".",",");

// ---- Einstellungen (je Geraet, wie bei der Kamineinfassung) ---------------
const DFA_STANDARD=Object.freeze({
 deckung:"biber_einfach",
 lattenabstand:330,
 umschlag_vorne:20, umschlag_seite:20,
 saum_vorne:50,          // Rueckschlag am oberen Rand der vorderen Aufbordung
 breite_oben:90,         // Kopfbreite der hinteren Aufbordung (Trapez oben)
 breite_unten:125,       // Fussbreite der hinteren Aufbordung (Trapez unten)
 rand_abstand:15,        // obere Ecke bis zum gestrichelten Strich am Kopf
 rand_strich:12,         // Laenge dieses Strichs (senkrecht)
 ueberlappung:120,       // Ueberlappung der Seitenteile (Knick) - wie kam
 mass_vorne:183,         // A, vorne auf Deckmaterial bis Vorderkant Aufbordung
 mass_hinten:200,        // D, Hinterkant Aufbordung bis hinten unter Deckmaterial
 auf_vorne:80,           // Aufbordungshoehe Seite, Vorgabe
 auf_hinten:120,         // Aufbordungshoehe hinten, Vorgabe
 e:35,                   // Mass vom 90-Grad-Aufbug hinten, hinter D - wie kam
 e_umschlag:15,          // Umschlag (180 Grad) an der Spitze des Aufbugs hinten
 anreiff:15,             // Anreiff vorne, vor A
 anreiff_umschlag:10     // Umschlag (180 Grad) an der Spitze des Anreiffs vorne
});
const DFA_EINSTELLUNGEN="sd_dfaSettings";
let dfaSettings=dfaEinstellungenLaden();

function dfaEinstellungenLaden(){
 let w=null;
 try{w=JSON.parse(localStorage.getItem(DFA_EINSTELLUNGEN)||"null")}catch(e){w=null}
 w=Object.assign({},DFA_STANDARD,w||{});
 if(typeof EINF_DECKUNGEN==="object"&&!EINF_DECKUNGEN[w.deckung])w.deckung=DFA_STANDARD.deckung;
 return w;
}
function dfaEinstellungenSichern(w){
 dfaSettings=w;
 try{localStorage.setItem(DFA_EINSTELLUNGEN,JSON.stringify(w))}catch(e){}
}

// ---- Zustand ---------------------------------------------------------------
// A und D sind Masse dieser einen Aufnahme - die Vorgabe fuellt sie beim
// Anlegen nur vor und ist danach frei aenderbar (wie bei der Kamineinfassung).
// B, C und die beiden Aufbordungshoehen sind seitenabhaengig (wie Kamins b/c/
// hoehe) - ohne "getrennt" gilt links fuer beide Seiten und bleiben deshalb
// wie dort standardmaessig LEER (ein erfundener Wert waere fuer den
// jeweiligen Bau falsch). Saum, Trapezmasse, Knick und Umschlaege sind
// Konstruktionsmasse des Einfassungs-Systems und deshalb NICHT seitenabhaengig
// (wie Kamins Ueberlappung).
function dfaLeer(){
 // v3.65: die Einstellungen (dfaSettings) sind nur noch ein RICHTWERT, den
 // der Anwender in den Einstellungen nachschlagen kann - sie fuellen die
 // Aufnahme selbst nicht mehr vor. So kann kein Mass unbemerkt uebernommen
 // werden, ohne dass der Anwender es fuer DIESEN Bau tatsaechlich eingibt;
 // jedes Zahlenfeld ist deshalb ab jetzt ein Pflichtfeld (siehe
 // dfaMasseHtml/dfaUmschlaegeHtml und dfaPruefungen).
 const s=dfaSettings||DFA_STANDARD;
 return {
  material:"", deckung:s.deckung, lattenabstand:"",
  getrennt:false, skizzeSeite:"l",
  a:{l:"",r:""}, d:{l:"",r:""}, ueberlappung:"",
  saumVorne:"", breiteOben:"", breiteUnten:"",
  randAbstand:"", randStrich:"",
  e:"", eUmschlag:"", anreiff:"", anreiffUmschlag:"",
  umschlagVorne:"", umschlagSeite:"",
  breiteVorne:"", breiteHinten:"",
  b:{l:"",r:""}, c:{l:"",r:""}, f:{l:"",r:""}, g:{l:"",r:""},
  aufVorne:"", aufHinten:"",
  rollenAuswahl:[]
 };
}
let dfaA=dfaLeer();

// ---- Masse ------------------------------------------------------------------
const DFA_SEITEN=[{k:"l",name:"links"},{k:"r",name:"rechts"}];
function dfaSeite(feld,seite,quelle){
 const q=quelle||dfaA;
 const w=q[feld];
 if(!w||typeof w!=="object")return dfaZahl(w);
 return dfaZahl(q.getrennt?(seite==="r"?w.r:w.l):w.l);
}
// Wie dfaSeite(), aber OHNE dfaZahl() - fuer Pflichtfeld-Pruefungen auf
// echtes Leer-Sein ("") wichtig, da dfaZahl("") bereits 0 ergeben wuerde.
function dfaSeiteRoh(feld,seite,quelle){
 const q=quelle||dfaA;
 const w=q[feld];
 if(!w||typeof w!=="object")return w;
 return q.getrennt?(seite==="r"?w.r:w.l):w.l;
}
// A und D speisen je ein durchgehendes Teil (Vorder-/Hinterteil), auch wenn
// sie links und rechts getrennt erfasst werden. Dieselbe Regel wie bei den
// Aufbordungshoehen: mit der GROESSEREN Seite rechnen - ein zu kurzer
// Zuschnitt waere unbrauchbar, ein zu langer laesst sich kuerzen.
function dfaADurchgehend(){ return Math.max(dfaSeite("a","l"),dfaSeite("a","r")) }
function dfaDDurchgehend(){ return Math.max(dfaSeite("d","l"),dfaSeite("d","r")) }
// Laenge laengs Dach - B und C ueberlappen sich um die Knickbreite, exakt wie
// kamaKaminLaenge() in js/37.
function dfaLaenge(seite,quelle){
 const q=quelle||dfaA;
 return dfaSeite("b",seite,q)+dfaSeite("c",seite,q)-dfaZahl(q.ueberlappung);
}

// ---- Die acht Zuschnitte -----------------------------------------------------
// Nach Rueckmeldung des Anwenders (v3.64): jede Seite hat DREI Zuschnitte,
// nicht zwei - dieselbe Ueberlappungs-Logik wie bisher (B und die Seitenteile
// laufen um die Knickbreite ineinander), aber der hintere Teil (bisher
// "Seitenteil hinten" = C) wird selbst nochmals geteilt:
//   Seitenteil vorne  - Vorderkant Aufbordung bis Hinterkant Knick, Laenge B
//                        (unveraendert, erste gestrichelte Linie = Knick hinten)
//   Seitenteil Mitte  - Vorderkant Knick bis 10mm vor der Hinterkant Auf-
//                        bordung (die "zweite gestrichelte Linie", derselbe
//                        Ruecklauf wie bei der Oberkante in der Skizze),
//                        Laenge C - DFA_HINTERKANTE_RUECKLAUF
//   Seitenteil hinten - die letzten DFA_HINTERKANTE_RUECKLAUF (10mm) bis zur
//                        Hinterkant Aufbordung selbst (schraeger Trapezstrich)
// Vorderteil und Hinterteil (quer zum Fenster) bekommen ihre Zuschnittlaenge
// neu NICHT mehr direkt aus Breite vorne/hinten, sondern zuzueglich dessen,
// was seitlich noch dazugehoert: 2x Umschlag Seite + F links + F rechts +
// G links + G rechts (bei nicht getrennten Seiten ist das dasselbe wie
// "2x Umschlag + 2x F + 2x G"). Hinterteil bekommt zusaetzlich Rand-Abstand
// und D in die Abwicklung (Umschlag hinten bleibt bestehen).
function dfaZuschnitte(){
 const a=dfaA, z=[];
 const teilBreite=t=>t.reduce((s,x)=>s+dfaZahl(x.wert),0);
 const dazu=(name,rolle,seite,laenge,teile)=>{
  z.push({nr:z.length+1,name,rolle,seite,
   laenge:Math.round(dfaZahl(laenge)),
   breite:Math.round(teilBreite(teile)),
   teile,
   merkmal:name, hinweis:seite||""});
 };
 // Seitliche Zugabe fuer Vorder-/Hinterteil: beide Seiten zusammengezaehlt
 // (bei nicht getrennten Seiten ist links=rechts, ergibt also "2x").
 const seitlicheZugabe=2*dfaZahl(a.umschlagSeite)
   +dfaSeite("f","l")+dfaSeite("f","r")+dfaSeite("g","l")+dfaSeite("g","r");
 dazu("Vorderteil","vorne","",dfaZahl(a.breiteVorne)+seitlicheZugabe,[
  {name:"Winkel auf Fensterrahmen",wert:dfaZahl(a.umschlagVorne)},
  {name:"Aufbordungshöhe Seite",wert:dfaZahl(a.aufVorne)},
  {name:"Aufbordungshöhe vorne",wert:dfaZahl(a.saumVorne)},
  {name:dfaMassLabel("a"),wert:dfaADurchgehend()},
  {name:"Anreiff",wert:dfaZahl(a.anreiff)},
  {name:"Umschlag Anreiff",wert:dfaZahl(a.anreiffUmschlag)}]);
 dazu("Hinterteil","hinten","",dfaZahl(a.breiteHinten)+seitlicheZugabe,[
  {name:"Aufbordungshöhe hinten",wert:dfaZahl(a.aufHinten)},
  {name:"Abdeckkappe oben",wert:dfaZahl(a.randAbstand)},
  {name:"Abdeckkappe nach unten",wert:dfaZahl(a.randStrich)},
  {name:dfaBuchstabe("d")+" · Hinterkant Dachfenster bis Aufbug",wert:dfaDDurchgehend()},
  {name:"Aufbug hinten ("+dfaBuchstabe("e")+")",wert:dfaZahl(a.e)},
  {name:"Umschlag Aufbug",wert:dfaZahl(a.eUmschlag)}]);
 DFA_SEITEN.forEach(s=>{
  const h=Math.max(dfaZahl(a.aufVorne),dfaZahl(a.aufHinten));
  const teile=[
   {name:"Umschlag Seite",wert:dfaZahl(a.umschlagSeite)},
   {name:"Mass "+dfaBuchstabe("g")+" · unter Deckmaterial",wert:dfaSeite("g",s.k)},
   {name:"Mass "+dfaBuchstabe("f")+" · bis Deckmaterial",wert:dfaSeite("f",s.k)},
   {name:"Aufbordungshöhe (grösseres Mass)",wert:h}];
  dazu("Seitenteil vorne","seite",s.name,dfaSeite("b",s.k),teile.map(x=>Object.assign({},x)));
  dazu("Seitenteil Mitte","seite",s.name,Math.max(0,dfaSeite("c",s.k)-DFA_HINTERKANTE_RUECKLAUF),teile.map(x=>Object.assign({},x)));
  dazu("Seitenteil hinten","seite",s.name,dfaSeite("c",s.k)>0?DFA_HINTERKANTE_RUECKLAUF:0,teile.map(x=>Object.assign({},x)));
 });
 return z;
}

// ---- Bleilappen ---------------------------------------------------------------
// Wie bei der Kamineinfassung: AUFGERUNDET, je Seitenteil, aus Laenge und
// Lattenabstand.
function dfaBleilappen(){
 const la=dfaZahl(dfaA.lattenabstand);
 const zeilen=dfaZuschnitte().filter(x=>x.rolle==="seite")
  .map(x=>({name:x.name+" "+x.seite,laenge:x.laenge,
    anzahl:(la>0&&x.laenge>0)?Math.max(1,Math.ceil(x.laenge/la)):null}));
 const gesamt=zeilen.every(x=>x.anzahl===null)?null
   :zeilen.reduce((s,x)=>s+(x.anzahl||0),0);
 return {lattenabstand:la,zeilen,gesamt};
}

// ---- Schnittskizze nach der DXF -----------------------------------------------
// Gezeichnet werden die Elemente der Vorlage fuer EIN Seitenteil: Dach mit
// Pfeilen, vordere Aufbordung mit Saum, der Knick (voll = Vorderkant,
// gestrichelt = Hinterkant - exakt wie kamaSkizze() in js/37), die
// Trapezform hinten. Ohne Argument wird der laufende Zustand gezeichnet, mit
// Argument der gespeicherte Datensatz.
const DFA_SAUM_RUECKLAUF=10;   // fester waagrechter Ruecklauf am Saum, siehe Kopf
const DFA_HINTERKANTE_RUECKLAUF=10; // Abstand vor der Hinterkante, ab dem die verdeckte Oberkante auf das Dach zurueckfaellt
// Anreiff und E-Umschlag: Winkel direkt aus der DXF-Vorlage vermessen (siehe
// Kopf). Der Anreiff ist KEIN senkrechter Haken, sondern eine flache, nach
// UNTEN abgewinkelte Kante (25° unters Dach) - die Spitze liegt GENAU bei
// t=-A (A reicht in der Vorlage bis zu dieser Spitze, nicht bis zu einem
// Punkt davor). Der Umschlag liegt als zweite, dazu parallele Linie knapp
// darunter an (angelegter 180-Grad-Saum, kein Haken). Der Aufbug hinten (E)
// bleibt senkrecht wie bei der Kamineinfassung; sein Umschlag ist dagegen
// eine einzelne 45-Grad-Schraege von der Spitze zurueck Richtung Dach.
const DFA_ANREIFF_WINKEL=25*Math.PI/180;
const DFA_E_UMSCHLAG_WINKEL=45*Math.PI/180;
const DFA_ANREIFF_SPALT=3; // rein zeichnerischer Abstand des Umschlags unter dem Anreiff
function dfaSkizze(quelle){
 const q=quelle||dfaA;
 const seite=q.getrennt?(q.skizzeSeite==="r"?"r":"l"):"l";
 const A=dfaSeite("a",seite,q), D=dfaSeite("d",seite,q), Ue=dfaZahl(q.ueberlappung);
 const av=dfaZahl(q.aufVorne), ah=dfaZahl(q.aufHinten);
 const saum=dfaZahl(q.saumVorne), bo=dfaZahl(q.breiteOben), bu=dfaZahl(q.breiteUnten);
 const randAbstand=dfaZahl(q.randAbstand), randStrich=dfaZahl(q.randStrich);
 const E=dfaZahl(q.e), eUmschlag=dfaZahl(q.eUmschlag);
 const anreiff=dfaZahl(q.anreiff), anreiffUmschlag=dfaZahl(q.anreiffUmschlag);
 const B=dfaSeite("b",seite,q), C=dfaSeite("c",seite,q);
 const L=dfaLaenge(seite,q);
 if(!(av>0&&ah>0)||!(L>0)||!(bu>bo))
  return `<div class="ra-warnung">Für die Schnittskizze fehlen noch Masse: bitte
${dfaBuchstabe("b")}, ${dfaBuchstabe("c")}, beide Aufbordungshöhen sowie Breite
oben/unten (unten grösser als oben) eingeben.</div>`;

 const P=(x,y)=>[x,y];
 // Vordere Aufbordung mit Saum (Fuss bei 0).
 const P0=P(0,0), P1=P(0,av), P2=P(0,Math.max(0,av-saum)), P3=P(DFA_SAUM_RUECKLAUF,Math.max(0,av-saum));
 // Knick: Vorderkant bei B-Ue, Hinterkant bei B - exakt wie bei der
 // Kamineinfassung (knickVorne=B-Ue, knickHinten=B).
 const knickVorne=B-Ue, knickHinten=B;
 // Trapezform hinten: die VORDERE SCHRAEGE LAEUFT BIS AUFS DACH (Fuss bei
 // Hoehe 0, nicht auf Hoehe vorne).
 const Q0=P(L-bu,0), Q1=P(L-bo,ah), Q2=P(L,ah), Q3=P(L,0);
 // Die durchgehende Oberkante (auf Hoehe vorne) laeuft NICHT nur bis zum Fuss
 // der Schraege - sie liegt von dort an HINTER der sichtbaren Schraege
 // (deshalb gestrichelt, verdeckte Kante, gleiches Prinzip wie der Knick) und
 // laeuft erst 10 mm vor der Hinterkante (Q2/Q3) auf das Dach zurueck.
 const Qf=P(L-bu,av);                      // Fuss der Schraege, auf Hoehe vorne
 const M2=P(L-DFA_HINTERKANTE_RUECKLAUF,av); // 10 mm vor der Hinterkante
 const N=P(L-DFA_HINTERKANTE_RUECKLAUF,0);   // faellt hier auf das Dach zurueck
 // 90-Grad-Aufbug hinten (E, hinter D) - senkrecht wie bei der
 // Kamineinfassung (linie(P(L+D,0),P(L+D,E)) mit fahne "E = ... · 90°");
 // sein Umschlag ist eine einzelne 45-Grad-Schraege von der Spitze zurueck
 // Richtung Dach (aus der DXF vermessen), kein rechtwinkliger Haken.
 const E0=P(L+D,0), E1=P(L+D,E);
 const E2=P(E1[0]-eUmschlag*Math.cos(DFA_E_UMSCHLAG_WINKEL),E1[1]-eUmschlag*Math.sin(DFA_E_UMSCHLAG_WINKEL));
 // Anreiff vorne (vor A) - eine flache, 25 Grad nach UNTEN abgewinkelte
 // Kante, deren Spitze GENAU bei t=-A liegt (A reicht in der Vorlage bis zu
 // dieser Spitze). Der Umschlag ist eine zweite, dazu parallele Linie, die
 // knapp darunter anliegt (angelegter Saum statt Haken).
 const arDx=Math.cos(DFA_ANREIFF_WINKEL), arDy=Math.sin(DFA_ANREIFF_WINKEL);
 const F1=P(-A,-anreiff*arDy), F0=P(F1[0]+anreiff*arDx,0);
 const Fu1=P(F1[0],F1[1]-DFA_ANREIFF_SPALT);
 const Fu0=P(Fu1[0]+anreiffUmschlag*arDx,Fu1[1]+anreiffUmschlag*arDy);
 const dachVon=-A-Math.max(60,A*0.25), dachBis=L+D+Math.max(60,D*0.25);

 let xMin=dachVon,xMax=dachBis,yMin=0,yMax=Math.max(av,ah);
 xMin-=70; xMax+=40; yMin-=40; yMax+=70;

 const breitePx=680, rand=12;
 let sk=(breitePx-2*rand)/(xMax-xMin);
 if(sk>1.6)sk=1.6;
 const hoehePx=Math.round((yMax-yMin)*sk+2*rand);
 const ox=rand-xMin*sk, oy=rand+yMax*sk;
 const X=x=>Math.round((ox+x*sk)*10)/10;
 const Y=y=>Math.round((oy-y*sk)*10)/10;
 const zahl=v=>dfaMm(v);

 let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
 const merk=(x,y)=>{if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y};
 const merkPunkt=(mx,my)=>merk(X(mx),Y(my));
 const merkText=(px,py,text,anker,gr)=>{
  const g=gr||15, br=String(text).length*g*0.56;
  const l=anker==="end"?px-br:(anker==="middle"?px-br/2:px);
  merk(l,py-g); merk(l+br,py+5);
 };
 const merkMassWaag=(x1,x2,y,text,unten)=>{
  merk(X(x1),Y(y)-14); merk(X(x2),Y(y)+14);
  merkText((X(x1)+X(x2))/2,Y(y)+(unten?17:-7),text,"middle",15);
 };
 const merkMassSenk=(y1,y2,x,text)=>{
  merk(X(x)-10,Y(y1)); merk(X(x)+26,Y(y2));
  const mitte=(Y(y1)+Y(y2))/2, hoch=String(text).length*15*0.56;
  merk(X(x)-9,mitte-hoch/2); merk(X(x)+9,mitte+hoch/2);
 };
 const merkFahne=(x,y,dx,dy,text)=>{
  const x0=X(x), y0=Y(y), x1=x0+dx, y1=y0+dy;
  merk(x0,y0);
  const anker=dx<0?"end":(dx>0?"start":"middle");
  merkText(x1+(dx<0?-4:(dx>0?4:0)),y1+(dy>0?12:-5),text,anker,13);
 };

 const linie=(p1,p2,farbe,br,strich)=>{
  merkPunkt(p1[0],p1[1]); merkPunkt(p2[0],p2[1]);
  return `<line x1="${X(p1[0])}" y1="${Y(p1[1])}" x2="${X(p2[0])}" y2="${Y(p2[1])}"
   stroke="${farbe}" stroke-width="${br}" stroke-linecap="round"${
   strich?` stroke-dasharray="${strich}"`:""}/>`;
 };

 let g="";
 // Dach, ohne Pfeilspitzen (auf Wunsch entfernt) und ohne den unnoetigen
 // Ueberstand vorne/hinten - die Linie endet dort, wo der Anreiff- bzw.
 // E-Umschlag tatsaechlich beginnt (F0/E0), nicht erst beim Rand der
 // Zeichnung (dachVon/dachBis dienen nur noch als Abstand fuer die
 // Aufbordungs-Bemassung und den Zeichenrand).
 g+=linie(P(F0[0],0),P(E0[0],0),ANB_FARBE.deckLinie,3);
 // Vordere Aufbordung mit Saum.
 g+=linie(P0,P1,ANB_FARBE.bau,3);
 g+=linie(P1,P2,ANB_FARBE.bau,3);
 g+=linie(P2,P3,ANB_FARBE.bau,3);
 // Durchgehende Oberkante von der vorderen Aufbordung bis zum Fuss der
 // Schraege (der Knick liegt auf diesem Abschnitt) - SICHTBAR, weil noch vor
 // der Schraege. Ab dort liegt sie HINTER der Schraege - GESTRICHELT, bis sie
 // 10 mm vor der Hinterkante auf das Dach zurueckfaellt.
 g+=linie(P1,Qf,ANB_FARBE.bau,2);
 if(M2[0]>Qf[0]){
  g+=linie(Qf,M2,ANB_FARBE.bau,1.6,"7 5");
  g+=linie(M2,N,ANB_FARBE.bau,1.6,"7 5");
 }
 // Trapezform hinten.
 g+=linie(Q0,Q1,ANB_FARBE.bau,3);
 g+=linie(Q1,Q2,ANB_FARBE.bau,3);
 g+=linie(Q2,Q3,ANB_FARBE.bau,3);
 // Strich am Kopf: von der oberen Ecke (Q2) aus randAbstand nach vorne, dann
 // randStrich nach unten - gestrichelt, wie vom Anwender direkt am Foto
 // gezeigt.
 const strichDa=randAbstand>0&&randStrich>0&&Q2[0]-randAbstand>Q1[0];
 let Rs=null;
 if(strichDa){
  Rs=P(Q2[0]-randAbstand,ah);
  g+=linie(Rs,P(Rs[0],ah-randStrich),ANB_FARBE.bau,1.6,"7 5");
 }
 // Knick: Vorderkant voll, Hinterkant gestrichelt (verdeckte Kante) - exakt
 // dasselbe Prinzip wie bei der Kamineinfassung.
 const knickDa=Ue>0&&knickVorne>0&&knickHinten<=L;
 if(knickDa){
  g+=linie(P(knickVorne,0),P(knickVorne,av),ANB_FARBE.bau,1.6);
  g+=linie(P(knickHinten,0),P(knickHinten,av),ANB_FARBE.bau,1.6,"7 5");
 }
 // 90-Grad-Aufbug hinten (E) - exakt wie bei der Kamineinfassung - mit
 // einer 45-Grad-Schraege als Umschlag an der Spitze (aus der DXF). Schwarz
 // (deckLinie) statt der roten Blechlinie, auf Wunsch des Anwenders.
 if(E>0)g+=linie(E0,E1,ANB_FARBE.deckLinie,3.4);
 if(E>0&&eUmschlag>0)g+=linie(E1,E2,ANB_FARBE.deckLinie,2.4);
 // Anreiff vorne (vor A) - flache, 25-Grad-Schraege nach unten, Spitze bei
 // t=-A; der Umschlag liegt als zweite, parallele Linie knapp darunter an.
 if(anreiff>0)g+=linie(F0,F1,ANB_FARBE.deckLinie,3.4);
 if(anreiff>0&&anreiffUmschlag>0)g+=linie(Fu0,Fu1,ANB_FARBE.deckLinie,2.4);

 // Masse. Jede Bemassung bekommt eine EIGENE Hoehenbahn, von unten (Dach)
 // nach oben aufsteigend geordnet, damit sich nichts gegenseitig verdeckt:
 //   Dach/A/D (0)  <  Breite unten (-34, unter dem Dach)
 //   Knick (av*0.5)  <  B (av+34)  <  Breite oben (ah+34)  <  C (ganz oben)
 // A und D zeigen nach INNEN, wie beim Kamin.
 if(A>0){g+=anbMassWaag(-A,0,0,dfaBuchstabe("a")+" = "+zahl(A),X,Y,true); merkMassWaag(-A,0,0,dfaBuchstabe("a")+" = "+zahl(A),true)}
 if(D>0){g+=anbMassWaag(L,L+D,0,dfaBuchstabe("d")+" = "+zahl(D),X,Y,true); merkMassWaag(L,L+D,0,dfaBuchstabe("d")+" = "+zahl(D),true)}
 g+=anbMassWaag(Q0[0],Q3[0],-34,dfaBuchstabe("breiteUnten")+" = "+zahl(bu),X,Y,true);
 merkMassWaag(Q0[0],Q3[0],-34,dfaBuchstabe("breiteUnten")+" = "+zahl(bu),true);
 if(knickDa){
  g+=anbMassWaag(knickVorne,knickHinten,av*0.5,dfaBuchstabe("ueberlappung")+" = "+zahl(Ue),X,Y,false);
  merkMassWaag(knickVorne,knickHinten,av*0.5,dfaBuchstabe("ueberlappung")+" = "+zahl(Ue),false);
 }
 if(B>0){g+=anbMassWaag(0,knickHinten,av+34,dfaBuchstabe("b")+" = "+zahl(B),X,Y,false); merkMassWaag(0,knickHinten,av+34,dfaBuchstabe("b")+" = "+zahl(B),false)}
 if(strichDa){
  const fahneR=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneR(Rs[0],ah-randStrich/2,-46,14,dfaBuchstabe("randAbstand")+" / "+dfaBuchstabe("randStrich")+" = "+zahl(randAbstand)+" / "+zahl(randStrich));
 }
 g+=anbMassWaag(Q1[0],Q2[0],ah+34,dfaBuchstabe("breiteOben")+" = "+zahl(bo),X,Y,false);
 merkMassWaag(Q1[0],Q2[0],ah+34,dfaBuchstabe("breiteOben")+" = "+zahl(bo),false);
 if(C>0){g+=anbMassWaag(knickVorne,L,Math.max(av,ah)+72,dfaBuchstabe("c")+" = "+zahl(C),X,Y,false); merkMassWaag(knickVorne,L,Math.max(av,ah)+72,dfaBuchstabe("c")+" = "+zahl(C),false)}
 g+=anbMassSenk(0,av,dachVon-56,dfaBuchstabe("aufVorne")+" = "+zahl(av),X,Y);
 merkMassSenk(0,av,dachVon-56,dfaBuchstabe("aufVorne")+" = "+zahl(av));
 g+=anbMassSenk(0,ah,dachBis+22,dfaBuchstabe("aufHinten")+" = "+zahl(ah),X,Y);
 merkMassSenk(0,ah,dachBis+22,dfaBuchstabe("aufHinten")+" = "+zahl(ah));
 // D (der Saum, oberster Teil von F) wird als eigene, VOM WANDFUSS NACH OBEN
 // laufende Masskette gezeichnet (0 bis Falzbeginn av-saum) - genau wie F/Q -
 // statt als blosse Fahne. So liest sich D wie am Bau gemessen: vom Fuss der
 // Wand hoch bis dorthin, wo der Falz beginnt, nicht als Laenge des Falzes
 // selbst von der Spitze her.
 if(saum>0&&saum<av){
  g+=anbMassSenk(0,av-saum,dachVon-28,dfaBuchstabe("saumVorne")+" = "+zahl(saum),X,Y);
  merkMassSenk(0,av-saum,dachVon-28,dfaBuchstabe("saumVorne")+" = "+zahl(saum));
 }
 // Hoch ueber der Zeichnung (wie C, nur noch hoeher) und zur Mitte hin
 // ausgerichtet - der Platz rechts von E bzw. links von Anreiff ist durch
 // die neue Bemassung "Aufbordung hinten/vorne" belegt (die es bei der
 // Kamineinfassung nicht gibt), der Platz zur Mitte hin ist frei.
 if(E>0){
  const fahneE=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneE(E1[0],E1[1],-8,-95,dfaBuchstabe("e")+" = "+zahl(E)+" · 90°"+(eUmschlag>0?" / "+dfaBuchstabe("eUmschlag")+" = "+zahl(eUmschlag):""));
 }
 if(anreiff>0){
  const fahneF=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneF(F1[0],F1[1],8,-95,dfaBuchstabe("anreiff")+" = "+zahl(anreiff)+(anreiffUmschlag>0?" / "+dfaBuchstabe("anreiffUmschlag")+" = "+zahl(anreiffUmschlag):""));
 }

 const seiteTxt=q.getrennt?(seite==="r"?" · rechte Seite":" · linke Seite"):"";
 const fuss="Dachfenstereinfassung · Seitenteil im Schnitt längs des Dachs"+seiteTxt+" · Dach waagerecht dargestellt";
 merk(bx1-String(fuss).length*11*0.5,by1+16);
 const vx=Math.round(bx0-8), vy=Math.round(by0-8);
 const vw=Math.max(60,Math.round(bx1-bx0+16)), vh=Math.max(40,Math.round(by1-by0+16));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"
  width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
  <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff"/>
  ${g}
  <text x="${vx+vw-6}" y="${vy+vh-6}" text-anchor="end" font-size="11" fill="#8b969e"
   >${anbEsc(fuss)}</text>
 </svg>`;
}

// ---- Zuschnitt aus Rollenblech (gemeinsame Bausteine, js/29 + js/33) --------
function dfaBleche(){
 return dfaZuschnitte().filter(x=>x.laenge>0&&x.breite>0);
}
function dfaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(dfaA&&dfaA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
function dfaFlaecheM2(){
 return dfaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
}
function dfaRollenPlan(){
 const bleche=dfaBleche();
 const netto=dfaFlaecheM2();
 if(!bleche.length||typeof ebaFormatPlan!=="function")
  return {gruppen:[],moeglich:[],zuSchmal:[],bestes:null,netto,optimal:true,
          ...ebaFormLeer(dfaA&&dfaA.material),ausResten:[]};
 const nach=new Map();
 bleche.forEach(x=>{
  if(!nach.has(x.breite))nach.set(x.breite,[]);
  nach.get(x.breite).push(x);
 });
 const ausResten=[];
 const gruppen=Array.from(nach.keys()).sort((a,b)=>b-a).map(B=>{
  const vor=(typeof ebaVorabzug==="function")
   ?ebaVorabzug(nach.get(B),{material:dfaA&&dfaA.material,abwicklung:B})
   :{bleche:nach.get(B),ausResten:[]};
  const liste=vor.bleche||[];
  (vor.ausResten||[]).forEach(x=>ausResten.push(x));
  return {breite:B,stuecke:liste,bleche:liste};
 }).filter(g=>g.stuecke.length);
 if(!gruppen.length)
  return {gruppen:[],moeglich:[],zuSchmal:[],bestes:null,netto,optimal:true,
          ...ebaFormLeer(dfaA&&dfaA.material),ausResten};
 const fm=ebaFormate({material:dfaA&&dfaA.material});
 const p=ebaFormatPlan({gruppen,formate:fm.formate,form:fm.form,netto});
 return {gruppen:p.gruppen,moeglich:p.moeglich,zuSchmal:p.zuSchmal,
         zuLang:p.zuLang,zuKurz:p.zuKurz,bestes:p.bestes,netto:p.netto,
         optimal:p.optimal,ausResten,
         form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,formate:p.formate};
}
function dfaZuschnittPlan(){
 const rp=dfaRollenPlan();
 const breiten=(rp.formate||[]).map(f=>f.text||"");
 return {art:rp.form, form:rp.form,
  formGrund:rp.formGrund, formQuelle:rp.formQuelle,
  einheit:"Teil",
  material:(typeof dfaA!=="undefined")?(dfaA.material):null,
  einleitung:zuEinleitung(rp.form),
  quelle:zuQuelle(rp.form)+(breiten.length?" Hinterlegt: "+esc(breiten.join(" · "))+".":""),
  leer:ebaLeerText({form:rp.form,formate:rp.formate||[]},dfaBleche().length?"":"Noch nichts zuzuschneiden – bitte zuerst die Masse erfassen."),
  streifenbreiten:(rp.gruppen||[]).map(g=>g.breite),
  gruppen:rp.gruppen||[], moeglich:rp.moeglich||[], netto:rp.netto,
  ausResten:rp.ausResten||[],
  zuSchmal:rp.zuSchmal, zuLang:rp.zuLang||[], zuKurz:rp.zuKurz||[],
  optimal:rp.optimal!==false};
}

// ---- Ausmass ------------------------------------------------------------------
function dfaDeckungText(){
 const d=(typeof EINF_DECKUNGEN==="object")?EINF_DECKUNGEN[dfaA.deckung]:null;
 return d?d.name:"kein Deckmaterial gewählt";
}
function dfaMaterialText(){
 const m=findMeasurementMaterial(dfaA.material);
 return m?m.name:"kein Material gewählt";
}
function dfaAusmassZeilen(){
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft,teil)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:teil===true});
 const teile=dfaZuschnitte().filter(x=>x.laenge>0&&x.breite>0);
 if(!teile.length)return z;
 zeile("Dachfenstereinfassung, "+dfaDeckungText(),"1","Stk.","Deckmaterial aus den Grunddaten");
 teile.forEach(t=>zeile(t.name+(t.seite?" "+t.seite:""),
   dfaMm(t.laenge)+" × "+dfaMm(t.breite),"mm","Zuschnittlänge × Abwicklung"));
 zeile("Blechfläche Zuschnitt",dfaQm(dfaFlaecheM2()),"m²","Summe Länge × Abwicklung");
 const bl=dfaBleilappen();
 if(bl.gesamt!==null)
  zeile("Bleilappen",String(bl.gesamt),"Stk.","je Seitenteil aufgerundet aus Länge ÷ Lattenabstand",true);
 const Ll=dfaLaenge("l"), Lr=dfaLaenge("r");
 const bcFormel=dfaBuchstabe("b")+" + "+dfaBuchstabe("c")+" − Überlappung";
 if(Ll>0)zeile("Länge Seitenteil"+(dfaA.getrennt?" links":""),dfaMm(Ll),"mm",bcFormel);
 if(dfaA.getrennt&&Lr>0)zeile("Länge Seitenteil rechts",dfaMm(Lr),"mm",bcFormel);
 // v3.53: der Umfang der Einfassung, wie sie in der Dachschräge liegt - genau
 // wie bei der Kamineinfassung (js/37) sind alle vier Seiten bereits im
 // Dachsystem gemessen, es braucht deshalb keine Umrechnung der Dachneigung.
 // Zwei Seitenlaengen (links, rechts) plus die beiden Zuschnittbreiten vorne
 // und hinten - bei nicht getrennten Seiten ist links=rechts, die Rechnung
 // bleibt dieselbe.
 const bv=dfaZahl(dfaA.breiteVorne), bh=dfaZahl(dfaA.breiteHinten);
 if(Ll>0&&Lr>0&&bv>0&&bh>0)
  zeile("Umfang, in der Dachschräge gemessen",dfaMm(Ll+Lr+bv+bh),"mm",
    "Länge links + Länge rechts + Breite vorne + Breite hinten");
 return z;
}
function dfaMaterialTabelle(){
 const m=findMeasurementMaterial(dfaA.material);
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle ------------------------------------------------------------
function dfaPruefungen(){
 const m=[], a=dfaA;
 const fehlt=(wert,text)=>{if(!(dfaZahl(wert)>0))m.push({art:"fehler",text})};
 // v3.65: fuer Masse, bei denen 0 ein gueltiger, bewusst eingegebener Wert
 // sein kann (z.B. kein Rand-Strich), zaehlt nur echtes LEER-SEIN als
 // "fehlt" - nicht "ist nicht groesser als 0" wie bei fehlt() oben.
 const fehltLeer=(wert,text)=>{if(wert===""||wert===null||wert===undefined)m.push({art:"fehler",text})};
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 fehlt(a.breiteVorne,dfaBuchstabe("breiteVorne")+" · Die Breite vorne (Zuschnittlänge Vorderteil) fehlt.");
 fehlt(a.breiteHinten,dfaBuchstabe("breiteHinten")+" · Die Breite hinten (Zuschnittlänge Hinterteil) fehlt.");
 fehlt(a.breiteOben,dfaMassLabel("breiteOben")+" fehlt.");
 fehlt(a.breiteUnten,dfaMassLabel("breiteUnten")+" fehlt.");
 fehltLeer(a.ueberlappung,dfaMassLabel("ueberlappung")+" fehlt.");
 fehltLeer(a.saumVorne,dfaMassLabel("saumVorne")+" fehlt.");
 fehlt(a.aufVorne,dfaMassLabel("aufVorne")+" fehlt.");
 fehlt(a.aufHinten,dfaMassLabel("aufHinten")+" fehlt.");
 fehltLeer(a.randAbstand,dfaMassLabel("randAbstand")+" fehlt.");
 fehltLeer(a.randStrich,dfaMassLabel("randStrich")+" fehlt.");
 fehltLeer(a.e,dfaMassLabel("e")+" fehlt.");
 fehltLeer(a.eUmschlag,dfaMassLabel("eUmschlag")+" fehlt.");
 fehltLeer(a.anreiff,dfaMassLabel("anreiff")+" fehlt.");
 fehltLeer(a.anreiffUmschlag,dfaMassLabel("anreiffUmschlag")+" fehlt.");
 fehltLeer(a.umschlagVorne,dfaMassLabel("umschlagVorne")+" fehlt.");
 fehltLeer(a.umschlagSeite,dfaMassLabel("umschlagSeite")+" fehlt.");
 fehltLeer(a.lattenabstand,"Lattenabstand fehlt.");
 if(dfaZahl(a.breiteOben)>0&&dfaZahl(a.breiteUnten)>0&&dfaZahl(a.breiteUnten)<=dfaZahl(a.breiteOben))
  m.push({art:"fehler",text:"Breite unten muss grösser sein als Breite oben – sonst ist es kein Trapez."});
 DFA_SEITEN.forEach(s=>{
  const zusatz=a.getrennt?" ("+s.name+")":"";
  fehlt(dfaSeite("a",s.k),"Mass "+dfaBuchstabe("a")+", "+dfaBezeichnung("a")+zusatz+", fehlt.");
  fehlt(dfaSeite("b",s.k),"Mass "+dfaBuchstabe("b")+", "+dfaBezeichnung("b")+zusatz+", fehlt.");
  fehlt(dfaSeite("c",s.k),"Mass "+dfaBuchstabe("c")+", "+dfaBezeichnung("c")+zusatz+", fehlt.");
  fehlt(dfaSeite("d",s.k),"Mass "+dfaBuchstabe("d")+", "+dfaBezeichnung("d")+zusatz+", fehlt.");
  fehltLeer(dfaSeiteRoh("f",s.k),"Mass "+dfaBuchstabe("f")+", "+dfaBezeichnung("f")+zusatz+", fehlt.");
  fehltLeer(dfaSeiteRoh("g",s.k),"Mass "+dfaBuchstabe("g")+", "+dfaBezeichnung("g")+zusatz+", fehlt.");
  if(!a.getrennt)return;
 });
 ["ueberlappung","saumVorne","aufVorne","aufHinten","breiteOben","breiteUnten",
  "randAbstand","randStrich","e","eUmschlag","anreiff","anreiffUmschlag",
  "breiteVorne","breiteHinten","umschlagVorne","umschlagSeite"
  ].forEach(k=>{
  if(dfaZahl(a[k])<0)m.push({art:"fehler",text:dfaMassLabel(k)+" kann nicht negativ sein."});
 });
 if(dfaZahl(a.lattenabstand)<0)m.push({art:"fehler",text:"Lattenabstand kann nicht negativ sein."});
 DFA_SEITEN.forEach(s=>{
  ["a","b","c","d","f","g"].forEach(k=>{
   if(dfaSeite(k,s.k)<0)m.push({art:"fehler",text:"Ein seitliches Mass ist negativ ("+s.name+")."});
  });
 });
 if(dfaZahl(a.aufVorne)>0&&dfaZahl(a.aufHinten)>0&&dfaZahl(a.saumVorne)>=dfaZahl(a.aufVorne))
  m.push({art:"warnung",text:"Die Aufbordungshöhe vorne ist nicht kleiner als die "
    +"Aufbordungshöhe Seite – der Saum liefe dann bis auf das Dach zurück."});
 DFA_SEITEN.forEach(s=>{
  const L=dfaLaenge(s.k);
  const zusatz=a.getrennt?" ("+s.name+")":"";
  if(dfaSeite("b",s.k)>0&&dfaSeite("c",s.k)>0&&!(L>0))
   m.push({art:"fehler",text:dfaBuchstabe("b")+" + "+dfaBuchstabe("c")+" ist nicht grösser als die Überlappung"+zusatz
     +" – daraus ergibt sich keine Länge."});
  if(dfaZahl(a.ueberlappung)>0&&dfaSeite("b",s.k)>0&&dfaSeite("b",s.k)<=dfaZahl(a.ueberlappung))
   m.push({art:"warnung",text:"Mass "+dfaBuchstabe("b")+zusatz+" ist nicht grösser als die Überlappung – "
     +"der Knick läge dann vor der Vorderkant Dachfenster."});
  if(!a.getrennt)return;
 });
 if(!(dfaZahl(a.lattenabstand)>0))
  m.push({art:"warnung",text:"Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden."});
 if(!a.deckung)m.push({art:"warnung",text:"Es ist noch kein Deckmaterial gewählt."});
 if(a.getrennt){
  const gleich=["a","b","c","d","f","g"].every(k=>dfaSeite(k,"l")===dfaSeite(k,"r"));
  if(gleich)m.push({art:"warnung",text:"Links und rechts werden getrennt erfasst, "
    +"sind aber überall gleich – der Schalter kann ausgeschaltet werden."});
 }
 if(dfaBleche().length){
  const rp=dfaRollenPlan(), tafel=rp.form==="tafel";
  if(!(rp.formate||[]).length)
   m.push({art:"warnung",text:"Es ist "+(tafel?"kein Tafelformat":"keine Rollenbreite")
     +" hinterlegt – der Materialbedarf wird nicht gerechnet."});
 }
 return m;
}

// ---- Durchnummerierung aller Masse (A, B, C, ...) --------------------------
// Eine EINZIGE, geordnete Liste ist die Quelle fuer den Buchstaben jedes
// Masses - der Buchstabe ergibt sich rein aus der Position in dieser Liste
// (A=Index 0, B=Index 1, ...), nie aus einer zweiten, separat gepflegten
// Zuordnung. Reihenfolge: laengs des Dachs von vorne (Anreiff) nach hinten
// (Umschlag am Aufbug), seitliche/quer liegende Masse jeweils direkt neben
// dem laengs liegenden Mass, zu dem sie gehoeren.
const DFA_MASSLISTE=[
 ["anreiff","Anreiff vorne"],
 ["anreiffUmschlag","Umschlag am Anreiff vorne (180°)"],
 ["a","vorne auf Deckmaterial bis Vorderkant Dachfenster"],
 ["saumVorne","Aufbordungshöhe vorne"],
 ["umschlagVorne","Winkel auf Fensterrahmen"],
 ["aufVorne","Aufbordungshöhe Seite"],
 ["b","Vorderkant Dachfenster bis Hinterkant Knick"],
 ["ueberlappung","Überlappung der Seitenteile (Knick)"],
 ["c","Vorderkant Knick bis Hinterkant Dachfenster"],
 ["f","seitlich bis Deckmaterial"],
 ["g","seitlich unter Deckmaterial"],
 ["umschlagSeite","Umschlagbreite seitlich"],
 ["breiteOben","Breite oben, hintere Aufbordung (Kopf)"],
 ["breiteUnten","Breite unten, hintere Aufbordung (Fuss)"],
 ["randAbstand","Abdeckkappe oben"],
 ["randStrich","Abdeckkappe nach unten"],
 ["aufHinten","Aufbordungshöhe hinten"],
 ["d","Hinterkant Dachfenster bis Hinterkant Einfassung"],
 ["e","90°-Aufbug hinten"],
 ["eUmschlag","Umschlag am Aufbug hinten (180°)"],
 ["breiteVorne","Breite vorne · Zuschnittlänge Vorderteil"],
 ["breiteHinten","Breite hinten · Zuschnittlänge Hinterteil"]
];
function dfaBuchstabe(k){
 const i=DFA_MASSLISTE.findIndex(x=>x[0]===k);
 return i>=0?String.fromCharCode(65+i):"?";
}
// v3.92: EINE Quelle fuer die Massbeschreibung - vorher war derselbe Text an
// bis zu sechs Stellen (Zuschnitte, Pruefungen, Formular, Kontrolle,
// Einstellungen) von Hand erneut getippt, siehe die Verwechslung von R/U in
// v3.90 als Beispiel, wozu das fuehren kann. Nur wo der Text im jeweiligen
// Zusammenhang WOERTLICH derselbe ist, wird hier darauf verwiesen - ein
// bewusst anders formulierter, kuerzerer oder zusammengesetzter Text (z.B.
// in der dichten Kontrolle-Tabelle oder mit einem angehaengten Zusatz) bleibt
// eigener Text, siehe Kommentare an den jeweiligen Stellen.
function dfaBezeichnung(k){
 const e=DFA_MASSLISTE.find(x=>x[0]===k);
 return e?e[1]:"";
}
function dfaMassLabel(k){
 return dfaBuchstabe(k)+" · "+dfaBezeichnung(k);
}
// Feste, nur zur Anschauung dienende Beispielwerte fuer die Uebersichts-
// Skizze - unabhaengig vom laufenden Zustand, damit sie auch bei einer
// leeren oder halb ausgefuellten Aufnahme immer vollstaendig und lesbar
// bleibt. Kein Bezug zu einer echten Aufnahme.
function dfaUebersichtQuelle(){
 return Object.assign(dfaLeer(),{
  getrennt:false, skizzeSeite:"l",
  a:180, d:200, ueberlappung:120, saumVorne:50,
  breiteOben:90, breiteUnten:125, randAbstand:15, randStrich:12,
  e:35, eUmschlag:15, anreiff:15, anreiffUmschlag:10,
  aufVorne:80, aufHinten:120,
  b:{l:300,r:300}, c:{l:400,r:400}, f:{l:10,r:10}, g:{l:20,r:20}
 });
}
function dfaUebersichtHtml(){
 const zeilen=DFA_MASSLISTE.map(([k,name])=>
  `<tr><td><b>${esc(dfaBuchstabe(k))}</b></td><td>${esc(name)}</td></tr>`).join("");
 return `<details class="dfa-uebersicht" style="margin-bottom:12px">
<summary>Übersicht: alle Masse mit Buchstabe (A, B, C, …) anzeigen</summary>
<div class="info" style="margin-top:8px">Beispielskizze mit Beispielwerten -
zeigt nur, wo jeder Buchstabe liegt, nicht die aktuelle Aufnahme. Die
seitlichen Masse (${dfaBuchstabe("f")}, ${dfaBuchstabe("g")}), die
Umschlagbreite seitlich (${dfaBuchstabe("umschlagSeite")}) sowie
${dfaBuchstabe("breiteVorne")} und ${dfaBuchstabe("breiteHinten")} stehen quer
zu dieser Schnittzeichnung und sind deshalb nur in der Tabelle darunter
aufgeführt.</div>
<div class="eb-diagram-box eb-diagram-scroll" style="margin-top:8px">${dfaSkizze(dfaUebersichtQuelle())}</div>
<div class="scroll" style="margin-top:8px"><table class="eb-table ra-tab"><tbody>
${zeilen}
</tbody></table></div>
</details>`;
}

// ---- Anzeige --------------------------------------------------------------
function dfaKarte(titel,inhalt){
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,DFA_REGISTER):"";
 return `<div class="card"><h2>${esc(titel)}${h}</h2>${inhalt}</div>`;
}
function dfaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
// v3.172: wie bei der Kamineinfassung - links die Feld-ID, rechts der
// Schluessel im gespeicherten Datensatz (dfaDaten, js/66). a und d liegen
// als {l,r}; beide Seiten lernen unter demselben Namen. b, c, f, g und die
// Winkel haben keinen Richtwert und werden nicht gelernt.
const DFA_LERNFELDER={
 dfa_lattenabstand:"lattenabstand",
 dfa_ueberlappung:"ueberlappung",
 dfa_aufVorne:"aufVorne",
 dfa_aufHinten:"aufHinten",
 dfa_saumVorne:"saumVorne",
 dfa_breiteOben:"breiteOben",
 dfa_breiteUnten:"breiteUnten",
 dfa_randAbstand:"randAbstand",
 dfa_randStrich:"randStrich",
 dfa_e:"e",
 dfa_eUmschlag:"eUmschlag",
 dfa_anreiff:"anreiff",
 dfa_anreiffUmschlag:"anreiffUmschlag",
 dfa_umschlagVorne:"umschlagVorne",
 dfa_umschlagSeite:"umschlagSeite",
 dfa_a_l:"a", dfa_a_r:"a",
 dfa_d_l:"d", dfa_d_r:"d"
};
function dfaZahlFeld(label,id,wert,schritt,pflicht,vorschlag){
 const leer=wert===""||wert===null||wert===undefined;
 const chip=(leer&&typeof vorschlagChip==="function")
  ?vorschlagChip(id,vorschlag,"dachfenstereinfassung",DFA_LERNFELDER[id]):"";
 return dfaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${
   pflicht?' data-pflicht="1"':""} inputmode="${
   (schritt&&schritt!=="1")?"decimal":"numeric"}" value="${
   leer?"":esc(wert)}">${chip}`);
}
function dfaSeitenFeld(label,basis,pflicht,vorschlag){
 const feld=(typeof DFA_SEITENFELDER==="object"&&DFA_SEITENFELDER[basis])
   ||String(basis).replace(/^dfa_/,"");
 const w=dfaA[feld]||{l:"",r:""};
 if(!dfaA.getrennt)
  return dfaZahlFeld(label,basis+"_l",w.l,"1",pflicht,vorschlag);
 return dfaZahlFeld(label+" · links",basis+"_l",w.l,"1",pflicht,vorschlag)
   +dfaZahlFeld(label+" · rechts",basis+"_r",w.r,"1",pflicht,vorschlag);
}
function dfaGrunddatenHtml(){
 const a=dfaA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const deckOpt=Object.keys((typeof EINF_DECKUNGEN==="object"?EINF_DECKUNGEN:{}))
  .map(k=>`<option value="${esc(k)}"${k===a.deckung?" selected":""}>${esc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 return `<div class="info">Einfassung eines Dachfensters. Erfasst wird die
senkrechte Aufbordung: vorne (mit Saum) niedriger, hinten (mit Trapezform)
höher – dazwischen die beiden Seitenteile. Deckmaterial und Lattenabstand
werden für die Bleilappen gebraucht.</div>
<div class="grid">
${dfaFeld("Material",`<select id="dfa_material" data-pflicht="1">${matOpt}</select>`,true)}
${dfaFeld("Deckungsmaterial",`<select id="dfa_deckung">${deckOpt}</select>`)}
${dfaZahlFeld("Lattenabstand, für Anzahl Bleilappen (mm)","dfa_lattenabstand",a.lattenabstand,"1",true,dfaSettings.lattenabstand)}
</div>
<label class="kam-schalter"><input type="checkbox" id="dfa_getrennt"${a.getrennt?" checked":""}>
<span>Links und rechts getrennt erfassen</span></label>
<div class="small" style="color:var(--muted);margin-top:2px">Ohne Haken gilt jedes seitliche
Mass für beide Seiten. Mit Haken bekommen A, B, C, D, F und G je zwei Felder.</div>
<div class="bar" style="margin-top:8px">
<button type="button" class="gray" id="dfa_einstellungen">⚙️ Standardwerte</button>
</div>`;
}
function dfaKennzahlenHtml(){
 const wert=(l,v)=>`<div><label>${esc(l)}</label><div class="ra-wert">${esc(v)}</div></div>`;
 const Ll=dfaLaenge("l"), Lr=dfaLaenge("r");
 const bl=dfaBleilappen();
 return `<div class="grid ra-kennzahlen" id="dfa_kennzahlen">
${wert("Länge Seitenteil"+(dfaA.getrennt?" links":""),Ll>0?dfaMm(Ll)+" mm":"–")}
${dfaA.getrennt?wert("Länge Seitenteil rechts",Lr>0?dfaMm(Lr)+" mm":"–"):""}
${wert("Anzahl Bleilappen",bl.gesamt!==null?String(bl.gesamt):"–")}
</div>`;
}
function dfaMasseHtml(){
 const a=dfaA;
 const seitenWahl=a.getrennt?`<div class="bar" style="margin-top:8px">
<button type="button" class="gray${a.skizzeSeite!=="r"?" blue":""}" data-dfa-skizze="l">Linke Seite</button>
<button type="button" class="gray${a.skizzeSeite==="r"?" blue":""}" data-dfa-skizze="r">Rechte Seite</button>
</div>`:"";
 return dfaUebersichtHtml()+`<div class="info">Alle Masse in mm, längs des Dachs gemessen - genau
gleich vermasst wie bei der Kamineinfassung. <b>${dfaBuchstabe("b")}</b> und <b>${dfaBuchstabe("c")}</b>
überlappen sich im Knick – die Länge des Seitenteils ist deshalb ${dfaBuchstabe("b")} + ${dfaBuchstabe("c")}
− ${dfaBuchstabe("ueberlappung")}. Vorne ist die Aufbordung niedriger und hat oben einen Saum; hinten
ist sie höher und bewusst trapezförmig – Breite oben ist kleiner als Breite unten.</div>
<div class="grid">
${dfaSeitenFeld(dfaMassLabel("a"),"dfa_a",true,dfaSettings.mass_vorne)}
${dfaSeitenFeld(dfaMassLabel("b"),"dfa_b",true)}
${dfaSeitenFeld(dfaMassLabel("c"),"dfa_c",true)}
${dfaZahlFeld(dfaMassLabel("ueberlappung"),"dfa_ueberlappung",a.ueberlappung,"1",true,dfaSettings.ueberlappung)}
${dfaSeitenFeld(dfaMassLabel("d"),"dfa_d",true,dfaSettings.mass_hinten)}
${dfaZahlFeld(dfaMassLabel("aufVorne"),"dfa_aufVorne",a.aufVorne,"1",true,dfaSettings.auf_vorne)}
${dfaZahlFeld(dfaMassLabel("aufHinten"),"dfa_aufHinten",a.aufHinten,"1",true,dfaSettings.auf_hinten)}
${dfaZahlFeld(dfaMassLabel("saumVorne"),"dfa_saumVorne",a.saumVorne,"1",true,dfaSettings.saum_vorne)}
${dfaZahlFeld(dfaMassLabel("breiteOben"),"dfa_breiteOben",a.breiteOben,"1",true,dfaSettings.breite_oben)}
${dfaZahlFeld(dfaMassLabel("breiteUnten"),"dfa_breiteUnten",a.breiteUnten,"1",true,dfaSettings.breite_unten)}
${dfaZahlFeld(dfaMassLabel("randAbstand"),"dfa_randAbstand",a.randAbstand,"1",true,dfaSettings.rand_abstand)}
${dfaZahlFeld(dfaMassLabel("randStrich"),"dfa_randStrich",a.randStrich,"1",true,dfaSettings.rand_strich)}
${dfaZahlFeld(dfaMassLabel("e")+", hinter "+dfaBuchstabe("d"),"dfa_e",a.e,"1",true,dfaSettings.e)}
${dfaZahlFeld(dfaMassLabel("eUmschlag"),"dfa_eUmschlag",a.eUmschlag,"1",true,dfaSettings.e_umschlag)}
${dfaZahlFeld(dfaMassLabel("anreiff")+", vor "+dfaBuchstabe("a"),"dfa_anreiff",a.anreiff,"1",true,dfaSettings.anreiff)}
${dfaZahlFeld(dfaMassLabel("anreiffUmschlag"),"dfa_anreiffUmschlag",a.anreiffUmschlag,"1",true,dfaSettings.anreiff_umschlag)}
</div>
<div class="small" style="color:var(--muted);margin-top:4px">${dfaBuchstabe("b")} und ${dfaBuchstabe("c")}
überlappen sich im Knick – die Länge ist deshalb ${dfaBuchstabe("b")} + ${dfaBuchstabe("c")} − ${dfaBuchstabe("ueberlappung")}.</div>
<h2 style="margin-top:14px">Seitliche Masse</h2>
<div class="grid">
${dfaSeitenFeld(dfaMassLabel("f"),"dfa_f",true)}
${dfaSeitenFeld(dfaMassLabel("g"),"dfa_g",true)}
</div>
${dfaKennzahlenHtml()}
<h2 style="margin-top:14px">Schnitt</h2>
${seitenWahl}
<div id="dfa_skizze" class="eb-diagram-box eb-diagram-scroll" style="margin-top:8px">${dfaSkizze()}</div>`;
}
function dfaUmschlaegeHtml(){
 const a=dfaA;
 const t=dfaZuschnitte();
 const zeile=x=>`<tr><td>${esc(x.name)}${x.seite?" "+esc(x.seite):""}</td>
<td>${dfaMm(x.laenge)}</td><td><b>${dfaMm(x.breite)}</b></td></tr>`;
 return `<div class="info">Die Umschläge stecken in der Abwicklung, die Breiten sind die
Zuschnittlängen von Vorder- und Hinterteil. Die Seitenteile bekommen ihre Länge aus
${dfaBuchstabe("b")} und ${dfaBuchstabe("c")}.</div>
<div class="grid">
${dfaZahlFeld(dfaMassLabel("umschlagVorne"),"dfa_umschlagVorne",a.umschlagVorne,"1",true,dfaSettings.umschlag_vorne)}
${dfaZahlFeld(dfaMassLabel("umschlagSeite")+" (beide Seiten gleich)","dfa_umschlagSeite",a.umschlagSeite,"1",true,dfaSettings.umschlag_seite)}
${dfaZahlFeld(dfaMassLabel("breiteVorne"),"dfa_breiteVorne",a.breiteVorne,"1",true)}
${dfaZahlFeld(dfaMassLabel("breiteHinten"),"dfa_breiteHinten",a.breiteHinten,"1",true)}
</div>
<h2 style="margin-top:14px">Vorschau</h2>
<div class="scroll" id="dfa_vorschau"><table class="eb-table ra-tab">
<thead><tr><th>Teil</th><th>Länge (mm)</th><th>Abwicklung (mm)</th></tr></thead>
<tbody>${t.map(zeile).join("")}</tbody></table></div>`;
}
function dfaStuecklisteHtml(){
 const t=dfaZuschnitte();
 const bl=dfaBleilappen();
 const offen=t.filter(x=>!(x.laenge>0)||!(x.breite>0));
 const zeilen=t.map(x=>`<tr>
<td>${x.nr}</td><td>${esc(x.name)}${x.seite?" <span class=\"small\">"+esc(x.seite)+"</span>":""}</td>
<td><b>${esc(zuMasse(x.laenge,x.breite))}</b></td>
<td class="small">${esc(x.teile.filter(p=>dfaZahl(p.wert)>0)
  .map(p=>p.name+" "+dfaMm(p.wert)).join(" + ")||"–")}</td></tr>`).join("");
 const lappen=bl.gesamt===null
  ? `<div class="ra-warnung">Ohne Lattenabstand kann die Anzahl Bleilappen nicht
berechnet werden – bitte in den Grunddaten eintragen.</div>`
  : `<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Seitenteil</th><th>Länge (mm)</th><th>Bleilappen</th></tr></thead>
<tbody>${bl.zeilen.map(x=>`<tr><td>${esc(x.name)}</td><td>${dfaMm(x.laenge)}</td>
<td>${x.anzahl===null?"–":x.anzahl}</td></tr>`).join("")}
<tr><td colspan="2"><b>Gesamt</b></td><td><b>${bl.gesamt}</b></td></tr></tbody></table></div>
<div class="small" style="color:var(--muted);margin-top:4px">Je Seitenteil aufgerundet aus
Länge ÷ Lattenabstand (${dfaMm(bl.lattenabstand)} mm) – ein Lappen je Ziegelreihe.</div>`;
 return `<div class="info">Acht Zuschnitte: Vorderteil, Hinterteil und je drei Seitenteile
(vorne, Mitte, hinten) links und rechts. Die Abwicklung entsteht aus den erfassten Massen –
hier wird nichts von Hand eingegeben.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Teil</th><th>Zuschnitt (Länge × Breite)</th><th>Abwicklung aus</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
${offen.length?`<div class="ra-warnung" style="margin-top:8px">${offen.length} Teil(e) haben
noch keine vollständigen Masse und kommen deshalb nicht in den Zuschnitt.</div>`:""}
<h2 style="margin-top:14px">Bleilappen</h2>
${lappen}`;
}
function dfaAusmassHtml(){
 const z=dfaAusmassZeilen();
 const mat=dfaMaterialTabelle();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst die Masse erfassen.</div>`;
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe. Ohne
Artikelnummern und ohne Preise – die Materialliste der Firma kommt später dazu.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td>
<td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:14px">Material</h2>
${mat.length?`<div class="ra-ok">${esc(mat[0].name)}</div>`
 :`<div class="ra-warnung">Es ist noch kein Material gewählt.</div>`}`;
}
function dfaKontrolleHtml(){
 const m=dfaPruefungen(), a=dfaA;
 const bl=dfaBleilappen();
 const zeile=(n,w)=>`<tr><td>${esc(n)}</td><td>${esc(w)}</td></tr>`;
 const seitig=(n,k,e)=>a.getrennt
  ? zeile(n,(dfaSeite(k,"l")||"–")+" / "+(dfaSeite(k,"r")||"–")+" "+e+" (links / rechts)")
  : zeile(n,(dfaSeite(k,"l")||"–")+" "+e);
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
${zeile("Material",dfaMaterialText())}
${zeile("Deckungsmaterial",dfaDeckungText())}
${seitig(dfaMassLabel("a"),"a","mm")}
${seitig(dfaMassLabel("b"),"b","mm")}
${seitig(dfaMassLabel("c"),"c","mm")}
${zeile(dfaBuchstabe("ueberlappung")+" · Überlappung Knick",dfaMm(a.ueberlappung)+" mm")}
${seitig(dfaMassLabel("d"),"d","mm")}
${seitig(dfaMassLabel("f"),"f","mm")}
${seitig(dfaMassLabel("g"),"g","mm")}
${zeile(dfaMassLabel("aufVorne"),dfaMm(a.aufVorne)+" mm")}
${zeile(dfaMassLabel("aufHinten"),dfaMm(a.aufHinten)+" mm")}
${zeile(dfaMassLabel("saumVorne"),dfaMm(a.saumVorne)+" mm")}
${zeile(dfaBuchstabe("breiteOben")+" / "+dfaBuchstabe("breiteUnten")+" · Breite oben / unten (Trapez hinten)",dfaMm(a.breiteOben)+" / "+dfaMm(a.breiteUnten)+" mm")}
${zeile(dfaBuchstabe("randAbstand")+" / "+dfaBuchstabe("randStrich")+" · Abdeckkappe oben / nach unten",dfaMm(a.randAbstand)+" / "+dfaMm(a.randStrich)+" mm")}
${zeile(dfaBuchstabe("e")+" / "+dfaBuchstabe("eUmschlag")+" · Aufbug hinten / Umschlag",dfaMm(a.e)+" / "+dfaMm(a.eUmschlag)+" mm")}
${zeile(dfaBuchstabe("anreiff")+" / "+dfaBuchstabe("anreiffUmschlag")+" · Anreiff vorne / Umschlag",dfaMm(a.anreiff)+" / "+dfaMm(a.anreiffUmschlag)+" mm")}
${zeile(dfaBuchstabe("breiteVorne")+" / "+dfaBuchstabe("breiteHinten")+" · Breite vorne / hinten",dfaMm(a.breiteVorne)+" / "+dfaMm(a.breiteHinten)+" mm")}
${zeile(dfaBuchstabe("umschlagVorne")+" / "+dfaBuchstabe("umschlagSeite")+" · Winkel auf Fensterrahmen / Umschlag Seite",dfaMm(a.umschlagVorne)+" / "+dfaMm(a.umschlagSeite)+" mm")}
${zeile("Blechfläche",dfaQm(dfaFlaecheM2())+" m²")}
${zeile("Bleilappen",bl.gesamt!==null?String(bl.gesamt):"–")}
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register und Blaettern -----------------------------------------------
function dfaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function dfaSetzeSchritt(n){
 dfaSchritt=Math.max(1,Math.min(DFA_REGISTER.length,Number(n)||1));
 renderDfaAufnahme();
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("dfa_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function dfaRegisterHtml(){
 const pr=dfaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return raFortschrittHtml(dfaSchritt,DFA_REGISTER.length)+`<div class="ra-register" id="dfa_register">`+DFA_REGISTER.map(r=>{
  const marke=r.nr===DFA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===dfaSchritt?" aktiv":""}" data-dfa-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}${raRegisterHakenHtml(dfaBestaetigt,r.nr)}</button>`;
 }).join("")+`</div>`;
}
function dfaKopfInhalt(){
 if(dfaSchritt===1)return dfaKarte("1 · Grunddaten",dfaGrunddatenHtml());
 if(dfaSchritt===2)return dfaKarte("2 · Fenstermasse",dfaMasseHtml());
 if(dfaSchritt===3)return dfaKarte("3 · Umschläge und Breiten",dfaUmschlaegeHtml());
 if(dfaSchritt===4)return dfaKarte("4 · Stückliste",dfaStuecklisteHtml());
 if(dfaSchritt===5){
  const kzp=dfaZuschnittPlan();
  return dfaKarte(zuTitel(5,kzp.art),
   zuAuswahlHtml(dfaA.rollenAuswahl,"data-dfa-rolle",kzp.art)+zuschnittHtml(kzp));
 }
 if(dfaSchritt===6)return dfaKarte("6 · Ausmass und Material",dfaAusmassHtml());
 return dfaKarte("7 · Kontrolle",dfaKontrolleHtml());
}
function renderDfaAufnahme(){
 const ziel=$("dfaAufnahme");
 if(!ziel)return;
 dfaVerdrahten();
 dfaZeichnet=true;
 try{
 ziel.innerHTML=dfaRegisterHtml()+dfaKopfInhalt()+`<div class="bar ra-blaettern">
<button type="button" class="gray" id="dfa_zurueck"${dfaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="dfa_weiter">${
 dfaSchritt>=DFA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(DFA_REGISTER[dfaSchritt].kurz)}</button>
</div>`;
 }finally{dfaZeichnet=false}
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("dfa_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
function dfaLive(){
 const kenn=$("dfa_kennzahlen");
 if(kenn){
  const neu=document.createElement("div");
  neu.innerHTML=dfaKennzahlenHtml();
  const frisch=neu.firstElementChild;
  if(frisch)kenn.innerHTML=frisch.innerHTML;
 }
 const skizze=$("dfa_skizze");
 if(skizze)skizze.innerHTML=dfaSkizze();
 const vor=$("dfa_vorschau");
 if(vor){
  const t=dfaZuschnitte();
  vor.innerHTML=`<table class="eb-table ra-tab">
<thead><tr><th>Teil</th><th>Länge (mm)</th><th>Abwicklung (mm)</th></tr></thead>
<tbody>${t.map(x=>`<tr><td>${esc(x.name)}${x.seite?" "+esc(x.seite):""}</td>
<td>${dfaMm(x.laenge)}</td><td><b>${dfaMm(x.breite)}</b></td></tr>`).join("")}</tbody></table>`;
 }
 const pr=dfaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#dfa_register [data-dfa-schritt="'+DFA_KONTROLLE+'"]');
 if(knopf){
  const alt=knopf.querySelector(".ra-register-punkt");
  if(alt)alt.remove();
  if(pr.length){
   const s=document.createElement("span");
   s.className="ra-register-punkt"+(fehler?" fehler":"");
   knopf.appendChild(s);
  }
 }
}
// Zuordnung Eingabefeld -> Zustand. Seitenfelder tragen "_l" bzw. "_r".
const DFA_FELDER={dfa_ueberlappung:"ueberlappung",
 dfa_aufVorne:"aufVorne",dfa_aufHinten:"aufHinten",
 dfa_saumVorne:"saumVorne",dfa_breiteOben:"breiteOben",dfa_breiteUnten:"breiteUnten",
 dfa_randAbstand:"randAbstand",dfa_randStrich:"randStrich",
 dfa_e:"e",dfa_eUmschlag:"eUmschlag",dfa_anreiff:"anreiff",dfa_anreiffUmschlag:"anreiffUmschlag",
 dfa_breiteVorne:"breiteVorne",dfa_breiteHinten:"breiteHinten",
 dfa_umschlagVorne:"umschlagVorne",
 dfa_umschlagSeite:"umschlagSeite",dfa_lattenabstand:"lattenabstand"};
const DFA_SEITENFELDER={dfa_a:"a",dfa_b:"b",dfa_c:"c",dfa_d:"d",dfa_f:"f",dfa_g:"g"};
function dfaFeldZuweisen(id,wert){
 if(DFA_FELDER[id]!==undefined){dfaA[DFA_FELDER[id]]=wert;return true}
 const m=/^(dfa_[a-zA-Z]+)_(l|r)$/.exec(id);
 if(m&&DFA_SEITENFELDER[m[1]]!==undefined){
  const feld=DFA_SEITENFELDER[m[1]];
  if(!dfaA[feld]||typeof dfaA[feld]!=="object")dfaA[feld]={l:"",r:""};
  dfaA[feld][m[2]]=wert;
  if(!dfaA.getrennt&&m[2]==="l")dfaA[feld].r=wert;
  return true;
 }
 return false;
}
function dfaVerdrahten(){
 const wurzel=$("measTypeDachfenster");
 if(!wurzel||wurzel.dataset.dfaVerdrahtet)return;
 wurzel.dataset.dfaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  if(dfaZeichnet)return;
  if(!dfaFeldZuweisen(e.target.id,e.target.value))return;
  dfaLive();
 });

 wurzel.addEventListener("change",e=>{
  if(dfaZeichnet)return;
  const t=e.target;
  {const w=zuRollenKlick(t,"data-dfa-rolle");
   if(w!==null){dfaA.rollenAuswahl=w; renderDfaAufnahme(); return}}
  if(t.id==="dfa_material"){dfaA.material=t.value; renderDfaAufnahme(); return}
  if(t.id==="dfa_deckung"){dfaA.deckung=t.value; renderDfaAufnahme(); return}
  if(t.id==="dfa_getrennt"){
   dfaA.getrennt=!!t.checked;
   if(dfaA.getrennt)Object.keys(DFA_SEITENFELDER).forEach(k=>{
    const f=DFA_SEITENFELDER[k];
    if(dfaA[f]&&(dfaA[f].r===""||dfaA[f].r===null||dfaA[f].r===undefined))dfaA[f].r=dfaA[f].l;
   });
   renderDfaAufnahme(); return;
  }
  if(dfaFeldZuweisen(t.id,t.value)){dfaLive(); return}
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-dfa-schritt]");
  if(reg){dfaSetzeSchritt(reg.dataset.dfaSchritt);return}
  const sk=t.closest("[data-dfa-skizze]");
  if(sk){dfaA.skizzeSeite=sk.dataset.dfaSkizze==="r"?"r":"l"; renderDfaAufnahme(); return}
  if(t.id==="dfa_zurueck"){dfaSetzeSchritt(dfaSchritt-1);return}
  if(t.id==="dfa_weiter"){
   if(!pflichtPruefenUndSpringen(wurzel))return;
   dfaBestaetigt.add(dfaSchritt);
   if(dfaSchritt>=DFA_REGISTER.length)dfaAbschluss();
   else dfaSetzeSchritt(dfaSchritt+1);
   return;
  }
  if(t.id==="dfa_einstellungen"){
   if(typeof renderSettings!=="function")return;
   settingsReturnToMeasurement=true;
   $("measurementEditModal").hidden=true;
   renderSettings();
   if(typeof applyCompanyName==="function")applyCompanyName();
   applyDfaSettings();
   document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab==="measurements"));
   document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!=="measurements")});
   const sec=document.querySelector('.settings-section[data-section="dachfenstereinfassung"]');
   if(sec)sec.classList.add("open");
   $("settingsModal").hidden=false;
   return;
  }
 });
}

// ---- Einstellungsseite ----------------------------------------------------
// v3.94: dieselbe Umstellung wie applyKaminSettings() (js/37) - die
// Firmen-Einstellungen-Labels kommen jetzt live aus DFA_MASSLISTE statt aus
// von Hand getipptem Text. Zwei Felder nennen zusaetzlich einen ANDEREN
// Buchstaben zur Einordnung ("hinter R", "vor C") - dieser Verweis wird
// ebenfalls live berechnet (dfaBuchstabe), damit er nach einer kuenftigen
// Massaenderung nicht wie einst Mass R (v3.90) veraltet stehen bleibt.
function dfaEinstellungenLabelBefuellen(){
 const setzen=(id,k)=>{const el=$(id); if(el)el.textContent=dfaMassLabel(k)};
 setzen("dfasUmschlagVorne_lbl","umschlagVorne");
 setzen("dfasUmschlagSeite_lbl","umschlagSeite");
 setzen("dfasUeberlappung_lbl","ueberlappung");
 setzen("dfasMassVorne_lbl","a");
 setzen("dfasMassHinten_lbl","d");
 setzen("dfasSaumVorne_lbl","saumVorne");
 setzen("dfasBreiteOben_lbl","breiteOben");
 setzen("dfasBreiteUnten_lbl","breiteUnten");
 setzen("dfasRandAbstand_lbl","randAbstand");
 setzen("dfasRandStrich_lbl","randStrich");
 setzen("dfasE_lbl","e");
 setzen("dfasEUmschlag_lbl","eUmschlag");
 setzen("dfasAnreiff_lbl","anreiff");
 setzen("dfasAnreiffUmschlag_lbl","anreiffUmschlag");
 setzen("dfasAufVorne_lbl","aufVorne");
 setzen("dfasAufHinten_lbl","aufHinten");
 const ref=(id,k)=>{const el=$(id); if(el)el.textContent=dfaBuchstabe(k)};
 ref("dfasE_ref","d");
 ref("dfasAnreiff_ref","a");
}
function applyDfaSettings(){
 dfaEinstellungenLabelBefuellen();
 if(!$("dfasUmschlagVorne"))return;
 const s=dfaSettings;
 const sel=$("dfasDeckung");
 if(sel&&document.activeElement!==sel&&typeof EINF_DECKUNGEN==="object"){
  sel.innerHTML=Object.keys(EINF_DECKUNGEN)
   .map(k=>`<option value="${k}"${k===s.deckung?" selected":""}>${anbEsc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 }
 const setzen=(id,wert)=>{const el=$(id); if(el&&document.activeElement!==el)el.value=wert};
 setzen("dfasLattenabstand",s.lattenabstand);
 setzen("dfasUmschlagVorne",s.umschlag_vorne);
 setzen("dfasUmschlagSeite",s.umschlag_seite);
 setzen("dfasSaumVorne",s.saum_vorne);
 setzen("dfasBreiteOben",s.breite_oben);
 setzen("dfasBreiteUnten",s.breite_unten);
 setzen("dfasRandAbstand",s.rand_abstand);
 setzen("dfasRandStrich",s.rand_strich);
 setzen("dfasE",s.e);
 setzen("dfasEUmschlag",s.e_umschlag);
 setzen("dfasAnreiff",s.anreiff);
 setzen("dfasAnreiffUmschlag",s.anreiff_umschlag);
 setzen("dfasUeberlappung",s.ueberlappung);
 setzen("dfasMassVorne",s.mass_vorne);
 setzen("dfasMassHinten",s.mass_hinten);
 setzen("dfasAufVorne",s.auf_vorne);
 setzen("dfasAufHinten",s.auf_hinten);
}
(function dfaEinstellungenBinden(){
 if(!$("saveDfaSettings"))return;
 applyDfaSettings();
 $("saveDfaSettings").onclick=()=>{
  const zahl=id=>Number($(id).value);
  const w={
   deckung:$("dfasDeckung").value,
   lattenabstand:zahl("dfasLattenabstand")||0,
   umschlag_vorne:zahl("dfasUmschlagVorne")||0,
   umschlag_seite:zahl("dfasUmschlagSeite")||0,
   saum_vorne:zahl("dfasSaumVorne")||0,
   breite_oben:zahl("dfasBreiteOben")||0,
   breite_unten:zahl("dfasBreiteUnten")||0,
   rand_abstand:zahl("dfasRandAbstand")||0,
   rand_strich:zahl("dfasRandStrich")||0,
   e:zahl("dfasE")||0,
   e_umschlag:zahl("dfasEUmschlag")||0,
   anreiff:zahl("dfasAnreiff")||0,
   anreiff_umschlag:zahl("dfasAnreiffUmschlag")||0,
   ueberlappung:zahl("dfasUeberlappung")||0,
   mass_vorne:zahl("dfasMassVorne")||0,
   mass_hinten:zahl("dfasMassHinten")||0,
   auf_vorne:zahl("dfasAufVorne")||0,
   auf_hinten:zahl("dfasAufHinten")||0
  };
  if(typeof EINF_DECKUNGEN==="object"&&!EINF_DECKUNGEN[w.deckung]){alert("Bitte ein Deckmaterial wählen.");return}
  if(Object.keys(w).filter(k=>k!=="deckung").some(k=>w[k]<0)){alert("Diese Werte dürfen nicht negativ sein.");return}
  if(w.breite_unten<=w.breite_oben){alert("Breite unten muss grösser sein als Breite oben.");return}
  dfaEinstellungenSichern(w);
  applyDfaSettings();
  alert("Gespeichert (gilt nur für dieses Gerät).");
 };
 $("resetDfaSettings").onclick=()=>{
  if(!confirm("Alle Werte der Dachfenstereinfassung auf die Standardwerte zurücksetzen?"))return;
  dfaEinstellungenSichern(Object.assign({},DFA_STANDARD));
  applyDfaSettings();
  alert("Auf Standardwerte zurückgesetzt.");
 };
})();

// ---- Speichern / Laden ----------------------------------------------------
// Alles, was gerechnet wurde, wird mitgespeichert - ein spaeter gedrucktes
// PDF bleibt dadurch gleich, auch wenn eine Einstellung geaendert wird.
function dfaDaten(){
 const a=dfaA;
 const rp=dfaRollenPlan();
 const bl=dfaBleilappen();
 const paar=k=>({l:dfaSeite(k,"l"),r:dfaSeite(k,"r")});
 return {
  material:a.material, deckung:a.deckung, lattenabstand:dfaZahl(a.lattenabstand),
  getrennt:!!a.getrennt,
  a:paar("a"), d:paar("d"), ueberlappung:dfaZahl(a.ueberlappung),
  saumVorne:dfaZahl(a.saumVorne), breiteOben:dfaZahl(a.breiteOben), breiteUnten:dfaZahl(a.breiteUnten),
  randAbstand:dfaZahl(a.randAbstand), randStrich:dfaZahl(a.randStrich),
  e:dfaZahl(a.e), eUmschlag:dfaZahl(a.eUmschlag), anreiff:dfaZahl(a.anreiff), anreiffUmschlag:dfaZahl(a.anreiffUmschlag),
  breiteVorne:dfaZahl(a.breiteVorne), breiteHinten:dfaZahl(a.breiteHinten),
  umschlagVorne:dfaZahl(a.umschlagVorne), umschlagSeite:dfaZahl(a.umschlagSeite),
  b:paar("b"), c:paar("c"), f:paar("f"), g:paar("g"),
  aufVorne:dfaZahl(a.aufVorne), aufHinten:dfaZahl(a.aufHinten),
  laenge:{l:dfaLaenge("l"),r:dfaLaenge("r")},
  zuschnitte:dfaZuschnitte(),
  bleilappen:bl,
  flaeche_m2:Number(dfaFlaecheM2().toFixed(3)),
  ausmass:dfaAusmassZeilen(),
  kontrolle:dfaPruefungen(),
  rollen:{auswahl:(a.rollenAuswahl||[]).slice(),
          breiten:dfaRollenbreiten(),
          form:rp.form, formGrund:rp.formGrund||"", formQuelle:rp.formQuelle||"",
          formLaenge:rp.bestes?(rp.bestes.laenge||null):null,
          netto:Number(rp.netto.toFixed(3)),
          bestes:rp.bestes||null,
          moeglich:rp.moeglich||[],
          gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
            abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
            // v3.85: abschnittLaenge/abschnittNr je Streifen mitspeichern -
            // siehe js/29 ebaZusatzDaten fuer die ausfuehrliche Begruendung.
            streifen:(g.streifen||[]).map(s=>({
              stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
              rest:s.rest,abschnittLaenge:s.abschnittLaenge,abschnittNr:s.abschnittNr}))})),
          optimal:rp.optimal!==false,
          ausResten:ebaAusRestenSpeicher(rp.ausResten)}
 };
}
function dfaZuruecksetzen(){
 dfaA=dfaLeer();
 dfaSchritt=1;
 dfaBestaetigt=new Set();
 renderDfaAufnahme();
}
function dfaFuellen(d){
 const w=d||{};
 const a=dfaLeer();
 // Wie bei der Kamineinfassung: A und D gelten fuer eine NEUE Aufnahme aus
 // den Einstellungen, bei einem gespeicherten Datensatz wird nichts erfunden
 // - fehlt eines der beiden dort, bleiben sie leer. dfaLeer() setzt a und d
 // bereits auf {l:"",r:""}, das Einlesen unten (zusammen mit b/c/f/g)
 // uebernimmt nur, was tatsaechlich gespeichert war.
 const nimm=(k,ziel)=>{if(w[k]===0||w[k])a[ziel||k]=w[k]};
 a.material=w.material??"";
 if(w.deckung&&(typeof EINF_DECKUNGEN!=="object"||EINF_DECKUNGEN[w.deckung]))a.deckung=w.deckung;
 ["lattenabstand","ueberlappung","saumVorne","breiteOben","breiteUnten","randAbstand","randStrich",
  "e","eUmschlag","anreiff","anreiffUmschlag",
  "breiteVorne","breiteHinten","umschlagVorne","umschlagSeite"].forEach(k=>nimm(k));
 // aufVorne/aufHinten sind seit dieser Version nicht mehr seitenabhaengig.
 // Aeltere Datensaetze koennen sie noch als {l,r}-Objekt tragen (aus der Zeit,
 // als sie ueber "Links und rechts getrennt erfassen" liefen) - dort wird das
 // GROESSERE Mass uebernommen (dieselbe Regel wie das frueher verwendete
 // Maximum aus beiden Seiten), damit sich am gerechneten Ergebnis nichts
 // aendert.
 ["aufVorne","aufHinten"].forEach(k=>{
  const v=w[k];
  if(v&&typeof v==="object")a[k]=Math.max(dfaZahl(v.l),dfaZahl(v.r));
  else if(v===0||v)a[k]=v;
 });
 a.getrennt=!!w.getrennt;
 ["a","b","c","d","f","g"].forEach(k=>{
  const v=w[k];
  if(v&&typeof v==="object")a[k]={l:(v.l===0||v.l)?v.l:"",r:(v.r===0||v.r)?v.r:""};
  else if(v===0||v)a[k]={l:v,r:v};
  else a[k]={l:"",r:""};
 });
 const rq=(w.rollen&&w.rollen.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 dfaA=a;
 dfaSchritt=1;
 // v3.94: eine geladene Aufnahme, die beim Speichern schon fehlerfrei war,
 // zeigt den Haken gleich an allen Registern ausser der Kontrolle selbst -
 // ohne Fehler in dfaPruefungen() gibt es dort nichts nachzuholen.
 dfaBestaetigt=dfaPruefungen().some(x=>x.art==="fehler")
  ?new Set():new Set(DFA_REGISTER.filter(r=>r.nr!==DFA_KONTROLLE).map(r=>r.nr));
 renderDfaAufnahme();
}
