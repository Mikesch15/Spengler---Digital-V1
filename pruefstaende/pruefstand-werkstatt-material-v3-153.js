// Prueft die Sicht "Nach Material" der Werkstatt (v3.153).
//
// WAS HIER GEPRUEFT WIRD
//   A  Gruppiert wird nach MATERIAL UND STAERKE. Der Pruefling sind drei
//      Massaufnahmen aus demselben Material, zwei davon 0,7 mm (aus ZWEI
//      Projekten) und eine 0,8 mm - genau der Fall, an dem sich zeigt, ob
//      die Trennung stimmt. Eine Liste, die 0,7er und 0,8er zusammenwirft,
//      schickt den Ruester mit der falschen Rolle an die Maschine.
//      Gleiche Laengen werden zusammengezaehlt (A6).
//   B  GEGENPROBE: dieselbe Stueckzahl wie pmatSammeln() (js/48), die
//      Funktion hinter der projektweiten Materialuebersicht. Diese Sicht
//      rechnet also NICHT selbst - eine zweite Zaehlung waere eine zweite
//      Wahrheit. Die Pruefung verlangt ausdruecklich eine Zahl groesser
//      null, sonst waere "beide sind 0" eine leere Aussage.
//   C  Der Filter oben wirkt auch in dieser Sicht.
//   D  GEGENPROBE: die Projektsicht ist unveraendert, und die Wahl wird je
//      Geraet gemerkt.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Das Abhaken. Die Materialsicht ist eine Ruestliste und schreibt nichts;
//   abgehakt wird an der Massaufnahme, wo die Stuecknummern stehen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-material-v3-153.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

// Zwei Massaufnahmen aus DEMSELBEN Material, aber VERSCHIEDENER Staerke -
// genau der Fall, an dem sich zeigt, ob die Gruppierung stimmt.
const ZEILEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Nordseite",workflow_status:"zu_ruesten",
  staerke_mm:0.7,data:{material:"titanzink",abwicklung:250,
   rollen:{streifen:[{stuecke:[{nr:1,laenge:2000},{nr:2,laenge:2000},{nr:3,laenge:1500}]}]}}},
 {id:12,project_id:8,type:"einlaufblech_gerade",title:"Südseite",workflow_status:"zu_ruesten",
  staerke_mm:0.7,data:{material:"titanzink",abwicklung:250,
   rollen:{streifen:[{stuecke:[{nr:1,laenge:2000}]}]}}},
 {id:13,project_id:7,type:"einlaufblech_gerade",title:"Kamin",workflow_status:"zu_ruesten",
  staerke_mm:0.8,data:{material:"titanzink",abwicklung:300,
   rollen:{streifen:[{stuecke:[{nr:1,laenge:900}]}]}}}
];
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:430,height:920}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);
 await page.evaluate(z=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Neubau",object:"Hofmattstrasse 4",archived:false},
               {id:8,name:"Sanierung",object:"Kirchweg 1",archived:false}];
  aufgabenListe=[];
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  if(typeof pmUebernehmen==="function")pmUebernehmen({haupt:true,material:true,zuschnitt:true,werkstatt:true});
  $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
  werkZeilen=z; werkFilter="alle"; werkFehler=null;
  $("werkstattModal").hidden=false;
  werkSichtSetzen("material");
 },ZEILEN);
 await page.waitForTimeout(200);

 let a=await page.evaluate(()=>{
  const g=werkMaterialGruppen();
  return {
   gruppen:g.map(x=>({titel:x.titel,stueck:x.stueck,aufn:x.aufnahmen.length,proj:x.projekte.length,
                      zuschnitte:x.zuschnitte.map(t=>[t.laenge,t.anzahl])})),
   karten:document.querySelectorAll("#werkstattBody .werk-projekt").length,
   zeilen:document.querySelectorAll("#werkstattBody .werk-mat-zeile").length,
   text:$("werkstattBody").textContent.replace(/\s+/g," ")
  };
 });
 p(a.gruppen.length===2,"A1 zwei Gruppen - 0,7 und 0,8 werden getrennt",a.gruppen);
 const g07=a.gruppen.find(x=>/0[.,]7/.test(x.titel));
 const g08=a.gruppen.find(x=>/0[.,]8/.test(x.titel));
 p(!!g07&&!!g08,"A2 beide Staerken sind benannt",a.gruppen.map(x=>x.titel));
 p(g07&&g07.stueck===4,"A3 die 0,7er Gruppe hat 4 Stuecke (3 + 1)",g07);
 p(g08&&g08.stueck===1,"A4 die 0,8er Gruppe hat 1 Stueck",g08);
 p(g07&&g07.proj===2,"A5 die 0,7er Rolle bedient zwei Projekte",g07);
 p(g07&&JSON.stringify(g07.zuschnitte.sort((x,y)=>y[0]-x[0]))===JSON.stringify([[2000,3],[1500,1]]),
   "A6 gleiche Laengen sind zusammengezaehlt: 3x2000, 1x1500",g07&&g07.zuschnitte);
 p(a.karten===2,"A7 zwei Karten gezeichnet",a);
 p(a.text.includes("Abgehakt wird in der Massaufnahme"),"A8 der Hinweis zum Abhaken steht da",a.text.slice(0,200));

 // Gegenprobe: dieselbe Zahl wie die projektweite Materialuebersicht
 let b2=await page.evaluate(()=>{
  const eigene=werkMaterialGruppen().reduce((n,g)=>n+g.stueck,0);
  const ueber=pmatSammeln(werkZeilen).reduce((n,g)=>n+g.zuschnitte.reduce((m,t)=>m+t.anzahl,0),0);
  return {eigene,ueber};
 });
 p(b2.eigene>0&&b2.eigene===b2.ueber,
   "B1 dieselbe Stueckzahl wie pmatSammeln() - keine zweite Zaehlung (und nicht beide null)",b2);

 // Gegenprobe: der Filter wirkt auch in der Materialsicht
 let c=await page.evaluate(()=>{
  werkZeilen=werkZeilen.map(z=>z.id===13?{...z,workflow_status:"zu_montieren"}:z);
  werkFilter="ruesten"; renderWerkstatt();
  return {gruppen:werkMaterialGruppen().length,
          karten:document.querySelectorAll("#werkstattBody .werk-projekt").length};
 });
 p(c.gruppen===1&&c.karten===1,"C1 der Filter 'Zu rüsten' wirkt auch nach Material",c);

 // Gegenprobe: zurueck auf die Projektsicht - unveraendert
 let d=await page.evaluate(()=>{
  werkFilter="alle"; werkSichtSetzen("projekt");
  return {karten:document.querySelectorAll("#werkstattBody .werk-projekt").length,
   zeilen:document.querySelectorAll("#werkstattBody .werk-mat-zeile").length,
          gemerkt:localStorage.getItem("sd_werkstattSicht"),
          tabellen:document.querySelectorAll("#werkstattBody .werk-mat-liste").length};
 });
 p(d.karten===2&&d.tabellen===0,"D1 die Projektsicht ist unveraendert (2 Projekte, keine Materialtabelle)",d);
 p(d.gemerkt==="projekt","D2 die Wahl wird je Geraet gemerkt",d);

 p(fehler.length===0,"E1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
