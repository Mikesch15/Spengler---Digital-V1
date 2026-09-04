"use strict";
// ==========================================================================
// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.
// Erzeugt von prototyp-mauerabdeckung/uebernehmen.js; jedes Stück ist
// zeichengenau aus seiner Quelldatei geschnitten und danach gegen die
// Quelle geprüft worden.
// ==========================================================================

// ---- const MEASUREMENT_MATERIAL_FALLBACK  ·  unverändert aus js/01-basis.js ----
const MEASUREMENT_MATERIAL_FALLBACK={id:null,name:"Titanzink (Standard)",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500};

// ---- findMeasurementMaterial()  ·  unverändert aus js/01-basis.js ----
function findMeasurementMaterial(value){
 if(value===undefined||value===null||value==="")return null;
 return measurementMaterials.find(m=>String(m.id)===String(value))
  ||measurementMaterials.find(m=>m.legacy_key===value)
  ||null;
}

// ---- measurementMaterialOrFallback()  ·  unverändert aus js/01-basis.js ----
function measurementMaterialOrFallback(value){
 return findMeasurementMaterial(value)||measurementMaterials.find(m=>m.legacy_key==="titanzink")||MEASUREMENT_MATERIAL_FALLBACK;
}

// ---- calcDilaPositionsInStretch()  ·  unverändert aus js/12-rinne-halbrund.js ----
function calcDilaPositionsInStretch(L,leftMax,rightMax,middleMax){
 if(L<=0)return[];
 if(L<=Math.min(leftMax,rightMax))return[];
 // Kleinste Anzahl Elemente, mit der die Strecke überhaupt aufgeht
 let n=1;
 while(leftMax+(n-1)*middleMax+rightMax<L-1e-6)n++;
 const anzahl=n+1;
 // Grenze je Stück: aussen gilt an Ecken und Fixpunkten der halbe Abstand
 const grenzen=[];
 for(let i=0;i<anzahl;i++){
  if(i===0)grenzen.push(leftMax);
  else if(i===anzahl-1)grenzen.push(rightMax);
  else grenzen.push(middleMax);
 }
 // Alle Stücke gleich lang. Wer über seiner Grenze liegt, wird darauf
 // festgesetzt; die übrige Länge verteilt sich gleichmässig auf die
 // restlichen Stücke. Das wiederholt sich, bis nichts mehr anschlägt.
 const laengen=new Array(anzahl).fill(0);
 const fest=new Array(anzahl).fill(false);
 for(let runde=0;runde<anzahl;runde++){
  let restLaenge=L, frei=0;
  for(let i=0;i<anzahl;i++){
   if(fest[i])restLaenge-=laengen[i];
   else frei++;
  }
  if(!frei)break;
  const ziel=restLaenge/frei;
  let neuFestgesetzt=false;
  for(let i=0;i<anzahl;i++){
   if(fest[i])continue;
   if(ziel>grenzen[i]+1e-6){laengen[i]=grenzen[i];fest[i]=true;neuFestgesetzt=true;}
   else laengen[i]=ziel;
  }
  if(!neuFestgesetzt)break;
 }
 const positions=[];
 let pos=0;
 for(let i=0;i<anzahl-1;i++){pos+=laengen[i];positions.push(pos);}
 return positions;
}

