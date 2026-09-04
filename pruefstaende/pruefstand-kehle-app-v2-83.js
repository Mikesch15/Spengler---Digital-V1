// Prueft den Einbau der Kehle-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-kehle-app-v2-83.js
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
  if(!f)return false; f.focus(); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(80);
 return true;
}
async function waehle(page,sel,wert){
 const r=await page.evaluate(([s,w])=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  e.value=String(w); e.dispatchEvent(new Event("change",{bubbles:true})); return "ok";
 },[sel,wert]);
 await page.waitForTimeout(160);
 return r;
}
const reg=async(page,n)=>{await page.evaluate(k=>keaSetzeSchritt(k),n);await page.waitForTimeout(160)};
const stand=async(page,o)=>{
 await page.evaluate(w=>{Object.assign(kehleA,JSON.parse(JSON.stringify(w)));renderKehleAufnahme()},o);
 await page.waitForTimeout(140);
};
const text=page=>page.evaluate(()=>$("kehleAufnahme").innerText);

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
  blechRollenbreiten=[];                       // -> Standard 1000 / 670
  kehleSettings={stoss_laenge:2000,ueberlappung:70,rest_schwelle:500};
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  $("measType").value="kehle"; showMeasTypeSection("kehle");
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,2));
 if(await page.evaluate(()=>typeof renderKehleAufnahme!=="function")){
  console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden (Modul nicht geladen - Abbruch) ===");
  await b.close(); process.exit(1);
 }

 // ---- A · Modul geladen, Fachdatei unangetastet --------------------------
 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderKehleAufnahme==="function",
  zurueck:typeof keaZuruecksetzen==="function",
  fuellen:typeof keaFuellen==="function",
  zusatz:typeof keaZusatzDaten==="function",
  // Fachlogik aus js/25 - unveraendert die Quelle
  rechnen:typeof kehleBerechnen==="function",
  felder:typeof kehleEingabenAusFeldern==="function",
  anzeigen:typeof renderKehleResult==="function",
  wert:typeof kehleWert==="function",
  labels:typeof KEHLE_LABELS==="object",
  // geteilte Rechnungen
  teilen:typeof teileLaengeInStuecke==="function",
  packen:typeof ebaPackeInStreifen==="function",
  darstellen:typeof zuschnittHtml==="function",
  register:document.querySelectorAll(".ra-register-knopf").length,
  stummelWeg:$("kehleStummel")?$("kehleStummel").hidden:null,
  abwicklungen:KEA_ABWICKLUNGEN.slice(),
  kontrolle:KEA_KONTROLLE,
  einst:JSON.parse(JSON.stringify(KEHLE_STANDARD))
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/34 ist geladen",da);
 p(da.rechnen&&da.felder&&da.anzeigen&&da.wert&&da.labels,"die Fachfunktionen aus js/25 sind da",da);
 p(da.teilen,"die Aufteilung aus js/13 ist da",da);
 p(da.packen,"die Packrechnung aus js/29 ist da",da);
 p(da.darstellen,"die gemeinsame Zuschnitt-Darstellung aus js/33 ist da",da);
 p(da.register===6,"sechs Register",da);
 p(da.stummelWeg===true,"der Stummel ist unsichtbar",da);
 p(JSON.stringify(da.abwicklungen)==="[400,500,670]","genau die drei Abwicklungen 400 / 500 / 670",da);
 p(da.kontrolle===6,"die Kontroll-Marke haengt an der Registerzahl, nicht an einer festen Nummer",da);
 p(da.einst.stoss_laenge===2000&&da.einst.ueberlappung===70&&da.einst.rest_schwelle===500,
   "die Kehle-Einstellungen haben Vorgabewerte",da);

 // ---- B · Bruecke ---------------------------------------------------------
 console.log("\nB · Bruecke zum bestehenden Modul");
 await stand(page,{material:"2",abwicklung:500,mittelrippe:"ohne",nh:"42.5",nl:"23.5",gl:"5000",segmente:[]});
 const br=await page.evaluate(()=>{
  const g=keaErgebnis();
  const h=kehleBerechnen(kehleEingabenAusFeldern());
  return {nh:$("kehle_nh").value,nl:$("kehle_nl").value,gl:$("kehle_gl").value,
   b:g.b,c:g.c,d:g.d,A:g.A,gleich:JSON.stringify(g)===JSON.stringify(h)};
 });
 p(br.nh==="42.5"&&br.nl==="23.5"&&br.gl==="5000","die Stummelfelder sind aus dem Modell gefuellt",br);
 p(br.gleich,"keaErgebnis() ist Zeichen fuer Zeichen kehleBerechnen() - kein Nachbau",br);
 p(Math.abs(br.b-66.4833359380795)<1e-9&&Math.abs(br.c-122.7654835385804)<1e-9
   &&Math.abs(br.d-47.45822312519795)<1e-9,
   "b / c / d unveraendert wie in der Excel-Vorlage (66.48 / 122.77 / 47.46)",br);
 p(Math.abs(br.A-5452.895335098885)<1e-6,"und die Kehllaenge A",br);

 // ---- C · Register --------------------------------------------------------
 console.log("\nC · Register");
 const namen=await page.evaluate(()=>Array.from(document.querySelectorAll(".ra-register-knopf .ra-register-text")).map(e=>e.textContent));
 p(JSON.stringify(namen)==='["Grunddaten","Winkel","Segmente","Zuschnitt","Ausmass","Kontrolle"]',
   "die Register heissen und stehen wie in allen uebrigen Arten",namen);
 // Jedes Register zeigt nur den EIGENEN Inhalt: die erste Ueberschrift traegt
 // die eigene Nummer, keine weitere eine fremde.
 const eigen=[];
 for(let n=1;n<=6;n++){
  await reg(page,n);
  const t=await page.evaluate(()=>{
   const h=Array.from(document.querySelectorAll("#kea_kopf h2")).map(x=>x.textContent.trim());
   return {h,aktiv:(document.querySelector(".ra-register-knopf.aktiv .ra-register-nr")||{}).textContent};
  });
  const fremd=t.h.filter((x,i)=>i>0&&/^[1-6] ·/.test(x)&&x.indexOf(n+" ·")!==0);
  eigen.push({n,erste:t.h[0],aktiv:t.aktiv,fremd});
 }
 p(eigen.every(x=>x.erste&&x.erste.indexOf(x.n+" ·")===0),"jedes Register zeigt seine eigene Ueberschrift",eigen.map(x=>x.erste));
 p(eigen.every(x=>x.fremd.length===0),"und keine fremde",eigen.filter(x=>x.fremd.length));
 p(eigen.every(x=>String(x.aktiv)===String(x.n)),"der Registerknopf wird mitgesetzt",eigen.map(x=>x.aktiv));
 // Blaettern verliert nichts: das Modell ist die Wahrheit, nicht das Formular.
 const vor=await page.evaluate(()=>JSON.stringify(kehleA));
 for(let n=1;n<=6;n++)await reg(page,n);
 const nach=await page.evaluate(()=>JSON.stringify(kehleA));
 p(vor===nach,"durch alle Register blaettern veraendert das Modell nicht");
 await reg(page,1);
 const knoepfe=await page.evaluate(()=>({z:$("kea_zurueck").disabled,w:$("kea_weiter").textContent.trim()}));
 p(knoepfe.z===true,"auf dem ersten Register ist Zurueck gesperrt",knoepfe);
 await reg(page,6);
 const letzter=await page.evaluate(()=>({z:$("kea_zurueck").disabled,w:$("kea_weiter").textContent.trim(),
  gesperrt:$("kea_weiter").disabled}));
 p(/Fertig/.test(letzter.w)&&letzter.gesperrt===false,
   "auf dem letzten Register heisst der Knopf Fertig und ist bedienbar",letzter);

 // ---- D · Grunddaten ------------------------------------------------------
 console.log("\nD · Grunddaten: Material, Abwicklung, Mittelrippe");
 await reg(page,1);
 const abw=await page.evaluate(()=>Array.from($("kea_abwicklung").options).map(o=>o.value));
 p(JSON.stringify(abw)==='["400","500","670"]',"genau drei Abwicklungen zur Auswahl",abw);
 const mr=await page.evaluate(()=>Array.from($("kea_mittelrippe").options).map(o=>o.textContent));
 p(JSON.stringify(mr)==='["ohne Mittelrippe","mit Mittelrippe"]',
   "Kehle mit oder ohne Mittelrippe zur Auswahl",mr);
 await waehle(page,"#kea_abwicklung","670");
 p(await page.evaluate(()=>keaZahl(kehleA.abwicklung))===670,"die Abwicklung kommt ins Modell");
 await waehle(page,"#kea_mittelrippe","mit");
 p(await page.evaluate(()=>kehleA.mittelrippe)==="mit","die Ausfuehrung kommt ins Modell");
 const mitT=(await text(page)).toLowerCase();
 p(/mittelrippe/.test(mitT)&&/k \/ 2|innenwinkel/.test(mitT),
   "mit Mittelrippe wird der Innenwinkel zur Mittelrippe genannt");
 await waehle(page,"#kea_mittelrippe","ohne");
 const ohneT=(await text(page)).toLowerCase();
 p(/biegewinkel/.test(ohneT),"ohne Mittelrippe der Biegewinkel Kehlblech (d)");
 await waehle(page,"#kea_abwicklung","500");
 await waehle(page,"#kea_material","2");
 p(await page.evaluate(()=>kehleA.material)==="2","das Material kommt ins Modell");

 // ---- E · Winkel: Ergebnisbox nur hier, echtes Tippen ---------------------
 console.log("\nE · Winkel");
 await reg(page,1);
 const box1=await page.evaluate(()=>$("keaErgebnisBox").hidden);
 await reg(page,2);
 const box2=await page.evaluate(()=>({h:$("keaErgebnisBox").hidden,
  txt:$("kehle_haupt").innerText}));
 p(box1===true&&box2.h===false,"die Ergebnisanzeige der Vorlage gehoert zum Register Winkel",{box1,h:box2.h});
 p(/66\.48/.test(box2.txt)&&/122\.77/.test(box2.txt)&&/47\.46/.test(box2.txt),
   "sie zeigt unveraendert b / c / d",box2.txt.slice(0,120));
 // Ziffer fuer Ziffer tippen: das Feld darf den Fokus nicht verlieren.
 await tippe(page,"#kea_gl","4800");
 const tip=await page.evaluate(()=>({wert:$("kea_gl").value,fokus:document.activeElement&&document.activeElement.id,
  modell:kehleA.gl}));
 p(tip.wert==="4800"&&tip.fokus==="kea_gl","die Gefaellslaenge laesst sich ganz eintippen, ohne den Fokus zu verlieren",tip);
 p(String(tip.modell)==="4800","und steht im Modell",tip);
 await tippe(page,"#kea_gl","5000");
 await page.evaluate(()=>{$("kea_gl").dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(160);

 // ---- F · Segmente --------------------------------------------------------
 console.log("\nF · Segmente");
 await reg(page,3);
 p((await page.evaluate(()=>keaSegmente().length))===0,"noch kein Segment");
 p(await klick(page,"#kea_ausA")==="ok","aus der Kehllaenge A aufteilen");
 const segA=await page.evaluate(()=>({
  segs:keaSegmente().map(s=>[keaZahl(s.laenge),keaZahl(s.ueberlappung)]),
  summe:Math.round(keaSummeLaenge()),
  zuschnitt:Math.round(keaSummeZuschnitt())
 }));
 p(segA.segs.length===3,"drei Segmente aus A = 5453 mm bei 2000 mm Stoss/Stoss",segA);
 p(JSON.stringify(segA.segs)==="[[2000,70],[2000,70],[1453,0]]",
   "Laenge Stoss/Stoss und Ueberlappung je Segment",segA);
 p(segA.summe===5453,"die Summe der Segmente entspricht der Kehllaenge A",segA);
 p(segA.zuschnitt===5593,"Zuschnitt = Laenge + Ueberlappung (2070 + 2070 + 1453)",segA);
 // Zuschnitt als Laenge x Breite
 const lxb=await page.evaluate(()=>$("kehleAufnahme").innerText);
 p(/2['’]070/.test(lxb)&&/×/.test(lxb)&&/500/.test(lxb),
   "die Zuschnittspalte nennt Laenge x Breite");
 // Ein Segment von Hand
 p(await klick(page,"#kea_segPlus")==="ok","ein Segment von Hand hinzufuegen");
 p((await page.evaluate(()=>keaSegmente().length))===4,"jetzt vier Segmente");
 const vorgabe=await page.evaluate(()=>{const s=keaSegmente()[3];return s?keaZahl(s.ueberlappung):null});
 p(vorgabe===70,"das neue Segment traegt die Ueberlappung aus den Einstellungen",vorgabe);
 // Tippen in der Stueckliste
 await tippe(page,'[data-kea-laenge="3"]',"1250");
 const tip2=await page.evaluate(()=>{const f=document.querySelector('[data-kea-laenge="3"]'), s=keaSegmente()[3];
  return {wert:f?f.value:null,
   fokus:document.activeElement&&document.activeElement.getAttribute("data-kea-laenge"),
   modell:s?keaZahl(s.laenge):null};});
 p(tip2.wert==="1250"&&tip2.fokus==="3","die Laenge laesst sich ganz eintippen, ohne den Fokus zu verlieren",tip2);
 p(tip2.modell===1250,"und steht im Modell",tip2);
 await tippe(page,'[data-kea-ueb="3"]',"90");
 p((await page.evaluate(()=>{const s=keaSegmente()[3];return s?keaZahl(s.ueberlappung):null}))===90,"die Ueberlappung je Segment ist frei");
 p((await page.evaluate(()=>{const s=keaSegmente()[3];return s?Math.round(keaZuschnittLaenge(s)):null}))===1340,
   "Zuschnitt = 1250 + 90 = 1340 mm");
 // Loeschen mit Rueckfrage
 p(await klick(page,'[data-kea-weg="3"]')==="ok","Segment loeschen");
 p((await page.evaluate(()=>keaSegmente().length))===3,"wieder drei Segmente");
 // Die Ueberlappungs-Vorgabe kommt wirklich aus den Einstellungen
 await page.evaluate(()=>{kehleSettings={stoss_laenge:2000,ueberlappung:120,rest_schwelle:500};renderKehleAufnahme()});
 await klick(page,"#kea_segPlus");
 p((await page.evaluate(()=>{const s=keaSegmente()[3];return s?keaZahl(s.ueberlappung):null}))===120,
   "eine geaenderte Vorgabe wirkt beim naechsten Segment");
 await klick(page,'[data-kea-weg="3"]');
 await page.evaluate(()=>{kehleSettings={stoss_laenge:2000,ueberlappung:70,rest_schwelle:500};renderKehleAufnahme()});

 // ---- G · Zuschnitt aus Rollenblech --------------------------------------
 console.log("\nG · Zuschnitt aus Rollenblech");
 await reg(page,4);
 // Seit v2.85 ist die Hauptansicht die Liste STUECKZAHL x LAENGE x ABWICKLUNG;
 // die Kennzahlen stehen darunter aufklappbar. Fuer die Pruefung aufklappen -
 // vorhanden und erreichbar muessen sie sein, nur nicht im Vordergrund.
 await page.evaluate(()=>{document.querySelectorAll("#kea_kopf details.zu-details")
   .forEach(d=>d.open=true)});
 await page.waitForTimeout(60);
 const zu=await page.evaluate(()=>{
  const plan=keaZuschnittPlan(), rp=keaRollenPlan();
  const kenn=Array.from(document.querySelectorAll("#kea_kopf .zu-kennzahlen > div"))
    .map(e=>e.innerText.replace(/\s+/g," ").trim());
  return {art:plan.art,breiten:plan.streifenbreiten,kenn,
   bestes:rp.bestes,netto:Number(rp.netto.toFixed(4)),
   moeglich:rp.moeglich.map(m=>[m.breite,m.jeTafel,m.rollenLaenge,Number(m.flaeche.toFixed(4))]),
   txt:$("kea_kopf").innerText};
 });
 p(zu.art==="rolle","der Plan hat die gemeinsame Form (js/33)",zu.art);
 p(/streifenbreite/i.test(zu.kenn[0]||""),"die Streifenbreite steht als ERSTE Kennzahl",zu.kenn);
 p(/500/.test(zu.kenn[0]||""),"und nennt die Abwicklung 500 mm",zu.kenn[0]);
 p(Math.abs(zu.netto-2.7965)<1e-4,"Blech netto = 5593 mm x 500 mm = 2.80 m2",zu.netto);
 // Seit v2.88 wird jedes Stueck auf SEINE Laenge geschnitten. Von Hand:
 // Zuschnitte 2070, 2070, 1453. Rolle 1000 ÷ 500 = 2 Streifen ->
 // 2070+1453 = 3523 und 2070 -> Rollenlaenge 3523, Flaeche 3.523 m2.
 p(zu.bestes&&zu.bestes.breite===1000&&zu.bestes.jeTafel===2&&zu.bestes.rollenLaenge===3523,
   "beste Rolle 1000 mm: 2 Streifen, 3'523 mm ab Rolle",zu.bestes);
 p(zu.bestes&&Math.abs(zu.bestes.flaeche-3.523)<1e-6&&Math.abs(zu.bestes.verschnitt-0.7265)<1e-4,
   "3.52 m2 Blech, 0.73 m2 Verschnitt",zu.bestes);
 // Rolle 670 ÷ 500 = 1 Streifen -> alle 5593 mm hintereinander.
 const r670=zu.moeglich.find(m=>m[0]===670);
 p(!!r670&&r670[1]===1&&r670[2]===5593,"670 mm: 1 Streifen, 5'593 mm ab Rolle",r670);
 p(!/NaN|undefined|Infinity/.test(zu.txt),"kein NaN im Zuschnitt",
   {t:(zu.txt.match(/NaN|undefined|Infinity/)||[""])[0]});
 // Es gibt in der App nur EINE Packrechnung. Beweis: sie wird tatsaechlich
 // gerufen, und mehrere kurze Stuecke landen im selben Streifen - eine
 // naive Rechnung "ein Stueck je Streifen" kaeme auf drei statt zwei.
 const geteilt=await page.evaluate(()=>{
  const echt=ebaPackeInBaender; let n=0;
  ebaPackeInBaender=function(){n++;return echt.apply(this,arguments)};
  const sicher=JSON.parse(JSON.stringify(kehleA.segmente));
  kehleA.segmente=[{laenge:1000,ueberlappung:0},{laenge:1000,ueberlappung:0},{laenge:2070,ueberlappung:0}];
  const rp=keaRollenPlan();
  const b=rp.moeglich.find(m=>m.breite===1000)||rp.bestes;
  const st=(b&&b.verteilung)||[];
  kehleA.segmente=sicher; ebaPackeInBaender=echt; renderKehleAufnahme();
  return {n,streifen:st.length,belegt:st.map(x=>x.stuecke.length).sort()};
 });
 p(geteilt.n>0,"keaRollenPlan ruft die gemeinsame Packrechnung aus js/29",geteilt);
 p(geteilt.streifen===2&&JSON.stringify(geteilt.belegt)==="[1,2]",
   "zwei kurze Stuecke liegen im selben Streifen - nicht eines je Streifen",geteilt);
 // Ohne Segmente wird nichts behauptet
 const leer=await page.evaluate(()=>{
  const sicher=JSON.parse(JSON.stringify(kehleA.segmente));
  kehleA.segmente=[]; renderKehleAufnahme();
  const t=$("kea_kopf").innerText;
  kehleA.segmente=sicher; renderKehleAufnahme();
  return t;
 });
 p(/Noch nichts zuzuschneiden|zuerst Segmente/i.test(leer),"ohne Segmente wird nichts gerechnet",leer.slice(0,160));

 // ---- H · Ausmass ---------------------------------------------------------
 console.log("\nH · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>({z:keaAusmassZeilen(),txt:$("kea_kopf").innerText}));
 const az=i=>am.z[i]||{};
 p(am.z.length===4,"vier Ausmass-Zeilen (Laufmeter, Flaeche, Stuecke, Stoesse)",am.z.map(x=>x.bezeichnung));
 p(/ohne Mittelrippe/.test(az(0).bezeichnung||"")&&/500/.test(az(0).bezeichnung||""),
   "die erste Zeile nennt Ausfuehrung und Abwicklung",az(0));
 p(az(0).menge==="5,59","Laufmeter aus der Summe der Zuschnittlaengen",az(0));
 p(az(1).menge==="2,80","Flaeche aus Zuschnitt x Abwicklung",az(1));
 p(az(2).menge==="3"&&az(3).menge==="2","drei Stuecke, zwei Stoesse",am.z.slice(2));
 p(/Titanzink/.test(am.txt),"das Material steht darunter");
 // Nur die Tabelle selbst pruefen - der erklaerende Satz darueber nennt
 // "ohne Artikelnummern und ohne Preise" und wuerde sonst selbst anschlagen.
 const amTab=await page.evaluate(()=>{const t=document.querySelector("#kea_kopf table");return t?t.innerText:""});
 p(amTab&&!/Fr\.|CHF|Preis|Artikel|Rp\./.test(amTab),"in der Tabelle stehen keine Preise und keine Artikelnummern",amTab.slice(0,120));

 // ---- I · Kontrolle -------------------------------------------------------
 console.log("\nI · Kontrolle");
 await reg(page,6);
 const k1=await page.evaluate(()=>({m:keaPruefungen(),txt:$("kea_kopf").innerText}));
 p(k1.m.length===0,"vollstaendige Aufnahme: keine Auffaelligkeit",k1.m);
 p(/Keine Auffälligkeit/.test(k1.txt),"und das steht auch so da");
 const k2=await page.evaluate(()=>{
  const sicher={m:kehleA.material,s:JSON.parse(JSON.stringify(kehleA.segmente))};
  kehleA.material=""; kehleA.segmente=[]; renderKehleAufnahme();
  const r={m:keaPruefungen(),punkt:!!document.querySelector(".ra-register-punkt.fehler")};
  kehleA.material=sicher.m; kehleA.segmente=sicher.s; renderKehleAufnahme();
  return r;
 });
 p(k2.m.some(x=>/Material/.test(x.text))&&k2.m.some(x=>/Segment/.test(x.text)),
   "fehlendes Material und fehlende Segmente werden gemeldet",k2.m.map(x=>x.text));
 p(k2.punkt,"das Kontroll-Register traegt dann einen roten Punkt");
 const k3=await page.evaluate(()=>{
  const sicher=JSON.parse(JSON.stringify(kehleA.segmente));
  kehleA.segmente=[{laenge:1000,ueberlappung:0}]; renderKehleAufnahme();
  const r=keaPruefungen();
  kehleA.segmente=sicher; renderKehleAufnahme();
  return r;
 });
 p(k3.some(x=>x.art==="warnung"&&/Kehllänge A/.test(x.text)),
   "eine deutlich abweichende Summe ist ein Hinweis, kein Fehler",k3.map(x=>x.art+": "+x.text));

 // ---- J · Speicher-Payload ------------------------------------------------
 console.log("\nJ · Speichern: Superset");
 const pay=await page.evaluate(()=>{
  $("measTitle").value="Kehle Nord"; $("measDate").value="2026-09-04";
  return buildMeasurementFromForm();
 });
 const d=pay.data||{};
 p(pay.type==="kehle","die Art steht im Payload",pay.type);
 p(d.nh===42.5&&d.nl===23.5&&d.gl===5000,"die drei Eingaben unveraendert",{nh:d.nh,nl:d.nl,gl:d.gl});
 const excel=["Q","R","S","T","tanU","tanV","U","V","U90","V90","W","A","X","Y","Z","AA","AB","AC","AD","AE",
  "b","c","d","e","f","g","h","i","k","l","m","n","o","p","mitte"];
 p(excel.every(x=>typeof d[x]==="number"&&Number.isFinite(d[x])),
   "alle 35 Werte der Vorlage sind mitgespeichert",excel.filter(x=>typeof d[x]!=="number"));
 p(Math.abs(d.b-66.4833359380795)<1e-9&&Math.abs(d.d-47.45822312519795)<1e-9,
   "und zwar unveraendert",{b:d.b,d:d.d});
 p(d.material==="2"&&d.abwicklung===500&&d.mittelrippe==="ohne",
   "neu: Material, Abwicklung, Ausfuehrung",{m:d.material,a:d.abwicklung,r:d.mittelrippe});
 const s0=(d.segmente||[])[0]||{};
 p(Array.isArray(d.segmente)&&d.segmente.length===3
   &&s0.laenge===2000&&s0.ueberlappung===70&&s0.zuschnitt===2070,
   "neu: die Segmente mit Laenge, Ueberlappung und Zuschnitt",d.segmente);
 p(d.zuschnittSumme===5593&&Math.abs(d.flaeche_m2-2.7965)<1e-4,
   "neu: Zuschnittsumme und Blechflaeche",{z:d.zuschnittSumme,f:d.flaeche_m2});
 p(Array.isArray(d.ausmass)&&d.ausmass.length===4,"neu: das Ausmass",d.ausmass&&d.ausmass.length);
 p(d.rollen&&d.rollen.bestes&&d.rollen.bestes.breite===1000&&d.rollen.rollenLaenge===3523,
   "neu: der Rollenblech-Plan",d.rollen&&d.rollen.bestes);
 // Zwei Streifen (Rolle 1000 ÷ Abwicklung 500), jedes Stueck genau einmal.
 const st=(d.rollen&&d.rollen.streifen)||[];
 p(Array.isArray(st)&&st.length===2,"mit der Belegung der Streifen",st.length);
 p(st.flatMap(x=>x.stuecke.map(y=>y.nr)).sort().join()==="1,2,3",
   "jedes Segment liegt genau einmal in einem Streifen",
   st.map(x=>x.stuecke.map(y=>y.nr)));

 // ---- K · Wiederoeffnen ---------------------------------------------------
 console.log("\nK · Wiederoeffnen");
 const wieder=await page.evaluate(pd=>{
  keaZuruecksetzen();
  const leer=JSON.parse(JSON.stringify(kehleA));
  kehleFormularFuellen(pd); keaFuellen(pd);
  const nach=JSON.parse(JSON.stringify(kehleA));
  const zwei=buildMeasurementFromForm().data;
  return {leer,nach,schritt:keaSchritt,zuschnitt:zwei.zuschnittSumme,b:zwei.b,
   segs:nach.segmente.map(s=>[s.laenge,s.ueberlappung])};
 },d);
 p(wieder.leer.segmente.length===0&&wieder.leer.material==="","Zuruecksetzen leert die Aufnahme",wieder.leer);
 p(wieder.nach.material==="2"&&wieder.nach.abwicklung===500&&wieder.nach.mittelrippe==="ohne"
   &&wieder.nach.nh==="42.5"&&String(wieder.nach.gl)==="5000",
   "Fuellen stellt Grunddaten und Winkel wieder her",wieder.nach);
 p(JSON.stringify(wieder.segs)==="[[2000,70],[2000,70],[1453,0]]","und die Segmente",wieder.segs);
 p(wieder.schritt===1,"und beginnt wieder beim ersten Register",wieder.schritt);
 p(wieder.zuschnitt===5593&&Math.abs(wieder.b-66.4833359380795)<1e-9,
   "nochmals gespeichert ergibt dieselben Werte",{z:wieder.zuschnitt,b:wieder.b});

 // ---- L · Datensatz im Format bis v2.82 -----------------------------------
 console.log("\nL · Ein Datensatz aus der Zeit vor dieser Version");
 const alt=await page.evaluate(()=>{
  const altD={nh:30,nl:20,gl:3000,b:1,c:2,d:3};
  keaZuruecksetzen(); kehleFormularFuellen(altD); keaFuellen(altD);
  return {nh:kehleA.nh,gl:kehleA.gl,material:kehleA.material,
   abw:kehleA.abwicklung,mr:kehleA.mittelrippe,segs:kehleA.segmente.length,
   rechnet:keaErgebnis().ok,A:Math.round(keaErgebnis().A)};
 });
 p(alt.nh==="30"&&String(alt.gl)==="3000","die drei Eingaben werden uebernommen",alt);
 p(alt.material===""&&alt.segs===0,"es wird KEIN Material und KEIN Segment erfunden",alt);
 p(alt.abw===500&&alt.mr==="ohne","die Vorgabe steht nur als Auswahl bereit",alt);
 p(alt.rechnet&&alt.A>0,"und er rechnet weiterhin",alt);

 // ---- M · Fotos erst nach Fertig ------------------------------------------
 console.log("\nM · Fotos und Skizzen am Ende");
 await page.evaluate(()=>{
  document.querySelectorAll(".ra-ziel").forEach(e=>e.classList.remove("ra-ziel"));
  measPhotos=[]; measSketches=[];
  showMeasTypeSection("kehle");
 });
 await page.waitForTimeout(200);
 const m1=await page.evaluate(()=>{
  const e=$("measMedienBereich"), r=e.getBoundingClientRect();
  return {hidden:e.hidden,h:r.height,disp:getComputedStyle(e).display};
 });
 p(m1.hidden===true&&m1.h===0,"waehrend der Register ist der Fotobereich zu",m1);
 await reg(page,6);
 p(await klick(page,"#kea_weiter")==="ok","Fertig anklicken");
 const m2=await page.evaluate(()=>{
  const e=$("measMedienBereich"), r=e.getBoundingClientRect();
  return {hidden:e.hidden,h:r.height,ziel:e.classList.contains("ra-ziel"),
   note:!$("measNote").closest("div").hidden};
 });
 p(m2.hidden===false&&m2.h>0,"danach ist er offen",m2);
 p(m2.ziel,"und wird kurz hervorgehoben",m2);
 await page.waitForFunction(()=>!document.querySelector(".ra-ziel"),{timeout:6000}).catch(()=>{});

 // ---- N · Druck -----------------------------------------------------------
 console.log("\nN · Druck");
 const druck=await page.evaluate(async pd=>{
  const seiten=[];
  const echt=window.open;
  window.open=()=>({document:{write:h=>seiten.push(h),close(){}},focus(){},print(){},set onload(f){}});
  await printMeasurement({id:1,type:"kehle",title:"Kehle Nord",date:"2026-09-04",project_id:null,note:"",data:pd},{listen:"alle"});
  await printMeasurement({id:2,type:"kehle",title:"Alt",date:"2026-01-01",project_id:null,note:"",
   data:{nh:30,nl:20,gl:3000}},{listen:"alle"});
  window.open=echt;
  return seiten;
 },d);
 p(druck.length===2,"beide Druckseiten sind entstanden",druck.length);
 const neuS=druck[0]||"", altS=druck[1]||"";
 p(/Hauptresultate/.test(neuS)&&/Weitere Resultate/.test(neuS)&&/66\.48/.test(neuS),
   "die bisherigen Abschnitte sind alle da");
 p(/Kehlblech/.test(neuS)&&/Zuschnittliste/.test(neuS)&&/Blechfläche/.test(neuS)
   &&/Zuschnitt aus Rollenblech/.test(neuS)&&/Ausmass/.test(neuS),
   "dazu Kehlblech, Zuschnittliste, Blechflaeche, Rollenblech und Ausmass");
 p(/Zuschnitt L × B/.test(neuS)&&/2070 × 500/.test(neuS),
   "die Zuschnittliste nennt Laenge x Breite");
 p(!/NaN|undefined|Infinity/.test(neuS),"kein NaN oder undefined im Druck",
   {t:(neuS.match(/NaN|undefined|Infinity/)||[""])[0]});
 p(/Hauptresultate/.test(altS)&&!/Zuschnitt aus Rollenblech/.test(altS)
   &&!/Zuschnittliste/.test(altS),"der alte Datensatz druckt ohne die neuen Abschnitte");
 p(!/NaN|undefined|Infinity/.test(altS),"und ebenfalls ohne NaN");

 // ---- N2 · Firstgehrung ja/nein -------------------------------------------
 console.log("\nN2 · Firstgehrung");
 await page.evaluate(pd=>{keaFuellen(pd)},d);
 await reg(page,1);
 const gh=await page.evaluate(()=>({da:!!$("kea_firstgehrung"),an:$("kea_firstgehrung").checked,
  vorgabe:keaLeer().firstgehrung}));
 p(gh.da,"in den Grunddaten steht ein Haekchen \"Firstgehrung vorhanden\"",gh);
 p(gh.an===true&&gh.vorgabe===true,"Vorgabe ist ja - eine bestehende Kehle aendert sich nicht",gh);
 // Ausschalten
 await page.evaluate(()=>{const c=$("kea_firstgehrung");c.checked=false;
  c.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(160);
 const ohne=await page.evaluate(()=>{
  keaSetzeSchritt(2);
  return {modell:kehleA.firstgehrung, erg:keaErgebnis().ok, A:keaKehlLaenge(),
   felder:!!$("kea_nh"), box:$("keaErgebnisBox").hidden,
   txt:$("kea_kopf").innerText,
   pruef:keaPruefungen().map(x=>x.text)};
 });
 p(ohne.modell===false,"das Haekchen kommt ins Modell",ohne.modell);
 p(ohne.erg===false&&ohne.A===0,"OHNE Firstgehrung wird gar nicht gerechnet",ohne);
 p(!ohne.felder,"die drei Winkel-Eingaben stehen dann nicht mehr da",ohne.felder);
 p(ohne.box===true,"und die Ergebnisanzeige der Vorlage bleibt zu",ohne.box);
 p(/keine Firstgehrung/i.test(ohne.txt),"das Register sagt, warum es leer ist",ohne.txt.slice(0,140));
 p(!ohne.pruef.some(t=>/Neigung|Gef/i.test(t)),
   "die Kontrolle bemaengelt keine fehlenden Neigungen",ohne.pruef);
 // Ohne Firstgehrung darf trotzdem gespeichert werden
 const pOhne=await page.evaluate(()=>buildMeasurementFromForm().data);
 p(pOhne.firstgehrung===false,"der Payload merkt sich \"keine Firstgehrung\"",pOhne.firstgehrung);
 p(pOhne.b===undefined&&pOhne.A===undefined,
   "und speichert KEINE Winkel statt Platzhalter",{b:pOhne.b,A:pOhne.A});
 p(pOhne.segmente&&pOhne.segmente.length===3,"die Segmente bleiben erhalten",pOhne.segmente&&pOhne.segmente.length);
 // Wieder ein
 await reg(page,1);
 await page.evaluate(()=>{const c=$("kea_firstgehrung");c.checked=true;
  c.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(160);
 const wieder2=await page.evaluate(()=>({erg:keaErgebnis().ok,b:Number(keaErgebnis().b.toFixed(2))}));
 p(wieder2.erg&&Math.abs(wieder2.b-66.48)<0.01,"wieder angekreuzt rechnet es unveraendert weiter",wieder2);
 // Ein Datensatz von vor v2.84 gilt als "mit Firstgehrung"
 const altG=await page.evaluate(()=>{keaFuellen({nh:30,nl:20,gl:3000});return kehleA.firstgehrung});
 p(altG===true,"ein Datensatz ohne das Feld gilt als \"mit Firstgehrung\"",altG);

 // ---- N3 · Trauf- und Firststueck -----------------------------------------
 console.log("\nN3 · Trauf- und Firststueck");
 await page.evaluate(pd=>{keaFuellen(pd)},d);
 await reg(page,3);
 const felder=await page.evaluate(()=>({t:!!$("kea_trauf"),f:!!$("kea_first"),
  tp:$("kea_traufPlus")?$("kea_traufPlus").disabled:null,
  fp:$("kea_firstPlus")?$("kea_firstPlus").disabled:null,
  vorgabeT:keaLeer().traufLaenge,vorgabeF:keaLeer().firstLaenge}));
 p(felder.t&&felder.f,"es gibt je eine Eingabe fuer Trauf- und Firststueck",felder);
 p(felder.vorgabeT===0&&felder.vorgabeF===0,"ohne Eingabe wird KEINE Laenge erfunden",felder);
 p(felder.tp===true&&felder.fp===true,"die beiden Knoepfe sind gesperrt, solange nichts festgelegt ist",felder);
 // Laengen eintippen - ohne Fokusverlust
 p(await tippe(page,"#kea_trauf","800"),"Traufstueck-Laenge eintippen");
 const tf=await page.evaluate(()=>({wert:$("kea_trauf").value,
  fokus:document.activeElement&&document.activeElement.id,modell:keaTraufLaenge(),
  knopf:$("kea_traufPlus").disabled}));
 p(tf.wert==="800"&&tf.fokus==="kea_trauf","ganz eintippbar, ohne den Fokus zu verlieren",tf);
 p(tf.modell===800,"und steht im Modell",tf);
 p(tf.knopf===false,"der Knopf wird dadurch bedienbar - ohne Neuzeichnen",tf);
 await tippe(page,"#kea_first","600");
 p((await page.evaluate(()=>keaFirstLaenge()))===600,"Firststueck-Laenge ebenso");
 // Aufteilung aus A mit Trauf und First
 p(await klick(page,"#kea_ausA")==="ok","aus der Kehllaenge A neu aufteilen");
 const auf=await page.evaluate(()=>({
  segs:keaSegmente().map(s=>[keaZahl(s.laenge),keaZahl(s.ueberlappung),s.rolle||null]),
  summe:Math.round(keaSummeLaenge())}));
 p(auf.segs.length>=3,"mehrere Segmente",auf);
 p(auf.segs[0][0]===800&&auf.segs[0][2]==="trauf","das ERSTE Stueck ist das Traufstueck mit 800 mm",auf);
 p(auf.segs[auf.segs.length-1][0]===600&&auf.segs[auf.segs.length-1][2]==="first",
   "das LETZTE ist das Firststueck mit 600 mm",auf);
 p(auf.segs[auf.segs.length-1][1]===0,"und traegt keine Ueberlappung mehr",auf);
 p(auf.summe===5453,"die Summe bleibt die Kehllaenge A",auf);
 p(auf.segs.slice(1,-1).every(x=>x[2]===null),"die Stuecke dazwischen tragen keine Rolle",auf);
 // Die Rolle steht in der Liste
 const rollen=await page.evaluate(()=>{
  const zellen=[...document.querySelectorAll(".kea-rolle")];
  return {texte:zellen.map(e=>e.textContent.trim()),
   titel:zellen.map(e=>e.getAttribute("title")),
   // Ein Wort, das Buchstabe fuer Buchstabe umbricht, ist unlesbar -
   // deshalb die tatsaechliche Hoehe messen, nicht nur den Text pruefen.
   hoehen:zellen.map(e=>Math.round(e.getBoundingClientRect().height)),
   // Und die Kennzeichnung darf die Eingabefelder nicht zusammendruecken
   // (in v2.81 schon einmal passiert).
   feldbreiten:[...document.querySelectorAll("[data-kea-laenge]")]
     .map(e=>Math.round(e.getBoundingClientRect().width)),
   werte:[...document.querySelectorAll("[data-kea-laenge]")].map(e=>e.value)};
 });
 p(JSON.stringify(rollen.titel)==='["Traufstück","Firststück"]',
   "Traufstueck und Firststueck sind in der Stueckliste gekennzeichnet",rollen.titel);
 p(rollen.hoehen.every(h=>h<=16),"die Kennzeichnung bricht nicht mitten im Wort um",rollen.hoehen);
 p(rollen.feldbreiten.every(b=>b>=60),"und drueckt die Laengenfelder nicht zusammen",rollen.feldbreiten);
 p(rollen.werte[0]==="800","der eingetippte Wert bleibt vollstaendig lesbar",rollen.werte);
 // Laenge danach frei aenderbar, Vorgabe wirkt nicht rueckwirkend
 await tippe(page,'[data-kea-laenge="0"]',"950");
 const frei=await page.evaluate(()=>({laenge:keaZahl(keaSegmente()[0].laenge),
  rolle:keaSegmente()[0].rolle}));
 p(frei.laenge===950&&frei.rolle==="trauf","die Laenge ist danach frei aenderbar, die Rolle bleibt",frei);
 await page.evaluate(()=>{kehleA.traufLaenge=1200;renderKehleAufnahme()});
 p((await page.evaluate(()=>keaZahl(keaSegmente()[0].laenge)))===950,
   "eine spaetere Aenderung der Vorgabe wirkt NICHT rueckwirkend");
 // Knopf-Weg: von Hand anlegen
 const handWeg=await page.evaluate(()=>{
  kehleA.segmente=[{laenge:2000,ueberlappung:70,rolle:null}];
  kehleA.traufLaenge=800; kehleA.firstLaenge=600; renderKehleAufnahme();
  return {tp:$("kea_traufPlus").disabled,fp:$("kea_firstPlus").disabled};
 });
 p(handWeg.tp===false&&handWeg.fp===false,"beide Knoepfe sind wieder frei",handWeg);
 p(await klick(page,"#kea_traufPlus")==="ok","Traufstueck anlegen");
 p(await klick(page,"#kea_firstPlus")==="ok","Firststueck anlegen");
 const hand=await page.evaluate(()=>({
  segs:keaSegmente().map(s=>[keaZahl(s.laenge),s.rolle||null]),
  tp:$("kea_traufPlus").disabled,fp:$("kea_firstPlus").disabled}));
 p(JSON.stringify(hand.segs)==='[[800,"trauf"],[2000,null],[600,"first"]]',
   "das Traufstueck kommt VORNE, das Firststueck HINTEN",hand);
 p(hand.tp===true&&hand.fp===true,"und jeder Knopf nur einmal",hand);
 // Payload und Ausmass
 const pTF=await page.evaluate(()=>buildMeasurementFromForm().data);
 p(pTF.traufLaenge===800&&pTF.firstLaenge===600,"beide Laengen sind gespeichert",
   {t:pTF.traufLaenge,f:pTF.firstLaenge});
 p(pTF.segmente[0].rolle==="trauf"&&pTF.segmente[2].rolle==="first",
   "und die Rolle je Segment",pTF.segmente.map(x=>x.rolle));
 const amTF=await page.evaluate(()=>keaAusmassZeilen().map(x=>x.bezeichnung));
 p(amTF.some(x=>/Traufstück/.test(x))&&amTF.some(x=>/Firststück/.test(x)),
   "das Ausmass weist beide einzeln aus",amTF);
 // Wiederoeffnen
 const wTF=await page.evaluate(pd=>{keaFuellen(pd);
  return {t:keaTraufLaenge(),f:keaFirstLaenge(),rollen:keaSegmente().map(s=>s.rolle||null)}},pTF);
 p(wTF.t===800&&wTF.f===600&&JSON.stringify(wTF.rollen)==='["trauf",null,"first"]',
   "Wiederoeffnen stellt Laengen und Rollen wieder her",wTF);
 // Druck
 const dTF=await page.evaluate(async pd=>{
  let h="";const echt=window.open;
  window.open=()=>({document:{write:x=>h+=x,close(){}},focus(){},print(){},set onload(f){}});
  await printMeasurement({id:9,type:"kehle",title:"TF",date:"2026-09-04",project_id:null,note:"",data:pd},{listen:"alle"});
  window.open=echt;return h;
 },pTF);
 p(/Traufstück/.test(dTF)&&/Firststück/.test(dTF),"der Druck nennt Trauf- und Firststueck");
 p(/Firstgehrung/.test(dTF),"und ob eine Firstgehrung vorhanden ist");
 const dOhne=await page.evaluate(async pd=>{
  let h="";const echt=window.open;
  window.open=()=>({document:{write:x=>h+=x,close(){}},focus(){},print(){},set onload(f){}});
  await printMeasurement({id:10,type:"kehle",title:"ohne",date:"2026-09-04",project_id:null,note:"",
   data:{...pd,firstgehrung:false,b:undefined,c:undefined,d:undefined}},{listen:"alle"});
  window.open=echt;return h;
 },pTF);
 p(!/Hauptresultate/.test(dOhne)&&/Ohne Firstgehrung/.test(dOhne),
   "ohne Firstgehrung druckt kein Winkelteil, sondern sagt warum");
 p(/Zuschnittliste/.test(dOhne),"die Zuschnittliste bleibt trotzdem");
 p(!/NaN|undefined/.test(dOhne),"und kein NaN",{t:(dOhne.match(/NaN|undefined/)||[""])[0]});

 // ---- O · Handy und Tablet ------------------------------------------------
 console.log("\nO · Handy und Tablet");
 await page.evaluate(pd=>{keaFuellen(pd)},d);
 for(const breite of [320,360,412,768,1280]){
  await page.setViewportSize({width:breite,height:1400});
  const schlimm=[];
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>{
    const w=document.scrollingElement;
    // Was in einem waagerecht scrollenden Behaelter liegt (die App verwendet
    // .scroll um breite Tabellen), darf ueber den Rand hinausragen.
    const inScroller=el=>{
     for(let e=el.parentElement;e;e=e.parentElement){
      const o=getComputedStyle(e).overflowX;
      if(o==="auto"||o==="scroll")return true;
     }
     return false;
    };
    const ueber=[];
    document.querySelectorAll("#kehleAufnahme *").forEach(el=>{
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

 // ---- P · keine JavaScript-Fehler -----------------------------------------
 console.log("\nP · Keine JavaScript-Fehler");
 p(fehler.length===0,"kein einziger JavaScript-Fehler in der ganzen Sitzung",fehler.slice(0,3));

 console.log("\npruefstand-kehle-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});
