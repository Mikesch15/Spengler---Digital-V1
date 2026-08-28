"use strict";
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
