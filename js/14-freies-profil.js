"use strict";
// ---- Freies Profil ------------------------------------------------
let fpSchenkel=[];
let fpSegmente=[];
function generateProfilDiagramSvg(schenkel){
 if(!schenkel.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:20px">Noch keine Schenkel für die Zeichnung.</div>';
 let x=0,y=0,dir=0;
 const pts=[{x,y}];
 const dirs=[0];
 for(let i=0;i<schenkel.length;i++){
  const s=schenkel[i];
  if(i>0)dir+=Number(s.winkel)||0;
  dirs.push(dir);
  const rad=dir*Math.PI/180;
  x+=(Number(s.laenge)||0)*Math.cos(rad);
  y+=(Number(s.laenge)||0)*Math.sin(rad);
  pts.push({x,y});
 }
 const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
 const pad=30,target=240;
 const scale=Math.min(target/w,target/h);
 const toSvg=p=>[pad+(p.x-minX)*scale,pad+(p.y-minY)*scale];
 const svgW=target+2*pad,svgH=target+2*pad;
 const svgPtsRaw=pts.map(toSvg);
 // Ist Schenkel i ein Umschlag (180°)? Der wird als eigene, kurze, parallel versetzte Linie
 // mit kleinem Abstand gezeichnet, statt sich exakt mit dem vorherigen Schenkel zu decken.
 const GAP=6;
 function istUmschlag(i){
  if(i===0)return false;
  const winkelNorm=((Number(schenkel[i].winkel)||0)%360+360)%360;
  return Math.abs(winkelNorm-180)<0.5;
 }
 // Für jeden Schenkel die tatsächlich gezeichneten Endpunkte bestimmen (versetzt bei Umschlag)
 const drawEnds=schenkel.map((s,i)=>{
  const [x1,y1]=svgPtsRaw[i],[x2,y2]=svgPtsRaw[i+1];
  if(!istUmschlag(i))return[[x1,y1],[x2,y2]];
  const radDir=dirs[i+1]*Math.PI/180;
  const nx=-Math.sin(radDir),ny=Math.cos(radDir);
  return[[x1+nx*GAP,y1+ny*GAP],[x2+nx*GAP,y2+ny*GAP]];
 });
 // Zusammenhängende Abschnitte (ohne Umschlag-Schenkel) als je eine Polyline mit runden Ecken;
 // Umschlag-Schenkel werden als eigene kurze Linie gezeichnet (dadurch entsteht der Abstand).
 let lines="";
 let aktuellerPfad=[svgPtsRaw[0]];
 for(let i=0;i<schenkel.length;i++){
  if(istUmschlag(i)){
   if(aktuellerPfad.length>1){
    const pfadStr=aktuellerPfad.map(p=>`${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    lines+=`<polyline points="${pfadStr}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
   }
   const [[ux1,uy1],[ux2,uy2]]=drawEnds[i];
   lines+=`<line x1="${ux1.toFixed(1)}" y1="${uy1.toFixed(1)}" x2="${ux2.toFixed(1)}" y2="${uy2.toFixed(1)}" stroke="#17202a" stroke-width="4" stroke-linecap="round"/>`;
   aktuellerPfad=[svgPtsRaw[i+1]];
  }else{
   aktuellerPfad.push(svgPtsRaw[i+1]);
  }
 }
 if(aktuellerPfad.length>1){
  const pfadStr=aktuellerPfad.map(p=>`${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  lines+=`<polyline points="${pfadStr}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
 }
 let labels="",nums="";
 for(let i=0;i<schenkel.length;i++){
  const [[x1,y1],[x2,y2]]=drawEnds[i];
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len;
  const lx=mx-nx*14,ly=my-ny*14;
  let angleDeg=Math.atan2(dy,dx)*180/Math.PI;
  if(angleDeg>90||angleDeg<-90)angleDeg+=180;
  labels+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" fill="#1769aa" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700" transform="rotate(${angleDeg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${esc(schenkel[i].laenge||0)}</text>`;
  const numx=mx+nx*14,numy=my+ny*14;
  nums+=`<circle cx="${numx.toFixed(1)}" cy="${numy.toFixed(1)}" r="9" fill="#e07a1f"/><text x="${numx.toFixed(1)}" y="${(numy+3.2).toFixed(1)}" font-size="9" fill="#fff" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">${i+1}</text>`;
 }
 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:280px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${labels}${nums}</svg>`;
}
function renderFpSchenkelTable(){
 $("fp_schenkelBody").innerHTML=fpSchenkel.map((s,i)=>`<tr>
<td>${i+1}</td>
<td><input data-fp-schenkel-laenge="${i}" type="number" step="1" value="${s.laenge||0}"></td>
<td style="display:flex;gap:4px;align-items:center">
<input data-fp-schenkel-winkel="${i}" type="number" step="1" value="${s.winkel||0}" style="flex:1">
<button type="button" class="gray" data-fp-schenkel-flip="${i}" title="Winkel umkehren" style="padding:4px 6px">🔄</button>
<button type="button" class="gray" data-fp-schenkel-umschlag="${i}" title="Umschlag: Winkel auf 180° setzen" style="padding:4px 6px;font-size:10px;white-space:nowrap">180°</button>
</td>
<td><button type="button" class="red" data-fp-schenkel-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="4" class="small">Noch keine Schenkel. "+ Schenkel hinzufügen" klicken.</td></tr>';
 $("fp_profilDiagram").innerHTML=generateProfilDiagramSvg(fpSchenkel);
}
$("fp_addSchenkel").onclick=()=>{
 fpSchenkel.push({laenge:0,winkel:0});
 renderFpSchenkelTable();
 renderFpSegmenteList();
};
$("fp_sketchRecognize").onclick=()=>{
 openSketchFullscreen(null,null,async(dataUrl)=>{
  $("fp_sketchPreview").src=dataUrl;
  $("fp_sketchPreviewBox").hidden=false;
  $("fp_sketchStatus").textContent="🔄 Form wird erkannt …";
  try{
   const erkannt=await recognizeProfileSketch(dataUrl);
   if(!erkannt.length){$("fp_sketchStatus").textContent="⚠️ Keine Form erkannt. Bitte deutlicher skizzieren oder Schenkel manuell erfassen.";return}
   if(fpSchenkel.length&&!confirm(`${erkannt.length} Schenkel erkannt. Vorhandenes Profil ersetzen?`)){$("fp_sketchStatus").textContent="";return}
   fpSchenkel=erkannt;
   renderFpSchenkelTable();
   renderFpSegmenteList();
   $("fp_sketchStatus").textContent=`✓ ${erkannt.length} Schenkel übernommen. Bitte Längen und Winkel prüfen und mit den tatsächlichen Massen ergänzen – die Skizze liefert nur eine grobe Vorlage, keine echten Masse.`;
  }catch(err){
   $("fp_sketchStatus").textContent="Fehler bei der Erkennung: "+err.message;
  }
 });
};
async function recognizeProfileSketch(dataUrl){
 const res=await fetch(`${SUPABASE_URL}/functions/v1/extract-profile-shape`,{
  method:"POST",
  headers:{
   "Content-Type":"application/json",
   "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
   "apikey":SUPABASE_ANON_KEY
  },
  body:JSON.stringify({image_base64:dataUrl})
 });
 const text=await res.text();
 let data=null;
 try{data=JSON.parse(text)}catch{}
 if(!res.ok)throw new Error(`Server antwortete mit Status ${res.status}: ${(data&&data.error)||text.slice(0,300)||"unbekannter Fehler"}`);
 if(!data?.ok)throw new Error((data&&data.error)||"Erkennung fehlgeschlagen.");
 return (data.schenkel||[]).map((s,i)=>({laenge:Math.round(Number(s.laenge))||0,winkel:i===0?0:Math.round(Number(s.winkel))||0}));
}
$("fp_schenkelBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.fpSchenkelLaenge??e.target.dataset.fpSchenkelWinkel);
 if(Number.isNaN(i)||!fpSchenkel[i])return;
 if(e.target.dataset.fpSchenkelLaenge!==undefined)fpSchenkel[i].laenge=Number(e.target.value)||0;
 else if(e.target.dataset.fpSchenkelWinkel!==undefined)fpSchenkel[i].winkel=Number(e.target.value)||0;
 $("fp_profilDiagram").innerHTML=generateProfilDiagramSvg(fpSchenkel);
});
$("fp_schenkelBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-fp-schenkel-del]");
 if(del){fpSchenkel.splice(Number(del.dataset.fpSchenkelDel),1);renderFpSchenkelTable();renderFpSegmenteList();return}
 const flip=e.target.closest("[data-fp-schenkel-flip]");
 if(flip){const i=Number(flip.dataset.fpSchenkelFlip);if(fpSchenkel[i]){fpSchenkel[i].winkel=-(Number(fpSchenkel[i].winkel)||0);renderFpSchenkelTable();}return}
 const umschlag=e.target.closest("[data-fp-schenkel-umschlag]");
 if(umschlag){const i=Number(umschlag.dataset.fpSchenkelUmschlag);if(fpSchenkel[i]){fpSchenkel[i].winkel=180;renderFpSchenkelTable();}}
});
$("fp_konisch").addEventListener("change",renderFpSegmenteList);
function renderFpSegmenteList(){
 const konisch=$("fp_konisch").value==="ja";
 $("fp_segmenteList").innerHTML=fpSegmente.map((seg,i)=>{
  if(!seg.massen)seg.massen=[];
  const zeilen=fpSchenkel.map((s,j)=>{
   if(!seg.massen[j])seg.massen[j]={mass:0,links:0,rechts:0};
   const m=seg.massen[j];
   if(konisch){
    return `<tr><td>${j+1}</td><td><input data-fp-seg-mass-links="${i}_${j}" type="number" step="1" value="${m.links||0}"></td><td><input data-fp-seg-mass-rechts="${i}_${j}" type="number" step="1" value="${m.rechts||0}"></td></tr>`;
   }
   // Nicht konisch: das Mass ist über die ganze Länge gleich der Schenkellänge
   // aus dem Profil. Leere Felder werden deshalb direkt daraus gefüllt.
   if(!m.mass)m.mass=Number(s.laenge)||0;
   return `<tr><td>${j+1}</td><td><input data-fp-seg-mass="${i}_${j}" type="number" step="1" value="${m.mass}"></td></tr>`;
  }).join("");
  return `<div class="settings-section open" data-section="fp-seg-${i}" style="margin-bottom:10px">
<div class="settings-section-head" data-toggle-section="fp-seg-${i}"><h2>Segment ${i+1}</h2><span class="settings-section-chevron">›</span></div>
<div class="settings-section-body">
<div class="grid">
<div><label>Länge (mm)</label><input data-fp-seg-laenge="${i}" type="number" step="1" value="${seg.laenge||0}"></div>
</div>
<div class="scroll">
<table class="eb-table">
<colgroup><col style="width:20%"><col style="width:40%">${konisch?'<col style="width:40%">':""}</colgroup>
<thead><tr><th>Schenkel</th><th>${konisch?"Mass links (mm)":"Mass (mm)"}</th>${konisch?"<th>Mass rechts (mm)</th>":""}</tr></thead>
<tbody>${zeilen||'<tr><td colspan="3" class="small">Noch keine Schenkel im Profil definiert.</td></tr>'}</tbody>
</table>
</div>
<div class="bar">${konisch?"":`<button type="button" class="gray" data-fp-seg-uebernehmen="${i}">↩️ Masse aus Profil übernehmen</button>`}<button type="button" class="red" data-fp-seg-del="${i}">Segment löschen</button></div>
</div>
</div>`;
 }).join("")||'<div class="empty">Noch keine Segmente. "+ Segment hinzufügen" klicken.</div>';
 $("fp_summary").textContent=fpSegmente.length?`${fpSegmente.length} Segment(e) · ${fpSchenkel.length} Schenkel im Profil`:"";
}
$("fp_addSegment").onclick=()=>{
 fpSegmente.push({laenge:0,massen:fpSchenkel.map(s=>({mass:Number(s.laenge)||0,links:0,rechts:0}))});
 renderFpSegmenteList();
};
$("fp_segmenteList").addEventListener("input",e=>{
 const laengeIdx=e.target.dataset.fpSegLaenge;
 if(laengeIdx!==undefined){fpSegmente[Number(laengeIdx)].laenge=Number(e.target.value)||0;return}
 const massKey=e.target.dataset.fpSegMass,linksKey=e.target.dataset.fpSegMassLinks,rechtsKey=e.target.dataset.fpSegMassRechts;
 const key=massKey??linksKey??rechtsKey;
 if(key===undefined)return;
 const [segIdx,schenkelIdx]=key.split("_").map(Number);
 if(!fpSegmente[segIdx])return;
 if(!fpSegmente[segIdx].massen[schenkelIdx])fpSegmente[segIdx].massen[schenkelIdx]={mass:0,links:0,rechts:0};
 if(massKey!==undefined)fpSegmente[segIdx].massen[schenkelIdx].mass=Number(e.target.value)||0;
 else if(linksKey!==undefined)fpSegmente[segIdx].massen[schenkelIdx].links=Number(e.target.value)||0;
 else if(rechtsKey!==undefined)fpSegmente[segIdx].massen[schenkelIdx].rechts=Number(e.target.value)||0;
});
$("fp_segmenteList").addEventListener("click",e=>{
 const uebernehmen=e.target.closest("[data-fp-seg-uebernehmen]");
 if(uebernehmen){
  const seg=fpSegmente[Number(uebernehmen.dataset.fpSegUebernehmen)];
  if(seg){
   seg.massen=fpSchenkel.map((s,j)=>({
    mass:Number(s.laenge)||0,
    links:(seg.massen[j]&&seg.massen[j].links)||0,
    rechts:(seg.massen[j]&&seg.massen[j].rechts)||0
   }));
   renderFpSegmenteList();
  }
  return;
 }
 const del=e.target.closest("[data-fp-seg-del]");
 if(del){fpSegmente.splice(Number(del.dataset.fpSegDel),1);renderFpSegmenteList();}
});
function calcEbkPiece(p){
 return {
  massLinksEng:Math.max(0,(Number(p.massLinks)||0)-2),
  massRechtsEng:Math.max(0,(Number(p.massRechts)||0)-2)
 };
}
function ebkRestbreite(mass,abwicklung){
 const umschlagOben=Number(einlaufblechKonischSettings.umschlag_oben)||0;
 const umschlagUnten=Number(einlaufblechKonischSettings.umschlag_unten)||0;
 return Number(abwicklung)-(Number(mass)||0)-umschlagOben-umschlagUnten;
}
function ebkEngeSeite(){
 return $("ebk_montage").value==="links"?"rechts":"links";
}
function renderEbkDiagram(){
 const winkel=$("ebk_dachneigung").value;
 const abwicklung=$("ebk_abwicklung").value;
 const engeSeite=ebkEngeSeite();
 const masseAufEngerSeite=ebkPieces.map(p=>Number(engeSeite==="links"?p.massLinks:p.massRechts)||0).filter(v=>v>0);
 const repMass=masseAufEngerSeite.length?masseAufEngerSeite.reduce((a,b)=>a+b,0)/masseAufEngerSeite.length:null;
 const restBreite=repMass?(Number(abwicklung)-repMass-(Number(einlaufblechKonischSettings.umschlag_oben)||0)-(Number(einlaufblechKonischSettings.umschlag_unten)||0)):null;
 $("ebk_diagram").innerHTML=einlaufblechDiagramSvg(winkel,repMass,restBreite,einlaufblechKonischSettings.umschlag_oben,einlaufblechKonischSettings.umschlag_unten);
}
function renderEbkPiecesTable(){
 const abwicklung=$("ebk_abwicklung").value;
 const engeSeite=ebkEngeSeite();
 $("ebk_engHeader").textContent=`Eng ${engeSeite} (mm)`;
 $("ebk_engeSeiteHint").textContent=`Enges Mass wird bei Montage "von ${$("ebk_montage").value}" auf der ${engeSeite}en Seite jedes Stücks berechnet.`;
 $("ebk_piecesBody").innerHTML=ebkPieces.map((p,i)=>{
  const c=calcEbkPiece(p);
  const engWert=engeSeite==="links"?c.massLinksEng:c.massRechtsEng;
  const rbEng=ebkRestbreite(engeSeite==="links"?p.massLinks:p.massRechts,abwicklung);
  const warn=rbEng<0?' style="color:var(--red)"':"";
  return `<tr>
<td>${i+1}</td>
<td><input data-ebk-stossstoss="${i}" type="number" step="1" value="${p.stossStoss||0}"></td>
<td><input data-ebk-laenge="${i}" type="number" step="1" value="${p.laenge||0}"></td>
<td><input data-ebk-gl="${i}" type="checkbox" ${p.gehrungLinks?"checked":""}></td>
<td><input data-ebk-gr="${i}" type="checkbox" ${p.gehrungRechts?"checked":""}></td>
<td style="display:flex;gap:4px;align-items:center"><input data-ebk-winkel="${i}" type="number" step="1" value="${p.winkel||0}" style="flex:1"><button type="button" class="gray" data-ebk-flip="${i}" title="Winkel umkehren" style="padding:4px 8px">🔄</button></td>
<td><input data-ebk-ml="${i}" type="number" step="1" value="${p.massLinks||0}"></td>
<td><input data-ebk-mr="${i}" type="number" step="1" value="${p.massRechts||0}"></td>
<td${warn}>${engWert}${rbEng<0?" ⚠️":""}</td>
<td><button type="button" class="red" data-ebk-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`;
 }).join("")||'<tr><td colspan="10" class="small">Noch keine Stücke. "+ Stück hinzufügen" oder Stücke aus einer Rinne-Massaufnahme übernehmen.</td></tr>';
 const gesamtlaenge=ebkPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 const anyWarn=ebkPieces.some(p=>ebkRestbreite(engeSeite==="links"?p.massLinks:p.massRechts,abwicklung)<0);
 $("ebk_summary").textContent=ebkPieces.length?`${ebkPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${abwicklung} mm${anyWarn?" · ⚠️ Restbreite bei mind. einem Stück negativ":""}`:"";
 renderEbkDiagram();
 $("ebk_grundriss").innerHTML=generateEbkGrundriss(ebkPieces);
 $("ebk_toggleEndzugabeStart").textContent=`Endzugabe erstes Stück: ${(ebkPieces.length&&ebkPieces[ebkPieces.length-1].endzugabeStart)?"ein":"aus"}`;
 $("ebk_toggleEndzugabeEnd").textContent=`Endzugabe letztes Stück: ${(ebkPieces.length&&ebkPieces[ebkPieces.length-1].endzugabeEnd)?"ein":"aus"}`;
}
function toggleEbkEndzugabe(position){
 if(!ebkPieces.length){alert("Bitte zuerst Stücke erfassen.");return}
 const endZugabe=Number(einlaufblechKonischSettings.end_zugabe)||0;
 if(!endZugabe){alert("Bitte zuerst in Einstellungen → Massaufnahmen eine Endzugabe > 0 mm hinterlegen.");return}
 // Die Endzugabe wird immer auf das Reststück (letztes Stück) gerechnet, nie auf ein reguläres
 // Stück, da kein Stück länger als Länge Stoss bis Stoss + Überlappung sein darf (ausser dem Reststück).
 const idx=ebkPieces.length-1;
 const flagKey=position==="start"?"endzugabeStart":"endzugabeEnd";
 const piece=ebkPieces[idx];
 if(piece[flagKey]){
  piece.laenge=Math.max(0,(Number(piece.laenge)||0)-piece[flagKey]);
  piece[flagKey]=0;
 }else{
  piece.laenge=(Number(piece.laenge)||0)+endZugabe;
  piece[flagKey]=endZugabe;
 }
 renderEbkPiecesTable();
}
$("ebk_toggleEndzugabeStart").onclick=()=>toggleEbkEndzugabe("start");
$("ebk_toggleEndzugabeEnd").onclick=()=>toggleEbkEndzugabe("end");
$("ebk_montage").addEventListener("change",renderEbkPiecesTable);
$("ebk_dachneigung").addEventListener("input",renderEbkDiagram);
$("ebk_addPiece").onclick=()=>{
 const stossStoss=Number(einlaufblechKonischSettings.stoss_laenge)||2000;
 const defaultLen=stossStoss+(Number(einlaufblechKonischSettings.ueberlappung)||0);
 const prev=ebkPieces[ebkPieces.length-1];
 ebkPieces.push({laenge:defaultLen,stossStoss,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:prev?prev.massRechts:0,massRechts:0});
 renderEbkPiecesTable();
};
$("ebk_piecesBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.ebkStossstoss??e.target.dataset.ebkLaenge??e.target.dataset.ebkWinkel??e.target.dataset.ebkMl??e.target.dataset.ebkMr);
 if(Number.isNaN(i)||!ebkPieces[i])return;
 if(e.target.dataset.ebkStossstoss!==undefined){
  ebkPieces[i].stossStoss=Number(e.target.value)||0;
  const ueberlappung=Number(einlaufblechKonischSettings.ueberlappung)||0;
  ebkPieces[i].laenge=ebkPieces[i].stossStoss+ueberlappung;
  const row0=e.target.closest("tr");
  const laengeInput=row0?row0.querySelector(`[data-ebk-laenge="${i}"]`):null;
  if(laengeInput)laengeInput.value=ebkPieces[i].laenge;
 }
 else if(e.target.dataset.ebkLaenge!==undefined)ebkPieces[i].laenge=Number(e.target.value)||0;
 else if(e.target.dataset.ebkWinkel!==undefined)ebkPieces[i].winkel=Number(e.target.value)||0;
 else if(e.target.dataset.ebkMl!==undefined)ebkPieces[i].massLinks=Number(e.target.value)||0;
 else if(e.target.dataset.ebkMr!==undefined){
  ebkPieces[i].massRechts=Number(e.target.value)||0;
  if(ebkPieces[i+1]){
   ebkPieces[i+1].massLinks=ebkPieces[i].massRechts;
   const nextInput=document.querySelector(`[data-ebk-ml="${i+1}"]`);
   if(nextInput)nextInput.value=ebkPieces[i+1].massLinks;
   const nextRow=nextInput?nextInput.closest("tr"):null;
   if(nextRow&&nextRow.children[8]){
    const c2=calcEbkPiece(ebkPieces[i+1]);
    const engeSeite2=ebkEngeSeite();
    const engWert2=engeSeite2==="links"?c2.massLinksEng:c2.massRechtsEng;
    const rbEng2=ebkRestbreite(engeSeite2==="links"?ebkPieces[i+1].massLinks:ebkPieces[i+1].massRechts,$("ebk_abwicklung").value);
    nextRow.children[8].textContent=`${engWert2}${rbEng2<0?" ⚠️":""}`;
    nextRow.children[8].style.color=rbEng2<0?"var(--red)":"";
   }
  }
 }
 const row=e.target.closest("tr");
 if(row&&row.children[8]){
  const c=calcEbkPiece(ebkPieces[i]);
  const engeSeite=ebkEngeSeite();
  const engWert=engeSeite==="links"?c.massLinksEng:c.massRechtsEng;
  const rbEng=ebkRestbreite(engeSeite==="links"?ebkPieces[i].massLinks:ebkPieces[i].massRechts,$("ebk_abwicklung").value);
  row.children[8].textContent=`${engWert}${rbEng<0?" ⚠️":""}`;
  row.children[8].style.color=rbEng<0?"var(--red)":"";
 }
 const gesamtlaenge=ebkPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 $("ebk_summary").textContent=`${ebkPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${$("ebk_abwicklung").value} mm`;
 if(e.target.dataset.ebkMl!==undefined||e.target.dataset.ebkMr!==undefined)renderEbkDiagram();
 if(e.target.dataset.ebkLaenge!==undefined||e.target.dataset.ebkStossstoss!==undefined||e.target.dataset.ebkWinkel!==undefined)$("ebk_grundriss").innerHTML=generateEbkGrundriss(ebkPieces);
});
$("ebk_piecesBody").addEventListener("change",e=>{
 const i=Number(e.target.dataset.ebkGl??e.target.dataset.ebkGr);
 if(Number.isNaN(i)||!ebkPieces[i])return;
 const zugabe=Number(einlaufblechKonischSettings.gehrungszugabe)||0;
 if(e.target.dataset.ebkGl!==undefined){
  const war=ebkPieces[i].gehrungLinks;
  ebkPieces[i].gehrungLinks=e.target.checked;
  if(e.target.checked&&!war){ebkPieces[i].laenge=(Number(ebkPieces[i].laenge)||0)+zugabe;ebkPieces[i].winkel=90;}
  else if(!e.target.checked&&war)ebkPieces[i].laenge=Math.max(0,(Number(ebkPieces[i].laenge)||0)-zugabe);
 }else if(e.target.dataset.ebkGr!==undefined){
  const war=ebkPieces[i].gehrungRechts;
  ebkPieces[i].gehrungRechts=e.target.checked;
  if(e.target.checked&&!war){ebkPieces[i].laenge=(Number(ebkPieces[i].laenge)||0)+zugabe;ebkPieces[i].winkel=90;}
  else if(!e.target.checked&&war)ebkPieces[i].laenge=Math.max(0,(Number(ebkPieces[i].laenge)||0)-zugabe);
 }
 if(!ebkPieces[i].gehrungLinks&&!ebkPieces[i].gehrungRechts)ebkPieces[i].winkel=0;
 renderEbkPiecesTable();
});
$("ebk_piecesBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-ebk-del]");
 if(del){ebkPieces.splice(Number(del.dataset.ebkDel),1);renderEbkPiecesTable();return}
 const flip=e.target.closest("[data-ebk-flip]");
 if(flip){
  const i=Number(flip.dataset.ebkFlip);
  if(!ebkPieces[i])return;
  ebkPieces[i].winkel=-(Number(ebkPieces[i].winkel)||0);
  renderEbkPiecesTable();
 }
});
$("ebk_abwicklung").addEventListener("change",renderEbkPiecesTable);

