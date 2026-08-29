"use strict";
// ============================================================
// Lukarne – Seitenverkleidung
//
// Die Seitenwange einer Lukarne ist ein Dreieck:
//   vordere Kante   senkrecht, Höhe H
//   obere Kante     Länge L, im Innenwinkel α zur vorderen Kante
//   untere Kante    Schräge A, liegt auf dem Dach
// Beide Kanten treffen sich hinten in einer Spitze.
//
// Die Scharen stehen senkrecht. Achsabstand und Scharbreite werden
// waagerecht gemessen, die letzte Schar bekommt die Restbreite.
//
// Der Hilfsriss ist die waagerechte Reisslinie unter der Oberkante
// vorne. Ab ihr wird jede Schar nach oben und nach unten abgemessen.
// Er wird nur so weit abgesenkt, dass er die letzte senkrechte
// Scharlinie noch schneidet.
//
// Rechenmodell (Bildkoordinaten, y zeigt nach unten):
//   Ecke oben vorne = (0,0), Ecke unten vorne = (0,H),
//   Spitze          = (W,dy)   mit  β = α − 90°
//                              W  =  L·cos β
//                              dy = −L·sin β   (negativ = über der Oberkante)
// Die Scharlänge an der Stelle x ist H·(1 − x/W).
// ============================================================

let lukLetzteBerechnung=null;

// ---- Rechnen -------------------------------------------------
// e: {hoehe,laengeOben,winkel,achsabstand,hilfsrissWunsch,seite,
//     zugabeLaenge?,zugabeBreite?}
// Ohne Zugaben werden die firmenweiten Werte aus den Einstellungen genommen.
function berechneLukarne(e){
 if(!e)return null;
 const H=Number(e.hoehe)||0;
 const L=Number(e.laengeOben)||0;
 const alpha=Number(e.winkel);
 const p=Number(e.achsabstand)||0;
 const wunsch=Math.max(0,Number(e.hilfsrissWunsch)||0);
 if(!(H>0&&L>0&&p>0&&alpha>=90&&alpha<180))return null;
 const beta=(alpha-90)*Math.PI/180;
 const W=L*Math.cos(beta);
 const dy=-L*Math.sin(beta);
 if(!(W>0))return null;
 const A=Math.hypot(W,dy-H);                  // Schräge auf dem Dach
 const topSlope=dy/W, bottomSlope=(dy-H)/W;
 const anzahl=Math.ceil(W/p-1e-9);
 const achsen=Array.from({length:anzahl},(_,i)=>i*p);
 const breiten=achsen.map((x,i)=>i<anzahl-1?p:W-x);
 // Der Hilfsriss muss die letzte senkrechte Scharlinie noch schneiden.
 const letzteAchse=achsen[anzahl-1];
 const maxHilfsriss=Math.max(0,H+bottomSlope*letzteAchse);
 const hilfsriss=Math.min(wunsch,maxHilfsriss);
 const gekuerzt=Math.abs(hilfsriss-wunsch)>0.01;
 const zL=e.zugabeLaenge!==undefined?(Number(e.zugabeLaenge)||0):(Number(lukZugabeLaenge)||0);
 const zB=e.zugabeBreite!==undefined?(Number(e.zugabeBreite)||0):(Number(lukZugabeBreite)||0);
 const scharen=achsen.map((x,i)=>{
  const xr=x+breiten[i];
  const obenV=topSlope*x,  untenV=H+bottomSlope*x;    // vorne  (Front)
  const obenH=topSlope*xr, untenH=H+bottomSlope*xr;   // hinten (Spitze)
  const laengeVorne=untenV-obenV, laengeHinten=untenH-obenH;
  return {
   nr:i+1,
   abFront:x,
   breite:breiten[i],
   laengeVorne, laengeHinten,
   hrObenVorne:hilfsriss-obenV,  hrUntenVorne:untenV-hilfsriss,
   hrObenHinten:hilfsriss-obenH, hrUntenHinten:untenH-hilfsriss,
   zuschnittBreite:breiten[i]+zB,
   zuschnittLaenge:Math.max(laengeVorne,laengeHinten)+zL
  };
 });
 return {H,L,alpha,p,W,dy,A,topSlope,bottomSlope,anzahl,achsen,breiten,
         hilfsriss,hilfsrissWunsch:wunsch,maxHilfsriss,gekuerzt,scharen,
         seite:e.seite==="links"?"links":"rechts",
         zugabeLaenge:zL,zugabeBreite:zB,
         flaeche:W*H/2/1e6};
}

