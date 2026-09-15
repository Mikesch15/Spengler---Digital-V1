"use strict";
// ---------------------------------------------------------------------------
// Lagerverwaltung Phase 1 (v3.98, Artikelbasis korrigiert in v3.102,
// mehrere Produkte je Position seit v3.106)
//
// v3.98 baute versehentlich auf lagerbestand auf (dem Blech-Materialbestand:
// Rolle/Tafel, Staerke, Ausfuehrung, Masse - js/59-lagerbestand.js). Das ist
// fachlich falsch: die Lagerverwaltung soll ALLGEMEINES Material erfassen
// (Schrauben, Dichtband, Rinnenhalter etc.), nicht Blech. lagerbestand hat
// mit der Lagerverwaltung nichts zu tun und bleibt unveraendert bestehen.
//
// Seit v3.102 baut die Lagerverwaltung auf materials auf - der Artikelliste
// der Firma (EDV-Nr./Bezeichnung/Dim./Einheit/Preis), die im Regierapport
// und beim Blechverbrauch laengst verwendet wird. Die zusammengefuehrte
// Liste liefert lagArtikelListe() (js/59) - dieselbe Funktion, die auch das
// Materialbestand-Formular fuer seine Artikel-Auswahl nutzt.
//
// v3.106: eine Materialposition ("Rohrbogen" im Regierapport) kann mehrere,
// EINZELN buchbare Produkte enthalten (z. B. verschiedene Rohrbogen-Groessen/
// -Winkel). Neue Tabelle lager_varianten (material_id -> materials.id) traegt
// dafuer je Produkt Bezeichnung und Barcode; lagerbestand_bewegungen zeigt
// seither auf lager_varianten statt auf materials direkt (Spalte
// variante_id statt material_id). Einheitliches Modell: JEDE Position hat
// mindestens eine Variante - fuer bereits bestehende Positionen legte die
// Migration automatisch genau eine Standard-Variante an (Bezeichnung =
// Materialname). Hat eine Position nur diese eine Variante, sieht die Karte
// unveraendert aus wie vor v3.106 (flach, direkt buchbar) - erst ab der
// zweiten Variante wird sie zur Gruppe mit eigenen Unter-Karten je Produkt.
// materials.barcode (v3.102) entfaellt dadurch - der Barcode identifiziert
// jetzt immer ein einzelnes Produkt (lager_varianten.barcode), nie mehr eine
// ganze Position.
//
// Der Bestand ist weiterhin NIE ein editierbares Feld, sondern immer die
// Summe ueber lagerbestand_bewegungen (Zugang positiv, Abgang negativ,
// Korrektur signiert), jetzt je Variante statt je Position. Eine Buchung ist
// unveraenderlich - ein Fehler wird durch eine neue Korrektur-Buchung
// ausgeglichen, nie durch Aendern der Vergangenheit (kein Update/Delete in
// der RLS, siehe Migration).
//
// Sichtbarkeit: eigenes Feature-Flag "lager" in feature_access, exakt wie
// der Offerte-Zugriff (js/63-angebote.js) - ein Ein/Aus je Mitarbeiter,
// unabhaengig vom bestehenden Rechte-Modell. Auch ein Administrator braucht
// die Freigabe eigens. lager_varianten hat dieselbe Firmen- UND
// Feature-Grenze wie lagerbestand_bewegungen (siehe Migration).
//
// Barcode-Scan (v3.102, auf Varianten umgestellt in v3.106): "Einscannen"/
// "Ausscannen" oeffnen die Kamera (barcodeScannen() aus js/01-basis.js),
// suchen den erkannten Code unter den Varianten und oeffnen bei Treffer
// direkt den Buchen-Dialog mit vorbelegter Art - der Benutzer bestaetigt nur
// noch die Menge. Ein unbekannter Barcode beim EINSCANNEN (Zugang) bietet
// jetzt an, daraus direkt ein neues Produkt anzulegen und einer
// Materialposition zuzuordnen (lagerNeuesProduktOeffnen) - beim AUSSCANNEN
// (Abgang) ergibt das keinen Sinn (kein Bestand ohne vorherigen Zugang) und
// bleibt bei der reinen Meldung. Eine verpasste Scan-Aktion laesst sich
// grundsaetzlich NICHT im Nachhinein aus den Buchungsdaten erkennen (sie
// hinterlaesst ja gerade kein Ereignis) - deshalb hier bewusst auf
// moeglichst wenig Reibung gesetzt statt auf eine Erkennung, die falsche
// Sicherheit vortaeuschen wuerde (dieselbe Lehre wie beim entfernten
// lagerbestand.menge, siehe js/59).
// ---------------------------------------------------------------------------

let lagerverwaltungZugriff=false;
let lagerBewegungen=[];
let lagerVarianten=[];

// Wird aus afterLogin() (js/03-login.js) aufgerufen, wie checkOfferteZugriff().
async function checkLagerZugriff(){
 lagerverwaltungZugriff=false;
 if(currentProfile){
  try{
   const {data,error}=await sb.from("feature_access").select("granted")
    .eq("profile_id",currentProfile.id).eq("feature","lager").maybeSingle();
   lagerverwaltungZugriff=!error&&!!data&&!!data.granted;
  }catch(e){lagerverwaltungZugriff=false;}
 }
 if($("lagerverwaltungSection"))$("lagerverwaltungSection").hidden=!lagerverwaltungZugriff;
 if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=!lagerverwaltungZugriff;
 // v3.120: derselbe Schalter traegt den Ausbuchen-Knopf in der Massaufnahme -
 // ohne Lager-Freigabe gibt es dort nichts auszubuchen.
 if($("measLagerAusbuchen"))$("measLagerAusbuchen").hidden=!lagerverwaltungZugriff;
 if(lagerverwaltungZugriff){
  // Reihenfolge wichtig: die Varianten muessen vor dem Rendern (das
  // lagerBewegungenLaden() am Ende ausloest) bereits geladen sein.
  await lagerVariantenLaden();
  await lagerBewegungenLaden();
 }
}

