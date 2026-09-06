// ---------------------------------------------------------------------------
// v3.09  Vorlagen und Serienaufnahmen
// ---------------------------------------------------------------------------
// Auftrag Abschnitt 11 und 12.
//
// Eine Vorlage ist ein gespeicherter Satz Fachwerte einer Massaufnahme-Art -
// nichts weiter. Sie enthaelt bewusst KEINE projektbezogenen Daten:
//   * kein Projekt, keine Adresse, keine Auftragsnummer
//   * keine Bezeichnung des Objekts, keine Notiz der Aufnahme
//   * kein Datum, keine Fotos, keine Skizzen
//   * keinen Arbeitsstatus, keine Zuweisung, keine Freigabe
// Gespeichert wird ausschliesslich `type` und `data` - genau das, was die
// Fachmodule rechnen. Ein Feld, das die Vorlage nicht kennt, bleibt in der
// neuen Massaufnahme leer, statt still einen Wert der letzten Baustelle
// mitzuschleppen.
//
// Angewendet wird ueber measurementAlsVorlage() aus js/10 (v3.04). Es gibt
// deshalb genau EINEN Kopierweg - kein zweiter, der auseinanderlaufen kann.
// Die entstehende Massaufnahme ist vollstaendig eigenstaendig: es gibt keine
// Verknuepfung zurueck zur Vorlage, eine spaetere Aenderung an der Vorlage
// wirkt nicht auf bereits erfasste Massaufnahmen (Abschnitt 11).
//
// Eine Serie ist nichts anderes als N solcher Anwendungen: N eigenstaendige
// Zeilen in `measurements`, jede einzeln bearbeitbar, freigebbar,
// zuschneidbar, ruestbar und montierbar (Abschnitt 12). Es gibt bewusst
// KEINE Serien-Entitaet, die sie zusammenhaelt - sie waere eine zweite
// Klammer neben dem Projekt und wuerde genau die Unabhaengigkeit aufweichen,
// die der Auftrag verlangt. Der Seriename steht in der Bezeichnung jeder
// Aufnahme, damit sie in Listen und Suche zusammen auffindbar bleiben.
//
// Alles hier ist an pmAktiv("vorlagen") bzw. pmAktiv("serien") gebunden.
// Ist das Modul aus, gibt es keinen Knopf und keine Karte.
// ---------------------------------------------------------------------------

let vorlagenCache=[];
let vorlagenFehler=null;
let vorlagenLauf=0;
// Merkt sich, wofuer der Auswahldialog geoeffnet wurde: "einzeln" oder "serie".
let vorlagenZweck="einzeln";
// Projekt, in das eine Serie geschrieben wird. Wird beim Oeffnen gesetzt.
let serieProjektId=null;

function vorlagenAktiv(){ return typeof pmAktiv==="function"&&pmAktiv("vorlagen") }
function serienAktiv(){ return typeof pmAktiv==="function"&&pmAktiv("serien") }

function vorlagenTypName(t){
 return (typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[t])||t||"–";
}

// ---- Laden ----------------------------------------------------------------
// Kein company_id-Filter im Client: die Firmengrenze erzwingt allein die
// restriktive tenant_boundary_measurement_vorlagen-Policy.
async function vorlagenLaden(){
 vorlagenFehler=null;
 if(!vorlagenAktiv()){vorlagenCache=[];return}
 const lauf=++vorlagenLauf;
 const {data,error}=await sb.from("measurement_vorlagen")
  .select("id,name,type,data,notiz,created_by,created_at,updated_by,updated_at")
  .order("name",{ascending:true});
 if(lauf!==vorlagenLauf)return;
 if(error){vorlagenFehler=error.message;vorlagenCache=[];return}
 vorlagenCache=data||[];
}

