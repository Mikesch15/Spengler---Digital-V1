"use strict";
// ===========================================================================
// Baut aus den Einzeldateien EINE eigenständige Testapp:
//     prototyp-freies-profil/freies-profil-testapp.html
//
// Diese eine Datei lässt sich überall öffnen – auch auf einem Tablet, das nur
// die Datei bekommt und nicht den ganzen Ordner. Kein Server, kein Login.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:
//     node prototyp-freies-profil/uebernehmen.js   (Fachlogik frisch schneiden)
//     node prototyp-freies-profil/bauen.js
//
// Die übernommene Fachlogik wird eingebettet und danach ZEICHENGENAU gegen
// ihre Quelldatei in js/ geprüft – sonst bricht das Skript ab.
// ===========================================================================
const fs=require("fs"), path=require("path");
const wurzel=path.resolve(__dirname,"..");
const lies=p=>fs.readFileSync(path.join(wurzel,p),"utf8");

const sicherJs =t=>t.replace(/<\/script/gi,"<\\/script");
const sicherCss=t=>t.replace(/<\/style/gi,"<\\/style");

const basisCss    = lies("css/01-basis.css");
const protoCss    = lies("prototyp-freies-profil/prototyp.css");
const bruecke     = lies("prototyp-freies-profil/bruecke.js");
const uebernommen = lies("prototyp-freies-profil/uebernommen.js");
const prototyp    = lies("prototyp-freies-profil/prototyp-fp.js");
const seite       = lies("prototyp-freies-profil/freies-profil.html");

// Aus der Mehrdatei-Seite nur den Rumpf übernehmen, damit beide Fassungen
// dieselbe Oberfläche zeigen und nicht auseinanderlaufen können.
const vonBody=seite.indexOf("<body>")+"<body>".length;
const bisBody=seite.indexOf('<script src="bruecke.js">');
if(vonBody<6||bisBody<0)throw new Error("freies-profil.html: Rumpf nicht gefunden");
const rumpf=seite.slice(vonBody,bisBody).trim();

const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prototyp · Massaufnahme Freies Profil</title>
<!-- ===================================================================
     EIGENSTÄNDIGE TESTAPP  ·  eine einzige Datei, überall zu öffnen
     Erzeugt von prototyp-freies-profil/bauen.js – nicht von Hand bearbeiten.
     Änderungen gehören in prototyp-freies-profil/prototyp-fp.js bzw.
     prototyp.css, danach "node prototyp-freies-profil/bauen.js" laufen lassen.
     Gebaut am ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC
     =================================================================== -->
<style>
/* ---- css/01-basis.css (unverändert aus der laufenden App) ---- */
${sicherCss(basisCss)}
/* ---- prototyp-freies-profil/prototyp.css ---- */
${sicherCss(protoCss)}
</style>
</head>
<body>
${rumpf}
<script>
/* ---- prototyp-freies-profil/bruecke.js ---- */
${sicherJs(bruecke)}
</script>
<script>
/* ---- Fachlogik, zeichengenau aus js/14-freies-profil.js ---- */
${sicherJs(uebernommen)}
</script>
<script>
/* ---- prototyp-freies-profil/prototyp-fp.js ---- */
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
const PRUEFEN=["abgerundeterPfad","ansichtsPfeilSvg","generateProfilDiagramSvg","fpPruefeErkannteSchenkel"];
const q14=lies("js/14-freies-profil.js");
for(const name of PRUEFEN){
 const stueck=schneide(q14,name);
 if(html.indexOf(sicherJs(stueck))<0)
  throw new Error("Die eingebettete Fachlogik weicht ab bei "+name+" – Abbruch.");
}
for(const konst of ["FP_ERKENNUNG_ZEITGRENZE_MS","FP_MAX_SCHENKEL"]){
 const zeile=q14.split("\n").find(z=>z.startsWith("const "+konst+"="));
 if(!zeile||html.indexOf(zeile)<0)
  throw new Error("Die Konstante "+konst+" weicht ab – Abbruch.");
}

const ziel=path.join(wurzel,"prototyp-freies-profil","freies-profil-testapp.html");
fs.writeFileSync(ziel,html,"utf8");
console.log("geschrieben: prototyp-freies-profil/freies-profil-testapp.html  ("
 +(Buffer.byteLength(html,"utf8")/1024).toFixed(0)+" KB)");
console.log("  css/01-basis.css      "+basisCss.length+" Zeichen");
console.log("  prototyp.css          "+protoCss.length+" Zeichen");
console.log("  bruecke.js            "+bruecke.length+" Zeichen");
console.log("  uebernommen.js        "+uebernommen.length+" Zeichen  (aus js/14-freies-profil.js)");
console.log("  prototyp-fp.js        "+prototyp.length+" Zeichen");
console.log("  Gegenprobe: alle "+(PRUEFEN.length+2)+" Stücke zeichengenau wie in der App.");
