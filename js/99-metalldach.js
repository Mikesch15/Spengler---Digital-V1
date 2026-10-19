"use strict";
// ===========================================================================
// Metalldach - Fachrechnung (v3.398)
//
// Prinzip wie die Lukarne-Seitenverkleidung (js/19): eine Flaeche wird in
// Scharen eingeteilt, jede Schar ist ein Zuschnitt. Unterschied: der Grundriss
// ist ein beliebiges Vieleck, erfasst ueber Seitenlaengen und Diagonalen
// (Kontrollmasse), und die Scharen laufen unter einem frei waehlbaren Winkel.
//
// Alle Masse sind wahre Laengen auf der Dachflaeche (am Dach gemessen).
// Diese Datei rechnet und zeichnet nur - die Bedienung steht in js/100.
//
// Modell (e):
//   seiten[i]       Seite von Punkt i zu Punkt i+1 (die letzte schliesst zu Punkt A)
//   diagonalen[]    {von,nach,mass} - gebraucht werden die Diagonalen A-C, A-D ...
//                   (Faecher von A); jede weitere ist ein Kontrollmass
//   uhrzeiger       Punkte A,B,C ... im Uhrzeigersinn (Ansicht von aussen) erfasst
//   bezugsseite     Seite, zu der die Scharrichtung gemessen wird (meist die Traufe)
//   winkel          Winkel der Scharrichtung zur Bezugsseite, ins Dach hinein (90 = senkrecht)
//   start           "links"|"rechts": von welcher Seite (Blick Richtung First) die Scharen gezaehlt werden
//   achsabstand     Deckbreite einer Schar
//   passbahnen[]    {nach,breite}: nach = nach der wievielten ganzen Schar (0 = ganz links);
//                   breite leer = Restbreite, auf alle solchen Passbahnen gleichmaessig verteilt
//   falzModus, falzEinzel   Falzrichtung je Falz (Bahnen+1 Falze, Index in Zaehlrichtung; links/rechts quer zum Falz)
//   zugabeLaenge, falzUnter, falzOber, hilfsriss
// ===========================================================================

const MD_MAX_ECKEN=20;
const MD_DREIECK_TOL=10;     // mm: so viel darf ein Dreieck "nicht aufgehen", ohne dass es ein Fehler ist
const MD_KONTROLL_TOL=10;    // mm: Abweichung eines Kontrollmasses, ab der gewarnt wird

const mdZ=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const mdHat=v=>v!==""&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
const mdMm=v=>Math.round(mdZ(v)).toLocaleString("de-CH");
const mdWinkel=v=>(Math.round(mdZ(v)*10)/10).toFixed(1).replace(".",",")+"°";
const mdName=i=>String.fromCharCode(65+i);
const mdEsc=s=>(typeof esc==="function")?esc(s):String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const mdKey=(a,b)=>a<b?a+"-"+b:b+"-"+a;
const mdBenachbart=(a,b,n)=>{const d=Math.abs(a-b);return d===1||d===n-1};

// Diagonalen als Map "a-b" -> {von,nach,mass}; ungueltige und Seiten werden ignoriert
function mdDiagMap(diagonalen,n){
 const m=new Map();
 (diagonalen||[]).forEach(d=>{
  const a=Number(d&&d.von),b=Number(d&&d.nach),x=mdZ(d&&d.mass);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>=n||b>=n||mdBenachbart(a,b,n)||!(x>0))return;
  const k=mdKey(a,b);
  if(!m.has(k))m.set(k,{von:Math.min(a,b),nach:Math.max(a,b),mass:x});
 });
 return m;
}
// Die Diagonalen, die zum Festlegen der Form zwingend sind: A-C, A-D ... bis A-(vorletzter Punkt)
function mdPflichtDiagonalen(n){
 const l=[];
 for(let k=2;k<=n-2;k++)l.push([0,k]);
 return l;
}

