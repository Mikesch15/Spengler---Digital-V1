// v3.05 Persoenliche Aufgabenzentrale auf der Startseite
// ---------------------------------------------------------------------------
// Zeigt dem angemeldeten Mitarbeiter NUR seine eigenen offenen Aufgaben.
// Sie entstehen ausschliesslich aus den echten Massaufnahme-/Zuweisungsdaten
// (js/44-workflow.js) - es gibt kein zweites, losgeloestes Aufgabensystem und
// keine eigene Aufgaben-Tabelle.
//
// Die Firmengrenze erzwingt weiterhin ausschliesslich die restriktive
// tenant_boundary_measurements-Policy: die Abfragen filtern NIE selbst nach
// company_id. Gefiltert wird nur nach "gehoert mir" (created_by / ruester_id /
// monteur_id) - das ist die persoenliche Auswahl, keine Berechtigung.

// v3.07: Die Karte ist zugeklappt und nimmt dann eine Zeile ein. Der ganze
// Arbeitsablauf laesst sich in den Einstellungen firmenweit abschalten
// (app_settings.workflow_aktiv) - das ist reine Anzeige, abgesichert bleibt er
// ausschliesslich serverseitig.

const AUFGABEN_LIMIT=25;   // Startseite, nicht Arbeitsliste
let aufgabenListe=[];
let aufgabenLauf=0;
// Der Klick gilt fuer jetzt, die Einstellung fuer den Start (js/01-basis.js).
let aufgabenOffen=(typeof aufgabenOffenStart!=="undefined")?!!aufgabenOffenStart:false;

// Firmenweiter Schalter. Fehlt der Wert (noch nicht geladen), gilt "ein" -
// die Vorgabe der Spalte.
function aufgabenAktiv(){return (typeof workflowAktiv==="undefined")||workflowAktiv!==false}

// v3.10: Welcher Schritt dran ist, entscheidet mwNaechsterSchritt() in js/44 -
// dieselbe Quelle wie das Formular, die Listen und die Werkstattansicht.
// Hier stehen nur noch die Beschriftungen dazu.
const AUFGABEN_TITEL={
 erneut_freigeben:"Erneut freigeben – nach der Freigabe geändert",
 freigeben:   "Massaufnahme freigeben",
 zuweisen:    "Rüster/Monteur zuweisen",
 monteur:     "Monteur zuweisen",
 ruesten:     "Zu rüsten",
 montieren:   "Zu montieren",
 abschliessen:"Abschliessen"
};
const AUFGABEN_KNOPF={
 erneut_freigeben:"Massaufnahme öffnen",
 freigeben:   "Massaufnahme öffnen",
 zuweisen:    "Zuweisen",
 monteur:     "Monteur zuweisen",
 ruesten:     "Gerüstet",
 montieren:   "Montiert",
 abschliessen:"Abschliessen"
};
// Farbe aus derselben Tabelle wie ueberall sonst; faellt js/44 aus, bleibt
// die Aufgabe sichtbar statt zu verschwinden.
function aufgabenArt(k){
 const f=(typeof MW_SCHRITTE!=="undefined"&&MW_SCHRITTE[k])?MW_SCHRITTE[k].farbe:"orange";
 return {titel:AUFGABEN_TITEL[k]||k,farbe:f,knopf:AUFGABEN_KNOPF[k]||"Massaufnahme öffnen"};
}

function aufgabenIch(){return currentProfile?currentProfile.id:null}

