// Die vier kleinen Bediensachen aus Punkt 3 der Ideenliste.
//
//  a) Eine Massaufnahme OHNE Projekt laesst sich nicht speichern - js/16
//     bricht dafuer schon vor allem anderen ab, und Fotos haetten ausserdem
//     keinen gueltigen Speicherpfad ("measurements/null/...", CLAUDE.md 56.7).
//     Beim Nachpruefen von Punkt 3a der Ideenliste zeigte sich: die Sperre
//     im Speicherweg gab es laengst. Gefehlt hat der HINWEIS - bis v3.03
//     erfuhr man es erst beim Druck auf Speichern, also nach dem Erfassen.
//  b) Die drei Projekt-Auswahlfelder zeigen die Adresse (seit v2.48).
//  c) Der Verlauf hatte einen festen Deckel von 50 ohne Nachladen.
//  d) "Zuletzt bearbeitet" nutzt das Aenderungsprotokoll als fuenfte Quelle -
//     nur so tauchen auch Loeschungen auf.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-bediensachen-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 const dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 // sb ist in js/01 als const deklariert - die Attrappe muss deshalb das sein,
 // was createClient() liefert. __antwort/__schreib werden erst spaeter
 // gesetzt und zur Aufrufzeit gelesen.
 const ATTRAPPE=`window.supabase={createClient:()=>{
  const tabelle=t=>({
   select:()=>tabelle(t), eq:()=>tabelle(t), order:()=>tabelle(t),
   range:(a,b)=>{(window.__abfragen=window.__abfragen||[]).push({t,a,b});
     return Promise.resolve({data:(window.__antwort&&window.__antwort(t,a))||[],error:null})},
   limit:()=>Promise.resolve({data:(window.__antwort&&window.__antwort(t,0))||[],error:null}),
   insert:d=>{(window.__schreib=window.__schreib||[]).push({t,d});
     return {select:()=>({maybeSingle:()=>Promise.resolve({data:{id:99},error:null})})}},
   update:d=>{(window.__schreib=window.__schreib||[]).push({t,d});return tabelle(t)},
   maybeSingle:()=>Promise.resolve({data:null,error:null})
  });
  return {
   auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{},signOut:async()=>({})},
   from:tabelle,
   storage:{from:()=>({
     upload:()=>{(window.__schreib=window.__schreib||[]).push({t:"STORAGE"});return Promise.resolve({error:null})},
     createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null}),
     remove:()=>Promise.resolve({error:null})})},
   rpc:()=>Promise.resolve({data:null,error:null}),
   functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
  };
 }};`;
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);

 // ------------------------------------------------ Grundzustand + Attrappe
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
    order_no:"2026-123",customer:"Muster AG",archived:false,status:"offen",
    updated_at:"2026-08-01T10:00:00Z",updated_by:"u1"},
   {id:8,name:"Zweitprojekt",object:"Seestrasse 4, 8001 Zürich",order_no:"",customer:"",
    archived:false,status:"offen",updated_at:"2026-08-02T10:00:00Z",updated_by:"u1"}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000,670];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  // Zaehlt jeden Schreibzugriff mit, damit sich pruefen laesst, dass beim
  // blockierten Speichern WIRKLICH nichts geschrieben wird.
  window.__schreib=[];
  window.__abfragen=[];
 });

 // --------------------------------------- a) Foto ohne Projekt wird abgefangen
 console.log("a · Ohne Projekt wird nichts gespeichert - und man sieht es vorher");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  showMeasTypeSection("skizze_foto");
  setMeasProjectField(null);
  measPhotos=["data:image/png;base64,iVBORw0KGgo="];
  measSketches=[];
  measMedienStatus();
  window.__schreib=[];
 });
 const hinweis=await page.evaluate(()=>($("fotoStatus")||{}).textContent||"");
 p(/kein Projekt gewählt/i.test(hinweis),"ohne Projekt steht der Hinweis schon bei der Statuszeile",hinweis);
 // Auch ganz ohne Bilder - der Satz gilt fuer die ganze Massaufnahme.
 const leerHin=await page.evaluate(()=>{const alt=measPhotos.slice();measPhotos=[];measMedienStatus();
   const t=($("fotoStatus")||{}).textContent||"";measPhotos=alt;measMedienStatus();return t});
 p(/kein Projekt gewählt/i.test(leerHin),"der Hinweis steht auch, bevor ein Bild erfasst ist",leerHin);

 dialoge.length=0;
 await page.evaluate(()=>{ $("measTitle").value="Testaufnahme"; $("saveMeasurement").click(); });
 await page.waitForTimeout(300);
 const schreib=await page.evaluate(()=>window.__schreib.slice());
 p(dialoge.some(m=>/zuerst ein Projekt/i.test(m)),"beim Speichern kommt eine verstaendliche Meldung",dialoge[0]);
 p(schreib.length===0,"es wird NICHTS geschrieben - keine Platzhalterzeile, kein Upload",schreib);
 const nochDa=await page.evaluate(()=>measPhotos.length);
 p(nochDa===1,"das Foto bleibt im Formular stehen",nochDa);

 // Mit Projekt verschwindet der Hinweis wieder.
 await page.evaluate(()=>setMeasProjectField(7));
 const hin2=await page.evaluate(()=>($("fotoStatus")||{}).textContent||"");
 p(!/kein Projekt gewählt/i.test(hin2),"mit Projekt ist der Hinweis weg",hin2);

 // --------------------------------------- b) Auswahlfelder zeigen die Adresse
 console.log("\nb · Die Projekt-Auswahlfelder zeigen die Adresse");
 const stellen=[["js/09-projekte.js","data-pick-project"],
   ["js/10-massaufnahme.js","data-pick-meas-project"],
   ["js/17-ausmass.js","data-pick-am-project"]];
 for(const [datei,attr] of stellen){
  const t=lies(datei);
  const nutzt=t.indexOf('projektVorschlagHtml(p,"'+attr+'")')>=0;
  p(nutzt,datei+" nutzt die gemeinsame Darstellung ("+attr+")");
 }
 const vorschlag=await page.evaluate(()=>projektVorschlagHtml(allProjects[0],"data-pick-meas-project"));
 p(vorschlag.indexOf("Bahnhofstrasse 12, 3011 Bern")<vorschlag.indexOf("Sanierung Dach"),
   "die Adresse steht vor dem Projektnamen");

 // ------------------------------------------------ c) Verlauf mit Nachladen
 console.log("\nc · Der Verlauf laedt weitere Eintraege nach");
 const bau=(ab,n)=>Array.from({length:n},(_,i)=>({id:ab+i+1,entity_type:"project",entity_id:7,
   project_id:7,action:"updated",description:"Eintrag "+(ab+i+1),user_id:"u1",
   created_at:new Date(Date.UTC(2026,0,1,0,0,ab+i)).toISOString(),changes:null}));
 await page.evaluate(b0=>{ window.__seiten=b0; window.__antwort=(t,ab)=>t==="audit_log"?(window.__seiten[ab]||[]):[] },
   {0:bau(0,50),50:bau(50,50),100:bau(100,7)});
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=true;   // liegt sonst darueber
  const d=document.createElement("div"); d.id="verlaufTest"; document.body.appendChild(d);
  return loadProjectVerlauf($("verlaufTest"),7);
 });
 await page.waitForTimeout(200);
 let st=await page.evaluate(()=>({zeilen:document.querySelectorAll("#verlaufTest .verlauf-entry").length,
   knopf:!!document.querySelector("#verlaufTest .verlauf-mehr-knopf")}));
 p(st.zeilen===50,"erste Seite: 50 Eintraege",st);
 p(st.knopf,"der Knopf 'Mehr laden' ist da, weil die Seite voll war");

 await page.evaluate(()=>document.querySelector("#verlaufTest .verlauf-mehr-knopf").click()); await page.waitForTimeout(250);
 st=await page.evaluate(()=>({zeilen:document.querySelectorAll("#verlaufTest .verlauf-entry").length,
   knopf:!!document.querySelector("#verlaufTest .verlauf-mehr-knopf")}));
 p(st.zeilen===100,"nach dem Nachladen sind es 100 - die alten bleiben stehen",st);
 p(st.knopf,"der Knopf bleibt, weil auch die zweite Seite voll war");

 await page.evaluate(()=>document.querySelector("#verlaufTest .verlauf-mehr-knopf").click()); await page.waitForTimeout(250);
 st=await page.evaluate(()=>({zeilen:document.querySelectorAll("#verlaufTest .verlauf-entry").length,
   knopf:!!document.querySelector("#verlaufTest .verlauf-mehr-knopf"),
   text:(document.querySelector("#verlaufTest .verlauf-mehr")||{}).textContent||""}));
 p(st.zeilen===107,"dritte Seite bringt die restlichen 7",st);
 p(!st.knopf,"danach ist der Knopf weg");
 p(/Alle 107/.test(st.text),"und es steht ausdruecklich da, dass alles geladen ist",st.text);

 // Doppelte ids duerfen die Liste nicht aufblaehen.
 await page.evaluate(()=>{ window.__seiten={0:window.__seiten[0],50:window.__seiten[0]};
   window.__antwort=(t,ab)=>t==="audit_log"?(window.__seiten[ab]||[]):[] });
 await page.evaluate(()=>loadProjectVerlauf($("verlaufTest"),7));
 await page.waitForTimeout(200);
 await page.evaluate(()=>document.querySelector("#verlaufTest .verlauf-mehr-knopf").click()); await page.waitForTimeout(250);
 const doppelt=await page.evaluate(()=>document.querySelectorAll("#verlaufTest .verlauf-entry").length);
 p(doppelt===50,"dieselben Eintraege noch einmal erhoehen die Liste nicht",doppelt);

 // ------------------------------- d) Zuletzt bearbeitet nutzt das Protokoll
 console.log("\nd · 'Zuletzt bearbeitet' kennt auch das Protokoll");
 const quelle=lies("js/09-projekte.js");
 p(/from\("audit_log"\)[\s\S]{0,120}RECENT_QUELLE_LIMIT/.test(quelle),
   "renderRecentProjects fragt audit_log mit ab");
 p(/logRes\.error/.test(quelle),
   "ein Fehler im Protokoll leert den Schnellzugriff nicht");

 await page.evaluate(()=>{
  const d=document.createElement("div"); d.id="recentProjectsList"; document.body.appendChild(d);
  // Nur das Protokoll kennt eine Aktivitaet an Projekt 8 - sie ist neuer als
  // alles andere. Ohne die fuenfte Quelle stuende Projekt 7 zuoberst.
  window.__antwort=(t)=>t==="audit_log"
   ?[{project_id:8,created_at:"2026-09-04T12:00:00Z",user_id:"u1"}]:[];
 });
 await page.evaluate(()=>renderRecentProjects());
 await page.waitForTimeout(250);
 const erste=await page.evaluate(()=>{
  const el=document.querySelector("#recentProjectsList .recent-project b");
  return el?el.textContent:"";
 });
 p(/Seestrasse 4/.test(erste),"das nur im Protokoll vermerkte Projekt steht zuoberst",erste);

 console.log("\nSauberkeit");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-bediensachen: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
