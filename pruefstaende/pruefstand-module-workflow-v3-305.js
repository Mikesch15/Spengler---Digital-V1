// Prueft v3.305 (Auftrag "End-to-End-Pruefung: deaktivierte Module und Workflow-Uebergaenge"):
// Matrix Arbeitsablauf (firmenweit workflow_aktiv) x Werkstatt-Modul gegen das, was die Oberflaeche daraus macht.
// Gefunden: (1) bei AUS blieb die Werkstatt mit alten Stati und "Rüsten bestätigen" sichtbar, waehrend
// Aufgaben, Badge und Cockpit-Karte den Ablauf ausblenden; (2) bei AUS wird nie etwas "abgeschlossen" -
// Archivieren war nur fuer Abgeschlossene da und damit fuer immer unerreichbar.
// Ausdruecklich NICHT belegt (keine echte Datenbank): serverseitige Rechte, RLS, Mandantentrennung. Die Module
// sind nach Code und Kommentar reine Bedienung (js/47); die Absicherung liegt in den measurement_*-Funktionen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,360):""))}};

const STUB=`window.__ruf=[];
window.__db={mess:[],res:[],fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='measurements'?window.__db.mess:
               (name==='material_reservierungen'?window.__db.res:[]);
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:r[k]===v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice()});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:{id:(a&&a.p_id)||0,workflow_status:'geruestet'},error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const mk=(id,status,extra)=>Object.assign({id,project_id:7,type:"rinne",title:"M"+id,date:"2026-09-01",
 workflow_status:status,freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,geruestet_am:null,
 montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,archived:false,data:{}},extra||{});
const MESS=[mk(51,"in_bearbeitung",{ruester_id:null}),mk(52,"zu_ruesten"),mk(53,"abgeschlossen",{ruester_id:null})];
(async()=>{
 const browser=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});
 const lauf=(workflow,werkstatt)=>page.evaluate(async ([ich,m,wf,ws])=>{
  currentProfile={id:ich,role:"employee",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:false}; appSettingsId=1;
  allProjects=[{id:7,name:"Aktiv",object:"Musterstrasse 12"}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000]; blechSchnittfuge=0; workflowAktiv=wf;
  window.__db.mess=JSON.parse(JSON.stringify(m));
  pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:ws,versionierung:true});
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  werkstattKnopfAktualisieren();
  await werkLaden();
  await aufgabenNeuLaden();
  await loadProjectMeasurements(7);
  const arch=[...document.querySelectorAll("#cockpitMeasBody [data-archive-measurement]")].map(b=>Number(b.dataset.archiveMeasurement)).sort((a,b)=>a-b);
  renderProjektmodule();
  return {werkAktiv:werkAktiv(),nav:$("navWerkstatt")?$("navWerkstatt").hidden:null,
   werk:werkZeilen.map(z=>z.id).sort(),aufgaben:aufgabenListe.length,arch,
   hinweis:/Wirkt nur bei eingeschaltetem Arbeitsablauf/.test(($("pmListe")||{textContent:""}).textContent),
   badge:mwBadgeFuerListe(m[1])};
 },[ICH,MESS,workflow,werkstatt]);
 const A=await lauf(true,true), B=await lauf(false,true), C=await lauf(true,false), D=await lauf(true,true);

 console.log("\nA · Arbeitsablauf AN, Werkstatt AN (Normalfall)");
 p(A.werkAktiv&&A.nav===false&&JSON.stringify(A.werk)==="[52]","Werkstatt sichtbar und zeigt die zu rüstende Aufnahme",A);
 p(A.aufgaben>=1,"die Aufgabenliste enthält die Rüst-Aufgabe",A.aufgaben);
 p(JSON.stringify(A.arch)==="[53]","Archivieren nur für die abgeschlossene Aufnahme (53)",A.arch);
 p(A.badge!=="","Status-Badge in der Liste",A.badge);

 console.log("\nB · Arbeitsablauf AUS, Werkstatt-Modul AN");
 p(B.werkAktiv===false&&B.nav===true&&B.werk.length===0,"Werkstatt ist weg (kein Einstieg, keine Zeilen, kein 'Rüsten bestätigen')",B);
 p(B.aufgaben===0&&B.badge==="","Aufgaben und Badge sind ebenfalls aus - kein Widerspruch zwischen den Ansichten",B);
 p(JSON.stringify(B.arch)==="[51,52,53]","Archivieren ist für JEDE Massaufnahme möglich (sonst für immer unerreichbar)",B.arch);
 p(B.hinweis,"die Einstellungsseite sagt, dass die Werkstatt den Arbeitsablauf braucht",B.hinweis);

 console.log("\nC · Arbeitsablauf AN, Werkstatt-Modul AUS");
 p(C.werkAktiv===false&&C.nav===true,"Werkstatt weg",C);
 p(C.aufgaben>=1,"Gegenprobe: der Rüster behält seine Aufgabe in «Heute» (Rüsten bleibt ohne Werkstatt erreichbar)",C.aufgaben);
 p(JSON.stringify(C.arch)==="[53]"&&C.hinweis===false,"Archivieren wie im Normalfall; kein Hinweis zum Arbeitsablauf",C);

 console.log("\nD · wieder AN: nichts ging verloren");
 p(D.werkAktiv&&JSON.stringify(D.werk)==="[52]"&&D.aufgaben>=1,"Werkstatt und Aufgaben sind mit dem Arbeitsablauf wieder da (Daten unberührt)",D);
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();