// ---- 1. Grundriss aus Seiten + Diagonalen ----------------------------------
function mdKonstruktion(e){
 const seiten=((e&&e.seiten)||[]).map(mdZ),n=seiten.length;
 const fehler=[],warn=[];
 const leer={ok:false,fehler,warn,punkte:[],kontrolle:[],gebraucht:[],flaeche:0,umfang:0,n,sigma:1};
 if(n<3||n>MD_MAX_ECKEN){fehler.push("Der Grundriss braucht 3 bis "+MD_MAX_ECKEN+" Ecken.");return leer}
 const fehlt=[];
 seiten.forEach((s,i)=>{if(!(s>0))fehlt.push(mdName(i)+"–"+mdName((i+1)%n))});
 if(fehlt.length){fehler.push("Seitenlänge fehlt: "+fehlt.join(", ")+".");return leer}
 const dm=mdDiagMap(e.diagonalen,n);
 const kreuz=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
 const schnitt=(a,b,c,d)=>kreuz(a,b,c)*kreuz(a,b,d)<-1e-9&&kreuz(c,d,a)*kreuz(c,d,b)<-1e-9;
 const P=[{x:0,y:0},{x:seiten[0],y:0}];
 const gebraucht=[],bezug=[];
 // Fuer jede Ecke ab C: Bezugspunkt j (kleinster Punkt mit erfasster Diagonale; die letzte Ecke schliesst zu A)
 for(let k=2;k<n;k++){
  let j=-1,d=0;
  if(k===n-1){j=0;d=seiten[n-1]}
  else{
   for(let a=0;a<k-1;a++){
    const v=dm.get(mdKey(a,k));
    if(v){j=a;d=v.mass;break}
   }
  }
  if(j<0){fehler.push("Diagonale zu Punkt "+mdName(k)+" fehlt (zu einer früheren Ecke, z. B. "+mdName(0)+"–"+mdName(k)+"). Hat die Form eine Einbuchtung, die Ecken so benennen, dass jede Ecke von einer früheren aus sichtbar ist.");return {...leer,punkte:P.slice()}}
  bezug[k]={j,d};
  if(k<n-1)gebraucht.push(mdKey(j,k));
 }
 // Die beiden Loesungen eines Punktes (Schnitt zweier Kreise); null = geht nicht auf
 const kandidaten=k=>{
  const {j,d}=bezug[k],prev=P[k-1],pj=P[j],r1=seiten[k-1];
  const dx=prev.x-pj.x,dy=prev.y-pj.y,L=Math.hypot(dx,dy);
  if(!(L>0))return {fehler:"Die Punkte "+mdName(j)+" und "+mdName(k-1)+" fallen zusammen."};
  const viol=Math.max(Math.abs(r1-d)-L,L-(r1+d));
  if(viol>MD_DREIECK_TOL)return {fehler:"Punkt "+mdName(k)+": Seite "+mdName(k-1)+"–"+mdName(k)+" ("+mdMm(r1)+" mm) und "+(k===n-1?"Seite "+mdName(k)+"–"+mdName(0):"Diagonale "+mdName(j)+"–"+mdName(k))+" ("+mdMm(d)+" mm) ergeben kein Dreieck mit "+mdName(j)+"–"+mdName(k-1)+" ("+mdMm(L)+" mm). Bitte Masse prüfen."};
  const a2=(d*d-r1*r1+L*L)/(2*L),h=Math.sqrt(Math.max(0,d*d-a2*a2));
  const ex=dx/L,ey=dy/L,bx=pj.x+ex*a2,by=pj.y+ey*a2;
  const links={x:bx-ey*h,y:by+ex*h},rechts={x:bx+ey*h,y:by-ex*h};
  return {viol,liste:(k===2||h<1e-6)?[links]:[links,rechts]};
 };
 // Stimmt der neu gesetzte Punkt k mit allen erfassten Diagonalen zu fruehen Ecken und ohne Kreuzung?
 const stimmig=k=>{
  const X=P[k];
  for(let j=0;j<k-1;j++){
   const v=dm.get(mdKey(j,k));
   if(!v)continue;
   if(Math.abs(Math.hypot(X.x-P[j].x,X.y-P[j].y)-v.mass)>1.5*MD_KONTROLL_TOL)return false;
  }
  for(let q=0;q<k-2;q++)if(schnitt(P[q],P[q+1],P[k-1],X))return false;
  if(k===n-1)for(let q=1;q<n-2;q++)if(schnitt(P[q],P[q+1],X,P[0]))return false;
  return true;
 };
 let knoten=0,abbruch=null,warnTri=[];
 const suche=k=>{
  if(k===n)return true;
  if(++knoten>200000)return false;
  const c=kandidaten(k);
  if(c.fehler){abbruch=c.fehler;return false}
  for(const X of c.liste){
   P[k]=X;
   if(stimmig(k)&&suche(k+1)){if(c.viol>0)warnTri.push("Punkt "+mdName(k)+": das Dreieck geht um "+Math.round(c.viol)+" mm nicht ganz auf – gerechnet wird mit dem nächstmöglichen Punkt.");return true}
  }
  P.length=k;
  return false;
 };
 if(!suche(2)){
  if(abbruch){fehler.push(abbruch);return {...leer,punkte:P.slice()}}
  // keine widerspruchsfreie Loesung: Ersatz = jeweils die linke Loesung, die Kontrollmasse zeigen dann die Abweichungen
  P.length=2;
  for(let k=2;k<n;k++){
   const c=kandidaten(k);
   if(c.fehler){fehler.push(c.fehler);return {...leer,punkte:P.slice()}}
   P.push(c.liste[0]);
  }
  warn.push("Die erfassten Diagonalen passen nicht zu einer gemeinsamen Form – Seiten und Diagonalen prüfen (siehe Kontrollmasse).");
 }
 warnTri.reverse().forEach(t=>warn.push(t));
 // Kontrollmasse: alle Diagonalen, die nicht zum Festlegen gebraucht wurden
 const kontrolle=[];
 dm.forEach((v,key)=>{
  if(gebraucht.includes(key))return;
  const ist=Math.hypot(P[v.nach].x-P[v.von].x,P[v.nach].y-P[v.von].y);
  kontrolle.push({von:v.von,nach:v.nach,soll:v.mass,ist,abw:ist-v.mass});
 });
 kontrolle.sort((p,q)=>p.von-q.von||p.nach-q.nach);
 // Vorzeichenflaeche (Umlaufsinn auf gegen den Uhrzeigersinn normalisieren) und Selbstueberschneidung
 let f2=0;
 for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];f2+=a.x*b.y-b.x*a.y}
 if(f2<0){P.forEach(p=>{p.y=-p.y});f2=-f2}
 // Innenwinkel jeder Ecke in Grad (Form ist hier gegen den Uhrzeigersinn; ueberstumpfe Winkel > 180 bei Einbuchtungen)
 const winkel=P.map((q,i)=>{
  const nx=P[(i+1)%n],pv=P[(i+n-1)%n];
  const v1={x:nx.x-q.x,y:nx.y-q.y},v2={x:pv.x-q.x,y:pv.y-q.y};
  let t=Math.atan2(v1.x*v2.y-v1.y*v2.x,v1.x*v2.x+v1.y*v2.y);
  if(t<0)t+=2*Math.PI;
  return t*180/Math.PI;
 });
 let schneidet=false;
 for(let i=0;i<n&&!schneidet;i++){
  for(let j=i+1;j<n;j++){
   if(j===i+1||(i===0&&j===n-1))continue;
   const a=P[i],b=P[(i+1)%n],c=P[j],d=P[(j+1)%n];
   if(schnitt(a,b,c,d)){schneidet=true;break}
  }
 }
 if(schneidet)fehler.push("Der Grundriss überschneidet sich selbst – die Eckpunkte stehen in falscher Reihenfolge oder ein Mass stimmt nicht.");
 else if(!(f2>1e-6))fehler.push("Die Form ist ungültig (Fläche 0 oder Umlaufsinn nicht stimmig). Bitte Seiten und Diagonalen prüfen.");
 // Ansicht: im Uhrzeigersinn erfasst -> spiegeln
 const uhr=!e||e.uhrzeiger!==false;
 const pts=P.map(p=>({x:p.x,y:uhr?-p.y:p.y}));
 let umfang=0;
 seiten.forEach(s=>{umfang+=s});
 return {ok:fehler.length===0,fehler,warn,punkte:pts,kontrolle,gebraucht,flaeche:Math.abs(f2)/2,umfang,n,sigma:uhr?-1:1,seiten,winkel};
}

