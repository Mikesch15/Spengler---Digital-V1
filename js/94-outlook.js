"use strict";
// ===========================================================================
// v3.379  Outlook-Synchronisation (pro Mitarbeiter) - Oberfläche im Schirm "Termine"
// ---------------------------------------------------------------------------
// Die eigentliche Arbeit macht die Edge Function "outlook-sync" auf dem Server (Microsoft Graph, alle 5 Minuten im Hintergrund, dazu "Jetzt
// synchronisieren"). Hier im Browser gibt es KEINE Microsoft-Zugangsdaten und keine Tokens: nur Anzeige, "Verbinden" (leitet zur Microsoft-
// Anmeldung), "Jetzt synchronisieren", "Trennen" und die Entscheidung bei Konflikten. Gelesen wird die eigene Verbindung (RLS: nur die eigene Zeile).
// Die Verbindung ist optional - ohne sie funktioniert die App wie bisher (inkl. .ics-Import).
// ===========================================================================
let olVerbindung=null,olAndere="",olKonflikte=[],olGeladen=false,olLaedt=false,olMeldung="",olOk=true,olEinwilligung=false;

function olDatum(iso){
 if(!iso)return "–";
 const d=new Date(iso);
 return isNaN(d)?"–":d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}
async function olLaden(){
 if(olLaedt)return;
 olLaedt=true;
 try{
  // pro Person gibt es genau EINE Kalenderverbindung (Outlook ODER Google, siehe js/95-google-kalender.js)
  const v=await sb.from("outlook_verbindungen").select("*").maybeSingle();
  const zeile=v&&!v.error?v.data:null;
  olVerbindung=zeile&&zeile.anbieter!=="google"?zeile:null;
  olAndere=zeile&&zeile.anbieter==="google"?"Google":"";
  olKonflikte=[];
  if(olVerbindung){
   const k=await sb.from("outlook_termin_map").select("id,termin_id").eq("verbindung_id",olVerbindung.id).eq("konflikt",true);
   const ids=(k&&Array.isArray(k.data)?k.data:[]).filter(x=>x.termin_id!=null);
   if(ids.length){
    const t=await sb.from("termine").select("id,titel,start_datum,start_zeit").in("id",ids.map(x=>x.termin_id));
    const byId=new Map((t&&Array.isArray(t.data)?t.data:[]).map(x=>[x.id,x]));
    olKonflikte=ids.map(x=>({map_id:x.id,termin:byId.get(x.termin_id)||null}));
   }
  }
  olGeladen=true;
 }catch(e){olGeladen=true}
 olLaedt=false;
 olZeichnen();
}
function olStatusHtml(v){
 if(v.status==="fehler")return '<div class="a2-ol-fehler"><b>Anmeldung nötig</b> – die Outlook-Anmeldung ist abgelaufen oder wurde widerrufen.</div>';
 const ok=v.letzter_erfolg?`<span class="a2-ol-ok">✓ verbunden</span> · letzter erfolgreicher Abgleich ${esc(olDatum(v.letzter_erfolg))}`:'<span class="a2-ol-ok">✓ verbunden</span> · noch kein Abgleich';
 return `<div>${ok}</div>`;
}
function olHtml(){
 if(!olGeladen)return '<h3>Outlook</h3><div class="small">Wird geladen …</div>';
 const v=olVerbindung;
 if(!v){
  return `<h3>📧 Outlook-Kalender verbinden (optional)</h3>
  <div class="small">Termine zwischen deinem Outlook-Kalender und Spengler-DIGITAL werden <b>automatisch im Hintergrund</b> abgeglichen (etwa alle 5 Minuten) – in beide Richtungen.</div>
  <ul class="small" style="margin:6px 0 6px 18px;padding:0">
   <li>Termine aus <b>deinem</b> Outlook erscheinen in der Terminliste. Sie sind für <b>alle Mitarbeiter mit Projektrecht</b> sichtbar.</li>
   <li><b>Private</b> Outlook-Termine werden nie übernommen. Mit der Auswahl unten kannst du zusätzlich nur Termine mit der Outlook-Kategorie «Spengler-DIGITAL» übernehmen.</li>
   <li>Ein Projekt wird nur zugeordnet, wenn Adresse oder Auftragsnummer sicher passen; sonst steht «Projekt prüfen» dabei.</li>
   <li>Löschst du einen Termin in der App, den die App nach Outlook geschrieben hat, wird er auch in Outlook gelöscht. Aus Outlook importierte Termine bleiben in Outlook bestehen.</li>
  </ul>
  <label class="small">Welche Outlook-Termine übernehmen?</label>
  <select id="olModusWahl"><option value="alle">Alle (ausser privaten)</option><option value="markierte">Nur Kategorie «Spengler-DIGITAL»</option></select>
  ${olAndere?`<div class="small a2-ol-fehler">Es ist schon ein ${esc(olAndere)}-Kalender verbunden. Pro Person ist nur ein Kalender möglich – bitte zuerst dort die Verbindung trennen.</div>`:`<label class="rechte-schalter"><input type="checkbox" id="olEinwilligung"${olEinwilligung?" checked":""}> Ich habe das gelesen und will meinen Outlook-Kalender verbinden.</label>
  <div class="bar"><button type="button" class="green" id="olVerbinden"${olEinwilligung?"":" disabled"}>Mit Outlook verbinden</button></div>`}
  ${olMeldung?`<div class="small ${olOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(olMeldung)}</div>`:""}`;
 }
 const kon=olKonflikte.length?`<div style="margin-top:8px"><b>${olKonflikte.length} Konflikt${olKonflikte.length===1?"":"e"}</b> – beide Seiten wurden geändert. Es wurde nichts überschrieben, bitte entscheiden:
  ${olKonflikte.map(k=>`<div class="a2-ol-konflikt"><div><b>${esc(k.termin?k.termin.titel:"(Termin nicht mehr vorhanden)")}</b>${k.termin?` <span class="small">${esc(String(k.termin.start_datum).split("-").reverse().join("."))}</span>`:""}</div>
   <div class="bar"><button type="button" class="gray" data-ol-konflikt="${esc(k.map_id)}" data-wahl="app">App-Stand behalten</button><button type="button" class="gray" data-ol-konflikt="${esc(k.map_id)}" data-wahl="outlook">Outlook-Stand übernehmen</button></div></div>`).join("")}</div>`:"";
 return `<h3>📧 Outlook</h3>
  <div class="small">Konto: ${esc(v.ms_konto||"–")}</div>
  ${olStatusHtml(v)}
  ${v.letzter_erfolg?`<div class="small">Letzter Lauf: ${esc(v.anz_neu)} neu, ${esc(v.anz_geaendert)} geändert, ${esc(v.anz_uebersprungen)} übersprungen, ${esc(v.anz_konflikte)} Konflikt(e)</div>`:""}
  ${v.letzte_meldung?`<div class="small">ℹ️ ${esc(v.letzte_meldung)}</div>`:""}
  <div class="small">Der Abgleich läuft automatisch etwa alle 5 Minuten auf dem Server – die App muss dafür nicht offen sein.</div>
  ${kon}
  <label class="small" style="margin-top:8px">Welche Outlook-Termine übernehmen?</label>
  <select id="olModusWahl"><option value="alle"${v.import_modus==="alle"?" selected":""}>Alle (ausser privaten)</option><option value="markierte"${v.import_modus==="markierte"?" selected":""}>Nur Kategorie «Spengler-DIGITAL»</option></select>
  <div class="bar">
   ${v.status==="fehler"?'<button type="button" class="green" id="olVerbinden">Neu verbinden</button>':'<button type="button" class="green" id="olSync">🔄 Jetzt synchronisieren</button>'}
   <button type="button" class="gray" id="olTrennen">Verbindung trennen</button></div>
  ${olMeldung?`<div class="small ${olOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(olMeldung)}</div>`:""}`;
}
function olZeichnen(){const b=document.getElementById("outlookBox");if(b)b.innerHTML=olHtml()}

