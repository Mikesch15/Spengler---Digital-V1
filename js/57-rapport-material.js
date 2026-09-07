// ---------------------------------------------------------------------------
// v3.16  Material der Massaufnahme -> Regierapport
// ---------------------------------------------------------------------------
// Feedback 05.09.2026:
//   "Im regierapport sollte es einen button geben, um materialien aus den
//    massaufnahmen des passenden objekts direkt in den regierapport zu
//    uebernehmen. Hierzu ist evt. in den einzelnen massaufnahmen eine liste
//    noetig, um zusaetzliche materialien zu erfassen, welche nicht
//    automatisch erzeugt werden"
//
// Zwei Teile, ein Datenfeld:
//   1. In der Massaufnahme eine Liste "Material fuer den Regierapport" -
//      Zeilen mit EDV-Nr. aus dem BESTEHENDEN Katalog (settings.materials)
//      und Menge. Gespeichert in measurements.rapport_material.
//   2. Im Regierapport ein Knopf, der diese Zeilen der Massaufnahmen des
//      gewaehlten Projekts anbietet und die ausgewaehlten uebernimmt.
//
// ES ENTSTEHT KEIN ZWEITER MATERIALKATALOG: gesucht wird mit dem bestehenden
// searchMaterials() aus js/06, uebernommen wird als gewoehnliche Zeile
// {date,no,qty} - dieselbe Form, die auch der Blechverbrauch seit je in
// mats schiebt. Preis, Bezeichnung, Dim. und Einheit kommen wie bei jeder
// anderen Zeile aus dem Katalog, es wird nichts mitkopiert.
//
// WARUM KEINE PREISE IN DER MASSAUFNAHME: die Massaufnahme haelt fest, WAS
// und WIE VIEL gebraucht wird. Was es kostet, entscheidet der Katalog zum
// Zeitpunkt des Rapports - ein mitgespeicherter Preis wuerde veralten.
"use strict";

let measRapportMaterial=[];        // Zeilen der offenen Massaufnahme
let rmatZeichnet=false;            // Sperre gegen das change beim Neuzeichnen

// ---- Liste in der Massaufnahme -------------------------------------------
function rmatZahl(v){return Number(String(v==null?"":v).replace(",","."))||0}

function measRapportMaterialZuruecksetzen(){
 measRapportMaterial=[];
 renderMeasRapportMaterial();
}
// Aus einem geladenen Datensatz. Es wird NICHTS erfunden: eine Aufnahme ohne
// die Spalte (vor v3.16 gespeichert) hat eine leere Liste.
function measRapportMaterialFuellen(m){
 const roh=(m&&Array.isArray(m.rapport_material))?m.rapport_material:[];
 measRapportMaterial=roh.map(z=>({no:String(z&&z.no!=null?z.no:""),qty:z&&z.qty!=null?z.qty:0}));
 renderMeasRapportMaterial();
}
// Fuer den Speicher-Payload. Leere Zeilen (weder Nummer noch Menge) fallen
// weg - sie waeren im Rapport nicht uebernehmbar.
function measRapportMaterialAusFormular(){
 return measRapportMaterial
  .filter(z=>String(z.no||"").trim()!=="")
  .map(z=>({no:String(z.no).trim(),qty:rmatZahl(z.qty)}));
}

function renderMeasRapportMaterial(){
 const box=$("measRapportMaterialBody");
 if(!box)return;
 rmatZeichnet=true;
 box.innerHTML=measRapportMaterial.length?measRapportMaterial.map((z,i)=>{
  const x=(typeof materialFor==="function")?materialFor(z.no):null;
  const text=x?`${esc(x[1])}${x[2]?" · "+esc(x[2]):""}${x[3]?" · "+esc(x[3]):""}`
   :(String(z.no||"").trim()?'<span class="rmat-unbekannt">Diese EDV-Nr. steht nicht im Katalog.</span>':"—");
  return `<div class="rmat-zeile">
   <div class="rmat-nr"><div class="search">
    <input data-rmat-nr="${i}" value="${esc(z.no)}" placeholder="EDV-Nr." autocomplete="off">
    <div id="rmatSug${i}" class="suggest"></div></div></div>
   <div class="rmat-text">${text}</div>
   <div class="rmat-menge"><input data-rmat-qty="${i}" type="number" step=".01" min="0" value="${esc(z.qty)}" placeholder="Menge"></div>
   <button type="button" class="red" data-rmat-weg="${i}" title="Zeile entfernen">×</button>
  </div>`;
 }).join(""):'<div class="small">Noch kein Material erfasst. Was hier steht, lässt sich im Regierapport dieses Projekts mit einem Knopf übernehmen.</div>';
 rmatZeichnet=false;
}

