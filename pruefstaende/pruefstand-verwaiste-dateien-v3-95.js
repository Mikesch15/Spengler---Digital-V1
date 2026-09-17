// Prueft "die verwaisten Dateien lassen sich auch nicht loeschen" (v3.95).
//
// ROOT CAUSE (gefunden durch Lesen des echten Quellcodes von supabase/storage,
// src/http/routes/object/deleteObjects.ts): die Edge Function
// system-admin-storage-aufraeumen rief bisher
//   POST /storage/v1/object/remove/{bucket}
// auf. Diesen Pfad gibt es in der Storage-API GAR NICHT - der echte
// Bulk-Loeschweg ist
//   DELETE /storage/v1/object/{bucket}   Body: {"prefixes":[...]}
// (fastify.delete('/:bucketName', ...) in deleteObjects.ts). Der bisherige
// Aufruf lief also immer in einen 404 und lieferte deshalb IMMER "Die
// Dateien konnten nicht vollständig entfernt werden." - unabhaengig von
// Rechten oder der Liste selbst. Behoben in der Edge Function (index.ts:
// Methode POST -> DELETE, Pfad ".../object/remove/{bucket}" ->
// ".../object/{bucket}"), als Version 2 auf das echte Projekt deployt.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche in js/22-system-admin.js - dass
// sb.functions.invoke("system-admin-storage-aufraeumen") mit der richtigen
// Pfadliste aufgerufen wird, dass ein Erfolg die Liste leert und die Zahl
// meldet, und dass ein Fehler (egal von wo) angezeigt statt verschluckt
// wird. Ein direkter Test GEGEN die Edge Function bzw. die Storage-API
// selbst ist von hier aus nicht moeglich (Sandbox ohne Netzwerk zu
// Supabase, siehe CLAUDE.md) - die eigentliche Korrektur (der Endpunkt in
// index.ts) wurde stattdessen gegen den echten, oeffentlichen
// Storage-API-Quellcode verifiziert, nicht gegen einen Live-Aufruf.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-verwaiste-dateien-v3-95.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,340):""))}};

const STUB=`window.__invoke=[];window.__invokeAntwort={data:{ok:true,geloescht:2,pfade:[],uebergangen:[]},error:null};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name)=>{
   if(name==="system_admin_verwaiste_storage")return {data:window.__verwaist,error:null};
   return {data:null,error:null}},
 functions:{invoke:async(name,opt)=>{window.__invoke.push({name,body:opt&&opt.body});
   return window.__invokeAntwort}},
 from:(t)=>{
   const f={};
   ['select','order','limit','range','in','eq'].forEach(k=>f[k]=()=>f);
   f.maybeSingle=async()=>({data:null,error:null});
   f.then=(cb)=>Promise.resolve({data:[],error:null}).then(cb);
   return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'x'},error:null})})}
})};`;

const VERWAIST=[
 {pfad:"firma-a/alt/foto1.jpg",kategorie:"Foto",groesse_bytes:204800,erstellt:"2026-08-01T08:00:00Z"},
 {pfad:"firma-a/alt/foto2.jpg",kategorie:"Foto",groesse_bytes:102400,erstellt:"2026-08-02T08:00:00Z"}
];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzteMeldung=""; page.on("dialog",d=>{letzteMeldung=d.message();d.accept()});
 // Der Stub unten muss die EINZIGE Quelle bleiben. Ohne die Absicherung
 // ueberschreibt ihn das echte supabase-js aus index.html Zeile 14,
 // sobald die Maschine Internet hat - Begruendung in stub-schutz.js.
 const cdnWache=await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(cdnWache.abgefangen>=1,
   "das echte supabase-js wurde abgefangen - der Stub ist die einzige Quelle",
   cdnWache.abgefangen);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 await page.evaluate((verwaist)=>{
  window.__verwaist=verwaist;
  $("systemAdminModal").hidden=false;
  document.querySelector('[data-section="sysadmin-storage"]').classList.add("open");
 },VERWAIST);

 console.log("\nA · Liste laden");
 await page.click("#sysStorageLaden");
 await page.waitForTimeout(150);
 let z=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#sysStorageListe .report-row").length,
  loeschKnopf:!!document.querySelector("#sysStorageLoeschen"),
  anzahlImText:document.querySelector("#sysStorageListe").textContent
 }));
 p(z.zeilen===2,"beide verwaisten Dateien stehen in der Liste",z);
 p(z.loeschKnopf,"der Loeschknopf erscheint mit der Liste",z);
 p(/2/.test(z.anzahlImText),"die Anzahl steht im Text",z);

 console.log("\nB · Loeschen ruft die Edge Function mit genau diesen Pfaden auf");
 await page.evaluate(()=>{window.__invoke.length=0});
 await page.click("#sysStorageLoeschen");
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>({
  invoke:window.__invoke,
  hinweis:document.querySelector("#sysStorageHinweis").textContent,
  zeilenDanach:document.querySelectorAll("#sysStorageListe .report-row").length
 }));
 p(/endgültig löschen/i.test(letzteMeldung),"vorher wird nachgefragt",letzteMeldung);
 p(z.invoke.length===1&&z.invoke[0].name==="system-admin-storage-aufraeumen",
   "die Edge Function system-admin-storage-aufraeumen wird gerufen",z.invoke);
 p(JSON.stringify((z.invoke[0]||{}).body&&z.invoke[0].body.pfade)===JSON.stringify(VERWAIST.map(v=>v.pfad)),
   "mit genau den Pfaden aus der geladenen Liste (nicht mehr, nicht weniger)",z.invoke);
 p(/2 Dateien entfernt/.test(z.hinweis),"Erfolg wird mit der Anzahl gemeldet",z.hinweis);
 p(z.zeilenDanach===0,"die Liste ist danach leer",z);

 console.log("\nC · Ein Fehler (egal ob Netzwerk, Rechte oder ein 404 wie der behobene Bug) wird angezeigt");
 await page.evaluate((verwaist)=>{
  window.__verwaist=verwaist;
 },VERWAIST);
 await page.click("#sysStorageLaden");
 await page.waitForTimeout(150);
 await page.evaluate(()=>{
  window.__invokeAntwort={data:null,error:{message:"Edge Function returned a non-2xx status code",
    context:{json:async()=>({error:"Die Dateien konnten nicht vollständig entfernt werden."})}}};
 });
 await page.click("#sysStorageLoeschen");
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>({
  hinweis:document.querySelector("#sysStorageHinweis").textContent,
  zeilenDanach:document.querySelectorAll("#sysStorageListe .report-row").length
 }));
 p(/nicht vollständig entfernt/.test(z.hinweis),"der Fehler wird angezeigt, nicht verschluckt",z);
 p(z.zeilenDanach===2,"ohne Erfolg bleibt die Liste stehen - nichts wird stillschweigend geleert",z);

 p(fehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",fehler.slice(0,3));

 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close();
 process.exit(fail?1:0);
})();
