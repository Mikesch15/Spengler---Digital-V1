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
// v3.25: Der gespeicherte Zuschnittplan EINER Massaufnahme, in der Form, die
// zuListeHtml()/zuschnittHtml() erwarten. Gerechnet wird nichts - genommen
// wird, was beim Speichern abgelegt wurde.
//
// Diese Rechnung stand bis v3.24 ZWEIMAL byteweise gleich da: als
// werkZuschnittPlan() in js/51 und als rlPlan() in js/58. Mit der Seite
// "Material & Zuschnitt" waere sie ein drittes Mal noetig geworden. Sie
// liegt deshalb jetzt EINMAL hier, wo auch pmatPlanRoh und pmatStuecke
// wohnen; die beiden alten Namen sind nur noch Durchreichen.
//
// erledigtFuer sagt js/33, dass hier abgehakt werden darf: es ist genau eine
// Aufnahme mit ihren eigenen Stuecknummern (siehe CLAUDE.md 120.4 - der
// projektweite Sammelplan traegt sammel:true und darf es nicht).
function pmatPlanFuer(m){
 if(typeof zuPlanAusGespeichert!=="function")return null;
 const r=pmatPlanRoh(m); if(!r)return null;
 const d=(m&&m.data)||{};
 const breite=(r.abwicklung!==undefined&&r.abwicklung!==null)?r.abwicklung
             :((d.abwicklung!==undefined&&d.abwicklung!==null)?d.abwicklung:null);
 const p=zuPlanAusGespeichert(r,breite,"Stück");
 if(!p||!(p.gruppen||[]).length)return null;
 p.erledigtFuer=(m&&m.id!==undefined)?m.id:null;
 // v3.26: Woher der Plan stammt - fuer die Herkunft eines eingelagerten
 // Restes (js/42). Reine Zusatzangabe, die Rechnung beruehrt sie nicht.
 p.projektFuer=(m&&m.project_id!==undefined)?m.project_id:null;
 // v3.31: die Materialstaerke dieser Massaufnahme. Sie macht den Bedarf
 // eindeutig und wandert an einen eingelagerten Rest mit. Ausdruecklich
 // immer gesetzt - auch als null, damit sich "nicht erfasst" von "gehoert
 // zu keiner einzelnen Massaufnahme" unterscheiden laesst (js/42).
 p.staerkeFuer=(m&&m.staerke_mm!==undefined)?m.staerke_mm:null;
 // v3.31: plan.material ist die Material-ID - genau wie in den zwoelf
 // Modulen. Bis v3.30 stand hier der NAME, und restBlockHtml() (js/42)
 // bekam ihn als "materialId": restNummer("Titanzink") ist null, der
 // Restabgleich meldete deshalb auf der Seite "Material & Zuschnitt" und in
 // der Werkstatt immer "kein Material gewaehlt". Gemessen, nicht vermutet.
 // Der lesbare Name steht jetzt daneben.
 p.material=(d.material===undefined)?null:d.material;
 p.materialName=pmatMaterialName(d.material);
 // v3.31: Material und Staerke fuer die Anzeige - eine Stelle fuer
 // Werkstatt und Ruestliste.
 // v3.33: dazu Rolle oder Tafel - der Betrieb muss beim Ruesten sehen, WORAUS
 // geschnitten wird. Das Wort kommt aus ZU_WORT (js/33), es gibt keine zweite
 // Schreibweise; p.form hat zuPlanAusGespeichert() aus dem Datensatz gelesen.
 const formWort=(typeof zuWort==="function")?zuWort(p).kopf:"";
 p.materialText=[p.materialName,(typeof measStaerkeText==="function")?measStaerkeText(p.staerkeFuer):"",formWort]
   .filter(x=>x&&x!=="Ohne Material").join(" · ");
 return p;
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
 // v3.29: die Stuecke, die aus einem vorhandenen Rest geschnitten werden.
 // Sie stehen nicht in den Streifen - die Rolle wurde ohne sie gerechnet.
 // Sie muessen trotzdem geschnitten und abgehakt werden, sonst waere der
 // Stand "7 von 12" falsch und Ruestliste wie Werkstatt liessen sie weg.
 (r.ausResten||[]).forEach(x=>(x.stuecke||[]).forEach(st=>{
  const l=pmatZahl(st.laenge);
  if(l!==null&&l>0)raus.push({laenge:l,breite:pmatZahl(x.abwicklung),
   merkmal:st.merkmal||"",hinweis:st.hinweis||"",nr:st.nr,ausRestId:x.id||null});
 }));
 return raus;
}