async function olAufruf(body){
 const r=await sb.functions.invoke("outlook-sync",{body});
 let antwort=r.data;
 if(r.error&&r.error.context&&typeof r.error.context.json==="function"){try{antwort=await r.error.context.json()}catch(e){}}
 return antwort||{ok:false,error:"Keine Antwort vom Server."};
}
function olWeiter(url){location.href=url}
async function olVerbinden(){
 const modus=document.getElementById("olModusWahl");
 olMeldung="";
 const a=await olAufruf({aktion:"start",rueck:location.origin+location.pathname});
 if(!a.ok||!a.url){olOk=false;olMeldung=a.error||"Die Verbindung konnte nicht gestartet werden.";olZeichnen();return}
 try{sessionStorage.setItem("sd_ol_modus",modus&&modus.value==="markierte"?"markierte":"alle")}catch(e){}
 olWeiter(a.url);   // weiter zur Microsoft-Anmeldung; danach kommt die Person mit ?outlook=ok zurück
}
async function olSync(){
 olMeldung="Abgleich läuft …";olOk=true;olZeichnen();
 const a=await olAufruf({aktion:"sync"});
 if(a.ok&&a.uebersprungen){olMeldung=a.meldung;olOk=true}
 else if(a.ok){olMeldung=`Abgleich fertig: ${a.neu} neu, ${a.geaendert} geändert, ${a.uebersprungen} übersprungen${a.konflikte?`, ${a.konflikte} Konflikt(e)`:""}${a.fehler?`, ${a.fehler} Fehler`:""}. In Outlook gefunden: ${Number.isFinite(a.gefunden)?a.gefunden:"–"} Termin(e) im Zeitraum.`;olOk=true}
 else{olMeldung=a.meldung||a.error||"Der Abgleich ist fehlgeschlagen.";olOk=false}
 olGeladen=false;olZeichnen();
 await olLaden();
 if(typeof terLaden==="function"&&!document.getElementById("termineModal").hidden){await terLaden();if(typeof terZeichnen==="function")terZeichnen()}
}
async function olTrennen(){
 if(!(await appConfirm("Die Outlook-Verbindung trennen? Bereits übernommene Termine bleiben in Spengler-DIGITAL und in Outlook bestehen; es wird nichts mehr abgeglichen.",{ok:"Trennen"})))return;
 const a=await olAufruf({aktion:"trennen"});
 olOk=!!a.ok;olMeldung=a.ok?"Die Verbindung wurde getrennt.":(a.error||"Konnte nicht getrennt werden.");
 olVerbindung=null;olKonflikte=[];olEinwilligung=false;olZeichnen();
 if(a.ok)await olLaden();
}
async function olKonfliktLoesen(mapId,wahl){
 const a=await olAufruf({aktion:"konflikt",map_id:Number(mapId),wahl});
 olOk=!!a.ok;olMeldung=a.ok?"Konflikt gelöst.":(a.error||"Konnte nicht gelöst werden.");
 await olLaden();
 if(typeof terLaden==="function"){await terLaden();if(typeof terZeichnen==="function")terZeichnen()}
}
document.addEventListener("click",async e=>{
 const t=e.target&&e.target.closest?e.target:null;if(!t)return;
 if(t.closest("#olVerbinden")){await olVerbinden();return}
 if(t.closest("#olSync")){await olSync();return}
 if(t.closest("#olTrennen")){await olTrennen();return}
 const k=t.closest("[data-ol-konflikt]");
 if(k){await olKonfliktLoesen(k.getAttribute("data-ol-konflikt"),k.getAttribute("data-wahl"));return}
});
document.addEventListener("change",async e=>{
 const t=e.target;if(!t)return;
 if(t.id==="olEinwilligung"){olEinwilligung=t.checked;const b=document.getElementById("olVerbinden");if(b)b.disabled=!t.checked;return}
 if(t.id==="olModusWahl"&&olVerbindung){
  const a=await olAufruf({aktion:"modus",import_modus:t.value});
  olOk=!!a.ok;olMeldung=a.ok?"Gespeichert.":(a.error||"Konnte nicht gespeichert werden.");
  if(a.ok)olVerbindung.import_modus=t.value;
  olZeichnen();
 }
});
// Rückkehr von Microsoft: ?outlook=ok|fehler
async function olRueckkehr(){
 let p="";
 try{p=new URLSearchParams(location.search).get("outlook")||""}catch(e){}
 if(!p)return;
 try{const u=new URL(location.href);u.searchParams.delete("outlook");history.replaceState(null,"",u.pathname+(u.search||"")+u.hash)}catch(e){}
 if(p==="ok"){
  let modus="alle";try{modus=sessionStorage.getItem("sd_ol_modus")||"alle";sessionStorage.removeItem("sd_ol_modus")}catch(e){}
  olOk=true;olMeldung="Outlook ist verbunden. Der erste Abgleich läuft …";
  if(typeof a2BereichStarten==="function"&&typeof terOeffnen==="function")await a2BereichStarten("termineModal","Termine","mehr",()=>terOeffnen());
  else if(typeof terOeffnen==="function")await terOeffnen();
  await olLaden();
  if(modus==="markierte")await olAufruf({aktion:"modus",import_modus:"markierte"});
  await olSync();
 }else{
  olOk=false;olMeldung="Die Verbindung mit Outlook ist nicht zustande gekommen. Bitte erneut versuchen.";
  if(typeof a2BereichStarten==="function"&&typeof terOeffnen==="function")await a2BereichStarten("termineModal","Termine","mehr",()=>terOeffnen());
  await olLaden();
 }
}
// aufgerufen am Ende von afterLogin() (js/03), wenn die App steht
