// Prueft das neue Aussehen des MASSAUFNAHME-FORMULARS (v3.152).
//
// WAS HIER GEPRUEFT WIRD
//   A  GROESSE. Seit v3.156 gilt: die neue Ansicht aendert die GROESSE von
//      Feldern und Knoepfen NICHT. v3.152 hatte sie auf 48px/16px
//      vergroessert (Finger mit Handschuh, iOS-Zoom); der Anwender hat das
//      am fertigen Bildschirm beurteilt und als unuebersichtlich
//      zurueckgewiesen. Gemessen wird deshalb jetzt die Gleichheit mit der
//      klassischen Ansicht - und zwar in derselben Sitzung, damit nicht
//      eine feste Zahl im Pruefstand steht, die beim naechsten Umbau des
//      Grundstils stillschweigend falsch wird.
//   B  AUSSEHEN. Geaendert ist die Form: rundere Ecken an Feldern und
//      Registerknoepfen. Das ist die Gegenprobe zu A - ohne sie waere A
//      auch dann gruen, wenn die neue Ansicht gar nichts mehr taete.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Die Fachlogik des Formulars - Masse, Abwicklung, Zuschnitt. Daran
//   wurde nichts geaendert; sie hat ihre eigenen Pruefstaende.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-massaufnahme-optik-v3-152.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
// Die gemessenen Groessen im Massaufnahme-Formular.
const messen=page=>page.evaluate(()=>{
 const g=(sel,eig)=>{const e=document.querySelector(sel);
  if(!e)return null; const s=getComputedStyle(e);
  return eig.reduce((o,k)=>(o[k]=s[k],o),{});};
 return {
  feld:g('#measurementEditModal .grid input:not([type=checkbox])',["minHeight","fontSize","borderRadius"]),
  tabellenfeld:g('#measurementEditModal table input',["minHeight","fontSize"]),
  register:g('#measurementEditModal .ra-register-knopf',["minHeight","borderRadius"]),
  info:g('#measurementEditModal .hilfe-knopf',["minHeight"]),
  karte:g('#measurementEditModal .card',["borderRadius","boxShadow"])
 };
});
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:430,height:920},deviceScaleFactor:2});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  companyName="Peter Künzi AG";
  allProjects=[{id:7,name:"Neubau",object:"Hofmattstrasse 4, 3400 Burgdorf",order_no:"26-011",archived:false}];
  aufgabenListe=[];
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500}];
  blechRollenbreiten=[1000,670,500];
  $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
  showStart();
  // Ein leeres Formular oeffnen, wie "Neue Massaufnahme" es tut.
  newMeasurementWithType("einlaufblech_gerade");
 });
 await page.waitForTimeout(500);
 const neu=await messen(page);
 // Gegenprobe zuerst: dieselben Messungen in der klassischen Ansicht.
 await page.evaluate(()=>{a2Setzen(false)});
 await page.waitForTimeout(200);
 const alt=await messen(page);
 await page.evaluate(()=>{a2Setzen(true)});
 await page.waitForTimeout(200);

 // A  GROESSE: in beiden Ansichten dieselbe.
 p(neu.feld&&alt.feld&&neu.feld.minHeight===alt.feld.minHeight
   &&neu.feld.fontSize===alt.feld.fontSize,
   "A1 Feldhoehe und Schriftgroesse sind in beiden Ansichten gleich",{neu:neu.feld,alt:alt.feld});
 p(neu.register&&alt.register&&neu.register.minHeight===alt.register.minHeight,
   "A2 auch die Registerknoepfe behalten ihre Hoehe",{neu:neu.register,alt:alt.register});
 p(neu.tabellenfeld&&alt.tabellenfeld&&neu.tabellenfeld.minHeight===alt.tabellenfeld.minHeight,
   "A3 und die Felder in den Stuecklisten erst recht",{neu:neu.tabellenfeld,alt:alt.tabellenfeld});
 // Gegenprobe, dass die Messung ueberhaupt etwas sieht: sonst waere A1 bis
 // A3 auch dann gruen, wenn gar kein Feld gefunden wurde.
 p(neu.feld&&parseInt(neu.feld.minHeight)>0&&parseInt(neu.feld.fontSize)>0,
   "A4 die Messung hat wirklich ein Feld gefunden",neu.feld);
 p(!neu.info||parseInt(neu.info.minHeight)<44,"A5 der runde Info-Knopf bleibt klein",neu.info);

 // B  AUSSEHEN: geaendert ist die Form, nicht das Mass.
 p(neu.register&&alt.register&&neu.register.borderRadius!==alt.register.borderRadius,
   "B1 die Registerknoepfe sind runder als in der klassischen Ansicht",
   {neu:neu.register,alt:alt.register});
 // Die Felder selbst haben schon in der klassischen Ansicht 9px Rundung -
 // an ihnen ist nichts mehr zu unterscheiden, und eine erfundene
 // Abweichung waere kein Vertrag. Gemessen wird deshalb die Karte, die sie
 // traegt: sie bekommt in der neuen Ansicht einen weichen Schatten.
 // (Ihre Rundung ist uebrigens KLEINER als in der klassischen Ansicht,
 // 14px statt 16px - gemeldet von genau dieser Messung, nachdem hier
 // zuerst das Gegenteil behauptet worden war.)
 p(neu.karte&&alt.karte&&neu.karte.boxShadow!==alt.karte.boxShadow
   &&neu.karte.boxShadow!=="none",
   "B2 die Karten tragen den Schatten der neuen Ansicht",{neu:neu.karte,alt:alt.karte});

 p(fehler.length===0,"C1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
