"use strict";
// ===========================================================================
// Abwicklung: Oberflaeche, Ausgabe und Speichern (v3.188, v3.192)
//
// ZWEI BAUTEILE seit v3.192: das Rundrohr (abwRechne, js/77) und das Tablett
// der Einfassung rund mit Lochausschnitt (abwTablett, js/77). Sie teilen
// sich Vorschau, Ergebnis, DXF, 1:1-Schablone, Speichern und die Liste.
// Unterschieden wird an genau zwei Stellen: welche Felder gelesen werden
// (abwBauteil) und welche Linien es gibt (abwZeichenTeile). Alles andere ist
// gemeinsam - der Auftrag verlangte ausdruecklich einen erweiterbaren Aufbau
// fuer spaetere Bauteile (Rohrbogen, Hosenrohr, Kegel).
//
// Die Rechnung steht in js/77 und wird hier NICHT wiederholt - diese Datei
// liest Felder, zeichnet, exportiert und speichert. Jede Zahl, die hier
// erscheint, kommt aus abwRechne().
//
// BEIM LADEN EINER GESPEICHERTEN ABWICKLUNG WIRD NEU GERECHNET, aber die
// gespeicherten Kennzahlen bleiben daneben stehen, falls sie abweichen. Ein
// Zuschnitt, nach dem schon geschnitten wurde, darf nicht stillschweigend
// andere Zahlen bekommen, nur weil eine spaetere Version anders rechnet.
// ===========================================================================

// v3.196: "lappen" ist raus - eingeschnitten wird nicht mehr.
const ABW_FELDER=["D","t","H","alpha","b","r","nahtLang","f","faktorA","faktorB","zugabeOben"];
// v3.192: das zweite Bauteil. Eigene Feld-Vorsilbe "tab_", damit sich die
// beiden Formulare nicht ins Gehege kommen; gerechnet wird es in js/77.
const ABW_TABLETT_FELDER=["D","alpha","a","b","c","umschlag","massSeitlich","lochZugabe"];
// v3.196: Der Dachwinkel ist bei BEIDEN Bauteilen dasselbe Mass - beim Rohr
// hiess er "Schnittwinkel", beim Tablett "Dachwinkel", und man musste ihn
// zweimal eintippen. Es gibt jetzt EIN Feld (abw_alpha) fuer beide. Wer
// dasselbe Mass zweimal erfassen laesst, bekommt frueher oder spaeter zwei
// verschiedene Winkel fuer dasselbe Dach.
const ABW_GETEILT=["alpha"];
function abwTablettEl(k){
 return abwEl(ABW_GETEILT.indexOf(k)>=0 ? k : "tab_"+k);
}
let abwLetztes=null;        // das zuletzt gerechnete Ergebnis
let abwGespeichert=[];      // die Liste aus der Datenbank
let abwGeladenVon=null;     // id des geladenen Datensatzes (fuer den Vergleich)
// v3.191: Woher die Masse kommen, wenn die Abwicklung aus einer Massaufnahme
// heraus geoeffnet wurde. {measurementId, text, uebernommen:[...]}
let abwHerkunft=null;
// v3.192: Die Massaufnahmen, aus denen sich Masse holen lassen (Gegenrichtung
// zum Knopf in der Aufnahme selbst). Wird erst beim Aufklappen geladen.
let abwAufnahmen=null;

function abwEl(k){ return (typeof $==="function")?$("abw_"+k):document.getElementById("abw_"+k) }

// v3.194: Das Tablett hiess in v3.192 und v3.193 "Hablett" - der Betrieb
// nennt es Tablett. Ein Datensatz aus diesen beiden Versionen traegt noch
// den alten Namen und muss trotzdem als Tablett aufgehen; er als Rohr zu
// oeffnen waere das Schlimmste, was hier passieren koennte. Deshalb liest
// EINE Stelle den gespeicherten Namen, und die kennt beide.
function abwBauteilAusDaten(x){
 return (x==="tablett"||x==="hablett")?"tablett":"rohr";
}

// ---- Bauteil --------------------------------------------------------------
// EINE Stelle sagt, welches Bauteil gerade gilt. Steht die Auswahl nicht im
// HTML (aelterer Ausdruck, Pruefstand ohne Dialog), ist es das Rohr - das
// war bis v3.191 das einzige Bauteil.
function abwBauteil(){
 const el=(typeof $==="function")?$("abw_bauteil"):document.getElementById("abw_bauteil");
 return (el&&el.value==="tablett")?"tablett":"rohr";
}
function abwBauteilSetzen(b){
 const el=(typeof $==="function")?$("abw_bauteil"):document.getElementById("abw_bauteil");
 if(el)el.value=(b==="tablett")?"tablett":"rohr";
 abwBauteilZeigen();
}
// Die Vorgabemasse des Tabletts kommen aus der Einfassung rund (js/21) und
// werden hier NICHT noch einmal hingeschrieben - sonst gaebe es zwei
// Vorgaben fuer dasselbe Blech.
function abwTablettStandard(){
 const v=(typeof einfVorgabe==="function")?einfVorgabe():{};
 const s=(typeof einfassungSettings==="object"&&einfassungSettings)||{};
 return {D:v.durchmesser, alpha:v.winkel, a:v.a, b:v.b, c:v.c,
         umschlag:s.umschlag, massSeitlich:s.mass_seitlich, lochZugabe:s.loch_zugabe};
}
function abwTablettFelderLesen(){
 const p={};
 ABW_TABLETT_FELDER.forEach(k=>{ const el=abwTablettEl(k); if(el)p[k]=el.value });
 return p;
}
function abwTablettFelderSetzen(p){
 const e=Object.assign({},abwTablettStandard(),p||{});
 ABW_TABLETT_FELDER.forEach(k=>{
  const el=abwTablettEl(k);
  if(el&&e[k]!==undefined&&e[k]!==null)el.value=String(e[k]);
 });
}
function abwBauteilZeigen(){
 if(typeof $!=="function")return;
 const tablett=abwBauteil()==="tablett";
 if($("abwMasseRohr"))$("abwMasseRohr").hidden=tablett;
 if($("abwMasseTablett"))$("abwMasseTablett").hidden=!tablett;
 if($("abwBeschreibung"))$("abwBeschreibung").textContent=tablett
  ? "Tablett der Einfassung rund: das flache Blech auf dem Dach. Das Loch ist eine Ellipse, weil das Rohr im Lot steht und das Blech in der Dachfläche liegt."
  : "Rundrohr, unten schräg angeschnitten, mit Schweifbord und Längsfalz. Die Masse in mm und Grad.";
}

