// ---------------------------------------------------------------------------
// v3.09  Materialreservierung und Reststueckreservierung je Projekt
// ---------------------------------------------------------------------------
// Haelt fest, was fuer ein Projekt gebraucht, reserviert, zugeschnitten und
// geruestet ist - und welches physische Reststueck dafuer fest eingeplant
// wurde.
//
// KEIN RESTSTUECK WIRD STILLSCHWEIGEND EINGEPLANT (Auftrag Abschnitt 7):
// die Zuschnittliste SCHLAEGT passende Reste nur vor (js/42, unveraendert).
// Erst wer hier ausdruecklich "Fuer dieses Projekt reservieren" drueckt,
// legt eines fest. Danach ist es fuer andere Projekte nicht mehr frei.
//
// KEINE ZWEITE RECHTEVERWALTUNG: geschrieben wird ueber die gewoehnlichen
// Tabellen. Die Firmengrenze und das Recht erzwingt ausschliesslich die
// Datenbank (restriktive tenant_boundary-Policy plus die bestehenden
// has_permission('projects', ...)-Policies). Der Client schickt nirgends
// eine company_id mit.
//
// KEIN ZWEITES PROTOKOLL: jede Aenderung schreibt der bestehende
// write_audit_log()-Trigger mit alt/neu in dasselbe audit_log wie alles
// andere - sichtbar im gewohnten Projekt-Verlauf.
//
// SAMMELAKTIONEN (v3.13): eine Bedarfsliste hat schnell zwei Dutzend Zeilen -
// jede einzeln weiterzustellen war die eigentliche Arbeit. Deshalb gibt es
// jetzt eine Auswahl und je Schritt EINEN Knopf. Drei Regeln dabei:
//   1. Der Knopf traegt die Zahl der Zeilen, die er WIRKLICH aendert. Steht
//      dort (0), ist er gesperrt - man drueckt nie ins Leere.
//   2. Ein Vorwaerts-Schritt hebt nur Zeilen, die noch dahinter stehen. Eine
//      schon zugeschnittene Zeile wird von "Alle reservieren" NICHT
//      zurueckgezogen - das waere ein stiller Rueckschritt.
//   3. Geschrieben wird in EINEM update().in("id",...) ueber denselben Weg
//      wie die einzelne Zeile. Kein zweiter Schreibweg, keine
//      SECURITY-DEFINER-Funktion: die RLS prueft jede Zeile einzeln, und was
//      sie ablehnt, kommt nicht zurueck - das wird gezaehlt und gesagt.
//
// Bei den RESTSTUECKEN ist die Auswahl ausdruecklich LEER vorbelegt, bei den
// Bedarfszeilen dagegen voll. Der Unterschied hat einen Grund: eine
// Bedarfszeile gehoert per Definition zu diesem Projekt (sie kommt aus seinen
// eigenen Massaufnahmen). Ein freies Reststueck gehoert noch niemandem - das
// ganze Lager vorzuwaehlen waere genau das stillschweigende Einplanen, das
// oben ausgeschlossen ist.
//
// Sichtbar nur, wenn das Untermodul eingeschaltet ist - pmAktiv("reservierung").
// ---------------------------------------------------------------------------

const RESV_STATUS=[
 {key:"benoetigt",   name:"Benötigt",      farbe:"grau"},
 {key:"verfuegbar",  name:"Verfügbar",     farbe:"blau"},
 {key:"reserviert",  name:"Reserviert",    farbe:"blau"},
 {key:"zugeschnitten",name:"Zugeschnitten",farbe:"gruen"},
 {key:"geruestet",   name:"Gerüstet",      farbe:"gruen"}
];
let resvListe=[];
let resvProjektId=null;
let resvLaeuft=0;
// Auswahl fuer die Sammelaktionen. Bedarfszeilen: beim Laden alles gewaehlt.
// Reststuecke: bewusst leer, siehe Kopfkommentar.
let resvAuswahl=new Set();
let resvRestAuswahl=new Set();

// Reihenfolge der Kette. Dieselbe Rangfolge wie in der Werkstatt
// (WERK_RES_RANG, js/51) - sie entscheidet, was "noch dahinter" heisst.
const RESV_RANG={benoetigt:0,verfuegbar:1,reserviert:2,zugeschnitten:3,geruestet:4};
function resvRang(s){return RESV_RANG[s]===undefined?0:RESV_RANG[s]}

function resvStatusName(k){
 const s=RESV_STATUS.find(x=>x.key===k);
 return s?s.name:(k||"-");
}
function resvBadge(k){
 const s=RESV_STATUS.find(x=>x.key===k)||{name:k||"-",farbe:"grau"};
 return `<span class="mw-badge mw-${s.farbe}">${esc(s.name)}</span>`;
}
function resvMm(v){
 const z=(typeof pmatZahl==="function")?pmatZahl(v):Number(v);
 if(z===null||z===undefined||!Number.isFinite(z))return null;
 return Math.round(z);
}
function resvMasse(r){
 const l=resvMm(r.laenge_mm), b=resvMm(r.breite_mm);
 if(l===null&&b===null)return "";
 if(l!==null&&b!==null)return l+" × "+b+" mm";
 return (l!==null?l:b)+" mm";
}
// Schluessel, der zwei Bedarfszeilen als dieselbe Sache erkennt. Damit legt
// "Bedarf uebernehmen" nichts doppelt an.
function resvSchluessel(r){
 return [String(r.material_name||"").trim(),
         String(r.bezeichnung||"").trim(),
         String(r.einheit||"").trim(),
         resvMm(r.breite_mm)===null?"":resvMm(r.breite_mm),
         resvMm(r.laenge_mm)===null?"":resvMm(r.laenge_mm)].join("|");
}

// ---- Laden ----------------------------------------------------------------
async function resvLaden(projectId,opt){
 resvProjektId=projectId;
 resvListe=[];
 if(!projectId||!pmAktiv("reservierung"))return;
 // Kein company_id-Filter: die Firmengrenze erzwingt die Datenbank.
 const {data,error}=await sb.from("material_reservierungen")
  .select("*").eq("project_id",projectId).order("id");
 if(error){resvListe=null;resvAuswahl=new Set();return}
 resvListe=data||[];
 // Beim Oeffnen ist alles gewaehlt - dieselbe Vorgabe wie beim Feedback-Export
 // (CLAUDE.md 72.1). Damit ist "alles reservieren" ein Knopfdruck; wer nur
 // einen Teil will, nimmt Kaestchen weg. Beim Auffrischen NACH einer Aktion
 // bleibt die bisherige Auswahl stehen, soweit es die Zeilen noch gibt.
 const ids=new Set(resvListe.map(r=>r.id));
 resvAuswahl=(opt&&opt.behalten)
  ?new Set([...resvAuswahl].filter(id=>ids.has(id)))
  :new Set(ids);
 resvRestAuswahl=(opt&&opt.behalten)?resvRestAuswahl:new Set();
}

