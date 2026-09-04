"use strict";
// ===========================================================================
// PROTOTYP  ·  Massaufnahme "Mauerabdeckung"
// ===========================================================================
// Baut auf dem bestehenden Modul der laufenden App auf. Gerechnet und
// gezeichnet wird ausschliesslich mit den Funktionen aus uebernommen.js, die
// zeichengenau aus js/12b, js/12, js/14 und js/01 stammen. Es gibt in dieser
// Datei KEINE zweite Berechnung von Grenzpunkten, Schiebern, Zuschnitt,
// Profilmassen oder Normhinweisen - nur Bedienung, Anzeige, Ausmass und
// Kontrolle.
//
// Neu gegenüber dem bestehenden Modul ist ausschliesslich:
//   - acht Register statt eines langen Formulars
//   - Verlauf als Karten (Segment · Ecke · Segment), gross bedienbar
//   - Ausmass und Materialübersicht ohne zweite Eingabe
//   - Kontrolle mit Punkt am Register
//   - Fotos, Skizze und Notiz am Ende ("Fertig › Fotos und Speichern")
//   - Speichern/Laden im Gerät
// ===========================================================================

// ---- 1. Register ----------------------------------------------------------
const SCHRITTE=["Grunddaten","Verlauf","Boden & Schieber","Profil & Norm",
                "Stückliste","Zuschnitt","Ausmass","Kontrolle","Fotos & Speichern"];
const SCHRITT_KONTROLLE=8;
let schritt=1;

// ---- 2. Modell ------------------------------------------------------------
const SPEICHER="pmad_aufnahmen";
// Vorgabewerte des Profils: genau die Werte, die im Formular der laufenden App
// (index.html, Abschnitt measTypeMauerabdeckung) als value stehen.
const PROFIL_VORGABE=Object.freeze({
 breite:310, gefaelle:5, hoeheLinks:50, hoeheRechts:50,
 umschlagLinks:15, umschlagRechts:15, biegeLinks:95, biegeRechts:85,
 saum:10, windexponiert:false
});
function leereAufnahme(){
 return {
  id:"mad"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  erstellt:new Date().toISOString(), geaendert:null,
  bezeichnung:"", datum:new Date().toISOString().slice(0,10), objekt:"",
  material:"",
  segmente:[],
  schieberManuell:false, schieber:[],
  profil:{...PROFIL_VORGABE},
  fotos:[], skizze:null, bemerkung:""
 };
}
let aufnahme=leereAufnahme();

const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const mm=v=>Math.round(zahl(v)).toLocaleString("de-CH");
const meter=v=>(zahl(v)/1000).toFixed(2).replace(".",",");
const qm=v=>zahl(v).toFixed(2).replace(".",",");

// ---- 3. Brücke zum bestehenden Modul --------------------------------------
// madProfilMasse() aus js/12b liest seine Werte direkt aus den Eingabefeldern
// des App-Formulars. Damit die Funktion zeichengenau übernommen werden kann,
// stehen dieselben Felder unsichtbar in der Seite (#p-stummel) und werden vor
// jeder Rechnung aus dem Modell gefüllt. Gleiches Vorgehen wie #rinneStummel
// und #ebStummel in der laufenden App.
const STUMMEL_FELDER=[
 ["mad_breite","breite"],["mad_gefaelle","gefaelle"],
 ["mad_hoeheLinks","hoeheLinks"],["mad_hoeheRechts","hoeheRechts"],
 ["mad_umschlagLinks","umschlagLinks"],["mad_umschlagRechts","umschlagRechts"],
 ["mad_biegeLinks","biegeLinks"],["mad_biegeRechts","biegeRechts"],
 ["mad_saum","saum"]
];
function madBrueckeSetzen(a){
 const p=(a&&a.profil)||{};
 STUMMEL_FELDER.forEach(([id,k])=>{
  const f=$(id);
  // Ein leeres Feld bleibt leer: madProfilMasse() lässt dann für die beiden
  // Biegewinkel die Vorgabe aus dem Gefälle greifen - genau wie in der App.
  if(f)f.value=(p[k]===""||p[k]===null||p[k]===undefined)?"":String(p[k]);
 });
 const w=$("mad_windexponiert");
 if(w)w.checked=!!p.windexponiert;
}
// Alle abgeleiteten Werte kommen aus der Fachlogik der App:
function profilMasse(a){madBrueckeSetzen(a);return madProfilMasse()}
function profilSvg(a){return madProfilSvgAus(profilMasse(a))}
function normHinweise(a){return madNormHinweise(profilMasse(a))}
function materialTabelle(a){return madMaterialTabelle(a.material)}
function verlaufDaten(a){return calcMadSchieber(a.segmente||[],a.material)}
// Von Hand gesetzte Schieber schlagen die automatischen - wie in der App über
// das Kästchen "Schieber von Hand setzen".
function schieberAktiv(a){
 return a.schieberManuell?(a.schieber||[]):verlaufDaten(a).schieber;
}
function stueckliste(a){
 const {boundaries}=verlaufDaten(a);
 return berechneMadStueckliste(a.segmente||[],schieberAktiv(a),boundaries,
   madBodenMass,madSchieberMass);
}
function gesamtlaenge(a){return computeMadBoundaries(a.segmente||[]).gesamtlaenge}
function endenMitBoden(a){
 const s=a.segmente||[];
 return {anfang:!!(s[0]&&s[0].bodenLinks), ende:!!(s[s.length-1]&&s[s.length-1].bodenRechts)};
}
function grundrissHtml(a){
 const s=a.segmente||[];
 if(!s.length)return '<div class="p-leer">Noch kein Segment erfasst.</div>';
 const {boundaries}=verlaufDaten(a);
 return generateRinneGrundriss(s,schieberAktiv(a).map(x=>({posAbStart:x.posAbStart})),
   boundaries,endenMitBoden(a));
}
function materialText(a){const m=findMeasurementMaterial(a.material);return m?m.name:"–"}
function eckenAnzahl(a){
 const s=a.segmente||[];
 return s.slice(0,Math.max(0,s.length-1)).filter(x=>zahl(x.winkel)!==0).length;
}
function bodenAnzahl(a){const e=endenMitBoden(a);return (e.anfang?1:0)+(e.ende?1:0)}
// Blechfläche = Gesamtlänge × Abwicklung. Die Abwicklung kommt aus
// madProfilMasse(), wird hier also nicht neu gerechnet.
function flaecheM2(a){
 const L=gesamtlaenge(a), b=zahl(profilMasse(a).abwicklung);
 return (L/1000)*(b/1000);
}
function zuschnittSumme(a){return stueckliste(a).reduce((s,x)=>s+zahl(x.zuschnitt),0)}

