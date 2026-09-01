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

// ---- Self-Service-Firmenregistrierung ------------------------
// Legt per Edge Function (service_role, siehe supabase/register-company)
// atomar Auth-User + neue Firma (30 Tage Trial) + Admin-Profil an. Die
// company_id kommt dabei ausschliesslich vom Server, nie vom Browser.
function showCompanyRegisterErr(msg){$("companyRegisterError").textContent=msg||""}
$("showCompanyRegister").onclick=()=>{$("companyRegisterCard").hidden=false;showLoginErr("")};
$("cancelCompanyRegister").onclick=()=>{
 $("companyRegisterCard").hidden=true;showCompanyRegisterErr("");
 $("regCompanyName").value="";$("regFirstName").value="";$("regLastName").value="";
 $("regEmail").value="";$("regPassword").value="";$("regPassword2").value="";
};
$("companyRegisterBtn").onclick=async()=>{
 showCompanyRegisterErr("");
 const companyName=$("regCompanyName").value.trim();
 const vor=$("regFirstName").value.trim();
 const nach=$("regLastName").value.trim();
 // Muss exakt so normalisiert werden wie in register-company
 // (clean(...).toLowerCase()) – sonst kann der automatische Login direkt
 // nach der Registrierung an Gross-/Kleinschreibung scheitern, obwohl die
 // Firma/das Konto korrekt angelegt wurden.
 const email=$("regEmail").value.trim().toLowerCase();
 const pw1=$("regPassword").value,pw2=$("regPassword2").value;
 if(!companyName){showCompanyRegisterErr("Bitte einen Firmennamen eingeben.");return}
 if(!vor||!nach){showCompanyRegisterErr("Bitte Vor- und Nachname eingeben.");return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showCompanyRegisterErr("Bitte eine gültige E-Mail-Adresse eingeben.");return}
 if(pw1.length<8){showCompanyRegisterErr("Das Passwort muss mindestens 8 Zeichen haben.");return}
 if(pw1!==pw2){showCompanyRegisterErr("Die beiden Passwort-Eingaben stimmen nicht überein.");return}
 $("companyRegisterBtn").disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("register-company",{body:{
   company_name:companyName,first_name:vor,last_name:nach,email,password:pw1
  }});
  if(error){showCompanyRegisterErr(await edgeFunctionErrorMessage(error,"Registrierung fehlgeschlagen."));return}
  if(!data?.ok){showCompanyRegisterErr(data?.error||"Registrierung fehlgeschlagen.");return}
  const {error:loginErr}=await sb.auth.signInWithPassword({email,password:pw1});
  if(loginErr){
   // Firma/Konto stehen – nur das automatische Anmelden hat aus
   // irgendeinem Grund nicht geklappt. Nichts verloren, nur normal
   // anmelden statt automatisch.
   $("companyRegisterCard").hidden=true;
   $("loginUser").value=email;
   showLoginErr("Firma registriert. Bitte jetzt mit E-Mail und Passwort anmelden.");
   return;
  }
  $("companyRegisterCard").hidden=true;
  await afterLogin();
 }catch(err){
  showCompanyRegisterErr((err&&err.message)?err.message:String(err));
 }finally{
  $("companyRegisterBtn").disabled=false;
 }
};

async function afterLogin(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){showLoginErr("Anmeldung fehlgeschlagen.");return}
 const {data:profile}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
 currentProfile=profile;
 isMike=!!(profile&&String(profile.first_name).trim().toLowerCase()==="mike"&&String(profile.last_name).trim().toLowerCase()==="ledermann");
 $("currentUserLabel").textContent=profile?`${profile.first_name} ${profile.last_name}`:session.user.email;
 // Wer sein Passwort noch nie selbst gesetzt hat, muss das zuerst tun.
 if(profile&&profile.passwort_gesetzt===false){
  $("authScreen").hidden=true;
  $("passwortModal").hidden=false;
  $("pwNeu").value="";$("pwNeu2").value="";$("pwFehler").textContent="";
  return;
 }
 $("authScreen").hidden=true;
 $("appRoot").hidden=false;
 if(typeof checkSystemAdmin==="function")await checkSystemAdmin();
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
