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
     {bez:"Nr."+(i+1), durchmesser:100+i*10}));
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

 console.log("\nE · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();
