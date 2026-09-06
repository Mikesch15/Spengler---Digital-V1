// ---------------------------------------------------------------------------
// v3.09  Projektweite Materialuebersicht
// ---------------------------------------------------------------------------
// Fuehrt zusammen, was die einzelnen Massaufnahmen eines Projekts ohnehin
// schon ausgerechnet und GESPEICHERT haben.
//
// ES WIRD NICHTS NEU GERECHNET (Auftrag Abschnitt 4). Quelle ist
// ausschliesslich data.ausmass, data.material und der gespeicherte
// Zuschnittplan jeder Massaufnahme - dieselben Werte, die auch das PDF
// druckt. Ein einmal gedrucktes Blatt und diese Uebersicht koennen deshalb
// nicht auseinanderlaufen.
//
// ES GIBT KEINE ZUSAETZLICHE ABFRAGE: die Massaufnahmen des Projekts stehen
// bereits in projectMeasurementsCache (loadProjectMeasurements laedt sie mit
// select("*")), das Material in measurementMaterials.
//
// ES WIRD KEIN MATERIAL HARDCODIERT: die Bezeichnung kommt ueber
// findMeasurementMaterial() aus der bestehenden Materialverwaltung.
//
// Sichtbar nur, wenn das Untermodul eingeschaltet ist - pmAktiv("material").
// ---------------------------------------------------------------------------

