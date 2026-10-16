// Erzeugt supabase/functions/kalender-abo/ics.js aus js/91-ics-parser.js (EINE Quelle fuer Browser und Server, kein Doppelcode).
// Aufruf: node werkzeug-abo-ics.js          (schreibt)      node werkzeug-abo-ics.js --pruefen   (Exit 1, wenn veraltet)
const fs = require("fs");
const quelle = fs.readFileSync(__dirname + "/js/91-ics-parser.js", "utf8");
const kopf = "// GENERIERT aus js/91-ics-parser.js durch werkzeug-abo-ics.js - NICHT von Hand aendern (sonst weichen Browser und Server voneinander ab).\n";
const inhalt = kopf + quelle.replace(/^"use strict";\n/, "") + "\nexport { icsLesen };\n";
const ziel = __dirname + "/supabase/functions/kalender-abo/ics.js";
if (process.argv.includes("--pruefen")) {
  const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel, "utf8") : "";
  if (alt !== inhalt) { console.log("ics.js ist veraltet: node werkzeug-abo-ics.js"); process.exit(1); }
  console.log("ics.js aktuell"); process.exit(0);
}
fs.writeFileSync(ziel, inhalt); console.log("ics.js geschrieben (" + inhalt.length + " Zeichen)");