// ---- 2. Scharen -------------------------------------------------------------
// Schnitt eines senkrechten Streifens [a,b] (in S) mit dem Vieleck Q [{S,T}].
// Ergebnis: zusammenhaengende Stuecke mit Trapezen (fuer Zeichnung/Flaeche) und Kantenmassen.
function mdSchnittStreifen(Q,a,b){
 const n=Q.length;
 const krit=[a,b];
 Q.forEach(q=>{if(q.S>a+1e-6&&q.S<b-1e-6)krit.push(q.S)});
 krit.sort((x,y)=>x-y);
 const xs=krit.filter((x,i)=>i===0||x-krit[i-1]>1e-6);
 const slabs=[];
 for(let i=0;i<xs.length-1;i++){
  const x0=xs[i],x1=xs[i+1],xm=(x0+x1)/2;
  const kanten=[];
  for(let q=0;q<n;q++){
   const A=Q[q],B=Q[(q+1)%n];
   if(Math.abs(A.S-B.S)<1e-9)continue;
   if(xm<Math.min(A.S,B.S)||xm>Math.max(A.S,B.S))continue;
   const T=x=>A.T+(B.T-A.T)*(x-A.S)/(B.S-A.S);
   kanten.push({T,tm:T(xm)});
  }
  kanten.sort((p,q)=>p.tm-q.tm);
  const iv=[];
  for(let q=0;q+1<kanten.length;q+=2){
   const lo=kanten[q],hi=kanten[q+1];
   iv.push({x0,x1,lo0:lo.T(x0),hi0:hi.T(x0),lo1:lo.T(x1),hi1:hi.T(x1),slab:i});
  }
  slabs.push(iv);
 }
 const alle=[];slabs.forEach(s=>s.forEach(iv=>alle.push(iv)));
 const eltern=alle.map((_,i)=>i);
 const wurzel=i=>{while(eltern[i]!==i){eltern[i]=eltern[eltern[i]];i=eltern[i]}return i};
 const idx=new Map();alle.forEach((iv,i)=>idx.set(iv,i));
 for(let i=0;i+1<slabs.length;i++){
  slabs[i].forEach(I=>slabs[i+1].forEach(J=>{
   if(Math.min(I.hi1,J.hi0)-Math.max(I.lo1,J.lo0)>=-1e-6)eltern[wurzel(idx.get(I))]=wurzel(idx.get(J));
  }));
 }
 const gruppen=new Map();
 alle.forEach((iv,i)=>{const w=wurzel(i);if(!gruppen.has(w))gruppen.set(w,[]);gruppen.get(w).push(iv)});
 const stuecke=[];
 gruppen.forEach(l=>{
  l.sort((p,q)=>p.slab-q.slab);
  let flaeche=0,tLo=Infinity,tHi=-Infinity;
  l.forEach(iv=>{
   flaeche+=(iv.x1-iv.x0)*((iv.hi0-iv.lo0)+(iv.hi1-iv.lo1))/2;
   tLo=Math.min(tLo,iv.lo0,iv.lo1);tHi=Math.max(tHi,iv.hi0,iv.hi1);
  });
  if(flaeche<1)return;
  const first=l[0],last=l[l.length-1];
  stuecke.push({
   trapeze:l,flaeche,tLo,tHi,
   links:{lo:first.lo0,hi:first.hi0},rechts:{lo:last.lo1,hi:last.hi1},
   x0:first.x0,x1:last.x1
  });
 });
 stuecke.sort((p,q)=>p.tLo-q.tLo);
 return stuecke;
}

