"use strict";
// ---------------------------------------------------------------------------
// Lieferanten-Lager (v3.229 als "Lager B-Team", ab v3.231 mehrlieferantenfaehig)
//
// Ansage des Anwenders: "erstelle mal eine separate lagerverwaltung mit diesen
// bteam produkten... die alte lagerverwaltung und die regiematerialliste nicht
// anfassen."
//
// WARUM ES WIRKLICH SEPARAT IST, und nicht nur separat aussieht:
//
// Die bestehende Lagerverwaltung (js/68) sitzt auf materials - dem Katalog der
// FIRMA, mit ihren eigenen EDV-Nummern. Derselbe Katalog fuellt die
// Regiematerial-Liste, das Ausmass und den Zuschnitt. Ein Lieferantensortiment
// mit 439 FREMDEN Artikelnummern dort hineinzukippen wuerde zwei Nummernkreise
// vermischen und genau die beiden Listen veraendern, die unberuehrt bleiben
// sollen.
//
// Deshalb: eigene Tabellen (lieferanten_artikel, lieferanten_bewegungen),
// eigene Datei, eigener Dialog. An js/68, js/59, am Regierapport und an
// materials aendert diese Datei NICHTS - sie liest von dort auch nichts.
//
// Was sie sich TEILT, weil zwei Fassungen davon zwei Wahrheiten waeren:
//  - den Barcode-Scanner aus js/01 (barcodeScannen)
//  - den Excel-Import aus js/08 (initExcelImport)
//  - das Recht "Lager" (feature_access), also dieselbe Sichtbarkeit
//
// v3.231 - WARUM DAS LAGER NICHT MEHR "B-TEAM" HEISST:
// Der Lieferant stand bisher nur im Tabellennamen. Der zweite Lieferant haette
// dort keinen Platz gehabt, und Artikelnummern sind nur JE LIEFERANT
// eindeutig - eine "1001" gibt es bei jedem Haendler. Ohne den Lieferanten im
// Schluessel wuerde der naechste Import stillschweigend fremde Artikel
// ueberschreiben. Umbenannt wurde, solange das Lager 439 Artikel und NULL
// Buchungen trug: danach waere es eine Migration statt eines Umbenennens.
//
// Der Bestand ist wie drueben NIE ein Feld, sondern immer die Summe ueber die
// Bewegungen. Eine Buchung ist unveraenderlich - die Datenbank kennt fuer
// lieferanten_bewegungen kein Update und kein Delete. Ein Fehler wird durch
// eine Korrektur ausgeglichen, nicht durch Aendern der Vergangenheit.
// ---------------------------------------------------------------------------

const LF_SORTIMENT="daten/sortiment-bteam.json";
const LF_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};

let lfArtikel=[];
let lfBewegungen=[];
let lfSuche="";
let lfOffeneGruppen=new Set();
let lfGeladen=false;

function lfZahl(v){ const n=Number(v); return Number.isFinite(n)?n:0 }
function lfZahlText(v){
 const n=lfZahl(v);
 return Number.isInteger(n)?String(n):n.toFixed(2).replace(/\.?0+$/,"");
}
function lfMeldung(text,fehler){
 const m=(typeof $==="function")?$("liefMeldung"):null;
 if(!m)return;
 m.textContent=text||"";
 m.style.color=fehler?"var(--red)":"var(--muted)";
}

// Die Lieferanten, die im Lager wirklich vorkommen - abgeleitet aus den
// Artikeln, nicht als eigene Liste gefuehrt. Eine zweite Liste waere eine
// zweite Wahrheit darueber, welche Lieferanten es gibt.
function lfLieferanten(){
 return [...new Set(lfArtikel.map(a=>String(a.lieferant||"").trim()).filter(Boolean))].sort();
}

// ---- Laden ----------------------------------------------------------------
async function lfLaden(){
 if(typeof sb==="undefined")return false;
 try{
  const a=await sb.from("lieferanten_artikel").select("*").order("gruppe").order("bezeichnung");
  if(a.error)throw a.error;
  lfArtikel=a.data||[];
  const b=await sb.from("lieferanten_bewegungen").select("*").order("created_at",{ascending:false});
  if(b.error)throw b.error;
  lfBewegungen=b.data||[];
  lfGeladen=true;
  return true;
 }catch(e){
  lfArtikel=[]; lfBewegungen=[]; lfGeladen=false;
  lfMeldung("Das Lieferanten-Lager liess sich nicht laden: "+((e&&e.message)||e),true);
  return false;
 }
}

