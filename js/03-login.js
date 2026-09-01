"use strict";
const money=n=>Number(n||0).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function initials(name){
 const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
 return parts.map(p=>p.replace(/[^A-Za-zÄÖÜäöüÉéÀàÈè]/g,"").slice(0,1)).join("").toUpperCase();
}

// ---- Login --------------------------------------------------
// Mitarbeiter melden sich mit "Vorname.Nachname" an (keine echte
// E-Mail-Adresse, siehe smart-action) – wer sich selbst eine Firma
// registriert hat, hat dagegen eine echte E-Mail als Login. Ein "@" im
// Eingabefeld wird deshalb als echte E-Mail erkannt und unverändert
// verwendet, alles andere weiterhin auf die interne Pseudo-Domain gemappt.
function usernameToEmail(u){
 u=u.trim();
 if(u.includes("@"))return u.toLowerCase();
 return u.toLowerCase().replace(/\s+/g,"")+"@nfgryuzkpwjfmdlmevuy.supabase.co";
}
function showLoginErr(msg){$("loginError").textContent=msg||""}

$("loginBtn").onclick=async()=>{
 showLoginErr("");
 const u=$("loginUser").value.trim(), p=$("loginPass").value;
 if(!u||!p){showLoginErr("Bitte Benutzername und Passwort eingeben.");return}
 $("loginBtn").disabled=true;
 const {error}=await sb.auth.signInWithPassword({email:usernameToEmail(u),password:p});
 $("loginBtn").disabled=false;
 if(error){showLoginErr("Benutzername oder Passwort falsch.");return}
 await afterLogin();
};

$("logout").onclick=async()=>{
 await sb.auth.signOut();
 location.reload();
};

// ---- Firmenstatus-Sperre (Version 2.27) ------------------------------
// Wird gezeigt, wenn is_company_access_allowed() false liefert (Trial
// abgelaufen oder Firma deaktiviert). Liest die eigene Firmenzeile für
// die Meldung - bleibt auch bei gesperrter Firma sichtbar, siehe die
// "company_member_select_own_company"-Policy auf companies. Reine
// Anzeige, keine zusätzliche Sicherheitsentscheidung: die eigentliche
// Sperre ist bereits durch is_company_access_allowed() serverseitig
// getroffen worden, bevor diese Funktion überhaupt aufgerufen wird.
async function showCompanyLocked(){
 let msg="Der Zugriff für Ihre Firma ist derzeit eingeschränkt. Bitte wenden Sie sich an Ihren Administrator.";
 if(currentProfile&&currentProfile.company_id){
  const {data:c}=await sb.from("companies").select("name,subscription_status,trial_ends_at").eq("id",currentProfile.company_id).maybeSingle();
  if(c){
   const datum=c.trial_ends_at?new Date(c.trial_ends_at).toLocaleDateString("de-CH"):"";
   const abgelaufen=c.trial_ends_at&&new Date(c.trial_ends_at).getTime()<=Date.now();
   if(c.subscription_status==="trial"&&abgelaufen){
    msg=`Die Testphase von „${c.name}“ ist am ${datum} abgelaufen. Bitte wenden Sie sich an Ihren Administrator.`;
   }else if(c.subscription_status==="expired"){
    msg=`Die Testphase von „${c.name}“ ist abgelaufen${datum?" (Test-Ende: "+datum+")":""}. Bitte wenden Sie sich an Ihren Administrator.`;
   }else if(c.subscription_status==="suspended"){
    msg=`„${c.name}“ wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.`;
   }else if(c.subscription_status==="cancelled"){
    msg=`Das Abonnement von „${c.name}“ wurde gekündigt. Bitte wenden Sie sich an Ihren Administrator.`;
   }
  }
 }
 $("companyLockedMessage").textContent=msg;
 $("authScreen").hidden=true;
 $("passwortModal").hidden=true;
 $("appRoot").hidden=true;
 $("companyLockedScreen").hidden=false;
}
$("companyLockedLogout").onclick=async()=>{
 await sb.auth.signOut();
 location.reload();
};

