// ---------------------------------------------------------------------------
// v3.09  Projektweiter Zuschnitt
// ---------------------------------------------------------------------------
// Fasst die Zuschnitte ALLER Massaufnahmen eines Projekts zu einem
// gemeinsamen Rollenblech-Plan zusammen: was heute je Massaufnahme einzeln
// von der Rolle gezogen wird, kann so aus denselben Abschnitten kommen.
//
// ES GIBT KEINE ZWEITE BERECHNUNG (Auftrag Abschnitt 5 und 21):
//   - gepackt wird mit ebaPackeInStreifen()/ebaVerteile() aus js/29 - der
//     EINEN Packrechnung der App,
//   - die Schnittfuge kommt aus ebaSchnittfuge() bzw. ebaStreifenJeAbschnitt(),
//   - dargestellt wird mit zuschnittHtml() aus js/33 - der EINEN Darstellung,
//   - die Reststuecke kommen ueber restBlockHtml() aus js/42 - dem EINEN
//     Reststuecklager.
// Neu ist hier ausschliesslich, WELCHE Stuecke zusammen in die Rechnung
// gehen: die des ganzen Projekts statt die einer Massaufnahme.
//
// Die Stuecke selbst werden nicht neu gerechnet, sondern aus dem
// GESPEICHERTEN Plan jeder Massaufnahme gelesen (siehe js/48).
//
// Getrennt wird nach MATERIAL: Stuecke aus verschiedenen Materialien koennen
// nicht aus derselben Rolle kommen. Innerhalb eines Materials wird nach
// Streifenbreite gruppiert - wie beim Freien Profil und bei der Lukarne.
//
// Sichtbar nur, wenn das Untermodul eingeschaltet ist - pmAktiv("zuschnitt").
// ---------------------------------------------------------------------------

// Kurzbezeichnung einer Massaufnahme fuer die Herkunft eines Zuschnitts.
function pzuQuelle(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=(m.title||"").trim();
 return t?(art+" · "+t):art;
}