// ===========================================================================
// v3.185: Eine Aufgabe auf ein Datum terminieren
// ---------------------------------------------------------------------------
// "Meine aufgaben auf der startseite sollen die moeglichkeit erhalten auf ein
//  bestimmtes datum terminiert zu werden, zb wenn man in den ferien ist oder
//  das montieren erst 1 monat spaeter stattfinden soll."
//
// Die Aufgaben bleiben ABGELEITET. Es entsteht keine Aufgaben-Tabelle; in
// aufgaben_termine steht ausschliesslich "diese eine Aufgabe interessiert
// mich erst ab dem ...". Der Schluessel ist deshalb dreiteilig:
//   profil_id      wessen persoenliche Liste (die Tabelle zeigt per RLS nur
//                  die eigenen Zeilen)
//   measurement_id welche Massaufnahme
//   schritt        welcher Schritt daran. Ohne ihn wuerde ein Termin fuers
//                  Ruesten auch das spaetere Montieren verschlucken - zwei
//                  verschiedene Arbeiten, oft von zwei verschiedenen Leuten.
//
// TERMINIERT HEISST NUR: NICHT IN MEINER LISTE.
// Am Workflow-Status aendert sich nichts. Im Projekt, in der Werkstatt und
// in der Admin-Uebersicht bleibt die Massaufnahme unveraendert sichtbar -
// sonst waere ein Termin ein Weg, Arbeit vor der Firmenleitung zu verbergen.
// ===========================================================================

let aufgabenTermine=Object.create(null);   // "id\u0000schritt" -> {id,faellig_am}

function aufgabenTerminSchluessel(mId,schritt){
 return String(mId)+"\u0000"+String(schritt||"");
}
// Heute als YYYY-MM-DD in ORTSZEIT. toISOString() waere UTC und wuerde am
// Abend bereits den naechsten Tag melden - ein Termin auf heute waere dann
// abends faelschlich schon abgelaufen.
function aufgabenHeute(){
 const d=new Date();
 const z=n=>String(n).padStart(2,"0");
 return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate());
}
async function aufgabenTermineLaden(){
 const ich=aufgabenIch();
 if(!ich){aufgabenTermine=Object.create(null);return}
 const {data,error}=await sb.from("aufgaben_termine")
   .select("id,measurement_id,schritt,faellig_am");
 if(error){console.error("Termine laden",error);return}   // alten Stand lassen
 const neu=Object.create(null);
 (data||[]).forEach(t=>{
  neu[aufgabenTerminSchluessel(t.measurement_id,t.schritt)]=
   {id:t.id,faellig_am:String(t.faellig_am||"")};
 });
 aufgabenTermine=neu;
}
// Der Termin einer Aufgabe, oder null.
function aufgabenTerminVon(a){
 if(!a||!a.m)return null;
 return aufgabenTermine[aufgabenTerminSchluessel(a.m.id,a.art)]||null;
}
// Terminiert ist eine Aufgabe nur, solange das Datum in der ZUKUNFT liegt.
// Ist es erreicht, taucht sie von selbst wieder auf - es braucht keinen
// Aufraeumlauf, der einen abgelaufenen Termin loescht.
function aufgabenIstTerminiert(a){
 const t=aufgabenTerminVon(a);
 return !!t && t.faellig_am > aufgabenHeute();
}
// EINE Quelle fuer beide Ansichten. Haette jede ihren eigenen Filter,
// koennten klassische Ansicht und Ansicht 2.0 verschieden viele Aufgaben
// zeigen.
let aufgabenTerminierteZeigen=false;       // nur Anzeige, nicht gespeichert
function aufgabenSichtbareListe(){
 const alle=Array.isArray(aufgabenListe)?aufgabenListe:[];
 if(aufgabenTerminierteZeigen)return alle;
 return alle.filter(a=>!aufgabenIstTerminiert(a));
}
function aufgabenTerminierteListe(){
 const alle=Array.isArray(aufgabenListe)?aufgabenListe:[];
 return alle.filter(a=>aufgabenIstTerminiert(a));
}
function aufgabenDatumText(iso){
 const s=String(iso||"");
 const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m?(m[3]+"."+m[2]+"."+m[1]):s;
}

