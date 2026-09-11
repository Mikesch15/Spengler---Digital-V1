"use strict";
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
 // Die Umschlaege sind in der Realitaet oft klein gegenueber Mass A/Restbreite
 // und wuerden im gemeinsamen Massstab kaum sichtbar. Deshalb ein eigener,
 // grosszuegigerer Faktor plus hoehere Mindestlaenge - der wirkliche Wert
 // (uU/uO) bleibt bestimmend, nur besser lesbar.
 const foldU=Math.max(20,uU*scale*1.6);
 const foldO=Math.max(20,uO*scale*1.6);

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

 // ---- Beschriftung -------------------------------------------------------
 // Angeschrieben wird nur, was wirklich uebergeben wurde. Fehlt ein Wert,
 // steht die Bezeichnung ohne Zahl da - der Platzhalter, mit dem oben
 // gezeichnet wird, wird NIE als Mass ausgegeben.
 // Wo eine Zahl steht, entscheidet js/62-masse.js, damit sich nichts deckt.
 const rd=v=>String(Math.round(v));
 const belegt=[], texte=[];
 const norm=(x,y)=>{const l=Math.hypot(x,y)||1;return [x/l,y/l]};

 // Mass A - die Zahl an der bestehenden Masslinie
 const aText=Number(massA)>0?("A = "+rd(mA)):"A";
 const aBreite=massKasten(0,0,aText,16,0).w;
 const aX=Ax-8-aBreite/2, aY=(Ay1+Ay2)/2;
 massBelegen(belegt,aX,aY,aText,16,0);
 texte.push({x:aX,y:aY,t:aText,g:16,f:"#1769aa",gew:700});

 // Winkel am Bogen (Stelle unveraendert, nur zentriert angeschrieben)
 const wBreite=massKasten(0,0,label,13,0).w;
 const wX=labelPt[0]+wBreite/2, wY=labelPt[1];
 massBelegen(belegt,wX,wY,label,13,0);
 texte.push({x:wX,y:wY,t:label,g:13,f:"#68737d",gew:400});

 // Restbreite am schraegen Schenkel
 const uR=dirVec(thetaUpDeg), nR=[uR[1],-uR[0]];
 const rMx=cx+uR[0]*rLen/2, rMy=cy+uR[1]*rLen/2;
 const rText=Number(restBreite)>0?("Restbreite "+rd(rB)):"Restbreite";
 const rPlatz=massPlatz(belegt,massKandidaten(rMx,rMy,uR[0],uR[1],nR[0],nR[1],24,rLen),rText,12,0);
 texte.push({x:rPlatz.x,y:rPlatz.y,t:rText,g:12,f:"#68737d",gew:400,von:[rMx,rMy]});

 // Die beiden Umschlaege am jeweiligen Haken
 [[hU,umschlagUnten,uU],[hO,umschlagOben,uO]].forEach(([h,roh,wert])=>{
  const ax=(h.apex[0]+h.tip[0])/2, ay=(h.apex[1]+h.tip[1])/2;
  const n=norm(ax-cx,ay-cy);
  const t=Number(roh)>0?("Umschlag "+rd(wert)):"Umschlag";
  const pl=massPlatz(belegt,massKandidaten(ax,ay,-n[1],n[0],n[0],n[1],20,0),t,12,0);
  texte.push({x:pl.x,y:pl.y,t:t,g:12,f:"#68737d",gew:400,von:[ax,ay]});
 });

 // viewBox dynamisch aus allen tatsaechlich gezeichneten Punkten berechnen,
 // damit die Zeichnung bei jedem Winkel/Mass zentriert bleibt, ohne Leerraum
 // und ohne Gefahr des Abschneidens. Die Beschriftungen zaehlen mit, sonst
 // wuerde eine ausgewichene Zahl abgeschnitten.
 const allPts=[[cx,cy],aEnd,hU.p1,hU.apex,hU.p2,hU.tip,dEnd,hO.p1,hO.apex,hO.p2,hO.tip,[Ax-25,Ay1],[Ax,Ay2],arcStart,arcEnd,labelPt];
 belegt.forEach(b=>{allPts.push([b.x,b.y],[b.x+b.w,b.y+b.h])});
 const padTextRight=18, padTextLeft=46, padY=14; // links Platz fuer den Ansichtspfeil
 const xs=allPts.map(p=>p[0]), ys=allPts.map(p=>p[1]);
 const minX=Math.min(...xs)-padTextLeft, maxX=Math.max(...xs)+padTextRight;
 const minY=Math.min(...ys)-padY, maxY=Math.max(...ys)+padY;
 const vbW=maxX-minX, vbH=maxY-minY;

 const beschriftung=texte.map(t=>{
  const leiter=t.von?`<line x1="${t.von[0].toFixed(1)}" y1="${t.von[1].toFixed(1)}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}" stroke="#9bb0c1" stroke-width="0.8" stroke-dasharray="2 2"/>`:"";
  return leiter+`<text x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" font-size="${t.g}" font-weight="${t.gew}" fill="${t.f}" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round" font-family="Arial,Helvetica,sans-serif">${t.t}</text>`;
 }).join("");

 const ansichtsPfeil=ansichtsPfeilSvg("links",vbW,vbH,minX,minY);
 return `<svg viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}" style="width:100%;max-width:260px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${ansichtsPfeil}
  <path d="M ${fmt([cx,cy])} L ${fmt(aEnd)} L ${fmt(hU.p1)} Q ${fmt(hU.apex)} ${fmt(hU.p2)} L ${fmt(hU.tip)}" fill="none" stroke="#17202a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${fmt([cx,cy])} L ${fmt(dEnd)} L ${fmt(hO.p1)} Q ${fmt(hO.apex)} ${fmt(hO.p2)} L ${fmt(hO.tip)}" fill="none" stroke="#17202a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${Ax}" y1="${Ay1}" x2="${Ax}" y2="${Ay2.toFixed(1)}" stroke="#1769aa" stroke-width="3" stroke-linecap="round"/>
  <path d="M${Ax-7},${Ay1+9} L${Ax},${Ay1} L${Ax+7},${Ay1+9}" fill="none" stroke="#1769aa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${Ax-7},${(Ay2-9).toFixed(1)} L${Ax},${Ay2.toFixed(1)} L${Ax+7},${(Ay2-9).toFixed(1)}" fill="none" stroke="#1769aa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${fmt(arcStart)} A ${R},${R} 0 0,0 ${fmt(arcEnd)}" fill="none" stroke="#68737d" stroke-width="1.5"/>
  ${beschriftung}
 </svg>`;
}
