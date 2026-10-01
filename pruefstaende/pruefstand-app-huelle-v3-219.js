// Prueft die App-Huelle (sw.js) - den Service Worker, der die Dateien der
// App offline verfuegbar haelt.
//
// WARUM ES DIESEN PRUEFSTAND GIBT (v3.219, echter Fehler)
// Nach der Veroeffentlichung von v3.218 meldete die App auf dem Handy des
// Anwenders beim Oeffnen:
//
//   Fehler (unerledigt): Cannot set properties of null (setting 'textContent')
//
// und liess niemanden mehr hinein. In v3.218 selbst war der Fehler NICHT -
// nachgestellt und belegt: das neue index.html zusammen mit dem ALTEN
// js/03-login.js ergibt genau diese Meldung (afterLogin setzte dort die
// Zeile "Angemeldet als ...", die es im neuen index.html nicht mehr gibt).
// Auf dem Geraet lag also eine GEMISCHTE Huelle: ein Teil neu, ein Teil alt.
//
// Moeglich war das, weil der Rueckfall im fetch-Handler
//   caches.match(req)
// OHNE Cache-Namen suchte - und das durchsucht ALLE Zwischenspeicher, auch
// den der Vorversion. Schlaegt beim Aktualisieren eine einzige Anfrage fehl
// (wackliges Netz), kommt genau diese eine Datei aus der alten Fassung.
//
// WAS HIER GEPRUEFT WIRD
// Der fetch-Handler aus sw.js wird WIRKLICH AUSGEFUEHRT - mit nachgebauten
// caches/fetch-Objekten. Geprueft wird sein Verhalten, nicht sein Wortlaut.
// Dazu eine Strukturprobe, dass der alte Rueckfall nicht zurueckkommt.
//
// Aufruf:  node pruefstaende/pruefstand-app-huelle-v3-219.js
const fs=require("fs"), path=require("path");
const WURZEL=process.cwd();
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const QUELLE=fs.readFileSync(path.join(WURZEL,"sw.js"),"utf8");

// ---- Eine kleine, ehrliche Nachbildung der Browser-Umgebung -------------
// Sie kann genau so viel, wie sw.js benutzt: caches.open/keys/delete,
// cache.match/put, fetch, Request, Response.
function umgebung({netz,speicher}){
 const lager=JSON.parse(JSON.stringify(speicher||{}));   // {cacheName:{url:inhalt}}
 // Wie im Browser: eine relative Adresse ("./index.html") wird am Ort des
 // Service Workers aufgeloest. Ohne das fiele die Probe D2 aus, obwohl der
 // Rueckfall richtig ist.
 const schluessel=r=>new URL(typeof r==="string"?r:r.url,"https://beispiel.test/").href;
 class FakeResponse{
  constructor(body,init){this.body=body;this.ok=!(init&&init.ok===false);this.__quelle=(init&&init.quelle)||"netz"}
  clone(){const r=new FakeResponse(this.body,{quelle:this.__quelle});r.ok=this.ok;return r}
 }
 FakeResponse.error=()=>{const r=new FakeResponse(null,{quelle:"fehler"});r.ok=false;r.__fehler=true;return r};
 class FakeRequest{
  constructor(input,init){
   this.url=typeof input==="string"?input:input.url;
   this.method=(typeof input==="object"&&input.method)||"GET";
   this.mode=(typeof input==="object"&&input.mode)||"no-cors";
   if(init&&init.cache)this.cache=init.cache;
  }
 }
 const cacheObjekt=name=>({
  match:async r=>{const inhalt=(lager[name]||{})[schluessel(r)];
    return inhalt===undefined?undefined:new FakeResponse(inhalt,{quelle:"cache:"+name})},
  put:async(r,res)=>{lager[name]=lager[name]||{};lager[name][schluessel(r)]=res.body},
 });
 const caches={
  open:async n=>cacheObjekt(n),
  keys:async()=>Object.keys(lager),
  delete:async n=>{delete lager[n];return true},
  // Absichtlich vorhanden: der alte Code benutzte genau das.
  match:async r=>{for(const n of Object.keys(lager)){
    const inhalt=lager[n][schluessel(r)];
    if(inhalt!==undefined)return new FakeResponse(inhalt,{quelle:"cache:"+n});}
   return undefined},
 };
 const horcher={};
 const self={
  addEventListener:(art,fn)=>{horcher[art]=fn},
  location:{origin:"https://beispiel.test"},
  skipWaiting:()=>{}, clients:{claim:async()=>{}},
 };
 const fetch=async req=>{
  const u=schluessel(req);
  if(!(u in netz)){const e=new Error("offline: "+u);throw e}
  return new FakeResponse(netz[u],{quelle:"netz"});
 };
 // sw.js ausfuehren
 new Function("self","caches","fetch","Request","Response","URL",QUELLE)
  (self,caches,fetch,FakeRequest,FakeResponse,URL);
 return {horcher,lager,FakeRequest,FakeResponse};
}

