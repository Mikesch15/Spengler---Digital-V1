"use strict";
// ===========================================================================
// Schneidet die benötigte Fachlogik ZEICHENGENAU aus der laufenden App heraus
// und schreibt sie nach prototyp-einlaufblech/uebernommen.js.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:  node prototyp-einlaufblech/uebernehmen.js
//
// Es wird nichts umgeschrieben und nichts nachgebaut: jede Funktion wird als
// Text aus ihrer Quelldatei geschnitten, und danach wird geprüft, dass der
// geschnittene Text unverändert in der Quelle vorkommt. Weicht auch nur ein
// Zeichen ab, bricht das Skript ab.
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
 {datei:"js/11-einlaufblech-gerade.js", namen:["einlaufblechDiagramSvg"]},
 {datei:"js/13-einlaufblech-konisch.js",namen:["teileLaengeInStuecke","generateEbkGrundriss","baueEinlaufblechStueckeAusRinne"]},
 {datei:"js/14-freies-profil.js",       namen:["ansichtsPfeilSvg"]}
];

let text='"use strict";\n'
 +"// ==========================================================================\n"
 +"// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.\n"
 +"// Erzeugt von prototyp-einlaufblech/uebernehmen.js; jede Funktion ist\n"
 +"// zeichengenau aus ihrer Quelldatei geschnitten und danach gegen die\n"
 +"// Quelle geprüft worden.\n"
 +"// ==========================================================================\n";

const bericht=[];
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of q.namen){
  const stueck=schneide(quelle,n);
  if(quelle.indexOf(stueck)<0)throw new Error("Gegenprobe fehlgeschlagen: "+n);
  text+="\n// ---- "+n+"()  ·  unverändert aus "+q.datei+" ----\n"+stueck;
  bericht.push({name:n,datei:q.datei,zeichen:stueck.length});
 }
}

const ziel=path.join(wurzel,"prototyp-einlaufblech","uebernommen.js");
fs.writeFileSync(ziel,text,"utf8");

// Gegenprobe über die geschriebene Datei: jedes Stück muss dort UND in der
// Quelle wortgleich stehen.
const geschrieben=fs.readFileSync(ziel,"utf8");
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of q.namen){
  const stueck=schneide(quelle,n);
  if(geschrieben.indexOf(stueck)<0)
   throw new Error("uebernommen.js weicht ab bei "+n);
 }
}
console.log("geschrieben: prototyp-einlaufblech/uebernommen.js");
bericht.forEach(b=>console.log("  "+b.name.padEnd(32)+b.zeichen.toString().padStart(6)+" Zeichen  aus "+b.datei));
console.log("  Gegenprobe: alle "+bericht.length+" Funktionen zeichengenau wie in der App.");
