// Prueft die Sperre gegen das "change" beim Neuzeichnen - ueber ALLE elf
// Register-Module, nicht nur ueber das eine, in dem der Fehler gefunden wurde.
//
// Der Fehler (CLAUDE.md 103.4, gemessen in js/38): Chromium feuert auf einem
// Eingabefeld, das gerade den Fokus hat, beim Ersetzen des Inhalts noch ein
// "change" - und der Knoten meldet sich dabei als weiterhin im Dokument
// (document.contains(e.target) === true). Der delegierte Handler schrieb den
// ALTEN Feldwert dadurch in den GERADE FRISCH gesetzten Zustand zurueck.
//
// Bis v3.03 gab es die Sperre nur in js/38. Die zehn uebrigen Module haben
// dieselbe Bauform und hatten denselben schmalen Weg.
//
// Gemessen wird nicht "steht das Wort Zeichnet im Code", sondern die Wirkung:
// echt in ein Feld tippen (der Fokus bleibt darin), dann waehrend dieses
// Fokus die Zuruecksetzen-Funktion des Moduls aufrufen und pruefen, dass der
// getippte Wert NICHT im frischen Zustand steht.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-change-sperre-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const SENTINEL="8642";   // ein Wert, der in keinem Modul ein Vorgabewert ist

