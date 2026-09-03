"use strict";
// ===========================================================================
// Baut aus den Einzeldateien EINE eigenständige Testapp:
//     prototyp-einlaufblech/einlaufblech-gerade-testapp.html
//
// Diese eine Datei lässt sich überall öffnen – auch auf einem Tablet, das nur
// die Datei bekommt und nicht den ganzen Ordner. Kein Server, kein Internet,
// kein Login.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:
//     node prototyp-einlaufblech/uebernehmen.js   (Fachlogik frisch schneiden)
//     node prototyp-einlaufblech/bauen.js
//
// Die übernommene Fachlogik wird eingebettet und danach ZEICHENGENAU gegen
// ihre Quelldateien in js/ geprüft – sonst bricht das Skript ab.
// ===========================================================================
const fs=require("fs"), path=require("path");
const wurzel=path.resolve(__dirname,"..");
const lies=p=>fs.readFileSync(path.join(wurzel,p),"utf8");

const sicherJs =t=>t.replace(/<\/script/gi,"<\\/script");
const sicherCss=t=>t.replace(/<\/style/gi,"<\\/style");

const basisCss  = lies("css/01-basis.css");
const protoCss  = lies("prototyp-einlaufblech/prototyp.css");
const bruecke   = lies("prototyp-einlaufblech/bruecke.js");
const uebernommen = lies("prototyp-einlaufblech/uebernommen.js");
const prototyp  = lies("prototyp-einlaufblech/prototyp-eb.js");
const seite     = lies("prototyp-einlaufblech/einlaufblech-gerade.html");

// Aus der Mehrdatei-Seite nur den Rumpf übernehmen, damit beide Fassungen
// dieselbe Oberfläche zeigen und nicht auseinanderlaufen können.
const vonBody=seite.indexOf("<body>")+"<body>".length;
const bisBody=seite.indexOf('<script src="bruecke.js">');
if(vonBody<6||bisBody<0)throw new Error("einlaufblech-gerade.html: Rumpf nicht gefunden");
const rumpf=seite.slice(vonBody,bisBody).trim();

const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prototyp · Massaufnahme Einlaufblech gerade</title>
<!-- ===================================================================
     EIGENSTÄNDIGE TESTAPP  ·  eine einzige Datei, überall zu öffnen
     Erzeugt von prototyp-einlaufblech/bauen.js – nicht von Hand bearbeiten.
     Änderungen gehören in prototyp-einlaufblech/prototyp-eb.js bzw.
     prototyp.css, danach "node prototyp-einlaufblech/bauen.js" laufen lassen.
     Gebaut am ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC
     =================================================================== -->
<style>
/* ---- css/01-basis.css (unverändert aus der laufenden App) ---- */
${sicherCss(basisCss)}
/* ---- prototyp-einlaufblech/prototyp.css ---- */
${sicherCss(protoCss)}
</style>
</head>
<body>
${rumpf}
<script>
/* ---- prototyp-einlaufblech/bruecke.js ---- */
${sicherJs(bruecke)}
</script>
<script>
/* ---- Fachlogik, zeichengenau aus js/11, js/13 und js/14 ---- */
${sicherJs(uebernommen)}
</script>
<script>
/* ---- prototyp-einlaufblech/prototyp-eb.js ---- */
${sicherJs(prototyp)}
</script>
</body>
</html>
`;

// Gegenprobe: steckt die Fachlogik der App wirklich zeichengenau drin?
function schneide(quelle,name){
 const start=quelle.indexOf("function "+name+"(");
 const ende=quelle.indexOf("\n}\n",start);
 if(start<0||ende<0)throw new Error("nicht gefunden: "+name);
 return quelle.slice(start,ende+3);
}
const PRUEFEN=[
 ["js/11-einlaufblech-gerade.js","einlaufblechDiagramSvg"],
 ["js/13-einlaufblech-konisch.js","teileLaengeInStuecke"],
 ["js/13-einlaufblech-konisch.js","generateEbkGrundriss"],
 ["js/13-einlaufblech-konisch.js","baueEinlaufblechStueckeAusRinne"],
 ["js/14-freies-profil.js","ansichtsPfeilSvg"]
];
for(const [datei,name] of PRUEFEN){
 const stueck=schneide(lies(datei),name);
 if(html.indexOf(sicherJs(stueck))<0)
  throw new Error("Die eingebettete Fachlogik weicht ab bei "+name+" – Abbruch.");
}

const ziel=path.join(wurzel,"prototyp-einlaufblech","einlaufblech-gerade-testapp.html");
fs.writeFileSync(ziel,html,"utf8");
console.log("geschrieben: prototyp-einlaufblech/einlaufblech-gerade-testapp.html  ("
 +(Buffer.byteLength(html,"utf8")/1024).toFixed(0)+" KB)");
console.log("  css/01-basis.css                     "+basisCss.length+" Zeichen");
console.log("  prototyp.css                         "+protoCss.length+" Zeichen");
console.log("  bruecke.js                           "+bruecke.length+" Zeichen");
console.log("  uebernommen.js                       "+uebernommen.length+" Zeichen  (aus js/11, js/13, js/14)");
console.log("  prototyp-eb.js                       "+prototyp.length+" Zeichen");
console.log("  Gegenprobe: alle "+PRUEFEN.length+" Fachfunktionen zeichengenau wie in der App.");