// ---- Anzeige --------------------------------------------------------------
function resvQuelleHtml(r){
 if(!r.measurement_id)return '<span class="small" style="color:var(--muted)">Projektbedarf</span>';
 const m=(projectMeasurementsCache||[]).find(x=>x.id===r.measurement_id);
 const name=m?((typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type)
             :("Massaufnahme "+r.measurement_id);
 return `<button type="button" class="pmat-quelle" data-resv-quelle="${r.measurement_id}">${esc(name)}</button>`;
}
// ---- Bestehende Zeilen aus der Zeit vor v3.17 ----------------------------
// Der Filter beim Uebernehmen wirkt nur beim Anlegen. Zeilen, die vorher
// schon angelegt wurden, bleiben stehen - der Betrieb sah deshalb weiterhin
// Abwicklungen und Blechflaechen in seiner Liste (Rueckmeldung 7.9.2026).
//
// Hier wird eine BESTEHENDE Zeile derselben Frage unterworfen wie eine neue:
// ueber ihre Massaufnahme und ihre Bezeichnung, mit pmatTeilVon() als der
// einen Quelle (js/48). Ein Zuschnitt ist nie abgeleitet, und ohne Zuordnung
// zu genau einer Massaufnahme sagt die App NICHTS - sie raet nicht.
// v3.20: liste ist optional - die Werkstatt hat ihre eigenen Aufnahmen
// (werkGrundlage.aufnahmen) und nicht den Cockpit-Cache. Ohne Angabe gilt
// wie bisher der Cache des offenen Projekts.
function resvAbgeleitet(r,liste){
 if(!r)return false;
 if(r.laenge_mm!==null&&r.laenge_mm!==undefined)return false;   // Zuschnitt
 if(typeof pmatTeilVon!=="function")return false;
 const id=r.measurement_id; if(!id)return false;
 const quelle=Array.isArray(liste)?liste:(projectMeasurementsCache||[]);
 const m=quelle.find(x=>x&&x.id===id);
 const zeilen=(m&&m.data&&Array.isArray(m.data.ausmass))?m.data.ausmass:null;
 if(!zeilen)return false;
 const bez=String(r.bezeichnung||"").trim();
 const z=zeilen.find(x=>String((x&&x.bezeichnung)||"").trim()===bez);
 if(!z)return false;
 return pmatTeilVon(m,z)===false;
}
function resvAbgeleiteteZeilen(){return (resvListe||[]).filter(resvAbgeleitet)}

function resvZeileHtml(r){
 const masse=resvMasse(r);
 const menge=(r.menge===null||r.menge===undefined)?"" :
   ((typeof pmatFormat==="function")?pmatFormat(Number(r.menge)):String(r.menge));
 const wer=r.reserviert_von&&typeof profileName==="function"?profileName(r.reserviert_von):"";
 const wann=r.reserviert_am&&typeof verlaufFormatWann==="function"?verlaufFormatWann(r.reserviert_am):"";
 const gewaehlt=resvAuswahl.has(r.id);
 const abgeleitet=resvAbgeleitet(r);
 return `<tr class="${gewaehlt?"resv-gewaehlt":""}" data-resv-zeile="${r.id}">
  <td class="resv-pick-td"><label class="resv-pick"><input type="checkbox" data-resv-pick="${r.id}"${gewaehlt?" checked":""}><span class="resv-pick-sr">Auswählen</span></label></td>
  <td>${esc(r.material_name||"Ohne Material")}</td>
  <td>${esc(r.bezeichnung||"")}${masse?`<br><span class="small" style="color:var(--muted)">${esc(masse)}</span>`:""}${abgeleitet?`<br><span class="small resv-abgeleitet" title="Abwicklungen, Flächen und Stückzahlen sind Rechenergebnisse – aus dem Lager holt sie niemand.">abgeleitetes Mass</span>`:""}</td>
  <td class="pmat-zahl">${esc(menge)}${r.einheit?" "+esc(r.einheit):""}</td>
  <td>${resvQuelleHtml(r)}</td>
  <td>${resvBadge(r.status)}${wer?`<br><span class="small" style="color:var(--muted)">${esc(wer)}${wann?" · "+esc(wann):""}</span>`:""}</td>
  <td class="resv-akt">
   <select data-resv-status="${r.id}" style="min-width:130px">
    ${RESV_STATUS.map(s=>`<option value="${s.key}"${s.key===r.status?" selected":""}>${esc(s.name)}</option>`).join("")}
   </select>
   <button type="button" class="gray" data-resv-loeschen="${r.id}" title="Bedarfszeile entfernen">🗑</button>
  </td>
 </tr>`;
}

// Reststuecke: getrennt nach "fuer dieses Projekt reserviert", "fuer ein
// anderes Projekt reserviert" (nur zur Information, nicht anfassbar) und
// "frei". Nichts davon wird automatisch eingeplant.
function resvResteHtml(){
 const alle=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:[];
 const meine=alle.filter(r=>r.reserviert_fuer_project_id===resvProjektId&&!r.verbraucht);
 const fremd=alle.filter(r=>r.reserviert_fuer_project_id&&r.reserviert_fuer_project_id!==resvProjektId&&!r.verbraucht);
 const frei =alle.filter(r=>!r.reserviert_fuer_project_id&&!r.verbraucht);
 const zeile=r=>`${resvMm(r.laenge_mm)} × ${resvMm(r.breite_mm)} mm`
   +(r.material_name?" · "+esc(r.material_name):"")
   +(r.anzahl>1?` · ${r.anzahl} Stück`:"");
 let h='<div class="resv-reste"><div class="small"><b>Reststücke</b></div>';
 if(!alle.length){
  h+='<div class="small" style="color:var(--muted)">Das Reststücke-Lager ist leer. Reste werden im Zuschnitt einer Massaufnahme aufgenommen.</div>';
  return h+"</div>";
 }
 // Kaestchen je Rest, damit auch hier nicht jede Zeile einzeln angetippt
 // werden muss. Vorgewaehlt ist NICHTS - siehe Kopfkommentar.
 const pick=r=>`<label class="resv-pick"><input type="checkbox" data-resv-rest-pick="${r.id}"${resvRestAuswahl.has(r.id)?" checked":""}><span class="resv-pick-sr">Auswählen</span></label>`;
 const gewMeine=meine.filter(r=>resvRestAuswahl.has(r.id)).length;
 const gewFrei =frei.filter(r=>resvRestAuswahl.has(r.id)).length;
 if(meine.length){
  h+='<div class="small" style="margin-top:4px">Für dieses Projekt reserviert:</div>'
   +meine.map(r=>`<div class="resv-rest-zeile${resvRestAuswahl.has(r.id)?" resv-gewaehlt":""}">${pick(r)}<span>${zeile(r)}</span>
     <span class="resv-akt"><button type="button" class="gray" data-resv-rest-frei="${r.id}">Freigeben</button>
     <button type="button" class="gray" data-resv-rest-verbraucht="${r.id}">Als verwendet buchen</button></span></div>`).join("")
   +`<div class="resv-bulk-knoepfe">
      <button type="button" class="gray" data-resv-rest-alle="meine">Alle ${meine.length} auswählen</button>
      <button type="button" class="gray" data-resv-bulk-rest="frei"${gewMeine?"":" disabled"}>Freigeben (${gewMeine})</button>
      <button type="button" class="gray" data-resv-bulk-rest="verbraucht"${gewMeine?"":" disabled"}>Als verwendet buchen (${gewMeine})</button>
     </div>`;
 }
 if(frei.length){
  h+='<div class="small" style="margin-top:6px">Frei im Lager:</div>'
   +frei.slice(0,12).map(r=>`<div class="resv-rest-zeile${resvRestAuswahl.has(r.id)?" resv-gewaehlt":""}">${pick(r)}<span>${zeile(r)}</span>
     <span class="resv-akt"><button type="button" data-resv-rest-nehmen="${r.id}">Für dieses Projekt reservieren</button></span></div>`).join("")
   +(frei.length>12?`<div class="small" style="color:var(--muted)">… und ${frei.length-12} weitere</div>`:"")
   +`<div class="resv-bulk-knoepfe">
      <button type="button" class="gray" data-resv-rest-alle="frei">Alle ${Math.min(frei.length,12)} auswählen</button>
      <button type="button" class="gray" data-resv-rest-alle="keine">Keine</button>
      <button type="button" data-resv-bulk-rest="nehmen"${gewFrei?"":" disabled"}>Für dieses Projekt reservieren (${gewFrei})</button>
     </div>`;
 }
 if(fremd.length){
  h+=`<div class="small" style="margin-top:6px;color:var(--muted)">${fremd.length} Rest${fremd.length===1?" ist":"e sind"} für ein anderes Projekt reserviert und hier nicht verfügbar.</div>`;
 }
 if(!meine.length&&!frei.length&&!fremd.length){
  h+='<div class="small" style="color:var(--muted)">Kein freier Rest im Lager.</div>';
 }
 h+='<div class="small" style="color:var(--muted);margin-top:4px">Ein Rest wird nie automatisch eingeplant – er liegt physisch irgendwo und ist vielleicht schon weg.</div>';
 return h+"</div>";
}

function renderProjektReservierung(){
 const karte=$("cockpitReservierungCard"), box=$("cockpitReservierungBody");
 if(!karte||!box)return 0;
 if(!pmAktiv("reservierung")){karte.hidden=true;box.innerHTML="";return 0}
 karte.hidden=false;
 if(resvListe===null){
  box.innerHTML='<div class="small" style="color:var(--red)">Die Reservierungen konnten nicht geladen werden.</div>';
  if($("cockpitReservierungCount"))$("cockpitReservierungCount").textContent="?";
  if(typeof cockpitModulStand==="function")cockpitModulStand();
  return 0;
 }
 const liste=resvListe||[];
 if($("cockpitReservierungCount"))$("cockpitReservierungCount").textContent=String(liste.length);
 if(typeof cockpitModulStand==="function")cockpitModulStand();
 let h='<div class="bar"><button type="button" id="resvBedarfBtn">＋ Bedarf aus der Materialübersicht übernehmen</button></div>'
  +'<div class="small resv-hinweis" hidden></div>';
 if(!liste.length){
  const st=resvBedarfStand();
  h+='<div class="small" style="color:var(--muted)">Noch kein Bedarf erfasst. „Bedarf übernehmen" legt an, '
   +'was die Massaufnahmen dieses Projekts an <strong>Zuschnitten</strong> und '
   +'<strong>Teilen</strong> ergeben – Halbfabrikate und gekaufte Artikel wie '
   +'Dilas, Rinnenböden, Halter oder Bleilappen. Abgeleitete Masse (Abwicklung, '
   +'Flächen, Stückzahlen) gehören nicht in eine Reservierung und bleiben weg.'
   +(st.zuschnitte||st.teile||st.unbekannt
      ? ' Bereit: '+st.zuschnitte+' Zuschnitt'+(st.zuschnitte===1?'':'e')
        +' und '+(st.teile+st.unbekannt)+' Position'+((st.teile+st.unbekannt)===1?'':'en')+'.'
      : '')
   +'</div>';
 }else{
  h+='<div id="resvBulkBar">'+resvBulkBarHtml()+'</div>'
   +'<div class="scroll"><table class="eb-table pmat-tab resv-tab"><thead><tr>'
   +'<th class="resv-pick-th"><span class="resv-pick-sr">Auswahl</span></th>'
   +'<th>Material</th><th>Position</th><th>Menge</th><th>Quelle</th><th>Status</th><th>Aktion</th>'
   +'</tr></thead><tbody>'+liste.map(resvZeileHtml).join("")+'</tbody></table></div>';
 }
 box.innerHTML=h+resvResteHtml();
 return liste.length;
}

// ---- Sammelaktions-Leiste -------------------------------------------------
// Die Zahl am Knopf ist die Zahl der Zeilen, die er wirklich aendert. Steht
// dort (0), ist er gesperrt - kein Knopf, der ins Leere greift.
function resvBulkBarHtml(){
 const liste=resvListe||[];
 const gewaehlt=resvAuswahlZeilen();
 const zaehl=k=>liste.filter(r=>r.status===k).length;
 const chip=(wahl,text,an)=>`<button type="button" class="status-chip${an?" aktiv":""}" data-resv-pickall="${wahl}">${esc(text)}</button>`;
 let chips=chip("1","Alle ("+liste.length+")",gewaehlt.length===liste.length&&liste.length>0)
  +chip("0","Keine",gewaehlt.length===0);
 RESV_STATUS.forEach(st=>{const n=zaehl(st.key); if(n)chips+=chip(st.key,st.name+" ("+n+")",false)});
 const knopf=(status,text)=>{
  const n=resvBetroffen(status,gewaehlt).length;
  return `<button type="button" data-resv-bulk="${status}"${n?"":" disabled"} title="${esc(text)}">${esc(text)} (${n})</button>`;
 };
 const loeschN=gewaehlt.length;
 const abgN=resvAbgeleiteteZeilen().length;
 return '<div class="resv-bulk">'
  +'<div class="resv-bulk-chips">'+chips+'</div>'
  +'<div class="small resv-bulk-zahl">'+(gewaehlt.length
      ?gewaehlt.length+" von "+liste.length+" ausgewählt"
      :"Nichts ausgewählt – die Sammelaktionen sind gesperrt.")+'</div>'
  +'<div class="resv-bulk-knoepfe">'
   +knopf("verfuegbar","→ Verfügbar")
   +knopf("reserviert","→ Reserviert")
   +knopf("zugeschnitten","→ Zugeschnitten")
   +knopf("geruestet","→ Gerüstet")
   +`<button type="button" class="gray" data-resv-bulk="benoetigt"${resvBetroffen("benoetigt",gewaehlt).length?"":" disabled"}>↩ Zurücksetzen (${resvBetroffen("benoetigt",gewaehlt).length})</button>`
   +`<button type="button" class="gray" data-resv-bulk-loeschen="1"${loeschN?"":" disabled"}>🗑 Entfernen (${loeschN})</button>`
   +(abgN?`<button type="button" class="gray" data-resv-aufraeumen="1" title="Entfernt die Zeilen, die ein Rechenergebnis sind – Abwicklung, Fläche, Stückzahl.">🧹 Abgeleitete Masse entfernen (${abgN})</button>`:"")
  +'</div>'
  +'<div class="small" style="color:var(--muted)">Ein Schritt hebt nur Positionen, die noch dahinter stehen – eine bereits weitere wird nie zurückgezogen.</div>'
  +(abgN?'<div class="small resv-abgeleitet-hinweis">'+abgN+' Zeile'+(abgN===1?'':'n')+' in dieser Liste '+(abgN===1?'ist':'sind')+' ein abgeleitetes Mass (Abwicklung, Fläche, Stückzahl) – aus dem Lager holt das niemand. Sie '+(abgN===1?'stammt':'stammen')+' aus einer Übernahme vor dieser Fassung.</div>':'')
 +'</div>';
}
// Nur die Leiste und die Zeilenmarkierung auffrischen. Die Tabelle NICHT neu
// zeichnen - sonst verliert das gerade angetippte Kaestchen seinen Zustand
// (dieselbe Regel wie beim Feedback, CLAUDE.md 72.3).
function resvBulkBarAuffrischen(){
 const bar=$("resvBulkBar");
 if(bar)bar.innerHTML=resvBulkBarHtml();
}

// ---- Bedarf uebernehmen ---------------------------------------------------
// Nimmt genau das, was die projektweite Materialuebersicht ohnehin schon
// zeigt (js/48) - es wird nichts zusaetzlich gerechnet.
// Was gehoert ueberhaupt in eine Reservierung?
//
// Rueckmeldung des Betriebs (6.9.2026): "beim reservieren reicht von miraus
// gesehen die zuschnitte ... ausser es sind noch halbfabrikate wie dilas oder
// rinnendoeden dabei". Genau so:
//
//   Zuschnitte            immer  - das Blech, das geschnitten wird
//   Teile                 immer  - Halbfabrikate und gekaufte Artikel:
//                                  Dilas, Rinnenboeden, Halter, Stutzen,
//                                  Winkel, Schieber, Bleilappen, GAVA-Bleche
//   abgeleitete Masse     nie    - Abwicklung, Blechflaeche, Stueckzahlen,
//                                  Blechstoesse, Gehrungen, Segmente
//
// Entschieden wird das NICHT an der Bezeichnung (eine Namensliste waere bei
// jeder Umformulierung still falsch), sondern am Feld "teil", das die zwoelf
// Module beim Rechnen selbst setzen. Eine Massaufnahme aus einer Fassung vor
// v3.17 hat das Feld nicht; seit v3.18 beantwortet pmatTeilVon() sie dann
// ueber den Rueckfall ihres Typs (js/48) - dieselbe Aussage des Moduls, nur
// nach dem Typ abgefragt. Nur wenn auch der Typ unbekannt ist, raet die App
// nicht, sondern nimmt die Position mit und sagt warum (resvBedarfStand).
function resvBedarfStand(){
 if(typeof pmatSammeln!=="function")return {teile:0,abgeleitet:0,unbekannt:0,zuschnitte:0};
 let teile=0,abgeleitet=0,unbekannt=0,zuschnitte=0;
 pmatSammeln(projectMeasurementsCache||[]).forEach(g=>{
  g.positionen.forEach(p=>{
   if(p.summe===null)return;
   if(p.teil===true)teile++; else if(p.teil===false)abgeleitet++; else unbekannt++;
  });
  zuschnitte+=g.zuschnitte.length;
 });
 return {teile,abgeleitet,unbekannt,zuschnitte};
}
// Der Zusatz zur Erfolgsmeldung. Er sagt ausdruecklich, was NICHT uebernommen
// wurde - sonst wuerde jemand die fehlenden Zeilen fuer einen Fehler halten.
function resvBedarfZusatz(){
 const st=resvBedarfStand(); const t=[];
 if(st.abgeleitet)t.push(st.abgeleitet+" abgeleitete Mass"+(st.abgeleitet===1?"":"e")
   +" (Abwicklung, Flächen, Stückzahlen) gehören nicht in eine Reservierung und bleiben weg.");
 if(st.unbekannt)t.push(st.unbekannt+" Position"+(st.unbekannt===1?"":"en")
   +" aus einer älteren Fassung sind mit dabei – die App kann dort nicht unterscheiden,"
   +" ob es ein Teil oder ein Mass ist. Die Massaufnahme einmal öffnen und speichern ordnet sie zu.");
 return t.length?" "+t.join(" "):"";
}
function resvBedarfZeilen(){
 if(typeof pmatSammeln!=="function")return [];
 const raus=[];
 pmatSammeln(projectMeasurementsCache||[]).forEach(g=>{
  g.positionen.forEach(p=>{
   if(p.summe===null)return;                 // reiner Text wird nicht reserviert
   if(p.teil===false)return;                 // abgeleitetes Mass - nichts zum Holen
   const q=p.quellen||[];
   raus.push({material_name:g.material==="Ohne Material"?null:g.material,
     bezeichnung:p.bezeichnung, menge:p.summe, einheit:p.einheit||null,
     breite_mm:null, laenge_mm:null,
     measurement_id:q.length===1?q[0].id:null});
  });
  g.zuschnitte.forEach(t=>{
   const q=[...(t.quellen||[])];
   raus.push({material_name:g.material==="Ohne Material"?null:g.material,
     bezeichnung:"Zuschnitt"+(t.merkmal?" · "+t.merkmal:""),
     menge:t.anzahl, einheit:"Stk",
     breite_mm:t.breite===null?null:t.breite, laenge_mm:t.laenge,
     measurement_id:q.length===1?q[0]:null});
  });
 });
 return raus;
}
async function resvBedarfUebernehmen(){
 if(!resvProjektId)return {fehler:"Kein Projekt geöffnet."};
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Bedarf"))return {offline:true};
 const vorhanden=new Set((resvListe||[]).map(resvSchluessel));
 const neu=resvBedarfZeilen().filter(z=>!vorhanden.has(resvSchluessel(z)));
 if(!neu.length)return {fehler:null,anzahl:0,uebersprungen:resvBedarfZeilen().length};
 // company_id kommt aus dem DEFAULT my_company_id(), niemals vom Client.
 const {data,error}=await sb.from("material_reservierungen")
  .insert(neu.map(z=>({...z,project_id:resvProjektId,status:"benoetigt"}))).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).concat(data);
 // Frisch uebernommene Positionen sind gleich mit ausgewaehlt - sie sind
 // genau das, was als Naechstes weitergestellt wird.
 data.forEach(r=>resvAuswahl.add(r.id));
 return {fehler:null,anzahl:data.length,uebersprungen:resvBedarfZeilen().length-data.length};
}

