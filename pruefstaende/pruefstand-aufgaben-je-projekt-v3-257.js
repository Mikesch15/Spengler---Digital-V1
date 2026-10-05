// Prueft v3.257: die Tagesaufgaben stehen auf der Startseite je Projekt
// zusammen, und die Projekte lassen sich zuklappen.
//
// Ansage des Anwenders: "Fasse die tagesaufgaben auf der startseite pro
// projekt zusammen und mach die projekte zuklappbar."
//
// Bis v3.256 stand jede Aufgabe einzeln untereinander. Wer morgens drei
// Baustellen hat, las sieben Zeilen und musste sich selbst zusammenreimen,
// was zum selben Objekt gehoert.
//
// WAS HIER GEPRUEFT WIRD - und warum gerade das:
//   A  Gruppiert wird nach Projekt, und der Kopf sagt, was man zum
//      Entscheiden braucht: Projekt, Anzahl, ob etwas dringend ist.
//   B  DIE REIHENFOLGE BLEIBT. js/45 sortiert rot zuerst, dann nach Datum.
//      Ein Projekt steht dort, wo seine dringendste Aufgabe stuende. Das ist
//      die Zusage, die beim Gruppieren am leichtesten kaputtgeht - und
//      niemand merkt es, ausser der Dringendste wird uebersehen.
//   C  Aufklappen und Zuklappen, je Projekt, gemerkt ueber das Neuladen.
//      Gemerkt wird seit v3.258 das AUFGEKLAPPTE - siehe D.
//   D  Voreingestellt ist ZUGEKLAPPT (v3.258). Ansage des Anwenders: "Drehe
//      es um, so dad zugeklappt standart ist."
//      In v3.257 war es umgekehrt und gemessen begruendet (7 offene Aufgaben
//      auf 4 Projekte, im Schnitt 1,8 - da verbirgt Zuklappen wenig). Die
//      Messung stimmt weiterhin; sie beantwortet aber nur, wie VIEL auf dem
//      Schirm steht, nicht, wie der Betrieb morgens arbeiten will. Das
//      entscheidet der Anwender.
//      Mit der Vorgabe dreht sich auch das GEMERKTE: bei "zugeklappt ist
//      Standard" muss gemerkt werden, was jemand GEOEFFNET hat - das
//      Zugeklappte zu merken waere wirkungslos, es ist ja ohnehin alles zu.
//      C9 haelt fest, dass die alte Liste dabei weggeraeumt wird: sie steht
//      in jedem Browser, der v3.257 geladen hat, und bedeutet das Gegenteil.
//   E  "Alle zuklappen" und zurueck.
//   F  GEGENPROBE, die wichtigste: die Aufgaben selbst sind unveraendert.
//      Dieselben Knoepfe, dieselben data-Marken, derselbe Weg nach js/45 -
//      hier wird gruppiert, nicht nachgebaut. Und der Tipp auf den Kopf
//      klappt, er oeffnet KEINE Aufgabe.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-aufgaben-je-projekt-v3-257.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Der Stand: drei Projekte, sieben Aufgaben - wie im Betrieb gemessen.
 // Projekt B traegt die DRINGENDE (erneut_freigeben, rot) und steht deshalb
 // zuoberst, obwohl es in allProjects an zweiter Stelle kommt.
 const aufbauen=()=>page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  allProjects=[
   {id:"pA",name:"Schopf Worb",object:"Enggisteinstrasse 4",archived:false,status:"offen",created_by:"u1",zugeteilt_an:["u1"]},
   {id:"pB",name:"Dach Nord",object:"Bernstrasse 12",archived:false,status:"offen",created_by:"u1",zugeteilt_an:["u1"]},
   {id:"pC",name:"Kamin Ittigen",object:"Ey 3",archived:false,status:"offen",created_by:"u1",zugeteilt_an:["u1"]}];
  // Dieselbe Form wie js/45 sie liefert, in DERSELBEN Sortierung
  // (rot zuerst, dann nach Datum) - hier wird nicht neu sortiert.
  aufgabenListe=[
   {art:"erneut_freigeben",m:{id:"m1",project_id:"pB",title:"Rinne",date:"2026-10-02"}},
   {art:"ruesten",        m:{id:"m2",project_id:"pA",title:"Einfassung",date:"2026-10-04"}},
   {art:"freigeben",      m:{id:"m3",project_id:"pB",title:"Kehle",date:"2026-10-03"}},
   {art:"freigeben",      m:{id:"m4",project_id:"pA",title:"Lukarne",date:"2026-10-01"}},
   {art:"zuweisen",       m:{id:"m5",project_id:"pC",title:"Kamin",date:"2026-10-05"}},
   {art:"montieren",      m:{id:"m6",project_id:"pA",title:"Ortblech",date:"2026-09-30"}},
   {art:"abschliessen",   m:{id:"m7",project_id:"pC",title:"Abschluss",date:"2026-09-29"}}];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  a2Zustand.seite="heute"; a2Zustand.bereich=null;
  a2Zeichnen();
 });
 await aufbauen();
 await page.waitForTimeout(300);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const bild=()=>page.evaluate(()=>{
  const koepfe=[...document.querySelectorAll("[data-a2-aufg-gruppe]")];
  return {
   gruppen:koepfe.map(k=>({
     id:k.getAttribute("data-a2-aufg-gruppe"),
     titel:(k.querySelector(".a2-zeile-text b")||{}).textContent||"",
     unter:(k.querySelector(".a2-zeile-text span")||{}).textContent||"",
     offen:k.getAttribute("aria-expanded")==="true",
     // Die Aufgaben DIESER Gruppe - nur die, die wirklich darunter haengen.
     aufgaben:[...k.parentNode.querySelectorAll("[data-a2-aufgabe='oeffnen']")]
       .map(x=>x.getAttribute("data-a2-id"))})),
   alleAufgaben:[...document.querySelectorAll("[data-a2-aufgabe='oeffnen']")]
     .map(x=>x.getAttribute("data-a2-id")),
   marke:(document.querySelector(".a2-marke.a2-m-blau")||{}).textContent||"",
   sammelknopf:(()=>{const k=document.querySelector("[data-a2-tu='aufgabenalle']");
     return k?k.textContent.trim():null})()};
 });

 console.log("\nA · Gruppiert nach Projekt, der Kopf sagt das Noetige");
 const a=await bild();
 p(a.gruppen.length===3,"A1 drei Projekte, drei Gruppen",a.gruppen.map(g=>g.titel));
 p(a.gruppen.every(g=>/\d+ Aufgabe/.test(g.unter)),
   "A2 jeder Kopf nennt die Anzahl",a.gruppen.map(g=>g.unter));
 const gB=a.gruppen.find(g=>g.id==="pB");
 p(/dringend/.test(gB.unter),"A3 und sagt, wenn etwas dringend ist",gB.unter);
 const gC=a.gruppen.find(g=>g.id==="pC");
 p(!/dringend/.test(gC.unter),
   "A4 GEGENPROBE: und sagt es NICHT, wo nichts dringend ist",gC.unter);
 p(a.marke==="7 offen",
   "A5 die Gesamtzahl oben bleibt die Antwort auf 'wie viel habe ich heute'",a.marke);

 console.log("\nB · Die Reihenfolge aus js/45 bleibt");
 // Seit v3.258 ist alles zugeklappt; um die Reihenfolge der AUFGABEN zu
 // messen, werden sie hier aufgeklappt. Die Reihenfolge der GRUPPEN (B1)
 // gilt zugeklappt wie aufgeklappt und wird vorher geprueft.
 p(a.gruppen.map(g=>g.id).join(",")==="pB,pA,pC",
   "B1 ein Projekt steht dort, wo seine DRINGENDSTE Aufgabe stuende - nicht alphabetisch, nicht nach allProjects",
   a.gruppen.map(g=>g.id));
 await page.evaluate(()=>a2AufgabenAlleUmschalten());
 await page.waitForTimeout(200);
 const bOffen=await bild();
 p(bOffen.alleAufgaben.join(",")==="m1,m3,m2,m4,m6,m5,m7",
   "B2 und innerhalb einer Gruppe bleibt die Reihenfolge von js/45",bOffen.alleAufgaben);
 p(bOffen.gruppen.find(g=>g.id==="pA").aufgaben.join(",")==="m2,m4,m6",
   "B3 jede Aufgabe haengt unter IHREM Projekt",bOffen.gruppen.find(g=>g.id==="pA").aufgaben);
 // GEGENPROBE: keine Aufgabe faellt beim Gruppieren heraus.
 p(bOffen.alleAufgaben.length===7,
   "B4 GEGENPROBE: es sind weiterhin alle sieben - gruppieren darf nichts verschlucken",bOffen.alleAufgaben.length);
 // Zurueck auf die Vorgabe, damit Abschnitt C sie misst und nicht den
 // Zustand, den dieser Abschnitt hinterlassen hat.
 await page.evaluate(()=>{ a2AufgabenAuf.clear(); a2AufgabenAufMerken(); a2Zeichnen(); });
 await page.waitForTimeout(200);

 console.log("\nC · Aufklappen, zuklappen, gemerkt");
 // Frisch gelesen: Abschnitt B hat zwischendurch aufgeklappt und wieder auf
 // die Vorgabe zurueckgesetzt.
 const cv=await bild();
 p(cv.gruppen.every(g=>!g.offen),
   "C1 voreingestellt ist zugeklappt - Entscheidung des Anwenders (v3.258)",cv.gruppen.map(g=>g.offen));
 p(cv.alleAufgaben.length===0,
   "C1a und es steht wirklich keine Aufgabenzeile da - nur die drei Koepfe",cv.alleAufgaben);
 p(cv.gruppen.every(g=>/\d+ Aufgabe/.test(g.unter)),
   "C1b dafuer sagt jeder Kopf, wie viel darunter liegt - sonst waere die Startseite leer statt zusammengefasst",cv.gruppen.map(g=>g.unter));
 await page.evaluate(()=>{
  document.querySelector("[data-a2-aufg-gruppe='pA']").click();
 });
 await page.waitForTimeout(200);
 const c=await bild();
 const cA=c.gruppen.find(g=>g.id==="pA");
 p(cA.offen===true&&cA.aufgaben.join(",")==="m2,m4,m6",
   "C2 ein Tipp klappt das Projekt auf - mit seinen Aufgaben, in der Reihenfolge von js/45",cA);
 p(/3 Aufgaben/.test(cA.unter),
   "C3 und die Zusammenfassung bleibt stehen - sonst waere die Gruppe eine leere Behauptung",cA.unter);
 p(c.alleAufgaben.length===3,
   "C4 nur dieses Projekt ist offen",c.alleAufgaben);
 p(c.gruppen.filter(g=>g.offen).length===1,
   "C5 GEGENPROBE: die anderen Projekte bleiben zu - es klappt genau eines",c.gruppen.map(g=>g.id+":"+g.offen));
 // Gemerkt wird das AUFGEKLAPPTE, ueber das Neuladen hinweg.
 const gemerkt=await page.evaluate(()=>localStorage.getItem("sd_a2AufgabenAuf"));
 p(String(gemerkt).indexOf("pA")>=0,"C6 der Zustand wird auf dem Geraet gemerkt",gemerkt);
 await page.reload({waitUntil:"load"}); await page.waitForTimeout(500);
 await aufbauen(); await page.waitForTimeout(300);
 const nachNeu=await bild();
 p(nachNeu.gruppen.find(g=>g.id==="pA").offen===true,
   "C7 und gilt nach dem Neuladen weiter",nachNeu.gruppen.map(g=>g.id+":"+g.offen));
 p(nachNeu.gruppen.find(g=>g.id==="pB").offen===false,
   "C8 GEGENPROBE: gemerkt wird das AUFGEKLAPPTE - ein neues Projekt ist dadurch zu, wie alle anderen",nachNeu.gruppen.map(g=>g.id+":"+g.offen));
 // C9: die Liste aus v3.257 bedeutet das GEGENTEIL. Bliebe sie liegen und
 // wuerde jemand sie spaeter wieder lesen, waeren genau die Projekte offen,
 // die der Anwender zugeklappt hatte.
 const altWeg=await page.evaluate(()=>{
  localStorage.setItem("sd_a2AufgabenZu",JSON.stringify(["pB","pC"]));
  return localStorage.getItem("sd_a2AufgabenZu");
 });
 await page.reload({waitUntil:"load"}); await page.waitForTimeout(500);
 const nachAufraeumen=await page.evaluate(()=>localStorage.getItem("sd_a2AufgabenZu"));
 p(altWeg!==null&&nachAufraeumen===null,
   "C9 die alte, gegenteilige Liste aus v3.257 wird beim Laden weggeraeumt",{vorher:altWeg,nachher:nachAufraeumen});
 await aufbauen(); await page.waitForTimeout(300);

 console.log("\nE · Alle auf einmal");
 const vorE=await bild();
 p(/Alle aufklappen/.test(vorE.sammelknopf||""),
   "E1 der Knopf sagt, was er tut - zugeklappt bietet er das Aufklappen an",vorE.sammelknopf);
 await page.evaluate(()=>document.querySelector("[data-a2-tu='aufgabenalle']").click());
 await page.waitForTimeout(200);
 const e1=await bild();
 p(e1.gruppen.every(g=>g.offen)&&e1.alleAufgaben.length===7,
   "E2 ein Tipp klappt alle auf - alle sieben Aufgaben stehen da",e1.alleAufgaben.length);
 p(/Alle zuklappen/.test(e1.sammelknopf||""),
   "E3 und der Knopf bietet danach das Gegenteil an",e1.sammelknopf);
 await page.evaluate(()=>document.querySelector("[data-a2-tu='aufgabenalle']").click());
 await page.waitForTimeout(200);
 const e2=await bild();
 p(e2.gruppen.every(g=>!g.offen)&&e2.alleAufgaben.length===0,
   "E4 und zurueck - die reine Uebersicht",e2.gruppen.map(g=>g.offen));

 console.log("\nF · GEGENPROBE: an den Aufgaben selbst aendert sich nichts");
 // Abschnitt E hat zuletzt alles zugeklappt - fuer die Aufgabenzeilen selbst
 // muss hier wieder aufgeklappt sein.
 await page.evaluate(()=>a2AufgabenAlleUmschalten());
 await page.waitForTimeout(200);
 const f=await page.evaluate(()=>{
  const z=document.querySelector("[data-a2-aufgabe='oeffnen'][data-a2-id='m1']");
  const reihe=z?z.closest(".a2-zeile-reihe"):null;
  return {
   oeffnen:!!z,
   // Der Tat-Knopf traegt unveraendert die Art als data-Marke - js/45 faengt
   // ihn am Dokument ab. Wuerde hier etwas nachgebaut, faellt es hier auf.
   tatKnoepfe:[...document.querySelectorAll(".a2-zeile-tat")]
     .map(k=>k.getAttribute("data-a2-aufgabe")),
   inReihe:!!reihe};
 });
 p(f.oeffnen&&f.inReihe,
   "F1 die Aufgabenzeile ist dieselbe wie vorher, samt ihrer Reihe",f);
 p(f.tatKnoepfe.length>0&&f.tatKnoepfe.every(x=>!!x),
   "F2 die Tat-Knoepfe tragen unveraendert ihre Art - der Weg nach js/45 ist derselbe",f.tatKnoepfe);
 // DIE Gegenprobe zum Zuklappen: ein Tipp auf den Kopf darf KEINE Aufgabe
 // ausfuehren. Beide liegen in derselben Liste und tragen data-Marken.
 const g=await page.evaluate(async()=>{
  window.__ausgefuehrt=[];
  const echt=window.aufgabeAusfuehren;
  window.aufgabeAusfuehren=async(art,id)=>{window.__ausgefuehrt.push(art+":"+id)};
  const kopf=()=>document.querySelector("[data-a2-aufg-gruppe='pB']");
  const vorher=kopf().getAttribute("aria-expanded");
  kopf().click();
  await new Promise(r=>setTimeout(r,200));
  window.aufgabeAusfuehren=echt;
  return {ausgefuehrt:window.__ausgefuehrt.slice(),
          vorher,nachher:kopf().getAttribute("aria-expanded")};
 });
 p(g.ausgefuehrt.length===0,
   "F3 GEGENPROBE: ein Tipp auf den Gruppenkopf fuehrt KEINE Aufgabe aus",g.ausgefuehrt);
 p(g.vorher==="true"&&g.nachher==="false",
   "F4 er klappt nur um - das und sonst nichts",g);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