let ebkRinneCache=[];
async function refreshEbkRinneList(){
 if(!measSelectedProjectId){
  $("ebk_rinneHint").hidden=false;
  $("ebk_rinneHint").textContent="Bitte zuerst oben ein Projekt auswählen.";
  $("ebk_rinneList").hidden=true;
  return;
 }
 const {data,error}=await sb.from("measurements").select("*").eq("project_id",measSelectedProjectId).eq("type","rinne_halbrund").order("date",{ascending:false});
 if(error){$("ebk_rinneHint").hidden=false;$("ebk_rinneHint").textContent="Fehler beim Laden: "+error.message;$("ebk_rinneList").hidden=true;return}
 ebkRinneCache=data||[];
 if(!ebkRinneCache.length){
  $("ebk_rinneHint").hidden=false;
  $("ebk_rinneHint").textContent="Für dieses Projekt sind noch keine Rinne-Halbrund-Massaufnahmen gespeichert.";
  $("ebk_rinneList").hidden=true;
  return;
 }
 $("ebk_rinneHint").hidden=true;
 $("ebk_rinneList").hidden=false;
 $("ebk_rinneList").innerHTML=ebkRinneCache.map(m=>{
  const segCount=(m.data&&m.data.segments&&m.data.segments.length)||0;
  return `<div class="meas-row">
<div class="meas-row-info"><b>${esc(m.title||"Ohne Titel")}</b><span>${esc(m.date||"–")} · ${segCount} Segment(e)</span></div>
<div class="meas-row-actions"><button type="button" class="blue" data-pick-ebk-rinne="${m.id}">↩️ Übernehmen</button></div>
</div>`;
 }).join("");
}
$("ebk_rinneList").addEventListener("click",e=>{
 const btn=e.target.closest("[data-pick-ebk-rinne]");
 if(!btn)return;
 const m=ebkRinneCache.find(x=>x.id===Number(btn.dataset.pickEbkRinne));
 const segs=(m&&m.data&&m.data.segments)||[];
 if(!segs.length){alert("Diese Rinnen-Massaufnahme hat keine Segmente.");return}
 if(ebkPieces.length&&!confirm("Vorhandene Stücke werden durch die aus dieser Rinne erzeugten Stücke ersetzt. Fortfahren?"))return;
 const gehrungszugabe=Number(einlaufblechKonischSettings.gehrungszugabe)||0;
 const neuePieces=[];
 segs.forEach((seg,i)=>{
  const gehrungLinks=i>0&&Number(segs[i-1].winkel||0)!==0;
  const gehrungRechts=Number(seg.winkel||0)!==0;
  const zugabe=(gehrungLinks?gehrungszugabe:0)+(gehrungRechts?gehrungszugabe:0);
  const effLaenge=(Number(seg.laenge)||0)+zugabe;
  const lengths=splitLengthIntoPieces(effLaenge);
  lengths.forEach((len,j)=>{
   const prev=neuePieces[neuePieces.length-1];
   const istLetztes=j===lengths.length-1;
   neuePieces.push({
    laenge:len,
    stossStoss:istLetztes?len:(Number(einlaufblechKonischSettings.stoss_laenge)||0),
    gehrungLinks:j===0?gehrungLinks:false,
    gehrungRechts:istLetztes?gehrungRechts:false,
    winkel:istLetztes?(Number(seg.winkel)||0):0,
    massLinks:prev?prev.massRechts:0,massRechts:0
   });
  });
 });
 ebkPieces=neuePieces;
 renderEbkPiecesTable();
 alert(`${neuePieces.length} Stück(e) aus ${segs.length} Segment(en) übernommen. Bitte jetzt pro Stück Mass links/rechts eintragen.`);
});
