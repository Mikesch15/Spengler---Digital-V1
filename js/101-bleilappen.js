"use strict";
// ===========================================================================
// Bleilappen-Zuschnitt (v3.402)
//
// Nach «Spenglerarbeiten» (Seiten-/Ortbleche mit Bleilappen, Darstellung 7.3.28): der Zuschnitt der Bleilappen richtet sich nach
// dem Deckmaterial. Walzblei ist 1 mm dick, die Bleirolle ist immer 420 mm breit. Im Zuschnitt steht nur die ANZAHL der Lappen mit
// ihren Massen; der vorderste Bleilappen ist immer gerade (nicht konisch), alle weiteren sind konisch.
//
//   Falzziegel (auch Schiebe- und Muldenziegel)  gerade 130 × 420, konisch 130/170 × 420
//   Biberschwanz Doppeldach                      gerade 90 × 210,  konisch 90/120 × 210
//   Biberschwanz Einfachdach                     gerade 300 × 90,  konisch 300 × 90/120
//   Faserzementschiefer (auch Eternit, Naturschiefer)  nur gerade, 105 hoch; Breite nach Plattenmass:
//       600 × 400 → 300 × 105, 400 × 400 / 400 × 300 → 200 × 105, 720 × 400 → 105 × 420
//
// Die Anzahl der Bleilappen kommt unveraendert aus den Aufnahmen (Einfassung rund, Kamin, Dachfenster, Ortbleche). Hier wird
// nichts neu gezaehlt - nur aufgeteilt in gerade und konische Lappen und mit Massen versehen.
// ===========================================================================

const BL_PLATTEN=[
 {k:"600x400",name:"600 × 400 mm",b:300,h:105},
 {k:"400x400",name:"400 × 400 / 400 × 300 mm",b:200,h:105},
 {k:"720x400",name:"720 × 400 mm",b:105,h:420},
 {k:"frei",name:"andere Plattenmasse (Lappenbreite von Hand)",b:0,h:105}
];
let blOpt={platte:"600x400",breite:""};
const blMm=v=>Math.round(Number(v)||0).toLocaleString("de-CH");

// Deckmaterial -> Familie. Einfassungen/Kamin/Dachfenster: EINF_DECKUNGEN; Ortbleche: ANB_DECKUNGEN.
function blFamilie(art,deckung){
 if(art==="anschlussblech"){
  if(deckung==="pfanne"||deckung==="falzziegel")return "falzziegel";
  if(deckung==="biber")return "biber_einfach";       // Anschlussblech kennt nur «Biberschwanz»: Einfachdach angenommen
  if(deckung==="schiefer"||deckung==="faserzement")return "faserzement";
  return null;
 }
 if(deckung==="schiebeziegel"||deckung==="muldenziegel")return "falzziegel";
 if(deckung==="biber_einfach")return "biber_einfach";
 if(deckung==="biber_doppel")return "biber_doppel";
 if(deckung==="eternit"||deckung==="naturschiefer")return "faserzement";
 return null;
}
const BL_NAMEN={falzziegel:"Falzziegel (auch Schiebe- und Muldenziegel)",biber_einfach:"Biberschwanz Einfachdach",biber_doppel:"Biberschwanz Doppeldach",faserzement:"Faserzementschiefer (auch Eternit, Naturschiefer)"};

function blBerechne(familie,anzahl,opt){
 const n=Math.max(0,Math.round(Number(anzahl)||0));
 if(!familie||!(n>0))return null;
 const o=opt||blOpt;
 const r={familie,name:BL_NAMEN[familie],anzahl:n,gerade:null,konisch:null,hinweis:"Walzblei 1 mm, Rolle 420 mm breit."};
 if(familie==="falzziegel"){
  r.gerade={n:1,mass:"130 × 420"};
  if(n>1)r.konisch={n:n-1,mass:"130 / 170 × 420"};
  r.hinweis+=" Die konischen Lappen paarweise gegengleich schneiden (170 / 130 im Wechsel) – so bleibt kein Verschnitt.";
 }else if(familie==="biber_doppel"){
  r.gerade={n:1,mass:"90 × 210"};
  if(n>1)r.konisch={n:n-1,mass:"90 / 120 × 210"};
  r.hinweis+=" Aus einer Platte 420 × 420: zwei Reihen zu 210, die konischen Lappen gegengleich.";
 }else if(familie==="biber_einfach"){
  r.gerade={n:1,mass:"300 × 90"};
  if(n>1)r.konisch={n:n-1,mass:"300 × 90 / 120"};
  r.hinweis+=" Die konischen Lappen gegengleich aus einer Platte 300 × 420 schneiden.";
 }else{
  const pl=BL_PLATTEN.find(x=>x.k===o.platte)||BL_PLATTEN[0];
  const b=pl.k==="frei"?(Number(o.breite)||0):pl.b;
  r.platte=pl.k;
  r.gerade={n,mass:b>0?blMm(b)+" × "+blMm(pl.h):"Lappenbreite fehlt"};
  r.hinweis+=" Rechteckige Lappen, Platte "+pl.name+".";
 }
 r.hinweis+=" Auf die Fliessrichtung des Bleis achten.";
 return r;
}

