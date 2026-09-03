"use strict";
// ===========================================================================
// PROTOTYP  ·  Massaufnahme "Einlaufblech gerade"
// ===========================================================================
// Baut auf dem bestehenden Modul der laufenden App auf. Gerechnet und
// gezeichnet wird mit den Funktionen aus uebernommen.js, die zeichengenau aus
// js/11, js/13 und js/14 stammen. Neu ist hier ausschliesslich die Bedienung:
// sechs Register statt eines langen Formulars, plus Kontrolle, Ausmass und
// Materialübersicht, die es im bestehenden Modul noch nicht gibt.
//
// Aus js/15-einlaufblech-stueckliste.js sind drei Rechenregeln übernommen.
// Sie stehen dort mitten im Formularcode und lesen ihre Werte direkt aus den
// Eingabefeldern; hier sind sie unverändert als Formel notiert:
//
//   enge Seite   = Montage "links"  -> "rechts", sonst "links"     (ebEngeSeite)
//   Restbreite   = Abwicklung − Mass A − Umschlag oben − Umschlag unten
//                                                                 (ebRestbreite)
//   enges Mass A = max(0, Mass A − 2)                             (massAEng)
//
// Die 2 mm sind in der App fest verdrahtet - siehe Abschnitt "Offene Punkte"
// im Bericht.
// ===========================================================================

// ---- 1. Register ----------------------------------------------------------
const SCHRITTE=["Grunddaten","Geometrie","Ausführung","Fotos & Skizze","Kontrolle","Ausmass"];
let schritt=1;

// ---- 2. Modell ------------------------------------------------------------
const SPEICHER="pebg_aufnahmen";
const zahlSicher=(v,ersatz)=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:ersatz};
function leereAufnahme(){
 return {
  id:"eb"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  erstellt:new Date().toISOString(), geaendert:null,
  bezeichnung:"", datum:new Date().toISOString().slice(0,10), objekt:"",
  material:"", abwicklung:250, montage:"links",
  massA:0, winkel:0,
  gesamtlaenge:0, stuecke:[],
  gava:{aktiv:false,abstand_mm:zahlSicher(einlaufblechSettings.gava_abstand,500),anzahl:null},
  fotos:[], skizze:null, bemerkung:""
 };
}
let aufnahme=leereAufnahme();

const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const mm=v=>Math.round(zahl(v)).toLocaleString("de-CH");
const meter=v=>(zahl(v)/1000).toFixed(2).replace(".",",");

// ---- 3. Übernommene Rechenregeln (siehe Kopf) -----------------------------
function engeSeite(a){return a.montage==="links"?"rechts":"links"}
function restbreite(a){
 return zahl(a.abwicklung)-zahl(a.massA)
  -zahl(einlaufblechSettings.umschlag_oben)-zahl(einlaufblechSettings.umschlag_unten);
}
function massAEng(a){return Math.max(0,zahl(a.massA)-2)}
function gesamtlaengeStuecke(a){return (a.stuecke||[]).reduce((s,p)=>s+zahl(p.laenge),0)}
function materialText(a){const m=findMeasurementMaterial(a.material);return m?m.name:"–"}
// Haltebleche ("GAVA Blech") - dieselbe Rechnung wie der Halterabstand bei
// Rinne Halbrund in der laufenden App (js/28-rinne-aufnahme.js):
//     Anzahl = floor(Länge / Abstand) + 1
// Sie greift nur, wenn das Kästchen "GAVA Blech" angekreuzt ist.
function gavaAnzahl(a){
 if(!a.gava||!a.gava.aktiv)return null;
 const L=gesamtlaengeStuecke(a), ab=zahl(a.gava.abstand_mm);
 if(L<=0||ab<=0)return null;
 if(a.gava.anzahl!==null&&a.gava.anzahl!==undefined&&a.gava.anzahl!=="")return Math.round(zahl(a.gava.anzahl));
 return Math.floor(L/ab)+1;
}
function gavaVorschlag(a){
 const L=gesamtlaengeStuecke(a), ab=zahl(a.gava&&a.gava.abstand_mm);
 if(L<=0||ab<=0)return null;
 return Math.floor(L/ab)+1;
}
function gavaText(a){
 const n=gavaAnzahl(a);
 return n===null?"–":(n+" Stk.");
}

// ---- Fläche und Rollenblech ----------------------------------------------
// Blechfläche = Gesamtlänge x Abwicklung. Beides ist erfasst, es wird nichts
// geschätzt.
function flaecheM2(a){
 return gesamtlaengeStuecke(a)*zahl(a.abwicklung)/1e6;
}
// Zuschnitt aus Rollenblech.
//
// So wird tatsächlich gearbeitet: von der Rolle wird eine TAFEL abgeschnitten
// und quer in Streifen von der Breite der Abwicklung geteilt. Die Tafel ist
// höchstens so lang wie das längste Einlaufblechstück - länger liesse sie sich
// nicht mehr vernünftig handhaben. Ein Streifen kann mehrere Stücke
// HINTEREINANDER aufnehmen, genau wie eine Normlänge bei der Rinne.
//
//   Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)
//   Tafellänge        = längstes Einlaufblechstück
//   Streifen          = wie viele Streifen nötig sind, wenn man die Stücke
//                       hintereinander legt (möglichst wenige)
//   Tafeln            = aufgerundet(Streifen ÷ Streifen je Tafel)
//
// Die Streifenverteilung ist dasselbe Problem wie die Normlängen bei der
// Rinne: zuerst eine gierige Lösung, danach der Versuch, mit weniger
// Streifen auszukommen. Reicht das Suchbudget nicht, wird die gierige
// Lösung zurückgegeben und ausdrücklich NICHT als beste ausgewiesen.
function packeInStreifen(bleche,L,budget){
 // bleche: [{nr, laenge}] - die Nummer reist mit, damit in der Liste jedes
 // Blech mit SEINER genauen Länge steht und nicht nur eine nackte Zahl.
 const stuecke=bleche.filter(x=>zahl(x.laenge)>0).slice()
  .sort((a,b)=>zahl(b.laenge)-zahl(a.laenge));
 if(!stuecke.length)return {streifen:[],optimal:true};
 if(zahl(stuecke[0].laenge)>L)
  return {streifen:null,optimal:true,zuLang:stuecke.filter(x=>zahl(x.laenge)>L)};
 // gierig: jedes Blech in den ersten Streifen, in den es noch passt
 const gierig=[];
 stuecke.forEach(x=>{
  const s=gierig.find(g=>g.rest>=zahl(x.laenge)-1e-9);
  if(s){s.stuecke.push(x);s.rest-=zahl(x.laenge)}
  else gierig.push({stuecke:[x],rest:L-zahl(x.laenge)});
 });
 const summe=stuecke.reduce((a,b)=>a+zahl(b.laenge),0);
 const untergrenze=Math.ceil(summe/L-1e-9);
 let schritte=0, grenze=budget||200000;
 // Passen alle Stücke in k Streifen? Rückwärts füllen, gleiche Restlängen
 // nur einmal probieren.
 function passt(i,reste){
  if(i>=stuecke.length)return true;
  if(++schritte>grenze)return null;
  const len=zahl(stuecke[i].laenge), gesehen=[];
  for(let j=0;j<reste.length;j++){
   if(reste[j]<len-1e-9)continue;
   if(gesehen.indexOf(reste[j])>=0)continue;
   gesehen.push(reste[j]);
   reste[j]-=len;
   const r=passt(i+1,reste);
   reste[j]+=len;
   if(r===null)return null;
   if(r)return true;
  }
  return false;
 }
 for(let k=untergrenze;k<gierig.length;k++){
  schritte=0;
  const r=passt(0,new Array(k).fill(L));
  if(r===null)return {streifen:gierig,optimal:false};
  if(r){
   // dieselbe Suche noch einmal, diesmal mit Mitschrift der Verteilung
   const streifen=Array.from({length:k},()=>({stuecke:[],rest:L}));
   const setze=i=>{
    if(i>=stuecke.length)return true;
    const len=zahl(stuecke[i].laenge), gesehen=[];
    for(let j=0;j<streifen.length;j++){
     if(streifen[j].rest<len-1e-9)continue;
     if(gesehen.indexOf(streifen[j].rest)>=0)continue;
     gesehen.push(streifen[j].rest);
     streifen[j].stuecke.push(stuecke[i]); streifen[j].rest-=len;
     if(setze(i+1))return true;
     streifen[j].stuecke.pop(); streifen[j].rest+=len;
    }
    return false;
   };
   if(setze(0))return {streifen,optimal:true};
   return {streifen:gierig,optimal:false};
  }
 }
 return {streifen:gierig,optimal:true};
}
function tafelLaenge(a){
 const l=(a.stuecke||[]).map(p=>zahl(p.laenge)).filter(x=>x>0);
 return l.length?Math.max.apply(null,l):0;
}
function rollenPlan(a){
 const A=zahl(a.abwicklung);
 const bleche=(a.stuecke||[]).map((p,i)=>({nr:i+1,laenge:zahl(p.laenge)}))
  .filter(x=>x.laenge>0);
 const L=tafelLaenge(a);
 const breiten=aktiveRollenbreiten();
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,tafelLaenge:L};
 const verteilung=packeInStreifen(bleche,L);
 const moeglich=[], zuSchmal=[];
 const netto=flaecheM2(a);
 breiten.forEach(B=>{
  const jeTafel=Math.floor(B/A);
  if(jeTafel<1){zuSchmal.push(B);return}
  const streifen=verteilung.streifen||[];
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
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,
         tafelLaenge:L,verteilung,netto};
}

