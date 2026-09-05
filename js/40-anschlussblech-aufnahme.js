"use strict";
// ============================================================================
// Ort- und Seitenbleche · Aufnahme in sieben Registern (v3.01)
//
//   1 Grunddaten · 2 Schnitt · 3 Segmente · 4 Stückliste ·
//   5 Zuschnitt · 6 Ausmass · 7 Kontrolle
//
// Elftes und letztes rechnendes Modul nach demselben Muster wie Rinne
// Halbrund (v2.71) bis Rinne Zuschnittliste (v3.00). Danach hat nur noch
// "Skizze / Foto" bewusst keine Register (CLAUDE.md 89.1).
//
// WIE BEI DER RINNE-ZUSCHNITTLISTE (104.2) GIBT ES KEINEN STUMMEL:
// js/20-anschlussblech.js hängt seine Handler DIREKT an #anb_segmenteBody,
// #anb_deckung, #anb_art, #anb_ausfuehrung und die Zahlenfelder und zeichnet
// selbst in #anb_masse, #anb_abschluss, #anb_zeichnung, #anb_ergebnis und
// #anb_stuecklisteBody. Ein Neuschreiben per innerHTML würde diese Elemente
// samt Handler vernichten. Die Register 1 bis 4 stehen deshalb FEST im HTML
// und werden nur ein- und ausgeblendet; js/40 schreibt ausschliesslich in die
// Register 5 bis 7, in die Registerleiste und in die Blätterleiste.
//
// Die FACHRECHNUNG bleibt js/20-anschlussblech.js - byteweise unverändert.
// Gerechnet wird über anbEingabenAusFeldern() und berechneAnschlussblech();
// es gibt KEINEN Nachbau. Die Grundlage "Dimensionierung der Anschlussbleche"
// [7.3.37] bleibt damit unverändert die Referenz.
// ============================================================================

