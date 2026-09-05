// Prueft die umgebaute Massaufnahme "Ort- und Seitenbleche" (js/20 + js/40)
// in der laufenden App. Geladen wird die echte index.html mit echten
// Skripten; Supabase wird nicht angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-anschlussblech-app-v3-01.js
//
// ALLE ERWARTUNGEN SIND VON HAND NACHGERECHNET und stehen als Kommentar dabei.
//
// Testfall: Pfannenziegel, Anschluss mit Bleilappen, Seitenblech.
//   a = 50, b = 50, Umschlag 15, Wandaufkantung 150  ->  Abwicklung 265 mm
//   Stuecklaenge 2000, Ueberlappung 70, Restschwelle 300
//   Segment 1 = 4000 mm:  ceil(4000/2000) = 2 Stuecke, Rest 2000 >= 300
//                         -> 2000+70 = 2070  und  2000
//   Segment 2 = 2500 mm:  ceil(2500/2000) = 2 Stuecke, Rest  500 >= 300
//                         -> 2070  und  500
//   Zuschnitte: 2070 / 2000 / 2070 / 500, je 265 mm breit
//   Blechflaeche = 265 * 6640 / 1e6 = 1,7596 m2
//   Abschnitt = laengstes Stueck = 2070 mm; 6640/2070 = 3,2 -> mindestens
//   4 Streifen, und mehr als eines passt nirgends zusammen (2000+500 = 2500
//   > 2070) -> genau 4 Streifen
//   Rolle 670: floor(670/265) = 2 je Abschnitt -> ceil(4/2) = 2 Abschnitte
//              -> 4140 mm ab Rolle -> 670*4140/1e6 = 2,7738 m2
//   Rolle 1000: floor(1000/265) = 3 -> ceil(4/3) = 2 Abschnitte -> 4140 mm
//              -> 4,14 m2   ->  die 670er Rolle ist die beste
//   Verschnitt bei 670: 2,7738 - 1,7596 = 1,0142 m2
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element soll
// sauber fehlschlagen und nicht in einen Timeout laufen - ein abgebrochener
// Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(180); return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); return true},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(90);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>anbaSetzeSchritt(k),n);await page.waitForTimeout(200)};
const segmente=async(page,liste)=>{await page.evaluate(l=>{
  anbSegmente=l.map(x=>({laenge:x[0],knick:!!x[1],knickWinkel:x[2]||0,knickMass:x[3]||0}));
  renderAnbSegmenteTable();},liste); await page.waitForTimeout(200)};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
   args:["--no-sandbox"]});
 const page=await b.newPage();
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,
   contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670];
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  $("measType").value="anschlussblech"; showMeasTypeSection("anschlussblech");
 });
 await page.waitForTimeout(400);
 await page.evaluate(()=>{$("anb_material").value="2"});

 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderAnschlussblechAufnahme==="function",
  zurueck:typeof anbaZuruecksetzen==="function",
  fuellen:typeof anbaFuellen==="function",
  zusatz:typeof anbaZusatzDaten==="function",
  fach:typeof berechneAnschlussblech==="function"&&typeof anbEingabenAusFeldern==="function"
    &&typeof anbZeichnung==="function"&&typeof anbTitel==="function",
  packen:typeof ebaPackeInStreifen==="function",
  zeigen:typeof zuschnittHtml==="function"&&typeof zuDruckHtml==="function",
  auswahl:typeof zuRollenAuswahlHtml==="function"
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/40 ist geladen",da);
 p(da.fach,"die Fachrechnung aus js/20 ist da und wird nicht nachgebaut",da);
 p(da.packen,"die gemeinsame Packrechnung aus js/29 ist da",da);
 p(da.zeigen&&da.auswahl,"die gemeinsame Zuschnitt-Darstellung aus js/33 ist da",da);
 // KEIN Nachbau: das Ergebnis kommt Zeichen fuer Zeichen aus der Fachdatei.
 const gleich=await page.evaluate(()=>({
  modul:JSON.stringify(anbaErgebnis()&&anbaErgebnis().teile),
  fach:JSON.stringify(berechneAnschlussblech(anbEingabenAusFeldern()).teile)
 }));
 p(gleich.modul===gleich.fach,"anbaErgebnis() ist die Fachrechnung, kein Nachbau",gleich);

 console.log("\nB · Sieben Register, nur eines sichtbar");
 const rr=await page.evaluate(()=>({
  namen:Array.from(document.querySelectorAll("#anba_register .ra-register-knopf"))
        .map(b=>b.querySelector(".ra-register-text").textContent.trim()),
  nummern:Array.from(document.querySelectorAll("#anba_register .ra-register-knopf"))
        .map(b=>b.querySelector(".ra-register-nr").textContent.trim())
 }));
 p(JSON.stringify(rr.namen)===JSON.stringify(
   ["Grunddaten","Schnitt","Segmente","Stückliste","Zuschnitt","Ausmass","Kontrolle"]),
   "die Registernamen und ihre Reihenfolge",rr.namen);
 p(JSON.stringify(rr.nummern)===JSON.stringify(["1","2","3","4","5","6","7"]),"durchnummeriert",rr.nummern);
 for(let n=1;n<=7;n++){
  await reg(page,n);
  const sicht=await page.evaluate(()=>[1,2,3,4,5,6,7].map(k=>{
   const e=$("anba_seite"+k); const cs=getComputedStyle(e);
   return !e.hidden&&cs.display!=="none"&&e.getBoundingClientRect().height>2;
  }));
  p(sicht.filter(Boolean).length===1&&sicht[n-1],"Register "+n+": nur die eigene Seite ist sichtbar",sicht);
 }
 await reg(page,1);
 const bl=await page.evaluate(()=>({zGesperrt:$("anba_zurueck").disabled,
   text:$("anba_weiter").textContent.trim()}));
 p(bl.zGesperrt===true,"auf Register 1 ist 'Zurück' gesperrt",bl);
 p(/^Weiter › Schnitt$/.test(bl.text),"der Weiter-Knopf nennt das nächste Register",bl.text);
 await reg(page,7);
 const fer=await page.evaluate(()=>({text:$("anba_weiter").textContent.trim(),
   gesperrt:$("anba_weiter").disabled}));
 p(fer.text==="Fertig › Fotos und Speichern"&&!fer.gesperrt,
   "auf dem letzten Register heisst er 'Fertig' und ist bedienbar",fer);

 console.log("\nC · Schnitt und Segmente kommen weiterhin von js/20");
 await reg(page,2);
 const sc=await page.evaluate(()=>({
  masse:Array.from(document.querySelectorAll("#anb_masse [data-anb]")).map(e=>e.dataset.anb),
  abschluss:Array.from(document.querySelectorAll("#anb_abschluss [data-anb]")).map(e=>e.dataset.anb),
  svg:$("anb_zeichnung").innerHTML.indexOf("<svg")>=0,
  warn:($("anb_warnung")||{}).textContent||""
 }));
 p(JSON.stringify(sc.masse)===JSON.stringify(["a","b"]),
   "Bleilappen: die Massfelder a und b werden von js/20 erzeugt",sc.masse);
 p(JSON.stringify(sc.abschluss)===JSON.stringify(["wandAufkantung"]),
   "Seitenblech: die Wandaufkantung als Abschluss",sc.abschluss);
 p(sc.svg,"der Schnitt wird gezeichnet");
 p(/Mindestmasse/.test(sc.warn),"die Mindestmass-Meldung von js/20 steht da",sc.warn.slice(0,60));
 // Der Wechsel der Anschlussart baut die Massfelder neu auf - auch nach einem
 // Registerwechsel, denn js/20 haengt direkt an diesem Auswahlfeld.
 await reg(page,3);
 await reg(page,2);
 const neu=await page.evaluate(()=>{
  $("anb_art").value="rinne"; $("anb_art").onchange();
  const felder=Array.from(document.querySelectorAll("#anb_masse [data-anb]")).map(e=>e.dataset.anb);
  $("anb_art").value="bleilappen"; $("anb_art").onchange();
  return felder;
 });
 p(JSON.stringify(neu)===JSON.stringify(["a","b","c","d"]),
   "der Wechsel der Anschlussart wirkt auch nach einem Registerwechsel",neu);
 await reg(page,3);
 const segLeben=await page.evaluate(()=>{
  const vor=anbSegmente.length;
  $("anb_addSegment").click();
  const nach=anbSegmente.length;
  anbSegmente.pop(); renderAnbSegmenteTable();
  return {vor,nach};
 });
 p(segLeben.nach===segLeben.vor+1,"'＋ Segment hinzufügen' wirkt weiterhin",segLeben);

 console.log("\nD · Stückliste, Rechnung unverändert (js/20)");
 await segmente(page,[[4000],[2500,true,30,1200]]);
 await reg(page,4);
 const st=await page.evaluate(()=>{
  const g=berechneAnschlussblech(anbEingabenAusFeldern());
  return {abw:g.abwicklung,laenge:g.laenge,stuecke:g.stuecke.map(s=>s.laenge),
    flaeche:g.flaeche,lappen:g.anzahlBleilappen};
 });
 p(st.abw===265,"Zuschnittbreite 265 mm (50+50+15+150, von Hand nachgerechnet)",st.abw);
 p(st.laenge===6500,"Gesamtlänge 6500 mm (4000 + 2500)",st.laenge);
 p(JSON.stringify(st.stuecke)===JSON.stringify([2070,2000,2070,500]),
   "vier Stücke: 2070 / 2000 / 2070 / 500",st.stuecke);
 // Von Hand: 265/1000 * 6500/1000 = 1,7225 -> gerundet 1,72
 p(Math.abs(st.flaeche-1.72)<0.005,"Materialfläche verlegt 1,72 m²",st.flaeche);
 // Von Hand: floor(6500/330) = 19
 p(st.lappen===19,"19 Bleilappen (6500 ÷ 330, abgerundet)",st.lappen);
 // Echt tippen: das Feld darf den Fokus nicht verlieren.
 const feldOk=await tippe(page,"#anb_stossLaenge","2500");
 const nachTippen=await page.evaluate(()=>({
  wert:$("anb_stossLaenge").value,fokus:document.activeElement.id,
  stuecke:berechneAnschlussblech(anbEingabenAusFeldern()).stuecke.map(s=>s.laenge)
 }));
 p(feldOk&&nachTippen.wert==="2500","die Stücklänge wird vollständig getippt",nachTippen);
 p(nachTippen.fokus==="anb_stossLaenge","das Feld behält den Fokus",nachTippen);
 // Von Hand mit Stoss 2500: Segment 4000 -> ceil(4000/2500)=2, Rest 1500
 //   -> 2500+70 = 2570 und 1500; Segment 2500 -> 1 Stueck, Rest 2500
 p(JSON.stringify(nachTippen.stuecke)===JSON.stringify([2570,1500,2500]),
   "und rechnet mit: 2570 / 1500 / 2500",nachTippen.stuecke);
 await page.evaluate(()=>{$("anb_stossLaenge").value="2000";renderAnbResult()});
 await page.waitForTimeout(150);

 console.log("\nE · Zuschnitt aus Rollenblech (gemeinsame Packrechnung)");
 const bleche=await page.evaluate(()=>anbaBleche());
 p(bleche.length===4,"vier Zuschnitte",bleche.length);
 p(bleche.every(x=>x.breite===265),"alle 265 mm breit",bleche.map(x=>x.breite));
 const plan=await page.evaluate(()=>anbaRollenPlan());
 // Von Hand: netto 265*6640/1e6 = 1,7596 m2
 p(Math.abs(plan.netto-1.7596)<1e-6,"Blechfläche 1,7596 m² (265 × 6640 mm)",plan.netto);
 p(plan.gruppen.length===1&&plan.gruppen[0].breite===265,"eine Streifenbreite: 265 mm",
   plan.gruppen.map(g=>g.breite));
 // Fehlt die Gruppe, muessen die folgenden Pruefungen sauber FEHLSCHLAGEN und
 // duerfen den Pruefstand nicht abbrechen - ein Abbruch sieht aus wie
 // "keine Fehler".
 const g0=plan.gruppen[0]||{streifen:[]};
 p(g0.abschnittLaenge===2070,"der Abschnitt ist so lang wie das längste Stück",
   g0.abschnittLaenge);
 p((g0.streifen||[]).length===4,"vier Streifen (2000+500 = 2500 > 2070)",
   (g0.streifen||[]).map(s=>s.stuecke.map(x=>x.laenge)));
 p(plan.bestes&&plan.bestes.breite===670&&Math.abs(plan.bestes.flaeche-2.7738)<1e-6,
   "beste Rolle 670 mm mit 2,7738 m² (2 Abschnitte à 2070 mm)",plan.bestes);
 p(plan.bestes&&Math.abs(plan.bestes.verschnitt-1.0142)<1e-6,
   "Verschnitt 1,0142 m² (2,7738 − 1,7596)",plan.bestes&&plan.bestes.verschnitt);
 const tausend=(plan.moeglich||[]).find(x=>x.breite===1000);
 p(tausend&&Math.abs(tausend.flaeche-4.14)<1e-6,"die 1000er Rolle ergäbe 4,14 m²",tausend);
 // Nachweis, dass wirklich die GEMEINSAME Packrechnung gerufen wird.
 const gerufen=await page.evaluate(()=>{
  const echt=window.ebaPackeInStreifen; let n=0;
  window.ebaPackeInStreifen=function(){n++;return echt.apply(null,arguments)};
  anbaRollenPlan();
  window.ebaPackeInStreifen=echt;
  return n;
 });
 p(gerufen>0,"ebaPackeInStreifen aus js/29 wird tatsächlich gerufen",gerufen);
 // Zwei kurze Stuecke muessen in EINEN Streifen passen, wenn der Abschnitt reicht.
 const zwei=await page.evaluate(()=>{
  anbSegmente=[{laenge:3000,knick:false},{laenge:900,knick:false}];
  renderAnbSegmenteTable();
  const pl=anbaRollenPlan();
  const g=pl.gruppen[0]||{streifen:[]};
  return {stuecke:anbaBleche().map(x=>x.laenge),
    streifen:(g.streifen||[]).length,
    belegung:(g.streifen||[]).map(s=>s.stuecke.map(x=>x.laenge))};
 });
 // Von Hand: Segment 3000 -> 2070 und 1000; Segment 900 -> 900.
 // Abschnitt 2070; 1000+900 = 1900 <= 2070 -> zwei Streifen.
 p(JSON.stringify(zwei.stuecke)===JSON.stringify([2070,1000,900]),
   "Stücke 2070 / 1000 / 900",zwei.stuecke);
 p(zwei.streifen===2&&zwei.belegung.some(s=>s.length===2),
   "1000 und 900 liegen im selben Streifen (Abschnitt 2070)",zwei);
 await segmente(page,[[4000],[2500,true,30,1200]]);
 // Firstgehrung: das Endstueck ist ein anderer Zuschnitt und darf nicht mit
 // einem geraden Stueck gleicher Laenge zusammengefasst werden.
 const gehr=await page.evaluate(()=>{
  $("anb_firstgehrung").checked=true; renderAnbResult();
  const b=anbaBleche();
  $("anb_firstgehrung").checked=false; renderAnbResult();
  return b;
 });
 // Von Hand: letztes Stueck 500 + 100 Gehrungszugabe = 600
 p(gehr.length===4&&(gehr[3]||{}).laenge===600&&(gehr[3]||{}).merkmal==="Firstgehrung",
   "mit Firstgehrung: das Endstück ist 600 mm und trägt ein eigenes Merkmal",gehr[3]);
 await reg(page,5);
 const zt=await page.evaluate(()=>{
  const d=$("anba_seite5");
  d.querySelectorAll("details").forEach(x=>x.open=true);
  return {text:d.textContent, nan:/NaN|undefined/.test(d.textContent)};
 });
 p(/265/.test(zt.text)&&/Streifenbreite/i.test(zt.text),"das Register nennt die Streifenbreite zuerst",
   zt.text.slice(0,140));
 p(/2 ×/.test(zt.text)||/2×/.test(zt.text),"gleiche Zuschnitte werden zusammengefasst",zt.text.slice(0,400));
 p(!zt.nan,"kein NaN im Zuschnitt-Register");
 p(/Rollenauswahl|Rollen für diese/i.test(zt.text),"die Rollenauswahl für diese Aufnahme ist da",
   zt.text.slice(0,200));

 console.log("\nF · Ausmass");
 const am=await page.evaluate(()=>anbaAusmassZeilen());
 const bez=am.map(x=>x.bezeichnung);
 p(am.length>=8,"das Ausmass hat Positionen",am.length);
 p(/Seitenblech|Ortblech|Anschluss/.test(bez[0])&&am[0].menge==="6,50",
   "Position 1: die Länge 6,50 m",am[0]);
 p(am[1].menge==="2","zwei Segmente",am[1]);
 p(am[2].menge==="4","vier Zuschnittstücke",am[2]);
 p(am[3].menge==="265","Zuschnittbreite 265 mm",am[3]);
 p(am[5].menge==="1,76","Blechfläche Zuschnitt 1,76 m²",am[5]);
 const knick=am.find(x=>/Knick/.test(x.bezeichnung));
 p(knick&&knick.menge==="1","ein Knick im Verlauf",knick);
 // Achtung: die Bezeichnung von Position 1 enthaelt ebenfalls "Bleilappen"
 // ("Seitenblech mit Bleilappen, Länge") - deshalb genau vergleichen.
 const lappen=am.find(x=>x.bezeichnung==="Bleilappen");
 p(lappen&&lappen.menge==="19","19 Bleilappen",lappen);
 p(!am.some(x=>/Preis|Fr\.|Artikel/i.test(x.bezeichnung)),"keine Preise, keine Artikelnummern",bez);
 await reg(page,6);
 const at=await page.evaluate(()=>$("anba_seite6").textContent);
 p(/Titanzink/.test(at),"das gewählte Material steht im Register",at.slice(0,200));

 console.log("\nG · Kontrolle");
 const k1=await page.evaluate(()=>anbaPruefungen());
 p(k1.filter(x=>x.art==="fehler").length===0,"vollständige Aufnahme: kein Fehler",k1.map(x=>x.text));
 const k2=await page.evaluate(()=>{
  const alt=$("anb_material").value; $("anb_material").value="";
  const m=anbaPruefungen(); $("anb_material").value=alt; return m;
 });
 p(k2.some(x=>x.art==="warnung"&&/Material/.test(x.text)),"fehlendes Material ist eine Warnung",
   k2.map(x=>x.text));
 const k3=await page.evaluate(()=>{
  const alt=anbSegmente.slice(); anbSegmente=[];
  const m=anbaPruefungen(); anbSegmente=alt; return m;
 });
 p(k3.some(x=>x.art==="fehler"&&/Segment/.test(x.text)),"ohne Segment ist es ein Fehler",
   k3.map(x=>x.text));
 // Das Mindestmass der Norm ist ein Fehler, keine Geschmacksfrage.
 const k4=await page.evaluate(()=>{
  const f=document.querySelector('#anb_masse [data-anb="a"]');
  const alt=f.value; f.value="20"; renderAnbResult();
  const m=anbaPruefungen(); f.value=alt; renderAnbResult(); return m;
 });
 p(k4.some(x=>x.art==="fehler"&&/Mindestmass/.test(x.text)),
   "ein Mass unter dem Mindestmass ist ein Fehler",k4.map(x=>x.text));
 const k5=await page.evaluate(()=>{
  const alt=$("anb_ueberlappung").value; $("anb_ueberlappung").value="3000"; renderAnbResult();
  const m=anbaPruefungen(); $("anb_ueberlappung").value=alt; renderAnbResult(); return m;
 });
 p(k5.some(x=>x.art==="fehler"&&/Überlappung/.test(x.text)),
   "eine Überlappung grösser als die Stücklänge ist ein Fehler",k5.map(x=>x.text));
 const marke=await page.evaluate(()=>{
  const alt=anbSegmente.slice(); anbSegmente=[];
  anbaMarkeNachfuehren();
  const el=document.querySelector('#anba_register [data-anba-schritt="'+ANBA_KONTROLLE+'"] .ra-register-punkt');
  const rot=el?el.className.indexOf("fehler")>=0:false;
  anbSegmente=alt; renderAnbSegmenteTable(); anbaMarkeNachfuehren();
  return {da:!!el,rot};
 });
 p(marke.da&&marke.rot,"das Kontroll-Register bekommt bei einem Fehler eine rote Marke",marke);
 // Auch beim ZEICHNEN muss die Marke entstehen - und zwar am LETZTEN Register.
 // Gemessen ueber die Position in der Leiste, nicht ueber die Konstante.
 const marke2=await page.evaluate(()=>{
  const alt=anbSegmente.slice(); anbSegmente=[];
  renderAnschlussblechAufnahme();
  const kn=Array.from(document.querySelectorAll("#anba_register .ra-register-knopf"));
  const mit=kn.map((b,i)=>b.querySelector(".ra-register-punkt")?i:-1).filter(i=>i>=0);
  anbSegmente=alt; renderAnbSegmenteTable(); renderAnschlussblechAufnahme();
  return {anzahl:kn.length,mit};
 });
 p(marke2.mit.length===1&&marke2.mit[0]===marke2.anzahl-1,
   "und schon beim Zeichnen sitzt sie am letzten Register",marke2);

 console.log("\nH · Speichern und Wiederöffnen");
 const sp=await page.evaluate(()=>{
  $("measTitle").value="Ortblech Giebel"; $("measDate").value="2026-09-05";
  setMeasProjectField(7);
  const m=buildMeasurementFromForm();
  return {typ:m.type,d:m.data};
 });
 p(sp.typ==="anschlussblech","Typ im Payload",sp.typ);
 // SUPERSET: die Felder bis v3.00 bleiben Zeichen fuer Zeichen erhalten.
 p(sp.d.abwicklung===265&&Array.isArray(sp.d.teile)&&sp.d.teile.length>0
   &&Array.isArray(sp.d.stueckliste)&&sp.d.stueckliste.length===4
   &&sp.d.material==="2"&&sp.d.art==="bleilappen"&&Array.isArray(sp.d.segmente),
   "die Felder bis v3.00 stehen weiterhin im Payload",Object.keys(sp.d));
 p(Math.abs(sp.d.flaeche_m2-1.76)<0.005,"neu: Blechfläche gespeichert",sp.d.flaeche_m2);
 p(Array.isArray(sp.d.ausmass)&&sp.d.ausmass.length>0,"neu: Ausmass gespeichert",
   (sp.d.ausmass||[]).length);
 p(sp.d.zuschnitt&&Array.isArray(sp.d.zuschnitt.gruppen)&&sp.d.zuschnitt.bestes,
   "neu: Rollenblech-Plan gespeichert",sp.d.zuschnitt&&Object.keys(sp.d.zuschnitt));
 const wieder=await page.evaluate(d=>{
  anbFormularFuellen(d); anbaFuellen(d);
  return {segmente:anbSegmente.length,abw:anbaErgebnis().abwicklung,schritt:anbaSchritt,
    teile:anbaBleche().map(x=>x.laenge+"x"+x.breite)};
 },sp.d);
 p(wieder.segmente===2&&wieder.abw===265,"Wiederöffnen stellt den Stand her",wieder);
 p(JSON.stringify(wieder.teile)===JSON.stringify(["2070x265","2000x265","2070x265","500x265"]),
   "dieselben Zuschnitte nach dem Wiederöffnen",wieder.teile);
 p(wieder.schritt===1,"nach dem Öffnen beginnt es bei Register 1");
 const aus=await page.evaluate(()=>{
  anbaRollenAuswahl=[670];
  const z=buildMeasurementFromForm().data.zuschnitt||{};
  return {gespeichert:z.auswahl||null,breiten:z.breiten||null};
 });
 p(JSON.stringify(aus.gespeichert)===JSON.stringify([670])
   &&JSON.stringify(aus.breiten)===JSON.stringify([670]),
   "die Rollenauswahl dieser Aufnahme wird gespeichert und wirkt",aus);
 await page.evaluate(()=>{anbaRollenAuswahl=[];renderAnschlussblechAufnahme()});

 console.log("\nI · Ein Datensatz bis v3.00 öffnet unverändert");
 // Das alte Format hat weder flaeche_m2 noch ausmass noch zuschnitt.
 const alt=await page.evaluate(()=>{
  anbFormularFuellen({deckung:"biber",art:"steg",ausfuehrung:"ort",material:"3",
    a:60,b:60,saum:20,ortAufkantung:60,ortOben:80,ortStirn:120,ortNase:20,
    stossLaenge:2000,ueberlappung:70,lattenabstand:330,firstgehrung:false,
    segmente:[{laenge:3000,knick:false,knickWinkel:0,knickMass:0}],laenge:3000});
  anbaFuellen({material:"3"});
  const g=anbaErgebnis();
  return {segmente:anbSegmente.length,art:$("anb_art").value,deck:$("anb_deckung").value,
    abw:g.abwicklung,stuecke:g.stuecke.map(s=>s.laenge),auswahl:anbaRollenAuswahl.slice()};
 });
 p(alt.segmente===1&&alt.art==="steg"&&alt.deck==="biber",
   "die gespeicherte Anschlussart und Deckung werden übernommen",alt);
 // Von Hand: Segment 3000 -> ceil(3000/2000) = 2, Rest 1000 -> 2070 und 1000
 p(JSON.stringify(alt.stuecke)===JSON.stringify([2070,1000]),
   "und rechnet unverändert: 2070 / 1000",alt.stuecke);
 p(JSON.stringify(alt.auswahl)==="[]","ohne gespeicherte Rollenauswahl gilt das ganze Lager",alt.auswahl);
 await page.evaluate(()=>{anbFormularZuruecksetzen();anbaZuruecksetzen();$("anb_material").value="2"});
 await segmente(page,[[4000],[2500,true,30,1200]]);

 console.log("\nJ · Fotos erst nach 'Fertig'");
 await reg(page,1);
 const m1=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(m1.hidden||m1.display==="none"||m1.h<2,"während der Register ist der Fotobereich zu",m1);
 await reg(page,7);
 const rk=await klick(page,"#anba_weiter");
 await page.waitForTimeout(400);
 const m2=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(rk==="ok","der Fertig-Knopf ist bedienbar",rk);
 p(!m2.hidden&&m2.display!=="none"&&m2.h>2,"nach 'Fertig' ist der Fotobereich offen",m2);

 console.log("\nK · Druck");
 const dr=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  const m=buildMeasurementFromForm();
  await printMeasurement(Object.assign({},m,{title:"Ortblech Giebel",date:"2026-09-05",
    project_id:7,created_by:"u1",created_at:"2026-09-05T08:00:00Z"}),{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(dr.length>500,"das PDF wird erzeugt",dr.length);
 p(/Bahnhofstrasse 12/.test(dr),"Objektadresse als Haupttitel");
 p(/St.{0,6}ckliste/.test(dr)&&/2070 × 265/.test(dr),"die Stückliste steht im PDF");
 p(/Ausmass/.test(dr),"das Ausmass steht im PDF");
 p(/Rollenblech|Zuschnitt aus/.test(dr),"das Rollenblech steht im PDF");
 p(!/NaN|undefined/.test(dr),"kein NaN im PDF");
 const drAlt=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  await printMeasurement({type:"anschlussblech",title:"Alt",date:"2026-09-01",project_id:7,
    data:{deckung:"pfanne",art:"bleilappen",ausfuehrung:"seite",material:"3",
      a:50,b:50,saum:15,wandAufkantung:150,deckHoehe:60,
      stossLaenge:2000,ueberlappung:70,lattenabstand:330,firstgehrung:false,
      segmente:[{laenge:3000,knick:false,knickWinkel:0,knickMass:0}],laenge:3000,
      abwicklung:265,teile:[{name:"Anschlussblech",abwicklung:265}],
      stueckliste:[{nr:1,laenge:2070,gehrung:false},{nr:2,laenge:1000,gehrung:false}],
      flaeche:0.8}},{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(drAlt.length>500&&!/NaN|undefined/.test(drAlt),"ein Datensatz bis v3.00 druckt ohne Fehler",drAlt.length);
 p(/2070 × 265/.test(drAlt)&&/1000 × 265/.test(drAlt),"und zeigt seine eigenen Werte");
 p(!/Ausmass/.test(drAlt),"ohne Ausmass im Datensatz steht auch keines im PDF");

 console.log("\nL · Mobil: nichts läuft seitlich hinaus");
 for(const br of [320,360,390,412,768]){
  await page.setViewportSize({width:br,height:800});
  let schlimm=null;
  for(let n=1;n<=7;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>{
    const w=$("measTypeAnschlussblech");
    const raus=[];
    w.querySelectorAll("*").forEach(e=>{
     if(e.closest(".scroll")||e.closest(".ra-register"))return;
     const b=e.getBoundingClientRect();
     if(b.width>0&&b.right>document.documentElement.clientWidth+1)raus.push(e.className||e.tagName);
    });
    return {raus:raus.slice(0,3),scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
   });
   if(r.raus.length||r.scroll)schlimm={register:n,...r};
  }
  p(!schlimm,"Breite "+br+" px: kein seitlicher Überlauf",schlimm);
 }
 await page.setViewportSize({width:1280,height:900});

 p(fehler.length===0,"keine JavaScript-Fehler während des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-anschlussblech-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
