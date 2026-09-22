// Prueft das neue Aussehen der vier uebrigen grossen Formulare (v3.154):
// REGIERAPPORT, AUSMASS, OFFERTE und LEISTUNG.
//
// WAS HIER GEPRUEFT WIRD
//   A  Regierapport: Felder im Kopfteil sind fingergerecht (>=48px hoch,
//      >=16px Schrift - darunter zoomt iOS beim Hineintippen hinein), die
//      Felder IN DEN ZEILEN bleiben schmal. Der Rapport hat je Arbeits-
//      und Materialzeile sechs bis sieben Felder nebeneinander; 48px
//      wuerden aus jeder Zeile zwei machen.
//   B  Dasselbe fuer Ausmass, Offerte und Leistung. Die Leistung hat
//      keine Tabelle - dort gibt es nichts auszunehmen.
//   C  Die Knopf-Labels "Foto aufnehmen", "Aus Galerie waehlen" und
//      "PDF hochladen". Das sind Knoepfe, auch wenn sie als <label>
//      geschrieben sind (sie tragen ein verstecktes Dateifeld). In
//      v3.152 traf sie die label-Regel des Massaufnahme-Formulars und
//      machte sie KLEINER als vorher, waehrend jeder andere Knopf
//      groesser wurde. C1 haelt den Fehler fuer das Massaufnahme-
//      Formular fest, C2/C3 fuer die neuen vier.
//   D  Gegenprobe: in der klassischen Ansicht ist alles unveraendert -
//      dieselben Zahlen wie vor v3.154.
//   E  Die wichtigste Gegenprobe: DER AUSDRUCK. Der Regierapport ist
//      nicht nur eine Maske, er IST das gedruckte Dokument. Gemessen
//      wird deshalb mit Druck-Medium, in beiden Ansichten - jede
//      Eigenschaft muss Zeichen fuer Zeichen dieselbe sein.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Die Fachlogik dieser Formulare - Ansaetze, Betraege, Positionen,
//   Material. Daran wurde nichts geaendert; sie hat ihre eigenen
//   Pruefstaende (rapport-v3-16, ausmass, angebote, leistungen).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-formulare-optik-v3-154.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const zahl=s=>parseFloat(String(s||"0"));

// Alles, was gemessen wird - in einem Rutsch, damit neue und klassische
// Ansicht mit genau derselben Elle gemessen werden.
const messen=page=>page.evaluate(()=>{
 const g=(sel,eig)=>{const e=document.querySelector(sel);
  if(!e)return null; const s=getComputedStyle(e);
  return eig.reduce((o,k)=>(o[k]=s[k],o),{});};
 const FELD=["minHeight","fontSize","borderRadius"];
 const KNOPF=["minHeight","fontSize"];
 return {
  repFeld:      g('#reportScreen .grid input[type="date"]',FELD),
  repZeilenfeld:g('#reportScreen #workBody input[type="number"]',KNOPF),
  repZeilenwahl:g('#reportScreen #workBody select',KNOPF),
  repKnopf:     g('#reportScreen .bar > button#save',KNOPF),
  repInfo:      g('#reportScreen h2 .hilfe-knopf',KNOPF),
  repFoto:      g('#reportScreen .foto-quellen > label',KNOPF),
  repKarte:     g('#reportScreen .card',["borderRadius"]),
  repTitel:     g('#reportScreen .card > h2',["fontSize","borderBottomWidth","fontWeight"]),

  amFeld:       g('#ausmassEditModal .grid input[type="date"]',FELD),
  amZeilenfeld: g('#ausmassEditModal #amPositionsBody input',KNOPF),
  amFoto:       g('#ausmassEditModal .foto-quellen > label',KNOPF),

  angFeld:      g('#angebotEditModal .grid input[type="date"]',FELD),
  angZeilenfeld:g('#angebotEditModal #angPositionsBody input',KNOPF),
  // Genau das Label, das das PDF-Dateifeld traegt - nicht die Foto-Knoepfe.
  angPdf:       g('#angebotEditModal label.cockpit-upload:has(#angPdfInput)',KNOPF),

  leiFeld:      g('#leistungEditModal .grid input#leiMenge',FELD),
  leiWahl:      g('#leistungEditModal select#leiStatus',FELD),

  // Der in v3.152 eingeschleppte Fehler, hier als Vertrag festgehalten.
  measFoto:     g('#measurementEditModal .foto-quellen > label',KNOPF),
  measLabel:    g('#measurementEditModal .grid > div > label',["fontSize"])
 };
});