// Alle Zuschnittstuecke des Projekts, nach Material und Streifenbreite.
// Jedes Stueck traegt seine Herkunft mit: "hinweis" ist in der gemeinsamen
// Darstellung eine reine Beschriftung und zerlegt die Gruppe NICHT (v2.85),
// "merkmal" dagegen trennt - dort steht weiter, was die Massaufnahme selbst
// als unterscheidende Bearbeitung abgelegt hat.
//
// v3.86: hier wird NICHT MEHR selbst gepackt (das war bis v3.85 eine eigene,
// vereinfachte Rechnung ohne Tafel-Unterstuetzung und ohne die v3.83-
// Optimierung fuer mehrere Abschnittlaengen). Gepackt wird jetzt in
// pzuRollenPlan() ueber ebaFormatPlan() (js/29) - dieselbe EINE Packrechnung
// wie bei jeder einzelnen Massaufnahme. Hier werden nur noch gruppiert und
// die Reststuecke vorab abgezogen; "bleche" ist das Feld, das ebaFormatPlan
// erwartet (wie bei fpaZuschnittGruppen, js/31).
function pzuSammeln(liste){
 const nachMaterial=new Map();
 const ohne=[];
 let nr=0;
 (liste||[]).forEach(m=>{
  const stuecke=(typeof pmatStuecke==="function")?pmatStuecke(m):[];
  if(!stuecke.length){
   const d=(m&&m.data)||{};
   if(d.rollen||d.zuschnitt)ohne.push({id:m.id,text:pzuQuelle(m),grund:"kein Zuschnitt im gespeicherten Plan"});
   return;
  }
  const matName=(typeof pmatMaterialName==="function")?pmatMaterialName((m.data||{}).material):"Ohne Material";
  // Die Material-ID wird mitgefuehrt, weil der Reststueck-Vorabzug (v3.27)
  // damit die Merkmale des Lagerbestands nachschlaegt. Der Name allein
  // genuegt dafuer nicht.
  if(!nachMaterial.has(matName))nachMaterial.set(matName,
    {material:matName,materialId:(m.data||{}).material||null,gruppen:[],quellen:new Map()});
  const M=nachMaterial.get(matName);
  M.quellen.set(m.id,m);
  stuecke.forEach(s=>{
   const breite=Number(s.breite)||0;
   if(!(breite>0)){ohne.push({id:m.id,text:pzuQuelle(m),grund:"keine Streifenbreite gespeichert"});return}
   let g=M.gruppen.find(x=>x.breite===breite);
   if(!g){g={breite,stuecke:[]};M.gruppen.push(g)}
   // origNr ist die STABILE, urspruengliche Stuecknummer aus der eigenen
   // Massaufnahme (pmatStuecke liefert sie unveraendert) - "nr" daneben ist
   // die neu vergebene, fortlaufende Nummer fuer DIESE zusammengefasste
   // Ansicht. Das Abhaken (pzuHerkunftHtml) braucht origNr+quelleId, weil nur
   // die Kombination ueber alle Massaufnahmen hinweg eindeutig bleibt.
   g.stuecke.push({nr:++nr,origNr:s.nr,laenge:s.laenge,merkmal:s.merkmal||"",
     hinweis:pzuQuelle(m),quelleId:m.id});
  });
 });
 const raus=[...nachMaterial.values()].map(M=>{
  M.gruppen.sort((a,b)=>b.breite-a.breite);
  // v3.27: passende Reststuecke fallen VOR der Rollenrechnung aus dem Bedarf -
  // je Gruppe mit DEREN Streifenbreite. Ueber das ganze Projekt gerechnet ist
  // das die genauere Zahl als die Summe der einzelnen Plaene: derselbe Rest
  // kann hier nur EINMAL vergeben werden. Gerechnet wird in restVorabzug()
  // (js/42) mit der bestehenden Packrechnung; bei ausgeschalteter Einstellung
  // kommt die Liste unveraendert zurueck.
  M.ausResten=[];
  M.gruppen.forEach(g=>{
   const vor=(typeof ebaVorabzug==="function")
    // v3.31: ausdruecklich OHNE Staerke - diese Gruppe kann Stuecke aus
    // mehreren Massaufnahmen enthalten, eine gemeinsame Staerke waere
    // geraten. Der Abgleich bleibt hier so streng wie bis v3.30.
    ?ebaVorabzug(g.stuecke,{material:M.materialId,abwicklung:g.breite,staerke:null})
    :{bleche:g.stuecke,ausResten:[]};
   g.stuecke=vor.bleche||[];
   (vor.ausResten||[]).forEach(x=>M.ausResten.push(x));
   // Gepackt wird erst in pzuRollenPlan() ueber ebaFormatPlan (js/29) - bei
   // Tafelmaterial haengt die Abschnittlaenge am Format, nicht am laengsten
   // Stueck, und darf deshalb hier noch nicht festgelegt werden.
   g.bleche=g.stuecke;
  });
  // Eine Gruppe, deren Stuecke vollstaendig aus Resten kommen, hat fuer die
  // Rolle nichts mehr - sie faellt raus.
  M.gruppen=M.gruppen.filter(g=>g.stuecke.length);
  M.quellen=[...M.quellen.values()];
  return M;
 }).sort((a,b)=>a.material.localeCompare(b.material,"de"));
 return {materialien:raus,ohne};
}

// Nettoflaeche einer Materialgruppe: Summe aller Stuecke Laenge x Breite.
// Das ist dieselbe Groesse, die die einzelne Massaufnahme als
// data.flaeche_m2 ablegt - hier nur ueber mehrere Aufnahmen.
function pzuNetto(M){
 let s=0;
 (M.gruppen||[]).forEach(g=>(g.stuecke||[]).forEach(x=>{s+=(Number(x.laenge)||0)*g.breite}));
 return s/1e6;
}