const ANBA_REGISTER=[
 {nr:1,kurz:"Grunddaten"},{nr:2,kurz:"Schnitt"},{nr:3,kurz:"Segmente"},
 {nr:4,kurz:"Stückliste"},{nr:5,kurz:"Zuschnitt"},{nr:6,kurz:"Ausmass"},
 {nr:7,kurz:"Kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const ANBA_KONTROLLE=ANBA_REGISTER.length;
let anbaSchritt=1;
// Welche Rollen fuer DIESE Massaufnahme gelten. Leer = ganzes Blechlager.
let anbaRollenAuswahl=[];

const anbaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const anbaMm=v=>Math.round(anbaZahl(v)).toLocaleString("de-CH");
const anbaQm=v=>anbaZahl(v).toFixed(2).replace(".",",");
const anbaMeter=v=>(anbaZahl(v)/1000).toFixed(2).replace(".",",");

// ---- Brücke zur Fachrechnung (js/20) ---------------------------------------
// Die Felder sind wie bisher die Quelle der Wahrheit; dieses Modul haelt
// keinen zweiten Zustand.
function anbaEingaben(){
 return (typeof anbEingabenAusFeldern==="function")?anbEingabenAusFeldern():null;
}
function anbaErgebnis(){
 const e=anbaEingaben();
 if(!e||typeof berechneAnschlussblech!=="function")return null;
 return berechneAnschlussblech(e);
}
function anbaMaterialWert(){
 return $("anb_material")?$("anb_material").value:"";
}
function anbaMaterialText(){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(anbaMaterialWert()):null;
 return m?m.name:"kein Material gewählt";
}
function anbaTitelText(){
 const e=anbaEingaben();
 return (e&&typeof anbTitel==="function")?anbTitel(e):"Ort- und Seitenbleche";
}

// ---- Zuschnitte -------------------------------------------------------------
// Ein Stueck der Stueckliste ist EIN Zuschnitt: Laenge aus der Stueckliste,
// Breite = Abwicklung (bei diesem Modul fuer alle Stuecke dieselbe).
//
// merkmal trennt die Gruppen in der Zuschnittliste (js/33): das Endstueck mit
// Firstgehrung ist ein anderer Zuschnitt als ein gerades Stueck derselben
// Laenge - es wird zusaetzlich auf Gehrung geschnitten.
function anbaBleche(){
 const erg=anbaErgebnis();
 const out=[];
 if(!erg)return out;
 const breite=Math.round(anbaZahl(erg.abwicklung));
 if(!(breite>0))return out;
 (erg.stuecke||[]).forEach(s=>{
  const l=Math.round(anbaZahl(s.laenge));
  if(!(l>0))return;
  out.push({nr:s.nr,laenge:l,breite,
    merkmal:s.gehrung?"Firstgehrung":"",
    hinweis:s.gehrung?("inkl. "+anbaMm(anbaZahl(s.laenge)-anbaZahl(s.laengeOhneGehrung))+" mm Gehrungszugabe"):""});
 });
 return out;
}
function anbaFlaecheM2(){
 return anbaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
}
function anbaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(anbaRollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
// Alle Stuecke haben dieselbe Breite - eine Gruppe. Gepackt wird mit derselben
// Packrechnung wie ueberall (ebaPackeInStreifen, js/29). Es gibt in der App
// nur EINE.
function anbaRollenPlan(){
 const bleche=anbaBleche();
 const breiten=anbaRollenbreiten();
 const netto=anbaFlaecheM2();
 if(!bleche.length||!breiten.length||typeof ebaPackeInStreifen!=="function")
  return {gruppen:[],moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 const B=bleche[0].breite;
 // Ein Abschnitt ist so lang wie das laengste Stueck.
 const L=Math.max.apply(null,bleche.map(x=>x.laenge));
 const v=ebaPackeInStreifen(bleche,L);
 const gruppe={breite:B,stuecke:bleche,abschnittLaenge:L,streifen:v.streifen||[]};
 const moeglich=[], zuSchmal=[];
 breiten.forEach(R=>{
  const jeAbschnitt=Math.floor(R/B);
  if(jeAbschnitt<1){zuSchmal.push(R);return}
  const abschnitte=Math.ceil(gruppe.streifen.length/jeAbschnitt);
  const rollenLaenge=abschnitte*L;
  const flaeche=R*rollenLaenge/1e6;
  moeglich.push({breite:R,flaeche,verschnitt:flaeche-netto,
    anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,rollenLaenge,
    zeilen:[{breite:B,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,abschnittLaenge:L,
      rollenLaenge,streifen:gruppe.streifen.length,restBreite:R-jeAbschnitt*B}]});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 const best=moeglich[0]||null;
 const gefuellt=Object.assign({},gruppe,{
   jeAbschnitt:best?best.zeilen[0].jeAbschnitt:1,
   abschnitte:best?best.zeilen[0].abschnitte:0,
   rollenLaenge:best?best.zeilen[0].rollenLaenge:0});
 return {gruppen:[gefuellt],moeglich,zuSchmal,bestes:best,netto,
   optimal:v.optimal!==false};
}
// Der Plan in der gemeinsamen Form (js/33).
function anbaZuschnittPlan(){
 const rp=anbaRollenPlan();
 return {art:"rolle", einheit:"Stück",
  einleitung:(typeof ZU_EINLEITUNG_ROLLE==="string")?ZU_EINLEITUNG_ROLLE:"",
  quelle:(typeof ZU_QUELLE_ROLLE==="string")?ZU_QUELLE_ROLLE:"",
  leer:!anbaBleche().length
    ?"Noch nichts zuzuschneiden – bitte zuerst Segmente mit einer Länge erfassen."
    :(!anbaRollenbreiten().length?"Es ist keine Rollenbreite hinterlegt."
    :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."),
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  zuSchmal:rp.zuSchmal, optimal:rp.optimal!==false};
}

// ---- Ausmass ----------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function anbaAusmassZeilen(){
 const e=anbaEingaben(), erg=anbaErgebnis();
 const z=[]; let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft});
 if(!e||!erg)return z;
 const segmente=Array.isArray(e.segmente)?e.segmente.filter(s=>anbaZahl(s.laenge)>0):[];
 if(!segmente.length&&!(erg.stuecke||[]).length)return z;
 zeile(anbaTitelText()+", Länge",anbaMeter(erg.laenge),"m","Summe der Segmentlängen");
 zeile("Segmente",String(segmente.length),"Stk.","erfasste Segmente");
 zeile("Zuschnittstücke",String((erg.stuecke||[]).length),"Stk.","aus Stücklänge und Überlappung");
 zeile("Zuschnittbreite",anbaMm(erg.abwicklung),"mm","Abwicklung des Schnitts");
 zeile("Materialfläche verlegt",anbaQm(erg.flaeche),"m²","Länge × Abwicklung");
 zeile("Blechfläche Zuschnitt",anbaQm(anbaFlaecheM2()),"m²","Zuschnittlängen × Abwicklung");
 (erg.teile||[]).forEach(t=>
  zeile("Abwicklung "+t.name,anbaMm(t.abwicklung),"mm","aus dem Schnitt"));
 const knicke=segmente.filter(s=>s.knick).length;
 if(knicke)zeile("Knicke im Verlauf",String(knicke),"Stk.","erfasste Knicke");
 if(erg.anzahlBleilappen!==null&&erg.anzahlBleilappen!==undefined)
  zeile("Bleilappen",String(erg.anzahlBleilappen),"Stk.","Länge ÷ Lattenabstand");
 const letztes=(erg.stuecke||[])[(erg.stuecke||[]).length-1];
 if(letztes&&letztes.gehrung)
  zeile("Endstück mit Firstgehrung","1","Stk.","Zuschlag aus den Einstellungen");
 (erg.ohneZuschnitt||[]).forEach(n=>
  zeile(n+" (eigenes Material)","–","","nicht im Blechzuschnitt"));
 return z;
}
function anbaMaterialTabelle(){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(anbaMaterialWert()):null;
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle --------------------------------------------------------------
// Nur Pruefungen, die sich aus dem bestehenden Modul und den erfassten Daten
// ableiten lassen. Es werden KEINE eigenen Grenzwerte erfunden - die
// Mindestmasse kommen unveraendert aus berechneAnschlussblech().
function anbaPruefungen(){
 const m=[];
 const e=anbaEingaben(), erg=anbaErgebnis();
 if(!anbaMaterialWert())m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 if(!e||!erg){
  m.push({art:"fehler",text:"Der Schnitt lässt sich nicht berechnen – bitte Deckmaterial und Anschlussart wählen."});
  return m;
 }
 if(!(anbaZahl(e.a)>0))
  m.push({art:"fehler",text:"Das Mass a fehlt – ohne es lässt sich das Blech nicht speichern."});
 // Die Mindestmasse der Norm sind ein Fehler, keine Geschmacksfrage.
 (erg.warnungen||[]).forEach(t=>m.push({art:"fehler",text:t}));
 const segmente=Array.isArray(e.segmente)?e.segmente.filter(s=>anbaZahl(s.laenge)>0):[];
 if(!segmente.length)
  m.push({art:"fehler",text:"Es ist noch kein Segment mit einer Länge erfasst – ohne Länge gibt es keine Stückliste."});
 (Array.isArray(e.segmente)?e.segmente:[]).forEach((s,i)=>{
  if(anbaZahl(s.laenge)<0)m.push({art:"fehler",text:"Segment "+(i+1)+" hat eine negative Länge."});
  if(s.knick&&!(anbaZahl(s.knickWinkel)!==0||anbaZahl(s.knickMass)!==0))
   m.push({art:"warnung",text:"Segment "+(i+1)+" ist als Knick markiert, hat aber weder Winkel noch Mass."});
 });
 if(!(anbaZahl(e.stossLaenge)>0))
  m.push({art:"fehler",text:"Die Stücklänge fehlt."});
 else if(anbaZahl(e.ueberlappung)>=anbaZahl(e.stossLaenge))
  m.push({art:"fehler",text:"Die Überlappung ist grösser oder gleich der Stücklänge."});
 if(e.art==="bleilappen"&&!(anbaZahl(e.lattenabstand)>0))
  m.push({art:"warnung",text:"Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden."});
 if(anbaBleche().length&&!anbaRollenbreiten().length)
  m.push({art:"warnung",text:"Es ist keine Rollenbreite hinterlegt – der Materialbedarf wird nicht gerechnet."});
 const plan=anbaRollenPlan();
 if(plan.zuSchmal.length&&!plan.bestes)
  m.push({art:"warnung",text:"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung ("
    +anbaMm(erg.abwicklung)+" mm)."});
 return m;
}

// ---- Anzeige ----------------------------------------------------------------
function anbaKarte(titel,inhalt){
 return `<div class="card"><h2>${esc(titel)}</h2>${inhalt}</div>`;
}
function anbaAusmassHtml(){
 const z=anbaAusmassZeilen();
 const mat=anbaMaterialTabelle();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst Segmente erfassen.</div>`;
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
function anbaKontrolleHtml(){
 const m=anbaPruefungen();
 const e=anbaEingaben(), erg=anbaErgebnis();
 const segmente=(e&&Array.isArray(e.segmente))?e.segmente.filter(s=>anbaZahl(s.laenge)>0):[];
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Ausführung</td><td>${esc(anbaTitelText())}</td></tr>
<tr><td>Material</td><td>${esc(anbaMaterialText())}</td></tr>
<tr><td>Segmente</td><td>${segmente.length}</td></tr>
<tr><td>Gesamtlänge</td><td>${erg?anbaMm(erg.laenge)+" mm":"–"}</td></tr>
<tr><td>Zuschnittbreite</td><td>${erg?anbaMm(erg.abwicklung)+" mm":"–"}</td></tr>
<tr><td>Zuschnittstücke</td><td>${erg?(erg.stuecke||[]).length:"–"}</td></tr>
<tr><td>Blechfläche</td><td>${anbaQm(anbaFlaecheM2())} m²</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register und Blättern --------------------------------------------------
function anbaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function anbaSetzeSchritt(n){
 anbaSchritt=Math.max(1,Math.min(ANBA_REGISTER.length,Number(n)||1));
 renderAnschlussblechAufnahme();
 const kopf=$("anba_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function anbaRegisterHtml(){
 const pr=anbaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return ANBA_REGISTER.map(r=>{
  const marke=r.nr===ANBA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===anbaSchritt?" aktiv":""}" data-anba-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("");
}
// Die Register 1 bis 4 stehen FEST im HTML (siehe Kopf dieser Datei) und
// werden nur ein- und ausgeblendet. Geschrieben wird ausschliesslich in die
// Register 5 bis 7.
function renderAnschlussblechAufnahme(){
 const wurzel=$("measTypeAnschlussblech");
 if(!wurzel)return;
 anbaVerdrahten();
 const leiste=$("anba_register");
 if(leiste)leiste.innerHTML=anbaRegisterHtml();
 for(let n=1;n<=ANBA_REGISTER.length;n++){
  const seite=$("anba_seite"+n);
  if(seite)seite.hidden=(n!==anbaSchritt);
 }
 if(anbaSchritt===5){
  const z=$("anba_seite5");
  if(z)z.innerHTML=anbaKarte("5 · Zuschnitt aus Rollenblech",
    ((typeof zuRollenAuswahlHtml==="function")?zuRollenAuswahlHtml(anbaRollenAuswahl,"data-anba-rolle"):"")
    +((typeof zuschnittHtml==="function")?zuschnittHtml(anbaZuschnittPlan()):""));
 }
 if(anbaSchritt===6){
  const z=$("anba_seite6");
  if(z)z.innerHTML=anbaKarte("6 · Ausmass und Material",anbaAusmassHtml());
 }
 if(anbaSchritt===7){
  const z=$("anba_seite7");
  if(z)z.innerHTML=anbaKarte("7 · Kontrolle",anbaKontrolleHtml());
 }
 const bl=$("anba_blaettern");
 if(bl)bl.innerHTML=`<button type="button" class="gray" id="anba_zurueck"${anbaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="anba_weiter">${
 anbaSchritt>=ANBA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(ANBA_REGISTER[anbaSchritt].kurz)}</button>`;
 const aktiv=leiste&&leiste.querySelector(".ra-register-knopf.aktiv");
 if(leiste&&aktiv){
  const sr=leiste.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)leiste.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)leiste.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Die Marke am Kontroll-Register nachfuehren, OHNE neu zu zeichnen - sonst
// verliert ein gerade bearbeitetes Feld von js/20 den Fokus.
function anbaMarkeNachfuehren(){
 const knopf=document.querySelector('#anba_register [data-anba-schritt="'+ANBA_KONTROLLE+'"]');
 if(!knopf)return;
 const pr=anbaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const alt=knopf.querySelector(".ra-register-punkt");
 if(alt)alt.remove();
 if(pr.length){
  const s=document.createElement("span");
  s.className="ra-register-punkt"+(fehler?" fehler":"");
  knopf.appendChild(s);
 }
}
function anbaVerdrahten(){
 const wurzel=$("measTypeAnschlussblech");
 if(!wurzel||wurzel.dataset.anbaVerdrahtet)return;
 wurzel.dataset.anbaVerdrahtet="1";

 // Jede Eingabe in den Registern 1 bis 4 gehoert js/20. Hier wird NICHT neu
 // gezeichnet - nur die Marke am Kontroll-Register nachgefuehrt.
 wurzel.addEventListener("input",()=>anbaMarkeNachfuehren());
 wurzel.addEventListener("change",e=>{
  const t=e.target;
  if(typeof zuRollenKlick==="function"){
   const w=zuRollenKlick(t,"data-anba-rolle");
   if(w!==null){anbaRollenAuswahl=w; renderAnschlussblechAufnahme(); return}
  }
  anbaMarkeNachfuehren();
 });
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-anba-schritt]");
  if(reg){anbaSetzeSchritt(reg.dataset.anbaSchritt);return}
  if(t.id==="anba_zurueck"){anbaSetzeSchritt(anbaSchritt-1);return}
  if(t.id==="anba_weiter"){
   if(anbaSchritt>=ANBA_REGISTER.length)anbaAbschluss();
   else anbaSetzeSchritt(anbaSchritt+1);
   return;
  }
  // Ein Klick in den Registern 1 bis 4 (Segment hinzufuegen oder loeschen)
  // gehoert js/20. Danach kann sich die Zahl der Hinweise geaendert haben -
  // die Marke wird nachgefuehrt, sonst nichts.
  setTimeout(anbaMarkeNachfuehren,0);
 });
}

// ---- Speichern / Laden ------------------------------------------------------
// js/16 schreibt weiterhin genau dieselben Felder wie bisher; hier kommen nur
// die neuen dazu. Eine Aufnahme vor v3.01 oeffnet unveraendert.
function anbaZusatzDaten(){
 const rp=anbaRollenPlan();
 return {
  flaeche_m2:Number(anbaFlaecheM2().toFixed(3)),
  ausmass:anbaAusmassZeilen(),
  zuschnitt:{auswahl:(anbaRollenAuswahl||[]).slice(),
             breiten:anbaRollenbreiten(),
             netto:Number(rp.netto.toFixed(3)),
             bestes:rp.bestes||null,
             moeglich:rp.moeglich||[],
             gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
               abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
               streifen:(g.streifen||[]).map(s=>({
                 stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                   merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
                 rest:s.rest}))})),
             optimal:rp.optimal!==false}
 };
}
// Wird von js/10 nach anbFormularZuruecksetzen()/anbFormularFuellen()
// aufgerufen - der Zustand selbst liegt in den Feldern von js/20.
function anbaZuruecksetzen(){
 anbaRollenAuswahl=[];
 anbaSchritt=1;
 renderAnschlussblechAufnahme();
}
function anbaFuellen(d){
 const w=d||{};
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v3.01), bleibt es leer = ganzes Blechlager.
 const rq=(w.zuschnitt&&w.zuschnitt.auswahl);
 anbaRollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 anbaSchritt=1;
 renderAnschlussblechAufnahme();
}