async function afterLogin(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){showLoginErr("Anmeldung fehlgeschlagen.");return}
 const {data:profile}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
 currentProfile=profile;
 isMike=!!(profile&&String(profile.first_name).trim().toLowerCase()==="mike"&&String(profile.last_name).trim().toLowerCase()==="ledermann");
 $("currentUserLabel").textContent=profile?`${profile.first_name} ${profile.last_name}`:session.user.email;
 // Vorgezogen (früher erst nach dem appRoot-Aufbau geprüft): wird gleich für
 // die Firmenstatus-Prüfung gebraucht, System-Admins sind davon ausgenommen.
 if(typeof checkSystemAdmin==="function")await checkSystemAdmin();
 // Wer sein Passwort noch nie selbst gesetzt hat, muss das zuerst tun.
 if(profile&&profile.passwort_gesetzt===false){
  $("authScreen").hidden=true;
  $("passwortModal").hidden=false;
  $("pwNeu").value="";$("pwNeu2").value="";$("pwFehler").textContent="";
  return;
 }
 // Firmenstatus prüfen (Trial abgelaufen oder Firma deaktiviert). Die
 // eigentliche Sperre sitzt serverseitig in my_company_id() (siehe
 // CLAUDE.md 34) - is_company_access_allowed() fragt exakt dieselbe,
 // servergeprüfte Bedingung ab (Zeitvergleich läuft in Postgres, nicht
 // auf der Browser-Uhr). System-Admins sind davon nie betroffen, auch
 // wenn ihre eigene Firma zufällig gesperrt wäre.
 if(!isSystemAdmin){
  const {data:zugriffErlaubt}=await sb.rpc("is_company_access_allowed");
  if(!zugriffErlaubt){
   await showCompanyLocked();
   return;
  }
 }
 $("authScreen").hidden=true;
 $("appRoot").hidden=false;
 await loadAllData();
 works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=[];
 $("date").value=new Date().toISOString().slice(0,10);
 renderProjectSelect();
 renderMain();
 await applyRechte();
 showStart();
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
 $("systemAdminModal").hidden=true;
 $("systemAdminCompanyModal").hidden=true;
 $("systemAdminDeleteModal").hidden=true;
 $("systemAdminRegisterModal").hidden=true;
 measEditReturnTo="measurementsModal";
 amEditReturnTo="ausmassModal";
 showStart();
}

// ---- Eigenes Passwort festlegen ----------------------------
$("pwAbmelden").onclick=async()=>{
 await sb.auth.signOut();
 location.reload();
};
$("pwSpeichern").onclick=async()=>{
 const p1=$("pwNeu").value, p2=$("pwNeu2").value;
 $("pwFehler").textContent="";
 if(p1.length<8){$("pwFehler").textContent="Mindestens 8 Zeichen.";return}
 if(p1!==p2){$("pwFehler").textContent="Die beiden Eingaben stimmen nicht überein.";return}
 $("pwSpeichern").disabled=true;
 try{
  const {error}=await sb.auth.updateUser({password:p1});
  if(error){$("pwFehler").textContent=error.message||"Passwort konnte nicht gesetzt werden.";return}
  // profiles.passwort_gesetzt darf ein Mitarbeiter laut permission_settings
  // (role=employee, resource=profiles, can_edit=false) nicht per normalem
  // UPDATE ändern – auch nicht am eigenen Profil. mark_own_password_set()
  // ist eine eng gefasste, serverseitige Ausnahme genau für dieses eine
  // Feld am eigenen Profil (siehe Supabase-Migration) und meldet per
  // Rückgabewert zuverlässig, ob wirklich eine Zeile aktualisiert wurde.
  const {data:gesetzt,error:e2}=await sb.rpc("mark_own_password_set");
  if(e2||!gesetzt){
   if(e2)console.error("mark_own_password_set fehlgeschlagen:",e2);
   $("pwFehler").textContent="Passwort wurde geändert, aber die Konto-Einrichtung konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
   return;
  }
  currentProfile.passwort_gesetzt=true;
  $("passwortModal").hidden=true;
  await afterLogin();
 }catch(err){
  $("pwFehler").textContent=(err&&err.message)?err.message:String(err);
 }finally{
  $("pwSpeichern").disabled=false;
 }
};
