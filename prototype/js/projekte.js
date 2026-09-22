"use strict";
// ===========================================================================
// PROJEKTE - suchen und finden
// ===========================================================================
// Gesucht wird, wie im Betrieb gesprochen wird: nach Adresse, Kundenname
// oder Auftragsnummer - nicht nur nach dem Projektnamen. Wer "Köniz" oder
// "1042" eintippt, muss dasselbe Projekt finden.
// ===========================================================================

function pProjekteTreffer(){
 const q=(pZustand.suche||"").trim().toLowerCase();
 if(!q)return pProjekteAlle();
 return pProjekteAlle().filter(p=>
  [p.name,p.adresse,p.kunde,p.nr].join(" ").toLowerCase().indexOf(q)>=0);
}

function pProjektKarteHtml(p){
 const f=pProjektFortschritt(p);
 const st=P_ABLAUF.find(s=>s.k===p.phase);
 const warn=p.hinweisArt==="warnung";
 return `<button class="p-karte p-karte-klick" data-gehe="projekt/${p.id}/uebersicht">
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
   <div style="min-width:0">
    <div class="p-karte-titel">${esc(p.name)}</div>
    <p class="p-karte-unter">${esc(p.adresse)}</p>
    <p class="p-karte-unter">Auftrag #${esc(p.nr)} · ${esc(p.kunde)}</p>
   </div>
   <span class="p-marke p-m-${warn?"rot":"blau"}">${warn?"! ":""}${esc(st?st.name:"")}</span>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
   ${p.termin?`<span class="p-marke p-m-grau">📅 ${esc(pDatum(p.termin))}</span>`:""}
   <span class="p-marke p-m-grau">👤 ${esc(pKurz(p.leiter))}</span>
   ${p.offertBetrag?`<span class="p-marke p-m-grau">${esc(pFranken(p.offertBetrag))}</span>`:""}
  </div>
  ${f.gesamt?pFortschrittHtml(f,"Produziert"):""}
 </button>`;
}

function pProjekteListeNeu(){
 const box=$("pProjekteListe");
 if(!box)return;
 const treffer=pProjekteTreffer();
 box.innerHTML=treffer.length
  ? treffer.map(pProjektKarteHtml).join("")
  : `<div class="p-leer">Kein Projekt gefunden.<br>Gesucht wird in Name, Adresse, Kunde und Auftragsnummer.</div>`;
 const z=$("pProjekteZahl");
 if(z)z.textContent=treffer.length+" von "+pProjekteAlle().length;
}

function pProjekteHtml(){
 return `
<div class="p-suche"><input id="pProjektSuche" type="search" inputmode="search"
 placeholder="Projekt, Adresse, Kunde oder Auftrag #" value="${esc(pZustand.suche)}"></div>
<div class="p-knopf-reihe" style="margin:0 0 14px">
 <button class="p-knopf p-knopf-gruen p-knopf-voll" data-tu="neu" data-text="Ein neues Projekt anzulegen">＋ Neues Projekt</button>
</div>
<div class="p-abschnitt-kopf"><h2>Projekte</h2><span class="p-marke p-m-grau" id="pProjekteZahl"></span></div>
<div class="p-liste-zwei" id="pProjekteListe"></div>`;
}
