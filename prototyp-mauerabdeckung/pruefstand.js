"use strict";
// ===========================================================================
// Prüfstand · Prototyp Mauerabdeckung
// Läuft in echtem Chromium gegen die eigenständige Testapp – also gegen genau
// die Datei, die auf dem Tablet geöffnet wird.
//
// Aufruf:  SP=<Ordner mit node_modules> node prototyp-mauerabdeckung/pruefstand.js
// ===========================================================================
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs"), path=require("path");
const APP="file://"+path.join(process.cwd(),"prototyp-mauerabdeckung","mauerabdeckung-testapp.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

// Zeichenweise eintippen - so, wie ein Mensch es tut.
async function tippe(page,waehler,text){
 await page.evaluate(w=>{const f=document.querySelector(w);f.focus();f.value=""},waehler);
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(60);
}
// Klick über evaluate: ein fehlendes oder gesperrtes Element würde page.click
// in einen Timeout laufen lassen, und ein abgebrochener Prüfstand sieht aus
// wie "keine Fehler".
async function klick(page,waehler){
 const da=await page.evaluate(w=>{
  const el=document.querySelector(w);
  if(!el||el.disabled)return false;
  el.click(); return true;
 },waehler);
 await page.waitForTimeout(140);
 return da;
}
async function haken(page,waehler,an){
 const da=await page.evaluate(([w,a])=>{
  const el=document.querySelector(w);
  if(!el||el.disabled)return false;
  el.checked=!!a; el.dispatchEvent(new Event("change",{bubbles:true})); return true;
 },[waehler,an]);
 await page.waitForTimeout(140);
 return da;
}
async function waehle(page,waehler,wert){
 const da=await page.evaluate(([w,v])=>{
  const f=document.querySelector(w);
  if(!f)return false;
  f.value=String(v); f.dispatchEvent(new Event("change",{bubbles:true})); return true;
 },[waehler,wert]);
 await page.waitForTimeout(160);
 return da;
}
const reg=async(page,n)=>{await page.evaluate(k=>setzeSchritt(k),n);await page.waitForTimeout(150)};
const text=page=>page.evaluate(()=>document.getElementById("p-inhalt").innerText);
// Verlauf direkt ins Modell setzen - für die Rechenproben, damit nicht jede
// Zahl einzeln getippt werden muss. Die Bedienung selbst wird eigens geprüft.
async function verlaufSetzen(page,material,segmente){
 await page.evaluate(([m,s])=>{
  aufnahme.material=String(m);
  aufnahme.segmente=JSON.parse(JSON.stringify(s));
  aufnahme.schieberManuell=false;
  schieberNeuAusRechnung();
  zeichne();
 },[material,segmente]);
 await page.waitForTimeout(120);
}
const seg=(laenge,winkel,bl,br)=>({laenge,winkel:winkel||0,bodenLinks:!!bl,bodenRechts:!!br});

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:800,height:1200}});   // Tablet, hochkant
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(300);
 await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});
 // Lädt die Testapp überhaupt? Ohne diese Prüfung stolpert der Prüfstand
 // gleich danach über eine fehlende Funktion und BRICHT AB - und ein
 // abgebrochener Lauf sieht aus wie "keine Fehler".
 const geladenHeil=await page.evaluate(()=>typeof zeichne==="function"&&typeof aufnahme==="object");
 p(geladenHeil&&fehler.length===0,"die Testapp lädt ohne Fehler",fehler.slice(0,2));
 if(!geladenHeil){
  console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden  ·  "+fail
   +" FEHLGESCHLAGEN (Testapp nicht ladbar - Abbruch) ===");
  await b.close(); process.exit(1);
 }

 // ---- 0 · Fachlogik der App ist geladen ---------------------------------
 console.log("\n0 · Fachlogik der App ist geladen und wird benutzt");
 const geladen=await page.evaluate(()=>({
  fehlend:["madMaterialTabelle","computeMadBoundaries","calcMadSchieber",
   "berechneMadStueckliste","madBiegeVorgabe","madProfilMasse","madNormHinweise",
   "madProfilSvgAus","generateMadProfilSvg","calcDilaPositionsInStretch",
   "generateRinneGrundriss","abgerundeterPfad","ansichtsPfeilSvg",
   "findMeasurementMaterial","measurementMaterialOrFallback","ebaPackeInStreifen"]
   .filter(n=>typeof window[n]!=="function"),
  register:document.querySelectorAll(".p-register-knopf").length,
  zugaben:[madBodenMass,madSchieberMass],
  minH:[MAD_MIN_HOEHE,MAD_MIN_HOEHE_WIND]
 }));
 p(geladen.fehlend.length===0,"alle 16 Fachfunktionen der App sind geladen",geladen.fehlend);
 p(geladen.register===9,"neun Register",geladen);
 p(geladen.zugaben[0]===0&&geladen.zugaben[1]===10,
   "Zuschnittzugaben wie in der App hinterlegt (Boden 0, Schieber 10)",geladen.zugaben);
 p(geladen.minH[0]===50&&geladen.minH[1]===100,
   "Normwerte unverändert aus der App (50 / 100 mm)",geladen.minH);

 // Der Prototyp darf keine zweite Fachrechnung enthalten.
 const quelle=fs.readFileSync(path.join(process.cwd(),"prototyp-mauerabdeckung","prototyp-mad.js"),"utf8");
 const eigeneFn=["computeMadBoundaries","calcMadSchieber","berechneMadStueckliste",
   "madProfilMasse","madNormHinweise","madProfilSvgAus","madMaterialTabelle",
   "calcDilaPositionsInStretch","madBiegeVorgabe","ebaPackeInStreifen"]
  .filter(n=>quelle.indexOf("function "+n+"(")>=0);
 p(eigeneFn.length===0,"prototyp-mad.js definiert keine Fachfunktion selbst neu",eigeneFn);
 const benutzt=["computeMadBoundaries(","calcMadSchieber(","berechneMadStueckliste(",
   "madProfilMasse(","madNormHinweise(","madProfilSvgAus(","madMaterialTabelle(",
   "generateRinneGrundriss(","madBiegeVorgabe(","ebaPackeInStreifen("]
  .filter(n=>quelle.indexOf(n)<0);
 p(benutzt.length===0,"prototyp-mad.js ruft die Fachfunktionen der App auf",benutzt);
 p(quelle.indexOf("Math.tan")<0&&quelle.indexOf("Math.cos")<0&&quelle.indexOf("Math.sin")<0,
   "prototyp-mad.js rechnet keine eigene Geometrie");

 // ---- TEST 1 · leere Aufnahme -------------------------------------------
 console.log("\n1 · Leere Aufnahme");
 const leer=await page.evaluate(()=>({
  seg:aufnahme.segmente.length, L:gesamtlaenge(aufnahme),
  schieber:schieberAktiv(aufnahme).length, stueck:stueckliste(aufnahme).length,
  ausmass:ausmassZeilen(aufnahme).length,
  pruef:pruefungen(aufnahme).filter(x=>x.art==="fehler").length,
  grundriss:grundrissHtml(aufnahme)
 }));
 p(leer.seg===0&&leer.L===0,"keine Segmente, Gesamtlänge 0",leer);
 p(leer.schieber===0&&leer.stueck===0,"kein Schieber, kein Zuschnittstück",leer);
 p(leer.ausmass===0,"kein Ausmass abgeleitet",leer);
 p(leer.pruef>=1,"die Kontrolle meldet den fehlenden Verlauf",leer);
 p(/Noch kein Segment/.test(leer.grundriss),"Grundriss sagt, dass nichts erfasst ist");
 await reg(page,2);
 p(/Noch kein Segment/.test(await text(page)),"Register 2 zeigt den leeren Zustand");
 await reg(page,5);
 p(/Noch kein Zuschnittstück/.test(await text(page)),"Register 5 zeigt den leeren Zustand");
 await reg(page,6);
 p(/Noch kein Zuschnittstück/.test(await text(page)),"Register 6 zeigt den leeren Zustand");
 await reg(page,7);
 p(/Noch nichts abzuleiten/.test(await text(page)),"Register 7 zeigt den leeren Zustand");

 // ---- TEST 2 · ein Segment ----------------------------------------------
 console.log("\n2 · Ein Segment");
 // Über die echte Bedienung: Knopf drücken, Länge zeichenweise tippen.
 await reg(page,2);
 p(await klick(page,"#p-segPlus"),"Knopf „＋ Segment hinzufügen“");
 await waehle(page,"#p-material","2");   // Titanzink
 await reg(page,2);
 await tippe(page,'[data-seg-laenge="0"]',"8000");
 const einS=await page.evaluate(()=>({
  laenge:aufnahme.segmente[0].laenge,
  fokus:document.activeElement?document.activeElement.getAttribute("data-seg-laenge"):null,
  wert:document.querySelector('[data-seg-laenge="0"]').value,
  winkelGesperrt:document.querySelector('[data-seg-winkel="0"]').disabled,
  L:gesamtlaenge(aufnahme),
  schieber:schieberAktiv(aufnahme).map(s=>s.posAbStart),
  zfLaenge:document.getElementById("p-zfLaenge").textContent
 }));
 p(einS.laenge===8000,"Länge 8000 mm im Modell",einS);
 p(einS.wert==="8000"&&einS.fokus==="0","Feld behält den Fokus, der Wert steht vollständig",einS);
 p(einS.winkelGesperrt,"beim letzten Segment ist der Winkel gesperrt",einS);
 p(einS.L===8000,"Gesamtlänge 8000 mm",einS);
 p(JSON.stringify(einS.schieber)==="[4000]","ein Schieber in der Mitte (8000 > 5000 m Titanzink)",einS);
 // toLocaleString("de-CH") setzt den typografischen Apostroph (U+2019).
 p(/8[\u2019']000 mm/.test(einS.zfLaenge),"Kennzahl folgt beim Tippen mit",einS);

 // ---- TEST 3 · mehrere Segmente -----------------------------------------
 console.log("\n3 · Mehrere Segmente");
 await verlaufSetzen(page,2,[seg(8000,90),seg(4000,90),seg(6000,0)]);
 const mehr=await page.evaluate(()=>{
  const v=verlaufDaten(aufnahme);
  return {L:v.gesamtlaenge,grenzen:v.boundaries.map(x=>[x.pos,x.typ]),
   schieber:v.schieber.map(s=>s.posAbStart),ecken:eckenAnzahl(aufnahme)};
 });
 p(mehr.L===18000,"Gesamtlänge 8000+4000+6000 = 18'000 mm",mehr);
 p(mehr.grenzen.length===4,"vier Grenzpunkte",mehr);
 p(mehr.ecken===2,"zwei Ecken gezählt",mehr);
 // Ohne Boden sind Anfang und Ende offen: dort gilt der volle Abstand, an den
 // beiden Ecken der halbe. Von Hand nachgerechnet:
 //   0-8000   links 5000 / rechts 2500 -> 2750, 5500
 //   8000-12000  beidseitig 2500       -> 10000
 //   12000-18000 links 2500 / rechts 5000 -> 14500
 p(JSON.stringify(mehr.schieber)==="[2750,5500,10000,14500]",
   "vier Schieber, an den Ecken mit halbem Abstand",mehr);
 await reg(page,2);
 const kartenZahl=await page.evaluate(()=>document.querySelectorAll(".p-seg").length);
 p(kartenZahl===3,"drei Segmentkarten im Verlauf",kartenZahl);

 // ---- TEST 4 · gerade Segmentgrenze --------------------------------------
 console.log("\n4 · Gerade Segmentgrenze (Winkel 0°)");
 await verlaufSetzen(page,2,[seg(6000,0),seg(6000,0)]);
 const gerade=await page.evaluate(()=>{
  const v=verlaufDaten(aufnahme);
  return {typen:v.boundaries.map(x=>x.typ),namen:v.boundaries.map(x=>x.name),
   schieber:v.schieber.map(s=>s.posAbStart)};
 });
 p(gerade.typen[1]==="gerade","die Grenze zwischen zwei geraden Segmenten ist kein Fixpunkt",gerade);
 p(gerade.namen[1]==="Segmentgrenze",'sie heisst "Segmentgrenze"',gerade);
 p(JSON.stringify(gerade.schieber)==="[3000,9000]",
   "je ein Schieber in jedem Abschnitt, voller Abstand",gerade);

 // ---- TEST 5 · Ecken / Winkel --------------------------------------------
 console.log("\n5 · Ecken und Winkel");
 await verlaufSetzen(page,2,[seg(6000,90),seg(6000,0)]);
 const ecke=await page.evaluate(()=>{
  const v=verlaufDaten(aufnahme);
  return {typ:v.boundaries[1].typ,name:v.boundaries[1].name,
   schieber:v.schieber.map(s=>s.posAbStart)};
 });
 p(ecke.typ==="ecke","eine Ecke ist ein Fixpunkt",ecke);
 p(/Ecke 90/.test(ecke.name),"sie ist mit ihrem Winkel beschriftet",ecke);
 p(JSON.stringify(ecke.schieber)==="[3500,8500]",
   "die Schieber rücken zur Ecke hin näher (halber Abstand)",ecke);
 // Winkel umkehren
 await reg(page,2);
 p(await klick(page,'[data-seg-flip="0"]'),"Knopf „Winkel umkehren“");
 const flip=await page.evaluate(()=>({w:aufnahme.segmente[0].winkel,
   name:verlaufDaten(aufnahme).boundaries[1].name}));
 p(flip.w===-90,"der Winkel ist jetzt −90°",flip);
 p(/-90/.test(flip.name),"die Grenze zeigt den umgekehrten Winkel",flip);
 // Innen- wie Aussenecke wirken gleich - genau wie im Kommentar von js/12b
 const gleich=await page.evaluate(()=>{
  const mit=verlaufDaten(aufnahme).schieber.map(s=>Math.round(s.posAbStart));
  aufnahme.segmente[0].winkel=90; schieberNeuAusRechnung();
  const gegen=verlaufDaten(aufnahme).schieber.map(s=>Math.round(s.posAbStart));
  return {mit,gegen};
 });
 p(JSON.stringify(gleich.mit)===JSON.stringify(gleich.gegen),
   "Innen- und Aussenecke ergeben dieselben Abstände",gleich);

 // ---- TEST 6/7 · Boden links und rechts ----------------------------------
 console.log("\n6/7 · Boden am Anfang und am Ende");
 await verlaufSetzen(page,2,[seg(8000,0)]);
 const ohne=await page.evaluate(()=>verlaufDaten(aufnahme).schieber.map(s=>s.posAbStart));
 await reg(page,3);
 p(await haken(page,"#p-bodenL",true),"Kästchen „Boden am Anfang“");
 const bl=await page.evaluate(()=>{
  const v=verlaufDaten(aufnahme);
  return {an:aufnahme.segmente[0].bodenLinks,typ:v.boundaries[0].typ,name:v.boundaries[0].name,
   schieber:v.schieber.map(s=>Math.round(s.posAbStart))};
 });
 p(bl.an===true,"Boden am Anfang ist gesetzt",bl);
 p(bl.typ==="ecke"&&bl.name==="Boden","der Boden wirkt wie ein Fixpunkt",bl);
 p(JSON.stringify(ohne)==="[4000]"&&bl.schieber.length===2,
   "ohne Boden 1 Schieber, mit Boden 2 – der halbe Abstand greift",{ohne,bl});
 await haken(page,"#p-bodenL",false);
 p(await haken(page,"#p-bodenR",true),"Kästchen „Boden am Ende“");
 const br=await page.evaluate(()=>{
  const v=verlaufDaten(aufnahme);
  return {an:aufnahme.segmente[0].bodenRechts,typ:v.boundaries[1].typ,name:v.boundaries[1].name,
   schieber:v.schieber.map(s=>Math.round(s.posAbStart))};
 });
 p(br.an===true&&br.typ==="ecke"&&br.name==="Boden","Boden am Ende ist gesetzt und wirkt",br);
 p(br.schieber.length===2,"auch am Ende greift der halbe Abstand",br);
 // Boden an beiden Enden, dazu die Zugabe im Zuschnitt
 const beide=await page.evaluate(()=>{
  aufnahme.segmente[0].bodenLinks=true;
  madZugaben.boden_mass=20; madZugabenSpeichern();
  schieberNeuAusRechnung();
  const st=stueckliste(aufnahme);
  const r={erste:st[0],letzte:st[st.length-1],anzahl:bodenAnzahl(aufnahme)};
  madZugaben.boden_mass=0; madZugabenSpeichern();
  return r;
 });
 p(beide.anzahl===2,"zwei Böden gezählt",beide);
 p(beide.erste.zuschnitt-beide.erste.abstand===20+10,
   "erstes Stück bekommt die Bodenzugabe (20) plus die Schieberzugabe (10)",beide);
 p(beide.letzte.zuschnitt-beide.letzte.abstand===20+10,
   "letztes Stück ebenso",beide);

 // ---- TEST 8 · automatische Schieber -------------------------------------
 console.log("\n8 · Automatische Schieber");
 await verlaufSetzen(page,2,[seg(22000,0)]);
 const autoS=await page.evaluate(()=>({
  auto:verlaufDaten(aufnahme).schieber.map(s=>Math.round(s.posAbStart)),
  imModell:aufnahme.schieber.map(s=>Math.round(s.posAbStart)),
  manuell:aufnahme.schieberManuell
 }));
 p(autoS.auto.length===4,"22'000 mm Titanzink ergeben vier Schieber",autoS);
 p(autoS.auto.every((x,i)=>i===0||x-autoS.auto[i-1]<=5000),
   "kein Abstand grösser als 5.00 m",autoS);
 p(JSON.stringify(autoS.auto)===JSON.stringify(autoS.imModell)&&!autoS.manuell,
   "die gerechneten Positionen stehen im Modell",autoS);
 // von Hand übernehmen und ändern
 await reg(page,3);
 p(await haken(page,"#p-manuell",true),"Kästchen „Schieber von Hand setzen“");
 const vonHand=await page.evaluate(()=>({
  uebernommen:aufnahme.schieber.map(s=>Math.round(s.posAbStart)),
  felder:document.querySelectorAll("[data-schieber-pos]").length
 }));
 p(vonHand.uebernommen.length===4&&vonHand.felder===4,
   "die gerechnete Liste wird zum Bearbeiten übernommen",vonHand);
 await tippe(page,'[data-schieber-pos="0"]',"3000");
 const geaendert=await page.evaluate(()=>({
  pos:Math.round(aufnahme.schieber[0].posAbStart),
  fokus:!!document.activeElement.dataset.schieberPos,
  wert:document.querySelector('[data-schieber-pos="0"]').value
 }));
 p(geaendert.pos===3000&&geaendert.wert==="3000","Position von Hand geändert",geaendert);
 p(geaendert.fokus,"auch hier bleibt der Fokus im Feld",geaendert);
 p(await klick(page,"#p-schieberAuto"),"Knopf „Zurück zur Rechnung“");
 const zurueck=await page.evaluate(()=>({
  manuell:aufnahme.schieberManuell,
  pos:aufnahme.schieber.map(s=>Math.round(s.posAbStart))
 }));
 p(!zurueck.manuell&&JSON.stringify(zurueck.pos)===JSON.stringify(autoS.auto),
   "die Rechnung stellt die ursprünglichen Positionen wieder her",zurueck);

 // ---- TEST 9/10 · Materialwechsel und unterschiedliche Abstände ----------
 console.log("\n9/10 · Materialwechsel und materialabhängige Abstände");
 const je={};
 for(const [id,name,max,ecke] of [[1,"Aluminium (Aluman)",4000,2000],[2,"Titanzink",5000,2500],
                                  [3,"Kupfer",6000,3000],[6,"Stahl, verzinkt",8000,4000]]){
  const r=await page.evaluate(m=>{
   aufnahme.material=String(m);
   aufnahme.segmente=[{laenge:22000,winkel:0,bodenLinks:false,bodenRechts:false}];
   aufnahme.schieberManuell=false; schieberNeuAusRechnung();
   const v=verlaufDaten(aufnahme);
   return {label:v.tabelle.label,max:v.tabelle.maxAbstand,ecke:v.tabelle.abEcke,
    anzahl:v.schieber.length};
  },id);
  je[name]=r;
  p(r.label===name&&r.max===max&&r.ecke===ecke,
    name+": Abstände "+max+" / "+ecke+" mm aus dem Material-Katalog",r);
 }
 p(je["Aluminium (Aluman)"].anzahl===5&&je["Titanzink"].anzahl===4
   &&je["Kupfer"].anzahl===3&&je["Stahl, verzinkt"].anzahl===2,
   "derselbe Verlauf ergibt je Material eine andere Schieberzahl (5/4/3/2)",
   Object.keys(je).map(k=>k+":"+je[k].anzahl));
 // Ohne Material greift der Rückfallwert der App, nicht eine eigene Zahl.
 const ohneMat=await page.evaluate(()=>{
  aufnahme.material="";
  return {tab:materialTabelle(aufnahme),
   warnung:pruefungen(aufnahme).some(x=>/Rückfallwert/.test(x.text))};
 });
 p(ohneMat.tab.label==="Titanzink"&&ohneMat.tab.maxAbstand===5000,
   "ohne Material greift der Rückfallwert aus js/01-basis.js",ohneMat);
 p(ohneMat.warnung,"und die Kontrolle sagt das ausdrücklich",ohneMat);

 // ---- TEST 11 · Profilmasse ----------------------------------------------
 console.log("\n11 · Profilmasse");
 await verlaufSetzen(page,2,[seg(6000,0)]);
 await reg(page,4);
 const felder=await page.evaluate(()=>Array.from(document.querySelectorAll("[data-profil]")).map(f=>f.dataset.profil));
 p(["breite","gefaelle","hoeheLinks","hoeheRechts","umschlagLinks","umschlagRechts",
    "biegeLinks","biegeRechts","saum"].every(k=>felder.indexOf(k)>=0),
   "alle neun Profilfelder sind da",felder);
 p(await page.evaluate(()=>!!document.getElementById("p-wind")),"dazu der Schalter „windexponiert“");
 const prof=await page.evaluate(()=>profilMasse(aufnahme));
 p(prof.abwicklung===460,
   "Abwicklung 10+15+50+310+50+15+10 = 460 mm",prof);
 p(prof.breite===310&&prof.hL===50&&prof.hR===50&&prof.umL===15&&prof.umR===15&&prof.saum===10,
   "die Vorgabewerte sind die des App-Formulars",prof);
 await tippe(page,'[data-profil="breite"]',"400");
 const nachBreite=await page.evaluate(()=>({
  m:profilMasse(aufnahme),
  fokus:document.activeElement.dataset?document.activeElement.dataset.profil:null,
  wert:document.querySelector('[data-profil="breite"]').value,
  anzeige:document.getElementById("p-abwicklung").textContent
 }));
 p(nachBreite.m.abwicklung===550,"Gesamtbreite 400 → Abwicklung 550 mm",nachBreite);
 p(nachBreite.wert==="400"&&nachBreite.fokus==="breite","Feld behält den Fokus",nachBreite);
 p(/550/.test(nachBreite.anzeige),"die Anzeige folgt beim Tippen mit",nachBreite);
 const svg=await page.evaluate(()=>{
  const s=document.querySelector("#p-schnitt svg");
  return {da:!!s,laenge:s?s.outerHTML.length:0,nan:s?/NaN|Infinity/.test(s.outerHTML):false};
 });
 p(svg.da&&svg.laenge>800,"der Querschnitt ist gezeichnet",svg);
 p(!svg.nan,"kein NaN in der Zeichnung",svg);

 // ---- TEST 12 · Gefälle ---------------------------------------------------
 console.log("\n12 · Gefälle");
 const gef=await page.evaluate(()=>{
  aufnahme.profil.breite=310; aufnahme.profil.gefaelle=0;
  const a0=profilMasse(aufnahme);
  aufnahme.profil.gefaelle=5;
  const a5=profilMasse(aufnahme);
  aufnahme.profil.gefaelle=10;
  const a10=profilMasse(aufnahme);
  return {a0:{dy:a0.dy,abw:a0.abwicklung},a5:{dy:a5.dy,abw:a5.abwicklung},
   a10:{dy:a10.dy,abw:a10.abwicklung},vg5:madBiegeVorgabe(5),vg10:madBiegeVorgabe(10)};
 });
 p(Math.round(gef.a0.dy)===0&&Math.round(gef.a5.dy)===27&&Math.round(gef.a10.dy)===55,
   "der Höhenversatz folgt dem Gefälle (0 / 27 / 55 mm bei 310 mm Breite)",gef);
 p(gef.a0.abw===gef.a5.abw&&gef.a5.abw===gef.a10.abw,
   "die Abwicklung hängt NICHT vom Gefälle ab – unverändert wie in der App",gef);
 p(gef.vg5.links===95&&gef.vg5.rechts===85&&gef.vg10.links===100&&gef.vg10.rechts===80,
   "die Vorgabe der Biegewinkel ist 90°±Gefälle",gef);

 // ---- TEST 13 · Biegewinkel ----------------------------------------------
 console.log("\n13 · Biegewinkel");
 const biege=await page.evaluate(()=>{
  aufnahme.profil.gefaelle=5;
  aufnahme.profil.biegeLinks=""; aufnahme.profil.biegeRechts="";
  const leerF=profilMasse(aufnahme);
  const svgLeer=madProfilSvgAus(leerF);
  aufnahme.profil.biegeLinks=110; aufnahme.profil.biegeRechts=70;
  const gesetzt=profilMasse(aufnahme);
  const svgGesetzt=madProfilSvgAus(gesetzt);
  return {leerL:leerF.wL,leerR:leerF.wR,setzL:gesetzt.wL,setzR:gesetzt.wR,
   abwGleich:leerF.abwicklung===gesetzt.abwicklung,
   zeichnungAnders:svgLeer!==svgGesetzt};
 });
 p(biege.leerL===95&&biege.leerR===85,
   "leeres Feld → Vorgabe aus dem Gefälle (95° / 85°)",biege);
 p(biege.setzL===110&&biege.setzR===70,"eingetragene Winkel schlagen die Vorgabe",biege);
 p(biege.abwGleich,"die Abwicklung ändert sich dadurch nicht",biege);
 p(biege.zeichnungAnders,"die Zeichnung ändert sich sichtbar",biege);

 // ---- TEST 14 · Windexponiert ---------------------------------------------
 console.log("\n14 · Windexponierte Lage");
 await reg(page,4);
 const windAus=await page.evaluate(()=>{
  aufnahme.profil.hoeheLinks=60; aufnahme.profil.hoeheRechts=60;
  aufnahme.profil.windexponiert=false; zeichne();
  return {wind:profilMasse(aufnahme).wind,hinweise:normHinweise(aufnahme).length};
 });
 p(windAus.wind===false&&windAus.hinweise===0,"60 mm ohne Wind: kein Hinweis",windAus);
 p(await haken(page,"#p-wind",true),"Schalter „windexponierte Lage“");
 const windAn=await page.evaluate(()=>({
  imModell:aufnahme.profil.windexponiert,
  wind:profilMasse(aufnahme).wind,
  hinweise:normHinweise(aufnahme)
 }));
 p(windAn.imModell===true&&windAn.wind===true,"der Schalter kommt in der Fachlogik an",windAn);
 p(windAn.hinweise.length===2&&/100 mm/.test(windAn.hinweise[0]),
   "60 mm mit Wind: beide Schenkel werden gemeldet (min. 100 mm)",windAn);

 // ---- TEST 15 · Normwarnung -----------------------------------------------
 console.log("\n15 · Normwarnung");
 const norm=await page.evaluate(()=>{
  aufnahme.profil.windexponiert=false;
  aufnahme.profil.hoeheLinks=40; aufnahme.profil.hoeheRechts=60;
  const h=normHinweise(aufnahme);
  zeichne();
  return {h,imRegister:document.getElementById("p-norm").innerText,
   inKontrolle:pruefungen(aufnahme).filter(x=>/Norm verlangt/.test(x.text)).length};
 });
 p(norm.h.length===1&&/links 40 mm/.test(norm.h[0])&&/mindestens 50 mm/.test(norm.h[0]),
   "40 mm links werden gemeldet, 60 mm rechts nicht",norm);
 p(/40 mm/.test(norm.imRegister),"der Hinweis steht im Register „Profil & Norm“",norm);
 p(norm.inKontrolle===1,"und ebenso in der Kontrolle",norm);
 const normOk=await page.evaluate(()=>{
  aufnahme.profil.hoeheLinks=50; zeichne();
  return {h:normHinweise(aufnahme).length,text:document.getElementById("p-norm").innerText};
 });
 p(normOk.h===0&&/entsprechen den Mindestwerten/.test(normOk.text),
   "genau 50 mm sind in Ordnung",normOk);

 // ---- TEST 16 · Stückliste ------------------------------------------------
 console.log("\n16 · Stückliste");
 await verlaufSetzen(page,2,[seg(8000,90,true,false),seg(4000,90),seg(6000,0,false,true)]);
 await reg(page,5);
 const stl=await page.evaluate(()=>{
  const st=stueckliste(aufnahme);
  return {anzahl:st.length,
   erste:st[0],letzte:st[st.length-1],
   summeAbstand:st.reduce((s,x)=>s+x.abstand,0),
   zeilen:document.querySelectorAll("#p-inhalt tbody tr").length,
   text:document.getElementById("p-inhalt").innerText};
 });
 p(stl.anzahl===8,"acht Zuschnittstücke (4 Grenzpunkte + 5 Schieber − 1)",stl);
 p(stl.summeAbstand===18000,"die Abstände summieren sich auf die Gesamtlänge",stl);
 p(stl.erste.von==="Boden"&&stl.letzte.bis==="Boden",
   "das erste Stück beginnt am Boden, das letzte endet dort",stl);
 p(stl.zeilen===8,"acht Zeilen in der Tabelle",stl);
 p(/Boden/.test(stl.text)&&/Schieber 1/.test(stl.text)&&/Ecke 90/.test(stl.text),
   "Von → Bis nennt Boden, Schieber und Ecke",{t:stl.text.slice(0,200)});

 // ---- TEST 17 · Zuschnitt --------------------------------------------------
 console.log("\n17 · Zuschnitt");
 const zu=await page.evaluate(()=>{
  const st=stueckliste(aufnahme);
  return {st:st.map(x=>[x.nr,x.abstand,x.zuschnitt]),
   summe:zuschnittSumme(aufnahme),boden:madBodenMass,schieber:madSchieberMass};
 });
 p(zu.st[0][2]===zu.st[0][1]+0+10,
   "Stück 1: Abstand + Boden (0) + Schieber (10)",zu.st[0]);
 p(zu.st[1][2]===zu.st[1][1]+20,"Stück 2 zwischen zwei Schiebern: +10 je Seite",zu.st[1]);
 p(zu.st.every(x=>x[2]>=x[1]),"kein Zuschnitt ist kürzer als sein Abstand",zu);
 // Die Zugaben wirken wirklich
 const andereZugabe=await page.evaluate(()=>{
  const vorher=zuschnittSumme(aufnahme);
  madZugaben.schieber_mass=25; madZugabenSpeichern();
  const nachher=zuschnittSumme(aufnahme);
  madZugaben.schieber_mass=10; madZugabenSpeichern();
  return {vorher,nachher,zurueck:zuschnittSumme(aufnahme)};
 });
 p(andereZugabe.nachher>andereZugabe.vorher&&andereZugabe.zurueck===andereZugabe.vorher,
   "eine geänderte Schieberzugabe wirkt sofort und lässt sich zurückstellen",andereZugabe);

 // ---- Zuschnitt aus Rollenblech -------------------------------------------
 console.log("\nZuschnitt aus Rollenblech");
 // Ein einfacher, von Hand nachrechenbarer Fall: 2 Segmente à 4000 mm ohne
 // Ecke und ohne Boden. Titanzink -> je Abschnitt kein Schieber nötig
 // (4000 < 5000), also genau 2 Zuschnitte von 4000 mm.
 await page.evaluate(()=>{
  madZugaben.schieber_mass=0; madZugaben.boden_mass=0; madZugabenSpeichern();
  aufnahme.material="2";
  aufnahme.segmente=[{laenge:4000,winkel:0,bodenLinks:false,bodenRechts:false},
                     {laenge:4000,winkel:0,bodenLinks:false,bodenRechts:false}];
  aufnahme.schieberManuell=false; schieberNeuAusRechnung();
  aufnahme.profil={...PROFIL_VORGABE};
  zeichne();
 });
 await reg(page,6);
 const rp=await page.evaluate(()=>{
  const r=madRollenPlan(aufnahme);
  return {abw:r.abwicklung,tafel:r.tafelLaenge,
   bleche:madBleche(aufnahme).map(x=>[x.nr,x.laenge]),
   streifen:(r.verteilung&&r.verteilung.streifen||[]).length,
   optimal:r.verteilung?r.verteilung.optimal:null,
   netto:r.netto,
   moeglich:r.moeglich.map(m=>[m.breite,m.jeTafel,m.tafeln,Number(m.flaeche.toFixed(4)),Number(m.verschnitt.toFixed(4))]),
   bestes:r.bestes?r.bestes.breite:null,
   zuSchmal:r.zuSchmal,
   text:document.getElementById("p-inhalt").innerText};
 });
 p(rp.abw===460,"Abwicklung 460 mm ist die Streifenbreite",rp);
 p(JSON.stringify(rp.bleche)==="[[1,4000],[2,4000]]","zwei Zuschnitte à 4000 mm",rp);
 p(rp.tafel===4000,"die Tafel ist so lang wie das längste Stück",rp);
 p(rp.streifen===2&&rp.optimal===true,
   "zwei Streifen – kein Stück passt zweimal in eine Tafellänge",rp);
 p(Math.abs(rp.netto-2*4*0.46)<1e-6,"Nettofläche 2 × 4 m × 0.46 m = 3.68 m²",rp.netto);
 // 1000 mm: floor(1000/460)=2 Streifen je Tafel -> 1 Tafel -> 1×1000×4000 = 4.00 m²
 //  670 mm: floor(670/460)=1 Streifen je Tafel -> 2 Tafeln -> 2×670×4000 = 5.36 m²
 const r1000=rp.moeglich.find(m=>m[0]===1000), r670=rp.moeglich.find(m=>m[0]===670);
 p(!!r1000&&!!r670,"beide Standardrollen stehen in der Liste",rp.moeglich);
 p(!!r1000&&r1000[1]===2&&r1000[2]===1&&Math.abs(r1000[3]-4.0)<1e-6,
   "1'000 mm: 2 Streifen je Tafel, 1 Tafel, 4.00 m²",r1000);
 p(!!r670&&r670[1]===1&&r670[2]===2&&Math.abs(r670[3]-5.36)<1e-6,
   "670 mm: 1 Streifen je Tafel, 2 Tafeln, 5.36 m²",r670);
 p(!!r1000&&!!r670&&Math.abs(r1000[4]-(4.0-rp.netto))<1e-6
   &&Math.abs(r670[4]-(5.36-rp.netto))<1e-6,
   "Verschnitt = Tafelfläche − Nettofläche",{r1000,r670,netto:rp.netto});
 p(rp.bestes===1000,"die breitere Rolle braucht weniger Material und steht zuoberst",rp);
 p(/Streifen/.test(rp.text)&&/Stück 1/.test(rp.text),
   "die Streifenbelegung nennt jedes Stück mit seiner Nummer",{t:rp.text.slice(0,400)});
 // Mehrere Stücke in EINEM Streifen
 const zwei=await page.evaluate(()=>{
  aufnahme.segmente=[{laenge:4000,winkel:0,bodenLinks:false,bodenRechts:false},
                     {laenge:1500,winkel:0,bodenLinks:false,bodenRechts:false},
                     {laenge:1500,winkel:0,bodenLinks:false,bodenRechts:false}];
  schieberNeuAusRechnung(); zeichne();
  const r=madRollenPlan(aufnahme);
  return {bleche:madBleche(aufnahme).map(x=>x.laenge),tafel:r.tafelLaenge,
   streifen:(r.verteilung&&r.verteilung.streifen||[]).map(s2=>s2.stuecke.map(x=>x.laenge)),
   belegung1:streifenVon(aufnahme,1)};
 });
 p(zwei.tafel===4000&&zwei.streifen.length===2,
   "4000 + 1500 + 1500 passen in zwei Streifen von 4000 mm",zwei);
 p(zwei.streifen.some(s2=>s2.length===2&&s2[0]+s2[1]===3000),
   "die beiden kurzen Stücke liegen hintereinander in einem Streifen",zwei);
 p(/Stück \d+ \(/.test(zwei.belegung1)&&/Rest/.test(zwei.belegung1),
   "die Belegung nennt Stücke und Rest",zwei.belegung1);
 // Keine Rolle breit genug
 const schmal=await page.evaluate(()=>{
  rollenbreiten.forEach(r2=>r2.aktiv=(r2.breite===330||r2.breite===250));
  rollenSpeichern(); zeichne();
  const r=madRollenPlan(aufnahme);
  return {moeglich:r.moeglich.length,zuSchmal:r.zuSchmal,
   warnung:pruefungen(aufnahme).some(x=>/keine Rolle ist breit genug/.test(x.text)),
   text:document.getElementById("p-inhalt").innerText};
 });
 p(schmal.moeglich===0&&schmal.zuSchmal.length===2,
   "330 und 250 mm sind zu schmal für 460 mm Abwicklung",schmal);
 p(/breit genug/.test(schmal.text)&&schmal.warnung,
   "das wird im Register und in der Kontrolle gesagt, nicht still gerechnet",schmal);
 // Gar keine Rolle angehakt
 const keine=await page.evaluate(()=>{
  rollenbreiten.forEach(r2=>r2.aktiv=false); rollenSpeichern(); zeichne();
  const r=madRollenPlan(aufnahme);
  return {moeglich:r.moeglich.length,
   warnung:pruefungen(aufnahme).some(x=>/keine Rollenbreite angehakt/.test(x.text)),
   text:document.getElementById("p-inhalt").innerText};
 });
 p(keine.moeglich===0&&keine.warnung&&/Einstellungen/.test(keine.text),
   "ohne angehakte Rolle wird nichts gerechnet und darauf hingewiesen",keine);
 // Rollenbreite über die Einstellungen dazuschalten
 await page.evaluate(()=>{einstellungenOffen=true;zeichne()});
 p(await haken(page,'[data-rolle="1000"]',true),"Rollenbreite in den Einstellungen anhaken");
 const dazu=await page.evaluate(()=>{
  const r=madRollenPlan(aufnahme);
  einstellungenOffen=false; zeichne();
  return {aktiv:aktiveRollenbreiten(),moeglich:r.moeglich.length};
 });
 p(JSON.stringify(dazu.aktiv)==="[1000]"&&dazu.moeglich===1,
   "sie wirkt sofort auf den Zuschnitt",dazu);
 await page.evaluate(()=>{
  rollenbreiten=ROLLEN_WAEHLBAR.map(b2=>({breite:b2,aktiv:ROLLEN_STANDARD.indexOf(b2)>=0}));
  rollenSpeichern();
  madZugaben.schieber_mass=10; madZugabenSpeichern();
  aufnahme.segmente=[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},
                     {laenge:4000,winkel:90,bodenLinks:false,bodenRechts:false},
                     {laenge:6000,winkel:0,bodenLinks:false,bodenRechts:true}];
  schieberNeuAusRechnung(); zeichne();
 });

 // ---- TEST 18 · Ausmass ----------------------------------------------------
 console.log("\n18 · Ausmass");
 // Vorherige Tests haben am Profil gedreht - für eine nachrechenbare Fläche
 // wird hier ausdrücklich auf die Vorgabewerte zurückgestellt.
 await page.evaluate(()=>{aufnahme.profil={...PROFIL_VORGABE};zeichne()});
 await reg(page,7);
 const aus=await page.evaluate(()=>({
  zeilen:ausmassZeilen(aufnahme),
  flaeche:flaecheM2(aufnahme),
  abwicklung:profilMasse(aufnahme).abwicklung,
  text:document.getElementById("p-inhalt").innerText,
  // Nur die Tabelle - der erklärende Satz darüber enthält das Wort
  // "Artikelnummern" selbst und würde die Prüfung sonst umwerfen.
  tabelle:Array.from(document.querySelectorAll("#p-inhalt tbody")).map(t=>t.innerText).join("\n")
 }));
 const wasse=aus.zeilen.map(z=>z.was).join(" | ");
 p(aus.zeilen.length===6,"sechs Ausmasspositionen",wasse);
 p(/Mauerabdeckung Titanzink/.test(wasse),"Position mit Material und Länge",wasse);
 p(aus.abwicklung===460,"Abwicklung wieder auf dem Vorgabewert 460 mm",aus.abwicklung);
 p(Math.abs(aus.flaeche-18*0.46)<0.001,"Blechfläche 18 m × 0.46 m = 8.28 m²",aus.flaeche);
 p(/Zuschnitte/.test(wasse)&&/Schieber/.test(wasse)&&/Boden/.test(wasse)&&/Ecken/.test(wasse),
   "Zuschnitte, Schieber, Boden und Ecken sind je eine eigene Position",wasse);
 p(!/Art\.|Artikel|Preis|CHF|Fr\.|\bEP\b/.test(aus.tabelle),
   "keine Artikelnummern und keine Preise in den Positionen",{t:aus.tabelle.slice(0,300)});
 p(aus.zeilen.every(z=>z.quelle&&z.quelle.length>3),"jede Position nennt ihre Herkunft",wasse);

 // ---- TEST 19/20 · Speichern und Laden -------------------------------------
 console.log("\n19/20 · Speichern und Laden");
 await reg(page,1);
 await tippe(page,"#p-bezeichnung","Attika Nordseite");
 await tippe(page,"#p-objekt","Musterstrasse 1");
 await reg(page,9);
 await tippe(page,"#p-bemerkung","Bemerkung zur Aufnahme");
 // Foto und Skizze setzen (TEST 21/22 prüfen die Bedienung selbst)
 const bild="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
 await page.evaluate(b=>{aufnahme.fotos.push(b);aufnahme.skizze=b;zeichne()},bild);
 const gespeichert=await page.evaluate(()=>{
  const heil=speichern();
  return {heil,anzahl:alleAufnahmen().length,id:aufnahme.id};
 });
 p(gespeichert.heil&&gespeichert.anzahl===1,"gespeichert",gespeichert);
 const geladen2=await page.evaluate(id=>{
  aufnahme=leereAufnahme(); zeichne();
  const leerJetzt=aufnahme.segmente.length;
  const heil=oeffnen(id);
  const a=aufnahme;
  return {leerJetzt,heil,
   bez:a.bezeichnung,objekt:a.objekt,bemerkung:a.bemerkung,material:a.material,
   segmente:a.segmente,schieber:a.schieber.length,
   profil:a.profil,fotos:a.fotos.length,skizze:!!a.skizze,
   stueck:stueckliste(a).length,ausmass:ausmassZeilen(a).length};
 },gespeichert.id);
 p(geladen2.leerJetzt===0&&geladen2.heil,"eine neue Aufnahme ist leer, die gespeicherte lädt",geladen2);
 p(geladen2.bez==="Attika Nordseite"&&geladen2.objekt==="Musterstrasse 1"
   &&geladen2.bemerkung==="Bemerkung zur Aufnahme","Bezeichnung, Objekt und Notiz sind wieder da",geladen2);
 p(geladen2.material==="2"&&geladen2.segmente.length===3
   &&geladen2.segmente[0].laenge===8000&&geladen2.segmente[0].bodenLinks===true
   &&geladen2.segmente[2].bodenRechts===true,
   "Material, Segmente, Winkel und Böden sind wieder da",geladen2.segmente);
 p(geladen2.profil.breite===310&&geladen2.profil.hoeheLinks===50
   &&geladen2.profil.windexponiert===false,"die Profilmasse sind wieder da",geladen2.profil);
 p(geladen2.fotos===1&&geladen2.skizze,"Foto und Skizze sind erhalten",geladen2);
 p(geladen2.stueck===8&&geladen2.ausmass===6,
   "Stückliste und Ausmass rechnen aus dem geladenen Stand identisch",geladen2);
 // Ein älterer Datensatz ohne die später ergänzten Felder muss öffnen
 const alt=await page.evaluate(()=>{
  const roh={id:"altmad1",erstellt:new Date().toISOString(),bezeichnung:"Alter Stand",
   material:"3",segmente:[{laenge:5000,winkel:0,bodenLinks:false,bodenRechts:false}]};
  localStorage.setItem("pmad_aufnahmen",JSON.stringify([roh,...alleAufnahmen()]));
  const heil=oeffnen("altmad1");
  return {heil,profil:aufnahme.profil,schieber:aufnahme.schieber,fotos:aufnahme.fotos,
   bemerkung:aufnahme.bemerkung,stueck:stueckliste(aufnahme).length};
 });
 p(alt.heil,"ein älterer Datensatz ohne Profil, Fotos und Notiz öffnet",alt);
 p(alt.profil.breite===310&&Array.isArray(alt.schieber)&&Array.isArray(alt.fotos)
   &&alt.bemerkung==="","die fehlenden Felder bekommen die Vorgabe",alt);
 p(alt.stueck===1,"und er rechnet",alt);

 // ---- TEST 21 · Fotos -------------------------------------------------------
 console.log("\n21 · Fotos");
 await page.evaluate(id=>{oeffnen(id)},gespeichert.id);
 await reg(page,9);
 const pngDatei=path.join(process.cwd(),"prototyp-mauerabdeckung",".pruef-foto.png");
 fs.writeFileSync(pngDatei,Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mNk+M9QzzCKRsEoGgUAOhwBAX8G1p8AAAAASUVORK5CYII=","base64"));
 await page.setInputFiles("#p-fotoInput",pngDatei);
 await page.waitForTimeout(600);
 const fotoNeu=await page.evaluate(()=>({
  anzahl:aufnahme.fotos.length,
  letztes:(aufnahme.fotos[aufnahme.fotos.length-1]||"").slice(0,22),
  bilder:document.querySelectorAll(".p-foto img").length
 }));
 p(fotoNeu.anzahl===2,"ein echtes Bild wurde über das Dateifeld aufgenommen",fotoNeu);
 p(/^data:image\/jpeg;base64/.test(fotoNeu.letztes),
   "es ist verkleinert und als JPEG abgelegt",fotoNeu);
 p(fotoNeu.bilder>=2,"beide Fotos werden angezeigt (Skizze zusätzlich)",fotoNeu);
 p(await klick(page,'[data-foto-weg="0"]'),"Foto löschen");
 p(await page.evaluate(()=>aufnahme.fotos.length)===1,"nur das gewählte Foto ist weg");
 fs.unlinkSync(pngDatei);

 // ---- TEST 22 · Skizze -------------------------------------------------------
 console.log("\n22 · Skizze");
 await page.evaluate(()=>{aufnahme.skizze=null;zeichne()});
 await reg(page,9);
 p(await klick(page,"#p-skizzeOeffnen"),"Knopf „Skizze zeichnen“");
 const flaeche=await page.evaluate(()=>{
  const c=document.getElementById("p-skizzeCanvas");
  const b=c.getBoundingClientRect();
  return {offen:!document.getElementById("p-skizzeBox").hidden,
   breite:Math.round(b.width),hoehe:Math.round(b.height),
   x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};
 });
 p(flaeche.offen&&flaeche.breite>200&&flaeche.hoehe>100,"die Zeichenfläche ist offen",flaeche);
 await page.mouse.move(flaeche.x-40,flaeche.y-20);
 await page.mouse.down();
 await page.mouse.move(flaeche.x+40,flaeche.y+20,{steps:8});
 await page.mouse.up();
 await page.waitForTimeout(80);
 p(await klick(page,"#p-skizzeSpeichern"),"Skizze übernehmen");
 const skizze=await page.evaluate(()=>({
  da:!!aufnahme.skizze,
  art:(aufnahme.skizze||"").slice(0,15),
  laenge:(aufnahme.skizze||"").length,
  zu:document.getElementById("p-skizzeBox")?document.getElementById("p-skizzeBox").hidden:null
 }));
 p(skizze.da&&/^data:image\/png/.test(skizze.art),"die Skizze ist als Bild abgelegt",skizze);
 p(skizze.laenge>1000,"sie enthält den gezeichneten Strich",skizze);
 const skizzeBleibt=await page.evaluate(()=>{
  speichern();
  const id=aufnahme.id;
  aufnahme=leereAufnahme(); zeichne(); oeffnen(id);
  return {da:!!aufnahme.skizze,fotos:aufnahme.fotos.length};
 });
 p(skizzeBleibt.da&&skizzeBleibt.fotos===1,
   "Skizze und Foto sind nach Speichern und erneutem Öffnen erhalten",skizzeBleibt);

 // ---- TEST 23 · Notiz ---------------------------------------------------------
 console.log("\n23 · Notiz");
 await reg(page,9);
 await tippe(page,"#p-bemerkung","Zweite Notiz mit Umlauten: Schräge Attika");
 const notiz=await page.evaluate(()=>({
  imModell:aufnahme.bemerkung,
  fokus:document.activeElement.id,
  wert:document.getElementById("p-bemerkung").value
 }));
 p(notiz.imModell==="Zweite Notiz mit Umlauten: Schräge Attika","die Notiz steht im Modell",notiz);
 p(notiz.fokus==="p-bemerkung"&&notiz.wert===notiz.imModell,
   "das Feld behält den Fokus beim Tippen",notiz);
 const notizBleibt=await page.evaluate(()=>{
  speichern(); const id=aufnahme.id;
  aufnahme=leereAufnahme(); oeffnen(id);
  return aufnahme.bemerkung;
 });
 p(notizBleibt==="Zweite Notiz mit Umlauten: Schräge Attika","sie überlebt Speichern und Laden",notizBleibt);

 // ---- TEST 24 · Kontrolle -----------------------------------------------------
 console.log("\n24 · Kontrolle");
 const heil=await page.evaluate(()=>{
  aufnahme.profil.hoeheLinks=50; aufnahme.profil.hoeheRechts=50;
  aufnahme.profil.windexponiert=false;
  return pruefungen(aufnahme);
 });
 p(heil.filter(x=>x.art==="fehler").length===0,"eine vollständige Aufnahme hat keinen Fehler",heil);
 const kaputt=await page.evaluate(()=>{
  const stand=JSON.parse(JSON.stringify(aufnahme));
  aufnahme.segmente[1].laenge=0;
  aufnahme.segmente[0].winkel=270;
  aufnahme.profil.breite=0;
  aufnahme.profil.hoeheLinks=0;
  aufnahme.schieberManuell=true;
  aufnahme.schieber=[{posAbStart:-5},{posAbStart:999999}];
  const r=pruefungen(aufnahme);
  aufnahme=stand;
  return r;
 });
 const texte=kaputt.map(x=>x.text).join(" | ");
 p(/Segment 2: keine gültige Länge/.test(texte),"fehlende Länge wird gemeldet",texte);
 p(/Winkel 270° liegt ausserhalb/.test(texte),"unmöglicher Winkel wird gemeldet",texte);
 p(/keine Gesamtbreite/.test(texte),"fehlende Gesamtbreite wird gemeldet",texte);
 p(/keine Höhe für den linken Schenkel/.test(texte),"fehlende Höhe wird gemeldet",texte);
 p(/Schieber 1: Position -5 mm liegt nicht/.test(texte),"Schieber ausserhalb wird gemeldet",texte);
 p(kaputt.filter(x=>x.art==="fehler").length>=5,"alle als Fehler, nicht als Hinweis",kaputt.length);
 await reg(page,8);
 const kontrollText=await text(page);
 // innerText liefert die CSS-Grossschreibung der Überschriften mit -
 // deshalb ohne Rücksicht auf Gross-/Kleinschreibung prüfen.
 p(/kontrolle/i.test(kontrollText),"Register 8 zeigt die Kontrolle");
 const punkt=await page.evaluate(()=>{
  aufnahme.profil.hoeheLinks=30; zeichne();
  const k=document.querySelectorAll(".p-register-knopf")[7];
  const mit=!!k.querySelector(".p-punkt");
  aufnahme.profil.hoeheLinks=0; aufnahme.segmente[0].laenge=0; zeichne();
  const rot=!!document.querySelectorAll(".p-register-knopf")[7].querySelector(".p-punkt-rot");
  aufnahme.profil.hoeheLinks=50; aufnahme.segmente[0].laenge=8000; zeichne();
  const ohne=!!document.querySelectorAll(".p-register-knopf")[7].querySelector(".p-punkt");
  return {mit,rot,ohne};
 });
 p(punkt.mit&&punkt.rot&&!punkt.ohne,
   "das Register trägt einen Punkt – rot bei einem Fehler, weg wenn alles stimmt",punkt);

 // ---- Blättern und Register ---------------------------------------------------
 console.log("\nBlättern und Register");
 await reg(page,1);
 const nav1=await page.evaluate(()=>({
  zurueck:document.getElementById("p-zurueck").disabled,
  weiter:document.getElementById("p-weiter").textContent
 }));
 p(nav1.zurueck,"auf dem ersten Register ist „Zurück“ gesperrt",nav1);
 p(/Weiter/.test(nav1.weiter),"und „Weiter“ nennt das nächste Register",nav1);
 await reg(page,9);
 const nav8=await page.evaluate(()=>({
  weiter:document.getElementById("p-weiter").textContent,
  gesperrt:document.getElementById("p-weiter").disabled
 }));
 p(/Fertig/.test(nav8.weiter)&&!nav8.gesperrt,
   "auf dem letzten Register heisst der Knopf „Fertig“ und ist bedienbar",nav8);
 const nurEines=await page.evaluate(()=>{
  const r=[];
  for(let n=1;n<=9;n++){
   setzeSchritt(n);
   const h2=Array.from(document.querySelectorAll("#p-inhalt h2")).map(x=>x.textContent.trim());
   r.push({n,h2});
  }
  return r;
 });
 const fremd=nurEines.filter(x=>{
  const eigene=x.h2.filter(t=>/^\d+ ·/.test(t)).map(t=>Number(t.split(" ")[0]));
  // Register 3 fasst Boden (3) und Schieber (4) zusammen, Register 4 Profil (5)
  // und Norm (6) - deshalb die Zuordnung Register -> erlaubte Nummern.
  const erlaubt={1:[1],2:[2],3:[3,4],4:[5,6],5:[7],6:[8],7:[9],8:[10],9:[11]}[x.n];
  return eigene.some(z=>erlaubt.indexOf(z)<0);
 });
 p(fremd.length===0,"jedes Register zeigt nur seinen eigenen Inhalt",fremd);
 const behalten=await page.evaluate(()=>{
  const vorher=JSON.stringify(aufnahme);
  for(const n of [1,2,3,4,5,6,7,8,9,1]) setzeSchritt(n);
  return {gleich:JSON.stringify(aufnahme)===vorher};
 });
 p(behalten.gleich,"durch alle Register blättern verändert das Modell nicht",behalten);
 const sichtbar=await page.evaluate(()=>{
  setzeSchritt(9);
  const s=document.getElementById("p-register");
  const a=s.querySelector(".p-register-knopf.aktiv");
  const sr=s.getBoundingClientRect(), ar=a.getBoundingClientRect();
  return {links:ar.left>=sr.left-1,rechts:ar.right<=sr.right+1};
 });
 p(sichtbar.links&&sichtbar.rechts,"das aktive Register bleibt in der Leiste sichtbar",sichtbar);

 // ---- Verlauf bearbeiten -------------------------------------------------------
 console.log("\nVerlauf bearbeiten (verschieben, löschen)");
 await verlaufSetzen(page,2,[seg(1000,90,true,false),seg(2000,90),seg(3000,0,false,true)]);
 await reg(page,2);
 p(await klick(page,'[data-seg-runter="0"]'),"Segment nach unten schieben");
 const verschoben=await page.evaluate(()=>({
  laengen:aufnahme.segmente.map(s=>s.laenge),
  boden:aufnahme.segmente.map(s=>[s.bodenLinks,s.bodenRechts])
 }));
 p(JSON.stringify(verschoben.laengen)==="[2000,1000,3000]","die Reihenfolge hat sich geändert",verschoben);
 p(verschoben.boden[0][0]===false&&verschoben.boden[2][1]===true,
   "der Boden bleibt an den Aussenenden und wandert nicht mit",verschoben);
 page.once("dialog",d=>d.dismiss());
 await klick(page,'[data-seg-weg="1"]');
 p(await page.evaluate(()=>aufnahme.segmente.length)===3,
   "Abbrechen in der Rückfrage löscht nichts");
 page.once("dialog",d=>d.accept());
 await klick(page,'[data-seg-weg="1"]');
 const geloescht=await page.evaluate(()=>({
  anzahl:aufnahme.segmente.length,laengen:aufnahme.segmente.map(s=>s.laenge)}));
 p(geloescht.anzahl===2&&JSON.stringify(geloescht.laengen)==="[2000,3000]",
   "bestätigt wird das gewählte Segment gelöscht",geloescht);

 // ---- Handy und Tablet ----------------------------------------------------------
 console.log("\nHandy und Tablet");
 await verlaufSetzen(page,2,[seg(8000,90,true,false),seg(4000,90),seg(6000,0,false,true)]);
 for(const breite of [320,360,412,768,1280]){
  await page.setViewportSize({width:breite,height:900});
  let schlimm=[];
  for(let n=1;n<=8;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>{
    const w=document.documentElement;
    const ueber=[];
    // Die Registerleiste scrollt absichtlich seitwärts. Was innerhalb eines
    // solchen Behälters liegt, darf über den Bildrand hinausragen - geprüft
    // wird stattdessen, dass der Behälter selbst hineinpasst.
    const inScroller=el=>{
     for(let e=el.parentElement;e;e=e.parentElement){
      const o=getComputedStyle(e).overflowX;
      if(o==="auto"||o==="scroll")return true;
     }
     return false;
    };
    document.querySelectorAll("#p-app *").forEach(el=>{
     const b=el.getBoundingClientRect();
     if(b.width>0&&b.right>w.clientWidth+1&&!inScroller(el))
      ueber.push(el.tagName+"."+(el.className||""));
    });
    return {scroll:w.scrollWidth>w.clientWidth+1,ueber:ueber.slice(0,3)};
   });
   if(r.scroll||r.ueber.length)schlimm.push({n,...r});
  }
  p(schlimm.length===0,breite+" px: nichts läuft seitlich hinaus",schlimm);
 }
 await page.setViewportSize({width:800,height:1200});

 // ---- TEST 25 · keine JavaScript-Fehler -------------------------------------------
 console.log("\n25 · Keine JavaScript-Fehler");
 await page.evaluate(()=>{for(let n=1;n<=9;n++)setzeSchritt(n)});
 await page.waitForTimeout(200);
 p(fehler.length===0,"kein einziger JavaScript-Fehler in der ganzen Sitzung",fehler);

 console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden"+(fail?"  ·  "+fail+" FEHLGESCHLAGEN":"")+" ===");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});
