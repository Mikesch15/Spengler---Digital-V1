"use strict";
// ===========================================================================
// PROTOTYP · Massaufnahme "Freies Profil"
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung. Gezeichnet
// und geprüft wird ausschliesslich mit der Fachlogik der laufenden App -
// zeichengenau übernommen aus js/14-freies-profil.js (siehe uebernommen.js):
//
//   generateProfilDiagramSvg()  die ganze Profilzeichnung
//   abgerundeterPfad()          runde Biegungen
//   ansichtsPfeilSvg()          Ansichtsrichtung
//   fpPruefeErkannteSchenkel()  Prüfung der Skizzen-Erkennung
//   FP_MAX_SCHENKEL (24), FP_ERKENNUNG_ZEITGRENZE_MS
//
// Es gibt hier KEINE zweite Zeichenroutine und KEINE zweite Prüfung der
// erkannten Schenkel.
//
// Sieben Register, wie im Auftrag vorgegeben:
//   1 Grunddaten · 2 Profil · 3 Zeichnung · 4 Skizze → Profil ·
//   5 Segmente und Ausmass · 6 Kontrolle · 7 Fotos & Speichern
// ===========================================================================

const SCHRITTE=["Grunddaten","Profil","Zeichnung","Skizze → Profil",
                "Segmente & Ausmass","Kontrolle","Fotos & Speichern"];
let schritt=1;

// ---- 1. Datenmodell -------------------------------------------------------
// Dieselben Felder, die die App unter measurements.data für freies_profil
// speichert (schenkel, konisch, segmente, ansicht, material) - dazu die
// Angaben, die die App ausserhalb von data führt (Bezeichnung, Datum, Notiz,
// Fotos, Skizze).
const SPEICHER="pfp_aufnahmen";
function heute(){const d=new Date();return d.toISOString().slice(0,10)}
function leereAufnahme(){
 return {
  id:null, bezeichnung:"", objekt:"", datum:heute(),
  material:"", konisch:"nein", ansicht:"keiner",
  schenkel:[], segmente:[],
  fotos:[], skizze:null, bemerkung:"",
  erstellt:null, geaendert:null
 };
}
let aufnahme=leereAufnahme();

const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const mm=v=>Math.round(zahl(v)).toLocaleString("de-CH");
const meter=v=>(zahl(v)/1000).toFixed(2).replace(".",",");
const istKonisch=a=>(a||aufnahme).konisch==="ja";

// ---- 2. Brücke zur Zeichnung der App --------------------------------------
// generateProfilDiagramSvg() liest die Ansichtsrichtung aus einem Feld mit
// der ID "fp_ansicht" - genau wie in der App. Damit die Funktion unverändert
// bleiben kann, gibt es dieses Feld unsichtbar im Rumpf; hier wird es vor
// jedem Zeichnen aus dem Modell gesetzt. Kein Nachbau der Zeichnung.
function bruecke(){
 const f=$("fp_ansicht");
 if(f)f.value=aufnahme.ansicht||"keiner";
}
function profilSvg(schenkel){
 bruecke();
 return generateProfilDiagramSvg(schenkel||aufnahme.schenkel);
}

// ---- 3. Schenkel ----------------------------------------------------------
// Regeln unverändert aus js/14: Winkel umkehren dreht das Vorzeichen,
// "180°" macht den Schenkel zum Umschlag, ein neuer Schenkel startet bei 0/0.
function neuerSchenkel(){return {laenge:0,winkel:0}}
function schenkelUmkehren(i){
 const s=aufnahme.schenkel[i]; if(!s)return;
 s.winkel=-(zahl(s.winkel));
}
function schenkelUmschlag(i){
 const s=aufnahme.schenkel[i]; if(!s)return;
 s.winkel=180;
}
function istUmschlagSchenkel(s){
 const w=((zahl(s&&s.winkel))%360+360)%360;
 return Math.abs(w-180)<0.5;
}
// Länge eines Schenkels ändern - dieselbe Mitführung wie in js/14: solange im
// Segment noch nichts oder noch der alte Wert steht, wandert die neue Länge
// mit. Ein von Hand abweichend eingetragenes Mass bleibt stehen.
function schenkelLaengeSetzen(i,wert){
 const s=aufnahme.schenkel[i]; if(!s)return;
 const alt=zahl(s.laenge), neu=zahl(wert);
 s.laenge=neu;
 const feld=istKonisch()?"links":"mass";
 (aufnahme.segmente||[]).forEach(seg=>{
  if(!seg.massen)seg.massen=[];
  if(!seg.massen[i])seg.massen[i]={mass:0,links:0,rechts:0};
  const jetzt=zahl(seg.massen[i][feld]);
  if(jetzt===0||jetzt===alt)seg.massen[i][feld]=neu;
 });
}

// ---- 4. Segmente ----------------------------------------------------------
// Struktur und Verhalten wie in js/14: je Segment eine Länge und je Schenkel
// ein Mass (konisch: links und rechts).
function neuesSegment(){
 return {laenge:0,massen:aufnahme.schenkel.map(s=>({mass:zahl(s.laenge),links:zahl(s.laenge),rechts:0}))};
}
function segmentMassen(seg){
 if(!seg.massen)seg.massen=[];
 // Werden Schenkel weniger - etwa weil eine erkannte Skizze das ganze Profil
 // ersetzt -, bleiben sonst Masse zu Schenkeln stehen, die es nicht mehr
 // gibt. Sie sind unsichtbar (die Tabelle zeigt nur die vorhandenen
 // Schenkel), würden aber in die Abwicklung mitgezählt. Gemessen: 5 Schenkel
 // à 300 mm, danach 3 erkannte Schenkel - die Abwicklung blieb bei 300 statt
 // 210. Deshalb hier auf die tatsächliche Zahl der Schenkel kürzen.
 if(seg.massen.length>aufnahme.schenkel.length)seg.massen.length=aufnahme.schenkel.length;
 aufnahme.schenkel.forEach((s,j)=>{
  if(!seg.massen[j])seg.massen[j]={mass:0,links:0,rechts:0};
  const m=seg.massen[j];
  // Leere Felder werden aus dem Profil gefüllt - unverändert aus js/14.
  if(istKonisch()){ if(!m.links)m.links=zahl(s.laenge) }
  else { if(!m.mass)m.mass=zahl(s.laenge) }
 });
 return seg.massen;
}
function masseAusProfil(i){
 const seg=aufnahme.segmente[i]; if(!seg)return;
 const konisch=istKonisch();
 seg.massen=aufnahme.schenkel.map((s,j)=>{
  const laenge=zahl(s.laenge), bisher=(seg.massen&&seg.massen[j])||{};
  return {
   mass:  konisch?zahl(bisher.mass):laenge,
   links: konisch?laenge:zahl(bisher.links),
   rechts:zahl(bisher.rechts)
  };
 });
}
function alleNachRechts(i){
 const seg=aufnahme.segmente[i]; if(!seg)return;
 (segmentMassen(seg)||[]).forEach(m=>{m.rechts=zahl(m.links)});
}

