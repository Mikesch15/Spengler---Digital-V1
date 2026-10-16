"use strict";
// ===========================================================================
// v3.384  Google-Kalender-Abgleich (pro Mitarbeiter) - Oberfläche im Schirm "Termine"
// ---------------------------------------------------------------------------
// Gleiche Technik wie der Outlook-Abgleich (js/94-outlook.js): die Arbeit macht die Edge Function "outlook-sync" auf dem Server (Google Calendar API,
// alle 5 Minuten im Hintergrund, dazu "Jetzt synchronisieren"). Im Browser gibt es KEINE Google-Zugangsdaten und keine Tokens. Pro Person gibt es genau
// EINE Kalenderverbindung: Outlook ODER Google. Es wird der Hauptkalender des verbundenen Google-Kontos abgeglichen.
// ===========================================================================
let gkVerbindung=null,gkAndere="",gkKonflikte=[],gkGeladen=false,gkLaedt=false,gkMeldung="",gkOk=true,gkEinwilligung=false;

async function gkLaden(){
 if(gkLaedt)return;
 gkLaedt=true;
 try{
  const v=await sb.from("outlook_verbindungen").select("*").maybeSingle();
  const zeile=v&&!v.error?v.data:null;
  gkVerbindung=zeile&&zeile.anbieter==="google"?zeile:null;
  gkAndere=zeile&&zeile.anbieter!=="google"?"Outlook":"";
  gkKonflikte=[];
  if(gkVerbindung){
   const k=await sb.from("outlook_termin_map").select("id,termin_id").eq("verbindung_id",gkVerbindung.id).eq("konflikt",true);
   const ids=(k&&Array.isArray(k.data)?k.data:[]).filter(x=>x.termin_id!=null);
   if(ids.length){
    const t=await sb.from("termine").select("id,titel,start_datum,start_zeit").in("id",ids.map(x=>x.termin_id));
    const byId=new Map((t&&Array.isArray(t.data)?t.data:[]).map(x=>[x.id,x]));
    gkKonflikte=ids.map(x=>({map_id:x.id,termin:byId.get(x.termin_id)||null}));
   }
  }
  gkGeladen=true;
 }catch(e){gkGeladen=true}
 gkLaedt=false;
 gkZeichnen();
}
function gkHtml(){
 if(!gkGeladen)return '<h3>Google-Kalender</h3><div class="small">Wird geladen …</div>';
 const v=gkVerbindung;
 if(!v){
  return `<h3>📅 Google-Kalender verbinden (optional)</h3>
  <div class="small">Termine zwischen deinem <b>Google-Kalender</b> (z. B. dem auf dem Handy) und Spengler-DIGITAL werden <b>automatisch im Hintergrund</b> abgeglichen (etwa alle 5 Minuten) – in beide Richtungen.</div>
  <ul class="small" style="margin:6px 0 6px 18px;padding:0">
   <li>Abgeglichen wird der <b>Hauptkalender</b> deines Google-Kontos. Seine Termine erscheinen in der Terminliste und sind für <b>alle Mitarbeiter mit Projektrecht</b> sichtbar.</li>
   <li><b>Private</b> Google-Termine (Sichtbarkeit «Privat» oder «Vertraulich») werden nie übernommen. Eine Auswahl nach Kategorien gibt es bei Google nicht.</li>
   <li>Ein Projekt wird nur zugeordnet, wenn Adresse oder Auftragsnummer sicher passen; sonst steht «Projekt prüfen» dabei.</li>
   <li>Löschst du einen Termin in der App, den die App nach Google geschrieben hat, wird er auch in Google gelöscht. Aus Google importierte Termine bleiben in Google bestehen.</li>
   <li>Pro Person ist nur <b>ein</b> Kalender möglich (Outlook <b>oder</b> Google).</li>
  </ul>
  ${gkAndere?`<div class="small a2-ol-fehler">Es ist schon ein ${esc(gkAndere)}-Kalender verbunden. Bitte zuerst dort die Verbindung trennen.</div>`:`<label class="rechte-schalter"><input type="checkbox" id="gkEinwilligung"${gkEinwilligung?" checked":""}> Ich habe das gelesen und will meinen Google-Kalender verbinden.</label>
  <div class="bar"><button type="button" class="green" id="gkVerbinden"${gkEinwilligung?"":" disabled"}>Mit Google verbinden</button></div>`}
  ${gkMeldung?`<div class="small ${gkOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(gkMeldung)}</div>`:""}`;
 }
 const kon=gkKonflikte.length?`<div style="margin-top:8px"><b>${gkKonflikte.length} Konflikt${gkKonflikte.length===1?"":"e"}</b> – beide Seiten wurden geändert. Es wurde nichts überschrieben, bitte entscheiden:
  ${gkKonflikte.map(k=>`<div class="a2-ol-konflikt"><div><b>${esc(k.termin?k.termin.titel:"(Termin nicht mehr vorhanden)")}</b>${k.termin?` <span class="small">${esc(String(k.termin.start_datum).split("-").reverse().join("."))}</span>`:""}</div>
   <div class="bar"><button type="button" class="gray" data-gk-konflikt="${esc(k.map_id)}" data-wahl="app">App-Stand behalten</button><button type="button" class="gray" data-gk-konflikt="${esc(k.map_id)}" data-wahl="outlook">Google-Stand übernehmen</button></div></div>`).join("")}</div>`:"";
 const status=v.status==="fehler"?'<div class="a2-ol-fehler"><b>Anmeldung nötig</b> – die Google-Anmeldung ist abgelaufen oder wurde widerrufen.</div>'
  :`<div><span class="a2-ol-ok">✓ verbunden</span>${v.letzter_erfolg?` · letzter erfolgreicher Abgleich ${esc(olDatum(v.letzter_erfolg))}`:" · noch kein Abgleich"}</div>`;
 return `<h3>📅 Google-Kalender</h3>
  <div class="small">Konto: ${esc(v.ms_konto||"–")} (Hauptkalender)</div>
  ${status}
  ${v.letzter_erfolg?`<div class="small">Letzter Lauf: ${esc(v.anz_neu)} neu, ${esc(v.anz_geaendert)} geändert, ${esc(v.anz_uebersprungen)} übersprungen, ${esc(v.anz_konflikte)} Konflikt(e)</div>`:""}
  ${v.letzte_meldung?`<div class="small">ℹ️ ${esc(v.letzte_meldung)}</div>`:""}
  <div class="small">Der Abgleich läuft automatisch etwa alle 5 Minuten auf dem Server – die App muss dafür nicht offen sein.</div>
  ${kon}
  <div class="bar">
   ${v.status==="fehler"?'<button type="button" class="green" id="gkVerbinden">Neu verbinden</button>':'<button type="button" class="green" id="gkSync">🔄 Jetzt synchronisieren</button>'}
   <button type="button" class="gray" id="gkTrennen">Verbindung trennen</button></div>
  ${gkMeldung?`<div class="small ${gkOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(gkMeldung)}</div>`:""}`;
}
function gkZeichnen(){const b=document.getElementById("googleBox");if(b)b.innerHTML=gkHtml()}
function gkWeiter(url){location.href=url}
async function gkVerbinden(){
 gkMeldung="";
 const a=await olAufruf({aktion:"start",anbieter:"google",rueck:location.origin+location.pathname});
 if(!a.ok||!a.url){gkOk=false;gkMeldung=a.error||"Die Verbindung konnte nicht gestartet werden.";gkZeichnen();return}
 gkWeiter(a.url);
}
async function gkSync(){
 gkMeldung="Abgleich läuft …";gkOk=true;gkZeichnen();
 const a=await olAufruf({aktion:"sync"});
 if(a.ok&&a.uebersprungen){gkMeldung=a.meldung;gkOk=true}
 else if(a.ok){gkMeldung=`Abgleich fertig: ${a.neu} neu, ${a.geaendert} geändert, ${a.uebersprungen} übersprungen${a.konflikte?`, ${a.konflikte} Konflikt(e)`:""}${a.fehler?`, ${a.fehler} Fehler`:""}. In Google gefunden: ${Number.isFinite(a.gefunden)?a.gefunden:"–"} Termin(e) im Zeitraum.`;gkOk=true}
 else{gkMeldung=a.meldung||a.error||"Der Abgleich ist fehlgeschlagen.";gkOk=false}
 gkGeladen=false;gkZeichnen();
 await gkLaden();
 if(typeof terLaden==="function"&&!document.getElementById("termineModal").hidden){await terLaden();if(typeof terZeichnen==="function")terZeichnen()}
}
async function gkTrennen(){
 if(!(await appConfirm("Die Google-Verbindung trennen? Bereits übernommene Termine bleiben in Spengler-DIGITAL und in Google bestehen; es wird nichts mehr abgeglichen.",{ok:"Trennen"})))return;
 const a=await olAufruf({aktion:"trennen"});
 gkOk=!!a.ok;gkMeldung=a.ok?"Die Verbindung wurde getrennt.":(a.error||"Konnte nicht getrennt werden.");
 gkVerbindung=null;gkKonflikte=[];gkEinwilligung=false;gkZeichnen();
 if(a.ok)await gkLaden();
}
async function gkKonfliktLoesen(mapId,wahl){
 const a=await olAufruf({aktion:"konflikt",map_id:Number(mapId),wahl});
 gkOk=!!a.ok;gkMeldung=a.ok?"Konflikt gelöst.":(a.error||"Konnte nicht gelöst werden.");
 await gkLaden();
 if(typeof terLaden==="function"){await terLaden();if(typeof terZeichnen==="function")terZeichnen()}
}
document.addEventListener("click",async e=>{
 const t=e.target&&e.target.closest?e.target:null;if(!t)return;
 if(t.closest("#gkVerbinden")){await gkVerbinden();return}
 if(t.closest("#gkSync")){await gkSync();return}
 if(t.closest("#gkTrennen")){await gkTrennen();return}
 const k=t.closest("[data-gk-konflikt]");
 if(k){await gkKonfliktLoesen(k.getAttribute("data-gk-konflikt"),k.getAttribute("data-wahl"));return}
});
document.addEventListener("change",e=>{
 const t=e.target;if(!t)return;
 if(t.id==="gkEinwilligung"){gkEinwilligung=t.checked;const b=document.getElementById("gkVerbinden");if(b)b.disabled=!t.checked}
});
// Rückkehr von Google: ?google=ok|fehler|andere|berechtigung (aufgerufen am Ende von afterLogin, js/03)
async function gkRueckkehr(){
 let p="";
 try{p=new URLSearchParams(location.search).get("google")||""}catch(e){}
 if(!p)return;
 try{const u=new URL(location.href);u.searchParams.delete("google");history.replaceState(null,"",u.pathname+(u.search||"")+u.hash)}catch(e){}
 if(p==="ok"){gkOk=true;gkMeldung="Google-Kalender ist verbunden. Der erste Abgleich läuft …"}
 else{gkOk=false;gkMeldung=p==="andere"?"Es ist schon ein Outlook-Kalender verbunden. Bitte zuerst dort die Verbindung trennen."
  :p==="berechtigung"?"Der Zugriff auf den Kalender wurde bei Google nicht erlaubt. Bitte beim Verbinden den Kalender-Zugriff anhaken."
  :"Die Verbindung mit Google ist nicht zustande gekommen. Bitte erneut versuchen."}
 if(typeof a2BereichStarten==="function"&&typeof terOeffnen==="function")await a2BereichStarten("termineModal","Termine","mehr",()=>terOeffnen());
 else if(typeof terOeffnen==="function")await terOeffnen();
 await gkLaden();
 if(p==="ok")await gkSync();
}
