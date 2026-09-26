// Prueft die Offertpositionen aus den Katalogen (v3.199).
//
// Gewuenscht war: "ich will eine offerte aus den regiematerialpositionen und
// den stundenansatzpositionen erstellen können, getrennt nach zeit und
// material" - und dazu "dass man auch weitere abschnitte noch hinzufügen
// könnte".
//
// WICHTIG ZUR EINORDNUNG, weil es beim ersten Lesen missverstanden wurde:
// das hat mit dem REGIERAPPORT NICHTS zu tun. Die Offerte kommt, bevor
// gearbeitet wurde, der Rapport danach. Gemeinsam sind ihnen nur die beiden
// KATALOGE - settings.rates und settings.materials. Genau daraus wird hier
// gewaehlt, und Abschnitt D belegt, dass dabei kein Rapport angefasst wird.
//
// Geprueft wird:
//   A  der Kern angKatZeilen(): was wird aus einer Menge - Einheit, Preis,
//      EDV-Nr., Abschnitt; nur Mengen > 0; Komma als Dezimaltrennzeichen,
//   B  die PREISE: unveraendert aus dem Katalog, kein Zuschlag, kein Runden
//      (Ansage des Betriebs) - mit Gegenprobe gegen einen Aufschlag,
//   C  das Einfuegen: derselbe Abschnitt erscheint NIE zweimal in der Liste,
//   D  der Dialog: Kataloge, Suche, gewaehltes bleibt sichtbar, Zaehlzeile,
//      Uebernehmen, und dass dabei nichts geschrieben wird,
//   E  weitere Abschnitte: freie Namen im Dialog, "+ Abschnitt", und der
//      umbenennbare Titel in der Positionsliste,
//   F  Gegenproben zum alten Zustand: der Titel ist kein fester <b>-Text
//      mehr, und ein Klick hinein klappt den Block nicht zu.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offerte-katalog-v3-199.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__db={log:[]};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.update=d=>{z.op="update";z.daten=d;return q};
  q.upsert=d=>{z.op="upsert";z.daten=d;return q};
  q.delete=()=>{z.op="delete";return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","in","is","range","ilike"].forEach(k=>{if(!q[k])q[k]=()=>q});
  const lauf=()=>{
   if(z.op&&z.op!=="select"){window.__db.log.push({t,op:z.op,d:z.daten});
    return {data:[{id:901}],error:null}}
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`;

// Der Katalog des Pruefstands. Die Preise sind absichtlich krumm: ein
// Zuschlag oder ein Rundungsfehler faellt bei 97.35 sofort auf, bei 100.00
// nicht.
const RATES=[["Spengler",97.35],["Vorarbeiter",108.5],["Lehrling",46.2]];
const MATERIALS=[
 ["10001","Titanzink Band","0.7 mm × 670 mm","m",31.45],
 ["10002","Titanzink Tafel","0.8 mm × 1000×2000","Stk.",128.9],
 ["20005","Haftenblech verzinkt","0.7 mm","m",8.05],
 ["30010","Dichtmasse grau","310 ml","Stk.",14.75],
 ["40020","Nieten Alu 4 mm","","Pack",6.4],
 ["50001","Rinnenhalter","333 mm","Stk.",4.95],
 ["50002","Rinnenwinkel","333 mm","Stk.",22.3],
 ["50003","Einlaufstutzen","80 mm","Stk.",17.6],
 ["50004","Kupferband","0.6 mm × 500 mm","m",44.8],
 ["50005","Bleiband","300 mm","m",26.15],
 ["50006","Schrauben 4.5×35","V2A","Pack",11.9],
 ["50007","Kleber Butyl","290 ml","Stk.",19.4],
 ["50008","Trennlage","1 m","m2",3.25],
 ["50009","Alublech","1.0 mm","m2",38.7],
 ["50010","Edelstahlband","0.5 mm × 400 mm","m",52.1],
 ["50011","Lötzinn","500 g","Stk.",34.6],
 ["50012","Schutzlack","750 ml","Stk.",28.9]
];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1200,height:1400}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.__dialoge=[];
 page.on("dialog",d=>{page.__dialoge.push({text:d.message(),typ:d.type()});
  if(d.type()==="prompt")d.accept(page.__promptAntwort===undefined?"":page.__promptAntwort);
  else d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 const grund=async(positionen)=>{
  await page.evaluate(([R,M,POS])=>{
   currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"A"};
   allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
   meineRechte={admin:true}; offerteZugriff=true;
   allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12",archived:false}];
   settings.rates=JSON.parse(JSON.stringify(R));
   settings.materials=JSON.parse(JSON.stringify(M));
   $("appRoot").hidden=false;$("authScreen").hidden=true;
   window.__db.log=[];
   angPositions=JSON.parse(JSON.stringify(POS||[]));
   angSektionOffen=new Set();
   $("angTitle").value="Offerte Muster AG";
   setAngProjectField(7);
   renderAngPositionsTable();
   $("angebotEditModal").hidden=false;
   $("angKatalogModal").hidden=true;
  },[RATES,MATERIALS,positionen]);
  await page.waitForTimeout(120);
 };

 // =========================================================================
 console.log("\nA · der Kern: aus einer Menge wird eine Offertposition");
 await grund([]);
 let z=await page.evaluate(()=>angKatZeilen({
   "rate:Spengler":8, "rate:Lehrling":"2,5",
   "mat:10001":12, "mat:40020":"1,5"
  },"Arbeit","Material"));
 p(z.length===4,"vier Mengen ergeben vier Positionen",z.length);
 const r0=z[0],r1=z[1],m0=z[2],m1=z[3];
 p(r0.description==="Spengler"&&r0.quantity===8&&r0.unit==="h",
   "Stundenansatz: Funktion als Bezeichnung, Einheit h",r0);
 p(r1.quantity===2.5,"Komma als Dezimaltrennzeichen wird verstanden",r1);
 p(r0.abschnitt==="Arbeit"&&r1.abschnitt==="Arbeit",
   "die Stunden landen im Arbeits-Abschnitt",[r0.abschnitt,r1.abschnitt]);
 p(m0.pos==="10001","Material: die EDV-Nr. steht in der Positionsspalte",m0.pos);
 p(m0.description==="Titanzink Band · 0.7 mm × 670 mm",
   "Bezeichnung und Dimension zusammen",m0.description);
 p(m1.description==="Nieten Alu 4 mm","ohne Dimension bleibt es beim Namen",m1.description);
 p(m0.unit==="m"&&m1.unit==="Pack","die Einheit kommt aus dem Katalog",[m0.unit,m1.unit]);
 p(m0.abschnitt==="Material"&&m1.abschnitt==="Material",
   "das Material landet im Material-Abschnitt",[m0.abschnitt,m1.abschnitt]);
 p(z.filter(x=>x.abschnitt==="Arbeit").length===2&&z.filter(x=>x.abschnitt==="Material").length===2,
   "getrennt nach Zeit und Material - das war die Aufgabe",z.map(x=>x.abschnitt));

 // nur Mengen > 0
 z=await page.evaluate(()=>angKatZeilen({
   "rate:Spengler":0, "rate:Vorarbeiter":"", "rate:Lehrling":"abc",
   "mat:10001":"-3", "mat:10002":0.25
  },"Arbeit","Material"));
 p(z.length===1&&z[0].pos==="10002",
   "0, leer, Unsinn und negative Mengen ergeben KEINE Position",z);

 // Vorgabe-Abschnitte
 z=await page.evaluate(()=>angKatZeilen({"rate:Spengler":1,"mat:10001":1},"","  "));
 p(z[0].abschnitt==="Arbeit"&&z[1].abschnitt==="Material",
   "leere Abschnittsfelder heissen Arbeit und Material, nicht gar nichts",
   [z[0].abschnitt,z[1].abschnitt]);

 // =========================================================================
 console.log("\nB · die Preise kommen unveraendert aus dem Katalog");
 z=await page.evaluate(()=>angKatZeilen({
   "rate:Spengler":1,"rate:Vorarbeiter":1,"rate:Lehrling":1,
   "mat:10001":1,"mat:10002":1,"mat:50011":1
  },"Arbeit","Material"));
 const erwartet=[97.35,108.5,46.2,31.45,128.9,34.6];
 p(JSON.stringify(z.map(x=>x.preis))===JSON.stringify(erwartet),
   "jeder Preis steht auf den Rappen genau so da wie im Katalog",z.map(x=>x.preis));
 // Gegenprobe: ein Zuschlag von auch nur 1 % wuerde hier auffallen
 p(z.every((x,i)=>Math.abs(x.preis-erwartet[i])<1e-9),
   "Gegenprobe: kein Zuschlag, keine Rundung - Abweichung 0",
   z.map((x,i)=>x.preis-erwartet[i]));
 // Gegenprobe zur Quelle: aendert sich der Katalog, aendert sich der Preis
 const nachher=await page.evaluate(()=>{
  const alt=settings.rates[0][1];
  settings.rates[0][1]=123.45;
  const neu=angKatZeilen({"rate:Spengler":1},"Arbeit","Material")[0].preis;
  settings.rates[0][1]=alt;
  return neu;
 });
 p(nachher===123.45,"Gegenprobe: der Preis wird wirklich gelesen, nicht fest eingebaut",nachher);

 // =========================================================================
 console.log("\nC · derselbe Abschnitt erscheint nie zweimal");
 let bau=await page.evaluate(()=>{
  angPositions=[
   {pos:"",description:"Arbeit alt",quantity:1,unit:"h",preis:100,abschnitt:"Arbeit"},
   {pos:"",description:"Material alt",quantity:1,unit:"m",preis:10,abschnitt:"Material"}
  ];
  angPositionEinfuegen({pos:"",description:"Arbeit neu",quantity:2,unit:"h",preis:97.35,abschnitt:"Arbeit"});
  return angPositions.map(x=>x.abschnitt+"/"+x.description);
 });
 p(JSON.stringify(bau)===JSON.stringify(["Arbeit/Arbeit alt","Arbeit/Arbeit neu","Material/Material alt"]),
   "die neue Zeile setzt sich HINTER die letzte ihres Abschnitts, nicht ans Ende",bau);
 // Gegenprobe ueber die gezeichnete Tabelle: eine Kopfzeile je Titel
 const koepfe=await page.evaluate(()=>{
  renderAngPositionsTable();
  return [...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")]
   .map(k=>k.dataset.angSekToggle);
 });
 p(JSON.stringify(koepfe)===JSON.stringify(["Arbeit","Material"]),
   "Gegenprobe in der Tabelle: genau eine Kopfzeile je Abschnitt",koepfe);

 // =========================================================================
 console.log("\nD · der Dialog");
 await grund([]);
 await page.evaluate(()=>$("angKatalogOeffnen").click());
 await page.waitForTimeout(200);
 let d=await page.evaluate(()=>({
  offen:!$("angKatalogModal").hidden,
  raten:[...$("angKatRatenBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
  material:[...$("angKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
  arbeit:$("angKatAbschnittArbeit").value,
  mat:$("angKatAbschnittMaterial").value,
  hinweis:$("angKatHinweis").textContent,
  gesperrt:$("angKatUebernehmen").disabled,
  geschrieben:window.__db.log.length
 }));
 p(d.offen,"er geht auf",d.offen);
 p(JSON.stringify(d.raten)===JSON.stringify(["Spengler","Vorarbeiter","Lehrling"]),
   "alle Stundenansaetze stehen da",d.raten);
 p(d.material.length===15,"vom Material die ersten 15 (wie die Suche im Rapport)",d.material.length);
 p(d.arbeit==="Arbeit"&&d.mat==="Material","die beiden Abschnitte sind vorbelegt",[d.arbeit,d.mat]);
 p(d.gesperrt,"ohne Menge ist Uebernehmen gesperrt",d.gesperrt);
 p(d.geschrieben===0,"das Oeffnen schreibt nichts in die Datenbank",d.geschrieben);

 // Suche
 await page.evaluate(()=>{
  $("angKatSuche").value="rinnen";
  $("angKatSuche").dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(120);
 // Die Reihenfolge der Treffer bestimmt das Zaehlwerk (haeufig Benutztes
 // zuerst) - geprueft wird deshalb die MENGE der Treffer, nicht ihre Folge.
 let such=await page.evaluate(()=>[...$("angKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent));
 p(JSON.stringify(such.slice().sort())===JSON.stringify(["50001","50002"]),"die Suche filtert das Material",such);

 // Eine Menge eintragen, dann weitersuchen: die Eingabe bleibt sichtbar
 await page.evaluate(()=>{
  const f=$("angKatMatBody").querySelector('[data-ang-kat-menge="mat:50001"]');
  f.value="20"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(80);
 let nachSuche=await page.evaluate(()=>{
  $("angKatSuche").value="dicht";
  $("angKatSuche").dispatchEvent(new Event("input",{bubbles:true}));
  return {
   zeilen:[...$("angKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
   menge:($("angKatMatBody").querySelector('[data-ang-kat-menge="mat:50001"]')||{}).value,
   hinweis:$("angKatHinweis").textContent
  };
 });
 p(nachSuche.zeilen[0]==="50001","was schon eine Menge hat, bleibt oben stehen",nachSuche.zeilen);
 p(nachSuche.menge==="20","und behaelt seine Menge",nachSuche.menge);
 p(nachSuche.zeilen.indexOf("30010")>0,"der neue Treffer steht trotzdem in der Liste",nachSuche.zeilen);

 // Stunden dazu, Zaehlzeile pruefen
 await page.evaluate(()=>{
  const f=$("angKatRatenBody").querySelector('[data-ang-kat-menge="rate:Spengler"]');
  f.value="8"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(80);
 let hin=await page.evaluate(()=>({text:$("angKatHinweis").textContent,gesperrt:$("angKatUebernehmen").disabled}));
 // 8 * 97.35 = 778.80 ; 20 * 4.95 = 99.00 ; zusammen 877.80
 p(/2 Position/.test(hin.text)&&/877\.80|877,80|877.8/.test(hin.text.replace(/'/g,"")),
   "die Zaehlzeile nennt Anzahl und Summe zum Katalogpreis",hin.text);
 p(!hin.gesperrt,"jetzt ist Uebernehmen frei",hin.gesperrt);

 // Uebernehmen
 await page.evaluate(()=>$("angKatUebernehmen").click());
 await page.waitForTimeout(200);
 let u=await page.evaluate(()=>({
  zu:$("angKatalogModal").hidden,
  positionen:angPositions.map(x=>[x.abschnitt,x.pos,x.description,x.quantity,x.unit,x.preis]),
  koepfe:[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.dataset.angSekToggle),
  offen:[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.classList.contains("open")),
  total:$("angPositionsTotal").textContent,
  geschrieben:window.__db.log.length
 }));
 p(u.zu,"der Dialog schliesst sich",u.zu);
 p(u.positionen.length===2,"zwei Positionen sind in der Offerte",u.positionen);
 p(u.positionen[0][0]==="Arbeit"&&u.positionen[1][0]==="Material",
   "getrennt nach Zeit und Material",u.positionen.map(x=>x[0]));
 p(u.positionen[0][5]===97.35&&u.positionen[1][5]===4.95,
   "mit den Katalogpreisen",[u.positionen[0][5],u.positionen[1][5]]);
 p(u.offen.every(Boolean),"die neuen Abschnitte sind aufgeklappt - man sieht, was passiert ist",u.offen);
 p(/877\.80/.test(u.total.replace(/'/g,"")),"das Total der Offerte stimmt",u.total);
 p(u.geschrieben===0,"das Uebernehmen schreibt NICHTS - gespeichert wird die Offerte wie immer von Hand",u.geschrieben);

 // Zweiter Durchgang in dieselben Abschnitte: kein doppelter Kopf
 await page.evaluate(()=>{
  $("angKatalogOeffnen").click();
  const f=$("angKatRatenBody").querySelector('[data-ang-kat-menge="rate:Lehrling"]');
  f.value="4"; f.dispatchEvent(new Event("input",{bubbles:true}));
  $("angKatUebernehmen").click();
 });
 await page.waitForTimeout(200);
 let zwei=await page.evaluate(()=>({
  koepfe:[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.dataset.angSekToggle),
  abschnitte:angPositions.map(x=>x.abschnitt)
 }));
 p(JSON.stringify(zwei.koepfe)===JSON.stringify(["Arbeit","Material"]),
   "auch beim zweiten Durchgang bleibt es bei einem Kopf je Abschnitt",zwei.koepfe);
 p(JSON.stringify(zwei.abschnitte)===JSON.stringify(["Arbeit","Arbeit","Material"]),
   "die neue Stunde sitzt bei den Stunden, nicht hinter dem Material",zwei.abschnitte);

 // =========================================================================
 console.log("\nE · weitere Abschnitte");
 await grund([]);
 await page.evaluate(()=>{
  $("angKatalogOeffnen").click();
  $("angKatAbschnittArbeit").value="Regie Stunden";
  $("angKatAbschnittMaterial").value="Gerüst";
  const a=$("angKatRatenBody").querySelector('[data-ang-kat-menge="rate:Spengler"]');
  a.value="3"; a.dispatchEvent(new Event("input",{bubbles:true}));
  const m=$("angKatMatBody").querySelector('[data-ang-kat-menge="mat:10001"]');
  m.value="5"; m.dispatchEvent(new Event("input",{bubbles:true}));
  $("angKatUebernehmen").click();
 });
 await page.waitForTimeout(200);
 let frei=await page.evaluate(()=>[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.dataset.angSekToggle));
 p(JSON.stringify(frei)===JSON.stringify(["Regie Stunden","Gerüst"]),
   "die Abschnittsnamen sind frei - es muss nicht Arbeit und Material heissen",frei);

 // Vorschlagsliste kennt die vorhandenen Abschnitte
 let vor=await page.evaluate(()=>{
  $("angKatalogOeffnen").click();
  return {liste:[...$("angKatAbschnitte").querySelectorAll("option")].map(o=>o.value),
          arbeit:$("angKatAbschnittArbeit").value};
 });
 p(vor.liste.indexOf("Regie Stunden")>=0&&vor.liste.indexOf("Gerüst")>=0,
   "der Dialog schlaegt die Abschnitte dieser Offerte vor",vor.liste);
 await page.evaluate(()=>{$("angKatalogModal").hidden=true});

 // "+ Abschnitt"
 page.__promptAntwort="Entsorgung";
 await page.evaluate(()=>$("angAddAbschnitt").click());
 await page.waitForTimeout(150);
 let neu=await page.evaluate(()=>({
  koepfe:[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.dataset.angSekToggle),
  letzte:angPositions[angPositions.length-1]
 }));
 p(neu.koepfe.indexOf("Entsorgung")>=0,"„+ Abschnitt“ legt einen weiteren Abschnitt an",neu.koepfe);
 p(neu.letzte.abschnitt==="Entsorgung"&&neu.letzte.description==="",
   "mit einer leeren Zeile zum Ausfuellen",neu.letzte);
 // Gegenprobe: Abbrechen legt nichts an
 const vorher=await page.evaluate(()=>angPositions.length);
 page.__promptAntwort="";
 await page.evaluate(()=>$("angAddAbschnitt").click());
 await page.waitForTimeout(120);
 p(await page.evaluate(()=>angPositions.length)===vorher,
   "Gegenprobe: ein leerer Name legt nichts an",vorher);

 // Umbenennen in der Liste. Fehlt das Feld ueberhaupt (etwa weil der Titel
 // wieder fester Text waere), soll das eine Fehlmeldung geben und nicht den
 // Pruefstand abstuerzen lassen - deshalb wird es erst gesucht, dann benutzt.
 page.__promptAntwort="Entsorgung";
 let um=await page.evaluate(()=>{
  angSektionOffen.add("Entsorgung");
  renderAngPositionsTable();
  const f=$("angPositionsBody").querySelector('[data-ang-sek-name="Entsorgung"]');
  if(!f)return {keinFeld:true};
  f.value="Entsorgung & Transport";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  return {koepfe:[...$("angPositionsBody").querySelectorAll("[data-ang-sek-toggle]")].map(k=>k.dataset.angSekToggle),
          abschnitte:angPositions.map(x=>x.abschnitt),
          offenNeu:angSektionOffen.has("Entsorgung & Transport"),
          offenAlt:angSektionOffen.has("Entsorgung")};
 });
 p(!um.keinFeld,"der Abschnittstitel ist ueberhaupt ein Feld zum Umbenennen",um);
 p(!um.keinFeld&&um.koepfe.indexOf("Entsorgung & Transport")>=0&&um.koepfe.indexOf("Entsorgung")<0,
   "ein Abschnitt laesst sich in der Liste umbenennen",um.koepfe);
 p(!um.keinFeld&&um.abschnitte.indexOf("Entsorgung")<0,"alle seine Positionen wandern mit",um.abschnitte);
 p(!um.keinFeld&&um.offenNeu&&!um.offenAlt,"und er bleibt dabei aufgeklappt",[um.offenNeu,um.offenAlt]);
 // Gegenprobe: ein leerer Titel wuerde den Abschnitt aufloesen - wird abgelehnt
 let leer=await page.evaluate(()=>{
  const f=$("angPositionsBody").querySelector('[data-ang-sek-name="Entsorgung & Transport"]');
  if(!f)return {keinFeld:true};
  f.value="   ";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  const nachher=$("angPositionsBody").querySelector('[data-ang-sek-name="Entsorgung & Transport"]');
  return {feld:nachher?nachher.value:null, abschnitte:angPositions.map(x=>x.abschnitt)};
 });
 p(!leer.keinFeld&&leer.feld==="Entsorgung & Transport"&&leer.abschnitte.indexOf("Entsorgung & Transport")>=0,
   "Gegenprobe: ein leerer Titel loest den Abschnitt NICHT auf, das Feld springt zurueck",leer);

 // =========================================================================
 console.log("\nF · Gegenproben zum Zustand vor v3.199");
 const html=await page.evaluate(()=>{
  const k=$("angPositionsBody").querySelector("[data-ang-sek-toggle]");
  return {innen:k.innerHTML, hatB:!!k.querySelector("b"), hatFeld:!!k.querySelector("input.ang-sek-titel")};
 });
 p(html.hatFeld,"der Abschnittstitel ist ein Eingabefeld",html.hatFeld);
 p(!html.hatB,"Gegenprobe: er ist NICHT mehr der feste <b>-Text von v3.71",html.innen.slice(0,160));
 // Klick ins Titelfeld klappt nicht zu
 let klick=await page.evaluate(()=>{
  const k=$("angPositionsBody").querySelector("[data-ang-sek-toggle]");
  const titel=k.dataset.angSekToggle;
  angSektionOffen.add(titel);
  renderAngPositionsTable();
  const kopf=$("angPositionsBody").querySelector("[data-ang-sek-toggle]");
  const feld=kopf.querySelector("input.ang-sek-titel");
  if(!feld)return {keinFeld:true};
  feld.click();
  return {offen:$("angPositionsBody").querySelector("[data-ang-sek-toggle]").classList.contains("open")};
 });
 p(!klick.keinFeld&&klick.offen,"ein Klick INS Titelfeld klappt den Block nicht zu",klick);
 // ...der Klick daneben aber schon
 let klick2=await page.evaluate(()=>{
  const kopf=$("angPositionsBody").querySelector("[data-ang-sek-toggle]");
  kopf.querySelector(".klapp-chevron").click();
  return $("angPositionsBody").querySelector("[data-ang-sek-toggle]").classList.contains("open");
 });
 p(!klick2,"Gegenprobe: der Klick daneben klappt weiterhin",klick2);

 // angKatZeilen kennt kein DOM
 const ohneDom=await page.evaluate(()=>{
  $("angKatalogModal").hidden=true;
  $("angebotEditModal").hidden=true;
  return angKatZeilen({"rate:Spengler":1},"X","Y").length;
 });
 p(ohneDom===1,"angKatZeilen rechnet ohne geoeffneten Dialog - es liest kein Eingabefeld",ohneDom);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);

 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
