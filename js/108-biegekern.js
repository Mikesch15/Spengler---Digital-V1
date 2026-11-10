"use strict";
// ===========================================================================
// Biegeanalyse - Rechenkern (v3.441)
// ===========================================================================
// Ansage des Anwenders: «3D-Live-Biegeanalyse mit Bewegung, Schwenkbiegemaschinen (Jorns 6 m, Schröder 3 m)».
//
// WAS DAS IST: eine reine Geometrie-Rechnung (kein DOM, keine Datenbank). Ein Freies Profil hat ueber die ganze Laenge denselben
// Querschnitt; deshalb wird die Biegefolge im QUERSCHNITT (Seitenansicht) gerechnet: Blech, Unterwange, Klemmwange und Biegewange
// einer Schwenkbiegemaschine, mit echter Drehbewegung des Flansches um die Biegekante.
//
// MODELL (Seitenansicht, Millimeter, y nach oben):
//   - Tischoberkante = y 0, Biegekante = x 0. Das Blech liegt auf der Unterwange (x < 0), die Klemmwange drueckt von oben
//     (ihre Unterkante liegt bei y = Blechstaerke). Der Flansch (x > 0) wird um die Biegekante gedreht:
//     Winkel > 0 = nach oben (Biegewange «auf»), < 0 = nach unten (Biegewange «ab»).
//   - Die Werkzeug-Querschnitte stammen aus den MASCHINENDATEN des Betriebs (js/109). Der Kern erfindet keine Masse.
//   - Pro Schritt wird der Flansch in kleinen Winkelschritten gedreht und gegen Unterwange, Klemmwange, den bereits geklemmten
//     Teil des Blechs und die Biegewange geprueft (Polygon-Ueberlappung, Toleranz aus den Maschinendaten).
//   - Folgensuche: Reihenfolge der Biegungen, Seite der Klemmung und Wenden des Blechs; wenige Wenden werden bevorzugt.
//
// GRENZEN (stehen auch in der Oberflaeche): Innenradius und Rueckfederung werden nicht gerechnet; Umschlaege (180 Grad) werden
// bis 150 Grad geprueft und dann als «zugedrueckt» angenommen; die Biegewange dreht um ihren Drehpunkt mit demselben Winkel wie
// der Flansch. Es ist eine Planungshilfe, keine zertifizierte Simulation.
// ===========================================================================

const BGA_HEM_PRUEF_GRAD=150;      // Umschlaege: bis hierhin pruefen, danach gilt «wird zugedrueckt»
const BGA_WINKEL_SCHRITT=3;        // Grad je Pruefschritt
const BGA_MAX_BIEGUNGEN_SUCHE=10;  // darueber nur noch Pruefung einer vorgegebenen Folge
const BGA_MAX_PRUEFUNGEN=6000;     // Zeitgrenze der Suche (Anzahl Schritt-Pruefungen)

function bgaRad(d){return d*Math.PI/180}

// ---- Profil -----------------------------------------------------------------
// schenkel: [{laenge,winkel}] wie in js/14 (winkel: Drehung vor dem Schenkel, im Uhrzeigersinn der Zeichnung positiv).
function bgaProfil(schenkel){
 const seg=(Array.isArray(schenkel)?schenkel:[]).map((s,i)=>({
  laenge:Math.max(0,Number(s&&s.laenge)||0),
  winkel:i===0?0:(Number(s&&s.winkel)||0)
 }));
 const biegungen=[];
 seg.forEach((s,i)=>{if(i>0&&Math.abs(s.winkel)>0.0001&&s.laenge>=0)biegungen.push(i)});
 return {seg,biegungen};
}
// Mittellinie des Blechs nach den bereits ausgefuehrten Biegungen (erledigt = Set der Schenkelindizes). y nach oben.
function bgaPunkte(profil,erledigt){
 const pts=[[0,0]];let dir=0;
 profil.seg.forEach((s,i)=>{
  if(i>0&&erledigt&&erledigt.has(i))dir+=-bgaRad(s.winkel);   // Uhrzeigersinn der Zeichnung = mathematisch negativ
  pts.push([pts[i][0]+s.laenge*Math.cos(dir),pts[i][1]+s.laenge*Math.sin(dir)]);
 });
 return pts;
}

