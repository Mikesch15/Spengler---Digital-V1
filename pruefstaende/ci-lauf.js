"use strict";
// Fuehrt alle Pruefstaende in diesem Ordner aus und meldet nur ECHTE, NEUE
// Regressionen als Fehler - nicht die in bekannte-fehlschlaege.txt gepflegten,
// seit laengerem bestehenden Luecken. So bleibt die CI aussagekraeftig statt
// wegen laengst bekannter, unabhaengiger Fehlschlaege dauerhaft rot zu sein
// (siehe Kopf von bekannte-fehlschlaege.txt fuer die Begruendung).
//
// Aufruf (lokal wie in der CI):  SP=<Ordner mit node_modules/playwright-core>
//   node pruefstaende/ci-lauf.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DIR = __dirname;
const REPO = path.join(DIR, "..");

const baselinePfad = path.join(DIR, "bekannte-fehlschlaege.txt");
const baseline = new Set(
 fs.readFileSync(baselinePfad, "utf8")
  .split("\n")
  .map(z => z.trim())
  .filter(z => z && !z.startsWith("#"))
);

const dateien = fs.readdirSync(DIR)
 .filter(f => f.startsWith("pruefstand-") && f.endsWith(".js"))
 .sort();

if (!dateien.length) {
 console.error("Keine pruefstand-*.js Dateien gefunden - Abbruch.");
 process.exit(1);
}

const neueFehlschlaege = [];
const behobene = [];
let ok = 0, fail = 0;

for (const datei of dateien) {
 let exitCode = 0, output = "";
 try {
  output = execFileSync("node", [path.join(DIR, datei)], {
   encoding: "utf8", cwd: REPO, stdio: ["ignore", "pipe", "pipe"]
  });
 } catch (e) {
  exitCode = typeof e.status === "number" ? e.status : 1;
  output = (e.stdout || "") + (e.stderr || "");
 }
 const bekannt = baseline.has(datei);
 if (exitCode !== 0) {
  fail++;
  if (bekannt) {
   console.log(`bekannt  ${datei}`);
  } else {
   neueFehlschlaege.push(datei);
   console.log(`NEU      ${datei}`);
   console.log(output.trim().split("\n").slice(-15).map(z => "         " + z).join("\n"));
  }
 } else {
  ok++;
  if (bekannt) {
   behobene.push(datei);
   console.log(`behoben  ${datei}  (lief bisher als bekannter Fehlschlag - bitte aus bekannte-fehlschlaege.txt entfernen)`);
  } else {
   console.log(`ok       ${datei}`);
  }
 }
}

console.log("\n" + "=".repeat(70));
console.log(`${ok}/${dateien.length} Pruefstaende laufen durch (${fail} Fehlschlaege, davon ${baseline.size} bereits vor dieser CI bekannt).`);

if (behobene.length) {
 console.log(`\n${behobene.length} vormals bekannte(r) Fehlschlag/Fehlschlaege laufen jetzt durch:`);
 behobene.forEach(d => console.log("  - " + d));
}

if (neueFehlschlaege.length) {
 console.log(`\n${neueFehlschlaege.length} NEUE Regression(en), nicht in bekannte-fehlschlaege.txt:`);
 neueFehlschlaege.forEach(d => console.log("  - " + d));
 process.exit(1);
}

process.exit(0);
