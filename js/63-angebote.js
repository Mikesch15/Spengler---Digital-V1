"use strict";

/*
 * OFFERTEN
 *
 * Dieses Modul verwaltet Offerten als eigenständigen Bestandteil eines Projekts.
 *
 * Fachliche Trennung:
 * - Offerte      = dem Kunden angeboten
 * - Massaufnahme = aufgenommen / ermittelt
 * - Produktion   = daraus hergestellt
 * - Ausmass      = tatsächlich ausgeführt / verrechnet
 *
 * Bestehende Funktionen werden wiederverwendet:
 * - recognizePhoto() für die Positions-Erkennung
 * - uploadMeasurementImage() für Foto-Uploads
 * - searchProjects() / projektVorschlagHtml() / positionSuggest()
 * - resolveSignedThumbnails() für Vorschaubilder
 * - COCKPIT_BEREICHE für die Cockpit-Integration
 *
 * PDF- und Foto-Import verwenden möglichst dieselbe Positionsstruktur.
 *
 * Der Zugriff wird über die bestehende Berechtigungs- und RLS-Logik
 * abgesichert. Die Frontend-Sichtbarkeit ist keine Sicherheitsgrenze.
 *
 * Keine parallele Erkennungs-, Upload-, Projekt- oder Berechtigungslogik
 * aufbauen, wenn bestehende Funktionen verwendet werden können.
 */

// Aktuelle Offerten-Funktionalität 

let offerteZugriff=false;
let angSelectedProjectId=null;
let angPhotos=[]; // "data:..." (neu) oder Speicherpfad (bereits gespeichert)
let angPositions=[];
let currentAngebotId=null;
let currentAngebotMeta={};
let angEditReturnTo="cockpitAngebote";
let projectAngeboteCache=[];
// ---- PDF der Offerte (v3.38) --------------------------------------
// Getrennt von den Fotos (die dienen der KI-Positionserkennung, das PDF
// ist das eigentliche Offert-Dokument zum Ablegen/Weitergeben).
// angPdfExisting  = {path,name} des bereits GESPEICHERTEN PDFs, oder null.
// angPdfNewFile   = ausgewaehltes File-Objekt, das beim Speichern erst
//                   hochgeladen wird - noch NICHTS im Storage/DB.
// Liegt bewusst NICHT in "project_files" (das ist eine projektweite,
// von der Offerte unabhaengige Liste - ein Projekt kann mehrere Offerten
// haben, project_files koennte die Zuordnung nicht eindeutig abbilden),
// sondern als eigene Spalte auf der angebote-Zeile selbst - exakt wie
// photo_path/photo_paths bereits seit v3.34. Pfad "project-files/
// <projectId>/…": dieser Pfad ist ueber storage_object_insert_allowed()/
// storage_object_is_own_company() bereits REIN STRUKTURELL autorisiert
// (Pfadsegmente + Projekt-Firmenzugehoerigkeit), unabhaengig davon, ob
// eine project_files-Zeile existiert - am echten Funktionskoerper
// verifiziert, siehe CLAUDE.md. Keine neue Storage-/RLS-Migration noetig.
let angPdfExisting=null;
let angPdfNewFile=null;

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
// v3.71: "abschnitt" (fett gedruckter Zwischentitel aus der Erkennung, seit
// Edge-Function-v20/recognizePhoto()) gruppiert aufeinanderfolgende
// Positionen zu klappbaren Bloecken; "preis" (Einzelpreis) ergibt zusammen
// mit "quantity" den Betrag je Zeile und die Summe aller Betraege das
// Total. Beide Felder sind rein additiv - bereits gespeicherte Offerten
// ohne diese Felder zeigen einfach 0.00 bzw. keine Abschnittsueberschrift.
let angSektionZu=new Set(); // Titel der zugeklappten Abschnitte

