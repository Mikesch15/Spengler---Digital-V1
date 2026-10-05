// Prueft, was der Anwender sieht, wenn die Texterkennung ueberlastet ist
// (v3.254).
//
// GEMELDET vom Anwender, mit Bildschirmfoto beim PDF-Import einer Offerte:
//   "Fehler bei der Erkennung: Server antwortete mit Status 502: Server
//    antwortete mit Status 503: {"error":{"code":503,"message":"This model
//    is currently experiencing high demand. Spikes in demand are usually
//    temporary. Please try again later.","status":"UNAVAILABLE"}}"
//
// Dreimal derselbe Satzbau ineinander geschachtelt, zuunterst rohes JSON in
// englischer Sprache. Daraus laesst sich nicht ablesen, was zu tun ist - und
// es sieht aus, als sei etwas am eigenen Dokument kaputt. Tatsaechlich war
// es ein voruebergehender Kapazitaetsengpass beim Anbieter.
//
// ZWEI Ursachen, beide behoben:
//   1. Die Edge Function reichte den Rohtext des Anbieters durch (502 mit
//      dem fremden JSON im Text). Sie sagt es jetzt in einem Satz und legt
//      den Rohtext nach "detail" - fuer die Diagnose, nicht fuer den Dialog.
//      Dieselbe Regel wie seit v3.137 beim rohen Postgres-Text.
//   2. recognizePhoto() (js/17-ausmass.js) stellte VOR jede Servermeldung
//      noch den eigenen Vorsatz "Server antwortete mit Status N:". Genau
//      daher kam die zweite Schachtel. Jetzt wird ein lesbarer Satz des
//      Servers unveraendert weitergereicht.
//
// Geprueft wird OHNE echten Aufruf beim Anbieter: aus dieser Umgebung sind
// Verbindungen dorthin ohnehin nicht moeglich (CLAUDE.md). Gemessen wird
// deshalb genau das, was zwischen Server und Anwender passiert - die
// Antwort der Edge Function wird abgefangen und durch die echten Faelle
// ersetzt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-erkennung-ueberlastet-v3-254.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const ATTRAPPE="window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),"
 +"onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);"
 +"q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};";

