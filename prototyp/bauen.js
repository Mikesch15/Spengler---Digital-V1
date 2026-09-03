"use strict";
// ===========================================================================
// Baut aus den Einzeldateien EINE eigenständige Testapp:
//     prototyp/rinne-halbrund-testapp.html
//
// Diese eine Datei lässt sich überall öffnen – auch auf einem Tablet, das
// nur die Datei bekommt und nicht den ganzen Ordner. Sie braucht keinen
// Server, kein Internet und keinen Login.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:  node prototyp/bauen.js
//
// WICHTIG: js/12-rinne-halbrund.js wird UNVERÄNDERT eingebettet. Das Skript
// prüft danach selbst nach, dass der eingebettete Text zeichengenau dem
// Original entspricht – sonst bricht es ab. Damit rechnet auch die
// eigenständige Testapp nachweislich mit der Fachlogik der laufenden App.
// ===========================================================================
const fs=require("fs"), path=require("path");
const wurzel=path.resolve(__dirname,"..");
const lies=p=>fs.readFileSync(path.join(wurzel,p),"utf8");

// In HTML eingebetteter Code darf die Zeichenfolge "</script" bzw. "</style"
// nicht enthalten – der Browser würde den Block dort beenden.
const sicherJs =t=>t.replace(/<\/script/gi,"<\\/script");
const sicherCss=t=>t.replace(/<\/style/gi,"<\\/style");

const basisCss   = lies("css/01-basis.css");
const protoCss   = lies("prototyp/prototyp.css");
const bruecke    = lies("prototyp/bruecke.js");
const fachlogik  = lies("js/12-rinne-halbrund.js");
const prototyp   = lies("prototyp/prototyp-rinne.js");
const seite      = lies("prototyp/rinne-halbrund.html");

// Aus der Mehrdatei-Seite nur den Rumpf übernehmen, damit beide Fassungen
// dieselbe Oberfläche zeigen und nicht auseinanderlaufen können.
const vonBody=seite.indexOf("<body>")+"<body>".length;
const bisBody=seite.indexOf('<script src="bruecke.js">');
if(vonBody<6||bisBody<0)throw new Error("rinne-halbrund.html: Rumpf nicht gefunden");
const rumpf=seite.slice(vonBody,bisBody).trim();

const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prototyp · Massaufnahme Rinne Halbrund</title>
<!-- ===================================================================
     EIGENSTÄNDIGE TESTAPP  ·  eine einzige Datei, überall zu öffnen
     Erzeugt von prototyp/bauen.js – nicht von Hand bearbeiten.
     Änderungen gehören in prototyp/prototyp-rinne.js bzw. prototyp.css,
     danach "node prototyp/bauen.js" laufen lassen.
     Gebaut am ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC
     =================================================================== -->
<style>
/* ---- css/01-basis.css (unverändert aus der laufenden App) ---- */
${sicherCss(basisCss)}
/* ---- prototyp/prototyp.css ---- */
${sicherCss(protoCss)}
</style>
</head>
<body>
${rumpf}
<script>
/* ---- prototyp/bruecke.js ---- */
${sicherJs(bruecke)}
</script>
<script>
/* ---- js/12-rinne-halbrund.js · UNVERÄNDERT aus der laufenden App ---- */
${sicherJs(fachlogik)}
</script>
<script>
/* ---- prototyp/prototyp-rinne.js ---- */
${sicherJs(prototyp)}
</script>
</body>
</html>
`;

// Gegenprobe: steckt die Fachlogik wirklich zeichengenau drin?
if(html.indexOf(sicherJs(fachlogik))<0)
 throw new Error("Die eingebettete Fachlogik weicht vom Original ab – Abbruch.");
if(fachlogik!==sicherJs(fachlogik))
 console.warn("Hinweis: js/12 enthielt '</script' und wurde beim Einbetten maskiert.");

const ziel=path.join(wurzel,"prototyp","rinne-halbrund-testapp.html");
fs.writeFileSync(ziel,html,"utf8");
console.log("geschrieben: prototyp/rinne-halbrund-testapp.html  ("
 +(Buffer.byteLength(html,"utf8")/1024).toFixed(0)+" KB)");
console.log("  css/01-basis.css        "+basisCss.length+" Zeichen");
console.log("  prototyp/prototyp.css   "+protoCss.length+" Zeichen");
console.log("  prototyp/bruecke.js     "+bruecke.length+" Zeichen");
console.log("  js/12-rinne-halbrund.js "+fachlogik.length+" Zeichen  (unverändert eingebettet)");
console.log("  prototyp/prototyp-rinne.js "+prototyp.length+" Zeichen");
