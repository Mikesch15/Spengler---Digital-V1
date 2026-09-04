"use strict";
// ============================================================================
// Massaufnahme "Mauerabdeckung" - Erfassung in neun Registern
// ============================================================================
// Rechnet NICHTS selbst. Die gesamte Fachlogik kommt unveraendert aus
// js/12b-mauerabdeckung.js (Grenzpunkte, Schieber, Stueckliste, Profilmasse,
// Normhinweise, Querschnitt), aus js/12-rinne-halbrund.js (Verteilung der
// Dehnungselemente, Grundriss) und - fuer den Zuschnitt aus Rollenblech - aus
// js/29-einlaufblech-aufnahme.js (ebaPackeInStreifen). Diese Datei ist
// ausschliesslich Bedienung, Anzeige, Ausmass, Zuschnitt und Kontrolle.
//
// madProfilMasse() liest seine Werte direkt aus den Eingabefeldern des alten
// Formulars. Damit die Funktion unveraendert bleibt, stehen dieselben Felder
// unsichtbar in #madStummel; madaBruecke() fuellt sie vor jeder Rechnung aus
// dem Modell. Gleiches Vorgehen wie #rinneStummel, #ebStummel, #ebkStummel
// und #fpStummel.
// ============================================================================

const MADA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Verlauf"},{nr:3,kurz:"Boden & Schieber"},
 {nr:4,kurz:"Profil & Norm"},{nr:5,kurz:"Stückliste"},{nr:6,kurz:"Zuschnitt"},
 {nr:7,kurz:"Ausmass"},{nr:8,kurz:"Kontrolle"}
];
// Die Kontrolle ist in jeder Art das LETZTE Register - die Marke haengt
// deshalb an der Registerzahl und nicht an einer festen Nummer.
const MADA_KONTROLLE=MADA_REGISTER.length;
let madaSchritt=1;

const madaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const madaMm=v=>Math.round(madaZahl(v)).toLocaleString("de-CH");
const madaMeter=v=>(madaZahl(v)/1000).toFixed(2).replace(".",",");
const madaQm=v=>madaZahl(v).toFixed(2).replace(".",",");

// Vorgabewerte des Profils - genau die Werte, die vorher als value im
// Formular standen.
const MADA_PROFIL_VORGABE=Object.freeze({
 breite:310, gefaelle:5, hoeheLinks:50, hoeheRechts:50,
 umschlagLinks:15, umschlagRechts:15, biegeLinks:95, biegeRechts:85,
 saum:10, windexponiert:false
});
function madaLeer(){
 return {material:"",segmente:[],schieberManuell:false,schieber:[],
         profil:{...MADA_PROFIL_VORGABE}};
}
let madA=madaLeer();

