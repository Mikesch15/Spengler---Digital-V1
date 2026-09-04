"use strict";
// ---- Massaufnahme (Skizze/Foto) --------------------------------
let measSelectedProjectId=null;
let measPhotoDataUrl=null;
let measExistingPhotoUrl=null;
let measSketches=[]; // je Eintrag: "data:..." (neu/geändert) oder "https://..." (bereits gespeichert)
let sketchEditIndex=null; // null = neue Skizze anlegen, sonst Index in measSketches wird ersetzt
let currentMeasurementId=null;
let measurementsCache=[];
let fsCtx=null;

const SKETCH_W=1000,SKETCH_H=1414; // festes A4-Hochformat-Seitenverhältnis, unabhängig vom Zoom
let sketchFitScale=1,sketchZoom=1,sketchPanMode=false;

// ---- Private Storage-Dateien anzeigen --------------------------
// Der Bucket "measurements" ist privat: ein gespeicherter Pfad lässt sich
// nicht mehr direkt als <img src> verwenden, dafür braucht es eine kurz
// gültige signierte URL. Alte, vor der Umstellung gespeicherte Werte sind
// noch vollständige "öffentliche" URLs – die werden hier erkannt und der
// reine Pfad daraus extrahiert, damit auch bestehende Fotos/Skizzen ohne
// Migration weiter funktionieren.
function measStoragePathFromValue(v){
 if(!v)return null;
 if(v.startsWith("data:"))return v;
 const marker="/object/public/measurements/";
 let i=v.indexOf(marker);
 if(i>=0)return decodeURIComponent(v.slice(i+marker.length));
 const marker2="/object/sign/measurements/";
 i=v.indexOf(marker2);
 if(i>=0)return decodeURIComponent(v.slice(i+marker2.length).split("?")[0]);
 return v; // schon ein reiner Speicherpfad
}
async function storageSignedUrl(value){
 const path=measStoragePathFromValue(value);
 if(!path)return null;
 if(path.startsWith("data:"))return path;
 const {data,error}=await sb.storage.from("measurements").createSignedUrl(path,3600);
 return error?null:data.signedUrl;
}
// Löst alle <img data-signed-src="…"> innerhalb eines Containers auf,
// nachdem eine Liste mit Foto-/Skizzenvorschauen neu gezeichnet wurde.
function resolveSignedThumbnails(container){
 if(!container)return;
 container.querySelectorAll("img[data-signed-src]").forEach(img=>{
  storageSignedUrl(img.dataset.signedSrc).then(url=>{if(url)img.src=url});
 });
}

function renderSketchGallery(){
 $("measSketchGallery").innerHTML=measSketches.map((src,i)=>`<div class="sketch-thumb-wrap">
<img class="sketch-thumb" data-signed-src="${esc(src)}">
<div class="sketch-thumb-actions">
<button type="button" class="gray" data-edit-sketch="${i}">✏️</button>
<button type="button" class="red" data-remove-sketch="${i}">✕</button>
</div>
</div>`).join("")||'<div class="small" style="color:var(--muted)">Noch keine Skizze</div>';
 resolveSignedThumbnails($("measSketchGallery"));
}
$("measSketchGallery").addEventListener("click",e=>{
 const ed=e.target.closest("[data-edit-sketch]");
 if(ed){const i=Number(ed.dataset.editSketch);openSketchFullscreen(measSketches[i],i);return}
 const rm=e.target.closest("[data-remove-sketch]");
 if(rm){measSketches.splice(Number(rm.dataset.removeSketch),1);renderSketchGallery();}
});

function applySketchZoom(){
 const canvas=$("fsSketchCanvas");
 const scale=sketchFitScale*sketchZoom;
 canvas.style.width=(SKETCH_W*scale)+"px";
 canvas.style.height=(SKETCH_H*scale)+"px";
 $("fsZoomLabel").textContent=Math.round(sketchZoom*100)+"%";
}
function setPanMode(on){
 sketchPanMode=on;
 $("fsPanFloating").classList.toggle("active",on);
 $("fsPanFloating").textContent=on?"✋ Verschieben":"✏️ Zeichnen";
}
$("fsPanFloating").onclick=()=>setPanMode(!sketchPanMode);
$("fsZoomIn").onclick=()=>{sketchZoom=Math.min(4,+(sketchZoom+0.25).toFixed(2));applySketchZoom()};
$("fsZoomOut").onclick=()=>{sketchZoom=Math.max(0.5,+(sketchZoom-0.25).toFixed(2));applySketchZoom()};