// ---- Rueckfall fuer Datensaetze aus der Zeit vor v3.17 --------------------
// Seit v3.17 sagt das Modul an jeder Ausmass-Zeile selbst, ob sie ein Teil
// ist (teil:true) oder ein abgeleitetes Mass. Ein Datensatz, der VOR v3.17
// gespeichert wurde, traegt das Feld nicht - und die App darf dann weder
// raten noch alles mitnehmen (dann steht die Reservierungsliste wieder voll
// mit Abwicklungen und Flaechen).
//
// Sie kann es aber wissen, OHNE zu raten: die Bezeichnungen erzeugt das
// Modul selbst, und welche davon Teile sind, steht in genau demselben Modul
// eine Zeile weiter. Diese Tabelle ist deshalb keine geratene Namensliste,
// sondern dieselbe Aussage, nur nach dem Typ abgefragt.
//
// DIE WAHRHEIT BLEIBT DAS FELD AM DATENSATZ. Der Rueckfall greift
// ausschliesslich, wenn es fehlt.
//
// Damit die Tabelle nicht still auseinanderlaeuft, wenn jemand eine
// Bezeichnung umformuliert, haelt pruefstand-rueckfall-v3-18 sie gegen die
// echten Ausmass-Funktionen aller elf Module: jede Zeile, die ein Modul
// heute erzeugt, muss hier dieselbe Antwort bekommen wie ihr teil-Feld.
const PMAT_TEIL_RUECKFALL={
 // Jede Komponente einer Rinne wird beschafft - Rinne nach Metern, Halter,
 // Winkel, Stutzen, Rinnenboeden, Dehnungsstuecke (js/28).
 rinne_halbrund:       ()=>true,
 einlaufblech_gerade:  b=>b==="Haltebleche (GAVA Blech)",
 mauerabdeckung:       b=>b==="Schieber"||b==="Boden",
 kamineinfassung:      b=>b==="Bleilappen",
 einfassung_rund:      b=>b==="Bleilappen",
 anschlussblech:       b=>b==="Bleilappen"||/ \(eigenes Material\)$/.test(b),
 // Diese fuenf rechnen nur Masse und Zaehlungen - dort ist der Zuschnitt
 // das Ganze, es wird nichts zusaetzlich beschafft.
 einlaufblech_konisch: ()=>false,
 freies_profil:        ()=>false,
 kehle:                ()=>false,
 lukarne:              ()=>false,
 rinne:                ()=>false,
 // Skizze/Foto rechnet gar nichts und hat kein Ausmass.
 skizze_foto:          ()=>false
};
// true/false wenn der Typ bekannt ist, sonst undefined - ein kuenftiger
// dreizehnter Typ wird nicht geraten, sondern bleibt unbekannt.
function pmatTeilRueckfall(type,bezeichnung){
 const f=PMAT_TEIL_RUECKFALL[String(type||"")];
 if(typeof f!=="function")return undefined;
 return f(String(bezeichnung||"").trim())===true;
}
// Die EINE Stelle, an der beantwortet wird, ob eine gespeicherte
// Ausmass-Zeile ein Teil ist. Zuerst das Feld am Datensatz, sonst der
// Rueckfall des Typs. pmatSammeln und die Reservierung (js/50) fragen
// beide hier - sonst koennten sie auseinanderlaufen.
function pmatTeilVon(m,z){
 const t=z&&z.teil;
 if(t===true||t===false)return t;
 return pmatTeilRueckfall(m&&m.type,z&&z.bezeichnung);
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
     summe:zahl===null?null:0,texte:[],quellen:[],teil:undefined});
   const p=g.positionen.get(key);
   if(zahl===null)p.texte.push(String(z.menge===undefined?"":z.menge));
   else p.summe+=zahl;
   p.quellen.push({id:m.id,menge:z.menge,herkunft:z.herkunft||""});
   // v3.17: teil sagt, ob die Zeile ein Teil ist, das beschafft wird
   // (Halbfabrikat, gekaufter Artikel), oder ein abgeleitetes Mass. Die
   // Reservierung nimmt nur Teile - die Zuschnitte stehen ohnehin schon
   // getrennt darunter.
   //   true      mindestens eine Quelle sagt ausdruecklich "Teil"
   //   false     alle Quellen sagen ausdruecklich "abgeleitet"
   //   undefined weder das Feld noch der Rueckfall wissen es - die App
   //             RAET dann nicht (nur bei einem unbekannten Typ moeglich).
   // v3.18: fehlt das Feld (Datensatz vor v3.17), fragt sie den Rueckfall
   // ihres Typs. Das ist dieselbe Aussage des Moduls, nur nach dem Typ
   // abgefragt - siehe PMAT_TEIL_RUECKFALL.
   const teil=pmatTeilVon(m,z);
   if(teil===true)p.teil=true;
   else if(teil===false){if(p.teil===undefined&&!p.unbekannt)p.teil=false}
   else {p.unbekannt=true; if(p.teil!==true)p.teil=undefined}
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
 if(typeof cockpitModulStand==="function")cockpitModulStand();
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
