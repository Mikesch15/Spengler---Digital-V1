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

const AUFGABEN_LIMIT=25;   // Startseite, nicht Arbeitsliste
let aufgabenListe=[];
let aufgabenLauf=0;

// Rot = jetzt dran, Orange = wartet auf den Schritt davor bzw. weniger dringend.
const AUFGABEN_ARTEN={
 freigeben:{titel:"Massaufnahme freigeben",farbe:"rot", knopf:"Massaufnahme öffnen"},
 zuweisen: {titel:"Rüster/Monteur zuweisen",farbe:"orange",knopf:"Zuweisen"},
 ruesten:  {titel:"Zu rüsten",             farbe:"rot", knopf:"Gerüstet"},
 montieren:{titel:"Zu montieren",          farbe:"orange",knopf:"Montiert"}
};

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
 const felder="id,project_id,type,title,date,workflow_status,created_by,ruester_id,monteur_id";
 // Drei getrennte, schmale Abfragen statt einer breiten mit OR - jede fragt
 // genau eine persoenliche Rolle ab.
 const [eigene,ruest,mont]=await Promise.all([
  sb.from("measurements").select(felder).eq("created_by",ich)
    .in("workflow_status",["in_bearbeitung","freigegeben"])
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
  if(m.workflow_status==="in_bearbeitung")liste.push({art:"freigeben",m});
  else if(m.workflow_status==="freigegeben"&&!m.ruester_id&&!m.monteur_id)liste.push({art:"zuweisen",m});
 });
 (ruest.data||[]).forEach(m=>{if(m.project_id)liste.push({art:"ruesten",m})});
 (mont.data||[]).forEach(m=>{if(m.project_id)liste.push({art:"montieren",m})});
 // Rot zuerst, danach nach Datum.
 const rang={ruesten:0,freigeben:1,montieren:2,zuweisen:3};
 liste.sort((a,b)=>(rang[a.art]-rang[b.art])||String(b.m.date||"").localeCompare(String(a.m.date||"")));
 return liste;
}

function renderAufgaben(){
 const karte=$("aufgabenKarte"), box=$("aufgabenListe");
 if(!karte||!box)return;
 if(!aufgabenListe||!aufgabenListe.length){karte.hidden=true;box.innerHTML="";return}
 karte.hidden=false;
 $("aufgabenTitel").innerHTML=`🔔 Meine offenen Aufgaben (${aufgabenListe.length}) `
  +(typeof hilfeKnopf==="function"?hilfeKnopf("aufgaben"):"");
 box.innerHTML=aufgabenListe.map(a=>{
  const art=AUFGABEN_ARTEN[a.art], b=aufgabenBeschriftung(a.m);
  return `<div class="aufgabe aufgabe-${art.farbe}">
   <div class="aufgabe-kopf"><span class="aufgabe-marke aufgabe-marke-${art.farbe}"></span>${esc(art.titel)}</div>
   <div class="aufgabe-titel">${esc(b.adresse)}</div>
   ${b.zusatz?`<div class="aufgabe-zusatz">${esc(b.zusatz)}</div>`:""}
   <div class="aufgabe-knoepfe">
    <button type="button" class="blue aufgabe-haupt" data-aufgabe="${esc(a.art)}" data-aufgabe-id="${esc(a.m.id)}">${esc(art.knopf)}</button>
    ${a.art==="freigeben"?"":`<button type="button" class="gray" data-aufgabe="oeffnen" data-aufgabe-id="${esc(a.m.id)}">Massaufnahme öffnen</button>`}
   </div>
  </div>`;
 }).join("");
}

async function aufgabenNeuLaden(){
 const karte=$("aufgabenKarte");
 if(!karte)return;
 if(!currentProfile){karte.hidden=true;return}
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
 if(art==="oeffnen"||art==="freigeben"||art==="zuweisen"){
  await aufgabeOeffnen(id);
  // Zuweisen und Freigeben passieren in der Workflow-Karte des Formulars -
  // eine Stelle, eine Logik.
  if(art==="zuweisen"&&typeof mwZuweisenOeffnen==="function")mwZuweisenOeffnen();
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
}

document.addEventListener("click",e=>{
 const k=e.target&&e.target.closest?e.target.closest("[data-aufgabe]"):null;
 if(!k)return;
 aufgabeAusfuehren(k.dataset.aufgabe,k.dataset.aufgabeId);
});