function abwFelderLesen(){
 const p={};
 ABW_FELDER.forEach(k=>{
  const el=abwEl(k);
  if(!el)return;
  p[k]=(k==="nahtLang")?(el.value==="ja"):el.value;
 });
 return p;
}
function abwFelderSetzen(p){
 const e=Object.assign({},ABW_STANDARD,p||{});
 ABW_FELDER.forEach(k=>{
  const el=abwEl(k);
  if(!el)return;
  el.value=(k==="nahtLang")?(e[k]?"ja":"nein"):String(e[k]);
 });
}

// ---- Zeichnen -------------------------------------------------------------
function abwPfad(punkte,zu){
 if(!punkte||!punkte.length)return "";
 return "M"+punkte.map(p=>abwRund(p[0])+","+abwRund(p[1])).join(" L")+(zu?" Z":"");
}
function abwRund(x){ return Math.round(Number(x)*1000)/1000 }

// v3.192: EINE Tabelle beschreibt jede Linienart - Farbe, Strichbild,
// DXF-Layer und der Name in der Legende. Vorschau, Schablone, DXF und
// Legende lesen daraus. Vorher stand jede Farbe dreimal im Code; mit einem
// zweiten Bauteil waeren daraus sechs Stellen geworden.
const ABW_LINIENART={
 schnitt:     {farbe:"#17202a",dick:0.6,strich:"", layer:"ZUSCHNITT",               text:"Zuschnitt"},
 schweifbord: {farbe:"#c62828",dick:0.5,strich:"4,2",layer:"BIEGELINIE_SCHWEIFBORD",text:"Biegelinie Schweifbord"},
 falz:        {farbe:"#1565c0",dick:0.5,strich:"4,2",layer:"BIEGELINIE_FALZ",       text:"Falz"},
 biege:       {farbe:"#1565c0",dick:0.5,strich:"4,2",layer:"BIEGELINIE",            text:"Biegelinien"},
 loch:        {farbe:"#17202a",dick:0.6,strich:"", layer:"LOCHAUSSCHNITT",          text:"Lochausschnitt",zu:true}
};
// Welche Linien hat DIESES Bauteil? Die einzige Stelle, die das weiss.
// Leere Gruppen fallen raus: ein leerer DXF-Layer waere eine Zeile, die
// etwas behauptet, was nicht da ist.
function abwZeichenTeile(r){
 const g=(r&&r.bauteil==="tablett")
  ? [{art:"biege",linien:r.biegeLinien},{art:"loch",linien:[r.loch]}]
  : [{art:"schweifbord",linien:[r.biegeSchweifbord]},
     {art:"falz",linien:r.falzLinien}];
 return g.map(x=>({art:x.art,linien:(x.linien||[]).filter(l=>l&&l.length)}))
         .filter(x=>x.linien.length);
}

// Der Zuschnitt in Blechkoordinaten: x nach rechts, y nach oben. SVG rechnet
// y nach unten, deshalb wird einmal zentral gespiegelt statt an jeder
// einzelnen Stelle.
function abwLinienSvg(r,flip,skala){
 const f=skala||1;
 return abwZeichenTeile(r).map(g=>{
  const a=ABW_LINIENART[g.art];
  return g.linien.map(l=>`<path d="${abwPfad(l.map(flip),!!a.zu)}" fill="none" stroke="${a.farbe}"`
   +` stroke-width="${abwRund(a.dick*f)}"${a.strich?` stroke-dasharray="${a.strich}"`:""}/>`).join("");
 }).join("");
}
function abwSvg(r,opt){
 opt=opt||{};
 const rand=opt.rand===undefined?8:opt.rand;
 const alleY=r.kontur.map(p=>p[1]);
 const yMin=Math.min.apply(null,alleY), yMax=Math.max.apply(null,alleY);
 const w=r.breite, h=yMax-yMin;
 const flip=p=>[p[0],yMax-p[1]];
 const mm=opt.mm?' width="'+abwRund(w+2*rand)+'mm" height="'+abwRund(h+2*rand)+'mm"':' width="100%"';
 return `<svg xmlns="http://www.w3.org/2000/svg"${mm}
 viewBox="${-rand} ${-rand} ${abwRund(w+2*rand)} ${abwRund(h+2*rand)}"
 preserveAspectRatio="xMidYMid meet" class="abw-svg">
 <path d="${abwPfad(r.kontur.map(flip),true)}" fill="none" stroke="${ABW_LINIENART.schnitt.farbe}" stroke-width="${ABW_LINIENART.schnitt.dick}"/>
 ${abwLinienSvg(r,flip)}
</svg>`;
}
// Die Legende kommt aus derselben Tabelle wie die Zeichnung. Eine von Hand
// geschriebene Legende zeigt frueher oder spaeter eine Linie, die es im
// Bild gar nicht mehr gibt.
function abwLegendeHtml(r){
 const eintrag=a=>`<span class="abw-l" style="border-top-color:${a.farbe};border-top-style:${a.strich?"dashed":"solid"};border-top-width:${a.dick>=0.5?2:1}px"></span> ${esc(a.text)}`;
 return `<div class="small abw-legende">${
  [ABW_LINIENART.schnitt].concat(abwZeichenTeile(r).map(g=>ABW_LINIENART[g.art]))
   .map(eintrag).join("")}</div>`;
}

function abwVorschauZeichnen(r){
 const box=(typeof $==="function")?$("abwVorschau"):document.getElementById("abwVorschau");
 if(!box)return;
 if(!r||!r.ok){ box.innerHTML=`<p class="small">Keine Vorschau – die Masse sind noch nicht vollständig.</p>`; return }
 const fuss=(r.bauteil==="tablett")
  ? `Zuschnitt ${abwMm(r.breite)} × ${abwMm(r.laenge)} · Loch ${abwMm(r.lochQuer)} quer × ${abwMm(r.lochLang)} in Gefällerichtung`
  : `Zuschnittbreite ${abwMm(r.breite)} · Umfang ${abwMm(r.L)} · Höhe an der Naht ${abwMm(r.hoeheMax)}`;
 // Beim Tablett treffen die seitlichen Umschlaege auf den vorderen und den
 // oberen. Das gilt fuer jedes Tablett und ist deshalb ein fester Hinweis
 // und keine Warnung (siehe js/77) - eine Warnung, die immer kommt, liest
 // nach drei Tagen niemand mehr.
 const ecken=(r.bauteil==="tablett"&&r.eingaben.umschlag>0)
  ? `<div class="small" style="color:var(--muted)">Die vier Ecken sind doppelt belegt (seitlicher Umschlag trifft auf den vorderen bzw. oberen) und werden wie gewohnt ausgeklinkt.</div>`
  : "";
 box.innerHTML=abwSvg(r)+abwLegendeHtml(r)
  +`<div class="small" style="color:var(--muted)">${fuss}</div>`+ecken;
}