// Verhindert, dass ein Zwei-Finger-Pinch auf der Zeichenfläche die ganze Seite zoomt
// (Sicherheitsnetz zusätzlich zu touch-action, da sich v.a. Safari nicht immer daran hält).
document.addEventListener("touchmove",e=>{
 if(!$("sketchFullscreen").hidden&&e.touches.length>1)e.preventDefault();
},{passive:false});
document.addEventListener("gesturestart",e=>{
 if(!$("sketchFullscreen").hidden)e.preventDefault();
});

let sketchDoneCallback=null;
async function openSketchFullscreen(bgSrc,editIndex,doneCallback){
 sketchEditIndex=(typeof editIndex==="number")?editIndex:null;
 sketchDoneCallback=doneCallback||null;
 const overlay=$("sketchFullscreen"),canvas=$("fsSketchCanvas"),viewport=$("sketchViewport");
 overlay.hidden=false;
 canvas.width=SKETCH_W;canvas.height=SKETCH_H;
 setPanMode(false);
 // Vor requestAnimationFrame auflösen: ein gespeicherter Pfad/eine alte
 // URL ist im privaten Bucket erst nach dem Signieren als <img> ladbar.
 const resolvedBg=(typeof bgSrc==="string"&&bgSrc)?await storageSignedUrl(bgSrc):null;
 requestAnimationFrame(()=>{
  const vw=viewport.clientWidth-28,vh=viewport.clientHeight-28;
  sketchFitScale=Math.max(0.1,Math.min(vw/SKETCH_W,vh/SKETCH_H));
  sketchZoom=1;
  applySketchZoom();
  viewport.scrollTop=0;viewport.scrollLeft=0;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,SKETCH_W,SKETCH_H);
  ctx.lineCap="round";ctx.lineJoin="round";
  fsCtx=ctx;
  if(resolvedBg){
   const img=new Image();
   img.crossOrigin="anonymous";
   img.onload=()=>{
    const scale=Math.min(SKETCH_W/img.width,SKETCH_H/img.height);
    const w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(SKETCH_W-w)/2,(SKETCH_H-h)/2,w,h);
   };
   img.src=resolvedBg;
  }
 });
}
(function initFsSketchDrawing(){
 const canvas=$("fsSketchCanvas"),viewport=$("sketchViewport");
 let drawing=false,lastX=0,lastY=0;
 const activePointers=new Map(); // pointerId -> {x,y} in Bildschirmkoordinaten
 let pinchStartDist=0,pinchStartZoom=1,pinchStartMid=null,pinchStartScroll=null;
 let panStart=null; // {x,y,scrollLeft,scrollTop}

 function pos(e){
  const r=canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
 }
 function dist(p1,p2){return Math.hypot(p1.x-p2.x,p1.y-p2.y)}
 function mid(p1,p2){return {x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2}}

 canvas.addEventListener("pointerdown",e=>{
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size===2){
   drawing=false;
   const pts=[...activePointers.values()];
   pinchStartDist=dist(pts[0],pts[1]);
   pinchStartZoom=sketchZoom;
   pinchStartMid=mid(pts[0],pts[1]);
   pinchStartScroll={left:viewport.scrollLeft,top:viewport.scrollTop};
   panStart=null;
  }else if(activePointers.size===1){
   if(sketchPanMode){
    panStart={x:e.clientX,y:e.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
   }else{
    drawing=true;const p=pos(e);lastX=p.x;lastY=p.y;
   }
  }
  e.preventDefault();
 });
 canvas.addEventListener("pointermove",e=>{
  if(!activePointers.has(e.pointerId))return;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size===2){
   const pts=[...activePointers.values()];
   const d=dist(pts[0],pts[1]);
   if(pinchStartDist>0){
    sketchZoom=Math.max(0.5,Math.min(4,+(pinchStartZoom*(d/pinchStartDist)).toFixed(3)));
    applySketchZoom();
   }
   if(pinchStartMid){
    const m=mid(pts[0],pts[1]);
    viewport.scrollLeft=pinchStartScroll.left-(m.x-pinchStartMid.x);
    viewport.scrollTop=pinchStartScroll.top-(m.y-pinchStartMid.y);
   }
   e.preventDefault();
   return;
  }
  if(panStart){
   viewport.scrollLeft=panStart.scrollLeft-(e.clientX-panStart.x);
   viewport.scrollTop=panStart.scrollTop-(e.clientY-panStart.y);
   e.preventDefault();
   return;
  }
  if(drawing&&fsCtx){
   const p=pos(e);
   fsCtx.strokeStyle=$("fsSketchColor").value;
   fsCtx.lineWidth=Number($("fsSketchWidth").value);
   fsCtx.beginPath();fsCtx.moveTo(lastX,lastY);fsCtx.lineTo(p.x,p.y);fsCtx.stroke();
   lastX=p.x;lastY=p.y;
   e.preventDefault();
  }
 });
 function endPointer(e){
  activePointers.delete(e.pointerId);
  drawing=false;
  panStart=null;
  pinchStartDist=0;
  pinchStartMid=null;
 }
 canvas.addEventListener("pointerup",endPointer);
 canvas.addEventListener("pointercancel",endPointer);
})();
$("fsSketchClear").onclick=()=>{
 if(!fsCtx)return;
 fsCtx.fillStyle="#fff";fsCtx.fillRect(0,0,SKETCH_W,SKETCH_H);
};
$("fsSketchCancel").onclick=()=>{sketchDoneCallback=null;$("sketchFullscreen").hidden=true};
$("fsSketchDone").onclick=()=>{
 const dataUrl=$("fsSketchCanvas").toDataURL("image/png");
 if(sketchDoneCallback){
  const cb=sketchDoneCallback;
  sketchDoneCallback=null;
  $("sketchFullscreen").hidden=true;
  cb(dataUrl);
  return;
 }
 if(sketchEditIndex!==null&&measSketches[sketchEditIndex]!==undefined)measSketches[sketchEditIndex]=dataUrl;
 else measSketches.push(dataUrl);
 renderSketchGallery();
 $("sketchFullscreen").hidden=true;
};
$("measPhotoRemove").onclick=()=>{
 measPhotoDataUrl=null;
 measExistingPhotoUrl=null;
 $("measPhotoPreview").hidden=true;$("measPhotoPreview").src="";
 $("measPhotoInput").value="";
 $("measPhotoRemove").hidden=true;
 $("drawOnPhoto").hidden=true;
};
$("addSketch").onclick=()=>openSketchFullscreen();
$("drawOnPhoto").onclick=()=>{
 const src=measPhotoDataUrl||measExistingPhotoUrl;
 if(!src){alert("Bitte zuerst ein Foto auswählen.");return}
 openSketchFullscreen(src);
};

