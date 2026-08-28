/* Spengler Digital V1.49 – extracted module; logic unchanged */
"use strict";
// ============================================================
// Supabase-Anbindung
// WICHTIG: Vor dem Einsatz die beiden Werte unten eintragen
// (Supabase-Projekt → Settings → API → "Project URL" / "anon public key").
// Ausserdem im SQL-Editor das mitgelieferte supabase-setup.sql einmal
// ausführen und unter Authentication → Settings die
// E-Mail-Bestätigung ("Confirm email") deaktivieren, siehe SETUP.md.
// ============================================================
const SUPABASE_URL="https://nfgryuzkpwjfmdlmevuy.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

// Firmen-Code für die öffentliche "Neuer Mitarbeiter"-Registrierung auf der Login-Seite.
// Kein starker Schutz (steht im Quelltext), aber verhindert zufällige/automatisierte
// Registrierungen durch Aussenstehende, die zufällig auf die URL stossen.
// UNBEDINGT vor dem Einsatz auf einen eigenen Wert ändern und intern kommunizieren.
const COMPANY_CODE="kuenzi-intern";

let settings={employees:[],rates:[],materials:[]};
let employeeIds=[],rateIds=[],materialIds=[];
let currentProfile=null;
let allProfiles=[];
function profileName(id){
 if(!id)return null;
 const p=allProfiles.find(x=>x.id===id);
 return p?`${p.first_name} ${p.last_name}`:null;
}
function isAdmin(){
 return !!(currentProfile&&currentProfile.role==="admin");
}
async function renderFeedbackList(){
 if(!canView("feedback"))return;
 $("feedbackList").innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("feedback").select("*,profiles(first_name,last_name)").order("resolved",{ascending:true}).order("created_at",{ascending:false});
 if(error){$("feedbackList").innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 $("feedbackList").innerHTML=list.length?list.map(f=>{
  const wer=f.profiles?`${f.profiles.first_name} ${f.profiles.last_name}`:"Unbekannt";
  const wann=f.created_at?new Date(f.created_at).toLocaleString("de-CH"):"–";
  return `<div class="settingrow" style="display:block;padding:10px${f.resolved?";opacity:.55":""}">
<div class="small" style="color:var(--muted)"><b>${esc(f.module)}</b> · ${esc(wer)} · ${esc(wann)}${f.resolved?" · ✓ erledigt":""}</div>
<div style="margin-top:4px;white-space:pre-wrap${f.resolved?";text-decoration:line-through":""}">${esc(f.message)}</div>
<div class="bar" style="margin-top:6px">
${canEdit("feedback")?`<button type="button" class="gray" data-feedback-toggle="${f.id}" data-resolved="${f.resolved?"1":"0"}">${f.resolved?"↩️ Als offen markieren":"✓ Als erledigt markieren"}</button>`:""}
${canEdit("feedback")?`<button type="button" class="red" data-feedback-del="${f.id}">Löschen</button>`:""}
</div>
</div>`;
 }).join(""):'<div class="empty">Noch kein Feedback vorhanden.</div>';
}
let companyName="PETER KÜNZI AG";
let companyAddress="";
let logoUrl="";
let defaultVat="8.1 %";
let logoDataUrl=null;
let recentCount=Number(localStorage.getItem("sd_recentCount"))||5;
let isDirty=false;
let darkMode=localStorage.getItem("sd_darkMode")==="ja";
let defaultRate=localStorage.getItem("sd_defaultRate")||"";
let photoQuality=localStorage.getItem("sd_photoQuality")||"schnell";
document.documentElement.classList.toggle("dark",darkMode);
function photoQualitySettings(){
 return photoQuality==="hoch"?{maxDim:2200,quality:0.9}:{maxDim:1400,quality:0.75};
}
let einlaufblechSettings=JSON.parse(localStorage.getItem("sd_einlaufblechSettings")||"null")||{stoss_laenge:2000,ueberlappung:40,gehrungszugabe:0,umschlag_oben:0,umschlag_unten:0,rest_schwelle:500,end_zugabe:10};
if(einlaufblechSettings.end_zugabe===undefined)einlaufblechSettings.end_zugabe=10;
let einlaufblechKonischSettings=JSON.parse(localStorage.getItem("sd_einlaufblechKonischSettings")||"null")||{stoss_laenge:2000,ueberlappung:40,gehrungszugabe:0,umschlag_oben:0,umschlag_unten:0,rest_schwelle:500,end_zugabe:10};
if(einlaufblechKonischSettings.end_zugabe===undefined)einlaufblechKonischSettings.end_zugabe=10;
let blitzschutzMaterials=[];
let rinneFittingTypes=[];
let isMike=false;
let permissionMap={};
let allProjects=[],currentProjectId=null,currentReportId=null;
let currentReportMeta={};
let projectReportsCache=[];
let projectMeasurementsCache=[];
let projectAusmassCache=[];
let recentMeasurementsCache=[];
let recentReportsCache=[];
let globalSearchCache=[];
let recentAusmassCache=[];
let measEditReturnTo="measurementsModal";
let works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:"",rateName:"",hours:0}];
let mats=[];
let selectedSheet=null,cuts=[{l:"",b:"",q:1}];

