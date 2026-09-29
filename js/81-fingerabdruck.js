// ---- Fingerabdruck: Schloss vor der App (v3.225, umgebaut in v3.226) ------
//
// Wunsch des Anwenders: "Können wir eine anmeldung per fingerabdruck
// einrichten?" - entschieden wurde: Entsperren auf dem Geraet, freiwillig
// pro Person.
//
// WAS DAS IST, UND WAS NICHT. Ehrlich, weil der Unterschied zaehlt:
//
// Die App legt seit v3.187 (js/76-kontowechsel.js) den refresh_token der
// Anmeldung auf dem Geraet ab, damit sich zwischen Konten wechseln laesst -
// dort steht es auch so: "wer das Geraet in der Hand hat, kommt ohne
// Passwort in beide Konten". Supabase speichert die laufende Sitzung
// ohnehin im localStorage. Auf dem Geraet liegt also laengst ein Zugang.
//
// Der Fingerabdruck setzt ein SCHLOSS davor. Er macht die App damit
// sicherer als vorher, nicht unsicherer: bisher gab es vor diesem
// gespeicherten Zugang gar nichts. Er ist aber KEINE Verschluesselung: wer
// das entsperrte Geraet hat und sich mit den Entwicklerwerkzeugen auskennt,
// kaeme am Schloss vorbei an den Token - so wie heute auch schon, nur heute
// ohne Schloss. Eine echte Verschluesselung braeuchte die
// WebAuthn-Erweiterung "prf", die nicht jedes Geraet kann; sie waere ein
// eigener Schritt und wird hier nicht vorgetaeuscht.
//
// Es gibt KEINE serverseitige Pruefung: die Challenge wird hier erzeugt und
// nicht gegengeprueft. Das ist bei einem lokalen Schloss richtig so - das
// Betriebssystem sagt Ja oder Nein zum Finger, und die App entscheidet
// daraufhin, ob sie den gespeicherten Zugang benutzt. Ein echter Passkey
// GEGEN DEN SERVER waere etwas anderes (eigene Edge Function, eigene
// Tabelle, ausgestellte Sitzung) und wurde bewusst nicht gewaehlt.
//
// ZWEI REGELN, die nicht verhandelbar sind:
//  1. Der Weg ueber das Passwort bleibt IMMER stehen. Ein defekter Sensor
//     darf niemanden aus seiner eigenen App aussperren.
//  2. Geht es schief, sagt die App WARUM und faellt auf das Passwort
//     zurueck. Ein Schloss, das stumm nichts tut, waere das Schlimmste.

// Der Schluessel wird am BESTEHENDEN Konto-Eintrag von js/76 gemerkt (Feld
// "webauthn"), nicht in einer eigenen Liste: der Zugang, den er schuetzt,
// steht dort, und zwei Listen waeren nach dem ersten Entfernen verschieden.
const FA_FELD="webauthn";