// Bestand = Summe der Bewegungen. Zugang positiv, Abgang negativ, Korrektur
// so, wie sie gebucht wurde (sie darf auch negativ sein).
function lfBestand(artikelId){
 return lfBewegungen.filter(b=>String(b.artikel_id)===String(artikelId))
  .reduce((s,b)=>s+(b.art==="abgang"?-lfZahl(b.menge):lfZahl(b.menge)),0);
}
function lfArtikelZuId(id){ return lfArtikel.find(a=>String(a.id)===String(id))||null }
function lfArtikelZuBarcode(code){
 const c=String(code||"").trim();
 if(!c)return null;
 return lfArtikel.find(a=>String(a.ean||"").trim()===c)||null;
}

// ---- Sortiment einlesen ---------------------------------------------------
// Die Liste liegt als Datei im Projekt (daten/sortiment-bteam.json) und wird
// erst beim Einlesen geholt - sie gehoert nicht in die App-Huelle, weil sie
// genau einmal gebraucht wird.
//
// Schluessel ist Lieferant + Artikelnummer: ein zweites Einlesen AKTUALISIERT
// dieselbe Position, statt sie zu verdoppeln. Geloescht wird nie - ein
// Artikel, der in der neuen Datei fehlt, bleibt stehen.
async function lfSortimentEinlesen(){
 if(typeof sb==="undefined")return;
 let daten=null;
 lfMeldung("Sortiment wird geholt …");
 try{
  const r=await fetch(LF_SORTIMENT,{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  daten=await r.json();
 }catch(e){
  lfMeldung("Die Sortimentsdatei liess sich nicht laden: "+((e&&e.message)||e),true);
  return;
 }
 const liste=(daten&&Array.isArray(daten.artikel))?daten.artikel:[];
 if(!liste.length){ lfMeldung("Die Sortimentsdatei enthält keine Artikel.",true); return }
 // Der Lieferant steht in der Datei, nicht im Code: eine zweite Datei bringt
 // ihren eigenen mit, ohne dass hier etwas zu aendern waere.
 const lieferant=String((daten&&daten.lieferant)||"").trim();
 if(!lieferant){
  lfMeldung("In der Sortimentsdatei fehlt die Angabe, von welchem Lieferanten sie ist.",true);
  return;
 }
 if(typeof confirm==="function"&&!confirm(
   liste.length+" Artikel von "+lieferant+" einlesen?\n\n"
  +"Bereits vorhandene Artikelnummern dieses Lieferanten werden aktualisiert, nichts wird gelöscht.\n"
  +"Der Materialkatalog der Firma und die bestehende Lagerverwaltung bleiben unberührt."))return;

 const zeilen=liste.map(a=>({
  lieferant,
  artikelnr:String(a.artikelnr||"").trim(),
  bezeichnung:String(a.bezeichnung||"").trim(),
  gruppe:a.gruppe||null, material:a.material||null,
  zuschnitt_mm:a.zuschnitt?lfZahl(a.zuschnitt):null,
  dicke_mm:a.dicke?lfZahl(a.dicke):null,
  laenge_m:a.laenge?lfZahl(a.laenge):null,
  wulst:a.wulst||null, vpe:a.vpe?lfZahl(a.vpe):null,
  ean:(a.ean&&String(a.ean).trim())?String(a.ean).trim():null,
  hinweis:a.hinweis||null
 })).filter(z=>z.artikelnr&&z.bezeichnung);

 lfMeldung(zeilen.length+" Artikel werden gespeichert …");
 try{
  // In Haeppchen, damit eine grosse Liste nicht an einer Zeitgrenze scheitert.
  for(let i=0;i<zeilen.length;i+=100){
   const r=await sb.from("lieferanten_artikel")
    .upsert(zeilen.slice(i,i+100),{onConflict:"company_id,lieferant,artikelnr"});
   if(r.error)throw r.error;
  }
 }catch(e){
  const t=String((e&&e.message)||e);
  // Der eindeutige Barcode ist Absicht - siehe Migration. Wenn er kippt, ist
  // die Datei das Problem, und das gehoert gesagt statt geraten.
  if(/lieferanten_artikel_ean_uniq/.test(t))
   lfMeldung("Zwei Artikel in der Datei tragen denselben Barcode. Ein Barcode muss eindeutig auf einen Artikel zeigen – sonst wäre beim Scannen nicht entscheidbar, welcher gemeint ist. Nichts wurde gespeichert.",true);
  else lfMeldung("Das Einlesen ist fehlgeschlagen: "+t,true);
  return;
 }
 await lfLaden();
 lfZeichnen();
 lfMeldung(zeilen.length+" Artikel von "+lieferant+" eingelesen.");
}

// ---- Buchen ---------------------------------------------------------------
let lfBuchenArtikelId=null;

function lfBuchenOeffnen(artikelId,art){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(artikelId);
 if(!a){ lfMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 lfBuchenArtikelId=a.id;
 $("liefBuchenTitel").textContent=a.bezeichnung;
 $("liefBuchenUnter").textContent=(a.lieferant?a.lieferant+" · ":"")+"Art.-Nr. "+a.artikelnr
  +(a.ean?" · "+a.ean:"")+" · Bestand "+lfZahlText(lfBestand(a.id));
 $("liefBuchenArt").value=art||"zugang";
 $("liefBuchenMenge").value=a.vpe?lfZahlText(a.vpe):"1";
 $("liefBuchenGrund").value="";
 $("liefBuchenFehler").textContent="";
 $("liefBuchenModal").hidden=false;
 setTimeout(()=>{ const f=$("liefBuchenMenge"); if(f){f.focus();f.select()} },60);
}
function lfBuchenSchliessen(){
 if(typeof $==="function"&&$("liefBuchenModal"))$("liefBuchenModal").hidden=true;
 lfBuchenArtikelId=null;
}
async function lfBuchenSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfBuchenArtikelId);
 if(!a)return;
 const art=$("liefBuchenArt").value;
 const menge=lfZahl($("liefBuchenMenge").value);
 if(!menge){ $("liefBuchenFehler").textContent="Bitte eine Menge eintragen."; return }
 if(menge<0&&art!=="korrektur"){
  $("liefBuchenFehler").textContent="Eine negative Menge gibt es nur als Korrektur.";
  return;
 }
 $("liefBuchenSpeichern").disabled=true;
 try{
  const r=await sb.from("lieferanten_bewegungen").insert({
   artikel_id:a.id, art, menge:Math.abs(menge)*((art==="korrektur"&&menge<0)?-1:1),
   grund:$("liefBuchenGrund").value.trim()||null,
   created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  });
  if(r.error)throw r.error;
 }catch(e){
  $("liefBuchenFehler").textContent="Nicht gebucht: "+((e&&e.message)||e);
  $("liefBuchenSpeichern").disabled=false;
  return;
 }
 $("liefBuchenSpeichern").disabled=false;
 lfBuchenSchliessen();
 await lfLaden();
 lfZeichnen();
 lfMeldung(LF_ART_TEXT[art]+" von "+lfZahlText(menge)+" auf „"+a.bezeichnung+"“ gebucht. Bestand jetzt "+lfZahlText(lfBestand(a.id))+".");
}

// ---- Scannen --------------------------------------------------------------
// Derselbe Scanner wie in der bestehenden Lagerverwaltung (js/01). Ein
// unbekannter Code legt hier bewusst NICHTS an: dieses Lager ist das
// Sortiment der Lieferanten, kein Ort für selbst erfundene Artikel.
function lfScannenUndBuchen(art){
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{
  const a=lfArtikelZuBarcode(code);
  if(!a){
   lfMeldung("Kein Lieferantenartikel mit dem Barcode "+code+". Gehört er zum eigenen Material, ist er in der normalen Lagerverwaltung richtig.",true);
   return;
  }
  if(a.archiviert){
   lfMeldung("„"+a.bezeichnung+"“ ist archiviert und wird nicht bebucht.",true);
   return;
  }
  lfMeldung("");
  lfBuchenOeffnen(a.id,art);
 });
}

