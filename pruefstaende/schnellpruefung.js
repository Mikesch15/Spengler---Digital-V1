"use strict";
// SCHNELLPRUEFUNG: waehlt die Pruefstaende aus, die zu den geaenderten
// Dateien gehoeren - und faehrt sie.
//
// WARUM ES DAS GIBT
// CLAUDE.md sagt: veroeffentlicht wird nach einer Schnellpruefung, die volle
// Regression laeuft hinterher. Ausgewaehlt wurde diese Schnellpruefung bisher
// von Hand - und genau daran ist sie am 28.09.2026 zweimal gescheitert:
// einmal blieb pruefstand-versionen-v3-09 rot, einmal drei Werkstatt-
// Pruefstaende, die niemand auf dem Schirm hatte. Beide Male stand `main`
// kurz rot. Wer die Auswahl von Hand trifft, vergisst die Stelle, an die er
// gerade nicht denkt.
//
// WIE AUSGEWAEHLT WIRD
// Ein Pruefstand gehoert zu einer geaenderten Datei, wenn er
//   1. ihren Pfad nennt   ("js/51-werkstatt.js"),
//   2. ihren Namensteil nennt ("werkstatt", "aufgaben", "ruestblatt"), oder
//   3. den Namensteil im eigenen Dateinamen traegt
//      (pruefstand-werkstatt-*.js gehoert zu js/51-werkstatt.js).
// Dazu kommen immer die Pruefstaende, die CLAUDE.md fuer jede
// Veroeffentlichung verlangt: hilfe und versionen.
// Der Namensteil ist das, was nach der Nummer steht: aus
// "js/51-werkstatt.js" wird "werkstatt", aus "js/45-aufgaben.js" wird
// "aufgaben". Bei css/ und index.html/sw.js greift Regel 1 bzw. die
// Pflichtliste - sie werden von fast allem angefasst, deshalb loest eine
// Aenderung dort NICHT die halbe Regression aus, sondern nur die
// Pflichtpruefstaende plus die, die die Datei ausdruecklich nennen.
//
// WAS ES NICHT IST
// Kein Ersatz fuer die volle Regression. Die laeuft weiterhin hinterher -
// dieses Skript soll nur verhindern, dass sie Dinge findet, die eine
// Minute Schnellpruefung schon gewusst haette.
//
// Aufruf:
//   SP=<Ordner mit node_modules> node pruefstaende/schnellpruefung.js
//        -> geaenderte Dateien aus git (Arbeitsbaum + letzter Commit)
//   SP=... node pruefstaende/schnellpruefung.js js/51-werkstatt.js ...
//        -> ausdruecklich genannte Dateien
//   ... --nur-liste   -> nur zeigen, was liefe (fuer den Pruefstand)
const fs=require("fs");
const path=require("path");
const {spawn,execSync}=require("child_process");

const DIR=__dirname, REPO=path.join(DIR,"..");
const PFLICHT=["pruefstand-hilfe-v3-03.js","pruefstand-versionen-v3-09.js"];

function geaenderteDateien(){
 const raus=new Set();
 const lies=befehl=>{
  try{
   execSync(befehl,{cwd:REPO,encoding:"utf8"}).split("\n")
    .map(z=>z.trim()).filter(Boolean).forEach(z=>raus.add(z));
  }catch(e){/* kein git, kein Commit - dann eben nichts */}
 };
 lies("git diff --name-only HEAD");
 lies("git diff --name-only --cached");
 lies("git ls-files --others --exclude-standard");
 // Ist der Baum sauber, gilt der letzte Commit: so laesst sich auch nach dem
 // Committen noch pruefen, was man gerade veroeffentlicht.
 if(!raus.size)lies("git diff --name-only HEAD~1 HEAD");
 return [...raus];
}

// "js/51-werkstatt.js" -> "werkstatt"; "js/05a-rechte.js" -> "rechte"
function namensteil(datei){
 const b=path.basename(datei).replace(/\.[a-z]+$/,"");
 const m=b.match(/^\d+[a-z]?-(.+)$/);
 return m?m[1]:"";
}