// ---- Polygone ---------------------------------------------------------------
function bgaFlaeche2(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1]}return a}
function bgaZeigerKreuz(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function bgaImDreieck(p,a,b,c){
 const d1=bgaZeigerKreuz(a,b,p),d2=bgaZeigerKreuz(b,c,p),d3=bgaZeigerKreuz(c,a,p);
 return d1>=-1e-9&&d2>=-1e-9&&d3>=-1e-9;
}
// Zerlegt ein einfaches Polygon (auch nicht konvex) in Dreiecke (Ohrenschneiden). Die Dreiecke sind konvex.
function bgaDreiecke(poly){
 let P=poly.map(p=>[Number(p[0])||0,Number(p[1])||0]);
 if(P.length<3)return [];
 if(bgaFlaeche2(P)<0)P.reverse();
 const out=[];let sicher=P.length*P.length+10;
 while(P.length>3&&sicher-->0){
  let ohr=false;
  for(let i=0;i<P.length;i++){
   const a=P[(i+P.length-1)%P.length],b=P[i],c=P[(i+1)%P.length];
   if(bgaZeigerKreuz(a,b,c)<=1e-9)continue;                       // konkave Ecke
   let leer=true;
   for(let j=0;j<P.length;j++){
    const q=P[j];if(q===a||q===b||q===c)continue;
    if(bgaImDreieck(q,a,b,c)){leer=false;break}
   }
   if(!leer)continue;
   out.push([a,b,c]);P.splice(i,1);ohr=true;break;
  }
  if(!ohr)break;
 }
 if(P.length===3)out.push([P[0],P[1],P[2]]);
 return out;
}
// Tiefe der Ueberlappung zweier KONVEXER Polygone (0 = getrennt oder nur beruehrt)
function bgaTiefe(A,B){
 let min=Infinity;
 for(const poly of [A,B]){
  for(let i=0;i<poly.length;i++){
   const p=poly[i],q=poly[(i+1)%poly.length];
   let nx=-(q[1]-p[1]),ny=q[0]-p[0];const l=Math.hypot(nx,ny);if(l<1e-12)continue;nx/=l;ny/=l;
   let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity;
   for(const r of A){const d=r[0]*nx+r[1]*ny;if(d<a0)a0=d;if(d>a1)a1=d}
   for(const r of B){const d=r[0]*nx+r[1]*ny;if(d<b0)b0=d;if(d>b1)b1=d}
   const ue=Math.min(a1,b1)-Math.max(a0,b0);
   if(ue<=0)return 0;
   if(ue<min)min=ue;
  }
 }
 return min===Infinity?0:min;
}
// Dicke Strecke (Blechsegment) als Rechteck um die Mittellinie
function bgaSegmentPoly(p,q,t){
 const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);
 if(l<1e-9)return null;
 const h=t/2,nx=-dy/l*h,ny=dx/l*h;
 return [[p[0]+nx,p[1]+ny],[q[0]+nx,q[1]+ny],[q[0]-nx,q[1]-ny],[p[0]-nx,p[1]-ny]];
}
function bgaDrehen(p,c,w){const s=Math.sin(w),k=Math.cos(w),x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*k-y*s,c[1]+x*s+y*k]}
function bgaVerschieben(poly,dx,dy){return poly.map(p=>[p[0]+dx,p[1]+dy])}

