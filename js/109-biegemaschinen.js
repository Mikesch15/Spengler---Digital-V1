"use strict";
// ===========================================================================
// Biegemaschinen (v3.441) - die Maschinendaten der Biegeanalyse (js/108, js/110)
// ===========================================================================
// Je Maschine: Arbeitslaenge, Mindest-Klemmbreite, maximale Winkel nach oben/unten, Toleranz und die QUERSCHNITTE von Unterwange,
// Klemmwange und Biegewange (Polygone in mm; Biegekante = x 0, Tischoberkante = y 0, die Klemmwange wird fuer die Blechstaerke
// um t nach oben gesetzt). Die Werte pflegt der Betrieb unter Einstellungen -> Firma -> Biegemaschinen; sie gelten firmenweit
// (app_settings.massaufnahme_einstellungen, Schluessel sd_biegemaschinen, js/98). Es gibt KEINE erfundenen Standardwerte:
// ohne Maschine gibt es keine Biegeanalyse. Nur Administratoren sehen zusaetzlich die Beispiel-Testmaschine (klar als solche markiert).
// ===========================================================================

const BM_SCHLUESSEL="sd_biegemaschinen";
const BM_BEISPIEL=Object.freeze({
 id:"beispiel",name:"BEISPIEL – nicht eure Maschine (Test)",beispiel:true,geprueft:false,
 laenge_mm:3000,min_klemm_mm:30,max_winkel_auf:120,max_winkel_ab:100,toleranz_mm:0.3,
 // Unterwange: Block unter dem Tisch, Vorderseite nach hinten geneigt (Platz fuer Biegungen nach unten)
 unterwange:[[[-320,0],[0,0],[-14,-60],[-40,-200],[-320,-200]]],
 // Klemmwange: schmale Klinge (120 mm tief), vorn unten 45 Grad abgeschraegt - dahinter ist Platz fuer bereits gebogene Schenkel
 klemmwange:[[[-120,0],[0,0],[-60,60],[-60,260],[-120,260]]],
 // Biegewange: Arbeitsflaeche in der Tischebene (y 0), dreht buendig am Flansch um die Biegekante
 biegewange_auf:{teile:[[[3,-52],[3,-3],[7,0],[110,0],[110,-52]]],achse:[0,0]},
 biegewange_ab:{teile:[[[3,52],[3,3],[7,0],[110,0],[110,52]]],achse:[0,0]}
});
function bmLaden(){
 let w=null;
 try{w=JSON.parse(localStorage.getItem(BM_SCHLUESSEL)||"null")}catch(e){}
 const l=(w&&Array.isArray(w.maschinen))?w.maschinen.filter(x=>x&&typeof x==="object"):[];
 return {maschinen:l};
}
let bmDaten=bmLaden();
function bmNeueId(){return "m"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36)}
// Maschinen fuer die Auswahl in der Biegeanalyse
function bmListe(){
 const l=bmDaten.maschinen.slice();
 if(typeof isAdmin==="function"&&isAdmin())l.push(BM_BEISPIEL);
 return l;
}
function bmFinden(id){return bmListe().find(m=>String(m.id)===String(id))||null}

// ---- Vorschau des Querschnitts ---------------------------------------------------------
function bmVorschauSvg(m,breite){
 if(!m)return "";
 const polys=[];
 const add=(teile,farbe)=>(teile||[]).forEach(p=>{if(Array.isArray(p)&&p.length>=3)polys.push({p,farbe})});
 add(m.unterwange,"#8a97a3");add(m.klemmwange,"#6b7a88");
 if(m.biegewange_auf)add(m.biegewange_auf.teile,"#1769aa");
 if(m.biegewange_ab)add(m.biegewange_ab.teile,"#16845c");
 if(!polys.length)return '<div class="small">Noch keine Werkzeug-Querschnitte.</div>';
 const xs=[],ys=[];polys.forEach(o=>o.p.forEach(q=>{xs.push(Number(q[0])||0);ys.push(Number(q[1])||0)}));
 const x0=Math.min(...xs,-20),x1=Math.max(...xs,40),y0=Math.min(...ys,-20),y1=Math.max(...ys,40);
 const w=breite||320,s=Math.min((w-20)/(x1-x0),260/(y1-y0)),h=(y1-y0)*s+20;
 const X=x=>10+(x-x0)*s,Y=y=>10+(y1-y)*s;
 const pg=polys.map(o=>`<polygon points="${o.p.map(q=>X(Number(q[0])||0).toFixed(1)+","+Y(Number(q[1])||0).toFixed(1)).join(" ")}" fill="${o.farbe}" fill-opacity=".55" stroke="${o.farbe}" stroke-width="1"/>`).join("");
 return `<svg viewBox="0 0 ${w} ${h.toFixed(0)}" width="100%" style="max-width:${w}px;background:#fff;border:1px solid var(--card-line);border-radius:8px" role="img" aria-label="Querschnitt der Maschine">
<line x1="${X(x0)}" y1="${Y(0)}" x2="${X(x1)}" y2="${Y(0)}" stroke="#c4ccd4" stroke-dasharray="3 3"/><line x1="${X(0)}" y1="${Y(y0)}" x2="${X(0)}" y2="${Y(y1)}" stroke="#c4ccd4" stroke-dasharray="3 3"/>${pg}</svg>
<div class="small">Grau: Unter- und Klemmwange · Blau: Biegewange nach oben · Grün: nach unten · gestrichelt: Biegekante (x 0) und Tischoberkante (y 0).</div>`;
}

