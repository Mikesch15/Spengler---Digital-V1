"use strict";
// ===========================================================================
// Beispiel-Katalog und seine Selbstaufloesung (v3.184)
//
// Eine neu registrierte Firma bekommt ein paar Beispiel-Katalogpositionen
// mit (materials.demo = true), damit sich Regierapport, Lager und Zuschnitt
// vom ersten Moment an ausprobieren lassen - ohne dass jemand erst eine
// Lieferantenliste besorgen muss.
//
// Sie sind ausdruecklich NICHT als Katalog gedacht. Deshalb:
//  - Sie tragen KEINE Preise (0.00). Ein erfundener Preis, der in einem
//    echten Rapport landet, waere schlimmer als gar keiner.
//  - Sie zaehlen in der Einrichtungs-Checkliste (js/73) nicht mit.
//  - Sie loesen sich auf, sobald der Betrieb seine erste EIGENE Position
//    anlegt oder eine Excel-Liste importiert.
//
// DIE HEIKLE STELLE: eine Beispielposition kann zwischenzeitlich BENUTZT
// worden sein - genau dafuer ist sie ja da. Wer sie dann einfach loescht,
// beschaedigt echte Daten. Verwiesen wird auf zwei ganz verschiedene Arten:
//
//   ueber die Id    lager_varianten.material_id  (LOESCHT KASKADIEREND das
//                                                 Produkt samt Barcode!)
//                   lagerbestand.artikel_id      (wird auf NULL gesetzt)
//                   reststuecke.artikel_id       (wird auf NULL gesetzt)
//   ueber die EDV-Nr. reports.material_entries[].no
//                     measurements.rapport_material[].no
//
// Das Zaehlwerk (material_nutzung u. a.) braucht hier nichts: das sind
// Sichten, die aus den Rapporten rechnen - sie folgen von selbst.
//
// Deshalb entscheidet der FIRMENADMIN, was mit einer benutzten
// Beispielposition geschehen soll. Drei Wege, keiner davon stillschweigend:
//   behalten  - der Stempel geht weg, die Position bleibt als gewoehnliche
//               Katalogposition stehen. Nichts geht verloren. (Vorgabe)
//   loeschen  - die Position geht weg, mit allem, was oben steht.
//   ersetzen  - alles, was auf die Beispielposition zeigt, zeigt danach auf
//               eine echte Position; erst dann wird die Beispielzeile
//               geloescht.
//
// Unbenutzte Beispielpositionen verschwinden ohne Rueckfrage - da gibt es
// nichts zu entscheiden.
// ===========================================================================

// ---- Lesen ---------------------------------------------------------------
// Die Beispielpositionen, wie sie gerade geladen sind. Quelle sind die
// parallelen Listen aus js/05 - es wird nichts nachgeladen, was schon da ist.
function bkDemoPositionen(){
 if(typeof settings!=="object"||!settings||!Array.isArray(settings.materials))return [];
 const raus=[];
 settings.materials.forEach((m,i)=>{
  if(materialDemo[i]!==true)return;
  raus.push({id:materialIds[i],edv_nr:String(m[0]??""),name:String(m[1]??"")});
 });
 return raus;
}
function bkAnzahl(){ return bkDemoPositionen().length }

