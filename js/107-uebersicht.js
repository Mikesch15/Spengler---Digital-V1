"use strict";
// ===========================================================================
// Übersichtlicher (v3.426)
// ===========================================================================
// Ansage des Anwenders: "Die App ist mit sehr vielen unübersichtlichen
// Funktionen überfüllt." Hier steht, was die Oberfläche aufräumt, ohne eine
// Funktion zu entfernen:
//   1. Suche in den Einstellungen (alle Register auf einmal durchsuchen)
//   2. Funktionen & Ansicht der Firma: je Massaufnahme-Art und Werkzeug
//      "für alle", "nur Administratoren" oder "ausgeblendet". Ausgeblendet
//      heisst NUR nicht angeboten - bestehende Massaufnahmen öffnen weiter.
//      Gespeichert firmenweit wie die Einstellungen der Arten (js/98).
//   3. Lange Erklärtexte in den Massaufnahmen gekürzt, ein Tipp klappt auf.
// Die Rechte bleiben unverändert: die Datenbank (RLS) entscheidet, was
// jemand darf; hier wird nur entschieden, was angeboten wird.
// ===========================================================================

const UEB_SCHLUESSEL="sd_firmaAnsicht";
const UEB_STUFEN=Object.freeze([["alle","für alle"],["admin","nur Administratoren"],["aus","ausgeblendet"]]);
// Werkzeuge und Bereiche unter «Mehr», die die Firma ein- und ausblenden kann
const UEB_WERKZEUGE=Object.freeze([
 ["abwicklung","📐 Abwicklung"],["zuschnittrechner","✂️ Zuschnittrechner"],["zaehlwerk","📊 Was die App gelernt hat"]
]);

function uebLaden(){
 let w=null;
 try{w=JSON.parse(localStorage.getItem(UEB_SCHLUESSEL)||"null")}catch(e){}
 const sauber=o=>{const r={};if(o&&typeof o==="object")Object.keys(o).forEach(k=>{if(UEB_STUFEN.some(s=>s[0]===o[k]))r[k]=o[k]});return r};
 return {arten:sauber(w&&w.arten),werkzeuge:sauber(w&&w.werkzeuge)};
}
let uebAnsicht=uebLaden();

function uebIstAdmin(){return typeof isAdmin==="function"&&!!isAdmin()}
function uebStufeSichtbar(stufe){return stufe==="aus"?false:(stufe==="admin"?uebIstAdmin():true)}
function uebArtSichtbar(art){return uebStufeSichtbar(uebAnsicht.arten[art]||"alle")}
// Fuer js/70 (Mehr): Eintraege, die nicht in der Liste stehen, sind immer sichtbar
function uebEintragSichtbar(id){
 if(!UEB_WERKZEUGE.some(w=>w[0]===id))return true;
 return uebStufeSichtbar(uebAnsicht.werkzeuge[id]||"alle");
}
// Nach renderMeasTypeChooser (js/01): ausgeblendete Arten aus der Auswahl nehmen.
// Es wird nur VERSTECKT, nie eingeblendet - was applyModuleTest() versteckt, bleibt versteckt.
function uebAnsichtAnwenden(){
 document.querySelectorAll("[data-choose-meas-type]").forEach(b=>{
  if(!uebArtSichtbar(b.dataset.chooseMeasType))b.hidden=true;
 });
 document.querySelectorAll('#measTypeChooserBody .settings-section[data-section^="meastype-"]').forEach(sec=>{
  const knoepfe=Array.from(sec.querySelectorAll("[data-choose-meas-type]"));
  sec.hidden=knoepfe.length>0&&knoepfe.every(b=>b.hidden);
 });
}

