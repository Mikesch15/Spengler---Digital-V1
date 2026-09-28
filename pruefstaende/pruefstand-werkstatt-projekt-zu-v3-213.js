// Prueft v3.213: In der Werkstatt laesst sich das GANZE Projekt zuklappen.
//
// GEWUENSCHT
// "jetzt sollte in der werkstatt auch noch das ganze projekt zuklappbar sein,
//  das wird sonst bei vielen projekten unuebersichtlich"
//
// WAS HIER GEPRUEFT WIRD
//   A  Ab vier Projekten startet nur das oberste offen - und das ist das,
//      das laut rotem Faden zuerst drankommt. GEGENPROBE: bei drei Projekten
//      bleibt alles offen, sonst waere das Zuklappen Bevormundung.
//   B  Ein Tipp auf den Projektkopf klappt das Projekt zu und wieder auf.
//      Zugeklappt bleibt stehen, wonach ausgewaehlt wird: Objekt, Projekt
//      und wie viel hier ansteht.
//   C  GEGENPROBE: die Knoepfe IM Kopf (Rüstliste, Projekt) klappen nicht mit.
//   D  Ein Schalter fuer alle Projekte auf einmal.
//   E  Der Schalter fuer die Massaufnahmen meint nur, was zu sehen ist -
//      Karten in einem zugeklappten Projekt zaehlen nicht mit.
//   F  Tastatur: Enter und Leertaste, wie bei jedem Knopf.
//   G  Dieselbe Mechanik in der Sicht nach Material, dort heissen die
//      Bloecke "Materialien".
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-projekt-zu-v3-213.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Derselbe Stub wie in den uebrigen Werkstatt-Pruefstaenden - eine zweite
// Attrappe waere eine zweite Wahrheit.
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

const ICH="aaaa1111-1111-1111-1111-111111111111";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
const gm=(id,proj,title,material)=>({id,project_id:proj,type:"einlaufblech_gerade",title,
 date:"2026-09-01",workflow_status:"zu_ruesten",freigabe_verfallen:false,
 ruester_id:ICH,monteur_id:null,geruestet_am:null,montiert_am:null,
 updated_at:"2026-09-05T10:00:00Z",created_by:ICH,staerke_mm:0.7,
 data:{material,abwicklung:250,massA:120,winkel:30,montage:"links",restBreite:130,
  pieces:[{laenge:1200,stossStoss:1200,gehrungLinks:false,gehrungRechts:false,winkel:0},
          {laenge:700,stossStoss:700,gehrungLinks:false,gehrungRechts:false,winkel:0}],
  rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],
   abwicklung:250,abschnittLaenge:1200,optimal:true}}});

// Fuenf Baustellen, wie sie an einem vollen Tag in der Werkstatt liegen.
// Zwei Werkstoffe, damit die Sicht nach Material mehr als einen Block hat.
const PROJEKTE=[7,8,9,10,11].map((id,i)=>({id,name:"Bau "+(i+1),
 object:"Musterstrasse "+(i+1)+", 3000 Bern",order_no:"2026-"+(i+1)}));
const MESS=[gm(11,7,"Dach Nord",2),gm(12,7,"Dach Süd",2),gm(13,8,"Kamin",3),
            gm(14,9,"Anbau",2),gm(15,10,"Garage",3),gm(16,11,"Schopf",2)];