if($("measRapportMaterialBody")){
 $("measRapportMaterialBody").addEventListener("input",e=>{
  if(rmatZeichnet)return;
  const nr=e.target.dataset.rmatNr, qty=e.target.dataset.rmatQty;
  if(nr!==undefined){
   const i=Number(nr);
   measRapportMaterial[i].no=e.target.value;
   isDirty=true;
   // Vorschlagsliste wie in der Materialzeile des Rapports - derselbe
   // Katalog, dieselbe Funktion. Die Tabelle wird dabei NICHT neu
   // gezeichnet, sonst verliert das Feld beim Tippen den Fokus
   // (CLAUDE.md 66.1).
   const sug=$("rmatSug"+i);
   if(sug&&typeof searchMaterials==="function"){
    sug.innerHTML=searchMaterials(e.target.value).map(x=>
     `<div class="item" data-rmat-pick="${i}" data-no="${esc(x[0])}"><b>${esc(x[0])} · ${esc(x[1])}</b><span>${esc(x[2])} · ${esc(x[3])}</span></div>`).join("");
    if(sug.innerHTML&&typeof positionSuggest==="function")positionSuggest(e.target,sug);
   }
   return;
  }
  if(qty!==undefined){measRapportMaterial[Number(qty)].qty=e.target.value;isDirty=true}
 });
 // Die Vorschlagsliste steht ueber der Zeile und wuerde sonst das Mengenfeld
 // verdecken: der globale "ausserhalb geklickt"-Schliesser in js/07 greift
 // nicht, weil der Klick dann die Liste selbst trifft. Im Browser gemessen.
 // Die kurze Frist laesst einen Klick auf einen Vorschlag zuerst durch.
 $("measRapportMaterialBody").addEventListener("focusout",e=>{
  if(e.target.dataset&&e.target.dataset.rmatNr!==undefined){
   const box=$("rmatSug"+e.target.dataset.rmatNr);
   if(box)setTimeout(()=>{box.innerHTML=""},150);
  }
 });
 // Erst beim Verlassen des Feldes neu zeichnen - dann steht die Bezeichnung
 // aus dem Katalog daneben.
 $("measRapportMaterialBody").addEventListener("change",e=>{
  if(rmatZeichnet)return;
  if(e.target.dataset.rmatNr!==undefined)renderMeasRapportMaterial();
 });
 $("measRapportMaterialBody").addEventListener("click",e=>{
  const pick=e.target.closest?e.target.closest("[data-rmat-pick]"):null;
  if(pick){
   measRapportMaterial[Number(pick.dataset.rmatPick)].no=pick.dataset.no;
   isDirty=true; renderMeasRapportMaterial(); return;
  }
  const weg=e.target.closest?e.target.closest("[data-rmat-weg]"):null;
  if(weg){measRapportMaterial.splice(Number(weg.dataset.rmatWeg),1);isDirty=true;renderMeasRapportMaterial()}
 });
}
if($("measRapportMaterialAdd")){
 $("measRapportMaterialAdd").onclick=()=>{
  measRapportMaterial.push({no:"",qty:""});
  isDirty=true;
  renderMeasRapportMaterial();
 };
}

// ---- Uebernahme in den Regierapport ---------------------------------------
let rmatAngebot=[];                // [{mid,titel,no,qty,schon}]
let rmatAuswahl=new Set();

function rmatArtText(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=String(m.title||"").trim();
 return art+(t?" · "+t:"");
}
// Steht diese EDV-Nr. schon im offenen Rapport? Dann wird sie NICHT
// vorgewaehlt - sonst waere sie nach einem zweiten Klick doppelt drin.
function rmatSchonImRapport(no){
 const zeilen=(typeof mats!=="undefined"&&mats)?mats:[];
 return zeilen.some(m=>String(m&&m.no!=null?m.no:"").trim()===String(no).trim());
}

