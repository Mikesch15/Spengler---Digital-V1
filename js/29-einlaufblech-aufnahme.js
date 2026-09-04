"use strict";
// ===========================================================================
// EINLAUFBLECH GERADE · Aufnahme (Geometrie, Stücke, Ausmass, Rollenblech)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung:
// js/11-einlaufblech-gerade.js (Schnittzeichnung) und
// js/15-einlaufblech-stueckliste.js (enge Seite, Restbreite, Aufteilung,
// Gehrung, Endzugabe, Rinnen-Übernahme) bleiben UNVERÄNDERT und rechnen
// weiterhin alles Fachliche. Diese Datei ist die Erfassung darüber.
//
// Die Brücke sind die eigenen Variablen und Felder des bestehenden Moduls:
// ebaBruecke() setzt ebPieces und die alten Formularfelder aus dem erfassten
// Stand. Danach liefern ebEngeSeite() und ebRestbreite() aus js/15 direkt die
// richtigen Werte - sie werden hier NICHT nachgebaut. Die alten, unsichtbaren
// Formularelemente in #ebStummel bleiben stehen, damit js/15 unverändert
// laden kann.
//
// Neu gegenüber dem bestehenden Modul (aus dem Prototyp übernommen):
//   - Haltebleche "GAVA Blech"  (Anzahl = Länge ÷ Abstand + 1, wie der
//     Rinnenhalter-Abstand in js/28)
//   - Blechfläche in m²          (Gesamtlänge × Abwicklung)
//   - Zuschnitt aus Rollenblech  (Tafel, quer in Streifen geteilt)
//   - Ausmass und Materialübersicht ohne zweite Eingabe
// ===========================================================================

