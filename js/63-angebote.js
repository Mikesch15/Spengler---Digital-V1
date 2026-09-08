"use strict";
// ---- Offerte als eigenstaendiger Projektbestandteil (v3.34) -----
//
// Ziel-Prozesskette (Auftrag vom 08.09.2026):
//   PROJEKT -> OFFERTE -> MASSAUFNAHME -> BERECHNUNG -> MATERIAL & ZUSCHNITT
//   -> ZUSCHNITT -> STUECK ABHAKEN -> WERKSTATT/RUESTLISTE
//   -> RUESTEN/MONTIEREN -> AUSMASS
//
// Dieser Auftrag endet bewusst bei PROJEKT -> EIGENE OFFERTE. Ausmass wird
// NICHT angefasst (js/17-ausmass.js ist unveraendert) - es bleibt ein
// spaeterer Schritt ganz am Ende der bestehenden Kette.
//
// Fachlich strikt getrennt (Auftrag):
//   Offerte      = was dem Kunden angeboten wurde.
//   Massaufnahme = was aufgenommen/ermittelt wurde.
//   Produktion   = was daraus hergestellt wird.
//   Ausmass      = was am Ende tatsaechlich ausgefuehrt/verrechnet wird.
// Eine spaetere "Offerte -> Ausmass"-Uebernahme bleibt architektonisch
// moeglich (die Offerte ist eine eigene Zeile mit eigenen Positionen),
// wird in dieser Version aber NICHT gebaut.
//
// Wiederverwendet, nichts doppelt gebaut:
// - Fotoerkennung: recognizePhoto() bleibt unveraendert in js/17-ausmass.js
//   (ruft die bestehende Edge Function extract-offer-positions auf) und
//   wird hier unveraendert aufgerufen.
// - Foto-Upload: uploadMeasurementImage() (js/10-massaufnahme.js), Ordner
//   "angebote-photo" - storage_object_insert_allowed()/
//   storage_object_is_own_company() kennen diesen Ordner bereits.
// - Projektsuche/-vorschlag: searchProjects()/projektVorschlagHtml()/
//   positionSuggest() (js/01,09,06) unveraendert.
// - Vorschaubilder: resolveSignedThumbnails() (js/10), signierte URLs wie
//   ueberall sonst, keine oeffentliche URL.
// - Cockpit-Einbindung: COCKPIT_BEREICHE (js/24-projekt-cockpit.js) wird
//   um den Schluessel "angebote" ERGAENZT (reine Objekt-Mutation, kein
//   einziger Eingriff in js/24 noetig) - damit gelten Anzeige, Klapp-
//   Mechanik, Bereichs-Aktualisierung und Tastaturbedienung automatisch.
//
// Berechtigung (Auftrag: "zunaechst ausschliesslich fuer mich"):
// Kein clientseitiges "if user==...". Die vier PERMISSIVEN Policies auf
// angebote (select/insert/update/delete_permission) sind das normale
// has_permission()-Muster jeder anderen Fachtabelle - has_permission()
// gewaehrt Admins darin wie ueberall automatisch Zugriff, das ist HIER
// NICHT anders. Was die Freischaltung erzwingt, ist eine ZWEITE,
// unabhaengige Ebene: zwei RESTRIKTIVE Policies, UND-verknuepft mit den
// permissiven:
//   tenant_boundary_angebote     (company_id = my_company_id())
//   feature_boundary_angebote    (EXISTS ... feature_access ... granted)
// feature_boundary_angebote sperrt JEDEN ohne eigene feature_access-Zeile,
// auch einen Administrator - der Admin-Bypass in has_permission() wird
// also nicht umgangen, sondern durch dieses zweite, unabhaengige Schloss
// zusaetzlich ueberstimmt. ACHTUNG (echte Luecke, siehe CLAUDE.md 139.3):
// permission_settings hat KEINE Zeile fuer resource='angebote' - fuer
// role='employee' liefert has_permission() deshalb false, selbst mit
// granted=true in feature_access. Der Schalter funktioniert damit heute
// nur zuverlaessig fuer role='admin' (wie den einzigen Empfaenger Mike
// Ledermann). Freigeschaltet wird ausschliesslich ueber eine echte Zeile
// in feature_access - siehe js/05a-rechte.js. UI-seitig steuert
// offerteZugriff nur die Sichtbarkeit; ohne Freigabe entsteht gar kein
// funktionsloser Knopf (Auftrag).

