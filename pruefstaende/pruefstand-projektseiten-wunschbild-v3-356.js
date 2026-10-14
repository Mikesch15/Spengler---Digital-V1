// v3.356: Projektliste und Projektseite nach dem Wunschbild (nur Darstellung) + Titelbild/Logo im Kopf der Startseite.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:844},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];meineRechte={admin:true};companyName="Muster AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  a2Zeichnen();
 });
 await page.waitForTimeout(500);

 console.log("\nA · Projektliste");
 const a=await page.evaluate(()=>{
  const alt=projectMeasStand;
  const id0=allProjects[0].id,id1=allProjects[1].id,id2=allProjects[2]?allProjects[2].id:-1;
  projectMeasStand=new Map([[id0,{gesamt:14,offen:10,zuRuesten:9}],[id1,{gesamt:11,offen:0,zuRuesten:0}]]);
  a2Zustand.seite="projekte";a2Zeichnen();
  const z=[...document.querySelectorAll("#a2Inhalt .a2-zeile-projekt")];
  const r={n:z.length,
   icon:z.every(x=>!!x.querySelector(".a2-pz-icon svg")),
   status:z.map(x=>(x.querySelector(".a2-st")||{}).textContent),
   glyph:z.some(x=>/[◐○✓×]/.test((x.querySelector(".a2-st")||{}).textContent||"")),
   text0:z[0]&&z[0].querySelector(".a2-pz-stand").textContent.replace(/\s+/g," ").trim(),
   soll0:projektStandZeile(id0),
   text1:z[1]&&z[1].querySelector(".a2-pz-stand").textContent.replace(/\s+/g," ").trim(),
   punkte:[...document.querySelectorAll(".a2-pz-offen,.a2-pz-ruesten,.a2-pz-fertig")].map(x=>x.className),
   filter:!!document.querySelector('#a2Inhalt .a2-suche-filter[data-a2-tu="projektarchiv"]'),
   suche:!!document.getElementById("a2Suche"),
   sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
  projectMeasStand=alt;
  return r;
 });
 p(a.n>0&&a.icon,"Projektkarten mit Symbol",a);
 p(!a.glyph&&a.status.every(x=>/^(Offen|In Arbeit|Abgeschlossen|Storniert)$/.test(x||"")),"Status als Klartext-Marke ohne unklares Zeichen",a.status);
 p(a.text0===a.soll0&&a.text0==="14 Massaufnahmen · 10 offen · 9 zu rüsten","Stand-Zeile = derselbe Satz wie bisher (Anzahl · offen · zu rüsten)",[a.text0,a.soll0]);
 p(a.punkte.some(c=>/pz-offen/.test(c))&&a.punkte.some(c=>/pz-ruesten/.test(c)),"farbige Punkte bei „offen“ und „zu rüsten“",a.punkte);
 p(a.filter&&a.suche,"Suchfeld mit Filterknopf (Archiv und Filter)",a);
 p(a.sw<=a.cw+1,"Projektliste ohne horizontales Überlaufen (390px)",[a.sw,a.cw]);

 console.log("\nB · Projektseite");
 const c=await page.evaluate(()=>{
  const pr=allProjects[0];
  a2Zustand.seite="projekt";a2Zustand.projektId=pr.id;a2Zustand.reg="uebersicht";cockpitProjectId=pr.id;a2Zeichnen();
  const reg=[...document.querySelectorAll("#a2Inhalt .a2-register-tabs button")];
  const r={tabs:reg.map(x=>x.getAttribute("data-a2-reg")),icons:reg.every(x=>!!x.querySelector("i svg")),
   aktiv:reg.filter(x=>x.getAttribute("aria-selected")==="true").map(x=>x.getAttribute("data-a2-reg")),
   soll:a2ProjRegister().map(x=>x.k),
   daten:[...document.querySelectorAll("#a2Inhalt .a2-daten dt")].map(x=>!!x.querySelector("svg")),
   status:(document.querySelector("#a2Inhalt .a2-abschnitt-kopf .a2-st")||{}).textContent,
   naechster:!!document.querySelector("#a2Inhalt .a2-auf-karte .a2-auf-icon svg"),
   sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
  // Register bedienbar: jeder Reiter wechselt das Register
  r.klick=[];
  for(const k of r.soll){const bt=document.querySelector('#a2Inhalt [data-a2-reg="'+k+'"]');if(bt){bt.click();r.klick.push(a2Zustand.reg===k)}}
  return r;
 });
 p(JSON.stringify(c.tabs)===JSON.stringify(c.soll)&&c.icons,"alle Register (wie bisher) als Symbolleiste",c);
 p(c.aktiv.length===1&&c.aktiv[0]==="uebersicht","aktiver Reiter markiert (aria-selected)",c.aktiv);
 p(c.klick.length>0&&c.klick.every(x=>x),"jeder Reiter öffnet sein Register",c.klick);
 p(c.daten.length>0&&c.daten.every(x=>x),"Projektübersicht: Symbol vor jeder Bezeichnung",c.daten);
 p(/^(Offen|In Arbeit|Abgeschlossen|Storniert)$/.test(c.status||""),"Projektstatus als Marke ohne Zeichen",c.status);
 p(c.sw<=c.cw+1,"Projektseite ohne horizontales Überlaufen (390px)",[c.sw,c.cw]);

 await page.waitForTimeout(1200);
 console.log("\nC · Komplettausmass-Darstellung");
 const k=await page.evaluate(()=>{
  const pid=allProjects[0].id;a2Zustand.seite="projekt";a2Zustand.reg="uebersicht";a2Zustand.projektId=pid;cockpitProjectId=pid;
  projectMeasurementsCache=[{id:1,project_id:pid,company_id:"c1",type:"kehle",title:"X",workflow_status:"zu_ruesten",data:{material:"Kupfer",ausmass:[{pos:1,bezeichnung:"Bleilappen",menge:"6",einheit:"Stk.",teil:true}]}}];
  kaFilter="alle";kaGeladen();
  const d=document.createElement("div");d.innerHTML=kaBauen("card").html;
  const t=d.textContent.replace(/\s+/g," ");
  return {stats:d.querySelectorAll(".ka-stat").length,iconz:d.querySelectorAll(".ka-stat i svg").length,
   text:/1 Massaufnahme/.test(t)&&/1 Mengenposition/.test(t)&&/nichts zu prüfen/.test(t),
   zeile:!!d.querySelector("details.ka-kachel .ka-kachel-icon")&&!!d.querySelector("details.ka-kachel .ka-kachel-pfeil"),
   farbe:[kaWerkstoffFarbe("Kupfer"),kaWerkstoffFarbe("Stahl"),kaWerkstoffFarbe("")]};
 });
 p(k.stats===3&&k.iconz===3&&k.text,"drei Kennzahlen-Felder mit Symbol, gleiche Sätze",k);
 p(k.zeile,"Positionen als Zeilen mit Symbolfeld und Pfeil",k);
 p(k.farbe[0]!==k.farbe[1]&&k.farbe[2]==="#c9d1d8","Werkstoff-Farbfeld: bekannte Metalle eigene Farbe, sonst neutral",k.farbe);

 console.log("\nE · Stammdaten nach dem Wunschbild (v3.357)");
 await page.evaluate(()=>{a2Zustand.seite="projekt";a2Zustand.projektId=allProjects[0].id;a2Zustand.reg="uebersicht";cockpitProjectId=allProjects[0].id;a2Zeichnen()});
 await page.waitForTimeout(600);
 await page.evaluate(()=>a2StammdatenOeffnen(allProjects[0].id));
 await page.waitForTimeout(1500);
 const sd=await page.evaluate(()=>{
  const q=s=>document.querySelector(s);
  const cs=(el,pr)=>el?getComputedStyle(el)[pr]:"";
  const sel=q("#cockpitStatus");
  const personen=[...document.querySelectorAll("#cockpitZuteilung .zuteilung-person")];
  return {sichtbar:!!q("#projectCockpitModal.a2-nur-stammdaten")&&!q("#projectCockpitModal").hidden,
   badge:cs(q("#cockpitStatusBadge"),"display"),
   optionen:sel?[...sel.options].map(o=>o.textContent):[],
   punkt:sel?getComputedStyle(sel).backgroundImage.indexOf("radial-gradient")>=0:false,
   kopf:!!q("#cockpitStammdaten .stamm-kopf"),
   labelCase:cs(q("#cockpitStammdaten label"),"textTransform"),
   spalten:q("#cockpitZuteilung")?getComputedStyle(q("#cockpitZuteilung")).gridTemplateColumns.split(" ").length:0,
   personCase:personen.length?cs(personen[0],"textTransform"):"keine",
   felder:["cockpitName","cockpitOrderNo","cockpitObject","cockpitCustomer","cockpitHinweis"].every(i=>!!document.getElementById(i)),
   speichern:!!q("#cockpitSaveStammdaten")&&!q("#cockpitSaveStammdaten").disabled,
   zurueck:cs(q("#cockpitBack"),"backgroundColor"),
   sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
 });
 p(sd.sichtbar,"Stammdaten öffnen im Rahmen der Ansicht",sd);
 p(sd.badge==="none"&&sd.optionen.length>=3&&sd.optionen.every(o=>!/[◐○✓×]/.test(o)),"Status: doppelte Marke entfällt, Auswahl ohne unklares Zeichen",[sd.badge,sd.optionen]);
 p(sd.punkt,"Status-Auswahl mit farbigem Punkt",sd.punkt);
 p(sd.kopf&&sd.labelCase==="none"&&sd.personCase==="none","Überschrift „Projektinformationen“, Beschriftungen in normaler Schrift",sd);
 p(sd.spalten===2||sd.personCase==="keine","Zuteilung zweispaltig",sd.spalten);
 p(sd.felder&&sd.speichern,"alle Felder und der Speichern-Knopf vorhanden (derselbe Weg)",sd);
 p(sd.zurueck!=="rgb(15, 118, 74)"&&sd.zurueck!=="rgb(0, 128, 0)"&&sd.sw<=sd.cw+1,"Zurück-Knopf ruhig (nicht grün), kein Überlaufen",[sd.zurueck,sd.sw,sd.cw]);

 console.log("\nD · Kopf der Startseite: festes Banner (v3.364)");
 const l=await page.evaluate(async()=>{
  const gif="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  if(a2Zustand.bereich)a2BereichSchliessen();
  $("startLogo").src=gif;$("startLogo").hidden=false;kopfBildSigniert="";
  a2Zustand.seite="heute";a2Zeichnen();
  await new Promise(x=>setTimeout(x,400));
  const i=document.querySelector("#a2Inhalt .a2-hero-fix .a2-hero-bild");
  if(!i)return null;
  const h=document.querySelector("#a2Inhalt .a2-hero-fix");
  return {src:i.getAttribute("src"),alt:i.alt,geladen:i.complete&&i.naturalWidth>0,breite:Math.round(i.getBoundingClientRect().width),
   hw:Math.round(h.getBoundingClientRect().width),gruss:/^Guten (Morgen|Tag|Abend)$/.test((h.querySelector(".a2-hero-gruss")||{}).textContent||""),
   unter:(h.querySelector(".a2-hero-unter")||{}).textContent||"",altLogo:!!h.querySelector(".a2-hero-logo"),mitBild:!!document.querySelector("#a2Inhalt .a2-hero-mit-bild")};
 });
 p(l&&l.src==="img/startbanner.jpg"&&l.geladen&&l.breite>=l.hw-2,"Kopf zeigt das feste Banner über die ganze Breite (Datei geladen)",l);
 p(l&&l.gruss&&/ · /.test(l.unter)&&l.unter.length>8,"Begrüssung, Datum und Name stehen unter dem Banner",l);
 p(l&&!l.altLogo&&!l.mitBild,"ohne eigenes Bild: Standard-Banner, unabhängig vom Firmenlogo",l);
 const eig=await page.evaluate(()=>{const gif="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";kopfBildSigniert=gif;a2Zeichnen();const a=document.querySelector("#a2Inhalt .a2-hero-bild").getAttribute("src");kopfBildSigniert="";a2Zeichnen();const b=document.querySelector("#a2Inhalt .a2-hero-bild").getAttribute("src");return {a:a===gif,b,vis:!document.getElementById("kopfBildBlock").hidden};});
 p(eig.a&&eig.b==="img/startbanner.jpg"&&eig.vis,"v3.364: eigenes Banner aus den Firmeneinstellungen ersetzt das Standard-Banner; Entfernen stellt es wieder her; Feld sichtbar",eig);
 const swq=require("fs").readFileSync("sw.js","utf8");
 p(/\.\/img\/startbanner\.jpg/.test(swq)&&require("fs").existsSync("img/startbanner.jpg")&&require("fs").statSync("img/startbanner.jpg").size>20000,"Banner liegt im Repo und in der App-Shell von sw.js (offline verfügbar)");
 const q7=require("fs").readFileSync(path.join(process.cwd(),"js/07-einstellungen.js"),"utf8");
 p(/kopfBildGeaendert\?\{kopf_bild_url:newKopfBildUrl\}:\{\}/.test(q7)&&/kopfBildGeaendert=true/.test(q7),"Titelbild wird nur geschrieben, wenn geändert – Speichern der Firmendaten überschreibt es nie");
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