// Masse unter einem halben Millimeter sind an der Spitze rechnerischer
// Rest und keine Angabe für die Werkstatt.
function lukMass(v){return (Number(v)>0.5)?String(Math.round(v)):"–"}

// ---- Plan mit den Massen -------------------------------------
// optionen.fuerDruck = true  → Bild passt sich der Seitenbreite an
// sonst                      → feste Breite, seitlich verschiebbar
function lukPlanSvg(g,optionen){
 optionen=optionen||{};
 if(!g)return '<div class="small" style="color:var(--muted);text-align:center;padding:20px">Bitte Höhe, obere Länge, Winkel und Achsabstand eingeben.</div>';
 const {W,dy,H,hilfsriss,topSlope,bottomSlope,achsen,breiten,anzahl,A,L,alpha}=g;
 const gespiegelt=g.seite==="links";
 const sgn=gespiegelt?-1:1;
 const modelH=H-Math.min(0,dy);
 const randL=100,randR=100,randO=104,randU=146;
 const zielB=Math.max(520,Math.min(1600,anzahl*135+180));
 const zielH=330;
 const sc=Math.min(zielB/W,zielH/modelH);
 const bildB=W*sc, bildH=modelH*sc;
 const ox=randL, oy=randO-Math.min(0,dy)*sc;
 const X=x=>ox+(gespiegelt?(W-x):x)*sc;
 const Y=y=>oy+y*sc;
 const svgW=randL+bildB+randR, svgH=randO+bildH+randU;
 const N=v=>Number(v).toFixed(1);

 const T=(x,y,t,o)=>{
  o=o||{};
  const size=o.size||13, anchor=o.anchor||"middle", weight=o.weight||700;
  const fill=o.fill||"#1769aa", rot=o.rot||0;
  return `<text x="${N(x)}" y="${N(y)}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle" paint-order="stroke" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"${rot?` transform="rotate(${N(rot)} ${N(x)} ${N(y)})"`:""}>${esc(t)}</text>`;
 };
 const linie=(x1,y1,x2,y2,farbe,breite,dash)=>
  `<line x1="${N(x1)}" y1="${N(y1)}" x2="${N(x2)}" y2="${N(y2)}" stroke="${farbe}" stroke-width="${breite}"${dash?` stroke-dasharray="${dash}"`:""} stroke-linecap="round"/>`;

 // Massline zwischen zwei Bildpunkten, um "off" senkrecht versetzt.
 const massLinie=(ax,ay,bx,by,off,label,o)=>{
  o=o||{};
  const dx=bx-ax, dyy=by-ay, len=Math.hypot(dx,dyy)||1;
  const ux=dx/len, uy=dyy/len;
  const nx=-uy, ny=ux;
  const a2x=ax+nx*off, a2y=ay+ny*off, b2x=bx+nx*off, b2y=by+ny*off;
  let s="";
  s+=linie(ax+nx*4,ay+ny*4,a2x+nx*6,a2y+ny*6,"#c8d2da",0.9);
  s+=linie(bx+nx*4,by+ny*4,b2x+nx*6,b2y+ny*6,"#c8d2da",0.9);
  s+=linie(a2x,a2y,b2x,b2y,"#7b8a97",1.1);
  s+=linie(a2x-nx*4,a2y-ny*4,a2x+nx*4,a2y+ny*4,"#7b8a97",1.1);
  s+=linie(b2x-nx*4,b2y-ny*4,b2x+nx*4,b2y+ny*4,"#7b8a97",1.1);
  let w=Math.atan2(dyy,dx)*180/Math.PI;
  if(w>=90)w-=180; if(w<-90)w+=180;
  s+=T((a2x+b2x)/2,(a2y+b2y)/2,label,{size:o.size||13,rot:w,fill:o.fill});
  return s;
 };

 let s="";
 s+=`<rect x="0" y="0" width="${N(svgW)}" height="${N(svgH)}" fill="#ffffff"/>`;

 // ---- Fläche und Umriss ----
 const ecken=[[0,0],[W,dy],[0,H]].map(([x,y])=>`${N(X(x))},${N(Y(y))}`).join(" ");
 s+=`<polygon points="${ecken}" fill="#eef4f9" stroke="#17202a" stroke-width="3.5" stroke-linejoin="round"/>`;

 // ---- Hilfsriss ----
 const hrEndeX=bottomSlope!==0?Math.max(0,Math.min(W,(hilfsriss-H)/bottomSlope)):W;
 s+=linie(X(0),Y(hilfsriss),X(hrEndeX),Y(hilfsriss),"#2563eb",2.2,"11 7");

 // ---- Scharen ----
 const pxBreite=breiten.map(b=>b*sc);
 achsen.forEach((x,i)=>{
  const xr=x+breiten[i];
  const obenV=topSlope*x, untenV=H+bottomSlope*x;
  const obenH=topSlope*xr, untenH=H+bottomSlope*xr;
  if(untenV-obenV>0.5)s+=linie(X(x),Y(obenV),X(x),Y(untenV),"#17202a",2);
  // Nummer in der Mitte der Schar
  const xm=(x+xr)/2, ym=(obenV+untenV+obenH+untenH)/4;
  if(pxBreite[i]>26&&(untenV-obenV)*sc>34){
   s+=`<circle cx="${N(X(xm))}" cy="${N(Y(ym))}" r="13" fill="#ffffff" stroke="#17202a" stroke-width="1.4"/>`;
   s+=T(X(xm),Y(ym),String(i+1),{size:14,fill:"#17202a"});
  }
  // Masse ab Hilfsriss – dort, wo sie abgemessen werden
  const oben=hilfsriss-obenV, unten=untenV-hilfsriss;
  // Der Text steht hochkant auf der Scharlinie und braucht seine Länge als Höhe.
  const passt=(wert,platz)=>wert>0.5&&platz*sc>(String(Math.round(wert)).length+1)*6.6+6;
  if(pxBreite[i]>30||i===0){
   if(passt(oben,oben))s+=T(X(x),(Y(obenV)+Y(hilfsriss))/2,"↑"+Math.round(oben),{size:11,rot:-90});
   if(passt(unten,unten))s+=T(X(x),(Y(hilfsriss)+Y(untenV))/2,"↓"+Math.round(unten),{size:11,rot:-90});
  }
 });

 // ---- Gesamtmasse ----
 s+=massLinie(X(0),Y(0),X(0),Y(H),52*sgn,`H = ${Math.round(H)}`);
 if(hilfsriss>0.5)s+=massLinie(X(0),Y(0),X(0),Y(hilfsriss),24*sgn,`HR ${Math.round(hilfsriss)}`,{size:11,fill:"#2563eb"});
 s+=massLinie(X(0),Y(0),X(W),Y(dy),-34*sgn,`L = ${Math.round(L)}`);
 s+=massLinie(X(0),Y(H),X(W),Y(dy),34*sgn,`A = ${Math.round(A)}`);

 // ---- Winkel α an der vorderen oberen Ecke ----
 (function(){
  const cx=X(0), cy=Y(0), r=40;
  const a1=Math.PI/2;                                   // Frontkante nach unten
  const a2=Math.atan2(-Math.sin((alpha-90)*Math.PI/180),
                      (gespiegelt?-1:1)*Math.cos((alpha-90)*Math.PI/180));
  let delta=a2-a1;
  while(delta>Math.PI)delta-=2*Math.PI;
  while(delta<-Math.PI)delta+=2*Math.PI;
  const sweep=delta>0?1:0;
  const p1=[cx+r*Math.cos(a1),cy+r*Math.sin(a1)];
  const p2=[cx+r*Math.cos(a2),cy+r*Math.sin(a2)];
  s+=`<path d="M ${N(p1[0])} ${N(p1[1])} A ${r} ${r} 0 0 ${sweep} ${N(p2[0])} ${N(p2[1])}" fill="none" stroke="#e07a1f" stroke-width="1.4"/>`;
  const am=a1+delta/2;
  s+=T(cx+(r+18)*Math.cos(am),cy+(r+18)*Math.sin(am),`${Math.round(alpha*10)/10}°`,{size:12,fill:"#e07a1f"});
 })();

 // ---- Scharbreiten unterhalb ----
 const eng=pxBreite.some(b=>b<58);
 const yBasis=Y(H);
 achsen.forEach((x,i)=>{
  const xr=x+breiten[i];
  const yl=yBasis+(eng&&i%2?62:36);
  const a=Math.min(X(x),X(xr)), b=Math.max(X(x),X(xr));
  s+=linie(X(x),Y(H+bottomSlope*x)+3,X(x),yl-4,"#c8d2da",0.9,"3 3");
  s+=linie(X(xr),Y(H+bottomSlope*xr)+3,X(xr),yl-4,"#c8d2da",0.9,"3 3");
  s+=linie(a,yl,b,yl,"#7b8a97",1.1);
  s+=linie(a,yl-4,a,yl+4,"#7b8a97",1.1);
  s+=linie(b,yl-4,b,yl+4,"#7b8a97",1.1);
  s+=T((a+b)/2,yl-10,String(Math.round(breiten[i])),{size:11});
 });
 const wY=yBasis+100;
 s+=linie(Math.min(X(0),X(W)),wY,Math.max(X(0),X(W)),wY,"#7b8a97",1.1);
 s+=linie(X(0),wY-5,X(0),wY+5,"#7b8a97",1.1);
 s+=linie(X(W),wY-5,X(W),wY+5,"#7b8a97",1.1);
 s+=T((X(0)+X(W))/2,wY-11,`waagerechte Breite = ${Math.round(W)}`,{size:12});

 // ---- Legende ----
 s+=T(10,yBasis+118,"① = Schar-Nr.   – – – = Hilfsriss (HR)   ↑ ↓ = Mass ab HR nach oben / unten",
   {size:10,anchor:"start",weight:600,fill:"#68737d"});
 s+=T(10,yBasis+134,`Alle Masse in mm · ${gespiegelt?"linke":"rechte"} Seite, von aussen gesehen`,
   {size:10,anchor:"start",weight:600,fill:"#68737d"});

 const stil=optionen.fuerDruck
  ?'style="width:100%;height:auto"'
  :`style="width:${Math.round(svgW)}px;max-width:none;height:auto"`;
 return `<svg viewBox="0 0 ${N(svgW)} ${N(svgH)}" xmlns="http://www.w3.org/2000/svg" ${stil}>${s}</svg>`;
}

