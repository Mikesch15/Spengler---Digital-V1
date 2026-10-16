"use strict";
// ===========================================================================
// v3.385  Kalender-Abo (Arbeitskalender per Link) - Oberfläche im Schirm "Termine"
// ---------------------------------------------------------------------------
// Ein veröffentlichter Kalender-Link (ICS, z. B. Outlook "Kalender veröffentlichen") wird vom SERVER alle 15 Minuten gelesen (Edge Function
// "kalender-abo"). NUR LESEN: nichts wird in den Kalender zurückgeschrieben. Der Link ist wie ein Passwort: er wird nur einmal eingegeben, liegt
// verschlüsselt auf dem Server und wird in der App nie wieder angezeigt. Importierte Termine sind schreibgeschützt (🔒) und verschwinden beim Trennen.
// ===========================================================================
let aboZeile=null,aboGeladen=false,aboLaedt=false,aboMeldung="",aboOk=true,aboBusy=false;

async function aboAufruf(body){
 const r=await sb.functions.invoke("kalender-abo",{body});
 let antwort=r.data;
 if(r.error&&r.error.context&&typeof r.error.context.json==="function"){try{antwort=await r.error.context.json()}catch(e){}}
 return antwort||{ok:false,error:"Keine Antwort vom Server."};
}
async function aboLaden(){
 if(aboLaedt)return;
 aboLaedt=true;
 try{
  const v=await sb.from("kalender_abos").select("*").maybeSingle();
  aboZeile=v&&!v.error?v.data:null;
  aboGeladen=true;
 }catch(e){aboGeladen=true}
 aboLaedt=false;
 aboZeichnen();
}
function aboDatum(iso){try{return new Date(iso).toLocaleString("de-CH",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return ""}}
function aboHtml(){
 if(!aboGeladen)return '<h3>Kalender-Abo</h3><div class="small">Wird geladen …</div>';
 const v=aboZeile;
 const meldung=aboMeldung?`<div class="small ${aboOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(aboMeldung)}</div>`:"";
 if(!v){
  return `<h3>🗓️ Arbeitskalender per Link abonnieren (optional)</h3>
  <div class="small">Die Termine deines <b>veröffentlichten Kalenders</b> (z. B. Outlook-Firmenkonto) erscheinen automatisch in der Terminliste – <b>nur lesen</b>, es wird nichts zurückgeschrieben. Ein Abgleich läuft etwa alle 15 Minuten auf dem Server.</div>
  <ul class="small" style="margin:6px 0 6px 18px;padding:0">
   <li>In Outlook: <b>Einstellungen → Kalender → Freigegebene Kalender → Kalender veröffentlichen</b> → «Alle Details anzeigen» → <b>ICS-Link</b> kopieren und hier einfügen.</li>
   <li>Die Termine sind für <b>alle Mitarbeiter mit Projektrecht</b> sichtbar. <b>Private</b> Termine werden nie übernommen. Serien werden aufgelöst.</li>
   <li>Der Link ist wie ein Passwort: Er wird verschlüsselt auf dem Server gespeichert und nie wieder angezeigt. Beim Trennen werden die importierten Termine entfernt.</li>
   <li>Die Änderungen erscheinen mit der Verzögerung, die der Anbieter beim veröffentlichten Kalender hat (oft 15 Minuten bis einige Stunden).</li>
  </ul>
  <label>Kalender-Link (ICS)</label>
  <input id="aboUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics">
  <div class="bar"><button type="button" class="green" id="aboStart"${aboBusy?" disabled":""}>Kalender abonnieren</button></div>
  ${meldung}`;
 }
 const status=v.status==="fehler"?`<div class="a2-ol-fehler"><b>Link nicht mehr gültig</b> – bitte den Kalender neu veröffentlichen und den neuen Link einfügen.</div>`
  :`<div><span class="a2-ol-ok">✓ abonniert</span>${v.letzter_erfolg?` · letzter erfolgreicher Abgleich ${esc(aboDatum(v.letzter_erfolg))}`:" · noch kein Abgleich"}</div>`;
 return `<h3>🗓️ Kalender-Abo: ${esc(v.name||"Arbeitskalender")}</h3>
  <div class="small">Quelle: ${esc(v.host||"–")} · nur lesen</div>
  ${status}
  ${v.letzter_erfolg?`<div class="small">Letzter Lauf: ${esc(v.anz_gefunden)} im Zeitraum, ${esc(v.anz_neu)} neu, ${esc(v.anz_geaendert)} geändert, ${esc(v.anz_entfernt)} entfernt</div>`:""}
  ${v.letzte_meldung?`<div class="small">ℹ️ ${esc(v.letzte_meldung)}</div>`:""}
  <div class="small">Der Abgleich läuft automatisch etwa alle 15 Minuten auf dem Server – die App muss dafür nicht offen sein.</div>
  ${v.status==="fehler"?`<label>Neuer Kalender-Link (ICS)</label><input id="aboUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…">`:""}
  <div class="bar">
   ${v.status==="fehler"?'<button type="button" class="green" id="aboStart">Neuen Link speichern</button>':'<button type="button" class="green" id="aboSync">🔄 Jetzt abgleichen</button>'}
   <button type="button" class="gray" id="aboTrennen">Abo beenden</button></div>
  ${meldung}`;
}
function aboZeichnen(){const b=document.getElementById("aboBox");if(b)b.innerHTML=aboHtml()}
async function aboNachladen(){
 aboGeladen=false;aboZeichnen();
 await aboLaden();
 if(typeof terLaden==="function"&&!document.getElementById("termineModal").hidden){await terLaden();if(typeof terZeichnen==="function")terZeichnen()}
}
function aboErgebnisText(a){
 return `Abgleich fertig: ${a.gefunden} Termin(e) im Zeitraum, ${a.neu} neu, ${a.geaendert} geändert, ${a.entfernt} entfernt${a.fehler?`, ${a.fehler} Fehler`:""}.`;
}
async function aboStarten(){
 if(aboBusy)return;
 const feld=document.getElementById("aboUrl"),url=feld?String(feld.value||"").trim():"";
 if(!url){aboOk=false;aboMeldung="Bitte den Kalender-Link einfügen.";aboZeichnen();return}
 aboBusy=true;aboOk=true;aboMeldung="Link wird geprüft und der Kalender gelesen …";aboZeichnen();
 const a=await aboAufruf({aktion:"start",url});
 aboBusy=false;
 if(feld)feld.value="";   // der Link soll nicht im Formular stehen bleiben
 if(a.ok){aboOk=true;aboMeldung=a.uebersprungen?a.meldung:aboErgebnisText(a)}
 else{aboOk=false;aboMeldung=a.meldung||a.error||"Das Abo konnte nicht eingerichtet werden."}
 await aboNachladen();
}
async function aboSync(){
 if(aboBusy)return;
 aboBusy=true;aboOk=true;aboMeldung="Abgleich läuft …";aboZeichnen();
 const a=await aboAufruf({aktion:"sync"});
 aboBusy=false;
 if(a.ok){aboOk=true;aboMeldung=a.uebersprungen?a.meldung:aboErgebnisText(a)}
 else{aboOk=false;aboMeldung=a.meldung||a.error||"Der Abgleich ist fehlgeschlagen."}
 await aboNachladen();
}
async function aboTrennen(){
 if(!(await appConfirm("Das Kalender-Abo beenden? Die importierten Termine werden aus Spengler-DIGITAL entfernt (dein Kalender selbst bleibt unverändert).",{ok:"Abo beenden"})))return;
 const a=await aboAufruf({aktion:"trennen"});
 aboOk=!!a.ok;aboMeldung=a.ok?"Das Abo wurde beendet, die importierten Termine sind entfernt.":(a.error||"Konnte nicht beendet werden.");
 aboZeile=null;
 await aboNachladen();
}
document.addEventListener("click",async e=>{
 const t=e.target&&e.target.closest?e.target:null;if(!t)return;
 if(t.closest("#aboStart")){await aboStarten();return}
 if(t.closest("#aboSync")){await aboSync();return}
 if(t.closest("#aboTrennen")){await aboTrennen();return}
});
