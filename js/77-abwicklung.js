"use strict";
// ===========================================================================
// Abwicklung: Rundrohr mit schraegem Anschnitt, Schweifbord und Falz (v3.188)
//
// Der Betrieb hatte diese Rechnung bisher als Fusion-360-Script (Python)
// ausserhalb der App. Sie ist hier 1:1 nach JavaScript portiert - nicht neu
// erfunden: das Schweifbord ist geometrisch nicht abwickelbar, und jede eigene
// Naeherung waere eine zweite Wahrheit neben der, nach der in der Werkstatt
// bisher geschnitten wurde.
//
// DIESE DATEI FASST DAS DOM NICHT AN.
// abwRechne() bekommt Zahlen und gibt Zahlen zurueck. Die Oberflaeche
// (js/78) zeichnet daraus; der Pruefstand rechnet sie ohne Browser nach.
// Das war eine ausdrueckliche Vorgabe des Auftrags und ist der Grund,
// warum sich die sieben Testwerte ueberhaupt pruefen lassen.
//
// KOORDINATEN DER ABWICKLUNG
// x laeuft um den Rohrumfang (0 ... L), y nach oben. Die Biegelinie des
// Schweifbords liegt bei y = zf, die Unterkante darunter, die Oberkante bei
// H + Zugabe oben. Der Falz kommt als gerader Streifen links (Faktor A)
// und rechts (Faktor B) dazu.
//
// GENAUIGKEITSMASS (Abschnitt 9 des Auftrags, Standardeingaben):
//   Umfang 343,38 · Zuschnittbreite 361,38 · Biegewinkel 60...120°.
// Diese drei gelten unveraendert.
//
// DREI WERTE DES AUFTRAGS GELTEN SEIT v3.190 NICHT MEHR, und zwar auf
// ausdruecklichen Entscheid des Anwenders (konstante Zugabe statt
// Biegeausgleich je Punkt, siehe unten):
//   Schweifbord-Zugabe  37,13...40,10  ->  39,34 (ueberall dieselbe)
//   Hoehe max           371,25         ->  370,49
//   Hoehe min           305,17         ->  307,38
// Wer diese Datei einmal gegen das Fusion-360-Script haelt, findet dort
// weiterhin die alten Zahlen. Das ist kein Fehler, sondern der Entscheid.
// ===========================================================================

// ---- Vektorhilfen (wie die Referenz) --------------------------------------
function abwKreuz(a,b){
 return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function abwSkalar(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2] }
function abwEinheit(a){
 const l=Math.sqrt(abwSkalar(a,a));
 return l?[a[0]/l,a[1]/l,a[2]/l]:[0,0,0];
}
function abwAbstand(a,b){
 let q=0;
 for(let i=0;i<a.length;i++){const d=a[i]-b[i];q+=d*d}
 return Math.sqrt(q);
}
function abwLaenge(liste){
 let s=0;
 for(let i=0;i<liste.length-1;i++)s+=abwAbstand(liste[i],liste[i+1]);
 return s;
}

// ---- Standardwerte (Abschnitt 3 des Auftrags) -----------------------------
const ABW_STANDARD={
 D:110, t:0.7, H:300, alpha:30, b:40, r:2,
 // v3.189: Vorgabe 0 Lappen. Der Betrieb schweift das Bord nachher auf der
 // Maschine - Einschnitte sind bei ihm die Ausnahme, nicht die Regel.
 nahtLang:true, f:6, faktorA:1, faktorB:2, zugabeOben:0, lappen:0
};
const ABW_PUNKTE=360;      // Stuetzpunkte je Umlauf

// Leer heisst VORGABE, nicht 0. Number("") ist 0 und damit endlich - wer das
// uebersieht, bekommt fuer ein leeres Feld stillschweigend eine Null. Genau
// das ist hier einmal passiert: die Stuetzpunkte fielen von 360 auf das
// Minimum 24, und der Zuschnitt war ein 24-Eck statt eines Kreises.
function abwZahl(x,vorgabe){
 if(x===null||x===undefined||String(x).trim()==="")return vorgabe;
 const n=Number(String(x).replace(",","."));
 return Number.isFinite(n)?n:vorgabe;
}
function abwEingaben(roh){
 const e=Object.assign({},ABW_STANDARD);
 if(roh&&typeof roh==="object"){
  Object.keys(ABW_STANDARD).forEach(k=>{
   if(roh[k]===undefined||roh[k]===null||roh[k]==="")return;
   e[k]=(k==="nahtLang")?(roh[k]===true||roh[k]==="ja"||roh[k]==="true")
                        :abwZahl(roh[k],ABW_STANDARD[k]);
  });
 }
 return e;
}