// ---- Maschine -----------------------------------------------------------------
// m: {laenge_mm,min_klemm_mm,max_winkel_auf,max_winkel_ab,toleranz_mm,
//     unterwange:[poly,...], klemmwange:[poly,...], biegewange_auf:{teile:[poly,...],drehpunkt:[x,y]}, biegewange_ab:{...}}
// Alle Werkzeug-Polygone werden einmal in konvexe Dreiecke zerlegt (Zwischenspeicher je Maschinenobjekt).
const BGA_CACHE=new WeakMap();
function bgaMaschineVorbereiten(m){
 if(m&&BGA_CACHE.has(m))return BGA_CACHE.get(m);
 const zer=teile=>[].concat(...(teile||[]).map(bgaDreiecke));
 const bw=b=>b&&Array.isArray(b.teile)?{dreiecke:zer(b.teile),drehpunkt:Array.isArray(b.drehpunkt)?b.drehpunkt.map(Number):[0,0]}:null;
 const d={unter:zer(m&&m.unterwange),klemm:zer(m&&m.klemmwange),auf:bw(m&&m.biegewange_auf),ab:bw(m&&m.biegewange_ab)};
 if(m&&typeof m==="object")BGA_CACHE.set(m,d);   // WeakMap: auch eingefrorene Objekte (Beispielmaschine) koennen zwischengespeichert werden
 return d;
}
function bgaMaschineFehler(m){
 const f=[];
 if(!m||typeof m!=="object")return ["Keine Maschine."];
 if(!(Number(m.laenge_mm)>0))f.push("Die Arbeitslänge fehlt.");
 if(!Array.isArray(m.unterwange)||!m.unterwange.length)f.push("Die Unterwange fehlt.");
 if(!Array.isArray(m.klemmwange)||!m.klemmwange.length)f.push("Die Klemmwange fehlt.");
 if(!(m.biegewange_auf&&Array.isArray(m.biegewange_auf.teile)&&m.biegewange_auf.teile.length)&&!(m.biegewange_ab&&Array.isArray(m.biegewange_ab.teile)&&m.biegewange_ab.teile.length))f.push("Es ist keine Biegewange eingetragen.");
 return f;
}

// ---- Ein Schritt: Lage und Pruefung --------------------------------------------
const BGA_KONFIGS=[{klemm:"links",flip:false},{klemm:"rechts",flip:false},{klemm:"links",flip:true},{klemm:"rechts",flip:true}];
// Welche Blechseite liegt oben? (links/rechts der Zeichnungs-Laufrichtung) - bei gleichem Wert muss das Blech nicht gewendet werden.
function bgaSeiteOben(cfg){return cfg.klemm==="links"?(cfg.flip?"R":"L"):(cfg.flip?"L":"R")}

