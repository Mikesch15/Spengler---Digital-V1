"use strict";
// ===========================================================================
// PROJEKT - die zentrale Einheit
// ===========================================================================
// Beim Oeffnen beantwortet der Kopf zuerst die Frage "wo steht das hier?"
// (Ablaufleiste), dann erst kommen die Register. Die Register heissen nach
// der ARBEIT, nicht nach dem Modul: Aufmass statt "Massaufnahme-Formular",
// Produktion statt "Zuschnitt", Werkstatt statt "Ruestliste".
//
// Bewusst NICHT im Register, sondern unter "Mehr": Offerte, Material, Fotos,
// Dokumente, Verlauf, Einstellungen. Das sind Dinge, die man gelegentlich
// braucht - sie duerfen den Ablauf nicht zustellen.
// ===========================================================================

const P_REGISTER=[
 {k:"uebersicht",name:"Übersicht"},
 {k:"aufmass",   name:"Aufmass"},
 {k:"produktion",name:"Produktion"},
 {k:"werkstatt", name:"Werkstatt"},
 {k:"ausmass",   name:"Ausmass"},
 {k:"mehr",      name:"Mehr …"}
];

function pProjektHtml(){
 const p=pProjekt(pZustand.projektId);
 if(!p)return '<div class="p-leer">Dieses Projekt gibt es nicht.</div>';
 const inhalt={uebersicht:pRegUebersicht, aufmass:pRegAufmass, produktion:pRegProduktion,
               werkstatt:pRegWerkstatt, ausmass:pRegAusmass, mehr:pRegMehr};
 const fn=inhalt[pZustand.register]||pRegUebersicht;
 return `
 ${pAblaufHtml(p)}
 <div class="p-register">${P_REGISTER.map(r=>
   `<button class="${r.k===pZustand.register?"ist-auf":""}" data-tu="register" data-register="${r.k}">${esc(r.name)}</button>`
  ).join("")}</div>
 ${fn(p)}`;
}