// ---- Anzeige in der App --------------------------------------
function lukEingabenAusFeldern(){
 return {
  hoehe:$("luk_hoehe").value,
  laengeOben:$("luk_laengeOben").value,
  winkel:$("luk_winkel").value,
  achsabstand:$("luk_achsabstand").value,
  hilfsrissWunsch:$("luk_hilfsriss").value,
  seite:$("luk_seite").value
 };
}

function lukScharenZeilen(scharen,zugabeLaenge,zugabeBreite){
 const zu=(Number(zugabeLaenge)||0)!==0||(Number(zugabeBreite)||0)!==0;
 return (scharen||[]).map(s=>`<tr>
<td>${s.nr}</td>
<td>${Math.round(s.abFront)}</td>
<td>${Math.round(s.breite)}</td>
<td>${lukMass(s.laengeVorne)}</td>
<td>${lukMass(s.laengeHinten)}</td>
<td${zu?' style="font-weight:700"':""}>${Math.round(s.zuschnittBreite)} × ${Math.round(s.zuschnittLaenge)}</td>
<td>${lukMass(s.hrObenVorne)}</td>
<td>${lukMass(s.hrUntenVorne)}</td>
<td>${lukMass(s.hrObenHinten)}</td>
<td>${lukMass(s.hrUntenHinten)}</td>
</tr>`).join("");
}

