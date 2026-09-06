// v3.05 Arbeitsworkflow der Massaufnahme
// ---------------------------------------------------------------------------
// IN BEARBEITUNG -> FREIGEGEBEN -> ZU RUESTEN -> GERUESTET -> ZU MONTIEREN
// -> MONTIERT -> ABGESCHLOSSEN
//
// Der Aufnehmer gibt seine eigene Massaufnahme frei, danach wird ein Ruester
// und/oder ein Monteur zugewiesen. Aufnehmer, Ruester und Monteur sind
// getrennte Rollen; eine Person darf mehrere davon haben.
//
// Was hier NICHT passiert:
//  - Es wird kein Status selbst gesetzt. Jeder Uebergang laeuft ueber die
//    SECURITY DEFINER-Funktionen in der Datenbank (measurement_freigeben,
//    _zuweisen, _geruestet, _montiert, _abschliessen, _workflow_korrigieren).
//    Ein direktes UPDATE der Workflow-Spalten weist ein Trigger ab - diese
//    Oberflaeche ist reine Fuehrung, die Absicherung liegt serverseitig.
//  - Es wird keine zweite Mitarbeiterverwaltung gebaut: die Auswahllisten
//    kommen aus dem bereits geladenen, RLS-gefilterten allProfiles.
//  - Es wird kein zweites Protokoll gebaut: den Verlauf schreibt der
//    bestehende write_audit_log-Trigger (js/23-verlauf.js zeigt ihn an).

const MW_STATUS={
 in_bearbeitung:{text:"In Bearbeitung",farbe:"grau",zeichen:"✎"},
 freigegeben:   {text:"Freigegeben",   farbe:"blau",zeichen:"✓"},
 zu_ruesten:    {text:"Zu rüsten",     farbe:"rot", zeichen:"▸"},
 geruestet:     {text:"Gerüstet",      farbe:"blau",zeichen:"✓"},
 zu_montieren:  {text:"Zu montieren",  farbe:"orange",zeichen:"▸"},
 montiert:      {text:"Montiert",      farbe:"gruen",zeichen:"✓"},
 abgeschlossen: {text:"Abgeschlossen", farbe:"gruen",zeichen:"✓"}
};
const MW_REIHENFOLGE=["in_bearbeitung","freigegeben","zu_ruesten","geruestet","zu_montieren","montiert","abgeschlossen"];

function mwStatusInfo(s){return MW_STATUS[s]||MW_STATUS.in_bearbeitung}
function mwStatusText(s){return mwStatusInfo(s).text}
function mwBadge(s){
 const i=mwStatusInfo(s);
 return `<span class="mw-badge mw-${i.farbe}">${i.zeichen} ${esc(i.text)}</span>`;
}

// Der Stand der gerade geoeffneten Massaufnahme. Er kommt entweder aus der
// geladenen Zeile (Oeffnen) oder aus dem Rueckgabewert einer Uebergangsfunktion.
let mwStand=null;

function mwStandAusZeile(m){
 if(!m||!m.id){mwStand=null;return}
 mwStand={
  id:m.id, project_id:m.project_id||null, type:m.type||"", title:m.title||"",
  created_by:m.created_by||null, created_at:m.created_at||null,
  workflow_status:m.workflow_status||"in_bearbeitung",
  freigabe_verfallen:!!m.freigabe_verfallen,
  freigegeben_von:m.freigegeben_von||null, freigegeben_am:m.freigegeben_am||null,
  ruester_id:m.ruester_id||null, ruester_zugewiesen_von:m.ruester_zugewiesen_von||null,
  ruester_zugewiesen_am:m.ruester_zugewiesen_am||null,
  geruestet_von:m.geruestet_von||null, geruestet_am:m.geruestet_am||null,
  monteur_id:m.monteur_id||null, monteur_zugewiesen_von:m.monteur_zugewiesen_von||null,
  monteur_zugewiesen_am:m.monteur_zugewiesen_am||null,
  montiert_von:m.montiert_von||null, montiert_am:m.montiert_am||null
 };
}
// Antwort einer Uebergangsfunktion uebernehmen: sie liefert genau die
// Workflow-Felder zurueck, Projekt/Typ/Titel bleiben wie sie sind.
function mwStandAusAntwort(a){
 if(!mwStand||!a)return;
 ["workflow_status","freigabe_verfallen","freigegeben_von","freigegeben_am","ruester_id","ruester_zugewiesen_von",
  "ruester_zugewiesen_am","geruestet_von","geruestet_am","monteur_id","monteur_zugewiesen_von",
  "monteur_zugewiesen_am","montiert_von","montiert_am"].forEach(k=>{mwStand[k]=a[k]??null});
 mwStand.freigabe_verfallen=!!mwStand.freigabe_verfallen;
}