const ARTEN=[
 {typ:"rinne_halbrund",      wurzel:"measTypeRinne",               setz:"raSetzeSchritt",   reg:"RA_REGISTER",   reset:"rinneAufnahmeZuruecksetzen", flag:"raZeichnet"},
 {typ:"einlaufblech_gerade", wurzel:"measTypeEinlaufblech",        setz:"ebaSetzeSchritt",  reg:"EBA_REGISTER",  reset:"ebaZuruecksetzen",           flag:"ebaZeichnet"},
 {typ:"einlaufblech_konisch",wurzel:"measTypeEinlaufblechKonisch", setz:"ebkaSetzeSchritt", reg:"EBKA_REGISTER", reset:"ebkaZuruecksetzen",          flag:"ebkaZeichnet"},
 {typ:"freies_profil",       wurzel:"measTypeFreiesProfil",        setz:"fpaSetzeSchritt",  reg:"FPA_REGISTER",  reset:"fpaZuruecksetzen",           flag:"fpaZeichnet"},
 {typ:"mauerabdeckung",      wurzel:"measTypeMauerabdeckung",      setz:"madaSetzeSchritt", reg:"MADA_REGISTER", reset:"madaZuruecksetzen",          flag:"madaZeichnet"},
 {typ:"kehle",               wurzel:"measTypeKehle",               setz:"keaSetzeSchritt",  reg:"KEA_REGISTER",  reset:"keaZuruecksetzen",           flag:"keaZeichnet"},
 {typ:"lukarne",             wurzel:"measTypeLukarne",             setz:"lukaSetzeSchritt", reg:"LUKA_REGISTER", reset:"lukaZuruecksetzen",          flag:"lukaZeichnet"},
 {typ:"kamineinfassung",     wurzel:"measTypeKamin",               setz:"kamaSetzeSchritt", reg:"KAM_REGISTER",  reset:"kamaZuruecksetzen",          flag:"kamaZeichnet"},
 {typ:"einfassung_rund",     wurzel:"measTypeEinfassungRund",      setz:"einfaSetzeSchritt",reg:"EINFA_REGISTER",reset:"einfaZuruecksetzen",         flag:"einfaZeichnet"},
 {typ:"rinne",               wurzel:"measTypeRinneProfil",         setz:"rpaSetzeSchritt",  reg:"RPA_REGISTER",  reset:"rinneFormularZuruecksetzen,rpaZuruecksetzen",           flag:"rpaZeichnet"},
 {typ:"anschlussblech",      wurzel:"measTypeAnschlussblech",      setz:"anbaSetzeSchritt", reg:"ANBA_REGISTER", reset:"anbFormularZuruecksetzen,anbaZuruecksetzen",          flag:"anbaZeichnet"}
];

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L"};
  allProfiles=[]; meineRechte={admin:true}; allProjects=[];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000,670];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("measurementEditModal").hidden=false;
 });

 // ---------------------------------------------------- A Die Sperre existiert
 console.log("A · Jedes Register-Modul hat die Sperre");
 for(const a of ARTEN){
  const da=await page.evaluate(f=>{try{return typeof (0,eval)(f)==="boolean"}catch(e){return false}},a.flag);
  p(da,a.typ+": "+a.flag+" ist deklariert");
 }

 // ------------------------------------------- B Sie wirkt (echtes Tippen)
 console.log("\nB · Der getippte Wert leckt nicht in den frischen Zustand");
 for(const a of ARTEN){
  const anzahl=await page.evaluate(x=>{showMeasTypeSection(x.typ);const r=(0,eval)(x.reg);return Array.isArray(r)?r.length:0},a);
  if(!anzahl){p(false,a.typ+": Register nicht gefunden");continue}
  await page.waitForTimeout(200);

  // Listen fuellen, damit ueberhaupt Eingabefelder da sind.
  for(let s=1;s<=anzahl;s++){
   await page.evaluate(([x,schritt])=>{
    (0,eval)(x.setz)(schritt);
    const k=[...document.querySelectorAll("#"+x.wurzel+" button")]
      .find(y=>y.offsetParent!==null&&!y.disabled&&/^\s*(＋|\+)/.test(y.textContent||""));
    if(k)k.click();
   },[a,s]);
   await page.waitForTimeout(100);
  }

  // Ein sichtbares Zahlenfeld mit ID suchen.
  // Nicht jedes Zahlenfeld hat eine ID - Freies Profil, Mauerabdeckung und
  // Rinne sprechen ihre Felder ueber data-Attribute an. Gesucht wird deshalb
  // ueber die Position im Modul, nicht ueber eine ID.
  let treffer=-1;
  for(let s=1;s<=anzahl&&treffer<0;s++){
   await page.evaluate(([x,schritt])=>(0,eval)(x.setz)(schritt),[a,s]);
   await page.waitForTimeout(100);
   treffer=await page.evaluate(w=>{
    const alle=[...document.querySelectorAll("#"+w+' input[type="number"]')];
    return alle.findIndex(x=>x.offsetParent!==null&&!x.disabled&&!x.readOnly);
   },a.wurzel);
  }
  if(treffer<0){p(false,a.typ+": kein sichtbares Zahlenfeld gefunden");continue}

  // ECHT tippen - Chromium feuert das change beim Ersetzen nur, wenn der
  // Benutzer den Wert geaendert hat. Ein per JS gesetzter Wert loest es nicht.
  const loc=page.locator("#"+a.wurzel+' input[type="number"]').nth(treffer);
  await loc.click({clickCount:3});
  await page.keyboard.type(SENTINEL,{delay:12});
  const getippt=await page.evaluate(([w,i])=>{
   const el=[...document.querySelectorAll("#"+w+' input[type="number"]')][i];
   return {wert:el?el.value:null,fokus:document.activeElement===el};
  },[a.wurzel,treffer]);
  p(getippt.wert===SENTINEL&&getippt.fokus===true,a.typ+": Wert getippt, Fokus steht im Feld",getippt);

  // Waehrend der Fokus im Feld steht: Zustand frisch setzen.
  await page.evaluate(x=>{ (0,eval)(x.reset.split(",").map(f=>f.trim()+"()").join(";")); },a);
  await page.waitForTimeout(150);

  // Der frische Zustand darf den Sentinel nirgends tragen. Gemessen wird am
  // Formular selbst: nach dem Zuruecksetzen erneut durch alle Register gehen
  // und jedes Feld lesen.
  let gefunden=false;
  for(let s=1;s<=anzahl&&!gefunden;s++){
   await page.evaluate(([x,schritt])=>(0,eval)(x.setz)(schritt),[a,s]);
   await page.waitForTimeout(80);
   gefunden=await page.evaluate(([w,sen])=>[...document.querySelectorAll("#"+w+" input")]
     .some(x=>String(x.value)===sen),[a.wurzel,SENTINEL]);
  }
  p(!gefunden,a.typ+": der getippte Wert leckt beim Zuruecksetzen nicht in den neuen Zustand");
 }

 // ------------------------------------------------- C Statisch: kein Modul fehlt
 console.log("\nC · Kein Register-Modul ohne Sperre");
 const DATEIEN=["js/28-rinne-aufnahme.js","js/29-einlaufblech-aufnahme.js",
  "js/30-einlaufblech-konisch-aufnahme.js","js/31-freies-profil-aufnahme.js",
  "js/32-mauerabdeckung-aufnahme.js","js/34-kehle-aufnahme.js",
  "js/36-lukarne-aufnahme.js","js/37-kamin-aufnahme.js",
  "js/38-einfassung-aufnahme.js","js/39-rinne-aufnahme.js",
  "js/40-anschlussblech-aufnahme.js"];
 const ohne=[],ungesperrt=[];
 for(const d of DATEIEN){
  const t=fs.readFileSync(path.join(process.cwd(),d),"utf8");
  if(!/let \w+Zeichnet=false;/.test(t)||!/Zeichnet=true;/.test(t)||!/Zeichnet=false\}/.test(t))ohne.push(d);
  // Jeder delegierte input/change-Handler auf der Modulwurzel muss die Sperre
  // als erste Zeile pruefen.
  const handler=t.match(/wurzel\.addEventListener\("(?:input|change)"[\s\S]{0,120}/g)||[];
  if(handler.some(h=>h.indexOf("Zeichnet)return")<0))ungesperrt.push(d);
 }
 p(ohne.length===0,"jedes der elf Module deklariert und setzt die Sperre",ohne);
 p(ungesperrt.length===0,"jeder delegierte input/change-Handler prueft sie",ungesperrt);

 console.log("\nD · Sauberkeit");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-change-sperre: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