// ---- 3b. Grundriss ohne den Blickrichtungspfeil am linken Rand -----------
// generateEbkGrundriss() aus js/13 haengt immer ansichtsPfeilSvg("links",…)
// an. Die Zeichenflaeche ist dort fest 368x368 (target 280 + 2x44 pad), der
// Pfeil ist also zeichengenau vorhersagbar - so laesst er sich entfernen,
// ohne js/13 anzufassen und ohne im SVG herumzuraten.
const EBK_FLAECHE=368;
function grundrissHtml(a){
 const svg=generateEbkGrundriss((a&&a.stuecke)||[]);
 const pfeil=(typeof ansichtsPfeilSvg==="function")
   ?ansichtsPfeilSvg("links",EBK_FLAECHE,EBK_FLAECHE):"";
 return (pfeil&&svg.indexOf(pfeil)>=0)?svg.replace(pfeil,""):svg;
}

// ---- 4. Stücke ------------------------------------------------------------
// Aufteilung unverändert über teileLaengeInStuecke() aus js/13.
function stueckeAusGesamtlaenge(L){
 const stossLaenge=zahl(einlaufblechSettings.stoss_laenge)||1;
 return teileLaengeInStuecke(L,einlaufblechSettings).map((len,i,alle)=>({
  laenge:len, stossStoss:i===alle.length-1?len:stossLaenge,
  gehrungLinks:false, gehrungRechts:false, winkel:0
 }));
}
// Gehrung: dieselbe Regel wie in js/15 - Zugabe auf die Länge, Winkel 90,
// und die gleiche physische Ecke am Nachbarstück wird mitgesetzt.
function gehrungSetzen(i,seite,an){
 const p=aufnahme.stuecke[i]; if(!p)return;
 const zugabe=zahl(einlaufblechSettings.gehrungszugabe);
 const key=seite==="links"?"gehrungLinks":"gehrungRechts";
 const war=!!p[key];
 p[key]=!!an;
 if(an&&!war){
  p.laenge=zahl(p.laenge)+zugabe; p.winkel=90;
  const nachbar=seite==="links"?aufnahme.stuecke[i-1]:aufnahme.stuecke[i+1];
  const nkey=seite==="links"?"gehrungRechts":"gehrungLinks";
  if(nachbar&&!nachbar[nkey]){
   nachbar[nkey]=true; nachbar.laenge=zahl(nachbar.laenge)+zugabe; nachbar.winkel=90;
  }
 }else if(!an&&war){
  p.laenge=Math.max(0,zahl(p.laenge)-zugabe);
 }
 if(!p.gehrungLinks&&!p.gehrungRechts)p.winkel=0;
}
// Endzugabe: unverändert die Regel aus js/15 - immer auf das Reststück
// (letztes Stück), weil kein reguläres Stück länger sein darf als
// Länge Stoss/Stoss + Überlappung.
function endzugabeSchalten(position){
 const liste=aufnahme.stuecke;
 if(!liste.length)return "Bitte zuerst Stücke erfassen.";
 const zugabe=zahl(einlaufblechSettings.end_zugabe);
 if(!zugabe)return "In den Einstellungen ist keine Endzugabe (> 0 mm) hinterlegt.";
 const p=liste[liste.length-1];
 const key=position==="start"?"endzugabeStart":"endzugabeEnd";
 if(p[key]){p.laenge=Math.max(0,zahl(p.laenge)-p[key]); p[key]=0;}
 else{p.laenge=zahl(p.laenge)+zugabe; p[key]=zugabe;}
 return null;
}

// ---- 4b. Stücke aus einer Rinne-Massaufnahme übernehmen -------------------
// Genau wie in der laufenden App (js/15): die Segmente der Rinne werden mit
// baueEinlaufblechStueckeAusRinne() aus js/13 in Einlaufblech-Stücke
// umgerechnet - mit den Einstellungen von Einlaufblech gerade und ohne
// Mass links/rechts. Die Funktion ist unverändert übernommen.
//
// Woher die Rinnen kommen: in der App aus Supabase, im Prototyp aus dem
// Speicher des Rinnen-Prototyps auf demselben Gerät. Liegt dort nichts
// (etwa weil die beiden Testapps auf dem Tablet getrennt liegen), lässt
// sich eine Massaufnahme auch als Text einfügen.
const RINNE_SPEICHER="sd_prototyp_rinne_halbrund";
function rinneAufnahmen(){
 try{
  const l=JSON.parse(localStorage.getItem(RINNE_SPEICHER)||"[]");
  return Array.isArray(l)?l:[];
 }catch(e){return []}
}
// Segmente lesen - aus dem Rinnen-Prototyp (a.segmente) ODER aus einer
// Massaufnahme der laufenden App (m.data.segments). Beide haben laenge
// und winkel je Segment, mehr braucht die Umrechnung nicht.
function rinneSegmenteAus(m){
 const roh=(m&&Array.isArray(m.segmente))?m.segmente
   :((m&&m.data&&Array.isArray(m.data.segments))?m.data.segments:[]);
 return roh.map(x=>({laenge:zahl(x&&x.laenge),winkel:zahl(x&&x.winkel)}))
   .filter(x=>x.laenge>0);
}
function rinneName(m){
 return String((m&&(m.bezeichnung||m.title))||"Ohne Bezeichnung");
}
function rinneDatum(m){
 const d=new Date((m&&(m.geaendert||m.erstellt||m.date))||"");
 return isNaN(d)?"–":d.toLocaleDateString("de-CH");
}
// Erzeugt die Stücke. Gibt einen Fehlertext zurück oder null bei Erfolg.
function stueckeAusRinneUebernehmen(m){
 const segs=rinneSegmenteAus(m);
 if(!segs.length)return "Diese Rinnen-Massaufnahme hat keine Segmente mit einer Länge.";
 aufnahme.stuecke=baueEinlaufblechStueckeAusRinne(segs,einlaufblechSettings,
   l=>teileLaengeInStuecke(l,einlaufblechSettings),false);
 return null;
}

