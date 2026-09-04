"use strict";
// ===========================================================================
// EINLAUFBLECH KONISCH · Aufnahme (Geometrie, Stücke, Ausmass, Rollenblech)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung.
//
// Wichtig für das Verständnis: js/13-einlaufblech-konisch.js enthält NICHT
// den Rechenkern des konischen Blechs, sondern die gemeinsamen Bausteine
// (teileLaengeInStuecke, splitLengthIntoPieces, generateEbkGrundriss,
// baueEinlaufblechStueckeAusRinne). Der Rechenkern liegt in
// js/14-freies-profil.js: calcEbkPiece(), ebkRestbreite(), ebkEngeSeite(),
// renderEbkDiagram(), renderEbkPiecesTable(), refreshEbkRinneList().
// Beide Dateien bleiben UNVERÄNDERT und rechnen weiterhin alles Fachliche.
//
// Die Brücke sind die eigenen Variablen und Felder des bestehenden Moduls:
// ebkaBruecke() setzt ebkPieces und die alten Formularfelder aus dem
// erfassten Stand. Danach liefern ebkEngeSeite(), calcEbkPiece() und
// ebkRestbreite() direkt die richtigen Werte - sie werden hier NICHT
// nachgebaut. Die alten, unsichtbaren Formularelemente in #ebkStummel
// bleiben stehen, damit js/14 unverändert laden kann.
//
// Neu gegenüber dem bestehenden Modul (aus dem Prototyp übernommen):
//   - Sechs Register statt eines langen Formulars
//   - Weg "Gesamtlänge eintragen -> Stücke berechnen" (die Funktion war
//     vorhanden, im konischen Formular aber nicht erreichbar)
//   - Skizze je Stück: wo Mass links und rechts gemessen werden
//   - Konizität je Stück (rechts − links), reine Anzeige
//   - Blechfläche in m², Ausmass und Materialübersicht ohne zweite Eingabe
//   - Zuschnitt aus Rollenblech (dieselbe Rechnung wie beim geraden Blech)
// ===========================================================================

