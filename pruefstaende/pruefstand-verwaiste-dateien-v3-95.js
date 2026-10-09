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
  // Angemeldet sein heisst: der Anmeldeschirm ist zu. Ohne diese Zeile
  // stuende er offen UND die System-Administration zugleich - ein Zustand,
  // den die App nie hat. Bis v3.155 fiel das nicht auf, weil beide
  // z-index 500 trugen; seit v3.156 liegt ein Bereich im Rahmen darunter,
  // und das ist richtig so: liegt der Anmeldeschirm oben, soll dahinter
  // nichts bedienbar sein.
  $("authScreen").hidden=true; $("appRoot").hidden=false;
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

 // ---- A2 · Ansehen (v3.274) ---------------------------------------------------
 // Ansage des Anwenders (9.10.2026): "Ich moechte die verwaisten Dateien
 // anschauen koennen". Die Liste zeigte nur Pfade. Jetzt hat jede Zeile einen
 // Knopf, der ueber die EIGENE, rein lesende Edge Function
 // system-admin-storage-ansehen einen kurzlebigen Link holt - die Storage-Policy
 // laesst den Client verwaiste Dateien nicht selbst lesen. Geprueft wird die
 // Oberflaeche; die Edge Function selbst ist von hier aus nicht erreichbar.
 console.log("\nA2 · Ansehen");
 await page.evaluate(()=>{
  window.__invoke.length=0;
  window.__invokeAntwort={data:{ok:true,url:"https://x.test/storage/v1/object/sign/measurements/a.jpg?token=t",gueltigSekunden:300},error:null};
 });
 const knoepfe=await page.evaluate(()=>document.querySelectorAll("#sysStorageListe [data-sys-ansehen]").length);
 p(knoepfe===2,"jede Zeile hat einen Knopf \"Ansehen\"",knoepfe);
 await page.click('[data-sys-ansehen="0"]');
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>{
  const box=document.querySelector("#sysStorageVorschau0");
  return {aufgerufen:window.__invoke.map(x=>[x.name,JSON.stringify(x.body)]),
   hidden:box.hidden,bild:!!box.querySelector("img"),src:(box.querySelector("img")||{}).src||"",
   knopf:document.querySelector('[data-sys-ansehen="0"]').textContent.trim(),
   zweiteVorschauZu:document.querySelector("#sysStorageVorschau1").hidden,
   loeschenNichtAufgerufen:!window.__invoke.some(x=>x.name==="system-admin-storage-aufraeumen")};
 });
 p(z.aufgerufen.length===1&&z.aufgerufen[0][0]==="system-admin-storage-ansehen"
   &&JSON.parse(z.aufgerufen[0][1]).pfad===VERWAIST[0].pfad,
   "der Klick ruft die LESENDE Funktion mit genau diesem Pfad auf",z.aufgerufen);
 p(!z.hidden&&z.bild&&/token=t/.test(z.src),"ein Bild erscheint direkt unter der Zeile",z);
 p(z.knopf==="Schliessen"&&z.zweiteVorschauZu,"der Knopf wird zu \"Schliessen\", die andere Zeile bleibt zu",z);
 p(z.loeschenNichtAufgerufen,"Gegenprobe: Ansehen ruft nie die Loeschfunktion auf",z);
 await page.click('[data-sys-ansehen="0"]');
 z=await page.evaluate(()=>({hidden:document.querySelector("#sysStorageVorschau0").hidden,
   leer:document.querySelector("#sysStorageVorschau0").innerHTML===""}));
 p(z.hidden&&z.leer,"ein zweiter Klick klappt die Vorschau wieder zu",z);
 // Nicht-Bilder bekommen einen Link statt eines Bildes.
 await page.evaluate(()=>{
  window.__verwaist=[{pfad:"firma-a/p/plan.pdf",kategorie:"project-files",groesse_bytes:5000,erstellt:"2026-08-01T08:00:00Z"}];
 });
 await page.click("#sysStorageLaden"); await page.waitForTimeout(150);
 await page.click('[data-sys-ansehen="0"]'); await page.waitForTimeout(150);
 z=await page.evaluate(()=>{const b=document.querySelector("#sysStorageVorschau0");
  return {bild:!!b.querySelector("img"),link:(b.querySelector("a")||{}).textContent||"",ziel:(b.querySelector("a")||{}).target||""}});
 p(!z.bild&&/PDF öffnen/.test(z.link)&&z.ziel==="_blank","ein PDF bekommt einen Link \"PDF oeffnen\" (neuer Tab), kein Bild",z);
 // Fehler werden gezeigt, nicht verschluckt. (Die PDF-Vorschau ist noch offen;
 // ein Klick schliesst sie, erst der naechste fragt die Funktion neu.)
 await page.click('[data-sys-ansehen="0"]'); await page.waitForTimeout(100);
 await page.evaluate(()=>{
  window.__invokeAntwort={data:{ok:false,error:"Diese Datei ist nicht (mehr) als verwaist bekannt."},error:null};
 });
 await page.click('[data-sys-ansehen="0"]'); await page.waitForTimeout(150);
 z=await page.evaluate(()=>({hinweis:document.querySelector("#sysStorageHinweis").textContent,
   zu:document.querySelector("#sysStorageVorschau0").hidden}));
 p(/nicht \(mehr\) als verwaist/.test(z.hinweis)&&z.zu,"ein Fehler der Funktion wird angezeigt, die Vorschau bleibt zu",z);
 await page.evaluate((v)=>{window.__verwaist=v;window.__invoke.length=0;
   window.__invokeAntwort={data:{ok:true,geloescht:2,pfade:[],uebergangen:[]},error:null}},VERWAIST);
 await page.click("#sysStorageLaden"); await page.waitForTimeout(150);

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
