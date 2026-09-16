// Prueft die gemeinsame Chromium-Aufloesung (v3.136).
//
// Vorgeschichte: jeder Pruefstand hatte den Browser-Pfad fest verdrahtet, auf
// /opt/pw-browsers/chromium-1194/chrome-linux/chrome. Diesen Pfad gibt es nur
// in der Entwicklungsumgebung. Auf dem GitHub-Runner existiert er nicht - die
// CI war deshalb seit ihrer Einfuehrung (v3.128) rot, mit 76 von 77
// "Fehlschlaegen", die in Wahrheit gar nie gestartet sind:
//   browserType.launch: Failed to launch chromium because executable
//   doesn't exist at /opt/pw-browsers/chromium-1194/chrome-linux/chrome
//
// Dieser Pruefstand braucht selbst KEINEN Browser - er prueft die Aufloesung,
// nicht die App. Damit faellt er auch dort durch, wo alle anderen nur noch
// abbrechen wuerden, und sagt verstaendlich, was fehlt.
//
// Aufruf:  node pruefstaende/pruefstand-chrome-pfad-v3-136.js
const fs=require("fs"),path=require("path");
const {chromePfad,ENTWICKLUNG}=require(__dirname+"/chrome-pfad.js");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

const alteUmgebung=process.env.CHROME;
const echtesExistsSync=fs.existsSync;
function aufraeumen(){
 fs.existsSync=echtesExistsSync;
 if(alteUmgebung===undefined)delete process.env.CHROME; else process.env.CHROME=alteUmgebung;
}

console.log("A · Die drei Stufen der Aufloesung");
// Stufe 1: von Hand gesetzt schlaegt alles andere
process.env.CHROME="/irgendwo/mein-chrome";
p(chromePfad()==="/irgendwo/mein-chrome","CHROME=... hat Vorrang",chromePfad());
delete process.env.CHROME;

// Stufe 2: der Pfad der Entwicklungsumgebung, WENN es ihn gibt
fs.existsSync=x=>x===ENTWICKLUNG?true:echtesExistsSync(x);
p(chromePfad()===ENTWICKLUNG,"gibt es den Entwicklungs-Pfad, wird er genommen",chromePfad());

// Stufe 3: gibt es ihn nicht - der Fall auf dem GitHub-Runner -, sucht
// playwright-core selbst. Genau das war vorher unmoeglich.
fs.existsSync=x=>x===ENTWICKLUNG?false:echtesExistsSync(x);
p(chromePfad()===undefined,
  "gibt es ihn nicht, wird NICHTS vorgegeben - playwright sucht selbst",chromePfad());
// Gegenprobe: der alte Zustand war, dass in genau diesem Fall trotzdem der
// feste Pfad zurueckkam. Das ist der Fehler, der die CI rot hielt.
p(chromePfad()!==ENTWICKLUNG,
  "GEGENPROBE: es wird NICHT trotzdem der feste Pfad geliefert",chromePfad());
// Und CHROME schlaegt auch Stufe 3
process.env.CHROME="/noch/woanders";
p(chromePfad()==="/noch/woanders","CHROME wirkt auch dann",chromePfad());
aufraeumen();

console.log("\nB · Kein Pruefstand verdrahtet den Pfad mehr selbst");
// Diese Datei selbst ist ausgenommen: sie MUSS den alten Pfad nennen, um zu
// dokumentieren, was schiefging - sonst waere der Kommentar wertlos. Sie
// startet keinen Browser, also kann sich darin auch nichts verstecken.
const SELBST=path.basename(__filename);
const dateien=fs.readdirSync(__dirname)
 .filter(f=>f.startsWith("pruefstand-")&&f.endsWith(".js")&&f!==SELBST);
p(dateien.length>=70,"es werden alle Pruefstaende geprueft",dateien.length);
const mitFestemPfad=[],mitBrowser=[],ohneRequire=[];
dateien.forEach(f=>{
 const t=fs.readFileSync(path.join(__dirname,f),"utf8");
 if(/pw-browsers\/chromium-\d+/.test(t))mitFestemPfad.push(f);
 if(/chromium\.launch\(/.test(t)){
  mitBrowser.push(f);
  if(!/chrome-pfad\.js/.test(t)||!/executablePath:\s*chromePfad\(\)/.test(t))ohneRequire.push(f);
 }
});
// Das ist die eigentliche Zusicherung: sie faellt durch, sobald jemand wieder
// einen festen Pfad einbaut - auch in einem neuen Pruefstand.
p(mitFestemPfad.length===0,
  "kein Pruefstand enthaelt noch einen fest verdrahteten Browser-Pfad",mitFestemPfad);
p(mitBrowser.length>=70,"und es sind wirklich viele, die einen Browser starten",mitBrowser.length);
p(ohneRequire.length===0,
  "jeder davon holt den Pfad ueber chrome-pfad.js",ohneRequire);

console.log("\nC · Was dieser Pruefstand NICHT beweist");
// Ehrlich benannt statt stillschweigend uebergangen: ob playwright-core in
// Stufe 3 wirklich einen Browser findet, haengt davon ab, dass die CI vorher
// "npx playwright-core install chromium" ausgefuehrt hat. Das laesst sich in
// der Entwicklungsumgebung nicht nachstellen - der Sandkasten darf den
// Browser nicht herunterladen. Den Beweis fuehrt der CI-Lauf selbst.
const wf=path.join(__dirname,"..",".github","workflows","pruefstaende.yml");
const wfText=fs.existsSync(wf)?fs.readFileSync(wf,"utf8"):"";
p(/playwright-core install/.test(wfText),
  "der CI-Workflow installiert Chromium, worauf Stufe 3 baut",wfText.slice(0,80));
p(/xlsx/.test(wfText),"und SheetJS fuer die beiden Excel-Pruefstaende",wfText.slice(0,80));

console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
process.exit(fail?1:0);
