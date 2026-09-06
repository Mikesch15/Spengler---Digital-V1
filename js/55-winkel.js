// ---------------------------------------------------------------------------
// Winkel im Meter (i.M.) <-> Grad          Version 3.12
//
// Fachliche Referenz ist AUSSCHLIESSLICH die Umrechnungstabelle
// "Umrechnungstabelle Winkel in Meter - Grad" (GABS AG, Gebaeudehuelle,
// PO.0823.d), 120 Zeilen von 50.00 bis 79.75 cm in Schritten von 0.25 cm.
// Die Tabelle steht hier Zeile fuer Zeile - es wird KEINE Formel benutzt und
// keine nachgerechnet. Gleiche Regel wie bei der Kehle (CLAUDE.md 60.2) und
// der Rinne (64.1): die Vorlage ist die Wahrheit, nicht eine Nacherzaehlung.
//
// Jede Zeile der Vorlage nennt zwei Winkel, z.B. 50 cm -> "31 / 149".
// Zwei sich kreuzende Flaechen bilden vier Winkel: a, 180-a, a, 180-a.
// Der Meter misst genau EINEN dieser Keile - das ist die erste Zahl.
// Die zweite Zahl ist der Nachbarkeil (180-a), damit man den Meter nicht
// umsetzen muss. Beide sind gueltig; welcher gemeint ist, weiss nur der
// Spengler, deshalb bietet der Dialog immer beide zur Uebernahme an.
//
// WICHTIG: Das Eingabefeld haelt IMMER Grad. Die Umrechnung ist eine reine
// Eingabehilfe - kein Feld wechselt je seine Einheit, keine Fachrechnung,
// kein Speicherformat und kein PDF wird angefasst. Damit kann kein cm-Wert
// versehentlich als Grad gespeichert werden.
// ---------------------------------------------------------------------------

const WINKEL_CM_MIN=50, WINKEL_CM_MAX=79.75, WINKEL_CM_SCHRITT=0.25;

// Index 0 = 50.00 cm, danach je 0.25 cm. Wert = Grad a (erste Zahl der Zeile).
const WINKEL_TAB=[
 // 50.00 - 59.75
 31,32,33,33, 34,35,36,36, 37,38,38,39, 40,41,42,43,
 43,44,45,46, 46,47,48,49, 50,50,51,52, 52,53,54,55,
 56,57,58,58, 59,60,61,62,
 // 60.00 - 69.75
 63,64,64,65, 66,67,67,68, 69,70,71,72, 73,74,75,75,
 76,77,78,79, 80,81,82,83, 83,84,85,86, 87,88,89,90,
 91,92,93,94, 95,96,97,98,
 // 70.00 - 79.75
 100,101,102,103, 104,105,106,107, 108,110,111,112, 113,115,116,117,
 119,120,121,123, 124,126,127,129, 130,132,134,136, 137,140,142,144,
 146,148,150,154, 157,160,164,169
];

const WINKEL_GRAD_MIN=WINKEL_TAB[0];                    // 31
const WINKEL_GRAD_MAX=WINKEL_TAB[WINKEL_TAB.length-1];  // 169

function winkelCmZuIndex(cm){return (cm-WINKEL_CM_MIN)/WINKEL_CM_SCHRITT}
function winkelIndexZuCm(i){return WINKEL_CM_MIN+i*WINKEL_CM_SCHRITT}
function winkelZahl(v){
 const n=Number(String(v==null?"":v).replace(",","."));
 return Number.isFinite(n)?n:null;
}
function winkelCmText(cm){
 // Der Meter wird auf Viertelzentimeter abgelesen - mehr als zwei
 // Nachkommastellen taeuscht eine Genauigkeit vor, die es nicht gibt.
 return cm.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");
}

// ---- i.M. -> Grad ---------------------------------------------------------
// Liefert {grad, gegen, genau, unten, oben} oder {fehler}.
function winkelAusMeter(cm){
 const a=winkelZahl(cm);
 if(a===null)return {fehler:"Bitte das Meter-Mass in Zentimetern eingeben."};
 if(a<WINKEL_CM_MIN||a>WINKEL_CM_MAX)
  return {fehler:"Die Tabelle deckt "+winkelCmText(WINKEL_CM_MIN)+" bis "
    +winkelCmText(WINKEL_CM_MAX)+" cm ab. "+winkelCmText(a)+" cm liegt ausserhalb."};
 const idx=winkelCmZuIndex(a);
 const u=Math.floor(idx+1e-9), o=Math.ceil(idx-1e-9);
 if(u===o){
  const g=WINKEL_TAB[u];
  return {grad:g, gegen:180-g, genau:true};
 }
 // Zwischen zwei Tabellenzeilen wird linear interpoliert und auf ganze
 // Grad gerundet - die Tabelle selbst nennt nur ganze Grad.
 const gu=WINKEL_TAB[u], go=WINKEL_TAB[o];
 const t=idx-u;
 const g=Math.round(gu+(go-gu)*t);
 return {grad:g, gegen:180-g, genau:false,
   unten:{cm:winkelIndexZuCm(u), grad:gu}, oben:{cm:winkelIndexZuCm(o), grad:go}};
}

