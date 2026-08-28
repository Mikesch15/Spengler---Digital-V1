"use strict";
// ============================================================
// Mauerabdeckung
//
// Aufbau wie "Rinne Halbrund": Der Verlauf besteht aus geraden Segmenten
// mit Winkeln dazwischen. Statt Anschlusstypen aus einem Katalog gibt es
// nur zwei Ansetzfunktionen:
//   Boden    – Abschluss am Anfang oder Ende eines Segments
//   Schieber – übernimmt die Rolle des Dehnungselements (bei der Rinne: Dila)
//
// Maximale Abstände nach SIA 271, Tabelle 8.4.2:
//   Baustoff                          zwischen zwei    ab Ecke (L/2)
//   Kupfer / CrNi / Chromstahl        6.00 m           3.00 m
//   Titanzink                         5.00 m           2.50 m
//   Aluminium (Aluman)                4.00 m           2.00 m
// Die Eckenregel gilt für innere wie äussere Ecken gleichermassen.
// ============================================================

const MAD_AUSDEHNUNG_TABELLE={
 kupfer_crni:{label:"Kupfer / CrNi-Stahl / Chromstahl verzinnt",maxAbstand:6000,abEcke:3000},
 titanzink:  {label:"Titanzink",                                maxAbstand:5000,abEcke:2500},
 aluminium:  {label:"Aluminium (Aluman)",                       maxAbstand:4000,abEcke:2000}
};

let madSegments=[];   // {laenge,winkel,bodenLinks,bodenRechts}
let madSchieber=[];   // {posAbStart}

// ---- Grenzpunkte: Ecken bekommen die halbierte Regel ----
function computeMadBoundaries(segments){
 if(!segments.length)return{boundaries:[],gesamtlaenge:0};
 let cum=0;
 const boundaries=[{pos:0,typ:"ende",name:segments[0].bodenLinks?"Boden":"Start"}];
 for(let i=0;i<segments.length;i++){
  cum+=Number(segments[i].laenge)||0;
  const istLetzte=i===segments.length-1;
  if(istLetzte){
   boundaries.push({pos:cum,typ:"ende",name:segments[i].bodenRechts?"Boden":"Ende"});
  }else{
   const winkel=Number(segments[i].winkel)||0;
   if(winkel!==0)boundaries.push({pos:cum,typ:"ecke",name:`Ecke ${winkel}°`});
   else boundaries.push({pos:cum,typ:"gerade",name:"Segmentgrenze"});
  }
 }
 return{boundaries,gesamtlaenge:cum};
}

// ---- Schieber automatisch setzen ----
function calcMadSchieber(segments,material){
 const tab=MAD_AUSDEHNUNG_TABELLE[material]||MAD_AUSDEHNUNG_TABELLE.titanzink;
 if(!segments.length)return{schieber:[],tabelle:tab,boundaries:[],gesamtlaenge:0};
 const {boundaries,gesamtlaenge}=computeMadBoundaries(segments);
 const schieber=[];
 for(let i=0;i<boundaries.length-1;i++){
  const left=boundaries[i],right=boundaries[i+1];
  const L=right.pos-left.pos;
  const leftMax =left.typ==="ecke" ?tab.abEcke:tab.maxAbstand;
  const rightMax=right.typ==="ecke"?tab.abEcke:tab.maxAbstand;
  // gleiche Verteilungslogik wie bei der Rinne
  const relPositions=calcDilaPositionsInStretch(L,leftMax,rightMax,tab.maxAbstand);
  relPositions.forEach(rp=>schieber.push({posAbStart:left.pos+rp}));
 }
 return{schieber,tabelle:tab,boundaries,gesamtlaenge};
}

