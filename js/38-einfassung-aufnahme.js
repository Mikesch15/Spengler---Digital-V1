"use strict";
// ============================================================
// Einfassung Rund · Aufnahme in sechs Registern (v2.96)
//
// Neuntes Modul nach demselben Muster wie Rinne Halbrund (v2.71),
// Einlaufblech gerade (v2.74) und konisch (v2.76), Freies Profil (v2.77),
// Mauerabdeckung (v2.79), Kehle (v2.83), Lukarne (v2.87) und
// Kamineinfassung (v2.90):
//
//   1 Grunddaten · 2 Einfassungen · 3 Stückliste ·
//   4 Zuschnitt · 5 Ausmass · 6 Kontrolle
//
// Die FACHRECHNUNG bleibt js/21-einfassung-rund.js - unveraendert.
// einfBerechnen() und einfZeichnung() sind zustandslos (sie nehmen ein
// Eingabeobjekt), deshalb kann jede Einfassung der Liste einzeln damit
// gerechnet werden. Es gibt KEINEN Nachbau: der Pruefstand vergleicht
// das Ergebnis Zeichen fuer Zeichen mit dem direkten Aufruf.
//
// Die alten Formularfelder stehen weiterhin unsichtbar als #einfStummel
// im HTML - js/21 haengt beim Laden Handler an sie. Gleiches Vorgehen wie
// #rinneStummel, #ebStummel, #ebkStummel, #fpStummel, #madStummel,
// #kehleStummel, #lukStummel und #kamStummel.
//
// Neu gegenueber dem alten Formular:
//   * mehrere Einfassungen je Massaufnahme, je mit eigenen Massen und
//     einer Stueckzahl (auf einem Dach stehen selten nur ein Rohr)
//   * Zuschnitt aus Rollenblech ueber die GEMEINSAMEN Bausteine
//     (ebaPackeInStreifen aus js/29, zuschnittHtml/zuDruckHtml aus js/33)
//   * Ausmass und Materialuebersicht ohne zweite Eingabe
//   * Kontrolle mit Marke am Register
// ============================================================

