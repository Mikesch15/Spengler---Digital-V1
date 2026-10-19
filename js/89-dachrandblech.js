"use strict";
// ===========================================================================
// DACHRANDBLECH · Massaufnahme (v3.369)
// ---------------------------------------------------------------------------
// Dachrandblech ist eine VARIANTE des Freien Profils (js/14, js/31) - keine
// Parallellösung: gleiches Modell (fpA), gleiche Schenkel-Erfassung, Profil-
// zeichnung, Skizzen-Erkennung, Zuschnitt aus Rollenblech/Tafel, Ausmass und
// Kontrolle. Neu sind
//   - die Wahl des Profils: "Detail 1.5" (alle Masse anpassbar) oder ein
//     anderes Detail (Profil selbst erstellen, wie beim Freien Profil),
//   - der Grundriss (Kanten mit Ecken -> Gesamtlänge, Aussen-/Inneneckenzahl),
//   - Länge pro Stück und Überlappung -> die Stücke (== die Segmente des
//     Freien Profils, deshalb funktioniert der Zuschnitt unverändert),
//   - ein passender Einhängestreifen als Vorschlag (Gesamtlänge, Länge je Stück).
//
// Die Segmente werden aus Grundriss, Stücklänge und Überlappung ERZEUGT
// (drbSync) - es gibt keine zweite Stückliste neben fpA.segmente.
//
// Rechenregeln (alles ändert sich nur durch Eingaben, nichts wird geraten):
//  - Stücke je Kante: passt die Kante in ein Stück, ein Stück; sonst
//    n = ceil((L - Ü) / (P - Ü)), Materiallänge = L + (n-1)·Ü. Vorgabe: n-1
//    volle Stücke zu P, das letzte ist der Rest; wahlweise alle gleich lang.
//  - Der Einhängestreifen greift in einen gewählten Umschlag des Profils:
//    Haken = Umschlaglänge - Spiel (mind. 8 mm), Abwicklung = Befestigung +
//    2 × Haken (Haken wird zurückgefalzt). Die Abwicklung ist ein Vorschlag
//    und von Hand überschreibbar.
// ===========================================================================

// Detail 1.5 - die Masse aus der Vorlage des Betriebs (Länge mm, Winkel °).
const DRB_DETAIL_15=Object.freeze([
 {laenge:12,winkel:-45},{laenge:18,winkel:-180},{laenge:160,winkel:135},{laenge:50,winkel:-180},
 {laenge:30,winkel:-45},{laenge:150,winkel:-45},{laenge:12,winkel:180}
]);
const DRB_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Detail",hilfe:"drb-detail"},
 {nr:3,kurz:"Profil",hilfe:"fp-profil"},{nr:4,kurz:"Grundriss",hilfe:"drb-grundriss"},
 {nr:5,kurz:"Stücke",hilfe:"drb-stuecke"},{nr:6,kurz:"Einhängestreifen",hilfe:"drb-streifen"},
 {nr:7,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:8,kurz:"Ausmass",hilfe:"reg-ausmass"},
 {nr:9,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
const DRB_MAX_KANTEN=40;
const DRB_STANDARD={stueckLaenge:3000,ueberlappung:40,befestigung:40,spiel:3};

const drbZ=v=>{const n=Number(String(v===null||v===undefined?"":v).replace(",","."));return Number.isFinite(n)?n:0};
const drbHat=v=>v!==""&&v!==null&&v!==undefined&&Number.isFinite(Number(String(v).replace(",",".")));
const drbMm=v=>Math.round(drbZ(v)).toLocaleString("de-CH");
const drbM=v=>(drbZ(v)/1000).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});

function drbLeer(){
 return {detail:"1.5",kanten:[],geschlossen:false,
  stoss:"ueberlappung",schieber:{zugabe:"",abzug:""},   // v3.391: Stossart "schieber" wie bei der Mauerabdeckung; Abzug = nur fuer Eckschieber
  stueck:{laenge:DRB_STANDARD.stueckLaenge,ueberlappung:DRB_STANDARD.ueberlappung,gleich:false},
  streifen:{aktiv:true,umschlag:"",befestigung:DRB_STANDARD.befestigung,spiel:DRB_STANDARD.spiel,abwicklung:"",laenge:""}};
}
function drbAusData(d){
 const a=drbLeer();
 if(!d||typeof d!=="object")return a;
 a.detail=d.detail==="eigen"?"eigen":"1.5";
 a._geprueft=true;   // das gespeicherte Detail gilt - nicht aus dem Profil erraten
 a.kanten=Array.isArray(d.kanten)?d.kanten.map(k=>({laenge:k.laenge===undefined?"":k.laenge,
   ecke:["aussen","innen","winkel","ende"].includes(k.ecke)?k.ecke:"aussen",winkel:k.winkel===undefined?90:k.winkel,eckschieber:!!k.eckschieber,teile:drbTeile(k.teile)||"",wunsch:drbWunsch(k.wunsch)||""})):[];
 a.stoss=d.stoss==="schieber"?"schieber":"ueberlappung";
 if(d.schieber&&typeof d.schieber==="object")a.schieber={zugabe:d.schieber.zugabe===undefined?"":d.schieber.zugabe,abzug:d.schieber.abzug===undefined?"":d.schieber.abzug};
 a.geschlossen=!!d.geschlossen;
 if(d.stueck)a.stueck={laenge:d.stueck.laenge===undefined?DRB_STANDARD.stueckLaenge:d.stueck.laenge,
   ueberlappung:d.stueck.ueberlappung===undefined?DRB_STANDARD.ueberlappung:d.stueck.ueberlappung,gleich:!!d.stueck.gleich};
 if(d.streifen)a.streifen={...a.streifen,...d.streifen};
 return a;
}

// ---- Grundriss (rein) -------------------------------------------------------
// Drehung nach der Kante in Grad, + = nach rechts (im Uhrzeigersinn): Aussenecke +90, Inneneck -90.
function drbDrehung(k){
 if(!k)return 0;
 if(k.ecke==="aussen")return 90;
 if(k.ecke==="innen")return -90;
 if(k.ecke==="winkel")return drbZ(k.winkel);
 return 0;
}
// Ecke zählt nach der letzten Kante nur beim umlaufenden Grundriss.
function drbEckeGilt(kanten,i,geschlossen){return i<kanten.length-1||!!geschlossen}
function drbGrundriss(kanten,geschlossen){
 const pts=[{x:0,y:0}];let h=0,summe=0;
 const aussen=[],innen=[],andere=[];
 (kanten||[]).forEach((k,i)=>{
  const L=drbZ(k.laenge),r=h*Math.PI/180;
  const p=pts[pts.length-1];
  pts.push({x:p.x+Math.cos(r)*L,y:p.y+Math.sin(r)*L});
  summe+=L;
  if(drbEckeGilt(kanten,i,geschlossen)&&k.ecke!=="ende"){
   const t=drbDrehung(k);
   h+=t;
   if(k.ecke==="aussen")aussen.push(i);else if(k.ecke==="innen")innen.push(i);else if(t!==0)andere.push(i);
  }
 });
 const luecke=(geschlossen&&pts.length>1)?Math.hypot(pts[pts.length-1].x-pts[0].x,pts[pts.length-1].y-pts[0].y):0;
 const winkelSumme=(kanten||[]).reduce((s,k,i)=>s+(drbEckeGilt(kanten,i,geschlossen)&&k.ecke!=="ende"?drbDrehung(k):0),0);
 return {punkte:pts,gesamtlaenge:Math.round(summe*100)/100,aussenecken:aussen.length,inneneck:innen.length,andere:andere.length,
  luecke:Math.round(luecke),winkelSumme,schliesst:!geschlossen||(luecke<=5&&Math.abs(winkelSumme-360)<0.5)};
}

