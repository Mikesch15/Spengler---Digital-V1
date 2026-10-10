// Prueft v3.291 (Auftrag "Persoenliche Aufgaben- und Benachrichtigungszentrale"):
// die vorhandene Aufgabenliste (js/45, "Heute") wird zuverlaessiger - kein neues
// Aufgabensystem. Drei belegte Luecken:
//   A  archivierte Massaufnahmen und Massaufnahmen in archivierten Projekten sind keine
//      offenen Aufgaben (Abfrage archived=false + Projekt-Filter)
//   B  scheitert der Abruf oder fehlt die Verbindung, steht es ueber der Liste -
//      die Liste zeigt den alten Stand, aber sie behauptet nichts Falsches
//   C  kommt die App aus dem Hintergrund zurueck, wird nachgeladen (ab 60 s Alter)
// Jede Probe hat eine Gegenprobe.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"employee",company_id:"c1"};
  workflowAktiv=true;
  allProjects=[{id:1,name:"Offen",object:"Offen 1"},{id:2,name:"Archiv",object:"Archiv 2",archived:true}];
  window.__q=[]; window.__fehlerRolle=null;
  const M=(id,pid,st,extra)=>Object.assign({id,project_id:pid,type:"rinne",title:"T"+id,date:"2026-10-0"+id,workflow_status:st,freigabe_verfallen:false,created_by:"u1",ruester_id:null,monteur_id:null},extra||{});
  const DATEN={created_by:[M(1,1,"in_bearbeitung"),M(2,2,"in_bearbeitung")],
               ruester_id:[M(3,1,"zu_ruesten",{ruester_id:"u1"}),M(4,2,"zu_ruesten",{ruester_id:"u1"})],
               monteur_id:[M(5,1,"zu_montieren",{monteur_id:"u1"})]};
  sb.from=(tab)=>{const op={tab,eq:{}};const pr={};
   pr.select=()=>pr;pr.order=()=>pr;pr.limit=()=>pr;pr.in=()=>pr;pr.is=()=>pr;
   pr.eq=(c,v)=>{op.eq[c]=v;return pr};
   pr.then=(res)=>{window.__q.push(op);
    if(tab!=="measurements")return res({data:[],error:null});
    const rolle=["created_by","ruester_id","monteur_id"].find(k=>k in op.eq);
    if(window.__fehlerRolle&&window.__fehlerRolle===rolle)return res({data:null,error:{message:"boom"}});
    return res({data:DATEN[rolle]||[],error:null})};
   return pr};
 });
 const ids=()=>page.evaluate(()=>aufgabenListe.map(a=>a.m.id).sort());
 const laden=async()=>{await page.evaluate(()=>aufgabenNeuLaden());await page.waitForTimeout(150)};

 // A
 await page.evaluate(()=>{window.__q=[]});
 await laden();
 const q=await page.evaluate(()=>window.__q.filter(o=>o.tab==="measurements").map(o=>o.eq));
 p(q.length===3&&q.every(e=>e.archived===false),"A alle drei Abfragen verlangen archived=false",q);
 p(JSON.stringify(await ids())==="[1,3,5]","A Massaufnahmen im ARCHIVIERTEN Projekt (2, 4) sind keine Aufgabe; 1 (freigeben), 3 (ruesten), 5 (montieren) schon",await ids());
 await page.evaluate(()=>{allProjects=[]});
 await laden();
 p(JSON.stringify(await ids())==="[1,2,3,4,5]","A Gegenprobe: ist das Projekt nicht bekannt, bleibt die Aufgabe stehen (lieber eine zu viel)",await ids());
 await page.evaluate(()=>{allProjects=[{id:1,name:"Offen",object:"Offen 1"},{id:2,name:"Archiv",object:"Archiv 2",archived:true}]});
 await laden();

 // B
 p(await page.evaluate(()=>aufgabenStandHinweis())==="","B nach erfolgreichem Abruf steht kein Hinweis da");
 await page.evaluate(()=>{window.__fehlerRolle="monteur_id"});
 await laden();
 let h=await page.evaluate(()=>({t:aufgabenStandHinweis(),html:a2SeiteHeute()}));
 p(/nicht aktualisiert werden/.test(h.t)&&/Stand von \d\d:\d\d/.test(h.t),"B Abruf gescheitert: Hinweis mit Uhrzeit",h.t);
 p(h.html.includes("nicht aktualisiert werden"),"B der Hinweis steht auf der Heute-Seite");
 p(JSON.stringify(await ids())==="[1,3,5]","B die Liste bleibt auf dem alten Stand (keine falsche Leere)",await ids());
 await page.evaluate(()=>{window.__fehlerRolle=null});
 await laden();
 p(await page.evaluate(()=>aufgabenStandHinweis())==="","B Gegenprobe: der naechste erfolgreiche Abruf nimmt den Hinweis weg");
 await page.evaluate(()=>{window.offlineIstOffline=()=>true});
 await laden();
 p(/Keine Verbindung/.test(await page.evaluate(()=>aufgabenStandHinweis())),"B offline: 'Keine Verbindung', Liste unveraendert",await ids());
 await page.evaluate(()=>{window.offlineIstOffline=()=>false});
 await laden();

 // C
 const sichtbar=(v)=>page.evaluate(v=>{Object.defineProperty(document,"visibilityState",{value:v,configurable:true});document.dispatchEvent(new Event("visibilitychange"))},v);
 const zaehl=()=>page.evaluate(()=>window.__q.filter(o=>o.tab==="measurements").length);
 await page.evaluate(()=>{aufgabenStand.zeit=Date.now()});
 let n0=await zaehl(); await sichtbar("visible"); await page.waitForTimeout(150);
 p(await zaehl()===n0,"C frischer Stand (< 60 s): Rueckkehr laedt NICHT nach");
 await page.evaluate(()=>{aufgabenStand.zeit=Date.now()-120000});
 n0=await zaehl(); await sichtbar("hidden"); await page.waitForTimeout(150);
 p(await zaehl()===n0,"C Gegenprobe: in den Hintergrund wechseln laedt nichts");
 await sichtbar("visible"); await page.waitForTimeout(200);
 p(await zaehl()===n0+3,"C Stand 2 Minuten alt: Rueckkehr laedt neu (drei Abfragen)",await zaehl()-n0);
 p(await page.evaluate(()=>Date.now()-aufgabenStand.zeit<5000),"C danach ist der Stand wieder frisch");
 await page.evaluate(()=>{currentProfile=null;aufgabenStand.zeit=0});
 n0=await zaehl(); await sichtbar("visible"); await page.waitForTimeout(150);
 p(await zaehl()===n0,"C Gegenprobe: ohne Anmeldung wird nichts geladen");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
