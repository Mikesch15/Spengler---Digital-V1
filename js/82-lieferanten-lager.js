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
let lfEinkauf=[];          // offene Einkaufswuensche (v3.232)
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
  // v3.232: Nur die OFFENEN Wuensche. Abgehakte bleiben in der Datenbank
  // stehen, gehoeren aber nicht mehr auf die Liste - sonst waere "erledigt"
  // wirkungslos.
  const w=await sb.from("lieferanten_einkauf").select("*").is("erledigt_am",null)
   .order("created_at",{ascending:false});
  if(w.error)throw w.error;
  lfEinkauf=w.data||[];
  lfGeladen=true;
  return true;
 }catch(e){
  lfArtikel=[]; lfBewegungen=[]; lfEinkauf=[]; lfGeladen=false;
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

// ---- Mindestbestand und Einkaufsliste (v3.231) ----------------------------
//
// Ansage des Anwenders, sinngemaess: das Lager soll sagen, was bestellt
// werden muss. Das ist der Punkt, an dem eine Artikelliste zum Werkzeug wird.
//
// 0 heisst "nicht ueberwacht", nicht "Mindestbestand null". Ein Sortiment von
// 439 Artikeln, das jeden davon ueberwacht, meldet 439-mal Mangel und wird
// nie gelesen. Ueberwacht wird nur, was der Betrieb ausdruecklich vorratet.
// ---- Preis (v3.233) -------------------------------------------------------
// Ansage des Anwenders: "Ich denke wir können schon starten bevor ich die
// preise habe." Genau dafuer ist das gebaut: ohne Preis funktioniert alles
// wie bisher, und kein Betrag wird erfunden. Ein fehlender Preis ist NICHT
// 0 - er ist unbekannt, und das ist ein Unterschied, den eine Summe nicht
// verschlucken darf.
function lfPreis(a){
 if(!a||a.preis===null||a.preis===undefined||a.preis==="")return null;
 const n=Number(a.preis);
 return Number.isFinite(n)?n:null;
}
function lfHatPreis(a){ return lfPreis(a)!==null }
function lfPreisText(a){
 const p=lfPreis(a);
 return p===null?"":"CHF "+p.toFixed(2);
}
// Wie alt ist dieser Preis? Ein Preis ohne Alter sieht nach vierzehn Monaten
// genauso aus wie gestern.
function lfPreisAlterText(a){
 const s=a&&a.preis_stand?String(a.preis_stand).slice(0,10):"";
 if(!s)return "";
 const d=new Date(s+"T00:00:00");
 if(isNaN(d))return "";
 const tage=Math.floor((Date.now()-d.getTime())/86400000);
 if(tage<=31)return "";                       // frisch - kein Hinweis noetig
 if(tage<365)return "Preis von "+d.toLocaleDateString("de-CH");
 return "Preis von "+d.toLocaleDateString("de-CH")+" – älter als ein Jahr";
}

function lfMindest(a){ return a?lfZahl(a.mindestbestand):0 }
function lfFehlt(a){
 if(!a)return 0;
 const m=lfMindest(a);
 if(m<=0)return 0;
 const f=m-lfBestand(a.id);
 return f>0?f:0;
}
// v3.232: Der zweite Weg auf die Liste - von Hand gesetzt.
//
// Ansage des Anwenders: "Wo kann ich etwas in den einkaufswagen legen?" Bis
// v3.231: nirgends. Der Reflex war richtig; manchmal soll etwas bestellt
// werden, ohne dass dafuer ein Mindestbestand gilt.
function lfHandEintrag(a){
 if(!a)return null;
 return lfEinkauf.find(x=>String(x.artikel_id)===String(a.id))||null;
}
function lfHandMenge(a){ const e=lfHandEintrag(a); return e?lfZahl(e.menge):0 }

// Der Gesamtbedarf ist die SUMME der beiden Herkuenfte, nicht die groessere
// von beiden.
//
// Das ist eine Entscheidung, und sie ist die einzige, die nichts erfindet:
// beide Bedarfe sind echt und unabhaengig. Der Mindestbestand sagt, was ins
// Regal zurueck muss; der Wunsch von Hand sagt, was zusaetzlich fuer eine
// Baustelle weggeht. Wer nur die groessere Zahl bestellt, hat hinterher zu
// wenig - und zwar genau um den anderen Betrag. Damit trotzdem nichts
// versteckt gerechnet wird, nennen Liste und Text BEIDE Anteile.
function lfBedarf(a){ return lfFehlt(a)+lfHandMenge(a) }

// Bestellt wird in Verpackungseinheiten, nicht in Stueck: wer 3 braucht und
// der Haendler liefert Fuenferpackungen, bestellt 5. Der Bedarf ist die
// Wahrheit ueber den Mangel, die Bestellmenge die ueber die Bestellung -
// deshalb stehen beide da und nicht nur eine.
function lfBestellmenge(a){
 const b=lfBedarf(a);
 if(b<=0)return 0;
 const v=lfZahl(a.vpe);
 return v>0?Math.ceil(b/v)*v:b;
}
function lfUnterMindest(){ return lfArtikel.filter(a=>!a.archiviert&&lfFehlt(a)>0) }
function lfEinkaufsliste(){
 const t=(x,y)=>String(x||"").localeCompare(String(y||""),"de");
 return lfArtikel.filter(a=>!a.archiviert&&lfBedarf(a)>0).sort((x,y)=>
  t(x.lieferant,y.lieferant)||t(x.gruppe,y.gruppe)||t(x.bezeichnung,y.bezeichnung));
}
// Woher eine Zeile kommt - als Text, an einer Stelle. Liste und verschickter
// Text lesen denselben Satz; zwei Fassungen waeren zwei Wahrheiten darueber,
// warum etwas bestellt wird.
function lfHerkunftText(a){
 const f=lfFehlt(a), h=lfHandMenge(a), e=lfHandEintrag(a);
 const teile=[];
 if(f>0)teile.push("Mindestbestand "+lfZahlText(lfMindest(a))+", Bestand "+lfZahlText(lfBestand(a.id)));
 if(h>0)teile.push("von Hand "+lfZahlText(h)+(e&&e.grund?" ("+e.grund+")":""));
 return teile.join(" · ");
}
// Der Text zum Verschicken. Er entsteht aus DERSELBEN Liste wie die Anzeige -
// eine eigene Textfassung waere eine zweite Wahrheit darueber, was fehlt.
// v3.233: Der Wert einer Zeile - oder null, wenn kein Preis hinterlegt ist.
function lfZeilenwert(a){
 const p=lfPreis(a);
 return p===null?null:p*lfBestellmenge(a);
}
// Die Summe zaehlt NUR die Zeilen mit Preis und sagt dazu, wie viele Zeilen
// sie nicht kennt. Eine Summe, die fehlende Preise als 0 mitnimmt, ist
// schlimmer als gar keine: sie sieht vollstaendig aus und ist zu klein.
function lfEinkaufsWert(){
 const liste=lfEinkaufsliste();
 let summe=0, mit=0, ohne=0;
 liste.forEach(a=>{
  const w=lfZeilenwert(a);
  if(w===null)ohne++; else { summe+=w; mit++ }
 });
 return {summe,mit,ohne};
}
function lfEinkaufsText(){
 const liste=lfEinkaufsliste();
 if(!liste.length)return "";
 const heute=new Date().toLocaleDateString("de-CH");
 const zeilen=["Einkaufsliste vom "+heute,""];
 let letzter=null;
 liste.forEach(a=>{
  const l=String(a.lieferant||"Ohne Lieferant");
  if(l!==letzter){ if(letzter!==null)zeilen.push(""); zeilen.push(l+":"); letzter=l }
  const w=lfZeilenwert(a);
  zeilen.push("  "+lfZahlText(lfBestellmenge(a))+" x  "+a.artikelnr+"  "+a.bezeichnung
   +(w===null?"":"   CHF "+w.toFixed(2))
   +"   ("+lfHerkunftText(a)+")");
 });
 const wert=lfEinkaufsWert();
 if(wert.mit){
  zeilen.push("");
  zeilen.push("Summe der Positionen mit Preis: CHF "+wert.summe.toFixed(2));
  if(wert.ohne)zeilen.push("Für "+wert.ohne+" Position(en) ist kein Preis hinterlegt – nicht enthalten.");
 }
 return zeilen.join("\n");
}

function lfEinkaufZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefEinkaufListe"), feld=$("liefEinkaufText");
 if(!box)return;
 const liste=lfEinkaufsliste();
 const ueberwacht=lfArtikel.filter(a=>lfMindest(a)>0).length;
 if(feld)feld.value=lfEinkaufsText();
 const knopf=$("liefEinkaufKopieren");
 if(knopf)knopf.disabled=!liste.length;
 if(!liste.length){
  // Eine leere Einkaufsliste bedeutet zweierlei, und die beiden zu
  // verwechseln waere teuer: "nichts fehlt" oder "es wird nichts
  // ueberwacht". Also wird gesagt, welches von beiden zutrifft.
  box.innerHTML=ueberwacht
   ? `<div class="info">Nichts zu bestellen – von allen <b>${ueberwacht}</b>
      überwachten Artikeln ist genug da. Einzelnes lässt sich jederzeit von Hand
      dazusetzen: im Lager den Artikel antippen, <b>🛒 Auf die Einkaufsliste</b>.</div>`
   : `<div class="info">Für noch keinen Artikel ist ein <b>Mindestbestand</b>
      hinterlegt, und von Hand ist auch nichts gesetzt – deshalb kann die Liste
      nichts melden. Im Lager einen Artikel antippen: dort trägst du einen
      <b>Mindestbestand</b> ein (dann meldet er sich selbst) oder setzt ihn mit
      <b>🛒 Auf die Einkaufsliste</b> einmalig dazu.</div>`;
  return;
 }
 let letzter=null, html="";
 liste.forEach(a=>{
  const l=String(a.lieferant||"Ohne Lieferant");
  // Die Lieferanten-Ueberschrift hatte in v3.231 die Klasse
  // "a2-abschnitt-titel" - die es in keiner CSS-Datei gibt. Sie stand
  // dadurch unformatiert da. Hier bewusst inline gesetzt statt eine neue
  // Klasse zu erfinden: eine Zwischenueberschrift in genau einer Liste
  // rechtfertigt keinen Eintrag in einer geteilten CSS-Datei.
  if(l!==letzter){
   html+=`<div style="margin:14px 0 4px;font-weight:700;color:var(--muted);
    font-size:13px;letter-spacing:.02em">${esc(l)}</div>`;
   letzter=l;
  }
  const hand=lfHandEintrag(a);
  html+=`<div class="kw-zeile">
   <div style="flex:1;min-width:0">
    <b>${esc(a.bezeichnung)}</b>
    <div class="small" style="color:var(--muted)">${esc(a.artikelnr)} · ${esc(lfHerkunftText(a))}${
     a.vpe?" · VPE "+esc(lfZahlText(a.vpe)):""}</div>
   </div>
   <div class="small" style="text-align:right;min-width:92px">
    <b style="font-size:15px;color:var(--red)">${esc(lfZahlText(lfBestellmenge(a)))}</b>
    <div style="color:var(--muted)">Bedarf ${esc(lfZahlText(lfBedarf(a)))}</div>
    ${lfHatPreis(a)?`<div style="color:var(--muted)">CHF ${esc(lfZeilenwert(a).toFixed(2))}</div>`:""}
   </div>
   ${hand?`<div class="bar" style="margin:0"><button type="button" class="gray"
     data-lf-erledigt="${esc(hand.id)}" title="Von Hand gesetzte Zeile abhaken">✓</button></div>`:""}
  </div>`;
 });
 // v3.233: Die Summe, und daneben ehrlich, was sie NICHT kennt. Solange
 // keine Preisliste da ist, steht hier gar keine Summe - lieber nichts als
 // eine, die stillschweigend zu klein ist.
 const wert=lfEinkaufsWert();
 if(wert.mit){
  html+=`<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line);
    display:flex;justify-content:space-between;align-items:baseline;gap:10px">
   <span class="small" style="color:var(--muted)">Summe der Positionen mit Preis</span>
   <b style="font-size:16px">CHF ${esc(wert.summe.toFixed(2))}</b></div>`;
  if(wert.ohne)html+=`<div class="small" style="color:var(--muted);margin-top:4px">
   Für <b>${wert.ohne}</b> Position(en) ist kein Preis hinterlegt – sie sind in der Summe nicht enthalten.</div>`;
 }else if(wert.ohne){
  html+=`<div class="small" style="color:var(--muted);margin-top:14px;padding-top:10px;
   border-top:1px solid var(--line)">Für keine Position ist ein Preis hinterlegt – deshalb
   steht hier keine Summe. Preise kommen mit der Preisliste des Händlers als Excel-Datei
   oder lassen sich am Artikel von Hand eintragen.</div>`;
 }
 box.innerHTML=html;
}
function lfEinkaufOeffnen(){
 if(typeof $!=="function")return;
 const m=$("liefEinkaufModal");
 if(!m)return;
 const h=$("liefEinkaufMeldung"); if(h)h.textContent="";
 lfEinkaufZeichnen();
 m.hidden=false;
}
async function lfEinkaufKopieren(){
 if(typeof $!=="function")return;
 const text=lfEinkaufsText();
 const h=$("liefEinkaufMeldung");
 if(!text){ if(h)h.textContent="Es gibt nichts zu kopieren."; return }
 // Die Zwischenablage darf fehlschlagen - im Browser eines alten Geraets,
 // ohne sichere Verbindung, oder weil das Betriebssystem es verweigert.
 // Deshalb steht der Text ohnehin im Feld darunter: schlaegt das Kopieren
 // fehl, wird darauf verwiesen, statt so zu tun, als haette es geklappt.
 try{
  if(!navigator.clipboard||!navigator.clipboard.writeText)throw new Error("keine Zwischenablage");
  await navigator.clipboard.writeText(text);
  if(h)h.textContent="Einkaufsliste kopiert – sie lässt sich jetzt einfügen.";
 }catch(e){
  const f=$("liefEinkaufText");
  if(f){ f.focus(); f.select() }
  if(h)h.textContent="Das Kopieren hat dieses Gerät nicht erlaubt. Der Text unten ist markiert – von Hand kopieren.";
 }
}