// Stellt das Blech fuer Biegung k (Schenkelindex) in die Maschine: Biegepunkt = (0,t/2), geklemmter Teil nach links, Flansch nach rechts.
// erledigt: bereits ausgefuehrte Biegungen (ohne k). Liefert Punkte, Index des Biegepunkts und den Zielwinkel (Grad, + = hoch).
function bgaLage(profil,erledigt,k,cfg,t){
 const pts=bgaPunkte(profil,erledigt);
 const n=profil.seg.length;
 if(!(k>=1&&k<n))return null;
 let Q=cfg.klemm==="links"?pts.slice():pts.slice().reverse();
 const vi=cfg.klemm==="links"?k:(n-k);
 // Eintrittsrichtung in den Biegepunkt nach +x drehen
 let a=Q[vi-1],v=Q[vi],dir=0;
 for(let j=vi;j>=1;j--){const d=Math.hypot(Q[j][0]-Q[j-1][0],Q[j][1]-Q[j-1][1]);if(d>1e-9){a=Q[j-1];dir=Math.atan2(Q[j][1]-Q[j-1][1],Q[j][0]-Q[j-1][0]);break}}
 const w=-dir;
 Q=Q.map(p=>{
  let x=p[0]-v[0],y=p[1]-v[1];
  const rx=x*Math.cos(w)-y*Math.sin(w),ry=x*Math.sin(w)+y*Math.cos(w);
  let yy=ry;if(cfg.flip)yy=-ry;
  return [rx,yy+t/2];
 });
 const kappa=-profil.seg[k].winkel;                              // mathematisch, + = gegen den Uhrzeigersinn
 const theta=kappa*(cfg.klemm==="rechts"?-1:1)*(cfg.flip?-1:1);
 return {Q,vi,theta,vertex:[0,t/2]};
}
// Drehpunkt des Flansches: bei Biegungen nach oben die Klemmwangen-Kante (Oberseite des Blechs, y = t), nach unten die Tischkante (y = 0) -
// die Innenseite der Biegung bleibt an der Werkzeugkante (nicht die Mittellinie - sonst stiesse der Flansch an die Kante).
function bgaDrehpunkt(theta,t){return [0,theta>=0?t:0]}
// Blechsegmente (Polygone) des geklemmten Teils und des Flansches bei Drehwinkel w (Radiant)
function bgaBlechPolys(lage,t,w){
 const {Q,vi}=lage;const vertex=bgaDrehpunkt(lage.theta,t);
 const klemm=[],flansch=[];
 for(let j=0;j<Q.length-1;j++){
  if(j<vi){const p=bgaSegmentPoly(Q[j],Q[j+1],t);if(p)klemm.push({j,poly:p})}
  else{
   const p0=bgaDrehen(Q[j],vertex,w),p1=bgaDrehen(Q[j+1],vertex,w);
   const p=bgaSegmentPoly(p0,p1,t);if(p)flansch.push({j,poly:p})
  }
 }
 return {klemm,flansch};
}
function bgaKollidiert(polyA,dreiecke,tol){
 let tiefe=0;
 for(const d of dreiecke){const x=bgaTiefe(polyA,d);if(x>tiefe)tiefe=x}
 return tiefe>tol?tiefe:0;
}
// Pruefung einer Biegung. opt.schnell: beim ersten Fund abbrechen (Suche).
function bgaSchrittPruefen(profil,erledigt,k,cfg,m,t,opt){
 const o=opt||{};
 const res={moeglich:true,k,cfg,theta:0,probleme:[],hinweise:[],maxWinkelGeprueft:0,seiteOben:bgaSeiteOben(cfg)};
 const lage=bgaLage(profil,erledigt,k,cfg,t);
 if(!lage){res.moeglich=false;res.probleme.push({art:"fehler",text:"Diese Biegung gibt es nicht."});return res}
 res.theta=lage.theta;res.lage=lage;
 const tol=Number(m.toleranz_mm)>=0&&m.toleranz_mm!==""&&m.toleranz_mm!=null?Number(m.toleranz_mm):0.3;
 const D=bgaMaschineVorbereiten(m);
 const auf=lage.theta>0;
 const beam=auf?D.auf:D.ab;
 const fehl=(art,text,extra)=>{res.moeglich=false;res.probleme.push(Object.assign({art,text},extra||{}));return o.schnell};
 const absTheta=Math.abs(lage.theta);
 if(absTheta<1e-6)return res;
 if(!beam){fehl("maschine","Die Maschine hat keine Biegewange für "+(auf?"Biegungen nach oben":"Biegungen nach unten")+" – das Blech müsste gewendet werden.");if(o.schnell)return res}
 const maxW=Number(auf?m.max_winkel_auf:m.max_winkel_ab);
 if(maxW>0&&absTheta>maxW+1e-6&&absTheta>BGA_HEM_PRUEF_GRAD){/* Umschlag: wird weiter unten behandelt */}
 else if(maxW>0&&absTheta>maxW+1e-6){fehl("winkel","Winkel "+Math.round(absTheta)+"° ist grösser als die Maschine "+(auf?"nach oben":"nach unten")+" biegt ("+maxW+"°).");if(o.schnell)return res}
 // geklemmter Schenkel lang genug?
 const lc=Math.hypot(lage.Q[lage.vi][0]-lage.Q[lage.vi-1][0],lage.Q[lage.vi][1]-lage.Q[lage.vi-1][1]);
 const minK=Number(m.min_klemm_mm)||0;
 if(minK>0&&lc<minK-1e-6){fehl("klemmung","Der geklemmte Schenkel ("+Math.round(lc*10)/10+" mm) ist kürzer als die Mindest-Klemmbreite ("+minK+" mm).");if(o.schnell)return res}
 if(!beam&&o.schnell)return res;
 // Bewegung pruefen
 const istUmschlag=absTheta>BGA_HEM_PRUEF_GRAD+1e-6&&absTheta>=170;
 const ziel=istUmschlag?(maxW>0?Math.min(BGA_HEM_PRUEF_GRAD,maxW):BGA_HEM_PRUEF_GRAD):absTheta;
 if(istUmschlag)res.hinweise.push("Umschlag: bis "+Math.round(ziel)+"° geprüft, danach wird er zugedrückt (Falzdicke nicht doppelt gerechnet).");
 const sign=auf?1:-1;
 const schritte=Math.max(1,Math.ceil(ziel/BGA_WINKEL_SCHRITT));
 const gefunden=new Set();
 const klemmwange=D.klemm.map(tr=>bgaVerschieben(tr,0,t));
 const unter=D.unter;
 // statisch: geklemmter Teil gegen Werkzeuge
 const stat=bgaBlechPolys(lage,t,0);
 for(const s of stat.klemm){
  for(const [namen,tri] of [["Unterwange",unter],["Klemmwange",klemmwange]]){
   const x=bgaKollidiert(s.poly,tri,tol);
   if(x&&!gefunden.has("K"+s.j+namen)){gefunden.add("K"+s.j+namen);
    fehl("kollision","Der bereits gebogene Teil des Blechs (Schenkel "+(s.j+1)+") stösst an die "+namen+".",{winkel:0,teil:namen,schenkel:s.j,tiefe:x});if(o.schnell)return res}
  }
 }
 for(let i=1;i<=schritte;i++){
  const winkel=Math.min(ziel,i*BGA_WINKEL_SCHRITT)*sign;
  const bp=bgaBlechPolys(lage,t,bgaRad(winkel));
  res.maxWinkelGeprueft=Math.abs(winkel);
  // Biegewange um ihren Drehpunkt mitdrehen
  let bTri=[];
  if(beam){
   const b=bgaRad(winkel);
   bTri=beam.dreiecke.map(tr=>tr.map(p=>bgaDrehen(auf?p:[p[0],p[1]+t],auf?beam.drehpunkt:[beam.drehpunkt[0],beam.drehpunkt[1]+t],b)));
  }
  for(const f of bp.flansch){
   for(const [namen,tri] of [["Unterwange",unter],["Klemmwange",klemmwange]]){
    const x=bgaKollidiert(f.poly,tri,tol);
    if(x&&!gefunden.has("F"+f.j+namen)){gefunden.add("F"+f.j+namen);
     fehl("kollision","Der Flansch (Schenkel "+(f.j+1)+") stösst bei "+Math.round(Math.abs(winkel))+"° an die "+namen+".",{winkel,teil:namen,schenkel:f.j,tiefe:x});if(o.schnell)return res}
   }
   // Biegewange: der erste Flansch liegt an ihr (gewollt), spaetere Schenkel duerfen sie nicht beruehren
   if(f.j>lage.vi){
    const x=bgaKollidiert(f.poly,bTri,tol);
    if(x&&!gefunden.has("F"+f.j+"Biegewange")){gefunden.add("F"+f.j+"Biegewange");
     fehl("kollision","Schenkel "+(f.j+1)+" stösst bei "+Math.round(Math.abs(winkel))+"° an die Biegewange.",{winkel,teil:"Biegewange",schenkel:f.j,tiefe:x});if(o.schnell)return res}
   }
   // Flansch gegen den geklemmten Teil (ausser dem unmittelbar angrenzenden Schenkel)
   for(const c of bp.klemm){
    if(c.j===lage.vi-1&&f.j===lage.vi)continue;
    const x=bgaTiefe(f.poly,c.poly);
    if(x>tol&&!gefunden.has("S"+f.j+"_"+c.j)){gefunden.add("S"+f.j+"_"+c.j);
     fehl("kollision","Schenkel "+(f.j+1)+" und Schenkel "+(c.j+1)+" stossen bei "+Math.round(Math.abs(winkel))+"° aufeinander.",{winkel,teil:"Blech",schenkel:f.j,tiefe:x});if(o.schnell)return res}
   }
  }
 }
 return res;
}