// ---- Hilfsmittel ----------------------------------------------------------
function faBytes(n){ const a=new Uint8Array(n); (crypto||window.crypto).getRandomValues(a); return a }
function faB64(buf){
 let s=""; const b=new Uint8Array(buf);
 for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function faVonB64(t){
 const s=String(t||"").replace(/-/g,"+").replace(/_/g,"/");
 const roh=atob(s+"===".slice((s.length+3)%4));
 const b=new Uint8Array(roh.length);
 for(let i=0;i<roh.length;i++)b[i]=roh.charCodeAt(i);
 return b;
}
function faTextBytes(t){ return new TextEncoder().encode(String(t||"")) }

// Kann dieses Geraet ueberhaupt einen eingebauten Sensor? Nur dann darf der
// Schalter erscheinen - ein Schalter, der nichts bewirkt, ist schlimmer als
// keiner.
async function faMoeglich(){
 try{
  if(typeof window==="undefined"||!window.PublicKeyCredential)return false;
  if(typeof navigator==="undefined"||!navigator.credentials)return false;
  const f=PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
  if(typeof f!=="function")return false;
  return !!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
 }catch(e){ return false }
}

// Alle gemerkten Konten, die einen Fingerabdruck-Schluessel tragen.
function faKonten(){
 if(typeof kwListe!=="function")return [];
 return kwListe().filter(k=>k&&k[FA_FELD]);
}
function faEintrag(id){
 return faKonten().find(k=>String(k.id)===String(id))||null;
}
// Ist er fuer das GERADE angemeldete Konto eingeschaltet?
function faAn(){
 if(typeof kwId!=="function")return false;
 const ich=kwId();
 return !!(ich&&faEintrag(ich));
}

// Den Schluessel am Konto-Eintrag setzen oder entfernen. Eine Stelle, damit
// das Merken und das Vergessen nicht auseinanderlaufen.
function faSchluesselSetzen(id,wert){
 if(typeof kwListe!=="function"||typeof kwSpeichern!=="function")return false;
 const liste=kwListe();
 const e=liste.find(k=>String(k.id)===String(id));
 if(!e)return false;
 if(wert)e[FA_FELD]=wert; else delete e[FA_FELD];
 return kwSpeichern(liste);
}

// ---- Einschalten ----------------------------------------------------------
// Gibt {ok, meldung} zurueck. Jede Absage nennt ihren Grund.
async function faEinschalten(){
 if(!(await faMoeglich()))
  return {ok:false,meldung:"Dieses Gerät bietet keinen Fingerabdruck- oder Gesichts-Sensor an, den die App benutzen darf."};
 if(typeof currentProfile!=="object"||!currentProfile||!currentProfile.id)
  return {ok:false,meldung:"Dafür muss zuerst jemand angemeldet sein."};

 // Erst die Sitzung frisch sichern: der Fingerabdruck schuetzt genau diesen
 // gespeicherten Zugang. Ohne diesen Schritt merkt er sich einen Schluessel
 // zu einem Eintrag, den es noch gar nicht gibt.
 if(typeof kwMerken==="function")await kwMerken();
 const ich=kwId();
 if(!ich||!faEintragOderKonto(ich))
  return {ok:false,meldung:"Die Sitzung konnte nicht auf dem Gerät gesichert werden – ohne sie nützt der Fingerabdruck nichts."};

 const name=[currentProfile.first_name,currentProfile.last_name].filter(Boolean).join(" ").trim()||"Konto";
 let cred=null;
 try{
  cred=await navigator.credentials.create({publicKey:{
   challenge:faBytes(32),
   // rp ohne id: der Browser nimmt die Domain, auf der die App laeuft.
   // Eine selbst gesetzte id waere eine zweite Wahrheit ueber die Herkunft.
   rp:{name:"Spengler-DIGITAL"},
   user:{id:faTextBytes(ich),name:(currentProfile.email||name),displayName:name},
   pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
   authenticatorSelection:{
    authenticatorAttachment:"platform",   // der eingebaute Sensor, kein Stick
    userVerification:"required"           // Finger/Gesicht, nicht blosses Tippen
   },
   timeout:60000, attestation:"none"
  }});
 }catch(e){
  const n=e&&e.name;
  if(n==="NotAllowedError")
   return {ok:false,meldung:"Abgebrochen – es wurde kein Fingerabdruck bestätigt."};
  return {ok:false,meldung:"Der Fingerabdruck liess sich nicht einrichten: "+((e&&e.message)||n||"unbekannter Fehler")};
 }
 if(!cred||!cred.rawId)
  return {ok:false,meldung:"Das Gerät hat keinen Schlüssel zurückgegeben."};

 if(!faSchluesselSetzen(ich,faB64(cred.rawId)))
  return {ok:false,meldung:"Der Schlüssel liess sich auf diesem Gerät nicht speichern."};
 return {ok:true,meldung:"Eingeschaltet. Beim nächsten Öffnen ist die App gesperrt und geht mit dem Fingerabdruck wieder auf. Das Passwort funktioniert weiterhin."};
}

// Der Eintrag zu dieser Kennung, egal ob schon mit Schluessel oder nicht.
function faEintragOderKonto(id){
 if(typeof kwListe!=="function")return null;
 return kwListe().find(k=>String(k.id)===String(id))||null;
}

// ---- Ausschalten ----------------------------------------------------------
function faAusschalten(id){
 const ziel=id||((typeof kwId==="function")?kwId():"");
 if(!ziel)return {ok:false,meldung:"Kein Konto gefunden."};
 faSchluesselSetzen(ziel,"");
 return {ok:true,meldung:"Der Fingerabdruck ist für dieses Konto ausgeschaltet. Angemeldet wird wieder mit dem Passwort."};
}

// ---- Entsperren -----------------------------------------------------------
// v3.226, ECHTER FEHLER - so wurde er gemeldet: "Ich kann den fingerabdruck
// zwar aktivieren, aber wenn ich mich das erste mal so anmelden will,
// passiert nichts und er ist wieder deaktiviert."
//
// Zwei Ursachen, beide aus v3.225:
//
//  1. "wieder deaktiviert": Abmelden ruft sb.auth.signOut() (js/03). Das
//     gilt bei Supabase standardmaessig GLOBAL und macht dabei genau den
//     refresh_token ungueltig, den js/81 danach wieder einsetzen wollte.
//     Der Versuch scheiterte, kwSitzungSetzen() (js/76) raeumte den toten
//     Eintrag weg - und mit ihm den Schluessel, der daran haengt.
//     Der Kontowechsel lief da nie hinein: dort wird bewusst NICHT
//     abgemeldet ("KEIN signOut", js/76), und es geht um ein ANDERES
//     Konto, dessen Token niemand angefasst hat.
//  2. "passiert nichts": die Meldung dazu stand in genau dem Kasten, den
//     das Neuzeichnen unmittelbar danach ausblendete. Sichtbar blieb
//     nichts - und damit war Regel 2 von oben gebrochen.
//
// Dazu kommt der Grund, warum das nicht mit einer kleinen Korrektur getan
// war: die App stellt eine vorhandene Sitzung beim Start von selbst wieder
// her (js/18). Der Anmeldebildschirm erscheint also ueberhaupt nur, wenn
// KEINE Sitzung mehr da ist - also genau dann, wenn ein Fingerabdruck
// nichts herzustellen hat. Ein Fingerabdruck-Knopf AUF dem
// Anmeldebildschirm konnte deshalb nie funktionieren.
//
// Seit v3.226 steht er dort, wo er hingehoert: als SCHLOSS vor der
// laufenden Sitzung - das, was ausgewaehlt wurde ("Entsperren auf dem
// Geraet"). Der Sensor entscheidet nur noch, ob die App aufgeht. Es wird
// KEINE Sitzung gesetzt, also kann auch kein Token dabei veralten. Nach
// dem Abmelden braucht es einmal das Passwort - beim Abmelden ist das
// genau das Erwartete.

// Welches Konto der Sperrbildschirm gerade festhaelt. Kommt aus der
// laufenden Sitzung, nicht aus currentProfile: das ist beim Sperren noch
// gar nicht geladen.
let faSperrId="";

// Fragt den Sensor. Gibt {ok, meldung} zurueck - mehr tut er nicht.
async function faEntsperren(uid){
 const ziel=faEintrag(uid);
 if(!ziel)return {ok:false,meldung:"Für dieses Konto ist auf dem Gerät kein Fingerabdruck hinterlegt."};
 try{
  const antwort=await navigator.credentials.get({publicKey:{
   challenge:faBytes(32),
   allowCredentials:[{type:"public-key",id:faVonB64(ziel[FA_FELD])}],
   userVerification:"required",
   timeout:60000
  }});
  if(!antwort)return {ok:false,meldung:"Der Fingerabdruck wurde nicht bestätigt."};
 }catch(e){
  const n=e&&e.name;
  if(n==="NotAllowedError")
   return {ok:false,meldung:"Abgebrochen – bitte erneut versuchen oder unten abmelden und das Passwort benutzen."};
  return {ok:false,meldung:"Der Fingerabdruck liess sich nicht prüfen: "+((e&&e.message)||n||"unbekannter Fehler")};
 }
 return {ok:true};
}

// ---- Der Sperrbildschirm --------------------------------------------------
// Wird aus js/18 aufgerufen, BEVOR afterLogin() die App aufbaut. Gibt true
// zurueck, wenn er uebernommen hat - dann wartet die App auf den Finger.
async function faSperreZeigen(session){
 if(typeof $!=="function")return false;
 const uid=session&&session.user&&session.user.id;
 if(!uid)return false;
 if(!faEintrag(uid))return false;          // kein Schluessel fuer dieses Konto
 const schirm=$("faSperrScreen");
 // Fehlt der Bildschirm - etwa eine alte index.html aus dem
 // Zwischenspeicher -, geht die App AUF statt zu. Ein Schloss ohne Tuer
 // waere eine Aussperrung, und das waere schlimmer als die fehlende Sperre.
 if(!schirm)return false;
 faSperrId=String(uid);
 const k=faEintrag(uid);
 const name=$("faSperrName");
 if(name)name.textContent=(k&&k.name?k.name:"Dieses Konto")+((k&&k.firma)?" · "+k.firma:"");
 faSperreMeldung("");
 if($("authScreen"))$("authScreen").hidden=true;
 if($("appRoot"))$("appRoot").hidden=true;
 schirm.hidden=false;
 return true;
}
// Die Meldung steht AUSSERHALB von allem, was hier aus- und eingeblendet
// wird. Genau daran ist v3.225 gescheitert.
function faSperreMeldung(text){
 if(typeof $!=="function")return;
 const m=$("faSperrMeldung");
 if(m)m.textContent=text||"";
}
async function faSperreOeffnen(){
 if(typeof $!=="function")return;
 faSperreMeldung("");
 if($("faSperrScreen"))$("faSperrScreen").hidden=true;
 if(typeof afterLogin==="function")await afterLogin();
}
// Regel 1: der Weg ueber das Passwort steht IMMER offen. Ein Sensor, der
// nicht mehr antwortet, darf niemanden aus seiner eigenen App aussperren.
// Abgemeldet wird dafuer wie ueberall sonst - samt Zwischenspeicher, es
// darf keine Firma auf dem Geraet zurueckbleiben (js/03).
async function faSperreAufgeben(){
 if(typeof confirm==="function"&&!confirm(
   "Abmelden und mit Benutzername und Passwort anmelden?\n\n"
  +"Der Fingerabdruck bleibt eingerichtet und entsperrt die App wieder, "
  +"sobald du angemeldet bist."))return;
 if(typeof offlineCacheLeeren==="function")offlineCacheLeeren();
 try{ await sb.auth.signOut() }catch(e){}
 if(typeof location!=="undefined"&&location.reload)location.reload();
}

// ---- Hinweis auf dem Anmeldebildschirm ------------------------------------
// KEIN Knopf: nach dem Abmelden gibt es nichts zu entsperren (siehe oben).
// Ein Knopf, der dort nicht funktionieren kann, war der gemeldete Fehler.
// Stattdessen der Satz, der die Frage beantwortet, die man sich sonst
// stellt: "wo ist mein Fingerabdruck hin?"
function faLoginHinweisZeichnen(){
 if(typeof $!=="function")return;
 const h=$("faLoginHinweis");
 if(h)h.hidden=!faKonten().length;
}

if(typeof document!=="undefined")document.addEventListener("click",async e=>{
 const an=e.target.closest&&e.target.closest("[data-fa-an]");
 if(an){
  faEinstellungMeldung("Sensor wird gefragt …");
  const r=await faEinschalten();
  faEinstellungMeldung(r.meldung||"");
  faEinstellungZeichnen();
  return;
 }
 const aus=e.target.closest&&e.target.closest("[data-fa-aus]");
 if(aus){
  const r=faAusschalten(aus.getAttribute("data-fa-aus"));
  faEinstellungMeldung(r.meldung||"");
  faEinstellungZeichnen();
  return;
 }
 const ent=e.target.closest&&e.target.closest("[data-fa-entsperren]");
 if(ent){
  faSperreMeldung("Sensor wird gefragt …");
  const r=await faEntsperren(faSperrId);
  if(r.ok){ await faSperreOeffnen(); return }
  // Der Schluessel bleibt liegen: ein verweigerter Finger ist kein Grund,
  // das Schloss abzuschrauben. Beim naechsten Versuch geht es wieder.
  faSperreMeldung(r.meldung||"Hat nicht geklappt – bitte unten abmelden und das Passwort benutzen.");
  return;
 }
 const pw=e.target.closest&&e.target.closest("[data-fa-passwort]");
 if(pw){ await faSperreAufgeben(); return }
});

// ---- Der eigene Dialog (v3.227) -------------------------------------------
// Bis v3.226 stand der Schalter im Kontowechsel-Dialog (js/76) - fachlich
// naheliegend, weil der Fingerabdruck denselben gespeicherten Zugang
// schuetzt. Seit v3.227 ist "Konto wechseln" der Firmenadministration
// vorbehalten, der Fingerabdruck steht dagegen jedem einzeln offen ("Jeder
// fuer sich, freiwillig"). An der alten Stelle waere er fuer die
// Mitarbeitenden schlicht verschwunden.
//
// Gezeichnet wird beim Oeffnen, nicht auf Vorrat: ein Schalter, der den
// Stand von gestern zeigt, ist schlimmer als keiner.
function faDialogOeffnen(){
 if(typeof $!=="function")return;
 faEinstellungMeldung("");
 faEinstellungZeichnen();
 const modal=$("faModal");
 if(modal)modal.hidden=false;
}

// ---- Anzeige im Dialog ----------------------------------------------------
function faEinstellungMeldung(text){
 if(typeof $!=="function")return;
 const m=$("faMeldung");
 if(m)m.textContent=text||"";
}
async function faEinstellungZeichnen(){
 if(typeof $!=="function")return;
 const box=$("faBox");
 if(!box)return;
 if(!(await faMoeglich())){
  box.innerHTML='<p class="small">Dieses Gerät bietet keinen Fingerabdruck- oder Gesichts-Sensor an, den die App benutzen darf. Angemeldet wird hier mit dem Passwort.</p>';
  return;
 }
 const ich=(typeof kwId==="function")?kwId():"";
 box.innerHTML=faAn()
  ? `<p class="small">Die App ist auf diesem Gerät gesperrt und geht mit dem Fingerabdruck auf. Das Passwort funktioniert weiterhin.</p>
     <div class="bar"><button type="button" class="gray" data-fa-aus="${esc(ich)}">Fingerabdruck ausschalten</button></div>`
  : `<p class="small">Die App öffnet sich dann nur noch mit dem Finger: beim Start steht ein Schloss davor. Der Abdruck verlässt das Gerät nie – die App bekommt vom Betriebssystem nur ein Ja oder Nein. Nach dem Abmelden braucht es einmal das Passwort.</p>
     <div class="bar"><button type="button" class="blue" data-fa-an="1">🔒 Fingerabdruck einrichten</button></div>`;
 faEinstellungHinweis();
}
// Der Hinweis steht IMMER da, ein- wie ausgeschaltet: auf einem geteilten
// Geraet ist das hier die falsche Funktion, und das soll man lesen, bevor
// man sie einschaltet - nicht erst danach.
function faEinstellungHinweis(){
 if(typeof $!=="function")return;
 const h=$("faWarnung");
 if(h)h.textContent="Nur für ein persönliches Gerät. Wer das entsperrte Gerät in der Hand hat, kommt damit in dein Konto – auf einem geteilten Werkstatt-Tablet deshalb ausgeschaltet lassen.";
}

// ---- Start ----------------------------------------------------------------
// Diese Datei ist das letzte Skript in index.html, der Baum steht also.
// Gezeichnet wird hier nur der HINWEIS auf dem Anmeldebildschirm. Das
// Schloss selbst ruft js/18 auf, und zwar erst, wenn feststeht, dass
// ueberhaupt eine Sitzung da ist - vorher gibt es nichts zu sperren.
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",faLoginHinweisZeichnen);
 else faLoginHinweisZeichnen();
}
