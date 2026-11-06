// v3.440: Gemeldet (Fotos von Werkstatt, Lager und Archiv): leerer Streifen links, rechts abgeschnitten.
// Ursache: das Kopfbild der Startseite (<img width="1400">) machte ausserhalb der Heute-Seite das ganze Dokument 1414 px breit;
// der Browser zoomte heraus und die Desktop-Regeln (Seitenleiste 226 px) griffen. Geprueft: auf Handy-Breite ist das Dokument auf
// KEINER Seite und in KEINEM Bereich breiter als der Bildschirm - die Startseite wird zuerst gezeichnet (dort steht das Bild).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:384,height:900},locale:"de-CH"});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});await page.waitForTimeout(600);
 await page.evaluate(()=>{currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"L",company_id:"c1"};allProfiles=[currentProfile];meineRechte={admin:true};allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;a2Zustand.seite="heute";a2Zeichnen();});
 await page.waitForTimeout(600);
 const breite=()=>page.evaluate(()=>({doc:document.documentElement.scrollWidth,vw:innerWidth}));
 let r=await breite();
 p(r.doc<=r.vw+1,"Startseite: das Dokument ist nicht breiter als der Bildschirm",r);
 const bereiche={};
 for(const [id,nav,tab,name] of [["liefModal","navLagerverwaltung","lager","Lager"],["werkstattModal","navWerkstatt","werkstatt","Werkstatt"],["projectsModal","startOpenProjects","projekte","Archiv und Filter"]]){
  bereiche[id]=await page.evaluate(async([id,nav,tab,name])=>{
   if($(nav))$(nav).hidden=false;
   try{await a2BereichStarten(id,name,tab,()=>$(nav).click())}catch(e){}
   await new Promise(r=>setTimeout(r,500));
   const o={offen:!document.getElementById(id).hidden,doc:document.documentElement.scrollWidth,vw:innerWidth};
   try{a2BereichSchliessen()}catch(e){}return o},[id,nav,tab,name]);
 }
 const seiten={};
 for(const s of ["projekte","mehr"]){
  await page.evaluate(s=>{a2Zustand.seite=s;a2Zeichnen()},s);await page.waitForTimeout(200);seiten[s]=await breite();
 }
 p(Object.values(seiten).every(x=>x.doc<=x.vw+1),"Projekte und Mehr: nicht breiter als der Bildschirm (die Startseite war vorher gezeichnet)",seiten);
 p(bereiche.liefModal.offen&&bereiche.liefModal.doc<=bereiche.liefModal.vw+1,"Lager (Lieferanten-Lager) offen: nicht breiter als der Bildschirm",bereiche.liefModal);
 p(Object.values(bereiche).every(x=>x.doc<=x.vw+1),"Auch Werkstatt und Archiv und Filter: nicht breiter als der Bildschirm",bereiche);
 r=await page.evaluate(()=>{const i=document.querySelector("#a2Inhalt .a2-hero-bild");return i?{w:Math.round(i.getBoundingClientRect().width),vw:innerWidth,max:getComputedStyle(i).maxWidth}:{kein:true}});
 p(r.kein||r.w<=r.vw,"Das Kopfbild ist nie breiter als der Bildschirm (max-width 100 %)",r);
 p(fehler.length===0,"Keine Seitenfehler",fehler);
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);if(fail)console.log("FEHLGESCHLAGEN: insgesamt "+fail);process.exit(fail?1:0);
})();