// ---- Folgensuche -------------------------------------------------------------
// Sucht Reihenfolge, Klemmseite und Wenden: moeglichst wenige Wenden, sonst die natuerliche Reihenfolge von vorn nach hinten.
function bgaFolgeSuchen(profil,m,t,opt){
 const B=profil.biegungen;const n=B.length;
 if(n===0)return {ok:true,schritte:[],wenden:0,pruefungen:0};
 if(n>BGA_MAX_BIEGUNGEN_SUCHE)return {ok:false,zuViele:true,schritte:[],pruefungen:0};
 const voll=(1<<n)-1;
 const memo=new Map(),gueltig=new Map();
 let pruefungen=0,abgebrochen=false;
 const maskeSet=mask=>{const s=new Set();for(let i=0;i<n;i++)if(mask&(1<<i))s.add(B[i]);return s};
 function pruef(mask,i,ci){
  const key=mask*64+i*4+ci;
  if(gueltig.has(key))return gueltig.get(key);
  if(++pruefungen>BGA_MAX_PRUEFUNGEN){abgebrochen=true;gueltig.set(key,null);return null}
  const r=bgaSchrittPruefen(profil,maskeSet(mask),B[i],BGA_KONFIGS[ci],m,t,{schnell:true});
  const v=r.moeglich?{theta:r.theta}:null;
  gueltig.set(key,v);return v;
 }
 function loesen(mask,seite){
  if(mask===voll)return {kosten:0,schritte:[]};
  const key=mask*3+(seite+1);
  if(memo.has(key))return memo.get(key);
  let best=null;
  for(let i=0;i<n&&!abgebrochen;i++){
   if(mask&(1<<i))continue;
   for(let ci=0;ci<4;ci++){
    if(!pruef(mask,i,ci))continue;
    const cfg=BGA_KONFIGS[ci],s=bgaSeiteOben(cfg)==="L"?0:1;
    const wenden=(seite>=0&&s!==seite)?1:0;
    if(best&&wenden>=best.kosten)continue;
    const rest=loesen(mask|(1<<i),s);
    if(!rest)continue;
    const kosten=wenden+rest.kosten;
    if(!best||kosten<best.kosten){best={kosten,schritte:[{k:B[i],cfg}].concat(rest.schritte)};if(kosten===0)break}
   }
   if(best&&best.kosten===0)break;
  }
  memo.set(key,best);return best;
 }
 const l=loesen(0,-1);
 if(!l)return {ok:false,abgebrochen,schritte:[],pruefungen};
 return {ok:true,schritte:l.schritte,wenden:l.kosten,pruefungen};
}
// Prueft eine vorgegebene Folge ([{k,klemm,flip}]) vollstaendig (alle Probleme, nicht nur das erste).
function bgaFolgeAnalysieren(profil,m,t,folge){
 const erledigt=new Set();const out=[];let wenden=0,vorher=null;
 for(const s of folge){
  const cfg={klemm:s.klemm||"links",flip:!!s.flip};
  const r=bgaSchrittPruefen(profil,erledigt,s.k,cfg,m,t,{schnell:false});
  const seite=bgaSeiteOben(cfg);
  r.wendet=vorher!==null&&vorher!==seite;if(r.wendet)wenden++;
  vorher=seite;out.push(r);erledigt.add(s.k);
 }
 return {schritte:out,wenden,ok:out.every(r=>r.moeglich)};
}
// Gesamtbewertung inkl. Maschinenlaenge
function bgaTeilLaengePruefen(m,laenge){
 const L=Number(laenge)||0,M=Number(m&&m.laenge_mm)||0;
 if(L>0&&M>0&&L>M)return "Das Teil ("+Math.round(L)+" mm) ist länger als die Maschine ("+Math.round(M)+" mm).";
 return "";
}
// Das Blech nach allen Biegungen (fuer die Darstellung)
function bgaEndPunkte(profil){return bgaPunkte(profil,new Set(profil.biegungen))}