// ---- 5. Ausmass -----------------------------------------------------------
// Es wird NICHTS erfunden. Alle Zeilen entstehen durch Zusammenzählen und
// Abzählen bereits erfasster Werte; jede Zeile nennt, woher sie kommt.
// Fehlt eine Angabe, steht das ausdrücklich da statt einer Zahl.
function abwicklungSegment(seg){
 const konisch=istKonisch();
 const m=segmentMassen(seg);
 if(konisch){
  return {links:m.reduce((s,x)=>s+zahl(x.links),0),
          rechts:m.reduce((s,x)=>s+zahl(x.rechts),0)};
 }
 const v=m.reduce((s,x)=>s+zahl(x.mass),0);
 return {links:v,rechts:v};
}
// Fläche eines Segments: Länge × Abwicklung. Bei einem konischen Segment ist
// das Blech ein Trapez - Länge × (Abwicklung links + rechts) / 2 ist dessen
// Fläche, keine Schätzung.
function flaecheSegmentM2(seg){
 const a=abwicklungSegment(seg);
 const breite=istKonisch()?(a.links+a.rechts)/2:a.links;
 return zahl(seg.laenge)*breite/1e6;
}
function laufmeter(){return (aufnahme.segmente||[]).reduce((s,x)=>s+zahl(x.laenge),0)}
function flaecheM2(){return (aufnahme.segmente||[]).reduce((s,x)=>s+flaecheSegmentM2(x),0)}
function anzahlBiegungen(){
 // Eine Biegung liegt zwischen zwei Schenkeln; ihr Winkel ist der Winkel des
 // FOLGENDEN Schenkels. Winkel 0 heisst "gerade weiter", das ist keine Biegung.
 return (aufnahme.schenkel||[]).filter((s,i)=>i>0&&zahl(s.winkel)!==0).length;
}
function anzahlUmschlaege(){
 return (aufnahme.schenkel||[]).filter((s,i)=>i>0&&istUmschlagSchenkel(s)).length;
}
function ausmassZeilen(){
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 const segs=aufnahme.segmente||[];
 if(!aufnahme.schenkel.length||!segs.length)return z;
 const L=laufmeter();
 if(L>0)zeile("Freies Profil, "+aufnahme.schenkel.length+" Schenkel",meter(L),"m","Summe der Segmentlängen");
 zeile("Segmente",segs.length,"Stk.","Segmentliste");
 segs.forEach((seg,i)=>{
  const a=abwicklungSegment(seg);
  const txt=istKonisch()
   ?(a.links>0||a.rechts>0?mm(a.links)+" / "+mm(a.rechts):"–")
   :(a.links>0?mm(a.links):"–");
  zeile("Abwicklung Segment "+(i+1)+(istKonisch()?" (links / rechts)":""),txt,"mm",
        "Summe der Masse je Schenkel");
 });
 const b=anzahlBiegungen();
 if(b)zeile("Biegungen",b,"Stk.","Schenkel mit einem Winkel ≠ 0°");
 const u=anzahlUmschlaege();
 if(u)zeile("davon Umschläge (180°)",u,"Stk.","Schenkel mit Winkel 180°");
 const f=flaecheM2();
 if(f>0)zeile("Blechfläche",f.toFixed(2).replace(".",","),"m²",
   istKonisch()?"Länge × mittlere Abwicklung je Segment (Trapez)":"Länge × Abwicklung je Segment");
 return z;
}
function materialUebersicht(){
 const L=laufmeter();
 if(!aufnahme.schenkel.length||L<=0)return [];
 return [{
  bezeichnung:"Freies Profil, "+aufnahme.schenkel.length+" Schenkel",
  menge:meter(L), einheit:"m",
  flaeche:flaecheM2().toFixed(2).replace(".",","),
  material:(findMeasurementMaterial(aufnahme.material)||{}).name||"–"
 }];
}

