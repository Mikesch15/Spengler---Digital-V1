// Prueft "Archiv und Filter" im Stil der neuen Ansicht (v3.274).
//
// Ansage des Anwenders (9.10.2026): "Bei den projekten unter archiv und filter
// ist noch die alte ansicht". Der Schirm ist derselbe geblieben (v3.156: ein
// vorhandener Schirm im Rahmen der neuen Ansicht), aber seine Karten waren die
// der klassischen Ansicht: Titel, Statusschild, grosser blauer Knopf
// "Projekt oeffnen", drei Knoepfe darunter. Jetzt dieselbe Zeile wie auf der
// Projektseite (a2ProjektZeileHtml).
//
// Geprueft wird, dass es die NEUE Zeile ist UND dass sich nichts verloren hat:
// jeder Knopf ruft weiter dasselbe auf (gleiche data-Attribute, gleicher
// Handler), das wartende Projekt bietet weiter weder Oeffnen noch Loeschen an,
// archivierte Projekte bieten Reaktivieren.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1500},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=window.__demo.projects.slice();
  allProjects.push({id:"tmp-x",name:"Neubau",object:"Feldweg 1",order_no:"9",customer:"",archived:false,status:"offen",wartet:true});
  allProjects.push({id:9001,name:"Altbau",object:"Altweg 3",order_no:"1",customer:"",archived:true,status:"abgeschlossen"});
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  a2Zeichnen();
  a2Zustand.seite="projekte"; a2Zeichnen();
 });
 await page.waitForTimeout(300);
 await page.evaluate(()=>document.querySelector('[data-a2-tu="projektarchiv"]').click());
 await page.waitForTimeout(900);

 console.log("\nA · Die Zeile ist die der neuen Ansicht");
 const a=await page.evaluate(()=>{
  const zeilen=[...document.querySelectorAll("#projectList .project-row")];
  const z=zeilen.find(x=>x.innerText.indexOf("Bahnhofstrasse")>=0);
  return {n:zeilen.length,
   neueZeile:!!z.querySelector("button.a2-zeile[data-open-cockpit]"),
   marke:!!z.querySelector(".a2-marke"),
   pfeil:!!z.querySelector(".a2-zeile-pfeil"),
   alterBlauerKnopf:!!z.querySelector("button.blue.project-row-main"),
   alterKnopfText:/📂 Projekt öffnen/.test(z.innerText),
   altesStatusschild:!!z.querySelector(".pstatus"),
   hoehe:Math.round(z.getBoundingClientRect().height)};
 });
 p(a.n>=3,"die Projekte stehen als Zeilen in der Liste",a);
 p(a.neueZeile&&a.marke&&a.pfeil,"jede Zeile ist eine antippbare a2-Zeile mit Statusmarke und Pfeil",a);
 p(!a.alterBlauerKnopf&&!a.alterKnopfText&&!a.altesStatusschild,
   "Gegenprobe: der grosse blaue Knopf und das alte Statusschild sind weg",a);
 p(a.hoehe<130,"und die Zeile samt Knoepfen ist kompakt (vorher ueber 190 px)",a.hoehe);

 console.log("\nB · Der Schirm selbst im Stil der neuen Ansicht");
 const c=await page.evaluate(()=>{
  const info=document.querySelector("#projectsModal .info");
  const f=document.querySelector("#projectStatusFilter");
  const such=document.querySelector("#projectSearchInput");
  const lab=document.querySelector("#projectSuchBox label");
  return {infoSichtbar:!!info&&getComputedStyle(info).display!=="none",
   filterNowrap:f&&getComputedStyle(f).flexWrap==="nowrap",
   filterScroll:f&&getComputedStyle(f).overflowX==="auto",
   labelSichtbar:!!lab&&getComputedStyle(lab).display!=="none",
   suchRadius:parseFloat(getComputedStyle(such).borderTopLeftRadius),
   archivKnopfKlasse:document.querySelector("#toggleArchivedProjects").className};
 });
 p(!c.infoSichtbar,"der Erklaersatz oben ist weg",c);
 p(c.filterNowrap&&c.filterScroll,"die Filter stehen in einer wischbaren Zeile statt in mehreren umbrochenen",c);
 p(!c.labelSichtbar&&c.suchRadius>=12,"das Suchfeld sieht aus wie das der Projektseite",c);
 p(/a2-knopf/.test(c.archivKnopfKlasse),"der Archiv-Knopf traegt den Knopfstil der neuen Ansicht",c);

 console.log("\nC · Es hat sich nichts verloren");
 const d=await page.evaluate(()=>{
  const z=t=>[...document.querySelectorAll("#projectList .project-row")].find(x=>x.innerText.indexOf(t)>=0);
  const b1=z("Bahnhofstrasse"), w=z("Feldweg 1");
  const attr=(r,a)=>r.querySelectorAll("["+a+"]").length;
  return {
   normal:{oeffnen:attr(b1,"data-open-cockpit"),bearbeiten:attr(b1,"data-edit-project"),
    archivieren:attr(b1,"data-archive-project"),loeschen:attr(b1,"data-del-project"),
    archivText:b1.querySelector("[data-archive-project]").textContent.trim()},
   wartend:{oeffnen:attr(w,"data-open-cockpit"),bearbeiten:attr(w,"data-edit-project"),
    archivieren:attr(w,"data-archive-project"),loeschen:attr(w,"data-del-project"),
    text:/Wartet auf die Übertragung/.test(w.innerText)&&/erst nach der Übertragung/.test(w.innerText)}};
 });
 p(d.normal.oeffnen===1&&d.normal.bearbeiten===1&&d.normal.archivieren===1&&d.normal.loeschen===1,
   "ein normales Projekt bietet Oeffnen, Bearbeiten, Archivieren und Loeschen an",d.normal);
 p(/Archivieren/.test(d.normal.archivText),"und beschriftet Archivieren richtig",d.normal);
 p(d.wartend.oeffnen+d.wartend.bearbeiten+d.wartend.archivieren+d.wartend.loeschen===0&&d.wartend.text,
   "ein wartendes Projekt bietet nichts davon an und sagt, warum",d.wartend);

 // Der Klick auf die Zeile fuehrt dorthin, wohin der alte Knopf fuehrte.
 const e=await page.evaluate(async()=>{
  const aufrufe=[]; const orig=window.projektOeffnen;
  projektOeffnen=async id=>{aufrufe.push(id)};
  const z=[...document.querySelectorAll("#projectList .project-row")].find(x=>x.innerText.indexOf("Bahnhofstrasse")>=0);
  const soll=z.querySelector("[data-open-cockpit]").dataset.openCockpit;
  z.querySelector("button.a2-zeile").click();
  await new Promise(r=>setTimeout(r,100));
  projektOeffnen=orig;
  return {aufrufe,soll};
 });
 p(e.aufrufe.length===1&&String(e.aufrufe[0])===String(e.soll),"ein Tipp auf die Zeile oeffnet das Projekt (projektOeffnen mit der Projekt-Nr.)",e);

 // Archiv-Ansicht: Reaktivieren statt Archivieren.
 await page.click("#toggleArchivedProjects"); await page.waitForTimeout(300);
 const f2=await page.evaluate(()=>{
  const z=[...document.querySelectorAll("#projectList .project-row")].find(x=>x.innerText.indexOf("Altweg 3")>=0);
  return {da:!!z,reaktivieren:z?/Reaktivieren/.test(z.querySelector("[data-archive-project]").textContent):false,
   marke:z?/Archiviert/.test(z.innerText):false,knopf:document.querySelector("#toggleArchivedProjects").textContent.trim()};
 });
 p(f2.da&&f2.reaktivieren&&f2.marke,"archivierte Projekte tragen die Marke \"Archiviert\" und bieten Reaktivieren",f2);
 p(/Aktive Projekte anzeigen/.test(f2.knopf),"der Umschalter heisst dann \"Aktive Projekte anzeigen\"",f2);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