// Wo wird eine Beispielposition benutzt? Eine Abfragerunde fuer alle, nicht
// eine je Position - bei einer frischen Firma sind das wenige Zeilen, aber
// die Regel bleibt dieselbe wie ueberall sonst im Projekt.
async function bkVerwendungLaden(liste){
 const karte={};
 liste.forEach(d=>{karte[d.id]={produkte:0,bestand:0,reste:0,rapporte:0,aufnahmen:0}});
 if(!liste.length)return karte;
 const ids=liste.map(d=>d.id);
 const nummern=liste.map(d=>d.edv_nr);
 const nachNr={}; liste.forEach(d=>{nachNr[d.edv_nr]=d.id});

 const [varRes,bestRes,restRes,repRes,measRes]=await Promise.all([
  sb.from("lager_varianten").select("material_id").in("material_id",ids),
  sb.from("lagerbestand").select("artikel_id").in("artikel_id",ids),
  sb.from("reststuecke").select("artikel_id").in("artikel_id",ids),
  sb.from("reports").select("id,material_entries"),
  sb.from("measurements").select("id,rapport_material")
 ]);
 (varRes.data||[]).forEach(r=>{if(karte[r.material_id])karte[r.material_id].produkte++});
 (bestRes.data||[]).forEach(r=>{if(karte[r.artikel_id])karte[r.artikel_id].bestand++});
 (restRes.data||[]).forEach(r=>{if(karte[r.artikel_id])karte[r.artikel_id].reste++});
 // Ueber die EDV-Nr.: eine Zeile zaehlt je Rapport einmal, auch wenn die
 // Nummer darin mehrfach vorkommt - gefragt ist "wie viele Rapporte haengen
 // daran", nicht "wie viele Zeilen".
 (repRes.data||[]).forEach(r=>{
  const zeilen=Array.isArray(r.material_entries)?r.material_entries:[];
  const drin=new Set();
  zeilen.forEach(z=>{const id=nachNr[String(z&&z.no!=null?z.no:"").trim()];if(id!==undefined)drin.add(id)});
  drin.forEach(id=>{if(karte[id])karte[id].rapporte++});
 });
 (measRes.data||[]).forEach(m=>{
  const zeilen=Array.isArray(m.rapport_material)?m.rapport_material:[];
  const drin=new Set();
  zeilen.forEach(z=>{const id=nachNr[String(z&&z.no!=null?z.no:"").trim()];if(id!==undefined)drin.add(id)});
  drin.forEach(id=>{if(karte[id])karte[id].aufnahmen++});
 });
 return karte;
}
function bkIstBenutzt(v){
 return !!v&&(v.produkte>0||v.bestand>0||v.reste>0||v.rapporte>0||v.aufnahmen>0);
}
// In Worten, damit im Dialog steht, WAS daran haengt - nicht nur "benutzt".
function bkVerwendungText(v){
 if(!bkIstBenutzt(v))return "nicht benutzt";
 const t=[];
 if(v.produkte)t.push(v.produkte+" Lagerprodukt"+(v.produkte===1?"":"e"));
 if(v.bestand)t.push(v.bestand+" Lagerzeile"+(v.bestand===1?"":"n"));
 if(v.reste)t.push(v.reste+" Reststück"+(v.reste===1?"":"e"));
 if(v.rapporte)t.push(v.rapporte+" Regierapport"+(v.rapporte===1?"":"e"));
 if(v.aufnahmen)t.push(v.aufnahmen+" Massaufnahme"+(v.aufnahmen===1?"":"n"));
 return t.join(", ");
}

// ---- Schreiben -----------------------------------------------------------
// Nur der Stempel geht weg. Die Position bleibt vollstaendig erhalten und
// verhaelt sich ab jetzt wie jede andere - das ist der schonendste Weg und
// deshalb die Vorgabe.
async function bkStempelWeg(ids){
 if(!ids||!ids.length)return {ok:true,anzahl:0};
 const {data,error}=await sb.from("materials").update({demo:false}).in("id",ids).select("id");
 if(error)return {ok:false,meldung:error.message};
 // 0 betroffene Zeilen ist kein Erfolg: bei fehlender Berechtigung meldet
 // PostgREST keinen Fehler, es wirkt nur nichts (CLAUDE.md 24.1).
 if(!data||!data.length)return {ok:false,meldung:"Keine Zeile geändert – fehlt die nötige Berechtigung?"};
 return {ok:true,anzahl:data.length};
}
async function bkLoeschen(ids){
 if(!ids||!ids.length)return {ok:true,anzahl:0};
 const {data,error}=await sb.from("materials").delete().in("id",ids).select("id");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nichts gelöscht – fehlt die nötige Berechtigung?"};
 return {ok:true,anzahl:data.length};
}

// Alles, was auf die Beispielposition zeigt, auf die gewaehlte echte
// Position umhaengen - und ZUERST das, danach loeschen. Andersherum waere
// das Loeschen schon passiert, wenn das Umhaengen scheitert.
//
// paare: [{altId, altNr, neuId, neuNr}]
async function bkErsetzen(paare){
 if(!paare||!paare.length)return {ok:true,anzahl:0};
 const fehler=[];
 for(const p of paare){
  // 1. Verweise ueber die Id.
  const ueberId=[
   sb.from("lager_varianten").update({material_id:p.neuId}).eq("material_id",p.altId),
   sb.from("lagerbestand").update({artikel_id:p.neuId}).eq("artikel_id",p.altId),
   sb.from("reststuecke").update({artikel_id:p.neuId}).eq("artikel_id",p.altId)
  ];
  const erg=await Promise.all(ueberId);
  erg.forEach(r=>{if(r.error)fehler.push(r.error.message)});
  if(fehler.length)return {ok:false,meldung:fehler[0]};
 }
 // 2. Verweise ueber die EDV-Nr. Die Zeilen liegen in JSON-Feldern, sie
 //    muessen also gelesen, geaendert und zurueckgeschrieben werden. Nur
 //    Datensaetze, die wirklich eine betroffene Nummer tragen, werden
 //    angefasst - ein Rapport ohne Beispielmaterial bleibt unberuehrt.
 const nrKarte={}; paare.forEach(p=>{nrKarte[p.altNr]=p.neuNr});
 const umschreiben=async(tabelle,feld)=>{
  const {data,error}=await sb.from(tabelle).select("id,"+feld);
  if(error)return error.message;
  for(const zeile of (data||[])){
   const alt=Array.isArray(zeile[feld])?zeile[feld]:[];
   let geaendert=false;
   const neu=alt.map(z=>{
    const nr=String(z&&z.no!=null?z.no:"").trim();
    if(nrKarte[nr]===undefined)return z;
    geaendert=true;
    return Object.assign({},z,{no:nrKarte[nr]});
   });
   if(!geaendert)continue;
   const patch={}; patch[feld]=neu;
   const {error:e2}=await sb.from(tabelle).update(patch).eq("id",zeile.id).select("id");
   if(e2)return e2.message;
  }
  return null;
 };
 const f1=await umschreiben("reports","material_entries");
 if(f1)return {ok:false,meldung:f1};
 const f2=await umschreiben("measurements","rapport_material");
 if(f2)return {ok:false,meldung:f2};
 // 3. Jetzt erst weg.
 return await bkLoeschen(paare.map(p=>p.altId));
}