async function lagerVariantenLaden(){
 const {data,error}=await sb.from("lager_varianten").select("*")
   .order("created_at",{ascending:true});
 if(error){
  lagerVarianten=[];
  lagerHinweis("Produkte konnten nicht geladen werden: "+error.message,true);
  return;
 }
 lagerVarianten=data||[];
}
function lagerVariantenVonMaterial(materialId){
 return lagerVarianten.filter(v=>String(v.material_id)===String(materialId));
}
function lagerVariante(varianteId){
 return lagerVarianten.find(v=>String(v.id)===String(varianteId))||null;
}

// v3.101: direkter Einstieg von der Startseite statt ueber Einstellungen ->
// Lagerverwaltung suchen zu muessen - navigiert wie der bestehende
// Einstellungen-Kurzweg (z. B. js/04-start-suche.js) direkt zum Register.
if($("navLagerverwaltung"))$("navLagerverwaltung").onclick=()=>openSettingsTo("lager","lagerverwaltung");

function lagerZahl(v){const n=Number(v);return Number.isFinite(n)?n:0}
function lagerZahlText(v){
 return lagerZahl(v).toLocaleString("de-CH",{maximumFractionDigits:2});
}
function lagerHinweis(text,fehler){
 const el=$("lagerverwaltungHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--muted)";
 el.hidden=!text;
}

async function lagerBewegungenLaden(){
 const {data,error}=await sb.from("lagerbestand_bewegungen").select("*")
   .order("created_at",{ascending:false});
 if(error){
  lagerBewegungen=[];
  lagerHinweis("Bewegungen konnten nicht geladen werden: "+error.message,true);
  renderLagerverwaltung();
  return;
 }
 lagerBewegungen=data||[];
 lagerHinweis("");
 renderLagerverwaltung();
}

function lagerBewegungenVon(varianteId){
 return lagerBewegungen.filter(b=>String(b.variante_id)===String(varianteId));
}
function lagerBestandVon(varianteId){
 return lagerBewegungenVon(varianteId).reduce((s,b)=>s+lagerZahl(b.menge),0);
}
const LAGER_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};
function lagerBewegungZeile(b){
 const datum=b.created_at?new Date(b.created_at).toLocaleDateString("de-CH"):"–";
 const vz=lagerZahl(b.menge)>0?"+":"";
 return `${esc(datum)} · ${esc(LAGER_ART_TEXT[b.art]||b.art)} · ${vz}${lagerZahlText(b.menge)}${b.grund?" · "+esc(b.grund):""}<br>`;
}

// Wiederverwendet lagArtikelListe()/lagArtikel()/lagArtikelText() aus
// js/59-lagerbestand.js fuer die MATERIALPOSITIONEN (EDV-Nr./Bezeichnung) -
// dieselbe Liste wie im Materialbestand-Formular. Welche(s) PRODUKT(E) zu
// einer Position gehoeren, kommt aus lagerVariantenVonMaterial() (v3.106).
//
// v3.104: die Liste ist je Karte klappbar (dasselbe Karten-Muster wie
// js/51-werkstatt.js, werkOffenKarte). Der Buchen-Knopf bleibt im Kopf
// sichtbar, damit die haeufigste Aktion kein Aufklappen braucht. "Alle
// zuklappen" blendet die GESAMTE Liste auf einen Schlag aus.
//
// v3.106: hat eine Position nur ihre eine Standard-Variante, sieht die
// Karte unveraendert wie vor v3.106 aus (Kopf = Position, direkt buchbar).
// Erst ab der zweiten Variante wird der Kopf zur reinen Gruppen-Ueberschrift
// (Positionsname + Anzahl Produkte + Gesamtbestand, selbst nicht mehr
// buchbar) und jedes Produkt bekommt eine eigene Unter-Karte mit eigenem
// Bestand und eigenem Buchen-Knopf. lagerOffenArtikel verwendet fuer
// Gruppen-Koepfe den Schluessel "m"+materialId (eigener Namensraum, damit
// er nie mit einer Varianten-ID kollidiert).
let lagerOffenArtikel=new Set();
let lagerListeVersteckt=false;
function lagerVarianteZeile(v,gruppiert){
 const bestand=lagerBestandVon(v.id);
 const offen=lagerOffenArtikel.has(String(v.id));
 const letzte=lagerBewegungenVon(v.id).slice(0,5);
 const klasse=gruppiert?"lager-variante":"lager-karte";
 return `<div class="${klasse}">
 <div class="${klasse}-kopf" role="button" tabindex="0" aria-expanded="${offen?"true":"false"}" data-lager-karte="${v.id}">
  <span class="lager-karte-pfeil">${offen?"▾":"▸"}</span>
  <div class="lager-karte-info">
   <b>${esc(v.bezeichnung)}</b>
   <span class="small" style="color:var(--muted);display:block">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  </div>
  <button type="button" class="blue" data-lager-buchen="${v.id}">📦 Buchen</button>
 </div>
 ${offen?`<div class="lager-karte-body">
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
 </div>`:""}
</div>`;
}
function renderLagerverwaltung(){
 const box=$("lagerverwaltungListe");
 if(!box)return;
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 if($("lagerAlleZuklappen")){
  $("lagerAlleZuklappen").textContent=lagerListeVersteckt?"⯈ Alle anzeigen":"⯆ Alle zuklappen";
  $("lagerAlleZuklappen").hidden=!liste.length;
 }
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material im Material-Katalog erfasst - dort (Einstellungen → Material) zuerst einen Artikel anlegen.</div>`;
  return;
 }
 if(lagerListeVersteckt){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Liste eingeklappt (${liste.length} Artikel) - "Alle anzeigen" zeigt sie wieder.</div>`;
  return;
 }
 box.innerHTML=liste.map(a=>{
  const varianten=lagerVariantenVonMaterial(a.id);
  if(varianten.length<=1){
   if(!varianten.length){
    // Randfall: eine Position ganz ohne Standard-Variante (z. B. gerade
    // erst angelegt, bevor eine Migration/ein Trigger sie ergaenzen konnte).
    return `<div class="lager-karte"><div class="lager-karte-kopf"><div class="lager-karte-info">
 <b>${esc(lagArtikelText(a))}</b>
 <span class="small" style="color:var(--red)">Noch kein Produkt erfasst - "＋ Weiteres Produkt" unten anlegen.</span>
</div></div>
<div class="bar" style="margin-top:6px"><button type="button" class="gray" data-lager-neues-produkt="${a.id}">＋ Produkt zu dieser Position erfassen</button></div>
</div>`;
   }
   // Genau eine Variante: unveraendert flach wie vor v3.106, direkt buchbar.
   // Die Materialposition (EDV-Nr./Name) bleibt die sichtbare Bezeichnung -
   // die (identische) Standard-Variantenbezeichnung wird nicht doppelt gezeigt.
   const v=varianten[0];
   const bestand=lagerBestandVon(v.id);
   const offen=lagerOffenArtikel.has(String(v.id));
   const letzte=lagerBewegungenVon(v.id).slice(0,5);
   return `<div class="lager-karte">
 <div class="lager-karte-kopf" role="button" tabindex="0" aria-expanded="${offen?"true":"false"}" data-lager-karte="${v.id}">
  <span class="lager-karte-pfeil">${offen?"▾":"▸"}</span>
  <div class="lager-karte-info">
   <b>${esc(lagArtikelText(a))}</b>
   <span class="small" style="color:var(--muted);display:block">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  </div>
  <button type="button" class="blue" data-lager-buchen="${v.id}">📦 Buchen</button>
 </div>
 ${offen?`<div class="lager-karte-body">
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
  <div class="bar" style="margin-top:6px"><button type="button" class="gray" data-lager-neues-produkt="${a.id}">＋ Weiteres Produkt zu dieser Position</button></div>
 </div>`:""}
</div>`;
  }
  // Mehrere Produkte: der Kopf ist reine Gruppen-Ueberschrift, jedes Produkt
  // darunter eine eigene, einzeln buchbare Unter-Karte.
  const gruppenSchluessel="m"+a.id;
  const offenGruppe=lagerOffenArtikel.has(gruppenSchluessel);
  const gesamtbestand=varianten.reduce((s,v)=>s+lagerBestandVon(v.id),0);
  return `<div class="lager-karte">
 <div class="lager-karte-kopf" role="button" tabindex="0" aria-expanded="${offenGruppe?"true":"false"}" data-lager-karte="${gruppenSchluessel}">
  <span class="lager-karte-pfeil">${offenGruppe?"▾":"▸"}</span>
  <div class="lager-karte-info">
   <b>${esc(lagArtikelText(a))}</b>
   <span class="small" style="color:var(--muted);display:block">${varianten.length} Produkte · Bestand gesamt: <b>${lagerZahlText(gesamtbestand)}</b></span>
  </div>
 </div>
 ${offenGruppe?`<div class="lager-karte-body">
  ${varianten.map(v=>lagerVarianteZeile(v,true)).join("")}
  <div class="bar" style="margin-top:6px"><button type="button" class="gray" data-lager-neues-produkt="${a.id}">＋ Weiteres Produkt zu dieser Position</button></div>
 </div>`:""}
</div>`;
 }).join("");
}

