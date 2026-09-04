"use strict";
// ===========================================================================
// FREIES PROFIL · Aufnahme (Profil, Zeichnung, Skizze, Segmente, Zuschnitt)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung.
//
// js/14-freies-profil.js bleibt UNVERÄNDERT die Fachquelle:
//   generateProfilDiagramSvg()  die ganze Profilzeichnung
//   abgerundeterPfad()          runde Biegungen
//   ansichtsPfeilSvg()          Ansichtsrichtung
//   fpPruefeErkannteSchenkel()  Prüfung der Skizzen-Erkennung, max. 24 Schenkel
//   renderFpSegmenteList()      füllt leere Segment-Masse aus dem Profil
//   die ganze Skizzen-Erkennung (Knöpfe, Vorschau, Übernehmen/Verwerfen)
//
// Die Brücke sind die eigenen Variablen und Felder des bestehenden Moduls:
// fpaBruecke() setzt fpSchenkel, fpSegmente und die alten Formularfelder aus
// dem erfassten Stand. fpSchenkel IST danach fpA.schenkel - es gibt nur eine
// Wahrheit. Die alten, unsichtbaren Formularelemente in #fpStummel bleiben
// stehen, damit js/14 unverändert laden kann.
//
// Der Erkennungs-Block liegt NICHT im Stummel, sondern als eigenes Element
// #fpaSkizzeBox zwischen Kopf und Fuss: js/14 hängt seine Handler beim Laden
// an fp_sketchRecognize / fp_sketchUebernehmen / fp_sketchVerwerfen, und ein
// per innerHTML neu geschriebener Container würde sie samt Element vernichten.
//
// Neu gegenüber dem bestehenden Modul (aus dem Prototyp übernommen):
//   - Sieben Register statt eines langen Formulars
//   - Schenkel als grosse Karten, Zeichnung klebt beim Erfassen oben
//   - Blechfläche in m², Ausmass und Materialübersicht ohne zweite Eingabe
//   - Zuschnitt aus Rollenblech (dieselbe Packrechnung wie beim Einlaufblech)
//   - Kontrolle mit Punkt am Register
// ===========================================================================