// Fuer den Ausdruck wird breiter gemessen: alles, was der Block von v3.154
// ueberhaupt anfassen koennte.
const messenDruck=page=>page.evaluate(()=>{
 const EIG=["minHeight","fontSize","borderRadius","textTransform","letterSpacing",
            "fontWeight","color","backgroundColor","padding","margin","display",
            "borderTopWidth","borderBottomWidth","boxShadow"];
 const raus={};
 ["#reportScreen .card","#reportScreen .card > h2","#reportScreen .grid > div > label",
  '#reportScreen .grid input[type="date"]','#reportScreen #workBody input[type="number"]',
  "#reportScreen #workBody select","#reportScreen #matBody input",
  "#reportScreen .report-head .logo","#reportScreen .sig-label"].forEach(sel=>{
  const e=document.querySelector(sel);
  if(!e){raus[sel]=null;return}
  const s=getComputedStyle(e);
  raus[sel]=EIG.reduce((o,k)=>(o[k]=s[k],o),{});
 });
 return raus;
});

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:430,height:1400},deviceScaleFactor:2});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Alle vier Formulare mit ihren ECHTEN Einstiegen oeffnen und mit je einer
 // Zeile fuellen - ohne Zeile gaebe es kein Feld in einer Tabelle, und die
 // wichtigste Gegenprobe liefe ins Leere.
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  companyName="Peter Künzi AG";
  allProjects=[{id:7,name:"Neubau",object:"Hofmattstrasse 4, 3400 Burgdorf",order_no:"26-011",archived:false}];
  aufgabenListe=[];
  settings.rates=[["Meister",145],["Spe1",110]];
  rateIds.length=0; rateIds.push(1,2);
  settings.employees=["Mike Ledermann"]; employeeIds.length=0; employeeIds.push("u1");
  settings.materials=[["101.10","Schraube 4.5x35","A2","Stk.",0.45]];
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
  showStart();

  // Regierapport: genau die drei Zeilen, mit denen js/04 ihn aufschlaegt.
  works.length=0; mats.length=0;
  works.push({date:"2026-09-22",desc:"Rinne montiert",employee:"Mike Ledermann",rateName:"Meister",hours:4});
  mats.push({date:"2026-09-22",no:"101.10",qty:24});
  renderProjectSelect(); renderMain();
  $("startScreen").hidden=true; $("reportScreen").hidden=false;

  cockpitProjectId=7;
  newAusmassWithType("offerte_erfassen");
  $("amAddPosition").click();
  newAngebot();
  $("angAddPosition").click();
  newLeistung();
  newMeasurementWithType("einlaufblech_gerade");
  // Alle vier sichtbar lassen: gemessen wird der Stil, nicht die
  // Reihenfolge der Dialoge.
  ["ausmassEditModal","angebotEditModal","leistungEditModal","measurementEditModal"]
   .forEach(id=>{if($(id))$(id).hidden=false});
 });
 await page.waitForTimeout(600);

 const neu=await messen(page);

 // ---- A  Regierapport ----------------------------------------------------
 p(neu.repFeld&&zahl(neu.repFeld.minHeight)>=48&&zahl(neu.repFeld.fontSize)>=16,
   "A1 Regierapport: Feld im Kopfteil mindestens 48px hoch und 16px gross",neu.repFeld);
 p(neu.repKarte&&zahl(neu.repKarte.borderRadius)>=12,
   "A2 Regierapport: Karten im neuen Rundungsmass",neu.repKarte);
 // Gross geschrieben waren die Titel schon immer (h2 in css/01-basis.css).
 // Unterscheidbar ist die neue Ansicht an der weggefallenen Unterstreichung
 // und der kleineren, fetteren Schrift - daran wird gemessen.
 p(neu.repTitel&&zahl(neu.repTitel.borderBottomWidth)===0&&zahl(neu.repTitel.fontSize)<=12,
   "A3 Regierapport: Abschnittstitel ohne Unterstreichung, kleiner und fetter",neu.repTitel);
 p(neu.repKnopf&&zahl(neu.repKnopf.minHeight)>=48,
   "A4 Regierapport: Speichern-Knopf mindestens 48px hoch",neu.repKnopf);
 // Die Gegenprobe zur Feldregel - hier ist v3.152 beim ersten Versuch
 // gescheitert, weil die allgemeine Regel die spezifischere war.
 p(neu.repZeilenfeld&&zahl(neu.repZeilenfeld.minHeight)<=40&&zahl(neu.repZeilenfeld.fontSize)<16,
   "A5 Regierapport: Feld IN der Arbeitszeile bleibt schmal",neu.repZeilenfeld);
 p(neu.repZeilenwahl&&zahl(neu.repZeilenwahl.minHeight)<=40,
   "A6 Regierapport: Auswahlfeld IN der Arbeitszeile bleibt schmal",neu.repZeilenwahl);
 p(neu.repInfo&&zahl(neu.repInfo.minHeight)<48,
   "A7 Regierapport: der runde Info-Knopf bleibt ein Zeichen, kein Bedienknopf",neu.repInfo);

 // ---- B  Ausmass, Offerte, Leistung --------------------------------------
 p(neu.amFeld&&zahl(neu.amFeld.minHeight)>=48&&zahl(neu.amFeld.fontSize)>=16,
   "B1 Ausmass: Feld im Kopfteil mindestens 48px hoch und 16px gross",neu.amFeld);
 p(neu.amZeilenfeld&&zahl(neu.amZeilenfeld.minHeight)<=40&&zahl(neu.amZeilenfeld.fontSize)<16,
   "B2 Ausmass: Feld IN der Positionszeile bleibt schmal",neu.amZeilenfeld);
 p(neu.angFeld&&zahl(neu.angFeld.minHeight)>=48&&zahl(neu.angFeld.fontSize)>=16,
   "B3 Offerte: Feld im Kopfteil mindestens 48px hoch und 16px gross",neu.angFeld);
 p(neu.angZeilenfeld&&zahl(neu.angZeilenfeld.minHeight)<=40&&zahl(neu.angZeilenfeld.fontSize)<16,
   "B4 Offerte: Feld IN der Positionszeile bleibt schmal",neu.angZeilenfeld);
 p(neu.leiFeld&&zahl(neu.leiFeld.minHeight)>=48&&zahl(neu.leiFeld.fontSize)>=16,
   "B5 Leistung: Feld mindestens 48px hoch und 16px gross",neu.leiFeld);
 p(neu.leiWahl&&zahl(neu.leiWahl.minHeight)>=48&&zahl(neu.leiWahl.fontSize)>=16,
   "B6 Leistung: Auswahlfeld ebenso - es hat keine Tabelle, die auszunehmen waere",neu.leiWahl);

 // ---- C  Die Knopf-Labels ------------------------------------------------
 p(neu.measFoto&&zahl(neu.measFoto.minHeight)>=48&&zahl(neu.measFoto.fontSize)>=15,
   "C1 Massaufnahme: 'Foto aufnehmen' ist ein Knopf, kein Kleingedrucktes",neu.measFoto);
 p(neu.repFoto&&zahl(neu.repFoto.minHeight)>=48&&zahl(neu.repFoto.fontSize)>=15,
   "C2 Regierapport: dasselbe fuer die beiden Foto-Knoepfe",neu.repFoto);
 p(neu.angPdf&&zahl(neu.angPdf.minHeight)>=48&&zahl(neu.angPdf.fontSize)>=15,
   "C3 Offerte: dasselbe fuer 'PDF hochladen'",neu.angPdf);
 // Und die Gegenprobe dazu: eine ECHTE Feldbeschriftung bleibt klein.
 p(neu.measLabel&&zahl(neu.measLabel.fontSize)<13,
   "C4 Eine echte Feldbeschriftung bleibt klein - die Ausnahme greift nicht zu weit",neu.measLabel);

 // ---- D  Gegenprobe klassische Ansicht -----------------------------------
 await page.evaluate(()=>a2Setzen(false));
 await page.waitForTimeout(300);
 const alt=await messen(page);
 p(alt.repFeld&&zahl(alt.repFeld.minHeight)<48,
   "D1 klassisch: das Rapportfeld hat seine alte Hoehe",alt.repFeld);
 p(alt.repTitel&&zahl(alt.repTitel.borderBottomWidth)>0&&zahl(alt.repTitel.fontSize)===13,
   "D2 klassisch: der Abschnittstitel behaelt Unterstreichung und 13px",alt.repTitel);
 p(alt.amFeld&&zahl(alt.amFeld.minHeight)<48&&alt.angFeld&&zahl(alt.angFeld.minHeight)<48
   &&alt.leiFeld&&zahl(alt.leiFeld.minHeight)<48,
   "D3 klassisch: Ausmass, Offerte und Leistung unveraendert",
   {am:alt.amFeld,ang:alt.angFeld,lei:alt.leiFeld});
 p(alt.repFoto&&alt.measFoto&&alt.repFoto.fontSize==="12px"&&alt.measFoto.fontSize==="12px",
   "D4 klassisch: die Foto-Knoepfe stehen auf ihren alten 12px",
   {rep:alt.repFoto,meas:alt.measFoto});
 p(alt.repZeilenfeld&&neu.repZeilenfeld
   &&alt.repZeilenfeld.minHeight!==undefined,
   "D5 klassisch: die Zeilenfelder sind ueberhaupt messbar",alt.repZeilenfeld);

 // ---- E  Der Ausdruck bleibt Zeichen fuer Zeichen ------------------------
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(200);
 const druckAlt=await messenDruck(page);      // klassische Ansicht, Druck
 await page.evaluate(()=>a2Setzen(true));
 await page.waitForTimeout(300);
 const druckNeu=await messenDruck(page);      // neue Ansicht, Druck
 const unterschiede=[];
 Object.keys(druckAlt).forEach(sel=>{
  const a=druckAlt[sel],n=druckNeu[sel];
  if(!a||!n){if(a!==n)unterschiede.push(sel+": einmal vorhanden, einmal nicht");return}
  Object.keys(a).forEach(k=>{if(a[k]!==n[k])unterschiede.push(sel+" "+k+": "+a[k]+" -> "+n[k])});
 });
 p(unterschiede.length===0,
   "E1 Der gedruckte Regierapport ist in beiden Ansichten derselbe",unterschiede);
 // Gegenprobe zur Gegenprobe: die Messung ist nicht leer, sie hat wirklich
 // etwas gesehen. Sonst waere E1 auch bei einem kaputten Waehler gruen.
 const gemessen=Object.keys(druckNeu).filter(k=>druckNeu[k]).length;
 p(gemessen>=8,"E2 Die Druckmessung hat alle Stellen wirklich gefunden",
   {gefunden:gemessen,leer:Object.keys(druckNeu).filter(k=>!druckNeu[k])});
 await page.emulateMedia({media:"screen"});

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler);

 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})();