// Der Rohtext, wie ihn der Anbieter wirklich geschickt hat.
const ROH='{"error":{"code":503,"message":"This model is currently experiencing high demand. '
 +'Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}';

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 // Die Antwort der Edge Function wird hier gesetzt - je Fall neu.
 let antwort={status:503,body:{ok:false,
   error:"Die Texterkennung ist gerade überlastet. Das ist ein vorübergehender "
     +"Engpass beim Anbieter und kein Fehler an deinem Dokument - die App hat es 4-mal "
     +"über rund 17 Sekunden versucht. Bitte in ein paar Minuten nochmals auf "
     +"„Erkennen“ tippen. Das PDF bleibt so lange hochgeladen, es muss nicht neu "
     +"gewählt werden.",
   detail:"Status 503: "+ROH, versuche:4}};
 await page.route(/\/functions\/v1\/extract-offer-positions/,r=>r.fulfill({
   status:antwort.status,contentType:"application/json",body:JSON.stringify(antwort.body)}));

 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin"}; meineRechte={admin:true};
  $("authScreen").hidden=true; $("appRoot").hidden=false;
 });
 p(jsFehler.length===0,"die App laedt ohne JavaScript-Fehler",jsFehler.slice(0,3));
 if(jsFehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // Was recognizePhoto() dem Aufrufer wirklich hinwirft. Alle vier Stellen
 // (zwei in js/17, zwei in js/63) zeigen genau das im Dialog.
 const melden=()=>page.evaluate(async()=>{
  try{ await recognizePhoto("data:application/pdf;base64,AAA"); return {geworfen:false,text:""} }
  catch(e){ return {geworfen:true,text:String(e.message||e)} }
 });

 console.log("\nA · Der gemeldete Fall: der Anbieter ist ueberlastet");
 const a=await melden();
 p(a.geworfen,"die Erkennung schlaegt fehl - daran aendert sich nichts",a);
 p(/überlastet/.test(a.text),"A1 es steht da, dass die Erkennung ueberlastet ist",a.text);
 p(/kein Fehler an deinem Dokument/.test(a.text),
   "A2 und ausdruecklich, dass es NICHT am Dokument liegt - das war der falsche Verdacht",a.text);
 p(/nochmals auf/.test(a.text),"A3 und was zu tun ist",a.text);
 // DIE drei Gegenproben zum Bildschirmfoto.
 p(a.text.indexOf("Server antwortete mit Status")<0,
   "A4 GEGENPROBE: der technische Vorsatz steht NICHT mehr davor",a.text);
 // v3.255: Die Statusnummer selbst gehoert aber NICHT weg - v3.254 hatte sie
 // ganz gestrichen, sobald ein lesbarer Satz da war. Gefunden hat das die
 // volle Regression (pruefstand-angebote-v3-34 haelt seit v3.34 fest, dass
 // ein HTTP-Fehler seinen Status nennt). Sie steht jetzt hinten: der Satz
 // zuerst, die Zahl als Anhang fuer die Diagnose.
 p(/\(Status 503\)\s*$/.test(a.text),
   "A4b die Statusnummer steht am ENDE - lesbar zuerst, diagnostizierbar bleibt es trotzdem",a.text);
 p(a.text.indexOf("\u00fcberlastet")<a.text.indexOf("(Status"),
   "A4c GEGENPROBE: und wirklich dahinter, nicht davor",a.text.slice(0,60));
 p(a.text.indexOf("UNAVAILABLE")<0&&a.text.indexOf('"code"')<0,
   "A5 GEGENPROBE: und kein rohes JSON des Anbieters",a.text);
 p(a.text.indexOf("high demand")<0,
   "A6 GEGENPROBE: auch nichts auf Englisch - der Anwender liest Deutsch",a.text);

 console.log("\nB · Gegenprobe: ohne lesbaren Satz bleibt die Statusnummer");
 // Eine HTML-Fehlerseite des Gateways oder ein leerer Koerper - dann ist die
 // Statusnummer das Einzige, was man hat. Sie zu verschweigen waere
 // schlechter, als sie zu zeigen.
 antwort={status:502,body:null};
 await page.route(/\/functions\/v1\/extract-offer-positions/,r=>r.fulfill({
   status:502,contentType:"text/html",body:"<html>Bad Gateway</html>"}));
 const b2=await melden();
 p(b2.geworfen&&/Status 502/.test(b2.text),
   "B1 ohne lesbare Meldung nennt die App die Statusnummer",b2.text);

 console.log("\nC · Gegenprobe: ok:false mit Satz, aber HTTP 200");
 await page.route(/\/functions\/v1\/extract-offer-positions/,r=>r.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({ok:false,error:"Das Dokument enthält zu viele Positionen."})}));
 const c=await melden();
 p(c.geworfen&&c.text==="Das Dokument enthält zu viele Positionen.",
   "C1 auch hier steht genau der Satz des Servers da, ohne Vorsatz",c.text);

 console.log("\nD · Die Edge Function selbst (Quelltext)");
 // Der Server ist aus dieser Umgebung nicht aufrufbar; gemessen wird
 // deshalb, was im Quelltext steht - und der wird mitdeployt.
 const q=fs.readFileSync("supabase/functions/extract-offer-positions/index.ts","utf8");
 p(/const PAUSEN = \[2000, 5000, 10000\];/.test(q),
   "D1 vier Versuche mit 2s, 5s und 10s Pause - der gemeldete Engpass hat die 2 Sekunden aus v22 ueberdauert");
 p(/detail: `Status \$\{res!\.status\}/.test(q),
   "D2 der Rohtext des Anbieters geht nicht verloren, er steht in \"detail\"");
 p(/kein Fehler an deinem Dokument/.test(q),
   "D3 und der Satz fuer den Anwender steht im Server, an EINER Stelle");
 // Gegenprobe: ein echter, dauerhafter Fehler wird weiterhin sofort und
 // unveraendert gemeldet - ein erneuter Versuch wuerde daran nichts aendern.
 p(/if \(!ueberlastet \|\| versuch === maxVersuche\) break;/.test(q),
   "D4 GEGENPROBE: wiederholt wird NUR bei 503/429, nicht bei jedem Fehler");

 p(jsFehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",jsFehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