function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

const $=id=>document.getElementById(id);
$("openFeedback").onclick=()=>{
 $("feedbackModul").value="Allgemein";
 $("feedbackMessage").value="";
 $("feedbackModal").hidden=false;
};
$("cancelFeedback").onclick=()=>{$("feedbackModal").hidden=true};
$("feedbackList").addEventListener("click",async e=>{
 const toggle=e.target.closest("[data-feedback-toggle]");
 if(toggle){
  const id=Number(toggle.dataset.feedbackToggle);
  const neuerStatus=toggle.dataset.resolved!=="1";
  const {error}=await sb.from("feedback").update({resolved:neuerStatus}).eq("id",id);
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
  return;
 }
 const del=e.target.closest("[data-feedback-del]");
 if(del){
  if(!confirm("Dieses Feedback wirklich löschen?"))return;
  const {error}=await sb.from("feedback").delete().eq("id",Number(del.dataset.feedbackDel));
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
 }
});
$("saveFeedback").onclick=async()=>{
 const message=$("feedbackMessage").value.trim();
 if(!message){alert("Bitte ein Feedback eingeben.");return}
 $("saveFeedback").disabled=true;
 const {error}=await sb.from("feedback").insert({
  module:$("feedbackModul").value,
  message,
  created_by:currentProfile?currentProfile.id:null
 });
 $("saveFeedback").disabled=false;
 if(error){alert("Fehler beim Senden: "+error.message);return}
 $("feedbackModal").hidden=true;
 alert("Danke für dein Feedback!");
};
const money=n=>Number(n||0).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function initials(name){
 const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
 return parts.map(p=>p.replace(/[^A-Za-zÄÖÜäöüÉéÀàÈè]/g,"").slice(0,1)).join("").toUpperCase();
}

async function loadMyPermissions(){
 if(!currentProfile){permissionMap={};return;}
 if(currentProfile.role==="admin"){permissionMap={};return;}
 const {data,error}=await sb.rpc("get_my_permissions");
 permissionMap=(!error&&data&&typeof data==="object")?data:{};
}
function canView(resource){return isAdmin()||!!permissionMap?.[resource]?.view;}
function canEdit(resource){return isAdmin()||!!permissionMap?.[resource]?.edit;}
function requireEdit(resource){if(canEdit(resource))return true;alert("Du hast für diesen Bereich keine Bearbeitungsberechtigung.");return false;}

function applyUiPermissions(){
 const viewMap=[["navReport","reports"],["navMeasurements","measurements"],["navAusmass","ausmass"],["startOpenProjects","projects"],["openFeedback","feedback"]];
 viewMap.forEach(([id,res])=>{const el=$(id);if(el)el.hidden=!canView(res);});
 const editMap=[["newReport","reports"],["newMeasurement","measurements"],["newAusmass","ausmass"]];
 editMap.forEach(([id,res])=>{const el=$(id);if(el)el.hidden=!canEdit(res);});
 const settingsBtn=$("settings");if(settingsBtn)settingsBtn.hidden=false;
}

