"use strict";
// ===========================================================================
// PROTOTYP  ·  Massaufnahme "Einlaufblech konisch"
// ===========================================================================
// Baut auf dem bestehenden Modul der laufenden App auf. Gerechnet und
// gezeichnet wird mit den Funktionen aus uebernommen.js, die zeichengenau aus
// js/11, js/13 und js/14 stammen. Neu ist hier ausschliesslich die Bedienung:
// sieben Register statt eines langen Formulars, plus Kontrolle, Ausmass,
// Materialübersicht und Zuschnitt, die es im bestehenden Modul noch nicht gibt.
//
// Der Rechenkern des konischen Blechs steht in der App NICHT in js/13,
// sondern in js/14-freies-profil.js. Von dort übernommen und hier
// unverändert benutzt:
//
//   calcEbkPiece(p)              -> {massLinksEng, massRechtsEng}
//                                   = max(0, Mass − 2) je Seite
//   ebkRestbreite(mass,abw)      = Abwicklung − Mass − Umschlag oben
//                                   − Umschlag unten
//
// Nur eine Regel liest in der App direkt aus einem Formularfeld und lässt
// sich deshalb nicht als Funktion übernehmen; sie steht hier unverändert
// als Formel:
//
//   enge Seite = Montage "links" -> "rechts", sonst "links"   (ebkEngeSeite)
//
// Die 2 mm in calcEbkPiece sind in der App fest verdrahtet - siehe Bericht,
// offener Punkt.
// ===========================================================================

// ---- 1. Register ----------------------------------------------------------
const SCHRITTE=["Grunddaten","Geometrie","Stücke","Kontrolle","Ausmass","Zuschnitt","Fotos & Speichern"];
let schritt=1;

// ---- 2. Modell ------------------------------------------------------------
const SPEICHER="pebk_aufnahmen";
function leereAufnahme(){
 return {
  id:"ek"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  erstellt:new Date().toISOString(), geaendert:null,
  bezeichnung:"", datum:new Date().toISOString().slice(0,10), objekt:"",
  material:"", abwicklung:250, montage:"links",
  dachneigung:"", gesamtlaenge:"",
  stuecke:[],
  fotos:[], skizze:null, bemerkung:""
 };
}
let aufnahme=leereAufnahme();

const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const mm=v=>Math.round(zahl(v)).toLocaleString("de-CH");
const meter=v=>(zahl(v)/1000).toFixed(2).replace(".",",");

// ---- 3. Übernommene Rechenregeln (siehe Kopf) -----------------------------
function engeSeite(a){return a.montage==="links"?"rechts":"links"}
// Das Mass, das auf der engen Seite dieses Stücks gilt.
function massEngerSeite(a,p){
 return zahl(engeSeite(a)==="links"?p.massLinks:p.massRechts);
}
// Enges Mass und Restbreite kommen aus den übernommenen Funktionen.
function engesMass(a,p){
 const c=calcEbkPiece(p);
 return engeSeite(a)==="links"?c.massLinksEng:c.massRechtsEng;
}
function restbreite(a,p){
 return ebkRestbreite(massEngerSeite(a,p),a.abwicklung);
}
// Konizität eines Stücks: der Unterschied zwischen linkem und rechtem Mass.
// Kein neues Fachmass, nur die Differenz der beiden bereits erfassten Werte.
function konizitaet(p){return zahl(p.massRechts)-zahl(p.massLinks)}
function gesamtlaengeStuecke(a){return (a.stuecke||[]).reduce((s,p)=>s+zahl(p.laenge),0)}
function materialText(a){const m=findMeasurementMaterial(a.material);return m?m.name:"–"}

// Die Schnittzeichnung zeigt EIN Mass. Bei einem konischen Blech ist jedes
// Stück anders - die App bildet dafür den Mittelwert der Masse auf der engen
// Seite (renderEbkDiagram in js/14). Genau diese Regel, unverändert.
function repMass(a){
 const werte=(a.stuecke||[]).map(p=>massEngerSeite(a,p)).filter(v=>v>0);
 return werte.length?werte.reduce((x,y)=>x+y,0)/werte.length:null;
}
function repRestbreite(a){
 const r=repMass(a);
 return r===null?null:ebkRestbreite(r,a.abwicklung);
}

