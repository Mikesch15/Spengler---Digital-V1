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
// BESTEHENDE Einstellung seit v3.04 - sie wird hier weiterverwendet und
// ausdruecklich nicht dupliziert.
function restGrenze(){
 const v=(typeof restMindestlaenge!=="undefined")?Number(restMindestlaenge):1000;
 return Number.isFinite(v)&&v>=0?v:1000;
}
// Ab welcher Breite (v3.27, Startwert 100). Beide Grenzen zusammen bestimmen,
// ob ein Rest verwertbar ist: ein 6 m langer, 40 mm breiter Streifen ist keine
// brauchbare Kantung mehr, auch wenn er die Mindestlaenge erfuellt.
function restGrenzeBreite(){
 const v=(typeof restMindestbreite!=="undefined")?Number(restMindestbreite):100;
 return Number.isFinite(v)&&v>=0?v:100;
}
// Ist dieser Rest verwertbar? Die EINE Stelle, an der beide Grenzen zaehlen.
function restVerwertbar(laenge,breite){
 return restZahl(laenge)>=restGrenze()&&restZahl(breite)>=restGrenzeBreite();
}
function restGrenzeText(){
 return "ab "+restMm(restGrenze())+" mm Länge und "+restMm(restGrenzeBreite())+" mm Breite";
}