// ---- 6. Kontrolle ---------------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen:
// mindestens 2 Schenkel (fpPruefeErkannteSchenkel verlangt genau das),
// höchstens FP_MAX_SCHENKEL, gültige Zahlen, keine negativen Längen,
// Winkel im Bereich, den die Erkennung zulässt (±180°), und eine Geometrie,
// die sich zeichnen lässt. Es werden KEINE eigenen Grenzwerte erfunden.
function pruefungen(){
 const a=aufnahme, m=[];
 const sch=a.schenkel||[];
 if(!sch.length)m.push({art:"fehler",text:"Noch kein Schenkel erfasst. Ein Profil braucht mindestens zwei."});
 else if(sch.length<2)m.push({art:"fehler",text:"Nur ein Schenkel - das ist noch kein Profil. Die Erkennung der App verlangt ebenfalls mindestens zwei."});
 if(sch.length>FP_MAX_SCHENKEL)
  m.push({art:"fehler",text:"Mehr als "+FP_MAX_SCHENKEL+" Schenkel ("+sch.length+"). Die App lässt höchstens "+FP_MAX_SCHENKEL+" zu."});
 sch.forEach((s,i)=>{
  const nr=i+1;
  const l=Number(s.laenge), w=Number(s.winkel);
  if(!Number.isFinite(l))m.push({art:"fehler",text:"Schenkel "+nr+": die Länge ist keine gültige Zahl."});
  else if(l<0)m.push({art:"fehler",text:"Schenkel "+nr+": negative Länge ("+mm(l)+" mm)."});
  else if(l===0)m.push({art:"fehler",text:"Schenkel "+nr+": Länge 0 mm - ohne Länge lässt sich nichts zuschneiden."});
  if(!Number.isFinite(w))m.push({art:"fehler",text:"Schenkel "+nr+": der Winkel ist keine gültige Zahl."});
  else if(w<-180||w>180)m.push({art:"fehler",text:"Schenkel "+nr+": Winkel "+mm(w)+"° liegt ausserhalb von −180° bis 180°."});
  if(i===0&&Number.isFinite(w)&&w!==0)
   m.push({art:"warnung",text:"Schenkel 1 hat einen Winkel ("+mm(w)+"°). Er dreht das ganze Profil - beim ersten Schenkel ist 0° das Übliche."});
 });
 // Lässt sich die Geometrie zeichnen? Nicht behaupten, sondern versuchen.
 if(sch.length){
  const svg=profilSvg(sch);
  if(!/<svg/.test(svg)||/NaN|Infinity/.test(svg))
   m.push({art:"fehler",text:"Die Geometrie lässt sich nicht darstellen - bitte Längen und Winkel prüfen."});
 }
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt - die Materialübersicht bleibt dadurch unvollständig."});
 if(!String(a.bezeichnung||"").trim())
  m.push({art:"warnung",text:"Keine Bezeichnung - gespeicherte Aufnahmen sind dann schwer auseinanderzuhalten."});
 if(!(a.segmente||[]).length)
  m.push({art:"warnung",text:"Noch kein Segment - ohne Segment gibt es keine Längen und kein Ausmass."});
 else{
  a.segmente.forEach((seg,i)=>{
   if(zahl(seg.laenge)<=0)m.push({art:"warnung",text:"Segment "+(i+1)+" hat keine Länge."});
   const ab=abwicklungSegment(seg);
   if(ab.links<=0&&ab.rechts<=0)m.push({art:"warnung",text:"Segment "+(i+1)+": keine Masse erfasst - die Abwicklung bleibt leer."});
   if(istKonisch()&&ab.rechts<=0)
    m.push({art:"warnung",text:"Segment "+(i+1)+": konisch, aber rechts ist nichts erfasst."});
  });
 }
 if(!(a.fotos||[]).length&&!a.skizze)
  m.push({art:"warnung",text:"Weder Foto noch Skizze - für die Werkstatt ist ein Bild meist hilfreich."});
 return m;
}

// ---- 7. Skizze → Profil ---------------------------------------------------
// Ablauf unverändert wie in der App (v2.70): erkennen → prüfen → VORSCHAU →
// erst auf ausdrückliche Bestätigung übernehmen. Geprüft wird mit
// fpPruefeErkannteSchenkel() aus js/14 - es gibt hier keine zweite Prüfung
// und keine eigene 24er-Grenze.
let erkanntesProfil=null, erkanntVerworfen=0, erkennungStatus="";
let erkennungLaeuft=false;

async function erkenneProfil(dataUrl){
 // Zeitgrenze auch im Browser - sonst bleibt die Anzeige bei einer
 // haengenden Verbindung endlos auf "wird erkannt".
 const abbruch=("AbortController" in window)?new AbortController():null;
 const uhr=abbruch?setTimeout(()=>abbruch.abort(),FP_ERKENNUNG_ZEITGRENZE_MS):null;
 let res;
 try{
  res=await fetch(SUPABASE_URL+"/functions/v1/extract-profile-shape",{
   method:"POST",
   headers:{"Content-Type":"application/json",
            "Authorization":"Bearer "+SUPABASE_ANON_KEY,
            "apikey":SUPABASE_ANON_KEY},
   body:JSON.stringify({image_base64:dataUrl}),
   signal:abbruch?abbruch.signal:undefined
  });
 }catch(e){
  if(uhr)clearTimeout(uhr);
  throw new Error((e&&e.name==="AbortError")
   ?"Die Erkennung hat zu lange gedauert. Bitte erneut versuchen oder das Profil von Hand erfassen."
   :"Keine Verbindung zur Erkennung. Bitte die Internetverbindung prüfen.");
 }
 if(uhr)clearTimeout(uhr);
 const text=await res.text();
 let data=null;
 try{data=JSON.parse(text)}catch(e){}
 if(!data)throw new Error("Die Antwort der Erkennung war unlesbar. Bitte erneut versuchen.");
 if(!res.ok||!data.ok){
  const m=String(data.error||"");
  const brauchbar=m.indexOf(" ")>=0&&m.length>=15;
  if(!brauchbar)console.error("extract-profile-shape:",res.status,data.error);
  throw new Error(brauchbar?m
   :"Die Erkennung ist fehlgeschlagen. Bitte erneut versuchen oder das Profil von Hand erfassen.");
 }
 return {schenkel:data.schenkel||[],verworfen:Number(data.verworfen)||0};
}

function vorschauSchliessen(){erkanntesProfil=null;erkanntVerworfen=0}

async function erkennungStarten(){
 const bild=aufnahme.skizze||(aufnahme.fotos||[])[aufnahme.fotos.length-1];
 if(!bild){
  erkennungStatus="⚠️ Zuerst eine Skizze zeichnen oder ein Foto aufnehmen (Register 7).";
  zeichne(); return;
 }
 vorschauSchliessen();
 erkennungLaeuft=true;
 erkennungStatus="🔄 Form wird erkannt …";
 zeichne();
 try{
  const antwort=await erkenneProfil(bild);
  // Prüfung mit der Funktion der App - kein zweiter Filter.
  const erkannt=fpPruefeErkannteSchenkel(antwort.schenkel);
  if(!erkannt.length){
   erkennungStatus="⚠️ Keine eindeutige Form erkannt – bitte manuell erfassen oder deutlicher skizzieren.";
  }else{
   erkanntesProfil=erkannt;
   erkanntVerworfen=antwort.verworfen||0;
   erkennungStatus="";
  }
 }catch(err){
  // Nie ein Profil übernehmen, wenn etwas schiefging.
  vorschauSchliessen();
  erkennungStatus="⚠️ "+((err&&err.message)||"Die Erkennung ist fehlgeschlagen.");
 }
 erkennungLaeuft=false;
 zeichne();
}

