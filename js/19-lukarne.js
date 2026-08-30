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
 const randL=100,randR=100,randO=126,randU=178;
 const zielB=Math.max(520,Math.min(1600,anzahl*135+180));
 const zielH=560;
 const sc=Math.min(zielB/W,zielH/modelH);
 const bildB=W*sc, bildH=modelH*sc;
 const ox=randL, oy=randO-Math.min(0,dy)*sc;
 const X=x=>ox+(gespiegelt?(W-x):x)*sc;
 const Y=y=>oy+y*sc;
 const svgW=Math.max(380,randL+bildB+randR), svgH=randO+bildH+randU;
 const N=v=>Number(v).toFixed(1);

 // ---- Belegte Flächen ----------------------------------------
 // Jede gesetzte Zahl merkt sich ihren Platz. Die grossen Masslinien
 // suchen sich danach eine Bahn, die noch frei ist – so überdeckt im
 // Plan nichts das andere, auch bei sehr schmalen oder steilen Wangen.
 const belegt=[];
 const kasten=(x,y,text,size,rot,anchor)=>{
  const br=String(text).length*size*0.58, ho=size*1.15;
  if(rot){
   const r=rot*Math.PI/180, c=Math.abs(Math.cos(r)), si=Math.abs(Math.sin(r));
   const bx=(br*c+ho*si)/2, by=(br*si+ho*c)/2;
   return [x-bx,x+bx,y-by,y+by];
  }
  const x1=anchor==="start"?x:(anchor==="end"?x-br:x-br/2);
  return [x1,x1+br,y-ho/2,y+ho/2];
 };
 const frei=k=>!belegt.some(b=>k[0]<b[1]&&b[0]<k[1]&&k[2]<b[3]&&b[2]<k[3]);

 const T=(x,y,t,o)=>{
  o=o||{};
  const size=o.size||13, anchor=o.anchor||"middle", weight=o.weight||700;
  const fill=o.fill||"#1769aa", rot=o.rot||0;
  if(o.merken!==false)belegt.push(kasten(x,y,t,size,rot,anchor));
  return `<text x="${N(x)}" y="${N(y)}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle" paint-order="stroke" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"${rot?` transform="rotate(${N(rot)} ${N(x)} ${N(y)})"`:""}>${esc(t)}</text>`;
 };
 const linie=(x1,y1,x2,y2,farbe,breite,dash)=>
  `<line x1="${N(x1)}" y1="${N(y1)}" x2="${N(x2)}" y2="${N(y2)}" stroke="${farbe}" stroke-width="${breite}"${dash?` stroke-dasharray="${dash}"`:""} stroke-linecap="round"/>`;

 // Masslinie zwischen zwei Bildpunkten, um "off" senkrecht versetzt.
 // "off" darf eine Liste sein: dann wird die erste freie Bahn genommen.
 const massLinie=(ax,ay,bx,by,off,label,o)=>{
  o=o||{};
  const size=o.size||13;
  const dx=bx-ax, dyy=by-ay, len=Math.hypot(dx,dyy)||1;
  const ux=dx/len, uy=dyy/len, nx=-uy, ny=ux;
  let w=Math.atan2(dyy,dx)*180/Math.PI;
  if(w>=90)w-=180; if(w<-90)w+=180;
  // Freie Stelle suchen: erst weiter nach aussen, dann der Masslinie
  // entlang verschieben. Die Linie selbst bleibt, nur die Zahl rutscht.
  const bahnenListe=Array.isArray(off)?off:[off];
  let gewaehlt=bahnenListe[bahnenListe.length-1], anteil=0.5, gefunden=false;
  for(const kandidat of bahnenListe){
   for(const t of [0.5,0.34,0.66,0.2,0.8]){
    const mx=ax+dx*t+nx*kandidat, my=ay+dyy*t+ny*kandidat;
    if(frei(kasten(mx,my,label,size,w,"middle"))){gewaehlt=kandidat;anteil=t;gefunden=true;break}
   }
   if(gefunden)break;
  }
  const a2x=ax+nx*gewaehlt, a2y=ay+ny*gewaehlt, b2x=bx+nx*gewaehlt, b2y=by+ny*gewaehlt;
  let s="";
  s+=linie(ax+nx*4,ay+ny*4,a2x+nx*6,a2y+ny*6,"#c8d2da",0.9);
  s+=linie(bx+nx*4,by+ny*4,b2x+nx*6,b2y+ny*6,"#c8d2da",0.9);
  s+=linie(a2x,a2y,b2x,b2y,"#7b8a97",1.1);
  s+=linie(a2x-nx*4,a2y-ny*4,a2x+nx*4,a2y+ny*4,"#7b8a97",1.1);
  s+=linie(b2x-nx*4,b2y-ny*4,b2x+nx*4,b2y+ny*4,"#7b8a97",1.1);
  s+=T(ax+dx*anteil+nx*gewaehlt,ay+dyy*anteil+ny*gewaehlt,label,{size,rot:w,fill:o.fill});
  return s;
 };
 // Mehrere Bahnen in beide Richtungen, ausgehend vom Wunschabstand
 const bahnenAb=(start,schritt)=>[0,1,2,3,4].map(i=>start+i*schritt);

 let s="";
 s+=`<rect x="0" y="0" width="${N(svgW)}" height="${N(svgH)}" fill="#ffffff"/>`;

 // ---- Fläche und Umriss ----
 const ecken=[[0,0],[W,dy],[0,H]].map(([x,y])=>`${N(X(x))},${N(Y(y))}`).join(" ");
 s+=`<polygon points="${ecken}" fill="#eef4f9" stroke="#17202a" stroke-width="3.5" stroke-linejoin="round"/>`;

 // ---- Hilfsriss ----
 const hrEndeX=bottomSlope!==0?Math.max(0,Math.min(W,(hilfsriss-H)/bottomSlope)):W;
 s+=linie(X(0),Y(hilfsriss),X(hrEndeX),Y(hilfsriss),"#2563eb",2.2,"11 7");

 // ---- Scharen mit den Massen ab Hilfsriss ----
 // Die beiden Zahlen stehen direkt am Kreuzungspunkt der Scharlinie mit
 // dem Hilfsriss – dort werden sie auf der Baustelle auch abgemessen.
 const pxBreite=breiten.map(b=>b*sc);
 const richtung=gespiegelt?-1:1;                 // zur Spitze hin
 const schmalste=Math.min(...pxBreite);
 const eng=schmalste<62;
 // Je enger die Scharen stehen, auf desto mehr Bahnen werden die Zahlen
 // verteilt. Sonst schieben sie sich bei zehn Scharen übereinander.
 const bahnen=schmalste<40?3:(eng?2:1);
 achsen.forEach((x,i)=>{
  const obenV=topSlope*x, untenV=H+bottomSlope*x;
  if(untenV-obenV>0.5)s+=linie(X(x),Y(obenV),X(x),Y(untenV),"#17202a",2);
  const versatz=(i%bahnen)*15;
  const oben=hilfsriss-obenV, unten=untenV-hilfsriss;
  const anker=gespiegelt?"end":"start";
  if(oben>0.5)s+=T(X(x)+6*richtung,Y(hilfsriss)-11-versatz,"↑"+Math.round(oben),{size:11,anchor:anker});
  if(unten>0.5)s+=T(X(x)+6*richtung,Y(hilfsriss)+11+versatz,"↓"+Math.round(unten),{size:11,anchor:anker});
 });

 // ---- Scharbreiten und Positionsnummern unterhalb ----
 const yBasis=Y(H);
 achsen.forEach((x,i)=>{
  const xr=x+breiten[i];
  const yl=yBasis+(eng&&i%2?62:36);
  const a=Math.min(X(x),X(xr)), b=Math.max(X(x),X(xr));
  const platz=(b-a)>30;
  s+=linie(X(x),Y(H+bottomSlope*x)+3,X(x),yl-4,"#c8d2da",0.9,"3 3");
  s+=linie(X(xr),Y(H+bottomSlope*xr)+3,X(xr),yl-4,"#c8d2da",0.9,"3 3");
  s+=linie(a,yl,b,yl,"#7b8a97",1.1);
  s+=linie(a,yl-4,a,yl+4,"#7b8a97",1.1);
  s+=linie(b,yl-4,b,yl+4,"#7b8a97",1.1);
  // Bei sehr engen Scharen sind alle Breiten gleich – dann genügen die
  // erste und die letzte, sonst überlagern sich die Zahlen.
  if(platz||i===0||i===achsen.length-1)
   s+=T((a+b)/2,yl+13,String(Math.round(breiten[i])),{size:11});
  // Positionsnummer unter der Schar: dort hat sie immer Platz und verdeckt
  // kein Mass in der Fläche.
  if(platz){
   s+=`<circle cx="${N((a+b)/2)}" cy="${N(yl-17)}" r="12.5" fill="#ffffff" stroke="#17202a" stroke-width="1.4"/>`;
   s+=T((a+b)/2,yl-17,String(i+1),{size:14,fill:"#17202a"});
  }else{
   s+=T((a+b)/2,yl-17-(i%2)*15,String(i+1),{size:12,fill:"#17202a"});
  }
 });
 const wY=yBasis+100;
 s+=linie(Math.min(X(0),X(W)),wY,Math.max(X(0),X(W)),wY,"#7b8a97",1.1);
 s+=linie(X(0),wY-5,X(0),wY+5,"#7b8a97",1.1);
 s+=linie(X(W),wY-5,X(W),wY+5,"#7b8a97",1.1);
 s+=T((X(0)+X(W))/2,wY-11,`waagerechte Breite = ${Math.round(W)}`,{size:12});

 // ---- Gesamtmasse ----
 if(hilfsriss*sc>26)s+=massLinie(X(0),Y(0),X(0),Y(hilfsriss),bahnenAb(24*sgn,20*sgn),`HR ${Math.round(hilfsriss)}`,{size:11,fill:"#2563eb"});
 s+=massLinie(X(0),Y(0),X(0),Y(H),bahnenAb(52*sgn,22*sgn),`H = ${Math.round(H)}`);
 s+=massLinie(X(0),Y(0),X(W),Y(dy),bahnenAb(-58*sgn,-22*sgn),`L = ${Math.round(L)}`);
 s+=massLinie(X(0),Y(H),X(W),Y(dy),bahnenAb(54*sgn,22*sgn),`A = ${Math.round(A)}`);

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
  // Die Zahl sitzt aussen an der oberen Kante: innen liegen die Masse ab
  // Hilfsriss, an der Ecke selbst die Masskette der Frontkante.
  const lT=Math.hypot(X(W)-X(0),Y(dy)-Y(0))||1;
  const uTx=(X(W)-X(0))/lT, uTy=(Y(dy)-Y(0))/lT;
  const nTx=uTy*sgn, nTy=-uTx*sgn;   // aus der Fläche heraus
  const text=`${Math.round(alpha*10)/10}°`;
  let px=0,py=0,gefunden=false;
  for(const entlang of [0.45,0.62,0.3,0.75]){
   for(const weg of [16,32,48]){
    const st=Math.min(90,lT*entlang);
    px=cx+uTx*st+nTx*weg; py=cy+uTy*st+nTy*weg;
    if(frei(kasten(px,py,text,12,0,"middle"))){gefunden=true;break}
   }
   if(gefunden)break;
  }
  s+=T(px,py,text,{size:12,fill:"#e07a1f"});
 })();

 // ---- Legende ----
 const legende=["① = Pos.-Nr.   – – – = Hilfsriss (HR)",
   "↑ ↓ = Mass ab HR nach oben / unten",
   `Alle Masse in mm · ${gespiegelt?"linke":"rechte"} Seite`,
   "von aussen gesehen"];
 legende.forEach((zeile,i)=>{
  s+=T(10,yBasis+112+i*15,zeile,{size:10,anchor:"start",weight:600,fill:"#68737d",merken:false});
 });

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