// ---- 5. Plausibilität -----------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen. Es
// werden KEINE fachlichen Grenzwerte erfunden (siehe Bericht).
function pruefungen(a){
 const m=[], s=einlaufblechSettings;
 const uO=zahl(s.umschlag_oben), uU=zahl(s.umschlag_unten);
 if(!zahl(a.massA))m.push({art:"fehler",text:"Mass A fehlt. Es ist im bestehenden Modul ein Pflichtfeld."});
 else if(zahl(a.massA)<0)m.push({art:"fehler",text:"Mass A ist negativ."});
 if(a.winkel===""||a.winkel===null||a.winkel===undefined)
  m.push({art:"fehler",text:"Dachneigung / Winkel fehlt. Im bestehenden Modul ein Pflichtfeld."});
 else if(zahl(a.winkel)<=0||zahl(a.winkel)>=180)
  m.push({art:"fehler",text:"Winkel "+zahl(a.winkel)+"° lässt sich nicht zeichnen: die Schnittzeichnung rechnet mit 180° − Winkel, also nur zwischen 0° und 180°."});
 const rb=restbreite(a);
 if(rb<0)m.push({art:"fehler",text:"Restbreite "+mm(rb)+" mm – Mass A und die Umschläge sind zusammen grösser als die Abwicklung ("+mm(a.abwicklung)+" mm)."});
 else if(rb===0)m.push({art:"warnung",text:"Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig."});
 if(uO<=0||uU<=0)m.push({art:"warnung",text:"Umschlag oben oder unten ist 0 mm. Die Schnittzeichnung zeigt dafür nur einen Platzhalter."});
 if(!(a.stuecke||[]).length)
  m.push({art:"fehler",text:"Noch kein Stück erfasst. Das bestehende Modul verlangt mindestens ein Stück mit einer Länge."});
 else{
  if(!a.stuecke.some(p=>zahl(p.laenge)>0))
   m.push({art:"fehler",text:"Kein Stück hat eine Länge grösser als 0 mm."});
  a.stuecke.forEach((p,i)=>{
   if(zahl(p.laenge)<0)m.push({art:"fehler",text:"Stück "+(i+1)+" hat eine negative Länge."});
   const grenze=zahl(s.stoss_laenge)+zahl(s.ueberlappung);
   if(i<a.stuecke.length-1&&zahl(p.laenge)>grenze)
    m.push({art:"warnung",text:"Stück "+(i+1)+" ist "+mm(p.laenge)+" mm lang. Ausser dem Reststück darf kein Stück länger sein als Länge Stoss/Stoss + Überlappung ("+mm(grenze)+" mm)."});
  });
 }
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt – die Materialübersicht bleibt dadurch unvollständig."});
 if(!String(a.bezeichnung||"").trim())
  m.push({art:"warnung",text:"Keine Bezeichnung – gespeicherte Aufnahmen sind dann schwer auseinanderzuhalten."});
 return m;
}

// ---- 6. Ausmass und Material ----------------------------------------------
// Beides entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites
// Mal eingegeben, und es gibt keine Artikelnummern und keine Preise.
function ausmassZeilen(a){
 const z=[], L=gesamtlaengeStuecke(a);
 let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(L>0)zeile("Einlaufblech gerade, Abwicklung "+mm(a.abwicklung)+" mm",meter(L),"m","Summe der Zuschnittlängen");
 if((a.stuecke||[]).length)zeile("Stücke (Zuschnitte)",a.stuecke.length,"Stk.","Stückliste");
 const gehrungen=(a.stuecke||[]).reduce((s,p)=>s+(p.gehrungLinks?1:0)+(p.gehrungRechts?1:0),0);
 if(gehrungen)zeile("Gehrungen",gehrungen,"Stk.","Stückliste");
 const stoss=Math.max(0,(a.stuecke||[]).length-1);
 if(stoss)zeile("Blechstösse",stoss,"Stk.","je Übergang zwischen zwei Stücken");
 if(L>0)zeile("Blechfläche","​"+flaecheM2(a).toFixed(2).replace(".",","),"m²",
   "Gesamtlänge × Abwicklung");
 const nG=gavaAnzahl(a);
 if(nG!==null)zeile("Haltebleche (GAVA Blech)",nG,"Stk.",
   (a.gava.anzahl?"Eingabe":"Länge ÷ Abstand "+mm(a.gava.abstand_mm)+" mm"));
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 if(letzte&&zahl(letzte.endzugabeStart))zeile("Endzugabe erstes Stück",mm(letzte.endzugabeStart),"mm","Einstellung Endzugabe");
 if(letzte&&zahl(letzte.endzugabeEnd))zeile("Endzugabe letztes Stück",mm(letzte.endzugabeEnd),"mm","Einstellung Endzugabe");
 return z;
}
function materialUebersicht(a){
 const L=gesamtlaengeStuecke(a);
 if(L<=0)return [];
 const liste=[{
  bezeichnung:"Einlaufblech gerade, Abwicklung "+mm(a.abwicklung)+" mm",
  menge:meter(L), einheit:"m", flaeche:flaecheM2(a).toFixed(2).replace(".",","),
  material:materialText(a)
 }];
 const nG=gavaAnzahl(a);
 if(nG!==null)liste.push({bezeichnung:"Haltebleche (GAVA Blech)",
  menge:nG, einheit:"Stk.", flaeche:"–", material:materialText(a)});
 return liste;
}

// ---- 7. Ablage ------------------------------------------------------------
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
function oeffnen(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 aufnahme=JSON.parse(JSON.stringify({...leereAufnahme(),...a}));
 if(!aufnahme.gava||typeof aufnahme.gava!=="object")
  aufnahme.gava={aktiv:false,abstand_mm:zahlSicher(einlaufblechSettings.gava_abstand,500),anzahl:null};
 schritt=1; zeichne(); return true;
}
// Kopieren: eine eigenständige Aufnahme mit eigener Kennung. Änderungen an
// der Kopie dürfen das Original nicht berühren - deshalb eine tiefe Kopie.
function kopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 const k=JSON.parse(JSON.stringify(a));
 k.id="eb"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 k.erstellt=new Date().toISOString(); k.geaendert=null;
 k.bezeichnung=(a.bezeichnung||"Ohne Bezeichnung")+" (Kopie)";
 const liste=alleAufnahmen(); liste.unshift(k);
 localStorage.setItem(SPEICHER,JSON.stringify(liste));
 aufnahme=JSON.parse(JSON.stringify({...leereAufnahme(),...k}));
 if(!aufnahme.gava||typeof aufnahme.gava!=="object")
  aufnahme.gava={aktiv:false,abstand_mm:zahlSicher(einlaufblechSettings.gava_abstand,500),anzahl:null};
 schritt=1; zeichne(); return k.id;
}
function loeschen(id){
 localStorage.setItem(SPEICHER,JSON.stringify(alleAufnahmen().filter(x=>x.id!==id)));
}

// ---- 8. Oberfläche --------------------------------------------------------
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" p-voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}
function karte(titel,inhalt){return `<div class="p-karte"><h2>${esc(titel)}</h2>${inhalt}</div>`}

function registerHtml(){
 const p=pruefungen(aufnahme);
 const fehler=p.some(x=>x.art==="fehler"), warn=p.some(x=>x.art==="warnung");
 return `<div class="p-register" id="p-register">${SCHRITTE.map((t,i)=>{
  const n=i+1, punkt=n===5&&(fehler||warn)?`<span class="p-punkt ${fehler?"p-punkt-rot":"p-punkt-orange"}"></span>`:"";
  return `<button type="button" class="p-register-knopf${n===schritt?" aktiv":""}" data-schritt="${n}">
<span class="p-register-nr">${n}</span>${esc(t)}${punkt}</button>`;
 }).join("")}</div>`;
}