function erkanntesUebernehmen(){
 if(!erkanntesProfil||!erkanntesProfil.length)return false;
 if(aufnahme.schenkel.length
    &&!confirm("Das vorhandene Profil wird durch die erkannte Form ersetzt. Fortfahren?"))return false;
 const anzahl=erkanntesProfil.length;
 aufnahme.schenkel=erkanntesProfil.map(s=>({...s}));
 vorschauSchliessen();
 erkennungStatus="✓ "+anzahl+" Schenkel übernommen. Bitte Längen und Winkel prüfen und mit den tatsächlichen Massen ergänzen.";
 return true;
}

// ---- 8. Ablage ------------------------------------------------------------
function alleAufnahmen(){
 try{const l=JSON.parse(localStorage.getItem(SPEICHER)||"[]");return Array.isArray(l)?l:[]}
 catch(e){return []}
}
function speichern(){
 const jetzt=new Date().toISOString();
 const liste=alleAufnahmen();
 if(!aufnahme.id){
  aufnahme.id="fp"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  aufnahme.erstellt=jetzt;
  liste.unshift(JSON.parse(JSON.stringify(aufnahme)));
 }else{
  aufnahme.geaendert=jetzt;
  const i=liste.findIndex(x=>x.id===aufnahme.id);
  const kopie=JSON.parse(JSON.stringify(aufnahme));
  if(i>=0)liste[i]=kopie; else liste.unshift(kopie);
 }
 try{localStorage.setItem(SPEICHER,JSON.stringify(liste))}catch(e){
  alert("Der Speicher des Browsers ist voll. Bitte alte Aufnahmen oder Fotos löschen.");
  return false;
 }
 return true;
}
function oeffnen(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 aufnahme=JSON.parse(JSON.stringify({...leereAufnahme(),...a}));
 // Ältere Datensätze können Felder noch nicht kennen - Standard gilt, es
 // wird nichts erfunden.
 if(!Array.isArray(aufnahme.schenkel))aufnahme.schenkel=[];
 if(!Array.isArray(aufnahme.segmente))aufnahme.segmente=[];
 if(!Array.isArray(aufnahme.fotos))aufnahme.fotos=[];
 vorschauSchliessen(); erkennungStatus="";
 schritt=1; zeichne(); return true;
}
// Kopieren erzeugt einen eigenständigen Datensatz: eigene Kennung, tiefe
// Kopie. Eine Änderung an der Kopie lässt das Original unberührt.
function kopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 const k=JSON.parse(JSON.stringify(a));
 k.id="fp"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 k.erstellt=new Date().toISOString(); k.geaendert=null;
 k.bezeichnung=(a.bezeichnung||"Ohne Bezeichnung")+" (Kopie)";
 const liste=alleAufnahmen(); liste.unshift(k);
 localStorage.setItem(SPEICHER,JSON.stringify(liste));
 aufnahme=JSON.parse(JSON.stringify({...leereAufnahme(),...k}));
 schritt=1; zeichne(); return k.id;
}
function loeschen(id){
 localStorage.setItem(SPEICHER,JSON.stringify(alleAufnahmen().filter(x=>x.id!==id)));
}

// ---- 9. Oberfläche --------------------------------------------------------
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" p-voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}
function karte(titel,inhalt){return `<div class="p-karte"><h2>${esc(titel)}</h2>${inhalt}</div>`}

function registerHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt -
 // sonst müsste man das Register aufsuchen, um zu merken, dass etwas fehlt.
 const pr=pruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="p-register" id="p-register">`+SCHRITTE.map((t,i)=>{
  const n=i+1;
  const marke=n===6&&(fehler||warn)
   ? `<span class="p-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="p-register-knopf${n===schritt?" aktiv":""}" data-schritt="${n}">`
   +`<span class="p-register-nr">${n}</span><span class="p-register-text">${esc(t)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}

// 1 · Grunddaten
function schritt1(){
 const a=aufnahme;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const konOpt=[["nein","nein – Masse über die ganze Länge gleich"],["ja","ja – Masse links und rechts verschieden"]]
  .map(([w,t])=>`<option value="${w}"${a.konisch===w?" selected":""}>${esc(t)}</option>`).join("");
 return karte("1 · Grunddaten",`<div class="p-gitter">
${feld("Bezeichnung",`<input id="p-bezeichnung" type="text" value="${esc(a.bezeichnung)}" placeholder="z. B. Attikaabdeckung Nord">`,true)}
${feld("Objekt / Bauteil",`<input id="p-objekt" type="text" value="${esc(a.objekt)}" placeholder="z. B. Dachrand Ost">`,true)}
${feld("Datum",`<input id="p-datum" type="date" value="${esc(a.datum)}">`)}
${feld("Material",`<select id="p-material">${matOpt}</select>`)}
${feld("Konisch",`<select id="p-konisch">${konOpt}</select>`)}
</div>
<div class="p-hinweis">Das Profil selbst wird im nächsten Register Schenkel für Schenkel erfasst.
„Konisch“ entscheidet, ob je Segment ein Mass genügt oder links und rechts getrennt erfasst werden -
genau wie im bestehenden Modul.</div>`);
}

// 2 · Profil aufnehmen  (der wichtigste Bildschirm)
function schritt2(){
 const a=aufnahme;
 const zeilen=a.schenkel.map((s,i)=>{
  const um=istUmschlagSchenkel(s);
  return `<div class="p-zeile" data-schenkel-zeile="${i}">
