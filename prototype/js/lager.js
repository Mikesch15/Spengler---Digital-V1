"use strict";
// ===========================================================================
// LAGER - moeglichst einfach
// ===========================================================================
// Im Lager steht man mit einer Rolle Blech in der Hand. Deshalb zuerst die
// Suche und der Barcode, dann der Bestand - und was zu wenig da ist, steht
// oben und ist rot. Reservierte Mengen sind ausgewiesen, weil "84 m" ohne
// "36 m davon reserviert" eine gefaehrliche Zahl ist.
// ===========================================================================

function pLagerFrei(a){ return a.bestand-a.reserviert }
function pLagerKnapp(a){ return pLagerFrei(a)<a.mind }

function pLagerTreffer(){
 const q=(pZustand.lagerSuche||"").trim().toLowerCase();
 const liste=P_LAGER.slice().sort((a,b)=>
   (pLagerKnapp(b)?1:0)-(pLagerKnapp(a)?1:0)||a.nr.localeCompare(b.nr));
 if(!q)return liste;
 return liste.filter(a=>[a.nr,a.bez,a.dim,a.barcode].join(" ").toLowerCase().indexOf(q)>=0);
}

function pLagerZeileHtml(a){
 const frei=pLagerFrei(a), knapp=pLagerKnapp(a);
 return `<button class="p-zeile" data-tu="artikel" data-text="Die Artikelkarte">
  <span class="p-zeile-nr" style="${knapp?"background:var(--rot-hell);color:var(--rot)":""}">${knapp?"!":"📦"}</span>
  <span class="p-zeile-text">
   <b>${esc(a.bez)}</b>
   <span>${esc(a.nr)} · ${esc(a.dim)}</span>
  </span>
  <span style="text-align:right;flex:none">
   <b style="display:block;font-size:15px;${knapp?"color:var(--rot)":""}">${frei} ${esc(a.einheit)}</b>
   <span style="display:block;font-size:11.5px;color:var(--grau)">${a.reserviert?("davon "+a.reserviert+" reserviert"):"frei"}</span>
  </span>
 </button>`;
}

function pLagerListeNeu(){
 const box=$("pLagerListe");
 if(!box)return;
 const t=pLagerTreffer();
 box.innerHTML=t.length
  ? t.map(pLagerZeileHtml).join("")
  : '<div class="p-leer">Kein Artikel gefunden.<br>Gesucht wird in Nummer, Bezeichnung, Dimension und Barcode.</div>';
}

function pLagerHtml(){
 const knapp=P_LAGER.filter(pLagerKnapp);
 return `
 <div class="p-knopf-reihe" style="margin:0 0 12px">
  <button class="p-knopf p-knopf-blau p-knopf-voll" data-tu="scan" data-text="Der Barcode-Scan">📷 Barcode scannen</button>
 </div>
 <div class="p-suche"><input id="pLagerSuche" type="search" inputmode="search"
  placeholder="Artikel, Nummer oder Barcode" value="${esc(pZustand.lagerSuche)}"></div>

 ${knapp.length?`<div class="p-hinweis p-h-warnung">
  <b>⚠ ${knapp.length} Artikel unter dem Mindestbestand</b>
  ${esc(knapp.map(a=>a.bez).join(", "))} – reserviertes Material ist dabei schon abgezogen.</div>`:""}

 <div class="p-abschnitt-kopf"><h2>Bestand</h2>
  <a data-tu="wareneingang" data-text="Der Wareneingang">Wareneingang ›</a></div>
 <div id="pLagerListe"></div>

 <section class="p-abschnitt" style="margin-top:22px">
  <div class="p-abschnitt-kopf"><h2>Letzter Wareneingang</h2></div>
  ${P_WARENEINGANG.map(w=>`<div class="p-zeile">
   <span class="p-zeile-nr">↓</span>
   <span class="p-zeile-text"><b>${esc(w.bez)}</b>
    <span>${esc(w.menge)} · ${esc(w.lieferant)} · ${esc(pDatum(w.datum))}</span></span>
  </div>`).join("")}
 </section>

 <div class="p-knopf-reihe">
  <button class="p-knopf p-knopf-grau" data-tu="wareneingang" data-text="Der Wareneingang">↓ Wareneingang buchen</button>
  <button class="p-knopf p-knopf-grau" data-tu="inventur" data-text="Die Inventur">📋 Inventur</button>
 </div>`;
}
