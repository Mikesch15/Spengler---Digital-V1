// Prueft v3.293 (Ansage: "Auf dem Rüstblatt müssen wirklich alle für die Produktion nötigen
// Masse vorhanden sein, es darf kein zusätzlicher Klick brauchen"):
// dieselbe Regel wie pruefstand-blatt-vollstaendig-v3-262 (PDF), jetzt am RUESTBLATT -
// jedes gespeicherte Mass jeder Art steht im fertigen Blatt (rbBlattHtml), ohne Klick.
// Die Ausnahmen sind dieselben wie dort, jede mit Grund.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

// Werte, die bewusst NICHT in ihrer gespeicherten Form auf dem Blatt stehen.
const AUSNAHMEN=[
 {type:"kamineinfassung",pfad:"winkelVorne",
  grund:"wird umgerechnet gedruckt: Datensaetze bis v2.94 trugen die Neigung vom Senkrechten, das Blatt zeigt den Innenwinkel Dach/Wand (90 + Wert)"},
 {type:"kamineinfassung",pfad:"winkelHinten",
  grund:"dasselbe, hinten (90 - Wert)"},
 {type:"einfassung_rund",pfad:"winkel",
  grund:"gespeichert ist die Dachneigung, gedruckt der Innenwinkel Dach/Rohr (Wert + 90)"},
 {type:"anschlussblech",pfad:"lattenabstand",
  grund:"Bleilappen gibt es nur bei der Art 'bleilappen' (js/20); bei jeder anderen Art waere ein Lattenabstand auf dem Blatt Rauschen"},
 {type:"anschlussblech",pfad:"restSchwelle",
  grund:"Einstellwert (ab welcher Laenge ein Rest aufgehoben wird), kein Mass dieser Aufnahme"},
 {type:"rinne",pfad:"ansetz.gehrung",
  grund:"Einstellwert (Zugabe bei Gehrung), geht in die Zuschnittlaenge ein - die steht auf dem Blatt"}
];
// Zweige, die als Tabelle/Zeichnung aufs Blatt kommen und nicht Wert fuer
// Wert durchsucht werden.
const NICHT_FLACH=["zuschnitte","bleilappen","ausmass","kontrolle","rollen","pieces",
 "stuecke","segmente","profil","varMasse","material"];


(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof rbBlattHtml==="function"&&typeof measPdfAufbau==="function");

 console.log("\nA · Jedes gespeicherte Mass steht auf dem Rüstblatt");
 const aus=await page.evaluate(async ([faelle,nichtFlach])=>{
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  const ergebnis=[];
  for(const [name,type,data] of faelle){
   const m={id:1,type,data,title:name,note:""};
   let html="";
   try{ html=rbBlattHtml(m,{kopf:true}); }catch(e){}
   const box=document.createElement("div"); box.innerHTML=html;
   const masse=box.querySelector(".rb-masse");
   const text=html.replace(/<[^>]*>/g," ").replace(/&[a-z]+;/g," ")
     .replace(/[’'  ](?=\d)/g,"").replace(/,(?=\d)/g,".").replace(/\s+/g," ");
   const werte=[];
   const sammle=(o,pfad)=>{
    if(o===null||o===undefined)return;
    if(typeof o==="number"||(typeof o==="string"&&o!==""&&!isNaN(Number(o)))){
     const roh=Number(o);
     if(roh>0)werte.push({pfad,z:Math.round(roh),roh});
     return;
    }
    if(Array.isArray(o))return;
    if(typeof o==="object")Object.keys(o).forEach(k=>sammle(o[k],pfad?pfad+"."+k:k));
   };
   Object.keys(data).forEach(k=>{ if(!nichtFlach.includes(k))sammle(data[k],k) });
   const da=w=>[String(w.z),String(w.roh)].some(t=>
     new RegExp("(^|[^0-9.])"+t.replace(".","\\.")+"([^0-9]|$)").test(text));
   ergebnis.push({name,type,blatt:!!html,masseBlock:!!masse,geprueft:werte.length,
     fehlt:werte.filter(w=>!da(w)).map(w=>w.pfad)});
  }
  return ergebnis;
 },[FAELLE,NICHT_FLACH]);

 const erlaubt=(type,pfad)=>AUSNAHMEN.some(a=>a.type===type&&a.pfad===pfad);
 aus.forEach(z=>{
  p(z.blatt,z.name+": es wird ein Rüstblatt erzeugt");
  const echt=[...new Set(z.fehlt.filter(f=>!erlaubt(z.type,f)))];
  p(echt.length===0,z.name+": jedes gespeicherte Mass steht auf dem Rüstblatt ("+z.geprueft+" geprueft)",echt);
 });
 p(aus.filter(z=>z.type!=="skizze_foto").every(z=>z.masseBlock),
   "Alle Fachaarten haben den Block 'Masse und Angaben' auf dem Blatt",aus.filter(z=>!z.masseBlock).map(z=>z.type));

 console.log("\nB · Der Block kommt aus dem PDF-Aufbau - kein Klick, keine zweite Zusammenstellung");
 const b2=await page.evaluate(async faelle=>{
  const raus=[];
  for(const [name,type,data] of faelle){
   const m={id:1,type,data,title:name,note:""};
   const r=measPdfAufbau(m,{logoSrc:"",medienHtml:"",photoSrcs:[],sketchSrcs:[]});
   const blatt=document.createElement("div"); blatt.innerHTML=rbBlattHtml(m,{kopf:true});
   // Jede Beschriftung der Angaben-Tabelle des PDF steht auch im Rüstblatt
   const box=document.createElement("div"); box.innerHTML=r.koerper;
   const angaben=[...box.querySelectorAll(".eb-info-table label")].map(l=>l.textContent.trim());
   const imBlatt=[...blatt.querySelectorAll(".rb-masse label")].map(l=>l.textContent.trim());
   raus.push({type,fehlt:angaben.filter(a=>imBlatt.indexOf(a)<0),n:angaben.length,
     klickKnoepfe:blatt.querySelectorAll(".rb-masse button,.rb-masse [data-rb-gross]").length});
  }
  return raus;
 },FAELLE);
 b2.forEach(z=>p(z.fehlt.length===0&&z.klickKnoepfe===0,z.type+": alle "+z.n+" Beschriftungen der PDF-Angaben stehen im Rüstblatt, ohne Knopf",z));

 console.log("\nC · Gegenprobe: das PDF bleibt unveraendert zusammengesetzt");
 const pdf=await page.evaluate(async faelle=>{
  pdfDruckVorbereiten=async(html)=>{window.__blatt=html;return null};
  const raus=[];
  for(const [name,type,data] of faelle){
   window.__blatt=null;
   try{ await printMeasurement({id:1,type,data,title:name,note:""},{}); }catch(e){}
   const r=measPdfAufbau({id:1,type,data,title:name,note:""},{logoSrc:"",medienHtml:"",photoSrcs:[],sketchSrcs:[]});
   raus.push({type,gleich:!!window.__blatt&&window.__blatt.replace(/<img[^>]*>/g,"")===r.bodyHtml.replace(/<img[^>]*>/g,"")});
  }
  return raus;
 },FAELLE);
 p(pdf.every(x=>x.gleich),"printMeasurement druckt genau den Aufbau, den auch das Rüstblatt nutzt (alle Arten)",pdf.filter(x=>!x.gleich).map(x=>x.type));
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