<div class="p-zeile-kopf"><b>Schenkel ${i+1}</b>
<span class="p-klein-text">${mm(s.laenge)} mm · ${mm(s.winkel)}°${um?" · Umschlag":""}${i===0?" · Startschenkel":""}</span>
<button type="button" class="p-weg" data-schenkel-weg="${i}" title="Schenkel löschen">✕</button></div>
<div class="p-gitter">
${feld("Länge (mm)",`<input data-schenkel-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(s.laenge||0)}">`)}
${feld("Winkel (°)",`<input data-schenkel-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(s.winkel||0)}">`)}
</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" data-schenkel-flip="${i}" title="Winkel umkehren">🔄 Richtung umkehren</button>
<button type="button" class="p-grau${um?" p-aktiv":""}" data-schenkel-umschlag="${i}" title="Winkel auf 180° setzen">180° Umschlag</button>
${i>0?`<button type="button" class="p-grau" data-schenkel-hoch="${i}">↑</button>`:""}
${i<a.schenkel.length-1?`<button type="button" class="p-grau" data-schenkel-runter="${i}">↓</button>`:""}
</div>
</div>`;
 }).join("");
 return karte("2 · Profil aufnehmen",`<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-schenkelPlus">＋ Schenkel hinzufügen</button>
<span class="p-klein-text">${a.schenkel.length} von höchstens ${FP_MAX_SCHENKEL} Schenkeln</span>
</div>
<div class="p-hinweis">Winkel = Richtungsänderung gegenüber dem vorherigen Schenkel.
0° heisst gerade weiter, 180° ist ein Umschlag. „Richtung umkehren“ dreht das Vorzeichen -
dieselbe Regel wie im bestehenden Modul.</div>
<div id="p-profil" class="p-zeichnung p-zeichnung-klebt">
<div class="p-zeichnung-kopf"><span>Zeichnung – folgt jeder Eingabe</span><span>${a.schenkel.length} Schenkel</span></div>
<div id="p-profilBild">${profilSvg(a.schenkel)}</div></div>
${zeilen||'<div class="p-leer">Noch kein Schenkel. „＋ Schenkel hinzufügen“ oder im Register „Skizze → Profil“ eine Skizze erkennen lassen.</div>'}`);
}

// 3 · Profilzeichnung gross
function schritt3(){
 const a=aufnahme;
 const ansOpt=[["keiner","kein Pfeil"],["links","von links"],["oben","von oben"],
               ["rechts","von rechts"],["unten","von unten"]]
  .map(([w,t])=>`<option value="${w}"${a.ansicht===w?" selected":""}>${esc(t)}</option>`).join("");
 const tab=a.schenkel.map((s,i)=>
  `<tr><td>${i+1}</td><td class="p-num">${mm(s.laenge)}</td><td class="p-num">${mm(s.winkel)}</td>
<td>${istUmschlagSchenkel(s)?"Umschlag":(i===0?"Start":(zahl(s.winkel)===0?"gerade":"Biegung"))}</td></tr>`).join("");
 return karte("3 · Profilzeichnung",`<div class="p-gitter">
${feld("Ansichtsrichtung",`<select id="p-ansicht">${ansOpt}</select>`)}
${feld("Schenkel",`<div class="p-wert">${a.schenkel.length}</div>`)}
${feld("Biegungen",`<div class="p-wert">${anzahlBiegungen()}</div>`)}
${feld("Umschläge",`<div class="p-wert">${anzahlUmschlaege()}</div>`)}
</div>
<div id="p-profilGross" class="p-zeichnung gross">${profilSvg(a.schenkel)}</div>
<div class="p-klein-text">Schenkelnummern in Orange, Masse in Blau, der rote Pfeil zeigt die
Blickrichtung. Gezeichnet wird mit <code>generateProfilDiagramSvg()</code> der laufenden App -
runde Biegungen, versetzte Umschläge und Ansichtspfeil inbegriffen.</div>
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th><th>Art</th></tr></thead>
<tbody>${tab||'<tr><td colspan="4" class="p-klein-text">Noch kein Schenkel.</td></tr>'}</tbody></table>
</div>`);
}

// 4 · Skizze → Profil
function schritt4(){
 const a=aufnahme;
 const bild=a.skizze||(a.fotos||[])[a.fotos.length-1]||null;
 const vorschau=erkanntesProfil?`<div class="p-karte p-vorschau">
<h2>Erkannte Form – noch nicht übernommen</h2>
<div class="p-hinweis">${erkanntesProfil.length} Schenkel erkannt${erkanntVerworfen?" · "+erkanntVerworfen+" unklare Angabe(n) verworfen":""}.
<b>Die Längen sind nur grobe Schätzwerte aus der Skizze</b> – eine Handskizze hat keinen Massstab.
Bitte nach dem Übernehmen mit den tatsächlichen Massen überschreiben.</div>
<div class="p-zeichnung">${profilSvg(erkanntesProfil)}</div>
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th></tr></thead>
<tbody>${erkanntesProfil.map((s,i)=>`<tr><td>${i+1}</td><td class="p-num">${esc(s.laenge)}</td><td class="p-num">${esc(s.winkel)}</td></tr>`).join("")}</tbody></table>
</div>
<div class="p-knopfreihe">
<button type="button" class="p-gruen" id="p-erkanntUebernehmen">✓ Übernehmen</button>
<button type="button" class="p-grau" id="p-erkanntVerwerfen">✕ Verwerfen</button>
</div></div>`:"";
 return karte("4 · Skizze → Profil",`<div class="p-hinweis">Eine Handskizze oder ein Foto wird als
<b>Vorlage</b> erkannt, nie als fertiges Mass. Das Ergebnis kommt zuerst als Vorschau und wird erst
auf ausdrückliche Bestätigung übernommen. Geprüft wird mit der Funktion der laufenden App
(<code>fpPruefeErkannteSchenkel</code>): mindestens 2, höchstens ${FP_MAX_SCHENKEL} Schenkel,
Länge grösser 0, Winkel zwischen −180° und 180°.</div>
${bild?`<div class="p-foto gross"><img src="${esc(bild)}" alt="Vorlage für die Erkennung"></div>`
 :'<div class="p-leer">Noch keine Skizze und kein Foto. Beides wird im Register 7 erfasst.</div>'}
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-erkennen"${bild&&!erkennungLaeuft?"":" disabled"}>🔍 Form aus Skizze erkennen</button>
<button type="button" class="p-grau" id="p-zuFotos">📷 Zu Skizze und Fotos</button>
</div>
${erkennungStatus?`<div class="p-status">${esc(erkennungStatus)}</div>`:""}`)
+vorschau;
}

// 5 · Segmente und Ausmass
function schritt5(){
 const a=aufnahme;
 const konisch=istKonisch();
 const segs=(a.segmente||[]).map((seg,i)=>{
  const massen=segmentMassen(seg);
  const ab=abwicklungSegment(seg);
  const zeilen=a.schenkel.map((s,j)=>{
   const m=massen[j];
   return konisch
    ? `<tr><td>${j+1}</td>
