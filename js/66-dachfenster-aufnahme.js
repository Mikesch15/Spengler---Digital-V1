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
// Vier Zuschnitte: Vorderteil und Hinterteil (quer zum Fenster, Breite = vom
// Anwender erfasste Zuschnittlaenge, Abwicklung aus Umschlag + Aufbordung +
// Saum), dazu je ein Seitenteil links und rechts (Laenge = B+C-Knick laengs
// Dach, Abwicklung aus Umschlag + der GROESSEREN der beiden Aufbordungshoehen
// dieser Seite - dieselbe Vereinfachung wie bei der Kamineinfassung, die
// durchgehend mit der groesseren Hoehe rechnet statt eine ueber die Laenge
// veraenderliche Blechbreite anzunehmen).
// ===========================================================================

const DFA_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Fenstermasse",hilfe:"dfa-masse"},
 {nr:3,kurz:"Umschläge",hilfe:"dfa-umschlaege"},{nr:4,kurz:"Stückliste",hilfe:"dfa-stueckliste"},
 {nr:5,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:6,kurz:"Ausmass",hilfe:"reg-ausmass"},
 {nr:7,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
const DFA_KONTROLLE=DFA_REGISTER.length;
let dfaSchritt=1;
// Siehe kamaZeichnet (js/37) fuer die Begruendung dieser Sperre.
let dfaZeichnet=false;

const dfaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const dfaMm=v=>Math.round(dfaZahl(v)).toLocaleString("de-CH");
const dfaQm=v=>dfaZahl(v).toFixed(2).replace(".",",");

// ---- Einstellungen (je Geraet, wie bei der Kamineinfassung) ---------------
const DFA_STANDARD=Object.freeze({
 deckung:"biber_einfach",
 lattenabstand:330,
 umschlag_vorne:20, umschlag_hinten:20, umschlag_seite:20,
 saum_vorne:50,          // Rueckschlag am oberen Rand der vorderen Aufbordung
 breite_oben:90,         // Kopfbreite der hinteren Aufbordung (Trapez oben)
 breite_unten:125,       // Fussbreite der hinteren Aufbordung (Trapez unten)
 rand_abstand:15,        // obere Ecke bis zum gestrichelten Strich am Kopf
 rand_strich:12,         // Laenge dieses Strichs (senkrecht)
 ueberlappung:120,       // Ueberlappung der Seitenteile (Knick) - wie kam
 mass_vorne:183,         // A, vorne auf Deckmaterial bis Vorderkant Aufbordung
 mass_hinten:200,        // D, Hinterkant Aufbordung bis hinten unter Deckmaterial
 auf_vorne:80,           // Aufbordungshoehe vorne (talseitig), Vorgabe
 auf_hinten:120,         // Aufbordungshoehe hinten (bergseitig), Vorgabe
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
 const s=dfaSettings||DFA_STANDARD;
 return {
  material:"", deckung:s.deckung, lattenabstand:s.lattenabstand,
  getrennt:false, skizzeSeite:"l",
  a:s.mass_vorne, d:s.mass_hinten, ueberlappung:s.ueberlappung,
  saumVorne:s.saum_vorne, breiteOben:s.breite_oben, breiteUnten:s.breite_unten,
  randAbstand:s.rand_abstand, randStrich:s.rand_strich,
  e:s.e, eUmschlag:s.e_umschlag, anreiff:s.anreiff, anreiffUmschlag:s.anreiff_umschlag,
  umschlagVorne:s.umschlag_vorne, umschlagHinten:s.umschlag_hinten, umschlagSeite:s.umschlag_seite,
  breiteVorne:"", breiteHinten:"",
  b:{l:"",r:""}, c:{l:"",r:""},
  aufVorne:{l:s.auf_vorne,r:s.auf_vorne}, aufHinten:{l:s.auf_hinten,r:s.auf_hinten},
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
function dfaAufVorneMax(){ return Math.max(dfaSeite("aufVorne","l"),dfaSeite("aufVorne","r")) }
function dfaAufHintenMax(){ return Math.max(dfaSeite("aufHinten","l"),dfaSeite("aufHinten","r")) }
// Laenge laengs Dach - B und C ueberlappen sich um die Knickbreite, exakt wie
// kamaKaminLaenge() in js/37.
function dfaLaenge(seite,quelle){
 const q=quelle||dfaA;
 return dfaSeite("b",seite,q)+dfaSeite("c",seite,q)-dfaZahl(q.ueberlappung);
}

// ---- Die vier Zuschnitte -----------------------------------------------------
// Vorderteil und Hinterteil laufen quer zum Fenster, ihre Breite (Zuschnitt-
// laenge) wird direkt erfasst (wie Kamins Breite vorne/hinten). Die
// Seitenteile bekommen ihre Laenge (B+C-Knick) laengs Dach von der jeweiligen
// Seite.
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
 dazu("Vorderteil","vorne","",a.breiteVorne,[
  {name:"Umschlag vorne",wert:dfaZahl(a.umschlagVorne)},
  {name:"Aufbordungshöhe vorne",wert:dfaAufVorneMax()},
  {name:"Saum oben",wert:dfaZahl(a.saumVorne)},
  {name:"Anreiff",wert:dfaZahl(a.anreiff)},
  {name:"Umschlag Anreiff",wert:dfaZahl(a.anreiffUmschlag)}]);
 dazu("Hinterteil","hinten","",a.breiteHinten,[
  {name:"Umschlag hinten",wert:dfaZahl(a.umschlagHinten)},
  {name:"Aufbordungshöhe hinten",wert:dfaAufHintenMax()},
  {name:"Rand-Strich am Kopf",wert:dfaZahl(a.randStrich)},
  {name:"Aufbug hinten (E)",wert:dfaZahl(a.e)},
  {name:"Umschlag Aufbug",wert:dfaZahl(a.eUmschlag)}]);
 DFA_SEITEN.forEach(s=>{
  const h=Math.max(dfaSeite("aufVorne",s.k),dfaSeite("aufHinten",s.k));
  dazu("Seitenteil","seite",s.name,dfaLaenge(s.k),[
   {name:"Umschlag Seite",wert:dfaZahl(a.umschlagSeite)},
   {name:"Aufbordungshöhe (grösseres Mass)",wert:h}]);
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
 const A=dfaZahl(q.a), D=dfaZahl(q.d), Ue=dfaZahl(q.ueberlappung);
 const av=dfaSeite("aufVorne",seite,q), ah=dfaSeite("aufHinten",seite,q);
 const saum=dfaZahl(q.saumVorne), bo=dfaZahl(q.breiteOben), bu=dfaZahl(q.breiteUnten);
 const randAbstand=dfaZahl(q.randAbstand), randStrich=dfaZahl(q.randStrich);
 const E=dfaZahl(q.e), eUmschlag=dfaZahl(q.eUmschlag);
 const anreiff=dfaZahl(q.anreiff), anreiffUmschlag=dfaZahl(q.anreiffUmschlag);
 const B=dfaSeite("b",seite,q), C=dfaSeite("c",seite,q);
 const L=dfaLaenge(seite,q);
 if(!(av>0&&ah>0)||!(L>0)||!(bu>bo))
  return `<div class="ra-warnung">Für die Schnittskizze fehlen noch Masse: bitte
B, C, beide Aufbordungshöhen sowie Breite oben/unten (unten grösser als oben)
eingeben.</div>`;

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
 // Dach, ohne Pfeilspitzen (auf Wunsch entfernt).
 g+=linie(P(dachVon,0),P(dachBis,0),ANB_FARBE.deckLinie,3);
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
 if(A>0){g+=anbMassWaag(-A,0,0,"A = "+zahl(A),X,Y,true); merkMassWaag(-A,0,0,"A = "+zahl(A),true)}
 if(D>0){g+=anbMassWaag(L,L+D,0,"D = "+zahl(D),X,Y,true); merkMassWaag(L,L+D,0,"D = "+zahl(D),true)}
 g+=anbMassWaag(Q0[0],Q3[0],-34,"Breite unten = "+zahl(bu),X,Y,true);
 merkMassWaag(Q0[0],Q3[0],-34,"Breite unten = "+zahl(bu),true);
 if(knickDa){
  g+=anbMassWaag(knickVorne,knickHinten,av*0.5,"Knick "+zahl(Ue),X,Y,false);
  merkMassWaag(knickVorne,knickHinten,av*0.5,"Knick "+zahl(Ue),false);
 }
 if(B>0){g+=anbMassWaag(0,knickHinten,av+34,"B = "+zahl(B),X,Y,false); merkMassWaag(0,knickHinten,av+34,"B = "+zahl(B),false)}
 if(strichDa){
  const fahneR=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneR(Rs[0],ah-randStrich/2,-46,14,"Rand "+zahl(randAbstand)+" / "+zahl(randStrich));
 }
 g+=anbMassWaag(Q1[0],Q2[0],ah+34,"Breite oben = "+zahl(bo),X,Y,false);
 merkMassWaag(Q1[0],Q2[0],ah+34,"Breite oben = "+zahl(bo),false);
 if(C>0){g+=anbMassWaag(knickVorne,L,Math.max(av,ah)+72,"C = "+zahl(C),X,Y,false); merkMassWaag(knickVorne,L,Math.max(av,ah)+72,"C = "+zahl(C),false)}
 g+=anbMassSenk(0,av,dachVon-56,"Aufbordung vorne = "+zahl(av),X,Y);
 merkMassSenk(0,av,dachVon-56,"Aufbordung vorne = "+zahl(av));
 g+=anbMassSenk(0,ah,dachBis+22,"Aufbordung hinten = "+zahl(ah),X,Y);
 merkMassSenk(0,ah,dachBis+22,"Aufbordung hinten = "+zahl(ah));
 if(saum>0){
  const fahneS=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneS(0,av-saum/2,-40,-8,"Saum = "+zahl(saum));
 }
 // Hoch ueber der Zeichnung (wie C, nur noch hoeher) und zur Mitte hin
 // ausgerichtet - der Platz rechts von E bzw. links von Anreiff ist durch
 // die neue Bemassung "Aufbordung hinten/vorne" belegt (die es bei der
 // Kamineinfassung nicht gibt), der Platz zur Mitte hin ist frei.
 if(E>0){
  const fahneE=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneE(E1[0],E1[1],-8,-95,"E = "+zahl(E)+" · 90°"+(eUmschlag>0?" / Umschlag "+zahl(eUmschlag):""));
 }
 if(anreiff>0){
  const fahneF=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
  fahneF(F1[0],F1[1],8,-95,"Anreiff = "+zahl(anreiff)+(anreiffUmschlag>0?" / Umschlag "+zahl(anreiffUmschlag):""));
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
 if(Ll>0)zeile("Länge Seitenteil"+(dfaA.getrennt?" links":""),dfaMm(Ll),"mm","B + C − Überlappung");
 if(dfaA.getrennt&&Lr>0)zeile("Länge Seitenteil rechts",dfaMm(Lr),"mm","B + C − Überlappung");
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
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 fehlt(a.a,"Mass A (vorne auf Deckmaterial bis Vorderkant Aufbordung) fehlt.");
 fehlt(a.d,"Mass D (Hinterkant Aufbordung bis hinten unter Deckmaterial) fehlt.");
 fehlt(a.breiteVorne,"Die Breite vorne (Zuschnittlänge Vorderteil) fehlt.");
 fehlt(a.breiteHinten,"Die Breite hinten (Zuschnittlänge Hinterteil) fehlt.");
 fehlt(a.breiteOben,"Breite oben (Kopf der hinteren Aufbordung) fehlt.");
 fehlt(a.breiteUnten,"Breite unten (Fuss der hinteren Aufbordung) fehlt.");
 if(dfaZahl(a.breiteOben)>0&&dfaZahl(a.breiteUnten)>0&&dfaZahl(a.breiteUnten)<=dfaZahl(a.breiteOben))
  m.push({art:"fehler",text:"Breite unten muss grösser sein als Breite oben – sonst ist es kein Trapez."});
 DFA_SEITEN.forEach(s=>{
  const zusatz=a.getrennt?" ("+s.name+")":"";
  fehlt(dfaSeite("b",s.k),"Mass B, Vorderkant Aufbordung bis Hinterkant Knick"+zusatz+", fehlt.");
  fehlt(dfaSeite("c",s.k),"Mass C, Vorderkant Knick bis Hinterkant Aufbordung"+zusatz+", fehlt.");
  fehlt(dfaSeite("aufVorne",s.k),"Die Aufbordungshöhe vorne"+zusatz+" fehlt.");
  fehlt(dfaSeite("aufHinten",s.k),"Die Aufbordungshöhe hinten"+zusatz+" fehlt.");
  if(!a.getrennt)return;
 });
 [["a","Mass A"],["d","Mass D"],["ueberlappung","Überlappung"],
  ["saumVorne","Saum vorne"],["breiteOben","Breite oben"],["breiteUnten","Breite unten"],
  ["randAbstand","Rand-Abstand"],["randStrich","Rand-Strich"],
  ["e","Aufbug hinten"],["eUmschlag","Umschlag Aufbug"],
  ["anreiff","Anreiff vorne"],["anreiffUmschlag","Umschlag Anreiff"],
  ["breiteVorne","Breite vorne"],["breiteHinten","Breite hinten"],
  ["umschlagVorne","Umschlag vorne"],["umschlagHinten","Umschlag hinten"],
  ["umschlagSeite","Umschlag seitlich"],["lattenabstand","Lattenabstand"]].forEach(([k,name])=>{
  if(dfaZahl(a[k])<0)m.push({art:"fehler",text:name+" kann nicht negativ sein."});
 });
 DFA_SEITEN.forEach(s=>{
  ["b","c","aufVorne","aufHinten"].forEach(k=>{
   if(dfaSeite(k,s.k)<0)m.push({art:"fehler",text:"Ein seitliches Mass ist negativ ("+s.name+")."});
  });
  if(dfaSeite("aufVorne",s.k)>0&&dfaSeite("aufHinten",s.k)>0&&dfaZahl(a.saumVorne)>=dfaSeite("aufVorne",s.k))
   m.push({art:"warnung",text:"Der Saum vorne"+(a.getrennt?" ("+s.name+")":"")
     +" ist nicht kleiner als die Aufbordungshöhe vorne – der Saum liefe dann bis auf das Dach zurück."});
 });
 DFA_SEITEN.forEach(s=>{
  const L=dfaLaenge(s.k);
  const zusatz=a.getrennt?" ("+s.name+")":"";
  if(dfaSeite("b",s.k)>0&&dfaSeite("c",s.k)>0&&!(L>0))
   m.push({art:"fehler",text:"B + C ist nicht grösser als die Überlappung"+zusatz
     +" – daraus ergibt sich keine Länge."});
  if(dfaZahl(a.ueberlappung)>0&&dfaSeite("b",s.k)>0&&dfaSeite("b",s.k)<=dfaZahl(a.ueberlappung))
   m.push({art:"warnung",text:"Mass B"+zusatz+" ist nicht grösser als die Überlappung – "
     +"der Knick läge dann vor der Vorderkant Aufbordung."});
  if(!a.getrennt)return;
 });
 if(!(dfaZahl(a.lattenabstand)>0))
  m.push({art:"warnung",text:"Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden."});
 if(!a.deckung)m.push({art:"warnung",text:"Es ist noch kein Deckmaterial gewählt."});
 if(a.getrennt){
  const gleich=["b","c","aufVorne","aufHinten"].every(k=>dfaSeite(k,"l")===dfaSeite(k,"r"));
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

// ---- Anzeige --------------------------------------------------------------
function dfaKarte(titel,inhalt){
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,DFA_REGISTER):"";
 return `<div class="card"><h2>${esc(titel)}${h}</h2>${inhalt}</div>`;
}
function dfaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function dfaZahlFeld(label,id,wert,schritt,pflicht){
 return dfaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${
   pflicht?' data-pflicht="1"':""} inputmode="${
   (schritt&&schritt!=="1")?"decimal":"numeric"}" value="${
   wert===""||wert===null||wert===undefined?"":esc(wert)}">`);
}
function dfaSeitenFeld(label,basis,pflicht){
 const feld=(typeof DFA_SEITENFELDER==="object"&&DFA_SEITENFELDER[basis])
   ||String(basis).replace(/^dfa_/,"");
 const w=dfaA[feld]||{l:"",r:""};
 if(!dfaA.getrennt)
  return dfaZahlFeld(label,basis+"_l",w.l,"1",pflicht);
 return dfaZahlFeld(label+" · links",basis+"_l",w.l,"1",pflicht)
   +dfaZahlFeld(label+" · rechts",basis+"_r",w.r,"1",pflicht);
}
function dfaGrunddatenHtml(){
 const a=dfaA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const deckOpt=Object.keys((typeof EINF_DECKUNGEN==="object"?EINF_DECKUNGEN:{}))
  .map(k=>`<option value="${esc(k)}"${k===a.deckung?" selected":""}>${esc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 return `<div class="info">Einfassung eines Dachfensters. Erfasst wird die
senkrechte Aufbordung: vorne (talseitig, mit Saum) niedriger, hinten (bergseitig,
mit Trapezform) höher – dazwischen die beiden Seitenteile. Deckmaterial und
Lattenabstand werden für die Bleilappen gebraucht.</div>
<div class="grid">
${dfaFeld("Material",`<select id="dfa_material" data-pflicht="1">${matOpt}</select>`,true)}
${dfaFeld("Deckungsmaterial",`<select id="dfa_deckung">${deckOpt}</select>`)}
${dfaZahlFeld("Lattenabstand, für Anzahl Bleilappen (mm)","dfa_lattenabstand",a.lattenabstand)}
</div>
<label class="kam-schalter"><input type="checkbox" id="dfa_getrennt"${a.getrennt?" checked":""}>
<span>Links und rechts getrennt erfassen</span></label>
<div class="small" style="color:var(--muted);margin-top:2px">Ohne Haken gilt jedes seitliche
Mass für beide Seiten. Mit Haken bekommen B, C und beide Aufbordungshöhen je zwei Felder.</div>
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
 return `<div class="info">Alle Masse in mm, längs des Dachs gemessen - genau gleich
vermasst wie bei der Kamineinfassung. <b>B</b> und <b>C</b> überlappen sich im Knick –
die Länge des Seitenteils ist deshalb B + C − Überlappung. Vorne (talseitig) ist die
Aufbordung niedriger und hat oben einen Saum; hinten (bergseitig) ist sie höher und
bewusst trapezförmig – Breite oben ist kleiner als Breite unten.</div>
<div class="grid">
${dfaZahlFeld("A · vorne auf Deckmaterial bis Vorderkant Aufbordung","dfa_a",a.a,"1",true)}
${dfaSeitenFeld("B · Vorderkant Aufbordung bis Hinterkant Knick","dfa_b",true)}
${dfaSeitenFeld("C · Vorderkant Knick bis Hinterkant Aufbordung","dfa_c",true)}
${dfaZahlFeld("Überlappung der Seitenteile (Knick)","dfa_ueberlappung",a.ueberlappung)}
${dfaZahlFeld("D · Hinterkant Aufbordung bis hinten unter Deckmaterial","dfa_d",a.d,"1",true)}
${dfaSeitenFeld("Aufbordungshöhe vorne (talseitig)","dfa_aufVorne",true)}
${dfaSeitenFeld("Aufbordungshöhe hinten (bergseitig)","dfa_aufHinten",true)}
${dfaZahlFeld("Saum/Rückschlag oben, vorne","dfa_saumVorne",a.saumVorne)}
${dfaZahlFeld("Breite oben, hintere Aufbordung (Kopf)","dfa_breiteOben",a.breiteOben,"1",true)}
${dfaZahlFeld("Breite unten, hintere Aufbordung (Fuss)","dfa_breiteUnten",a.breiteUnten,"1",true)}
${dfaZahlFeld("Rand-Abstand · obere Ecke bis Strich am Kopf","dfa_randAbstand",a.randAbstand)}
${dfaZahlFeld("Rand-Strich · Länge des Strichs am Kopf","dfa_randStrich",a.randStrich)}
${dfaZahlFeld("E · 90°-Aufbug hinten, hinter D","dfa_e",a.e)}
${dfaZahlFeld("Umschlag am Aufbug hinten (180°)","dfa_eUmschlag",a.eUmschlag)}
${dfaZahlFeld("Anreiff vorne, vor A","dfa_anreiff",a.anreiff)}
${dfaZahlFeld("Umschlag am Anreiff vorne (180°)","dfa_anreiffUmschlag",a.anreiffUmschlag)}
</div>
<div class="small" style="color:var(--muted);margin-top:4px">B und C überlappen sich im
Knick – die Länge ist deshalb B + C − Überlappung.</div>
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
B und C.</div>
<div class="grid">
${dfaZahlFeld("Umschlag vorne","dfa_umschlagVorne",a.umschlagVorne)}
${dfaZahlFeld("Umschlag hinten","dfa_umschlagHinten",a.umschlagHinten)}
${dfaZahlFeld("Umschlagbreite seitlich (beide Seiten gleich)","dfa_umschlagSeite",a.umschlagSeite)}
${dfaZahlFeld("Breite vorne · Zuschnittlänge Vorderteil","dfa_breiteVorne",a.breiteVorne,"1",true)}
${dfaZahlFeld("Breite hinten · Zuschnittlänge Hinterteil","dfa_breiteHinten",a.breiteHinten,"1",true)}
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
 return `<div class="info">Vier Zuschnitte: Vorderteil, Hinterteil und je ein Seitenteil
links und rechts. Die Abwicklung entsteht aus den erfassten Massen – hier wird nichts von
Hand eingegeben.</div>
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
${zeile("A / D",dfaMm(a.a)+" / "+dfaMm(a.d)+" mm")}
${seitig("B · Vorderkant Aufbordung bis Hinterkant Knick","b","mm")}
${seitig("C · Vorderkant Knick bis Hinterkant Aufbordung","c","mm")}
${zeile("Überlappung Knick",dfaMm(a.ueberlappung)+" mm")}
${seitig("Aufbordungshöhe vorne","aufVorne","mm")}
${seitig("Aufbordungshöhe hinten","aufHinten","mm")}
${zeile("Saum vorne",dfaMm(a.saumVorne)+" mm")}
${zeile("Breite oben / unten (Trapez hinten)",dfaMm(a.breiteOben)+" / "+dfaMm(a.breiteUnten)+" mm")}
${zeile("Rand-Abstand / Rand-Strich am Kopf",dfaMm(a.randAbstand)+" / "+dfaMm(a.randStrich)+" mm")}
${zeile("Aufbug hinten (E) / Umschlag",dfaMm(a.e)+" / "+dfaMm(a.eUmschlag)+" mm")}
${zeile("Anreiff vorne / Umschlag",dfaMm(a.anreiff)+" / "+dfaMm(a.anreiffUmschlag)+" mm")}
${zeile("Breite vorne / hinten",dfaMm(a.breiteVorne)+" / "+dfaMm(a.breiteHinten)+" mm")}
${zeile("Umschlag vorne / hinten / Seite",dfaMm(a.umschlagVorne)+" / "+dfaMm(a.umschlagHinten)+" / "+dfaMm(a.umschlagSeite)+" mm")}
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
 return `<div class="ra-register" id="dfa_register">`+DFA_REGISTER.map(r=>{
  const marke=r.nr===DFA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===dfaSchritt?" aktiv":""}" data-dfa-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
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
const DFA_FELDER={dfa_a:"a",dfa_d:"d",dfa_ueberlappung:"ueberlappung",
 dfa_saumVorne:"saumVorne",dfa_breiteOben:"breiteOben",dfa_breiteUnten:"breiteUnten",
 dfa_randAbstand:"randAbstand",dfa_randStrich:"randStrich",
 dfa_e:"e",dfa_eUmschlag:"eUmschlag",dfa_anreiff:"anreiff",dfa_anreiffUmschlag:"anreiffUmschlag",
 dfa_breiteVorne:"breiteVorne",dfa_breiteHinten:"breiteHinten",
 dfa_umschlagVorne:"umschlagVorne",dfa_umschlagHinten:"umschlagHinten",
 dfa_umschlagSeite:"umschlagSeite",dfa_lattenabstand:"lattenabstand"};
const DFA_SEITENFELDER={dfa_b:"b",dfa_c:"c",dfa_aufVorne:"aufVorne",dfa_aufHinten:"aufHinten"};
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
function applyDfaSettings(){
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
 setzen("dfasUmschlagHinten",s.umschlag_hinten);
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
   umschlag_hinten:zahl("dfasUmschlagHinten")||0,
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
  a:dfaZahl(a.a), d:dfaZahl(a.d), ueberlappung:dfaZahl(a.ueberlappung),
  saumVorne:dfaZahl(a.saumVorne), breiteOben:dfaZahl(a.breiteOben), breiteUnten:dfaZahl(a.breiteUnten),
  randAbstand:dfaZahl(a.randAbstand), randStrich:dfaZahl(a.randStrich),
  e:dfaZahl(a.e), eUmschlag:dfaZahl(a.eUmschlag), anreiff:dfaZahl(a.anreiff), anreiffUmschlag:dfaZahl(a.anreiffUmschlag),
  breiteVorne:dfaZahl(a.breiteVorne), breiteHinten:dfaZahl(a.breiteHinten),
  umschlagVorne:dfaZahl(a.umschlagVorne), umschlagHinten:dfaZahl(a.umschlagHinten), umschlagSeite:dfaZahl(a.umschlagSeite),
  b:paar("b"), c:paar("c"), aufVorne:paar("aufVorne"), aufHinten:paar("aufHinten"),
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
            streifen:(g.streifen||[]).map(s=>({
              stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
              rest:s.rest}))})),
          optimal:rp.optimal!==false,
          ausResten:ebaAusRestenSpeicher(rp.ausResten)}
 };
}
function dfaZuruecksetzen(){
 dfaA=dfaLeer();
 dfaSchritt=1;
 renderDfaAufnahme();
}
function dfaFuellen(d){
 const w=d||{};
 const a=dfaLeer();
 // Wie bei der Kamineinfassung: A und D gelten fuer eine NEUE Aufnahme aus
 // den Einstellungen, bei einem gespeicherten Datensatz wird nichts erfunden
 // - fehlt eines der beiden dort, bleibt es leer.
 a.a=""; a.d="";
 const nimm=(k,ziel)=>{if(w[k]===0||w[k])a[ziel||k]=w[k]};
 a.material=w.material??"";
 if(w.deckung&&(typeof EINF_DECKUNGEN!=="object"||EINF_DECKUNGEN[w.deckung]))a.deckung=w.deckung;
 ["lattenabstand","a","d","ueberlappung","saumVorne","breiteOben","breiteUnten","randAbstand","randStrich",
  "e","eUmschlag","anreiff","anreiffUmschlag",
  "breiteVorne","breiteHinten","umschlagVorne","umschlagHinten","umschlagSeite"].forEach(k=>nimm(k));
 a.getrennt=!!w.getrennt;
 ["b","c","aufVorne","aufHinten"].forEach(k=>{
  const v=w[k];
  if(v&&typeof v==="object")a[k]={l:(v.l===0||v.l)?v.l:"",r:(v.r===0||v.r)?v.r:""};
  else if(v===0||v)a[k]={l:v,r:v};
  else a[k]={l:"",r:""};
 });
 const rq=(w.rollen&&w.rollen.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 dfaA=a;
 dfaSchritt=1;
 renderDfaAufnahme();
}