// ---- Einstellungen -> Firma -> Biegemaschinen (nur Administratoren) --------------------------
function bmWerkzeugeAlsText(m){
 const o={unterwange:m.unterwange||[],klemmwange:m.klemmwange||[],biegewange_auf:m.biegewange_auf||null,biegewange_ab:m.biegewange_ab||null};
 return JSON.stringify(o,null,1);
}
function bmKarteHtml(m,i){
 const f=(label,key,wert,schritt)=>`<div><label>${label}</label><input data-bm-feld="${key}" data-bm-i="${i}" type="${key==="name"?"text":"number"}" ${key==="name"?"":`step="${schritt||1}" min="0"`} value="${esc(wert==null?"":wert)}"></div>`;
 return `<div class="card bm-karte" data-bm-karte="${i}" style="margin:8px 0">
 <div class="grid">
  <div class="wide"><label>Name</label><input data-bm-feld="name" data-bm-i="${i}" value="${esc(m.name||"")}" placeholder="z. B. Jorns 6 m"></div>
  ${f("Arbeitslänge (mm)","laenge_mm",m.laenge_mm)}${f("Mindest-Klemmbreite (mm)","min_klemm_mm",m.min_klemm_mm)}
  ${f("Max. Winkel nach oben (°)","max_winkel_auf",m.max_winkel_auf)}${f("Max. Winkel nach unten (°)","max_winkel_ab",m.max_winkel_ab)}
  ${f("Toleranz Kollision (mm)","toleranz_mm",m.toleranz_mm,"0.1")}
 </div>
 <label style="margin-top:8px">Werkzeug-Querschnitte (JSON, mm)</label>
 <textarea data-bm-werkzeuge="${i}" rows="9" style="font-family:monospace;font-size:12px">${esc(bmWerkzeugeAlsText(m))}</textarea>
 <div class="small">Polygone: <code>[[x,y],…]</code>. Biegekante x&nbsp;0, Tischoberkante y&nbsp;0; die Klemmwange wird für die Blechstärke automatisch angehoben. Die <b>Arbeitsfläche der Biegewange</b> liegt in der Tischebene (y&nbsp;0; «auf»: Teile darunter, «ab»: darüber); sie dreht bündig am Flansch um die Biegekante. Optional: <code>achse</code> (Versatz der Drehachse, Standard [0,0]).</div>
 <div id="bmVorschau${i}" style="margin-top:8px">${bmVorschauSvg(m)}</div>
 <label class="ra-schalter" style="margin-top:8px"><input type="checkbox" data-bm-feld="geprueft" data-bm-i="${i}"${m.geprueft?" checked":""}> Werte mit der Herstellerzeichnung geprüft (sonst warnt die Analyse)</label>
 <div class="bar"><button type="button" class="red" data-bm-weg="${i}">Maschine löschen</button></div>
 <div class="small" data-bm-meldung="${i}" style="color:var(--red)"></div>
</div>`;
}
function bmEinstellungenZeichnen(){
 const ziel=$("protectedContent");
 if(!ziel)return;
 let sec=$("bmAbschnitt");
 if(!sec){
  ziel.insertAdjacentHTML("afterbegin",`<div class="settings-section" data-section="biegemaschinen" id="bmAbschnitt">
<div class="settings-section-head" data-toggle-section="biegemaschinen"><h2>🔧 Biegemaschinen</h2><span class="settings-section-chevron">›</span></div>
<div class="settings-section-body" id="bmAbschnittBody"></div></div>`);
  sec=$("bmAbschnitt");
 }
 const body=$("bmAbschnittBody");
 if(!body)return;
 body.innerHTML=`<div class="small" style="margin-bottom:8px">Die Maschinen für die <b>Biegeanalyse</b> (Freies Profil → Zeichnung). Ohne Maschine gibt es keine Analyse. Es gibt keine Standardwerte – die Querschnitte kommen aus der Herstellerzeichnung. Gilt für die ganze Firma.</div>
${bmDaten.maschinen.map(bmKarteHtml).join("")||'<div class="empty">Noch keine Maschine eingetragen.</div>'}
<div class="bar"><button type="button" class="gray" id="bmNeu">＋ Leere Maschine</button><button type="button" class="gray" id="bmVorlage">＋ Aus der Beispiel-Vorlage</button><button type="button" class="green" id="bmSpeichern">💾 Speichern</button></div>`;
}
// Liest die Karten aus der Oberflaeche. Gibt {ok,maschinen,fehler:[{i,text}]} zurueck.
function bmAusFormular(){
 const fehler=[],l=[];
 document.querySelectorAll("#bmAbschnittBody [data-bm-karte]").forEach(karte=>{
  const i=Number(karte.getAttribute("data-bm-karte"));
  const alt=bmDaten.maschinen[i]||{};
  const m={id:alt.id||bmNeueId()};
  karte.querySelectorAll("[data-bm-feld]").forEach(e=>{
   const k=e.getAttribute("data-bm-feld");
   if(k==="name")m.name=e.value.trim();
   else if(k==="geprueft")m.geprueft=!!e.checked;
   else m[k]=e.value===""?"":Number(e.value);
  });
  const ta=karte.querySelector("[data-bm-werkzeuge]");
  let w=null;
  try{w=JSON.parse(ta.value)}catch(e){fehler.push({i,text:"Die Werkzeug-Querschnitte sind kein gültiges JSON ("+(e&&e.message||e)+")."})}
  if(w){
   m.unterwange=Array.isArray(w.unterwange)?w.unterwange:[];m.klemmwange=Array.isArray(w.klemmwange)?w.klemmwange:[];
   m.biegewange_auf=w.biegewange_auf||null;m.biegewange_ab=w.biegewange_ab||null;
   const f=typeof bgaMaschineFehler==="function"?bgaMaschineFehler(m):[];
   if(!m.name)f.unshift("Der Name fehlt.");
   f.forEach(t=>fehler.push({i,text:t}));
  }
  l.push(m);
 });
 return {ok:!fehler.length,maschinen:l,fehler};
}
async function bmSpeichern(){
 const r=bmAusFormular();
 document.querySelectorAll("#bmAbschnittBody [data-bm-meldung]").forEach(e=>{e.textContent=""});
 if(!r.ok){
  r.fehler.forEach(f=>{const e=document.querySelector(`#bmAbschnittBody [data-bm-meldung="${f.i}"]`);if(e)e.textContent=(e.textContent?e.textContent+" ":"")+f.text});
  appAlert("Nicht gespeichert: "+r.fehler.length+" Angabe(n) fehlen oder sind ungültig – siehe rote Zeilen.");
  return;
 }
 bmDaten={maschinen:r.maschinen};
 try{localStorage.setItem(BM_SCHLUESSEL,JSON.stringify(bmDaten))}catch(e){}
 bmEinstellungenZeichnen();
 if(typeof efMelden==="function")await efMelden(BM_SCHLUESSEL,"Biegemaschinen gespeichert");
}
document.addEventListener("click",e=>{
 const t=e.target&&e.target.closest?e.target.closest("#bmNeu,#bmVorlage,#bmSpeichern,[data-bm-weg]"):null;
 if(!t)return;
 if(t.id==="bmSpeichern"){bmSpeichern();return}
 // vor dem Hinzufuegen/Loeschen den Stand der Felder sichern (ohne Pflichtpruefung)
 const stand=bmAusFormular().maschinen;
 if(t.id==="bmNeu"){bmDaten={maschinen:stand.concat([{id:bmNeueId(),name:"",laenge_mm:"",min_klemm_mm:"",max_winkel_auf:"",max_winkel_ab:"",toleranz_mm:0.3,geprueft:false,unterwange:[],klemmwange:[],biegewange_auf:null,biegewange_ab:null}])}}
 else if(t.id==="bmVorlage"){const k=JSON.parse(JSON.stringify(BM_BEISPIEL));k.id=bmNeueId();k.name="Neue Maschine (aus Vorlage – Werte prüfen)";delete k.beispiel;k.geprueft=false;bmDaten={maschinen:stand.concat([k])}}
 else{const i=Number(t.getAttribute("data-bm-weg"));bmDaten={maschinen:stand.filter((x,j)=>j!==i)}}
 bmEinstellungenZeichnen();
 const sec=$("bmAbschnitt");if(sec)sec.classList.add("open");
});
// Vorschau aktualisieren, wenn die Querschnitte geaendert werden
document.addEventListener("input",e=>{
 const ta=e.target&&e.target.closest?e.target.closest("[data-bm-werkzeuge]"):null;
 if(!ta)return;
 const i=ta.getAttribute("data-bm-werkzeuge"),box=$("bmVorschau"+i);
 if(!box)return;
 try{const w=JSON.parse(ta.value);box.innerHTML=bmVorschauSvg({unterwange:w.unterwange,klemmwange:w.klemmwange,biegewange_auf:w.biegewange_auf,biegewange_ab:w.biegewange_ab})}
 catch(x){box.innerHTML='<div class="small" style="color:var(--red)">Kein gültiges JSON – die Vorschau bleibt leer.</div>'}
});
(function bmStart(){
 if(typeof renderSettings==="function"){
  const alt=renderSettings;
  renderSettings=function(){const r=alt.apply(this,arguments);try{bmEinstellungenZeichnen()}catch(e){}return r};
 }
})();