// Die Schnittzeichnung kommt UNVERÄNDERT aus js/11 und reagiert damit live
// auf Winkel, Mass A, Restbreite und die beiden Umschläge.
//
// js/11 beschriftet nur "A" und den Winkel. Der Auftrag verlangt, dass zu
// jeder Masslinie erkennbar ist, welches Feld dazugehört - deshalb legt der
// Prototyp drei weitere Beschriftungen darüber. Sie werden NICHT aus einer
// zweiten Geometrie gerechnet, sondern aus den Koordinaten, die js/11
// tatsächlich gezeichnet hat: der zweite Pfad ist der Restbreiten-Schenkel,
// die Häkchen an seinen Enden sind die Umschläge. Ändert js/11 seine
// Geometrie, wandern die Beschriftungen mit.
const FARBE={restbreite:"#2e7d4f",umschlag:"#b4610a"};
function punkteAusPfad(d){
 const zahlen=String(d).match(/-?\d+(?:\.\d+)?/g)||[];
 const pts=[];
 for(let i=0;i+1<zahlen.length;i+=2)pts.push([Number(zahlen[i]),Number(zahlen[i+1])]);
 return pts;
}
// Textrahmen abschätzen: getBBox() geht nicht, solange die Zeichnung noch ein
// String ist. Die Schätzung dient nur dem Ausweichen; der Prüfstand messt die
// tatsächlichen Rahmen danach im Browser nach.
function textKasten(x,y,text,gr,anker){
 const w=String(text).length*gr*0.56, h=gr*1.15;
 const x0=anker==="end"?x-w:(anker==="middle"?x-w/2:x);
 return {x:x0,y:y-gr*0.8,w,h};
}
const kastenSchneidet=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
// Die Beschriftungen, die js/11 selbst zeichnet ("A" und der Winkel), sind
// Hindernisse - sonst schreibt der Prototyp darüber.
function vorhandeneTexte(svg){
 const liste=[];
 for(const m of svg.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)" font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g))
  liste.push(textKasten(Number(m[1]),Number(m[2]),m[4],Number(m[3]),"start"));
 return liste;
}
function schnittHtml(a){
 const svg=einlaufblechDiagramSvg(a.winkel,a.massA,restbreite(a),
   einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten);
 const pfade=[...svg.matchAll(/<path d="(M [^"]+)"/g)].map(m=>punkteAusPfad(m[1]));
 const vb=(svg.match(/viewBox="([^"]+)"/)||[])[1];
 if(pfade.length<2||!vb)return svg;                  // Aufbau unerwartet: unverändert lassen
 const [vx,vy,vw,vh]=vb.split(/\s+/).map(Number);
 // Pfad 1 = Schenkel Mass A (mit Umschlag unten), Pfad 2 = Restbreite (mit
 // Umschlag oben). Reihenfolge wie in js/11.
 const unten=pfade[0], oben=pfade[1];
 const mitte=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];
 const abstand=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 const belegt=vorhandeneTexte(svg);
 const GR=12;
 // Eine Beschriftung so weit nach aussen schieben, bis sie frei steht.
 function setze(anker,rx,ry,text,farbe){
  const ank=rx>0.2?"start":(rx<-0.2?"end":"middle");
  for(const d of [30,42,54,66,78,90]){
   const px=anker[0]+rx*d, py=anker[1]+ry*d;
   const k=textKasten(px,py+4,text,GR,ank);
   if(!belegt.some(b=>kastenSchneidet(k,b))){
    belegt.push(k);
    const a1=[anker[0]+rx*6,anker[1]+ry*6], a2=[anker[0]+rx*(d-6),anker[1]+ry*(d-6)];
    return `<line x1="${a1[0].toFixed(1)}" y1="${a1[1].toFixed(1)}" x2="${a2[0].toFixed(1)}" y2="${a2[1].toFixed(1)}" stroke="${farbe}" stroke-width="1.4"/>`
     +`<text x="${px.toFixed(1)}" y="${(py+4).toFixed(1)}" font-size="${GR}" font-weight="700" fill="${farbe}"`
     +` font-family="Arial,Helvetica,sans-serif" text-anchor="${ank}">${esc(text)}</text>`;
   }
  }
  return "";                                        // kein freier Platz: lieber nichts
 }
 let zusatz="";
 // Umschläge zuerst: sie sitzen an festen Enden und haben weniger Spielraum.
 const umschlag=(pts,text)=>{
  if(pts.length<3)return "";
  const apex=pts[pts.length-3], spitze=pts[pts.length-1];
  const dx=spitze[0]-apex[0], dy=spitze[1]-apex[1], l=Math.hypot(dx,dy)||1;
  return setze(spitze,dx/l,dy/l,text,FARBE.umschlag);
 };
 zusatz+=umschlag(unten,"Umschlag unten");
 zusatz+=umschlag(oben,"Umschlag oben");
 // Restbreite: an der Mitte des zweiten Schenkels, auf der Aussenseite - das
 // ist die Seite, die weiter vom anderen Schenkel weg liegt.
 if(oben.length>=2&&unten.length>=2){
  const m=mitte(oben[0],oben[1]), mu=mitte(unten[0],unten[1]);
  const dx=oben[1][0]-oben[0][0], dy=oben[1][1]-oben[0][1], l=Math.hypot(dx,dy)||1;
  let nx=-dy/l, ny=dx/l;
  if(abstand([m[0]+nx*10,m[1]+ny*10],mu)<abstand([m[0]-nx*10,m[1]-ny*10],mu)){nx=-nx;ny=-ny}
  zusatz+=setze(m,nx,ny,"Restbreite",FARBE.restbreite);
 }
 // Die Beschriftungen brauchen Platz - die viewBox von js/11 kennt sie nicht.
 const luft=110;
 const neueVb=`${(vx-luft).toFixed(0)} ${(vy-30).toFixed(0)} ${(vw+2*luft).toFixed(0)} ${(vh+60).toFixed(0)}`;
 return svg.replace(`viewBox="${vb}"`,`viewBox="${neueVb}"`).replace("</svg>",zusatz+"</svg>");
}

