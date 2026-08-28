"use strict";
// ---- Fehleranzeige -------------------------------------------------
// Zeigt Programmfehler unten am Bildschirm an. Ohne das bleibt am Handy
// jeder Fehler unsichtbar und die App wirkt einfach "kaputt".
(function(){
 function zeige(text){
  let box=document.getElementById("fehlerBanner");
  if(!box){
   box=document.createElement("div");
   box.id="fehlerBanner";
   box.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#7f1d1d;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:10px 40px 10px 12px;white-space:pre-wrap;word-break:break-word;max-height:45vh;overflow:auto";
   const zu=document.createElement("button");
   zu.textContent="×";
   zu.style.cssText="position:absolute;top:6px;right:8px;background:transparent;color:#fff;border:0;font-size:20px;line-height:1;padding:0;width:auto;min-height:0";
   zu.onclick=()=>box.remove();
   box.appendChild(zu);
   const p=document.createElement("div");
   p.id="fehlerBannerText";
   box.appendChild(p);
   (document.body||document.documentElement).appendChild(box);
  }
  const ziel=document.getElementById("fehlerBannerText");
  ziel.textContent=(ziel.textContent?ziel.textContent+"\n\n":"")+text;
 }
 window.addEventListener("error",e=>{
  zeige("Fehler: "+(e.message||"unbekannt")+"\n"+(e.filename||"").split("/").pop()+" Zeile "+(e.lineno||"?"));
 });
 window.addEventListener("unhandledrejection",e=>{
  zeige("Fehler (unerledigt): "+((e.reason&&e.reason.message)||e.reason||"unbekannt"));
 });
})();
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
 // Administrator ist, wer das Recht "admin" hat (siehe 05a-rechte.js).
 return !!(currentProfile&&currentProfile.role==="admin");
}
async function renderFeedbackList(){
 if(!isAdmin())return;
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
<button type="button" class="gray" data-feedback-toggle="${f.id}" data-resolved="${f.resolved?"1":"0"}">${f.resolved?"↩️ Als offen markieren":"✓ Als erledigt markieren"}</button>
<button type="button" class="red" data-feedback-del="${f.id}">Löschen</button>
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
const EINLAUFBLECH_STANDARD=Object.freeze({stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10});
// Standardwerte für beide Einlaufblech-Typen. Gespeicherte Werte des Geräts
// haben Vorrang – zurücksetzen geht über den Knopf in den Einstellungen.
let einlaufblechSettings=JSON.parse(localStorage.getItem("sd_einlaufblechSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechSettings.end_zugabe===undefined)einlaufblechSettings.end_zugabe=10;
let einlaufblechKonischSettings=JSON.parse(localStorage.getItem("sd_einlaufblechKonischSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechKonischSettings.end_zugabe===undefined)einlaufblechKonischSettings.end_zugabe=10;
let blitzschutzMaterials=[];
let rinneFittingTypes=[];
// Mass des Dilatationselements (Rinne Halbrund), je angrenzendem Stück.
// Negativ = wird abgezogen. Firmenweit, kommt aus app_settings.
let rinneDilaMass=-165;
// Masse für die Mauerabdeckung, firmenweit aus app_settings.
let madBodenMass=0;
let madSchieberMass=0;
let isMike=false;
let protectedUnlocked=false;
const PROTECTED_PASSWORD="Rinnen_ml95";
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

const $=id=>document.getElementById(id);
// Verzögert wiederholte Aufrufe (Suchfelder, Auto-Speichern).
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