// ---- Zuschnitt aus Rollenblech --------------------------------------------
// Genau wie bei Einlaufblech gerade, Einlaufblech konisch und Freies Profil:
// von der Rolle wird eine TAFEL abgeschnitten und quer in Streifen von der
// Breite der Abwicklung geteilt. Ein Streifen kann mehrere Stücke
// HINTEREINANDER aufnehmen.
//
//   Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)
//   Tafellänge        = längstes Zuschnittstück
//   Tafeln            = aufgerundet(Streifen ÷ Streifen je Tafel)
//
// Gepackt wird mit ebaPackeInStreifen() aus js/29-einlaufblech-aufnahme.js -
// es gibt in der ganzen App nur EINE Packrechnung, und die wird hier benutzt.
// Anders als beim Freien Profil hat die Mauerabdeckung nur EINE Abwicklung,
// also auch nur eine Streifenbreite.
function madBleche(a){
 return stueckliste(a).map(x=>({nr:x.nr,laenge:zahl(x.zuschnitt)}))
  .filter(x=>x.laenge>0);
}
function madTafelLaenge(a){
 const l=madBleche(a).map(x=>x.laenge);
 return l.length?Math.max.apply(null,l):0;
}
function madRollenPlan(a){
 const A=Math.round(zahl(profilMasse(a).abwicklung));
 const bleche=madBleche(a);
 const L=madTafelLaenge(a);
 const breiten=aktiveRollenbreiten();
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,tafelLaenge:L,
          abwicklung:A,netto:flaecheM2(a),verteilung:null};
 const verteilung=ebaPackeInStreifen(bleche,L);
 const netto=bleche.reduce((s,x)=>s+x.laenge,0)*A/1e6;
 const moeglich=[], zuSchmal=[];
 breiten.forEach(B=>{
  const jeTafel=Math.floor(B/A);
  if(jeTafel<1){zuSchmal.push(B);return}
  const streifen=(verteilung&&verteilung.streifen)||[];
  const tafeln=Math.ceil(streifen.length/jeTafel);
  const streifenGesamt=tafeln*jeTafel;
  const flaeche=tafeln*B*L/1e6;
  moeglich.push({breite:B,jeTafel,tafeln,
   streifen:streifen.length, ungenutzteStreifen:streifenGesamt-streifen.length,
   restBreite:B-jeTafel*A,
   flaeche, verschnitt:flaeche-netto,
   anteil:flaeche>0?(flaeche-netto)/flaeche*100:0});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.tafeln-y.tafeln||y.breite-x.breite);
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,tafelLaenge:L,
         abwicklung:A,netto,verteilung};
}

// ---- 4. Verlauf bearbeiten -------------------------------------------------
function segmentAnhaengen(){
 // Wie in der App: das erste Segment ohne Richtungsänderung, jedes weitere
 // mit 90° als Vorgabe.
 aufnahme.segmente.push({laenge:0,winkel:aufnahme.segmente.length?90:0,
   bodenLinks:false,bodenRechts:false});
 schieberNeuAusRechnung();
}
function segmentLoeschen(i){
 aufnahme.segmente.splice(i,1);
 // Boden gilt nur an den beiden Aussenenden - nach dem Löschen aufräumen.
 bodenAufraeumen();
 schieberNeuAusRechnung();
}
function segmentSchieben(i,richtung){
 const j=i+richtung;
 const s=aufnahme.segmente;
 if(j<0||j>=s.length)return;
 const t=s[i]; s[i]=s[j]; s[j]=t;
 bodenAufraeumen();
 schieberNeuAusRechnung();
}
// computeMadBoundaries() liest den Boden nur am ersten und am letzten Segment.
// Steht er nach einer Umstellung woanders, wäre er unsichtbar wirkungslos -
// deshalb wird er auf die beiden Aussenenden zurückgeholt.
function bodenAufraeumen(){
 const s=aufnahme.segmente;
 if(!s.length)return;
 s.forEach((x,i)=>{
  if(i!==0)x.bodenLinks=false;
  if(i!==s.length-1)x.bodenRechts=false;
 });
}
// Solange nicht von Hand gesetzt wird, folgt die Schieberliste der Rechnung.
function schieberNeuAusRechnung(){
 if(!aufnahme.schieberManuell)aufnahme.schieber=verlaufDaten(aufnahme).schieber;
}

// ---- 5. Ausmass ------------------------------------------------------------
// Wird vollständig aus den erfassten Daten abgeleitet - keine zweite Eingabe,
// keine Artikelnummern, keine Preise.
function ausmassZeilen(a){
 const L=gesamtlaenge(a);
 if(!L)return [];
 const st=stueckliste(a);
 const z=[];
 z.push({was:"Mauerabdeckung "+materialText(a),menge:meter(L),einheit:"m",
   quelle:"Summe der Segmentlängen"});
 z.push({was:"Blech (Abwicklung "+mm(profilMasse(a).abwicklung)+" mm)",
   menge:qm(flaecheM2(a)),einheit:"m²",quelle:"Gesamtlänge × Abwicklung"});
 z.push({was:"Zuschnitte",menge:String(st.length),einheit:"Stk",
   quelle:"Stückliste"});
 const ecken=eckenAnzahl(a);
 if(ecken)z.push({was:"Ecken",menge:String(ecken),einheit:"Stk",
   quelle:"Segmente mit Winkel ≠ 0°"});
 const sch=schieberAktiv(a).length;
 if(sch)z.push({was:"Schieber",menge:String(sch),einheit:"Stk",
   quelle:a.schieberManuell?"von Hand gesetzt":"automatisch nach SIA 271"});
 const bo=bodenAnzahl(a);
 if(bo)z.push({was:"Boden",menge:String(bo),einheit:"Stk",
   quelle:"Abschluss am Anfang/Ende"});
 return z;
}
function materialUebersicht(a){
 const t=materialTabelle(a);
 return [
  {was:"Material",wert:materialText(a)==="–"?t.label+" (Rückfallwert)":materialText(a)},
  {was:"Max. Abstand zwischen zwei Schiebern",wert:meter(t.maxAbstand)+" m"},
  {was:"Max. Abstand ab einer Ecke oder einem Boden",wert:meter(t.abEcke)+" m"},
  {was:"Zugabe je Boden",wert:mm(madBodenMass)+" mm"},
  {was:"Zugabe je Schieberseite",wert:mm(madSchieberMass)+" mm"}
 ];
}

