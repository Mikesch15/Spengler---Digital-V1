"use strict";
// ===========================================================================
// Kamineinfassung - Erfassung in sieben Registern
// ===========================================================================
// Gleiche fachliche Logik wie die Einfassung Rund (js/21): Deckungsmaterial,
// Lattenabstand, Bleilappen - nur eben rechteckig statt rund, und mit
// getrennten Zuschnitten fuer vorne, hinten und die beiden Seiten.
//
// GRUNDLAGE: Schnitt_Kamineinfassung.dxf
// Die Datei enthaelt weder Text noch Bemassung, nur 8 Linien. Auf die
// Dachlinie projiziert (t = laengs des Dachs, bergwaerts positiv; h =
// senkrecht darueber) ergibt sich:
//
//   Dach            t   0 ... 798, h 0, Pfeile beidseits (laeuft weiter)
//   Vorderkant      t 199 -> 255, h   0 -> 120   (lotrecht = 25 Grad zur
//                                                 Dachsenkrechten)
//   Hinterkant      t 590 -> 632, h  29 -> 120   (ebenso)
//   Keil hinten     t 590 -> 608, h  29 ->   0   (Wasserkeil hinter dem Kamin)
//   Schnittkante    t 632 -> 255, h 120          (Kamin ist abgeschnitten)
//   Knick voll      t 349, h 120 -> 0
//   Knick gestrich. t 469, h 120 -> 0
//
// Die Zuordnung der Masse wurde mit dem Anwender geklaert (v2.90):
//   * Der "Knick" ist die UEBERLAPPUNG der beiden Seitenteile. Die volle
//     Linie ist die Vorderkant, die gestrichelte die Hinterkant des Knicks -
//     gestrichelt, weil es die verdeckte Kante des unteren Blechs ist.
//   * B ist die Zuschnittlaenge des vorderen Seitenteils, C die des hinteren.
//     Sie ueberlappen sich um die Knickbreite; in der DXF geht das exakt auf:
//     B + C - Kaminlaenge = (469-199) + (590-349) - 391 = 120.
//   * E (90-Grad-Aufbug hinten) gehoert in die Abwicklung des Hinterteils.
//   * "Breite vorne/hinten" sind die Zuschnittlaengen von Vorder- und
//     Hinterteil, die Umschlaege sind davon getrennt.
//
// Nachgetragen in v2.91, nachdem der erste Ausdruck es gezeigt hat:
//   * Die seitliche Hoehe ist ueber die ganze Laenge gleich. Laenger wird das
//     Blech an Vorder- und Hinterwand nur, weil diese SCHRAEG zur
//     Dachsenkrechten stehen: Laenge = Hoehe / cos(Winkel).
//   * Hinten beginnt die Wand ERST UEBER DEM KEIL. Der Keil ueberwindet den
//     unteren Teil der Hoehe; bis v2.90 wurde er zur vollen Hoehe addiert und
//     das Blech dadurch zu lang.
//   * Der Keilwinkel ist nicht frei, sondern die Winkelhalbierende - siehe
//     kamaKeilAbbug().
//
// Die Dachneigung selbst wird NICHT erfasst und auch nicht gebraucht: alle
// Masse liegen im Dachsystem, und die beiden Winkel sind ausdruecklich "vom
// Senkrechten auf Blech" gemessen, also relativ zum Dach. Die Skizze zeichnet
// das Dach deshalb waagerecht - sonst muesste eine Neigung erfunden werden.
//
// Zuschnitt und PDF laufen ueber die gemeinsamen Bausteine (js/29, js/33,
// js/35) - es wird keine zweite Zuschnitt- oder Packrechnung gebaut. Die
// Zeichenbausteine kommen aus js/20 (anbMassWaag, anbMassSenk, anbFahne,
// ANB_FARBE), die Deckungsarten aus js/21 (EINF_DECKUNGEN). Diese Datei muss
// deshalb nach 20 und 21 laden.
// ===========================================================================

