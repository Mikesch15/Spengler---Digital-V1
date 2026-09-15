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
function lagerNeuesProduktOeffnen(materialId,barcode){
 const fehler=$("lagerNeuesProduktFehler");
 if(fehler)fehler.hidden=true;
 $("lagerNeuesProduktBezeichnung").value="";
 $("lagerNeuesProduktBarcode").value=barcode||"";
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 $("lagerNeuesProduktMaterial").innerHTML=`<option value="">– bitte wählen –</option>`+
  liste.map(a=>`<option value="${a.id}"${String(a.id)===String(materialId||"")?" selected":""}>${esc(lagArtikelText(a))}</option>`).join("");
 $("lagerNeuesProduktModal").hidden=false;
 setTimeout(()=>{try{$("lagerNeuesProduktBezeichnung").focus()}catch(e){}},50);
}
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
