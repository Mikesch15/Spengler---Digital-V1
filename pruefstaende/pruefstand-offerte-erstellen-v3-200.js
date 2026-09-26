// Prueft die OFFERTE ERSTELLEN (v3.200) - die eigene Offerte fuer den Kunden.
//
// Diese Datei war bis v3.199 "pruefstand-offerte-katalog-v3-199.js" und hat
// den Katalog-Dialog am IMPORT-Formular geprueft. Der Anwender hat das
// richtiggestellt: "die aktuelle offertfunktion ist dazu da, eine schon
// vorhandene offerte in der app zu verwenden und massaufnahmen daraus
// abzuleiten... die neue offertfunktion soll dazu da sein, wirklich eine neue
// offerte für den kunden zu erstellen. Komplett getrennt von der anderen
// funktion."
//
// Der Pruefstand wurde deshalb auf den neuen Vertrag umgestellt, NICHT
// weggeworfen: alle Zusicherungen zum Katalog gelten weiter, nur eben gegen
// js/79. Dazu kommt in Abschnitt J die Gegenprobe zum alten Zustand - das
// Import-Formular darf den Katalog-Dialog nicht mehr haben.
//
// Geprueft wird:
//   A  der Kern offKatZeilen(): was wird aus einer Menge - Einheit, Preis,
//      EDV-Nr., Abschnitt; nur Mengen > 0; Komma als Dezimaltrennzeichen,
//   B  die PREISE: unveraendert aus dem Katalog, kein Zuschlag, kein Runden
//      (Ansage des Betriebs) - mit Gegenprobe gegen einen Aufschlag,
//   C  das Einfuegen: derselbe Abschnitt erscheint NIE zweimal in der Liste,
//   D  der Dialog: Kataloge, Suche, gewaehltes bleibt sichtbar, Zaehlzeile,
//      Uebernehmen, und dass dabei nichts geschrieben wird,
//   E  weitere Abschnitte: freie Namen im Dialog, "+ Abschnitt", und der
//      umbenennbare Titel in der Positionsliste,
//   F  Gegenproben: der Titel ist kein fester <b>-Text, ein Klick hinein
//      klappt den Block nicht zu, offKatZeilen kennt kein DOM,
//   G  die GELDRECHNUNG offRechnung(): Rabatt in Prozent und in Franken,
//      MwSt, Rundung auf Rappen, und dass ein Rabatt das Total nicht unter
//      null druecken kann,
//   H  das DOKUMENT offDokument(): Empfaenger ohne Leerzeilen, Bloecke mit
//      Zwischensumme, die Summenzeilen in der richtigen Reihenfolge,
//   I  das PDF: es entsteht wirklich, die Texte stehen darin, und der
//      Dateiname taugt fuer ein Dateisystem,
//   J  die TRENNUNG vom Import-Modul: dort gibt es weder Katalog-Dialog noch
//      "+ Abschnitt" mehr, und die beiden Karten heissen unterschiedlich.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offerte-erstellen-v3-200.js
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
   companyName="PETER KÜNZI AG";
   companyAddress="Bahnhofstrasse 1\n3400 Burgdorf";
   defaultVat="8.1 %";
   offerteVortext="Für die Spenglerarbeiten offerieren wir Ihnen wie folgt:";
   offerteSchlusstext="Zahlbar 30 Tage netto.";
   offerteGueltigTage=30;
   $("appRoot").hidden=false;$("authScreen").hidden=true;
   window.__db.log=[];
   // Wie in der App: das Formular wird ueber offFelderSetzen() aufgebaut,
   // nicht Feld fuer Feld von Hand - sonst prueft der Pruefstand einen
   // Zustand, den es im Betrieb gar nicht gibt.
   currentOfferteId=null; currentOfferteMeta={};
   offFelderSetzen(null);
   offPositionen=JSON.parse(JSON.stringify(POS||[]));
   offSektionOffen=new Set();
   $("offTitle").value="Offerte Muster AG";
   setOffProjectField(7);
   renderOffPositionsTabelle();
   $("offerteEditModal").hidden=false;
   $("offKatalogModal").hidden=true;
  },[RATES,MATERIALS,positionen]);
  await page.waitForTimeout(120);
 };

 // =========================================================================
 console.log("\nA · der Kern: aus einer Menge wird eine Offertposition");
 await grund([]);
 let z=await page.evaluate(()=>offKatZeilen({
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
 z=await page.evaluate(()=>offKatZeilen({
   "rate:Spengler":0, "rate:Vorarbeiter":"", "rate:Lehrling":"abc",
   "mat:10001":"-3", "mat:10002":0.25
  },"Arbeit","Material"));
 p(z.length===1&&z[0].pos==="10002",
   "0, leer, Unsinn und negative Mengen ergeben KEINE Position",z);

 // Vorgabe-Abschnitte
 z=await page.evaluate(()=>offKatZeilen({"rate:Spengler":1,"mat:10001":1},"","  "));
 p(z[0].abschnitt==="Arbeit"&&z[1].abschnitt==="Material",
   "leere Abschnittsfelder heissen Arbeit und Material, nicht gar nichts",
   [z[0].abschnitt,z[1].abschnitt]);

 // =========================================================================
 console.log("\nB · die Preise kommen unveraendert aus dem Katalog");
 z=await page.evaluate(()=>offKatZeilen({
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
  const neu=offKatZeilen({"rate:Spengler":1},"Arbeit","Material")[0].preis;
  settings.rates[0][1]=alt;
  return neu;
 });
 p(nachher===123.45,"Gegenprobe: der Preis wird wirklich gelesen, nicht fest eingebaut",nachher);

 // =========================================================================
 console.log("\nC · derselbe Abschnitt erscheint nie zweimal");
 let bau=await page.evaluate(()=>{
  offPositionen=[
   {pos:"",description:"Arbeit alt",quantity:1,unit:"h",preis:100,abschnitt:"Arbeit"},
   {pos:"",description:"Material alt",quantity:1,unit:"m",preis:10,abschnitt:"Material"}
  ];
  offPositionEinfuegen({pos:"",description:"Arbeit neu",quantity:2,unit:"h",preis:97.35,abschnitt:"Arbeit"});
  return offPositionen.map(x=>x.abschnitt+"/"+x.description);
 });
 p(JSON.stringify(bau)===JSON.stringify(["Arbeit/Arbeit alt","Arbeit/Arbeit neu","Material/Material alt"]),
   "die neue Zeile setzt sich HINTER die letzte ihres Abschnitts, nicht ans Ende",bau);
 // Gegenprobe ueber die gezeichnete Tabelle: eine Kopfzeile je Titel
 const koepfe=await page.evaluate(()=>{
  renderOffPositionsTabelle();
  return [...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")]
   .map(k=>k.dataset.offSekToggle);
 });
 p(JSON.stringify(koepfe)===JSON.stringify(["Arbeit","Material"]),
   "Gegenprobe in der Tabelle: genau eine Kopfzeile je Abschnitt",koepfe);

 // =========================================================================
 console.log("\nD · der Dialog");
 await grund([]);
 await page.evaluate(()=>$("offKatalogOeffnen").click());
 await page.waitForTimeout(200);
 let d=await page.evaluate(()=>({
  offen:!$("offKatalogModal").hidden,
  raten:[...$("offKatRatenBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
  material:[...$("offKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
  arbeit:$("offKatAbschnittArbeit").value,
  mat:$("offKatAbschnittMaterial").value,
  hinweis:$("offKatHinweis").textContent,
  gesperrt:$("offKatUebernehmen").disabled,
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
  $("offKatSuche").value="rinnen";
  $("offKatSuche").dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(120);
 // Die Reihenfolge der Treffer bestimmt das Zaehlwerk (haeufig Benutztes
 // zuerst) - geprueft wird deshalb die MENGE der Treffer, nicht ihre Folge.
 let such=await page.evaluate(()=>[...$("offKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent));
 p(JSON.stringify(such.slice().sort())===JSON.stringify(["50001","50002"]),"die Suche filtert das Material",such);

 // Eine Menge eintragen, dann weitersuchen: die Eingabe bleibt sichtbar
 await page.evaluate(()=>{
  const f=$("offKatMatBody").querySelector('[data-off-kat-menge="mat:50001"]');
  f.value="20"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(80);
 let nachSuche=await page.evaluate(()=>{
  $("offKatSuche").value="dicht";
  $("offKatSuche").dispatchEvent(new Event("input",{bubbles:true}));
  return {
   zeilen:[...$("offKatMatBody").querySelectorAll("tr")].map(tr=>tr.children[0].textContent),
   menge:($("offKatMatBody").querySelector('[data-off-kat-menge="mat:50001"]')||{}).value,
   hinweis:$("offKatHinweis").textContent
  };
 });
 p(nachSuche.zeilen[0]==="50001","was schon eine Menge hat, bleibt oben stehen",nachSuche.zeilen);
 p(nachSuche.menge==="20","und behaelt seine Menge",nachSuche.menge);
 p(nachSuche.zeilen.indexOf("30010")>0,"der neue Treffer steht trotzdem in der Liste",nachSuche.zeilen);

 // Stunden dazu, Zaehlzeile pruefen
 await page.evaluate(()=>{
  const f=$("offKatRatenBody").querySelector('[data-off-kat-menge="rate:Spengler"]');
  f.value="8"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(80);
 let hin=await page.evaluate(()=>({text:$("offKatHinweis").textContent,gesperrt:$("offKatUebernehmen").disabled}));
 // 8 * 97.35 = 778.80 ; 20 * 4.95 = 99.00 ; zusammen 877.80
 p(/2 Position/.test(hin.text)&&/877\.80|877,80|877.8/.test(hin.text.replace(/'/g,"")),
   "die Zaehlzeile nennt Anzahl und Summe zum Katalogpreis",hin.text);
 p(!hin.gesperrt,"jetzt ist Uebernehmen frei",hin.gesperrt);

 // Uebernehmen
 await page.evaluate(()=>$("offKatUebernehmen").click());
 await page.waitForTimeout(200);
 let u=await page.evaluate(()=>({
  zu:$("offKatalogModal").hidden,
  positionen:offPositionen.map(x=>[x.abschnitt,x.pos,x.description,x.quantity,x.unit,x.preis]),
  koepfe:[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.dataset.offSekToggle),
  offen:[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.classList.contains("open")),
  total:$("offSummen").textContent,
  mwstFeld:$("offMwst").value,
  geschrieben:window.__db.log.length
 }));
 p(u.zu,"der Dialog schliesst sich",u.zu);
 p(u.positionen.length===2,"zwei Positionen sind in der Offerte",u.positionen);
 p(u.positionen[0][0]==="Arbeit"&&u.positionen[1][0]==="Material",
   "getrennt nach Zeit und Material",u.positionen.map(x=>x[0]));
 p(u.positionen[0][5]===97.35&&u.positionen[1][5]===4.95,
   "mit den Katalogpreisen",[u.positionen[0][5],u.positionen[1][5]]);
 p(u.offen.every(Boolean),"die neuen Abschnitte sind aufgeklappt - man sieht, was passiert ist",u.offen);
 // 877.80 netto, 8.1 % MwSt = 71.10, Total 948.90.
 p(/877\.80/.test(u.total.replace(/\u2019/g,"")),"das Zwischentotal der Offerte stimmt",u.total);
 p(/948\.90/.test(u.total.replace(/\u2019/g,"")),"und das Total mit MwSt",u.total);
 p(u.mwstFeld==="8.1","der MwSt-Satz kommt aus der Firmenvorgabe",u.mwstFeld);
 // Gegenprobe: ein LEERES Feld darf nicht stillschweigend 0 % bedeuten - das
 // waere beim Kunden eine Zusage, die den Betrieb Geld kostet.
 let leerSatz=await page.evaluate(()=>{
  const alt=$("offMwst").value;
  $("offMwst").value="";
  const a=offFormularDaten().mwst_satz;
  $("offMwst").value="0";
  const b=offFormularDaten().mwst_satz;
  $("offMwst").value=alt;
  return [a,b];
 });
 p(leerSatz[0]===8.1,"ein leeres MwSt-Feld heisst Firmenvorgabe, nicht 0 %",leerSatz);
 p(leerSatz[1]===0,"eine ausdrueckliche 0 heisst aber wirklich 0 %",leerSatz);
 p(u.geschrieben===0,"das Uebernehmen schreibt NICHTS - gespeichert wird die Offerte wie immer von Hand",u.geschrieben);

 // Zweiter Durchgang in dieselben Abschnitte: kein doppelter Kopf
 await page.evaluate(()=>{
  $("offKatalogOeffnen").click();
  const f=$("offKatRatenBody").querySelector('[data-off-kat-menge="rate:Lehrling"]');
  f.value="4"; f.dispatchEvent(new Event("input",{bubbles:true}));
  $("offKatUebernehmen").click();
 });
 await page.waitForTimeout(200);
 let zwei=await page.evaluate(()=>({
  koepfe:[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.dataset.offSekToggle),
  abschnitte:offPositionen.map(x=>x.abschnitt)
 }));
 p(JSON.stringify(zwei.koepfe)===JSON.stringify(["Arbeit","Material"]),
   "auch beim zweiten Durchgang bleibt es bei einem Kopf je Abschnitt",zwei.koepfe);
 p(JSON.stringify(zwei.abschnitte)===JSON.stringify(["Arbeit","Arbeit","Material"]),
   "die neue Stunde sitzt bei den Stunden, nicht hinter dem Material",zwei.abschnitte);

 // =========================================================================
 console.log("\nE · weitere Abschnitte");
 await grund([]);
 await page.evaluate(()=>{
  $("offKatalogOeffnen").click();
  $("offKatAbschnittArbeit").value="Regie Stunden";
  $("offKatAbschnittMaterial").value="Gerüst";
  const a=$("offKatRatenBody").querySelector('[data-off-kat-menge="rate:Spengler"]');
  a.value="3"; a.dispatchEvent(new Event("input",{bubbles:true}));
  const m=$("offKatMatBody").querySelector('[data-off-kat-menge="mat:10001"]');
  m.value="5"; m.dispatchEvent(new Event("input",{bubbles:true}));
  $("offKatUebernehmen").click();
 });
 await page.waitForTimeout(200);
 let frei=await page.evaluate(()=>[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.dataset.offSekToggle));
 p(JSON.stringify(frei)===JSON.stringify(["Regie Stunden","Gerüst"]),
   "die Abschnittsnamen sind frei - es muss nicht Arbeit und Material heissen",frei);

 // Vorschlagsliste kennt die vorhandenen Abschnitte
 let vor=await page.evaluate(()=>{
  $("offKatalogOeffnen").click();
  return {liste:[...$("offKatAbschnitte").querySelectorAll("option")].map(o=>o.value),
          arbeit:$("offKatAbschnittArbeit").value};
 });
 p(vor.liste.indexOf("Regie Stunden")>=0&&vor.liste.indexOf("Gerüst")>=0,
   "der Dialog schlaegt die Abschnitte dieser Offerte vor",vor.liste);
 await page.evaluate(()=>{$("offKatalogModal").hidden=true});

 // "+ Abschnitt"
 page.__promptAntwort="Entsorgung";
 await page.evaluate(()=>$("offAddAbschnitt").click());
 await page.waitForTimeout(150);
 let neu=await page.evaluate(()=>({
  koepfe:[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.dataset.offSekToggle),
  letzte:offPositionen[offPositionen.length-1]
 }));
 p(neu.koepfe.indexOf("Entsorgung")>=0,"„+ Abschnitt“ legt einen weiteren Abschnitt an",neu.koepfe);
 p(neu.letzte.abschnitt==="Entsorgung"&&neu.letzte.description==="",
   "mit einer leeren Zeile zum Ausfuellen",neu.letzte);
 // Gegenprobe: Abbrechen legt nichts an
 const vorher=await page.evaluate(()=>offPositionen.length);
 page.__promptAntwort="";
 await page.evaluate(()=>$("offAddAbschnitt").click());
 await page.waitForTimeout(120);
 p(await page.evaluate(()=>offPositionen.length)===vorher,
   "Gegenprobe: ein leerer Name legt nichts an",vorher);

 // Umbenennen in der Liste. Fehlt das Feld ueberhaupt (etwa weil der Titel
 // wieder fester Text waere), soll das eine Fehlmeldung geben und nicht den
 // Pruefstand abstuerzen lassen - deshalb wird es erst gesucht, dann benutzt.
 page.__promptAntwort="Entsorgung";
 let um=await page.evaluate(()=>{
  offSektionOffen.add("Entsorgung");
  renderOffPositionsTabelle();
  const f=$("offPositionsBody").querySelector('[data-off-sek-name="Entsorgung"]');
  if(!f)return {keinFeld:true};
  f.value="Entsorgung & Transport";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  return {koepfe:[...$("offPositionsBody").querySelectorAll("[data-off-sek-toggle]")].map(k=>k.dataset.offSekToggle),
          abschnitte:offPositionen.map(x=>x.abschnitt),
          offenNeu:offSektionOffen.has("Entsorgung & Transport"),
          offenAlt:offSektionOffen.has("Entsorgung")};
 });
 p(!um.keinFeld,"der Abschnittstitel ist ueberhaupt ein Feld zum Umbenennen",um);
 p(!um.keinFeld&&um.koepfe.indexOf("Entsorgung & Transport")>=0&&um.koepfe.indexOf("Entsorgung")<0,
   "ein Abschnitt laesst sich in der Liste umbenennen",um.koepfe);
 p(!um.keinFeld&&um.abschnitte.indexOf("Entsorgung")<0,"alle seine Positionen wandern mit",um.abschnitte);
 p(!um.keinFeld&&um.offenNeu&&!um.offenAlt,"und er bleibt dabei aufgeklappt",[um.offenNeu,um.offenAlt]);
 // Gegenprobe: ein leerer Titel wuerde den Abschnitt aufloesen - wird abgelehnt
 let leer=await page.evaluate(()=>{
  const f=$("offPositionsBody").querySelector('[data-off-sek-name="Entsorgung & Transport"]');
  if(!f)return {keinFeld:true};
  f.value="   ";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  const nachher=$("offPositionsBody").querySelector('[data-off-sek-name="Entsorgung & Transport"]');
  return {feld:nachher?nachher.value:null, abschnitte:offPositionen.map(x=>x.abschnitt)};
 });
 p(!leer.keinFeld&&leer.feld==="Entsorgung & Transport"&&leer.abschnitte.indexOf("Entsorgung & Transport")>=0,
   "Gegenprobe: ein leerer Titel loest den Abschnitt NICHT auf, das Feld springt zurueck",leer);

 // =========================================================================
 console.log("\nF · Gegenproben zum Zustand vor v3.199");
 const html=await page.evaluate(()=>{
  const k=$("offPositionsBody").querySelector("[data-off-sek-toggle]");
  return {innen:k.innerHTML, hatB:!!k.querySelector("b"), hatFeld:!!k.querySelector("input.ang-sek-titel")};
 });
 p(html.hatFeld,"der Abschnittstitel ist ein Eingabefeld",html.hatFeld);
 p(!html.hatB,"Gegenprobe: er ist NICHT mehr der feste <b>-Text von v3.71",html.innen.slice(0,160));
 // Klick ins Titelfeld klappt nicht zu
 let klick=await page.evaluate(()=>{
  const k=$("offPositionsBody").querySelector("[data-off-sek-toggle]");
  const titel=k.dataset.offSekToggle;
  offSektionOffen.add(titel);
  renderOffPositionsTabelle();
  const kopf=$("offPositionsBody").querySelector("[data-off-sek-toggle]");
  const feld=kopf.querySelector("input.ang-sek-titel");
  if(!feld)return {keinFeld:true};
  feld.click();
  return {offen:$("offPositionsBody").querySelector("[data-off-sek-toggle]").classList.contains("open")};
 });
 p(!klick.keinFeld&&klick.offen,"ein Klick INS Titelfeld klappt den Block nicht zu",klick);
 // ...der Klick daneben aber schon
 let klick2=await page.evaluate(()=>{
  const kopf=$("offPositionsBody").querySelector("[data-off-sek-toggle]");
  kopf.querySelector(".klapp-chevron").click();
  return $("offPositionsBody").querySelector("[data-off-sek-toggle]").classList.contains("open");
 });
 p(!klick2,"Gegenprobe: der Klick daneben klappt weiterhin",klick2);

 // offKatZeilen kennt kein DOM
 const ohneDom=await page.evaluate(()=>{
  $("offKatalogModal").hidden=true;
  $("offerteEditModal").hidden=true;
  return offKatZeilen({"rate:Spengler":1},"X","Y").length;
 });
 p(ohneDom===1,"offKatZeilen rechnet ohne geoeffneten Dialog - es liest kein Eingabefeld",ohneDom);


 // =========================================================================
 console.log("\nG · die Geldrechnung");
 await grund([]);
 const POS=[{quantity:8,preis:97.35},{quantity:20,preis:4.95}];   // 877.80
 let g=await page.evaluate(P=>({
  ohne:      offRechnung(P,"prozent",0,"8.1 %"),
  prozent:   offRechnung(P,"prozent",10,"8.1 %"),
  betrag:    offRechnung(P,"betrag",100,"8.1 %"),
  ohneMwst:  offRechnung(P,"prozent",0,0),
  zuviel:    offRechnung(P,"betrag",99999,"8.1 %"),
  negativ:   offRechnung(P,"prozent",-5,"8.1 %"),
  leer:      offRechnung([],"prozent",10,"8.1 %"),
  textsatz:  offRechnung(P,"prozent",0,"7,7 %")
 }),POS);
 p(g.ohne.zwischentotal===877.8,"8 h à 97.35 und 20 à 4.95 ergeben 877.80",g.ohne);
 // 877.80 + 8.1 % = 877.80 + 71.10 = 948.90
 p(g.ohne.mwst===71.1&&g.ohne.total===948.9,"8.1 % MwSt darauf: 71.10, Total 948.90",g.ohne);
 // 10 % von 877.80 = 87.78 -> netto 790.02 -> MwSt 63.99 -> 854.01
 p(g.prozent.rabatt===87.78&&g.prozent.netto===790.02&&g.prozent.mwst===63.99&&g.prozent.total===854.01,
   "Rabatt in Prozent: 87.78 / 790.02 / 63.99 / 854.01",g.prozent);
 // 100.- Abzug -> 777.80 -> MwSt 63.00 -> 840.80
 p(g.betrag.rabatt===100&&g.betrag.netto===777.8&&g.betrag.mwst===63&&g.betrag.total===840.8,
   "Rabatt als Betrag: 100.00 / 777.80 / 63.00 / 840.80",g.betrag);
 p(g.ohneMwst.mwst===0&&g.ohneMwst.total===877.8,"ohne MwSt bleibt das Total das Zwischentotal",g.ohneMwst);
 p(g.zuviel.rabatt===877.8&&g.zuviel.total===0,
   "ein zu grosser Rabatt drueckt das Total auf 0, nicht ins Minus",g.zuviel);
 p(g.negativ.rabatt===0,"ein negativer Rabatt ist kein Aufschlag - er wird ignoriert",g.negativ);
 p(g.leer.total===0,"eine Offerte ohne Positionen hat Total 0",g.leer);
 p(g.textsatz.mwstSatz===7.7,"der MwSt-Satz darf als Text mit Komma und % kommen",g.textsatz);
 // Rundung: jede Zwischensumme steht auf Rappen, sonst stimmt das gedruckte
 // Total nicht mit der Summe der gedruckten Zeilen ueberein.
 let rund=await page.evaluate(()=>{
  const r=offRechnung([{quantity:3,preis:0.335},{quantity:7,preis:1.115}],"prozent",3.7,"8.1 %");
  return {r, glatt:[r.zwischentotal,r.rabatt,r.netto,r.mwst,r.total]
    .every(x=>Math.abs(x*100-Math.round(x*100))<1e-9)};
 });
 p(rund.glatt,"jeder Betrag steht auf ganzen Rappen",rund.r);

 // =========================================================================
 console.log("\nH · das Dokument");
 let h=await page.evaluate(()=>offDokument({
  offert_nr:"2026-014", title:"Spenglerarbeiten Dachsanierung",
  date:"2026-09-26", gueltig_bis:"2026-10-26",
  kunde_name:"Muster AG", kunde_zusatz:"", kunde_strasse:"Bahnhofstrasse 12",
  kunde_plz_ort:"3400 Burgdorf",
  vortext:"Für die Spenglerarbeiten offerieren wir Ihnen wie folgt:",
  schlusstext:"Zahlbar 30 Tage netto.",
  positionen:[
   {pos:"",description:"Spengler",quantity:8,unit:"h",preis:97.35,abschnitt:"Arbeit"},
   {pos:"",description:"Lehrling",quantity:4,unit:"h",preis:46.2,abschnitt:"Arbeit"},
   {pos:"10001",description:"Titanzink Band",quantity:12,unit:"m",preis:31.45,abschnitt:"Material"}
  ],
  rabatt_art:"prozent", rabatt_wert:5, mwst_satz:8.1
 },offFirmaFuerPdf()));
 p(h.empfaenger.length===3&&h.empfaenger[0]==="Muster AG",
   "der leere Zusatz erzeugt KEINE Leerzeile im Anschriftsfeld",h.empfaenger);
 p(h.absender.name==="PETER KÜNZI AG"&&h.absender.adresse.length===2,
   "der Briefkopf kommt aus den Firmendaten",h.absender);
 p(h.bloecke.length===2&&h.bloecke[0].titel==="Arbeit"&&h.bloecke[1].titel==="Material",
   "zwei Bloecke, in der Reihenfolge der Positionen",h.bloecke.map(b=>b.titel));
 // 8*97.35 + 4*46.20 = 778.80 + 184.80 = 963.60 ; 12*31.45 = 377.40
 p(h.bloecke[0].summe===963.6&&h.bloecke[1].summe===377.4,
   "jeder Block hat seine Zwischensumme",h.bloecke.map(b=>b.summe));
 p(h.summen.map(x=>x[0]).join("|")==="Zwischentotal|Rabatt 5 %|Netto|MwSt 8,1 %|Total CHF",
   "die Summenzeilen stehen in der richtigen Reihenfolge",h.summen.map(x=>x[0]));
 p(h.summen[1][1]<0,"der Rabatt steht als Abzug da, nicht als positive Zahl",h.summen[1]);
 // 1341.00 - 5 % = 67.05 -> 1273.95 -> MwSt 103.19 -> 1377.14
 p(h.rechnung.zwischentotal===1341&&h.rechnung.total===1377.14,
   "das Total des Dokuments stimmt mit der Rechnung ueberein",h.rechnung);
 p(h.kopfRechts.map(x=>x[0]).join("|")==="Offert-Nr.|Datum|Gültig bis",
   "Offert-Nr., Datum und Gültigkeit stehen im Kopf",h.kopfRechts);
 // Ohne Nummer faellt die Zeile weg statt leer dazustehen
 let ohneNr=await page.evaluate(()=>offDokument({title:"X",date:"2026-09-26",positionen:[]},{}).kopfRechts.map(x=>x[0]));
 p(ohneNr.join("|")==="Datum","ohne Offert-Nr. faellt die Zeile weg",ohneNr);

 // =========================================================================
 console.log("\nI · das PDF");
 let pdf=await page.evaluate(()=>{
  const dok=offDokument({
   offert_nr:"2026-014", title:"Spenglerarbeiten Dachsanierung",
   date:"2026-09-26", gueltig_bis:"2026-10-26",
   kunde_name:"Muster AG", kunde_strasse:"Bahnhofstrasse 12", kunde_plz_ort:"3400 Burgdorf",
   vortext:"Für die Spenglerarbeiten offerieren wir Ihnen wie folgt:",
   schlusstext:"Zahlbar 30 Tage netto.",
   positionen:[{pos:"",description:"Spengler",quantity:8,unit:"h",preis:97.35,abschnitt:"Arbeit"}],
   rabatt_art:"prozent", rabatt_wert:0, mwst_satz:8.1
  },offFirmaFuerPdf());
  // Unkomprimiert, damit die Texte im Klartext im Inhaltsstrom stehen.
  const doc=offPdfBauen(dok,{komprimieren:false});
  const roh=doc.output();
  const komprimiert=offPdfBauen(dok).output("blob");
  return {
   seiten:doc.getNumberOfPages(),
   anfang:roh.slice(0,8),
   bytes:komprimiert.size,
   typ:komprimiert.type,
   hat:{
    firma:roh.indexOf("PETER K")>=0,
    kunde:roh.indexOf("Muster AG")>=0,
    titel:roh.indexOf("Spenglerarbeiten Dachsanierung")>=0,
    total:roh.indexOf("Total CHF")>=0,
    seitenzahl:roh.indexOf("Seite 1 von 1")>=0,
    umlaut:roh.indexOf("ltig bis")>=0            // "Gültig bis"
   }
  };
 });
 p(pdf.anfang.indexOf("%PDF")===0,"es entsteht wirklich ein PDF",pdf.anfang);
 p(pdf.seiten===1,"eine kurze Offerte passt auf eine Seite",pdf.seiten);
 p(pdf.typ==="application/pdf"&&pdf.bytes>1000,"und als Blob mit dem richtigen Typ",[pdf.typ,pdf.bytes]);
 p(pdf.hat.firma,"der Firmenname steht darin",pdf.hat);
 p(pdf.hat.kunde,"der Kunde steht darin",pdf.hat);
 p(pdf.hat.titel,"die Bezeichnung steht darin",pdf.hat);
 p(pdf.hat.total,"die Totalzeile steht darin",pdf.hat);
 p(pdf.hat.seitenzahl,"die Seitenzahl steht darin",pdf.hat);
 p(pdf.hat.umlaut,"Umlaute werden richtig geschrieben (Gültig bis)",pdf.hat);
 // Eine lange Offerte laeuft auf mehrere Seiten um
 let lang=await page.evaluate(()=>{
  const pos=[];
  for(let i=1;i<=120;i++)pos.push({pos:String(i),description:"Position "+i+" mit einer etwas laengeren Beschreibung, wie sie in einer echten Offerte vorkommt",quantity:i,unit:"m",preis:12.5,abschnitt:"Arbeit"});
  const dok=offDokument({title:"Lang",date:"2026-09-26",positionen:pos,rabatt_art:"prozent",rabatt_wert:0,mwst_satz:8.1},offFirmaFuerPdf());
  return offPdfBauen(dok).getNumberOfPages();
 });
 p(lang>1,"eine lange Offerte laeuft sauber auf mehrere Seiten um",lang);
 // Dateiname
 let namen=await page.evaluate(()=>[
  offPdfDateiname({offert_nr:"2026-014",title:"Dach: Muster/AG"}),
  offPdfDateiname({})
 ]);
 p(namen[0]==="Offerte 2026-014 Dach Muster AG.pdf",
   "der Dateiname enthaelt Nummer und Bezeichnung, ohne Sonderzeichen",namen[0]);
 p(namen[1]==="Offerte Offerte.pdf","ohne Angaben bleibt ein brauchbarer Name",namen[1]);

 // =========================================================================
 console.log("\nJ · die Trennung vom Import-Modul");
 let tr=await page.evaluate(()=>({
  // Gegenprobe zum Zustand von v3.199: der Katalog-Dialog sass am
  // Import-Formular. Dort darf er nicht mehr sein.
  importKatalogKnopf:!!document.getElementById("angKatalogOeffnen"),
  importAbschnittKnopf:!!document.getElementById("angAddAbschnitt"),
  importKatalogDialog:!!document.getElementById("angKatalogModal"),
  importKatalogCode:typeof window.angKatZeilen!=="undefined",
  // ... und hier schon
  eigenKatalogKnopf:!!document.getElementById("offKatalogOeffnen"),
  eigenKatalogDialog:!!document.getElementById("offKatalogModal"),
  // Zwei Karten mit klar verschiedenen Namen
  karteImport:(document.querySelector("#cockpitAngeboteCard h2")||{}).textContent||"",
  karteEigen:(document.querySelector("#cockpitOffertenCard h2")||{}).textContent||"",
  // Zwei getrennte Tabellen
  eigenTabelle:typeof loadProjectOfferten==="function",
  importTabelle:typeof loadProjectAngebote==="function"
 }));
 p(!tr.importKatalogKnopf&&!tr.importAbschnittKnopf&&!tr.importKatalogDialog,
   "Gegenprobe v3.199: das Import-Formular hat keinen Katalog-Dialog mehr",tr);
 p(!tr.importKatalogCode,"und auch den Code dazu nicht mehr",tr.importKatalogCode);
 p(tr.eigenKatalogKnopf&&tr.eigenKatalogDialog,"die eigene Offerte hat ihn",tr);
 p(/importieren/i.test(tr.karteImport),"die Import-Karte heisst jetzt „Offerte importieren“",tr.karteImport);
 p(/erstellen/i.test(tr.karteEigen),"und die neue Karte „Offerte erstellen“",tr.karteEigen);
 p(tr.eigenTabelle&&tr.importTabelle,"beide laden aus ihrer eigenen Tabelle",tr);
 // Beide haengen an derselben Freischaltung - ein zweiter Schalter waere
 // eine zweite Stelle zum Vergessen.
 let gate=await page.evaluate(async()=>{
  offerteZugriff=false;
  $("cockpitAngeboteCard").hidden=!offerteZugriff;
  $("cockpitOffertenCard").hidden=!offerteZugriff;
  const zu=$("cockpitOffertenCard").hidden;
  const geladen=await loadProjectOfferten(7);
  return {zu, geladen, gelesen:window.__db.log.length};
 });
 p(gate.zu,"ohne Freischaltung ist die Karte weg",gate.zu);
 p(gate.geladen===0,"und es wird gar nichts geladen",gate.geladen);


 // =========================================================================
 console.log("\nK · Positionsnummer tippen zeigt die Materialpositionen (v3.201)");
 await grund([]);
 let k=await page.evaluate(()=>{
  offPositionen=[{pos:"",description:"",quantity:2,unit:"",preis:0,abschnitt:""}];
  renderOffPositionsTabelle();
  const feld=$("offPositionsBody").querySelector('[data-off-pos="0"]');
  const raus={feld:!!feld, box:!!$("offSug0"), leerVorher:$("offSug0").innerHTML===""};
  feld.value="100";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  raus.treffer=[...$("offSug0").querySelectorAll("[data-off-pick-mat]")].map(d=>d.dataset.no);
  raus.textErste=($("offSug0").querySelector("[data-off-pick-mat]")||{}).innerText||"";
  return raus;
 });
 p(k.feld&&k.box,"das Positionsfeld hat eine Vorschlagsliste",k);
 p(k.leerVorher,"leer, solange nichts getippt ist",k.leerVorher);
 p(k.treffer.length===2&&k.treffer.indexOf("10001")>=0&&k.treffer.indexOf("10002")>=0,
   "beim Tippen von „100“ erscheinen sofort die passenden Materialpositionen",k.treffer);
 p(/10001/.test(k.textErste)&&/Titanzink Band/.test(k.textErste)&&/31\.45/.test(k.textErste),
   "mit EDV-Nr., Bezeichnung und Preis",k.textErste);
 // Uebernehmen
 let u2=await page.evaluate(()=>{
  $("offSug0").querySelector('[data-off-pick-mat][data-no="10001"]').click();
  return {zeile:JSON.parse(JSON.stringify(offPositionen[0])),
          boxLeer:$("offSug0").innerHTML==="",
          summe:$("offSummen").textContent};
 });
 p(u2.zeile.pos==="10001"&&u2.zeile.description==="Titanzink Band · 0.7 mm × 670 mm"
   &&u2.zeile.unit==="m"&&u2.zeile.preis===31.45,
   "ein Klick uebernimmt Nummer, Bezeichnung, Einheit und Preis",u2.zeile);
 p(u2.zeile.quantity===2,"die bereits eingetragene Menge bleibt stehen",u2.zeile.quantity);
 p(u2.boxLeer,"die Liste schliesst sich danach",u2.boxLeer);
 p(/62\.90/.test(u2.summe.replace(/’/g,"")),"und das Total rechnet sofort mit (2 × 31.45)",u2.summe);

 // ---- der Kern der Ansage: es geht WEITERHIN auch von Hand --------------
 let vonHand=await page.evaluate(()=>{
  offPositionen=[{pos:"",description:"",quantity:0,unit:"",preis:0,abschnitt:""}];
  renderOffPositionsTabelle();
  const f=$("offPositionsBody").querySelector('[data-off-pos="0"]');
  f.value="9999";                       // gibt es im Katalog nicht
  f.dispatchEvent(new Event("input",{bubbles:true}));
  const ohneTreffer=$("offSug0").innerHTML.trim()==="";
  // alles Weitere von Hand eintragen, ohne den Katalog
  const setz=(sel,wert)=>{const el=$("offPositionsBody").querySelector(sel);
   el.value=wert; el.dispatchEvent(new Event("input",{bubbles:true}));};
  setz('[data-off-desc="0"]',"Sonderanfertigung nach Skizze");
  setz('[data-off-qty="0"]',"3");
  setz('[data-off-unit="0"]',"Stk.");
  setz('[data-off-preis="0"]',"250");
  return {ohneTreffer, zeile:JSON.parse(JSON.stringify(offPositionen[0])),
          summe:$("offSummen").textContent};
 });
 p(vonHand.ohneTreffer,"eine Nummer ohne Treffer zeigt keine Liste",vonHand.ohneTreffer);
 p(vonHand.zeile.pos==="9999"&&vonHand.zeile.description==="Sonderanfertigung nach Skizze"
   &&vonHand.zeile.quantity===3&&vonHand.zeile.unit==="Stk."&&vonHand.zeile.preis===250,
   "eine Position laesst sich WEITERHIN vollstaendig von Hand erfassen",vonHand.zeile);
 p(/750\.00/.test(vonHand.summe.replace(/’/g,"")),"und rechnet genauso mit",vonHand.summe);
 // Gegenprobe: der Vorschlag darf nichts von sich aus ueberschreiben
 let ohneKlick=await page.evaluate(()=>{
  const f=$("offPositionsBody").querySelector('[data-off-pos="0"]');
  f.value="10001";                      // Treffer, aber NICHT angeklickt
  f.dispatchEvent(new Event("input",{bubbles:true}));
  return JSON.parse(JSON.stringify(offPositionen[0]));
 });
 p(ohneKlick.description==="Sonderanfertigung nach Skizze"&&ohneKlick.preis===250,
   "Gegenprobe: ohne Klick wird NICHTS ueberschrieben - der Vorschlag ist ein Angebot",
   ohneKlick);

 // =========================================================================
 console.log("\nL · in der neuen Ansicht erreichbar (v3.201)");
 let a2=await page.evaluate(()=>{
  const raus={};
  raus.cache=typeof a2Off==="function";
  raus.oeffnen=typeof a2Oeffne==="function";
  // Die Projektseite der neuen Ansicht bauen - mit Freischaltung.
  offerteZugriff=true;
  $("cockpitStandOffertenZeile").hidden=false;
  $("cockpitStandAngeboteZeile").hidden=false;
  projectOffertenCache=[{id:501,title:"Dachsanierung",offert_nr:"2026-014",date:"2026-09-26",
    positionen:[{quantity:2,preis:100}],rabatt_art:"prozent",rabatt_wert:0,mwst_satz:8.1}];
  const html=a2RegMehr({id:7});
  raus.hatBlock=html.indexOf("Offerte erstellen")>=0;
  raus.hatImport=html.indexOf("Offerte importieren")>=0;
  raus.hatZeile=html.indexOf('data-a2-off="501"')>=0;
  raus.hatNeu=html.indexOf('neueoff')>=0;
  raus.zeigtTitel=html.indexOf("Dachsanierung")>=0;
  // 2 × 100 = 200, + 8.1 % = 216.20
  raus.zeigtSumme=html.indexOf("216.20")>=0;
  raus.reihenfolge=html.indexOf("Offerte erstellen")<html.indexOf("Offerte importieren");
  // ohne Freischaltung verschwinden beide
  offerteZugriff=false;
  $("cockpitStandOffertenZeile").hidden=true;
  $("cockpitStandAngeboteZeile").hidden=true;
  const ohne=a2RegMehr({id:7});
  raus.ohneFreigabe=ohne.indexOf("Offerte")<0;
  return raus;
 });
 p(a2.cache&&a2.oeffnen,"die neue Ansicht kennt die eigenen Offerten",a2);
 p(a2.hatBlock,"die Projektseite zeigt den Block „Offerte erstellen“",a2);
 p(a2.hatZeile&&a2.zeigtTitel,"mit einer Zeile je Offerte",a2);
 p(a2.zeigtSumme,"und dem Total, mit derselben Rechnung wie ueberall",a2);
 p(a2.hatNeu,"und dem Knopf zum Anlegen",a2);
 p(a2.reihenfolge,"die eigene Offerte steht VOR dem Import - so laeuft der Betrieb",a2);
 p(a2.hatImport,"der Import bleibt daneben erhalten",a2);
 p(a2.ohneFreigabe,"ohne Freischaltung erscheint keiner der beiden Bloecke",a2.ohneFreigabe);
 // Das Formular gehoert zu den bekannten Formularen der Ansicht - sonst
 // bliebe es beim Wechsel auf die Startseite offen stehen.
 let form=await page.evaluate(()=>({
  bekannt:typeof A2_FORMULARE!=="undefined"&&A2_FORMULARE.indexOf("offerteEditModal")>=0
 }));
 p(form.bekannt,"das Offertformular ist der Ansicht als Formular bekannt",form);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);

 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
