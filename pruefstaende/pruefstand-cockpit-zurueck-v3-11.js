// Prueft das klappbare Projekt-Cockpit und die Zurueck-Taste (v3.11).
//
// WORUM ES GEHT (Rueckmeldung des Betriebs):
//  1. "das objekt cockpit muss uebersichtlicher werden, mache alles zum
//     ausklappen" - bis v3.10 standen alle Arbeitsbereiche offen
//     untereinander, ein Projekt war mehrere Bildschirme lang.
//  2. "mache das wenn ich auf dem handy zurueck klicke, dass es einen
//     bildschirm zurueck springt und nicht die app schliesst" - bis v3.10
//     verwendete die App die Verlaufsliste des Browsers ueberhaupt nicht.
//
// GEMESSEN, NICHT BEHAUPTET: Sichtbarkeit ueber getComputedStyle und
// echte Rechtecke (eine Klassenregel mit display schlaegt [hidden],
// CLAUDE.md 59/71.5/115.9), die Zurueck-Taste ueber page.goBack().
//
// WAS HIER NICHT GEPRUEFT WIRD: die Datenbank. Diese Runde aendert keine
// Migration, keine Policy und keine Funktion - nur die Oberflaeche.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-cockpit-zurueck-v3-11.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

const STUB=`window.__zeilen=[];window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const f={_t:t,_eq:{}};['select','order','limit','range','in'].forEach(k=>f[k]=()=>f);
  f.eq=(s,v)=>{f._eq[s]=v;return f};
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>{let d=(window.__zeilen||[]).filter(z=>z.__t===f._t);
   Object.keys(f._eq).forEach(s=>{d=d.filter(z=>String(z[s])===String(f._eq[s]))});
   return Promise.resolve({data:d,error:null}).then(r)};
  return f},
 storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}})};`;

const A="aaaa1111-1111-1111-1111-111111111111";

const anmelden=(page)=>page.evaluate(A=>{
 currentProfile={id:A,role:"admin",first_name:"Anna",last_name:"Admin"};
 allProfiles=[{id:A,first_name:"Anna",last_name:"Admin"}];
 meineRechte={admin:true}; workflowAktiv=true;
 allProjects=[
  {id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG",status:"offen"},
  {id:8,name:"Neubau",object:"Bahnhofweg 3, 3011 Bern",order_no:"2026-2",customer:"Bau AG",status:"offen"}];
 measurementMaterials=[{id:2,name:"Titanzink"}];
 try{localStorage.removeItem("sd_cockpitKlapp")}catch(e){}
 $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
},A);

// Ein Klick auf ein verstecktes Element laesst page.click() haengen und
// bricht den Lauf ab - das saehe aus wie "keine Fehler" (CLAUDE.md 78).
const klick=async(page,sel,name)=>{
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
   if(!e)return "fehlt";
   const b=e.getBoundingClientRect();
   if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
   e.click(); return "ok"},sel);
 if(r!=="ok"){fail++;console.log("  FEHLGESCHLAGEN: Klick auf "+(name||sel)+" – "+r)}
 await page.waitForTimeout(200);
 return r==="ok";
};

const stand=(page)=>page.evaluate(()=>{
 const sicht=e=>{if(!e)return false;const r=e.getBoundingClientRect();
   return getComputedStyle(e).display!=="none"&&r.height>0};
 return {
  abschnitte:[...document.querySelectorAll("#projectCockpitModal .klapp-kopf[data-klapp]")].map(k=>{
    const box=k.closest(".klapp"), body=box.querySelector(".klapp-body");
    return {key:k.dataset.klapp,offen:box.classList.contains("open"),
     kartenSichtbar:sicht(box),koerperSichtbar:sicht(body),
     aria:k.getAttribute("aria-expanded"),
     kopfText:(k.innerText||"").replace(/\s+/g," ").trim(),
     kopfHoehe:Math.round(k.getBoundingClientRect().height)}}),
  hoehe:Math.round($("projectCockpitModal").querySelector(".modalbox").getBoundingClientRect().height),
  alleKnopf:($("cockpitAlleKlapp").textContent||"").trim(),
  ausstiegSichtbar:sicht($("cockpitAusstieg")),
  zurueckSichtbar:sicht($("cockpitBack")),
  gemerkt:(()=>{try{return JSON.parse(localStorage.getItem("sd_cockpitKlapp")||"{}")}catch(e){return null}})(),
  stapel:(typeof zurueckSchirme!=="undefined")?zurueckSchirme.slice():["js/54 fehlt"],
  tiefe:(typeof zurueckTiefe!=="undefined")?zurueckTiefe:-1
 };
});

