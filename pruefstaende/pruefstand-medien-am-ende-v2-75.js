// Fotos und Skizzen nur im letzten Register (v2.75, verschaerft in v3.02).
// Die elf Arten mit Registern zeigen den Foto-/Skizzenbereich AUSSCHLIESSLICH
// im letzten Register - kein Merker, keine Ausnahme fuer eine Aufnahme, die
// schon Fotos hat. Alle uebrigen Arten zeigen ihn wie bisher sofort.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-medien-am-ende-v2-75.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Ueber evaluate mit Pruefung statt page.click: ein fehlendes oder gesperrtes
// Element soll sauber fehlschlagen, nicht in einen Timeout laufen.
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(200); return r;
}
// Sichtbarkeit gemessen, nicht aus dem hidden-Attribut geschlossen: eine
// Klassenregel mit display wuerde [hidden] schlagen (Abschnitt 59).
const sichtbar=page=>page.evaluate(()=>{
 const e=document.getElementById("measMedienBereich");
 if(!e)return {da:false};
 const st=getComputedStyle(e), r=e.getBoundingClientRect();
 return {da:true,hidden:e.hidden,display:st.display,hoehe:Math.round(r.height),
         sichtbar:st.display!=="none"&&r.height>0};
});
const alleArten=["skizze_foto","einlaufblech_gerade","rinne_halbrund","einlaufblech_konisch",
 "freies_profil","mauerabdeckung","lukarne","anschlussblech","einfassung_rund","kehle","rinne",
 "kamineinfassung"];
// Bis v3.01 stand hier fuer acht der elf Arten faelschlich ebaSetzeSchritt -
// das Blaettern lief dadurch ins Leere und Abschnitt B ging fuer sie trivial
// durch. Jetzt eine vollstaendige Tabelle je Art.
const REGISTER_ARTEN=[
 {typ:"rinne_halbrund",      setz:"raSetzeSchritt",   knopf:"#ra_weiter"},
 {typ:"einlaufblech_gerade", setz:"ebaSetzeSchritt",  knopf:"#eba_weiter"},
 {typ:"einlaufblech_konisch",setz:"ebkaSetzeSchritt", knopf:"#ebka_weiter"},
 {typ:"freies_profil",       setz:"fpaSetzeSchritt",  knopf:"#fpa_weiter"},
 {typ:"mauerabdeckung",      setz:"madaSetzeSchritt", knopf:"#mada_weiter"},
 {typ:"kehle",               setz:"keaSetzeSchritt",  knopf:"#kea_weiter"},
 {typ:"lukarne",             setz:"lukaSetzeSchritt", knopf:"#luka_weiter"},
 {typ:"kamineinfassung",     setz:"kamaSetzeSchritt", knopf:"#kam_weiter"},
 {typ:"einfassung_rund",     setz:"einfaSetzeSchritt",knopf:"#einfa_weiter"},
 {typ:"rinne",               setz:"rpaSetzeSchritt",  knopf:"#rpa_weiter"},
 {typ:"anschlussblech",      setz:"anbaSetzeSchritt", knopf:"#anba_weiter"}];