// ---- Bruecke zum bestehenden Modul ----------------------------------------
const MADA_STUMMEL=[
 ["mad_breite","breite"],["mad_gefaelle","gefaelle"],
 ["mad_hoeheLinks","hoeheLinks"],["mad_hoeheRechts","hoeheRechts"],
 ["mad_umschlagLinks","umschlagLinks"],["mad_umschlagRechts","umschlagRechts"],
 ["mad_biegeLinks","biegeLinks"],["mad_biegeRechts","biegeRechts"],
 ["mad_saum","saum"]
];
function madaVerlaufDaten(){return calcMadSchieber(madA.segmente||[],madA.material)}
// Von Hand gesetzte Schieber schlagen die gerechneten - wie bisher ueber das
// Kaestchen "Schieber von Hand setzen".
function madaSchieberAktiv(){
 return madA.schieberManuell?(madA.schieber||[]):madaVerlaufDaten().schieber;
}
function madaBruecke(){
 const a=madA, p=a.profil||{};
 madSegments=a.segmente;
 madSchieber=madaSchieberAktiv();
 const setz=(id,v)=>{const f=$(id); if(f)f.value=(v===""||v===null||v===undefined)?"":String(v)};
 setz("mad_material",a.material);
 // Ein leeres Feld bleibt leer: madProfilMasse() laesst dann fuer die beiden
 // Biegewinkel die Vorgabe aus dem Gefaelle greifen.
 MADA_STUMMEL.forEach(([id,k])=>setz(id,p[k]));
 const w=$("mad_windexponiert"); if(w)w.checked=!!p.windexponiert;
 // Damit renderMadAuswertung() eine von Hand gesetzte Liste nicht ueberschreibt.
 const m=$("mad_manuell"); if(m)m.checked=!!a.schieberManuell;
}
function madaProfilMasse(){madaBruecke();return madProfilMasse()}
function madaProfilSvg(){return madProfilSvgAus(madaProfilMasse())}
function madaNormHinweise(){return madNormHinweise(madaProfilMasse())}
function madaMaterialTabelle(){return madMaterialTabelle(madA.material)}
function madaStueckliste(){
 const {boundaries}=madaVerlaufDaten();
 return berechneMadStueckliste(madA.segmente||[],madaSchieberAktiv(),boundaries,
   madBodenMass,madSchieberMass);
}
function madaGesamtlaenge(){return computeMadBoundaries(madA.segmente||[]).gesamtlaenge}
function madaEndenMitBoden(){
 const s=madA.segmente||[];
 return {anfang:!!(s[0]&&s[0].bodenLinks),ende:!!(s[s.length-1]&&s[s.length-1].bodenRechts)};
}
function madaGrundriss(){
 const s=madA.segmente||[];
 if(!s.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:16px">Noch kein Segment erfasst.</div>';
 const {boundaries}=madaVerlaufDaten();
 return generateRinneGrundriss(s,madaSchieberAktiv().map(x=>({posAbStart:x.posAbStart})),
   boundaries,madaEndenMitBoden());
}
function madaMaterialText(){
 const m=findMeasurementMaterial(madA.material);
 return m?m.name:"–";
}
function madaEcken(){
 const s=madA.segmente||[];
 return s.slice(0,Math.max(0,s.length-1)).filter(x=>madaZahl(x.winkel)!==0).length;
}
function madaBoeden(){const e=madaEndenMitBoden();return (e.anfang?1:0)+(e.ende?1:0)}
// Blechflaeche = Gesamtlaenge x Abwicklung. Die Abwicklung kommt aus
// madProfilMasse(), wird hier also nicht neu gerechnet.
function madaFlaecheM2(){
 return (madaGesamtlaenge()/1000)*(madaZahl(madaProfilMasse().abwicklung)/1000);
}
function madaZuschnittSumme(){return madaStueckliste().reduce((s,x)=>s+madaZahl(x.zuschnitt),0)}

// ---- Verlauf bearbeiten ----------------------------------------------------
function madaSegmentAnhaengen(){
 // Wie bisher: das erste Segment ohne Richtungsaenderung, jedes weitere mit
 // 90 Grad als Vorgabe.
 madA.segmente.push({laenge:0,winkel:madA.segmente.length?90:0,
   bodenLinks:false,bodenRechts:false});
 madaSchieberNeu();
}
// computeMadBoundaries() liest den Boden nur am ersten und am letzten Segment.
// Steht er nach einer Umstellung woanders, waere er unsichtbar wirkungslos.
function madaBodenAufraeumen(){
 const s=madA.segmente;
 if(!s.length)return;
 s.forEach((x,i)=>{
  if(i!==0)x.bodenLinks=false;
  if(i!==s.length-1)x.bodenRechts=false;
 });
}
function madaSchieberNeu(){
 if(!madA.schieberManuell)madA.schieber=madaVerlaufDaten().schieber;
}
function madaSegmentLoeschen(i){
 madA.segmente.splice(i,1);
 madaBodenAufraeumen(); madaSchieberNeu();
}
function madaSegmentSchieben(i,richtung){
 const j=i+richtung, s=madA.segmente;
 if(j<0||j>=s.length)return;
 const t=s[i]; s[i]=s[j]; s[j]=t;
 madaBodenAufraeumen(); madaSchieberNeu();
}

// ---- Zuschnitt aus Rollenblech ---------------------------------------------
// Dasselbe Vorgehen wie bei Einlaufblech gerade, Einlaufblech konisch und
// Freies Profil: von der Rolle wird eine TAFEL abgeschnitten und quer in
// Streifen von der Breite der Abwicklung geteilt. Ein Streifen kann mehrere
// Stuecke HINTEREINANDER aufnehmen.
//
//   Streifen je Tafel = ganzzahlig(Rollenbreite / Abwicklung)
//   Tafellaenge       = laengstes Zuschnittstueck
//   Tafeln            = aufgerundet(Streifen / Streifen je Tafel)
//
// Gepackt wird mit ebaPackeInStreifen() aus js/29 - es gibt in der App nur
// EINE Packrechnung. Anders als beim Freien Profil hat die Mauerabdeckung nur
// EINE Abwicklung, also auch nur eine Streifenbreite.
function madaBleche(){
 return madaStueckliste().map(x=>({nr:x.nr,laenge:madaZahl(x.zuschnitt)}))
  .filter(x=>x.laenge>0);
}
function madaTafelLaenge(){
 const l=madaBleche().map(x=>x.laenge);
 return l.length?Math.max.apply(null,l):0;
}
function madaRollenbreiten(){
 return (typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[];
}
function madaRollenPlan(){
 const A=Math.round(madaZahl(madaProfilMasse().abwicklung));
 const bleche=madaBleche();
 const L=madaTafelLaenge();
 const breiten=madaRollenbreiten();
 const netto=bleche.reduce((s,x)=>s+x.laenge,0)*A/1e6;
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,tafelLaenge:L,
          abwicklung:A,netto,verteilung:null};
 const verteilung=ebaPackeInStreifen(bleche,L);
 const moeglich=[], zuSchmal=[];
 breiten.forEach(B=>{
  const jeTafel=Math.floor(B/A);
  if(jeTafel<1){zuSchmal.push(B);return}
  const streifen=(verteilung&&verteilung.streifen)||[];
  const tafeln=Math.ceil(streifen.length/jeTafel);
  const streifenGesamt=tafeln*jeTafel;
  const flaeche=tafeln*B*L/1e6;
  moeglich.push({breite:B,jeTafel,tafeln,streifen:streifen.length,
   ungenutzteStreifen:streifenGesamt-streifen.length,
   restBreite:B-jeTafel*A,flaeche,verschnitt:flaeche-netto,
   anteil:flaeche>0?(flaeche-netto)/flaeche*100:0});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.tafeln-y.tafeln||y.breite-x.breite);
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,tafelLaenge:L,
         abwicklung:A,netto,verteilung};
}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function madaAusmassZeilen(){
 const L=madaGesamtlaenge();
 if(!L)return [];
 const z=[], st=madaStueckliste();
 let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 zeile("Mauerabdeckung "+madaMaterialText(),madaMeter(L),"m","Summe der Segmentlängen");
 zeile("Blech (Abwicklung "+madaMm(madaProfilMasse().abwicklung)+" mm)",
   madaQm(madaFlaecheM2()),"m²","Gesamtlänge × Abwicklung");
 if(st.length)zeile("Zuschnitte",String(st.length),"Stk.","Stückliste");
 const ecken=madaEcken();
 if(ecken)zeile("Ecken",String(ecken),"Stk.","Segmente mit Winkel ≠ 0°");
 const sch=madaSchieberAktiv().length;
 if(sch)zeile("Schieber",String(sch),"Stk.",
   madA.schieberManuell?"von Hand gesetzt":"automatisch nach SIA 271");
 const bo=madaBoeden();
 if(bo)zeile("Boden",String(bo),"Stk.","Abschluss am Anfang/Ende");
 return z;
}

// ---- Kontrolle -------------------------------------------------------------
function madaPruefungen(){
 const r=[], seg=madA.segmente||[];
 const fehlt=t=>r.push({art:"fehler",text:t});
 const warn=t=>r.push({art:"warnung",text:t});

 if(!madA.material)warn("Kein Material gewählt – gerechnet wird mit dem Rückfallwert „"
   +madaMaterialTabelle().label+"“.");
 if(!seg.length)fehlt("Noch kein Segment erfasst – ohne Verlauf gibt es weder Schieber noch Zuschnitt.");
 seg.forEach((s,i)=>{
  const L2=Number(s.laenge);
  if(!Number.isFinite(L2)||L2<=0)fehlt("Segment "+(i+1)+": keine gültige Länge.");
  const w=Number(s.winkel);
  if(!Number.isFinite(w))fehlt("Segment "+(i+1)+": Winkel ist keine Zahl.");
  else if(Math.abs(w)>180)fehlt("Segment "+(i+1)+": Winkel "+w+"° liegt ausserhalb von ±180°.");
 });
 const L=madaGesamtlaenge();
 if(seg.length&&L<=0)fehlt("Die Gesamtlänge ist 0 mm.");

 const e=madaEndenMitBoden();
 if(seg.length&&!e.anfang&&!e.ende)
  warn("Kein Boden gesetzt – beide Enden gelten als offen. Ist das gewollt?");

 const sch=madaSchieberAktiv();
 sch.forEach((s,i)=>{
  const p=Number(s.posAbStart);
  if(!Number.isFinite(p))fehlt("Schieber "+(i+1)+": Position ist keine Zahl.");
  else if(p<=0||p>=L)fehlt("Schieber "+(i+1)+": Position "+Math.round(p)
    +" mm liegt nicht zwischen 0 und "+Math.round(L)+" mm.");
 });
 if(madA.schieberManuell){
  const auto=madaVerlaufDaten().schieber.length;
  if(sch.length<auto)warn("Von Hand gesetzt: "+sch.length
    +" Schieber. Die Rechnung nach SIA 271 käme auf "+auto+".");
 }

 const m=madaProfilMasse();
 if(!m.breite)fehlt("Profil: keine Gesamtbreite eingegeben.");
 if(!m.hL)fehlt("Profil: keine Höhe für den linken Schenkel eingegeben.");
 if(!m.hR)warn("Profil: keine Höhe für den rechten Schenkel eingegeben.");
 [["breite","Gesamtbreite"],["hL","Höhe links"],["hR","Höhe rechts"],
  ["umL","Umschlag links"],["umR","Umschlag rechts"],["saum","Saum"]].forEach(([k,t])=>{
  if(m[k]<0)fehlt("Profil: "+t+" ist negativ.");
 });
 if(!Number.isFinite(m.abwicklung)||m.abwicklung<=0)
  fehlt("Profil: die Abwicklung ergibt keinen brauchbaren Wert.");

 // Normhinweise kommen unveraendert aus madNormHinweise()
 madaNormHinweise().forEach(t=>warn(t));

 if(seg.length&&!madaAusmassZeilen().length)
  warn("Aus den erfassten Daten lässt sich kein Ausmass ableiten.");
 const st=madaStueckliste();
 if(seg.length&&!st.length)warn("Es entsteht kein einziges Zuschnittstück.");
 st.forEach(x=>{
  if(madaZahl(x.abstand)<=0)fehlt("Stück "+x.nr+": Abstand "+Math.round(x.abstand)
    +" mm – zwei Punkte liegen aufeinander.");
 });
 if(st.length){
  const rp=madaRollenPlan();
  if(rp.verteilung&&rp.verteilung.zuLang&&rp.verteilung.zuLang.length)
   fehlt("Zuschnitt: Stück "+rp.verteilung.zuLang.map(x=>x.nr).join(", ")
     +" ist länger als die Tafel.");
  if(!madaRollenbreiten().length)
   warn("Zuschnitt: keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet.");
  else if(!rp.moeglich.length)
   warn("Zuschnitt: keine Rolle ist breit genug für eine Abwicklung von "
     +Math.round(rp.abwicklung)+" mm.");
  else if(rp.verteilung&&rp.verteilung.optimal===false)
   warn("Zuschnitt: die Suche wurde abgebrochen – die gezeigte Verteilung ist die beste gefundene, nicht sicher die beste mögliche.");
 }
 return r;
}

// ---- Oberflaeche -----------------------------------------------------------
function madaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function madaKarte(titel,inhalt){
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}</h2>${inhalt}</div>`;
}
function madaKennzahlen(){
 const t=madaMaterialTabelle();
 return `<div class="grid" style="margin-top:10px">
${madaFeld("Segmente",`<div class="ra-wert" id="mada_zfSeg">${(madA.segmente||[]).length}</div>`)}
${madaFeld("Gesamtlänge",`<div class="ra-wert" id="mada_zfLaenge">${madaGesamtlaenge()>0?madaMm(madaGesamtlaenge())+" mm":"–"}</div>`)}
${madaFeld("Ecken",`<div class="ra-wert" id="mada_zfEcken">${madaEcken()}</div>`)}
${madaFeld("Schieber",`<div class="ra-wert" id="mada_zfSchieber">${madaSchieberAktiv().length}</div>`)}
${madaFeld("Boden",`<div class="ra-wert" id="mada_zfBoden">${madaBoeden()}</div>`)}
</div>
<div class="small" style="margin-top:6px">${esc(t.label)}: max. ${madaMeter(t.maxAbstand)} m zwischen zwei Schiebern, ab einer Ecke oder einem Boden ${madaMeter(t.abEcke)} m.</div>`;
}

function madaGrunddatenHtml(){
 const opt=['<option value="">– bitte wählen –</option>']
  .concat(measurementMaterials.map(m=>
   `<option value="${m.id}"${String(m.id)===String(madA.material)?" selected":""}>${esc(m.name)}</option>`))
  .join("");
 const t=madaMaterialTabelle();
 return `<div class="grid">
${madaFeld("Material",`<select id="mada_material" data-pflicht="1">${opt}</select>`,true)}
</div>
<div class="info" style="margin-top:10px">Das Material bestimmt die zulässigen Abstände
zwischen zwei Schiebern. Die Werte kommen aus dem Material-Katalog
(Einstellungen → Massaufnahmen → Material, SIA 271 Tabelle 8.4.2) und werden
hier nicht neu festgelegt.</div>
<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Max. Abstand zwischen zwei Schiebern</td><td style="text-align:right"><b>${madaMeter(t.maxAbstand)} m</b></td></tr>
<tr><td>Max. Abstand ab einer Ecke oder einem Boden</td><td style="text-align:right"><b>${madaMeter(t.abEcke)} m</b></td></tr>
<tr><td>Zugabe je Boden</td><td style="text-align:right"><b>${madaMm(madBodenMass)} mm</b></td></tr>
<tr><td>Zugabe je Schieberseite</td><td style="text-align:right"><b>${madaMm(madSchieberMass)} mm</b></td></tr>
</tbody></table></div>
<div class="bar"><button type="button" class="gray" id="mada_einst">⚙️ Einstellungen</button></div>`;
}

function madaSegmentKarte(s,i,anzahl){
 const letzte=i===anzahl-1;
 return `<div class="ra-zeile">
<div class="ra-zeile-kopf">
 <b>Segment ${i+1}${letzte?" · letztes":""}</b>
 <span>
  <button type="button" class="gray ra-weg" data-mada-hoch="${i}"${i===0?" disabled":""}>▲</button>
  <button type="button" class="gray ra-weg" data-mada-runter="${i}"${letzte?" disabled":""}>▼</button>
  <button type="button" class="red ra-weg" data-mada-weg="${i}">Löschen</button>
 </span>
</div>
<div class="grid">
${madaFeld("Länge (mm)",`<input type="number" inputmode="numeric" step="1" data-mada-laenge="${i}" value="${madaZahl(s.laenge)}" data-pflicht="1">`)}
${madaFeld(letzte?"Winkel – am letzten Segment folgt nichts mehr":"Ecke zum nächsten Segment (°)",
 `<div style="display:flex;gap:6px;align-items:stretch">
<input type="number" inputmode="numeric" step="1" data-mada-winkel="${i}" value="${madaZahl(s.winkel)}"${letzte?" disabled":""} style="flex:1 1 auto;min-width:0">
<button type="button" class="gray" data-mada-flip="${i}" title="Winkel umkehren"${letzte?" disabled":""} style="flex:0 0 auto;padding:0 12px">🔄</button></div>`)}
</div>
${i===0||letzte?`<div style="display:flex;flex-wrap:wrap;gap:6px 20px">
${i===0?`<label class="ra-schalter"><input type="checkbox" data-mada-boden-l="${i}"${s.bodenLinks?" checked":""}> Boden am Anfang</label>`:""}
${letzte?`<label class="ra-schalter"><input type="checkbox" data-mada-boden-r="${i}"${s.bodenRechts?" checked":""}> Boden am Ende</label>`:""}
</div>`:""}
</div>`;
}
function madaVerlaufHtml(){
 const s=madA.segmente;
 const karten=s.length?s.map((x,i)=>madaSegmentKarte(x,i,s.length)).join("")
  :'<div class="small" style="color:var(--muted);text-align:center;padding:14px">Noch kein Segment. Mit „＋ Segment hinzufügen“ beginnen.</div>';
 return `<div class="info">START → Segment → Ecke → Segment → Ecke → Segment → ENDE.
Der Winkel eines Segments ist die Richtungsänderung zum <b>nächsten</b> Segment
(90° = normale Ecke, 🔄 kehrt sie um). Das letzte Segment hat keinen Winkel mehr.</div>
${karten}
<div class="bar"><button type="button" class="gray" id="mada_segPlus" style="min-height:46px;font-weight:700">＋ Segment hinzufügen</button></div>
${madaKennzahlen()}
<h3 style="margin-top:14px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Grundriss</h3>
<div class="eb-diagram-box" id="mada_grundriss">${madaGrundriss()}</div>
<div class="ra-legende">◼ Segmentlänge · ◆ Schieber · ▮ Boden · ➜ Blickrichtung</div>`;
}

function madaBodenSchieberHtml(){
 const s=madA.segmente||[], e=madaEndenMitBoden();
 const {boundaries,tabelle}=madaVerlaufDaten();
 const auto=madaVerlaufDaten().schieber;
 const sch=madaSchieberAktiv();
 const grenzen=boundaries.map((b,i)=>`<tr><td>${i+1}</td><td>${esc(b.name)}</td>
<td>${b.typ==="ecke"?"Fixpunkt – ab hier gilt der halbe Abstand":"offene Grenze"}</td>
<td style="text-align:right">${madaMm(b.pos)}</td></tr>`).join("");
 const zeilen=sch.map((x,i)=>`<tr>
<td>${i+1}</td>
<td>${madA.schieberManuell
 ?`<input class="ra-dila-feld" type="number" inputmode="numeric" step="1" data-mada-schieber="${i}" value="${Math.round(madaZahl(x.posAbStart))}">`
 :`<span style="font-weight:700">${madaMm(x.posAbStart)}</span>`}</td>
<td style="text-align:right">${madaMm(madaZahl(x.posAbStart)-(i?madaZahl(sch[i-1].posAbStart):0))}</td>
<td>${madA.schieberManuell?`<button type="button" class="red ra-weg" data-mada-schieber-weg="${i}">×</button>`:""}</td>
</tr>`).join("");
 return `<div class="info">Der Boden ist der Abschluss am Anfang oder am Ende des
ganzen Verlaufs. Er wirkt wie ein Fixpunkt: ab dort gilt der halbe Abstand –
genau wie an einer Ecke.</div>
<div style="display:flex;flex-wrap:wrap;gap:6px 20px">
<label class="ra-schalter"><input type="checkbox" id="mada_bodenL"${e.anfang?" checked":""}${s.length?"":" disabled"}> Boden am Anfang</label>
<label class="ra-schalter"><input type="checkbox" id="mada_bodenR"${e.ende?" checked":""}${s.length?"":" disabled"}> Boden am Ende</label>
</div>
${boundaries.length?`<h3 style="margin-top:14px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Grenzpunkte</h3>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Punkt</th><th>Wirkung</th><th style="text-align:right">ab Start (mm)</th></tr></thead>
<tbody>${grenzen}</tbody></table></div>`:'<div class="small" style="color:var(--muted);padding:10px 0">Erst ein Segment im Verlauf erfassen.</div>'}
<h2 style="margin-top:16px">Schieber</h2>
<div class="info">Der Schieber ist das Dehnungselement. Die Positionen rechnet die
App nach SIA 271 aus dem Material und den Grenzpunkten – hier wird nichts
zweites gerechnet.<br><b>${esc(tabelle.label)}</b>: höchstens ${madaMeter(tabelle.maxAbstand)} m
zwischen zwei Schiebern, ab einer Ecke oder einem Boden höchstens ${madaMeter(tabelle.abEcke)} m.</div>
<label class="ra-schalter"><input type="checkbox" id="mada_manuell"${madA.schieberManuell?" checked":""}> Schieber von Hand setzen (sonst automatisch)</label>
${madA.schieberManuell?`<div class="ra-warnung">Von Hand gesetzt. Die Rechnung käme auf ${auto.length} Schieber.</div>`:""}
${sch.length?`<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th style="text-align:right">ab Start (mm)</th><th style="text-align:right">Abstand zum vorherigen</th><th></th></tr></thead>
<tbody>${zeilen}</tbody></table></div>`
:'<div class="ra-ok">Kein Schieber nötig – alle Abschnitte liegen innerhalb der zulässigen Abstände.</div>'}
${madA.schieberManuell?`<div class="bar">
<button type="button" class="gray" id="mada_schieberPlus">＋ Schieber</button>
<button type="button" class="gray" id="mada_schieberAuto">↻ Zurück zur Rechnung</button></div>`:""}
<div class="eb-diagram-box">${madaGrundriss()}</div>`;
}

const MADA_PROFIL_FELDER=[
 {k:"breite",        t:"Gesamtbreite (mm)",           pflicht:true},
 {k:"gefaelle",      t:"Gefälle nach rechts (°)"},
 {k:"hoeheLinks",    t:"Höhe Schenkel links (mm)",    pflicht:true},
 {k:"hoeheRechts",   t:"Höhe Schenkel rechts (mm)"},
 {k:"umschlagLinks", t:"Umschlag links (mm, 135°)"},
 {k:"umschlagRechts",t:"Umschlag rechts (mm, 90°)"},
 {k:"biegeLinks",    t:"Biegewinkel links (°)"},
 {k:"biegeRechts",   t:"Biegewinkel rechts (°)"},
 {k:"saum",          t:"Saum 180° beidseitig (mm)"}
];
function madaProfilHtml(){
 const p=madA.profil, m=madaProfilMasse(), vg=madBiegeVorgabe(m.gef);
 const h=madaNormHinweise();
 return `<div class="grid">
${MADA_PROFIL_FELDER.map(f=>madaFeld(f.t,
  `<input type="number" inputmode="numeric" step="1" data-mada-profil="${f.k}" value="${p[f.k]===""?"":madaZahl(p[f.k])}"${f.pflicht?' data-pflicht="1"':""}>`)).join("")}
${madaFeld("Abwicklung",`<div class="ra-wert" id="mada_abwicklung">${madaMm(m.abwicklung)} mm</div>`)}
</div>
<label class="ra-schalter"><input type="checkbox" id="mada_wind"${p.windexponiert?" checked":""}> Windexponierte Lage</label>
<div class="small" style="margin-top:4px">Bleibt ein Biegewinkel leer, gilt die
Vorgabe aus dem Gefälle: links ${Math.round(vg.links)}°, rechts ${Math.round(vg.rechts)}°.
Die Abwicklung ist die Summe der Schenkellängen und hängt nicht vom Biegewinkel ab.</div>
<div class="eb-diagram-box" id="mada_profilBild">${madaProfilSvg()}</div>
<h2 style="margin-top:16px">Normkontrolle</h2>
<div class="ra-pruefung" id="mada_norm">${h.length
 ?h.map(t=>`<div class="ra-warnung">⚠️ ${esc(t)}</div>`).join("")
 :`<div class="ra-ok">Die Höhen entsprechen den Mindestwerten der Norm (${p.windexponiert?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE} mm).</div>`}</div>
<div class="small" style="margin-top:6px">SIA 271, Dachrand: Aufkantung mindestens
${MAD_MIN_HOEHE} mm, in windexponierter Lage ${MAD_MIN_HOEHE_WIND} mm. Es werden keine
eigenen Werte gesetzt.</div>`;
}

function madaStuecklisteHtml(){
 const st=madaStueckliste();
 if(!st.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:14px">Noch kein Zuschnittstück – zuerst den Verlauf erfassen.</div>';
 const zeilen=st.map(x=>`<tr${x.schieberIndex===null?' style="background:var(--card-bg,#f7fafc)"':""}>
<td>${x.nr}</td><td>${esc(x.von)} → ${esc(x.bis)}</td>
<td style="text-align:right">${madaMm(x.abstand)}</td>
<td style="text-align:right"><b>${madaMm(x.zuschnitt)}</b></td>
<td style="text-align:right">${madaMm(x.pos)}</td></tr>`).join("");
 return `<div class="info">Zuschnitt = Abstand + Zugabe je Ende. Zugabe je Boden
${madaMm(madBodenMass)} mm, je Schieberseite ${madaMm(madSchieberMass)} mm
(Einstellungen → Massaufnahmen).</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Von → Bis</th><th style="text-align:right">Abstand (mm)</th><th style="text-align:right">Zuschnitt (mm)</th><th style="text-align:right">Position ab Start</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="grid" style="margin-top:10px">
${madaFeld("Stücke",`<div class="ra-wert">${st.length}</div>`)}
${madaFeld("Summe Zuschnitt",`<div class="ra-wert">${madaMm(madaZuschnittSumme())} mm</div>`)}
${madaFeld("Gesamtlänge",`<div class="ra-wert">${madaMm(madaGesamtlaenge())} mm</div>`)}
</div>`;
}

// Der Plan wird in die gemeinsame Form gebracht (js/33) und dort dargestellt -
// damit sieht der Zuschnitt in allen Massaufnahme-Arten gleich aus. Gerechnet
// wird weiterhin hier bzw. in ebaPackeInStreifen().
function madaZuschnittPlan(){
 const rp=madaRollenPlan();
 const v=rp.verteilung||{};
 const streifen=v.streifen||[];
 const bleche=madaBleche();
 return {art:"rolle", einheit:"Stück",
  einleitung:ZU_EINLEITUNG_ROLLE,
  quelle:ZU_QUELLE_ROLLE,
  leer:!bleche.length?"Noch kein Zuschnittstück – zuerst den Verlauf erfassen."
      :(!madaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt. Unter Einstellungen → Massaufnahmen → Einlaufblech gerade mindestens eine wählen."
      :"Kein Stück lässt sich auf eine Tafel legen."),
  streifenbreiten:[rp.abwicklung],
  gruppen:streifen.length?[{breite:rp.abwicklung,tafelLaenge:rp.tafelLaenge,streifen}]:[],
  moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, zuLang:v.zuLang||[], optimal:v.optimal!==false};
}
function madaZuschnittHtml(){return zuschnittHtml(madaZuschnittPlan())}
function madaAusmassHtml(){
 const z=madaAusmassZeilen();
 if(!z.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:14px">Noch nichts abzuleiten – zuerst den Verlauf erfassen.</div>';
 const t=madaMaterialTabelle();
 return `<div class="info">Vollständig aus den erfassten Daten abgeleitet – keine
zweite Eingabe. Ohne Artikelnummern und ohne Preise.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th style="text-align:right">Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td style="text-align:right"><b>${esc(x.menge)}</b></td><td>${esc(x.einheit)}</td>
<td class="small" style="color:var(--muted)">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<h3 style="margin-top:14px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Materialangaben</h3>
<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td style="text-align:right"><b>${esc(madaMaterialText()==="–"?t.label+" (Rückfallwert)":madaMaterialText())}</b></td></tr>
<tr><td>Max. Abstand zwischen zwei Schiebern</td><td style="text-align:right"><b>${madaMeter(t.maxAbstand)} m</b></td></tr>
<tr><td>Max. Abstand ab einer Ecke oder einem Boden</td><td style="text-align:right"><b>${madaMeter(t.abEcke)} m</b></td></tr>
<tr><td>Zugabe je Boden</td><td style="text-align:right"><b>${madaMm(madBodenMass)} mm</b></td></tr>
<tr><td>Zugabe je Schieberseite</td><td style="text-align:right"><b>${madaMm(madSchieberMass)} mm</b></td></tr>
</tbody></table></div>`;
}

function madaKontrolleHtml(){
 const r=madaPruefungen();
 const fehler=r.filter(x=>x.art==="fehler"), warn=r.filter(x=>x.art==="warnung");
 const inhalt=r.length
  ?fehler.map(x=>`<div class="ra-fehler">✖ ${esc(x.text)}</div>`).join("")
   +warn.map(x=>`<div class="ra-warnung">⚠️ ${esc(x.text)}</div>`).join("")
  :'<div class="ra-ok">✓ Alles vollständig – keine Fehler und keine Hinweise.</div>';
 return `<div class="ra-pruefung">${inhalt}</div>
<div class="small" style="margin-top:8px">Geprüft werden fehlende Masse, ungültige
Zahlen, Verlauf, Boden, Schieber, Profil, Normhinweise, Ausmass und Zuschnitt.</div>`;
}
// ---- Register --------------------------------------------------------------
function madaSetzeSchritt(n){
 madaSchritt=Math.max(1,Math.min(MADA_REGISTER.length,Number(n)||1));
 renderMauerabdeckungAufnahme();
 const kopf=$("mada_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function madaRegisterHtml(){
 const pr=madaPruefungen();
 const fehler=pr.filter(m=>m.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="mada_register">`+MADA_REGISTER.map(r=>{
  const marke=r.nr===MADA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Fehler":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===madaSchritt?" aktiv":""}" data-mada-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function madaSchrittInhalt(){
 if(madaSchritt===1)return madaKarte("1 · Grunddaten",madaGrunddatenHtml());
 if(madaSchritt===2)return madaKarte("2 · Verlauf",madaVerlaufHtml());
 if(madaSchritt===3)return madaKarte("3 · Boden",madaBodenSchieberHtml());
 if(madaSchritt===4)return madaKarte("4 · Profil / Querschnitt",madaProfilHtml());
 if(madaSchritt===5)return madaKarte("5 · Stückliste / Zuschnitt",madaStuecklisteHtml());
 if(madaSchritt===6)return madaKarte("6 · Zuschnitt aus Rollenblech",madaZuschnittHtml());
 if(madaSchritt===7)return madaKarte("7 · Ausmass",madaAusmassHtml());
 return madaKarte("8 · Kontrolle",madaKontrolleHtml());
}
function renderMauerabdeckungAufnahme(){
 const ziel=$("mauerabdeckungAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zuruecksetzen/Fuellen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen.
 madaVerdrahten();
 madaBruecke();
 ziel.innerHTML=madaRegisterHtml()+madaSchrittInhalt()
  +`<div class="bar ra-blaettern">
<button type="button" class="gray" id="mada_zurueck"${madaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="mada_weiter">${
 madaSchritt>=MADA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(MADA_REGISTER[madaSchritt].kurz)}</button>
</div>`;
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("mada_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus.
function madaLive(){
 madaBruecke();
 const gr=$("mada_grundriss"); if(gr)gr.innerHTML=madaGrundriss();
 const pb=$("mada_profilBild"); if(pb)pb.innerHTML=madaProfilSvg();
 const ab=$("mada_abwicklung"); if(ab)ab.textContent=madaMm(madaProfilMasse().abwicklung)+" mm";
 const norm=$("mada_norm");
 if(norm){
  const h=madaNormHinweise();
  norm.innerHTML=h.length?h.map(t=>`<div class="ra-warnung">⚠️ ${esc(t)}</div>`).join("")
   :`<div class="ra-ok">Die Höhen entsprechen den Mindestwerten der Norm (${madA.profil.windexponiert?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE} mm).</div>`;
 }
 const setzt=(id,v)=>{const e=$(id); if(e)e.textContent=v};
 setzt("mada_zfSeg",(madA.segmente||[]).length);
 setzt("mada_zfLaenge",madaGesamtlaenge()>0?madaMm(madaGesamtlaenge())+" mm":"–");
 setzt("mada_zfEcken",madaEcken());
 setzt("mada_zfSchieber",madaSchieberAktiv().length);
 setzt("mada_zfBoden",madaBoeden());
}
function madaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}

// ---- Bedienung -------------------------------------------------------------
function madaVerdrahten(){
 const wurzel=$("measTypeMauerabdeckung");
 if(!wurzel||wurzel.dataset.madaVerdrahtet)return;
 wurzel.dataset.madaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=madA;
  if(d.madaLaenge!==undefined){
   const s=a.segmente[Number(d.madaLaenge)];
   if(s){s.laenge=madaZahl(t.value);madaSchieberNeu();madaLive()}
   return;
  }
  if(d.madaWinkel!==undefined){
   const s=a.segmente[Number(d.madaWinkel)];
   if(s){s.winkel=madaZahl(t.value);madaSchieberNeu();madaLive()}
   return;
  }
  if(d.madaProfil!==undefined){
   // Leeres Feld bleibt leer, damit die Vorgabe aus dem Gefaelle greifen kann.
   a.profil[d.madaProfil]=t.value===""?"":madaZahl(t.value);
   madaLive(); return;
  }
  if(d.madaSchieber!==undefined){
   const s=a.schieber[Number(d.madaSchieber)];
   if(s){s.posAbStart=madaZahl(t.value);madaLive()}
   return;
  }
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=madA;
  if(t.id==="mada_material"){a.material=t.value;madaSchieberNeu();renderMauerabdeckungAufnahme();return}
  if(t.id==="mada_wind"){a.profil.windexponiert=t.checked;renderMauerabdeckungAufnahme();return}
  if(t.id==="mada_manuell"){
   a.schieberManuell=t.checked;
   // Beim Umschalten auf "von Hand" wird die gerechnete Liste uebernommen.
   a.schieber=madaVerlaufDaten().schieber.map(x=>({posAbStart:x.posAbStart}));
   renderMauerabdeckungAufnahme(); return;
  }
  if(t.id==="mada_bodenL"||t.id==="mada_bodenR"){
   const s=a.segmente;
   if(!s.length)return;
   if(t.id==="mada_bodenL")s[0].bodenLinks=t.checked;
   else s[s.length-1].bodenRechts=t.checked;
   madaSchieberNeu(); renderMauerabdeckungAufnahme(); return;
  }
  if(d.madaBodenL!==undefined){
   const s=a.segmente[Number(d.madaBodenL)];
   if(s){s.bodenLinks=t.checked;madaSchieberNeu();renderMauerabdeckungAufnahme()}
   return;
  }
  if(d.madaBodenR!==undefined){
   const s=a.segmente[Number(d.madaBodenR)];
   if(s){s.bodenRechts=t.checked;madaSchieberNeu();renderMauerabdeckungAufnahme()}
   return;
  }
  if(d.madaSchieber!==undefined){
   a.schieber.sort((x,y)=>madaZahl(x.posAbStart)-madaZahl(y.posAbStart));
   renderMauerabdeckungAufnahme(); return;
  }
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-mada-schritt]");
  if(!t)return;
  const d=t.dataset||{}, a=madA;
  if(d.madaSchritt!==undefined){madaSetzeSchritt(d.madaSchritt);return}
  if(t.id==="mada_zurueck"){madaSetzeSchritt(madaSchritt-1);return}
  if(t.id==="mada_weiter"){
   if(madaSchritt>=MADA_REGISTER.length){madaAbschluss();return}
   madaSetzeSchritt(madaSchritt+1); return;
  }
  if(t.id==="mada_fertig"){madaAbschluss();return}
  if(t.id==="mada_einst"){
   if(typeof openSettingsTo==="function"){
    settingsReturnToMeasurement=true;
    $("measurementEditModal").hidden=true;
    openSettingsTo("measurements","mauerabdeckung");
   }
   return;
  }
  if(t.id==="mada_segPlus"){madaSegmentAnhaengen();renderMauerabdeckungAufnahme();return}
  if(d.madaWeg!==undefined){
   if(confirm("Segment "+(Number(d.madaWeg)+1)+" wirklich löschen?")){
    madaSegmentLoeschen(Number(d.madaWeg)); renderMauerabdeckungAufnahme();
   }
   return;
  }
  if(d.madaHoch!==undefined){madaSegmentSchieben(Number(d.madaHoch),-1);renderMauerabdeckungAufnahme();return}
  if(d.madaRunter!==undefined){madaSegmentSchieben(Number(d.madaRunter),1);renderMauerabdeckungAufnahme();return}
  if(d.madaFlip!==undefined){
   const s=a.segmente[Number(d.madaFlip)];
   if(s){s.winkel=-madaZahl(s.winkel);madaSchieberNeu();renderMauerabdeckungAufnahme()}
   return;
  }
  if(t.id==="mada_schieberPlus"){
   const L=madaGesamtlaenge();
   const pos=Number(prompt("Position ab Start (mm):","0"));
   if(!Number.isFinite(pos)||pos<=0||pos>=L){
    alert("Position muss zwischen 0 und "+Math.round(L)+" mm liegen.");return;
   }
   a.schieber.push({posAbStart:pos});
   a.schieber.sort((x,y)=>madaZahl(x.posAbStart)-madaZahl(y.posAbStart));
   renderMauerabdeckungAufnahme(); return;
  }
  if(d.madaSchieberWeg!==undefined){
   a.schieber.splice(Number(d.madaSchieberWeg),1);
   renderMauerabdeckungAufnahme(); return;
  }
  if(t.id==="mada_schieberAuto"){
   a.schieberManuell=false; a.schieber=madaVerlaufDaten().schieber;
   renderMauerabdeckungAufnahme(); return;
  }
 });
}

// ---- Laden und Zuruecksetzen -----------------------------------------------
function madaAusData(d){
 const a=madaLeer();
 if(!d)return a;
 a.material=d.material??"";
 a.segmente=Array.isArray(d.segments)?d.segments.map(s=>({...s})):[];
 // Eine gespeicherte Aufnahme bringt ihre Schieber mit - die duerfen nicht
 // ueberschrieben werden, genau wie bisher ueber "Schieber von Hand".
 a.schieber=Array.isArray(d.schieber)?d.schieber.map(s=>({...s})):[];
 a.schieberManuell=true;
 const pr=d.profil||{};
 a.profil={...MADA_PROFIL_VORGABE};
 const uebernimm=(ziel,quelle)=>{if(pr[quelle]!==undefined&&pr[quelle]!==null)a.profil[ziel]=pr[quelle]};
 uebernimm("breite","breite"); uebernimm("gefaelle","gef");
 uebernimm("hoeheLinks","hL"); uebernimm("hoeheRechts","hR");
 uebernimm("umschlagLinks","umL"); uebernimm("umschlagRechts","umR");
 uebernimm("saum","saum");
 uebernimm("biegeLinks","wL"); uebernimm("biegeRechts","wR");
 a.profil.windexponiert=!!pr.wind;
 return a;
}
function madaZuruecksetzen(){
 madA=madaLeer(); madaSchritt=1;
 madA.material=String(measurementMaterialOrFallback(null).id||"");
 madSegments=madA.segmente; madSchieber=[];
 madaVerdrahten(); renderMauerabdeckungAufnahme();
}
function madaFuellen(d){
 madA=madaAusData(d); madaSchritt=1;
 madSegments=madA.segmente; madSchieber=madA.schieber;
 madaVerdrahten(); renderMauerabdeckungAufnahme();
}

// ---- Zusatzfelder fuer den Speicher-Payload --------------------------------
// js/16 schreibt weiterhin genau dieselben zehn Felder wie bisher und haengt
// nur diese hier an. Die Ergebnisse werden mitgespeichert, damit ein spaeter
// gedrucktes Blatt gleich bleibt, auch wenn Einstellungen sich aendern.
function madaZusatzDaten(){
 const plan=madaRollenPlan();
 return {
  flaeche_m2:Number(madaFlaecheM2().toFixed(3)),
  ausmass:madaAusmassZeilen(),
  rollen:{breiten:madaRollenbreiten(),
          abwicklung:plan.abwicklung,
          tafelLaenge:plan.tafelLaenge,
          netto:Number(plan.netto.toFixed(3)),
          bestes:plan.bestes||null,
          moeglich:plan.moeglich||[],
          streifen:((plan.verteilung&&plan.verteilung.streifen)||[])
            .map(s=>({stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge})),rest:s.rest})),
          optimal:plan.verteilung?plan.verteilung.optimal!==false:true}
 };
}