function abwMm(x){ return Number(x).toFixed(2).replace(".",",")+" mm" }
function abwGrad(x){ return Number(x).toFixed(1).replace(".",",")+"°" }

function abwErgebnisZeichnen(r){
 const box=(typeof $==="function")?$("abwErgebnis"):document.getElementById("abwErgebnis");
 if(!box)return;
 if(!r||!r.ok){ box.innerHTML=""; return }
 if(r.bauteil==="tablett"){
  box.innerHTML=`<table class="abw-tabelle">
  <tr><td>Zuschnittbreite</td><td>${abwMm(r.breite)}</td></tr>
  <tr><td>Zuschnittlänge</td><td>${abwMm(r.laenge)}</td></tr>
  <tr><td>Mitte Rohr ab Vorderkante</td><td>${abwMm(r.mitteY)}</td></tr>
  <tr><td>Loch quer zum Gefälle</td><td>${abwMm(r.lochQuer)}</td></tr>
  <tr><td>Loch in Gefällerichtung</td><td>${abwMm(r.lochLang)}</td></tr>
  <tr><td>Luft am Lochausschnitt</td><td>${abwMm(r.eingaben.lochZugabe)}</td></tr>
 </table>`;
  return;
 }
 box.innerHTML=`<table class="abw-tabelle">
  <tr><td>Zuschnittbreite</td><td>${abwMm(r.breite)}</td></tr>
  <tr><td>Umfang neutrale Faser</td><td>${abwMm(r.L)}</td></tr>
  <tr><td>Höhe max (an der Naht)</td><td>${abwMm(r.hoeheMax)}</td></tr>
  <tr><td>Höhe min</td><td>${abwMm(r.hoeheMin)}</td></tr>
  <tr><td>Schweifbord-Zugabe</td><td>${abwMm(r.zugMin)}</td></tr>
  <tr><td>Biegewinkel Schweifbord</td><td>${abwGrad(r.betaMinGrad)} … ${abwGrad(r.betaMaxGrad)}</td></tr>
  <tr><td>Bord fertig (rechnerisch)</td><td>${abwMm(r.bFertigMin)} … ${abwMm(r.bFertigMax)}</td></tr>
  <tr><td>Streckung Schweifbord-Rand</td><td>${(r.streckung*100).toFixed(1).replace(".",",")} %</td></tr>
 </table>`;
}

// v3.191: Was aus der Massaufnahme kam - und was NICHT. Eine Uebernahme,
// die nicht sagt, welche Felder sie gesetzt hat, laesst den Anwender raten,
// welche Zahl er noch pruefen muss.
function abwHerkunftHtml(){
 if(!abwHerkunft)return "";
 // v3.192: Welche Felder es je Bauteil gibt, weiss die Bruecke in js/38 -
 // sie liefert "uebernommen" UND "fehlt". Bis v3.191 stand die Liste hier
 // noch einmal; mit dem zweiten Bauteil waere sie damit falsch geworden.
 const da=abwHerkunft.uebernommen||[];
 const fehlt=abwHerkunft.fehlt||[];
 const zeile=(da.length||fehlt.length)
  ? `<div class="small">Übernommen: ${da.length?esc(da.join(", ")):"nichts"}${
      fehlt.length?` · <b>nicht übernommen:</b> ${esc(fehlt.join(", "))} – bitte prüfen`:""}</div>`
  : "";
 return `<div class="abw-herkunft">
  <b>Aus der Massaufnahme:</b> ${esc(abwHerkunft.text||"")}
  ${zeile}
  <button type="button" class="kon-klein kon-k-grau" data-abw-herkunft-weg="1">Verbindung lösen</button>
 </div>`;
}
function abwHerkunftZeichnen(){
 const box=(typeof $==="function")?$("abwHerkunft"):document.getElementById("abwHerkunft");
 if(box)box.innerHTML=abwHerkunftHtml();
}

function abwMeldungZeigen(r){
 const m=(typeof $==="function")?$("abwMeldung"):document.getElementById("abwMeldung");
 if(!m)return;
 if(!r){ m.innerHTML=""; return }
 const teile=[];
 (r.fehler||[]).forEach(t=>teile.push(`<div class="abw-fehler">⚠️ ${esc(t)}</div>`));
 (r.warnungen||[]).forEach(t=>teile.push(`<div class="abw-warnung">${esc(t)}</div>`));
 m.innerHTML=teile.join("");
}

// EINE Stelle, die rechnet und zeichnet. Jede Feldaenderung ruft sie.
function abwAktualisieren(){
 const tablett=abwBauteil()==="tablett";
 const r=tablett?abwTablett(abwTablettFelderLesen()):abwRechne(abwFelderLesen());
 // abwRechne() kennt kein Feld "bauteil" - es gab bis v3.191 nur eines.
 if(!r.bauteil)r.bauteil="rohr";
 abwLetztes=r.ok?r:null;
 abwMeldungZeigen(r);
 abwVorschauZeichnen(r);
 abwErgebnisZeichnen(r);
 abwPapierWahlZeichnen(r);
 return r;
}

// ---- Ausgabe --------------------------------------------------------------
// DXF, ASCII R12. Kurven als LWPOLYLINE-Ersatz: eine POLYLINE mit VERTEX je
// Stuetzpunkt - das liest jedes Programm, auch alte Zuschnittsoftware.
function abwDxfLinie(code,wert){ return code+"\n"+wert+"\n" }
function abwDxfPolylinie(punkte,layer,zu){
 let s=abwDxfLinie(0,"POLYLINE")+abwDxfLinie(8,layer)+abwDxfLinie(66,1)
      +abwDxfLinie(70,zu?1:0);
 punkte.forEach(p=>{
  s+=abwDxfLinie(0,"VERTEX")+abwDxfLinie(8,layer)
    +abwDxfLinie(10,abwRund(p[0]))+abwDxfLinie(20,abwRund(p[1]))+abwDxfLinie(30,0);
 });
 return s+abwDxfLinie(0,"SEQEND")+abwDxfLinie(8,layer);
}
function abwDxfText(r){
 let s=abwDxfLinie(0,"SECTION")+abwDxfLinie(2,"HEADER")
      +abwDxfLinie(9,"$INSUNITS")+abwDxfLinie(70,4)      // 4 = Millimeter
      +abwDxfLinie(0,"ENDSEC")
      +abwDxfLinie(0,"SECTION")+abwDxfLinie(2,"ENTITIES");
 s+=abwDxfPolylinie(r.kontur,ABW_LINIENART.schnitt.layer,true);
 abwZeichenTeile(r).forEach(g=>{
  const a=ABW_LINIENART[g.art];
  g.linien.forEach(l=>{ s+=abwDxfPolylinie(l,a.layer,!!a.zu) });
 });
 return s+abwDxfLinie(0,"ENDSEC")+abwDxfLinie(0,"EOF");
}

