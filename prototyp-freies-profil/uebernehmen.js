"use strict";
// ===========================================================================
// Schneidet die benötigte Fachlogik ZEICHENGENAU aus der laufenden App heraus
// und schreibt sie nach prototyp-freies-profil/uebernommen.js.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:  node prototyp-freies-profil/uebernehmen.js
//
// Es wird nichts umgeschrieben und nichts nachgebaut: jede Funktion wird als
// Text aus ihrer Quelldatei geschnitten, und danach wird geprüft, dass der
// geschnittene Text unverändert in der Quelle vorkommt. Weicht auch nur ein
// Zeichen ab, bricht das Skript ab.
//
// Quellen: js/14-freies-profil.js (Zeichnung und Erkennungsprüfung) sowie
// js/29-einlaufblech-aufnahme.js (Packrechnung für den Zuschnitt aus
// Rollenblech - es gibt in der App bewusst nur EINE Packrechnung).
// js/11, js/12 und js/13 werden nicht gebraucht und nicht angefasst.
//
// EINE EINZIGE AUSNAHME von der Zeichengleichheit: generateProfilDiagramSvg()
// bekommt die unten in KORREKTUREN aufgeführten Ersetzungen. Grund und Belege
// stehen dort. Jede Ersetzung verlangt, dass der alte Text WORTGLEICH in der
// App steht - wird die App später selbst korrigiert, bricht dieses Skript ab
// und die Abweichung fällt sofort auf.
// ===========================================================================
const fs=require("fs"), path=require("path");
const wurzel=path.resolve(__dirname,"..");
const lies=p=>fs.readFileSync(path.join(wurzel,p),"utf8");

// Eine Funktion vom "function <name>(" bis zur schliessenden Klammer am
// Zeilenanfang herausschneiden - so sind die Dateien der App geschrieben.
function schneide(quelle,name){
 const start=quelle.indexOf("function "+name+"(");
 if(start<0)throw new Error("nicht gefunden: "+name);
 const ende=quelle.indexOf("\n}\n",start);
 if(ende<0)throw new Error("kein Ende gefunden: "+name);
 return quelle.slice(start,ende+3);
}

const QUELLEN=[
 {datei:"js/14-freies-profil.js",namen:[
   "abgerundeterPfad",          // runde Biegungen
   "ansichtsPfeilSvg",          // Ansichtsrichtung
   "generateProfilDiagramSvg",  // die ganze Profilzeichnung
   "fpPruefeErkannteSchenkel"   // Prüfung der Skizzen-Erkennung, max. 24 Schenkel
 ]},
 {datei:"js/29-einlaufblech-aufnahme.js",namen:[
   "ebaPackeInStreifen"         // Streifenpackung für den Zuschnitt aus Rollenblech
 ]}
];

// Konstanten, die zu den übernommenen Funktionen gehören - ebenfalls aus der
// Quelle gelesen statt hier getippt.
const KONSTANTEN=[
 {datei:"js/14-freies-profil.js",namen:["FP_ERKENNUNG_ZEITGRENZE_MS","FP_MAX_SCHENKEL"]},
 {datei:"js/29-einlaufblech-aufnahme.js",namen:["ebaZahl","EBA_ROLLEN_STANDARD","EBA_ROLLEN_WAEHLBAR"]}
];

