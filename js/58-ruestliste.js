"use strict";
// ===========================================================================
// RÜSTLISTE ZUM DRUCKEN  (v3.23)
// ===========================================================================
// An der Abkantbank liegt kein Tablet. Die Werkstatt zeigt seit v3.21 die
// abhakbare Zuschnittliste am Bildschirm - gedruckt werden konnte sie bis
// v3.22 nur als Teil des vollen Massaufnahme-PDF, mit Angaben, Zeichnungen
// und Rollenvergleich davor.
//
// Die Rüstliste ist etwas anderes: EIN Blatt zum Mitnehmen, mit Kästchen zum
// Abhaken von Hand. Sie gibt es
//   * für ein ganzes Projekt  - alle Massaufnahmen, die zu rüsten sind
//   * für EINE Massaufnahme   - nur deren Zuschnitte
//
// WAS HIER NICHT PASSIERT
//  - Es wird NICHTS gerechnet. Die Stücke kommen aus dem GESPEICHERTEN Plan
//    jeder Massaufnahme (pmatPlanRoh/pmatStuecke aus js/48, in Gruppen
//    gebracht von zuPlanAusGespeichert/zuGruppen aus js/33). Kein zweiter
//    Packlauf, keine zweite Zusammenfassung.
//  - Es entsteht KEIN zweiter Druckweg: Kopf (pdfKopfHtml), Stylesheet
//    (PDF_LAYOUT_CSS), Fusszeile (pdfFooterHtml) und das Öffnen des Fensters
//    (pdfDruckVorbereiten, js/35) sind dieselben wie bei jedem anderen PDF.
//    Ein Auswahldialog erscheint bewusst nicht - es gibt hier nur eine Liste,
//    ein Dialog mit einem einzigen Kästchen wäre Lärm.
//
// EHRLICH: der Haken-Stand
//  Bereits abgehakte Stücke werden als abgehakt gedruckt (☑ statt ☐), damit
//  das Blatt der Wirklichkeit entspricht. Ist das Abhaken ausgeschaltet
//  (Modul "Zuschnitt und Abhaken", CLAUDE.md 127), sind gar keine Haken
//  geladen - dann werden alle Kästchen leer gedruckt UND das Blatt sagt das
//  ausdrücklich, statt "nichts abgehakt" zu behaupten.
// ===========================================================================

function rlZahl(v){const n=Number(v);return Number.isFinite(n)?n:0}
function rlMm(v){return Math.round(rlZahl(v)).toLocaleString("de-CH")}

// Der gespeicherte Plan einer Massaufnahme in der Form, die zuGruppen()
// erwartet - exakt derselbe Weg wie werkZuschnittPlan() in js/51.
// v3.25: dieselbe eine Rechnung wie am Bildschirm (pmatPlanFuer, js/48).
// Die zwei Zusatzfelder, die sie setzt (material, erledigtFuer), braucht der
// Ausdruck nicht - er baut seine Tabelle selbst aus zuGruppen().
function rlPlan(m){
 return (typeof pmatPlanFuer==="function")?pmatPlanFuer(m):null;
}
function rlTyp(t){
 return (typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[t])||t||"Massaufnahme";
}
// v3.31: Material UND Staerke - beim Ruesten muss klar sein, welches Blech
// vom Stapel genommen wird. Die Staerke steht seit v3.31 an der Massaufnahme.
function rlMaterial(m){
 const name=(typeof pmatMaterialName==="function")?pmatMaterialName(((m&&m.data)||{}).material):"";
 const st=(typeof measStaerkeText==="function")?measStaerkeText(m&&m.staerke_mm):"";
 return [name&&name!=="Ohne Material"?name:"",st].filter(Boolean).join(" · ");
}
// Ist dieses Stück schon zugeschnitten? Kommt aus dem bereits geladenen
// Haken-Zwischenspeicher (js/56) - es wird dafür nichts nachgeladen.
function rlErledigt(mid,nr){
 return (typeof zeIstErledigt==="function")?zeIstErledigt(mid,nr):false;
}
function rlKasten(an){
 return an?'<span class="rl-box rl-box-an">✓</span>':'<span class="rl-box"></span>';
}