<td><input data-seg-links="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.links||0)}"></td>
<td class="p-mitte"><button type="button" class="p-grau p-weg" data-seg-nach-rechts="${i}_${j}" title="Mass nach rechts übernehmen">→</button></td>
<td><input data-seg-rechts="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.rechts||0)}"></td></tr>`
    : `<tr><td>${j+1}</td>
<td><input data-seg-mass="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.mass||0)}"></td></tr>`;
  }).join("");
  return `<div class="p-zeile" data-seg-zeile="${i}">
<div class="p-zeile-kopf"><b>Segment ${i+1}</b>
<span class="p-klein-text">Abwicklung ${konisch?mm(ab.links)+" / "+mm(ab.rechts):mm(ab.links)} mm · Fläche ${flaecheSegmentM2(seg).toFixed(2).replace(".",",")} m²</span>
<button type="button" class="p-weg" data-seg-weg="${i}" title="Segment löschen">✕</button></div>
<div class="p-gitter">
${feld("Länge (mm)",`<input data-seg-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(seg.laenge||0)}">`)}
</div>
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Schenkel</th><th>${konisch?"Mass links (mm)":"Mass (mm)"}</th>${konisch?"<th></th><th>Mass rechts (mm)</th>":""}</tr></thead>
<tbody>${zeilen||`<tr><td colspan="${konisch?4:2}" class="p-klein-text">Noch kein Schenkel im Profil.</td></tr>`}</tbody></table>
</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" data-seg-uebernehmen="${i}">↩️ Masse aus Profil übernehmen</button>
${konisch?`<button type="button" class="p-grau" data-seg-alle-rechts="${i}">➡️ Alle nach rechts</button>`:""}
</div></div>`;
 }).join("");
 const z=ausmassZeilen();
 const mu=materialUebersicht();
 const ausmass=z.length?`<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td class="p-num">${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="p-quelle">${esc(x.herkunft)}</td></tr>`).join("")}</tbody></table>
</div>
${mu.length?`<div class="p-tabelle-scroll" style="margin-top:8px">
<table class="p-tabelle"><thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Fläche</th><th>Material</th></tr></thead>
<tbody>${mu.map(x=>`<tr><td>${esc(x.bezeichnung)}</td><td class="p-num">${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="p-num">${esc(x.flaeche)} m²</td><td>${esc(x.material)}</td></tr>`).join("")}</tbody></table>
</div>`:""}
<div class="p-klein-text">Alles entsteht aus dieser Aufnahme – keine zweite Eingabe, keine
Artikelnummern und keine Preise. Die kommen später aus der Materialliste der Firma.</div>`
 :`<div class="p-leer">Noch nichts zu messen – bitte zuerst Schenkel und mindestens ein Segment erfassen.</div>`;
 return karte("5 · Segmente",`<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-segmentPlus">＋ Segment hinzufügen</button>
</div>
<div class="p-hinweis">Ein Segment ist ein Stück des Profils mit eigener Länge. Die Masse je
Schenkel sind mit den Profillängen vorbelegt und lassen sich einzeln überschreiben${konisch?" – links und rechts getrennt, weil das Profil konisch ist":""}.</div>
${segs||'<div class="p-leer">Noch kein Segment.</div>'}`)
+karte("Ausmass und Material",ausmass);
}

