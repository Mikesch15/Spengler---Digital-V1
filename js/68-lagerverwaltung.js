"use strict";
// ---------------------------------------------------------------------------
// Lagerverwaltung Phase 1 (v3.98, Artikelbasis korrigiert in v3.102)
//
// v3.98 baute versehentlich auf lagerbestand auf (dem Blech-Materialbestand:
// Rolle/Tafel, Staerke, Ausfuehrung, Masse - js/59-lagerbestand.js). Das ist
// fachlich falsch: die Lagerverwaltung soll ALLGEMEINES Material erfassen
// (Schrauben, Dichtband, Rinnenhalter etc.), nicht Blech. lagerbestand hat
// mit der Lagerverwaltung nichts zu tun und bleibt unveraendert bestehen.
//
// Seit v3.102 baut die Lagerverwaltung stattdessen auf materials auf - der
// Artikelliste der Firma (EDV-Nr./Bezeichnung/Dim./Einheit/Preis), die im
// Regierapport und beim Blechverbrauch laengst verwendet wird. Die
// zusammengefuehrte Liste liefert lagArtikelListe() (js/59) - dieselbe
// Funktion, die auch das Materialbestand-Formular fuer seine
// Artikel-Auswahl nutzt. Keine dritte, doppelte Katalogtabelle.
//
// Der Bestand ist weiterhin NIE ein editierbares Feld, sondern immer die
// Summe ueber lagerbestand_bewegungen (Zugang positiv, Abgang negativ,
// Korrektur signiert). Eine Buchung ist unveraenderlich - ein Fehler wird
// durch eine neue Korrektur-Buchung ausgeglichen, nie durch Aendern der
// Vergangenheit (kein Update/Delete in der RLS, siehe Migration).
//
// Sichtbarkeit: eigenes Feature-Flag "lager" in feature_access, exakt wie
// der Offerte-Zugriff (js/63-angebote.js) - ein Ein/Aus je Mitarbeiter,
// unabhaengig vom bestehenden Rechte-Modell. Auch ein Administrator braucht
// die Freigabe eigens.
//
// Barcode-Scan (v3.102): "Einscannen"/"Ausscannen" oeffnen die Kamera
// (barcodeScannen() aus js/01-basis.js), suchen den erkannten Code in
// lagArtikelListe() und oeffnen bei Treffer direkt den Buchen-Dialog mit
// vorbelegter Art - der Benutzer bestaetigt nur noch die Menge. Eine
// verpasste Scan-Aktion laesst sich grundsaetzlich NICHT im Nachhinein aus
// den Buchungsdaten erkennen (sie hinterlaesst ja gerade kein Ereignis) -
// deshalb hier bewusst auf moeglichst wenig Reibung gesetzt statt auf eine
// Erkennung, die falsche Sicherheit vortaeuschen wuerde (dieselbe Lehre wie
// beim entfernten lagerbestand.menge, siehe js/59).
// ---------------------------------------------------------------------------

let lagerverwaltungZugriff=false;
let lagerBewegungen=[];

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
 if(lagerverwaltungZugriff)await lagerBewegungenLaden();
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

function lagerBewegungenVon(materialId){
 return lagerBewegungen.filter(b=>String(b.material_id)===String(materialId));
}
function lagerBestandVon(materialId){
 return lagerBewegungenVon(materialId).reduce((s,b)=>s+lagerZahl(b.menge),0);
}
const LAGER_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};
function lagerBewegungZeile(b){
 const datum=b.created_at?new Date(b.created_at).toLocaleDateString("de-CH"):"–";
 const vz=lagerZahl(b.menge)>0?"+":"";
 return `${esc(datum)} · ${esc(LAGER_ART_TEXT[b.art]||b.art)} · ${vz}${lagerZahlText(b.menge)}${b.grund?" · "+esc(b.grund):""}<br>`;
}

// Wiederverwendet lagArtikelListe()/lagArtikel()/lagArtikelText() aus
// js/59-lagerbestand.js - dieselbe Artikelliste wie im Materialbestand-
// Formular, keine zweite Katalog-/Beschriftungslogik.
function renderLagerverwaltung(){
 const box=$("lagerverwaltungListe");
 if(!box)return;
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material im Material-Katalog erfasst - dort (Einstellungen → Material) zuerst einen Artikel anlegen.</div>`;
  return;
 }
 box.innerHTML=liste.map(a=>{
  const bestand=lagerBestandVon(a.id);
  const letzte=lagerBewegungenVon(a.id).slice(0,5);
  return `<div class="report-row">
 <div class="report-row-info">
  <b>${esc(lagArtikelText(a))}</b>
  <span class="small" style="color:var(--muted)">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
 </div>
 <div class="report-row-actions">
  <button type="button" class="blue" data-lager-buchen="${a.id}">📦 Buchen</button>
 </div>
</div>`;
 }).join("");
}

// ---- Buchen-Dialog -----------------------------------------------------
let lagerBuchenArtikelId=null;

// vorbelegteArt (v3.102): nach einem Scan ist die Richtung schon bekannt -
// "zugang"/"abgang" wird dann direkt gesetzt, der Benutzer bestaetigt nur
// noch die Menge. Ohne Scan (Knopf "Buchen" in der Liste) bleibt es wie
// bisher bei "zugang" als Ausgangswert, frei aenderbar.
function lagerBuchenOeffnen(materialId,vorbelegteArt){
 lagerBuchenArtikelId=materialId;
 const a=(typeof lagArtikel==="function")?lagArtikel(materialId):null;
 $("lagerBuchenArtikel").textContent=a
  ?(lagArtikelText(a)+" · aktueller Bestand: "+lagerZahlText(lagerBestandVon(materialId)))
  :"";
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
 lagerBuchenArtikelId=null;
}
$("lagerBuchenAbbrechen").onclick=lagerBuchenSchliessen;

$("lagerverwaltungListe").addEventListener("click",e=>{
 const b=e.target.closest("[data-lager-buchen]");
 if(b)lagerBuchenOeffnen(b.dataset.lagerBuchen);
});

// ---- Einscannen / Ausscannen (v3.102) -----------------------------------
// Barcode -> Artikel in lagArtikelListe() suchen -> Buchen-Dialog direkt mit
// der passenden Art oeffnen. Kein Treffer: klare Meldung statt stillem
// Nichtstun - der Benutzer soll nie raetseln, ob der Scan "funktioniert hat".
function lagerArtikelZuBarcode(code){
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 return liste.find(a=>a.barcode&&a.barcode===code)||null;
}
function lagerScannenUndBuchen(art){
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{
  const a=lagerArtikelZuBarcode(code);
  if(!a){
   lagerHinweis("Kein Artikel mit diesem Barcode gefunden ("+code+") - bitte manuell auswählen oder den Barcode im Material-Katalog eintragen.",true);
   return;
  }
  lagerHinweis("");
  lagerBuchenOeffnen(a.id,art);
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
 if(!lagerBuchenArtikelId||!eingabe){
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
  material_id:Number(lagerBuchenArtikelId),art,menge,grund:grund||null
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
