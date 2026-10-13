// v3.352: Startseite - Kopf mit Handlungen, Arbeitsstand (Kennzahlen), "Nächster Schritt" je Projekt.
// Gegenproben: keine Zahl bei unsicherem Stand, keine Handlung ohne Freigabe, richtiges Ziel, kein Überlaufen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];meineRechte={admin:true};companyName="Muster AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  a2Zeichnen();
 });
 await page.waitForTimeout(400);
 await page.evaluate(()=>{if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden()});
 await page.waitForTimeout(1800);

 console.log("\nA · Kopf und Arbeitsstand");
 const a=await page.evaluate(()=>{
  const k=[...document.querySelectorAll("#a2Inhalt .a2-kpi")].map(x=>({b:x.querySelector("b").textContent,t:x.querySelector("span").textContent,tab:x.getAttribute("data-a2-tab"),sc:x.getAttribute("data-a2-scroll")}));
  return {k,offen:a2OffeneProjekte(false).length,auf:a2Aufgaben().length,
   aktionen:[...document.querySelectorAll("#a2Inhalt .a2-aktionen button")].map(x=>x.textContent.replace(/\s+/g," ").trim()),
   neuSichtbar:a2KnopfSichtbar("startOpenProjects"),sucheSichtbar:a2KnopfSichtbar("openGlobalSearch"),
   werkInKpi:[...document.querySelectorAll("#a2Inhalt .a2-kpi")].filter(x=>/Teile|Rüstlist|Montage/.test(x.textContent)).length,
   ziel:!!document.getElementById("a2HeuteAufgaben")};
 });
 p(a.k.length===2&&Number(a.k[0].b)===a.offen&&a.k[0].tab==="projekte","Kennzahl Offene Projekte = a2OffeneProjekte(alle), Ziel Projekte",a);
 p(Number(a.k[1].b)===a.auf&&a.k[1].sc==="a2HeuteAufgaben"&&a.ziel,"Kennzahl Offene Aufgaben = Aufgabenliste, springt zum Abschnitt",a);
 p(a.werkInKpi===0,"Werkstattzahlen stehen nur im Abschnitt Werkstatt (keine doppelte Kennzahl im Arbeitsstand)",a.werkInKpi);
 p(a.aktionen.some(x=>/Projekt öffnen/.test(x))&&(a.neuSichtbar===a.aktionen.some(x=>/Neues Projekt/.test(x)))&&(a.sucheSichtbar===a.aktionen.some(x=>/Suche/.test(x))),"Handlungen nur wenn sichtbar (Neues Projekt / Suche); Projekt öffnen immer",a.aktionen);

 console.log("\nB · Unsicherer Stand und Gegenproben");
 const u=await page.evaluate(()=>{
  const alt=aufgabenStandHinweis;
  aufgabenStandHinweis=()=>"Abruf fehlgeschlagen";
  a2Zeichnen();
  const k=[...document.querySelectorAll("#a2Inhalt .a2-kpi")].map(x=>x.querySelector("b").textContent);
  aufgabenStandHinweis=alt;
  // ohne Freigabe: Knöpfe weg
  const n=$("startOpenProjects"),s=$("openGlobalSearch");
  if(n)n.hidden=true;if(s)s.hidden=true;
  a2Zeichnen();
  const ak=[...document.querySelectorAll("#a2Inhalt .a2-aktionen button")].map(x=>x.textContent.replace(/\s+/g," ").trim());
  if(n)n.hidden=false;if(s)s.hidden=false;
  a2Zeichnen();
  return {k,ak};
 });
 p(u.k[1]==="–","Aufgaben-Stand unsicher: „–“ statt einer Zahl/Null",u.k);
 p(u.ak.length===1&&/Projekt öffnen/.test(u.ak[0]),"ohne Freigabe: kein Neues Projekt, keine Suche",u.ak);

 console.log("\nC · Nächster Schritt je Projekt");
 const n=await page.evaluate(()=>{
  const karten=[...document.querySelectorAll("#a2HeuteProjekte .a2-karte-klick")];
  const aufg=a2AufgabenNachProjekt(a2Aufgaben());
  return {karten:karten.length,mit:karten.filter(c=>c.querySelector(".a2-naechster")).length,
   ziele:karten.every(c=>!!a2Projekt(c.getAttribute("data-a2-projekt"))),
   erwartet:a2OffeneProjekte().slice(0,8).filter(pr=>aufg.some(g=>String(g.id)===String(pr.id))).length};
 });
 p(n.karten>0&&n.ziele,"Projektkarten zeigen auf vorhandene Projekte",n);
 p(n.mit===n.erwartet,"„Nächster Schritt“ steht genau bei Projekten mit offener Aufgabe",n);

 console.log("\nD · Bedienung und Layout");
 await page.evaluate(()=>{document.querySelector('#a2Inhalt .a2-kpi[data-a2-tab="projekte"]').click()});
 await page.waitForTimeout(500);
 const ziel=await page.evaluate(()=>a2Zustand.seite);
 p(ziel==="projekte","Kennzahl Offene Projekte öffnet die Projektliste",ziel);
 await page.evaluate(()=>{a2Zustand.seite="heute";a2Zeichnen()});
 for(const w of [360,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  await page.waitForTimeout(150);
  const o=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
   klein:[...document.querySelectorAll("#a2Inhalt .a2-kpi,#a2Inhalt .a2-aktionen button")].filter(x=>x.getBoundingClientRect().height<40).length}));
  p(o.sw<=o.cw+1&&o.klein===0,"Breite "+w+": kein horizontales Überlaufen, Touch-Ziele ≥ 40px",o);
 }
 const fok=await page.evaluate(()=>{const k=document.querySelector("#a2Inhalt .a2-kpi");k.focus();return document.activeElement===k&&k.tagName==="BUTTON"});
 p(fok,"Kennzahlen sind per Tastatur fokussierbare Knöpfe");

 console.log("\nF · Verdichtung und Darstellung (v3.353)");
 await page.setViewportSize({width:360,height:800});
 const v=await page.evaluate(()=>{
  const alt=allProjects;
  const lang="Sanierung des Mehrfamilienhauses am Bahnhofplatz mit sehr langem Projektnamen ohne Leerzeichen"+"X".repeat(60);
  allProjects=alt.map((q,i)=>i===0?{...q,name:lang,object:"Sehr lange Adresse "+"Y".repeat(80)+" 12, 3011 Bern"}:q);
  a2Zustand.seite="heute";a2Zeichnen();
  const kpi=document.querySelector("#a2Inhalt .a2-kpi").getBoundingClientRect().height;
  const kar=[...document.querySelectorAll("#a2HeuteProjekte .a2-karte-klick")];
  const st=kar.map(c=>c.querySelector(".a2-st")).filter(Boolean);
  const r={sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,kpi,
   karteH:kar.length?Math.round(kar[0].getBoundingClientRect().height):0,
   glyph:st.some(x=>/[◐○✓×]/.test(x.textContent)),statusTexte:st.map(x=>x.textContent.trim()),
   klasse:document.getElementById("a2Inhalt").classList.contains("a2-heute"),
   radius:kar.length?getComputedStyle(kar[0]).borderRadius:"",schatten:kar.length?getComputedStyle(kar[0]).boxShadow:"",
   ueberlauf:kar.some(c=>c.scrollWidth>c.clientWidth+1),
   nav:[...document.querySelectorAll("#a2Leiste button")].map(x=>x.textContent.replace(/\s+/g,"").trim()),
   navUeber:(()=>{const l=document.getElementById("a2Leiste").getBoundingClientRect();return l.bottom<=window.innerHeight+1&&l.height>=50})()};
  allProjects=alt;
  a2Zustand.seite="projekte";a2Zeichnen();
  r.andere=document.getElementById("a2Inhalt").classList.contains("a2-heute")||document.documentElement.classList.contains("a2-heute-an");
  a2Zustand.seite="heute";a2Zeichnen();
  return r;
 });
 p(v.sw<=v.cw+1&&!v.ueberlauf,"lange Projektnamen und Adressen (360px): kein Überlaufen",v);
 p(v.kpi>0&&v.kpi<=62,"Kennzahlen kompakt (Höhe ≤ 62px)",v.kpi);
 p(v.klasse&&parseFloat(v.radius)<=10&&(v.schatten==="none"||v.schatten===""),"Projektkarten: ruhige Fläche (Rundung ≤ 10px, kein Schatten)",[v.radius,v.schatten]);
 p(v.statusTexte.length>0&&!v.glyph&&v.statusTexte.every(x=>/^(Offen|In Arbeit|Abgeschlossen|Storniert)$/.test(x)),"Status ohne unklares Zeichen, nur Klartext (Punkt per CSS)",v.statusTexte);
 p(v.nav.length>=3&&v.nav.some(x=>/Heute/.test(x))&&v.nav.some(x=>/Projekte/.test(x))&&v.nav.some(x=>/Mehr/.test(x))&&v.navUeber,"untere Navigation vollständig und im Bild",[v.nav,v.navUeber]);
 p(!v.andere,"andere Seiten bleiben unverändert (Klasse nur auf Heute)",v.andere);

 console.log("\nE · Leerer Bestand");
 const l=await page.evaluate(()=>{
  const alt=allProjects;allProjects=[];a2Zeichnen();
  const r={k0:document.querySelector("#a2Inhalt .a2-kpi b").textContent,proj:!!document.getElementById("a2HeuteProjekte"),neu:!![...document.querySelectorAll("#a2Inhalt .a2-aktionen button")].find(x=>/Neues Projekt/.test(x.textContent))};
  allProjects=alt;a2Zeichnen();return r;
 });
 p(l.k0==="0"&&l.neu,"leerer Projektbestand: 0 offene Projekte, Aktion „Neues Projekt“ bleibt",l);
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
