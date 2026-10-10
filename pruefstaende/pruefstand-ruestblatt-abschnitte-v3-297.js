// Prueft v3.297 (Ansage: "Welches Stueck aus welchem Abschnitt ist so noch nicht ideal, das sollte auch in
// der abhakbaren Liste stehen und nicht in einer separaten Liste"; davor v3.295: "wenn mehrere Streifen
// ab der Rolle abgeschnitten werden, muss ich wissen, welche Stuecke aus welchen Abschnitten kommen"):
// die abhakbare Zuschnittliste des Ruestblatts nennt je Stueck Abschnitt/Streifen bzw. Stange; es gibt
// KEINE zweite Liste daneben. Gegenproben: ein einziger Streifen = nichts; Material-Seite unveraendert.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
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
 await page.waitForFunction(()=>typeof rbBlattHtml==="function"&&typeof zuHerkunftNoetig==="function");
 const r=await page.evaluate(()=>{
  measurementMaterials=[{id:2,name:"Titanzink"}];
  window.zeAbhakenMoeglich=()=>true;   // Abhaken eingeschaltet (Untermodul "zuschnitt")
  const lies=box=>[...box.querySelectorAll(".zu-pos-herkunft")].map(e=>({k:e.querySelector(".zu-pos-marke").textContent.trim(),
    nr:[...e.querySelectorAll(".zu-nr")].map(n=>n.textContent.replace(/[^0-9]/g,"")),hak:e.querySelectorAll("button.zu-nr-hak").length}))
    .sort((a,b)=>Number(a.nr[0])-Number(b.nr[0]));
  const blatt=(rollen)=>{const m={id:1,type:"einlaufblech_gerade",title:"T",data:{abwicklung:300,gesamtlaenge:5000,material:2,rollen},note:""};
   const box=document.createElement("div"); box.innerHTML=rbBlattHtml(m,{kopf:true});
   return {z:lies(box),alt:!!box.querySelector(".zu-belegung-kurz,.zu-bel-kopf"),kopf:box.textContent.indexOf("Welches Stück aus")>=0,
     ohne:box.querySelectorAll(".zu-pos:not(.zu-pos-herkunft)").length};};
  const o={};
  const A={abwicklung:300,abschnitte:2,abschnittLaenge:2500,jeAbschnitt:2,optimal:true,streifen:[
   {rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:1300}]},{rest:100,stuecke:[{nr:3,laenge:2400}]},
   {rest:0,stuecke:[{nr:4,laenge:2500}]},{rest:600,stuecke:[{nr:5,laenge:1900}]}]};
  o.A=blatt(A);
  const B={abwicklung:300,optimal:true,streifen:[
   {abschnittNr:1,abschnittLaenge:3000,rest:0,stuecke:[{nr:1,laenge:3000}]},
   {abschnittNr:2,abschnittLaenge:1800,rest:0,stuecke:[{nr:2,laenge:1000},{nr:3,laenge:800}]},
   {abschnittNr:2,abschnittLaenge:1800,rest:800,stuecke:[{nr:4,laenge:1000}]}]};
  o.B=blatt(B);
  // gleiche Laenge aus zwei Streifen: EINE Zeile "2 ×", zwei Herkunftszeilen
  o.G=blatt({abwicklung:300,abschnitte:1,abschnittLaenge:2000,jeAbschnitt:2,optimal:true,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]},{rest:0,stuecke:[{nr:2,laenge:2000}]}]});
  o.C=blatt({abwicklung:300,abschnitte:1,abschnittLaenge:2500,jeAbschnitt:1,optimal:true,streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:1300}]}]});
  // H: der Fall vom Handy - vier Streifenbreiten, zwei Abschnitte (1215 und 595 ab Rolle):
  // 250er (Nr 3,5) fahren im 1215er, 244er (Nr 4,6) fahren dort mit; 507er (Nr 2) ist der 595er,
  // 325er (Nr 1) faehrt dort mit. Jede Gruppe zaehlt ihre eigenen "Abschnitte" - das war falsch.
  o.H=blatt({abwicklung:250,optimal:true,streifen:[],
   gruppen:[
    {breite:250,abschnitte:1,abschnittLaenge:1215,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:3,laenge:1215}]},{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:5,laenge:1215}]}]},
    {breite:507,abschnitte:1,abschnittLaenge:595,jeAbschnitt:1,streifen:[{rest:0,stuecke:[{nr:2,laenge:595}]}]},
    {breite:325,abschnitte:0,abschnittLaenge:564,jeAbschnitt:3,streifen:[{abschnittNr:1,abschnittLaenge:595,mischungsGast:true,rest:31,stuecke:[{nr:1,laenge:564}]}]},
    {breite:244,abschnitte:0,abschnittLaenge:510,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,mischungsGast:true,rest:705,stuecke:[{nr:4,laenge:510}]},{abschnittNr:1,abschnittLaenge:1215,mischungsGast:true,rest:705,stuecke:[{nr:6,laenge:510}]}]}]});
  const stange=(n)=>({art:"stange",einheit:"Stück",breite:0,stangen:n,zuLang:[],optimal:true,erledigtFuer:1});
  const st2=stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:3000},{nr:2,laenge:3000}]},{laenge:5000,rest:500,stuecke:[{nr:3,laenge:4500}]}]);
  const d=document.createElement("div"); d.innerHTML=zuListeHtml(st2,{herkunft:true}); o.D=lies(d);
  const d1=document.createElement("div"); d1.innerHTML=zuListeHtml(stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:6000}]}]),{herkunft:true}); o.D1=lies(d1);
  // ohne opt.herkunft (Material-Seite, Werkstatt-Liste) bleibt die Liste wie bisher
  const pa=zuPlanAusGespeichert(A,300,"Stück");
  const n=document.createElement("div"); n.innerHTML=zuListeHtml(pa); o.N=n.querySelectorAll(".zu-pos-herkunft").length;
  const titel=h=>{const x=document.createElement("div");x.innerHTML=h;return [...x.querySelectorAll(".zu-platz-kopf b")].map(y=>y.textContent.trim())};
  o.F=titel(zuBelegungHtml(pa));
  return o;
 });
 const kv=l=>JSON.stringify(l.map(x=>[x.k,x.nr]));
 p(kv(r.A.z)===JSON.stringify([["Abschnitt 1 · Streifen 1",["1"]],["Abschnitt 1 · Streifen 1",["2"]],["Abschnitt 1 · Streifen 2",["3"]],["Abschnitt 2 · Streifen 1",["4"]],["Abschnitt 2 · Streifen 2",["5"]]]),
   "A mehrere Abschnitte: jedes Stück der abhakbaren Liste nennt seinen Abschnitt und Streifen",r.A.z);
 p(r.A.z.every(x=>x.hak===x.nr.length&&x.hak>0),"die Nummern bleiben abhakbare Knöpfe",r.A.z);
 p(r.A.alt===false&&!r.A.kopf,"KEINE separate Liste 'Welches Stück aus welchem Abschnitt' mehr",r.A);
 p(r.A.ohne===0,"Es gibt keine zweite Nummernreihe ohne Herkunft",r.A.ohne);
 p(kv(r.B.z)===JSON.stringify([["Abschnitt 1 · Streifen 1",["1"]],["Abschnitt 2 · Streifen 1",["2"]],["Abschnitt 2 · Streifen 1",["3"]],["Abschnitt 2 · Streifen 2",["4"]]]),
   "B mehrere Abschnittlängen: die Abschnittnummer des Streifens gilt",r.B.z);
 p(kv(r.G.z)===JSON.stringify([["Streifen 1",["1"]],["Streifen 2",["2"]]]),"G gleich lange Stücke aus zwei Streifen: je Streifen eine Herkunft",r.G.z);
 p(kv(r.H.z)===JSON.stringify([["Abschnitt 595 mm",["1"]],["Abschnitt 595 mm",["2"]],["Abschnitt 1’215 mm",["3","5"]],["Abschnitt 1’215 mm",["4","6"]]]),
   "H mehrere Streifenbreiten: der Abschnitt ist der echte (1'215 bzw. 595 ab Rolle), auch für mitfahrende Gruppen - nicht je Gruppe 'Abschnitt 1'",r.H.z);
 p(r.C.z.length===0&&r.C.ohne>0,"Gegenprobe: bei nur EINEM Streifen keine Herkunft, die normale Nummernreihe bleibt",r.C);
 p(kv(r.D)===JSON.stringify([["Stange 1 · 6000 mm",["1","2"]],["Stange 2 · 5000 mm",["3"]]])||/Stange 1 · 6.?000 mm/.test(r.D[0].k)&&r.D.length===2&&r.D[0].nr.join()==="1,2"&&/Stange 2/.test(r.D[1].k),"D zwei Stangen: Stück → Stange, abhakbar",r.D);
 p(r.D1.length===0,"Gegenprobe: eine einzige Stange = keine Herkunft");
 p(r.N===0,"Gegenprobe: ohne Anforderung (Material-Seite, Werkstatt) bleibt die Liste unverändert",r.N);
 p(JSON.stringify(r.F)===JSON.stringify(["Abschnitt 1 · Streifen 1","Abschnitt 1 · Streifen 2","Abschnitt 2 · Streifen 1","Abschnitt 2 · Streifen 2"]),"Gegenprobe: Belegung der Material-Seite trägt dieselben Titel",r.F);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