function abwDateiname(endung){
 const b=(typeof $==="function"&&$("abw_bezeichnung")&&$("abw_bezeichnung").value.trim())||"Abwicklung";
 return b.replace(/[^\wÄÖÜäöüß .-]/g,"_").slice(0,60)+"."+endung;
}
function abwHerunterladen(text,name,typ){
 try{
  const blob=new Blob([text],{type:typ});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  return true;
 }catch(e){ return false }
}

// ---- Schablone 1:1 --------------------------------------------------------
// Aufteilung auf Papierblaetter mit Ueberlappung, Passmarken, Seitennummern
// und einem 100-mm-Kontrollmass je Seite. Das Kontrollmass ist kein Schmuck:
// ohne Nachmessen weiss niemand, ob der Drucker wirklich 1:1 gedruckt hat,
// und eine um 4 % verkleinerte Schablone faellt erst am Blech auf.
//
// v3.193: DAS FORMAT WIRD VORGESCHLAGEN, NICHT FESTGELEGT.
// Bis v3.192 war A4 fest verdrahtet. Das Tablett (350 x 543 mm) brauchte
// damit SECHS Blatt, und beim Rohr trug die dritte Spalte 1,4 mm Zeichnung -
// ein ganzes Blatt fuer nichts. Die App rechnet jetzt jedes Format durch und
// waehlt das mit den wenigsten Blaettern vor; jedes Format steht mit seiner
// Blattzahl in der Auswahl, damit sichtbar ist, was groesseres Papier spart.
//
// A0 ist bewusst NICHT dabei - der Betrieb druckt bis A1 (Ansage des
// Anwenders). Ein Format, das niemand drucken kann, waere ein Vorschlag, der
// in die Irre fuehrt.
const ABW_PAPIER=[
 {id:"a4",name:"A4",kurz:210,lang:297},
 {id:"a3",name:"A3",kurz:297,lang:420},
 {id:"a2",name:"A2",kurz:420,lang:594},
 {id:"a1",name:"A1",kurz:594,lang:841}
];
// rand        = Druckrand, identisch mit dem @page-Rand der Schablone
// ueberlappung= gemeinsamer Streifen zweier Blaetter zum Kleben
// kopfFuss    = Platz fuer Kopfzeile, Fusszeile und die Abstaende dazwischen
//
// kopfFuss war bis v3.192 mit 12 mm angesetzt und der @page-Rand mit 8 mm,
// obwohl hier mit 10 gerechnet wurde. Gemessen ergab das ein Blatt von
// 280,9 mm auf 281,0 mm Druckflaeche: 0,1 mm Reserve. Sobald der Drucker auf
// Standardrand stand, rutschte der untere Rand auf eine zusaetzliche,
// halbleere Seite. Gebraucht werden gemessen rund 13,5 mm; 24 mm lassen
// genug Luft, auch wenn ein Drucker mehr Rand erzwingt.
const ABW_BLATT={rand:10, ueberlappung:10, kopfFuss:24};

// Beide Lagen jedes Formats. Hochkant zuerst - bei gleicher Blattzahl und
// gleicher Flaeche gewinnt damit die uebliche Lage.
function abwPapierListe(){
 const raus=[];
 ABW_PAPIER.forEach(f=>{
  raus.push({id:f.id+"-hoch",name:f.name+" hoch",breite:f.kurz,hoehe:f.lang});
  raus.push({id:f.id+"-quer",name:f.name+" quer",breite:f.lang,hoehe:f.kurz});
 });
 return raus;
}
// Wie viele Blaetter braucht DIESER Zuschnitt auf DIESEM Format?
function abwPapierBedarf(r,f){
 if(!r||!r.ok||!f)return null;
 const nutzB=f.breite-2*ABW_BLATT.rand-ABW_BLATT.ueberlappung;
 const nutzH=f.hoehe-2*ABW_BLATT.rand-ABW_BLATT.ueberlappung-ABW_BLATT.kopfFuss;
 if(!(nutzB>0&&nutzH>0))return null;
 const alleY=r.kontur.map(p=>p[1]);
 const hoehe=Math.max.apply(null,alleY)-Math.min.apply(null,alleY);
 const spalten=Math.max(1,Math.ceil(r.breite/nutzB));
 const zeilen=Math.max(1,Math.ceil(hoehe/nutzH));
 return {nutzB,nutzH,spalten,zeilen,seiten:spalten*zeilen};
}
// Der Vorschlag: am wenigsten Blaetter. Bei gleich vielen das KLEINERE
// Papier - sonst schlaegt die App A1 vor, wo A4 dasselbe leistet.
function abwPapierVorschlag(r){
 let best=null;
 abwPapierListe().forEach(f=>{
  const b=abwPapierBedarf(r,f);
  if(!b)return;
  const k=Object.assign({},f,b);
  if(!best
     ||b.seiten<best.seiten
     ||(b.seiten===best.seiten&&f.breite*f.hoehe<best.breite*best.hoehe))best=k;
 });
 return best;
}
// Was gerade gilt: die Wahl des Anwenders, sonst der Vorschlag.
function abwPapierGewaehlt(r){
 const el=(typeof $==="function")?$("abw_papier"):document.getElementById("abw_papier");
 const wahl=el?el.value:"";
 if(wahl&&wahl!=="auto"){
  const f=abwPapierListe().find(x=>x.id===wahl);
  const b=f?abwPapierBedarf(r,f):null;
  if(b)return Object.assign({},f,b);
 }
 return abwPapierVorschlag(r);
}

