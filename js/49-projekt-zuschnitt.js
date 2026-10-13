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
// v3.335: Wer darf GEMEINSAM auf einer Rolle optimiert werden? Nur Stücke mit gleichem Werkstoff, gleicher Stärke, gleicher Form
// (Rolle oder Tafel) und gleicher Rollenwahl der Massaufnahme (die Wahl bestimmt, welche Rollenbreiten erlaubt sind). Alles andere
// bleibt in getrennten Gruppen. Stangen/Normlängen (Rinne halbrund) sind keine Rollenstreifen und werden nie in einen Rollenplan gemischt.
function pzuStaerkeText(v){
 const n=Number(v);
 return (v===null||v===undefined||v===""||!Number.isFinite(n)||n<=0)?"":String(n).replace(".",",")+" mm";
}
function pzuGruppenKey(m,ovr){
 const r=(typeof pmatPlanRoh==="function")?pmatPlanRoh(m):null;
 const d=(m&&m.data)||{};
 const form=(r&&r.form==="tafel")?"tafel":"rolle";
 let wahl=((r&&r.auswahl)||[]).map(Number).filter(x=>x>0).sort((a,b)=>a-b);
 // v3.337: im Projekt-Rüstblatt wählt man die Rollen für den gemeinsamen Zuschnitt separat (ovr); sie ersetzen die Wahl der Massaufnahme
 // (Tafelmaterial hat keine Rollenwahl).
 if(form==="rolle"&&Array.isArray(ovr)&&ovr.length)wahl=ovr.map(Number).filter(x=>x>0).sort((a,b)=>a-b);
 const st=Number(m&&m.staerke_mm);
 return {key:[String(d.material||""),Number.isFinite(st)&&st>0?String(st):"",form,wahl.join(",")].join("|"),
         form,wahl,staerke:Number.isFinite(st)&&st>0?st:null};
}
// opt.rollen: erlaubte Rollenbreiten für alle Gruppen (ersetzt die Wahl der Massaufnahmen). opt.ohneErledigte: bereits abgehakte Stücke
// kommen nicht in den Plan, sondern in M.erledigt - ein Abschnitt soll nicht abgehakte und offene Stücke mischen (v3.337).
function pzuSammeln(liste,opt){
 opt=opt||{};
 const nachMaterial=new Map();
 const ohne=[];
 let nr=0;
 (liste||[]).forEach(m=>{
  const rohPlan=(typeof pmatPlanRoh==="function")?pmatPlanRoh(m):null;
  if(rohPlan&&rohPlan.art==="stange"){
   ohne.push({id:m.id,text:pzuQuelle(m),grund:"Normlängen (Stange) – kein Rollenstreifen, nicht im gemeinsamen Rollenplan"});
   return;
  }
  const stuecke=(typeof pmatStuecke==="function")?pmatStuecke(m):[];
  if(!stuecke.length){
   const d=(m&&m.data)||{};
   if(d.rollen||d.zuschnitt)ohne.push({id:m.id,text:pzuQuelle(m),grund:"kein Zuschnitt im gespeicherten Plan"});
   return;
  }
  const gk=pzuGruppenKey(m,opt.rollen);
  const baseName=(typeof pmatMaterialName==="function")?pmatMaterialName((m.data||{}).material):"Ohne Material";
  const matName=[baseName,gk.staerke?pzuStaerkeText(gk.staerke):"",gk.form==="tafel"?"Tafeln":"",
                 gk.wahl.length?"Rollen "+gk.wahl.join("/")+" mm":""].filter(Boolean).join(" · ");
  // Die Material-ID wird mitgefuehrt, weil der Reststueck-Vorabzug (v3.27)
  // damit die Merkmale des Lagerbestands nachschlaegt. Der Name allein
  // genuegt dafuer nicht.
  if(!nachMaterial.has(gk.key))nachMaterial.set(gk.key,
    {material:matName,materialId:(m.data||{}).material||null,staerke:gk.staerke,form:gk.form,auswahl:gk.wahl,gruppen:[],erledigt:[],quellen:new Map()});
  const M=nachMaterial.get(gk.key);
  M.quellen.set(m.id,m);
  stuecke.forEach(s=>{
   const breite=Number(s.breite)||0;
   if(opt.ohneErledigte&&typeof zeIstErledigt==="function"&&zeIstErledigt(m.id,s.nr)){
    M.erledigt.push({quelleId:m.id,origNr:s.nr,laenge:s.laenge,breite,merkmal:s.merkmal||"",hinweis:pzuQuelle(m)});
    return;
   }
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
 }).filter(M=>M.gruppen.length||M.erledigt.length)     // v3.335: eine Gruppe ohne verwertbares Stück (z. B. keine Streifenbreite gespeichert) ist keine Gruppe
 .sort((a,b)=>a.material.localeCompare(b.material,"de"));
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
 const fm=ebaFormate({material:M.materialId,staerke:null,form:M.form,rollen:(M.auswahl&&M.auswahl.length)?M.auswahl:undefined});
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
function pzuMatText(m){
 const name=(typeof pmatMaterialName==="function")?pmatMaterialName(((m&&m.data)||{}).material):"";
 const st=pzuStaerkeText(m&&m.staerke_mm);
 const hatName=!!name&&name!=="Ohne Material";
 // v3.340: was fehlt, steht ausdrücklich da (nichts wird ergänzt oder geraten)
 if(!hatName&&!st)return "kein Material erfasst";
 return [hatName?name:"Material fehlt",st||"Stärke nicht erfasst"].join(" · ");
}
function pzuStandText(m){
 if(!pzuHatPlan(m))return "noch kein Zuschnitt";
 const teile=[];
 if(typeof zeStand==="function"&&typeof rbStandText==="function"){
  try{teile.push(rbStandText(zeStand(m)))}catch(e){}
 }
 if(typeof mwStatusText==="function"&&m.workflow_status)teile.push(mwStatusText(m.workflow_status));
 return teile.join(" · ")||"Zuschnitt gespeichert";
}
// v3.335: Auswahl der Massaufnahmen für gemeinsamen Zuschnitt und Projekt-Rüstblatt. Die Auswahl ist die bestehende
// Ausschlussliste des Projekts (projects.zuschnitt_ausschluss, v3.86): leer = alle. Sie ändert weder Massaufnahmen noch Zuschnittpläne.
// Ids der gespeicherten Liste, die es im Projekt nicht mehr gibt (gelöscht), werden ignoriert und gemeldet.
function pzuAuswahlHtml(alle){
 if(!alle.length)return "";
 const ausschluss=pzuAusschlussListe();
 const ids=new Set(alle.map(m=>Number(m.id)));
 const fremd=[...ausschluss].filter(x=>!ids.has(x)).length;
 const n=alle.filter(m=>!ausschluss.has(Number(m.id))).length;
 return `<div class="pzu-auswahl">
  <div class="pmat-unter">Berücksichtigte Massaufnahmen <span class="small muted">· ${n} von ${alle.length} ausgewählt</span></div>
  <div class="small muted">Die Auswahl gilt für dieses Projekt und wird gespeichert (sie ändert keine Massaufnahme und keinen Zuschnitt).</div>
  <div class="bar" style="margin:6px 0">
   <button type="button" class="gray mz-klein" data-pzu-alle="1">Alle auswählen</button>
   <button type="button" class="gray mz-klein" data-pzu-keine="1">Auswahl aufheben</button>
  </div>
  ${alle.map(m=>`<label class="pzu-auswahl-zeile" style="display:block;padding:4px 0">
    <input type="checkbox" data-pzu-auswahl="${esc(m.id)}" ${ausschluss.has(Number(m.id))?"":"checked"}>
    <b>${esc(pzuQuelle(m))}</b>
    <span class="small muted">· ${esc(pzuMatText(m))} · ${esc(pzuStandText(m))}</span>
   </label>`).join("")}
  ${fremd?`<div class="small muted">Die gespeicherte Auswahl enthielt ${fremd} Massaufnahme${fremd===1?"":"n"}, die es in diesem Projekt nicht mehr gibt – ignoriert.</div>`:""}
 </div>`;
}

// ---- Projekt-Rüstblatt: gemeinsamer Rollenzuschnitt der ausgewählten Massaufnahmen (nur Vorschau) --------------------------------
// Keine zweite Rechnung: gruppiert wird mit pzuSammeln (Werkstoff + Stärke + Form + Rollenwahl), gepackt mit ebaFormatPlan (js/29),
// dargestellt mit zuListeHtml (js/33) samt Herkunft je Stück. Es wird NICHTS gespeichert, reserviert, gebucht oder abgehakt.
// Zum Vergleich wird dieselbe Rechnung je Massaufnahme einzeln gemacht ("getrennt"); Zahlen nur, wo sie zuverlässig vorliegen.
function pzuGetrenntFlaeche(M,opt){
 let summe=0;
 for(const m of M.quellen){
  const E=pzuSammeln([m],opt).materialien[0];
  if(!E)return null;
  const b=pzuRollenPlan(E).bestes;
  if(!b||!Number.isFinite(Number(b.flaeche)))return null;
  summe+=Number(b.flaeche);
 }
 return summe;
}
// v3.336: abgeschlossene (und archivierte) Massaufnahmen kommen auf kein Rüstblatt und in keine Rüstliste.
function pzuRuestbar(m){return !!m&&m.workflow_status!=="abgeschlossen"&&m.archived!==true}
// opt.rollen: separat gewählte Rollenbreiten (null = die Wahl der einzelnen Massaufnahmen). Bereits abgehakte Stücke sind nicht Teil des
// Plans (sie sind geschnitten) und stehen je Gruppe in einem eigenen Block „Bereits zugeschnitten“.
function pzuProjektRuestblattHtml(liste,opt){
 const q=(liste||[]).filter(m=>m&&pzuRuestbar(m));
 const so={rollen:(opt&&Array.isArray(opt.rollen)&&opt.rollen.length)?opt.rollen:null,ohneErledigte:true};
 const {materialien,ohne}=pzuSammeln(q,so);
 // v3.343: Farbe je Massaufnahme (stabil nach Id) für das Rollenband, dazu Summenleiste über alle Gruppen
 const PAL=["#bfd7ff","#c9ecc9","#ffd9b3","#e3c9f5","#ffc9c9","#fff3b0","#c4ece8","#e6d2b8"];
 const ids=[...new Set(q.map(m=>String(m.id)))].sort((a,b)=>Number(a)-Number(b));
 const farbeVon=x=>PAL[Math.max(0,ids.indexOf(String(x.quelleId)))%PAL.length];
 const sum={stuecke:0,flaeche:0,laenge:0,verschnitt:0,getrennt:0,ok:true,gruppen:0,erledigt:0};
 const qm=x=>(Number(x)).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
 const gruppen=materialien.map(M=>{
  const plan=pzuPlan(M);
  const best=M.gruppen.length?(plan.moeglich||[])[0]:null;
  const zahlen=[];
  const nOff=M.gruppen.reduce((z,g)=>z+(g.stuecke||[]).length,0), nOk=(M.erledigt||[]).length;
  sum.stuecke+=nOff;sum.erledigt+=nOk;
  if(nOk)zahlen.push(`Bereits abgehakt: <b>${nOk} von ${nOk+nOff}</b> Stück – nicht mehr im Plan`);
  if(best&&Number.isFinite(Number(best.flaeche))){
   zahlen.push(`Rolle: <b>${esc(typeof zuFormatText==="function"?zuFormatText(best,plan):"")}</b>`,
     `Blech: <b>${qm(best.flaeche)} m²</b>`);
   if(Number.isFinite(Number(best.verschnitt)))zahlen.push(`Verschnitt: <b>${qm(best.verschnitt)} m²</b> (${Math.round(Number(best.anteil)||0)} %)`);
  }
  if(M.gruppen.length){
   sum.gruppen++;
   if(best&&Number.isFinite(Number(best.flaeche))){
    sum.flaeche+=Number(best.flaeche);sum.laenge+=Number(best.rollenLaenge)||0;sum.verschnitt+=Number(best.verschnitt)||0;
    const g1=pzuGetrenntFlaeche(M,so);
    if(g1===null)sum.getrennt=NaN; else sum.getrennt+=g1;
   }else sum.ok=false;
  }
  let vergleich="";
  if(M.quellen.length>1&&best&&Number.isFinite(Number(best.flaeche))){
   const getrennt=pzuGetrenntFlaeche(M,so);
   if(getrennt!==null){
    const diff=getrennt-Number(best.flaeche);
    vergleich=`<div class="small">Einzeln gerechnet: ${qm(getrennt)} m² Blech · gemeinsam: ${qm(best.flaeche)} m² – `
      +(diff>1e-9?`<b>${qm(diff)} m² weniger</b>`:(diff<-1e-9?`gemeinsam ${qm(-diff)} m² mehr (keine Verbesserung)`:"kein Unterschied"))+`</div>`;
   }
  }
  const liste=(M.gruppen.length&&typeof zuListeHtml==="function")?zuListeHtml(plan,{herkunft:true}):"";
  const erl=(M.erledigt||[]).length?`<div class="pzu-erledigt"><div class="small"><b>Bereits zugeschnitten</b> (abgehakt, nicht mehr im Plan):</div>
   <div class="zu-streifen-stuecke">${M.erledigt.map(x=>`<span class="zu-st"><span class="zu-nr zu-nr-ist ze-ok">${esc(x.origNr)}</span><span class="zu-st-mass">${esc(typeof zuMm==="function"?zuMm(Math.round(Number(x.laenge)||0)):x.laenge)} mm <span class="zu-st-zusatz">· ${esc(x.hinweis)}</span></span></span>`).join("")}</div></div>`:"";
  const keinePlan=!M.gruppen.length?`<div class="small"><b>Alle Stücke dieser Gruppe sind bereits abgehakt</b> – nichts mehr zuzuschneiden.</div>`:"";
  const fehlt=!M.gruppen.length?"":((plan.zuSchmal||[]).length||(plan.zuLang||[]).length||(plan.zuKurz||[]).length||!best
    ?`<div class="small" style="color:var(--red)">Für diese Gruppe passt keine hinterlegte Rolle bzw. kein Format – kein gemeinsamer Plan berechenbar.</div>`:"");
  return `<div class="pzu-rb-gruppe">
   <div class="rb-kopf"><b>Gemeinsamer Zuschnitt · ${esc(M.material)}</b><span class="small">Vorschau · ${M.quellen.length} Massaufnahme${M.quellen.length===1?"":"n"}, gemeinsam optimiert</span></div>
   ${zahlen.length?`<div class="small">${zahlen.join(" · ")}</div>`:""}
   ${vergleich}${fehlt}${keinePlan}${M.gruppen.length&&typeof zuRollenbandHtml==="function"?zuRollenbandHtml(plan,farbeVon):""}${liste}${erl}
  </div>`;
 }).join("<!--rb-seite-->");
 const nicht=ohne.length?`<div class="small muted" style="margin-top:6px"><b>Nicht im gemeinsamen Plan:</b> ${esc(ohne.map(o=>o.text+" ("+o.grund+")").join(" · "))}</div>`:"";
 // Summenleiste: nur mit vollständigen Zahlen aller Gruppen; Einsparung nur, wenn „einzeln“ und „gemeinsam“ gleich definiert berechnet sind
 const m2=x=>Number(x).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
 let leiste="";
 if(sum.gruppen&&sum.ok){
  const diff=sum.getrennt-sum.flaeche;
  const spart=Number.isFinite(sum.getrennt)?(diff>1e-9?`<div class="pzu-spart"><small>Optimierung</small><b>spart ${m2(diff)} m²</b><span class="small"> Blech gegenüber Einzelplanung</span></div>`
    :`<div><small>Optimierung</small><b>keine Einsparung</b><span class="small"> gegenüber Einzelplanung</span></div>`):"";
  leiste=`<div class="pzu-summe"><div><small>Zuschnitte (offen)</small><b>${sum.stuecke}</b></div>
   <div><small>Rollenlänge</small><b>${(sum.laenge/1000).toLocaleString("de-CH",{maximumFractionDigits:2})} m</b></div>
   <div><small>Blechfläche</small><b>${m2(sum.flaeche)} m²</b></div>
   <div><small>Verschnitt</small><b>${m2(sum.verschnitt)} m²</b>${sum.flaeche>0?`<span class="small"> (${Math.round(sum.verschnitt/sum.flaeche*100)} %)</span>`:""}</div>${spart}</div>`;
 }
 const legende=q.length>1&&materialien.length?`<div class="pzu-legende">${ids.map(id=>{const m=q.find(x=>String(x.id)===id);return `<span><i style="background:${farbeVon({quelleId:id})}"></i>${esc(m?pzuQuelle(m):id)}</span>`}).join("")}</div>`:"";
 return {html:leiste+legende+gruppen+nicht,gruppen:materialien.length,ohne:ohne.length,summe:sum};
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
 const mitPlan=ausgewaehlt.filter(m=>pzuHatPlan(m)&&pzuRuestbar(m));
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
  const alleBtn=e.target.closest?e.target.closest("[data-pzu-alle],[data-pzu-keine]"):null;
  if(alleBtn){
   const alle=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
   await pzuAuswahlSpeichern(alleBtn.hasAttribute("data-pzu-alle")?[]:alle.map(m=>Number(m.id)));
   if(typeof renderProjektZuschnitt==="function")renderProjektZuschnitt();
   return;
  }
  const druck=e.target.closest?e.target.closest("[data-pzu-druck]"):null;
  if(druck){
   const alle=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
   const mit=pzuAusgewaehlteListe(alle).filter(m=>pzuRuestbar(m)&&(typeof pmatPlanFuer==="function")&&!!pmatPlanFuer(m));
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