const MIT_REGISTERN=REGISTER_ARTEN.map(a=>a.typ);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true,massaufnahme:{bearbeiten:"alle",sehen:"alle"}}; allProjects=[];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  rinneFittingTypes=[{id:2,name:"Aussenecke 90°",symbol:"AE90",mass_mm:"-110",angle_deg:"-90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:5,name:"Boden",symbol:"BD",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false}];
  storageSignedUrl=async()=>null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  $("measurementEditModal").hidden=false;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Die uebrigen Arten zeigen den Bereich sofort");
 for(const art of alleArten.filter(a=>MIT_REGISTERN.indexOf(a)<0)){
  await page.evaluate(a=>{
   if(typeof measMedienZuruecksetzen==="function")measMedienZuruecksetzen();
   measPhotos=[];measSketches=[];
   $("measType").value=a; showMeasTypeSection(a);
  },art);
  await page.waitForTimeout(120);
  const s=await sichtbar(page);
  p(s.sichtbar,art+": Fotos und Skizzen sofort sichtbar",s);
 }

 console.log("\nB · Die Register-Arten: nur das letzte Register zeigt ihn");
 for(const {typ:art,setz:setzeSchritt,knopf} of REGISTER_ARTEN){
  await page.evaluate(x=>{
   if(typeof measMedienZuruecksetzen==="function")measMedienZuruecksetzen();
   measPhotos=[];measSketches=[];
   renderSketchGallery();
   $("measType").value=x; showMeasTypeSection(x);
  },art);
  await page.waitForTimeout(150);
  const zu=await sichtbar(page);
  p(!zu.sichtbar,art+": beim Oeffnen zugeklappt",zu);
  p(zu.display==="none",art+": wirklich display:none (nicht nur hidden-Attribut)",zu.display);

  // Die Registerzahl aus der Leiste lesen - sie ist je Art verschieden und
  // hat sich mit v2.80 geaendert. Eine fest angenommene Zahl wuerde hier
  // still am falschen Register messen.
  // Nur die SICHTBARE Leiste zaehlen: die Registerleisten der uebrigen Arten
  // bleiben im DOM stehen (ihre Sektion ist nur ausgeblendet). Bis v3.01 hat
  // der Pruefstand hier alle zusammengezaehlt und mit "anzahl>=6" trotzdem
  // bestanden - er hat dadurch am falschen Register gemessen.
  const anzahl=await page.evaluate(()=>Array.from(document.querySelectorAll(
    "#measurementEditModal .ra-register-knopf")).filter(b=>b.offsetParent!==null).length);
  p(anzahl>=6&&anzahl<=9,art+": die Registerleiste ist da ("+anzahl+" Register)",anzahl);
  // Jedes Register einzeln messen: sichtbar genau im letzten, sonst nie.
  const offen=[];
  for(let n=1;n<=anzahl;n++){
   await page.evaluate(([f,k])=>window[f]?window[f](k):eval(f+"("+k+")"),[setzeSchritt,n]);
   await page.waitForTimeout(100);
   if((await sichtbar(page)).sichtbar)offen.push(n);
  }
  p(offen.length===1&&offen[0]===anzahl,
    art+": sichtbar genau im letzten Register ("+anzahl+")",offen);

  // Auf dem letzten Register ist er schon da - "Fertig" scrollt nur hin.
  const knopfText=await page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent.trim():""},knopf);
  p(/Fertig/.test(knopfText),art+": der Knopf heisst Fertig",knopfText);
  // Die Hervorhebung der VORIGEN Art laeuft 2,5 s und wuerde die gleich
  // gesetzte sonst wieder wegnehmen - das ist eine Eigenheit dieses Laufs,
  // nicht der App. Deshalb hier abwarten, bis nichts mehr markiert ist.
  for(let w=0;w<30;w++){
   const noch=await page.evaluate(()=>!!document.querySelector("#measMedienBereich.ra-ziel"));
   if(!noch)break;
   await page.waitForTimeout(120);
  }
  const r=await klick(page,knopf);
  p(r==="ok",art+": Fertig ist bedienbar",r);
  await page.waitForTimeout(300);
  const nach=await sichtbar(page);
  p(nach.sichtbar,art+": nach Fertig ist der Bereich da",nach);
  const markiert=await page.evaluate(()=>{
   const e=document.getElementById("measMedienBereich");
   return {markiert:e.classList.contains("ra-ziel"),
           foto:!!document.getElementById("measPhotoInput"),
           skizze:!!document.getElementById("addSketch")};
  });
  p(markiert.markiert,art+": und wird kurz hervorgehoben",markiert);
  p(markiert.foto&&markiert.skizze,art+": Foto-Feld und Skizzen-Knopf bedienbar",markiert);

  // Zurueckblaettern klappt ihn wieder zu. Bis v3.01 blieb er offen - so war
  // er nach einem einzigen "Fertig" in JEDEM Register zu sehen.
  await page.evaluate(([f,k])=>window[f]?window[f](k):eval(f+"("+k+")"),[setzeSchritt,2]);
  await page.waitForTimeout(120);
  const zurueck=await sichtbar(page);
  p(!zurueck.sichtbar,art+": beim Zurueckblaettern wieder zugeklappt",zurueck);
 }

 console.log("\nC · Auch eine Aufnahme MIT Fotos zeigt ihn nur im letzten Register");
 // Bis v3.01 war genau das die Ausnahme, die ihn in jedem Register zeigte -
 // vom Betrieb gemeldet und hier gemessen.
 for(const {typ:art,setz:setzeSchritt} of REGISTER_ARTEN){
  await page.evaluate(a=>{
   openMeasurement({id:99,type:a,title:"Mit Foto",date:"2026-09-03",note:"",
     photo_path:"FOTO",sketch_paths:["SKIZZE"],project_id:null,data:{}});
  },art);
  await page.waitForTimeout(220);
  const anzahl=await page.evaluate(()=>Array.from(document.querySelectorAll(
    "#measurementEditModal .ra-register-knopf")).filter(b=>b.offsetParent!==null).length);
  const hatMedien=await page.evaluate(()=>({fotos:measPhotos.length,skizzen:measSketches.length}));
  p(hatMedien.fotos===1&&hatMedien.skizzen===1,art+": die Aufnahme hat wirklich Medien",hatMedien);
  const offen=[];
  for(let n=1;n<=anzahl;n++){
   await page.evaluate(([f,k])=>window[f]?window[f](k):eval(f+"("+k+")"),[setzeSchritt,n]);
   await page.waitForTimeout(90);
   if((await sichtbar(page)).sichtbar)offen.push(n);
  }
  p(offen.length===1&&offen[0]===anzahl,
    art+": trotz Fotos nur im letzten Register ("+anzahl+")",offen);
 }

 console.log("\nD · Eine Aufnahme OHNE Fotos startet ebenfalls zugeklappt");
 for(const art of MIT_REGISTERN){
  const s=await page.evaluate(a=>{
   openMeasurement({id:98,type:a,title:"Ohne Foto",date:"2026-09-03",note:"",
     photo_path:null,sketch_paths:[],project_id:null,data:{}});
   const e=document.getElementById("measMedienBereich"), st=getComputedStyle(e);
   return {display:st.display,hoehe:Math.round(e.getBoundingClientRect().height)};
  },art);
  await page.waitForTimeout(200);
  p(!st_sichtbar(s),art+": Aufnahme ohne Foto startet zugeklappt",s);
 }
 function st_sichtbar(s){return s.display!=="none"&&s.hoehe>0}

 console.log("\nE · Notiz und Speichern bleiben immer erreichbar");
 const rest=await page.evaluate(()=>{
  const n=document.getElementById("measNote"), s=document.getElementById("saveMeasurement");
  return {notiz:!!n&&getComputedStyle(n).display!=="none",
          speichern:!!s&&getComputedStyle(s).display!=="none"};
 });
 p(rest.notiz&&rest.speichern,"Notiz und Speichern sind nicht mit ausgeblendet",rest);

 console.log("\nG · Keine Namenskollision");
 // measHatMedien(m) gibt es bereits in js/24 (Cockpit). Ein gleicher Name
 // hier waere still ueberschrieben worden - genau das ist beim Bauen
 // passiert und hat den Bereich trotz vorhandener Fotos zugeklappt gelassen.
 const namen=await page.evaluate(()=>({
  cockpit:typeof measHatMedien,
  cockpitNimmtArgument:(typeof measHatMedien==="function")&&measHatMedien.length===1,
  sicht:typeof measMedienSichtbarkeit, auf:typeof measMedienAufklappen,
  zurueck:typeof measMedienZuruecksetzen,
  tabelle:(typeof MEAS_MEDIEN_LETZTES_REGISTER==="object")?Object.keys(MEAS_MEDIEN_LETZTES_REGISTER):null,
  liste:(typeof MEAS_MEDIEN_AM_ENDE!=="undefined")?MEAS_MEDIEN_AM_ENDE:null
 }));
 p(namen.cockpit==="function"&&namen.cockpitNimmtArgument,
   "measHatMedien aus js/24 ist unveraendert (nimmt eine Massaufnahme)",namen);
 p(namen.sicht==="function"&&namen.auf==="function"&&namen.zurueck==="function",
   "die drei Funktionen sind da",namen);
 // Eine Tabelle, eine Wahrheit: die Liste wird daraus abgeleitet.
 p(!!namen.tabelle&&namen.tabelle.length===MIT_REGISTERN.length&&
   MIT_REGISTERN.every(a=>namen.tabelle.indexOf(a)>=0),
   "jede Register-Art steht in MEAS_MEDIEN_LETZTES_REGISTER",namen.tabelle);
 p(!!namen.liste&&namen.liste.join(",")===(namen.tabelle||[]).join(","),
   "MEAS_MEDIEN_AM_ENDE ist daraus abgeleitet - sie koennen nicht auseinanderlaufen",namen.liste);

 console.log("\nF · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-medien-am-ende: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