// ---- 6. Kontrolle ----------------------------------------------------------
function pruefungen(a){
 const r=[];
 const seg=a.segmente||[];
 const fehlt=(t)=>r.push({art:"fehler",text:t});
 const warn=(t)=>r.push({art:"warnung",text:t});

 if(!a.material)warn("Kein Material gewählt – gerechnet wird mit dem Rückfallwert „"
   +materialTabelle(a).label+"“.");
 if(!seg.length){fehlt("Noch kein Segment erfasst – ohne Verlauf gibt es weder Schieber noch Zuschnitt.");}
 seg.forEach((s,i)=>{
  const L=Number(s.laenge);
  if(!Number.isFinite(L)||L<=0)fehlt("Segment "+(i+1)+": keine gültige Länge.");
  const w=Number(s.winkel);
  if(!Number.isFinite(w))fehlt("Segment "+(i+1)+": Winkel ist keine Zahl.");
  else if(Math.abs(w)>180)fehlt("Segment "+(i+1)+": Winkel "+w+"° liegt ausserhalb von ±180°.");
 });
 const L=gesamtlaenge(a);
 if(seg.length&&L<=0)fehlt("Die Gesamtlänge ist 0 mm.");

 // Boden
 const e=endenMitBoden(a);
 if(seg.length&&!e.anfang&&!e.ende)
  warn("Kein Boden gesetzt – beide Enden gelten als offen. Ist das gewollt?");

 // Schieber
 const sch=schieberAktiv(a);
 sch.forEach((s,i)=>{
  const p=Number(s.posAbStart);
  if(!Number.isFinite(p))fehlt("Schieber "+(i+1)+": Position ist keine Zahl.");
  else if(p<=0||p>=L)fehlt("Schieber "+(i+1)+": Position "+Math.round(p)
    +" mm liegt nicht zwischen 0 und "+Math.round(L)+" mm.");
 });
 if(a.schieberManuell){
  const auto=verlaufDaten(a).schieber.length;
  if(sch.length<auto)warn("Von Hand gesetzt: "+sch.length+" Schieber. Die Rechnung nach SIA 271 käme auf "+auto+".");
 }

 // Profil
 const m=profilMasse(a);
 if(!m.breite)fehlt("Profil: keine Gesamtbreite eingegeben.");
 if(!m.hL)fehlt("Profil: keine Höhe für den linken Schenkel eingegeben.");
 if(!m.hR)warn("Profil: keine Höhe für den rechten Schenkel eingegeben.");
 [["breite","Gesamtbreite"],["hL","Höhe links"],["hR","Höhe rechts"],
  ["umL","Umschlag links"],["umR","Umschlag rechts"],["saum","Saum"]].forEach(([k,t])=>{
  if(m[k]<0)fehlt("Profil: "+t+" ist negativ.");
 });
 if(!Number.isFinite(m.abwicklung)||m.abwicklung<=0)fehlt("Profil: die Abwicklung ergibt keinen brauchbaren Wert.");

 // Normhinweise kommen unverändert aus madNormHinweise()
 normHinweise(a).forEach(t=>warn(t));

 // Ausmass und Zuschnitt
 if(seg.length&&!ausmassZeilen(a).length)warn("Aus den erfassten Daten lässt sich kein Ausmass ableiten.");
 const st=stueckliste(a);
 if(seg.length&&!st.length)warn("Es entsteht kein einziges Zuschnittstück.");
 st.forEach(x=>{
  if(zahl(x.abstand)<=0)fehlt("Stück "+x.nr+": Abstand "+Math.round(x.abstand)
    +" mm – zwei Punkte liegen aufeinander.");
 });

 // Zuschnitt aus Rollenblech
 if(st.length){
  const rp=madRollenPlan(a);
  if(rp.verteilung&&rp.verteilung.zuLang&&rp.verteilung.zuLang.length)
   fehlt("Zuschnitt: Stück "+rp.verteilung.zuLang.map(x=>x.nr).join(", ")
     +" ist länger als die Tafel.");
  if(!aktiveRollenbreiten().length)
   warn("Zuschnitt: keine Rollenbreite angehakt – der Materialbedarf wird nicht gerechnet.");
  else if(!rp.moeglich.length)
   warn("Zuschnitt: keine Rolle ist breit genug für eine Abwicklung von "
     +Math.round(rp.abwicklung)+" mm.");
  else if(rp.verteilung&&rp.verteilung.optimal===false)
   warn("Zuschnitt: die Suche wurde abgebrochen – die gezeigte Verteilung ist die beste gefundene, nicht sicher die beste mögliche.");
 }
 return r;
}

// ---- 7. Ablage -------------------------------------------------------------
function alleAufnahmen(){
 try{const l=JSON.parse(localStorage.getItem(SPEICHER)||"[]");return Array.isArray(l)?l:[]}
 catch(e){return []}
}
function speichern(){
 try{
  const liste=alleAufnahmen();
  aufnahme.geaendert=new Date().toISOString();
  const i=liste.findIndex(x=>x.id===aufnahme.id);
  if(i>=0)liste[i]=JSON.parse(JSON.stringify(aufnahme));
  else liste.unshift(JSON.parse(JSON.stringify(aufnahme)));
  localStorage.setItem(SPEICHER,JSON.stringify(liste));
  return true;
 }catch(e){alert("Speichern nicht möglich: "+e.message);return false}
}
// Eine gespeicherte Aufnahme wird auf das aktuelle Modell gehoben: fehlende
// Felder bekommen die Vorgabe, vorhandene bleiben unangetastet. So öffnen auch
// ältere Datensätze, denen ein später ergänztes Feld fehlt.
function aufModellHeben(a){
 const g=JSON.parse(JSON.stringify({...leereAufnahme(),...a}));
 g.profil={...PROFIL_VORGABE,...(a&&a.profil?a.profil:{})};
 if(!Array.isArray(g.segmente))g.segmente=[];
 if(!Array.isArray(g.schieber))g.schieber=[];
 if(!Array.isArray(g.fotos))g.fotos=[];
 return g;
}
function oeffnen(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 aufnahme=aufModellHeben(a);
 schritt=1; zeichne(); return true;
}
function kopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 const k=JSON.parse(JSON.stringify(a));
 k.id="mad"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 k.erstellt=new Date().toISOString(); k.geaendert=null;
 k.bezeichnung=(a.bezeichnung||"Ohne Bezeichnung")+" (Kopie)";
 const liste=alleAufnahmen(); liste.unshift(k);
 localStorage.setItem(SPEICHER,JSON.stringify(liste));
 aufnahme=aufModellHeben(k);
 schritt=1; zeichne(); return k.id;
}
function loeschen(id){
 localStorage.setItem(SPEICHER,JSON.stringify(alleAufnahmen().filter(x=>x.id!==id)));
}

// ---- 8. Oberfläche ---------------------------------------------------------
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" p-voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}
function karte(titel,inhalt){return `<div class="p-karte"><h2>${esc(titel)}</h2>${inhalt}</div>`}
function zahlFeld(id,wert,extra){
 return `<input class="p-gross" type="number" inputmode="numeric" step="1" id="${id}" value="${wert===""?"":zahl(wert)}"${extra||""}>`;
}
function registerHtml(){
 const p=pruefungen(aufnahme);
 const fehler=p.some(x=>x.art==="fehler"), warn=p.some(x=>x.art==="warnung");
 return `<div class="p-register" id="p-register">${SCHRITTE.map((t,i)=>{
  const n=i+1;
  const punkt=n===SCHRITT_KONTROLLE&&(fehler||warn)
   ?`<span class="p-punkt ${fehler?"p-punkt-rot":"p-punkt-orange"}"></span>`:"";
  return `<button type="button" class="p-register-knopf${n===schritt?" aktiv":""}" data-schritt="${n}">
<span class="p-register-nr">${n}</span>${esc(t)}${punkt}</button>`;
 }).join("")}</div>`;
}

// ---- Register 1 · Grunddaten ----------------------------------------------
function schritt1(){
 const opt=['<option value="">– bitte wählen –</option>']
  .concat(measurementMaterials.map(m=>`<option value="${esc(m.id)}"${String(aufnahme.material)===String(m.id)?" selected":""}>${esc(m.name)}</option>`))
  .join("");
 return karte("1 · Grunddaten",`<div class="p-grid">
${feld("Bezeichnung",`<input class="p-gross" type="text" id="p-bezeichnung" value="${esc(aufnahme.bezeichnung)}" placeholder="z. B. Attika Nordseite">`,true)}
${feld("Datum",`<input class="p-gross" type="date" id="p-datum" value="${esc(aufnahme.datum)}">`)}
${feld("Objekt / Adresse",`<input class="p-gross" type="text" id="p-objekt" value="${esc(aufnahme.objekt)}">`)}
${feld("Material",`<select class="p-gross" id="p-material">${opt}</select>`,true)}
</div>
<div class="p-hinweis">Das Material bestimmt die zulässigen Abstände zwischen zwei
Schiebern. Die Werte kommen aus dem Material-Katalog der App (SIA 271, Tabelle 8.4.2)
und werden hier nicht neu festgelegt.</div>
<div class="p-tabelle"><table><tbody>
${materialUebersicht(aufnahme).map(z=>`<tr><td>${esc(z.was)}</td><td class="p-num"><b>${esc(z.wert)}</b></td></tr>`).join("")}
</tbody></table></div>`);
}

