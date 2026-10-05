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
//   C  Zuklappen und Aufklappen, je Projekt, gemerkt ueber das Neuladen.
//      Gemerkt wird das ZUGEKLAPPTE: ein neu dazukommendes Projekt ist damit
//      von selbst offen - eine neue Baustelle soll man sehen, nicht suchen.
//   D  Voreingestellt ist AUFGEKLAPPT. Gemessen am 5.10.2026: 7 offene
//      Aufgaben auf 4 Projekte, im Schnitt 1,8. Alles zuzuklappen haette
//      kaum etwas verborgen und jeden Handgriff einen Tipp teurer gemacht.
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
 p(a.gruppen.map(g=>g.id).join(",")==="pB,pA,pC",
   "B1 ein Projekt steht dort, wo seine DRINGENDSTE Aufgabe stuende - nicht alphabetisch, nicht nach allProjects",
   a.gruppen.map(g=>g.id));
 p(a.alleAufgaben.join(",")==="m1,m3,m2,m4,m6,m5,m7",
   "B2 und innerhalb einer Gruppe bleibt die Reihenfolge von js/45",a.alleAufgaben);
 p(a.gruppen.find(g=>g.id==="pA").aufgaben.join(",")==="m2,m4,m6",
   "B3 jede Aufgabe haengt unter IHREM Projekt",a.gruppen.find(g=>g.id==="pA").aufgaben);
 // GEGENPROBE: keine Aufgabe faellt beim Gruppieren heraus.
 p(a.alleAufgaben.length===7,
   "B4 GEGENPROBE: es sind weiterhin alle sieben - gruppieren darf nichts verschlucken",a.alleAufgaben.length);

 console.log("\nC · Zuklappen, aufklappen, gemerkt");
 p(a.gruppen.every(g=>g.offen),
   "C1 voreingestellt ist aufgeklappt - gemessen 1,8 Aufgaben je Projekt, da verbirgt Zuklappen kaum etwas",a.gruppen.map(g=>g.offen));
 await page.evaluate(()=>{
  document.querySelector("[data-a2-aufg-gruppe='pA']").click();
 });
 await page.waitForTimeout(200);
 const c=await bild();
 const cA=c.gruppen.find(g=>g.id==="pA");
 p(cA.offen===false&&cA.aufgaben.length===0,
   "C2 ein Tipp klappt das Projekt zu - die Zeilen darunter sind weg",cA);
 p(/3 Aufgaben/.test(cA.unter),
   "C3 zugeklappt bleibt die Zusammenfassung stehen - sonst waere die Gruppe eine leere Behauptung",cA.unter);
 p(c.alleAufgaben.length===4,
   "C4 und nur die uebrigen vier stehen noch da",c.alleAufgaben);
 p(c.gruppen.filter(g=>g.offen).length===2,
   "C5 GEGENPROBE: die anderen Projekte bleiben offen - es klappt genau eines",c.gruppen.map(g=>g.id+":"+g.offen));
 // Gemerkt wird das ZUGEKLAPPTE, ueber das Neuladen hinweg.
 const gemerkt=await page.evaluate(()=>localStorage.getItem("sd_a2AufgabenZu"));
 p(String(gemerkt).indexOf("pA")>=0,"C6 der Zustand wird auf dem Geraet gemerkt",gemerkt);
 await page.reload({waitUntil:"load"}); await page.waitForTimeout(500);
 await aufbauen(); await page.waitForTimeout(300);
 const nachNeu=await bild();
 p(nachNeu.gruppen.find(g=>g.id==="pA").offen===false,
   "C7 und gilt nach dem Neuladen weiter",nachNeu.gruppen.map(g=>g.id+":"+g.offen));
 p(nachNeu.gruppen.find(g=>g.id==="pB").offen===true,
   "C8 GEGENPROBE: gemerkt wird das ZUGEKLAPPTE - ein neues Projekt ist dadurch von selbst offen",nachNeu.gruppen.map(g=>g.id+":"+g.offen));

 console.log("\nE · Alle auf einmal");
 p(/Alle zuklappen/.test(nachNeu.sammelknopf||""),
   "E1 der Knopf sagt, was er tut",nachNeu.sammelknopf);
 await page.evaluate(()=>document.querySelector("[data-a2-tu='aufgabenalle']").click());
 await page.waitForTimeout(200);
 const e1=await bild();
 p(e1.gruppen.every(g=>!g.offen)&&e1.alleAufgaben.length===0,
   "E2 ein Tipp klappt alle zu - die reine Uebersicht",e1.gruppen.map(g=>g.offen));
 p(/Alle aufklappen/.test(e1.sammelknopf||""),
   "E3 und der Knopf bietet danach das Gegenteil an",e1.sammelknopf);
 await page.evaluate(()=>document.querySelector("[data-a2-tu='aufgabenalle']").click());
 await page.waitForTimeout(200);
 const e2=await bild();
 p(e2.gruppen.every(g=>g.offen)&&e2.alleAufgaben.length===7,
   "E4 und zurueck - alle sieben stehen wieder da",e2.alleAufgaben.length);

 console.log("\nF · GEGENPROBE: an den Aufgaben selbst aendert sich nichts");
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
  document.querySelector("[data-a2-aufg-gruppe='pB']").click();
  await new Promise(r=>setTimeout(r,200));
  window.aufgabeAusfuehren=echt;
  return {ausgefuehrt:window.__ausgefuehrt.slice(),
          zu:document.querySelector("[data-a2-aufg-gruppe='pB']").getAttribute("aria-expanded")};
 });
 p(g.ausgefuehrt.length===0,
   "F3 GEGENPROBE: ein Tipp auf den Gruppenkopf fuehrt KEINE Aufgabe aus",g.ausgefuehrt);
 p(g.zu==="false","F4 er klappt nur zu - das und sonst nichts",g.zu);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
