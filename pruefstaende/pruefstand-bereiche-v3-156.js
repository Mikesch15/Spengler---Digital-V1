// Prueft den Umbau von v3.156.
//
// WORUM ES GEHT
// Bis v3.155 oeffneten Werkstatt, Lager, Suche, Einstellungen, Feedback, die
// Admin-Uebersicht, die System-Administration, Material & Zuschnitt und das
// Cockpit als klassisches Vollbild UEBER der neuen Ansicht. Ein .modal ist
// position:fixed/inset:0/z-index 500 und legt sich damit ueber die Kopfzeile
// (40) und ueber die untere Leiste (50). Wer auf "Werkstatt" tippte, sah den
// alten Seitenaufbau - und die Leiste, ueber die er gekommen war, war weg.
// Gemeldet hat das der Anwender; nachgemessen wurde es mit derselben Methode,
// die hier steht: elementFromPoint auf die Mitte der Leiste.
//
// WAS HIER GEPRUEFT WIRD
//   A  Die BEREICHE bleiben im Rahmen: Leiste sichtbar und bedienbar, Kopf
//      nennt den Bereich, sein Eintrag ist markiert.
//
//      A6 war bis v3.161 die Gegenprobe dazu: ein ERFASSUNGSFORMULAR
//      bleibt Vollbild. Das war ausdrueckliche Absicht ("wer ein Mass
//      eintraegt, ist in einer Aufgabe"). Der Anwender hat das in v3.162
//      verworfen - "das darf niergends mehr so sein" -, und damit ist
//      diese Zusicherung nicht mehr der Vertrag. Sie wird deshalb
//      UMGESTELLT, nicht geloescht: A6 verlangt jetzt das Gegenteil,
//      naemlich dass auch das Formular die Leiste stehen laesst.
//      Die Aufgabe der alten Gegenprobe - zu verhindern, dass blind jedes
//      .modal umgestellt wird - uebernimmt A6b: ein kleiner DIALOG
//      (Typwahl) liegt weiterhin ueber allem. Ohne ihn waere A1 bis A6
//      auch dann gruen, wenn jemand pauschal jedes .modal anfasst.
//   B  "Neues Projekt" zeigt nur das Anlegen-Formular, nicht noch einmal
//      die Projektliste, von der man gerade kam. B2/B3 sind die
//      Gegenproben: der Archiv-Weg zeigt umgekehrt die Liste ohne das
//      Formular, und die klassische Ansicht zeigt unveraendert beides.
//   C  Der Regierapport ist ein eigenes Register und steht nicht mehr
//      unter "Mehr …".
//   D  Der Ausdruck zeigt keinen Anfasser mehr. Ein textarea zeichnet in
//      Chrome unten rechts zwei Schraegstriche zum Groesserziehen; im
//      gedruckten Regierapport standen sie in "Auftraggeber" und
//      "Objekt / Gebaeudeteil". D2 ist die Gegenprobe: am Bildschirm
//      bleibt der Anfasser, dort gehoert er hin.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-bereiche-v3-156.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Liegt etwas ueber der Mitte der unteren Leiste? Genau das war der Fehler.
const rahmen=page=>page.evaluate(()=>{
 const leiste=$("a2Leiste");
 const r=leiste?leiste.getBoundingClientRect():null;
 let verdeckt=false,durch="";
 if(r&&r.height>0){
  const oben=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
  if(oben&&!(oben===leiste||leiste.contains(oben))){
   verdeckt=true; const m=oben.closest(".modal"); durch=m?m.id:(oben.id||oben.tagName);
  }
 }
 const auf=[...document.querySelectorAll("#a2Leiste [data-a2-tab].ist-auf")]
   .map(b=>b.getAttribute("data-a2-tab"));
 const kopf=$("a2Kopf")?$("a2Kopf").textContent.replace(/\s+/g," ").trim():"";
 return {leisteDa:!!r&&r.height>0,verdeckt,durch,markiert:auf,kopf};
});
const tab=(page,k)=>page.evaluate(k=>{
 const b=[...document.querySelectorAll("#a2Leiste [data-a2-tab])".replace(")",""))]
   .find(x=>x.getAttribute("data-a2-tab")===k);
 if(b)b.click(); return !!b;
},k);

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
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  blechRollenbreiten=[1000,670,500];
  settings.rates=[["Meister",98]]; settings.employees=["Andrea Beispiel"];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
  // Ohne diese Zeile ist der Abschnitt selbst versteckt (er haengt an
  // lagerverwaltungZugriff, js/68) - F1 saehe dann null Abschnitte und
  // waere gruen, ohne etwas geprueft zu haben.
  if($("lagerverwaltungSection"))$("lagerverwaltungSection").hidden=false;
  a2Setzen(true);
 });
 await page.waitForTimeout(400);
 const aufraeumen=async()=>{
  await page.evaluate(()=>{
   document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
   if($("reportScreen"))$("reportScreen").hidden=true;
   $("startScreen").hidden=false;
   a2Zustand.bereich=null; a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  });
  await page.waitForTimeout(200);
 };

 // ---- A  Bereiche bleiben im Rahmen --------------------------------------
 await tab(page,"werkstatt"); await page.waitForTimeout(900);
 let z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt,"A1 Werkstatt: die untere Leiste bleibt sichtbar und bedienbar",z);
 p(z.markiert.length===1&&z.markiert[0]==="werkstatt",
   "A2 Werkstatt: ihr Eintrag ist markiert, nicht die Seite dahinter",z.markiert);
 p(/Werkstatt/.test(z.kopf),"A3 Werkstatt: die Kopfzeile nennt den Bereich",z.kopf);

 await tab(page,"lager"); await page.waitForTimeout(900);
 z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt&&z.markiert[0]==="lager"&&/Lager/.test(z.kopf),
   "A4 Lager: eigener Bereich, Leiste bleibt, Kopfzeile nennt ihn",z);
 // Das Lager ist ein Bereich, keine Einstellungsseite: die Registerleiste
 // der Einstellungen hat hier nichts zu suchen.
 const tabsWeg=await page.evaluate(()=>{
  const t=document.querySelector("#settingsModal .settings-tabs");
  return !t||getComputedStyle(t).display==="none";
 });
 p(tabsWeg,"A5 Lager: die Registerleiste der Einstellungen ist nicht zu sehen");
 // v3.157: und wirklich NUR die Lagerverwaltung. Im Lager-Register der
 // Einstellungen stehen drei Abschnitte; Materialbestand und Reststuecke
 // sind Firmeneinstellungen, nicht der taegliche Arbeitsplatz.
 const abschnitte=await page.evaluate(()=>
  [...document.querySelectorAll("#settingsModal [data-section]")]
   .filter(e=>getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0)
   .map(e=>e.getAttribute("data-section")));
 p(abschnitte.length===1&&abschnitte[0]==="lagerverwaltung",
   "A5b Lager: nur die Lagerverwaltung, nicht Materialbestand und Reststuecke",abschnitte);

 // v3.162: auch das Erfassungsformular laesst die Leiste stehen.
 await aufraeumen();
 await page.evaluate(()=>newMeasurementWithType("einlaufblech_gerade"));
 await page.waitForTimeout(700);
 z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt,
   "A6 auch das Massaufnahme-Formular laesst die Leiste sichtbar und bedienbar",z);

 // A6b ist die neue Gegenprobe an der Stelle der alten: ein DIALOG liegt
 // weiterhin ueber allem. Er muss das - wer eine Art auswaehlt, darf
 // daneben nicht die halbe Navigation bedienen koennen.
 await page.evaluate(()=>{
  if($("measTypeChooserModal"))$("measTypeChooserModal").hidden=false;
 });
 await page.waitForTimeout(300);
 z=await rahmen(page);
 p(z.verdeckt&&z.durch==="measTypeChooserModal",
   "A6b Gegenprobe: ein Dialog liegt weiterhin ueber der Leiste",z);
 await page.evaluate(()=>{
  if($("measTypeChooserModal"))$("measTypeChooserModal").hidden=true;
 });

 // Ein Tipp auf einen anderen Eintrag schliesst den offenen Bereich.
 await aufraeumen();
 await tab(page,"werkstatt"); await page.waitForTimeout(800);
 await tab(page,"heute"); await page.waitForTimeout(600);
 const zu=await page.evaluate(()=>({
  werkstattZu:$("werkstattModal").hidden,
  bereich:a2Zustand.bereich,seite:a2Zustand.seite}));
 p(zu.werkstattZu&&!zu.bereich&&zu.seite==="heute",
   "A7 ein Tipp auf einen anderen Eintrag schliesst den Bereich",zu);

 // ---- B  Neues Projekt zeigt nur das Formular ----------------------------
 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="neuesprojekt"]');if(k)k.click()});
 await page.waitForTimeout(800);
 const sicht=s=>page.evaluate(x=>{const e=document.querySelector(x);
  return !!e&&getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0},s);
 const anlegenDa=await sicht("#projectCreateBox"), listeDa=await sicht("#projectList");
 p(anlegenDa&&!listeDa,"B1 Neues Projekt: das Anlegen-Formular steht allein",
   {anlegen:anlegenDa,liste:listeDa});

 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="projektarchiv"]');if(k)k.click()});
 await page.waitForTimeout(800);
 const a2=await sicht("#projectCreateBox"), l2=await sicht("#projectList");
 p(!a2&&l2,"B2 Gegenprobe Archiv: dort steht die Liste ohne das Anlegen-Formular",
   {anlegen:a2,liste:l2});

 await aufraeumen();
 await page.evaluate(()=>{a2Setzen(false);$("startOpenProjects").click()});
 await page.waitForTimeout(800);
 const a3=await sicht("#projectCreateBox"), l3=await sicht("#projectList");
 p(a3&&l3,"B3 Gegenprobe klassisch: derselbe Schirm zeigt unveraendert beides",
   {anlegen:a3,liste:l3});
 await page.evaluate(()=>{a2Setzen(true)});
 await aufraeumen();

 // ---- C  Regierapport ist ein eigenes Register ---------------------------
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const zeile=document.querySelector("[data-a2-projekt]");if(zeile)zeile.click()});
 await page.waitForTimeout(1500);
 const reg=await page.evaluate(()=>[...document.querySelectorAll('#a2Inhalt [data-a2-reg]')]
   .map(x=>x.getAttribute("data-a2-reg")));
 p(reg.indexOf("rapport")>=0,"C1 der Regierapport ist ein eigenes Register",reg);
 // UMGESTELLT in v3.203. Bis dahin lautete die Zusicherung: "steht VOR
 // 'Mehr …', nicht darin". Den Sammelkuebel "Mehr …" gibt es auf der
 // Projektseite nicht mehr - seine Inhalte haben eigene Register bekommen
 // (Offerte, Dateien), weil zwei verschiedene Dinge gleich hiessen.
 // Der Vertrag wird dadurch STRENGER statt schwaecher: der Rapport steht
 // nicht mehr bloss vor dem Kuebel, es gibt gar keinen mehr, in dem er
 // verschwinden koennte. Die alte Fassung waere heute auch nicht mehr
 // aussagekraeftig - indexOf("mehr") ist -1, "rapport" steht davor, sie
 // haette sich selbst gruen gemeldet, ohne etwas zu pruefen.
 p(reg.indexOf("mehr")<0,
   "C2 auf der Projektseite gibt es keinen Sammelkuebel 'Mehr …' mehr",reg);
 const regNamen=await page.evaluate(()=>
  [...document.querySelectorAll('#a2Inhalt [data-a2-reg]')]
   .map(x=>String(x.textContent||"").trim().toLowerCase()));
 p(!regNamen.some(n=>n.indexOf("mehr")>=0),
   "C2b und auch keines, das so heisst - der Kuebel kommt nicht unter anderem Schluessel zurueck",regNamen);
 // C3 prueft weiter dasselbe wie bisher, nur nicht mehr an einem einzigen
 // Register: in KEINEM anderen Register darf die Rapportliste oder sein
 // Anlegen-Knopf stehen, sonst haette man ihn zweimal. Gesucht wird der
 // Knopf, nicht das Wort: "Regierapport" steht auch in der Registerleiste
 // darueber, die zu #a2Inhalt gehoert.
 const fremd=[];
 for(const k of reg){
  if(k==="rapport")continue;
  await page.evaluate(x=>{
   const b=document.querySelector('#a2Inhalt [data-a2-reg="'+x+'"]'); if(b)b.click();
  },k);
  await page.waitForTimeout(300);
  const da=await page.evaluate(()=>
   !!document.querySelector('#a2Inhalt [data-a2-tu="neuerrapport"]')
   ||!!document.querySelector('#a2Inhalt [data-a2-rep]'));
  if(da)fremd.push(k);
 }
 p(fremd.length===0,
   "C3 in keinem anderen Register steht seine Liste oder sein Anlegen-Knopf",fremd);
 // Gegenprobe: im Register "rapport" stehen beide sehr wohl - sonst wuerde
 // C3 auch dann gruen, wenn es den Rapport ueberhaupt nicht mehr gaebe.
 await page.evaluate(()=>{
  const b=document.querySelector('#a2Inhalt [data-a2-reg="rapport"]'); if(b)b.click();
 });
 await page.waitForTimeout(300);
 const imReg=await page.evaluate(()=>({
  knopf:!!document.querySelector('#a2Inhalt [data-a2-tu="neuerrapport"]'),
  liste:!!document.querySelector('#a2Inhalt [data-a2-rep]')
 }));
 p(imReg.knopf&&imReg.liste,
   "C3b Gegenprobe: im Register Rapport stehen Liste und Anlegen-Knopf",imReg);

 // ---- D  Der Ausdruck ohne Anfasser --------------------------------------
 await aufraeumen();
 const anfasser=()=>page.evaluate(()=>{
  const e=document.querySelector("#reportScreen textarea#customer");
  return e?getComputedStyle(e).resize:null;
 });
 await page.evaluate(()=>{$("startScreen").hidden=true;$("reportScreen").hidden=false});
 await page.waitForTimeout(300);
 const amSchirm=await anfasser();
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(250);
 const beimDruck=await anfasser();
 await page.emulateMedia({media:"screen"});
 p(beimDruck==="none","D1 im Ausdruck hat das Textfeld keinen Anfasser mehr",
   {druck:beimDruck});
 p(amSchirm&&amSchirm!=="none",
   "D2 Gegenprobe: am Bildschirm bleibt er - dort gehoert er hin",{schirm:amSchirm});

 // ---- F  Anleitung oeffnet die Anleitung ---------------------------------
 // Bis v3.156 fuehrten "Einstellungen" und "Anleitung" unter "Mehr" beide
 // in die Einstellungen - zwei Eintraege, ein Ziel.
 await aufraeumen();
 await page.evaluate(()=>{a2Zustand.seite="mehr";a2Zeichnen()});
 await page.waitForTimeout(300);
 let neuesFenster=null;
 page.on("popup",x=>{neuesFenster=x.url()});
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="anleitung"]');if(k)k.click()});
 await page.waitForTimeout(900);
 const nachAnleitung=await page.evaluate(()=>!$("settingsModal").hidden);
 p(!nachAnleitung,"F1 'Anleitung' oeffnet nicht die Einstellungen",{settingsOffen:nachAnleitung});
 p(!!neuesFenster&&/Anleitung-v[0-9.]+\.pdf$/.test(neuesFenster),
   "F2 sondern die Anleitung selbst",{fenster:neuesFenster});
 // Gegenprobe: "Einstellungen" fuehrt weiterhin in die Einstellungen.
 await aufraeumen();
 await page.evaluate(()=>{a2Zustand.seite="mehr";a2Zeichnen()});
 await page.waitForTimeout(250);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="einstell"]');if(k)k.click()});
 await page.waitForTimeout(800);
 p(await page.evaluate(()=>!$("settingsModal").hidden),
   "F3 Gegenprobe: 'Einstellungen' tut es weiterhin");

 // ---- G  Das Register heisst Massaufnahme --------------------------------
 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const z=document.querySelector("[data-a2-projekt]");if(z)z.click()});
 await page.waitForTimeout(1500);
 const namen=await page.evaluate(()=>
  [...document.querySelectorAll('#a2Inhalt [data-a2-reg]')].map(x=>x.textContent.trim()));
 p(namen.indexOf("Massaufnahme")>=0&&namen.indexOf("Aufmass")<0,
   "G1 das Register heisst Massaufnahme, nicht mehr Aufmass",namen);
 // Der SCHLUESSEL bleibt "aufmass" - er steht im Zustand und in anderen
 // Pruefstaenden. Nur die Beschriftung hat sich geaendert.
 p(await page.evaluate(()=>!!document.querySelector('[data-a2-reg="aufmass"]')),
   "G2 der Schluessel dahinter ist unveraendert geblieben");

 // ---- H  Kompakter: Aufgaben und Zeilen ----------------------------------
 // "die offenen aufgaben sollten kleinere felder sein und nicht so wuchtig",
 // "verkleinere auch die buttons der einzelnen massaufnahmen".
 // Gemessen wird nicht eine gewuenschte Zahl, sondern das, was wuchtig
 // WIRKTE: ein blauer Balken quer ueber die ganze Aufgabenkarte.
 await aufraeumen();
 await page.evaluate(()=>{if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden()});
 await page.waitForTimeout(900);
 // UMGESTELLT in v3.158: eine Aufgabe ist keine Karte mehr, sondern eine
 // Zeile (.a2-zeile-reihe) mit dem Schritt-Knopf daneben. Gemessen wird
 // dasselbe wie vorher - dass der Knopf nicht die ganze Breite frisst -,
 // nur an der Stelle, an der die Aufgabe heute steht.
 const h=await page.evaluate(()=>{
  const reihe=[...document.querySelectorAll("#a2Inhalt .a2-zeile-reihe")]
   .find(r=>r.querySelector(".a2-zeile-tat"));
  const knopf=reihe&&reihe.querySelector(".a2-zeile-tat");
  const zeile=document.querySelector("#a2Inhalt .a2-zeile");
  return {reiheBreit:reihe?Math.round(reihe.getBoundingClientRect().width):0,
          knopfBreit:knopf?Math.round(knopf.getBoundingClientRect().width):0,
          knopfHoch:knopf?Math.round(knopf.getBoundingClientRect().height):0,
          zeileHoch:zeile?Math.round(zeile.getBoundingClientRect().height):0};
 });
 p(h.knopfBreit>0&&h.knopfBreit<h.reiheBreit*0.6,
   "H1 der Schritt-Knopf einer Aufgabe nimmt der Zeile nicht die Breite",h);
 // Die Zeile der einzelnen Massaufnahmen steht auf der PROJEKTSEITE, nicht
 // auf Heute. Auf Heute traegt dieselbe Klasse die Projektzeile mit
 // Status-Marke, die naturgemaess hoeher ist - daran gemessen zu haben war
 // der erste Fehlschlag dieser Zusicherung.
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const z=document.querySelector("[data-a2-projekt]");if(z)z.click()});
 await page.waitForTimeout(1500);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-reg="aufmass"]');if(k)k.click()});
 await page.waitForTimeout(500);
 const hm=await page.evaluate(()=>{
  const z=document.querySelector("#a2Inhalt .a2-zeile");
  return z?Math.round(z.getBoundingClientRect().height):0;
 });
 p(hm>0&&hm<=52,"H2 die Zeilen der einzelnen Massaufnahmen sind kompakt",{zeile:hm});
 // Gegenprobe zur Verkleinerung: treffbar muss alles bleiben. Unter 30px
 // trifft man auf dem Dach nichts mehr - dann waere aus "kleiner" ein
 // eigener Fehler geworden.
 p(h.knopfHoch>=30,"H3 Gegenprobe: die Knoepfe bleiben mit dem Finger treffbar",h);

 p(fehler.length===0,"E1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})();
