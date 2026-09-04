"use strict";
// ===========================================================================
// Lukarne Seitenverkleidung - Erfassung in sechs Registern
// ===========================================================================
// Die Fachrechnung bleibt vollstaendig in js/19-lukarne.js:
//   berechneLukarne()  lukPlanSvg()  lukScharenZeilen()  lukMass()
// Diese Datei ist ausschliesslich die Bedienung darum herum. Sie rechnet
// NICHTS selbst - jeder Wert kommt aus berechneLukarne(). Es gibt nur eine
// Wahrheit, und die steht in js/19.
//
// Die alten Formularfelder stehen weiterhin unsichtbar im HTML (#lukStummel):
// js/19 haengt beim Laden Handler an sie und beschreibt sie. lukaBruecke()
// setzt sie aus dem Zustand, danach liefern lukEingabenAusFeldern() und
// berechneLukarne() genau die richtigen Werte.
//
// Zuschnitt und PDF laufen ueber die gemeinsamen Bausteine (js/33, js/35) -
// es wird keine zweite Zuschnitt- oder Packrechnung gebaut.
// ===========================================================================

// Register wie in allen uebrigen Arten: die fachlichen Schritte zuerst,
// danach Zuschnitt, Ausmass und zuletzt die Kontrolle.
const LUKA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Geometrie"},{nr:3,kurz:"Scharen"},
 {nr:4,kurz:"Zuschnitt"},{nr:5,kurz:"Ausmass"},{nr:6,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const LUKA_KONTROLLE=LUKA_REGISTER.length;
let lukaSchritt=1;

const lukaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const lukaMm=v=>Math.round(lukaZahl(v)).toLocaleString("de-CH");
const lukaMeter=v=>(lukaZahl(v)/1000).toFixed(2).replace(".",",");
const lukaQm=v=>lukaZahl(v).toFixed(2).replace(".",",");

// Die firmenweiten Vorgaben aus den Einstellungen - sie werden beim Anlegen
// einmal uebernommen und sind danach je Aufnahme frei aenderbar.
function lukaLeer(){
 return {
  material:"", seite:"rechts",
  hoehe:"", laengeOben:"", winkel:95,
  achsabstand:(typeof lukAchsabstand!=="undefined"?lukAchsabstand:500),
  hilfsriss:(typeof lukHilfsriss!=="undefined"?lukHilfsriss:0),
  zugabeLaenge:(typeof lukZugabeLaenge!=="undefined"?lukZugabeLaenge:0),
  zugabeBreite:(typeof lukZugabeBreite!=="undefined"?lukZugabeBreite:0),
  // rollenAuswahl: leer = das ganze Blechlager der Firma (nichts abgewaehlt).
  rollenAuswahl:[]
 };
}
let lukA=lukaLeer();

// ---- Bruecke zur Fachrechnung ---------------------------------------------
// Danach rechnet js/19 mit genau diesen Werten.
function lukaBruecke(){
 const setz=(id,wert)=>{const e=$(id);if(e)e.value=(wert===null||wert===undefined)?"":wert};
 setz("luk_hoehe",lukA.hoehe);
 setz("luk_laengeOben",lukA.laengeOben);
 setz("luk_winkel",lukA.winkel);
 setz("luk_achsabstand",lukA.achsabstand);
 setz("luk_hilfsriss",lukA.hilfsriss);
 setz("luk_seite",lukA.seite==="links"?"links":"rechts");
 setz("luk_material",lukA.material);
}
// Die Eingaben fuer berechneLukarne() - dieselben Felder wie
// lukEingabenAusFeldern() (js/19) plus die beiden Zugaben dieser Aufnahme.
function lukaEingaben(){
 return {
  hoehe:lukA.hoehe, laengeOben:lukA.laengeOben, winkel:lukA.winkel,
  achsabstand:lukA.achsabstand, hilfsrissWunsch:lukA.hilfsriss,
  seite:lukA.seite,
  zugabeLaenge:lukA.zugabeLaenge, zugabeBreite:lukA.zugabeBreite
 };
}
// Das eine Ergebnis. null, solange die Pflichtmasse fehlen - dann wird
// nichts angezeigt und nichts erfunden.
function lukaErgebnis(){
 lukaBruecke();
 return berechneLukarne(lukaEingaben());
}
function lukaScharen(){const g=lukaErgebnis();return g?g.scharen:[]}

// ---- Zuschnitt (gemeinsame Bausteine, js/33) -------------------------------
// Eine Schar ist ein rechteckiger Zuschnitt: Laenge x Breite. Gruppiert wird
// nach Laenge und Breite; die Scharnummern bleiben als Zuordnung erhalten.
// Die letzte Schar ist die Restbreite - das ist ein anderer Zuschnitt und
// steht deshalb als eigenes "merkmal" da.
function lukaBleche(){
 const g=lukaErgebnis();
 if(!g)return [];
 return g.scharen.map(s=>({
  nr:s.nr,
  laenge:Math.round(s.zuschnittLaenge),
  breite:Math.round(s.zuschnittBreite),
  merkmal:"Breite "+lukaMm(s.zuschnittBreite)+" mm"
    +(s.nr===g.anzahl&&g.anzahl>1?" (Restbreite)":"")
 })).filter(x=>x.laenge>0&&x.breite>0);
}
function lukaTafelLaenge(){
 const l=lukaBleche().map(x=>x.laenge);
 return l.length?Math.max.apply(null,l):0;
}
// Die Rollen, mit denen DIESE Massaufnahme rechnet: das Blechlager der Firma,
// eingeschraenkt auf die im Register "Zuschnitt" angehakten.
function lukaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(lukA&&lukA.rollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
function lukaFlaecheM2(){
 return lukaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
}
// Anders als bei den uebrigen Arten hat nicht jedes Stueck dieselbe Breite:
// die letzte Schar ist schmaler. Gepackt wird deshalb je Zuschnittbreite -
// mit derselben Packrechnung wie ueberall (ebaPackeInStreifen, js/29).
// Es gibt in der App nur EINE.
function lukaRollenPlan(){
 const bleche=lukaBleche();
 const breiten=lukaRollenbreiten();
 const netto=lukaFlaecheM2();
 if(!bleche.length||!breiten.length)
  return {gruppen:[],moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 // Nach Zuschnittbreite gruppieren, jede Gruppe fuer sich packen.
 const nach=new Map();
 bleche.forEach(x=>{
  if(!nach.has(x.breite))nach.set(x.breite,[]);
  nach.get(x.breite).push(x);
 });
 const gruppen=[]; let optimal=true, zuLang=[];
 Array.from(nach.keys()).sort((a,b)=>b-a).forEach(B=>{
  const liste=nach.get(B);
  const L=Math.max.apply(null,liste.map(x=>x.laenge));
  const v=ebaPackeInStreifen(liste,L);
  if(v.optimal===false)optimal=false;
  if(v.zuLang&&v.zuLang.length)zuLang=zuLang.concat(v.zuLang);
  gruppen.push({breite:B,tafelLaenge:L,streifen:v.streifen||[]});
 });
 const moeglich=[], zuSchmal=[];
 breiten.forEach(R=>{
  const zeilen=[]; let flaeche=0, passt=true;
  gruppen.forEach(gr=>{
   const jeTafel=Math.floor(R/gr.breite);
   if(jeTafel<1){passt=false;return}
   const tafeln=Math.ceil(gr.streifen.length/jeTafel);
   flaeche+=tafeln*R*gr.tafelLaenge/1e6;
   zeilen.push({breite:gr.breite,jeTafel,tafeln,streifen:gr.streifen.length,
     tafelLaenge:gr.tafelLaenge});
  });
  if(!passt){zuSchmal.push(R);return}
  moeglich.push({breite:R,zeilen,flaeche,verschnitt:flaeche-netto,
    anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
    tafeln:zeilen.reduce((s,x)=>s+x.tafeln,0)});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.tafeln-y.tafeln||y.breite-x.breite);
 return {gruppen,moeglich,zuSchmal,bestes:moeglich[0]||null,netto,optimal,zuLang};
}
// Der Plan in der gemeinsamen Form (js/33) - damit sieht der Zuschnitt in
// allen Arten gleich aus.
function lukaZuschnittPlan(){
 const rp=lukaRollenPlan();
 return {art:"rolle", einheit:"Schar",
  einleitung:ZU_EINLEITUNG_ROLLE, quelle:ZU_QUELLE_ROLLE,
  leer:!lukaScharen().length?"Noch nichts zuzuschneiden – bitte zuerst die Geometrie erfassen."
      :(!lukaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
      :"Keine Schar lässt sich auf eine Tafel legen."),
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, zuLang:rp.zuLang||[], optimal:rp.optimal!==false};
}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function lukaSeiteText(){return lukA.seite==="links"?"Linke Seite":"Rechte Seite"}
function lukaMaterialText(){
 const m=findMeasurementMaterial(lukA.material);
 return m?m.name:"kein Material gewählt";
}
function lukaAusmassZeilen(){
 const g=lukaErgebnis();
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(!g)return z;
 zeile("Lukarne Seitenverkleidung, "+lukaSeiteText()+", Fläche",
       lukaQm(g.flaeche),"m²","Dreieckfläche aus H und Breite");
 zeile("Scharen",String(g.anzahl),"Stk.","aus Breite ÷ Achsabstand");
 zeile("Blechfläche Zuschnitt",lukaQm(lukaFlaecheM2()),"m²","Zuschnittlänge × Zuschnittbreite");
 zeile("Schräge A (Dach)",lukaMm(g.A),"mm","aus H, L und Winkel");
 zeile("Vordere Kante",lukaMm(g.H),"mm","Höhe H");
 zeile("Obere Kante",lukaMm(g.L),"mm","obere Länge L");
 return z;
}
function lukaMaterialTabelle(){
 const m=findMeasurementMaterial(lukA.material);
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Pruefungen, die sich aus dem bestehenden Modul und den erfassten Daten
// ableiten lassen. Es werden KEINE eigenen Grenzwerte erfunden.
function lukaPruefungen(){
 const m=[], a=lukA;
 const g=lukaErgebnis();
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 if(!(lukaZahl(a.hoehe)>0))m.push({art:"fehler",text:"Die vordere Höhe H fehlt."});
 if(!(lukaZahl(a.laengeOben)>0))m.push({art:"fehler",text:"Die obere Länge L fehlt."});
 const w=lukaZahl(a.winkel);
 if(!(w>=90&&w<180))
  m.push({art:"fehler",text:"Der obere Innenwinkel muss zwischen 90° und 180° liegen."});
 if(!(lukaZahl(a.achsabstand)>0))m.push({art:"fehler",text:"Der Achsabstand der Scharen fehlt."});
 if(lukaZahl(a.zugabeLaenge)<0||lukaZahl(a.zugabeBreite)<0)
  m.push({art:"fehler",text:"Eine Zugabe kann nicht negativ sein."});
 if(!g)return m;
 // Ab hier rechnet die Fachlogik - die Hinweise kommen aus ihrem Ergebnis.
 if(g.gekuerzt)
  m.push({art:"warnung",text:"Der Hilfsriss wurde von "+lukaMm(g.hilfsrissWunsch)
    +" mm auf "+lukaMm(g.hilfsriss)+" mm gekürzt, damit er die letzte Scharlinie noch schneidet."});
 if(!(g.hilfsriss>0))
  m.push({art:"warnung",text:"Es ist kein Hilfsriss gesetzt – die Scharen werden dann ab Oberkante gemessen."});
 if(lukaZahl(a.achsabstand)>g.W)
  m.push({art:"warnung",text:"Der Achsabstand ist grösser als die waagerechte Breite ("
    +lukaMm(g.W)+" mm) – es entsteht nur eine Schar über die ganze Wange."});
 const rest=g.breiten[g.anzahl-1];
 if(g.anzahl>1&&rest<0.2*lukaZahl(a.achsabstand))
  m.push({art:"warnung",text:"Die letzte Schar ist mit "+lukaMm(rest)
    +" mm sehr schmal – ein anderer Achsabstand ergibt gleichmässigere Scharen."});
 const kurz=g.scharen.filter(s=>s.zuschnittLaenge<=0.5);
 if(kurz.length)
  m.push({art:"warnung",text:kurz.length+" Schar(en) laufen an der Spitze auf null aus."});
 if(lukaBleche().length&&!lukaRollenbreiten().length)
  m.push({art:"warnung",text:"Es ist keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet."});
 return m;
}

// ---- Anzeige ---------------------------------------------------------------
function lukaKarte(titel,inhalt){
 return `<div class="card"><h2>${esc(titel)}</h2>${inhalt}</div>`;
}
function lukaFeld(label,inhalt,voll){
 return `<div${voll?' style="grid-column:1/-1"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function lukaZahlFeld(label,id,wert,schritt,pflicht){
 return lukaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${
   pflicht?' data-pflicht="1"':""} inputmode="${
   (schritt&&schritt!=="1")?"decimal":"numeric"}" value="${wert===""||wert===null||wert===undefined?"":esc(wert)}">`);
}
function lukaGrunddatenHtml(){
 const a=lukA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>
   `<option value="${esc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`)).join("");
 return `<div class="info">Die dreieckige Seitenwange einer Lukarne. Material und
Seite gelten für die ganze Aufnahme; die Masse folgen im nächsten Register.</div>
<div class="grid">
${lukaFeld("Material",`<select id="luka_material" data-pflicht="1">${matOpt}</select>`,true)}
${lukaFeld("Seite",`<select id="luka_seite">
<option value="rechts"${a.seite!=="links"?" selected":""}>Rechte Seite</option>
<option value="links"${a.seite==="links"?" selected":""}>Linke Seite</option></select>`)}
</div>
<div class="small" style="color:var(--muted);margin-top:6px">Die Seite dreht im Plan
und in der Scharentabelle nur die Ansicht – gerechnet wird gleich.</div>
<div class="bar" style="margin-top:8px">
<button type="button" class="gray" id="luka_einstellungen">⚙️ Standardwerte und Zugaben</button>
</div>`;
}
function lukaGeometrieHtml(){
 const a=lukA, g=lukaErgebnis();
 const wert=(l,v)=>`<div><label>${esc(l)}</label><div class="ra-wert">${v}</div></div>`;
 const kennzahlen=g?`<div class="grid ra-kennzahlen" style="margin-top:10px">
${wert("Waagerechte Breite",lukaMm(g.W)+" mm")}
${wert("Schräge A (Dach)",lukaMm(g.A)+" mm")}
${wert("Anzahl Scharen",String(g.anzahl))}
${wert("Verwendeter Hilfsriss",lukaMm(g.hilfsriss)+" mm")}
</div>`:`<div class="ra-warnung" style="margin-top:10px">Bitte Höhe, obere Länge, Winkel
und Achsabstand eingeben. Der obere Innenwinkel muss zwischen 90° und 180° liegen.</div>`;
 const hinweis=g?(g.gekuerzt
  ? `<div class="ra-warnung">Bei der letzten Scharlinie (Nr. ${g.anzahl}) ist die Wange nur
noch ${lukaMm(g.maxHilfsriss)} mm hoch. Der gewünschte Hilfsriss von ${lukaMm(g.hilfsrissWunsch)} mm
würde sie nicht mehr schneiden – gerechnet wird mit <b>${lukaMm(g.hilfsriss)} mm</b>.</div>`
  : `<div class="ra-ok">Der Hilfsriss schneidet alle Scharen.</div>`):"";
 return `<div class="info">Vordere Kante senkrecht, obere Kante im Innenwinkel α dazu,
beide treffen sich hinten in der Spitze. Der Hilfsriss ist die waagerechte Reisslinie,
ab der jede Schar nach oben und unten abgemessen wird.</div>
<div class="grid">
${lukaZahlFeld("Vordere Höhe H (mm)","luka_hoehe",a.hoehe,"1",true)}
${lukaZahlFeld("Obere Länge L (mm)","luka_laengeOben",a.laengeOben,"1",true)}
${lukaZahlFeld("Oberer Innenwinkel α (°)","luka_winkel",a.winkel,"0.1",true)}
${lukaZahlFeld("Achsabstand Scharen (mm)","luka_achsabstand",a.achsabstand,"1",true)}
${lukaZahlFeld("Hilfsriss unter Oberkante (mm)","luka_hilfsriss",a.hilfsriss)}
${lukaZahlFeld("Längenzugabe Zuschnitt (mm)","luka_zugabeLaenge",a.zugabeLaenge)}
${lukaZahlFeld("Breitenzugabe Zuschnitt (mm)","luka_zugabeBreite",a.zugabeBreite)}
</div>
${kennzahlen}
${hinweis}
<div id="luka_plan" class="eb-diagram-box eb-diagram-scroll" style="margin-top:10px">${
 lukPlanSvg(g)}</div>
<div class="small" style="color:var(--muted);margin-top:-4px">Der Plan lässt sich seitlich verschieben.</div>`;
}
// Die Scharentabelle kommt vollstaendig aus der Fachrechnung - hier wird
// nichts nachgerechnet und nichts von Hand eingegeben.
function lukaScharenHtml(){
 const g=lukaErgebnis();
 if(!g)return `<div class="ra-warnung">Bitte zuerst die Geometrie erfassen.</div>`;
 const gespiegelt=g.seite==="links";
 const li=gespiegelt?"Hinten":"Vorne", re=gespiegelt?"Vorne":"Hinten";
 const zeilen=g.scharen.map(s=>{
  const letzte=s.nr===g.anzahl&&g.anzahl>1;
  return `<tr${letzte?' class="ra-dila-zeile"':""}>
<td>${s.nr}${letzte?' <span class="small">Rest</span>':""}</td>
<td>${lukaMm(s.abFront)}</td>
<td>${lukaMm(s.breite)}</td>
<td>${lukMass(s["hrOben"+li])}</td>
<td>${lukMass(s["hrUnten"+li])}</td>
<td>${lukMass(s["laenge"+li])}</td>
<td>${lukMass(s["hrOben"+re])}</td>
<td>${lukMass(s["hrUnten"+re])}</td>
<td>${lukMass(s["laenge"+re])}</td>
<td><b>${lukaMm(s.zuschnittLaenge)} × ${lukaMm(s.zuschnittBreite)}</b></td>
</tr>`;
 }).join("");
 const zugabe=(g.zugabeLaenge||g.zugabeBreite)
  ? `Zuschnitt inkl. Zugabe ${lukaMm(g.zugabeBreite)} mm Breite / ${lukaMm(g.zugabeLaenge)} mm Länge.`
  : "Zuschnitt ohne Zugabe.";
 return `<div class="info">Alle Werte kommen aus der Berechnung – hier wird nichts
von Hand eingegeben. „↑/↓ ab HR“ ist das Mass ab dem Hilfsriss nach oben bzw. unten.</div>
<div class="scroll"><table class="eb-table" style="table-layout:auto;min-width:640px">
<thead>
<tr><th rowspan="2">Nr.</th><th rowspan="2">ab Front</th><th rowspan="2">Breite</th>
<th colspan="3">Linke Kante</th><th colspan="3">Rechte Kante</th>
<th rowspan="2">Zuschnitt<br>L × B</th></tr>
<tr><th>↑ ab HR</th><th>↓ ab HR</th><th>Höhe</th><th>↑ ab HR</th><th>↓ ab HR</th><th>Höhe</th></tr>
</thead><tbody>${zeilen}</tbody></table></div>
<div class="small" style="margin-top:6px">Letzte Schar als <b>Restbreite ${
 lukaMm(g.breiten[g.anzahl-1])} mm</b> · ${esc(zugabe)}</div>`;
}
function lukaAusmassHtml(){
 const z=lukaAusmassZeilen();
 const mat=lukaMaterialTabelle();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst die Geometrie erfassen.</div>`;
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe. Ohne
Artikelnummern und ohne Preise – die Materialliste der Firma kommt später dazu.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td>
<td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:14px">Material</h2>
${mat.length?`<div class="ra-ok">${esc(mat[0].name)}</div>`
 :`<div class="ra-warnung">Es ist noch kein Material gewählt.</div>`}`;
}
function lukaKontrolleHtml(){
 const m=lukaPruefungen(), g=lukaErgebnis();
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td>${esc(lukaMaterialText())}</td></tr>
<tr><td>Seite</td><td>${esc(lukaSeiteText())}</td></tr>
<tr><td>Höhe H / obere Länge L</td><td>${lukaMm(lukA.hoehe)} / ${lukaMm(lukA.laengeOben)} mm</td></tr>
<tr><td>Winkel α</td><td>${esc(lukaZahl(lukA.winkel))}°</td></tr>
<tr><td>Achsabstand</td><td>${lukaMm(lukA.achsabstand)} mm</td></tr>
<tr><td>Scharen</td><td>${g?g.anzahl:"–"}</td></tr>
<tr><td>Restbreite letzte Schar</td><td>${g?lukaMm(g.breiten[g.anzahl-1])+" mm":"–"}</td></tr>
<tr><td>Hilfsriss</td><td>${g?lukaMm(g.hilfsriss)+" mm":"–"}</td></tr>
<tr><td>Zugaben (Länge / Breite)</td><td>${lukaMm(lukA.zugabeLaenge)} / ${lukaMm(lukA.zugabeBreite)} mm</td></tr>
<tr><td>Fläche</td><td>${g?lukaQm(g.flaeche)+" m²":"–"}</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register und Blaettern ------------------------------------------------
function lukaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function lukaSetzeSchritt(n){
 lukaSchritt=Math.max(1,Math.min(LUKA_REGISTER.length,Number(n)||1));
 renderLukarneAufnahme();
 const kopf=$("luka_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function lukaRegisterHtml(){
 const pr=lukaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return `<div class="ra-register" id="luka_register">`+LUKA_REGISTER.map(r=>{
  const marke=r.nr===LUKA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===lukaSchritt?" aktiv":""}" data-luka-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function lukaKopfInhalt(){
 if(lukaSchritt===1)return lukaKarte("1 · Grunddaten",lukaGrunddatenHtml());
 if(lukaSchritt===2)return lukaKarte("2 · Geometrie",lukaGeometrieHtml());
 if(lukaSchritt===3)return lukaKarte("3 · Scharen",lukaScharenHtml());
 if(lukaSchritt===4)return lukaKarte("4 · Zuschnitt aus Rollenblech",
   zuRollenAuswahlHtml(lukA.rollenAuswahl,"data-luka-rolle")+zuschnittHtml(lukaZuschnittPlan()));
 if(lukaSchritt===5)return lukaKarte("5 · Ausmass und Material",lukaAusmassHtml());
 return lukaKarte("6 · Kontrolle",lukaKontrolleHtml());
}
function renderLukarneAufnahme(){
 const ziel=$("lukarneAufnahme");
 if(!ziel)return;
 lukaVerdrahten();
 lukaBruecke();
 ziel.innerHTML=lukaRegisterHtml()+lukaKopfInhalt()+`<div class="bar ra-blaettern">
<button type="button" class="gray" id="luka_zurueck"${lukaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="luka_weiter">${
 lukaSchritt>=LUKA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(LUKA_REGISTER[lukaSchritt].kurz)}</button>
</div>`;
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("luka_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet - sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen des Registers "Geometrie".
function lukaLive(){
 if(lukaSchritt!==2)return;
 lukaBruecke();
 const g=lukaErgebnis();
 const werte=document.querySelectorAll("#lukarneAufnahme .ra-kennzahlen .ra-wert");
 if(g&&werte.length===4){
  werte[0].textContent=lukaMm(g.W)+" mm";
  werte[1].textContent=lukaMm(g.A)+" mm";
  werte[2].textContent=String(g.anzahl);
  werte[3].textContent=lukaMm(g.hilfsriss)+" mm";
 }
 const plan=$("luka_plan");
 if(plan)plan.innerHTML=lukPlanSvg(g);
 // Die Marke am Kontroll-Register nachfuehren, ohne neu zu zeichnen.
 const pr=lukaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#luka_register [data-luka-schritt="'+LUKA_KONTROLLE+'"]');
 if(knopf){
  const alt=knopf.querySelector(".ra-register-punkt");
  if(alt)alt.remove();
  if(pr.length){
   const s=document.createElement("span");
   s.className="ra-register-punkt"+(fehler?" fehler":"");
   knopf.appendChild(s);
  }
 }
}
function lukaVerdrahten(){
 const wurzel=$("measTypeLukarne");
 if(!wurzel||wurzel.dataset.lukaVerdrahtet)return;
 wurzel.dataset.lukaVerdrahtet="1";

 const zahlFelder={luka_hoehe:"hoehe",luka_laengeOben:"laengeOben",luka_winkel:"winkel",
   luka_achsabstand:"achsabstand",luka_hilfsriss:"hilfsriss",
   luka_zugabeLaenge:"zugabeLaenge",luka_zugabeBreite:"zugabeBreite"};

 wurzel.addEventListener("input",e=>{
  const feld=zahlFelder[e.target.id];
  if(!feld)return;
  lukA[feld]=e.target.value;
  lukaLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target;
  // Rollenauswahl fuer DIESE Massaufnahme (gemeinsamer Kasten, js/33)
  {const w=zuRollenKlick(t,"data-luka-rolle");
   if(w!==null){lukA.rollenAuswahl=w; renderLukarneAufnahme(); return}}
  if(t.id==="luka_material"){lukA.material=t.value; renderLukarneAufnahme(); return}
  if(t.id==="luka_seite"){lukA.seite=t.value==="links"?"links":"rechts"; renderLukarneAufnahme(); return}
  // Eine Zifferneingabe zeichnet auch beim Verlassen nicht neu.
  if(zahlFelder[t.id]!==undefined){lukA[zahlFelder[t.id]]=t.value; lukaLive(); return}
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-luka-schritt]");
  if(reg){lukaSetzeSchritt(reg.dataset.lukaSchritt);return}
  if(t.id==="luka_zurueck"){lukaSetzeSchritt(lukaSchritt-1);return}
  if(t.id==="luka_weiter"){
   if(lukaSchritt>=LUKA_REGISTER.length)lukaAbschluss();
   else lukaSetzeSchritt(lukaSchritt+1);
   return;
  }
  if(t.id==="luka_einstellungen"){
   // Derselbe Weg wie der bestehende Knopf in js/19 - kein zweiter Aufbau.
   const alt=$("openLukarneSettings");
   if(alt)alt.click();
   return;
  }
 });
}

// ---- Speichern / Laden -----------------------------------------------------
// js/16 schreibt weiterhin genau dieselben Felder wie bisher; hier kommen nur
// die neuen dazu. Eine Aufnahme vor v2.87 oeffnet unveraendert.
function lukaZusatzDaten(){
 const rp=lukaRollenPlan();
 return {
  flaeche_m2:Number(lukaFlaecheM2().toFixed(3)),
  ausmass:lukaAusmassZeilen(),
  zuschnitt:{auswahl:(lukA.rollenAuswahl||[]).slice(),
             breiten:lukaRollenbreiten(),
             netto:Number(rp.netto.toFixed(3)),
             bestes:rp.bestes||null,
             moeglich:rp.moeglich||[],
             gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,tafelLaenge:g.tafelLaenge,
               streifen:(g.streifen||[]).map(s=>({
                 stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,
                   breite:x.breite,merkmal:x.merkmal||""})),
                 rest:s.rest}))})),
             optimal:rp.optimal!==false}
 };
}
function lukaZuruecksetzen(){
 lukA=lukaLeer();
 lukaSchritt=1;
 renderLukarneAufnahme();
}
function lukaFuellen(d){
 const w=d||{};
 const a=lukaLeer();
 a.material=w.material??"";
 a.seite=w.seite==="links"?"links":"rechts";
 a.hoehe=(w.hoehe===0||w.hoehe)?w.hoehe:"";
 a.laengeOben=(w.laengeOben===0||w.laengeOben)?w.laengeOben:"";
 if(w.winkel===0||w.winkel)a.winkel=w.winkel;
 if(w.achsabstand===0||w.achsabstand)a.achsabstand=w.achsabstand;
 // hilfsrissWunsch ist der eingegebene Wert; "hilfsriss" waere der bereits
 // gekuerzte - ohne den Wunsch wird der gekuerzte genommen, es wird keiner
 // erfunden.
 const hr=(w.hilfsrissWunsch===0||w.hilfsrissWunsch)?w.hilfsrissWunsch:w.hilfsriss;
 if(hr===0||hr)a.hilfsriss=hr;
 if(w.zugabeLaenge===0||w.zugabeLaenge)a.zugabeLaenge=w.zugabeLaenge;
 if(w.zugabeBreite===0||w.zugabeBreite)a.zugabeBreite=w.zugabeBreite;
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v2.87), bleibt es leer = ganzes Lager.
 const rq=(w.zuschnitt&&w.zuschnitt.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 lukA=a;
 lukaSchritt=1;
 renderLukarneAufnahme();
}