// Der Rollen-/Tafelplan einer Materialgruppe. v3.86: gerechnet wird nicht
// mehr mit einer eigenen, vereinfachten Formel, sondern mit ebaFormate()/
// ebaFormatPlan() (js/29) - genau wie bei jeder einzelnen Massaufnahme
// (siehe fpaRollenPlan, js/31, fuer das gleiche Muster bei mehreren
// Streifenbreiten). Das bringt zwei Dinge automatisch mit, die die alte
// eigene Rechnung nicht hatte: Tafelmaterial aus dem Materialbestand (bisher
// gab es hier NUR Rollenbreiten), und die v3.83-Optimierung fuer mehrere
// Abschnittlaengen bei jeAbschnitt>=2.
function pzuRollenPlan(M){
 const netto=pzuNetto(M);
 if(!M.gruppen.length||typeof ebaFormatPlan!=="function")
  return {gruppen:M.gruppen,moeglich:[],zuSchmal:[],zuLang:[],zuKurz:[],bestes:null,netto,optimal:true,
          ...((typeof ebaFormLeer==="function")?ebaFormLeer(M.materialId):{form:"rolle",formGrund:"",formQuelle:"",formate:[]})};
 const fm=ebaFormate({material:M.materialId,staerke:null});
 const p=ebaFormatPlan({gruppen:M.gruppen,formate:fm.formate,form:fm.form,netto});
 return {gruppen:p.gruppen,moeglich:p.moeglich,zuSchmal:p.zuSchmal,zuLang:p.zuLang,zuKurz:p.zuKurz,
         bestes:p.bestes,netto:p.netto,optimal:p.optimal,
         form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,formate:p.formate};
}

// Der Plan in der Form, die zuschnittHtml() erwartet - seit v3.86 identisch
// mit dem, was jedes einzelne Modul liefert: ebaFormatPlan()'s "moeglich" hat
// bereits genau die Form, die js/33 braucht, eine Umformung wie bis v3.85
// ist nicht mehr noetig.
function pzuPlan(M){
 const p=pzuRollenPlan(M);
 return {art:p.form||"rolle", form:p.form||"rolle", einheit:"Stück",
  // v3.15: Zusammenfassung ueber mehrere Massaufnahmen - hier wird NICHT
  // ueber die (neu vergebene) Stuecknummer abgehakt, siehe pzuHerkunftHtml.
  sammel:true,
  material:M.material,
  einleitung:(typeof zuEinleitung==="function")?zuEinleitung(p.form):"",
  zusatz:"Zusammengefasst über "+M.quellen.length+" Massaufnahme"+(M.quellen.length===1?"":"n")
        +" dieses Projekts. Stücke mit gleicher Streifenbreite werden zusammen gepackt; "
        +"jedes Stück behält seine Herkunft.",
  quelle:(typeof zuQuelle==="function")?zuQuelle(p.form):"",
  leer:(typeof ebaLeerText==="function")?ebaLeerText({form:p.form,formate:p.formate},""):"",
  streifenbreiten:(p.gruppen||[]).map(g=>g.breite),
  gruppen:p.gruppen||[], moeglich:p.moeglich||[], netto:p.netto,
  ausResten:M.ausResten||[],
  zuSchmal:p.zuSchmal||[], zuLang:p.zuLang||[], zuKurz:p.zuKurz||[],
  optimal:p.optimal!==false,
  formGrund:p.formGrund||"", formQuelle:p.formQuelle||"", formate:p.formate||[]};
}

