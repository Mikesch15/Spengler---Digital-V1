"use strict";
// ===========================================================================
// PROTOTYP · Massaufnahme "Rinne Halbrund"
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, NICHT eine Parallel-Lösung.
// Die gesamte Fachrechnung kommt unverändert aus js/12-rinne-halbrund.js
// (siehe bruecke.js). Neu ist alles, was der Auftrag zusätzlich verlangt:
// Grunddaten, Abläufe, Halter, Endstücke, Verbinder, Dehnung, Sonderteile,
// Fotos, Skizze, Plausibilität, Zusammenfassung, Ausmass, Material,
// Kopieren, lokales Speichern und ein Ablauf in sechs Schritten.
// ===========================================================================

// ---- 1. Grunddaten -------------------------------------------------------
const RG_GROESSEN=["RG 200","RG 250","RG 280","RG 333","RG 400","RG 500","andere"];
const ABLAUF_DURCHMESSER=["Ø 80","Ø 100","Ø 120","Ø 125","Ø 150","anderer"];
const FALLROHR_STATUS=["bestehend","neu","unbekannt"];
// Fitting-IDs aus dem bestehenden Katalog: die Ecke ist dort bereits als
// Fixpunkt hinterlegt, dadurch wirkt sie automatisch auf die Dila-Abstände.
const ECKE_AUSSEN_ID=2, ECKE_INNEN_ID=3;

function leereAufnahme(){
 return {
  id:"ra_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  typ:"rinne_halbrund",
  erstellt:new Date().toISOString(),
  geaendert:new Date().toISOString(),
  bezeichnung:"",
  material:3,                 // Kupfer
  groesse:"RG 333",
  groesseFrei:"",
  gesamtlaengeManuell_mm:null,
  // Verlauf: exakt die Struktur des bestehenden Moduls
  segmente:[{laenge:0,linksTyp:"",rechtsTyp:"",winkel:0}],
  ablaeufe:[],
  halter:{anzahl:null,abstand_mm:500,typ:""},
  endstuecke:{links:true,rechts:true},
  verbinder:{anzahl:0,bemerkung:""},
  dehnung:{art:"keine",anzahl:0},
  sonderteile:[],
  fotos:[],
  skizze:null,
  bemerkung:""
 };
}

let aufnahme=leereAufnahme();
let schritt=1;
const SCHRITTE=["Grunddaten","Verlauf","Komponenten","Fotos & Skizze","Kontrolle","Ausmass & Material"];

// ---- 2. Lokal speichern --------------------------------------------------
const SPEICHER="sd_prototyp_rinne_halbrund";
function alleAufnahmen(){
 try{const a=JSON.parse(localStorage.getItem(SPEICHER)||"[]");return Array.isArray(a)?a:[]}
 catch(e){return []}
}
function speichereAlle(liste){
 try{localStorage.setItem(SPEICHER,JSON.stringify(liste));return true}
 catch(e){alert("Speichern nicht möglich: "+e.message);return false}
}
function aufnahmeSpeichern(){
 aufnahme.geaendert=new Date().toISOString();
 const liste=alleAufnahmen();
 const i=liste.findIndex(a=>a.id===aufnahme.id);
 if(i>=0)liste[i]=JSON.parse(JSON.stringify(aufnahme));
 else liste.unshift(JSON.parse(JSON.stringify(aufnahme)));
 return speichereAlle(liste);
}
function aufnahmeLaden(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 aufnahme=Object.assign(leereAufnahme(),JSON.parse(JSON.stringify(a)));
 return true;
}
// Kopieren: neue, unabhängige Aufnahme mit eigener ID (Auftrag 23).
function aufnahmeKopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return null;
 const k=JSON.parse(JSON.stringify(a));
 k.id="ra_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 k.erstellt=k.geaendert=new Date().toISOString();
 k.bezeichnung=(k.bezeichnung||"Rinne")+" (Kopie)";
 const liste=alleAufnahmen();
 liste.unshift(k);
 speichereAlle(liste);
 return k;
}

// ---- 3. Ableitungen ------------------------------------------------------
const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function mm(v){return Math.round(zahl(v)).toLocaleString("de-CH")}
function meter(v){return (Math.round(zahl(v))/1000).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}
function groesseText(a){
 return a.groesse==="andere"?(a.groesseFrei||"andere Grösse"):a.groesse;
}
function materialText(a){
 const m=findMeasurementMaterial(a.material);
 return m?m.name:"–";
}

// Gesamtlänge aus den Abschnitten – die einzige Quelle für alle Folgewerte.
function gesamtlaengeBerechnet(a){
 return (a.segmente||[]).reduce((s,seg)=>s+zahl(seg.laenge),0);
}

// Ecken entstehen aus dem Verlauf (Auftrag 12): der Winkel steht wie im
// bestehenden Modul am Abschnitt und meint die Richtungsänderung danach.
// Vorzeichen wie im Katalog: negativ = Aussenwinkel, positiv = Innenwinkel.
function eckenAusVerlauf(a){
 const ecken=[];
 let pos=0;
 (a.segmente||[]).forEach((seg,i)=>{
  pos+=zahl(seg.laenge);
  const w=zahl(seg.winkel);
  if(w!==0&&i<a.segmente.length-1){
   ecken.push({nachAbschnitt:i,pos_mm:pos,winkel:Math.abs(w),
               art:w<0?"aussen":"innen"});
  }
 });
 return ecken;
}

// Vorschlag für die Halteranzahl (Auftrag 9). Der Benutzer darf ihn
// jederzeit überschreiben – deshalb nur ein Vorschlag, keine Festlegung.
function halterVorschlag(a){
 const L=gesamtlaengeBerechnet(a);
 const d=zahl(a.halter.abstand_mm);
 if(L<=0||d<=0)return null;
 return Math.ceil(L/d)+1;
}
function halterAnzahl(a){
 return a.halter.anzahl!==null&&a.halter.anzahl!==undefined&&a.halter.anzahl!==""
  ?Math.max(0,Math.round(zahl(a.halter.anzahl)))
  :(halterVorschlag(a)||0);
}

// Dilas: unverändert die Rechnung des bestehenden Moduls.
function dilasBerechnet(a){
 if(!(a.segmente||[]).length)return {dilas:[],tabelle:rinneMaterialTabelle(a.material),boundaries:[]};
 return calcRinneDilas(a.segmente,a.material);
}

