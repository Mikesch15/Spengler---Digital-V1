// Prueft, dass der Ausdruck der Einfassung rund ALLE Schnitte zeigt (v3.265).
//
// Ansage des Anwenders am 7.10.2026: "Im pdf von einfassung rund, soll bei
// mehreren einfassungen alle schnitte angezeigt werden (groesse 4 stk pro a4
// seite)".
//
// Bis v3.264 stand genau EIN Schnitt im Blatt. Der Grund steckt im
// Datenformat: seit v2.96 liegen die Einfassungen in d.einfassungen, der
// Datensatz spiegelt die erste aber zusaetzlich auf oberster Ebene - und
// genau die zeichnete rsSvg(m,"Schnitt"). Die zweite, dritte ... tauchten
// nirgends auf.
//
// Geprueft wird am ECHTEN Blatt (der Lauf haengt sich an
// pdfDruckVorbereiten), nicht am Quelltext.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
const NEU=FAELLE.find(f=>/v2\.96/.test(f[0]))[2];      // mit d.einfassungen
const ALT=FAELLE.find(f=>/bis v2\.95/.test(f[0]))[2];  // ohne, altes Format

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof printMeasurement==="function");

 const messen=(vorlage,anzahl)=>page.evaluate(async ([fall,n])=>{
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  pdfDruckVorbereiten=async(html)=>{window.__b=html; return null};
  const d=JSON.parse(JSON.stringify(fall));
  if(n!==null){
   const muster=d.einfassungen[0];
   d.einfassungen=[];
   for(let i=0;i<n;i++)d.einfassungen.push(Object.assign({},muster,
     // v3.267: auch der Winkel wird je Einfassung variiert - jeder Schnitt
     // muss SEINEN Winkel zeigen, nicht den der ersten.
     {bez:"Nr."+(i+1), durchmesser:100+i*10, winkel:20+i*10}));
  }
  const m={id:1,type:"einfassung_rund",data:d,title:"Mehrere",note:""};
  window.__b=null;
  try{ await printMeasurement(m,{}); }catch(e){}
  const html=window.__b||"";
  const box=document.createElement("div"); box.innerHTML=html;
  const svgs=[...box.querySelectorAll(".eb-diagram-gitter svg")];
  return {
   skizzen:(typeof rsSkizzen==="function"?rsSkizzen(m).map(x=>x.titel):[]),
   svgImGitter:svgs.length,
   // Jede Zeichnung muss ANDERS sein - sonst waere viermal dieselbe gedruckt.
   verschieden:new Set(svgs.map(s=>s.outerHTML)).size,
   gitter:box.querySelectorAll(".eb-diagram-gitter").length,
   neueSeite:box.querySelectorAll(".eb-gitter-neue-seite").length,
   titel:[...box.querySelectorAll(".eb-diagram-gitter .eb-diagram-title")].map(t=>t.textContent.trim()),
   svgText:svgs.map(x=>[...x.querySelectorAll("text")].map(t=>t.textContent.trim())),
   bogen:svgs.map(x=>x.querySelectorAll('path[d*="A "]').length),
   lattenabstand:d.lattenabstand,
   abschnitte:[...box.querySelectorAll(".eb-section-head")].map(h=>h.textContent.trim()),
   beschriftungen:[...box.querySelectorAll(".eb-info-table label")].map(t=>t.textContent.trim()),
   // Woertlich stehengebliebene HTML-Entitaeten irgendwo im Blatt.
   entitaeten:(box.textContent.match(/&[A-Za-z]{2,10};/g)||[]),
   ueberschrift:[...box.querySelectorAll(".eb-section-head")].map(h=>h.textContent.trim())
     .filter(t=>/^Schnitte?$/.test(t))[0]||"-"
  };
 },[vorlage,anzahl]);

 console.log("\nA · Jede Einfassung bekommt ihren Schnitt");
 const a1=await messen(NEU,1), a2=await messen(NEU,2), a5=await messen(NEU,5);
 p(a1.svgImGitter===1,"eine Einfassung: ein Schnitt im Blatt",a1);
 p(a2.svgImGitter===2,"zwei Einfassungen: zwei Schnitte",a2);
 p(a5.svgImGitter===5,"fuenf Einfassungen: fuenf Schnitte",a5);
 p(a5.skizzen.length===5,"rsSkizzen liefert fuenf Eintraege - der Ausdruck baut nichts nach",a5.skizzen);
 p(a5.skizzen[0]==="Schnitt",
   'der erste heisst weiterhin "Schnitt" - die Ruestansicht findet ihn darunter',a5.skizzen);
 // Gegenprobe: ohne sie wuerde auch fuenfmal DIESELBE Zeichnung bestehen.
 p(a5.verschieden===5,"und alle fuenf sind verschieden, nicht fuenfmal dieselbe",a5.verschieden);

 console.log("\nB · Vier je A4-Seite");
 const a4=await messen(NEU,4), a6=await messen(NEU,6);
 p(a4.gitter===1&&a4.neueSeite===0,"vier passen in EIN Raster, ohne Seitenumbruch",a4);
 p(a6.gitter===2&&a6.neueSeite===1,"sechs ergeben zwei Raster, das zweite auf neuer Seite",a6);
 p(a5.gitter===2&&a5.neueSeite===1,"fuenf ebenso: vier und einer",a5);

 console.log("\nC · Beschriftung und Ueberschrift");
 p(a4.titel.length===4&&/^Nr\.1 · Ø 100 mm$/.test(a4.titel[0]),
   "jeder Schnitt traegt Bezeichnung und Durchmesser",a4.titel);
 p(a1.titel.length===0,"bei nur einer Einfassung steht kein ueberfluessiger Titel",a1.titel);
 p(a1.ueberschrift==="Schnitt"&&a4.ueberschrift==="Schnitte",
   'die Ueberschrift ist Einzahl bei einem, Mehrzahl bei mehreren',{a1:a1.ueberschrift,a4:a4.ueberschrift});

 console.log("\nD · Das alte Format (bis v2.95) bleibt, wie es war");
 const alt=await messen(ALT,null);
 p(alt.svgImGitter===1,"ohne d.einfassungen wird genau ein Schnitt gezeichnet",alt);
 p(alt.skizzen.length===1&&alt.skizzen[0]==="Schnitt","und er heisst Schnitt",alt.skizzen);

 console.log("\nF · Winkel und Lattenabstand stehen im Schnitt (v3.267)");
 // Ansage des Anwenders am 8.10.2026: "im schnitt muss der winkel des rohres
 // auch dargestellt werden und der lattenabstand auch zu jedem schnitt ... die
 // masse unter den schnittskizzen sind nicht noetig".
 // Beides stand bisher nur EINMAL in den Angaben des Blattes - und zwar mit
 // den Werten der ersten Einfassung, obwohl Durchmesser und Winkel je
 // Einfassung erfasst werden.
 const f3=await messen(NEU,3);
 const winkelText=f3.svgText.map(t=>t.filter(x=>/^Dach\/Rohr /.test(x))[0]||"-");
 p(winkelText.every(t=>/^Dach\/Rohr \d+°$/.test(t)),
   "jeder Schnitt nennt den Winkel Dach/Rohr",winkelText);
 // Gezeichnet wird der Innenwinkel = Dachneigung + 90, wie ihn auch das Blatt
 // nennt. Die Faelle tragen 20°, 30°, 40° -> 110°, 120°, 130°.
 p(winkelText.join("|")==="Dach/Rohr 110°|Dach/Rohr 120°|Dach/Rohr 130°",
   "und zwar SEINEN Winkel (Dachneigung + 90), nicht den der ersten Einfassung",winkelText);
 p(f3.bogen.every(n=>n>=1),
   "zum Winkel gehoert ein Bogen in der Zeichnung, nicht nur eine Zahl",f3.bogen);
 const latten=f3.svgText.map(t=>t.filter(x=>/^Lattenabstand /.test(x))[0]||"-");
 p(latten.every(t=>t==="Lattenabstand "+Math.round(f3.lattenabstand)+" mm"),
   "jeder Schnitt nennt den Lattenabstand",{latten,wert:f3.lattenabstand});
 // Gegenprobe: a, b und c stehen weiterhin IN der Zeichnung - sonst waere mit
 // der Tabelle darunter die einzige Quelle dieser Masse verschwunden.
 const abc=f3.svgText.map(t=>["a","b","c"].every(k=>t.some(x=>x.indexOf(k+" = ")===0)));
 p(abc.every(Boolean),"a, b und c stehen weiterhin in jeder Zeichnung",f3.svgText[0]);
 p(f3.abschnitte.indexOf("Masse")<0,
   'die Tabelle "Masse" unter den Schnitten ist weg',f3.abschnitte);
 // Gegenprobe zur Loeschung: die Stueckliste je Einfassung bleibt - sie ist
 // das, was in der Werkstatt gebraucht wird.
 p(f3.abschnitte.indexOf("Stückliste")>=0,
   "Gegenprobe: die Stueckliste je Einfassung steht weiterhin im Blatt",f3.abschnitte);
 // Gegenprobe: ohne Lattenabstand steht dort nichts - keine erfundene Zahl.
 const ohne=await page.evaluate(()=>typeof einfZeichnung==="function"
   ? einfZeichnung({durchmesser:110,winkel:30,a:150,b:200,c:60,lattenabstand:0}) : "");
 p(ohne.indexOf("Lattenabstand")<0,
   "Gegenprobe: ohne Lattenabstand steht keine erfundene Zahl im Schnitt",
   ohne.slice(0,80));
 // v3.267, am erzeugten A4-PDF gesehen: in den Angaben stand woertlich
 // "&OSLASH; STANDROHR". Die Beschriftung lief als Entitaet "&Oslash;" in
 // cell(), und cell() schickt sie durch esc() - escapet wurde also das
 // kaufmaennische Und. Geprueft wird beides: die Zeile selbst und, als
 // Gegenprobe gegen dieselbe Falle anderswo, dass im ganzen Blatt keine
 // Entitaet woertlich stehenbleibt.
 p(f3.beschriftungen.indexOf("Ø Standrohr")>=0,
   "die Angaben nennen den Durchmesser mit dem Zeichen Ø",f3.beschriftungen);
 p(f3.entitaeten.length===0,
   "nirgends im Blatt steht eine HTML-Entitaet woertlich",f3.entitaeten);

 console.log("\nE · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();
