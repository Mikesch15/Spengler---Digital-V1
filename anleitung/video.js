// Videoanleitung: ein stummes Bildschirmvideo, das durch die App fuehrt und
// dabei erklaerende Texttafeln einblendet. Laedt wie schuss.js die echte
// index.html mit derselben Supabase-Attrappe (stub.js) - es wird KEINE
// Verbindung zur echten Datenbank aufgebaut, alle gezeigten Daten sind
// erfunden (siehe stub.js).
//
// Es gibt bewusst KEINE zweite Demozustand-Herstellung: dieselben
// page.evaluate()-Bloecke wie in schuss.js, nur statt eines Bildschirmfotos
// je Stelle eine kurze Texttafel und eine Wartezeit, waehrend Playwright
// (ueber das mitgelieferte ffmpeg) durchgehend aufzeichnet.
//
// Aufruf:  SP=<Ordner mit node_modules> AUS=anleitung/video-out STUB=anleitung/stub.js \
//          node anleitung/video.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const AUS=process.env.AUS||"anleitung/video-out";
const STUB=fs.readFileSync(process.env.STUB,"utf8");
fs.mkdirSync(AUS,{recursive:true});
const BREITE=1280,HOEHE=800;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const kontext=await b.newContext({
  viewport:{width:BREITE,height:HOEHE},
  recordVideo:{dir:AUS,size:{width:BREITE,height:HOEHE}},
  locale:"de-CH",timezoneId:"Europe/Zurich"
 });
 const page=await kontext.newPage();
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await kontext.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));

 // ---- Texttafel unten im Bild - eine Zeile Titel, eine Zeile Erklaerung ----
 async function tafelEinbauen(){
  await page.evaluate(()=>{
   if(document.getElementById("__capbar"))return;
   const bar=document.createElement("div");
   bar.id="__capbar";
   bar.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;"
    +"background:rgba(15,23,42,.94);color:#fff;padding:12px 24px;"
    +"font:15px/1.4 -apple-system,'Segoe UI',Roboto,sans-serif;"
    +"box-shadow:0 -2px 12px rgba(0,0,0,.35);pointer-events:none";
   bar.innerHTML='<div id="__captitel" style="font-size:12px;font-weight:700;'
    +'letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc;margin-bottom:3px"></div>'
    +'<div id="__captext" style="font-size:15px;font-weight:500"></div>';
   document.body.appendChild(bar);
   const deckel=document.createElement("div");
   deckel.id="__capkopf";
   deckel.style.cssText="position:fixed;left:0;right:0;top:0;z-index:2147483646;"
    +"background:linear-gradient(180deg,rgba(15,23,42,.85),rgba(15,23,42,0));"
    +"padding:14px 24px 26px;font:800 17px/1.3 -apple-system,'Segoe UI',Roboto,sans-serif;"
    +"color:#fff;text-align:center;pointer-events:none;display:none";
   document.body.appendChild(deckel);
  });
 }
 // Grosse, kurz eingeblendete Kapiteltafel - fuer den Einstieg in einen
 // neuen Abschnitt der App.
 async function kapitel(titel){
  await tafelEinbauen();
  await page.evaluate(t=>{
   const k=document.getElementById("__capkopf");
   k.textContent=t; k.style.display="block";
  },titel);
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{document.getElementById("__capkopf").style.display="none"});
 }
 // Eine Szene: Texttafel unten setzen, wahlweise zu einer Stelle scrollen,
 // dann eine Weile stehen lassen, waehrend das Video laeuft.
 async function szene(titel,text,opt){
  opt=opt||{};
  await tafelEinbauen();
  await page.evaluate(([t,x])=>{
   document.getElementById("__captitel").textContent=t;
   document.getElementById("__captext").textContent=x;
  },[titel,text]);
  if(opt.scrollZu){
   await page.evaluate(s=>{const e=document.querySelector(s);
     if(e)e.scrollIntoView({block:"start",behavior:"instant"})},opt.scrollZu);
  }else if(!opt.keinScroll){
   await page.evaluate(()=>window.scrollTo(0,0));
  }
  await page.waitForTimeout(opt.warte||3200);
 }

 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await kapitel("Spengler‑DIGITAL");
 await szene("Anmeldung","Anmeldung mit E‑Mail und Passwort - jede Firma sieht ausschliesslich ihre eigenen Daten.",
   {scrollZu:"#authScreen",warte:2600});

 // ---------- Demozustand (identisch zu schuss.js, gekuerzt kommentiert) ----
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
  blechRollenbreiten=[1000,670,500];
  blechSchnittfuge=3; restMindestlaenge=1000;
  restMindestbreite=100; resteImZuschnitt=true;
  if(typeof lagerbestand!=="undefined")lagerbestand=[
   {id:1,material_id:1,artikel_id:3,bezeichnung:"Titanzinkblech blank",staerke_mm:0.7,
    ausfuehrung:"blank",form:"tafel",laenge_mm:2000,breite_mm:1000,notiz:null},
   {id:2,material_id:2,artikel_id:5,bezeichnung:"Kupferblech",staerke_mm:0.6,
    ausfuehrung:"blank",form:"tafel",laenge_mm:2000,breite_mm:1000,notiz:null},
   {id:3,material_id:3,artikel_id:null,bezeichnung:"Stahlblech verzinkt",staerke_mm:0.75,
    ausfuehrung:"verzinkt",form:"rolle",laenge_mm:null,breite_mm:null,notiz:"Restrolle"},
   {id:4,material_id:1,artikel_id:4,bezeichnung:"Titanzinkblech blank",staerke_mm:0.8,
    ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null,notiz:null}];
  if(typeof reststuecke!=="undefined")reststuecke=window.__demo.reststuecke.slice();
  settings.rates=[["Meister",98],["Vorarbeiter",88],["Monteur",76],["Lernender",42]];
  settings.materials=[["101.10","Titanzink Band 0.7 mm","0.7 mm","m2",38.5],
                      ["101.20","Titanzink Rinne halbrund 333","333 mm","m",42.0],
                      ["103.01","Titanzinkblech blank","0.70","m2",38.5],
                      ["103.02","Titanzinkblech blank","0.80","m2",42.9],
                      ["102.01","Kupferblech","0.60","m2",71.2],
                      ["204.05","Kupfer Band 0.6 mm","0.6 mm","m2",71.2],
                      ["202.10","Rinnenhalter Titanzink","333 mm","Stk",6.4],
                      ["202.60","Dehnungselement Titanzink","333 mm","Stk",34.5],
                      ["301.40","Bohrschraube nichtrostend","4.5 × 35 mm","Stk",0.42],
                      ["305.10","Dichtband Butyl","15 mm × 10 m","Rolle",18.9]];
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
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
 });

 await szene("Startbildschirm","Übersicht, globale Suche, eigene Aufgaben und der Zugang zur Werkstatt - alles von einer Stelle aus.",
   {scrollZu:"#startScreen",warte:3200});

 // ---------- Projekte ----------
 await kapitel("Projekte");
 await page.evaluate(()=>{$("startScreen").hidden=true;$("projectsModal").hidden=false;renderProjectList()});
 await szene("Projektliste","Jedes Projekt mit Auftragsnummer, Kunde, Objekt und Status - archivierte Projekte lassen sich ausblenden.",
   {scrollZu:"#projectsModal .modalbox",warte:3200});

 // ---------- Cockpit ----------
 await page.evaluate(()=>openProjectCockpit(1));
 await page.waitForTimeout(1000);
 await szene("Projekt‑Cockpit","Ein Projekt öffnet sich im Cockpit: Kopfdaten, dann alle Arbeitsbereiche einzeln aufklappbar.",
   {scrollZu:"#projectCockpitModal .modalbox",warte:3200});
 await page.evaluate(()=>{const k=document.querySelector('#cockpitMeasCard .klapp-kopf[data-klapp]');
   if(k&&!k.closest(".klapp").classList.contains("open"))k.click()});
 await page.waitForTimeout(400);
 await szene("Massaufnahmen im Projekt","Alle bisherigen Massaufnahmen dieses Projekts, mit Status und direktem Zugriff.",
   {scrollZu:"#cockpitWorkArea",warte:3200});

 // ---------- Offerte ----------
 await kapitel("Offerte");
 await page.evaluate(async()=>{
  offerteZugriff=true;
  if($("cockpitAngeboteCard"))$("cockpitAngeboteCard").hidden=false;
  const k=document.querySelector('#cockpitAngeboteCard .klapp-kopf[data-klapp]');
  if(k&&!k.closest(".klapp").classList.contains("open"))k.click();
  await cockpitBereichAktualisieren("angebote");
 });
 await szene("Offerten des Projekts","Offerten mit PDF und/oder Fotos - die KI erkennt daraus die einzelnen Positionen.",
   {scrollZu:"#cockpitAngeboteCard",warte:3000});
 await page.evaluate(()=>{$("cockpitAngeboteCard").querySelector('[data-open-project-angebot="1"]').click()});
 await page.waitForTimeout(300);
 await szene("Erkannte Positionen","Nach der Erkennung stehen die Positionen bereit - prüfen, korrigieren, erst dann speichern.",
   {scrollZu:"#angebotEditModal .modalbox",warte:3400});
 await page.evaluate(()=>{
  angPositions=angPositions.concat([{pos:"4",description:"Kaminanschluss, Ort- und Seitenblech",quantity:1,unit:"Stk."}]);
  renderAngPositionsTable();
  if($("angRecognizeStatus"))$("angRecognizeStatus").textContent=
   "1 Position(en) aus dem PDF erkannt. Bitte auf Richtigkeit prüfen und bei Bedarf korrigieren, bevor du speicherst.";
 });
 await szene("Positionen aus dem PDF","Dieselbe Erkennung funktioniert auch direkt am hinterlegten Offert‑PDF.",
   {scrollZu:"#angebotEditModal .modalbox",warte:2800});
 await page.evaluate(()=>{$("angebotEditModal").hidden=true;$("projectCockpitModal").hidden=false});

 // ---------- Massaufnahme-Auswahl ----------
 await kapitel("Massaufnahme erfassen");
 await page.evaluate(()=>{$("projectCockpitModal").hidden=true;$("measTypeChooserModal").hidden=false});
 await szene("13 Massaufnahme‑Arten","Vom Einlaufblech über Rinne, Kehle und Mauerabdeckung bis zur freien Skizze - jede Art mit eigenem Fachformular.",
   {scrollZu:"#measTypeChooserModal .modalbox",warte:3600});

 // ---------- Einlaufblech gerade ----------
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
  ebaSetzeSchritt(1);
 });
 await szene("Beispiel: Einlaufblech gerade","Sechs Register führen durch die Aufnahme: Grunddaten, Geometrie, Stückliste, Zuschnitt, Ausmass, Kontrolle.",
   {scrollZu:"#einlaufblechAufnahme",warte:3400});
 await page.evaluate(()=>{
  const f=$("eba_material");
  if(f){f.value="1";f.dispatchEvent(new Event("change",{bubbles:true}))}
  if(typeof measStaerkeSetzen==="function")measStaerkeSetzen(0.7);
  if(typeof measStaerkeFelderSetzen==="function")measStaerkeFelderSetzen();
 });
 await szene("Material, Stärke, Rolle/Tafel","Die Materialstärke und die Wahl Rolle/Tafel hängen an jedem Materialfeld - vom Materialbestand vorgeschlagen.",
   {scrollZu:"#einlaufblechAufnahme",warte:3200});
 await page.evaluate(()=>ebaSetzeSchritt(2));
 await szene("Geometrie","Masse und Winkel der Blechform - ein Umrechner „Winkel im Meter“ hängt an jedem Winkelfeld.",
   {scrollZu:"#einlaufblechAufnahme",warte:3200});
 await page.evaluate(()=>ebaSetzeSchritt(3));
 await szene("Stückliste","Die einzelnen Bleche mit Länge, Stoss und Gehrung - hier entstehen die Positionen für den Zuschnitt.",
   {scrollZu:"#einlaufblechAufnahme",warte:3200});
 await page.evaluate(()=>ebaSetzeSchritt(4));
 await szene("Zuschnitt","Wie viele Abschnitte von der Rolle oder Tafel nötig sind, mit Materialbilanz und verwertbaren Reststücken.",
   {scrollZu:"#einlaufblechAufnahme",warte:3600});
 await page.evaluate(()=>ebaSetzeSchritt(5));
 await szene("Ausmass","Entsteht automatisch aus der Aufnahme - keine Mengen von Hand zweimal erfassen.",
   {scrollZu:"#einlaufblechAufnahme",warte:2800});
 await page.evaluate(()=>ebaSetzeSchritt(6));
 await szene("Kontrolle","Fehlende Angaben und Normhinweise auf einen Blick, bevor gespeichert wird.",
   {scrollZu:"#einlaufblechAufnahme",warte:2800});
 await szene("Fotos und Skizzen","In jedem Modul lassen sich Fotos und Handskizzen zur Massaufnahme ablegen.",
   {scrollZu:"#measMedienBereich",warte:2600});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 // ---------- Rinne halbrund ----------
 await kapitel("Weitere Massaufnahme‑Arten");
 await page.evaluate(()=>{
  newMeasurementWithType("rinne_halbrund");
  $("measurementEditModal").hidden=false; setMeasProjectField(1);
  $("measTitle").value="Rinne Nordseite";
  rinneA.material="1"; rinneA.groesse=333; rinneA.gesamtlaengeManuell_mm=18000;
  // Winkel und Stutzen sitzen am ENDE ihres eigenen Segments (js/28
  // raUebergangArt) - kein separates "verlauf"-Array.
  rinneA.segmente=[
   {laenge:6000,winkel:-90,stutzen:null},
   {laenge:7500,winkel:0,stutzen:{art:"einhaenge",durchmesser:"100",anzahl:1,fallrohr:"80",bemerkung:""}},
   {laenge:4500,winkel:0,stutzen:null}
  ];
  rinneA.rinnenboden={links:true,rechts:true};
  rinneA.halter={anzahl:22,abstand_mm:800,typ:""};
  renderRinneAufnahme(); raSetzeSchritt(2);
 });
 await szene("Rinne halbrund","Der Verlauf entsteht aus Abschnitten und Übergängen - Ecken, Stutzen und Rinnenböden inklusive.",
   {scrollZu:"#rinneAufnahme",warte:3400});
 await page.evaluate(()=>raSetzeSchritt(4));
 await szene("Rinne: Stückliste","Normlängen und Verschnitt werden direkt aus dem Verlauf berechnet.",
   {scrollZu:"#rinneAufnahme",warte:2800});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 await page.evaluate(()=>{
  newMeasurementWithType("kehle");
  $("measurementEditModal").hidden=false; setMeasProjectField(1);
  $("measTitle").value="Kehle Lukarne Ost";
  kehleA.material="1"; kehleA.abwicklung=500; kehleA.firstgehrung=true;
  kehleA.nh=42.5; kehleA.nl=23.5; kehleA.gl=1500;
  renderKehleAufnahme(); keaSetzeSchritt(2);
 });
 await szene("Kehle","Aus Dachneigung, Lukarnenneigung und Gefällslänge rechnet die App automatisch Winkel und Zuschnitt.",
   {scrollZu:"#kehleAufnahme",warte:3200});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 // ---------- Ausmass ----------
 await kapitel("Ausmass");
 await page.evaluate(()=>{$("amTypeChooserModal").hidden=false});
 await szene("Eigenständiges Ausmass","Für Arbeiten ohne eigene Massaufnahme - z. B. Blitzschutz - gibt es ein einfaches Ausmass‑Formular.",
   {scrollZu:"#amTypeChooserModal .modalbox",warte:2800});
 await page.evaluate(()=>{
  $("amTypeChooserModal").hidden=true;
  newAusmassWithType("blitzschutz_ausmass");
  $("ausmassEditModal").hidden=false; setAmProjectField(1);
  $("amTitle").value="Blitzschutz Hauptdach";
 });
 await szene("Ausmass Blitzschutz","Positionen von Hand erfassen, dem Projekt zugeordnet - genau wie jede andere Massaufnahme.",
   {scrollZu:"#ausmassEditModal .modalbox",warte:2800});
 await page.evaluate(()=>{$("ausmassEditModal").hidden=true});

 // ---------- Regierapport ----------
 await kapitel("Regierapport");
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
 await szene("Regierapport","Arbeitszeit und Material eines Tages, direkt einem Projekt zugeordnet.",
   {scrollZu:"#reportScreen",warte:3200});
 await page.evaluate(async()=>{currentProjectId=1; if(typeof rmatOeffnen==="function")await rmatOeffnen()});
 await szene("Material übernehmen","Material aus den Massaufnahmen des Projekts lässt sich direkt in den Rapport übernehmen - nichts wird zweimal erfasst.",
   {scrollZu:"#rmatModal .card",warte:3200});
 await page.evaluate(()=>{$("rmatModal").hidden=true;$("reportScreen").hidden=true;goToStart&&goToStart()});

 // ---------- Suche ----------
 await kapitel("Suche und Organisation");
 await page.evaluate(()=>{
  $("startScreen").hidden=true; $("globalSearchModal").hidden=false;
  $("globalSearchInput").value="Bahnhof";
  if(typeof debouncedGlobalSearch==="function")debouncedGlobalSearch("Bahnhof");
 });
 await szene("Globale Suche","Ein Suchbegriff findet Projekte, Massaufnahmen und Rapporte gleichzeitig.",
   {scrollZu:"#globalSearchModal .modalbox",warte:2600});
 await page.evaluate(()=>{$("globalSearchModal").hidden=true});

 await page.evaluate(()=>{
  const m=window.__demo.measurements.find(x=>x.id===12);
  openMeasurement(m);
 });
 await szene("Nächster Schritt","Ein Streifen oben in jeder Massaufnahme sagt jederzeit, was als Nächstes zu tun ist.",
   {scrollZu:"#measNaechsterSchritt",warte:2800});
 await szene("Workflow","Freigeben, Rüsten, Montieren - der ganze Ablauf einer Massaufnahme mit Zuständigkeiten.",
   {scrollZu:"#measWorkflowBereich",warte:3000});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});
 await page.evaluate(()=>{if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden()});
 await page.evaluate(()=>{if(typeof aufgabenOffen!=="undefined"){aufgabenOffen=true;renderAufgaben()}});
 await szene("Eigene Aufgaben","Auf der Startseite steht sofort, was auf die angemeldete Person persönlich wartet.",
   {scrollZu:"#aufgabenKarte",warte:2800});

 await page.evaluate(()=>{
  $("startScreen").hidden=true;
  const m=window.__demo.measurements.find(x=>x.id===14);
  openMeasurement(m);
 });
 await szene("Verfallene Freigabe","Ändert sich eine bereits freigegebene Massaufnahme wesentlich, verfällt die Freigabe automatisch - keine stille Weiterproduktion auf altem Stand.",
   {scrollZu:"#measWorkflowBereich",warte:3200});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});

 // ---------- Einstellungen ----------
 await kapitel("Einstellungen");
 await page.evaluate(()=>{openSettingsTo("general","")});
 await szene("Einstellungen: Allgemein","Firmendaten, Ansätze, Materialkatalog und Rollenbreiten des Blechlagers.",
   {scrollZu:"#settingsModal .modalbox",warte:3000});
 await page.evaluate(()=>{openSettingsTo("measurements","")});
 await szene("Einstellungen: Massaufnahmen","Zuschlagsmasse und Vorgaben je Massaufnahme‑Art, firmenweit einstellbar.",
   {scrollZu:"#settingsModal .modalbox",warte:2800});
 await page.evaluate(()=>{openSettingsTo("lager","");
   if(typeof renderLagerbestand==="function")renderLagerbestand();
   if(typeof renderRestLager==="function")renderRestLager();});
 await szene("Einstellungen: Lager","Materialbestand (Rolle oder Tafel) und das Reststücke‑Lager an einer Stelle.",
   {scrollZu:"#settingsModal .modalbox",warte:2800});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // ---------- Projektmodule ----------
 await page.evaluate(()=>{
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof openSettingsTo==="function")openSettingsTo("general","");
  if(typeof renderProjektmodule==="function")renderProjektmodule();
 });
 await szene("Erweiterter Ablauf","Zuschnitt, Reservierung, Werkstatt, Vorlagen, Versionierung - jedes Untermodul einzeln ein‑ oder ausschaltbar.",
   {scrollZu:"#pmListe",warte:3200});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // ---------- Material & Zuschnitt ----------
 await kapitel("Material und Zuschnitt");
 await page.evaluate(async()=>{
  cockpitProjectId=1;
  if(typeof reststuecke!=="undefined")reststuecke=window.__demo.reststuecke.slice();
  if(typeof openMaterialZuschnitt==="function")await openMaterialZuschnitt(1);
 });
 await szene("Zentrale Seite je Projekt","Material und Zuschnitt aller Massaufnahmen eines Projekts zusammengefasst - über Massaufnahmen hinweg optimiert.",
   {scrollZu:"#matZuModal .modalbox",warte:3600});
 await page.evaluate(async()=>{
  const d=$("matZuDetailsReservierung"); if(d)d.open=true;
  if(typeof resvCockpitLaden==="function")await resvCockpitLaden(1);
 });
 await szene("Materialreservierung","Was für dieses Projekt schon reserviert, zugeschnitten oder noch offen ist.",
   {scrollZu:"#cockpitReservierungCard",warte:3000});
 await page.evaluate(()=>{$("matZuModal").hidden=true});

 // ---------- Werkstatt ----------
 await kapitel("Werkstatt");
 await page.evaluate(async()=>{if(typeof werkstattOeffnen==="function")await werkstattOeffnen()});
 await szene("Werkstatt‑ und Rüstansicht","Alle zu rüstenden und zu montierenden Massaufnahmen, projektweise gruppiert.",
   {scrollZu:"#werkstattModal .card",warte:3200});
 await page.evaluate(async()=>{
  for(const k of [...document.querySelectorAll("#werkstattBody [data-werk-karte]")]){
   k.click();
   await new Promise(r=>setTimeout(r,250));
   if(k.closest(".werk-karte").querySelector(".zu-liste"))return;
   k.click();
   await new Promise(r=>setTimeout(r,150));
  }
 });
 await szene("Skizze, Grundriss, Abhaken","Ein Tipp auf eine Zeile öffnet Rüstskizze und Zuschnittliste - jedes Stück lässt sich direkt abhaken.",
   {scrollZu:'#werkstattModal .werk-karte:has(.zu-liste)',warte:3600});
 await page.evaluate(()=>{$("werkstattModal").hidden=true});

 // ---------- Fassungen ----------
 await kapitel("Nachvollziehbarkeit");
 await page.evaluate(async()=>{
  currentMeasurementId=11;
  if(typeof mwStandAusZeile==="function")
   mwStandAusZeile({id:11,workflow_status:"zu_ruesten",freigabe_verfallen:false,
     ruester_id:"u1",monteur_id:"u2",freigegeben_von:"u1",
     freigegeben_am:"2026-08-29T09:45:00Z",geruestet_von:null,geruestet_am:null,
     montiert_von:null,montiert_am:null});
  if(typeof verNeuLaden==="function")await verNeuLaden();
  $("measurementEditModal").hidden=false;
 });
 await szene("Freigegebene Fassungen","Jede freigegebene Fassung einer Massaufnahme bleibt erhalten und lässt sich vergleichen.",
   {scrollZu:"#measVersionenBereich",warte:3000});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});

 await page.evaluate(()=>{
  if(currentProfile)currentProfile.role="admin";
  if(typeof meineRechte!=="undefined")meineRechte.admin=true;
  if(typeof auKnopfAktualisieren==="function")auKnopfAktualisieren();
  if(typeof auOeffnen==="function")auOeffnen();
 });
 await szene("Firmenadmin‑Übersicht","Der Firmenadmin sieht alle Massaufnahmen aller Mitarbeitenden auf einen Blick.",
   {scrollZu:"#adminMeasModal .card",warte:3000});
 await page.evaluate(()=>{$("adminMeasModal").hidden=true});

 await page.evaluate(()=>{
  $("projectCockpitModal").hidden=false; cockpitProjectId=1;
  const kv=document.querySelector('#cockpitVerlaufCard .klapp-kopf[data-klapp]');
  if(kv&&!kv.closest(".klapp").classList.contains("open"))kv.click();
  if(typeof toggleProjectVerlaufBox==="function")
   toggleProjectVerlaufBox($("cockpitVerlaufBody"),$("cockpitVerlaufToggle"),1);
 });
 await szene("Änderungsverlauf","Jede wichtige Änderung an einem Projekt bleibt nachvollziehbar protokolliert.",
   {scrollZu:"#cockpitVerlaufBody",warte:2800});
 await page.evaluate(()=>{$("projectCockpitModal").hidden=true;$("startScreen").hidden=false});

 // ---------- Abschluss ----------
 await kapitel("Spengler‑DIGITAL");
 await szene("Offline‑fähig, für Handy und Tablet","Die App funktioniert auch ohne Verbindung und passt sich jeder Bildschirmgrösse an.",
   {scrollZu:"#startScreen",warte:3400});

 await page.evaluate(()=>{
  const bar=document.getElementById("__capbar"); if(bar)bar.remove();
  const kopf=document.getElementById("__capkopf"); if(kopf)kopf.remove();
 });
 await page.waitForTimeout(300);

 const videoPfad=page.video()?page.video().path():null;
 await kontext.close();
 await b.close();
 const endgueltig=videoPfad?await videoPfad:null;
 console.log("\nFehler auf der Seite: "+(fehler.length?fehler.join(" | "):"keine"));
 console.log("Video: "+(endgueltig||"(kein Pfad - recordVideo aktiv?)"));
})();