// ---- Buchen-Dialog -----------------------------------------------------
let lagerBuchenVarianteId=null;

// vorbelegteArt (v3.102): nach einem Scan ist die Richtung schon bekannt -
// "zugang"/"abgang" wird dann direkt gesetzt, der Benutzer bestaetigt nur
// noch die Menge. Ohne Scan (Knopf "Buchen" in der Liste) bleibt es wie
// bisher bei "zugang" als Ausgangswert, frei aenderbar.
function lagerBuchenOeffnen(varianteId,vorbelegteArt){
 lagerBuchenVarianteId=varianteId;
 const v=lagerVariante(varianteId);
 const a=v&&typeof lagArtikel==="function"?lagArtikel(v.material_id):null;
 // Bei der Standard-Variante (Bezeichnung = Materialname) reicht die
 // Positionsbezeichnung; bei einem echten Zusatzprodukt werden Position UND
 // Produktname gezeigt, damit unter "Rohrbogen" klar ist, WELCHER gemeint ist.
 const text=v
  ?((a&&v.bezeichnung!==a.name)?(lagArtikelText(a)+" – "+v.bezeichnung):(a?lagArtikelText(a):v.bezeichnung))
   +" · aktueller Bestand: "+lagerZahlText(lagerBestandVon(varianteId))
  :"";
 $("lagerBuchenArtikel").textContent=text;
 $("lagerBuchenArt").value=(vorbelegteArt==="abgang"||vorbelegteArt==="korrektur")?vorbelegteArt:"zugang";
 $("lagerBuchenMenge").value="";
 $("lagerBuchenGrund").value="";
 $("lagerBuchenFehler").hidden=true;
 $("lagerBuchenModal").hidden=false;
 // Direkt ins Mengenfeld - nach einem Scan will niemand erst hintippen.
 if(vorbelegteArt)setTimeout(()=>{try{$("lagerBuchenMenge").focus()}catch(e){}},50);
}
function lagerBuchenSchliessen(){
 $("lagerBuchenModal").hidden=true;
 lagerBuchenVarianteId=null;
}
$("lagerBuchenAbbrechen").onclick=lagerBuchenSchliessen;

if($("lagerAlleZuklappen"))$("lagerAlleZuklappen").onclick=()=>{
 lagerListeVersteckt=!lagerListeVersteckt;
 renderLagerverwaltung();
};

