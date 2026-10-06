// Prueft die Anzahl Bleilappen bei der Dachfenstereinfassung (v3.262).
//
// Gemeldet vom Anwender am 6.10.2026, mit Foto der Aufnahme:
//   "wiso ergibt ein dachfenster mit diesen massen 6 bleilappen? Es sollten
//    8 sein bei einem lattenabstand von 355"
//
// Die App rechnete bis dahin je ZUSCHNITT und AUFGERUNDET: 990 mm Seiten-
// laenge / 355 = 2,79 -> 3 je Seite -> 6. Das zaehlte die Teilung am Knick
// mit und traf die Lattung nicht.
//
// Die Regel des Betriebs (woertlich erfragt):
//   "Beim dachfenster gibt es (mit knick, durchgehend) ein vorderteil,
//    bestehend aus mass C + G und ein hinterteil bestehend aus mass N + R"
//   "... beide abgerundet und dann mal zwei (fuer linke und rechte seite)"
//
// Also je Seite: abgerundet(Vorderteil / Lattenabstand)
//              + abgerundet(Hinterteil / Lattenabstand),
// und das fuer links und rechts.
//
// Die Masse des gemeldeten Falls: C = 225, G = 990, N = 160, R = 295,
// Lattenabstand 355. Vorne 1215 -> 3, hinten 455 -> 1, je Seite 4, gesamt 8.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

// Genau die Masse aus dem Foto des Anwenders.
const FALL={seitenteilArt:"separat",getrennt:false,lattenabstand:355,
 a:{l:225,r:225}, b:{l:990,r:990}, c:{l:"",r:""}, d:{l:295,r:295},
 f:{l:50,r:50}, g:{l:50,r:50}, ueberlappung:"", saumVorne:35,
 aufVorne:80, aufHinten:95, breiteOben:120, breiteUnten:160,
 randAbstand:15, randStrich:12, e:35, eUmschlag:15, anreiff:15, anreiffUmschlag:10,
 umschlagVorne:20, umschlagSeite:20, breiteVorne:800, breiteHinten:800};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof dfaBleilappen==="function");

 const rechne=(zusatz)=>page.evaluate(([f,z])=>{
  dfaA=Object.assign(dfaLeer(),f,z||{});
  const bl=dfaBleilappen();
  return {gesamt:bl.gesamt,lattenabstand:bl.lattenabstand,
          zeilen:bl.zeilen.map(x=>({name:x.name,laenge:x.laenge,anzahl:x.anzahl})),
          laenge:dfaLaenge("l")};
 },[FALL,zusatz]);

 console.log("\nA · Der gemeldete Fall ergibt 8");
 const a=await rechne(null);
 p(a.gesamt===8,"990 mm Seitenlaenge bei 355 mm Lattenabstand ergibt 8 Bleilappen",a);
 p(a.zeilen.length===4,"vier Zeilen: Vorder- und Hinterteil je Seite",a.zeilen.map(z=>z.name));
 const vorne=a.zeilen.filter(z=>/^Vorderteil/.test(z.name));
 const hinten=a.zeilen.filter(z=>/^Hinterteil/.test(z.name));
 p(vorne.every(z=>z.laenge===1215),"Vorderteil ist C + Seitenlaenge = 225 + 990 = 1215",vorne);
 p(hinten.every(z=>z.laenge===455),"Hinterteil ist N + R = 160 + 295 = 455",hinten);
 p(vorne.every(z=>z.anzahl===3),"Vorderteil: 1215 / 355 = 3,42 ABGERUNDET auf 3",vorne);
 p(hinten.every(z=>z.anzahl===1),"Hinterteil: 455 / 355 = 1,28 ABGERUNDET auf 1",hinten);

 // ---- B · Gegenproben ----------------------------------------------------
 // Ohne sie wuerde der Pruefstand auch eine Funktion bestehen lassen, die
 // stur 8 zurueckgibt.
 console.log("\nB · Gegenproben");
 const dopp=await rechne({lattenabstand:178});     // halber Abstand
 p(dopp.gesamt>a.gesamt,"halber Lattenabstand ergibt MEHR Lappen",{vorher:a.gesamt,jetzt:dopp.gesamt});
 const weit=await rechne({lattenabstand:2000});    // groesser als jede Strecke
 p(weit.gesamt===0,"Lattenabstand groesser als beide Strecken ergibt 0 - abgerundet heisst abgerundet",weit);
 const ohne=await rechne({lattenabstand:""});
 p(ohne.gesamt===null,"ohne Lattenabstand bleibt die Zahl offen (null), statt eine erfundene zu nennen",ohne);
 // Aufgerundet waere es 4 + 2 = 6 je Seite... also 12 gesamt; die alte Regel
 // (je Zuschnitt, aufgerundet) ergab 6. Beide duerfen nicht herauskommen.
 p(a.gesamt!==6,"die alte Zahl 6 kommt nicht mehr heraus",a.gesamt);
 p(a.gesamt!==12,"und auch nicht die aufgerundete Variante 12",a.gesamt);

 // ---- C · Beide Bauarten, dieselbe Strecke -------------------------------
 // Mit Knick ist G die ganze Laenge; mit zwei Seitenteilen ist sie
 // G + I - Ueberlappung. Gerechnet wird mit der Seitenlaenge, nicht mit G -
 // sonst waere der Wert bei zwei Teilen zu klein.
 console.log("\nC · Dieselbe Strecke in beiden Bauarten");
 const knick=await rechne({seitenteilArt:"knick",b:{l:990,r:990},c:{l:"",r:""},ueberlappung:""});
 p(knick.laenge===990&&knick.gesamt===8,"durchgehend mit Knick: 990 mm, 8 Lappen",knick);
 const zwei=await rechne({seitenteilArt:"separat",b:{l:600,r:600},c:{l:500,r:500},ueberlappung:110});
 p(zwei.laenge===990,"zwei Seitenteile mit 600 + 500 - 110 ergeben dieselben 990 mm",zwei);
 p(zwei.gesamt===8,"und damit dieselben 8 Lappen - nicht weniger, weil G kleiner ist",zwei);

 console.log("\nD · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();