// Falzrichtung je FALZ (nicht je Bahn): eine Bahn hat zwei Falze (linke und rechte Kante), benachbarte Bahnen teilen sich einen.
// Falz j liegt an der linken Kante von Bahn j und an der rechten von Bahn j-1; es gibt Bahnen+1 Falze.
// Richtung "links"/"rechts" (Blick Richtung First) = quer zum Falz, der Pfeil zeigt zur Seite, auf die der Falz gelegt wird.
// Der Obergriff liegt an der Bahn, von der der Pfeil wegzeigt.
function mdFalzRichtungen(e,bahnen,W){
 const start=e&&e.start==="rechts"?"rechts":"links";
 const modus=(e&&e.falzModus)||"alle_rechts";
 const nJ=bahnen.length+1;
 const pos=j=>j===0?bahnen[0].S0:bahnen[j-1].S1;
 const phys=dSc=>start==="links"?(dSc==="-"?"links":"rechts"):(dSc==="-"?"rechts":"links");
 const out=new Array(nJ).fill("rechts");
 const pIdx=[];bahnen.forEach((b,i)=>{if(b.art==="passbahn")pIdx.push(i)});
 let hinweis="";
 if(modus==="alle_links")out.fill("links");
 else if(modus==="alle_rechts")out.fill("rechts");
 else if(modus==="von_mitte_weg")for(let j=0;j<nJ;j++)out[j]=phys(pos(j)<W/2-1e-6?"-":"+");
 else if(modus==="von_passbahn_weg"||modus==="zur_passbahn_hin"){
  if(!pIdx.length)hinweis="Es gibt keine Passbahn – alle Falze zeigen nach rechts.";
  else{
   const weg=modus==="von_passbahn_weg";
   for(let j=0;j<nJ;j++){
    const c=pos(j);
    let best=pIdx[0],bd=Infinity;
    pIdx.forEach(p=>{const d=Math.abs((bahnen[p].S0+bahnen[p].S1)/2-c);if(d<bd){bd=d;best=p}});
    const links=c<(bahnen[best].S0+bahnen[best].S1)/2;      // der Falz liegt links der Passbahn
    out[j]=phys(weg?(links?"-":"+"):(links?"+":"-"));
   }
  }
 }
 const ein=(e&&e.falzEinzel)||{};
 Object.keys(ein).forEach(k=>{
  const j=Number(k);
  if(Number.isInteger(j)&&j>=0&&j<nJ&&(ein[k]==="links"||ein[k]==="rechts"))out[j]=ein[k];
 });
 return {richtungen:out,hinweis,start};
}

