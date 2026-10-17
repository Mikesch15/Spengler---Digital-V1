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

// v3.378 (Auftrag "Systemadmin von der Firma trennen"): Die Systemadministration gehoert NICHT mehr in die Firmen-App.
// Der Betreiber meldet sich mit einem eigenen Konto OHNE Firmenprofil an (Einstieg: Adresse mit "?betreiber"). Ein solches
// Konto hat serverseitig keine Firma (my_company_id() = NULL) und sieht deshalb keine Projekte, Rapporte oder Termine.
// Wer ein Firmenprofil hat - auch wenn das Konto (noch) in system_admins steht - sieht hier KEINEN Systemadmin-Zugang.
// Das Ausblenden ist nur Fuehrung; die Absicherung liegt unveraendert in der Datenbank (is_system_admin() in jeder Funktion/Policy).
function betreiberEinstieg(){
 try{return new URLSearchParams(location.search).has("betreiber")}catch(e){return false}
}
let betreiberModus=false;
if(betreiberEinstieg()&&$("loginTitel")){
 $("loginTitel").textContent="Betreiber-Anmeldung";
 // auf der Betreiber-Seite führt der Link zurück zur normalen Anmeldung statt zu sich selbst
 if($("loginBetreiberLink"))$("loginBetreiberLink").hidden=true;
 if($("loginFirmaLink")){$("loginFirmaLink").hidden=false;$("loginFirmaLink").setAttribute("href",location.pathname)}
}
async function checkSystemAdmin(){
 const {data,error}=await sb.rpc("is_system_admin");
 isSystemAdmin=!error&&!!data;
 const reinesBetreiberKonto=isSystemAdmin&&!currentProfile;
 $("navSystemAdmin").hidden=!reinesBetreiberKonto;
}
// Betreiber-Modus: nur die Systemadministration, keine Firmen-App. Es wird nichts aus einer Firma geladen.
async function betreiberModusStarten(){
 betreiberModus=true;
 $("authScreen").hidden=true;
 $("passwortModal").hidden=true;
 $("companyLockedScreen").hidden=true;
 $("appRoot").hidden=false;
 ["a2Screen","startScreen","reportScreen"].forEach(id=>{const e=$(id);if(e)e.hidden=true});
 const l=$("betreiberLeiste");if(l)l.hidden=false;
 await $("navSystemAdmin").onclick();
}
function betreiberAbweisen(text){
 return sb.auth.signOut().then(()=>{
  $("appRoot").hidden=true;$("authScreen").hidden=false;
  showLoginErr(text);
 });
}

$("navSystemAdmin").onclick=async()=>{
 $("systemAdminModal").hidden=false;
 $("sysAdminSearchInput").value="";
 $("sysAdminFilterStatus").value="";
 renderModuleTestListe();
 if(typeof moduleTestHinweis==="function")moduleTestHinweis("");
 if(typeof renderSysKategorienListe==="function")renderSysKategorienListe();
 if(typeof sysKategorienHinweis==="function")sysKategorienHinweis("");
 await renderSystemAdminList();
 // Feedback aller Firmen (v2.70): nutzt denselben Code wie die Firmenansicht
 // in js/02-feedback.js, nur mit der geschuetzten Betreiber-Abfrage.
 if(typeof renderFeedbackBetreiberListe==="function")await renderFeedbackBetreiberListe();
};
$("closeSystemAdmin").onclick=()=>{
 // Im Betreiber-Modus gibt es keine Firmen-App dahinter - "Zurück" meldet ab.
 if(betreiberModus){$("betreiberAbmelden").click();return}
 $("systemAdminModal").hidden=true;
};
$("betreiberAbmelden").onclick=async()=>{
 offlineCacheLeeren();
 await sb.auth.signOut();
 location.href=location.pathname+"?betreiber";
};

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
 if(typeof renderSysAdminEinladungen==="function")await renderSysAdminEinladungen();
}