// ---- Aendern --------------------------------------------------------------
// Welche Felder ein Statuswechsel schreibt. EINE Quelle - die einzelne Zeile
// und die Sammelaktion setzen dadurch garantiert dasselbe.
function resvStatusFelder(status){
 const felder={status};
 // "reserviert" ist der Moment, in dem sich jemand festlegt - deshalb wird
 // hier festgehalten wer und wann. Beim Zuruecknehmen wird das geloescht.
 if(status==="reserviert"){
  felder.reserviert_von=(currentProfile&&currentProfile.id)||null;
  felder.reserviert_am=new Date().toISOString();
 }else if(status==="benoetigt"||status==="verfuegbar"){
  felder.reserviert_von=null; felder.reserviert_am=null;
 }
 return felder;
}
async function resvStatusSetzen(id,status){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 const {data,error}=await sb.from("material_reservierungen")
  .update(resvStatusFelder(status)).eq("id",id).select();
 if(error)return {fehler:error.message};
 // Ein von RLS blockiertes UPDATE meldet keinen Fehler, es betrifft still
 // 0 Zeilen. Kein vorgetaeuschter Erfolg.
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).map(r=>r.id===id?data[0]:r);
 return {fehler:null};
}
async function resvLoeschen(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 const {data,error}=await sb.from("material_reservierungen").delete().eq("id",id).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).filter(r=>r.id!==id);
 return {fehler:null};
}