// ---- Gesamtrechnung ----------------------------------------------------------
function berechneMetalldach(e){
 const k=mdKonstruktion(e);
 const g={ok:false,konstruktion:k,fehler:k.fehler.slice(),warn:k.warn.slice(),bahnen:[],scharenOk:false,flaeche:k.flaeche,n:k.n};
 if(!k.ok)return g;
 const n=k.n,P=k.punkte;
 const b=Math.max(0,Math.min(n-1,Math.floor(mdZ(e.bezugsseite))));
 const phi=mdHat(e.winkel)?mdZ(e.winkel):90;
 g.bezugsseite=b;g.winkel=phi;
 if(!(phi>=5&&phi<=175)){g.fehler.push("Der Winkel der Scharen zur Bezugsseite muss zwischen 5° und 175° liegen.");return g}
 const A=P[b],B=P[(b+1)%n];
 const el=Math.hypot(B.x-A.x,B.y-A.y);
 const ex=(B.x-A.x)/el,ey=(B.y-A.y)/el;
 const dr=k.sigma*phi*Math.PI/180;
 const u={x:ex*Math.cos(dr)-ey*Math.sin(dr),y:ex*Math.sin(dr)+ey*Math.cos(dr)};   // Richtung der Scharen, unten (Traufe) -> oben (First)
 const v={x:u.y,y:-u.x};                                                           // rechts (Blick Richtung First)
 g.u=u;g.v=v;
 const start=e.start==="rechts"?"rechts":"links";
 g.start=start;
 const sig=start==="links"?1:-1;
 const sT=P.map(p=>sig*(p.x*v.x+p.y*v.y)),tT=P.map(p=>p.x*u.x+p.y*u.y);
 const smin=Math.min(...sT),smax=Math.max(...sT),tmin=Math.min(...tT),tmax=Math.max(...tT);
 g.smin=smin;g.tmin=tmin;g.tmax=tmax;g.sig=sig;
 const W=smax-smin;
 g.breite=W;g.hoehe=tmax-tmin;
 const Q=P.map((p,i)=>({S:sT[i]-smin,T:tT[i]-tmin}));
 g.Q=Q;
 const toXY=(S,T)=>{
  const s=sig*(S+smin),t=T+tmin;
  return {x:s*v.x+t*u.x,y:s*v.y+t*u.y};
 };
 g.toXY=toXY;
 const p=mdZ(e.achsabstand);
 if(!(p>0)){return g}
 // Bahnen: Scharen (volle Deckbreite), Passbahnen, ggf. eine Restbahn am Ende
 const pb=[];
 const rohP=Array.isArray(e.passbahnen)?e.passbahnen:[];
 rohP.forEach(x=>{
  if(!mdHat(x&&x.nach))return;
  const nach=Math.max(0,Math.floor(mdZ(x.nach)));
  pb.push({nach,breite:mdHat(x.breite)&&mdZ(x.breite)>0?mdZ(x.breite):0});
 });
 pb.sort((a,c)=>a.nach-c.nach);
 const fix=pb.reduce((s,x)=>s+x.breite,0);
 const auto=pb.filter(x=>!(x.breite>0));
 let N,rest=0,restBahn=0;
 if(!pb.length){
  N=Math.ceil(W/p-1e-9);
  restBahn=0;
 }else{
  const frei=W-fix;
  if(frei<-1e-6){g.fehler.push("Die festen Passbahn-Breiten ("+mdMm(fix)+" mm) sind breiter als das Dach ("+mdMm(W)+" mm).");return g}
  N=Math.floor(frei/p+1e-9);
  rest=frei-N*p;
  if(auto.length)auto.forEach(x=>{x.breite=rest/auto.length});
  else if(rest>1)restBahn=rest;
 }
 g.anzahlScharen=N;g.rest=rest;
 const sequenz=[];
 let pos=0;
 const einfuegen=nach=>{pb.filter(x=>x.nach===nach).forEach((x,i)=>{if(x.breite>0.5)sequenz.push({art:"passbahn",breite:x.breite})})};
 einfuegen(0);
 for(let i=1;i<=N;i++){
  let w=p;
  if(!pb.length&&i===N)w=W-(N-1)*p;
  sequenz.push({art:"schar",breite:w});
  einfuegen(i);
 }
 // Passbahnen hinter der letzten Schar (nach > N) gelten als "nach der letzten"
 pb.filter(x=>x.nach>N).forEach(x=>{if(x.breite>0.5)sequenz.push({art:"passbahn",breite:x.breite})});
 if(restBahn>1)sequenz.push({art:"rest",breite:restBahn});
 const zL=mdZ(e.zugabeLaenge),fU=mdZ(e.falzUnter),fO=mdZ(e.falzOber);
 const hr=mdHat(e.hilfsriss)?mdZ(e.hilfsriss):0;
 g.hilfsriss=hr;
 let nr=0,pn=0,x0=0;
 const bahnen=sequenz.map((s,i)=>{
  const S0=x0,S1=Math.min(W,x0+s.breite);
  x0+=s.breite;
  let label;
  if(s.art==="passbahn"){pn++;label="P"+pn}
  else{nr++;label=String(nr)}
  const stuecke=mdSchnittStreifen(Q,S0,S1).map(st=>({
   ...st,
   laenge:Math.round(st.tHi-st.tLo+zL),
   laengeLinks:st.links.hi-st.links.lo,laengeRechts:st.rechts.hi-st.rechts.lo,
   untenLinks:hr-st.links.lo,obenLinks:st.links.hi-hr,
   untenRechts:hr-st.rechts.lo,obenRechts:st.rechts.hi-hr
  }));
  return {index:i,art:s.art,label,S0,S1,breite:S1-S0,stuecke};
 });
 const fr=mdFalzRichtungen(e,bahnen,W);
 g.falze=fr.richtungen;
 const dSc=ph=>(ph==="rechts")===(fr.start==="links")?"+":"-";
 bahnen.forEach((bh,i)=>{
  bh.falzLinks=fr.richtungen[i];bh.falzRechts=fr.richtungen[i+1];
  // Der Obergriff liegt an der Bahn, von der der Falzpfeil wegzeigt
  bh.oberLinks=dSc(bh.falzLinks)==="-";bh.oberRechts=dSc(bh.falzRechts)==="+";
  bh.zuschnittBreite=Math.round(bh.breite+(bh.oberLinks?fO:fU)+(bh.oberRechts?fO:fU));
 });
 g.falzHinweis=fr.hinweis;
 g.bahnen=bahnen;
 g.scharenOk=true;
 g.anzahl=bahnen.filter(x=>x.art!=="passbahn").length;
 g.anzahlPassbahnen=bahnen.filter(x=>x.art==="passbahn").length;
 g.ok=true;
 return g;
}

