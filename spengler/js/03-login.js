"use strict";
const money=n=>Number(n||0).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function initials(name){
 const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
 return parts.map(p=>p.replace(/[^A-Za-zÄÖÜäöüÉéÀàÈè]/g,"").slice(0,1)).join("").toUpperCase();
}

// ---- Login/Registrierung -----------------------------------
function usernameToEmail(u){return u.trim().toLowerCase().replace(/\s+/g,"")+"@nfgryuzkpwjfmdlmevuy.supabase.co"}
function showLoginErr(msg){$("loginError").textContent=msg||""}
function showRegErr(msg){$("registerError").textContent=msg||""}

$("showRegister").onclick=()=>{$("registerCard").hidden=false;showLoginErr("")};
$("cancelRegister").onclick=()=>{$("registerCard").hidden=true;showRegErr("");$("regVor").value="";$("regNach").value="";$("regCode").value=""};

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

$("registerBtn").onclick=async()=>{
 showRegErr("");
 const vor=$("regVor").value.trim(), nach=$("regNach").value.trim(), code=$("regCode").value.trim();
 if(!vor||!nach){showRegErr("Bitte Vor- und Nachname eingeben.");return}
 if(code!==COMPANY_CODE){showRegErr("Firmen-Code falsch. Bitte bei der Geschäftsleitung erfragen.");return}
 $("registerBtn").disabled=true;
 const {data,error}=await sb.functions.invoke("smart-action",{body:{first_name:vor,last_name:nach,company_code:code}});
 $("registerBtn").disabled=false;
 if(error){showRegErr(error.message||"Mitarbeiter konnte nicht angelegt werden.");return}
 if(!data?.ok){showRegErr(data?.error||"Mitarbeiter konnte nicht angelegt werden.");return}
 const username=data?.user?.username||data?.username||vor.trim().toLowerCase()+"."+nach.trim().toLowerCase();
 const password=data?.password||("Rinnen_"+((vor.trim()[0]||"")+(nach.trim()[0]||"")).toUpperCase());
 alert("Konto erstellt.\n\nBenutzername: "+username+"\nPasswort: "+password+"\n\nBitte notieren.");
 $("registerCard").hidden=true;
 $("loginUser").value=username;
 $("loginPass").value=password;
 showLoginErr("Konto erstellt. Du kannst dich jetzt anmelden.");
};

$("logout").onclick=async()=>{
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
 $("authScreen").hidden=true;
 $("appRoot").hidden=false;
 await loadAllData();
 works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=[];
 $("date").value=new Date().toISOString().slice(0,10);
 renderProjectSelect();
 renderMain();
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
 measEditReturnTo="measurementsModal";
 amEditReturnTo="ausmassModal";
 showStart();
}