// ---- Ablauf --------------------------------------------------------------
// Einstieg. Wird aufgerufen, BEVOR die Firma ihre erste eigene Position
// anlegt bzw. eine Liste importiert. Der Rueckgabewert sagt nur, ob es
// weitergehen kann - die eigentliche Handlung des Anwenders wird NIE
// blockiert, auch wenn hier etwas schiefgeht oder er den Dialog abbricht.
let bkLaeuft=false;
async function bkAufloesen(){
 if(bkLaeuft)return {ok:true,nichts:true};
 const liste=bkDemoPositionen();
 if(!liste.length)return {ok:true,nichts:true};
 bkLaeuft=true;
 try{
  const karte=await bkVerwendungLaden(liste);
  const frei=liste.filter(d=>!bkIstBenutzt(karte[d.id]));
  const benutzt=liste.filter(d=>bkIstBenutzt(karte[d.id]));
  // Unbenutzte gehen ohne Rueckfrage - da ist nichts zu entscheiden.
  if(frei.length){
   const r=await bkLoeschen(frei.map(d=>d.id));
   if(!r.ok)return {ok:false,meldung:r.meldung};
  }
  if(!benutzt.length){
   if(frei.length&&typeof katalogHinweis==="function")
    katalogHinweis("✓ "+frei.length+" Beispiel-Position"+(frei.length===1?"":"en")+" entfernt.");
   await bkNachladen();
   return {ok:true,entfernt:frei.length,gefragt:0};
  }
  // Nur der Firmenadmin darf ueber fremde Daten entscheiden. Ein Mitarbeiter
  // ohne dieses Recht soll nicht gefragt werden - fuer ihn bleiben die
  // Zeilen stehen, der Admin bekommt die Frage beim naechsten Mal.
  if(typeof isAdmin==="function"&&!isAdmin()){
   await bkNachladen();
   return {ok:true,entfernt:frei.length,gefragt:0,vertagt:benutzt.length};
  }
  await bkFrageZeigen(benutzt,karte);
  return {ok:true,entfernt:frei.length,gefragt:benutzt.length};
 }catch(err){
  return {ok:false,meldung:(err&&err.message)||String(err)};
 }finally{
  bkLaeuft=false;
 }
}
async function bkNachladen(){
 if(typeof loadAllData==="function")await loadAllData();
 if(typeof renderSettings==="function")renderSettings();
}

// ---- Der Dialog ----------------------------------------------------------
let bkOffeneListe=[];     // die benutzten Beispielpositionen
let bkOffeneKarte={};     // ihre Verwendung

function bkFrageZeigen(benutzt,karte){
 bkOffeneListe=benutzt; bkOffeneKarte=karte;
 const box=$("bkListe");
 if(!box){
  // Ohne Dialog wird NICHT stillschweigend geloescht - dann bleibt alles
  // stehen. Der schonendste Ausgang ist immer der Rueckfall.
  return Promise.resolve();
 }
 box.innerHTML=benutzt.map(d=>{
  const v=karte[d.id]||{};
  return `<div class="bk-zeile" data-bk-zeile="${esc(d.id)}">
   <div><b>${esc(d.edv_nr)} ${esc(d.name)}</b>
    <div class="small">wird verwendet: ${esc(bkVerwendungText(v))}</div></div>
   <label class="small">Ersetzen durch
    <select data-bk-ersatz="${esc(d.id)}">
     <option value="">– noch nichts gewählt –</option>
     ${bkEchteOptionen()}
    </select></label>
  </div>`;
 }).join("");
 $("bkAnzahl").textContent=String(benutzt.length);
 $("beispielKatalogModal").hidden=false;
 return new Promise(fertig=>{ bkFertig=fertig; });
}
let bkFertig=null;
// Nur ECHTE Positionen kommen als Ersatz in Frage - eine Beispielposition
// durch eine andere Beispielposition zu ersetzen loeste das Problem nicht.
function bkEchteOptionen(){
 if(!Array.isArray(settings&&settings.materials))return "";
 return settings.materials.map((m,i)=>{
  if(materialDemo[i]===true)return "";
  return `<option value="${esc(materialIds[i])}">${esc(String(m[0]??""))} ${esc(String(m[1]??""))}</option>`;
 }).join("");
}
function bkSchliessen(){
 $("beispielKatalogModal").hidden=true;
 const f=bkFertig; bkFertig=null;
 if(f)f();
}
function bkMeldung(text,fehler){
 const el=$("bkMeldung"); if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--muted)";
}

