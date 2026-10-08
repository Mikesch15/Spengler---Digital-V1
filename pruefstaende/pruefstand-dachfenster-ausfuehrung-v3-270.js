// Prueft die Ausfuehrung der Dachfenstereinfassung: gepunktet / gefalzt (v3.270).
//
// Ansage des Anwenders am 8.10.2026, an seinem Blatt "Nord Nr.1": es soll zwei
// Ausfuehrungen geben - gepunktet (Seitenteile seitwaerts angepunktet) und
// gefalzt (Seitenteile mit senkrechtem Falz) - und er nannte die Abwicklungen,
// wie sie sein muessen (Breite x Laenge):
//
//                      gepunktet      gefalzt
//   Vorderteil         280 x 774      280 x 564
//   Hinterteil         467 x 774      467 x 595
//   Seitenteil         190 x 990      190 x 1225     (je Seite)
//   Seitenteil hinten  224 x 175      224 x 505      (je Seite)
//
// Dazu: "soll auch im nachhinein noch geaendert werden koennen zu gefalzt
// (ich habe echte massaufnahmen, welche noch nicht geruestet sind)".
//
//   A  die zwoelf Sollmasse aus dem Blatt, in BEIDEN Bauarten des Seitenteils
//   B  die Formeln stecken nicht nur im Beispiel: jedes Mass wird veraendert
//      und muss mitgehen (sonst waere die Zahl hineingeschrieben)
//   C  Speichern, wieder oeffnen, umschalten - die Ausfuehrung geht nicht verloren
//   D  der Umschalter ist zu sehen (die beiden Knoepfe sehen verschieden aus)
//   E  der Ausdruck nennt die Ausfuehrung
//
// Jede Probe hat eine Gegenprobe. Die alten Zahlen (375 breit, 205 breit,
// 790 lang) duerfen nicht zurueckkommen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

// Nord Nr.1 - die Masse vom Blatt des Anwenders (Rueckmeldung 8.10.2026).
// Knick: b ist die ganze Laenge 990. Separat: b + c - Ueberlappung = 990.
const NORD={getrennt:false,lattenabstand:355,
 breiteVorne:554,breiteHinten:570,umschlagVorne:10,umschlagSeite:10,saumVorne:35,
 breiteOben:120,breiteUnten:160,randAbstand:15,randStrich:12,
 a:{l:225,r:225},d:{l:295,r:295},f:{l:50,r:50},g:{l:50,r:50},
 aufVorne:80,aufHinten:95,e:35,eUmschlag:15,anreiff:15,anreiffUmschlag:10};
const KNICK=Object.assign({},NORD,{seitenteilArt:"knick",ueberlappung:"",
 b:{l:990,r:990},c:{l:"",r:""}});
