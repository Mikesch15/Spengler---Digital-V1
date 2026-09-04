"use strict";
// ===========================================================================
// Schneidet die benötigte Fachlogik ZEICHENGENAU aus der laufenden App heraus
// und schreibt sie nach prototyp-mauerabdeckung/uebernommen.js.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:  node prototyp-mauerabdeckung/uebernehmen.js
//
// Es wird nichts umgeschrieben und nichts nachgebaut: jede Funktion und jede
// Konstante wird als Text aus ihrer Quelldatei geschnitten, und danach wird
// geprüft, dass der geschnittene Text unverändert in der Quelle vorkommt.
// Weicht auch nur ein Zeichen ab, bricht das Skript ab.
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
// Eine einzeilige Funktion: von "function <name>(" bis zum Zeilenende.
// Nötig, weil die allgemeine Regel oben erst bei "\n}\n" endet - eine
// Funktion, die in EINER Zeile mit "}}" schliesst, würde damit die nächste
// Funktion mit einschneiden (bei madBiegeVorgabe tatsächlich passiert).
function schneideEinzeiler(quelle,name){
 const start=quelle.indexOf("function "+name+"(");
 if(start<0)throw new Error("nicht gefunden: "+name);
 const ende=quelle.indexOf("\n",start);
 if(ende<0)throw new Error("kein Zeilenende gefunden: "+name);
 const zeile=quelle.slice(start,ende+1);
 const auf=(zeile.match(/{/g)||[]).length, zu=(zeile.match(/}/g)||[]).length;
 if(auf===0||auf!==zu)throw new Error("keine einzeilige Funktion: "+name);
 return zeile;
}
// Eine einzeilige Konstante: von "const <name>=" bis zum Zeilenende.
function schneideZeile(quelle,name){
 const start=quelle.indexOf("const "+name+"=");
 if(start<0)throw new Error("nicht gefunden: const "+name);
 const ende=quelle.indexOf("\n",start);
 if(ende<0)throw new Error("kein Zeilenende gefunden: const "+name);
 return quelle.slice(start,ende+1);
}

const QUELLEN=[
 {datei:"js/01-basis.js", zeilen:["MEASUREMENT_MATERIAL_FALLBACK"],
                          namen:["findMeasurementMaterial","measurementMaterialOrFallback"]},
 {datei:"js/12-rinne-halbrund.js",
                          namen:["calcDilaPositionsInStretch","generateRinneGrundriss"]},
 {datei:"js/14-freies-profil.js",
                          namen:["abgerundeterPfad","ansichtsPfeilSvg"]},
 // Zuschnitt aus Rollenblech: dieselbe Packrechnung wie bei Einlaufblech
 // gerade, Einlaufblech konisch und Freies Profil. Es gibt in der ganzen App
 // nur EINE davon.
 {datei:"js/29-einlaufblech-aufnahme.js",
                          zeilen:["ebaZahl"],
                          namen:["ebaPackeInStreifen"]},
 {datei:"js/12b-mauerabdeckung.js",
                          zeilen:["MAD_BIEGERADIUS","MAD_SAUM_LUFT","MAD_MIN_HOEHE"],
                          einzeiler:["madBiegeVorgabe"],
                          namen:["madMaterialTabelle","computeMadBoundaries","calcMadSchieber",
                                 "berechneMadStueckliste","madProfilMasse",
                                 "madNormHinweise","madProfilSvgAus","generateMadProfilSvg"]}
];

let text='"use strict";\n'
 +"// ==========================================================================\n"
 +"// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.\n"
 +"// Erzeugt von prototyp-mauerabdeckung/uebernehmen.js; jedes Stück ist\n"
 +"// zeichengenau aus seiner Quelldatei geschnitten und danach gegen die\n"
 +"// Quelle geprüft worden.\n"
 +"// ==========================================================================\n";

const bericht=[];
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of (q.zeilen||[])){
  const stueck=schneideZeile(quelle,n);
  if(quelle.indexOf(stueck)<0)throw new Error("Gegenprobe fehlgeschlagen: const "+n);
  text+="\n// ---- const "+n+"  ·  unverändert aus "+q.datei+" ----\n"+stueck;
  bericht.push({name:"const "+n,datei:q.datei,zeichen:stueck.length});
 }
 for(const n of (q.einzeiler||[])){
  const stueck=schneideEinzeiler(quelle,n);
  if(quelle.indexOf(stueck)<0)throw new Error("Gegenprobe fehlgeschlagen: "+n);
  text+="\n// ---- "+n+"()  ·  unverändert aus "+q.datei+" ----\n"+stueck;
  bericht.push({name:n,datei:q.datei,zeichen:stueck.length});
 }
 for(const n of (q.namen||[])){
  const stueck=schneide(quelle,n);
  if(quelle.indexOf(stueck)<0)throw new Error("Gegenprobe fehlgeschlagen: "+n);
  text+="\n// ---- "+n+"()  ·  unverändert aus "+q.datei+" ----\n"+stueck;
  bericht.push({name:n,datei:q.datei,zeichen:stueck.length});
 }
}

const ziel=path.join(wurzel,"prototyp-mauerabdeckung","uebernommen.js");
fs.writeFileSync(ziel,text,"utf8");

// Gegenprobe über die geschriebene Datei: jedes Stück muss dort UND in der
// Quelle wortgleich stehen.
const geschrieben=fs.readFileSync(ziel,"utf8");
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of (q.zeilen||[]))
  if(geschrieben.indexOf(schneideZeile(quelle,n))<0)
   throw new Error("uebernommen.js weicht ab bei const "+n);
 for(const n of (q.einzeiler||[]))
  if(geschrieben.indexOf(schneideEinzeiler(quelle,n))<0)
   throw new Error("uebernommen.js weicht ab bei "+n);
 for(const n of (q.namen||[]))
  if(geschrieben.indexOf(schneide(quelle,n))<0)
   throw new Error("uebernommen.js weicht ab bei "+n);
}
// Nichts darf doppelt drinstehen. Ein zu weit geschnittenes Stück nimmt sonst
// die nächste Funktion mit, und die stünde danach zweimal in der Datei -
// genau das ist beim ersten Anlauf mit madBiegeVorgabe passiert.
for(const b of bericht){
 const gesucht=b.name.startsWith("const ")?"\n"+b.name+"=":"\nfunction "+b.name+"(";
 const anzahl=geschrieben.split(gesucht).length-1;
 if(anzahl!==1)throw new Error(b.name+" steht "+anzahl+" mal in uebernommen.js - Abbruch.");
}
console.log("geschrieben: prototyp-mauerabdeckung/uebernommen.js");
bericht.forEach(b=>console.log("  "+b.name.padEnd(34)+b.zeichen.toString().padStart(6)+" Zeichen  aus "+b.datei));
console.log("  Gegenprobe: alle "+bericht.length+" Stücke zeichengenau wie in der App.");