// ---- Sammelaktionen -------------------------------------------------------
// Alles, was die Auswahl gerade umfasst.
function resvAuswahlZeilen(){
 return (resvListe||[]).filter(r=>resvAuswahl.has(r.id));
}
// Welche der ausgewaehlten Zeilen wuerde dieser Schritt WIRKLICH aendern?
// Vorwaerts (verfuegbar ... geruestet): nur was noch dahinter steht - eine
// schon weitere Zeile wird nicht zurueckgezogen. Rueckwaerts ("benoetigt"):
// alles, was nicht schon dort steht; das ist ein ausdruecklicher Rueckschritt
// und hat deshalb einen eigenen Knopf mit eigener Rueckfrage.
function resvBetroffen(status,zeilen){
 const liste=zeilen||resvAuswahlZeilen();
 if(status==="benoetigt")return liste.filter(r=>r.status!=="benoetigt");
 const ziel=resvRang(status);
 return liste.filter(r=>resvRang(r.status)<ziel);
}
// EIN Schreibweg, derselbe wie fuer die einzelne Zeile: gewoehnliches UPDATE
// mit den ids. Die RLS prueft jede Zeile fuer sich; was sie ablehnt, kommt
// nicht in data zurueck - genau daraus entsteht die ehrliche Zaehlung.
// Nimmt die ids ausdruecklich entgegen und liest NICHT selbst aus resvListe,
// damit die Werkstatt (js/51) mit ihrer eigenen Liste denselben Weg benutzt.
async function resvBulkStatus(ids,status){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 if(!ids||!ids.length)return {fehler:null,gesetzt:0,abgelehnt:0};
 const {data,error}=await sb.from("material_reservierungen")
  .update(resvStatusFelder(status)).in("id",ids).select();
 if(error)return {fehler:error.message};
 const zurueck=data||[];
 if(!zurueck.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 const map=new Map(zurueck.map(r=>[r.id,r]));
 resvListe=(resvListe||[]).map(r=>map.has(r.id)?map.get(r.id):r);
 return {fehler:null,gesetzt:zurueck.length,abgelehnt:ids.length-zurueck.length};
}
async function resvBulkLoeschen(ids){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 if(!ids||!ids.length)return {fehler:null,gesetzt:0,abgelehnt:0};
 const {data,error}=await sb.from("material_reservierungen").delete().in("id",ids).select();
 if(error)return {fehler:error.message};
 const weg=data||[];
 if(!weg.length)return {fehler:"Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?"};
 const raus=new Set(weg.map(r=>r.id));
 resvListe=(resvListe||[]).filter(r=>!raus.has(r.id));
 raus.forEach(id=>resvAuswahl.delete(id));
 return {fehler:null,gesetzt:weg.length,abgelehnt:ids.length-weg.length};
}

// ---- Reststueck -----------------------------------------------------------
// Die Bedingungen im WHERE machen das Reservieren wettlaufsicher: laeuft
// gleichzeitig ein zweiter Versuch, findet der zweite die Zeile nicht mehr
// frei und betrifft 0 Zeilen. Es gibt deshalb keine Doppelbelegung.
async function resvRestNehmen(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 if(!resvProjektId)return {fehler:"Kein Projekt geöffnet."};
 const {data,error}=await sb.from("reststuecke")
  .update({reserviert_fuer_project_id:resvProjektId,
           reserviert_von:(currentProfile&&currentProfile.id)||null,
           reserviert_am:new Date().toISOString()})
  .eq("id",id).is("reserviert_fuer_project_id",null).eq("verbraucht",false).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Dieses Reststück ist inzwischen vergeben oder verbraucht."};
 resvRestUebernehmen(data[0]);
 return {fehler:null};
}
async function resvRestFreigeben(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 const {data,error}=await sb.from("reststuecke")
  .update({reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null})
  .eq("id",id).eq("reserviert_fuer_project_id",resvProjektId).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts geändert. Fehlt die nötige Berechtigung?"};
 resvRestUebernehmen(data[0]);
 return {fehler:null};
}
// Verbraucht: die Projektzuordnung bleibt ausdruecklich stehen, damit
// nachvollziehbar bleibt, wo der Rest hingegangen ist (Auftrag Abschnitt 7).
async function resvRestVerbraucht(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 const {data,error}=await sb.from("reststuecke")
  .update({verbraucht:true}).eq("id",id).eq("reserviert_fuer_project_id",resvProjektId).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts geändert. Fehlt die nötige Berechtigung?"};
 // Die geladene Liste fuehrt nur unverbrauchte Reste (js/05).
 if(typeof reststuecke!=="undefined")reststuecke=(reststuecke||[]).filter(r=>r.id!==id);
 return {fehler:null};
}
// Sammelaktion fuer Reststuecke. Dieselben Bedingungen im WHERE wie einzeln,
// also gleichermassen wettlaufsicher: ein Rest, den inzwischen ein anderes
// Projekt genommen hat, faellt aus dem UPDATE heraus und wird gezaehlt statt
// stillschweigend uebergangen.
async function resvBulkRest(ids,art){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 if(!ids||!ids.length)return {fehler:null,gesetzt:0,abgelehnt:0};
 if(art==="nehmen"&&!resvProjektId)return {fehler:"Kein Projekt geöffnet."};
 let q=sb.from("reststuecke");
 if(art==="nehmen"){
  q=q.update({reserviert_fuer_project_id:resvProjektId,
              reserviert_von:(currentProfile&&currentProfile.id)||null,
              reserviert_am:new Date().toISOString()})
     .in("id",ids).is("reserviert_fuer_project_id",null).eq("verbraucht",false);
 }else if(art==="frei"){
  q=q.update({reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null})
     .in("id",ids).eq("reserviert_fuer_project_id",resvProjektId);
 }else{
  // Verbraucht: die Projektzuordnung bleibt ausdruecklich stehen.
  q=q.update({verbraucht:true}).in("id",ids).eq("reserviert_fuer_project_id",resvProjektId);
 }
 const {data,error}=await q.select();
 if(error)return {fehler:error.message};
 const zurueck=data||[];
 if(!zurueck.length)return {fehler:art==="nehmen"
   ?"Keines dieser Reststücke war noch frei – inzwischen vergeben oder verbraucht."
   :"Es wurde nichts geändert. Fehlt die nötige Berechtigung?"};
 if(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke)){
  if(art==="verbraucht"){
   const raus=new Set(zurueck.map(r=>r.id));
   reststuecke=reststuecke.filter(r=>!raus.has(r.id));
  }else{
   const map=new Map(zurueck.map(r=>[r.id,r]));
   reststuecke=reststuecke.map(r=>map.has(r.id)?map.get(r.id):r);
  }
 }
 zurueck.forEach(r=>resvRestAuswahl.delete(r.id));
 return {fehler:null,gesetzt:zurueck.length,abgelehnt:ids.length-zurueck.length};
}