// Eine Massaufnahme als Block: Kopfzeile, dann je Zuschnitt eine Zeile mit
// Kästchen. Zusammengefasst wird über zuGruppen() - dieselbe Gruppierung wie
// am Bildschirm, damit gedruckt dasselbe dasteht.
function rlBlockHtml(m,plan){
 const gruppen=(typeof zuGruppen==="function")?zuGruppen(plan):[];
 if(!gruppen.length)return "";
 const bestes=(plan.moeglich||[])[0];
 const kopfzeile=[];
 const mat=rlMaterial(m);
 if(mat)kopfzeile.push(mat);
 if(bestes){
  // v3.33: Rolle oder Tafel steht auf dem Blatt - in der Werkstatt muss
  // ablesbar sein, WORAUS geschnitten wird. Die Woerter kommen aus ZU_WORT
  // (js/33), es gibt keine zweite Schreibweise.
  const w=(typeof zuWort==="function")?zuWort(plan):null;
  kopfzeile.push((w?w.kopf:"Rollenblech")+" "
    +((typeof zuFormatText==="function")?zuFormatText(bestes,plan):rlMm(bestes.breite)+" mm"));
  if(typeof zuAbschnittText==="function"){
   const ab=zuAbschnittText(bestes,plan);
   if(ab&&ab!=="–")kopfzeile.push(ab+" "+(w?w.ab:"ab Rolle"));
  }
 }
 let offen=0, gesamt=0;
 const zeilen=gruppen.map(g=>{
  const nummern=g.stuecke.map(x=>x.nr).filter(x=>x!==undefined&&x!==null);
  const bem=[];
  if(g.merkmal)bem.push(g.merkmal);
  const hinweise=[];
  g.stuecke.forEach(x=>{if(x.hinweis&&hinweise.indexOf(x.hinweis)<0)hinweise.push(x.hinweis)});
  if(hinweise.length)bem.push(hinweise.join(" · "));
  // Ein Kästchen JE STÜCK - abgehakt wird Stück für Stück, nicht in Gruppen.
  const kaesten=nummern.map(n=>{
   const an=rlErledigt(m.id,n);
   gesamt++; if(!an)offen++;
   return `<span class="rl-stueck">${rlKasten(an)}<span class="rl-nr">${esc(n)}</span></span>`;
  }).join("");
  return `<tr>
<td class="rl-anzahl"><b>${g.stuecke.length} ×</b></td>
<td class="rl-mass"><b>${esc(rlMm(g.laenge))}${g.breite>0?" × "+esc(rlMm(g.breite)):""} mm</b></td>
<td class="rl-kaesten">${kaesten}</td>
<td class="rl-bem">${esc(bem.join(" · "))||""}</td>
</tr>`;
 }).join("");
 return `<div class="eb-section-head">${esc(rlTyp(m.type))}${m.title?" · "+esc(m.title):""}</div>
${kopfzeile.length?`<div class="note rl-kopfzeile">${esc(kopfzeile.join(" · "))}</div>`:""}
<table class="eb-cutlist rl-tab">
<thead><tr><th>Anzahl</th><th>Zuschnitt L × B (mm)</th><th>Stück – abhaken</th><th>Bemerkung</th></tr></thead>
<tbody>${zeilen}</tbody>
</table>
<div class="note rl-stand">${gesamt-offen} von ${gesamt} bereits zugeschnitten${
  offen?" · noch "+offen+" offen":" · alles geschnitten"}</div>`;
}

// Aus welchen Massaufnahmen besteht die Liste? Für ein Projekt genau die,
// die einen gespeicherten Zuschnitt haben - eine Massaufnahme ohne Zuschnitt
// gehört auf kein Rüstblatt.
function rlAufnahmen(liste){
 return (liste||[]).map(m=>({m,plan:rlPlan(m)})).filter(x=>!!x.plan);
}

// Das ganze Dokument. projekt ist optional (eine Massaufnahme ohne Projekt
// hat keines) - dann steht im Kopf der Titel der Massaufnahme.
function rlDokumentHtml(o){
 const eintraege=o.eintraege||[];
 const erste=eintraege.length?eintraege[0].m:null;
 const kopf=pdfKopfHtml({
  datensatz:o.datensatz||erste||{project_id:o.projectId||null},
  projekt:o.projekt||null,
  bezeichnung:o.bezeichnung||"",
  dokumenttyp:"Rüstliste",
  unterart:o.unterart||"",
  datum:new Date().toISOString().slice(0,10),
  bearbeiter:(typeof currentProfile!=="undefined"&&currentProfile)
    ?`${currentProfile.first_name} ${currentProfile.last_name}`:"",
  logoSrc:o.logoSrc
 });
 const abhaken=(typeof zeAbhakenMoeglich!=="function")||zeAbhakenMoeglich();
 const hinweis=abhaken?"":`<div class="note rl-warnung">Das Abhaken in der App ist ausgeschaltet –
diese Liste zeigt deshalb <b>keinen</b> Stand. Alle Kästchen sind leer gedruckt, auch wenn
in der Werkstatt schon geschnitten wurde.</div>`;
 const bloecke=eintraege.map(x=>rlBlockHtml(x.m,x.plan)).filter(Boolean).join("");
 return kopf+hinweis+(bloecke||`<div class="note">Zu dieser Auswahl ist nichts zuzuschneiden –
keine Massaufnahme hat einen gespeicherten Zuschnitt.</div>`);
}

