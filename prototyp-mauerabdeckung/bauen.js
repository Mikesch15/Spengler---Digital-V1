"use strict";
// ===========================================================================
// Baut aus den Einzeldateien EINE eigenständige Testapp:
//     prototyp-mauerabdeckung/mauerabdeckung-testapp.html
//
// Diese eine Datei lässt sich überall öffnen – auch auf einem Tablet, das nur
// die Datei bekommt und nicht den ganzen Ordner. Kein Server, kein Internet,
// kein Login.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:
//     node prototyp-mauerabdeckung/uebernehmen.js   (Fachlogik frisch schneiden)
//     node prototyp-mauerabdeckung/bauen.js
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
const protoCss  = lies("prototyp-mauerabdeckung/prototyp.css");
const bruecke   = lies("prototyp-mauerabdeckung/bruecke.js");
const uebernommen = lies("prototyp-mauerabdeckung/uebernommen.js");
const prototyp  = lies("prototyp-mauerabdeckung/prototyp-mad.js");
const seite     = lies("prototyp-mauerabdeckung/mauerabdeckung.html");

// Aus der Mehrdatei-Seite nur den Rumpf übernehmen, damit beide Fassungen
// dieselbe Oberfläche zeigen und nicht auseinanderlaufen können.
const vonBody=seite.indexOf("<body>")+"<body>".length;
const bisBody=seite.indexOf('<script src="bruecke.js">');
if(vonBody<6||bisBody<0)throw new Error("mauerabdeckung.html: Rumpf nicht gefunden");
const rumpf=seite.slice(vonBody,bisBody).trim();

const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prototyp · Massaufnahme Mauerabdeckung</title>
<!-- ===================================================================
     EIGENSTÄNDIGE TESTAPP  ·  eine einzige Datei, überall zu öffnen
     Erzeugt von prototyp-mauerabdeckung/bauen.js – nicht von Hand bearbeiten.
     Änderungen gehören in prototyp-mauerabdeckung/prototyp-mad.js bzw.
     prototyp.css, danach "node prototyp-mauerabdeckung/bauen.js" laufen lassen.
     Gebaut am ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC
     =================================================================== -->
<style>
/* ---- css/01-basis.css (unverändert aus der laufenden App) ---- */
${sicherCss(basisCss)}
/* ---- prototyp-mauerabdeckung/prototyp.css ---- */
${sicherCss(protoCss)}
</style>
</head>
<body>
${rumpf}
<script>
/* ---- prototyp-mauerabdeckung/bruecke.js ---- */
${sicherJs(bruecke)}
</script>
<script>
/* ---- Fachlogik, zeichengenau aus js/01, js/12, js/12b, js/14 und js/29 ---- */
${sicherJs(uebernommen)}
</script>
<script>
/* ---- prototyp-mauerabdeckung/prototyp-mad.js ---- */
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
function schneideEinzeiler(quelle,name){
 const start=quelle.indexOf("function "+name+"(");
 const ende=quelle.indexOf("\n",start);
 if(start<0||ende<0)throw new Error("nicht gefunden: "+name);
 return quelle.slice(start,ende+1);
}
const PRUEFEN=[
 ["js/01-basis.js","findMeasurementMaterial"],
 ["js/01-basis.js","measurementMaterialOrFallback"],
 ["js/12-rinne-halbrund.js","calcDilaPositionsInStretch"],
 ["js/12-rinne-halbrund.js","generateRinneGrundriss"],
 ["js/14-freies-profil.js","abgerundeterPfad"],
 ["js/14-freies-profil.js","ansichtsPfeilSvg"],
 ["js/12b-mauerabdeckung.js","madMaterialTabelle"],
 ["js/12b-mauerabdeckung.js","computeMadBoundaries"],
 ["js/12b-mauerabdeckung.js","calcMadSchieber"],
 ["js/12b-mauerabdeckung.js","berechneMadStueckliste"],
 ["js/12b-mauerabdeckung.js","madProfilMasse"],
 ["js/12b-mauerabdeckung.js","madNormHinweise"],
 ["js/12b-mauerabdeckung.js","madProfilSvgAus"],
 ["js/12b-mauerabdeckung.js","generateMadProfilSvg"],
 ["js/29-einlaufblech-aufnahme.js","ebaPackeInStreifen"]
];
const PRUEFEN_EINZEILER=[["js/12b-mauerabdeckung.js","madBiegeVorgabe"]];
for(const [datei,name] of PRUEFEN){
 const stueck=schneide(lies(datei),name);
 if(html.indexOf(sicherJs(stueck))<0)
  throw new Error("Die eingebettete Fachlogik weicht ab bei "+name+" – Abbruch.");
}
for(const [datei,name] of PRUEFEN_EINZEILER){
 const stueck=schneideEinzeiler(lies(datei),name);
 if(html.indexOf(sicherJs(stueck))<0)
  throw new Error("Die eingebettete Fachlogik weicht ab bei "+name+" – Abbruch.");
}

const ziel=path.join(wurzel,"prototyp-mauerabdeckung","mauerabdeckung-testapp.html");
fs.writeFileSync(ziel,html,"utf8");
console.log("geschrieben: prototyp-mauerabdeckung/mauerabdeckung-testapp.html  ("
 +(Buffer.byteLength(html,"utf8")/1024).toFixed(0)+" KB)");
console.log("  css/01-basis.css                     "+basisCss.length+" Zeichen");
console.log("  prototyp.css                         "+protoCss.length+" Zeichen");
console.log("  bruecke.js                           "+bruecke.length+" Zeichen");
console.log("  uebernommen.js                       "+uebernommen.length+" Zeichen  (aus js/01, js/12, js/12b, js/14, js/29)");
console.log("  prototyp-mad.js                      "+prototyp.length+" Zeichen");
console.log("  Gegenprobe: alle "+(PRUEFEN.length+PRUEFEN_EINZEILER.length)+" Fachfunktionen zeichengenau wie in der App.");
