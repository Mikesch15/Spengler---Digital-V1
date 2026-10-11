// Prueft v3.304 (End-to-End-Prozesspruefung, Punkt "nach Rueckkehr in die App keine veralteten Staende"):
// Die Aufgabenliste (js/45) laedt sich beim Zurueckkehren in die App selbst nach, die Werkstatt (js/51)
// tat das nicht - nach Stunden im Hintergrund stand dort noch der alte Stand, samt "Rüsten bestätigen".
// Jetzt gilt dieselbe Regel: ab einer Minute Alter wird nachgeladen. Gegenproben: ein frischer Stand wird
// NICHT neu geladen (keine unnoetigen Abfragen); eine geschlossene Werkstatt auch nicht.
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
const mk=(id,status)=>({id,project_id:7,type:"rinne",title:"M"+id,date:"2026-09-01",
 workflow_status:status,freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,geruestet_am:null,
 montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,data:{}});
(async()=>{
 const browser=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});
 await page.evaluate(([ich,m])=>{
  currentProfile={id:ich,role:"employee",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:false}; appSettingsId=1;
  allProjects=[{id:7,name:"Aktiv",object:"Musterstrasse 12"}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000]; blechSchnittfuge=0; workflowAktiv=true;
  window.__db.mess=JSON.parse(JSON.stringify(m));
  pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true});
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  try{localStorage.setItem("sd_werkFilter","alle")}catch(e){}
  werkFilter="alle";
 },[ICH,[mk(31,"zu_ruesten"),mk(32,"zu_ruesten")]]);
 // Gemessen wird, was AUF DEM SCHIRM steht (die Knoepfe der Karten), nicht die Daten im Speicher: die
 // Aufgabenliste laedt die gemeinsame Liste bei der Rueckkehr im Hintergrund mit, gezeichnet wird die offene
 // Werkstatt dadurch aber nicht.
 const sichtbar=()=>page.evaluate(()=>{const b=$("werkstattBody");
   // je Karte: Titel + Stand, wie auf dem Schirm (Karten sind zugeklappt, der Stand steht im Kopf)
   return [...b.querySelectorAll(".werk-karte")].map(x=>{const t=x.textContent.replace(/\s+/g," ");
     const m=t.match(/M3\d/);const st=/Zu montieren/i.test(t)?"montieren":(/Zu rüsten/i.test(t)?"ruesten":"?");
     return (m?m[0]:"??")+":"+st}).sort().join(",")});
 const abfragen=()=>page.evaluate(()=>0);
 const zurueck=async()=>{
  await page.evaluate(()=>{Object.defineProperty(document,"visibilityState",{value:"visible",configurable:true});
    document.dispatchEvent(new Event("visibilitychange"))});
  await page.waitForTimeout(300);
 };
 // Werkstatt oeffnen
 await page.evaluate(()=>werkstattOeffnen()); await page.waitForTimeout(300);
 // Die Werkstatt startet mit zugeklappten Projekten (v3.215) - fuer die Messung aufklappen, wie pruefstand-werkstatt-v3-09
 await page.evaluate(()=>{werkZuBlock.clear();renderWerkstatt()}); await page.waitForTimeout(200);
 const start=await sichtbar();
 p(start==="M31:ruesten,M32:ruesten","Ausgangslage: zwei Aufnahmen zu rüsten",start);
 // Jemand anderes aendert unterdessen den Stand (31 gerüstet, 32 Freigabe verfallen -> aus der Werkstatt)
 await page.evaluate(()=>{window.__db.mess=[Object.assign({},window.__db.mess[0],{workflow_status:"zu_montieren"}),Object.assign({},window.__db.mess[1],{workflow_status:"in_bearbeitung",freigabe_verfallen:true})]});
 // Gegenprobe 1: frischer Stand (< 1 Minute) -> keine neue Abfrage
 let vorher=await abfragen(); await zurueck();
 p(await sichtbar()===start,"Gegenprobe: bei frischem Stand (unter 1 Minute) bleibt die Anzeige, wie sie ist",await sichtbar());
 // Stand ist alt (2 Minuten im Hintergrund) -> Rueckkehr laedt neu
 await page.evaluate(()=>{werkStandZeit=Date.now()-120000});
 await zurueck();
 p(await sichtbar()==="M31:montieren","nach der Rückkehr (Stand 2 Minuten alt) zeigt die Werkstatt den NEUEN Stand: 31 jetzt zu montieren, 32 nicht mehr da",await sichtbar());
 // Gegenprobe 2: Werkstatt geschlossen -> kein Laden
 await page.evaluate(()=>{$("werkstattModal").hidden=true;werkStandZeit=Date.now()-120000});
 const davor=await page.evaluate(()=>$("werkstattBody").innerHTML);
 await page.evaluate(()=>{window.__db.mess=[Object.assign({},window.__db.mess[0],{workflow_status:"zu_ruesten"})]});
 await zurueck();
 p(await page.evaluate(()=>$("werkstattBody").innerHTML)===davor,"Gegenprobe: ist die Werkstatt geschlossen, wird nichts neu gezeichnet");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();