// Setzen und Entfernen. Beides schreibt und PRUEFT das Ergebnis: ein von RLS
// geblockter Schreibvorgang meldet keinen Fehler, er betrifft still 0 Zeilen
// (CLAUDE.md 24.1).
async function aufgabenTerminSetzen(mId,schritt,datum){
 const ich=aufgabenIch();
 if(!ich)return {ok:false,meldung:"Nicht angemeldet."};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(datum||"")))
  return {ok:false,meldung:"Bitte ein Datum wählen."};
 if(String(datum)<=aufgabenHeute())
  return {ok:false,meldung:"Das Datum muss in der Zukunft liegen – sonst ändert sich nichts."};
 const {data,error}=await sb.from("aufgaben_termine")
   .upsert({profil_id:ich,measurement_id:mId,schritt:String(schritt||""),faellig_am:datum},
           {onConflict:"profil_id,measurement_id,schritt"})
   .select("id,faellig_am");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nicht gespeichert – fehlt die nötige Berechtigung?"};
 aufgabenTermine[aufgabenTerminSchluessel(mId,schritt)]=
  {id:data[0].id,faellig_am:String(data[0].faellig_am||datum)};
 return {ok:true};
}
async function aufgabenTerminWeg(mId,schritt){
 const ich=aufgabenIch();
 if(!ich)return {ok:false,meldung:"Nicht angemeldet."};
 const {data,error}=await sb.from("aufgaben_termine").delete()
   .eq("profil_id",ich).eq("measurement_id",mId).eq("schritt",String(schritt||""))
   .select("id");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nichts geändert – fehlt die nötige Berechtigung?"};
 delete aufgabenTermine[aufgabenTerminSchluessel(mId,schritt)];
 return {ok:true};
}

// Die Anzeige einer Aufgabe: Adresse (wie im Projekt-Cockpit) und die Art der
// Massaufnahme. Die Projektlogik wird dafuer nicht dupliziert, sondern die
// bestehende eintragAdresse()/MEAS_TYPE_LABELS verwendet.
function aufgabenBeschriftung(m){
 const adresse=typeof eintragAdresse==="function"
  ? eintragAdresse(m,m.title||"")
  : (m.title||"Massaufnahme");
 const art=(typeof MEAS_TYPE_LABELS!=="undefined"&&MEAS_TYPE_LABELS[m.type])||m.type||"";
 const titel=String(m.title||"").trim();
 // Titel nur nennen, wenn er nicht ohnehin schon die Adresse ist.
 const zusatz=[art,titel&&titel!==adresse?titel:""].filter(Boolean).join(" · ");
 return {adresse,zusatz};
}