// ---------------------------------------------------------------------------
// Exaktes Material-Matching (v3.27)
// ---------------------------------------------------------------------------
// Ein Rest darf nur verwendet werden, wenn Materialart, Staerke UND
// Ausfuehrung exakt uebereinstimmen - 0,70 mm Titanzink ist kein Ersatz fuer
// 0,80 mm Titanzink.
//
// Die Massaufnahme kennt nur die MATERIALART (measurement_materials). Staerke
// und Ausfuehrung kommen aus dem Lagerbestand der Firma: fuehrt sie fuer eine
// Materialart genau eine Kombination, ist der Bedarf eindeutig. Fuehrt sie
// mehrere (0,70 und 0,80), wird NICHTS geraten - dann gibt es keine
// automatische Verwendung, sondern einen Hinweis.
function restNormText(v){
 return String(v===null||v===undefined?"":v).trim().toLowerCase().replace(/\s+/g," ");
}
function restNummer(v){
 const n=Number(v);
 return Number.isFinite(n)&&n>0?n:null;
}
// Die materialrelevanten Merkmale eines Restes oder eines Lagereintrags.
function restMerkmale(x){
 const st=Number(x&&x.staerke_mm);
 return {material:restNummer(x&&x.material_id),
         artikel:restNummer(x&&x.artikel_id),
         staerke:Number.isFinite(st)&&st>0?st:null,
         ausfuehrung:restNormText(x&&x.ausfuehrung)||null};
}
function restMerkmalText(m){
 const t=[];
 if(m.staerke!==null)t.push(String(m.staerke).replace(".",",")+" mm");
 if(m.ausfuehrung)t.push(m.ausfuehrung);
 return t.join(" · ");
}
// Was fuer diese Materialart im Lager steht.
function restBedarfMerkmale(materialId){
 const mid=restNummer(materialId);
 if(mid===null)return {eindeutig:false,grund:"ohne-material",merkmale:null,gefunden:[]};
 const eintraege=(typeof lagerbestand!=="undefined"?lagerbestand:[]||[])
   .filter(l=>restNummer(l.material_id)===mid);
 if(!eintraege.length)
  return {eindeutig:false,grund:"kein-lager",merkmale:null,gefunden:[],material:mid};
 const map={};
 eintraege.forEach(l=>{
  const m=restMerkmale(l);
  const schluessel=(m.staerke===null?"-":m.staerke)+"|"+(m.ausfuehrung||"-");
  if(!map[schluessel])map[schluessel]={staerke:m.staerke,ausfuehrung:m.ausfuehrung,
    artikel:m.artikel,text:restMerkmalText(m)};
 });
 const liste=Object.keys(map).map(k=>map[k]);
 if(liste.length===1&&liste[0].staerke!==null&&liste[0].ausfuehrung!==null)
  return {eindeutig:true,grund:"",material:mid,gefunden:liste,
          merkmale:{material:mid,staerke:liste[0].staerke,
                    ausfuehrung:liste[0].ausfuehrung,artikel:liste[0].artikel}};
 return {eindeutig:false,material:mid,gefunden:liste,merkmale:null,
         grund:liste.length>1?"mehrdeutig":"unvollstaendig"};
}
// Passt dieser Rest zu diesem Bedarf? Alles muss ausdruecklich bekannt sein -
// eine fehlende Angabe ist ein Nein, kein stillschweigendes Ja.
function restPasstZu(r,bedarf){
 if(!r)return {passt:false,grund:"kein-rest"};
 if(r.verbraucht)return {passt:false,grund:"verbraucht"};
 if(!bedarf||!bedarf.eindeutig)return {passt:false,grund:bedarf?bedarf.grund:"bedarf-unklar"};
 const m=restMerkmale(r), b=bedarf.merkmale;
 if(m.material===null)return {passt:false,grund:"rest-ohne-material"};
 if(m.material!==b.material)return {passt:false,grund:"material"};
 if(m.staerke===null)return {passt:false,grund:"rest-ohne-staerke"};
 if(Math.abs(m.staerke-b.staerke)>1e-6)return {passt:false,grund:"staerke"};
 if(m.ausfuehrung===null)return {passt:false,grund:"rest-ohne-ausfuehrung"};
 if(m.ausfuehrung!==b.ausfuehrung)return {passt:false,grund:"ausfuehrung"};
 return {passt:true,grund:""};
}
function restWarumText(grund){
 return REST_WARUM_TEXT[grund]||"Merkmale nicht vergleichbar";
}
const REST_WARUM_TEXT={
 "material":"anderes Material",
 "staerke":"andere Materialstärke",
 "ausfuehrung":"andere Oberfläche/Ausführung",
 "rest-ohne-material":"beim Rest fehlt das Material",
 "rest-ohne-staerke":"beim Rest fehlt die Stärke",
 "rest-ohne-ausfuehrung":"beim Rest fehlt die Ausführung",
 "ohne-material":"für diese Massaufnahme ist kein Material gewählt",
 "kein-lager":"für dieses Material steht nichts im Lagerbestand",
 "mehrdeutig":"im Lagerbestand stehen mehrere Stärken/Ausführungen",
 "unvollstaendig":"im Lagerbestand fehlen Stärke oder Ausführung"
};
const REST_GRUND_TEXT={
 "aus":"Reststücke werden laut Einstellung nicht in die Zuschnittplanung einbezogen.",
 "ohne-material":"Für diese Massaufnahme ist kein Material gewählt.",
 "kein-lager":"Für dieses Material steht nichts im Lagerbestand – ohne Stärke und Ausführung wird nichts automatisch verwendet.",
 "mehrdeutig":"Für dieses Material stehen mehrere Stärken/Ausführungen im Lager – es wird nichts geraten.",
 "unvollstaendig":"Im Lagerbestand fehlen für dieses Material Stärke oder Ausführung.",
 "kein-passender":"Kein Rest im Lager passt exakt zu Material, Stärke und Ausführung.",
 "ohne-breite":"Ohne Abwicklung lässt sich nicht prüfen, ob ein Rest breit genug ist."
};

