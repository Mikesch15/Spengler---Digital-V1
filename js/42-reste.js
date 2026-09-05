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
async function restEinlagern(eintraege,herkunft){
 const gueltig=(eintraege||[]).filter(e=>restZahl(e.laenge_mm)>0&&restZahl(e.breite_mm)>0);
 if(!gueltig.length)return {fehler:"Es gab nichts einzulagern."};
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Rest"))return {fehler:null,offline:true};
 const {data,error}=await sb.from("reststuecke").insert(gueltig.map(e=>({
  material_id:e.material_id||null,
  material_name:e.material_name||null,
  breite_mm:restZahl(e.breite_mm),
  laenge_mm:restZahl(e.laenge_mm),
  anzahl:Math.max(1,Math.round(restZahl(e.anzahl)||1)),
  herkunft:herkunft||null
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
// Was bei diesem Plan uebrig bleibt und sich aufzuheben lohnt. Zwei Quellen:
// der freie Rest jedes Streifens und der seitliche Rest der Rolle.
function restKandidaten(plan){
 if(!plan||plan.art!=="rolle")return [];
 const grenze=restGrenze();
 const raus=[];
 // 1) Der freie Rest jedes Streifens - Laenge = Rest, Breite = Streifenbreite
 //    der Gruppe. Die normalisierte Form ist bei allen Modulen gleich (js/33).
 (plan.gruppen||[]).forEach(g=>{
  const B=restZahl(g.breite);
  if(B<=0)return;
  (g.streifen||[]).forEach((st,i)=>{
   const rest=restZahl(st.rest);
   if(rest>=grenze)raus.push({laenge_mm:Math.round(rest),breite_mm:Math.round(B),
     anzahl:1,quelle:"Streifen "+(i+1)+" ("+restMm(B)+" mm breit)"});
  });
 });
 // 2) Der seitliche Rest der besten Rolle ueber die ganze Rollenlaenge.
 const best=(plan.moeglich||[])[0];
 if(best){
  const rb=restZahl(best.restBreite), rl=restZahl(best.rollenLaenge);
  // Die Mindestlaenge gilt fuer die LAENGE des Restes. Der seitliche Rand ist
  // so lang wie die Rolle und nur so breit wie das, was neben den Streifen
  // uebrig bleibt - er muss also lang genug und ueberhaupt breit sein.
  if(rl>=grenze&&rb>0)raus.push({laenge_mm:Math.round(rl),breite_mm:Math.round(rb),
    anzahl:1,quelle:"seitlicher Rest der "+restMm(best.breite)+"er Rolle"});
 }
 return raus.filter(x=>x.breite_mm>0&&x.laenge_mm>=grenze);
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
  .map(r=>({...r,passtFuerLaengste:restZahl(r.laenge_mm)>=laengste}));
}

// Der Block unter der Zuschnittliste. Wird von zuschnittHtml() (js/33)
// aufgerufen, also automatisch von JEDEM Modul - nicht zehnmal einzeln
// eingebaut. Breite und Laengen kommen aus dem normalisierten Plan selbst.
function restBlockHtml(plan,material){
 if(!plan||plan.art!=="rolle")return "";
 const breiten=(plan.streifenbreiten||[]).map(restZahl).filter(x=>x>0);
 const laengen=[];
 (plan.gruppen||[]).forEach(g=>(g.streifen||[]).forEach(st=>
   (st.stuecke||[]).forEach(x=>laengen.push(restZahl(x.laenge)))));
 const passend=breiten.length?restPassend(Math.min.apply(null,breiten),laengen):[];
 const kandidaten=restKandidaten(plan);
 if(!passend.length&&!kandidaten.length)return "";
 let h='<div class="rest-block">';
 if(passend.length){
  h+=`<div class="small"><b>Aus dem Reststücke-Lager</b> – ${passend.length} Rest${passend.length===1?"":"e"}, die breit genug sind:</div>`
   +passend.slice(0,8).map(r=>`<div class="small" style="color:var(--muted)">• ${esc(restBeschreibung(r))}${r.passtFuerLaengste?"":" – kürzer als das längste Stück"}</div>`).join("")
   +'<div class="small" style="color:var(--muted);margin-top:2px">Wird bewusst nicht automatisch eingeplant – ein Rest liegt physisch irgendwo und ist vielleicht schon weg.</div>';
 }
 if(kandidaten.length){
  h+=`<div class="small" style="margin-top:6px"><b>Bleibt bei diesem Zuschnitt übrig</b> (aufgehoben wird ab ${restMm(restGrenze())} mm):</div>`
   +kandidaten.map(k=>`<div class="small" style="color:var(--muted)">• ${restMm(k.laenge_mm)} × ${restMm(k.breite_mm)} mm – ${esc(k.quelle)}</div>`).join("")
   +`<div class="bar" style="margin-top:4px"><button type="button" class="gray" data-rest-einlagern="${esc(JSON.stringify({k:kandidaten,m:material||null}))}">📥 Reste ins Lager aufnehmen</button></div>`;
 }
 return h+'<div class="small rest-block-hinweis" hidden></div></div>';
}

document.addEventListener("click",async e=>{
 const b=e.target.closest?e.target.closest("[data-rest-einlagern]"):null;
 if(!b)return;
 let daten=null;
 try{daten=JSON.parse(b.dataset.restEinlagern)}catch(err){return}
 const hin=b.closest(".rest-block")&&b.closest(".rest-block").querySelector(".rest-block-hinweis");
 const zeige=(t,f)=>{if(!hin)return;hin.textContent=t;hin.style.color=f?"var(--red)":"var(--green)";hin.hidden=!t};
 b.disabled=true; zeige("");
 const mat=daten.m?findMeasurementMaterial(daten.m):null;
 const {fehler,anzahl,offline}=await restEinlagern(
  (daten.k||[]).map(k=>({laenge_mm:k.laenge_mm,breite_mm:k.breite_mm,anzahl:k.anzahl,
    material_id:mat?mat.id:null,material_name:mat?mat.name:null})),
  "aus einem Zuschnitt");
 b.disabled=false;
 if(offline)return;
 if(fehler){zeige(fehler,true);return}
 zeige(`✓ ${anzahl} Rest${anzahl===1?"":"e"} ins Lager aufgenommen.`);
 b.disabled=true;
});