// ---- Zuschnitt je Stück ----
function berechneMadStueckliste(segments,schieber,boundaries,bodenMass,schieberMass){
 const segGrenzen=[0];
 let acc=0;
 (segments||[]).forEach(s=>{acc+=Number(s.laenge)||0;segGrenzen.push(acc)});
 const bm=Number(bodenMass)||0, sm=Number(schieberMass)||0;
 // Boden zählt nur an den beiden Aussenenden des ganzen Verlaufs
 const bodenLinksSeite=[],bodenRechtsSeite=[];
 segGrenzen.forEach((pos,i)=>{
  bodenLinksSeite[i] =(i===segGrenzen.length-1&&segments[i-1]&&segments[i-1].bodenRechts)?bm:0;
  bodenRechtsSeite[i]=(i===0&&segments[0]&&segments[0].bodenLinks)?bm:0;
 });
 const punkte=[];
 segGrenzen.forEach((pos,i)=>{
  const b=(boundaries||[]).find(x=>Math.round(x.pos)===Math.round(pos));
  punkte.push({pos,art:"grenze",label:b&&b.name?b.name:(i===0?"Start":(i===segGrenzen.length-1?"Ende":"Segmentgrenze")),grenzIndex:i});
 });
 (schieber||[]).forEach((s,i)=>punkte.push({pos:Number(s.posAbStart)||0,art:"schieber",schieberIndex:i}));
 punkte.sort((a,b)=>a.pos-b.pos);
 const stuecke=[];
 for(let i=1;i<punkte.length;i++){
  const prev=punkte[i-1],cur=punkte[i];
  const abstand=cur.pos-prev.pos;
  const zugabeLinks =prev.art==="grenze"?bodenRechtsSeite[prev.grenzIndex]:sm;
  const zugabeRechts=cur.art==="grenze"?bodenLinksSeite[cur.grenzIndex]:sm;
  stuecke.push({
   nr:i,
   von:prev.art==="grenze"?prev.label:`Schieber ${punkte.slice(0,i).filter(p=>p.art==="schieber").length}`,
   bis:cur.art==="schieber"?`Schieber ${punkte.slice(0,i+1).filter(p=>p.art==="schieber").length}`:cur.label,
   abstand,
   zuschnitt:abstand+zugabeLinks+zugabeRechts,
   pos:cur.pos,
   prevPos:prev.pos,
   schieberIndex:cur.art==="schieber"?cur.schieberIndex:null
  });
 }
 return stuecke;
}

// ---- Anzeige ----
function renderMadSegmentsTable(){
 const rows=madSegments.map((s,i)=>`<tr>
<td>${i+1}</td>
<td><input data-mad-laenge="${i}" type="number" step="1" value="${s.laenge||0}"></td>
<td><input data-mad-winkel="${i}" type="number" step="1" value="${s.winkel??0}"${i===madSegments.length-1?" disabled":""}></td>
<td style="text-align:center">${i===0?`<input type="checkbox" data-mad-boden-links="${i}"${s.bodenLinks?" checked":""} style="width:auto;min-height:0">`:"–"}</td>
<td style="text-align:center">${i===madSegments.length-1?`<input type="checkbox" data-mad-boden-rechts="${i}"${s.bodenRechts?" checked":""} style="width:auto;min-height:0">`:"–"}</td>
<td><button type="button" class="red" data-mad-seg-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`);
 $("mad_segmentsBody").innerHTML=rows.join("")||'<tr><td colspan="6" class="small">Noch kein Segment erfasst.</td></tr>';
}