async function rmatOeffnen(){
 if(!currentProjectId){
  alert("Bitte zuerst ein Projekt auswählen.\n\nÜbernommen wird das Material der Massaufnahmen genau dieses Projekts.");
  return;
 }
 if(typeof wsIstOffline==="function"&&wsIstOffline()){
  alert("Keine Verbindung.\n\nDie Massaufnahmen dieses Projekts lassen sich deshalb gerade nicht laden. "
   +"Material von Hand erfassen geht weiterhin.");
  return;
 }
 $("rmatModal").hidden=false;
 $("rmatListe").innerHTML='<div class="small">Wird geladen …</div>';
 $("rmatUebernehmenBtn").disabled=true;
 // Eine Abfrage. KEIN company_id-Filter im Client - die Firmengrenze
 // erzwingt allein die restriktive tenant_boundary_measurements.
 // v3.24: data kommt mit - daraus lesen rmatZuschnittFlaeche() und
 // rmatTeileZeilen() den GESPEICHERTEN Zuschnittplan und das Ausmass. Ohne
 // data blieben beide leer, und der Dialog boete wie bis v3.23 nur die von
 // Hand erfassten Zeilen an (derselbe Fehler wie in der Werkstatt, 126.2).
 const {data,error}=await sb.from("measurements")
  .select("id,type,title,date,rapport_material,data")
  .eq("project_id",currentProjectId)
  .order("date",{ascending:true});
 if(error){
  $("rmatListe").innerHTML=`<div class="small" style="color:var(--red)">Die Massaufnahmen konnten nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 const aufnahmen=data||[];
 rmatAngebot=[]; rmatAuswahl=new Set();
 aufnahmen.forEach(m=>{
  // 1. Von Hand erfasst (v3.16) - die EDV-Nr. steht bereits fest.
  (Array.isArray(m.rapport_material)?m.rapport_material:[]).forEach((z,k)=>{
   const no=String(z&&z.no!=null?z.no:"").trim();
   if(!no)return;
   const id=m.id+"-e"+k;
   const schon=rmatSchonImRapport(no);
   const x=(typeof materialFor==="function")?materialFor(no):null;
   rmatAngebot.push({id,art:"erfasst",mid:m.id,datum:m.date||"",titel:rmatArtText(m),
    bez:x?x[1]:no, menge:rmatZahl(z.qty), einheit:x?x[3]:"",
    no, qty:z.qty, vorschlaege:[], sicher:true, schon});
   if(!schon)rmatAuswahl.add(id);
  });
  // 2. Die gerechneten Blechzuschnitte als Flaeche.
  const zu=rmatZuschnittFlaeche(m);
  if(zu&&zu.qm>0){
   const mat=rmatMatName(m);
   const brutto=rmatRollenFlaeche(m);
   const e=rmatEintrag(m,"blech",m.id+"-z","Blech"+(mat?" "+mat:""),zu.qm,"m²",
    {stueck:zu.stueck,ohneBreite:zu.ohneBreite,netto:zu.qm,brutto,basis:"netto"});
   rmatAngebot.push(e);
   if(e.sicher&&!e.schon)rmatAuswahl.add(e.id);
  }
  // 3. Halbfabrikate - bei einer Rinne jede Komponente (js/28 setzt dort
  //    teil:true), sonst Halteblech, Schieber, Bleilappen und dergleichen.
  rmatTeileZeilen(m).forEach(t=>{
   const e=rmatEintrag(m,"teil",m.id+"-t"+t.k,t.bezeichnung,t.menge,t.einheit,
    {herkunft:t.herkunft,unsicher:t.unsicher});
   rmatAngebot.push(e);
   if(e.sicher&&!e.schon)rmatAuswahl.add(e.id);
  });
 });
 renderRmatListe(aufnahmen);
}

const RMAT_ART_TITEL={erfasst:"Von Hand erfasst",blech:"Blechzuschnitte",teil:"Halbfabrikate und Teile"};

function rmatMengeText(a){
 const z=Number(a.menge);
 const t=Number.isFinite(z)?(Math.round(z*100)/100).toString().replace(".",","):String(a.menge);
 return t+(a.einheit?" "+a.einheit:"");
}
// Die Auswahl der Position. Immer sichtbar, immer aenderbar - auch dort, wo
// die App sich sicher ist. Ganz unten steht IMMER die freie Position: so
// geht keine Zeile verloren, nur weil der Katalog sie nicht kennt, und es
// wird trotzdem keine Katalognummer erfunden (CLAUDE.md 121.10).
function rmatPositionHtml(a){
 if(a.art==="erfasst"){
  const x=(typeof materialFor==="function")?materialFor(a.no):null;
  return `<div class="rmat-pos-fest">${esc(a.no)}${x?" · "+esc(x[1]):
    ' · <span class="rmat-unbekannt">steht nicht im Katalog</span>'}</div>`;
 }
 const opt=a.vorschlaege.map(v=>
  `<option value="${esc(v.no)}"${v.no===a.no?" selected":""}>${esc(v.no)} · ${esc(v.name)}${
    v.dim?" · "+esc(v.dim):""}${v.einheit?" · "+esc(v.einheit):""}</option>`).join("");
 const frei=`<option value="__frei"${a.no==="__frei"?" selected":""}>Freie Position – Bezeichnung wird übernommen</option>`;
 const hinweis=a.vorschlaege.length
  ?(a.sicher
    ?`<span class="rmat-sicher">✓ Vorschlag der App${a.vorschlaege[0].gruende.length?" – "+esc(a.vorschlaege[0].gruende.join(", ")):""}</span>`
    :`<span class="rmat-unsicher">Vorschlag – bitte prüfen</span>`)
  :`<span class="rmat-unsicher">Keine passende Position im Katalog gefunden – geht als freie Position.</span>`;
 return `<div class="rmat-pos">
  <select data-rmat-pos="${esc(a.id)}">${opt}${frei}</select>
  ${hinweis}
 </div>`;
}
// Beim Blech: netto (Summe der Zuschnitte) oder brutto (ab Rolle, mit
// Verschnitt). Beide Zahlen stehen im gespeicherten Plan - die App waehlt
// NICHT still eine Abrechnungsgrundlage, sie zeigt beide.
function rmatBasisHtml(a){
 if(a.art!=="blech"||!a.brutto)return "";
 return `<div class="rmat-basis">
  <label><input type="radio" name="rmatBasis${esc(a.id)}" data-rmat-basis="${esc(a.id)}" value="netto"${a.basis!=="brutto"?" checked":""}> Zuschnitte ${esc(rmatQm(a.netto))} m²</label>
  <label><input type="radio" name="rmatBasis${esc(a.id)}" data-rmat-basis="${esc(a.id)}" value="brutto"${a.basis==="brutto"?" checked":""}> ab Rolle ${esc(rmatQm(a.brutto))} m² (mit Verschnitt)</label>
 </div>`;
}
function rmatQm(z){return (Math.round(Number(z)*100)/100).toString().replace(".",",")}

function renderRmatListe(aufnahmen){
 const box=$("rmatListe");
 if(!box)return;
 if(!aufnahmen.length){
  box.innerHTML='<div class="small">Zu diesem Projekt gibt es noch keine Massaufnahme.</div>';
  rmatKnopfStand(); return;
 }
 box.innerHTML=aufnahmen.map(m=>{
  const zeilen=rmatAngebot.filter(a=>a.mid===m.id);
  if(!zeilen.length){
   return `<div class="rmat-gruppe">
    <div class="rmat-gruppe-kopf">${esc(rmatArtText(m))}</div>
    <div class="small">Kein Material, kein gespeicherter Zuschnitt und kein Ausmass. In der Massaufnahme unter „Material für den Regierapport“ eintragen.</div>
   </div>`;
  }
  const bloecke=["erfasst","blech","teil"].map(art=>{
   const z=zeilen.filter(a=>a.art===art);
   if(!z.length)return "";
   return `<div class="rmat-art">${esc(RMAT_ART_TITEL[art])}</div>`+z.map(a=>`
    <div class="rmat-wahl-block">
     <label class="rmat-wahl">
      <input type="checkbox" data-rmat-wahl="${esc(a.id)}"${rmatAuswahl.has(a.id)?" checked":""}>
      <span class="rmat-wahl-text"><b>${esc(a.bez)}</b>
       <span class="small">${esc(rmatMengeText(a))}${
        a.art==="blech"?" · "+a.stueck+" Zuschnitt"+(a.stueck===1?"":"e"):""}${
        a.unsicher?" · <span class=\"rmat-unsicher\">Art unbekannt – bitte prüfen</span>":""}${
        a.schon?' · <span class="rmat-schon">steht bereits im Rapport</span>':""}</span></span>
     </label>
     ${rmatBasisHtml(a)}
     ${rmatPositionHtml(a)}
    </div>`).join("");
  }).join("");
  return `<div class="rmat-gruppe">
   <div class="rmat-gruppe-kopf">${esc(rmatArtText(m))}</div>
   ${bloecke}
  </div>`;
 }).join("");
 rmatKnopfStand();
}
// Die Zahl am Knopf ist die Zahl der Zeilen, die er wirklich uebernimmt.
// Steht dort 0, ist er gesperrt - man drueckt nie ins Leere.
function rmatKnopfStand(){
 const b=$("rmatUebernehmenBtn");
 if(!b)return;
 const n=rmatAuswahl.size;
 b.textContent="✓ Ausgewählte übernehmen ("+n+")";
 b.disabled=n===0;
}

function rmatFinde(id){return rmatAngebot.find(a=>a.id===id)}
if($("rmatListe")){
 $("rmatListe").addEventListener("change",e=>{
  const k=e.target.closest?e.target.closest("[data-rmat-wahl]"):null;
  if(k){
   if(k.checked)rmatAuswahl.add(k.dataset.rmatWahl); else rmatAuswahl.delete(k.dataset.rmatWahl);
   rmatKnopfStand(); return;
  }
  // Position gewaehlt. Die Liste wird dabei NICHT neu gezeichnet - sonst
  // verliert das Auswahlfeld den Fokus und die uebrigen Haken springen
  // (CLAUDE.md 66.1). Nachgefuehrt wird nur, was sich wirklich aendert.
  const pos=e.target.closest?e.target.closest("[data-rmat-pos]"):null;
  if(pos){
   const a=rmatFinde(pos.dataset.rmatPos);
   if(a){a.no=pos.value; a.schon=a.no!=="__frei"&&rmatSchonImRapport(a.no)}
   rmatKnopfStand(); return;
  }
  const bas=e.target.closest?e.target.closest("[data-rmat-basis]"):null;
  if(bas&&bas.checked){
   const a=rmatFinde(bas.dataset.rmatBasis);
   if(a){a.basis=bas.value; a.menge=bas.value==="brutto"?a.brutto:a.netto}
   return;
  }
 });
}
if($("rmatAlle")){
 $("rmatAlle").onclick=()=>{rmatAngebot.forEach(a=>rmatAuswahl.add(a.id));
  document.querySelectorAll("[data-rmat-wahl]").forEach(k=>k.checked=true);rmatKnopfStand()};
}
if($("rmatKeine")){
 $("rmatKeine").onclick=()=>{rmatAuswahl.clear();
  document.querySelectorAll("[data-rmat-wahl]").forEach(k=>k.checked=false);rmatKnopfStand()};
}
if($("rmatUebernehmenBtn")){
 $("rmatUebernehmenBtn").onclick=()=>{
  const gewaehlt=rmatAngebot.filter(a=>rmatAuswahl.has(a.id));
  if(!gewaehlt.length)return;
  // Datum der Zeile: das der Massaufnahme (dort wurde das Material
  // gebraucht), sonst das Rapportdatum, sonst heute. Es wird keines
  // erfunden, das es nicht gibt.
  const heute=new Date().toISOString().slice(0,10);
  const rapportDatum=($("date")&&$("date").value)||"";
  let frei=0;
  gewaehlt.forEach(a=>{
   const datum=a.datum||rapportDatum||heute;
   const menge=a.art==="erfasst"?rmatZahl(a.qty):Number(a.menge)||0;
   if(a.no&&a.no!=="__frei"){
    mats.push({date:datum,no:a.no,qty:menge});
    return;
   }
   // Keine passende Katalogposition: freie Nummer 999.9x mit der
   // Bezeichnung der Massaufnahme. Es wird KEINE Katalognummer erfunden,
   // und die Zeile geht auch nicht verloren. naechsteFreiePositionNr()
   // liest mats - jede weitere Zeile bekommt deshalb die naechste Nummer.
   const nr=(typeof naechsteFreiePositionNr==="function")?naechsteFreiePositionNr():"999.99";
   mats.push({date:datum,no:nr,qty:menge,desc:a.bez,dim:"",unit:a.einheit||"",price:0});
   frei++;
  });
  isDirty=true;
  renderMain();
  $("rmatModal").hidden=true;
  alert((gewaehlt.length===1?"1 Materialposition übernommen.":gewaehlt.length+" Materialpositionen übernommen.")
   +(frei?"\n\n"+(frei===1?"1 davon steht als freie Position (999.9x) im Rapport – dort noch den Preis eintragen."
     :frei+" davon stehen als freie Position (999.9x) im Rapport – dort noch die Preise eintragen."):""));
 };
}
if($("rmatOeffnen"))$("rmatOeffnen").onclick=rmatOeffnen;
if($("rmatSchliessen"))$("rmatSchliessen").onclick=()=>{$("rmatModal").hidden=true};

// ---------------------------------------------------------------------------
// v3.24  Blechzuschnitte und Halbfabrikate uebernehmen
// ---------------------------------------------------------------------------
// Feedback 07.09.2026:
//   "im regierapport, material aus massaufnahme uebernehnen. dort muessen
//    auch die berechneten blechzuschnitte und bei rinnen, die halbfabrikate
//    uebernommen werden koennen. falls dies nicht automatisch geht weil es
//    nicht zugeordnet werden kann, muss ein vorschlag von der app kommen zu
//    welcher position die materialie zugeordnet werden sollen"
//
// Bis v3.23 bot der Dialog NUR die von Hand erfassten Zeilen an, weil eine
// gerechnete Position keine EDV-Nr. hat (CLAUDE.md 121.10: "eine erfundene
// waere schlechter als keine"). Das bleibt richtig - erfunden wird weiterhin
// keine. Neu ist der dritte Weg: die App SCHLAEGT eine Position aus dem
// bestehenden Katalog vor, und wo sie sich nicht sicher ist, sagt sie das
// und waehlt nichts vor. Findet sie gar nichts, geht die Zeile als freie
// Position (999.9x) mit ihrer Bezeichnung - dieselbe Mechanik wie seit
// v2.66 fuer alles, was nicht im Katalog steht.
//
// ES WIRD NICHTS NEU GERECHNET. Die Zuschnitte kommen aus pmatStuecke(),
// die Halbfabrikate aus data.ausmass mit pmatTeilVon() - dieselben zwei
// Quellen, aus denen auch die Reservierung und die Werkstatt lesen.

// Einheiten in Klassen. Der Katalog schreibt "m1"/"St"/"m²", die Module
// "m"/"Stk."/"m²" - dasselbe gemeint, andere Schreibweise.
function rmatEinheitKlasse(e){
 const t=String(e==null?"":e).toLowerCase().replace(/[\s.]/g,"");
 if(!t)return "";
 if(t==="m"||t==="m1"||t==="lfm"||t==="mtr")return "laenge";
 if(t==="m2"||t==="m²"||t==="qm")return "flaeche";
 if(t==="st"||t==="stk"||t==="stck"||t==="stueck"||t==="stück"||t==="x")return "stueck";
 if(t==="kg")return "gewicht";
 if(t==="h"||t==="std")return "zeit";
 return t;
}
// Woerter fuer den Vergleich: klein, Umlaute gefaltet, Zahlen und kurze
// Fuellwoerter weg. Gefaltet wird NUR zum Vergleichen - angezeigt wird
// immer der Originaltext.
function rmatWoerter(s){
 return String(s==null?"":s).toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!/^\d+$/.test(w));
}
// Zahlen (Masse) aus einem Text, z. B. "Rinne halbrund 330 mm" -> [330].
function rmatZahlen(s){
 const raus=[];
 String(s==null?"":s).replace(/\d+(?:[.,]\d+)?/g,t=>{
  const z=Number(t.replace(",","."));
  if(Number.isFinite(z))raus.push(z);
  return t;
 });
 return raus;
}
// Gemeinsamer Wortstamm: deutsche Komposita treffen sich vorn oder hinten
// ("Innenwinkel"/"Rinnenwinkel", "Dehnungsstueck"/"Dehnungselement").
function rmatStamm(a,b){
 if(a===b)return a.length;
 let v=0; while(v<a.length&&v<b.length&&a[v]===b[v])v++;
 let h=0; while(h<a.length-v&&h<b.length-v&&a[a.length-1-h]===b[b.length-1-h])h++;
 return Math.max(v,h);
}
// Die bekannten Materialnamen der Massaufnahme, gefaltet - damit ein
// Kupfer-Bauteil nicht die Titanzink-Zeile des Katalogs vorschlaegt.
function rmatMaterialWoerter(){
 const liste=(typeof measurementMaterials!=="undefined"&&measurementMaterials)?measurementMaterials:[];
 const raus=[];
 liste.forEach(m=>rmatWoerter(m.name).forEach(w=>{if(raus.indexOf(w)<0)raus.push(w)}));
 // Auch die Schreibweisen des Katalogs, die kein Massaufnahme-Material ist.
 ["stahl","aluminium","messing","blei"].forEach(w=>{if(raus.indexOf(w)<0)raus.push(w)});
 return raus;
}

// Bewertung einer Katalogzeile fuer eine gerechnete Position.
//   einheit  ist ein HARTER Filter: eine Zeile in der falschen Einheit
//            waere die falsche Menge, nicht nur der falsche Name.
//   dim      ist das staerkste Signal - die Module tragen die Groesse in
//            der Bezeichnung ("330 mm"), der Katalog in dim.
//   material entscheidet zwischen sonst gleichen Zeilen.
const RMAT_SICHER=50;        // ab hier waehlt die App vor
const RMAT_ZEIGEN=20;        // ab hier wird ueberhaupt vorgeschlagen
const RMAT_VORSPRUNG=15;     // so viel muss der Beste vor dem Zweiten liegen

function rmatBewerte(x,bez,einheit,matName,matWoerter){
 const kName=String(x[1]||""), kDim=String(x[2]||"");
 if(rmatEinheitKlasse(x[3])!==rmatEinheitKlasse(einheit))return null;
 const kW=rmatWoerter(kName);
 const bW=rmatWoerter(bez);
 const meins=rmatWoerter(matName||"");
 // ---- Der NAME ist die Bedingung, nicht der Bonus -------------------------
 // Gemessen (07.09.2026): ohne diese Regel gewann "Rinnenhalter Kupfer" bei
 // Innenwinkel, Schiebestutzen, Rinnenboden und Dehnungsstueck - Groesse und
 // Material allein ergaben schon genug Punkte. Eine Katalogzeile, deren NAME
 // nichts mit der Position zu tun hat, ist deshalb gar kein Kandidat.
 let wp=0, langerTreffer=false, vollTreffer=false;
 const getroffen=new Set();
 bW.forEach(w=>{
  if(meins.indexOf(w)>=0||matWoerter.indexOf(w)>=0)return;   // Material zaehlt unten
  let best=0, bestK=null;
  kW.forEach(k=>{
   let ue=0;
   if(k.indexOf(w)>=0||w.indexOf(k)>=0)ue=Math.min(k.length,w.length);
   else if(rmatStamm(k,w)>=5)ue=-1;                          // nur Wortstamm
   if(ue===-1&&best===0){best=-1;bestK=k}
   else if(ue>0&&ue>best){best=ue;bestK=k}
  });
  if(best>0){
   wp+=Math.min(18,8+Math.max(0,best-6));
   vollTreffer=true;
   if(best>=8)langerTreffer=true;
   getroffen.add(bestK);
  }else if(best===-1){wp+=8;getroffen.add(bestK)}
 });
 if(wp===0)return null;
 let p=Math.min(48,wp);
 const gruende=[];
 // Ein langes, unbenutztes Wort im Katalognamen spricht GEGEN die Zeile:
 // "Rinnen-Dehnungselement" ist kein "Rinnenboden", auch wenn beide mit
 // "Rinnen" beginnen.
 kW.forEach(k=>{
  if(getroffen.has(k))return;
  if(matWoerter.indexOf(k)>=0||meins.indexOf(k)>=0)return;
  if(/^(alle|material|materialien|gerade|norm|divers)$/.test(k))return;
  p-=Math.min(20,Math.max(0,k.length-4));
 });
 // Dimension - die Module tragen die Groesse in der Bezeichnung ("330 mm"),
 // der Katalog in dim.
 const zBez=rmatZahlen(bez), zDim=rmatZahlen(kDim);
 const dimAlle=/alle|norm|divers/i.test(kDim)||!kDim.trim();
 if(zBez.length&&zDim.length){
  if(zDim.some(d=>zBez.indexOf(d)>=0)){p+=30;gruende.push("Grösse "+kDim)}
  else p-=15;
 }else if(dimAlle)p+=5;
 // Material der Massaufnahme
 const fremd=matWoerter.some(w=>meins.indexOf(w)<0&&kW.some(k=>k===w||k.indexOf(w)>=0));
 if(meins.length&&meins.some(w=>kW.some(k=>k.indexOf(w)>=0||w.indexOf(k)>=0))){
  p+=25;gruende.push(matName);
 }else if(/alle\s*material/i.test(kName)){p+=10;gruende.push("alle Materialien")}
 else if(fremd&&meins.length)p-=25;
 return {no:x[0],name:kName,dim:kDim,einheit:x[3],punkte:p,gruende,langerTreffer,vollTreffer};
}
// Bis zu drei Vorschlaege, bester zuerst. Ein leerer Katalog oder eine
// Einheit, die es dort nicht gibt, ergibt eine leere Liste - dann bleibt
// die freie Position.
function rmatVorschlaege(bez,einheit,matName){
 const kat=(typeof settings!=="undefined"&&settings&&settings.materials)?settings.materials:[];
 const mw=rmatMaterialWoerter();
 const bewertet=[];
 kat.forEach(x=>{
  const b=rmatBewerte(x,bez,einheit,matName,mw);
  if(b&&b.punkte>=RMAT_ZEIGEN)bewertet.push(b);
 });
 // Der NAME entscheidet zuerst: eine Zeile mit einem ganzen gemeinsamen
 // Wort ("Rinnenboden") steht IMMER vor einer, die nur einen Wortstamm
 // teilt ("Rinnen|halter"). Gemessen: sonst zieht der Materialbonus die
 // falsche Zeile nach oben.
 bewertet.sort((a,b)=>(b.vollTreffer?1:0)-(a.vollTreffer?1:0)
   ||b.punkte-a.punkte||String(a.no).localeCompare(String(b.no)));
 return bewertet.slice(0,3);
}
// Sicher ist ein Vorschlag nur, wenn er deutlich fuehrt. Sonst schlaegt die
// App ihn vor, waehlt ihn aber NICHT vor - die Entscheidung bleibt beim
// Menschen (Auftrag: "muss ein vorschlag von der app kommen").
function rmatIstSicher(liste){
 if(!liste||!liste.length)return false;
 if(liste[0].punkte<RMAT_SICHER)return false;
 // Ein langes, ganzes Wort muss uebereinstimmen ("Rinnenhalter",
 // "Einhaengestutzen"). Ein blosser Wortstamm ("Innenwinkel" /
 // "Rinnenwinkel") reicht nicht - dort schlaegt die App vor, statt zu
 // behaupten.
 if(!liste[0].langerTreffer)return false;
 return liste.length===1||(liste[0].punkte-liste[1].punkte)>=RMAT_VORSPRUNG;
}

// ---- Was eine Massaufnahme an gerechnetem Material hergibt ----------------
// Die Blechflaeche der Zuschnitte: Summe Laenge x Breite ueber die
// gespeicherten Stuecke. Genau das, was der Blechverbrauch-Dialog seit je
// von Hand rechnet (l x b x Anzahl / 1'000'000, js/08) - nur aus dem
// gespeicherten Plan statt aus getippten Massen. Quelle ist pmatStuecke(),
// es wird nichts neu gerechnet.
function rmatZuschnittFlaeche(m){
 if(typeof pmatStuecke!=="function")return null;
 const st=pmatStuecke(m);
 if(!st.length)return null;
 let qm=0, ohneBreite=0;
 st.forEach(s=>{
  const b=Number(s.breite);
  if(!Number.isFinite(b)||b<=0){ohneBreite++;return}
  qm+=(Number(s.laenge)||0)*b/1000000;
 });
 return {qm:Math.round(qm*1000)/1000,stueck:st.length,ohneBreite};
}
// Die Bruttoflaeche ab Rolle aus demselben gespeicherten Plan - inklusive
// Verschnitt. Nur wenn sie dort steht; sie wird NICHT nachgerechnet.
function rmatRollenFlaeche(m){
 const r=(typeof pmatPlanRoh==="function")?pmatPlanRoh(m):null;
 if(!r)return null;
 const b=(r.bestes&&r.bestes.flaeche!==undefined)?r.bestes
        :((Array.isArray(r.moeglich)&&r.moeglich[0])||null);
 const f=b?Number(b.flaeche):NaN;
 return Number.isFinite(f)&&f>0?Math.round(f*1000)/1000:null;
}
// Die Halbfabrikate einer Massaufnahme: die Ausmass-Zeilen, die das Modul
// selbst als Teil ausweist. DIESELBE Regel wie die Reservierung
// (resvBedarfZeilen, js/50): nur ein ausdrueckliches teil:false faellt weg,
// reiner Text ohne Zahl ebenfalls - eine Rapportzeile braucht eine Menge.
function rmatTeileZeilen(m){
 const d=(m&&m.data)||{};
 const raus=[];
 (Array.isArray(d.ausmass)?d.ausmass:[]).forEach((z,k)=>{
  const bez=String(z&&z.bezeichnung||"").trim();
  if(!bez)return;
  const teil=(typeof pmatTeilVon==="function")?pmatTeilVon(m,z):undefined;
  if(teil===false)return;
  const menge=(typeof pmatZahl==="function")?pmatZahl(z.menge):null;
  if(menge===null)return;
  raus.push({k,bezeichnung:bez,menge,einheit:String(z.einheit||"").trim(),
   herkunft:String(z.herkunft||""),unsicher:teil!==true});
 });
 return raus;
}
function rmatMatName(m){
 const d=(m&&m.data)||{};
 if(typeof pmatMaterialName!=="function")return "";
 const n=pmatMaterialName(d.material);
 return n==="Ohne Material"?"":n;
}
// Eine Zeile des Angebots aufbauen und dabei die Position vorschlagen.
function rmatEintrag(m,art,id,bez,menge,einheit,zusatz){
 const matName=rmatMatName(m);
 const v=rmatVorschlaege(bez,einheit,matName);
 const sicher=rmatIstSicher(v);
 return Object.assign({
  id,art,mid:m.id,datum:m.date||"",titel:rmatArtText(m),
  bez,menge,einheit,matName,
  vorschlaege:v, sicher,
  no:v.length?v[0].no:"",          // Vorschlag steht im Feld, auch unsicher
  schon:v.length?rmatSchonImRapport(v[0].no):false
 },zusatz||{});
}
