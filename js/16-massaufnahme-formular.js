"use strict";
function showMeasTypeSection(type){
 $("measTypeFoto").hidden=(type!=="skizze_foto");
 $("measTypeEinlaufblech").hidden=(type!=="einlaufblech_gerade");
 $("measTypeRinne").hidden=(type!=="rinne_halbrund");
 $("measTypeEinlaufblechKonisch").hidden=(type!=="einlaufblech_konisch");
 $("measTypeFreiesProfil").hidden=(type!=="freies_profil");
 $("measTypeMauerabdeckung").hidden=(type!=="mauerabdeckung");
 $("measTypeLukarne").hidden=(type!=="lukarne");
 $("measTypeAnschlussblech").hidden=(type!=="anschlussblech");
 $("measTypeEinfassungRund").hidden=(type!=="einfassung_rund");
 $("measTypeKehle").hidden=(type!=="kehle");
 $("measTypeRinneProfil").hidden=(type!=="rinne");
 if(type==="einlaufblech_gerade"&&typeof renderEinlaufblechAufnahme==="function")renderEinlaufblechAufnahme();
 if(type==="rinne_halbrund"){renderRinneResult();if(typeof renderRinneAufnahme==="function")renderRinneAufnahme();}
 if(type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 if(type==="einlaufblech_gerade")refreshEbRinneList();
 if(type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
 if(type==="mauerabdeckung")renderMadResult();
 if(type==="lukarne")renderLukResult();
 if(type==="anschlussblech")renderAnbResult();
 if(type==="einfassung_rund")renderEinfResult();
 if(type==="kehle")renderKehleResult();
 if(type==="rinne")renderRinneResult();
}
$("measType").addEventListener("change",e=>showMeasTypeSection(e.target.value));
$("openEinlaufblechSettings").onclick=()=>{
 settingsReturnToMeasurement=true;
 $("measurementEditModal").hidden=true;
 renderSettings();
 applyCompanyName();
 applyEinlaufblechSettings();
 document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab==="measurements"));
 document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!=="measurements")});
 const sec=document.querySelector('.settings-section[data-section="einlaufblech"]');
 if(sec)sec.classList.add("open");
 $("settingsModal").hidden=false;
};

// Fotos und Skizzen gehoeren seit v2.70 zu jeder Massaufnahme-Art.
// Eine Stelle, ein Ergebnis - so kann keine Art vergessen gehen.
function measMedienAusFormular(){
 return {photo_path:measPhotoDataUrl||measExistingPhotoUrl||null,
         sketch_paths:measSketches.slice()};
}
function buildMeasurementFromForm(){
 const type=$("measType").value;
 const base={
  title:$("measTitle").value,
  note:$("measNote").value,
  date:$("measDate").value,
  type,
  project_id:measSelectedProjectId,
 };
 if(type==="einlaufblech_gerade"){
  const massA=Number($("eb_massA").value)||0;
  const winkel=Number($("eb_winkel").value)||0;
  const montage=$("eb_montage").value;
  const abwicklung=Number($("eb_abwicklung").value);
  const engeSeite=ebEngeSeite();
  const massAEng=Math.max(0,massA-2);
  const restBreite=ebRestbreite();
  const gesamtlaenge=ebPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
  // Superset: die acht bisherigen Felder bleiben Zeichen für Zeichen gleich,
  // die neuen kommen dazu. Eine vor v2.74 gespeicherte Aufnahme laesst sich
  // dadurch unveraendert oeffnen.
  const zusatz=(typeof ebaZusatzDaten==="function")?ebaZusatzDaten():{};
  return {...base,...measMedienAusFormular(),data:{gesamtlaenge,massA,massAEng,winkel,montage,abwicklung,engeSeite,restBreite,pieces:ebPieces,material:$("eb_material").value,...zusatz}};
 }
 if(type==="rinne_halbrund"){
  if(typeof raBruecke==="function")raBruecke();
  const segmentsWithZuschnitt=rinneSegments.map(s=>({...s,zuschnittlaenge:calcRinneSegment(s)}));
  const gesamtlaenge=rinneSegments.reduce((s,seg)=>s+(Number(seg.laenge)||0),0);
  const material=$("rinne_material").value;
  const {boundaries}=computeRinneBoundaries(rinneSegments);
  // Stückliste mitspeichern, damit ein späterer Ausdruck dieselben Zahlen
  // zeigt, auch wenn Anschluss- oder Dila-Masse zwischenzeitlich geändert werden.
  const stueckliste=berechneRinneStueckliste(rinneSegments,rinneDilas,boundaries,rinneDilaMass);
  // Die bisherigen Felder bleiben unveraendert erhalten - dadurch oeffnen
  // und drucken aeltere Datensaetze genau wie zuvor. Die Erfassung ergaenzt
  // nur zusaetzliche Felder (Verlauf mit Stutzen, Halter, Rinnenboden,
  // Normlaengen).
  const zusatz=(typeof rinneAufnahmeZusatzDaten==="function")?rinneAufnahmeZusatzDaten():{};
  return {...base,...measMedienAusFormular(),data:{rinneAbwicklung:$("rinne_abwicklung").value,material,segments:segmentsWithZuschnitt,gesamtlaenge,dilas:rinneDilas,boundaries,stueckliste,dilaMass:rinneDilaMass,...zusatz}};
 }
 if(type==="einlaufblech_konisch"){
  const abwicklung=Number($("ebk_abwicklung").value);
  const dachneigung=Number($("ebk_dachneigung").value)||0;
  const montage=$("ebk_montage").value;
  const engeSeite=ebkEngeSeite();
  const gesamtlaenge=ebkPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
  const piecesWithEng=ebkPieces.map(p=>({...p,...calcEbkPiece(p)}));
  return {...base,...measMedienAusFormular(),data:{abwicklung,dachneigung,montage,engeSeite,pieces:piecesWithEng,gesamtlaenge,material:$("ebk_material").value}};
 }
 if(type==="freies_profil"){
  const konisch=$("fp_konisch").value==="ja";
  return {...base,...measMedienAusFormular(),data:{schenkel:fpSchenkel,konisch,segmente:fpSegmente,ansicht:$("fp_ansicht").value,material:$("fp_material").value}};
 }
 if(type==="mauerabdeckung"){
  const material=$("mad_material").value;
  const {boundaries,gesamtlaenge}=computeMadBoundaries(madSegments);
  const stueckliste=berechneMadStueckliste(madSegments,madSchieber,boundaries,madBodenMass,madSchieberMass);
  return {...base,...measMedienAusFormular(),data:{
   material,
   profil:madProfilMasse(),
   abwicklung:Math.round(madProfilMasse().abwicklung),
   segments:madSegments,
   schieber:madSchieber,
   boundaries,
   gesamtlaenge,
   stueckliste,
   bodenMass:madBodenMass,
   schieberMass:madSchieberMass
  }};
 }
 if(type==="lukarne"){
  const g=berechneLukarne(lukEingabenAusFeldern());
  if(!g)return {...base,...measMedienAusFormular(),data:{}};
  // Scharenliste mitspeichern: ein einmal gedrucktes PDF bleibt dadurch
  // gleich, auch wenn eine Zugabe später geändert wird.
  return {...base,...measMedienAusFormular(),data:{
   hoehe:g.H,
   laengeOben:g.L,
   winkel:g.alpha,
   achsabstand:g.p,
   hilfsrissWunsch:g.hilfsrissWunsch,
   hilfsriss:g.hilfsriss,
   seite:g.seite,
   breite:g.W,
   spitzeVersatz:g.dy,
   schraege:g.A,
   anzahl:g.anzahl,
   flaeche:g.flaeche,
   zugabeBreite:g.zugabeBreite,
   zugabeLaenge:g.zugabeLaenge,
   scharen:g.scharen,
   material:$("luk_material").value
  }};
 }
 if(type==="anschlussblech"){
  const e=anbEingabenAusFeldern();
  const g=berechneAnschlussblech(e);
  // Ergebnis mitspeichern, damit ein gedrucktes PDF gleich bleibt.
  return {...base,...measMedienAusFormular(),data:{...e,
   abwicklung:g?g.abwicklung:0,
   teile:g?g.teile:[],
   stueckliste:g?g.stuecke:[],
   flaeche:g?g.flaeche:0,
   material:$("anb_material").value
  }};
 }
 if(type==="einfassung_rund"){
  const e=einfEingabenAusFeldern();
  const g=einfBerechnen(e);
  return {...base,...measMedienAusFormular(),data:{...e,
   abwicklung:g?g.abwicklung:0,
   breiteGesamt:g?g.breiteGesamt:null,
   anzahlBleilappen:g?g.anzahlBleilappen:null,
   material:$("einf_material").value
  }};
 }
 if(type==="kehle"){
  // Nur die drei Eingaben sind Nutzereingabe; die Excel-Resultate werden
  // mitgespeichert, damit ein spaeter gedrucktes PDF unveraendert bleibt
  // (gleiches Vorgehen wie bei Anschlussblech/Einfassung Rund).
  const e=kehleEingabenAusFeldern();
  const g=kehleBerechnen(e);
  const werte={};
  if(g&&g.ok)["Q","R","S","T","tanU","tanV","U","V","U90","V90","W","A","X","Y","Z","AA","AB","AC","AD","AE",
   "b","c","d","e","f","g","h","i","k","l","m","n","o","p","mitte"].forEach(k=>{werte[k]=g[k]});
  return {...base,...measMedienAusFormular(),data:{
   nh:e.nh===""?null:Number(e.nh),
   nl:e.nl===""?null:Number(e.nl),
   gl:e.gl===""?null:Number(e.gl),
   ...werte
  }};
 }
 if(type==="rinne"){
  // Profil und Ansetztypen werden als Momentaufnahme mitgespeichert.
  // Eine spaetere Aenderung der Vorgaben veraendert dadurch gespeicherte
  // Rinnenstuecke nicht rueckwirkend.
  const w=rinneWerte(rinneAktiveWerte());
  const anzahl=rinneVariable(w.profil).length;
  const z=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const seite=q=>{const l=[];for(let i=0;i<anzahl;i++)l.push(z(Array.isArray(q)?q[i]:undefined));return l};
  const stuecke=rinneStuecke.map(st=>{
   const g=rinneStueckRechnen(st,w);
   return {
    links:seite(st.links),rechts:seite(st.rechts),
    laenge:z(st.laenge),ansetzL:st.ansetzL,ansetzR:st.ansetzR,
    abwicklungLinks:g.abwicklungLinks,abwicklungRechts:g.abwicklungRechts,
    zuschnitt:g.zuschnitt
   };
  });
  return {...base,...measMedienAusFormular(),data:{
   profil:w.profil,ansetz:w.ansetz,
   fixSumme:rinneFixSumme(w.profil),
   varMasse:rinneVariable(w.profil).map(v=>({buchstabe:v.buchstabe,name:v.name})),
   stuecke,
   material:$("rp_material")?$("rp_material").value:""
  }};
 }
 return {...base,...measMedienAusFormular(),data:{material:$("foto_material")?$("foto_material").value:""}};
}
$("printMeasurementBtn").onclick=()=>printMeasurement(Object.assign(buildMeasurementFromForm(),currentMeasurementMeta));
$("cancelMeasurement").onclick=()=>{
 $("measurementEditModal").hidden=true;
 measEditZurueck();   // zentrale Rueckkehr, siehe js/24-projekt-cockpit.js
 isDirty=false;
};