// ---- Einstellungen: Abschnitt «Funktionen & Ansicht» (nur Administratoren) ----
function uebEinstellungenHtml(){
 const zeile=(gruppe,schl,text,wert)=>`<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:4px 0;border-top:1px solid var(--card-line)">
<span>${esc(text)}</span><select data-ueb-gruppe="${gruppe}" data-ueb-key="${esc(schl)}" style="max-width:190px">${UEB_STUFEN.map(([v,t])=>`<option value="${v}"${(wert||"alle")===v?" selected":""}>${esc(t)}</option>`).join("")}</select></div>`;
 const arten=Object.keys(typeof MEAS_TYPE_LABELS==="object"?MEAS_TYPE_LABELS:{})
  .map(a=>zeile("arten",a,((typeof MEAS_TYPE_ICONS==="object"&&MEAS_TYPE_ICONS[a])?MEAS_TYPE_ICONS[a]+" ":"")+MEAS_TYPE_LABELS[a],uebAnsicht.arten[a])).join("");
 const werkzeuge=UEB_WERKZEUGE.map(([k,t])=>zeile("werkzeuge",k,t,uebAnsicht.werkzeuge[k])).join("");
 return `<div class="small" style="margin-bottom:8px">Was die App anbietet – für die ganze Firma. <b>Ausgeblendet</b> heisst nur: nicht mehr in der Auswahl.
Bereits erfasste Massaufnahmen dieser Art öffnen und drucken weiter wie bisher. <b>Nur Administratoren</b> zeigt es nur Personen mit Administratorrechten.</div>
<h3 style="margin:8px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Massaufnahme-Arten</h3>${arten}
<h3 style="margin:12px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Werkzeuge unter «Mehr»</h3>${werkzeuge}
<div class="bar" style="margin-top:10px"><button type="button" class="green" id="uebSpeichern">💾 Speichern</button><button type="button" class="gray" id="uebAlles">Alles einblenden</button></div>`;
}
function uebEinstellungenZeichnen(){
 const ziel=$("protectedContent");
 if(!ziel)return;
 let sec=$("uebAbschnitt");
 if(!sec){
  ziel.insertAdjacentHTML("afterbegin",`<div class="settings-section" data-section="funktionen" id="uebAbschnitt">
<div class="settings-section-head" data-toggle-section="funktionen"><h2>🧩 Funktionen &amp; Ansicht</h2><span class="settings-section-chevron">›</span></div>
<div class="settings-section-body" id="uebAbschnittBody"></div></div>`);
  sec=$("uebAbschnitt");
 }
 const body=$("uebAbschnittBody");
 if(body)body.innerHTML=uebEinstellungenHtml();
}
async function uebSpeichern(){
 const neu={arten:{},werkzeuge:{}};
 document.querySelectorAll("#uebAbschnittBody [data-ueb-gruppe]").forEach(s=>{
  if(s.value&&s.value!=="alle")neu[s.dataset.uebGruppe][s.dataset.uebKey]=s.value;
 });
 uebAnsicht=neu;
 try{localStorage.setItem(UEB_SCHLUESSEL,JSON.stringify(neu))}catch(e){}
 uebNeuAnwenden();
 if(typeof efMelden==="function")await efMelden(UEB_SCHLUESSEL,"Funktionen & Ansicht gespeichert");
}
function uebNeuAnwenden(){
 if(typeof renderMeasTypeChooser==="function")renderMeasTypeChooser();
 uebAnsichtAnwenden();
 if(typeof a2Zustand==="object"&&a2Zustand&&a2Zustand.seite==="mehr"&&typeof a2Zeichnen==="function")a2Zeichnen();
}