function auswahl(dateien){
 // Der Pruefstand, der DIESES Skript prueft, wird hier nie gefahren: er ruft
 // das Skript selbst auf, und das Skript wuerde ihn wieder aufrufen. Beim
 // Bauen ist genau das passiert - in zwei Minuten liefen 425 Kopien. Er
 // gehoert in die volle Regression, nicht in die Schnellpruefung.
 const alle=fs.readdirSync(DIR)
  .filter(f=>f.startsWith("pruefstand-")&&f.endsWith(".js"))
  .filter(f=>f.indexOf("pruefstand-schnellpruefung")!==0).sort();
 const gewaehlt=new Set(PFLICHT.filter(f=>alle.indexOf(f)>=0));
 const gruende=Object.create(null);
 const merke=(f,grund)=>{gewaehlt.add(f);(gruende[f]=gruende[f]||[]).push(grund)};
 PFLICHT.forEach(f=>{if(alle.indexOf(f)>=0)merke(f,"Pflicht (CLAUDE.md)")});
 const texte=Object.create(null);
 alle.forEach(f=>{texte[f]=fs.readFileSync(path.join(DIR,f),"utf8")});
 dateien.forEach(datei=>{
  if(datei.startsWith("pruefstaende/")){
   const nur=path.basename(datei);
   if(alle.indexOf(nur)>=0)merke(nur,"selbst geaendert");
   return;
  }
  const teil=namensteil(datei);
  alle.forEach(f=>{
   if(texte[f].indexOf(datei)>=0){merke(f,"nennt "+datei);return}
   if(teil&&teil.length>=4){
    if(f.indexOf("pruefstand-"+teil)===0){merke(f,"heisst nach "+teil);return}
    if(new RegExp("\\b"+teil.replace(/[-]/g," ?")+"\\b","i").test(texte[f]))
     merke(f,"nennt "+teil);
   }
  });
 });
 return {liste:[...gewaehlt].sort(),gruende};
}

async function main(){
 // Rekursionssperre. Ein Pruefstand, der dieses Skript selbst prueft, wird
 // von der Auswahl gefunden (er nennt ja Dateinamen) - ohne diese Sperre
 // startet er sich endlos neu. Beim Schreiben des Pruefstands ist genau das
 // passiert: vier Kopien liefen gleichzeitig.
 if(process.env.SCHNELLPRUEFUNG_LAEUFT==="1"){
  console.log("Schnellpruefung laeuft bereits - der innere Aufruf tut nichts.");
  return 0;
 }
 process.env.SCHNELLPRUEFUNG_LAEUFT="1";
 const args=process.argv.slice(2);
 const nurListe=args.indexOf("--nur-liste")>=0;
 const genannt=args.filter(a=>a!=="--nur-liste");
 const dateien=genannt.length?genannt:geaenderteDateien();
 if(!dateien.length){
  console.log("Keine geaenderten Dateien gefunden - nichts zu pruefen.");
  return 0;
 }
 const {liste,gruende}=auswahl(dateien);
 console.log("Geaendert: "+dateien.join(", "));
 console.log("Schnellpruefung: "+liste.length+" Pruefstaende\n");
 liste.forEach(f=>console.log("  "+f+"   ("+[...new Set(gruende[f])].join(", ")+")"));
 if(nurListe)return Promise.resolve(0);
 console.log("");
 // Vier auf einmal. Die volle Regression laeuft bewusst der Reihe nach; hier
 // zaehlt die Minute, und vier Browser vertraegt jede Maschine, die auch die
 // Regression faehrt.
 return parallel(liste,4);
}
function einer(f){
 return new Promise(fertig=>{
  const p=spawn(process.execPath,[path.join(DIR,f)],
    {cwd:REPO,env:process.env,stdio:["ignore","pipe","pipe"]});
  let out="";
  p.stdout.on("data",d=>out+=d);
  p.stderr.on("data",d=>out+=d);
  p.on("close",code=>fertig({f,code,out}));
 });
}
async function parallel(liste,wieViele){
 let i=0,fail=0;
 const arbeiter=async()=>{
  while(i<liste.length){
   const {f,code,out}=await einer(liste[i++]);
   if(code===0)console.log("ok       "+f);
   else{
    fail++;
    console.log("ROT      "+f);
    out.split("\n").filter(z=>/FEHLGESCHLAGEN/.test(z)).slice(0,5)
      .forEach(z=>console.log("         "+z.trim()));
   }
  }
 };
 await Promise.all(Array.from({length:Math.min(wieViele,liste.length)},arbeiter));
 console.log("\n"+(liste.length-fail)+"/"+liste.length+" Pruefstaende der Schnellpruefung grün.");
 if(fail)console.log("NICHT veroeffentlichen, bevor das behoben ist.");
 return fail?1:0;
}
main().then(c=>process.exit(c),e=>{console.error(e);process.exit(1)});
