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
 // v3.123: dieselbe Freigabe traegt die Materialzusammenfassung im Projekt.
 if($("cockpitLagerCard"))$("cockpitLagerCard").hidden=!lagerverwaltungZugriff;
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
// v3.127: archivierte Produkte sind ueberall weg, wo gebucht oder gewaehlt
// wird - sie erscheinen NUR in der Lagerverwaltung selbst, und auch dort nur
// auf ausdruecklichen Wunsch. Der Filter steht deshalb hier, an der EINEN
// Stelle, die alle Verbraucher benutzen (Liste, Ausbuchen-Dialog, Scan).
function lagerVariantenVonMaterial(materialId){
 return lagerVariantenVonMaterialAlle(materialId).filter(v=>!v.archiviert);
}
function lagerVariantenVonMaterialAlle(materialId){
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
 // v3.123: das Ziel steht direkt in der Zeile - sonst muesste man raten,
 // fuer welche Baustelle gebucht wurde.
 const ziel=(typeof lagerZielText==="function")?lagerZielText(b):"";
 return `${esc(datum)} · ${esc(LAGER_ART_TEXT[b.art]||b.art)} · ${vz}${lagerZahlText(b.menge)}${
   ziel?" · "+esc(ziel):""}${b.grund?" · "+esc(b.grund):""}<br>`;
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

// ---- v3.124: Suche ueber die ganze Lagerliste ----------------------------
// Bei 372 Materialpositionen ist Scrollen kein Bedienweg mehr. Gesucht wird
// ueber BEIDE Ebenen: die Materialposition (EDV-Nr./Bezeichnung/Dim.) und
// jedes einzelne Produkt darunter (Bezeichnung, Barcode). Wer den Barcode
// abliest, findet das Produkt damit auch von Hand, wenn die Kamera streikt.
let lagerSuche="";
// v3.127: archivierte Produkte auf Wunsch einblenden (zum Wieder-Aktivieren).
let lagerArchivZeigen=false;
if($("lagerArchivZeigen"))$("lagerArchivZeigen").onclick=()=>{
 lagerArchivZeigen=!lagerArchivZeigen;
 renderLagerverwaltung();
};
// Der Knopf je Produkt. Beschriftung und Verhalten haengen daran, ob es
// schon Buchungen gibt - das entscheidet die Datenbank ohnehin (der
// Fremdschluessel steht auf NO ACTION), die App sagt es nur vorher.
function lagerProduktAktionen(v){
 const gebucht=lagerBewegungenVon(v.id).length;
 if(v.archiviert){
  return `<button type="button" class="gray" data-lager-aktivieren="${v.id}">\u21ba Wieder aktivieren</button>`;
 }
 return gebucht
  ?`<button type="button" class="gray" data-lager-archivieren="${v.id}">\u{1F4E6} Archivieren</button>`
  :`<button type="button" class="red" data-lager-loeschen="${v.id}">\u{1F5D1} L\u00f6schen</button>`;
}
function lagerPasstZurSuche(a,varianten){
 const q=String(lagerSuche||"").trim().toLowerCase();
 if(!q)return true;
 if(lagArtikelText(a).toLowerCase().includes(q))return true;
 return (varianten||[]).some(v=>
  String(v.bezeichnung||"").toLowerCase().includes(q)
  ||String(v.barcode||"").toLowerCase().includes(q));
}
if($("lagerSuche"))$("lagerSuche").addEventListener("input",()=>{
 lagerSuche=$("lagerSuche").value;
 renderLagerverwaltung();
});
function lagerVarianteZeile(v,gruppiert){
 const bestand=lagerBestandVon(v.id);
 const offen=lagerOffenArtikel.has(String(v.id));
 const letzte=lagerBewegungenVon(v.id).slice(0,5);
 const klasse=gruppiert?"lager-variante":"lager-karte";
 return `<div class="${klasse}${v.archiviert?" lager-archiviert":""}">
 <div class="${klasse}-kopf" role="button" tabindex="0" aria-expanded="${offen?"true":"false"}" data-lager-karte="${v.id}">
  <span class="lager-karte-pfeil">${offen?"▾":"▸"}</span>
  <div class="lager-karte-info">
   <b>${esc(v.bezeichnung)}</b>${v.archiviert?' <span class="lager-archiviert-marke">(archiviert)</span>':""}
   <span class="small" style="color:var(--muted);display:block">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  </div>
  ${v.archiviert?"":`<button type="button" class="blue" data-lager-buchen="${v.id}">📦 Buchen</button>`}
 </div>
 ${offen?`<div class="lager-karte-body">
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
  <div class="bar" style="margin-top:6px">${lagerProduktAktionen(v)}</div>
 </div>`:""}
</div>`;
}
function renderLagerverwaltung(){
 const box=$("lagerverwaltungListe");
 if(!box)return;
 const alle=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 // v3.124: gesucht wird vor allem anderen. Eine leere Suche aendert nichts.
 const suchtext=String(lagerSuche||"").trim();
 const liste=suchtext?alle.filter(a=>lagerPasstZurSuche(a,
   lagerArchivZeigen?lagerVariantenVonMaterialAlle(a.id):lagerVariantenVonMaterial(a.id))):alle;
 const stand=$("lagerSucheStand");
 if(stand){
  stand.textContent=suchtext?(liste.length+" von "+alle.length+" Positionen gefunden"):"";
  stand.hidden=!suchtext;
 }
 if($("lagerAlleZuklappen")){
  $("lagerAlleZuklappen").textContent=lagerListeVersteckt?"⯈ Alle anzeigen":"⯆ Alle zuklappen";
  // Waehrend einer Suche waere "Alle zuklappen" widersinnig - die Trefferliste
  // ist ja gerade das, was man sehen will.
  $("lagerAlleZuklappen").hidden=!alle.length||!!suchtext;
 }
 // v3.127: das Archiv ist nur dann ein Thema, wenn ueberhaupt etwas darin
 // liegt - sonst waere der Knopf ein Versprechen auf eine leere Liste.
 if($("lagerArchivZeigen")){
  const archiviert=lagerVarianten.filter(v=>v.archiviert).length;
  $("lagerArchivZeigen").hidden=!archiviert;
  $("lagerArchivZeigen").textContent=lagerArchivZeigen
   ?("\u{1F4E6} Archiv ausblenden ("+archiviert+")")
   :("\u{1F4E6} Archiv anzeigen ("+archiviert+")");
 }
 if(!alle.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material im Material-Katalog erfasst - dort (Einstellungen → Material) zuerst einen Artikel anlegen.</div>`;
  return;
 }
 if(suchtext&&!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Kein Treffer für „${esc(suchtext)}“. Gesucht wird in EDV-Nr., Bezeichnung, Dimension, Produktname und Barcode.</div>`;
  return;
 }
 // Die Suche schlaegt das Zuklappen: wer sucht, will die Treffer sehen.
 if(lagerListeVersteckt&&!suchtext){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Liste eingeklappt (${alle.length} Artikel) - "Alle anzeigen" zeigt sie wieder.</div>`;
  return;
 }
 box.innerHTML=liste.map(a=>{
  const varianten=lagerArchivZeigen?lagerVariantenVonMaterialAlle(a.id):lagerVariantenVonMaterial(a.id);
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
   return `<div class="lager-karte${v.archiviert?" lager-archiviert":""}">
 <div class="lager-karte-kopf" role="button" tabindex="0" aria-expanded="${offen?"true":"false"}" data-lager-karte="${v.id}">
  <span class="lager-karte-pfeil">${offen?"▾":"▸"}</span>
  <div class="lager-karte-info">
   <b>${esc(lagArtikelText(a))}</b>${v.archiviert?' <span class="lager-archiviert-marke">(archiviert)</span>':""}
   <span class="small" style="color:var(--muted);display:block">Bestand: <b>${lagerZahlText(bestand)}</b></span>
  </div>
  ${v.archiviert?"":`<button type="button" class="blue" data-lager-buchen="${v.id}">📦 Buchen</button>`}
 </div>
 ${offen?`<div class="lager-karte-body">
  <span class="small" style="color:var(--muted)">${letzte.length?letzte.map(lagerBewegungZeile).join(""):"Noch keine Buchung."}</span>
  <div class="bar" style="margin-top:6px">${lagerProduktAktionen(v)}<button type="button" class="gray" data-lager-neues-produkt="${a.id}">＋ Weiteres Produkt zu dieser Position</button></div>
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

// ---- Ziel einer Buchung: Projekt oder Werkstatt (v3.123) ---------------
// Bis v3.122 hielt eine Buchung nicht fest, WOHIN das Material ging - das
// Projekt stand hoechstens als Freitext im Grund. Damit liess sich im
// Projekt keine Materialzusammenfassung bilden.
//
// Seit der Migration "lagerbuchung_projekt_zuordnung" tragen Buchungen
// project_id und ziel ('projekt' | 'werkstatt' | 'unbekannt'). Die Wahl ist
// PFLICHT, aber "Werkstatt / Lager" ist eine ausdrueckliche Antwort - so
// faellt keine Buchung stillschweigend aus der Zusammenfassung, und
// Werkstattverbrauch blockiert trotzdem niemanden.
//
// 'unbekannt' vergibt die App NIE selbst: es ist allein die Kennzeichnung
// der vor v3.123 gebuchten Zeilen, die die Frage noch gar nicht kannten.
const LAGER_ZIEL_WERKSTATT="werkstatt";
function lagerProjekteListe(){
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 return liste.filter(p=>!p.archived);
}
// Dieselbe Beschriftung wie in der Projektliste: zuerst das OBJEKT (die
// Adresse - danach sucht der Spengler), dann Name/Auftrag/Auftraggeber.
function lagerProjektText(p){
 if(!p)return "";
 return [String(p.object||"").trim(),String(p.name||"").trim(),
         String(p.order_no||"").trim()?"Auftrag "+String(p.order_no).trim():"",
         String(p.customer||"").trim()].filter(Boolean).join(" \u00b7 ");
}
// Wohin ging diese Buchung? Eine Stelle, die drei Faelle beantwortet -
// auch den einer Buchung, deren Projekt inzwischen geloescht wurde (dann
// steht ziel='projekt' ohne project_id, siehe Migration).
function lagerZielText(b){
 if(!b)return "";
 if(b.project_id){
  const p=lagerProjekteListe().find(x=>String(x.id)===String(b.project_id))
    ||((typeof allProjects!=="undefined"&&Array.isArray(allProjects))
       ?allProjects.find(x=>String(x.id)===String(b.project_id)):null);
  return p?lagerProjektText(p):"Projekt #"+b.project_id;
 }
 if(b.ziel==="projekt")return "Projekt gel\u00f6scht";
 if(b.ziel===LAGER_ZIEL_WERKSTATT)return "Werkstatt / Lager";
 return "";   // 'unbekannt' - vor v3.123 gebucht, es wird nichts behauptet
}

// ---- Buchen-Dialog -----------------------------------------------------
let lagerBuchenVarianteId=null;
let lagerBuchenZielSuche="";

// Die Auswahlliste des Ziels. Werkstatt steht IMMER ganz oben und wird von
// der Suche nie weggefiltert - sie ist keine Projektsuche, sondern die
// Alternative dazu. Ein bereits gewaehltes Projekt bleibt ebenfalls immer
// drin, damit das Weitertippen die Wahl nicht still verwirft (dieselbe
// Regel wie beim Positions-Suchfeld, v3.118).
// v3.131: Das Ziel steht nicht mehr in einem <select>. Ein Auswahlfeld zeigt
// seine gefilterte Liste erst beim Aufklappen - die Suche wirkte dadurch wie
// kaputt, obwohl sie filterte. Gemeldet vom Anwender; dieselbe Ursache und
// dasselbe Muster wie im Ausbuchen-Dialog (v3.125) und im Produkt-Dialog
// (v3.126/v3.128). Der gewaehlte Wert steht jetzt in einem Zustand statt im
// DOM-Wert des Feldes; lagerZielFelder() bleibt unveraendert die EINE Stelle,
// die daraus die beiden Spalten macht.
let lagerBuchenZielWert="";
const LAGER_ZIEL_TREFFER_MAX=8;
function lagerBuchenZielTrefferHtml(){
 const begriff=String(lagerBuchenZielSuche||"").trim().toLowerCase();
 let projekte=lagerProjekteListe();
 if(begriff&&typeof projektPasstZuSuche==="function"){
  projekte=projekte.filter(p=>projektPasstZuSuche(p,begriff));
 }
 const gezeigt=projekte.slice(0,LAGER_ZIEL_TREFFER_MAX);
 const rest=projekte.length-gezeigt.length;
 // Werkstatt steht IMMER ganz oben und wird von der Suche nie weggefiltert -
 // sie ist keine Projektsuche, sondern die Alternative dazu.
 const werkstatt=`<button type="button" class="gray meas-lager-treffer" data-lager-ziel="${LAGER_ZIEL_WERKSTATT}">\U0001F3ED Werkstatt / Lager (kein Projekt)</button>`;
 if(!projekte.length){
  return werkstatt+(begriff
   ?`<div class="small" style="color:var(--muted)">Kein Projekt f\u00fcr \u201e${esc(begriff)}\u201c.</div>`
   :`<div class="small" style="color:var(--muted)">Noch kein Projekt erfasst.</div>`);
 }
 return werkstatt
  +gezeigt.map(p=>`<button type="button" class="gray meas-lager-treffer" data-lager-ziel="${esc(p.id)}">${esc(lagerProjektText(p)||("Projekt #"+p.id))}</button>`).join("")
  +(rest>0?`<div class="small" style="color:var(--muted)">\u2026 ${rest} weitere \u2013 bitte genauer suchen.</div>`:"");
}
function lagerBuchenZielText(wert){
 if(wert===LAGER_ZIEL_WERKSTATT)return "\U0001F3ED Werkstatt / Lager (kein Projekt)";
 const p=lagerProjekteListe().find(x=>String(x.id)===String(wert));
 return p?(lagerProjektText(p)||("Projekt #"+p.id)):"";
}
// gewaehlt bleibt als Argument erhalten, damit alle bisherigen Aufrufer
// unveraendert funktionieren.
function lagerBuchenZielRendern(gewaehlt){
 if(gewaehlt!==undefined)lagerBuchenZielWert=String(gewaehlt||"");
 const suche=$("lagerBuchenZielSuche"), box=$("lagerBuchenZielTreffer"), gew=$("lagerBuchenZielGewaehlt");
 const fertig=!!lagerBuchenZielWert;
 const begriff=String(lagerBuchenZielSuche||"").trim();
 // Wie im Produkt-Dialog (v3.128): das Suchfeld bleibt IMMER stehen, die
 // Trefferliste klappt bei getroffener Wahl zu, bis wieder getippt wird.
 if(suche){
  suche.hidden=false;
  suche.placeholder=fertig?"\U0001F50D Anderes Ziel suchen \u2026":"\U0001F50D Projekt suchen (Adresse, Name, Auftrag, Auftraggeber) \u2026";
 }
 if(box){
  box.hidden=fertig&&!begriff;
  if(!box.hidden)box.innerHTML=lagerBuchenZielTrefferHtml();
 }
 if(gew){
  gew.hidden=!fertig;
  if(fertig)gew.innerHTML=`<div class="small">Ziel: <b>${esc(lagerBuchenZielText(lagerBuchenZielWert))}</b></div>`
   +`<button type="button" class="gray" data-lager-ziel-aendern="1">\u270f\ufe0f \u00e4ndern</button>`;
 }
}
if($("lagerBuchenZielTreffer"))$("lagerBuchenZielTreffer").addEventListener("click",e=>{
 const b=e.target.closest?e.target.closest("[data-lager-ziel]"):null;
 if(!b)return;
 lagerBuchenZielWert=String(b.dataset.lagerZiel||"");
 lagerBuchenZielSuche="";
 if($("lagerBuchenZielSuche"))$("lagerBuchenZielSuche").value="";
 lagerBuchenZielRendern(lagerBuchenZielWert);
});
if($("lagerBuchenZielGewaehlt"))$("lagerBuchenZielGewaehlt").addEventListener("click",e=>{
 if(!e.target.closest||!e.target.closest("[data-lager-ziel-aendern]"))return;
 lagerBuchenZielRendern("");
});
// Aus dem Auswahlwert werden die beiden Spalten. Eine Stelle, damit der
// Buchen-Dialog und die Ausbuchung aus der Massaufnahme nicht auseinander
// laufen koennen.
function lagerZielFelder(wert){
 if(wert===LAGER_ZIEL_WERKSTATT)return {project_id:null,ziel:LAGER_ZIEL_WERKSTATT};
 const id=Number(wert);
 if(Number.isFinite(id)&&id>0)return {project_id:id,ziel:"projekt"};
 return null;   // nichts gewaehlt - der Aufrufer muss das abfangen
}
if($("lagerBuchenZielSuche"))$("lagerBuchenZielSuche").addEventListener("input",()=>{
 lagerBuchenZielSuche=$("lagerBuchenZielSuche").value;
 const box=$("lagerBuchenZielTreffer");
 if(!box)return;
 // Tippen zeigt die Treffer SOFORT - auch wenn schon ein Ziel gewaehlt ist.
 box.hidden=!!lagerBuchenZielWert&&!String(lagerBuchenZielSuche||"").trim();
 if(!box.hidden)box.innerHTML=lagerBuchenZielTrefferHtml();
});

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
 // v3.123: Ziel immer leer starten - eine Vorbelegung waere geraten, und
 // die Zuordnung soll bewusst getroffen werden.
 lagerBuchenZielSuche="";
 if($("lagerBuchenZielSuche"))$("lagerBuchenZielSuche").value="";
 lagerBuchenZielRendern("");
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
// v3.127: der im Hilfetext seit v3.124 versprochene, aber nie gebaute
// Einstieg. Ohne Materialposition und ohne Barcode - beides wird im Dialog
// selbst gewaehlt bzw. neu angelegt.
if($("lagerNeuesProduktStart"))$("lagerNeuesProduktStart").onclick=()=>{
 lagerNeuesProduktOeffnen(null,"");
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
  // v3.127: ein archiviertes Produkt ist nicht buchbar - der Barcode klebt
  // aber weiter auf der Ware. Statt stumm zu buchen oder stumm abzulehnen:
  // sagen, was los ist, und das Wieder-Aktivieren gleich anbieten.
  if(v.archiviert){
   lagerHinweis("");
   if(!confirm("Das Produkt „"+v.bezeichnung+"“ ist archiviert und wird nicht mehr bebucht.\n\n"
     +"Soll es wieder aktiviert und die Buchung gemacht werden?")){
    lagerHinweis("Produkt „"+v.bezeichnung+"“ ist archiviert - nicht gebucht.",true);
    return;
   }
   lagerProduktArchivSetzen(v.id,false).then(()=>{
    if(!v.archiviert)lagerBuchenOeffnen(v.id,art);
   });
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
 // v3.123: ohne Ziel wird nicht gebucht. "Werkstatt / Lager" ist eine
 // gueltige Antwort - stillschweigend weglassen ist keine.
 const ziel=lagerZielFelder(lagerBuchenZielWert);
 if(!ziel){
  fehler.textContent="Bitte angeben, wohin das Material geht \u2013 ein Projekt oder ausdr\u00fccklich \u201eWerkstatt / Lager\u201c.";
  fehler.hidden=false;
  return;
 }
 const grund=$("lagerBuchenGrund").value.trim();
 const {data,error}=await sb.from("lagerbestand_bewegungen").insert({
  variante_id:Number(lagerBuchenVarianteId),art,menge,grund:grund||null,
  project_id:ziel.project_id,ziel:ziel.ziel
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
// v3.138: EIN Dialog fuer beide Wege. Aus der Lagerverwaltung geht es um ein
// Produkt (Schalter gesetzt), aus dem Material-Katalog meist nur um die
// Position (Schalter aus). Vorher waren das zwei Wege: der Katalog legte
// stumm eine leere Zeile an, die Lagerverwaltung hatte diesen Dialog.
let lagerNeuesProduktMitProdukt=true;
function lagerNeuesProduktOeffnen(materialId,barcode,optionen){
 const fehler=$("lagerNeuesProduktFehler");
 if(fehler)fehler.hidden=true;
 $("lagerNeuesProduktBezeichnung").value="";
 $("lagerNeuesProduktBarcode").value=barcode||"";
 lagerNeuesProduktMaterialListeVoll=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 if($("lagerNeuesProduktMaterialSuche"))$("lagerNeuesProduktMaterialSuche").value="";
 ["lagerNeuePositionNr","lagerNeuePositionName","lagerNeuePositionDim",
  "lagerNeuePositionEinheit","lagerNeuePositionPreis"].forEach(id=>{if($(id))$(id).value=""});
 lagerNummerVonHand=false;
 lagerPositionNameEigen=false;   // v3.148: jeder Dialog faengt mit EINER Bezeichnung an
 if($("lagerNeuePositionHinweis"))$("lagerNeuePositionHinweis").innerHTML="";
 // v3.126: Auswahl als Zustand, nicht mehr als Wert eines <select>.
 const nurPosition=!!(optionen&&optionen.nurPosition);
 lagerNeuesProduktMitProdukt=!nurPosition;
 if($("lagerNeuesProduktMitProdukt"))$("lagerNeuesProduktMitProdukt").checked=!nurPosition;
 // Aus dem Katalog heraus ist die Position IMMER neu - danach suchen zu
 // lassen waere der falsche Weg, man kommt ja gerade aus der Liste.
 lagerNeuesProduktNeuePosition=nurPosition;
 lagerNeuesProduktArtikel=(!nurPosition&&materialId)
  ?(lagerNeuesProduktMaterialListeVoll.find(a=>String(a.id)===String(materialId))||null):null;
 if(nurPosition){
  ["lagerNeuePositionName","lagerNeuePositionDim","lagerNeuePositionPreis"]
   .forEach(id=>{ if($(id))$(id).value=""; });
  if($("lagerNeuePositionEinheit"))$("lagerNeuePositionEinheit").value="Stk.";
  lagerNummerVonHand=false;
 }
 lagerNeuesProduktMaterialRendern();
 lagerNeuesProduktModusRendern();
 $("lagerNeuesProduktModal").hidden=false;
 setTimeout(()=>{try{
  $(nurPosition?"lagerNeuePositionName":"lagerNeuesProduktBezeichnung").focus();
 }catch(e){}},50);
}
// ---- v3.124: Produkte, die in der Regiematerialliste nicht vorkommen ----
// Statt eines zweiten Datenmodells (ein Produkt ohne Materialposition,
// material_id waere dafuer nullable zu machen) entsteht eine richtige
// KATALOGPOSITION. Vorteile: nichts weiter unten muss angepasst werden, die
// Position laesst sich danach auch im Regierapport verrechnen, und die
// Lagerverwaltung bleibt bei EINEM Modell (CLAUDE.md: keine doppelten
// Datenmodelle).
//
// Damit so eine Position nicht mit der Regieliste kollidiert, schlaegt die
// App eine Nummer aus einem eigenen Kreis vor: 999.xx. Der Katalog benutzt
// durchgehend das Format NNN.NN mit den Gruppen 100 bis 990 - 999 ist frei,
// haelt aber dasselbe Format ein (ein "1.000.00" wuerde als Text VOR
// "100.01" einsortiert und faellt aus jeder Sortierung). Die Nummer bleibt
// frei aenderbar; vorgeschlagen ist sie, nicht vorgeschrieben.
const LAGER_EIGENE_GRUPPE="999";
// Die naechste freie Nummer INNERHALB einer Nummerngruppe. Ohne Gruppe der
// eigene Lager-Kreis 999.xx.
function lagerNaechsteFreieEdvNr(gruppe){
 const g=String(gruppe||LAGER_EIGENE_GRUPPE);
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 const muster=new RegExp("^"+g.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\.(\\d+)$");
 let hoechste=0;
 liste.forEach(a=>{
  const m=muster.exec(String(a.edv_nr||"").trim());
  if(m)hoechste=Math.max(hoechste,parseInt(m[1],10));
 });
 return g+"."+String(hoechste+1).padStart(2,"0");
}

// ---- v3.126: die passende Nummerngruppe aus dem Katalog erkennen ---------
//
// Der Katalog ist fachlich nach Gruppen geordnet: 201 Dachrinnen, 202
// Rinnenhalter, 203 Rinnenzubehoer (Winkel, Boeden, Stutzen, Seiher,
// Kasten), 251 Ablaufrohre, 252 Rohrteile, 261 Lueftung, 811 Dichtstoffe,
// 826 Schrauben. Ein neues Rinnenzubehoer-Produkt gehoert deshalb nicht in
// den Lager-Kreis 999, sondern zu 203.
//
// Erkannt wird ueber die BEZEICHNUNG, mit denselben Textwerkzeugen wie die
// Positionserkennung im Regierapport (rmatWoerter/rmatStamm, js/57) - keine
// dritte Textlogik. Gemessen wurde am echten Katalog der Produktivdatenbank
// (alle unterschiedlichen Produktnamen), mit 20 von Hand gesetzten
// Erwartungen; die Zahlen unten sind daraus hervorgegangen, nicht geraten.
// Die fuenf Faelle, die dabei offen blieben, sind echte Gleichstaende
// ("Rohrbogen" steht in 252, 259 UND 261) - dort behauptet die App nichts,
// sondern legt die Kandidaten nebeneinander.
const LAGER_GRUPPE_MIN=2.5;      // darunter ist kein Treffer stark genug
const LAGER_GRUPPE_FAKTOR=1.15;  // so viel Vorsprung braucht der Erste

// Materialwoerter zaehlen nur ein Viertel: "Kupfer" steht in fast jeder
// Gruppe und darf nicht entscheiden. Ein Materialwort ist ein Wort aber nur,
// wenn es eines IST - "Kupferblech" enthaelt "Kupfer" und ist trotzdem ein
// Blech (gemessener Fehler der ersten Fassung).
const LAGER_MATERIALWOERTER=["kupfer","titanzink","zink","chromnickelstahl","stahl",
 "aluminium","alum","messing","blei","inox","crnistahl","cnstahl","tizn",
 "materialien","alle","kunststoff"];
// Deutsche Zusammensetzungen teilen ihren Stamm oft in der MITTE
// ("SpezialSCHRAUBE" / "HolzSCHRAUBEn"). Vorn/hinten allein findet das
// nicht, deshalb zusaetzlich die laengste gemeinsame Teilkette.
function lagerTeilkette(a,b){
 let best=0;
 for(let i=0;i<a.length;i++){
  for(let j=i+best+1;j<=a.length;j++){
   const t=a.slice(i,j);
   if(b.indexOf(t)>=0){ if(t.length>best)best=t.length; } else break;
  }
 }
 return best;
}
function lagerWoerter(s){
 if(typeof rmatWoerter==="function")return rmatWoerter(s);
 return String(s==null?"":s).toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!/^\d+$/.test(w));
}
function lagerStamm(a,b){
 return (typeof rmatStamm==="function")?rmatStamm(a,b):0;
}
// Wie gut passt EINE Katalogzeile zur Bezeichnung? Ein ganzes Wort zaehlt
// voll, ein Teilwort anteilig (sonst haette "rinnen" in
// "Rinnen-Dehnungselement" dasselbe Gewicht wie in "Rinnenhalter").
function lagerZeilePunkte(bezWoerter,name){
 const kW=lagerWoerter(name);
 let p=0;
 bezWoerter.forEach(w=>{
  let best=0;
  kW.forEach(k=>{
   if(k===w){best=Math.max(best,3);return}
   const gem=Math.min(k.length,w.length), lang=Math.max(k.length,w.length);
   if(k.indexOf(w)>=0||w.indexOf(k)>=0){best=Math.max(best,3*(gem/lang));return}
   const t=Math.max(lagerStamm(k,w),lagerTeilkette(k,w));
   if(t>=5)best=Math.max(best,2.2*(t/lang));
  });
  p+=(LAGER_MATERIALWOERTER.indexOf(w)>=0)?best*0.25:best;
 });
 return p;
}
function lagerGruppeVon(nr){
 const m=/^(\d+)\./.exec(String(nr==null?"":nr).trim());
 return m?m[1]:null;
}
// Alle Gruppen, nach Passung sortiert. Die Liste ist auch dann nuetzlich,
// wenn kein Erster klar fuehrt - dann zeigt die App die Kandidaten.
function lagerGruppenBewerten(bezeichnung){
 const bW=lagerWoerter(bezeichnung);
 if(!bW.length)return [];
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 const proGruppe=new Map();
 liste.forEach(a=>{
  const g=lagerGruppeVon(a.edv_nr);
  if(!g||g===LAGER_EIGENE_GRUPPE)return;     // der eigene Kreis ist kein Vorschlag
  const p=lagerZeilePunkte(bW,a.name);
  if(p<=0)return;
  if(!proGruppe.has(g))proGruppe.set(g,[]);
  proGruppe.get(g).push({punkte:p,artikel:a});
 });
 return [...proGruppe.entries()].map(([g,treffer])=>{
  treffer.sort((a,b)=>b.punkte-a.punkte);
  // Nur STARKE weitere Treffer zaehlen (mind. 70% des besten) - sonst
  // gewaenne die groesste Gruppe allein durch ihre Groesse.
  const stark=treffer.filter((x,i)=>i>0&&x.punkte>=treffer[0].punkte*0.7).length;
  return {gruppe:g,punkte:treffer[0].punkte+Math.min(3,stark)*0.4,
          bester:treffer[0].artikel,anzahl:treffer.length};
 }).sort((a,b)=>b.punkte-a.punkte||a.gruppe.localeCompare(b.gruppe));
}
// v3.136: Welche BESTEHENDEN Katalogpositionen passen zur Bezeichnung?
// Bis hierher wurde die Bewertung nur benutzt, um die EDV-Nummer einer NEU
// anzulegenden Position zu finden (v3.126) - und die zeigte sich erst, wenn
// man "Neue Materialposition anlegen" schon geklickt hatte. Wer ein Produkt
// einscannte, bekam davon nichts zu sehen: die Trefferliste war der
// ungeordnete Katalog, und gesucht werden musste von Hand. Gemeldet vom
// Anwender ("wird nicht mehr automatisch und intelligent eine Position
// vorgeschlagen").
//
// Dieselbe Bewertung (lagerZeilePunkte), dieselbe Schwelle
// (LAGER_GRUPPE_MIN) - kein zweites, parallel gepflegtes Mass.
function lagerPositionenVorschlag(bezeichnung){
 const bW=lagerWoerter(bezeichnung);
 if(!bW.length)return [];
 const liste=lagerNeuesProduktMaterialListeVoll||[];
 return liste.map(a=>({artikel:a,punkte:lagerZeilePunkte(bW,a.name)}))
  .filter(x=>x.punkte>=LAGER_GRUPPE_MIN)
  .sort((a,b)=>b.punkte-a.punkte)
  .slice(0,3);
}
// Der Vorschlag fuer die Oberflaeche. art:
//   "gruppe"  eine Gruppe fuehrt deutlich -> ihre naechste freie Nummer
//   "unklar"  mehrere passen aehnlich gut -> Lager-Kreis, Kandidaten dabei
//   "eigen"   nichts passt                -> Lager-Kreis
function lagerNummernVorschlag(bezeichnung){
 const b=lagerGruppenBewerten(bezeichnung);
 const kandidaten=b.filter(x=>x.punkte>=LAGER_GRUPPE_MIN).slice(0,3);
 if(!b.length||b[0].punkte<LAGER_GRUPPE_MIN){
  return {art:"eigen",nummer:lagerNaechsteFreieEdvNr(null),kandidaten:[]};
 }
 if(b[1]&&b[0].punkte<b[1].punkte*LAGER_GRUPPE_FAKTOR){
  return {art:"unklar",nummer:lagerNaechsteFreieEdvNr(null),kandidaten};
 }
 return {art:"gruppe",gruppe:b[0].gruppe,nummer:lagerNaechsteFreieEdvNr(b[0].gruppe),
         bester:b[0].bester,kandidaten:kandidaten.slice(1)};
}
// Darf dieser Benutzer ueberhaupt eine Katalogposition anlegen? Das
// entscheidet dasselbe Recht wie in den Einstellungen (materials-Insert
// verlangt serverseitig has_permission('materials','edit')). Steht es nicht
// zur Verfuegung, wird die Moeglichkeit gar nicht erst angeboten - besser
// als eine Fehlermeldung aus der Datenbank.
function lagerDarfPositionAnlegen(){
 return !!(typeof meineRechte!=="undefined"&&meineRechte&&meineRechte.kataloge);
}
const LAGER_NEUE_POSITION="__neu";
function lagerNeuePositionBlockZeigen(an){
 const box=$("lagerNeuePositionBlock");
 if(!box)return;
 box.hidden=!an;
 if(!an)return;
 if($("lagerNeuePositionEinheit")&&!$("lagerNeuePositionEinheit").value)
  $("lagerNeuePositionEinheit").value="Stk.";
 // v3.139: Wird gleichzeitig ein Produkt angelegt, bleibt dieses Feld LEER
 // und versteckt - lagerNeuePositionAnlegen() nimmt dann die Bezeichnung des
 // Produkts (sein zweites Argument). Eine Bezeichnung, ein Feld. Vorher
 // wurde sie hierher kopiert, und der Anwender sah dasselbe zweimal.
 lagerNummerVorschlagen(false);
}

// v3.126: Vorschlag setzen und BEGRUENDEN. Die Nummer wird nur vorbelegt,
// solange der Anwender sie nicht selbst angefasst hat (lagerNummerVonHand) -
// sonst wuerde ein weiteres Zeichen in der Bezeichnung seine Eingabe
// ueberschreiben.
let lagerNummerVonHand=false;
function lagerNummerVorschlagen(nurWennLeer){
 const feld=$("lagerNeuePositionNr"), hinweis=$("lagerNeuePositionHinweis");
 if(!feld)return;
 if(lagerNummerVonHand&&nurWennLeer!==false)return;
 if(nurWennLeer&&feld.value.trim())return;
 const bez=($("lagerNeuePositionName")&&$("lagerNeuePositionName").value.trim())
   ||($("lagerNeuesProduktBezeichnung")?$("lagerNeuesProduktBezeichnung").value.trim():"");
 const v=lagerNummernVorschlag(bez);
 if(!lagerNummerVonHand)feld.value=v.nummer;
 if(!hinweis)return;
 const andere=(v.kandidaten||[]).filter(k=>k.gruppe!==v.gruppe);
 const knoepfe=andere.length
  ?`<div class="bar" style="margin-top:2px">`+andere.map(k=>
    `<button type="button" class="gray lager-gruppe-knopf" data-lager-gruppe="${esc(k.gruppe)}">${esc(k.gruppe)}.xx \u00b7 ${esc(k.bester.name).slice(0,34)}</button>`).join("")
   +`<button type="button" class="gray lager-gruppe-knopf" data-lager-gruppe="${LAGER_EIGENE_GRUPPE}">${LAGER_EIGENE_GRUPPE}.xx \u00b7 eigener Lager-Bereich</button></div>`
  :"";
 if(v.art==="gruppe"){
  hinweis.innerHTML=`<span class="rmat-sicher">\u2713 Gruppe ${esc(v.gruppe)}</span> \u2013 dort steht bereits `
   +`\u201e${esc(v.bester.name)}\u201c.`+knoepfe;
 }else if(v.art==="unklar"){
  hinweis.innerHTML=`<span class="rmat-unsicher">Mehrere Gruppen passen \u00e4hnlich gut</span> \u2013 deshalb der eigene `
   +`Lager-Bereich. Passt eine davon besser, hier w\u00e4hlen:`+knoepfe;
 }else{
  hinweis.innerHTML=`<span class="small" style="color:var(--muted)">Keine passende Gruppe im Katalog gefunden \u2013 `
   +`die Position bekommt eine Nummer aus dem eigenen Lager-Bereich.</span>`;
 }
}
// Die Nummer folgt der Bezeichnung, solange sie nicht von Hand gesetzt wurde.
["lagerNeuePositionName","lagerNeuesProduktBezeichnung"].forEach(id=>{
 if($(id))$(id).addEventListener("input",()=>{
  if($("lagerNeuePositionBlock")&&!$("lagerNeuePositionBlock").hidden)lagerNummerVorschlagen(false);
 });
});
// v3.136: Die Bezeichnung des PRODUKTS steuert auch den Positionsvorschlag.
// Nur die Trefferliste wird neu gezeichnet, damit das Feld den Fokus behaelt
// (derselbe Grund wie beim Suchfeld weiter unten).
if($("lagerNeuesProduktBezeichnung"))$("lagerNeuesProduktBezeichnung").addEventListener("input",()=>{
 const box=$("lagerNeuesProduktTreffer"), suche=$("lagerNeuesProduktMaterialSuche");
 if(!box)return;
 if(suche&&String(suche.value||"").trim())return;   // getippte Suche hat Vorrang
 if(lagerNeuesProduktArtikel||lagerNeuesProduktNeuePosition)return;  // Wahl steht schon
 box.hidden=false;
 box.innerHTML=lagerNeuesProduktTrefferHtml();
});
if($("lagerNeuePositionNr"))$("lagerNeuePositionNr").addEventListener("input",()=>{
 lagerNummerVonHand=true;
});
if($("lagerNeuePositionHinweis"))$("lagerNeuePositionHinweis").addEventListener("click",e=>{
 const k=e.target.closest?e.target.closest("[data-lager-gruppe]"):null;
 if(!k)return;
 // Eine bewusst gewaehlte Gruppe gilt - die Bezeichnung darf sie danach
 // nicht mehr ueberschreiben.
 lagerNummerVonHand=true;
 $("lagerNeuePositionNr").value=lagerNaechsteFreieEdvNr(k.dataset.lagerGruppe);
});
// ---- v3.126: Trefferliste statt Auswahlfeld, wie im Ausbuchen-Dialog ----
//
// v3.118 setzte hier ein Suchfeld VOR ein <select>. Der Filter lief bei
// jedem Tastendruck, aber ein <select> zeigt seine Liste erst beim
// Aufklappen - man tippte und sah nichts. In v3.125 wurde genau das im
// Ausbuchen-Dialog behoben; dass hier dieselbe Konstruktion stand, wurde
// dabei uebersehen und vom Anwender gemeldet ("Position suchen oeffnet
// immernoch nicht automatisch die Treffer"). Beide Stellen benutzen jetzt
// dasselbe Muster.
let lagerNeuesProduktArtikel=null;        // gewaehlte Materialposition
let lagerNeuesProduktNeuePosition=false;  // "Neue Materialposition anlegen"
const LAGER_PRODUKT_TREFFER_MAX=8;
function lagerNeuesProduktTrefferHtml(){
 const begriff=($("lagerNeuesProduktMaterialSuche")
   ?$("lagerNeuesProduktMaterialSuche").value:"").trim().toLowerCase();
 const alle=lagerNeuesProduktMaterialListeVoll;
 // Solange NICHTS gesucht wird, fuehrt der Vorschlag der App die Liste an -
 // getippte Suche hat immer Vorrang, sie ist die Absicht des Anwenders.
 const bez=$("lagerNeuesProduktBezeichnung")?$("lagerNeuesProduktBezeichnung").value.trim():"";
 const vor=begriff?[]:lagerPositionenVorschlag(bez);
 const vorIds=new Set(vor.map(x=>String(x.artikel.id)));
 const liste=(begriff?alle.filter(a=>lagArtikelText(a).toLowerCase().includes(begriff)):alle)
  .filter(a=>!vorIds.has(String(a.id)));   // nicht zweimal zeigen
 const gezeigt=liste.slice(0,LAGER_PRODUKT_TREFFER_MAX);
 const rest=liste.length-gezeigt.length;
 // Vorgewaehlt wird NICHTS - ein Tippfehler in der Bezeichnung wuerde sonst
 // Bestand auf die falsche Position buchen. Ein Tipp genuegt zum Uebernehmen.
 const vorschlagHtml=vor.length
  ?`<div class="small" style="margin-bottom:2px">`
   +(vor.length>1||vor[0].punkte<LAGER_GRUPPE_MIN*LAGER_GRUPPE_FAKTOR
     ?`<span class="rmat-unsicher">Das könnte passen</span> \u2013 bitte prüfen:`
     :`<span class="rmat-sicher">\u2713 Vorschlag der App</span>`)
   +`</div>`
   +vor.map(x=>`<button type="button" class="gray meas-lager-treffer" `
     +`data-lager-produkt-artikel="${esc(x.artikel.id)}">${esc(lagArtikelText(x.artikel))}</button>`).join("")
   +`<div class="small" style="color:var(--muted);margin:4px 0 2px">Oder aus dem ganzen Katalog:</div>`
  :"";
 // "Neue Materialposition anlegen" ist keine Katalogposition und wird von
 // der Suche deshalb nie weggefiltert.
 const neu=lagerDarfPositionAnlegen()
  ?`<button type="button" class="gray meas-lager-treffer" data-lager-produkt-neu="1">➕ Neue Materialposition anlegen …</button>`
  :"";
 if(!alle.length){
  return `<div class="small" style="color:var(--muted)">Der Material-Katalog ist leer.</div>`+neu;
 }
 if(!liste.length){
  return vorschlagHtml
   +`<div class="small" style="color:var(--muted)">Kein Treffer für „${esc(begriff)}“.</div>`+neu;
 }
 return vorschlagHtml+gezeigt.map(a=>`<button type="button" class="gray meas-lager-treffer" data-lager-produkt-artikel="${esc(a.id)}">${esc(lagArtikelText(a))}</button>`).join("")
  +(rest>0?`<div class="small" style="color:var(--muted)">… ${rest} weitere – bitte genauer suchen.</div>`:"")
  +neu;
}
// v3.128: Das Suchfeld bleibt IMMER stehen - auch dann, wenn schon eine
// Position gewaehlt ist. Bis v3.127 verschwand es in dem Moment, und wer den
// Dialog ueber "＋ Weiteres Produkt zu dieser Position" oeffnete (der
// uebliche Weg), bekam es nie zu sehen: die Position war ja vorbelegt. Der
// einzige Rueckweg war ein kleiner "✏️ ändern"-Knopf neben dem Namen -
// gemeldet vom Anwender ("Auch in der Karte neues Produkt erfassen muss nach
// Positionen gesucht werden koennen"). Die Trefferliste bleibt bei einer
// bereits gewaehlten Position zu, solange nichts eingetippt ist - sonst
// stuende unter der Wahl dauerhaft eine Liste, die niemand braucht.
function lagerNeuesProduktMaterialRendern(){
 const box=$("lagerNeuesProduktTreffer"), gewaehlt=$("lagerNeuesProduktGewaehlt");
 const suche=$("lagerNeuesProduktMaterialSuche");
 const fertig=!!lagerNeuesProduktArtikel||lagerNeuesProduktNeuePosition;
 const begriff=suche?String(suche.value||"").trim():"";
 if(suche){
  suche.hidden=false;
  suche.placeholder=fertig?"\u{1F50D} Andere Position suchen …":"\u{1F50D} Position suchen …";
 }
 if(box){
  box.hidden=fertig&&!begriff;
  if(!box.hidden)box.innerHTML=lagerNeuesProduktTrefferHtml();
 }
 if(gewaehlt){
  gewaehlt.hidden=!fertig;
  if(fertig){
   // v3.141: "Neue Materialposition ✏️ ändern" war nicht zu verstehen -
   // gemeldet mit der Frage, wofuer die beiden Knoepfe da sind. "ändern"
   // klang nach "diese Position bearbeiten", gemeint war "eine andere
   // waehlen"; und der blosse Name sagte nicht, dass es die getroffene
   // Wahl ist. Jetzt sagt "Gewählt:" den Zustand und der Knopf seine Tat.
   gewaehlt.innerHTML=`<span class="small" style="color:var(--muted)">Gewählt:</span> `
    +`<b>${esc(lagerNeuesProduktNeuePosition
     ?"neue Position anlegen":lagArtikelText(lagerNeuesProduktArtikel))}</b> `
    +`<button type="button" class="gray" data-lager-produkt-aendern="1">\u21a9 andere wählen</button>`;
  }
 }
 lagerNeuePositionBlockZeigen(lagerNeuesProduktNeuePosition);
}
// Tippen zeigt die Treffer SOFORT - neu gezeichnet wird nur die
// Trefferliste, damit das Suchfeld den Fokus behaelt.
if($("lagerNeuesProduktMaterialSuche"))$("lagerNeuesProduktMaterialSuche").addEventListener("input",()=>{
 const box=$("lagerNeuesProduktTreffer");
 if(!box)return;
 // v3.128: auch bei schon gewaehlter Position - genau dafuer steht das Feld
 // jetzt da. Eine geleerte Suche klappt die Liste wieder zu.
 const begriff=String($("lagerNeuesProduktMaterialSuche").value||"").trim();
 const fertig=!!lagerNeuesProduktArtikel||lagerNeuesProduktNeuePosition;
 box.hidden=fertig&&!begriff;
 if(!box.hidden)box.innerHTML=lagerNeuesProduktTrefferHtml();
});
if($("lagerNeuesProduktTreffer"))$("lagerNeuesProduktTreffer").addEventListener("click",e=>{
 const neu=e.target.closest?e.target.closest("[data-lager-produkt-neu]"):null;
 if(neu){
  lagerNeuesProduktArtikel=null;
  lagerNeuesProduktNeuePosition=true;
  lagerNeuesProduktMaterialRendern();
  return;
 }
 const a=e.target.closest?e.target.closest("[data-lager-produkt-artikel]"):null;
 if(!a)return;
 lagerNeuesProduktNeuePosition=false;
 lagerNeuesProduktArtikel=lagerNeuesProduktMaterialListeVoll
   .find(x=>String(x.id)===String(a.dataset.lagerProduktArtikel))||null;
 // Die Suche hat ihren Zweck erfuellt - geleert klappt die Liste zu und das
 // Feld steht fuer den naechsten Wechsel wieder bereit.
 if($("lagerNeuesProduktMaterialSuche"))$("lagerNeuesProduktMaterialSuche").value="";
 lagerNeuesProduktMaterialRendern();
});
if($("lagerNeuesProduktGewaehlt"))$("lagerNeuesProduktGewaehlt").addEventListener("click",e=>{
 if(!e.target.closest||!e.target.closest("[data-lager-produkt-aendern]"))return;
 lagerNeuesProduktArtikel=null;
 lagerNeuesProduktNeuePosition=false;
 lagerNeuesProduktMaterialRendern();
});
// v3.148: Darf die Position einen EIGENEN Namen tragen?
// Voreingestellt nein - dann gilt die Bezeichnung des Produkts auch fuer die
// Position (v3.139), und es gibt nur ein Feld. Das ist fuer den haeufigen
// Fall richtig, war aber bis hierher die EINZIGE Moeglichkeit: wer die
// Katalogposition allgemein halten wollte ("Stahlblech svz") und das Produkt
// genau bezeichnen ("Stahlblech svz 0.6 x 670 Rolle"), konnte das beim
// Anlegen nicht. Die Position trug dann den Namen des ersten Produkts - und
// behielt ihn auch, wenn spaeter weitere Produkte dazukamen.
//
// Am Schreibweg aendert sich dafuer NICHTS: lagerNeuePositionAnlegen() nimmt
// laengst den Namen des Feldes, und nur wenn es leer ist, den des Produkts.
// Gebraucht wird also allein die Moeglichkeit, das Feld zu zeigen.
let lagerPositionNameEigen=false;

// Welche Felder gehoeren zum Produkt, welche zur Position? Ohne Produkt
// bleiben Bezeichnung, Barcode und die Positions-Suche weg - die Position
// wird ja gerade angelegt, es gibt nichts zu suchen.
function lagerNeuesProduktModusRendern(){
 const mit=lagerNeuesProduktMitProdukt;
 const zeig=(id,an)=>{ if($(id))$(id).hidden=!an; };
 zeig("lagerNeuesProduktBezeichnungFeld",mit);
 zeig("lagerNeuesProduktBarcodeFeld",mit);
 // Ohne Produkt wird immer eine neue Position angelegt - die Suche nach
 // einer bestehenden waere sinnlos.
 zeig("lagerNeuesProduktPositionFeld",mit);
 // Die Bezeichnung gibt es genau EINMAL - es sei denn, die Position soll
 // ausdruecklich anders heissen (v3.148). Ohne Produkt gibt es ohnehin nur
 // die der Position.
 const eigen=mit&&lagerPositionNameEigen;
 zeig("lagerNeuePositionNameFeld",!mit||eigen);
 if($("lagerNeuePositionNameHinweis"))$("lagerNeuePositionNameHinweis").hidden=!mit||eigen;
 if($("lagerNeuePositionNameEigenHinweis"))$("lagerNeuePositionNameEigenHinweis").hidden=!eigen;
 // Nur wenn beide denselben Namen tragen sollen, muss das Feld leer sein -
 // leer heisst hier "nimm den des Produkts". Beim Trennen wird es dagegen
 // mit der Bezeichnung des Produkts vorbelegt, damit nicht bei null
 // angefangen werden muss.
 if(mit&&!eigen&&$("lagerNeuePositionName"))$("lagerNeuePositionName").value="";
 if(!mit){
  lagerNeuesProduktNeuePosition=true;
  lagerNeuesProduktArtikel=null;
  lagerNeuePositionBlockZeigen(true);
 }
 const t=$("lagerNeuesProduktTitel");
 if(t)t.firstChild.nodeValue=mit?"\u{1F3F7}\uFE0F Neues Produkt erfassen ":"\u{1F4E6} Neue Materialposition anlegen ";
 const k=$("lagerNeuesProduktSpeichern");
 if(k)k.textContent=mit?"\u2705 Anlegen":"\u2705 Position anlegen";
}
// v3.148: trennen und wieder zusammenlegen. Beim Trennen wird die
// Bezeichnung des Produkts uebernommen (Ausgangspunkt, nicht leeres Feld),
// beim Zusammenlegen das Feld geleert - dann greift wieder der Rueckfall auf
// den Produktnamen in lagerNeuePositionAnlegen().
if($("lagerPositionNameEigen"))$("lagerPositionNameEigen").onclick=()=>{
 lagerPositionNameEigen=true;
 const feld=$("lagerNeuePositionName"), bez=$("lagerNeuesProduktBezeichnung");
 if(feld&&!feld.value.trim()&&bez)feld.value=bez.value.trim();
 lagerNeuesProduktModusRendern();
 if(feld){try{feld.focus();feld.select()}catch(e){}}
};
if($("lagerPositionNameGleich"))$("lagerPositionNameGleich").onclick=()=>{
 lagerPositionNameEigen=false;
 lagerNeuesProduktModusRendern();
};
if($("lagerNeuesProduktMitProdukt"))$("lagerNeuesProduktMitProdukt").addEventListener("change",()=>{
 lagerNeuesProduktMitProdukt=$("lagerNeuesProduktMitProdukt").checked;
 lagerNeuesProduktMaterialRendern();
 lagerNeuesProduktModusRendern();
});
function lagerNeuesProduktSchliessen(){
 $("lagerNeuesProduktModal").hidden=true;
}
if($("lagerNeuesProduktAbbrechen"))$("lagerNeuesProduktAbbrechen").onclick=lagerNeuesProduktSchliessen;
if($("lagerNeuesProduktScan"))$("lagerNeuesProduktScan").onclick=()=>{
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{$("lagerNeuesProduktBarcode").value=code});
};
// Legt die Katalogposition an und meldet ihre id zurueck (oder null bei
// einem Fehler - die Meldung steht dann bereits im Dialog).
//
// settings.materials/materialIds werden HIER nachgezogen, wie es js/08 nach
// seinem eigenen Insert auch tut: der Material-Katalog wird zeilenweise
// bearbeitet, nicht als Ganzes zurueckgeschrieben - ohne das Nachziehen
// kaeme die neue Position erst nach dem naechsten Laden in den Auswahllisten
// an, und lagArtikelListe() (js/59) wuesste bis dahin nichts von ihr.
async function lagerNeuePositionAnlegen(fehler,produktName){
 const nr=$("lagerNeuePositionNr")?$("lagerNeuePositionNr").value.trim():"";
 const name=($("lagerNeuePositionName")?$("lagerNeuePositionName").value.trim():"")||produktName;
 const dim=$("lagerNeuePositionDim")?$("lagerNeuePositionDim").value.trim():"";
 const einheit=($("lagerNeuePositionEinheit")?$("lagerNeuePositionEinheit").value.trim():"")||"Stk.";
 const preis=lagerZahl(($("lagerNeuePositionPreis")?$("lagerNeuePositionPreis").value:"").replace(",","."));
 if(!nr){fehler.textContent="Bitte eine EDV-Nr. f\u00fcr die neue Materialposition eingeben.";fehler.hidden=false;return null}
 if(!name){fehler.textContent="Bitte eine Bezeichnung f\u00fcr die neue Materialposition eingeben.";fehler.hidden=false;return null}
 const schon=((typeof lagArtikelListe==="function"?lagArtikelListe():[])||[])
  .find(a=>String(a.edv_nr||"").trim().toLowerCase()===nr.toLowerCase());
 if(schon){
  fehler.textContent="Die EDV-Nr. "+nr+" gibt es bereits ("+lagArtikelText(schon)
   +"). Bitte eine andere Nummer w\u00e4hlen \u2013 oder oben direkt diese Position ausw\u00e4hlen.";
  fehler.hidden=false;
  return null;
 }
 const {data,error}=await sb.from("materials")
  .insert({edv_nr:nr,name,dim,unit:einheit,price:preis}).select("*");
 if(error||!data||!data.length){
  fehler.textContent=error
   ?("Die Materialposition konnte nicht angelegt werden: "+error.message
     +(/permission|policy|row-level/i.test(error.message||"")
       ?"\n\nDaf\u00fcr fehlt das Recht, den Material-Katalog zu \u00e4ndern."
       :""))
   :"Die Materialposition wurde nicht angelegt.";
  fehler.hidden=false;
  return null;
 }
 const m=data[0];
 if(typeof settings==="object"&&settings&&Array.isArray(settings.materials)){
  settings.materials.push([m.edv_nr,m.name,m.dim,m.unit,m.price]);
 }
 if(typeof materialIds!=="undefined"&&Array.isArray(materialIds))materialIds.push(m.id);
 lagerNeuesProduktMaterialListeVoll=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 return m.id;
}

if($("lagerNeuesProduktSpeichern"))$("lagerNeuesProduktSpeichern").onclick=async()=>{
 const fehler=$("lagerNeuesProduktFehler");
 fehler.hidden=true;
 // Ohne Produkt endet der Weg nach der Katalogposition - derselbe
 // Schreibweg (lagerNeuePositionAnlegen), nur ohne den zweiten Schritt.
 if(!lagerNeuesProduktMitProdukt){
  const knopf=$("lagerNeuesProduktSpeichern");
  knopf.disabled=true;
  try{
   // lagerNeuePositionAnlegen zieht settings.materials und materialIds
   // bereits nach - ein volles loadAllData waere hier unnoetiger Ballast.
   const neu=await lagerNeuePositionAnlegen(fehler,"");
   if(!neu)return;
   lagerNeuesProduktSchliessen();
   // Zurueck zu der Liste, aus der der Anwender kam: steht der
   // Material-Katalog offen, wird er neu gezeichnet und die neue Zeile
   // gleich aufgeklappt - sonst die Lagerverwaltung.
   const imKatalog=$("settingsModal")&&!$("settingsModal").hidden;
   if(imKatalog&&typeof renderSettings==="function"){
    if(typeof materialFilter!=="undefined")materialFilter="";
    if($("materialSettingsSearch"))$("materialSettingsSearch").value="";
    if(typeof materialExpanded!=="undefined"&&typeof settings==="object"&&settings
       &&Array.isArray(settings.materials)){
     materialExpanded.add(settings.materials.length-1);
     if(typeof materialPage!=="undefined"&&typeof MATERIAL_PAGE_SIZE!=="undefined")
      materialPage=Math.floor((settings.materials.length-1)/MATERIAL_PAGE_SIZE);
    }
    renderSettings();
   }else if(typeof renderLagerverwaltung==="function")renderLagerverwaltung();
   return;
  }finally{ knopf.disabled=false; }
 }
 const bezeichnung=$("lagerNeuesProduktBezeichnung").value.trim();
 // v3.124/v3.126: die Wahl steht im Zustand, nicht in einem Auswahlfeld.
 let materialId=lagerNeuesProduktNeuePosition?LAGER_NEUE_POSITION
   :(lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.id):"");
 const barcode=$("lagerNeuesProduktBarcode").value.trim();
 if(!bezeichnung){fehler.textContent="Bitte eine Bezeichnung eingeben.";fehler.hidden=false;return}
 if(!materialId){fehler.textContent="Bitte eine Materialposition auswählen.";fehler.hidden=false;return}
 // v3.124: katalogfremdes Produkt - zuerst entsteht die Katalogposition,
 // danach haengt das Produkt wie jedes andere daran. Zwei Schritte, aber
 // EIN Datenmodell.
 if(materialId===LAGER_NEUE_POSITION){
  const neu=await lagerNeuePositionAnlegen(fehler,bezeichnung);
  if(!neu)return;
  materialId=neu;
 }
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
 // v3.123: sichtbar machen, welchem Projekt die Buchung zugeordnet wird -
 // gefragt wird hier nicht, das Projekt der Massaufnahme steht fest.
 const zielBox=$("measLagerZiel");
 if(zielBox){
  const p=(typeof measSelectedProjectId!=="undefined"&&measSelectedProjectId
    &&typeof allProjects!=="undefined"&&Array.isArray(allProjects))
   ?allProjects.find(x=>String(x.id)===String(measSelectedProjectId)):null;
  zielBox.textContent=p
   ?("Wird dem Projekt zugeordnet: "+(lagerProjektText(p)||("Projekt #"+p.id)))
   :"Diese Massaufnahme h\u00e4ngt an keinem Projekt \u2013 die Buchung geht auf \u201eWerkstatt / Lager\u201c.";
 }
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
// v3.125: Die Treffer erscheinen SOFORT beim Tippen.
//
// Bis v3.124 stand hier ein <select>. Das Suchfeld filterte dessen Optionen
// zwar bei jedem Tastendruck, aber ein <select> zeigt seine Liste erst, wenn
// man es aufklappt - der Anwender tippte also und sah nichts, bis er
// zusaetzlich auf das Auswahlfeld tippte. Genau so gemeldet. Ein
// Auswahlfeld ist fuer eine Suche das falsche Bauteil; es steht jetzt eine
// Trefferliste da, die sich mit jedem Zeichen aendert.
const MEAS_LAGER_TREFFER_MAX=8;
function measLagerTrefferListe(z){
 const begriff=String(z.suche||"").trim().toLowerCase();
 const liste=begriff
  ?z.positionen.filter(a=>lagArtikelText(a).toLowerCase().includes(begriff))
  :z.positionen;
 return {begriff,liste,gezeigt:liste.slice(0,MEAS_LAGER_TREFFER_MAX)};
}
function measLagerTrefferHtml(z){
 if(!z.positionen.length){
  return `<div class="small" style="color:var(--muted)">Im Lager ist noch keine Materialposition mit einem Produkt erfasst.</div>`;
 }
 const {begriff,liste,gezeigt}=measLagerTrefferListe(z);
 if(!liste.length){
  return `<div class="small" style="color:var(--muted)">Kein Treffer für „${esc(begriff)}“.</div>`;
 }
 // Ohne Suchbegriff stehen die ersten Positionen da, nicht gar nichts - wer
 // nur wenige Produkte im Lager hat, soll nicht erst tippen muessen.
 const rest=liste.length-gezeigt.length;
 return gezeigt.map(a=>`<button type="button" class="gray meas-lager-treffer" data-meas-lager-waehlen="${esc(z.id)}" data-meas-lager-artikel="${esc(a.id)}">${esc(lagArtikelText(a))}</button>`).join("")
  +(rest>0?`<div class="small" style="color:var(--muted)">… ${rest} weitere – bitte genauer suchen.</div>`:"");
}
function measLagerPositionHtml(z){
 // Ist die Position gewaehlt, steht sie als Text da. Das Suchfeld bleibt
 // v3.128 trotzdem stehen - dieselbe Aenderung wie im Produkt-Dialog und aus
 // demselben Grund: ein "✏️ ändern"-Knopf allein ist kein Suchweg. Die
 // Trefferliste klappt nur auf, wenn wirklich etwas eingetippt ist.
 if(z.artikel){
  const begriff=String(z.suche||"").trim();
  return `<div class="rmat-pos">
   <div class="small">Position: <b>${esc(lagArtikelText(z.artikel))}</b></div>
   ${z.vorschlagSicher?`<span class="rmat-sicher">✓ Vorschlag der App</span>`:""}
   <button type="button" class="gray" data-meas-lager-position-aendern="${esc(z.id)}">✏️ Position ändern</button>
   <input type="search" placeholder="Andere Position suchen …" data-meas-lager-suche="${esc(z.id)}" value="${esc(z.suche||"")}">
   <div class="meas-lager-treffer-liste" data-meas-lager-treffer="${esc(z.id)}"${begriff?"":" hidden"}>${begriff?measLagerTrefferHtml(z):""}</div>
  </div>`;
 }
 const hinweis=z.vorschlag
  ?`<span class="rmat-unsicher">Vorschlag: ${esc(z.vorschlag)} – bitte prüfen und wählen</span>`
  :`<span class="rmat-unsicher">Keine passende Position gefunden – bitte selbst wählen.</span>`;
 return `<div class="rmat-pos">
  <input type="search" placeholder="Position suchen …" data-meas-lager-suche="${esc(z.id)}" value="${esc(z.suche||"")}">
  ${hinweis}
  <div class="meas-lager-treffer-liste" data-meas-lager-treffer="${esc(z.id)}">${measLagerTrefferHtml(z)}</div>
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

// v3.121/v3.125: die Materialposition eines Halbfabrikats. Mit ihr wechselt
// auch die Produktliste - hat die neue Position genau ein Produkt, steht es
// damit fest, sonst waehlt wieder der Anwender. Bewusst AUSSERHALB des
// if-Blocks: eine Funktionsdeklaration darin waere in "use strict"
// blockgebunden und von aussen nicht erreichbar.
function measLagerPositionSetzen(z,a){
 if(!z)return;
 z.artikel=a||null;
 z.no=a?String(a.edv_nr):"";
 if(a&&a.unit)z.einheit=a.unit;
 z.varianten=a?lagerVariantenVonMaterial(a.id):[];
 z.varianteId=z.varianten.length===1?String(z.varianten[0].id):"";
 if(!z.varianteId)z.gewaehlt=false;
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
 });
 // v3.125: Die Materialposition wird jetzt durch Antippen eines Treffers
 // gewaehlt, nicht mehr aus einem Auswahlfeld.
 $("measLagerListe").addEventListener("click",e=>{
  const waehlen=e.target.closest?e.target.closest("[data-meas-lager-waehlen]"):null;
  if(waehlen){
   const z=measLagerZeilen.find(x=>x.id===waehlen.dataset.measLagerWaehlen);
   if(z){
    measLagerPositionSetzen(z,z.positionen.find(a=>String(a.id)===String(waehlen.dataset.measLagerArtikel))||null);
    // v3.128: nach der Wahl ist die Suche erledigt - geleert klappt die
    // Trefferliste zu, statt dauerhaft zwischen der gewaehlten Position und
    // dem Mengenfeld zu stehen. Dasselbe im Produkt-Dialog.
    z.suche="";
   }
   renderMeasLagerListe();
   return;
  }
  const aendern=e.target.closest?e.target.closest("[data-meas-lager-position-aendern]"):null;
  if(aendern){
   const z=measLagerZeilen.find(x=>x.id===aendern.dataset.measLagerPositionAendern);
   // Die Wahl wird aufgehoben, das leere Suchfeld steht wieder bereit. Bis
   // v3.127 stand hier "die Suche bleibt stehen" - seit die Wahl sie leert
   // (s. o.) ist sie das ohnehin nicht mehr, und das Feld ist jetzt auch
   // ohne diesen Knopf erreichbar.
   if(z)measLagerPositionSetzen(z,null);
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
   // v3.125: NUR die Trefferliste dieser einen Zeile neu zeichnen. Ein
   // voller Neuaufbau wuerde dem Suchfeld den Fokus nehmen (dieselbe Lehre
   // wie beim Mengenfeld unten) - und die Treffer muessen waehrend des
   // Tippens sichtbar werden, nicht erst danach.
   const box=$("measLagerListe").querySelector('[data-meas-lager-treffer="'+z.id+'"]');
   if(box){
    // v3.128: bei schon gewaehlter Position ist die Liste zu, bis getippt
    // wird - und klappt wieder zu, wenn die Suche geleert wird.
    box.hidden=!!z.artikel&&!String(z.suche||"").trim();
    box.innerHTML=box.hidden?"":measLagerTrefferHtml(z);
   }
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
 // v3.123: Das Projekt steht hier bereits fest - es ist das Projekt der
 // Massaufnahme. Es wird deshalb NICHT gefragt, sondern uebernommen; im
 // Dialog steht darueber, welches es ist. Eine Massaufnahme ohne Projekt
 // gibt es im Ablauf nicht, aber falls doch, geht die Buchung als
 // "Werkstatt / Lager" durch statt zu scheitern.
 const ziel=(typeof measSelectedProjectId!=="undefined"&&measSelectedProjectId)
  ?{project_id:Number(measSelectedProjectId),ziel:"projekt"}
  :{project_id:null,ziel:LAGER_ZIEL_WERKSTATT};
 // Eine Anfrage fuer alle Zeilen: entweder werden alle gebucht oder keine -
 // ein halb gebuchter Materialsatz waere schlimmer als gar keiner.
 const {data,error}=await sb.from("lagerbestand_bewegungen").insert(
  zeilen.map(z=>({variante_id:Number(z.varianteId),art:"abgang",menge:-Math.abs(z.menge),grund,
   project_id:ziel.project_id,ziel:ziel.ziel}))
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

// ---- Materialzusammenfassung im Projekt (v3.123) --------------------------
// Was ist fuer DIESES Projekt ab Lager gebucht worden? Quelle sind die
// Buchungen selbst (lagerbestand_bewegungen.project_id), nicht etwa eine
// zweite, mitgefuehrte Liste - der Bestand ist seit v3.98 immer die Summe
// der Buchungen, und dieselbe Regel gilt hier fuer den Verbrauch.
//
// Zusaetzlich werden die vor v3.123 aus einer Massaufnahme gebuchten Zeilen
// wiedergefunden: die tragen das Projekt zwar nicht als Spalte, wohl aber
// die Marke "(#MA<id>)" im Grund (v3.120). Ueber die Massaufnahmen des
// Projekts laesst sich daraus die Zuordnung nachtraeglich herstellen - ohne
// eine einzige Buchung zu aendern (sie sind unveraenderlich).
let cockpitLagerZeilen=[];

function lagerBuchungenFuerProjekt(projectId,massaufnahmeIds){
 if(!projectId)return [];
 const marken=(massaufnahmeIds||[]).map(id=>measLagerMarke(id));
 return lagerBewegungen.filter(b=>{
  if(String(b.project_id||"")===String(projectId))return true;
  if(b.project_id)return false;                       // gehoert einem anderen Projekt
  if(b.ziel===LAGER_ZIEL_WERKSTATT)return false;      // bewusst der Werkstatt zugeordnet
  const grund=String(b&&b.grund!=null?b.grund:"");
  return marken.some(m=>grund.includes(m));           // alte Massaufnahme-Buchung
 });
}

// Je Produkt zusammengefasst: wie viel ging raus, wie viel kam zurueck.
// Abgang wird als POSITIVE Verbrauchsmenge gezeigt - auf einer
// Materialliste steht kein Minus.
function lagerZusammenfassung(buchungen){
 const nach=new Map();
 (buchungen||[]).forEach(b=>{
  const key=String(b.variante_id);
  if(!nach.has(key)){
   const v=lagerVariante(b.variante_id);
   const a=(v&&typeof lagArtikel==="function")?lagArtikel(v.material_id):null;
   nach.set(key,{
    varianteId:b.variante_id,
    position:a?lagArtikelText(a):"",
    produkt:v?v.bezeichnung:("Produkt #"+b.variante_id),
    // Die Standard-Variante heisst wie die Position - dann nicht doppelt.
    einheit:(a&&a.unit)?a.unit:"",
    raus:0,zurueck:0,korrektur:0,buchungen:[]
   });
  }
  const z=nach.get(key);
  const m=lagerZahl(b.menge);
  if(b.art==="abgang")z.raus+=Math.abs(m);
  else if(b.art==="zugang")z.zurueck+=Math.abs(m);
  else z.korrektur+=m;
  z.buchungen.push(b);
 });
 const liste=[...nach.values()];
 liste.forEach(z=>{
  z.netto=z.raus-z.zurueck-z.korrektur;
  z.buchungen.sort((a,b)=>String(a.created_at||"").localeCompare(String(b.created_at||"")));
 });
 liste.sort((a,b)=>(a.position||a.produkt).localeCompare(b.position||b.produkt,"de"));
 return liste;
}
function lagerZusammenfassungTitel(z){
 return z.position&&z.produkt&&z.produkt!==z.position.replace(/^[^ ]+ /,"")
  ? (z.position+" – "+z.produkt)
  : (z.position||z.produkt);
}

async function cockpitLagerLaden(projectId){
 const box=$("cockpitLagerBody");
 if(!box)return 0;
 if(!lagerverwaltungZugriff)return 0;
 box.innerHTML='<div class="small">Wird geladen …</div>';
 // Immer frisch: zwischen dem Oeffnen des Projekts und diesem Klick kann
 // jemand anders gebucht haben.
 await lagerVariantenLaden();
 await lagerBewegungenLaden();
 let ids=[];
 const {data}=await sb.from("measurements").select("id").eq("project_id",projectId);
 ids=(data||[]).map(m=>m.id);
 cockpitLagerZeilen=lagerZusammenfassung(lagerBuchungenFuerProjekt(projectId,ids));
 renderCockpitLager();
 return cockpitLagerZeilen.length;
}
function renderCockpitLager(){
 const box=$("cockpitLagerBody");
 if(!box)return;
 if($("cockpitLagerCount"))$("cockpitLagerCount").textContent=String(cockpitLagerZeilen.length);
 if($("cockpitLagerDruck"))$("cockpitLagerDruck").disabled=!cockpitLagerZeilen.length;
 if(!cockpitLagerZeilen.length){
  box.innerHTML='<div class="small" style="color:var(--muted)">Für dieses Projekt wurde noch nichts ab Lager gebucht. '
   +'Das geschieht in der Lagerverwaltung (Knopf „Buchen“, Objekt/Projekt wählen) oder direkt aus einer Massaufnahme '
   +'(„📤 Ab Lager ausbuchen“).</div>';
  return;
 }
 box.innerHTML=cockpitLagerZeilen.map(z=>`<div class="report-row">
  <div class="report-row-info"><b>${esc(lagerZusammenfassungTitel(z))}</b>
   <span>Verbraucht: <b>${esc(lagerZahlText(z.netto))}</b>${z.einheit?" "+esc(z.einheit):""}${
     (z.zurueck||z.korrektur)?" · ausgebucht "+esc(lagerZahlText(z.raus))
       +(z.zurueck?", zurück "+esc(lagerZahlText(z.zurueck)):"")
       +(z.korrektur?", Korrektur "+esc(lagerZahlText(z.korrektur)):""):""}</span>
   <span class="small" style="color:var(--muted)">${z.buchungen.map(b=>{
     const d=b.created_at?new Date(b.created_at).toLocaleDateString("de-CH"):"–";
     return esc(d+" · "+(LAGER_ART_TEXT[b.art]||b.art)+" "+lagerZahlText(b.menge)
       +(b.grund?" · "+b.grund:""));
    }).join("<br>")}</span>
  </div>
 </div>`).join("");
}

// ---- Druck ----------------------------------------------------------------
// Derselbe Weg wie jede andere Liste der App (pdfKopfHtml + PDF_LAYOUT_CSS +
// pdfDruckVorbereiten, js/16/js/35) - kein eigenes Druck-Layout.
function lagerZusammenfassungDokument(projekt,zeilen,logoSrc){
 const kopf=(typeof pdfKopfHtml==="function")?pdfKopfHtml({
  datensatz:{project_id:projekt?projekt.id:null},
  projekt:projekt||null,
  bezeichnung:"",
  dokumenttyp:"Materialzusammenfassung",
  unterart:"ab Lager gebucht",
  datum:new Date().toISOString().slice(0,10),
  bearbeiter:(typeof currentProfile!=="undefined"&&currentProfile)
    ?`${currentProfile.first_name} ${currentProfile.last_name}`:"",
  logoSrc
 }):"";
 if(!zeilen.length){
  return kopf+`<div class="note">Für dieses Projekt wurde nichts ab Lager gebucht.</div>`;
 }
 const zeigeRueckgabe=zeilen.some(z=>z.zurueck||z.korrektur);
 const rows=zeilen.map(z=>`<tr>
  <td>${esc(lagerZusammenfassungTitel(z))}</td>
  <td class="lz-zahl">${esc(lagerZahlText(z.netto))}</td>
  <td>${esc(z.einheit||"")}</td>
  ${zeigeRueckgabe?`<td class="lz-zahl">${esc(lagerZahlText(z.raus))}</td>
  <td class="lz-zahl">${esc(lagerZahlText(z.zurueck))}</td>`:""}
 </tr>`).join("");
 return kopf+`<div class="eb-section-head">Material ab Lager</div>
<table class="lz-tab"><thead><tr>
 <th>Position / Produkt</th><th class="lz-zahl">Verbraucht</th><th>Einheit</th>
 ${zeigeRueckgabe?`<th class="lz-zahl">Ausgebucht</th><th class="lz-zahl">Zurück</th>`:""}
</tr></thead><tbody>${rows}</tbody></table>
<div class="note">Verbraucht = ausgebucht abzüglich Rückgaben und Korrekturen. Gezählt werden
ausschliesslich Lagerbuchungen, die diesem Projekt zugeordnet sind – Material, das ohne
Projekt gebucht wurde, steht hier nicht.</div>`;
}
const LZ_CSS=`
 .lz-tab{width:100%;border-collapse:collapse}
 .lz-tab th,.lz-tab td{border-bottom:0.25pt solid #c9d2d8;padding:1mm 1.5mm;vertical-align:top}
 .lz-tab th{text-align:left;font-weight:700}
 .lz-zahl{text-align:right;white-space:nowrap}
`;
async function lagerZusammenfassungDrucken(projectId){
 if(typeof pdfDruckVorbereiten!=="function"){alert("Der Druck ist gerade nicht verfügbar.");return}
 if(!cockpitLagerZeilen.length){
  alert("Für dieses Projekt wurde noch nichts ab Lager gebucht – es gibt nichts zu drucken.");
  return;
 }
 const projekt=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))
  ?allProjects.find(x=>String(x.id)===String(projectId)):null;
 let logoSrc="";
 try{ logoSrc=(typeof storageSignedUrl==="function")?await storageSignedUrl(logoUrl):logoUrl }catch(e){ logoSrc="" }
 const html=lagerZusammenfassungDokument(projekt,cockpitLagerZeilen,logoSrc);
 const vor=await pdfDruckVorbereiten(html,"eb-section-head",{listen:"alle"});
 if(!vor)return;
 const win=vor.win;
 const name=(typeof pdfDateiname==="function")
  ?pdfDateiname("Materialzusammenfassung",projekt?projekt.name:"",projekt?projekt.object:"")
  :"Materialzusammenfassung";
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
<style>
${typeof PDF_LAYOUT_CSS!=="undefined"?PDF_LAYOUT_CSS:""}
${LZ_CSS}
</style></head><body>
${(typeof pdfZahlenRechts==="function")?pdfZahlenRechts(vor.html):vor.html}
${(typeof pdfFooterHtml==="function")?pdfFooterHtml({project_id:projectId||null}):""}
</body></html>`);
 win.document.close();
 const drucken=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=drucken;
 setTimeout(drucken,800);
}
if($("cockpitLagerDruck"))$("cockpitLagerDruck").onclick=()=>{
 lagerZusammenfassungDrucken(typeof cockpitProjectId!=="undefined"?cockpitProjectId:null);
};

// ---- v3.127: Produkte loeschen, archivieren, wieder aktivieren -----------
//
// Die Regel folgt der Unveraenderlichkeit der Buchungen (seit v3.98):
//  ohne Buchungen -> das Produkt wird wirklich geloescht.
//  mit Buchungen  -> es wird ARCHIVIERT. Der Fremdschluessel
//                    lagerbestand_bewegungen.variante_id steht auf NO ACTION,
//                    die Datenbank wuerde ein Loeschen ohnehin verweigern -
//                    und das ist richtig so: die Bestandsgeschichte darf
//                    nicht verschwinden. Ein archiviertes Produkt ist
//                    ueberall weg, wo gebucht oder gewaehlt wird, und laesst
//                    sich jederzeit wieder aktivieren.
async function lagerProduktLoeschen(varianteId){
 const v=lagerVariante(varianteId);
 if(!v)return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Ein Produkt zu löschen"))return;
 const gebucht=lagerBewegungenVon(v.id).length;
 if(gebucht){
  // Sollte die Oberflaeche je daneben liegen, faengt es hier auf, statt die
  // Datenbank mit einem Fremdschluessel-Fehler antworten zu lassen.
  alert("Für dieses Produkt gibt es bereits "+gebucht+" Buchung"+(gebucht===1?"":"en")+".\n\n"
   +"Es lässt sich deshalb nicht löschen – die Bestandsgeschichte würde verschwinden. "
   +"Stattdessen archivieren: dann ist es überall weg, wo gebucht wird, die Buchungen bleiben aber stehen.");
  return;
 }
 if(!confirm("Produkt „"+v.bezeichnung+"“ endgültig löschen?\n\nEs gibt dazu keine Buchung – es verschwindet vollständig."))return;
 const {error}=await sb.from("lager_varianten").delete().eq("id",v.id);
 if(error){
  lagerHinweis("Konnte nicht gelöscht werden: "+error.message,true);
  return;
 }
 lagerVarianten=lagerVarianten.filter(x=>String(x.id)!==String(v.id));
 lagerHinweis("Produkt „"+v.bezeichnung+"“ gelöscht.");
 renderLagerverwaltung();
 lagerPositionAufraeumenAnbieten(v.material_id);
}
async function lagerProduktArchivSetzen(varianteId,archiviert){
 const v=lagerVariante(varianteId);
 if(!v)return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Ein Produkt zu ändern"))return;
 if(archiviert&&!confirm("Produkt „"+v.bezeichnung+"“ archivieren?\n\n"
   +"Es verschwindet aus der Liste und aus allen Auswahlfeldern. Die "
   +lagerBewegungenVon(v.id).length+" Buchung(en) und der Bestandsverlauf bleiben erhalten. "
   +"Rückgängig machen geht jederzeit über „📦 Archiv anzeigen“."))return;
 const {error}=await sb.from("lager_varianten").update({archiviert:!!archiviert}).eq("id",v.id);
 if(error){
  lagerHinweis("Konnte nicht geändert werden: "+error.message,true);
  return;
 }
 v.archiviert=!!archiviert;
 lagerHinweis("Produkt „"+v.bezeichnung+"“ "+(archiviert?"archiviert":"wieder aktiviert")+".");
 renderLagerverwaltung();
 // Beim Archivieren wird die Katalogposition ABSICHTLICH nicht angeboten:
 // das Produkt liegt ja noch da (mitsamt seinen Buchungen) und braucht seine
 // Position weiter. Aufgeraeumt wird nur nach einem echten Loeschen.
}

// Bleibt eine Materialposition ohne aktives Produkt zurueck, bietet die App
// an, auch die KATALOGPOSITION zu entfernen. Das wirkt in den Regie-Katalog
// hinein (Regierapport, Offerte, Massaufnahme) - deshalb ausdruecklich
// gefragt, mit Nennung der Folgen, und nur mit dem Recht, den Katalog zu
// aendern. Wer ablehnt, behaelt eine Position ohne Produkt; die Liste zeigt
// dafuer seit v3.106 "Noch kein Produkt erfasst".
async function lagerPositionAufraeumenAnbieten(materialId){
 if(!materialId||!lagerDarfPositionAnlegen())return;
 if(lagerVariantenVonMaterialAlle(materialId).length)return;
 const a=(typeof lagArtikel==="function")?lagArtikel(materialId):null;
 if(!a)return;
 // Der Blech-Materialbestand und die Reststuecke zeigen mit artikel_id auf
 // diese Position; der Fremdschluessel steht dort auf SET NULL. Die
 // Eintraege bleiben also bestehen, verlieren aber ihre Zuordnung - das ist
 // eine Folge, die der Anwender vorher wissen muss. Der Blech-Bestand ist im
 // Browser geladen, also wird er konkret gezaehlt; die Reststuecke sind es
 // nicht und werden deshalb nur benannt, nicht geschaetzt.
 const blech=((typeof lagerbestand!=="undefined"?lagerbestand:[])||[])
   .filter(l=>String(l.artikel_id||"")===String(materialId)).length;
 if(!confirm("Zur Materialposition „"+lagArtikelText(a)+"“ gibt es jetzt kein Produkt mehr.\n\n"
  +"Soll die Position auch aus dem MATERIAL-KATALOG entfernt werden?\n\n"
  +"Achtung: der Katalog wird auch vom Regierapport, von Offerten und von "
  +"Massaufnahmen benutzt. Bereits geschriebene Rapporte und Offerten ändern "
  +"sich dadurch nicht, aber die Position lässt sich danach nicht mehr auswählen.\n\n"
  +(blech?(blech+" Eintrag/Einträge im Blech-Materialbestand verlieren dadurch ihre Zuordnung zu dieser Position (sie bleiben bestehen).\n\n"):"")
  +"Dasselbe gilt für Reststücke, die auf diese Position zeigen.\n\n"
  +"Abbrechen lässt die Position stehen – ohne Produkt."))return;
 const {error}=await sb.from("materials").delete().eq("id",materialId);
 if(error){
  lagerHinweis("Die Materialposition konnte nicht entfernt werden: "+error.message
   +(/permission|policy|row-level/i.test(error.message||"")?" Dafür fehlt das Recht, den Material-Katalog zu ändern.":""),true);
  return;
 }
 // settings.materials/materialIds nachziehen - derselbe Grund wie beim
 // Anlegen (v3.124): der Katalog wird zeilenweise bearbeitet, nicht als
 // Ganzes zurueckgeschrieben.
 if(typeof materialIds!=="undefined"&&Array.isArray(materialIds)){
  const i=materialIds.findIndex(id=>String(id)===String(materialId));
  if(i>=0){
   materialIds.splice(i,1);
   if(typeof settings==="object"&&settings&&Array.isArray(settings.materials))settings.materials.splice(i,1);
  }
 }
 lagerNeuesProduktMaterialListeVoll=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 lagerHinweis("Materialposition „"+lagArtikelText(a)+"“ aus dem Katalog entfernt.");
 renderLagerverwaltung();
}

if($("lagerverwaltungListe"))$("lagerverwaltungListe").addEventListener("click",e=>{
 const weg=e.target.closest?e.target.closest("[data-lager-loeschen]"):null;
 if(weg){e.stopPropagation();lagerProduktLoeschen(weg.dataset.lagerLoeschen);return}
 const arch=e.target.closest?e.target.closest("[data-lager-archivieren]"):null;
 if(arch){e.stopPropagation();lagerProduktArchivSetzen(arch.dataset.lagerArchivieren,true);return}
 const akt=e.target.closest?e.target.closest("[data-lager-aktivieren]"):null;
 if(akt){e.stopPropagation();lagerProduktArchivSetzen(akt.dataset.lagerAktivieren,false)}
});