function abwSeiten(r,papier){
 const f=papier||abwPapierGewaehlt(r);
 if(!f)return [];
 const alleY=r.kontur.map(p=>p[1]);
 const yMin=Math.min.apply(null,alleY);
 const seiten=[];
 for(let z=0;z<f.zeilen;z++)for(let sp=0;sp<f.spalten;sp++){
  seiten.push({nr:seiten.length+1, spalte:sp+1, zeile:z+1,
   spalten:f.spalten, zeilen:f.zeilen, papier:f,
   x0:sp*f.nutzB, y0:yMin+z*f.nutzH,
   breite:f.nutzB+ABW_BLATT.ueberlappung, hoehe:f.nutzH+ABW_BLATT.ueberlappung});
 }
 return seiten;
}

// Die Auswahl. Jedes Format zeigt seine Blattzahl - daran sieht der Anwender
// sofort, was das groessere Papier spart, statt es ausprobieren zu muessen.
function abwPapierWahlZeichnen(r){
 const el=(typeof $==="function")?$("abw_papier"):document.getElementById("abw_papier");
 if(!el)return;
 if(!r||!r.ok){ el.innerHTML=`<option value="auto">automatisch</option>`; return }
 const v=abwPapierVorschlag(r);
 const alt=el.value;
 const blatt=n=>n===1?"1 Blatt":(n+" Blatt");
 el.innerHTML=`<option value="auto">automatisch – ${esc(v?v.name:"")} · ${esc(v?blatt(v.seiten):"")}</option>`
  +abwPapierListe().map(f=>{
    const b=abwPapierBedarf(r,f);
    if(!b)return "";
    return `<option value="${esc(f.id)}">${esc(f.name)} · ${esc(blatt(b.seiten))}</option>`;
   }).join("");
 // Die Wahl des Anwenders ueberlebt das Neuzeichnen - sonst springt sie bei
 // jedem Tastendruck im Massfeld auf "automatisch" zurueck.
 if(alt&&el.querySelector(`option[value="${alt}"]`))el.value=alt;
 const hinweis=(typeof $==="function")?$("abwPapierHinweis"):null;
 if(hinweis){
  const g=abwPapierGewaehlt(r);
  const a4=abwPapierBedarf(r,abwPapierListe()[0]);
  hinweis.textContent=g
   ? ("Gedruckt wird auf "+g.name+": "+blatt(g.seiten)
      +(a4&&g.seiten<a4.seiten?" statt "+blatt(a4.seiten)+" auf A4 hoch.":"."))
   : "";
 }
}
// Die Schablone wird SCHWARZ gedruckt - Farbe hilft am Blech nicht, und ein
// Graustufendrucker macht aus Rot und Blau dasselbe Grau. Unterschieden wird
// nur ueber das Strichbild.
function abwSeiteSvg(r,seite){
 const yMaxSeite=seite.y0+seite.hoehe;
 const flip=p=>[p[0]-seite.x0, yMaxSeite-p[1]];
 const linien=abwZeichenTeile(r).map(g=>{
  const a=ABW_LINIENART[g.art];
  return g.linien.map(l=>`<path d="${abwPfad(l.map(flip),!!a.zu)}" fill="none" stroke="#000"`
   +` stroke-width="${a.dick>=0.5?0.3:0.2}"${a.strich?` stroke-dasharray="${a.strich}"`:""}/>`).join("");
 }).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${seite.breite}mm" height="${seite.hoehe}mm"
 viewBox="0 0 ${seite.breite} ${seite.hoehe}">
 <path d="${abwPfad(r.kontur.map(flip),true)}" fill="none" stroke="#000" stroke-width="0.35"/>
 ${linien}
 <path d="M0,0 L8,0 M0,0 L0,8" stroke="#000" stroke-width="0.3"/>
 <path d="M${seite.breite},${seite.hoehe} L${seite.breite-8},${seite.hoehe} M${seite.breite},${seite.hoehe} L${seite.breite},${seite.hoehe-8}" stroke="#000" stroke-width="0.3"/>
</svg>`;
}
function abwDruckHtml(r){
 const f=abwPapierGewaehlt(r);
 const seiten=abwSeiten(r,f);
 const name=(typeof $==="function"&&$("abw_bezeichnung")&&$("abw_bezeichnung").value.trim())||"Abwicklung";
 // Das Blatt muss so gross sein, wie hier gerechnet wurde. Ohne diese Regel
 // druckt der Browser weiter auf A4 (css/03-druck.css) und schneidet eine
 // A2-Schablone ab. Die Masse stehen in mm, nicht als "A4 portrait", damit
 // auch die Querlage eindeutig ist.
 const seitenRegel=f
  ? `<style>@page{size:${abwRund(f.breite)}mm ${abwRund(f.hoehe)}mm;margin:${ABW_BLATT.rand}mm}</style>`
  : "";
 // Der Hinweis auf 100 % steht im KOPF, nicht im Fuss. Im Fuss stand er
 // neben dem 100-mm-Strich und brach dort auf drei Zeilen um - die schoben
 // das Blatt ueber die Druckflaeche hinaus.
 return seitenRegel+seiten.map(s=>`<div class="abw-blatt">
  <div class="abw-blatt-kopf">${esc(name)} · Blatt ${s.nr} von ${seiten.length}
   (Spalte ${s.spalte}/${s.spalten}, Zeile ${s.zeile}/${s.zeilen}) · ${esc(f?f.name:"")}
   · Druck <b>100 %</b>, nicht „an Seite anpassen“</div>
  <div class="abw-blatt-bild">${abwSeiteSvg(r,s)}</div>
  <div class="abw-blatt-fuss">
   <span class="abw-kontrollmass"></span>
   <span>Kontrollmass 100 mm – nachmessen</span>
  </div>
 </div>`).join("");
}
function abwDrucken(){
 const r=abwLetztes||abwAktualisieren();
 if(!r||!r.ok)return false;
 const box=(typeof $==="function")?$("abwDruck"):document.getElementById("abwDruck");
 if(!box)return false;
 box.innerHTML=abwDruckHtml(r);
 box.hidden=false;
 document.body.classList.add("abw-drucken");
 // Nach dem Druckdialog wieder aufraeumen - der Druckbereich darf nicht am
 // Bildschirm stehenbleiben.
 const weg=()=>{ box.hidden=true; box.innerHTML=""; document.body.classList.remove("abw-drucken");
                 window.removeEventListener("afterprint",weg) };
 window.addEventListener("afterprint",weg);
 if(typeof window.print==="function")window.print();
 return true;
}

// ---- Speichern ------------------------------------------------------------
function abwProjektWahl(){
 const sel=(typeof $==="function")?$("abw_projekt"):document.getElementById("abw_projekt");
 if(!sel)return;
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 const alt=sel.value;
 sel.innerHTML=`<option value="">– ohne Projekt –</option>`
  +liste.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.title||("Projekt "+p.id))}</option>`).join("");
 if(alt)sel.value=alt;
}

