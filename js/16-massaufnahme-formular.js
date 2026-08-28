"use strict";
function showMeasTypeSection(type){
 $("measTypeFoto").hidden=(type!=="skizze_foto");
 $("measTypeEinlaufblech").hidden=(type!=="einlaufblech_gerade");
 $("measTypeRinne").hidden=(type!=="rinne_halbrund");
 $("measTypeEinlaufblechKonisch").hidden=(type!=="einlaufblech_konisch");
 $("measTypeFreiesProfil").hidden=(type!=="freies_profil");
 $("measTypeMauerabdeckung").hidden=(type!=="mauerabdeckung");
 if(type==="einlaufblech_gerade")renderEbPiecesTable();
 if(type==="rinne_halbrund")renderRinneResult();
 if(type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 if(type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
 if(type==="mauerabdeckung")renderMadResult();
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
  return {...base,photo_path:null,sketch_paths:[],data:{gesamtlaenge,massA,massAEng,winkel,montage,abwicklung,engeSeite,restBreite,pieces:ebPieces}};
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
  return {...base,photo_path:null,sketch_paths:[],data:{abwicklung,dachneigung,montage,engeSeite,pieces:piecesWithEng,gesamtlaenge}};
 }
 if(type==="freies_profil"){
  const konisch=$("fp_konisch").value==="ja";
  return {...base,photo_path:null,sketch_paths:[],data:{schenkel:fpSchenkel,konisch,segmente:fpSegmente,ansicht:$("fp_ansicht").value}};
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
 return {...base,photo_path:measPhotoDataUrl||measExistingPhotoUrl||null,sketch_paths:measSketches,data:{}};
}
$("printMeasurementBtn").onclick=()=>printMeasurement(buildMeasurementFromForm());
$("cancelMeasurement").onclick=()=>{
 $("measurementEditModal").hidden=true;
 if(measEditReturnTo==="projectsModal"){$("projectsModal").hidden=false;renderProjectList()}
 else{$("measurementsModal").hidden=false;renderMeasurementsOverview()}
 measEditReturnTo="measurementsModal";
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
 $("saveMeasurement").disabled=true;
 try{
  const form=buildMeasurementFromForm();
  let photoUrl=null,sketchUrls=[];
  if(type==="skizze_foto"){
   photoUrl=measExistingPhotoUrl;
   if(measPhotoDataUrl)photoUrl=await uploadMeasurementImage(measPhotoDataUrl,"photo");
   for(const s of measSketches){
    sketchUrls.push(s.startsWith("data:")?await uploadMeasurementImage(s,"sketch"):s);
   }
  }
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
   updated_at:new Date().toISOString()
  };
  const {error}=currentMeasurementId
   ?await sb.from("measurements").update(payload).eq("id",currentMeasurementId)
   :await sb.from("measurements").insert({...payload,created_by:currentProfile?currentProfile.id:null,created_at:new Date().toISOString()});
  if(error)throw error;
  $("measurementEditModal").hidden=true;
  if(measEditReturnTo==="projectsModal"){$("projectsModal").hidden=false;renderProjectList()}
  else{$("measurementsModal").hidden=false;await renderMeasurementsOverview()}
  measEditReturnTo="measurementsModal";
  isDirty=false;
 }catch(err){
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
 const typeLabels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade",rinne_halbrund:"Rinne Halbrund",einlaufblech_konisch:"Einlaufblech konisch",freies_profil:"Freies Profil",mauerabdeckung:"Mauerabdeckung"};
 $("recentMeasurementsList").innerHTML=rows.length?rows.map(m=>{
  const proj=allProjects.find(p=>p.id===m.project_id);
  let thumbHtml;
  if(m.type==="einlaufblech_gerade"){
   const d=m.data||{};
   const anzahl=(d.pieces&&d.pieces.length)||0;
   thumbHtml=`<div class="meas-thumb meas-thumb-empty" style="font-size:10px;line-height:1.2;padding:2px">${anzahl}×<br>${d.massA||0}mm</div>`;
  }else{
   const thumb=m.photo_path||(m.sketch_paths&&m.sketch_paths[0])||m.sketch_path;
   thumbHtml=thumb?`<img class="meas-thumb" src="${thumb}" loading="lazy">`:'<div class="meas-thumb meas-thumb-empty">–</div>';
  }
  return `<div class="meas-row">
${thumbHtml}
<div class="meas-row-info"><b>Massaufnahme (${esc(typeLabels[m.type]||m.type)})</b><span>${esc(m.title||"Ohne Titel")} · ${esc(proj?proj.name:"Kein Projekt")} · ${esc(m.date||"–")}</span></div>
<div class="meas-row-actions">
<button class="blue" data-open-measurement="${m.id}" title="Öffnen">✏️</button>
<button class="red" data-del-measurement="${m.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Massaufnahmen vorhanden.</div>';
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
function erstelltGeaendertHtml(record){
 const erstelltName=profileName(record.created_by);
 const erstelltZeit=formatDatumZeit(record.created_at);
 const geaendertName=profileName(record.updated_by);
 const geaendertZeit=formatDatumZeit(record.updated_at);
 const teile=[];
 if(erstelltName||erstelltZeit)teile.push(`Erstellt von ${esc(erstelltName||"–")}${erstelltZeit?" am "+esc(erstelltZeit):""}`);
 if(geaendertName||geaendertZeit)teile.push(`Zuletzt geändert von ${esc(geaendertName||"–")}${geaendertZeit?" am "+esc(geaendertZeit):""}`);
 if(!teile.length)return"";
 return `<div class="small" style="color:var(--muted);margin-top:6mm;padding-top:2mm;border-top:.5pt solid #dfe6ea">${teile.join(" · ")}</div>`;
}
function printMeasurement(m){
 const proj=allProjects.find(p=>p.id===m.project_id);
 const typeLabels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade",rinne_halbrund:"Rinne Halbrund",einlaufblech_konisch:"Einlaufblech konisch",freies_profil:"Freies Profil",mauerabdeckung:"Mauerabdeckung"};
 const win=window.open("","_blank");
 if(!win){alert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return}
 const sachbearbeiter=esc(currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"–");
 const metaCommon=`
<div><b>Projekt:</b> ${esc(proj?proj.name:"–")}</div>
<div><b>Datum:</b> ${esc(m.date||"–")}</div>
<div><b>Funktion:</b> ${esc(typeLabels[m.type]||m.type)}</div>
<div><b>Sachbearbeiter:</b> ${sachbearbeiter}</div>`;

 let bodyHtml, extraCss="";
 if(m.type==="einlaufblech_gerade"){
  const d=m.data||{};
  const pieces=d.pieces||[];
  const engeSeite=d.engeSeite||"rechts";
  extraCss=`
 .eb-section-head{background:#17202a;color:#fff;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2mm 3mm;margin:4mm 0 0}
 .eb-info-table{width:100%;border-collapse:collapse;border:.5pt solid #aeb7bf;table-layout:fixed}
 .eb-info-table td{border:.5pt solid #c5cbd0;padding:2mm 2.5mm;vertical-align:top;width:50%}
 .eb-info-table label{display:block;font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#68737d;margin:0 0 .7mm}
 .eb-info-table .val{font-size:7.5pt;font-weight:700;color:#17202a}
 .eb-diagram{text-align:center;margin:4mm 0}
 .eb-diagram-row{display:flex;justify-content:center;align-items:flex-start;gap:10mm;margin:4mm 0}
 .eb-diagram-row .eb-diagram{flex:1;min-width:0;margin:0}
 .eb-diagram-row .eb-diagram-title{font-size:7pt;font-weight:700;color:#68737d;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2mm}
 .eb-diagram-row svg{max-width:100%!important;height:auto}
 table.eb-cutlist{width:100%;border-collapse:collapse;margin-top:2mm;border:.5pt solid #cbd4d9}
 .eb-cutlist th{background:#17202a;color:#fff;text-align:left;font-size:8.5pt;padding:2.8mm 3mm;text-transform:uppercase;letter-spacing:.03em}
 .eb-cutlist td{padding:2.6mm 3mm;border-bottom:.5pt solid #e2e8ec;font-size:9.5pt}
 .eb-cutlist tbody tr:nth-child(even) td{background:#f7fafc}
 .eb-cutlist td.warn{color:#b42318;font-weight:700}`;
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  bodyHtml=`<h1>${esc(m.title||"Massaufnahme")}</h1>
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Projekt",esc(proj?proj.name:"–"))}${cell("Datum",esc(m.date||"–"))}</tr>
<tr>${cell("Funktion",esc(typeLabels[m.type]||m.type))}${cell("Sachbearbeiter",sachbearbeiter)}</tr>
<tr>${cell("Abwicklung",esc(d.abwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Dachneigung / Winkel",esc(d.winkel||0)+"°")}${cell("Montage",'von '+esc(d.montage||"–")+` (eng ${esc(engeSeite)})`)}</tr>
<tr>${cell("Mass A",esc(d.massAEng||0)+` mm eng ${esc(engeSeite)} (${esc(d.massA||0)} mm)`)}${cell("Anzahl Stück",esc((pieces&&pieces.length)||0))}</tr>
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
${m.note?`<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="rinne_halbrund"){
  const d=m.data||{};
  const segs=d.segments||[];
  extraCss=`
 .eb-section-head{background:#17202a;color:#fff;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2mm 3mm;margin:4mm 0 0}
 .eb-info-table{width:100%;border-collapse:collapse;border:.5pt solid #aeb7bf;table-layout:fixed}
 .eb-info-table td{border:.5pt solid #c5cbd0;padding:2mm 2.5mm;vertical-align:top;width:50%}
 .eb-info-table label{display:block;font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#68737d;margin:0 0 .7mm}
 .eb-info-table .val{font-size:7.5pt;font-weight:700;color:#17202a}
 .eb-diagram{text-align:center;margin:4mm 0}
 table.eb-cutlist{width:100%;border-collapse:collapse;margin-top:2mm;border:.5pt solid #cbd4d9}
 .eb-cutlist th{background:#17202a;color:#fff;text-align:left;font-size:8.5pt;padding:2.8mm 3mm;text-transform:uppercase;letter-spacing:.03em}
 .eb-cutlist td{padding:2.6mm 3mm;border-bottom:.5pt solid #e2e8ec;font-size:10pt}
 .eb-cutlist tbody tr:nth-child(even) td{background:#f7fafc}`;
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const fittingLabel=id=>{const f=rinneFittingTypes.find(x=>x.id===Number(id));return f?`${f.symbol?f.symbol+" – ":""}${f.name}`:"–"};
  const dilas=d.dilas||[];
  const matTab=RINNE_AUSDEHNUNG_TABELLE[d.material]||RINNE_AUSDEHNUNG_TABELLE.titanzink;
  bodyHtml=`<h1>${esc(m.title||"Massaufnahme")}</h1>
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Projekt",esc(proj?proj.name:"–"))}${cell("Datum",esc(m.date||"–"))}</tr>
<tr>${cell("Funktion",esc(typeLabels[m.type]||m.type))}${cell("Sachbearbeiter",sachbearbeiter)}</tr>
<tr>${cell("Rinnenabwicklung",esc(d.rinneAbwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Material",esc(matTab.label))}${cell("Dilatationselemente",dilas.length?esc(dilas.length)+" Stück":"Keine nötig")}</tr>
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
${m.note?`<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="mauerabdeckung"){
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const d=m.data||{};
  const segs=d.segments||[];
  const tab=MAD_AUSDEHNUNG_TABELLE[d.material]||MAD_AUSDEHNUNG_TABELLE.titanzink;
  const stuecke=(Array.isArray(d.stueckliste)&&d.stueckliste.length)
   ? d.stueckliste
   : berechneMadStueckliste(segs,d.schieber||[],d.boundaries||[],d.bodenMass??madBodenMass,d.schieberMass??madSchieberMass);
  inner=`
<table class="eb-meta">
<tr>${cell("Material",esc(tab.label))}${cell("Gesamtlänge",esc(Math.round(d.gesamtlaenge||0))+" mm")}</tr>
<tr>${cell("Abwicklung",esc(d.abwicklung||0)+" mm")}${cell("Schieber",(d.schieber||[]).length?esc((d.schieber||[]).length)+" Stück":"Keine nötig")}</tr>
</table>
<div class="eb-section-head">Profil (Querschnitt)</div>
<div class="eb-diagram">${madProfilSvgAus(d.profil)}</div>
<div class="eb-section-head">Grundriss</div>
<div class="eb-diagram">${generateRinneGrundriss(segs,d.schieber||[],d.boundaries||[])}</div>
<div class="eb-section-head">Segmente</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th><th>Boden Anfang</th><th>Boden Ende</th></tr></thead>
<tbody>${segs.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.laenge||0)}</td><td>${esc(s.winkel??0)}</td><td>${s.bodenLinks?"ja":"–"}</td><td>${s.bodenRechts?"ja":"–"}</td></tr>`).join("")}</tbody>
</table>
<div class="eb-section-head">Schieber und Zuschnitt</div>
<table class="eb-cutlist">
<thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th><th>Position ab Start (mm)</th></tr></thead>
<tbody>${stuecke.map(st=>`<tr><td>${st.nr}</td><td>${esc(st.von)} → ${esc(st.bis)}</td><td>${Math.round(st.abstand)}</td><td>${Math.round(st.zuschnitt)}</td><td>${Math.round(st.pos)}</td></tr>`).join("")}</tbody>
</table>
${m.note?`<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="einlaufblech_konisch"){
  const d=m.data||{};
  const pieces=d.pieces||[];
  const engeSeite=d.engeSeite||"rechts";
  extraCss=`
 .eb-section-head{background:#17202a;color:#fff;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2mm 3mm;margin:4mm 0 0}
 .eb-info-table{width:100%;border-collapse:collapse;border:.5pt solid #aeb7bf;table-layout:fixed}
 .eb-info-table td{border:.5pt solid #c5cbd0;padding:2mm 2.5mm;vertical-align:top;width:50%}
 .eb-info-table label{display:block;font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#68737d;margin:0 0 .7mm}
 .eb-info-table .val{font-size:7.5pt;font-weight:700;color:#17202a}
 .eb-diagram{text-align:center;margin:4mm 0}
 .eb-diagram-row{display:flex;justify-content:center;align-items:flex-start;gap:10mm;margin:4mm 0}
 .eb-diagram-row .eb-diagram{flex:1;min-width:0;margin:0}
 .eb-diagram-row .eb-diagram-title{font-size:7pt;font-weight:700;color:#68737d;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2mm}
 .eb-diagram-row svg{max-width:100%!important;height:auto}
 table.eb-cutlist{width:100%;border-collapse:collapse;margin-top:2mm;border:.5pt solid #cbd4d9}
 .eb-cutlist th{background:#17202a;color:#fff;text-align:left;font-size:8.5pt;padding:2.8mm 3mm;text-transform:uppercase;letter-spacing:.03em}
 .eb-cutlist td{padding:2.6mm 3mm;border-bottom:.5pt solid #e2e8ec;font-size:9.5pt}
 .eb-cutlist tbody tr:nth-child(even) td{background:#f7fafc}
 .eb-cutlist td.warn{color:#b42318;font-weight:700}`;
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  const masseEngeSeite=pieces.map(p=>Number(engeSeite==="links"?p.massLinks:p.massRechts)||0).filter(v=>v>0);
  const repMass=masseEngeSeite.length?masseEngeSeite.reduce((a,b)=>a+b,0)/masseEngeSeite.length:null;
  const restBreite=repMass?(Number(d.abwicklung)-repMass-(Number(einlaufblechKonischSettings.umschlag_oben)||0)-(Number(einlaufblechKonischSettings.umschlag_unten)||0)):null;
  bodyHtml=`<h1>${esc(m.title||"Massaufnahme")}</h1>
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Projekt",esc(proj?proj.name:"–"))}${cell("Datum",esc(m.date||"–"))}</tr>
<tr>${cell("Funktion",esc(typeLabels[m.type]||m.type))}${cell("Sachbearbeiter",sachbearbeiter)}</tr>
<tr>${cell("Abwicklung",esc(d.abwicklung||"–")+" mm")}${cell("Gesamtlänge",esc(d.gesamtlaenge||0)+" mm")}</tr>
<tr>${cell("Dachneigung / Winkel",esc(d.dachneigung||0)+"°")}${cell("Montage",'von '+esc(d.montage||"–")+` (eng ${esc(engeSeite)})`)}</tr>
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
${m.note?`<div class="note">${esc(m.note)}</div>`:""}`;
 }else if(m.type==="freies_profil"){
  const d=m.data||{};
  const schenkel=d.schenkel||[];
  const segmente=d.segmente||[];
  const konisch=!!d.konisch;
  extraCss=`
 .eb-section-head{background:#17202a;color:#fff;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2mm 3mm;margin:4mm 0 0}
 .eb-info-table{width:100%;border-collapse:collapse;border:.5pt solid #aeb7bf;table-layout:fixed}
 .eb-info-table td{border:.5pt solid #c5cbd0;padding:2mm 2.5mm;vertical-align:top;width:50%}
 .eb-info-table label{display:block;font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#68737d;margin:0 0 .7mm}
 .eb-info-table .val{font-size:7.5pt;font-weight:700;color:#17202a}
 .eb-diagram{text-align:center;margin:4mm 0}
 table.eb-cutlist{width:100%;border-collapse:collapse;margin-top:2mm;border:.5pt solid #cbd4d9}
 .eb-cutlist th{background:#17202a;color:#fff;text-align:left;font-size:8.5pt;padding:2.8mm 3mm;text-transform:uppercase;letter-spacing:.03em}
 .eb-cutlist td{padding:2.6mm 3mm;border-bottom:.5pt solid #e2e8ec;font-size:9.5pt}
 .eb-cutlist tbody tr:nth-child(even) td{background:#f7fafc}`;
  const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
  bodyHtml=`<h1>${esc(m.title||"Massaufnahme")}</h1>
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Projekt",esc(proj?proj.name:"–"))}${cell("Datum",esc(m.date||"–"))}</tr>
<tr>${cell("Funktion",esc(typeLabels[m.type]||m.type))}${cell("Sachbearbeiter",sachbearbeiter)}</tr>
<tr>${cell("Anzahl Schenkel",esc(schenkel.length))}${cell("Konisch",konisch?"Ja":"Nein")}</tr>
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
${m.note?`<div class="note">${esc(m.note)}</div>`:""}`;
 }else{
  const sketches=(m.sketch_paths&&m.sketch_paths.length)?m.sketch_paths:(m.sketch_path?[m.sketch_path]:[]);
  extraCss=`
 img{max-width:100%;display:block;margin:0 auto 8mm;border:1px solid #ccc}
 img.photo{max-height:130mm}
 img.sketch{max-height:255mm}
 .sketch-page{page-break-before:always}`;
  bodyHtml=`<h1>${esc(m.title||"Massaufnahme")}</h1>
<div class="meta">${metaCommon}</div>
${m.photo_path?`<img class="photo" src="${esc(m.photo_path)}">`:""}
${m.note?`<div class="note">${esc(m.note)}</div>`:""}
${sketches.map((s,i)=>`<div class="sketch-page">${sketches.length>1?`<h2>Skizze ${i+1} von ${sketches.length}</h2>`:""}<img class="sketch" src="${esc(s)}"></div>`).join("")}`;
 }

 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(pdfDateiname(proj?proj.name:"",proj?proj.object:"",typeLabels[m.type]||m.type,m.title))}</title>
<style>
 body{font-family:Arial,Helvetica,sans-serif;color:#17202a;margin:14mm}
 h1{font-size:16pt;margin:0 0 2mm}
 h2{font-size:11pt;color:#68737d;margin:0 0 3mm;font-weight:700}
 .meta{font-size:9pt;color:#68737d;margin-bottom:6mm;line-height:1.6}
 .meta b{color:#17202a}
 .note{font-size:10pt;white-space:pre-wrap;margin-top:4mm}
 @page{size:A4 portrait;margin:12mm}
${extraCss}
</style></head><body>
${bodyHtml}
${erstelltGeaendertHtml(m)}
</body></html>`);
 win.document.close();
 const doPrint=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=doPrint;
 setTimeout(doPrint,800);
}

$("closeMeasurements").onclick=()=>{$("measurementsModal").hidden=true};