$("lagerverwaltungListe").addEventListener("click",e=>{
 // Buchen- und Neues-Produkt-Knopf sitzen IM Kartenkopf bzw. -koerper - ein
 // Klick darauf darf nicht zusaetzlich die Karte auf-/zuklappen (dasselbe
 // Muster wie beim Werkstatt-Kartenkopf, js/51-werkstatt.js).
 const b=e.target.closest("[data-lager-buchen]");
 if(b){lagerBuchenOeffnen(b.dataset.lagerBuchen);return}
 const neu=e.target.closest("[data-lager-neues-produkt]");
 if(neu){lagerNeuesProduktOeffnen(neu.dataset.lagerNeuesProdukt);return}
 const karte=e.target.closest("[data-lager-karte]");
 if(karte){
  const id=karte.dataset.lagerKarte;
  if(lagerOffenArtikel.has(id))lagerOffenArtikel.delete(id); else lagerOffenArtikel.add(id);
  renderLagerverwaltung();
 }
});

// Der Kartenkopf ist ein role="button" - auch mit der Tastatur bedienbar
// (Enter/Leertaste), wie der Werkstatt-Kartenkopf.
document.addEventListener("keydown",e=>{
 if(e.key!=="Enter"&&e.key!==" ")return;
 if(!e.target||!e.target.closest)return;
 const k=e.target.closest("[data-lager-karte]");
 if(!k||e.target.closest("button"))return;
 e.preventDefault();
 k.click();
});

// ---- Einscannen / Ausscannen (v3.102, auf Varianten umgestellt in v3.106) -
// Barcode -> Produkt (lager_varianten) suchen -> Buchen-Dialog direkt mit
// der passenden Art oeffnen. Kein Treffer beim Einscannen (Zugang): direkt
// anbieten, daraus ein neues Produkt anzulegen (siehe lagerNeuesProduktOeffnen)
// - beim Ausscannen (Abgang) bleibt es bei der reinen Meldung, siehe
// Kopfkommentar. Der Benutzer soll nie raetseln, ob der Scan "funktioniert
// hat".
function lagerVarianteZuBarcode(code){
 return lagerVarianten.find(v=>v.barcode&&v.barcode===code)||null;
}
function lagerScannenUndBuchen(art){
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{
  const v=lagerVarianteZuBarcode(code);
  if(!v){
   if(art==="zugang"){
    lagerNeuesProduktOeffnen(null,code);
    return;
   }
   lagerHinweis("Kein Produkt mit diesem Barcode gefunden ("+code+") - beim Einscannen (Zugang) lässt sich daraus ein neues Produkt anlegen.",true);
   return;
  }
  lagerHinweis("");
  lagerBuchenOeffnen(v.id,art);
 });
}
if($("lagerEinscannen"))$("lagerEinscannen").onclick=()=>lagerScannenUndBuchen("zugang");
if($("lagerAusscannen"))$("lagerAusscannen").onclick=()=>lagerScannenUndBuchen("abgang");

$("lagerBuchenSpeichern").onclick=async()=>{
 const fehler=$("lagerBuchenFehler");
 fehler.hidden=true;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Eine Lagerbuchung"))return;
 const art=$("lagerBuchenArt").value;
 const eingabe=lagerZahl($("lagerBuchenMenge").value);
 if(!lagerBuchenVarianteId||!eingabe){
  fehler.textContent="Bitte eine Menge ungleich 0 eingeben.";
  fehler.hidden=false;
  return;
 }
 // Zugang/Abgang: der Benutzer gibt immer eine positive Menge ein, die
 // Richtung kommt aus "Art" - so muss niemand an ein Minuszeichen denken.
 // Korrektur: die Eingabe zaehlt so, wie sie ist (kann auch negativ sein).
 let menge=Math.abs(eingabe);
 if(art==="abgang")menge=-menge;
 else if(art==="korrektur")menge=eingabe;
 const grund=$("lagerBuchenGrund").value.trim();
 const {data,error}=await sb.from("lagerbestand_bewegungen").insert({
  variante_id:Number(lagerBuchenVarianteId),art,menge,grund:grund||null
 }).select("*");
 if(error||!data||!data.length){
  fehler.textContent=error?("Konnte nicht gebucht werden: "+error.message)
    :"Es wurde nichts gebucht. Fehlt die nötige Berechtigung?";
  fehler.hidden=false;
  return;
 }
 lagerBewegungen.unshift(data[0]);
 renderLagerverwaltung();
 lagerBuchenSchliessen();
};