function schritt1(){
 const a=aufnahme;
 const matOpt=['<option value="">– bitte wählen –</option>']
  .concat(measurementMaterials.map(m=>`<option value="${esc(m.id)}"${String(a.material)===String(m.id)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const abwOpt=[200,250,330].map(v=>`<option value="${v}"${zahl(a.abwicklung)===v?" selected":""}>${v} mm</option>`).join("");
 return karte("1 · Grunddaten",`<div class="p-grid">
${feld("Bezeichnung",`<input id="p-bezeichnung" value="${esc(a.bezeichnung)}" placeholder="z. B. Einlauf Nordseite">`,true)}
${feld("Datum",`<input id="p-datum" type="date" value="${esc(a.datum)}">`)}
${feld("Objekt / Adresse",`<input id="p-objekt" value="${esc(a.objekt)}" placeholder="z. B. Musterstrasse 1">`,true)}
${feld("Material",`<select id="p-material">${matOpt}</select>`)}
${feld("Abwicklung",`<select id="p-abwicklung">${abwOpt}</select>`)}
${feld("Montage",`<select id="p-montage">
<option value="links"${a.montage==="links"?" selected":""}>von links</option>
<option value="rechts"${a.montage==="rechts"?" selected":""}>von rechts</option></select>`)}
</div>
<div class="p-hinweis">Aus der Montage folgt die enge Seite: bei Montage „von ${esc(a.montage)}“
liegt das enge Mass auf der <b>${esc(engeSeite(a))}en</b> Seite jedes Stücks.
Abwicklung und Umschläge bestimmen zusammen mit Mass A die Restbreite.</div>`);
}

function formelText(a){
 return `Restbreite = Abwicklung − Mass A − Umschlag oben − Umschlag unten `
  +`(${mm(a.abwicklung)} − ${mm(a.massA)} − ${mm(einlaufblechSettings.umschlag_oben)} `
  +`− ${mm(einlaufblechSettings.umschlag_unten)} = ${mm(restbreite(a))} mm). `
  +`Das enge Mass ist Mass A − 2 mm und gilt auf der ${esc(engeSeite(a))}en Seite. `
  +`Beide Formeln stammen unverändert aus dem bestehenden Modul.`;
}
function schritt2(){
 const a=aufnahme, rb=restbreite(a);
 return karte("2 · Geometrie",`<div class="p-grid">
${feld("● Mass A (mm)",`<input class="p-gross" id="p-massA" type="number" inputmode="numeric" step="1" value="${a.massA||""}">`)}
${feld("● Dachneigung / Winkel (°)",`<input class="p-gross" id="p-winkel" type="number" inputmode="decimal" step="0.1" value="${a.winkel||""}">`)}
</div>
<div class="p-schnitt" id="p-schnitt">${schnittHtml(a)}</div>
<div class="p-legende">
<span class="p-lg p-lg-blau">A = Mass A</span>
<span class="p-lg p-lg-grau">Winkel</span>
<span class="p-lg p-lg-gruen">Restbreite</span>
<span class="p-lg p-lg-orange">Umschlag oben / unten</span>
<br>Jede Masslinie ist in der Zeichnung so beschriftet wie hier.
Restbreite und Umschläge sind keine Eingaben: die Restbreite folgt aus
Abwicklung und Mass A, die Umschläge stehen in den Einstellungen.
Der rote Pfeil links gibt die Blickrichtung an.</div>
<div class="p-zf-kopf">
<div><span>Restbreite (Dachschräge)</span><b id="p-wRest" class="${rb<0?"p-warnwert":""}">${mm(rb)} mm</b></div>
<div><span>Enges Mass A</span><b id="p-wEng">${mm(massAEng(a))} mm</b></div>
<div><span>Enge Seite</span><b id="p-wSeite">${esc(engeSeite(a))}</b></div>
</div>
<div class="p-hinweis" id="p-wFormel">${formelText(a)}</div>`);
}

function stueckZeilen(a){
 const eng=massAEng(a), rb=restbreite(a);
 if(!(a.stuecke||[]).length)
  return '<tr><td colspan="8" class="p-leer">Noch kein Stück. „Stücke aus Gesamtlänge berechnen“ oder „＋ Stück“.</td></tr>';
 return a.stuecke.map((p,i)=>`<tr>
<td>${i+1}</td>
<td class="p-num"><input class="p-tab-feld" data-stoss="${i}" type="number" inputmode="numeric" step="1" value="${zahl(p.stossStoss)}"></td>
<td class="p-num"><input class="p-tab-feld" data-laenge="${i}" type="number" inputmode="numeric" step="1" value="${zahl(p.laenge)}"></td>
<td class="p-mitte"><input type="checkbox" data-gl="${i}"${p.gehrungLinks?" checked":""}></td>
<td class="p-mitte"><input type="checkbox" data-gr="${i}"${p.gehrungRechts?" checked":""}></td>
<td class="p-num"><input class="p-tab-feld" data-winkel="${i}" type="number" inputmode="numeric" step="1" value="${zahl(p.winkel)}"></td>
<td class="p-num${rb<0?" p-warnwert":""}">${mm(eng)}${rb<0?" ⚠️":""}</td>
<td class="p-mitte"><button type="button" class="p-weg" data-stueck-weg="${i}" title="Stück löschen">✕</button></td>
</tr>`).join("");
}

function rinneUebernahmeHtml(){
 const liste=rinneAufnahmen();
 const zeilen=liste.map((m,i)=>{
  const n=rinneSegmenteAus(m).length;
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(rinneName(m))}</b>
<span class="p-klein-text">${esc(rinneDatum(m))} · ${n} Segment(e)</span></div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-rinne="${i}"${n?"":" disabled"}>↩️ Übernehmen</button>
</div></div>`;
 }).join("");
 return `<div class="p-hinweis">Aus den Rinnensegmenten werden Einlaufblech-Stücke
gerechnet – mit der Funktion der laufenden App. Eine Ecke im Rinnenverlauf wird
dabei zur Gehrung, und zu lange Segmente werden aufgeteilt.</div>
${liste.length?zeilen
 :`<div class="p-leer">Auf diesem Gerät ist keine Rinne-Halbrund-Massaufnahme
gespeichert. In der laufenden App stehen hier die Massaufnahmen des Projekts.</div>`}
<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-rinneEinfuegen">📋 Massaufnahme als Text einfügen</button>
</div>
<div id="p-rinneTextBox" hidden>
<textarea id="p-rinneText" rows="4" placeholder="Massaufnahme als JSON einfügen – aus dem Rinnen-Prototyp oder aus der App"></textarea>
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-rinneTextUebernehmen">↩️ Übernehmen</button>
<button type="button" class="p-grau" id="p-rinneTextAbbrechen">Abbrechen</button>
</div>
<div class="p-klein-text">Erwartet werden die Segmente der Rinne – entweder als
<code>segmente</code> (Rinnen-Prototyp) oder als <code>data.segments</code>
(laufende App). Nur Länge und Winkel je Segment werden gelesen.</div>
</div>`;
}
function schritt3(){
 const a=aufnahme, L=gesamtlaengeStuecke(a);
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 const s=einlaufblechSettings;
 return karte("3 · Ausführung: Stücke",`<div class="p-grid">
${feld("Gesamtlänge (mm)",`<input class="p-gross" id="p-gesamtlaenge" type="number" inputmode="numeric" step="1" value="${a.gesamtlaenge||""}">`)}
</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-stueckeNeu">🔄 Stücke aus Gesamtlänge berechnen</button>
<button type="button" class="p-grau" id="p-stueckeAnhaengen">＋ Gesamtlänge anhängen</button>
<button type="button" class="p-grau" id="p-stueckPlus">＋ Stück</button>
</div>
<h3>Stücke aus einer Rinne-Massaufnahme übernehmen</h3>
${rinneUebernahmeHtml()}
<div class="p-hinweis">Aufgeteilt wird mit der Funktion der laufenden App:
Länge Stoss/Stoss ${mm(s.stoss_laenge)} mm, Überlappung ${mm(s.ueberlappung)} mm,
Reststück-Schwelle ${mm(s.rest_schwelle)} mm. Eine Gehrung legt ${mm(s.gehrungszugabe)} mm
zu und setzt den Winkel auf 90° – am Nachbarstück derselben Ecke automatisch mit.</div>
<div class="p-tabelle">
<table><thead><tr><th>Nr.</th><th>Stoss/Stoss</th><th>Zuschnitt</th><th>Ger. L</th><th>Ger. R</th><th>Winkel</th><th>Eng ${esc(engeSeite(a))}</th><th></th></tr></thead>
<tbody id="p-stueckBody">${stueckZeilen(a)}</tbody></table>
</div>
<div class="p-zf-kopf">
<div><span>Stücke</span><b id="p-zfStueck">${(a.stuecke||[]).length}</b></div>
<div><span>Gesamtlänge</span><b id="p-zfLaenge">${L>0?mm(L)+" mm":"–"}</b></div>
<div><span>Abwicklung</span><b>${mm(a.abwicklung)} mm</b></div>
<div><span>Haltebleche</span><b id="p-zfGava">${gavaText(a)}</b></div>
</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-endStart">Endzugabe erstes Stück: ${letzte&&zahl(letzte.endzugabeStart)?"ein":"aus"}</button>
<button type="button" class="p-grau" id="p-endEnde">Endzugabe letztes Stück: ${letzte&&zahl(letzte.endzugabeEnd)?"ein":"aus"}</button>
</div>
<div class="p-klein-text">Die Endzugabe (${mm(s.end_zugabe)} mm) wird immer auf das Reststück gerechnet –
kein reguläres Stück darf länger sein als Stoss/Stoss + Überlappung.</div>
<h3>Haltebleche</h3>
<label class="p-schalter"><input type="checkbox" id="p-gava"${a.gava&&a.gava.aktiv?" checked":""}> GAVA Blech</label>
${a.gava&&a.gava.aktiv?`<div class="p-grid">
${feld("Abstand (mm)",`<input class="p-gross" id="p-gavaAbstand" type="number" inputmode="numeric" step="10" value="${zahl(a.gava.abstand_mm)||""}">`)}
${feld("Anzahl",`<input class="p-gross" id="p-gavaAnzahl" type="number" inputmode="numeric" step="1" value="${a.gava.anzahl??""}" placeholder="${gavaVorschlag(a)??""}">`)}
</div>
<div class="p-hinweis">${gavaVorschlag(a)!==null
 ?`Vorschlag aus ${mm(L)} mm Länge und ${mm(a.gava.abstand_mm)} mm Abstand:
<b>${gavaVorschlag(a)} Stk.</b>${a.gava.anzahl?"":" – gilt, solange keine eigene Anzahl eingetragen ist."}
<button type="button" class="p-grau" id="p-gavaUebernehmen" style="margin-left:6px">Vorschlag übernehmen</button>`
 :"Für einen Vorschlag braucht es Stücke mit einer Länge und einen Abstand grösser als 0 mm."}
<br>Gerechnet wird wie der Halterabstand bei Rinne Halbrund in der laufenden App:
Anzahl = ganzzahlig(Länge ÷ Abstand) + 1.</div>`
 :`<div class="p-klein-text">Ohne Haken wird keine Anzahl gerechnet und im Ausmass
erscheint keine Position dafür.</div>`}
<h3>Grundriss</h3>
<div class="p-grundriss" id="p-grundriss">${grundrissHtml(a)}</div>
<div class="p-klein-text">Die Nummern sind die Stücke, die kurzen Querstriche die
Blechstösse. Rote Pfeile zeigen die Blickrichtung auf das jeweilige Stück.</div>`);
}

