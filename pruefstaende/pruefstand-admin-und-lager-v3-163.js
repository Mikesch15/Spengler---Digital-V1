// Prueft v3.163: drei Meldungen des Anwenders, eine davon ein Vorfall.
//
// 1) DER VORFALL. Der Inhaber hat bei sich selbst den Haken
//    "Administrator" entfernt. Danach hatte die Firma keinen
//    Administrator mehr - und niemand konnte ihn zurueckgeben, weil genau
//    dafuer Administratorrechte noetig sind. Eine Sackgasse, aus der nur
//    ein Eingriff an der Datenbank herausfuehrte.
//
//    Wirksam gesperrt ist das jetzt in der DATENBANK (Trigger
//    schuetze_letzten_admin). Was hier geprueft wird, ist die freundliche
//    Haelfte im Client: der Haken ist gar nicht erst bedienbar, und wer
//    es doch versucht, bekommt einen Satz statt eines Datenbankfehlers.
//    Abschnitt C prueft ausdruecklich auch, dass dabei NICHT geschrieben
//    wird - sonst waere die Meldung nur Zierde vor einem Fehlschlag.
//
// 2) "Die lagerverwaltung ist in den einstellungen immernoch vorhanden,
//    das will ich nicht." Seit v3.157 ist das Lager ein eigener Bereich;
//    der Abschnitt in den Einstellungen ist derselbe Arbeitsplatz ein
//    zweites Mal.
//
// 3) "Im projekt unter mehr -> weiteres, oeffnet sich das alte projekt
//    cockpit das ist falsch." Der Eintrag heisst "Dateien, Fotos und
//    Verlauf" - genau das soll er zeigen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-admin-und-lager-v3-163.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,
   {id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee",company_id:"c1"},
   {id:"u3",first_name:"Anna",last_name:"Meier",role:"employee",company_id:"c1"}];
  employeeIds=allProfiles.map(x=>x.id);
  settings=settings||{};
  settings.employees=["Mike Ledermann","Beat Krebs","Anna Meier"];
  settings.rates=settings.rates||[];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if($("companyLockedScreen"))$("companyLockedScreen").hidden=true;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
  if($("lagerverwaltungSection"))$("lagerverwaltungSection").hidden=false;
  a2Setzen(true);
 });
 await page.waitForTimeout(400);

 const sicht=s=>page.evaluate(x=>{
  const e=document.querySelector(x);
  return !!e&&getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0;
 },s);

 // ---- A  Die Lagerverwaltung ist raus aus den Einstellungen ---------------
 // Geoeffnet wird ueber den ECHTEN Weg, nicht mit hidden=false: der
 // Abschnitt liegt im Register "Lager" der Einstellungen, und ein
 // geschlossenes Register versteckt ihn ohnehin. Wer das nicht oeffnet,
 // misst nichts und ist trotzdem gruen - genau diese Falle hat in v3.162
 // schon einmal zugeschlagen.
 const lagerAbschnitte=()=>page.evaluate(()=>
  [...document.querySelectorAll("#settingsModal [data-section]")]
   .filter(e=>getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0)
   .map(e=>e.getAttribute("data-section")));

 await page.evaluate(()=>{
  document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
  openSettingsTo("lager");                 // Einstellungen -> Register Lager
 });
 await page.waitForTimeout(400);
 let ab=await lagerAbschnitte();
 p(ab.indexOf("lagerverwaltung")<0,
   "A1 im Register Lager der Einstellungen steht die Lagerverwaltung nicht mehr",ab);
 p(ab.length>0,
   "A1b Gegenprobe: das Register ist wirklich offen - sonst saehe A1 gar nichts",ab);

 // Gegenprobe: im Lager-BEREICH ist genau sie das, was gezeigt wird.
 await page.evaluate(()=>{
  document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
  $("navLagerverwaltung").click();
 });
 await page.waitForTimeout(600);
 await page.evaluate(()=>{$("settingsModal").classList.add("a2-nur-lager")});
 await page.waitForTimeout(250);
 ab=await lagerAbschnitte();
 p(ab.indexOf("lagerverwaltung")>=0,
   "A2 Gegenprobe: im Lager-Bereich ist sie da - sonst waere das Lager leer",ab);
 await page.evaluate(()=>{$("settingsModal").classList.remove("a2-nur-lager")});

 // Gegenprobe: in der klassischen Ansicht bleibt sie in den Einstellungen,
 // denn dort gibt es die Leiste und damit den eigenen Bereich nicht.
 await page.evaluate(()=>{
  a2Setzen(false);
  document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
  openSettingsTo("lager");
 });
 await page.waitForTimeout(400);
 ab=await lagerAbschnitte();
 p(ab.indexOf("lagerverwaltung")>=0,
   "A3 Gegenprobe klassisch: dort bleibt sie - es gibt keinen anderen Weg dorthin",ab);
 await page.evaluate(()=>{a2Setzen(true);$("settingsModal").hidden=true});

 // ---- B  "Weiteres" zeigt Dateien, Fotos und Verlauf ----------------------
 const B=await page.evaluate(async()=>{
  const p0=allProjects.find(x=>!x.archived);
  if(typeof openProjectCockpit==="function")await openProjectCockpit(Number(p0.id));
  $("projectCockpitModal").classList.add("a2-nur-dateien");
  await new Promise(f=>setTimeout(f,300));
  const s=el=>!!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().height>0;
  return {
   dateien: s($("cockpitFilesCard")),
   fotos:   s($("cockpitFotosCard")),
   verlauf: s($("cockpitVerlaufCard")),
   andere:  [...document.querySelectorAll("#projectCockpitModal .card.klapp")]
             .filter(c=>s(c)&&["cockpitFilesCard","cockpitFotosCard","cockpitVerlaufCard"].indexOf(c.id)<0)
             .map(c=>c.id),
   stand:   s($("cockpitStandBox")),
   stammdaten: s($("cockpitStammdaten"))
  };
 });
 p(B.dateien&&B.fotos&&B.verlauf,"B1 Dateien, Fotos und Verlauf stehen da",B);
 p(B.andere.length===0,"B2 und sonst keine Karte des Cockpits",B.andere);
 p(!B.stand&&!B.stammdaten,"B3 auch nicht Arbeitsstand und Stammdaten",B);
 const B4=await page.evaluate(()=>{
  $("projectCockpitModal").classList.remove("a2-nur-dateien");
  const s=el=>!!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().height>0;
  return {stand:s($("cockpitStandBox")),
          karten:[...document.querySelectorAll("#projectCockpitModal .card.klapp")].filter(s).length};
 });
 p(B4.stand&&B4.karten>3,"B4 Gegenprobe: ohne die Marke ist das volle Cockpit unveraendert da",B4);
 await page.evaluate(()=>{$("projectCockpitModal").hidden=true});

 // ---- C  Der letzte Administrator ----------------------------------------
 const C0=await page.evaluate(()=>({
  einziger: istLetzterAdmin("u1"),
  mitarbeiter: istLetzterAdmin("u2"),
  unbekannt: istLetzterAdmin("gibtsnicht"),
  ohneId: istLetzterAdmin(null)
 }));
 p(C0.einziger===true,"C1 der einzige Administrator wird als solcher erkannt",C0);
 p(C0.mitarbeiter===false&&C0.unbekannt===false&&C0.ohneId===false,
   "C2 ein Mitarbeiter, ein Unbekannter und 'niemand' sind es nicht",C0);

 // Der Haken ist gar nicht erst bedienbar.
 const C3=await page.evaluate(()=>{
  renderMitarbeiterSettings();
  const k=document.querySelector('[data-recht-admin="0"]');
  const box=$("employeeSettings");
  return {gesperrt:!!(k&&k.disabled), angekreuzt:!!(k&&k.checked),
          begruendung:/einzige/i.test(box?box.textContent:"")};
 });
 p(C3.gesperrt&&C3.angekreuzt,"C3 sein Haken ist gesetzt und gesperrt",C3);
 p(C3.begruendung,"C4 und daneben steht, warum",C3);

 // Wird er trotzdem umgelegt, wird NICHT geschrieben - und es kommt ein Satz.
 const C5=await page.evaluate(async()=>{
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push({t,n});return u(n)};return bau};
  const k=document.querySelector('[data-recht-admin="0"]');
  k.disabled=false;                    // so, als haette jemand die Sperre umgangen
  k.checked=false;
  k.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  return {geschrieben, wiederAngekreuzt:k.checked};
 });
 p(C5.geschrieben.length===0,
   "C5 es wird NICHT geschrieben - die Meldung steht vor dem Versuch, nicht danach",C5.geschrieben);
 p(dialoge.some(m=>/einzige Administrator/i.test(m)),
   "C6 und der Satz nennt den Grund",dialoge.slice(-2));
 p(C5.wiederAngekreuzt===true,"C7 der Haken springt zurueck",C5);

 // Gegenprobe: mit einem ZWEITEN Administrator ist alles wieder erlaubt.
 dialoge=[];
 const C8=await page.evaluate(async()=>{
  allProfiles.find(x=>x.id==="u2").role="admin";
  renderMitarbeiterSettings();
  const k=document.querySelector('[data-recht-admin="0"]');
  const gesperrt=!!k.disabled;
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push({t,n});return u(n)};return bau};
  k.checked=false;
  k.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  allProfiles.find(x=>x.id==="u2").role="employee";
  return {gesperrt, geschrieben};
 });
 p(C8.gesperrt===false,"C8 Gegenprobe: mit einem zweiten Administrator ist der Haken frei",C8);
 p(C8.geschrieben.some(x=>x.t==="profiles"&&x.n&&x.n.role==="employee"),
   "C9 und die Aenderung wird dann auch wirklich geschrieben",C8.geschrieben);

 p(fehler.length===0,"D1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