// ---- Anzeige --------------------------------------------------------------
function lfPasstZurSuche(a){
 const q=lfSuche.trim().toLowerCase();
 if(!q)return true;
 return [a.artikelnr,a.bezeichnung,a.gruppe,a.material,a.ean,a.lieferant]
  .some(x=>String(x||"").toLowerCase().indexOf(q)>=0);
}
function lfZeileHtml(a,mitLieferant){
 const bestand=lfBestand(a.id);
 const masse=[a.zuschnitt_mm?lfZahlText(a.zuschnitt_mm)+" mm":"",
              a.dicke_mm?lfZahlText(a.dicke_mm)+" mm":"",
              a.laenge_m?lfZahlText(a.laenge_m)+" m":"",
              a.wulst?a.wulst+" mm":""].filter(Boolean).join(" · ");
 // Der Lieferant steht nur da, wo es mehr als einen gibt - solange das Lager
 // eines Haendlers drinsteht, waere er in jeder Zeile dieselbe Auskunft.
 const unten=[mitLieferant&&a.lieferant?esc(a.lieferant):"",esc(a.artikelnr),
              masse?esc(masse):"",a.ean?esc(a.ean):""].filter(Boolean).join(" · ");
 return `<div class="kw-zeile">
  <div style="flex:1;min-width:0">
   <b>${esc(a.bezeichnung)}</b>
   <div class="small" style="color:var(--muted)">${unten}</div>
  </div>
  <div class="small" style="text-align:right;min-width:78px">
   <b style="font-size:15px">${esc(lfZahlText(bestand))}</b>
   ${a.vpe?`<div style="color:var(--muted)">VPE ${esc(lfZahlText(a.vpe))}</div>`:""}
  </div>
  <div class="bar" style="margin:0">
   <button type="button" class="blue" data-lf-ein="${esc(a.id)}">＋</button>
   <button type="button" class="gray" data-lf-aus="${esc(a.id)}">－</button>
  </div>
 </div>`;
}
function lfZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefListe");
 if(!box)return;
 const mitLieferant=lfLieferanten().length>1;
 const treffer=lfArtikel.filter(a=>!a.archiviert&&lfPasstZurSuche(a));
 const k=$("liefKennzahlen");
 if(k){
  const mitBestand=lfArtikel.filter(a=>lfBestand(a.id)>0).length;
  k.innerHTML=`<b>${lfArtikel.length}</b> Artikel · <b>${mitBestand}</b> mit Bestand · <b>${lfBewegungen.length}</b> Buchungen`;
 }
 if(!lfArtikel.length){
  box.innerHTML=`<div class="info">Noch kein Sortiment eingelesen. Der Knopf <b>Sortiment einlesen</b> holt die Artikelliste des Lieferanten.</div>`;
  return;
 }
 if(!treffer.length){
  box.innerHTML=`<div class="a2-leer">Kein Artikel passt zu „${esc(lfSuche)}“.</div>`;
  return;
 }
 // Nach Produktgruppe, zugeklappt - 439 Artikel am Stueck sind keine Liste,
 // sondern eine Wand. Wird gesucht, ist alles offen: dann will man die
 // Treffer sehen, nicht Gruppentitel.
 const offenAlle=!!lfSuche.trim();
 const gruppen={};
 treffer.forEach(a=>{ (gruppen[a.gruppe||"Ohne Gruppe"]=gruppen[a.gruppe||"Ohne Gruppe"]||[]).push(a) });
 box.innerHTML=Object.keys(gruppen).sort().map(g=>{
  const offen=offenAlle||lfOffeneGruppen.has(g);
  return `<div class="a2-abschnitt">
   <button type="button" class="a2-zeile" data-lf-gruppe="${esc(g)}">
    <span class="a2-zeile-text"><b>${esc(g)}</b><span>${gruppen[g].length} Artikel</span></span>
    <span class="a2-zeile-pfeil">${offen?"⌄":"›"}</span></button>
   ${offen?gruppen[g].map(a=>lfZeileHtml(a,mitLieferant)).join(""):""}
  </div>`;
 }).join("");
}

