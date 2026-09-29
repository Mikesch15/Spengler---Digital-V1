"use strict";
// ---------------------------------------------------------------------------
// Lieferanten-Lager B-Team (v3.229)
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
// Deshalb: eigene Tabellen (bteam_artikel, bteam_bewegungen), eigene Datei,
// eigener Dialog. An js/68, js/59, am Regierapport und an materials aendert
// diese Datei NICHTS - sie liest von dort auch nichts.
//
// Was sie sich TEILT, weil zwei Fassungen davon zwei Wahrheiten waeren:
//  - den Barcode-Scanner aus js/01 (barcodeScannen)
//  - das Recht "Lager" (feature_access), also dieselbe Sichtbarkeit
//  - die Projektliste fuer das Ziel einer Ausbuchung
//
// Der Bestand ist wie drueben NIE ein Feld, sondern immer die Summe ueber die
// Bewegungen. Eine Buchung ist unveraenderlich - die Datenbank kennt fuer
// bteam_bewegungen kein Update und kein Delete. Ein Fehler wird durch eine
// Korrektur ausgeglichen, nicht durch Aendern der Vergangenheit.
// ---------------------------------------------------------------------------

const BT_SORTIMENT="daten/bteam-sortiment.json";
const BT_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};

let btArtikel=[];
let btBewegungen=[];
let btSuche="";
let btOffeneGruppen=new Set();
let btGeladen=false;

function btZahl(v){ const n=Number(v); return Number.isFinite(n)?n:0 }
function btZahlText(v){
 const n=btZahl(v);
 return Number.isInteger(n)?String(n):n.toFixed(2).replace(/\.?0+$/,"");
}
function btMeldung(text,fehler){
 const m=(typeof $==="function")?$("bteamMeldung"):null;
 if(!m)return;
 m.textContent=text||"";
 m.style.color=fehler?"var(--red)":"var(--muted)";
}

// ---- Laden ----------------------------------------------------------------
async function btLaden(){
 if(typeof sb==="undefined")return false;
 try{
  const a=await sb.from("bteam_artikel").select("*").order("gruppe").order("bezeichnung");
  if(a.error)throw a.error;
  btArtikel=a.data||[];
  const b=await sb.from("bteam_bewegungen").select("*").order("created_at",{ascending:false});
  if(b.error)throw b.error;
  btBewegungen=b.data||[];
  btGeladen=true;
  return true;
 }catch(e){
  btArtikel=[]; btBewegungen=[]; btGeladen=false;
  btMeldung("Das Lieferanten-Lager liess sich nicht laden: "+((e&&e.message)||e),true);
  return false;
 }
}

// Bestand = Summe der Bewegungen. Zugang positiv, Abgang negativ, Korrektur
// so, wie sie gebucht wurde (sie darf auch negativ sein).
function btBestand(artikelId){
 return btBewegungen.filter(b=>String(b.artikel_id)===String(artikelId))
  .reduce((s,b)=>s+(b.art==="abgang"?-btZahl(b.menge):btZahl(b.menge)),0);
}
function btArtikelZuId(id){ return btArtikel.find(a=>String(a.id)===String(id))||null }
function btArtikelZuBarcode(code){
 const c=String(code||"").trim();
 if(!c)return null;
 return btArtikel.find(a=>String(a.ean||"").trim()===c)||null;
}