// ---- Grad -> i.M. ---------------------------------------------------------
// Mehrere Zeilen koennen denselben Grad tragen (z.B. 33 bei 50.50 und 50.75)
// und einzelne Grad fehlen ganz (z.B. 99). Deshalb wird je vorkommendem Grad
// die Mitte seiner Zeilen genommen und dazwischen interpoliert.
function winkelMitteFuerGrad(g){
 const treffer=[];
 for(let i=0;i<WINKEL_TAB.length;i++)if(WINKEL_TAB[i]===g)treffer.push(winkelIndexZuCm(i));
 if(!treffer.length)return null;
 return treffer.reduce((s,x)=>s+x,0)/treffer.length;
}
function winkelCmFuerGrad(g){
 const direkt=winkelMitteFuerGrad(g);
 if(direkt!==null)return direkt;
 let unten=null, oben=null;
 for(let d=g-1;d>=WINKEL_GRAD_MIN;d--){const m=winkelMitteFuerGrad(d);if(m!==null){unten={g:d,cm:m};break}}
 for(let d=g+1;d<=WINKEL_GRAD_MAX;d++){const m=winkelMitteFuerGrad(d);if(m!==null){oben={g:d,cm:m};break}}
 if(!unten||!oben)return null;
 const t=(g-unten.g)/(oben.g-unten.g);
 return unten.cm+(oben.cm-unten.cm)*t;
}
// Liefert {cm, gemessen, gegen} oder {fehler}.
// gemessen = der Winkel, den der Meter an dieser Stelle tatsaechlich aufspannt.
// Liegt der gesuchte Winkel ausserhalb 31..169, wird der Nachbarkeil gemessen.
function winkelZuMeter(grad){
 const g=winkelZahl(grad);
 if(g===null)return {fehler:"Bitte den Winkel in Grad eingeben."};
 const gr=Math.round(g);
 if(gr>=WINKEL_GRAD_MIN&&gr<=WINKEL_GRAD_MAX){
  const cm=winkelCmFuerGrad(gr);
  if(cm===null)return {fehler:"Für "+gr+"° steht in der Tabelle nichts."};
  return {cm, gemessen:gr, gegen:180-gr};
 }
 const rest=180-gr;
 if(rest>=WINKEL_GRAD_MIN&&rest<=WINKEL_GRAD_MAX){
  const cm=winkelCmFuerGrad(rest);
  if(cm===null)return {fehler:"Für "+gr+"° steht in der Tabelle nichts."};
  return {cm, gemessen:rest, gegen:gr};
 }
 return {fehler:"Die Tabelle deckt "+WINKEL_GRAD_MIN+"° bis "+WINKEL_GRAD_MAX
   +"° ab (mit dem Nachbarkeil "+(180-WINKEL_GRAD_MAX)+"° bis "
   +(180-WINKEL_GRAD_MIN)+"°). "+gr+"° liegt ausserhalb."};
}

// ---------------------------------------------------------------------------
// Der Umrechnen-Knopf an jedem Winkelfeld
//
// Die Felder stehen hier zentral, damit KEIN Fachmodul angefasst werden muss -
// gleiches Muster wie HILFE_TEXTE in js/41 (CLAUDE.md 108.2). Kommt ein neues
// Winkelfeld dazu, gehoert es in diese Liste; der Pruefstand sucht in allen
// zwoelf Massaufnahme-Arten nach Winkelfeldern ohne Knopf und meldet sie.
// ---------------------------------------------------------------------------
const WINKEL_FELDER=[
 "#eba_winkel",                       // Einlaufblech gerade - Dachneigung
 "[data-eba-winkel]",                 //   "        "        - Gehrung je Stueck
 "#ebka_dachneigung",                 // Einlaufblech konisch - Dachneigung
 "[data-ebka-winkel]",                //   "        "         - Gehrung je Stueck
 "#luka_winkel",                      // Lukarne - oberer Innenwinkel
 "#kea_nh","#kea_nl",                 // Kehle - Neigung Hauptdach / Lukarne
 "#kam_winkelVorne","#kam_winkelHinten", // Kamin - Innenwinkel Dach/Wand
 "[id^='einfa_winkel_']",             // Einfassung Rund - Innenwinkel Dach/Rohr
 "[data-ra-ueb-winkel]",              // Rinne Halbrund - Ecke im Verlauf
 "[data-fpa-winkel]",                 // Freies Profil - Schenkelwinkel
 "[data-mada-winkel]",                // Mauerabdeckung - Ecke zum naechsten Segment
 "[data-mada-profil='gefaelle']",     //   "            - Gefaelle
 "[data-mada-profil='biegeLinks']",   //   "            - Biegewinkel links
 "[data-mada-profil='biegeRechts']",  //   "            - Biegewinkel rechts
 "[data-rp-seg='winkel']",            // Rinne (Zuschnittliste) - Profilwinkel
 "[data-anbseg-winkel]",              // Ort- und Seitenbleche - Knickwinkel
 "[data-set-rinne-angle]"             // Einstellungen - Anschlusstypen Rinne
];

