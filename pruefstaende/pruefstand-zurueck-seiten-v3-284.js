// Prueft v3.284: die Zurueck-Taste des Handys geht auch zwischen den SEITEN der
// neuen Ansicht (Heute > Projekte > Projekt > Register) eine Stufe zurueck,
// statt die App zu schliessen. Gemeldet: "manchmal schliesst sich die ganze app
// obwohl es eine vorherige seite gaebe". Jede Probe hat eine Gegenprobe.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"c1"};
  meineRechte={admin:true};
  allProjects=[{id:1,name:"Teststrasse 1",object:"Teststrasse 1",customer:"Muster AG",order_no:"A-1",status:"offen",zugeteilt_an:["u1"],created_by:"u1"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false; a2Zeichnen();
 });
 await page.waitForTimeout(300);
 const zust=()=>page.evaluate(()=>({seite:a2Zustand.seite,reg:a2Zustand.reg,tiefe:zurueckTiefe,stapel:zurueckSchirme.slice(),ebene:a2Ebene()}));
 const setze=(s,r)=>page.evaluate(([s,r])=>{a2Zustand.seite=s;a2Zustand.projektId=(s==="projekt")?1:null;a2Zustand.reg=r||"uebersicht";a2Zeichnen()},[s,r]);
 const zurueck=async()=>{await page.evaluate(()=>history.back());await page.waitForTimeout(250)};

 let z=await zust();
 p(z.ebene===0&&z.tiefe===0,"Heute ist der Boden: kein Platzhalter",z);
 await setze("projekte"); await page.waitForTimeout(100);
 await setze("projekt"); await page.waitForTimeout(100);
 await setze("projekt","aufmass"); await page.waitForTimeout(150);
 z=await zust();
 p(z.ebene===3&&z.tiefe===3,"Projekt > Register Massaufnahme liegt 3 Stufen tief, 3 Platzhalter",z);

 await zurueck(); z=await zust();
 p(z.seite==="projekt"&&z.reg==="uebersicht"&&z.tiefe===2,"1. Zurueck: Register -> Projekt-Uebersicht",z);
 await zurueck(); z=await zust();
 p(z.seite==="projekte"&&z.tiefe===1,"2. Zurueck: Projekt -> Projektliste",z);
 await zurueck(); z=await zust();
 p(z.seite==="heute"&&z.tiefe===0&&z.stapel.length===0,"3. Zurueck: Projektliste -> Heute; danach kein Platzhalter mehr (die naechste Taste darf die App verlassen)",z);

 // Gegenprobe: Seite wechseln ohne Zurueck gibt die Platzhalter zurueck
 await setze("projekte"); await setze("projekt"); await page.waitForTimeout(150);
 await setze("heute"); await page.waitForTimeout(250); z=await zust();
 p(z.tiefe===0&&z.stapel.length===0,"Gegenprobe: Wechsel per Tipp auf Heute raeumt die Platzhalter auf",z);

 // Ein Schirm ueber der Seite geht zuerst weg
 await setze("projekt"); await page.waitForTimeout(100);
 await page.evaluate(()=>{$("settingsModal").hidden=false}); await page.waitForTimeout(150);
 z=await zust();
 p(z.tiefe===3&&z.stapel[z.stapel.length-1]==="settingsModal","Ein Dialog liegt UEBER den Seitenstufen",z);
 await zurueck(); z=await zust();
 const offen=await page.evaluate(()=>!$("settingsModal").hidden);
 p(!offen&&z.seite==="projekt"&&z.tiefe===2,"Zurueck schliesst zuerst den Dialog, die Seite bleibt",{z,offen});
 await zurueck(); z=await zust();
 p(z.seite==="projekte","dann erst eine Seite zurueck",z);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
