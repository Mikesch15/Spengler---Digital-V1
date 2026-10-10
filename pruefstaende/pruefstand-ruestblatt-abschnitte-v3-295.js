// Prueft v3.295 (Ansage: "Wenn bei einem Zuschnitt mehrere Streifen ab der Rolle abgeschnitten
// werden, muss ich wissen, welche Stuecke aus welchen Abschnitten geschnitten werden, das muss
// auch im Ruestblatt stehen"): das Ruestblatt nennt je Streifen bzw. Stange die Stuecke.
// Jede Probe hat eine Gegenprobe (ein einziger Streifen = kein Block; Material-Seite unveraendert).
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
 await page.waitForFunction(()=>typeof rbBlattHtml==="function"&&typeof zuBelegungKurzHtml==="function");
 const r=await page.evaluate(()=>{
  measurementMaterials=[{id:2,name:"Titanzink"}];
  const blatt=(rollen)=>{const m={id:1,type:"einlaufblech_gerade",title:"T",data:{abwicklung:300,gesamtlaenge:5000,material:2,rollen},note:""};
   const box=document.createElement("div"); box.innerHTML=rbBlattHtml(m,{kopf:true});
   return {zeilen:[...box.querySelectorAll(".zu-bel-zeile")].map(z=>({
     titel:z.querySelector("b").textContent.trim(),
     nr:[...z.querySelectorAll(".zu-bel-st .zu-nr")].map(n=>n.textContent.trim()),
     text:z.querySelector(".zu-bel-liste").textContent.replace(/\s+/g," ").trim()})),
    kopf:(box.querySelector(".zu-bel-kopf")||{}).textContent||"",da:!!box.querySelector(".zu-belegung-kurz")};};
  const o={};
  // A: 2 Abschnitte x 2 Streifen nebeneinander
  const A={abwicklung:300,abschnitte:2,abschnittLaenge:2500,jeAbschnitt:2,optimal:true,streifen:[
   {rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:1300}]},{rest:100,stuecke:[{nr:3,laenge:2400}]},
   {rest:0,stuecke:[{nr:4,laenge:2500}]},{rest:600,stuecke:[{nr:5,laenge:1900}]}]};
  o.A=blatt(A);
  // B: mehrere Abschnittlaengen, jeder Streifen mit eigener Abschnittnummer
  const B={abwicklung:300,optimal:true,streifen:[
   {abschnittNr:1,abschnittLaenge:3000,rest:0,stuecke:[{nr:1,laenge:3000}]},
   {abschnittNr:2,abschnittLaenge:1800,rest:0,stuecke:[{nr:2,laenge:1000},{nr:3,laenge:800}]},
   {abschnittNr:2,abschnittLaenge:1800,rest:800,stuecke:[{nr:4,laenge:1000}]}]};
  o.B=blatt(B);
  // C: ein einziger Streifen -> kein Block
  o.C=blatt({abwicklung:300,abschnitte:1,abschnittLaenge:2500,jeAbschnitt:1,optimal:true,streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:1300}]}]});
  // D: Stangen (Normlaengen)
  const stange=(n)=>({art:"stange",einheit:"Stück",breite:0,stangen:n,zuLang:[],optimal:true});
  o.D=zuBelegungKurzHtml(stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:3000},{nr:2,laenge:3000}]},{laenge:5000,rest:500,stuecke:[{nr:3,laenge:4500}]}]));
  o.D1=zuBelegungKurzHtml(stange([{laenge:6000,rest:0,stuecke:[{nr:1,laenge:6000}]}]));
  // E: Tafel
  o.E=zuBelegungKurzHtml(zuPlanAusGespeichert({form:"tafel",abwicklung:300,abschnitte:2,abschnittLaenge:2000,jeAbschnitt:1,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]},{rest:0,stuecke:[{nr:2,laenge:2000}]}]},300,"Stück"));
  // F: die Material-Seite (Belegung) traegt dieselben Titel wie vorher
  const pa=zuPlanAusGespeichert(A,300,"Stück"), pb=zuPlanAusGespeichert(B,300,"Stück");
  const titel=h=>{const d=document.createElement("div");d.innerHTML=h;return [...d.querySelectorAll(".zu-platz-kopf b")].map(x=>x.textContent.trim())};
  o.F={A:titel(zuBelegungHtml(pa)),B:titel(zuBelegungHtml(pb))};
  return o;
 });
 p(JSON.stringify(r.A.zeilen.map(z=>[z.titel,z.nr]))===JSON.stringify([["Abschnitt 1 · Streifen 1",["1","2"]],["Abschnitt 1 · Streifen 2",["3"]],["Abschnitt 2 · Streifen 1",["4"]],["Abschnitt 2 · Streifen 2",["5"]]]),
   "A mehrere Abschnitte: jedes Stück steht bei seinem Abschnitt und Streifen",r.A.zeilen);
 p(/1.?200/.test(r.A.zeilen[0].text)&&/1.?300/.test(r.A.zeilen[0].text)&&/Welches Stück aus welchem Abschnitt/.test(r.A.kopf),"mit der Länge je Stück und verständlicher Überschrift",r.A);
 p(JSON.stringify(r.B.zeilen.map(z=>[z.titel,z.nr]))===JSON.stringify([["Abschnitt 1 · Streifen 1",["1"]],["Abschnitt 2 · Streifen 1",["2","3"]],["Abschnitt 2 · Streifen 2",["4"]]]),
   "B mehrere Abschnittlängen: die Abschnittnummer des Streifens gilt",r.B.zeilen);
 p(r.C.da===false,"Gegenprobe: bei nur EINEM Streifen steht kein Zuordnungsblock da (nur Rauschen)",r.C);
 p(/Stange 1 · 6.?000 mm/.test(r.D)&&/Stange 2 · 5.?000 mm/.test(r.D)&&/welcher Stange/.test(r.D),"D bei zwei Stangen steht, welches Stück aus welcher Stange kommt");
 p(r.D1==="","Gegenprobe: bei einer einzigen Stange kein Block");
 p(/welcher Tafel/.test(r.E)&&/Tafel 1 · Streifen 1/.test(r.E)&&/Tafel 2 · Streifen 1/.test(r.E),"E bei Tafeln: 'Tafel N · Streifen M', richtige Anrede");
 p(JSON.stringify(r.F.A)===JSON.stringify(["Abschnitt 1 · Streifen 1","Abschnitt 1 · Streifen 2","Abschnitt 2 · Streifen 1","Abschnitt 2 · Streifen 2"])
   &&JSON.stringify(r.F.B)===JSON.stringify(["Abschnitt 1 · Streifen 1","Abschnitt 2 · Streifen 1","Abschnitt 2 · Streifen 2"]),
   "F Gegenprobe: die Belegung auf der Material-Seite traegt unveraendert dieselben Titel (gemeinsamer Helfer)",r.F);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