async function abwSpeichern(){
 const r=abwAktualisieren();
 if(!r.ok)return {ok:false,meldung:"Die Masse stimmen noch nicht – es wird nichts gespeichert."};
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const bez=(typeof $==="function"&&$("abw_bezeichnung"))?$("abw_bezeichnung").value.trim():"";
 const projSel=(typeof $==="function")?$("abw_projekt"):null;
 const projId=(projSel&&projSel.value)?Number(projSel.value):null;
 const satz={
  bezeichnung:bez||"Abwicklung",
  project_id:projId,
  // v3.192: Ohne das Bauteil laesst sich ein gespeicherter Datensatz nicht
  // mehr rechnen - dieselben Zahlen bedeuten bei Rohr und Tablett etwas
  // anderes. Die Spalte hat 'rohr' als Vorgabe; bis v3.191 gab es nur das.
  bauteil:r.bauteil||"rohr",
  // v3.191: Kommt die Abwicklung aus einer Massaufnahme, gehoert sie zu
  // GENAU dieser - sonst weiss spaeter niemand mehr, zu welchem Rohr der
  // Zuschnitt war.
  measurement_id:abwHerkunft?abwHerkunft.measurementId:null,
  parameter:r.eingaben,
  // Nur die Kennzahlen, nicht die 360 Stuetzpunkte: die Kontur laesst sich
  // aus den Parametern jederzeit wieder rechnen, und eine Kopie davon waere
  // eine zweite Wahrheit.
  ergebnis:(r.bauteil==="tablett")
   ?{breite:r.breite,laenge:r.laenge,mitteY:r.mitteY,
     lochQuer:r.lochQuer,lochLang:r.lochLang}
   :{breite:r.breite,umfang:r.L,hoeheMax:r.hoeheMax,hoeheMin:r.hoeheMin,
     zugMin:r.zugMin,zugMax:r.zugMax,
     betaMinGrad:r.betaMinGrad,betaMaxGrad:r.betaMaxGrad,
     bFertigMin:r.bFertigMin,bFertigMax:r.bFertigMax,
     streckung:r.streckung},
  erstellt_von:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
 };
 const {data,error}=await sb.from("abwicklungen").insert(satz).select("*");
 if(error)return {ok:false,meldung:error.message};
 // Ein von RLS geblockter Schreibvorgang meldet keinen Fehler, er betrifft
 // still 0 Zeilen (CLAUDE.md 24.1).
 if(!data||!data.length)return {ok:false,meldung:"Nicht gespeichert – fehlt die nötige Berechtigung?"};
 abwGespeichert.unshift(data[0]);
 abwListeZeichnen();
 return {ok:true};
}

async function abwListeLaden(){
 if(typeof sb==="undefined")return;
 const {data,error}=await sb.from("abwicklungen")
  .select("id,bezeichnung,bauteil,project_id,measurement_id,parameter,ergebnis,created_at")
  .order("created_at",{ascending:false}).limit(100);
 abwGespeichert=(!error&&Array.isArray(data))?data:[];
 abwListeZeichnen();
}
async function abwLoeschen(id){
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const {data,error}=await sb.from("abwicklungen").delete().eq("id",id).select("id");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nichts gelöscht – fehlt die nötige Berechtigung?"};
 abwGespeichert=abwGespeichert.filter(x=>String(x.id)!==String(id));
 abwListeZeichnen();
 return {ok:true};
}

function abwProjektName(id){
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 const p=liste.find(x=>String(x.id)===String(id));
 return p?(p.name||p.title||("Projekt "+p.id)):"";
}
function abwListeZeichnen(){
 const box=(typeof $==="function")?$("abwListe"):document.getElementById("abwListe");
 if(!box)return;
 if(!abwGespeichert.length){ box.innerHTML=`<p class="small">Noch nichts gespeichert.</p>`; return }
 box.innerHTML=abwGespeichert.map(a=>{
  const proj=abwProjektName(a.project_id);
  const e=a.ergebnis||{};
  // Ein Datensatz bis v3.191 hat keine Spalte "bauteil" - er ist ein Rohr.
  const teil=(abwBauteilAusDaten(a.bauteil)==="tablett")?"Tablett":"Rohr";
  const mass=(abwBauteilAusDaten(a.bauteil)==="tablett"&&e.breite&&e.laenge)
   ? abwMm(e.breite)+" × "+abwMm(e.laenge)
   : (e.breite?abwMm(e.breite):"–");
  return `<div class="abw-zeile">
   <div class="abw-zeile-text"><b>${esc(a.bezeichnung||"Abwicklung")}</b>
    <div class="small">${esc(teil)} · ${proj?esc(proj)+" · ":""}${mass}</div></div>
   <button type="button" class="kon-klein kon-k-blau" data-abw-laden="${esc(a.id)}">laden</button>
   <button type="button" class="kon-klein kon-k-grau" data-abw-doppeln="${esc(a.id)}">duplizieren</button>
   <button type="button" class="kon-klein kon-k-grau" data-abw-weg="${esc(a.id)}">löschen</button>
  </div>`;
 }).join("");
}