// ---- Einstellungen ---------------------------------------------------------
function renderSchnittfugeFelder(){
 const a=$("set_schnittfuge"), b=$("set_restMindest"), c=$("set_restMindestBreite"),
       d=$("set_resteImZuschnitt");
 if(a)a.value=(typeof blechSchnittfuge!=="undefined")?blechSchnittfuge:0;
 if(b)b.value=restGrenze();
 if(c)c.value=restGrenzeBreite();
 if(d)d.value=(typeof resteImZuschnitt!=="undefined"&&resteImZuschnitt)?"ja":"nein";
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
  const mindB=Math.round(restZahl($("set_restMindestBreite")?$("set_restMindestBreite").value:restGrenzeBreite()));
  const nutzen=$("set_resteImZuschnitt")?$("set_resteImZuschnitt").value==="ja":resteImZuschnitt;
  if(fuge<0||fuge>50){schnittfugeHinweis("Die Schnittfuge muss zwischen 0 und 50 mm liegen.",true);return}
  if(mind<0||mind>20000){schnittfugeHinweis("Die Mindestlänge muss zwischen 0 und 20 000 mm liegen.",true);return}
  if(mindB<0||mindB>5000){schnittfugeHinweis("Die Mindestbreite muss zwischen 0 und 5 000 mm liegen.",true);return}
  const {fehler}=await speichereAppSettings({schnittfuge_mm:fuge,rest_mindestlaenge_mm:mind,
   rest_mindestbreite_mm:mindB,reste_im_zuschnitt:nutzen});
  if(fehler){schnittfugeHinweis("Konnte nicht gespeichert werden: "+fehler,true);return}
  blechSchnittfuge=fuge;
  restMindestlaenge=mind;
  restMindestbreite=mindB;
  resteImZuschnitt=nutzen;
  renderSchnittfugeFelder();
  renderRestLager();
  schnittfugeHinweis((fuge>0
   ?`✓ Gespeichert – jeder Schnitt zieht ${restMm(fuge)} mm ab, Reste ${restGrenzeText()}.`
   :`✓ Gespeichert – ohne Abzug für die Schnittfuge, Reste ${restGrenzeText()}.`)
   +(nutzen?" Passende Reste fliessen in die Zuschnittplanung ein."
           :" Reste bleiben gespeichert, werden aber nicht eingeplant."));
 };
}

