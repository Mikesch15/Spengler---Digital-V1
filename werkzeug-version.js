#!/usr/bin/env node
// Der Versionswechsel in EINEM Befehl.
//
// WARUM ES DAS GIBT (v3.259): Eine Version hat sechs Träger - index.html
// (Versionsnummer, zwei PDF-Verweise, Seitenzahl), sw.js (CACHE),
// js/41-hilfe.js (HILFE_PDF), anleitung/README.md (zweimal),
// anleitung/anleitung.html (dreimal), PROJECT_STATE.md. Sie von Hand
// nachzuziehen hiess bisher: jedes Mal rund 1400 Zeichen Code tippen, bei
// jeder Version neu. Das ist Verschwendung - und es ist fehleranfaellig:
// ein vergessener Träger faellt erst im Pruefstand auf, ein flaechiges
// Suchen-und-Ersetzen trifft die Changelog-Texte mit.
//
// Dieses Werkzeug ersetzt NUR die bekannten Stellen, jede genau einmal, und
// bricht ab, wenn eine davon nicht genau einmal vorkommt. Lieber gar nichts
// als die halbe Version.
//
// Was es NICHT tut: die Anleitung neu erzeugen (das dauert Minuten und
// gehoert in den eigenen Schritt) und den Was-ist-neu-Eintrag schreiben
// (der ist Text, kein Ritual).
//
// Aufruf:  node werkzeug-version.js 3.258 3.259 [Seitenzahl]
//          node werkzeug-version.js --pruefen        (nur zeigen, was stuende)
const fs=require("fs");

const args=process.argv.slice(2);
const nurZeigen=args.includes("--pruefen");
const [alt,neu,seiten]=args.filter(a=>!a.startsWith("--"));
if(!alt||!neu){
 console.error("Aufruf: node werkzeug-version.js <alt> <neu> [Seitenzahl]");
 console.error("Beispiel: node werkzeug-version.js 3.258 3.259 121");
 process.exit(2);
}
const P=v=>`anleitung/Spengler-DIGITAL-Anleitung-v${v}.pdf`;

// Jede Zeile: Datei, gesuchter Text, Ersatz. Der gesuchte Text muss genau
// EINMAL vorkommen - das ist die ganze Sicherung.
const stellen=[
 ["index.html", `<div id="appVersion">Version ${alt}</div>`,
                `<div id="appVersion">Version ${neu}</div>`],
 ["index.html", `href="${P(alt)}" target="_blank" rel="noopener">📖 Anleitung öffnen (PDF,`,
                `href="${P(neu)}" target="_blank" rel="noopener">📖 Anleitung öffnen (PDF,`],
 ["index.html", `href="${P(alt)}" target="_blank" rel="noopener">📖 Ganze Anleitung (PDF)</a>`,
                `href="${P(neu)}" target="_blank" rel="noopener">📖 Ganze Anleitung (PDF)</a>`],
 ["sw.js",      `const CACHE = "spengler-digital-${alt}";`,
                `const CACHE = "spengler-digital-${neu}";`],
 ["js/41-hilfe.js", `const HILFE_PDF="${P(alt)}";`, `const HILFE_PDF="${P(neu)}";`],
 ["anleitung/README.md", `\`Spengler-DIGITAL-Anleitung-v${alt}.pdf\``,
                         `\`Spengler-DIGITAL-Anleitung-v${neu}.pdf\``],
 ["anleitung/README.md", `PDF=${P(alt)} \\`, `PDF=${P(neu)} \\`],
 ["anleitung/anleitung.html", `content:"Spengler-DIGITAL · Anleitung · Version ${alt}"`,
                              `content:"Spengler-DIGITAL · Anleitung · Version ${neu}"`],
 ["anleitung/anleitung.html", `  Version ${alt}<br>`, `  Version ${neu}<br>`],
 ["anleitung/anleitung.html", `beschreibt <strong>Version ${alt}</strong>`,
                              `beschreibt <strong>Version ${neu}</strong>`],
 ["PROJECT_STATE.md", `- Aktueller Entwicklungsstand: \`v${alt}\``,
                      `- Aktueller Entwicklungsstand: \`v${neu}\``],
];

// Erst ALLES pruefen, dann schreiben. Eine halb umgestellte Version waere
// schlimmer als gar keine: der Service Worker liefert dann eine andere App
// aus, als die Seite behauptet zu sein.
const inhalt=new Map();
const fehler=[];
stellen.forEach(([f,such])=>{
 if(!inhalt.has(f)){
  try{ inhalt.set(f,fs.readFileSync(f,"utf8")) }
  catch(e){ fehler.push(`${f}: nicht lesbar`); return }
 }
 const n=inhalt.get(f).split(such).length-1;
 if(n!==1)fehler.push(`${f}: "${such.slice(0,58)}…" kommt ${n}× vor (erwartet: genau 1×)`);
});
if(fehler.length){
 console.error(`Abgebrochen - nichts geaendert. ${fehler.length} Stelle(n) stimmen nicht:`);
 fehler.forEach(z=>console.error("  "+z));
 process.exit(1);
}
if(nurZeigen){
 console.log(`${stellen.length} Stellen wuerden von ${alt} auf ${neu} gehen:`);
 [...new Set(stellen.map(x=>x[0]))].forEach(f=>
  console.log(`  ${f} (${stellen.filter(x=>x[0]===f).length}×)`));
 process.exit(0);
}
stellen.forEach(([f,such,ers])=>inhalt.set(f,inhalt.get(f).replace(such,ers)));

// Seitenzahl der Anleitung, falls angegeben - sie steht an zwei Stellen.
if(seiten){
 const i=inhalt.get("index.html").replace(/(📖 Anleitung öffnen \(PDF, )\d+( Seiten\))/,`$1${seiten}$2`);
 inhalt.set("index.html",i);
 const r=inhalt.get("anleitung/README.md").replace(/^\d+ Seiten,/m,`${seiten} Seiten,`);
 inhalt.set("anleitung/README.md",r);
}
inhalt.forEach((t,f)=>fs.writeFileSync(f,t));
console.log(`${alt} → ${neu} in ${inhalt.size} Dateien, ${stellen.length} Stellen.`);
if(seiten)console.log(`Seitenzahl auf ${seiten} gesetzt.`);
console.log("\nNoch zu tun (bewusst nicht hier):");
console.log("  1. js/67-was-ist-neu.js: Eintrag schreiben");
console.log("  2. PROJECT_STATE.md: Abschnitt schreiben, aelteste Version ins CHANGELOG");
console.log(`  3. Anleitung erzeugen:  SP=$SP HTML=$PWD/anleitung/anleitung.html \\`);
console.log(`       PDF=${P(neu)} node anleitung/pdf.js`);
console.log(`  4. Alte PDF entfernen:  git rm --cached ${P(alt)} && rm -f ${P(alt)}`);