// ---- Bibliothek in den Einstellungen --------------------------------------
function renderVorlagenListe(){
 const box=$("vorlagenListe");
 const karte=$("vorlagenKarte");
 if(karte)karte.hidden=!vorlagenAktiv();
 if(!box||!vorlagenAktiv())return;
 if(vorlagenFehler){
  box.innerHTML=`<div class="small" style="color:var(--red)">Vorlagen konnten nicht geladen werden: ${esc(vorlagenFehler)}</div>`;
  return;
 }
 if(!vorlagenCache.length){
  box.innerHTML=`<div class="small" style="color:var(--muted)">Noch keine Vorlage gespeichert. In einer geöffneten Massaufnahme steht dafür der Knopf „📄 Als Vorlage speichern“.</div>`;
  return;
 }
 box.innerHTML=vorlagenCache.map(v=>{
  const wer=(typeof profileName==="function"&&v.created_by)?profileName(v.created_by):"";
  const wann=v.created_at?new Date(v.created_at).toLocaleDateString("de-CH"):"";
  const zusatz=[vorlagenTypName(v.type),wer,wann].filter(Boolean).join(" · ");
  return `<div class="vorlage-zeile">
   <div class="vorlage-info">
    <b>${esc(v.name)}</b>
    <div class="small" style="color:var(--muted)">${esc(zusatz)}</div>
    ${v.notiz?`<div class="small">${esc(v.notiz)}</div>`:""}
   </div>
   <div class="vorlage-akt">
    <button type="button" class="gray" data-vorlage-umbenennen="${v.id}">✏️ Umbenennen</button>
    <button type="button" class="gray" data-vorlage-loeschen="${v.id}">🗑 Löschen</button>
   </div>
  </div>`;
 }).join("");
}

async function vorlagenNeuLaden(){
 await vorlagenLaden();
 renderVorlagenListe();
}