async function aufgabenLaden(){
 const ich=aufgabenIch();
 if(!ich)return [];
 const felder="id,project_id,type,title,date,workflow_status,freigabe_verfallen,created_by,ruester_id,monteur_id";
 // Drei getrennte, schmale Abfragen statt einer breiten mit OR - jede fragt
 // genau eine persoenliche Rolle ab.
 const [eigene,ruest,mont]=await Promise.all([
  // v3.10: "geruestet" (Monteur fehlt) und "montiert" (Abschluss fehlt)
  // waren bis v3.09 nicht dabei - beide Zustaende sagten deshalb niemandem,
  // dass sie liegen bleiben.
  sb.from("measurements").select(felder).eq("created_by",ich)
    .in("workflow_status",["in_bearbeitung","freigegeben","geruestet","montiert"])
    .order("updated_at",{ascending:false}).limit(AUFGABEN_LIMIT),
  sb.from("measurements").select(felder).eq("ruester_id",ich).eq("workflow_status","zu_ruesten")
    .order("updated_at",{ascending:false}).limit(AUFGABEN_LIMIT),
  sb.from("measurements").select(felder).eq("monteur_id",ich).eq("workflow_status","zu_montieren")
    .order("updated_at",{ascending:false}).limit(AUFGABEN_LIMIT)
 ]);
 if(eigene.error||ruest.error||mont.error){
  console.error("Aufgaben laden",eigene.error||ruest.error||mont.error);
  return null;
 }
 const liste=[];
 (eigene.data||[]).forEach(m=>{
  // Eine Massaufnahme ohne Projekt kann nicht freigegeben werden (sie gehoert
  // zu keinem Projekt und damit zu keiner Firmengrenze) - sie erscheint
  // deshalb gar nicht erst als Aufgabe.
  if(!m.project_id)return;
  // v3.06: Eine verfallene Freigabe ist etwas anderes als eine noch nie
  // freigegebene - sie blockiert bereits eingeteilte Leute.
  // Der Schluessel kommt aus der gemeinsamen Quelle - hier wird nicht ein
  // zweites Mal abgeleitet, was als Naechstes dran ist.
  const k=(typeof mwSchrittSchluessel==="function")?mwSchrittSchluessel(m):"";
  // "zuweisen" nur, solange wirklich niemand eingeteilt ist: sonst laeuft die
  // Massaufnahme bereits und der Aufnehmer hat nichts zu tun.
  if(k==="zuweisen"&&(m.ruester_id||m.monteur_id))return;
  if(AUFGABEN_TITEL[k])liste.push({art:k,m});
 });
 (ruest.data||[]).forEach(m=>{if(m.project_id)liste.push({art:"ruesten",m})});
 (mont.data||[]).forEach(m=>{if(m.project_id)liste.push({art:"montieren",m})});
 // Rot zuerst, danach nach Datum.
 const rang={erneut_freigeben:0,ruesten:1,freigeben:2,zuweisen:3,monteur:4,montieren:5,abschliessen:6};
 liste.sort((a,b)=>(rang[a.art]-rang[b.art])||String(b.m.date||"").localeCompare(String(a.m.date||"")));
 return liste;
}

// Die zugeklappte Zeile sagt genau so viel, wie sie muss: wie viele Aufgaben
// offen sind und wie viele davon jetzt dran sind (rot).
function aufgabenKopfText(){
 // v3.185: gezaehlt wird, was WIRKLICH in der Liste steht. Eine terminierte
 // Aufgabe mitzuzaehlen, waere eine Zahl ohne Entsprechung darunter.
 const sicht=aufgabenSichtbareListe();
 const n=sicht.length;
 const dringend=sicht.filter(a=>aufgabenArt(a.art).farbe==="rot").length;
 const haupt=`🔔 ${n} offene ${n===1?"Aufgabe":"Aufgaben"}`;
 return dringend?`${haupt} <span class="aufgaben-dringend">· ${dringend} dringend</span>`:haupt;
}

function renderAufgaben(){
 const karte=$("aufgabenKarte"), box=$("aufgabenListe");
 if(!karte||!box)return;
 // v3.185: Die Karte bleibt stehen, solange etwas TERMINIERT ist - sonst
 // verschwaende der Zaehler mit der letzten offenen Aufgabe, und niemand
 // saehe mehr, dass noch etwas wartet.
 const sichtbar=aufgabenSichtbareListe();
 const terminiert=aufgabenTerminierteListe();
 if(!aufgabenAktiv()||!aufgabenListe||(!sichtbar.length&&!terminiert.length)){
  karte.hidden=true;box.innerHTML="";
  const j=$("aufgabenJetzt"); if(j){j.hidden=true;j.innerHTML=""}
  return;
 }
 karte.hidden=false;
 const titel=$("aufgabenTitel"); if(titel)titel.innerHTML=aufgabenKopfText();
 karte.classList.toggle("offen",aufgabenOffen);
 const kopf=$("aufgabenKopf");
 if(kopf){
  kopf.setAttribute("aria-expanded",aufgabenOffen?"true":"false");
  kopf.title=aufgabenOffen?"Aufgaben zuklappen":"Aufgaben anzeigen";
 }
 box.innerHTML=aufgabenTerminZeileHtml()+sichtbar.map(aufgabeKarteHtml).join("");
 // v3.10: Auch zugeklappt steht die eine Aufgabe da, die jetzt dran ist.
 // Zugeklappt sah man bis v3.09 nur eine Zahl - und damit nicht, was zu tun
 // ist. Offen faellt sie weg, dort steht sie ohnehin zuoberst in der Liste.
 const jetzt=$("aufgabenJetzt");
 if(jetzt){
  if(aufgabenOffen){jetzt.hidden=true;jetzt.innerHTML=""}
  else{jetzt.hidden=false;jetzt.innerHTML=aufgabeJetztHtml(sichtbar[0])}
 }
}

