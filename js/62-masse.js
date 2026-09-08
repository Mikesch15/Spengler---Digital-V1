// ---------------------------------------------------------------------------
// v3.32  Masszahlen in den Skizzen - EINE Stelle fuer Platz und Darstellung
// ---------------------------------------------------------------------------
// Der Auftrag: "schau darauf das sich nirgends zwei masse verdecken".
//
// Gemessen (echtes Chromium, getBoundingClientRect - also MIT Drehung, denn
// getBBox liefert den Kasten VOR der eigenen Transformation und vergleicht
// sonst zwei verschiedene Koordinatensysteme):
//
//   Rinne Halbrund · Grundriss     "6000" ueber "1"   41 px2
//                                  "6000" ueber "2"   41 px2
//   Mauerabdeckung · Grundriss     "8000" ueber "1"   41 px2
//                                  "4000" ueber "2"   50 px2
//
// Das ist genau der Befund, der seit CLAUDE.md 135.9 als offener Punkt
// steht ("3(*)0"): die Masszahl steht bei off=15 und die Positionsnummer bei
// off=13 - beide auf DERSELBEN Seite der Linie, und bei einem Stueck je
// Segment auch noch an derselben Stelle.
//
// Eine blosse groessere Zahl waere geraten. Deshalb steht hier ein kleiner
// Platzhalter-Rechner: jede Beschriftung meldet ihren Kasten an, und die
// naechste weicht auf die erste freie ihrer Ausweichstellen aus. Dasselbe
// Vorgehen, das js/12b fuer das Mauerabdeckungs-Profil seit v2.79 schon
// hat - nur steht es jetzt an EINER Stelle statt in jeder Datei neu.
//
//   const belegt=[];                       // je Zeichnung eine eigene Liste
//   massBelegen(belegt,x,y,text,groesse,winkel)      // fest gesetzt
//   massPlatz(belegt,kandidaten,text,groesse,winkel) // erster freier Platz
//
// GERECHNET WIRD NICHTS an den Massen selbst - hier geht es ausschliesslich
// darum, WO die Zahl steht.
// ---------------------------------------------------------------------------

// Geschaetzter Textkasten um den Mittelpunkt (x,y). Gedrehter Text bekommt
// den achsparallelen Kasten seiner gedrehten Ecken - sonst waere die Pruefung
// bei einem schraegen Segment zu optimistisch.
function massKasten(x,y,text,groesse,winkel){
 const g=Number(groesse)>0?Number(groesse):12;
 const br=String(text==null?"":text).length*g*0.58, ho=g*1.15;
 const r=(Number(winkel)||0)*Math.PI/180;
 const c=Math.abs(Math.cos(r)), s=Math.abs(Math.sin(r));
 const bw=br*c+ho*s, bh=br*s+ho*c;
 return {x:x-bw/2, y:y-bh/2, w:bw, h:bh};
}

// Zwei Kaesten mit etwas Luft dazwischen. Die Luft ist bewusst klein: sie
// soll Beruehrung verhindern, nicht die Zeichnung auseinanderziehen.
function massKollidiert(a,b,luft){
 const l=luft==null?2:luft;
 return a.x < b.x+b.w+l && b.x < a.x+a.w+l && a.y < b.y+b.h+l && b.y < a.y+a.h+l;
}

// Meldet einen Platz als belegt an, ohne auszuweichen - fuer alles, was an
// seiner Stelle stehen MUSS (Positionsnummer, Anschlusssymbol, Pfeil).
function massBelegen(belegt,x,y,text,groesse,winkel){
 const k=massKasten(x,y,text,groesse,winkel);
 if(Array.isArray(belegt))belegt.push(k);
 return k;
}

// Der erste freie aus den Kandidaten [[x,y],...]. Ist keiner frei, wird der
// letzte genommen und das ehrlich gemeldet (frei:false) - eine Zahl wegzu-
// lassen waere schlechter als eine, die eng steht.
function massPlatz(belegt,kandidaten,text,groesse,winkel){
 const liste=Array.isArray(kandidaten)&&kandidaten.length?kandidaten:[[0,0]];
 for(let i=0;i<liste.length;i++){
  const k=massKasten(liste[i][0],liste[i][1],text,groesse,winkel);
  const frei=!(Array.isArray(belegt)&&belegt.some(b=>massKollidiert(k,b)));
  if(frei||i===liste.length-1){
   if(Array.isArray(belegt))belegt.push(k);
   return {x:liste[i][0], y:liste[i][1], frei, kasten:k};
  }
 }
}

// Ausweichstellen entlang einer Strecke: erst weiter nach aussen, dann der
// Strecke entlang verschoben. Senkrecht zur Linie bleibt die Hilfslinie
// kurz, deshalb kommt der Abstand zuerst.
//   mx,my  Mitte der Strecke        ux,uy  Richtung der Strecke
//   nx,ny  Querrichtung             ab     Grundabstand
function massKandidaten(mx,my,ux,uy,nx,ny,ab,laenge){
 const l=Number(laenge)>0?Number(laenge):0;
 const s=[[ab,0],[ab+14,0],[ab+28,0]];
 if(l>60)s.push([ab,0.22],[ab,-0.22],[ab+14,0.22],[ab+14,-0.22]);
 s.push([ab+44,0]);
 return s.map(([d,t])=>[mx+nx*d+ux*l*t, my+ny*d+uy*l*t]);
}
