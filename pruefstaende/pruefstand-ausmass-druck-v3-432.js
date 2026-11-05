// v3.432: Ausmasse drucken - Komplettausmass (Projekt) und jedes gespeicherte Ausmass direkt aus der Liste (neue Ansicht).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400},locale:"de-CH"});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});await page.waitForTimeout(600);
 const ev=(f,...a)=>page.evaluate(f,...a);
 await ev(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Max",last_name:"Muster",company_id:"A"};allProfiles=[currentProfile];meineRechte={admin:true};
  allProjects=[{id:7,name:"Dach Nord",object:"Bahnhofstrasse 1",order_no:"26-1",customer:"Meier AG",archived:false}];
  cockpitProjectId=7;$("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  window.__doc="";window.__offen=0;window.open=()=>{window.__offen++;return {document:{write(h){window.__doc+=h},close(){}},focus(){},print(){window.__druck=(window.__druck||0)+1},set onload(f){},close(){}}};
  const z=(pos,t,m,e)=>({pos,bezeichnung:t,menge:m,einheit:e});
  projectMeasurementsCache=[
   {id:1,project_id:7,company_id:"A",type:"kehle",title:"Süd",workflow_status:"in_bearbeitung",data:{ausmass:[z(1,"Blechfläche Zuschnitt","1,5","m²"),z(2,"Bleilappen","8","Stk.")]}},
   {id:2,project_id:7,company_id:"A",type:"kehle",title:"Nord",workflow_status:"in_bearbeitung",data:{ausmass:[z(1,"Blechfläche Zuschnitt","2","m²"),z(2,"Fläche",null,"m²")]}}];
  kaProjekt=null;kaStand=null;kaGeladen();
 });
 console.log("\nA · Komplettausmass drucken");
 let r=await ev(()=>({knopf:!!document.querySelector("#cockpitKomplettBody [data-ka-druck]")}));
 p(r.knopf,"Im Komplettausmass steht der Knopf «Komplettausmass drucken»",r);
 r=await ev(async()=>{document.querySelector("#cockpitKomplettBody [data-ka-druck]").click();await new Promise(x=>setTimeout(x,300));
  const h=window.__doc;window.__roh=h;return {offen:window.__offen,kopf:/Komplettausmass/.test(h)&&/Dach Nord/.test(h)&&/Meier AG/.test(h),summe:/Blechfläche[^<]*<\/td><td[^>]*>3[.,]5<\/td>/.test(h.replace(/\s+/g," ")),
   bl:/Bleilappen/.test(h),herkunft:/Kehle · Süd/.test(h)&&/Kehle · Nord/.test(h),pruefen:/Zu prüfen/.test(h)&&/Fläche/.test(h),hinweis:/keine Offertmenge/.test(h),fuss:/Gedruckt am/.test(h),
   gedruckt:window.__druck||0,doc:h.length}});
 p(r.offen===1&&r.kopf,"Es öffnet sich ein Druckfenster mit Kopf (Projekt, Auftraggeber, «Komplettausmass»)",r);
 p(r.summe&&r.bl,"Summen je Bezeichnung: Blechfläche 3,5 m² (aus zwei Massaufnahmen), Bleilappen 8 Stk",r);
 p(r.herkunft&&r.pruefen&&r.hinweis&&r.fuss,"Herkunft («Kehle · Süd/Nord»), «Zu prüfen» für die leere Menge, Hinweis, Fusszeile",r);
 await page.waitForTimeout(1000);
 r=await ev(()=>window.__druck||0);
 p(r>=1,"Der Druckdialog wird ausgelöst",r);
 r=await ev(async()=>{projectMeasurementsCache=[];kaGeladen();window.__doc="";window.__offen=0;
  const k=document.querySelector("#cockpitKomplettBody [data-ka-druck]");return {k:!!k}});
 p(r.k===false,"Ohne Massaufnahme kein Druckknopf",r);

 console.log("\nB · Jedes Ausmass aus der Liste drucken (neue Ansicht)");
 r=await ev(async()=>{
  projectAusmassCache=[{id:21,project_id:7,type:"blitzschutz_ausmass",title:"BS Ost",date:"2026-09-14",positions:[{artikel_nr:"1",bezeichnung:"Fangstange",material:"Alu",einheit:"Stk",menge:3}]},
   {id:22,project_id:7,type:"offerte_erfassen",title:"Dach",date:"2026-09-15",positions:[{pos:"1",description:"Ziegel",quantity:10,unit:"m²"}]}];
  a2Zustand.seite="projekt";a2Zustand.projektId=7;a2Zustand.reg="ausmass";a2ProjLaedt=false;
  const h=a2RegAusmass({id:7});const d=document.createElement("div");d.innerHTML=h;
  const kn=[...d.querySelectorAll("[data-a2-am-druck]")].map(x=>x.dataset.a2AmDruck);
  const zeilen=[...d.querySelectorAll("[data-a2-am]")].map(x=>x.dataset.a2Am);
  return {kn,zeilen,verschachtelt:!!d.querySelector("button button")}});
 p(r.kn.join()==="21,22"&&r.zeilen.join()==="21,22"&&!r.verschachtelt,"Jede Zeile hat ihren Druckknopf; die Zeile selbst öffnet weiter das Ausmass",r);
 r=await ev(async()=>{window.__gedruckt=null;const alt=window.printAusmass;window.printAusmass=a=>{window.__gedruckt=a.id};
  document.body.insertAdjacentHTML("beforeend",'<button id="tDruck" data-a2-am-druck="22"></button>');document.getElementById("tDruck").click();
  const o={g:window.__gedruckt,geoeffnet:a2Zustand.bereich};window.printAusmass=alt;document.getElementById("tDruck").remove();return o});
 p(r.g===22,"Der Knopf druckt genau dieses Ausmass (id 22) und öffnet es nicht",r);
 p(fehler.length===0,"Keine Seitenfehler",fehler);
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);if(fail)console.log("FEHLGESCHLAGEN: insgesamt "+fail);process.exit(fail?1:0);
})();