function resvRestUebernehmen(zeile){
 if(typeof reststuecke==="undefined"||!Array.isArray(reststuecke))return;
 reststuecke=reststuecke.map(r=>r.id===zeile.id?zeile:r);
}

// ---- Bedienung ------------------------------------------------------------
function resvHinweis(text,fehler){
 const box=$("cockpitReservierungBody");
 const el=box&&box.querySelector(".resv-hinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}
async function resvNachAktion(erg,gutText){
 if(!erg||erg.offline)return;
 if(erg.fehler){renderProjektReservierung();resvHinweis(erg.fehler,true);return}
 renderProjektReservierung();
 if(gutText)resvHinweis(gutText,false);
}
// Was eine Sammelaktion wirklich getan hat - inklusive dem, was sie NICHT
// getan hat. Ein abgelehnter Teil wird genannt, nicht verschwiegen.
function resvBulkMeldung(erg,tat,uebersprungen){
 let t="✓ "+erg.gesetzt+" Position"+(erg.gesetzt===1?"":"en")+" "+tat+".";
 if(uebersprungen)t+=" "+uebersprungen+(uebersprungen===1?" war":" waren")+" schon so weit.";
 if(erg.abgelehnt)t+=" "+erg.abgelehnt+(erg.abgelehnt===1?" wurde":" wurden")+" abgelehnt – fehlt die nötige Berechtigung?";
 return t;
}

document.addEventListener("click",async e=>{
 if(!e.target||!e.target.closest)return;

 const bedarf=e.target.closest("#resvBedarfBtn");
 if(bedarf){
  bedarf.disabled=true;
  const erg=await resvBedarfUebernehmen();
  if(erg&&!erg.offline&&!erg.fehler){
   await resvNachAktion(erg, erg.anzahl
    ? `✓ ${erg.anzahl} Position${erg.anzahl===1?"":"en"} übernommen.`
      +(erg.uebersprungen?` ${erg.uebersprungen} war${erg.uebersprungen===1?"":"en"} schon erfasst.`:"")
      +resvBedarfZusatz()
    : "Es gab nichts Neues zu übernehmen – alle Positionen sind bereits erfasst.");
  }else{await resvNachAktion(erg)}
  return;
 }

 // ---- Sammelaktionen ------------------------------------------------------
 const alle=e.target.closest("[data-resv-pickall]");
 if(alle){
  const wahl=alle.dataset.resvPickall;
  const liste=resvListe||[];
  if(wahl==="1")resvAuswahl=new Set(liste.map(r=>r.id));
  else if(wahl==="0")resvAuswahl=new Set();
  else resvAuswahl=new Set(liste.filter(r=>r.status===wahl).map(r=>r.id));
  renderProjektReservierung();
  return;
 }

 const bulk=e.target.closest("[data-resv-bulk]");
 if(bulk){
  const status=bulk.dataset.resvBulk;
  const gewaehlt=resvAuswahlZeilen();
  const treffer=resvBetroffen(status,gewaehlt);
  if(!treffer.length)return;
  const name=resvStatusName(status);
  const frage=status==="benoetigt"
   ? treffer.length+" Position"+(treffer.length===1?"":"en")+" auf „Benötigt\" ZURÜCKSETZEN?\n\n"
     +"Das ist ein Rückschritt: eine bereits reservierte oder zugeschnittene Position steht danach wieder ganz am Anfang.\n\n"
     +"Wer und wann reserviert hat, wird dabei gelöscht. Der Verlauf bleibt erhalten."
   : treffer.length+" Position"+(treffer.length===1?"":"en")+" auf „"+name+"\" setzen?\n\n"
     +"Positionen, die schon weiter sind, bleiben unberührt.";
  if(!confirm(frage))return;
  bulk.disabled=true;
  const erg=await resvBulkStatus(treffer.map(r=>r.id),status);
  if(erg&&!erg.offline&&!erg.fehler){
   await resvNachAktion(erg,resvBulkMeldung(erg,"auf „"+name+"\" gesetzt",gewaehlt.length-treffer.length));
  }else{await resvNachAktion(erg)}
  return;
 }

 const bulkDel=e.target.closest("[data-resv-bulk-loeschen]");
 if(bulkDel){
  const gewaehlt=resvAuswahlZeilen();
  if(!gewaehlt.length)return;
  if(!confirm(gewaehlt.length+" Bedarfszeile"+(gewaehlt.length===1?"":"n")+" entfernen?\n\n"
    +"Die Reservierung wird damit aufgehoben. Der Verlauf bleibt erhalten.\n\n"
    +"„Bedarf übernehmen\" legt sie später wieder aus den Massaufnahmen an."))return;
  bulkDel.disabled=true;
  const erg=await resvBulkLoeschen(gewaehlt.map(r=>r.id));
  if(erg&&!erg.offline&&!erg.fehler){
   await resvNachAktion(erg,resvBulkMeldung(erg,"entfernt",0));
  }else{await resvNachAktion(erg)}
  return;
 }

 // v3.18: die bestehenden abgeleiteten Zeilen wegraeumen. Geht ueber
 // denselben Loeschweg wie die Auswahl - kein zweiter Schreibpfad.
 const aufr=e.target.closest("[data-resv-aufraeumen]");
 if(aufr){
  const weg=resvAbgeleiteteZeilen();
  if(!weg.length)return;
  if(!confirm(weg.length+" abgeleitete "+(weg.length===1?"Zeile":"Zeilen")+" entfernen?\n\n"
    +weg.slice(0,6).map(r=>"· "+(r.bezeichnung||"")).join("\n")
    +(weg.length>6?"\n· … und "+(weg.length-6)+" weitere":"")
    +"\n\nDas sind Rechenergebnisse (Abwicklung, Fläche, Stückzahl) – aus dem "
    +"Lager holt sie niemand. Zuschnitte und Teile bleiben stehen."))return;
  aufr.disabled=true;
  const erg=await resvBulkLoeschen(weg.map(r=>r.id));
  if(erg&&!erg.offline&&!erg.fehler){
   await resvNachAktion(erg,resvBulkMeldung(erg,"entfernt",0));
  }else{await resvNachAktion(erg)}
  return;
 }

 const restAlle=e.target.closest("[data-resv-rest-alle]");
 if(restAlle){
  const wahl=restAlle.dataset.resvRestAlle;
  const lager=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:[];
  if(wahl==="keine")resvRestAuswahl=new Set();
  else if(wahl==="meine"){
   lager.filter(r=>r.reserviert_fuer_project_id===resvProjektId&&!r.verbraucht)
        .forEach(r=>resvRestAuswahl.add(r.id));
  }else{
   // Nur die tatsaechlich gezeigten zwoelf - was nicht sichtbar ist, waehlt
   // man nicht ungesehen aus.
   lager.filter(r=>!r.reserviert_fuer_project_id&&!r.verbraucht).slice(0,12)
        .forEach(r=>resvRestAuswahl.add(r.id));
  }
  renderProjektReservierung();
  return;
 }

 const bulkRest=e.target.closest("[data-resv-bulk-rest]");
 if(bulkRest){
  const art=bulkRest.dataset.resvBulkRest;
  const lager=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:[];
  const passt=r=>art==="nehmen"
   ? (!r.reserviert_fuer_project_id&&!r.verbraucht)
   : (r.reserviert_fuer_project_id===resvProjektId&&!r.verbraucht);
  const ids=lager.filter(r=>resvRestAuswahl.has(r.id)&&passt(r)).map(r=>r.id);
  if(!ids.length)return;
  const frage=art==="nehmen"
   ? ids.length+" Reststück"+(ids.length===1?"":"e")+" für dieses Projekt reservieren?\n\n"
     +"Danach sind sie für andere Projekte gesperrt."
   : art==="frei"
   ? ids.length+" Reststück"+(ids.length===1?"":"e")+" wieder freigeben?\n\n"
     +"Sie stehen danach anderen Projekten zur Verfügung."
   : ids.length+" Reststück"+(ids.length===1?"":"e")+" als verwendet buchen?\n\n"
     +"Sie verschwinden aus dem Lager. Die Projektzuordnung bleibt im Verlauf nachvollziehbar.";
  if(!confirm(frage))return;
  bulkRest.disabled=true;
  const erg=await resvBulkRest(ids,art);
  if(erg&&!erg.offline&&!erg.fehler){
   const tat=art==="nehmen"?"für dieses Projekt reserviert":(art==="frei"?"freigegeben":"als verwendet gebucht");
   let t="✓ "+erg.gesetzt+" Reststück"+(erg.gesetzt===1?"":"e")+" "+tat+".";
   if(erg.abgelehnt)t+=" "+erg.abgelehnt+(erg.abgelehnt===1?" war":" waren")+" inzwischen nicht mehr verfügbar.";
   await resvNachAktion(erg,t);
  }else{await resvNachAktion(erg)}
  return;
 }

 const quelle=e.target.closest("[data-resv-quelle]");
 if(quelle){
  const id=Number(quelle.dataset.resvQuelle);
  const m=(projectMeasurementsCache||[]).find(x=>x.id===id);
  if(m&&typeof openMeasurement==="function"){
   if(typeof measEditReturnTo!=="undefined")measEditReturnTo="projectCockpit";
   openMeasurement(m);
  }
  return;
 }

 const del=e.target.closest("[data-resv-loeschen]");
 if(del){
  const id=Number(del.dataset.resvLoeschen);
  const r=(resvListe||[]).find(x=>x.id===id);
  if(!confirm("Bedarfszeile entfernen?\n\n"+((r&&r.bezeichnung)||"")+"\n\nDie Reservierung wird aufgehoben. Der Verlauf bleibt erhalten."))return;
  await resvNachAktion(await resvLoeschen(id),"✓ Bedarfszeile entfernt.");
  return;
 }

 const nehmen=e.target.closest("[data-resv-rest-nehmen]");
 if(nehmen){
  nehmen.disabled=true;
  await resvNachAktion(await resvRestNehmen(Number(nehmen.dataset.resvRestNehmen)),
   "✓ Reststück für dieses Projekt reserviert.");
  return;
 }
 const frei=e.target.closest("[data-resv-rest-frei]");
 if(frei){
  frei.disabled=true;
  await resvNachAktion(await resvRestFreigeben(Number(frei.dataset.resvRestFrei)),
   "✓ Reststück wieder freigegeben – es steht anderen Projekten zur Verfügung.");
  return;
 }
 const verb=e.target.closest("[data-resv-rest-verbraucht]");
 if(verb){
  if(!confirm("Reststück als verwendet buchen?\n\nEs verschwindet danach aus dem Lager. Die Projektzuordnung bleibt im Verlauf nachvollziehbar."))return;
  verb.disabled=true;
  await resvNachAktion(await resvRestVerbraucht(Number(verb.dataset.resvRestVerbraucht)),
   "✓ Reststück als verwendet gebucht.");
  return;
 }
});

// Kaestchen: auf "change" hoeren - das ist das Ereignis, das die
// Zustandsaenderung wirklich meldet, auch bei Tastaturbedienung.
// Neu gezeichnet wird dabei NUR die Leiste und die Zeilenmarkierung: eine
// neu gezeichnete Tabelle wuerde das gerade angetippte Kaestchen ersetzen.
function resvRestKnoepfeAuffrischen(){
 const lager=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:[];
 const zaehl=art=>lager.filter(r=>resvRestAuswahl.has(r.id)&&(art==="nehmen"
   ? (!r.reserviert_fuer_project_id&&!r.verbraucht)
   : (r.reserviert_fuer_project_id===resvProjektId&&!r.verbraucht))).length;
 document.querySelectorAll("[data-resv-bulk-rest]").forEach(b=>{
  const art=b.dataset.resvBulkRest, n=zaehl(art);
  const text=art==="nehmen"?"Für dieses Projekt reservieren":(art==="frei"?"Freigeben":"Als verwendet buchen");
  b.textContent=text+" ("+n+")";
  b.disabled=!n;
 });
}
document.addEventListener("change",async e=>{
 const pick=e.target&&e.target.closest?e.target.closest("[data-resv-pick]"):null;
 if(pick){
  const id=Number(pick.dataset.resvPick);
  if(pick.checked)resvAuswahl.add(id);else resvAuswahl.delete(id);
  resvBulkBarAuffrischen();
  const zeile=pick.closest?pick.closest("tr"):null;
  if(zeile)zeile.classList.toggle("resv-gewaehlt",pick.checked);
  return;
 }
 const restPick=e.target&&e.target.closest?e.target.closest("[data-resv-rest-pick]"):null;
 if(restPick){
  const id=Number(restPick.dataset.resvRestPick);
  if(restPick.checked)resvRestAuswahl.add(id);else resvRestAuswahl.delete(id);
  resvRestKnoepfeAuffrischen();
  const zeile=restPick.closest?restPick.closest(".resv-rest-zeile"):null;
  if(zeile)zeile.classList.toggle("resv-gewaehlt",restPick.checked);
  return;
 }
 const sel=e.target&&e.target.closest?e.target.closest("[data-resv-status]"):null;
 if(!sel)return;
 const id=Number(sel.dataset.resvStatus);
 const r=(resvListe||[]).find(x=>x.id===id);
 const neu=sel.value;
 if(!r||r.status===neu)return;
 const alt=r.status;
 const erg=await resvStatusSetzen(id,neu);
 if(erg&&erg.offline){sel.value=alt;return}
 if(erg&&erg.fehler){
  // Kein vorgetaeuschter Erfolg: die Auswahl springt auf den echten Wert
  // zurueck und der Grund steht daneben.
  sel.value=alt; renderProjektReservierung(); resvHinweis(erg.fehler,true); return;
 }
 renderProjektReservierung();
 resvHinweis(`✓ Status auf „${resvStatusName(neu)}" gesetzt.`,false);
});

// Wird von pmSichtbarkeitAuffrischen (js/49) und vom Cockpit aufgerufen.
async function resvCockpitLaden(projectId){
 const lauf=++resvLaeuft;
 await resvLaden(projectId);
 if(lauf!==resvLaeuft)return;       // Projekt zwischenzeitlich gewechselt
 renderProjektReservierung();
}
