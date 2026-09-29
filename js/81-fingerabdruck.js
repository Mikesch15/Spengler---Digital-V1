// ---- Anmeldung per Fingerabdruck (v3.225) ---------------------------------
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
 return {ok:true,meldung:"Ab jetzt geht die Anmeldung auf diesem Gerät mit dem Fingerabdruck. Das Passwort funktioniert weiterhin."};
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

// ---- Anmelden -------------------------------------------------------------
// Fragt den Sensor und stellt bei Erfolg die gespeicherte Sitzung her.
// Das Setzen der Sitzung geht ueber kwSitzungSetzen() in js/76 - dieselbe
// Stelle wie beim Kontowechsel, samt dem Aufraeumen eines Zugangs, der
// nicht mehr gilt.
async function faAnmelden(id){
 const konten=faKonten();
 const ziel=id?faEintrag(id):konten[0];
 if(!ziel)return {ok:false,meldung:"Auf diesem Gerät ist kein Fingerabdruck hinterlegt."};
 if(!(await faMoeglich()))
  return {ok:false,meldung:"Dieses Gerät bietet gerade keinen Sensor an. Bitte mit dem Passwort anmelden."};

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
   return {ok:false,meldung:"Abgebrochen – bitte erneut versuchen oder das Passwort benutzen."};
  return {ok:false,meldung:"Der Fingerabdruck liess sich nicht prüfen: "+((e&&e.message)||n||"unbekannter Fehler")};
 }

 if(typeof kwSitzungSetzen!=="function")
  return {ok:false,meldung:"Der Kontowechsel steht nicht bereit – bitte mit dem Passwort anmelden."};
 const gesetzt=await kwSitzungSetzen(ziel);
 if(!gesetzt.ok){
  // kwSitzungSetzen hat den Eintrag entfernt - mit ihm ist auch der
  // Schluessel weg, er schuetzte ja nichts mehr.
  return gesetzt;
 }
 return {ok:true};
}

// ---- Anzeige auf dem Anmeldebildschirm ------------------------------------
// Der Knopf erscheint nur, wenn es wirklich etwas zu entsperren gibt UND das
// Geraet einen Sensor hat. Das Passwortfeld bleibt daneben immer stehen.
async function faLoginZeichnen(){
 if(typeof $!=="function")return;
 const box=$("faLoginBox"), knopf=$("faLoginKnopf");
 if(!box||!knopf)return;
 const konten=faKonten();
 if(!konten.length||!(await faMoeglich())){ box.hidden=true; return }
 const k=konten[0];
 box.hidden=false;
 knopf.textContent="🔒 Als "+(k.name||"gemerktes Konto")+" mit Fingerabdruck anmelden";
 knopf.setAttribute("data-fa-konto",String(k.id));
}
function faLoginMeldung(text){
 if(typeof $!=="function")return;
 const m=$("faLoginMeldung");
 if(m)m.textContent=text||"";
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
 const login=e.target.closest&&e.target.closest("[data-fa-konto]");
 if(login){
  faLoginMeldung("Sensor wird gefragt …");
  const r=await faAnmelden(login.getAttribute("data-fa-konto"));
  if(r.ok){
   faLoginMeldung("");
   if(typeof afterLogin==="function")await afterLogin();
   return;
  }
  faLoginMeldung(r.meldung||"Hat nicht geklappt – bitte das Passwort benutzen.");
  await faLoginZeichnen();   // ein entfernter Zugang nimmt den Knopf mit
  return;
 }
});

// ---- Anzeige in den Einstellungen -----------------------------------------
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
  ? `<p class="small">Die Anmeldung auf diesem Gerät geht mit dem Fingerabdruck. Das Passwort funktioniert weiterhin.</p>
     <div class="bar"><button type="button" class="gray" data-fa-aus="${esc(ich)}">Fingerabdruck ausschalten</button></div>`
  : `<p class="small">Statt Benutzername und Passwort einzutippen: App öffnen, Finger auflegen. Der Abdruck verlässt das Gerät nie – die App bekommt vom Betriebssystem nur ein Ja oder Nein.</p>
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
// Diese Datei ist das letzte Skript in index.html, der Baum steht also. Der
// Knopf wird einmal beim Hochkommen gezeichnet; faLoginZeichnen() entscheidet
// selbst, ob er ueberhaupt erscheint. Nach dem Abmelden laedt die Seite neu
// (js/03), damit ist auch dieser Fall abgedeckt - es braucht keinen zweiten
// Aufruf an einer Stelle, die man beim naechsten Umbau vergessen wuerde.
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{faLoginZeichnen()});
 else faLoginZeichnen();
}
