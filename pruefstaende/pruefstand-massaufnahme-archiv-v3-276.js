// Prueft "abgeschlossene Massaufnahmen werden archiviert" (v3.276).
//
// Ansage des Anwenders (9.10.2026): "Abgeschlossene massaufnahmen sollen auch
// archiviert werden. Gleiche prozedur wie beim projekt." - also wie v3.275:
// nach dem Abschliessen eine kurze Rueckfrage, bei OK archivieren, aktive und
// archivierte als zwei Ansichten, Reaktivieren moeglich.
//
// Voraussetzung in der Datenbank: Spalte measurements.archived (boolean, Vorgabe
// false) - am 9.10.2026 additiv angelegt; der Workflow-Trigger kennt sie nicht
// und laesst sie durch. Die Datenbank ist hier gestubbt (sb.from wird ersetzt
// und protokolliert); gegen die echte laeuft in dieser Sandbox nichts.
//
//   A  nach dem Abschliessen kommt die Rueckfrage; OK schreibt archived=true
//   B  Abbrechen laesst die Massaufnahme abgeschlossen und aktiv
//   C  ist sie schon archiviert, kommt keine Frage; scheitert das Schreiben,
//      wird es gemeldet
//   D  die Projektliste: aktive und archivierte getrennt, Umschalter mit Zahl,
//      Archivieren nur an abgeschlossenen, Reaktivieren an archivierten
//   E  der Zwischenspeicher haelt ALLE (Bedarf/Zuschnitt rechnen darueber)
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let antwort=true; const fragen=[], meldungen=[];
 page.on("dialog",d=>{ if(d.type()==="alert"){meldungen.push(d.message());d.accept();return}
   fragen.push(d.message()); antwort?d.accept():d.dismiss()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=[{id:7001,name:"Dach Nord",object:"Bahnhofstrasse 12, 3011 Bern",order_no:"1",customer:"",archived:false,status:"in_arbeit"}];
  window.__rows=[
   {id:1,project_id:7001,type:"einlaufblech_gerade",title:"Nord",date:"2026-10-01",workflow_status:"in_arbeit".replace("in_arbeit","in_bearbeitung"),archived:false},
   {id:2,project_id:7001,type:"rinne_halbrund",title:"Sued",date:"2026-10-02",workflow_status:"abgeschlossen",archived:false},
   {id:3,project_id:7001,type:"kehle",title:"Alt",date:"2026-09-01",workflow_status:"abgeschlossen",archived:true}];
  window.__log=[]; window.__schreibFehler=false;
  sb.from=t=>{
   const q={t,op:null,vals:null,f:[]};
   const run=async()=>{
    if(q.op==="update"){
     window.__log.push({t,vals:q.vals,f:q.f.map(x=>x.join("="))});
     if(window.__schreibFehler)return {data:[],error:null};
     const z=window.__rows.find(r=>String(r.id)===String(q.f[0][1]));
     if(!z)return {data:[],error:null};
     Object.assign(z,q.vals); return {data:[z],error:null};
    }
    return {data:window.__rows.filter(r=>q.f.every(([c,v])=>String(r[c])===String(v))).map(r=>Object.assign({},r)),error:null};
   };
   const chain={update:v=>{q.op="update";q.vals=v;return chain},select:()=>chain,eq:(c,v)=>{q.f.push([c,v]);return chain},
    order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:null,error:null}),
    then:(a,r)=>run().then(a,r)};
   return chain;
  };
  // Der Workflow-Schritt selbst ist hier nicht Gegenstand: die Antwort der
  // Datenbankfunktion wird vorgegeben, die Oberflaeche dazu stillgelegt.
  mwRuf=async()=>({workflow_status:"abgeschlossen",freigabe_verfallen:false});
  renderMeasWorkflow=()=>{}; mwNachAenderung=()=>{};
  cockpitProjectId=7001;
  window.__abschliessen=async id=>{
   const z=window.__rows.find(r=>r.id===id);
   mwStand=Object.assign({},z,{workflow_status:"montiert"});
   window.__log.length=0;
   await mwAbschliessen();
   return {log:window.__log.map(x=>Object.keys(x.vals).join("+")),archiviert:!!window.__rows.find(r=>r.id===id).archived,
     stand:!!mwStand.archived};
  };
 });

 console.log("\nA · Nach dem Abschliessen kommt die Rueckfrage");
 await page.evaluate(()=>{window.__rows[1].archived=false});
 fragen.length=0; antwort=true;
 let r=await page.evaluate(()=>window.__abschliessen(2));
 p(fragen.length===2,"zwei Fragen: erst \"abschliessen?\", dann \"archivieren?\"",fragen);
 p(/archivieren/i.test(fragen[1]||"")&&/Sued/.test(fragen[1]||""),"die zweite nennt die Massaufnahme und fragt nach dem Archivieren",fragen[1]);
 p(r.log.join("|")==="archived"&&r.archiviert&&r.stand,"OK: archived=true geschrieben und nachgefuehrt",r);

 console.log("\nB · Abbrechen");
 await page.evaluate(()=>{window.__rows[1].archived=false});
 fragen.length=0;
 await page.evaluate(()=>{window.__nein=true});
 antwort=true;
 // erste Frage bestaetigen, zweite ablehnen
 page.removeAllListeners("dialog");
 let n=0;
 page.on("dialog",d=>{ if(d.type()==="alert"){meldungen.push(d.message());d.accept();return}
   fragen.push(d.message()); n++; (n%2===1)?d.accept():d.dismiss()});
 r=await page.evaluate(()=>window.__abschliessen(2));
 p(fragen.length===2&&r.log.length===0&&!r.archiviert,"Abbrechen bei der zweiten Frage: nichts wird geschrieben, die Massaufnahme bleibt aktiv",{fragen:fragen.length,r});

 console.log("\nC · Schon archiviert / Schreiben scheitert");
 page.removeAllListeners("dialog");
 page.on("dialog",d=>{ if(d.type()==="alert"){meldungen.push(d.message());d.accept();return}
   fragen.push(d.message()); d.accept()});
 fragen.length=0;
 r=await page.evaluate(()=>{window.__rows[1].archived=false;
   return window.__abschliessen(3)});   // Nr. 3 ist schon archiviert
 p(fragen.length===1&&r.log.length===0,"eine schon archivierte Massaufnahme: nur die Abschluss-Frage, keine Archiv-Frage",{fragen,r});
 fragen.length=0; meldungen.length=0;
 r=await page.evaluate(()=>{window.__rows[1].archived=false;window.__schreibFehler=true;return window.__abschliessen(2)});
 p(!r.archiviert&&meldungen.some(m=>/nicht geklappt/.test(m)),"scheitert das Schreiben, sagt es die App - kein stiller Erfolg",{r,meldungen});
 await page.evaluate(()=>{window.__schreibFehler=false;window.__rows[1].archived=false});

 console.log("\nD · Die Liste im Projekt");
 const L=await page.evaluate(async()=>{
  window.__rows[2].archived=true;
  const zaehl=await loadProjectMeasurements(7001);
  const box=$("cockpitMeasBody");
  const zeilen=[...box.querySelectorAll(".report-row")];
  const hat=(z,a)=>!!z.querySelector("["+a+"]");
  return {zaehl,n:zeilen.length,
   umschalter:(box.querySelector("[data-meas-archiv-umschalten]")||{}).textContent||"",
   archivKnopfBeiAbgeschlossen:zeilen.filter(z=>/Sued/.test(z.textContent)||z.innerHTML.indexOf('data-open-project-measurement="2"')>=0).map(z=>hat(z,"data-archive-measurement")),
   archivKnopfBeiOffener:zeilen.filter(z=>z.innerHTML.indexOf('data-open-project-measurement="1"')>=0).map(z=>hat(z,"data-archive-measurement")),
   cache:projectMeasurementsCache.length};
 });
 p(L.n===2&&L.zaehl===2,"die Liste zeigt die zwei aktiven; gezaehlt werden die aktiven",L);
 p(/Archivierte anzeigen \(1\)/.test(L.umschalter),"der Umschalter nennt die Zahl der archivierten",L.umschalter);
 p(L.archivKnopfBeiAbgeschlossen.every(Boolean)&&L.archivKnopfBeiAbgeschlossen.length===1,"an der abgeschlossenen steht \"Archivieren\"",L);
 p(L.archivKnopfBeiOffener.length===1&&!L.archivKnopfBeiOffener[0],"Gegenprobe: an der noch offenen steht kein \"Archivieren\"",L);
 p(L.cache===3,"der Zwischenspeicher haelt ALLE drei (Bedarf und Zuschnitt rechnen darueber)",L);

 const U=await page.evaluate(async()=>{
  document.querySelector("#cockpitMeasBody [data-meas-archiv-umschalten]").click();
  await new Promise(r=>setTimeout(r,200));
  const box=$("cockpitMeasBody");
  const zeilen=[...box.querySelectorAll(".report-row")];
  const r1={n:zeilen.length,text:zeilen.map(z=>z.textContent.replace(/\s+/g," ")).join("|"),
   reakt:zeilen.map(z=>(z.querySelector("[data-archive-measurement]")||{}).textContent||""),
   umschalter:(box.querySelector("[data-meas-archiv-umschalten]")||{}).textContent||"",
   zaehl:$("cockpitMeasCount")?$("cockpitMeasCount").textContent:""};
  box.querySelector("[data-archive-measurement]").click();
  await new Promise(r=>setTimeout(r,250));
  const box2=$("cockpitMeasBody");
  return {r1,nachReaktivieren:{zeilen:box2.querySelectorAll(".report-row").length,
    umschalter:(box2.querySelector("[data-meas-archiv-umschalten]")||{}).textContent||"",
    aktiv:!window.__rows[2].archived,
    geschrieben:window.__log.map(x=>JSON.stringify(x.vals))}};
 });
 p(U.r1.n===1&&/Alt|Kehle/.test(U.r1.text),"nach dem Umschalten stehen nur die archivierten da",U.r1);
 p(/Reaktivieren/.test(U.r1.reakt[0]||""),"mit \"Reaktivieren\"",U.r1);
 p(/Aktive Massaufnahmen anzeigen/.test(U.r1.umschalter),"und der Umschalter fuehrt zurueck",U.r1);
 p(U.nachReaktivieren.aktiv&&U.nachReaktivieren.geschrieben.some(x=>x==='{"archived":false}'),
   "Reaktivieren schreibt archived=false",U.nachReaktivieren);
 p(!/Archivierte anzeigen/.test(U.nachReaktivieren.umschalter),
   "ist nichts mehr archiviert, verschwindet der Umschalter und die Ansicht faellt auf \"aktive\" zurueck",U.nachReaktivieren);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
