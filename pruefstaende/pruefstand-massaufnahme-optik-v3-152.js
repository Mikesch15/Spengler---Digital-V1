// Prueft das neue Aussehen des MASSAUFNAHME-FORMULARS (v3.152).
//
// WAS HIER GEPRUEFT WIRD
//   A  Mit eingeschalteter neuer Ansicht sind Felder mindestens 48px hoch
//      und 16px gross (darunter zoomt iOS beim Hineintippen), und die
//      Registerknoepfe sind fingergerecht.
//      A4 ist die wichtige Gegenprobe: Felder IN TABELLEN bleiben schmal.
//      Im Formular stehen dreizehn Tabellen (Stueck- und Zuschnittlisten)
//      mit mehreren Feldern je Zeile - 48px wuerden sie unlesbar machen.
//      Beim ersten Versuch griff diese Ausnahme NICHT, weil die allgemeine
//      Regel spezifischer war; gemeldet hat das genau diese Messung.
//   B  Gegenprobe: in der klassischen Ansicht ist alles unveraendert.
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
  info:g('#measurementEditModal .hilfe-knopf',["minHeight"])
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
 p(neu.feld&&parseInt(neu.feld.minHeight)>=48,"A1 Felder sind mindestens 48px hoch",neu.feld);
 p(neu.feld&&parseInt(neu.feld.fontSize)>=16,"A2 und mindestens 16px gross",neu.feld);
 p(neu.register&&parseInt(neu.register.minHeight)>=44,"A3 die Registerknoepfe sind fingergerecht",neu.register);
 p(!neu.tabellenfeld||parseInt(neu.tabellenfeld.minHeight)<48,
   "A4 Felder IN TABELLEN bleiben schmal - sonst platzt die Stueckliste",neu.tabellenfeld);
 p(!neu.info||parseInt(neu.info.minHeight)<44,"A5 der runde Info-Knopf bleibt klein",neu.info);

 // Gegenprobe: klassische Ansicht unveraendert
 await page.evaluate(()=>{a2Setzen(false)});
 await page.waitForTimeout(150);
 const alt=await messen(page);
 p(alt.feld&&parseInt(alt.feld.minHeight)<48,"B1 klassisch: die Feldhoehe ist unveraendert",alt.feld);
 p(alt.register&&alt.register.borderRadius!==neu.register.borderRadius,
   "B2 klassisch: die Registerknoepfe sind unveraendert",{alt:alt.register,neu:neu.register});

 p(fehler.length===0,"C1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