function angBetrag(p){
 return (Number(p.quantity)||0)*(Number(p.preis)||0);
}
function angTotal(){
 return angPositions.reduce((summe,p)=>summe+angBetrag(p),0);
}
// Setzt die Klapp-Zustaende zurueck, wenn eine (andere) Offerte geoeffnet
// oder neu angelegt wird - sonst koennte ein beim letzten Mal zugeklappter
// Abschnitt einer voellig anderen Offerte hier faelschlich zugeklappt bleiben.
function angPositionsAufklappen(){
 angSektionZu=new Set();
 const box=$("angPositionsKlapp");
 if(box){
  box.classList.add("open");
  const kopf=box.querySelector("[data-klapp='ang-positionen']");
  if(kopf)kopf.setAttribute("aria-expanded","true");
 }
}
function angPositionZeileHtml(p,i,versteckt,sektionTitel){
 return `<tr${versteckt?' style="display:none"':""}${sektionTitel?` data-ang-sek-row="${esc(sektionTitel)}"`:""}>
<td><input data-ang-pos="${i}" value="${esc(p.pos||"")}"></td>
<td><input data-ang-desc="${i}" value="${esc(p.description||"")}"></td>
<td><input data-ang-qty="${i}" type="number" step=".01" value="${p.quantity||0}"></td>
<td><input data-ang-unit="${i}" value="${esc(p.unit||"")}"></td>
<td><input data-ang-preis="${i}" type="number" step=".01" value="${p.preis||0}"></td>
<td class="small" style="text-align:right;white-space:nowrap" data-ang-betrag="${i}">${money(angBetrag(p))}</td>
<td><button type="button" class="red" data-ang-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`;
}
function renderAngPositionsTable(){
 if(!$("angPositionsBody"))return;
 if(!angPositions.length){
  $("angPositionsBody").innerHTML='<tr><td colspan="7" class="small">Noch keine Positionen. Foto aufnehmen und "Alle Fotos erkennen" klicken, oder manuell hinzufügen.</td></tr>';
 }else{
  // Aufeinanderfolgende Positionen mit demselben (nicht leeren) Abschnitts-
  // titel bilden EINEN klappbaren Block mit fett gedrucktem Titel; Positionen
  // ohne Titel (manuell hinzugefuegt, oder aus einer Erkennung vor v3.71 ohne
  // dieses Feld) erscheinen wie bisher ohne Kopfzeile.
  let html="",i=0;
  while(i<angPositions.length){
   const titel=(angPositions[i].abschnitt||"").trim();
   if(titel){
    let j=i;
    while(j<angPositions.length&&(angPositions[j].abschnitt||"").trim()===titel)j++;
    const zu=angSektionZu.has(titel);
    html+=`<tr><td colspan="7"><div class="klapp-kopf ang-sek-kopf${zu?"":" open"}" data-ang-sek-toggle="${esc(titel)}" role="button" tabindex="0"><b>${esc(titel)}</b><span class="klapp-chevron">›</span></div></td></tr>`;
    for(let k=i;k<j;k++)html+=angPositionZeileHtml(angPositions[k],k,zu,titel);
    i=j;
   }else{
    html+=angPositionZeileHtml(angPositions[i],i,false,"");
    i++;
   }
  }
  $("angPositionsBody").innerHTML=html;
 }
 $("angPositionsSummary").textContent=angPositions.length?`${angPositions.length} Positionen`:"";
 if($("angPositionsTotal"))$("angPositionsTotal").textContent=angPositions.length?`Total: CHF ${money(angTotal())}`:"";
}
// Menge/Preis wirken sich auf den Betrag dieser Zeile und das Total aus -
// beide werden gezielt aktualisiert statt die ganze Tabelle neu zu
// rendern, damit der Eingabefokus beim Tippen nicht verloren geht.
function angAktualisiereBetrag(i){
 const p=angPositions[i];
 if(!p)return;
 const zelle=$("angPositionsBody").querySelector(`[data-ang-betrag="${i}"]`);
 if(zelle)zelle.textContent=money(angBetrag(p));
 if($("angPositionsTotal"))$("angPositionsTotal").textContent=`Total: CHF ${money(angTotal())}`;
}
if($("angPositionsBody")){
 $("angPositionsBody").addEventListener("input",e=>{
  const i=Number(e.target.dataset.angPos??e.target.dataset.angDesc??e.target.dataset.angQty??e.target.dataset.angUnit??e.target.dataset.angPreis);
  if(Number.isNaN(i)||!angPositions[i])return;
  let mengenAenderung=false;
  if(e.target.dataset.angPos!==undefined)angPositions[i].pos=e.target.value;
  else if(e.target.dataset.angDesc!==undefined)angPositions[i].description=e.target.value;
  else if(e.target.dataset.angUnit!==undefined)angPositions[i].unit=e.target.value;
  else if(e.target.dataset.angQty!==undefined){angPositions[i].quantity=Number(e.target.value)||0;mengenAenderung=true;}
  else if(e.target.dataset.angPreis!==undefined){angPositions[i].preis=Number(e.target.value)||0;mengenAenderung=true;}
  if(mengenAenderung)angAktualisiereBetrag(i);
 });
 $("angPositionsBody").addEventListener("click",e=>{
  const del=e.target.closest("[data-ang-del]");
  if(del){angPositions.splice(Number(del.dataset.angDel),1);renderAngPositionsTable();return}
  const sek=e.target.closest("[data-ang-sek-toggle]");
  if(sek){
   const titel=sek.dataset.angSekToggle;
   const offen=!sek.classList.contains("open");
   if(offen)angSektionZu.delete(titel);else angSektionZu.add(titel);
   sek.classList.toggle("open",offen);
   $("angPositionsBody").querySelectorAll("[data-ang-sek-row]").forEach(tr=>{
    if(tr.dataset.angSekRow===titel)tr.style.display=offen?"":"none";
   });
  }
 });
 $("angPositionsBody").addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
  const k=e.target.closest?e.target.closest("[data-ang-sek-toggle]"):null;
  if(!k)return;
  e.preventDefault();
  k.click();
 });
}
if($("angPositionsKlapp")){
 $("angPositionsKlapp").addEventListener("click",e=>{
  const k=e.target.closest("[data-klapp='ang-positionen']");
  if(!k)return;
  const box=k.closest(".klapp");
  if(!box)return;
  const offen=!box.classList.contains("open");
  box.classList.toggle("open",offen);
  k.setAttribute("aria-expanded",offen?"true":"false");
 });
 $("angPositionsKlapp").addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
  const k=e.target.closest?e.target.closest("[data-klapp='ang-positionen']"):null;
  if(!k)return;
  e.preventDefault();
  k.click();
 });
}
if($("angAddPosition"))$("angAddPosition").onclick=()=>{
 angPositions.push({pos:"",description:"",quantity:0,unit:"",preis:0,abschnitt:""});
 renderAngPositionsTable();
};
if($("angDeleteAllPositions")){
 $("angDeleteAllPositions").onclick=()=>{
  if(!angPositions.length)return;
  if(!confirm(`Wirklich alle ${angPositions.length} Position(en) löschen?`))return;
  angPositions=[];
  renderAngPositionsTable();
 };
}

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