let offerteZugriff=false;
let angSelectedProjectId=null;
let angPhotos=[]; // "data:..." (neu) oder Speicherpfad (bereits gespeichert)
let angPositions=[];
let currentAngebotId=null;
let currentAngebotMeta={};
let angEditReturnTo="cockpitAngebote";
let projectAngeboteCache=[];

// Wird aus afterLogin() (js/03-login.js) aufgerufen, wie checkSystemAdmin().
// Fragt die Zugriffs-Tabelle direkt ab (keine RPC noetig - die Zeile
// gehoert bereits dem angemeldeten Benutzer selbst, feature_access_select
// erlaubt profile_id = auth.uid()).
async function checkOfferteZugriff(){
 offerteZugriff=false;
 if(currentProfile){
  try{
   const {data,error}=await sb.from("feature_access").select("granted")
    .eq("profile_id",currentProfile.id).eq("feature","angebote").maybeSingle();
   offerteZugriff=!error&&!!data&&!!data.granted;
  }catch(e){offerteZugriff=false;}
 }
 if($("cockpitAngeboteCard"))$("cockpitAngeboteCard").hidden=!offerteZugriff;
 if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=!offerteZugriff;
}

// ---- Einbindung ins Cockpit (js/24-projekt-cockpit.js) -----------
// Reine Objekt-Mutation - COCKPIT_BEREICHE ist mit const deklariert, das
// sperrt nur die Bindung, nicht den Objektinhalt. Dadurch uebernimmt
// js/24 automatisch: Body leeren bei Projektwechsel, Anzahl/Marke/Stand
// setzen, Klapp-Karte, "Alles auf/zuklappen", Tastatur, Sprung aus dem
// Arbeitsstand (data-cockpit-goto="angebote").
if(typeof COCKPIT_BEREICHE==="object"&&COCKPIT_BEREICHE){
 COCKPIT_BEREICHE.angebote={
  count:"cockpitAngeboteCount",body:"cockpitAngeboteBody",card:"cockpitAngeboteCard",
  mark:"cockpitAngeboteMark",stand:"cockpitAngeboteStand",leer:"Noch keine",
  load:id=>loadProjectAngebote(id)
 };
}

