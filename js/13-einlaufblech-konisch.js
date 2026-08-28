"use strict";
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
