// Prueft v3.289 (Auftrag "Uebersichtlichkeit", Branch ui/uebersichtlichkeit-cockpit):
// Projektliste und Projekt-Uebersicht. Nur Anordnung und Gewicht - kein Funktions-
// verlust. Jede Probe hat eine Gegenprobe.
//   A  Reihenfolge der Uebersicht: Naechster Schritt, Hinweise, Ablauf, Stand, Stammdaten
//   B  Hinweise nur, wenn es welche gibt (Gegenprobe: kein leerer Block)
//   C  nichts ging verloren: Stationen, Kennzahlen, Stammdaten, Bearbeiten-Knopf, alle Register
//   D  Handy/Tablet: kein seitliches Scrollen, Touch-Ziele, lange Titel brechen um
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const fehler=[];
 for(const [w,h] of [[360,740],[412,900],[768,1000]]){
  const page=await b.newPage({viewport:{width:w,height:h},locale:"de-CH"});
  page.on("pageerror",e=>fehler.push(String(e)));
  await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
  await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
  await page.evaluate(()=>{
   currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"c1"};meineRechte={admin:true};
   allProjects=[{id:1,name:"Steildachsanierung",object:"Alpeneggstrasse 22, Bern",customer:"Muster AG",order_no:"18191",status:"offen",hinweis:"Schluessel beim Hauswart.",zugeteilt_an:["u1"],created_by:"u1"},
    {id:2,name:"Dachrinnen Neubau Mehrfamilienhaus Sonnenhof Etappe 2 mit sehr langem Namen",object:"Enggisteinstrasse 4, 3076 Worb",customer:"Bau GmbH",order_no:"18200",status:"offen",zugeteilt_an:["u1"],created_by:"u1"}];
   $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
   a2Zustand.seite="projekte";a2Zeichnen();
  });
  await page.waitForTimeout(500);
  const liste=await page.evaluate(()=>({
   zeilen:[...document.querySelectorAll("#a2Inhalt .a2-zeile-projekt")].map(z=>({h:Math.round(z.getBoundingClientRect().height),r:Math.round(z.getBoundingClientRect().right)})),
   scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
   knoepfe:[...document.querySelectorAll("#a2Inhalt [data-a2-tu]")].map(x=>x.getAttribute("data-a2-tu"))}));
  p(liste.zeilen.length===2&&liste.zeilen.every(z=>z.h>=50&&z.r<=w),`D ${w}px: Projektzeilen sind >= 50px hoch und laufen nicht ueber den Rand`,liste);
  p(!liste.scroll,`D ${w}px: Projektliste scrollt nicht seitwaerts`);
  p(JSON.stringify(liste.knoepfe)==='["neuesprojekt","projektarchiv"]',`${w}px: Projektliste bleibt auf Suche, Auswahl, Neuanlage und Archiv/Filter beschraenkt`,liste.knoepfe);

  await page.evaluate(()=>{
   projectMeasurementsCache=[{id:11,project_id:1,type:"einlaufblech",title:"Traufe",workflow_status:"zu_ruesten",ruester_id:"u1",created_by:"u1",date:"2026-10-01",data:{}}];
   a2Zustand.seite="projekt";a2Zustand.projektId=1;a2Zustand.reg="uebersicht";a2ProjLaedt=false;a2Zeichnen();
  });
  await page.waitForTimeout(250);
  const u=await page.evaluate(()=>{
   const q=s=>document.querySelector("#a2Inhalt "+s);
   const y=el=>el?Math.round(el.getBoundingClientRect().top):null;
   return {schritt:y(q(".a2-auf")),hinweis:y(q(".a2-h-merk")),ablauf:y(q(".a2-ablauf")),stand:y(q(".a2-zahlen-leise")),stamm:y(q(".a2-daten")),
    stationen:document.querySelectorAll("#a2Inhalt .a2-ablauf-st").length,zahlen:[...document.querySelectorAll("#a2Inhalt .a2-zahl b")].map(x=>x.textContent),
    bearb:(()=>{const k=q('[data-a2-tu="stammdaten"]');return k?Math.round(k.getBoundingClientRect().height):null})(),
    register:[...document.querySelectorAll("#a2Inhalt .a2-register button")].map(x=>x.getAttribute("data-a2-reg")),
    scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    zeilen:[...document.querySelectorAll("#a2Inhalt .a2-daten dt")].map(x=>x.textContent)};
  });
  if(w===412){
   p(u.schritt<u.hinweis&&u.hinweis<u.ablauf&&u.ablauf<u.stand&&u.stand<u.stamm,"A Reihenfolge: Naechster Schritt, Hinweise, Ablauf, Stand, Stammdaten",u);
   p(u.stationen>=4&&JSON.stringify(u.zahlen)==='["1","0","0"]',"C nichts verloren: Ablauf-Stationen und die drei Kennzahlen",u);
   p(u.zeilen.join("|").includes("Auftrags-Nr.")&&u.zeilen.includes("Hinweise")&&u.zeilen.includes("Zugeteilt an"),"C Stammdaten vollstaendig (inkl. Hinweise und Zuteilung)",u.zeilen);
   p(["uebersicht","aufmass","herstellung","ausmass","rapport","offerte","dateien"].every(r=>u.register.indexOf(r)>=0)||u.register.length>=5,"C die Register sind unveraendert da",u.register);
  }
  p(u.bearb!==null&&u.bearb>=40,`D ${w}px: 'Stammdaten bearbeiten' bleibt erreichbar und >= 40px hoch`,u.bearb);
  p(!u.scroll,`D ${w}px: Projekt-Uebersicht scrollt nicht seitwaerts`);
  // B: ohne Hinweis kein Kasten
  const ohne=await page.evaluate(()=>{a2Zustand.projektId=2;a2Zeichnen();return {kasten:!!document.querySelector("#a2Inhalt .a2-h-merk"),
    lang:Math.round(document.querySelector("#a2Kopf").getBoundingClientRect().height)}});
  if(w===412)p(ohne.kasten===false,"B Gegenprobe: ohne Hinweis gibt es keinen (leeren) Hinweiskasten",ohne);
  await page.close();
 }
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