function mwIchBin(){return currentProfile?currentProfile.id:null}
function mwIstAufnehmer(w){return !!(w&&w.created_by&&w.created_by===mwIchBin())}
function mwIstRuester(w){return !!(w&&w.ruester_id&&w.ruester_id===mwIchBin())}
function mwIstMonteur(w){return !!(w&&w.monteur_id&&w.monteur_id===mwIchBin())}
// Zuweisen darf der Aufnehmer oder ein Firmenadministrator - dieselbe Regel
// prueft measurement_zuweisen() noch einmal serverseitig.
function mwDarfZuweisen(w){return mwIstAufnehmer(w)||isAdmin()}

function mwWann(iso){
 if(!iso)return "";
 return typeof formatDatumZeit==="function"?formatDatumZeit(iso):String(iso);
}
function mwPerson(id){
 if(!id)return "–";
 const n=typeof profileName==="function"?profileName(id):"";
 return n||"Unbekannter Benutzer";
}

// Eine Zeile "Rolle: Person am Zeitpunkt", leere Angaben fallen weg.
function mwZeile(label,person,zeit){
 if(!person&&!zeit)return "";
 const w=zeit?` <span class="mw-zeit">${esc(mwWann(zeit))}</span>`:"";
 return `<div class="mw-zeile"><span class="mw-label">${esc(label)}</span><span>${esc(person||"–")}${w}</span></div>`;
}

function mwMitarbeiterOptionen(gewaehlt){
 const liste=(Array.isArray(allProfiles)?allProfiles:[]).slice()
  .sort((a,b)=>String(profileName(a.id)).localeCompare(String(profileName(b.id)),"de"));
 return `<option value="">– niemand –</option>`+liste.map(p=>
  `<option value="${esc(p.id)}"${p.id===gewaehlt?" selected":""}>${esc(profileName(p.id))}</option>`).join("");
}

// v3.07: Firmenweiter Schalter. Reine Anzeige - die Datenbank prueft weiter.
function mwAktiv(){return (typeof workflowAktiv==="undefined")||workflowAktiv!==false}

// Was in einer Liste neben der Massaufnahme steht. "In Bearbeitung" ist dort
// keine Meldung wert - eine verfallene Freigabe schon: sie blockiert bereits
// eingeteilte Leute, waere aber sonst von einer frisch erfassten nicht zu
// unterscheiden (v3.06).
function mwBadgeFuerListe(m){
 if(!m||!mwAktiv())return "";
 if(m.freigabe_verfallen)return `<span class="mw-badge mw-rot">⚠️ Freigabe verfallen</span>`;
 if(m.workflow_status&&m.workflow_status!=="in_bearbeitung")return mwBadge(m.workflow_status);
 return "";
}