// Die Register heissen und stehen in ALLEN Massaufnahme-Arten gleich:
// die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und zuletzt die
// Kontrolle. Segmente und Ausmass waren bis v2.79 ein Register - sie sind
// jetzt getrennt, damit das Ausmass ueberall an derselben Stelle steht.
const FPA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Profil"},{nr:3,kurz:"Zeichnung"},
 {nr:4,kurz:"Skizze → Profil"},{nr:5,kurz:"Segmente"},
 {nr:6,kurz:"Zuschnitt"},{nr:7,kurz:"Ausmass"},{nr:8,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt deshalb an
// der Registerzahl, nicht an einer festen Nummer.
const FPA_KONTROLLE=FPA_REGISTER.length;
let fpaSchritt=1;

// Die Rollen, mit denen DIESE Massaufnahme rechnet: das Blechlager der
// Firma, eingeschraenkt auf die im Register "Zuschnitt" angehakten.
function fpaRollen(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(fpA&&fpA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
const fpaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const fpaMm=v=>Math.round(fpaZahl(v)).toLocaleString("de-CH");
const fpaMeter=v=>(fpaZahl(v)/1000).toFixed(2).replace(".",",");

// rollenAuswahl: leer = das ganze Blechlager der Firma (nichts abgewaehlt).
function fpaLeer(){return {material:"",konisch:"nein",ansicht:"links",schenkel:[],segmente:[],rollenAuswahl:[]}}
let fpA=fpaLeer();

// ---- Brücke zum bestehenden Modul -----------------------------------------
function fpaBruecke(){
 const a=fpA;
 // Eine Wahrheit: fpSchenkel/fpSegmente SIND die Listen des Modells. Wer sie
 // von aussen ersetzt (js/14 bei der Skizzen-Übernahme), holt sie dort ab, wo
 // es passiert - siehe den Klick-Handler weiter unten.
 fpSchenkel=a.schenkel;
 fpSegmente=a.segmente;
 const setz=(id,wert)=>{const f=$(id); if(f)f.value=String(wert)};
 setz("fp_konisch",a.konisch||"nein");
 setz("fp_ansicht",a.ansicht||"keiner");
 setz("fp_material",a.material||"");
}
function fpaKonisch(){fpaBruecke();return $("fp_konisch").value==="ja"}
// Zeichnung: unverändert aus js/14, sie liest die Ansichtsrichtung selbst aus
// dem Formularfeld.
function fpaProfilSvg(schenkel){fpaBruecke();return generateProfilDiagramSvg(schenkel||fpA.schenkel)}
// Umschlag: dieselbe Regel wie istUmschlag() in generateProfilDiagramSvg().
function fpaIstUmschlag(s){
 const w=((fpaZahl(s&&s.winkel)%360)+360)%360;
 return Math.abs(w-180)<0.5;
}

// ---- Segmente --------------------------------------------------------------
// Leere Masse füllt renderFpSegmenteList() aus js/14 - hier wird nichts
// nachgebaut. Vorher werden aber verwaiste Masse gekürzt: werden Schenkel
// weniger (etwa weil eine erkannte Skizze das Profil ersetzt), bleiben sonst
// Masse zu Schenkeln stehen, die es nicht mehr gibt. Sie sind unsichtbar und
// würden in die Abwicklung mitgezählt.
function fpaMasseFuellen(){
 fpaBruecke();
 (fpA.segmente||[]).forEach(seg=>{
  if(!Array.isArray(seg.massen))seg.massen=[];
  if(seg.massen.length>fpA.schenkel.length)seg.massen.length=fpA.schenkel.length;
 });
 if(typeof renderFpSegmenteList==="function")renderFpSegmenteList();
}
function fpaSegmentMassen(seg){
 if(!Array.isArray(seg.massen))seg.massen=[];
 return seg.massen;
}
function fpaAbwicklungSegment(seg){
 const m=fpaSegmentMassen(seg);
 if(fpaKonisch()){
  return {links:m.reduce((s,x)=>s+fpaZahl(x&&x.links),0),
          rechts:m.reduce((s,x)=>s+fpaZahl(x&&x.rechts),0)};
 }
 const v=m.reduce((s,x)=>s+fpaZahl(x&&x.mass),0);
 return {links:v,rechts:v};
}
// Fläche eines Segments: Länge × Abwicklung. Bei einem konischen Segment ist
// das Blech ein Trapez - Länge × (links + rechts) / 2 ist dessen Fläche.
function fpaFlaecheSegmentM2(seg){
 const a=fpaAbwicklungSegment(seg);
 const breite=fpaKonisch()?(a.links+a.rechts)/2:a.links;
 return fpaZahl(seg.laenge)*breite/1e6;
}
function fpaLaufmeter(){return (fpA.segmente||[]).reduce((s,x)=>s+fpaZahl(x.laenge),0)}
function fpaFlaecheM2(){return (fpA.segmente||[]).reduce((s,x)=>s+fpaFlaecheSegmentM2(x),0)}
// Eine Biegung liegt zwischen zwei Schenkeln; ihr Winkel ist der Winkel des
// FOLGENDEN Schenkels. Winkel 0 heisst "gerade weiter" - keine Biegung.
function fpaBiegungen(){return (fpA.schenkel||[]).filter((s,i)=>i>0&&fpaZahl(s.winkel)!==0).length}
function fpaUmschlaege(){return (fpA.schenkel||[]).filter((s,i)=>i>0&&fpaIstUmschlag(s)).length}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function fpaAusmassZeilen(){
 fpaMasseFuellen();
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 const segs=fpA.segmente||[];
 if(!fpA.schenkel.length||!segs.length)return z;
 const konisch=fpaKonisch();
 const L=fpaLaufmeter();
 if(L>0)zeile("Freies Profil, "+fpA.schenkel.length+" Schenkel",fpaMeter(L),"m","Summe der Segmentlängen");
 zeile("Segmente",segs.length,"Stk.","Segmentliste");
 segs.forEach((seg,i)=>{
  const a=fpaAbwicklungSegment(seg);
  const txt=konisch
   ?(a.links>0||a.rechts>0?fpaMm(a.links)+" / "+fpaMm(a.rechts):"–")
   :(a.links>0?fpaMm(a.links):"–");
  zeile("Abwicklung Segment "+(i+1)+(konisch?" (links / rechts)":""),txt,"mm","Summe der Masse je Schenkel");
 });
 const b=fpaBiegungen(); if(b)zeile("Biegungen",b,"Stk.","Schenkel mit einem Winkel ≠ 0°");
 const u=fpaUmschlaege(); if(u)zeile("davon Umschläge (180°)",u,"Stk.","Schenkel mit Winkel 180°");
 const f=fpaFlaecheM2();
 if(f>0)zeile("Blechfläche",f.toFixed(2).replace(".",","),"m²",
   konisch?"Länge × mittlere Abwicklung je Segment (Trapez)":"Länge × Abwicklung je Segment");
 return z;
}

// ---- Zuschnitt aus Rollenblech ---------------------------------------------
// Gleiches Vorgehen wie beim Einlaufblech: von der Rolle wird eine TAFEL
// abgeschnitten und quer in Streifen der Abwicklungsbreite geteilt; ein
// Streifen kann mehrere Stücke HINTEREINANDER aufnehmen.
// Gepackt wird mit ebaPackeInStreifen() aus js/29 - es gibt bewusst nur EINE
// Packrechnung in der App, keine zweite daneben.
//
// Der eine Unterschied zum Einlaufblech: dort hat die ganze Aufnahme eine
// Abwicklung, hier hat JEDES SEGMENT seine eigene. Deshalb bilden Segmente mit
// gleicher Streifenbreite eine Gruppe, und jede Gruppe wird für sich gepackt.
//
// Konisch: die Streifenbreite ist die GRÖSSERE der beiden Abwicklungen - der
// Zuschnitt muss das breitere Ende enthalten. Die Fläche bleibt die
// Trapezfläche; die Differenz ist echter Verschnitt.
function fpaStreifenBreite(seg){
 const a=fpaAbwicklungSegment(seg);
 return Math.round(fpaKonisch()?Math.max(a.links,a.rechts):a.links);
}
function fpaZuschnittGruppen(){
 fpaMasseFuellen();
 const gruppen=[], ohne=[];
 (fpA.segmente||[]).forEach((seg,i)=>{
  const laenge=fpaZahl(seg.laenge), breite=fpaStreifenBreite(seg);
  if(laenge<=0||breite<=0){ohne.push({nr:i+1,laenge,breite});return}
  let g=gruppen.find(x=>x.breite===breite);
  if(!g){g={breite,stuecke:[]};gruppen.push(g)}
  // Bei einem konischen Profil sind zwei Segmente gleicher Laenge nur dann
  // derselbe Zuschnitt, wenn auch beide Abwicklungen gleich sind - die
  // Streifenbreite allein (die groessere Seite) genuegt nicht.
  const ab=fpaAbwicklungSegment(seg);
  const merkmal=fpaKonisch()
   ?("Abwicklung "+Math.round(ab.links)+" / "+Math.round(ab.rechts)+" mm"):"";
  g.stuecke.push({nr:i+1,laenge,merkmal});
 });
 gruppen.sort((a,b)=>b.breite-a.breite);
 // Ein Abschnitt ist so lang wie das laengste Stueck DIESER Streifenbreite -
 // die Verteilung haengt damit nicht an der Rollenbreite und wird einmal
 // gepackt. Die Zahl der Abschnitte folgt erst in fpaRollenPlan().
 gruppen.forEach(g=>{
  g.abschnittLaenge=Math.max.apply(null,g.stuecke.map(x=>x.laenge));
  const v=(typeof ebaPackeInStreifen==="function")
   ?ebaPackeInStreifen(g.stuecke,g.abschnittLaenge):{streifen:[],optimal:true};
  g.streifen=v.streifen||[];
  g.optimal=v.optimal!==false;
 });
 return {gruppen,ohne};
}
function fpaRollenPlan(){
 const {gruppen,ohne}=fpaZuschnittGruppen();
 const breiten=fpaRollen();
 const netto=fpaFlaecheM2();
 if(!gruppen.length||!breiten.length)
  return {gruppen,ohne,moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 const moeglich=[], zuSchmal=[];
 breiten.forEach(B=>{
  const zeilen=[]; let flaeche=0, passt=true;
  gruppen.forEach(g=>{
   const jeAbschnitt=Math.floor(B/g.breite);
   if(jeAbschnitt<1){passt=false;return}
   const abschnitte=Math.ceil(g.streifen.length/jeAbschnitt);
   const rollenLaenge=abschnitte*g.abschnittLaenge;
   flaeche+=B*rollenLaenge/1e6;
   zeilen.push({breite:g.breite,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,
                abschnittLaenge:g.abschnittLaenge,rollenLaenge,
                streifen:g.streifen.length,restBreite:B-jeAbschnitt*g.breite});
  });
  if(!passt){zuSchmal.push(B);return}
  moeglich.push({breite:B,zeilen,flaeche,verschnitt:flaeche-netto,
                 anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
                 rollenLaenge:zeilen.reduce((s,x)=>s+x.rollenLaenge,0)});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 // Die Abschnittzahl der besten Rolle ist die, mit der gearbeitet wird.
 const best=moeglich[0]||null;
 const gefuellt=gruppen.map((g,i)=>Object.assign({},g,{
   jeAbschnitt:best?best.zeilen[i].jeAbschnitt:1,
   abschnitte:best?best.zeilen[i].abschnitte:0,
   rollenLaenge:best?best.zeilen[i].rollenLaenge:0}));
 return {gruppen:gefuellt,ohne,moeglich,zuSchmal,bestes:best,netto,
         optimal:gruppen.every(g=>g.optimal)};
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen:
// mindestens 2 Schenkel (fpPruefeErkannteSchenkel verlangt genau das),
// höchstens FP_MAX_SCHENKEL, gültige Zahlen, keine negativen Längen, Winkel
// im Bereich, den die Erkennung zulässt (±180°), und eine Geometrie, die sich
// zeichnen lässt. Es werden KEINE eigenen Grenzwerte erfunden.
function fpaPruefungen(){
 const m=[], sch=fpA.schenkel||[], segs=fpA.segmente||[];
 const grenze=(typeof FP_MAX_SCHENKEL==="number")?FP_MAX_SCHENKEL:24;
 if(!sch.length)m.push({art:"fehler",text:"Noch kein Schenkel erfasst. Ein Profil braucht mindestens zwei."});
 else if(sch.length<2)m.push({art:"fehler",text:"Nur ein Schenkel – das ist noch kein Profil. Die Erkennung der App verlangt ebenfalls mindestens zwei."});
 if(sch.length>grenze)m.push({art:"fehler",text:"Mehr als "+grenze+" Schenkel. Höchstens "+grenze+" sind vorgesehen."});
 sch.forEach((s,i)=>{
  const l=Number(s.laenge), w=Number(s.winkel);
  if(!Number.isFinite(l))m.push({art:"fehler",text:"Schenkel "+(i+1)+": die Länge ist keine gültige Zahl."});
  else if(l<0)m.push({art:"fehler",text:"Schenkel "+(i+1)+": negative Länge."});
  else if(l===0)m.push({art:"fehler",text:"Schenkel "+(i+1)+": Länge 0 – bitte das Mass eintragen."});
  if(!Number.isFinite(w))m.push({art:"fehler",text:"Schenkel "+(i+1)+": der Winkel ist keine gültige Zahl."});
  else if(w<-180||w>180)m.push({art:"fehler",text:"Schenkel "+(i+1)+": Winkel ausserhalb von −180° bis 180°."});
 });
 if(sch.length&&fpaZahl(sch[0].winkel)!==0)
  m.push({art:"warnung",text:"Schenkel 1 hat einen Winkel – er dreht das ganze Profil. Meist ist hier 0° gemeint."});
 // Nicht behauptet, sondern versucht: die Zeichnung wird erzeugt und geprüft.
 if(sch.length){
  let svg="";
  try{svg=fpaProfilSvg(sch)}catch(e){svg=""}
  if(!svg||/NaN|Infinity/.test(svg))
   m.push({art:"fehler",text:"Die Geometrie lässt sich nicht zeichnen. Bitte Längen und Winkel prüfen."});
 }
 if(!fpA.material)m.push({art:"warnung",text:"Kein Material gewählt."});
 if(!segs.length)m.push({art:"warnung",text:"Noch kein Segment – ohne Segment gibt es kein Ausmass."});
 segs.forEach((seg,i)=>{
  if(fpaZahl(seg.laenge)<=0)m.push({art:"warnung",text:"Segment "+(i+1)+": keine Länge."});
  const a=fpaAbwicklungSegment(seg);
  if(a.links<=0)m.push({art:"warnung",text:"Segment "+(i+1)+": keine Masse erfasst."});
  if(fpaKonisch()&&a.rechts<=0)m.push({art:"warnung",text:"Segment "+(i+1)+": konisch, aber rechts ist leer."});
 });
 return m;
}

// ---- Oberfläche ------------------------------------------------------------
function fpaFeld(label,inhalt,voll){
 return `<div${voll?' class="wide"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function fpaKarte(titel,inhalt){
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}</h2>${inhalt}</div>`;
}
function fpaGrunddatenHtml(){
 const a=fpA;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const konOpt=[["nein","Nein"],["ja","Ja"]].map(([w,t])=>
  `<option value="${w}"${a.konisch===w?" selected":""}>${esc(t)}</option>`).join("");
 const ansOpt=[["keiner","kein Pfeil"],["links","von links"],["oben","von oben"],
               ["rechts","von rechts"],["unten","von unten"]].map(([w,t])=>
  `<option value="${w}"${a.ansicht===w?" selected":""}>${esc(t)}</option>`).join("");
 return `<div class="grid">
${fpaFeld("Material",`<select id="fpa_material">${matOpt}</select>`)}
${fpaFeld("Konisch (Mass links/rechts je Schenkel)",`<select id="fpa_konisch">${konOpt}</select>`)}
${fpaFeld("Ansichtspfeil",`<select id="fpa_ansicht">${ansOpt}</select>`)}
</div>
<div class="info">Zuerst das Profil Schenkel für Schenkel festlegen (Länge und Winkel zum vorherigen
Schenkel; 180° = Umschlag), danach die Segmente mit den tatsächlichen Massen. Ist das Profil
<b>konisch</b>, wird je Schenkel ein Mass links und rechts erfasst.</div>`;
}
function fpaProfilHtml(){
 const a=fpA;
 const karten=a.schenkel.map((s,i)=>{
  const um=fpaIstUmschlag(s);
  return `<div class="ra-zeile" data-fpa-zeile="${i}">
<div class="ra-zeile-kopf"><b>Schenkel ${i+1}</b>
<span class="small">${esc(fpaMm(s.laenge))} mm · ${esc(fpaMm(s.winkel))}°${um?" · Umschlag":""}${i===0?" · Startschenkel":""}</span>
<button type="button" class="red ra-weg" data-fpa-weg="${i}" title="Schenkel löschen">✕</button></div>
<div class="grid">
${fpaFeld("Länge (mm)",`<input data-fpa-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(s.laenge||0)}">`)}
${fpaFeld("Winkel (°)",`<input data-fpa-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(s.winkel||0)}">`)}
</div>
<div class="bar">
<button type="button" class="gray" data-fpa-flip="${i}" title="Winkel umkehren">🔄 Richtung umkehren</button>
<button type="button" class="gray${um?" ra-aktiv":""}" data-fpa-umschlag="${i}" title="Winkel auf 180° setzen">180° Umschlag</button>
${i>0?`<button type="button" class="gray" data-fpa-hoch="${i}">↑</button>`:""}
${i<a.schenkel.length-1?`<button type="button" class="gray" data-fpa-runter="${i}">↓</button>`:""}
</div></div>`;
 }).join("");
 // Der Knopf steht UNTER den Karten: nach dem letzten Schenkel ist man ohnehin
 // dort und muss nicht wieder nach oben scrollen.
 return `<div class="info">Winkel = Richtungsänderung gegenüber dem vorherigen Schenkel.
0° heisst gerade weiter, 180° ist ein Umschlag. „Richtung umkehren“ dreht das Vorzeichen –
dieselbe Regel wie bisher.</div>
<div id="fpa_profil" class="ra-zeichnung ra-klebt">
<div class="ra-zeichnung-kopf"><span>Zeichnung – folgt jeder Eingabe</span><span>${a.schenkel.length} Schenkel</span></div>
<div id="fpa_profilBild">${fpaProfilSvg(a.schenkel)}</div></div>
${karten||'<div class="empty">Noch kein Schenkel. „＋ Schenkel hinzufügen“ oder im Register „Skizze → Profil“ eine Skizze erkennen lassen.</div>'}
<div class="bar" id="fpa_plusReihe">
<button type="button" class="blue" id="fpa_plus" style="flex:1 1 180px;min-height:48px">＋ Schenkel hinzufügen</button>
<span class="small">${a.schenkel.length} von höchstens ${esc((typeof FP_MAX_SCHENKEL==="number")?FP_MAX_SCHENKEL:24)} Schenkeln</span>
</div>`;
}
function fpaZeichnungHtml(){
 const a=fpA;
 const ansOpt=[["keiner","kein Pfeil"],["links","von links"],["oben","von oben"],
               ["rechts","von rechts"],["unten","von unten"]].map(([w,t])=>
  `<option value="${w}"${a.ansicht===w?" selected":""}>${esc(t)}</option>`).join("");
 if(!a.schenkel.length)return `<div class="small">Noch kein Schenkel – bitte zuerst das Profil erfassen.</div>`;
 return `<div id="fpa_profilGross" class="eb-diagram-box">${fpaProfilSvg(a.schenkel)}</div>
<div class="grid" style="margin-top:10px">
${fpaFeld("Ansichtspfeil",`<select id="fpa_ansicht2">${ansOpt}</select>`)}
</div>
<div class="scroll" style="margin-top:8px"><table class="eb-table fpa-tab">
<thead><tr><th>Nr.</th><th>Länge (mm)</th><th>Winkel (°)</th><th>Art</th></tr></thead>
<tbody>${a.schenkel.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(fpaMm(s.laenge))}</td>
<td>${esc(fpaMm(s.winkel))}</td><td>${fpaIstUmschlag(s)?"Umschlag":(i&&fpaZahl(s.winkel)!==0?"Biegung":"gerade")}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:6px">${a.schenkel.length} Schenkel · ${fpaBiegungen()} Biegung(en)${fpaUmschlaege()?" · davon "+fpaUmschlaege()+" Umschlag/Umschläge":""}.</div>`;
}
function fpaSkizzeHtml(){
 return `<div class="info">Skizze oder Foto → Erkennung → <b>Vorschau</b> → bestätigen. Erst „Übernehmen“
ersetzt das Profil. Die Längen aus einer Handskizze sind grobe Schätzwerte ohne Massstab –
sie sind danach von Hand zu prüfen.</div>`;
}
function fpaSegmenteHtml(){
 fpaMasseFuellen();
 const konisch=fpaKonisch();
 const segs=(fpA.segmente||[]).map((seg,i)=>{
  const massen=fpaSegmentMassen(seg);
  const ab=fpaAbwicklungSegment(seg);
  const zeilen=fpA.schenkel.map((s,j)=>{
   const m=massen[j]||{};
   return konisch
    ? `<tr><td>${j+1}</td>
<td><input data-fpa-seg-links="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.links||0)}"></td>
<td style="text-align:center"><button type="button" class="gray" data-fpa-seg-rechts-von-links="${i}_${j}" title="Mass nach rechts übernehmen" style="padding:6px 9px">→</button></td>
<td><input data-fpa-seg-rechts="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.rechts||0)}"></td></tr>`
    : `<tr><td>${j+1}</td><td><input data-fpa-seg-mass="${i}_${j}" type="number" inputmode="numeric" step="1" value="${esc(m.mass||0)}"></td></tr>`;
  }).join("");
  return `<div class="ra-zeile">
<div class="ra-zeile-kopf"><b>Segment ${i+1}</b>
<span class="small">Zuschnitt ${esc(fpaMm(seg.laenge||0))}&nbsp;mm × ${esc(fpaMm(Math.max(ab.links,ab.rechts)))}&nbsp;mm${konisch?" (konisch "+esc(fpaMm(ab.links))+" / "+esc(fpaMm(ab.rechts))+" mm)":""} · Fläche ${esc(fpaFlaecheSegmentM2(seg).toFixed(2).replace(".",","))} m²</span>
<button type="button" class="red ra-weg" data-fpa-seg-weg="${i}" title="Segment löschen">✕</button></div>
<div class="grid">
${fpaFeld("Länge (mm)",`<input data-fpa-seg-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(seg.laenge||0)}">`)}
</div>
<div class="scroll"><table class="eb-table fpa-tab">
<thead><tr><th>Schenkel</th><th>${konisch?"Mass links (mm)":"Mass (mm)"}</th>${konisch?"<th></th><th>Mass rechts (mm)</th>":""}</tr></thead>
<tbody>${zeilen||`<tr><td colspan="${konisch?4:2}" class="small">Noch kein Schenkel im Profil.</td></tr>`}</tbody></table></div>
<div class="bar">
<button type="button" class="gray" data-fpa-seg-uebernehmen="${i}">↩️ Masse aus Profil übernehmen</button>
${konisch?`<button type="button" class="gray" data-fpa-seg-alle-rechts="${i}">➡️ Alle nach rechts</button>`:""}
</div></div>`;
 }).join("");
 return `<div class="bar"><button type="button" class="gray" id="fpa_segPlus">＋ Segment hinzufügen</button></div>
<div class="info">Ein Segment ist ein Stück des Profils mit eigener Länge. Die Masse je Schenkel sind
mit den Profillängen vorbelegt und lassen sich einzeln überschreiben${konisch?" – links und rechts getrennt, weil das Profil konisch ist":""}.</div>
${segs||'<div class="empty">Noch kein Segment.</div>'}`;
}
// Eigenes Register, damit das Ausmass in allen Arten an derselben Stelle
// steht. Der Inhalt ist unveraendert der aus "Segmente und Ausmass".
function fpaAusmassHtml(){
 const z=fpaAusmassZeilen();
 const mat=findMeasurementMaterial(fpA.material);
 if(!z.length)return `<div class="small">Noch nichts zu messen – bitte zuerst Schenkel und mindestens ein Segment erfassen.</div>`;
 return `<div class="scroll"><table class="eb-table fpa-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:8px">Material: <b>${esc(mat?mat.name:"–")}</b> ·
Blechfläche <b>${esc(fpaFlaecheM2().toFixed(2).replace(".",","))} m²</b>.
Alles entsteht aus dieser Aufnahme – keine zweite Eingabe, keine Artikelnummern und keine Preise.</div>`;
}
// Der Plan wird in die gemeinsame Form gebracht (js/33) und dort dargestellt -
// damit sieht der Zuschnitt in allen Massaufnahme-Arten gleich aus. Der eine
// Unterschied zu den uebrigen Arten: hier hat JEDES Segment seine eigene
// Abwicklung, es kann also mehrere Streifenbreiten geben.
function fpaZuschnittPlan(){
 const p=fpaRollenPlan();
 const breiten=fpaRollen();
 // "Streifen je Tafel" ist nur bei EINER Streifenbreite eine einzelne Zahl.
 const moeglich=(p.moeglich||[]).map(m=>({breite:m.breite,
   jeTafel:(m.zeilen&&m.zeilen.length===1)?m.zeilen[0].jeTafel:undefined,
   streifen:(m.zeilen||[]).reduce((s,z)=>s+z.jeAbschnitt,0),
   rollenLaenge:m.rollenLaenge,
   zeilen:(m.zeilen||[]).map(z=>({breite:z.breite,jeTafel:z.jeTafel,jeAbschnitt:z.jeAbschnitt,
     abschnitte:z.abschnitte,abschnittLaenge:z.abschnittLaenge,rollenLaenge:z.rollenLaenge})),
   flaeche:m.flaeche, verschnitt:m.verschnitt, anteil:m.anteil}));
 const zusatz="Segmente mit gleicher Streifenbreite werden zusammen gepackt."
  +(fpaKonisch()?" Konisch: die Streifenbreite ist die grössere der beiden Abwicklungen – der Zuschnitt muss das breitere Ende enthalten.":"");
 return {art:"rolle", einheit:"Segment",
  einleitung:ZU_EINLEITUNG_ROLLE, zusatz,
  quelle:ZU_QUELLE_ROLLE+(breiten.length?" Hinterlegt: "+esc(breiten.join(", "))+" mm.":""),
  leer:"Noch nichts zuzuschneiden – es braucht mindestens ein Segment mit Länge und Massen (Register 5).",
  streifenbreiten:(p.gruppen||[]).map(g=>g.breite),
  gruppen:p.gruppen||[], moeglich, netto:p.netto,
  zuSchmal:p.zuSchmal, zuLang:[], optimal:p.optimal!==false,
  ohne:p.ohne||[]};
}
function fpaZuschnittHtml(){
 const kasten=zuRollenAuswahlHtml(fpA.rollenAuswahl,"data-fpa-rolle");
 const p=fpaZuschnittPlan();
 // Segmente ohne Laenge oder ohne Masse werden nicht stillschweigend
 // mitgerechnet, sondern mit ihrer Nummer genannt.
 const ohne=p.ohne.length?`<div class="ra-warnung">${p.ohne.length} Segment(e) ohne Länge oder ohne
Masse werden nicht gerechnet: Nummer ${esc(p.ohne.map(x=>x.nr).join(", "))}.</div>`:"";
 return kasten+zuschnittHtml(p)+ohne;
}
function fpaKontrolleHtml(){
 const m=fpaPruefungen();
 const a=fpA;
 const uebersicht=`<div class="scroll"><table class="eb-table fpa-tab"><tbody>
<tr><td>Material</td><td>${esc((findMeasurementMaterial(a.material)||{}).name||"–")}</td></tr>
<tr><td>Konisch</td><td>${fpaKonisch()?"Ja":"Nein"}</td></tr>
<tr><td>Schenkel</td><td>${a.schenkel.length}</td></tr>
<tr><td>Segmente</td><td>${(a.segmente||[]).length}</td></tr>
<tr><td>Laufmeter</td><td>${esc(fpaMeter(fpaLaufmeter()))} m</td></tr>
<tr><td>Blechfläche</td><td>${esc(fpaFlaecheM2().toFixed(2).replace(".",","))} m²</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit. Alles, was zum
Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>
<div class="eb-diagram-box" style="margin-top:10px">${fpaProfilSvg(a.schenkel)}</div>`;
}

// ---- Register --------------------------------------------------------------
function fpaSetzeSchritt(n){
 fpaSchritt=Math.max(1,Math.min(FPA_REGISTER.length,Number(n)||1));
 renderFreiesProfilAufnahme();
 const kopf=$("fpa_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function fpaRegisterHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt.
 const pr=fpaPruefungen();
 const fehler=pr.filter(m=>m.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="fpa_register">`+FPA_REGISTER.map(r=>{
  const marke=r.nr===FPA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===fpaSchritt?" aktiv":""}" data-fpa-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function fpaSchrittInhalt(){
 if(fpaSchritt===1)return fpaKarte("1 · Grunddaten",fpaGrunddatenHtml());
 if(fpaSchritt===2)return fpaKarte("2 · Profil aufnehmen",fpaProfilHtml());
 if(fpaSchritt===3)return fpaKarte("3 · Profilzeichnung",fpaZeichnungHtml());
 if(fpaSchritt===4)return fpaKarte("4 · Skizze → Profil",fpaSkizzeHtml());
 if(fpaSchritt===5)return fpaKarte("5 · Segmente",fpaSegmenteHtml());
 if(fpaSchritt===6)return fpaKarte("6 · Zuschnitt aus Rollenblech",fpaZuschnittHtml());
 if(fpaSchritt===7)return fpaKarte("7 · Ausmass und Material",fpaAusmassHtml());
 return fpaKarte("8 · Kontrolle",fpaKontrolleHtml());
}
// Der Erkennungs-Block aus dem HTML gehört in Register 4, darf aber NICHT in
// einen Container, der per innerHTML neu geschrieben wird: js/14 hat seine
// Klick-Handler beim Laden an die Knöpfe gehängt, und ein Neuschreiben würde
// sie samt Element vernichten. Deshalb ein festes Gerüst aus drei Teilen.
function fpaGeruest(){
 const ziel=$("freiesProfilAufnahme");
 if(!ziel||$("fpa_kopf"))return;
 const box=$("fpaSkizzeBox");
 ziel.innerHTML='<div id="fpa_kopf"></div><div id="fpa_fuss"></div>';
 if(box)ziel.insertBefore(box,$("fpa_fuss"));
}
function fpaSkizzeBoxZeigen(){
 const box=$("fpaSkizzeBox"); if(!box)return;
 box.hidden=fpaSchritt!==4;
}
function renderFreiesProfilAufnahme(){
 const ziel=$("freiesProfilAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zurücksetzen/Füllen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen.
 fpaVerdrahten();
 fpaGeruest();
 fpaBruecke();
 $("fpa_kopf").innerHTML=fpaRegisterHtml()+fpaSchrittInhalt();
 $("fpa_fuss").innerHTML=`<div class="bar ra-blaettern">
<button type="button" class="gray" id="fpa_zurueck"${fpaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="fpa_weiter">${
 fpaSchritt>=FPA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(FPA_REGISTER[fpaSchritt].kurz)}</button>
</div>`;
 fpaSkizzeBoxZeigen();
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("fpa_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function fpaLive(){
 fpaBruecke();
 const bild=$("fpa_profilBild"); if(bild)bild.innerHTML=fpaProfilSvg(fpA.schenkel);
 const gross=$("fpa_profilGross"); if(gross)gross.innerHTML=fpaProfilSvg(fpA.schenkel);
 const kopf=$("fpa_profil")&&$("fpa_profil").querySelector(".ra-zeichnung-kopf span:last-child");
 if(kopf)kopf.textContent=fpA.schenkel.length+" Schenkel";
 (fpA.schenkel||[]).forEach((s,i)=>{
  const z=document.querySelector('[data-fpa-zeile="'+i+'"] .small');
  if(z)z.textContent=fpaMm(s.laenge)+" mm · "+fpaMm(s.winkel)+"°"
   +(fpaIstUmschlag(s)?" · Umschlag":"")+(i===0?" · Startschenkel":"");
 });
}
function fpaNeuerSchenkel(){
 const grenze=(typeof FP_MAX_SCHENKEL==="number")?FP_MAX_SCHENKEL:24;
 if(fpA.schenkel.length>=grenze){
  alert("Höchstens "+grenze+" Schenkel – das ist die Grenze der bestehenden Prüfung.");
  return;
 }
 fpA.schenkel.push({laenge:0,winkel:0});
 renderFreiesProfilAufnahme();
}
function fpaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}

function fpaVerdrahten(){
 const wurzel=$("measTypeFreiesProfil");
 if(!wurzel||wurzel.dataset.fpaVerdrahtet)return;
 wurzel.dataset.fpaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=fpA;
  if(d.fpaLaenge!==undefined){
   const i=Number(d.fpaLaenge), s=a.schenkel[i]; if(!s)return;
   const alt=fpaZahl(s.laenge), neu=fpaZahl(t.value);
   s.laenge=neu;
   // Dieselbe Regel wie in js/14: das Mass wandert ins Segment mit, solange
   // dort noch nichts oder noch der alte Wert steht.
   const konisch=fpaKonisch(), feld=konisch?"links":"mass";
   (a.segmente||[]).forEach(seg=>{
    if(!Array.isArray(seg.massen))seg.massen=[];
    if(!seg.massen[i])seg.massen[i]={mass:0,links:0,rechts:0};
    const jetzt=fpaZahl(seg.massen[i][feld]);
    if(jetzt===0||jetzt===alt)seg.massen[i][feld]=neu;
   });
  }
  else if(d.fpaWinkel!==undefined){
   const s=a.schenkel[Number(d.fpaWinkel)]; if(s)s.winkel=fpaZahl(t.value);
  }
  else if(d.fpaSegLaenge!==undefined){
   const seg=a.segmente[Number(d.fpaSegLaenge)]; if(seg)seg.laenge=fpaZahl(t.value);
   return;
  }
  else if(d.fpaSegMass!==undefined||d.fpaSegLinks!==undefined||d.fpaSegRechts!==undefined){
   const key=d.fpaSegMass??d.fpaSegLinks??d.fpaSegRechts;
   const [si,sj]=String(key).split("_").map(Number);
   const seg=a.segmente[si]; if(!seg)return;
   if(!Array.isArray(seg.massen))seg.massen=[];
   if(!seg.massen[sj])seg.massen[sj]={mass:0,links:0,rechts:0};
   if(d.fpaSegMass!==undefined)seg.massen[sj].mass=fpaZahl(t.value);
   else if(d.fpaSegLinks!==undefined)seg.massen[sj].links=fpaZahl(t.value);
   else seg.massen[sj].rechts=fpaZahl(t.value);
   return;
  }
  else return;
  fpaLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, a=fpA;
  // Rollenauswahl fuer DIESE Massaufnahme (gemeinsamer Kasten, js/33)
  {const w=zuRollenKlick(e.target,"data-fpa-rolle");
   if(w!==null){fpA.rollenAuswahl=w; renderFreiesProfilAufnahme(); return}}
  if(t.id==="fpa_material"){a.material=t.value; renderFreiesProfilAufnahme(); return}
  if(t.id==="fpa_konisch"){a.konisch=t.value; renderFreiesProfilAufnahme(); return}
  if(t.id==="fpa_ansicht"||t.id==="fpa_ansicht2"){a.ansicht=t.value; renderFreiesProfilAufnahme(); return}
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target.closest("button"); if(!t)return;
  const d=t.dataset||{}, a=fpA;
  // Die Skizzen-Übernahme in js/14 ERSETZT fpSchenkel durch ein neues Array.
  // Hier abholen, wo es passiert - der Handler von js/14 lief durch das
  // Blubbern bereits vorher.
  if(t.id==="fp_sketchUebernehmen"||t.id==="fp_sketchVerwerfen"){
   if(Array.isArray(fpSchenkel)&&fpSchenkel!==a.schenkel)a.schenkel=fpSchenkel;
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaSchritt!==undefined){fpaSetzeSchritt(d.fpaSchritt);return}
  if(t.id==="fpa_zurueck"){if(fpaSchritt>1)fpaSetzeSchritt(fpaSchritt-1);return}
  if(t.id==="fpa_weiter"){
   if(fpaSchritt<FPA_REGISTER.length)fpaSetzeSchritt(fpaSchritt+1);
   else fpaAbschluss();
   return;
  }
  if(t.id==="fpa_plus"){fpaNeuerSchenkel();return}
  if(t.id==="fpa_segPlus"){
   a.segmente.push({laenge:0,massen:a.schenkel.map(s=>({mass:fpaZahl(s.laenge),links:fpaZahl(s.laenge),rechts:0}))});
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaWeg!==undefined){a.schenkel.splice(Number(d.fpaWeg),1);renderFreiesProfilAufnahme();return}
  if(d.fpaFlip!==undefined){
   const s=a.schenkel[Number(d.fpaFlip)]; if(s)s.winkel=-fpaZahl(s.winkel);
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaUmschlag!==undefined){
   const s=a.schenkel[Number(d.fpaUmschlag)]; if(s)s.winkel=fpaIstUmschlag(s)?0:180;
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaHoch!==undefined){
   const i=Number(d.fpaHoch);
   if(i>0){const x=a.schenkel[i];a.schenkel[i]=a.schenkel[i-1];a.schenkel[i-1]=x}
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaRunter!==undefined){
   const i=Number(d.fpaRunter);
   if(i<a.schenkel.length-1){const x=a.schenkel[i];a.schenkel[i]=a.schenkel[i+1];a.schenkel[i+1]=x}
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaSegWeg!==undefined){a.segmente.splice(Number(d.fpaSegWeg),1);renderFreiesProfilAufnahme();return}
  if(d.fpaSegUebernehmen!==undefined){
   const seg=a.segmente[Number(d.fpaSegUebernehmen)]; if(!seg)return;
   const konisch=fpaKonisch();
   seg.massen=a.schenkel.map((s,j)=>{
    const laenge=fpaZahl(s.laenge), bisher=(seg.massen&&seg.massen[j])||{};
    return {mass:konisch?fpaZahl(bisher.mass):laenge,
            links:konisch?laenge:fpaZahl(bisher.links),
            rechts:fpaZahl(bisher.rechts)};
   });
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaSegRechtsVonLinks!==undefined){
   const [si,sj]=String(d.fpaSegRechtsVonLinks).split("_").map(Number);
   const seg=a.segmente[si];
   if(seg&&seg.massen&&seg.massen[sj])seg.massen[sj].rechts=fpaZahl(seg.massen[sj].links);
   renderFreiesProfilAufnahme(); return;
  }
  if(d.fpaSegAlleRechts!==undefined){
   const seg=a.segmente[Number(d.fpaSegAlleRechts)];
   if(seg)(seg.massen||[]).forEach(m=>{m.rechts=fpaZahl(m.links)});
   renderFreiesProfilAufnahme(); return;
  }
 });
}

// ---- Laden und Zurücksetzen ------------------------------------------------
function fpaAusData(d){
 const a=fpaLeer();
 if(!d)return a;
 a.material=d.material??"";
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v2.85), bleibt es leer = ganzes Lager.
 const rq=(d.zuschnitt&&d.zuschnitt.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 a.konisch=d.konisch?"ja":"nein";
 a.ansicht=d.ansicht||"keiner";
 a.schenkel=Array.isArray(d.schenkel)?d.schenkel.map(s=>({...s})):[];
 a.segmente=Array.isArray(d.segmente)
  ?d.segmente.map(s=>({...s,massen:(s.massen||[]).map(m=>({...m}))})):[];
 return a;
}
function fpaZuruecksetzen(){
 fpA=fpaLeer(); fpaSchritt=1;
 fpSchenkel=fpA.schenkel; fpSegmente=fpA.segmente;
 fpaVerdrahten(); renderFreiesProfilAufnahme();
}
function fpaFuellen(d){
 fpA=fpaAusData(d); fpaSchritt=1;
 fpSchenkel=fpA.schenkel; fpSegmente=fpA.segmente;
 fpaVerdrahten(); renderFreiesProfilAufnahme();
}

// ---- Zusatzfelder für den Speicher-Payload ---------------------------------
// js/16 schreibt weiterhin genau dieselben fünf Felder wie bisher und hängt
// nur diese hier an. Die Ergebnisse werden mitgespeichert, damit ein später
// gedrucktes Blatt gleich bleibt, auch wenn Einstellungen sich ändern.
function fpaZusatzDaten(){
 const plan=fpaRollenPlan();
 return {
  flaeche_m2:Number(fpaFlaecheM2().toFixed(3)),
  ausmass:fpaAusmassZeilen(),
  zuschnitt:{auswahl:(fpA.rollenAuswahl||[]).slice(),breiten:fpaRollen(),
             netto:Number(plan.netto.toFixed(3)),
             bestes:plan.bestes||null,
             moeglich:plan.moeglich||[],
             gruppen:plan.gruppen.map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
               abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
               streifen:(g.streifen||[]).map(s=>({stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,merkmal:x.merkmal||""})),rest:s.rest}))})),
             optimal:plan.optimal!==false}
 };
}