// ---- Einzelbild der Bewegung (fuer die Darstellung) ------------------------------------
// Pose bei Drehwinkel winkelGrad (mit Vorzeichen wie lage.theta): liefert die Punkte des Blechs (geklemmter Teil unveraendert,
// Flansch um den Drehpunkt gedreht), die Lage der Biegewange und die aktuellen Kollisionen.
function bgaPose(lage,m,t,winkelGrad){
 const D=bgaMaschineVorbereiten(m);
 const auf=lage.theta>0;
 const w=bgaRad(winkelGrad);
 const piv=bgaDrehpunkt(lage.theta,t);
 const punkte=lage.Q.map((p,j)=>j<lage.vi?p:bgaDrehen(p,piv,w));
 const beam=auf?D.auf:D.ab;
 let beamPolys=[];
 if(beam&&m){
  const b=auf?m.biegewange_auf:m.biegewange_ab;
  const dp=beam.drehpunkt,c=auf?dp:[dp[0],dp[1]+t];
  beamPolys=(b.teile||[]).map(poly=>poly.map(p=>bgaDrehen(auf?[Number(p[0]),Number(p[1])]:[Number(p[0]),Number(p[1])+t],c,w)));
 }
 const tol=Number(m&&m.toleranz_mm)>=0&&m&&m.toleranz_mm!==""&&m.toleranz_mm!=null?Number(m.toleranz_mm):0.3;
 const klemmwange=D.klemm.map(tr=>bgaVerschieben(tr,0,t));
 const bp=bgaBlechPolys(lage,t,w);
 let bTri=[];if(beam)bTri=beam.dreiecke.map(tr=>tr.map(p=>bgaDrehen(auf?p:[p[0],p[1]+t],auf?beam.drehpunkt:[beam.drehpunkt[0],beam.drehpunkt[1]+t],w)));
 const koll=[];
 const melde=(teil,j,tiefe)=>{if(!koll.some(k=>k.teil===teil&&k.schenkel===j))koll.push({teil,schenkel:j,tiefe})};
 for(const c of bp.klemm){
  for(const [n,tri] of [["Unterwange",D.unter],["Klemmwange",klemmwange]]){const x=bgaKollidiert(c.poly,tri,tol);if(x)melde(n,c.j,x)}
 }
 for(const f of bp.flansch){
  for(const [n,tri] of [["Unterwange",D.unter],["Klemmwange",klemmwange]]){const x=bgaKollidiert(f.poly,tri,tol);if(x)melde(n,f.j,x)}
  if(f.j>lage.vi){const x=bgaKollidiert(f.poly,bTri,tol);if(x)melde("Biegewange",f.j,x)}
  for(const c of bp.klemm){
   if(c.j===lage.vi-1&&f.j===lage.vi)continue;
   const x=bgaTiefe(f.poly,c.poly);if(x>tol)melde("Blech",f.j,x);
  }
 }
 return {punkte,vi:lage.vi,beam:beamPolys,klemm:(m&&m.klemmwange||[]).map(poly=>bgaVerschieben(poly,0,t)),unter:m&&m.unterwange||[],kollisionen:koll,piv};
}