const abschnitt=(s,key)=>s.abschnitte.find(a=>a.key===key)||{};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await anmelden(page);
 // Die Zurueck-Taste des Geraets. Verlaesst sie die Seite, ist genau das
 // der gemeldete Fehler - dann muss der Lauf mit klarer Meldung enden und
 // nicht an der naechsten Messung abstuerzen (ein abgebrochener Lauf saehe
 // aus wie "keine Fehler", CLAUDE.md 78).
 const zurueckTaste=async(was)=>{
  await page.goBack(); await page.waitForTimeout(450);
  const drin=await page.evaluate(()=>location.href.indexOf("index.html")>0).catch(()=>false);
  if(drin)return true;
  fail++; console.log("  FEHLGESCHLAGEN: "+was+" – die Zurueck-Taste hat die APP VERLASSEN");
  console.log("\n"+ok+"/"+(ok+fail)+" bestanden  (Abbruch: die Seite wurde verlassen)");
  await b.close(); process.exit(1);
 };
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ---- A - Das Cockpit ist zugeklappt uebersichtlich ---------------------
 console.log("\nA - Uebersicht statt Bildschirmkilometer");
 await page.evaluate(()=>openProjectCockpit(7)); await page.waitForTimeout(400);
 let s=await stand(page);
 p(s.abschnitte.length>=8,"jeder Bereich ist ein klappbarer Abschnitt",s.abschnitte.map(a=>a.key));
 const zu=s.abschnitte.filter(a=>a.kartenSichtbar&&!a.offen).map(a=>a.key);
 p(zu.indexOf("meas")>=0&&zu.indexOf("am")>=0&&zu.indexOf("rep")>=0
   &&zu.indexOf("files")>=0&&zu.indexOf("verlauf")>=0,
   "die Arbeitsbereiche und der Verlauf starten zugeklappt",zu);
 p(abschnitt(s,"stand").offen===true,"der Arbeitsstand bleibt offen - er IST die Uebersicht");
 p(s.abschnitte.filter(a=>a.kartenSichtbar).every(a=>a.offen===a.koerperSichtbar),
   "zugeklappt ist der Inhalt wirklich weg (gemessen, nicht nur hidden)",
   s.abschnitte.map(a=>[a.key,a.offen,a.koerperSichtbar]));
 p(s.hoehe<1400,"das ganze Cockpit passt in rund einen Bildschirm",s.hoehe);
 const hoehen=s.abschnitte.filter(a=>a.kartenSichtbar).map(a=>a.kopfHoehe);
 p(hoehen.every(h=>h>=34),"jede Ueberschrift ist gross genug zum Antippen",hoehen);
 p(/–|\d/.test(abschnitt(s,"meas").kopfText),
   "die Anzahl steht in der Ueberschrift - auch zugeklappt sieht man, was da ist",
   abschnitt(s,"meas").kopfText);
 p(s.abschnitte.filter(a=>a.kartenSichtbar).every(a=>a.aria===(a.offen?"true":"false")),
   "aria-expanded sagt die Wahrheit");

 // ---- B - Auf- und Zuklappen -------------------------------------------
 console.log("\nB - Auf- und Zuklappen");
 await klick(page,'#projectCockpitModal .klapp-kopf[data-klapp="meas"]',"Ueberschrift Massaufnahmen");
 s=await stand(page);
 p(abschnitt(s,"meas").offen&&abschnitt(s,"meas").koerperSichtbar,"ein Tipp auf die Ueberschrift klappt auf");
 p(abschnitt(s,"meas").aria==="true","aria-expanded wandert mit");
 await klick(page,'#projectCockpitModal .klapp-kopf[data-klapp="meas"]',"Ueberschrift Massaufnahmen");
 s=await stand(page);
 p(!abschnitt(s,"meas").offen&&!abschnitt(s,"meas").koerperSichtbar,"noch ein Tipp klappt wieder zu");

 // Tastatur: die Ueberschrift ist ein role="button".
 await page.evaluate(()=>{const k=document.querySelector('#projectCockpitModal .klapp-kopf[data-klapp="am"]');
   k.focus(); k.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))});
 await page.waitForTimeout(150);
 s=await stand(page);
 p(abschnitt(s,"am").offen,"Enter klappt auf (Tastaturbedienung)");
 await page.evaluate(()=>{const k=document.querySelector('#projectCockpitModal .klapp-kopf[data-klapp="am"]');
   k.dispatchEvent(new KeyboardEvent("keydown",{key:" ",bubbles:true}))});
 await page.waitForTimeout(150);
 p(!(await stand(page)).abschnitte.find(a=>a.key==="am").offen,"Leertaste klappt zu");

 // Der Info-Knopf darin darf NICHT mit aufklappen (CLAUDE.md 107.4).
 const vorInfo=(await stand(page)).abschnitte.find(a=>a.key==="rep").offen;
 await klick(page,'#projectCockpitModal .klapp-kopf[data-klapp="rep"] .hilfe-knopf',"Info-Knopf");
 s=await stand(page);
 p(abschnitt(s,"rep").offen===vorInfo,"der Info-Knopf in der Ueberschrift klappt nichts auf");
 p(await page.evaluate(()=>{const e=$("hilfeModal");return !!e&&!e.hidden}),
   "der Info-Knopf oeffnet stattdessen die Hilfe");
 await klick(page,"#hilfeSchliessen","Hilfe schliessen");

 // Alles auf einmal.
 await klick(page,"#cockpitAlleKlapp","Alles aufklappen");
 s=await stand(page);
 p(s.abschnitte.filter(a=>a.kartenSichtbar).every(a=>a.offen),"\u201eAlles aufklappen\u201c oeffnet jeden sichtbaren Abschnitt");
 p(/zuklappen/i.test(s.alleKnopf),"der Knopf heisst danach \u201eAlles zuklappen\u201c",s.alleKnopf);
 const hochOffen=s.hoehe;
 await klick(page,"#cockpitAlleKlapp","Alles zuklappen");
 s=await stand(page);
 p(s.abschnitte.filter(a=>a.kartenSichtbar).every(a=>!a.offen),"und schliesst wieder alles");
 p(hochOffen>s.hoehe*1.5,"offen ist das Cockpit deutlich laenger als zugeklappt",{offen:hochOffen,zu:s.hoehe});

 // ---- C - Der Zustand wird gemerkt -------------------------------------
 console.log("\nC - Das Geraet merkt sich, was offen war");
 await klick(page,'#projectCockpitModal .klapp-kopf[data-klapp="meas"]',"Massaufnahmen aufklappen");
 s=await stand(page);
 p(s.gemerkt&&s.gemerkt.meas===true,"der Zustand landet im Geraetespeicher",s.gemerkt);
 await page.evaluate(()=>openProjectCockpit(8)); await page.waitForTimeout(400);
 s=await stand(page);
 p(abschnitt(s,"meas").offen,"beim naechsten Projekt ist der Abschnitt wieder offen");
 p(!abschnitt(s,"files").offen,"was zu war, bleibt zu");
 await page.reload({waitUntil:"load"}); await page.waitForTimeout(400);
 await anmelden(page);
 // anmelden() raeumt den Speicher - hier bewusst wieder setzen und pruefen,
 // dass die Vorgabe greift, wenn nichts gemerkt ist.
 await page.evaluate(()=>openProjectCockpit(7)); await page.waitForTimeout(400);
 s=await stand(page);
 p(!abschnitt(s,"meas").offen&&abschnitt(s,"stand").offen,
   "ohne gemerkten Zustand gilt die Vorgabe: nur der Arbeitsstand offen");

 // ---- D - Sprungziele klappen auf --------------------------------------
 console.log("\nD - Wer hinspringt, findet den Abschnitt offen");
 await klick(page,'#projectCockpitModal [data-cockpit-goto="rep"]',"Arbeitsstand-Zeile Regierapporte");
 s=await stand(page);
 p(abschnitt(s,"rep").offen,"ein Klick auf die Arbeitsstand-Zeile klappt den Abschnitt auf");
 await page.evaluate(()=>{$("cockpitAmBody").innerHTML=
   '<div class="report-row"><button data-open-project-ausmass="5">x</button></div>'});
 await page.evaluate(()=>cockpitTrefferHervorheben({kind:"ausmass",id:5}));
 await page.waitForTimeout(150);
 s=await stand(page);
 p(abschnitt(s,"am").offen,"ein Treffer aus der Suche klappt seinen Abschnitt auf");

 // ---- E - Der Rueckweg verschwindet nie --------------------------------
 console.log("\nE - Der Ausstieg bleibt immer erreichbar");
 await klick(page,"#cockpitAlleKlapp","Alles zuklappen (falls offen)");
 await klick(page,"#cockpitAlleKlapp","Alles zuklappen");
 s=await stand(page);
 p(s.ausstiegSichtbar&&s.zurueckSichtbar,
   "\u201eZurueck zur Projektuebersicht\u201c steht ausserhalb der klappbaren Verlaufskarte",
   {ausstieg:s.ausstiegSichtbar,zurueck:s.zurueckSichtbar});
 p(await page.evaluate(()=>{const a=$("cockpitAusstieg"),v=$("cockpitVerlaufCard");
   return !!a&&!!v&&!v.contains(a)}),"und liegt nachweislich nicht in ihr");

 // ---- F - Die Zurueck-Taste des Geraets --------------------------------
 console.log("\nF - Zurueck-Taste: ein Schirm zurueck statt App zu");
 s=await stand(page);
 p(s.stapel&&s.stapel[s.stapel.length-1]==="projectCockpitModal",
   "das offene Cockpit liegt auf dem Rueckweg-Stapel",s.stapel);
 p(s.tiefe===s.stapel.length,"fuer jeden offenen Schirm liegt genau ein Platzhalter im Verlauf",
   {tiefe:s.tiefe,stapel:s.stapel});
 await zurueckTaste("Zurueck-Taste");
 let z=await page.evaluate(()=>({cockpit:$("projectCockpitModal").hidden,
   projekte:$("projectsModal").hidden,stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1,
   url:location.href.indexOf("index.html")>0}));
 p(z.cockpit===true&&z.projekte===false,"Zurueck schliesst das Cockpit und zeigt die Projektuebersicht",z);
 p(z.url,"die App wurde dabei NICHT verlassen");
 p(z.tiefe===z.stapel.length,"Stapel und Verlauf sind wieder gleich lang",z);
 await zurueckTaste("Zurueck-Taste");
 z=await page.evaluate(()=>({projekte:$("projectsModal").hidden,start:$("startScreen").hidden,
   stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1,url:location.href.indexOf("index.html")>0}));
 p(z.projekte===true&&z.start===false,"noch einmal Zurueck fuehrt auf den Startbildschirm",z);
 p(z.stapel.length===0&&z.tiefe===0,"dort liegt kein Platzhalter mehr - die Taste darf die App verlassen",z);
 p(z.url,"und die Seite steht immer noch");

 // Zwei Schirme uebereinander: der oberste geht zuerst.
 await page.evaluate(()=>openProjectCockpit(7)); await page.waitForTimeout(300);
 await klick(page,'#projectCockpitModal .klapp-kopf[data-klapp="meas"]',"Massaufnahmen aufklappen");
 await klick(page,'#cockpitMeasCard [data-cockpit-new="meas"]',"Neue Massaufnahme");
 z=await page.evaluate(()=>({wahl:$("measTypeChooserModal").hidden,stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"]}));
 p(z.wahl===false&&z.stapel[z.stapel.length-1]==="measTypeChooserModal",
   "die Typ-Auswahl legt sich oben auf den Stapel",z);
 await zurueckTaste("Zurueck-Taste");
 z=await page.evaluate(()=>({wahl:$("measTypeChooserModal").hidden,
   cockpit:$("projectCockpitModal").hidden,stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1}));
 p(z.wahl===true&&z.cockpit===false,"Zurueck schliesst nur den obersten Schirm",z);
 p(z.tiefe===z.stapel.length,"der Verlauf bleibt im Gleichschritt",z);

 // Der Rueckweg einer Massaufnahme fuehrt ins Cockpit, nicht ins Leere.
 await page.evaluate(A=>{openMeasurement({id:11,project_id:7,type:"skizze_foto",title:"Dach",
   date:"2026-09-01",data:{},created_by:A,workflow_status:"in_bearbeitung",
   sketch_paths:[],photo_paths:[]}); measEditReturnTo="projectCockpit";},A);
 await page.waitForTimeout(300);
 z=await page.evaluate(()=>({form:$("measurementEditModal").hidden,stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"]}));
 p(z.form===false&&z.stapel[z.stapel.length-1]==="measurementEditModal",
   "das Massaufnahme-Formular liegt oben auf dem Stapel",z);
 await page.goBack(); await page.waitForTimeout(500);
 z=await page.evaluate(()=>({form:$("measurementEditModal").hidden,
   cockpit:$("projectCockpitModal").hidden,stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1}));
 p(z.form===true&&z.cockpit===false,
   "Zurueck nimmt den vorgesehenen Rueckweg (measEditZurueck) und landet im Cockpit",z);
 p(z.tiefe===z.stapel.length,"auch danach stimmen Stapel und Verlauf ueberein",z);

 // Ein Schlag schliesst viele: goToStart.
 await page.evaluate(()=>{$("settingsModal").hidden=false});
 await page.waitForTimeout(150);
 const vorStart=await page.evaluate(()=>({stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1}));
 p(vorStart.stapel.length>=2,"mehrere Schirme offen",vorStart);
 await page.evaluate(()=>goToStart()); await page.waitForTimeout(500);
 z=await page.evaluate(()=>({stapel:(typeof zurueckSchirme!=='undefined')?zurueckSchirme.slice():["js/54 fehlt"],tiefe:(typeof zurueckTiefe!=='undefined')?zurueckTiefe:-1,
   start:$("startScreen").hidden,url:location.href.indexOf("index.html")>0}));
 p(z.stapel.length===0&&z.tiefe===0,
   "\u201eStart\u201c schliesst alles auf einmal und gibt alle Platzhalter zurueck",z);
 p(z.start===false&&z.url,"der Startbildschirm steht, die App wurde nicht verlassen",z);

 // ---- G - Handy und Tablet ---------------------------------------------
 console.log("\nG - Breiten");
 await page.evaluate(()=>openProjectCockpit(7)); await page.waitForTimeout(400);
 for(const w of [320,390,412,768]){
  await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(200);
  const m=await page.evaluate(()=>{
   const box=$("projectCockpitModal").querySelector(".modalbox");
   const raus=[...box.querySelectorAll("*")].filter(e=>{
     const r=e.getBoundingClientRect();
     return r.width>0&&r.right>window.innerWidth+1});
   return {ueber:raus.length,scroll:document.documentElement.scrollWidth>window.innerWidth+1,
     kopf:Math.round(document.querySelector('#projectCockpitModal .klapp-kopf[data-klapp="meas"]').getBoundingClientRect().height)};
  });
  p(m.ueber===0&&!m.scroll&&m.kopf>=34,"bei "+w+" px passt alles und die Ueberschrift bleibt antippbar",m);
 }
 await page.setViewportSize({width:412,height:900});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\n"+ok+"/"+(ok+fail)+" bestanden");
 await b.close();
 process.exit(fail?1:0);
})();