function renderMeasWorkflow(){
 const box=$("measWorkflowBereich"); if(!box)return;
 const w=mwStand;
 // Eine noch nicht gespeicherte Massaufnahme hat keinen Workflow. Ebenso eine
 // Firma, die den Ablauf abgeschaltet hat - der Stand bleibt dabei in der
 // Datenbank stehen und ist wieder da, sobald sie ihn einschaltet.
 if(!w||!w.id||!mwAktiv()){box.hidden=true;box.innerHTML="";return}
 box.hidden=false;
 const s=w.workflow_status;
 const teile=[];
 // Ueber hilfeKnopf(), nicht als fester Knopf: fehlt der Text, entsteht auch
 // kein Knopf - statt eines Knopfes, der ein leeres Fenster oeffnet
 // (CLAUDE.md 107.2).
 teile.push(`<h2 style="margin-top:4px">🔁 Arbeitsstatus ${typeof hilfeKnopf==="function"?hilfeKnopf("workflow"):""}</h2>`);
 teile.push(`<div class="mw-kopf">${mwBadge(s)}</div>`);

 // v3.06: Die Freigabe ist verfallen, weil die Massaufnahme danach fachlich
 // geaendert wurde. Das setzt ausschliesslich der Trigger in der Datenbank -
 // hier steht nur, was passiert ist und was jetzt zu tun ist.
 if(w.freigabe_verfallen){
  const wer=mwIstAufnehmer(w)?"Du musst sie":`${esc(mwPerson(w.created_by))} muss sie`;
  const bleibt=(w.ruester_id||w.monteur_id)
   ? " Rüster und Monteur bleiben zugewiesen und sind danach automatisch wieder dran."
   : "";
  teile.push(`<div class="mw-warnung">⚠️ Diese Massaufnahme wurde nach der Freigabe geändert. `
   +`Die Freigabe ist damit verfallen – ${wer} erneut freigeben.${bleibt}</div>`);
 }

 // Wer was gemacht hat - ausschliesslich echte, gespeicherte Angaben.
 const zeilen=[
  mwZeile("Aufgenommen von",mwPerson(w.created_by),w.created_at),
  mwZeile("Freigegeben von",w.freigegeben_von?mwPerson(w.freigegeben_von):"",w.freigegeben_am),
  mwZeile("Rüsten",w.ruester_id?mwPerson(w.ruester_id):"",w.ruester_zugewiesen_am),
  mwZeile("Gerüstet von",w.geruestet_von?mwPerson(w.geruestet_von):"",w.geruestet_am),
  mwZeile("Montage",w.monteur_id?mwPerson(w.monteur_id):"",w.monteur_zugewiesen_am),
  mwZeile("Montiert von",w.montiert_von?mwPerson(w.montiert_von):"",w.montiert_am)
 ].filter(Boolean).join("");
 teile.push(`<div class="mw-liste">${zeilen}</div>`);

 const aktionen=[];
 if(s==="in_bearbeitung"){
  if(mwIstAufnehmer(w)){
   aktionen.push(`<button type="button" class="green mw-voll" id="mwFreigeben">${w.freigabe_verfallen?"✓ Erneut freigeben":"✓ Massaufnahme freigeben"}</button>`);
  }else{
   teile.push(`<div class="info">Freigeben kann nur die Person, welche die Massaufnahme aufgenommen hat (${esc(mwPerson(w.created_by))}).</div>`);
  }
 }
 if(s!=="in_bearbeitung"&&s!=="abgeschlossen"&&mwDarfZuweisen(w)){
  aktionen.push(`<button type="button" class="blue mw-voll" id="mwZuweisenOeffnen">👥 Rüster und Monteur zuweisen</button>`);
 }
 if(s==="zu_ruesten"&&(mwIstRuester(w)||isAdmin())){
  aktionen.push(`<button type="button" class="green mw-voll" id="mwGeruestet">🔧 Gerüstet</button>`);
 }
 if(s==="zu_montieren"&&(mwIstMonteur(w)||isAdmin())){
  aktionen.push(`<button type="button" class="green mw-voll" id="mwMontiert">🏠 Montiert</button>`);
 }
 if(s==="montiert"&&(mwIstAufnehmer(w)||isAdmin())){
  aktionen.push(`<button type="button" class="blue mw-voll" id="mwAbschliessen">✓ Abschliessen</button>`);
 }
 if(isAdmin()&&s!=="in_bearbeitung"){
  aktionen.push(`<button type="button" class="gray mw-voll" id="mwKorrigieren">↩️ Status korrigieren</button>`);
 }
 // Ehrlich sagen, warum gerade nichts zu tun ist.
 if(!aktionen.length){
  if(s==="freigegeben")teile.push(`<div class="info">Freigegeben. Ein Rüster oder Monteur ist noch nicht zugewiesen.</div>`);
  else if(s==="zu_ruesten")teile.push(`<div class="info">Wartet auf ${esc(mwPerson(w.ruester_id))} (Rüsten).</div>`);
  else if(s==="geruestet")teile.push(`<div class="info">Gerüstet. Ein Monteur ist noch nicht zugewiesen.</div>`);
  else if(s==="zu_montieren")teile.push(`<div class="info">Wartet auf ${esc(mwPerson(w.monteur_id))} (Montage).</div>`);
 }
 teile.push(`<div class="mw-aktionen">${aktionen.join("")}</div>`);
 teile.push(`<div class="small mw-fehler" id="mwFehler" hidden></div>`);
 box.innerHTML=teile.join("");
}

