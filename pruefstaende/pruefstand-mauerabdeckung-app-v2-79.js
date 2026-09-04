// Prueft den Einbau der Mauerabdeckung-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-mauerabdeckung-app-v2-79.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Ueber evaluate mit Pruefung statt page.click: ein fehlendes oder gesperrtes
// Element soll einen sauberen Fehlschlag geben, nicht den Pruefstand in einen
// Timeout laufen lassen - ein abgebrochener Lauf sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{
  const e=document.querySelector(s);
  if(!e)return "fehlt";
  if(e.disabled)return "gesperrt";
  e.click(); return "ok";
 },sel);
 await page.waitForTimeout(160);
 return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(80);
 return true;
}
async function haken(page,sel,an){
 const r=await page.evaluate(([s,a])=>{
  const e=document.querySelector(s);
  if(!e)return "fehlt";
  if(e.disabled)return "gesperrt";
  e.checked=!!a; e.dispatchEvent(new Event("change",{bubbles:true})); return "ok";
 },[sel,an]);
 await page.waitForTimeout(160);
 return r;
}
async function waehle(page,sel,wert){
 const r=await page.evaluate(([s,w])=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  e.value=String(w); e.dispatchEvent(new Event("change",{bubbles:true})); return "ok";
 },[sel,wert]);
 await page.waitForTimeout(160);
 return r;
}
const reg=async(page,n)=>{await page.evaluate(k=>madaSetzeSchritt(k),n);await page.waitForTimeout(160)};
const verlauf=async(page,material,segmente)=>{
 await page.evaluate(([m,s])=>{
  madA.material=String(m);
  madA.segmente=JSON.parse(JSON.stringify(s));
  madA.schieberManuell=false; madaSchieberNeu(); renderMauerabdeckungAufnahme();
 },[material,segmente]);
 await page.waitForTimeout(140);
};
const seg=(laenge,winkel,bl,br)=>({laenge,winkel:winkel||0,bodenLinks:!!bl,bodenRechts:!!br});
const text=page=>page.evaluate(()=>$("mauerabdeckungAufnahme").innerText);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[];
  // Echte Werte des Material-Katalogs (measurement_materials)
  measurementMaterials=[
   {id:1,name:"Aluminium (Aluman)",legacy_key:"aluminium",max_abstand_mm:4000,ab_fixpunkt_mm:2000},
   {id:2,name:"Titanzink",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500},
   {id:3,name:"Kupfer",legacy_key:"kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:6,name:"Stahl, verzinkt",legacy_key:"stahl_verzinkt",max_abstand_mm:8000,ab_fixpunkt_mm:4000}];
  blechRollenbreiten=[];          // -> Standard 1000 / 670
  madBodenMass=0; madSchieberMass=10;   // Stand der laufenden App
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  $("measType").value="mauerabdeckung"; showMeasTypeSection("mauerabdeckung");
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,2));
 if(await page.evaluate(()=>typeof renderMauerabdeckungAufnahme!=="function")){
  console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden (Modul nicht geladen - Abbruch) ===");
  await b.close(); process.exit(1);
 }

 // ---- A · Modul geladen, Fachdatei unangetastet --------------------------
 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderMauerabdeckungAufnahme==="function",
  zurueck:typeof madaZuruecksetzen==="function",
  fuellen:typeof madaFuellen==="function",
  zusatz:typeof madaZusatzDaten==="function",
  // Fachlogik aus js/12b, js/12 und js/29 - unveraendert die Quelle
  grenz:typeof computeMadBoundaries==="function",
  schieber:typeof calcMadSchieber==="function",
  stueck:typeof berechneMadStueckliste==="function",
  profil:typeof madProfilMasse==="function",
  norm:typeof madNormHinweise==="function",
  svg:typeof madProfilSvgAus==="function",
  vorgabe:typeof madBiegeVorgabe==="function",
  dila:typeof calcDilaPositionsInStretch==="function",
  grundriss:typeof generateRinneGrundriss==="function",
  packen:typeof ebaPackeInStreifen==="function",
  register:document.querySelectorAll(".ra-register-knopf").length,
  stummelWeg:$("madStummel")?$("madStummel").hidden:null,
  normwerte:[MAD_MIN_HOEHE,MAD_MIN_HOEHE_WIND]
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/32 ist geladen",da);
 p(da.grenz&&da.schieber&&da.stueck&&da.profil&&da.norm&&da.svg&&da.vorgabe,
   "die Fachfunktionen aus js/12b sind da",da);
 p(da.dila&&da.grundriss,"Verteilung und Grundriss aus js/12 sind da",da);
 p(da.packen,"die Packrechnung aus js/29 ist da",da);
 p(da.register===8,"acht Register",da);
 p(da.stummelWeg===true,"der Stummel ist unsichtbar",da);
 p(da.normwerte[0]===50&&da.normwerte[1]===100,"Normwerte unveraendert (50/100 mm)",da);

 // ---- B · Bruecke ---------------------------------------------------------
 console.log("\nB · Bruecke zum bestehenden Modul");
 await verlauf(page,2,[seg(8000,90,true,false),seg(4000,90),seg(6000,0,false,true)]);
 const br=await page.evaluate(()=>({
  gleich:madSegments===madA.segmente,
  laengen:madSegments.map(s=>s.laenge),
  schieberGlobal:madSchieber.map(s=>Math.round(s.posAbStart)),
  material:$("mad_material").value,
  breite:$("mad_breite").value,
  hL:$("mad_hoeheLinks").value,
  wind:$("mad_windexponiert").checked,
  manuell:$("mad_manuell").checked,
  tab:madaMaterialTabelle()
 }));
 p(br.gleich,"madSegments IST madA.segmente - eine Wahrheit, kein Abgleich",br);
 p(JSON.stringify(br.laengen)==="[8000,4000,6000]","die Segmente stehen in der Fachdatei",br);
 p(JSON.stringify(br.schieberGlobal)==="[2500,5500,10000,14000,16000]",
   "fuenf Schieber - an Boden und Ecken mit halbem Abstand",br);
 p(br.material==="2"&&br.breite==="310"&&br.hL==="50"&&br.wind===false,
   "die Stummelfelder sind aus dem Modell gefuellt",br);
 p(br.tab.label==="Titanzink"&&br.tab.maxAbstand===5000&&br.tab.abEcke===2500,
   "die Abstaende kommen aus dem Material-Katalog",br);

 // ---- C · Register --------------------------------------------------------
 console.log("\nC · Acht Register");
 const kopf=[];
 for(let n=1;n<=8;n++){
  await reg(page,n);
  kopf.push(await page.evaluate(()=>{
   const aktiv=document.querySelector(".ra-register-knopf.aktiv");
   const h2=Array.from(document.querySelectorAll("#mauerabdeckungAufnahme h2")).map(x=>x.textContent.trim());
   return {aktiv:aktiv?aktiv.innerText.trim():null,h2};
  }));
 }
 p(kopf.every((k,i)=>k.aktiv&&k.aktiv.indexOf(String(i+1))===0),
   "jedes Register laesst sich anwaehlen",kopf.map(k=>k.aktiv));
 const fremd=kopf.map((k,i)=>{
  const nrn=k.h2.filter(t=>/^\d+ ·/.test(t)).map(t=>Number(t.split(" ")[0]));
  // Register 3 fasst Boden (3) und Schieber zusammen, Register 4 Profil und
  // Normkontrolle - deshalb erlaubt jedes Register nur seine eigene Nummer.
  return nrn.some(z=>z!==i+1)?{n:i+1,h2:k.h2}:null;
 }).filter(Boolean);
 p(fremd.length===0,"jedes Register zeigt nur seinen eigenen Inhalt",fremd);
 const behalten=await page.evaluate(()=>{
  const vorher=JSON.stringify(madA);
  for(const n of [1,2,3,4,5,6,7,8,9,2]) madaSetzeSchritt(n);
  return JSON.stringify(madA)===vorher;
 });
 p(behalten,"durch alle Register blaettern veraendert das Modell nicht");
 const sichtbar=await page.evaluate(()=>{
  madaSetzeSchritt(9);
  const s=$("mada_register"), a=s.querySelector(".ra-register-knopf.aktiv");
  const sr=s.getBoundingClientRect(), ar=a.getBoundingClientRect();
  return {links:ar.left>=sr.left-1,rechts:ar.right<=sr.right+1};
 });
 p(sichtbar.links&&sichtbar.rechts,"das aktive Register bleibt in der Leiste sichtbar",sichtbar);
 const nav=await page.evaluate(()=>{
  madaSetzeSchritt(1); const z1=$("mada_zurueck").disabled;
  madaSetzeSchritt(8);
  return {z1,w9:$("mada_weiter").textContent,gesperrt:$("mada_weiter").disabled};
 });
 p(nav.z1,"auf dem ersten Register ist Zurueck gesperrt",nav);
 p(/Fertig/.test(nav.w9)&&!nav.gesperrt,"auf dem letzten heisst der Knopf Fertig und ist bedienbar",nav);

 // ---- D · Verlauf ---------------------------------------------------------
 console.log("\nD · Verlauf erfassen");
 await page.evaluate(()=>{madaZuruecksetzen()});
 await reg(page,2);
 p(await klick(page,"#mada_segPlus")==="ok","Knopf + Segment hinzufuegen");
 await tippe(page,'[data-mada-laenge="0"]',"8000");
 const einS=await page.evaluate(()=>({
  laenge:madA.segmente[0].laenge,
  wert:document.querySelector('[data-mada-laenge="0"]').value,
  fokus:document.activeElement.dataset?document.activeElement.dataset.madaLaenge:null,
  gesperrt:document.querySelector('[data-mada-winkel="0"]').disabled,
  zf:$("mada_zfLaenge")?$("mada_zfLaenge").textContent:null
 }));
 p(einS.laenge===8000&&einS.wert==="8000","Laenge 8000 mm zeichenweise getippt",einS);
 p(einS.fokus==="0","das Feld behaelt den Fokus",einS);
 p(einS.gesperrt,"beim letzten Segment ist der Winkel gesperrt",einS);
 p(/8[’']000 mm/.test(einS.zf||""),"die Kennzahl folgt beim Tippen mit",einS);
 await klick(page,"#mada_segPlus");
 await tippe(page,'[data-mada-laenge="1"]',"4000");
 await tippe(page,'[data-mada-winkel="0"]',"90");
 const zwei=await page.evaluate(()=>({
  laengen:madA.segmente.map(s=>s.laenge),
  winkel:madA.segmente.map(s=>s.winkel),
  karten:document.querySelectorAll("#mauerabdeckungAufnahme .ra-zeile").length,
  grenzen:madaVerlaufDaten().boundaries.map(x=>x.typ)
 }));
 p(JSON.stringify(zwei.laengen)==="[8000,4000]"&&zwei.winkel[0]===90,
   "zweites Segment mit Ecke erfasst",zwei);
 p(zwei.karten===2,"zwei Segmentkarten",zwei);
 p(zwei.grenzen[1]==="ecke","Winkel 90 macht die Grenze zum Fixpunkt",zwei);
 p(await klick(page,'[data-mada-flip="0"]')==="ok","Winkel umkehren");
 p(await page.evaluate(()=>madA.segmente[0].winkel)===-90,"der Winkel ist jetzt -90");
 // Boden setzen, dann verschieben: er gehoert an die AUSSENENDEN und darf
 // nicht mitwandern - computeMadBoundaries() liest ihn nur dort.
 const segBoden=await haken(page,'[data-mada-boden-l="0"]',true);
 p(segBoden==="ok"&&await page.evaluate(()=>madA.segmente[0].bodenLinks===true),
   "das Boden-Kaestchen an der Segmentkarte wirkt",segBoden);
 p(await klick(page,'[data-mada-runter="0"]')==="ok","Segment nach unten schieben");
 const nachSchub=await page.evaluate(()=>({
  laengen:madA.segmente.map(s=>s.laenge),
  boden:madA.segmente.map(s=>[!!s.bodenLinks,!!s.bodenRechts])
 }));
 p(JSON.stringify(nachSchub.laengen)==="[4000,8000]","die Reihenfolge hat sich geaendert",nachSchub);
 p(nachSchub.boden[1][0]===false,"der Boden wandert nicht mit ins Innere",nachSchub);
 await haken(page,'[data-mada-boden-l="0"]',false);
 p(await page.evaluate(()=>madA.segmente[0].bodenLinks===false)
   &&await page.evaluate(()=>madA.segmente[1].bodenLinks===false),
   "und laesst sich wieder abwaehlen");
 // Boden am letzten Segment: dieselbe Attributschreibweise pruefen.
 const segBodenR=await haken(page,'[data-mada-boden-r="1"]',true);
 p(segBodenR==="ok"&&await page.evaluate(()=>madA.segmente[1].bodenRechts===true),
   "auch das Kaestchen Boden am Ende wirkt",segBodenR);
 await haken(page,'[data-mada-boden-r="1"]',false);
 p(await klick(page,'[data-mada-weg="1"]')==="ok","Segment loeschen");
 p(await page.evaluate(()=>madA.segmente.length)===1,"nur das gewaehlte Segment ist weg");

 // ---- E · Boden und Schieber ---------------------------------------------
 console.log("\nE · Boden und Schieber");
 await verlauf(page,2,[seg(8000,0)]);
 const ohne=await page.evaluate(()=>madaSchieberAktiv().map(s=>Math.round(s.posAbStart)));
 await reg(page,3);
 const bodenDa=await haken(page,"#mada_bodenL",true);
 p(bodenDa==="ok","Kaestchen Boden am Anfang",bodenDa);
 const bl=await page.evaluate(()=>({
  an:madA.segmente[0].bodenLinks,
  typ:madaVerlaufDaten().boundaries[0].typ,
  name:madaVerlaufDaten().boundaries[0].name,
  schieber:madaSchieberAktiv().map(s=>Math.round(s.posAbStart))
 }));
 p(bl.an&&bl.typ==="ecke"&&bl.name==="Boden","der Boden wirkt wie ein Fixpunkt",bl);
 p(JSON.stringify(ohne)==="[4000]"&&bl.schieber.length===2,
   "ohne Boden 1 Schieber, mit Boden 2",{ohne,bl});
 await haken(page,"#mada_bodenL",false);
 p(await haken(page,"#mada_bodenR",true)==="ok","Kaestchen Boden am Ende");
 p(await page.evaluate(()=>madA.segmente[0].bodenRechts)===true,"auch am Ende gesetzt");
 // automatisch / von Hand
 await verlauf(page,2,[seg(22000,0)]);
 const auto=await page.evaluate(()=>madaSchieberAktiv().map(s=>Math.round(s.posAbStart)));
 p(auto.length===4&&auto.every((x,i)=>i===0||x-auto[i-1]<=5000),
   "22'000 mm Titanzink ergeben vier Schieber, keiner ueber 5.00 m",auto);
 await reg(page,3);
 p(await haken(page,"#mada_manuell",true)==="ok","Kaestchen Schieber von Hand");
 const vh=await page.evaluate(()=>({
  uebernommen:madA.schieber.map(s=>Math.round(s.posAbStart)),
  felder:document.querySelectorAll("[data-mada-schieber]").length
 }));
 p(JSON.stringify(vh.uebernommen)===JSON.stringify(auto)&&vh.felder===4,
   "die gerechnete Liste wird zum Bearbeiten uebernommen",vh);
 await tippe(page,'[data-mada-schieber="0"]',"3000");
 const geaendert=await page.evaluate(()=>({
  pos:Math.round(madA.schieber[0].posAbStart),
  fokus:!!document.activeElement.dataset.madaSchieber
 }));
 p(geaendert.pos===3000&&geaendert.fokus,"Position von Hand geaendert, Fokus bleibt",geaendert);
 p(await klick(page,"#mada_schieberAuto")==="ok","Zurueck zur Rechnung");
 p(JSON.stringify(await page.evaluate(()=>madA.schieber.map(s=>Math.round(s.posAbStart))))
   ===JSON.stringify(auto),"die Rechnung stellt die Positionen wieder her");

 // ---- F · Material --------------------------------------------------------
 console.log("\nF · Materialwechsel");
 const je={};
 for(const [id,name,max,ecke] of [[1,"Aluminium (Aluman)",4000,2000],[2,"Titanzink",5000,2500],
                                  [3,"Kupfer",6000,3000],[6,"Stahl, verzinkt",8000,4000]]){
  const r=await page.evaluate(m=>{
   madA.material=String(m);
   madA.segmente=[{laenge:22000,winkel:0,bodenLinks:false,bodenRechts:false}];
   madA.schieberManuell=false; madaSchieberNeu();
   const t=madaMaterialTabelle();
   return {label:t.label,max:t.maxAbstand,ecke:t.abEcke,anzahl:madaSchieberAktiv().length};
  },id);
  je[name]=r.anzahl;
  p(r.label===name&&r.max===max&&r.ecke===ecke,name+": "+max+" / "+ecke+" mm",r);
 }
 p(je["Aluminium (Aluman)"]===5&&je["Titanzink"]===4&&je["Kupfer"]===3&&je["Stahl, verzinkt"]===2,
   "derselbe Verlauf ergibt je Material 5/4/3/2 Schieber",je);

 // ---- G · Profil, Gefaelle, Biegewinkel, Wind, Norm ----------------------
 console.log("\nG · Profil und Norm");
 await verlauf(page,2,[seg(6000,0)]);
 await reg(page,4);
 const felder=await page.evaluate(()=>Array.from(document.querySelectorAll("[data-mada-profil]")).map(f=>f.dataset.madaProfil));
 p(["breite","gefaelle","hoeheLinks","hoeheRechts","umschlagLinks","umschlagRechts",
    "biegeLinks","biegeRechts","saum"].every(k=>felder.indexOf(k)>=0),
   "alle neun Profilfelder sind da",felder);
 const prof=await page.evaluate(()=>madaProfilMasse());
 p(prof.abwicklung===460,"Abwicklung 10+15+50+310+50+15+10 = 460 mm",prof);
 await tippe(page,'[data-mada-profil="breite"]',"400");
 const nb=await page.evaluate(()=>({
  abw:madaProfilMasse().abwicklung,
  anzeige:$("mada_abwicklung")?$("mada_abwicklung").textContent:null,
  fokus:document.activeElement.dataset?document.activeElement.dataset.madaProfil:null,
  svg:!!document.querySelector("#mada_profilBild svg"),
  nan:$("mada_profilBild")?/NaN|Infinity/.test($("mada_profilBild").innerHTML):true
 }));
 p(nb.abw===550,"Gesamtbreite 400 -> Abwicklung 550 mm",nb);
 p(/550/.test(nb.anzeige)&&nb.fokus==="breite","die Anzeige folgt mit, der Fokus bleibt",nb);
 p(nb.svg&&!nb.nan,"der Querschnitt ist gezeichnet, ohne NaN",nb);
 const gef=await page.evaluate(()=>{
  madA.profil.breite=310; madA.profil.gefaelle=0; const a0=madaProfilMasse();
  madA.profil.gefaelle=5;  const a5=madaProfilMasse();
  madA.profil.gefaelle=10; const a10=madaProfilMasse();
  return {dy:[Math.round(a0.dy),Math.round(a5.dy),Math.round(a10.dy)],
          abw:[a0.abwicklung,a5.abwicklung,a10.abwicklung],
          vg5:madBiegeVorgabe(5),vg10:madBiegeVorgabe(10)};
 });
 p(JSON.stringify(gef.dy)==="[0,27,55]","der Hoehenversatz folgt dem Gefaelle",gef);
 p(gef.abw[0]===gef.abw[1]&&gef.abw[1]===gef.abw[2],
   "die Abwicklung haengt NICHT vom Gefaelle ab",gef);
 p(gef.vg5.links===95&&gef.vg5.rechts===85&&gef.vg10.links===100,
   "die Vorgabe der Biegewinkel ist 90 +/- Gefaelle",gef);
 const bw=await page.evaluate(()=>{
  madA.profil.gefaelle=5; madA.profil.biegeLinks=""; madA.profil.biegeRechts="";
  const leer=madaProfilMasse(), svgLeer=madProfilSvgAus(leer);
  madA.profil.biegeLinks=110; madA.profil.biegeRechts=70;
  const setz=madaProfilMasse(), svgSetz=madProfilSvgAus(setz);
  return {leer:[leer.wL,leer.wR],setz:[setz.wL,setz.wR],
          abwGleich:leer.abwicklung===setz.abwicklung,anders:svgLeer!==svgSetz};
 });
 p(bw.leer[0]===95&&bw.leer[1]===85,"leeres Feld -> Vorgabe aus dem Gefaelle",bw);
 p(bw.setz[0]===110&&bw.setz[1]===70,"eingetragene Winkel schlagen die Vorgabe",bw);
 p(bw.abwGleich&&bw.anders,"die Abwicklung bleibt, die Zeichnung aendert sich",bw);
 await page.evaluate(()=>{madA.profil.biegeLinks=95;madA.profil.biegeRechts=85;
   madA.profil.hoeheLinks=60;madA.profil.hoeheRechts=60;madA.profil.windexponiert=false;
   renderMauerabdeckungAufnahme()});
 p(await page.evaluate(()=>madaNormHinweise().length)===0,"60 mm ohne Wind: kein Hinweis");
 p(await haken(page,"#mada_wind",true)==="ok","Schalter windexponierte Lage");
 const wind=await page.evaluate(()=>({
  imModell:madA.profil.windexponiert,inFach:madaProfilMasse().wind,
  h:madaNormHinweise(),anzeige:$("mada_norm")?$("mada_norm").innerText:""}));
 p(wind.imModell&&wind.inFach,"der Schalter kommt in der Fachlogik an",wind);
 p(wind.h.length===2&&/100 mm/.test(wind.h[0])&&/100 mm/.test(wind.anzeige),
   "60 mm mit Wind: beide Schenkel gemeldet (min. 100 mm)",wind);
 const norm=await page.evaluate(()=>{
  madA.profil.windexponiert=false; madA.profil.hoeheLinks=40; madA.profil.hoeheRechts=60;
  renderMauerabdeckungAufnahme();
  return {h:madaNormHinweise(),anzeige:$("mada_norm")?$("mada_norm").innerText:"",
   inKontrolle:madaPruefungen().filter(x=>/Norm verlangt/.test(x.text)).length};
 });
 p(norm.h.length===1&&/links 40 mm/.test(norm.h[0]),"40 mm links gemeldet, 60 mm rechts nicht",norm);
 p(/40 mm/.test(norm.anzeige)&&norm.inKontrolle===1,"steht im Register und in der Kontrolle",norm);

 // ---- H · Stueckliste und Zuschnitt --------------------------------------
 console.log("\nH · Stueckliste und Zuschnitt aus Rollenblech");
 await page.evaluate(()=>{madA.profil={...MADA_PROFIL_VORGABE};renderMauerabdeckungAufnahme()});
 await verlauf(page,2,[seg(8000,90,true,false),seg(4000,90),seg(6000,0,false,true)]);
 await reg(page,5);
 const st=await page.evaluate(()=>{
  const l=madaStueckliste();
  return {anzahl:l.length,summe:l.reduce((s,x)=>s+x.abstand,0),
   erste:l[0],letzte:l[l.length-1],
   zeilen:document.querySelectorAll("#mauerabdeckungAufnahme tbody tr").length};
 });
 p(st.anzahl===8,"acht Zuschnittstuecke",st);
 p(st.summe===18000,"die Abstaende summieren sich auf die Gesamtlaenge",st);
 p(st.erste.von==="Boden"&&st.letzte.bis==="Boden","erstes und letztes Stueck am Boden",st);
 p(st.erste.zuschnitt-st.erste.abstand===10,"Zuschnitt = Abstand + Zugabe (Boden 0 + Schieber 10)",st.erste);
 p(st.zeilen===8,"acht Zeilen in der Tabelle",st);
 await reg(page,6);
 const rp=await page.evaluate(()=>{
  const r=madaRollenPlan();
  return {abw:r.abwicklung,tafel:r.tafelLaenge,netto:r.netto,
   streifen:(r.verteilung&&r.verteilung.streifen||[]).length,
   optimal:r.verteilung?r.verteilung.optimal:null,
   moeglich:r.moeglich.map(m=>[m.breite,m.jeTafel,m.tafeln,Number(m.flaeche.toFixed(4)),Number(m.verschnitt.toFixed(4))]),
   bestes:r.bestes?r.bestes.breite:null,
   text:$("mauerabdeckungAufnahme").innerText};
 });
 p(rp.abw===460,"Abwicklung 460 mm ist die Streifenbreite",rp);
 p(rp.tafel===3020&&rp.streifen===8,"Tafel = laengstes Stueck, acht Streifen",rp);
 const r1000=rp.moeglich.find(m=>m[0]===1000), r670=rp.moeglich.find(m=>m[0]===670);
 p(!!r1000&&!!r670,"beide Standardrollen stehen in der Liste",rp.moeglich);
 p(!!r1000&&r1000[1]===2&&r1000[2]===4&&Math.abs(r1000[3]-12.08)<1e-6,
   "1'000 mm: 2 Streifen je Tafel, 4 Tafeln, 12.08 m²",r1000);
 p(!!r670&&r670[1]===1&&r670[2]===8&&Math.abs(r670[3]-16.1872)<1e-4,
   "670 mm: 1 Streifen je Tafel, 8 Tafeln, 16.19 m²",r670);
 p(!!r1000&&Math.abs(r1000[4]-(12.08-rp.netto))<1e-6,"Verschnitt = Tafelflaeche - Zuschnitte netto",
   {r1000,netto:rp.netto});
 p(rp.bestes===1000,"die breitere Rolle braucht weniger Material und steht zuoberst",rp);
 p(/Streifen/.test(rp.text)&&/Stück 1/.test(rp.text),"die Belegung nennt jedes Stueck mit Nummer");
 // Ein Fall, bei dem eine gierige Verteilung MEHR Streifen braucht: zwei
 // kurze Stuecke muessen hintereinander in einen Streifen passen. Ohne die
 // Packrechnung aus js/29 kaeme hier ein Streifen zu viel heraus.
 const packen=await page.evaluate(()=>{
  const stand=JSON.parse(JSON.stringify(madA));
  madA.segmente=[{laenge:4000,winkel:0,bodenLinks:false,bodenRechts:false},
                 {laenge:1500,winkel:0,bodenLinks:false,bodenRechts:false},
                 {laenge:1500,winkel:0,bodenLinks:false,bodenRechts:false}];
  madA.schieberManuell=false; madaSchieberNeu();
  const r=madaRollenPlan();
  const streifen=((r.verteilung||{}).streifen||[]).map(s=>s.stuecke.map(x=>x.laenge));
  madA=stand; madaSchieberNeu();
  return {tafel:r.tafelLaenge,streifen};
 });
 p(packen.streifen.length===2,
   "4000 + 1500 + 1500 kommen mit zwei Streifen aus",packen);
 p(packen.streifen.some(s=>s.length===2&&s[0]+s[1]<=packen.tafel+1e-9),
   "zwei kurze Stuecke liegen hintereinander in einem Streifen",packen);
 const schmal=await page.evaluate(()=>{
  blechRollenbreiten=[330,250];
  const r=madaRollenPlan();
  renderMauerabdeckungAufnahme();
  const t=$("mauerabdeckungAufnahme").innerText;
  const w=madaPruefungen().some(x=>/keine Rolle ist breit genug/.test(x.text));
  blechRollenbreiten=[];
  return {moeglich:r.moeglich.length,zuSchmal:r.zuSchmal,text:t,warnung:w};
 });
 p(schmal.moeglich===0&&schmal.zuSchmal.length===2
   &&/(breit genug|so breit wie die Abwicklung)/.test(schmal.text)
   &&/Zu schmal für dieses Profil/.test(schmal.text)&&schmal.warnung,
   "zu schmale Rollen werden gesagt, nicht still gerechnet",schmal);

 // ---- I · Ausmass ---------------------------------------------------------
 console.log("\nI · Ausmass");
 await page.evaluate(()=>renderMauerabdeckungAufnahme());
 await reg(page,7);
 const aus=await page.evaluate(()=>({
  zeilen:madaAusmassZeilen(),flaeche:madaFlaecheM2(),
  tabelle:Array.from(document.querySelectorAll("#mauerabdeckungAufnahme tbody")).map(t=>t.innerText).join("\n")
 }));
 const was=aus.zeilen.map(z=>z.bezeichnung).join(" | ");
 p(aus.zeilen.length===6,"sechs Ausmasspositionen",was);
 p(/Mauerabdeckung Titanzink/.test(was)&&/Zuschnitte/.test(was)&&/Ecken/.test(was)
   &&/Schieber/.test(was)&&/Boden/.test(was),"Material, Zuschnitte, Ecken, Schieber und Boden",was);
 p(Math.abs(aus.flaeche-18*0.46)<1e-6,"Blechflaeche 18 m × 0.46 m = 8.28 m²",aus.flaeche);
 p(!/Art\.|Artikel|Preis|CHF|Fr\./.test(aus.tabelle),"keine Artikelnummern und keine Preise",
   {t:aus.tabelle.slice(0,200)});
 p(aus.zeilen.every(z=>z.herkunft&&z.herkunft.length>3),"jede Position nennt ihre Herkunft");

 // ---- J · Kontrolle -------------------------------------------------------
 console.log("\nJ · Kontrolle");
 const heil=await page.evaluate(()=>madaPruefungen().filter(x=>x.art==="fehler").length);
 p(heil===0,"eine vollstaendige Aufnahme hat keinen Fehler",heil);
 const kaputt=await page.evaluate(()=>{
  const stand=JSON.parse(JSON.stringify(madA));
  madA.segmente[1].laenge=0; madA.segmente[0].winkel=270;
  madA.profil.breite=0; madA.profil.hoeheLinks=0;
  madA.schieberManuell=true; madA.schieber=[{posAbStart:-5}];
  const r=madaPruefungen();
  madA=stand; madaSchieberNeu();
  return r.map(x=>x.art+": "+x.text);
 });
 const tx=kaputt.join(" | ");
 p(/Segment 2: keine gültige Länge/.test(tx),"fehlende Laenge gemeldet",tx);
 p(/Winkel 270° liegt ausserhalb/.test(tx),"unmoeglicher Winkel gemeldet",tx);
 p(/keine Gesamtbreite/.test(tx),"fehlende Gesamtbreite gemeldet",tx);
 p(/Schieber 1: Position -5 mm liegt nicht/.test(tx),"Schieber ausserhalb gemeldet",tx);
 const punkt=await page.evaluate(()=>{
  madaSetzeSchritt(8);
  const knopf=()=>document.querySelectorAll(".ra-register-knopf")[7]||document.createElement("div");
  madA.profil.hoeheLinks=30; renderMauerabdeckungAufnahme();
  const orange=!!knopf().querySelector(".ra-register-punkt");
  madA.segmente[0].laenge=0; renderMauerabdeckungAufnahme();
  const rot=!!knopf().querySelector(".ra-register-punkt.fehler");
  madA.profil.hoeheLinks=50; madA.segmente[0].laenge=8000;
  madaSchieberNeu(); renderMauerabdeckungAufnahme();
  const ohne=!!knopf().querySelector(".ra-register-punkt");
  return {orange,rot,ohne};
 });
 p(punkt.orange&&punkt.rot&&!punkt.ohne,
   "das Register traegt einen Punkt - rot bei einem Fehler, weg wenn alles stimmt",punkt);

 // ---- K · Fotos erst am Ende ---------------------------------------------
 console.log("\nK · Fotos und Skizze erst am Ende");
 await page.evaluate(()=>{measMedienAufgeklappt=false;measPhotos=[];
   measSketches=[];showMeasTypeSection("mauerabdeckung")});
 await page.waitForTimeout(120);
 const zu=await page.evaluate(()=>{
  const b2=$("measMedienBereich"), st=getComputedStyle(b2);
  return {hidden:b2.hidden,display:st.display,hoehe:Math.round(b2.getBoundingClientRect().height)};
 });
 p(zu.hidden&&zu.display==="none"&&zu.hoehe===0,"waehrend der Register ist der Fotobereich zu",zu);
 await reg(page,8);
 // Der letzte Weiter-Knopf IST seit v2.80 der Fertig-Knopf - es gibt keinen
 // eigenen mehr, genau wie in den uebrigen vier Arten.
 const fertigMada=await page.evaluate(()=>$("mada_weiter").textContent.trim());
 p(/Fertig/.test(fertigMada)&&/Fotos/.test(fertigMada),
   "der letzte Knopf heisst Fertig > Fotos und Speichern",fertigMada);
 p(await klick(page,"#mada_weiter")==="ok","und ist bedienbar");
 const auf=await page.evaluate(()=>{
  const b2=$("measMedienBereich"), st=getComputedStyle(b2);
  return {hidden:b2.hidden,display:st.display,hoehe:Math.round(b2.getBoundingClientRect().height),
   markiert:b2.classList.contains("ra-ziel"),
   notiz:!!$("measNote"),speichern:!!$("saveMeasurement")};
 });
 p(!auf.hidden&&auf.display!=="none"&&auf.hoehe>40,"nach Fertig ist er offen",auf);
 p(auf.markiert&&auf.notiz&&auf.speichern,"er wird hervorgehoben, Notiz und Speichern stehen darunter",auf);
 const mitFoto=await page.evaluate(()=>{
  measMedienAufgeklappt=false; measPhotos=["data:image/png;base64,AA"];
  showMeasTypeSection("mauerabdeckung");
  const b2=$("measMedienBereich");
  const r=!b2.hidden;
  measPhotos=[]; measMedienAufgeklappt=false; showMeasTypeSection("mauerabdeckung");
  return r;
 });
 p(mitFoto,"eine Aufnahme, die schon ein Foto hat, zeigt ihn sofort");
 const andere=await page.evaluate(()=>{
  const r={};
  // kehle hat seit v2.83 Register, lukarne seit v2.87 - beide gehoeren nicht mehr dazu
  ["skizze_foto","anschlussblech"].forEach(t=>{
   measMedienAufgeklappt=false; showMeasTypeSection(t);
   r[t]=$("measMedienBereich").hidden;
  });
  showMeasTypeSection("mauerabdeckung");
  return r;
 });
 p(Object.values(andere).every(x=>x===false),"die Arten ohne Register zeigen ihn weiterhin sofort",andere);

 // ---- L · Speichern und Laden --------------------------------------------
 console.log("\nL · Speicher-Payload und Wiederoeffnen");
 await verlauf(page,2,[seg(8000,90,true,false),seg(4000,90),seg(6000,0,false,true)]);
 const payload=await page.evaluate(()=>{
  $("measTitle").value="Attika Nord"; $("measDate").value="2026-09-04";
  $("measNote").value="Bemerkung";
  return buildMeasurementFromForm();
 });
 const d=payload.data;
 p(payload.type==="mauerabdeckung"&&payload.title==="Attika Nord","Typ, Titel und Datum",{t:payload.type,ti:payload.title});
 ["material","profil","abwicklung","segments","schieber","boundaries","gesamtlaenge",
  "stueckliste","bodenMass","schieberMass"].forEach(k=>{
  p(d[k]!==undefined,"die bisherige Feld "+k+" ist weiterhin im Payload",Object.keys(d));
 });
 p(d.flaeche_m2!==undefined&&Array.isArray(d.ausmass)&&d.rollen!==undefined,
   "dazu die drei neuen Felder",Object.keys(d));
 p(d.segments.length===3&&d.segments[0].bodenLinks===true&&d.segments[2].bodenRechts===true,
   "Segmente und Boeden im Payload",d.segments);
 p(d.stueckliste.length===8&&d.gesamtlaenge===18000,"Stueckliste und Gesamtlaenge",{n:d.stueckliste.length,L:d.gesamtlaenge});
 p(d.profil.abwicklung===460&&d.abwicklung===460,"Profil und Abwicklung",d.profil);
 p(typeof d.flaeche_m2==="number"&&Math.abs(d.flaeche_m2-8.28)<0.001,"Blechflaeche im Payload",d.flaeche_m2);
 p(Array.isArray(d.ausmass)&&d.ausmass.length===6,"Ausmass im Payload",d.ausmass&&d.ausmass.length);
 p(!!(d.rollen&&d.rollen.bestes)&&d.rollen.bestes.breite===1000,"Rollenplan im Payload",d.rollen);
 p(d.bodenMass===0&&d.schieberMass===10,"die Zugaben reisen mit",{b:d.bodenMass,s:d.schieberMass});
 const wieder=await page.evaluate(pl=>{
  madaZuruecksetzen();
  const leerJetzt=madA.segmente.length;
  madaFuellen(pl.data);
  return {leerJetzt,
   material:madA.material,segmente:madA.segmente,
   schieber:madA.schieber.length,manuell:madA.schieberManuell,
   profil:madA.profil,
   stueck:madaStueckliste().length,ausmass:madaAusmassZeilen().length,
   abw:madaProfilMasse().abwicklung};
 },payload);
 p(wieder.leerJetzt===0,"eine neue Aufnahme ist leer",wieder);
 p(wieder.material==="2"&&wieder.segmente.length===3&&wieder.segmente[0].laenge===8000
   &&wieder.segmente[0].bodenLinks===true,"Material, Segmente und Boeden sind wieder da",wieder.segmente);
 p(wieder.schieber===5&&wieder.manuell===true,
   "die gespeicherten Schieber werden uebernommen und nicht ueberschrieben",wieder);
 p(wieder.profil.breite===310&&wieder.profil.hoeheLinks===50&&wieder.abw===460,
   "die Profilmasse sind wieder da",wieder.profil);
 p(wieder.stueck===8&&wieder.ausmass===6,"Stueckliste und Ausmass rechnen identisch",wieder);
 // Ein Datensatz im Format bis v2.78
 const alt=await page.evaluate(()=>{
  const d2={material:"3",profil:{breite:300,gef:5,hL:60,hR:60,umL:15,umR:15,saum:10},
   abwicklung:460,segments:[{laenge:5000,winkel:0,bodenLinks:false,bodenRechts:false}],
   schieber:[],boundaries:[],gesamtlaenge:5000,stueckliste:[],bodenMass:0,schieberMass:10};
  madaFuellen(d2);
  return {material:madA.material,seg:madA.segmente.length,
   boden:[!!madA.segmente[0].bodenLinks,!!madA.segmente[0].bodenRechts],
   profil:madA.profil,wind:madA.profil.windexponiert,
   biege:[madA.profil.biegeLinks,madA.profil.biegeRechts],
   stueck:madaStueckliste().length,abw:madaProfilMasse().abwicklung};
 });
 p(alt.material==="3"&&alt.seg===1&&alt.profil.breite===300&&alt.profil.hoeheLinks===60,
   "ein Datensatz im Format bis v2.78 oeffnet unveraendert",alt);
 p(alt.wind===false&&alt.biege[0]===95&&alt.biege[1]===85,
   "fehlende Felder bekommen die Vorgabe, es wird nichts erfunden",alt);
 p(alt.boden[0]===false&&alt.boden[1]===false,
   "und es wird kein Boden angedichtet, den der Datensatz nicht hatte",alt);
 p(alt.stueck===1&&alt.abw===470,"und er rechnet",alt);

 // ---- M · Druck ------------------------------------------------------------
 console.log("\nM · Druck");
 // printMeasurement() ist async - ohne await bleibt die Seite leer.
 const druck=await page.evaluate(async()=>{
  const seiten=[];
  const echt=window.open;
  window.open=()=>({document:{write:h=>seiten.push(h),close(){}},focus(){},print(){},set onload(f){}});
  madaZuruecksetzen();
  madA.material="2";
  madA.segmente=[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},
                 {laenge:4000,winkel:90,bodenLinks:false,bodenRechts:false},
                 {laenge:6000,winkel:0,bodenLinks:false,bodenRechts:true}];
  madA.schieberManuell=false; madaSchieberNeu(); renderMauerabdeckungAufnahme();
  const neu=buildMeasurementFromForm();
  await printMeasurement({...neu,id:1,project_id:null,note:""},{listen:"alle"});
  // profil ist genau das, was madProfilMasse() liefert und seit je her
  // gespeichert wird - einschliesslich dy und schraeg, die die Zeichnung
  // braucht.
  const altD={material:"3",
   profil:{breite:300,hL:60,hR:60,umL:15,umR:15,saum:10,gef:5,wind:false,
           dy:300*Math.tan(5*Math.PI/180),schraeg:300,wL:95,wR:85,abwicklung:460},
   abwicklung:460,segments:[{laenge:5000,winkel:0,bodenLinks:false,bodenRechts:false}],
   schieber:[],boundaries:[{pos:0,typ:"ende",name:"Start"},{pos:5000,typ:"ende",name:"Ende"}],
   gesamtlaenge:5000,stueckliste:[{nr:1,von:"Start",bis:"Ende",abstand:5000,zuschnitt:5000,pos:5000,schieberIndex:null}],
   bodenMass:0,schieberMass:10};
  await printMeasurement({id:2,type:"mauerabdeckung",title:"Alt",date:"2026-01-01",note:"",data:altD},{listen:"alle"});
  window.open=echt;
  return seiten;
 });
 p(druck.length===2,"beide Druckseiten sind entstanden",druck.length);
 const neuS=druck[0]||"", altS=druck[1]||"";
 p(/Profil \(Querschnitt\)/.test(neuS)&&/Grundriss/.test(neuS)&&/Segmente/.test(neuS)
   &&/Schieber und Zuschnitt/.test(neuS),"die bisherigen Abschnitte sind alle da");
 p(/Blechfläche/.test(neuS)&&/Zuschnitt aus Rollenblech/.test(neuS)&&/Ausmass/.test(neuS),
   "dazu Blechflaeche, Rollenblech und Ausmass");
 p(!/NaN|undefined|Infinity/.test(neuS),"kein NaN oder undefined im Druck",
   {t:(neuS.match(/NaN|undefined|Infinity/)||[""])[0]});
 p(/Profil \(Querschnitt\)/.test(altS)&&!/Zuschnitt aus Rollenblech/.test(altS)
   &&!/Blechfläche/.test(altS),"der alte Datensatz druckt ohne die neuen Abschnitte");
 p(!/NaN|undefined|Infinity/.test(altS),"und ebenfalls ohne NaN");

 // ---- N · Handy und Tablet -------------------------------------------------
 console.log("\nN · Handy und Tablet");
 await page.evaluate(()=>{
  madA.material="2";
  madA.segmente=[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},
                 {laenge:4000,winkel:90,bodenLinks:false,bodenRechts:false},
                 {laenge:6000,winkel:0,bodenLinks:false,bodenRechts:true}];
  madA.schieberManuell=false; madaSchieberNeu(); renderMauerabdeckungAufnahme();
 });
 for(const breite of [320,360,412,768,1280]){
  await page.setViewportSize({width:breite,height:900});
  const schlimm=[];
  for(let n=1;n<=9;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>{
    const w=document.documentElement;
    // Was in einem seitwaerts scrollenden Behaelter liegt (Registerleiste,
    // .scroll um breite Tabellen), darf ueber den Rand hinausragen.
    const inScroller=el=>{
     for(let e=el.parentElement;e;e=e.parentElement){
      const o=getComputedStyle(e).overflowX;
      if(o==="auto"||o==="scroll")return true;
     }
     return false;
    };
    const ueber=[];
    document.querySelectorAll("#mauerabdeckungAufnahme *").forEach(el=>{
     const b2=el.getBoundingClientRect();
     if(b2.width>0&&b2.right>w.clientWidth+1&&!inScroller(el))
      ueber.push(el.tagName+"."+(el.className||""));
    });
    return {scroll:w.scrollWidth>w.clientWidth+1,ueber:ueber.slice(0,3)};
   });
   if(r.scroll||r.ueber.length)schlimm.push({n,...r});
  }
  p(schlimm.length===0,breite+" px: nichts laeuft seitlich hinaus",schlimm);
 }
 await page.setViewportSize({width:412,height:1400});

 // ---- O · keine JavaScript-Fehler -----------------------------------------
 console.log("\nO · Keine JavaScript-Fehler");
 p(fehler.length===0,"kein einziger JavaScript-Fehler in der ganzen Sitzung",fehler.slice(0,3));

 console.log("\npruefstand-mauerabdeckung-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});