// ---- Neues Produkt erfassen (v3.106) ------------------------------------
// Zwei Wege dahin: (1) ein unbekannter Barcode beim Einscannen ruft dies mit
// materialId=null aber vorausgefuelltem Barcode auf - die Materialposition
// muss dann noch gewaehlt werden; (2) "＋ Weiteres Produkt" innerhalb einer
// bereits aufgeklappten Position ruft dies mit der Position vorbelegt auf,
// der Barcode wird dann per Scan/Eingabe im Formular selbst ergaenzt.
let lagerNeuesProduktMaterialListeVoll=[];
function lagerNeuesProduktOeffnen(materialId,barcode){
 const fehler=$("lagerNeuesProduktFehler");
 if(fehler)fehler.hidden=true;
 $("lagerNeuesProduktBezeichnung").value="";
 $("lagerNeuesProduktBarcode").value=barcode||"";
 lagerNeuesProduktMaterialListeVoll=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 if($("lagerNeuesProduktMaterialSuche"))$("lagerNeuesProduktMaterialSuche").value="";
 lagerNeuesProduktMaterialRendern(lagerNeuesProduktMaterialListeVoll,materialId);
 $("lagerNeuesProduktModal").hidden=false;
 setTimeout(()=>{try{$("lagerNeuesProduktBezeichnung").focus()}catch(e){}},50);
}
function lagerNeuesProduktMaterialRendern(liste,materialId){
 $("lagerNeuesProduktMaterial").innerHTML=`<option value="">– bitte wählen –</option>`+
  liste.map(a=>`<option value="${a.id}"${String(a.id)===String(materialId||"")?" selected":""}>${esc(lagArtikelText(a))}</option>`).join("");
}
// v3.118: bei einem grossen Materialkatalog ist eine lange, unsortierte
// Auswahlliste unpraktisch - die Suche filtert die sichtbaren Optionen live
// nach EDV-Nr./Bezeichnung/Dim. (derselbe Text wie lagArtikelText() anzeigt).
// Die bereits gewaehlte Position bleibt beim Weitertippen immer in der Liste,
// damit eine einmal getroffene Auswahl nicht durch das Filtern verloren geht.
if($("lagerNeuesProduktMaterialSuche"))$("lagerNeuesProduktMaterialSuche").addEventListener("input",()=>{
 const begriff=$("lagerNeuesProduktMaterialSuche").value.trim().toLowerCase();
 const aktuelleId=$("lagerNeuesProduktMaterial").value;
 let liste=lagerNeuesProduktMaterialListeVoll;
 if(begriff){
  liste=lagerNeuesProduktMaterialListeVoll.filter(a=>
   String(a.id)===String(aktuelleId)||lagArtikelText(a).toLowerCase().includes(begriff));
 }
 lagerNeuesProduktMaterialRendern(liste,aktuelleId);
});
function lagerNeuesProduktSchliessen(){
 $("lagerNeuesProduktModal").hidden=true;
}
if($("lagerNeuesProduktAbbrechen"))$("lagerNeuesProduktAbbrechen").onclick=lagerNeuesProduktSchliessen;
if($("lagerNeuesProduktScan"))$("lagerNeuesProduktScan").onclick=()=>{
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{$("lagerNeuesProduktBarcode").value=code});
};
if($("lagerNeuesProduktSpeichern"))$("lagerNeuesProduktSpeichern").onclick=async()=>{
 const fehler=$("lagerNeuesProduktFehler");
 fehler.hidden=true;
 const bezeichnung=$("lagerNeuesProduktBezeichnung").value.trim();
 const materialId=$("lagerNeuesProduktMaterial").value;
 const barcode=$("lagerNeuesProduktBarcode").value.trim();
 if(!bezeichnung){fehler.textContent="Bitte eine Bezeichnung eingeben.";fehler.hidden=false;return}
 if(!materialId){fehler.textContent="Bitte eine Materialposition auswählen.";fehler.hidden=false;return}
 const {data,error}=await sb.from("lager_varianten").insert({
  material_id:Number(materialId),bezeichnung,barcode:barcode||null
 }).select("*");
 if(error||!data||!data.length){
  fehler.textContent=error?("Konnte nicht angelegt werden: "+error.message
    +(/duplicate|unique/i.test(error.message||"")?"\n\nDieser Barcode ist bereits einem anderen Produkt zugeordnet.":""))
    :"Es wurde nichts angelegt.";
  fehler.hidden=false;
  return;
 }
 lagerVarianten.push(data[0]);
 lagerOffenArtikel.add("m"+materialId);
 lagerNeuesProduktSchliessen();
 renderLagerverwaltung();
 // Direkt weiter zum Buchen - fuer das erste Mal Bestand erfassen (Zugang
 // als sinnvoller Ausgangswert, ein neu erfasstes Produkt hat ja noch keinen
 // Bestand).
 lagerBuchenOeffnen(data[0].id,"zugang");
};

// ---- Massaufnahme -> Lager ausbuchen (v3.120) -----------------------------
// Bewusst ausgeloest, nie automatisch: eine Lagerbuchung ist unveraenderlich
// (kein Update/Delete in der RLS, siehe Kopfkommentar) - eine versehentlich
// automatische Ausbuchung liesse sich nur noch durch eine Gegenbuchung
// heilen. Deshalb ein eigener Knopf in der Massaufnahme, ein Dialog zum
// Pruefen und erst dann die Buchung.
//
// Zwei Quellen (v3.121):
//
//  1. Die von Hand erfassten Materialzeilen der Massaufnahme
//     (measRapportMaterial aus js/57, gespeichert in
//     measurements.rapport_material). Sie tragen bereits eine EDV-Nr.
//  2. Die HALBFABRIKATE der Massaufnahme - bei einer Dachrinne also
//     Rinnenboeden, Stutzen, Rinnenhalter, Innen-/Aussenwinkel und
//     Dehnungsstuecke. Quelle ist rmatTeileZeilen() (js/57), dieselbe
//     Funktion, aus der auch der Regierapport-Dialog seine Halbfabrikate
//     zieht - es gibt dafuer keine zweite Ableitung.
//
// Die gerechneten Blechzuschnitte bleiben weiterhin aussen vor: das Lager
// fuehrt allgemeines Material, kein Blech (siehe Kopfkommentar dieser
// Datei). rmatZuschnittFlaeche()/rmatRollenFlaeche() werden hier deshalb
// bewusst NICHT aufgerufen.
//
// Die Zeile traegt eine EDV-Nr., das Lager bucht auf ein PRODUKT
// (lager_varianten). Dazwischen liegt die Materialposition: EDV-Nr. ->
// lagArtikelListe() -> material_id -> lagerVariantenVonMaterial(). Hat eine
// Position mehrere Produkte, waehlt der Anwender - die App raet nicht.
//
// Ein Halbfabrikat traegt KEINE EDV-Nr., sondern nur eine Bezeichnung
// ("Rinnenboden links Ø 333"). Die Materialposition dazu waehlt deshalb der
// Anwender - mit Suchfeld, weil ein Material-Katalog lang sein kann. Die App
// schlaegt eine Position vor, aber nur ueber dieselbe Bewertung wie der
// Regierapport-Dialog (rmatVorschlaege/rmatIstSicher, js/57), und sie waehlt
// nur dann vor, wenn dieser Vorschlag dort als SICHER gilt UND die Position
// im Lager genau ein Produkt hat. Geraten wird nichts.
let measLagerZeilen=[];

function measLagerMarke(id){return "(#MA"+id+")"}
// Schon einmal ausgebucht? Erkennbar allein an der Marke, die diese Funktion
// selbst in den Buchungsgrund schreibt - geraten wird nichts.
function measLagerFruehereBuchungen(id){
 if(!id)return [];
 const marke=measLagerMarke(id);
 return lagerBewegungen.filter(b=>String(b&&b.grund!=null?b.grund:"").includes(marke));
}
function measLagerBeschriftung(){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&$("measType")&&MEAS_TYPE_LABELS[$("measType").value])||"Massaufnahme";
 const titel=$("measTitle")?String($("measTitle").value||"").trim():"";
 return art+(titel?" · "+titel:"");
}

