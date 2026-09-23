// Prueft v3.166: Ein Projekt geht in der NEUEN Ansicht auch dann auf der
// Projektseite auf, wenn der Klick aus der Werkstatt oder der Projektliste
// kommt - nicht im vollstaendigen alten Cockpit.
//
// WORUM ES GEHT
// Gemeldet: "wenn ich ueber die werkstatt ein projekt direkt oeffne,
// oeffnet sich noch komplett die alte ansicht". Die Werkstatt rief
// openProjectCockpit() direkt - an der neuen Ansicht vorbei. Dieselbe
// Luecke steckte in der Projektliste ("Oeffnen" und "Bearbeiten") und im
// Projekt-Treffer der Suche: alle drei sind in der neuen Ansicht BEREICHE
// INNERHALB dieser Ansicht, und aus einem Bereich heraus darf kein Klick
// in den alten Aufbau fuehren.
//
// DIE LOESUNG IST EINE WEICHE, KEIN NACHBAU
// projektOeffnen()/projektStammdatenOeffnen() in js/01 entscheiden an
// EINER Stelle, wo ein Projekt aufgeht: neue Ansicht -> Projektseite,
// sonst -> Cockpit wie bisher. Genau deshalb prueft Abschnitt D auch die
// klassische Ansicht: die Weiche darf den alten Weg nicht kaputtmachen.
//
// WAS AUSDRUECKLICH BEIM COCKPIT BLEIBT
// "Mehr -> Dateien, Fotos und Verlauf" und "Stammdaten bearbeiten" wollen
// genau diesen Schirm (mit ihrer Marke), nicht "ein Projekt" - Abschnitt E.
// Und ein SUCH-Treffer auf eine Massaufnahme/einen Rapport heisst "zeig
// mir genau diesen Eintrag"; dafuer springt das Cockpit an die Stelle und
// hebt sie hervor. Das kann die Projektseite heute nicht, also bleibt
// dieser Fall bewusst beim Cockpit (C3).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projekt-oeffnen-v3-166.js
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
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice().map(x=>({...x}));
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
 });
 await page.waitForTimeout(300);

 // Wo ist der Anwender gelandet? Die eine Messung, die alle Abschnitte
 // benutzen - gemessen wird der ZUSTAND der App, nicht nur ein Aufruf.
 const stand=()=>page.evaluate(()=>({
  seite: a2Zustand.seite,
  projektId: String(a2Zustand.projektId||""),
  reg: a2Zustand.reg,
  bereich: a2Zustand.bereich?a2Zustand.bereich.id:null,
  marke: a2Zustand.bereich?a2Zustand.bereich.marke:"",
  cockpitOffen: !$("projectCockpitModal").hidden,
  werkstattOffen: !$("werkstattModal").hidden,
  projekteOffen: !$("projectsModal").hidden,
  sucheOffen: !$("globalSearchModal").hidden,
  // Steht die Projektseite der neuen Ansicht wirklich da?
  projektseite: !!document.querySelector("#a2Inhalt [data-a2-reg]")
 }));

 // ---- A  Der gemeldete Weg: aus der Werkstatt ----------------------------
 const A=await page.evaluate(async()=>{
  a2Setzen(true);
  a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  // Die Werkstatt so oeffnen, wie die neue Ansicht es tut.
  await a2BereichStarten("werkstattModal","Werkstatt","werkstatt",()=>$("navWerkstatt").click());
  const bereichVorher=a2Zustand.bereich?a2Zustand.bereich.id:null;
  // Und jetzt der Klick auf "Projekt oeffnen" aus der Werkstatt heraus.
  const knopf=document.createElement("button");
  knopf.setAttribute("data-werk-projekt","1");
  ($("werkstattListe")||$("werkstattModal")).appendChild(knopf);
  knopf.click();
  await new Promise(f=>setTimeout(f,500));
  return {bereichVorher};
 });
 const As=await stand();
 p(A.bereichVorher==="werkstattModal","A1 die Werkstatt war als Bereich der neuen Ansicht offen",A);
 p(As.seite==="projekt"&&As.projektId==="1",
   "A2 der Klick fuehrt auf die PROJEKTSEITE der neuen Ansicht",As);
 p(As.cockpitOffen===false,
   "A3 und NICHT ins vollstaendige alte Cockpit - das war der gemeldete Fehler",As);
 p(As.werkstattOffen===false&&As.bereich===null,
   "A4 die Werkstatt ist dabei geschlossen worden, sie liegt nicht darunter",As);
 p(As.projektseite===true&&As.reg==="uebersicht",
   "A5 die Register der Projektseite stehen da, Vorgabe Uebersicht",As);

 // ---- B  Dieselbe Luecke in der Projektliste ------------------------------
 const B=await page.evaluate(async()=>{
  a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  await a2BereichStarten("projectsModal","Alle Projekte","projekte",
   ()=>$("startOpenProjects").click(),"a2-nur-liste");
  const bereichVorher=a2Zustand.bereich?a2Zustand.bereich.id:null;
  const knopf=$("projectList").querySelector("[data-open-cockpit]");
  const id=knopf?knopf.getAttribute("data-open-cockpit"):null;
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,500));
  return {bereichVorher,id};
 });
 const Bs=await stand();
 p(B.bereichVorher==="projectsModal"&&B.id,"B1 die Projektliste war als Bereich offen",B);
 p(Bs.seite==="projekt"&&Bs.projektId===String(B.id)&&Bs.cockpitOffen===false,
   "B2 'Oeffnen' fuehrt ebenfalls auf die Projektseite, nicht ins Cockpit",Bs);
 p(Bs.projekteOffen===false,"B3 und die Liste liegt nicht mehr darunter",Bs);

 // "Bearbeiten" derselben Liste: das WILL das Cockpit - aber nur die
 // Stammdatenfelder, mit Marke. Ohne Marke stuende dort wieder alles.
 const B4=await page.evaluate(async()=>{
  a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  await a2BereichStarten("projectsModal","Alle Projekte","projekte",
   ()=>$("startOpenProjects").click(),"a2-nur-liste");
  const knopf=$("projectList").querySelector("[data-edit-project]");
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,500));
  return {marke:a2Zustand.bereich?a2Zustand.bereich.marke:"",
          klassen:$("projectCockpitModal").className,
          projekteOffen:!$("projectsModal").hidden};
 });
 p(B4.marke==="a2-nur-stammdaten"&&/a2-nur-stammdaten/.test(B4.klassen),
   "B4 'Bearbeiten' zeigt nur die Stammdatenfelder, nicht das ganze Cockpit",B4);
 p(B4.projekteOffen===false,"B5 und die Projektliste ist auch hier geschlossen",B4);

 // ---- C  Die Suche --------------------------------------------------------
 const C=await page.evaluate(async()=>{
  a2Setzen(true);
  a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zustand.bereich=null; a2Zeichnen();
  $("projectCockpitModal").hidden=true;
  // Die Suche so oeffnen, wie die neue Ansicht es tut - als BEREICH. Nur
  // dann kann die Weiche sie beim Sprung auch wieder schliessen; ein von
  // Hand sichtbar gemachtes Fenster kennt die neue Ansicht nicht.
  await a2BereichStarten("globalSearchModal","Suchen","heute",
   ()=>{$("globalSearchModal").hidden=false});
  // Treffer auf das PROJEKT selbst.
  globalSearchCache=[{kind:"project",data:allProjects[0]}];
  $("globalSearchResults").innerHTML='<button data-open-search-cockpit="0">x</button>';
  $("globalSearchResults").querySelector("button").click();
  await new Promise(f=>setTimeout(f,500));
  return {projektId:allProjects[0].id};
 });
 const Cs=await stand();
 p(Cs.seite==="projekt"&&Cs.projektId===String(C.projektId)&&Cs.cockpitOffen===false,
   "C1 ein Treffer auf das PROJEKT fuehrt auf die Projektseite",Cs);
 p(Cs.sucheOffen===false,"C2 und die Suche ist geschlossen",Cs);

 // Gegenprobe: ein Treffer auf eine MASSAUFNAHME heisst "zeig mir genau
 // diesen Eintrag". Das kann nur das Cockpit - dieser Fall bleibt dort.
 const C3=await page.evaluate(async()=>{
  const gerufen=[];
  const alt=window.openProjectCockpit;
  window.openProjectCockpit=(id,treffer)=>{gerufen.push({id,treffer});return Promise.resolve()};
  $("globalSearchModal").hidden=false;
  globalSearchCache=[{kind:"measurement",data:{id:11,project_id:1}}];
  $("globalSearchResults").innerHTML='<button data-open-search-cockpit="0">x</button>';
  $("globalSearchResults").querySelector("button").click();
  await new Promise(f=>setTimeout(f,400));
  window.openProjectCockpit=alt;
  return gerufen;
 });
 p(C3.length===1&&C3[0].id===1&&C3[0].treffer&&C3[0].treffer.kind==="measurement"
   &&C3[0].treffer.id===11,
   "C3 ein Treffer auf eine Massaufnahme geht weiter ins Cockpit - mit dem Treffer",C3);

 // ---- D  Die klassische Ansicht bleibt unveraendert -----------------------
 // Die Weiche darf den alten Weg nicht kaputtmachen: ohne neue Ansicht
 // fuehrt derselbe Klick weiterhin ins Cockpit.
 const D=await page.evaluate(async()=>{
  a2Setzen(false);
  const gerufen=[];
  const alt=window.openProjectCockpit;
  window.openProjectCockpit=(id,treffer)=>{gerufen.push({id,treffer});return Promise.resolve()};
  await projektOeffnen(2);
  const gerufenBearb=[];
  const altB=window.openProjectCockpitZumBearbeiten;
  window.openProjectCockpitZumBearbeiten=(id)=>{gerufenBearb.push(id);return Promise.resolve()};
  await projektStammdatenOeffnen(3);
  window.openProjectCockpit=alt; window.openProjectCockpitZumBearbeiten=altB;
  return {gerufen,gerufenBearb};
 });
 p(D.gerufen.length===1&&D.gerufen[0].id===2,
   "D1 ohne neue Ansicht fuehrt projektOeffnen wie bisher ins Cockpit",D);
 p(D.gerufenBearb.length===1&&D.gerufenBearb[0]===3,
   "D2 und projektStammdatenOeffnen in den Stammdatenbereich des Cockpits",D);

 // ---- E  Was ausdruecklich beim Cockpit bleibt ----------------------------
 // "Mehr -> Dateien, Fotos und Verlauf" will GENAU diesen Schirm.
 const E=await page.evaluate(async()=>{
  a2Setzen(true);
  a2Zustand.seite="projekt"; a2Zustand.projektId=1; a2Zustand.reg="mehr";
  a2Zustand.bereich=null; a2Zeichnen();
  const knopf=document.querySelector('#a2Inhalt [data-a2-tu="cockpit"]');
  if(!knopf)return {knopf:false};
  knopf.click();
  await new Promise(f=>setTimeout(f,600));
  return {knopf:true,
          bereich:a2Zustand.bereich?a2Zustand.bereich.id:null,
          marke:a2Zustand.bereich?a2Zustand.bereich.marke:""};
 });
 p(E.knopf&&E.bereich==="projectCockpitModal"&&E.marke==="a2-nur-dateien",
   "E1 'Dateien, Fotos und Verlauf' geht weiterhin ins Cockpit - mit seiner Marke",E);

 // ---- F  Strukturpruefung -------------------------------------------------
 // Kein Weg, der "ein Projekt oeffnen" meint, darf wieder direkt ins
 // Cockpit greifen. Genau so ist der gemeldete Fehler entstanden.
 const quellen={
  werkstatt: fs.readFileSync(path.join(process.cwd(),"js/51-werkstatt.js"),"utf8"),
  projekte:  fs.readFileSync(path.join(process.cwd(),"js/09-projekte.js"),"utf8"),
  basis:     fs.readFileSync(path.join(process.cwd(),"js/01-basis.js"),"utf8")
 };
 p(!/openProjectCockpit\(/.test(quellen.werkstatt)&&/projektOeffnen\(/.test(quellen.werkstatt),
   "F1 die Werkstatt ruft projektOeffnen, nicht mehr openProjectCockpit");
 p(!/await openProjectCockpit\(/.test(quellen.projekte)
   &&!/await openProjectCockpitZumBearbeiten\(/.test(quellen.projekte),
   "F2 die Projektliste ebenfalls nicht mehr direkt");
 p(/function projektOeffnen/.test(quellen.basis)
   &&/function projektStammdatenOeffnen/.test(quellen.basis),
   "F3 beide Weichen stehen an EINER Stelle in js/01");

 p(fehler.length===0,"G1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