// Register: die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und
// zuletzt die Kontrolle - dieselbe Reihenfolge wie in allen uebrigen Arten.
const KAM_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Kaminmasse"},{nr:3,kurz:"Umschläge"},
 {nr:4,kurz:"Stückliste"},{nr:5,kurz:"Zuschnitt"},{nr:6,kurz:"Ausmass"},
 {nr:7,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const KAM_KONTROLLE=KAM_REGISTER.length;
let kamSchritt=1;

const kamaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const kamaMm=v=>Math.round(kamaZahl(v)).toLocaleString("de-CH");
const kamaQm=v=>kamaZahl(v).toFixed(2).replace(".",",");

// ---- Einstellungen (je Geraet, wie bei Anschlussblech und Einfassung) -----
const KAMIN_STANDARD=Object.freeze({
 deckung:"biber_einfach",
 lattenabstand:330,
 umschlag_vorne:20, umschlag_hinten:20, umschlag_seite:20,
 ueberlappung:120,      // Ueberlappung der beiden Seitenteile (Knickbreite)
 aufbug_hinten:35,      // E, 90-Grad-Aufbug am hinteren Blechende
 // A und D sind Masse dieser einen Aufnahme - die Vorgabe fuellt sie beim
 // Anlegen nur vor und ist danach frei aenderbar (wie E, Umschlag und
 // Ueberlappung). Werte vom Betrieb genannt.
 mass_vorne:250,        // A, vorne auf Deckmaterial bis Vorderkant Kamin
 mass_hinten:200        // D, Hinterkant Kamin bis hinten unter Deckmaterial
});
const KAMIN_EINSTELLUNGEN="sd_kaminSettings";
let kaminSettings=kamEinstellungenLaden();

function kamEinstellungenLaden(){
 let w=null;
 try{w=JSON.parse(localStorage.getItem(KAMIN_EINSTELLUNGEN)||"null")}catch(e){w=null}
 w=Object.assign({},KAMIN_STANDARD,w||{});
 if(typeof EINF_DECKUNGEN==="object"&&!EINF_DECKUNGEN[w.deckung])w.deckung=KAMIN_STANDARD.deckung;
 return w;
}
function kamEinstellungenSichern(w){
 kaminSettings=w;
 try{localStorage.setItem(KAMIN_EINSTELLUNGEN,JSON.stringify(w))}catch(e){}
}

// ---- Zustand --------------------------------------------------------------
// Seitenabhaengige Masse stehen als {l,r} da. Ohne "getrennt" gilt der linke
// Wert fuer beide Seiten - so entsteht nie ein zweiter, unbemerkt leerer Wert.
function kamaLeer(){
 const s=kaminSettings||KAMIN_STANDARD;
 return {
  material:"", deckung:s.deckung, lattenabstand:s.lattenabstand,
  getrennt:false, skizzeSeite:"l",
  a:s.mass_vorne, d:s.mass_hinten, e:s.aufbug_hinten, keil:"",
  // Der laufende Zustand traegt IMMER den Innenwinkel Dach/Wand - das Merkmal
  // sagt das, damit kamaWinkelDach() ihn nicht faelschlich als alten Datensatz
  // umrechnet.
  winkelBezug:"dach", winkelVorne:"", winkelHinten:"",
  breiteVorne:"", breiteHinten:"",
  umschlagVorne:s.umschlag_vorne, umschlagHinten:s.umschlag_hinten,
  umschlagSeite:s.umschlag_seite, ueberlappung:s.ueberlappung,
  b:{l:"",r:""}, c:{l:"",r:""}, f:{l:"",r:""}, g:{l:"",r:""}, hoehe:{l:"",r:""},
  // rollenAuswahl: leer = das ganze Blechlager der Firma (nichts abgewaehlt).
  rollenAuswahl:[]
 };
}
let kamA=kamaLeer();

// ---- Masse ----------------------------------------------------------------
const KAM_SEITEN=[{k:"l",name:"links"},{k:"r",name:"rechts"}];
function kamaSeite(feld,seite,quelle){
 const q=quelle||kamA;
 const w=q[feld];
 if(!w||typeof w!=="object")return kamaZahl(w);
 return kamaZahl(q.getrennt?(seite==="r"?w.r:w.l):w.l);
}
function kamaSeitenRoh(feld,seite){
 const w=kamA[feld];
 if(!w||typeof w!=="object")return w;
 return kamA.getrennt?(seite==="r"?w.r:w.l):w.l;
}
// Die Wand steht um "winkel" vom Senkrechten zum Dach geneigt. Das Blech an
// ihr ist dadurch laenger als die senkrecht gemessene Hoehe. Nur der Betrag
// zaehlt - ob die Wand nach vorne oder hinten kippt, aendert die Laenge nicht.
function kamaHoeheMitWinkel(hoehe,winkel){
 const c=Math.cos(kamaZahl(winkel)*Math.PI/180);
 if(!(Math.abs(c)>0.05))return null;      // ab 87 Grad ist das kein Blech mehr
 return kamaZahl(hoehe)/Math.abs(c);
}
// Der Keil hinter dem Kamin sitzt zwischen dem Dachblech und der Kaminwand.
// Sein Winkel ist NICHT frei: er halbiert den Knick, damit die beiden an ihn
// grenzenden Abbuege denselben Winkel haben (Vorgabe des Anwenders, v2.91).
//
//   Dachblech laeuft talwaerts               -> Richtung 180 Grad
//   Wand steigt an                           -> Richtung 90 - Winkel hinten
//   ganzer Knick                             -> 90 + Winkel hinten
//   je Abbug (= Neigung des Keils zum Dach)  -> (90 + Winkel hinten) / 2
//
// In der Vorlage (Schnitt_Kamineinfassung.dxf) geht das exakt auf: bei 25 Grad
// sind es 57.5 Grad je Abbug, der 34.10 lange Keil ueberwindet damit
// 34.10 * sin(57.5) = 28.76 senkrecht - genau der Wert der Zeichnung.
// ---- Winkel: Eingabe am Bau vs. Rechnung ----------------------------------
// EINGEGEBEN wird der Innenwinkel zwischen Dachflaeche und Kaminwand - genau
// das, was am Bau mit dem Winkelmesser abgegriffen wird. Vorne (talseitig) ist
// er stumpf, hinten (bergseitig) spitz; bei einem lotrechten Kamin ergeben
// beide zusammen 180 Grad. Auf einem 25-Grad-Dach also 115 vorne und 65 hinten
// (gegen die Vorlage Schnitt_Kamineinfassung.dxf nachgerechnet, v2.95).
//
// GERECHNET wird intern weiter mit der Neigung der Wand vom Senkrechten auf
// das Dach - daraus kommt die Verlaengerung des Blechs (Hoehe / cos).
//   vorne:  Dach liegt talwaerts  -> intern = Innen - 90
//   hinten: Dach liegt bergwaerts -> intern = 90 - Innen
// Beide ergeben beim lotrechten Kamin denselben Wert, die Dachneigung.
// Liefert den Innenwinkel Dach/Wand - aus JEDER Quelle richtig, auch aus einem
// gespeicherten Datensatz bis v2.94. Der trug die Neigung vom Senkrechten und
// traegt kein Merkmal "winkelBezug"; er wird hier umgerechnet. Damit lesen
// Skizze, Rechnung und PDF alle dasselbe, ohne dass jede Aufrufstelle den Fall
// selbst kennen muss.
function kamaWinkelDach(quelle,feld){
 const q=quelle||kamA;
 const w=kamaZahl(q[feld]);
 if(q.winkelBezug==="dach")return w;
 return feld==="winkelHinten"?90-w:90+w;
}
function kamaWvIntern(quelle){
 return kamaWinkelDach(quelle,"winkelVorne")-90;
}
function kamaWhIntern(quelle){
 return 90-kamaWinkelDach(quelle,"winkelHinten");
}
function kamaKeilAbbug(winkelHinten){
 return (90+kamaZahl(winkelHinten))/2;
}
// Senkrecht zum Dach gemessener Hoehenanteil, den der Keil ueberwindet.
// Die Kaminwand beginnt erst darueber - ohne diesen Abzug waere die
// Abwicklung des Hinterteils zu lang (der Fehler bis v2.90).
function kamaKeilHoehe(keil,winkelHinten){
 const a=kamaKeilAbbug(winkelHinten)*Math.PI/180;
 const h=kamaZahl(keil)*Math.sin(a);
 return h>0?h:0;
}
// Vorder- und Hinterteil laufen ueber die ganze Breite. Sind die beiden
// Seiten unterschiedlich hoch, wird mit der GROESSEREN gerechnet - ein zu
// kurzer Zuschnitt waere unbrauchbar, ein zu langer laesst sich kuerzen.
function kamaHoeheDurchgehend(){
 return Math.max(kamaSeite("hoehe","l"),kamaSeite("hoehe","r"));
}
// Kaminlaenge laengs des Dachs. B und C ueberlappen sich um die Knickbreite -
// siehe Kopf dieser Datei.
function kamaKaminLaenge(seite,quelle){
 const q=quelle||kamA;
 return kamaSeite("b",seite,q)+kamaSeite("c",seite,q)-kamaZahl(q.ueberlappung);
}

// ---- Die sechs Zuschnitte -------------------------------------------------
// Genau die vom Anwender vorgegebenen Formeln. Jeder Teilbetrag wird
// mitgefuehrt, damit in der Stueckliste nachvollziehbar bleibt, woraus die
// Abwicklung entsteht.
function kamaZuschnitte(){
 const a=kamA, z=[];
 const h=kamaHoeheDurchgehend();
 const teilBreite=t=>t.reduce((s,x)=>s+kamaZahl(x.wert),0);
 const dazu=(name,rolle,seite,laenge,teile)=>{
  z.push({nr:z.length+1,name,rolle,seite,
   laenge:Math.round(kamaZahl(laenge)),
   breite:Math.round(teilBreite(teile)),
   teile,
   // merkmal trennt die Gruppen in der Zuschnittliste (js/33): zwei Teile
   // gleicher Groesse, aber anderer Bearbeitung duerfen nie in einer Zeile
   // verschwinden. Die SEITE ist dagegen eine reine Beschriftung - ein
   // Seitenteil links und rechts ist derselbe Zuschnitt und gehoert in
   // eine Zeile mit Stueckzahl 2.
   merkmal:name, hinweis:seite||""});
 };

 const hv=kamaHoeheMitWinkel(h,kamaWvIntern(a));
 dazu("Vorderteil","vorne","",a.breiteVorne,[
  {name:"Umschlag vorne",wert:kamaZahl(a.umschlagVorne)},
  {name:"Mass A",wert:kamaZahl(a.a)},
  {name:"Seitliche Höhe mit Winkel vorne",wert:hv===null?0:hv}]);

 // Hinten beginnt die Wand ERST UEBER DEM KEIL - der Keil ueberwindet den
 // unteren Teil der Hoehe. Ohne diesen Abzug waere das Blech zu lang.
 const keilH=kamaKeilHoehe(a.keil,kamaWhIntern(a));
 const restH=h-keilH;
 const hh=kamaHoeheMitWinkel(restH>0?restH:0,kamaWhIntern(a));
 dazu("Hinterteil","hinten","",a.breiteHinten,[
  {name:"Umschlag hinten",wert:kamaZahl(a.umschlagHinten)},
  {name:"Mass E · 90°-Aufbug",wert:kamaZahl(a.e)},
  {name:"Mass D",wert:kamaZahl(a.d)},
  {name:"Keil",wert:kamaZahl(a.keil)},
  {name:"Wand über dem Keil, mit Winkel hinten",wert:hh===null?0:hh}]);

 // Die vier Seitenteile: dieselbe Abwicklung je Seite, unterschiedliche
 // Laenge (vorne B, hinten C).
 KAM_SEITEN.forEach(s=>{
  const teile=[
   {name:"Umschlag Seite",wert:kamaZahl(a.umschlagSeite)},
   {name:"Mass G · unter Deckmaterial",wert:kamaSeite("g",s.k)},
   {name:"Mass F · bis Deckmaterial",wert:kamaSeite("f",s.k)},
   {name:"Seitliche Höhe",wert:kamaSeite("hoehe",s.k)}];
  dazu("Seitenteil vorne","seite",s.name,kamaSeite("b",s.k),teile.map(x=>Object.assign({},x)));
  dazu("Seitenteil hinten","seite",s.name,kamaSeite("c",s.k),teile.map(x=>Object.assign({},x)));
 });
 return z;
}

// ---- Bleilappen -----------------------------------------------------------
// Wie bei der Einfassung Rund: AUFGERUNDET, nicht abgerundet - die Lappen
// muessen die ganze Laenge abdecken (siehe die Korrektur in v2.70). Gerechnet
// wird je Seitenteil, denn jedes bekommt seine eigenen Lappen. Ohne
// Lattenabstand ist die Zahl nicht bestimmbar; dann bleibt sie null und die
// Anzeige zeigt "-", statt eine erfundene Zahl zu nennen.
function kamaBleilappen(){
 const la=kamaZahl(kamA.lattenabstand);
 const zeilen=kamaZuschnitte().filter(x=>x.rolle==="seite")
  .map(x=>({name:x.name+" "+x.seite,laenge:x.laenge,
    anzahl:(la>0&&x.laenge>0)?Math.max(1,Math.ceil(x.laenge/la)):null}));
 const gesamt=zeilen.every(x=>x.anzahl===null)?null
   :zeilen.reduce((s,x)=>s+(x.anzahl||0),0);
 return {lattenabstand:la,zeilen,gesamt};
}

// ---- Schnittskizze nach der DXF -------------------------------------------
// Gezeichnet werden genau die Elemente der Vorlage: Dach mit Pfeilen an
// beiden Enden, Vorder- und Hinterkant Kamin, die dachparallele Schnittkante
// oben, der Keil hinten und die beiden Knickkanten (voll = vorne,
// gestrichelt = hinten). Dazu die vom Anwender verlangten Masse.
//
// Der Keil wird unter seinem tatsaechlichen Winkel gezeichnet: er halbiert den
// Knick zwischen Dachblech und Wand (kamaKeilAbbug). Dieselbe Regel bestimmt,
// welchen Hoehenanteil er ueberwindet - Zeichnung und Abwicklung koennen
// deshalb nicht auseinanderlaufen.
// Ohne Argument wird der laufende Zustand gezeichnet, mit Argument der
// gespeicherte Datensatz - so zeigt das PDF genau den Stand von damals.
function kamaSkizze(quelle){
 const q=quelle||kamA;
 const seite=q.getrennt?(q.skizzeSeite==="r"?"r":"l"):"l";
 const A=kamaZahl(q.a), D=kamaZahl(q.d), E=kamaZahl(q.e);
 const keil=kamaZahl(q.keil);
 const B=kamaSeite("b",seite,q), C=kamaSeite("c",seite,q);
 const Ue=kamaZahl(q.ueberlappung);
 const H=kamaSeite("hoehe",seite,q);
 const wv=kamaWvIntern(q), wh=kamaWhIntern(q);
 const L=kamaKaminLaenge(seite,q);
 if(!(H>0)||!(L>0))
  return `<div class="ra-warnung">Für die Schnittskizze fehlen noch Masse:
bitte die seitliche Höhe sowie B und C eingeben.</div>`;

 const rad=g=>g*Math.PI/180;
 // Wandrichtungen, jeweils vom Fusspunkt nach oben. BEIDE Waende neigen sich
 // bei positivem Winkel in DIESELBE Richtung - bergwaerts, zum First. Bis
 // v2.91 kippte die Vorderwand hier gegenlaeufig, wodurch der Kamin nach oben
 // aufging statt parallel zu stehen (v2.92, gegen die Vorlage gemessen:
 // Vorderkant und Hinterkant der DXF stehen beide bei +25 Grad, und die
 // Schnittkante oben ist genauso lang wie die Oeffnung am Dach - also ein
 // Parallelogramm, der Normalfall des lotrechten Kamins auf geneigtem Dach).
 const vDir=[Math.sin(rad(wv)),Math.cos(rad(wv))];
 const hDir=[Math.sin(rad(wh)),Math.cos(rad(wh))];
 const P=(x,y)=>[x,y];
 const vFuss=P(0,0), vTop=P(vDir[0]*H/Math.max(0.05,Math.abs(vDir[1])),H);
 const hFuss=P(L,0), hTop=P(L+hDir[0]*H/Math.max(0.05,Math.abs(hDir[1])),H);

 // Keil: vom Punkt S auf der Hinterwand schraeg bergwaerts hinunter aufs Dach.
 // Sein Winkel ist NICHT frei gewaehlt, sondern die Winkelhalbierende des
 // Knicks zwischen Dachblech und Wand (siehe kamaKeilAbbug) - dieselbe Regel,
 // nach der auch die Abwicklung des Hinterteils rechnet. In der Vorlage geht
 // das exakt auf: Kopfpunkt (589.67, 28.76), Fusspunkt (607.99, 0).
 let keilS=null, keilE=null;
 const keilHoehe=kamaKeilHoehe(keil,wh);
 if(keil>0&&keilHoehe>0&&keilHoehe<H){
  const abbug=kamaKeilAbbug(wh)*Math.PI/180;
  const cw=Math.cos(rad(wh));
  if(Math.abs(cw)>0.05){
   keilS=P(L+keilHoehe*Math.tan(rad(wh)),keilHoehe);
   keilE=P(keilS[0]+keil*Math.cos(abbug),keilS[1]-keil*Math.sin(abbug));
  }
 }

 const dachVon=-A-Math.max(60,A*0.25), dachBis=L+D+Math.max(60,D*0.25);
 const knickVorne=B-Ue, knickHinten=B;

 let xMin=dachVon,xMax=dachBis,yMin=0,yMax=Math.max(H,E);
 [vTop,hTop].forEach(q=>{xMin=Math.min(xMin,q[0]);xMax=Math.max(xMax,q[0])});
 xMin-=70; xMax+=40; yMin-=40; yMax+=70;

 const breitePx=680, rand=12;
 let sk=(breitePx-2*rand)/(xMax-xMin);
 if(sk>1.6)sk=1.6;
 const hoehePx=Math.round((yMax-yMin)*sk+2*rand);
 const ox=rand-xMin*sk, oy=rand+yMax*sk;
 const X=x=>Math.round((ox+x*sk)*10)/10;
 const Y=y=>Math.round((oy-y*sk)*10)/10;
 const zahl=v=>kamaMm(v);

 // Die viewBox wird NACH dem Zeichnen exakt um alles Gezeichnete gelegt -
 // einschliesslich der geschaetzten Textkaesten. Ohne das laufen die
 // Beschriftungen an den Raendern aus dem Bild (gemessen, nicht vermutet).
 let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
 const merk=(x,y)=>{if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y};
 const merkPunkt=(mx,my)=>merk(X(mx),Y(my));
 const merkText=(px,py,text,anker,gr)=>{
  const g=gr||15, br=String(text).length*g*0.56;
  const l=anker==="end"?px-br:(anker==="middle"?px-br/2:px);
  merk(l,py-g); merk(l+br,py+5);
 };
 // Dieselben Textlagen wie in den Bausteinen aus js/20.
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
 // Dach, mit Pfeilspitzen an beiden Enden wie in der Vorlage.
 g+=linie(P(dachVon,0),P(dachBis,0),ANB_FARBE.deckLinie,3);
 g+=`<path d="M${X(dachVon)} ${Y(0)} l11 -4 l0 8 Z" fill="${ANB_FARBE.deckLinie}"/>`;
 g+=`<path d="M${X(dachBis)} ${Y(0)} l-11 -4 l0 8 Z" fill="${ANB_FARBE.deckLinie}"/>`;
 // Kamin: Vorderkant, Schnittkante oben, Hinterkant.
 g+=linie(vFuss,vTop,ANB_FARBE.bau,3);
 g+=linie(vTop,hTop,ANB_FARBE.bau,3);
 g+=linie(keilS||hFuss,hTop,ANB_FARBE.bau,3);
 // Keil hinter dem Kamin.
 if(keilS&&keilE)g+=linie(keilS,keilE,ANB_FARBE.blech,3.4);
 // Knick: Vorderkant voll, Hinterkant gestrichelt (verdeckte Kante).
 const knickDa=Ue>0&&knickVorne>0&&knickHinten<=L;
 if(knickDa){
  g+=linie(P(knickVorne,0),P(knickVorne,H),ANB_FARBE.bau,1.6);
  g+=linie(P(knickHinten,0),P(knickHinten,H),ANB_FARBE.bau,1.6,"7 5");
 }
 // 90-Grad-Aufbug am hinteren Blechende.
 if(E>0)g+=linie(P(L+D,0),P(L+D,E),ANB_FARBE.blech,3.4);

 // Masse. Die Fahnen zeigen nach INNEN in den leeren Kamin - aussen waere
 // die Zeichnung sonst doppelt so breit und der Text entsprechend klein.
 if(A>0){g+=anbMassWaag(-A,0,0,"A = "+zahl(A),X,Y,true); merkMassWaag(-A,0,0,"A = "+zahl(A),true)}
 if(D>0){g+=anbMassWaag(L,L+D,0,"D = "+zahl(D),X,Y,true); merkMassWaag(L,L+D,0,"D = "+zahl(D),true)}
 if(B>0){g+=anbMassWaag(0,knickHinten,H+26,"B = "+zahl(B),X,Y,false); merkMassWaag(0,knickHinten,H+26,"B = "+zahl(B),false)}
 if(C>0){g+=anbMassWaag(knickVorne,L,H+58,"C = "+zahl(C),X,Y,false); merkMassWaag(knickVorne,L,H+58,"C = "+zahl(C),false)}
 g+=anbMassSenk(0,H,xMin+56,"Höhe = "+zahl(H),X,Y); merkMassSenk(0,H,xMin+56,"Höhe = "+zahl(H));
 if(knickDa){
  g+=anbMassWaag(knickVorne,knickHinten,H*0.5,"Knick "+zahl(Ue),X,Y,false);
  merkMassWaag(knickVorne,knickHinten,H*0.5,"Knick "+zahl(Ue),false);
 }
 const fahne=(x,y,dx,dy,text)=>{g+=anbFahne(x,y,dx,dy,text,X,Y); merkFahne(x,y,dx,dy,text)};
 // E und Keil liegen dicht beieinander: E zeigt nach rechts oben, der Keil
 // nach links oben - sonst schieben sich die beiden Texte uebereinander.
 if(E>0)fahne(L+D,E,8,-22,"E = "+zahl(E)+" · 90°");
 if(keilS&&keilE)fahne((keilS[0]+keilE[0])/2,(keilS[1]+keilE[1])/2,-40,-22,"Keil = "+zahl(keil));
 fahne(vTop[0],vTop[1],24,16,"Winkel vorne "+kamaZahl(kamaWinkelDach(q,"winkelVorne"))+"°");
 fahne(hTop[0],hTop[1],-24,16,"Winkel hinten "+kamaZahl(kamaWinkelDach(q,"winkelHinten"))+"°");

 const seiteTxt=q.getrennt?(seite==="r"?" · rechte Seite":" · linke Seite"):"";
 const fuss="Kamineinfassung · Schnitt längs des Dachs"+seiteTxt+" · Dach waagerecht dargestellt";
 // Platz fuer die Fusszeile unten rechts.
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

// ---- Zuschnitt aus Rollenblech (gemeinsame Bausteine, js/29 + js/33) ------
// Die sechs Teile haben unterschiedliche Abwicklungen. Gepackt wird deshalb
// je Streifenbreite - mit derselben Packrechnung wie ueberall
// (ebaPackeInStreifen, js/29). Es gibt in der App nur EINE.
function kamaBleche(){
 return kamaZuschnitte().filter(x=>x.laenge>0&&x.breite>0);
}
function kamaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(kamA&&kamA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
function kamaFlaecheM2(){
 return kamaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
}
function kamaRollenPlan(){
 const bleche=kamaBleche();
 const breiten=kamaRollenbreiten();
 const netto=kamaFlaecheM2();
 if(!bleche.length||!breiten.length)
  return {gruppen:[],moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 const nach=new Map();
 bleche.forEach(x=>{
  if(!nach.has(x.breite))nach.set(x.breite,[]);
  nach.get(x.breite).push(x);
 });
 // Ein Abschnitt ist so lang wie das laengste Stueck DIESER Breite. Die
 // Verteilung haengt damit nicht an der Rollenbreite und wird einmal gepackt;
 // erst die Zahl der Abschnitte folgt aus der Rollenbreite.
 let optimal=true;
 const gruppen=Array.from(nach.keys()).sort((a,b)=>b-a).map(B=>{
  const liste=nach.get(B);
  const L=Math.max.apply(null,liste.map(x=>x.laenge));
  const v=ebaPackeInStreifen(liste,L);
  if(v.optimal===false)optimal=false;
  return {breite:B,stuecke:liste,abschnittLaenge:L,streifen:v.streifen||[]};
 });
 const moeglich=[], zuSchmal=[];
 breiten.forEach(R=>{
  const zeilen=[]; let flaeche=0, passt=true;
  gruppen.forEach(gr=>{
   const jeAbschnitt=Math.floor(R/gr.breite);
   if(jeAbschnitt<1){passt=false;return}
   const abschnitte=Math.ceil(gr.streifen.length/jeAbschnitt);
   const rollenLaenge=abschnitte*gr.abschnittLaenge;
   flaeche+=R*rollenLaenge/1e6;
   zeilen.push({breite:gr.breite,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,
     abschnittLaenge:gr.abschnittLaenge,rollenLaenge,
     streifen:gr.streifen.length,restBreite:R-jeAbschnitt*gr.breite});
  });
  if(!passt){zuSchmal.push(R);return}
  moeglich.push({breite:R,zeilen,flaeche,verschnitt:flaeche-netto,
    anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
    rollenLaenge:zeilen.reduce((s,x)=>s+x.rollenLaenge,0)});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 const best=moeglich[0]||null;
 const gefuellt=gruppen.map((g,i)=>Object.assign({},g,{
   jeAbschnitt:best?best.zeilen[i].jeAbschnitt:1,
   abschnitte:best?best.zeilen[i].abschnitte:0,
   rollenLaenge:best?best.zeilen[i].rollenLaenge:0}));
 return {gruppen:gefuellt,moeglich,zuSchmal,bestes:best,netto,optimal};
}
function kamaZuschnittPlan(){
 const rp=kamaRollenPlan();
 return {art:"rolle", einheit:"Teil",
  einleitung:ZU_EINLEITUNG_ROLLE, quelle:ZU_QUELLE_ROLLE,
  leer:!kamaBleche().length?"Noch nichts zuzuschneiden – bitte zuerst die Masse erfassen."
      :(!kamaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
      :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."),
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, optimal:rp.optimal!==false};
}

// ---- Ausmass --------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function kamaDeckungText(){
 const d=(typeof EINF_DECKUNGEN==="object")?EINF_DECKUNGEN[kamA.deckung]:null;
 return d?d.name:"kein Deckmaterial gewählt";
}
function kamaMaterialText(){
 const m=findMeasurementMaterial(kamA.material);
 return m?m.name:"kein Material gewählt";
}
function kamaAusmassZeilen(){
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 const teile=kamaZuschnitte().filter(x=>x.laenge>0&&x.breite>0);
 if(!teile.length)return z;
 zeile("Kamineinfassung, "+kamaDeckungText(),"1","Stk.","Deckmaterial aus den Grunddaten");
 teile.forEach(t=>zeile(t.name+(t.seite?" "+t.seite:""),
   kamaMm(t.laenge)+" × "+kamaMm(t.breite),"mm","Zuschnittlänge × Abwicklung"));
 zeile("Blechfläche Zuschnitt",kamaQm(kamaFlaecheM2()),"m²","Summe Länge × Abwicklung");
 const bl=kamaBleilappen();
 if(bl.gesamt!==null)
  zeile("Bleilappen",String(bl.gesamt),"Stk.","je Seitenteil aufgerundet aus Länge ÷ Lattenabstand");
 const Ll=kamaKaminLaenge("l"), Lr=kamaKaminLaenge("r");
 if(Ll>0)zeile("Kaminlänge längs Dach"+(kamA.getrennt?" links":""),kamaMm(Ll),"mm","B + C − Überlappung");
 if(kamA.getrennt&&Lr>0)zeile("Kaminlänge längs Dach rechts",kamaMm(Lr),"mm","B + C − Überlappung");
 return z;
}
function kamaMaterialTabelle(){
 const m=findMeasurementMaterial(kamA.material);
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle ------------------------------------------------------------
// Nur Pruefungen, die sich aus den erfassten Daten ableiten lassen. Es werden
// KEINE eigenen Grenzwerte erfunden.
function kamaPruefungen(){
 const m=[], a=kamA;
 const fehlt=(wert,text)=>{if(!(kamaZahl(wert)>0))m.push({art:"fehler",text})};
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 fehlt(a.a,"Mass A (vorne auf Deckmaterial bis Vorderkant Kamin) fehlt.");
 fehlt(a.d,"Mass D (Hinterkant Kamin bis hinten unter Deckmaterial) fehlt.");
 fehlt(a.breiteVorne,"Die Breite vorne (Zuschnittlänge Vorderteil) fehlt.");
 fehlt(a.breiteHinten,"Die Breite hinten (Zuschnittlänge Hinterteil) fehlt.");
 KAM_SEITEN.forEach(s=>{
  const zusatz=a.getrennt?" ("+s.name+")":"";
  fehlt(kamaSeite("b",s.k),"Mass B, Zuschnittlänge Seitenteil vorne"+zusatz+", fehlt.");
  fehlt(kamaSeite("c",s.k),"Mass C, Zuschnittlänge Seitenteil hinten"+zusatz+", fehlt.");
  fehlt(kamaSeite("hoehe",s.k),"Die seitliche Höhe"+zusatz+" fehlt.");
  if(!a.getrennt)return;
 });
 [["a","Mass A"],["d","Mass D"],["e","Mass E"],["keil","Keil"],
  ["breiteVorne","Breite vorne"],["breiteHinten","Breite hinten"],
  ["umschlagVorne","Umschlag vorne"],["umschlagHinten","Umschlag hinten"],
  ["umschlagSeite","Umschlag seitlich"],["ueberlappung","Überlappung"],
  ["lattenabstand","Lattenabstand"]].forEach(([k,name])=>{
  if(kamaZahl(a[k])<0)m.push({art:"fehler",text:name+" kann nicht negativ sein."});
 });
 KAM_SEITEN.forEach(s=>{
  ["b","c","f","g","hoehe"].forEach(k=>{
   if(kamaSeite(k,s.k)<0)m.push({art:"fehler",text:"Ein seitliches Mass ist negativ ("+s.name+")."});
  });
 });
 // Eingegeben wird der Innenwinkel Dach/Wand (siehe kamaWvIntern). Sinnvoll ist
 // er zwischen 3 und 177 Grad - darueber hinaus laeuft "Hoehe / cos" ins
 // Unendliche. 90 Grad hiesse: die Wand steht senkrecht AUF DEM DACH; bei einem
 // lotrechten Kamin auf einem geneigten Dach ist das praktisch nie der Fall,
 // und dann fehlt dem Blech die ganze Verlaengerung.
 [["winkelVorne","Winkel Dach/Wand vorne",115],["winkelHinten","Winkel Dach/Wand hinten",65]]
  .forEach(([k,name,bsp])=>{
  const w=kamaZahl(a[k]);
  if(a[k]===""||a[k]===null||a[k]===undefined)
   m.push({art:"fehler",text:name+" fehlt. Er wird zwischen Dachfläche und Kaminwand "
     +"gemessen – auf einem 25°-Dach z. B. "+bsp+"°."});
  else if(w<=3||w>=177)
   m.push({art:"fehler",text:name+" muss zwischen 3° und 177° liegen – sonst läuft "
     +"das Blech ins Unendliche."});
  else if(w===90)
   m.push({art:"warnung",text:name+" steht auf 90° – die Wand stünde dann senkrecht "
     +"auf dem Dach, das Blech bekäme keine Verlängerung."});
 });
 // Beim lotrechten Kamin ergeben vorne und hinten zusammen 180 Grad. Ein
 // deutlich anderer Wert ist erlaubt (schraeger Kamin), aber selten - deshalb
 // ein Hinweis, keine Sperre.
 {const wv=kamaZahl(a.winkelVorne), wh=kamaZahl(a.winkelHinten);
  if(a.winkelVorne!==""&&a.winkelHinten!==""&&wv>3&&wv<177&&wh>3&&wh<177
     &&Math.abs(wv+wh-180)>1)
   m.push({art:"warnung",text:"Vorne und hinten ergeben zusammen "+kamaMm(wv+wh)
     +"° statt 180° – bei einem lotrechten Kamin sind es immer 180°."});
 }
 // Der Keil ueberwindet einen Teil der Hoehe. Ist er hoeher als die ganze
 // Einfassung, bleibt fuer die Wand nichts uebrig - dann stimmt eines der
 // beiden Masse nicht.
 {const kh=kamaKeilHoehe(a.keil,kamaWhIntern(a)), hh=kamaHoeheDurchgehend();
  if(kamaZahl(a.keil)>0&&hh>0&&kh>=hh)
   m.push({art:"fehler",text:"Der Keil überwindet mit "+kamaMm(kh)+" mm bereits die ganze "
     +"seitliche Höhe ("+kamaMm(hh)+" mm) – für die Kaminwand bliebe nichts übrig."});
 }
 // Beide Waende neigen sich gleichsinnig (v2.92). Weichen die Winkel stark
 // voneinander ab, laeuft die Vorderwand der Hinterwand davon und oben bliebe
 // kein Kamin mehr uebrig. Das ist keine gewaehlte Grenze, sondern schlicht
 // unmoeglich - deshalb ein Fehler, keine Warnung.
 KAM_SEITEN.forEach(s=>{
  const L=kamaKaminLaenge(s.k), H=kamaSeite("hoehe",s.k);
  const wv=kamaWvIntern(a), wh=kamaWhIntern(a);
  if(!(L>0)||!(H>0)||Math.abs(wv)>=87||Math.abs(wh)>=87)return;
  const oben=L+H*(Math.tan(wh*Math.PI/180)-Math.tan(wv*Math.PI/180));
  if(oben<=0)
   m.push({art:"fehler",text:"Mit diesen Winkeln träfen sich die beiden Kaminwände "
     +"noch unterhalb der Oberkante"+(a.getrennt?" ("+s.name+")":"")+" – bitte Winkel "
     +"und seitliche Höhe prüfen."});
  if(!a.getrennt)return;
 });
 KAM_SEITEN.forEach(s=>{
  const L=kamaKaminLaenge(s.k);
  const zusatz=a.getrennt?" ("+s.name+")":"";
  if(kamaSeite("b",s.k)>0&&kamaSeite("c",s.k)>0&&!(L>0))
   m.push({art:"fehler",text:"B + C ist nicht grösser als die Überlappung"+zusatz
     +" – daraus ergibt sich keine Kaminlänge."});
  if(kamaZahl(a.ueberlappung)>0&&kamaSeite("b",s.k)>0&&kamaSeite("b",s.k)<=kamaZahl(a.ueberlappung))
   m.push({art:"warnung",text:"Mass B"+zusatz+" ist nicht grösser als die Überlappung – "
     +"der Knick läge dann vor der Vorderkant Kamin."});
  if(!a.getrennt)return;
 });
 if(!(kamaZahl(a.lattenabstand)>0))
  m.push({art:"warnung",text:"Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden."});
 if(!a.deckung)m.push({art:"warnung",text:"Es ist noch kein Deckmaterial gewählt."});
 if(a.getrennt){
  const gleich=["b","c","f","g","hoehe"].every(k=>kamaSeite(k,"l")===kamaSeite(k,"r"));
  if(gleich)m.push({art:"warnung",text:"Links und rechts werden getrennt erfasst, "
    +"sind aber überall gleich – der Schalter kann ausgeschaltet werden."});
 }
 if(kamaBleche().length&&!kamaRollenbreiten().length)
  m.push({art:"warnung",text:"Es ist keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet."});
 return m;
}

// ---- Anzeige --------------------------------------------------------------
function kamaKarte(titel,inhalt){
 return `<div class="card"><h2>${esc(titel)}</h2>${inhalt}</div>`;
}
function kamaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function kamaZahlFeld(label,id,wert,schritt,pflicht){
 return kamaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${
   pflicht?' data-pflicht="1"':""} inputmode="${
   (schritt&&schritt!=="1")?"decimal":"numeric"}" value="${
   wert===""||wert===null||wert===undefined?"":esc(wert)}">`);
}
// Ein seitenabhaengiges Mass: ohne getrennte Erfassung genau EIN Feld, sonst
// zwei nebeneinander. Der linke Wert gilt dann weiterhin fuer links.
function kamaSeitenFeld(label,basis,pflicht){
 // "basis" ist die FELD-ID ("kam_b"), der Zustand haelt den Wert aber unter
 // dem kurzen Schluessel ("b"). Bis v2.92 wurde hier mit der Feld-ID im
 // Zustand gesucht - kamA["kam_b"] gibt es nicht, die seitlichen Masse waren
 // deshalb nach JEDEM Neuzeichnen leer (Registerwechsel, oder das Oeffnen
 // eines gespeicherten Datensatzes). Gespeichert waren sie die ganze Zeit,
 // nur nie zu sehen - fuer den Anwender nicht zu unterscheiden.
 const feld=(typeof KAM_SEITENFELDER==="object"&&KAM_SEITENFELDER[basis])
   ||String(basis).replace(/^kam_/,"");
 const w=kamA[feld]||{l:"",r:""};
 if(!kamA.getrennt)
  return kamaZahlFeld(label,basis+"_l",w.l,"1",pflicht);
 return kamaZahlFeld(label+" · links",basis+"_l",w.l,"1",pflicht)
   +kamaZahlFeld(label+" · rechts",basis+"_r",w.r,"1",pflicht);
}
function kamaGrunddatenHtml(){
 const a=kamA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const deckOpt=Object.keys((typeof EINF_DECKUNGEN==="object"?EINF_DECKUNGEN:{}))
  .map(k=>`<option value="${esc(k)}"${k===a.deckung?" selected":""}>${esc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 return `<div class="info">Einfassung eines rechteckigen Kamins. Erfasst wird der
Schnitt längs des Dachs: vorne auf dem Deckmaterial, an den beiden Seiten, hinten mit
Keil und Aufbug. Deckmaterial und Lattenabstand werden für die Bleilappen gebraucht.</div>
<div class="grid">
${kamaFeld("Material",`<select id="kam_material" data-pflicht="1">${matOpt}</select>`,true)}
${kamaFeld("Deckungsmaterial",`<select id="kam_deckung">${deckOpt}</select>`)}
${kamaZahlFeld("Lattenabstand, für Anzahl Bleilappen (mm)","kam_lattenabstand",a.lattenabstand)}
</div>
<label class="kam-schalter"><input type="checkbox" id="kam_getrennt"${a.getrennt?" checked":""}>
<span>Links und rechts getrennt erfassen</span></label>
<div class="small" style="color:var(--muted);margin-top:2px">Ohne Haken gilt jedes seitliche
Mass für beide Seiten. Mit Haken bekommen B, C, F, G und die seitliche Höhe je zwei Felder.</div>
<div class="bar" style="margin-top:8px">
<button type="button" class="gray" id="kam_einstellungen">⚙️ Standardwerte</button>
</div>`;
}
function kamaKennzahlenHtml(){
 const wert=(l,v)=>`<div><label>${esc(l)}</label><div class="ra-wert">${esc(v)}</div></div>`;
 const Ll=kamaKaminLaenge("l"), Lr=kamaKaminLaenge("r");
 const bl=kamaBleilappen();
 const kh=kamaKeilHoehe(kamA.keil,kamaWhIntern(kamA));
 return `<div class="grid ra-kennzahlen" id="kam_kennzahlen">
${wert("Kaminlänge längs Dach"+(kamA.getrennt?" links":""),Ll>0?kamaMm(Ll)+" mm":"–")}
${kamA.getrennt?wert("Kaminlänge rechts",Lr>0?kamaMm(Lr)+" mm":"–"):""}
${wert("Seitliche Höhe für Vorder-/Hinterteil",kamaHoeheDurchgehend()>0?kamaMm(kamaHoeheDurchgehend())+" mm":"–")}
${wert("Keil: Abbug / Höhenanteil",kamaZahl(kamA.keil)>0
   ?kamaKeilAbbug(kamaWhIntern(kamA)).toFixed(1).replace(".",",")+"° / "+kamaMm(kh)+" mm":"–")}
${wert("Anzahl Bleilappen",bl.gesamt!==null?String(bl.gesamt):"–")}
</div>`;
}
function kamaMasseHtml(){
 const a=kamA;
 const seitenWahl=a.getrennt?`<div class="bar" style="margin-top:8px">
<button type="button" class="gray${a.skizzeSeite!=="r"?" blue":""}" data-kam-skizze="l">Linke Seite</button>
<button type="button" class="gray${a.skizzeSeite==="r"?" blue":""}" data-kam-skizze="r">Rechte Seite</button>
</div>`:"";
 return `<div class="info">Alle Masse in mm, längs des Dachs gemessen. Die beiden Winkel
sind die, die am Bau abgegriffen werden: der Winkel <b>zwischen Dachfläche und
Kaminwand</b>, je auf seiner Seite. Vorne (talseitig) ist er <b>stumpf</b>, hinten
(bergseitig) <b>spitz</b>; bei einem lotrechten Kamin ergeben beide zusammen 180°.
Auf einem 25°-Dach also <b>115° vorne und 65° hinten</b>. <b>90°</b> hiesse, die Wand
stünde senkrecht auf dem Dach. Der Keil braucht keinen eigenen Winkel: er halbiert
den Knick, damit die beiden an ihn grenzenden Abbüge gleich sind.</div>
<div class="grid">
${kamaZahlFeld("A · vorne auf Deckmaterial bis Vorderkant Kamin","kam_a",a.a,"1",true)}
${kamaSeitenFeld("B · Vorderkant Kamin bis Hinterkant Knick","kam_b",true)}
${kamaSeitenFeld("C · Vorderkant Knick bis Hinterkant Kamin","kam_c",true)}
${kamaZahlFeld("Überlappung der Seitenteile (Knick)","kam_ueberlappung",a.ueberlappung)}
${kamaZahlFeld("D · Hinterkant Kamin bis hinten unter Deckmaterial","kam_d",a.d,"1",true)}
${kamaZahlFeld("E · Mass vom 90°-Aufbug hinten","kam_e",a.e)}
${kamaZahlFeld("Keil hinterkant Kamin","kam_keil",a.keil)}
${kamaZahlFeld("Winkel Dach/Wand vorne (°) · stumpf","kam_winkelVorne",a.winkelVorne,"0.1",true)}
${kamaZahlFeld("Winkel Dach/Wand hinten (°) · spitz","kam_winkelHinten",a.winkelHinten,"0.1",true)}
</div>
<div class="small" style="color:var(--muted);margin-top:4px">B und C überlappen sich im
Knick – die Kaminlänge ist deshalb B + C − Überlappung.</div>
<h2 style="margin-top:14px">Seitliche Masse</h2>
<div class="grid">
${kamaSeitenFeld("F · seitlich bis Deckmaterial","kam_f")}
${kamaSeitenFeld("G · seitlich unter Deckmaterial","kam_g")}
${kamaSeitenFeld("Seitliche Höhe","kam_hoehe",true)}
</div>
${kamaKennzahlenHtml()}
<h2 style="margin-top:14px">Schnitt</h2>
${seitenWahl}
<div id="kam_skizze" class="eb-diagram-box eb-diagram-scroll" style="margin-top:8px">${kamaSkizze()}</div>`;
}
function kamaUmschlaegeHtml(){
 const a=kamA;
 const t=kamaZuschnitte();
 const zeile=x=>`<tr><td>${esc(x.name)}${x.seite?" "+esc(x.seite):""}</td>
<td>${kamaMm(x.laenge)}</td><td><b>${kamaMm(x.breite)}</b></td></tr>`;
 return `<div class="info">Die Umschläge stecken in der Abwicklung, die Breiten sind die
Zuschnittlängen von Vorder- und Hinterteil. Die Seitenteile bekommen ihre Länge aus B und C.</div>
<div class="grid">
${kamaZahlFeld("Umschlag vorne","kam_umschlagVorne",a.umschlagVorne)}
${kamaZahlFeld("Umschlag hinten","kam_umschlagHinten",a.umschlagHinten)}
${kamaZahlFeld("Umschlagbreite seitlich (beide Seiten gleich)","kam_umschlagSeite",a.umschlagSeite)}
${kamaZahlFeld("Breite vorne · Zuschnittlänge Vorderteil","kam_breiteVorne",a.breiteVorne,"1",true)}
${kamaZahlFeld("Breite hinten · Zuschnittlänge Hinterteil","kam_breiteHinten",a.breiteHinten,"1",true)}
</div>
<h2 style="margin-top:14px">Vorschau</h2>
<div class="scroll" id="kam_vorschau"><table class="eb-table ra-tab">
<thead><tr><th>Teil</th><th>Länge (mm)</th><th>Abwicklung (mm)</th></tr></thead>
<tbody>${t.map(zeile).join("")}</tbody></table></div>`;
}
function kamaStuecklisteHtml(){
 const t=kamaZuschnitte();
 const bl=kamaBleilappen();
 const offen=t.filter(x=>!(x.laenge>0)||!(x.breite>0));
 const zeilen=t.map(x=>`<tr>
<td>${x.nr}</td><td>${esc(x.name)}${x.seite?" <span class=\"small\">"+esc(x.seite)+"</span>":""}</td>
<td><b>${esc(zuMasse(x.laenge,x.breite))}</b></td>
<td class="small">${esc(x.teile.filter(p=>kamaZahl(p.wert)>0)
  .map(p=>p.name+" "+kamaMm(p.wert)).join(" + ")||"–")}</td></tr>`).join("");
 const lappen=bl.gesamt===null
  ? `<div class="ra-warnung">Ohne Lattenabstand kann die Anzahl Bleilappen nicht
berechnet werden – bitte in den Grunddaten eintragen.</div>`
  : `<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Seitenteil</th><th>Länge (mm)</th><th>Bleilappen</th></tr></thead>
<tbody>${bl.zeilen.map(x=>`<tr><td>${esc(x.name)}</td><td>${kamaMm(x.laenge)}</td>
<td>${x.anzahl===null?"–":x.anzahl}</td></tr>`).join("")}
<tr><td colspan="2"><b>Gesamt</b></td><td><b>${bl.gesamt}</b></td></tr></tbody></table></div>
<div class="small" style="color:var(--muted);margin-top:4px">Je Seitenteil aufgerundet aus
Länge ÷ Lattenabstand (${kamaMm(bl.lattenabstand)} mm) – ein Lappen je Ziegelreihe.</div>`;
 return `<div class="info">Sechs Zuschnitte: Vorderteil, Hinterteil und je ein Seitenteil
vorne und hinten für links und rechts. Die Abwicklung entsteht aus den erfassten Massen –
hier wird nichts von Hand eingegeben.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Teil</th><th>Zuschnitt (Länge × Breite)</th><th>Abwicklung aus</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
${offen.length?`<div class="ra-warnung" style="margin-top:8px">${offen.length} Teil(e) haben
noch keine vollständigen Masse und kommen deshalb nicht in den Zuschnitt.</div>`:""}
<h2 style="margin-top:14px">Bleilappen</h2>
${lappen}`;
}
function kamaAusmassHtml(){
 const z=kamaAusmassZeilen();
 const mat=kamaMaterialTabelle();
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
function kamaKontrolleHtml(){
 const m=kamaPruefungen(), a=kamA;
 const bl=kamaBleilappen();
 const zeile=(n,w)=>`<tr><td>${esc(n)}</td><td>${esc(w)}</td></tr>`;
 const seitig=(n,k,e)=>a.getrennt
  ? zeile(n,(kamaSeite(k,"l")||"–")+" / "+(kamaSeite(k,"r")||"–")+" "+e+" (links / rechts)")
  : zeile(n,(kamaSeite(k,"l")||"–")+" "+e);
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
${zeile("Material",kamaMaterialText())}
${zeile("Deckungsmaterial",kamaDeckungText())}
${zeile("A / D",kamaMm(a.a)+" / "+kamaMm(a.d)+" mm")}
${zeile("E · 90°-Aufbug / Keil",kamaMm(a.e)+" / "+kamaMm(a.keil)+" mm")}
${kamaZahl(a.keil)>0?zeile("Keil: Abbug / Höhenanteil",
   kamaKeilAbbug(kamaWhIntern(a)).toFixed(1).replace(".",",")+"° / "
   +kamaMm(kamaKeilHoehe(a.keil,kamaWhIntern(a)))+" mm"):""}
${zeile("Winkel Dach/Wand vorne / hinten",kamaZahl(a.winkelVorne)+"° / "+kamaZahl(a.winkelHinten)+"°")}
${seitig("B · Seitenteil vorne","b","mm")}
${seitig("C · Seitenteil hinten","c","mm")}
${seitig("F / G","f","mm")}
${seitig("Seitliche Höhe","hoehe","mm")}
${zeile("Überlappung Knick",kamaMm(a.ueberlappung)+" mm")}
${zeile("Breite vorne / hinten",kamaMm(a.breiteVorne)+" / "+kamaMm(a.breiteHinten)+" mm")}
${zeile("Umschlag vorne / hinten / Seite",kamaMm(a.umschlagVorne)+" / "+kamaMm(a.umschlagHinten)+" / "+kamaMm(a.umschlagSeite)+" mm")}
${zeile("Blechfläche",kamaQm(kamaFlaecheM2())+" m²")}
${zeile("Bleilappen",bl.gesamt!==null?String(bl.gesamt):"–")}
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register und Blaettern -----------------------------------------------
function kamaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function kamaSetzeSchritt(n){
 kamSchritt=Math.max(1,Math.min(KAM_REGISTER.length,Number(n)||1));
 renderKaminAufnahme();
 // Der Foto-/Skizzenbereich haengt am Register: nur das letzte zeigt ihn.
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("kam_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function kamaRegisterHtml(){
 const pr=kamaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="kam_register">`+KAM_REGISTER.map(r=>{
  const marke=r.nr===KAM_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===kamSchritt?" aktiv":""}" data-kam-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function kamaKopfInhalt(){
 if(kamSchritt===1)return kamaKarte("1 · Grunddaten",kamaGrunddatenHtml());
 if(kamSchritt===2)return kamaKarte("2 · Kaminmasse",kamaMasseHtml());
 if(kamSchritt===3)return kamaKarte("3 · Umschläge und Breiten",kamaUmschlaegeHtml());
 if(kamSchritt===4)return kamaKarte("4 · Stückliste",kamaStuecklisteHtml());
 if(kamSchritt===5)return kamaKarte("5 · Zuschnitt aus Rollenblech",
   zuRollenAuswahlHtml(kamA.rollenAuswahl,"data-kam-rolle")+zuschnittHtml(kamaZuschnittPlan()));
 if(kamSchritt===6)return kamaKarte("6 · Ausmass und Material",kamaAusmassHtml());
 return kamaKarte("7 · Kontrolle",kamaKontrolleHtml());
}
function renderKaminAufnahme(){
 const ziel=$("kaminAufnahme");
 if(!ziel)return;
 kamaVerdrahten();
 ziel.innerHTML=kamaRegisterHtml()+kamaKopfInhalt()+`<div class="bar ra-blaettern">
<button type="button" class="gray" id="kam_zurueck"${kamSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="kam_weiter">${
 kamSchritt>=KAM_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(KAM_REGISTER[kamSchritt].kurz)}</button>
</div>`;
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("kam_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen; keine davon enthaelt ein Eingabefeld.
function kamaLive(){
 const kenn=$("kam_kennzahlen");
 if(kenn){
  const neu=document.createElement("div");
  neu.innerHTML=kamaKennzahlenHtml();
  const frisch=neu.firstElementChild;
  if(frisch)kenn.innerHTML=frisch.innerHTML;
 }
 const skizze=$("kam_skizze");
 if(skizze)skizze.innerHTML=kamaSkizze();
 const vor=$("kam_vorschau");
 if(vor){
  const t=kamaZuschnitte();
  vor.innerHTML=`<table class="eb-table ra-tab">
<thead><tr><th>Teil</th><th>Länge (mm)</th><th>Abwicklung (mm)</th></tr></thead>
<tbody>${t.map(x=>`<tr><td>${esc(x.name)}${x.seite?" "+esc(x.seite):""}</td>
<td>${kamaMm(x.laenge)}</td><td><b>${kamaMm(x.breite)}</b></td></tr>`).join("")}</tbody></table>`;
 }
 // Die Marke am Kontroll-Register nachfuehren, ohne neu zu zeichnen.
 const pr=kamaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#kam_register [data-kam-schritt="'+KAM_KONTROLLE+'"]');
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
const KAM_FELDER={kam_a:"a",kam_d:"d",kam_e:"e",kam_keil:"keil",
 kam_winkelVorne:"winkelVorne",kam_winkelHinten:"winkelHinten",
 kam_breiteVorne:"breiteVorne",kam_breiteHinten:"breiteHinten",
 kam_umschlagVorne:"umschlagVorne",kam_umschlagHinten:"umschlagHinten",
 kam_umschlagSeite:"umschlagSeite",kam_ueberlappung:"ueberlappung",
 kam_lattenabstand:"lattenabstand"};
const KAM_SEITENFELDER={kam_b:"b",kam_c:"c",kam_f:"f",kam_g:"g",kam_hoehe:"hoehe"};
function kamaFeldZuweisen(id,wert){
 if(KAM_FELDER[id]!==undefined){kamA[KAM_FELDER[id]]=wert;return true}
 const m=/^(kam_[a-zA-Z]+)_(l|r)$/.exec(id);
 if(m&&KAM_SEITENFELDER[m[1]]!==undefined){
  const feld=KAM_SEITENFELDER[m[1]];
  if(!kamA[feld]||typeof kamA[feld]!=="object")kamA[feld]={l:"",r:""};
  kamA[feld][m[2]]=wert;
  // Ohne getrennte Erfassung gilt der linke Wert fuer beide Seiten - der
  // rechte wird mitgefuehrt, damit ein spaeteres Einschalten nichts leert.
  if(!kamA.getrennt&&m[2]==="l")kamA[feld].r=wert;
  return true;
 }
 return false;
}
function kamaVerdrahten(){
 const wurzel=$("measTypeKamin");
 if(!wurzel||wurzel.dataset.kamVerdrahtet)return;
 wurzel.dataset.kamVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  if(!kamaFeldZuweisen(e.target.id,e.target.value))return;
  kamaLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target;
  // Rollenauswahl fuer DIESE Massaufnahme (gemeinsamer Kasten, js/33)
  {const w=zuRollenKlick(t,"data-kam-rolle");
   if(w!==null){kamA.rollenAuswahl=w; renderKaminAufnahme(); return}}
  if(t.id==="kam_material"){kamA.material=t.value; renderKaminAufnahme(); return}
  if(t.id==="kam_deckung"){kamA.deckung=t.value; renderKaminAufnahme(); return}
  if(t.id==="kam_getrennt"){
   kamA.getrennt=!!t.checked;
   if(kamA.getrennt)Object.keys(KAM_SEITENFELDER).forEach(k=>{
    const f=KAM_SEITENFELDER[k];
    if(kamA[f]&&(kamA[f].r===""||kamA[f].r===null||kamA[f].r===undefined))kamA[f].r=kamA[f].l;
   });
   renderKaminAufnahme(); return;
  }
  // Eine Zifferneingabe zeichnet auch beim Verlassen nicht neu.
  if(kamaFeldZuweisen(t.id,t.value)){kamaLive(); return}
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-kam-schritt]");
  if(reg){kamaSetzeSchritt(reg.dataset.kamSchritt);return}
  const sk=t.closest("[data-kam-skizze]");
  if(sk){kamA.skizzeSeite=sk.dataset.kamSkizze==="r"?"r":"l"; renderKaminAufnahme(); return}
  if(t.id==="kam_zurueck"){kamaSetzeSchritt(kamSchritt-1);return}
  if(t.id==="kam_weiter"){
   if(kamSchritt>=KAM_REGISTER.length)kamaAbschluss();
   else kamaSetzeSchritt(kamSchritt+1);
   return;
  }
  if(t.id==="kam_einstellungen"){
   if(typeof renderSettings!=="function")return;
   settingsReturnToMeasurement=true;
   $("measurementEditModal").hidden=true;
   renderSettings();
   if(typeof applyCompanyName==="function")applyCompanyName();
   applyKaminSettings();
   document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab==="measurements"));
   document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!=="measurements")});
   const sec=document.querySelector('.settings-section[data-section="kamineinfassung"]');
   if(sec)sec.classList.add("open");
   $("settingsModal").hidden=false;
   return;
  }
 });
}

// ---- Einstellungsseite ----------------------------------------------------
function applyKaminSettings(){
 if(!$("kamsUmschlagVorne"))return;
 const s=kaminSettings;
 const sel=$("kamsDeckung");
 if(sel&&document.activeElement!==sel&&typeof EINF_DECKUNGEN==="object"){
  sel.innerHTML=Object.keys(EINF_DECKUNGEN)
   .map(k=>`<option value="${k}"${k===s.deckung?" selected":""}>${anbEsc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 }
 const setzen=(id,wert)=>{const el=$(id); if(el&&document.activeElement!==el)el.value=wert};
 setzen("kamsLattenabstand",s.lattenabstand);
 setzen("kamsUmschlagVorne",s.umschlag_vorne);
 setzen("kamsUmschlagHinten",s.umschlag_hinten);
 setzen("kamsUmschlagSeite",s.umschlag_seite);
 setzen("kamsUeberlappung",s.ueberlappung);
 setzen("kamsAufbugHinten",s.aufbug_hinten);
 setzen("kamsMassVorne",s.mass_vorne);
 setzen("kamsMassHinten",s.mass_hinten);
}
(function kamEinstellungenBinden(){
 if(!$("saveKaminSettings"))return;
 applyKaminSettings();
 $("saveKaminSettings").onclick=()=>{
  const zahl=id=>Number($(id).value);
  const w={
   deckung:$("kamsDeckung").value,
   lattenabstand:zahl("kamsLattenabstand")||0,
   umschlag_vorne:zahl("kamsUmschlagVorne")||0,
   umschlag_hinten:zahl("kamsUmschlagHinten")||0,
   umschlag_seite:zahl("kamsUmschlagSeite")||0,
   ueberlappung:zahl("kamsUeberlappung")||0,
   aufbug_hinten:zahl("kamsAufbugHinten")||0,
   mass_vorne:zahl("kamsMassVorne")||0,
   mass_hinten:zahl("kamsMassHinten")||0
  };
  if(typeof EINF_DECKUNGEN==="object"&&!EINF_DECKUNGEN[w.deckung]){alert("Bitte ein Deckmaterial wählen.");return}
  if(["lattenabstand","umschlag_vorne","umschlag_hinten","umschlag_seite","ueberlappung",
      "aufbug_hinten","mass_vorne","mass_hinten"]
     .some(k=>w[k]<0)){alert("Diese Werte dürfen nicht negativ sein.");return}
  kamEinstellungenSichern(w);
  applyKaminSettings();
  alert("Gespeichert (gilt nur für dieses Gerät).");
 };
 $("resetKaminSettings").onclick=()=>{
  if(!confirm("Alle Werte der Kamineinfassung auf die Standardwerte zurücksetzen?"))return;
  kamEinstellungenSichern(Object.assign({},KAMIN_STANDARD));
  applyKaminSettings();
  alert("Auf Standardwerte zurückgesetzt.");
 };
})();

// ---- Speichern / Laden ----------------------------------------------------
// Alles, was gerechnet wurde, wird mitgespeichert - ein spaeter gedrucktes
// PDF bleibt dadurch gleich, auch wenn eine Einstellung geaendert wird.
function kamaDaten(){
 const a=kamA;
 const rp=kamaRollenPlan();
 const bl=kamaBleilappen();
 const paar=k=>({l:kamaSeite(k,"l"),r:kamaSeite(k,"r")});
 return {
  material:a.material, deckung:a.deckung, lattenabstand:kamaZahl(a.lattenabstand),
  getrennt:!!a.getrennt,
  a:kamaZahl(a.a), d:kamaZahl(a.d), e:kamaZahl(a.e), keil:kamaZahl(a.keil),
  // Seit v2.95 sind das die am Bau gemessenen Innenwinkel Dach/Wand. Das
  // Merkmal sagt das ausdruecklich, damit aeltere Datensaetze (die den Winkel
  // vom Senkrechten trugen) beim Oeffnen erkannt und umgerechnet werden.
  winkelBezug:"dach",
  winkelVorne:kamaZahl(a.winkelVorne), winkelHinten:kamaZahl(a.winkelHinten),
  breiteVorne:kamaZahl(a.breiteVorne), breiteHinten:kamaZahl(a.breiteHinten),
  umschlagVorne:kamaZahl(a.umschlagVorne), umschlagHinten:kamaZahl(a.umschlagHinten),
  umschlagSeite:kamaZahl(a.umschlagSeite), ueberlappung:kamaZahl(a.ueberlappung),
  b:paar("b"), c:paar("c"), f:paar("f"), g:paar("g"), hoehe:paar("hoehe"),
  kaminLaenge:{l:kamaKaminLaenge("l"),r:kamaKaminLaenge("r")},
  zuschnitte:kamaZuschnitte(),
  bleilappen:bl,
  flaeche_m2:Number(kamaFlaecheM2().toFixed(3)),
  ausmass:kamaAusmassZeilen(),
  rollen:{auswahl:(a.rollenAuswahl||[]).slice(),
          breiten:kamaRollenbreiten(),
          netto:Number(rp.netto.toFixed(3)),
          bestes:rp.bestes||null,
          moeglich:rp.moeglich||[],
          gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
            abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
            streifen:(g.streifen||[]).map(s=>({
              stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
              rest:s.rest}))})),
          optimal:rp.optimal!==false}
 };
}
function kamaZuruecksetzen(){
 kamA=kamaLeer();
 kamSchritt=1;
 renderKaminAufnahme();
}
function kamaFuellen(d){
 const w=d||{};
 const a=kamaLeer();
 // Die neuen Vorgaben A und D aus den Einstellungen gelten fuer eine NEUE
 // Aufnahme. Beim Oeffnen eines gespeicherten Datensatzes wird nichts
 // erfunden: fehlt eines der beiden Masse dort, bleibt es leer. (E ist seit
 // v2.90 vorbelegt und bleibt es - jeder gespeicherte Datensatz traegt es.)
 a.a=""; a.d="";
 const nimm=(k,ziel)=>{if(w[k]===0||w[k])a[ziel||k]=w[k]};
 a.material=w.material??"";
 if(w.deckung&&(typeof EINF_DECKUNGEN!=="object"||EINF_DECKUNGEN[w.deckung]))a.deckung=w.deckung;
 ["lattenabstand","a","d","e","keil","winkelVorne","winkelHinten",
  "breiteVorne","breiteHinten","umschlagVorne","umschlagHinten",
  "umschlagSeite","ueberlappung"].forEach(k=>nimm(k));
 // Datensaetze bis v2.94 trugen die Neigung VOM SENKRECHTEN (auf einem
 // 25-Grad-Dach also 25/25). Ohne das Merkmal "winkelBezug" werden sie in den
 // jetzt eingegebenen Innenwinkel Dach/Wand umgerechnet - aus 25/25 wird
 // 115/65. Die Abwicklung aendert sich dadurch NICHT: intern kommt genau
 // derselbe Wert wieder heraus (115-90 = 25 und 90-65 = 25).
 if(a.winkelVorne!=="")a.winkelVorne=kamaWinkelDach(w,"winkelVorne");
 if(a.winkelHinten!=="")a.winkelHinten=kamaWinkelDach(w,"winkelHinten");
 a.getrennt=!!w.getrennt;
 ["b","c","f","g","hoehe"].forEach(k=>{
  const v=w[k];
  if(v&&typeof v==="object")a[k]={l:(v.l===0||v.l)?v.l:"",r:(v.r===0||v.r)?v.r:""};
  else if(v===0||v)a[k]={l:v,r:v};
 });
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v2.90), bleibt es leer = ganzes Lager.
 const rq=(w.rollen&&w.rollen.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 kamA=a;
 kamSchritt=1;
 renderKaminAufnahme();
}