// ---- Stücke (rein) ------------------------------------------------------------
// P = Länge pro Stück, U = Überlappung. Gibt je Kante die Stücke mit ihrer Lage zurück.
// v3.393: Kante in n gleich lange Stuecke teilen (k.teile, leer = automatisch nach Stuecklaenge bzw. SIA)
function drbTeile(v){const n=Math.floor(Number(v));return Number.isFinite(n)&&n>=1&&n<=200?n:0}
// v3.396: ODER eine Wunschlaenge: die App waehlt die Anzahl gleicher Stuecke, deren Laenge der Wunschlaenge am naechsten kommt
// (Stuecklaenge = (L + (n-1)*U) / n; beim Schieber U = 0, dort zaehlt der Schieber-Abstand). Bei Gleichstand die kleinere Laenge (mehr Stuecke).
function drbWunsch(v){const w=Number(v);return Number.isFinite(w)&&w>0?w:0}
function drbAnzahlWunsch(L,W,U){
 if(!(L>0)||!(W>0)||W<=U)return 0;
 const e=n=>(L+(n-1)*U)/n;
 const n0=Math.max(1,Math.ceil((L-U)/(W-U)-1e-9));
 let best=n0;
 if(n0>1&&Math.abs(e(n0-1)-W)<Math.abs(e(n0)-W)-1e-9)best=n0-1;
 return Math.min(200,best);
}
// Wirksame Anzahl einer Kante: eingetragene Anzahl hat Vorrang, sonst aus der Wunschlaenge, sonst 0 (= automatisch)
function drbAnzahlKante(k,U){
 const n=drbTeile(k&&k.teile);
 if(n)return n;
 return drbAnzahlWunsch(drbZ(k&&k.laenge),drbWunsch(k&&k.wunsch),U||0);
}
function drbStueckeBerechnen(kanten,P,U,gleich){
 P=drbZ(P);U=drbZ(U);
 if(!(P>0))return {ok:false,fehler:"Länge pro Stück fehlt.",stuecke:[],materialLaenge:0,gesamtlaenge:0};
 if(U<0)return {ok:false,fehler:"Die Überlappung darf nicht negativ sein.",stuecke:[],materialLaenge:0,gesamtlaenge:0};
 if(U>=P)return {ok:false,fehler:"Die Überlappung ("+U+" mm) muss kleiner sein als die Länge pro Stück ("+P+" mm).",stuecke:[],materialLaenge:0,gesamtlaenge:0};
 const out=[];let gesamt=0,material=0;
 (kanten||[]).forEach((k,ki)=>{
  const L=drbZ(k.laenge);
  if(!(L>0))return;
  gesamt+=L;
  let laengen;
  const nT=drbAnzahlKante(k,U);
  if(nT){
   const M=L+(nT-1)*U,e=Math.round(M/nT);
   laengen=Array(nT).fill(e);
   laengen[nT-1]=Math.round(M)-e*(nT-1);
  }else if(L<=P)laengen=[Math.round(L)];
  else{
   const n=Math.ceil((L-U)/(P-U)-1e-9);
   const M=L+(n-1)*U;
   if(gleich){
    const e=Math.round(M/n);
    laengen=Array(n).fill(e);
    laengen[n-1]=Math.round(M)-e*(n-1);
   }else{
    laengen=Array(n-1).fill(Math.round(P));
    laengen.push(Math.round(M)-Math.round(P)*(n-1));
   }
  }
  let start=0;
  laengen.forEach((l,j)=>{
   out.push({kante:ki,nrInKante:j+1,laenge:l,von:start,bis:start+l});
   material+=l;
   start+=l-U;
  });
 });
 return {ok:true,fehler:"",stuecke:out.map((s,i)=>({...s,nr:i+1})),materialLaenge:Math.round(material),gesamtlaenge:Math.round(gesamt*100)/100,
  ueberlappung:U,stueckLaenge:P};
}
function drbGruppen(liste){
 const m=new Map();
 liste.forEach(s=>m.set(s.laenge,(m.get(s.laenge)||0)+1));
 return [...m.entries()].sort((a,b)=>b[0]-a[0]).map(([laenge,anzahl])=>({laenge,anzahl}));
}

// ---- Stossart "Schieber" (v3.391, rein) ----------------------------------------------------
// Wie bei der Mauerabdeckung (js/12b): Die Schieber (Dehnungselemente) setzt die SIA-271-Regel nach Werkstoff (Abstand zwischen zwei Schiebern,
// halber Abstand ab einer Ecke), jede Kante fuer sich. Statt der Ueberlappung stossen die Stuecke an den Schiebern; jedes Stueckende am Schieber
// bekommt die Schieber-Zugabe (Standard aus den Einstellungen der Mauerabdeckung, hier ueberschreibbar).
// ECKSCHIEBER: Ein Schieber sitzt genau in der Ecke (Gehrung). Die Ecke ist dann KEIN Fixpunkt mehr (voller Abstand zum naechsten Schieber), und
// beide Stuecke an der Ecke werden um den eigenen ABZUG des Eckschiebers kuerzer (statt Zugabe).
function drbSiaTabelle(material){
 if(typeof madMaterialTabelle==="function"){try{return madMaterialTabelle(material)}catch(e){/* Ersatzwerte */}}
 return {label:"Standard",maxAbstand:5000,abEcke:2500};
}
function drbEckTyp(kanten,j){
 const k=kanten[j];
 if(!k||k.ecke==="ende"||drbDrehung(k)===0)return "gerade";
 return k.eckschieber?"eckschieber":"ecke";
}
function drbSchieberWerte(d){
 const sch=d&&d.schieber||{};
 const std=(typeof madSchieberMass!=="undefined"&&Number.isFinite(Number(madSchieberMass)))?Number(madSchieberMass):0;
 return {zugabe:drbHat(sch.zugabe)?drbZ(sch.zugabe):std,zugabeStandard:!drbHat(sch.zugabe),abzug:drbHat(sch.abzug)?drbZ(sch.abzug):0};
}
function drbStueckeSchieber(d,material){
 const kanten=d.kanten||[],tab=drbSiaTabelle(material),w=drbSchieberWerte(d);
 const leer={ok:true,fehler:"",stuecke:[],materialLaenge:0,gesamtlaenge:0,modus:"schieber",ueberlappung:0,stueckLaenge:0,schieberAnzahl:0,eckschieber:[],tabelle:tab,zugabe:w.zugabe,abzug:w.abzug};
 if(w.zugabe<0||w.abzug<0)return {...leer,ok:false,fehler:"Schieber-Zugabe und Abzug dürfen nicht negativ sein."};
 const out=[];let gesamt=0,material_=0,schieber=0;
 const eck=new Set();
 const letzte=kanten.length-1;
 for(let i=0;i<kanten.length;i++){
  const L=drbZ(kanten[i].laenge);
  if(!(L>0))continue;
  gesamt+=L;
  const startTyp=i>0?drbEckTyp(kanten,i-1):(d.geschlossen&&letzte>0?drbEckTyp(kanten,letzte):"ende");
  const endTyp=drbEckeGilt(kanten,i,d.geschlossen)?drbEckTyp(kanten,i):"ende";
  if(startTyp==="eckschieber")eck.add(i>0?i-1:letzte);
  if(endTyp==="eckschieber")eck.add(i);
  const links=startTyp==="ecke"?tab.abEcke:tab.maxAbstand,rechts=endTyp==="ecke"?tab.abEcke:tab.maxAbstand;
  const nT=drbAnzahlKante(kanten[i],0);
  const rel=nT?Array.from({length:nT-1},(_,j)=>L*(j+1)/nT)
   :((typeof calcDilaPositionsInStretch==="function")?calcDilaPositionsInStretch(L,links,rechts,tab.maxAbstand):[]);
  const pt=[0,...rel,L];
  schieber+=rel.length;
  for(let j=0;j<pt.length-1;j++){
   const abstand=pt[j+1]-pt[j];
   const tl=j===0?startTyp:"schieber",tr=j===pt.length-2?endTyp:"schieber";
   const zug=t=>t==="schieber"?w.zugabe:(t==="eckschieber"?-w.abzug:0);
   const laenge=Math.round(abstand+zug(tl)+zug(tr));
   if(!(laenge>0))return {...leer,ok:false,fehler:"Kante "+(i+1)+": der Abzug des Eckschiebers ist zu gross – das Stück würde "+laenge+" mm lang."};
   out.push({kante:i,nrInKante:j+1,laenge,von:Math.round(pt[j]),bis:Math.round(pt[j+1]),links:tl,rechts:tr});
   material_+=laenge;
  }
 }
 return {...leer,stuecke:out.map((x,n)=>({...x,nr:n+1})),materialLaenge:Math.round(material_),gesamtlaenge:Math.round(gesamt*100)/100,
  schieberAnzahl:schieber,eckschieber:[...eck].sort((a,b)=>a-b)};
}
function drbStueckeFuer(d,material){
 if(d&&d.stoss==="schieber")return drbStueckeSchieber(d,material);
 return drbStueckeBerechnen(d.kanten,d.stueck.laenge,d.stueck.ueberlappung,d.stueck.gleich);
}
function drbMaterialAktuell(){return (typeof fpA!=="undefined"&&fpA)?fpA.material:null}