function mwFehlerZeigen(text){
 const f=$("mwFehler"); if(!f){alert(text);return}
 f.textContent=text; f.hidden=false;
}

// Eine Stelle fuer jeden Aufruf: Verbindung pruefen, Fehlermeldung der
// Datenbank unveraendert durchreichen (sie ist bereits auf Deutsch).
async function mwRuf(name,args,wasOffline){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern(wasOffline||"Dieser Arbeitsschritt"))return null;
 const {data,error}=await sb.rpc(name,args||{});
 if(error){
  console.error(name,error);
  mwFehlerZeigen(error.message||"Der Schritt konnte nicht ausgeführt werden.");
  return null;
 }
 return data;
}

async function mwFreigeben(){
 if(!mwStand)return;
 const frage=mwStand.freigabe_verfallen
  ? "Massaufnahme erneut freigeben?\n\nSie wurde nach der letzten Freigabe geändert. Mit der erneuten Freigabe bestätigst du, dass der jetzige Stand vollständig aufgenommen und kontrolliert ist."
  : "Massaufnahme freigeben?\n\nMit der Freigabe bestätigst du, dass die Massaufnahme vollständig aufgenommen und kontrolliert wurde.";
 if(!confirm(frage))return;
 const a=await mwRuf("measurement_freigeben",{p_id:mwStand.id},"Die Freigabe");
 if(!a)return;
 mwStandAusAntwort(a); renderMeasWorkflow(); mwNachAenderung();
}

async function mwGeruestet(){
 if(!mwStand)return;
 if(!confirm("Rüsten bestätigen?\n\nDamit bestätigst du, dass das Material für diese Massaufnahme gerüstet ist."))return;
 const a=await mwRuf("measurement_geruestet",{p_id:mwStand.id},"Die Bestätigung");
 if(!a)return;
 mwStandAusAntwort(a); renderMeasWorkflow(); mwNachAenderung();
}

async function mwMontiert(){
 if(!mwStand)return;
 if(!confirm("Montage bestätigen?\n\nDamit bestätigst du, dass die Arbeit montiert ist."))return;
 const a=await mwRuf("measurement_montiert",{p_id:mwStand.id},"Die Bestätigung");
 if(!a)return;
 mwStandAusAntwort(a); renderMeasWorkflow(); mwNachAenderung();
}

async function mwAbschliessen(){
 if(!mwStand)return;
 if(!confirm("Diese Massaufnahme abschliessen?"))return;
 const a=await mwRuf("measurement_abschliessen",{p_id:mwStand.id},"Das Abschliessen");
 if(!a)return;
 mwStandAusAntwort(a); renderMeasWorkflow(); mwNachAenderung();
}

function mwZuweisenOeffnen(){
 if(!mwStand)return;
 $("mwZuweisenRuester").innerHTML=mwMitarbeiterOptionen(mwStand.ruester_id);
 $("mwZuweisenMonteur").innerHTML=mwMitarbeiterOptionen(mwStand.monteur_id);
 $("mwZuweisenFehler").hidden=true;
 $("mwZuweisenTitel").textContent=mwStand.title||"Massaufnahme";
 $("mwZuweisenModal").hidden=false;
}

async function mwZuweisenSpeichern(){
 if(!mwStand)return;
 const r=$("mwZuweisenRuester").value||null;
 const m=$("mwZuweisenMonteur").value||null;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Zuweisung"))return;
 const {data,error}=await sb.rpc("measurement_zuweisen",{p_id:mwStand.id,p_ruester:r,p_monteur:m});
 if(error){
  console.error("measurement_zuweisen",error);
  const f=$("mwZuweisenFehler"); f.textContent=error.message||"Die Zuweisung konnte nicht gespeichert werden."; f.hidden=false;
  return;
 }
 mwStandAusAntwort(data);
 $("mwZuweisenModal").hidden=true;
 renderMeasWorkflow(); mwNachAenderung();
}