// ---- 3b. Zeichnungen ------------------------------------------------------
function schnittHtml(a){
 return einlaufblechDiagramSvg(a.dachneigung,repMass(a),repRestbreite(a),
   einlaufblechKonischSettings.umschlag_oben,einlaufblechKonischSettings.umschlag_unten);
}
// generateEbkGrundriss() haengt immer ansichtsPfeilSvg("links",…) an. Die
// Zeichenflaeche ist dort fest 368x368 (target 280 + 2x44 pad), der Pfeil ist
// also zeichengenau vorhersagbar - so laesst er sich entfernen, ohne js/13
// anzufassen und ohne im SVG herumzuraten.
const EBK_FLAECHE=368;
function grundrissHtml(a){
 const svg=generateEbkGrundriss((a&&a.stuecke)||[]);
 const pfeil=(typeof ansichtsPfeilSvg==="function")
   ?ansichtsPfeilSvg("links",EBK_FLAECHE,EBK_FLAECHE):"";
 return (pfeil&&svg.indexOf(pfeil)>=0)?svg.replace(pfeil,""):svg;
}
// Konus-Skizze: zeigt in der Draufsicht, WO Mass links und Mass rechts
// gemessen werden und wie das Blech dazwischen verläuft. Reine Darstellung
// der erfassten Werte - es wird nichts gerechnet.
function konusSvg(a,i){
 const p=(a.stuecke||[])[i];
 if(!p)return "";
 const L=zahl(p.laenge), ml=zahl(p.massLinks), mr=zahl(p.massRechts);
 if(L<=0||(ml<=0&&mr<=0))return '<div class="p-leer">Länge und Masse fehlen.</div>';
 const B=300, H=120, padX=46, padY=26;
 const maxM=Math.max(ml,mr,1);
 const hoehe=(m)=>Math.max(6,(H-2*padY)*(zahl(m)/maxM));
 const x1=padX, x2=B-padX;
 const yBasis=H-padY;
 const y1=yBasis-hoehe(ml), y2=yBasis-hoehe(mr);
 const eng=engeSeite(a);
 const farbeL=eng==="links"?"#b42318":"#1769aa";
 const farbeR=eng==="rechts"?"#b42318":"#1769aa";
 return `<svg viewBox="0 0 ${B} ${H}" style="width:100%;max-width:320px;display:block;margin:4px auto" xmlns="http://www.w3.org/2000/svg">
<polygon points="${x1},${yBasis} ${x2},${yBasis} ${x2},${y2.toFixed(1)} ${x1},${y1.toFixed(1)}" fill="#eef3f6" stroke="#17202a" stroke-width="2"/>
<line x1="${x1}" y1="${yBasis}" x2="${x1}" y2="${y1.toFixed(1)}" stroke="${farbeL}" stroke-width="3"/>
<line x1="${x2}" y1="${yBasis}" x2="${x2}" y2="${y2.toFixed(1)}" stroke="${farbeR}" stroke-width="3"/>
<text x="${x1-6}" y="${((yBasis+y1)/2).toFixed(1)}" font-size="11" fill="${farbeL}" font-family="Arial,Helvetica,sans-serif" text-anchor="end" font-weight="700">${mm(ml)}</text>
<text x="${x2+6}" y="${((yBasis+y2)/2).toFixed(1)}" font-size="11" fill="${farbeR}" font-family="Arial,Helvetica,sans-serif" font-weight="700">${mm(mr)}</text>
<text x="${x1}" y="${H-6}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif">links</text>
<text x="${x2}" y="${H-6}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif" text-anchor="end">rechts</text>
<text x="${(B/2).toFixed(0)}" y="${(yBasis+13).toFixed(0)}" font-size="10" fill="#68737d" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">Länge ${mm(L)} mm</text>
<text x="${(B/2).toFixed(0)}" y="14" font-size="10" fill="#b42318" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">rot = enge Seite (${esc(eng)})</text>
</svg>`;
}

// ---- 4. Stücke ------------------------------------------------------------
// Aufteilung unverändert über splitLengthIntoPieces() aus js/13 - dieselbe
// Funktion, die auch das bestehende Modul benutzt.
function stueckeAusGesamtlaenge(L){
 const stossLaenge=zahl(einlaufblechKonischSettings.stoss_laenge)||1;
 return splitLengthIntoPieces(L).map((len,i,alle)=>({
  laenge:len, stossStoss:i===alle.length-1?len:stossLaenge,
  gehrungLinks:false, gehrungRechts:false, winkel:0,
  massLinks:0, massRechts:0
 }));
}
function neuesStueck(){
 const stossStoss=zahl(einlaufblechKonischSettings.stoss_laenge)||2000;
 const prev=aufnahme.stuecke[aufnahme.stuecke.length-1];
 return {laenge:stossStoss+zahl(einlaufblechKonischSettings.ueberlappung),
         stossStoss, gehrungLinks:false, gehrungRechts:false, winkel:0,
         massLinks:prev?zahl(prev.massRechts):0, massRechts:0};
}
// Gehrung: dieselbe Regel wie in js/14 - Zugabe auf die Länge, Winkel 90.
// Anders als beim geraden Blech setzt das bestehende konische Modul das
// Nachbarstück NICHT automatisch mit; das bleibt hier genauso.
function gehrungSetzen(i,seite,an){
 const p=aufnahme.stuecke[i]; if(!p)return;
 const zugabe=zahl(einlaufblechKonischSettings.gehrungszugabe);
 const key=seite==="links"?"gehrungLinks":"gehrungRechts";
 const war=!!p[key];
 p[key]=!!an;
 if(an&&!war){p.laenge=zahl(p.laenge)+zugabe; p.winkel=90;}
 else if(!an&&war)p.laenge=Math.max(0,zahl(p.laenge)-zugabe);
 if(!p.gehrungLinks&&!p.gehrungRechts)p.winkel=0;
}
// Endzugabe: unverändert die Regel aus js/14 - immer auf das Reststück
// (letztes Stück), weil kein reguläres Stück länger sein darf als
// Länge Stoss/Stoss + Überlappung.
function endzugabeSchalten(position){
 const liste=aufnahme.stuecke;
 if(!liste.length)return "Bitte zuerst Stücke erfassen.";
 const zugabe=zahl(einlaufblechKonischSettings.end_zugabe);
 if(!zugabe)return "In den Einstellungen ist keine Endzugabe (> 0 mm) hinterlegt.";
 const p=liste[liste.length-1];
 const key=position==="start"?"endzugabeStart":"endzugabeEnd";
 if(p[key]){p.laenge=Math.max(0,zahl(p.laenge)-p[key]); p[key]=0;}
 else{p.laenge=zahl(p.laenge)+zugabe; p[key]=zugabe;}
 return null;
}
// Verkettung: das rechte Mass eines Stücks ist das linke des nächsten -
// genau wie im bestehenden Modul (js/14, ebkMr-Handler).
function massRechtsSetzen(i,wert){
 const p=aufnahme.stuecke[i]; if(!p)return;
 p.massRechts=zahl(wert);
 const n=aufnahme.stuecke[i+1];
 if(n)n.massLinks=p.massRechts;
}

