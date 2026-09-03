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

const SYS_ADMIN_STATUS_LABELS={trial:"Testphase",active:"Aktiv",expired:"Abgelaufen",cancelled:"Gekündigt",suspended:"Deaktiviert"};
function sysAdminFmtDate(v){
 return v?new Date(v).toLocaleDateString("de-CH"):"–";
}
// Dezente Erfolgsbestätigung direkt im System-Admin-Bereich (kein Alert/
// Popup) - wird ausschliesslich NACH einem bereits erfolgreichen
// Speichervorgang aufgerufen, nie vorab. Verschwindet nach ein paar
// Sekunden automatisch wieder.
let sysAdminSuccessTimer=null;
function sysAdminShowSuccess(msg){
 clearTimeout(sysAdminSuccessTimer);
 const el=$("sysAdminActionSuccess");
 el.textContent="✓ "+msg;
 el.hidden=false;
 sysAdminSuccessTimer=setTimeout(()=>{el.hidden=true},4000);
}
// Gleiches Prinzip, aber in der Firmenliste (#systemAdminModal) statt in
// der Detailansicht - für Aktionen, nach denen die Detailansicht selbst
// nicht mehr sinnvoll ist (Firma gelöscht) oder noch gar nicht existiert
// (neue Firma registriert).
let sysAdminListSuccessTimer=null;
function sysAdminShowListSuccess(msg){
 clearTimeout(sysAdminListSuccessTimer);
 const el=$("sysAdminListSuccess");
 el.textContent="✓ "+msg;
 el.hidden=false;
 sysAdminListSuccessTimer=setTimeout(()=>{el.hidden=true},8000);
}

async function checkSystemAdmin(){
 const {data,error}=await sb.rpc("is_system_admin");
 isSystemAdmin=!error&&!!data;
 $("navSystemAdmin").hidden=!isSystemAdmin;
}

$("navSystemAdmin").onclick=async()=>{
 $("systemAdminModal").hidden=false;
 $("sysAdminSearchInput").value="";
 $("sysAdminFilterStatus").value="";
 renderModuleTestListe();
 if(typeof moduleTestHinweis==="function")moduleTestHinweis("");
 await renderSystemAdminList();
 // Feedback aller Firmen (v2.70): nutzt denselben Code wie die Firmenansicht
 // in js/02-feedback.js, nur mit der geschuetzten Betreiber-Abfrage.
 if(typeof renderFeedbackBetreiberListe==="function")await renderFeedbackBetreiberListe();
};
$("closeSystemAdmin").onclick=()=>{$("systemAdminModal").hidden=true};