// ---- Suche in den Einstellungen ---------------------------------------------------
// Durchsucht alle Register zugleich. Gefundene Abschnitte werden aufgeklappt, die anderen
// ausgeblendet. Das Register «Firma» wird nur durchsucht, wenn es die Person sehen darf.
let uebSucheAktiv=false;
function uebSucheEinbauen(){
 const tabs=document.querySelector("#settingsModal .settings-tabs");
 if(!tabs||$("uebSuche"))return;
 tabs.insertAdjacentHTML("afterend",`<div style="margin:8px 0 10px"><input id="uebSuche" type="search" placeholder="🔍 Einstellung suchen, z. B. Rollenbreite, Logo, Kehle …" autocomplete="off" style="width:100%"></div>
<div id="uebSucheInfo" class="small" style="margin:-4px 0 8px" hidden></div>`);
}
function uebSucheAnwenden(text){
 const q=String(text||"").trim().toLowerCase();
 const panels=Array.from(document.querySelectorAll("#settingsModal .settings-tab-panel"));
 const firmaErlaubt=uebIstAdmin()&&!($("protectedTabBtn")&&$("protectedTabBtn").hidden);
 const info=$("uebSucheInfo");
 if(!q){
  if(!uebSucheAktiv)return;
  uebSucheAktiv=false;
  document.querySelectorAll("#settingsModal .settings-section").forEach(s=>{s.hidden=false});
  const aktiv=document.querySelector("#settingsModal .settings-tab.active");
  const name=aktiv?aktiv.dataset.settingsTab:"general";
  panels.forEach(p=>{p.hidden=p.dataset.settingsPanel!==name});
  if(info)info.hidden=true;
  return;
 }
 uebSucheAktiv=true;
 let treffer=0;
 panels.forEach(p=>{
  const erlaubt=p.dataset.settingsPanel!=="protected"||firmaErlaubt;
  let imPanel=0;
  p.querySelectorAll(".settings-section").forEach(s=>{
   const ok=erlaubt&&s.textContent.toLowerCase().indexOf(q)>=0;
   s.hidden=!ok;
   if(ok){s.classList.add("open");imPanel++}
  });
  p.hidden=!imPanel;
  if(p.dataset.settingsPanel==="protected"&&imPanel){
   if($("protectedDenied"))$("protectedDenied").hidden=true;
   if($("protectedContent"))$("protectedContent").hidden=false;
  }
  treffer+=imPanel;
 });
 if(info){info.hidden=false;info.textContent=treffer?treffer+" Abschnitt"+(treffer===1?"":"e")+" gefunden – Suchfeld leeren zeigt wieder die Register.":"Nichts gefunden."}
}

// ---- Einstieg für eine Firma ohne Projekt (v3.430) --------------------------------
// Steht auf der Startseite anstelle von «Nichts offen. Alles ... ist erledigt», solange es noch kein
// einziges Projekt gibt. Sobald eines da ist, verschwindet er von selbst - kein Schalter, kein Modus.
function uebEinstiegHtml(){
 const schritt=(nr,titel,text)=>`<li style="display:flex;gap:10px;margin:8px 0"><span style="flex:none;width:24px;height:24px;border-radius:50%;background:var(--blue,#1769aa);color:#fff;font-weight:700;text-align:center;line-height:24px">${nr}</span><span><b>${titel}</b><br><span class="small">${text}</span></span></li>`;
 return `<div class="a2-karte" id="uebEinstieg"><div class="a2-karte-titel">So fängst du an</div>
<ol style="list-style:none;margin:0;padding:0">
${schritt(1,"Projekt anlegen","Auftraggeber und Adresse genügen.")}
${schritt(2,"Massaufnahme erfassen","Im Projekt die Art wählen, Masse eintragen – die App rechnet den Zuschnitt.")}
${schritt(3,"Zuschnitt und Rüstliste","Die Teile zuschneiden, abhaken und die Rüstliste drucken.")}
</ol>
<div class="a2-knopf-reihe"><button type="button" class="a2-knopf a2-k-blau" data-a2-tu="neuesprojekt">＋ Erstes Projekt anlegen</button>
<button type="button" class="a2-knopf a2-k-grau" data-a2-tu="anleitung">📖 Anleitung</button></div></div>`;
}

