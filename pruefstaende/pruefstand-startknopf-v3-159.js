// Prueft v3.159: der Knopf "🏠 Start" verschwindet in den BEREICHEN der
// neuen Ansicht - und nur dort.
//
// WORUM ES GEHT
// Gemeldet hat es der Anwender: "die buttons fertig und start fuehren
// jeweils zum gleichen ort". Das stimmt, aber nur in einem Bereich.
//
//   klassische Ansicht: "✓ Fertig" schliesst NUR diese Ebene, "🏠 Start"
//   raeumt ueber goToStart() (js/03) den ganzen Stapel ab. Aus der
//   Massaufnahme-Liste heraus, die im Cockpit liegt, sind das zwei
//   verschiedene Ziele - der Knopf bleibt dort deshalb unveraendert.
//
//   neue Ansicht, BEREICH: der Bereich ist die einzige offene Ebene, die
//   Leiste unten steht sichtbar darunter und traegt dauerhaft "Heute".
//   Beide Knoepfe landen am selben Ort. "Start" fuehrt dort sogar unter
//   falschem Namen: a2BereichBeobachten (js/70) setzt beim Schliessen nur
//   den Bereich zurueck, a2Zustand.seite bleibt stehen - wer aus der
//   Werkstatt "Start" drueckt, sieht die Seite, von der er kam.
//
//   neue Ansicht, FORMULAR: ein Erfassungsformular ist Vollbild, die
//   Leiste liegt VERDECKT darunter (so gewollt, siehe A6 in
//   pruefstand-bereiche-v3-156). Dort ist "Start" kein zweiter Weg zum
//   selben Ziel, sondern der einzige sichtbare Weg nach Hause. Beim
//   Regierapport ist er es woertlich: sein Zurueck-Knopf erscheint nur,
//   wenn der Rapport aus einem Projekt heraus geoeffnet wurde.
//
// WAS HIER GEPRUEFT WIRD
//   A  In jedem Bereich mit einem solchen Knopf ist "Start" unsichtbar,
//      der Weg hinaus ("Fertig" bzw. "Zurueck") aber sichtbar geblieben.
//   B  Gegenprobe klassische Ansicht: dieselben Knoepfe sind alle da.
//   C  Gegenprobe Formulare: in Massaufnahme, Ausmass, Offerte und
//      Regierapport bleibt "Start" sichtbar. Ohne C waere A auch dann
//      gruen, wenn jemand die Regel pauschal auf html.a2-an setzt - und
//      aus dem Regierapport gaebe es dann keinen Weg zurueck.
//   D  Der Weg ueber die Leiste, echt geklickt: Werkstatt und Lager
//      zeigen keinen Start-Knopf, und die Leiste mit "Heute" ist dabei
//      wirklich sichtbar - sie ist der Ersatz fuer den entfernten Knopf.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-startknopf-v3-159.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Die sechs Bereiche, die ueberhaupt einen Start-Knopf tragen, mit dem
// Knopf, der als Weg hinaus stehen bleiben MUSS.
const BEREICHE=[
 {id:"werkstattModal",     start:"startFromWerkstatt",     raus:"closeWerkstatt",  name:"Werkstatt"},
 {id:"settingsModal",      start:"startFromSettings",      raus:"closeSettings",   name:"Einstellungen/Lager"},
 {id:"projectsModal",      start:"startFromProjects",      raus:"closeProjects",   name:"Projekte"},
 {id:"globalSearchModal",  start:"startFromGlobalSearch",  raus:"closeGlobalSearch",name:"Suche"},
 {id:"adminMeasModal",     start:"startFromAdminMeas",     raus:"closeAdminMeas",  name:"Admin-Uebersicht"},
 {id:"projectCockpitModal",start:"cockpitStart",           raus:"cockpitBack",     name:"Projekt-Cockpit"}
];
// Die vier Formulare. Hier MUSS der Knopf bleiben.
const FORMULARE=[
 {id:"measurementEditModal",start:"startFromMeasurementEdit",name:"Massaufnahme"},
 {id:"ausmassEditModal",    start:"startFromAusmassEdit",    name:"Ausmass"},
 {id:"angebotEditModal",    start:"startFromAngebotEdit",    name:"Offerte"},
 {id:"reportScreen",        start:"startFromReportEdit",     name:"Regierapport"}
];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
  a2Setzen(true);
 });
 await page.waitForTimeout(400);

 // Ein Schirm wird hier direkt sichtbar gemacht statt erst hingeklickt:
 // geprueft wird die CSS-Regel, nicht der Weg dorthin. Ob der Knopf beim
 // Hinklicken wirklich weg ist, misst Abschnitt D zusaetzlich am echten
 // Weg ueber die Leiste.
 const messen=(modal,knopf)=>page.evaluate(([m,k])=>{
  document.querySelectorAll(".modal").forEach(x=>{if(x.id!=="authScreen")x.hidden=true});
  if($("reportScreen"))$("reportScreen").hidden=true;
  const s=$(m); if(s)s.hidden=false;
  const e=$(k);
  if(!e)return {da:false,fehlt:true};
  const st=getComputedStyle(e);
  return {da:st.display!=="none"&&st.visibility!=="hidden"&&e.getBoundingClientRect().height>0,
          fehlt:false, drin:!!(s&&s.contains(e))};
 },[modal,knopf]);

 // ---- A  Bereiche: Start weg, Weg hinaus bleibt --------------------------
 for(const x of BEREICHE){
  const start=await messen(x.id,x.start);
  const raus=await messen(x.id,x.raus);
  p(!start.fehlt&&start.drin&&!start.da,
    "A "+x.name+": der Knopf \"Start\" ist nicht zu sehen",start);
  p(raus.da,"A "+x.name+": der Weg hinaus (#"+x.raus+") ist geblieben",raus);
 }

 // ---- C  Gegenprobe Formulare: der Knopf bleibt --------------------------
 for(const x of FORMULARE){
  const start=await messen(x.id,x.start);
  p(start.da,"C Gegenprobe "+x.name+": \"Start\" bleibt sichtbar - die Leiste "
   +"liegt hier verdeckt darunter",start);
 }

 // ---- B  Gegenprobe klassische Ansicht -----------------------------------
 await page.evaluate(()=>a2Setzen(false));
 await page.waitForTimeout(300);
 for(const x of BEREICHE){
  const start=await messen(x.id,x.start);
  p(start.da,"B Gegenprobe klassisch "+x.name+": \"Start\" ist unveraendert da",start);
 }
 await page.evaluate(()=>a2Setzen(true));
 await page.waitForTimeout(300);

 // ---- D  Der echte Weg ueber die Leiste ----------------------------------
 const ueberLeiste=async k=>{
  await page.evaluate(()=>{
   document.querySelectorAll(".modal").forEach(x=>{if(x.id!=="authScreen")x.hidden=true});
   $("startScreen").hidden=false;
   a2Zustand.bereich=null; a2Zustand.seite="heute"; a2Zeichnen();
  });
  await page.waitForTimeout(250);
  await page.evaluate(k=>{
   const b=[...document.querySelectorAll("#a2Leiste [data-a2-tab]")]
     .find(x=>x.getAttribute("data-a2-tab")===k);
   if(b)b.click();
  },k);
  await page.waitForTimeout(900);
  return page.evaluate(()=>{
   const sichtbar=e=>{if(!e)return false;const s=getComputedStyle(e);
    return s.display!=="none"&&s.visibility!=="hidden"&&e.getBoundingClientRect().height>0};
   // Steht etwas ueber der Mitte der Leiste? Dieselbe Messung wie in
   // pruefstand-bereiche-v3-156 - die Leiste ist der Ersatz fuer den
   // entfernten Knopf und muss deshalb wirklich bedienbar sein.
   const leiste=$("a2Leiste"), r=leiste?leiste.getBoundingClientRect():null;
   let frei=false;
   if(r&&r.height>0){
    const o=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    frei=!!o&&(o===leiste||leiste.contains(o));
   }
   const heute=[...document.querySelectorAll("#a2Leiste [data-a2-tab]")]
     .some(x=>x.getAttribute("data-a2-tab")==="heute"&&sichtbar(x));
   const starts=["startFromWerkstatt","startFromSettings"].filter(id=>sichtbar($(id)));
   return {frei,heute,starts};
  });
 };
 let d=await ueberLeiste("werkstatt");
 p(d.starts.length===0&&d.frei&&d.heute,
   "D1 Werkstatt ueber die Leiste geoeffnet: kein Start-Knopf, dafuer \"Heute\" "
   +"in der freiliegenden Leiste",d);
 d=await ueberLeiste("lager");
 p(d.starts.length===0&&d.frei&&d.heute,
   "D2 Lager ueber die Leiste geoeffnet: kein Start-Knopf, dafuer \"Heute\" "
   +"in der freiliegenden Leiste",d);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
