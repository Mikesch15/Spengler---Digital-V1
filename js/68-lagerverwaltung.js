"use strict";
// ---------------------------------------------------------------------------
// Lagerverwaltung Phase 1 (v3.98)
//
// Baut auf dem bestehenden Materialbestand-Katalog (js/59-lagerbestand.js,
// Tabelle lagerbestand) auf - der sagt WELCHE Materialien die Firma fuehrt,
// aber bewusst KEINE Menge (siehe Kommentar dort: bis v3.31 gab es menge/
// einheit, wurden wieder entfernt, weil eine Zahl ohne echte Buchungen
// falsche Sicherheit vortaeuscht).
//
// Diesmal deshalb: der Bestand ist NIE ein editierbares Feld, sondern immer
// die Summe ueber lagerbestand_bewegungen (Zugang positiv, Abgang negativ,
// Korrektur signiert). Eine Buchung ist unveraenderlich - ein Fehler wird
// durch eine neue Korrektur-Buchung ausgeglichen, nie durch Aendern der
// Vergangenheit (kein Update/Delete in der RLS, siehe Migration).
//
// Sichtbarkeit: eigenes Feature-Flag "lager" in feature_access, exakt wie
// der Offerte-Zugriff (js/63-angebote.js) - ein Ein/Aus je Mitarbeiter,
// unabhaengig vom bestehenden Rechte-Modell. Auch ein Administrator braucht
// die Freigabe eigens.
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
 if(lagerverwaltungZugriff)await lagerBewegungenLaden();
}

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

function lagerBewegungenVon(lagerbestandId){
 return lagerBewegungen.filter(b=>String(b.lagerbestand_id)===String(lagerbestandId));
}
function lagerBestandVon(lagerbestandId){
 return lagerBewegungenVon(lagerbestandId).reduce((s,b)=>s+lagerZahl(b.menge),0);
}
const LAGER_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};
function lagerBewegungZeile(b){
 const datum=b.created_at?new Date(b.created_at).toLocaleDateString("de-CH"):"–";
 const vz=lagerZahl(b.menge)>0?"+":"";
 return `${esc(datum)} · ${esc(LAGER_ART_TEXT[b.art]||b.art)} · ${vz}${lagerZahlText(b.menge)}${b.grund?" · "+esc(b.grund):""}<br>`;
}

// Wiederverwendet lagBeschreibung()/lagArtikel()/lagArtikelText() aus
// js/59-lagerbestand.js - dieselbe Darstellung wie im Materialbestand
// selbst, keine zweite Beschriftungslogik.
function renderLagerverwaltung(){
 const box=$("lagerverwaltungListe");
 if(!box)return;
 const liste=(typeof lagerbestand!=="undefined"?lagerbestand:[])||[];
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material im Materialbestand erfasst - dort zuerst einen Artikel anlegen.</div>`;
  return;
 }
 box.innerHTML=liste.map(l=>{
  const bestand=lagerBestandVon(l.id);
  const letzte=lagerBewegungenVon(l.id).slice(0,5);
  return `<div class="report-row">
 <div class="report-row-info">
  <b>${esc(typeof lagBeschreibung==="function"?lagBeschreibung(l):(l.bezeichnung||"Material"))}</b>
  <span class="small" style="color:var(--muted)">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
 </div>
 <div class="report-row-actions">
  <button type="button" class="blue" data-lager-buchen="${l.id}">📦 Buchen</button>
 </div>
</div>`;
 }).join("");
}

// ---- Buchen-Dialog -----------------------------------------------------
let lagerBuchenArtikelId=null;

function lagerBuchenOeffnen(lagerbestandId){
 lagerBuchenArtikelId=lagerbestandId;
 const l=(typeof lagerbestand!=="undefined"?lagerbestand:[]).find(x=>String(x.id)===String(lagerbestandId));
 $("lagerBuchenArtikel").textContent=l
  ?((typeof lagBeschreibung==="function"?lagBeschreibung(l):(l.bezeichnung||"Material"))+" · aktueller Bestand: "+lagerZahlText(lagerBestandVon(lagerbestandId)))
  :"";
 $("lagerBuchenArt").value="zugang";
 $("lagerBuchenMenge").value="";
 $("lagerBuchenGrund").value="";
 $("lagerBuchenFehler").hidden=true;
 $("lagerBuchenModal").hidden=false;
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
  lagerbestand_id:Number(lagerBuchenArtikelId),art,menge,grund:grund||null
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