// ---- PDF -> Positionen (v3.39) --------------------------------------
// Auftrag: "aus dem pdf sollen jetzt auch die positionen importiert
// werden wie mit einem foto". recognizePhoto() (js/17-ausmass.js) ist
// dafuer UNVERAENDERT wiederverwendbar: die Edge Function
// extract-offer-positions liest den mimeType direkt aus der "data:"-URL
// und reicht ihn ungeprueft an Gemini weiter (resolveImage() hat fuer
// data:-URLs KEINE Bildformat-Einschraenkung, nur fuer https?://-URLs -
// am echten Funktionskoerper verifiziert). Es war also keine Aenderung
// an recognizePhoto() oder der Edge Function noetig, nur ein neuer Weg,
// eine gueltige "data:application/pdf;base64,..."-URL zu erzeugen.
//
// Eine eigene, KLEINERE Groessengrenze fuer die Erkennung selbst (anders
// als MAX_DATEI_BYTES/MAX_DATEI_TEXT, die 50 MB fuer den reinen Upload
// erlauben): Gemini begrenzt eine inline_data-Anfrage auf praktisch rund
// 20 MB, und Base64 blaeht die Rohbytes um ca. 1/3 auf - ein 50-MB-PDF
// wuerde die Erkennungsanfrage also verlaesslich zum Scheitern bringen.
const ANG_PDF_ERKENNEN_MAX_BYTES=15*1024*1024;
const ANG_PDF_ERKENNEN_MAX_TEXT="15 MB";

function fileZuDataUrl(fileOderBlob){
 return new Promise((resolve,reject)=>{
  const r=new FileReader();
  r.onload=()=>resolve(r.result);
  r.onerror=()=>reject(new Error("Die Datei konnte nicht gelesen werden."));
  r.readAsDataURL(fileOderBlob);
 });
}