// ---- Startbildschirm: Einrichtung und Nebeninformationen eingeklappt (v3.433) ------
// Ansage des Anwenders: "Es soll nur das wichtigste sofort zu sehen sein. Alles, was Nebeninformationen sind,
// zugeklappt oder an einem Ort, der nicht in den Hauptbildschirmen ist. Nicht verschachtelt."
// Der aufgeklappte Zustand wird gemerkt, sonst klappt jedes Neuzeichnen der Seite (Daten laden) alles wieder zu.
const uebOffen={einr:false,neben:false,hinweise:false,aufg:false,proj:false,ablauf:false,umgebung:false,mengen:false,komplett:false,stand:false};
// Allgemeine eingeklappte Zeile (v3.436): Titel + Kurzinfo, darunter der Inhalt. id optional (Sprungziel der Kennzahl-Kacheln).
function uebKlappHtml(key,titel,info,inhalt,id,klasse){
 return `<details class="ueb-zeile ueb-klapp${klasse?" "+esc(klasse):""}" data-ueb-offen="${esc(key)}"${id?` id="${esc(id)}"`:""}${uebOffen[key]?" open":""}>
<summary><span class="ueb-titel">${esc(titel)}</span><span class="ueb-info">${esc(info)}</span></summary>
<div class="ueb-inhalt">${inhalt}</div></details>`;
}
// Wer oben nach einem Projekt sucht, will das Ergebnis sehen: die zugeklappte Zeile «Offene Projekte» geht dabei auf.
document.addEventListener("input",e=>{
 if(e.target&&e.target.id==="a2HeuteSuche"){
  const z=document.getElementById("a2HeuteProjekte");
  if(z&&z.tagName==="DETAILS"&&!z.open)z.open=true;
 }
});
// Die Kennzahl «Offene Aufgaben» springt zur Zeile - ist sie zugeklappt, wird sie dabei geoeffnet (vor dem Sprung in js/70).
document.addEventListener("click",e=>{
 const k=e.target&&e.target.closest?e.target.closest("[data-a2-scroll]"):null;
 if(!k)return;
 const z=document.getElementById(k.getAttribute("data-a2-scroll"));
 if(z&&z.tagName==="DETAILS"&&!z.open){z.open=true}
},true);
function uebEinrichtungHtml(){
 if(typeof einrKarteHtml!=="function"||typeof einrStand!=="function")return "";
 const karte=einrKarteHtml();
 if(!karte)return "";
 if(typeof einrErzwungen!=="undefined"&&einrErzwungen)return karte;     // ueber «Mehr» ausdruecklich aufgerufen: gleich offen
 const liste=einrStand(), pflicht=liste.filter(x=>x.pflicht), fertig=pflicht.filter(x=>x.fertig).length;
 const pct=pflicht.length?Math.round(100*fertig/pflicht.length):100;
 const punkte=liste.map(einrPunktHtml).join("");
 return `<details class="ueb-zeile ueb-einr" data-ueb-offen="einr"${uebOffen.einr?" open":""}>
<summary><span class="ueb-titel">Einrichtung</span><span class="ueb-info">${fertig} von ${pflicht.length} erledigt</span><i class="ueb-balken" aria-hidden="true"><b style="width:${pct}%"></b></i></summary>
<div class="ueb-inhalt"><p class="small">Ohne diese Angaben rechnet die App an manchen Stellen nicht – bei jedem Punkt steht, warum.</p><div class="einr-liste">${punkte}</div></div></details>`;
}
function uebNebenHtml(inhalt){
 if(!inhalt||!String(inhalt).trim())return "";
 return `<details class="ueb-zeile ueb-neben" data-ueb-offen="neben"${uebOffen.neben?" open":""}>
<summary><span class="ueb-titel">Weitere Informationen</span><span class="ueb-info">Termine · Zeitmessung</span></summary>
<div class="ueb-inhalt">${inhalt}</div></details>`;
}
document.addEventListener("toggle",e=>{
 const d=e.target;
 if(d&&d.dataset&&d.dataset.uebOffen&&d.dataset.uebOffen in uebOffen)uebOffen[d.dataset.uebOffen]=!!d.open;
},true);

