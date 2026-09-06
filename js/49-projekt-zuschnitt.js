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
  if(!nachMaterial.has(matName))nachMaterial.set(matName,{material:matName,gruppen:[],quellen:new Map()});
  const M=nachMaterial.get(matName);
  M.quellen.set(m.id,m);
  stuecke.forEach(s=>{
   const breite=Number(s.breite)||0;
   if(!(breite>0)){ohne.push({id:m.id,text:pzuQuelle(m),grund:"keine Streifenbreite gespeichert"});return}
   let g=M.gruppen.find(x=>x.breite===breite);
   if(!g){g={breite,stuecke:[]};M.gruppen.push(g)}
   g.stuecke.push({nr:++nr,laenge:s.laenge,merkmal:s.merkmal||"",
     hinweis:pzuQuelle(m),quelleId:m.id});
  });
 });
 // Je Gruppe EINMAL packen: der Abschnitt ist so lang wie das laengste
 // Stueck dieser Streifenbreite, die Verteilung haengt damit nicht an der
 // Rollenbreite (v2.89). Gepackt wird mit der gemeinsamen Funktion.
 const raus=[...nachMaterial.values()].map(M=>{
  M.gruppen.sort((a,b)=>b.breite-a.breite);
  M.gruppen.forEach(g=>{
   g.abschnittLaenge=Math.max.apply(null,g.stuecke.map(x=>x.laenge));
   const v=(typeof ebaPackeInStreifen==="function")
    ?ebaPackeInStreifen(g.stuecke,g.abschnittLaenge)
    :{streifen:[],optimal:true};
   g.streifen=v.streifen||[];
   g.optimal=v.optimal!==false;
   g.zuLang=v.zuLang||[];
  });
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

// Der Rollenplan einer Materialgruppe. Gleiches Vorgehen wie
// fpaRollenPlan() beim Freien Profil, nur ueber mehrere Massaufnahmen.
function pzuRollenPlan(M){
 const breiten=(typeof zuRollenGefiltert==="function")?zuRollenGefiltert(null)
   :((typeof blechRollenbreiten!=="undefined"&&Array.isArray(blechRollenbreiten))?blechRollenbreiten.slice():[]);
 const netto=pzuNetto(M);
 if(!M.gruppen.length||!breiten.length)
  return {gruppen:M.gruppen,moeglich:[],zuSchmal:breiten.slice(),bestes:null,netto,optimal:true};
 const moeglich=[], zuSchmal=[];
 breiten.forEach(B=>{
  const zeilen=[]; let flaeche=0, passt=true;
  M.gruppen.forEach(g=>{
   const jeAbschnitt=(typeof ebaStreifenJeAbschnitt==="function")?ebaStreifenJeAbschnitt(B,g.breite):0;
   if(jeAbschnitt<1){passt=false;return}
   const abschnitte=Math.ceil(g.streifen.length/jeAbschnitt);
   const rollenLaenge=abschnitte*g.abschnittLaenge;
   flaeche+=B*rollenLaenge/1e6;
   zeilen.push({breite:g.breite,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,
                abschnittLaenge:g.abschnittLaenge,rollenLaenge,
                streifen:g.streifen.length,restBreite:B-jeAbschnitt*g.breite});
  });
  if(!passt){zuSchmal.push(B);return}
  moeglich.push({breite:B,zeilen,flaeche,verschnitt:flaeche-netto,
                 anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
                 rollenLaenge:zeilen.reduce((s,x)=>s+x.rollenLaenge,0)});
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 const best=moeglich[0]||null;
 const gefuellt=M.gruppen.map((g,i)=>Object.assign({},g,{
   jeAbschnitt:best?best.zeilen[i].jeAbschnitt:1,
   abschnitte:best?best.zeilen[i].abschnitte:0,
   rollenLaenge:best?best.zeilen[i].rollenLaenge:0}));
 return {gruppen:gefuellt,moeglich,zuSchmal,bestes:best,netto,
         optimal:M.gruppen.every(g=>g.optimal!==false)};
}

// Der Plan in der Form, die zuschnittHtml() erwartet.
function pzuPlan(M){
 const p=pzuRollenPlan(M);
 const moeglich=(p.moeglich||[]).map(m=>({breite:m.breite,
   jeTafel:(m.zeilen&&m.zeilen.length===1)?m.zeilen[0].jeTafel:undefined,
   streifen:(m.zeilen||[]).reduce((s,z)=>s+z.jeAbschnitt,0),
   rollenLaenge:m.rollenLaenge,
   zeilen:(m.zeilen||[]).map(z=>({breite:z.breite,jeTafel:z.jeTafel,jeAbschnitt:z.jeAbschnitt,
     abschnitte:z.abschnitte,abschnittLaenge:z.abschnittLaenge,rollenLaenge:z.rollenLaenge})),
   flaeche:m.flaeche,verschnitt:m.verschnitt,anteil:m.anteil}));
 const zuLang=[];
 (p.gruppen||[]).forEach(g=>(g.zuLang||[]).forEach(x=>zuLang.push(x)));
 return {art:"rolle", einheit:"Stück",
  material:M.material,
  einleitung:(typeof ZU_EINLEITUNG_ROLLE!=="undefined")?ZU_EINLEITUNG_ROLLE:"",
  zusatz:"Zusammengefasst über "+M.quellen.length+" Massaufnahme"+(M.quellen.length===1?"":"n")
        +" dieses Projekts. Stücke mit gleicher Streifenbreite werden zusammen gepackt; "
        +"jedes Stück behält seine Herkunft.",
  quelle:(typeof ZU_QUELLE_ROLLE!=="undefined")?ZU_QUELLE_ROLLE:"",
  leer:"Für dieses Material ist noch nichts zuzuschneiden.",
  streifenbreiten:(p.gruppen||[]).map(g=>g.breite),
  gruppen:p.gruppen||[], moeglich, netto:p.netto,
  zuSchmal:p.zuSchmal, zuLang, optimal:p.optimal!==false};
}

// Herkunft: welches Stueck stammt aus welcher Massaufnahme. Damit ist die
// Entstehung jedes Zuschnitts nachvollziehbar (Auftrag Abschnitt 5), und
// von hier fuehrt ein Weg zurueck in die Massaufnahme (Abschnitt 16).
function pzuHerkunftHtml(M){
 const nach=new Map();
 (M.gruppen||[]).forEach(g=>(g.stuecke||[]).forEach(x=>{
  if(!nach.has(x.quelleId))nach.set(x.quelleId,[]);
  nach.get(x.quelleId).push({nr:x.nr,laenge:x.laenge,breite:g.breite,merkmal:x.merkmal});
 }));
 return `<div class="pzu-herkunft"><div class="pmat-unter">Herkunft der Stücke</div>`+
  [...nach.entries()].map(([id,st])=>{
   const m=M.quellen.find(x=>x.id===id);
   // Kurzer Badge, Erklaerung daneben: ein langer Badge bricht nicht um und
   // lief bei 320 px aus der Karte hinaus (gemessen).
   const warn=(m&&m.freigabe_verfallen&&typeof mwAktiv==="function"&&mwAktiv())
    ? `<span class="mw-badge mw-rot">Freigabe verfallen</span>`
      +`<span class="small" style="color:var(--red)"> – dieser Stand ist nicht mehr freigegeben</span>`:"";
   return `<div class="pzu-quelle">
    <button type="button" class="pmat-quelle" data-pzu-open="${esc(id)}">Massaufnahme: ${esc(m?pzuQuelle(m):("#"+id))}</button>
    ${warn}
    <div class="small">${st.map(s=>esc((typeof zuMasse==="function"?zuMasse(s.laenge,s.breite):s.laenge+" × "+s.breite+" mm")
      +" (Stück "+s.nr+")"+(s.merkmal?" · "+s.merkmal:""))).join(" · ")}</div>
   </div>`;
  }).join("")+`</div>`;
}

function renderProjektZuschnitt(){
 const box=$("cockpitZuschnittBody");
 if(!box)return 0;
 const karte=$("cockpitZuschnittCard");
 const an=(typeof pmAktiv==="function")&&pmAktiv("zuschnitt");
 if(karte)karte.hidden=!an;
 if(!an){box.innerHTML="";return 0}

 const liste=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
 const {materialien,ohne}=pzuSammeln(liste);
 if($("cockpitZuschnittCount"))$("cockpitZuschnittCount").textContent=String(materialien.length);
 if(!materialien.length){
  box.innerHTML=`<div class="small">Noch nichts zuzuschneiden – keine der Massaufnahmen dieses Projekts hat einen gespeicherten Zuschnitt.</div>`;
  return 0;
 }
 box.innerHTML=materialien.map(M=>{
  const plan=pzuPlan(M);
  // zuschnittHtml() zeigt das Reststuecke-Lager bereits selbst (js/33
  // ruft restBlockHtml auf) - hier waere es doppelt.
  const liste=(typeof zuschnittHtml==="function")?zuschnittHtml(plan):"";
  return `<div class="pzu-material">
   <div class="pmat-kopf"><b>${esc(M.material)}</b>
    <span class="small">${M.quellen.length} Massaufnahme${M.quellen.length===1?"":"n"}</span></div>
   ${liste}
   ${pzuHerkunftHtml(M)}
  </div>`;
 }).join("")+(ohne.length?`<div class="small" style="color:var(--muted);margin-top:8px">
   Nicht enthalten: ${esc(ohne.map(o=>o.text+" ("+o.grund+")").join(" · "))}</div>`:"");
 return materialien.length;
}

// Zurueck in die verursachende Massaufnahme - ueber den bestehenden Weg.
if($("cockpitZuschnittBody")){
 $("cockpitZuschnittBody").addEventListener("click",e=>{
  const b=e.target.closest?e.target.closest("[data-pzu-open]"):null;
  if(!b)return;
  const id=Number(b.dataset.pzuOpen);
  const m=(projectMeasurementsCache||[]).find(x=>x.id===id);
  if(!m)return;
  measEditReturnTo="projectCockpit";
  if(typeof openMeasurement==="function")openMeasurement(m);
 });
}

// Eine Stelle frischt beide neuen Projektkarten auf. js/47 ruft sie nach
// einer Schalteraenderung, js/24 nach dem Laden der Massaufnahmen.
// Ist das Cockpit gar nicht offen, passiert nichts.
function pmSichtbarkeitAuffrischen(){
 if(typeof renderProjektMaterial==="function")renderProjektMaterial();
 if(typeof renderProjektZuschnitt==="function")renderProjektZuschnitt();
 // Die Reservierung braucht eine eigene Abfrage - deshalb ueber resvCockpitLaden,
 // das ein zwischenzeitlich gewechseltes Projekt selbst erkennt.
 if(typeof resvCockpitLaden==="function"&&typeof cockpitProjectId!=="undefined")
  resvCockpitLaden(cockpitProjectId);
}