// Laden: die Parameter in die Felder, dann NEU rechnen. Weichen die frisch
// gerechneten Kennzahlen von den gespeicherten ab, steht das ausdruecklich
// da - stillschweigend andere Zahlen waeren das Schlimmste.
function abwLaden(id,alsKopie){
 const a=abwGespeichert.find(x=>String(x.id)===String(id));
 if(!a)return false;
 // Zuerst das Bauteil, dann die Masse - sonst landen sie im falschen Formular.
 const teil=abwBauteilAusDaten(a.bauteil);
 abwBauteilSetzen(teil);
 if(teil==="tablett")abwTablettFelderSetzen(a.parameter||{});
 else abwFelderSetzen(a.parameter||{});
 if(typeof $==="function"&&$("abw_bezeichnung"))
  $("abw_bezeichnung").value=(a.bezeichnung||"")+(alsKopie?" (Kopie)":"");
 if(typeof $==="function"&&$("abw_projekt"))$("abw_projekt").value=a.project_id?String(a.project_id):"";
 abwGeladenVon=alsKopie?null:a.id;
 abwHerkunft=a.measurement_id
  ? {measurementId:a.measurement_id,text:"gespeicherte Massaufnahme",uebernommen:[],fehlt:[]}
  : null;
 abwHerkunftZeichnen();
 const r=abwAktualisieren();
 const e=a.ergebnis||{};
 const abweichung=[];
 if(r.ok&&e.breite&&Math.abs(e.breite-r.breite)>0.05)
  abweichung.push("Zuschnittbreite "+abwMm(e.breite)+" → "+abwMm(r.breite));
 // v3.190: auch die Hoehe. Sie hat sich mit der konstanten Zugabe geaendert -
 // ein vorher gespeicherter Plan traegt noch die alte, und das darf nicht
 // stillschweigend durchgehen.
 if(r.ok&&e.hoeheMax&&Math.abs(e.hoeheMax-r.hoeheMax)>0.05)
  abweichung.push("Höhe an der Naht "+abwMm(e.hoeheMax)+" → "+abwMm(r.hoeheMax));
 if(r.ok&&e.laenge&&Math.abs(e.laenge-r.laenge)>0.05)
  abweichung.push("Zuschnittlänge "+abwMm(e.laenge)+" → "+abwMm(r.laenge));
 if(r.ok&&e.lochLang&&Math.abs(e.lochLang-r.lochLang)>0.05)
  abweichung.push("Loch in Gefällerichtung "+abwMm(e.lochLang)+" → "+abwMm(r.lochLang));
 if(abweichung.length){
  const m=(typeof $==="function")?$("abwMeldung"):document.getElementById("abwMeldung");
  if(m)m.innerHTML+=`<div class="abw-warnung">Gespeichert war etwas anderes: ${esc(abweichung.join(" · "))}. Seit v3.190 ist die Zugabe über den ganzen Zuschnitt gleich. Bitte prüfen, bevor danach geschnitten wird.</div>`;
 }
 return true;
}

// ---- Einstieg aus einer Massaufnahme (v3.191) -----------------------------
// Setzt NUR die Felder, zu denen es dort wirklich eine Zahl gibt. Alles
// andere bleibt stehen, wie es war - es wird nichts geleert und nichts
// erfunden.
async function abwAusMassaufnahme(v){
 if(!v||typeof $!=="function")return false;
 await abwOeffnen();
 // v3.192: erst das Bauteil umschalten, dann die Felder fuellen.
 const teil=abwBauteilAusDaten(v.bauteil);
 abwBauteilSetzen(teil);
 const w=v.werte||{};
 Object.keys(w).forEach(k=>{
  const el=(teil==="tablett")?abwTablettEl(k):abwEl(k);
  if(el&&w[k]!==undefined&&w[k]!==null&&w[k]!=="")el.value=String(w[k]);
 });
 if($("abw_bezeichnung")&&v.bezeichnung)$("abw_bezeichnung").value=v.bezeichnung;
 if($("abw_projekt")&&v.projectId)$("abw_projekt").value=String(v.projectId);
 abwHerkunft={measurementId:v.measurementId||null,
              text:v.herkunft||"",
              uebernommen:Array.isArray(v.uebernommen)?v.uebernommen:[],
              fehlt:Array.isArray(v.fehlt)?v.fehlt:[]};
 abwHerkunftZeichnen();
 abwAktualisieren();
 return true;
}

// ---- Die Gegenrichtung: aus dem Rechner in eine Massaufnahme greifen ------
// (v3.192, ausdruecklicher Wunsch: "man soll aber auch in der abwicklung
// eine massaufnahme laden können")
//
// Geladen werden ausschliesslich Massaufnahmen der Art "einfassung_rund" -
// die einzige Art, aus der sich heute Masse ableiten lassen. Abgeleitet wird
// mit DERSELBEN Funktion wie am Knopf in der Aufnahme (einfaAbwVorgabe,
// js/38); eine zweite Ableitung waere eine zweite Wahrheit.
async function abwAufnahmenLaden(){
 if(typeof sb==="undefined")return [];
 const {data,error}=await sb.from("measurements")
  .select("id,title,date,project_id,staerke_mm,data")
  .eq("type","einfassung_rund").order("date",{ascending:false}).limit(50);
 abwAufnahmen=(!error&&Array.isArray(data))?data:[];
 return abwAufnahmen;
}
// Die Einfassungen EINER Massaufnahme - inklusive der flachen Felder eines
// Datensatzes bis v2.95, den es ohne "einfassungen"-Liste gibt.
function abwAufnahmeEinfassungen(m){
 const d=(m&&m.data)||{};
 if(Array.isArray(d.einfassungen)&&d.einfassungen.length)return d.einfassungen;
 if(d.durchmesser||d.a)return [{bez:"",durchmesser:d.durchmesser,winkel:d.winkel,
                                a:d.a,b:d.b,c:d.c,anzahl:1}];
 return [];
}
function abwAufnahmenZeichnen(){
 const box=(typeof $==="function")?$("abwAufnahmen"):document.getElementById("abwAufnahmen");
 if(!box)return;
 if(abwAufnahmen===null){ box.innerHTML=""; return }
 if(!abwAufnahmen.length){
  box.innerHTML=`<p class="small">Keine gespeicherte Massaufnahme „Einfassung rund“ gefunden. Nur aus dieser Art lassen sich heute Masse übernehmen.</p>`;
  return;
 }
 const teil=abwBauteil();
 box.innerHTML=abwAufnahmen.map(m=>{
  const liste=abwAufnahmeEinfassungen(m);
  if(!liste.length)return "";
  const proj=abwProjektName(m.project_id);
  return `<div class="abw-zeile">
   <div class="abw-zeile-text"><b>${esc(m.title||("Massaufnahme "+m.id))}</b>
    <div class="small">${proj?esc(proj)+" · ":""}${esc(m.date||"")}</div>
    <div class="bar" style="margin-top:4px">${liste.map((e,i)=>{
     const n=(e&&e.bez||"").trim()||("Einfassung "+(i+1));
     const oe=Number(e&&e.durchmesser)>0?(" Ø"+Math.round(Number(e.durchmesser))):"";
     return `<button type="button" class="kon-klein kon-k-blau"
       data-abw-aus-aufnahme="${esc(m.id)}" data-abw-nr="${i}">${esc(n+oe)}</button>`;
    }).join("")}</div></div>
  </div>`;
 }).join("")
 +`<p class="small" style="color:var(--muted)">Übernommen wird in das oben gewählte Bauteil (${teil==="tablett"?"Tablett":"Rohr"}).</p>`;
}
// Holt die Masse EINER Einfassung aus einer GESPEICHERTEN Aufnahme. Die
// Materialstaerke kommt aus dem Datensatz selbst (measurements.staerke_mm),
// nicht aus einem zufaellig offenen Formular.
async function abwAusAufnahme(id,nr){
 if(typeof einfaAbwVorgabe!=="function")return false;
 const m=(abwAufnahmen||[]).find(x=>String(x.id)===String(id));
 if(!m)return false;
 const e=abwAufnahmeEinfassungen(m)[Number(nr)||0];
 if(!e)return false;
 const v=einfaAbwVorgabe(e,abwBauteil(),{
  nr:(Number(nr)||0)+1, staerke:m.staerke_mm,
  projectId:m.project_id||null, measurementId:m.id
 });
 if(!v)return false;
 v.herkunft=(m.title?m.title+" · ":"")+v.herkunft;
 return await abwAusMassaufnahme(v);
}