// 6 · Kontrolle
function schritt6(){
 const m=pruefungen();
 if(!m.length)return karte("6 · Kontrolle",
  `<div class="p-ok">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div>`);
 const a=aufnahme;
 const uebersicht=`<div class="p-tabelle-scroll">
<table class="p-tabelle"><tbody>
<tr><td>Bezeichnung</td><td>${esc(a.bezeichnung||"–")}</td></tr>
<tr><td>Material</td><td>${esc((findMeasurementMaterial(a.material)||{}).name||"–")}</td></tr>
<tr><td>Schenkel</td><td>${a.schenkel.length}</td></tr>
<tr><td>Segmente</td><td>${(a.segmente||[]).length}</td></tr>
<tr><td>Fotos / Skizze</td><td>${(a.fotos||[]).length} Foto(s)${a.skizze?" · Skizze vorhanden":""}</td></tr>
</tbody></table></div>`;
 return karte("6 · Kontrolle",uebersicht+`<div class="p-pruefung">`+m.map(x=>
  `<div class="p-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>
<div id="p-profilKontrolle" class="p-zeichnung">${profilSvg(a.schenkel)}</div>`);
}

// 7 · Fotos, Skizze, Notiz, Speichern
function schritt7(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto">
<img src="${esc(f)}" alt="Foto ${i+1}"><button type="button" class="p-weg" data-foto-weg="${i}">✕</button></div>`).join("");
 return karte("7 · Fotos",`<label class="p-datei">📷 Foto aufnehmen oder wählen
<input type="file" id="p-fotoInput" accept="image/*" capture="environment" multiple hidden></label>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
<div class="p-klein-text">Fotos werden verkleinert im Browser abgelegt. Beim späteren Einbau in
die App gehen sie wie gehabt in den privaten Speicher von Supabase, zugeordnet zu Projekt und
Massaufnahme.</div>`)
+karte("Skizze",`${a.skizze
 ?`<div class="p-foto gross"><img src="${esc(a.skizze)}" alt="Skizze"><button type="button" class="p-weg" id="p-skizzeWeg">✕</button></div>`
 :'<div class="p-leer">Noch keine Skizze.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-skizzeOeffnen">✏️ ${a.skizze?"Skizze bearbeiten":"Skizze zeichnen"}</button></div>
<div class="p-skizzeBox" id="p-skizzeBox" hidden>
<canvas id="p-skizzeCanvas"></canvas>
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-skizzeSpeichern">✓ Übernehmen</button>
<button type="button" class="p-grau" id="p-skizzeLeeren">Leeren</button>
<button type="button" class="p-grau" id="p-skizzeAbbrechen">Abbrechen</button>
</div></div>`)
+karte("Bemerkung und Speichern",`<textarea id="p-bemerkung" rows="4" placeholder="Bemerkung zur Massaufnahme">${esc(a.bemerkung||"")}</textarea>
<div class="p-knopfreihe"><button type="button" class="p-gruen" id="p-speichern2">💾 Speichern</button></div>`);
}

function inhaltHtml(){
 return [schritt1,schritt2,schritt3,schritt4,schritt5,schritt6,schritt7][schritt-1]();
}

// ---- 10. Liste ------------------------------------------------------------
let listeOffen=false;
function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b><span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">${(a.schenkel||[]).length} Schenkel · ${(a.segmente||[]).length} Segment(e)${(a.fotos||[]).length?" · "+a.fotos.length+" Foto(s)":""}${a.skizze?" · Skizze":""}${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}

// ---- 11. Zeichnen ---------------------------------------------------------
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
// Zeichnung und die abgeleiteten Anzeigen.
function live(){
 const a=aufnahme;
 const svg=profilSvg(a.schenkel);
 const p1=$("p-profilBild"); if(p1)p1.innerHTML=svg;
 const p2=$("p-profilGross"); if(p2)p2.innerHTML=svg;
 const p3=$("p-profilKontrolle"); if(p3)p3.innerHTML=svg;
 // Kopfzeilen der Schenkel mitführen, ohne die Eingabefelder zu ersetzen.
 a.schenkel.forEach((s,i)=>{
  const block=document.querySelector('[data-schenkel-zeile="'+i+'"]');
  if(!block)return;
  const kopf=block.querySelector(".p-zeile-kopf .p-klein-text");
  if(kopf)kopf.textContent=mm(s.laenge)+" mm · "+mm(s.winkel)+"°"
   +(istUmschlagSchenkel(s)?" · Umschlag":"")+(i===0?" · Startschenkel":"");
 });
 // Kopfzeilen der Segmente ebenso.
 (a.segmente||[]).forEach((seg,i)=>{
  const block=document.querySelector('[data-seg-zeile="'+i+'"]');
  if(!block)return;
  const kopf=block.querySelector(".p-zeile-kopf .p-klein-text");
  const ab=abwicklungSegment(seg);
  if(kopf)kopf.textContent="Abwicklung "+(istKonisch()?mm(ab.links)+" / "+mm(ab.rechts):mm(ab.links))
   +" mm · Fläche "+flaecheSegmentM2(seg).toFixed(2).replace(".",",")+" m²";
 });
}

// ---- 12. Fotos und Skizze -------------------------------------------------
const FOTO_MAXKANTE=1400, FOTO_QUALITAET=0.72;
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
 // Vorhandene Skizze weiterbearbeiten statt neu anfangen.
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

// ---- 13. Bedienung --------------------------------------------------------
// Eine einzige Stelle je Ereignisart, delegiert von der Wurzel.
// Tippen (input) ändert nur das Modell und die Zeichnung, Auswählen (change)
// und Klicken zeichnen neu.
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
  else if(d.schenkelLaenge!==undefined){schenkelLaengeSetzen(Number(d.schenkelLaenge),t.value);nurLive=true}
  else if(d.schenkelWinkel!==undefined){
   const s=a.schenkel[Number(d.schenkelWinkel)];
   if(s){s.winkel=zahl(t.value);nurLive=true}
  }
  else if(d.segLaenge!==undefined){
   const seg=a.segmente[Number(d.segLaenge)];
   if(seg){seg.laenge=zahl(t.value);nurLive=true}
  }
  else if(d.segMass!==undefined||d.segLinks!==undefined||d.segRechts!==undefined){
   const key=d.segMass??d.segLinks??d.segRechts;
   const [si,sj]=String(key).split("_").map(Number);
   const seg=a.segmente[si];
   if(seg){
    if(!seg.massen)seg.massen=[];
    if(!seg.massen[sj])seg.massen[sj]={mass:0,links:0,rechts:0};
    if(d.segMass!==undefined)seg.massen[sj].mass=zahl(t.value);
    else if(d.segLinks!==undefined)seg.massen[sj].links=zahl(t.value);
    else seg.massen[sj].rechts=zahl(t.value);
    nurLive=true;
   }
  }
  else return;
  if(nurLive)live();
 });

 w.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=aufnahme;
  if(t.id==="p-datum"){a.datum=t.value;return}
  if(t.id==="p-material"){a.material=t.value;zeichne();return}
  if(t.id==="p-konisch"){a.konisch=t.value;zeichne();return}
  if(t.id==="p-ansicht"){a.ansicht=t.value;zeichne();return}
  if(t.id==="p-fotoInput"){fotosAufnehmen(t.files);return}
 });

 w.addEventListener("click",e=>{
  const t=e.target.closest("button,label,[data-schritt],[data-oeffnen],[data-kopieren],[data-loeschen]");
  if(!t)return;
  const d=t.dataset||{}, a=aufnahme;
  if(d.schritt!==undefined){setzeSchritt(d.schritt);return}
  if(t.id==="p-zurueck"){if(schritt>1)setzeSchritt(schritt-1);return}
  if(t.id==="p-weiter"){
   if(schritt<SCHRITTE.length){setzeSchritt(schritt+1);return}
   if(speichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent="Fertig › Speichern"},1400)}
   return;
  }
  if(t.id==="p-speichern"||t.id==="p-speichern2"){
   if(speichern()){const alt=t.textContent;t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent=alt},1400)}
   return;
  }
  if(t.id==="p-neu"){
   if(confirm("Neue Massaufnahme beginnen? Nicht Gespeichertes geht verloren.")){
    aufnahme=leereAufnahme(); vorschauSchliessen(); erkennungStatus="";
    schritt=1; zeichne();
   }
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
  if(d.oeffnen!==undefined){oeffnen(d.oeffnen);return}
  if(d.kopieren!==undefined){kopieren(d.kopieren);return}
  if(d.loeschen!==undefined){
   if(confirm("Diese gespeicherte Massaufnahme wirklich löschen?")){loeschen(d.loeschen);zeichne()}
   return;
  }
  // ---- Schenkel
  if(t.id==="p-schenkelPlus"){
   if(a.schenkel.length>=FP_MAX_SCHENKEL){
    alert("Mehr als "+FP_MAX_SCHENKEL+" Schenkel lässt die App nicht zu.");return;
   }
   a.schenkel.push(neuerSchenkel()); zeichne(); return;
  }
  if(d.schenkelWeg!==undefined){
   a.schenkel.splice(Number(d.schenkelWeg),1);
   // Die Masse der Segmente wandern mit, damit Schenkel und Mass zusammenbleiben.
   (a.segmente||[]).forEach(seg=>{if(seg.massen)seg.massen.splice(Number(d.schenkelWeg),1)});
   zeichne(); return;
  }
  if(d.schenkelFlip!==undefined){schenkelUmkehren(Number(d.schenkelFlip)); zeichne(); return}
  if(d.schenkelUmschlag!==undefined){schenkelUmschlag(Number(d.schenkelUmschlag)); zeichne(); return}
  if(d.schenkelHoch!==undefined){
   const i=Number(d.schenkelHoch);
   if(i>0){
    const x=a.schenkel.splice(i,1)[0]; a.schenkel.splice(i-1,0,x);
    (a.segmente||[]).forEach(seg=>{if(seg.massen){const y=seg.massen.splice(i,1)[0];seg.massen.splice(i-1,0,y)}});
   }
   zeichne(); return;
  }
  if(d.schenkelRunter!==undefined){
   const i=Number(d.schenkelRunter);
   if(i<a.schenkel.length-1){
    const x=a.schenkel.splice(i,1)[0]; a.schenkel.splice(i+1,0,x);
    (a.segmente||[]).forEach(seg=>{if(seg.massen){const y=seg.massen.splice(i,1)[0];seg.massen.splice(i+1,0,y)}});
   }
   zeichne(); return;
  }
  // ---- Segmente
  if(t.id==="p-segmentPlus"){a.segmente.push(neuesSegment()); zeichne(); return}
  if(d.segWeg!==undefined){a.segmente.splice(Number(d.segWeg),1); zeichne(); return}
  if(d.segUebernehmen!==undefined){masseAusProfil(Number(d.segUebernehmen)); zeichne(); return}
  if(d.segAlleRechts!==undefined){alleNachRechts(Number(d.segAlleRechts)); zeichne(); return}
  if(d.segNachRechts!==undefined){
   const [si,sj]=String(d.segNachRechts).split("_").map(Number);
   const seg=a.segmente[si];
   if(seg&&segmentMassen(seg)[sj]){seg.massen[sj].rechts=zahl(seg.massen[sj].links)}
   zeichne(); return;
  }
  // ---- Skizzen-Erkennung
  if(t.id==="p-erkennen"){erkennungStarten(); return}
  if(t.id==="p-erkanntUebernehmen"){
   if(erkanntesUebernehmen())zeichne();
   return;
  }
  if(t.id==="p-erkanntVerwerfen"){
   vorschauSchliessen();
   erkennungStatus="Erkannte Form verworfen. Das bestehende Profil bleibt unverändert.";
   zeichne(); return;
  }
  if(t.id==="p-zuFotos"){setzeSchritt(7); return}
  // ---- Fotos und Skizze
  if(d.fotoWeg!==undefined){a.fotos.splice(Number(d.fotoWeg),1); zeichne(); return}
  if(t.id==="p-skizzeWeg"){a.skizze=null; zeichne(); return}
  if(t.id==="p-skizzeOeffnen"){skizzeOeffnen(); return}
  if(t.id==="p-skizzeLeeren"){
   const c=$("p-skizzeCanvas");
   if(c&&skizzeCtx){skizzeCtx.fillStyle="#fff";skizzeCtx.fillRect(0,0,c.width,c.height);skizzeCtx.strokeStyle="#17202a"}
   return;
  }
  if(t.id==="p-skizzeAbbrechen"){const b=$("p-skizzeBox"); if(b)b.hidden=true; return}
  if(t.id==="p-skizzeSpeichern"){
   const c=$("p-skizzeCanvas");
   if(c){try{a.skizze=c.toDataURL("image/png")}catch(err){}}
   const b=$("p-skizzeBox"); if(b)b.hidden=true;
   zeichne(); return;
  }
 });

 // Skizze zeichnen - Maus und Finger.
 const start=ev=>{
  const c=$("p-skizzeCanvas");
  if(!c||!skizzeCtx||ev.target!==c)return;
  ev.preventDefault();
  skizzeZeichnet=true;
  const [x,y]=skizzePunkt(ev,c);
  skizzeCtx.beginPath(); skizzeCtx.moveTo(x,y);
 };
 const zug=ev=>{
  const c=$("p-skizzeCanvas");
  if(!skizzeZeichnet||!c||!skizzeCtx)return;
  ev.preventDefault();
  const [x,y]=skizzePunkt(ev,c);
  skizzeCtx.lineTo(x,y); skizzeCtx.stroke();
 };
 const stopp=()=>{skizzeZeichnet=false};
 w.addEventListener("mousedown",start); w.addEventListener("touchstart",start,{passive:false});
 w.addEventListener("mousemove",zug);   w.addEventListener("touchmove",zug,{passive:false});
 w.addEventListener("mouseup",stopp);   w.addEventListener("touchend",stopp);
 w.addEventListener("mouseleave",stopp);
}

// ---- 14. Start ------------------------------------------------------------
if(typeof document!=="undefined"&&document.addEventListener){
 document.addEventListener("DOMContentLoaded",()=>{verdrahten();zeichne()});
 if(document.readyState!=="loading"){verdrahten();zeichne()}
}