// ---------------------------------------------------------------------------
// KORREKTUREN an generateProfilDiagramSvg()
//
// Gemeldet am 04.09.2026 mit Bildschirmfoto: Profil 12 mm / 50 mm (180°
// Umschlag) / 60 mm (-90°). Der Umschlag wird um GAP versetzt gezeichnet, der
// folgende Schenkel setzt aber am UNVERSETZTEN Punkt an. Ergebnis: der dritte
// Schenkel liegt auf der Höhe des ersten und zwischen Schenkel 2 und 3 klafft
// eine Lücke von GAP.
//
// Korrektur: der Versatz eines Umschlags wird auf alle folgenden Schenkel
// mitgenommen. Das entspricht auch der Wirklichkeit - nach einem Umschlag
// liegt das Blech um seine eigene Dicke versetzt weiter.
//
// DERSELBE FEHLER STECKT IN DER LAUFENDEN APP (js/14-freies-profil.js). Er
// wird hier NICHT in der App behoben, weil dieser Auftrag main ausdrücklich
// nicht verändern darf. Siehe Abschlussbericht.
// ---------------------------------------------------------------------------
const KORREKTUREN=[
 {name:"generateProfilDiagramSvg",
  alt:` const drawEnds=schenkel.map((s,i)=>{
  const [x1,y1]=svgPtsRaw[i],[x2,y2]=svgPtsRaw[i+1];
  if(!istUmschlag(i))return[[x1,y1],[x2,y2]];
  const radDir=dirs[i+1]*Math.PI/180;
  const nx=-Math.sin(radDir),ny=Math.cos(radDir);
  return[[x1+nx*GAP,y1+ny*GAP],[x2+nx*GAP,y2+ny*GAP]];
 });`,
  neu:` // KORRIGIERT IM PROTOTYP: laufender Versatz statt Versatz nur am Umschlag.
 const versatz=[[0,0]];
 const drawEnds=schenkel.map((s,i)=>{
  const [ox,oy]=versatz[i];
  const [x1,y1]=svgPtsRaw[i],[x2,y2]=svgPtsRaw[i+1];
  if(!istUmschlag(i)){versatz.push([ox,oy]);return[[x1+ox,y1+oy],[x2+ox,y2+oy]]}
  const radDir=dirs[i+1]*Math.PI/180;
  const nx=-Math.sin(radDir),ny=Math.cos(radDir);
  versatz.push([ox+nx*GAP,oy+ny*GAP]);
  return[[x1+ox+nx*GAP,y1+oy+ny*GAP],[x2+ox+nx*GAP,y2+oy+ny*GAP]];
 });`},
 {name:"generateProfilDiagramSvg",
  alt:` let aktuellerPfad=[svgPtsRaw[0]];`,
  neu:` let aktuellerPfad=[drawEnds.length?drawEnds[0][0]:svgPtsRaw[0]];`},
 {name:"generateProfilDiagramSvg",
  alt:`   const [sx,sy]=svgPtsRaw[i];`,
  neu:`   const [sx,sy]=[svgPtsRaw[i][0]+versatz[i][0],svgPtsRaw[i][1]+versatz[i][1]];`},
 {name:"generateProfilDiagramSvg",
  alt:`   aktuellerPfad=[svgPtsRaw[i+1]];
  }else{
   aktuellerPfad.push(svgPtsRaw[i+1]);
  }`,
  neu:`   aktuellerPfad=[drawEnds[i][1]];
  }else{
   aktuellerPfad.push(drawEnds[i][1]);
  }`}
];

let text='"use strict";\n'
 +"// ==========================================================================\n"
 +"// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.\n"
 +"// Erzeugt von prototyp-freies-profil/uebernehmen.js; jede Funktion ist\n"
 +"// zeichengenau aus ihrer Quelldatei geschnitten und danach gegen die\n"
 +"// Quelle geprüft worden. Einzige Ausnahme: generateProfilDiagramSvg() -\n"
 +"// dort sind die in uebernehmen.js aufgeführten Korrekturen eingesetzt.\n"
 +"// ==========================================================================\n";

const bericht=[];
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of q.namen){
  let stueck=schneide(quelle,n);
  if(quelle.indexOf(stueck)<0)throw new Error("Gegenprobe fehlgeschlagen: "+n);
  const roh=stueck.length;
  let anzahl=0;
  for(const k of KORREKTUREN){
   if(k.name!==n)continue;
   if(stueck.indexOf(k.alt)<0)
    throw new Error("Korrektur passt nicht mehr auf "+n+" - die App hat sich geändert:\n"+k.alt);
   stueck=stueck.replace(k.alt,k.neu);
   anzahl++;
  }
  text+="\n// ---- "+n+"()  ·  aus "+q.datei
      +(anzahl?"  ("+anzahl+" Korrekturen, siehe uebernehmen.js)":"  ·  unverändert")+" ----\n"+stueck;
  bericht.push({name:n,datei:q.datei,zeichen:roh,korrekturen:anzahl});
 }
}

for(const k of KONSTANTEN){
 const quelle=lies(k.datei);
 for(const konst of k.namen){
  const zeile=quelle.split("\n").find(z=>z.startsWith("const "+konst+"="));
  if(!zeile)throw new Error("Konstante nicht gefunden: "+konst);
  text+="\n// ---- "+konst+"  ·  unverändert aus "+k.datei+" ----\n"+zeile+"\n";
  bericht.push({name:konst,datei:k.datei,zeichen:zeile.length,korrekturen:0});
 }
}

const ziel=path.join(wurzel,"prototyp-freies-profil","uebernommen.js");
fs.writeFileSync(ziel,text,"utf8");

// Gegenprobe über die geschriebene Datei: jedes unkorrigierte Stück muss dort
// UND in der Quelle wortgleich stehen.
const geschrieben=fs.readFileSync(ziel,"utf8");
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of q.namen){
  if(KORREKTUREN.some(k=>k.name===n))continue;
  const stueck=schneide(quelle,n);
  if(geschrieben.indexOf(stueck)<0)throw new Error("uebernommen.js weicht ab bei "+n);
 }
}
console.log("geschrieben: prototyp-freies-profil/uebernommen.js");
bericht.forEach(b=>console.log("  "+b.name.padEnd(28)+b.zeichen.toString().padStart(6)+" Zeichen  aus "+b.datei
  +(b.korrekturen?"   ("+b.korrekturen+" Korrekturen)":"")));
const rein=bericht.filter(b=>!b.korrekturen).length;
console.log("  Gegenprobe: "+rein+" von "+bericht.length+" Stücken zeichengenau wie in der App,");
console.log("              1 Stück mit "+KORREKTUREN.length+" ausgewiesenen Korrekturen (Umschlag-Versatz).");