function renderMadResult(){
 renderMadSegmentsTable();
 const material=$("mad_material").value;
 const {schieber,tabelle,boundaries,gesamtlaenge}=calcMadSchieber(madSegments,material);
 // Automatisch gesetzte Schieber übernehmen, sofern nicht von Hand angepasst
 if(!$("mad_manuell").checked)madSchieber=schieber;
 const stuecke=berechneMadStueckliste(madSegments,madSchieber,boundaries,madBodenMass,madSchieberMass);
 $("mad_grundriss").innerHTML=madSegments.length?generateRinneGrundriss(madSegments,madSchieber.map(s=>({posAbStart:s.posAbStart})),boundaries):"";
 $("mad_stuecklisteBody").innerHTML=stuecke.map(st=>`<tr${st.schieberIndex===null?' style="background:var(--card-bg,#f7fafc)"':""}>
<td>${st.nr}</td>
<td>${esc(st.von)} → ${esc(st.bis)}</td>
<td>${st.schieberIndex!==null?`<input data-mad-schieber-abstand="${st.schieberIndex}" data-mad-schieber-prev="${st.prevPos}" type="number" step="1" value="${Math.round(st.abstand)}">`:`<span class="small" style="color:var(--muted)">${Math.round(st.abstand)}</span>`}</td>
<td><b>${Math.round(st.zuschnitt)}</b></td>
<td>${Math.round(st.pos)}</td>
<td>${st.schieberIndex!==null?`<button type="button" class="red" data-mad-schieber-del="${st.schieberIndex}" style="padding:6px 8px">×</button>`:""}</td>
</tr>`).join("")||'<tr><td colspan="6" class="small">Noch keine Segmente vorhanden.</td></tr>';
 $("mad_summary").textContent=madSegments.length
  ?`Gesamtlänge ${Math.round(gesamtlaenge)} mm · ${madSchieber.length} Schieber (${tabelle.label}: max. ${tabelle.maxAbstand/1000} m, ab Ecke ${tabelle.abEcke/1000} m).`
  :"";
}

// ---- Bedienung ----
$("mad_addSegment").onclick=()=>{
 madSegments.push({laenge:0,winkel:madSegments.length?90:0,bodenLinks:false,bodenRechts:false});
 renderMadResult();
};
$("mad_segmentsBody").addEventListener("input",e=>{
 const t=e.target;
 const i=Number(t.dataset.madLaenge??t.dataset.madWinkel);
 if(Number.isNaN(i)||!madSegments[i])return;
 if(t.dataset.madLaenge!==undefined)madSegments[i].laenge=Number(t.value)||0;
 else madSegments[i].winkel=Number(t.value)||0;
 renderMadResult();
});
$("mad_segmentsBody").addEventListener("change",e=>{
 const t=e.target;
 const i=Number(t.dataset.madBodenLinks??t.dataset.madBodenRechts);
 if(Number.isNaN(i)||!madSegments[i])return;
 if(t.dataset.madBodenLinks!==undefined)madSegments[i].bodenLinks=t.checked;
 else madSegments[i].bodenRechts=t.checked;
 renderMadResult();
});
$("mad_segmentsBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-mad-seg-del]");
 if(del){madSegments.splice(Number(del.dataset.madSegDel),1);renderMadResult();}
});
$("mad_material").addEventListener("change",renderMadResult);
$("mad_manuell").addEventListener("change",renderMadResult);
$("mad_stuecklisteBody").addEventListener("input",e=>{
 const t=e.target;
 if(t.dataset.madSchieberAbstand===undefined)return;
 const i=Number(t.dataset.madSchieberAbstand);
 const prev=Number(t.dataset.madSchieberPrev)||0;
 if(!madSchieber[i])return;
 $("mad_manuell").checked=true;
 madSchieber[i].posAbStart=prev+(Number(t.value)||0);
 madSchieber.sort((a,b)=>a.posAbStart-b.posAbStart);
 renderMadResult();
});
$("mad_stuecklisteBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-mad-schieber-del]");
 if(del){
  $("mad_manuell").checked=true;
  madSchieber.splice(Number(del.dataset.madSchieberDel),1);
  renderMadResult();
 }
});
$("mad_addSchieber").onclick=()=>{
 const {gesamtlaenge}=computeMadBoundaries(madSegments);
 const pos=Number(prompt("Position ab Start (mm):","0"));
 if(!Number.isFinite(pos)||pos<=0||pos>=gesamtlaenge){alert("Position muss zwischen 0 und "+Math.round(gesamtlaenge)+" mm liegen.");return}
 $("mad_manuell").checked=true;
 madSchieber.push({posAbStart:pos});
 madSchieber.sort((a,b)=>a.posAbStart-b.posAbStart);
 renderMadResult();
};
