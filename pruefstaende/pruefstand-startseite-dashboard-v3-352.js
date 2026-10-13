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
   werkDoppelt:[...document.querySelectorAll("#a2Inhalt .a2-zahlen .a2-zahl")].filter(x=>/Teile|Montage/.test(x.textContent)).length,
   ziel:!!document.getElementById("a2HeuteAufgaben")};
 });
 p(a.k.length>=2&&Number(a.k[0].b)===a.offen&&a.k[0].tab==="projekte","Kennzahl Offene Projekte = a2OffeneProjekte(alle), Ziel Projekte",a);
 p(Number(a.k[1].b)===a.auf&&a.k[1].sc==="a2HeuteAufgaben"&&a.ziel,"Kennzahl Offene Aufgaben = Aufgabenliste, springt zum Abschnitt",a);
 p(a.werkDoppelt===0,"Teile/Montagen stehen nur im Arbeitsstand, nicht zusätzlich im Abschnitt Werkstatt (keine doppelte Kennzahl)",a.werkDoppelt);
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
 p(v.kpi>0&&v.kpi<=92,"Kennzahlen kompakt (Höhe ≤ 92px)",v.kpi);
 p(v.klasse&&parseFloat(v.radius)<=10&&(v.schatten==="none"||v.schatten===""),"Projektkarten: ruhige Fläche (Rundung ≤ 10px, kein Schatten)",[v.radius,v.schatten]);
 p(v.statusTexte.length>0&&!v.glyph&&v.statusTexte.every(x=>/^(Offen|In Arbeit|Abgeschlossen|Storniert)$/.test(x)),"Status ohne unklares Zeichen, nur Klartext (Punkt per CSS)",v.statusTexte);
 p(v.nav.length>=3&&v.nav.some(x=>/Heute/.test(x))&&v.nav.some(x=>/Projekte/.test(x))&&v.nav.some(x=>/Mehr/.test(x))&&v.navUeber,"untere Navigation vollständig und im Bild",[v.nav,v.navUeber]);
 p(!v.andere,"andere Seiten bleiben unverändert (Klasse nur auf Heute)",v.andere);

 console.log("\nG · Wunschbild (v3.354): Kopf, Suche, Filter");
 await page.setViewportSize({width:420,height:900});
 const g=await page.evaluate(()=>{
  const r={};
  a2Zustand.seite="heute";a2ProjektFilter="alle";a2HeuteSuche="";a2Zeichnen();
  r.hero=!!document.querySelector("#a2Inhalt .a2-hero .a2-hero-gruss")&&/^Guten (Morgen|Tag|Abend)$/.test(document.querySelector(".a2-hero-gruss").textContent);
  r.suche=!!document.getElementById("a2HeuteSuche");r.filterKnopf=!!document.querySelector('#a2Inhalt .a2-hsuche-filter[data-a2-tu="projektarchiv"]');
  const alle=a2OffeneProjekte(false);
  r.alle=document.querySelectorAll("#a2HeuteProjListe .a2-karte-klick").length;r.alleSoll=Math.min(8,alle.length);
  // Suche: ein Name der Liste findet genau diese Projekte
  const name=(alle[0].name||alle[0].object||"").slice(0,6);
  const i=document.getElementById("a2HeuteSuche");i.value=name;i.dispatchEvent(new Event("input",{bubbles:true}));
  const soll=alle.filter(q=>projektPasstZuSuche(q,name)).length;
  r.suchTreffer=document.querySelectorAll("#a2HeuteProjListe .a2-karte-klick").length;r.suchSoll=Math.min(8,soll);
  i.value="zzzqqq";i.dispatchEvent(new Event("input",{bubbles:true}));
  r.leer=/Kein Projekt passt/.test(document.getElementById("a2HeuteProjListe").textContent);
  a2HeuteSuche="";a2Zeichnen();
  // Filter In Arbeit
  a2ProjektFilter="in_arbeit";a2Zeichnen();
  r.arbeit=[...document.querySelectorAll("#a2HeuteProjListe .a2-karte-klick .a2-st")].map(x=>x.textContent.trim());
  r.arbeitSoll=alle.filter(q=>q.status==="in_arbeit").length;
  r.chips=[...document.querySelectorAll("#a2HeuteProjekte .a2-register-klein button")].map(x=>x.textContent.replace(/\s+/g," ").trim());
  // Nahe Montage: nur Projekte mit Termin heute..+7 Tage
  const iso=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
  const p0=String(alle[0].id),p1=alle[1]?String(alle[1].id):null;
  const altW=werkZeilen;
  werkZeilen=[{id:901,project_id:alle[0].id,workflow_status:"zu_montieren",montage_am:iso(3)},
   ...(p1?[{id:902,project_id:alle[1].id,workflow_status:"zu_montieren",montage_am:iso(20)}]:[]),
   ...(alle[2]?[{id:903,project_id:alle[2].id,workflow_status:"zu_montieren",montage_am:null}]:[])];
  r.nah=a2NaheMontageProjekte(alle).map(q=>String(q.id));r.nahSoll=[p0];
  werkZeilen=altW;
  a2ProjektFilter="meine";a2Zeichnen();
  return r;
 });
 p(g.hero,"Kopfbereich mit Begrüssung (Guten Morgen/Tag/Abend)",g.hero);
 p(g.suche&&g.filterKnopf,"Suchfeld und Filterknopf (Archiv und Filter) vorhanden",g);
 p(g.alle===g.alleSoll,"Liste „Alle“ zeigt die offenen Projekte",[g.alle,g.alleSoll]);
 p(g.suchTreffer===g.suchSoll&&g.suchTreffer>0&&g.leer,"Suche filtert nach derselben Regel wie die Projektliste; ohne Treffer klare Meldung",g);
 p(g.arbeit.length===Math.min(8,g.arbeitSoll)&&g.arbeit.every(x=>x==="In Arbeit"),"Filter „In Arbeit“ zeigt nur Projekte mit Status In Arbeit",g.arbeit);
 p(g.chips.length>=3&&/^Meine \(\d+\)$/.test(g.chips[0])&&/^Alle \(\d+\)$/.test(g.chips[1])&&/^In Arbeit \(\d+\)$/.test(g.chips[2]),"Filter-Chips mit Anzahl",g.chips);
 p(JSON.stringify(g.nah)===JSON.stringify(g.nahSoll),"Nahe Montage: nur Termin heute bis 7 Tage; später oder ohne Termin zählt nicht",g.nah);

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
