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
 if(type==="einlaufblech_gerade")renderEbPiecesTable();
 if(type==="rinne_halbrund")renderRinneResult();
 if(type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 if(type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
 if(type==="mauerabdeckung")renderMadResult();
 if(type==="lukarne")renderLukResult();
 if(type==="anschlussblech")renderAnbResult();
 if(type==="einfassung_rund")renderEinfResult();
 if(type==="kehle")renderKehleResult();
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
  return {...base,photo_path:null,sketch_paths:[],data:{gesamtlaenge,massA,massAEng,winkel,montage,abwicklung,engeSeite,restBreite,pieces:ebPieces,material:$("eb_material").value}};
 }
 if(type==="rinne_halbrund"){
  const segmentsWithZuschnitt=rinneSegments.map(s=>({...s,zuschnittlaenge:calcRinneSegment(s)}));
  const gesamtlaenge=rinneSegments.reduce((s,seg)=>s+(Number(seg.laenge)||0),0);
  const material=$("rinne_material").value;
  const {boundaries}=computeRinneBoundaries(rinneSegments);
  // Stückliste mitspeichern, damit ein späterer Ausdruck dieselben Zahlen
  // zeigt, auch wenn Anschluss- oder Dila-Masse zwischenzeitlich geändert werden.
  const stueckliste=berechneRinneStueckliste(rinneSegments,rinneDilas,boundaries,rinneDilaMass);
  return {...base,photo_path:null,sketch_paths:[],data:{rinneAbwicklung:$("rinne_abwicklung").value,material,segments:segmentsWithZuschnitt,gesamtlaenge,dilas:rinneDilas,boundaries,stueckliste,dilaMass:rinneDilaMass}};
 }
 if(type==="einlaufblech_konisch"){
  const abwicklung=Number($("ebk_abwicklung").value);
  const dachneigung=Number($("ebk_dachneigung").value)||0;
  const montage=$("ebk_montage").value;
  const engeSeite=ebkEngeSeite();
  const gesamtlaenge=ebkPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
  const piecesWithEng=ebkPieces.map(p=>({...p,...calcEbkPiece(p)}));
  return {...base,photo_path:null,sketch_paths:[],data:{abwicklung,dachneigung,montage,engeSeite,pieces:piecesWithEng,gesamtlaenge,material:$("ebk_material").value}};
 }
 if(type==="freies_profil"){
  const konisch=$("fp_konisch").value==="ja";
  return {...base,photo_path:null,sketch_paths:[],data:{schenkel:fpSchenkel,konisch,segmente:fpSegmente,ansicht:$("fp_ansicht").value,material:$("fp_material").value}};
 }
 if(type==="mauerabdeckung"){
  const material=$("mad_material").value;
  const {boundaries,gesamtlaenge}=computeMadBoundaries(madSegments);
  const stueckliste=berechneMadStueckliste(madSegments,madSchieber,boundaries,madBodenMass,madSchieberMass);
  return {...base,photo_path:null,sketch_paths:[],data:{
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
  if(!g)return {...base,photo_path:null,sketch_paths:[],data:{}};
  // Scharenliste mitspeichern: ein einmal gedrucktes PDF bleibt dadurch
  // gleich, auch wenn eine Zugabe später geändert wird.
  return {...base,photo_path:null,sketch_paths:[],data:{
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
  return {...base,photo_path:null,sketch_paths:[],data:{...e,
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
  return {...base,photo_path:null,sketch_paths:[],data:{...e,
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
  return {...base,photo_path:null,sketch_paths:[],data:{
   nh:e.nh===""?null:Number(e.nh),
   nl:e.nl===""?null:Number(e.nl),
   gl:e.gl===""?null:Number(e.gl),
   ...werte
  }};
 }
 return {...base,photo_path:measPhotoDataUrl||measExistingPhotoUrl||null,sketch_paths:measSketches,data:{material:$("foto_material")?$("foto_material").value:""}};
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
 if(!title){alert("Bitte eine Bezeichnung eingeben.");return}
 if(!measSelectedProjectId){alert("Bitte zuerst ein Projekt auswählen. Eine Massaufnahme kann nur einem Projekt zugeordnet gespeichert werden.");return}
 if(type==="skizze_foto"&&!measPhotoDataUrl&&!measExistingPhotoUrl&&measSketches.length===0){alert("Bitte ein Foto aufnehmen oder mindestens eine Skizze zeichnen.");return}
 if(type==="einlaufblech_gerade"){
  if(!ebPieces.length||!ebPieces.some(p=>Number(p.laenge)>0)){alert("Bitte mindestens ein Stück mit einer gültigen Länge erfassen.");return}
  if(!Number($("eb_massA").value)||Number($("eb_massA").value)<=0){alert("Bitte Mass A eingeben (Pflichtfeld).");return}
  if($("eb_winkel").value===""||$("eb_winkel").value===null){alert("Bitte Dachneigung / Winkel eingeben (Pflichtfeld).");return}
 }
 if(type==="rinne_halbrund"&&(!rinneSegments.length||!rinneSegments.some(s=>Number(s.laenge)>0))){alert("Bitte mindestens ein Segment mit einer gültigen Länge eingeben.");return}
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
 $("saveMeasurement").disabled=true;
 let platzhalterId=null; // falls hier eine Zeile nur für die Ordner-ID angelegt wird
 try{
  const form=buildMeasurementFromForm();
  const warNeu=!currentMeasurementId;
  let workingId=currentMeasurementId;
  let photoUrl=measExistingPhotoUrl,sketchUrls=measSketches.slice();
  if(type==="skizze_foto"){
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
// ---- Gemeinsame professionelle PDF-Bausteine (v2.53) --------------
// Wird von printMeasurement (hier) und printAusmass (17-ausmass.js)
// benutzt. Ein einziges Layout fuer alle Ausdrucke ausser dem
// Regierapport - der druckt weiterhin ueber css/03-druck.css die
// App-Seite selbst und ist von diesen Bausteinen nicht betroffen.
function pdfLetterheadHtml(subtitle,logoSrc){
 const src=logoSrc!==undefined?logoSrc:logoUrl;
 // Ohne Logo tritt der Firmenname links an dessen Stelle - dann steht er
 // rechts nicht noch einmal, sonst stuende er doppelt im Briefkopf.
 const logo=src
  ? `<img src="${esc(src)}" alt="">`
  : `<div class="pdf-logo-text">${esc(companyName)}</div>`;
 const rechts=src
  ? `<b>${esc(companyName)}</b>${companyAddress?esc(companyAddress):""}`
  : (companyAddress?esc(companyAddress):"");
 return `<div class="pdf-head">
<div class="pdf-head-left"><div class="pdf-logo">${logo}</div><div class="pdf-doktyp">${esc(subtitle)}</div></div>
<div class="pdf-firma">${rechts}</div>
</div>`;
}
// Dokumentkopf: Objektadresse gross (dieselbe zentrale Adresslogik wie
// im Bildschirm, siehe eintragAdresse in js/01-basis.js), darunter die
// Bezeichnung und ein Raster mit den Kopfdaten. Leere Werte werden
// weggelassen - keine leeren Etiketten, keine Platzhalterzeilen.
function pdfDokumentKopf(datensatz,projekt,bezeichnung,paare){
 const adresse=eintragAdresse({project_id:datensatz?datensatz.project_id:null},bezeichnung||"");
 const bez=String(bezeichnung||"").trim();
 const zellen=(paare||[]).filter(x=>x&&x[1]!==null&&x[1]!==undefined&&String(x[1]).trim()!==""&&String(x[1]).trim()!=="–");
 // Raster auf ein Vielfaches von 3 auffuellen, damit keine angebrochene
 // Zeile mit haengendem Rand entsteht.
 const rest=zellen.length%3;
 const voll=zellen.concat(rest?new Array(3-rest).fill(null):[]);
 const raster=voll.length?`<div class="pdf-meta">${voll.map(z=>z
  ? `<div><label>${esc(z[0])}</label><div class="v">${esc(z[1])}</div></div>`
  : `<div class="leer"></div>`).join("")}</div>`:"";
 return `<div class="pdf-titel"><h1>${esc(adresse)}</h1>${
  (bez&&bez!==adresse)?`<div class="bez">${esc(bez)}</div>`:""}</div>${raster}`;
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
 /* Briefkopf */
 .pdf-head{display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;
  border-bottom:2.4pt solid #17202a;padding:0 0 2.4mm;margin:0 0 5mm}
 .pdf-head-left{min-width:0}
 .pdf-logo img{max-height:16mm;max-width:64mm;display:block}
 .pdf-logo-text{font-size:15pt;font-weight:900;letter-spacing:.05em;line-height:1;color:#17202a}
 .pdf-doktyp{margin-top:1.8mm;font-size:6.4pt;font-weight:700;text-transform:uppercase;
  letter-spacing:.14em;color:#5b666e}
 .pdf-firma{text-align:right;font-size:7pt;color:#5b666e;line-height:1.45;white-space:pre-line;flex:0 0 auto}
 .pdf-firma b{display:block;color:#17202a;font-size:8.2pt;letter-spacing:.02em;white-space:normal}
 /* Dokumentkopf */
 .pdf-titel{margin:0 0 3.5mm}
 .pdf-titel h1{font-size:14pt;font-weight:800;margin:0;line-height:1.15;letter-spacing:-.01em;color:#17202a}
 .pdf-titel .bez{margin-top:1.2mm;font-size:9.5pt;font-weight:600;color:#3d4850}
 .pdf-meta{display:grid;grid-template-columns:repeat(3,1fr);border:.5pt solid #b3bcc2;margin:0 0 5mm;
  page-break-inside:avoid;break-inside:avoid}
 .pdf-meta>div{padding:1.7mm 2.4mm;border-right:.5pt solid #cfd6db;border-bottom:.5pt solid #cfd6db;min-width:0}
 .pdf-meta>div:nth-child(3n){border-right:0}
 .pdf-meta>div:nth-last-child(-n+3){border-bottom:0}
 .pdf-meta label{display:block;font-size:5.6pt;font-weight:700;text-transform:uppercase;
  letter-spacing:.07em;color:#6b757c;margin:0 0 .6mm}
 .pdf-meta .v{font-size:8pt;font-weight:700;word-break:break-word}
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
 let photoSrc=null,sketchSrcs=[];
 if(m.type==="skizze_foto"){
  photoSrc=await storageSignedUrl(m.photo_path);
  const sketchQuellen=(m.sketch_paths&&m.sketch_paths.length)?m.sketch_paths:(m.sketch_path?[m.sketch_path]:[]);
  sketchSrcs=await Promise.all(sketchQuellen.map(storageSignedUrl));
 }
 const sachbearbeiter=esc(currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"–");
 // Ein Dokumentkopf fuer alle Massaufnahme-Arten: Objektadresse gross,
 // darunter die Bezeichnung und die Kopfdaten. Leere Werte fallen weg.
 const cell2=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
 const kopfHtml=pdfDokumentKopf(m,proj,m.title,[
  ["Projekt",proj?proj.name:""],
  ["Auftrags-Nr.",proj?proj.order_no:""],
  ["Auftraggeber",proj?proj.customer:""],
  ["Datum",m.date||""],
  ["Massaufnahme-Art",typeLabels[m.type]||m.type],
  ["Sachbearbeiter",currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:""]
 ]);

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
<tr>${cell("Material",matName)}<td></td></tr>
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
<div class="eb-section-head">Stücke</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Zuschnittlänge (mm)</th><th>Ger. L</th><th>Ger. R</th></tr></thead>
<tbody>${pieces.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.laenge||0)}</td><td>${p.gehrungLinks?"Ja":"–"}</td><td>${p.gehrungRechts?"Ja":"–"}</td></tr>`).join("")}</tbody>
</table>
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
<tr>${cell("Rinnenabwicklung",esc(d.rinneAbwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Material",esc(matTab.label))}${cell("Dilatationselemente",dilas.length?esc(dilas.length)+" Stück":"Keine nötig")}<td></td></tr>
</table>
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
  const skizzen=sketchSrcs.filter(Boolean);
  bodyHtml=`${kopfHtml}
${matName?`<div class="eb-section-head">Angaben</div>
<table class="eb-info-table"><tr>${cell2("Material",esc(matName))}<td></td></tr></table>`:""}
${photoSrc?`<div class="eb-section-head">Foto</div>
<div class="pdf-bild"><img class="photo" src="${esc(photoSrc)}"></div>`:""}
${m.note?`<div class="eb-section-head">Notiz</div>
<div class="note">${esc(m.note)}</div>`:""}
${skizzen.map((s,i)=>`<div class="sketch-page"><div class="eb-section-head">Skizze${skizzen.length>1?` ${i+1} von ${skizzen.length}`:""}</div>
<div class="pdf-bild"><img class="sketch" src="${esc(s)}"></div></div>`).join("")}`;
 }

 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(pdfDateiname(proj?proj.name:"",proj?proj.object:"",typeLabels[m.type]||m.type,m.title))}</title>
<style>
${PDF_LAYOUT_CSS}
</style></head><body>
${pdfLetterheadHtml("Massaufnahme · "+(typeLabels[m.type]||m.type),logoSrc)}
${pdfZahlenRechts(bodyHtml)}
${pdfFooterHtml(m)}
</body></html>`);
 win.document.close();
 const doPrint=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=doPrint;
 setTimeout(doPrint,800);
}

$("closeMeasurements").onclick=()=>{$("measurementsModal").hidden=true};