function resizeImageFile(file,maxDim,quality,format){
 format=format||"jpeg";
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>{
   const img=new Image();
   img.onload=()=>{
    let w=img.width,h=img.height;
    if(w>maxDim||h>maxDim){
     if(w>h){h=Math.round(h*maxDim/w);w=maxDim}
     else{w=Math.round(w*maxDim/h);h=maxDim}
    }
    const c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    resolve(c.toDataURL(format==="png"?"image/png":"image/jpeg",quality));
   };
   img.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden."));
   img.src=reader.result;
  };
  reader.onerror=()=>reject(new Error("Datei konnte nicht gelesen werden."));
  reader.readAsDataURL(file);
 });
}
$("measPhotoInput").addEventListener("change",async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  const pq=photoQualitySettings();measPhotoDataUrl=await resizeImageFile(file,pq.maxDim,pq.quality);
  $("measPhotoPreview").src=measPhotoDataUrl;
  $("measPhotoPreview").hidden=false;
  $("measPhotoRemove").hidden=false;
  $("drawOnPhoto").hidden=false;
 }catch(err){alert("Foto konnte nicht geladen werden: "+err.message)}
});

function dataUrlToBlob(dataUrl){
 const [meta,b64]=dataUrl.split(",");
 const mime=meta.match(/data:(.*);base64/)[1];
 const bin=atob(b64);
 const arr=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
 return new Blob([arr],{type:mime});
}
// "folder" ist der vollständige Ordnerpfad im Bucket (z. B.
// "measurements/<projectId>/<measurementId>/photo" oder "company-logo").
// Gibt nur noch den Speicherpfad zurück, keine öffentliche URL mehr –
// der Bucket ist privat, angezeigt wird über storageSignedUrl().
async function uploadMeasurementImage(dataUrl,folder){
 const blob=dataUrlToBlob(dataUrl);
 const ext=blob.type==="image/png"?"png":"jpg";
 const path=`${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
 const {error}=await sb.storage.from("measurements").upload(path,blob,{contentType:blob.type,upsert:false});
 if(error)throw error;
 return path;
}

$("measProjectSearch").addEventListener("input",e=>{
 const box=$("measProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-meas-project")).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("measProjectSearch").addEventListener("focus",e=>{
 e.target.select();
 const box=$("measProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-meas-project")).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
function setMeasProjectField(projId){
 measSelectedProjectId=projId||null;
 const proj=allProjects.find(x=>x.id===measSelectedProjectId);
 $("measProjectSearch").value=proj?proj.name:"";
 $("measProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
 if($("measType").value==="einlaufblech_konisch")refreshEbkRinneList();
 if($("measType").value==="einlaufblech_gerade")refreshEbRinneList();
}
$("measProjectResults").addEventListener("click",e=>{
 const it=e.target.closest("[data-pick-meas-project]");if(!it)return;
 setMeasProjectField(Number(it.dataset.pickMeasProject));
 $("measProjectResults").innerHTML="";
});

function newMeasurementWithType(type){
 if(modulGesperrt("meas:"+type)){alert("Dieses Modul ist noch in Entwicklung und steht vorerst nur Administratoren zur Verfügung.");return}
 sperreFuerEintrag("massaufnahme",null);
 isDirty=false;
 measEditReturnTo="measurementsModal";
 currentMeasurementId=null;
 currentMeasurementMeta={};
 $("printMeasurementBtn").hidden=false;
 $("measType").value=type;
 showMeasTypeSection(type);
 $("measTitle").value="";
 $("measNote").value="";
 $("measDate").value=new Date().toISOString().slice(0,10);
 $("measPhotoPreview").hidden=true;$("measPhotoPreview").src="";
 $("measPhotoInput").value="";
 $("measPhotoRemove").hidden=true;
 $("drawOnPhoto").hidden=true;
 measPhotoDataUrl=null;measExistingPhotoUrl=null;
 measSketches=[];
 // Neue Aufnahme: der Foto-/Skizzenbereich der Register-Arten startet
 // wieder zugeklappt.
 if(typeof measMedienZuruecksetzen==="function")measMedienZuruecksetzen();
 renderSketchGallery();
 $("eb_gesamtlaenge").value="";
 $("eb_massA").value="";
 $("eb_winkel").value="";
 $("eb_abwicklung").value="250";
 $("eb_montage").value="links";
 ebPieces=[];
 if(typeof ebaZuruecksetzen==="function")ebaZuruecksetzen();
 renderEbPiecesTable();
 $("eb_material").value="";
 $("foto_material").value="";
 rinneSegments=[];
 rinneDilas=[];
 $("rinne_abwicklung").value="250";
 $("rinne_material").value=String(measurementMaterialOrFallback(null).id||"");
 renderRinneResult();
 if(typeof rinneAufnahmeZuruecksetzen==="function")rinneAufnahmeZuruecksetzen();
 ebkPieces=[];
 $("ebk_abwicklung").value="250";
 $("ebk_dachneigung").value="";
 $("ebk_montage").value="links";
 $("ebk_material").value="";
 if(typeof ebkaZuruecksetzen==="function")ebkaZuruecksetzen();
 renderEbkPiecesTable();
 fpSchenkel=[];
 fpSegmente=[];
 $("fp_konisch").value="nein";
 $("fp_ansicht").value="links";
 $("fp_material").value="";
 renderFpSchenkelTable();
 renderFpSegmenteList();
 madSegments=[];
 madSchieber=[];
 $("mad_material").value=String(measurementMaterialOrFallback(null).id||"");
 $("mad_breite").value=310;
 $("mad_gefaelle").value=5;
 $("mad_hoeheLinks").value=50;
 $("mad_hoeheRechts").value=50;
 $("mad_umschlagLinks").value=15;
 $("mad_umschlagRechts").value=15;
 $("mad_saum").value=10;
 // Biegewinkel: Vorgabe passend zum Standard-Gefaelle von 5 Grad.
 $("mad_biegeLinks").value=95;
 $("mad_biegeRechts").value=85;
 $("mad_windexponiert").checked=false;
 $("mad_manuell").checked=false;
 renderMadResult();
 $("luk_hoehe").value="";
 $("luk_laengeOben").value="";
 $("luk_winkel").value="95";
 $("luk_achsabstand").value=lukAchsabstand;
 $("luk_hilfsriss").value=lukHilfsriss;
 $("luk_seite").value="rechts";
 $("luk_material").value="";
 renderLukResult();
 anbFormularZuruecksetzen();
 $("anb_material").value="";
 einfFormularZuruecksetzen();
 $("einf_material").value="";
 kehleFormularZuruecksetzen();
 rinneFormularZuruecksetzen();
 $("rp_material").value="";
 setMeasProjectField(currentProjectId);
 $("measurementsModal").hidden=true;
 $("measurementEditModal").hidden=false;
 updateMeasFormTitle();
}
function updateMeasFormTitle(){
 const h2=document.querySelector("#measurementEditModal h2");
 // v2.44: Objektadresse als Haupttitel, Massaufnahme-Art direkt
 // dahinter. Modals sind im Druck ausgeblendet (css/03-druck.css), die
 // PDF-Ausgabe ist davon nicht betroffen.
 if(h2)h2.textContent=`📐 ${eintragAdresse({project_id:measSelectedProjectId},$("measTitle").value)} · ${MEAS_TYPE_LABELS[$("measType").value]||""}`;
 // Dezente Ersteller-/Bearbeiter-Anzeige, wiederverwendet dieselbe Logik
 // wie der PDF-Briefkopf (erstelltGeaendertText(), js/16-massaufnahme-
 // formular.js) - siehe CLAUDE.md 36.
 const meta=erstelltGeaendertText(currentMeasurementMeta);
 $("measMetaInfo").textContent=meta;
 $("measMetaInfo").hidden=!meta;
 updateVerlaufToggleVisibility($("measVerlaufToggle"),$("measVerlaufBody"),currentMeasurementId);
}
function openMeasurement(m){
 sperreFuerEintrag("massaufnahme",m&&m.created_by);
 isDirty=false;
 currentMeasurementId=m.id;
 currentMeasurementMeta={created_by:m.created_by,created_at:m.created_at,updated_by:m.updated_by,updated_at:m.updated_at};
 $("printMeasurementBtn").hidden=false;
 $("measTitle").value=m.title||"";
 $("measNote").value=m.note||"";
 $("measDate").value=m.date||new Date().toISOString().slice(0,10);
 $("measType").value=m.type||"skizze_foto";
 // Zugeklappt starten; nach dem Laden der Medien (unten) wird die
 // Sichtbarkeit noch einmal gesetzt - eine Aufnahme MIT Fotos zeigt sie
 // sofort, sonst saehe es aus, als waeren sie weg.
 if(typeof measMedienZuruecksetzen==="function")measMedienZuruecksetzen();
 showMeasTypeSection($("measType").value);
 setMeasProjectField(m.project_id);
 measPhotoDataUrl=null;
 measExistingPhotoUrl=m.photo_path||null;
 $("measPhotoInput").value="";
 if(measExistingPhotoUrl){
  $("measPhotoPreview").src="";$("measPhotoPreview").hidden=false;$("measPhotoRemove").hidden=false;$("drawOnPhoto").hidden=false;
  storageSignedUrl(measExistingPhotoUrl).then(url=>{if(url&&measExistingPhotoUrl)$("measPhotoPreview").src=url});
 }
 else{$("measPhotoPreview").hidden=true;$("measPhotoPreview").src="";$("measPhotoRemove").hidden=true;$("drawOnPhoto").hidden=true}
 measSketches=(m.sketch_paths&&m.sketch_paths.length)?[...m.sketch_paths]:(m.sketch_path?[m.sketch_path]:[]);
 renderSketchGallery();
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit(m.type);
 const d=m.data||{};
 $("foto_material").value=findMeasurementMaterial(d.material)?.id??"";
 $("eb_gesamtlaenge").value=d.gesamtlaenge||"";
 $("eb_massA").value=d.massA||"";
 $("eb_winkel").value=d.winkel||"";
 $("eb_abwicklung").value=d.abwicklung||"250";
 $("eb_montage").value=d.montage||"links";
 $("eb_material").value=findMeasurementMaterial(d.material)?.id??"";
 ebPieces=(m.type==="einlaufblech_gerade"&&Array.isArray(d.pieces))?d.pieces.map(p=>({...p})):[];
 if(m.type==="einlaufblech_gerade"&&typeof ebaFuellen==="function")ebaFuellen(d);
 if(m.type==="einlaufblech_gerade"){renderEbPiecesTable();refreshEbRinneList();}
 rinneSegments=(m.type==="rinne_halbrund"&&Array.isArray(d.segments))?d.segments.map(s=>({...s})):[];
 rinneDilas=(m.type==="rinne_halbrund"&&Array.isArray(d.dilas))?d.dilas.map(dd=>({...dd})):[];
 $("rinne_abwicklung").value=d.rinneAbwicklung||"250";
 $("rinne_material").value=String(measurementMaterialOrFallback(d.material).id||"");
 if(m.type==="rinne_halbrund")renderRinneResult();
 if(typeof rinneAufnahmeFuellen==="function")
  rinneAufnahmeFuellen(m.type==="rinne_halbrund"?d:null);
 ebkPieces=(m.type==="einlaufblech_konisch"&&Array.isArray(d.pieces))?d.pieces.map(p=>({...p})):[];
 $("ebk_abwicklung").value=d.abwicklung||"250";
 $("ebk_dachneigung").value=d.dachneigung||"";
 $("ebk_montage").value=d.montage||"links";
 $("ebk_material").value=findMeasurementMaterial(d.material)?.id??"";
 if(m.type==="einlaufblech_konisch"&&typeof ebkaFuellen==="function")ebkaFuellen(d);
 if(m.type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 fpSchenkel=(m.type==="freies_profil"&&Array.isArray(d.schenkel))?d.schenkel.map(s=>({...s})):[];
 fpSegmente=(m.type==="freies_profil"&&Array.isArray(d.segmente))?d.segmente.map(s=>({...s,massen:(s.massen||[]).map(mm=>({...mm}))})):[];
 $("fp_konisch").value=d.konisch?"ja":"nein";
 $("fp_ansicht").value=d.ansicht||"links";
 $("fp_material").value=findMeasurementMaterial(d.material)?.id??"";
 if(m.type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
 madSegments=(m.type==="mauerabdeckung"&&Array.isArray(d.segments))?d.segments.map(x=>({...x})):[];
 madSchieber=(m.type==="mauerabdeckung"&&Array.isArray(d.schieber))?d.schieber.map(x=>({...x})):[];
 if(m.type==="mauerabdeckung"){
  $("mad_material").value=String(measurementMaterialOrFallback(d.material).id||"");
  const pr=d.profil||{};
  $("mad_breite").value=pr.breite??310;
  $("mad_gefaelle").value=pr.gef??5;
  $("mad_hoeheLinks").value=pr.hL??50;
  $("mad_hoeheRechts").value=pr.hR??50;
  $("mad_umschlagLinks").value=pr.umL??15;
  $("mad_umschlagRechts").value=pr.umR??15;
  $("mad_saum").value=pr.saum??10;
  // Aeltere Massaufnahmen haben keine Biegewinkel gespeichert. Dann gilt
  // genau das frueher zwangslaeufige Ergebnis (Schenkel senkrecht).
  {const vg=madBiegeVorgabe(pr.gef??5);
   $("mad_biegeLinks").value=pr.wL??vg.links;
   $("mad_biegeRechts").value=pr.wR??vg.rechts;}
  $("mad_windexponiert").checked=!!pr.wind;
  $("mad_manuell").checked=true; // gespeicherte Schieber nicht überschreiben
  renderMadResult();
 }
 if(m.type==="lukarne"){
  $("luk_hoehe").value=d.hoehe??"";
  $("luk_laengeOben").value=d.laengeOben??"";
  $("luk_winkel").value=d.winkel??95;
  $("luk_achsabstand").value=d.achsabstand??lukAchsabstand;
  $("luk_hilfsriss").value=d.hilfsrissWunsch??d.hilfsriss??lukHilfsriss;
  $("luk_seite").value=d.seite==="links"?"links":"rechts";
  $("luk_material").value=findMeasurementMaterial(d.material)?.id??"";
  renderLukResult();
 }
 anbFormularFuellen(m.type==="anschlussblech"?d:null);
 $("anb_material").value=(m.type==="anschlussblech"&&findMeasurementMaterial(d.material))?findMeasurementMaterial(d.material).id:"";
 einfFormularFuellen(m.type==="einfassung_rund"?d:null);
 $("einf_material").value=(m.type==="einfassung_rund"&&findMeasurementMaterial(d.material))?findMeasurementMaterial(d.material).id:"";
 kehleFormularFuellen(m.type==="kehle"?d:null);
 rinneFormularFuellen(m.type==="rinne"?d:null);
 $("rp_material").value=(m.type==="rinne"&&findMeasurementMaterial(d.material))?findMeasurementMaterial(d.material).id:"";
 $("measurementsModal").hidden=true;
 $("measurementEditModal").hidden=false;
 updateMeasFormTitle();
}
