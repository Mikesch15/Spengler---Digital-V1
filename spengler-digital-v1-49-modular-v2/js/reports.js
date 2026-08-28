/* Spengler Digital V1.49 – extracted module; logic unchanged */
function openReport(r){
 isDirty=false;
 currentProjectId=r.project_id;
 currentReportId=r.id;
 currentReportMeta={created_by:r.created_by,created_at:r.created_at,updated_by:r.updated_by,updated_at:r.updated_at};
 works=(r.work_entries&&r.work_entries.length)?r.work_entries:[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=r.material_entries||[];
 $("date").value=r.date||"";
 $("orderNo").value=r.order_no||"";
 $("customer").value=r.customer||"";
 $("object").value=r.object||"";
 $("vat").value=r.vat||"8.1 %";
 $("projectsModal").hidden=true;
 $("reportsModal").hidden=true;
 $("startScreen").hidden=true;
 $("reportScreen").hidden=false;
 renderProjectSelect();
 renderMain();
}
$("startOpenProjects").onclick=()=>{renderProjectList();$("projectsModal").hidden=false};
$("navMeasurements").onclick=async()=>{$("measurementsModal").hidden=false;await renderMeasurementsOverview()};
$("newMeasurement").onclick=()=>{$("measurementsModal").hidden=true;$("measTypeChooserModal").hidden=false};
$("cancelMeasTypeChooser").onclick=()=>{$("measTypeChooserModal").hidden=true;$("measurementsModal").hidden=false};
$("measTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-meas-type]");
 if(!b)return;
 $("measTypeChooserModal").hidden=true;
 newMeasurementWithType(b.dataset.chooseMeasType);
});
$("navAusmass").onclick=async()=>{$("ausmassModal").hidden=false;await renderAusmassOverview()};
$("newAusmass").onclick=()=>{$("ausmassModal").hidden=true;$("amTypeChooserModal").hidden=false};
$("cancelAmTypeChooser").onclick=()=>{$("amTypeChooserModal").hidden=true;$("ausmassModal").hidden=false};
$("amTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-am-type]");
 if(!b)return;
 $("amTypeChooserModal").hidden=true;
 newAusmassWithType(b.dataset.chooseAmType);
});
$("closeProjects").onclick=()=>{$("projectsModal").hidden=true};
$("addProject").onclick=async()=>{
 const name=$("newProjectName").value.trim();
 const orderNo=$("newProjectOrderNo").value.trim();
 const address=$("newProjectObject").value.trim();
 if(!name){alert("Bitte einen Projektnamen eingeben.");return}
 if(!orderNo){alert("Bitte eine Auftrags-Nr. eingeben.");return}
 if(!address){alert("Bitte eine Adresse eingeben.");return}
 const {error}=await sb.from("projects").insert({
  name,
  order_no:orderNo,
  customer:$("newProjectCustomer").value.trim(),
  object:address
 });
 if(error){alert("Fehler: "+error.message);return}
 $("newProjectName").value="";$("newProjectOrderNo").value="";$("newProjectCustomer").value="";$("newProjectObject").value="";
 const {data}=await sb.from("projects").select("*").order("name");
 allProjects=data||[];
 renderProjectList();renderProjectSelect();
};
$("toggleArchivedProjects").onclick=()=>{
 showArchivedProjects=!showArchivedProjects;
 $("toggleArchivedProjects").textContent=showArchivedProjects?"📦 Nur aktive anzeigen":"📦 Archivierte anzeigen";
 renderProjectList();
};
$("projectList").addEventListener("click",async e=>{
 const arch=e.target.closest("[data-archive-project]");
 if(arch){
  const id=Number(arch.dataset.archiveProject);
  const proj=allProjects.find(x=>x.id===id);
  const {error}=await sb.from("projects").update({archived:!proj.archived}).eq("id",id);
  if(error){alert("Fehler: "+error.message);return}
  const {data}=await sb.from("projects").select("*").order("name");
  allProjects=data||[];
  renderProjectList();
  return;
 }
 const del=e.target.closest("[data-del-project]");
 if(del){
  if(!confirm("Projekt wirklich löschen? Gespeicherte Rapporte bleiben erhalten, verlieren aber die Projekt-Zuordnung."))return;
  await sb.from("projects").delete().eq("id",Number(del.dataset.delProject));
  const {data}=await sb.from("projects").select("*").order("name");
  allProjects=data||[];
  renderProjectList();renderProjectSelect();
  return;
 }
 const toggle=e.target.closest("[data-toggle-reports]");
 if(toggle){
  const id=Number(toggle.dataset.toggleReports);
  const box=document.querySelector(`[data-reports-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggle.textContent=willOpen?"📋 Rapporte ausblenden":"📋 Rapporte anzeigen";
  if(willOpen)await loadProjectReports(id);
  return;
 }
 const toggleM=e.target.closest("[data-toggle-measurements]");
 if(toggleM){
  const id=Number(toggleM.dataset.toggleMeasurements);
  const box=document.querySelector(`[data-measurements-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggleM.textContent=willOpen?"📐 Massaufnahmen ausblenden":"📐 Massaufnahmen anzeigen";
  if(willOpen)await loadProjectMeasurements(id);
  return;
 }
 const toggleA=e.target.closest("[data-toggle-ausmass]");
 if(toggleA){
  const id=Number(toggleA.dataset.toggleAusmass);
  const box=document.querySelector(`[data-ausmass-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggleA.textContent=willOpen?"📏 Ausmasse ausblenden":"📏 Ausmasse anzeigen";
  if(willOpen)await loadProjectAusmass(id);
  return;
 }
 const open=e.target.closest("[data-open-report]");
 if(open){
  const id=Number(open.dataset.openReport);
  const {data,error}=await sb.from("reports").select("*").eq("id",id).maybeSingle();
  if(error||!data){alert("Fehler beim Laden: "+(error?error.message:"Rapport nicht gefunden"));return}
  openReport(data);
  return;
 }
 const openM=e.target.closest("[data-open-project-measurement]");
 if(openM){
  const id=Number(openM.dataset.openProjectMeasurement);
  const m=projectMeasurementsCache.find(x=>x.id===id);
  if(m){
   measEditReturnTo="projectsModal";
   $("projectsModal").hidden=true;
   openMeasurement(m);
  }
  return;
 }
 const printM=e.target.closest("[data-print-project-measurement]");
 if(printM){
  const id=Number(printM.dataset.printProjectMeasurement);
  const m=projectMeasurementsCache.find(x=>x.id===id);
  if(m)printMeasurement(m);
  return;
 }
 const delM=e.target.closest("[data-del-project-measurement]");
 if(delM){
  if(!confirm("Diese Massaufnahme wirklich löschen?"))return;
  const id=Number(delM.dataset.delProjectMeasurement);
  await sb.from("measurements").delete().eq("id",id);
  const projRow=delM.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-measurements]").dataset.toggleMeasurements);
  await loadProjectMeasurements(projId);
  return;
 }
 const openA=e.target.closest("[data-open-project-ausmass]");
 if(openA){
  const id=Number(openA.dataset.openProjectAusmass);
  const a=projectAusmassCache.find(x=>x.id===id);
  if(a){
   amEditReturnTo="projectsModal";
   $("projectsModal").hidden=true;
   openAusmass(a);
  }
  return;
 }
 const printA=e.target.closest("[data-print-project-ausmass]");
 if(printA){
  const id=Number(printA.dataset.printProjectAusmass);
  const a=projectAusmassCache.find(x=>x.id===id);
  if(a)printAusmass(a);
  return;
 }
 const delA=e.target.closest("[data-del-project-ausmass]");
 if(delA){
  if(!confirm("Dieses Ausmass wirklich löschen?"))return;
  const id=Number(delA.dataset.delProjectAusmass);
  await sb.from("ausmass").delete().eq("id",id);
  const projRow=delA.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-ausmass]").dataset.toggleAusmass);
  await loadProjectAusmass(projId);
  return;
 }
 const delRep=e.target.closest("[data-del-report]");
 if(delRep){
  if(!confirm("Diesen Rapport wirklich löschen?"))return;
  const id=Number(delRep.dataset.delReport);
  await sb.from("reports").delete().eq("id",id);
  if(currentReportId===id)currentReportId=null;
  const projRow=delRep.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-reports]").dataset.toggleReports);
  await loadProjectReports(projId);
 }
});

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

function renderSketchGallery(){
 $("measSketchGallery").innerHTML=measSketches.map((src,i)=>`<div class="sketch-thumb-wrap">
<img class="sketch-thumb" src="${src}">
<div class="sketch-thumb-actions">
<button type="button" class="gray" data-edit-sketch="${i}">✏️</button>
<button type="button" class="red" data-remove-sketch="${i}">✕</button>
</div>
</div>`).join("")||'<div class="small" style="color:var(--muted)">Noch keine Skizze</div>';
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
function openSketchFullscreen(bgSrc,editIndex,doneCallback){
 sketchEditIndex=(typeof editIndex==="number")?editIndex:null;
 sketchDoneCallback=doneCallback||null;
 const overlay=$("sketchFullscreen"),canvas=$("fsSketchCanvas"),viewport=$("sketchViewport");
 overlay.hidden=false;
 canvas.width=SKETCH_W;canvas.height=SKETCH_H;
 setPanMode(false);
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
  if(typeof bgSrc==="string"&&bgSrc){
   const img=new Image();
   img.crossOrigin="anonymous";
   img.onload=()=>{
    const scale=Math.min(SKETCH_W/img.width,SKETCH_H/img.height);
    const w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(SKETCH_W-w)/2,(SKETCH_H-h)/2,w,h);
   };
   img.src=bgSrc;
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