// ---- Einhängestreifen (rein) --------------------------------------------------
function drbUmschlaege(schenkel){
 const l=[];
 (schenkel||[]).forEach((s,i)=>{if(i>0&&typeof fpaIstUmschlag==="function"&&fpaIstUmschlag(s))l.push(i)});
 return l;
}
function drbStreifenBerechnen(st,schenkel,kanten,stueckLaenge){
 const um=drbUmschlaege(schenkel);
 if(!st||!st.aktiv)return {ok:false,aus:true,grund:"Kein Einhängestreifen gewünscht."};
 if(!um.length)return {ok:false,grund:"Das Profil hat keinen Umschlag (180°) – ohne Umschlag gibt es nichts, worin ein Einhängestreifen greift."};
 let u=drbHat(st.umschlag)&&um.includes(Number(st.umschlag))?Number(st.umschlag):um[0];
 const umLaenge=drbZ(schenkel[u].laenge);
 const befest=drbHat(st.befestigung)?drbZ(st.befestigung):DRB_STANDARD.befestigung;
 const spiel=drbHat(st.spiel)?drbZ(st.spiel):DRB_STANDARD.spiel;
 const haken=Math.max(8,umLaenge-spiel);
 const vorschlag=Math.round(befest+2*haken);
 const manuell=drbZ(st.abwicklung)>0;
 const abw=manuell?Math.round(drbZ(st.abwicklung)):vorschlag;
 const lenS=drbZ(st.laenge)>0?drbZ(st.laenge):drbZ(stueckLaenge);
 if(!(lenS>0))return {ok:false,grund:"Die Länge pro Stück fehlt."};
 const stuecke=[];
 (kanten||[]).forEach((k,ki)=>{
  const L=drbZ(k.laenge);if(!(L>0))return;
  const n=Math.ceil(L/lenS-1e-9);
  for(let j=0;j<n;j++)stuecke.push({kante:ki,laenge:Math.round(j<n-1?lenS:L-(n-1)*lenS)});
 });
 const gesamt=stuecke.reduce((s,x)=>s+x.laenge,0);
 return {ok:true,umschlag:u,umschlaege:um,umLaenge,befestigung:befest,spiel,haken,vorschlag,abwicklungManuell:manuell,abwicklung:abw,
  stueckLaenge:Math.round(lenS),stuecke,anzahl:stuecke.length,gesamtlaenge:gesamt,gruppen:drbGruppen(stuecke),
  flaecheM2:Math.round(gesamt*abw/1e6*1000)/1000,
  profil:[{laenge:befest,winkel:0},{laenge:haken,winkel:180}]};
}

// ---- Synchronisation mit dem Modell des Freien Profils -------------------------
function drbSync(){
 const d=fpA&&fpA.dachrand;
 if(!d)return null;
 const r=drbStueckeFuer(d,fpA.material);
 const alt=Array.isArray(fpA.segmente)?fpA.segmente:[];
 const massen=()=>fpA.schenkel.map(s=>({mass:drbZ(s.laenge),links:0,rechts:0}));
 const neu=(r.ok?r.stuecke:[]).map((st,i)=>{
  const seg={laenge:st.laenge,kante:st.kante,massen:massen()};
  const o=alt[i];
  if(o&&o.laenge===st.laenge&&Array.isArray(o.tafelTeilungManuell))seg.tafelTeilungManuell=o.tafelTeilungManuell;
  return seg;
 });
 fpA.segmente=neu;fpSegmente=neu;fpSchenkel=fpA.schenkel;
 return r;
}
function drbErgebnis(){
 const d=fpA.dachrand;
 const g=drbGrundriss(d.kanten,d.geschlossen);
 const s=drbStueckeFuer(d,fpA.material);
 const e=drbStreifenBerechnen(d.streifen,fpA.schenkel,d.kanten,d.stueck.laenge);
 return {grundriss:g,stuecke:s,streifen:e};
}

// ---- Aktivieren (aus der Auswahl der Art) ---------------------------------------
function drbAktivieren(){
 if(!fpA.dachrand)fpA.dachrand=drbLeer();
 fpA.variante="dachrand";
 // Ein frisches Dachrandblech beginnt mit Detail 1.5; ein vorhandenes Profil (z. B. aus einem Freien Profil) bleibt erhalten.
 if(!fpA.schenkel.length&&fpA.dachrand.detail==="1.5")drbDetailLaden();
 else if(fpA.schenkel.length&&!fpA.dachrand._geprueft){
  fpA.dachrand._geprueft=true;
  if(!drbIstDetail15(fpA.schenkel))fpA.dachrand.detail="eigen";
 }
 if(fpaSchritt>DRB_REGISTER.length)fpaSchritt=1;
 drbSync();
}
function drbDeaktivieren(){
 if(fpA)fpA.variante="";
}
function drbIstDetail15(schenkel){
 return Array.isArray(schenkel)&&schenkel.length===DRB_DETAIL_15.length
  &&schenkel.every((s,i)=>drbZ(s.laenge)===DRB_DETAIL_15[i].laenge&&drbZ(s.winkel)===DRB_DETAIL_15[i].winkel);
}
function drbDetailLaden(){
 fpA.schenkel=DRB_DETAIL_15.map(s=>({...s}));
 fpSchenkel=fpA.schenkel;
 fpA.ansicht="links";
 fpA.dachrand.detail="1.5";
 drbSync();
}

// ---- Zeichnungen -------------------------------------------------------------------
function drbEsc(s){return (typeof esc==="function")?esc(s):String(s)}
function drbGrundrissSvg(kanten,geschlossen,optionen){
 const g=drbGrundriss(kanten,geschlossen);
 const B=560,H=360,R=70;
 if(!kanten||!kanten.length||g.gesamtlaenge<=0)return "";
 const xs=g.punkte.map(p=>p.x),ys=g.punkte.map(p=>p.y);
 const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
 const w=Math.max(maxx-minx,1),h=Math.max(maxy-miny,1);
 const sk=Math.min((B-2*R)/w,(H-2*R)/h);
 const ox=(B-w*sk)/2-minx*sk,oy=(H-h*sk)/2-miny*sk;
 const P=g.punkte.map(p=>({x:p.x*sk+ox,y:p.y*sk+oy}));
 let svg=`<svg viewBox="0 0 ${B} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${B}px;height:auto" role="img" aria-label="Grundriss">`;
 svg+=`<rect x="0" y="0" width="${B}" height="${H}" fill="#fafbfc"/>`;
 // Kanten
 const d=P.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ")+(geschlossen&&P.length>2&&g.luecke<=5?" Z":"");
 svg+=`<path d="${d}" fill="none" stroke="#17202a" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
 // Stoesse (Mitte der Ueberlappung) als kleine Querstriche
 const schieberModus=!!(optionen&&optionen.modus==="schieber"&&Array.isArray(optionen.stuecke));
 const sb=schieberModus?{ok:true,stuecke:optionen.stuecke,ueberlappung:0}
  :drbStueckeBerechnen(kanten,optionen&&optionen.stueckLaenge,optionen&&optionen.ueberlappung,optionen&&optionen.gleich);
 if(sb.ok&&optionen&&optionen.stoesse!==false){
  let heading=0;const heads=[];
  kanten.forEach((k,i)=>{heads.push(heading);if(drbEckeGilt(kanten,i,geschlossen)&&k.ecke!=="ende")heading+=drbDrehung(k)});
  sb.stuecke.forEach(s=>{
   if(s.nrInKante<=1)return;
   const k=kanten[s.kante],L=drbZ(k.laenge);if(!(L>0))return;
   const t=(s.von+(schieberModus?0:sb.ueberlappung/2))/L;
   const a=P[s.kante],b=P[s.kante+1];if(!a||!b)return;
   const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   const r=heads[s.kante]*Math.PI/180,nx=-Math.sin(r)*9,ny=Math.cos(r)*9;
   svg+=`<line x1="${(x-nx).toFixed(1)}" y1="${(y-ny).toFixed(1)}" x2="${(x+nx).toFixed(1)}" y2="${(y+ny).toFixed(1)}" stroke="#d9480f" stroke-width="3"/>`;
  });
 }
 // Masse und Nummern
 let heading=0;
 kanten.forEach((k,i)=>{
  const a=P[i],b=P[i+1];if(!a||!b)return;
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  const r=heading*Math.PI/180;
  const lx=mx+Math.sin(r)*-28,ly=my+Math.cos(r)*28;   // links der Laufrichtung = aussen
  svg+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" font-size="14" font-weight="700" fill="#1565a8" text-anchor="middle" font-family="Arial,sans-serif">${drbEsc(drbMm(k.laenge))}</text>`;
  svg+=`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="11" fill="#e8741a"/><text x="${mx.toFixed(1)}" y="${(my+4).toFixed(1)}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">${i+1}</text>`;
  if(drbEckeGilt(kanten,i,geschlossen)&&k.ecke!=="ende")heading+=drbDrehung(k);
 });
 // Eckschieber (v3.391): blaue Raute in der Ecke
 if(schieberModus&&Array.isArray(optionen.eckschieber))optionen.eckschieber.forEach(j=>{
  const q=P[j+1];if(!q)return;
  svg+=`<path d="M${(q.x-9).toFixed(1)} ${q.y.toFixed(1)} L${q.x.toFixed(1)} ${(q.y-9).toFixed(1)} L${(q.x+9).toFixed(1)} ${q.y.toFixed(1)} L${q.x.toFixed(1)} ${(q.y+9).toFixed(1)} Z" fill="#1565a8" stroke="#fff" stroke-width="1.5"/>`;
 });
 svg+=`<circle cx="${P[0].x.toFixed(1)}" cy="${P[0].y.toFixed(1)}" r="6" fill="#2b8a3e"/>`;
 svg+=`<text x="${(P[0].x+10).toFixed(1)}" y="${(P[0].y-8).toFixed(1)}" font-size="11" fill="#2b8a3e" font-family="Arial,sans-serif">Start</text>`;
 svg+="</svg>";
 return svg;
}
function drbProfilSvg(schenkel){
 if(typeof generateProfilDiagramSvg!=="function")return "";
 try{return generateProfilDiagramSvg(schenkel)}catch(e){return ""}
}