// ---- Lange Erklärtexte in den Massaufnahmen kürzen --------------------------------
// Eine Erklärung (.info) mit mehr als UEB_LANG Zeichen zeigt nur die ersten Zeilen;
// «mehr» klappt sie auf. Pro Gerät abschaltbar (Einstellungen → Anzeige).
const UEB_LANG=220;
function uebErklaerungenGanz(){try{return localStorage.getItem("sd_erklaerungenGanz")==="ja"}catch(e){return false}}
function uebKuerzen(wurzel){
 if(!wurzel||uebErklaerungenGanz())return;
 wurzel.querySelectorAll(".info:not([data-ueb])").forEach(el=>{
  el.setAttribute("data-ueb","1");
  if((el.textContent||"").trim().length<=UEB_LANG)return;
  el.classList.add("ueb-kurz");
  const k=document.createElement("button");
  k.type="button";k.className="ueb-mehr";k.textContent="mehr ▾";
  el.insertAdjacentElement("afterend",k);
 });
}
document.addEventListener("click",e=>{
 const k=e.target&&e.target.closest?e.target.closest(".ueb-mehr"):null;
 if(k){
  const el=k.previousElementSibling;
  if(el&&el.classList.contains("info")){
   const zu=el.classList.toggle("ueb-kurz");
   k.textContent=zu?"mehr ▾":"weniger ▴";
  }
  return;
 }
 const kurz=e.target&&e.target.closest?e.target.closest(".info.ueb-kurz"):null;
 if(kurz){kurz.classList.remove("ueb-kurz");const n=kurz.nextElementSibling;if(n&&n.classList.contains("ueb-mehr"))n.textContent="weniger ▴"}
 const sp=e.target&&e.target.closest?e.target.closest("#uebSpeichern,#uebAlles"):null;
 if(sp){
  if(sp.id==="uebAlles"){document.querySelectorAll("#uebAbschnittBody [data-ueb-gruppe]").forEach(s=>{s.value="alle"});return}
  uebSpeichern();
 }
});
function uebAnzeigeSchalterEinbauen(){
 const body=document.querySelector('#settingsModal [data-section="anzeige"] .settings-section-body');
 if(!body||$("uebGanz"))return;
 body.insertAdjacentHTML("beforeend",`<label class="ra-schalter" style="margin-top:8px"><input type="checkbox" id="uebGanz"${uebErklaerungenGanz()?" checked":""}> Lange Erklärungen in den Massaufnahmen immer ganz anzeigen (sonst gekürzt, «mehr» klappt auf) – nur auf diesem Gerät</label>`);
}
// Der «i»-Knopf in der Kopfzeile eines Einklapp-Bereichs soll nur die Hilfe zeigen, nicht ein-/ausklappen
document.addEventListener("click",e=>{
 const h=e.target&&e.target.closest?e.target.closest("summary .hilfe-knopf"):null;
 if(h)e.preventDefault();
},true);
document.addEventListener("change",e=>{
 if(e.target&&e.target.id==="uebGanz"){try{localStorage.setItem("sd_erklaerungenGanz",e.target.checked?"ja":"nein")}catch(x){}}
});
document.addEventListener("input",e=>{
 if(e.target&&e.target.id==="uebSuche")uebSucheAnwenden(e.target.value);
});

(function uebStart(){
 const st=document.createElement("style");
 st.textContent=`.info.ueb-kurz{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.ueb-mehr{background:none;border:0;padding:0 2px;margin:-4px 0 6px;color:var(--blue,#1769aa);font-size:12px;font-weight:700;cursor:pointer;min-height:0}
@media print{.info.ueb-kurz{display:block;-webkit-line-clamp:unset;overflow:visible}.ueb-mehr{display:none}}`;
 document.head.appendChild(st);
 uebSucheEinbauen();
 uebAnzeigeSchalterEinbauen();
 const m=document.getElementById("measurementEditModal");
 if(m&&typeof MutationObserver==="function"){
  let wartet=false;
  new MutationObserver(()=>{if(wartet)return;wartet=true;requestAnimationFrame(()=>{wartet=false;uebKuerzen(m)})}).observe(m,{childList:true,subtree:true});
 }
 // Einstellungen: der Abschnitt «Funktionen & Ansicht» wird bei jedem Öffnen frisch gezeichnet
 if(typeof renderSettings==="function"){
  const alt=renderSettings;
  renderSettings=function(){const r=alt.apply(this,arguments);try{uebEinstellungenZeichnen();uebAnzeigeSchalterEinbauen();const s=$("uebSuche");if(s&&s.value){s.value="";uebSucheAnwenden("")}}catch(e){}return r};
 }
})();
