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
  // Ein plausibles Lager. Bewusst OHNE eine Rolle, die genau der Abwicklung
  // entspricht - sonst gewinnt sie immer, es faellt gar kein Laengsschnitt an,
  // und die Bilder zeigten eine Schnittfuge von null.
  blechRollenbreiten=[1000,670,500];
  // v3.26: Schnittfuge und Mindestlaenge fuer verwertbare Reste. Der Startwert
  // einer Firma ist 0 mm - hier bewusst 3 mm, damit die Bilder zeigen, was die
  // Materialbilanz tut. Erfunden wie alle Demodaten.
  blechSchnittfuge=3; restMindestlaenge=1000;
  // v3.27: die zweite Grenze und der Schalter. Der Startwert einer Firma ist
  // "Nein" - hier bewusst "Ja", damit die Bilder zeigen, was der Vorabzug tut.
  restMindestbreite=100; resteImZuschnitt=true;
  // v3.27: der Materialbestand. Er ist zugleich die Bruecke, ueber die die App
  // Staerke und Ausfuehrung eines Bedarfs kennt (Abschnitt 18). Erfunden.
  // v3.33: jede Zeile traegt ihre Form. Menge und Einheit gibt es seit v3.31
  // nicht mehr - sie stehen hier deshalb auch nicht.
  if(typeof lagerbestand!=="undefined")lagerbestand=[
   {id:1,material_id:1,artikel_id:3,bezeichnung:"Titanzinkblech blank",staerke_mm:0.7,
    ausfuehrung:"blank",form:"tafel",laenge_mm:2000,breite_mm:1000,notiz:null},
   {id:2,material_id:2,artikel_id:5,bezeichnung:"Kupferblech",staerke_mm:0.6,
    ausfuehrung:"blank",form:"tafel",laenge_mm:2000,breite_mm:1000,notiz:null},
   {id:3,material_id:3,artikel_id:null,bezeichnung:"Stahlblech verzinkt",staerke_mm:0.75,
    ausfuehrung:"verzinkt",form:"rolle",laenge_mm:null,breite_mm:null,notiz:"Restrolle"},
   // v3.31: eine zweite Staerke derselben Art - sonst zeigte das Bild der
   // Materialstaerke eine Auswahl mit genau einem Eintrag. v3.33: als Rolle,
   // damit im Bild beide Formen nebeneinander stehen.
   {id:4,material_id:1,artikel_id:4,bezeichnung:"Titanzinkblech blank",staerke_mm:0.8,
    ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null,notiz:null}];
  // Das Reststuecke-Lager fuellt sonst loadAllData(), das hier nicht laeuft.
  if(typeof reststuecke!=="undefined")reststuecke=window.__demo.reststuecke.slice();
  settings.rates=[["Meister",98],["Vorarbeiter",88],["Monteur",76],["Lernender",42]];
  // Demo-Katalog. Er ist bewusst nach dem Muster eines echten Katalogs
  // aufgebaut (Blech in m² mit der Dicke in der Dimension, Halbfabrikate in
  // Stk. mit der Groesse), damit die Bilder zeigen, was die App wirklich
  // vorschlaegt - ein Katalog mit fuenf Zeilen faende naturgemaess nichts.
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
  // Die Beispielfirma arbeitet mit dem erweiterten Ablauf (Abschnitt 10) -
  // sonst zeigte der Startbildschirm den Werkstatt-Knopf nicht, den der Text
  // daneben beschreibt.
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
 });

 await schuss("02-start","#startScreen");

 // ---------- Projekte ----------
 await page.evaluate(()=>{$("startScreen").hidden=true;$("projectsModal").hidden=false;renderProjectList()});
 await schuss("03-projekte","#projectsModal .modalbox",{warte:700});

 // ---------- Cockpit ----------
 await page.evaluate(()=>openProjectCockpit(1));
 await page.waitForTimeout(1200);
 await schuss("04-cockpit-kopf","#projectCockpitModal .card:nth-of-type(1)");
 // v3.11: zugeklappt - so startet das Cockpit seit dieser Version.
 await schuss("36-cockpit-zu","#projectCockpitModal .modalbox",{warte:400});
 // Fuer das naechste Bild einen Arbeitsbereich aufklappen.
 await page.evaluate(()=>{const k=document.querySelector('#cockpitMeasCard .klapp-kopf[data-klapp]');
   if(k&&!k.closest(".klapp").classList.contains("open"))k.click()});
 await page.waitForTimeout(300);
 await schuss("05-cockpit-arbeit","#cockpitWorkArea");

 // ---------- v3.34 Offerte (nur fuer freigeschaltete Benutzer sichtbar) --
 // offerteZugriff wird wie in js/63-angebote.js beschrieben ausschliesslich
 // ueber feature_access gesetzt - hier direkt zugewiesen (dasselbe Vorgehen
 // wie bei ebA.stuecke oben: Zustand direkt setzen statt den Netzwerkweg
 // ueber die Attrappe nachzubauen). loadProjectAngebote() selbst ist die
 // ECHTE Funktion und rendert die erfundene Demo-Offerte aus stub.js.
 await page.evaluate(async()=>{
  offerteZugriff=true;
  if($("cockpitAngeboteCard"))$("cockpitAngeboteCard").hidden=false;
  const k=document.querySelector('#cockpitAngeboteCard .klapp-kopf[data-klapp]');
  if(k&&!k.closest(".klapp").classList.contains("open"))k.click();
  // Der Weg, den die App auch selbst nimmt: cockpitBereichAktualisieren()
  // laedt (loadProjectAngebote) UND setzt die Anzahl im Kopf der Karte -
  // ein blosser Aufruf von loadProjectAngebote() allein liesse die "0"
  // aus der ersten Ladung (vor der Freigabe) stehen.
  await cockpitBereichAktualisieren("angebote");
 });
 await schuss("37-offerte-karte","#cockpitAngeboteCard",{warte:400});
 // Das Formular: eine bereits erkannte Offerte, wie sie nach "Alle Fotos
 // erkennen" und vor dem Speichern aussieht - die Positionen lassen sich an
 // dieser Stelle noch pruefen und von Hand korrigieren.
 await page.evaluate(()=>{
  $("cockpitAngeboteCard").querySelector('[data-open-project-angebot="1"]').click();
 });
 await page.waitForTimeout(300);
 await schuss("38-offerte-formular","#angebotEditModal .modalbox",{warte:400});
 // v3.38: das PDF der Offerte - unabhaengig von den Fotos, mit Oeffnen- und
 // Entfernen-Knopf. Die Demo-Offerte traegt seit stub.js bereits pdf_path/
 // pdf_name, openAngebot() hat renderAngPdfBereich() darueber schon gefuellt.
 await schuss("39-offerte-pdf","#angPdfMedienBereich",{warte:300});
 await page.evaluate(()=>{$("angebotEditModal").hidden=true;$("projectCockpitModal").hidden=false});

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
 // v3.31: die Materialstaerke. Sie haengt an JEDEM Materialfeld und kommt
 // ausschliesslich aus dem Materialbestand - im Registerschuss waere sie zu
 // klein, deshalb ein eigenes Bild.
 await page.evaluate(()=>{
  const f=$("eba_material");
  if(f){f.value="1";f.dispatchEvent(new Event("change",{bubbles:true}))}
  // Der change zeichnet das Register neu - das alte Element haengt danach
  // nicht mehr im Dokument. Deshalb neu holen, sonst faende die ID ein
  // verwaistes Element und das Bild waere leer.
  const g=$("eba_material");
  // Eine gewaehlte Staerke - der leere Zustand waere fuer das Bild wenig
  // aussagekraeftig. 0,7 mm steht im Demo-Materialbestand, erfunden ist sie
  // dort so wenig wie hier.
  if(typeof measStaerkeSetzen==="function")measStaerkeSetzen(0.7);
  if(typeof measStaerkeFelderSetzen==="function")measStaerkeFelderSetzen();
  // Material und Staerke stehen als zwei Zellen nebeneinander - fotografiert
  // wird ihr gemeinsamer Rahmen, damit die Herkunft der Auswahl zu sehen ist.
  const zelle=g?g.parentElement:null;
  const rahmen=zelle?zelle.parentElement:null;
  if(rahmen)rahmen.id="__staerkeSchuss";
 });
 await schuss("51-materialstaerke","#__staerkeSchuss",{warte:300,breite:700});
 // v3.33: die Wahl Rolle/Tafel steht direkt daneben. Fotografiert wird der
 // Block selbst - im Bild oben ginge er neben Material und Staerke unter.
 // Gezeigt wird der Zustand "automatisch": darunter steht dann, was der
 // Materialbestand fuer dieses Material sagt.
 await page.evaluate(()=>{
  const f=document.querySelector("#__staerkeSchuss [data-meas-zform-block]");
  if(f)f.id="__formSchuss";
 });
 await schuss("52-rolle-tafel","#__formSchuss",{warte:300,breite:620});
 await page.evaluate(()=>{
  ["__staerkeSchuss","__formSchuss"].forEach(i=>{const e=$(i); if(e)e.removeAttribute("id")});
 });
 await page.evaluate(()=>ebaSetzeSchritt(2));
 await schussEB("08-eb-2-geometrie");
 // v3.12: der Umrechner "Winkel im Meter" - er haengt an JEDEM Winkelfeld.
 await page.evaluate(()=>{
  const k=document.querySelector("#eba_winkel + [data-winkel-knopf]");
  if(k)k.click();
 });
 await page.waitForTimeout(300);
 await page.evaluate(()=>{const e=$("winkelEingabeAus");
  if(e){e.value="64.5";e.dispatchEvent(new Event("input",{bubbles:true}))}});
 await schuss("37-winkel","#winkelModal .card",{warte:500,breite:760});
 await page.evaluate(()=>{$("winkelModal").hidden=true});

 await page.evaluate(()=>ebaSetzeSchritt(3));
 await schussGeteilt("09-eb-3-stuecke","#einlaufblechAufnahme",0.52);
 await page.evaluate(()=>ebaSetzeSchritt(4));
 await schussEB("10-eb-4-zuschnitt");
 // v3.26: die Materialbilanz und der Reststuecke-Block als eigene Bilder -
 // im Registerschuss oben stehen sie ganz unten und waeren kaum lesbar.
 await schuss("47-materialbilanz","#einlaufblechAufnahme .zu-bilanz",{warte:200,breite:760});
 await schuss("48-reste","#einlaufblechAufnahme .rest-block",{warte:200,breite:760});
 // v3.29: der Dialog "Hier verwenden". Die Stuecke kommen aus dem eben
 // gezeichneten Plan - der Dialog selbst ist der echte.
 await page.evaluate(()=>{
  restStueckeJeMass.set(12,[{nr:1,laenge:2000,breite:250,merkmal:""},
                            {nr:2,laenge:1400,breite:250,merkmal:""},
                            {nr:3,laenge:2400,breite:250,merkmal:""}]);
  restVerwendenOeffnen(22,12);
 });
 await schuss("50-rest-verwenden","#restVerwendenModal .card",{warte:300,breite:760});
 await page.evaluate(()=>{if(typeof restVerwendenSchliessen==="function")restVerwendenSchliessen()});
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
 // v3.16: Material aus den Massaufnahmen des Objekts uebernehmen.
 await page.evaluate(async()=>{
  currentProjectId=1;
  if(typeof rmatOeffnen==="function")await rmatOeffnen();
 });
 await schuss("44-rmat-uebernehmen","#rmatModal .card",{warte:800,breite:900});
 await page.evaluate(()=>{$("rmatModal").hidden=true});
 await page.evaluate(()=>{$("reportScreen").hidden=true;goToStart&&goToStart()});

 // v3.16: die Materialliste in der Massaufnahme selbst.
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  if(typeof measRapportMaterialFuellen==="function")
   measRapportMaterialFuellen({rapport_material:[
    {no:"301.40",qty:"250",bem:"Schrauben 4.5 × 35"},
    {no:"305.10",qty:"3",bem:"Dichtband Rolle"}]});
  const b=$("measRapportMaterial"); if(b)b.hidden=false;
 });
 await schuss("43-meas-rapportmaterial","#measRapportMaterial",{warte:500,breite:900});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;goToStart&&goToStart()});

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
 // v3.27: das neue Register "Lager" - Materialbestand und Reststuecke.
 await page.evaluate(()=>{openSettingsTo("lager","");
   if(typeof renderLagerbestand==="function")renderLagerbestand();
   if(typeof renderRestLager==="function")renderRestLager();});
 await schuss("49-lager","#settingsModal .modalbox",{warte:700});
 await page.evaluate(()=>{openSettingsTo("protected","")});
 await schuss("24-einstellungen-geschuetzt","#settingsModal .modalbox",{warte:600});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // ---------- Arbeitsstatus und persoenliche Aufgaben (v3.05) ----------
 await page.evaluate(()=>{
  const m=window.__demo.measurements.find(x=>x.id===12);
  openMeasurement(m);
 });
 // v3.10: der Streifen ganz oben - er beantwortet die Frage "was jetzt?"
 await schuss("35-schritt","#measNaechsterSchritt",{warte:400,breite:760});
 await schuss("31-workflow","#measWorkflowBereich",{warte:500,breite:760});
 // v3.36: Geplant -> Ausgefuehrt je Position - unter dem Arbeitsstatus.
 await schuss("44-ausfuehrung","#measAusfuehrungBereich",{warte:500,breite:760});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});
 await page.evaluate(()=>{
  // Der angemeldete Benutzer ist u1 - er hat eine eigene Massaufnahme
  // freizugeben und ist bei der Rinne als Ruester eingeteilt.
  if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden();
 });
 // v3.07: Die Karte ist zugeklappt - fuer das Bild einmal so und einmal offen.
 await page.evaluate(()=>{if(typeof aufgabenOffen!=="undefined"){aufgabenOffen=false;renderAufgaben()}});
 await schuss("34-aufgaben-zu","#aufgabenKarte",{warte:500,breite:760});
 await page.evaluate(()=>{if(typeof aufgabenOffen!=="undefined"){aufgabenOffen=true;renderAufgaben()}});
 await schuss("32-aufgaben","#aufgabenKarte",{warte:700,breite:760});

 // ---------- Verfallene Freigabe (v3.06) ----------
 await page.evaluate(()=>{
  $("startScreen").hidden=true;
  const m=window.__demo.measurements.find(x=>x.id===14);
  openMeasurement(m);
 });
 await schuss("33-verfallen","#measWorkflowBereich",{warte:600,breite:760});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});

 // ---------- Firmenadmin-Uebersicht (v3.08) ----------
 await page.evaluate(()=>{
  if(currentProfile)currentProfile.role="admin";
  if(typeof meineRechte!=="undefined")meineRechte.admin=true;
  if(typeof auKnopfAktualisieren==="function")auKnopfAktualisieren();
  if(typeof auOeffnen==="function")auOeffnen();
 });
 await schuss("35-admin-uebersicht","#adminMeasModal .card",{warte:800,breite:900});
 await page.evaluate(()=>{$("adminMeasModal").hidden=true});

 // ---------- v3.09 Erweiterter Ablauf ----------
 // Einstellungen: Hauptschalter und Untermodule.
 await page.evaluate(()=>{
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof openSettingsTo==="function")openSettingsTo("general","");
  if(typeof renderProjektmodule==="function")renderProjektmodule();
 });
 await schuss("38-projektmodule","#pmListe",{warte:600,breite:900});
 await page.evaluate(()=>{$("settingsModal").hidden=true});

 // v3.15: die zentrale Seite MATERIAL & ZUSCHNITT.
 await page.evaluate(async()=>{
  cockpitProjectId=1;
  // Das Reststuecke-Lager wird sonst von loadAllData() gefuellt, das hier
  // nicht laeuft - deshalb aus denselben Demodaten setzen.
  if(typeof reststuecke!=="undefined")reststuecke=window.__demo.reststuecke.slice();
  if(typeof openMaterialZuschnitt==="function")await openMaterialZuschnitt(1);
 });
 await schuss("42-matzu","#matZuModal .modalbox",{warte:1200,breite:900});
 // Die ausfuehrliche Reservierung steht seit v3.15 zugeklappt darunter.
 await page.evaluate(async()=>{
  const d=$("matZuDetailsReservierung"); if(d)d.open=true;
  if(typeof resvCockpitLaden==="function")await resvCockpitLaden(1);
 });
 await schuss("39-reservierung","#cockpitReservierungCard",{warte:900,breite:900});
 // v3.13: die Sammelaktionen - Auswahl, Zahl am Knopf, Sperrzustand.
 await schuss("41-sammelaktion","#cockpitReservierungBody .resv-bulk",{warte:300,breite:900});
 // v3.18: der Aufraeum-Knopf fuer Zeilen aus einer frueheren Uebernahme.
 await schuss("45-aufraeumen","#cockpitReservierungBody",{warte:300,breite:900});
 await page.evaluate(()=>{$("matZuModal").hidden=true});

 // Werkstatt- und Ruestansicht.
 await page.evaluate(async()=>{
  if(typeof werkstattOeffnen==="function")await werkstattOeffnen();
 });
 await schuss("40-werkstatt","#werkstattModal .card",{warte:1000,breite:900});
 // v3.12: der rote Faden - naechster Schritt, Stationen, markierte Zeilen.
 await schuss("38-werkstatt-faden","#werkstattModal .werk-projekt",{warte:400,breite:900});
 // v3.30: die Werkstatt ist zuerst eine Liste - ein Tipp auf die Zeile
 // oeffnet Skizze, Grundriss und die abhakbare Zuschnittliste. Fuer das Bild
 // wird die erste Zeile geoeffnet, die danach wirklich eine Liste zeigt.
 await page.evaluate(async()=>{
  for(const k of [...document.querySelectorAll("#werkstattBody [data-werk-karte]")]){
   k.click();
   await new Promise(r=>setTimeout(r,250));
   if(k.closest(".werk-karte").querySelector(".zu-liste"))return;
   k.click();
   await new Promise(r=>setTimeout(r,150));
  }
 });
 await schuss("43-werkstatt-abhaken",'#werkstattModal .werk-karte:has(.zu-liste)',
   {warte:600,breite:900});
 // v3.23: die Ruestliste zum Ausdrucken. Sie entsteht in einem eigenen
 // Fenster - hier wird window.open abgefangen, das erzeugte Dokument in eine
 // frische Seite gelegt und fotografiert. Es ist also der echte Ausdruck.
 const rl=await page.evaluate(async()=>{
  let raus="";
  const echt=window.open;
  window.open=function(){const d={write(h){raus+=h},close(){}};
    return {document:d,focus(){},print(){},set onload(f){}}};
  const k=document.querySelector("#werkstattBody [data-werk-druck]");
  if(k)k.click();
  await new Promise(r=>setTimeout(r,600));
  window.open=echt;
  return raus;
 }).catch(()=>"");
 if(rl&&rl.length>400){
  const seite=await b.newPage({viewport:{width:900,height:900},deviceScaleFactor:2,
    locale:"de-CH",timezoneId:"Europe/Zurich"});
  await seite.setContent(rl,{waitUntil:"load"});
  await seite.waitForTimeout(400);
  const h=await seite.evaluate(()=>Math.ceil(document.body.scrollHeight));
  await seite.setViewportSize({width:900,height:Math.min(Math.max(h,500),3000)});
  await seite.waitForTimeout(200);
  const datei=path.join(AUS,"46-ruestliste.png");
  await seite.screenshot({path:datei});
  await seite.close();
  liste.push("46-ruestliste");
  console.log("  46-ruestliste  "+Math.round(fs.statSync(datei).size/1024)+" kB");
 } else console.log("  FEHLT: 46-ruestliste (kein Ausdruck entstanden)");

 await page.evaluate(()=>{$("werkstattModal").hidden=true});

 // Freigegebene Fassungen in der Massaufnahme.
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
 await schuss("41-fassungen","#measVersionenBereich",{warte:900,breite:900});
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});

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
  // v3.11: die Verlaufskarte ist klappbar und startet zugeklappt.
  const kv=document.querySelector('#cockpitVerlaufCard .klapp-kopf[data-klapp]');
  if(kv&&!kv.closest(".klapp").classList.contains("open"))kv.click();
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