// ---- 4b. Stücke aus einer Rinne-Massaufnahme übernehmen -------------------
// Genau wie in der laufenden App (js/14): die Segmente der Rinne werden mit
// baueEinlaufblechStueckeAusRinne() aus js/13 umgerechnet - mit den
// Einstellungen des konischen Blechs, splitLengthIntoPieces und mitMassen=true
// (das erzeugt massLinks/massRechts je Stück). Die Funktion ist unverändert
// übernommen; es gibt keine zweite Übernahmelogik.
//
// Woher die Rinnen kommen: in der App aus Supabase, im Prototyp aus dem
// Speicher des Rinnen-Prototyps auf demselben Gerät. Liegt dort nichts,
// lässt sich eine Massaufnahme auch als Text einfügen.
const RINNE_SPEICHER="sd_prototyp_rinne_halbrund";
function rinneAufnahmen(){
 try{
  const l=JSON.parse(localStorage.getItem(RINNE_SPEICHER)||"[]");
  return Array.isArray(l)?l:[];
 }catch(e){return []}
}
// Segmente lesen - aus dem Rinnen-Prototyp (a.segmente) ODER aus einer
// Massaufnahme der laufenden App (m.data.segments).
function rinneSegmenteAus(m){
 const roh=(m&&Array.isArray(m.segmente))?m.segmente
   :((m&&m.data&&Array.isArray(m.data.segments))?m.data.segments:[]);
 return roh.map(x=>({laenge:zahl(x&&x.laenge),winkel:zahl(x&&x.winkel)}))
   .filter(x=>x.laenge>0);
}
function rinneName(m){return String((m&&(m.bezeichnung||m.title))||"Ohne Bezeichnung")}
function rinneDatum(m){
 const d=new Date((m&&(m.geaendert||m.erstellt||m.date))||"");
 return isNaN(d)?"–":d.toLocaleDateString("de-CH");
}
function stueckeAusRinneUebernehmen(m){
 const segs=rinneSegmenteAus(m);
 if(!segs.length)return "Diese Rinnen-Massaufnahme hat keine Segmente mit einer Länge.";
 aufnahme.stuecke=baueEinlaufblechStueckeAusRinne(segs,einlaufblechKonischSettings,
   splitLengthIntoPieces,true);
 return null;
}

// ---- 5. Plausibilität -----------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen. Es
// werden KEINE fachlichen Grenzwerte erfunden.
function pruefungen(a){
 const m=[], s=einlaufblechKonischSettings;
 const uO=zahl(s.umschlag_oben), uU=zahl(s.umschlag_unten);
 if(a.dachneigung===""||a.dachneigung===null||a.dachneigung===undefined)
  m.push({art:"fehler",text:"Dachneigung / Winkel fehlt. Im bestehenden Modul ein Pflichtfeld."});
 else if(zahl(a.dachneigung)<=0||zahl(a.dachneigung)>=180)
  m.push({art:"fehler",text:"Winkel "+zahl(a.dachneigung)+"° lässt sich nicht zeichnen: die Schnittzeichnung rechnet mit 180° − Winkel, also nur zwischen 0° und 180°."});
 if(!(a.stuecke||[]).length)
  m.push({art:"fehler",text:"Noch kein Stück erfasst. Das bestehende Modul verlangt mindestens ein Stück mit einer Länge."});
 else{
  if(!a.stuecke.some(p=>zahl(p.laenge)>0))
   m.push({art:"fehler",text:"Kein Stück hat eine Länge grösser als 0 mm."});
  const grenze=zahl(s.stoss_laenge)+zahl(s.ueberlappung);
  a.stuecke.forEach((p,i)=>{
   const nr=i+1;
   if(zahl(p.laenge)<0)m.push({art:"fehler",text:"Stück "+nr+" hat eine negative Länge."});
   // Das bestehende Modul bricht das Speichern ab, wenn ein Mass fehlt.
   if(!zahl(p.massLinks))m.push({art:"fehler",text:"Stück "+nr+": Mass links fehlt (Pflichtfeld beim Speichern)."});
   else if(zahl(p.massLinks)<0)m.push({art:"fehler",text:"Stück "+nr+": Mass links ist negativ."});
   if(!zahl(p.massRechts))m.push({art:"fehler",text:"Stück "+nr+": Mass rechts fehlt (Pflichtfeld beim Speichern)."});
   else if(zahl(p.massRechts)<0)m.push({art:"fehler",text:"Stück "+nr+": Mass rechts ist negativ."});
   const rb=restbreite(a,p);
   if(zahl(massEngerSeite(a,p))>0&&rb<0)
    m.push({art:"fehler",text:"Stück "+nr+": Restbreite "+mm(rb)+" mm – das Mass auf der engen Seite und die Umschläge sind zusammen grösser als die Abwicklung ("+mm(a.abwicklung)+" mm)."});
   else if(zahl(massEngerSeite(a,p))>0&&rb===0)
    m.push({art:"warnung",text:"Stück "+nr+": Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig."});
   if(i<a.stuecke.length-1&&zahl(p.laenge)>grenze)
    m.push({art:"warnung",text:"Stück "+nr+" ist "+mm(p.laenge)+" mm lang. Ausser dem Reststück darf kein Stück länger sein als Länge Stoss/Stoss + Überlappung ("+mm(grenze)+" mm)."});
   // Widerspruch in der Verkettung: das rechte Mass eines Stücks ist das
   // linke des nächsten - so legt es das bestehende Modul an.
   const n=a.stuecke[i+1];
   if(n&&zahl(p.massRechts)>0&&zahl(n.massLinks)>0&&zahl(p.massRechts)!==zahl(n.massLinks))
    m.push({art:"warnung",text:"Stück "+nr+" rechts ("+mm(p.massRechts)+" mm) und Stück "+(nr+1)+" links ("+mm(n.massLinks)+" mm) sind verschieden – an derselben Stossstelle."});
  });
 }
 if(uO<=0||uU<=0)m.push({art:"warnung",text:"Umschlag oben oder unten ist 0 mm. Die Schnittzeichnung zeigt dafür nur einen Platzhalter."});
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt – die Materialübersicht bleibt dadurch unvollständig."});
 if(!String(a.bezeichnung||"").trim())
  m.push({art:"warnung",text:"Keine Bezeichnung – gespeicherte Aufnahmen sind dann schwer auseinanderzuhalten."});
 return m;
}

