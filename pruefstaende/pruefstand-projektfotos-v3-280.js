// Prueft "alle Fotos des Projekts stehen im Register Dateien" (v3.280).
//
// Ansage des Anwenders (9.10.2026): "Alle fotos die in einem projekt in
// verschiedenen massaufnahmen gemacht wurden sollen in den projektfotos zu
// sehen sein". Die Fotowand "Alle Fotos" gab es seit v3.142 im Cockpit, in der
// neuen Ansicht lag sie aber hinter einem Knopf; das Register "Dateien" zeigte nur
// hochgeladene Dateien.
//
// Geprueft wird das ERGEBNIS im Register - und dass die Fotos aus DERSELBEN
// Quelle kommen wie die Fotowand (cockpitFotoListe), nicht aus einer zweiten Regel.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1200},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=[{id:7001,name:"Dach Nord",object:"Enggisteinstrasse 4, 3076 Worb",order_no:"1",customer:"",archived:false,status:"in_arbeit"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  // Die signierte URL gibt es in dieser Sandbox nicht (kein Netz zu Supabase):
  // ein winziges Bild steht dafuer, damit die Kachel "bereit" werden kann.
  storageSignedUrl=async()=>"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  // Die Zwischenspeicher, die das Cockpit fuellt - hier von Hand gesetzt.
  window.__setze=(n)=>{
   const M="measurements/7001/";
   projectMeasurementsCache=[
    {id:1,project_id:7001,type:"rinne_halbrund",title:"Rinne Nord",date:"2026-10-01",workflow_status:"in_bearbeitung",archived:false,
     photo_paths:[M+"1/photo/a.jpg",M+"1/photo/b.jpg"],photo_path:M+"1/photo/a.jpg",sketch_paths:[M+"1/sketches/s.png"],sketch_path:M+"1/sketches/s.png"},
    {id:2,project_id:7001,type:"kehle",title:"Kehle Sued",date:"2026-10-03",workflow_status:"in_bearbeitung",archived:false,
     photo_paths:[M+"2/photo/c.jpg"],photo_path:M+"2/photo/c.jpg",sketch_paths:[],sketch_path:null},
    {id:3,project_id:7001,type:"skizze_foto",title:"Alt (archiviert)",date:"2026-09-01",workflow_status:"abgeschlossen",archived:true,
     photo_paths:[M+"3/photo/d.jpg"],photo_path:M+"3/photo/d.jpg",sketch_paths:[],sketch_path:null}];
   for(let i=0;i<n;i++)projectMeasurementsCache.push({id:100+i,project_id:7001,type:"kehle",title:"Mehr "+i,date:"2026-08-"+String(i%28+1).padStart(2,"0"),
     archived:false,photo_paths:[M+(100+i)+"/photo/x.jpg"],photo_path:M+(100+i)+"/photo/x.jpg",sketch_paths:[],sketch_path:null});
   projectAusmassCache=[]; projectReportsCache=[]; projectAngeboteCache=[]; projectFilesCache=[];
  };
  window.__zeige=async reg=>{
   a2Zustand.seite="projekt"; a2Zustand.projektId=7001; a2Zustand.reg=reg; a2Zustand.fotosAlle=false;
   a2ProjLaedt=false; cockpitProjectId=7001;
   a2Zeichnen(); await new Promise(r=>setTimeout(r,400));
   const box=$("a2Inhalt");
   return {kacheln:box.querySelectorAll(".medien-kachel").length,
    texte:[...box.querySelectorAll(".medien-label")].map(x=>x.textContent.trim()),
    bereit:box.querySelectorAll(".medien-kachel[data-bereit='1']").length,
    kopf:[...box.querySelectorAll(".a2-abschnitt-kopf h2")].map(x=>x.textContent.trim()),
    knopf:(box.querySelector('[data-a2-tu="fotosalle"]')||{}).textContent||""};
  };
 });

 console.log("\nA · Die Fotos aus den verschiedenen Massaufnahmen stehen im Register");
 await page.evaluate(()=>window.__setze(0));
 let r=await page.evaluate(()=>window.__zeige("dateien"));
 p(r.kacheln===5,"alle fuenf Bilder: 2 + 1 Fotos und 1 Skizze, dazu 1 Foto einer ARCHIVIERTEN Massaufnahme",r);
 p(r.kopf.includes("5 Fotos"),"die Ueberschrift nennt die Zahl",r.kopf);
 p(r.texte.some(t=>/Rinne/.test(t))&&r.texte.some(t=>/Kehle Sued/.test(t))&&r.texte.some(t=>/Alt \(archiviert\)/.test(t)),
   "bei jedem Bild steht, aus welcher Massaufnahme es kommt",r.texte);
 p(r.texte.some(t=>/Skizze/.test(t)),"auch Skizzen sind dabei (wie in der Fotowand)",r.texte);
 p(r.bereit===5,"alle Vorschauen werden geholt (die Kachel ist bereit zum Vergroessern)",r);

 console.log("\nB · Dieselbe Quelle wie die Fotowand");
 const q=await page.evaluate(()=>{const l=cockpitFotoListe();return {n:l.length,pfade:l.map(x=>x.pfad)}});
 const geseh=await page.evaluate(()=>[...$("a2Inhalt").querySelectorAll(".medien-kachel img")].map(i=>i.dataset.signedSrc));
 p(q.n===5&&JSON.stringify(q.pfade)===JSON.stringify(geseh),"das Register zeigt genau die Liste und Reihenfolge von cockpitFotoListe()",{q:q.n,geseh:geseh.length});

 console.log("\nC · Grosse Ansicht");
 const g=await page.evaluate(async()=>{
  const k=$("a2Inhalt").querySelector(".medien-kachel[data-bereit='1']");
  k.click(); await new Promise(r=>setTimeout(r,100));
  return {offen:!$("measMediaViewer").hidden,src:!!$("measMediaViewerImg").getAttribute("src"),label:$("measMediaViewerLabel").textContent.length>0};
 });
 p(g.offen&&g.src&&g.label,"ein Tipp auf ein Bild oeffnet die Grossansicht mit Herkunft",g);
 await page.evaluate(()=>{$("measMediaViewerClose").click()});

 console.log("\nD · Viele Fotos: erst die neuesten, dann alle");
 await page.evaluate(()=>window.__setze(40));
 r=await page.evaluate(()=>window.__zeige("dateien"));
 p(r.kacheln===30&&/Alle 45 Fotos zeigen/.test(r.knopf),"bei 45 Bildern stehen 30 da und ein Knopf \"Alle 45 Fotos zeigen\"",{k:r.kacheln,knopf:r.knopf});
 const alle=await page.evaluate(async()=>{document.querySelector('[data-a2-tu="fotosalle"]').click();await new Promise(r=>setTimeout(r,400));
  return {k:$("a2Inhalt").querySelectorAll(".medien-kachel").length,knopf:($("a2Inhalt").querySelector('[data-a2-tu="fotosalle"]')||{}).textContent||""}});
 p(alle.k===45&&/Nur die neuesten/.test(alle.knopf),"der Knopf zeigt alle 45 und fuehrt zurueck",alle);

 console.log("\nE · Gegenproben");
 await page.evaluate(()=>{window.__setze(0);projectMeasurementsCache.forEach(m=>{m.photo_paths=[];m.photo_path=null;m.sketch_paths=[];m.sketch_path=null})});
 r=await page.evaluate(()=>window.__zeige("dateien"));
 p(r.kacheln===0&&!r.kopf.some(t=>/Foto/.test(t)),"ohne Bilder steht kein leerer Foto-Abschnitt da",r);
 await page.evaluate(()=>window.__setze(0));
 r=await page.evaluate(()=>window.__zeige("uebersicht"));
 p(r.kacheln===0,"auf einem anderen Register (Uebersicht) stehen keine Foto-Kacheln",r);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