function showStart(){
 $("startScreen").hidden=false;
 $("reportScreen").hidden=true;
}
function goToStart(){
 $("reportsModal").hidden=true;
 $("measurementsModal").hidden=true;
 $("measurementEditModal").hidden=true;
 $("projectsModal").hidden=true;
 $("settingsModal").hidden=true;
 $("sheetModal").hidden=true;
 $("ausmassModal").hidden=true;
 $("ausmassEditModal").hidden=true;
 $("measTypeChooserModal").hidden=true;
 $("amTypeChooserModal").hidden=true;
 $("globalSearchModal").hidden=true;
 measEditReturnTo="measurementsModal";
 amEditReturnTo="ausmassModal";
 showStart();
}
$("openGlobalSearch").onclick=()=>{
 $("globalSearchModal").hidden=false;
 $("globalSearchInput").value="";
 $("globalSearchResults").innerHTML="";
 $("globalSearchStatus").textContent="";
 $("globalSearchInput").focus();
};
$("closeGlobalSearch").onclick=()=>{$("globalSearchModal").hidden=true};
$("startFromGlobalSearch").onclick=()=>goToStart();
const debouncedGlobalSearch=debounce(async(q)=>{
 q=q.trim();
 if(!q){$("globalSearchResults").innerHTML="";$("globalSearchStatus").textContent="";return}
 $("globalSearchStatus").textContent="Suche läuft …";
 const like=`%${q}%`;
 const [repRes,measRes,amRes]=await Promise.all([
  sb.from("reports").select("*").or(`customer.ilike.${like},object.ilike.${like},order_no.ilike.${like}`).order("date",{ascending:false}).limit(30),
  sb.from("measurements").select("*").ilike("title",like).order("date",{ascending:false}).limit(30),
  sb.from("ausmass").select("*").ilike("title",like).order("date",{ascending:false}).limit(30),
 ]);
 const qLower=q.toLowerCase();
 const projMatches=allProjects.filter(p=>String(p.name||"").toLowerCase().includes(qLower));
 const projIds=new Set(projMatches.map(p=>p.id));
 let reports=repRes.data||[];
 let measurements=measRes.data||[];
 let ausmasse=amRes.data||[];
 if(projIds.size){
  const [r2,m2,a2]=await Promise.all([
   sb.from("reports").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
   sb.from("measurements").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
   sb.from("ausmass").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
  ]);
  const mergeById=(a,b)=>{const seen=new Set(a.map(x=>x.id));return a.concat((b||[]).filter(x=>!seen.has(x.id)))};
  reports=mergeById(reports,r2.data);
  measurements=mergeById(measurements,m2.data);
  ausmasse=mergeById(ausmasse,a2.data);
 }
 const results=[
  ...reports.map(r=>({kind:"report",data:r})),
  ...measurements.map(m=>({kind:"measurement",data:m})),
  ...ausmasse.map(a=>({kind:"ausmass",data:a})),
 ];
 globalSearchCache=results;
 const measTypeLabels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade",rinne_halbrund:"Rinne Halbrund",einlaufblech_konisch:"Einlaufblech konisch",freies_profil:"Freies Profil"};
 const amTypeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 $("globalSearchStatus").textContent=`${results.length} Treffer`;
 $("globalSearchResults").innerHTML=results.length?results.map((r,i)=>{
  const proj=allProjects.find(p=>p.id===r.data.project_id);
  let label,sub,icon;
  if(r.kind==="report"){icon="📋";label="Regierapport";sub=`${proj?proj.name:(r.data.customer||"Ohne Projekt")} · ${r.data.date||"–"} · ${r.data.order_no||"–"}`}
  else if(r.kind==="measurement"){icon="📐";label=`Massaufnahme (${measTypeLabels[r.data.type]||r.data.type})`;sub=`${r.data.title||"Ohne Titel"} · ${proj?proj.name:"Kein Projekt"} · ${r.data.date||"–"}`}
  else{icon="📏";label=`Ausmass (${amTypeLabels[r.data.type]||r.data.type})`;sub=`${r.data.title||"Ohne Titel"} · ${proj?proj.name:"Kein Projekt"} · ${r.data.date||"–"}`}
  return `<div class="meas-row">
<div class="meas-row-info"><b>${icon} ${esc(label)}</b><span>${esc(sub)}</span></div>
<div class="meas-row-actions"><button class="blue" data-open-search-result="${i}" title="Öffnen">✏️</button></div>
</div>`;
 }).join(""):"<div class=\"empty\">Keine Treffer.</div>";
},400);
$("globalSearchInput").addEventListener("input",e=>debouncedGlobalSearch(e.target.value));
$("globalSearchResults").addEventListener("click",e=>{
 const b=e.target.closest("[data-open-search-result]");
 if(!b)return;
 const r=globalSearchCache[Number(b.dataset.openSearchResult)];
 if(!r)return;
 $("globalSearchModal").hidden=true;
 if(r.kind==="report")openReport(r.data);
 else if(r.kind==="measurement")openMeasurement(r.data);
 else openAusmass(r.data);
});
$("navReport").onclick=async()=>{$("reportsModal").hidden=false;await renderReportsOverview()};
$("startFromReportEdit").onclick=()=>{goToStart()};
$("reportEditSettingsShortcut").onclick=()=>openSettingsTo("protected","rates");
$("newReport").onclick=()=>{
 isDirty=false;
 currentProjectId=null;currentReportId=null;
 currentReportMeta={};
 works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=[];
 $("date").value=new Date().toISOString().slice(0,10);
 $("orderNo").value="";
 $("customer").value="";
 $("object").value="";
 $("vat").value=defaultVat;
 renderProjectSelect();
 renderMain();
 $("reportsModal").hidden=true;
 $("startScreen").hidden=true;
 $("reportScreen").hidden=false;
};
async function renderReportsOverview(){
 const {data,error}=await sb.from("reports").select("*").order("created_at",{ascending:false}).limit(recentCount);
 if(error){$("recentReportsList").innerHTML=`<div class="empty">Fehler: ${esc(error.message)}</div>`;return}
 const rows=data||[];
 recentReportsCache=rows;
 $("recentReportsList").innerHTML=rows.length?rows.map(r=>{
  const proj=allProjects.find(p=>p.id===r.project_id);
  return `<div class="meas-row">
<div class="meas-row-info"><b>Regierapport</b><span>${esc(proj?proj.name:(r.customer||"Ohne Projekt"))} · ${esc(r.date||"–")} · ${esc(r.order_no||"–")}</span></div>
<div class="meas-row-actions">
<button class="blue" data-open-report-overview="${r.id}" title="Öffnen">✏️</button>
<button class="red" data-del-report-overview="${r.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Rapporte vorhanden.</div>';
}
$("recentReportsList").addEventListener("click",e=>{
 const o=e.target.closest("[data-open-report-overview]");
 if(o){const r=recentReportsCache.find(x=>x.id===Number(o.dataset.openReportOverview));if(r)openReport(r);return}
 const d=e.target.closest("[data-del-report-overview]");
 if(d){
  if(!confirm("Diesen Rapport wirklich löschen?"))return;
  sb.from("reports").delete().eq("id",Number(d.dataset.delReportOverview)).then(({error})=>{
   if(error){alert("Fehler: "+error.message);return}
   if(currentReportId===Number(d.dataset.delReportOverview))currentReportId=null;
   renderReportsOverview();
  });
 }
});
$("closeReports").onclick=()=>{$("reportsModal").hidden=true};
$("reportSettingsShortcut").onclick=()=>openSettingsTo("protected","rates");
$("startFromReports").onclick=()=>goToStart();
$("exportReportsCsv").onclick=async()=>{
 $("exportReportsCsv").disabled=true;
 const {data,error}=await sb.from("reports").select("*").order("date",{ascending:false});
 $("exportReportsCsv").disabled=false;
 if(error){alert("Fehler: "+error.message);return}
 const rows=data||[];
 if(!rows.length){alert("Keine Rapporte zum Exportieren vorhanden.");return}
 const header=["Datum","Projekt","Auftrags-Nr.","Auftraggeber","Adresse","Arbeitsstunden","Arbeitsbetrag CHF","Materialbetrag CHF","MWST","Gesamtbetrag CHF (inkl. MWST)"];
 const csvRows=[header];
 for(const r of rows){
  const proj=allProjects.find(p=>p.id===r.project_id);
  const works=r.work_entries||[];
  const mats2=r.material_entries||[];
  const hours=works.reduce((s,w)=>s+(Number(w.hours)||0),0);
  const workTotal=works.reduce((s,w)=>s+(Number(w.hours)||0)*rateFor(w.rateName),0);
  const matTotal=mats2.reduce((s,m)=>{const x=materialFor(m.no);return s+(x?Number(String(x[4]).replace(",","."))*Number(m.qty||0):0)},0);
  const vat=Number(String(r.vat||"0").replace(",",".").replace("%",""))||0;
  const gross=(workTotal+matTotal)*(1+vat/100);
  csvRows.push([r.date||"",proj?proj.name:"",r.order_no||"",r.customer||"",r.object||"",hours.toFixed(2),workTotal.toFixed(2),matTotal.toFixed(2),r.vat||"",gross.toFixed(2)]);
 }
 const csv=csvRows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=`Regierapporte_${new Date().toISOString().slice(0,10)}.csv`;
 document.body.appendChild(a);a.click();document.body.removeChild(a);
 URL.revokeObjectURL(url);
};
$("startFromProjects").onclick=()=>{goToStart()};
$("startFromMeasurements").onclick=()=>{goToStart()};
$("measurementSettingsShortcut").onclick=()=>openSettingsTo("measurements");
$("startFromMeasurementEdit").onclick=()=>{goToStart()};
$("measurementEditSettingsShortcut").onclick=()=>{
 const type=$("measType").value;
 if(type==="rinne_halbrund")openSettingsTo("measurements","rinne");
 else if(type==="einlaufblech_gerade")openSettingsTo("measurements","einlaufblech");
 else openSettingsTo("measurements");
};
$("startFromSettings").onclick=()=>{goToStart()};
$("startFromSheet").onclick=()=>{goToStart()};

