// Prueft v3.283: Massaufnahme im Projekt (1) oeffnet beim Anklicken die
// Massaufnahme, nicht das Ruestblatt, und (2) laesst sich direkt aus der Liste
// freigeben, ohne sie zu oeffnen. Jede Probe hat eine Gegenprobe.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2MessZeileHtml==="function"&&typeof mwFreigebenAusListe==="function");
 const r=await page.evaluate(async()=>{
  const o={};
  currentProfile={id:"ich"};
  workflowAktiv=true;
  const mk=(id,extra)=>Object.assign({id,project_id:7,type:"rinne",title:"T"+id,created_by:"ich",workflow_status:"in_bearbeitung",freigabe_verfallen:false,date:"2026-10-01"},extra||{});
  const eigene=mk(1), fremde=mk(2,{created_by:"andere"}), frei=mk(3,{workflow_status:"freigegeben"}), verf=mk(4,{freigabe_verfallen:true});
  const h=m=>a2MessZeileHtml(m,"x","");
  o.eigene=h(eigene); o.fremde=h(fremde); o.frei=h(frei); o.verf=h(verf);
  // Ablauf
  const rufe=[]; const alt=sb.rpc;
  sb.rpc=async(n,a)=>{rufe.push([n,a&&a.p_id]);return {data:Object.assign({},eigene,{workflow_status:"freigegeben",ruester_id:"ich",monteur_id:"ich"}),error:null}};
  projectMeasurementsCache=[eigene,fremde];
  const frage=[]; window.confirm=t=>{frage.push(t);return o.antwort!==false};
  o.antwort=false; await mwFreigebenAusListe(1); o.abgelehnt=rufe.length;
  o.antwort=true; await mwFreigebenAusListe(2); o.fremdRufe=rufe.length;
  await mwFreigebenAusListe(1); o.rufe=rufe.slice(); o.frage=frage.length;
  o.status=projectMeasurementsCache[0].workflow_status;
  o.formularOffen=$("measurementEditModal")?!$("measurementEditModal").hidden:false;
  sb.rpc=alt;
  return o;
 });
 p(/data-a2-meas="1"/.test(r.eigene)&&/<button[^>]*class="a2-zeile"[^>]*data-a2-meas/.test(r.eigene),"die Zeile oeffnet die Massaufnahme (data-a2-meas)",r.eigene.slice(0,200));
 p(!/class="a2-zeile"[^>]*data-a2-rb/.test(r.eigene)&&/data-a2-rb="1"/.test(r.eigene),"Ruestblatt hat einen eigenen Knopf, die Zeile klappt nichts auf");
 p(/data-a2-freigeben="1"/.test(r.eigene)&&/Freigeben/.test(r.eigene),"eigene, noch nicht freigegebene: Knopf Freigeben");
 p(/Erneut freigeben/.test(r.verf),"verfallene Freigabe: Knopf 'Erneut freigeben'");
 p(!/data-a2-freigeben/.test(r.fremde),"Gegenprobe: fremde Massaufnahme -> kein Knopf",r.fremde.slice(0,100));
 p(!/data-a2-freigeben/.test(r.frei),"Gegenprobe: bereits freigegeben -> kein Knopf");
 p(r.abgelehnt===0,"Rueckfrage abgelehnt -> nichts passiert");
 p(r.fremdRufe===0,"Gegenprobe: fremde Massaufnahme laesst sich nicht freigeben");
 p(r.rufe.length===1&&r.rufe[0][0]==="measurement_freigeben"&&r.rufe[0][1]===1,"Freigabe ruft measurement_freigeben fuer genau diese Aufnahme",r.rufe);
 p(r.status==="freigegeben"&&r.formularOffen===false,"Liste ist nachgezogen, das Formular blieb zu",r);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
