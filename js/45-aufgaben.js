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
 const n=aufgabenListe.length;
 const dringend=aufgabenListe.filter(a=>aufgabenArt(a.art).farbe==="rot").length;
 const haupt=`🔔 ${n} offene ${n===1?"Aufgabe":"Aufgaben"}`;
 return dringend?`${haupt} <span class="aufgaben-dringend">· ${dringend} dringend</span>`:haupt;
}

function renderAufgaben(){
 const karte=$("aufgabenKarte"), box=$("aufgabenListe");
 if(!karte||!box)return;
 if(!aufgabenAktiv()||!aufgabenListe||!aufgabenListe.length){
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
 box.innerHTML=aufgabenListe.map(aufgabeKarteHtml).join("");
 // v3.10: Auch zugeklappt steht die eine Aufgabe da, die jetzt dran ist.
 // Zugeklappt sah man bis v3.09 nur eine Zahl - und damit nicht, was zu tun
 // ist. Offen faellt sie weg, dort steht sie ohnehin zuoberst in der Liste.
 const jetzt=$("aufgabenJetzt");
 if(jetzt){
  if(aufgabenOffen){jetzt.hidden=true;jetzt.innerHTML=""}
  else{jetzt.hidden=false;jetzt.innerHTML=aufgabeJetztHtml(aufgabenListe[0])}
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

// Eine Aufgabe als Karte. Eine Darstellung fuer beide Stellen.
function aufgabeKarteHtml(a){
 if(!a)return "";
 const art=aufgabenArt(a.art), b=aufgabenBeschriftung(a.m);
 return `<div class="aufgabe aufgabe-${art.farbe}">
   <div class="aufgabe-kopf"><span class="aufgabe-marke aufgabe-marke-${art.farbe}"></span>${esc(art.titel)}</div>
   <div class="aufgabe-titel">${esc(b.adresse)}</div>
   ${b.zusatz?`<div class="aufgabe-zusatz">${esc(b.zusatz)}</div>`:""}
   <div class="aufgabe-knoepfe">
    <button type="button" class="blue aufgabe-haupt" data-aufgabe="${esc(a.art)}" data-aufgabe-id="${esc(a.m.id)}">${esc(art.knopf)}</button>
    ${(a.art==="freigeben"||a.art==="erneut_freigeben")?"":`<button type="button" class="gray" data-aufgabe="oeffnen" data-aufgabe-id="${esc(a.m.id)}">Massaufnahme öffnen</button>`}
   </div>
  </div>`;
}

async function aufgabenNeuLaden(){
 const karte=$("aufgabenKarte");
 if(!karte)return;
 if(!currentProfile||!aufgabenAktiv()){karte.hidden=true;return}
 // Ohne Verbindung wird die Liste nicht geleert - sie bleibt auf dem zuletzt
 // geladenen Stand stehen, statt faelschlich "nichts offen" zu behaupten.
 if(typeof offlineIstOffline==="function"&&offlineIstOffline())return;
 const lauf=++aufgabenLauf;
 const liste=await aufgabenLaden();
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

document.addEventListener("click",e=>{
 const k=e.target&&e.target.closest?e.target.closest("[data-aufgabe]"):null;
 if(!k)return;
 aufgabeAusfuehren(k.dataset.aufgabe,k.dataset.aufgabeId);
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