// ---- Register 2 · Verlauf --------------------------------------------------
function segmentKarte(s,i,anzahl){
 const letzte=i===anzahl-1;
 return `<div class="p-seg">
<div class="p-seg-kopf">
 <span class="p-seg-nr">${i+1}</span>
 <span class="p-seg-titel">Segment ${i+1}${letzte?" · letztes":""}</span>
 <button type="button" class="p-grau p-seg-weg" data-seg-hoch="${i}"${i===0?" disabled":""}>▲</button>
 <button type="button" class="p-grau p-seg-weg" data-seg-runter="${i}"${letzte?" disabled":""}>▼</button>
 <button type="button" class="p-weg p-seg-weg" data-seg-weg="${i}">Löschen</button>
</div>
<div class="p-grid">
${feld("Länge (mm)",`<input class="p-gross" type="number" inputmode="numeric" step="1" data-seg-laenge="${i}" value="${zahl(s.laenge)}">`)}
${feld(letzte?"Winkel – am letzten Segment folgt nichts mehr":"Ecke zum nächsten Segment (°)",
 `<div class="p-winkelreihe"><input class="p-gross" type="number" inputmode="numeric" step="1" data-seg-winkel="${i}" value="${zahl(s.winkel)}"${letzte?" disabled":""}>
<button type="button" class="p-grau" data-seg-flip="${i}" title="Winkel umkehren"${letzte?" disabled":""}>🔄</button></div>`)}
</div>
<div class="p-schalter-reihe">
${i===0?`<label class="p-schalter"><input type="checkbox" data-seg-bodenL="${i}"${s.bodenLinks?" checked":""}> Boden am Anfang</label>`:""}
${letzte?`<label class="p-schalter"><input type="checkbox" data-seg-bodenR="${i}"${s.bodenRechts?" checked":""}> Boden am Ende</label>`:""}
</div>
</div>`;
}
function schritt2(){
 const s=aufnahme.segmente;
 const karten=s.length?s.map((x,i)=>segmentKarte(x,i,s.length)).join("")
  :'<div class="p-leer">Noch kein Segment. Mit „＋ Segment hinzufügen“ beginnen.</div>';
 return karte("2 · Verlauf",`<div class="p-hinweis">START → Segment → Ecke → Segment → Ecke → Segment → ENDE.
Der Winkel eines Segments ist die Richtungsänderung zum <b>nächsten</b> Segment
(90° = normale Ecke, 🔄 kehrt sie um). Das letzte Segment hat keinen Winkel mehr.</div>
${karten}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-segPlus">＋ Segment hinzufügen</button></div>
${zusammenfassungHtml()}
<h3>Grundriss</h3>
<div class="p-grundriss" id="p-grundriss">${grundrissHtml(aufnahme)}</div>
<div class="p-legende"><span class="p-lg p-lg-blau">Segmentlänge</span>
<span class="p-lg p-lg-orange">Schieber</span>
<span class="p-lg p-lg-gruen">Boden</span>
<span class="p-lg p-lg-rot">Blickrichtung</span></div>`);
}
function zusammenfassungHtml(){
 const a=aufnahme;
 const t=materialTabelle(a);
 return `<div class="p-zf-kopf">
<div><span>Segmente</span><b id="p-zfSeg">${(a.segmente||[]).length}</b></div>
<div><span>Gesamtlänge</span><b id="p-zfLaenge">${gesamtlaenge(a)>0?mm(gesamtlaenge(a))+" mm":"–"}</b></div>
<div><span>Ecken</span><b id="p-zfEcken">${eckenAnzahl(a)}</b></div>
<div><span>Schieber</span><b id="p-zfSchieber">${schieberAktiv(a).length}</b></div>
<div><span>Boden</span><b id="p-zfBoden">${bodenAnzahl(a)}</b></div>
</div>
<div class="p-zf-fuss" id="p-zfFuss">${esc(t.label)}: max. ${meter(t.maxAbstand)} m zwischen zwei Schiebern, ab einer Ecke oder einem Boden ${meter(t.abEcke)} m.</div>`;
}

// ---- Register 3 · Boden und Schieber --------------------------------------
function schritt3(){
 const a=aufnahme;
 const s=a.segmente||[];
 const e=endenMitBoden(a);
 const {boundaries,tabelle}=verlaufDaten(a);
 const auto=verlaufDaten(a).schieber;
 const sch=schieberAktiv(a);
 const grenzen=boundaries.map((b,i)=>`<tr>
<td>${i+1}</td><td>${esc(b.name)}</td>
<td>${b.typ==="ecke"?"Fixpunkt – ab hier gilt der halbe Abstand":"offene Grenze"}</td>
<td class="p-num">${mm(b.pos)}</td></tr>`).join("");
 const zeilen=sch.map((x,i)=>`<tr>
<td>${i+1}</td>
<td>${a.schieberManuell
 ?`<input class="p-tab-feld" type="number" inputmode="numeric" step="1" data-schieber-pos="${i}" value="${Math.round(zahl(x.posAbStart))}">`
 :`<span class="p-num">${mm(x.posAbStart)}</span>`}</td>
<td class="p-num">${mm(zahl(x.posAbStart)-(i?zahl(sch[i-1].posAbStart):0))}</td>
<td>${a.schieberManuell?`<button type="button" class="p-weg" data-schieber-weg="${i}">×</button>`:""}</td>
</tr>`).join("");
 return karte("3 · Boden",`<div class="p-hinweis">Der Boden ist der Abschluss am Anfang oder am Ende
des ganzen Verlaufs. Er wirkt wie ein Fixpunkt: ab dort gilt der halbe Abstand –
genau wie an einer Ecke.</div>
<div class="p-schalter-reihe">
<label class="p-schalter"><input type="checkbox" id="p-bodenL"${e.anfang?" checked":""}${s.length?"":" disabled"}> Boden am Anfang</label>
<label class="p-schalter"><input type="checkbox" id="p-bodenR"${e.ende?" checked":""}${s.length?"":" disabled"}> Boden am Ende</label>
</div>
${s.length?"":'<div class="p-leer">Erst ein Segment im Verlauf erfassen.</div>'}
<h3>Grenzpunkte</h3>
${boundaries.length?`<div class="p-tabelle"><table>
<thead><tr><th>Nr.</th><th>Punkt</th><th>Wirkung</th><th class="p-num">ab Start (mm)</th></tr></thead>
<tbody>${grenzen}</tbody></table></div>`:'<div class="p-leer">Noch keine Grenzpunkte.</div>'}`)
+karte("4 · Schieber",`<div class="p-hinweis">Der Schieber ist das Dehnungselement. Die Positionen
rechnet die App nach SIA 271 aus dem Material und den Grenzpunkten – hier wird
nichts zweites gerechnet.<br>
<b>${esc(tabelle.label)}</b>: höchstens ${meter(tabelle.maxAbstand)} m zwischen zwei
Schiebern, ab einer Ecke oder einem Boden höchstens ${meter(tabelle.abEcke)} m.</div>
<label class="p-schalter"><input type="checkbox" id="p-manuell"${a.schieberManuell?" checked":""}> Schieber von Hand setzen (sonst automatisch)</label>
${a.schieberManuell?`<div class="p-warnung">Von Hand gesetzt. Die Rechnung käme auf ${auto.length} Schieber.</div>`:""}
${sch.length?`<div class="p-tabelle"><table>
<thead><tr><th>Nr.</th><th class="p-num">ab Start (mm)</th><th class="p-num">Abstand zum vorherigen</th><th></th></tr></thead>
<tbody>${zeilen}</tbody></table></div>`
:'<div class="p-ok">Kein Schieber nötig – alle Abschnitte liegen innerhalb der zulässigen Abstände.</div>'}
${a.schieberManuell?`<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-schieberPlus">＋ Schieber</button>
<button type="button" class="p-grau" id="p-schieberAuto">↻ Zurück zur Rechnung</button>
</div>`:""}
<h3>Grundriss</h3>
<div class="p-grundriss">${grundrissHtml(a)}</div>`);
}