// Die Register heissen und stehen in ALLEN Massaufnahme-Arten gleich:
// die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und zuletzt die
// Kontrolle.
const EBKA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Geometrie"},{nr:3,kurz:"Stücke"},
 {nr:4,kurz:"Zuschnitt"},{nr:5,kurz:"Ausmass"},{nr:6,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt deshalb an
// der Registerzahl, nicht an einer festen Nummer.
const EBKA_KONTROLLE=EBKA_REGISTER.length;
let ebkaSchritt=1;

const ebkaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const ebkaMm=v=>Math.round(ebkaZahl(v)).toLocaleString("de-CH");
const ebkaMeter=v=>(ebkaZahl(v)/1000).toFixed(2).replace(".",",");

function ebkaLeer(){
 return {material:"", abwicklung:250, montage:"links",
         dachneigung:"", gesamtlaenge:"", stuecke:[]};
}
let ebkA=ebkaLeer();

// ---- Brücke zum bestehenden Modul -----------------------------------------
// ebkPieces ist danach dasselbe Array wie ebkA.stuecke: es gibt nur eine
// Wahrheit, und der Speicher-Code in js/16 liefert weiterhin genau dieselben
// Felder wie bisher.
function ebkaBruecke(){
 const a=ebkA;
 // Eine Wahrheit: ebkPieces IST das Stück-Array des Modells. Wer es von
 // aussen ersetzt (js/14 bei der Rinnen-Übernahme), holt es dort ab, wo es
 // passiert - siehe den Klick-Handler weiter unten.
 ebkPieces=a.stuecke;
 const setz=(id,wert)=>{const f=$(id); if(f)f.value=String(wert)};
 setz("ebk_dachneigung",a.dachneigung===""?"":a.dachneigung);
 setz("ebk_abwicklung",a.abwicklung||250);
 setz("ebk_montage",a.montage||"links");
 setz("ebk_material",a.material||"");
}
// Ab hier gelten die Regeln des bestehenden Moduls, unverändert aufgerufen.
function ebkaEngeSeite(){ebkaBruecke();return ebkEngeSeite()}
// Mass auf der engen Seite, roh und nach calcEbkPiece() (Mass − 2 mm).
function ebkaMassEngerSeite(p){
 return ebkaZahl(ebkaEngeSeite()==="links"?(p&&p.massLinks):(p&&p.massRechts));
}
function ebkaEngesMass(p){
 const c=calcEbkPiece(p||{});
 return ebkaEngeSeite()==="links"?c.massLinksEng:c.massRechtsEng;
}
function ebkaRestbreite(p){return ebkRestbreite(ebkaMassEngerSeite(p),ebkA.abwicklung)}
function ebkaKonizitaet(p){return ebkaZahl(p&&p.massRechts)-ebkaZahl(p&&p.massLinks)}
function ebkaGesamtlaenge(){return (ebkA.stuecke||[]).reduce((s,p)=>s+ebkaZahl(p.laenge),0)}
// Repräsentatives Mass für die Schnittzeichnung - genau wie renderEbkDiagram()
// in js/14: Mittelwert aller Masse auf der ENGEN Seite.
function ebkaRepMass(){
 const w=(ebkA.stuecke||[]).map(p=>ebkaMassEngerSeite(p)).filter(v=>v>0);
 return w.length?w.reduce((x,y)=>x+y,0)/w.length:null;
}
function ebkaRepRestbreite(){
 const r=ebkaRepMass();
 return r===null?null:ebkRestbreite(r,ebkA.abwicklung);
}
function ebkaFlaecheM2(){return ebkaGesamtlaenge()*ebkaZahl(ebkA.abwicklung)/1e6}

// ---- Zuschnitt aus Rollenblech --------------------------------------------
// Dieselbe Rechnung wie beim geraden Blech. Sie gilt fachlich auch hier: der
// Zuschnitt ist ein Rechteck der Abwicklungsbreite mal Zuschnittlänge - die
// Konizität entsteht erst beim Anreissen INNERHALB dieses Rechtecks und
// ändert die benötigte Blechfläche nicht.
// Gepackt wird mit ebaPackeInStreifen() aus js/29 - es gibt bewusst nur EINE
// Packrechnung in der App, keine zweite daneben.
function ebkaTafelLaenge(){
 const l=(ebkA.stuecke||[]).map(p=>ebkaZahl(p.laenge)).filter(x=>x>0);
 return l.length?Math.max.apply(null,l):0;
}
function ebkaRollenPlan(){
 const A=ebkaZahl(ebkA.abwicklung);
 const bleche=(ebkA.stuecke||[]).map((p,i)=>({nr:i+1,laenge:ebkaZahl(p.laenge)}))
  .filter(x=>x.laenge>0);
 const L=ebkaTafelLaenge();
 const breiten=(typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[];
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,tafelLaenge:L};
 const verteilung=ebaPackeInStreifen(bleche,L);
 const moeglich=[], zuSchmal=[];
 const netto=ebkaFlaecheM2();
 breiten.forEach(B=>{
  const jeTafel=Math.floor(B/A);
  if(jeTafel<1){zuSchmal.push(B);return}
  const streifen=verteilung.streifen||[];
  const tafeln=Math.ceil(streifen.length/jeTafel);
  const flaeche=tafeln*B*L/1e6;
  moeglich.push({breite:B,jeTafel,tafeln,streifen:streifen.length,
   ungenutzteStreifen:tafeln*jeTafel-streifen.length,
   restBreite:B-jeTafel*A,
   flaeche, verschnitt:flaeche-netto,
   anteil:flaeche>0?(flaeche-netto)/flaeche*100:0});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.tafeln-y.tafeln||y.breite-x.breite);
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,tafelLaenge:L,verteilung,netto};
}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function ebkaAusmassZeilen(){
 const a=ebkA, z=[], L=ebkaGesamtlaenge();
 let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(L>0)zeile("Einlaufblech konisch, Abwicklung "+ebkaMm(a.abwicklung)+" mm",ebkaMeter(L),"m","Summe der Zuschnittlängen");
 if((a.stuecke||[]).length)zeile("Stücke (Zuschnitte)",a.stuecke.length,"Stk.","Stückliste");
 const gehrungen=(a.stuecke||[]).reduce((s,p)=>s+(p.gehrungLinks?1:0)+(p.gehrungRechts?1:0),0);
 if(gehrungen)zeile("Gehrungen",gehrungen,"Stk.","Stückliste");
 const stoss=Math.max(0,(a.stuecke||[]).length-1);
 if(stoss)zeile("Blechstösse",stoss,"Stk.","je Übergang zwischen zwei Stücken");
 if(L>0)zeile("Blechfläche",ebkaFlaecheM2().toFixed(2).replace(".",","),"m²","Gesamtlänge × Abwicklung");
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 if(letzte&&ebkaZahl(letzte.endzugabeStart))zeile("Endzugabe erstes Stück",ebkaMm(letzte.endzugabeStart),"mm","Einstellung Endzugabe");
 if(letzte&&ebkaZahl(letzte.endzugabeEnd))zeile("Endzugabe letztes Stück",ebkaMm(letzte.endzugabeEnd),"mm","Einstellung Endzugabe");
 return z;
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen. Es
// werden keine fachlichen Grenzwerte erfunden.
function ebkaPruefungen(){
 const a=ebkA, m=[], s=einlaufblechKonischSettings;
 const uO=ebkaZahl(s.umschlag_oben), uU=ebkaZahl(s.umschlag_unten);
 if(a.dachneigung===""||a.dachneigung===null||a.dachneigung===undefined)
  m.push({art:"fehler",text:"Dachneigung / Winkel fehlt – Pflichtfeld beim Speichern."});
 else if(ebkaZahl(a.dachneigung)<=0||ebkaZahl(a.dachneigung)>=180)
  m.push({art:"fehler",text:"Winkel "+ebkaZahl(a.dachneigung)+"° lässt sich nicht zeichnen: die Schnittzeichnung rechnet mit 180° − Winkel, also nur zwischen 0° und 180°."});
 if(!(a.stuecke||[]).length)
  m.push({art:"fehler",text:"Noch kein Stück erfasst – mindestens eines mit einer Länge ist zum Speichern nötig."});
 else{
  if(!a.stuecke.some(p=>ebkaZahl(p.laenge)>0))
   m.push({art:"fehler",text:"Kein Stück hat eine Länge grösser als 0 mm."});
  const grenze=ebkaZahl(s.stoss_laenge)+ebkaZahl(s.ueberlappung);
  a.stuecke.forEach((p,i)=>{
   const nr=i+1;
   if(ebkaZahl(p.laenge)<0)m.push({art:"fehler",text:"Stück "+nr+" hat eine negative Länge."});
   // Das bestehende Modul bricht das Speichern ab, wenn ein Mass fehlt.
   if(!ebkaZahl(p.massLinks))m.push({art:"fehler",text:"Stück "+nr+": Mass links fehlt (Pflichtfeld beim Speichern)."});
   else if(ebkaZahl(p.massLinks)<0)m.push({art:"fehler",text:"Stück "+nr+": Mass links ist negativ."});
   if(!ebkaZahl(p.massRechts))m.push({art:"fehler",text:"Stück "+nr+": Mass rechts fehlt (Pflichtfeld beim Speichern)."});
   else if(ebkaZahl(p.massRechts)<0)m.push({art:"fehler",text:"Stück "+nr+": Mass rechts ist negativ."});
   const rb=ebkaRestbreite(p);
   if(ebkaMassEngerSeite(p)>0&&rb<0)
    m.push({art:"fehler",text:"Stück "+nr+": Restbreite "+ebkaMm(rb)+" mm – das Mass auf der engen Seite und die Umschläge sind zusammen grösser als die Abwicklung ("+ebkaMm(a.abwicklung)+" mm)."});
   else if(ebkaMassEngerSeite(p)>0&&rb===0)
    m.push({art:"warnung",text:"Stück "+nr+": Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig."});
   if(i<a.stuecke.length-1&&ebkaZahl(p.laenge)>grenze)
    m.push({art:"warnung",text:"Stück "+nr+" ist "+ebkaMm(p.laenge)+" mm lang. Ausser dem Reststück darf keines länger sein als Länge Stoss/Stoss + Überlappung ("+ebkaMm(grenze)+" mm)."});
   // Widerspruch in der Verkettung: das rechte Mass eines Stücks ist das
   // linke des nächsten - so legt es das bestehende Modul an.
   const n=a.stuecke[i+1];
   if(n&&ebkaZahl(p.massRechts)>0&&ebkaZahl(n.massLinks)>0&&ebkaZahl(p.massRechts)!==ebkaZahl(n.massLinks))
    m.push({art:"warnung",text:"Stück "+nr+" rechts ("+ebkaMm(p.massRechts)+" mm) und Stück "+(nr+1)+" links ("+ebkaMm(n.massLinks)+" mm) sind verschieden – an derselben Stossstelle."});
  });
 }
 if(uO<=0||uU<=0)m.push({art:"warnung",text:"Umschlag oben oder unten ist 0 mm. Die Schnittzeichnung zeigt dafür nur einen Platzhalter."});
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt – die Materialübersicht bleibt unvollständig."});
 return m;
}

// ---- Zeichnungen -----------------------------------------------------------
// Schnittzeichnung unverändert aus js/11, Grundriss unverändert aus js/13.
function ebkaZeichnungen(){
 const sch=$("ebka_schnitt");
 if(sch)sch.innerHTML=einlaufblechDiagramSvg(ebkA.dachneigung,ebkaRepMass(),ebkaRepRestbreite(),
   einlaufblechKonischSettings.umschlag_oben,einlaufblechKonischSettings.umschlag_unten);
 const gr=$("ebka_grundriss");
 if(gr)gr.innerHTML=generateEbkGrundriss(ebkA.stuecke||[]);
}
// Konus-Skizze: zeigt in der Draufsicht, WO Mass links und Mass rechts
// gemessen werden und wie das Blech dazwischen verläuft. Reine Darstellung
// der erfassten Werte - es wird nichts gerechnet.
function ebkaKonusSvg(i){
 const p=(ebkA.stuecke||[])[i];
 if(!p)return "";
 const L=ebkaZahl(p.laenge), ml=ebkaZahl(p.massLinks), mr=ebkaZahl(p.massRechts);
 if(L<=0||(ml<=0&&mr<=0))return '<div class="small" style="color:var(--muted)">Länge und Masse fehlen.</div>';
 const B=300, H=120, padX=46, padY=26;
 const maxM=Math.max(ml,mr,1);
 const hoehe=m=>Math.max(6,(H-2*padY)*(ebkaZahl(m)/maxM));
 const x1=padX, x2=B-padX, yBasis=H-padY;
 const y1=yBasis-hoehe(ml), y2=yBasis-hoehe(mr);
 const eng=ebkaEngeSeite();
 const fL=eng==="links"?"#b42318":"#1769aa", fR=eng==="rechts"?"#b42318":"#1769aa";
 return `<svg viewBox="0 0 ${B} ${H}" style="width:100%;max-width:320px;display:block;margin:4px auto" xmlns="http://www.w3.org/2000/svg">
<polygon points="${x1},${yBasis} ${x2},${yBasis} ${x2},${y2.toFixed(1)} ${x1},${y1.toFixed(1)}" fill="#eef3f6" stroke="#17202a" stroke-width="2"/>
<line x1="${x1}" y1="${yBasis}" x2="${x1}" y2="${y1.toFixed(1)}" stroke="${fL}" stroke-width="3"/>
<line x1="${x2}" y1="${yBasis}" x2="${x2}" y2="${y2.toFixed(1)}" stroke="${fR}" stroke-width="3"/>
<text x="${x1-6}" y="${((yBasis+y1)/2).toFixed(1)}" font-size="11" fill="${fL}" font-family="Arial,Helvetica,sans-serif" text-anchor="end" font-weight="700">${ebkaMm(ml)}</text>
<text x="${x2+6}" y="${((yBasis+y2)/2).toFixed(1)}" font-size="11" fill="${fR}" font-family="Arial,Helvetica,sans-serif" font-weight="700">${ebkaMm(mr)}</text>
<text x="${x1}" y="${H-6}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif">links</text>
<text x="${x2}" y="${H-6}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif" text-anchor="end">rechts</text>
<text x="${(B/2).toFixed(0)}" y="${(yBasis+13).toFixed(0)}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">Länge ${ebkaMm(L)} mm</text>
<text x="${(B/2).toFixed(0)}" y="14" font-size="10" fill="#b42318" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">rot = enge Seite (${esc(eng)})</text>
</svg>`;
}

// ---- Oberfläche ------------------------------------------------------------
// Wiederverwendet die Register-/Karten-Stile der Rinnen-Aufnahme (ra-*): sie
// sind generisch und bereits auf Tablet und Handy erprobt.
function ebkaFeld(label,inhalt,voll){
 return `<div${voll?' class="wide"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function ebkaKarte(titel,inhalt){
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}</h2>${inhalt}</div>`;
}

function ebkaGrunddatenHtml(){
 const a=ebkA;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const abwOpt=[200,250,330].map(w=>
  `<option value="${w}"${Number(a.abwicklung)===w?" selected":""}>${w} mm</option>`).join("");
 const monOpt=[["links","von links"],["rechts","von rechts"]].map(([w,t])=>
  `<option value="${w}"${a.montage===w?" selected":""}>${esc(t)}</option>`).join("");
 return `<div class="grid">
${ebkaFeld("Material",`<select id="ebka_material">${matOpt}</select>`)}
${ebkaFeld("Abwicklung",`<select id="ebka_abwicklung">${abwOpt}</select>`)}
${ebkaFeld("Montage",`<select id="ebka_montage">${monOpt}</select>`)}
${ebkaFeld("Enge Seite",`<div class="ra-wert" id="ebka_wSeite">${esc(ebkaEngeSeite())}</div>`)}
</div>
<div class="info">Mass links und rechts sind je Stück frei wählbar – daraus entsteht der konische
Verlauf. Länge Stoss/Stoss, Überlappung, Umschläge, Gehrungs- und Endzugabe stehen in
<b>Einstellungen → Massaufnahmen → Einlaufblech konisch</b> (eigene Werte, unabhängig vom geraden Blech).
<button type="button" class="gray" id="ebka_einstellungen" style="margin-left:8px;padding:3px 9px;font-size:11px">⚙️ Werte anpassen</button></div>`;
}

function ebkaGeometrieHtml(){
 const a=ebkA;
 const rep=ebkaRepMass(), rb=ebkaRepRestbreite();
 return `<div class="grid">
${ebkaFeld("Dachneigung / Winkel (°)",`<input id="ebka_dachneigung" data-pflicht="1" type="number" inputmode="decimal" step="0.1" value="${a.dachneigung===""?"":esc(a.dachneigung)}">`)}
${ebkaFeld("Enge Seite",`<div class="ra-wert" id="ebka_wSeite2">${esc(ebkaEngeSeite())}</div>`)}
${ebkaFeld("Mittleres Mass (enge Seite)",`<div class="ra-wert" id="ebka_wRep">${rep===null?"–":esc(ebkaMm(rep))+" mm"}</div>`)}
${ebkaFeld("Restbreite (Dachschräge)",`<div class="ra-wert${rb!==null&&rb<0?" ra-rest":""}" id="ebka_wRest">${rb===null?"–":esc(ebkaMm(rb))+" mm"}</div>`)}
</div>
<div class="small" id="ebka_formel" style="margin:2px 0 8px;color:var(--muted)">${ebkaFormelText()}</div>
<div id="ebka_schnitt" class="eb-diagram-box"></div>`;
}
function ebkaFormelText(){
 const a=ebkA, s=einlaufblechKonischSettings;
 return `Die Schnittzeichnung rechnet mit dem <b>Mittelwert aller Masse auf der engen Seite</b> –`
  +` genau wie das bestehende Modul. Restbreite = Abwicklung ${esc(ebkaMm(a.abwicklung))}`
  +` − mittleres Mass − Umschlag oben ${esc(ebkaMm(s.umschlag_oben))} − Umschlag unten ${esc(ebkaMm(s.umschlag_unten))} mm.`
  +` Das enge Mass eines Stücks ist sein Mass − 2 mm und gilt bei Montage „von ${esc(a.montage)}“ auf der ${esc(ebkaEngeSeite())}en Seite.`;
}

function ebkaStueckeHtml(){
 const a=ebkA;
 const L=ebkaGesamtlaenge(), eng=ebkaEngeSeite();
 const letzte=(a.stuecke||[])[a.stuecke.length-1]||{};
 const zeilen=(a.stuecke||[]).map((p,i)=>{
  const rb=ebkaRestbreite(p), kon=ebkaKonizitaet(p);
  return `<div class="ra-zeile" data-ebka-zeile="${i}">
<div class="ra-zeile-kopf"><b>Stück ${i+1}</b>
<span class="small ebka-kopfinfo">Zuschnitt ${esc(ebkaMm(p.laenge))} mm · eng ${esc(eng)} ${esc(ebkaMm(ebkaEngesMass(p)))} mm${rb<0?" · ⚠️ Restbreite "+esc(ebkaMm(rb))+" mm":""}</span>
<button type="button" class="red ra-weg" data-ebka-weg="${i}" title="Stück löschen">✕</button></div>
<div class="grid">
${ebkaFeld("Länge Stoss/Stoss (mm)",`<input data-ebka-stoss="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.stossStoss||0)}">`)}
${ebkaFeld("Zuschnittlänge (mm)",`<input data-ebka-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.laenge||0)}">`)}
${ebkaFeld("Mass links (mm)",`<input data-ebka-ml="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.massLinks||0)}">`)}
${ebkaFeld("Mass rechts (mm)",`<input data-ebka-mr="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.massRechts||0)}">`)}
${ebkaFeld("Winkel (°)",`<div style="display:flex;gap:4px;align-items:center"><input data-ebka-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.winkel||0)}" style="flex:1"><button type="button" class="gray ra-weg" data-ebka-flip="${i}" title="Winkel umkehren">🔄</button></div>`)}
${ebkaFeld("Konizität (rechts − links)",`<div class="ra-wert ebka-kon">${kon>0?"+":""}${esc(ebkaMm(kon))} mm</div>`)}
</div>
<div class="bar">
<label class="ra-schalter"><input type="checkbox" data-ebka-gl="${i}"${p.gehrungLinks?" checked":""}> Gehrung links</label>
<label class="ra-schalter"><input type="checkbox" data-ebka-gr="${i}"${p.gehrungRechts?" checked":""}> Gehrung rechts</label>
${ebkaZahl(p.endzugabeStart)?`<span class="small">Endzugabe Anfang ${esc(ebkaMm(p.endzugabeStart))} mm</span>`:""}
${ebkaZahl(p.endzugabeEnd)?`<span class="small">Endzugabe Ende ${esc(ebkaMm(p.endzugabeEnd))} mm</span>`:""}
</div>
<div class="ebka-konus">${ebkaKonusSvg(i)}</div>
</div>`;
 }).join("");
 return `<div class="grid">
${ebkaFeld("Gesamtlänge (mm)",`<input id="ebka_gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaenge===""?"":esc(a.gesamtlaenge)}" placeholder="für die Aufteilung">`)}
${ebkaFeld("Aus den Stücken",`<div class="ra-wert" id="ebka_wLaenge">${L>0?esc(ebkaMm(L))+" mm":"–"}</div>`)}
</div>
<div class="bar">
<button type="button" class="gray" id="ebka_neuAusGesamt">🔄 Stücke aus Gesamtlänge berechnen</button>
<button type="button" class="gray" id="ebka_anhaengen">➕ Weitere Länge anfügen</button>
<button type="button" class="gray" id="ebka_stueckPlus">＋ Stück hinzufügen</button>
</div>
<div class="bar">
<button type="button" class="gray" id="ebka_endStart">Endzugabe erstes Stück: ${letzte.endzugabeStart?"ein":"aus"}</button>
<button type="button" class="gray" id="ebka_endEnde">Endzugabe letztes Stück: ${letzte.endzugabeEnd?"ein":"aus"}</button>
</div>
<div class="small" style="margin:2px 0 8px;color:var(--muted)">Das rechte Mass eines Stücks wird beim Eintippen
automatisch zum linken Mass des nächsten – an der Stossstelle ist es dasselbe Blech. Danach lässt
sich jeder Wert einzeln überschreiben.</div>
${zeilen||'<div class="small">Noch kein Stück. „Stücke aus Gesamtlänge berechnen“, „＋ Stück hinzufügen“ oder unten aus einer Rinne übernehmen.</div>'}
<h2 style="margin-top:14px">Grundriss</h2>
<div class="info">Winkel = Richtungsänderung nach diesem Stück (positiv/negativ möglich, 0 = keine Ecke).</div>
<div id="ebka_grundriss" class="eb-diagram-box"></div>`;
}

function ebkaKontrolleHtml(){
 const m=ebkaPruefungen();
 if(!m.length)return `<div class="ra-pruefung"><div class="ra-ok">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div></div>`;
 return `<div class="ra-pruefung">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

function ebkaAusmassHtml(){
 const z=ebkaAusmassZeilen();
 if(!z.length)return `<div class="small">Noch nichts zu messen – bitte zuerst Stücke erfassen.</div>`;
 const mat=findMeasurementMaterial(ebkA.material);
 return `<div class="scroll"><table class="eb-table eba-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:8px">Material: <b>${esc(mat?mat.name:"–")}</b> · Blechfläche <b>${esc(ebkaFlaecheM2().toFixed(2).replace(".",","))} m²</b>.
Ohne Artikelnummern und ohne Preise – das Ausmass entsteht allein aus dieser Aufnahme.</div>`;
}

// Der Plan wird in die gemeinsame Form gebracht (js/33) und dort dargestellt -
// damit sieht der Zuschnitt in allen Massaufnahme-Arten gleich aus. Gerechnet
// wird weiterhin hier bzw. in ebaPackeInStreifen().
function ebkaZuschnittPlan(){
 const plan=ebkaRollenPlan();
 const v=plan.verteilung||{};
 const streifen=v.streifen||[];
 const A=ebkaZahl(ebkA.abwicklung);
 return {art:"rolle", einheit:"Stück",
  einleitung:ZU_EINLEITUNG_ROLLE,
  zusatz:"Die Konizität wird innerhalb des Streifens angerissen und ändert die benötigte Fläche nicht.",
  quelle:ZU_QUELLE_ROLLE,
  leer:!(ebkA.stuecke||[]).length?"Noch nichts zuzuschneiden – bitte zuerst Stücke erfassen."
      :(!((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]).length?"Es ist keine Rollenbreite hinterlegt."
      :"Kein Stück lässt sich auf eine Tafel legen."),
  streifenbreiten:[A],
  gruppen:streifen.length?[{breite:A,tafelLaenge:plan.tafelLaenge,streifen}]:[],
  moeglich:plan.moeglich, netto:ebkaFlaecheM2(),
  zuSchmal:plan.zuSchmal, zuLang:v.zuLang||[], optimal:v.optimal!==false};
}
function ebkaZuschnittHtml(){return zuschnittHtml(ebkaZuschnittPlan())}

// ---- Register --------------------------------------------------------------
function ebkaSetzeSchritt(n){
 ebkaSchritt=Math.max(1,Math.min(EBKA_REGISTER.length,Number(n)||1));
 renderEinlaufblechKonischAufnahme();
 const kopf=$("ebka_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function ebkaRegisterHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt –
 // sonst müsste man das Register aufsuchen, um zu merken, dass etwas fehlt.
 const pr=ebkaPruefungen();
 const fehler=pr.filter(m=>m.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="ebka_register">`+EBKA_REGISTER.map(r=>{
  const marke=r.nr===EBKA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===ebkaSchritt?" aktiv":""}" data-ebka-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function ebkaSchrittInhalt(){
 if(ebkaSchritt===1)return ebkaKarte("1 · Grunddaten",ebkaGrunddatenHtml());
 if(ebkaSchritt===2)return ebkaKarte("2 · Geometrie",ebkaGeometrieHtml());
 if(ebkaSchritt===3)return ebkaKarte("3 · Stücke und Aufteilung",ebkaStueckeHtml());
 if(ebkaSchritt===4)return ebkaKarte("4 · Zuschnitt aus Rollenblech",ebkaZuschnittHtml());
 if(ebkaSchritt===5)return ebkaKarte("5 · Ausmass und Material",ebkaAusmassHtml());
 return ebkaKarte("6 · Kontrolle",ebkaKontrolleHtml());
}
// Der Übernahme-Block aus dem HTML gehört in Register 3, darf aber NICHT in
// einen Container, der per innerHTML neu geschrieben wird: js/14 hat seinen
// Klick-Handler beim Laden an #ebk_rinneList gehängt, und ein Neuschreiben
// würde das Element samt Handler vernichten. Deshalb ein festes Gerüst aus
// drei Teilen; neu geschrieben werden nur Kopf und Fuss.
function ebkaGeruest(){
 const ziel=$("einlaufblechKonischAufnahme");
 if(!ziel||$("ebka_kopf"))return;
 const box=$("ebkaRinneBox");
 ziel.innerHTML='<div id="ebka_kopf"></div><div id="ebka_fuss"></div>';
 if(box)ziel.insertBefore(box,$("ebka_fuss"));
}
let ebkaRinneListeFuer;   // für welches Projekt die Liste zuletzt geladen wurde
function ebkaRinneBoxZeigen(){
 const box=$("ebkaRinneBox"); if(!box)return;
 const inRegister3=ebkaSchritt===3;
 box.hidden=!inRegister3;
 if(!inRegister3)return;
 box.classList.add("open");
 const pid=(typeof measSelectedProjectId!=="undefined")?measSelectedProjectId:null;
 if(pid!==ebkaRinneListeFuer&&typeof refreshEbkRinneList==="function"){
  ebkaRinneListeFuer=pid;
  refreshEbkRinneList();
 }
}
function renderEinlaufblechKonischAufnahme(){
 const ziel=$("einlaufblechKonischAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zurücksetzen/Füllen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen –
 // ohne diese Zeile wäre es dann sichtbar, aber tot.
 ebkaVerdrahten();
 ebkaGeruest();
 ebkaBruecke();
 $("ebka_kopf").innerHTML=ebkaRegisterHtml()+ebkaSchrittInhalt();
 $("ebka_fuss").innerHTML=`<div class="bar ra-blaettern">
<button type="button" class="gray" id="ebka_zurueck"${ebkaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="ebka_weiter">${
 ebkaSchritt>=EBKA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(EBKA_REGISTER[ebkaSchritt].kurz)}</button>
</div>`;
 ebkaZeichnungen();
 ebkaRinneBoxZeigen();
 // Die Pflichtfelder entstehen erst hier, nach markierePflichtfelder() beim
 // App-Start - deshalb für diesen Bereich noch einmal aufrufen.
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 // Die Registerleiste scrollt auf schmalen Geräten seitwärts. Das aktive
 // Register muss darin sichtbar sein – über die tatsächlichen Rechtecke,
 // nicht über offsetLeft (das bezieht sich auf den offsetParent).
 const strip=$("ebka_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}

// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet – sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function ebkaLive(){
 ebkaBruecke();
 const rep=ebkaRepMass(), rb=ebkaRepRestbreite();
 const wr=$("ebka_wRep"); if(wr)wr.textContent=rep===null?"–":ebkaMm(rep)+" mm";
 const rest=$("ebka_wRest");
 if(rest){rest.textContent=rb===null?"–":ebkaMm(rb)+" mm"; rest.classList.toggle("ra-rest",rb!==null&&rb<0)}
 const s1=$("ebka_wSeite"); if(s1)s1.textContent=ebkaEngeSeite();
 const s2=$("ebka_wSeite2"); if(s2)s2.textContent=ebkaEngeSeite();
 const formel=$("ebka_formel"); if(formel)formel.innerHTML=ebkaFormelText();
 const L=$("ebka_wLaenge");
 if(L){const g=ebkaGesamtlaenge(); L.textContent=g>0?ebkaMm(g)+" mm":"–"}
 // Die Konus-Skizzen und die Kopfzeilen der Stücke hängen an den Massen und
 // müssen mitlaufen, ohne die Eingabefelder zu ersetzen.
 (ebkA.stuecke||[]).forEach((p,i)=>{
  const block=document.querySelector('[data-ebka-zeile="'+i+'"]');
  if(!block)return;
  const konus=block.querySelector(".ebka-konus");
  if(konus)konus.innerHTML=ebkaKonusSvg(i);
  const kon=block.querySelector(".ebka-kon");
  if(kon){const k=ebkaKonizitaet(p); kon.textContent=(k>0?"+":"")+ebkaMm(k)+" mm"}
  const kopf=block.querySelector(".ebka-kopfinfo");
  const rbp=ebkaRestbreite(p);
  if(kopf)kopf.textContent="Zuschnitt "+ebkaMm(p.laenge)+" mm · eng "+ebkaEngeSeite()+" "
   +ebkaMm(ebkaEngesMass(p))+" mm"+(rbp<0?" · ⚠️ Restbreite "+ebkaMm(rbp)+" mm":"");
 });
 ebkaZeichnungen();
}

// ---- Bedienung -------------------------------------------------------------
function ebkaNeuesStueck(){
 const stoss=ebkaZahl(einlaufblechKonischSettings.stoss_laenge)||2000;
 const prev=(ebkA.stuecke||[])[ebkA.stuecke.length-1];
 return {laenge:stoss+ebkaZahl(einlaufblechKonischSettings.ueberlappung),stossStoss:stoss,
         gehrungLinks:false,gehrungRechts:false,winkel:0,
         massLinks:prev?ebkaZahl(prev.massRechts):0,massRechts:0};
}
// Aufteilung unverändert über splitLengthIntoPieces() aus js/13 - dieselbe
// Funktion, die auch das bestehende Modul benutzt.
function ebkaStueckeAusGesamtlaenge(L){
 const stoss=ebkaZahl(einlaufblechKonischSettings.stoss_laenge)||1;
 return splitLengthIntoPieces(L).map((len,i,alle)=>({
  laenge:len, stossStoss:i===alle.length-1?len:stoss,
  gehrungLinks:false, gehrungRechts:false, winkel:0,
  massLinks:0, massRechts:0
 }));
}
// Gehrung: dieselbe Regel wie in js/14 – Zugabe auf die Länge, Winkel 90.
// Anders als beim geraden Blech setzt das bestehende konische Modul das
// Nachbarstück NICHT automatisch mit; das bleibt hier genauso.
function ebkaGehrung(i,seite,an){
 const p=(ebkA.stuecke||[])[i]; if(!p)return;
 const zugabe=ebkaZahl(einlaufblechKonischSettings.gehrungszugabe);
 const key=seite==="links"?"gehrungLinks":"gehrungRechts";
 const war=!!p[key];
 p[key]=!!an;
 if(an&&!war){p.laenge=ebkaZahl(p.laenge)+zugabe; p.winkel=90;}
 else if(!an&&war)p.laenge=Math.max(0,ebkaZahl(p.laenge)-zugabe);
 if(!p.gehrungLinks&&!p.gehrungRechts)p.winkel=0;
}
// Endzugabe: unverändert die Regel aus js/14 – immer auf das Reststück.
function ebkaEndzugabe(position){
 const liste=ebkA.stuecke;
 if(!liste.length)return "Bitte zuerst Stücke erfassen.";
 const zugabe=ebkaZahl(einlaufblechKonischSettings.end_zugabe);
 if(!zugabe)return "In den Einstellungen ist keine Endzugabe (> 0 mm) hinterlegt.";
 const p=liste[liste.length-1];
 const key=position==="start"?"endzugabeStart":"endzugabeEnd";
 if(p[key]){p.laenge=Math.max(0,ebkaZahl(p.laenge)-p[key]); p[key]=0;}
 else{p.laenge=ebkaZahl(p.laenge)+zugabe; p[key]=zugabe;}
 return null;
}
// Verkettung: das rechte Mass eines Stücks ist das linke des nächsten -
// genau wie im bestehenden Modul (js/14, ebkMr-Handler).
function ebkaMassRechtsSetzen(i,wert){
 const p=(ebkA.stuecke||[])[i]; if(!p)return;
 p.massRechts=ebkaZahl(wert);
 const n=ebkA.stuecke[i+1];
 if(n){
  n.massLinks=p.massRechts;
  // Das Feld des nächsten Stücks mitziehen, ohne die Liste neu zu zeichnen –
  // sonst verliert das gerade bearbeitete Feld den Fokus.
  const feld=document.querySelector('[data-ebka-ml="'+(i+1)+'"]');
  if(feld)feld.value=String(n.massLinks);
 }
}
// "Fertig" führt zum Rest des Formulars (Fotos, Notiz, Speichern) – es
// speichert NICHT selbst, damit es nur einen Speicherweg gibt.
function ebkaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}

function ebkaVerdrahten(){
 const wurzel=$("measTypeEinlaufblechKonisch");
 if(!wurzel||wurzel.dataset.ebkaVerdrahtet)return;
 wurzel.dataset.ebkaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=ebkA;
  if(t.id==="ebka_dachneigung"){a.dachneigung=t.value===""?"":ebkaZahl(t.value)}
  else if(t.id==="ebka_gesamt"){a.gesamtlaenge=t.value===""?"":ebkaZahl(t.value);return}
  else if(d.ebkaLaenge!==undefined){
   const p=a.stuecke[Number(d.ebkaLaenge)]; if(p)p.laenge=ebkaZahl(t.value);
  }
  else if(d.ebkaStoss!==undefined){
   const i=Number(d.ebkaStoss), p=a.stuecke[i];
   if(!p)return;
   p.stossStoss=ebkaZahl(t.value);
   p.laenge=p.stossStoss+ebkaZahl(einlaufblechKonischSettings.ueberlappung);
   const feld=document.querySelector('[data-ebka-laenge="'+i+'"]');
   if(feld)feld.value=String(p.laenge);
  }
  else if(d.ebkaMl!==undefined){
   const p=a.stuecke[Number(d.ebkaMl)]; if(p)p.massLinks=ebkaZahl(t.value);
  }
  else if(d.ebkaMr!==undefined){ebkaMassRechtsSetzen(Number(d.ebkaMr),t.value)}
  else if(d.ebkaWinkel!==undefined){
   const p=a.stuecke[Number(d.ebkaWinkel)]; if(p)p.winkel=ebkaZahl(t.value);
  }
  else return;
  ebkaLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=ebkA;
  if(t.id==="ebka_material"){a.material=t.value; renderEinlaufblechKonischAufnahme(); return}
  if(t.id==="ebka_abwicklung"){a.abwicklung=ebkaZahl(t.value); renderEinlaufblechKonischAufnahme(); return}
  if(t.id==="ebka_montage"){a.montage=t.value; renderEinlaufblechKonischAufnahme(); return}
  if(d.ebkaGl!==undefined){ebkaGehrung(Number(d.ebkaGl),"links",t.checked); renderEinlaufblechKonischAufnahme(); return}
  if(d.ebkaGr!==undefined){ebkaGehrung(Number(d.ebkaGr),"rechts",t.checked); renderEinlaufblechKonischAufnahme(); return}
 });

 wurzel.addEventListener("click",e=>{
  // Die Rinnen-Übernahme von js/14 hängt am Listen-Element selbst und läuft
  // durch das Blubbern ZUERST. Sie ersetzt ebkPieces durch ein NEUES Array -
  // ohne die folgende Zeile würde ebkaBruecke() es beim nächsten Zeichnen
  // wieder mit dem alten Stand überschreiben und die übernommenen Stücke
  // wären lautlos weg. Hat js/14 abgebrochen (kein Segment, Rückfrage
  // verneint), ist ebkPieces unverändert und die Bedingung greift nicht.
  if(e.target.closest("[data-pick-ebk-rinne]")){
   if(Array.isArray(ebkPieces)&&ebkPieces!==ebkA.stuecke)ebkA.stuecke=ebkPieces;
   renderEinlaufblechKonischAufnahme(); return;
  }
  const t=e.target.closest("button,[data-ebka-schritt]");
  if(!t)return;
  const d=t.dataset||{}, a=ebkA;
  if(d.ebkaSchritt!==undefined){ebkaSetzeSchritt(d.ebkaSchritt); return}
  if(t.id==="ebka_zurueck"){if(ebkaSchritt>1)ebkaSetzeSchritt(ebkaSchritt-1); return}
  if(t.id==="ebka_weiter"){
   if(ebkaSchritt>=EBKA_REGISTER.length)ebkaAbschluss();
   else ebkaSetzeSchritt(ebkaSchritt+1);
   return;
  }
  if(t.id==="ebka_einstellungen"){
   settingsReturnToMeasurement=true;
   $("measurementEditModal").hidden=true;
   renderSettings();
   openSettingsTo("measurements","einlaufblech-konisch");
   return;
  }
  if(t.id==="ebka_neuAusGesamt"){
   const L=ebkaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
   if((a.stuecke||[]).length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
   a.stuecke=ebkaStueckeAusGesamtlaenge(L);
   renderEinlaufblechKonischAufnahme(); return;
  }
  if(t.id==="ebka_anhaengen"){
   const L=ebkaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
   a.stuecke=(a.stuecke||[]).concat(ebkaStueckeAusGesamtlaenge(L));
   renderEinlaufblechKonischAufnahme(); return;
  }
  if(t.id==="ebka_stueckPlus"){a.stuecke.push(ebkaNeuesStueck()); renderEinlaufblechKonischAufnahme(); return}
  if(t.id==="ebka_endStart"||t.id==="ebka_endEnde"){
   const fehler=ebkaEndzugabe(t.id==="ebka_endStart"?"start":"ende");
   if(fehler)alert(fehler); else renderEinlaufblechKonischAufnahme();
   return;
  }
  if(d.ebkaWeg!==undefined){a.stuecke.splice(Number(d.ebkaWeg),1); renderEinlaufblechKonischAufnahme(); return}
  if(d.ebkaFlip!==undefined){
   const p=a.stuecke[Number(d.ebkaFlip)];
   if(p)p.winkel=-ebkaZahl(p.winkel);
   renderEinlaufblechKonischAufnahme(); return;
  }
 });
}

// ---- Laden und Zurücksetzen ------------------------------------------------
// Ein gespeicherter Datensatz wird gelesen, wie er ist. Fehlt ein neues Feld
// (alte Aufnahme), gilt der Standard – es wird nichts erfunden.
function ebkaAusData(d){
 const a=ebkaLeer();
 if(!d)return a;
 a.material=d.material??"";
 a.abwicklung=ebkaZahl(d.abwicklung)||250;
 a.montage=d.montage||"links";
 a.dachneigung=d.dachneigung===undefined||d.dachneigung===null||d.dachneigung===""?"":ebkaZahl(d.dachneigung);
 a.gesamtlaenge=d.gesamtlaenge===undefined||d.gesamtlaenge===null||d.gesamtlaenge===""?"":ebkaZahl(d.gesamtlaenge);
 a.stuecke=Array.isArray(d.pieces)?d.pieces.map(p=>({...p})):[];
 return a;
}
// Nach dem Setzen wird neu gezeichnet - sonst zeigt das Register noch den
// vorherigen Stand (showMeasTypeSection läuft in openMeasurement VOR dem
// Füllen).
function ebkaZuruecksetzen(){
 ebkA=ebkaLeer(); ebkaSchritt=1; ebkaRinneListeFuer=undefined;
 ebkPieces=ebkA.stuecke;
 ebkaVerdrahten(); renderEinlaufblechKonischAufnahme();
}
function ebkaFuellen(d){
 ebkA=ebkaAusData(d); ebkaSchritt=1; ebkaRinneListeFuer=undefined;
 ebkPieces=ebkA.stuecke;
 ebkaVerdrahten(); renderEinlaufblechKonischAufnahme();
}

// ---- Zusatzfelder für den Speicher-Payload ---------------------------------
// js/16 schreibt weiterhin genau dieselben sieben Felder wie bisher und hängt
// nur diese hier an. Die Ergebnisse werden mitgespeichert, damit ein später
// gedrucktes Blatt gleich bleibt, auch wenn Einstellungen sich ändern -
// dasselbe Vorgehen wie bei Rinne, Kehle und Einlaufblech gerade.
function ebkaZusatzDaten(){
 const plan=ebkaRollenPlan();
 return {
  flaeche_m2:Number(ebkaFlaecheM2().toFixed(3)),
  ausmass:ebkaAusmassZeilen(),
  rollen:{tafelLaenge:plan.tafelLaenge,
          breiten:(typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[],
          bestes:plan.bestes||null,
          moeglich:plan.moeglich||[],
          streifen:((plan.verteilung||{}).streifen||[]).map(s=>({
            stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge})), rest:s.rest})),
          optimal:(plan.verteilung||{}).optimal!==false}
 };
}
