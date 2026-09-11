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
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Schnitt",hilfe:"anb-schnitt"},{nr:3,kurz:"Segmente",hilfe:"anb-segmente"},
 {nr:4,kurz:"Stückliste",hilfe:"anb-stueckliste"},{nr:5,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:6,kurz:"Ausmass",hilfe:"reg-ausmass"},
 {nr:7,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const ANBA_KONTROLLE=ANBA_REGISTER.length;
let anbaSchritt=1;
// true, solange die Registerflaeche neu gezeichnet wird. Chromium feuert auf
// einem Eingabefeld, das gerade den Fokus hat, beim Ersetzen des Inhalts noch
// ein change - und der Knoten meldet sich dabei als weiterhin im Dokument
// (gemessen, CLAUDE.md 103.4). Ohne diese Sperre schriebe der delegierte
// Handler den alten Feldwert in den GERADE FRISCH gesetzten Zustand zurueck.
// Waehrend des Zeichnens ist kein input/change eine echte Benutzereingabe.
let anbaZeichnet=false;
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
 const alleBleche=anbaBleche();
// v3.27: passende Reststuecke fallen VOR der Rollenrechnung aus dem Bedarf.
// Gerechnet wird in restVorabzug() (js/42) mit der bestehenden Packrechnung;
// bei ausgeschalteter Einstellung kommt die Liste unveraendert zurueck.
 const vor=ebaVorabzug(alleBleche,{material:(typeof anbaMaterialWert==="function")?anbaMaterialWert():null,
   abwicklung:alleBleche.length?alleBleche[0].breite:0});
 const bleche=vor.bleche;
 const netto=anbaFlaecheM2();
 if(!bleche.length||typeof ebaFormatPlan!=="function")
  return {gruppen:[],moeglich:[],zuSchmal:[],bestes:null,netto,optimal:true,
          ...ebaFormLeer((typeof anbaMaterialWert==="function")?anbaMaterialWert():null),
          ausResten:vor.ausResten};
 const B=bleche[0].breite;
 // v3.33: Rolle oder Tafel entscheidet der Materialbestand bzw. die Wahl an
 // der Massaufnahme - gerechnet wird beides mit DERSELBEN Packrechnung.
 const fm=ebaFormate({material:(typeof anbaMaterialWert==="function")?anbaMaterialWert():null,
   abwicklung:B});
 const p=ebaFormatPlan({gruppen:[{breite:B,stuecke:bleche,bleche}],
   formate:fm.formate,form:fm.form,netto});
 return {gruppen:p.gruppen,moeglich:p.moeglich,zuSchmal:p.zuSchmal,
   zuLang:p.zuLang,zuKurz:p.zuKurz,bestes:p.bestes,netto:p.netto,
   optimal:p.optimal,form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,
   formate:p.formate,ausResten:vor.ausResten};
}
// Der Plan in der gemeinsamen Form (js/33).
function anbaZuschnittPlan(){
 const rp=anbaRollenPlan();
 return {art:rp.form, form:rp.form,
  formGrund:rp.formGrund, formQuelle:rp.formQuelle,
  einheit:"Stück",
  material:(typeof anbaMaterialWert==="function")?(anbaMaterialWert()||null):null,
  einleitung:(typeof zuEinleitung==="function")?zuEinleitung(rp.form):"",
  quelle:(typeof zuQuelle==="function")?zuQuelle(rp.form):"",
  leer:(typeof ebaLeerText==="function")
    ?ebaLeerText({form:rp.form,formate:rp.formate||[]},
       anbaBleche().length?"":"Noch nichts zuzuschneiden – bitte zuerst Segmente mit einer Länge erfassen.")
    :"",
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  zuLang:rp.zuLang||[], zuKurz:rp.zuKurz||[],
  zuSchmal:rp.zuSchmal, ausResten:(rp.ausResten||[]), optimal:rp.optimal!==false};
}

