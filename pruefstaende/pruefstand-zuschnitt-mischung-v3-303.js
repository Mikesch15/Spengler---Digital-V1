// Prueft v3.303 (Rueckmeldung des Anwenders: "nr. 4 und 6 haetten im selben Streifen Platz, es wuerde ein
// groesserer Rest entstehen statt zweier kleiner") und einen dabei gefundenen Fehler: bei der
// Trittbrett-Mischung (js/29 ebaMischeAbschnitte, v3.87) wurden freie Plaetze doppelt gezaehlt - es
// erschienen Reststuecke, die es nicht gibt, und die Materialbilanz ging nicht auf. Die Mischung hatte
// bis dahin keinen eigenen Pruefstand.
// Gegenproben: passen die Stuecke nicht zusammen, bleiben es zwei Spuren; ohne Mischung aendert sich nichts;
// mit Schnittfuge gilt dieselbe Rechnung.
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
 const page=await b.newPage();
 const fehler=[]; page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page); await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof ebaFormatPlan==="function"&&typeof zuBilanz==="function");
 const r=await page.evaluate(()=>{
  const lauf=(fuge,gruppen)=>{
   blechSchnittfuge=fuge;
   const pl=ebaFormatPlan({gruppen,formate:[{breite:1000,laenge:null}],netto:0,form:"rolle"});
   const sp=zuPlanAusGespeichert(JSON.parse(JSON.stringify({gruppen:pl.gruppen,moeglich:pl.moeglich,form:"rolle",netto:0})),250,"Stück");
   const bil=zuBilanz(sp);
   const reste=restAlle(sp).map(x=>[x.breite_mm,x.laenge_mm,x.anzahl,!!x.zuKlein]);
   return {spuren:pl.gruppen.map(g=>[g.breite,(g.streifen||[]).map(s=>(s.stuecke||[]).map(x=>x.nr).join("+"))]),
    aufgeht:!!(bil&&bil.aufgeht),reste,rb:(pl.moeglich[0].zeilen||[]).map(z=>[z.breite,z.restBreite,z.ungenutzteStreifen])};
  };
  const o={};
  const G=(l4)=>[{breite:250,bleche:[{nr:3,laenge:1215},{nr:5,laenge:1215}]},{breite:507,bleche:[{nr:2,laenge:595}]},
    {breite:325,bleche:[{nr:1,laenge:564}]},{breite:244,bleche:l4}];
  o.A=lauf(0,G([{nr:4,laenge:510},{nr:6,laenge:510}]));          // der Handyfall
  o.B=lauf(0,G([{nr:4,laenge:800},{nr:6,laenge:800}]));          // 800+800 > 1215: bleiben zwei Spuren
  o.C=lauf(3,G([{nr:4,laenge:510},{nr:6,laenge:510}]));          // mit Schnittfuge
  o.D=lauf(0,[{breite:250,bleche:[{nr:1,laenge:1000},{nr:2,laenge:900}]}]);   // keine Mischung (eine Breite)
  return o;
 });
 const sp=x=>JSON.stringify(x);
 const g244=r.A.spuren.find(g=>g[0]===244);
 p(sp(g244[1])===sp(["4+6"]),"A Handyfall: Stück 4 und 6 liegen in EINER Spur (nicht in zwei)",r.A.spuren);
 p(r.A.reste.some(x=>x[0]===256&&x[1]===1215&&!x[3]),"A ein grosser, verwertbarer Rest 256 × 1'215 mm statt zweier kleiner",r.A.reste);
 p(!r.A.reste.some(x=>x[0]===250&&x[1]===1215),"A KEINE Phantom-Reste (250 × 1'215 'ungenutzt': dort liegen ja die Gäste)",r.A.reste);
 p(r.A.aufgeht===true,"A die Materialbilanz geht auf",r.A);
 p(r.A.rb.every(z=>z[2]===0),"A bei der Mischung keine zusätzlich gemeldeten 'ungenutzten Streifen'",r.A.rb);
 p(sp(r.B.spuren.find(g=>g[0]===244)[1])===sp(["4","6"]),"B Gegenprobe: 800 + 800 passen nicht in 1'215 → zwei Spuren",r.B.spuren);
 p(r.B.aufgeht===true,"B die Bilanz geht auch hier auf",r.B);
 p(sp(r.C.spuren.find(g=>g[0]===244)[1])===sp(["4+6"])&&r.C.aufgeht===true,"C mit Schnittfuge 3 mm: zusammengelegt und Bilanz geht auf",r.C);
 p(r.D.aufgeht===true&&r.D.rb.every(z=>z[2]>=0),"D Gegenprobe ohne Mischung: Bilanz geht wie bisher auf",r.D);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();
