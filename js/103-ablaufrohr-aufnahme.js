"use strict";
// ===========================================================================
// Ablaufrohr - Erfassung in fuenf Registern (v3.413)
// ===========================================================================
// Die Fachrechnung steht in js/102-ablaufrohr.js (berechneAblaufrohr,
// arStueckliste, arPlanSvg). Diese Datei ist die Bedienung darum herum und
// rechnet nichts selbst.
// ===========================================================================

const AR_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Masse",hilfe:"ar-masse"},
 {nr:3,kurz:"Schwanenhals",hilfe:"ar-berechnung"},{nr:4,kurz:"Rohre",hilfe:"ar-rohre"},
 {nr:5,kurz:"Ausmass",hilfe:"reg-ausmass"},{nr:6,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
const AR_KONTROLLE=AR_REGISTER.length;
let arSchritt=1;
let arBestaetigt=new Set();
// true, solange die Registerflaeche neu gezeichnet wird (siehe mdZeichnet in js/100)
let arZeichnet=false;

function arLeer(){
 return {material:"",fassade:"",ausladung:"",wandabstand:"",bogenwinkel:"",hoehe:"",sockel:"",
  schiebestueck:"",bogenAbzug:"",rohrSteckung:"",schiebeZugabe:"",rohrlaengen:AR_ROHRLAENGEN.slice()};
}
let arA=arLeer();
const arErgebnis=()=>berechneAblaufrohr(arA);

// ---- Ausmass --------------------------------------------------------------
const arQm=v=>arZ(v).toFixed(2).replace(".",",");
function arGesamtLaenge(g){return (g.halsOk?g.sZu:0)+(g.fallOk?g.fallRohr:0)+g.Ls+g.S}
function arAusmassZeilen(){
 const g=arErgebnis(),z=[];let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:false});
 if(!g.halsOk)return z;
 zeile("Bogen "+g.alpha+"°","2","Stk.","Schwanenhals");
 if(g.fallOk){
  zeile("Ablaufrohr, Länge",arQm(arGesamtLaenge(g)/1000),"m","Zwischenstück + Fallrohr + Schiebestück + Sockelrohr");
  if(g.vorschlag)zeile("Rohre "+(g.vorschlag.laenge/1000)+" m",String(g.vorschlag.rohre),"Stk.",g.vorschlag.ganze+" ganze"+(g.vorschlag.rest>0?" + 1 Reststück":""));
 }
 if(g.Ls>0)zeile("Schiebestück","1","Stk.","Länge "+arMm(g.Ls)+" mm");
 if(g.S>0)zeile("Sockelrohr","1","Stk.","Höhe "+arMm(g.S)+" mm");
 return z;
}

// ---- Kontrolle --------------------------------------------------------------
function arPruefungen(){
 const m=[],a=arA,g=arErgebnis();
 const fehlt=t=>m.push({art:"fehler",text:t});
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 if(!a.fassade)fehlt("Die Fassade (Aussendämmung oder Beton / Mauerwerk) fehlt.");
 if(!arHat(a.ausladung)||!(arZ(a.ausladung)>0))fehlt("Die Ausladung des Schwanenhalses fehlt.");
 if(!arHat(a.wandabstand))fehlt("Der Wandabstand fehlt.");
 if(!AR_BOGENWINKEL.includes(arZ(a.bogenwinkel)))fehlt("Der Bogenwinkel (45°, 70° oder 85°) fehlt.");
 if(!arHat(a.hoehe)||!(arZ(a.hoehe)>0))fehlt("Die Höhe Oberkant Stutzen bis Unterkant Sockelrohr fehlt.");
 if(!arHat(a.sockel))fehlt("Die Höhe des Sockelrohrs fehlt.");
 if(!arHat(a.schiebestueck))fehlt("Die Länge des Schiebestücks fehlt (0, wenn keines).");
 if(!arRohrlaengenWahl(a).length)fehlt("Es ist keine Rohrlänge (2, 3 oder 4 m) gewählt.");
 g.fehler.forEach(t=>fehlt(t));
 if(g.halsOk&&!(g.abzug>0))m.push({art:"warnung",text:"Der Abzug je Bogen ist 0 mm – das Zwischenstück wird ohne Steckungsabzug gerechnet."});
 if(g.halsOk&&!(g.steckung>0))m.push({art:"warnung",text:"Die Steckung je Rohr ist 0 mm – die Rohre werden ohne Überdeckung gerechnet."});
 if(g.halsOk&&g.Ls>0&&!(g.schiebeZugabe>0))m.push({art:"warnung",text:"Die Steckungszugabe am Schiebestück ist 0 mm."});
 return m;
}