// ---- 6. Fläche, Ausmass und Material --------------------------------------
// Alles entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites
// Mal eingegeben, und es gibt keine Artikelnummern und keine Preise.
function flaecheM2(a){return gesamtlaengeStuecke(a)*zahl(a.abwicklung)/1e6}
function ausmassZeilen(a){
 const z=[], L=gesamtlaengeStuecke(a);
 let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(L>0)zeile("Einlaufblech konisch, Abwicklung "+mm(a.abwicklung)+" mm",meter(L),"m","Summe der Zuschnittlängen");
 if((a.stuecke||[]).length)zeile("Stücke (Zuschnitte)",a.stuecke.length,"Stk.","Stückliste");
 const gehrungen=(a.stuecke||[]).reduce((s,p)=>s+(p.gehrungLinks?1:0)+(p.gehrungRechts?1:0),0);
 if(gehrungen)zeile("Gehrungen",gehrungen,"Stk.","Stückliste");
 const stoss=Math.max(0,(a.stuecke||[]).length-1);
 if(stoss)zeile("Blechstösse",stoss,"Stk.","je Übergang zwischen zwei Stücken");
 if(L>0)zeile("Blechfläche",flaecheM2(a).toFixed(2).replace(".",","),"m²","Gesamtlänge × Abwicklung");
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 if(letzte&&zahl(letzte.endzugabeStart))zeile("Endzugabe erstes Stück",mm(letzte.endzugabeStart),"mm","Einstellung Endzugabe");
 if(letzte&&zahl(letzte.endzugabeEnd))zeile("Endzugabe letztes Stück",mm(letzte.endzugabeEnd),"mm","Einstellung Endzugabe");
 return z;
}
function materialUebersicht(a){
 const L=gesamtlaengeStuecke(a);
 if(L<=0)return [];
 return [{
  bezeichnung:"Einlaufblech konisch, Abwicklung "+mm(a.abwicklung)+" mm",
  menge:meter(L), einheit:"m", flaeche:flaecheM2(a).toFixed(2).replace(".",","),
  material:materialText(a)
 }];
}

// ---- 7. Zuschnitt aus Rollenblech -----------------------------------------
// Dieselbe Rechnung wie im Prototyp des geraden Blechs und wie seit v2.74 in
// der App. Sie gilt fachlich auch hier: der Zuschnitt ist ein Rechteck der
// Abwicklungsbreite mal Zuschnittlänge - die Konizität entsteht erst beim
// Anreissen INNERHALB dieses Rechtecks und ändert die benötigte Blechfläche
// nicht. Siehe Bericht.
//
//   Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)
//   Tafellänge        = längstes Stück
//   Tafeln            = aufgerundet(Streifen ÷ Streifen je Tafel)
//   Verschnitt        = Tafelfläche − Blechfläche
function packeInStreifen(bleche,L,budget){
 const stuecke=bleche.filter(x=>zahl(x.laenge)>0).slice()
  .sort((a,b)=>zahl(b.laenge)-zahl(a.laenge));
 if(!stuecke.length)return {streifen:[],optimal:true};
 if(zahl(stuecke[0].laenge)>L)
  return {streifen:null,optimal:true,zuLang:stuecke.filter(x=>zahl(x.laenge)>L)};
 const gierig=[];
 stuecke.forEach(x=>{
  const s=gierig.find(g=>g.rest>=zahl(x.laenge)-1e-9);
  if(s){s.stuecke.push(x);s.rest-=zahl(x.laenge)}
  else gierig.push({stuecke:[x],rest:L-zahl(x.laenge)});
 });
 const summe=stuecke.reduce((a,b)=>a+zahl(b.laenge),0);
 const untergrenze=Math.ceil(summe/L-1e-9);
 let schritte=0; const grenze=budget||200000;
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
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,tafelLaenge:L,verteilung,netto};
}

// ---- 8. Ablage ------------------------------------------------------------
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
 schritt=1; zeichne(); return true;
}
// Kopieren: eine eigenständige Aufnahme mit eigener Kennung. Änderungen an
// der Kopie dürfen das Original nicht berühren - deshalb eine tiefe Kopie.
function kopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 const k=JSON.parse(JSON.stringify(a));
 k.id="ek"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
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
function einstellungenSpeichern(){
 try{localStorage.setItem(EBK_EINSTELLUNGEN_SCHLUESSEL,JSON.stringify(einlaufblechKonischSettings))}catch(e){}
}
function rollenSpeichern(){
 try{localStorage.setItem(ROLLEN_SCHLUESSEL,JSON.stringify(rollenbreiten))}catch(e){}
}

// ---- 9. Oberfläche --------------------------------------------------------
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" p-voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}
function karte(titel,inhalt){return `<div class="p-karte"><h2>${esc(titel)}</h2>${inhalt}</div>`}

function registerHtml(){
 const p=pruefungen(aufnahme);
 const fehler=p.some(x=>x.art==="fehler"), warn=p.some(x=>x.art==="warnung");
 return `<div class="p-register" id="p-register">${SCHRITTE.map((t,i)=>{
  const n=i+1, punkt=n===4&&(fehler||warn)?`<span class="p-punkt ${fehler?"p-punkt-rot":"p-punkt-orange"}"></span>`:"";
  return `<button type="button" class="p-register-knopf${n===schritt?" aktiv":""}" data-schritt="${n}">
<span class="p-register-nr">${n}</span>${esc(t)}${punkt}</button>`;
 }).join("")}</div>`;
}

// 1 · Grunddaten
function schritt1(){
 const a=aufnahme;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const abwOpt=[200,250,330].map(w=>
  `<option value="${w}"${zahl(a.abwicklung)===w?" selected":""}>${w} mm</option>`).join("");
 const monOpt=[["links","von links"],["rechts","von rechts"]].map(([w,t])=>
  `<option value="${w}"${a.montage===w?" selected":""}>${esc(t)}</option>`).join("");
 return karte("1 · Grunddaten",`<div class="p-gitter">
${feld("Bezeichnung",`<input id="p-bezeichnung" type="text" value="${esc(a.bezeichnung)}" placeholder="z. B. Traufe Nordseite">`,true)}
${feld("Datum",`<input id="p-datum" type="date" value="${esc(a.datum)}">`)}
${feld("Objekt / Adresse",`<input id="p-objekt" type="text" value="${esc(a.objekt)}" placeholder="optional">`)}
${feld("Material",`<select id="p-material">${matOpt}</select>`)}
${feld("Abwicklung",`<select id="p-abwicklung">${abwOpt}</select>`)}
${feld("Montage",`<select id="p-montage">${monOpt}</select>`)}
${feld("Enge Seite",`<div class="p-wert" id="p-wSeite">${esc(engeSeite(a))}</div>`)}
</div>
<div class="p-hinweis">Die Bleche werden leicht konisch gebogen, damit sie ineinandergesteckt
werden können; die weite Seite wird angereift. <b>Mass links und rechts sind je Stück frei
wählbar</b> – daraus entsteht der konische Verlauf. Länge Stoss/Stoss, Überlappung, Umschläge,
Gehrungs- und Endzugabe stehen unter „⚙️ Einstellungen“ und sind unabhängig von denen des
geraden Blechs.</div>`);
}

