"use strict";
// ==========================================================================
// AUS DER LAUFENDEN APP ÜBERNOMMEN - NICHT VON HAND BEARBEITEN.
// Erzeugt von prototyp-freies-profil/uebernehmen.js; jede Funktion ist
// zeichengenau aus ihrer Quelldatei geschnitten und danach gegen die
// Quelle geprüft worden.
// ==========================================================================

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

// ---- generateProfilDiagramSvg()  ·  unverändert aus js/14-freies-profil.js ----
function generateProfilDiagramSvg(schenkel){
 if(!schenkel.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:20px">Noch keine Schenkel für die Zeichnung.</div>';
 let x=0,y=0,dir=0;
 const pts=[{x,y}];
 const dirs=[0];
 for(let i=0;i<schenkel.length;i++){
  const s=schenkel[i];
  // Auch der erste Schenkel wird gedreht: 0° = waagerecht.
  dir+=Number(s.winkel)||0;
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
 const GAP=9;
 // Zeichnerischer Biegeradius in Bildpunkten
 const BIEGERADIUS=5;
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
    lines+=`<path d="${abgerundeterPfad(aktuellerPfad,BIEGERADIUS)}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
   }
   const [[ux1,uy1],[ux2,uy2]]=drawEnds[i];
   // Die Kehre des Umschlags als Halbkreis zeichnen: vom Ende des vorherigen
   // Schenkels um die Spitze herum auf die versetzte Rücklaufl inie.
   const [sx,sy]=svgPtsRaw[i];
   const radVor=dirs[i]*Math.PI/180;
   const dvx=Math.cos(radVor),dvy=Math.sin(radVor);   // Laufrichtung davor
   const nx2=(ux1-sx)/GAP,ny2=(uy1-sy)/GAP;          // Versatzrichtung, Länge 1
   const kreuzU=nx2*dvy-ny2*dvx;                      // Kehre nach aussen wölben
   const sweepU=kreuzU>0?0:1;
   lines+=`<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${(GAP/2).toFixed(1)} ${(GAP/2).toFixed(1)} 0 0 ${sweepU} ${ux1.toFixed(1)} ${uy1.toFixed(1)} L ${ux2.toFixed(1)} ${uy2.toFixed(1)}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
   aktuellerPfad=[svgPtsRaw[i+1]];
  }else{
   aktuellerPfad.push(svgPtsRaw[i+1]);
  }
 }
 if(aktuellerPfad.length>1){
  lines+=`<path d="${abgerundeterPfad(aktuellerPfad,BIEGERADIUS)}" fill="none" stroke="#17202a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
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
 const pfeil=ansichtsPfeilSvg($("fp_ansicht")?$("fp_ansicht").value:"keiner",svgW,svgH);
 return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:280px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${lines}${labels}${nums}${pfeil}</svg>`;
}

// ---- fpPruefeErkannteSchenkel()  ·  unverändert aus js/14-freies-profil.js ----
function fpPruefeErkannteSchenkel(roh){
 if(!Array.isArray(roh))return [];
 const gut=[];
 for(const e of roh){
  if(gut.length>=FP_MAX_SCHENKEL)break;
  if(!e||typeof e!=="object")continue;
  const l=Number(e.laenge);
  let w=Number(e.winkel);
  if(!Number.isFinite(l)||l<=0)continue;      // Laenge 0 ist keine Geometrie
  if(!Number.isFinite(w))w=0;
  w=Math.max(-180,Math.min(180,w));
  gut.push({laenge:Math.round(l),winkel:gut.length===0?0:Math.round(w)});
 }
 return gut.length>=2?gut:[];                 // ein einzelner Schenkel ist kein Profil
}

// ---- FP_ERKENNUNG_ZEITGRENZE_MS  ·  unverändert aus js/14-freies-profil.js ----
const FP_ERKENNUNG_ZEITGRENZE_MS=30000;

// ---- FP_MAX_SCHENKEL  ·  unverändert aus js/14-freies-profil.js ----
const FP_MAX_SCHENKEL=24;
