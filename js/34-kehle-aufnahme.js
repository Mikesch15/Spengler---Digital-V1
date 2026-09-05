"use strict";
// ===========================================================================
// KEHLE · Aufnahme (Grunddaten, Winkel, Segmente, Zuschnitt, Ausmass)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallelloesung:
// js/25-kehle.js bleibt UNVERAENDERT und rechnet weiterhin alles Fachliche
// (die 35 Werte der Vorlage "Winkel zu Kehlen Lukarne MA", Spalte C). Diese
// Datei ist die Erfassung darueber.
//
// Die Bruecke sind die eigenen Felder des bestehenden Moduls: keaBruecke()
// setzt #kehle_nh/#kehle_nl/#kehle_gl aus dem erfassten Stand, danach liefern
// kehleEingabenAusFeldern(), kehleBerechnen() und renderKehleResult() aus
// js/25 direkt die richtigen Werte - sie werden hier NICHT nachgebaut. Die
// unsichtbaren Felder stehen in #kehleStummel, die Ergebnisanzeige steht als
// festes Geruest (#keaErgebnisBox) im HTML und wird nur ein- und
// ausgeblendet: js/25 haengt beim Laden Handler an die drei Felder, und ein
// Neuschreiben per innerHTML wuerde sie samt Element vernichten.
//
// Neu gegenueber dem bestehenden Modul:
//   - Material und Abwicklung (400 / 500 / 670 mm)
//   - Kehle MIT oder OHNE Mittelrippe
//   - mehrere Segmente mit Laenge und Ueberlappung je Stoss
//   - Zuschnitt aus Rollenblech (gemeinsame Darstellung, js/33)
//   - Ausmass und Materialuebersicht ohne zweite Eingabe
// ===========================================================================