const vorbereiten=async(page,projekte,mess)=>{
 await page.evaluate(([prj,ms,mod,ich])=>{
  currentProfile={id:ich,role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=JSON.parse(JSON.stringify(prj));
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true; reststuecke=[];
  window.__db.mess=JSON.parse(JSON.stringify(ms));
  window.__db.res=[]; window.__db.ze=[]; window.__db.fehler=null;
  pmUebernehmen(mod);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("werkstattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle";
  if(typeof werkSichtSetzen==="function")werkSichtSetzen("projekt");
  werkstattKnopfAktualisieren();
 },[projekte,mess,MODULE,ICH]);
};
const tipp=async(page,sel,was)=>{
 const da=await page.evaluate(s=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  const r=e.getBoundingClientRect();
  if(!(r.width>0&&r.height>0))return "unsichtbar";
  e.click(); return "ok";
 },sel);
 if(da!=="ok"){p(false,(was||"Element")+" antippbar ("+sel+")",da);return false}
 await page.waitForTimeout(350); return true;
};
// Der Zustand der Liste, so wie er auf dem Schirm steht - gezaehlt wird im
// DOM, nicht im Zustand der Merkliste.
const stand=page=>page.evaluate(()=>({
 bloecke:document.querySelectorAll("#werkstattBody .werk-projekt").length,
 zu:document.querySelectorAll("#werkstattBody .werk-projekt-zu").length,
 karten:document.querySelectorAll("#werkstattBody .werk-karte").length,
 streifen:document.querySelectorAll("#werkstattBody .mw-leiste, #werkstattBody .werk-streifen").length,
 schalter:[...document.querySelectorAll("#werkstattBody .werk-allezu-reihe .status-chip")]
   .map(b=>b.textContent.replace(/\s+/g," ").trim()),
 ersterTitel:(document.querySelector("#werkstattBody .werk-kopf-titel b")||{}).textContent||"",
 ersterZu:!!(document.querySelector("#werkstattBody .werk-projekt")||{classList:{contains:()=>false}})
   .classList.contains("werk-projekt-zu")
}));

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForFunction(()=>typeof renderWerkstatt==="function",null,{timeout:15000});
 // Die klassische Ansicht: in der neuen liegt der Werkstatt-Knopf in der
 // unteren Leiste, und darum geht es hier nicht (wie in v3-30).
 await page.evaluate(()=>{if(typeof a2Setzen==="function")a2Setzen(false)});

 // ---- A  Viele Projekte ----------------------------------------------------
 console.log("\nA · Ab vier Projekten startet nur das oberste offen");
 await vorbereiten(page,PROJEKTE,MESS);
 await tipp(page,"#navWerkstatt","Werkstatt-Knopf");
 await page.waitForTimeout(500);
 const A=await stand(page);
 p(A.bloecke===5,"fuenf Projekte stehen in der Liste",A);
 p(A.zu===4&&!A.ersterZu,"vier davon sind zugeklappt, das oberste ist offen",A);
 p(A.karten===2,"nur die Massaufnahmen des offenen Projekts stehen da",A);
 // Gegenprobe: mit drei Projekten wird nichts zugeklappt.
 await vorbereiten(page,PROJEKTE.slice(0,3),MESS.filter(m=>m.project_id<=9));
 await tipp(page,"#navWerkstatt","Werkstatt-Knopf");
 await page.waitForTimeout(500);
 const A2=await stand(page);
 p(A2.bloecke===3&&A2.zu===0,"GEGENPROBE: bei drei Projekten bleibt alles offen",A2);

 // ---- B  Zuklappen und wieder auf ------------------------------------------
 console.log("\nB · Ein Tipp auf den Projektkopf");
 // Der erste Treffer ist der oberste Block - ueber der Liste stehen noch
 // der rote Faden und die Filterreihen, deshalb kein :first-child.
 const kopf1='#werkstattBody [data-werk-blockzu]';
 await tipp(page,kopf1,"Projektkopf");
 const B=await stand(page);
 p(B.zu===1&&B.ersterZu,"das Projekt ist zugeklappt",B);
 p(B.karten===2,"seine Massaufnahmen sind weg (die der anderen bleiben)",B);
 const Btxt=await page.evaluate(()=>{
  const k=document.querySelector("#werkstattBody .werk-projekt-zu");
  return {text:k.textContent.replace(/\s+/g," ").trim().slice(0,120),
          hoehe:Math.round(k.getBoundingClientRect().height),
          knoepfe:k.querySelectorAll("button").length};
 });
 p(/Musterstrasse/.test(Btxt.text)&&/rüsten/.test(Btxt.text),
   "zugeklappt stehen Objekt und Anzahl weiterhin da",Btxt.text);
 p(Btxt.knoepfe>=1,"und die Knoepfe des Kopfes bleiben erreichbar",Btxt);
 await tipp(page,kopf1,"Projektkopf erneut");
 const B2=await stand(page);
 p(B2.zu===0&&B2.karten===4,"ein zweiter Tipp klappt es wieder auf",B2);

 // ---- C  Gegenprobe: Knoepfe im Kopf klappen nicht mit ---------------------
 console.log("\nC · Die Knöpfe im Kopf klappen nicht mit");
 const C=await page.evaluate(()=>{
  // Der Knopf hat seinen eigenen Weg (projektOeffnen, js/01). Der wird hier
  // stillgelegt - geprueft wird NUR, ob der Kopf darauf zuklappt.
  const alt=window.projektOeffnen; window.projektOeffnen=()=>{};
  const knopf=document.querySelector("#werkstattBody .werk-kopf button[data-werk-projekt]");
  const vorher=document.querySelectorAll("#werkstattBody .werk-projekt-zu").length;
  if(knopf)knopf.click();
  const nachher=document.querySelectorAll("#werkstattBody .werk-projekt-zu").length;
  window.projektOeffnen=alt;
  const m=$("werkstattModal"); if(m)m.hidden=false;
  return {knopf:!!knopf,vorher,nachher};
 });
 p(C.knopf,"im Kopf steht der Knopf „Projekt“",C);
 p(C.vorher===0&&C.nachher===0,"er klappt das Projekt NICHT zu",C);

 // ---- D  Alle Projekte auf einmal ------------------------------------------
 console.log("\nD · Alle Projekte auf einmal");
 const D0=await stand(page);
 p(D0.schalter.some(t=>/Projekte/.test(t)),"der Schalter fuer die Projekte steht da",D0.schalter);
 await tipp(page,'#werkstattBody [data-werk-blockallezu]',"Schalter Projekte");
 const D1=await stand(page);
 p(D1.zu===3&&D1.karten===0,"ein Tipp klappt ALLE Projekte zu",D1);
 await tipp(page,'#werkstattBody [data-werk-blockallezu]',"Schalter Projekte erneut");
 const D2=await stand(page);
 p(D2.zu===0&&D2.karten===4,"der naechste klappt alle wieder auf",D2);

 // ---- E  Der Schalter der Massaufnahmen meint nur Sichtbares ---------------
 console.log("\nE · Zwei Ebenen, zwei Schalter");
 const E=await page.evaluate(()=>{
  const alle=werkSichtbareKartenIds().length;
  const g=werkGruppen()[0];
  werkZuBlock.add(werkBlockSchluessel(g));
  const nachZu=werkSichtbareKartenIds().length;
  werkZuBlock.delete(werkBlockSchluessel(g));
  return {alle,nachZu,drin:g.aufnahmen.length};
 });
 p(E.alle>E.nachZu&&E.nachZu===E.alle-E.drin,
   "Karten in einem zugeklappten Projekt zaehlen nicht mehr mit",E);
 const E2=await page.evaluate(()=>{
  const bloecke=werkGruppen();
  bloecke.forEach(g=>werkZuBlock.add(werkBlockSchluessel(g)));
  renderWerkstatt();
  const chips=[...document.querySelectorAll("#werkstattBody .werk-allezu-reihe .status-chip")]
    .map(b=>b.textContent.replace(/\s+/g," ").trim());
  bloecke.forEach(g=>werkZuBlock.delete(werkBlockSchluessel(g)));
  renderWerkstatt();
  return chips;
 });
 p(E2.length===1&&/Projekte/.test(E2[0]),
   "ist alles zu, bleibt nur der Schalter fuer die Projekte stehen",E2);

 // ---- F  Tastatur ----------------------------------------------------------
 console.log("\nF · Tastatur");
 await page.evaluate(()=>document.querySelector("#werkstattBody [data-werk-blockzu]").focus());
 await page.keyboard.press("Enter"); await page.waitForTimeout(350);
 const F1=await stand(page);
 p(F1.ersterZu,"Enter klappt das Projekt zu",F1);
 await page.evaluate(()=>document.querySelector("#werkstattBody [data-werk-blockzu]").focus());
 await page.keyboard.press(" "); await page.waitForTimeout(350);
 const F2=await stand(page);
 p(!F2.ersterZu,"die Leertaste klappt es wieder auf",F2);

 // ---- G  Sicht nach Material ----------------------------------------------
 console.log("\nG · Nach Material");
 await page.evaluate(()=>{werkSichtSetzen("material")});
 await page.waitForTimeout(350);
 const G0=await stand(page);
 p(G0.bloecke>=2,"die Materialsicht hat mehrere Bloecke",G0);
 p(G0.schalter.some(t=>/Materialien/.test(t)),
   "der Schalter heisst hier „Alle Materialien …“",G0.schalter);
 await tipp(page,'#werkstattBody [data-werk-blockzu]',"Materialkopf");
 const G1=await stand(page);
 p(G1.zu===1,"eine Materialgruppe laesst sich genauso zuklappen",G1);
 const G2=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#werkstattBody .werk-projekt-zu .werk-mat-zeile").length,
  karten:document.querySelectorAll("#werkstattBody .werk-projekt-zu .werk-karte").length,
  text:(document.querySelector("#werkstattBody .werk-projekt-zu")||{}).textContent||""
 }));
 p(G2.zeilen===0&&G2.karten===0,"zugeklappt steht weder Zuschnittliste noch Karte da",G2);
 p(/Massaufnahme/.test(G2.text.replace(/\s+/g," ")),
   "der Kopf nennt weiterhin, was drinsteckt",G2.text.replace(/\s+/g," ").slice(0,120));

 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));
 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
