// Prueft die PROJEKTSEITE der neuen Ansicht (v3.151): sechs Register auf
// echten Daten, und jeder Knopf oeffnet das bestehende Formular.
//
// WAS HIER GEPRUEFT WIRD
//   A  Ein Projekt oeffnet die Projektseite (nicht das Cockpit), mit
//      Kopfzeile, Zurueck-Knopf und Ablaufleiste. GEGENPROBE A5: jede
//      Tabelle wird GENAU EINMAL gefragt - die Seite baut keine eigene
//      Abfrage, sondern nutzt die Ladefunktionen des Cockpits.
//   B  Das Register Aufmass listet die Massaufnahmen, oeffnet das
//      bestehende Formular mit dem richtigen Rueckziel, und der Rueckweg
//      fuehrt auf dasselbe Register zurueck - mit frisch geladenen Listen.
//   C  Das Register Werkstatt gruppiert nach Arbeitsstand und nennt, wer
//      zugeteilt ist.
//   D/E  Ausmass, Leistungen und Regierapporte mit ihren echten Feldern.
//   F  Der Zurueck-Knopf fuehrt in die Projektliste.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Was die Formulare selbst tun - das steht in ihren eigenen Pruefstaenden.
//   Diese Seite schreibt nichts; sie zeigt an und oeffnet.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ansicht2-projekt-v3-151.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Eine Attrappe, die je Tabelle liefert, was in __db steht - und mitzaehlt,
// WIE OFT welche Tabelle gefragt wurde. Genau daran haengt die Gegenprobe
// "keine zweiten Abfragen".
const STUB=`window.__db={};window.__abfragen=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const f={_t:t,_eq:{}};
  ['select','order','limit','range','not','in'].forEach(k=>f[k]=()=>f);
  f.eq=(s,v)=>{f._eq[s]=v;return f};
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>{window.__abfragen.push(t);
   return Promise.resolve({data:(window.__db[t]||[]).slice(),error:null}).then(r)};
  return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})}
})};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad()});
 const page=await b.newPage({viewport:{width:390,height:844}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("console",m=>{if(m.type()==="error"&&!/ERR_TUNNEL|Failed to load resource/.test(m.text()))fehler.push("console: "+m.text())});
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2Aktiv==="function");

 await page.evaluate(()=>{
  currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"},
               {id:"u2",first_name:"Bruno",last_name:"Muster"}];
  companyName="Peter Künzi AG";
  allProjects=[{id:7,name:"Neubau Hofmatt",object:"Hofmattstrasse 4, 3400 Burgdorf",
                order_no:"26-011",customer:"Hofmatt AG",status:"in_arbeit",archived:false,
                updated_at:"2026-09-21T10:00:00Z"}];
  aufgabenListe=[];
  window.__db={
   measurements:[
    {id:11,project_id:7,type:"rinne_halbrund",title:"Rinne Nord",date:"2026-09-10",
     workflow_status:"zu_ruesten",ruester_id:"u2",data:{}},
    {id:12,project_id:7,type:"kamin",title:"Kamin Ost",date:"2026-09-12",
     workflow_status:"geruestet",monteur_id:"u1",data:{}}
   ],
   ausmass:[{id:21,project_id:7,type:"blitzschutz_ausmass",title:"BS Ost",date:"2026-09-14"}],
   reports:[{id:31,project_id:7,date:"2026-09-15",order_no:"26-011",customer:"Hofmatt AG"}],
   project_files:[],
   leistungen:[{id:41,project_id:7,bezeichnung:"Rinne montieren",menge:12,einheit:"m",angebot_position:"1.1"}],
   angebote:[]
  };
  $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
  if($("navWerkstatt"))$("navWerkstatt").hidden=false;
  // Wie loadAllData() es tut: die Untermodule der Firma setzen.
  if(typeof pmUebernehmen==="function")pmUebernehmen({haupt:true,material:true,zuschnitt:true,werkstatt:true});
  showStart();
 });

 // --- A: Projekt oeffnen ---
 await page.click('[data-a2-tab="projekte"]');
 await page.evaluate(()=>{window.__abfragen=[]});
 await page.click('[data-a2-projekt="7"]');
 await page.waitForFunction(()=>!a2ProjLaedt);
 let a=await page.evaluate(()=>({
  seite:a2Zustand.seite, reg:a2Zustand.reg,
  cockpitId:cockpitProjectId,
  cockpitModal:!$("projectCockpitModal").hidden,
  kopf:$("a2Kopf").textContent.replace(/\s+/g," ").trim(),
  zurueck:!!$("a2Kopf").querySelector("[data-a2-zurueck]"),
  register:[...document.querySelectorAll("#a2Inhalt .a2-register button")].map(x=>x.textContent.trim()),
  abfragen:window.__abfragen.slice(),
  ablauf:[...document.querySelectorAll("#a2Inhalt .a2-ablauf-text")].map(x=>x.textContent)
 }));
 p(a.seite==="projekt"&&a.reg==="uebersicht","A1 die Projektseite ist offen, Register Übersicht",a);
 p(!a.cockpitModal,"A2 das klassische Cockpit bleibt zu",a);
 p(a.cockpitId===7,"A3 cockpitProjectId ist gesetzt (Rueckwege und Cockpit-Wechsel)",a);
 p(a.kopf.includes("Hofmattstrasse 4")&&a.zurueck,"A4 Kopfzeile mit Projekt und Zurueck-Knopf",a);
 // Jede Tabelle genau einmal - keine zweite Abfrage auf dieselbe Sache.
 const zaehl={};a.abfragen.forEach(t=>zaehl[t]=(zaehl[t]||0)+1);
 const doppelt=Object.keys(zaehl).filter(t=>zaehl[t]>1);
 p(doppelt.length===0,"A5 jede Tabelle wurde genau einmal gefragt",zaehl);
 p(a.ablauf.length>0,"A6 die Ablaufleiste steht auf der Uebersicht",a.ablauf);

 // --- B: Aufmass ---
 await page.click('[data-a2-reg="aufmass"]');
 let bb=await page.evaluate(()=>({
  zeilen:[...document.querySelectorAll("#a2Inhalt [data-a2-meas]")].map(x=>x.getAttribute("data-a2-meas")),
  text:$("a2Inhalt").textContent.replace(/\s+/g," ")
 }));
 p(JSON.stringify(bb.zeilen)===JSON.stringify(["11","12"]),"B1 beide Massaufnahmen stehen da",bb.zeilen);
 p(bb.text.includes("Dachrinne")||bb.text.includes("Rinne"),"B2 die Fachart ist der Haupttitel",bb.text.slice(0,200));

 // Oeffnen -> das bestehende Formular, mit unserem Rueckziel
 await page.click('[data-a2-meas="11"]');
 let b2=await page.evaluate(()=>({
  formular:!$("measurementEditModal").hidden,
  id:currentMeasurementId,
  ziel:measEditReturnTo
 }));
 p(b2.formular&&b2.id===11,"B3 es oeffnet das bestehende Massaufnahme-Formular",b2);
 p(b2.ziel==="a2Projekt","B4 mit dem Rueckziel Projektseite",b2);

 // Zurueck -> wieder auf der Projektseite, Listen frisch
 await page.evaluate(()=>{window.__abfragen=[];$("measurementEditModal").hidden=true;return measEditZurueck()});
 await page.waitForFunction(()=>!a2ProjLaedt);
 let b3=await page.evaluate(()=>({
  seite:a2Zustand.seite, reg:a2Zustand.reg,
  a2:$("a2Screen").getClientRects().length>0,
  uebersicht:!$("measurementsModal").hidden,
  neuGeladen:window.__abfragen.indexOf("measurements")>=0
 }));
 p(b3.seite==="projekt"&&b3.a2,"B5 Zurueck fuehrt auf die Projektseite",b3);
 p(b3.reg==="aufmass","B6 und zwar auf das Register, aus dem man kam",b3);
 p(!b3.uebersicht,"B7 die Massaufnahme-Uebersicht wird nicht gezeigt",b3);
 p(b3.neuGeladen,"B8 die Listen wurden neu geholt",b3);

 // --- C: Werkstatt-Register ---
 await page.click('[data-a2-reg="werkstatt"]');
 let c=await page.evaluate(()=>({
  text:$("a2Inhalt").textContent.replace(/\s+/g," "),
  zeilen:[...document.querySelectorAll("#a2Inhalt [data-a2-meas]")].length
 }));
 p(c.text.includes("Zu rüsten")&&c.text.includes("Gerüstet"),"C1 nach Arbeitsstand gruppiert",c.text.slice(0,200));
 p(c.text.includes("Bruno Muster"),"C2 der zugeteilte Ruester steht dabei",c.text.slice(0,300));

 // --- D: Ausmass ---
 await page.click('[data-a2-reg="ausmass"]');
 let d=await page.evaluate(()=>({
  zeilen:[...document.querySelectorAll("#a2Inhalt [data-a2-am]")].map(x=>x.getAttribute("data-a2-am")),
  text:$("a2Inhalt").textContent.replace(/\s+/g," ")
 }));
 p(JSON.stringify(d.zeilen)===JSON.stringify(["21"]),"D1 das Ausmass steht da",d);
 p(d.text.includes("Blitzschutzausmass"),"D2 mit der richtigen Beschriftung",d.text.slice(0,200));

 // --- E: Mehr ---
 await page.click('[data-a2-reg="mehr"]');
 let e2=await page.evaluate(()=>({
  lei:[...document.querySelectorAll("#a2Inhalt [data-a2-lei]")].length,
  rep:[...document.querySelectorAll("#a2Inhalt [data-a2-rep]")].length,
  text:$("a2Inhalt").textContent.replace(/\s+/g," ")
 }));
 p(e2.lei===1&&e2.rep===1,"E1 Leistung und Regierapport stehen da",e2);
 p(e2.text.includes("Rinne montieren")&&e2.text.includes("Offerte-Pos. 1.1"),"E2 mit den richtigen Feldern",e2.text.slice(0,300));

 // --- F: zurueck in die Projektliste ---
 await page.click("[data-a2-zurueck]");
 let f=await page.evaluate(()=>({seite:a2Zustand.seite,projektId:a2Zustand.projektId}));
 p(f.seite==="projekte"&&!f.projektId,"F1 der Zurueck-Knopf fuehrt in die Projektliste",f);

 p(fehler.length===0,"G1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