// ---- Prüfungen und Ausmass --------------------------------------------------------------
function drbPruefungen(){
 const d=fpA.dachrand,m=[];
 if(!d)return m;
 if(!d.kanten.length)m.push({art:"warnung",text:"Noch keine Kante im Grundriss – ohne Grundriss gibt es keine Stücke und kein Ausmass."});
 d.kanten.forEach((k,i)=>{
  if(!drbHat(k.laenge)||drbZ(k.laenge)<=0)m.push({art:"fehler",text:"Kante "+(i+1)+": die Länge fehlt."});
  if(k.ecke==="winkel"&&drbEckeGilt(d.kanten,i,d.geschlossen)&&!drbHat(k.winkel))m.push({art:"fehler",text:"Kante "+(i+1)+": der Eckwinkel fehlt."});
 });
 const g=drbGrundriss(d.kanten,d.geschlossen);
 if(d.geschlossen&&d.kanten.length&&!g.schliesst){
  if(Math.abs(g.winkelSumme-360)>=0.5)m.push({art:"warnung",text:"Umlaufender Grundriss: die Ecken ergeben "+Math.round(g.winkelSumme)+"° statt 360°. Bitte Eckarten prüfen."});
  else m.push({art:"warnung",text:"Der Grundriss schliesst nicht: Abstand zwischen Ende und Start "+g.luecke+" mm. Bitte Kantenlängen prüfen."});
 }
 const s=drbStueckeFuer(d,fpA.material);
 if(!s.ok)m.push({art:"fehler",text:s.fehler});
 else if(d.kanten.length&&!s.stuecke.length)m.push({art:"warnung",text:"Keine Stücke: alle Kantenlängen sind leer."});
 if(s.ok){
  const tab=drbSiaTabelle(fpA.material),P=drbZ(d.stueck.laenge);
  d.kanten.forEach((k,i)=>{
   const L=drbZ(k.laenge),n=drbAnzahlKante(k,d.stoss==="schieber"?0:drbZ(d.stueck.ueberlappung));
   if(!n||!(L>0))return;
   if(d.stoss==="schieber"){if(L/n>tab.maxAbstand+1e-6)m.push({art:"warnung",text:"Kante "+(i+1)+": bei "+n+" gleichen Stücken ist der Schieber-Abstand "+Math.round(L/n)+" mm – mehr als die "+drbMm(tab.maxAbstand)+" mm nach SIA 271."})}
   else if(P>0&&Math.round(L/n)>P)m.push({art:"warnung",text:"Kante "+(i+1)+": bei "+n+" gleichen Stücken ist ein Stück "+Math.round(L/n)+" mm lang – länger als die Länge pro Stück ("+drbMm(P)+" mm)."});
  });
 }
 if(s.ok&&d.stoss==="schieber"){
  const w=drbSchieberWerte(d);
  if(!fpA.material)m.push({art:"warnung",text:"Schieber: Kein Werkstoff gewählt – die Schieber-Abstände sind mit «"+s.tabelle.label+"» gerechnet (Register „Grunddaten“)."});
  if(s.eckschieber.length&&!(w.abzug>0))m.push({art:"warnung",text:"Eckschieber gewählt, aber der Abzug ist 0 mm – die Stücke an den Ecken werden nicht gekürzt."});
  if(!(w.zugabe>0)&&s.schieberAnzahl>0)m.push({art:"warnung",text:"Die Schieber-Zugabe ist 0 mm – die Stücke am Schieber bekommen keine Zugabe."});
 }
 if(d.streifen&&d.streifen.aktiv){
  const e=drbStreifenBerechnen(d.streifen,fpA.schenkel,d.kanten,d.stueck.laenge);
  if(!e.ok&&!e.aus)m.push({art:"warnung",text:"Einhängestreifen: "+e.grund});
 }
 return m;
}
function drbAusmassZeilen(){
 const z=[];let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:false});
 const d=fpA.dachrand;
 if(!d)return z;
 const r=drbErgebnis(),g=r.grundriss,s=r.stuecke,e=r.streifen;
 if(!fpA.schenkel.length||!s.ok||!s.stuecke.length)return z;
 const mt=(typeof $==="function"&&$("measTitle")&&String($("measTitle").value||"").trim())||"";
 zeile("Dachrandblech, "+(mt||(d.detail==="1.5"?"Detail 1.5":"Profil mit "+fpA.schenkel.length+" Schenkeln")),fpaMeter(g.gesamtlaenge),"m","Summe der Kanten im Grundriss");
 zeile("Kanten",d.kanten.filter(k=>drbZ(k.laenge)>0).length,"Stk.","Grundriss");
 if(g.aussenecken)zeile("Aussenecken",g.aussenecken,"Stk.","Ecken im Grundriss");
 if(g.inneneck)zeile("Innenecken",g.inneneck,"Stk.","Ecken im Grundriss");
 if(g.andere)zeile("Ecken mit anderem Winkel",g.andere,"Stk.","Ecken im Grundriss");
 if(d.stoss==="schieber"){
  const w=drbSchieberWerte(d);
  zeile("Stücke",s.stuecke.length,"Stk.","Schieber nach SIA 271 ("+s.tabelle.label+"), Zugabe "+drbMm(w.zugabe)+" mm");
  zeile("Schieber",s.schieberAnzahl,"Stk.","SIA 271: höchstens "+drbMm(s.tabelle.maxAbstand)+" mm, ab Ecke "+drbMm(s.tabelle.abEcke)+" mm");
  if(s.eckschieber.length)zeile("Eckschieber (Gehrung)",s.eckschieber.length,"Stk.","Abzug "+drbMm(w.abzug)+" mm je Stückende");
 }else zeile("Stücke",s.stuecke.length,"Stk.","Länge pro Stück "+drbMm(d.stueck.laenge)+" mm, Überlappung "+drbMm(d.stueck.ueberlappung)+" mm");
 drbGruppen(s.stuecke).forEach(x=>zeile("Stück "+drbMm(x.laenge)+" mm",x.anzahl,"Stk.","Stückliste"));
 zeile(d.stoss==="schieber"?"Materiallänge inkl. Zugaben/Abzüge":"Materiallänge inkl. Überlappung",fpaMeter(s.materialLaenge),"m",d.stoss==="schieber"?"Gesamtlänge + Schieber-Zugaben − Eckschieber-Abzüge":"Gesamtlänge + Überlappungen");
 const ab=fpA.segmente[0]?fpaAbwicklungSegment(fpA.segmente[0]).links:0;
 if(ab>0)zeile("Abwicklung",fpaMm(ab),"mm","Summe der Schenkel");
 const f=fpaFlaecheM2();
 if(f>0)zeile("Blechfläche",f.toFixed(2).replace(".",","),"m²","Stückelänge × Abwicklung");
 const b=fpaBiegungen();if(b)zeile("Biegungen je Stück",b,"Stk.","Schenkel mit einem Winkel ≠ 0°");
 const u=fpaUmschlaege();if(u)zeile("davon Umschläge (180°)",u,"Stk.","Schenkel mit Winkel 180°");
 if(e&&e.ok){
  zeile("Einhängestreifen, Gesamtlänge",fpaMeter(e.gesamtlaenge),"m","Summe der Kanten");
  zeile("Einhängestreifen, Stücke",e.anzahl,"Stk.","Länge pro Stück "+drbMm(e.stueckLaenge)+" mm");
  e.gruppen.forEach(x=>zeile("Einhängestreifen "+drbMm(x.laenge)+" mm",x.anzahl,"Stk.","Stückliste Streifen"));
  zeile("Einhängestreifen, Abwicklung",drbMm(e.abwicklung),"mm",e.abwicklungManuell?"von Hand eingegeben":"Befestigung + 2 × Haken");
  if(e.flaecheM2>0)zeile("Einhängestreifen, Fläche",e.flaecheM2.toFixed(2).replace(".",","),"m²","Gesamtlänge × Abwicklung");
 }
 return z;
}
// Speicherstand: Eingaben UND die gerechneten Ergebnisse, damit ein später gedrucktes Blatt gleich bleibt.
function drbDaten(){
 const d=fpA.dachrand,r=drbErgebnis();
 return {
  detail:d.detail,kanten:d.kanten.map(k=>({laenge:k.laenge,ecke:k.ecke,winkel:k.winkel,eckschieber:!!k.eckschieber,teile:drbTeile(k.teile)||"",wunsch:drbWunsch(k.wunsch)||""})),geschlossen:!!d.geschlossen,
  stoss:d.stoss==="schieber"?"schieber":"ueberlappung",schieber:{zugabe:d.schieber?d.schieber.zugabe:"",abzug:d.schieber?d.schieber.abzug:""},
  stueck:{...d.stueck},
  streifen:{aktiv:!!d.streifen.aktiv,umschlag:d.streifen.umschlag,befestigung:d.streifen.befestigung,spiel:d.streifen.spiel,
            abwicklung:d.streifen.abwicklung,laenge:d.streifen.laenge},
  ergebnis:{
   gesamtlaenge:r.grundriss.gesamtlaenge,aussenecken:r.grundriss.aussenecken,inneneck:r.grundriss.inneneck,andere:r.grundriss.andere,
   schliesst:r.grundriss.schliesst,
   stuecke:r.stuecke.ok?r.stuecke.stuecke.map(s=>({kante:s.kante,nr:s.nr,laenge:s.laenge,nrInKante:s.nrInKante,von:s.von})):[],
   schieber:(r.stuecke.ok&&d.stoss==="schieber")?{anzahl:r.stuecke.schieberAnzahl,zugabe:r.stuecke.zugabe,abzug:r.stuecke.abzug,
     material:r.stuecke.tabelle.label,maxAbstand:r.stuecke.tabelle.maxAbstand,abEcke:r.stuecke.tabelle.abEcke}:null,
   eckschieber:(r.stuecke.ok&&d.stoss==="schieber")?r.stuecke.eckschieber:[],
   materialLaenge:r.stuecke.ok?r.stuecke.materialLaenge:0,
   streifen:r.streifen.ok?{abwicklung:r.streifen.abwicklung,haken:r.streifen.haken,befestigung:r.streifen.befestigung,
     umschlag:r.streifen.umschlag+1,stueckLaenge:r.streifen.stueckLaenge,anzahl:r.streifen.anzahl,gesamtlaenge:r.streifen.gesamtlaenge,
     gruppen:r.streifen.gruppen,flaecheM2:r.streifen.flaecheM2}:null
  }
 };
}