// Liefert eine gueltige PDF-"data:"-URL fuer die KI-Erkennung - egal ob
// das PDF gerade erst ausgewaehlt wurde (angPdfNewFile, noch NICHT im
// Storage) oder bereits gespeichert ist (angPdfExisting, nur ein
// Speicherpfad). Fuer den gespeicherten Fall werden die echten Bytes
// ueber die signierte URL geholt (storageSignedUrl() + fetch() + Blob) -
// ein blosser Speicherpfad wuerde an resolveImage() scheitern (derselbe
// Fehlertyp, der bei bereits gespeicherten FOTOS in js/17-ausmass.js
// besteht, siehe CLAUDE.md - hier bewusst NICHT repliziert).
async function angPdfDatenUrlFuerErkennung(){
 let quelle=null;
 if(angPdfNewFile){
  quelle=angPdfNewFile;
 }else if(angPdfExisting&&angPdfExisting.path){
  const url=await storageSignedUrl(angPdfExisting.path);
  if(!url)throw new Error("PDF konnte nicht geladen werden.");
  const res=await fetch(url);
  if(!res.ok)throw new Error(`PDF konnte nicht geladen werden (Status ${res.status}).`);
  quelle=await res.blob();
 }
 if(!quelle)throw new Error("Kein PDF vorhanden.");
 const groesse=Number(quelle.size)||0;
 if(groesse>ANG_PDF_ERKENNEN_MAX_BYTES){
  throw new Error(`Das PDF ist für die Positionserkennung zu gross (${formatFileSize(groesse)}). Erlaubt sind höchstens ${ANG_PDF_ERKENNEN_MAX_TEXT} für die Erkennung (unabhängig vom 50-MB-Limit für den reinen Upload).`);
 }
 return await fileZuDataUrl(quelle);
}