// 2 · Geometrie
function schritt2(){
 const a=aufnahme;
 const r=repMass(a), rb=repRestbreite(a);
 return karte("2 · Geometrie",`<div class="p-gitter">
${feld("Dachneigung / Winkel (°)",`<input id="p-dachneigung" type="number" inputmode="decimal" step="0.1" value="${a.dachneigung===""?"":esc(a.dachneigung)}">`)}
${feld("Abwicklung",`<div class="p-wert">${esc(mm(a.abwicklung))} mm</div>`)}
${feld("Enge Seite",`<div class="p-wert" id="p-wSeite2">${esc(engeSeite(a))}</div>`)}
${feld("Mittleres Mass enge Seite",`<div class="p-wert" id="p-wRep">${r===null?"–":esc(mm(r))+" mm"}</div>`)}
${feld("Restbreite dazu",`<div class="p-wert${rb!==null&&rb<0?" p-warnwert":""}" id="p-wRest">${rb===null?"–":esc(mm(rb))+" mm"}</div>`)}
</div>
<div class="p-klein-text" id="p-wFormel">${formelText(a)}</div>
<div id="p-schnitt" class="p-zeichnung">${schnittHtml(a)}</div>
<div class="p-hinweis">Die Schnittzeichnung zeigt <b>ein</b> Mass. Weil bei einem konischen Blech
jedes Stück anders ist, nimmt sie – wie das bestehende Modul – den Mittelwert der Masse auf der
engen Seite. Die einzelnen Masse stehen in Register 3, dort auch je Stück eine eigene Skizze.</div>`);
}
function formelText(a){
 const s=einlaufblechKonischSettings;
 return `Enges Mass = Mass − 2 mm (je Seite). `
  +`Restbreite = Abwicklung ${esc(mm(a.abwicklung))} − Mass auf der engen Seite `
  +`− Umschlag oben ${esc(mm(s.umschlag_oben))} − Umschlag unten ${esc(mm(s.umschlag_unten))} mm. `
  +`Bei Montage „von ${esc(a.montage)}“ ist die enge Seite ${esc(engeSeite(a))}.`;
}

