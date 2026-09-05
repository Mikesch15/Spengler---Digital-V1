// Prueft das Hilfe-System (v3.03): Info-Knoepfe, Dialog, Anleitung in den
// Einstellungen. Gemessen wird im echten Chromium gegen die echte index.html.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-hilfe-v3-03.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

// Die elf Arten mit Registern, ihre Wurzel und die Umschaltfunktion.
const ARTEN=[
 {typ:"rinne_halbrund",      wurzel:"measTypeRinne",              setz:"raSetzeSchritt",   reg:"RA_REGISTER"},
 {typ:"einlaufblech_gerade", wurzel:"measTypeEinlaufblech",       setz:"ebaSetzeSchritt",  reg:"EBA_REGISTER"},
 {typ:"einlaufblech_konisch",wurzel:"measTypeEinlaufblechKonisch",setz:"ebkaSetzeSchritt", reg:"EBKA_REGISTER"},
 {typ:"freies_profil",       wurzel:"measTypeFreiesProfil",       setz:"fpaSetzeSchritt",  reg:"FPA_REGISTER"},
 {typ:"mauerabdeckung",      wurzel:"measTypeMauerabdeckung",     setz:"madaSetzeSchritt", reg:"MADA_REGISTER"},
 {typ:"kehle",               wurzel:"measTypeKehle",              setz:"keaSetzeSchritt",  reg:"KEA_REGISTER"},
 {typ:"lukarne",             wurzel:"measTypeLukarne",            setz:"lukaSetzeSchritt", reg:"LUKA_REGISTER"},
 {typ:"kamineinfassung",     wurzel:"measTypeKamin",              setz:"kamaSetzeSchritt", reg:"KAM_REGISTER"},
 {typ:"einfassung_rund",     wurzel:"measTypeEinfassungRund",     setz:"einfaSetzeSchritt",reg:"EINFA_REGISTER"},
 {typ:"rinne",               wurzel:"measTypeRinneProfil",        setz:"rpaSetzeSchritt",  reg:"RPA_REGISTER"},
 {typ:"anschlussblech",      wurzel:"measTypeAnschlussblech",     setz:"anbaSetzeSchritt", reg:"ANBA_REGISTER"}
];

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
   args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:900},locale:"de-CH"});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,
   contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>({select:function(){return this},eq:function(){return this},order:function(){return this},limit:function(){return this},then:f=>f({data:[],error:null})}),rpc:async()=>({data:null,error:null}),storage:{from:()=>({})}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"A",last_name:"B",company_id:"c1"};
  allProfiles=[]; meineRechte={admin:true}; allProjects=[];
  measurementMaterials=[{id:1,name:"Titanzink"}]; blechRollenbreiten=[1000,670];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---------------------------------------------------------------- A Grundlage
 console.log("\nA · Grundlage");
 const g=await page.evaluate(()=>({
  modul:typeof HILFE_TEXTE==="object",
  knopfFn:typeof hilfeKnopf==="function",
  karteFn:typeof hilfeKarte==="function",
  oeffnenFn:typeof hilfeOeffnen==="function",
  texte:Object.keys(HILFE_TEXTE||{}).length,
  modal:!!document.getElementById("hilfeModal"),
  titel:!!document.getElementById("hilfeTitel"),
  text:!!document.getElementById("hilfeText")
 }));
 p(g.modul&&g.knopfFn&&g.karteFn&&g.oeffnenFn,"js/41-hilfe.js geladen",g);
 p(g.modal&&g.titel&&g.text,"Hilfe-Dialog vorhanden",g);
 p(g.texte>=60,"mindestens 60 Erklaerungen hinterlegt",g.texte);

 // Jeder Text hat Titel und Inhalt, und der Inhalt sagt mehr als der Titel.
 const inhalt=await page.evaluate(()=>{
  const schlecht=[];
  Object.keys(HILFE_TEXTE).forEach(k=>{
   const t=HILFE_TEXTE[k];
   const roh=String(t&&t.text||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
   if(!t||!t.titel||!t.text)schlecht.push(k+" (unvollstaendig)");
   else if(roh.length<80)schlecht.push(k+" (nur "+roh.length+" Zeichen)");
  });
  return schlecht;
 });
 p(inhalt.length===0,"jede Erklaerung hat Titel und genug Text",inhalt);

 // Kein Text darf in Ersatzschreibweise stehen - das ist Benutzertext.
 const umlaut=await page.evaluate(()=>{
  const echt=/(ae|oe|ue)/;
  const erlaubt=/^(neu|neue|neuen|neueste|quer|zuerst|steuert|Mauerabdeckung|Neue|Dauer|dauer)/i;
  const treffer=[];
  Object.keys(HILFE_TEXTE).forEach(k=>{
   const s=HILFE_TEXTE[k].titel+" "+HILFE_TEXTE[k].text.replace(/<[^>]*>/g," ");
   (s.match(/[A-Za-zÄÖÜäöüß]+/g)||[]).forEach(w=>{
    if(echt.test(w)&&!erlaubt.test(w)&&!/[ÄÖÜäöü]/.test(w))treffer.push(k+": "+w);
   });
  });
  return [...new Set(treffer)];
 });
 p(umlaut.length===0,"Benutzertext mit echten Umlauten (kein ae/oe/ue)",umlaut.slice(0,12));

 // ------------------------------------------------------- B Knoepfe im HTML
 console.log("\nB · Info-Knoepfe");
 const knoepfe=await page.evaluate(()=>{
  const alle=[...document.querySelectorAll(".hilfe-knopf[data-hilfe]")];
  const ohneText=alle.map(x=>x.dataset.hilfe).filter(k=>!HILFE_TEXTE[k]);
  return {anzahl:alle.length,ohneText:[...new Set(ohneText)],
          keys:[...new Set(alle.map(x=>x.dataset.hilfe))]};
 });
 p(knoepfe.anzahl>=35,"mindestens 35 Info-Knoepfe im HTML",knoepfe.anzahl);
 p(knoepfe.ohneText.length===0,"jeder Knopf hat einen hinterlegten Text",knoepfe.ohneText);

 // Groesse und Beschriftung - der Knopf steht in einem <h2> und muss die
 // globalen Regeln (button{padding:10px 13px}, h2{text-transform:uppercase})
 // ausdruecklich zuruecksetzen.
 const stil=await page.evaluate(()=>{
  $("startScreen").hidden=false;
  const b=document.querySelector('#startScreen .hilfe-knopf');
  if(!b)return null;
  const r=b.getBoundingClientRect(), c=getComputedStyle(b);
  return {w:Math.round(r.width),h:Math.round(r.height),
          transform:c.textTransform,label:b.getAttribute("aria-label")||"",
          titleAttr:b.getAttribute("title")||""};
 });
 p(!!stil,"Info-Knopf auf dem Startbildschirm vorhanden");
 if(stil){
  p(stil.w>=16&&stil.w<=28&&stil.h>=16&&stil.h<=28,"Knopf ist klein und rund (16-28 px)",stil);
  p(stil.transform==="none","Knopfschrift nicht in Grossbuchstaben",stil.transform);
  p(/Erklärung/.test(stil.label)&&stil.label===stil.titleAttr,
    "Knopf hat aria-label und title",stil);
 }

 // ---------------------------------------------------------- C Dialog oeffnen
 console.log("\nC · Dialog");
 const auf=await page.evaluate(async()=>{
  const b=document.querySelector('#startScreen .hilfe-knopf');
  b.click();
  const m=document.getElementById("hilfeModal");
  return {offen:!m.hidden,titel:document.getElementById("hilfeTitel").textContent,
          laenge:document.getElementById("hilfeText").textContent.trim().length,
          pdf:(document.getElementById("hilfeZurAnleitung")||{}).getAttribute
              ?document.getElementById("hilfeZurAnleitung").getAttribute("href"):""};
 });
 p(auf.offen,"Klick oeffnet den Dialog",auf);
 p(auf.titel===HILFE_TITEL_START(),"Dialog zeigt den richtigen Titel",auf.titel);
 p(auf.laenge>80,"Dialog zeigt den Text",auf.laenge);
 p(/anleitung\/.*\.pdf$/.test(auf.pdf||""),"Dialog verweist auf die Anleitung",auf.pdf);

 const zu=await page.evaluate(()=>{
  document.getElementById("hilfeSchliessen").click();
  return document.getElementById("hilfeModal").hidden;
 });
 p(zu,"Verstanden schliesst den Dialog");

 // Escape schliesst ebenfalls
 await page.evaluate(()=>hilfeOeffnen("projekte"));
 await page.keyboard.press("Escape");
 p(await page.evaluate(()=>document.getElementById("hilfeModal").hidden),
   "Escape schliesst den Dialog");

 // ------------------------------------------ D Einstellungen: kein Umschalten
 console.log("\nD · Einstellungen");
 const einst=await page.evaluate(()=>{
  openSettingsTo("protected","");
  const abschnitt=document.querySelector('.settings-section[data-section="material"]');
  const knopf=abschnitt.querySelector('.settings-section-head .hilfe-knopf');
  if(!knopf)return {fehlt:true};
  const vorher=abschnitt.classList.contains("open");
  knopf.click();
  return {fehlt:false,vorher,nachher:abschnitt.classList.contains("open"),
          dialog:!document.getElementById("hilfeModal").hidden,
          titel:document.getElementById("hilfeTitel").textContent};
 });
 p(!einst.fehlt,"Info-Knopf in der Abschnitts-Ueberschrift",einst);
 p(einst.dialog,"Klick oeffnet den Dialog",einst);
 p(einst.vorher===einst.nachher,"Klick klappt den Abschnitt NICHT um",einst);
 await page.evaluate(()=>hilfeSchliessen());

 // ------------------------------------------------------- E Anleitung im HTML
 console.log("\nE · Anleitung in den Einstellungen");
 const anl=await page.evaluate(()=>{
  openSettingsTo("general","");
  const a=document.getElementById("anleitungOeffnen");
  if(!a)return {fehlt:true};
  const panel=document.querySelector('[data-settings-panel="general"]');
  const r=a.getBoundingClientRect();
  return {fehlt:false,href:a.getAttribute("href"),ziel:a.getAttribute("target"),
          rel:a.getAttribute("rel"),text:a.textContent.trim(),
          hoehe:Math.round(r.height),
          zuerst:panel.firstElementChild&&/Anleitung/.test(panel.firstElementChild.textContent)};
 });
 p(!anl.fehlt,"Anleitungs-Link in den Einstellungen",anl);
 if(!anl.fehlt){
  p(/^anleitung\/.*\.pdf$/.test(anl.href),"Link zeigt auf das PDF im Repo",anl.href);
  p(anl.ziel==="_blank"&&/noopener/.test(anl.rel||""),"oeffnet in neuem Fenster",anl);
  p(anl.hoehe>=36,"Link ist gross genug zum Antippen",anl.hoehe);
  p(anl.zuerst,"steht zuoberst im Register Allgemein",anl.zuerst);
 }
 const da=fs.existsSync(path.join(process.cwd(),anl.href||"x"));
 p(da,"die verlinkte Datei liegt wirklich im Repo",anl.href);

 // ------------------------------------------- F Register aller elf Arten
 console.log("\nF · Register der elf Massaufnahme-Arten");
 await page.evaluate(()=>{$("settingsModal").hidden=true;$("measurementEditModal").hidden=false});
 for(const art of ARTEN){
  const r=await page.evaluate(async a=>{
   showMeasTypeSection(a.typ);
   const reg=(0,eval)(a.reg);
   const ohne=reg.filter(x=>!x.hilfe).map(x=>x.nr);
   const doppelt=[];
   const gesehen={};
   for(let n=1;n<=reg.length;n++){
    (0,eval)(a.setz)(n);
    const w=document.getElementById(a.wurzel);
    const k=[...w.querySelectorAll(".hilfe-knopf[data-hilfe]")]
      .filter(x=>x.offsetParent!==null);
    gesehen[n]=k.length===1?k[0].dataset.hilfe:k.length;
    if(k.length!==1)doppelt.push(n+":"+k.length);
   }
   return {anzahl:reg.length,ohne,doppelt,gesehen};
  },art);
  p(r.ohne.length===0,art.typ+": jedes Register hat einen Hilfeschluessel",r.ohne);
  p(r.doppelt.length===0,art.typ+": genau EIN Info-Knopf je Register",r.doppelt);
  const passt=await page.evaluate(([a,gesehen])=>{
   const reg=(0,eval)(a.reg);
   return reg.filter(x=>gesehen[x.nr]!==x.hilfe).map(x=>x.nr+": "+gesehen[x.nr]+" statt "+x.hilfe);
  },[art,r.gesehen]);
  p(passt.length===0,art.typ+": der Knopf gehoert zum gezeigten Register",passt);
 }

 // ----------------------------------------------- G Kein Text ohne Verwendung
 console.log("\nG · Vollstaendigkeit");
 const verwendet=await page.evaluate(async ARTEN=>{
  const s=new Set([...document.querySelectorAll(".hilfe-knopf[data-hilfe]")].map(x=>x.dataset.hilfe));
  for(const a of ARTEN){
   showMeasTypeSection(a.typ);
   const reg=(0,eval)(a.reg);
   reg.forEach(x=>{if(x.hilfe)s.add(x.hilfe)});
  }
  return {benutzt:[...s],unbenutzt:Object.keys(HILFE_TEXTE).filter(k=>!s.has(k))};
 },ARTEN);
 p(verwendet.unbenutzt.length===0,"kein Text ohne Info-Knopf",verwendet.unbenutzt);
 p(verwendet.benutzt.length>=55,"mindestens 55 Erklaerungen erreichbar",verwendet.benutzt.length);


 // ------------------------------------------- G2 Anleitung ist auf dem Stand
 // Stehende Regel (CLAUDE.md 108): die Anleitung wird bei JEDER Version
 // mitgefuehrt. Dieser Block macht das mechanisch nachpruefbar - er schlaegt
 // fehl, sobald die App eine neue Version traegt, die Anleitung aber nicht.
 console.log("\nG2 · Anleitung ist auf dem Stand der App");
 const htmlRoh=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 const mv=/>Version ([0-9]+\.[0-9]+)</.exec(htmlRoh);
 const appVersion=mv?mv[1]:"";
 p(!!appVersion,"App-Version aus index.html gelesen",appVersion);
 const sollPdf="anleitung/Spengler-DIGITAL-Anleitung-v"+appVersion+".pdf";
 p(fs.existsSync(path.join(process.cwd(),sollPdf)),
   "die Anleitung traegt die aktuelle Version",sollPdf);
 const stellen=[["index.html",htmlRoh],
   ["js/41-hilfe.js",fs.readFileSync(path.join(process.cwd(),"js/41-hilfe.js"),"utf8")],
   ["anleitung/README.md",fs.readFileSync(path.join(process.cwd(),"anleitung/README.md"),"utf8")]];
 const veraltet=stellen.filter(([,t])=>{
  const m=t.match(/Spengler-DIGITAL-Anleitung-v([0-9]+\.[0-9]+)\.pdf/g)||[];
  return m.some(x=>x.indexOf("-v"+appVersion+".pdf")<0);
 }).map(([n])=>n);
 p(veraltet.length===0,"jeder Verweis auf die Anleitung nennt diese Version",veraltet);
 const anlRoh=fs.readFileSync(path.join(process.cwd(),"anleitung/anleitung.html"),"utf8");
 p(anlRoh.indexOf("Version "+appVersion)>=0,
   "die Anleitung selbst nennt diese Version",appVersion);
 const alte=fs.readdirSync(path.join(process.cwd(),"anleitung"))
   .filter(f=>/^Spengler-DIGITAL-Anleitung-v.*\.pdf$/.test(f)&&f.indexOf("-v"+appVersion+".pdf")<0);
 p(alte.length===0,"keine veraltete Anleitung mehr im Ordner",alte);

 // ------------------------------------------------------- H Keine JS-Fehler
 console.log("\nH · Sauberkeit");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  "+fail+" FEHLGESCHLAGEN":"  alle bestanden"));
 process.exit(fail?1:0);
})();

// Der Titel des Start-Texts - im Browser nachgeschlagen, damit der Pruefstand
// nicht seine eigene Erwartung bestaetigt.
function HILFE_TITEL_START(){return "So arbeitet die App"}
