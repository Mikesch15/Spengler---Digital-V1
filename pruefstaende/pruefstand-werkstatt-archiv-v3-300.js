// Prueft v3.300 (End-to-End-Prozesspruefung, Uebergang Werkstatt <-> Aufgaben/Projekte):
// Was archiviert ist, ist keine offene Arbeit. Die Aufgabenliste ("Heute", js/45) schliesst
// archivierte Massaufnahmen UND Massaufnahmen archivierter Projekte aus - die Werkstatt (js/51)
// zeigte sie bis v3.299 trotzdem, samt "Rüsten bestätigen". Jetzt zeigen beide dasselbe.
// Gegenproben: eine nicht archivierte Aufnahme im aktiven Projekt steht weiter da; fehlt
// "archived" ganz (aeltere Zeilen/Fixtures), gilt sie als nicht archiviert.
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
const mk=(id,pid,extra)=>Object.assign({id,project_id:pid,type:"rinne",title:"M"+id,date:"2026-09-01",
 workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,geruestet_am:null,
 montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,data:{}},extra||{});
const MESS=[
 mk(21,7),                              // aktives Projekt, normal -> sichtbar
 mk(22,7,{archived:false}),             // ausdruecklich nicht archiviert -> sichtbar
 mk(23,7,{archived:true}),              // Massaufnahme archiviert -> NICHT sichtbar
 mk(24,9,{archived:false}),             // Projekt archiviert -> NICHT sichtbar
 mk(25,9,{workflow_status:"zu_montieren",monteur_id:ICH,ruester_id:null})  // dito, Montage
];
(async()=>{
 const browser=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});
 const r=await page.evaluate(async ([mess,ich])=>{
  currentProfile={id:ich,role:"employee",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:false}; appSettingsId=1;
  allProjects=[{id:7,name:"Aktiv",object:"Musterstrasse 12"},{id:9,name:"Alt",object:"Altweg 1",archived:true}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000]; blechSchnittfuge=0; workflowAktiv=true;
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true});
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  try{localStorage.setItem("sd_werkFilter","alle")}catch(e){}
  werkOffen=null; werkGrundlage=null; werkFilter="alle";
  await werkLaden();
  const ids=werkZeilen.map(z=>z.id).sort((a,b)=>a-b);
  const aufgaben=(typeof aufgabenLaden==="function")?await aufgabenLaden():null;
  return {ids,aufgaben:aufgaben&&aufgaben.map?aufgaben.map(a=>a.id||a.massaufnahme||a.m&&a.m.id):null};
 },[MESS,ICH]);
 p(JSON.stringify(r.ids)==="[21,22]","Werkstatt zeigt nur 21 und 22 - nicht die archivierte Massaufnahme (23) und nicht die Projekt-archivierten (24, 25)",r.ids);
 p(r.ids.includes(21)&&r.ids.includes(22),"Gegenprobe: aktives Projekt, nicht archiviert (auch ohne Feld 'archived') bleibt sichtbar",r.ids);
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();