async function lfOeffnen(){
 if(typeof $!=="function")return;
 const modal=$("liefModal");
 if(!modal)return;
 modal.hidden=false;
 lfMeldung("");
 if(!lfGeladen){ lfMeldung("Wird geladen …"); await lfLaden(); lfMeldung("") }
 lfZeichnen();
 lfLieferantenVorschlaege();
}

// Der Lieferant, unter dem die hochgeladene Datei abgelegt wird. Eigene
// Funktion und nicht nur ein Feldzugriff in der Konfiguration: so laesst sich
// am VERHALTEN pruefen, dass ohne Angabe nichts importiert wird - statt im
// Text der Datei nachzusehen, ob dort das Richtige steht.
function lfImportLieferant(){
 const f=(typeof $==="function")?$("liefExcelLieferant"):null;
 return f?f.value.trim():"";
}
function lfExcelFestwerte(){
 const l=lfImportLieferant();
 return l?{lieferant:l}:null;
}
// Der aktuelle Stand als {artikelnr: Eintrag} - daraus entsteht in js/08 die
// Vorschau "neu / wird geaendert / unveraendert" VOR dem Speichern.
//
// Verglichen wird nur INNERHALB des gewaehlten Lieferanten. Sonst wuerde die
// Artikelnummer eines anderen Haendlers als "wird geaendert" gemeldet,
// obwohl sie einen ganz anderen Artikel meint.
function lfVergleichsstand(){
 const l=lfImportLieferant().toLowerCase();
 const m={};
 lfArtikel.filter(a=>!l||String(a.lieferant||"").trim().toLowerCase()===l)
  .forEach(a=>{ m[String(a.artikelnr||"").trim()]={
   artikelnr:String(a.artikelnr||""), bezeichnung:String(a.bezeichnung||""),
   gruppe:String(a.gruppe||""), material:String(a.material||""),
   zuschnitt_mm:lfZahl(a.zuschnitt_mm), dicke_mm:lfZahl(a.dicke_mm),
   laenge_m:lfZahl(a.laenge_m), wulst:String(a.wulst||""),
   vpe:lfZahl(a.vpe), ean:String(a.ean||""), hinweis:String(a.hinweis||"") }; });
 return m;
}