// ---- Register 4 · Profil und Norm -----------------------------------------
const PROFIL_FELDER=[
 {k:"breite",        t:"Gesamtbreite (mm)"},
 {k:"gefaelle",      t:"Gefälle nach rechts (°)"},
 {k:"hoeheLinks",    t:"Höhe Schenkel links (mm)"},
 {k:"hoeheRechts",   t:"Höhe Schenkel rechts (mm)"},
 {k:"umschlagLinks", t:"Umschlag links (mm, 135°)"},
 {k:"umschlagRechts",t:"Umschlag rechts (mm, 90°)"},
 {k:"biegeLinks",    t:"Biegewinkel links (°)"},
 {k:"biegeRechts",   t:"Biegewinkel rechts (°)"},
 {k:"saum",          t:"Saum 180° beidseitig (mm)"}
];
function schritt4(){
 const a=aufnahme, p=a.profil, m=profilMasse(a);
 const vg=madBiegeVorgabe(m.gef);
 const hinweise=normHinweise(a);
 return karte("5 · Profil / Querschnitt",`<div class="p-grid">
${PROFIL_FELDER.map(f=>feld(f.t,
  `<input class="p-gross" type="number" inputmode="numeric" step="1" data-profil="${f.k}" value="${p[f.k]===""?"":zahl(p[f.k])}">`)).join("")}
${feld("Abwicklung",`<div class="p-gross" id="p-abwicklung" style="padding:12px 0">${mm(m.abwicklung)} mm</div>`)}
</div>
<label class="p-schalter"><input type="checkbox" id="p-wind"${p.windexponiert?" checked":""}> Windexponierte Lage</label>
<div class="p-klein-text">Bleibt ein Biegewinkel leer, gilt die Vorgabe aus dem Gefälle:
links ${Math.round(vg.links)}°, rechts ${Math.round(vg.rechts)}°. Die Abwicklung ist die
Summe der Schenkellängen und hängt nicht vom Biegewinkel ab.</div>
<div class="p-schnitt" id="p-schnitt">${profilSvg(a)}</div>`)
+karte("6 · Normkontrolle",`<div class="p-pruefung" id="p-norm">${
 hinweise.length?hinweise.map(t=>`<div class="p-warnung">⚠️ ${esc(t)}</div>`).join("")
 :`<div class="p-ok">Die Höhen entsprechen den Mindestwerten der Norm (${p.windexponiert?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE} mm).</div>`}</div>
<div class="p-klein-text">Die Hinweise kommen unverändert aus madNormHinweise() der
laufenden App – SIA 271, Dachrand: Aufkantung mindestens ${MAD_MIN_HOEHE} mm, in
windexponierter Lage ${MAD_MIN_HOEHE_WIND} mm. Es werden keine eigenen Werte gesetzt.</div>`);
}

// ---- Register 5 · Stückliste ----------------------------------------------
function schritt5(){
 const a=aufnahme;
 const st=stueckliste(a);
 if(!st.length)return karte("7 · Stückliste / Zuschnitt",
  '<div class="p-leer">Noch kein Zuschnittstück – zuerst den Verlauf erfassen.</div>');
 const zeilen=st.map(x=>`<tr${x.schieberIndex===null?' class="p-boden"':""}>
<td>${x.nr}</td>
<td>${esc(x.von)} → ${esc(x.bis)}</td>
<td class="p-num">${mm(x.abstand)}</td>
<td class="p-num"><b>${mm(x.zuschnitt)}</b></td>
<td class="p-num">${mm(x.pos)}</td>
</tr>`).join("");
 return karte("7 · Stückliste / Zuschnitt",`<div class="p-hinweis">Zuschnitt = Abstand + Zugabe je Ende.
Zugabe je Boden ${mm(madBodenMass)} mm, je Schieberseite ${mm(madSchieberMass)} mm
(Einstellungen). Gerechnet wird mit berechneMadStueckliste() der App.</div>
<div class="p-tabelle"><table>
<thead><tr><th>Nr.</th><th>Von → Bis</th><th class="p-num">Abstand (mm)</th><th class="p-num">Zuschnitt (mm)</th><th class="p-num">Position ab Start</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="p-zf-kopf">
<div><span>Stücke</span><b>${st.length}</b></div>
<div><span>Summe Zuschnitt</span><b>${mm(zuschnittSumme(a))} mm</b></div>
<div><span>Gesamtlänge</span><b>${mm(gesamtlaenge(a))} mm</b></div>
</div>
<div class="p-klein-text">Grün hinterlegte Zeilen enden an einer Segmentgrenze oder
an einem Boden, die übrigen an einem Schieber.</div>`);
}

// ---- Register 6 · Zuschnitt aus Rollenblech --------------------------------
function streifenVon(a,nr){
 const rp=madRollenPlan(a);
 const s=(rp.verteilung&&rp.verteilung.streifen)||[];
 const st=s[nr-1];
 if(!st)return "";
 return st.stuecke.map(x=>"Stück "+x.nr+" ("+mm(x.laenge)+" mm)").join(" + ")
  +" · Rest "+mm(st.rest)+" mm";
}
function schritt6(){
 const a=aufnahme;
 const rp=madRollenPlan(a);
 if(!madBleche(a).length)return karte("8 · Zuschnitt aus Rollenblech",
  '<div class="p-leer">Noch kein Zuschnittstück – zuerst den Verlauf erfassen.</div>');
 if(!aktiveRollenbreiten().length)return karte("8 · Zuschnitt aus Rollenblech",
  '<div class="p-warnung">Keine Rollenbreite angehakt. Unter ⚙️ Einstellungen mindestens eine wählen – sonst wird der Materialbedarf nicht gerechnet.</div>');
 const zuLang=(rp.verteilung&&rp.verteilung.zuLang)||[];
 const streifen=(rp.verteilung&&rp.verteilung.streifen)||[];
 const zeilen=rp.moeglich.map((m,i)=>`<tr${i===0?' class="p-boden"':""}>
<td class="p-num">${mm(m.breite)}</td>
<td class="p-num">${m.jeTafel}</td>
<td class="p-num">${m.tafeln}</td>
<td class="p-num">${qm(m.flaeche)}</td>
<td class="p-num"><b>${qm(m.verschnitt)}</b></td>
<td class="p-num">${m.anteil.toFixed(1).replace(".",",")} %</td>
</tr>`).join("");
 const streifenListe=streifen.map((s2,i)=>`<tr><td>${i+1}</td><td>${esc(streifenVon(a,i+1))}</td></tr>`).join("");
 return karte("8 · Zuschnitt aus Rollenblech",`<div class="p-hinweis">Von der Rolle wird eine <b>Tafel</b>
abgeschnitten und quer in Streifen von der Breite der Abwicklung geteilt. Ein
Streifen kann mehrere Stücke hintereinander aufnehmen.<br>
Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung) · Tafellänge = längstes
Stück · Tafeln = aufgerundet(Streifen ÷ Streifen je Tafel).</div>
${zuLang.length?`<div class="p-fehler">Stück ${zuLang.map(x=>x.nr).join(", ")} ist länger als die Tafel (${mm(rp.tafelLaenge)} mm) – dafür gibt es keine Verteilung.</div>`:""}
<div class="p-zf-kopf">
<div><span>Abwicklung</span><b>${mm(rp.abwicklung)} mm</b></div>
<div><span>Tafellänge</span><b>${mm(rp.tafelLaenge)} mm</b></div>
<div><span>Streifen</span><b>${streifen.length}</b></div>
<div><span>Zuschnitte netto</span><b>${qm(rp.netto)} m²</b></div>
</div>
${rp.moeglich.length?`<h3>Je Rollenbreite</h3>
<div class="p-tabelle"><table>
<thead><tr><th class="p-num">Rolle</th><th class="p-num">Str./Tafel</th><th class="p-num">Tafeln</th><th class="p-num">Fläche</th><th class="p-num">Verschnitt</th><th class="p-num">Anteil</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="p-ok">Am wenigsten Material: <b>${mm(rp.bestes.breite)} mm</b> –
${rp.bestes.tafeln} Tafel(n) à ${mm(rp.tafelLaenge)} mm, ${qm(rp.bestes.verschnitt)} m² Verschnitt.</div>`
:`<div class="p-warnung">Keine der angehakten Rollen ist breit genug für eine
Abwicklung von ${mm(rp.abwicklung)} mm${rp.zuSchmal.length?" (zu schmal: "+rp.zuSchmal.map(b=>mm(b)+" mm").join(", ")+")":""}.</div>`}
${streifen.length?`<h3>Streifen</h3>
<div class="p-tabelle"><table>
<thead><tr><th>Nr.</th><th>Belegung</th></tr></thead>
<tbody>${streifenListe}</tbody></table></div>`:""}
${rp.verteilung&&rp.verteilung.optimal===false
 ?'<div class="p-warnung">Die Suche wurde abgebrochen. Das ist die <b>beste gefundene</b> Verteilung, nicht sicher die beste mögliche.</div>':""}
<div class="p-klein-text">Gerechnet ohne Schnittfuge und ohne Wiederverwendung von
Reststücken – wie bei den übrigen Modulen.</div>`);
}

