// Prueft die Schnellpruefung (pruefstaende/schnellpruefung.js).
//
// WARUM ES SIE GIBT
// CLAUDE.md: veroeffentlicht wird nach einer Schnellpruefung, die volle
// Regression laeuft hinterher. Ausgewaehlt wurde bis v3.216 von Hand - und
// genau daran ist es am 28.09.2026 zweimal gescheitert: einmal blieb
// pruefstand-versionen-v3-09 rot, einmal drei Werkstatt-Pruefstaende
// (sammelaktion-v3-13, werkstatt-v3-09, winkel-werkstatt-v3-12). Beide Male
// stand `main` kurz rot, und beide Male hat es die volle Regression gefunden,
// nicht die Schnellpruefung.
//
// WAS HIER GEPRUEFT WIRD
//   A  Die Auswahl findet GENAU DIE Pruefstaende, die an dem Tag gefehlt
//      haben - das ist der Fall, an dem sich das Werkzeug beweist.
//   B  GEGENPROBE: sie waehlt nicht einfach alles aus. Eine Auswahl, die
//      immer die ganze Regression faehrt, ist keine Schnellpruefung.
//   C  GEGENPROBE: eine Datei, die kein Pruefstand nennt, zieht nur die
//      Pflichtpruefstaende nach sich - nichts wird erfunden.
//   D  Die Pflichtpruefstaende aus CLAUDE.md (hilfe, versionen) sind IMMER
//      dabei, auch wenn die geaenderte Datei nichts damit zu tun hat.
//   E  Rot heisst rot: faellt ein ausgewaehlter Pruefstand durch, endet die
//      Schnellpruefung mit Exit-Code 1 und sagt es.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-schnellpruefung-v3-217.js
const path=require("path"),fs=require("fs");
const {execFileSync}=require("child_process");
const SKRIPT=path.join(__dirname,"schnellpruefung.js");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

function liste(...dateien){
 const out=execFileSync(process.execPath,[SKRIPT,...dateien,"--nur-liste"],
   {cwd:path.join(__dirname,".."),encoding:"utf8",
    env:Object.assign({},process.env,{SCHNELLPRUEFUNG_LAEUFT:""})});
 return out.split("\n").map(z=>z.trim())
   .filter(z=>z.startsWith("pruefstand-")).map(z=>z.split(/\s+/)[0]);
}

console.log("\nA · Der Fall vom 28.09.2026");
const werk=liste("js/51-werkstatt.js");
// Diese drei hat die Schnellpruefung von Hand nicht erwischt.
["pruefstand-sammelaktion-v3-13.js","pruefstand-werkstatt-v3-09.js",
 "pruefstand-winkel-werkstatt-v3-12.js"].forEach(f=>{
  p(werk.indexOf(f)>=0,"eine Aenderung an js/51 zieht "+f+" nach sich",werk.length);
 });
// Und die, an die man ohnehin denkt.
["pruefstand-werkstatt-liste-v3-30.js","pruefstand-werkstatt-projekt-zu-v3-213.js",
 "pruefstand-ruestblatt-v3-211.js","pruefstand-ablauf-v3-25.js"].forEach(f=>{
  p(werk.indexOf(f)>=0,"und ebenso "+f);
 });
const aufg=liste("js/45-aufgaben.js");
p(aufg.indexOf("pruefstand-aufgaben-termin-v3-185.js")>=0,
  "eine Aenderung an js/45 zieht den Termin-Pruefstand nach sich",aufg);

console.log("\nB · GEGENPROBE: nicht einfach alles");
const alle=fs.readdirSync(__dirname)
  .filter(f=>f.startsWith("pruefstand-")&&f.endsWith(".js"));
p(werk.length<alle.length*0.6,
  "js/51 waehlt deutlich weniger als die ganze Regression",{gewaehlt:werk.length,alle:alle.length});
p(aufg.length<alle.length*0.35,
  "js/45 waehlt noch einmal deutlich weniger",{gewaehlt:aufg.length,alle:alle.length});
p(werk.length>aufg.length,
  "die breitere Aenderung zieht mehr nach sich als die schmalere",{werk:werk.length,aufg:aufg.length});

console.log("\nC · GEGENPROBE: eine Datei, die niemand nennt");
// Zusammengesetzt, nicht als Literal: sonst nennt DIESER Pruefstand die
// Datei, die Auswahl findet ihn deshalb selbst, und er ruft sich selbst auf.
const FREMD="anleitung/"+"README"+".md";
const fremd=liste(FREMD);
p(fremd.length===2,"nur die beiden Pflichtpruefstaende",fremd);

console.log("\nD · Die Pflicht aus CLAUDE.md");
[["hilfe","pruefstand-hilfe-v3-03.js"],["versionen","pruefstand-versionen-v3-09.js"]]
 .forEach(([name,datei])=>{
  p(werk.indexOf(datei)>=0&&aufg.indexOf(datei)>=0&&fremd.indexOf(datei)>=0,
    name+" ist immer dabei",datei);
 });

console.log("\nE · Rot heisst rot");
// Ohne SP findet kein Pruefstand playwright-core und faellt sofort durch.
// Genau daran muss sich zeigen, dass die Schnellpruefung einen Fehlschlag
// NICHT verschluckt - sonst waere sie schlimmer als keine.
let code=0,out="";
try{
 out=execFileSync(process.execPath,[SKRIPT,FREMD],
   {cwd:path.join(__dirname,".."),encoding:"utf8",
    env:Object.assign({},process.env,{SP:"/gibt-es-nicht",SCHNELLPRUEFUNG_LAEUFT:""})});
}catch(e){code=e.status===undefined?1:e.status;out=(e.stdout||"")+(e.stderr||"")}
p(code===1,"ein Fehlschlag endet mit Exit-Code 1",{code});
p(/ROT/.test(out),"und wird als ROT ausgewiesen",out.split("\n").filter(z=>/ROT/.test(z)).slice(0,2));
p(/NICHT veroeffentlichen/.test(out),"mit dem Hinweis, nicht zu veroeffentlichen");

console.log("\nF · Die Rekursionssperre");
// Dieser Pruefstand nennt Dateinamen und wird von der Auswahl deshalb selbst
// gefunden. Ohne Sperre startet er sich endlos neu - beim Schreiben liefen
// vier Kopien gleichzeitig, bis sie von Hand gestoppt wurden.
let innen="";
try{
 innen=execFileSync(process.execPath,[SKRIPT,FREMD],
   {cwd:path.join(__dirname,".."),encoding:"utf8",
    env:Object.assign({},process.env,{SCHNELLPRUEFUNG_LAEUFT:"1"})});
}catch(e){innen=(e.stdout||"")+(e.stderr||"")}
p(/laeuft bereits/.test(innen),"ein Aufruf IN einer laufenden Schnellpruefung tut nichts",innen.slice(0,120));
p(!/^ok |^ROT /m.test(innen),"und faehrt keinen einzigen Pruefstand",innen.slice(0,120));

console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
