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
 const boundaries=[{pos:0,typ:segments[0].bodenLinks?"ecke":"ende",name:segments[0].bodenLinks?"Boden":"Start"}];
 for(let i=0;i<segments.length;i++){
  cum+=Number(segments[i].laenge)||0;
  const istLetzte=i===segments.length-1;
  if(istLetzte){
   // Ein Boden wirkt wie ein Fixpunkt: ab dort gilt der halbe Abstand.
   boundaries.push({pos:cum,typ:segments[i].bodenRechts?"ecke":"ende",name:segments[i].bodenRechts?"Boden":"Ende"});
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


// ---- Querschnitt (Profil) ------------------------------------------
// Blechlauf von links nach rechts:
//   Saum 180° → Umschlag links (135°) → Schenkel links hoch →
//   Deckfläche mit Gefälle nach rechts → Schenkel rechts runter →
//   Umschlag rechts (90°) → Saum 180°
// Alle Masse kommen aus den Eingabefeldern.
const MAD_BIEGERADIUS=5;   // Bildpunkte
const MAD_SAUM_LUFT=4;     // mm Abstand zwischen Blech und zurückgelegtem Saum

// Mindestmasse nach SIA 271, Dachrand:
//   Aufkantung >= 50 mm, bei windexponierter Lage >= 100 mm
const MAD_MIN_HOEHE=50, MAD_MIN_HOEHE_WIND=100;

function madProfilMasse(){
 const z=id=>Number($(id).value)||0;
 const breite=z("mad_breite");
 const hL=z("mad_hoeheLinks"), hR=z("mad_hoeheRechts");
 const umL=z("mad_umschlagLinks"), umR=z("mad_umschlagRechts");
 const saum=z("mad_saum");
 const gef=z("mad_gefaelle");
 const wind=$("mad_windexponiert").checked;
 const rad=gef*Math.PI/180;
 const dy=breite*Math.tan(rad);
 // Gesamtbreite wird so verwendet, wie sie eingegeben ist – nicht über
 // die Schräge verlängert.
 const schraeg=breite;
 return {breite,hL,hR,umL,umR,saum,gef,wind,dy,schraeg,
         abwicklung:saum+umL+hL+schraeg+hR+umR+saum};
}

function madNormHinweise(m){
 const minH=m.wind?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE;
 const h=[];
 if(m.hL&&m.hL<minH)h.push(`Schenkel links ${m.hL} mm – die Norm verlangt mindestens ${minH} mm.`);
 if(m.hR&&m.hR<minH)h.push(`Schenkel rechts ${m.hR} mm – die Norm verlangt mindestens ${minH} mm.`);
 return h;
}

function generateMadProfilSvg(){
 return madProfilSvgAus(madProfilMasse());
}

// Zeichnet den Querschnitt aus einem Masse-Objekt – so kann auch ein
// gespeichertes Profil im PDF unverändert dargestellt werden.
function madProfilSvgAus(m){
 if(!m||!m.breite||!m.hL)return '<div class="small" style="padding:10px">Bitte Gesamtbreite und Höhe eingeben.</div>';
 const w=Math.SQRT1_2; // cos/sin von 45°
 // Punkte in mm, x nach rechts, y nach unten
 const pLinksUnten=[0,m.hL];
 const pLinksEnde=[m.umL*w, m.hL-m.umL*w];        // Umschlag links, 135°
 const pRechtsUnten=[m.breite, m.dy+m.hR];
 const pRechtsEnde=[m.breite-m.umR, m.dy+m.hR];   // Umschlag rechts, 90°
 const punkte=[pLinksEnde,pLinksUnten,[0,0],[m.breite,m.dy],pRechtsUnten,pRechtsEnde];

 // Säume: 180° zurückgelegt, mit etwas Luft, damit man sie sieht
 const saeume=[];
 if(m.saum>0){
  saeume.push({von:pLinksEnde, richtung:[w,-w], drehung:-1});  // linkes Ende, Kehre nach aussen
  saeume.push({von:pRechtsEnde, richtung:[-1,0], drehung:1});  // rechtes Ende
 }
 const saumPunkte=saeume.map(s=>{
  const [dx,dy2]=s.richtung;
  const dreh=s.drehung||1;
  const nx=-dy2*dreh, ny=dx*dreh;                          // senkrecht dazu
  const start=s.von;
  const kehre=[start[0]+nx*MAD_SAUM_LUFT, start[1]+ny*MAD_SAUM_LUFT];
  const ende=[kehre[0]-dx*m.saum, kehre[1]-dy2*m.saum];
  return {start,kehre,ende,richtung:s.richtung,drehung:dreh};
 });

 const alle=punkte.concat(saumPunkte.flatMap(s=>[s.kehre,s.ende]));
 const xs=alle.map(p=>p[0]), ys=alle.map(p=>p[1]);
 const minX=Math.min(...xs), maxX=Math.max(...xs);
 const minY=Math.min(...ys), maxY=Math.max(...ys);
 const bw=Math.max(1,maxX-minX), bh=Math.max(1,maxY-minY);
 const W=380,H=240,rand=34,randRechts=52;
 const f=Math.min((W-randRechts-rand)/bw,(H-2*rand)/bh);
 const ox=rand-minX*f, oy=(H-bh*f)/2-minY*f;
 const s2=p=>[p[0]*f+ox, p[1]*f+oy];
 const P=p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

 const d=abgerundeterPfad(punkte.map(s2),MAD_BIEGERADIUS);
 const saumPfade=saumPunkte.map(s=>{
  const a=s2(s.start), b=s2(s.kehre), c=s2(s.ende);
  const r=Math.hypot(b[0]-a[0],b[1]-a[1])/2;
  const kreuz=(b[0]-a[0])*s.richtung[1]-(b[1]-a[1])*s.richtung[0];
  const sweep=kreuz>0?0:1;
  return `<path d="M ${P(a)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweep} ${P(b)} L ${P(c)}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
 }).join("");

 // Blickrichtungs-Pfeil, damit klar ist, aus welcher Richtung der Schnitt
 // gesehen wird – gleiche Darstellung wie die Pfeile im Grundriss.
 const pfeil=ansichtsPfeilSvg("rechts",W,H);

 // ---- Vermassung ----
 // Mitte der Zeichnung, um Beschriftungen nach aussen zu schieben
 const mitteX=alle.reduce((a2,p)=>a2+p[0],0)/alle.length;
 const mitteY=alle.reduce((a2,p)=>a2+p[1],0)/alle.length;
 const strecken=[
  {von:pLinksEnde, bis:pLinksUnten, mass:m.umL},
  {von:pLinksUnten, bis:[0,0],      mass:m.hL},
  {von:[0,0], bis:[m.breite,m.dy],  mass:m.breite},
  {von:[m.breite,m.dy], bis:pRechtsUnten, mass:m.hR},
  {von:pRechtsUnten, bis:pRechtsEnde, mass:m.umR}
 ];
 saumPunkte.forEach(sp=>strecken.push({von:sp.kehre, bis:sp.ende, mass:m.saum}));
 let masse="";
 strecken.forEach(st=>{
  if(!st.mass)return;
  const a2=s2(st.von), b2=s2(st.bis);
  const mx=(a2[0]+b2[0])/2, my=(a2[1]+b2[1])/2;
  const dx=b2[0]-a2[0], dy2=b2[1]-a2[1], len=Math.hypot(dx,dy2)||1;
  let nx=-dy2/len, ny=dx/len;
  // nach aussen kippen, weg von der Mitte
  if((mx-mitteX)*nx+(my-mitteY)*ny<0){nx=-nx;ny=-ny}
  const lx=mx+nx*13, ly=my+ny*13;
  let winkel=Math.atan2(dy2,dx)*180/Math.PI;
  if(winkel>90||winkel<-90)winkel+=180;
  masse+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" fill="#1769aa" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700" transform="rotate(${winkel.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${Math.round(st.mass)}</text>`;
 });

 // ---- Biegewinkel an den Ecken ----
 let winkelTexte="";
 for(let i=1;i<punkte.length-1;i++){
  const v=s2(punkte[i]), a2=s2(punkte[i-1]), b2=s2(punkte[i+1]);
  const ux=a2[0]-v[0], uy=a2[1]-v[1], wx=b2[0]-v[0], wy=b2[1]-v[1];
  const lu=Math.hypot(ux,uy)||1, lw=Math.hypot(wx,wy)||1;
  let cos=(ux*wx+uy*wy)/(lu*lw);
  cos=Math.max(-1,Math.min(1,cos));
  // Winkel innen am Blech, so wie er an der Abkantbank abgelesen wird
  const biege=Math.round(Math.acos(cos)*180/Math.PI);
  if(biege>=180)continue; // gerade Stelle, keine Biegung
  // Beschriftung auf die Winkelhalbierende, also in die Biegung hinein
  let hx=ux/lu+wx/lw, hy=uy/lu+wy/lw;
  const hl=Math.hypot(hx,hy)||1;
  const tx=v[0]+(hx/hl)*22, ty=v[1]+(hy/hl)*22;
  winkelTexte+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="10" fill="#e07a1f" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700">${biege}°</text>`;
 }
 // Säume sind immer 180°
 saumPunkte.forEach(sp=>{
  const k=s2(sp.kehre), st2=s2(sp.start);
  const tx=(k[0]+st2[0])/2, ty=(k[1]+st2[1])/2;
  let rx=tx-mitteX, ry=ty-mitteY;
  const rl=Math.hypot(rx,ry)||1;
  winkelTexte+=`<text x="${(tx+rx/rl*16).toFixed(1)}" y="${(ty+ry/rl*16).toFixed(1)}" font-size="10" fill="#e07a1f" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700">180°</text>`;
 });

 return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
<path d="${d}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${saumPfade}
${masse}
${winkelTexte}
${pfeil}
</svg>`;
}

function zeigeMadProfil(){
 const m=madProfilMasse();
 $("mad_profil").innerHTML=madProfilSvgAus(m);
 $("mad_abwicklungOut").textContent=Math.round(m.abwicklung)+" mm";
 const h=madNormHinweise(m);
 const box=$("mad_profilHinweis");
 box.innerHTML=h.length?h.map(t=>`⚠️ ${esc(t)}`).join("<br>"):"Höhen entsprechen den Mindestwerten der Norm.";
 box.style.color=h.length?"#b45309":"var(--muted)";
}

// ---- Anzeige ----
function renderMadSegmentsTable(){
 const rows=madSegments.map((s,i)=>`<tr>
<td>${i+1}</td>
<td><input data-mad-laenge="${i}" type="number" step="1" value="${s.laenge||0}"></td>
<td style="display:flex;gap:4px;align-items:center"><input data-mad-winkel="${i}" type="number" step="1" value="${s.winkel??0}"${i===madSegments.length-1?" disabled":""} style="flex:1"><button type="button" class="gray" data-mad-flip="${i}" title="Winkel umkehren" style="padding:4px 8px"${i===madSegments.length-1?" disabled":""}>🔄</button></td>
<td style="text-align:center">${i===0?`<input type="checkbox" data-mad-boden-links="${i}"${s.bodenLinks?" checked":""} style="width:auto;min-height:0">`:"–"}</td>
<td style="text-align:center">${i===madSegments.length-1?`<input type="checkbox" data-mad-boden-rechts="${i}"${s.bodenRechts?" checked":""} style="width:auto;min-height:0">`:"–"}</td>
<td><button type="button" class="red" data-mad-seg-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`);
 $("mad_segmentsBody").innerHTML=rows.join("")||'<tr><td colspan="6" class="small">Noch kein Segment erfasst.</td></tr>';
}

function renderMadResult(){
 renderMadSegmentsTable();
 renderMadAuswertung();
}
// Nur Grundriss, Stückliste und Zusammenfassung neu zeichnen. Die
// Segmenttabelle bleibt stehen, damit beim Tippen der Fokus erhalten bleibt.
function renderMadAuswertung(){
 const material=$("mad_material").value;
 const {schieber,tabelle,boundaries,gesamtlaenge}=calcMadSchieber(madSegments,material);
 // Automatisch gesetzte Schieber übernehmen, sofern nicht von Hand angepasst
 if(!$("mad_manuell").checked)madSchieber=schieber;
 const stuecke=berechneMadStueckliste(madSegments,madSchieber,boundaries,madBodenMass,madSchieberMass);
 zeigeMadProfil();
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
 renderMadAuswertung();
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
 const flip=e.target.closest("[data-mad-flip]");
 if(flip){
  const i=Number(flip.dataset.madFlip);
  if(madSegments[i]){madSegments[i].winkel=-(Number(madSegments[i].winkel)||0);renderMadResult();}
  return;
 }
 const del=e.target.closest("[data-mad-seg-del]");
 if(del){madSegments.splice(Number(del.dataset.madSegDel),1);renderMadResult();}
});
["mad_breite","mad_hoeheLinks","mad_hoeheRechts","mad_umschlagLinks","mad_umschlagRechts","mad_saum","mad_gefaelle"].forEach(id=>{
 $(id).addEventListener("input",zeigeMadProfil);
});
$("mad_windexponiert").addEventListener("change",zeigeMadProfil);
$("mad_material").addEventListener("change",renderMadResult);
$("mad_manuell").addEventListener("change",renderMadResult);
// Beim Tippen nur den Wert übernehmen und den Grundriss auffrischen.
// Die Liste selbst wird erst neu aufgebaut, wenn das Feld verlassen wird –
// sonst verlierst du nach der ersten Ziffer den Fokus.
$("mad_stuecklisteBody").addEventListener("input",e=>{
 const t=e.target;
 if(t.dataset.madSchieberAbstand===undefined)return;
 const i=Number(t.dataset.madSchieberAbstand);
 const prev=Number(t.dataset.madSchieberPrev)||0;
 if(!madSchieber[i])return;
 $("mad_manuell").checked=true;
 madSchieber[i].posAbStart=prev+(Number(t.value)||0);
 const {boundaries}=computeMadBoundaries(madSegments);
 $("mad_grundriss").innerHTML=madSegments.length?generateRinneGrundriss(madSegments,madSchieber,boundaries):"";
});
$("mad_stuecklisteBody").addEventListener("change",e=>{
 if(e.target.dataset.madSchieberAbstand===undefined)return;
 madSchieber.sort((a,b)=>a.posAbStart-b.posAbStart);
 renderMadAuswertung();
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