// ---- Register 7 · Ausmass --------------------------------------------------
function schritt7(){
 const a=aufnahme;
 const z=ausmassZeilen(a);
 if(!z.length)return karte("9 · Ausmass",
  '<div class="p-leer">Noch nichts abzuleiten – zuerst den Verlauf erfassen.</div>');
 return karte("9 · Ausmass",`<div class="p-hinweis">Vollständig aus den erfassten Daten abgeleitet –
keine zweite Eingabe. Ohne Artikelnummern und ohne Preise: die kommen später aus
der firmeneigenen Materialliste.</div>
<div class="p-tabelle"><table>
<thead><tr><th>Position</th><th class="p-num">Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${esc(x.was)}</td><td class="p-num"><b>${esc(x.menge)}</b></td><td>${esc(x.einheit)}</td><td class="p-quelle">${esc(x.quelle)}</td></tr>`).join("")}</tbody>
</table></div>
<h3>Materialangaben</h3>
<div class="p-tabelle"><table><tbody>
${materialUebersicht(a).map(x=>`<tr><td>${esc(x.was)}</td><td class="p-num"><b>${esc(x.wert)}</b></td></tr>`).join("")}
</tbody></table></div>`);
}

// ---- Register 8 · Kontrolle ------------------------------------------------
function schritt8(){
 const r=pruefungen(aufnahme);
 const fehler=r.filter(x=>x.art==="fehler"), warn=r.filter(x=>x.art==="warnung");
 const inhalt=r.length
  ?fehler.map(x=>`<div class="p-fehler">✖ ${esc(x.text)}</div>`).join("")
   +warn.map(x=>`<div class="p-warnung">⚠️ ${esc(x.text)}</div>`).join("")
  :'<div class="p-ok">✓ Alles vollständig – keine Fehler und keine Hinweise.</div>';
 return karte("10 · Kontrolle",`<div class="p-pruefung">${inhalt}</div>
<div class="p-zf-kopf">
<div><span>Fehler</span><b class="${fehler.length?"p-warnwert":""}">${fehler.length}</b></div>
<div><span>Hinweise</span><b>${warn.length}</b></div>
</div>
<div class="p-klein-text">Geprüft werden fehlende Masse, ungültige Zahlen, Verlauf,
Boden, Schieber, Profil, Normhinweise, Ausmass und Zuschnitt.</div>`);
}

// ---- Register 9 · Fotos, Skizze, Notiz, Speichern --------------------------
function schritt9(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto"><img src="${f}" alt="Foto ${i+1}">
<button type="button" class="p-weg" data-foto-weg="${i}">×</button></div>`).join("");
 return karte("11 · Fotos, Skizze und Notiz",`<div class="p-hinweis">Wie bei den fertigen Modulen kommen
Fotos, Skizze und Notiz erst am Schluss. Beim erneuten Öffnen sind sie wieder da.</div>
<label class="p-datei" for="p-fotoInput">📷 Foto aufnehmen oder wählen</label>
<input id="p-fotoInput" type="file" accept="image/*" multiple hidden>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
<h3>Skizze</h3>
${a.skizze?`<div class="p-fotos"><div class="p-foto gross"><img src="${a.skizze}" alt="Skizze">
<button type="button" class="p-weg" id="p-skizzeWeg">×</button></div></div>`
:'<div class="p-leer">Noch keine Skizze.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-grau" id="p-skizzeOeffnen">✏️ Skizze zeichnen</button></div>
<div class="p-skizzeBox" id="p-skizzeBox" hidden>
<canvas id="p-skizzeCanvas"></canvas>
<div class="p-knopfreihe">
<button type="button" class="p-gruen" id="p-skizzeSpeichern">✓ Übernehmen</button>
<button type="button" class="p-grau" id="p-skizzeLeeren">Leeren</button>
<button type="button" class="p-grau" id="p-skizzeAbbrechen">Abbrechen</button>
</div></div>
<h3>Notiz</h3>
<textarea id="p-bemerkung" rows="4" placeholder="Bemerkungen zur Massaufnahme">${esc(a.bemerkung)}</textarea>
<div class="p-knopfreihe"><button type="button" class="p-gruen" id="p-fertigSpeichern">💾 Massaufnahme speichern</button></div>`);
}