// ---- Pruefungen (Abschnitt 3) ---------------------------------------------
// Ein Fehler heisst: es wird NICHT gerechnet. Eine Warnung heisst: die Zahlen
// stimmen, aber so laesst sich das Blech nicht verarbeiten - das darf die
// Rechnung nicht unterschlagen und auch nicht selbst entscheiden.
function abwFehler(e){
 const f=[];
 if(!(e.alpha>=0&&e.alpha<75))f.push("Der Schnittwinkel muss zwischen 0 und 75 Grad liegen.");
 if(!(e.t>0))f.push("Die Blechstärke muss grösser als 0 sein.");
 if(!(e.b>0))f.push("Die Schweifbord-Breite muss grösser als 0 sein.");
 if(!(e.D>0))f.push("Der Durchmesser muss grösser als 0 sein.");
 if(e.D>0&&!(e.t<e.D/2))f.push("Die Blechstärke muss kleiner als der halbe Durchmesser sein.");
 if(!(e.r>=0))f.push("Der Biegeradius darf nicht negativ sein.");
 const R=e.D/2;
 const mindest=R*Math.tan(e.alpha*Math.PI/180)+2*(e.r+e.t)+5;
 if(e.D>0&&e.alpha>=0&&e.alpha<75&&!(e.H>mindest))
  f.push("Die Höhe muss grösser als "+mindest.toFixed(1)+" mm sein (Schrägschnitt plus Biegung plus 5 mm).");
 if(!(e.lappen>=0)||Math.round(e.lappen)!==e.lappen)f.push("Die Anzahl Lappen muss eine ganze Zahl ab 0 sein.");
 if(!(e.f>=0))f.push("Die Falzbreite darf nicht negativ sein.");
 return f;
}

