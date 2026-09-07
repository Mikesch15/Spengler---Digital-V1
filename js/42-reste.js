"use strict";
// ---------------------------------------------------------------------------
// Schnittfuge und Reststuecke-Lager (v3.04)
//
// Punkt 2 der Ideenliste: der Rollenblech-Zuschnitt rechnete ohne
// Schnittbreite und ohne Wiederverwendung von Resten - die Zahlen waren
// dadurch systematisch etwas zu optimistisch.
//
// Die Schnittfuge selbst steckt in der EINEN Packrechnung (js/29,
// ebaSchnittfuge/ebaStreifenJeAbschnitt) - hier liegt nur die Einstellung
// und das Lager.
//
// Wichtig zum Lager: die Reste werden NICHT automatisch in die Packrechnung
// eingerechnet. Ein Rest liegt physisch irgendwo und ist vielleicht schon
// weg; ihn stillschweigend einzuplanen wuerde einen Plan erzeugen, der sich
// nicht schneiden laesst. Stattdessen werden passende Reste ANGEZEIGT - die
// Entscheidung trifft der Spengler.
// ---------------------------------------------------------------------------

function restZahl(v){const n=Number(v);return Number.isFinite(n)?n:0}
function restMm(v){return Math.round(restZahl(v)).toLocaleString("de-CH")}

// Ab welcher Laenge sich das Aufheben lohnt (firmenweit, Startwert 1000).
function restGrenze(){
 const v=(typeof restMindestlaenge!=="undefined")?Number(restMindestlaenge):1000;
 return Number.isFinite(v)&&v>=0?v:1000;
}