// 3 · Stücke
function schritt3(){
 const a=aufnahme;
 const L=gesamtlaengeStuecke(a);
 const eng=engeSeite(a);
 const letzte=(a.stuecke||[])[a.stuecke.length-1]||{};
 const zeilen=(a.stuecke||[]).map((p,i)=>{
  const rb=restbreite(a,p);
  const kon=konizitaet(p);
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>Stück ${i+1}</b>
<span class="p-klein-text">Zuschnitt ${esc(mm(p.laenge))} mm · eng ${esc(eng)} ${esc(mm(engesMass(a,p)))} mm${rb<0?" · ⚠️ Restbreite "+esc(mm(rb))+" mm":""}</span>
<button type="button" class="p-weg" data-stueck-weg="${i}" title="Stück löschen">✕</button></div>
<div class="p-gitter">
${feld("Länge Stoss/Stoss (mm)",`<input data-p-stoss="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.stossStoss||0)}">`)}
${feld("Zuschnittlänge (mm)",`<input data-p-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.laenge||0)}">`)}
${feld("Mass links (mm)",`<input data-p-ml="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.massLinks||0)}">`)}
${feld("Mass rechts (mm)",`<input data-p-mr="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.massRechts||0)}">`)}
${feld("Winkel (°)",`<div class="p-winkelzeile"><input data-p-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.winkel||0)}"><button type="button" class="p-grau" data-p-flip="${i}" title="Winkel umkehren">🔄</button></div>`)}
${feld("Konizität (rechts − links)",`<div class="p-wert">${kon>0?"+":""}${esc(mm(kon))} mm</div>`)}
</div>
<div class="p-knopfreihe">
<label class="p-schalter"><input type="checkbox" data-p-gl="${i}"${p.gehrungLinks?" checked":""}> Gehrung links</label>
<label class="p-schalter"><input type="checkbox" data-p-gr="${i}"${p.gehrungRechts?" checked":""}> Gehrung rechts</label>
${zahl(p.endzugabeStart)?`<span class="p-klein-text">Endzugabe Anfang ${esc(mm(p.endzugabeStart))} mm</span>`:""}
${zahl(p.endzugabeEnd)?`<span class="p-klein-text">Endzugabe Ende ${esc(mm(p.endzugabeEnd))} mm</span>`:""}
</div>
<div class="p-konus">${konusSvg(a,i)}</div>
</div>`;
 }).join("");
 return karte("3 · Stücke und Aufteilung",`<div class="p-gitter">
${feld("Gesamtlänge (mm)",`<input id="p-gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaenge===""?"":esc(a.gesamtlaenge)}" placeholder="für die Aufteilung">`)}
${feld("Aus den Stücken",`<div class="p-wert" id="p-wLaenge">${L>0?esc(mm(L))+" mm":"–"}</div>`)}
</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-stueckeNeu">🔄 Stücke aus Gesamtlänge berechnen</button>
<button type="button" class="p-grau" id="p-stueckeAnhaengen">➕ Weitere Länge anfügen</button>
<button type="button" class="p-grau" id="p-stueckPlus">＋ Stück hinzufügen</button>
</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-endStart">Endzugabe erstes Stück: ${letzte.endzugabeStart?"ein":"aus"}</button>
<button type="button" class="p-grau" id="p-endEnde">Endzugabe letztes Stück: ${letzte.endzugabeEnd?"ein":"aus"}</button>
</div>
<div class="p-hinweis">Das rechte Mass eines Stücks wird beim Eintippen automatisch zum linken
Mass des nächsten – an der Stossstelle ist es dasselbe Blech. Danach lässt sich jeder Wert
einzeln überschreiben.</div>
${zeilen||'<div class="p-leer">Noch kein Stück. „Stücke aus Gesamtlänge berechnen“, „＋ Stück hinzufügen“ oder aus einer Rinne übernehmen.</div>'}
${rinneUebernahmeHtml()}
<h2 style="margin-top:14px">Grundriss</h2>
<div class="p-klein-text">Winkel = Richtungsänderung nach diesem Stück (0 = keine Ecke).</div>
<div id="p-grundriss" class="p-zeichnung">${grundrissHtml(a)}</div>`);
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
 return `<h2 style="margin-top:14px">↩️ Aus einer Rinne-Massaufnahme übernehmen</h2>
<div class="p-hinweis">Aus den Rinnensegmenten werden Einlaufblech-Stücke gerechnet – mit der
Funktion der laufenden App. Eine Ecke im Rinnenverlauf wird zur Gehrung, zu lange Segmente
werden aufgeteilt. <b>Mass links und rechts müssen danach je Stück eingetragen werden</b>,
genau wie im bestehenden Modul.</div>
${liste.length?zeilen
 :`<div class="p-leer">Auf diesem Gerät ist keine Rinne-Halbrund-Massaufnahme gespeichert.
In der laufenden App stehen hier die Massaufnahmen des Projekts.</div>`}
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
<code>segmente</code> (Rinnen-Prototyp) oder als <code>data.segments</code> (laufende App).
Nur Länge und Winkel je Segment werden gelesen.</div>
</div>`;
}

// 4 · Kontrolle
function schritt4(){
 const m=pruefungen(aufnahme);
 if(!m.length)return karte("4 · Kontrolle",
  `<div class="p-ok">Keine Auffälligkeit. Alles, was das bestehende Modul zum Speichern verlangt, liegt vor.</div>`);
 return karte("4 · Kontrolle",m.map(x=>
  `<div class="p-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join(""));
}

// 5 · Ausmass
function schritt5(){
 const a=aufnahme;
 const z=ausmassZeilen(a), mat=materialUebersicht(a);
 if(!z.length)return karte("5 · Ausmass und Material",
  `<div class="p-leer">Noch nichts zu messen – bitte zuerst Stücke erfassen.</div>`);
 return karte("5 · Ausmass und Material",`<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="p-klein-text">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<h2 style="margin-top:14px">Material</h2>
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Fläche</th><th>Material</th></tr></thead>
<tbody>${mat.map(x=>`<tr><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td>${esc(x.flaeche)} m²</td><td>${esc(x.material)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="p-hinweis">Ausmass und Material entstehen allein aus dieser Aufnahme – keine zweite
Eingabe. Ohne Artikelnummern und ohne Preise: die kommen später aus der firmeneigenen
Materialliste.</div>`);
}

// 6 · Zuschnitt
function schritt6(){
 const a=aufnahme;
 const plan=rollenPlan(a);
 const v=plan.verteilung||{};
 if(!plan.moeglich.length){
  const grund=!gesamtlaengeStuecke(a)?"Noch nichts zuzuschneiden – bitte zuerst Stücke erfassen."
   :(!aktiveRollenbreiten().length?"Es ist keine Rollenbreite aktiv (siehe ⚙️ Einstellungen)."
   :"Keine aktive Rollenbreite ist so breit wie die Abwicklung ("+esc(mm(a.abwicklung))+" mm).");
  return karte("6 · Zuschnitt aus Rollenblech",`<div class="p-leer">${grund}</div>`);
 }
 const zuLang=(v.zuLang||[]);
 const streifenTab=(v.streifen||[]).map((s,i)=>`<tr><td>${i+1}</td>
<td>${s.stuecke.map(x=>"Stück "+x.nr+" · "+mm(x.laenge)+" mm").join("<br>")}</td>
<td>${esc(mm(plan.tafelLaenge-s.rest))} mm</td><td>${esc(mm(s.rest))} mm</td></tr>`).join("");
 return karte("6 · Zuschnitt aus Rollenblech",
`<div class="p-hinweis">Von der Rolle wird eine <b>Tafel</b> abgeschnitten und quer in Streifen der
Abwicklungsbreite geteilt. Die Tafel ist so lang wie das längste Stück
(<b>${esc(mm(plan.tafelLaenge))} mm</b>); in einem Streifen dürfen mehrere Stücke hintereinander
liegen. Die Konizität entsteht erst beim Anreissen innerhalb des Streifens und ändert die
benötigte Blechfläche nicht.</div>
${zuLang.length?`<div class="p-fehler">Zu lang für eine Tafel: ${esc(zuLang.map(x=>"Stück "+x.nr).join(", "))}.</div>`:""}
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Rollenbreite</th><th>Streifen je Tafel</th><th>Tafeln</th><th>Tafelfläche</th><th>Verschnitt</th><th>Anteil</th></tr></thead>
<tbody>${plan.moeglich.map((x,i)=>`<tr${i===0?' class="p-beste"':""}>
<td>${esc(x.breite)} mm${i===0?" <b>(beste)</b>":""}</td><td>${esc(x.jeTafel)}</td><td>${esc(x.tafeln)}</td>
<td>${esc(x.flaeche.toFixed(2).replace(".",","))} m²</td>
<td>${esc(x.verschnitt.toFixed(2).replace(".",","))} m²</td>
<td>${esc(x.anteil.toFixed(0))} %</td></tr>`).join("")}</tbody>
</table></div>
${plan.zuSchmal.length?`<div class="p-klein-text">Zu schmal für die Abwicklung: ${esc(plan.zuSchmal.join(", "))} mm.</div>`:""}
<h2 style="margin-top:14px">So liegen die Stücke in den Streifen</h2>
${v.optimal===false?`<div class="p-warnung">Beste gefundene Verteilung – die Suche wurde abgebrochen, sie ist nicht nachweislich die günstigste.</div>`:""}
<div class="p-tabelle-scroll">
<table class="p-tabelle"><thead><tr><th>Streifen</th><th>Stücke mit ihrer Länge</th><th>belegt</th><th>Rest</th></tr></thead>
<tbody>${streifenTab||'<tr><td colspan="4">–</td></tr>'}</tbody>
</table></div>
<div class="p-klein-text">Blechfläche netto <b>${esc(flaecheM2(a).toFixed(2).replace(".",","))} m²</b>.</div>`);
}

// 7 · Fotos & Skizze / Speichern
// Gleiche Bedienung wie im Prototyp des geraden Blechs: Foto aufnehmen oder
// waehlen, freie Skizze zeichnen, Bemerkung, speichern.
function schritt7(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto">
<img src="${esc(f)}" alt="Foto ${i+1}"><button type="button" class="p-weg" data-foto-weg="${i}">✕</button></div>`).join("");
 return karte("7 · Fotos",`<label class="p-datei">📷 Foto aufnehmen oder wählen
<input type="file" id="p-fotoInput" accept="image/*" capture="environment" multiple hidden></label>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
<div class="p-klein-text">Fotos werden verkleinert im Browser abgelegt. Beim späteren Einbau
in die App gehen sie wie gehabt in den privaten Speicher von Supabase, zugeordnet zu Projekt
und Massaufnahme.</div>`)
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

// ---- 10. Liste und Einstellungen ------------------------------------------
let listeOffen=false, einstellungenOffen=false;
function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const L=(a.stuecke||[]).reduce((s,p)=>s+zahl(p.laenge),0);
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b><span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">Abwicklung ${mm(a.abwicklung)} mm · ${(a.stuecke||[]).length} Stück · ${L>0?mm(L)+" mm":"–"}${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}
// Firmeneinstellungen des konischen Blechs - dieselben Felder wie in der App
// (Einstellungen → Massaufnahmen → Einlaufblech konisch).
const EINST_FELDER=[
 {k:"stoss_laenge",  t:"Länge Stoss/Stoss (mm)"},
 {k:"ueberlappung",  t:"Überlappung (mm)"},
 {k:"gehrungszugabe",t:"Gehrungszugabe (mm)"},
 {k:"umschlag_oben", t:"Umschlag oben (mm)"},
 {k:"umschlag_unten",t:"Umschlag unten (mm)"},
 {k:"rest_schwelle", t:"Restschwelle (mm)"},
 {k:"end_zugabe",    t:"Endzugabe (mm)"}
];
function einstellungenHtml(){
 return `<h2>⚙️ Einstellungen</h2>
<div class="p-gitter">${EINST_FELDER.map(f=>
 feld(f.t,`<input data-einst="${f.k}" type="number" inputmode="numeric" step="1" value="${esc(einlaufblechKonischSettings[f.k])}">`)).join("")}</div>
<h2 style="margin-top:14px">Rollenbreiten</h2>
<div class="p-klein-text">Aus welchen Rollen zugeschnitten wird. 1000 und 670 mm sind die
Standardrollen.</div>
<div class="p-knopfreihe">${rollenbreiten.map((r,i)=>
 `<label class="p-schalter"><input type="checkbox" data-rolle="${i}"${r.aktiv?" checked":""}> ${r.breite} mm</label>`).join("")}</div>
<div class="p-knopfreihe"><button type="button" class="p-grau" id="p-einstZurueck">↩️ Standardwerte</button></div>`;
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
 const r=repMass(a), rb=repRestbreite(a);
 const wr=$("p-wRep"); if(wr)wr.textContent=r===null?"–":mm(r)+" mm";
 const rest=$("p-wRest");
 if(rest){rest.textContent=rb===null?"–":mm(rb)+" mm"; rest.classList.toggle("p-warnwert",rb!==null&&rb<0)}
 const seite=$("p-wSeite"); if(seite)seite.textContent=engeSeite(a);
 const seite2=$("p-wSeite2"); if(seite2)seite2.textContent=engeSeite(a);
 const formel=$("p-wFormel"); if(formel)formel.innerHTML=formelText(a);
 const L=$("p-wLaenge");
 if(L){const g=gesamtlaengeStuecke(a); L.textContent=g>0?mm(g)+" mm":"–"}
 // Die Konus-Skizzen und die Kopfzeilen der Stücke hängen an den Massen und
 // müssen mitlaufen, ohne die Eingabefelder zu ersetzen.
 (a.stuecke||[]).forEach((p,i)=>{
  const zeile=document.querySelector('[data-p-ml="'+i+'"]');
  const block=zeile&&zeile.closest(".p-zeile");
  if(!block)return;
  const konus=block.querySelector(".p-konus");
  if(konus)konus.innerHTML=konusSvg(a,i);
  const kopf=block.querySelector(".p-zeile-kopf .p-klein-text");
  const rbp=restbreite(a,p);
  if(kopf)kopf.textContent="Zuschnitt "+mm(p.laenge)+" mm · eng "+engeSeite(a)+" "
   +mm(engesMass(a,p))+" mm"+(rbp<0?" · ⚠️ Restbreite "+mm(rbp)+" mm":"");
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
 // Auf einem Foto zeichnen: das zuletzt aufgenommene Foto als Grund.
 if(aufnahme.skizze||((aufnahme.fotos||[]).length&&skizzeGrundFoto)){
  const alt=new Image();
  alt.onload=()=>skizzeCtx.drawImage(alt,0,0,c.width,c.height);
  alt.src=aufnahme.skizze||aufnahme.fotos[aufnahme.fotos.length-1];
 }
}
let skizzeGrundFoto=false;
function skizzePunkt(ev,c){
 const b=c.getBoundingClientRect();
 const t=(ev.touches&&ev.touches[0])||ev;
 return [(t.clientX-b.left)*(c.width/b.width),(t.clientY-b.top)*(c.height/b.height)];
}

// ---- 13. Bedienung --------------------------------------------------------
// Eine einzige Stelle je Ereignisart, delegiert von der Wurzel.
// Tippen (input) ändert nur das Modell und die abgeleiteten Anzeigen,
// Auswählen (change) und Klicken zeichnen neu.
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
  else if(t.id==="p-rinneText")return;          // reines Eingabefeld
  else if(t.id==="p-dachneigung"){a.dachneigung=t.value===""?"":zahl(t.value);nurLive=true}
  else if(t.id==="p-gesamt")a.gesamtlaenge=t.value===""?"":zahl(t.value);
  else if(d.pLaenge!==undefined){
   const i=Number(d.pLaenge); if(a.stuecke[i]){a.stuecke[i].laenge=zahl(t.value);nurLive=true}
  }
  else if(d.pWinkel!==undefined){
   const i=Number(d.pWinkel); if(a.stuecke[i]){a.stuecke[i].winkel=zahl(t.value);nurLive=true}
  }
  else if(d.pStoss!==undefined){
   // Wie in der App: die Zuschnittlänge folgt der Länge Stoss/Stoss.
   const i=Number(d.pStoss);
   if(a.stuecke[i]){
    a.stuecke[i].stossStoss=zahl(t.value);
    a.stuecke[i].laenge=a.stuecke[i].stossStoss+zahl(einlaufblechKonischSettings.ueberlappung);
    const block=t.closest(".p-zeile");
    const feldL=block&&block.querySelector('[data-p-laenge="'+i+'"]');
    if(feldL)feldL.value=a.stuecke[i].laenge;
    nurLive=true;
   }
  }
  else if(d.pMl!==undefined){
   const i=Number(d.pMl); if(a.stuecke[i]){a.stuecke[i].massLinks=zahl(t.value);nurLive=true}
  }
  else if(d.pMr!==undefined){
   // Verkettung wie im bestehenden Modul: rechts wird links des nächsten.
   const i=Number(d.pMr);
   if(a.stuecke[i]){
    massRechtsSetzen(i,t.value);
    const feldN=document.querySelector('[data-p-ml="'+(i+1)+'"]');
    if(feldN&&a.stuecke[i+1])feldN.value=a.stuecke[i+1].massLinks;
    nurLive=true;
   }
  }
  else if(d.einst!==undefined){
   einlaufblechKonischSettings[d.einst]=zahl(t.value);
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
  if(d.pGl!==undefined){gehrungSetzen(Number(d.pGl),"links",t.checked);zeichne();return}
  if(d.pGr!==undefined){gehrungSetzen(Number(d.pGr),"rechts",t.checked);zeichne();return}
  if(d.rolle!==undefined){
   const r=rollenbreiten[Number(d.rolle)];
   if(r){r.aktiv=t.checked; rollenSpeichern(); zeichne()}
   return;
  }
 });

 w.addEventListener("click",e=>{
  const t=e.target.closest("button,label,[data-schritt],[data-oeffnen],[data-kopieren],[data-loeschen]");
  if(!t)return;
  const d=t.dataset||{}, a=aufnahme;
  if(d.schritt!==undefined){setzeSchritt(d.schritt);return}
  if(t.id==="p-zurueck"){if(schritt>1)setzeSchritt(schritt-1);return}
  if(t.id==="p-weiter"){
   if(schritt<SCHRITTE.length){setzeSchritt(schritt+1);return}
   // Letztes Register: der Knopf speichert.
   if(speichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent="Fertig › Speichern"},1400)}
   return;
  }
  if(t.id==="p-speichern"||t.id==="p-speichern2"){
   if(speichern()){const alt=t.textContent;t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent=alt},1400)}
   return;
  }
  if(t.id==="p-neu"){
   if(confirm("Neue Massaufnahme beginnen? Nicht Gespeichertes geht verloren."))
    {aufnahme=leereAufnahme();schritt=1;zeichne()}
   return;
  }
  // Kopieren wie bei der Rinne: die gerade offene Aufnahme wird zu einer
  // eigenständigen Kopie, die danach offen ist.
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
   einlaufblechKonischSettings={...EBK_STANDARD};
   rollenbreiten=ROLLEN_VORGABE.map(x=>({...x}));
   einstellungenSpeichern(); rollenSpeichern(); zeichne(); return;
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
  if(t.id==="p-stueckPlus"){a.stuecke.push(neuesStueck()); zeichne(); return}
  if(t.id==="p-endStart"||t.id==="p-endEnde"){
   const fehler=endzugabeSchalten(t.id==="p-endStart"?"start":"ende");
   if(fehler)alert(fehler); else zeichne();
   return;
  }
  if(d.stueckWeg!==undefined){a.stuecke.splice(Number(d.stueckWeg),1); zeichne(); return}
  if(d.pFlip!==undefined){
   const p=a.stuecke[Number(d.pFlip)];
   if(p)p.winkel=-zahl(p.winkel);
   zeichne(); return;
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
   alert(a.stuecke.length+" Stück(e) aus "+rinneSegmenteAus(m).length
     +" Segment(en) übernommen. Bitte jetzt pro Stück Mass links/rechts eintragen.");
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
   try{roh=JSON.parse((feld&&feld.value)||"")}catch(err){
    alert("Der eingefügte Text ist kein lesbares JSON.");return;
   }
   const m=Array.isArray(roh)?roh.find(x=>rinneSegmenteAus(x).length):roh;
   if(!m||!rinneSegmenteAus(m).length){
    alert("Im eingefügten Text steht keine Rinne mit Segmenten.");return;
   }
   if((a.stuecke||[]).length&&!confirm(
     "Vorhandene Stücke werden durch die aus dieser Rinne erzeugten Stücke ersetzt. Fortfahren?"))return;
   const fehler=stueckeAusRinneUebernehmen(m);
   if(fehler){alert(fehler);return}
   const box=$("p-rinneTextBox"); if(box)box.hidden=true;
   zeichne();
   alert(a.stuecke.length+" Stück(e) aus "+rinneSegmenteAus(m).length+" Segment(en) übernommen.");
   return;
  }
  if(d.fotoWeg!==undefined){a.fotos.splice(Number(d.fotoWeg),1); zeichne(); return}
  if(t.id==="p-skizzeWeg"){a.skizze=null; zeichne(); return}
  if(t.id==="p-skizzeOeffnen"){skizzeGrundFoto=false; skizzeOeffnen(); return}
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
