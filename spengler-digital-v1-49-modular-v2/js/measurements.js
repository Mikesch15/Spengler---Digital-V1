/* Spengler Digital V1.49 – extracted module; logic unchanged */
function setMeasProjectField(projId){
 measSelectedProjectId=projId||null;
 const proj=allProjects.find(x=>x.id===measSelectedProjectId);
 $("measProjectSearch").value=proj?proj.name:"";
 $("measProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
 if($("measType").value==="einlaufblech_konisch")refreshEbkRinneList();
}
$("measProjectResults").addEventListener("click",e=>{
 const it=e.target.closest("[data-pick-meas-project]");if(!it)return;
 setMeasProjectField(Number(it.dataset.pickMeasProject));
 $("measProjectResults").innerHTML="";
});

function newMeasurementWithType(type){
 isDirty=false;
 measEditReturnTo="measurementsModal";
 currentMeasurementId=null;
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
 renderSketchGallery();
 $("eb_gesamtlaenge").value="";
 $("eb_massA").value="";
 $("eb_winkel").value="";
 $("eb_abwicklung").value="250";
 $("eb_montage").value="links";
 ebPieces=[];
 renderEbPiecesTable();
 rinneSegments=[];
 rinneDilas=[];
 $("rinne_abwicklung").value="250";
 $("rinne_material").value="titanzink";
 renderRinneResult();
 ebkPieces=[];
 $("ebk_abwicklung").value="250";
 $("ebk_dachneigung").value="";
 $("ebk_montage").value="links";
 renderEbkPiecesTable();
 fpSchenkel=[];
 fpSegmente=[];
 $("fp_konisch").value="nein";
 renderFpSchenkelTable();
 renderFpSegmenteList();
 setMeasProjectField(currentProjectId);
 $("measurementsModal").hidden=true;
 $("measurementEditModal").hidden=false;
 updateMeasFormTitle();
}
function updateMeasFormTitle(){
 const labels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade"};
 const h2=document.querySelector("#measurementEditModal h2");
 if(h2)h2.textContent=`📐 Massaufnahme – ${labels[$("measType").value]||""}`;
}
function openMeasurement(m){
 isDirty=false;
 currentMeasurementId=m.id;
 $("printMeasurementBtn").hidden=false;
 $("measTitle").value=m.title||"";
 $("measNote").value=m.note||"";
 $("measDate").value=m.date||new Date().toISOString().slice(0,10);
 $("measType").value=m.type||"skizze_foto";
 showMeasTypeSection($("measType").value);
 setMeasProjectField(m.project_id);
 measPhotoDataUrl=null;
 measExistingPhotoUrl=m.photo_path||null;
 $("measPhotoInput").value="";
 if(measExistingPhotoUrl){$("measPhotoPreview").src=measExistingPhotoUrl;$("measPhotoPreview").hidden=false;$("measPhotoRemove").hidden=false;$("drawOnPhoto").hidden=false}
 else{$("measPhotoPreview").hidden=true;$("measPhotoPreview").src="";$("measPhotoRemove").hidden=true;$("drawOnPhoto").hidden=true}
 measSketches=(m.sketch_paths&&m.sketch_paths.length)?[...m.sketch_paths]:(m.sketch_path?[m.sketch_path]:[]);
 renderSketchGallery();
 const d=m.data||{};
 $("eb_gesamtlaenge").value=d.gesamtlaenge||"";
 $("eb_massA").value=d.massA||"";
 $("eb_winkel").value=d.winkel||"";
 $("eb_abwicklung").value=d.abwicklung||"250";
 $("eb_montage").value=d.montage||"links";
 ebPieces=(m.type==="einlaufblech_gerade"&&Array.isArray(d.pieces))?d.pieces.map(p=>({...p})):[];
 if(m.type==="einlaufblech_gerade")renderEbPiecesTable();
 rinneSegments=(m.type==="rinne_halbrund"&&Array.isArray(d.segments))?d.segments.map(s=>({...s})):[];
 rinneDilas=(m.type==="rinne_halbrund"&&Array.isArray(d.dilas))?d.dilas.map(dd=>({...dd})):[];
 $("rinne_abwicklung").value=d.rinneAbwicklung||"250";
 $("rinne_material").value=d.material||"titanzink";
 if(m.type==="rinne_halbrund")renderRinneResult();
 ebkPieces=(m.type==="einlaufblech_konisch"&&Array.isArray(d.pieces))?d.pieces.map(p=>({...p})):[];
 $("ebk_abwicklung").value=d.abwicklung||"250";
 $("ebk_dachneigung").value=d.dachneigung||"";
 $("ebk_montage").value=d.montage||"links";
 if(m.type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 fpSchenkel=(m.type==="freies_profil"&&Array.isArray(d.schenkel))?d.schenkel.map(s=>({...s})):[];
 fpSegmente=(m.type==="freies_profil"&&Array.isArray(d.segmente))?d.segmente.map(s=>({...s,massen:(s.massen||[]).map(mm=>({...mm}))})):[];
 $("fp_konisch").value=d.konisch?"ja":"nein";
 if(m.type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
 $("measurementsModal").hidden=true;
 $("measurementEditModal").hidden=false;
 updateMeasFormTitle();
}
// ---- Einlaufblech gerade ---------------------------------------
// Schnittzeichnung: zeigt, was mit "Mass A" und "Winkel" gemeint ist.
// Eigenständiges SVG (feste Farben statt CSS-Variablen), damit es identisch
// in der App und im PDF-Druckfenster (eigenes Dokument, ohne Zugriff auf die
// Haupt-Stylesheet-Variablen) angezeigt wird.
function einlaufblechDiagramSvg(winkel,massA,restBreite,umschlagOben,umschlagUnten){
 const cx=90, cy=100;
 const w=Number(winkel)>0?Number(winkel):null;
 const thetaUpDeg=w?(180-w):52.66; // Winkel von "oben" gemessen (für die Zeichnung), Eingabe ist von A aus gemessen
 const thetaUp=thetaUpDeg*Math.PI/180;

 const dirVec=deg=>{const r=deg*Math.PI/180;return [Math.sin(r),-Math.cos(r)]};
 const addV=(p,v,d)=>[p[0]+v[0]*d,p[1]+v[1]*d];
 const fmt=p=>`${p[0].toFixed(1)},${p[1].toFixed(1)}`;
 function hairpin(origin,inAngleDeg,length){
  const turn=-131;
  const apex=addV(origin,dirVec(inAngleDeg),length*0.6);
  const tip=addV(apex,dirVec(inAngleDeg+turn),length*0.55);
  const rr=Math.min(5,length*0.18);
  const p1=addV(apex,dirVec(inAngleDeg+180),rr);
  const p2=addV(apex,dirVec(inAngleDeg+turn),rr);
  return {apex,tip,p1,p2};
 }

 // Reelle Masse (mm) - mit Platzhalterwerten, solange noch nichts eingegeben ist
 const mA=Number(massA)>0?Number(massA):120;
 const rB=Number(restBreite)>0?Number(restBreite):90;
 const uO=Number(umschlagOben)>0?Number(umschlagOben):15;
 const uU=Number(umschlagUnten)>0?Number(umschlagUnten):15;

 const scale=150/Math.max(mA,rB,1);
 const aLen=Math.max(30,mA*scale);
 const rLen=Math.max(30,rB*scale);
 const foldU=Math.max(14,uU*scale);
 const foldO=Math.max(14,uO*scale);

 const aEnd=addV([cx,cy],dirVec(180),aLen);
 const hU=hairpin(aEnd,180,foldU);
 const dEnd=addV([cx,cy],dirVec(thetaUpDeg),rLen);
 const hO=hairpin(dEnd,thetaUpDeg,foldO);

 const R=28;
 const arcStart=[cx,cy+R];
 const arcEnd=[cx+R*Math.sin(thetaUp),cy-R*Math.cos(thetaUp)];
 const bisector=(thetaUp+Math.PI)/2;
 const labelPt=[cx+(R+16)*Math.sin(bisector),cy-(R+16)*Math.cos(bisector)];
 const label=w?`${w}°`:"Winkel";

 const Ax=cx-35, Ay1=cy, Ay2=hU.apex[1];

 // viewBox dynamisch aus allen tatsächlich gezeichneten Punkten berechnen,
 // damit die Zeichnung bei jedem Winkel/Mass zentriert bleibt, ohne Leerraum
 // und ohne Gefahr des Abschneidens.
 const allPts=[[cx,cy],aEnd,hU.p1,hU.apex,hU.p2,hU.tip,dEnd,hO.p1,hO.apex,hO.p2,hO.tip,[Ax-25,Ay1],[Ax,Ay2],arcStart,arcEnd,labelPt];
 const padTextRight=70, padTextLeft=14, padY=20;
 const xs=allPts.map(p=>p[0]), ys=allPts.map(p=>p[1]);
 const minX=Math.min(...xs)-padTextLeft, maxX=Math.max(...xs)+padTextRight;
 const minY=Math.min(...ys)-padY, maxY=Math.max(...ys)+padY;
 const vbW=maxX-minX, vbH=maxY-minY;

 return `<svg viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}" style="width:100%;max-width:220px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${fmt([cx,cy])} L ${fmt(aEnd)} L ${fmt(hU.p1)} Q ${fmt(hU.apex)} ${fmt(hU.p2)} L ${fmt(hU.tip)}" fill="none" stroke="#17202a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${fmt([cx,cy])} L ${fmt(dEnd)} L ${fmt(hO.p1)} Q ${fmt(hO.apex)} ${fmt(hO.p2)} L ${fmt(hO.tip)}" fill="none" stroke="#17202a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${Ax}" y1="${Ay1}" x2="${Ax}" y2="${Ay2.toFixed(1)}" stroke="#1769aa" stroke-width="3" stroke-linecap="round"/>
  <path d="M${Ax-7},${Ay1+9} L${Ax},${Ay1} L${Ax+7},${Ay1+9}" fill="none" stroke="#1769aa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${Ax-7},${(Ay2-9).toFixed(1)} L${Ax},${Ay2.toFixed(1)} L${Ax+7},${(Ay2-9).toFixed(1)}" fill="none" stroke="#1769aa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${Ax-25}" y="${((Ay1+Ay2)/2).toFixed(1)}" font-size="16" font-weight="700" fill="#1769aa" font-family="Arial,Helvetica,sans-serif">A</text>
  <path d="M ${fmt(arcStart)} A ${R},${R} 0 0,0 ${fmt(arcEnd)}" fill="none" stroke="#68737d" stroke-width="1.5"/>
  <text x="${labelPt[0].toFixed(1)}" y="${labelPt[1].toFixed(1)}" font-size="13" fill="#68737d" font-family="Arial,Helvetica,sans-serif">${label}</text>
 </svg>`;
}
// ---- Rinne Halbrund ---------------------------------------------
let rinneSegments=[];
let rinneDilas=[];
function calcRinneSegment(seg){
 const laenge=Number(seg.laenge)||0;
 const linksF=rinneFittingTypes.find(f=>f.id===Number(seg.linksTyp));
 const rechtsF=rinneFittingTypes.find(f=>f.id===Number(seg.rechtsTyp));
 const linksMass=linksF?Number(linksF.mass_mm)||0:0;
 const rechtsMass=rechtsF?Number(rechtsF.mass_mm)||0:0;
 return laenge+linksMass+rechtsMass;
}
// ---- Rinne Halbrund: automatische Dilatationselement-Platzierung ----
// Werte gemäss Fachliteratur "Spenglerarbeiten", Kap. 4.1.5 "Ausdehnung".
const RINNE_AUSDEHNUNG_TABELLE={
 aluminium:{label:"Aluminium",mitDehnungselement:4000,abFixpunkten:2000,freiEnden:8000,ausdehnungProM:2.4},
 titanzink:{label:"Titanzink",mitDehnungselement:5000,abFixpunkten:2500,freiEnden:10000,ausdehnungProM:2.1},
 kupfer:{label:"Kupfer",mitDehnungselement:6000,abFixpunkten:3000,freiEnden:12000,ausdehnungProM:1.7},
 crni_stahl:{label:"CrNi-Stahl",mitDehnungselement:6000,abFixpunkten:3000,freiEnden:12000,ausdehnungProM:1.6},
 chromstahl_verzinnt:{label:"Chromstahl, verzinnt",mitDehnungselement:8000,abFixpunkten:4000,freiEnden:16000,ausdehnungProM:1.1},
 stahl_verzinkt:{label:"Stahl, verzinkt",mitDehnungselement:8000,abFixpunkten:4000,freiEnden:16000,ausdehnungProM:1.2},
};
function calcDilaPositionsInStretch(L,leftMax,rightMax,middleMax){
 if(L<=0)return[];
 if(L<=Math.min(leftMax,rightMax))return[];
 let n=1;
 while(leftMax+(n-1)*middleMax+rightMax<L-1e-6)n++;
 if(n===1){
  // Möglichst in der Mitte der Strecke platzieren; nur wenn das eine der beiden
  // Maximaldistanzen verletzen würde, so weit wie nötig zu dieser Grenze hin verschieben.
  const ideal=L/2;
  let pos;
  if(ideal>leftMax)pos=leftMax;
  else if(L-ideal>rightMax)pos=L-rightMax;
  else pos=ideal;
  return[pos];
 }
 const remaining=L-leftMax-rightMax;
 const gapSize=remaining/(n-1);
 const positions=[leftMax];
 for(let i=1;i<n;i++)positions.push(positions[i-1]+gapSize);
 return positions;
}
function isRinneFixpunkt(typId){
 if(!typId)return false;
 const f=rinneFittingTypes.find(x=>x.id===Number(typId));
 return !!(f&&f.is_fixpunkt);
}
function isRinneSchiebestutzen(typId){
 if(!typId)return false;
 const f=rinneFittingTypes.find(x=>x.id===Number(typId));
 return !!(f&&f.is_schiebestutzen);
}
function computeRinneBoundaries(segments){
 // Grenzpunkte entlang des ganzen Verlaufs: 0 = Start von Segment 0, ..., N = Ende des letzten Segments.
 // "fix" = Fixpunkt (strengere Regel), "schiebe" = Schiebestutzen (ersetzt funktional eine Dila,
 // dort gilt die grosszügigere "Mit Dehnungselement"-Regel und es wird KEINE zusätzliche Dila platziert).
 if(!segments.length)return{boundaries:[],gesamtlaenge:0};
 function grenzInfo(typId){
  if(!typId)return null;
  const f=rinneFittingTypes.find(x=>x.id===Number(typId));
  if(!f)return null;
  if(f.is_fixpunkt)return{typ:"fix",name:f.name,symbol:f.symbol};
  if(f.is_schiebestutzen)return{typ:"schiebe",name:f.name,symbol:f.symbol};
  return null;
 }
 function kombiniere(a,b){
  if(a&&a.typ==="fix")return a;
  if(b&&b.typ==="fix")return b;
  if(a&&a.typ==="schiebe")return a;
  if(b&&b.typ==="schiebe")return b;
  return null;
 }
 const grenzen=[];
 let cum=0;
 grenzen.push({pos:0,info:grenzInfo(segments[0].linksTyp)});
 for(let i=0;i<segments.length;i++){
  cum+=Number(segments[i].laenge)||0;
  const istLetzte=i===segments.length-1;
  const info=istLetzte?grenzInfo(segments[i].rechtsTyp):kombiniere(grenzInfo(segments[i].rechtsTyp),grenzInfo(segments[i+1].linksTyp));
  grenzen.push({pos:cum,info});
 }
 const gesamtlaenge=cum;
 const boundaries=[{pos:0,typ:grenzen[0].info?grenzen[0].info.typ:null,name:grenzen[0].info?grenzen[0].info.name:null}];
 for(let i=1;i<grenzen.length-1;i++)if(grenzen[i].info)boundaries.push({pos:grenzen[i].pos,typ:grenzen[i].info.typ,name:grenzen[i].info.name});
 const letzte=grenzen[grenzen.length-1];
 boundaries.push({pos:gesamtlaenge,typ:letzte.info?letzte.info.typ:null,name:letzte.info?letzte.info.name:null});
 return{boundaries,gesamtlaenge};
}
function calcRinneDilas(segments,material){
 const tab=RINNE_AUSDEHNUNG_TABELLE[material]||RINNE_AUSDEHNUNG_TABELLE.titanzink;
 if(!segments.length)return{dilas:[],tabelle:tab,boundaries:[]};
 const {boundaries,gesamtlaenge}=computeRinneBoundaries(segments);
 const dilas=[];
 for(let i=0;i<boundaries.length-1;i++){
  const left=boundaries[i],right=boundaries[i+1];
  const L=right.pos-left.pos;
  const leftMax=left.typ==="fix"?tab.abFixpunkten:tab.mitDehnungselement;
  const rightMax=right.typ==="fix"?tab.abFixpunkten:tab.mitDehnungselement;
  const relPositions=calcDilaPositionsInStretch(L,leftMax,rightMax,tab.mitDehnungselement);
  relPositions.forEach(rp=>dilas.push({posAbStart:left.pos+rp}));
 }
 return{dilas,tabelle:tab,gesamtlaenge,boundaries};
}
function renderRinneDilasList(){
 const material=$("rinne_material").value;
 const {boundaries}=computeRinneBoundaries(rinneSegments);
 // Alle Segmentgrenzen (auch ohne Fixpunkt/Schiebestutzen-Kennzeichen) als eigene Punkte,
 // damit die Nummerierung hier exakt der im Grundriss entspricht (jedes tatsächliche Stück
 // zählt, egal ob durch eine Ecke oder durch eine Dila entstanden).
 const segGrenzen=[0];
 let cAcc=0;
 rinneSegments.forEach(s=>{cAcc+=Number(s.laenge)||0;segGrenzen.push(cAcc);});
 const gesamtlaenge=cAcc;
 const punkte=[];
 segGrenzen.forEach((pos,i)=>{
  const b=boundaries.find(x=>Math.round(x.pos)===Math.round(pos));
  let label;
  if(b&&b.name)label=b.name;
  else if(i===0)label="Start";
  else if(i===segGrenzen.length-1)label="Ende";
  else label="Segmentgrenze";
  punkte.push({pos,art:"grenze",label});
 });
 rinneDilas.forEach((d,i)=>punkte.push({pos:Number(d.posAbStart)||0,art:"dila",dilaIndex:i}));
 punkte.sort((a,b)=>a.pos-b.pos);
 const rows=[];
 for(let i=1;i<punkte.length;i++){
  const prev=punkte[i-1],cur=punkte[i];
  const abstand=cur.pos-prev.pos;
  const vonLabel=prev.art==="grenze"?prev.label:`Dila ${punkte.slice(0,i).filter(p=>p.art==="dila").length}`;
  const bisLabel=cur.art==="dila"?`Dila ${punkte.slice(0,i+1).filter(p=>p.art==="dila").length}`:cur.label;
  if(cur.art==="dila"){
   rows.push(`<tr>
<td>${i}</td>
<td>${esc(vonLabel)} → ${esc(bisLabel)}</td>
<td><input data-rinne-dila-abstand="${cur.dilaIndex}" data-rinne-dila-prev="${prev.pos}" type="number" step="1" value="${abstand}"></td>
<td>${Math.round(cur.pos)}</td>
<td><button type="button" class="red" data-rinne-dila-del="${cur.dilaIndex}" style="padding:6px 8px">×</button></td>
</tr>`);
  }else{
   rows.push(`<tr style="background:var(--card-bg,#f7fafc)">
<td>${i}</td>
<td>${esc(vonLabel)} → ${esc(bisLabel)}</td>
<td class="small" style="color:var(--muted)">${Math.round(abstand)}</td>
<td>${Math.round(cur.pos)}</td>
<td></td>
</tr>`);
  }
 }
 $("rinne_dilasBody").innerHTML=rows.join("")||'<tr><td colspan="5" class="small">Noch keine Segmente/Dilas vorhanden.</td></tr>';
 if(!rinneSegments.length){
  $("rinne_dilasSummary").textContent="";
 }else{
  const tab=RINNE_AUSDEHNUNG_TABELLE[material]||RINNE_AUSDEHNUNG_TABELLE.titanzink;
  $("rinne_dilasSummary").textContent=rinneDilas.length?`${rinneDilas.length} Dila(s) (${tab.label}).`:`Keine Dila nötig (${tab.label}: max. ${tab.mitDehnungselement/1000} m mit Dehnungselement, ${tab.abFixpunkten/1000} m ab Fixpunkten).`;
 }
}
$("rinne_calcDilas").onclick=()=>{
 if(!rinneSegments.length){alert("Bitte zuerst Segmente erfassen.");return}
 if(rinneDilas.length&&!confirm("Vorhandene Dilas werden ersetzt. Fortfahren?"))return;
 const material=$("rinne_material").value;
 const {dilas}=calcRinneDilas(rinneSegments,material);
 rinneDilas=dilas;
 renderRinneDilasList();
 updateRinneDiagramAndSummary();
};
$("rinne_addDila").onclick=()=>{
 const {gesamtlaenge}=computeRinneBoundaries(rinneSegments);
 rinneDilas.push({posAbStart:Math.round(gesamtlaenge/2)});
 renderRinneDilasList();
 updateRinneDiagramAndSummary();
};
$("rinne_dilasBody").addEventListener("change",e=>{
 const i=Number(e.target.dataset.rinneDilaAbstand);
 if(Number.isNaN(i)||!rinneDilas[i])return;
 const prevPos=Number(e.target.dataset.rinneDilaPrev)||0;
 const neuerAbstand=Number(e.target.value)||0;
 rinneDilas[i].posAbStart=prevPos+neuerAbstand;
 renderRinneDilasList();
 updateRinneDiagramAndSummary();
});
$("rinne_dilasBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-rinne-dila-del]");
 if(!del)return;
 rinneDilas.splice(Number(del.dataset.rinneDilaDel),1);
 renderRinneDilasList();
 updateRinneDiagramAndSummary();
});
function generateRinneGrundriss(segments,dilas,boundaries){
 dilas=dilas||[];
 boundaries=boundaries||[];
 if(!segments.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:20px">Noch keine Segmente für den Grundriss.</div>';
 let x=0,y=0,dir=0;
 const pts=[{x,y}];
 for(const seg of segments){
  const rad=dir*Math.PI/180;
  x+=(Number(seg.laenge)||0)*Math.cos(rad);
  y+=(Number(seg.laenge)||0)*Math.sin(rad);
  pts.push({x,y});
  dir+=Number(seg.winkel)||0;
 }
 const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
 const pad=44,target=280;
 const scale=Math.min(target/w,target/h);
 const toSvg=p=>[pad+(p.x-minX)*scale,pad+(p.y-minY)*scale];
 const svgW=target+2*pad,svgH=target+2*pad;
 let lines="",labels="",arrows="";
 for(let i=0;i<segments.length;i++){
  const [x1,y1]=toSvg(pts[i]),[x2,y2]=toSvg(pts[i+1]);
  lines+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#17202a" stroke-width="4" stroke-linecap="round"/>`;
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  const ux=dx/len,uy=dy/len;
  const px=-uy,py=ux,off=15;
  const lx=mx-px*off,ly=my-py*off;
  let angleDeg=Math.atan2(dy,dx)*180/Math.PI;
  if(angleDeg>90||angleDeg<-90)angleDeg+=180;
  labels+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="12" fill="#1769aa" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700" transform="rotate(${angleDeg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${esc(segments[i].laenge||0)}</text>`;
  // Blickrichtungs-Pfeil auf der Gegenseite der Massbeschriftung: Spitze beruehrt das Segment
  const shaftFar=24,headLen=9,headWidth=5;
  const farX=mx+px*shaftFar,farY=my+py*shaftFar;
  const shaftEndX=mx+px*headLen,shaftEndY=my+py*headLen;
  arrows+=`<line x1="${farX.toFixed(1)}" y1="${farY.toFixed(1)}" x2="${shaftEndX.toFixed(1)}" y2="${shaftEndY.toFixed(1)}" stroke="#b42318" stroke-width="2.2" stroke-linecap="round"/>`;
  const p2x=shaftEndX+ux*headWidth,p2y=shaftEndY+uy*headWidth;
  const p3x=shaftEndX-ux*headWidth,p3y=shaftEndY-uy*headWidth;
  arrows+=`<polygon points="${mx.toFixed(1)},${my.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} ${p3x.toFixed(1)},${p3y.toFixed(1)}" fill="#b42318"/>`;
 }
 let symbols="";
 for(let i=0;i<segments.length;i++){
  const sp=toSvg(pts[i]),ep=toSvg(pts[i+1]);
  const linksF=rinneFittingTypes.find(f=>f.id===Number(segments[i].linksTyp));
  const rechtsF=rinneFittingTypes.find(f=>f.id===Number(segments[i].rechtsTyp));
  if(linksF&&linksF.symbol)symbols+=`<circle cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" r="11" fill="#fff" stroke="#68737d" stroke-width="1.5"/><text x="${sp[0].toFixed(1)}" y="${(sp[1]+3).toFixed(1)}" font-size="8" fill="#17202a" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">${esc(linksF.symbol)}</text>`;
  if(rechtsF&&rechtsF.symbol)symbols+=`<circle cx="${ep[0].toFixed(1)}" cy="${ep[1].toFixed(1)}" r="11" fill="#fff" stroke="#68737d" stroke-width="1.5"/><text x="${ep[0].toFixed(1)}" y="${(ep[1]+3).toFixed(1)}" font-size="8" fill="#17202a" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">${esc(rechtsF.symbol)}</text>`;
 }
 // Hilfsfunktion: SVG-Koordinaten (und lokale Segmentrichtung) für eine Position entlang des ganzen Verlaufs
 function svgPosAt(posAbStart){
  let remaining=posAbStart,segIdx=0;
  while(segIdx<segments.length&&remaining>(Number(segments[segIdx].laenge)||0)){
   remaining-=Number(segments[segIdx].laenge)||0;
   segIdx++;
  }
  if(segIdx>=segments.length)segIdx=segments.length-1;
  const segLen=Number(segments[segIdx].laenge)||1;
  const frac=Math.max(0,Math.min(1,remaining/segLen));
  const [sx1,sy1]=toSvg(pts[segIdx]),[sx2,sy2]=toSvg(pts[segIdx+1]);
  const dx=sx2-sx1,dy=sy2-sy1,len=Math.hypot(dx,dy)||1;
  return {x:sx1+dx*frac,y:sy1+dy*frac,ux:dx/len,uy:dy/len};
 }
 // Positionsnummern: nummeriert ALLE tatsächlichen Stücke, also sowohl die Hauptsegmente als
 // auch die durch Dilas entstehenden Zwischenstücke (jede Segmentgrenze + jede Dila-Position
 // gilt als eigener Schnittpunkt).
 let posNummern="";
 {
  const segGrenzen=[0];
  let cAcc=0;
  segments.forEach(s=>{cAcc+=Number(s.laenge)||0;segGrenzen.push(cAcc);});
  const volleKette=[...new Set([...segGrenzen,...dilas.map(d=>Math.round(Number(d.posAbStart)||0))])].sort((a,b)=>a-b);
  for(let i=0;i<volleKette.length-1;i++){
   const mid=(volleKette[i]+volleKette[i+1])/2;
   const p=svgPosAt(mid);
   const nx=-p.uy,ny=p.ux,off=13;
   const qx=p.x-nx*off,qy=p.y-ny*off;
   posNummern+=`<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="9" fill="#1769aa"/><text x="${qx.toFixed(1)}" y="${(qy+3.2).toFixed(1)}" font-size="9" fill="#fff" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">${i+1}</text>`;
  }
 }
 // Dilas als kleine orange Rauten entlang des Verlaufs zeichnen
 let dilaMarks="";
 for(const d of dilas){
  const p=svgPosAt(d.posAbStart);
  const r=7;
  dilaMarks+=`<polygon points="${p.x.toFixed(1)},${(p.y-r).toFixed(1)} ${(p.x+r).toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${(p.y+r).toFixed(1)} ${(p.x-r).toFixed(1)},${p.y.toFixed(1)}" fill="#e07a1f" stroke="#8a4a0f" stroke-width="1"/>`;
 }
 // Vermassung: Abstände zwischen Start, Fixpunkten/Schiebestutzen, den Dilas und dem Ende beschriften
 // (orange, parallel zur jeweiligen Linienrichtung).
 let dilaMasse="";
 if(dilas.length||boundaries.length>2){
  const gesamtlaenge=segments.reduce((s,seg)=>s+(Number(seg.laenge)||0),0);
  const kettePositionen=[0,...boundaries.map(b=>b.pos),...dilas.map(d=>d.posAbStart),gesamtlaenge];
  const kette=[...new Set(kettePositionen.map(p=>Math.round(p)))].sort((a,b)=>a-b);
  for(let i=0;i<kette.length-1;i++){
   const gap=kette[i+1]-kette[i];
   if(gap<=0)continue;
   const mid=(kette[i]+kette[i+1])/2;
   const pMid=svgPosAt(mid);
   const nx=-pMid.uy,ny=pMid.ux,off=13;
   const lx=pMid.x+nx*off,ly=pMid.y+ny*off;
   let angleDeg=Math.atan2(pMid.uy,pMid.ux)*180/Math.PI;
   if(angleDeg>90||angleDeg<-90)angleDeg+=180;
   dilaMasse+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9.5" fill="#b45a09" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700" transform="rotate(${angleDeg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${esc(gap)}</text>`;
  }
 }
 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${arrows}${labels}${posNummern}${symbols}${dilaMarks}${dilaMasse}</svg>`;
}
function renderRinneSegmentsTable(){
 const options=rinneFittingTypes.map(f=>`<option value="${f.id}">${esc(f.symbol?f.symbol+" – ":"")}${esc(f.name)}</option>`).join("");
 $("rinne_segmentsBody").innerHTML=rinneSegments.map((s,i)=>`<tr>
<td>${i+1}</td>
<td><input data-rinne-laenge="${i}" type="number" step="1" value="${s.laenge||0}"></td>
<td><select data-rinne-links="${i}"><option value="">–</option>${options}</select></td>
<td><select data-rinne-rechts="${i}"><option value="">–</option>${options}</select></td>
<td><input data-rinne-winkel="${i}" type="number" step="1" value="${s.winkel??0}"></td>
<td>${calcRinneSegment(s)}</td>
<td><button type="button" class="red" data-rinne-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="7" class="small">Noch keine Segmente. "+ Segment hinzufügen" klicken.</td></tr>';
 rinneSegments.forEach((s,i)=>{
  const linksSel=document.querySelector(`[data-rinne-links="${i}"]`);
  const rechtsSel=document.querySelector(`[data-rinne-rechts="${i}"]`);
  if(linksSel)linksSel.value=s.linksTyp||"";
  if(rechtsSel)rechtsSel.value=s.rechtsTyp||"";
 });
}
function renderRinneResult(){
 renderRinneSegmentsTable();
 updateRinneDiagramAndSummary();
}
function renderRinneResult(){
 renderRinneSegmentsTable();
 updateRinneDiagramAndSummary();
 renderRinneDilasList();
}
function updateRinneDiagramAndSummary(){
 const {boundaries}=computeRinneBoundaries(rinneSegments);
 $("rinne_diagram").innerHTML=generateRinneGrundriss(rinneSegments,rinneDilas,boundaries);
 const totalLen=rinneSegments.reduce((s,seg)=>s+(Number(seg.laenge)||0),0);
 $("rinne_summary").textContent=rinneSegments.length?`${rinneSegments.length} Segmente · Gesamtlänge ${totalLen} mm · Abwicklung ${$("rinne_abwicklung").value} mm`:"";
}
$("rinne_material").addEventListener("change",()=>{renderRinneDilasList();updateRinneDiagramAndSummary();});
$("rinne_addSegment").onclick=()=>{
 const prev=rinneSegments[rinneSegments.length-1];
 rinneSegments.push({laenge:0,linksTyp:prev?prev.rechtsTyp:"",rechtsTyp:"",winkel:0});
 renderRinneResult();
};
$("rinne_segmentsBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.rinneLaenge??e.target.dataset.rinneWinkel);
 if(Number.isNaN(i)||!rinneSegments[i])return;
 if(e.target.dataset.rinneLaenge!==undefined)rinneSegments[i].laenge=Number(e.target.value)||0;
 else if(e.target.dataset.rinneWinkel!==undefined)rinneSegments[i].winkel=Number(e.target.value)||0;
 const row=e.target.closest("tr");
 if(row&&row.children[5])row.children[5].textContent=calcRinneSegment(rinneSegments[i]);
 updateRinneDiagramAndSummary();
 renderRinneDilasList();
});
$("rinne_segmentsBody").addEventListener("change",e=>{
 const i=Number(e.target.dataset.rinneLinks??e.target.dataset.rinneRechts);
 if(Number.isNaN(i)||!rinneSegments[i])return;
 if(e.target.dataset.rinneLinks!==undefined)rinneSegments[i].linksTyp=e.target.value;
 else if(e.target.dataset.rinneRechts!==undefined){
  rinneSegments[i].rechtsTyp=e.target.value;
  const f=rinneFittingTypes.find(x=>x.id===Number(e.target.value));
  if(f)rinneSegments[i].winkel=Number(f.angle_deg)||0;
 }
 renderRinneResult();
});
$("rinne_segmentsBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-rinne-del]");
 if(del){rinneSegments.splice(Number(del.dataset.rinneDel),1);renderRinneResult();}
});
$("rinne_abwicklung").addEventListener("change",renderRinneResult);

// ---- Einlaufblech konisch (Stueckliste, max. 2m pro Stueck) ------
let ebkPieces=[];
function splitLengthIntoPieces(effLaenge){
 const stossLaenge=Number(einlaufblechKonischSettings.stoss_laenge)||1;
 const ueberlappung=Number(einlaufblechKonischSettings.ueberlappung)||0;
 const restSchwelle=Number(einlaufblechKonischSettings.rest_schwelle)||0;
 let anzahl=effLaenge>0?Math.max(1,Math.ceil(effLaenge/stossLaenge)):0;
 const zuschnittlaenge=stossLaenge+ueberlappung;
 let rest=effLaenge-(anzahl-1)*stossLaenge;
 if(anzahl>1&&rest>0&&rest<restSchwelle){anzahl=anzahl-1;rest=stossLaenge+rest;}
 const restZuschnittlaenge=Math.max(0,rest);
 const lengths=[];
 for(let i=1;i<=anzahl;i++)lengths.push(i===anzahl?restZuschnittlaenge:zuschnittlaenge);
 return lengths;
}
function generateEbkGrundriss(pieces){
 if(!pieces.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:20px">Noch keine Stücke für den Grundriss.</div>';
 let x=0,y=0,dir=0;
 const pts=[{x,y}];
 for(const p of pieces){
  const rad=dir*Math.PI/180;
  x+=(Number(p.laenge)||0)*Math.cos(rad);
  y+=(Number(p.laenge)||0)*Math.sin(rad);
  pts.push({x,y});
  dir+=Number(p.winkel)||0;
 }
 const xs=pts.map(pt=>pt.x),ys=pts.map(pt=>pt.y);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
 const pad=44,target=280;
 const scale=Math.min(target/w,target/h);
 const toSvg=pt=>[pad+(pt.x-minX)*scale,pad+(pt.y-minY)*scale];
 const svgW=target+2*pad,svgH=target+2*pad;
 let lines="",joints="",labels="",arrows="",endzugaben="";

 for(let i=0;i<pieces.length;i++){
  const [x1,y1]=toSvg(pts[i]),[x2,y2]=toSvg(pts[i+1]);

  lines+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#17202a" stroke-width="4" stroke-linecap="round"/>`;

  // Blechstoss: bei Winkel in der Winkelhalbierenden.
  if(i<pieces.length-1){
   const dx1=x2-x1,dy1=y2-y1,len1=Math.hypot(dx1,dy1)||1;
   const dx2=pts[i+2].x-pts[i+1].x,dy2=pts[i+2].y-pts[i+1].y,len2=Math.hypot(dx2,dy2)||1;
   const ux1=dx1/len1,uy1=dy1/len1;
   const ux2=dx2/len2,uy2=dy2/len2;
   let bx=ux1+ux2,by=uy1+uy2;
   const bl=Math.hypot(bx,by)||1;
   bx/=bl;by/=bl;
   const nx=-by,ny=bx;
   const jointLength=7;
   joints+=`<line x1="${(x2-nx*jointLength).toFixed(1)}" y1="${(y2-ny*jointLength).toFixed(1)}" x2="${(x2+nx*jointLength).toFixed(1)}" y2="${(y2+ny*jointLength).toFixed(1)}" stroke="#17202a" stroke-width="3" stroke-linecap="round"/>`;
  }

  // Endzugaben: als kurzer roter Strich markiert, wo die Zugabe beginnt.
  // Die Erstes-Stück-Zugabe erscheint am Anfang der Linie, die Letztes-Stück-Zugabe am Ende
  // (auch wenn beide rechnerisch am Reststück angehängt werden, da nur das Reststück von der
  // Standardlänge abweichen darf).
  // Fester, gut sichtbarer Pixel-Abstand statt massstabsgetreuer Position, da die Endzugabe
  // (typischerweise 10mm) bei diesem Massstab sonst nicht erkennbar wäre.
  const restStueck=pieces[pieces.length-1];
  if(i===0&&restStueck&&Number(restStueck.endzugabeStart)>0){
   const dx0=x2-x1,dy0=y2-y1,len0=Math.hypot(dx0,dy0)||1;
   const ux0=dx0/len0,uy0=dy0/len0;
   const nx0=-uy0,ny0=ux0;
   const tx=x1,ty=y1;
   endzugaben+=`<line x1="${(tx-nx0*9).toFixed(1)}" y1="${(ty-ny0*9).toFixed(1)}" x2="${(tx+nx0*9).toFixed(1)}" y2="${(ty+ny0*9).toFixed(1)}" stroke="#b42318" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if(i===pieces.length-1&&Number(pieces[i].endzugabeEnd)>0){
   const dx0=x2-x1,dy0=y2-y1,len0=Math.hypot(dx0,dy0)||1;
   const ux0=dx0/len0,uy0=dy0/len0;
   const nx0=-uy0,ny0=ux0;
   const tx=x2,ty=y2;
   endzugaben+=`<line x1="${(tx-nx0*9).toFixed(1)}" y1="${(ty-ny0*9).toFixed(1)}" x2="${(tx+nx0*9).toFixed(1)}" y2="${(ty+ny0*9).toFixed(1)}" stroke="#b42318" stroke-width="2.5" stroke-linecap="round"/>`;
  }


  const mx=(x1+x2)/2,my=(y1+y2)/2;
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  const ux=dx/len,uy=dy/len;
  const px=-uy,py=ux,off=15;

  const lx=mx-px*off,ly=my-py*off;
  labels+=`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="10" fill="#1769aa"/><text x="${lx.toFixed(1)}" y="${(ly+3.5).toFixed(1)}" font-size="10" fill="#fff" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">${i+1}</text>`;

  // EXAKT WIE IM RINNENMODUL: roter Blickrichtungs-Pfeil
  const shaftFar=24,headLen=9,headWidth=5;
  const farX=mx+px*shaftFar,farY=my+py*shaftFar;
  const shaftEndX=mx+px*headLen,shaftEndY=my+py*headLen;
  arrows+=`<line x1="${farX.toFixed(1)}" y1="${farY.toFixed(1)}" x2="${shaftEndX.toFixed(1)}" y2="${shaftEndY.toFixed(1)}" stroke="#b42318" stroke-width="2.2" stroke-linecap="round"/>`;
  const p2x=shaftEndX+ux*headWidth,p2y=shaftEndY+uy*headWidth;
  const p3x=shaftEndX-ux*headWidth,p3y=shaftEndY-uy*headWidth;
  arrows+=`<polygon points="${mx.toFixed(1)},${my.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} ${p3x.toFixed(1)},${p3y.toFixed(1)}" fill="#b42318"/>`;
 }

 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${arrows}${joints}${endzugaben}${labels}</svg>`;
}
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
   const m=seg.massen[j]||{};
   if(konisch){
    return `<tr><td>${j+1}</td><td><input data-fp-seg-mass-links="${i}_${j}" type="number" step="1" value="${m.links||0}"></td><td><input data-fp-seg-mass-rechts="${i}_${j}" type="number" step="1" value="${m.rechts||0}"></td></tr>`;
   }
   return `<tr><td>${j+1}</td><td><input data-fp-seg-mass="${i}_${j}" type="number" step="1" value="${m.mass||0}"></td></tr>`;
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
<div class="bar"><button type="button" class="red" data-fp-seg-del="${i}">Segment löschen</button></div>
</div>
</div>`;
 }).join("")||'<div class="empty">Noch keine Segmente. "+ Segment hinzufügen" klicken.</div>';
 $("fp_summary").textContent=fpSegmente.length?`${fpSegmente.length} Segment(e) · ${fpSchenkel.length} Schenkel im Profil`:"";
}
$("fp_addSegment").onclick=()=>{
 fpSegmente.push({laenge:0,massen:fpSchenkel.map(()=>({mass:0,links:0,rechts:0}))});
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

// ---- Einlaufblech gerade (Stueckliste, max. 2m pro Stueck) -------
let ebPieces=[];
function ebEngeSeite(){
 return $("eb_montage").value==="links"?"rechts":"links";
}
function ebRestbreite(){
 const massA=Number($("eb_massA").value)||0;
 const abwicklung=Number($("eb_abwicklung").value);
 const umschlagOben=Number(einlaufblechSettings.umschlag_oben)||0;
 const umschlagUnten=Number(einlaufblechSettings.umschlag_unten)||0;
 return abwicklung-massA-umschlagOben-umschlagUnten;
}
function renderEbDiagram(){
 const winkel=$("eb_winkel").value;
 const massA=$("eb_massA").value;
 const restBreite=ebRestbreite();
 $("eb_diagram").innerHTML=einlaufblechDiagramSvg(winkel,massA,restBreite,einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten);
}
function renderEbPiecesTable(){
 const massA=Number($("eb_massA").value)||0;
 const massAEng=Math.max(0,massA-2);
 const engeSeite=ebEngeSeite();
 const restBreite=ebRestbreite();
 $("eb_engHeader").textContent=`Eng ${engeSeite} (mm)`;
 $("eb_engeSeiteHint").textContent=`Mass A gilt für alle Stücke. Enges Mass (${massAEng} mm) wird bei Montage "von ${$("eb_montage").value}" auf der ${engeSeite}en Seite jedes Stücks berechnet.`;
 $("eb_resultBody").innerHTML=ebPieces.map((p,i)=>`<tr>
<td>${i+1}</td>
<td><input data-eb-stossstoss="${i}" type="number" step="1" value="${p.stossStoss||0}"></td>
<td><input data-eb-laenge="${i}" type="number" step="1" value="${p.laenge||0}"></td>
<td><input data-eb-gl="${i}" type="checkbox" ${p.gehrungLinks?"checked":""}></td>
<td><input data-eb-gr="${i}" type="checkbox" ${p.gehrungRechts?"checked":""}></td>
<td style="display:flex;gap:4px;align-items:center"><input data-eb-winkel="${i}" type="number" step="1" value="${p.winkel||0}" style="flex:1"><button type="button" class="gray" data-eb-flip="${i}" title="Winkel umkehren" style="padding:4px 8px">🔄</button></td>
<td${restBreite<0?' style="color:var(--red)"':""}>${massAEng}${restBreite<0?" ⚠️":""}</td>
<td><button type="button" class="red" data-eb-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="8" class="small">Noch keine Stücke. "🔄 Stücke aus Gesamtlänge berechnen" oder "+ Stück hinzufügen".</td></tr>';
 const gesamtlaenge=ebPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 const restBreiteText=restBreite<0?`⚠️ Restbreite ${restBreite} mm (Mass A + Umschläge grösser als Abwicklung!)`:`Restbreite (Dachschräge) ${restBreite} mm`;
 $("eb_summary").textContent=ebPieces.length?`${ebPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${$("eb_abwicklung").value} mm · ${restBreiteText}`:"";
 renderEbDiagram();
 $("eb_grundriss").innerHTML=generateEbkGrundriss(ebPieces);
 $("eb_toggleEndzugabeStart").textContent=`Endzugabe erstes Stück: ${(ebPieces.length&&ebPieces[ebPieces.length-1].endzugabeStart)?"ein":"aus"}`;
 $("eb_toggleEndzugabeEnd").textContent=`Endzugabe letztes Stück: ${(ebPieces.length&&ebPieces[ebPieces.length-1].endzugabeEnd)?"ein":"aus"}`;
}
function toggleEbEndzugabe(position){
 if(!ebPieces.length){alert("Bitte zuerst Stücke erfassen.");return}
 const endZugabe=Number(einlaufblechSettings.end_zugabe)||0;
 if(!endZugabe){alert("Bitte zuerst in Einstellungen → Massaufnahmen eine Endzugabe > 0 mm hinterlegen.");return}
 // Die Endzugabe wird immer auf das Reststück (letztes Stück) gerechnet, nie auf ein reguläres
 // Stück, da kein Stück länger als Länge Stoss bis Stoss + Überlappung sein darf (ausser dem Reststück).
 const idx=ebPieces.length-1;
 const flagKey=position==="start"?"endzugabeStart":"endzugabeEnd";
 const piece=ebPieces[idx];
 if(piece[flagKey]){
  piece.laenge=Math.max(0,(Number(piece.laenge)||0)-piece[flagKey]);
  piece[flagKey]=0;
 }else{
  piece.laenge=(Number(piece.laenge)||0)+endZugabe;
  piece[flagKey]=endZugabe;
 }
 renderEbPiecesTable();
}
$("eb_toggleEndzugabeStart").onclick=()=>toggleEbEndzugabe("start");
$("eb_toggleEndzugabeEnd").onclick=()=>toggleEbEndzugabe("end");
function buildEbPiecesFromGesamtlaenge(gesamtlaenge){
 const stossLaenge=Number(einlaufblechSettings.stoss_laenge)||1;
 const ueberlappung=Number(einlaufblechSettings.ueberlappung)||0;
 const restSchwelle=Number(einlaufblechSettings.rest_schwelle)||0;
 let anzahl=Math.max(1,Math.ceil(gesamtlaenge/stossLaenge));
 const zuschnittlaenge=stossLaenge+ueberlappung;
 let rest=gesamtlaenge-(anzahl-1)*stossLaenge;
 if(anzahl>1&&rest>0&&rest<restSchwelle){anzahl=anzahl-1;rest=stossLaenge+rest;}
 const restZuschnittlaenge=Math.max(0,rest);
 const neue=[];
 for(let i=1;i<=anzahl;i++){
  const istLetztes=i===anzahl;
  neue.push({laenge:istLetztes?restZuschnittlaenge:zuschnittlaenge,stossStoss:istLetztes?restZuschnittlaenge:stossLaenge,gehrungLinks:false,gehrungRechts:false,winkel:0});
 }
 return neue;
}
$("eb_regenerate").onclick=()=>{
 const gesamtlaenge=Number($("eb_gesamtlaenge").value)||0;
 if(!gesamtlaenge||gesamtlaenge<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
 if(ebPieces.length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
 ebPieces=buildEbPiecesFromGesamtlaenge(gesamtlaenge);
 renderEbPiecesTable();
};
$("eb_appendGesamtlaenge").onclick=()=>{
 const gesamtlaenge=Number($("eb_gesamtlaenge").value)||0;
 if(!gesamtlaenge||gesamtlaenge<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
 const neue=buildEbPiecesFromGesamtlaenge(gesamtlaenge);
 ebPieces=ebPieces.concat(neue);
 renderEbPiecesTable();
};
$("eb_addPiece").onclick=()=>{
 const stossStoss=Number(einlaufblechSettings.stoss_laenge)||2000;
 const defaultLen=stossStoss+(Number(einlaufblechSettings.ueberlappung)||0);
 ebPieces.push({laenge:defaultLen,stossStoss,gehrungLinks:false,gehrungRechts:false,winkel:0});
 renderEbPiecesTable();
};
$("eb_resultBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.ebStossstoss??e.target.dataset.ebLaenge??e.target.dataset.ebWinkel);
 if(Number.isNaN(i)||!ebPieces[i])return;
 if(e.target.dataset.ebStossstoss!==undefined){
  ebPieces[i].stossStoss=Number(e.target.value)||0;
  const ueberlappung=Number(einlaufblechSettings.ueberlappung)||0;
  ebPieces[i].laenge=ebPieces[i].stossStoss+ueberlappung;
  const row0=e.target.closest("tr");
  const laengeInput=row0?row0.querySelector(`[data-eb-laenge="${i}"]`):null;
  if(laengeInput)laengeInput.value=ebPieces[i].laenge;
 }
 else if(e.target.dataset.ebLaenge!==undefined)ebPieces[i].laenge=Number(e.target.value)||0;
 else if(e.target.dataset.ebWinkel!==undefined)ebPieces[i].winkel=Number(e.target.value)||0;
 const gesamtlaenge=ebPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 const restBreite=ebRestbreite();
 const restBreiteText=restBreite<0?`⚠️ Restbreite ${restBreite} mm (Mass A + Umschläge grösser als Abwicklung!)`:`Restbreite (Dachschräge) ${restBreite} mm`;
 $("eb_summary").textContent=`${ebPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${$("eb_abwicklung").value} mm · ${restBreiteText}`;
 $("eb_grundriss").innerHTML=generateEbkGrundriss(ebPieces);
});
function applyEbGehrung(piece,side){
 const zugabe=Number(einlaufblechSettings.gehrungszugabe)||0;
 const key=side==="links"?"gehrungLinks":"gehrungRechts";
 if(!piece[key]){
  piece[key]=true;
  piece.laenge=(Number(piece.laenge)||0)+zugabe;
  piece.winkel=90;
 }
}
$("eb_resultBody").addEventListener("change",e=>{
 const i=Number(e.target.dataset.ebGl??e.target.dataset.ebGr);
 if(Number.isNaN(i)||!ebPieces[i])return;
 const zugabe=Number(einlaufblechSettings.gehrungszugabe)||0;
 if(e.target.dataset.ebGl!==undefined){
  const war=ebPieces[i].gehrungLinks;
  ebPieces[i].gehrungLinks=e.target.checked;
  if(e.target.checked&&!war){
   ebPieces[i].laenge=(Number(ebPieces[i].laenge)||0)+zugabe;
   ebPieces[i].winkel=90;
   // Vorheriges Stück: gleiche physische Ecke, Gehrung rechts automatisch mitsetzen
   const prev=ebPieces[i-1];
   if(prev)applyEbGehrung(prev,"rechts");
  }
  else if(!e.target.checked&&war)ebPieces[i].laenge=Math.max(0,(Number(ebPieces[i].laenge)||0)-zugabe);
 }else if(e.target.dataset.ebGr!==undefined){
  const war=ebPieces[i].gehrungRechts;
  ebPieces[i].gehrungRechts=e.target.checked;
  if(e.target.checked&&!war){
   ebPieces[i].laenge=(Number(ebPieces[i].laenge)||0)+zugabe;
   ebPieces[i].winkel=90;
   // Folgestück: gleiche physische Ecke, Gehrung links automatisch mitsetzen
   const next=ebPieces[i+1];
   if(next)applyEbGehrung(next,"links");
  }
  else if(!e.target.checked&&war)ebPieces[i].laenge=Math.max(0,(Number(ebPieces[i].laenge)||0)-zugabe);
 }
 if(!ebPieces[i].gehrungLinks&&!ebPieces[i].gehrungRechts)ebPieces[i].winkel=0;
 renderEbPiecesTable();
});
$("eb_resultBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-eb-del]");
 if(del){ebPieces.splice(Number(del.dataset.ebDel),1);renderEbPiecesTable();return}
 const flip=e.target.closest("[data-eb-flip]");
 if(flip){
  const i=Number(flip.dataset.ebFlip);
  if(!ebPieces[i])return;
  ebPieces[i].winkel=-(Number(ebPieces[i].winkel)||0);
  renderEbPiecesTable();
 }
});
$("eb_massA").addEventListener("input",renderEbPiecesTable);
$("eb_winkel").addEventListener("input",renderEbDiagram);
$("eb_montage").addEventListener("change",renderEbPiecesTable);
$("eb_abwicklung").addEventListener("change",renderEbPiecesTable);

function showMeasTypeSection(type){
 $("measTypeFoto").hidden=(type!=="skizze_foto");
 $("measTypeEinlaufblech").hidden=(type!=="einlaufblech_gerade");
 $("measTypeRinne").hidden=(type!=="rinne_halbrund");
 $("measTypeEinlaufblechKonisch").hidden=(type!=="einlaufblech_konisch");
 $("measTypeFreiesProfil").hidden=(type!=="freies_profil");
 if(type==="einlaufblech_gerade")renderEbPiecesTable();
 if(type==="rinne_halbrund")renderRinneResult();
 if(type==="einlaufblech_konisch"){renderEbkPiecesTable();refreshEbkRinneList();}
 if(type==="freies_profil"){renderFpSchenkelTable();renderFpSegmenteList();}
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
  return {...base,photo_path:null,sketch_paths:[],data:{rinneAbwicklung:$("rinne_abwicklung").value,material,segments:segmentsWithZuschnitt,gesamtlaenge,dilas:rinneDilas,boundaries}};
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
  return {...base,photo_path:null,sketch_paths:[],data:{schenkel:fpSchenkel,konisch,segmente:fpSegmente}};
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
