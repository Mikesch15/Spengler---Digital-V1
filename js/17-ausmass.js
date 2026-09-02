"use strict";
// ---- Ausmass: Offerte erfassen ---------------------------------
let amSelectedProjectId=null;
let amPhotos=[]; // Einträge: "data:..." (neu, noch nicht hochgeladen) oder "https://..." (bereits gespeichert)
let amPositions=[];
let amBzPositions=[];
let currentAusmassId=null;
let amEditReturnTo="ausmassModal";
let ausmassListProjectId=null;
let ausmassCache=[];

function renderAmPositionsTable(){
 $("amPositionsBody").innerHTML=amPositions.map((p,i)=>`<tr>
<td><input data-am-pos="${i}" value="${esc(p.pos||"")}"></td>
<td><input data-am-desc="${i}" value="${esc(p.description||"")}"></td>
<td><input data-am-qty="${i}" type="number" step=".01" value="${p.quantity||0}"></td>
<td><input data-am-unit="${i}" value="${esc(p.unit||"")}"></td>
<td><button type="button" class="red" data-am-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="5" class="small">Noch keine Positionen. Foto aufnehmen und "Positionen erkennen" klicken, oder manuell hinzufügen.</td></tr>';
 $("amPositionsSummary").textContent=amPositions.length?`${amPositions.length} Positionen`:"";
}
function showAmTypeSection(type){
 $("amTypeOfferte").hidden=(type!=="offerte_erfassen");
 $("amTypeBlitzschutz").hidden=(type!=="blitzschutz_ausmass");
}
$("amType").addEventListener("change",e=>showAmTypeSection(e.target.value));

function renderBzPositionsTable(){
 $("bzPositionsBody").innerHTML=amBzPositions.map((p,i)=>`<tr>
<td>${esc(p.artikel_nr||"")}</td>
<td>${esc(p.bezeichnung||"")}</td>
<td>${esc(p.material||"")}</td>
<td>${esc(p.einheit||"")}</td>
<td><input data-bz-menge="${i}" type="number" step=".01" value="${p.menge||0}"></td>
<td><button type="button" class="red" data-bz-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="6" class="small">Noch keine Positionen. Oben nach Material suchen und auswählen.</td></tr>';
 $("bzPositionsSummary").textContent=amBzPositions.length?`${amBzPositions.length} Positionen`:"";
}
$("bzPositionsBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.bzMenge);
 if(Number.isNaN(i)||!amBzPositions[i])return;
 amBzPositions[i].menge=Number(e.target.value)||0;
});
$("bzPositionsBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-bz-del]");
 if(del){amBzPositions.splice(Number(del.dataset.bzDel),1);renderBzPositionsTable();}
});
$("bzPositionSearch").addEventListener("input",e=>{
 const box=$("bzPositionResults");
 box.innerHTML=searchBlitzschutzMaterials(e.target.value).map(m=>`<div class="item" data-pick-bz-material="${m.id}"><b>${esc(m.bezeichnung)}</b><span>${esc(m.artikel_nr||"–")} · ${esc(m.material||"")} · ${esc(m.einheit||"")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("bzPositionSearch").addEventListener("focus",e=>{
 const box=$("bzPositionResults");
 box.innerHTML=searchBlitzschutzMaterials(e.target.value).map(m=>`<div class="item" data-pick-bz-material="${m.id}"><b>${esc(m.bezeichnung)}</b><span>${esc(m.artikel_nr||"–")} · ${esc(m.material||"")} · ${esc(m.einheit||"")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("bzPositionResults").addEventListener("click",e=>{
 const it=e.target.closest("[data-pick-bz-material]");if(!it)return;
 const mat=blitzschutzMaterials.find(m=>m.id===Number(it.dataset.pickBzMaterial));
 if(mat)amBzPositions.push({artikel_nr:mat.artikel_nr||"",bezeichnung:mat.bezeichnung||"",material:mat.material||"",einheit:mat.einheit||"",menge:1});
 renderBzPositionsTable();
 $("bzPositionSearch").value="";
 $("bzPositionResults").innerHTML="";
});
$("amPositionsBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.amPos??e.target.dataset.amDesc??e.target.dataset.amQty??e.target.dataset.amUnit);
 if(Number.isNaN(i)||!amPositions[i])return;
 if(e.target.dataset.amPos!==undefined)amPositions[i].pos=e.target.value;
 else if(e.target.dataset.amDesc!==undefined)amPositions[i].description=e.target.value;
 else if(e.target.dataset.amUnit!==undefined)amPositions[i].unit=e.target.value;
 else if(e.target.dataset.amQty!==undefined)amPositions[i].quantity=Number(e.target.value)||0;
});
$("amPositionsBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-am-del]");
 if(del){amPositions.splice(Number(del.dataset.amDel),1);renderAmPositionsTable();}
});
$("amAddPosition").onclick=()=>{
 amPositions.push({pos:"",description:"",quantity:0,unit:""});
 renderAmPositionsTable();
};

function renderAmPhotoGallery(){
 $("amPhotoGallery").innerHTML=amPhotos.map((src,i)=>`<div class="sketch-thumb-wrap">
<img class="sketch-thumb" data-signed-src="${esc(src)}">
<div class="sketch-thumb-actions">
<button type="button" class="gray" data-recognize-photo="${i}" title="Nur dieses Foto erkennen">🔎</button>
<button type="button" class="red" data-remove-photo="${i}">✕</button>
</div>
</div>`).join("")||'<div class="small" style="color:var(--muted)">Noch kein Foto</div>';
 resolveSignedThumbnails($("amPhotoGallery"));
 $("amRecognizeAll").hidden=amPhotos.length===0;
}
async function recognizePhoto(src){
 const res=await fetch(`${SUPABASE_URL}/functions/v1/extract-offer-positions`,{
  method:"POST",
  headers:{
   "Content-Type":"application/json",
   "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
   "apikey":SUPABASE_ANON_KEY
  },
  body:JSON.stringify({image_base64:src})
 });
 const text=await res.text();
 let data=null;
 try{data=JSON.parse(text)}catch{}
 if(!res.ok)throw new Error(`Server antwortete mit Status ${res.status}: ${(data&&data.error)||text.slice(0,300)||"unbekannter Fehler"}`);
 if(!data?.ok)throw new Error((data&&data.error)||"Erkennung fehlgeschlagen.");
 return (data.positions||[]).map(p=>({
  pos:p.pos||"",
  description:p.description||"",
  quantity:Number(p.quantity)||0,
  unit:p.unit||""
 }));
}

$("amPhotoInput").addEventListener("change",async e=>{
 const files=Array.from(e.target.files||[]);
 if(!files.length)return;
 for(const file of files){
  try{
   const pq=photoQualitySettings();const dataUrl=await resizeImageFile(file,pq.maxDim,pq.quality);
   amPhotos.push(dataUrl);
  }catch(err){alert("Foto konnte nicht geladen werden: "+err.message)}
 }
 $("amPhotoInput").value="";
 renderAmPhotoGallery();
});
$("amPhotoGallery").addEventListener("click",async e=>{
 const rm=e.target.closest("[data-remove-photo]");
 if(rm){amPhotos.splice(Number(rm.dataset.removePhoto),1);renderAmPhotoGallery();return}
 const rec=e.target.closest("[data-recognize-photo]");
 if(rec){
  const i=Number(rec.dataset.recognizePhoto);
  const src=amPhotos[i];
  if(!src)return;
  rec.disabled=true;
  $("amRecognizeStatus").textContent=`Erkenne Foto ${i+1} … das kann einige Sekunden dauern.`;
  try{
   const found=await recognizePhoto(src);
   amPositions=amPositions.concat(found);
   renderAmPositionsTable();
   $("amRecognizeStatus").textContent=`${found.length} Position(en) aus Foto ${i+1} erkannt. Bitte prüfen.`;
  }catch(err){
   $("amRecognizeStatus").textContent="";
   alert("Fehler bei der Erkennung: "+(err.message||err));
  }
  rec.disabled=false;
 }
});
$("amRecognizeAll").onclick=async()=>{
 if(!amPhotos.length){alert("Bitte zuerst mindestens ein Foto hinzufügen.");return}
 $("amRecognizeAll").disabled=true;
 let totalFound=0;
 for(let i=0;i<amPhotos.length;i++){
  $("amRecognizeStatus").textContent=`Erkenne Foto ${i+1} von ${amPhotos.length} … das kann einige Sekunden dauern.`;
  try{
   const found=await recognizePhoto(amPhotos[i]);
   amPositions=amPositions.concat(found);
   renderAmPositionsTable();
   totalFound+=found.length;
  }catch(err){
   alert(`Fehler bei Foto ${i+1}: `+(err.message||err));
  }
 }
 $("amRecognizeStatus").textContent=`${totalFound} Position(en) aus ${amPhotos.length} Foto(s) erkannt. Bitte auf Richtigkeit prüfen und bei Bedarf korrigieren, bevor du speicherst.`;
 $("amRecognizeAll").disabled=false;
};

$("amProjectSearch").addEventListener("input",e=>{
 const box=$("amProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>`<div class="item" data-pick-am-project="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.order_no||"–")} · ${esc(p.customer||"–")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("amProjectSearch").addEventListener("focus",e=>{
 e.target.select();
 const box=$("amProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>`<div class="item" data-pick-am-project="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.order_no||"–")} · ${esc(p.customer||"–")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
function setAmProjectField(projId){
 amSelectedProjectId=projId||null;
 const proj=allProjects.find(x=>x.id===amSelectedProjectId);
 $("amProjectSearch").value=proj?proj.name:"";
 $("amProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
}
$("amProjectResults").addEventListener("click",e=>{
 const it=e.target.closest("[data-pick-am-project]");if(!it)return;
 setAmProjectField(Number(it.dataset.pickAmProject));
 $("amProjectResults").innerHTML="";
});

function newAusmassWithType(type){
 if(modulGesperrt("am:"+type)){alert("Dieses Modul ist noch in Entwicklung und steht vorerst nur Administratoren zur Verfügung.");return}
 sperreFuerEintrag("ausmass",null);
 isDirty=false;
 amEditReturnTo="ausmassModal";
 currentAusmassId=null;
 currentAusmassMeta={};
 $("printAusmassBtn").hidden=false;
 $("amType").value=type;
 showAmTypeSection(type);
 $("amTitle").value="";
 $("amNote").value="";
 $("amDate").value=new Date().toISOString().slice(0,10);
 $("amPhotoInput").value="";
 $("amRecognizeStatus").textContent="";
 amPhotos=[];
 renderAmPhotoGallery();
 amPositions=[];
 renderAmPositionsTable();
 amBzPositions=[];
 renderBzPositionsTable();
 setAmProjectField(currentProjectId);
 $("ausmassModal").hidden=true;
 $("ausmassEditModal").hidden=false;
 updateAmFormTitle();
}
function updateAmFormTitle(){
 const labels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 const h2=document.querySelector("#ausmassEditModal h2");
 if(h2)h2.textContent=`📏 Ausmass – ${labels[$("amType").value]||""}`;
 // Dezente Ersteller-/Bearbeiter-Anzeige, wiederverwendet dieselbe Logik
 // wie bei Massaufnahmen (erstelltGeaendertText(), js/16-massaufnahme-
 // formular.js) - siehe CLAUDE.md 36/37.
 const meta=erstelltGeaendertText(currentAusmassMeta);
 $("amMetaInfo").textContent=meta;
 $("amMetaInfo").hidden=!meta;
 updateVerlaufToggleVisibility($("amVerlaufToggle"),$("amVerlaufBody"),currentAusmassId);
}
function openAusmass(a){
 sperreFuerEintrag("ausmass",a&&a.created_by);
 isDirty=false;
 currentAusmassId=a.id;
 currentAusmassMeta={created_by:a.created_by,created_at:a.created_at,updated_by:a.updated_by,updated_at:a.updated_at};
 $("printAusmassBtn").hidden=false;
 $("amTitle").value=a.title||"";
 $("amNote").value=a.note||"";
 $("amDate").value=a.date||new Date().toISOString().slice(0,10);
 $("amType").value=a.type||"offerte_erfassen";
 showAmTypeSection($("amType").value);
 setAmProjectField(a.project_id);
 $("amPhotoInput").value="";
 amPhotos=(a.photo_paths&&a.photo_paths.length)?[...a.photo_paths]:(a.photo_path?[a.photo_path]:[]);
 renderAmPhotoGallery();
 if(a.type==="blitzschutz_ausmass"){
  amBzPositions=Array.isArray(a.positions)?a.positions.map(p=>({...p})):[];
  renderBzPositionsTable();
  amPositions=[];
 }else{
  amPositions=Array.isArray(a.positions)?a.positions.map(p=>({...p})):[];
  renderAmPositionsTable();
  amBzPositions=[];
 }
 $("amRecognizeStatus").textContent="";
 $("ausmassModal").hidden=true;
 $("ausmassEditModal").hidden=false;
 updateAmFormTitle();
}
$("cancelAusmass").onclick=()=>{
 $("ausmassEditModal").hidden=true;
 amEditZurueck();   // zentrale Rueckkehr, siehe js/24-projekt-cockpit.js
 isDirty=false;
};
function buildAusmassFromForm(){
 const type=$("amType").value;
 return {
  title:$("amTitle").value,
  note:$("amNote").value,
  date:$("amDate").value,
  type,
  project_id:amSelectedProjectId,
  photo_path:amPhotos[0]||null,
  photo_paths:amPhotos,
  positions:type==="blitzschutz_ausmass"?amBzPositions:amPositions,
 };
}
$("printAusmassBtn").onclick=()=>printAusmass(Object.assign(buildAusmassFromForm(),currentAusmassMeta));
$("saveAusmass").onclick=async()=>{
 const title=$("amTitle").value.trim();
 if(!title){alert("Bitte eine Bezeichnung eingeben.");return}
 if(!amSelectedProjectId){alert("Bitte zuerst ein Projekt auswählen. Ein Ausmass kann nur einem Projekt zugeordnet gespeichert werden.");return}
 $("saveAusmass").disabled=true;
 try{
  const photoUrls=[];
  for(const p of amPhotos){
   photoUrls.push(p.startsWith("data:")?await uploadMeasurementImage(p,"ausmass-photo"):p);
  }
  const jetzt=new Date().toISOString();
  const payload={
   project_id:amSelectedProjectId,
   type:$("amType").value,
   title,
   note:$("amNote").value,
   date:$("amDate").value||new Date().toISOString().slice(0,10),
   photo_path:photoUrls[0]||null,
   photo_paths:photoUrls,
   positions:$("amType").value==="blitzschutz_ausmass"?amBzPositions:amPositions,
   updated_by:currentProfile?currentProfile.id:null,
   updated_at:jetzt
  };
  const {error}=currentAusmassId
   ?await sb.from("ausmass").update(payload).eq("id",currentAusmassId)
   :await sb.from("ausmass").insert({...payload,created_by:currentProfile?currentProfile.id:null,created_at:jetzt});
  if(error)throw error;
  currentAusmassMeta=currentAusmassId
   ?{...currentAusmassMeta,updated_by:payload.updated_by,updated_at:jetzt}
   :{created_by:currentProfile?currentProfile.id:null,created_at:jetzt,updated_by:null,updated_at:null};
  $("ausmassEditModal").hidden=true;
  await amEditZurueck();   // zentrale Rueckkehr, siehe js/24-projekt-cockpit.js
  isDirty=false;
 }catch(err){
  alert("Fehler beim Speichern: "+(err.message||err));
 }
 $("saveAusmass").disabled=false;
};

async function renderAusmassOverview(){
 const {data,error}=await sb.from("ausmass").select("*").order("created_at",{ascending:false}).limit(recentCount);
 if(error){$("recentAusmassList").innerHTML=`<div class="empty">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 ausmassCache=list;
 const typeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 $("recentAusmassList").innerHTML=list.length?list.map(a=>{
  const proj=allProjects.find(p=>p.id===a.project_id);
  const posCount=Array.isArray(a.positions)?a.positions.length:0;
  const thumb=(a.photo_paths&&a.photo_paths[0])||a.photo_path;
  const thumbHtml=thumb?`<img class="meas-thumb" data-signed-src="${esc(thumb)}" loading="lazy">`:`<div class="meas-thumb meas-thumb-empty" style="font-size:10px">${posCount} Pos.</div>`;
  return `<div class="meas-row">
${thumbHtml}
<div class="meas-row-info"><b>Ausmass (${esc(typeLabels[a.type]||a.type)})</b><span>${esc(a.title||"Ohne Titel")} · ${esc(proj?proj.name:"Kein Projekt")} · ${esc(a.date||"–")}</span></div>
<div class="meas-row-actions">
<button class="blue" data-open-ausmass="${a.id}" title="Öffnen">✏️</button>
<button class="gray" data-print-ausmass="${a.id}" title="Als PDF">🖨️</button>
<button class="red" data-del-ausmass="${a.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Ausmasse vorhanden.</div>';
 resolveSignedThumbnails($("recentAusmassList"));
}
$("recentAusmassList").addEventListener("click",e=>{
 const openA=e.target.closest("[data-open-ausmass]");
 if(openA){const a=ausmassCache.find(x=>x.id===Number(openA.dataset.openAusmass));if(a)openAusmass(a);return}
 const printA=e.target.closest("[data-print-ausmass]");
 if(printA){const a=ausmassCache.find(x=>x.id===Number(printA.dataset.printAusmass));if(a)printAusmass(a);return}
 const delA=e.target.closest("[data-del-ausmass]");
 if(delA){
  if(!confirm("Dieses Ausmass wirklich löschen?"))return;
  sb.from("ausmass").delete().eq("id",Number(delA.dataset.delAusmass)).then(({error})=>{
   if(error){alert("Fehler: "+error.message);return}
   renderAusmassOverview();
  });
 }
});

$("closeAusmass").onclick=()=>{$("ausmassModal").hidden=true};
$("ausmassSettingsShortcut").onclick=()=>openSettingsTo("protected","blitzschutz");
$("startFromAusmass").onclick=()=>goToStart();
$("startFromAusmassEdit").onclick=()=>goToStart();
$("ausmassEditSettingsShortcut").onclick=()=>{
 if($("amType").value==="blitzschutz_ausmass")openSettingsTo("protected","blitzschutz");
 else openSettingsTo("protected");
};

async function printAusmass(a){
 const proj=allProjects.find(p=>p.id===a.project_id);
 const typeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 // window.open() muss synchron im Klick-Handler passieren, sonst blockiert
 // der Browser das Popup – deshalb ganz am Anfang, vor jedem await.
 const win=window.open("","_blank");
 if(!win){alert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return}
 const logoSrc=await storageSignedUrl(logoUrl);
 const sachbearbeiter=esc(currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"–");
 const positions=Array.isArray(a.positions)?a.positions:[];
 const cell=(label,val)=>`<td><label>${esc(label)}</label><div class="val">${val}</div></td>`;
 let positionsHtml;
 if(a.type==="blitzschutz_ausmass"){
  positionsHtml=`<table class="am-cutlist">
<thead><tr><th>Artikel-Nr.</th><th>Bezeichnung</th><th>Material</th><th>Einheit</th><th>Menge</th></tr></thead>
<tbody>${positions.map(p=>`<tr><td>${esc(p.artikel_nr||"")}</td><td>${esc(p.bezeichnung||"")}</td><td>${esc(p.material||"")}</td><td>${esc(p.einheit||"")}</td><td>${esc(p.menge||0)}</td></tr>`).join("")}</tbody>
</table>`;
 }else{
  positionsHtml=`<table class="am-cutlist">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th></tr></thead>
<tbody>${positions.map(p=>`<tr><td>${esc(p.pos||"")}</td><td>${esc(p.description||"")}</td><td>${esc(p.quantity||0)}</td><td>${esc(p.unit||"")}</td></tr>`).join("")}</tbody>
</table>`;
 }
 const bodyHtml=`<h1>${esc(a.title||"Ausmass")}</h1>
<div class="am-section-head">Angaben</div>
<table class="am-info-table cols2">
<tr>${cell("Projekt",esc(proj?proj.name:"–"))}${cell("Datum",esc(a.date||"–"))}</tr>
<tr>${cell("Funktion",esc(typeLabels[a.type]||a.type))}${cell("Sachbearbeiter",sachbearbeiter)}</tr>
</table>
<div class="am-section-head">Positionen</div>
${positionsHtml}
${a.note?`<div class="note">${esc(a.note)}</div>`:""}`;
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(pdfDateiname(proj?proj.name:"",proj?proj.object:"",typeLabels[a.type]||a.type,a.title))}</title>
<style>
 body{font-family:Arial,Helvetica,sans-serif;color:#17202a;margin:14mm}
 h1{font-size:16pt;margin:0 0 2mm}
 .note{font-size:10pt;white-space:pre-wrap;margin-top:4mm}
 @page{size:A4 portrait;margin:12mm}
 .am-section-head{background:#17202a;color:#fff;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2mm 3mm;margin:4mm 0 0}
 .am-info-table{width:100%;border-collapse:collapse;border:.5pt solid #aeb7bf;table-layout:fixed}
 .am-info-table td{border:.5pt solid #c5cbd0;padding:2mm 2.5mm;vertical-align:top;width:50%}
 .am-info-table label{display:block;font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#68737d;margin:0 0 .7mm}
 .am-info-table .val{font-size:7.5pt;font-weight:700;color:#17202a}
 table.am-cutlist{width:100%;border-collapse:collapse;margin-top:2mm;border:.5pt solid #cbd4d9}
 .am-cutlist th{background:#17202a;color:#fff;text-align:left;font-size:8.5pt;padding:2.4mm 2.6mm;text-transform:uppercase;letter-spacing:.02em}
 .am-cutlist td{padding:2.2mm 2.6mm;border-bottom:.5pt solid #e2e8ec;font-size:9pt}
 .am-cutlist tbody tr:nth-child(even) td{background:#f7fafc}
 .am-cutlist td:nth-child(3),.am-cutlist td:nth-child(5),.am-cutlist td:nth-child(6){text-align:left;font-variant-numeric:tabular-nums}
 .am-cutlist tfoot td{border-top:1pt solid #17202a;padding:2.4mm 2.6mm;font-size:9.5pt}
${PDF_HEAD_FOOT_CSS}
</style></head><body>
${pdfLetterheadHtml("Ausmass · "+(typeLabels[a.type]||a.type),logoSrc)}
${bodyHtml}
${pdfFooterHtml(a)}
</body></html>`);
 win.document.close();
 const doPrint=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=doPrint;
 setTimeout(doPrint,800);
}
