// Prueft v3.296 (Ansage: "Ja, alle Angaben kürzen, so dass nirgends Masse doppelt stehen"):
// Was Zeichnung oder Zuschnittliste auf dem Ruestblatt schon zeigen, steht nicht noch einmal in den
// Angaben. Gegenproben: Werte, die sonst nirgends stehen, bleiben; die Mass-Vollstaendigkeit (293)
// gilt weiter; der Monteur (ohne Zuschnittliste) behaelt, was dort sonst stuende.
const KURZ=["dachfenstereinfassung","kamineinfassung"];
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page); await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof rbBlattHtml==="function"&&typeof rbDoppelt==="function");
 const r=await page.evaluate(async ([faelle,kurz])=>{
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  const o={doppelt:[],art:[]};
  // A: jede Art - keine Angabe auf dem Blatt, deren Zahlen schon in der Zeichnung stehen
  for(const [name,type,data] of faelle){
   if(kurz.includes(type))continue;
   const m={id:1,type,data,title:name,note:""};
   const box=document.createElement("div"); box.innerHTML=rbBlattHtml(m,{kopf:true});
   const skiz=document.createElement("div"); skiz.innerHTML=rbSkizzenHtml(m);
   const bek=rbBekannteZahlen(skiz.innerHTML);
   const dopp=[...box.querySelectorAll(".rb-masse .eb-info-table td")].map(td=>({l:td.querySelector("label"),v:td.querySelector(".val")}))
    .filter(z=>z.l&&z.v&&rbDoppelt(z.v.textContent,bek)).map(z=>name+": "+z.l.textContent+"="+z.v.textContent);
   o.doppelt.push(...dopp);
  }
  // B: Einlaufblech mit Plan: Abwicklung steht in der Zuschnittliste -> nicht in den Angaben
  const plan={abwicklung:300,abschnitte:1,abschnittLaenge:2500,jeAbschnitt:1,optimal:true,streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:1300}]}]};
  const m={id:1,type:"einlaufblech_gerade",title:"T",data:{abwicklung:300,gesamtlaenge:5000,material:2,rollen:plan},note:""};
  const lab=h=>{const d=document.createElement("div");d.innerHTML=h;return [...d.querySelectorAll(".rb-masse label")].map(l=>l.textContent.trim())};
  o.B={voll:lab(rbBlattHtml(m,{kopf:true})),monteur:lab(rbBlattHtml(m,{ausfuehrung:"montieren"})),rueste:lab(rbBlattHtml(m,{ausfuehrung:"ruesten"}))};
  return o;
 },[FAELLE,KURZ]);
 p(r.doppelt.length===0,"A keine Angabe wiederholt, was die Zeichnung schon zeigt (alle Arten)",r.doppelt);
 p(!r.B.voll.includes("Abwicklung"),"B 'Abwicklung' steht nur in der Zuschnittliste, nicht noch in den Angaben",r.B.voll);
 p(r.B.voll.includes("Gesamtlänge")&&r.B.voll.includes("Montage"),"Gegenprobe: Gesamtlänge und Montage (nirgends sonst) bleiben",r.B.voll);
 p(r.B.monteur.includes("Abwicklung"),"Gegenprobe: der Monteur sieht keine Zuschnittliste - dort bleibt die Abwicklung in den Angaben",r.B.monteur);
 p(r.B.rueste.length===r.B.voll.length,"Rüsten-Ansicht und Blatt in der Liste zeigen dasselbe",[r.B.rueste,r.B.voll]);
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();