function schritt4(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto">
<img src="${esc(f)}" alt="Foto ${i+1}"><button type="button" class="p-weg" data-foto-weg="${i}">✕</button></div>`).join("");
 return karte("4 · Fotos",`<label class="p-datei">📷 Foto aufnehmen oder wählen
<input type="file" id="p-fotoInput" accept="image/*" capture="environment" multiple hidden></label>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
<div class="p-klein-text">Fotos werden verkleinert im Browser abgelegt. Beim späteren Einbau
in die App gehen sie wie gehabt in den privaten Speicher von Supabase.</div>`)
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
+karte("Bemerkung",`<textarea id="p-bemerkung" rows="4" placeholder="Bemerkung zur Massaufnahme">${esc(a.bemerkung||"")}</textarea>`);
}

function schritt5(){
 const a=aufnahme, p=pruefungen(a), L=gesamtlaengeStuecke(a);
 return karte("5 · Kontrolle",`${p.length
  ?`<div class="p-pruefung">`+p.map(x=>
    `<div class="${x.art==="fehler"?"p-fehler":"p-warnung"}">${x.art==="fehler"?"⛔":"⚠️"} ${esc(x.text)}</div>`).join("")+`</div>`
  :`<div class="p-ok">✓ Keine Auffälligkeiten gefunden.</div>`}
<h3>Zusammenfassung</h3>
<div class="p-zf-kopf">
<div><span>Mass A</span><b>${mm(a.massA)} mm</b></div>
<div><span>Winkel</span><b>${zahl(a.winkel)}°</b></div>
<div><span>Restbreite</span><b class="${restbreite(a)<0?"p-warnwert":""}">${mm(restbreite(a))} mm</b></div>
<div><span>Enges Mass ${esc(engeSeite(a))}</span><b>${mm(massAEng(a))} mm</b></div>
<div><span>Abwicklung</span><b>${mm(a.abwicklung)} mm</b></div>
<div><span>Stücke</span><b>${(a.stuecke||[]).length}</b></div>
<div><span>Gesamtlänge</span><b>${L>0?mm(L)+" mm":"–"}</b></div>
<div><span>Material</span><b>${esc(materialText(a))}</b></div>
</div>
<div class="p-zf-fuss">Fotos: <b>${(a.fotos||[]).length}</b> · Skizze: <b>${a.skizze?"vorhanden":"keine"}</b></div>`);
}

// Aus welchem Streifen kommt Blech Nr. n?
function streifenVon(a,nr){
 const r=rollenPlan(a);
 const st=(r.verteilung&&r.verteilung.streifen)||[];
 for(let i=0;i<st.length;i++)
  if(st[i].stuecke.some(x=>x.nr===nr))return i+1;
 return null;
}
function rollenKarte(a){
 const A=zahl(a.abwicklung);
 const r=rollenPlan(a);
 const breiten=aktiveRollenbreiten();
 if(!breiten.length)
  return karte("Rollenblech und Verschnitt",
   `<div class="p-warnung">Es ist keine Rollenbreite aktiv. In den Einstellungen
mindestens eine anhaken – sonst wird der Materialbedarf <b>nicht</b> gerechnet.</div>`);
 if(!r.tafelLaenge||A<=0)
  return karte("Rollenblech und Verschnitt",`<div class="p-leer">Noch nichts zuzuschneiden.</div>`);
 if(!r.moeglich.length)
  return karte("Rollenblech und Verschnitt",
   `<div class="p-warnung">Keine der aktiven Rollen (${breiten.map(b=>mm(b)+" mm").join(" · ")})
ist breit genug für eine Abwicklung von ${mm(A)} mm. Der Bedarf wird deshalb
<b>nicht</b> gerechnet – er würde sonst auf einer geratenen Breite beruhen.</div>`);
 const b=r.bestes;
 const v=r.verteilung||{streifen:[]};
 const zeilen=r.moeglich.map(x=>`<tr${x===b?' class="p-beste"':""}>
<td>${mm(x.breite)} mm${x===b?" ★":""}</td>
<td class="p-num">${x.jeTafel}</td>
<td class="p-num">${mm(x.restBreite)} mm</td>
<td class="p-num">${x.tafeln}</td>
<td class="p-num">${x.ungenutzteStreifen}</td>
<td class="p-num">${x.flaeche.toFixed(2).replace(".",",")}</td>
<td class="p-num${x.anteil>25?" p-warnwert":""}">${x.verschnitt.toFixed(2).replace(".",",")} (${x.anteil.toFixed(1).replace(".",",")} %)</td></tr>`).join("");
 const streifenZeilen=(v.streifen||[]).map((st,i)=>`<tr>
<td>${i+1}</td>
<td>${st.stuecke.map(x=>`<b>Stück ${x.nr}</b> · ${mm(x.laenge)} mm`).join("<br>")||"–"}</td>
<td class="p-num">${st.stuecke.reduce((s2,x)=>s2+zahl(x.laenge),0).toLocaleString("de-CH")} mm</td>
<td class="p-num${st.rest>0?" p-rest":""}">${mm(st.rest)} mm</td></tr>`).join("");
 return karte("Rollenblech und Verschnitt",
`<div class="p-hinweis">Von der Rolle wird eine <b>Tafel</b> abgeschnitten und quer
in Streifen von ${mm(A)} mm geteilt. Die Tafel ist so lang wie das längste
Einlaufblechstück (<b>${mm(r.tafelLaenge)} mm</b>) – länger lässt sie sich nicht
mehr handhaben. In einem Streifen dürfen mehrere Stücke <b>hintereinander</b>
liegen, wie bei der Rinne aus einer Normlänge.</div>
<div class="p-zf-kopf">
<div><span>Empfehlung</span><b>${mm(b.breite)} mm</b></div>
<div><span>Tafel</span><b>${mm(b.breite)} × ${mm(r.tafelLaenge)} mm</b></div>
<div><span>Tafeln</span><b>${b.tafeln}</b></div>
<div><span>Streifen je Tafel</span><b>${b.jeTafel}</b></div>
<div><span>Streifen nötig</span><b>${b.streifen}</b></div>
<div><span>Blechfläche</span><b>${(r.netto||0).toFixed(2).replace(".",",")} m²</b></div>
<div><span>Verschnitt</span><b class="${b.anteil>25?"p-warnwert":""}">${b.verschnitt.toFixed(2).replace(".",",")} m² (${b.anteil.toFixed(1).replace(".",",")} %)</b></div>
</div>
<div class="p-tabelle">
<table><thead><tr><th>Rollenbreite</th><th>Streifen je Tafel</th><th>Rest Breite</th>
<th>Tafeln</th><th>Streifen frei</th><th>Fläche m²</th><th>Verschnitt m²</th></tr></thead>
<tbody>${zeilen}</tbody></table>
</div>
<h3>So liegen die Stücke in den Streifen</h3>
<div class="p-tabelle">
<table><thead><tr><th>Streifen</th><th>Bleche mit ihrer Länge</th><th>belegt</th><th>Rest</th></tr></thead>
<tbody>${streifenZeilen||'<tr><td colspan="4" class="p-leer">–</td></tr>'}</tbody></table>
</div>
<div class="p-klein-text">${v.optimal
 ?`Das ist die Verteilung mit den wenigsten Streifen.`
 :`Beste gefundene Verteilung. Bei dieser Stückzahl wurde nicht jede Möglichkeit
durchgerechnet – es kann eine geringfügig bessere geben.`}
${b.ungenutzteStreifen?` ${b.ungenutzteStreifen} Streifen der letzten Tafel
bleiben ganz übrig – sie zählen hier als Verschnitt, lassen sich aber als
Reststück weiterverwenden.`:""}</div>
<div class="p-klein-text">Ein Anschnitt am Rollenanfang und die Schnittfuge sind
nicht berücksichtigt – dafür fehlen die Werte des Betriebs.</div>`);
}
function schritt6(){
 const a=aufnahme, z=ausmassZeilen(a), mat=materialUebersicht(a);
 return karte("6 · Ausmass",`<div class="p-hinweis">Automatisch aus der Massaufnahme.
Nichts davon wird ein zweites Mal eingegeben – wird ein Mass geändert, ändert sich das Ausmass mit.</div>
<div class="p-tabelle">
<table><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td class="p-num">${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="p-quelle">${esc(x.herkunft)}</td></tr>`).join("")
 ||'<tr><td colspan="5" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>`)
+karte("Materialübersicht",`<div class="p-tabelle">
<table><thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Fläche m²</th><th>Material</th></tr></thead>
<tbody>${mat.map(m=>`<tr><td>${esc(m.bezeichnung)}</td><td class="p-num">${esc(m.menge)}</td><td>${esc(m.einheit)}</td><td class="p-num">${esc(m.flaeche)}</td><td>${esc(m.material)}</td></tr>`).join("")
 ||'<tr><td colspan="5" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>
<div class="p-hinweis">Artikelnummern und Preise stehen hier bewusst nicht.
Sie kommen später aus der importierten, firmeneigenen Materialliste.</div>`)
+rollenKarte(aufnahme)
+karte("Zuschnittliste",`<div class="p-hinweis">Jedes Blech mit seiner genauen
Zuschnittlänge. Die Spalte „Streifen" sagt, aus welchem Streifen der Tafel es
geschnitten wird.</div>
<div class="p-tabelle">
<table><thead><tr><th>Nr.</th><th>Zuschnittlänge (mm)</th><th>Streifen</th><th>Ger. L</th><th>Ger. R</th><th>Winkel</th></tr></thead>
<tbody>${(a.stuecke||[]).map((p,i)=>`<tr><td>${i+1}</td><td class="p-num"><b>${mm(p.laenge)}</b></td>
<td class="p-mitte">${streifenVon(a,i+1)??"–"}</td>
<td class="p-mitte">${p.gehrungLinks?"Ja":"–"}</td><td class="p-mitte">${p.gehrungRechts?"Ja":"–"}</td>
<td class="p-num">${zahl(p.winkel)}°</td></tr>`).join("")
 ||'<tr><td colspan="6" class="p-leer">Noch keine Stücke.</td></tr>'}</tbody></table>
</div>
<div class="p-zf-kopf">
<div><span>Bleche</span><b>${(a.stuecke||[]).length}</b></div>
<div><span>Summe der Zuschnitte</span><b>${mm(gesamtlaengeStuecke(a))} mm</b></div>
</div>`);
}

