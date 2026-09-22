"use strict";
// ===========================================================================
// HEUTE - der Einstieg
// ===========================================================================
// Die Frage beim Aufschliessen der Werkstatt lautet nicht "welches Modul?",
// sondern "was ist heute dran?". Deshalb steht hier zuoberst, was JEMAND
// TUN MUSS, und erst darunter, was es sonst noch gibt.
//
// Jede Zeile fuehrt irgendwohin. Eine Startseite, die nur zaehlt, aber nicht
// hinfuehrt, zwingt zum Suchen - genau das soll 2.0 abstellen.
// ===========================================================================

function pAufgabeZeichen(art){
 return {freigabe:"✓",ruesten:"🔧",offerte:"🧾",ausmass:"📏",montage:"🏠"}[art]||"•";
}

function pHeuteHtml(){
 const offene=pProjekteAlle().filter(p=>p.phase!=="ausmass");
 const werkTeile=[];
 pProjekteAlle().forEach(p=>pTeile(p).forEach(t=>{
  if(t.fertig<t.stueck)werkTeile.push({p,t});
 }));
 const ruestlisten=pProjekteAlle().filter(p=>pTeile(p).some(t=>t.fertig<t.stueck)).length;
 const montageHeute=pMontageAlle().filter(m=>m.datum<="2026-09-23").length;
 const warnungen=pProjekteAlle().filter(p=>p.hinweis&&p.hinweisArt==="warnung");
 const hinweise=pProjekteAlle().filter(p=>p.hinweis&&p.hinweisArt!=="warnung");

 return `
${warnungen.map(p=>`<div class="p-hinweis p-h-warnung">
 <b>⚠ ${esc(p.name)}</b>${esc(p.hinweis)}
 <div class="p-knopf-reihe"><button class="p-knopf p-knopf-grau" data-gehe="projekt/${p.id}/uebersicht">Projekt öffnen</button></div>
</div>`).join("")}

<section class="p-abschnitt">
 <div class="p-abschnitt-kopf"><h2>Meine Aufgaben</h2><span class="p-marke p-m-blau">${pAufgabenAlle().length} offen</span></div>
 ${pAufgabenAlle().map(a=>{
  const p=pProjekt(a.projekt);
  return `<button class="p-zeile" data-gehe="projekt/${a.projekt}/uebersicht">
   <span class="p-zeile-nr" style="${a.dringend?"background:var(--rot-hell);color:var(--rot)":""}">${pAufgabeZeichen(a.art)}</span>
   <span class="p-zeile-text"><b>${esc(a.text)}</b>
    <span>${esc(p?p.name:"")}${a.dringend?" · dringend":""}</span></span>
   <span class="p-zeile-pfeil">›</span></button>`;
 }).join("")}
</section>

<section class="p-abschnitt">
 <div class="p-abschnitt-kopf"><h2>Werkstatt heute</h2>
  <a data-navi="werkstatt">Werkstatt öffnen ›</a></div>
 <div class="p-zahlen">
  <div class="p-zahl p-zahl-orange"><b>${werkTeile.length}</b><span>Teile zu produzieren</span></div>
  <div class="p-zahl p-zahl-blau"><b>${ruestlisten}</b><span>Rüstlisten</span></div>
  <div class="p-zahl p-zahl-gruen"><b>${montageHeute}</b><span>Montagen vorbereitet</span></div>
 </div>
</section>

<section class="p-abschnitt">
 <div class="p-abschnitt-kopf"><h2>Anstehende Montage</h2></div>
 ${pMontageAlle().map(m=>{
  const p=pProjekt(m.projekt);
  return `<button class="p-zeile" data-gehe="projekt/${m.projekt}/uebersicht">
   <span class="p-zeile-nr">🏠</span>
   <span class="p-zeile-text"><b>${esc(m.text)}</b>
    <span>${esc(pDatum(m.datum))} · ${esc(pName(m.wer))}</span></span>
   <span class="p-zeile-pfeil">›</span></button>`;
 }).join("")}
</section>

<section class="p-abschnitt">
 <div class="p-abschnitt-kopf"><h2>Offene Projekte</h2>
  <a data-navi="projekte">Alle Projekte ›</a></div>
 <div class="p-liste-zwei">
 ${offene.map(p=>{
  const f=pProjektFortschritt(p);
  const st=P_ABLAUF.find(s=>s.k===p.phase);
  return `<button class="p-karte p-karte-klick" data-gehe="projekt/${p.id}/uebersicht">
   <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
    <div style="min-width:0">
     <div class="p-karte-titel">${esc(p.name)}</div>
     <p class="p-karte-unter">${esc(p.adresse)}</p>
    </div>
    <span class="p-marke p-m-blau">${esc(st?st.name:"")}</span>
   </div>
   ${f.gesamt?pFortschrittHtml(f,"Produziert"):
     '<p class="p-karte-unter" style="margin-top:8px">Noch keine Teile erfasst.</p>'}
  </button>`;
 }).join("")}
 </div>
</section>

${hinweise.length?`<section class="p-abschnitt">
 <div class="p-abschnitt-kopf"><h2>Wichtige Hinweise</h2></div>
 ${hinweise.map(p=>`<div class="p-hinweis p-h-info">
  <b>${esc(p.name)}</b>${esc(p.hinweis)}</div>`).join("")}
</section>`:""}
`;
}
