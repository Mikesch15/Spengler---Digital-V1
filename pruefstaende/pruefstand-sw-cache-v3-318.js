// Prueft v3.318 (Nachtauftrag Paket F): der Service Worker hebt nur ERFOLGREICHE Antworten auf (ein 404/500 darf die gute
// Kopie im Zwischenspeicher nicht ueberschreiben), liefert ohne Netz die Kopie, weicht nur bei echter Seitennavigation auf
// die Startseite aus, fasst fremde Adressen und Nicht-GET nicht an. Geprueft wird die ECHTE Datei sw.js mit Attrappen.
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
const quelle=fs.readFileSync(path.join(process.cwd(),"sw.js"),"utf8");
const INDEX=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
const ORIGIN="https://app.example";
async function aufbau(netz){
 const speicher=new Map(); const ereignisse={};
 const cache={put:async(r,res)=>{speicher.set(typeof r==="string"?r:r.url,res)},match:async r=>speicher.get(typeof r==="string"?new URL(r,ORIGIN).href:r.url)};
 const sb={
  self:{location:{origin:ORIGIN},addEventListener:(n,f)=>{ereignisse[n]=f},skipWaiting(){},clients:{claim(){}}},
  caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true,match:async()=>undefined},
  fetch:async(r)=>netz(r),
  Request:class{constructor(u,o){this.url=typeof u==="string"?new URL(u,ORIGIN).href:u.url;this.method=(u&&u.method)||"GET";this.mode=(u&&u.mode)||"cors";this.cache=o&&o.cache}},
  Response:class{constructor(b,o){this.status=(o&&o.status)||200;this.ok=this.status>=200&&this.status<300;this.body=b}clone(){return this} static error(){const r=new this(null,{status:0});r.fehler=true;return r}},
  URL,Promise,Map,console
 };
 vm.runInNewContext(quelle,sb);
 const antworten=[];
 const holen=async(url,extra)=>{
  const req={url,method:"GET",mode:"cors",...extra};
  let promise=null;
  ereignisse.fetch({request:req,respondWith:pr=>{promise=pr}});
  return promise===null?{unberuehrt:true}:await promise;
 };
 return {speicher,holen,ereignisse};
}
(async()=>{
 const gut=(txt)=>({ok:true,status:200,body:txt,clone(){return this}});
 const fehler=(st)=>({ok:false,status:st,body:"Fehlerseite",clone(){return this}});
 console.log("\nA · Nur Erfolgreiches wird aufgehoben");
 let netzZustand="gut"; const netz=async(r)=>{if(netzZustand==="aus")throw new Error("offline");return netzZustand==="gut"?gut("app v1"):fehler(netzZustand==="404"?404:500)};
 const w=await aufbau(netz);
 let r=await w.holen(ORIGIN+"/js/01-basis.js");
 await new Promise(x=>setTimeout(x,5));
 p(r.body==="app v1"&&w.speicher.get(ORIGIN+"/js/01-basis.js")&&w.speicher.get(ORIGIN+"/js/01-basis.js").body==="app v1","200: Antwort wird geliefert UND aufgehoben");
 netzZustand="500"; r=await w.holen(ORIGIN+"/js/01-basis.js"); await new Promise(x=>setTimeout(x,5));
 p(r.status===500&&w.speicher.get(ORIGIN+"/js/01-basis.js").body==="app v1","500 vom Server: die gute Kopie im Zwischenspeicher bleibt (wird NICHT ueberschrieben)",w.speicher.get(ORIGIN+"/js/01-basis.js"));
 netzZustand="404"; r=await w.holen(ORIGIN+"/js/01-basis.js"); await new Promise(x=>setTimeout(x,5));
 p(w.speicher.get(ORIGIN+"/js/01-basis.js").body==="app v1","404: dito");
 netzZustand="aus"; r=await w.holen(ORIGIN+"/js/01-basis.js");
 p(r.body==="app v1","ohne Verbindung: die gute Kopie kommt (nicht die Fehlerseite)",r);
 console.log("\nB · Randfaelle");
 r=await w.holen(ORIGIN+"/js/nicht-da.js"); p(r.fehler===true,"Datei weder im Netz noch im Vorrat: Fehler statt falscher Antwort");
 await w.speicher.set(ORIGIN+"/index.html",gut("startseite"));
 r=await w.holen(ORIGIN+"/projekt/123",{mode:"navigate"}); p(r.body==="startseite","echte Seitennavigation ohne Netz: Startseite",r);
 r=await w.holen(ORIGIN+"/js/x.js",{mode:"cors"}); p(r.fehler===true,"eine fehlende .js-Datei bekommt NICHT die Startseite (v3.219)");
 const w2=await aufbau(netz);
 r=await w2.holen("https://fremd.example/x.js"); p(r.unberuehrt===true,"fremde Adresse: der Service Worker greift nicht ein");
 r=await w2.holen(ORIGIN+"/api",{method:"POST"}); p(r.unberuehrt===true,"POST: nicht angefasst");
 console.log("\nC · Version");
 const cv=/const CACHE = "spengler-digital-([0-9.]+)"/.exec(quelle);
 const iv=/Version\s*([0-9]\.[0-9]+)|v([0-9]\.[0-9]+)/.exec(INDEX);
 p(!!cv,"CACHE-Name traegt eine Versionsnummer ("+(cv&&cv[1])+")");
 p(INDEX.indexOf(cv[1])>=0,"dieselbe Nummer steht sichtbar in index.html");
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
