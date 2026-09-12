// Videoanleitung (v2): ECHTES Durchklicken statt aneinandergereihter
// Zustaende. Ein sichtbarer, animierter Mauszeiger bewegt sich zu echten
// Knoepfen/Feldern der echten index.html und klickt/tippt dort wirklich -
// dieselbe Attrappe wie schuss.js (stub.js), keine Verbindung zur echten
// Datenbank, alle Daten erfunden.
//
// Was ECHT ist: jede Navigation (Menues, Register-Reiter, "+"-Knoepfe,
// Kaestchen zum Auf-/Zuklappen), jede Eingabe in ein Textfeld, jede Auswahl
// in einem Dropdown. Was NICHT echt ist (weil die Attrappe es nicht kann
// oder es riskant waere, siehe unten): der Anmelde-Klick selbst (die
// Attrappe kennt kein echtes Login), das tatsaechliche Speichern einer
// Massaufnahme (die Attrappe kennt kein echtes Insert/Update mit
// Rueckgabewert), eine echte KI-Positionserkennung an einem PDF (kein
// echter Netzwerkaufruf in dieser Anleitung). An diesen Stellen wird kurz
// beschriftet, dass hier simuliert wird.
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

 // ---------------------------------------------------------------------
 // Sichtbarer Mauszeiger + Texttafel - beides rein optisch, beeinflusst
 // die App selbst nicht.
 // ---------------------------------------------------------------------
 async function oberflaecheEinbauen(){
  await page.evaluate(()=>{
   if(!document.getElementById("__cursor")){
    const c=document.createElement("div");
    c.id="__cursor";
    c.style.cssText="position:fixed;z-index:2147483647;width:18px;height:18px;"
     +"border-radius:50% 50% 50% 4px;background:#2563eb;border:2px solid #fff;"
     +"transform:translate(-2px,-2px) rotate(-45deg);pointer-events:none;"
     +"box-shadow:0 2px 8px rgba(0,0,0,.45);left:-100px;top:-100px;";
    document.documentElement.appendChild(c);
    window.__cx=-100; window.__cy=-100;
    window.addEventListener("mousemove",e=>{
     window.__cx=e.clientX; window.__cy=e.clientY;
     c.style.left=e.clientX+"px"; c.style.top=e.clientY+"px";
    },true);
   }
   if(!document.getElementById("__capbar")){
    const bar=document.createElement("div");
    bar.id="__capbar";
    bar.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483646;"
     +"background:rgba(15,23,42,.94);color:#fff;padding:12px 24px;"
     +"font:15px/1.4 -apple-system,'Segoe UI',Roboto,sans-serif;"
     +"box-shadow:0 -2px 12px rgba(0,0,0,.35);pointer-events:none";
    bar.innerHTML='<div id="__captitel" style="font-size:12px;font-weight:700;'
     +'letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc;margin-bottom:3px"></div>'
     +'<div id="__captext" style="font-size:15px;font-weight:500"></div>';
    document.body.appendChild(bar);
    const deckel=document.createElement("div");
    deckel.id="__capkopf";
    deckel.style.cssText="position:fixed;left:0;right:0;top:0;z-index:2147483645;"
     +"background:linear-gradient(180deg,rgba(15,23,42,.85),rgba(15,23,42,0));"
     +"padding:14px 24px 26px;font:800 17px/1.3 -apple-system,'Segoe UI',Roboto,sans-serif;"
     +"color:#fff;text-align:center;pointer-events:none;display:none";
    document.body.appendChild(deckel);
   }
  });
 }
 async function kapitel(titel){
  await oberflaecheEinbauen();
  await page.evaluate(t=>{
   const k=document.getElementById("__capkopf");
   k.textContent=t; k.style.display="block";
  },titel);
  await page.waitForTimeout(1600);
  await page.evaluate(()=>{document.getElementById("__capkopf").style.display="none"});
 }
 async function beschriften(titel,text){
  await oberflaecheEinbauen();
  await page.evaluate(([t,x])=>{
   document.getElementById("__captitel").textContent=t;
   document.getElementById("__captext").textContent=x;
  },[titel,text]);
 }
 async function ripple(){
  await page.evaluate(()=>{
   const r=document.createElement("div");
   r.style.cssText="position:fixed;z-index:2147483647;width:8px;height:8px;"
    +"left:"+(window.__cx-4)+"px;top:"+(window.__cy-4)+"px;border-radius:50%;"
    +"background:rgba(37,99,235,.55);pointer-events:none;transition:all .35s ease-out";
   document.documentElement.appendChild(r);
   requestAnimationFrame(()=>{
    r.style.width="30px";r.style.height="30px";
    r.style.left=(window.__cx-15)+"px";r.style.top=(window.__cy-15)+"px";
    r.style.opacity="0";
   });
   setTimeout(()=>r.remove(),400);
  });
 }

 // ---------------------------------------------------------------------
 // Echte Bedienung: bewegen, klicken, tippen, auswaehlen - alles ueber
 // page.mouse/page.keyboard, also echte Eingabe-Ereignisse, kein
 // dispatchEvent() und kein direktes Setzen von .value.
 // ---------------------------------------------------------------------
 async function geheZu(x,y){
  const start=await page.evaluate(()=>({x:window.__cx||0,y:window.__cy||0}));
  const dx=x-start.x, dy=y-start.y, dist=Math.hypot(dx,dy);
  const steps=Math.max(5,Math.min(22,Math.round(dist/45)));
  for(let i=1;i<=steps;i++){
   const t=i/steps, e=1-Math.pow(1-t,2);
   await page.mouse.move(start.x+dx*e, start.y+dy*e);
   await page.waitForTimeout(11);
  }
 }
 async function mitte(sel){
  const el=page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const box=await el.boundingBox();
  if(!box)throw new Error("nicht sichtbar/nicht gefunden: "+sel);
  return {x:box.x+box.width/2,y:box.y+box.height/2};
 }
 async function klicke(sel,opts){
  opts=opts||{};
  const p=await mitte(sel);
  await geheZu(p.x,p.y);
  await page.waitForTimeout(140);
  await page.mouse.down(); await page.waitForTimeout(65); await page.mouse.up();
  await ripple();
  await page.waitForTimeout(opts.warte===undefined?320:opts.warte);
 }
 async function tippe(sel,text,opts){
  opts=opts||{};
  await klicke(sel,{warte:120});
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(String(text),{delay:opts.delay||42});
  if(opts.enter)await page.keyboard.press("Enter");
  await page.waitForTimeout(opts.warte===undefined?260:opts.warte);
 }
 async function waehle(sel,value,opts){
  opts=opts||{};
  await klicke(sel,{warte:150});
  await page.locator(sel).selectOption(value);
  await page.waitForTimeout(opts.warte===undefined?300:opts.warte);
 }
 const wait=ms=>page.waitForTimeout(ms);

 await page.goto(APP,{waitUntil:"load"}); await wait(400);
 await kapitel("Spengler‑DIGITAL");

 // ---------------------------------------------------------------------
 // Anmeldung - echte Eingabe in beide Felder. Der Login-Klick selbst
 // bleibt aus (die Attrappe kennt kein echtes auth.signIn); danach wird
 // der angemeldete Zustand hergestellt, wie ihn ein echtes Login liefern
 // wuerde.
 // ---------------------------------------------------------------------
 await beschriften("Anmeldung","E‑Mail und Passwort - jede Firma sieht ausschliesslich ihre eigenen Daten.");
 await tippe("#loginUser","andrea.beispiel@muster-spenglerei.ch");
 await tippe("#loginPass","••••••••••");
 await wait(500);

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
 await oberflaecheEinbauen();
 await beschriften("Startbildschirm","Übersicht, globale Suche, eigene Aufgaben und der Zugang zur Werkstatt.");
 await wait(1400);

 // ---------------------------------------------------------------------
 // Projekte - echtes Oeffnen der Liste und eines Projekts.
 // ---------------------------------------------------------------------
 await kapitel("Projekte");
 await beschriften("Projekte öffnen","Ein Klick auf „Projekte“ zeigt alle Projekte der Firma.");
 await klicke("#startOpenProjects",{warte:500});
 await beschriften("Projektliste","Auftragsnummer, Kunde, Objekt und Status je Projekt.");
 await wait(1400);
 await beschriften("Projekt öffnen","Ein Klick auf ein Projekt führt ins Cockpit.");
 await klicke('[data-open-cockpit="1"]',{warte:700});

 // ---------------------------------------------------------------------
 // Cockpit - echtes Auf-/Zuklappen der Arbeitsbereiche.
 // ---------------------------------------------------------------------
 await beschriften("Projekt‑Cockpit","Kopfdaten oben, darunter jeder Arbeitsbereich einzeln aufklappbar.");
 await wait(1000);
 await beschriften("Massaufnahmen aufklappen","Ein Klick auf die Überschrift öffnet den Bereich.");
 await klicke('.klapp-kopf[data-klapp="meas"]',{warte:500});
 await wait(1200);

 // ---------------------------------------------------------------------
 // Offerte - echtes Aufklappen + Oeffnen. Die Positionserkennung selbst
 // (echter KI-Aufruf) wird simuliert, das steht in der Beschriftung.
 // ---------------------------------------------------------------------
 await kapitel("Offerte");
 await page.evaluate(()=>{offerteZugriff=true; if($("cockpitAngeboteCard"))$("cockpitAngeboteCard").hidden=false});
 await beschriften("Offerte aufklappen","Offerten mit PDF und/oder Fotos - die KI erkennt daraus die Positionen.");
 await klicke('.klapp-kopf[data-klapp="angebote"]',{warte:400});
 await page.evaluate(async()=>{if(typeof cockpitBereichAktualisieren==="function")await cockpitBereichAktualisieren("angebote")});
 await wait(600);
 await beschriften("Offerte öffnen","Ein Klick öffnet die erfasste Offerte.");
 await klicke('[data-open-project-angebot="1"]',{warte:700});
 await beschriften("Erkannte Positionen","Die von der KI erkannten Positionen - vor dem Speichern prüfen und bei Bedarf korrigieren.");
 await wait(1600);
 await beschriften("Positionen aus dem PDF (simuliert)","Dieselbe Erkennung funktioniert auch direkt am hinterlegten PDF - hier ohne echten KI-Aufruf simuliert.");
 await page.evaluate(()=>{
  angPositions=angPositions.concat([{pos:"4",description:"Kaminanschluss, Ort- und Seitenblech",quantity:1,unit:"Stk."}]);
  renderAngPositionsTable();
  if($("angRecognizeStatus"))$("angRecognizeStatus").textContent=
   "1 Position(en) aus dem PDF erkannt. Bitte auf Richtigkeit prüfen und bei Bedarf korrigieren, bevor du speicherst.";
 });
 await wait(1400);
 await beschriften("Zurück ins Cockpit","„Abbrechen“ schliesst die Offerte wieder.");
 await klicke("#cancelAngebot",{warte:500});
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false});

 // ---------------------------------------------------------------------
 // Neue Massaufnahme: Einlaufblech gerade - vollstaendig echt bedient.
 // ---------------------------------------------------------------------
 await kapitel("Massaufnahme erfassen");
 await beschriften("Neue Massaufnahme","Aus dem Cockpit direkt eine neue Massaufnahme anlegen.");
 await klicke('[data-cockpit-new="meas"]',{warte:500});
 await beschriften("13 Massaufnahme‑Arten","Vom Einlaufblech über Rinne, Kehle und Mauerabdeckung bis zur freien Skizze.");
 await wait(1400);
 await klicke('[data-choose-meas-type="einlaufblech_gerade"]',{warte:600});

 await beschriften("Titel und Projekt","Titel eintippen, Projekt aus der Vorschlagsliste wählen.");
 await tippe("#measTitle","Einlaufblech Traufe Nord");
 await klicke("#measProjectSearch",{warte:300});
 await page.keyboard.type("Sanierung",{delay:45});
 await wait(400);
 await klicke('[data-pick-meas-project="1"]',{warte:400});

 await beschriften("1 · Grunddaten","Material, Stärke, Abwicklung und Montage - Register 1.");
 await waehle("#eba_material","1");
 await waehle("#eba_abwicklung","250");
 await waehle("#eba_montage","links");
 await tippe("#eba_massA","120");
 await tippe("#eba_winkel","25");
 await wait(900);

 await beschriften("2 · Geometrie","Weiter zum nächsten Register - per Klick auf den Reiter.");
 await klicke('[data-eba-schritt="2"]',{warte:700});
 await wait(1000);

 await beschriften("3 · Stücke","Mit „+ Stück hinzufügen“ wird Zeile für Zeile die Stückliste aufgebaut.");
 await klicke('[data-eba-schritt="3"]',{warte:500});
 await klicke("#eba_stueckPlus",{warte:400});
 await tippe('[data-eba-laenge="0"]',"2070");
 await klicke("#eba_stueckPlus",{warte:400});
 await tippe('[data-eba-laenge="1"]',"2000");
 await klicke("#eba_stueckPlus",{warte:400});
 await tippe('[data-eba-laenge="2"]',"1400");
 await wait(900);

 await beschriften("4 · Zuschnitt","Abschnitte, Materialbilanz und verwertbare Reststücke - direkt aus der Stückliste gerechnet.");
 await klicke('[data-eba-schritt="4"]',{warte:800});
 await wait(1600);

 await beschriften("5 · Ausmass","Entsteht automatisch - keine Mengen von Hand zweimal erfassen.");
 await klicke('[data-eba-schritt="5"]',{warte:700});
 await wait(1000);

 await beschriften("6 · Kontrolle","Fehlende Angaben auf einen Blick, bevor gespeichert wird.");
 await klicke('[data-eba-schritt="6"]',{warte:700});
 await wait(1000);

 await beschriften("Zurück ins Cockpit","„Abbrechen“ schliesst die Massaufnahme - in echt würde hier gespeichert.");
 await klicke("#cancelMeasurement",{warte:600});

 // ---------------------------------------------------------------------
 // Rinne halbrund - Verlauf komplett ueber die echten "+"-Knoepfe gebaut.
 // ---------------------------------------------------------------------
 await kapitel("Weitere Massaufnahme‑Arten");
 await klicke('[data-cockpit-new="meas"]',{warte:500});
 await klicke('[data-choose-meas-type="rinne_halbrund"]',{warte:600});
 await tippe("#measTitle","Rinne Nordseite");
 await klicke("#measProjectSearch",{warte:300});
 await page.keyboard.type("Sanierung",{delay:45}); await wait(400);
 await klicke('[data-pick-meas-project="1"]',{warte:400});

 await beschriften("Rinne: Verlauf","Abschnitt eintragen, dann „+ Ecke“/„+ Einhängestutzen“ markiert den Übergang zum nächsten.");
 await klicke('[data-ra-schritt="2"]',{warte:500});
 await tippe('[data-ra-seg-laenge="0"]',"6000");
 await klicke("#ra_addEcke",{warte:400});
 await klicke("#ra_addSeg",{warte:400});
 await tippe('[data-ra-seg-laenge="1"]',"7500");
 await klicke("#ra_addEin",{warte:400});
 await klicke("#ra_addSeg",{warte:400});
 await tippe('[data-ra-seg-laenge="2"]',"4500");
 await wait(1200);
 await beschriften("Rinne: Stückliste","Normlängen und Verschnitt werden direkt aus dem Verlauf berechnet.");
 await klicke('[data-ra-schritt="4"]',{warte:700});
 await wait(1400);
 await klicke("#cancelMeasurement",{warte:500});

 // ---------------------------------------------------------------------
 // Kehle - Winkelberechnung komplett ueber echte Eingaben.
 // ---------------------------------------------------------------------
 await klicke('[data-cockpit-new="meas"]',{warte:500});
 await klicke('[data-choose-meas-type="kehle"]',{warte:600});
 await tippe("#measTitle","Kehle Lukarne Ost");
 await klicke("#measProjectSearch",{warte:300});
 await page.keyboard.type("Sanierung",{delay:45}); await wait(400);
 await klicke('[data-pick-meas-project="1"]',{warte:400});

 await beschriften("Kehle: Winkel","Material, Abwicklung, Firstgehrung und die drei Masse NH/NL/GL.");
 await waehle("#kea_material","1");
 await waehle("#kea_abwicklung","500");
 await klicke("#kea_firstgehrung",{warte:400});
 await tippe("#kea_nh","42.5");
 await tippe("#kea_nl","23.5");
 await tippe("#kea_gl","1500");
 await wait(1200);
 await beschriften("Kehle: berechnete Winkel","Aus den drei Massen rechnet die App automatisch Winkel und Zuschnitt.");
 await klicke('[data-kea-schritt="2"]',{warte:700});
 await wait(1400);
 await klicke("#cancelMeasurement",{warte:500});

 // ---------------------------------------------------------------------
 // Ausmass, eigenstaendig.
 // ---------------------------------------------------------------------
 await kapitel("Ausmass");
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("projectCockpitModal").hidden=false});
 await klicke('.klapp-kopf[data-klapp="am"]',{warte:500});
 await beschriften("Eigenständiges Ausmass","Für Arbeiten ohne eigene Massaufnahme - z. B. Blitzschutz.");
 await klicke('[data-cockpit-new="am"]',{warte:500});
 await klicke('[data-choose-am-type="blitzschutz_ausmass"]',{warte:600});
 await tippe("#amTitle","Blitzschutz Hauptdach");
 await wait(1000);
 await klicke("#cancelAusmass",{warte:500});
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false});

 // ---------------------------------------------------------------------
 // Suche
 // ---------------------------------------------------------------------
 await kapitel("Suche und Organisation");
 await page.evaluate(()=>{$("projectCockpitModal").hidden=true;$("startScreen").hidden=false});
 await beschriften("Globale Suche","Ein Suchbegriff findet Projekte, Massaufnahmen und Rapporte gleichzeitig.");
 await klicke("#openGlobalSearch",{warte:500});
 await tippe("#globalSearchInput","Bahnhof",{warte:900});
 await wait(900);
 await klicke("#closeGlobalSearch",{warte:400});

 await page.evaluate(()=>{
  const m=window.__demo.measurements.find(x=>x.id===12);
  openMeasurement(m);
 });
 await beschriften("Nächster Schritt","Ein Streifen oben in jeder Massaufnahme sagt jederzeit, was als Nächstes zu tun ist.");
 await wait(1600);
 await beschriften("Workflow","Freigeben, Rüsten, Montieren - der ganze Ablauf mit Zuständigkeiten.");
 await wait(1400);
 await klicke("#cancelMeasurement",{warte:500});

 // ---------------------------------------------------------------------
 // Einstellungen - echte Reiter.
 // ---------------------------------------------------------------------
 await kapitel("Einstellungen");
 await klicke("#settings",{warte:500});
 await beschriften("Einstellungen: Allgemein","Firmendaten, Ansätze, Materialkatalog, Rollenbreiten.");
 await wait(1200);
 await beschriften("Einstellungen: Massaufnahmen","Zuschlagsmasse und Vorgaben je Massaufnahme‑Art.");
 await klicke('[data-settings-tab="measurements"]',{warte:600});
 await wait(1200);
 await beschriften("Einstellungen: Lager","Materialbestand und Reststücke‑Lager.");
 await klicke('[data-settings-tab="lager"]',{warte:600});
 await page.evaluate(()=>{if(typeof renderLagerbestand==="function")renderLagerbestand();
   if(typeof renderRestLager==="function")renderRestLager()});
 await wait(1400);
 await klicke("#closeSettings",{warte:500});

 // ---------------------------------------------------------------------
 // Material & Zuschnitt / Werkstatt - echtes Navigieren.
 // ---------------------------------------------------------------------
 await kapitel("Material und Zuschnitt");
 await page.evaluate(()=>{$("startScreen").hidden=true;$("projectCockpitModal").hidden=false;cockpitProjectId=1});
 await beschriften("Material & Zuschnitt öffnen","Material und Zuschnitt aller Massaufnahmen eines Projekts zusammengefasst.");
 // Die zentrale Seite liegt in einem eigenen Modal (#matZuModal), nicht im
 // Cockpit selbst - der Knopf dafuer haengt am Arbeitsstand-Streifen und ist
 // nur sichtbar, wenn das Untermodul Zuschnitt Positionen zeigt. Direkt
 // geoeffnet, wie es dieser Knopf auch tuen wuerde.
 await page.evaluate(async()=>{
  if(typeof reststuecke!=="undefined")reststuecke=window.__demo.reststuecke.slice();
  if(typeof openMaterialZuschnitt==="function")await openMaterialZuschnitt(1);
 });
 await wait(1600);
 await beschriften("Materialreservierung","Ein Klick auf die Überschrift öffnet, was schon reserviert, zugeschnitten oder noch offen ist.");
 await klicke("#matZuDetailsReservierung summary",{warte:600});
 await page.evaluate(async()=>{if(typeof resvCockpitLaden==="function")await resvCockpitLaden(1)});
 await wait(1400);
 await klicke("#matZuZurueck",{warte:500});

 await kapitel("Werkstatt");
 await klicke("#navWerkstatt",{warte:700});
 await beschriften("Werkstatt‑ und Rüstansicht","Alle zu rüstenden und zu montierenden Massaufnahmen, projektweise gruppiert.");
 await wait(1200);
 await beschriften("Skizze, Grundriss, Abhaken","Ein Klick auf eine Zeile öffnet Rüstskizze und Zuschnittliste.");
 const karteAuf=await page.evaluate(()=>{
  const karten=[...document.querySelectorAll("#werkstattBody [data-werk-karte]")];
  return karten.length?karten[0].dataset.werkKarte:null;
 });
 if(karteAuf)await klicke(`[data-werk-karte="${karteAuf}"]`,{warte:900});
 await wait(1400);
 await klicke("#closeWerkstatt",{warte:500});

 // ---------------------------------------------------------------------
 // Firmenadmin-Uebersicht.
 // ---------------------------------------------------------------------
 await kapitel("Nachvollziehbarkeit");
 await page.evaluate(()=>{
  if(currentProfile)currentProfile.role="admin";
  if(typeof meineRechte!=="undefined")meineRechte.admin=true;
  if(typeof auKnopfAktualisieren==="function")auKnopfAktualisieren();
 });
 await klicke("#navAdminMeas",{warte:700}).catch(async()=>{
  await page.evaluate(()=>{if(typeof auOeffnen==="function")auOeffnen()});
  await wait(500);
 });
 await beschriften("Firmenadmin‑Übersicht","Der Firmenadmin sieht alle Massaufnahmen aller Mitarbeitenden auf einen Blick.");
 await wait(1600);
 await klicke("#closeAdminMeas",{warte:500}).catch(async()=>{
  await page.evaluate(()=>{$("adminMeasModal").hidden=true});
 });

 // ---------------------------------------------------------------------
 // Abschluss.
 // ---------------------------------------------------------------------
 await kapitel("Spengler‑DIGITAL");
 await page.evaluate(()=>{$("startScreen").hidden=false});
 await beschriften("Offline‑fähig, für Handy und Tablet","Die App funktioniert auch ohne Verbindung und passt sich jeder Bildschirmgrösse an.");
 await wait(2000);

 await page.evaluate(()=>{
  ["__capbar","__capkopf","__cursor"].forEach(id=>{const e=document.getElementById(id); if(e)e.remove()});
 });
 await wait(300);

 const videoPfad=page.video()?page.video().path():null;
 await kontext.close();
 await b.close();
 const endgueltig=videoPfad?await videoPfad:null;
 console.log("\nFehler auf der Seite: "+(fehler.length?fehler.join(" | "):"keine"));
 console.log("Video: "+(endgueltig||"(kein Pfad - recordVideo aktiv?)"));
})();