// Gerechnet wird mit "vorne" (Front) und "hinten" (Spitze) – das bleibt bei
// beiden Wangen gleich. Angeschrieben wird links/rechts, so wie es im Plan
// steht: bei der linken Seite ist die Front rechts, also drehen sich die
// beiden Spalten um.
function lukScharenZeilen(scharen,seite){
 const gespiegelt=seite==="links";
 return (scharen||[]).map(s=>{
  const li=gespiegelt?"Hinten":"Vorne", re=gespiegelt?"Vorne":"Hinten";
  const w=(art,kante)=>s[art+kante];
  return `<tr>
<td>${s.nr}</td>
<td>${lukMass(w("hrOben",li))}</td>
<td>${lukMass(w("hrUnten",li))}</td>
<td>${lukMass(w("laenge",li))}</td>
<td>${lukMass(w("hrOben",re))}</td>
<td>${lukMass(w("hrUnten",re))}</td>
<td>${lukMass(w("laenge",re))}</td>
<td><b>${Math.round(s.zuschnittBreite)} × ${Math.round(s.zuschnittLaenge)}</b></td>
</tr>`;
 }).join("");
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
  $("luk_scharenBody").innerHTML='<tr><td colspan="8" class="small">Bitte alle Masse eingeben. Der Winkel muss zwischen 90° und 180° liegen.</td></tr>';
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
 $("luk_scharenBody").innerHTML=lukScharenZeilen(g.scharen,g.seite);
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