// Gegatet VOR jeder Abfrage: ein nicht freigeschalteter Benutzer loest gar
// keine Netzwerkanfrage aus, nicht nur eine leere Anzeige (dasselbe
// Vorgehen wie cockpitMatZuStand()/pmSichtbarkeitAuffrischen() bei
// abgeschalteten Projektmodulen, js/56/js/47).
async function loadProjectAngebote(projectId){
 const box=$("cockpitAngeboteBody");
 if(!offerteZugriff){
  if(box)box.innerHTML="";
  projectAngeboteCache=[];
  return 0;
 }
 if(box)box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("angebote").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){
  if(box)box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  projectAngeboteCache=[];
  return undefined;
 }
 const list=data||[];
 projectAngeboteCache=list;
 if(box)box.innerHTML=list.length?list.map(a=>{
  const zusatz=a.date?datumCH(a.date):"";
  return `<div class="report-row">
<div class="report-row-info"><b>${esc(a.title||"Ohne Bezeichnung")}</b>${zusatz?`<span>${esc(zusatz)}</span>`:""}</div>
<div class="report-row-actions">
<button class="blue" data-open-project-angebot="${a.id}">Öffnen</button>
<button class="red" data-del-project-angebot="${a.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Offerte zu diesem Projekt.</div>';
 return list.length;
}

// ---- Positionstabelle (identischer Aufbau wie amPositionsBody) ---
function renderAngPositionsTable(){
 if(!$("angPositionsBody"))return;
 $("angPositionsBody").innerHTML=angPositions.map((p,i)=>`<tr>
<td><input data-ang-pos="${i}" value="${esc(p.pos||"")}"></td>
<td><input data-ang-desc="${i}" value="${esc(p.description||"")}"></td>
<td><input data-ang-qty="${i}" type="number" step=".01" value="${p.quantity||0}"></td>
<td><input data-ang-unit="${i}" value="${esc(p.unit||"")}"></td>
<td><button type="button" class="red" data-ang-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="5" class="small">Noch keine Positionen. Foto aufnehmen und "Alle Fotos erkennen" klicken, oder manuell hinzufügen.</td></tr>';
 $("angPositionsSummary").textContent=angPositions.length?`${angPositions.length} Positionen`:"";
}
if($("angPositionsBody")){
 $("angPositionsBody").addEventListener("input",e=>{
  const i=Number(e.target.dataset.angPos??e.target.dataset.angDesc??e.target.dataset.angQty??e.target.dataset.angUnit);
  if(Number.isNaN(i)||!angPositions[i])return;
  if(e.target.dataset.angPos!==undefined)angPositions[i].pos=e.target.value;
  else if(e.target.dataset.angDesc!==undefined)angPositions[i].description=e.target.value;
  else if(e.target.dataset.angUnit!==undefined)angPositions[i].unit=e.target.value;
  else if(e.target.dataset.angQty!==undefined)angPositions[i].quantity=Number(e.target.value)||0;
 });
 $("angPositionsBody").addEventListener("click",e=>{
  const del=e.target.closest("[data-ang-del]");
  if(del){angPositions.splice(Number(del.dataset.angDel),1);renderAngPositionsTable();}
 });
}
if($("angAddPosition"))$("angAddPosition").onclick=()=>{
 angPositions.push({pos:"",description:"",quantity:0,unit:""});
 renderAngPositionsTable();
};

// ---- Fotos + Erkennung (recognizePhoto() unveraendert aus js/17) -
function renderAngPhotoGallery(){
 if(!$("angPhotoGallery"))return;
 $("angPhotoGallery").innerHTML=angPhotos.map((src,i)=>`<div class="sketch-thumb-wrap">
<img class="sketch-thumb" data-signed-src="${esc(src)}">
<div class="sketch-thumb-actions">
<button type="button" class="gray" data-recognize-ang-photo="${i}" title="Nur dieses Foto erkennen">🔎</button>
<button type="button" class="red" data-remove-ang-photo="${i}">✕</button>
</div>
</div>`).join("")||'<div class="small" style="color:var(--muted)">Noch kein Foto</div>';
 resolveSignedThumbnails($("angPhotoGallery"));
 if($("angRecognizeAll"))$("angRecognizeAll").hidden=angPhotos.length===0;
}
if($("angPhotoInput")){
 $("angPhotoInput").addEventListener("change",async e=>{
  const files=Array.from(e.target.files||[]);
  if(!files.length)return;
  for(const file of files){
   try{
    const pq=photoQualitySettings();const dataUrl=await resizeImageFile(file,pq.maxDim,pq.quality);
    angPhotos.push(dataUrl);
   }catch(err){alert("Foto konnte nicht geladen werden: "+err.message)}
  }
  $("angPhotoInput").value="";
  renderAngPhotoGallery();
 });
}
if($("angPhotoGallery")){
 $("angPhotoGallery").addEventListener("click",async e=>{
  const rm=e.target.closest("[data-remove-ang-photo]");
  if(rm){angPhotos.splice(Number(rm.dataset.removeAngPhoto),1);renderAngPhotoGallery();return}
  const rec=e.target.closest("[data-recognize-ang-photo]");
  if(rec){
   const i=Number(rec.dataset.recognizeAngPhoto);
   const src=angPhotos[i];
   if(!src)return;
   rec.disabled=true;
   $("angRecognizeStatus").textContent=`Erkenne Foto ${i+1} … das kann einige Sekunden dauern.`;
   try{
    const found=await recognizePhoto(src);
    angPositions=angPositions.concat(found);
    renderAngPositionsTable();
    $("angRecognizeStatus").textContent=`${found.length} Position(en) aus Foto ${i+1} erkannt. Bitte prüfen.`;
   }catch(err){
    $("angRecognizeStatus").textContent="";
    alert("Fehler bei der Erkennung: "+(err.message||err));
   }
   rec.disabled=false;
  }
 });
}
if($("angRecognizeAll")){
 $("angRecognizeAll").onclick=async()=>{
  if(!angPhotos.length){alert("Bitte zuerst mindestens ein Foto hinzufügen.");return}
  $("angRecognizeAll").disabled=true;
  let totalFound=0;
  for(let i=0;i<angPhotos.length;i++){
   $("angRecognizeStatus").textContent=`Erkenne Foto ${i+1} von ${angPhotos.length} … das kann einige Sekunden dauern.`;
   try{
    const found=await recognizePhoto(angPhotos[i]);
    angPositions=angPositions.concat(found);
    renderAngPositionsTable();
    totalFound+=found.length;
   }catch(err){
    alert(`Fehler bei Foto ${i+1}: `+(err.message||err));
   }
  }
  $("angRecognizeStatus").textContent=`${totalFound} Position(en) aus ${angPhotos.length} Foto(s) erkannt. Bitte auf Richtigkeit prüfen und bei Bedarf korrigieren, bevor du speicherst.`;
  $("angRecognizeAll").disabled=false;
 };
}

// ---- Projektauswahl (gleiche Bausteine wie bei Massaufnahme/Ausmass) --
function setAngProjectField(projId){
 angSelectedProjectId=projId||null;
 const proj=allProjects.find(x=>x.id===angSelectedProjectId);
 if($("angProjectSearch"))$("angProjectSearch").value=proj?proj.name:"";
 if($("angProjectSelectedLabel"))$("angProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
}
if($("angProjectSearch")){
 $("angProjectSearch").addEventListener("input",e=>{
  const box=$("angProjectResults");
  box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-ang-project")).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
 });
 $("angProjectSearch").addEventListener("focus",e=>{
  e.target.select();
  const box=$("angProjectResults");
  box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-ang-project")).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
 });
}
if($("angProjectResults")){
 $("angProjectResults").addEventListener("click",e=>{
  const it=e.target.closest("[data-pick-ang-project]");if(!it)return;
  setAngProjectField(Number(it.dataset.pickAngProject));
  $("angProjectResults").innerHTML="";
 });
}

// ---- Formular oeffnen/anlegen ------------------------------------
function updateAngFormTitle(){
 const h2=$("angTitelH2");
 if(h2)h2.textContent="🧾 "+(typeof eintragAdresse==="function"
  ?eintragAdresse({project_id:angSelectedProjectId},$("angTitle").value)
  :($("angTitle").value||"Neue Offerte"));
 const meta=(typeof erstelltGeaendertText==="function")?erstelltGeaendertText(currentAngebotMeta):"";
 if($("angMetaInfo")){$("angMetaInfo").textContent=meta;$("angMetaInfo").hidden=!meta;}
}
function newAngebot(){
 isDirty=false;
 angEditReturnTo="cockpitAngebote";
 currentAngebotId=null;
 currentAngebotMeta={};
 $("angTitle").value="";
 $("angNote").value="";
 $("angDate").value=new Date().toISOString().slice(0,10);
 if($("angPhotoInput"))$("angPhotoInput").value="";
 if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
 angPhotos=[];
 renderAngPhotoGallery();
 angPositions=[];
 renderAngPositionsTable();
 setAngProjectField(cockpitProjectId);
 $("angebotEditModal").hidden=false;
 updateAngFormTitle();
}
function openAngebot(a){
 isDirty=false;
 currentAngebotId=a.id;
 currentAngebotMeta={created_by:a.created_by,created_at:a.created_at,updated_by:a.updated_by,updated_at:a.updated_at};
 $("angTitle").value=a.title||"";
 $("angNote").value=a.note||"";
 $("angDate").value=a.date||new Date().toISOString().slice(0,10);
 setAngProjectField(a.project_id);
 if($("angPhotoInput"))$("angPhotoInput").value="";
 angPhotos=(a.photo_paths&&a.photo_paths.length)?[...a.photo_paths]:(a.photo_path?[a.photo_path]:[]);
 renderAngPhotoGallery();
 angPositions=Array.isArray(a.positions)?a.positions.map(p=>({...p})):[];
 renderAngPositionsTable();
 if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
 angEditReturnTo="cockpitAngebote";
 $("angebotEditModal").hidden=false;
 updateAngFormTitle();
}
async function angEditZurueck(){
 if(angEditReturnTo==="cockpitAngebote"&&cockpitProjectId&&typeof zurueckInsCockpit==="function"){
  await zurueckInsCockpit("angebote");
 }else if($("startScreen")){
  showStart();
 }
 angEditReturnTo="cockpitAngebote";
}
if($("cancelAngebot")){
 $("cancelAngebot").onclick=async()=>{
  $("angebotEditModal").hidden=true;
  await angEditZurueck();
  isDirty=false;
 };
}
if($("startFromAngebotEdit"))$("startFromAngebotEdit").onclick=()=>{
 $("angebotEditModal").hidden=true;
 goToStart();
};

// ---- Speichern -----------------------------------------------------
// company_id/created_by/created_at/updated_by/updated_at werden NICHT
// mitgeschickt: company_id hat DEFAULT my_company_id(), die vier
// Verlaufsfelder setzt der Trigger set_creator_editor_meta_angebote
// serverseitig (gleiches Muster wie measurements/projects/reports seit
// v2.28/v2.29, siehe CLAUDE.md 36/37) - ein Client-Wert wuerde ohnehin
// ueberschrieben. Ein vom Client mitgeschickter Wert waere hier also
// wirkungslos, wird aber trotzdem gar nicht erst erzeugt.
if($("saveAngebot")){
 $("saveAngebot").onclick=async()=>{
  const title=$("angTitle").value.trim();
  if(!title){alert("Bitte eine Bezeichnung eingeben.");return}
  if(!angSelectedProjectId){alert("Bitte zuerst ein Projekt auswählen. Eine Offerte kann nur einem Projekt zugeordnet gespeichert werden.");return}
  // V1 bewusst ohne Offline-Warteschlange (anders als Massaufnahme/
  // Ausmass) - klare Absage statt stillem Zwischenspeichern, siehe
  // Abschlussbericht "Einschraenkungen".
  if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Diese Offerte"))return;
  $("saveAngebot").disabled=true;
  try{
   const photoUrls=[];
   for(const p of angPhotos){
    photoUrls.push(p.startsWith("data:")?await uploadMeasurementImage(p,"angebote-photo"):p);
   }
   const payload={
    project_id:angSelectedProjectId,
    title,
    note:$("angNote").value,
    date:$("angDate").value||new Date().toISOString().slice(0,10),
    photo_path:photoUrls[0]||null,
    photo_paths:photoUrls,
    positions:angPositions
   };
   // 0 betroffene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1): ein von
   // RLS blockiertes Schreiben meldet in PostgREST keinen Fehler, es
   // betrifft still 0 Zeilen.
   if(currentAngebotId){
    const {data,error}=await sb.from("angebote").update(payload).eq("id",currentAngebotId).select();
    if(error)throw error;
    if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");$("saveAngebot").disabled=false;return}
    currentAngebotMeta={...currentAngebotMeta,updated_by:data[0].updated_by,updated_at:data[0].updated_at};
   }else{
    const {data,error}=await sb.from("angebote").insert(payload).select();
    if(error)throw error;
    if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");$("saveAngebot").disabled=false;return}
    currentAngebotId=data[0].id;
    currentAngebotMeta={created_by:data[0].created_by,created_at:data[0].created_at,updated_by:data[0].updated_by,updated_at:data[0].updated_at};
   }
   $("angebotEditModal").hidden=true;
   await angEditZurueck();
   isDirty=false;
  }catch(err){
   alert("Fehler beim Speichern: "+(err.message||err));
  }
  $("saveAngebot").disabled=false;
 };
}

// ---- Anlegen-Knopf und Cockpit-Zeilen-Aktionen --------------------
// Bewusst KEIN data-cockpit-new="angebot": der bestehende Handler in
// js/24 kennt nur "rep"/"meas" und wuerde jeden anderen Wert faelschlich
// in den Ausmass-Typenwaehler leiten (geprueft, siehe Abschlussbericht).
// Eigener Knopf mit eigenem Handler stattdessen.
if($("cockpitNeueOfferte")){
 $("cockpitNeueOfferte").onclick=()=>{
  if(!cockpitProjectId||!offerteZugriff)return;
  newAngebot();
 };
}
// Dritter, unabhaengiger Listener auf #cockpitWorkArea (js/24 und js/09
// haben dort bereits je einen eigenen - siehe CLAUDE.md, unproblematisch).
if($("cockpitWorkArea")){
 $("cockpitWorkArea").addEventListener("click",e=>{
  const openA=e.target.closest("[data-open-project-angebot]");
  if(openA){
   const a=projectAngeboteCache.find(x=>x.id===Number(openA.dataset.openProjectAngebot));
   if(a)openAngebot(a);
   return;
  }
  const delA=e.target.closest("[data-del-project-angebot]");
  if(delA){
   if(!confirm("Diese Offerte wirklich löschen?"))return;
   sb.from("angebote").delete().eq("id",Number(delA.dataset.delProjectAngebot)).then(({error})=>{
    if(error){alert("Fehler: "+error.message);return}
    if(typeof cockpitBereichAktualisieren==="function")cockpitBereichAktualisieren("angebote");
   });
  }
 });
}
