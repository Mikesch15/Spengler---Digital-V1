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
const os = require("os");
const { execFile } = require("child_process");

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

// Parallel: die Pruefstaende sind voneinander unabhaengig (je eigener Browser, file://, keine Ports).
// Vorgabe 3 gleichzeitig (CI_PARALLEL=1 gibt den alten, strikt seriellen Ablauf). Die Ausgabe erscheint
// in der Reihenfolge der Dateien - nicht der Fertigstellung -, damit Laeufe vergleichbar bleiben.
const PARALLEL = Math.max(1, Number(process.env.CI_PARALLEL) || Math.min(3, os.cpus().length));

function laufen(datei) {
 return new Promise(res => {
  execFile("node", [path.join(DIR, datei)], {
   encoding: "utf8", cwd: REPO, maxBuffer: 64 * 1024 * 1024
  }, (e, stdout, stderr) => {
   res({
    datei,
    exitCode: e ? (typeof e.code === "number" ? e.code : 1) : 0,
    output: (stdout || "") + (stderr || "")
   });
  });
 });
}

function melden({ datei, exitCode, output }) {
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

async function alleLaufen() {
 const ergebnisse = new Array(dateien.length);
 let naechster = 0, ausgegeben = 0;
 const worker = async () => {
  while (naechster < dateien.length) {
   const i = naechster++;
   ergebnisse[i] = await laufen(dateien[i]);
   while (ausgegeben < dateien.length && ergebnisse[ausgegeben]) melden(ergebnisse[ausgegeben++]);
  }
 };
 await Promise.all(Array.from({ length: Math.min(PARALLEL, dateien.length) }, worker));
}

(async () => {
await alleLaufen();

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
})();