// Die kompakte Fassung fuer den zugeklappten Zustand: eine Zeile mit dem
// Schritt, der Adresse und dem Knopf. Bewusst nicht die volle Karte - die
// Startseite soll dadurch nicht wieder einen halben Bildschirm brauchen
// (das war der Grund fuer das Zuklappen in v3.07).
function aufgabeJetztHtml(a){
 if(!a)return "";
 const art=aufgabenArt(a.art), b=aufgabenBeschriftung(a.m);
 return `<div class="aufgabe-jetzt-zeile aufgabe-${art.farbe}">
  <span class="aufgabe-marke aufgabe-marke-${art.farbe}"></span>
  <span class="aufgabe-jetzt-text"><b>${esc(art.titel)}</b><br>${esc(b.adresse)}</span>
  <button type="button" class="blue aufgabe-jetzt-knopf" data-aufgabe="${esc(a.art)}" data-aufgabe-id="${esc(a.m.id)}">${esc(art.knopf)}</button>
 </div>`;
}

// v3.185: Die Zeile ueber der Liste. Sie erscheint NUR, wenn wirklich etwas
// terminiert ist - eine dauerhaft sichtbare "0 terminiert"-Zeile waere
// Ballast.
function aufgabenTerminZeileHtml(){
 const n=aufgabenTerminierteListe().length;
 if(!n)return "";
 return `<button type="button" class="aufgaben-terminzeile" data-aufgabe="terminliste">
  ${aufgabenTerminierteZeigen?"▾":"▸"} ${n} terminiert${aufgabenTerminierteZeigen?" – ausblenden":" – anzeigen"}
 </button>`;
}

// Welche Aufgabe wird gerade terminiert? Reine Anzeige-Angabe dieses
// Geraets, kein Datenzustand.
let aufgabenTerminFormular="";

// Eine Aufgabe als Karte. Eine Darstellung fuer beide Stellen.
function aufgabeKarteHtml(a){
 if(!a)return "";
 const art=aufgabenArt(a.art), b=aufgabenBeschriftung(a.m);
 return `<div class="aufgabe aufgabe-${art.farbe}">
   <div class="aufgabe-kopf"><span class="aufgabe-marke aufgabe-marke-${art.farbe}"></span>${esc(art.titel)}</div>
   <div class="aufgabe-titel">${esc(b.adresse)}</div>
   ${b.zusatz?`<div class="aufgabe-zusatz">${esc(b.zusatz)}</div>`:""}
   ${aufgabeTerminHtml(a)}
   <div class="aufgabe-knoepfe">
    <button type="button" class="blue aufgabe-haupt" data-aufgabe="${esc(a.art)}" data-aufgabe-id="${esc(a.m.id)}">${esc(art.knopf)}</button>
    ${(a.art==="freigeben"||a.art==="erneut_freigeben")?"":`<button type="button" class="gray" data-aufgabe="oeffnen" data-aufgabe-id="${esc(a.m.id)}">Massaufnahme öffnen</button>`}
    ${aufgabeTerminKnopfHtml(a)}
   </div>
  </div>`;
}