// ---- 9. Zeichnen und Blättern ----------------------------------------------
let listeOffen=false, einstellungenOffen=false;
function inhaltHtml(){
 return [schritt1,schritt2,schritt3,schritt4,schritt5,schritt6,schritt7,schritt8,schritt9][schritt-1]();
}
function zeichne(){
 const reg=$("p-registerBox"); if(reg)reg.innerHTML=registerHtml();
 const inhalt=$("p-inhalt"); if(inhalt)inhalt.innerHTML=inhaltHtml();
 const zurueck=$("p-zurueck"), weiter=$("p-weiter");
 if(zurueck)zurueck.disabled=schritt<=1;
 if(weiter){
  weiter.disabled=false;
  weiter.textContent=schritt>=SCHRITTE.length?"Fertig › Speichern":"Weiter › "+SCHRITTE[schritt];
 }
 const listeBox=$("p-listeBox");
 if(listeBox){listeBox.hidden=!listeOffen; if(listeOffen)listeBox.innerHTML=listeHtml()}
 const einstBox=$("p-einstBox");
 if(einstBox){einstBox.hidden=!einstellungenOffen; if(einstellungenOffen)einstBox.innerHTML=einstellungenHtml()}
 // Das aktive Register muss in der seitwärts scrollenden Leiste sichtbar sein.
 const strip=$("p-register"), aktiv=strip&&strip.querySelector(".p-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
function setzeSchritt(n){
 schritt=Math.max(1,Math.min(SCHRITTE.length,Number(n)||1));
 zeichne();
 const kopf=$("p-registerBox");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function live(){
 const a=aufnahme;
 const gr=$("p-grundriss"); if(gr)gr.innerHTML=grundrissHtml(a);
 const sn=$("p-schnitt"); if(sn)sn.innerHTML=profilSvg(a);
 const ab=$("p-abwicklung"); if(ab)ab.textContent=mm(profilMasse(a).abwicklung)+" mm";
 const norm=$("p-norm");
 if(norm){
  const h=normHinweise(a);
  norm.innerHTML=h.length?h.map(t=>`<div class="p-warnung">⚠️ ${esc(t)}</div>`).join("")
   :`<div class="p-ok">Die Höhen entsprechen den Mindestwerten der Norm (${a.profil.windexponiert?MAD_MIN_HOEHE_WIND:MAD_MIN_HOEHE} mm).</div>`;
 }
 const seg=$("p-zfSeg"); if(seg)seg.textContent=(a.segmente||[]).length;
 const L=$("p-zfLaenge"); if(L)L.textContent=gesamtlaenge(a)>0?mm(gesamtlaenge(a))+" mm":"–";
 const ec=$("p-zfEcken"); if(ec)ec.textContent=eckenAnzahl(a);
 const sc=$("p-zfSchieber"); if(sc)sc.textContent=schieberAktiv(a).length;
 const bo=$("p-zfBoden"); if(bo)bo.textContent=bodenAnzahl(a);
}

function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const L=(a.segmente||[]).reduce((s,x)=>s+zahl(x.laenge),0);
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b><span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">${(a.segmente||[]).length} Segment(e) · ${L>0?mm(L)+" mm":"–"} · ${(a.fotos||[]).length} Foto(s)${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}

// Zuschnittzugaben. In der App stehen sie firmenweit in app_settings.
const EINST_FELDER=[
 {k:"boden_mass",   t:"Zugabe je Boden (mm)"},
 {k:"schieber_mass",t:"Zugabe je Schieberseite (mm)"}
];
function einstellungenHtml(){
 return `<div class="p-grid">${EINST_FELDER.map(f=>feld(f.t,
  `<input class="p-gross" type="number" inputmode="numeric" step="1" data-einst="${f.k}" value="${zahl(madZugaben[f.k])}">`)).join("")}</div>
<h3>Rollenbreiten für den Zuschnitt</h3>
<div class="p-schalter-reihe">${rollenbreiten.map(r=>`<label class="p-schalter">
<input type="checkbox" data-rolle="${r.breite}"${r.aktiv?" checked":""}> ${mm(r.breite)} mm</label>`).join("")}</div>
<div class="p-klein-text">1'000 mm und 670 mm sind die Standardrollen. Ist keine
angehakt, wird der Materialbedarf nicht gerechnet. In der App stehen dieselben
Breiten firmenweit in app_settings.blech_rollenbreiten.</div>
<div class="p-knopfreihe"><button type="button" class="p-grau" id="p-einstZurueck">↻ Standardwerte</button></div>
<div class="p-klein-text">Im Prototyp gerätebezogen gespeichert; in der App stehen
dieselben zwei Werte firmenweit unter Einstellungen → Massaufnahmen.
Vorgaben: Boden ${MAD_ZUGABE_STANDARD.boden_mass} mm · Schieber ${MAD_ZUGABE_STANDARD.schieber_mass} mm.
Die Abstände zwischen zwei Schiebern kommen dagegen aus dem Material-Katalog und
lassen sich hier bewusst nicht ändern.</div>`;
}

// ---- 10. Bilder ------------------------------------------------------------
const FOTO_MAXKANTE=1280, FOTO_QUALITAET=0.72;
function bildVerkleinern(datei){
 return new Promise(fertig=>{
  const leser=new FileReader();
  leser.onerror=()=>fertig(null);
  leser.onload=()=>{
   const bild=new Image();
   bild.onerror=()=>fertig(null);
   bild.onload=()=>{
    const f=Math.min(1,FOTO_MAXKANTE/Math.max(bild.width,bild.height));
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(bild.width*f));
    c.height=Math.max(1,Math.round(bild.height*f));
    c.getContext("2d").drawImage(bild,0,0,c.width,c.height);
    try{fertig(c.toDataURL("image/jpeg",FOTO_QUALITAET))}catch(e){fertig(null)}
   };
   bild.src=leser.result;
  };
  leser.readAsDataURL(datei);
 });
}
async function fotosAufnehmen(dateien){
 for(const d of Array.from(dateien||[])){
  const bild=await bildVerkleinern(d);
  if(bild)aufnahme.fotos.push(bild);
 }
 zeichne();
}
let skizzeCtx=null, skizzeZeichnet=false;
function skizzeOeffnen(){
 const box=$("p-skizzeBox"), c=$("p-skizzeCanvas");
 if(!box||!c)return;
 box.hidden=false;
 const b=c.getBoundingClientRect();
 c.width=Math.max(320,Math.round(b.width||480));
 c.height=Math.round(c.width*0.62);
 skizzeCtx=c.getContext("2d");
 skizzeCtx.fillStyle="#fff"; skizzeCtx.fillRect(0,0,c.width,c.height);
 skizzeCtx.strokeStyle="#17202a"; skizzeCtx.lineWidth=3;
 skizzeCtx.lineCap="round"; skizzeCtx.lineJoin="round";
 if(aufnahme.skizze){
  const alt=new Image();
  alt.onload=()=>skizzeCtx.drawImage(alt,0,0,c.width,c.height);
  alt.src=aufnahme.skizze;
 }
}
function skizzePunkt(ev,c){
 const b=c.getBoundingClientRect();
 const t=(ev.touches&&ev.touches[0])||ev;
 return [(t.clientX-b.left)*(c.width/b.width),(t.clientY-b.top)*(c.height/b.height)];
}

// ---- 11. Bedienung ---------------------------------------------------------
// Eine einzige Stelle je Ereignisart, delegiert von der Wurzel.
function verdrahten(){
 const w=$("p-app");
 if(!w||w.dataset.verdrahtet)return;
 w.dataset.verdrahtet="1";

 w.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=aufnahme;
  let nurLive=false;
  if(t.id==="p-bezeichnung")a.bezeichnung=t.value;
  else if(t.id==="p-objekt")a.objekt=t.value;
  else if(t.id==="p-bemerkung")a.bemerkung=t.value;
  else if(d.segLaenge!==undefined){
   const i=Number(d.segLaenge);
   if(a.segmente[i]){a.segmente[i].laenge=zahl(t.value);schieberNeuAusRechnung();nurLive=true}
  }
  else if(d.segWinkel!==undefined){
   const i=Number(d.segWinkel);
   if(a.segmente[i]){a.segmente[i].winkel=zahl(t.value);schieberNeuAusRechnung();nurLive=true}
  }
  else if(d.profil!==undefined){
   // Leeres Feld bleibt leer, damit die Vorgabe aus dem Gefälle greifen kann.
   a.profil[d.profil]=t.value===""?"":zahl(t.value);
   nurLive=true;
  }
  else if(d.schieberPos!==undefined){
   const i=Number(d.schieberPos);
   if(a.schieber[i]){a.schieber[i].posAbStart=zahl(t.value);nurLive=true}
  }
  else if(d.einst!==undefined){
   madZugaben[d.einst]=zahl(t.value);
   madZugabenSpeichern(); nurLive=true;
  }
  else return;
  if(nurLive)live();
 });

 w.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=aufnahme;
  if(t.id==="p-datum"){a.datum=t.value;return}
  if(t.id==="p-material"){a.material=t.value;schieberNeuAusRechnung();zeichne();return}
  if(t.id==="p-fotoInput"){fotosAufnehmen(t.files);return}
  if(t.id==="p-wind"){a.profil.windexponiert=t.checked;zeichne();return}
  if(t.id==="p-manuell"){
   a.schieberManuell=t.checked;
   // Beim Umschalten auf "von Hand" wird die gerechnete Liste übernommen -
   // so wie in der App, wo madSchieber genau diese Werte enthält.
   if(t.checked)a.schieber=verlaufDaten(a).schieber.map(x=>({posAbStart:x.posAbStart}));
   else a.schieber=verlaufDaten(a).schieber;
   zeichne(); return;
  }
  if(t.id==="p-bodenL"||t.id==="p-bodenR"){
   const s=a.segmente;
   if(!s.length)return;
   if(t.id==="p-bodenL")s[0].bodenLinks=t.checked;
   else s[s.length-1].bodenRechts=t.checked;
   schieberNeuAusRechnung(); zeichne(); return;
  }
  if(d.segBodenL!==undefined){
   const i=Number(d.segBodenL);
   if(a.segmente[i]){a.segmente[i].bodenLinks=t.checked;schieberNeuAusRechnung();zeichne()}
   return;
  }
  if(d.segBodenR!==undefined){
   const i=Number(d.segBodenR);
   if(a.segmente[i]){a.segmente[i].bodenRechts=t.checked;schieberNeuAusRechnung();zeichne()}
   return;
  }
  if(d.schieberPos!==undefined){
   a.schieber.sort((x,y)=>zahl(x.posAbStart)-zahl(y.posAbStart));
   zeichne(); return;
  }
  if(d.rolle!==undefined){
   const r2=rollenbreiten.find(x=>String(x.breite)===String(d.rolle));
   if(r2)r2.aktiv=t.checked;
   rollenSpeichern(); zeichne(); return;
  }
 });

 w.addEventListener("click",e=>{
  const t=e.target.closest("button,label,[data-schritt],[data-oeffnen],[data-kopieren],[data-loeschen]");
  if(!t)return;
  const d=t.dataset||{}, a=aufnahme;
  if(d.schritt!==undefined){setzeSchritt(d.schritt);return}
  if(t.id==="p-zurueck"){setzeSchritt(schritt-1);return}
  if(t.id==="p-weiter"){
   if(schritt>=SCHRITTE.length){
    if(speichern()){t.textContent="✓ Gespeichert";setTimeout(zeichne,1400)}
    return;
   }
   setzeSchritt(schritt+1);return;
  }
  if(t.id==="p-speichern"||t.id==="p-fertigSpeichern"){
   const alt=t.textContent;
   if(speichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent=alt},1400)}
   return;
  }
  if(t.id==="p-neu"){
   if(confirm("Neue Massaufnahme beginnen? Nicht Gespeichertes geht verloren."))
    {aufnahme=leereAufnahme();schritt=1;zeichne()}
   return;
  }
  if(t.id==="p-kopieren"){
   if(!kopieren(aufnahme.id)){
    alert("Diese Massaufnahme ist noch nicht gespeichert. Bitte zuerst speichern.");
    return;
   }
   alert("Kopie angelegt: „"+(aufnahme.bezeichnung||"Ohne Bezeichnung")
     +"“. Sie ist von der ursprünglichen Aufnahme unabhängig.");
   return;
  }
  if(t.id==="p-listeAuf"){listeOffen=!listeOffen;zeichne();return}
  if(t.id==="p-einstAuf"){einstellungenOffen=!einstellungenOffen;zeichne();return}
  if(t.id==="p-einstZurueck"){
   madZugaben={...MAD_ZUGABE_STANDARD};
   rollenbreiten=ROLLEN_WAEHLBAR.map(b=>({breite:b,aktiv:ROLLEN_STANDARD.indexOf(b)>=0}));
   madZugabenSpeichern(); rollenSpeichern(); zeichne(); return;
  }
  if(d.oeffnen!==undefined){oeffnen(d.oeffnen);return}
  if(d.kopieren!==undefined){kopieren(d.kopieren);return}
  if(d.loeschen!==undefined){
   if(confirm("Diese gespeicherte Massaufnahme wirklich löschen?")){loeschen(d.loeschen);zeichne()}
   return;
  }
  if(t.id==="p-segPlus"){segmentAnhaengen();zeichne();return}
  if(d.segWeg!==undefined){
   if(confirm("Segment "+(Number(d.segWeg)+1)+" wirklich löschen?")){
    segmentLoeschen(Number(d.segWeg)); zeichne();
   }
   return;
  }
  if(d.segHoch!==undefined){segmentSchieben(Number(d.segHoch),-1);zeichne();return}
  if(d.segRunter!==undefined){segmentSchieben(Number(d.segRunter),1);zeichne();return}
  if(d.segFlip!==undefined){
   const i=Number(d.segFlip);
   if(a.segmente[i]){a.segmente[i].winkel=-zahl(a.segmente[i].winkel);schieberNeuAusRechnung();zeichne()}
   return;
  }
  if(t.id==="p-schieberPlus"){
   const L=gesamtlaenge(a);
   const pos=Number(prompt("Position ab Start (mm):","0"));
   if(!Number.isFinite(pos)||pos<=0||pos>=L){
    alert("Position muss zwischen 0 und "+Math.round(L)+" mm liegen.");return;
   }
   a.schieber.push({posAbStart:pos});
   a.schieber.sort((x,y)=>zahl(x.posAbStart)-zahl(y.posAbStart));
   zeichne(); return;
  }
  if(d.schieberWeg!==undefined){a.schieber.splice(Number(d.schieberWeg),1);zeichne();return}
  if(t.id==="p-schieberAuto"){
   a.schieberManuell=false;
   a.schieber=verlaufDaten(a).schieber;
   zeichne(); return;
  }
  if(d.fotoWeg!==undefined){a.fotos.splice(Number(d.fotoWeg),1);zeichne();return}
  if(t.id==="p-skizzeWeg"){
   if(confirm("Skizze wirklich löschen?")){a.skizze=null;zeichne()}
   return;
  }
  if(t.id==="p-skizzeOeffnen"){skizzeOeffnen();return}
  if(t.id==="p-skizzeLeeren"){
   const c=$("p-skizzeCanvas");
   if(c&&skizzeCtx){skizzeCtx.fillStyle="#fff";skizzeCtx.fillRect(0,0,c.width,c.height);skizzeCtx.strokeStyle="#17202a"}
   return;
  }
  if(t.id==="p-skizzeAbbrechen"){$("p-skizzeBox").hidden=true;return}
  if(t.id==="p-skizzeSpeichern"){
   const c=$("p-skizzeCanvas");
   if(c){try{aufnahme.skizze=c.toDataURL("image/png")}catch(err){}}
   $("p-skizzeBox").hidden=true; zeichne(); return;
  }
 });

 // Zeichenfläche
 const zeichnen=ev=>{
  const c=$("p-skizzeCanvas"); if(!c||!skizzeCtx||!skizzeZeichnet)return;
  const [x,y]=skizzePunkt(ev,c); skizzeCtx.lineTo(x,y); skizzeCtx.stroke(); ev.preventDefault();
 };
 const start=ev=>{
  const c=$("p-skizzeCanvas"); if(!c||!skizzeCtx)return;
  if(!(ev.target===c))return;
  skizzeZeichnet=true; const [x,y]=skizzePunkt(ev,c);
  skizzeCtx.beginPath(); skizzeCtx.moveTo(x,y); ev.preventDefault();
 };
 const stopp=()=>{skizzeZeichnet=false};
 w.addEventListener("mousedown",start); w.addEventListener("mousemove",zeichnen);
 window.addEventListener("mouseup",stopp);
 w.addEventListener("touchstart",start,{passive:false});
 w.addEventListener("touchmove",zeichnen,{passive:false});
 window.addEventListener("touchend",stopp);
}

// ---- 12. Start -------------------------------------------------------------
if(typeof document!=="undefined"&&document.getElementById("p-app")){
 verdrahten();
 zeichne();
}
