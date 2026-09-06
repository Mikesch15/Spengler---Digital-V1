// ---------------------------------------------------------------------------
// v3.09  Versionierung der Massaufnahme und Versionsvergleich
// ---------------------------------------------------------------------------
// Auftrag Abschnitt 13, 14 und 15.
//
// Eine Fassung entsteht GENAU DANN, wenn eine Massaufnahme freigegeben wird -
// das ist der Zeitpunkt, ab dem ein Stand fuer Zuschnitt und Ruesten
// verbindlich ist. Geschrieben wird ausschliesslich serverseitig innerhalb
// von measurement_freigeben(); der Client kann keine Fassung erfinden und
// keine bestehende aendern (kein INSERT/UPDATE/DELETE-Recht auf der Tabelle).
//
// Abschnitt 13: die bestehende v3.06-Regel bleibt die Grundlage. Aendert
// sich nach der Freigabe etwas Wesentliches, verfaellt sie, der Status faellt
// auf "In Bearbeitung" zurueck, und die naechste Freigabe erzeugt Fassung
// N+1. Es gibt hier KEINE zweite Freigabelogik - dieses Modul liest nur.
//
// Abschnitt 15: solange die Freigabe verfallen ist, sagt die Ansicht
// ausdruecklich, dass die letzte Fassung nicht mehr dem aktuellen Stand
// entspricht. In der Werkstattansicht steht dieselbe Warnung an der Zeile.
//
// Abschnitt 14 - keine Scheingenauigkeit: verglichen werden ausschliesslich
// die flachen Felder, die auch der Aenderungsverlauf seit v2.34 kennt
// (VERLAUF_FIELD_LABELS.measurement). Fuer Listen (Stuecke, Segmente,
// Scharen) und fuer verschachtelte Werte (Zuschnittplan, Ausmass) wird
// NICHT so getan, als liesse sich Feld fuer Feld vergleichen - dort steht,
// DASS sich etwas geaendert hat, und bei Listen zusaetzlich die Anzahl.
// Werte ohne eigene Bezeichnung werden mit ihrem technischen Namen genannt,
// statt ihnen eine erfundene deutsche Bezeichnung zu geben.
// ---------------------------------------------------------------------------

let verCache=[];          // Fassungen der gerade geoeffneten Massaufnahme
let verFehler=null;
let verLauf=0;
let verMessungId=null;
let verOffen=null;        // welche Fassung gerade aufgeklappt verglichen wird

function verAktiv(){ return typeof pmAktiv==="function"&&pmAktiv("versionierung") }

function verZeit(iso){
 if(!iso)return "–";
 const d=new Date(iso);
 if(isNaN(d))return "–";
 return d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}

// ---- Laden ----------------------------------------------------------------
// Kein company_id-Filter im Client: die Firmengrenze erzwingt allein die
// restriktive tenant_boundary_measurement_versionen-Policy.
async function verLaden(messungId){
 verFehler=null; verMessungId=messungId||null;
 if(!verAktiv()||!messungId){verCache=[];return}
 const lauf=++verLauf;
 const {data,error}=await sb.from("measurement_versionen")
  .select("id,measurement_id,nummer,type,title,project_id,data,freigegeben_von,freigegeben_am")
  .eq("measurement_id",messungId)
  .order("nummer",{ascending:false});
 if(lauf!==verLauf)return;
 if(error){verFehler=error.message;verCache=[];return}
 verCache=data||[];
}

// ---- Vergleich ------------------------------------------------------------
// Liefert eine Liste {feld,label,art,alt,neu,text}. "art" sagt, wie genau der
// Vergleich ist: "wert" = echter Feldvergleich, "liste"/"struktur" = nur die
// Aussage, DASS sich etwas geaendert hat.
function verVergleich(altData,neuData){
 const a=(altData&&typeof altData==="object")?altData:{};
 const b=(neuData&&typeof neuData==="object")?neuData:{};
 const labels=(typeof VERLAUF_FIELD_LABELS==="object"&&VERLAUF_FIELD_LABELS.measurement)||{};
 const schluessel=[...new Set(Object.keys(a).concat(Object.keys(b)))].sort();
 const raus=[];
 const wert=v=>(typeof verlaufFormatDiffValue==="function")?verlaufFormatDiffValue("",v):String(v??"–");
 schluessel.forEach(k=>{
  const x=a[k], y=b[k];
  if(JSON.stringify(x??null)===JSON.stringify(y??null))return;
  const label=labels[k]||null;
  if(Array.isArray(x)||Array.isArray(y)){
   const nx=Array.isArray(x)?x.length:0, ny=Array.isArray(y)?y.length:0;
   raus.push({feld:k,label:label,art:"liste",alt:nx,neu:ny,
     text:nx===ny?("Liste geändert ("+nx+" Einträge)"):("Liste geändert ("+nx+" → "+ny+" Einträge)")});
   return;
  }
  if((x&&typeof x==="object")||(y&&typeof y==="object")){
   raus.push({feld:k,label:label,art:"struktur",alt:null,neu:null,text:"geändert"});
   return;
  }
  const fx=(typeof verlaufFormatDiffValue==="function")?verlaufFormatDiffValue(k,x):wert(x);
  const fy=(typeof verlaufFormatDiffValue==="function")?verlaufFormatDiffValue(k,y):wert(y);
  raus.push({feld:k,label:label,art:"wert",alt:x,neu:y,text:fx+" → "+fy});
 });
 return raus;
}