// ---- Von Hand auf die Einkaufsliste (v3.232) ------------------------------
//
// Je Artikel genau EIN offener Wunsch: ein zweites Setzen aendert die Menge,
// statt eine zweite Zeile zu erzeugen. Eine Liste, in der derselbe Artikel
// dreimal steht, sagt nicht, wie viel bestellt werden soll. In der Datenbank
// ist das als UNIQUE (company_id, artikel_id) WHERE erledigt_am IS NULL
// festgehalten - die Regel steht dort, nicht nur hier.
async function lfAufEinkaufsliste(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfArtikelOffenId);
 if(!a)return;
 const menge=lfZahl($("liefArtikelWunschMenge").value);
 if(menge<=0){
  $("liefArtikelFehler").textContent="Bitte eine Menge über 0 eintragen.";
  return;
 }
 const grund=$("liefArtikelWunschGrund").value.trim()||null;
 const alt=lfHandEintrag(a);
 $("liefArtikelWunschSetzen").disabled=true;
 try{
  const r=alt
   ? await sb.from("lieferanten_einkauf").update({menge,grund}).eq("id",alt.id)
   : await sb.from("lieferanten_einkauf").insert({
      artikel_id:a.id, menge, grund,
      created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null});
  if(r.error)throw r.error;
 }catch(e){
  $("liefArtikelFehler").textContent="Nicht gesetzt: "+((e&&e.message)||e);
  $("liefArtikelWunschSetzen").disabled=false;
  return;
 }
 $("liefArtikelWunschSetzen").disabled=false;
 lfArtikelSchliessen();
 await lfLaden();
 lfZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 lfMeldung(lfZahlText(menge)+" x „"+a.bezeichnung+"“ "+(alt?"auf der":"auf die")+" Einkaufsliste"+(alt?" geändert":"")+".");
}
// Abhaken ist kein Loeschen: die Zeile bleibt in der Datenbank mit ihrem
// Zeitpunkt stehen und verschwindet nur von der Liste. Danach laesst sich
// derselbe Artikel wieder setzen - die Eindeutigkeitsregel gilt nur fuer
// OFFENE Wuensche.
async function lfEinkaufErledigt(id){
 if(typeof sb==="undefined")return;
 const e=lfEinkauf.find(x=>String(x.id)===String(id));
 if(!e)return;
 const a=lfArtikel.find(x=>String(x.id)===String(e.artikel_id));
 const h=(typeof $==="function")?$("liefEinkaufMeldung"):null;
 try{
  const r=await sb.from("lieferanten_einkauf").update({
   erledigt_am:new Date().toISOString(),
   erledigt_von:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  }).eq("id",e.id);
  if(r.error)throw r.error;
 }catch(err){
  if(h){ h.textContent="Nicht abgehakt: "+((err&&err.message)||err); h.style.color="var(--red)" }
  return;
 }
 await lfLaden();
 lfEinkaufZeichnen();
 lfZeichnen();
 if(h){
  h.style.color="var(--muted)";
  h.textContent="„"+((a&&a.bezeichnung)||"Der Artikel")+"“ ist abgehakt"
   +(a&&lfFehlt(a)>0?" – er steht weiter auf der Liste, weil sein Mindestbestand unterschritten ist.":".");
 }
}