const SEPARAT=Object.assign({},NORD,{seitenteilArt:"separat",ueberlappung:10,
 b:{l:500,r:500},c:{l:500,r:500}});

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof dfaZuschnitte==="function"&&typeof dfaFuellen==="function");

 // Rechnet einen Fall und gibt "Name Seite: B x L" je Zuschnitt zurueck.
 const rechne=(basis,art,aenderung)=>page.evaluate(([bs,ar,ae])=>{
  dfaA=Object.assign(dfaLeer(),bs,ae||{},{ausfuehrung:ar});
  const z={};
  dfaZuschnitte().forEach(x=>{z[x.name+(x.seite?" "+x.seite:"")]=x.breite+" x "+x.laenge});
  return z;
 },[basis,art,aenderung]);

 // ---- A · Die zwoelf Sollmasse ------------------------------------------------
 console.log("\nA · Die Sollmasse vom Blatt Nord Nr.1");
 const SOLL={
  gepunktet:{"Vorderteil":"280 x 774","Hinterteil":"467 x 774",
   "Seitenteil links":"190 x 990","Seitenteil rechts":"190 x 990",
   "Seitenteil hinten links":"224 x 175","Seitenteil hinten rechts":"224 x 175"},
  gefalzt:{"Vorderteil":"280 x 564","Hinterteil":"467 x 595",
   "Seitenteil links":"190 x 1225","Seitenteil rechts":"190 x 1225",
   "Seitenteil hinten links":"224 x 505","Seitenteil hinten rechts":"224 x 505"}};
 for(const [bauart,basis] of [["Knick",KNICK],["separat",SEPARAT]]){
  for(const art of ["gepunktet","gefalzt"]){
   const ist=await rechne(basis,art);
   for(const [name,soll] of Object.entries(SOLL[art]))
    p(ist[name]===soll,bauart+" · "+art+" · "+name+" = "+soll,{ist:ist[name]});
   p(Object.keys(ist).length===6,bauart+" · "+art+": sechs Zuschnitte",Object.keys(ist));
  }
 }
 // Gegenprobe: die alten Zahlen vor v3.270 duerfen nicht zurueckkommen.
 const k=await rechne(KNICK,"gepunktet");
 p(k["Vorderteil"]!=="375 x 774","Gegenprobe: das Vorderteil ist nicht mehr 375 breit (mit Seite 80 und Anreiff 15)",k["Vorderteil"]);
 p(k["Seitenteil links"]!=="205 x 980","Gegenprobe: das Seitenteil nimmt F (80), nicht das groessere Mass (95)",k["Seitenteil links"]);
 p(k["Hinterteil"]!=="467 x 790","Gegenprobe: das gepunktete Hinterteil ist nicht mehr nach Breite hinten gerechnet (790)",k["Hinterteil"]);
 p(!Object.keys(k).some(n=>/Mitte|vorne/.test(n.replace("Vorderteil",""))&&/^Seitenteil/.test(n)),
   "Gegenprobe: keine Seitenteile vorne / Mitte mehr",Object.keys(k));

 // ---- B · Die Formeln gehen mit ------------------------------------------------
 // Jedes Mass wird einzeln veraendert; die Erwartung steht als Rechnung da.
 // Ausgangswerte: siehe NORD.
 console.log("\nB · Jedes Mass wirkt dort, wo es wirken soll");
 const zahl=s=>s.split(" x ").map(Number);   // [Breite, Laenge]
 const diff=async(art,aenderung,name)=>{
  const vor=zahl((await rechne(KNICK,art))[name]), nach=zahl((await rechne(KNICK,art,aenderung))[name]);
  return [nach[0]-vor[0],nach[1]-vor[1]];   // [dBreite, dLaenge]
 };
 let d;
 d=await diff("gefalzt",{breiteHinten:580},"Hinterteil");
 p(d[1]===10&&d[0]===0,"gefalzt: Breite hinten +10 -> Hinterteil 10 laenger (Breite hinten + 25 Falzzugabe)",d);
 d=await diff("gepunktet",{breiteHinten:580},"Hinterteil");
 p(d[0]===0&&d[1]===0,"gepunktet: Breite hinten aendert das Hinterteil NICHT (es ist so lang wie das Vorderteil)",d);
 d=await diff("gepunktet",{breiteHinten:580},"Seitenteil hinten links");
 p(d[0]===-5,"gepunktet: Breite hinten +10 -> Seitenteil hinten 5 schmaler ((vorne - hinten) / 2)",d);
 d=await diff("gepunktet",{breiteVorne:564},"Hinterteil");
 p(d[1]===10,"gepunktet: Breite vorne +10 -> Hinterteil UND Vorderteil 10 laenger",d);
 d=await diff("gepunktet",{breiteVorne:564},"Vorderteil");
 p(d[1]===10,"gepunktet: Breite vorne +10 -> Vorderteil 10 laenger",d);
 d=await diff("gefalzt",{anreiffUmschlag:12},"Vorderteil");
 p(d[0]===2&&d[1]===2,"gefalzt: Umschlag Anreiff +2 -> Vorderteil 2 breiter und 2 laenger (der Anwender: die 10 sind B)",d);
 d=await diff("gefalzt",{anreiffUmschlag:12},"Seitenteil links");
 p(d[1]===2,"gefalzt: Umschlag Anreiff +2 -> Seitenteil 2 laenger (C + G + B)",d);
 d=await diff("gepunktet",{anreiffUmschlag:12},"Seitenteil links");
 p(d[1]===0,"Gegenprobe gepunktet: Umschlag Anreiff aendert die Laenge des Seitenteils nicht",d);
 d=await diff("gepunktet",{anreiff:30},"Vorderteil");
 p(d[0]===0&&d[1]===0,"der Anreiff selbst (15) zaehlt nicht in die Abwicklung - er steckt in C",d);
 d=await diff("gepunktet",{aufVorne:90},"Seitenteil links");
 p(d[0]===10,"Seitenteil: Aufbordungshoehe vorne +10 -> 10 breiter",d);
 d=await diff("gepunktet",{aufVorne:90},"Vorderteil");
 p(d[0]===0,"Gegenprobe: die Aufbordungshoehe der Seite gehoert nicht ins Vorderteil",d);
 d=await diff("gepunktet",{aufHinten:105},"Seitenteil hinten links");
 p(d[0]===10,"Seitenteil hinten: Aufbordungshoehe hinten +10 -> 10 breiter",d);
 d=await diff("gepunktet",{aufHinten:105},"Seitenteil links");
 p(d[0]===0,"Gegenprobe: die Aufbordungshoehe hinten gehoert nicht ins Seitenteil",d);
 d=await diff("gepunktet",{randAbstand:20,randStrich:14},"Seitenteil hinten links");
 p(d[0]===7&&d[1]===5,"Seitenteil hinten: Abdeckkappe oben +5 / nach unten +2 -> 7 breiter, 5 laenger (gepunktet)",d);
 d=await diff("gefalzt",{breiteUnten:170},"Seitenteil hinten links");
 p(d[1]===10,"gefalzt: Breite unten (N) +10 -> Seitenteil hinten 10 laenger",d);
 d=await diff("gefalzt",{d:{l:305,r:305}},"Seitenteil hinten links");
 p(d[1]===10,"gefalzt: Mass R +10 -> Seitenteil hinten 10 laenger (N + R + S + T)",d);
 d=await diff("gepunktet",{d:{l:305,r:305}},"Seitenteil hinten links");
 p(d[1]===0,"Gegenprobe gepunktet: R aendert das Seitenteil hinten nicht",d);
 d=await diff("gefalzt",{a:{l:235,r:235}},"Seitenteil links");
 p(d[1]===10,"gefalzt: Mass C +10 -> Seitenteil 10 laenger (C + G + B)",d);
 d=await diff("gepunktet",{umschlagSeite:12},"Vorderteil");
 p(d[1]===4,"gepunktet: Umschlag Seite +2 -> Vorderteil 4 laenger (je Seite)",d);
 d=await diff("gepunktet",{f:{l:60,r:60}},"Seitenteil links");
 p(d[0]===10,"Seitenteil: Mass J +10 -> 10 breiter",d);

 // Getrennt erfasst: links und rechts duerfen verschieden sein.
 const getr=await page.evaluate(([bs])=>{
  dfaA=Object.assign(dfaLeer(),bs,{getrennt:true,ausfuehrung:"gefalzt",
   a:{l:225,r:245},b:{l:990,r:1000},f:{l:50,r:60},g:{l:50,r:50}});
  const z={}; dfaZuschnitte().forEach(x=>{z[x.name+" "+x.seite]=x.breite+" x "+x.laenge}); return z;
 },[KNICK]);
 p(getr["Seitenteil links"]==="190 x 1225"&&getr["Seitenteil rechts"]==="200 x 1255",
   "getrennt: links und rechts rechnen mit ihren eigenen Massen (990+225+10 / 1000+245+10)",getr);

 // ---- C · Speichern, oeffnen, umschalten --------------------------------------
 // Die Lehre aus v3.263: ein Feld, das gespeichert, aber nicht wieder gelesen
 // wird, geht beim Oeffnen verloren. Geprueft wird deshalb der ganze Weg.
 console.log("\nC · Speichern, wieder oeffnen, umschalten");
 const weg=await page.evaluate(([bs])=>{
  const r={};
  dfaA=Object.assign(dfaLeer(),bs,{ausfuehrung:"gepunktet"});
  const gepunktet=dfaDaten();
  r.gespeichert=gepunktet.ausfuehrung;
  r.zuschnitteGepunktet=gepunktet.zuschnitte.filter(x=>x.name==="Vorderteil").map(x=>x.breite+" x "+x.laenge)[0];
  // wieder oeffnen
  dfaFuellen(JSON.parse(JSON.stringify(gepunktet)));
  r.nachOeffnen=dfaA.ausfuehrung;
  // im Nachhinein auf gefalzt umschalten und erneut speichern
  dfaA.ausfuehrung="gefalzt";
  const gefalzt=dfaDaten();
  r.gefalztGespeichert=gefalzt.ausfuehrung;
  r.zuschnitteGefalzt=gefalzt.zuschnitte.filter(x=>x.name==="Vorderteil").map(x=>x.breite+" x "+x.laenge)[0];
  r.seitenteilHintenGefalzt=gefalzt.zuschnitte.filter(x=>x.name==="Seitenteil hinten").map(x=>x.breite+" x "+x.laenge)[0];
  dfaFuellen(JSON.parse(JSON.stringify(gefalzt)));
  r.nachZweitemOeffnen=dfaA.ausfuehrung;
  // ein aelterer Datensatz ohne das Feld
  const alt=JSON.parse(JSON.stringify(gepunktet)); delete alt.ausfuehrung;
  dfaFuellen(alt);
  r.ohneFeld=dfaA.ausfuehrung;
  // ein unbekannter Wert wird nicht uebernommen
  const kaputt=JSON.parse(JSON.stringify(gepunktet)); kaputt.ausfuehrung="blabla";
  dfaFuellen(kaputt);
  r.unbekannt=dfaA.ausfuehrung;
  // eine neue Aufnahme
  r.neu=dfaLeer().ausfuehrung;
  return r;
 },[KNICK]);
 p(weg.gespeichert==="gepunktet","die Ausfuehrung steht im gespeicherten Datensatz",weg);
 p(weg.nachOeffnen==="gepunktet","und kommt beim Oeffnen zurueck",weg);
 p(weg.gefalztGespeichert==="gefalzt"&&weg.nachZweitemOeffnen==="gefalzt",
   "im Nachhinein auf gefalzt umgeschaltet: gespeichert und wieder geoeffnet bleibt gefalzt",weg);
 p(weg.zuschnitteGepunktet==="280 x 774"&&weg.zuschnitteGefalzt==="280 x 564",
   "die gespeicherten Zuschnitte folgen dem Umschalten (774 -> 564)",weg);
 p(weg.seitenteilHintenGefalzt==="224 x 505","auch das Seitenteil hinten im Datensatz (505)",weg);
 p(weg.ohneFeld==="gepunktet","ein aelterer Datensatz ohne das Feld ist gepunktet - so wurde bisher gerechnet",weg);
 p(weg.unbekannt==="gepunktet","ein unbekannter Wert faellt auf gepunktet zurueck",weg);
 p(weg.neu==="gepunktet","eine neue Aufnahme beginnt mit gepunktet",weg);

 // ---- D · Der Umschalter ist zu sehen -----------------------------------------
 // Lehre aus v3.261: zwei gleich aussehende graue Knoepfe liest niemand als Wahl.
 console.log("\nD · Der Umschalter");
 const wahl=await page.evaluate(()=>{
  dfaA=dfaLeer();
  const box=document.createElement("div");
  box.style.cssText="width:400px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  const lies=()=>{
   box.innerHTML=dfaMasseHtml();
   return [...box.querySelectorAll("[data-dfa-ausfuehrung]")].map(x=>({
    wert:x.dataset.dfaAusfuehrung,text:x.textContent.trim(),
    farbe:getComputedStyle(x).backgroundColor}));
  };
  const vorher=lies();
  dfaA.ausfuehrung="gefalzt";
  const nachher=lies();
  box.remove();
  return {vorher,nachher};
 });
 p(wahl.vorher.length===2&&wahl.vorher.map(x=>x.wert).join()==="gepunktet,gefalzt",
   "es gibt zwei Knoepfe: gepunktet und gefalzt",wahl.vorher.map(x=>x.text));
 p(wahl.vorher.length===2&&wahl.vorher[0].farbe!==wahl.vorher[1].farbe,
   "gepunktet gewaehlt: die beiden Knoepfe sehen VERSCHIEDEN aus",wahl.vorher);
 p(wahl.nachher.length===2&&wahl.nachher[0].farbe!==wahl.nachher[1].farbe
   &&wahl.nachher[1].farbe===wahl.vorher[0].farbe,
   "gefalzt gewaehlt: die Hervorhebung wandert auf den anderen Knopf",{v:wahl.vorher,n:wahl.nachher});

 // Der Klick selbst: in der echten Oberflaeche. Gerendert wird die Aufnahme in
 // ihren Behaelter "dfaAufnahme", gedrueckt wird der Knopf wie vom Anwender.
 const klick=await page.evaluate(async()=>{
  let ziel=document.getElementById("dfaAufnahme");
  if(!ziel){ziel=document.createElement("div");ziel.id="dfaAufnahme";document.body.appendChild(ziel)}
  ziel.style.cssText="position:fixed;left:0;top:0;width:400px;background:#fff;z-index:99999";
  dfaA=dfaLeer(); dfaSchritt=2;
  renderDfaAufnahme();
  const knopf=w=>document.querySelector('#dfaAufnahme [data-dfa-ausfuehrung="'+w+'"]');
  const r={vorher:dfaA.ausfuehrung,knopfDa:!!knopf("gefalzt")};
  if(knopf("gefalzt"))knopf("gefalzt").click();
  r.nachKlick=dfaA.ausfuehrung;
  r.gefalztMarkiert=!!(knopf("gefalzt")&&knopf("gefalzt").classList.contains("blue"));
  r.gepunktetGrau=!!(knopf("gepunktet")&&knopf("gepunktet").classList.contains("gray"));
  if(knopf("gepunktet"))knopf("gepunktet").click();
  r.zurueck=dfaA.ausfuehrung;
  ziel.remove();
  return r;
 });
 p(klick.knopfDa&&klick.vorher==="gepunktet","der Knopf \"gefalzt\" steht im Register Fenstermasse",klick);
 p(klick.nachKlick==="gefalzt","ein Klick darauf schaltet auf gefalzt um",klick);
 p(klick.gefalztMarkiert&&klick.gepunktetGrau,"und die Anzeige folgt: gefalzt blau, gepunktet grau",klick);
 p(klick.zurueck==="gepunktet","zurueckschalten geht ebenso",klick);

 // ---- E · Der Ausdruck nennt die Ausfuehrung -----------------------------------
 console.log("\nE · Der Ausdruck");
 const druck=await page.evaluate(async bs=>{
  const raus={};
  pdfDruckVorbereiten=async html=>{window.__b=html;return null};
  measurementMaterials=[{id:2,name:"Titanzink"}];
  for(const art of ["gepunktet","gefalzt",null]){
   dfaA=Object.assign(dfaLeer(),bs,{ausfuehrung:art||"gepunktet"});
   const daten=JSON.parse(JSON.stringify(dfaDaten()));
   if(art===null)delete daten.ausfuehrung;
   window.__b=null;
   try{await printMeasurement({id:1,type:"dachfenstereinfassung",data:daten,title:"x",note:""},{})}catch(e){}
   const box=document.createElement("div"); box.innerHTML=window.__b||"";
   const l=[...box.querySelectorAll("label")].find(x=>x.textContent.trim()==="Ausführung");
   raus[art||"ohne"]=l?l.parentElement.querySelector(".val").textContent.trim():null;
  }
  return raus;
 },KNICK);
 p(/^gepunktet/.test(druck.gepunktet||""),"der Ausdruck nennt: gepunktet",druck);
 p(/^gefalzt/.test(druck.gefalzt||""),"der Ausdruck nennt: gefalzt",druck);
 p(druck.ohne===null,"Gegenprobe: ein alter Datensatz ohne das Feld bekommt keine erfundene Ausfuehrung",druck);

 console.log("\nF · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();
