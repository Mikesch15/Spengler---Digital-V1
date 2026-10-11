// v3.301 (Ansage: "Man muss auf Anhieb sehen, aus welchem Abschnitt welche Streifen mit welchen Abwicklungen
// geschnitten werden und welche Stuecke dann aus welchen Streifen gemacht werden"): die abhakbare Liste gliedert
// sich Abschnitt -> Streifen (Abwicklung) -> Stuecke. Die Faelle H/I/J gelten dem Handyfall (mehrere Streifenbreiten).
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
  const lies=box=>[...box.querySelectorAll(".zu-abschnitt")].map(a=>({
    k:a.querySelector(".zu-abschnitt-kopf").textContent.trim().replace(/[\u2019\u202f\u00a0]/g,"'"),
    streifen:[...a.querySelectorAll(".zu-streifen-zeile")].map(z=>({
      n:((z.querySelector(".zu-streifen-name")||{}).textContent||"").replace(/[\u2019\u202f\u00a0]/g,"'").trim(),
      st:[...z.querySelectorAll(".zu-st")].map(s=>({nr:s.querySelector(".zu-nr").textContent.trim(),mass:s.querySelector(".zu-st-mass").textContent.replace(/[\u2019\u202f\u00a0]/g,"'").trim(),hak:!!s.querySelector("button.zu-nr-hak")}))}))}));
  const blatt=(rollen)=>{const m={id:1,type:"einlaufblech_gerade",title:"T",data:{abwicklung:300,gesamtlaenge:5000,material:2,rollen},note:""};
   const box=document.createElement("div"); box.innerHTML=rbBlattHtml(m,{kopf:true});
   return {z:lies(box),alt:!!box.querySelector(".zu-belegung-kurz,.zu-bel-kopf"),kopf:box.textContent.indexOf("Welches Stück aus")>=0,
     ohne:box.querySelectorAll(".zu-pos").length};};
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
  o.H=blatt({abwicklung:250,optimal:true,streifen:[],moeglich:[{breite:1000,laenge:null,teile:[{n:1,laenge:1215},{n:1,laenge:595}]}],
   gruppen:[
    {breite:250,abschnitte:1,abschnittLaenge:1215,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:3,laenge:1215}]},{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:5,laenge:1215}]}]},
    {breite:507,abschnitte:1,abschnittLaenge:595,jeAbschnitt:1,streifen:[{rest:0,stuecke:[{nr:2,laenge:595}]}]},
    {breite:325,abschnitte:0,abschnittLaenge:564,jeAbschnitt:3,streifen:[{abschnittNr:1,abschnittLaenge:595,rest:31,stuecke:[{nr:1,laenge:564}]}]},
    {breite:244,abschnitte:0,abschnittLaenge:510,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,rest:705,stuecke:[{nr:4,laenge:510}]},{abschnittNr:1,abschnittLaenge:1215,rest:705,stuecke:[{nr:6,laenge:510}]}]}]});
  // I: zwei Abschnitte GLEICHER Laenge (je 600er Wirt + 300er Gast): jeder Abschnitt bekommt seine eigene
  // Nummer - dieselbe Ueberschrift fuer zwei Abschnitte darf nicht vorkommen.
  o.I=blatt({abwicklung:600,optimal:true,streifen:[],moeglich:[{breite:1000,laenge:null,teile:[{n:2,laenge:1000}]}],
   gruppen:[
    {breite:600,abschnitte:2,abschnittLaenge:1000,jeAbschnitt:1,streifen:[{rest:0,stuecke:[{nr:1,laenge:1000}]},{rest:0,stuecke:[{nr:2,laenge:1000}]}]},
    {breite:300,abschnitte:0,abschnittLaenge:1000,jeAbschnitt:3,streifen:[{abschnittNr:1,abschnittLaenge:1000,rest:0,stuecke:[{nr:3,laenge:1000}]},{abschnittNr:1,abschnittLaenge:1000,rest:0,stuecke:[{nr:4,laenge:1000}]}]}]});
  // J: Material-Seite (Belegung) - bei mehreren Streifenbreiten dieselben, plan-weiten Abschnitte
  const ph=zuPlanAusGespeichert({abwicklung:250,abschnitte:1,moeglich:[{breite:1000,laenge:null,teile:[{n:1,laenge:1215},{n:1,laenge:595}]}],gruppen:[
    {breite:250,abschnitte:1,abschnittLaenge:1215,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:3,laenge:1215}]},{abschnittNr:1,abschnittLaenge:1215,rest:0,stuecke:[{nr:5,laenge:1215}]}]},
    {breite:507,abschnitte:1,abschnittLaenge:595,jeAbschnitt:1,streifen:[{rest:0,stuecke:[{nr:2,laenge:595}]}]},
    {breite:325,abschnitte:0,abschnittLaenge:564,jeAbschnitt:3,streifen:[{abschnittNr:1,abschnittLaenge:595,rest:31,stuecke:[{nr:1,laenge:564}]}]},
    {breite:244,abschnitte:0,abschnittLaenge:510,jeAbschnitt:4,streifen:[{abschnittNr:1,abschnittLaenge:1215,rest:705,stuecke:[{nr:4,laenge:510}]},{abschnittNr:1,abschnittLaenge:1215,rest:705,stuecke:[{nr:6,laenge:510}]}]}]},250,"Stück");
  o.J=(()=>{const x=document.createElement("div");x.innerHTML=zuBelegungHtml(ph);return [...x.querySelectorAll(".zu-platz-kopf b")].map(y=>y.textContent.trim().replace(/[\u2019\u202f\u00a0]/g,"'"))})();
  const stange=(n)=>({art:"stange",einheit:"Stück",breite:0,stangen:n,zuLang:[],optimal:true,erledigtFuer:1});
  const st2=stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:3000},{nr:2,laenge:3000}]},{laenge:5000,rest:500,stuecke:[{nr:3,laenge:4500}]}]);
  const d=document.createElement("div"); d.innerHTML=zuListeHtml(st2,{herkunft:true}); o.D=lies(d);
  const d1=document.createElement("div"); d1.innerHTML=zuListeHtml(stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:6000}]}]),{herkunft:true}); o.D1=lies(d1);
  // ohne opt.herkunft (Material-Seite, Werkstatt-Liste) bleibt die Liste wie bisher
  const pa=zuPlanAusGespeichert(A,300,"Stück");
  const n=document.createElement("div"); n.innerHTML=zuListeHtml(pa); o.N=n.querySelectorAll(".zu-abschnitt").length;
  const titel=h=>{const x=document.createElement("div");x.innerHTML=h;return [...x.querySelectorAll(".zu-platz-kopf b")].map(y=>y.textContent.trim())};
  o.F=titel(zuBelegungHtml(pa));
  return o;
 });
 // Tausenderstrich je nach Browser-Sprache ’ oder ' - fuer den Vergleich vereinheitlicht
 const sum=l=>JSON.stringify(l.map(a=>[a.k,a.streifen.map(z=>[z.n,z.st.map(s=>s.nr+":"+s.mass)])]));
 p(sum(r.A.z)===JSON.stringify([["Abschnitt 1 · 2'500 mm ab Rolle",[["Streifen 1 · Abwicklung 300 mm",["1:1'200 mm","2:1'300 mm"]],["Streifen 2 · Abwicklung 300 mm",["3:2'400 mm"]]]],
   ["Abschnitt 2 · 2'500 mm ab Rolle",[["Streifen 1 · Abwicklung 300 mm",["4:2'500 mm"]],["Streifen 2 · Abwicklung 300 mm",["5:1'900 mm"]]]]]),
   "A zwei Abschnitte x zwei Streifen: Abschnitt -> Streifen mit Abwicklung -> Stücke mit Länge",sum(r.A.z));
 p(r.A.z.every(a=>a.streifen.every(z=>z.st.every(s=>s.hak))),"die Nummern bleiben abhakbare Knöpfe",r.A.z);
 p(r.A.alt===false&&!r.A.kopf,"KEINE separate Liste 'Welches Stück aus welchem Abschnitt'",r.A);
 p(r.A.ohne===0,"Es gibt keine zweite, ungegliederte Nummernreihe",r.A.ohne);
 p(sum(r.B.z)===JSON.stringify([["Abschnitt 1 · 3'000 mm ab Rolle",[["Streifen 1 · Abwicklung 300 mm",["1:3'000 mm"]]]],
   ["Abschnitt 2 · 1'800 mm ab Rolle",[["Streifen 1 · Abwicklung 300 mm",["2:1'000 mm","3:800 mm"]],["Streifen 2 · Abwicklung 300 mm",["4:1'000 mm"]]]]]),
   "B mehrere Abschnittlängen: jeder Abschnitt mit seiner Länge und seinen Streifen",sum(r.B.z));
 p(sum(r.G.z)===JSON.stringify([["Abschnitt 1 · 2'000 mm ab Rolle",[["Streifen 1 · Abwicklung 300 mm",["1:2'000 mm"]],["Streifen 2 · Abwicklung 300 mm",["2:2'000 mm"]]]]]),
   "G gleich lange Stücke aus zwei Streifen: zwei Streifen im selben Abschnitt",sum(r.G.z));
 p(sum(r.H.z)===JSON.stringify([["Abschnitt 1 · 1'215 mm ab Rolle",[["Streifen 1 · Abwicklung 250 mm",["3:1'215 mm"]],["Streifen 2 · Abwicklung 250 mm",["5:1'215 mm"]],["Streifen 3 · Abwicklung 244 mm",["4:510 mm"]],["Streifen 4 · Abwicklung 244 mm",["6:510 mm"]]]],
   ["Abschnitt 2 · 595 mm ab Rolle",[["Streifen 1 · Abwicklung 507 mm",["2:595 mm"]],["Streifen 2 · Abwicklung 325 mm",["1:564 mm"]]]]]),
   "H der Handyfall: zwei Abschnitte, darin vier bzw. zwei Streifen mit je eigener Abwicklung, darin die Stücke",sum(r.H.z));
 p(r.I.z.length===2&&r.I.z[0].k!==r.I.z[1].k&&r.I.z.every(a=>a.streifen.length===2&&a.streifen.reduce((n,z)=>n+z.st.length,0)===2),
   "I zwei gleich lange Abschnitte: zwei verschiedene Abschnitte mit je zwei Streifen",sum(r.I.z));
 { const nr=r.I.z.map(a=>a.streifen.flatMap(z=>z.st.map(s=>s.nr)).sort().join(","));
   p(JSON.stringify(nr)===JSON.stringify(["1,3","2,4"]),"I die beiden Wirte (1 und 2) liegen in verschiedenen Abschnitten, je mit einem Gast",nr); }
 p(JSON.stringify(r.J)===JSON.stringify(["Abschnitt 1 · 1'215 mm · Streifen 1","Abschnitt 1 · 1'215 mm · Streifen 2","Abschnitt 2 · 595 mm · Streifen 1","Abschnitt 2 · 595 mm · Streifen 2","Abschnitt 1 · 1'215 mm · Streifen 3","Abschnitt 1 · 1'215 mm · Streifen 4"]),
   "J Material-Seite: dieselben Abschnitte und Streifen-Nummern",r.J);
 p(r.C.z.length===0&&r.C.ohne>0,"Gegenprobe: bei nur EINEM Streifen keine Gliederung, die normale Nummernreihe bleibt",r.C);
 p(JSON.stringify(r.D.map(a=>[a.k.replace(/[\u2019\u202f\u00a0]/g,"'"),a.streifen.map(z=>z.st.map(s=>s.nr))]))===JSON.stringify([["Stange 1 · 6'000 mm",[["1","2"]]],["Stange 2 · 5'000 mm",[["3"]]]]),"D zwei Stangen: Stange -> Stücke, abhakbar",r.D);
 p(r.D1.length===0,"Gegenprobe: eine einzige Stange = keine Gliederung");
 p(r.N===0,"Gegenprobe: ohne Anforderung (Material-Seite, Werkstatt) bleibt die Liste unverändert",r.N);
 p(JSON.stringify(r.F)===JSON.stringify(["Abschnitt 1 · Streifen 1","Abschnitt 1 · Streifen 2","Abschnitt 2 · Streifen 1","Abschnitt 2 · Streifen 2"]),"Gegenprobe: Belegung der Material-Seite (eine Streifenbreite) unverändert",r.F);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