// ---- Einstellungen ---------------------------------------------------------
function renderSchnittfugeFelder(){
 const a=$("set_schnittfuge"), b=$("set_restMindest");
 if(a)a.value=(typeof blechSchnittfuge!=="undefined")?blechSchnittfuge:0;
 if(b)b.value=restGrenze();
}
function schnittfugeHinweis(text,fehler){
 const el=$("set_schnittfugeHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}
if($("saveSchnittfuge")){
 $("saveSchnittfuge").onclick=async()=>{
  const fuge=restZahl($("set_schnittfuge").value);
  const mind=Math.round(restZahl($("set_restMindest").value));
  if(fuge<0||fuge>50){schnittfugeHinweis("Die Schnittfuge muss zwischen 0 und 50 mm liegen.",true);return}
  if(mind<0||mind>20000){schnittfugeHinweis("Die Mindestlänge muss zwischen 0 und 20 000 mm liegen.",true);return}
  const {fehler}=await speichereAppSettings({schnittfuge_mm:fuge,rest_mindestlaenge_mm:mind});
  if(fehler){schnittfugeHinweis("Konnte nicht gespeichert werden: "+fehler,true);return}
  blechSchnittfuge=fuge;
  restMindestlaenge=mind;
  renderSchnittfugeFelder();
  renderRestLager();
  schnittfugeHinweis(fuge>0
   ?`✓ Gespeichert – jeder Schnitt zieht ${restMm(fuge)} mm ab, Reste ab ${restMm(mind)} mm.`
   :`✓ Gespeichert – ohne Abzug für die Schnittfuge, Reste ab ${restMm(mind)} mm.`);
 };
}

// ---- Das Lager -------------------------------------------------------------
function restBeschreibung(r){
 const teile=[];
 if(r.material_name)teile.push(r.material_name);
 teile.push(restMm(r.laenge_mm)+" × "+restMm(r.breite_mm)+" mm");
 if(restZahl(r.anzahl)>1)teile.push(restZahl(r.anzahl)+" Stück");
 return teile.join(" · ");
}
function renderRestLager(){
 const box=$("restLagerListe");
 if(!box)return;
 const liste=(reststuecke||[]).filter(r=>!r.verbraucht);
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch keine Reste im Lager. Aufgehoben wird ab ${restMm(restGrenze())} mm Länge.</div>`;
  return;
 }
 box.innerHTML=liste.map(r=>`<div class="report-row">
 <div class="report-row-info">
  <b>${esc(restBeschreibung(r))}</b>
  <span class="small" style="color:var(--muted)">${esc(r.herkunft||"von Hand erfasst")}${r.created_at?" · "+new Date(r.created_at).toLocaleDateString("de-CH"):""}</span>
 </div>
 <div class="report-row-actions">
  <button type="button" class="gray" data-rest-verbraucht="${r.id}">✓ Verbraucht</button>
  <button type="button" class="red" data-rest-loeschen="${r.id}">🗑</button>
 </div>
</div>`).join("");
}
function restLagerHinweis(text,fehler){
 const el=$("restLagerHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

// Legt Reste an. Die company_id kommt NIE vom Client - sie hat serverseitig
// DEFAULT my_company_id(), und die restriktive Policy erzwingt sie zusaetzlich.
async function restEinlagern(eintraege,herkunft,bezug){
 const gueltig=(eintraege||[]).filter(e=>restZahl(e.laenge_mm)>0&&restZahl(e.breite_mm)>0);
 if(!gueltig.length)return {fehler:"Es gab nichts einzulagern."};
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Rest"))return {fehler:null,offline:true};
 const {data,error}=await sb.from("reststuecke").insert(gueltig.map(e=>({
  material_id:e.material_id||null,
  material_name:e.material_name||null,
  breite_mm:restZahl(e.breite_mm),
  laenge_mm:restZahl(e.laenge_mm),
  anzahl:Math.max(1,Math.round(restZahl(e.anzahl)||1)),
  herkunft:herkunft||null,
  // v3.26: die Herkunft als echter Bezug, nicht nur als Freitext. Beides
  // darf null sein - ein von Hand erfasster Rest gehoert zu keiner Aufnahme.
  // Die company_id kommt weiterhin NIE vom Client; ein Trigger prueft
  // zusaetzlich, dass Aufnahme und Projekt zur eigenen Firma gehoeren.
  measurement_id:bezug&&bezug.measurement_id?bezug.measurement_id:null,
  project_id:bezug&&bezug.project_id?bezug.project_id:null
 }))).select();
 if(error)return {fehler:error.message};
 // Ein von RLS blockiertes INSERT meldet keinen Fehler, es betrifft 0 Zeilen
 // (CLAUDE.md 24.1) - deshalb das Ergebnis pruefen statt Erfolg annehmen.
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 reststuecke=(reststuecke||[]).concat(data);
 renderRestLager();
 return {fehler:null,anzahl:data.length};
}

document.addEventListener("click",async e=>{
 const v=e.target.closest?e.target.closest("[data-rest-verbraucht]"):null;
 const l=e.target.closest?e.target.closest("[data-rest-loeschen]"):null;
 if(!v&&!l)return;
 const id=Number((v||l).dataset.restVerbraucht||(v||l).dataset.restLoeschen);
 const r=(reststuecke||[]).find(x=>x.id===id);
 if(!r)return;
 restLagerHinweis("");
 if(l&&!confirm(`Rest „${restBeschreibung(r)}" endgültig aus dem Lager entfernen?`))return;
 const {data,error}=l
  ? await sb.from("reststuecke").delete().eq("id",id).select()
  : await sb.from("reststuecke").update({verbraucht:true}).eq("id",id).select();
 if(error){restLagerHinweis("Konnte nicht geändert werden: "+error.message,true);return}
 if(!data||!data.length){restLagerHinweis("Es wurde nichts geändert. Fehlt die nötige Berechtigung?",true);return}
 reststuecke=(reststuecke||[]).filter(x=>x.id!==id);
 renderRestLager();
 restLagerHinweis(l?"✓ Rest entfernt.":"✓ Als verbraucht vermerkt.");
});

if($("restLagerNeu")){
 $("restLagerNeu").onclick=async()=>{
  const laenge=prompt("Länge des Restes in mm:");
  if(laenge===null)return;
  const breite=prompt("Breite des Restes in mm:");
  if(breite===null)return;
  if(restZahl(laenge)<=0||restZahl(breite)<=0){restLagerHinweis("Länge und Breite müssen grösser als 0 sein.",true);return}
  const {fehler,anzahl}=await restEinlagern(
   [{laenge_mm:restZahl(laenge),breite_mm:restZahl(breite),anzahl:1}],"von Hand erfasst");
  if(fehler){restLagerHinweis(fehler,true);return}
  if(anzahl)restLagerHinweis("✓ Rest ins Lager aufgenommen.");
 };
}

// ---- Reste zu einem Zuschnittplan -----------------------------------------
// Was bei diesem Plan uebrig bleibt - ALLES, auch das zu Kleine (v3.26).
//
// Bis v3.25 kannte diese Stelle nur zwei Quellen und liess drei Arten von
// Rest lautlos verschwinden:
//   1. Reste unter der Mindestlaenge wurden gar nicht erwaehnt.
//   2. Ungenutzte Streifenplaetze (A x Abschnittlaenge, oft mehrere Meter)
//      kamen nicht vor.
//   3. Bei mehreren Streifenbreiten (Freies Profil, Lukarne, Kamin,
//      Einfassung, Rinne, Ort-/Seitenbleche, Projektplan) wurde der
//      seitliche Rand gar nicht gefunden - best.restBreite gibt es dort
//      nicht, er steht je Breite in best.zeilen[].
//   4. Die Rinne halbrund (Normlaengen) hatte ueberhaupt keine Reste.
//
// Die Geometrie kommt aus zuGeometrie() (js/33) - dieselbe Quelle, aus der
// auch die Materialbilanz liest. Zwei getrennte Ableitungen wuerden
// unweigerlich auseinanderlaufen.
//
// Rueckgabe je Rest: laenge_mm, breite_mm, anzahl, quelle, zuKlein.
// Die Laengen sind EXAKT (nicht gerundet) - die Bilanz muss aufgehen.
function restAlle(plan){
 if(!plan)return [];
 const grenze=restGrenze();
 const raus=[];
 const nimm=(l,b,anzahl,quelle)=>{
  const L=restZahl(l), B=restZahl(b), n=Math.max(1,Math.round(restZahl(anzahl))||1);
  if(L<=0||B<0)return;
  raus.push({laenge_mm:L,breite_mm:B,anzahl:n,quelle,zuKlein:L<grenze||B<=0});
 };
 if(plan.art==="stange"){
  // Normlaengen: der Rest jeder Stange. Breite ist die Zuschnittbreite des
  // Profils - ohne sie waere ein Rinnenstueck im Lager nicht wiederfindbar.
  const b=restZahl(plan.breite);
  (plan.stangen||[]).forEach((st,i)=>{
   const r=restZahl(st.rest);
   if(r>0)nimm(r,b,1,"Rest der "+restMm(st.laenge)+" mm-Stange "+(i+1));
  });
  return raus;
 }
 // 1) Der freie Rest am Ende jedes belegten Streifens. Bewusst direkt aus den
 //    Gruppen, NICHT aus zuGeometrie(): ein Streifenrest ist da, ganz gleich
 //    wie viele Streifen nebeneinander liegen. Ein aelterer gespeicherter Plan
 //    ohne jeAbschnitt/abschnitte wuerde sonst seine Reste verlieren.
 const gruppen=plan.gruppen||[];
 const mehrere=gruppen.length>1;
 const woFuer=A=>mehrere?" ("+restMm(A)+" mm breit)":"";
 // 2)+3) brauchen die Geometrie der Rolle - ohne sie wird nichts geraten.
 // Sie liefert zugleich die Abschnittlaenge, mit der auch die Materialbilanz
 // (js/33) rechnet; beide muessen dieselbe Zahl verwenden, sonst geht die
 // Bilanz nicht mehr auf.
 const geo=(typeof zuGeometrie==="function")?zuGeometrie(plan):[];
 const geoFuer={}; geo.forEach(g=>{geoFuer[g.index]=g});
 gruppen.forEach((g,gi)=>{
  const A=restZahl(g.breite), L=geoFuer[gi]?geoFuer[gi].L
    :(restZahl(g.abschnittLaenge)||restZahl(plan.abschnittLaenge));
  if(A<=0)return;
  (g.streifen||[]).forEach((st,i)=>{
   const w=(typeof zuStreifenRest==="function")?zuStreifenRest(st,L)
     :{rest:restZahl(st.rest)};
   if(w.rest>0)nimm(w.rest,A,1,"Streifen "+(i+1)+woFuer(A));
  });
 });
 geo.forEach(g=>{
  const wo=woFuer(g.A);
  // 2) Streifenplaetze, die im letzten Abschnitt gar nicht belegt werden -
  //    volle Streifen ueber die ganze Abschnittlaenge.
  if(g.frei>0)nimm(g.L,g.A,g.frei,g.frei===1?"ungenutzter Streifen"+wo
    :g.frei+" ungenutzte Streifen"+wo);
  // 3) Der seitliche Rand der Rolle ueber die ganze Rollenlaenge.
  if(g.restBreite>0)nimm(g.rollenLaenge,g.restBreite,1,
    "seitlicher Rest der "+restMm(g.B)+"er Rolle"+wo);
 });
 return raus;
}

// Was sich davon aufzuheben lohnt. Fuer Anzeige und Lager - deshalb hier
// gerundet, waehrend restAlle() fuer die Bilanz exakt bleibt.
function restKandidaten(plan){
 return restAlle(plan).filter(x=>!x.zuKlein&&x.breite_mm>0)
  .map(x=>({laenge_mm:Math.round(x.laenge_mm),breite_mm:Math.round(x.breite_mm),
            anzahl:x.anzahl,quelle:x.quelle}));
}

// Welche Reste aus dem Lager ein Stueck dieses Plans aufnehmen koennten.
// Reine Anzeige - es wird nichts automatisch eingeplant (siehe Kopf).
function restPassend(breite,laengen){
 const b=restZahl(breite);
 const l=(laengen||[]).map(restZahl).filter(x=>x>0);
 if(b<=0||!l.length)return [];
 const laengste=Math.max.apply(null,l);
 return (reststuecke||[]).filter(r=>!r.verbraucht
   &&restZahl(r.breite_mm)>=b-1e-9
   &&restZahl(r.laenge_mm)>=Math.min.apply(null,l)-1e-9)
  .map(r=>({...r,passtFuerLaengste:restZahl(r.laenge_mm)>=laengste,
    // v3.09: ein fuer ein Projekt reserviertes Stueck ist nicht mehr frei.
    // Es wird trotzdem gezeigt, aber als vergeben gekennzeichnet - sonst
    // waere unklar, warum es im Lager steht und doch nicht verfuegbar ist.
    fuerProjekt:r.reserviert_fuer_project_id||null}));
}

// Zu welcher Massaufnahme und welchem Projekt gehoert dieser Plan? (v3.26)
// Ohne diesen Bezug bekaeme ein eingelagerter Rest keine Herkunft, und die
// App koennte nicht erkennen, dass dieselben Reste schon eingelagert sind.
// Der projektweite Sammelplan gehoert zu KEINER einzelnen Aufnahme - dort
// bleibt der Bezug leer, statt eine zu erfinden.
function restPlanBezug(plan){
 if(plan&&plan.sammel)return {measurement_id:null,project_id:null};
 let mid=(plan&&plan.erledigtFuer!==undefined&&plan.erledigtFuer!==null)
   ?plan.erledigtFuer
   :((typeof zeOffeneMassaufnahme==="function")?zeOffeneMassaufnahme():null);
 mid=Number(mid); if(!Number.isFinite(mid)||mid<=0)mid=null;
 let pid=(plan&&plan.projektFuer!==undefined&&plan.projektFuer!==null)?Number(plan.projektFuer)
   :((typeof measSelectedProjectId!=="undefined"&&measSelectedProjectId)?Number(measSelectedProjectId):null);
 if(!Number.isFinite(pid)||pid<=0)pid=null;
 return {measurement_id:mid,project_id:pid};
}
// Ist von genau dieser Massaufnahme schon etwas im Lager? Der Knopf laesst
// sich sonst nach jedem Neuzeichnen erneut druecken und legt dieselben Reste
// ein zweites Mal an.
function restSchonEingelagert(mid){
 if(!mid)return 0;
 return (reststuecke||[]).filter(r=>Number(r.measurement_id)===Number(mid)).length;
}

// Der Block unter der Zuschnittliste. Wird von zuschnittHtml() (js/33)
// aufgerufen, also automatisch von JEDEM Modul - nicht zehnmal einzeln
// eingebaut. Breite und Laengen kommen aus dem normalisierten Plan selbst.
function restBlockHtml(plan,material){
 if(!plan||(plan.art!=="rolle"&&plan.art!=="stange"))return "";
 const breiten=(plan.streifenbreiten||[]).map(restZahl).filter(x=>x>0);
 const laengen=[];
 if(plan.art==="stange"){
  (plan.stangen||[]).forEach(st=>(st.stuecke||[]).forEach(x=>laengen.push(restZahl(x&&x.laenge!==undefined?x.laenge:x))));
 }else{
  (plan.gruppen||[]).forEach(g=>(g.streifen||[]).forEach(st=>
    (st.stuecke||[]).forEach(x=>laengen.push(restZahl(x.laenge)))));
 }
 const suchBreite=plan.art==="stange"?restZahl(plan.breite)
   :(breiten.length?Math.min.apply(null,breiten):0);
 const passend=suchBreite>0?restPassend(suchBreite,laengen):[];
 const alle=restAlle(plan);
 const kandidaten=alle.filter(x=>!x.zuKlein&&x.breite_mm>0)
  .map(x=>({laenge_mm:Math.round(x.laenge_mm),breite_mm:Math.round(x.breite_mm),
            anzahl:x.anzahl,quelle:x.quelle}));
 const klein=alle.filter(x=>x.zuKlein&&x.laenge_mm>0);
 if(!passend.length&&!kandidaten.length&&!klein.length)return "";
 const bezug=restPlanBezug(plan);
 const schon=restSchonEingelagert(bezug.measurement_id);
 let h='<div class="rest-block">';
 if(passend.length){
  h+=`<div class="small"><b>Aus dem Reststücke-Lager</b> – ${passend.length} Rest${passend.length===1?"":"e"}, die breit genug sind:</div>`
   +passend.slice(0,8).map(r=>`<div class="small rest-passend" style="color:var(--muted)">• ${esc(restBeschreibung(r))}${r.passtFuerLaengste?"":" – kürzer als das längste Stück"}${r.fuerProjekt?" – bereits für ein Projekt reserviert":""}${
     (bezug.measurement_id&&!r.fuerProjekt)
      ?` <button type="button" class="gray rest-klein-knopf" data-rest-verwenden="${r.id}" data-rest-fuer="${bezug.measurement_id}">Hier verwenden</button>`:""}</div>`).join("")
   +'<div class="small" style="color:var(--muted);margin-top:2px">Wird bewusst nicht automatisch eingeplant – ein Rest liegt physisch irgendwo und ist vielleicht schon weg. „Hier verwenden" hält nur fest, dass er für diese Massaufnahme gebraucht wurde; der Zuschnittplan wird dadurch <b>nicht</b> neu gerechnet.</div>';
 }
 if(kandidaten.length){
  h+=`<div class="small" style="margin-top:6px"><b>Bleibt bei diesem Zuschnitt übrig</b> (aufgehoben wird ab ${restMm(restGrenze())} mm):</div>`
   +kandidaten.map(k=>`<div class="small" style="color:var(--muted)">• ${k.anzahl>1?k.anzahl+" × ":""}${restMm(k.laenge_mm)} × ${restMm(k.breite_mm)} mm – ${esc(k.quelle)}</div>`).join("")
   +(schon
     ?`<div class="small rest-schon" style="margin-top:4px">✓ Von dieser Massaufnahme ${schon===1?"ist bereits ein Rest":"sind bereits "+schon+" Reste"} im Lager – es wird nichts doppelt eingelagert.</div>`
     :`<div class="bar" style="margin-top:4px"><button type="button" class="gray" data-rest-einlagern="${esc(JSON.stringify({k:kandidaten,m:material||null,b:bezug}))}">📥 Reste ins Lager aufnehmen</button></div>`);
 }
 // v3.26: Was zu klein ist, verschwindet nicht mehr stillschweigend. Es ist
 // echter Verschnitt - aber es wird gesagt, wie viel und warum.
 if(klein.length){
  const summe=klein.reduce((a,x)=>a+x.laenge_mm*x.breite_mm*Math.max(1,x.anzahl),0);
  h+=`<div class="small rest-klein" style="margin-top:6px;color:var(--muted)">
<b>Zu klein zum Aufheben</b> (unter ${restMm(restGrenze())} mm): ${klein.length} Stück,
zusammen ${esc(restQm(summe))} m² – das ist echter Verschnitt.</div>`;
 }
 return h+'<div class="small rest-block-hinweis" hidden></div></div>';
}
function restQm(mm2){return (restZahl(mm2)/1e6).toFixed(2).replace(".",",")}
// Der lesbare Herkunftstext fuers Lager. Das Projekt steht nur dann darin,
// wenn es wirklich bekannt ist - erfunden wird keines.
function restHerkunftText(bezug){
 const pid=bezug&&bezug.project_id;
 const proj=(pid&&typeof allProjects!=="undefined")
   ?(allProjects||[]).find(x=>x.id===Number(pid)):null;
 const wo=proj?(typeof projektTitel==="function"?projektTitel(proj):(proj.name||"")):"";
 return "aus einem Zuschnitt"+(wo?" · "+wo:"");
}

document.addEventListener("click",async e=>{
 const b=e.target.closest?e.target.closest("[data-rest-einlagern]"):null;
 if(!b)return;
 let daten=null;
 try{daten=JSON.parse(b.dataset.restEinlagern)}catch(err){return}
 const hin=b.closest(".rest-block")&&b.closest(".rest-block").querySelector(".rest-block-hinweis");
 const zeige=(t,f)=>{if(!hin)return;hin.textContent=t;hin.style.color=f?"var(--red)":"var(--green)";hin.hidden=!t};
 b.disabled=true; zeige("");
 const bezug=daten.b||{};
 // Doppelerfassung: die Liste im Speicher kennt nur die noch freien Reste.
 // Vor dem Anlegen deshalb ein gezielter Blick in die Datenbank - eine
 // Abfrage, nur beim Klick.
 if(bezug.measurement_id){
  const {data:vorhanden,error:fehlerPruef}=await sb.from("reststuecke")
    .select("id").eq("measurement_id",bezug.measurement_id).limit(1);
  if(fehlerPruef){b.disabled=false;zeige("Konnte nicht geprüft werden: "+fehlerPruef.message,true);return}
  if(vorhanden&&vorhanden.length){
   zeige("Von dieser Massaufnahme ist bereits ein Rest im Lager – es wurde nichts doppelt angelegt.");
   return;
  }
 }
 const mat=daten.m?findMeasurementMaterial(daten.m):null;
 const {fehler,anzahl,offline}=await restEinlagern(
  (daten.k||[]).map(k=>({laenge_mm:k.laenge_mm,breite_mm:k.breite_mm,anzahl:k.anzahl,
    material_id:mat?mat.id:null,material_name:mat?mat.name:null})),
  restHerkunftText(bezug),bezug);
 b.disabled=false;
 if(offline)return;
 if(fehler){zeige(fehler,true);return}
 zeige(`✓ ${anzahl} Rest${anzahl===1?"":"e"} ins Lager aufgenommen.`);
 b.disabled=true;
});

// v3.26: Einen Rest aus dem Lager fuer DIESE Massaufnahme verwenden.
// Der Zuschnittplan wird dadurch NICHT neu gerechnet - das bleibt die
// bewusste Entscheidung aus v3.04 (ein Rest liegt physisch irgendwo).
// Festgehalten wird nur, dass er gebraucht wurde: verbraucht + wofuer.
document.addEventListener("click",async e=>{
 const b=e.target.closest?e.target.closest("[data-rest-verwenden]"):null;
 if(!b)return;
 const id=Number(b.dataset.restVerwenden), mid=Number(b.dataset.restFuer);
 const r=(reststuecke||[]).find(x=>x.id===id);
 if(!r||!mid)return;
 const zeile=b.closest(".rest-passend");
 const zeige=(t,f)=>{if(!zeile)return;
  let s=zeile.querySelector(".rest-verwendet");
  if(!s){s=document.createElement("span");s.className="rest-verwendet";zeile.appendChild(s)}
  s.textContent=" "+t; s.style.color=f?"var(--red)":"var(--green)"};
 if(!confirm(`Rest „${restBeschreibung(r)}" für diese Massaufnahme verwenden?\n\nEr wird als verbraucht vermerkt und verschwindet aus dem Lager. Der Zuschnittplan ändert sich dadurch nicht.`))return;
 b.disabled=true;
 const {data,error}=await sb.from("reststuecke")
  .update({verbraucht:true,verbraucht_fuer_measurement_id:mid})
  .eq("id",id).eq("verbraucht",false).select();
 if(error){b.disabled=false;zeige("Konnte nicht gespeichert werden: "+error.message,true);return}
 // 0 Zeilen heisst: der Rest ist inzwischen weg oder die Berechtigung fehlt -
 // das gilt NICHT als Erfolg (CLAUDE.md 24.1).
 if(!data||!data.length){b.disabled=false;
  zeige("Es wurde nichts geändert – der Rest ist inzwischen vergeben, oder die Berechtigung fehlt.",true);return}
 reststuecke=(reststuecke||[]).filter(x=>x.id!==id);
 zeige("✓ als verwendet vermerkt");
 renderRestLager();
});