// Zuschnitt-Liste: ein Blech je Stueck einer Bahn
function mdBleche(g){
 const l=[];let nr=0;
 if(!g||!g.scharenOk)return l;
 g.bahnen.forEach(b=>{
  b.stuecke.forEach((s,j)=>{
   nr++;
   const mehr=b.stuecke.length>1?" · Teil "+(j+1):"";
   l.push({nr,bahn:b.label,laenge:s.laenge,breite:b.zuschnittBreite,
    merkmal:(b.art==="passbahn"?"Passbahn "+b.label:(b.art==="rest"?"Restbahn":"Schar"))+mehr+" · Breite "+mdMm(b.zuschnittBreite)+" mm"});
  });
 });
 return l.filter(x=>x.laenge>0&&x.breite>0);
}

// ---- 3. Plan (SVG) -----------------------------------------------------------
function mdPlanSvg(g,opt){
 const o=opt||{};
 const k=g&&g.konstruktion;
 if(!k||!k.punkte||k.punkte.length<2){
  return '<div class="small" style="padding:10px;color:var(--muted)">Noch kein Grundriss – bitte die Seitenlängen erfassen.</div>';
 }
 const P=k.punkte,n=P.length;
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 P.forEach(p=>{xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y)});
 const bw=Math.max(1,xmax-xmin),bh=Math.max(1,ymax-ymin);
 const W=680,rand=46;
 const sc=(W-2*rand)/bw;
 const H=Math.max(180,Math.round(bh*sc+2*rand));
 const X=x=>(rand+(x-xmin)*sc).toFixed(1),Y=y=>(rand+(ymax-y)*sc).toFixed(1);
 const fs=12;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
 s+=`<defs><pattern id="mdPass" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#ffe3bf"/><line x1="0" y1="0" x2="0" y2="8" stroke="#e08a1e" stroke-width="2"/></pattern></defs>`;
 const poly=pts=>pts.map(p=>X(p.x)+","+Y(p.y)).join(" ");
 // Flaeche
 s+=`<polygon points="${poly(P)}" fill="#eef3f8" stroke="none"/>`;
 // Scharen

 if(g.scharenOk){
  g.bahnen.forEach((b,bi)=>{
   const fill=b.art==="passbahn"?"url(#mdPass)":(bi%2?"#d6e6f5":"#c4daef");
   b.stuecke.forEach(st=>{
    st.trapeze.forEach(t=>{
     const a=g.toXY(t.x0,t.lo0),c=g.toXY(t.x1,t.lo1),d=g.toXY(t.x1,t.hi1),e2=g.toXY(t.x0,t.hi0);
     s+=`<polygon points="${poly([a,c,d,e2])}" fill="${fill}" stroke="#7d93a8" stroke-width="0.8"/>`;
    });
   });
  });
  // Hilfsriss
  const h1=g.toXY(0,g.hilfsriss),h2=g.toXY(g.breite,g.hilfsriss);
  s+=`<clipPath id="mdKlemme"><polygon points="${poly(P)}"/></clipPath>`;
  s+=`<line x1="${X(h1.x)}" y1="${Y(h1.y)}" x2="${X(h2.x)}" y2="${Y(h2.y)}" stroke="#c0392b" stroke-width="1.4" stroke-dasharray="6 4" clip-path="url(#mdKlemme)"/>`;

  // Nummern + Falzpfeile
  g.bahnen.forEach(b=>{
   const st=b.stuecke.reduce((m,x)=>(!m||x.flaeche>m.flaeche)?x:m,null);
   if(!st)return;
   const c=g.toXY((st.x0+st.x1)/2,(st.tLo+st.tHi)/2);
   s+=`<text x="${X(c.x)}" y="${Y(c.y)}" text-anchor="middle" font-size="${b.art==="passbahn"?11:12}" font-weight="700" fill="#1f2d3a" paint-order="stroke" stroke="#fff" stroke-width="3">${mdEsc(b.label)}</text>`;
  });
  // Falzrichtung: je Falz ein gebogener Pfeil quer zum Falz (ausgerichtet an der Bahn), der Pfeil zeigt zur Seite, auf die der Falz gelegt wird
  const nJ=g.bahnen.length+1;
  for(let j=0;j<nJ;j++){
   const sPos=j===0?g.bahnen[0].S0:g.bahnen[j-1].S1;
   let best=null;
   const kand=(bh,seite)=>{if(bh)bh.stuecke.forEach(st=>{const ed=seite==="r"?st.rechts:st.links;const len=ed.hi-ed.lo;if(!best||len>best.len)best={len,T:(ed.lo+ed.hi)/2}})};
   kand(g.bahnen[j-1],"r");kand(g.bahnen[j],"l");
   if(!best||best.len<1)continue;
   const dSc=((g.falze[j]==="rechts")===(g.start==="links"))?"+":"-";
   const P0=g.toXY(sPos,best.T),P1=g.toXY(sPos+500,best.T),P2=g.toXY(sPos,best.T+500);
   const cx=Number(X(P0.x)),cy=Number(Y(P0.y));
   let ax=Number(X(P1.x))-cx,ay=Number(Y(P1.y))-cy;const al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
   let ux=Number(X(P2.x))-cx,uy=Number(Y(P2.y))-cy;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
   const sg=dSc==="+"?1:-1,h=13;
   const x0=cx-ax*h*sg,y0=cy-ay*h*sg,x1=cx+ax*h*sg,y1=cy+ay*h*sg,qx=cx+ux*8,qy=cy+uy*8;
   let tx=x1-qx,ty=y1-qy;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
   const kopf=w=>{const c2=Math.cos(w),s2=Math.sin(w);return (x1-(tx*c2-ty*s2)*6).toFixed(1)+","+(y1-(tx*s2+ty*c2)*6).toFixed(1)};
   const pfad=`M${x0.toFixed(1)},${y0.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
   const spitze=`${kopf(0.55)} ${x1.toFixed(1)},${y1.toFixed(1)} ${kopf(-0.55)}`;
   s+=`<g data-md-falz="${j}" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${pfad}" stroke="#fff" stroke-width="4.5"/><polyline points="${spitze}" stroke="#fff" stroke-width="4.5"/><path d="${pfad}" stroke="#1b6e3a" stroke-width="1.8"/><polyline points="${spitze}" stroke="#1b6e3a" stroke-width="1.8"/></g>`;
  }
 }
 // Diagonalen (nur erfasste)
 const dm=mdDiagMap(o.diagonalen,n);
 dm.forEach(d=>{
  const a=P[d.von],b=P[d.nach];
  s+=`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="#8a97a3" stroke-width="1" stroke-dasharray="5 4"/>`;
  s+=`<text x="${X((a.x+b.x)/2)}" y="${Y((a.y+b.y)/2)}" text-anchor="middle" font-size="10" fill="#5d6b78" paint-order="stroke" stroke="#fff" stroke-width="3">${mdMm(d.mass)}</text>`;
 });
 // Umriss + Seitenlaengen
 s+=`<polygon points="${poly(P)}" fill="none" stroke="#22303c" stroke-width="2"/>`;
 const cx=P.reduce((a,p)=>a+p.x,0)/n,cy=P.reduce((a,p)=>a+p.y,0)/n;
 for(let i=0;i<n;i++){
  const a=P[i],b=P[(i+1)%n];
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  let nx=-(b.y-a.y),ny=b.x-a.x;const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  if(nx*(mx-cx)+ny*(my-cy)<0){nx=-nx;ny=-ny}
  const tx=Number(X(mx))+nx*16,ty=Number(Y(my))-ny*16+4;
  const len=k.seiten?k.seiten[i]:Math.hypot(b.x-a.x,b.y-a.y);
  const bez=(g.bezugsseite===i)?" ★":"";
  s+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="600" fill="#0d4f8b" paint-order="stroke" stroke="#fff" stroke-width="3">${mdMm(len)}${bez}</text>`;
 }
 // Innenwinkel in den Ecken
 if(k.winkel&&k.winkel.length===n){
  P.forEach((q,i)=>{
   const nx=P[(i+1)%n],pv=P[(i+n-1)%n];
   let a1={x:nx.x-q.x,y:nx.y-q.y},a2={x:pv.x-q.x,y:pv.y-q.y};
   const l1=Math.hypot(a1.x,a1.y)||1,l2=Math.hypot(a2.x,a2.y)||1;
   let bx=a1.x/l1+a2.x/l2,by=a1.y/l1+a2.y/l2;
   const bl=Math.hypot(bx,by);
   if(bl<1e-6){bx=-a1.y/l1;by=a1.x/l1}else{bx/=bl;by/=bl}
   if(k.winkel[i]>180)  {bx=-bx;by=-by}
   const tx=Number(X(q.x))+bx*30,ty=Number(Y(q.y))-by*30+4;
   s+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="11" fill="#7a4b00" paint-order="stroke" stroke="#fff" stroke-width="3">${mdWinkel(k.winkel[i])}</text>`;
  });
 }
 // Eckpunkte
 P.forEach((p,i)=>{
  let nx=p.x-cx,ny=p.y-cy;const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  s+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" fill="#fff" stroke="#22303c" stroke-width="1.6"/>`;
  s+=`<text x="${(Number(X(p.x))+nx*15).toFixed(1)}" y="${(Number(Y(p.y))-ny*15+4).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="#22303c">${mdName(i)}</text>`;
 });
 // Richtung der Scharen (First = oben)
 if(g.scharenOk){
  const len=24,ex=g.u.x*len,ey=-g.u.y*len;
  const ax=W-34-(ex<0?ex:0)+(ex>0?0:0),ay=ey>=0?H-46:H-20;
  s+=`<defs><marker id="mdPfeil" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#1b6e3a"/></marker></defs>`;
  s+=`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${(ax+ex).toFixed(1)}" y2="${(ay+ey).toFixed(1)}" stroke="#1b6e3a" stroke-width="2" marker-end="url(#mdPfeil)"/>`;
  s+=`<text x="${(ax-6).toFixed(1)}" y="${(ay+(ey>=0?10:0)).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" fill="#1b6e3a">First</text>`;
 }
 s+=`<text x="${W-8}" y="${H-7}" text-anchor="end" font-size="10" fill="#8b969e">Metalldach · Grundriss in wahrer Grösse${g.scharenOk?" · ★ Bezugsseite · rot gestrichelt Hilfsriss · gebogener Pfeil = Falzrichtung":""}</text></svg>`;
 return s;
}