// ---- Einladungslinks (v3.103) -------------------------------------------
// Gezielte, einmal verwendbare Alternative zur direkten Registrierung -
// der System-Admin erzeugt den Link und verschickt ihn selbst; die
// eingeladene Person legt die Firma selbst an (#companyInviteScreen,
// js/69-email-auth.js) und waehlt dabei ihr eigenes Passwort.
function sysAdminZufallsToken(){
 const bytes=new Uint8Array(24);
 crypto.getRandomValues(bytes);
 return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
}
$("sysAdminEinladungErzeugen").onclick=async()=>{
 $("sysAdminEinladungErzeugen").disabled=true;
 const status=$("sysAdminEinladungStatus");
 if(status){status.textContent="";status.style.color=""}
 try{
  const token=sysAdminZufallsToken();
  const ablauf=new Date(Date.now()+7*24*60*60*1000).toISOString();
  const {error}=await sb.from("company_invites").insert({
   token,created_by:currentProfile?currentProfile.id:null,expires_at:ablauf
  });
  if(error){
   if(status){status.textContent="Fehler: "+error.message;status.style.color="var(--red)"}
   return;
  }
  const link=location.origin+location.pathname+"?einladung="+token;
  // v3.104: renderSysAdminEinladungen() (weiter unten) zeigt den neuen Link
  // bereits sichtbar in der Liste - das ist die eigentliche Erfolgs-
  // Rueckmeldung. alert() wurde bewusst entfernt: in einer als PWA zum
  // Home-Bildschirm hinzugefuegten App (standalone-Modus) unterdruecken
  // manche mobilen Browser (v. a. iOS Safari) window.alert() lautlos - ein
  // Klick auf den Knopf wirkte dann so, als waere "nichts passiert",
  // obwohl der Link im Hintergrund bereits angelegt war.
  await renderSysAdminEinladungen();
  let kopiert=false;
  try{ await navigator.clipboard.writeText(link); kopiert=true; }catch(e){}
  if(status){
   status.textContent="Einladungslink erzeugt"+(kopiert?" und in die Zwischenablage kopiert":"")+" - er steht auch unten in der Liste (7 Tage gültig, einmal verwendbar).";
   status.style.color="var(--green)";
  }
 }catch(err){
  if(status){status.textContent="Fehler: "+((err&&err.message)||err);status.style.color="var(--red)"}
 }finally{
  $("sysAdminEinladungErzeugen").disabled=false;
 }
};
async function renderSysAdminEinladungen(){
 const box=$("sysAdminEinladungListe");
 if(!box)return;
 const {data,error}=await sb.from("company_invites").select("*").order("created_at",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const liste=data||[];
 if(!liste.length){box.innerHTML='<div class="empty">Noch keine Einladungslinks erzeugt.</div>';return}
 box.innerHTML=liste.map(e=>{
  const abgelaufen=new Date(e.expires_at).getTime()<Date.now();
  const status=e.used_at?"✓ verwendet am "+sysAdminFmtDate(e.used_at)
   :(abgelaufen?"abgelaufen":"offen bis "+sysAdminFmtDate(e.expires_at));
  const link=location.origin+location.pathname+"?einladung="+e.token;
  return `<div class="settingrow" style="display:block;padding:8px 10px">
<div class="small" style="word-break:break-all">${esc(link)}</div>
<div class="small" style="color:var(--muted)">Erzeugt: ${sysAdminFmtDate(e.created_at)} · ${esc(status)}</div>
${(!e.used_at&&!abgelaufen)?`<button type="button" class="red" data-einladung-loeschen="${e.id}" style="margin-top:4px">Zurückziehen</button>`:""}
</div>`;
 }).join("");
}
$("sysAdminEinladungListe").addEventListener("click",async e=>{
 const b=e.target.closest("[data-einladung-loeschen]");
 if(!b)return;
 if(!await appConfirm("Diesen Einladungslink zurückziehen? Er funktioniert danach nicht mehr."))return;
 const {error}=await sb.from("company_invites").delete().eq("id",b.dataset.einladungLoeschen);
 if(error){appAlert("Fehler: "+error.message);return}
 await renderSysAdminEinladungen();
});

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
 if(typeof sysModuleLaden==="function")sysModuleLaden(id);
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
 $("regEmail").value="";
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
 if(!companyName){$("companyRegisterError").textContent="Bitte einen Firmennamen eingeben.";return}
 if(!vor||!nach){$("companyRegisterError").textContent="Bitte Vor- und Nachname eingeben.";return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$("companyRegisterError").textContent="Bitte eine gültige E-Mail-Adresse eingeben.";return}
 $("companyRegisterBtn").disabled=true;
 try{
  // v3.103: kein Passwort mehr vom System-Admin - wird serverseitig erzeugt
  // und per E-Mail verschickt (siehe register-company).
  const {data,error}=await sb.functions.invoke("register-company",{body:{
   company_name:companyName,first_name:vor,last_name:nach,email
  }});
  if(error){$("companyRegisterError").textContent=await edgeFunctionErrorMessage(error,"Registrierung fehlgeschlagen.");return}
  if(!data?.ok){$("companyRegisterError").textContent=data?.error||"Registrierung fehlgeschlagen.";return}
  $("systemAdminRegisterModal").hidden=true;
  $("systemAdminModal").hidden=false;
  await renderSystemAdminList();
  const mailZeile=data.mailVersendet
   ?"Die Zugangsdaten wurden per E-Mail verschickt."
   :"Die Zugangsdaten-Mail konnte NICHT verschickt werden - Passwort: "+data.passwort+" (bitte manuell weitergeben).";
  sysAdminShowListSuccess("Firma "+data.company.name+" wurde registriert (Admin: "+data.user.email+"). "+mailZeile);
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

// ---------------------------------------------------------------------------
// Massaufnahme-Arten -> Kategorie (v3.94)
// ---------------------------------------------------------------------------
// Gleiches Muster wie "Module in Entwicklung": EINE Zeile fuer das ganze
// System (system_settings.meas_kategorien), geschrieben nur ueber
// system_admin_set_meas_kategorien() (SECURITY DEFINER, prueft
// is_system_admin()). Bestimmt, unter welcher der drei Kategorien
// (Steildach/Flachdach/Allgemein) eine Massaufnahme-Art bei der Auswahl
// einer neuen Massaufnahme erscheint (js/16-massaufnahme-formular.js).
function renderSysKategorienListe(){
 const box=$("sysKategorienListe");
 if(!box)return;
 const opt=k=>MEAS_KATEGORIEN.map(x=>`<option value="${esc(x)}"${x===k?" selected":""}>${esc(MEAS_KATEGORIEN_LABELS[x])}</option>`).join("");
 box.innerHTML=Object.keys(MEAS_TYPE_LABELS).map(art=>
  `<div class="grid" style="grid-template-columns:1fr auto;align-items:center;gap:8px;margin-bottom:4px">
<div>${esc(MEAS_TYPE_LABELS[art])}</div>
<select data-meas-kategorie="${esc(art)}">${opt(measKategorie(art))}</select>
</div>`).join("");
}

function sysKategorienHinweis(text,fehler){
 const el=$("sysKategorienHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

$("saveSysKategorien").addEventListener("click",async()=>{
 const knopf=$("saveSysKategorien");
 const neu={};
 document.querySelectorAll("[data-meas-kategorie]").forEach(sel=>{
  neu[sel.dataset.measKategorie]=sel.value;
 });
 knopf.disabled=true;
 sysKategorienHinweis("");
 try{
  const {data,error}=await sb.rpc("system_admin_set_meas_kategorien",{p_kategorien:neu});
  if(error){sysKategorienHinweis("Konnte nicht gespeichert werden: "+error.message,true);return}
  if(!data){sysKategorienHinweis("Es wurde nichts gespeichert.",true);return}
  measKategorien=(data.meas_kategorien)||{};
  renderSysKategorienListe();
  sysKategorienHinweis("✓ Gespeichert – gilt für alle Firmen.");
 }catch(err){
  sysKategorienHinweis("Fehler beim Speichern: "+(err&&err.message?err.message:err),true);
 }finally{
  knopf.disabled=false;
 }
});

// ---------------------------------------------------------------------------
// Verwaiste Storage-Dateien (v3.04)
//
// Offener Punkt aus CLAUDE.md 32.7: seit der Pfadumstellung in v2.24 liegen
// Objekte im Bucket, auf die keine Datenbankzeile mehr zeigt. Sie sind fuer
// niemanden erreichbar (die Storage-Policy verlangt eine echte Referenz der
// eigenen Firma), belegen aber Speicher.
//
// Bewusst KEINE stille Loeschung: der Betreiber bekommt die Liste und
// entscheidet selbst. Die massgebliche Liste kommt aus
// system_admin_verwaiste_storage(), also serverseitig - der Client kann sie
// weder erweitern noch eine referenzierte Datei hineinschmuggeln (die Edge
// Function prueft beim Loeschen erneut gegen dieselbe Funktion).
let sysStorageVerwaist=[];

function sysStorageHinweis(text,fehler){
 const el=$("sysStorageHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}
function sysStorageGroesse(b){
 const n=Number(b)||0;
 if(n>=1048576)return (n/1048576).toFixed(1)+" MB";
 if(n>=1024)return Math.round(n/1024)+" KB";
 return n+" B";
}
function renderSysStorageListe(){
 const box=$("sysStorageListe");
 if(!box)return;
 if(!sysStorageVerwaist.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin-top:8px">Keine verwaisten Dateien – im Speicher liegt nichts Überflüssiges.</div>`;
  return;
 }
 const summe=sysStorageVerwaist.reduce((s,r)=>s+(Number(r.groesse_bytes)||0),0);
 // v3.274: jede Zeile hat einen Knopf "Ansehen" - die Liste allein (nur Pfade)
 // reichte nicht, um zu entscheiden, ob eine Datei weg darf. Die Vorschau
 // entsteht unter der Zeile; den Link stellt eine eigene, rein lesende Edge
 // Function aus (system-admin-storage-ansehen), weil die Storage-Policy dem
 // Client verwaiste Dateien nicht zu lesen erlaubt.
 const zeilen=sysStorageVerwaist.map((r,i)=>`<div class="report-row" style="flex-wrap:wrap">
  <div class="report-row-info">
   <b>${esc(r.pfad)}</b>
   <span class="small" style="color:var(--muted)">${esc(r.kategorie||"")} · ${sysStorageGroesse(r.groesse_bytes)} · ${r.erstellt?new Date(r.erstellt).toLocaleDateString("de-CH"):"–"}</span>
  </div>
  <button type="button" class="gray" data-sys-ansehen="${i}">👁 Ansehen</button>
  <div id="sysStorageVorschau${i}" style="flex-basis:100%" hidden></div>
 </div>`).join("");
 box.innerHTML=`<div class="small" style="margin:8px 0 4px"><b>${sysStorageVerwaist.length}</b> verwaiste Datei${sysStorageVerwaist.length===1?"":"en"} · ${sysStorageGroesse(summe)} belegt</div>
  ${zeilen}
  <div class="bar" style="margin-top:8px"><button type="button" id="sysStorageLoeschen" class="red">🗑 Alle ${sysStorageVerwaist.length} endgültig löschen</button></div>
  <div class="small" style="color:var(--muted)">Unwiderruflich. Es werden ausschliesslich die oben gelisteten Dateien entfernt – der Server prüft die Liste dabei nochmals selbst.</div>`;
}

if($("sysStorageLaden")){
 $("sysStorageLaden").onclick=async()=>{
  const knopf=$("sysStorageLaden");
  knopf.disabled=true;
  sysStorageHinweis("");
  try{
   const {data,error}=await sb.rpc("system_admin_verwaiste_storage");
   if(error){sysStorageHinweis("Konnte nicht gelesen werden: "+error.message,true);return}
   sysStorageVerwaist=Array.isArray(data)?data:[];
   renderSysStorageListe();
  }catch(err){
   sysStorageHinweis("Fehler: "+(err&&err.message?err.message:err),true);
  }finally{
   knopf.disabled=false;
  }
 };
}

// Ansehen (v3.274): holt einen kurzlebigen Link und zeigt die Datei unter ihrer
// Zeile. Ein zweiter Klick klappt die Vorschau wieder zu. Bilder erscheinen
// direkt, alles andere (PDF, Tabellen) als Link zum Oeffnen.
function sysStorageArt(pfad){
 const m=/\.([a-z0-9]+)$/i.exec(String(pfad||""));
 const e=m?m[1].toLowerCase():"";
 if(["jpg","jpeg","png","gif","webp","bmp","svg"].indexOf(e)>=0)return "bild";
 if(e==="pdf")return "pdf";
 return "datei";
}
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("[data-sys-ansehen]"):null;
 if(!b)return;
 const i=Number(b.dataset.sysAnsehen);
 const r=sysStorageVerwaist[i];
 const box=$("sysStorageVorschau"+i);
 if(!r||!box)return;
 if(!box.hidden){box.hidden=true;box.innerHTML="";b.textContent="👁 Ansehen";return}
 b.disabled=true;
 sysStorageHinweis("");
 try{
  const {data,error}=await sb.functions.invoke("system-admin-storage-ansehen",{body:{pfad:r.pfad}});
  if(error){
   sysStorageHinweis(await edgeFunctionErrorMessage(error,"Die Datei konnte nicht angezeigt werden."),true);
   return;
  }
  if(!data||!data.ok||!data.url){
   sysStorageHinweis((data&&data.error)||"Die Datei konnte nicht angezeigt werden.",true);
   return;
  }
  const art=sysStorageArt(r.pfad);
  const hinweis=`<div class="small" style="color:var(--muted);margin-top:4px">Der Link gilt ${Math.round((data.gueltigSekunden||300)/60)} Minuten.</div>`;
  box.innerHTML=(art==="bild"
    ?`<img src="${esc(data.url)}" alt="${esc(r.pfad)}" style="max-width:100%;max-height:60vh;display:block;margin-top:6px;border:1px solid var(--line,#ccd)">`
    :`<a href="${esc(data.url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px">${art==="pdf"?"PDF öffnen":"Datei öffnen"} ↗</a>`)+hinweis;
  box.hidden=false;
  b.textContent="Schliessen";
 }catch(err){
  sysStorageHinweis("Fehler: "+(err&&err.message?err.message:err),true);
 }finally{
  b.disabled=false;
 }
});

// Der Loesch-Knopf entsteht erst beim Zeichnen der Liste, deshalb delegiert.
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("#sysStorageLoeschen"):null;
 if(!b)return;
 if(!sysStorageVerwaist.length)return;
 if(!await appConfirm(`${sysStorageVerwaist.length} verwaiste Datei(en) endgültig löschen?\n\nDas lässt sich nicht rückgängig machen.`))return;
 b.disabled=true;
 sysStorageHinweis("");
 try{
  const {data,error}=await sb.functions.invoke("system-admin-storage-aufraeumen",{
   body:{pfade:sysStorageVerwaist.map(r=>r.pfad)}
  });
  if(error){
   sysStorageHinweis(await edgeFunctionErrorMessage(error,"Die Dateien konnten nicht entfernt werden."),true);
   return;
  }
  if(!data||!data.ok){
   sysStorageHinweis((data&&data.error)||"Die Dateien konnten nicht entfernt werden.",true);
   return;
  }
  sysStorageVerwaist=[];
  renderSysStorageListe();
  sysStorageHinweis(`✓ ${data.geloescht} Datei${data.geloescht===1?"":"en"} entfernt.`);
 }catch(err){
  sysStorageHinweis("Fehler: "+(err&&err.message?err.message:err),true);
 }finally{
  b.disabled=false;
 }
});

// ---- v3.387: Module je Firma + Aktivitätsprotokoll -----------------------------------------------------------
// Gelesen ueber system_admin_firmen_module() (nur Systemadmin), geschrieben NUR ueber system_admin_set_firma_modul() (SECURITY DEFINER, prueft
// is_system_admin(), Abhaengigkeiten, schreibt das Protokoll). Die Oberflaeche zeigt eine Aenderung erst, nachdem der Server sie bestaetigt hat.
const SYS_MODUL_NAMEN={angebote:"Offerten",lager:"Lieferanten-Lager",nachkalkulation:"Nachkalkulation (Abacus)",termine:"Termine und Kalender"};   // Ersatz, falls das Register nichts liefert
let sysModuleZeilen=[],sysModuleFirma=null,sysModuleBusy=false;
function sysModulHinweis(t,fehler){
 const e=$("sysAdminActionError");if(e)e.textContent=fehler?t:"";
 if(!fehler&&t&&typeof sysAdminShowSuccess==="function")sysAdminShowSuccess(t);
}
async function sysModuleLaden(firmaId){
 sysModuleFirma=firmaId;
 const box=$("sysAdminModuleListe");if(!box)return;
 box.textContent="Wird geladen …";
 try{
  const {data,error}=await sb.rpc("system_admin_module_uebersicht");
  if(error){box.innerHTML='<span style="color:var(--red)">Module konnten nicht geladen werden: '+esc(error.message||"Fehler")+'</span>';return}
  sysModuleZeilen=Array.isArray(data)?data:[];
 }catch(e){box.innerHTML='<span style="color:var(--red)">Module konnten nicht geladen werden (keine Verbindung?).</span>';return}
 sysModuleZeichnen();
}
function sysModuleZeichnen(){
 const box=$("sysAdminModuleListe");if(!box)return;
 const z=sysModuleZeilen.filter(x=>x.company_id===sysModuleFirma);
 if(!z.length){box.textContent="Keine Module gefunden.";return}
 const schaltbar=z.filter(x=>x.schaltbar!==false),kern=z.filter(x=>x.schaltbar===false);
 const nm=x=>x.name||SYS_MODUL_NAMEN[x.modul]||x.modul;
 box.innerHTML=schaltbar.map(x=>`<label class="rechte-schalter" style="display:block;margin:6px 0"><input type="checkbox" data-sys-modul="${esc(x.modul)}"${x.aktiv?" checked":""}${sysModuleBusy?" disabled":""}>
  <b>${esc(nm(x))}</b> ${x.aktiv?'<span style="color:var(--green)">freigeschaltet</span>':'<span style="color:var(--red)">gesperrt</span>'}
  <span style="color:var(--muted)">${x.ausdruecklich?"· ausdrücklich gesetzt"+(x.geaendert_am?" am "+esc(sysAdminFmtDate(x.geaendert_am)):""):"· Standard"}</span>${x.beschreibung?'<div class="small" style="color:var(--muted);margin-left:26px">'+esc(x.beschreibung)+'</div>':""}</label>`).join("")
  +(kern.length?'<div class="small" style="margin-top:10px;color:var(--muted)"><b>Kernmodule</b> (immer dabei, nicht einzeln schaltbar): '+kern.map(x=>esc(nm(x))).join(" · ")+'</div>':"");
}
async function sysModulSchalten(modul,aktiv){
 if(sysModuleBusy||!sysModuleFirma)return;
 const name=SYS_MODUL_NAMEN[modul]||modul;
 const ok=await appConfirm((aktiv?"Das Modul «"+name+"» für diese Firma freischalten?":"Das Modul «"+name+"» für diese Firma SPERREN? Die Daten bleiben erhalten, die Firma kann das Modul aber nicht mehr verwenden."),{ok:aktiv?"Freischalten":"Sperren"});
 if(!ok){sysModuleZeichnen();return}
 sysModuleBusy=true;sysModuleZeichnen();
 try{
  const {error}=await sb.rpc("system_admin_set_firma_modul",{p_company:sysModuleFirma,p_modul:modul,p_aktiv:aktiv});
  if(error){sysModuleBusy=false;sysModulHinweis("Modul konnte nicht geändert werden: "+(error.message||"Fehler"),true);await sysModuleLaden(sysModuleFirma);return}
  sysModulHinweis("Modul «"+name+"» ist jetzt "+(aktiv?"freigeschaltet":"gesperrt")+".",false);
 }catch(e){sysModuleBusy=false;sysModulHinweis("Modul konnte nicht geändert werden (keine Verbindung?).",true)}
 sysModuleBusy=false;
 await sysModuleLaden(sysModuleFirma);
}
document.addEventListener("change",e=>{
 const t=e.target;if(!t||!t.getAttribute)return;
 const m=t.getAttribute("data-sys-modul");
 if(m)sysModulSchalten(m,!!t.checked);
});
const SYS_AKTION_TEXT={modul_freigabe:"Modul",firma_status:"Firmenstatus",firma_testphase:"Testphase",firma_loeschen:"Firma gelöscht"};
async function sysProtokollLaden(){
 const box=$("sysAdminProtokollListe");if(!box)return;
 box.textContent="Wird geladen …";
 try{
  const {data,error}=await sb.from("platform_audit_log").select("*").order("zeitpunkt",{ascending:false}).limit(100);
  if(error){box.innerHTML='<span style="color:var(--red)">Protokoll konnte nicht geladen werden: '+esc(error.message||"Fehler")+'</span>';return}
  const L=Array.isArray(data)?data:[];
  if(!L.length){box.textContent="Noch keine Einträge.";return}
  const firma=id=>{const c=(sysAdminCompanies||[]).find(x=>x.id===id);return c?c.name:(id?"Firma …"+String(id).slice(-4):"")};
  box.innerHTML=L.map(x=>{
   const d=x.detail||{};
   let was="";
   if(x.aktion==="modul_freigabe")was=(SYS_MODUL_NAMEN[x.modul]||x.modul)+": "+(d.neu?"freigeschaltet":"gesperrt");
   else if(x.aktion==="firma_status")was=(SYS_ADMIN_STATUS_LABELS[d.alt]||d.alt||"?")+" → "+(SYS_ADMIN_STATUS_LABELS[d.neu]||d.neu||"?");
   else if(x.aktion==="firma_testphase")was=(d.tage!=null?d.tage+" Tage":"")+(d.ende?", Ende "+sysAdminFmtDate(d.ende):"");
   else if(x.aktion==="firma_loeschen")was=(d.name||"")+" (" + (d.benutzer||0) + " Benutzer, " + (d.projekte||0) + " Projekte)";
   return `<div style="padding:5px 0;border-bottom:1px solid var(--line,#ddd)"><b>${esc(SYS_AKTION_TEXT[x.aktion]||x.aktion)}</b> · ${esc(firma(x.company_id))}<br><span style="color:var(--muted)">${esc(sysAdminFmtDate(x.zeitpunkt))} · ${esc(was)}</span></div>`;
  }).join("");
 }catch(e){box.innerHTML='<span style="color:var(--red)">Protokoll konnte nicht geladen werden (keine Verbindung?).</span>'}
}
document.addEventListener("click",e=>{const t=e.target&&e.target.closest?e.target:null;if(t&&t.closest("#sysAdminProtokollLaden"))sysProtokollLaden()});
