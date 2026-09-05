// Bildschirmfotos fuer die Anleitung. Laedt die echte index.html mit einer
// Supabase-Attrappe - es wird KEINE Verbindung zur echten Datenbank gebaut
// und es erscheinen ausschliesslich erfundene Demodaten.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const AUS=process.env.AUS, STUB=fs.readFileSync(process.env.STUB,"utf8");
fs.mkdirSync(AUS,{recursive:true});
const liste=[];

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2,locale:"de-CH",timezoneId:"Europe/Zurich"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(700);

 // Das Fenster wird vor jedem Bild auf die Hoehe des Elements gebracht -
 // sonst malt Chromium bei hohen Elementen nur den sichtbaren Teil.
 async function schuss(name,sel,opt){
  opt=opt||{};
  await page.waitForTimeout(opt.warte||250);
  let hoehe=900;
  if(sel){
   hoehe=await page.evaluate(s=>{const e=document.querySelector(s);
     return e?Math.ceil(e.getBoundingClientRect().height)+40:0},sel);
   if(!hoehe){console.log("  FEHLT: "+name+"  ("+sel+")");return}
  }
  await page.setViewportSize({width:opt.breite||1100,height:Math.min(Math.max(hoehe,420),5200)});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(200);
  const datei=path.join(AUS,name+".png");
  const el=sel?await page.$(sel):null;
  if(el)await el.screenshot({path:datei}); else await page.screenshot({path:datei});
  const m=await page.evaluate(d=>{const i=new Image();return new Promise(r=>{i.onload=()=>r([i.width,i.height]);i.src=d})},
    "data:image/png;base64,"+fs.readFileSync(datei).toString("base64")).catch(()=>null);
  liste.push(name);
  console.log("  "+name+"  "+Math.round(fs.statSync(datei).size/1024)+" kB"+(m?"  "+m[0]+"x"+m[1]:""));
  await page.setViewportSize({width:1100,height:900});
 }

 // Ein Register des Einlaufblechs: Registerleiste + Inhalt in einem Bild.
 async function schussEB(name){await schuss(name,"#einlaufblechAufnahme")}

 // Ein sehr hohes Element in zwei Bilder schneiden. Ganz verkleinert waere
 // die Schrift im PDF nicht mehr lesbar. Die Teile ueberlappen sich leicht,
 // damit beim Lesen nichts verloren geht.
 async function schussGeteilt(name,sel,anteil){
  anteil=anteil||0.55;
  const box=await page.evaluate(s=>{const e=document.querySelector(s);
    if(!e)return null; const r=e.getBoundingClientRect();
    return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height}},sel);
  if(!box){console.log("  FEHLT: "+name+"  ("+sel+")");return}
  await page.setViewportSize({width:1100,height:Math.min(Math.ceil(box.h)+80,5200)});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(250);
  const schnitt=Math.round(box.h*anteil), ueber=30;
  const stuecke=[["a",0,schnitt],["b",Math.max(0,schnitt-ueber),Math.ceil(box.h)-Math.max(0,schnitt-ueber)]];
  for(const [suffix,oben,hoehe] of stuecke){
   const datei=path.join(AUS,name+"-"+suffix+".png");
   await page.screenshot({path:datei,clip:{x:box.x,y:box.y+oben,width:box.w,height:hoehe}});
   liste.push(name+"-"+suffix);
   console.log("  "+name+"-"+suffix+"  "+Math.round(fs.statSync(datei).size/1024)+" kB");
  }
  await page.setViewportSize({width:1100,height:900});
 }

 // ---------- 1 Anmeldung ----------
 await schuss("01-anmeldung","#authScreen .modalbox");

 // ---------- Demozustand ----------
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[{id:"u1",first_name:"Andrea",last_name:"Beispiel",role:"admin"},
               {id:"u2",first_name:"Beat",last_name:"Muster",role:"employee"}];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG"; companyAddress="Industriestrasse 8, 3006 Bern";
  defaultVat="8.1 %";
  allProjects=window.__demo.projects.slice();
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500},
                        {id:2,name:"Kupfer",legacy_key:"kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
                        {id:3,name:"Stahl verzinkt",legacy_key:"stahl",max_abstand_mm:8000,ab_fixpunkt_mm:4000}];
  blechRollenbreiten=[1000,670,500,330,250];
  settings.rates=[["Meister",98],["Vorarbeiter",88],["Monteur",76],["Lernender",42]];
  settings.materials=[["101.10","Titanzink Band 0.7 mm","0.7 mm","m2",38.5],
                      ["101.20","Titanzink Rinne halbrund 333","333 mm","m",42.0],
                      ["204.05","Kupfer Band 0.6 mm","0.6 mm","m2",71.2]];
  settings.employees=["Andrea Beispiel","Beat Muster"];
  rinneFittingTypes=[{id:1,name:"Aussenwinkel 90°",symbol:"AE90",is_fixpunkt:true,angle_deg:90,zuschlag_mm:0},
                     {id:2,name:"Innenwinkel 90°",symbol:"IE90",is_fixpunkt:true,angle_deg:-90,zuschlag_mm:0},
                     {id:3,name:"Einhängestutzen",symbol:"ABL",is_fixpunkt:true,angle_deg:0,zuschlag_mm:0},
                     {id:4,name:"Schiebestutzen",symbol:"SS",is_fixpunkt:false,is_schiebestutzen:true,angle_deg:0,zuschlag_mm:0},
                     {id:5,name:"Rinnenboden",symbol:"BD",is_fixpunkt:false,angle_deg:0,zuschlag_mm:60}];
  rinneNormlaengen={"1|333":[6000,5000,4000]};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  $("currentUserLabel").textContent="Andrea Beispiel";
  $("startCompanyLine").textContent="Muster Spenglerei AG";
  $("startScreen").hidden=false;
  if(typeof markierePflichtfelder==="function")markierePflichtfelder();
 });

 await schuss("02-start","#startScreen");

 // ---------- Projekte ----------
 await page.evaluate(()=>{$("startScreen").hidden=true;$("projectsModal").hidden=false;renderProjectList()});
 await schuss("03-projekte","#projectsModal .modalbox",{warte:700});

 // ---------- Cockpit ----------
 await page.evaluate(()=>openProjectCockpit(1));
 await page.waitForTimeout(1200);
 await schuss("04-cockpit-kopf","#projectCockpitModal .card:nth-of-type(1)");
 await schuss("05-cockpit-arbeit","#cockpitWorkArea");

 // ---------- Massaufnahme-Auswahl ----------
 await page.evaluate(()=>{$("projectCockpitModal").hidden=true;$("measTypeChooserModal").hidden=false});
 await schuss("06-massaufnahme-auswahl","#measTypeChooserModal .modalbox");


 // ---------- Einlaufblech gerade: die Register ----------
 await page.evaluate(()=>{
  $("measTypeChooserModal").hidden=true;
  newMeasurementWithType("einlaufblech_gerade");
  $("measurementEditModal").hidden=false;
  setMeasProjectField(1);
  $("measTitle").value="Einlaufblech Traufe Nord";
  ebA.material="1"; ebA.abwicklung=250; ebA.montage="links";
  ebA.massA=120; ebA.winkel=25;
  ebA.stuecke=[
   {laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0},
   {laenge:2000,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0},
   {laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:true,winkel:90},
   {laenge:1400,stossStoss:1330,gehrungLinks:false,gehrungRechts:false,winkel:0,endzugabeEnd:true}];
  ebA.gava.aktiv=true;
  renderEinlaufblechAufnahme();
 });
 await page.evaluate(()=>ebaSetzeSchritt(1));
 await schussEB("07-eb-1-grunddaten");
 await page.evaluate(()=>ebaSetzeSchritt(2));
 await schussEB("08-eb-2-geometrie");
 await page.evaluate(()=>ebaSetzeSchritt(3));
 await schussGeteilt("09-eb-3-stuecke","#einlaufblechAufnahme",0.52);
 await page.evaluate(()=>ebaSetzeSchritt(4));
 await schussEB("10-eb-4-zuschnitt");
 await page.evaluate(()=>ebaSetzeSchritt(5));
 await schussEB("11-eb-5-ausmass");
 await page.evaluate(()=>ebaSetzeSchritt(6));
 await schussEB("12-eb-6-kontrolle");
 // Fotos/Skizzen: sichtbar erst im letzten Register (v3.02)
 await schuss("13-fotos-skizzen","#measMedienBereich");

 // ---------- PDF-Listenauswahl ----------
 await page.evaluate(()=>{
  pdfListenAuswahl(new Set(["zusammenfassung","masse","stueckliste","rollen","ausmass","hinweise"]),
                   "PDF erstellen – Massaufnahme");
 });
 await schuss("14-pdf-listen","#pdfListenModal .modal-inner");
 await page.evaluate(()=>{pdfListenSchliessen(null);$("measurementEditModal").hidden=true});

 // ---------- Rinne Halbrund: Verlauf ----------
 await page.evaluate(()=>{
  newMeasurementWithType("rinne_halbrund");
  $("measurementEditModal").hidden=false; setMeasProjectField(1);
  $("measTitle").value="Rinne Nordseite";
  rinneA.material="1"; rinneA.groesse=333; rinneA.gesamtlaenge_mm=18000;
  rinneA.verlauf=[{art:"abschnitt",laenge:6000},
                  {art:"uebergang",typ:"ecke_aussen"},
                  {art:"abschnitt",laenge:7500},
                  {art:"uebergang",typ:"einhaengestutzen"},
                  {art:"abschnitt",laenge:4500}];
  rinneA.rinnenboden={links:true,rechts:true};
  rinneA.halter={aktiv:true,abstand_mm:800};
  renderRinneAufnahme();
  raSetzeSchritt(2);
 });
 await schuss("15-rinne-verlauf","#rinneAufnahme",{warte:500});
 await page.evaluate(()=>raSetzeSchritt(4));
 await schuss("16-rinne-stueckliste","#rinneAufnahme",{warte:400});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 // ---------- Kehle ----------
 await page.evaluate(()=>{
  newMeasurementWithType("kehle");
  $("measurementEditModal").hidden=false; setMeasProjectField(1);
  $("measTitle").value="Kehle Lukarne Ost";
  kehleA.material="1"; kehleA.abwicklung=500; kehleA.firstgehrung=true;
  kehleA.nh=42.5; kehleA.nl=23.5; kehleA.gl=1500;
  renderKehleAufnahme(); keaSetzeSchritt(2);
 });
 await schuss("17-kehle-winkel","#kehleAufnahme",{warte:500});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 // ---------- Ausmass ----------
 await page.evaluate(()=>{$("amTypeChooserModal").hidden=false});
 await schuss("18-ausmass-auswahl","#amTypeChooserModal .modalbox");
 await page.evaluate(()=>{
  $("amTypeChooserModal").hidden=true;
  newAusmassWithType("blitzschutz_ausmass");
  $("ausmassEditModal").hidden=false; setAmProjectField(1);
  $("amTitle").value="Blitzschutz Hauptdach";
 });
 await schuss("19-ausmass-blitzschutz","#ausmassEditModal .modalbox",{warte:500});
 await page.evaluate(()=>{$("ausmassEditModal").hidden=true});

 // ---------- Regierapport ----------
 await page.evaluate(()=>{
  $("newReport").click(); $("reportScreen").hidden=false;
  currentProjectId=1;
  $("date").value="2026-09-01"; $("orderNo").value="2026-118";
  $("customer").value="Muster Immobilien AG"; $("object").value="Dachfläche Nord";
  $("projectSelectedLabel").textContent="Bahnhofstrasse 12, 3011 Bern";
  works=[{date:"2026-09-01",desc:"Rinne demontiert und Einlaufbleche ersetzt",
          employee:"Andrea Beispiel",rateName:"Meister",hours:6.5},
         {date:"2026-09-01",desc:"Rinne demontiert und Einlaufbleche ersetzt",
          employee:"Beat Muster",rateName:"Monteur",hours:6.5}];
  mats=[{date:"2026-09-01",no:"101.20",qty:18},
        {date:"2026-09-01",no:"999.90",qty:2,desc:"Kaminhut Spezialanfertigung",dim:"verzinkt",unit:"Stk",price:"145"}];
  renderMain();
 });
 await schuss("20-regierapport","#reportScreen",{warte:500});
 await page.evaluate(()=>{$("reportScreen").hidden=true;goToStart&&goToStart()});

 // ---------- Globale Suche ----------
 await page.evaluate(()=>{
  $("startScreen").hidden=true; $("globalSearchModal").hidden=false;
  $("globalSearchInput").value="Bahnhof";
  if(typeof debouncedGlobalSearch==="function")debouncedGlobalSearch("Bahnhof");
 });
 await schuss("21-suche","#globalSearchModal .modalbox",{warte:1500});
 await page.evaluate(()=>{$("globalSearchModal").hidden=true});

 // ---------- Einstellungen ----------
 await page.evaluate(()=>{openSettingsTo("general","")});
 await schuss("22-einstellungen-allgemein","#settingsModal .modalbox",{warte:600});
 await page.evaluate(()=>{openSettingsTo("measurements","")});
 await schuss("23-einstellungen-massaufnahmen","#settingsModal .modalbox",{warte:600});
 await page.evaluate(()=>{openSettingsTo("protected","")});
 await schuss("24-einstellungen-geschuetzt","#settingsModal .modalbox",{warte:600});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // ---------- Hilfe-Fenster (Info-Knopf) ----------
 await page.evaluate(()=>{
  if(typeof hilfeOeffnen==="function")hilfeOeffnen("reg-zuschnitt");
 });
 await schuss("30-hilfe","#hilfeModal .modal-inner",{warte:400,breite:760});
 await page.evaluate(()=>{if(typeof hilfeSchliessen==="function")hilfeSchliessen()});

 // ---------- Feedback ----------
 await page.evaluate(()=>{
  $("feedbackModal").hidden=false;
  if(typeof fuelleFeedbackModule==="function")fuelleFeedbackModule();
  if(typeof renderFeedbackList==="function")renderFeedbackList();
 });
 await schuss("25-feedback","#feedbackModal .modalbox",{warte:700});
 await page.evaluate(()=>{$("feedbackModal").hidden=true});

 // Die Liste der Rueckmeldungen liegt im Einstellungs-Register "Feedback"
 // und ist nur fuer Firmenadministratoren sichtbar.
 await page.evaluate(()=>{
  openSettingsTo("feedback","");
  $("feedbackTabBtn").hidden=false;
  if(typeof renderFeedbackList==="function")renderFeedbackList();
 });
 await schuss("25b-feedback-liste","#settingsModal .modalbox",{warte:900});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // ---------- Aenderungsverlauf im Cockpit ----------
 await page.evaluate(()=>{
  $("feedbackModal").hidden=true; $("projectCockpitModal").hidden=false;
  cockpitProjectId=1;
  if(typeof toggleProjectVerlaufBox==="function")
   toggleProjectVerlaufBox($("cockpitVerlaufBody"),$("cockpitVerlaufToggle"),1);
 });
 await schuss("26-verlauf","#cockpitVerlaufBody",{warte:900});

 // ---------- System-Administration (nur fuer den Betreiber) ----------
 await page.evaluate(()=>{
  $("projectCockpitModal").hidden=true;
  $("systemAdminModal").hidden=false;
  sysAdminCompanies=window.__demo.companies.slice();
  if(typeof sysAdminRenderFilteredList==="function")sysAdminRenderFilteredList();
 }).catch(()=>{});
 await schuss("27-systemadmin","#systemAdminModal .modalbox",{warte:600});
 await page.evaluate(()=>{$("systemAdminModal").hidden=true});

 // ---------- Handy-Ansicht ----------
 await page.setViewportSize({width:390,height:1200});
 await page.evaluate(()=>{$("projectsModal").hidden=false;renderProjectList()});
 await page.waitForTimeout(800);
 await page.setViewportSize({width:390,height:1500});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.waitForTimeout(250);
 await page.screenshot({path:path.join(AUS,"28-handy-projekte.png"),
   clip:{x:0,y:0,width:390,height:800}});
 liste.push("28-handy-projekte");
 console.log("  28-handy-projekte  "+Math.round(fs.statSync(path.join(AUS,"28-handy-projekte.png")).size/1024)+" kB");
 await page.evaluate(()=>{$("projectsModal").hidden=true;openProjectCockpit(1)});
 await page.waitForTimeout(1200);
 await page.setViewportSize({width:390,height:1500});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.waitForTimeout(250);
 await page.screenshot({path:path.join(AUS,"29-handy-cockpit.png"),clip:{x:0,y:0,width:390,height:800}});
 liste.push("29-handy-cockpit");
 console.log("  29-handy-cockpit");

 await b.close();
 console.log("\nFehler auf der Seite: "+(fehler.length?fehler.join(" | "):"keine"));
 console.log("Bilder: "+liste.length);
})();
