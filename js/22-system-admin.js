"use strict";
// ---- System-Administration (Version 2.17) ---------------------------
// Betreiber-Firmenverwaltung, getrennt von der normalen Firmenadmin-Rolle.
// Sichtbar/nutzbar nur für Benutzer, die in system_admins eingetragen sind
// (siehe is_system_admin() in Supabase). Das Ausblenden des Menüpunkts hier
// ist reine UI-Führung - die eigentliche Absicherung liegt ausschliesslich
// serverseitig: die RLS-Policy "system_admin_select_all_companies" und die
// drei system_admin_*-Funktionen prüfen is_system_admin() bei jedem Aufruf
// selbst und lehnen sonst ab, unabhängig vom Frontend-Zustand.

let isSystemAdmin=false;
let sysAdminCompanies=[];
let sysAdminUserCounts={};
let sysAdminCurrentCompanyId=null;

const SYS_ADMIN_STATUS_LABELS={trial:"Testphase",active:"Aktiv",expired:"Abgelaufen",cancelled:"Gekündigt",suspended:"Gesperrt"};
function sysAdminFmtDate(v){
 return v?new Date(v).toLocaleDateString("de-CH"):"–";
}

async function checkSystemAdmin(){
 const {data,error}=await sb.rpc("is_system_admin");
 isSystemAdmin=!error&&!!data;
 $("navSystemAdmin").hidden=!isSystemAdmin;
}

$("navSystemAdmin").onclick=async()=>{
 $("systemAdminModal").hidden=false;
 await renderSystemAdminList();
};
$("closeSystemAdmin").onclick=()=>{$("systemAdminModal").hidden=true};

async function renderSystemAdminList(){
 const box=$("systemAdminCompanyList");
 box.innerHTML='<div class="small">Lädt…</div>';
 const [companiesRes,countsRes]=await Promise.all([
  sb.from("companies").select("*").order("name"),
  sb.rpc("system_admin_company_user_counts")
 ]);
 if(companiesRes.error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(companiesRes.error.message)}</div>`;return}
 sysAdminCompanies=companiesRes.data||[];
 sysAdminUserCounts={};
 (countsRes.data||[]).forEach(r=>{sysAdminUserCounts[r.company_id]=r.user_count});
 box.innerHTML=sysAdminCompanies.length?sysAdminCompanies.map(c=>`
<div class="settingrow" style="display:block;padding:10px;cursor:pointer" data-sysadmin-company="${c.id}">
<div style="font-weight:600">${esc(c.name)}</div>
<div class="small" style="color:var(--muted)">Status: ${esc(SYS_ADMIN_STATUS_LABELS[c.subscription_status]||c.subscription_status)} · Test bis: ${sysAdminFmtDate(c.trial_ends_at)} · ${sysAdminUserCounts[c.id]||0} Benutzer</div>
</div>`).join(""):'<div class="empty">Keine Firmen gefunden.</div>';
}

$("systemAdminCompanyList").addEventListener("click",e=>{
 const row=e.target.closest("[data-sysadmin-company]");
 if(!row)return;
 openSystemAdminCompany(row.dataset.sysadminCompany);
});

function openSystemAdminCompany(id){
 const c=sysAdminCompanies.find(x=>x.id===id);
 if(!c)return;
 sysAdminCurrentCompanyId=id;
 $("sysAdminActionError").textContent="";
 $("systemAdminCompanyName").textContent=c.name;
 $("systemAdminCompanyStatus").textContent=SYS_ADMIN_STATUS_LABELS[c.subscription_status]||c.subscription_status;
 $("systemAdminCompanyCreated").textContent=sysAdminFmtDate(c.created_at);
 $("systemAdminCompanyTrialDays").textContent=c.trial_days+" Tage";
 $("systemAdminCompanyTrialStart").textContent=sysAdminFmtDate(c.trial_started_at);
 $("systemAdminCompanyTrialEnd").textContent=sysAdminFmtDate(c.trial_ends_at);
 $("systemAdminCompanyUsers").textContent=String(sysAdminUserCounts[id]||0);
 $("sysAdminTrialDaysInput").value=c.trial_days;
 $("sysAdminTrialStartInput").value=c.trial_started_at?c.trial_started_at.slice(0,10):"";
 $("sysAdminStatusInput").value=c.subscription_status;
 $("systemAdminModal").hidden=true;
 $("systemAdminCompanyModal").hidden=false;
}

$("closeSystemAdminCompany").onclick=async()=>{
 $("systemAdminCompanyModal").hidden=true;
 $("systemAdminModal").hidden=false;
 await renderSystemAdminList();
};

$("sysAdminSaveTrial").onclick=async()=>{
 $("sysAdminActionError").textContent="";
 const days=Number($("sysAdminTrialDaysInput").value);
 const startVal=$("sysAdminTrialStartInput").value;
 if(!Number.isFinite(days)||days<0||days>3650){$("sysAdminActionError").textContent="Trial-Dauer muss zwischen 0 und 3650 Tagen liegen.";return}
 if(!startVal){$("sysAdminActionError").textContent="Bitte ein Trial-Beginn-Datum wählen.";return}
 const start=new Date(startVal+"T00:00:00Z");
 const ends=new Date(start.getTime()+days*24*60*60*1000);
 $("sysAdminSaveTrial").disabled=true;
 try{
  const {error}=await sb.rpc("system_admin_set_trial",{
   p_company_id:sysAdminCurrentCompanyId,
   p_trial_days:days,
   p_trial_started_at:start.toISOString(),
   p_trial_ends_at:ends.toISOString()
  });
  if(error){$("sysAdminActionError").textContent="Trial konnte nicht gespeichert werden: "+error.message;return}
  await renderSystemAdminList();
  openSystemAdminCompany(sysAdminCurrentCompanyId);
 }catch(err){
  $("sysAdminActionError").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("sysAdminSaveTrial").disabled=false;
 }
};

$("sysAdminSaveStatus").onclick=async()=>{
 $("sysAdminActionError").textContent="";
 const status=$("sysAdminStatusInput").value;
 $("sysAdminSaveStatus").disabled=true;
 try{
  const {error}=await sb.rpc("system_admin_set_status",{p_company_id:sysAdminCurrentCompanyId,p_status:status});
  if(error){$("sysAdminActionError").textContent="Status konnte nicht geändert werden: "+error.message;return}
  await renderSystemAdminList();
  openSystemAdminCompany(sysAdminCurrentCompanyId);
 }catch(err){
  $("sysAdminActionError").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("sysAdminSaveStatus").disabled=false;
 }
};
