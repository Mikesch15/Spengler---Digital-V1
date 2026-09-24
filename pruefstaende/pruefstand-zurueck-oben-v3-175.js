// Prueft v3.175: der Zurueck-Knopf oben links schliesst den OBERSTEN
// Schirm, nicht den darunter.
//
// GEMELDET
// "An einigen Orten funktioniert der Zurueck-Knopf oben links nicht."
//
// NACHGESTELLT
// Bereich Einstellungen offen, darueber ein zweiter Dialog. Der Knopf oben
// links blieb anklickbar (die Kopfzeile liegt ueber dem Dialog) und schloss
// den BEREICH DARUNTER. Der Dialog blieb stehen - fuer den Anwender
// passiert also scheinbar nichts. Schlimmer noch: der Bereich darunter war
// stillschweigend weg, und nach dem Schliessen des Dialogs stand man
// woanders als erwartet.
//
// DAZU EIN ZWEITER, EIGENER FEHLER
// zaehlwerkModal (v3.174) fehlte in A2_BEREICHE. Ohne Eintrag beobachtet
// a2BereichBeobachten() den Schirm nicht: schliesst er sich ueber seinen
// EIGENEN Knopf, nennt die Kopfzeile weiter einen Bereich, der nicht mehr
// offen ist - und ihr "<" wird ein Knopf ohne Wirkung.
//
// WAS HIER GEPRUEFT WIRD
//   A  Ein Schirm ueber dem Bereich geht zuerst weg, der Bereich bleibt.
//      (Ob der Knopf in dieser Lage fuer den Finger erreichbar IST, laesst
//      sich hier nicht messen: unter file:// im kopflosen Browser hat die
//      ganze Kopfzeile in jedem Zustand die Groesse 0x0. Geprueft wird
//      deshalb nur, was passiert, WENN er getroffen wird.)
//   B  Ohne Schirm darueber schliesst der Knopf wie bisher den Bereich.
//   C  Dasselbe auf der Projektseite.
//   D  Jeder als Bereich geoeffnete Schirm steht in A2_BEREICHE.
//   E  Programmatisches Schliessen bleibt unveraendert.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-zurueck-oben-v3-175.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  meineRechte={admin:true};
  allProjects=[{id:1,name:"Teststrasse 1",object:"Teststrasse 1",customer:"Muster AG",
                order_no:"A-1",status:"offen",zugeteilt_an:["u1"],created_by:"u1"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  a2Setzen(true);
 });
 await page.waitForTimeout(300);

 const aufraeumen=async()=>await page.evaluate(async()=>{
  ["settingsModal","feedbackModal","zaehlwerkModal","globalSearchModal",
   "measurementEditModal"].forEach(id=>{ if($(id))$(id).hidden=true });
  a2Zustand.bereich=null; a2Zustand.projektId=null; a2Zustand.seite="mehr";
  a2Zeichnen(); await new Promise(f=>setTimeout(f,150));
 });

 // ---- A  Dialog ueber dem Bereich ----------------------------------------
 const A=await page.evaluate(async()=>{
  a2Zustand.seite="mehr"; a2Zeichnen();
  await new Promise(f=>setTimeout(f,150));
  document.querySelector('[data-a2-tu="einstell"]').click();
  await new Promise(f=>setTimeout(f,400));
  const bereich=a2Zustand.bereich?a2Zustand.bereich.id:null;
  $("feedbackModal").hidden=false;                 // ein Dialog darueber
  await new Promise(f=>setTimeout(f,250));
  const knopf=document.querySelector("#a2Kopf [data-a2-bereich-zu]");
  // Liegt der Knopf ueberhaupt obenauf? Genau das macht den Fehler
  // ueberhaupt erreichbar - waere er verdeckt, kaeme man gar nicht hin.
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,300));
  return {bereich, knopfDa:!!knopf,
          dialogNachher:!$("feedbackModal").hidden,
          bereichNachher:!$("settingsModal").hidden,
          zustand:a2Zustand.bereich?a2Zustand.bereich.id:null};
 });
 p(A.bereich==="settingsModal"&&A.knopfDa,"A0 Bereich offen, Knopf oben links da",A);
 p(A.dialogNachher===false,
   "A2 ein Tipp schliesst den DIALOG - den obersten Schirm",A);
 p(A.bereichNachher===true&&A.zustand==="settingsModal",
   "A3 und laesst den Bereich darunter stehen. Ein Schritt zurueck, nicht "
   +"zwei, von denen man einen nicht sieht",A);

 // ---- B  Ohne Dialog darueber --------------------------------------------
 const B=await page.evaluate(async()=>{
  const knopf=document.querySelector("#a2Kopf [data-a2-bereich-zu]");
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,350));
  return {bereichNachher:!$("settingsModal").hidden,
          zustand:a2Zustand.bereich?a2Zustand.bereich.id:null};
 });
 p(B.bereichNachher===false&&B.zustand===null,
   "B1 beim naechsten Tipp geht dann der Bereich selbst zu - unveraendert "
   +"zu vorher",B);

 // ---- C  Projektseite -----------------------------------------------------
 await aufraeumen();
 const C=await page.evaluate(async()=>{
  a2Zustand.seite="projekt"; a2Zustand.projektId=1; a2Zustand.bereich=null;
  a2Zeichnen(); await new Promise(f=>setTimeout(f,200));
  const knopfDa=!!document.querySelector("#a2Kopf [data-a2-zurueck]");
  $("measurementEditModal").hidden=false;          // ein Formular darueber
  await new Promise(f=>setTimeout(f,250));
  const k=document.querySelector("#a2Kopf [data-a2-zurueck]");
  if(k)k.click();
  await new Promise(f=>setTimeout(f,300));
  const mitFormular={form:!$("measurementEditModal").hidden,
                     seite:a2Zustand.seite,projekt:a2Zustand.projektId,
                     nochOffen:zurueckSchirme.slice()};
  // Sauber aufraeumen: der erste Tipp ist ueber js/54 durch
  // measEditZurueck() gelaufen, und das holt die Massaufnahme-Liste
  // zurueck. Fuer den zweiten Fall soll wirklich NICHTS mehr offen sein.
  zurueckSchirme.slice().forEach(id=>{ if($(id))$(id).hidden=true });
  await new Promise(f=>setTimeout(f,300));
  a2Zustand.seite="projekt"; a2Zustand.projektId=1; a2Zustand.bereich=null;
  a2Zeichnen();
  await new Promise(f=>setTimeout(f,250));
  const leer=zurueckSchirme.slice();
  const k2=document.querySelector("#a2Kopf [data-a2-zurueck]");
  if(k2)k2.click();
  await new Promise(f=>setTimeout(f,300));
  return {knopfDa,mitFormular,leer,ohneFormular:{seite:a2Zustand.seite,
          projekt:a2Zustand.projektId}};
 });
 p(C.knopfDa,"C0 die Projektseite hat den Knopf oben links",C);
 p(C.mitFormular.form===false&&C.mitFormular.seite==="projekt"
   &&String(C.mitFormular.projekt)==="1",
   "C1 liegt ein Formular darueber, geht ZUERST das Formular zu - die "
   +"Projektseite bleibt. Sonst stuende man vor einem Formular ueber einer "
   +"fremden Liste",C);
 p(C.leer.length===0,
   "C2 nach dem Aufraeumen ist wirklich kein Schirm mehr offen",C);
 p(C.ohneFormular.seite==="projekte"&&C.ohneFormular.projekt===null,
   "C3 und dann fuehrt der Knopf wie bisher in die Projektliste",C);

 // Der gemeldete Fall betrifft alle Formulare, die man aus einem Projekt
 // oeffnet - nicht nur die Massaufnahme. Jedes davon einzeln.
 const formulare=[["measurementEditModal","Massaufnahme"],
                  ["ausmassEditModal","Ausmass"],
                  ["angebotEditModal","Offerte"],
                  ["leistungEditModal","Leistung"],
                  ["reportScreen","Regierapport"]];
 for(const [id,name] of formulare){
  const r=await page.evaluate(async([id])=>{
   // sauberer Ausgangszustand
   zurueckSchirme.slice().forEach(x=>{ if($(x))$(x).hidden=true });
   await new Promise(f=>setTimeout(f,250));
   a2Zustand.seite="projekt"; a2Zustand.projektId=1; a2Zustand.bereich=null;
   a2Zeichnen(); await new Promise(f=>setTimeout(f,200));
   $(id).hidden=false;
   await new Promise(f=>setTimeout(f,250));
   const k=document.querySelector("#a2Kopf [data-a2-zurueck]");
   const knopfDa=!!k;
   if(k)k.click();
   await new Promise(f=>setTimeout(f,350));
   return {knopfDa, formZu:$(id).hidden===true||!zurueckOffen($(id)),
           seite:a2Zustand.seite, projekt:a2Zustand.projektId};
  },[id]);
  p(r.knopfDa&&r.formZu&&r.seite==="projekt"&&String(r.projekt)==="1",
    "C4."+id+" "+name+": ein Tipp schliesst das Formular und laesst das "
    +"Projekt stehen",r);
 }

 // ---- D  Jeder Bereich ist eingetragen ------------------------------------
 const quelle=fs.readFileSync(path.join(process.cwd(),"js/70-ansicht2.js"),"utf8");
 const geoeffnet=[...quelle.matchAll(/a2BereichStarten\("([a-zA-Z]+)"/g)].map(m=>m[1]);
 const eingetragen=await page.evaluate(()=>Object.keys(A2_BEREICHE));
 const fehlend=[...new Set(geoeffnet)].filter(id=>eingetragen.indexOf(id)<0);
 p(fehlend.length===0,
   "D1 jeder als Bereich geoeffnete Schirm steht in A2_BEREICHE - sonst "
   +"merkt die Kopfzeile nicht, wenn er sich ueber seinen eigenen Knopf "
   +"schliesst, und ihr Zurueck wird ein Knopf ohne Wirkung",
   {fehlend,geoeffnet:[...new Set(geoeffnet)]});

 await aufraeumen();
 const D2=await page.evaluate(async()=>{
  a2Zustand.seite="mehr"; a2Zeichnen();
  await new Promise(f=>setTimeout(f,150));
  document.querySelector('[data-a2-tu="zaehlwerk"]').click();
  await new Promise(f=>setTimeout(f,400));
  const vorher=a2Zustand.bereich?a2Zustand.bereich.id:null;
  $("closeZaehlwerk").click();                     // der EIGENE Knopf
  await new Promise(f=>setTimeout(f,400));
  return {vorher,zustand:a2Zustand.bereich?a2Zustand.bereich.id:null,
          kopf:$("a2Kopf").textContent.replace(/\s+/g," ").trim()};
 });
 p(D2.vorher==="zaehlwerkModal"&&D2.zustand===null,
   "D2 schliesst sich ein Bereich ueber seinen eigenen Knopf, raeumt die "
   +"Kopfzeile mit auf",D2);
 p(!/gelernt/.test(D2.kopf),
   "D3 und nennt danach keinen Bereich mehr, den es nicht gibt",D2);

 // ---- E  Programmatisch bleibt es beim Schliessen -------------------------
 const E=await page.evaluate(async()=>{
  a2Zustand.seite="mehr"; a2Zeichnen();
  await new Promise(f=>setTimeout(f,150));
  document.querySelector('[data-a2-tu="einstell"]').click();
  await new Promise(f=>setTimeout(f,400));
  $("feedbackModal").hidden=false;                 // Dialog darueber
  await new Promise(f=>setTimeout(f,200));
  a2BereichSchliessen();                           // NICHT ueber den Knopf
  await new Promise(f=>setTimeout(f,250));
  return {bereich:!$("settingsModal").hidden,
          zustand:a2Zustand.bereich?a2Zustand.bereich.id:null};
 });
 p(E.bereich===false&&E.zustand===null,
   "E1 Gegenprobe: a2BereichSchliessen() selbst schliesst weiterhin den "
   +"BEREICH. Die neue Regel gilt nur fuer den Knopf - der programmatische "
   +"Weg (a2ProjektOeffnen, v3.166) braucht sie nicht und darf nicht "
   +"stattdessen einen Dialog schliessen",E);

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