// Die Materialpositionen, die ueberhaupt zur Wahl stehen: nur solche, fuer
// die im Lager mindestens ein Produkt erfasst ist. Alles andere liesse sich
// gar nicht buchen und waere im Auswahlfeld nur Ballast.
function measLagerPositionsListe(){
 const artikel=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 return artikel.filter(a=>lagerVariantenVonMaterial(a.id).length>0);
}

// Die von Hand erfassten Materialzeilen. Jede wird zu genau einer Zeile -
// auch die nicht buchbaren, damit niemand raetselt, warum eine Position
// fehlt.
function measLagerErfassteZeilen(){
 const roh=(typeof measRapportMaterial!=="undefined"&&Array.isArray(measRapportMaterial))?measRapportMaterial:[];
 const artikel=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 return roh.map((z,i)=>{
  const no=String(z&&z.no!=null?z.no:"").trim();
  const menge=lagerZahl(String(z&&z.qty!=null?z.qty:"").replace(",","."));
  const a=no?artikel.find(x=>String(x.edv_nr).trim()===no):null;
  const varianten=a?lagerVariantenVonMaterial(a.id):[];
  return {
   id:"z"+i, art:"erfasst", no, menge,
   artikel:a,
   bezeichnung:a?lagArtikelText(a):(no||"(ohne EDV-Nr.)"),
   einheit:a&&a.unit?a.unit:"",
   varianten,
   varianteId:varianten.length===1?String(varianten[0].id):"",
   // Buchbar ist nur, was im Katalog steht, im Lager ein Produkt hat und
   // eine Menge ungleich 0 traegt.
   grund:!no?"Diese Zeile hat keine EDV-Nr."
    :!a?"Diese EDV-Nr. steht nicht im Material-Katalog."
    :!varianten.length?"Für diese Position ist im Lager noch kein Produkt erfasst."
    :!menge?"Diese Zeile hat keine Menge."
    :"",
   gewaehlt:false
  };
 });
}

// Die Halbfabrikate der Massaufnahme (v3.121). Gelesen wird der LIVE-Stand
// des Formulars: buildMeasurementFromForm() (js/16) baut denselben
// Datensatz, der beim Speichern in die Datenbank ginge - inklusive
// data.ausmass. Dadurch passt der Dialog zu dem, was gerade auf dem
// Bildschirm steht, genau wie bei measRapportMaterial oben.
function measLagerTeilZeilen(positionen){
 if(typeof rmatTeileZeilen!=="function")return [];
 let m=null;
 // Ein Formular, das gerade nicht vollstaendig ist, darf den Dialog nicht
 // zerreissen - dann gibt es eben keine Halbfabrikate.
 try{ m=(typeof buildMeasurementFromForm==="function")?buildMeasurementFromForm():null; }
 catch(e){ m=null; }
 if(!m||!m.data)return [];
 let teile=[];
 try{ teile=rmatTeileZeilen(m)||[]; }catch(e){ teile=[]; }
 const matName=(typeof rmatMatName==="function")?rmatMatName(m):"";
 return teile.map((t,i)=>{
  const menge=lagerZahl(t.menge);
  // Derselbe Vorschlag wie im Regierapport-Dialog - eine Bewertung, nicht
  // zwei, damit beide Stellen dieselbe Position nennen.
  let v=[];
  try{ v=(typeof rmatVorschlaege==="function")?rmatVorschlaege(t.bezeichnung,t.einheit,matName):[]; }
  catch(e){ v=[]; }
  const sicher=(typeof rmatIstSicher==="function")?rmatIstSicher(v):false;
  // Vorgewaehlt wird nur ein SICHERER Vorschlag, der im Lager auch wirklich
  // als Position mit Produkt existiert.
  const a=(sicher&&v.length)
   ?(positionen.find(x=>String(x.edv_nr).trim()===String(v[0].no).trim())||null)
   :null;
  const varianten=a?lagerVariantenVonMaterial(a.id):[];
  return {
   id:"t"+i, art:"teil", no:a?String(a.edv_nr):"", menge,
   artikel:a,
   bezeichnung:t.bezeichnung,
   einheit:t.einheit||"",
   positionen,
   // Der beste Vorschlag als Text - auch dann, wenn er nicht uebernommen
   // wurde. Der Anwender soll sehen, was die App gefunden hat.
   vorschlag:v.length?(v[0].no+" \u00b7 "+v[0].name):"",
   vorschlagSicher:sicher,
   suche:"",
   varianten,
   varianteId:varianten.length===1?String(varianten[0].id):"",
   grund:!positionen.length?"Im Lager ist noch keine Materialposition mit einem Produkt erfasst."
    :!menge?"Diese Zeile hat keine Menge."
    :"",
   gewaehlt:false
  };
 });
}

function measLagerZeilenBauen(){
 const positionen=measLagerPositionsListe();
 return measLagerErfassteZeilen().concat(measLagerTeilZeilen(positionen));
}