// ---- Die Rechnung ---------------------------------------------------------
// 1:1 nach der Referenz aus Abschnitt 8 des Auftrags. Die Namen der
// Zwischengroessen sind bewusst dieselben geblieben (nx/ny/nz, Rn, rho,
// phi0, zf, slope, be, Z, k, z0), damit sich beide Fassungen nebeneinander
// lesen lassen.
function abwRechne(roh){
 const e=abwEingaben(roh);
 const fehler=abwFehler(e);
 if(fehler.length)return {ok:false,fehler,eingaben:e};

 const punkte=Math.max(24,Math.round(abwZahl(roh&&roh.punkte,ABW_PUNKTE)));
 const R=e.D/2, t=e.t;
 const a=e.alpha*Math.PI/180;
 // Schnittebene durch den Ursprung, um die x-Achse um alpha geneigt.
 let [nx,ny,nz]=abwEinheit([0,-Math.sin(a),Math.cos(a)]);
 if(nz<0){nx=-nx;ny=-ny;nz=-nz}
 const n=[nx,ny,nz];
 const Rn=R-t/2;
 const L=2*Math.PI*Rn;
 const rho=e.r+t/2;
 let phi0=Math.atan2(-ny,-nx);            // kuerzeste Mantellinie
 if(e.nahtLang)phi0+=Math.PI;             // Naht an laengster Mantellinie

 // ---- Die Zugabe am Schweifbord: EINE Breite fuer den ganzen Zuschnitt ----
 // v3.190, auf Entscheid des Anwenders.
 //
 // Bis v3.189 bekam jeder Punkt seine eigene Zugabe, gerechnet mit dem dort
 // wirklich auftretenden Biegewinkel (60 Grad an der langen Mantellinie, 120
 // an der kurzen). Das ist die Rechnung aus dem Fusion-360-Script, und sie
 // ist fuer sich genommen richtig: eine schaerfere Biegung frisst mehr
 // Material im Radius, also braucht der flache Zuschnitt dort weniger.
 //
 // Fuer die Werkstatt war es falsch. Ein Streifen, der ueber die Laenge um
 // 3 mm schwankt, laesst sich nicht anreissen, und das Bord wird nachher
 // ohnehin geschweift - dabei wandert das Material. Deshalb bekommt der
 // ganze Zuschnitt jetzt EINE Zugabe, gerechnet mit 90 Grad.
 //
 // WAS DAS KOSTET, WIRD NICHT VERSCHWIEGEN: das fertige Bord ist damit nicht
 // mehr ueberall exakt b breit. Wo nur 60 Grad gebogen wird, fehlen rund
 // 0,8 mm, wo 120 Grad gebogen wird, sind rund 2,2 mm zu viel. Beides wird
 // unten als bFertigMin/bFertigMax mitgegeben und in der Tabelle angezeigt -
 // eine Zahl, die man nicht sieht, kann man nicht beurteilen.
 const zugabe90=(e.b+t/2)-2*rho*Math.tan(Math.PI/4)+rho*(Math.PI/2);

 function punkt(s){
  const phi=phi0+2*Math.PI*s;
  const c=Math.cos(phi), sn=Math.sin(phi);
  const x=s*L;
  const zf=(t/2-Rn*(nx*c+ny*sn))/nz;                   // Biegelinie Schweifbord
  const slope=-(-nx*sn+ny*c)/nz;
  const u=[c,sn,0];
  const T=abwEinheit(abwKreuz(u,n));
  let w=abwEinheit(abwKreuz(n,T));
  if(abwSkalar(w,u)<0)w=[-w[0],-w[1],-w[2]];
  let d=abwEinheit(abwKreuz(u,T));
  if(d[2]>0)d=[-d[0],-d[1],-d[2]];
  const be=Math.acos(Math.max(-1,Math.min(1,abwSkalar(d,w))));   // Biegewinkel
  // Die Zugabe ist konstant (siehe oben). Was an DIESER Stelle noetig waere,
  // wird trotzdem gerechnet - daraus ergibt sich, wie breit das Bord dort
  // fertig wird.
  const Z=zugabe90;
  const zNoetig=(e.b+t/2)-2*rho*Math.tan(be/2)+rho*be;
  const bFertig=e.b+(zugabe90-zNoetig);
  const k=Math.sqrt(1+slope*slope);
  const z0=-(nx*R*c+ny*R*sn)/nz;
  return {
   fold:[x,zf],
   bottom:[x+Z*slope/k, zf-Z/k],
   Z, zNoetig, bFertig, beta:be,
   rand:[R*c+e.b*w[0], R*sn+e.b*w[1], z0+e.b*w[2]],
   phi, w
  };
 }

 const pts=[]; for(let i=0;i<=punkte;i++)pts.push(punkt(i/punkte));
 const fold=pts.map(p=>p.fold);
 const bottom=pts.map(p=>p.bottom);
 const streckung=abwLaenge(pts.map(p=>p.rand))/abwLaenge(bottom)-1;

 const schlitze=[];
 for(let j=0;j<e.lappen;j++){
  const p=punkt((j+0.5)/e.lappen);
  schlitze.push([p.bottom,p.fold]);
 }
 let monoton=true;
 for(let i=0;i<bottom.length-1;i++)if(!(bottom[i+1][0]>bottom[i][0])){monoton=false;break}

 // ---- Falz und Zuschnitt ------------------------------------------------
 // Der Falz ist ein gerader Streifen ueber die ganze Hoehe, links Faktor A,
 // rechts Faktor B (Werkstattregel "einfacher liegender Falz" = 1/2).
 const zugA=e.faktorA*e.f, zugB=e.faktorB*e.f;
 const breite=L+zugA+zugB;
 const oben=e.H+e.zugabeOben;

 // Die Unterkante ruecken wir um die linke Falzzugabe nach rechts; der Falz
 // selbst laeuft gerade durch, ueber die ganze Hoehe.
 const unten=bottom.map(p=>[p[0]+zugA,p[1]]);
 const biegeSchweifbord=fold.map(p=>[p[0]+zugA,p[1]]);
 const einschnitte=schlitze.map(s=>[[s[0][0]+zugA,s[0][1]],[s[1][0]+zugA,s[1][1]]]);
 const yb=unten.length?unten[0][1]:0;           // Unterkante an der Naht

 const kontur=[[0,yb]].concat(unten).concat([[breite,unten[unten.length-1][1]],
                                             [breite,oben],[0,oben]]);
 const falzLinien=[];
 if(zugA>0)falzLinien.push([[zugA,yb],[zugA,oben]]);
 if(zugB>0)falzLinien.push([[breite-zugB,yb],[breite-zugB,oben]]);

 // ---- Kennzahlen ---------------------------------------------------------
 const yUnten=unten.map(p=>p[1]);
 const hoeheMax=oben-Math.min.apply(null,yUnten);
 const hoeheMin=oben-Math.max.apply(null,yUnten);
 const zug=pts.map(p=>p.Z), beta=pts.map(p=>p.beta), bFertig=pts.map(p=>p.bFertig);

 const warnungen=[];
 if(!monoton)warnungen.push("Die Unterkante läuft nicht mehr durchgehend nach rechts – die Schweifbord-Zugabe ist für diese Krümmung zu gross. Schweifbord schmaler wählen oder Biegeradius vergrössern.");
 if(streckung>0.10&&e.lappen===0)warnungen.push("Der Schweifbord-Rand wird um "+(streckung*100).toFixed(0)+" % gestreckt. Von Hand aufziehen geht so nicht – entweder schweifen oder Lappen einschneiden.");

 return {
  ok:true, fehler:[], warnungen, eingaben:e, punkte,
  L, breite, oben, yb, zugA, zugB,
  kontur, biegeSchweifbord, falzLinien, einschnitte,
  unten, fold:biegeSchweifbord,
  hoeheMax, hoeheMin,
  zugMin:Math.min.apply(null,zug), zugMax:Math.max.apply(null,zug),
  bFertigMin:Math.min.apply(null,bFertig), bFertigMax:Math.max.apply(null,bFertig),
  betaMinGrad:Math.min.apply(null,beta)*180/Math.PI,
  betaMaxGrad:Math.max.apply(null,beta)*180/Math.PI,
  streckung, monoton
 };
}