// Die Register heissen und stehen in ALLEN Massaufnahme-Arten gleich:
// die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und zuletzt die
// Kontrolle.
const KEA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Winkel"},{nr:3,kurz:"Segmente"},
 {nr:4,kurz:"Zuschnitt"},{nr:5,kurz:"Ausmass"},{nr:6,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt deshalb an
// der Registerzahl, nicht an einer festen Nummer.
const KEA_KONTROLLE=KEA_REGISTER.length;
let keaSchritt=1;

// Moegliche Abwicklungen des Kehlblechs. Die Breite wird gewaehlt, nicht
// gerechnet - die Vorlage kennt keine Abwicklung.
const KEA_ABWICKLUNGEN=Object.freeze([400,500,670]);
const KEA_MITTELRIPPE=Object.freeze([
 {wert:"ohne",text:"ohne Mittelrippe"},
 {wert:"mit", text:"mit Mittelrippe"}
]);

const keaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const keaMm=v=>Math.round(keaZahl(v)).toLocaleString("de-CH");
const keaMeter=v=>(keaZahl(v)/1000).toFixed(2).replace(".",",");
const keaQm=v=>keaZahl(v).toFixed(2).replace(".",",");

function keaUeberlappungVorgabe(){
 const v=Number(kehleSettings&&kehleSettings.ueberlappung);
 return Number.isFinite(v)&&v>=0?v:70;
}
function keaLeer(){
 // firstgehrung: Vorgabe "ja" - so bleibt eine bereits erfasste Kehle und
 // der bisherige Zweck des Moduls (die Winkelberechnung) unveraendert.
 // trauf/first: 0 = nicht festgelegt. Es wird KEINE Laenge erfunden.
 // rollenAuswahl: leer = das ganze Blechlager der Firma (nichts abgewaehlt).
 return {material:"",abwicklung:500,mittelrippe:"ohne",firstgehrung:true,
         traufLaenge:0,firstLaenge:0,
         nh:"",nl:"",gl:"",segmente:[],rollenAuswahl:[]};
}
let kehleA=keaLeer();

// ---- Bruecke zum bestehenden Modul ----------------------------------------
// Danach rechnet js/25 mit genau diesen Werten - es gibt nur eine Wahrheit.
function keaBruecke(){
 const a=kehleA;
 const setz=(id,v)=>{const f=$(id); if(f)f.value=(v===""||v===null||v===undefined)?"":String(v)};
 setz("kehle_nh",a.nh); setz("kehle_nl",a.nl); setz("kehle_gl",a.gl);
}
// Ohne Firstgehrung wird GAR NICHT gerechnet - es gibt dann keinen
// Biegewinkel und keine Kehllaenge A, und es wird auch keine erfunden.
function keaMitGehrung(){return kehleA.firstgehrung!==false}
function keaErgebnis(){
 if(!keaMitGehrung())return {ok:false,fehler:[],ohneGehrung:true};
 keaBruecke();
 return kehleBerechnen(kehleEingabenAusFeldern());
}

// ---- Segmente --------------------------------------------------------------
// Zuschnittlaenge = Laenge Stoss/Stoss + Ueberlappung. Dieselbe Regel wie
// beim Einlaufblech (js/13, teileLaengeInStuecke).
function keaZuschnittLaenge(s){return keaZahl(s&&s.laenge)+keaZahl(s&&s.ueberlappung)}
function keaSegmente(){return kehleA.segmente||[]}
function keaSummeLaenge(){return keaSegmente().reduce((s,x)=>s+keaZahl(x.laenge),0)}
function keaSummeZuschnitt(){return keaSegmente().reduce((s,x)=>s+keaZuschnittLaenge(x),0)}
function keaNeuesSegment(rolle,laenge){
 return {laenge:keaZahl(laenge),ueberlappung:keaUeberlappungVorgabe(),
         rolle:rolle||null};
}
// Traufstueck und Firststueck: die Laenge wird BEIM ANLEGEN uebernommen und
// ist danach frei aenderbar - wie die Verkettung bei der Rinne (Abschnitt
// 64.4). Eine spaetere Aenderung der Vorgabe wirkt nie rueckwirkend.
function keaTraufLaenge(){return keaZahl(kehleA.traufLaenge)}
function keaFirstLaenge(){return keaZahl(kehleA.firstLaenge)}
const KEA_ROLLE_TEXT={trauf:"Traufstück",first:"Firststück"};
const KEA_ROLLE_KURZ={trauf:"Trauf",first:"First"};
function keaRolleText(s){return (s&&KEA_ROLLE_TEXT[s.rolle])||""}
function keaHatRolle(r){return keaSegmente().some(x=>x&&x.rolle===r)}
// Kehllaenge A aus der Vorlage - nur als Vorschlag fuer die Aufteilung, sie
// wird nirgends erzwungen.
function keaKehlLaenge(){
 const g=keaErgebnis();
 return (g&&g.ok)?g.A:0;
}
function keaAusLaengeAufteilen(){
 const A=keaKehlLaenge();
 if(!(A>0))return false;
 const ue=keaUeberlappungVorgabe();
 const trauf=keaTraufLaenge(), first=keaFirstLaenge();
 // Trauf- und Firststueck sind fest vorgegeben; nur der Rest dazwischen
 // wird aufgeteilt. Ist kein Rest uebrig, entstehen nur diese beiden -
 // die Kontrolle meldet dann die Abweichung zur Kehllaenge A.
 const rest=A-trauf-first;
 const mitte=(rest>0)?teileLaengeInStuecke(rest,kehleSettings):[];
 if(!mitte.length&&!(trauf>0)&&!(first>0))return false;
 const neu=[];
 if(trauf>0)neu.push({laenge:Math.round(trauf),ueberlappung:ue,rolle:"trauf"});
 // teileLaengeInStuecke liefert bereits Zuschnittlaengen (Stoss + Ueberlappung
 // je Stueck, das letzte ohne). Hier wird die Laenge Stoss/Stoss gebraucht.
 mitte.forEach((l,i)=>neu.push({
  laenge:Math.round(i<mitte.length-1?l-ue:l),
  ueberlappung:i<mitte.length-1?ue:0, rolle:null}));
 if(first>0)neu.push({laenge:Math.round(first),ueberlappung:0,rolle:"first"});
 // Nur das letzte Stueck der Kette hat keine Ueberlappung mehr.
 neu.forEach((x,i)=>{if(i<neu.length-1&&!keaZahl(x.ueberlappung))x.ueberlappung=ue});
 if(neu.length)neu[neu.length-1].ueberlappung=0;
 kehleA.segmente=neu;
 return true;
}

// ---- Flaeche und Rollenblech -----------------------------------------------
function keaAbwicklung(){return keaZahl(kehleA.abwicklung)||0}
function keaFlaecheM2(){return keaSummeZuschnitt()*keaAbwicklung()/1e6}
function keaBleche(){
 // Trauf- und Firststueck sind Beschriftungen, kein anderer Zuschnitt -
 // deshalb "hinweis": gleiche Laengen duerfen zusammengefasst werden.
 return keaSegmente().map((s,i)=>({nr:i+1,laenge:Math.round(keaZuschnittLaenge(s)),
   hinweis:keaRolleText(s)}))
  .filter(x=>x.laenge>0);
}
function keaTafelLaenge(){
 const l=keaBleche().map(x=>x.laenge);
 return l.length?Math.max.apply(null,l):0;
}
// Die Rollen, mit denen DIESE Massaufnahme rechnet: das Blechlager der
// Firma, eingeschraenkt auf die im Register "Zuschnitt" angehakten.
function keaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(kehleA&&kehleA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
// Dieselbe Packrechnung wie in allen uebrigen Arten (ebaPackeInStreifen,
// js/29) - es gibt in der App nur EINE.
function keaRollenPlan(){
 const A=keaAbwicklung(), bleche=keaBleche(), L=keaTafelLaenge();
 const breiten=keaRollenbreiten(), netto=keaFlaecheM2();
 if(A<=0||!bleche.length||!breiten.length)
  return {moeglich:[],zuSchmal:breiten.slice(),bestes:null,abwicklung:A,netto,abschnittLaenge:L};
 const v=ebaPackeInStreifen(bleche,L);
 const streifen=v.streifen||[];
 const moeglich=[], zuSchmal=[];
 breiten.forEach(B=>{
  const jeAbschnitt=Math.floor(B/A);
  if(jeAbschnitt<1){zuSchmal.push(B);return}
  const abschnitte=Math.ceil(streifen.length/jeAbschnitt);
  const rollenLaenge=abschnitte*L;
  const flaeche=B*rollenLaenge/1e6;
  moeglich.push({breite:B,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,abschnittLaenge:L,
   rollenLaenge, streifen:streifen.length,
   restBreite:B-jeAbschnitt*A,flaeche,verschnitt:flaeche-netto,
   anteil:flaeche>0?(flaeche-netto)/flaeche*100:0});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.abschnitte-y.abschnitte||y.breite-x.breite);
 return {moeglich,zuSchmal,bestes:moeglich[0]||null,abwicklung:A,netto,
         abschnittLaenge:L,verteilung:v,streifen,optimal:v.optimal!==false};
}
// Der Plan in der gemeinsamen Form (js/33) - damit sieht der Zuschnitt in
// allen Arten gleich aus.
function keaZuschnittPlan(){
 const rp=keaRollenPlan(), best=rp.bestes;
 return {art:"rolle", einheit:"Stück",
  einleitung:ZU_EINLEITUNG_ROLLE, quelle:ZU_QUELLE_ROLLE,
  leer:!keaBleche().length?"Noch nichts zuzuschneiden – bitte zuerst Segmente erfassen."
      :(!keaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
      :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."),
  streifenbreiten:[rp.abwicklung],
  gruppen:(rp.streifen||[]).length?[{breite:rp.abwicklung,abschnittLaenge:rp.abschnittLaenge,
    jeAbschnitt:best?best.jeAbschnitt:1, abschnitte:best?best.abschnitte:0,
    rollenLaenge:best?best.rollenLaenge:0, streifen:rp.streifen}]:[],
  moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, zuLang:(rp.verteilung||{}).zuLang||[],
  optimal:rp.optimal!==false};
}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function keaMittelrippeText(){
 const m=KEA_MITTELRIPPE.find(x=>x.wert===kehleA.mittelrippe);
 return m?m.text:"ohne Mittelrippe";
}
function keaMaterialText(){
 const m=findMeasurementMaterial(kehleA.material);
 return m?m.name:"–";
}
function keaAusmassZeilen(){
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 const L=keaSummeZuschnitt(), A=keaAbwicklung(), n=keaBleche().length;
 if(!n||!(A>0))return z;
 zeile("Kehlblech "+keaMittelrippeText()+", Abwicklung "+keaMm(A)+" mm",
       keaMeter(L),"m","Summe der Zuschnittlängen");
 zeile("Kehlblech, Fläche",keaQm(keaFlaecheM2()),"m²","Zuschnittlänge × Abwicklung");
 zeile("Kehlblech, Stücke",String(n),"Stk.","erfasste Segmente");
 if(n>1)zeile("Stösse",String(n-1),"Stk.","zwischen den Segmenten");
 // Trauf- und Firststueck werden nur genannt, wenn wirklich eines erfasst ist.
 ["trauf","first"].forEach(r=>{
  const st=keaSegmente().find(x=>x&&x.rolle===r);
  if(st&&keaZahl(st.laenge)>0)
   zeile(KEA_ROLLE_TEXT[r]+", Länge",keaMm(st.laenge),"mm","erfasstes Segment");
 });
 return z;
}
function keaMaterialTabelle(){
 const m=findMeasurementMaterial(kehleA.material);
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Pruefungen, die sich aus dem bestehenden Modul und den erfassten Daten
// ableiten lassen. Es werden KEINE eigenen Grenzwerte erfunden.
function keaPruefungen(){
 const m=[], a=kehleA;
 const g=keaErgebnis();
 // Ohne Firstgehrung wird nicht gerechnet - dann darf auch nichts an den
 // fehlenden Neigungen bemaengelt werden.
 if(keaMitGehrung()&&!g.ok)(g.fehler||[]).forEach(t=>m.push({art:"fehler",text:t}));
 if(!a.material)m.push({art:"fehler",text:"Es ist kein Material gewählt."});
 if(!(keaAbwicklung()>0))m.push({art:"fehler",text:"Es ist keine Abwicklung gewählt."});
 const segs=keaSegmente();
 if(!segs.length)m.push({art:"fehler",text:"Es ist noch kein Segment erfasst."});
 segs.forEach((s,i)=>{
  if(!(keaZahl(s.laenge)>0))m.push({art:"fehler",text:"Segment "+(i+1)+": die Länge fehlt oder ist 0."});
  if(keaZahl(s.ueberlappung)<0)m.push({art:"fehler",text:"Segment "+(i+1)+": negative Überlappung."});
 });
 // Die Vorlage rechnet die Kehllaenge A aus. Weicht die Summe der Segmente
 // deutlich davon ab, ist das ein Hinweis - kein Fehler: die Kehle kann
 // bewusst kuerzer oder laenger ausgefuehrt sein.
 if(g.ok&&segs.length){
  const A=g.A, summe=keaSummeLaenge();
  if(A>0&&summe>0&&Math.abs(summe-A)>Math.max(20,A*0.02))
   m.push({art:"warnung",text:"Die Segmente ergeben zusammen "+keaMm(summe)
     +" mm, die berechnete Kehllänge A ist "+keaMm(A)+" mm."});
 }
 // Eine festgelegte Trauf-/Firstlaenge, zu der es kein Stueck gibt, ist ein
 // Hinweis - vielleicht wurde der Knopf nur noch nicht gedrueckt.
 [["trauf",keaTraufLaenge()],["first",keaFirstLaenge()]].forEach(x=>{
  if(x[1]>0&&segs.length&&!keaHatRolle(x[0]))
   m.push({art:"warnung",text:"Für das "+KEA_ROLLE_TEXT[x[0]]+" ist "+keaMm(x[1])
     +" mm festgelegt, aber kein solches Stück in der Liste."});
 });
 const rp=keaRollenPlan();
 if(keaBleche().length&&!rp.moeglich.length&&keaRollenbreiten().length)
  m.push({art:"warnung",text:"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung ("+keaMm(keaAbwicklung())+" mm)."});
 if(keaBleche().length&&!keaRollenbreiten().length)
  m.push({art:"warnung",text:"Es ist keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet."});
 return m;
}

// ---- Anzeige ---------------------------------------------------------------
function keaKarte(titel,inhalt){
 return `<div class="card"><h2>${esc(titel)}</h2>${inhalt}</div>`;
}
function keaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function keaGrunddatenHtml(){
 const a=kehleA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 const abwOpt=KEA_ABWICKLUNGEN.map(b=>
  `<option value="${b}"${keaZahl(a.abwicklung)===b?" selected":""}>${keaMm(b)} mm</option>`).join("");
 const mrOpt=KEA_MITTELRIPPE.map(x=>
  `<option value="${esc(x.wert)}"${x.wert===a.mittelrippe?" selected":""}>${esc(x.text)}</option>`).join("");
 return `<div class="info">Material, Breite des Kehlblechs und die Ausführung. Die
Abwicklung wird gewählt, nicht gerechnet – die Vorlage kennt sie nicht.</div>
<div class="grid">
${keaFeld("Material",`<select id="kea_material" data-pflicht="1">${matOpt}</select>`,true)}
${keaFeld("Abwicklung Kehlblech",`<select id="kea_abwicklung">${abwOpt}</select>`)}
${keaFeld("Ausführung",`<select id="kea_mittelrippe">${mrOpt}</select>`)}
</div>
<label class="ra-schalter" style="margin-top:8px"><input type="checkbox" id="kea_firstgehrung"${
 keaMitGehrung()?" checked":""}> Firstgehrung vorhanden</label>
<div class="small" style="color:var(--muted);margin-top:6px">${keaMitGehrung()
 ? (a.mittelrippe==="mit"
    ? "Mit Mittelrippe ist der <b>Innenwinkel zur Mittelrippe</b> (k / 2) der führende Winkel."
    : "Ohne Mittelrippe ist der <b>Biegewinkel Kehlblech</b> (d) der führende Winkel.")
   +" Beide Werte stehen im Register „Winkel“."
 : "<b>Ohne Firstgehrung wird kein Winkel berechnet.</b> Das Register „Winkel“ bleibt "
   +"leer, es werden weder Neigungen noch eine Gefällslänge gebraucht. Erfasst werden "
   +"nur die Segmente und der Zuschnitt."}</div>`;
}
function keaWinkelHtml(){
 const a=kehleA;
 if(!keaMitGehrung())return `<div class="info">Für diese Kehle ist <b>keine Firstgehrung</b>
angekreuzt – deshalb wird hier nichts gerechnet und nichts abgefragt. Soll die
Winkelberechnung doch laufen, das Häkchen in <b>1 · Grunddaten</b> setzen.</div>`;
 return `<div class="info">Die drei Eingaben der Vorlage. Gerechnet wird unverändert
mit der Funktion der laufenden App – es wurde nichts vereinfacht oder ersetzt.</div>
<div class="grid">
${keaFeld("Neigung Hauptdach · NH (°)",`<input id="kea_nh" data-pflicht="1" type="number" step="0.1" inputmode="decimal" value="${esc(a.nh)}">`)}
${keaFeld("Neigung Lukarne · NL (°)",`<input id="kea_nl" data-pflicht="1" type="number" step="0.1" inputmode="decimal" value="${esc(a.nl)}">`)}
${keaFeld("Gefällslänge Lukarne · GL (mm)",`<input id="kea_gl" data-pflicht="1" type="number" step="1" inputmode="decimal" value="${esc(a.gl)}">`)}
</div>`;
}
// Der fuehrende Winkel je nach Ausfuehrung - beide Werte kommen unveraendert
// aus der Vorlage, es wird nichts neu gerechnet.
function keaFuehrenderWinkelHtml(){
 const g=keaErgebnis();
 if(!g.ok)return "";
 const mit=kehleA.mittelrippe==="mit";
 const s=mit?"mitte":"d";
 return `<div class="ra-ok" style="margin-top:8px">Führender Winkel ${esc(keaMittelrippeText())}:
<b>${esc(s)} = ${esc(kehleWert(s,g[s]))}</b> – ${esc(KEHLE_LABELS[s]||"")}.</div>`;
}
function keaSegmenteHtml(){
 const a=kehleA, segs=keaSegmente();
 const A=keaKehlLaenge();
 const zeilen=segs.map((s,i)=>`<tr>
<td>${i+1}${keaRolleText(s)?`<div class="kea-rolle" title="${esc(keaRolleText(s))}">${esc(KEA_ROLLE_KURZ[s.rolle])}</div>`:""}</td>
<td><input data-kea-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(keaZahl(s.laenge))}"></td>
<td><input data-kea-ueb="${i}" type="number" inputmode="numeric" step="1" value="${esc(keaZahl(s.ueberlappung))}"></td>
<td><div class="zu-lb"><b data-kea-zu="${i}">${esc(keaMm(keaZuschnittLaenge(s)))}</b><span class="zu-lb-breite">mm × ${esc(keaMm(keaAbwicklung()))}&nbsp;mm</span></div></td>
<td class="p-mitte"><button type="button" class="red ra-weg" data-kea-weg="${i}" title="Segment löschen">✕</button></td>
</tr>`).join("");
 return `<div class="info">Ein Segment ist ein Stück Kehlblech. Der Zuschnitt ist
<b>Länge Stoss/Stoss + Überlappung</b>; die Vorgabe für die Überlappung steht in
<b>Einstellungen → Massaufnahmen → Kehle</b> und lässt sich je Segment überschreiben.</div>
${keaMitGehrung()?"":`<div class="small" style="color:var(--muted);margin-bottom:6px">Ohne
Firstgehrung gibt es keine berechnete Kehllänge A – die Segmente werden von Hand
erfasst.</div>`}
<div class="grid">
${keaFeld("Berechnete Kehllänge A",`<div class="ra-wert" id="kea_wA">${A>0?esc(keaMm(A))+" mm":"–"}</div>`)}
${keaFeld("Aus den Segmenten",`<div class="ra-wert" id="kea_wSumme">${keaSummeLaenge()>0?esc(keaMm(keaSummeLaenge()))+" mm":"–"}</div>`)}
</div>
<div class="grid" style="margin-top:8px">
${keaFeld("Länge Traufstück (mm)",`<input id="kea_trauf" type="number" inputmode="numeric" step="1" value="${keaTraufLaenge()?esc(keaTraufLaenge()):""}" placeholder="nicht festgelegt">`)}
${keaFeld("Länge Firststück (mm)",`<input id="kea_first" type="number" inputmode="numeric" step="1" value="${keaFirstLaenge()?esc(keaFirstLaenge()):""}" placeholder="nicht festgelegt">`)}
</div>
<div class="small" style="color:var(--muted);margin-bottom:6px">Diese beiden Längen
werden <b>beim Anlegen</b> eines Trauf- oder Firststücks übernommen und sind danach
in der Liste frei änderbar – eine spätere Änderung wirkt nie rückwirkend.</div>
<div class="bar">
<button type="button" class="gray" id="kea_ausA"${A>0?"":" disabled"}>🔄 Segmente aus Kehllänge A berechnen</button>
<button type="button" class="gray" id="kea_segPlus">＋ Segment hinzufügen</button>
</div>
<div class="bar">
<button type="button" class="gray" id="kea_traufPlus"${keaTraufLaenge()>0&&!keaHatRolle("trauf")?"":" disabled"}>＋ Traufstück</button>
<button type="button" class="gray" id="kea_firstPlus"${keaFirstLaenge()>0&&!keaHatRolle("first")?"":" disabled"}>＋ Firststück</button>
</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Länge Stoss/Stoss (mm)</th><th class="kea-nowrap">Überlappung<br>(mm)</th><th>Zuschnitt (Länge × Breite)</th><th></th></tr></thead>
<tbody>${zeilen||'<tr><td colspan="5" class="small">Noch kein Segment. „Aus Kehllänge A berechnen“ oder „＋ Segment hinzufügen“.</td></tr>'}</tbody>
</table></div>
<div class="grid" style="margin-top:8px">
${keaFeld("Zuschnitt gesamt",`<div class="ra-wert" id="kea_wZu">${keaSummeZuschnitt()>0?esc(keaMm(keaSummeZuschnitt()))+" mm":"–"}</div>`)}
${keaFeld("Blechfläche",`<div class="ra-wert" id="kea_wFlaeche">${esc(keaQm(keaFlaecheM2()))} m²</div>`)}
</div>`;
}
function keaAusmassHtml(){
 const z=keaAusmassZeilen();
 if(!z.length)return '<div class="small" style="color:var(--muted);text-align:center;padding:14px">Noch nichts abzuleiten – zuerst Material, Abwicklung und Segmente erfassen.</div>';
 const mat=keaMaterialTabelle();
 return `<div class="info">Vollständig aus den erfassten Daten abgeleitet – keine
zweite Eingabe. Ohne Artikelnummern und ohne Preise.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td><b>${esc(x.menge)}</b></td><td>${esc(x.einheit)}</td>
<td class="small" style="color:var(--muted)">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:8px">Material: <b>${esc(keaMaterialText())}</b>${
 mat.length?"":" – noch nicht gewählt"}.</div>`;
}
function keaKontrolleHtml(){
 const m=keaPruefungen(), g=keaErgebnis();
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td>${esc(keaMaterialText())}</td></tr>
<tr><td>Abwicklung</td><td>${esc(keaMm(keaAbwicklung()))} mm</td></tr>
<tr><td>Ausführung</td><td>${esc(keaMittelrippeText())}</td></tr>
<tr><td>Firstgehrung</td><td>${keaMitGehrung()?"ja":"nein"}</td></tr>
<tr><td>Segmente</td><td>${keaSegmente().length}</td></tr>
<tr><td>Zuschnitt gesamt</td><td>${esc(keaMm(keaSummeZuschnitt()))} mm</td></tr>
<tr><td>Blechfläche</td><td>${esc(keaQm(keaFlaecheM2()))} m²</td></tr>
<tr><td>Führender Winkel</td><td>${g.ok?esc(kehleWert(kehleA.mittelrippe==="mit"?"mitte":"d",
  g[kehleA.mittelrippe==="mit"?"mitte":"d"])):(keaMitGehrung()?"–":"entfällt (keine Firstgehrung)")}</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div class="ra-pruefung" style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register --------------------------------------------------------------
function keaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function keaSetzeSchritt(n){
 keaSchritt=Math.max(1,Math.min(KEA_REGISTER.length,Number(n)||1));
 renderKehleAufnahme();
 // Der Foto-/Skizzenbereich haengt am Register: nur das letzte zeigt ihn.
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("kea_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function keaRegisterHtml(){
 const pr=keaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="kea_register">`+KEA_REGISTER.map(r=>{
  const marke=r.nr===KEA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===keaSchritt?" aktiv":""}" data-kea-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function keaKopfInhalt(){
 if(keaSchritt===1)return keaKarte("1 · Grunddaten",keaGrunddatenHtml());
 if(keaSchritt===2)return keaKarte("2 · Winkel",keaWinkelHtml()+keaFuehrenderWinkelHtml());
 if(keaSchritt===3)return keaKarte("3 · Segmente",keaSegmenteHtml());
 if(keaSchritt===4)return keaKarte("4 · Zuschnitt aus Rollenblech",zuRollenAuswahlHtml(kehleA.rollenAuswahl,"data-kea-rolle")+zuschnittHtml(keaZuschnittPlan()));
 if(keaSchritt===5)return keaKarte("5 · Ausmass und Material",keaAusmassHtml());
 return keaKarte("6 · Kontrolle",keaKontrolleHtml());
}
// Das Geruest steht fest im HTML: #kea_kopf und #kea_fuss werden neu
// geschrieben, #keaErgebnisBox NICHT - js/25 haengt seine Handler an die
// Felder darin bzw. beschreibt es.
function renderKehleAufnahme(){
 const ziel=$("kehleAufnahme");
 if(!ziel)return;
 keaVerdrahten();
 keaBruecke();
 const kopf=$("kea_kopf"), fuss=$("kea_fuss"), box=$("keaErgebnisBox");
 if(!kopf||!fuss||!box)return;
 kopf.innerHTML=keaRegisterHtml()+keaKopfInhalt();
 // Die Ergebnisanzeige der Vorlage gehoert zum Register "Winkel" - und nur
 // dann, wenn ueberhaupt gerechnet wird.
 box.hidden=keaSchritt!==2||!keaMitGehrung();
 if(!box.hidden)renderKehleResult();
 fuss.innerHTML=`<div class="bar ra-blaettern">
<button type="button" class="gray" id="kea_zurueck"${keaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="kea_weiter">${
 keaSchritt>=KEA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(KEA_REGISTER[keaSchritt].kurz)}</button>
</div>`;
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("kea_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus.
// Die beiden Knoepfe "+ Traufstueck" / "+ Firststueck" haengen an der
// festgelegten Laenge - sie werden ohne Neuzeichnen nachgefuehrt, damit das
// gerade bearbeitete Feld den Fokus behaelt.
function keaKnoepfe(){
 const tp=$("kea_traufPlus");
 if(tp)tp.disabled=!(keaTraufLaenge()>0&&!keaHatRolle("trauf"));
 const fp=$("kea_firstPlus");
 if(fp)fp.disabled=!(keaFirstLaenge()>0&&!keaHatRolle("first"));
}
function keaLive(){
 keaBruecke();
 const a=$("kea_wA"); if(a){const A=keaKehlLaenge();a.textContent=A>0?keaMm(A)+" mm":"–"}
 const s=$("kea_wSumme"); if(s){const L=keaSummeLaenge();s.textContent=L>0?keaMm(L)+" mm":"–"}
 const zu=$("kea_wZu"); if(zu){const Z=keaSummeZuschnitt();zu.textContent=Z>0?keaMm(Z)+" mm":"–"}
 const fl=$("kea_wFlaeche"); if(fl)fl.textContent=keaQm(keaFlaecheM2())+" m²";
 // Die abgeleitete Zuschnittspalte je Zeile - Zelle fuer Zelle, damit das
 // gerade bearbeitete Feld stehen bleibt.
 document.querySelectorAll("[data-kea-zu]").forEach(el=>{
  const i=Number(el.dataset.keaZu), sg=keaSegmente()[i];
  if(sg)el.textContent=keaMm(keaZuschnittLaenge(sg));
 });
 // Die Marke am Kontroll-Register haengt an den Pruefungen und muss
 // mitwandern; die Registerleiste selbst traegt keinen Fokus.
 keaKnoepfe();
 const strip=$("kea_register");
 if(strip)strip.outerHTML=keaRegisterHtml();
 if(keaSchritt===2&&$("keaErgebnisBox")&&!$("keaErgebnisBox").hidden)renderKehleResult();
}

// ---- Bedienung -------------------------------------------------------------
function keaVerdrahten(){
 const wurzel=$("measTypeKehle");
 if(!wurzel||wurzel.dataset.keaVerdrahtet)return;
 wurzel.dataset.keaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=kehleA;
  if(t.id==="kea_nh")a.nh=t.value;
  else if(t.id==="kea_nl")a.nl=t.value;
  else if(t.id==="kea_gl")a.gl=t.value;
  else if(d.keaLaenge!==undefined){
   const i=Number(d.keaLaenge);
   if(a.segmente[i])a.segmente[i].laenge=keaZahl(t.value);
  }
  else if(d.keaUeb!==undefined){
   const i=Number(d.keaUeb);
   if(a.segmente[i])a.segmente[i].ueberlappung=keaZahl(t.value);
  }
  else if(t.id==="kea_trauf"){a.traufLaenge=keaZahl(t.value); keaKnoepfe(); return}
  else if(t.id==="kea_first"){a.firstLaenge=keaZahl(t.value); keaKnoepfe(); return}
  else return;
  keaLive();
 });

 wurzel.addEventListener("change",e2=>{
  const t2=e2.target;
  // Auch die beiden Laengenfelder sollen beim Verlassen nicht neu zeichnen.
  if(t2.id==="kea_trauf"||t2.id==="kea_first"){keaKnoepfe(); e2.stopImmediatePropagation()}
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, a=kehleA;
  // Rollenauswahl fuer DIESE Massaufnahme (gemeinsamer Kasten, js/33)
  {const w=zuRollenKlick(e.target,"data-kea-rolle");
   if(w!==null){kehleA.rollenAuswahl=w; renderKehleAufnahme(); return}}
  if(t.id==="kea_material")a.material=t.value;
  else if(t.id==="kea_abwicklung")a.abwicklung=keaZahl(t.value);
  else if(t.id==="kea_mittelrippe")a.mittelrippe=t.value;
  else if(t.id==="kea_firstgehrung")a.firstgehrung=!!t.checked;
  // Zahleneingaben zeichnen NICHT neu: sonst verliert das Feld, in das der
  // Benutzer gerade weiterspringt, seine Ereignisse und die ersten Zeichen
  // gehen verloren. Das Modell ist bereits im input-Handler gesetzt.
  else if(t.id==="kea_nh"||t.id==="kea_nl"||t.id==="kea_gl"){keaLive();return}
  else if((t.dataset||{}).keaLaenge!==undefined||(t.dataset||{}).keaUeb!==undefined){
   keaLive(); return;
  }
  else return;
  renderKehleAufnahme();
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target, d=t.dataset||{}, a=kehleA;
  const schritt=t.closest("[data-kea-schritt]");
  if(schritt){keaSetzeSchritt(Number(schritt.dataset.keaSchritt));return}
  if(t.id==="kea_zurueck"){keaSetzeSchritt(keaSchritt-1);return}
  if(t.id==="kea_weiter"){
   if(keaSchritt>=KEA_REGISTER.length){keaAbschluss();return}
   keaSetzeSchritt(keaSchritt+1); return;
  }
  if(t.id==="kea_segPlus"){a.segmente.push(keaNeuesSegment());renderKehleAufnahme();return}
  // Traufstueck vorne, Firststueck hinten - beide mit der festgelegten Laenge.
  if(t.id==="kea_traufPlus"){
   if(!(keaTraufLaenge()>0)||keaHatRolle("trauf"))return;
   a.segmente.unshift(keaNeuesSegment("trauf",keaTraufLaenge()));
   renderKehleAufnahme(); return;
  }
  if(t.id==="kea_firstPlus"){
   if(!(keaFirstLaenge()>0)||keaHatRolle("first"))return;
   const vor=a.segmente[a.segmente.length-1];
   if(vor&&!keaZahl(vor.ueberlappung))vor.ueberlappung=keaUeberlappungVorgabe();
   const st=keaNeuesSegment("first",keaFirstLaenge()); st.ueberlappung=0;
   a.segmente.push(st);
   renderKehleAufnahme(); return;
  }
  if(t.id==="kea_ausA"){
   if(a.segmente.length&&!confirm("Die bestehenden Segmente werden ersetzt. Fortfahren?"))return;
   if(keaAusLaengeAufteilen())renderKehleAufnahme();
   return;
  }
  const weg=t.closest("[data-kea-weg]");
  if(weg){
   const i=Number(weg.dataset.keaWeg);
   if(!confirm("Segment "+(i+1)+" löschen?"))return;
   a.segmente.splice(i,1); renderKehleAufnahme(); return;
  }
 });
}

// ---- Zusatzdaten fuer den Speicher-Payload ---------------------------------
// Die bisherigen Felder (die drei Eingaben und die 35 Werte der Vorlage)
// schreibt js/16 unveraendert weiter; hier kommt nur dazu, was neu ist.
function keaZusatzDaten(){
 const rp=keaRollenPlan();
 return {
  material:kehleA.material,
  abwicklung:keaAbwicklung(),
  mittelrippe:kehleA.mittelrippe,
  firstgehrung:keaMitGehrung(),
  traufLaenge:keaTraufLaenge(),
  firstLaenge:keaFirstLaenge(),
  segmente:keaSegmente().map(s=>({
   laenge:keaZahl(s.laenge),
   ueberlappung:keaZahl(s.ueberlappung),
   rolle:s.rolle||null,
   zuschnitt:Math.round(keaZuschnittLaenge(s))
  })),
  zuschnittSumme:Math.round(keaSummeZuschnitt()),
  flaeche_m2:keaFlaecheM2(),
  ausmass:keaAusmassZeilen(),
  rollen:{auswahl:(kehleA.rollenAuswahl||[]).slice(),abwicklung:rp.abwicklung,
          abschnittLaenge:rp.abschnittLaenge,
          abschnitte:rp.bestes?rp.bestes.abschnitte:0,
          jeAbschnitt:rp.bestes?rp.bestes.jeAbschnitt:1,
          rollenLaenge:rp.bestes?rp.bestes.rollenLaenge:0,netto:rp.netto,
          moeglich:rp.moeglich||[],
          bestes:rp.bestes,zuSchmal:rp.zuSchmal,optimal:rp.optimal!==false,
          streifen:(rp.streifen||[]).map(s=>({
            stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,merkmal:x.merkmal||"",hinweis:x.hinweis||""})),rest:s.rest}))}
 };
}
function keaZuruecksetzen(){
 kehleA=keaLeer();
 keaSchritt=1;
 renderKehleAufnahme();
}
function keaFuellen(d){
 const w=d||{};
 const a=keaLeer();
 a.nh=(w.nh===0||w.nh)?String(w.nh):"";
 a.nl=(w.nl===0||w.nl)?String(w.nl):"";
 a.gl=(w.gl===0||w.gl)?String(w.gl):"";
 a.material=w.material||"";
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v2.85), bleibt es leer = ganzes Lager.
 const rq=(w.rollen&&w.rollen.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 // Eine Aufnahme aus der Zeit vor v2.83 hat weder Abwicklung noch Segmente -
 // es wird KEINE erfunden, die Vorgabe steht nur als Auswahl bereit.
 a.abwicklung=KEA_ABWICKLUNGEN.indexOf(keaZahl(w.abwicklung))>=0?keaZahl(w.abwicklung):500;
 a.mittelrippe=(w.mittelrippe==="mit")?"mit":"ohne";
 // Eine Aufnahme ohne das Feld ist eine von vor v2.84 - die hatte immer eine
 // Firstgehrung (das Modul konnte gar nichts anderes), also "ja".
 a.firstgehrung=(w.firstgehrung===false)?false:true;
 a.traufLaenge=keaZahl(w.traufLaenge);
 a.firstLaenge=keaZahl(w.firstLaenge);
 a.segmente=Array.isArray(w.segmente)?w.segmente.map(s=>({
  laenge:keaZahl(s&&s.laenge),
  ueberlappung:keaZahl(s&&s.ueberlappung),
  rolle:(s&&(s.rolle==="trauf"||s.rolle==="first"))?s.rolle:null
 })):[];
 kehleA=a;
 keaSchritt=1;
 renderKehleAufnahme();
}