// ---- Darstellung ------------------------------------------------------------
function arKarte(titel,inhalt){
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,AR_REGISTER):"";
 return `<div class="card"><h2>${arEsc(titel)}${h}</h2>${inhalt}</div>`;
}
function arFeld(label,inhalt,voll){return `<div${voll?' style="grid-column:1/-1"':""}><label>${arEsc(label)}</label>${inhalt}</div>`}
function arZahlFeld(label,id,wert,pflicht,platzhalter){
 return arFeld(label,`<input id="${id}" type="number" step="1" inputmode="numeric"${pflicht?' data-pflicht="1"':""}${platzhalter!==undefined?` placeholder="${arEsc(platzhalter)}"`:""} value="${arHat(wert)?arEsc(wert):""}">`);
}
function arGrunddatenHtml(){
 const a=arA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>`<option value="${arEsc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${arEsc(m.name)}</option>`)).join("");
 const fass=['<option value="">– bitte wählen –</option>'].concat(AR_FASSADEN.map(([v,t])=>`<option value="${v}"${a.fassade===v?" selected":""}>${arEsc(t)}</option>`)).join("");
 return `<div class="info">Ablaufrohr mit Schwanenhals: vom Stutzen über zwei Bögen zur Fassade, dann senkrecht bis zum Sockelrohr.</div>
<div class="grid">
${arFeld("Werkstoff",`<select id="ar_material" data-pflicht="1">${matOpt}</select>`+(typeof zwMaterialChip==="function"?zwMaterialChip("ar_material","ablaufrohr",a.material):""),true)}
${arFeld("Fassade",`<select id="ar_fassade" data-pflicht="1">${fass}</select>`,true)}
</div>
<div id="ar_fassadeHinweis" class="small" style="margin-top:6px">${arEsc(AR_FASSADEN_HINWEIS[a.fassade]||"")}</div>`;
}
function arMasseHtml(){
 const a=arA;
 const wopt=['<option value="">– bitte wählen –</option>'].concat(AR_BOGENWINKEL.map(w=>`<option value="${w}"${arZ(a.bogenwinkel)===w?" selected":""}>${w}°</option>`)).join("");
 const std=arZ(ablaufrohrSettings&&ablaufrohrSettings.bogen_abzug);
 const stdSt=arZ(ablaufrohrSettings&&ablaufrohrSettings.rohr_steckung),stdSz=arZ(ablaufrohrSettings&&ablaufrohrSettings.schiebe_zugabe);
 const roh=arRohrlaengenWahl(a);
 return `<div class="grid">
${arZahlFeld("Ausladung Schwanenhals (Hinterkant Stutzen bis Fassade, mm)","ar_ausladung",a.ausladung,true)}
${arZahlFeld("Wandabstand (mm)","ar_wandabstand",a.wandabstand,true)}
${arFeld("Bogenwinkel",`<select id="ar_winkel" data-pflicht="1">${wopt}</select>`)}
${arZahlFeld("Höhe Oberkant Stutzen bis Unterkant Sockelrohr (mm)","ar_hoehe",a.hoehe,true)}
${arZahlFeld("Höhe Sockelrohr (mm)","ar_sockel",a.sockel,true)}
${arZahlFeld("Länge Schiebestück (mm, 0 = keines)","ar_schiebe",a.schiebestueck,true)}
${arZahlFeld("Abzug je Bogen (Steckung, mm)","ar_abzug",a.bogenAbzug,false,String(std))}
${arZahlFeld("Steckung je Rohr (mm)","ar_rohrSteckung",a.rohrSteckung,false,String(stdSt))}
${arZahlFeld("Steckungszugabe Schiebestück (mm)","ar_schiebeZugabe",a.schiebeZugabe,false,String(stdSz))}
</div>
<div class="small" style="margin-top:4px">Abzug je Bogen, Steckung je Rohr und Steckungszugabe: leer = Standard aus den Einstellungen (${arMm(std)} / ${arMm(stdSt)} / ${arMm(stdSz)} mm).</div>
<h3 style="margin-top:12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Rohrlängen für den Vorschlag</h3>
<div style="display:flex;flex-wrap:wrap;gap:6px 20px">
${AR_ROHRLAENGEN.map(l=>`<label class="ra-schalter"><input type="checkbox" data-ar-rohr="${l}"${roh.includes(l)?" checked":""}> ${l/1000} m</label>`).join("")}
</div>
<div class="small">Nur die gewählten Längen werden berücksichtigt.</div>
<div id="ar_live" style="margin-top:10px">${arLiveHtml()}</div>`;
}
function arLiveHtml(){
 const g=arErgebnis();
 if(g.fehler.length)return g.fehler.map(t=>`<div class="ra-fehler">${arEsc(t)}</div>`).join("");
 if(!g.halsOk)return `<div class="small" style="color:var(--muted)">Die Berechnung erscheint, sobald Ausladung, Wandabstand und Bogenwinkel erfasst sind.</div>`;
 return `<div class="grid">
<div><label>Versatz (Ausladung − Wandabstand)</label><div class="ra-wert">${arMm(g.D)} mm</div></div>
<div><label>Zwischenstück Schwanenhals</label><div class="ra-wert">${arMm(g.sZu)} mm</div></div>
<div><label>Höhe Schwanenhals</label><div class="ra-wert">${arMm(g.hHals)} mm</div></div>
${g.fallOk?`<div><label>Fallrohr (ohne Schiebestück)</label><div class="ra-wert">${arMm(g.fallRohr)} mm</div></div>`:""}
</div>`;
}
function arHalsHtml(){
 const g=arErgebnis();
 if(g.fehler.length||!g.halsOk)return arLiveHtml()+`<div class="ra-warnung" style="margin-top:8px">Bitte zuerst die Masse im Register «Masse» vervollständigen.</div>`;
 return `<div class="eb-diagram-box" id="ar_plan">${arPlanSvg(g)}</div>
<table class="eb-table ra-tab"><tbody>
<tr><td>Versatz D = Ausladung − Wandabstand</td><td style="text-align:right"><b>${arMm(g.D)} mm</b></td></tr>
<tr><td>Zwischenstück Achse = D ÷ sin ${g.alpha}°</td><td style="text-align:right">${arMm(g.sAchse)} mm</td></tr>
<tr><td>Abzug 2 Bögen × ${arMm(g.abzug)} mm</td><td style="text-align:right">− ${arMm(2*g.abzug)} mm</td></tr>
<tr><td><b>Zwischenstück Zuschnitt</b></td><td style="text-align:right"><b>${arMm(g.sZu)} mm</b></td></tr>
<tr><td>Höhe Schwanenhals = Zuschnitt × cos ${g.alpha}° + 2 × ${arMm(g.abzug)} mm</td><td style="text-align:right"><b>${arMm(g.hHals)} mm</b></td></tr>
</tbody></table>`;
}
function arBerechnungHtml(){
 const g=arErgebnis();
 if(g.fehler.length||!g.halsOk)return arLiveHtml()+`<div class="ra-warnung" style="margin-top:8px">Bitte zuerst die Masse im Register «Masse» vervollständigen.</div>`;
 const opt=g.optionen.map(o=>`<tr${o.vorschlag?' style="font-weight:700"':""}><td>${o.laenge/1000} m${o.vorschlag?" ✔ Vorschlag":""}</td><td style="text-align:right">${o.ganze}</td><td style="text-align:right">${o.rest>0?arMm(o.rest):"–"}</td><td style="text-align:right">${o.verschnitt>0?arMm(o.verschnitt):"0"}</td><td style="text-align:right">${o.rohre}</td></tr>`).join("");
 const sl=arStueckliste(g);
 return `<table class="eb-table ra-tab"><tbody>
<tr><td>Höhe Schwanenhals</td><td style="text-align:right">${arMm(g.hHals)} mm</td></tr>
<tr><td>Höhe Stutzen bis Sockelrohr</td><td style="text-align:right">${arMm(g.H)} mm</td></tr>
<tr><td>Senkrechte Strecke = Höhe − Schwanenhals</td><td style="text-align:right">${g.fallOk||g.fall?arMm(g.fall):"–"} mm</td></tr>
${g.Ls>0?`<tr><td>− Schiebestück (sichtbare Länge)</td><td style="text-align:right">− ${arMm(g.Ls)} mm</td></tr>`:""}
<tr><td><b>Fallrohr aus Rohren</b></td><td style="text-align:right"><b>${arMm(g.fallRohr)} mm</b></td></tr>
</tbody></table>
<h3 style="margin-top:12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Rohrlängen</h3>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Rohr</th><th style="text-align:right">Ganze</th><th style="text-align:right">Reststück (mm)</th><th style="text-align:right">Verschnitt (mm)</th><th style="text-align:right">Rohre</th></tr></thead>
<tbody>${opt}</tbody></table></div>
<h3 style="margin-top:12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Stückliste</h3>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Länge (mm)</th><th>Bemerkung</th></tr></thead>
<tbody>${sl.map(x=>`<tr><td>${x.pos}</td><td>${arEsc(x.bezeichnung)}</td><td style="text-align:right">${x.anzahl}</td><td style="text-align:right">${x.laenge===null?"–":arMm(x.laenge)}</td><td class="small">${arEsc(x.bemerkung)}</td></tr>`).join("")}</tbody></table></div>
${AR_FASSADEN_HINWEIS[arA.fassade]?`<div class="small" style="margin-top:8px">${arEsc(AR_FASSADEN_HINWEIS[arA.fassade])}</div>`:""}`;
}
function arAusmassHtml(){
 const z=arAusmassZeilen();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst die Masse erfassen.</div>`;
 const m=findMeasurementMaterial(arA.material);
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe.</div>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${arEsc(x.bezeichnung)}</td><td>${arEsc(x.menge)}</td><td>${arEsc(x.einheit)}</td><td class="small">${arEsc(x.herkunft)}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:14px">Material</h2>
${m?`<div class="ra-ok">${arEsc(m.name)}</div>`:`<div class="ra-warnung">Es ist noch kein Material gewählt.</div>`}`;
}
function arKontrolleHtml(){
 const m=arPruefungen(),g=arErgebnis();
 const mat=findMeasurementMaterial(arA.material);
 const fa=AR_FASSADEN.find(x=>x[0]===arA.fassade);
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td>${arEsc(mat?mat.name:"kein Material gewählt")}</td></tr>
<tr><td>Fassade</td><td>${arEsc(fa?fa[1]:"–")}</td></tr>
<tr><td>Bogenwinkel</td><td>${g.alpha?g.alpha+"°":"–"}</td></tr>
<tr><td>Zwischenstück</td><td>${g.halsOk?arMm(g.sZu)+" mm":"–"}</td></tr>
<tr><td>Rohrvorschlag</td><td>${g.vorschlag?(g.vorschlag.ganze+" × "+g.vorschlag.laenge/1000+" m"+(g.vorschlag.rest>0?" + Reststück "+arMm(g.vorschlag.rest)+" mm":"")):"–"}</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>`<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${arEsc(x.text)}</div>`).join("")+`</div>`;
}
function arAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function arSetzeSchritt(n){
 arSchritt=Math.max(1,Math.min(AR_REGISTER.length,Number(n)||1));
 renderAblaufrohrAufnahme();
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("ar_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function arRegisterHtml(){
 const pr=arPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length,warn=pr.length-fehler;
 return raFortschrittHtml(arSchritt,AR_REGISTER.length)+`<div class="ra-register" id="ar_register">`+AR_REGISTER.map(r=>{
  const marke=r.nr===AR_KONTROLLE&&(fehler||warn)
   ?`<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===arSchritt?" aktiv":""}" data-ar-schritt="${r.nr}"><span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${arEsc(r.kurz)}</span>${marke}${raRegisterHakenHtml(arBestaetigt,r.nr)}</button>`;
 }).join("")+`</div>`;
}
function arKopfInhalt(){
 if(arSchritt===1)return arKarte("1 · Grunddaten",arGrunddatenHtml());
 if(arSchritt===2)return arKarte("2 · Masse",arMasseHtml());
 if(arSchritt===3)return arKarte("3 · Schwanenhals",arHalsHtml());
 if(arSchritt===4)return arKarte("4 · Rohre",arBerechnungHtml());
 if(arSchritt===5)return arKarte("5 · Ausmass und Material",arAusmassHtml());
 return arKarte("6 · Kontrolle",arKontrolleHtml());
}
function renderAblaufrohrAufnahme(){
 const ziel=$("ablaufrohrAufnahme");
 if(!ziel)return;
 arVerdrahten();
 arZeichnet=true;
 try{
  ziel.innerHTML=arRegisterHtml()+arKopfInhalt()+`<div class="bar ra-blaettern">
<button type="button" class="gray" id="ar_zurueck"${arSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="ar_weiter">${arSchritt>=AR_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+arEsc(AR_REGISTER[arSchritt].kurz)}</button>
</div>`;
 }finally{arZeichnet=false}
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("ar_register"),aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(),ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Live-Aktualisierung ohne Neuzeichnen der Eingabefelder (der Fokus bleibt)
function arLive(){
 const l=$("ar_live");if(l)l.innerHTML=arLiveHtml();
 const f=$("ar_fassadeHinweis");if(f)f.textContent=AR_FASSADEN_HINWEIS[arA.fassade]||"";
 const pr=arPruefungen(),fehler=pr.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#ar_register [data-ar-schritt="'+AR_KONTROLLE+'"]');
 if(knopf){
  const alt=knopf.querySelector(".ra-register-punkt");
  if(alt)alt.remove();
  if(pr.length){const s=document.createElement("span");s.className="ra-register-punkt"+(fehler?" fehler":"");knopf.appendChild(s)}
 }
}
function arVerdrahten(){
 const wurzel=$("measTypeAblaufrohr");
 if(!wurzel||wurzel.dataset.arVerdrahtet)return;
 wurzel.dataset.arVerdrahtet="1";
 const felder={ar_ausladung:"ausladung",ar_wandabstand:"wandabstand",ar_hoehe:"hoehe",ar_sockel:"sockel",ar_schiebe:"schiebestueck",ar_abzug:"bogenAbzug",ar_rohrSteckung:"rohrSteckung",ar_schiebeZugabe:"schiebeZugabe"};
 wurzel.addEventListener("input",e=>{
  if(arZeichnet)return;
  const t=e.target;
  if(felder[t.id]===undefined)return;
  arA[felder[t.id]]=t.value===""?"":Math.max(0,arZ(t.value));
  arLive();
 });
 wurzel.addEventListener("change",e=>{
  if(arZeichnet)return;
  const t=e.target,d=t.dataset||{};
  if(t.id==="ar_material"){arA.material=t.value;renderAblaufrohrAufnahme();return}
  if(t.id==="ar_fassade"){arA.fassade=AR_FASSADEN.some(x=>x[0]===t.value)?t.value:"";arLive();return}
  if(t.id==="ar_winkel"){arA.bogenwinkel=t.value===""?"":Number(t.value);arLive();return}
  if(d.arRohr!==undefined){
   const l=Number(d.arRohr);
   const cur=new Set(arRohrlaengenWahl(arA));
   if(t.checked)cur.add(l);else cur.delete(l);
   arA.rohrlaengen=AR_ROHRLAENGEN.filter(x=>cur.has(x));
   arLive();return;
  }
 });
 wurzel.addEventListener("click",e=>{
  const reg=e.target.closest("[data-ar-schritt]");
  if(reg){arSetzeSchritt(reg.dataset.arSchritt);return}
  const b=e.target.closest("button");
  if(!b)return;
  if(b.id==="ar_zurueck"){arSetzeSchritt(arSchritt-1);return}
  if(b.id==="ar_weiter"){
   if(!pflichtPruefenUndSpringen(wurzel))return;
   arBestaetigt.add(arSchritt);
   if(arSchritt>=AR_REGISTER.length)arAbschluss();else arSetzeSchritt(arSchritt+1);
  }
 });
}

// ---- Speichern / Laden --------------------------------------------------------
function arDaten(){
 const a=arA,g=arErgebnis();
 return {
  material:a.material,fassade:a.fassade,
  ausladung:a.ausladung,wandabstand:a.wandabstand,bogenwinkel:a.bogenwinkel,hoehe:a.hoehe,sockel:a.sockel,
  schiebestueck:a.schiebestueck,bogenAbzug:g.abzug,rohrSteckung:g.steckung,schiebeZugabe:g.schiebeZugabe,rohrlaengen:arRohrlaengenWahl(a),
  versatz:arRund1(g.D),zwischenstueck:arRund1(g.sZu),zwischenstueckAchse:arRund1(g.sAchse),hoeheHals:arRund1(g.hHals),
  fallrohr:arRund1(g.fallRohr),gesamtHoehe:arRund1(g.gesamtHoehe),
  optionen:g.optionen.map(o=>({...o})),vorschlag:g.vorschlag?{...g.vorschlag}:null,
  stueckliste:arStueckliste(g),ausmass:arAusmassZeilen(),kontrolle:arPruefungen()
 };
}
function arZuruecksetzen(){
 arA=arLeer();arSchritt=1;arBestaetigt=new Set();
 renderAblaufrohrAufnahme();
}
function arFuellen(d){
 const w=d||{};
 const a=arLeer();
 a.material=w.material??"";
 a.fassade=AR_FASSADEN.some(x=>x[0]===w.fassade)?w.fassade:"";
 ["ausladung","wandabstand","hoehe","sockel","schiebestueck","bogenAbzug","rohrSteckung","schiebeZugabe"].forEach(k=>{if(arHat(w[k]))a[k]=arZ(w[k])});
 if(AR_BOGENWINKEL.includes(arZ(w.bogenwinkel)))a.bogenwinkel=arZ(w.bogenwinkel);
 if(Array.isArray(w.rohrlaengen))a.rohrlaengen=AR_ROHRLAENGEN.filter(l=>w.rohrlaengen.map(Number).includes(l));
 arA=a;arSchritt=1;
 arBestaetigt=arPruefungen().some(x=>x.art==="fehler")?new Set():new Set(AR_REGISTER.filter(r=>r.nr!==AR_KONTROLLE).map(r=>r.nr));
 renderAblaufrohrAufnahme();
}

// ---- Ausdruck (PDF) ------------------------------------------------------------
// Gedruckt wird der gespeicherte Datensatz - ein einmal gedrucktes Blatt bleibt gleich.
function arDruckHtml(m,kopfHtml){
 const d=m.data||{};
 const cell=(label,val)=>`<td><label>${arEsc(label)}</label><div class="val">${val}</div></td>`;
 const g=berechneAblaufrohr(d);
 const matName=arEsc((findMeasurementMaterial(d.material)||{}).name||"–");
 const fa=AR_FASSADEN.find(x=>x[0]===d.fassade);
 const sl=Array.isArray(d.stueckliste)?d.stueckliste:arStueckliste(g);
 const opt=(Array.isArray(d.optionen)?d.optionen:g.optionen).map(o=>`<tr><td>${o.laenge/1000} m${o.vorschlag?" (Vorschlag)":""}</td><td>${o.ganze}</td><td>${o.rest>0?arMm(o.rest):"–"}</td><td>${o.verschnitt>0?arMm(o.verschnitt):"0"}</td><td>${o.rohre}</td></tr>`).join("");
 return `${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Material",matName)}${cell("Fassade",arEsc(fa?fa[1]:"–"))}</tr>
<tr>${cell("Ausladung Schwanenhals",arMm(d.ausladung)+" mm")}${cell("Wandabstand",arMm(d.wandabstand)+" mm")}</tr>
<tr>${cell("Bogenwinkel",arEsc(d.bogenwinkel)+"°")}${cell("Abzug je Bogen",arMm(d.bogenAbzug)+" mm")}</tr>
<tr>${cell("Steckung je Rohr",arMm(d.rohrSteckung)+" mm")}${cell("Steckungszugabe Schiebestück",arMm(d.schiebeZugabe)+" mm")}</tr>
<tr>${cell("Höhe Stutzen bis Unterkant Sockelrohr",arMm(d.hoehe)+" mm")}${cell("Höhe Sockelrohr",arMm(d.sockel)+" mm")}</tr>
<tr>${cell("Schiebestück",arMm(d.schiebestueck)+" mm")}${cell("Zwischenstück Schwanenhals",arMm(d.zwischenstueck)+" mm")}</tr>
<tr>${cell("Höhe Schwanenhals",arMm(d.hoeheHals)+" mm")}${cell("Fallrohr (Rohre)",arMm(d.fallrohr)+" mm")}</tr>
</table>
<div class="eb-section-head">Skizze</div>
<div class="eb-diagram">${arPlanSvg(g)}</div>
<div class="eb-section-head">Stückliste</div>
<table class="eb-cutlist"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Anzahl</th><th>Länge (mm)</th><th>Bemerkung</th></tr></thead>
<tbody>${sl.map(x=>`<tr><td>${x.pos}</td><td>${arEsc(x.bezeichnung)}</td><td>${x.anzahl}</td><td>${x.laenge===null||x.laenge===undefined?"–":arMm(x.laenge)}</td><td>${arEsc(x.bemerkung)}</td></tr>`).join("")}</tbody></table>
${opt?`<div class="eb-section-head">Rohrlängen</div>
<table class="eb-cutlist"><thead><tr><th>Rohr</th><th>Ganze</th><th>Reststück (mm)</th><th>Verschnitt (mm)</th><th>Rohre</th></tr></thead><tbody>${opt}</tbody></table>`:""}
${AR_FASSADEN_HINWEIS[d.fassade]?`<div class="note" style="font-size:8pt;color:#68737d">${arEsc(AR_FASSADEN_HINWEIS[d.fassade])}</div>`:""}
${(Array.isArray(d.ausmass)&&d.ausmass.length)?`<div class="eb-section-head">Ausmass</div>
<table class="eb-cutlist"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th></tr></thead>
<tbody>${d.ausmass.map(z=>`<tr><td>${arEsc(z.pos)}</td><td>${arEsc(z.bezeichnung)}</td><td>${arEsc(z.menge)}</td><td>${arEsc(z.einheit)}</td></tr>`).join("")}</tbody></table>`:""}
${m.note?`<div class="eb-section-head">Notiz</div><div class="note">${arEsc(m.note)}</div>`:""}`;
}