// Herkunft: welches Stueck stammt aus welcher Massaufnahme. Damit ist die
// Entstehung jedes Zuschnitts nachvollziehbar (Auftrag Abschnitt 5), und
// von hier fuehrt ein Weg zurueck in die Massaufnahme (Abschnitt 16).
//
// v3.86: die Stuecknummer je Herkunft ist jetzt abhakbar - ueber origNr (die
// stabile, urspruengliche Nummer IN DER MASSAUFNAHME), nicht ueber die hier
// neu vergebene, nur fuer diese Ansicht gueltige "nr". Derselbe Klick-Weg wie
// ueberall sonst (zeSetzen/data-ze-*, js/56) - keine zweite Abhak-Logik, nur
// eine weitere Anzeigestelle dafuer.
function pzuHerkunftHtml(M){
 const nach=new Map();
 (M.gruppen||[]).forEach(g=>(g.stuecke||[]).forEach(x=>{
  if(!nach.has(x.quelleId))nach.set(x.quelleId,[]);
  nach.get(x.quelleId).push({nr:x.nr,origNr:x.origNr,laenge:x.laenge,breite:g.breite,merkmal:x.merkmal});
 }));
 const abhakenAn=(typeof zeAbhakenMoeglich==="function")&&zeAbhakenMoeglich();
 return `<div class="pzu-herkunft"><div class="pmat-unter">Herkunft der Stücke</div>`+
  [...nach.entries()].map(([id,st])=>{
   const m=M.quellen.find(x=>x.id===id);
   // Kurzer Badge, Erklaerung daneben: ein langer Badge bricht nicht um und
   // lief bei 320 px aus der Karte hinaus (gemessen).
   const warn=(m&&m.freigabe_verfallen&&typeof mwAktiv==="function"&&mwAktiv())
    ? `<span class="mw-badge mw-rot">Freigabe verfallen</span>`
      +`<span class="small" style="color:var(--red)"> – dieser Stand ist nicht mehr freigegeben</span>`:"";
   const stueckHtml=s=>{
    const basis=(typeof zuMasse==="function"?zuMasse(s.laenge,s.breite):s.laenge+" × "+s.breite+" mm")
      +(s.merkmal?" · "+s.merkmal:"");
    const nrHtml=(!abhakenAn||s.origNr===undefined||s.origNr===null)
     ?esc(s.origNr)
     :`<button type="button" class="zu-nr zu-nr-hak" aria-pressed="false"`
      +` data-ze-meas="${esc(id)}" data-ze-nr="${esc(s.origNr)}"`
      +` data-ze-l="${esc(s.laenge)}" data-ze-b="${esc(s.breite||"")}"`
      +` data-ze-m="${esc(s.merkmal||"")}"`
      +` title="Stück ${esc(s.origNr)} als zugeschnitten abhaken">${esc(s.origNr)}</button>`;
    return esc(basis)+" (Stück "+nrHtml+")";
   };
   return `<div class="pzu-quelle">
    <button type="button" class="pmat-quelle" data-pzu-open="${esc(id)}">Massaufnahme: ${esc(m?pzuQuelle(m):("#"+id))}</button>
    ${warn}
    <div class="small">${st.map(stueckHtml).join(" · ")}</div>
   </div>`;
  }).join("")+`</div>`;
}