// Live-Quellen der vier Arten (Deckung + Anzahl Bleilappen aus der Aufnahme)
function blLive(art){
 try{
  if(art==="einfassung_rund")return {deckung:einfA.deckung,anzahl:einfaBleilappenGesamt()};
  if(art==="kamineinfassung")return {deckung:kamA.deckung,anzahl:kamaBleilappen().gesamt};
  if(art==="dachfenstereinfassung")return {deckung:dfaA.deckung,anzahl:dfaBleilappen().gesamt};
  if(art==="anschlussblech"){
   const e=anbEingabenAusFeldern(),erg=berechneAnschlussblech(e);
   return {deckung:e.deckung,anzahl:erg?erg.anzahlBleilappen:null,art:e.art};
  }
 }catch(x){}
 return null;
}
function blAktuell(art){
 const q=blLive(art);
 if(!q||q.anzahl===null||q.anzahl===undefined)return null;
 return blBerechne(blFamilie(art,q.deckung),q.anzahl);
}
const BL_ARTEN=["einfassung_rund","kamineinfassung","dachfenstereinfassung","anschlussblech"];

function blZeilenHtml(b){
 const z=[];
 if(b.gerade)z.push(`<tr><td><b>${b.gerade.n} ×</b></td><td><b>${mdEscBl(b.gerade.mass)} mm</b></td><td>${b.konisch||b.familie==="faserzement"?(b.familie==="faserzement"?"rechteckig":"gerade (vorderster)"):"gerade"}</td></tr>`);
 if(b.konisch)z.push(`<tr><td><b>${b.konisch.n} ×</b></td><td><b>${mdEscBl(b.konisch.mass)} mm</b></td><td>konisch</td></tr>`);
 return z.join("");
}
const mdEscBl=s=>(typeof esc==="function")?esc(s):String(s);

// Karte im Register «Zuschnitt» der Aufnahme
function blKarteHtml(art){
 const q=blLive(art);
 if(!q||q.anzahl===null||q.anzahl===undefined)return "";
 const fam=blFamilie(art,q.deckung);
 if(!fam)return `<div class="card"><h2>Bleilappen</h2><div class="small">Für dieses Deckmaterial gibt es keinen Bleilappen-Zuschnitt.</div></div>`;
 const b=blBerechne(fam,q.anzahl);
 if(!b)return "";
 const platten=fam==="faserzement"?`<div class="grid" style="margin:8px 0"><div><label>Plattenmass der Eindeckung</label><select data-bl-platte>${BL_PLATTEN.map(p=>`<option value="${p.k}"${p.k===blOpt.platte?" selected":""}>${mdEscBl(p.name)}</option>`).join("")}</select></div>
${blOpt.platte==="frei"?`<div><label>Lappenbreite (mm)</label><input data-bl-breite type="number" inputmode="numeric" step="1" value="${mdEscBl(blOpt.breite)}"></div>`:""}</div>`:"";
 return `<div class="card" id="bl_karte"><h2>Bleilappen</h2>
<div class="info">${mdEscBl(b.name)} – <b>${b.anzahl} Bleilappen</b>. Der vorderste Bleilappen ist gerade, die übrigen sind konisch.</div>
${platten}
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Anzahl</th><th>Zuschnitt (B × L)</th><th>Form</th></tr></thead><tbody>${blZeilenHtml(b)}</tbody></table></div>
<div class="small" style="margin-top:6px">${mdEscBl(b.hinweis)}</div></div>`;
}

// Speicherstand: wird an die Daten der vier Arten gehaengt
function blMitZuschnitt(art,data){
 if(BL_ARTEN.indexOf(art)<0)return data;
 const b=blAktuell(art);
 if(!b)return data;
 return {...(data||{}),bleilappenZuschnitt:{...b,breiteFrei:blOpt.platte==="frei"?(Number(blOpt.breite)||0):undefined}};
}
function blFuellen(d){
 const z=d&&d.bleilappenZuschnitt;
 blOpt={platte:"600x400",breite:""};
 if(z&&z.platte&&BL_PLATTEN.some(p=>p.k===z.platte)){blOpt.platte=z.platte;if(z.platte==="frei"&&z.breiteFrei)blOpt.breite=z.breiteFrei}
}
// Ausdruck und Ruestblatt: nur das, was beim Speichern abgelegt wurde
function blDruckHtml(b){
 if(!b||!b.anzahl)return "";
 return `<div class="eb-section-head">Bleilappen</div>
<table class="eb-cutlist"><thead><tr><th>Anzahl</th><th>Zuschnitt (B &#215; L)</th><th>Form</th></tr></thead><tbody>${blZeilenHtml(b)}</tbody></table>
<div class="note" style="font-size:8pt;color:#68737d">${mdEscBl(b.name)} · ${b.anzahl} Bleilappen insgesamt. ${mdEscBl(b.hinweis)}</div>`;
}
function blRuestHtml(m){
 const b=m&&m.data&&m.data.bleilappenZuschnitt;
 if(!b||!b.anzahl)return "";
 return `<div class="rb-bleilappen" style="margin:8px 0"><b>Bleilappen (${b.anzahl} Stk.)</b>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Anzahl</th><th>Zuschnitt (B × L)</th><th>Form</th></tr></thead><tbody>${blZeilenHtml(b)}</tbody></table></div>
<div class="small">${mdEscBl(b.hinweis)}</div></div>`;
}

// Plattenmass waehlen -> Register der Aufnahme neu zeichnen (dieselbe Zuordnung wie js/61)
document.addEventListener("change",e=>{
 const t=e.target;
 if(!t||!t.dataset)return;
 let geaendert=false;
 if(t.dataset.blPlatte!==undefined){blOpt.platte=BL_PLATTEN.some(p=>p.k===t.value)?t.value:"600x400";geaendert=true}
 else if(t.dataset.blBreite!==undefined){blOpt.breite=t.value===""?"":Number(t.value);geaendert=true}
 if(!geaendert)return;
 const mt=$("measType");
 const fn=mt?(mt.value==="dachfenstereinfassung"?"renderDfaAufnahme":((typeof MEAS_FORM_RENDER==="object")?MEAS_FORM_RENDER[mt.value]:null)):null;
 if(fn&&typeof window[fn]==="function")window[fn]();
});
