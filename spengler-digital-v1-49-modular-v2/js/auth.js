/* Spengler Digital V1.49 – Authentifizierung und Rollen */
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
 isMike=!!(profile&&profile.role==="admin");
 $("currentUserLabel").textContent=profile?`${profile.first_name} ${profile.last_name}`:session.user.email;
 $("authScreen").hidden=true;
 $("appRoot").hidden=false;
 await loadMyPermissions();
 await loadAllData();
 applyUiPermissions();
 works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=[];
 $("date").value=new Date().toISOString().slice(0,10);
 renderProjectSelect();
 renderMain();
 showStart();
}