// ---- Übersicht ------------------------------------------------------------
function pRegUebersicht(p){
 const f=pProjektFortschritt(p);
 const st=P_ABLAUF.find(s=>s.k===p.phase);
 const offeneTeile=pTeile(p).filter(t=>t.fertig<t.stueck).length;
 return `
 ${p.hinweis?`<div class="p-hinweis p-h-${p.hinweisArt==="warnung"?"warnung":"info"}">
   <b>${p.hinweisArt==="warnung"?"⚠ Achtung":"Hinweis"}</b>${esc(p.hinweis)}</div>`:""}

 <div class="p-karte">
  <div class="p-abschnitt-kopf"><h2>Jetzt dran</h2></div>
  <div class="p-karte-titel">${esc(st?st.name:"—")}</div>
  <p class="p-karte-unter">
   ${p.phase==="offerte"?"Die Offerte ist erfasst und muss noch hinaus.":""}
   ${p.phase==="massaufnahme"?"Die Masse werden am Objekt aufgenommen.":""}
   ${p.phase==="produktion"?(pAnzahl(offeneTeile,"Teil ist","Teile sind")+" noch nicht fertig produziert."):""}
   ${p.phase==="werkstatt"?"Die Teile werden gerüstet und für die Montage bereitgestellt.":""}
   ${p.phase==="montage"?"Alles ist gerüstet – die Montage ist vorbereitet.":""}
   ${p.phase==="ausmass"?"Ausgeführt. Das Ausmass wird für die Verrechnung erfasst.":""}
  </p>
  ${f.gesamt?pFortschrittHtml(f,"Produziert"):""}
  <div class="p-knopf-reihe">
   <button class="p-knopf p-knopf-blau" data-tu="register" data-register="${p.phase==="massaufnahme"?"aufmass":"produktion"}">Weiterarbeiten</button>
  </div>
 </div>

 <div class="p-karte">
  <div class="p-abschnitt-kopf"><h2>Auftrag</h2></div>
  ${[["Auftrag","#"+p.nr],["Kunde",p.kunde],["Objekt",p.adresse],
     ["Termin",p.termin?pDatum(p.termin):"—"],["Projektleitung",pName(p.leiter)],
     ["Offerte",p.offertBetrag?pFranken(p.offertBetrag):"—"]]
    .map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--linie)">
      <span style="color:var(--grau);font-size:13px">${esc(k)}</span>
      <b style="text-align:right;font-size:14px">${esc(v)}</b></div>`).join("")}
 </div>

 <div class="p-karte">
  <div class="p-abschnitt-kopf"><h2>Aufmass</h2>
   <a data-tu="register" data-register="aufmass">Alle ${p.massaufnahmen.length} ›</a></div>
  ${p.massaufnahmen.length
   ? p.massaufnahmen.slice(0,3).map((m,i)=>pMassZeileHtml(m,i)).join("")
   : '<div class="p-leer">Noch keine Position aufgenommen.</div>'}
 </div>`;
}

// ---- Aufmass: erst die Liste, dann die Schritte ---------------------------
// Die erste Ebene ist bewusst eine LISTE, kein Formular. Ein Spengler sieht
// damit auf einen Blick, was am Objekt schon aufgenommen ist und was nicht -
// bis hierher musste er dafuer jede Position einzeln oeffnen.
function pMassZeileHtml(m,i){
 return `<button class="p-zeile" data-tu="massauf" data-mass="${m.id}">
  <span class="p-zeile-nr">${i+1}</span>
  <span class="p-zeile-text"><b>${esc(m.art)}</b>
   <span>${esc(m.titel)}${m.teile.length?" · "+pAnzahl(m.teile.length,"Teil","Teile"):""}</span></span>
  ${pMarke(m.stand)}
  <span class="p-zeile-pfeil">›</span></button>`;
}
function pRegAufmass(p){
 if(pZustand.massId)return pMassSchritteHtml(p);
 const fertig=p.massaufnahmen.filter(m=>m.stand==="fertig").length;
 return `
 <div class="p-abschnitt-kopf"><h2>Massaufnahme</h2>
  <span class="p-marke p-m-grau">${fertig} von ${p.massaufnahmen.length} fertig</span></div>
 ${p.massaufnahmen.length
  ? p.massaufnahmen.map((m,i)=>pMassZeileHtml(m,i)).join("")
  : '<div class="p-leer">Noch keine Position aufgenommen.</div>'}
 <div class="p-knopf-reihe">
  <button class="p-knopf p-knopf-gruen p-knopf-voll" data-tu="neu" data-text="Eine neue Massaufnahme anzulegen">＋ Massaufnahme</button>
 </div>`;
}

// Die Schrittfolge. Statt eines einzigen langen Formulars vier ueberschaubare
// Schritte - und oben steht immer, wo man ist. Gespeichert wird im Prototyp
// nichts; die Felder zeigen, WIE es sich anfuehlt.
const P_SCHRITTE=[
 {n:1,name:"Grunddaten"},{n:2,name:"Masse"},{n:3,name:"Zusatzdaten"},{n:4,name:"Fotos / Skizze"}
];
function pMassSchritteHtml(p){
 const m=p.massaufnahmen.find(x=>String(x.id)===String(pZustand.massId));
 if(!m)return '<div class="p-leer">Diese Position gibt es nicht.</div>';
 const s=pZustand.schritt;
 return `
 <button class="p-knopf p-knopf-grau" data-gehe="projekt/${p.id}/aufmass" style="margin:0 0 12px">‹ Zurück zur Liste</button>
 <div class="p-karte-titel" style="margin:0 0 2px">${esc(m.art)}</div>
 <p class="p-karte-unter" style="margin:0 0 12px">${esc(m.titel)} · ${pMarke(m.stand)}</p>
 <div class="p-schritte">${P_SCHRITTE.map(x=>
   `<button class="p-schritt ${x.n===s?"ist-auf":(x.n<s?"ist-fertig":"")}" data-tu="schritt" data-schritt="${x.n}">
     <b>${x.n}/4</b>${esc(x.name)}</button>`).join("")}</div>
 <div class="p-karte">${pMassSchrittInhalt(s,m)}</div>
 <div class="p-knopf-reihe">
  ${s>1?`<button class="p-knopf p-knopf-grau" data-tu="schritt" data-schritt="${s-1}">‹ Zurück</button>`:""}
  ${s<4?`<button class="p-knopf p-knopf-blau" data-tu="schritt" data-schritt="${s+1}">Weiter ›</button>`
       :`<button class="p-knopf p-knopf-gruen" data-tu="speichern" data-text="Das Speichern">✓ Fertig</button>`}
 </div>`;
}
function pMassSchrittInhalt(s,m){
 if(s===1)return `
  <div class="p-feld"><label>Art</label>
   <select><option>${esc(m.art)}</option><option>Dachrinne</option><option>Kamineinfassung</option>
   <option>Mauerabdeckung</option><option>Kehle</option></select></div>
  <div class="p-feld"><label>Bezeichnung</label><input value="${esc(m.titel)}"></div>
  <div class="p-feld-paar">
   <div class="p-feld"><label>Datum</label><input type="date" value="2026-09-21"></div>
   <div class="p-feld"><label>Aufgenommen von</label>
    <select>${P_MITARBEITER.map(x=>`<option>${esc(x.name)}</option>`).join("")}</select></div>
  </div>`;
 if(s===2)return `
  <div class="p-feld-paar">
   <div class="p-feld"><label>Mass A (mm)</label><input type="number" inputmode="numeric" placeholder="333"></div>
   <div class="p-feld"><label>Mass B (mm)</label><input type="number" inputmode="numeric" placeholder="120"></div>
   <div class="p-feld"><label>Winkel (°)</label><input type="number" inputmode="numeric" placeholder="90"></div>
   <div class="p-feld"><label>Länge (mm)</label><input type="number" inputmode="numeric" placeholder="2000"></div>
  </div>
  <div class="p-hinweis p-h-info" style="margin:4px 0 0">
   <b>So bleibt es auch in 2.0</b>Die Fachrechnung, die Zuschnittform und die
   Rüstskizzen kommen unverändert aus den bestehenden Modulen. Neu ist nur,
   dass die Eingabe in vier Schritte zerfällt statt in ein langes Formular.</div>`;
 if(s===3)return `
  <div class="p-feld"><label>Material</label>
   <select>${P_LAGER.filter(l=>l.einheit!=="Pkg.").map(l=>`<option>${esc(l.bez)} · ${esc(l.dim)}</option>`).join("")}</select></div>
  <div class="p-feld-paar">
   <div class="p-feld"><label>Materialstärke</label>
    <select><option>0,6 mm</option><option>0,7 mm</option><option>1,0 mm</option></select></div>
   <div class="p-feld"><label>Zuschnitt aus</label>
    <select><option>Rolle</option><option>Tafel</option></select></div>
  </div>
  <div class="p-feld"><label>Bemerkung</label><textarea placeholder="Hinweise für die Werkstatt …"></textarea></div>`;
 return `
  <div class="p-knopf-reihe" style="margin:0 0 12px">
   <button class="p-knopf p-knopf-blau" data-tu="foto" data-text="Das Aufnehmen eines Fotos">📷 Foto aufnehmen</button>
   <button class="p-knopf p-knopf-grau" data-tu="skizze" data-text="Das Zeichnen einer Skizze">✏️ Skizze zeichnen</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
   ${["Dach Nord","Anschluss","Detail Ecke"].map(t=>
    `<div style="aspect-ratio:1;border-radius:11px;background:#e7edf1;display:flex;
      align-items:center;justify-content:center;flex-direction:column;gap:4px;
      color:var(--grau);font-size:11px;text-align:center;padding:6px">
      <span style="font-size:22px">🖼️</span>${esc(t)}</div>`).join("")}
  </div>
  <p class="p-karte-unter" style="margin-top:10px">Beispielbilder – im Prototyp sind keine echten Fotos hinterlegt.</p>`;
}

// ---- Produktion -----------------------------------------------------------
// "Ich möchte dieses Teil produzieren" - nicht "ich muss Modul Zuschnitt
// öffnen". Deshalb steht hier das TEIL mit seinem Fortschritt, und der
// Zuschnitt ist der Knopf daran.
function pRegProduktion(p){
 const teile=pTeile(p);
 if(!teile.length)return `<div class="p-leer">Für dieses Projekt sind noch keine Teile erfasst.<br>
  Sie entstehen aus dem Aufmass.</div>`;
 const grup=[{k:"offen",name:"Offen",f:t=>t.fertig===0},
             {k:"arbeit",name:"In Arbeit",f:t=>t.fertig>0&&t.fertig<t.stueck},
             {k:"fertig",name:"Fertig",f:t=>t.fertig>=t.stueck}];
 const f=pFortschritt(teile);
 return `
 <div class="p-zahlen">
  ${grup.map(g=>{
   const n=teile.filter(g.f).length;
   const farbe=g.k==="offen"?"grau":(g.k==="arbeit"?"orange":"gruen");
   return `<div class="p-zahl p-zahl-${farbe==="grau"?"blau":farbe}"><b>${n}</b><span>${esc(g.name)}</span></div>`;
  }).join("")}
 </div>
 <div class="p-karte">${pFortschrittHtml(f,"Gesamt produziert")}</div>
 ${grup.map(g=>{
  const liste=teile.filter(g.f);
  if(!liste.length)return "";
  return `<section class="p-abschnitt">
   <div class="p-abschnitt-kopf"><h2>${esc(g.name)}</h2><span class="p-marke p-m-grau">${liste.length}</span></div>
   ${liste.map(t=>{
    const tf=pFortschritt([t]);
    return `<div class="p-karte">
     <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <div style="min-width:0">
       <div class="p-karte-titel">${esc(t.bez)}</div>
       <p class="p-karte-unter">${esc(t.art)} · ${esc(t.massaufnahme)} · ${esc(t.material)} ${String(t.staerke).replace(".",",")} mm</p>
      </div>
      ${tf.prozent>=100?'<span class="p-marke p-m-gruen">✓ Fertig</span>':""}
     </div>
     ${pFortschrittHtml(tf,"Zugeschnitten")}
     ${tf.prozent<100?`<div class="p-knopf-reihe">
      <button class="p-knopf p-knopf-blau" data-tu="zuschnitt" data-text="Der Zuschnittplan">✂️ Zuschnitt öffnen</button>
      <button class="p-knopf p-knopf-grau" data-tu="stueck" data-text="Das Abhaken eines Stücks">✓ Stück abhaken</button>
     </div>`:""}
    </div>`;
   }).join("")}
  </section>`;
 }).join("")}`;
}

// ---- Werkstatt im Projekt -------------------------------------------------
function pRegWerkstatt(p){
 const teile=pTeile(p).filter(t=>t.fertig<t.stueck);
 return `
 <div class="p-karte">
  <div class="p-abschnitt-kopf"><h2>Rüsten</h2></div>
  ${teile.length
   ? `<p class="p-karte-unter">${pAnzahl(teile.length,"Teil ist","Teile sind")} noch zu rüsten.</p>`
   : `<p class="p-karte-unter">Alles gerüstet – dieses Projekt ist bereit für die Montage.</p>`}
  <div class="p-knopf-reihe">
   <button class="p-knopf p-knopf-grau" data-tu="ruestliste" data-text="Die Rüstliste">🖨️ Rüstliste drucken</button>
   ${teile.length?`<button class="p-knopf p-knopf-blau" data-navi="werkstatt">In der Werkstatt öffnen</button>`:""}
  </div>
 </div>
 ${teile.map(t=>`<div class="p-zeile">
   <span class="p-zeile-nr">${esc(t.nr)}</span>
   <span class="p-zeile-text"><b>${esc(t.bez)}</b>
    <span>${esc(t.material)} ${String(t.staerke).replace(".",",")} mm · ${t.stueck-t.fertig} von ${t.stueck} offen</span></span>
  </div>`).join("")}`;
}

// ---- Ausmass --------------------------------------------------------------
function pRegAusmass(p){
 const bereit=p.phase==="ausmass"||p.phase==="montage";
 return `<div class="p-karte">
  <div class="p-abschnitt-kopf"><h2>Ausmass</h2></div>
  <p class="p-karte-unter">${bereit
   ? "Was ausgeführt wurde, wird hier erfasst – die Grundlage für die Verrechnung."
   : "Das Ausmass wird erst nach der Montage erfasst. Die Offerte sagt, was angeboten wurde; das Ausmass, was gemacht wurde."}</p>
  <div class="p-knopf-reihe">
   <button class="p-knopf ${bereit?"p-knopf-blau":"p-knopf-grau"}" data-tu="ausmass" data-text="Das Ausmass">📏 Ausmass erfassen</button>
  </div>
 </div>`;
}

// ---- Mehr (im Projekt) ----------------------------------------------------
function pRegMehr(p){
 const punkte=[
  ["🧾","Offerte",       p.offertBetrag?pFranken(p.offertBetrag):"keine erfasst"],
  ["📦","Material",      "Bedarf, Reservierung und Lagerbezug"],
  ["📷","Fotos",         "alle Bilder dieses Objekts an einem Ort"],
  ["📄","Dokumente",     "Pläne, PDF, Schriftverkehr"],
  ["🕓","Verlauf",       "wer hat wann was geändert"],
  ["⚙️","Projekteinstellungen","Module, Zuständigkeiten, Termine"]
 ];
 return punkte.map(([z,name,unter])=>
  `<button class="p-zeile" data-tu="mehr" data-text="„${esc(name)}“">
    <span class="p-zeile-nr">${z}</span>
    <span class="p-zeile-text"><b>${esc(name)}</b><span>${esc(unter)}</span></span>
    <span class="p-zeile-pfeil">›</span></button>`).join("");
}
