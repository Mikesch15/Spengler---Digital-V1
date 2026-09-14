"use strict";
// ---------------------------------------------------------------------------
// E-Mail-gestuetzte Anmeldung/Registrierung (v3.103)
//
//  - Passwort vergessen (Selfservice per E-Mail, Edge Function
//    "password-reset") - funktioniert nur fuer Konten mit hinterlegter
//    E-Mail (profiles.email). Reine Benutzername-Konten bleiben auf den
//    bestehenden Weg ueber einen Administrator (js/07-einstellungen.js,
//    "Passwort zuruecksetzen") angewiesen - dort steht ein fester
//    Hinweistext dazu, kein Rueckschluss aus der Server-Antwort (die ist
//    absichtlich immer gleich, siehe Edge Function).
//  - Firma per Einladungslink anlegen (Edge Function "register-company"
//    mit invite_token statt System-Admin-Anmeldung) - Gegenstueck zur
//    Einladungs-Erzeugung in js/22-system-admin.js.
//
// Beide neuen Bildschirme (#passwordResetScreen, #companyInviteScreen)
// werden ausschliesslich ueber einen URL-Parameter erreicht (?reset=...
// bzw. ?einladung=...), geprueft von emailAuthBootWeiche() - aufgerufen
// aus js/18-app-start.js VOR der normalen Sitzungspruefung/afterLogin().
// ---------------------------------------------------------------------------

let passwordResetToken=null;
let companyInviteToken=null;

// Gibt true zurueck, wenn einer der Spezialbildschirme gezeigt wird - dann
// ueberspringt js/18-app-start.js die normale Sitzungspruefung fuer diesen
// Seitenaufruf (unabhaengig davon, ob im Browser noch eine andere Sitzung
// besteht - der Link soll unabhaengig davon funktionieren).
function emailAuthBootWeiche(){
 const params=new URLSearchParams(location.search);
 const resetToken=params.get("reset");
 const inviteToken=params.get("einladung");
 if(resetToken){
  $("authScreen").hidden=true;
  $("passwordResetScreen").hidden=false;
  passwordResetToken=resetToken;
  return true;
 }
 if(inviteToken){
  $("authScreen").hidden=true;
  $("companyInviteScreen").hidden=false;
  companyInviteToken=inviteToken;
  return true;
 }
 return false;
}

// ---- Passwort vergessen: Link anfordern ----------------------------------
if($("pwVergessenLink"))$("pwVergessenLink").onclick=e=>{
 e.preventDefault();
 $("pwVergessenBox").hidden=!$("pwVergessenBox").hidden;
};
if($("pwVergessenSenden"))$("pwVergessenSenden").onclick=async()=>{
 const login=$("pwVergessenLogin").value.trim();
 const status=$("pwVergessenStatus");
 if(!login){status.textContent="Bitte Benutzername oder E-Mail eingeben.";status.style.color="var(--red)";return}
 $("pwVergessenSenden").disabled=true;
 status.textContent="";
 // Die Antwort ist absichtlich IMMER dieselbe (siehe Edge Function
 // password-reset, Kopfkommentar) - kein Unterschied zwischen "Konto
 // gefunden" und "Konto nicht gefunden", auch nicht bei einem Netzfehler.
 try{ await sb.functions.invoke("password-reset",{body:{action:"request",login}}); }
 catch(e){ /* siehe oben */ }
 status.textContent="Falls zu diesem Konto eine E-Mail-Adresse hinterlegt ist, wurde soeben ein Link verschickt.";
 status.style.color="var(--muted)";
 $("pwVergessenSenden").disabled=false;
};

// ---- Passwort vergessen: neues Passwort setzen ---------------------------
if($("prSpeichern"))$("prSpeichern").onclick=async()=>{
 const p1=$("prNeuesPasswort").value,p2=$("prNeuesPasswort2").value;
 const err=$("prError");
 err.textContent="";
 if(p1.length<8){err.textContent="Das Passwort muss mindestens 8 Zeichen haben.";return}
 if(p1!==p2){err.textContent="Die beiden Eingaben stimmen nicht überein.";return}
 $("prSpeichern").disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("password-reset",{body:{action:"confirm",token:passwordResetToken,password:p1}});
  if(error){err.textContent=await edgeFunctionErrorMessage(error,"Passwort konnte nicht gesetzt werden.");return}
  if(!data?.ok){err.textContent=data?.error||"Passwort konnte nicht gesetzt werden.";return}
  alert("Passwort gesetzt. Du kannst dich jetzt anmelden.");
  location.href=location.pathname;
 }catch(e){
  err.textContent=(e&&e.message)?e.message:String(e);
 }finally{
  $("prSpeichern").disabled=false;
 }
};

// ---- Firma per Einladungslink anlegen -------------------------------------
if($("ciSubmit"))$("ciSubmit").onclick=async()=>{
 const err=$("ciError");
 err.textContent="";
 const companyName=$("ciCompanyName").value.trim();
 const vor=$("ciFirstName").value.trim();
 const nach=$("ciLastName").value.trim();
 const email=$("ciEmail").value.trim().toLowerCase();
 const pw1=$("ciPassword").value,pw2=$("ciPassword2").value;
 if(!companyName){err.textContent="Bitte einen Firmennamen eingeben.";return}
 if(!vor||!nach){err.textContent="Bitte Vor- und Nachname eingeben.";return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent="Bitte eine gültige E-Mail-Adresse eingeben.";return}
 if(pw1.length<8){err.textContent="Das Passwort muss mindestens 8 Zeichen haben.";return}
 if(pw1!==pw2){err.textContent="Die beiden Passwort-Eingaben stimmen nicht überein.";return}
 $("ciSubmit").disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("register-company",{body:{
   company_name:companyName,first_name:vor,last_name:nach,email,password:pw1,invite_token:companyInviteToken
  }});
  if(error){err.textContent=await edgeFunctionErrorMessage(error,"Registrierung fehlgeschlagen.");return}
  if(!data?.ok){err.textContent=data?.error||"Registrierung fehlgeschlagen.";return}
  alert("Firma "+data.company.name+" wurde angelegt. Du kannst dich jetzt anmelden.");
  location.href=location.pathname;
 }catch(e){
  err.textContent=(e&&e.message)?e.message:String(e);
 }finally{
  $("ciSubmit").disabled=false;
 }
};
