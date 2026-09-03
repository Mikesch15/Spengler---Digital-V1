"use strict";
// ==========================================================================
// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.
// Erzeugt von prototyp-einlaufblech/uebernehmen.js; jede Funktion ist
// zeichengenau aus ihrer Quelldatei geschnitten und danach gegen die
// Quelle geprüft worden.
// ==========================================================================

// ---- einlaufblechDiagramSvg()  ·  unverändert aus js/11-einlaufblech-gerade.js ----
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
 const padTextRight=70, padTextLeft=52, padY=20; // links Platz für den Ansichtspfeil
 const xs=allPts.map(p=>p[0]), ys=allPts.map(p=>p[1]);
 const minX=Math.min(...xs)-padTextLeft, maxX=Math.max(...xs)+padTextRight;
 const minY=Math.min(...ys)-padY, maxY=Math.max(...ys)+padY;
 const vbW=maxX-minX, vbH=maxY-minY;

 const ansichtsPfeil=ansichtsPfeilSvg("links",vbW,vbH,minX,minY);
 return `<svg viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}" style="width:100%;max-width:220px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${ansichtsPfeil}
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

// ---- teileLaengeInStuecke()  ·  unverändert aus js/13-einlaufblech-konisch.js ----
function teileLaengeInStuecke(effLaenge,settings){
 const stossLaenge=Number(settings.stoss_laenge)||1;
 const ueberlappung=Number(settings.ueberlappung)||0;
 const restSchwelle=Number(settings.rest_schwelle)||0;
 let anzahl=effLaenge>0?Math.max(1,Math.ceil(effLaenge/stossLaenge)):0;
 const zuschnittlaenge=stossLaenge+ueberlappung;
 let rest=effLaenge-(anzahl-1)*stossLaenge;
 if(anzahl>1&&rest>0&&rest<restSchwelle){anzahl=anzahl-1;rest=stossLaenge+rest;}
 const restZuschnittlaenge=Math.max(0,rest);
 const lengths=[];
 for(let i=1;i<=anzahl;i++)lengths.push(i===anzahl?restZuschnittlaenge:zuschnittlaenge);
 return lengths;
}

// ---- generateEbkGrundriss()  ·  unverändert aus js/13-einlaufblech-konisch.js ----
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

 const ansichtsPfeil=ansichtsPfeilSvg("links",svgW,svgH);
 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${arrows}${joints}${endzugaben}${labels}${ansichtsPfeil}</svg>`;
}

// ---- baueEinlaufblechStueckeAusRinne()  ·  unverändert aus js/13-einlaufblech-konisch.js ----
function baueEinlaufblechStueckeAusRinne(segs,settings,teile,mitMassen){
 const gehrungszugabe=Number(settings.gehrungszugabe)||0;
 const neue=[];
 (segs||[]).forEach((seg,i)=>{
  const gehrungLinks=i>0&&Number(segs[i-1].winkel||0)!==0;
  const gehrungRechts=Number(seg.winkel||0)!==0;
  const zugabe=(gehrungLinks?gehrungszugabe:0)+(gehrungRechts?gehrungszugabe:0);
  const effLaenge=(Number(seg.laenge)||0)+zugabe;
  const laengen=teile(effLaenge);
  laengen.forEach((len,j)=>{
   const prev=neue[neue.length-1];
   const istLetztes=j===laengen.length-1;
   const stueck={
    laenge:len,
    stossStoss:istLetztes?len:(Number(settings.stoss_laenge)||0),
    gehrungLinks:j===0?gehrungLinks:false,
    gehrungRechts:istLetztes?gehrungRechts:false,
    winkel:istLetztes?(Number(seg.winkel)||0):0
   };
   if(mitMassen){stueck.massLinks=prev?prev.massRechts:0;stueck.massRechts=0}
   neue.push(stueck);
  });
 });
 return neue;
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