// ---- generateRinneGrundriss()  ·  unverändert aus js/12-rinne-halbrund.js ----
function generateRinneGrundriss(segments,dilas,boundaries,enden){
 dilas=dilas||[];
 boundaries=boundaries||[];
 // enden: {anfang:true,ende:true} – setzt bei der Mauerabdeckung ein
 // Bodenzeichen an das jeweilige Ende der Linie.
 enden=enden||{};
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
 let boeden="";
 const bodenZeichen=(punkt,nachbar,text)=>{
  const [px1,py1]=toSvg(punkt), [px2,py2]=toSvg(nachbar);
  const dx=px2-px1, dy=py2-py1, len=Math.hypot(dx,dy)||1;
  const ux=dx/len, uy=dy/len;      // zeigt ins Innere der Linie
  const nx=-uy, ny=ux;             // quer dazu
  const halb=11;
  return `<line x1="${(px1+nx*halb).toFixed(1)}" y1="${(py1+ny*halb).toFixed(1)}" x2="${(px1-nx*halb).toFixed(1)}" y2="${(py1-ny*halb).toFixed(1)}" stroke="#0f766e" stroke-width="5" stroke-linecap="round"/>`
   +`<text x="${(px1-ux*16).toFixed(1)}" y="${(py1-uy*16).toFixed(1)}" font-size="11" fill="#0f766e" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700">${esc(text)}</text>`;
 };
 if(enden.anfang&&pts.length>1)boeden+=bodenZeichen(pts[0],pts[1],"Boden");
 if(enden.ende&&pts.length>1)boeden+=bodenZeichen(pts[pts.length-1],pts[pts.length-2],"Boden");
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
 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${arrows}${labels}${posNummern}${symbols}${boeden}${dilaMarks}${dilaMasse}</svg>`;
}

// ---- abgerundeterPfad()  ·  unverändert aus js/14-freies-profil.js ----
function abgerundeterPfad(punkte,radius){
 if(punkte.length<2)return "";
 const P=(pt)=>`${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`;
 if(punkte.length===2)return `M ${P(punkte[0])} L ${P(punkte[1])}`;
 let d=`M ${P(punkte[0])}`;
 for(let i=1;i<punkte.length-1;i++){
  const [vx,vy]=punkte[i];
  const [ax,ay]=punkte[i-1];
  const [bx,by]=punkte[i+1];
  // Richtungen von der Ecke weg, jeweils auf Länge 1
  const ux=ax-vx, uy=ay-vy, wx=bx-vx, wy=by-vy;
  const lenU=Math.hypot(ux,uy)||1, lenW=Math.hypot(wx,wy)||1;
  const unx=ux/lenU, uny=uy/lenU, wnx=wx/lenW, wny=wy/lenW;
  let cos=unx*wnx+uny*wny;
  cos=Math.max(-1,Math.min(1,cos));
  const phi=Math.acos(cos); // Innenwinkel an der Biegung
  // Fast gerade oder vollständige Umkehr: nichts zu runden
  if(phi>Math.PI-0.03||phi<0.03){d+=` L ${P(punkte[i])}`;continue}
  // Tangentenabstand, begrenzt durch die kürzere der beiden Schenkellängen
  const t=Math.min(radius,lenU*0.45,lenW*0.45);
  const r=t*Math.tan(phi/2); // Radius des Kreisbogens
  const p1=[vx+unx*t, vy+uny*t];
  const p2=[vx+wnx*t, vy+wny*t];
  // Drehrichtung aus dem Kreuzprodukt (Bildkoordinaten: y zeigt nach unten)
  const kreuz=(vx-ax)*(by-vy)-(vy-ay)*(bx-vx);
  const sweep=kreuz>0?1:0;
  d+=` L ${P(p1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweep} ${P(p2)}`;
 }
 d+=` L ${P(punkte[punkte.length-1])}`;
 return d;
}

// ---- ansichtsPfeilSvg()  ·  unverändert aus js/14-freies-profil.js ----
function ansichtsPfeilSvg(seite,breite,hoehe,ox,oy){
 ox=ox||0; oy=oy||0;
 if(!seite||seite==="keiner")return "";
 const laenge=26, kopf=9, halb=5, luft=4;
 let sx,sy,ex,ey,k1x,k1y,k2x,k2y;
 // Der Pfeil liegt vollständig innerhalb des Bildes: Schaft aussen am Rand,
 // Spitze nach innen zur Zeichnung hin.
 if(seite==="links"){      sx=luft;          sy=hoehe/2; ex=sx+laenge; ey=sy; }
 else if(seite==="rechts"){sx=breite-luft;   sy=hoehe/2; ex=sx-laenge; ey=sy; }
 else if(seite==="oben"){  sx=breite/2;      sy=luft;    ex=sx; ey=sy+laenge; }
 else{                     sx=breite/2;      sy=hoehe-luft; ex=sx; ey=sy-laenge; }
 const dx=ex-sx, dy=ey-sy, len=Math.hypot(dx,dy)||1;
 const ux=dx/len, uy=dy/len, px=-uy, py=ux;
 const bx=ex-ux*kopf, by=ey-uy*kopf;
 k1x=bx+px*halb; k1y=by+py*halb; k2x=bx-px*halb; k2y=by-py*halb;
 return `<line x1="${(sx+ox).toFixed(1)}" y1="${(sy+oy).toFixed(1)}" x2="${(bx+ox).toFixed(1)}" y2="${(by+oy).toFixed(1)}" stroke="#b42318" stroke-width="2.2" stroke-linecap="round"/>`
  +`<polygon points="${(ex+ox).toFixed(1)},${(ey+oy).toFixed(1)} ${(k1x+ox).toFixed(1)},${(k1y+oy).toFixed(1)} ${(k2x+ox).toFixed(1)},${(k2y+oy).toFixed(1)}" fill="#b42318"/>`;
}

// ---- const ebaZahl  ·  unverändert aus js/29-einlaufblech-aufnahme.js ----
const ebaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};

// ---- ebaPackeInStreifen()  ·  unverändert aus js/29-einlaufblech-aufnahme.js ----
function ebaPackeInStreifen(bleche,L,budget){
 // bleche: [{nr, laenge}] - die Nummer reist mit, damit in der Liste jedes
 // Blech mit SEINER genauen Länge steht und nicht nur eine nackte Zahl.
 const stuecke=bleche.filter(x=>ebaZahl(x.laenge)>0).slice()
  .sort((a,b)=>ebaZahl(b.laenge)-ebaZahl(a.laenge));
 if(!stuecke.length)return {streifen:[],optimal:true};
 if(ebaZahl(stuecke[0].laenge)>L)
  return {streifen:null,optimal:true,zuLang:stuecke.filter(x=>ebaZahl(x.laenge)>L)};
 const gierig=[];
 stuecke.forEach(x=>{
  const s=gierig.find(g=>g.rest>=ebaZahl(x.laenge)-1e-9);
  if(s){s.stuecke.push(x);s.rest-=ebaZahl(x.laenge)}
  else gierig.push({stuecke:[x],rest:L-ebaZahl(x.laenge)});
 });
 const summe=stuecke.reduce((a,b)=>a+ebaZahl(b.laenge),0);
 const untergrenze=Math.ceil(summe/L-1e-9);
 let schritte=0; const grenze=budget||200000;
 function passt(i,reste){
  if(i>=stuecke.length)return true;
  if(++schritte>grenze)return null;
  const len=ebaZahl(stuecke[i].laenge), gesehen=[];
  for(let j=0;j<reste.length;j++){
   if(reste[j]<len-1e-9)continue;
   if(gesehen.indexOf(reste[j])>=0)continue;
   gesehen.push(reste[j]);
   reste[j]-=len;
   const r=passt(i+1,reste);
   reste[j]+=len;
   if(r===null)return null;
   if(r)return true;
  }
  return false;
 }
 for(let k=untergrenze;k<gierig.length;k++){
  schritte=0;
  const r=passt(0,new Array(k).fill(L));
  if(r===null)return {streifen:gierig,optimal:false};
  if(r){
   const streifen=Array.from({length:k},()=>({stuecke:[],rest:L}));
   const setze=i=>{
    if(i>=stuecke.length)return true;
    const len=ebaZahl(stuecke[i].laenge), gesehen=[];
    for(let j=0;j<streifen.length;j++){
     if(streifen[j].rest<len-1e-9)continue;
     if(gesehen.indexOf(streifen[j].rest)>=0)continue;
     gesehen.push(streifen[j].rest);
     streifen[j].stuecke.push(stuecke[i]); streifen[j].rest-=len;
     if(setze(i+1))return true;
     streifen[j].stuecke.pop(); streifen[j].rest+=len;
    }
    return false;
   };
   if(setze(0))return {streifen,optimal:true};
   return {streifen:gierig,optimal:false};
  }
 }
 return {streifen:gierig,optimal:true};
}

// ---- const MAD_BIEGERADIUS  ·  unverändert aus js/12b-mauerabdeckung.js ----
const MAD_BIEGERADIUS=5;   // Bildpunkte

// ---- const MAD_SAUM_LUFT  ·  unverändert aus js/12b-mauerabdeckung.js ----
const MAD_SAUM_LUFT=4;     // mm Abstand zwischen Blech und zurückgelegtem Saum

// ---- const MAD_MIN_HOEHE  ·  unverändert aus js/12b-mauerabdeckung.js ----
const MAD_MIN_HOEHE=50, MAD_MIN_HOEHE_WIND=100;

// ---- madBiegeVorgabe()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function madBiegeVorgabe(gef){return {links:90+(Number(gef)||0), rechts:90-(Number(gef)||0)}}

// ---- madMaterialTabelle()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function madMaterialTabelle(material){
 const m=measurementMaterialOrFallback(material);
 return {label:m.name,maxAbstand:Number(m.max_abstand_mm)||5000,abEcke:Number(m.ab_fixpunkt_mm)||2500};
}

// ---- computeMadBoundaries()  ·  unverändert aus js/12b-mauerabdeckung.js ----
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

// ---- calcMadSchieber()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function calcMadSchieber(segments,material){
 const tab=madMaterialTabelle(material);
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

// ---- berechneMadStueckliste()  ·  unverändert aus js/12b-mauerabdeckung.js ----
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

// ---- madProfilMasse()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function madProfilMasse(){
 const z=id=>Number($(id).value)||0;
 const breite=z("mad_breite");
 const hL=z("mad_hoeheLinks"), hR=z("mad_hoeheRechts");
 const umL=z("mad_umschlagLinks"), umR=z("mad_umschlagRechts");
 const saum=z("mad_saum");
 const gef=z("mad_gefaelle");
 const wind=$("mad_windexponiert").checked;
 const vorgabe=madBiegeVorgabe(gef);
 const wL=z("mad_biegeLinks")||vorgabe.links;
 const wR=z("mad_biegeRechts")||vorgabe.rechts;
 const rad=gef*Math.PI/180;
 const dy=breite*Math.tan(rad);
 // Gesamtbreite wird so verwendet, wie sie eingegeben ist – nicht über
 // die Schräge verlängert.
 const schraeg=breite;
 // Die Abwicklung ist die Summe der Schenkellängen und hängt NICHT vom
 // Biegewinkel ab – unverändert gegenüber früher.
 return {breite,hL,hR,umL,umR,saum,gef,wind,dy,schraeg,wL,wR,
         abwicklung:saum+umL+hL+schraeg+hR+umR+saum};
}

// ---- madNormHinweise()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function madNormHinweise(m){
 const minH=m.wind?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE;
 const h=[];
 if(m.hL&&m.hL<minH)h.push(`Schenkel links ${m.hL} mm – die Norm verlangt mindestens ${minH} mm.`);
 if(m.hR&&m.hR<minH)h.push(`Schenkel rechts ${m.hR} mm – die Norm verlangt mindestens ${minH} mm.`);
 return h;
}

// ---- madProfilSvgAus()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function madProfilSvgAus(m){
 if(!m||!m.breite||!m.hL)return '<div class="small" style="padding:10px">Bitte Gesamtbreite und Höhe eingeben.</div>';
 // Richtung der Deckfläche (x nach rechts, y nach unten), um das Gefälle
 // geneigt. Die beiden Schenkel hängen daran mit ihrem jeweiligen
 // Biegewinkel – bei 90°+Gefälle links und 90°-Gefälle rechts steht der
 // Schenkel senkrecht, also genau wie vor v2.70.
 const dreh=(v,grad)=>{const r=grad*Math.PI/180;
  return [v[0]*Math.cos(r)-v[1]*Math.sin(r), v[0]*Math.sin(r)+v[1]*Math.cos(r)];};
 const vg=madBiegeVorgabe(m.gef);
 const wL=Number(m.wL)||vg.links, wR=Number(m.wR)||vg.rechts;
 const u=dreh([1,0],m.gef);                       // Deckfläche nach rechts
 const dirL=dreh(u,180-wL);                       // linker Schenkel, nach unten
 const dirR=dreh([-u[0],-u[1]],-(180-wR));        // rechter Schenkel, nach unten
 const umDirL=dreh(dirL,-135);                    // Umschlag links, 135°
 const umDirR=dreh(dirR,90);                      // Umschlag rechts, 90°

 // Punkte in mm, x nach rechts, y nach unten
 const pLinksUnten=[dirL[0]*m.hL, dirL[1]*m.hL];
 const pLinksEnde=[pLinksUnten[0]+umDirL[0]*m.umL, pLinksUnten[1]+umDirL[1]*m.umL];
 const pRechtsUnten=[m.breite+dirR[0]*m.hR, m.dy+dirR[1]*m.hR];
 const pRechtsEnde=[pRechtsUnten[0]+umDirR[0]*m.umR, pRechtsUnten[1]+umDirR[1]*m.umR];
 const punkte=[pLinksEnde,pLinksUnten,[0,0],[m.breite,m.dy],pRechtsUnten,pRechtsEnde];

 // Säume: 180° zurückgelegt, mit etwas Luft, damit man sie sieht
 const saeume=[];
 if(m.saum>0){
  saeume.push({von:pLinksEnde, richtung:umDirL, drehung:-1});  // linkes Ende, Kehre nach aussen
  saeume.push({von:pRechtsEnde, richtung:umDirR, drehung:1});  // rechtes Ende
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

 // ---- Vermassung ----
 // Jedes Mass steht neben seinem Schenkel und ist mit einer feinen Linie
 // damit verbunden. Kurze Schenkel bekommen mehr Abstand, und Beschriftungen,
 // die einander zu nahe kommen, werden weiter nach aussen geschoben.
 const mitteX=alle.reduce((a2,p)=>a2+p[0],0)/alle.length;
 const mitteY=alle.reduce((a2,p)=>a2+p[1],0)/alle.length;
 const strecken=[
  {von:pLinksEnde, bis:pLinksUnten, mass:m.umL, andereSeite:true},
  {von:pLinksUnten, bis:[0,0],      mass:m.hL},
  {von:[0,0], bis:[m.breite,m.dy],  mass:m.breite},
  {von:[m.breite,m.dy], bis:pRechtsUnten, mass:m.hR},
  {von:pRechtsUnten, bis:pRechtsEnde, mass:m.umR}
 ];
 // Am linken Ende stehen Saum und Umschlag auf der anderen Blechseite,
 // dort ist mehr Platz und sie geraten sich nicht gegenseitig ins Gehege.
 saumPunkte.forEach((sp,i)=>strecken.push({von:sp.kehre, bis:sp.ende, mass:m.saum, andereSeite:i===0}));
 const gesetzt=[];
 let masse="";
 strecken.forEach(st=>{
  if(!st.mass)return;
  const a2=s2(st.von), b2=s2(st.bis);
  const mx=(a2[0]+b2[0])/2, my=(a2[1]+b2[1])/2;
  const dx=b2[0]-a2[0], dy2=b2[1]-a2[1], len=Math.hypot(dx,dy2)||1;
  let nx=-dy2/len, ny=dx/len;
  if((mx-mitteX)*nx+(my-mitteY)*ny<0){nx=-nx;ny=-ny}
  if(st.andereSeite){nx=-nx;ny=-ny}
  // Grundabstand vom Schenkel; kurze Schenkel etwas weiter weg
  const abstand=len<44?24:15;
  const ux=dx/len, uy=dy2/len;
  // Bei einer Überschneidung zuerst dem Schenkel entlang ausweichen – so
  // bleiben die Hilfslinien senkrecht und kreuzen sich nicht. Erst wenn das
  // nicht reicht, wird das Mass weiter nach aussen geschoben.
  const versuche=[[0,0],[0.3,0],[-0.3,0],[0,12],[0.3,12],[-0.3,12],[0,26]];
  let lx=0,ly=0;
  for(let k=0;k<versuche.length;k++){
   const [entlang,extra]=versuche[k];
   lx=mx+ux*len*entlang+nx*(abstand+extra);
   ly=my+uy*len*entlang+ny*(abstand+extra);
   if(!gesetzt.some(g=>Math.hypot(g[0]-lx,g[1]-ly)<22))break;
  }
  gesetzt.push([lx,ly]);
  let winkel=Math.atan2(dy2,dx)*180/Math.PI;
  if(winkel>90||winkel<-90)winkel+=180;
  // feine Hilfslinie vom Schenkel zum Mass
  // Fusspunkt der Hilfslinie liegt senkrecht unter der Beschriftung
  const fussT=(lx-mx)*ux+(ly-my)*uy;
  const fx=mx+ux*fussT, fy=my+uy*fussT;
  masse+=`<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(lx-nx*8).toFixed(1)}" y2="${(ly-ny*8).toFixed(1)}" stroke="#9bb0c1" stroke-width="0.8" stroke-dasharray="2 2"/>`;
  masse+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" fill="#1769aa" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700" transform="rotate(${winkel.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${Math.round(st.mass)}</text>`;
 });

 // ---- Biegewinkel: nur die beiden Ecken an der Deckfläche ----
 let winkelTexte="";
 const winkelPunkte=[];
 [2,3].forEach((i,nr)=>{
  if(!punkte[i-1]||!punkte[i+1])return;
  const v=s2(punkte[i]), a2=s2(punkte[i-1]), b2=s2(punkte[i+1]);
  const ux=a2[0]-v[0], uy=a2[1]-v[1], wx=b2[0]-v[0], wy=b2[1]-v[1];
  const lu=Math.hypot(ux,uy)||1, lw=Math.hypot(wx,wy)||1;
  let cos=(ux*wx+uy*wy)/(lu*lw);
  cos=Math.max(-1,Math.min(1,cos));
  const eigener=Math.round(Math.acos(cos)*180/Math.PI);
  // Die beiden Werte werden über Kreuz angeschrieben
  const anderer=180-eigener;
  let hx=ux/lu+wx/lw, hy=uy/lu+wy/lw;
  const hl=Math.hypot(hx,hy)||1;
  const tx=v[0]+(hx/hl)*24, ty=v[1]+(hy/hl)*24;
  winkelPunkte.push([tx-16,ty-9],[tx+16,ty+9]);
  winkelTexte+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="11" fill="#e07a1f" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" dominant-baseline="middle" font-weight="700">${anderer}°</text>`;
 });

 // Bildausschnitt so wählen, dass Blech, Masse und Winkel sicher hineinpassen
 const eckpunkte=alle.map(s2).concat(gesetzt.map(g=>[g[0]-24,g[1]-10]),gesetzt.map(g=>[g[0]+24,g[1]+10]),winkelPunkte);
 const exs=eckpunkte.map(p=>p[0]), eys=eckpunkte.map(p=>p[1]);
 const vbMinX=Math.min(...exs)-8, vbMaxX=Math.max(...exs)+8;
 const vbMinY=Math.min(...eys)-8, vbMaxY=Math.max(...eys)+8;
 const pfeilBreite=34;
 const vbW=(vbMaxX-vbMinX)+pfeilBreite, vbH=vbMaxY-vbMinY;
 const pfeil=ansichtsPfeilSvg("rechts",vbW,vbH,vbMinX,vbMinY);
 return `<svg viewBox="${vbMinX.toFixed(1)} ${vbMinY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
<path d="${d}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${saumPfade}
${masse}
${winkelTexte}
${pfeil}
</svg>`;
}

// ---- generateMadProfilSvg()  ·  unverändert aus js/12b-mauerabdeckung.js ----
function generateMadProfilSvg(){
 return madProfilSvgAus(madProfilMasse());
}