// Die Auswahlliste am Import wird aus den vorhandenen Lieferanten gefuellt -
// tippen muss man nur beim ersten Mal, und ein Tippfehler legt keinen
// zweiten Lieferanten an, den es gar nicht gibt.
function lfLieferantenVorschlaege(){
 if(typeof $!=="function")return;
 const dl=$("liefLieferantenListe");
 if(dl)dl.innerHTML=lfLieferanten().map(l=>`<option value="${esc(l)}"></option>`).join("");
 const feld=$("liefExcelLieferant");
 if(feld&&!feld.value.trim()){
  const l=lfLieferanten();
  if(l.length===1)feld.value=l[0];
 }
}

// ---- Klicks ---------------------------------------------------------------
if(typeof document!=="undefined")document.addEventListener("click",e=>{
 const t=e.target;
 if(!t||!t.closest)return;
 const g=t.closest("[data-lf-gruppe]");
 if(g){
  const name=g.getAttribute("data-lf-gruppe");
  if(lfOffeneGruppen.has(name))lfOffeneGruppen.delete(name); else lfOffeneGruppen.add(name);
  lfZeichnen(); return;
 }
 const ein=t.closest("[data-lf-ein]");
 if(ein){ lfBuchenOeffnen(ein.getAttribute("data-lf-ein"),"zugang"); return }
 const aus=t.closest("[data-lf-aus]");
 if(aus){ lfBuchenOeffnen(aus.getAttribute("data-lf-aus"),"abgang"); return }
});