let winkelZiel=null;       // das Feld, in das uebernommen wird
let winkelRichtung="aus";  // "aus" = i.M. -> Grad, "zu" = Grad -> i.M.
let winkelBaut=false;      // laeuft gerade das Anhaengen der Knoepfe?

function winkelKnopfHtml(){
 const b=document.createElement("button");
 b.type="button";
 b.className="winkel-knopf no-print";
 b.textContent="i.M.";
 b.title="Winkel aus dem Meter umrechnen";
 b.setAttribute("aria-label","Winkel aus dem Meter umrechnen");
 b.dataset.winkelKnopf="1";
 return b;
}
// Haengt an jedes markierte Feld genau einen Knopf. Wird eine Tabelle vom
// Fachmodul neu gezeichnet, verschwindet der Knopf mit ihr und wird hier
// wieder gesetzt - das Fachmodul weiss davon nichts.
function winkelKnoepfeSetzen(){
 if(winkelBaut)return;
 winkelBaut=true;
 try{
  document.querySelectorAll(WINKEL_FELDER.join(",")).forEach(inp=>{
   if(!inp||inp.tagName!=="INPUT")return;
   const n=inp.nextElementSibling;
   if(n&&n.dataset&&n.dataset.winkelKnopf)return;
   inp.insertAdjacentElement("afterend",winkelKnopfHtml());
  });
 }catch(e){/* eine kaputte Auswahl darf die App nicht anhalten */}
 winkelBaut=false;
}

// ---- Dialog ---------------------------------------------------------------
function winkelDialogOeffnen(feld){
 winkelZiel=feld||null;
 winkelRichtung="aus";
 const m=$("winkelModal"); if(!m)return;
 const jetzt=winkelZiel?winkelZahl(winkelZiel.value):null;
 const eAus=$("winkelEingabeAus"), eZu=$("winkelEingabeZu");
 if(eAus)eAus.value="";
 if(eZu)eZu.value=(jetzt===null?"":String(jetzt));
 m.hidden=false;
 winkelDialogZeichnen();
 if(eAus)setTimeout(()=>{try{eAus.focus()}catch(e){}},0);
}
function winkelDialogSchliessen(){
 const m=$("winkelModal"); if(m)m.hidden=true;
 winkelZiel=null;
}
function winkelUebernahmeHtml(g){
 if(!winkelZiel)return `<div class="winkel-wert">${g}°</div>`;
 return `<button type="button" class="winkel-uebernahme" data-winkel-nimm="${g}">${g}° übernehmen</button>`;
}
function winkelDialogZeichnen(){
 const box=$("winkelErgebnis"); if(!box)return;
 const zeileAus=$("winkelZeileAus"), zeileZu=$("winkelZeileZu");
 if(zeileAus)zeileAus.hidden=winkelRichtung!=="aus";
 if(zeileZu)zeileZu.hidden=winkelRichtung!=="zu";
 document.querySelectorAll("[data-winkel-richtung]").forEach(c=>{
  c.classList.toggle("aktiv",c.dataset.winkelRichtung===winkelRichtung);
 });
 const hin=$("winkelZielHinweis");
 if(hin){
  const jetzt=winkelZiel?winkelZahl(winkelZiel.value):null;
  hin.textContent=winkelZiel
   ?("Das Feld steht gerade auf "+(jetzt===null?"–":jetzt+"°")+".")
   :"Kein Feld ausgewählt – der Wert lässt sich hier nur ablesen.";
 }

 if(winkelRichtung==="aus"){
  const roh=$("winkelEingabeAus")?$("winkelEingabeAus").value:"";
  if(String(roh).trim()===""){
   box.innerHTML='<div class="small" style="color:var(--muted)">Das am Meter abgelesene Mass A in Zentimetern eingeben – die Tabelle deckt '
     +winkelCmText(WINKEL_CM_MIN)+' bis '+winkelCmText(WINKEL_CM_MAX)+' cm ab.</div>';
   return;
  }
  const r=winkelAusMeter(roh);
  if(r.fehler){box.innerHTML='<div class="ra-fehler">'+esc(r.fehler)+'</div>';return}
  box.innerHTML=`<div class="winkel-paar">
   <div class="winkel-feld"><div class="small">Gemessener Keil</div>${winkelUebernahmeHtml(r.grad)}</div>
   <div class="winkel-feld"><div class="small">Nachbarkeil</div>${winkelUebernahmeHtml(r.gegen)}</div>
  </div>
  <div class="small" style="margin-top:6px;color:var(--muted)">${r.genau
   ?"Zeile "+winkelCmText(winkelZahl(roh))+" cm der Tabelle: "+r.grad+"° / "+r.gegen+"°."
   :"Zwischen den Zeilen "+winkelCmText(r.unten.cm)+" cm ("+r.unten.grad+"°) und "
     +winkelCmText(r.oben.cm)+" cm ("+r.oben.grad+"°) – dazwischen wird gerade interpoliert."}</div>`;
  return;
 }

 const roh=$("winkelEingabeZu")?$("winkelEingabeZu").value:"";
 if(String(roh).trim()===""){
  box.innerHTML='<div class="small" style="color:var(--muted)">Den gewünschten Winkel in Grad eingeben – die Tabelle deckt '
    +WINKEL_GRAD_MIN+'° bis '+WINKEL_GRAD_MAX+'° ab, über den Nachbarkeil auch '
    +(180-WINKEL_GRAD_MAX)+'° bis '+(180-WINKEL_GRAD_MIN)+'°.</div>';
  return;
 }
 const r=winkelZuMeter(roh);
 if(r.fehler){box.innerHTML='<div class="ra-fehler">'+esc(r.fehler)+'</div>';return}
 const gr=Math.round(winkelZahl(roh));
 box.innerHTML=`<div class="winkel-paar">
   <div class="winkel-feld"><div class="small">Meter-Mass A</div><div class="winkel-wert">${winkelCmText(r.cm)} cm</div></div>
  </div>
  <div class="small" style="margin-top:6px;color:var(--muted)">${r.gemessen===gr
   ?"Den Meter auf "+winkelCmText(r.cm)+" cm stellen – er spannt dann "+gr+"° auf."
   :"Der Meter kann "+gr+"° nicht direkt aufspannen. Auf "+winkelCmText(r.cm)
     +" cm stellen: das ist der Nachbarkeil "+r.gemessen+"°, gegenüber liegt "+gr+"°."}</div>`;
}