// ---- Auswahl: welche Massaufnahmen zaehlen mit? ----------------------------
// v3.86: bisher gingen IMMER alle Massaufnahmen des Projekts in die
// Zusammenfassung ein. Die Auswahl ist die AUSSCHLUSSLISTE (projects.
// zuschnitt_ausschluss, jsonb-Array von Massaufnahme-ids) - leer heisst
// "alle drin", genau wie ueberall sonst in der App (z. B. zuRollenGefiltert,
// js/33). So bleibt eine neu angelegte Massaufnahme automatisch dabei, ohne
// dass die gespeicherte Auswahl nachgezogen werden muss.
function pzuHatPlan(m){
 const d=(m&&m.data)||{};
 return !!(d.rollen||d.zuschnitt);
}
function pzuAusschlussListe(){
 const proj=(typeof cockpitProject==="function")?cockpitProject():null;
 const a=proj&&Array.isArray(proj.zuschnitt_ausschluss)?proj.zuschnitt_ausschluss:[];
 return new Set(a.map(Number));
}
function pzuAusgewaehlteListe(liste){
 const ausschluss=pzuAusschlussListe();
 return (liste||[]).filter(m=>!ausschluss.has(Number(m.id)));
}
// Wird dauerhaft gespeichert (Auftrag: Auswahl soll fuer die naechste
// Ruestliste/Abhaken-Sitzung erhalten bleiben, nicht nur fuer den aktuellen
// Ausdruck) - eine Spalte am Projekt, dieselbe Firmen-RLS wie das Projekt
// selbst.
async function pzuAuswahlSpeichern(ausschlussIds){
 if(typeof cockpitProjectId==="undefined"||!cockpitProjectId||typeof sb==="undefined"||!sb)return;
 const {data,error}=await sb.from("projects").update({zuschnitt_ausschluss:ausschlussIds})
   .eq("id",cockpitProjectId).select();
 if(error){console.error("projects.zuschnitt_ausschluss speichern",error);return}
 if(data&&data.length&&typeof allProjects!=="undefined"&&Array.isArray(allProjects)){
  const idx=allProjects.findIndex(x=>x.id===cockpitProjectId);
  if(idx>=0)allProjects[idx]=data[0];
 }
}
function pzuAuswahlHtml(alle){
 if(!alle.length)return "";
 const ausschluss=pzuAusschlussListe();
 return `<div class="pzu-auswahl">
  <div class="pmat-unter">Berücksichtigte Massaufnahmen</div>
  ${alle.map(m=>`<label class="pzu-auswahl-zeile">
    <input type="checkbox" data-pzu-auswahl="${esc(m.id)}" ${ausschluss.has(Number(m.id))?"":"checked"}>
    ${esc(pzuQuelle(m))}${pzuHatPlan(m)?"":` <span class="small" style="color:var(--muted)">(noch kein Zuschnitt)</span>`}
   </label>`).join("")}
 </div>`;
}

function renderProjektZuschnitt(){
 const box=$("cockpitZuschnittBody");
 if(!box)return 0;
 const karte=$("cockpitZuschnittCard");
 const an=(typeof pmAktiv==="function")&&pmAktiv("zuschnitt");
 if(karte)karte.hidden=!an;
 if(!an){box.innerHTML="";return 0}

 const alle=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
 const ausgewaehlt=pzuAusgewaehlteListe(alle);
 const {materialien,ohne}=pzuSammeln(ausgewaehlt);
 if($("cockpitZuschnittCount"))$("cockpitZuschnittCount").textContent=String(materialien.length);
 if(typeof cockpitModulStand==="function")cockpitModulStand();
 const auswahlHtml=pzuAuswahlHtml(alle);
 // Der Ruestlisten-Druck (js/58) ist derselbe, den Werkstatt und die Seite
 // "Material & Zuschnitt" bereits verwenden - hier nur mit der eigenen
 // Auswahl statt "alle" bzw. der Werkstatt-Statusfilterung.
 const mitPlan=ausgewaehlt.filter(m=>pzuHatPlan(m));
 const druckHtml=mitPlan.length
   ?`<button type="button" class="gray mz-klein" data-pzu-druck="1" title="Rüstliste der ausgewählten Massaufnahmen drucken">🖨️ Rüstliste</button>`:"";
 if(!materialien.length){
  box.innerHTML=auswahlHtml+druckHtml+
   `<div class="small">Noch nichts zuzuschneiden – keine der ausgewählten Massaufnahmen dieses Projekts hat einen gespeicherten Zuschnitt.</div>`;
  return 0;
 }
 box.innerHTML=auswahlHtml+druckHtml+materialien.map(M=>{
  const plan=pzuPlan(M);
  // zuschnittHtml() zeigt das Reststuecke-Lager bereits selbst (js/33
  // ruft restBlockHtml auf) - hier waere es doppelt.
  const htmlListe=(typeof zuschnittHtml==="function")?zuschnittHtml(plan):"";
  return `<div class="pzu-material">
   <div class="pmat-kopf"><b>${esc(M.material)}</b>
    <span class="small">${M.quellen.length} Massaufnahme${M.quellen.length===1?"":"n"}</span></div>
   ${htmlListe}
   ${pzuHerkunftHtml(M)}
  </div>`;
 }).join("")+(ohne.length?`<div class="small" style="color:var(--muted);margin-top:8px">
   Nicht enthalten: ${esc(ohne.map(o=>o.text+" ("+o.grund+")").join(" · "))}</div>`:"");
 return materialien.length;
}