async function measLagerOeffnen(){
 if(!lagerverwaltungZugriff)return;
 if(!currentMeasurementId){
  alert("Bitte die Massaufnahme zuerst speichern.\n\n"
   +"Die Ausbuchung wird mit dieser Massaufnahme vermerkt - dafür braucht sie eine gespeicherte Fassung.");
  return;
 }
 if(typeof wsIstOffline==="function"&&wsIstOffline()){
  alert("Keine Verbindung.\n\nEine Lagerbuchung braucht eine Verbindung und lässt sich offline nicht vormerken.");
  return;
 }
 $("measLagerModal").hidden=false;
 $("measLagerFehler").hidden=true;
 $("measLagerListe").innerHTML='<div class="small">Lager wird geladen …</div>';
 // Bestand immer frisch: zwischen Anmeldung und diesem Klick kann jemand
 // anders gebucht haben.
 await lagerVariantenLaden();
 await lagerBewegungenLaden();
 measLagerZeilen=measLagerZeilenBauen();
 // Vorgewaehlt ist, was ohne Rueckfrage buchbar ist - eine Position mit
 // mehreren Produkten gehoert ausdruecklich NICHT dazu. Bei einem
 // Halbfabrikat (v3.121) heisst das zusaetzlich: nur wenn die App die
 // Materialposition oben als SICHER gefunden hat. Ohne Position bleibt die
 // Zeile sichtbar, aber unangehakt.
 measLagerZeilen.forEach(z=>{z.gewaehlt=!z.grund&&z.varianten.length===1&&!!z.varianteId});
 const frueher=measLagerFruehereBuchungen(currentMeasurementId);
 const warnung=$("measLagerWarnung");
 if(frueher.length){
  const datum=frueher[0].created_at?new Date(frueher[0].created_at).toLocaleDateString("de-CH"):"";
  warnung.innerHTML="⚠️ Für diese Massaufnahme wurde bereits ausgebucht"
   +(datum?" (zuletzt am "+esc(datum)+")":"")+" – "+frueher.length+" Buchung"+(frueher.length===1?"":"en")
   +". Ein zweites Mal bucht zusätzlich aus.";
  warnung.hidden=false;
 }else{
  warnung.hidden=true;
 }
 renderMeasLagerListe();
}
function measLagerSchliessen(){
 $("measLagerModal").hidden=true;
 measLagerZeilen=[];
}

// Das Auswahlfeld der Materialposition - nur fuer Halbfabrikate, die keine
// EDV-Nr. mitbringen. Mit Suchfeld, weil ein Material-Katalog lang sein kann
// (dieselbe Loesung wie beim Produkt-Formular, v3.118).
function measLagerPositionOptionen(z){
 const begriff=String(z.suche||"").trim().toLowerCase();
 const gewaehlt=z.artikel?String(z.artikel.id):"";
 const liste=begriff
  // Die bereits gewaehlte Position bleibt IMMER in der Liste - sonst wuerde
  // eine Suche sie stillschweigend abwaehlen.
  ?z.positionen.filter(a=>String(a.id)===gewaehlt||lagArtikelText(a).toLowerCase().includes(begriff))
  :z.positionen;
 return `<option value="">– Position wählen –</option>`+
  liste.map(a=>`<option value="${esc(a.id)}"${String(a.id)===gewaehlt?" selected":""}>${esc(lagArtikelText(a))}</option>`).join("");
}
function measLagerPositionHtml(z){
 const hinweis=z.artikel
  ?(z.vorschlagSicher?`<span class="rmat-sicher">✓ Vorschlag der App</span>`:"")
  :(z.vorschlag
    ?`<span class="rmat-unsicher">Vorschlag: ${esc(z.vorschlag)} – bitte prüfen und wählen</span>`
    :`<span class="rmat-unsicher">Keine passende Position gefunden – bitte selbst wählen.</span>`);
 return `<div class="rmat-pos">
  <input type="search" placeholder="Position suchen …" data-meas-lager-suche="${esc(z.id)}" value="${esc(z.suche||"")}">
  <select data-meas-lager-position="${esc(z.id)}">${measLagerPositionOptionen(z)}</select>
  ${hinweis}
 </div>`;
}

function measLagerZeileHtml(z){
 const bestand=z.varianteId?lagerBestandVon(z.varianteId):null;
 const nachher=(bestand!==null)?bestand-Math.abs(z.menge):null;
 if(z.grund){
  return `<div class="rmat-wahl-block">
   <div><b>${esc(z.bezeichnung)}</b> <span class="small">${esc(lagerZahlText(z.menge))}${z.einheit?" "+esc(z.einheit):""}</span></div>
   <div class="small" style="color:var(--muted)">${esc(z.grund)}</div>
  </div>`;
 }
 const auswahl=!z.varianten.length
  // Nur bei Halbfabrikaten moeglich: solange keine Position gewaehlt ist,
  // gibt es auch kein Produkt. Die Zeile bleibt sichtbar und waehlbar,
  // gebucht wird sie aber erst mit Position und Produkt.
  ?`<div class="small" style="color:var(--muted)">Ohne Materialposition wird diese Zeile nicht gebucht.</div>`
  :z.varianten.length>1
  ?`<select data-meas-lager-variante="${esc(z.id)}">
     <option value="">– Produkt wählen –</option>
     ${z.varianten.map(v=>`<option value="${v.id}"${String(v.id)===z.varianteId?" selected":""}>${esc(v.bezeichnung)} · Bestand ${esc(lagerZahlText(lagerBestandVon(v.id)))}</option>`).join("")}
    </select>`
  :`<div class="small" style="color:var(--muted)">Produkt: ${esc(z.varianten[0].bezeichnung)}</div>`;
 return `<div class="rmat-wahl-block">
  <label class="rmat-wahl">
   <input type="checkbox" data-meas-lager-wahl="${esc(z.id)}"${z.gewaehlt?" checked":""}>
   <span class="rmat-wahl-text"><b>${esc(z.bezeichnung)}</b></span>
  </label>
  ${z.art==="teil"?measLagerPositionHtml(z):""}
  ${auswahl}
  <div class="bar" style="gap:6px;align-items:center;margin-top:4px">
   <label class="small" style="margin:0">Menge</label>
   <input type="number" step=".01" min="0" style="max-width:110px" data-meas-lager-menge="${esc(z.id)}" value="${esc(z.menge)}">
   <span class="small" style="color:var(--muted)">${esc(z.einheit)}${
     bestand!==null?" · Bestand "+esc(lagerZahlText(bestand))+" → "+esc(lagerZahlText(nachher)):""}</span>
  </div>
  ${(nachher!==null&&nachher<0)?'<div class="small" style="color:var(--red)">Der Bestand wird dadurch negativ – gebucht wird trotzdem, wenn Sie das so wollen.</div>':""}
 </div>`;
}