// ---- Mindestbestand am Artikel --------------------------------------------
let lfArtikelOffenId=null;
function lfArtikelOeffnen(id){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(id);
 if(!a){ lfMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 lfArtikelOffenId=a.id;
 $("liefArtikelTitel").textContent=a.bezeichnung;
 $("liefArtikelUnter").textContent=(a.lieferant?a.lieferant+" · ":"")+"Art.-Nr. "+a.artikelnr
  +(a.ean?" · "+a.ean:"")+" · Bestand "+lfZahlText(lfBestand(a.id));
 $("liefArtikelMindest").value=lfMindest(a)?lfZahlText(lfMindest(a)):"";
 // v3.233: Der Preis steht hier, damit sich einzelne von Hand eintragen
 // lassen, bevor die Preisliste des Haendlers da ist.
 $("liefArtikelPreis").value=lfHatPreis(a)?lfPreis(a).toFixed(2):"";
 const pa=$("liefArtikelPreisStand");
 if(pa){
  const alt=lfPreisAlterText(a);
  pa.textContent=lfHatPreis(a)
   ? (alt||"Preis ist aktuell erfasst.")
   : "Noch kein Preis hinterlegt – ohne ihn rechnet die Einkaufsliste diese Position nicht mit.";
  pa.style.color=/älter als ein Jahr/.test(alt)?"var(--red)":"var(--muted)";
 }
 // v3.232: Steht der Artikel schon von Hand auf der Liste, kommen Menge und
 // Grund mit - dann aendert der Knopf die vorhandene Zeile, statt eine
 // zweite anzulegen. Das steht auch so da, sonst waere nicht erkennbar,
 // warum die Felder gefuellt sind.
 const wunsch=lfHandEintrag(a);
 $("liefArtikelWunschMenge").value=wunsch?lfZahlText(wunsch.menge):(a.vpe?lfZahlText(a.vpe):"1");
 $("liefArtikelWunschGrund").value=(wunsch&&wunsch.grund)||"";
 $("liefArtikelWunschSetzen").textContent=wunsch?"🛒 Menge ändern":"🛒 Auf die Einkaufsliste";
 const hin=$("liefArtikelWunschHinweis");
 if(hin)hin.textContent=wunsch
  ? "Steht bereits von Hand auf der Einkaufsliste."
  : "Einmalig bestellen, ohne dafür einen Mindestbestand festzulegen.";
 $("liefArtikelFehler").textContent="";
 $("liefArtikelModal").hidden=false;
 setTimeout(()=>{ const f=$("liefArtikelMindest"); if(f){f.focus();f.select()} },60);
}
function lfArtikelSchliessen(){
 if(typeof $==="function"&&$("liefArtikelModal"))$("liefArtikelModal").hidden=true;
 lfArtikelOffenId=null;
}
async function lfMindestSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfArtikelOffenId);
 if(!a)return;
 const roh=$("liefArtikelMindest").value.trim();
 const m=roh?lfZahl(roh):0;
 if(m<0){ $("liefArtikelFehler").textContent="Ein Mindestbestand kann nicht negativ sein."; return }
 // v3.233: Ein LEERES Preisfeld heisst "kein Preis" und schreibt NULL - nicht
 // 0. Ein Artikel zu 0 Franken waere eine Behauptung ueber den Haendler; die
 // Einkaufsliste wuerde ihn mitsummieren und das Total waere still falsch.
 const rohP=$("liefArtikelPreis").value.trim();
 const p=rohP===""?null:Number(rohP.replace(",","."));
 if(p!==null&&(!Number.isFinite(p)||p<0)){
  $("liefArtikelFehler").textContent="Der Preis muss eine Zahl ab 0 sein – oder leer bleiben.";
  return;
 }
 $("liefArtikelSpeichern").disabled=true;
 try{
  const r=await sb.from("lieferanten_artikel").update({mindestbestand:m,preis:p}).eq("id",a.id);
  if(r.error)throw r.error;
 }catch(e){
  $("liefArtikelFehler").textContent="Nicht gespeichert: "+((e&&e.message)||e);
  $("liefArtikelSpeichern").disabled=false;
  return;
 }
 $("liefArtikelSpeichern").disabled=false;
 lfArtikelSchliessen();
 await lfLaden();
 lfZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 const teile=[];
 teile.push(m>0?"Mindestbestand "+lfZahlText(m):"nicht mehr überwacht");
 if(p!==null)teile.push("Preis CHF "+p.toFixed(2));
 lfMeldung("„"+a.bezeichnung+"“: "+teile.join(", ")+".");
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
              masse?esc(masse):"",a.ean?esc(a.ean):"",
              lfHatPreis(a)?esc(lfPreisText(a)):""].filter(Boolean).join(" · ");
 // v3.231: Ein ueberwachter Artikel zeigt seinen Mindestbestand, und wenn er
 // unterschritten ist, faellt das in der Zeile auf - nicht erst in der
 // Einkaufsliste. Der Mangel gehoert dorthin, wo man ihn sieht.
 const mindest=lfMindest(a), fehlt=lfFehlt(a);
 return `<div class="kw-zeile">
  <button type="button" class="lf-artikel" data-lf-artikel="${esc(a.id)}"
   style="flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer">
   <b>${esc(a.bezeichnung)}</b>
   <div class="small" style="color:var(--muted)">${unten}</div>
  </button>
  <div class="small" style="text-align:right;min-width:78px">
   <b style="font-size:15px${fehlt>0?";color:var(--red)":""}">${esc(lfZahlText(bestand))}</b>
   ${mindest>0?`<div style="color:${fehlt>0?"var(--red)":"var(--muted)"}">von ${esc(lfZahlText(mindest))}</div>`
              :(a.vpe?`<div style="color:var(--muted)">VPE ${esc(lfZahlText(a.vpe))}</div>`:"")}
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
  const fehlt=lfUnterMindest().length;
  k.innerHTML=`<b>${lfArtikel.length}</b> Artikel · <b>${mitBestand}</b> mit Bestand · <b>${lfBewegungen.length}</b> Buchungen`
   +(fehlt?` · <b style="color:var(--red)">${fehlt}</b> unter Mindestbestand`:"");
 }
 // v3.232: Der Knopf zaehlt die ganze Einkaufsliste, nicht nur die
 // unterschrittenen Mindestbestaende - sonst fehlte von Hand Gesetztes in
 // der Zahl, und der Knopf staende auf 0, waehrend die Liste voll ist.
 //
 // Das Symbol ist bewusst kein Einkaufswagen mehr. Der Anwender hat nach dem
 // "Hineinlegen" gesucht, das es nicht gab: 🛒 verspricht Hinzufuegen. Jetzt
 // heisst 🛒 ueberall HINZUFUEGEN und 📋 ANSEHEN.
 const e=$("liefEinkaufKnopf");
 if(e){
  const n=lfEinkaufsliste().length;
  e.textContent=n?"📋 Einkaufsliste ("+n+")":"📋 Einkaufsliste";
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
   vpe:lfZahl(a.vpe), mindestbestand:lfZahl(a.mindestbestand),
   preis:lfHatPreis(a)?lfPreis(a):"",
   ean:String(a.ean||""), hinweis:String(a.hinweis||"") }; });
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
 const art=t.closest("[data-lf-artikel]");
 if(art){ lfArtikelOeffnen(art.getAttribute("data-lf-artikel")); return }
 const erl=t.closest("[data-lf-erledigt]");
 if(erl){ lfEinkaufErledigt(erl.getAttribute("data-lf-erledigt")); return }
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
  {key:"mindestbestand",label:"Mindestbestand",zahl:true,
   alias:["mindestbestand","mindest","minbestand","meldebestand","sollbestand"]},
  // v3.233: Die Spalte steht bereit, bevor es die Preisliste gibt. Kommt sie,
  // ist sie ein gewoehnlicher Upload - kein Umbau, kein Warten.
  {key:"preis",label:"Preis (CHF)",zahl:true,
   alias:["preis","preischf","chf","einzelpreis","listenpreis","nettopreis",
          "ekpreis","ek","vkpreis","bruttopreis","stueckpreis"]},
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
 an("liefEinkaufKnopf",()=>lfEinkaufOeffnen());
 an("liefEinkaufKopieren",()=>lfEinkaufKopieren());
 an("liefEinkaufSchliessen",()=>{ $("liefEinkaufModal").hidden=true });
 an("liefArtikelAbbrechen",()=>lfArtikelSchliessen());
 an("liefArtikelSpeichern",()=>lfMindestSpeichern());
 an("liefArtikelWunschSetzen",()=>lfAufEinkaufsliste());
 const s=$("liefSuche");
 if(s)s.oninput=()=>{ lfSuche=s.value; lfZeichnen() };
});