// ---- Bedienung ------------------------------------------------------------
document.addEventListener("click",e=>{
 if(!e.target||!e.target.closest)return;

 const knopf=e.target.closest("[data-winkel-knopf]");
 if(knopf){
  e.preventDefault(); e.stopPropagation();
  const feld=knopf.previousElementSibling;
  winkelDialogOeffnen(feld&&feld.tagName==="INPUT"?feld:null);
  return;
 }
 const richtung=e.target.closest("[data-winkel-richtung]");
 if(richtung){winkelRichtung=richtung.dataset.winkelRichtung;winkelDialogZeichnen();return}

 const nimm=e.target.closest("[data-winkel-nimm]");
 if(nimm){
  const g=Number(nimm.dataset.winkelNimm);
  if(winkelZiel&&Number.isFinite(g)){
   winkelZiel.value=String(g);
   // Beide Ereignisse: die Module horchen teils auf input, teils auf change.
   winkelZiel.dispatchEvent(new Event("input",{bubbles:true}));
   winkelZiel.dispatchEvent(new Event("change",{bubbles:true}));
  }
  winkelDialogSchliessen();
  return;
 }
 if(e.target.closest("#winkelSchliessen")){winkelDialogSchliessen();return}
},true);

document.addEventListener("input",e=>{
 if(!e.target||!e.target.id)return;
 if(e.target.id==="winkelEingabeAus"||e.target.id==="winkelEingabeZu")winkelDialogZeichnen();
});

// ---- Beobachter -----------------------------------------------------------
// Die Fachmodule zeichnen ihre Tabellen laufend neu. Statt in elf Modulen je
// eine Zeile zu ergaenzen, sucht ein Beobachter die Felder - genau ein Frame
// nach der letzten Aenderung, damit ein Neuzeichnen nicht Frame fuer Frame
// nachgezogen wird.
(function winkelStarten(){
 if(typeof document==="undefined")return;
 let geplant=false;
 const nachziehen=()=>{
  if(geplant)return;
  geplant=true;
  requestAnimationFrame(()=>{geplant=false;winkelKnoepfeSetzen()});
 };
 const los=()=>{
  winkelKnoepfeSetzen();
  try{
   new MutationObserver(()=>{if(!winkelBaut)nachziehen()})
    .observe(document.body,{childList:true,subtree:true});
  }catch(e){/* ohne Beobachter bleiben die Knoepfe des ersten Aufbaus */}
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",los);
 else los();
})();