// ---- 9. Zeichnen und Blättern ---------------------------------------------
let listeOffen=false, einstellungenOffen=false;
function inhaltHtml(){
 return [schritt1,schritt2,schritt3,schritt4,schritt5,schritt6][schritt-1]();
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
 const sch=$("p-schnitt"); if(sch)sch.innerHTML=schnittHtml(a);
 const gr=$("p-grundriss"); if(gr)gr.innerHTML=grundrissHtml(a);
 // Die abgeleiteten Werte MÜSSEN hier mitlaufen: sie stehen ausserhalb der
 // Zeichnung und wuerden sonst bis zum naechsten vollen Zeichnen alt bleiben.
 const rb=restbreite(a);
 const rest=$("p-wRest");
 if(rest){rest.textContent=mm(rb)+" mm"; rest.classList.toggle("p-warnwert",rb<0)}
 const eng=$("p-wEng"); if(eng)eng.textContent=mm(massAEng(a))+" mm";
 const seite=$("p-wSeite"); if(seite)seite.textContent=engeSeite(a);
 const formel=$("p-wFormel"); if(formel)formel.innerHTML=formelText(a);
 const zf=$("p-zfStueck"); if(zf)zf.textContent=(a.stuecke||[]).length;
 const zl=$("p-zfLaenge");
 if(zl){const L=gesamtlaengeStuecke(a); zl.textContent=L>0?mm(L)+" mm":"–"}
 const zg=$("p-zfGava"); if(zg)zg.textContent=gavaText(a);
}

function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const L=(a.stuecke||[]).reduce((s,p)=>s+zahl(p.laenge),0);
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b><span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">Abwicklung ${mm(a.abwicklung)} mm · Mass A ${mm(a.massA)} mm · ${L>0?mm(L)+" mm":"–"}${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}

// Firmeneinstellungen des Einlaufblechs - dieselben Felder wie in der App
// (Einstellungen → Massaufnahmen → Einlaufblech gerade).
const EINST_FELDER=[
 {k:"stoss_laenge",  t:"Länge Stoss/Stoss (mm)"},
 {k:"ueberlappung",  t:"Überlappung (mm)"},
 {k:"gehrungszugabe",t:"Gehrungszugabe (mm)"},
 {k:"umschlag_oben", t:"Umschlag oben (mm)"},
 {k:"umschlag_unten",t:"Umschlag unten (mm)"},
 {k:"rest_schwelle", t:"Reststück-Schwelle (mm)"},
 {k:"end_zugabe",    t:"Endzugabe (mm)"},
 {k:"gava_abstand",  t:"Abstand Haltebleche (mm)"}
];
function einstellungenHtml(){
 const rollen=rollenbreiten.map(r=>`<label class="p-schalter p-rolle">
<input type="checkbox" data-rolle="${r.breite}"${r.aktiv?" checked":""}> ${mm(r.breite)} mm</label>`).join("");
 return `<div class="p-grid">${EINST_FELDER.map(f=>feld(f.t,
  `<input class="p-gross" type="number" inputmode="numeric" step="1" data-einst="${f.k}" value="${zahl(einlaufblechSettings[f.k])}">`)).join("")}</div>
<h3>Rollenbreiten für den Zuschnitt</h3>
<div class="p-rollen">${rollen}</div>
<div class="p-klein-text">1'000 mm und 670 mm sind die Standardrollen. Die übrigen
Breiten liegen bereit und lassen sich hier dazuschalten – auch für andere
Massaufnahmen brauchbar. Ist keine angehakt, wird der Materialbedarf nicht
gerechnet.</div>
<div class="p-knopfreihe"><button type="button" class="p-grau" id="p-einstZurueck">↻ Standardwerte</button></div>
<div class="p-klein-text">Wie in der App gerätebezogen gespeichert. Vorgaben:
${EINST_FELDER.map(f=>esc(f.t.replace(/ \(mm\)$/,""))+" "+EB_STANDARD[f.k]).join(" · ")} mm.</div>`;
}
function rollenSpeichern(){
 try{localStorage.setItem(ROLLEN_SCHLUESSEL,JSON.stringify(rollenbreiten))}catch(e){}
}
function einstellungenSpeichern(){
 try{localStorage.setItem(EB_EINSTELLUNGEN_SCHLUESSEL,JSON.stringify(einlaufblechSettings))}catch(e){}
}