// ---- PDF der Offerte (eigenes Dokument, kein Foto) -----------------
// dateiEndung()/dateiZuGross()/formatFileSize()/MAX_DATEI_TEXT kommen aus
// js/09-projekte.js (dort seit v2.48/v2.49 die eine Quelle fuer
// Groessengrenze/Formatierung, siehe CLAUDE.md 56/57) - lediglich als
// globale Funktionen aufgerufen, js/09 selbst wird nicht angefasst.
async function uploadAngebotPdf(projectId,file){
 if(dateiEndung(file)!=="pdf")throw new Error("Nur PDF-Dateien können hier hochgeladen werden.");
 if(typeof dateiZuGross==="function"&&dateiZuGross(file))
  throw new Error(`Die Datei ist zu gross (${formatFileSize(file.size)}). Erlaubt sind höchstens ${MAX_DATEI_TEXT} pro Datei.`);
 const path=`project-files/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.pdf`;
 const {error}=await sb.storage.from("measurements").upload(path,file,{contentType:"application/pdf",upsert:false});
 if(error)throw error;
 return path;
}
function renderAngPdfBereich(){
 const box=$("angPdfBereich");
 if(!box)return;
 if(angPdfNewFile){
  box.innerHTML=`<div class="report-row">
<div class="report-row-info"><b>📕 ${esc(angPdfNewFile.name)}</b><span>${formatFileSize(angPdfNewFile.size)} · wird beim Speichern hochgeladen</span></div>
<div class="report-row-actions">
<button type="button" class="gray" data-ang-pdf-erkennen title="Positionen aus diesem PDF erkennen">🔎 Positionen erkennen</button>
<button type="button" class="red" data-ang-pdf-entfernen title="Auswahl verwerfen">✕</button>
</div>
</div>`;
 }else if(angPdfExisting&&angPdfExisting.path){
  box.innerHTML=`<div class="report-row">
<div class="report-row-info"><b>📕 ${esc(angPdfExisting.name||"Offerte.pdf")}</b></div>
<div class="report-row-actions">
<button type="button" class="blue" data-ang-pdf-oeffnen>Öffnen</button>
<button type="button" class="gray" data-ang-pdf-erkennen title="Positionen aus diesem PDF erkennen">🔎 Positionen erkennen</button>
<button type="button" class="red" data-ang-pdf-entfernen title="Entfernen">✕</button>
</div>
</div>`;
 }else{
  box.innerHTML='<div class="small" style="color:var(--muted)">Noch kein PDF hochgeladen.</div>';
 }
}
if($("angPdfInput")){
 $("angPdfInput").addEventListener("change",e=>{
  const file=(e.target.files||[])[0];
  e.target.value="";
  if(!file)return;
  if(dateiEndung(file)!=="pdf"){alert("Bitte nur eine PDF-Datei auswählen.");return}
  if(typeof dateiZuGross==="function"&&dateiZuGross(file)){
   alert(`Die Datei ist zu gross (${formatFileSize(file.size)}). Erlaubt sind höchstens ${MAX_DATEI_TEXT} pro Datei.`);
   return;
  }
  angPdfNewFile=file;
  renderAngPdfBereich();
 });
}
if($("angPdfBereich")){
 $("angPdfBereich").addEventListener("click",async e=>{
  if(e.target.closest("[data-ang-pdf-entfernen]")){
   if(angPdfNewFile)angPdfNewFile=null;
   else angPdfExisting=null;
   renderAngPdfBereich();
   return;
  }
  const oeffnen=e.target.closest("[data-ang-pdf-oeffnen]");
  if(oeffnen&&angPdfExisting&&angPdfExisting.path){
   // Bucket ist privat: window.open() muss synchron im Klick bleiben,
   // sonst blockieren Popup-Blocker - gleiches Muster wie beim Oeffnen
   // einer Projektdatei (js/09-projekte.js, data-open-project-file).
   const fenster=window.open("","_blank");
   const url=await storageSignedUrl(angPdfExisting.path);
   if(url&&fenster)fenster.location.href=url;
   else if(fenster)fenster.close();
   if(!url)alert("PDF konnte nicht geöffnet werden.");
   return;
  }
  const erkennen=e.target.closest("[data-ang-pdf-erkennen]");
  if(erkennen){
   erkennen.disabled=true;
   if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="Erkenne Positionen aus dem PDF … das kann einige Sekunden dauern.";
   try{
    const dataUrl=await angPdfDatenUrlFuerErkennung();
    const found=await recognizePhoto(dataUrl);
    angPositions=angPositions.concat(found);
    renderAngPositionsTable();
    if($("angRecognizeStatus"))$("angRecognizeStatus").textContent=`${found.length} Position(en) aus dem PDF erkannt. Bitte auf Richtigkeit prüfen und bei Bedarf korrigieren, bevor du speicherst.`;
   }catch(err){
    if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
    alert("Fehler bei der Erkennung: "+(err.message||err));
   }
   erkennen.disabled=false;
  }
 });
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
 angPositionsAufklappen();
 renderAngPositionsTable();
 angPdfExisting=null;
 angPdfNewFile=null;
 if($("angPdfInput"))$("angPdfInput").value="";
 renderAngPdfBereich();
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
 angPositionsAufklappen();
 renderAngPositionsTable();
 angPdfExisting=a.pdf_path?{path:a.pdf_path,name:a.pdf_name||"Offerte.pdf"}:null;
 angPdfNewFile=null;
 if($("angPdfInput"))$("angPdfInput").value="";
 renderAngPdfBereich();
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
   // Neues PDF erst JETZT hochladen (nicht schon bei der Auswahl) - erst
   // wenn wirklich gespeichert wird, entsteht eine Storage-Datei. Ohne
   // Auswahl bleibt ein bereits gespeichertes PDF unveraendert stehen;
   // wurde es entfernt (angPdfExisting===null), wird pdf_path/pdf_name null.
   let pdfPath=angPdfExisting?angPdfExisting.path:null;
   let pdfName=angPdfExisting?angPdfExisting.name:null;
   if(angPdfNewFile){
    pdfPath=await uploadAngebotPdf(angSelectedProjectId,angPdfNewFile);
    pdfName=angPdfNewFile.name;
   }
   const payload={
    project_id:angSelectedProjectId,
    title,
    note:$("angNote").value,
    date:$("angDate").value||new Date().toISOString().slice(0,10),
    photo_path:photoUrls[0]||null,
    photo_paths:photoUrls,
    positions:angPositions,
    pdf_path:pdfPath,
    pdf_name:pdfName
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
   angPdfExisting=pdfPath?{path:pdfPath,name:pdfName}:null;
   angPdfNewFile=null;
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
