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
// Alle vier Funktionen stammen aus js/14-freies-profil.js. js/11, js/12 und
// js/13 werden nicht gebraucht und deshalb auch nicht angefasst.
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
 ]}
];

let text='"use strict";\n'
 +"// ==========================================================================\n"
 +"// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.\n"
 +"// Erzeugt von prototyp-freies-profil/uebernehmen.js; jede Funktion ist\n"
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

// Die beiden Konstanten der Erkennung gehören zur übernommenen Prüfung und
// werden deshalb ebenfalls aus der Quelle gelesen statt hier getippt.
const q14=lies("js/14-freies-profil.js");
for(const konst of ["FP_ERKENNUNG_ZEITGRENZE_MS","FP_MAX_SCHENKEL"]){
 const zeile=q14.split("\n").find(z=>z.startsWith("const "+konst+"="));
 if(!zeile)throw new Error("Konstante nicht gefunden: "+konst);
 text+="\n// ---- "+konst+"  ·  unverändert aus js/14-freies-profil.js ----\n"+zeile+"\n";
 bericht.push({name:konst,datei:"js/14-freies-profil.js",zeichen:zeile.length});
}

const ziel=path.join(wurzel,"prototyp-freies-profil","uebernommen.js");
fs.writeFileSync(ziel,text,"utf8");

// Gegenprobe über die geschriebene Datei: jedes Stück muss dort UND in der
// Quelle wortgleich stehen.
const geschrieben=fs.readFileSync(ziel,"utf8");
for(const q of QUELLEN){
 const quelle=lies(q.datei);
 for(const n of q.namen){
  const stueck=schneide(quelle,n);
  if(geschrieben.indexOf(stueck)<0)throw new Error("uebernommen.js weicht ab bei "+n);
 }
}
console.log("geschrieben: prototyp-freies-profil/uebernommen.js");
bericht.forEach(b=>console.log("  "+b.name.padEnd(30)+b.zeichen.toString().padStart(6)+" Zeichen  aus "+b.datei));
console.log("  Gegenprobe: alle "+bericht.length+" Stücke zeichengenau wie in der App.");