// Eigenes, kleines Stylesheet für die Kästchen. Der Rest kommt unverändert
// aus PDF_LAYOUT_CSS.
const RL_CSS=`
 .rl-kopfzeile{margin:0 0 1.5mm}
 .rl-tab td,.rl-tab th{vertical-align:top}
 .rl-anzahl{width:12mm;white-space:nowrap}
 .rl-mass{width:38mm;white-space:nowrap}
 .rl-bem{width:34mm}
 .rl-stueck{display:inline-block;white-space:nowrap;margin:0 3mm 1mm 0}
 .rl-box{display:inline-block;width:4mm;height:4mm;border:0.5pt solid #17202a;
   margin-right:1mm;vertical-align:-0.6mm;text-align:center;line-height:3.6mm;font-size:7pt}
 .rl-box-an{background:#e6eaed}
 .rl-nr{font-size:8pt}
 .rl-stand{margin:1mm 0 3mm;color:#5b666e}
 .rl-warnung{border:0.5pt solid #17202a;padding:2mm;margin:0 0 3mm}
`;

// Der eine Weg. opt.titel steht im Auswahldialog - der erscheint hier nicht,
// weil listen:"alle" gesetzt ist; dieselbe Funktion öffnet aber das Fenster
// und meldet einen blockierten Popup-Blocker wie überall sonst.
async function rlDrucken(o){
 if(typeof pdfDruckVorbereiten!=="function"){alert("Der Druck ist gerade nicht verfügbar.");return}
 const eintraege=rlAufnahmen(o.liste);
 if(!eintraege.length){
  alert("Für diese Auswahl gibt es nichts zu rüsten – keine Massaufnahme hat einen gespeicherten Zuschnitt.");
  return;
 }
 let logoSrc="";
 try{ logoSrc=(typeof storageSignedUrl==="function")?await storageSignedUrl(logoUrl):logoUrl }catch(e){ logoSrc="" }
 const html=rlDokumentHtml({...o,eintraege,logoSrc});
 const vor=await pdfDruckVorbereiten(html,"eb-section-head",{listen:"alle"});
 if(!vor)return;
 const win=vor.win;
 const name=(typeof pdfDateiname==="function")
  ?pdfDateiname("Ruestliste",o.bezeichnung||"",o.unterart||""):"Rüstliste";
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
<style>
${PDF_LAYOUT_CSS}
${RL_CSS}
</style></head><body>
${(typeof pdfZahlenRechts==="function")?pdfZahlenRechts(vor.html):vor.html}
${(typeof pdfFooterHtml==="function")?pdfFooterHtml(o.datensatz||null):""}
</body></html>`);
 win.document.close();
 const drucken=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=drucken;
 setTimeout(drucken,800);
}

// ---- Die zwei Einstiege ---------------------------------------------------
// Ein ganzes Projekt: alle Massaufnahmen, die einen Zuschnitt haben.
async function ruestlisteProjekt(projectId,aufnahmen){
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))
  ?allProjects.find(x=>String(x.id)===String(projectId)):null;
 await rlDrucken({
  liste:aufnahmen||[],
  projekt:p||null,
  projectId,
  datensatz:{project_id:projectId||null},
  bezeichnung:"",
  unterart:"ganzes Projekt"
 });
}
// Eine einzelne Massaufnahme.
async function ruestlisteMassaufnahme(m){
 if(!m)return;
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))
  ?allProjects.find(x=>String(x.id)===String(m.project_id)):null;
 await rlDrucken({
  liste:[m],
  projekt:p||null,
  projectId:m.project_id||null,
  datensatz:m,
  bezeichnung:m.title||"",
  unterart:rlTyp(m.type)
 });
}