// ---- Oeffnen und Schliessen ----------------------------------------------
async function abwOeffnen(){
 if(typeof $!=="function")return;
 const modal=$("abwicklungModal");
 if(!modal)return;
 if(!abwEl("D")||!abwEl("D").value)abwFelderSetzen(ABW_STANDARD);
 // v3.192: Die Vorgaben des Tabletts kommen aus der Einfassung rund (js/21).
 if(!abwEl("tab_D")||!abwEl("tab_D").value)abwTablettFelderSetzen(null);
 abwBauteilZeigen();
 abwProjektWahl();
 modal.hidden=false;
 abwHerkunftZeichnen();
 abwAktualisieren();
 try{ await abwListeLaden() }catch(e){}
}

// ---- Ereignisse -----------------------------------------------------------
document.addEventListener("input",e=>{
 if(!e.target||!e.target.id||e.target.id.indexOf("abw_")!==0)return;
 // Diese drei aendern die Rechnung nicht - das Papierformat betrifft nur die
 // Schablone und wird im change-Zweig behandelt.
 if(e.target.id==="abw_bezeichnung"||e.target.id==="abw_projekt"
    ||e.target.id==="abw_papier")return;
 abwAktualisieren();
});
document.addEventListener("change",e=>{
 if(!e.target)return;
 if(e.target.id==="abw_nahtLang"){ abwAktualisieren(); return }
 // Das Bauteil wechselt zwei Formulare, nicht nur eine Zahl.
 if(e.target.id==="abw_papier"){ abwPapierWahlZeichnen(abwLetztes); return }
 if(e.target.id==="abw_bauteil"){
  abwBauteilZeigen();
  // Die Herkunft galt fuer das andere Bauteil - sie stehen zu lassen waere
  // eine Behauptung ueber Zahlen, die dort niemand uebernommen hat.
  abwHerkunft=null; abwHerkunftZeichnen();
  abwAufnahmenZeichnen();
  abwAktualisieren();
 }
});

document.addEventListener("click",async e=>{
 if(e.target.closest("[data-abw-oeffnen]")){ await abwOeffnen(); return }
 const zu=e.target.closest("#closeAbwicklung");
 if(zu){ const m=$("abwicklungModal"); if(m)m.hidden=true; return }
 if(e.target.closest("#abwZuruecksetzen")){
  if(abwBauteil()==="tablett")abwTablettFelderSetzen(null);
  else abwFelderSetzen(ABW_STANDARD);
  // Mit den Standardmassen stimmt die Herkunft nicht mehr - sie stehen zu
  // lassen waere eine Behauptung ueber Zahlen, die niemand uebernommen hat.
  abwHerkunft=null; abwHerkunftZeichnen();
  abwAktualisieren(); return;
 }
 // v3.192: die Liste der Massaufnahmen auf- und wieder zuklappen.
 if(e.target.closest("#abwAusAufnahme")){
  if(abwAufnahmen!==null){ abwAufnahmen=null; abwAufnahmenZeichnen(); return }
  const box=$("abwAufnahmen");
  if(box)box.innerHTML=`<p class="small">Wird geladen …</p>`;
  try{ await abwAufnahmenLaden() }catch(x){ abwAufnahmen=[] }
  abwAufnahmenZeichnen();
  return;
 }
 const ausAufn=e.target.closest("[data-abw-aus-aufnahme]");
 if(ausAufn){
  await abwAusAufnahme(ausAufn.getAttribute("data-abw-aus-aufnahme"),
                       ausAufn.getAttribute("data-abw-nr"));
  // Die Auswahl hat ihren Zweck erfuellt - sie bleibt nicht offen stehen.
  abwAufnahmen=null; abwAufnahmenZeichnen();
  return;
 }
 if(e.target.closest("[data-abw-herkunft-weg]")){ abwHerkunft=null; abwHerkunftZeichnen(); return }
 if(e.target.closest("#abwDxf")){
  const r=abwLetztes||abwAktualisieren();
  if(r&&r.ok)abwHerunterladen(abwDxfText(r),abwDateiname("dxf"),"application/dxf");
  return;
 }
 if(e.target.closest("#abwSvg")){
  const r=abwLetztes||abwAktualisieren();
  if(r&&r.ok)abwHerunterladen(abwSvg(r,{mm:true}),abwDateiname("svg"),"image/svg+xml");
  return;
 }
 if(e.target.closest("#abwDrucken")){ abwDrucken(); return }
 if(e.target.closest("#abwSpeichern")){
  const r=await abwSpeichern();
  const m=$("abwMeldung");
  if(m&&!r.ok)m.innerHTML=`<div class="abw-fehler">⚠️ ${esc(r.meldung)}</div>`;
  else if(m)m.innerHTML=`<div class="abw-ok">Gespeichert.</div>`;
  return;
 }
 const laden=e.target.closest("[data-abw-laden]");
 if(laden){ abwLaden(laden.getAttribute("data-abw-laden"),false); return }
 const doppeln=e.target.closest("[data-abw-doppeln]");
 if(doppeln){ abwLaden(doppeln.getAttribute("data-abw-doppeln"),true); return }
 const weg=e.target.closest("[data-abw-weg]");
 if(weg){
  const a=abwGespeichert.find(x=>String(x.id)===String(weg.getAttribute("data-abw-weg")));
  if(a&&typeof confirm==="function"&&!confirm(`„${a.bezeichnung||"Abwicklung"}“ wirklich löschen?`))return;
  const r=await abwLoeschen(weg.getAttribute("data-abw-weg"));
  if(!r.ok&&typeof alert==="function")alert(r.meldung);
  return;
 }
});