async function renderSystemAdminList(){
 const box=$("systemAdminCompanyList");
 box.innerHTML='<div class="small">Lädt…</div>';
 const [companiesRes,countsRes]=await Promise.all([
  // Neueste Firmen zuerst.
  sb.from("companies").select("*").order("created_at",{ascending:false}),
  sb.rpc("system_admin_company_user_counts")
 ]);
 if(companiesRes.error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(companiesRes.error.message)}</div>`;return}
 sysAdminCompanies=companiesRes.data||[];
 sysAdminUserCounts={};
 // Eine einzige Abfrage für alle Firmen (keine N+1-Abfragen), liefert
 // seit Version 2.26 zusätzlich zur Gesamtzahl auch Admin-/
 // Mitarbeiterzahl getrennt für die Detailansicht.
 (countsRes.data||[]).forEach(r=>{sysAdminUserCounts[r.company_id]={user_count:r.user_count,admin_count:r.admin_count,employee_count:r.employee_count}});
 sysAdminRenderFilteredList();
}

function sysAdminRenderFilteredList(){
 const box=$("systemAdminCompanyList");
 if(!sysAdminCompanies.length){box.innerHTML='<div class="empty">Keine Firmen gefunden.</div>';return}
 const suche=$("sysAdminSearchInput").value.trim().toLowerCase();
 const statusFilter=$("sysAdminFilterStatus").value;
 const liste=sysAdminCompanies.filter(c=>
  (!suche||c.name.toLowerCase().includes(suche))&&
  (!statusFilter||c.subscription_status===statusFilter)
 );
 if(!liste.length){box.innerHTML='<div class="empty">Keine Firmen entsprechen der Suche/dem Filter.</div>';return}
 box.innerHTML=liste.map(c=>{
  const counts=sysAdminUserCounts[c.id]||{};
  return `<div class="settingrow" style="display:block;padding:10px;cursor:pointer" data-sysadmin-company="${c.id}">
<div style="font-weight:600">${esc(c.name)}${sysAdminZugriffHinweis(c)}</div>
<div class="small" style="color:var(--muted)">Status: ${esc(SYS_ADMIN_STATUS_LABELS[c.subscription_status]||c.subscription_status)} · Trial: ${esc(c.trial_days)} Tage · Test bis: ${sysAdminFmtDate(c.trial_ends_at)} · ${counts.user_count||0} Benutzer · Registriert: ${sysAdminFmtDate(c.created_at)}</div>
</div>`;
 }).join("");
}

// Version 2.27: kurzer, farblich hervorgehobener Hinweis direkt neben dem
// Firmennamen, wenn der normale App-Zugriff dieser Firma gesperrt ist
// (abgelaufenes Trial oder deaktiviert) - deckt sich mit derselben Regel
// wie is_company_access_allowed()/my_company_id() in der Datenbank.
function sysAdminZugriffHinweis(c){
 const abgelaufen=c.trial_ends_at&&new Date(c.trial_ends_at).getTime()<=Date.now();
 if(c.subscription_status==="trial"&&abgelaufen){
  const tage=Math.floor((Date.now()-new Date(c.trial_ends_at).getTime())/(24*60*60*1000));
  return ` <span class="small" style="color:var(--red);font-weight:600">Abgelaufen seit ${tage} Tag${tage===1?"":"en"}</span>`;
 }
 if(c.subscription_status==="expired")return ' <span class="small" style="color:var(--red);font-weight:600">Abgelaufen</span>';
 if(c.subscription_status==="suspended")return ' <span class="small" style="color:var(--red);font-weight:600">Deaktiviert</span>';
 if(c.subscription_status==="cancelled")return ' <span class="small" style="color:var(--red);font-weight:600">Gekündigt</span>';
 return "";
}

$("sysAdminSearchInput").addEventListener("input",sysAdminRenderFilteredList);
$("sysAdminFilterStatus").addEventListener("change",sysAdminRenderFilteredList);

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
 clearTimeout(sysAdminSuccessTimer);
 $("sysAdminActionSuccess").hidden=true;
 $("systemAdminCompanyName").textContent=c.name;
 $("systemAdminCompanyStatus").textContent=SYS_ADMIN_STATUS_LABELS[c.subscription_status]||c.subscription_status;
 $("systemAdminCompanyCreated").textContent=sysAdminFmtDate(c.created_at);
 $("systemAdminCompanyTrialDays").textContent=c.trial_days+" Tage";
 $("systemAdminCompanyTrialStart").textContent=sysAdminFmtDate(c.trial_started_at);
 $("systemAdminCompanyTrialEnd").textContent=sysAdminFmtDate(c.trial_ends_at);
 const counts=sysAdminUserCounts[id]||{};
 $("systemAdminCompanyUsers").textContent=String(counts.user_count||0);
 $("systemAdminCompanyAdmins").textContent=String(counts.admin_count||0);
 $("systemAdminCompanyEmployees").textContent=String(counts.employee_count||0);
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
  sysAdminShowSuccess("Trial-Dauer erfolgreich auf "+days+" Tage gesetzt.");
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
  sysAdminShowSuccess("Firmenstatus erfolgreich auf „"+(SYS_ADMIN_STATUS_LABELS[status]||status)+"“ gesetzt.");
 }catch(err){
  $("sysAdminActionError").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("sysAdminSaveStatus").disabled=false;
 }
};

// ---- Firma endgültig löschen ---------------------------------------
// Zweistufige Sicherheitsbestätigung (Firma auswählen -> exakten Namen
// eintippen), die serverseitige Prüfung (system-admin-delete-company)
// vergleicht den Bestätigungsnamen zusätzlich nochmals gegen den
// tatsächlichen, aktuellen Firmennamen - der Client-Vergleich hier ist
// nur UI-Komfort (Knopf erst aktiv, wenn der Name exakt passt).
let sysAdminDeleteCompanyName="";

$("sysAdminOpenDelete").onclick=()=>{
 const c=sysAdminCompanies.find(x=>x.id===sysAdminCurrentCompanyId);
 if(!c)return;
 sysAdminDeleteCompanyName=c.name;
 $("sysAdminDeleteCompanyLine").textContent="Firma: "+c.name;
 $("sysAdminDeleteConfirmInput").value="";
 $("sysAdminDeleteError").textContent="";
 $("sysAdminConfirmDelete").disabled=true;
 $("sysAdminConfirmDelete").textContent="ENDGÜLTIG LÖSCHEN";
 $("systemAdminDeleteModal").hidden=false;
};
$("sysAdminCancelDelete").onclick=()=>{$("systemAdminDeleteModal").hidden=true};
$("sysAdminDeleteConfirmInput").addEventListener("input",()=>{
 $("sysAdminConfirmDelete").disabled=$("sysAdminDeleteConfirmInput").value!==sysAdminDeleteCompanyName;
});
$("sysAdminConfirmDelete").onclick=async()=>{
 if($("sysAdminDeleteConfirmInput").value!==sysAdminDeleteCompanyName)return;
 $("sysAdminDeleteError").textContent="";
 $("sysAdminConfirmDelete").disabled=true;
 $("sysAdminCancelDelete").disabled=true;
 $("sysAdminConfirmDelete").textContent="Wird gelöscht…";
 try{
  const {data,error}=await sb.functions.invoke("system-admin-delete-company",{body:{
   company_id:sysAdminCurrentCompanyId,
   confirm_name:$("sysAdminDeleteConfirmInput").value
  }});
  if(error){$("sysAdminDeleteError").textContent=await edgeFunctionErrorMessage(error,"Firma konnte nicht gelöscht werden.");return}
  if(!data?.ok){$("sysAdminDeleteError").textContent=data?.error||"Firma konnte nicht gelöscht werden.";return}
  $("systemAdminDeleteModal").hidden=true;
  $("systemAdminCompanyModal").hidden=true;
  $("systemAdminModal").hidden=false;
  await renderSystemAdminList();
  sysAdminShowListSuccess("Firma "+data.company.name+" wurde vollständig gelöscht ("+data.deleted.users+" Benutzer, "+data.deleted.projects+" Projekte, "+data.deleted.storage_files+" Storage-Dateien).");
 }catch(err){
  $("sysAdminDeleteError").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("sysAdminConfirmDelete").disabled=($("sysAdminDeleteConfirmInput").value!==sysAdminDeleteCompanyName);
  $("sysAdminCancelDelete").disabled=false;
  $("sysAdminConfirmDelete").textContent="ENDGÜLTIG LÖSCHEN";
 }
};

// ---- Neue Firma registrieren ----------------------------------------
// Verwendet dieselbe register-company Edge Function wie zuvor der
// öffentliche Login-Flow (jetzt serverseitig auf System-Admins
// beschränkt, siehe register-company selbst). Wichtig: hier NICHT wie
// beim alten Login-Flow automatisch anmelden - der bereits eingeloggte
// System-Admin würde sonst durch die neue Firma ersetzt/ausgeloggt. Der
// System-Admin bleibt nach dem Registrieren einfach eingeloggt, wie er
// war; es gibt nur eine Bestätigung in der Firmenliste.
function sysAdminResetRegisterForm(){
 $("companyRegisterError").textContent="";
 $("regCompanyName").value="";$("regFirstName").value="";$("regLastName").value="";
 $("regEmail").value="";$("regPassword").value="";$("regPassword2").value="";
}
$("sysAdminOpenRegister").onclick=()=>{
 sysAdminResetRegisterForm();
 $("systemAdminModal").hidden=true;
 $("systemAdminRegisterModal").hidden=false;
};
$("cancelCompanyRegister").onclick=()=>{
 $("systemAdminRegisterModal").hidden=true;
 $("systemAdminModal").hidden=false;
};
$("companyRegisterBtn").onclick=async()=>{
 $("companyRegisterError").textContent="";
 const companyName=$("regCompanyName").value.trim();
 const vor=$("regFirstName").value.trim();
 const nach=$("regLastName").value.trim();
 const email=$("regEmail").value.trim().toLowerCase();
 const pw1=$("regPassword").value,pw2=$("regPassword2").value;
 if(!companyName){$("companyRegisterError").textContent="Bitte einen Firmennamen eingeben.";return}
 if(!vor||!nach){$("companyRegisterError").textContent="Bitte Vor- und Nachname eingeben.";return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$("companyRegisterError").textContent="Bitte eine gültige E-Mail-Adresse eingeben.";return}
 if(pw1.length<8){$("companyRegisterError").textContent="Das Passwort muss mindestens 8 Zeichen haben.";return}
 if(pw1!==pw2){$("companyRegisterError").textContent="Die beiden Passwort-Eingaben stimmen nicht überein.";return}
 $("companyRegisterBtn").disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("register-company",{body:{
   company_name:companyName,first_name:vor,last_name:nach,email,password:pw1
  }});
  if(error){$("companyRegisterError").textContent=await edgeFunctionErrorMessage(error,"Registrierung fehlgeschlagen.");return}
  if(!data?.ok){$("companyRegisterError").textContent=data?.error||"Registrierung fehlgeschlagen.";return}
  $("systemAdminRegisterModal").hidden=true;
  $("systemAdminModal").hidden=false;
  await renderSystemAdminList();
  sysAdminShowListSuccess("Firma "+data.company.name+" wurde registriert (Admin: "+data.user.email+").");
 }catch(err){
  $("companyRegisterError").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("companyRegisterBtn").disabled=false;
 }
};

// ---------------------------------------------------------------------------
// Module in Entwicklung  (v2.67: aus den Firmeneinstellungen hierher gezogen)
// ---------------------------------------------------------------------------
// Ob eine Funktion fertig ist, entscheidet der Betreiber - nicht der einzelne
// Firmenadmin. Der Wert steht deshalb EINMAL fuer das ganze System in
// public.system_settings und gilt fuer alle Firmen. Geschrieben wird
// ausschliesslich ueber system_admin_set_module_test() (SECURITY DEFINER,
// prueft is_system_admin()); die Tabelle selbst hat fuer "authenticated" nur
// Leserecht. Angehakte Module auszublenden ist reine UI-Fuehrung, keine
// Sicherheitsgrenze - siehe CLAUDE.md 22.1.

// Liste der Module aus den Auswahlfenstern zusammenstellen. Neue Arten
// erscheinen dadurch automatisch, ohne dass hier etwas nachgetragen wird.
function renderModuleTestListe(){
 const box=$("moduleTestListe");
 if(!box)return;
 const zeilen=[];
 const sammeln=(auswahl,praefix,attribut,titel)=>{
  document.querySelectorAll(auswahl).forEach(btn=>{
   const art=btn.dataset[attribut];
   const spans=btn.querySelectorAll("span");
   const text=(spans.length?spans[spans.length-1].textContent:btn.textContent).trim();
   const schluessel=praefix+":"+art;
   zeilen.push(`<label class="rechte-schalter"><input type="checkbox" data-modul-test="${esc(schluessel)}"${moduleImTest[schluessel]?" checked":""}> ${esc(titel)} – ${esc(text)}</label>`);
  });
 };
 sammeln("[data-choose-meas-type]","meas","chooseMeasType","Massaufnahme");
 sammeln("[data-choose-am-type]","am","chooseAmType","Ausmass");
 box.innerHTML=zeilen.join("")||'<div class="small">Keine Module gefunden.</div>';
}

function moduleTestHinweis(text,fehler){
 const el=$("moduleTestHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

$("saveModuleTest").addEventListener("click",async()=>{
 const knopf=$("saveModuleTest");
 const neu={};
 document.querySelectorAll("[data-modul-test]").forEach(cb=>{
  if(cb.checked)neu[cb.dataset.modulTest]=true;
 });
 knopf.disabled=true;
 moduleTestHinweis("");
 try{
  const {data,error}=await sb.rpc("system_admin_set_module_test",{p_module_test:neu});
  if(error){moduleTestHinweis("Konnte nicht gespeichert werden: "+error.message,true);return}
  // Die Funktion gibt die geschriebene Zeile zurueck - ohne sie waere nicht
  // sicher, dass wirklich etwas gespeichert wurde (CLAUDE.md 24.1).
  if(!data){moduleTestHinweis("Es wurde nichts gespeichert.",true);return}
  moduleImTest=(data.module_test)||{};
  applyModuleTest();
  renderModuleTestListe();
  const anzahl=Object.keys(moduleImTest).length;
  moduleTestHinweis(anzahl
   ?`✓ Gespeichert – ${anzahl} Modul${anzahl===1?"":"e"} in Entwicklung (gilt für alle Firmen).`
   :"✓ Gespeichert – kein Modul in Entwicklung (gilt für alle Firmen).");
 }catch(err){
  moduleTestHinweis("Fehler beim Speichern: "+(err&&err.message?err.message:err),true);
 }finally{
  knopf.disabled=false;
 }
});