async function mwKorrigieren(){
 if(!mwStand)return;
 const liste=MW_REIHENFOLGE.map((k,i)=>`${i+1} = ${MW_STATUS[k].text}`).join("\n");
 const eingabe=prompt("Arbeitsstatus korrigieren (nur Administrator).\n\n"+liste+"\n\nNummer eingeben:");
 if(!eingabe)return;
 const nr=Number(String(eingabe).trim());
 if(!Number.isFinite(nr)||nr<1||nr>MW_REIHENFOLGE.length){mwFehlerZeigen("Bitte eine Nummer von 1 bis "+MW_REIHENFOLGE.length+" eingeben.");return}
 const a=await mwRuf("measurement_workflow_korrigieren",{p_id:mwStand.id,p_status:MW_REIHENFOLGE[nr-1]},"Die Korrektur");
 if(!a)return;
 mwStandAusAntwort(a); renderMeasWorkflow(); mwNachAenderung();
}

// Nach jedem Schritt: die Aufgabenzentrale und die geladenen Listen ziehen
// nach, damit die naechste offene Aufgabe sofort erscheint.
function mwNachAenderung(){
 if(typeof allMeasurements!=="undefined"&&Array.isArray(allMeasurements)&&mwStand){
  const z=allMeasurements.find(x=>x.id===mwStand.id);
  if(z)Object.assign(z,{workflow_status:mwStand.workflow_status,freigabe_verfallen:mwStand.freigabe_verfallen,ruester_id:mwStand.ruester_id,
    monteur_id:mwStand.monteur_id,freigegeben_von:mwStand.freigegeben_von,freigegeben_am:mwStand.freigegeben_am,
    geruestet_von:mwStand.geruestet_von,geruestet_am:mwStand.geruestet_am,
    montiert_von:mwStand.montiert_von,montiert_am:mwStand.montiert_am});
 }
 if(typeof aufgabenNeuLaden==="function")aufgabenNeuLaden();
 // v3.09: eine Freigabe erzeugt serverseitig eine neue Fassung - dieselbe
 // Logik, nur eine weitere Sicht darauf.
 if(typeof verNeuLaden==="function")verNeuLaden();
 if(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache)&&mwStand){
  const z=projectMeasurementsCache.find(x=>x.id===mwStand.id);
  if(z){z.workflow_status=mwStand.workflow_status;z.freigabe_verfallen=mwStand.freigabe_verfallen}
 }
}

// v3.06: Beim Speichern kann der Trigger die Freigabe haben verfallen lassen.
// Der Client erfaehrt das nur ueber die zurueckgelesene Zeile - deshalb liest
// js/16 sie beim Speichern mit und reicht sie hier herein.
function mwNachSpeichern(zeile){
 if(!zeile||!zeile.id)return;
 const warFreigegeben=!!(mwStand&&mwStand.id===zeile.id
   &&mwStand.workflow_status&&mwStand.workflow_status!=="in_bearbeitung");
 if(mwStand&&mwStand.id===zeile.id){
  mwStand.workflow_status=zeile.workflow_status||mwStand.workflow_status;
  mwStand.freigabe_verfallen=!!zeile.freigabe_verfallen;
  if(mwStand.freigabe_verfallen){
   mwStand.freigegeben_von=null; mwStand.freigegeben_am=null;
   mwStand.geruestet_von=null;   mwStand.geruestet_am=null;
   mwStand.montiert_von=null;    mwStand.montiert_am=null;
  }
  mwNachAenderung();
 }
 // Nur melden, wenn die Freigabe durch genau dieses Speichern verfallen ist.
 if(zeile.freigabe_verfallen&&warFreigegeben){
  alert("Die Freigabe ist verfallen.\n\nDie Massaufnahme wurde nach der Freigabe fachlich geändert und muss erneut freigegeben werden. Rüster und Monteur bleiben zugewiesen.");
 }
}

document.addEventListener("click",e=>{
 const t=e.target;
 if(!t||!t.id)return;
 if(t.id==="mwFreigeben")mwFreigeben();
 else if(t.id==="mwGeruestet")mwGeruestet();
 else if(t.id==="mwMontiert")mwMontiert();
 else if(t.id==="mwAbschliessen")mwAbschliessen();
 else if(t.id==="mwZuweisenOeffnen")mwZuweisenOeffnen();
 else if(t.id==="mwKorrigieren")mwKorrigieren();
});

$("mwZuweisenSpeichern").onclick=mwZuweisenSpeichern;
$("mwZuweisenAbbrechen").onclick=()=>{$("mwZuweisenModal").hidden=true};