// ---- Das Lager -------------------------------------------------------------
function restBeschreibung(r){
 const teile=[];
 if(r.material_name)teile.push(r.material_name);
 const m=restMerkmalText(restMerkmale(r));
 if(m)teile.push(m);
 teile.push(restMm(r.laenge_mm)+" × "+restMm(r.breite_mm)+" mm");
 if(restZahl(r.anzahl)>1)teile.push(restZahl(r.anzahl)+" Stück");
 return teile.join(" · ");
}
// Fehlen Staerke oder Ausfuehrung, wird der Rest NICHT automatisch verwendet.
// Das steht ausdruecklich an der Zeile, statt dass er stillschweigend
// uebergangen wird.
// Deutsche Aufzaehlung: "Material, Stärke und Ausführung", nicht dreimal "und".
function restFehltText(f){
 if(!f||!f.length)return "";
 if(f.length===1)return f[0];
 return f.slice(0,-1).join(", ")+" und "+f[f.length-1];
}
function restMerkmaleFehlen(r){
 const m=restMerkmale(r);
 const f=[];
 if(m.material===null)f.push("Material");
 if(m.staerke===null)f.push("Stärke");
 if(m.ausfuehrung===null)f.push("Ausführung");
 return f;
}
function renderRestLager(){
 const box=$("restLagerListe");
 if(!box)return;
 const liste=(reststuecke||[]).filter(r=>!r.verbraucht);
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch keine Reste im Lager. Aufgehoben wird ${restGrenzeText()}.</div>`;
  return;
 }
 box.innerHTML=liste.map(r=>{const fehlt=restMerkmaleFehlen(r);return `<div class="report-row">
 <div class="report-row-info">
  <b>${esc(restBeschreibung(r))}</b>
  <span class="small" style="color:var(--muted)">${esc(r.herkunft||"von Hand erfasst")}${r.created_at?" · "+new Date(r.created_at).toLocaleDateString("de-CH"):""}</span>
  ${fehlt.length?`<span class="small rest-fehlt" style="color:var(--red)">Ohne ${esc(restFehltText(fehlt))} wird dieser Rest nicht automatisch verwendet.</span>`:""}
 </div>
 <div class="report-row-actions">
  <button type="button" class="gray" data-rest-merkmale="${r.id}">✏️ Merkmale</button>
  <button type="button" class="gray" data-rest-verbraucht="${r.id}">✓ Verbraucht</button>
  <button type="button" class="red" data-rest-loeschen="${r.id}">🗑</button>
 </div>
</div>`}).join("");
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
  // v3.27: Staerke und Ausfuehrung. Sie werden NICHT geraten - sie kommen
  // aus dem Lagerbestand der Firma, und nur dann, wenn er fuer diese
  // Materialart genau eine Kombination fuehrt. Sonst bleiben sie leer und
  // lassen sich im Lager nachtragen.
  artikel_id:e.artikel_id||null,
  staerke_mm:(e.staerke_mm===undefined||e.staerke_mm===null)?null:restZahl(e.staerke_mm)||null,
  ausfuehrung:e.ausfuehrung||null,
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

// v3.27: Staerke und Ausfuehrung eines Restes nachtragen. Noetig fuer Reste,
// die vor v3.27 entstanden sind oder deren Materialart im Lagerbestand nicht
// eindeutig ist - ohne diese Angaben wird nicht automatisch verwendet.
document.addEventListener("click",async e=>{
 const b=e.target.closest?e.target.closest("[data-rest-merkmale]"):null;
 if(!b)return;
 const id=Number(b.dataset.restMerkmale);
 const r=(reststuecke||[]).find(x=>x.id===id);
 if(!r)return;
 restLagerHinweis("");
 const m=restMerkmale(r);
 const st=prompt("Materialstärke in mm (leer = unbekannt):",m.staerke!==null?String(m.staerke):"");
 if(st===null)return;
 const au=prompt("Oberfläche / Ausführung (leer = unbekannt):",r.ausfuehrung||"");
 if(au===null)return;
 const stZahl=String(st).trim()===""?null:Number(String(st).replace(",","."));
 if(stZahl!==null&&(!Number.isFinite(stZahl)||stZahl<=0)){
  restLagerHinweis("Die Stärke muss eine Zahl grösser als 0 sein.",true);return}
 const {data,error}=await sb.from("reststuecke")
  .update({staerke_mm:stZahl,ausfuehrung:String(au).trim()||null})
  .eq("id",id).select();
 if(error){restLagerHinweis("Konnte nicht gespeichert werden: "+error.message,true);return}
 if(!data||!data.length){restLagerHinweis("Es wurde nichts geändert. Fehlt die nötige Berechtigung?",true);return}
 reststuecke=(reststuecke||[]).map(x=>x.id===id?data[0]:x);
 renderRestLager();
 restLagerHinweis("✓ Merkmale gespeichert.");
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
 const raus=[];
 const nimm=(l,b,anzahl,quelle)=>{
  const L=restZahl(l), B=restZahl(b), n=Math.max(1,Math.round(restZahl(anzahl))||1);
  if(L<=0||B<0)return;
  // v3.27: verwertbar ist nur, was BEIDE Grenzen erfuellt - Mindestlaenge
  // (bestehend) und Mindestbreite (neu). Ein Streifenplatz, der eine davon
  // reisst, ist Verschnitt (Auftragspunkt 4).
  raus.push({laenge_mm:L,breite_mm:B,anzahl:n,quelle,zuKlein:!restVerwertbar(L,B)});
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

// ---------------------------------------------------------------------------
// Reststuecke als Eingang der Zuschnittplanung (v3.27, Auftragspunkt 5 und 8)
// ---------------------------------------------------------------------------
// KEINE zweite Packrechnung: gerechnet wird mit den bestehenden Funktionen
// ebaStreifenJeAbschnitt() und ebaVerteile() aus js/29. Ein Reststueck ist
// dabei nichts anderes als EIN Abschnitt fester Laenge und fester Breite -
// genau die Form, fuer die ebaVerteile() gebaut ist.
//
// Ergebnis: die Stuecke, die aus Resten geschnitten werden koennen, fallen aus
// dem Rollenbedarf heraus; der Rest geht unveraendert in ebaPackeInStreifen().
//
// Steht die Einstellung auf AUS (Vorgabe), gibt die Funktion die Liste
// unveraendert zurueck - der Zuschnitt rechnet dann exakt wie bis v3.26.
//
// Gebucht wird hier NICHTS. Ein Rest liegt physisch irgendwo und ist
// vielleicht schon weg (so seit v3.04); der Plan schlaegt vor, das Verbuchen
// bleibt eine ausdrueckliche Handlung.
function restVorabzugAus(bleche,grund,bedarf){
 return {bleche:(bleche||[]).slice(),ausResten:[],grund:grund||"",bedarf:bedarf||null};
}
function restVorabzug(bleche,kontext){
 const alle=(bleche||[]).filter(x=>restZahl(x&&x.laenge)>0);
 if(typeof resteImZuschnitt==="undefined"||!resteImZuschnitt)
  return restVorabzugAus(bleche,"aus");
 if(typeof ebaVerteile!=="function"||typeof ebaStreifenJeAbschnitt!=="function")
  return restVorabzugAus(bleche,"ohne-packrechnung");
 const A=restZahl(kontext&&kontext.abwicklung);
 if(A<=0)return restVorabzugAus(bleche,"ohne-breite");
 const bedarf=restBedarfMerkmale(kontext&&kontext.material);
 if(!bedarf.eindeutig)return restVorabzugAus(bleche,bedarf.grund,bedarf);
 // Kleinste Flaeche zuerst: so werden kleine Reste aufgebraucht und die
 // grossen bleiben fuer groessere Auftraege erhalten.
 const kandidaten=(reststuecke||[]).filter(r=>!r.verbraucht&&!r.reserviert_fuer_project_id
    &&restZahl(r.breite_mm)>0&&restZahl(r.laenge_mm)>0
    &&restPasstZu(r,bedarf).passt)
  .slice().sort((a,b)=>restZahl(a.laenge_mm)*restZahl(a.breite_mm)
                      -restZahl(b.laenge_mm)*restZahl(b.breite_mm));
 if(!kandidaten.length)return restVorabzugAus(bleche,"kein-passender",bedarf);
 let offen=alle.slice();
 const ausResten=[];
 kandidaten.forEach(r=>{
  if(!offen.length)return;
  const B=restZahl(r.breite_mm), L=restZahl(r.laenge_mm);
  const n=ebaStreifenJeAbschnitt(B,A);           // dieselbe Regel wie bei der Rolle
  if(n<1)return;                                  // Rest ist schmaler als die Abwicklung
  // Laengstes zuerst und nur, was ueberhaupt in die Laenge passt.
  const moeglich=(typeof ebaStueckliste==="function"?ebaStueckliste(offen):offen.slice())
    .filter(x=>restZahl(x.laenge)<=L+1e-9);
  if(!moeglich.length)return;
  // Stueck fuer Stueck dazunehmen, solange die BESTEHENDE Verteilung noch
  // eine Loesung findet. Deterministisch und ohne eigene Packlogik.
  const genommen=[]; let verteilung=null;
  moeglich.forEach(st=>{
   const versuch=genommen.concat([st]);
   const v=ebaVerteile(versuch,n,L,20000);
   if(v){genommen.length=0;Array.prototype.push.apply(genommen,versuch);verteilung=v}
  });
  if(!genommen.length)return;
  // abwicklung ist die Streifenbreite, fuer die dieser Rest genommen wird -
  // bei Arten mit mehreren Breiten je Gruppe eine andere.
  ausResten.push({id:r.id,rest:r,breite:B,laenge:L,abwicklung:A,streifenJeRest:n,
    stuecke:genommen.slice(),streifen:verteilung||[]});
  offen=offen.filter(x=>genommen.indexOf(x)<0);
 });
 if(!ausResten.length)return restVorabzugAus(bleche,"kein-passender",bedarf);
 return {bleche:offen,ausResten,grund:"",bedarf};
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
// v3.27: zusaetzlich wird geprueft, ob Material, Staerke und Ausfuehrung
// exakt passen. Ein Rest, der nur breit genug ist, wird weiterhin gezeigt -
// aber ausdruecklich als "nicht automatisch verwendbar" gekennzeichnet, mit
// dem Grund. Stillschweigend uebergangen wird nichts.
function restPassend(breite,laengen,material){
 const b=restZahl(breite);
 const l=(laengen||[]).map(restZahl).filter(x=>x>0);
 if(b<=0||!l.length)return [];
 const laengste=Math.max.apply(null,l);
 const bedarf=restBedarfMerkmale(material);
 return (reststuecke||[]).filter(r=>!r.verbraucht
   &&restZahl(r.breite_mm)>=b-1e-9
   &&restZahl(r.laenge_mm)>=Math.min.apply(null,l)-1e-9)
  .map(r=>({...r,passtFuerLaengste:restZahl(r.laenge_mm)>=laengste,
    exakt:restPasstZu(r,bedarf).passt,
    warum:restPasstZu(r,bedarf).grund,
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
 const passend=suchBreite>0?restPassend(suchBreite,laengen,material):[];
 const alle=restAlle(plan);
 const kandidaten=restKandidaten(plan);
 const klein=alle.filter(x=>x.zuKlein&&x.laenge_mm>0);
 if(!passend.length&&!kandidaten.length&&!klein.length)return "";
 const bezug=restPlanBezug(plan);
 const schon=restSchonEingelagert(bezug.measurement_id);
 let h='<div class="rest-block">';
 if(passend.length){
  h+=`<div class="small"><b>Aus dem Reststücke-Lager</b> – ${passend.length} Rest${passend.length===1?"":"e"}, die breit genug sind:</div>`
   +passend.slice(0,8).map(r=>`<div class="small rest-passend${r.exakt?" rest-exakt":""}" style="color:var(--muted)">• ${esc(restBeschreibung(r))}${r.passtFuerLaengste?"":" – kürzer als das längste Stück"}${r.fuerProjekt?" – bereits für ein Projekt reserviert":""}${
     r.exakt?" <b>– passt exakt</b>":' <span class="rest-unklar">– '+esc(restWarumText(r.warum))+"</span>"}${
     (bezug.measurement_id&&!r.fuerProjekt)
      ?` <button type="button" class="gray rest-klein-knopf" data-rest-verwenden="${r.id}" data-rest-fuer="${bezug.measurement_id}">Hier verwenden</button>`:""}</div>`).join("")
   +'<div class="small" style="color:var(--muted);margin-top:2px">Wird bewusst nicht automatisch eingeplant – ein Rest liegt physisch irgendwo und ist vielleicht schon weg. „Hier verwenden" hält nur fest, dass er für diese Massaufnahme gebraucht wurde; der Zuschnittplan wird dadurch <b>nicht</b> neu gerechnet.</div>';
 }
 if(kandidaten.length){
  h+=`<div class="small" style="margin-top:6px"><b>Bleibt bei diesem Zuschnitt übrig</b> (aufgehoben wird ${restGrenzeText()}):</div>`
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
<b>Zu klein zum Aufheben</b> (unter ${restMm(restGrenze())} mm Länge oder ${restMm(restGrenzeBreite())} mm Breite): ${klein.length} Stück,
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
 // Die Merkmale des Lagerbestands, sofern sie fuer diese Materialart
 // eindeutig sind (siehe restBedarfMerkmale).
 const bm=restBedarfMerkmale(mat?mat.id:null);
 const merk=bm.eindeutig?bm.merkmale:null;
 const {fehler,anzahl,offline}=await restEinlagern(
  (daten.k||[]).map(k=>({laenge_mm:k.laenge_mm,breite_mm:k.breite_mm,anzahl:k.anzahl,
    material_id:mat?mat.id:null,material_name:mat?mat.name:null,
    artikel_id:merk?merk.artikel:null,staerke_mm:merk?merk.staerke:null,
    ausfuehrung:merk?merk.ausfuehrung:null})),
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