// ---- 10. Bilder -----------------------------------------------------------
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

// ---- 11. Bedienung --------------------------------------------------------
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
  else if(t.id==="p-rinneText")return;          // reines Eingabefeld, nichts zu merken
  else if(t.id==="p-massA"){a.massA=zahl(t.value);nurLive=true}
  else if(t.id==="p-winkel"){a.winkel=t.value===""?"":zahl(t.value);nurLive=true}
  else if(t.id==="p-gesamtlaenge")a.gesamtlaenge=zahl(t.value);
  else if(d.laenge!==undefined){
   const i=Number(d.laenge); if(a.stuecke[i]){a.stuecke[i].laenge=zahl(t.value);nurLive=true}
  }
  else if(d.winkel!==undefined){
   const i=Number(d.winkel); if(a.stuecke[i]){a.stuecke[i].winkel=zahl(t.value);nurLive=true}
  }
  else if(d.stoss!==undefined){
   // Wie in der App: die Zuschnittlänge folgt der Länge Stoss/Stoss.
   const i=Number(d.stoss);
   if(a.stuecke[i]){
    a.stuecke[i].stossStoss=zahl(t.value);
    a.stuecke[i].laenge=a.stuecke[i].stossStoss+zahl(einlaufblechSettings.ueberlappung);
    const zeile=t.closest("tr");
    const feldL=zeile&&zeile.querySelector('[data-laenge="'+i+'"]');
    if(feldL)feldL.value=a.stuecke[i].laenge;
    nurLive=true;
   }
  }
  else if(t.id==="p-gavaAbstand"){a.gava.abstand_mm=zahl(t.value);nurLive=true}
  else if(t.id==="p-gavaAnzahl"){a.gava.anzahl=t.value===""?null:zahl(t.value);nurLive=true}
  else if(d.einst!==undefined){
   einlaufblechSettings[d.einst]=zahl(t.value);
   einstellungenSpeichern(); nurLive=true;
  }
  else return;
  if(nurLive)live();
 });

 w.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=aufnahme;
  if(t.id==="p-datum"){a.datum=t.value;return}
  if(t.id==="p-material"){a.material=t.value;zeichne();return}
  if(t.id==="p-abwicklung"){a.abwicklung=zahl(t.value);zeichne();return}
  if(t.id==="p-montage"){a.montage=t.value;zeichne();return}
  if(t.id==="p-fotoInput"){fotosAufnehmen(t.files);return}
  if(t.id==="p-gava"){
   a.gava.aktiv=t.checked;
   if(!t.checked)a.gava.anzahl=null;
   zeichne(); return;
  }
  if(d.rolle!==undefined){
   const r=rollenbreiten.find(x=>String(x.breite)===String(d.rolle));
   if(r)r.aktiv=t.checked;
   rollenSpeichern(); zeichne(); return;
  }
  if(d.gl!==undefined){gehrungSetzen(Number(d.gl),"links",t.checked);zeichne();return}
  if(d.gr!==undefined){gehrungSetzen(Number(d.gr),"rechts",t.checked);zeichne();return}
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
  if(t.id==="p-speichern"){
   if(speichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent="💾 Speichern"},1400)}
   return;
  }
  if(t.id==="p-neu"){
   if(confirm("Neue Massaufnahme beginnen? Nicht Gespeichertes geht verloren."))
    {aufnahme=leereAufnahme();schritt=1;zeichne()}
   return;
  }
  if(t.id==="p-listeAuf"){listeOffen=!listeOffen;zeichne();return}
  if(t.id==="p-einstAuf"){einstellungenOffen=!einstellungenOffen;zeichne();return}
  if(t.id==="p-einstZurueck"){
   einlaufblechSettings={...EB_STANDARD};
   rollenbreiten=ROLLEN_VORGABE.map(x=>({...x}));
   einstellungenSpeichern(); rollenSpeichern(); zeichne(); return;
  }
  if(t.id==="p-gavaUebernehmen"){
   const v=gavaVorschlag(a);
   if(v!==null)a.gava.anzahl=v;
   zeichne(); return;
  }
  if(d.oeffnen!==undefined){oeffnen(d.oeffnen);return}
  if(d.kopieren!==undefined){kopieren(d.kopieren);return}
  if(d.loeschen!==undefined){
   if(confirm("Diese gespeicherte Massaufnahme wirklich löschen?")){loeschen(d.loeschen);zeichne()}
   return;
  }
  if(t.id==="p-stueckeNeu"){
   const L=zahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
   if((a.stuecke||[]).length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
   a.stuecke=stueckeAusGesamtlaenge(L); zeichne(); return;
  }
  if(t.id==="p-stueckeAnhaengen"){
   const L=zahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
   a.stuecke=(a.stuecke||[]).concat(stueckeAusGesamtlaenge(L)); zeichne(); return;
  }
  // Rinne übernehmen - wie in der App erst nach ausdrücklicher Bestätigung,
  // wenn schon Stücke da sind.
  if(d.rinne!==undefined){
   const m=rinneAufnahmen()[Number(d.rinne)];
   if(!m)return;
   if((a.stuecke||[]).length&&!confirm(
     "Vorhandene Stücke werden durch die aus dieser Rinne erzeugten Stücke ersetzt. Fortfahren?"))return;
   const fehler=stueckeAusRinneUebernehmen(m);
   if(fehler){alert(fehler);return}
   zeichne();
   alert(a.stuecke.length+" Stück(e) aus "+rinneSegmenteAus(m).length+" Segment(en) übernommen.");
   return;
  }
  if(t.id==="p-rinneEinfuegen"){
   const box=$("p-rinneTextBox"); if(box)box.hidden=!box.hidden; return;
  }
  if(t.id==="p-rinneTextAbbrechen"){
   const box=$("p-rinneTextBox"); if(box)box.hidden=true; return;
  }
  if(t.id==="p-rinneTextUebernehmen"){
   const feld=$("p-rinneText");
   let roh=null;
   try{roh=JSON.parse((feld&&feld.value)||"")}
   catch(err){alert("Das ist kein lesbares JSON.");return}
   // Eine einzelne Massaufnahme oder eine Liste - beides annehmen.
   const m=Array.isArray(roh)?roh.find(x=>rinneSegmenteAus(x).length):roh;
   if(!m||!rinneSegmenteAus(m).length){
    alert("Darin sind keine Rinnensegmente mit einer Länge zu finden.");return;
   }
   if((a.stuecke||[]).length&&!confirm(
     "Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
   const fehler=stueckeAusRinneUebernehmen(m);
   if(fehler){alert(fehler);return}
   zeichne();
   alert(a.stuecke.length+" Stück(e) aus "+rinneSegmenteAus(m).length+" Segment(en) übernommen.");
   return;
  }
  if(t.id==="p-stueckPlus"){
   const stoss=zahl(einlaufblechSettings.stoss_laenge)||2000;
   a.stuecke.push({laenge:stoss+zahl(einlaufblechSettings.ueberlappung),
     stossStoss:stoss,gehrungLinks:false,gehrungRechts:false,winkel:0});
   zeichne(); return;
  }
  if(d.stueckWeg!==undefined){a.stuecke.splice(Number(d.stueckWeg),1);zeichne();return}
  if(t.id==="p-endStart"||t.id==="p-endEnde"){
   const fehler=endzugabeSchalten(t.id==="p-endStart"?"start":"ende");
   if(fehler)alert(fehler); else zeichne();
   return;
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

// ---- 12. Start ------------------------------------------------------------
if(typeof document!=="undefined"&&document.getElementById("p-app")){
 verdrahten();
 zeichne();
}