$("saveMeasurement").onclick=async()=>{
 const title=$("measTitle").value.trim();
 const type=$("measType").value;
 // Offline (v2.70): klare Absage statt kryptischer Netzwerkmeldung.
 if(offlineSperrtSpeichern("Diese Massaufnahme"))return;
 if(!title){alert("Bitte eine Bezeichnung eingeben.");return}
 if(!measSelectedProjectId){alert("Bitte zuerst ein Projekt auswählen. Eine Massaufnahme kann nur einem Projekt zugeordnet gespeichert werden.");return}
 if(type==="skizze_foto"&&!measPhotoDataUrl&&!measExistingPhotoUrl&&measSketches.length===0){alert("Bitte ein Foto aufnehmen oder mindestens eine Skizze zeichnen.");return}
 if(type==="einlaufblech_gerade"){
  if(!ebPieces.length||!ebPieces.some(p=>Number(p.laenge)>0)){alert("Bitte mindestens ein Stück mit einer gültigen Länge erfassen.");return}
  if(!Number($("eb_massA").value)||Number($("eb_massA").value)<=0){alert("Bitte Mass A eingeben (Pflichtfeld).");return}
  if($("eb_winkel").value===""||$("eb_winkel").value===null){alert("Bitte Dachneigung / Winkel eingeben (Pflichtfeld).");return}
 }
 if(type==="rinne_halbrund"){
  if(typeof raBruecke==="function")raBruecke();
  if(!rinneSegments.length||!rinneSegments.some(s=>Number(s.laenge)>0)){
   alert("Bitte mindestens einen Rinnenabschnitt mit einer gültigen Länge eingeben.");return}
 }
 if(type==="einlaufblech_konisch"){
  if(!ebkPieces.length||!ebkPieces.some(p=>Number(p.laenge)>0)){alert("Bitte mindestens ein Stück mit einer gültigen Länge erfassen.");return}
  if($("ebk_dachneigung").value===""||$("ebk_dachneigung").value===null){alert("Bitte Dachneigung / Winkel eingeben (Pflichtfeld).");return}
  if(ebkPieces.some(p=>!Number(p.massLinks)||!Number(p.massRechts))){alert("Bitte bei jedem Stück Mass links und Mass rechts eingeben (Pflichtfelder).");return}
 }
 if(type==="freies_profil"){
  if(!fpSchenkel.length){alert("Bitte mindestens einen Schenkel im Profil erfassen.");return}
  if(!fpSegmente.length){alert("Bitte mindestens ein Segment erfassen.");return}
 }
 if(type==="mauerabdeckung"){
  if(!madSegments.length){alert("Bitte mindestens ein Segment erfassen.");return}
  if(madSegments.some(s=>!Number(s.laenge))){alert("Bitte bei jedem Segment eine Länge eingeben.");return}
 }
 if(type==="lukarne"){
  if(!berechneLukarne(lukEingabenAusFeldern())){alert("Bitte Höhe, obere Länge, Winkel und Achsabstand eingeben. Der obere Innenwinkel muss zwischen 90° und 180° liegen.");return}
 }
 if(type==="anschlussblech"){
  const e=anbEingabenAusFeldern();
  if(!(Number(e.a)>0)){alert("Bitte mindestens das Mass a eingeben.");return}
 }
 if(type==="einfassung_rund"){
  const e=einfEingabenAusFeldern();
  if(!(Number(e.durchmesser)>0)){alert("Bitte den Rohrdurchmesser eingeben.");return}
  if(!(Number(e.a)>0)||!(Number(e.c)>0)){alert("Bitte mindestens die Masse a und c eingeben.");return}
 }
 if(type==="kehle"){
  const g=kehleBerechnen(kehleEingabenAusFeldern());
  if(!g.ok){alert(g.fehler.join("\n"));return}
 }
 if(type==="rinne"){
  if(!rinneProfil.length){alert("Bitte zuerst das Rinnenprofil festlegen (mindestens ein Segment).");return}
  if(!rinneStuecke.length){alert("Bitte mindestens ein Rinnenstück erfassen.");return}
  if(!rinneStuecke.some(st=>Number(st.laenge)>0)){alert("Bitte bei mindestens einem Rinnenstück eine Länge M/M eingeben.");return}
 }
 $("saveMeasurement").disabled=true;
 let platzhalterId=null; // falls hier eine Zeile nur für die Ordner-ID angelegt wird
 try{
  const form=buildMeasurementFromForm();
  const warNeu=!currentMeasurementId;
  let workingId=currentMeasurementId;
  let photoUrl=measExistingPhotoUrl,sketchUrls=measSketches.slice();
  {
   // Fotos/Skizzen sollen eindeutig unter measurements/<projectId>/<measurementId>/…
   // abgelegt werden – bei einer neuen Massaufnahme gibt es diese ID aber
   // erst nach dem ersten Speichern. Deshalb bei neuen Foto-/Skizzen-Uploads
   // zuerst eine Platzhalterzeile anlegen, um die echte ID zu bekommen.
   const hatNeueDateien=!!measPhotoDataUrl||measSketches.some(s=>s.startsWith("data:"));
   if(!workingId&&hatNeueDateien){
    const {data:neu,error:eNeu}=await sb.from("measurements").insert({
     project_id:measSelectedProjectId||null,type,title,note:$("measNote").value,
     date:$("measDate").value||new Date().toISOString().slice(0,10),
     data:form.data||{},
     created_by:currentProfile?currentProfile.id:null,created_at:new Date().toISOString()
    }).select().maybeSingle();
    if(eNeu)throw eNeu;
    workingId=neu.id;
    platzhalterId=neu.id;
   }
   const ordner=`measurements/${measSelectedProjectId}/${workingId}`;
   photoUrl=measExistingPhotoUrl;
   if(measPhotoDataUrl)photoUrl=await uploadMeasurementImage(measPhotoDataUrl,`${ordner}/photo`);
   sketchUrls=[];
   for(const s of measSketches){
    sketchUrls.push(s.startsWith("data:")?await uploadMeasurementImage(s,`${ordner}/sketches`):s);
   }
  }
  const jetzt=new Date().toISOString();
  const payload={
   project_id:measSelectedProjectId||null,
   type,
   title,
   note:$("measNote").value,
   date:$("measDate").value||new Date().toISOString().slice(0,10),
   photo_path:photoUrl,
   sketch_path:sketchUrls[0]||null,
   sketch_paths:sketchUrls,
   data:form.data||{},
   updated_by:currentProfile?currentProfile.id:null,
   updated_at:jetzt
  };
  const {error}=workingId
   ?await sb.from("measurements").update(payload).eq("id",workingId)
   :await sb.from("measurements").insert({...payload,created_by:currentProfile?currentProfile.id:null,created_at:jetzt});
  if(error)throw error;
  currentMeasurementId=workingId;
  currentMeasurementMeta=warNeu
   ?{created_by:currentProfile?currentProfile.id:null,created_at:jetzt,updated_by:null,updated_at:null}
   :{...currentMeasurementMeta,updated_by:payload.updated_by,updated_at:jetzt};
  $("measurementEditModal").hidden=true;
  await measEditZurueck();   // zentrale Rueckkehr, siehe js/24-projekt-cockpit.js
  isDirty=false;
 }catch(err){
  if(platzhalterId)await sb.from("measurements").delete().eq("id",platzhalterId).then(()=>{},()=>{});
  alert("Fehler beim Speichern: "+(err.message||err));
 }
 $("saveMeasurement").disabled=false;
};