// ---- Ausmass ----------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function anbaAusmassZeilen(){
 const e=anbaEingaben(), erg=anbaErgebnis();
 const z=[]; let pos=0;
 // v3.17: teil sagt, ob die Zeile ein Teil ist, das beschafft wird (Halbfabrikat,
 // gekaufter Artikel), oder ein abgeleitetes Mass. Die Reservierung nimmt nur
 // Teile. Ohne vierten Wert gilt "abgeleitet" - eine Zahl ueber die Arbeit ist
 // nichts, was jemand aus dem Lager holt.
 const zeile=(bez,menge,einheit,herkunft,teil)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:teil===true});
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
  zeile("Bleilappen",String(erg.anzahlBleilappen),"Stk.","Länge ÷ Lattenabstand",true);
 const letztes=(erg.stuecke||[])[(erg.stuecke||[]).length-1];
 if(letztes&&letztes.gehrung)
  zeile("Endstück mit Firstgehrung","1","Stk.","Zuschlag aus den Einstellungen");
 (erg.ohneZuschnitt||[]).forEach(n=>
  zeile(n+" (eigenes Material)","–","","nicht im Blechzuschnitt",true));
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
 // v3.66: alle Masse (auch b, c, d ... je nach Art) und die Anschluss-
 // masse (Aufkantungen usw.) sind Pflichtfelder ohne Vorgabewert mehr.
 // anbaEingaben() macht aus einem leeren Feld schon eine 0 - hier wird
 // deshalb der rohe Feldwert gebraucht.
 const roh=(typeof anbEingabenRoh==="function")?anbEingabenRoh():{};
 const fehltLeer=(wert,text)=>{if(wert===""||wert===null||wert===undefined)m.push({art:"fehler",text})};
 const schema=(typeof ANB_ARTEN==="object"&&ANB_ARTEN[e.art])?ANB_ARTEN[e.art].masse:null;
 if(schema)Object.keys(schema).forEach(k=>{
  if(k==="a")return;   // eigene Meldung oben
  fehltLeer(roh[k],"Mass "+k+" fehlt.");
 });
 fehltLeer(roh.stossLaenge,"Die Stücklänge fehlt.");
 fehltLeer(roh.ueberlappung,"Die Überlappung am Stoss fehlt.");
 if(e.art!=="steck"&&e.art!=="pv_seite"){
  if(e.ausfuehrung==="ort"){
   fehltLeer(roh.ortAufkantung,"Die Aufkantung über Dach fehlt.");
   fehltLeer(roh.ortOben,"Der Übergriff Ortbrett fehlt.");
   fehltLeer(roh.ortStirn,"Die Stirnhöhe fehlt.");
   fehltLeer(roh.ortNase,"Die Wassernase fehlt.");
  }else fehltLeer(roh.wandAufkantung,"Die Aufkantung an der Wand fehlt.");
 }
 if(e.art==="bleilappen")fehltLeer(roh.lattenabstand,"Der Lattenabstand fehlt.");
 const segmente=Array.isArray(e.segmente)?e.segmente.filter(s=>anbaZahl(s.laenge)>0):[];
 if(!segmente.length)
  m.push({art:"fehler",text:"Es ist noch kein Segment mit einer Länge erfasst – ohne Länge gibt es keine Stückliste."});
 (Array.isArray(e.segmente)?e.segmente:[]).forEach((s,i)=>{
  if(s.laenge===""||s.laenge===null||s.laenge===undefined)
   m.push({art:"fehler",text:"Segment "+(i+1)+": die Länge fehlt."});
  else if(anbaZahl(s.laenge)<0)m.push({art:"fehler",text:"Segment "+(i+1)+" hat eine negative Länge."});
  if(s.knick&&!(anbaZahl(s.knickWinkel)!==0||anbaZahl(s.knickMass)!==0))
   m.push({art:"warnung",text:"Segment "+(i+1)+" ist als Knick markiert, hat aber weder Winkel noch Mass."});
 });
 if(roh.stossLaenge!==""&&roh.ueberlappung!==""&&anbaZahl(e.ueberlappung)>=anbaZahl(e.stossLaenge))
  m.push({art:"fehler",text:"Die Überlappung ist grösser oder gleich der Stücklänge."});
 const plan=anbaRollenPlan();
 // v3.33: die Meldung nennt, woraus wirklich geschnitten wird.
 const anbaTafel=plan.form==="tafel";
 if(anbaBleche().length&&!(plan.formate||[]).length)
  m.push({art:"warnung",text:"Es ist "+(anbaTafel?"kein Tafelformat":"keine Rollenbreite")
    +" hinterlegt – der Materialbedarf wird nicht gerechnet."});
 else if(anbaBleche().length&&!plan.bestes)
  m.push({art:"warnung",text:(anbaTafel
    ?"Kein hinterlegtes Tafelformat passt zu diesem Zuschnitt ("
    :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung (")
    +anbaMm(erg.abwicklung)+" mm)."});
 return m;
}

// ---- Anzeige ----------------------------------------------------------------
function anbaKarte(titel,inhalt){
 // Info-Knopf nur an der Hauptkarte des Registers (js/41-hilfe.js).
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,ANBA_REGISTER):"";
 return `<div class="card"><h2>${esc(titel)}${h}</h2>${inhalt}</div>`;
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
 // Der Foto-/Skizzenbereich haengt am Register: nur das letzte zeigt ihn.
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
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
 anbaZeichnet=true;
 try{
 if(leiste)leiste.innerHTML=anbaRegisterHtml();
 for(let n=1;n<=ANBA_REGISTER.length;n++){
  const seite=$("anba_seite"+n);
  if(seite)seite.hidden=(n!==anbaSchritt);
 }
 if(anbaSchritt===5){
  const z=$("anba_seite5");
  const azp=anbaZuschnittPlan();
  if(z)z.innerHTML=anbaKarte(zuTitel(5,azp.art),
    ((typeof zuAuswahlHtml==="function")?zuAuswahlHtml(anbaRollenAuswahl,"data-anba-rolle",azp.art):"")
    +((typeof zuschnittHtml==="function")?zuschnittHtml(azp):""));
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
 }finally{anbaZeichnet=false}
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
 wurzel.addEventListener("input",()=>{if(anbaZeichnet)return;anbaMarkeNachfuehren()});
 wurzel.addEventListener("change",e=>{
  if(anbaZeichnet)return;
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
   if(!pflichtPruefenUndSpringen(wurzel))return;
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
  // Der Kontrollstand wird MITGESPEICHERT, damit ihn der Ausdruck zeigen
  // kann, ohne ihn neu zu rechnen - genauso wie Ausmass und Rollenplan.
  kontrolle:anbaPruefungen(),
  zuschnitt:{auswahl:(anbaRollenAuswahl||[]).slice(),
             breiten:anbaRollenbreiten(),
             // v3.33: ohne die Form kann der Ausdruck nicht sagen, ob von der
             // Rolle oder aus der Tafel geschnitten wurde.
             form:rp.form, formGrund:rp.formGrund||"", formQuelle:rp.formQuelle||"",
             formLaenge:rp.bestes?(rp.bestes.laenge||null):null,
             netto:Number(rp.netto.toFixed(3)),
             bestes:rp.bestes||null,
             moeglich:rp.moeglich||[],
             gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
               abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
               streifen:(g.streifen||[]).map(s=>({
                 stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                   merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
                 rest:s.rest}))})),
             optimal:rp.optimal!==false,
          // v3.29: die Stuecke aus vorhandenen Resten - sie fielen bis v3.28
          // beim Speichern weg und fehlten dadurch im gespeicherten Plan ganz.
          ausResten:ebaAusRestenSpeicher(rp.ausResten)}
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