const EINFA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Einfassungen"},{nr:3,kurz:"Stückliste"},
 {nr:4,kurz:"Zuschnitt"},{nr:5,kurz:"Ausmass"},{nr:6,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const EINFA_KONTROLLE=EINFA_REGISTER.length;
let einfaSchritt=1;

const einfaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const einfaMm=v=>Math.round(einfaZahl(v)).toLocaleString("de-CH");
const einfaQm=v=>einfaZahl(v).toFixed(2).replace(".",",");

// ---- Winkel: eingegeben wird der Innenwinkel Dach/Rohr ---------------------
// Abgegriffen wird am Bau der Winkel ZWISCHEN Dachfläche und Rohr, auf der
// Talseite - dort setzt der Spengler den Winkelmesser an. Das Rohr steht im
// Lot, die Dachfläche fällt talwärts weg, deshalb ist dieser Winkel immer
// ÜBER 90°:
//
//     Innenwinkel = 90 + Dachneigung        (25°-Dach  ->  115°)
//     Dachneigung = Innenwinkel - 90
//
// Gleiche Umstellung wie bei der Kamineinfassung in v2.95 (CLAUDE.md 99).
//
// Gerechnet UND GESPEICHERT wird weiterhin die Dachneigung: einfProfil() in
// js/21 dreht die Dachschräge damit, und data.winkel behält dadurch exakt die
// Bedeutung, die es seit jeher hat. Ein Datensatz bis v2.96 öffnet deshalb
// ohne jede Umrechnung; umgerechnet wird nur für die Anzeige und den Ausdruck.
const EINFA_WINKEL_VERSATZ=90;
const einfaLeerWert=v=>v===""||v===null||v===undefined;
function einfaWinkelAnzeige(intern){
 return einfaLeerWert(intern)?"":einfaZahl(intern)+EINFA_WINKEL_VERSATZ;
}
function einfaWinkelIntern(anzeige){
 return einfaLeerWert(anzeige)?"":einfaZahl(anzeige)-EINFA_WINKEL_VERSATZ;
}

function einfaNeue(){
 const v=(typeof einfVorgabe==="function")?einfVorgabe():{durchmesser:110,winkel:30,a:60,b:60,c:100};
 return {bez:"",durchmesser:v.durchmesser,winkel:v.winkel,a:v.a,b:v.b,c:v.c,anzahl:1};
}
function einfaLeer(){
 const s=(typeof einfassungSettings==="object"&&einfassungSettings)
   ||(typeof EINFASSUNG_STANDARD==="object"?EINFASSUNG_STANDARD:{deckung:"biber_einfach",lattenabstand:330});
 return {
  material:"", deckung:s.deckung, lattenabstand:s.lattenabstand,
  einfassungen:[einfaNeue()], aktiv:0, rollenAuswahl:[]
 };
}
let einfA=einfaLeer();

// ---- Brücke zur Fachrechnung (js/21) --------------------------------------
// Jede Einfassung wird einzeln durch die bestehende Rechnung geschickt. Die
// Deckungsart und der Lattenabstand gelten fuer die ganze Aufnahme.
function einfaEingabe(e,quelle){
 const q=quelle||einfA;
 return {deckung:q.deckung,
   durchmesser:einfaZahl(e&&e.durchmesser), winkel:einfaZahl(e&&e.winkel),
   a:einfaZahl(e&&e.a), b:einfaZahl(e&&e.b), c:einfaZahl(e&&e.c),
   lattenabstand:einfaZahl(q.lattenabstand)};
}
function einfaBerechne(e,quelle){
 if(typeof einfBerechnen!=="function")return null;
 return einfBerechnen(einfaEingabe(e,quelle));
}
function einfaListe(quelle){
 const q=quelle||einfA;
 const l=q&&Array.isArray(q.einfassungen)?q.einfassungen:[];
 return l.length?l:[];
}
function einfaAnzahl(e){
 const n=Math.round(einfaZahl(e&&e.anzahl));
 return n>0?n:1;
}

// ---- Zuschnitte -----------------------------------------------------------
// Eine Einfassung ist EIN Zuschnitt: Laenge = Breite der gesamten Einfassung,
// Breite = Abwicklung des Querschnitts (so steht es seit v2.84 auch im PDF).
// Die Stueckzahl vervielfacht ihn - zwei gleiche Rohre ergeben zwei gleiche
// Zuschnitte und in der Liste eine Zeile mit "2 x".
function einfaZuschnitte(quelle){
 const q=quelle||einfA;
 const z=[];
 einfaListe(q).forEach((e,i)=>{
  const erg=einfaBerechne(e,q);
  if(!erg)return;
  const n=einfaAnzahl(e);
  const bez=(e.bez||"").trim();
  for(let k=0;k<n;k++)
   z.push({nr:z.length+1, name:"Einfassung "+(i+1),
     laenge:Math.round(einfaZahl(erg.breiteGesamt)),
     breite:Math.round(einfaZahl(erg.abwicklung)),
     durchmesser:einfaZahl(e.durchmesser),
     bleilappen:erg.anzahlBleilappen,
     // merkmal trennt die Gruppen in der Zuschnittliste (js/33). Zwei
     // Einfassungen mit gleicher Laenge UND gleicher Abwicklung sind
     // derselbe Zuschnitt und gehoeren in eine Zeile - der Durchmesser
     // steckt bereits in der Laenge. Die Bezeichnung ist eine reine
     // Beschriftung und darf die Gruppe nicht zerlegen.
     merkmal:"", hinweis:bez||("Ø "+einfaMm(e.durchmesser))});
 });
 return z;
}
function einfaFlaecheM2(quelle){
 return einfaZuschnitte(quelle).reduce((s,x)=>s+(x.laenge*x.breite)/1e6,0);
}
function einfaBleilappenGesamt(quelle){
 const q=quelle||einfA;
 let summe=0, offen=false;
 einfaListe(q).forEach(e=>{
  const erg=einfaBerechne(e,q);
  if(!erg||erg.anzahlBleilappen===null||erg.anzahlBleilappen===undefined){offen=true;return}
  summe+=erg.anzahlBleilappen*einfaAnzahl(e);
 });
 return offen?null:summe;
}

// ---- Rollenblech ----------------------------------------------------------
// Gerechnet wird mit der EINEN Packrechnung der App (ebaPackeInStreifen aus
// js/29) und dargestellt mit der EINEN Darstellung (zuschnittHtml aus js/33).
// Der Aufbau ist Zeichen fuer Zeichen derselbe wie bei Kamineinfassung,
// Lukarne und Freiem Profil: Einfassungen mit gleicher Abwicklung bilden eine
// Streifenbreite, ein Abschnitt ist so lang wie das laengste Stueck dieser
// Breite, und erst die Rollenbreite entscheidet, wie viele Abschnitte noetig
// sind.
function einfaBleche(quelle){
 return einfaZuschnitte(quelle).filter(x=>x.laenge>0&&x.breite>0);
}
function einfaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(einfA&&einfA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
function einfaRollenPlan(){
 const bleche=einfaBleche();
 const breiten=einfaRollenbreiten();
 const netto=einfaFlaecheM2();
 if(!bleche.length||!breiten.length)
  return {gruppen:[],moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 const nach=new Map();
 bleche.forEach(x=>{
  if(!nach.has(x.breite))nach.set(x.breite,[]);
  nach.get(x.breite).push(x);
 });
 let optimal=true;
 const gruppen=Array.from(nach.keys()).sort((a,b)=>b-a).map(B=>{
  const liste=nach.get(B);
  const L=Math.max.apply(null,liste.map(x=>x.laenge));
  const v=ebaPackeInStreifen(liste,L);
  if(v.optimal===false)optimal=false;
  return {breite:B,stuecke:liste,abschnittLaenge:L,streifen:v.streifen||[]};
 });
 const moeglich=[], zuSchmal=[];
 breiten.forEach(R=>{
  const zeilen=[]; let flaeche=0, passt=true;
  gruppen.forEach(gr=>{
   const jeAbschnitt=Math.floor(R/gr.breite);
   if(jeAbschnitt<1){passt=false;return}
   const abschnitte=Math.ceil(gr.streifen.length/jeAbschnitt);
   const rollenLaenge=abschnitte*gr.abschnittLaenge;
   flaeche+=R*rollenLaenge/1e6;
   zeilen.push({breite:gr.breite,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,
     abschnittLaenge:gr.abschnittLaenge,rollenLaenge,
     streifen:gr.streifen.length,restBreite:R-jeAbschnitt*gr.breite});
  });
  if(!passt){zuSchmal.push(R);return}
  moeglich.push({breite:R,zeilen,flaeche,verschnitt:flaeche-netto,
    anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
    rollenLaenge:zeilen.reduce((s,x)=>s+x.rollenLaenge,0)});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 const best=moeglich[0]||null;
 const gefuellt=gruppen.map((g,i)=>Object.assign({},g,{
   jeAbschnitt:best?best.zeilen[i].jeAbschnitt:1,
   abschnitte:best?best.zeilen[i].abschnitte:0,
   rollenLaenge:best?best.zeilen[i].rollenLaenge:0}));
 return {gruppen:gefuellt,moeglich,zuSchmal,bestes:best,netto,optimal};
}
function einfaZuschnittPlan(){
 const rp=einfaRollenPlan();
 return {art:"rolle", einheit:"Einfassung",
  einleitung:(typeof ZU_EINLEITUNG_ROLLE!=="undefined")?ZU_EINLEITUNG_ROLLE:"",
  quelle:(typeof ZU_QUELLE_ROLLE!=="undefined")?ZU_QUELLE_ROLLE:"",
  leer:!einfaBleche().length?"Noch nichts zuzuschneiden – bitte zuerst eine Einfassung erfassen."
      :(!einfaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
      :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."),
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, optimal:rp.optimal!==false};
}

// ---- Ausmass --------------------------------------------------------------
// Entsteht vollstaendig aus der Aufnahme - ohne zweite Eingabe, ohne
// Artikelnummern und ohne Preise (die Materialliste der Firma kommt spaeter).
function einfaAusmassZeilen(quelle){
 const q=quelle||einfA;
 const z=[], dazu=(bez,menge,einheit,herkunft)=>
   z.push({pos:z.length+1,bezeichnung:bez,menge:menge,einheit:einheit,herkunft:herkunft});
 const liste=einfaListe(q);
 if(!liste.length)return z;
 const stueck=einfaZuschnitte(q).length;
 if(stueck)dazu("Einfassungen rund",stueck,"Stk","Summe der Stückzahlen");
 liste.forEach((e,i)=>{
  const erg=einfaBerechne(e,q);
  if(!erg)return;
  const n=einfaAnzahl(e);
  const bez=(e.bez||"").trim()||("Ø "+einfaMm(e.durchmesser)+" mm");
  dazu("Einfassung "+(i+1)+" · "+bez,n,"Stk",
    "Zuschnitt "+einfaMm(erg.breiteGesamt)+" × "+einfaMm(erg.abwicklung)+" mm");
 });
 const fl=einfaFlaecheM2(q);
 if(fl>0)dazu("Blechfläche Zuschnitt",einfaQm(fl),"m²","Länge × Abwicklung");
 const bl=einfaBleilappenGesamt(q);
 if(bl!==null&&bl>0)dazu("Bleilappen",bl,"Stk","Umfang ÷ Lattenabstand, aufgerundet");
 return z;
}
function einfaMaterialTabelle(){
 const mat=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(einfA.material):null;
 const fl=einfaFlaecheM2();
 return `<table class="eb-table ra-tab"><thead><tr><th>Material</th><th>Blechfläche</th></tr></thead>
<tbody><tr><td>${esc(mat?mat.name:"– keine Auswahl –")}</td><td>${einfaQm(fl)} m²</td></tr></tbody></table>`;
}

// ---- Kontrolle ------------------------------------------------------------
function einfaPruefungen(){
 const q=einfA, m=[];
 if(!q.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 if(!q.deckung)m.push({art:"warnung",text:"Es ist noch keine Eindeckungsart gewählt."});
 if(!(einfaZahl(q.lattenabstand)>0))
  m.push({art:"warnung",text:"Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden."});
 const liste=einfaListe(q);
 if(!liste.length)m.push({art:"fehler",text:"Es ist noch keine Einfassung erfasst."});
 liste.forEach((e,i)=>{
  const nr="Einfassung "+(i+1)+": ";
  if(!(einfaZahl(e.durchmesser)>0))
   m.push({art:"fehler",text:nr+"Der Rohrdurchmesser fehlt."});
  if(!(einfaZahl(e.a)>0))
   m.push({art:"fehler",text:nr+"Mass a fehlt (vorne bis Mitte Rohr)."});
  if(!(einfaZahl(e.c)>0))
   m.push({art:"fehler",text:nr+"Mass c fehlt (Aufbug)."});
  // Der Winkel hat seine eigene Prüfung (er ist intern die Dachneigung und
  // wäre bei einer Eingabe unter 90° zwangsläufig negativ) - sonst käme zu
  // jedem falschen Winkel zusätzlich die nichtssagende Meldung "negativ".
  ["durchmesser","a","b","c"].forEach(k=>{
   if(einfaZahl(e[k])<0)m.push({art:"fehler",text:nr+"Ein Mass ist negativ."});
  });
  if(einfaLeerWert(e.winkel)){
   m.push({art:"fehler",text:nr+"Der Winkel zwischen Dachfläche und Rohr fehlt. "
     +"Er wird auf der Talseite gemessen und ist immer über 90° – auf einem 25°-Dach also 115°."});
  }else{
   const w=einfaWinkelAnzeige(e.winkel);
   if(w<90||w>=180)
    m.push({art:"fehler",text:nr+"Der Winkel zwischen Dachfläche und Rohr muss zwischen 90° "
      +"und 180° liegen – auf einem 25°-Dach sind es 115° (Dachneigung + 90°)."});
   else if(w===90)
    m.push({art:"warnung",text:nr+"90° bedeutet ein waagerechtes Dach ohne Neigung."});
  }
  if(einfaAnzahl(e)<1)
   m.push({art:"fehler",text:nr+"Die Stückzahl muss mindestens 1 sein."});
 });
 if(einfaBleche().length){
  if(!einfaRollenbreiten().length)
   m.push({art:"warnung",text:"Es ist keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet."});
  else if(!einfaRollenPlan().bestes)
   m.push({art:"fehler",text:"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."});
 }
 return m;
}

// ---- Anzeige --------------------------------------------------------------
// Der rote Stern wird NICHT hier geschrieben - markierePflichtfelder() aus
// js/01 haengt ihn zentral an jedes Feld mit data-pflicht (CLAUDE.md 78.8).
function einfaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function einfaKarte(titel,inhalt){
 return `<div class="card"><h2>${esc(titel)}</h2>${inhalt}</div>`;
}
function einfaZahlFeld(label,id,wert,schritt,pflicht){
 return einfaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${
   pflicht?' data-pflicht="1"':""} inputmode="${
   (schritt&&schritt!=="1")?"decimal":"numeric"}" value="${
   wert===""||wert===null||wert===undefined?"":esc(wert)}">`);
}
function einfaKennzahlenHtml(){
 const wert=(l,v)=>`<div><label>${esc(l)}</label><div class="ra-wert">${esc(v)}</div></div>`;
 const z=einfaZuschnitte();
 const bl=einfaBleilappenGesamt();
 const plan=einfaRollenPlan();
 return `<div class="grid ra-kennzahlen" id="einfa_kennzahlen">
${wert("Einfassungen",z.length+" Stk")}
${wert("Blechfläche",einfaQm(einfaFlaecheM2())+" m²")}
${wert("Anzahl Bleilappen",bl===null?"–":String(bl))}
${wert("Beste Rollenbreite",plan.bestes?einfaMm(plan.bestes.breite)+" mm":"–")}
</div>`;
}
function einfaGrunddatenHtml(){
 const a=einfA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat(((typeof measurementMaterials!=="undefined"&&measurementMaterials)||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const deckOpt=Object.keys((typeof EINF_DECKUNGEN==="object"?EINF_DECKUNGEN:{}))
  .map(k=>`<option value="${esc(k)}"${k===a.deckung?" selected":""}>${esc(EINF_DECKUNGEN[k].name)}</option>`).join("");
 return `<div class="info">Einfassung für ein rundes Standrohr (Dunstrohreinfassung).
Gezeichnet und bemessen wird nur der seitliche <b>Querschnitt</b> – der Umfang um das Rohr
wird nicht dargestellt. Die „Breite der gesamten Einfassung“ ist eine eigenständige Zahl aus
Rohrdurchmesser + 2× Umschlag + 2× Mass seitlich neben Rohr (beides aus den Einstellungen).
Deckmaterial und Lattenabstand werden für die Bleilappen gebraucht.</div>
<div class="grid">
${einfaFeld("Material",`<select id="einfa_material" data-pflicht="1">${matOpt}</select>`,true)}
${einfaFeld("Eindeckungsart",`<select id="einfa_deckung">${deckOpt}</select>`)}
${einfaZahlFeld("Lattenabstand, für Anzahl Bleilappen (mm)","einfa_lattenabstand",a.lattenabstand)}
</div>
<div class="bar" style="margin-top:8px">
<button type="button" class="gray" id="einfa_einstellungen">⚙️ Einstellungen</button>
</div>`;
}
function einfaEinfassungenHtml(){
 const a=einfA;
 const liste=einfaListe();
 const karten=liste.map((e,i)=>{
  const erg=einfaBerechne(e);
  const kopf=(e.bez||"").trim()||("Einfassung "+(i+1));
  return `<div class="card"${i===a.aktiv?' style="border-color:var(--blue)"':""}>
<h2>${esc(kopf)}<span class="small" style="float:right;font-weight:400;color:var(--muted)">${
   erg?einfaMm(erg.breiteGesamt)+" × "+einfaMm(erg.abwicklung)+" mm":"–"}</span></h2>
<div class="grid">
${einfaFeld("Bezeichnung",`<input id="einfa_bez_${i}" type="text" value="${esc(e.bez||"")}">`)}
${einfaZahlFeld("Ø Standrohr (mm)","einfa_durchmesser_"+i,e.durchmesser,"1",true)}
${einfaZahlFeld("Winkel Dach/Rohr (°)","einfa_winkel_"+i,einfaWinkelAnzeige(e.winkel),"0.1",true)}
${einfaZahlFeld("a · vorne bis Mitte Rohr (mm)","einfa_a_"+i,e.a,"1",true)}
${einfaZahlFeld("b · ab Mitte Rohr bis hinten (mm)","einfa_b_"+i,e.b)}
${einfaZahlFeld("c · Aufbug 90°, oben Umschlag 135° (mm)","einfa_c_"+i,e.c,"1",true)}
${einfaZahlFeld("Stückzahl","einfa_anzahl_"+i,e.anzahl)}
</div>
<div class="bar" style="margin-top:6px">
<button type="button" class="gray" data-einfa-zeichnen="${i}">📐 Schnitt zeigen</button>
<button type="button" class="gray" data-einfa-weg="${i}">🗑 Löschen</button>
</div></div>`;
 }).join("");
 const aktiv=liste[a.aktiv]||liste[0];
 return `<div class="info">Jede Einfassung bekommt ihre eigenen Masse. Sind mehrere Rohre
gleich, genügt eine Zeile mit der passenden <b>Stückzahl</b>. Der Schnitt zeigt die gerade
gewählte Einfassung.<br>
Der <b>Winkel Dach/Rohr</b> wird zwischen Dachfläche und Rohr auf der Talseite gemessen und ist
deshalb immer <b>über 90°</b> – auf einem 25°-Dach also 115° (Dachneigung + 90°).</div>
${karten||`<div class="ra-warnung">Noch keine Einfassung erfasst.</div>`}
<div class="bar" style="margin-top:8px">
<button type="button" class="gray" id="einfa_neu">＋ Einfassung hinzufügen</button>
</div>
<h2 style="margin-top:14px">Schnitt</h2>
<div id="einfa_zeichnung" class="eb-diagram-box eb-diagram-scroll" style="margin-top:8px">${
  aktiv&&typeof einfZeichnung==="function"?einfZeichnung(einfaEingabe(aktiv)):""}</div>
${einfaKennzahlenHtml()}`;
}
function einfaStuecklisteHtml(){
 const z=einfaZuschnitte();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu zeigen – bitte zuerst eine Einfassung erfassen.</div>`;
 const bl=einfaBleilappenGesamt();
 return `<div class="info">Ein Zuschnitt je Einfassung: <b>Länge</b> ist die Breite der
gesamten Einfassung, <b>Breite</b> die Abwicklung des Querschnitts.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Einfassung</th><th>Ø (mm)</th><th>Zuschnitt (Länge × Breite)</th><th>Bleilappen</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.nr}</td><td>${esc(x.name)}${x.hinweis?" · "+esc(x.hinweis):""}</td>
<td>${einfaMm(x.durchmesser)}</td>
<td><b>${(typeof zuMasse==="function")?zuMasse(x.laenge,x.breite):(einfaMm(x.laenge)+" mm × "+einfaMm(x.breite)+" mm")}</b></td>
<td>${x.bleilappen===null||x.bleilappen===undefined?"–":esc(x.bleilappen)}</td></tr>`).join("")}</tbody>
<tfoot><tr><td colspan="4">Bleilappen gesamt</td><td><b>${bl===null?"–":esc(bl)}</b></td></tr></tfoot>
</table></div>
${einfaKennzahlenHtml()}`;
}
function einfaZuschnittHtml(){
 const wahl=(typeof zuRollenAuswahlHtml==="function")
   ?zuRollenAuswahlHtml(einfA.rollenAuswahl,"data-einfa-rolle"):"";
 return wahl+((typeof zuschnittHtml==="function")?zuschnittHtml(einfaZuschnittPlan()):"");
}
function einfaAusmassHtml(){
 const z=einfaAusmassZeilen();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst eine Einfassung erfassen.</div>`;
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe. Ohne
Artikelnummern und ohne Preise – die Materialliste der Firma kommt später dazu.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td><b>${esc(x.menge)}</b></td><td>${esc(x.einheit)}</td>
<td class="small" style="color:var(--muted)">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<h2 style="margin-top:14px">Material</h2>
${einfaMaterialTabelle()}`;
}
function einfaKontrolleHtml(){
 const m=einfaPruefungen();
 const zeile=(l,v)=>`<tr><td>${esc(l)}</td><td><b>${v}</b></td></tr>`;
 const plan=einfaRollenPlan();
 const bl=einfaBleilappenGesamt();
 const mat=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(einfA.material):null;
 return `${m.length?m.map(x=>
   `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")
  :`<div class="ra-ok">Keine Auffälligkeit.</div>`}
<h2 style="margin-top:14px">Zusammenfassung</h2>
<table class="eb-table ra-tab"><tbody>
${zeile("Material",esc(mat?mat.name:"–"))}
${zeile("Eindeckungsart",esc(((typeof EINF_DECKUNGEN==="object"&&EINF_DECKUNGEN[einfA.deckung])||{}).name||"–"))}
${zeile("Einfassungen",einfaZuschnitte().length+" Stk")}
${zeile("Blechfläche",einfaQm(einfaFlaecheM2())+" m²")}
${zeile("Anzahl Bleilappen",bl===null?"–":String(bl))}
${zeile("Beste Rollenbreite",plan.bestes?einfaMm(plan.bestes.breite)+" mm":"–")}
</tbody></table>`;
}
function einfaRegisterHtml(){
 const m=einfaPruefungen();
 const fehler=m.filter(x=>x.art==="fehler").length;
 const warn=m.length-fehler;
 return `<div class="ra-register" id="einfa_register">`+EINFA_REGISTER.map(r=>{
  const marke=r.nr===EINFA_KONTROLLE&&m.length
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${
      fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===einfaSchritt?" aktiv":""}" data-einfa-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function renderEinfassungAufnahme(){
 const ziel=$("einfassungAufnahme");
 if(!ziel)return;
 // Verdrahten passiert HIER, nicht nur beim Zuruecksetzen/Fuellen:
 // showMeasTypeSection() zeichnet das Formular auch, ohne eines von beiden
 // aufzurufen - auf diesem Weg waere die Bedienung sichtbar, aber tot
 // (CLAUDE.md 79.6).
 einfaVerdrahten();
 const inhalt=[einfaGrunddatenHtml,einfaEinfassungenHtml,einfaStuecklisteHtml,
   einfaZuschnittHtml,einfaAusmassHtml,einfaKontrolleHtml][einfaSchritt-1];
 const r=EINFA_REGISTER[einfaSchritt-1]||EINFA_REGISTER[0];
 const weiter=einfaSchritt>=EINFA_REGISTER.length
   ?"Fertig › Fotos und Speichern"
   :"Weiter › "+EINFA_REGISTER[einfaSchritt].kurz;
 ziel.innerHTML=einfaRegisterHtml()
  +einfaKarte(r.nr+" · "+r.kurz,inhalt?inhalt():"")
  +`<div class="bar ra-blaettern">
<button type="button" class="gray" id="einfa_zurueck"${einfaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="einfa_weiter">${esc(weiter)}</button>
</div>`;
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 einfaRegisterSichtbar();
}
function einfaRegisterSichtbar(){
 const strip=$("einfa_register");
 if(!strip)return;
 const aktiv=strip.querySelector(".ra-register-knopf.aktiv");
 if(!aktiv)return;
 // Die Leiste scrollt seitwaerts - das aktive Register muss sichtbar bleiben.
 // Gemessen wird ueber die tatsaechlichen Rechtecke, NICHT ueber offsetLeft
 // (das bezieht sich auf den offsetParent, nicht auf die Leiste).
 const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
 if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
 else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
}
function einfaSetzeSchritt(n){
 einfaSchritt=Math.max(1,Math.min(EINFA_REGISTER.length,Number(n)||1));
 renderEinfassungAufnahme();
}
function einfaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus (CLAUDE.md 66).
function einfaLive(){
 const kenn=$("einfa_kennzahlen");
 if(kenn){
  const neu=document.createElement("div");
  neu.innerHTML=einfaKennzahlenHtml();
  const frisch=neu.firstElementChild;
  if(frisch)kenn.innerHTML=frisch.innerHTML;
 }
 const z=$("einfa_zeichnung");
 if(z){
  const aktiv=einfaListe()[einfA.aktiv]||einfaListe()[0];
  if(aktiv&&typeof einfZeichnung==="function")z.innerHTML=einfZeichnung(einfaEingabe(aktiv));
 }
 const m=einfaPruefungen();
 const fehler=m.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#einfa_register [data-einfa-schritt="'+EINFA_KONTROLLE+'"]');
 if(knopf){
  const alt=knopf.querySelector(".ra-register-punkt");
  if(alt)alt.remove();
  if(m.length){
   const s=document.createElement("span");
   s.className="ra-register-punkt"+(fehler?" fehler":"");
   knopf.appendChild(s);
  }
 }
}
// Zuordnung Eingabefeld -> Zustand. Die Felder der Liste tragen den Index.
const EINFA_FELDER={einfa_lattenabstand:"lattenabstand"};
const EINFA_LISTENFELDER=["bez","durchmesser","winkel","a","b","c","anzahl"];
function einfaFeldZuweisen(id,wert){
 if(EINFA_FELDER[id]!==undefined){einfA[EINFA_FELDER[id]]=wert;return true}
 const m=/^einfa_([a-zA-Z]+)_(\d+)$/.exec(id);
 if(m&&EINFA_LISTENFELDER.indexOf(m[1])>=0){
  const e=einfaListe()[Number(m[2])];
  if(!e)return false;
  // Der Winkel wird als Innenwinkel eingegeben, gerechnet und gespeichert
  // wird die Dachneigung - eine Stelle für input UND change.
  e[m[1]]=(m[1]==="winkel")?einfaWinkelIntern(wert):wert;
  return true;
 }
 return false;
}
function einfaVerdrahten(){
 const wurzel=$("measTypeEinfassungRund");
 if(!wurzel||wurzel.dataset.einfaVerdrahtet)return;
 wurzel.dataset.einfaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  if(!einfaFeldZuweisen(e.target.id,e.target.value))return;
  einfaLive();
 });
 wurzel.addEventListener("change",e=>{
  const t=e.target;
  {const w=(typeof zuRollenKlick==="function")?zuRollenKlick(t,"data-einfa-rolle"):null;
   if(w!==null){einfA.rollenAuswahl=w; renderEinfassungAufnahme(); return}}
  if(t.id==="einfa_material"){einfA.material=t.value; renderEinfassungAufnahme(); return}
  if(t.id==="einfa_deckung"){einfA.deckung=t.value; renderEinfassungAufnahme(); return}
  // Eine Zifferneingabe zeichnet auch beim Verlassen nicht neu.
  if(einfaFeldZuweisen(t.id,t.value)){einfaLive(); return}
 });
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-einfa-schritt]");
  if(reg){einfaSetzeSchritt(reg.dataset.einfaSchritt);return}
  const zeig=t.closest("[data-einfa-zeichnen]");
  if(zeig){einfA.aktiv=Number(zeig.dataset.einfaZeichnen)||0; renderEinfassungAufnahme(); return}
  const weg=t.closest("[data-einfa-weg]");
  if(weg){
   const i=Number(weg.dataset.einfaWeg);
   const liste=einfaListe();
   if(liste.length<=1){alert("Es muss mindestens eine Einfassung bleiben.");return}
   if(!confirm("Diese Einfassung wirklich löschen?"))return;
   liste.splice(i,1);
   if(einfA.aktiv>=liste.length)einfA.aktiv=liste.length-1;
   renderEinfassungAufnahme(); return;
  }
  if(t.id==="einfa_neu"){
   einfaListe().push(einfaNeue());
   einfA.aktiv=einfaListe().length-1;
   renderEinfassungAufnahme(); return;
  }
  if(t.id==="einfa_zurueck"){einfaSetzeSchritt(einfaSchritt-1);return}
  if(t.id==="einfa_weiter"){
   if(einfaSchritt>=EINFA_REGISTER.length)einfaAbschluss();
   else einfaSetzeSchritt(einfaSchritt+1);
   return;
  }
  if(t.id==="einfa_einstellungen"){
   const knopf=$("openEinfassungSettings");
   if(knopf)knopf.click();
   return;
  }
 });
}

// ---- Speichern / Laden ----------------------------------------------------
// Alles, was gerechnet wurde, wird mitgespeichert - ein spaeter gedrucktes PDF
// bleibt dadurch gleich, auch wenn eine Einstellung geaendert wird.
//
// SUPERSET: die Felder des alten Formulars (deckung, durchmesser, winkel, a,
// b, c, lattenabstand, material, abwicklung, breiteGesamt, anzahlBleilappen)
// werden weiterhin geschrieben - mit den Werten der ERSTEN Einfassung. Ein
// Datensatz bis v2.95 hat genau diese Felder und oeffnet unveraendert.
function einfaDaten(){
 const a=einfA;
 const liste=einfaListe();
 const erste=liste[0]||einfaNeue();
 const ergErste=einfaBerechne(erste)||{abwicklung:0,breiteGesamt:null,anzahlBleilappen:null};
 const plan=einfaRollenPlan();
 return {
  material:a.material, deckung:a.deckung, lattenabstand:einfaZahl(a.lattenabstand),
  // --- unveraendert wie bis v2.95 (erste Einfassung) ---
  durchmesser:einfaZahl(erste.durchmesser), winkel:einfaZahl(erste.winkel),
  a:einfaZahl(erste.a), b:einfaZahl(erste.b), c:einfaZahl(erste.c),
  abwicklung:ergErste.abwicklung,
  breiteGesamt:ergErste.breiteGesamt,
  anzahlBleilappen:ergErste.anzahlBleilappen,
  // --- neu ab v2.96 ---
  einfassungen:liste.map(e=>{
   const erg=einfaBerechne(e)||{};
   return {bez:e.bez||"", durchmesser:einfaZahl(e.durchmesser), winkel:einfaZahl(e.winkel),
     a:einfaZahl(e.a), b:einfaZahl(e.b), c:einfaZahl(e.c), anzahl:einfaAnzahl(e),
     abwicklung:einfaZahl(erg.abwicklung), breiteGesamt:erg.breiteGesamt===null?null:einfaZahl(erg.breiteGesamt),
     bleilappen:erg.anzahlBleilappen===null||erg.anzahlBleilappen===undefined?null:erg.anzahlBleilappen};
  }),
  zuschnitte:einfaZuschnitte(),
  bleilappenGesamt:einfaBleilappenGesamt(),
  flaeche_m2:Number(einfaFlaecheM2().toFixed(3)),
  ausmass:einfaAusmassZeilen(),
  rollen:{auswahl:(a.rollenAuswahl||[]).slice(),
    breiten:einfaRollenbreiten(),
    netto:Number((plan.netto||0).toFixed(3)),
    bestes:plan.bestes||null,
    moeglich:plan.moeglich||[],
    zuSchmal:plan.zuSchmal||[],
    gruppen:(plan.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
      abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
      streifen:(g.streifen||[]).map(s=>({
        stuecke:(s.stuecke||[]).map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
          merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
        rest:s.rest}))})),
    optimal:plan.optimal!==false}
 };
}
function einfaZuruecksetzen(){
 einfA=einfaLeer();
 einfaSchritt=1;
 renderEinfassungAufnahme();
}
function einfaFuellen(d){
 const w=d||{};
 const a=einfaLeer();
 a.material=w.material==null?"":w.material;
 if(w.deckung&&(typeof EINF_DECKUNGEN!=="object"||EINF_DECKUNGEN[w.deckung]))a.deckung=w.deckung;
 if(w.lattenabstand===0||w.lattenabstand)a.lattenabstand=w.lattenabstand;
 if(Array.isArray(w.einfassungen)&&w.einfassungen.length){
  a.einfassungen=w.einfassungen.map(e=>({
   bez:(e&&e.bez)||"", durchmesser:einfaZahl(e&&e.durchmesser), winkel:einfaZahl(e&&e.winkel),
   a:einfaZahl(e&&e.a), b:einfaZahl(e&&e.b), c:einfaZahl(e&&e.c),
   anzahl:Math.max(1,Math.round(einfaZahl(e&&e.anzahl)||1))}));
 }else if(w.durchmesser===0||w.durchmesser||w.a===0||w.a){
  // Datensatz bis v2.95: EINE Einfassung aus den flachen Feldern. Es wird
  // nichts erfunden - genommen wird genau, was dort steht.
  a.einfassungen=[{bez:"",durchmesser:einfaZahl(w.durchmesser),winkel:einfaZahl(w.winkel),
    a:einfaZahl(w.a),b:einfaZahl(w.b),c:einfaZahl(w.c),anzahl:1}];
 }
 a.aktiv=0;
 if(w.rollen&&Array.isArray(w.rollen.auswahl))a.rollenAuswahl=w.rollen.auswahl.slice();
 einfA=a;
 einfaSchritt=1;
 renderEinfassungAufnahme();
}