function vorlagenHinweis(text,fehler){
 const el=$("vorlagenHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

// ---- Speichern, Umbenennen, Loeschen --------------------------------------
// Jeder Schreibweg prueft die Zahl der betroffenen Zeilen: ein von RLS
// abgewiesenes UPDATE/DELETE meldet in PostgREST keinen Fehler, es betrifft
// still 0 Zeilen (CLAUDE.md 24.1). Ohne diese Pruefung wuerde die App einen
// Erfolg vortaeuschen.
async function vorlageSpeichern(name,notiz,typ,daten,ueberschreibenId){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Vorlage"))return {offline:true};
 const satz={name:name,type:typ,data:daten,notiz:notiz||null};
 if(ueberschreibenId){
  const {data,error}=await sb.from("measurement_vorlagen")
   .update(satz).eq("id",ueberschreibenId).select();
  if(error)return {fehler:error.message};
  if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
  return {fehler:null,zeile:data[0]};
 }
 // company_id wird bewusst NICHT mitgeschickt - sie kommt serverseitig aus
 // dem Vorgabewert my_company_id(), und die restriktive Policy erzwingt
 // dieselbe Zuordnung noch einmal.
 const {data,error}=await sb.from("measurement_vorlagen").insert(satz).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 return {fehler:null,zeile:data[0]};
}

async function vorlageUmbenennen(id){
 const v=vorlagenCache.find(x=>String(x.id)===String(id));
 if(!v)return;
 const neu=prompt("Neuer Name der Vorlage:",v.name);
 if(neu===null)return;
 const name=String(neu).trim();
 if(!name){vorlagenHinweis("Der Name darf nicht leer sein.",true);return}
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Vorlage"))return;
 const {data,error}=await sb.from("measurement_vorlagen").update({name}).eq("id",id).select();
 if(error){vorlagenHinweis("Konnte nicht gespeichert werden: "+error.message,true);return}
 if(!data||!data.length){vorlagenHinweis("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?",true);return}
 await vorlagenNeuLaden();
 vorlagenHinweis("✓ Umbenannt in „"+name+"“.");
}

async function vorlageLoeschen(id){
 const v=vorlagenCache.find(x=>String(x.id)===String(id));
 if(!v)return;
 if(!confirm("Vorlage „"+v.name+"“ wirklich löschen?\n\nBereits erfasste Massaufnahmen bleiben unverändert – sie sind eigenständig und hängen nicht an der Vorlage."))return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Vorlage"))return;
 const {data,error}=await sb.from("measurement_vorlagen").delete().eq("id",id).select();
 if(error){vorlagenHinweis("Konnte nicht gelöscht werden: "+error.message,true);return}
 if(!data||!data.length){vorlagenHinweis("Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?",true);return}
 await vorlagenNeuLaden();
 vorlagenHinweis("✓ Vorlage gelöscht.");
}

if($("vorlagenListe")){
 $("vorlagenListe").addEventListener("click",e=>{
  const u=e.target.closest("[data-vorlage-umbenennen]");
  if(u){vorlageUmbenennen(u.dataset.vorlageUmbenennen);return}
  const l=e.target.closest("[data-vorlage-loeschen]");
  if(l){vorlageLoeschen(l.dataset.vorlageLoeschen);return}
 });
}

// ---- Aus einer offenen Massaufnahme eine Vorlage machen --------------------
// Genommen wird ausschliesslich type und data aus dem BEREITS gebauten
// Speicher-Payload - dieselbe Quelle, aus der auch gespeichert wird. Damit
// enthaelt die Vorlage genau die Fachwerte und nichts sonst.
function vorlageKnopfAktualisieren(){
 const b=$("measAlsVorlage");
 if(b)b.hidden=!vorlagenAktiv();
 const c=$("chooseFromVorlage");
 if(c)c.hidden=!vorlagenAktiv();
 const s=$("cockpitSerie");
 if(s)s.hidden=!serienAktiv();
}

function vorlageDialogOeffnen(){
 if(!vorlagenAktiv())return;
 if(typeof buildMeasurementFromForm!=="function")return;
 const m=buildMeasurementFromForm();
 if(!m||!m.type)return;
 $("vorlageName").value=($("measTitle")&&$("measTitle").value.trim())||"";
 $("vorlageNotiz").value="";
 $("vorlageTypName").textContent=vorlagenTypName(m.type);
 $("vorlageSpeichernHinweis").hidden=true;
 $("vorlageSpeichernModal").hidden=false;
 $("vorlageName").focus();
}

async function vorlageAusFormularSpeichern(){
 if(typeof buildMeasurementFromForm!=="function")return;
 const m=buildMeasurementFromForm();
 const name=$("vorlageName").value.trim();
 const el=$("vorlageSpeichernHinweis");
 const melde=(t,f)=>{el.textContent=t;el.style.color=f?"var(--red)":"var(--green)";el.hidden=false};
 if(!name){melde("Bitte einen Namen für die Vorlage eingeben.",true);return}
 // Gleicher Name und gleiche Art: nachfragen statt eine zweite Vorlage
 // desselben Namens anzulegen.
 const vorhanden=vorlagenCache.find(v=>v.type===m.type&&v.name.toLowerCase()===name.toLowerCase());
 let ueberschreiben=null;
 if(vorhanden){
  if(!confirm("Es gibt bereits eine Vorlage „"+vorhanden.name+"“ für diese Art.\n\nSoll sie überschrieben werden?\n\nBereits erfasste Massaufnahmen bleiben unverändert."))return;
  ueberschreiben=vorhanden.id;
 }
 const r=await vorlageSpeichern(name,$("vorlageNotiz").value.trim(),m.type,m.data||{},ueberschreiben);
 if(r.offline)return;
 if(r.fehler){melde("Konnte nicht gespeichert werden: "+r.fehler,true);return}
 await vorlagenNeuLaden();
 $("vorlageSpeichernModal").hidden=true;
 alert("✓ Vorlage „"+name+"“ gespeichert.\n\nSie enthält nur die Masse dieser Art – kein Projekt, keine Bezeichnung, keine Fotos.");
}

// ---- Vorlage auswaehlen und anwenden --------------------------------------
async function vorlageWahlOeffnen(zweck,projektId){
 if(!vorlagenAktiv())return;
 vorlagenZweck=zweck==="serie"?"serie":"einzeln";
 serieProjektId=(projektId===undefined?null:projektId);
 $("vorlageWahlTitel").textContent=vorlagenZweck==="serie"
  ? "📄 Serie aus Vorlage" : "📄 Massaufnahme aus Vorlage";
 $("vorlageWahlBody").innerHTML=`<div class="small" style="color:var(--muted)">Vorlagen werden geladen …</div>`;
 $("vorlageWahlModal").hidden=false;
 await vorlagenLaden();
 renderVorlagenWahl();
}

function renderVorlagenWahl(){
 const box=$("vorlageWahlBody");
 if(!box)return;
 if(vorlagenFehler){
  box.innerHTML=`<div class="small" style="color:var(--red)">Vorlagen konnten nicht geladen werden: ${esc(vorlagenFehler)}</div>`;
  return;
 }
 if(!vorlagenCache.length){
  box.innerHTML=`<div class="small" style="color:var(--muted)">Es ist noch keine Vorlage gespeichert. Eine Vorlage entsteht in einer geöffneten Massaufnahme über „📄 Als Vorlage speichern“.</div>`;
  return;
 }
 box.innerHTML=vorlagenCache.map(v=>`<div class="vorlage-zeile">
  <div class="vorlage-info">
   <b>${esc(v.name)}</b>
   <div class="small" style="color:var(--muted)">${esc(vorlagenTypName(v.type))}</div>
   ${v.notiz?`<div class="small">${esc(v.notiz)}</div>`:""}
  </div>
  <div class="vorlage-akt">
   <button type="button" class="blue" data-vorlage-nehmen="${v.id}">${vorlagenZweck==="serie"?"📄 Serie daraus":"✓ Verwenden"}</button>
  </div>
 </div>`).join("");
}

// Wendet eine Vorlage auf eine NEUE Massaufnahme an. Der Kopierweg ist
// unveraendert measurementAlsVorlage() aus js/10 - hier wird nichts zweites
// gebaut. Die Bezeichnung bleibt bewusst leer: sie gehoert zum einzelnen
// Objekt, nicht zur Vorlage.
function vorlageAnwenden(v,projektId){
 if(!v||typeof measurementAlsVorlage!=="function")return false;
 measurementAlsVorlage({type:v.type,title:"",data:v.data||{}},projektId);
 return $("measType").value===v.type;
}

if($("vorlageWahlBody")){
 $("vorlageWahlBody").addEventListener("click",async e=>{
  const b=e.target.closest("[data-vorlage-nehmen]");
  if(!b)return;
  const v=vorlagenCache.find(x=>String(x.id)===String(b.dataset.vorlageNehmen));
  if(!v)return;
  if(vorlagenZweck==="serie"){ serieDialogOeffnen(v); return }
  $("vorlageWahlModal").hidden=true;
  $("measTypeChooserModal").hidden=true;
  const projekt=(typeof cockpitTypWahl!=="undefined"&&cockpitTypWahl==="meas"&&typeof cockpitProjectId!=="undefined")
    ? cockpitProjectId : undefined;
  if(!vorlageAnwenden(v,projekt))return;
  // Wie beim normalen Weg aus dem Cockpit: Rueckziel und Titel nachziehen.
  if(projekt!==undefined&&projekt!==null){
   cockpitTypWahl=null;
   measEditReturnTo="projectCockpit";
   if(typeof updateMeasFormTitle==="function")updateMeasFormTitle();
  }
 });
}

// ---- Serie ----------------------------------------------------------------
let serieVorlage=null;

function serieDialogOeffnen(v){
 if(!serienAktiv())return;
 serieVorlage=v||null;
 $("vorlageWahlModal").hidden=true;
 $("serieVorlageName").textContent=v?v.name:"–";
 $("serieTypName").textContent=v?vorlagenTypName(v.type):"–";
 $("serieAnzahl").value="3";
 $("serieBezeichnung").value=v?v.name:"";
 $("serieStart").value="1";
 $("serieHinweis").hidden=true;
 serieVorschau();
 $("serieModal").hidden=false;
}

// Die Bezeichnungen entstehen aus Praefix und laufender Nummer. Sie werden
// vorher angezeigt - niemand soll erst nach dem Anlegen sehen, wie die
// zwanzig Aufnahmen heissen.
function serieNamen(){
 const anzahl=Math.max(1,Math.min(50,Math.round(Number($("serieAnzahl").value)||0)));
 const praefix=$("serieBezeichnung").value.trim();
 const start=Math.round(Number($("serieStart").value)||1);
 const raus=[];
 for(let i=0;i<anzahl;i++){
  const nr=start+i;
  raus.push(praefix?praefix+" "+nr:String(nr));
 }
 return raus;
}

function serieVorschau(){
 const namen=serieNamen();
 const el=$("serieVorschau");
 if(!el)return;
 const zeige=namen.slice(0,4).map(n=>"„"+n+"“").join(", ");
 el.textContent="Es entstehen "+namen.length+" eigenständige Massaufnahmen: "
  +zeige+(namen.length>4?", … , „"+namen[namen.length-1]+"“":"")+".";
}
["serieAnzahl","serieBezeichnung","serieStart"].forEach(id=>{
 if($(id))$(id).addEventListener("input",serieVorschau);
});

async function serieAnlegen(){
 const el=$("serieHinweis");
 const melde=(t,f)=>{el.textContent=t;el.style.color=f?"var(--red)":"var(--green)";el.hidden=false};
 if(!serienAktiv())return;
 if(!serieVorlage){melde("Keine Vorlage gewählt.",true);return}
 if(!serieProjektId){melde("Für eine Serie muss ein Projekt geöffnet sein.",true);return}
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Serie"))return;
 const namen=serieNamen();
 const heute=new Date().toISOString().slice(0,10);
 // Jede Zeile ist ein eigenstaendiger Datensatz. Es gibt keine gemeinsame
 // Kennung und keinen Verweis auf die Vorlage - genau das verlangt
 // Abschnitt 12. Der Arbeitsstatus wird bewusst NICHT mitgeschickt: der
 // Trigger aus v3.05 setzt ihn beim Anlegen ohnehin auf "in_bearbeitung",
 // eine Serie kann den Ablauf also nicht ueberspringen.
 const zeilen=namen.map(n=>({
  title:n, note:null, date:heute, type:serieVorlage.type,
  project_id:serieProjektId,
  data:JSON.parse(JSON.stringify(serieVorlage.data||{})),
  photo_path:null, sketch_path:null, photo_paths:[], sketch_paths:[]
 }));
 melde("Wird angelegt …",false);
 const {data,error}=await sb.from("measurements").insert(zeilen).select("id");
 if(error){melde("Konnte nicht angelegt werden: "+error.message,true);return}
 if(!data||!data.length){melde("Es wurde nichts angelegt. Fehlt die nötige Berechtigung?",true);return}
 if(data.length!==zeilen.length){
  melde("Es wurden nur "+data.length+" von "+zeilen.length+" Massaufnahmen angelegt.",true);
 }
 $("serieModal").hidden=true;
 // Zurueck ins Cockpit und den Massaufnahme-Bereich neu laden, damit die
 // neuen Zeilen sofort dastehen.
 if(typeof zurueckInsCockpit==="function")await zurueckInsCockpit("meas");
 else if(typeof cockpitBereichAktualisieren==="function")await cockpitBereichAktualisieren("meas");
 alert("✓ "+data.length+" Massaufnahmen angelegt.\n\nJede ist eigenständig: sie lässt sich einzeln bearbeiten, freigeben, zuschneiden, rüsten und montieren. Eine Änderung an einer wirkt nicht auf die anderen.");
}

// ---- Verdrahtung ----------------------------------------------------------
if($("measAlsVorlage"))$("measAlsVorlage").onclick=vorlageDialogOeffnen;
if($("cancelVorlageSpeichern"))$("cancelVorlageSpeichern").onclick=()=>{$("vorlageSpeichernModal").hidden=true};
if($("saveVorlage"))$("saveVorlage").onclick=vorlageAusFormularSpeichern;
if($("closeVorlageWahl"))$("closeVorlageWahl").onclick=()=>{$("vorlageWahlModal").hidden=true};
if($("cancelSerie"))$("cancelSerie").onclick=()=>{$("serieModal").hidden=true};
if($("serieAnlegenBtn"))$("serieAnlegenBtn").onclick=serieAnlegen;
if($("chooseFromVorlage"))$("chooseFromVorlage").onclick=()=>{
 // Die Typ-Auswahl bleibt offen: wird die Vorlagenwahl abgebrochen, steht
 // der Benutzer wieder vor den Arten statt vor einer leeren Seite.
 vorlageWahlOeffnen("einzeln");
};