function verVergleichHtml(liste){
 if(!liste.length)return `<div class="small" style="color:var(--muted)">Keine Unterschiede.</div>`;
 const benannt=liste.filter(z=>z.label);
 const ohne=liste.filter(z=>!z.label);
 let html=benannt.map(z=>`<div class="ver-diff-zeile">
   <span class="ver-diff-label">${esc(z.label)}</span>
   <span class="ver-diff-wert">${esc(z.text)}</span></div>`).join("");
 if(ohne.length){
  // Keine erfundene deutsche Bezeichnung: die technischen Namen stehen so
  // da, wie sie gespeichert sind (Auftrag Abschnitt 14).
  html+=`<div class="small" style="color:var(--muted);margin-top:6px">`
   +`Ohne eigene Bezeichnung geändert (meist abgeleitete Werte): `
   +esc(ohne.map(z=>z.feld+(z.art==="liste"?" ("+z.alt+" → "+z.neu+")":"")).join(", "))+`</div>`;
 }
 return html;
}

// ---- Anzeige in der Massaufnahme ------------------------------------------
function renderMeasVersionen(){
 const box=$("measVersionenBereich"), inhalt=$("measVersionenBody");
 if(!box||!inhalt)return;
 if(!verAktiv()||!currentMeasurementId){box.hidden=true;inhalt.innerHTML="";return}
 box.hidden=false;
 if(verFehler){
  inhalt.innerHTML=`<div class="small" style="color:var(--red)">Fassungen konnten nicht geladen werden: ${esc(verFehler)}</div>`;
  return;
 }
 const stand=(typeof mwStand!=="undefined")?mwStand:null;
 const verfallen=!!(stand&&stand.freigabe_verfallen);
 const letzte=verCache[0]||null;

 let kopf="";
 if(!letzte){
  kopf=`<div class="small" style="color:var(--muted)">Noch keine Fassung – sie entsteht mit der ersten Freigabe.</div>`;
 }else if(verfallen){
  // Auftrag Abschnitt 15: hier darf nichts unbemerkt weiterlaufen.
  kopf=`<div class="mw-warnung"><b>Fassung ${letzte.nummer} ist nicht mehr aktuell.</b><br>
   Die Massaufnahme wurde nach der Freigabe geändert. Zuschnitt und Rüsten dürfen
   nicht auf dieser Fassung weiterlaufen – erst die erneute Freigabe erzeugt
   Fassung ${letzte.nummer+1}.</div>`;
 }else{
  kopf=`<div class="small">Verbindlich ist <b>Fassung ${letzte.nummer}</b>,
   freigegeben von ${esc(verPerson(letzte.freigegeben_von))} am ${esc(verZeit(letzte.freigegeben_am))}.</div>`;
 }

 const zeilen=verCache.map((v,i)=>{
  const vorher=verCache[i+1]||null;
  const knoepfe=[];
  knoepfe.push(`<button type="button" class="gray" data-ver-jetzt="${v.nummer}">Mit dem aktuellen Stand vergleichen</button>`);
  if(vorher)knoepfe.push(`<button type="button" class="gray" data-ver-vorher="${v.nummer}">Mit Fassung ${vorher.nummer} vergleichen</button>`);
  const offen=verOffen&&verOffen.nummer===v.nummer;
  return `<div class="ver-zeile">
   <div class="ver-kopf"><b>Fassung ${v.nummer}</b>
    <span class="small" style="color:var(--muted)">${esc(verPerson(v.freigegeben_von))} · ${esc(verZeit(v.freigegeben_am))}</span></div>
   <div class="ver-akt">${knoepfe.join("")}</div>
   ${offen?`<div class="ver-diff"><div class="small"><b>${esc(verOffen.titel)}</b></div>${verVergleichHtml(verOffen.liste)}</div>`:""}
  </div>`;
 }).join("");

 inhalt.innerHTML=`${kopf}<div class="ver-liste">${zeilen}</div>`;
}

function verPerson(id){
 if(!id)return "Unbekannter Benutzer";
 return (typeof profileName==="function")?profileName(id):String(id);
}

async function verNeuLaden(){
 await verLaden(currentMeasurementId);
 verOffen=null;
 renderMeasVersionen();
}

if($("measVersionenBereich")){
 $("measVersionenBereich").addEventListener("click",e=>{
  const j=e.target.closest("[data-ver-jetzt]");
  if(j){
   const v=verCache.find(x=>String(x.nummer)===String(j.dataset.verJetzt));
   if(!v)return;
   const jetzt=(typeof buildMeasurementFromForm==="function")?(buildMeasurementFromForm().data||{}):{};
   verOffen={nummer:v.nummer,titel:"Fassung "+v.nummer+" → aktueller Stand",
             liste:verVergleich(v.data,jetzt)};
   renderMeasVersionen(); return;
  }
  const p=e.target.closest("[data-ver-vorher]");
  if(p){
   const i=verCache.findIndex(x=>String(x.nummer)===String(p.dataset.verVorher));
   const v=verCache[i], w=verCache[i+1];
   if(!v||!w)return;
   verOffen={nummer:v.nummer,titel:"Fassung "+w.nummer+" → Fassung "+v.nummer,
             liste:verVergleich(w.data,v.data)};
   renderMeasVersionen(); return;
  }
 });
}
