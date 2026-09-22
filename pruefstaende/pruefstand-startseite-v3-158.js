// Prueft die neue Startseite HEUTE (v3.158), gebaut nach dem Prototyp im
// Ordner prototype/ - aber mit den echten Daten der App.
//
// WAS HIER GEPRUEFT WIRD
//   A  Die Gliederung: Warnung, Meine Aufgaben, Werkstatt heute,
//      Anstehende Montage, Offene Projekte - in dieser Reihenfolge.
//   B  DIE ZAHLEN. Das ist der eigentliche Vertrag: jede Zahl der
//      Startseite muss mit dem uebereinstimmen, was die Funktionen der App
//      selbst ausrechnen (zeStandListe, js/56). Eine Startseite, die eigene
//      Zahlen rechnet, zeigt frueher oder spaeter andere als die Werkstatt.
//   C  KEINE EIGENE ABFRAGE. Gezaehlt wird, welche Tabellen die Seite
//      anfasst. Erlaubt sind genau die, die werkLaden() und zeLaden()
//      ohnehin lesen - nichts darueber hinaus.
//   D  Die Aufgaben als Zeilen, mit dem Schritt-Knopf nur dort, wo es einen
//      eigenen Schritt gibt. Gegenprobe: eine Freigabe-Aufgabe hat keinen.
//   E  Anstehende Montage zeigt kein erfundenes Datum. Die Datenbank fuehrt
//      keinen geplanten Montagetermin - der Prototyp zeigt "morgen", das
//      waere hier eine Behauptung. Gezeigt wird geruestet_am, eine echte
//      Spalte.
//   F  Ohne das Werkstatt-Modul verschwinden beide Werkstatt-Rubriken.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-startseite-v3-158.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const koepfe=page=>page.evaluate(()=>
 [...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf h2")]
  .map(h=>h.textContent.replace(/\s+/g," ").trim().replace(/ i$/,"")));

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,{id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee"}];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  blechRollenbreiten=[1000,670,500];
  settings.rates=[["Meister",98]]; settings.employees=["Mike Ledermann"];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  a2Setzen(true);
 });
 await page.waitForTimeout(400);
 await page.evaluate(()=>{if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden()});
 await page.waitForTimeout(1800);

 // ---- A  Die Gliederung ---------------------------------------------------
 let k=await koepfe(page);
 p(k.join("|")==="Meine Aufgaben|Werkstatt heute|Offene Projekte",
   "A1 die Rubriken stehen in der Reihenfolge des Prototyps",k);
 const warnung=await page.evaluate(()=>{
  const w=document.querySelector("#a2Inhalt .a2-h-warnung");
  if(!w)return null;
  return {text:w.textContent.replace(/\s+/g," ").trim(),
          knopf:!!w.querySelector("[data-a2-projekt]")};
 });
 p(warnung&&/erneut freigegeben/.test(warnung.text)&&warnung.knopf,
   "A2 die Warnung nennt den Grund und fuehrt ins Projekt",warnung);

 // ---- B  Die Zahlen stimmen mit der App ueberein --------------------------
 const zahlen=await page.evaluate(()=>{
  const gelesen=[...document.querySelectorAll("#a2Inhalt .a2-zahl b")].map(x=>Number(x.textContent));
  // Dieselbe Rechnung, aber direkt aus der Funktion der App.
  const eigen=zeStandListe(werkZeilen);
  const montagen=werkZeilen.filter(z=>z.workflow_status==="zu_montieren").length;
  return {gelesen,offen:eigen.offen,montagen,zeilen:werkZeilen.length};
 });
 p(zahlen.zeilen>0,"B1 es sind ueberhaupt Werkstattzeilen geladen",zahlen);
 p(zahlen.gelesen[0]===zahlen.offen,
   "B2 'Teile zu produzieren' ist genau zeStandListe(werkZeilen).offen",zahlen);
 p(zahlen.gelesen[2]===zahlen.montagen,
   "B3 'Montagen vorbereitet' zaehlt genau die Zeilen mit 'zu_montieren'",zahlen);
 // Der Fortschritt einer Projektkarte gegen dieselbe Funktion.
 const fort=await page.evaluate(()=>{
  const karte=document.querySelector('#a2Inhalt .a2-karte-klick .a2-fort');
  if(!karte)return null;
  const id=karte.closest("[data-a2-projekt]").getAttribute("data-a2-projekt");
  const eigen=zeStandListe(werkZeilen.filter(z=>String(z.project_id)===String(id)));
  return {text:karte.textContent.replace(/\s+/g," ").trim(),
          erwartet:eigen.erledigt+" von "+eigen.gesamt+" Stück"};
 });
 p(fort&&fort.text.indexOf(fort.erwartet)>=0,
   "B4 'Produziert x von y' auf der Projektkarte stammt aus derselben Rechnung",fort);

 // ---- C  Keine eigene Abfrage --------------------------------------------
 // Gezaehlt wird, welche Tabellen beim Auffrischen der Startseite gelesen
 // werden. Erlaubt ist nur, was werkLaden() und zeLaden() ohnehin lesen.
 const tabellen=await page.evaluate(async()=>{
  window.__tab=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{window.__tab.push(t);return alt(t)};
  a2WerkGeladen=false;
  await a2HeuteLaden(true);
  sb.from=alt;
  return [...new Set(window.__tab)].sort();
 });
 const erlaubt=["measurements","measurement_versionen","material_reservierungen","zuschnitt_erledigt"];
 p(tabellen.every(t=>erlaubt.indexOf(t)>=0),
   "C1 die Startseite fragt keine Tabelle, die nicht schon die Werkstatt liest",tabellen);
 p(tabellen.indexOf("measurements")>=0,
   "C2 Gegenprobe: sie hat ueberhaupt geladen",tabellen);

 // ---- D  Aufgaben als Zeilen ---------------------------------------------
 const auf=await page.evaluate(()=>{
  const reihen=[...document.querySelectorAll("#a2Inhalt .a2-zeile-reihe")];
  return reihen.map(r=>({
   art:r.querySelector("[data-a2-aufgabe]").getAttribute("data-a2-aufgabe"),
   titel:r.querySelector(".a2-zeile-text b").textContent.trim(),
   tat:!!r.querySelector(".a2-zeile-tat"),
   tatArt:r.querySelector(".a2-zeile-tat")?r.querySelector(".a2-zeile-tat").getAttribute("data-a2-aufgabe"):""
  }));
 });
 p(auf.length>0&&auf.every(a=>a.art==="oeffnen"),
   "D1 ein Tipp auf die Zeile oeffnet die Massaufnahme",auf);
 const ruesten=auf.find(a=>/rüsten|rusten/i.test(a.titel));
 p(!ruesten||(ruesten.tat&&ruesten.tatArt==="ruesten"),
   "D2 wo es einen eigenen Schritt gibt, steht er als Knopf daneben",ruesten);
 const freigabe=auf.find(a=>/freigeben/i.test(a.titel));
 p(!freigabe||!freigabe.tat,
   "D3 Gegenprobe: eine Freigabe hat keinen - sie geschieht im Formular",freigabe);

 // ---- E  Anstehende Montage ohne erfundenes Datum -------------------------
 await page.evaluate(()=>{
  werkZeilen[0].workflow_status="zu_montieren";
  werkZeilen[0].geruestet_am="2026-09-19";
  werkZeilen[0].monteur_id="u2";
  a2Zeichnen();
 });
 await page.waitForTimeout(400);
 k=await koepfe(page);
 p(k.indexOf("Anstehende Montage")>=0,"E1 die Rubrik erscheint, sobald etwas zu montieren ist",k);
 const m=await page.evaluate(()=>{
  const ab=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt")]
   .find(a=>/Anstehende Montage/.test(a.textContent));
  const z=ab&&ab.querySelector(".a2-zeile");
  return z?z.textContent.replace(/\s+/g," ").trim():"";
 });
 p(/gerüstet am 19\.9\.2026/.test(m)&&/Beat Krebs/.test(m),
   "E2 sie zeigt geruestet_am und den Monteur - beides echte Spalten",m);
 p(!/morgen|in \d+ Tagen/.test(m),
   "E3 und KEIN geplantes Datum - die Datenbank fuehrt keines",m);

 // ---- F  Ohne Werkstatt-Modul ---------------------------------------------
 await page.evaluate(()=>{
  pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                 werkstatt:false,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  a2Zeichnen();
 });
 await page.waitForTimeout(400);
 k=await koepfe(page);
 p(k.indexOf("Werkstatt heute")<0&&k.indexOf("Anstehende Montage")<0,
   "F1 ohne das Werkstatt-Modul fehlen beide Werkstatt-Rubriken",k);
 p(k.indexOf("Meine Aufgaben")>=0&&k.indexOf("Offene Projekte")>=0,
   "F2 Gegenprobe: der Rest der Seite steht unveraendert da",k);

 // ---- G  Die Kopfzeile ----------------------------------------------------
 const kopf=await page.evaluate(()=>$("a2Kopf").textContent.replace(/\s+/g," "));
 p(/(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), \d+\./.test(kopf),
   "G1 die Kopfzeile nennt den heutigen Tag",kopf);

 p(fehler.length===0,"H1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})();