// Eine Anfrage durch den fetch-Handler schicken und die Antwort holen.
async function anfrage(u,url,opt){
 let antwort=null;
 const req=new u.FakeRequest(Object.assign({url,method:"GET",mode:"no-cors"},opt||{}));
 u.horcher.fetch({request:req,respondWith:x=>{antwort=x}});
 if(!antwort)return {keine:true};
 try{ const r=await antwort; return {quelle:r&&r.__quelle,inhalt:r&&r.body,fehler:!!(r&&r.__fehler)} }
 catch(e){ return {ausnahme:String(e.message||e)} }
}

const HTML="<html>neu</html>", JSNEU="// neu", JSALT="// alt";
const U=x=>"https://beispiel.test/"+x;

(async()=>{
 console.log("A · Mit Netz gilt das Netz");
 let u=umgebung({netz:{[U("js/03-login.js")]:JSNEU},speicher:{"spengler-digital-3.218":{[U("js/03-login.js")]:JSALT}}});
 let a=await anfrage(u,U("js/03-login.js"));
 p(a.quelle==="netz"&&a.inhalt===JSNEU,"A1 die Datei kommt aus dem Netz, nicht aus einem Zwischenspeicher",a);

 console.log("\nB · Ohne Netz gilt der Zwischenspeicher DIESER Fassung");
 const JETZT=(QUELLE.match(/const CACHE\s*=\s*"([^"]+)"/)||[])[1];
 p(!!JETZT,"B0 sw.js nennt einen Cache-Namen",JETZT);
 u=umgebung({netz:{},speicher:{[JETZT]:{[U("js/03-login.js")]:JSNEU}}});
 a=await anfrage(u,U("js/03-login.js"));
 p(a.inhalt===JSNEU,"B1 ohne Netz kommt sie aus dem Zwischenspeicher dieser Fassung",a);

 console.log("\nC · Der eigentliche Fehler: keine gemischte Huelle");
 // Genau die Lage vom Handy: die alte Fassung liegt noch da, die neue hat
 // diese eine Datei nicht, und das Netz ist gerade weg.
 u=umgebung({netz:{},speicher:{
   "spengler-digital-3.217":{[U("js/03-login.js")]:JSALT},
   [JETZT]:{[U("index.html")]:HTML}
 }});
 a=await anfrage(u,U("js/03-login.js"));
 p(a.inhalt!==JSALT,"C1 eine Datei aus einer ALTEN Fassung wird NICHT ausgeliefert",a);
 p(a.fehler===true||a.ausnahme,"C2 stattdessen gilt sie als nicht verfuegbar",a);
 // Gegenprobe: derselbe Aufbau, aber die Datei liegt in DIESER Fassung -
 // dann muss sie sehr wohl kommen. Sonst wuerde C1 auch gruen, wenn der
 // Rueckfall ueberhaupt nicht mehr funktioniert.
 u=umgebung({netz:{},speicher:{
   "spengler-digital-3.217":{[U("js/03-login.js")]:JSALT},
   [JETZT]:{[U("js/03-login.js")]:JSNEU}
 }});
 a=await anfrage(u,U("js/03-login.js"));
 p(a.inhalt===JSNEU,"C3 Gegenprobe: aus DIESER Fassung kommt sie sehr wohl",a);

 console.log("\nD · Kein HTML anstelle eines Programms");
 u=umgebung({netz:{},speicher:{[JETZT]:{[U("index.html")]:HTML}}});
 a=await anfrage(u,U("js/70-ansicht2.js"));
 p(a.inhalt!==HTML,"D1 eine fehlende .js-Datei bekommt NICHT das index.html geliefert",a);
 a=await anfrage(u,U("projekte"),{mode:"navigate"});
 p(a.inhalt===HTML,"D2 Gegenprobe: eine Seitennavigation weicht weiterhin auf index.html aus",a);

 console.log("\nE · Struktur");
 // Geprueft wird der CODE, nicht der Kommentar darueber - der beschreibt
 // den alten Rueckfall ja absichtlich, damit man weiss, warum er weg ist.
 const nurCode=QUELLE.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^[ \t]*\/\/.*$/gm,"");
 p(!/caches\.match\(/.test(nurCode),
   "E1 es wird nirgends mehr ueber ALLE Zwischenspeicher gesucht (caches.match ohne Namen)");
 p(/cache\.match\(req\)/.test(nurCode),
   "E2 gesucht wird im Zwischenspeicher dieser Fassung");
 p(/req\.mode\s*===\s*"navigate"/.test(nurCode),
   "E3 der Rueckfall auf index.html gilt nur fuer eine Seitennavigation");
 // Gegenprobe zu E1: der alte Rueckfall stand genau so da und muss weg sein.
 p(nurCode.indexOf("caches.match(req).then(treffer => treffer ||")<0,
   "E1b der alte Rueckfall (erst alle Caches, dann index.html) ist wirklich weg");
 // Die Fassung im Cache-Namen muss zur angezeigten Version passen - sonst
 // stimmt der Offline-Bestand nicht zur ausgelieferten App.
 const html=fs.readFileSync(path.join(WURZEL,"index.html"),"utf8");
 const gezeigt=(html.match(/id="appVersion"[^>]*>Version ([0-9.]+)</)||[])[1];
 p(!!gezeigt&&JETZT==="spengler-digital-"+gezeigt,
   "E4 der Cache-Name traegt die angezeigte Versionsnummer",{cache:JETZT,angezeigt:gezeigt});

 // ---- F  Jede Datei der Huelle ist ueberhaupt erst lesbarer Code --------
 //
 // WARUM ES DIESEN ABSCHNITT GIBT (v3.244, echter Fehler von mir selbst)
 // In js/67-was-ist-neu.js stand in einem deutschen Text ein GERADES
 // Anfuehrungszeichen: "...„Was fehlt" ist jetzt...". Das beendet den
 // JavaScript-String, und die ganze Datei war kaputt - damit jede Funktion
 // daraus. Gefunden hat es erst pruefstand-zuteilung als 130. Pruefstand,
 // ueber "F1 keine Javascript-Fehler", mit der Meldung "Unexpected
 // identifier 'ist'" - richtig, aber weit weg von der Ursache.
 //
 // Ohne Build-Schritt gibt es nichts, was so etwas vorher abfaengt
 // (CLAUDE.md 7). Diese Probe ist dieses Etwas: sie kostet eine Sekunde und
 // nennt Datei und Stelle. Geprueft wird die ganze Huelle, nicht nur die
 // Datei, an der gerade gearbeitet wurde.
 console.log("\nF · Jede Datei der Huelle ist lesbarer Code");
 const jsDateien=[...new Set((QUELLE.match(/["'`]\.\/(js\/[^"'`]+\.js)["'`]/g)||[])
   .map(t=>t.replace(/^["'`]\.\//,"").replace(/["'`]$/,"")))];
 p(jsDateien.length>50,"F1 die App-Shell-Liste nennt die JavaScript-Dateien",jsDateien.length);
 const kaputt=[];
 jsDateien.forEach(rel=>{
  const voll=path.join(WURZEL,rel);
  if(!fs.existsSync(voll)){ kaputt.push({datei:rel,fehler:"fehlt"}); return }
  try{ new Function(fs.readFileSync(voll,"utf8")) }
  catch(e){ kaputt.push({datei:rel,fehler:String(e.message).slice(0,120)}) }
 });
 p(kaputt.length===0,
   "F2 jede davon laesst sich fehlerfrei einlesen - ein gerades Anfuehrungszeichen in deutschem Text reicht, um eine ganze Datei zu zerstoeren",kaputt);
 // Dieselbe Probe fuer die Dateien, die NICHT in der Huelle stehen - sonst
 // prueft dieser Abschnitt genau die Datei nicht, die jemand neu angelegt
 // und in sw.js vergessen hat.
 const alleJs=fs.readdirSync(path.join(WURZEL,"js")).filter(f=>f.endsWith(".js"));
 const kaputt2=[];
 alleJs.forEach(f=>{
  try{ new Function(fs.readFileSync(path.join(WURZEL,"js",f),"utf8")) }
  catch(e){ kaputt2.push({datei:"js/"+f,fehler:String(e.message).slice(0,120)}) }
 });
 p(kaputt2.length===0,
   "F3 GEGENPROBE: auch jede Datei im Ordner js/ - auch eine, die in sw.js noch fehlt",kaputt2);

 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 process.exit(fail?1:0);
})();
