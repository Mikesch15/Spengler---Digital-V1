"use strict";
// ===========================================================================
// WERKSTATT - ein eigener Arbeitsplatz
// ===========================================================================
// Wer hier steht, hat die Hände am Blech und das Tablet auf der Bank. Oben
// die drei Zahlen des Tages, darunter die konkreten Teile - kein Umweg
// ueber ein Projekt, kein Aufklappen.
//
// NEU gegenueber der bestehenden App und der eigentliche Vorschlag dieses
// Registers: der Umschalter NACH PROJEKT / NACH MATERIAL. An der Abkantbank
// ruestet man die MASCHINE um, sobald Material oder Staerke wechseln. Nach
// Projekt sortiert heisst: dreimal dasselbe Blech einspannen. Nach Material
// sortiert heisst: einmal einspannen, alles schneiden, was damit geht -
// auch ueber Projektgrenzen hinweg.
// ===========================================================================

function pWerkAlleTeile(){
 const raus=[];
 P_PROJEKTE.forEach(p=>pTeile(p).forEach(t=>{
  if(t.fertig<t.stueck)raus.push(Object.assign({},t,{projekt:p}));
 }));
 return raus;
}
function pWerkMaterialSchluessel(t){
 return t.material+" "+String(t.staerke).replace(".",",")+" mm";
}

// Welche Zusatzzeile hilft, haengt an der Sicht: ist nach PROJEKT gruppiert,
// steht der Projektname schon in der Ueberschrift - dann ist das MATERIAL die
// Angabe, die innerhalb der Gruppe wechselt. Nach Material gruppiert ist es
// genau umgekehrt. Dieselbe Zeile zweimal zu zeigen hilft niemandem.
function pWerkTeilHtml(t,zeigeProjekt){
 const offen=t.stueck-t.fertig;
 const f=pFortschritt([t]);
 return `<div class="p-karte">
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
   <div style="min-width:0">
    <div class="p-karte-titel">${esc(t.bez)}</div>
    <p class="p-karte-unter">${esc(t.art)} · ${esc(t.massaufnahme)}</p>
    ${zeigeProjekt?`<p class="p-karte-unter">${esc(t.projekt.name)} · #${esc(t.projekt.nr)}</p>`
                  :`<p class="p-karte-unter">${esc(pWerkMaterialSchluessel(t))}</p>`}
   </div>
   <span class="p-marke p-m-orange">${offen} offen</span>
  </div>
  ${pFortschrittHtml(f,"Geschnitten")}
  <div class="p-knopf-reihe">
   <button class="p-knopf p-knopf-blau" data-tu="stueck" data-text="Das Abhaken eines Stücks">✓ Stück abhaken</button>
   <button class="p-knopf p-knopf-grau" data-tu="skizze" data-text="Die Rüstskizze">📐 Rüstskizze</button>
  </div>
 </div>`;
}

function pWerkstattHtml(){
 const teile=pWerkAlleTeile();
 const fertigHeute=[];
 P_PROJEKTE.forEach(p=>pTeile(p).forEach(t=>{ if(t.fertig>=t.stueck)fertigHeute.push(t) }));
 const ruestlisten=new Set(teile.map(t=>t.projekt.id)).size;
 const montage=P_MONTAGE.filter(m=>m.datum<="2026-09-23").length;
 const nachMaterial=pZustand.werkSicht==="material";

 // Gruppieren - beide Sichten benutzen DIESELBE Liste, nur ein anderer
 // Schluessel. Es gibt keinen zweiten Bestand.
 const gruppen=new Map();
 teile.forEach(t=>{
  const k=nachMaterial?pWerkMaterialSchluessel(t):("p"+t.projekt.id);
  if(!gruppen.has(k))gruppen.set(k,{titel:nachMaterial?k:t.projekt.name,
    unter:nachMaterial?"":(t.projekt.adresse+" · #"+t.projekt.nr), teile:[]});
  gruppen.get(k).teile.push(t);
 });
 const liste=[...gruppen.values()].sort((a,b)=>b.teile.length-a.teile.length);

 return `
 <div class="p-zahlen">
  <div class="p-zahl p-zahl-orange"><b>${teile.length}</b><span>Teile zu produzieren</span></div>
  <div class="p-zahl p-zahl-blau"><b>${ruestlisten}</b><span>Rüstlisten</span></div>
  <div class="p-zahl p-zahl-gruen"><b>${montage}</b><span>Montagen vorbereitet</span></div>
 </div>

 <div class="p-register" style="margin-top:4px">
  <button class="${nachMaterial?"":"ist-auf"}" data-tu="werksicht" data-sicht="projekt">Nach Projekt</button>
  <button class="${nachMaterial?"ist-auf":""}" data-tu="werksicht" data-sicht="material">Nach Material</button>
 </div>

 ${nachMaterial?`<div class="p-hinweis p-h-info">
  <b>Weniger umrüsten</b>Nach Material sortiert bleibt das Blech eingespannt:
  alles mit derselben Stärke wird in einem Durchgang geschnitten – auch über
  Projektgrenzen hinweg. Nach Projekt sortiert wäre die Maschine
  ${liste.length>1?"mehrfach":"einmal"} umzurüsten.</div>`:""}

 ${liste.length? liste.map(g=>`
  <section class="p-abschnitt">
   <div class="p-abschnitt-kopf">
    <h2>${esc(g.titel)}</h2>
    <span class="p-marke p-m-grau">${g.teile.reduce((s,t)=>s+(t.stueck-t.fertig),0)} Stück offen</span>
   </div>
   ${g.unter?`<p class="p-karte-unter" style="margin:-4px 0 9px">${esc(g.unter)}</p>`:""}
   <div class="p-liste-zwei">${g.teile.map(t=>pWerkTeilHtml(t,nachMaterial)).join("")}</div>
  </section>`).join("")
  : '<div class="p-leer">In der Werkstatt ist gerade nichts offen.</div>'}

 <section class="p-abschnitt">
  <div class="p-abschnitt-kopf"><h2>Fertig</h2><span class="p-marke p-m-gruen">${fertigHeute.length} Teile</span></div>
  <div class="p-karte">
   <p class="p-karte-unter">Fertig produzierte Teile bleiben sichtbar, bis sie montiert sind –
   damit beim Verladen nachvollziehbar ist, was in der Werkstatt steht.</p>
   <div class="p-knopf-reihe">
    <button class="p-knopf p-knopf-grau" data-tu="ruestlisten" data-text="Die Rüstlisten">🖨️ Rüstlisten</button>
   </div>
  </div>
 </section>`;
}