document.addEventListener("click",async e=>{
 const k=e.target.closest("[data-bk-tu]");
 if(!k)return;
 const was=k.getAttribute("data-bk-tu");
 const ids=bkOffeneListe.map(d=>d.id);

 if(was==="behalten"){
  k.disabled=true; bkMeldung("Wird gespeichert …");
  const r=await bkStempelWeg(ids);
  k.disabled=false;
  if(!r.ok){bkMeldung("Nicht gespeichert: "+r.meldung,true);return}
  bkSchliessen(); await bkNachladen();
  if(typeof katalogHinweis==="function")
   katalogHinweis("✓ "+r.anzahl+" Position"+(r.anzahl===1?"":"en")+" behalten – der Beispiel-Vermerk ist weg.");
  return;
 }
 if(was==="loeschen"){
  const was_geht=bkOffeneListe.map(d=>"· "+d.edv_nr+" "+d.name+"  ("+bkVerwendungText(bkOffeneKarte[d.id])+")").join("\n");
  if(!confirm("Diese Positionen werden gelöscht:\n\n"+was_geht
   +"\n\nDamit verschwinden auch die daran hängenden Lagerprodukte samt Barcode."
   +"\nLagerzeilen und Reststücke verlieren ihre Verbindung zum Katalog."
   +"\nZeilen in Regierapporten und Massaufnahmen behalten ihre EDV-Nr., finden aber keine Katalogposition mehr."
   +"\n\nDas lässt sich nicht rückgängig machen. Wirklich löschen?"))return;
  k.disabled=true; bkMeldung("Wird gelöscht …");
  const r=await bkLoeschen(ids);
  k.disabled=false;
  if(!r.ok){bkMeldung("Nicht gelöscht: "+r.meldung,true);return}
  bkSchliessen(); await bkNachladen();
  if(typeof katalogHinweis==="function")katalogHinweis("✓ "+r.anzahl+" Position"+(r.anzahl===1?"":"en")+" gelöscht.");
  return;
 }
 if(was==="ersetzen"){
  const paare=[]; const ohne=[];
  bkOffeneListe.forEach(d=>{
   const sel=document.querySelector('[data-bk-ersatz="'+d.id+'"]');
   const neuId=sel?sel.value:"";
   if(!neuId){ohne.push(d.edv_nr);return}
   const i=materialIds.findIndex(x=>String(x)===String(neuId));
   paare.push({altId:d.id,altNr:d.edv_nr,neuId:neuId,
               neuNr:String((settings.materials[i]||[])[0]??"")});
  });
  if(ohne.length){bkMeldung("Für "+ohne.join(", ")+" ist noch keine Ersatz-Position gewählt.",true);return}
  if(!confirm("Alles, was auf diese "+paare.length+" Beispiel-Position"+(paare.length===1?"":"en")
   +" zeigt, zeigt danach auf die gewählte Position – auch bereits gespeicherte Regierapporte"
   +" und Massaufnahmen. Danach werden die Beispiel-Positionen gelöscht.\n\nFortfahren?"))return;
  k.disabled=true; bkMeldung("Wird umgehängt …");
  const r=await bkErsetzen(paare);
  k.disabled=false;
  if(!r.ok){bkMeldung("Nicht ersetzt: "+r.meldung,true);return}
  bkSchliessen(); await bkNachladen();
  if(typeof katalogHinweis==="function")katalogHinweis("✓ "+paare.length+" Position"+(paare.length===1?"":"en")+" ersetzt.");
  return;
 }
 if(was==="spaeter"){
  // Nichts wird geaendert. Beim naechsten eigenen Eintrag wird wieder
  // gefragt - vergessen geht nicht, weil der Stempel stehen bleibt.
  bkSchliessen();
  return;
 }
});
