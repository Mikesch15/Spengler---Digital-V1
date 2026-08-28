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