// ---- Oberfläche ---------------------------------------------------------------------------
function drbSkizzeSichtbar(){
 return fpaSchritt===2&&!!fpA.dachrand&&fpA.dachrand.detail==="eigen";
}
function drbSchrittInhalt(){
 drbSync();
 const n=fpaSchritt;
 if(n===1)return fpaKarte("1 · Grunddaten",drbGrunddatenHtml());
 if(n===2)return fpaKarte("2 · Detail wählen",drbDetailHtml());
 if(n===3)return fpaKarte("3 · Profil",fpaProfilHtml().replace("Register „Skizze → Profil“","Register „Detail“"));
 if(n===4)return fpaKarte("4 · Grundriss",drbGrundrissHtml());
 if(n===5)return fpaKarte("5 · Stücke",drbStueckeHtml());
 if(n===6)return fpaKarte("6 · Einhängestreifen",drbStreifenHtml());
 if(n===7)return fpaKarte(zuTitel(7,ebaFormLeer(fpA.material).form),fpaZuschnittHtml());
 if(n===8)return fpaKarte("8 · Ausmass und Material",fpaAusmassHtml());
 return fpaKarte("9 · Kontrolle",fpaKontrolleHtml());
}
function drbGrunddatenHtml(){
 const a=fpA;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${drbEsc(m.name)}</option>`).join("");
 const ansOpt=[["keiner","kein Pfeil"],["links","von links"],["oben","von oben"],["rechts","von rechts"],["unten","von unten"]].map(([w,t])=>
  `<option value="${w}"${a.ansicht===w?" selected":""}>${drbEsc(t)}</option>`).join("");
 return `<div class="grid">
${fpaFeld("Werkstoff",`<select id="fpa_material">${matOpt}</select>`+zwMaterialChip("fpa_material","dachrandblech",a.material))}
${fpaFeld("Ansichtspfeil",`<select id="fpa_ansicht">${ansOpt}</select>`)}
</div>
<div class="info">Ablauf: <b>Detail</b> wählen (Detail 1.5 oder ein eigenes Profil), im <b>Grundriss</b> die Kanten mit den Ecken erfassen,
dann <b>Länge pro Stück</b> und <b>Überlappung</b> festlegen. Die App rechnet daraus die Stücke und schlägt einen passenden
<b>Einhängestreifen</b> vor. Zuschnitt und Ausmass folgen wie bei jedem Profil.</div>`;
}
function drbDetailHtml(){
 const d=fpA.dachrand;
 const ist15=drbIstDetail15(fpA.schenkel);
 return `<div class="info">Detail 1.5 ist als Vorlage hinterlegt – <b>alle Masse bleiben anpassbar</b> (Register „Profil“). Für ein anderes Detail
erstellst du das Profil selbst, Schenkel für Schenkel oder aus einer Skizze – wie beim Freien Profil.</div>
<div class="bar" style="gap:8px;flex-wrap:wrap">
<button type="button" class="${d.detail==="1.5"?"blue":"gray"}" data-drb-detail="1.5" style="flex:1 1 200px;min-height:48px">Detail 1.5${d.detail==="1.5"&&!ist15?" (angepasst)":""}</button>
<button type="button" class="${d.detail==="eigen"?"blue":"gray"}" data-drb-detail="eigen" style="flex:1 1 200px;min-height:48px">Anderes Detail (Profil erstellen)</button>
</div>
<div class="ra-zeichnung" style="margin-top:10px"><div class="ra-zeichnung-kopf"><span>${d.detail==="1.5"?"Detail 1.5":"Aktuelles Profil"}</span><span>${fpA.schenkel.length} Schenkel</span></div>
<div id="drb_detailBild">${drbProfilSvg(d.detail==="1.5"&&!fpA.schenkel.length?DRB_DETAIL_15:fpA.schenkel)}</div></div>
${d.detail==="eigen"?`<div class="small" style="margin-top:6px">Unten kannst du eine Skizze oder ein Foto erkennen lassen; sonst im nächsten Register Schenkel von Hand erfassen.</div>`:""}`;
}
function drbEckeText(k,i,kanten,geschlossen){
 if(!drbEckeGilt(kanten,i,geschlossen))return "Ende";
 return {aussen:"Aussenecke 90°",innen:"Inneneck 90°",winkel:"Anderer Winkel",ende:"Ende"}[k.ecke]||"Aussenecke 90°";
}
function drbKantenHtml(){
 const d=fpA.dachrand;
 return d.kanten.map((k,i)=>{
  const gilt=drbEckeGilt(d.kanten,i,d.geschlossen);
  const opt=[["aussen","Aussenecke 90°"],["innen","Inneneck 90°"],["winkel","Anderer Winkel"],["ende","Ende (keine Ecke)"]]
   .map(([w,t])=>`<option value="${w}"${k.ecke===w?" selected":""}>${drbEsc(t)}</option>`).join("");
  return `<div class="ra-zeile" data-drb-zeile="${i}">
<div class="ra-zeile-kopf"><b>Kante ${i+1}</b><span class="small">${drbEsc(drbMm(k.laenge))} mm · ${drbEsc(drbEckeText(k,i,d.kanten,d.geschlossen))}</span>
<button type="button" class="red ra-weg" data-drb-kante-weg="${i}" title="Kante löschen">✕</button></div>
<div class="grid">
${fpaFeld("Länge (mm)",`<input data-drb-laenge="${i}" type="number" data-pflicht="1" inputmode="numeric" step="1" value="${drbHat(k.laenge)?drbEsc(k.laenge):""}">`)}
${gilt?fpaFeld("Ecke danach",`<select data-drb-ecke="${i}">${opt}</select>`):fpaFeld("Ecke danach",`<div class="small">Ende des Dachrands</div>`)}
${gilt&&k.ecke==="winkel"?fpaFeld("Drehung (°, + = nach rechts)",`<input data-drb-winkel="${i}" type="number" inputmode="numeric" step="1" value="${drbHat(k.winkel)?drbEsc(k.winkel):""}">`):""}
</div>
<div class="bar">${i>0?`<button type="button" class="gray" data-drb-hoch="${i}">↑</button>`:""}${i<d.kanten.length-1?`<button type="button" class="gray" data-drb-runter="${i}">↓</button>`:""}</div></div>`;
 }).join("");
}
function drbGrundrissSummeHtml(){
 const d=fpA.dachrand,g=drbGrundriss(d.kanten,d.geschlossen);
 const teile=[`Gesamtlänge <b>${drbM(g.gesamtlaenge)} m</b>`,`${d.kanten.length} Kante${d.kanten.length===1?"":"n"}`];
 if(g.aussenecken)teile.push(g.aussenecken+" Aussenecke"+(g.aussenecken===1?"":"n"));
 if(g.inneneck)teile.push(g.inneneck+" Inneneck"+(g.inneneck===1?"":"en"));
 if(g.andere)teile.push(g.andere+" Ecke"+(g.andere===1?"":"n")+" mit anderem Winkel");
 let h=`<div class="small">${teile.join(" · ")}</div>`;
 if(d.geschlossen&&d.kanten.length&&!g.schliesst)
  h+=`<div class="ra-warnung" style="margin-top:6px">${Math.abs(g.winkelSumme-360)>=0.5?"Die Ecken ergeben "+Math.round(g.winkelSumme)+"° statt 360° – Eckarten prüfen.":"Der Grundriss schliesst nicht: Abstand zwischen Ende und Start "+g.luecke+" mm – Kantenlängen prüfen."}</div>`;
 return h;
}
function drbGrundrissHtml(){
 const d=fpA.dachrand;
 return `<div class="info">Die Kanten in Laufrichtung erfassen (im Uhrzeigersinn, Start unten links). Je Kante die Länge entlang des Dachrands und die Ecke danach:
Aussenecke = nach rechts, Inneneck = nach links. Die Zeichnung zeigt die Stösse (orange) aus Stücklänge und Überlappung.</div>
<div id="drb_grundriss" class="ra-zeichnung ra-klebt"><div class="ra-zeichnung-kopf"><span>Grundriss – folgt jeder Eingabe</span><span id="drb_kopfzahl">${d.kanten.length} Kanten</span></div>
<div id="drb_grundrissBild">${drbGrundrissSvg(d.kanten,d.geschlossen,drbSvgOptionen())||'<div class="small" style="padding:10px">Noch keine Kante.</div>'}</div></div>
<label class="rechte-schalter" style="margin:8px 0"><input type="checkbox" id="drb_geschlossen"${d.geschlossen?" checked":""}> Umlaufend (der Grundriss schliesst wieder am Start)</label>
<div id="drb_grundrissSumme">${drbGrundrissSummeHtml()}</div>
${drbKantenHtml()||'<div class="empty">Noch keine Kante. „＋ Kante hinzufügen“.</div>'}
<div class="bar"><button type="button" class="blue" id="drb_kantePlus" style="flex:1 1 180px;min-height:48px">＋ Kante hinzufügen</button>
<span class="small">${d.kanten.length} von höchstens ${DRB_MAX_KANTEN} Kanten</span></div>`;
}
function drbSvgOptionen(){
 const d=fpA.dachrand;
 const o={stueckLaenge:d.stueck.laenge,ueberlappung:d.stueck.ueberlappung,gleich:d.stueck.gleich};
 if(d.stoss==="schieber"){
  const r=drbStueckeFuer(d,fpA.material);
  if(r.ok){o.modus="schieber";o.stuecke=r.stuecke;o.eckschieber=r.eckschieber}
 }
 return o;
}
// Aus GESPEICHERTEN Daten (Druck, Ruestskizzen): bei Schieber die gespeicherten Stuecke, sonst wie bisher aus Stuecklaenge und Ueberlappung.
function drbSvgOptionenAusDaten(dr){
 const o={stueckLaenge:dr&&dr.stueck&&dr.stueck.laenge,ueberlappung:dr&&dr.stueck&&dr.stueck.ueberlappung,gleich:dr&&dr.stueck&&dr.stueck.gleich};
 const er=dr&&dr.ergebnis;
 if(dr&&dr.stoss==="schieber"&&er&&Array.isArray(er.stuecke)&&er.stuecke.every(x=>x&&x.von!==undefined)){
  o.modus="schieber";o.stuecke=er.stuecke;o.eckschieber=Array.isArray(er.eckschieber)?er.eckschieber:[];
 }
 return o;
}
function drbStueckeTabelleHtml(){
 const d=fpA.dachrand,s=drbStueckeFuer(d,fpA.material);
 if(!s.ok)return `<div class="ra-fehler">${drbEsc(s.fehler)}</div>`;
 if(!s.stuecke.length)return `<div class="empty">Keine Stücke – zuerst im Grundriss die Kanten erfassen.</div>`;
 const grp=drbGruppen(s.stuecke);
 const sch=d.stoss==="schieber";
 return `<div class="small"><b>${s.stuecke.length} Stücke</b> · Dachrand ${drbM(s.gesamtlaenge)} m · Material ${sch?"inkl. Zugaben/Abzüge":"inkl. Überlappung"} ${drbM(s.materialLaenge)} m${sch?` · ${s.schieberAnzahl} Schieber`+(s.eckschieber.length?` · ${s.eckschieber.length} Eckschieber`:""):""}</div>
<div class="small">${grp.map(x=>x.anzahl+" × "+drbMm(x.laenge)+" mm").join(" · ")}</div>
<div class="scroll" style="margin-top:6px"><table class="eb-table fpa-tab"><thead><tr><th>Kante</th><th>Kantenlänge</th><th>Stücke (mm)</th></tr></thead><tbody>${
  d.kanten.map((k,i)=>{
   const st=s.stuecke.filter(x=>x.kante===i);
   if(!st.length)return "";
   return `<tr><td>${i+1}</td><td>${drbEsc(drbMm(k.laenge))}</td><td>${st.map(x=>drbEsc(drbMm(x.laenge))).join(" + ")}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function drbEckschieberListeHtml(){
 const d=fpA.dachrand,eck=[];
 d.kanten.forEach((k,i)=>{
  if(!drbEckeGilt(d.kanten,i,d.geschlossen)||k.ecke==="ende"||drbDrehung(k)===0)return;
  const nach=(i<d.kanten.length-1)?(i+2):1;
  eck.push(`<label class="rechte-schalter"><input type="checkbox" data-drb-eck="${i}"${k.eckschieber?" checked":""}> Ecke Kante ${i+1} → ${nach} (${drbEsc(drbEckeText(k,i,d.kanten,d.geschlossen))})</label>`);
 });
 return eck.length?eck.join(""):'<div class="small">Keine Ecke im Grundriss – ein Eckschieber braucht eine Ecke.</div>';
}
function drbEinteilungHinweis(i){
 const d=fpA.dachrand,k=d.kanten[i];
 if(!k)return "";
 const L=drbZ(k.laenge);
 if(!(L>0))return "";
 const sch=d.stoss==="schieber",U=sch?0:drbZ(d.stueck.ueberlappung);
 const n=drbAnzahlKante(k,U);
 if(!n)return drbWunsch(k.wunsch)>0&&!(drbWunsch(k.wunsch)>U)?"Die Wunschlänge muss grösser als die Überlappung sein.":"automatisch";
 const e=Math.round((L+(n-1)*U)/n);
 const wie=drbTeile(k.teile)?"":" (aus der Wunschlänge)";
 return "→ "+n+" gleiche Stücke"+wie+", "+(sch?"Abstand ":"je ")+drbMm(e)+" mm";
}
function drbEinteilungHtml(){
 const d=fpA.dachrand;
 if(!d.kanten.length)return "";
 const zeilen=d.kanten.map((k,i)=>`<div class="ra-zeile"><div class="ra-zeile-kopf"><b>Kante ${i+1}</b><span class="small">${drbEsc(drbMm(k.laenge))} mm</span></div>
<div class="grid">
${fpaFeld("Anzahl Stücke",`<input data-drb-teile="${i}" type="number" inputmode="numeric" step="1" min="1" placeholder="auto" value="${drbTeile(k.teile)||""}">`)}
${fpaFeld("oder Wunschlänge (mm)",`<input data-drb-wunsch="${i}" type="number" inputmode="numeric" step="1" min="1" placeholder="auto" value="${drbWunsch(k.wunsch)||""}">`)}
</div><div class="small" data-drb-hinweis="${i}">${drbEsc(drbEinteilungHinweis(i))}</div></div>`).join("");
 return `<div class="ra-zeile" style="margin-top:8px"><div class="ra-zeile-kopf"><b>Einteilung in gleich lange Stücke</b></div>
<div class="small">Je Kante entweder die <b>Anzahl</b> der Stücke oder eine <b>Wunschlänge</b> eintragen – bei einer Wunschlänge nimmt die App die Anzahl, die ihr am nächsten kommt, und teilt die Kante in gleich lange Stücke. Die Anzahl hat Vorrang. Leer = automatisch.</div>
<div class="grid">${fpaFeld("Wunschlänge für alle Kanten (mm)",`<input id="drb_wunschAlle" type="number" inputmode="numeric" step="1" min="1" placeholder="z. B. 2500">`)}
<div class="fpa-feld"><label>&nbsp;</label><button type="button" class="gray" id="drb_wunschAlleBtn">Für alle Kanten übernehmen</button></div></div>
${zeilen}</div>`;
}
function drbStueckeHtml(){
 const d=fpA.dachrand,sch=d.stoss==="schieber";
 const w=drbSchieberWerte(d),tab=drbSiaTabelle(fpA.material);
 const wahl=`<div class="grid">${fpaFeld("Stossart",`<select data-drb-stoss>
<option value="ueberlappung"${sch?"":" selected"}>Überlappung</option>
<option value="schieber"${sch?" selected":""}>Schieber (wie Mauerabdeckung)</option></select>`)}</div>`;
 if(!sch)return `${wahl}<div class="info">Länge pro Stück = so lang ist ein Stück Blech (Kantlänge der Abkantbank bzw. Tafel). Die <b>Überlappung</b> liegt an jedem Stoss
zwischen zwei Stücken; sie kommt zur Materiallänge dazu. Jede Kante wird für sich eingeteilt.</div>
<div class="grid">
${fpaFeld("Länge pro Stück (mm)",`<input data-drb-p type="number" data-pflicht="1" inputmode="numeric" step="1" value="${drbHat(d.stueck.laenge)?drbEsc(d.stueck.laenge):""}">`)}
${fpaFeld("Überlappung (mm)",`<input data-drb-u type="number" data-pflicht="1" inputmode="numeric" step="1" value="${drbHat(d.stueck.ueberlappung)?drbEsc(d.stueck.ueberlappung):""}">`)}
</div>
<label class="rechte-schalter" style="margin:8px 0"><input type="checkbox" id="drb_gleich"${d.stueck.gleich?" checked":""}> Alle Stücke einer Kante gleich lang (statt volle Stücke und ein kürzerer Rest)</label>
${drbEinteilungHtml()}
<div id="drb_stueckeTabelle">${drbStueckeTabelleHtml()}</div>
<div class="small" style="margin-top:6px">Die Grundriss-Zeichnung unten zeigt die Stösse.</div>
<div class="eb-diagram-box" id="drb_stueckeBild">${drbGrundrissSvg(d.kanten,d.geschlossen,drbSvgOptionen())}</div>`;
 return `${wahl}<div class="info">Die <b>Schieber</b> (Dehnungselemente) setzt die App nach <b>SIA 271</b> für den Werkstoff «${drbEsc(tab.label)}»: höchstens
${drbMm(tab.maxAbstand)} mm zwischen zwei Schiebern, ab einer Ecke ${drbMm(tab.abEcke)} mm – jede Kante für sich, wie bei der Mauerabdeckung. Statt der Überlappung stossen die Stücke am Schieber;
jedes Stückende am Schieber bekommt die <b>Schieber-Zugabe</b>.${fpA.material?"":" <b>Kein Werkstoff gewählt</b> – bitte im Register „Grunddaten“ wählen."}</div>
<div class="grid">
${fpaFeld("Schieber-Zugabe je Stückende (mm)"+(w.zugabeStandard?" – Standard":""),`<input data-drb-sz type="number" inputmode="numeric" step="1" placeholder="${drbEsc(w.zugabe)}" value="${drbHat(d.schieber&&d.schieber.zugabe)?drbEsc(d.schieber.zugabe):""}">`)}
${fpaFeld("Abzug Eckschieber je Stückende (mm)",`<input data-drb-sa type="number" inputmode="numeric" step="1" placeholder="0" value="${drbHat(d.schieber&&d.schieber.abzug)?drbEsc(d.schieber.abzug):""}">`)}
</div>
<div class="small">Leer = Standard aus den Einstellungen der Mauerabdeckung (Zugabe) bzw. 0 mm (Abzug).</div>
<div class="ra-zeile" style="margin-top:8px"><div class="ra-zeile-kopf"><b>Eckschieber (Gehrung)</b></div>
<div class="small">Der Schieber sitzt genau in der Ecke, beide Stücke gehen auf Gehrung. Die Ecke gilt dann nicht mehr als Fixpunkt (voller Abstand zum nächsten Schieber), und beide Stücke werden um den <b>Abzug Eckschieber</b> kürzer.</div>
<div id="drb_eckListe">${drbEckschieberListeHtml()}</div></div>
<div class="small" style="margin-top:8px">Länge pro Stück für den Einhängestreifen: <b>${drbMm(d.stueck.laenge)} mm</b> (Register „Einhängestreifen“).</div>
${drbEinteilungHtml()}
<div id="drb_stueckeTabelle">${drbStueckeTabelleHtml()}</div>
<div class="small" style="margin-top:6px">Die Zeichnung zeigt die Schieber (orange) und die Eckschieber (blaue Raute).</div>
<div class="eb-diagram-box" id="drb_stueckeBild">${drbGrundrissSvg(d.kanten,d.geschlossen,drbSvgOptionen())}</div>`;
}
function drbStreifenErgebnisHtml(){
 const d=fpA.dachrand,e=drbStreifenBerechnen(d.streifen,fpA.schenkel,d.kanten,d.stueck.laenge);
 if(e.aus)return `<div class="small">Kein Einhängestreifen gewünscht.</div>`;
 if(!e.ok)return `<div class="ra-warnung">${drbEsc(e.grund)}</div>`;
 return `<div class="ra-ok" style="margin:6px 0"><b>Vorschlag:</b> Einhängestreifen, Abwicklung <b>${drbMm(e.abwicklung)} mm</b>
(Befestigung ${drbMm(e.befestigung)} mm + Haken ${drbMm(e.haken)} mm zurückgefalzt)${e.abwicklungManuell?" – von Hand eingegeben":""}.<br>
Gesamtlänge <b>${drbM(e.gesamtlaenge)} m</b> · <b>${e.anzahl} Stück</b> · ${e.gruppen.map(x=>x.anzahl+" × "+drbMm(x.laenge)+" mm").join(" + ")} (Länge pro Stück ${drbMm(e.stueckLaenge)} mm)
· Fläche ${e.flaecheM2.toFixed(2).replace(".",",")} m²</div>
<div class="eb-diagram-box" style="max-width:360px;max-height:150px;overflow:hidden">${drbProfilSvg(e.profil)}</div>
<div class="small">Greift in Umschlag ${e.umschlag+1} des Profils (${drbMm(e.umLaenge)} mm, Spiel ${drbMm(e.spiel)} mm). Die Streifen stossen stumpf; je Kante wird für sich eingeteilt.</div>`;
}
function drbStreifenHtml(){
 const d=fpA.dachrand,st=d.streifen;
 const e=drbStreifenBerechnen(st,fpA.schenkel,d.kanten,d.stueck.laenge);
 const um=drbUmschlaege(fpA.schenkel);
 const umOpt=um.map(i=>`<option value="${i}"${e.ok&&e.umschlag===i?" selected":""}>Umschlag ${i+1} (${drbEsc(drbMm(fpA.schenkel[i].laenge))} mm)</option>`).join("");
 return `<div class="info">Der Einhängestreifen wird an der Wand befestigt, der Umschlag des Dachrandblechs greift hinein. Die App schlägt ihn aus dem gewählten
Umschlag vor; alle Werte lassen sich ändern.</div>
<label class="rechte-schalter" style="margin:8px 0"><input type="checkbox" id="drb_streifenAktiv"${st.aktiv?" checked":""}> Einhängestreifen vorschlagen</label>
${st.aktiv?`<div class="grid">
${um.length?fpaFeld("Greift in",`<select data-drb-s="umschlag">${umOpt}</select>`):""}
${fpaFeld("Befestigungsschenkel (mm)",`<input data-drb-s="befestigung" type="number" inputmode="numeric" step="1" value="${drbHat(st.befestigung)?drbEsc(st.befestigung):""}">`)}
${fpaFeld("Spiel am Haken (mm)",`<input data-drb-s="spiel" type="number" inputmode="numeric" step="1" value="${drbHat(st.spiel)?drbEsc(st.spiel):""}">`)}
${fpaFeld("Abwicklung (mm) – leer = Vorschlag"+(e.ok?" "+drbMm(e.vorschlag):""),`<input data-drb-s="abwicklung" type="number" inputmode="numeric" step="1" value="${drbHat(st.abwicklung)?drbEsc(st.abwicklung):""}" placeholder="${e.ok?drbEsc(e.vorschlag):""}">`)}
${fpaFeld("Länge pro Stück (mm) – leer = wie das Blech",`<input data-drb-s="laenge" type="number" inputmode="numeric" step="1" value="${drbHat(st.laenge)?drbEsc(st.laenge):""}" placeholder="${drbEsc(d.stueck.laenge)}">`)}
</div>`:""}
<div id="drb_streifenErgebnis">${drbStreifenErgebnisHtml()}</div>`;
}

// ---- Live-Anzeigen ohne vollständiges Neuzeichnen (Fokus bleibt im Feld) ---------------------------
function drbLive(){
 drbSync();
 const d=fpA.dachrand;
 const bild=$("drb_grundrissBild");
 if(bild)bild.innerHTML=drbGrundrissSvg(d.kanten,d.geschlossen,drbSvgOptionen())||'<div class="small" style="padding:10px">Noch keine Kante.</div>';
 const summe=$("drb_grundrissSumme");if(summe)summe.innerHTML=drbGrundrissSummeHtml();
 const kopf=$("drb_kopfzahl");if(kopf)kopf.textContent=d.kanten.length+" Kanten";
 d.kanten.forEach((k,i)=>{
  const z=document.querySelector('[data-drb-zeile="'+i+'"] .small');
  if(z)z.textContent=drbMm(k.laenge)+" mm · "+drbEckeText(k,i,d.kanten,d.geschlossen);
 });
 document.querySelectorAll("[data-drb-hinweis]").forEach(el=>{el.textContent=drbEinteilungHinweis(Number(el.dataset.drbHinweis))});
 const t=$("drb_stueckeTabelle");if(t)t.innerHTML=drbStueckeTabelleHtml();
 const sb=$("drb_stueckeBild");if(sb)sb.innerHTML=drbGrundrissSvg(d.kanten,d.geschlossen,drbSvgOptionen());
 const se=$("drb_streifenErgebnis");if(se)se.innerHTML=drbStreifenErgebnisHtml();
}

// ---- Ereignisse ------------------------------------------------------------------------------------------
function drbVerdrahten(wurzel){
 if(!wurzel||wurzel.dataset.drbVerdrahtet)return;
 wurzel.dataset.drbVerdrahtet="1";
 const num=v=>v===""?"":drbZ(v);
 wurzel.addEventListener("input",e=>{
  if(fpaZeichnet||!fpA.dachrand||!fpaIstDachrand())return;
  const t=e.target,d=t.dataset||{},m=fpA.dachrand;
  if(d.drbLaenge!==undefined){const k=m.kanten[Number(d.drbLaenge)];if(k)k.laenge=num(t.value)}
  else if(d.drbWinkel!==undefined){const k=m.kanten[Number(d.drbWinkel)];if(k)k.winkel=num(t.value)}
  else if(d.drbTeile!==undefined){const k=m.kanten[Number(d.drbTeile)];if(k)k.teile=drbTeile(t.value)||""}
  else if(d.drbWunsch!==undefined){const k=m.kanten[Number(d.drbWunsch)];if(k)k.wunsch=drbWunsch(t.value)||""}
  else if(d.drbP!==undefined)m.stueck.laenge=num(t.value);
  else if(d.drbU!==undefined)m.stueck.ueberlappung=num(t.value);
  else if(d.drbSz!==undefined){m.schieber=m.schieber||{zugabe:"",abzug:""};m.schieber.zugabe=num(t.value)}
  else if(d.drbSa!==undefined){m.schieber=m.schieber||{zugabe:"",abzug:""};m.schieber.abzug=num(t.value)}
  else if(d.drbS!==undefined&&["befestigung","spiel","abwicklung","laenge"].includes(d.drbS))m.streifen[d.drbS]=num(t.value);
  else return;
  drbLive();
 });
 wurzel.addEventListener("change",e=>{
  if(fpaZeichnet||!fpA.dachrand||!fpaIstDachrand())return;
  const t=e.target,d=t.dataset||{},m=fpA.dachrand;
  if(d.drbEcke!==undefined){const k=m.kanten[Number(d.drbEcke)];if(k){k.ecke=t.value;if(k.ecke==="winkel"&&!drbHat(k.winkel))k.winkel=90}drbSync();renderFreiesProfilAufnahme();return}
  if(d.drbStoss!==undefined){m.stoss=t.value==="schieber"?"schieber":"ueberlappung";drbSync();renderFreiesProfilAufnahme();return}
  if(d.drbEck!==undefined){const k=m.kanten[Number(d.drbEck)];if(k)k.eckschieber=!!t.checked;drbSync();renderFreiesProfilAufnahme();return}
  if(t.id==="drb_geschlossen"){m.geschlossen=!!t.checked;drbSync();renderFreiesProfilAufnahme();return}
  if(t.id==="drb_gleich"){m.stueck.gleich=!!t.checked;drbSync();renderFreiesProfilAufnahme();return}
  if(t.id==="drb_streifenAktiv"){m.streifen.aktiv=!!t.checked;renderFreiesProfilAufnahme();return}
  if(d.drbS==="umschlag"){m.streifen.umschlag=t.value===""?"":Number(t.value);renderFreiesProfilAufnahme();return}
 });
 wurzel.addEventListener("click",async e=>{
  if(!fpA.dachrand||!fpaIstDachrand())return;
  const t=e.target.closest("button");if(!t)return;
  const d=t.dataset||{},m=fpA.dachrand;
  if(d.drbDetail!==undefined){
   if(d.drbDetail==="1.5"){
    if(fpA.schenkel.length&&!drbIstDetail15(fpA.schenkel)){
     const ok=await appConfirm("Das aktuelle Profil wird durch Detail 1.5 ersetzt. Die bisherigen Schenkel gehen verloren. Fortfahren?");
     if(!ok)return;
    }
    drbDetailLaden();
   }else{
    // Ein unverändertes Detail 1.5 wird geleert (neues Profil von Grund auf); ein bereits angepasstes Profil bleibt als Ausgangspunkt.
    if(drbIstDetail15(fpA.schenkel)){fpA.schenkel=[];fpSchenkel=fpA.schenkel}
    m.detail="eigen";
   }
   renderFreiesProfilAufnahme();return;
  }
  if(t.id==="drb_wunschAlleBtn"){
   const w=drbWunsch(($("drb_wunschAlle")||{}).value);
   if(!w){appAlert("Bitte eine Wunschlänge in mm eingeben.");return}
   m.kanten.forEach(k=>{k.wunsch=w;k.teile=""});
   drbSync();renderFreiesProfilAufnahme();return;
  }
  if(t.id==="drb_kantePlus"){
   if(m.kanten.length>=DRB_MAX_KANTEN){appAlert("Höchstens "+DRB_MAX_KANTEN+" Kanten.");return}
   // die vorherige letzte Kante bekommt eine Ecke (Aussenecke), die neue ist das Ende
   m.kanten.push({laenge:"",ecke:"aussen",winkel:90});
   drbSync();renderFreiesProfilAufnahme();return;
  }
  if(d.drbKanteWeg!==undefined){m.kanten.splice(Number(d.drbKanteWeg),1);drbSync();renderFreiesProfilAufnahme();return}
  if(d.drbHoch!==undefined){const i=Number(d.drbHoch);if(i>0){const x=m.kanten[i];m.kanten[i]=m.kanten[i-1];m.kanten[i-1]=x}drbSync();renderFreiesProfilAufnahme();return}
  if(d.drbRunter!==undefined){const i=Number(d.drbRunter);if(i<m.kanten.length-1){const x=m.kanten[i];m.kanten[i]=m.kanten[i+1];m.kanten[i+1]=x}drbSync();renderFreiesProfilAufnahme();return}
 });
}

// ---- Druck ------------------------------------------------------------------------------------------------
// Aus den GESPEICHERTEN Daten (nichts kommt aus dem offenen Formular).
function drbDruckHtml(d,cell){
 const dr=d&&d.dachrand;
 if(!dr)return "";
 const kanten=Array.isArray(dr.kanten)?dr.kanten:[];
 const er=dr.ergebnis||{};
 const svg=drbGrundrissSvg(kanten,!!dr.geschlossen,drbSvgOptionenAusDaten(dr));
 const st=er.stuecke||[];
 const grp=drbGruppen(st.map(s=>({laenge:s.laenge})));
 const sr=er.streifen;
 let h=`<div class="eb-section-head">Dachrand</div>
<table class="eb-info-table"><tr>${cell("Detail",esc(dr.detail==="1.5"?"Detail 1.5":"Eigenes Profil"))}${cell("Gesamtlänge",esc(drbM(er.gesamtlaenge))+" m")}</tr>
${dr.stoss==="schieber"&&er.schieber?`<tr>${cell("Stossart","Schieber (SIA 271, "+esc(er.schieber.material)+")")}${cell("Schieber",esc(er.schieber.anzahl)+" Stk., Zugabe "+esc(drbMm(er.schieber.zugabe))+" mm")}</tr>
<tr>${cell("Eckschieber (Gehrung)",esc((er.eckschieber||[]).length)+" Stk.")}${cell("Abzug Eckschieber",esc(drbMm(er.schieber.abzug))+" mm")}</tr>`
 :`<tr>${cell("Länge pro Stück",esc(drbMm(dr.stueck&&dr.stueck.laenge))+" mm")}${cell("Überlappung",esc(drbMm(dr.stueck&&dr.stueck.ueberlappung))+" mm")}</tr>`}
<tr>${cell("Aussenecken",esc(er.aussenecken||0))}${cell("Inneneck",esc(er.inneneck||0))}</tr></table>`;
 if(svg)h+=`<div class="eb-section-head">Grundriss</div><div class="eb-diagram">${svg}</div>`;
 if(kanten.length)h+=`<table class="eb-cutlist"><thead><tr><th>Kante</th><th>Länge (mm)</th><th>Ecke danach</th></tr></thead><tbody>${kanten.map((k,i)=>
  `<tr><td>${i+1}</td><td>${esc(drbMm(k.laenge))}</td><td>${esc(drbEckeText(k,i,kanten,!!dr.geschlossen)+((dr.stoss==="schieber"&&k.eckschieber&&drbEckeGilt(kanten,i,!!dr.geschlossen)&&k.ecke!=="ende")?" · Eckschieber (Gehrung)":""))}</td></tr>`).join("")}</tbody></table>`;
 if(grp.length)h+=`<div class="eb-section-head">Stücke</div>
<table class="eb-cutlist"><thead><tr><th>Anzahl</th><th>Länge (mm)</th></tr></thead><tbody>${grp.map(x=>`<tr><td>${x.anzahl}</td><td>${esc(drbMm(x.laenge))}</td></tr>`).join("")}</tbody></table>
<div class="small">${dr.stoss==="schieber"?"Material inkl. Zugaben/Abzüge":"Material inkl. Überlappung"} ${esc(drbM(er.materialLaenge))} m</div>`;
 if(sr)h+=`<div class="eb-section-head">Einhängestreifen (Vorschlag)</div>
<table class="eb-info-table"><tr>${cell("Abwicklung",esc(drbMm(sr.abwicklung))+" mm")}${cell("Greift in Umschlag",esc(sr.umschlag))}</tr>
<tr>${cell("Gesamtlänge",esc(drbM(sr.gesamtlaenge))+" m")}${cell("Stück",esc(sr.anzahl)+" · "+(sr.gruppen||[]).map(x=>x.anzahl+" × "+drbMm(x.laenge)+" mm").join(" + "))}</tr></table>`;
 return h;
}
