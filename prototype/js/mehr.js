"use strict";
// ===========================================================================
// MEHR - alles, was nicht taeglich gebraucht wird
// ===========================================================================
// Bewusst die kleinste Seite. Was hier liegt, soll den Ablauf nicht
// zustellen - es muss nur auffindbar sein.
// ===========================================================================

const P_MEHR=[
 {z:"📐",name:"Vorlagen",        unter:"Wiederkehrende Massaufnahmen als Grundlage"},
 {z:"🕓",name:"Verlauf",         unter:"Wer hat wann was geändert"},
 {z:"⚙️",name:"Einstellungen",   unter:"Material, Ansätze, Zuschnittmasse, Module"},
 {z:"👥",name:"Mitarbeiter",     unter:"Konten, Funktionen, Zugriffe"},
 {z:"🏢",name:"Administration",  unter:"Firma, Abonnement, Datensicherung"}
];

function pMehrHtml(){
 return `
 <div class="p-karte">
  <div style="display:flex;gap:12px;align-items:center">
   <div class="p-kopf-ich" style="background:var(--blau-hell);color:var(--blau-dunkel);width:44px;height:44px;font-size:15px">${esc(pIch().kurz)}</div>
   <div style="min-width:0">
    <div class="p-karte-titel">${esc(pIch().name)}</div>
    <p class="p-karte-unter">${esc(pIch().funktion)} · PETER KÜNZI AG</p>
   </div>
  </div>
 </div>

 ${P_MEHR.map(e=>`<button class="p-zeile" data-tu="mehr" data-text="„${esc(e.name)}“">
  <span class="p-zeile-nr">${e.z}</span>
  <span class="p-zeile-text"><b>${esc(e.name)}</b><span>${esc(e.unter)}</span></span>
  <span class="p-zeile-pfeil">›</span></button>`).join("")}

 <section class="p-abschnitt" style="margin-top:22px">
  <div class="p-abschnitt-kopf"><h2>Letzte Änderungen</h2></div>
  ${P_VERLAUF.map(v=>`<div class="p-zeile">
   <span class="p-zeile-nr">${esc(pKurz(v.wer))}</span>
   <span class="p-zeile-text"><b>${esc(v.text)}</b>
    <span>${esc(v.zeit)} · ${esc((pProjekt(v.projekt)||{}).name||"")}</span></span>
  </div>`).join("")}
 </section>

 <div class="p-hinweis p-h-info" style="margin-top:18px">
  <b>Prototyp</b>Diese Oberfläche ist ein Entwurf für Spengler-DIGITAL 2.0.
  Sie arbeitet ausschliesslich mit Beispieldaten und ist vollständig getrennt
  von der laufenden App – dort ist nichts verändert.</div>`;
}