// ---- Neue Positionen als Excel hochladen ----------------------------------
// Ansage des Anwenders: "schaue auch direkt das ich in zukunft neue positionen
// direkt in der app per excel datei hochladen kann."
//
// Verwendet wird DERSELBE Import wie beim Materialkatalog (initExcelImport,
// js/08) - nur mit anderen Feldern und einer anderen Zieltabelle. Ein
// zweiter, eigener Import waere eine zweite Wahrheit darueber, wie eine
// Lieferantenliste gelesen wird: Spaltenzuordnung, Vorschau "neu/geaendert",
// der Grundsatz "geloescht wird nie" - das alles steht dort schon und muss
// nicht ein zweites Mal stimmen.
//
// Der Abgleich laeuft ueber Lieferant + Artikelnummer; in der Datenbank ist
// das als UNIQUE (company_id, lieferant, artikelnr) festgehalten. Der
// Lieferant steht NICHT in der Datei, sondern wird einmal oben gewaehlt: eine
// Preisliste kommt von genau einem Haendler.
if(typeof initExcelImport==="function")initExcelImport({
 inputId:"liefExcelInput", buttonId:"liefExcelBtn", previewId:"liefExcelPreview",
 headerCheckId:"liefExcelHeader", countId:"liefExcelCount", tableId:"liefExcelTable",
 confirmId:"liefExcelConfirm", cancelId:"liefExcelCancel",
 mappingId:"liefExcelMapping", fehlerId:"liefExcelFehler", aufbauId:"liefExcelAufbau",
 tableName:"lieferanten_artikel",
 schluessel:"artikelnr",
 onConflict:"company_id,lieferant,artikelnr",
 festwerte:()=>lfExcelFestwerte(),
 festwerteFehler:"Bitte oben eintragen, von welchem Lieferanten die Datei ist.\n\n"
  +"Artikelnummern sind nur je Lieferant eindeutig – ohne diese Angabe wäre "
  +"nicht entscheidbar, wessen Artikel gemeint sind.",
 bestand:()=>lfVergleichsstand(),
 // "alias" sind die Schreibweisen, die in echten Lieferantenlisten
 // vorkommen - damit trifft die automatische Zuordnung ohne Raten. Die
 // Ueberschriften der gelieferten Datei stehen bewusst mit drin.
 felder:[
  {key:"artikelnr",label:"Artikel-Nr.",pflicht:true,
   alias:["artikelnrbteam","artikelnr","artikelnummer","nr","nummer","code","artikel","lieferantennr"]},
  {key:"bezeichnung",label:"Bezeichnung",pflicht:true,
   alias:["artikelbezeichnung","beschreibung","text","benennung","material"]},
  {key:"gruppe",label:"Produktgruppe",alias:["gruppe","warengruppe","kategorie","sortiment"]},
  {key:"material",label:"Werkstoff",alias:["material","werkstoff","ausfuehrung","qualitaet"]},
  {key:"zuschnitt_mm",label:"Zuschnitt (mm)",zahl:true,alias:["zuschnitt","zuschnittmm","breite","abwicklung"]},
  {key:"dicke_mm",label:"Dicke (mm)",zahl:true,alias:["dicke","dickemm","staerke","blechdicke"]},
  {key:"laenge_m",label:"Länge (m)",zahl:true,alias:["laenge","laengem","stangenlaenge"]},
  {key:"wulst",label:"Wulst (mm)",alias:["wulst","wulstmm","groesse","rinnengroesse"]},
  {key:"vpe",label:"VPE",zahl:true,alias:["vpe","verpackungseinheit","gebinde","einheit"]},
  {key:"ean",label:"EAN / Barcode",alias:["ean","eanbarcode","barcode","gtin","strichcode"]},
  {key:"hinweis",label:"Hinweis",alias:["hinweis","bemerkung","notiz"]}
 ],
 nachImport:async()=>{ await lfLaden(); lfZeichnen(); lfLieferantenVorschlaege() }
});

if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",()=>{
 if(typeof $!=="function")return;
 const an=(id,fn)=>{ const el=$(id); if(el)el.onclick=fn };
 an("liefEinscannen",()=>lfScannenUndBuchen("zugang"));
 an("liefAusscannen",()=>lfScannenUndBuchen("abgang"));
 an("liefEinlesen",()=>lfSortimentEinlesen());
 an("liefSchliessen",()=>{ $("liefModal").hidden=true });
 an("liefBuchenAbbrechen",()=>lfBuchenSchliessen());
 an("liefBuchenSpeichern",()=>lfBuchenSpeichern());
 const s=$("liefSuche");
 if(s)s.oninput=()=>{ lfSuche=s.value; lfZeichnen() };
});