// Der Terminhinweis bzw. das Datumsfeld. Bewusst INNERHALB der Karte und
// ohne eigenen Dialog: ein Datum zu waehlen ist ein Handgriff, kein Vorgang.
function aufgabeTerminHtml(a){
 const schl=aufgabenTerminSchluessel(a.m.id,a.art);
 const t=aufgabenTerminVon(a);
 if(aufgabenTerminFormular===schl){
  // min = morgen. Ein Termin auf heute oder frueher aendert nichts, und ein
  // Feld, das eine wirkungslose Eingabe zulaesst, ist eine Falle.
  const morgen=new Date(Date.now()+86400000);
  const z=n=>String(n).padStart(2,"0");
  const min=morgen.getFullYear()+"-"+z(morgen.getMonth()+1)+"-"+z(morgen.getDate());
  return `<div class="aufgabe-termin-form">
   <label class="small">Wieder anzeigen ab
    <input type="date" data-termin-datum="${esc(schl)}" min="${min}" value="${esc(t?t.faellig_am:min)}">
   </label>
   <div class="aufgabe-knoepfe">
    <button type="button" class="blue" data-aufgabe="termin-speichern" data-aufgabe-id="${esc(a.m.id)}" data-aufgabe-art="${esc(a.art)}">Speichern</button>
    <button type="button" class="gray" data-aufgabe="termin-abbrechen">Abbrechen</button>
   </div></div>`;
 }
 if(t&&aufgabenIstTerminiert(a))
  return `<div class="aufgabe-termin small">🗓 Terminiert auf ${esc(aufgabenDatumText(t.faellig_am))}</div>`;
 return "";
}
function aufgabeTerminKnopfHtml(a){
 const schl=aufgabenTerminSchluessel(a.m.id,a.art);
 if(aufgabenTerminFormular===schl)return "";
 if(aufgabenIstTerminiert(a))
  return `<button type="button" class="gray" data-aufgabe="termin-weg" data-aufgabe-id="${esc(a.m.id)}" data-aufgabe-art="${esc(a.art)}">Termin aufheben</button>`;
 return `<button type="button" class="gray" data-aufgabe="termin-neu" data-aufgabe-id="${esc(a.m.id)}" data-aufgabe-art="${esc(a.art)}">🗓 Terminieren</button>`;
}

async function aufgabenNeuLaden(){
 const karte=$("aufgabenKarte");
 if(!karte)return;
 if(!currentProfile||!aufgabenAktiv()){karte.hidden=true;return}
 // Ohne Verbindung wird die Liste nicht geleert - sie bleibt auf dem zuletzt
 // geladenen Stand stehen, statt faelschlich "nichts offen" zu behaupten.
 if(typeof offlineIstOffline==="function"&&offlineIstOffline())return;
 const lauf=++aufgabenLauf;
 // v3.185: Termine zusammen mit den Aufgaben laden. Zwei getrennte Aufrufe
 // koennten sonst verschiedene Staende zeigen.
 const [liste]=await Promise.all([aufgabenLaden(),aufgabenTermineLaden()]);
 if(lauf!==aufgabenLauf)return;          // eine neuere Aktualisierung laeuft
 if(liste===null)return;                 // Fehler: alten Stand stehen lassen
 aufgabenListe=liste;
 renderAufgaben();
}

// Die Massaufnahme zu einer Aufgabe oeffnen. Geladen wird die echte Zeile -
// RLS entscheidet, ob sie herausgegeben wird; eine manipulierte ID oeffnet
// nichts.
async function aufgabeOeffnen(id){
 const {data,error}=await sb.from("measurements").select("*").eq("id",id).maybeSingle();
 if(error||!data){alert("Diese Massaufnahme ist nicht mehr verfügbar.");aufgabenNeuLaden();return}
 measEditReturnTo="startScreen";
 $("startScreen").hidden=true;
 openMeasurement(data);
}