const MEAS_LAGER_ART_TITEL={erfasst:"Von Hand erfasst",teil:"Halbfabrikate und Teile"};
function renderMeasLagerListe(){
 const box=$("measLagerListe");
 if(!box)return;
 if(!measLagerZeilen.length){
  box.innerHTML='<div class="small">In dieser Massaufnahme ist weder unter „Material für den Regierapport“ etwas erfasst, noch ergibt sie Halbfabrikate – es gibt nichts auszubuchen.</div>';
 }else{
  box.innerHTML=["erfasst","teil"].map(art=>{
   const zeilen=measLagerZeilen.filter(z=>z.art===art);
   if(!zeilen.length)return "";
   return `<div class="rmat-art">${esc(MEAS_LAGER_ART_TITEL[art])}</div>`
    +zeilen.map(measLagerZeileHtml).join("");
  }).join("");
 }
 measLagerKnopfStand();
}
function measLagerBuchbar(){
 return measLagerZeilen.filter(z=>z.gewaehlt&&!z.grund&&z.varianteId&&Math.abs(z.menge)>0);
}
function measLagerKnopfStand(){
 const knopf=$("measLagerBuchenBtn");
 if(!knopf)return;
 const n=measLagerBuchbar().length;
 knopf.textContent="📤 Ausgewählte ausbuchen ("+n+")";
 knopf.disabled=n===0;
}

if($("measLagerListe")){
 $("measLagerListe").addEventListener("change",e=>{
  const wahl=e.target.dataset.measLagerWahl;
  if(wahl!==undefined){
   const z=measLagerZeilen.find(x=>x.id===wahl);
   if(z)z.gewaehlt=e.target.checked;
   measLagerKnopfStand();
   return;
  }
  const variante=e.target.dataset.measLagerVariante;
  if(variante!==undefined){
   const z=measLagerZeilen.find(x=>x.id===variante);
   if(z){
    z.varianteId=e.target.value;
    // Ohne gewaehltes Produkt kann die Zeile nicht gebucht werden - die
    // Auswahl wird deshalb mitgefuehrt, nicht stillschweigend ignoriert.
    if(!z.varianteId)z.gewaehlt=false;
   }
   renderMeasLagerListe();
   return;
  }
  // v3.121: die Materialposition eines Halbfabrikats. Mit ihr wechselt auch
  // die Produktliste - hat die neue Position genau ein Produkt, steht es
  // damit fest, sonst waehlt wieder der Anwender.
  const position=e.target.dataset.measLagerPosition;
  if(position!==undefined){
   const z=measLagerZeilen.find(x=>x.id===position);
   if(z){
    const a=z.positionen.find(x=>String(x.id)===String(e.target.value))||null;
    z.artikel=a;
    z.no=a?String(a.edv_nr):"";
    z.einheit=a&&a.unit?a.unit:z.einheit;
    z.varianten=a?lagerVariantenVonMaterial(a.id):[];
    z.varianteId=z.varianten.length===1?String(z.varianten[0].id):"";
    if(!z.varianteId)z.gewaehlt=false;
   }
   renderMeasLagerListe();
  }
 });
 // Die Menge waehrend des Tippens NICHT neu zeichnen - sonst verliert das
 // Feld den Fokus (dieselbe Lehre wie bei der Materialzeile, js/57).
 $("measLagerListe").addEventListener("input",e=>{
  const suche=e.target.dataset.measLagerSuche;
  if(suche!==undefined){
   const z=measLagerZeilen.find(x=>x.id===suche);
   if(!z)return;
   z.suche=e.target.value;
   // Nur die Optionen dieses einen Auswahlfeldes neu setzen. Ein voller
   // Neuaufbau der Liste wuerde dem Suchfeld den Fokus nehmen - dieselbe
   // Lehre wie beim Mengenfeld unten.
   const sel=$("measLagerListe").querySelector('[data-meas-lager-position="'+z.id+'"]');
   if(sel)sel.innerHTML=measLagerPositionOptionen(z);
   return;
  }
  const menge=e.target.dataset.measLagerMenge;
  if(menge===undefined)return;
  const z=measLagerZeilen.find(x=>x.id===menge);
  if(z)z.menge=lagerZahl(String(e.target.value).replace(",","."));
  measLagerKnopfStand();
 });
}
if($("measLagerAusbuchen"))$("measLagerAusbuchen").onclick=measLagerOeffnen;
if($("measLagerSchliessen"))$("measLagerSchliessen").onclick=measLagerSchliessen;

if($("measLagerBuchenBtn"))$("measLagerBuchenBtn").onclick=async()=>{
 const fehler=$("measLagerFehler");
 fehler.hidden=true;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Eine Lagerbuchung"))return;
 const zeilen=measLagerBuchbar();
 if(!zeilen.length)return;
 const bezeichnung=measLagerBeschriftung();
 const grund=("Massaufnahme: "+bezeichnung).slice(0,180)+" "+measLagerMarke(currentMeasurementId);
 // Eine Anfrage fuer alle Zeilen: entweder werden alle gebucht oder keine -
 // ein halb gebuchter Materialsatz waere schlimmer als gar keiner.
 const {data,error}=await sb.from("lagerbestand_bewegungen").insert(
  zeilen.map(z=>({variante_id:Number(z.varianteId),art:"abgang",menge:-Math.abs(z.menge),grund}))
 ).select("*");
 if(error||!data||!data.length){
  fehler.textContent=error?("Konnte nicht gebucht werden: "+error.message)
    :"Es wurde nichts gebucht. Fehlt die nötige Berechtigung?";
  fehler.hidden=false;
  return;
 }
 data.forEach(b=>lagerBewegungen.unshift(b));
 renderLagerverwaltung();
 measLagerSchliessen();
 alert("Ausgebucht: "+data.length+" Position"+(data.length===1?"":"en")+".\n\n"
  +"Die Buchungen stehen in der Lagerverwaltung beim jeweiligen Produkt, mit dieser Massaufnahme als Grund.");
};