// Zurueck in die verursachende Massaufnahme - ueber den bestehenden Weg. Der
// Ruestlisten-Druck (v3.86) nutzt denselben Klick-Bereich.
if($("cockpitZuschnittBody")){
 $("cockpitZuschnittBody").addEventListener("click",async e=>{
  const oeffnen=e.target.closest?e.target.closest("[data-pzu-open]"):null;
  if(oeffnen){
   const id=Number(oeffnen.dataset.pzuOpen);
   const m=(projectMeasurementsCache||[]).find(x=>x.id===id);
   if(!m)return;
   measEditReturnTo="projectCockpit";
   if(typeof openMeasurement==="function")openMeasurement(m);
   return;
  }
  const druck=e.target.closest?e.target.closest("[data-pzu-druck]"):null;
  if(druck){
   const alle=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
   const mit=pzuAusgewaehlteListe(alle).filter(m=>(typeof pmatPlanFuer==="function")&&!!pmatPlanFuer(m));
   if(mit.length&&typeof ruestlisteProjekt==="function"&&typeof cockpitProjectId!=="undefined")
    await ruestlisteProjekt(cockpitProjectId,mit);
   return;
  }
 });
 // v3.86: die Auswahl-Checkboxen speichern sich selbst und zeichnen die
 // Zusammenfassung neu - "leer=alle" (pzuAusschlussListe) bleibt dabei
 // die eine Quelle, keine zweite Auswahl-Ablage.
 $("cockpitZuschnittBody").addEventListener("change",async e=>{
  const cb=e.target.closest?e.target.closest("[data-pzu-auswahl]"):null;
  if(!cb)return;
  const id=Number(cb.dataset.pzuAuswahl);
  const ausschluss=pzuAusschlussListe();
  if(cb.checked)ausschluss.delete(id); else ausschluss.add(id);
  await pzuAuswahlSpeichern([...ausschluss]);
  if(typeof renderProjektZuschnitt==="function")renderProjektZuschnitt();
 });
}

// Eine Stelle frischt beide neuen Projektkarten auf. js/47 ruft sie nach
// einer Schalteraenderung, js/24 nach dem Laden der Massaufnahmen.
// Ist das Cockpit gar nicht offen, passiert nichts.
async function pmSichtbarkeitAuffrischen(){
 // v3.15: Beim Laden des Projekts wird nur noch die eine kompakte Karte
 // gebraucht. Die ausfuehrlichen Ansichten (Material, projektweiter
 // Zuschnitt, Reservierung) zeichnen sich erst, wenn die Seite
 // "Material & Zuschnitt" wirklich offen ist - sonst laeuft ihre Arbeit
 // samt Reservierungs-Abfrage bei jedem Projektwechsel ins Leere.
 const an=(typeof mzModulAn==="function")&&mzModulAn();
 if(an&&typeof zeLaden==="function"&&Array.isArray(projectMeasurementsCache))
  await zeLaden(projectMeasurementsCache.map(m=>m.id),true);
 if(typeof cockpitMatZuStand==="function")cockpitMatZuStand();
 if(typeof mzSeiteOffen==="function"&&mzSeiteOffen()){
  if(typeof renderProjektMaterial==="function")renderProjektMaterial();
  if(typeof renderProjektZuschnitt==="function")renderProjektZuschnitt();
  if(typeof resvCockpitLaden==="function"&&typeof cockpitProjectId!=="undefined")
   await resvCockpitLaden(cockpitProjectId);
  if(typeof mzAuffrischen==="function")mzAuffrischen();
 }
}