// Zahl aus einem gespeicherten Mengenwert. Die Module legen teils Zahlen
// ab, teils bereits formatierte Texte mit Komma ("2,66"). Was sich nicht
// als Zahl lesen laesst, bleibt Text und wird NICHT summiert.
function pmatZahl(v){
 if(typeof v==="number")return Number.isFinite(v)?v:null;
 if(typeof v!=="string")return null;
 const t=v.trim().replace(/[\s']/g,"").replace(",",".");
 if(!t||!/^-?\d+(\.\d+)?$/.test(t))return null;
 const z=Number(t);
 return Number.isFinite(z)?z:null;
}
function pmatFormat(z){
 if(z===null||z===undefined)return "-";
 const g=Math.round(z*1000)/1000;
 return (Number.isInteger(g)?String(g):g.toFixed(2)).replace(".",",");
}
// Name des Materials aus der bestehenden Verwaltung. Ohne Zuordnung wird
// nichts erfunden.
function pmatMaterialName(wert){
 if(typeof findMeasurementMaterial==="function"){
  const m=findMeasurementMaterial(wert);
  if(m&&m.name)return m.name;
 }
 return (wert===null||wert===undefined||wert==="")?"Ohne Material":String(wert);
}

// Der gespeicherte Zuschnittplan einer Massaufnahme. Die Module haben
// historisch zwei Feldnamen (rollen bzw. zuschnitt). Hier wird nur
// GELESEN, nichts umgerechnet.
function pmatPlanRoh(m){
 const d=(m&&m.data)||{};
 return d.rollen||d.zuschnitt||null;
}
// Die einzelnen Zuschnittstuecke eines gespeicherten Plans, mit ihrer
// Streifenbreite. Beide historischen Formen (gruppen bzw. flach) werden
// gelesen - dieselbe Unterscheidung wie zuPlanAusGespeichert() in js/33.
function pmatStuecke(m){
 const r=pmatPlanRoh(m); if(!r)return [];
 const raus=[];
 const ausStreifen=(st,breite)=>{
  (st||[]).forEach(s=>(s.stuecke||[]).forEach(x=>{
   const l=pmatZahl(x.laenge);
   if(l!==null&&l>0)raus.push({laenge:l,breite:pmatZahl(breite),
    merkmal:x.merkmal||"",hinweis:x.hinweis||"",nr:x.nr});
  }));
 };
 // Drei historische Formen, alle in echten Datensaetzen vorhanden:
 //   gruppen[]            - je Gruppe eine eigene Breite (Freies Profil,
 //                          Lukarne, Rinne, Kamin, Einfassung)
 //   streifen[]           - flach, eine Breite fuer alles (Einlaufblech)
 //   verteilung.streifen  - aeltere Fassung derselben flachen Form (Kehle)
 // Bei den flachen Formen steht die Breite entweder im Plan selbst
 // (rollen.abwicklung) oder daneben im Datensatz (data.abwicklung) - genau
 // die beiden Werte, die auch js/16 an zuDruckHtml() uebergibt.
 if(Array.isArray(r.gruppen)&&r.gruppen.length)r.gruppen.forEach(g=>ausStreifen(g.streifen,g.breite));
 else{
  const d=(m&&m.data)||{};
  const breite=(r.abwicklung!==undefined&&r.abwicklung!==null)?r.abwicklung
              :((d.abwicklung!==undefined&&d.abwicklung!==null)?d.abwicklung:null);
  ausStreifen(r.streifen||((r.verteilung&&r.verteilung.streifen)||[]),breite);
 }
 return raus;
}

// ---- Zusammenfuehren ------------------------------------------------------
// Aggregiert wird nur, was fachlich dasselbe ist: gleiches Material,
// gleiche Bezeichnung, gleiche Einheit. Die Bezeichnung der Module traegt
// die unterscheidenden Masse bereits in sich ("... Abwicklung 250 mm"),
// zwei verschiedene Abwicklungen werden dadurch von selbst nicht vermischt.
// Was sich nicht als Zahl lesen laesst, wird nicht summiert, sondern
// einzeln aufgefuehrt.
function pmatSammeln(liste){
 const gruppen=new Map();
 (liste||[]).forEach(m=>{
  const d=(m&&m.data)||{};
  const matName=pmatMaterialName(d.material);
  if(!gruppen.has(matName))gruppen.set(matName,{material:matName,positionen:new Map(),
    zuschnitte:new Map(),aufnahmen:new Map()});
  const g=gruppen.get(matName);
  g.aufnahmen.set(m.id,m);

  (Array.isArray(d.ausmass)?d.ausmass:[]).forEach(z=>{
   const bez=String(z.bezeichnung||"").trim();
   if(!bez)return;
   const einheit=String(z.einheit||"").trim();
   const zahl=pmatZahl(z.menge);
   const key=bez+"|"+einheit+"|"+(zahl===null?"text":"zahl");
   if(!g.positionen.has(key))g.positionen.set(key,{bezeichnung:bez,einheit,
     summe:zahl===null?null:0,texte:[],quellen:[]});
   const p=g.positionen.get(key);
   if(zahl===null)p.texte.push(String(z.menge===undefined?"":z.menge));
   else p.summe+=zahl;
   p.quellen.push({id:m.id,menge:z.menge,herkunft:z.herkunft||""});
  });

  pmatStuecke(m).forEach(s=>{
   const key=s.laenge+"|"+(s.breite||0)+"|"+(s.merkmal||"");
   if(!g.zuschnitte.has(key))g.zuschnitte.set(key,{laenge:s.laenge,breite:s.breite,
     merkmal:s.merkmal,anzahl:0,quellen:new Set()});
   const t=g.zuschnitte.get(key);
   t.anzahl++; t.quellen.add(m.id);
  });
 });
 return [...gruppen.values()].map(g=>({
  material:g.material,
  aufnahmen:[...g.aufnahmen.values()],
  positionen:[...g.positionen.values()],
  zuschnitte:[...g.zuschnitte.values()].sort((a,b)=>b.laenge-a.laenge)
 })).sort((a,b)=>a.material.localeCompare(b.material,"de"));
}

// ---- Anzeige --------------------------------------------------------------
function pmatQuelleText(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=(m.title||"").trim();
 return art+(t?" · "+t:"");
}
function pmatStatusBadge(m){
 if(typeof mwAktiv==="function"&&!mwAktiv())return "";
 if(m.freigabe_verfallen)return `<span class="mw-badge mw-rot">Freigabe verfallen</span>`;
 return (typeof mwBadge==="function")?mwBadge(m.workflow_status):"";
}
function pmatQuellenHtml(ids,alle){
 return `<div class="pmat-quellen">`+ids.map(id=>{
  const m=alle.find(x=>x.id===id);
  if(!m)return "";
  return `<button type="button" class="pmat-quelle" data-pmat-open="${esc(id)}">Massaufnahme: ${esc(pmatQuelleText(m))}</button>`;
 }).join("")+`</div>`;
}

function renderProjektMaterial(){
 const box=$("cockpitMaterialBody");
 if(!box)return 0;
 const karte=$("cockpitMaterialCard");
 const an=(typeof pmAktiv==="function")&&pmAktiv("material");
 if(karte)karte.hidden=!an;
 if(!an){box.innerHTML="";return 0}

 const liste=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
 const gruppen=pmatSammeln(liste);
 if($("cockpitMaterialCount"))$("cockpitMaterialCount").textContent=String(gruppen.length);
 if(!liste.length){
  box.innerHTML=`<div class="small">Noch keine Massaufnahme in diesem Projekt – es gibt deshalb noch kein Material.</div>`;
  return 0;
 }
 if(!gruppen.length){
  box.innerHTML=`<div class="small">Die Massaufnahmen dieses Projekts haben noch kein gespeichertes Ausmass.</div>`;
  return 0;
 }
 box.innerHTML=gruppen.map(g=>{
  const pos=g.positionen.map(p=>{
   const menge=p.summe===null?esc(p.texte.join(" · ")||"-"):pmatFormat(p.summe);
   const mehrfach=p.quellen.length>1;
   return `<tr>
    <td>${esc(p.bezeichnung)}</td>
    <td class="pmat-zahl">${menge}</td>
    <td>${esc(p.einheit)}</td>
    <td>${mehrfach?p.quellen.length+" Massaufnahmen":"1 Massaufnahme"}${
      p.summe!==null&&mehrfach?`<br><span class="small">${p.quellen.map(q=>esc(String(q.menge))).join(" + ")}</span>`:""}</td>
   </tr>`;
  }).join("");
  const zu=g.zuschnitte.length?`<div class="pmat-unter">Zuschnitte</div>
   <div class="scroll"><table class="eb-table pmat-tab"><thead><tr>
    <th>Zuschnitt (Länge × Breite)</th><th>Anzahl</th><th>Bearbeitung</th><th>Quelle</th></tr></thead><tbody>`+
   g.zuschnitte.map(t=>`<tr>
     <td>${esc(typeof zuMasse==="function"?zuMasse(t.laenge,t.breite):(t.laenge+" × "+(t.breite||"?")+" mm"))}</td>
     <td class="pmat-zahl">${t.anzahl}</td>
     <td>${esc(t.merkmal||"-")}</td>
     <td>${[...t.quellen].length} Massaufnahme${[...t.quellen].length===1?"":"n"}</td>
    </tr>`).join("")+`</tbody></table></div>`:"";
  return `<div class="pmat-gruppe">
   <div class="pmat-kopf"><b>${esc(g.material)}</b>
    <span class="small">${g.aufnahmen.length} Massaufnahme${g.aufnahmen.length===1?"":"n"}</span></div>
   ${pos?`<div class="scroll"><table class="eb-table pmat-tab"><thead><tr>
     <th>Position</th><th>Menge</th><th>Einheit</th><th>Quelle</th></tr></thead><tbody>${pos}</tbody></table></div>`
    :`<div class="small">Kein gespeichertes Ausmass.</div>`}
   ${zu}
   <div class="pmat-unter">Massaufnahmen dieses Materials</div>
   ${pmatQuellenHtml(g.aufnahmen.map(m=>m.id),g.aufnahmen)}
   <div class="pmat-status">${g.aufnahmen.map(m=>{
     const b=pmatStatusBadge(m);
     return b?`<span class="pmat-statuszeile">${esc(pmatQuelleText(m))} ${b}</span>`:"";
    }).join("")}</div>
  </div>`;
 }).join("");
 return gruppen.length;
}

// Von einer Materialposition zur verursachenden Massaufnahme (Auftrag
// Abschnitt 4 und 16: keine Sackgassen). Geoeffnet wird ueber den
// bestehenden Weg, es gibt keine zweite Oeffnungslogik.
if($("cockpitMaterialBody")){
 $("cockpitMaterialBody").addEventListener("click",e=>{
  const b=e.target.closest?e.target.closest("[data-pmat-open]"):null;
  if(!b)return;
  const id=Number(b.dataset.pmatOpen);
  const m=(projectMeasurementsCache||[]).find(x=>x.id===id);
  if(!m)return;
  measEditReturnTo="projectCockpit";
  if(typeof openMeasurement==="function")openMeasurement(m);
 });
}