async function aufgabeAusfuehren(art,id){
 if(art==="oeffnen"||art==="freigeben"||art==="erneut_freigeben"||art==="zuweisen"||art==="monteur"){
  await aufgabeOeffnen(id);
  // Zuweisen und Freigeben passieren in der Workflow-Karte des Formulars -
  // eine Stelle, eine Logik.
  if((art==="zuweisen"||art==="monteur")&&typeof mwZuweisenOeffnen==="function")mwZuweisenOeffnen();
  return;
 }
 // v3.10: Der Abschluss ist der letzte Schritt der Kette und war bis v3.09
 // nirgends als Aufgabe sichtbar.
 if(art==="abschliessen"){
  if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Abschliessen"))return;
  if(!confirm("Diese Massaufnahme abschliessen?"))return;
  const {error}=await sb.rpc("measurement_abschliessen",{p_id:Number(id)});
  if(error){
   console.error("Aufgabe abschliessen",error);
   alert(error.message||"Der Schritt konnte nicht ausgeführt werden.");
  }
  aufgabenNeuLaden();
  if(typeof werkstattNeuLaden==="function")werkstattNeuLaden();
  return;
 }
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Dieser Arbeitsschritt"))return;
 const frage=art==="ruesten"
  ? "Rüsten bestätigen?\n\nDamit bestätigst du, dass das Material für diese Massaufnahme gerüstet ist."
  : "Montage bestätigen?\n\nDamit bestätigst du, dass die Arbeit montiert ist.";
 if(!confirm(frage))return;
 const {error}=await sb.rpc(art==="ruesten"?"measurement_geruestet":"measurement_montiert",{p_id:Number(id)});
 if(error){
  console.error("Aufgabe",art,error);
  alert(error.message||"Der Schritt konnte nicht ausgeführt werden.");
 }
 aufgabenNeuLaden();
 // v3.09: derselbe Schritt kann aus der Werkstattansicht kommen - eine
 // Logik, zwei Sichten.
 if(typeof werkstattNeuLaden==="function")werkstattNeuLaden();
}

document.addEventListener("click",async e=>{
 const k=e.target&&e.target.closest?e.target.closest("[data-aufgabe]"):null;
 if(!k)return;
 const was=k.dataset.aufgabe;

 // ---- v3.185: Termine ----------------------------------------------------
 // Bewusst VOR aufgabeAusfuehren(): das dort bestehende Verhalten bleibt
 // damit unberuehrt, es kommt nur davor etwas dazu.
 if(was==="terminliste"){
  aufgabenTerminierteZeigen=!aufgabenTerminierteZeigen;
  renderAufgaben();
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 if(was==="termin-neu"){
  aufgabenTerminFormular=aufgabenTerminSchluessel(k.dataset.aufgabeId,k.dataset.aufgabeArt);
  renderAufgaben();
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 if(was==="termin-abbrechen"){
  aufgabenTerminFormular="";
  renderAufgaben();
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 if(was==="termin-speichern"){
  const id=k.dataset.aufgabeId, art=k.dataset.aufgabeArt;
  const feld=document.querySelector('[data-termin-datum="'+aufgabenTerminSchluessel(id,art)+'"]');
  const r=await aufgabenTerminSetzen(id,art,feld?feld.value:"");
  if(!r.ok){alert(r.meldung);return}
  aufgabenTerminFormular="";
  renderAufgaben();
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 if(was==="termin-weg"){
  const r=await aufgabenTerminWeg(k.dataset.aufgabeId,k.dataset.aufgabeArt);
  if(!r.ok){alert(r.meldung);return}
  renderAufgaben();
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }

 aufgabeAusfuehren(was,k.dataset.aufgabeId);
});

// Auf- und Zuklappen. Der Kopf ist ein echter Knopf (Tastatur bedienbar), der
// Info-Knopf steht daneben und nicht darin - ein Knopf im Knopf waere kein
// gueltiges HTML.
if($("aufgabenKopf")){
 $("aufgabenKopf").addEventListener("click",()=>{
  aufgabenOffen=!aufgabenOffen;
  renderAufgaben();
 });
}