function renderLukResult(){
 const g=berechneLukarne(lukEingabenAusFeldern());
 lukLetzteBerechnung=g;
 const setzen=(id,wert)=>{const el=$(id);if(el)el.textContent=wert};
 if(!g){
  setzen("luk_schraegeOut","–");
  setzen("luk_breiteOut","–");
  setzen("luk_anzahlOut","–");
  setzen("luk_hilfsrissOut","–");
  setzen("luk_flaecheOut","–");
  $("luk_plan").innerHTML=lukPlanSvg(null);
  $("luk_scharenBody").innerHTML='<tr><td colspan="10" class="small">Bitte alle Masse eingeben. Der Winkel muss zwischen 90° und 180° liegen.</td></tr>';
  $("luk_hinweis").innerHTML="";
  $("luk_summary").textContent="";
  return;
 }
 setzen("luk_schraegeOut",Math.round(g.A)+" mm");
 setzen("luk_breiteOut",Math.round(g.W)+" mm");
 setzen("luk_anzahlOut",g.anzahl+(g.anzahl===1?" Schar":" Scharen"));
 setzen("luk_hilfsrissOut",Math.round(g.hilfsriss)+" mm");
 setzen("luk_flaecheOut",(Math.round(g.flaeche*100)/100).toFixed(2)+" m²");
 const box=$("luk_hinweis");
 if(g.gekuerzt){
  box.innerHTML=`⚠️ Bei der letzten Scharlinie (Nr. ${g.anzahl}) ist die Wange nur noch ${Math.round(g.maxHilfsriss)} mm hoch. Der gewünschte Hilfsriss von ${Math.round(g.hilfsrissWunsch)} mm würde sie nicht mehr schneiden – gerechnet wird mit ${Math.round(g.hilfsriss)} mm unter Oberkante.`;
  box.style.color="#b45309";
 }else{
  box.innerHTML="Der Hilfsriss schneidet alle Scharen.";
  box.style.color="var(--muted)";
 }
 $("luk_plan").innerHTML=lukPlanSvg(g);
 $("luk_scharenBody").innerHTML=lukScharenZeilen(g.scharen,g.zugabeLaenge,g.zugabeBreite);
 const zugabeTxt=(g.zugabeLaenge||g.zugabeBreite)
  ? ` · Zuschnitt inkl. Zugabe ${Math.round(g.zugabeBreite)} mm Breite / ${Math.round(g.zugabeLaenge)} mm Länge`
  : " · Zuschnitt ohne Zugabe (Einstellungen)";
 $("luk_summary").textContent=`Letzte Schar als Restbreite ${Math.round(g.breiten[g.anzahl-1])} mm · Fläche ${(Math.round(g.flaeche*100)/100).toFixed(2)} m²${zugabeTxt}`;
}

// ---- Bedienung ----
["luk_hoehe","luk_laengeOben","luk_winkel","luk_achsabstand","luk_hilfsriss"].forEach(id=>{
 $(id).addEventListener("input",renderLukResult);
});
$("luk_seite").addEventListener("change",renderLukResult);
$("openLukarneSettings").onclick=()=>{
 settingsReturnToMeasurement=true;
 $("measurementEditModal").hidden=true;
 renderSettings();
 applyCompanyName();
 document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b.dataset.settingsTab==="measurements"));
 document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!=="measurements")});
 const sec=document.querySelector('.settings-section[data-section="lukarne"]');
 if(sec)sec.classList.add("open");
 $("settingsModal").hidden=false;
};