// ---- 4. Plausibilität (Auftrag 18) --------------------------------------
function pruefungen(a){
 const meldungen=[];
 const L=gesamtlaengeBerechnet(a);
 const segs=a.segmente||[];
 if(!segs.length||L<=0)meldungen.push({art:"fehler",text:"Es ist noch kein Rinnenabschnitt mit einer Länge erfasst."});
 segs.forEach((s,i)=>{
  if(zahl(s.laenge)<0)meldungen.push({art:"fehler",text:`Abschnitt ${i+1} hat eine negative Länge.`});
  const w=zahl(s.winkel);
  if(w<-180||w>180)meldungen.push({art:"fehler",text:`Der Winkel nach Abschnitt ${i+1} liegt ausserhalb von −180° bis 180°.`});
 });
 if(L>0&&L<300)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${mm(L)} mm ist auffällig kurz – bitte prüfen.`});
 if(L>200000)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${meter(L)} m ist auffällig lang – bitte prüfen.`});
 // Manuelle Gesamtlänge gegen die Summe der Abschnitte
 const man=a.gesamtlaengeManuell_mm;
 if(man!==null&&man!==undefined&&man!==""&&zahl(man)>0&&L>0){
  const diff=Math.round(zahl(man)-L);
  if(diff!==0){
   meldungen.push({art:"warnung",
    text:`Die Abschnitte ergeben ${mm(L)} mm, die angegebene Gesamtlänge beträgt ${mm(man)} mm. `
        +`Differenz ${diff>0?"+":""}${mm(diff)} mm.`});
  }
 }
 (a.ablaeufe||[]).forEach((ab,i)=>{
  const p=zahl(ab.pos_mm);
  if(p<0||p>L)meldungen.push({art:"fehler",text:`Ablauf ${i+1} liegt ausserhalb der aufgenommenen Rinne (${mm(p)} mm von ${mm(L)} mm).`});
 });
 if(zahl(a.halter.abstand_mm)<0)meldungen.push({art:"fehler",text:"Der Halterabstand darf nicht negativ sein."});
 if(a.halter.anzahl!==null&&a.halter.anzahl!==""&&zahl(a.halter.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Halteranzahl darf nicht negativ sein."});
 if(zahl(a.verbinder.anzahl)<0)meldungen.push({art:"fehler",text:"Die Anzahl Verbinder darf nicht negativ sein."});
 if(a.dehnung.art==="dehnungsstueck"&&zahl(a.dehnung.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Anzahl Dehnungsstücke darf nicht negativ sein."});
 (a.sonderteile||[]).forEach((s,i)=>{
  if(zahl(s.anzahl)<0)meldungen.push({art:"fehler",text:`Sonderteil ${i+1} hat eine negative Anzahl.`});
  if(!String(s.bezeichnung||"").trim())meldungen.push({art:"warnung",text:`Sonderteil ${i+1} hat keine Bezeichnung.`});
 });
 return meldungen;
}
function hatFehler(a){return pruefungen(a).some(m=>m.art==="fehler")}

// ---- 5. Komponenten, Ausmass, Material (Auftrag 19–21) -------------------
// EINE Ableitung – Zusammenfassung, Ausmass und Materialübersicht lesen
// alle aus derselben Liste. Nichts wird doppelt gerechnet oder von Hand
// nachgetragen.
function komponenten(a){
 const g=groesseText(a);
 const L=gesamtlaengeBerechnet(a);
 const ecken=eckenAusVerlauf(a);
 const innen=ecken.filter(e=>e.art==="innen").length;
 const aussen=ecken.filter(e=>e.art==="aussen").length;
 const liste=[];
 if(L>0)liste.push({schluessel:"rinne",bezeichnung:`Rinne halbrund ${g} ${materialText(a)}`,
                    menge:Math.round(L)/1000,einheit:"m",herkunft:"Verlauf"});
 const nHalter=halterAnzahl(a);
 if(nHalter>0)liste.push({schluessel:"halter",bezeichnung:`Rinnenhalter ${g}`+(a.halter.typ?` (${a.halter.typ})`:""),
                          menge:nHalter,einheit:"Stk.",herkunft:a.halter.anzahl?"Eingabe":"Vorschlag aus Länge/Abstand"});
 if(innen)liste.push({schluessel:"innenwinkel",bezeichnung:`Innenwinkel ${g}`,menge:innen,einheit:"Stk.",herkunft:"Verlauf"});
 if(aussen)liste.push({schluessel:"aussenwinkel",bezeichnung:`Aussenwinkel ${g}`,menge:aussen,einheit:"Stk.",herkunft:"Verlauf"});
 // Abläufe nach Durchmesser gruppieren
 const nachD={};
 (a.ablaeufe||[]).forEach(ab=>{const d=ab.durchmesser||"Ø ?";nachD[d]=(nachD[d]||0)+1});
 Object.keys(nachD).sort().forEach(d=>{
  liste.push({schluessel:"ablauf_"+d,bezeichnung:`Einhangstutzen ${g} ${d}`,menge:nachD[d],einheit:"Stk.",herkunft:"Abläufe"});
 });
 if(a.endstuecke.links)liste.push({schluessel:"endstueck_l",bezeichnung:`Endstück links ${g}`,menge:1,einheit:"Stk.",herkunft:"Eingabe"});
 if(a.endstuecke.rechts)liste.push({schluessel:"endstueck_r",bezeichnung:`Endstück rechts ${g}`,menge:1,einheit:"Stk.",herkunft:"Eingabe"});
 const nVerb=Math.round(zahl(a.verbinder.anzahl));
 if(nVerb>0)liste.push({schluessel:"verbinder",bezeichnung:`Rinnenverbinder ${g}`,menge:nVerb,einheit:"Stk.",herkunft:"Eingabe"});
 if(a.dehnung.art==="dehnungsstueck"){
  const nD=Math.round(zahl(a.dehnung.anzahl));
  if(nD>0)liste.push({schluessel:"dehnung",bezeichnung:`Dehnungsstück ${g}`,menge:nD,einheit:"Stk.",herkunft:"Eingabe"});
 }
 (a.sonderteile||[]).forEach((s,i)=>{
  const n=Math.round(zahl(s.anzahl));
  if(n>0)liste.push({schluessel:"sonderteil_"+i,bezeichnung:String(s.bezeichnung||"Sonderteil").trim()||"Sonderteil",
                     menge:n,einheit:"Stk.",herkunft:"Sonderteil",bemerkung:s.bemerkung||""});
 });
 return liste;
}
function ausmassZeilen(a){
 // Das Ausmass IST die Komponentenliste – die Positionen werden nirgends
 // ein zweites Mal eingegeben (Auftrag 20).
 return komponenten(a).map((k,i)=>({
  pos:i+1,
  bezeichnung:k.bezeichnung,
  menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,
  herkunft:k.herkunft
 }));
}
function materialUebersicht(a){
 // Bewusst OHNE Artikelnummern und Preise (Auftrag 21): die kommen später
 // aus der firmenindividuellen Materialliste.
 const mat=materialText(a);
 return komponenten(a).map(k=>({
  bezeichnung:k.bezeichnung,menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,material:mat
 }));
}

// ---- 6. Verlaufsband ------------------------------------------------------
// Neue, ergänzende Ansicht: der ganze Verlauf von START bis ENDE als gerades
// Band. Darauf sitzen Ecken, Abläufe und Dilas an ihrer echten Position.
// Genau dafür gedacht, auf dem Tablet in einem Blick zu prüfen, ob ein
// Ablauf an der richtigen Stelle liegt. Der massstäbliche Grundriss kommt
// weiterhin unverändert aus dem bestehenden Modul.
function verlaufsBandSvg(a){
 const L=gesamtlaengeBerechnet(a);
 if(L<=0)return '<div class="p-leer">Noch kein Abschnitt erfasst.</div>';
 const W=680,H=118,l=40,r=W-40,y=62;
 const x=p=>l+(r-l)*Math.max(0,Math.min(1,zahl(p)/L));
 let s=`<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="#17202a" stroke-width="7" stroke-linecap="round"/>`;
 s+=`<text x="${l}" y="${y+30}" font-size="12" text-anchor="middle" fill="#68737d" font-weight="700">START</text>`;
 s+=`<text x="${r}" y="${y+30}" font-size="12" text-anchor="middle" fill="#68737d" font-weight="700">ENDE</text>`;
 s+=`<text x="${(l+r)/2}" y="${y+30}" font-size="12" text-anchor="middle" fill="#1769aa" font-weight="700">${esc(mm(L))} mm</text>`;
 // Abschnittsgrenzen
 let pos=0;
 (a.segmente||[]).forEach((seg,i)=>{
  const von=pos; pos+=zahl(seg.laenge);
  const xm=(x(von)+x(pos))/2;
  s+=`<text x="${xm.toFixed(1)}" y="${y-16}" font-size="11" text-anchor="middle" fill="#17202a" font-weight="700">${esc(mm(seg.laenge))}</text>`;
  if(i<a.segmente.length-1)
   s+=`<line x1="${x(pos).toFixed(1)}" y1="${y-9}" x2="${x(pos).toFixed(1)}" y2="${y+9}" stroke="#9bb0c1" stroke-width="2"/>`;
 });
 // Ecken
 eckenAusVerlauf(a).forEach(e=>{
  const px=x(e.pos_mm);
  s+=`<polygon points="${px.toFixed(1)},${y-20} ${(px+9).toFixed(1)},${y-8} ${(px-9).toFixed(1)},${y-8}" fill="#0f766e"/>`;
  s+=`<text x="${px.toFixed(1)}" y="${y-26}" font-size="10" text-anchor="middle" fill="#0f766e" font-weight="700">${e.art==="innen"?"IE":"AE"} ${e.winkel}°</text>`;
 });
 // Abläufe
 (a.ablaeufe||[]).forEach((ab,i)=>{
  const p=zahl(ab.pos_mm);
  const draussen=p<0||p>L;
  const px=x(p);
  s+=`<circle cx="${px.toFixed(1)}" cy="${(y+16).toFixed(1)}" r="8" fill="${draussen?"#b42318":"#1769aa"}"/>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+19.6).toFixed(1)}" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">${i+1}</text>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+40).toFixed(1)}" font-size="9.5" text-anchor="middle" fill="${draussen?"#b42318":"#68737d"}">${esc(mm(p))}</text>`;
 });
 // Dilas aus der bestehenden Rechnung
 dilasBerechnet(a).dilas.forEach(d=>{
  const px=x(d.posAbStart), q=7;
  s+=`<polygon points="${px.toFixed(1)},${(y-q).toFixed(1)} ${(px+q).toFixed(1)},${y} ${px.toFixed(1)},${(y+q).toFixed(1)} ${(px-q).toFixed(1)},${y}" fill="#e07a1f" stroke="#8a4a0f" stroke-width="1"/>`;
 });
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---- 7. Oberfläche --------------------------------------------------------
function setzeSchritt(n){
 schritt=Math.max(1,Math.min(SCHRITTE.length,n));
 zeichne();
 const k=$("p-inhalt"); if(k)k.scrollIntoView({block:"start"});
}
function schrittLeiste(){
 return `<div class="p-schritte">`+SCHRITTE.map((s,i)=>
  `<button type="button" class="p-schritt${i+1===schritt?" aktiv":""}" data-schritt="${i+1}">
     <span class="p-schritt-nr">${i+1}</span><span class="p-schritt-text">${esc(s)}</span></button>`).join("")+`</div>`;
}
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}

function schritt1(){
 const a=aufnahme;
 const matOpt=measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const rgOpt=RG_GROESSEN.map(g=>`<option value="${esc(g)}"${g===a.groesse?" selected":""}>${esc(g)}</option>`).join("");
 const L=gesamtlaengeBerechnet(a);
 return `<div class="p-karte">
<h2>1 · Grunddaten</h2>
<div class="p-grid">
${feld("Bezeichnung",`<input id="p-bez" placeholder="z. B. Nordseite Haus A" value="${esc(a.bezeichnung)}">`,true)}
${feld("Material",`<select id="p-material">${matOpt}</select>`)}
${feld("Rinnengrösse",`<select id="p-groesse">${rgOpt}</select>`)}
${a.groesse==="andere"?feld("Grösse frei",`<input id="p-groesseFrei" value="${esc(a.groesseFrei)}" placeholder="z. B. RG 285">`):""}
${feld("Gesamtlänge gemessen (mm, optional)",
  `<input id="p-gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaengeManuell_mm??""}" placeholder="nur zur Kontrolle">`)}
${feld("Aus den Abschnitten",`<div class="p-wert">${L>0?esc(mm(L))+" mm":"–"}</div>`)}
</div>
<div class="p-hinweis">Die Gesamtlänge oben ist freiwillig. Sie dient nur der Kontrolle gegen die Summe der Abschnitte aus Schritt 2.</div>
</div>`;
}

function schritt2(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const zeilen=[];
 (a.segmente||[]).forEach((seg,i)=>{
  zeilen.push(`<div class="p-zeile">
<div class="p-zeile-kopf"><b>Abschnitt ${i+1}</b>
${a.segmente.length>1?`<button type="button" class="p-weg" data-seg-del="${i}">✕</button>`:""}</div>
<div class="p-grid">
${feld("Länge (mm)",`<input class="p-gross" data-seg-laenge="${i}" type="number" inputmode="numeric" step="1" value="${seg.laenge||''}" placeholder="0">`)}
</div></div>`);
  if(i<a.segmente.length-1){
   const w=zahl(seg.winkel);
   const art=w===0?"gerade":(w<0?"aussen":"innen");
   zeilen.push(`<div class="p-zeile p-ecke${art==="gerade"?" p-ecke-aus":""}">
<div class="p-zeile-kopf"><b>Übergang ${i+1} → ${i+2}</b></div>
<div class="p-grid">
${feld("Art",`<select data-ecke-art="${i}">
  <option value="gerade"${art==="gerade"?" selected":""}>gerade weiter (keine Ecke)</option>
  <option value="aussen"${art==="aussen"?" selected":""}>Aussenwinkel</option>
  <option value="innen"${art==="innen"?" selected":""}>Innenwinkel</option></select>`)}
${art!=="gerade"?feld("Winkel (°)",`<input class="p-gross" data-ecke-winkel="${i}" type="number" inputmode="numeric" step="1" value="${Math.abs(w)||90}">`):""}
</div>
${art!=="gerade"&&Math.abs(w)!==90?`<div class="p-hinweis">Der Katalog kennt nur den 90°-Winkel als Formteil. Zuschnitt und Fixpunkt werden deshalb mit den Werten des 90°-Winkels gerechnet.</div>`:""}
</div>`);
  }
 });
 return `<div class="p-karte">
<h2>2 · Rinnenverlauf</h2>
<div class="p-hinweis">Abschnitt für Abschnitt von START bis ENDE. Eine Ecke sitzt immer zwischen zwei Abschnitten.</div>
${zeilen.join("")}
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-addSegment">＋ Rinnenabschnitt</button>
<button type="button" class="p-grau" id="p-addEcke">＋ Ecke</button>
</div>
<div class="p-summe" id="p-summeL">Berechnete Gesamtlänge: <b>${L>0?esc(mm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(meter(L))} m)`:""}</div>
</div>
<div class="p-karte">
<h2>Verlauf im Überblick</h2>
<div id="p-band">${verlaufsBandSvg(a)}</div>
<div class="p-legende">▲ Ecke &nbsp; ● Ablauf &nbsp; ◆ Dehnungselement (berechnet)</div>
<h3>Massstäblicher Grundriss</h3>
<div class="p-grundriss" id="p-grundriss">${generateRinneGrundriss(a.segmente,dilasBerechnet(a).dilas,dilasBerechnet(a).boundaries||[])}</div>
</div>`;
}

function schritt3(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const vorschlag=halterVorschlag(a);
 const dila=dilasBerechnet(a);
 const dOpt=w=>ABLAUF_DURCHMESSER.map(d=>`<option value="${esc(d)}"${d===w?" selected":""}>${esc(d)}</option>`).join("");
 const fOpt=w=>FALLROHR_STATUS.map(f=>`<option value="${esc(f)}"${f===w?" selected":""}>${esc(f)}</option>`).join("");
 const ablaeufe=(a.ablaeufe||[]).map((ab,i)=>{
  const p=zahl(ab.pos_mm);
  const draussen=L>0&&(p<0||p>L);
  return `<div class="p-zeile${draussen?" p-fehler":""}">
<div class="p-zeile-kopf"><b>Ablauf ${i+1}</b><button type="button" class="p-weg" data-abl-del="${i}">✕</button></div>
<div class="p-grid">
${feld("Position ab START (mm)",`<input class="p-gross" data-abl-pos="${i}" type="number" inputmode="numeric" step="1" value="${ab.pos_mm||''}" placeholder="0">`)}
${feld("Durchmesser",`<select data-abl-d="${i}">${dOpt(ab.durchmesser)}</select>`)}
${feld("Fallrohr",`<select data-abl-f="${i}">${fOpt(ab.fallrohr)}</select>`)}
${feld("Bemerkung",`<input data-abl-bem="${i}" value="${esc(ab.bemerkung||"")}" placeholder="optional">`,true)}
</div>
${draussen?`<div class="p-warn">⚠️ Ablauf liegt ausserhalb der aufgenommenen Rinne.</div>`:""}
</div>`;
 }).join("");
 const sonder=(a.sonderteile||[]).map((s,i)=>`<div class="p-zeile">
<div class="p-zeile-kopf"><b>Sonderteil ${i+1}</b><button type="button" class="p-weg" data-son-del="${i}">✕</button></div>
<div class="p-grid">
${feld("Bezeichnung",`<input data-son-bez="${i}" value="${esc(s.bezeichnung||"")}" placeholder="z. B. Kesselblech Sonderform">`,true)}
${feld("Anzahl",`<input class="p-gross" data-son-anz="${i}" type="number" inputmode="numeric" step="1" value="${s.anzahl||1}">`)}
${feld("Bemerkung",`<input data-son-bem="${i}" value="${esc(s.bemerkung||"")}" placeholder="optional">`,true)}
</div></div>`).join("");
 return `<div class="p-karte">
<h2>3 · Abläufe / Einhangstutzen</h2>
${ablaeufe||'<div class="p-leer">Noch kein Ablauf erfasst.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-addAblauf">＋ Ablauf</button></div>
</div>

<div class="p-karte">
<h2>Rinnenhalter</h2>
<div class="p-grid">
${feld("Halterabstand (mm)",`<input class="p-gross" id="p-halterAbstand" type="number" inputmode="numeric" step="10" value="${a.halter.abstand_mm||""}">`)}
${feld("Anzahl",`<input class="p-gross" id="p-halterAnzahl" type="number" inputmode="numeric" step="1" value="${a.halter.anzahl??""}" placeholder="${vorschlag??""}">`)}
${feld("Haltertyp (optional)",`<input id="p-halterTyp" value="${esc(a.halter.typ||"")}" placeholder="z. B. Aufschraubhalter">`,true)}
</div>
${vorschlag?`<div class="p-hinweis">Vorschlag aus ${esc(meter(L))} m und ${esc(mm(a.halter.abstand_mm))} mm Abstand: <b>${vorschlag} Stk.</b>
${a.halter.anzahl?"":" – wird verwendet, solange keine eigene Anzahl eingetragen ist."}
<button type="button" class="p-grau p-klein" id="p-halterUebernehmen">Vorschlag übernehmen</button></div>`:""}
</div>

<div class="p-karte">
<h2>Endstücke, Verbinder, Dehnung</h2>
<div class="p-grid">
${feld("Endstück links",`<label class="p-schalter"><input type="checkbox" id="p-endLinks"${a.endstuecke.links?" checked":""}> vorhanden</label>`)}
${feld("Endstück rechts",`<label class="p-schalter"><input type="checkbox" id="p-endRechts"${a.endstuecke.rechts?" checked":""}> vorhanden</label>`)}
${feld("Verbinder (Anzahl)",`<input class="p-gross" id="p-verbinder" type="number" inputmode="numeric" step="1" value="${a.verbinder.anzahl||''}" placeholder="0">`)}
${feld("Dehnung",`<select id="p-dehnungArt">
  <option value="keine"${a.dehnung.art==="keine"?" selected":""}>Keine</option>
  <option value="dehnungsstueck"${a.dehnung.art==="dehnungsstueck"?" selected":""}>Dehnungsstück</option></select>`)}
${a.dehnung.art==="dehnungsstueck"?feld("Anzahl Dehnungsstücke",
  `<input class="p-gross" id="p-dehnungAnzahl" type="number" inputmode="numeric" step="1" value="${a.dehnung.anzahl||''}" placeholder="0">`):""}
</div>
<div class="p-hinweis">Links und rechts beziehen sich auf START und ENDE des aufgenommenen Verlaufs, nicht auf die Bildschirmdarstellung.
${dila.dilas.length?` Die Berechnung aus dem bestehenden Modul ergibt <b>${dila.dilas.length}</b> Dehnungselement(e) für ${esc(materialText(a))}.
<button type="button" class="p-grau p-klein" id="p-dehnungUebernehmen">Übernehmen</button>`:` Für ${esc(materialText(a))} ist bei dieser Länge kein Dehnungselement nötig.`}</div>
</div>

<div class="p-karte">
<h2>Sonderteile</h2>
${sonder||'<div class="p-leer">Noch kein Sonderteil erfasst.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-addSonder">＋ Sonderteil</button></div>
</div>`;
}

function schritt4(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto">
<img src="${esc(f)}" alt="Foto ${i+1}"><button type="button" class="p-weg" data-foto-del="${i}">✕</button></div>`).join("");
 return `<div class="p-karte">
<h2>4 · Fotos</h2>
<label class="p-datei">📷 Foto aufnehmen oder wählen
<input type="file" id="p-fotoInput" accept="image/*" capture="environment" multiple hidden></label>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
</div>
<div class="p-karte">
<h2>Skizze</h2>
${a.skizze?`<div class="p-foto gross"><img src="${esc(a.skizze)}" alt="Skizze"><button type="button" class="p-weg" id="p-skizzeDel">✕</button></div>`
 :'<div class="p-leer">Noch keine Skizze.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-skizzeOeffnen">✏️ ${a.skizze?"Skizze bearbeiten":"Skizze zeichnen"}</button></div>
</div>
<div class="p-karte">
<h2>Bemerkung</h2>
<textarea id="p-bemerkung" rows="4" placeholder="Bemerkung zur Massaufnahme">${esc(a.bemerkung||"")}</textarea>
</div>`;
}

function schritt5(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const p=pruefungen(a);
 const verlauf=[];
 (a.segmente||[]).forEach((seg,i)=>{
  verlauf.push(`<li>${esc(mm(seg.laenge))} mm</li>`);
  const w=zahl(seg.winkel);
  if(w!==0&&i<a.segmente.length-1)
   verlauf.push(`<li class="p-ecke-li">${w<0?"Aussenwinkel":"Innenwinkel"} ${Math.abs(w)}°</li>`);
 });
 const komp=komponenten(a).map(k=>
  `<li>${k.einheit==="m"?esc(k.menge.toFixed(2))+" m":esc(k.menge)+" ×"} ${esc(k.bezeichnung)}</li>`).join("");
 return `<div class="p-karte">
<h2>5 · Kontrolle</h2>
${p.length?`<div class="p-pruefung">`+p.map(m=>
  `<div class="${m.art==="fehler"?"p-fehlerzeile":"p-warnzeile"}">${m.art==="fehler"?"⛔":"⚠️"} ${esc(m.text)}</div>`).join("")+`</div>`
 :`<div class="p-ok">✓ Keine Auffälligkeiten gefunden.</div>`}
</div>
<div class="p-karte p-zusammenfassung">
<h2>RINNE HALBRUND</h2>
<div class="p-zf-kopf">
<div><span>Material</span><b>${esc(materialText(a))}</b></div>
<div><span>Grösse</span><b>${esc(groesseText(a))}</b></div>
<div><span>Länge</span><b>${L>0?esc(mm(L))+" mm":"–"}</b></div>
</div>
<h3>Verlauf</h3>
<ul class="p-liste">${verlauf.join("")||"<li>–</li>"}</ul>
<h3>Komponenten</h3>
<ul class="p-liste">${komp||"<li>–</li>"}</ul>
<h3>Dokumentation</h3>
<div class="p-zf-fuss">Fotos: <b>${(a.fotos||[]).length}</b> · Skizze: <b>${a.skizze?"vorhanden":"keine"}</b>
${a.bemerkung?`<div class="p-bem">${esc(a.bemerkung)}</div>`:""}</div>
</div>`;
}

function schritt6(){
 const a=aufnahme;
 const zeilen=ausmassZeilen(a);
 const mat=materialUebersicht(a);
 return `<div class="p-karte">
<h2>6 · Ausmass</h2>
<div class="p-hinweis">Automatisch aus der Massaufnahme. Nichts davon wird ein zweites Mal eingegeben – wird die Aufnahme geändert, ändert sich das Ausmass mit.</div>
<div class="p-tabelle">
<table><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${zeilen.map(z=>`<tr><td>${z.pos}</td><td>${esc(z.bezeichnung)}</td><td class="p-num">${esc(z.menge)}</td><td>${esc(z.einheit)}</td><td class="p-quelle">${esc(z.herkunft)}</td></tr>`).join("")
 ||'<tr><td colspan="5" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>
</div>
<div class="p-karte">
<h2>Materialübersicht</h2>
<div class="p-tabelle">
<table><thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Material</th></tr></thead>
<tbody>${mat.map(m=>`<tr><td>${esc(m.bezeichnung)}</td><td class="p-num">${esc(m.menge)}</td><td>${esc(m.einheit)}</td><td>${esc(m.material)}</td></tr>`).join("")
 ||'<tr><td colspan="4" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>
<div class="p-hinweis">Artikelnummern und Preise stehen hier bewusst nicht. Sie kommen später aus der Materialliste der jeweiligen Firma.</div>
</div>
<div class="p-karte">
<h2>Zuschnitt aus dem bestehenden Modul</h2>
<div class="p-hinweis">Diese Stückliste rechnet unverändert die Funktion der laufenden App (Dilatationselemente nach SPI/SIA, Anschlussmasse aus dem Katalog).</div>
<div class="p-tabelle">
<table><thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th></tr></thead>
<tbody>${(function(){
 const d=dilasBerechnet(a);
 const st=berechneRinneStueckliste(a.segmente,d.dilas,d.boundaries||[],rinneDilaMass);
 return st.map(s=>`<tr><td>${s.nr}</td><td>${esc(s.von)} → ${esc(s.bis)}</td><td class="p-num">${esc(mm(s.abstand))}</td><td class="p-num"><b>${esc(mm(s.zuschnitt))}</b></td></tr>`).join("")
  ||'<tr><td colspan="4" class="p-leer">Noch nichts zu berechnen.</td></tr>';
})()}</tbody></table>
</div>
</div>`;
}

// ---- 8. Ecken in die Struktur des bestehenden Moduls spiegeln -------------
// Wichtig für die Weiterentwicklung: das bestehende Modul kennt eine Ecke
// NICHT nur als Winkel, sondern als Anschlusstyp (AE90/IE90). Nur dadurch
// wirkt sie als Fixpunkt in calcRinneDilas() und liefert ihr Zuschlagsmass
// (−110 mm) an berechneRinneStueckliste(). Der Prototyp lässt den Benutzer
// nur "Aussen/Innen" wählen und setzt die Typen selbst – die Fachrechnung
// bleibt dadurch exakt die der laufenden App.
function synchronisiereEcken(a){
 const segs=a.segmente||[];
 segs.forEach((seg,i)=>{
  if(i>=segs.length-1)return;
  const w=zahl(seg.winkel);
  const naechste=segs[i+1];
  if(w===0){
   if(Number(seg.rechtsTyp)===ECKE_AUSSEN_ID||Number(seg.rechtsTyp)===ECKE_INNEN_ID)seg.rechtsTyp="";
   if(Number(naechste.linksTyp)===ECKE_AUSSEN_ID||Number(naechste.linksTyp)===ECKE_INNEN_ID)naechste.linksTyp="";
  }else{
   const id=w<0?ECKE_AUSSEN_ID:ECKE_INNEN_ID;
   seg.rechtsTyp=id; naechste.linksTyp=id;
  }
 });
 // Am Anfang und am Ende darf keine Ecke stehen bleiben.
 if(segs.length){
  const e=segs[segs.length-1];
  if(Number(e.rechtsTyp)===ECKE_AUSSEN_ID||Number(e.rechtsTyp)===ECKE_INNEN_ID)e.rechtsTyp="";
  e.winkel=0;
  const s0=segs[0];
  if(Number(s0.linksTyp)===ECKE_AUSSEN_ID||Number(s0.linksTyp)===ECKE_INNEN_ID)s0.linksTyp="";
 }
 return a;
}

// ---- 9. Bilder ------------------------------------------------------------
// Fotos werden verkleinert gespeichert. Der lokale Speicher des Browsers
// fasst nur wenige Megabyte – ein Originalfoto vom Handy würde ihn allein
// sprengen. Für den Prototyp ist das ausreichend; im späteren Einbau in die
// App gehen die Bilder wie gehabt in den privaten Supabase-Speicher.
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

// Skizze: einfache Zeichenfläche mit dem Finger. Bewusst schlicht gehalten –
// der Prototyp soll zeigen, dass eine Skizze zur Aufnahme gehört, nicht ein
// Zeichenprogramm ersetzen.
let skizzeCtx=null, skizzeZeichnet=false;
function skizzeOeffnen(){
 const box=$("p-skizzeBox"), c=$("p-skizzeCanvas");
 if(!box||!c)return;
 box.hidden=false;
 const b=c.getBoundingClientRect();
 c.width=Math.max(320,Math.round(b.width));
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

// ---- 10. Gespeicherte Aufnahmen ------------------------------------------
function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const L=gesamtlaengeBerechnet(a);
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b>
<span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">${esc(groesseText(a))} · ${esc(materialText(a))} · ${L>0?esc(mm(L))+" mm":"–"}${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}

// ---- 11. Zeichnen ---------------------------------------------------------
let listeOffen=false;
function zeichne(){
 synchronisiereEcken(aufnahme);
 const kopf=$("p-kopf");
 if(kopf){
  const L=gesamtlaengeBerechnet(aufnahme);
  const f=pruefungen(aufnahme).filter(m=>m.art==="fehler").length;
  kopf.innerHTML=`<div class="p-kopf-titel">${esc(aufnahme.bezeichnung||"Neue Massaufnahme")}</div>
<div class="p-kopf-zeile">${esc(groesseText(aufnahme))} · ${esc(materialText(aufnahme))} · ${L>0?esc(mm(L))+" mm":"noch keine Länge"}${f?` · <span class="p-kopf-fehler">${f} Hinweis${f>1?"e":""} in Schritt 5</span>`:""}</div>`;
 }
 const leiste=$("p-leiste"); if(leiste)leiste.innerHTML=schrittLeiste();
 const inhalt=$("p-inhalt");
 if(inhalt)inhalt.innerHTML=[schritt1,schritt2,schritt3,schritt4,schritt5,schritt6][schritt-1]();
 const zurueck=$("p-zurueck"), weiter=$("p-weiter");
 if(zurueck)zurueck.disabled=schritt<=1;
 if(weiter){weiter.disabled=schritt>=SCHRITTE.length;
  weiter.textContent=schritt>=SCHRITTE.length?"Fertig":"Weiter › "+SCHRITTE[schritt];}
 const listeBox=$("p-listeBox");
 if(listeBox){listeBox.hidden=!listeOffen; if(listeOffen)listeBox.innerHTML=listeHtml();}
}

// Nach einer Zifferneingabe wird NICHT der ganze Schritt neu gezeichnet –
// sonst verliert das Feld nach dem ersten Zeichen den Fokus (dieselbe Falle
// wie im Rinnen-Profil der laufenden App). Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function aktualisiereLive(){
 const L=gesamtlaengeBerechnet(aufnahme);
 const s=$("p-summeL");
 if(s)s.innerHTML=`Berechnete Gesamtlänge: <b>${L>0?esc(mm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(meter(L))} m)`:""}`;
 const band=$("p-band"); if(band)band.innerHTML=verlaufsBandSvg(aufnahme);
 const gr=$("p-grundriss");
 if(gr){const d=dilasBerechnet(aufnahme);gr.innerHTML=generateRinneGrundriss(aufnahme.segmente,d.dilas,d.boundaries||[]);}
 const kopf=$("p-kopf");
 if(kopf){
  const z=kopf.querySelector(".p-kopf-zeile");
  if(z)z.innerHTML=`${esc(groesseText(aufnahme))} · ${esc(materialText(aufnahme))} · ${L>0?esc(mm(L))+" mm":"noch keine Länge"}`;
 }
}

// ---- 12. Bedienung --------------------------------------------------------
// Eine einzige Stelle für alle Ereignisse. Tippen (input) ändert nur das
// Modell und die abgeleiteten Anzeigen, Auswählen (change) und Klicken
// zeichnen den Schritt neu.
function verdrahten(){
 // Auf document.body, nicht auf #p-app: die Knöpfe der Kopfleiste
 // (Speichern, Kopieren, Neu, Gespeicherte) und die Skizzenfläche liegen
 // ausserhalb von #p-app.
 const wurzel=document.body;
 if(!wurzel)return;

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{};
  const a=aufnahme;
  let live=false;
  if(t.id==="p-bez")a.bezeichnung=t.value;
  else if(t.id==="p-groesseFrei")a.groesseFrei=t.value;
  else if(t.id==="p-gesamt")a.gesamtlaengeManuell_mm=t.value===""?null:zahl(t.value);
  else if(t.id==="p-halterAbstand"){a.halter.abstand_mm=zahl(t.value);}
  else if(t.id==="p-halterAnzahl")a.halter.anzahl=t.value===""?null:zahl(t.value);
  else if(t.id==="p-halterTyp")a.halter.typ=t.value;
  else if(t.id==="p-verbinder")a.verbinder.anzahl=zahl(t.value);
  else if(t.id==="p-dehnungAnzahl")a.dehnung.anzahl=zahl(t.value);
  else if(t.id==="p-bemerkung")a.bemerkung=t.value;
  else if(d.segLaenge!==undefined){a.segmente[Number(d.segLaenge)].laenge=zahl(t.value);live=true;}
  else if(d.eckeWinkel!==undefined){
   const i=Number(d.eckeWinkel), alt=zahl(a.segmente[i].winkel);
   a.segmente[i].winkel=(alt<0?-1:1)*Math.abs(zahl(t.value));
   synchronisiereEcken(a); live=true;
  }
  else if(d.ablPos!==undefined){a.ablaeufe[Number(d.ablPos)].pos_mm=zahl(t.value);live=true;}
  else if(d.ablBem!==undefined)a.ablaeufe[Number(d.ablBem)].bemerkung=t.value;
  else if(d.sonBez!==undefined)a.sonderteile[Number(d.sonBez)].bezeichnung=t.value;
  else if(d.sonAnz!==undefined)a.sonderteile[Number(d.sonAnz)].anzahl=zahl(t.value);
  else if(d.sonBem!==undefined)a.sonderteile[Number(d.sonBem)].bemerkung=t.value;
  else return;
  if(live)aktualisiereLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{};
  const a=aufnahme;
  if(t.id==="p-material")a.material=t.value;
  else if(t.id==="p-groesse")a.groesse=t.value;
  else if(t.id==="p-endLinks")a.endstuecke.links=t.checked;
  else if(t.id==="p-endRechts")a.endstuecke.rechts=t.checked;
  else if(t.id==="p-dehnungArt"){a.dehnung.art=t.value;if(t.value==="keine")a.dehnung.anzahl=0;}
  else if(d.eckeArt!==undefined){
   const i=Number(d.eckeArt), betrag=Math.abs(zahl(a.segmente[i].winkel))||90;
   a.segmente[i].winkel=t.value==="gerade"?0:(t.value==="aussen"?-betrag:betrag);
  }
  else if(d.ablD!==undefined)a.ablaeufe[Number(d.ablD)].durchmesser=t.value;
  else if(d.ablF!==undefined)a.ablaeufe[Number(d.ablF)].fallrohr=t.value;
  else if(t.id==="p-fotoInput"){fotosAufnehmen(t.files);return;}
  else return;
  zeichne();
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-schritt],[data-oeffnen],[data-kopieren],[data-loeschen]");
  if(!t)return;
  const d=t.dataset||{}, a=aufnahme;
  if(d.schritt!==undefined){setzeSchritt(Number(d.schritt));return;}
  if(t.id==="p-zurueck"){setzeSchritt(schritt-1);return;}
  if(t.id==="p-weiter"){setzeSchritt(schritt+1);return;}

  if(t.id==="p-addSegment"){
   const letzte=a.segmente[a.segmente.length-1];
   a.segmente.push({laenge:0,linksTyp:"",rechtsTyp:letzte?letzte.rechtsTyp:"",winkel:0});
   if(letzte)letzte.rechtsTyp="";
   zeichne();return;
  }
  if(t.id==="p-addEcke"){
   const letzte=a.segmente[a.segmente.length-1];
   if(letzte)letzte.winkel=-90;                     // Vorgabe Aussenwinkel 90°
   a.segmente.push({laenge:0,linksTyp:"",rechtsTyp:"",winkel:0});
   zeichne();return;
  }
  if(d.segDel!==undefined){
   if(a.segmente.length<=1)return;
   a.segmente.splice(Number(d.segDel),1);
   zeichne();return;
  }
  if(t.id==="p-addAblauf"){
   a.ablaeufe.push({pos_mm:0,durchmesser:ABLAUF_DURCHMESSER[1],fallrohr:FALLROHR_STATUS[0],bemerkung:""});
   zeichne();return;
  }
  if(d.ablDel!==undefined){a.ablaeufe.splice(Number(d.ablDel),1);zeichne();return;}
  if(t.id==="p-addSonder"){a.sonderteile.push({bezeichnung:"",anzahl:1,bemerkung:""});zeichne();return;}
  if(d.sonDel!==undefined){a.sonderteile.splice(Number(d.sonDel),1);zeichne();return;}
  if(t.id==="p-halterUebernehmen"){a.halter.anzahl=halterVorschlag(a);zeichne();return;}
  if(t.id==="p-dehnungUebernehmen"){
   a.dehnung.art="dehnungsstueck";
   a.dehnung.anzahl=dilasBerechnet(a).dilas.length;
   zeichne();return;
  }

  if(d.fotoDel!==undefined){a.fotos.splice(Number(d.fotoDel),1);zeichne();return;}
  if(t.id==="p-skizzeDel"){
   if(confirm("Skizze wirklich löschen?")){a.skizze=null;zeichne();}
   return;
  }
  if(t.id==="p-skizzeOeffnen"){skizzeOeffnen();return;}
  if(t.id==="p-skizzeSpeichern"){
   const c=$("p-skizzeCanvas");
   if(c)a.skizze=c.toDataURL("image/png");
   $("p-skizzeBox").hidden=true; zeichne(); return;
  }
  if(t.id==="p-skizzeAbbrechen"){$("p-skizzeBox").hidden=true;return;}
  if(t.id==="p-skizzeLeeren"){
   const c=$("p-skizzeCanvas");
   if(c&&skizzeCtx){skizzeCtx.fillStyle="#fff";skizzeCtx.fillRect(0,0,c.width,c.height);}
   return;
  }

  if(t.id==="p-speichern"){
   if(!String(a.bezeichnung||"").trim()){
    alert("Bitte zuerst in Schritt 1 eine Bezeichnung eintragen.");
    setzeSchritt(1); return;
   }
   if(aufnahmeSpeichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent="💾 Speichern"},1600);}
   if(listeOffen)zeichne();
   return;
  }
  if(t.id==="p-neu"){
   if(!confirm("Neue Massaufnahme beginnen? Nicht gespeicherte Änderungen gehen verloren."))return;
   aufnahme=leereAufnahme(); setzeSchritt(1); return;
  }
  if(t.id==="p-kopieren"){
   const k=aufnahmeKopieren(aufnahme.id);
   if(!k){alert("Diese Massaufnahme ist noch nicht gespeichert. Bitte zuerst speichern.");return;}
   aufnahme=k; setzeSchritt(1);
   alert("Kopie angelegt: „"+k.bezeichnung+"“. Sie ist von der ursprünglichen Aufnahme unabhängig.");
   return;
  }
  if(t.id==="p-liste"){listeOffen=!listeOffen;zeichne();return;}
  if(d.oeffnen!==undefined){
   if(aufnahmeLaden(d.oeffnen)){listeOffen=false;setzeSchritt(1);}
   return;
  }
  if(d.kopieren!==undefined){
   const k=aufnahmeKopieren(d.kopieren);
   if(k){aufnahme=k;listeOffen=false;setzeSchritt(1);}
   return;
  }
  if(d.loeschen!==undefined){
   const liste=alleAufnahmen();
   const eintrag=liste.find(x=>x.id===d.loeschen);
   if(!eintrag)return;
   if(!confirm("„"+(eintrag.bezeichnung||"Ohne Bezeichnung")+"“ endgültig löschen?"))return;
   speichereAlle(liste.filter(x=>x.id!==d.loeschen));
   zeichne(); return;
  }
 });

 // Ein Zahlenfeld markiert beim ERSTEN Antippen seinen ganzen Inhalt. Wer
 // ein Mass korrigiert, ersetzt es – sonst tippt man versehentlich davor
 // ("7500" + "6200" ergäbe 75006200). Ein zweites Antippen setzt wie
 // gewohnt nur die Schreibmarke, damit man auch eine Ziffer ändern kann.
 // Das Markieren muss im click-Ereignis geschehen: ein früheres select()
 // würde vom Loslassen der Maus/des Fingers wieder aufgehoben.
 const istZahlfeld=t=>t&&t.tagName==="INPUT"&&t.type==="number"&&t.closest("#p-app");
 wurzel.addEventListener("focusin",e=>{if(istZahlfeld(e.target))e.target.dataset.frisch="1"});
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  if(!istZahlfeld(t)||t.dataset.frisch!=="1")return;
  delete t.dataset.frisch;
  try{t.select()}catch(err){}
 });

 // Skizzenfläche
 const c=$("p-skizzeCanvas");
 if(c){
  const start=ev=>{ev.preventDefault();if(!skizzeCtx)return;skizzeZeichnet=true;
   const [x,y]=skizzePunkt(ev,c);skizzeCtx.beginPath();skizzeCtx.moveTo(x,y);};
  const zieh=ev=>{if(!skizzeZeichnet||!skizzeCtx)return;ev.preventDefault();
   const [x,y]=skizzePunkt(ev,c);skizzeCtx.lineTo(x,y);skizzeCtx.stroke();};
  const stopp=()=>{skizzeZeichnet=false};
  c.addEventListener("pointerdown",start);
  c.addEventListener("pointermove",zieh);
  window.addEventListener("pointerup",stopp);
  c.addEventListener("touchstart",start,{passive:false});
  c.addEventListener("touchmove",zieh,{passive:false});
  window.addEventListener("touchend",stopp);
 }
}

async function fotosAufnehmen(dateien){
 const liste=Array.from(dateien||[]);
 if(!liste.length)return;
 for(const datei of liste){
  if(!/^image\//.test(datei.type||"")){alert("„"+datei.name+"“ ist kein Bild und wurde übersprungen.");continue}
  const bild=await bildVerkleinern(datei);
  if(bild)aufnahme.fotos.push(bild);
  else alert("„"+datei.name+"“ konnte nicht gelesen werden.");
 }
 zeichne();
}

document.addEventListener("DOMContentLoaded",()=>{
 verdrahten();
 zeichne();
});