// ---- Sortiment einlesen ---------------------------------------------------
// Die Liste liegt als Datei im Projekt (daten/bteam-sortiment.json) und wird
// erst beim Einlesen geholt - sie gehoert nicht in die App-Huelle, weil sie
// genau einmal gebraucht wird.
//
// Schluessel ist die Artikelnummer des Lieferanten: ein zweites Einlesen
// AKTUALISIERT dieselbe Position, statt sie zu verdoppeln. Geloescht wird
// nie - ein Artikel, der in der neuen Datei fehlt, bleibt stehen.
async function btSortimentEinlesen(){
 if(typeof sb==="undefined")return;
 let daten=null;
 btMeldung("Sortiment wird geholt …");
 try{
  const r=await fetch(BT_SORTIMENT,{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  daten=await r.json();
 }catch(e){
  btMeldung("Die Sortimentsdatei liess sich nicht laden: "+((e&&e.message)||e),true);
  return;
 }
 const liste=(daten&&Array.isArray(daten.artikel))?daten.artikel:[];
 if(!liste.length){ btMeldung("Die Sortimentsdatei enthält keine Artikel.",true); return }
 if(typeof confirm==="function"&&!confirm(
   liste.length+" Artikel von "+((daten&&daten.lieferant)||"dem Lieferanten")+" einlesen?\n\n"
  +"Bereits vorhandene Artikelnummern werden aktualisiert, nichts wird gelöscht.\n"
  +"Der Materialkatalog der Firma und die bestehende Lagerverwaltung bleiben unberührt."))return;

 const zeilen=liste.map(a=>({
  artikelnr:String(a.artikelnr||"").trim(),
  bezeichnung:String(a.bezeichnung||"").trim(),
  gruppe:a.gruppe||null, material:a.material||null,
  zuschnitt_mm:a.zuschnitt?btZahl(a.zuschnitt):null,
  dicke_mm:a.dicke?btZahl(a.dicke):null,
  laenge_m:a.laenge?btZahl(a.laenge):null,
  wulst:a.wulst||null, vpe:a.vpe?btZahl(a.vpe):null,
  ean:(a.ean&&String(a.ean).trim())?String(a.ean).trim():null,
  hinweis:a.hinweis||null
 })).filter(z=>z.artikelnr&&z.bezeichnung);

 btMeldung(zeilen.length+" Artikel werden gespeichert …");
 try{
  // In Haeppchen, damit eine grosse Liste nicht an einer Zeitgrenze scheitert.
  for(let i=0;i<zeilen.length;i+=100){
   const r=await sb.from("bteam_artikel")
    .upsert(zeilen.slice(i,i+100),{onConflict:"company_id,artikelnr"});
   if(r.error)throw r.error;
  }
 }catch(e){
  const t=String((e&&e.message)||e);
  // Der eindeutige Barcode ist Absicht - siehe Migration. Wenn er kippt, ist
  // die Datei das Problem, und das gehoert gesagt statt geraten.
  if(/bteam_artikel_ean_uniq/.test(t))
   btMeldung("Zwei Artikel in der Datei tragen denselben Barcode. Ein Barcode muss eindeutig auf einen Artikel zeigen – sonst wäre beim Scannen nicht entscheidbar, welcher gemeint ist. Nichts wurde gespeichert.",true);
  else btMeldung("Das Einlesen ist fehlgeschlagen: "+t,true);
  return;
 }
 await btLaden();
 btZeichnen();
 btMeldung(zeilen.length+" Artikel eingelesen.");
}

// ---- Buchen ---------------------------------------------------------------
let btBuchenArtikelId=null;

function btBuchenOeffnen(artikelId,art){
 if(typeof $!=="function")return;
 const a=btArtikelZuId(artikelId);
 if(!a){ btMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 btBuchenArtikelId=a.id;
 $("bteamBuchenTitel").textContent=a.bezeichnung;
 $("bteamBuchenUnter").textContent="Art.-Nr. "+a.artikelnr+(a.ean?" · "+a.ean:"")
  +" · Bestand "+btZahlText(btBestand(a.id));
 $("bteamBuchenArt").value=art||"zugang";
 $("bteamBuchenMenge").value=a.vpe?btZahlText(a.vpe):"1";
 $("bteamBuchenGrund").value="";
 $("bteamBuchenFehler").textContent="";
 $("bteamBuchenModal").hidden=false;
 setTimeout(()=>{ const f=$("bteamBuchenMenge"); if(f){f.focus();f.select()} },60);
}
function btBuchenSchliessen(){
 if(typeof $==="function"&&$("bteamBuchenModal"))$("bteamBuchenModal").hidden=true;
 btBuchenArtikelId=null;
}
async function btBuchenSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=btArtikelZuId(btBuchenArtikelId);
 if(!a)return;
 const art=$("bteamBuchenArt").value;
 const menge=btZahl($("bteamBuchenMenge").value);
 if(!menge){ $("bteamBuchenFehler").textContent="Bitte eine Menge eintragen."; return }
 if(menge<0&&art!=="korrektur"){
  $("bteamBuchenFehler").textContent="Eine negative Menge gibt es nur als Korrektur.";
  return;
 }
 $("bteamBuchenSpeichern").disabled=true;
 try{
  const r=await sb.from("bteam_bewegungen").insert({
   artikel_id:a.id, art, menge:Math.abs(menge)*((art==="korrektur"&&menge<0)?-1:1),
   grund:$("bteamBuchenGrund").value.trim()||null,
   created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  });
  if(r.error)throw r.error;
 }catch(e){
  $("bteamBuchenFehler").textContent="Nicht gebucht: "+((e&&e.message)||e);
  $("bteamBuchenSpeichern").disabled=false;
  return;
 }
 $("bteamBuchenSpeichern").disabled=false;
 btBuchenSchliessen();
 await btLaden();
 btZeichnen();
 btMeldung(BT_ART_TEXT[art]+" von "+btZahlText(menge)+" auf „"+a.bezeichnung+"“ gebucht. Bestand jetzt "+btZahlText(btBestand(a.id))+".");
}

// ---- Scannen --------------------------------------------------------------
// Derselbe Scanner wie in der bestehenden Lagerverwaltung (js/01). Ein
// unbekannter Code legt hier bewusst NICHTS an: dieses Lager ist das
// Sortiment des Lieferanten, kein Ort für selbst erfundene Artikel.
function btScannenUndBuchen(art){
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{
  const a=btArtikelZuBarcode(code);
  if(!a){
   btMeldung("Kein B-Team-Artikel mit dem Barcode "+code+". Gehört er zum eigenen Material, ist er in der normalen Lagerverwaltung richtig.",true);
   return;
  }
  if(a.archiviert){
   btMeldung("„"+a.bezeichnung+"“ ist archiviert und wird nicht bebucht.",true);
   return;
  }
  btMeldung("");
  btBuchenOeffnen(a.id,art);
 });
}

// ---- Anzeige --------------------------------------------------------------
function btPasstZurSuche(a){
 const q=btSuche.trim().toLowerCase();
 if(!q)return true;
 return [a.artikelnr,a.bezeichnung,a.gruppe,a.material,a.ean]
  .some(x=>String(x||"").toLowerCase().indexOf(q)>=0);
}
function btZeileHtml(a){
 const bestand=btBestand(a.id);
 const masse=[a.zuschnitt_mm?btZahlText(a.zuschnitt_mm)+" mm":"",
              a.dicke_mm?btZahlText(a.dicke_mm)+" mm":"",
              a.laenge_m?btZahlText(a.laenge_m)+" m":"",
              a.wulst?a.wulst+" mm":""].filter(Boolean).join(" · ");
 return `<div class="kw-zeile">
  <div style="flex:1;min-width:0">
   <b>${esc(a.bezeichnung)}</b>
   <div class="small" style="color:var(--muted)">${esc(a.artikelnr)}${masse?" · "+esc(masse):""}${a.ean?" · "+esc(a.ean):""}</div>
  </div>
  <div class="small" style="text-align:right;min-width:78px">
   <b style="font-size:15px">${esc(btZahlText(bestand))}</b>
   ${a.vpe?`<div style="color:var(--muted)">VPE ${esc(btZahlText(a.vpe))}</div>`:""}
  </div>
  <div class="bar" style="margin:0">
   <button type="button" class="blue" data-bt-ein="${esc(a.id)}">＋</button>
   <button type="button" class="gray" data-bt-aus="${esc(a.id)}">－</button>
  </div>
 </div>`;
}
function btZeichnen(){
 if(typeof $!=="function")return;
 const box=$("bteamListe");
 if(!box)return;
 const treffer=btArtikel.filter(a=>!a.archiviert&&btPasstZurSuche(a));
 const k=$("bteamKennzahlen");
 if(k){
  const mitBestand=btArtikel.filter(a=>btBestand(a.id)>0).length;
  k.innerHTML=`<b>${btArtikel.length}</b> Artikel · <b>${mitBestand}</b> mit Bestand · <b>${btBewegungen.length}</b> Buchungen`;
 }
 if(!btArtikel.length){
  box.innerHTML=`<div class="info">Noch kein Sortiment eingelesen. Der Knopf <b>Sortiment einlesen</b> holt die Artikelliste des Lieferanten.</div>`;
  return;
 }
 if(!treffer.length){
  box.innerHTML=`<div class="a2-leer">Kein Artikel passt zu „${esc(btSuche)}“.</div>`;
  return;
 }
 // Nach Produktgruppe, zugeklappt - 439 Artikel am Stueck sind keine Liste,
 // sondern eine Wand. Wird gesucht, ist alles offen: dann will man die
 // Treffer sehen, nicht Gruppentitel.
 const offenAlle=!!btSuche.trim();
 const gruppen={};
 treffer.forEach(a=>{ (gruppen[a.gruppe||"Ohne Gruppe"]=gruppen[a.gruppe||"Ohne Gruppe"]||[]).push(a) });
 box.innerHTML=Object.keys(gruppen).sort().map(g=>{
  const offen=offenAlle||btOffeneGruppen.has(g);
  return `<div class="a2-abschnitt">
   <button type="button" class="a2-zeile" data-bt-gruppe="${esc(g)}">
    <span class="a2-zeile-text"><b>${esc(g)}</b><span>${gruppen[g].length} Artikel</span></span>
    <span class="a2-zeile-pfeil">${offen?"⌄":"›"}</span></button>
   ${offen?gruppen[g].map(btZeileHtml).join(""):""}
  </div>`;
 }).join("");
}

async function btOeffnen(){
 if(typeof $!=="function")return;
 const modal=$("bteamModal");
 if(!modal)return;
 modal.hidden=false;
 btMeldung("");
 if(!btGeladen){ btMeldung("Wird geladen …"); await btLaden(); btMeldung("") }
 btZeichnen();
}

// ---- Klicks ---------------------------------------------------------------
if(typeof document!=="undefined")document.addEventListener("click",e=>{
 const t=e.target;
 if(!t||!t.closest)return;
 const g=t.closest("[data-bt-gruppe]");
 if(g){
  const name=g.getAttribute("data-bt-gruppe");
  if(btOffeneGruppen.has(name))btOffeneGruppen.delete(name); else btOffeneGruppen.add(name);
  btZeichnen(); return;
 }
 const ein=t.closest("[data-bt-ein]");
 if(ein){ btBuchenOeffnen(ein.getAttribute("data-bt-ein"),"zugang"); return }
 const aus=t.closest("[data-bt-aus]");
 if(aus){ btBuchenOeffnen(aus.getAttribute("data-bt-aus"),"abgang"); return }
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
// Der Abgleich laeuft ueber die Artikelnummer des Lieferanten; dieselbe
// Regel wie beim Startsortiment, und in der Datenbank ist sie als
// UNIQUE (company_id, artikelnr) festgehalten.
if(typeof initExcelImport==="function")initExcelImport({
 inputId:"bteamExcelInput", buttonId:"bteamExcelBtn", previewId:"bteamExcelPreview",
 headerCheckId:"bteamExcelHeader", countId:"bteamExcelCount", tableId:"bteamExcelTable",
 confirmId:"bteamExcelConfirm", cancelId:"bteamExcelCancel",
 mappingId:"bteamExcelMapping", fehlerId:"bteamExcelFehler", aufbauId:"bteamExcelAufbau",
 tableName:"bteam_artikel",
 schluessel:"artikelnr",
 // Der aktuelle Stand als {artikelnr: Eintrag} - daraus entsteht die
 // Vorschau "neu / wird geaendert / unveraendert" VOR dem Speichern.
 bestand:()=>{
  const m={};
  btArtikel.forEach(a=>{ m[String(a.artikelnr||"").trim()]={
   artikelnr:String(a.artikelnr||""), bezeichnung:String(a.bezeichnung||""),
   gruppe:String(a.gruppe||""), material:String(a.material||""),
   zuschnitt_mm:btZahl(a.zuschnitt_mm), dicke_mm:btZahl(a.dicke_mm),
   laenge_m:btZahl(a.laenge_m), wulst:String(a.wulst||""),
   vpe:btZahl(a.vpe), ean:String(a.ean||""), hinweis:String(a.hinweis||"") }; });
  return m;
 },
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
  {key:"laenge_m",label:"L\u00e4nge (m)",zahl:true,alias:["laenge","laengem","stangenlaenge"]},
  {key:"wulst",label:"Wulst (mm)",alias:["wulst","wulstmm","groesse","rinnengroesse"]},
  {key:"vpe",label:"VPE",zahl:true,alias:["vpe","verpackungseinheit","gebinde","einheit"]},
  {key:"ean",label:"EAN / Barcode",alias:["ean","eanbarcode","barcode","gtin","strichcode"]},
  {key:"hinweis",label:"Hinweis",alias:["hinweis","bemerkung","notiz"]}
 ],
 nachImport:async()=>{ await btLaden(); btZeichnen(); }
});

if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",()=>{
 if(typeof $!=="function")return;
 const an=(id,fn)=>{ const el=$(id); if(el)el.onclick=fn };
 an("bteamEinscannen",()=>btScannenUndBuchen("zugang"));
 an("bteamAusscannen",()=>btScannenUndBuchen("abgang"));
 an("bteamEinlesen",()=>btSortimentEinlesen());
 an("bteamSchliessen",()=>{ $("bteamModal").hidden=true });
 an("bteamBuchenAbbrechen",()=>btBuchenSchliessen());
 an("bteamBuchenSpeichern",()=>btBuchenSpeichern());
 const s=$("bteamSuche");
 if(s)s.oninput=()=>{ btSuche=s.value; btZeichnen() };
});