// Die Register heissen und stehen in ALLEN Massaufnahme-Arten gleich:
// die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und zuletzt die
// Kontrolle.
const EBA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Geometrie"},{nr:3,kurz:"Stücke"},
 {nr:4,kurz:"Zuschnitt"},{nr:5,kurz:"Ausmass"},{nr:6,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt deshalb an
// der Registerzahl, nicht an einer festen Nummer.
const EBA_KONTROLLE=EBA_REGISTER.length;
let ebaSchritt=1;

// Rollenbreiten: 1000 und 670 sind die Standardrollen. Die übrigen lassen
// sich in den Einstellungen dazunehmen - sie stehen firmenweit in
// app_settings.blech_rollenbreiten und sind auch für andere Massaufnahmen
// gedacht.
const EBA_ROLLEN_STANDARD=Object.freeze([1000,670]);
const EBA_ROLLEN_WAEHLBAR=Object.freeze([1000,670,500,400,330,250,200]);
function ebaRollenbreiten(){
 const eigen=Array.isArray(blechRollenbreiten)?blechRollenbreiten:null;
 const liste=(eigen&&eigen.length)?eigen:EBA_ROLLEN_STANDARD;
 return liste.map(Number).filter(x=>Number.isFinite(x)&&x>0)
   .sort((a,b)=>b-a);
}

const ebaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const ebaMm=v=>Math.round(ebaZahl(v)).toLocaleString("de-CH");
const ebaMeter=v=>(ebaZahl(v)/1000).toFixed(2).replace(".",",");

function ebaLeer(){
 return {
  material:"", abwicklung:250, montage:"links",
  massA:"", winkel:"", gesamtlaenge:"",
  stuecke:[],
  gava:{aktiv:false,abstand_mm:ebaGavaVorgabe(),anzahl:null}
 };
}
// Der GAVA-Abstand ist ein Zuschnitt-/Montagemass wie Umschlag oder
// Endzugabe und liegt deshalb bei den übrigen Einlaufblech-Einstellungen.
function ebaGavaVorgabe(){
 const v=Number(einlaufblechSettings&&einlaufblechSettings.gava_abstand);
 return Number.isFinite(v)&&v>0?v:500;
}
let ebA=ebaLeer();

// ---- Brücke zum bestehenden Modul -----------------------------------------
// ebPieces ist danach dasselbe Array wie ebA.stuecke: es gibt nur eine
// Wahrheit, und der Speicher-Code in js/16 liefert weiterhin genau dieselben
// Felder wie bisher.
function ebaBruecke(){
 const a=ebA;
 // Eine Wahrheit: ebPieces IST das Stueck-Array des Modells. Wer es von
 // aussen ersetzt (js/15 bei der Rinnen-Uebernahme), holt es dort ab, wo es
 // passiert - siehe den Klick-Handler weiter unten.
 ebPieces=a.stuecke;
 const setz=(id,wert)=>{const f=$(id); if(f)f.value=String(wert)};
 setz("eb_massA",a.massA===""?"":a.massA);
 setz("eb_winkel",a.winkel===""?"":a.winkel);
 setz("eb_abwicklung",a.abwicklung||250);
 setz("eb_montage",a.montage||"links");
 setz("eb_material",a.material||"");
 setz("eb_gesamtlaenge",a.gesamtlaenge===""?"":a.gesamtlaenge);
}
// Ab hier gelten die Regeln des bestehenden Moduls, unverändert aufgerufen.
function ebaEngeSeite(){ebaBruecke();return ebEngeSeite()}
function ebaRestbreite(){ebaBruecke();return ebRestbreite()}
// Das enge Mass ist in js/15 und js/16 als max(0, Mass A − 2) fest
// verdrahtet - hier derselbe Ausdruck, keine zweite Regel.
function ebaMassAEng(){return Math.max(0,ebaZahl(ebA.massA)-2)}
function ebaGesamtlaenge(){return (ebA.stuecke||[]).reduce((s,p)=>s+ebaZahl(p.laenge),0)}

// ---- Haltebleche (GAVA Blech) ---------------------------------------------
// Dieselbe Rechnung wie der Rinnenhalter-Abstand in js/28:
//     Anzahl = ganzzahlig(Länge ÷ Abstand) + 1
// Sie greift nur, wenn "GAVA Blech" angekreuzt ist.
function ebaGavaVorschlag(){
 const L=ebaGesamtlaenge(), ab=ebaZahl(ebA.gava&&ebA.gava.abstand_mm);
 if(L<=0||ab<=0)return null;
 return Math.floor(L/ab)+1;
}
function ebaGavaAnzahl(){
 const g=ebA.gava;
 if(!g||!g.aktiv)return null;
 if(g.anzahl!==null&&g.anzahl!==undefined&&g.anzahl!=="")return Math.round(ebaZahl(g.anzahl));
 return ebaGavaVorschlag();
}

// ---- Fläche und Rollenblech ------------------------------------------------
// Blechfläche = Gesamtlänge × Abwicklung. Beides ist erfasst, nichts wird
// geschätzt.
function ebaFlaecheM2(){return ebaGesamtlaenge()*ebaZahl(ebA.abwicklung)/1e6}

// Zuschnitt aus Rollenblech. So wird tatsächlich gearbeitet: von der Rolle
// wird eine TAFEL abgeschnitten und quer in Streifen von der Breite der
// Abwicklung geteilt. Die Tafel ist höchstens so lang wie das längste
// Einlaufblechstück. Ein Streifen kann mehrere Stücke HINTEREINANDER
// aufnehmen - dasselbe Problem wie die Normlängen bei der Rinne.
//
//   Streifen je Tafel = ganzzahlig(Rollenbreite ÷ Abwicklung)
//   Tafellänge        = längstes Stück
//   Tafeln            = aufgerundet(Streifen ÷ Streifen je Tafel)
//
// Zuerst eine gierige Lösung, danach der Versuch, mit weniger Streifen
// auszukommen. Reicht das Suchbudget nicht, wird die gierige Lösung
// zurückgegeben und ausdrücklich NICHT als beste ausgewiesen.
function ebaPackeInStreifen(bleche,L,budget){
 // bleche: [{nr, laenge}] - die Nummer reist mit, damit in der Liste jedes
 // Blech mit SEINER genauen Länge steht und nicht nur eine nackte Zahl.
 const stuecke=bleche.filter(x=>ebaZahl(x.laenge)>0).slice()
  .sort((a,b)=>ebaZahl(b.laenge)-ebaZahl(a.laenge));
 if(!stuecke.length)return {streifen:[],optimal:true};
 if(ebaZahl(stuecke[0].laenge)>L)
  return {streifen:null,optimal:true,zuLang:stuecke.filter(x=>ebaZahl(x.laenge)>L)};
 const gierig=[];
 stuecke.forEach(x=>{
  const s=gierig.find(g=>g.rest>=ebaZahl(x.laenge)-1e-9);
  if(s){s.stuecke.push(x);s.rest-=ebaZahl(x.laenge)}
  else gierig.push({stuecke:[x],rest:L-ebaZahl(x.laenge)});
 });
 const summe=stuecke.reduce((a,b)=>a+ebaZahl(b.laenge),0);
 const untergrenze=Math.ceil(summe/L-1e-9);
 let schritte=0; const grenze=budget||200000;
 function passt(i,reste){
  if(i>=stuecke.length)return true;
  if(++schritte>grenze)return null;
  const len=ebaZahl(stuecke[i].laenge), gesehen=[];
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
    const len=ebaZahl(stuecke[i].laenge), gesehen=[];
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
function ebaTafelLaenge(){
 const l=(ebA.stuecke||[]).map(p=>ebaZahl(p.laenge)).filter(x=>x>0);
 return l.length?Math.max.apply(null,l):0;
}
function ebaRollenPlan(){
 const A=ebaZahl(ebA.abwicklung);
 const bleche=(ebA.stuecke||[]).map((p,i)=>({nr:i+1,laenge:ebaZahl(p.laenge)}))
  .filter(x=>x.laenge>0);
 const L=ebaTafelLaenge();
 const breiten=ebaRollenbreiten();
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,tafelLaenge:L};
 const verteilung=ebaPackeInStreifen(bleche,L);
 const moeglich=[], zuSchmal=[];
 const netto=ebaFlaecheM2();
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

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function ebaAusmassZeilen(){
 const a=ebA, z=[], L=ebaGesamtlaenge();
 let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(L>0)zeile("Einlaufblech gerade, Abwicklung "+ebaMm(a.abwicklung)+" mm",ebaMeter(L),"m","Summe der Zuschnittlängen");
 if((a.stuecke||[]).length)zeile("Stücke (Zuschnitte)",a.stuecke.length,"Stk.","Stückliste");
 const gehrungen=(a.stuecke||[]).reduce((s,p)=>s+(p.gehrungLinks?1:0)+(p.gehrungRechts?1:0),0);
 if(gehrungen)zeile("Gehrungen",gehrungen,"Stk.","Stückliste");
 const stoss=Math.max(0,(a.stuecke||[]).length-1);
 if(stoss)zeile("Blechstösse",stoss,"Stk.","je Übergang zwischen zwei Stücken");
 if(L>0)zeile("Blechfläche",ebaFlaecheM2().toFixed(2).replace(".",","),"m²","Gesamtlänge × Abwicklung");
 const nG=ebaGavaAnzahl();
 if(nG!==null)zeile("Haltebleche (GAVA Blech)",nG,"Stk.",
   (a.gava.anzahl?"Eingabe":"Länge ÷ Abstand "+ebaMm(a.gava.abstand_mm)+" mm"));
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 if(letzte&&ebaZahl(letzte.endzugabeStart))zeile("Endzugabe erstes Stück",ebaMm(letzte.endzugabeStart),"mm","Einstellung Endzugabe");
 if(letzte&&ebaZahl(letzte.endzugabeEnd))zeile("Endzugabe letztes Stück",ebaMm(letzte.endzugabeEnd),"mm","Einstellung Endzugabe");
 return z;
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen. Es
// werden keine fachlichen Grenzwerte erfunden.
function ebaPruefungen(){
 const a=ebA, m=[], s=einlaufblechSettings;
 const uO=ebaZahl(s.umschlag_oben), uU=ebaZahl(s.umschlag_unten);
 if(!ebaZahl(a.massA))m.push({art:"fehler",text:"Mass A fehlt – Pflichtfeld beim Speichern."});
 else if(ebaZahl(a.massA)<0)m.push({art:"fehler",text:"Mass A ist negativ."});
 if(a.winkel===""||a.winkel===null||a.winkel===undefined)
  m.push({art:"fehler",text:"Dachneigung / Winkel fehlt – Pflichtfeld beim Speichern."});
 else if(ebaZahl(a.winkel)<=0||ebaZahl(a.winkel)>=180)
  m.push({art:"fehler",text:"Winkel "+ebaZahl(a.winkel)+"° lässt sich nicht zeichnen: die Schnittzeichnung rechnet mit 180° − Winkel, also nur zwischen 0° und 180°."});
 const rb=ebaRestbreite();
 if(rb<0)m.push({art:"fehler",text:"Restbreite "+ebaMm(rb)+" mm – Mass A und die Umschläge sind zusammen grösser als die Abwicklung ("+ebaMm(a.abwicklung)+" mm)."});
 else if(rb===0)m.push({art:"warnung",text:"Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig."});
 if(uO<=0||uU<=0)m.push({art:"warnung",text:"Umschlag oben oder unten ist 0 mm. Die Schnittzeichnung zeigt dafür nur einen Platzhalter."});
 if(!(a.stuecke||[]).length)
  m.push({art:"fehler",text:"Noch kein Stück erfasst – mindestens eines mit einer Länge ist zum Speichern nötig."});
 else{
  if(!a.stuecke.some(p=>ebaZahl(p.laenge)>0))
   m.push({art:"fehler",text:"Kein Stück hat eine Länge grösser als 0 mm."});
  const grenze=ebaZahl(s.stoss_laenge)+ebaZahl(s.ueberlappung);
  a.stuecke.forEach((p,i)=>{
   if(ebaZahl(p.laenge)<0)m.push({art:"fehler",text:"Stück "+(i+1)+" hat eine negative Länge."});
   if(i<a.stuecke.length-1&&ebaZahl(p.laenge)>grenze)
    m.push({art:"warnung",text:"Stück "+(i+1)+" ist "+ebaMm(p.laenge)+" mm lang. Ausser dem Reststück darf keines länger sein als Länge Stoss/Stoss + Überlappung ("+ebaMm(grenze)+" mm)."});
  });
 }
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt – die Materialübersicht bleibt unvollständig."});
 return m;
}

// ---- Oberfläche ------------------------------------------------------------
// Wiederverwendet die Register-/Karten-Stile der Rinnen-Aufnahme (ra-*): sie
// sind generisch und bereits auf Tablet und Handy erprobt.
function ebaFeld(label,inhalt,voll){
 return `<div${voll?' class="wide"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function ebaKarte(titel,inhalt){
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}</h2>${inhalt}</div>`;
}

function ebaGrunddatenHtml(){
 const a=ebA;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const abwOpt=[200,250,330].map(w=>
  `<option value="${w}"${Number(a.abwicklung)===w?" selected":""}>${w} mm</option>`).join("");
 const monOpt=[["links","von links"],["rechts","von rechts"]].map(([w,t])=>
  `<option value="${w}"${a.montage===w?" selected":""}>${esc(t)}</option>`).join("");
 return `<div class="grid">
${ebaFeld("Material",`<select id="eba_material">${matOpt}</select>`)}
${ebaFeld("Abwicklung",`<select id="eba_abwicklung">${abwOpt}</select>`)}
${ebaFeld("Montage",`<select id="eba_montage">${monOpt}</select>`)}
${ebaFeld("Enge Seite",`<div class="ra-wert" id="eba_wSeite">${esc(ebaEngeSeite())}</div>`)}
</div>
<div class="info">Die Bleche werden leicht konisch gebogen, damit sie ineinandergesteckt werden können;
die weite Seite wird angereift. Länge Stoss/Stoss, Überlappung, Umschläge, Gehrungs- und Endzugabe
stehen in <b>Einstellungen → Massaufnahmen → Einlaufblech gerade</b>.
<button type="button" class="gray" id="eba_einstellungen" style="margin-left:8px;padding:3px 9px;font-size:11px">⚙️ Werte anpassen</button></div>`;
}

function ebaGeometrieHtml(){
 const a=ebA;
 const rb=ebaRestbreite();
 return `<div class="grid">
${ebaFeld("Mass A (mm)",`<input id="eba_massA" data-pflicht="1" type="number" inputmode="numeric" step="1" value="${a.massA===""?"":esc(a.massA)}">`)}
${ebaFeld("Dachneigung / Winkel (°)",`<input id="eba_winkel" data-pflicht="1" type="number" inputmode="decimal" step="0.1" value="${a.winkel===""?"":esc(a.winkel)}">`)}
${ebaFeld("Enges Mass A",`<div class="ra-wert" id="eba_wEng">${esc(ebaMm(ebaMassAEng()))} mm</div>`)}
${ebaFeld("Restbreite (Dachschräge)",`<div class="ra-wert${rb<0?" ra-rest":""}" id="eba_wRest">${esc(ebaMm(rb))} mm</div>`)}
</div>
<div class="small" id="eba_formel" style="margin:2px 0 8px;color:var(--muted)">${ebaFormelText()}</div>
<div id="eba_schnitt" class="eb-diagram-box"></div>`;
}
function ebaFormelText(){
 const a=ebA, s=einlaufblechSettings;
 return `Restbreite = Abwicklung ${esc(ebaMm(a.abwicklung))} − Mass A ${esc(ebaMm(a.massA))}`
  +` − Umschlag oben ${esc(ebaMm(s.umschlag_oben))} − Umschlag unten ${esc(ebaMm(s.umschlag_unten))} mm.`
  +` Enges Mass A = Mass A − 2 mm, es gilt bei Montage „von ${esc(a.montage)}“ auf der ${esc(ebaEngeSeite())}en Seite.`;
}

function ebaStueckeHtml(){
 const a=ebA;
 const L=ebaGesamtlaenge();
 const eng=ebaMassAEng(), seite=ebaEngeSeite();
 const letzte=(a.stuecke||[])[a.stuecke.length-1]||{};
 const zeilen=(a.stuecke||[]).map((p,i)=>`<tr>
<td>${i+1}</td>
<td><input data-eba-stoss="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.stossStoss||0)}"></td>
<td><div class="zu-lb"><input data-eba-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.laenge||0)}"><span class="zu-lb-breite">mm × ${esc(ebaMm(a.abwicklung))}&nbsp;mm</span></div></td>
<td class="p-mitte"><input data-eba-gl="${i}" type="checkbox"${p.gehrungLinks?" checked":""}></td>
<td class="p-mitte"><input data-eba-gr="${i}" type="checkbox"${p.gehrungRechts?" checked":""}></td>
<td><div style="display:flex;gap:4px;align-items:center"><input data-eba-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.winkel||0)}" style="flex:1"><button type="button" class="gray ra-weg" data-eba-flip="${i}" title="Winkel umkehren">🔄</button></div></td>
<td>${esc(ebaMm(eng))}</td>
<td class="p-mitte"><button type="button" class="red ra-weg" data-eba-weg="${i}" title="Stück löschen">✕</button></td>
</tr>`).join("");
 return `<div class="grid">
${ebaFeld("Gesamtlänge (mm)",`<input id="eba_gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaenge===""?"":esc(a.gesamtlaenge)}" placeholder="für die Aufteilung">`)}
${ebaFeld("Aus den Stücken",`<div class="ra-wert" id="eba_wLaenge">${L>0?esc(ebaMm(L))+" mm":"–"}</div>`)}
</div>
<div class="bar">
<button type="button" class="gray" id="eba_neuAusGesamt">🔄 Stücke aus Gesamtlänge berechnen</button>
<button type="button" class="gray" id="eba_anhaengen">➕ Weitere Länge anfügen</button>
<button type="button" class="gray" id="eba_stueckPlus">＋ Stück hinzufügen</button>
</div>
<div class="small" style="margin:2px 0 8px;color:var(--muted)">„Anfügen“ ergänzt Stücke aus der Gesamtlänge ans Ende der Liste, z. B. um nach einer Gehrung in eine andere Richtung weiterzufahren.</div>
<div class="small" style="margin-bottom:4px">Mass A gilt für alle Stücke. Das enge Mass (${esc(ebaMm(eng))} mm) wird bei Montage „von ${esc(a.montage)}“ auf der ${esc(seite)}en Seite jedes Stücks berechnet.</div>
<div class="scroll">
<table class="eb-table eba-tab">
<thead><tr><th>Nr.</th><th>Länge Stoss/Stoss (mm)</th><th>Zuschnitt (Länge × Breite)</th><th>Ger. L</th><th>Ger. R</th><th>Winkel (°)</th><th>Eng ${esc(seite)} (mm)</th><th></th></tr></thead>
<tbody>${zeilen||'<tr><td colspan="8" class="small">Noch kein Stück. „Stücke aus Gesamtlänge berechnen“ oder „＋ Stück hinzufügen“.</td></tr>'}</tbody>
</table>
</div>
<div class="bar">
<button type="button" class="gray" id="eba_endStart">Endzugabe erstes Stück: ${letzte.endzugabeStart?"ein":"aus"}</button>
<button type="button" class="gray" id="eba_endEnde">Endzugabe letztes Stück: ${letzte.endzugabeEnd?"ein":"aus"}</button>
</div>
<h2 style="margin-top:14px">Grundriss</h2>
<div class="info">Winkel = Richtungsänderung nach diesem Stück (positiv/negativ möglich, 0 = keine Ecke).</div>
<div id="eba_grundriss" class="eb-diagram-box"></div>
${ebaGavaHtml()}`;
}
function ebaGavaHtml(){
 const g=ebA.gava||{}, n=ebaGavaAnzahl(), vor=ebaGavaVorschlag();
 return `<div class="ra-dehnung">
<label class="ra-schalter"><input type="checkbox" id="eba_gavaAktiv"${g.aktiv?" checked":""}> GAVA Blech (Haltebleche)</label>
${g.aktiv?`<div class="grid">
${ebaFeld("Abstand (mm)",`<input id="eba_gavaAbstand" type="number" inputmode="numeric" step="1" value="${esc(g.abstand_mm||"")}">`)}
${ebaFeld("Anzahl (leer = gerechnet)",`<input id="eba_gavaAnzahl" type="number" inputmode="numeric" step="1" value="${g.anzahl===null||g.anzahl===undefined?"":esc(g.anzahl)}">`)}
</div>
<div class="ra-dehnung-zahl"><span>Haltebleche</span><b id="eba_wGava">${n===null?"–":esc(n)+" Stk."}</b>
<span>${vor===null?"Länge und Abstand fehlen":"Länge ÷ Abstand + 1 ergibt "+esc(vor)}</span></div>
${vor!==null&&(g.anzahl!==null&&g.anzahl!==undefined&&g.anzahl!=="")?`<div class="bar"><button type="button" class="gray" id="eba_gavaZurueck">↻ Zurück zur Berechnung</button></div>`:""}`
 :`<div class="small" style="color:var(--muted)">Ohne Haken werden keine Haltebleche gerechnet und keine ins Ausmass gestellt.</div>`}
</div>`;
}

function ebaKontrolleHtml(){
 const m=ebaPruefungen();
 if(!m.length)return `<div class="ra-pruefung"><div class="ra-ok">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div></div>`;
 return `<div class="ra-pruefung">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

function ebaAusmassHtml(){
 const z=ebaAusmassZeilen();
 if(!z.length)return `<div class="small">Noch nichts zu messen – bitte zuerst Stücke erfassen.</div>`;
 const mat=findMeasurementMaterial(ebA.material);
 return `<div class="scroll"><table class="eb-table eba-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:8px">Material: <b>${esc(mat?mat.name:"–")}</b> · Blechfläche <b>${esc(ebaFlaecheM2().toFixed(2).replace(".",","))} m²</b>.
Ohne Artikelnummern und ohne Preise – das Ausmass entsteht allein aus dieser Aufnahme.</div>`;
}

// Der Plan wird in die gemeinsame Form gebracht (js/33) und dort dargestellt -
// damit sieht der Zuschnitt in allen Massaufnahme-Arten gleich aus. Gerechnet
// wird weiterhin hier bzw. in ebaPackeInStreifen().
function ebaZuschnittPlan(){
 const plan=ebaRollenPlan();
 const v=plan.verteilung||{};
 const streifen=v.streifen||[];
 const A=ebaZahl(ebA.abwicklung);
 return {art:"rolle", einheit:"Stück",
  einleitung:ZU_EINLEITUNG_ROLLE,
  quelle:ZU_QUELLE_ROLLE,
  leer:!(ebA.stuecke||[]).length?"Noch nichts zuzuschneiden – bitte zuerst Stücke erfassen."
      :(!ebaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
      :"Kein Stück lässt sich auf eine Tafel legen."),
  streifenbreiten:[A],
  gruppen:streifen.length?[{breite:A,tafelLaenge:plan.tafelLaenge,streifen}]:[],
  moeglich:plan.moeglich, netto:ebaFlaecheM2(),
  zuSchmal:plan.zuSchmal, zuLang:v.zuLang||[], optimal:v.optimal!==false};
}
function ebaZuschnittHtml(){return zuschnittHtml(ebaZuschnittPlan())}

// ---- Register --------------------------------------------------------------
function ebaSetzeSchritt(n){
 ebaSchritt=Math.max(1,Math.min(EBA_REGISTER.length,Number(n)||1));
 renderEinlaufblechAufnahme();
 const kopf=$("eba_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function ebaRegisterHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt –
 // sonst müsste man das Register aufsuchen, um zu merken, dass etwas fehlt.
 const p=ebaPruefungen();
 const fehler=p.filter(m=>m.art==="fehler").length;
 const warn=p.length-fehler;
 return `<div class="ra-register" id="eba_register">`+EBA_REGISTER.map(r=>{
  const marke=r.nr===EBA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===ebaSchritt?" aktiv":""}" data-eba-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function ebaSchrittInhalt(){
 if(ebaSchritt===1)return ebaKarte("1 · Grunddaten",ebaGrunddatenHtml());
 if(ebaSchritt===2)return ebaKarte("2 · Geometrie",ebaGeometrieHtml());
 if(ebaSchritt===3)return ebaKarte("3 · Stücke",ebaStueckeHtml());
 if(ebaSchritt===4)return ebaKarte("4 · Zuschnitt aus Rollenblech",ebaZuschnittHtml());
 if(ebaSchritt===5)return ebaKarte("5 · Ausmass und Material",ebaAusmassHtml());
 return ebaKarte("6 · Kontrolle",ebaKontrolleHtml());
}
function renderEinlaufblechAufnahme(){
 const ziel=$("einlaufblechAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zurücksetzen/Füllen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen –
 // ohne diese Zeile wäre es dann sichtbar, aber tot.
 ebaVerdrahten();
 ebaGeruest();
 ebaBruecke();
 $("eba_kopf").innerHTML=ebaRegisterHtml()+ebaSchrittInhalt();
 $("eba_fuss").innerHTML=`<div class="bar ra-blaettern">
<button type="button" class="gray" id="eba_zurueck"${ebaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="eba_weiter">${
 ebaSchritt>=EBA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(EBA_REGISTER[ebaSchritt].kurz)}</button>
</div>`;
 ebaZeichnungen();
 ebaRinneBoxZeigen();
 // Die Pflichtfelder entstehen erst hier, nach markierePflichtfelder() beim
 // App-Start - deshalb fuer diesen Bereich noch einmal aufrufen (dasselbe
 // Vorgehen wie bei den Massfeldern der Ort-/Seitenbleche in js/20).
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 // Die Registerleiste scrollt auf schmalen Geräten seitwärts. Das aktive
 // Register muss darin sichtbar sein – über die tatsächlichen Rechtecke,
 // nicht über offsetLeft (das bezieht sich auf den offsetParent).
 const strip=$("eba_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Der Übernahme-Block aus dem HTML gehört in Register 3, darf aber NICHT in
// einen Container, der per innerHTML neu geschrieben wird: js/15 hat seinen
// Klick-Handler beim Laden an #eb_rinneList gehängt, und ein Neuschreiben
// würde das Element samt Handler vernichten. Deshalb bekommt
// #einlaufblechAufnahme ein festes Gerüst aus drei Teilen; neu geschrieben
// werden nur Kopf und Fuss, der Block liegt unberührt dazwischen.
function ebaGeruest(){
 const ziel=$("einlaufblechAufnahme");
 if(!ziel||$("eba_kopf"))return;
 const box=$("ebaRinneBox");
 ziel.innerHTML='<div id="eba_kopf"></div><div id="eba_fuss"></div>';
 if(box)ziel.insertBefore(box,$("eba_fuss"));
}
let ebaRinneListeFuer;   // fuer welches Projekt die Liste zuletzt geladen wurde
function ebaRinneBoxZeigen(){
 const box=$("ebaRinneBox"); if(!box)return;
 const inRegister3=ebaSchritt===3;
 box.hidden=!inRegister3;
 if(!inRegister3)return;
 // Aufgeklappt zeigen: der Abschnitt ist ein Zweck dieses Registers,
 // zugeklappt würde man ihn übersehen.
 box.classList.add("open");
 // Die Liste hängt am gewählten Projekt. js/10 lädt sie bei der Projektwahl
 // und beim Öffnen einer Aufnahme; hier nur nachladen, wenn sie für dieses
 // Projekt noch nie geladen wurde - sonst liefe bei jedem Klick in Register 3
 // eine Abfrage.
 const pid=(typeof measSelectedProjectId!=="undefined")?measSelectedProjectId:null;
 if(pid!==ebaRinneListeFuer&&typeof refreshEbRinneList==="function"){
  ebaRinneListeFuer=pid;
  refreshEbRinneList();
 }
}

// Die Schnittzeichnung kommt unverändert aus js/11, der Grundriss aus js/13.
function ebaZeichnungen(){
 const a=ebA;
 const sch=$("eba_schnitt");
 if(sch)sch.innerHTML=einlaufblechDiagramSvg(a.winkel,a.massA,ebaRestbreite(),
   einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten);
 const gr=$("eba_grundriss");
 if(gr)gr.innerHTML=generateEbkGrundriss(a.stuecke||[]);
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet – sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function ebaLive(){
 ebaBruecke();
 const rb=ebaRestbreite();
 const rest=$("eba_wRest");
 if(rest){rest.textContent=ebaMm(rb)+" mm"; rest.classList.toggle("ra-rest",rb<0)}
 const eng=$("eba_wEng"); if(eng)eng.textContent=ebaMm(ebaMassAEng())+" mm";
 const seite=$("eba_wSeite"); if(seite)seite.textContent=ebaEngeSeite();
 const formel=$("eba_formel"); if(formel)formel.innerHTML=ebaFormelText();
 const L=$("eba_wLaenge");
 if(L){const g=ebaGesamtlaenge(); L.textContent=g>0?ebaMm(g)+" mm":"–"}
 const gava=$("eba_wGava");
 if(gava){const n=ebaGavaAnzahl(); gava.textContent=n===null?"–":n+" Stk."}
 ebaZeichnungen();
}

// ---- Bedienung -------------------------------------------------------------
// Eine einzige Stelle für alle Ereignisse innerhalb von #measTypeEinlaufblech.
// Tippen (input) ändert nur das Modell und die abgeleiteten Anzeigen,
// Auswählen (change) und Klicken zeichnen neu.
function ebaNeuesStueck(){
 const stoss=ebaZahl(einlaufblechSettings.stoss_laenge)||2000;
 return {laenge:stoss+ebaZahl(einlaufblechSettings.ueberlappung),stossStoss:stoss,
         gehrungLinks:false,gehrungRechts:false,winkel:0};
}
// Aufteilung unverändert über teileLaengeInStuecke() aus js/13.
function ebaStueckeAusGesamtlaenge(L){
 const stoss=ebaZahl(einlaufblechSettings.stoss_laenge)||1;
 return teileLaengeInStuecke(L,einlaufblechSettings).map((len,i,alle)=>({
  laenge:len, stossStoss:i===alle.length-1?len:stoss,
  gehrungLinks:false, gehrungRechts:false, winkel:0
 }));
}
// Gehrung: dieselbe Regel wie in js/15 – Zugabe auf die Länge, Winkel 90,
// und die gleiche physische Ecke am Nachbarstück wird mitgesetzt.
function ebaGehrung(i,seite,an){
 const p=(ebA.stuecke||[])[i]; if(!p)return;
 const zugabe=ebaZahl(einlaufblechSettings.gehrungszugabe);
 const key=seite==="links"?"gehrungLinks":"gehrungRechts";
 const war=!!p[key];
 p[key]=!!an;
 if(an&&!war){
  p.laenge=ebaZahl(p.laenge)+zugabe; p.winkel=90;
  const nachbar=seite==="links"?ebA.stuecke[i-1]:ebA.stuecke[i+1];
  const nkey=seite==="links"?"gehrungRechts":"gehrungLinks";
  if(nachbar&&!nachbar[nkey]){
   nachbar[nkey]=true; nachbar.laenge=ebaZahl(nachbar.laenge)+zugabe; nachbar.winkel=90;
  }
 }else if(!an&&war){
  p.laenge=Math.max(0,ebaZahl(p.laenge)-zugabe);
 }
 if(!p.gehrungLinks&&!p.gehrungRechts)p.winkel=0;
}
// Endzugabe: unverändert die Regel aus js/15 – immer auf das Reststück,
// weil kein reguläres Stück länger sein darf als Stoss/Stoss + Überlappung.
function ebaEndzugabe(position){
 const liste=ebA.stuecke;
 if(!liste.length)return "Bitte zuerst Stücke erfassen.";
 const zugabe=ebaZahl(einlaufblechSettings.end_zugabe);
 if(!zugabe)return "In den Einstellungen ist keine Endzugabe (> 0 mm) hinterlegt.";
 const p=liste[liste.length-1];
 const key=position==="start"?"endzugabeStart":"endzugabeEnd";
 if(p[key]){p.laenge=Math.max(0,ebaZahl(p.laenge)-p[key]); p[key]=0;}
 else{p.laenge=ebaZahl(p.laenge)+zugabe; p[key]=zugabe;}
 return null;
}
// "Fertig" führt zum Rest des Formulars (Fotos, Notiz, Speichern) – es
// speichert NICHT selbst, damit es nur einen Speicherweg gibt.
function ebaAbschluss(){
 // Der Foto-/Skizzenbereich ist waehrend der Register ausgeblendet und
 // erscheint erst hier - deshalb zuerst aufklappen, dann hinscrollen.
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}

function ebaVerdrahten(){
 const wurzel=$("measTypeEinlaufblech");
 if(!wurzel||wurzel.dataset.ebaVerdrahtet)return;
 wurzel.dataset.ebaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=ebA;
  if(t.id==="eba_massA"){a.massA=t.value===""?"":ebaZahl(t.value)}
  else if(t.id==="eba_winkel"){a.winkel=t.value===""?"":ebaZahl(t.value)}
  else if(t.id==="eba_gesamt"){a.gesamtlaenge=t.value===""?"":ebaZahl(t.value);return}
  else if(t.id==="eba_gavaAbstand"){a.gava.abstand_mm=ebaZahl(t.value)}
  else if(t.id==="eba_gavaAnzahl"){a.gava.anzahl=t.value===""?null:ebaZahl(t.value)}
  else if(d.ebaLaenge!==undefined){
   const p=a.stuecke[Number(d.ebaLaenge)]; if(p)p.laenge=ebaZahl(t.value);
  }
  else if(d.ebaStoss!==undefined){
   const i=Number(d.ebaStoss), p=a.stuecke[i];
   if(!p)return;
   p.stossStoss=ebaZahl(t.value);
   p.laenge=p.stossStoss+ebaZahl(einlaufblechSettings.ueberlappung);
   // Das Längenfeld derselben Zeile mitziehen, ohne die Tabelle neu zu
   // zeichnen – sonst verliert das Feld den Fokus.
   const zeile=t.closest("tr");
   const feld=zeile&&zeile.querySelector('[data-eba-laenge="'+i+'"]');
   if(feld)feld.value=String(p.laenge);
  }
  else if(d.ebaWinkel!==undefined){
   const p=a.stuecke[Number(d.ebaWinkel)]; if(p)p.winkel=ebaZahl(t.value);
  }
  else return;
  ebaLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=ebA;
  if(t.id==="eba_material"){a.material=t.value; renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_abwicklung"){a.abwicklung=ebaZahl(t.value); renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_montage"){a.montage=t.value; renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_gavaAktiv"){
   a.gava.aktiv=!!t.checked;
   if(a.gava.aktiv&&!ebaZahl(a.gava.abstand_mm))a.gava.abstand_mm=ebaGavaVorgabe();
   renderEinlaufblechAufnahme(); return;
  }
  if(d.ebaGl!==undefined){ebaGehrung(Number(d.ebaGl),"links",t.checked); renderEinlaufblechAufnahme(); return}
  if(d.ebaGr!==undefined){ebaGehrung(Number(d.ebaGr),"rechts",t.checked); renderEinlaufblechAufnahme(); return}
 });

 wurzel.addEventListener("click",e=>{
  // Die Rinnen-Uebernahme von js/15 haengt am Listen-Element selbst und
  // laeuft durch das Blubbern ZUERST. Sie ersetzt ebPieces durch ein NEUES
  // Array - ohne die folgende Zeile wuerde ebaBruecke() es beim naechsten
  // Zeichnen wieder mit dem alten Stand ueberschreiben und die uebernommenen
  // Stuecke waeren lautlos weg (in v2.74/v2.75 nachgemessen: der
  // Speicher-Payload enthielt danach 0 Stuecke). Hat js/15 abgebrochen,
  // ist ebPieces unveraendert und die Bedingung greift nicht.
  if(e.target.closest("[data-pick-eb-rinne]")){
   if(Array.isArray(ebPieces)&&ebPieces!==ebA.stuecke)ebA.stuecke=ebPieces;
   renderEinlaufblechAufnahme(); return;
  }
  const t=e.target.closest("button,[data-eba-schritt]");
  if(!t)return;
  const d=t.dataset||{}, a=ebA;
  if(d.ebaSchritt!==undefined){ebaSetzeSchritt(d.ebaSchritt); return}
  if(t.id==="eba_zurueck"){if(ebaSchritt>1)ebaSetzeSchritt(ebaSchritt-1); return}
  if(t.id==="eba_weiter"){
   if(ebaSchritt>=EBA_REGISTER.length)ebaAbschluss();
   else ebaSetzeSchritt(ebaSchritt+1);
   return;
  }
  if(t.id==="eba_einstellungen"){
   settingsReturnToMeasurement=true;
   $("measurementEditModal").hidden=true;
   renderSettings();
   openSettingsTo("measurements","einlaufblech");
   return;
  }
  if(t.id==="eba_neuAusGesamt"){
   const L=ebaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
   if((a.stuecke||[]).length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
   a.stuecke=ebaStueckeAusGesamtlaenge(L);
   renderEinlaufblechAufnahme(); return;
  }
  if(t.id==="eba_anhaengen"){
   const L=ebaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
   a.stuecke=(a.stuecke||[]).concat(ebaStueckeAusGesamtlaenge(L));
   renderEinlaufblechAufnahme(); return;
  }
  if(t.id==="eba_stueckPlus"){a.stuecke.push(ebaNeuesStueck()); renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_endStart"||t.id==="eba_endEnde"){
   const fehler=ebaEndzugabe(t.id==="eba_endStart"?"start":"ende");
   if(fehler)alert(fehler); else renderEinlaufblechAufnahme();
   return;
  }
  if(t.id==="eba_gavaZurueck"){a.gava.anzahl=null; renderEinlaufblechAufnahme(); return}
  if(d.ebaWeg!==undefined){a.stuecke.splice(Number(d.ebaWeg),1); renderEinlaufblechAufnahme(); return}
  if(d.ebaFlip!==undefined){
   const p=a.stuecke[Number(d.ebaFlip)];
   if(p)p.winkel=-ebaZahl(p.winkel);
   renderEinlaufblechAufnahme(); return;
  }
 });
}

// ---- Laden und Zurücksetzen ------------------------------------------------
// Ein gespeicherter Datensatz wird gelesen, wie er ist. Fehlt ein neues Feld
// (alte Aufnahme), gilt der Standard – es wird nichts erfunden: eine alte
// Aufnahme hat keine Haltebleche erfasst, also stehen sie auf "nicht aktiv".
function ebaAusData(d){
 const a=ebaLeer();
 if(!d)return a;
 a.material=d.material??"";
 a.abwicklung=ebaZahl(d.abwicklung)||250;
 a.montage=d.montage||"links";
 a.massA=d.massA===undefined||d.massA===null||d.massA===""?"":ebaZahl(d.massA);
 a.winkel=d.winkel===undefined||d.winkel===null||d.winkel===""?"":ebaZahl(d.winkel);
 a.gesamtlaenge=d.gesamtlaenge===undefined||d.gesamtlaenge===null||d.gesamtlaenge===""?"":ebaZahl(d.gesamtlaenge);
 a.stuecke=Array.isArray(d.pieces)?d.pieces.map(p=>({...p})):[];
 if(d.gava&&typeof d.gava==="object"){
  a.gava={aktiv:!!d.gava.aktiv,
   abstand_mm:ebaZahl(d.gava.abstand_mm)||ebaGavaVorgabe(),
   anzahl:(d.gava.anzahl===null||d.gava.anzahl===undefined||d.gava.anzahl==="")?null:ebaZahl(d.gava.anzahl)};
 }
 return a;
}
// Nach dem Setzen wird neu gezeichnet - sonst zeigt das Register noch den
// vorherigen Stand (showMeasTypeSection laeuft in openMeasurement VOR dem
// Fuellen).
function ebaZuruecksetzen(){ebA=ebaLeer(); ebaSchritt=1; ebaRinneListeFuer=undefined; ebPieces=ebA.stuecke; ebaVerdrahten(); renderEinlaufblechAufnahme()}
function ebaFuellen(d){ebA=ebaAusData(d); ebaSchritt=1; ebaRinneListeFuer=undefined; ebPieces=ebA.stuecke; ebaVerdrahten(); renderEinlaufblechAufnahme()}

// ---- Zusatzfelder für den Speicher-Payload ---------------------------------
// js/16 schreibt weiterhin genau dieselben acht Felder wie bisher und hängt
// nur diese hier an. Die Ergebnisse werden mitgespeichert, damit ein später
// gedrucktes Blatt gleich bleibt, auch wenn Einstellungen sich ändern -
// dasselbe Vorgehen wie bei Rinne, Kehle und Anschlussblech.
function ebaZusatzDaten(){
 const a=ebA;
 const plan=ebaRollenPlan();
 return {
  gava:{aktiv:!!(a.gava&&a.gava.aktiv),
        abstand_mm:ebaZahl(a.gava&&a.gava.abstand_mm),
        anzahl:(a.gava&&a.gava.anzahl!==null&&a.gava.anzahl!==undefined&&a.gava.anzahl!=="")?ebaZahl(a.gava.anzahl):null,
        gerechnet:ebaGavaAnzahl()},
  flaeche_m2:Number(ebaFlaecheM2().toFixed(3)),
  ausmass:ebaAusmassZeilen(),
  rollen:{tafelLaenge:plan.tafelLaenge,
          breiten:ebaRollenbreiten(),
          bestes:plan.bestes||null,
          moeglich:plan.moeglich||[],
          streifen:((plan.verteilung||{}).streifen||[]).map(s=>({
            stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge})), rest:s.rest})),
          optimal:(plan.verteilung||{}).optimal!==false}
 };
}