let measurementListProjectId=null;
async function renderMeasurementsOverview(){
 const {data,error}=await sb.from("measurements").select("*").order("created_at",{ascending:false}).limit(recentCount);
 if(error){$("recentMeasurementsList").innerHTML=`<div class="empty">Fehler: ${esc(error.message)}</div>`;return}
 const rows=data||[];
 measurementsCache=rows;
 const typeLabels=MEAS_TYPE_LABELS;
 $("recentMeasurementsList").innerHTML=rows.length?rows.map(m=>{
  const proj=allProjects.find(p=>p.id===m.project_id);
  let thumbHtml;
  if(m.type==="einlaufblech_gerade"){
   const d=m.data||{};
   const anzahl=(d.pieces&&d.pieces.length)||0;
   thumbHtml=`<div class="meas-thumb meas-thumb-empty" style="font-size:10px;line-height:1.2;padding:2px">${anzahl}×<br>${d.massA||0}mm</div>`;
  }else{
   const thumb=m.photo_path||(m.sketch_paths&&m.sketch_paths[0])||m.sketch_path;
   thumbHtml=thumb?`<img class="meas-thumb" data-signed-src="${esc(thumb)}" loading="lazy">`:'<div class="meas-thumb meas-thumb-empty">–</div>';
  }
  return `<div class="meas-row">
${thumbHtml}
<div class="meas-row-info"><b>${esc(eintragAdresse(m,m.title))}</b><span>${esc(infoZeileOhne(eintragAdresse(m,m.title),typeLabels[m.type]||m.type,m.title,proj?proj.name:"Kein Projekt",m.date))}</span></div>
<div class="meas-row-actions">
<button class="blue" data-open-measurement="${m.id}" title="Öffnen">✏️</button>
<button class="red" data-del-measurement="${m.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Massaufnahmen vorhanden.</div>';
 resolveSignedThumbnails($("recentMeasurementsList"));
}
$("recentMeasurementsList").addEventListener("click",e=>{
 const o=e.target.closest("[data-open-measurement]");
 if(o){const m=measurementsCache.find(x=>x.id===Number(o.dataset.openMeasurement));if(m)openMeasurement(m);return}
 const d=e.target.closest("[data-del-measurement]");
 if(d){
  if(!confirm("Diese Massaufnahme wirklich löschen?"))return;
  sb.from("measurements").delete().eq("id",Number(d.dataset.delMeasurement)).then(({error})=>{
   if(error){alert("Fehler: "+error.message);return}
   renderMeasurementsOverview();
  });
 }
});

function pdfDateiname(...teile){
 const bereinigt=teile.map(s=>String(s||"").trim()).filter(Boolean);
 return bereinigt.join(" – ")||"Dokument";
}
function formatDatumZeit(iso){
 if(!iso)return null;
 const d=new Date(iso);
 if(isNaN(d.getTime()))return null;
 return d.toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"});
}
// ---- Gemeinsamer PDF-Briefkopf und Fusszeile ----------------------
// Wird von printMeasurement (hier) und printAusmass (17-ausmass.js)
// benutzt, damit alle Ausdrucke gleich aussehen wie der Regierapport:
// Firmenlogo/-anschrift oben, "Erstellt/Geändert von" klein unten.
function erstelltGeaendertText(record){
 record=record||{};
 const erstelltName=profileName(record.created_by);
 const erstelltZeit=formatDatumZeit(record.created_at);
 const geaendertName=profileName(record.updated_by);
 const geaendertZeit=formatDatumZeit(record.updated_at);
 const teile=[];
 // "Unbekannter Benutzer": das ursprüngliche Profil existiert nicht mehr
 // (z. B. Mitarbeiter entfernt) - das Ereignis selbst (Zeitpunkt) bleibt
 // trotzdem erhalten, siehe CLAUDE.md 36.
 if(erstelltName||erstelltZeit)teile.push(`Erstellt von ${esc(erstelltName||"Unbekannter Benutzer")}${erstelltZeit?" am "+esc(erstelltZeit):""}`);
 if(geaendertName||geaendertZeit)teile.push(`Zuletzt geändert von ${esc(geaendertName||"Unbekannter Benutzer")}${geaendertZeit?" am "+esc(geaendertZeit):""}`);
 return teile.join(" · ");
}
// ---- Gemeinsame professionelle PDF-Bausteine ---------------------
// Wird von printMeasurement (hier) und printAusmass (17-ausmass.js)
// benutzt. Ein einziges Layout fuer alle Ausdrucke ausser dem
// Regierapport - der druckt weiterhin ueber css/03-druck.css die
// App-Seite selbst und ist von diesen Bausteinen nicht betroffen.
// Ein einziger Kopf fuer alle PDFs ausser dem Regierapport (v2.54).
// Frueher zwei Bausteine (Briefkopf + Datenraster) - jetzt eine
// Komponente, damit Massaufnahme und Ausmass zwingend identisch
// aussehen. Kein Tabellenraster, keine Kaestchen, keine Kartenoptik:
// ruhiges Firmenbriefpapier.
//
//   [Logo/Firmenname]                        MASSAUFNAHME
//   Firmenanschrift klein                    02.09.2026
//
//   ADRESSE ALS GROSSER HAUPTTITEL
//   Projektname · Auftrag 2026-123 · Auftraggeber
//
//   Massaufnahme: Kehle
//   Bezeichnung:  Kehle Lukarne Nord
//   Bearbeiter:   Mike Ledermann
//   ------------------------------------------------------------
function pdfDatumKurz(wert){
 const s=String(wert||"").trim();
 if(!s)return "";
 const t=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
 return t?`${t[3]}.${t[2]}.${t[1]}`:s;
}
function pdfKopfHtml(opt){
 const o=opt||{};
 const src=o.logoSrc!==undefined?o.logoSrc:logoUrl;
 const logo=src
  ? `<img src="${esc(src)}" alt="">`
  : `<div class="pdf-logo-text">${esc(companyName)}</div>`;
 // Ohne Logo tritt der Firmenname an dessen Stelle - dann steht er
 // darunter nicht noch einmal.
 const firmaUnten=[src?companyName:"",companyAddress||""].filter(x=>String(x).trim()).join("\n");
 // Objektadresse ueber die bestehende zentrale Logik, keine zweite Quelle.
 const adresse=eintragAdresse({project_id:o.datensatz?o.datensatz.project_id:null},o.bezeichnung||"");
 const p=o.projekt||{};
 // Ruhige Informationszeile statt Tabelle - nur vorhandene Werte.
 const projektzeile=[
  String(p.name||"").trim(),
  String(p.order_no||"").trim()?"Auftrag "+String(p.order_no).trim():"",
  String(p.customer||"").trim()
 ].filter(Boolean).join(" · ");
 const bez=String(o.bezeichnung||"").trim();
 const zeilen=[];
 if(o.unterart)zeilen.push([o.dokumenttyp,o.unterart]);
 if(bez&&bez!==adresse)zeilen.push(["Bezeichnung",bez]);
 if(o.bearbeiter)zeilen.push(["Bearbeiter",o.bearbeiter]);
 const datum=pdfDatumKurz(o.datum);
 return `<div class="pdf-head">
<div class="pdf-head-firma"><div class="pdf-logo">${logo}</div>${
 firmaUnten?`<div class="pdf-firma">${esc(firmaUnten)}</div>`:""}</div>
<div class="pdf-head-typ"><div class="pdf-doktyp">${esc(String(o.dokumenttyp||"").toUpperCase())}</div>${
 datum?`<div class="pdf-datum">${esc(datum)}</div>`:""}</div>
</div>
<div class="pdf-titel"><h1>${esc(adresse)}</h1>${
 projektzeile?`<div class="pdf-projekt">${esc(projektzeile)}</div>`:""}</div>${
 zeilen.length?`<div class="pdf-info">${zeilen.map(z=>
  `<div><span>${esc(z[0])}:</span> ${esc(z[1])}</div>`).join("")}</div>`:""}
<div class="pdf-trenner"></div>`;
}
function pdfFooterHtml(record){
 const teile=[esc(companyName)];
 const info=erstelltGeaendertText(record);
 if(info)teile.push(info);
 teile.push("Gedruckt am "+esc(new Date().toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"})));
 return `<div class="pdf-foot">${teile.join(" · ")}</div>`;
}
// Spalten, deren Werte durchgehend Zahlen sind, rechtsbuendig setzen -
// ohne die Inhalte der einzelnen Druckzweige anzufassen. Bearbeitet
// werden ausschliesslich einfache Zellen ohne verschachtelte Elemente;
// alles andere bleibt unveraendert.
const PDF_ZAHL_MUSTER=/^-?[\d'’.,]+(\s*(mm|cm|m|m²|m2|°|%|kg|Stk\.?|St\.))?$|^[–-]$/;
function pdfZahlenRechts(html){
 return String(html).replace(/<table class="(eb-cutlist|am-cutlist)"[^>]*>[\s\S]*?<\/table>/g,tab=>{
  const koepfe=[...tab.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>m[1]);
  const zeilen=[...tab.matchAll(/<tr\b[^>]*>((?:\s*<td\b[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/g)]
   .map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]));
  if(!koepfe.length||!zeilen.length)return tab;
  const spalten=koepfe.length;
  const rechts=[];
  for(let i=0;i<spalten;i++){
   const werte=zeilen.filter(z=>z.length===spalten).map(z=>z[i]);
   rechts[i]=werte.length>0&&werte.every(v=>!/</.test(v)&&PDF_ZAHL_MUSTER.test(v.trim()));
  }
  if(!rechts.some(Boolean))return tab;
  let kopfNr=-1;
  tab=tab.replace(/<th\b([^>]*)>/g,(m,attr)=>{kopfNr++;return rechts[kopfNr]?`<th${attr} class="r">`:m});
  return tab.replace(/<tr\b([^>]*)>((?:\s*<td\b[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/g,(m,attr,inhalt)=>{
   const zellen=[...inhalt.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(x=>x[0]);
   if(zellen.length!==spalten)return m;
   let nr=-1;
   const neu=inhalt.replace(/<td\b([^>]*)>/g,(mm,a)=>{nr++;return rechts[nr]?`<td${a} class="r">`:mm});
   return `<tr${attr}>${neu}</tr>`;
  });
 });
}
// Ein einziges Stylesheet fuer alle diese PDFs. Zurueckhaltend,
// schwarz/weiss druckbar, ohne App-Optik.
const PDF_LAYOUT_CSS=`
 @page{size:A4 portrait;margin:14mm 14mm 17mm;
  @bottom-right{content:"Seite " counter(page) " von " counter(pages);
   font-family:Arial,Helvetica,sans-serif;font-size:6.5pt;color:#7b858c}}
 *{box-sizing:border-box}
 body{font-family:Arial,Helvetica,sans-serif;color:#17202a;margin:0;font-size:8.5pt;line-height:1.35;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;padding-bottom:9mm}
 /* Kopf: ruhiges Firmenbriefpapier, kein Raster und keine Kaestchen */
 .pdf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;margin:0}
 .pdf-head-firma{min-width:0}
 .pdf-logo img{max-height:16mm;max-width:64mm;display:block}
 .pdf-logo-text{font-size:13pt;font-weight:800;letter-spacing:.04em;line-height:1.1;color:#17202a}
 .pdf-firma{margin-top:1.4mm;font-size:6.6pt;color:#5b666e;line-height:1.45;white-space:pre-line}
 .pdf-head-typ{text-align:right;flex:0 0 auto;padding-top:.5mm}
 .pdf-doktyp{font-size:9.5pt;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#17202a;
  white-space:nowrap}
 .pdf-datum{margin-top:1.2mm;font-size:8pt;color:#5b666e;white-space:nowrap}
 /* Dokumenttitel: Objektadresse gross, darunter eine ruhige Projektzeile */
 .pdf-titel{margin:7mm 0 0}
 .pdf-titel h1{font-size:15pt;font-weight:800;margin:0;line-height:1.18;letter-spacing:-.01em;color:#17202a;
  word-break:break-word}
 .pdf-projekt{margin-top:1.5mm;font-size:8.5pt;color:#3d4850;word-break:break-word}
 .pdf-info{margin-top:3.5mm;font-size:8pt;color:#17202a;line-height:1.55}
 .pdf-info span{display:inline-block;min-width:24mm;color:#6b757c}
 .pdf-trenner{border-top:.75pt solid #a7b1b8;margin:4.5mm 0 5mm}
 /* Abschnitte */
 .eb-section-head,.am-section-head{background:#17202a;color:#fff;font-size:6.9pt;font-weight:800;
  text-transform:uppercase;letter-spacing:.11em;padding:1.6mm 2.4mm;margin:5mm 0 0;
  page-break-after:avoid;break-after:avoid}
 .eb-section-head:first-of-type,.am-section-head:first-of-type{margin-top:0}
 /* Angaben-Raster */
 .eb-info-table,.am-info-table{width:100%;border-collapse:collapse;border:.5pt solid #b3bcc2;
  border-top:0;table-layout:fixed;page-break-inside:avoid;break-inside:avoid}
 .eb-info-table td,.am-info-table td{border-right:.5pt solid #cfd6db;border-bottom:.5pt solid #cfd6db;
  padding:1.7mm 2.4mm;vertical-align:top}
 .eb-info-table tr td:last-child,.am-info-table tr td:last-child{border-right:0}
 .eb-info-table tr:last-child td,.am-info-table tr:last-child td{border-bottom:0}
 .eb-info-table label,.am-info-table label{display:block;font-size:5.6pt;font-weight:700;
  text-transform:uppercase;letter-spacing:.07em;color:#6b757c;margin:0 0 .6mm}
 .eb-info-table .val,.am-info-table .val{font-size:8pt;font-weight:700;color:#17202a;
  font-variant-numeric:tabular-nums;word-break:break-word}
 /* Technische Tabellen */
 table.eb-cutlist,table.am-cutlist{width:100%;border-collapse:collapse;margin:0;
  border:.5pt solid #b3bcc2;border-top:0}
 .eb-cutlist thead,.am-cutlist thead{display:table-header-group}
 .eb-cutlist tr,.am-cutlist tr{page-break-inside:avoid;break-inside:avoid}
 .eb-cutlist th,.am-cutlist th{background:#e9edf0;color:#17202a;text-align:left;font-size:6.5pt;
  font-weight:800;padding:1.6mm 2.2mm;text-transform:uppercase;letter-spacing:.05em;
  border-bottom:.5pt solid #9aa4ab;border-right:.5pt solid #cfd6db}
 .eb-cutlist td,.am-cutlist td{padding:1.5mm 2.2mm;border-bottom:.5pt solid #dde3e7;
  border-right:.5pt solid #eef1f3;font-size:8pt;font-variant-numeric:tabular-nums;vertical-align:top}
 .eb-cutlist th:last-child,.am-cutlist th:last-child,
 .eb-cutlist td:last-child,.am-cutlist td:last-child{border-right:0}
 .eb-cutlist tbody tr:nth-child(even) td,.am-cutlist tbody tr:nth-child(even) td{background:#f7f9fa}
 .eb-cutlist tbody tr:last-child td,.am-cutlist tbody tr:last-child td{border-bottom:0}
 .eb-cutlist th.r,.eb-cutlist td.r,.am-cutlist th.r,.am-cutlist td.r{text-align:right;
  white-space:nowrap;width:1%}
 .eb-cutlist td.warn{color:#17202a;font-weight:800}
 .am-cutlist tfoot td{border-top:1pt solid #17202a;padding:1.8mm 2.2mm;font-size:8.5pt;font-weight:800}
 /* Zeichnungen */
 /* Seitlicher Freiraum: einzelne Zeichnungen setzen Beschriftungen bis an
    den Rand ihrer viewBox - ohne diesen Abstand wuerde ein Text am
    Blattrand abgeschnitten. Die Zeichnungen selbst bleiben unveraendert. */
 .eb-diagram{text-align:center;margin:3mm 0 0;padding:0 5mm;page-break-inside:avoid;break-inside:avoid}
 .eb-diagram svg{max-width:100%;max-height:95mm;width:auto;height:auto}
 .eb-diagram-row{display:flex;justify-content:center;align-items:flex-start;gap:8mm;margin:3mm 0 0;
  page-break-inside:avoid;break-inside:avoid}
 .eb-diagram-row .eb-diagram{flex:1;min-width:0;margin:0;padding:0 2mm}
 .eb-diagram-title{font-size:6.4pt;font-weight:700;color:#6b757c;text-transform:uppercase;
  letter-spacing:.07em;margin-bottom:1.6mm}
 .eb-diagram-row svg{max-width:100%!important;max-height:72mm;width:auto;height:auto}
 /* Kehle: b/c/d bleiben deutlich hervorgehoben, aber schwarz/weiss tauglich */
 .kehle-print-haupt{border:1.2pt solid #17202a;border-top:0;padding:2.5mm 3mm;margin:0;
  page-break-inside:avoid;break-inside:avoid}
 .kehle-print-haupt div{display:flex;align-items:baseline;gap:3mm;padding:1.4mm 0;
  border-top:.5pt solid #dde3e7}
 .kehle-print-haupt div:first-child{border-top:0}
 .kehle-print-haupt .bu{font-size:12pt;font-weight:800;width:6mm;flex:0 0 6mm}
 .kehle-print-haupt .wert{font-size:15pt;font-weight:800;width:24mm;flex:0 0 24mm;text-align:right;
  font-variant-numeric:tabular-nums}
 .kehle-print-haupt .txt{font-size:7.4pt;color:#5b666e;flex:1 1 auto;min-width:0}
 /* Notiz */
 .note{font-size:8pt;white-space:pre-wrap;margin:3mm 0 0;padding:2mm 2.6mm;
  border-left:2pt solid #b3bcc2;background:#f7f9fa;page-break-inside:avoid;break-inside:avoid}
 /* Fotos und Skizzen: nie verzerrt, nie abgeschnitten */
 .pdf-bild{margin:3mm 0 0;text-align:center;page-break-inside:avoid;break-inside:avoid}
 .pdf-bild img{max-width:100%;height:auto;display:block;margin:0 auto;border:.5pt solid #cfd6db}
 .pdf-bild .pdf-bild-titel{font-size:6.4pt;font-weight:700;color:#6b757c;text-transform:uppercase;
  letter-spacing:.07em;margin-bottom:1.6mm}
 img.photo{max-height:150mm;width:auto}
 img.sketch{max-height:225mm;width:auto}
 .sketch-page{page-break-before:always;break-before:page}
 /* Fusszeile */
 .pdf-foot{position:fixed;left:0;right:0;bottom:0;font-size:6.2pt;color:#7b858c;text-align:center;
  padding-top:1.2mm;border-top:.5pt solid #d9e0e4;background:#fff}`;

async function printMeasurement(m){
 const proj=allProjects.find(p=>p.id===m.project_id);
 const typeLabels=MEAS_TYPE_LABELS;
 // window.open() muss synchron im Klick-Handler passieren, sonst blockiert
 // der Browser das Popup – deshalb ganz am Anfang, vor jedem await.
 const win=window.open("","_blank");
 if(!win){alert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return}
 // Bucket ist privat: Firmenlogo sowie Foto/Skizzen (nur beim Typ
 // "skizze_foto") brauchen eine signierte URL statt des gespeicherten Pfads.
 const logoSrc=await storageSignedUrl(logoUrl);
 // Seit v2.70 kann JEDE Art Fotos und Skizzen haben.
 const photoSrc=await storageSignedUrl(m.photo_path);
 const sketchQuellen=(m.sketch_paths&&m.sketch_paths.length)?m.sketch_paths:(m.sketch_path?[m.sketch_path]:[]);
 const sketchSrcs=(await Promise.all(sketchQuellen.map(storageSignedUrl))).filter(Boolean);
 // Gemeinsamer Anhang fuer alle Fach-Arten: Foto im Fluss, jede Skizze auf
 // einer eigenen Seite - dieselbe Darstellung wie bei "Skizze / Foto".
 const medienHtml=(photoSrc||sketchSrcs.length)?`
${photoSrc?`<div class="eb-section-head">Foto</div>
<div class="pdf-bild"><img class="photo" src="${esc(photoSrc)}"></div>`:""}
${sketchSrcs.map((s2,i)=>`<div class="sketch-page"><div class="eb-section-head">Skizze${sketchSrcs.length>1?` ${i+1} von ${sketchSrcs.length}`:""}</div>
<div class="pdf-bild"><img class="sketch" src="${esc(s2)}"></div></div>`).join("")}`:"";
 const sachbearbeiter=esc(currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"–");
 const cell2=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
 // Exakt derselbe zentrale Kopf wie beim jeweils anderen Dokumenttyp
 // (pdfKopfHtml, js/16) - nur Dokumenttyp und Unterart unterscheiden sich.
 const kopfHtml=pdfKopfHtml({
  datensatz:m,projekt:proj,bezeichnung:m.title,
  dokumenttyp:"Massaufnahme",unterart:typeLabels[m.type]||m.type,
  datum:m.date||"",
  bearbeiter:currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"",
  logoSrc
 });

 let bodyHtml;
 if(m.type==="einlaufblech_gerade"){
  const d=m.data||{};
  const pieces=d.pieces||[];
  const engeSeite=d.engeSeite||"rechts";
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Abwicklung",esc(d.abwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Dachneigung / Winkel",esc(d.winkel||0)+"°")}${cell("Montage",'von '+esc(d.montage||"–")+` (eng ${esc(engeSeite)})`)}</tr>
<tr>${cell("Mass A",esc(d.massAEng||0)+` mm eng ${esc(engeSeite)} (${esc(d.massA||0)} mm)`)}${cell("Anzahl Stück",esc((pieces&&pieces.length)||0))}</tr>
<tr>${cell("Material",matName)}${d.flaeche_m2?cell("Blechfläche",esc(String(d.flaeche_m2).replace(".",","))+" m²"):"<td></td>"}</tr>
${d.gava&&d.gava.aktiv?`<tr>${cell("Haltebleche (GAVA)",esc(d.gava.gerechnet??"–")+" Stk."+(d.gava.abstand_mm?" à "+esc(d.gava.abstand_mm)+" mm":""))}<td></td></tr>`:""}
</table>
<div class="eb-diagram-row">
 <div class="eb-diagram">
  <div class="eb-diagram-title">Schnittskizze</div>
  ${einlaufblechDiagramSvg(d.winkel,d.massA,d.restBreite,einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten)}
 </div>
 <div class="eb-diagram">
  <div class="eb-diagram-title">Grundriss</div>
  ${generateEbkGrundriss(pieces)}
 </div>
</div>
${Array.isArray(d.ausmass)&&d.ausmass.length?`<div class="eb-section-head">Ausmass</div>
<table class="eb-cutlist">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th></tr></thead>
<tbody>${d.ausmass.map(z=>`<tr><td>${esc(z.pos)}</td><td>${esc(z.bezeichnung)}</td><td>${esc(z.menge)}</td><td>${esc(z.einheit)}</td></tr>`).join("")}</tbody>
</table>`:""}
<div class="eb-section-head">Stücke</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Zuschnittlänge (mm)</th><th>Ger. L</th><th>Ger. R</th></tr></thead>
<tbody>${pieces.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.laenge||0)}</td><td>${p.gehrungLinks?"Ja":"–"}</td><td>${p.gehrungRechts?"Ja":"–"}</td></tr>`).join("")}</tbody>
</table>
${(()=>{
 // Der beim Speichern abgelegte Rollenplan, bewusst NICHT neu gerechnet: ein
 // einmal gedrucktes Blatt soll gleich bleiben, auch wenn die Rollenbreiten
 // der Firma später geändert werden.
 const r=d.rollen;
 if(!r||!Array.isArray(r.moeglich)||!r.moeglich.length)return "";
 const zeilen=r.moeglich.map((x,i)=>`<tr><td>${esc(x.breite)} mm${i===0?" (beste)":""}</td><td>${esc(x.jeTafel)}</td><td>${esc(x.tafeln)}</td><td>${esc(Number(x.flaeche).toFixed(2).replace(".",","))}</td><td>${esc(Number(x.verschnitt).toFixed(2).replace(".",","))}</td></tr>`).join("");
 const streifen=(r.streifen||[]).map((sf,i)=>`<tr><td>${i+1}</td><td>${esc(sf.stuecke.map(x=>"Stück "+x.nr+" · "+x.laenge+" mm").join(", "))}</td><td>${esc(Math.round(Number(r.tafelLaenge)-Number(sf.rest)))}</td><td>${esc(Math.round(Number(sf.rest)))}</td></tr>`).join("");
 return `<div class="eb-section-head">Zuschnitt aus Rollenblech</div>
<div class="note">Tafellänge ${esc(r.tafelLaenge)} mm (längstes Stück), quer in Streifen der Abwicklungsbreite geteilt.${r.optimal===false?" Beste gefundene Verteilung – nicht nachweislich die günstigste.":""}</div>
<table class="eb-cutlist">
<thead><tr><th>Rollenbreite</th><th>Streifen je Tafel</th><th>Tafeln</th><th>Tafelfläche (m²)</th><th>Verschnitt (m²)</th></tr></thead>
<tbody>${zeilen}</tbody>
</table>
${streifen?`<table class="eb-cutlist">
<thead><tr><th>Streifen</th><th>Stücke</th><th>belegt (mm)</th><th>Rest (mm)</th></tr></thead>
<tbody>${streifen}</tbody>
</table>`:""}`;
})()}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="rinne_halbrund"){
  const d=m.data||{};
  const segs=d.segments||[];
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const fittingLabel=id=>{const f=rinneFittingTypes.find(x=>x.id===Number(id));return f?`${f.symbol?f.symbol+" – ":""}${f.name}`:"–"};
  const dilas=d.dilas||[];
  const matTab=rinneMaterialTabelle(d.material);
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Rinnengrösse",esc(d.groesse||d.rinneAbwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Material",esc(matTab.label))}${cell("Dilatationselemente",dilas.length?esc(dilas.length)+" Stück"+(d.dilasManuell?" (von Hand)":""):"Keine nötig")}
${d.halter?cell("Rinnenhalter",esc(Math.round(Number(d.halter.anzahl!=null&&d.halter.anzahl!==""?d.halter.anzahl:(Number(d.gesamtlaenge||0)>0&&Number(d.halter.abstand_mm)>0?Math.floor(Number(d.gesamtlaenge)/Number(d.halter.abstand_mm))+1:0))||0))+" Stk."+(d.halter.abstand_mm?" à "+esc(d.halter.abstand_mm)+" mm":"")):"<td></td>"}</tr>
${d.rinnenboden?`<tr>${cell("Rinnenboden links",d.rinnenboden.links?"ja":"nein")}${cell("Rinnenboden rechts",d.rinnenboden.rechts?"ja":"nein")}<td></td></tr>`:""}
</table>
${Array.isArray(d.ausmass)&&d.ausmass.length?`<div class="eb-section-head">Ausmass</div>
<table class="eb-cutlist">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th></tr></thead>
<tbody>${d.ausmass.map(z=>`<tr><td>${esc(z.pos)}</td><td>${esc(z.bezeichnung)}</td><td>${esc(z.menge)}</td><td>${esc(z.einheit)}</td></tr>`).join("")}</tbody>
</table>`:""}
<div class="eb-section-head">Grundriss</div>
<div class="eb-diagram">${generateRinneGrundriss(segs,dilas,d.boundaries||[])}</div>
<div class="eb-section-head">Dilatationselemente</div>
${(()=>{
 if(!segs.length)return '<div class="note">Keine Segmente vorhanden.</div>';
 // Beim Speichern abgelegte Stückliste bevorzugen – so bleibt ein einmal
 // gedrucktes PDF unverändert, auch wenn Masse später angepasst werden.
 const stuecke=(Array.isArray(d.stueckliste)&&d.stueckliste.length)
  ? d.stueckliste
  : berechneRinneStueckliste(segs,dilas,d.boundaries||[],d.dilaMass!==undefined?d.dilaMass:rinneDilaMass);
 const zeilen=stuecke.map(st=>`<tr><td>${st.nr}</td><td>${esc(st.von)} → ${esc(st.bis)}</td><td>${Math.round(st.abstand)}</td><td>${Math.round(st.zuschnitt)}</td><td>${Math.round(st.pos)}</td></tr>`);
 return `<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th><th>Position ab Start (mm)</th></tr></thead>
<tbody>${zeilen.join("")}</tbody>
</table>`;
})()}
<div class="eb-section-head">Segmente</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Links</th><th>Rechts</th><th>Winkel (°)</th><th>Zuschnitt (mm)</th></tr></thead>
<tbody>${segs.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.laenge||0)}</td><td>${esc(fittingLabel(s.linksTyp))}</td><td>${esc(fittingLabel(s.rechtsTyp))}</td><td>${esc(s.winkel??0)}</td><td>${esc(s.zuschnittlaenge??calcRinneSegment(s))}</td></tr>`).join("")}</tbody>
</table>
${(()=>{
 // Normlängen und Verschnitt aus dem gespeicherten Plan. Bewusst NICHT neu
 // gerechnet: ein einmal gedrucktes Blatt soll gleich bleiben, auch wenn
 // die Normlängen der Firma später geändert werden.
 const np=d.normplan;
 if(!np||!Array.isArray(np.stangen)||!np.stangen.length)return "";
 const nachL={};
 np.stangen.forEach(x=>{nachL[x.laenge]=(nachL[x.laenge]||0)+1});
 const bedarf=Object.keys(nachL).map(Number).sort((x,y)=>y-x)
  .map(l=>`${nachL[l]} × ${(l/1000).toFixed(2)} m`).join(" · ");
 return `<div class="eb-section-head">Normlängen und Verschnitt</div>
<table class="eb-cutlist">
<thead><tr><th>Stange</th><th>Normlänge</th><th>Zuschnitte (mm)</th><th>Rest (mm)</th></tr></thead>
<tbody>${np.stangen.map((x,i)=>`<tr><td>${i+1}</td><td>${(Number(x.laenge)/1000).toFixed(2)} m</td>`
 +`<td>${(x.stuecke||[]).map(v=>esc(Math.round(v))).join(" + ")||"–"}</td>`
 +`<td>${esc(Math.round(x.rest||0))}</td></tr>`).join("")}</tbody>
</table>
<div class="note">Bedarf: ${esc(bedarf)} · Verschnitt ${esc(Math.round(np.verschnitt||0))} mm von ${esc(Math.round(np.gesamt||0))} mm.
${np.optimal?"Kombination mit dem geringsten Materialeinsatz."
  :"Beste gefundene Kombination – nicht jede Möglichkeit wurde durchgerechnet."}
${(np.zuLang||[]).length?` ACHTUNG: ${np.zuLang.length} Zuschnitt(e) sind länger als die längste Normlänge und im Plan nicht enthalten.`:""}</div>`;
})()}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="mauerabdeckung"){
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const d=m.data||{};
  const segs=d.segments||[];
  const tab=madMaterialTabelle(d.material);
  const stuecke=(Array.isArray(d.stueckliste)&&d.stueckliste.length)
   ? d.stueckliste
   : berechneMadStueckliste(segs,d.schieber||[],d.boundaries||[],d.bodenMass??madBodenMass,d.schieberMass??madSchieberMass);
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Material",esc(tab.label))}${cell("Gesamtlänge",esc(Math.round(d.gesamtlaenge||0))+" mm")}<td></td></tr>
<tr>${cell("Abwicklung",esc(d.abwicklung||0)+" mm")}${cell("Schieber",(d.schieber||[]).length?esc((d.schieber||[]).length)+" Stück":"Keine nötig")}</tr>
<tr>${(()=>{const pr=d.profil||{};const vg=(typeof madBiegeVorgabe==="function")?madBiegeVorgabe(pr.gef||0):{links:90,rechts:90};return cell("Biegewinkel links",esc(pr.wL??vg.links)+"°")+cell("Biegewinkel rechts",esc(pr.wR??vg.rechts)+"°");})()}</tr>
</table>
<div class="eb-section-head">Profil (Querschnitt)</div>
<div class="eb-diagram">${madProfilSvgAus(d.profil)}</div>
<div class="eb-section-head">Grundriss</div>
<div class="eb-diagram">${generateRinneGrundriss(segs,d.schieber||[],d.boundaries||[],{anfang:!!(segs[0]&&segs[0].bodenLinks),ende:!!(segs[segs.length-1]&&segs[segs.length-1].bodenRechts)})}</div>
<div class="eb-section-head">Segmente</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th><th>Boden Anfang</th><th>Boden Ende</th></tr></thead>
<tbody>${segs.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.laenge||0)}</td><td>${esc(s.winkel??0)}</td><td>${s.bodenLinks?"ja":"–"}</td><td>${s.bodenRechts?"ja":"–"}</td></tr>`).join("")}</tbody>
</table>
<div class="eb-section-head">Schieber und Zuschnitt</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th></tr></thead>
<tbody>${stuecke.map(st=>`<tr><td>${st.nr}</td><td>${esc(st.von)} → ${esc(st.bis)}</td><td>${Math.round(st.abstand)}</td><td>${Math.round(st.zuschnitt)}</td></tr>`).join("")}</tbody>
</table>
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="lukarne"){
  const d=m.data||{};
  const g=berechneLukarne({hoehe:d.hoehe,laengeOben:d.laengeOben,winkel:d.winkel,
   achsabstand:d.achsabstand,hilfsrissWunsch:d.hilfsrissWunsch!==undefined?d.hilfsrissWunsch:d.hilfsriss,
   seite:d.seite,zugabeLaenge:d.zugabeLaenge,zugabeBreite:d.zugabeBreite});
  const scharen=(Array.isArray(d.scharen)&&d.scharen.length)?d.scharen:(g?g.scharen:[]);
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const zugabeTxt=(d.zugabeBreite||d.zugabeLaenge)
   ? `${esc(Math.round(d.zugabeBreite||0))} mm Breite / ${esc(Math.round(d.zugabeLaenge||0))} mm Länge`
   : "keine";
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Seite",d.seite==="links"?"Linke Seite":"Rechte Seite")}${cell("Anzahl Scharen",esc(d.anzahl||scharen.length||0))}</tr>
<tr>${cell("Vordere Höhe H",esc(Math.round(d.hoehe||0))+" mm")}${cell("Obere Länge L",esc(Math.round(d.laengeOben||0))+" mm")}</tr>
<tr>${cell("Oberer Innenwinkel",esc(d.winkel||0)+"°")}${cell("Schräge A (Dach)",esc(Math.round(d.schraege||0))+" mm")}</tr>
<tr>${cell("Waagerechte Breite",esc(Math.round(d.breite||0))+" mm")}${cell("Achsabstand Scharen",esc(Math.round(d.achsabstand||0))+" mm")}</tr>
<tr>${cell("Hilfsriss unter Oberkante",esc(Math.round(d.hilfsriss||0))+" mm")}${cell("Fläche",esc((Math.round((d.flaeche||0)*100)/100).toFixed(2))+" m²")}</tr>
<tr>${cell("Zugabe Zuschnitt",zugabeTxt)}${cell("Letzte Schar (Restbreite)",esc(Math.round(scharen.length?scharen[scharen.length-1].breite:0))+" mm")}</tr>
<tr>${cell("Material",matName)}<td></td></tr>
</table>
<div class="eb-section-head">Plan</div>
<div class="eb-diagram">${lukPlanSvg(g,{fuerDruck:true})}</div>
<div class="eb-section-head">Scharen</div>
<table class="eb-cutlist">
<thead><tr><th rowspan="2">Pos.</th><th colspan="3">Linke Kante</th><th colspan="3">Rechte Kante</th><th rowspan="2">Zuschnitt B &#215; L</th></tr><tr><th>&#8593; ab HR</th><th>&#8595; ab HR</th><th>H&#246;he</th><th>&#8593; ab HR</th><th>&#8595; ab HR</th><th>H&#246;he</th></tr></thead>
<tbody>${lukScharenZeilen(scharen,d.seite)}</tbody>
</table>
<div class="note" style="font-size:8pt;color:#68737d">Alle Masse in mm. &#8593; / &#8595; = Mass ab Hilfsriss (HR) nach oben bzw. nach unten, &#8222;H&#246;he&#8220; = ganze Scharkante. Links und rechts wie im Plan; bei der linken Wange liegt die Front rechts.</div>
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="anschlussblech"){
  const d=m.data||{};
  const erg=berechneAnschlussblech(d);
  const teile=(Array.isArray(d.teile)&&d.teile.length)?d.teile:(erg?erg.teile:[]);
  // Beim Speichern abgelegte Stückliste bevorzugen – ein einmal gedrucktes
  // PDF bleibt dadurch gleich, auch wenn später ein Mass geändert wird.
  const stuecke=(Array.isArray(d.stueckliste)&&d.stueckliste.length)?d.stueckliste:(erg?erg.stuecke:[]);
  const abw=d.abwicklung||(erg?erg.abwicklung:0);
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const deckName=(ANB_DECKUNGEN[d.deckung]||{}).name||"–";
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  const massZeilen=Object.keys((ANB_ARTEN[d.art]||{masse:{}}).masse)
   .map(k=>`<tr><td>${esc(k)}</td><td>${esc(ANB_ARTEN[d.art].masse[k].text||"")}</td><td>${esc(Math.round(Number(d[k])||0))} mm</td><td>${(()=>{const mi=anbMindestmass(d.art,k,d.deckung);return mi!==null?"mind. "+mi+" mm":"–"})()}</td></tr>`).join("");
  const segmente=Array.isArray(d.segmente)?d.segmente:[];
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Anschluss",esc(anbTitel(d)))}${cell("Deckmaterial",esc(deckName))}</tr>
<tr>${cell("Zuschnittbreite",esc(Math.round(abw))+" mm")}${cell("Gesamtlänge",esc(Math.round(d.laenge||0))+" mm")}</tr>
<tr>${cell("Material",matName)}<td></td></tr>
</table>
<div class="eb-section-head">Schnitt</div>
<div class="eb-diagram">${anbZeichnung(d)}</div>
${segmente.length?`<div class="eb-section-head">Segmente</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Segmentlänge (mm)</th><th>Knick</th></tr></thead>
<tbody>${segmente.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(Math.round(s.laenge||0))}</td><td>${s.knick?`${esc(s.knickWinkel||0)}° · ${esc(Math.round(s.knickMass||0))} mm ab Vorderkante`:"–"}</td></tr>`).join("")}</tbody>
</table>`:""}
<div class="eb-section-head">Masse</div>
<table class="eb-cutlist">
<thead><tr><th>Mass</th><th>Bedeutung</th><th>Wert</th><th>Vorgabe</th></tr></thead>
<tbody>${massZeilen}
<tr><td>–</td><td>${d.ausfuehrung==="ort"?"Aufkantung über Dach":"Aufkantung an der Wand"}</td><td>${esc(Math.round(d.ausfuehrung==="ort"?(d.ortAufkantung||0):(d.wandAufkantung||0)))} mm</td><td>–</td></tr>
<tr><td>–</td><td>Umschlag am Blechende</td><td>${esc(Math.round(d.saum||0))} mm</td><td>–</td></tr>
</tbody>
</table>
<div class="eb-section-head">Abwicklung</div>
<table class="eb-cutlist">
<thead><tr><th>Teil</th><th>Abwicklung (mm)</th></tr></thead>
<tbody>${teile.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(Math.round(t.abwicklung))}</td></tr>`).join("")}</tbody>
</table>
${(erg&&erg.ohneZuschnitt&&erg.ohneZuschnitt.length)?`<div class="note">${erg.ohneZuschnitt.map(n=>esc(n)).join(" und ")} nicht im Zuschnitt enthalten – eigenes Material.</div>`:""}
${(erg&&erg.anzahlBleilappen!==null)?`<div class="note"><b>Anzahl Bleilappen:</b> ${esc(erg.anzahlBleilappen)} (Lattenabstand ${esc(Math.round(d.lattenabstand||0))} mm)</div>`:""}
${stuecke.length?`<div class="eb-section-head">Stückliste</div>
<table class="eb-cutlist">
<thead><tr><th>Stück</th><th>Zuschnitt Länge (mm)</th><th>Zuschnitt Breite (mm)</th></tr></thead>
<tbody>${stuecke.map(s=>`<tr><td>${esc(s.nr)}${s.gehrung?" · First":""}</td><td>${esc(Math.round(s.laenge))}</td><td>${esc(Math.round(abw))}</td></tr>`).join("")}</tbody>
</table>
${(()=>{const l=stuecke[stuecke.length-1];return (l&&l.gehrung)?`<div class="note">Endstück mit Firstgehrung: ${esc(Math.round(l.laengeOhneGehrung))} mm plus ${esc(Math.round(l.laenge-l.laengeOhneGehrung))} mm Gehrungszugabe.</div>`:""})()}`:""}
${(erg&&erg.warnungen.length)?`<div class="note" style="color:#b42318">${erg.warnungen.map(w=>esc(w)).join("<br>")}</div>`:""}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="einfassung_rund"){
  const d=m.data||{};
  const erg=einfBerechnen(d);
  const abw=d.abwicklung||(erg?erg.abwicklung:0);
  const breiteGesamt=d.breiteGesamt!==undefined&&d.breiteGesamt!==null?d.breiteGesamt:(erg?erg.breiteGesamt:null);
  const anzahlBleilappen=d.anzahlBleilappen!==undefined&&d.anzahlBleilappen!==null?d.anzahlBleilappen:(erg?erg.anzahlBleilappen:null);
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const deckName=(EINF_DECKUNGEN[d.deckung]||{}).name||"–";
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Eindeckungsart",esc(deckName))}${cell("&Oslash; Standrohr",esc(Math.round(d.durchmesser||0))+" mm")}</tr>
<tr>${cell("Winkel / Dachneigung",esc(d.winkel||0)+"°")}${cell("Material",matName)}</tr>
<tr>${cell("Zuschnittbreite (Querschnitt)",esc(Math.round(abw))+" mm")}${cell("Breite der gesamten Einfassung",breiteGesamt?esc(Math.round(breiteGesamt))+" mm":"–")}</tr>
<tr>${cell("Anzahl Bleilappen",anzahlBleilappen!==null?esc(anzahlBleilappen):"–")}${cell("Lattenabstand",esc(Math.round(d.lattenabstand||0))+" mm")}</tr>
</table>
<div class="eb-section-head">Schnitt</div>
<div class="eb-diagram">${einfZeichnung(d)}</div>
<div class="eb-section-head">Masse</div>
<table class="eb-cutlist">
<thead><tr><th>Mass</th><th>Bedeutung</th><th>Wert</th></tr></thead>
<tbody>
<tr><td>a</td><td>Vorne auf Deckmaterial bis Mitte Rohr</td><td>${esc(Math.round(d.a||0))} mm</td></tr>
<tr><td>b</td><td>Ab Mitte Rohr bis hinten, unter Deckmaterial</td><td>${esc(Math.round(d.b||0))} mm</td></tr>
<tr><td>c</td><td>Aufbug 90°, oben Umschlag 135°</td><td>${esc(Math.round(d.c||0))} mm</td></tr>
</tbody>
</table>
${(erg&&erg.warnungen.length)?`<div class="note" style="color:#b42318">${erg.warnungen.map(w=>esc(w)).join("<br>")}</div>`:""}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="einlaufblech_konisch"){
  const d=m.data||{};
  const pieces=d.pieces||[];
  const engeSeite=d.engeSeite||"rechts";
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const masseEngeSeite=pieces.map(p=>Number(engeSeite==="links"?p.massLinks:p.massRechts)||0).filter(v=>v>0);
  const repMass=masseEngeSeite.length?masseEngeSeite.reduce((a,b)=>a+b,0)/masseEngeSeite.length:null;
  const restBreite=repMass?(Number(d.abwicklung)-repMass-(Number(einlaufblechKonischSettings.umschlag_oben)||0)-(Number(einlaufblechKonischSettings.umschlag_unten)||0)):null;
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Abwicklung",esc(d.abwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Dachneigung / Winkel",esc(d.dachneigung||0)+"°")}${cell("Montage",'von '+esc(d.montage||"–")+` (eng ${esc(engeSeite)})`)}</tr>
<tr>${cell("Material",matName)}<td></td></tr>
</table>
<div class="eb-diagram-row">
 <div class="eb-diagram">
  <div class="eb-diagram-title">Schnittskizze</div>
  ${einlaufblechDiagramSvg(d.dachneigung,repMass,restBreite,einlaufblechKonischSettings.umschlag_oben,einlaufblechKonischSettings.umschlag_unten)}
 </div>
 <div class="eb-diagram">
  <div class="eb-diagram-title">Grundriss</div>
  ${generateEbkGrundriss(pieces)}
 </div>
</div>
<div class="eb-section-head">Stücke</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Zuschnittlänge (mm)</th><th>Ger. L</th><th>Ger. R</th><th>Mass links (mm)</th><th>Mass rechts (mm)</th></tr></thead>
<tbody>${pieces.map((p,i)=>{
 const warn=ebkRestbreite(engeSeite==="links"?p.massLinks:p.massRechts,d.abwicklung)<0;
 const linksTxt=engeSeite==="links"?`${esc(p.massLinksEng??0)} (${esc(p.massLinks||0)})`:esc(p.massLinks||0);
 const rechtsTxt=engeSeite==="rechts"?`${esc(p.massRechtsEng??0)} (${esc(p.massRechts||0)})`:esc(p.massRechts||0);
 return `<tr><td>${i+1}</td><td>${esc(p.laenge||0)}</td><td>${p.gehrungLinks?"Ja":"–"}</td><td>${p.gehrungRechts?"Ja":"–"}</td><td${warn&&engeSeite==="links"?' class="warn"':""}>${linksTxt}${warn&&engeSeite==="links"?" ⚠️":""}</td><td${warn&&engeSeite==="rechts"?' class="warn"':""}>${rechtsTxt}${warn&&engeSeite==="rechts"?" ⚠️":""}</td></tr>`;
}).join("")}</tbody>
</table>
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="freies_profil"){
  const d=m.data||{};
  const schenkel=d.schenkel||[];
  const segmente=d.segmente||[];
  const konisch=!!d.konisch;
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const matName=esc((findMeasurementMaterial(d.material)||{}).name||"–");
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Anzahl Schenkel",esc(schenkel.length))}${cell("Konisch",konisch?"Ja":"Nein")}</tr>
<tr>${cell("Material",matName)}<td></td></tr>
</table>
<div class="eb-section-head">Profil</div>
<div class="eb-diagram">${generateProfilDiagramSvg(schenkel)}</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th></tr></thead>
<tbody>${schenkel.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.laenge||0)}</td><td>${esc(s.winkel||0)}</td></tr>`).join("")}</tbody>
</table>
<div class="eb-section-head">Segmente</div>
${segmente.map((seg,i)=>`<div style="margin-top:3mm">
<b>Segment ${i+1}</b> · Länge ${esc(seg.laenge||0)} mm
<table class="eb-cutlist">
<thead><tr><th>Schenkel</th>${konisch?"<th>Mass links (mm)</th><th>Mass rechts (mm)</th>":"<th>Mass (mm)</th>"}</tr></thead>
<tbody>${schenkel.map((s,j)=>{
 const mm=(seg.massen&&seg.massen[j])||{};
 return konisch?`<tr><td>${j+1}</td><td>${esc(mm.links||0)}</td><td>${esc(mm.rechts||0)}</td></tr>`:`<tr><td>${j+1}</td><td>${esc(mm.mass||0)}</td></tr>`;
}).join("")}</tbody>
</table>
</div>`).join("")}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="rinne"){
  // Nutzt den zentralen PDF-Kopf und die bestehenden Drucktabellen.
  // Gerechnet wird nur mit den im Datensatz gespeicherten Werten,
  // damit ein spaeter gedrucktes PDF unveraendert bleibt.
  const d=m.data||{};
  const w=rinneWerte(d);
  const varListe=rinneVariable(w.profil);
  const fix=rinneFixSumme(w.profil);
  const stuecke=Array.isArray(d.stuecke)?d.stuecke:[];
  const matName=(findMeasurementMaterial(d.material)||{}).name;
  const mm=v=>{const n=Number(v);return Number.isFinite(n)?(Math.round(n*10)/10).toLocaleString("de-CH"):"\u2013"};
  const seiteText=q=>{
   const l=Array.isArray(q)?q:(q?[q.a,q.b,q.c]:[]);
   return varListe.length?varListe.map((v,j)=>mm(l[j])).join(" / "):"\u2013";
  };
  const wert=st=>{
   // Gespeicherte Ergebnisse bevorzugen, sonst aus dem mitgespeicherten
   // Profil neu rechnen (aeltere Datensaetze ohne Ergebnisfelder).
   const g=rinneStueckRechnen(st,w);
   return {
    l:st.abwicklungLinks!==undefined&&st.abwicklungLinks!==null?st.abwicklungLinks:g.abwicklungLinks,
    r:st.abwicklungRechts!==undefined&&st.abwicklungRechts!==null?st.abwicklungRechts:g.abwicklungRechts,
    z:st.zuschnitt!==undefined&&st.zuschnitt!==null?st.zuschnitt:g.zuschnitt
   };
  };
  const summeZuschnitt=stuecke.reduce((s2,st)=>s2+Number(wert(st).z||0),0);
  const erstes=stuecke[0];
  const skizze=rinneSvg(w.profil,erstes?erstes.links:null,null);
  const kopfMasse=varListe.length?varListe.map(v=>v.buchstabe).join(" / "):"\u2013";
  const formel=(varListe.length?varListe.map(v=>v.buchstabe).join(" + ")+" + ":"")+mm(fix)+" mm";
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell2("Material",esc(matName||"\u2013"))}${cell2("Fixmasse gesamt",esc(mm(fix)+" mm"))}</tr>
<tr>${cell2("Variable Masse",esc(kopfMasse))}${cell2("Abwicklung",esc(formel))}</tr>
<tr>${cell2("St\u00fccke",esc(String(stuecke.length)))}<td></td></tr>
</table>
<div class="eb-section-head">Profil</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Art</th><th>L\u00e4nge</th><th>Winkel</th></tr></thead>
<tbody>${w.profil.map((seg,i)=>{
 const v=varListe.find(x=>x.index===i);
 return `<tr><td>${v?esc(v.buchstabe):(i+1)}</td><td>${esc(seg.name||"")}</td>`
  +`<td>${v?"variabel":"fix"}</td><td>${v?"je St\u00fcck":esc(mm(seg.laenge))}</td>`
  +`<td>${esc(mm(seg.winkel))}\u00b0</td></tr>`;
}).join("")}</tbody>
</table>
<div class="eb-section-head">Profilskizze</div>
<div class="eb-diagram">${skizze}</div>
<div class="eb-section-head">Rinnenst\u00fccke</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Links${varListe.length?" "+esc(varListe.map(v=>v.buchstabe).join("/")):""}</th><th>L\u00e4nge M/M</th><th>Rechts${varListe.length?" "+esc(varListe.map(v=>v.buchstabe).join("/")):""}</th><th>Ansetzen L</th><th>Ansetzen R</th><th>Abw. L</th><th>Abw. R</th><th>Zuschnitt</th></tr></thead>
<tbody>${stuecke.map((st,i)=>{
 const g=wert(st);
 return `<tr><td>${i+1}</td><td>${esc(seiteText(st.links))}</td><td>${esc(mm(st.laenge))}</td><td>${esc(seiteText(st.rechts))}</td>`
  +`<td>${esc(RINNE_ANSETZ_LABELS[st.ansetzL]||st.ansetzL||"")}</td><td>${esc(RINNE_ANSETZ_LABELS[st.ansetzR]||st.ansetzR||"")}</td>`
  +`<td>${esc(mm(g.l))}</td><td>${esc(mm(g.r))}</td><td>${esc(mm(g.z))}</td></tr>`;
}).join("")}</tbody>
</table>
<table class="eb-info-table" style="margin-top:2mm">
<tr>${cell2("Zuschnittl\u00e4nge gesamt",esc(mm(summeZuschnitt)+" mm"))}<td></td></tr>
</table>
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="kehle"){
  // Ohne eigenen Zweig faende die Kehle in den allgemeinen Foto-Zweig
  // und wuerde ein Blatt ganz ohne Zahlen drucken. Deshalb hier eine
  // reine Ausgabe der bereits berechneten Werte - keine Aenderung an
  // einem der neun bestehenden Druckzweige.
  const d=m.data||{};
  const erg=kehleBerechnen(d);
  const wert=k=>{
   const v=(d[k]!==undefined&&d[k]!==null)?d[k]:(erg&&erg.ok?erg[k]:null);
   return esc(kehleWert(k,Number(v)));
  };
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  bodyHtml=`${kopfHtml}
<div class="eb-section-head">Eingaben</div>
<table class="eb-info-table">
<tr>${cell("Neigung Hauptdach (NH)",esc(d.nh!==undefined&&d.nh!==null?d.nh+"\u00b0":"\u2013"))}${cell("Neigung Lukarne (NL)",esc(d.nl!==undefined&&d.nl!==null?d.nl+"\u00b0":"\u2013"))}${cell("Gef\u00e4llsl\u00e4nge Lukarne (GL)",esc(d.gl!==undefined&&d.gl!==null?d.gl+" mm":"\u2013"))}</tr>
</table>
<div class="eb-section-head">Hauptresultate</div>
<div class="kehle-print-haupt">
${["b","c","d"].map(k=>`<div><span class="bu">${k}</span><span class="wert">${wert(k)}</span><span class="txt">${esc(KEHLE_LABELS[k])}</span></div>`).join("")}
</div>
<div class="eb-section-head">Weitere Resultate</div>
<table class="eb-cutlist">
<thead><tr><th style="width:10%">Zeichen</th><th>Bezeichnung</th><th style="width:22%">Wert</th></tr></thead>
<tbody>${["A","e","f","g","h","i","k","l","m","n","o","p"].map(k=>`<tr><td>${k}</td><td>${esc(KEHLE_LABELS[k])}</td><td>${wert(k)}</td></tr>`).join("")}</tbody>
</table>
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }else{
  const d=m.data||{};
  const matName=(findMeasurementMaterial(d.material)||{}).name;
  bodyHtml=`${kopfHtml}
${matName?`<div class="eb-section-head">Angaben</div>
<table class="eb-info-table"><tr>${cell2("Material",esc(matName))}<td></td></tr></table>`:""}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}`;
 }
 // Fotos und Skizzen haengen bei JEDER Art am Ende des Dokuments.
 bodyHtml+=medienHtml;

 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(pdfDateiname(proj?proj.name:"",proj?proj.object:"",typeLabels[m.type]||m.type,m.title))}</title>
<style>
${PDF_LAYOUT_CSS}
</style></head><body>
${pdfZahlenRechts(bodyHtml)}
${pdfFooterHtml(m)}
</body></html>`);
 win.document.close();
 const doPrint=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=doPrint;
 setTimeout(doPrint,800);
}

$("closeMeasurements").onclick=()=>{$("measurementsModal").hidden=true};
