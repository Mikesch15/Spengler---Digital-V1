"use strict";
// ===========================================================================
// Offline-Warteschlange  (v3.04)
// ===========================================================================
// Bis v3.03 hat die App das Speichern ohne Verbindung schlicht abgelehnt
// (js/27-offline.js). Das war ehrlich, aber auf der Baustelle unbrauchbar:
// wer dort misst, hat oft kein Netz und muss trotzdem erfassen koennen.
//
// EHRLICHER UMFANG - was hier gebaut ist und was ausdruecklich nicht:
//
//   GEHT JETZT OHNE VERBINDUNG
//     * Projekt anlegen
//     * Massaufnahme anlegen und aendern (mit Fotos und Skizzen)
//     * Ausmass anlegen und aendern (mit Fotos)
//     * Regierapport anlegen und aendern (mit Fotos)
//     * Feedback schreiben
//     Der Eintrag wandert in eine Warteschlange auf dem Geraet und wird
//     gesendet, sobald wieder eine Verbindung besteht.
//
//   GEHT WEITERHIN NICHT OHNE VERBINDUNG
//     * Loeschen und Archivieren - ein geloeschter Datensatz laesst sich
//       nicht zurueckholen, wenn die Warteschlange spaeter scheitert.
//     * Mitarbeiter anlegen, Rechte, Einstellungen, Materialkataloge,
//       Reststuecke, System-Administration - das sind Verwaltungsschritte,
//       die niemand auf dem Dach macht.
//     * Anmelden ohne bestehende Sitzung, Suche ueber die Datenbank, Verlauf.
//     Dort bleibt die klare Absage aus js/27.
//
// WIE MIT KONFLIKTEN UMGEGANGEN WIRD
//   Ein NEUER Datensatz kann nicht kollidieren - er wird angelegt.
//   Ein GEAENDERTER kann: jemand anderes hat ihn zwischenzeitlich bearbeitet.
//   Deshalb merkt sich jeder Aenderungs-Eintrag den Stand (updated_at), den
//   der Datensatz beim Erfassen hatte. Ist der Serverstand beim Senden neuer,
//   wird NICHTS ueberschrieben: der Eintrag bleibt als Konflikt stehen und
//   die Person entscheidet - "meine Fassung nehmen" oder "verwerfen".
//   Es gibt bewusst kein automatisches Zusammenfuehren.
//
// TEMPORAERE IDs
//   Ein offline angelegtes Projekt hat noch keine Datenbank-ID. Es bekommt
//   eine temporaere ("tmp-…"), und jede Massaufnahme, jedes Ausmass und
//   jeder Rapport, der offline darauf zeigt, traegt diese temporaere ID.
//   Beim Senden wird sie durch die echte ersetzt. Scheitert das Projekt,
//   werden die abhaengigen Eintraege NICHT gesendet - sie warten mit.
//
// DATENSCHUTZ / MEHRERE FIRMEN
//   Die Warteschlange gehoert immer genau einer Firma. Beim Abmelden und bei
//   jedem Firmenwechsel wird sie geloescht, genau wie der Offline-Cache.
//   Die Eintraege tragen NIE eine company_id - die setzt die Datenbank per
//   DEFAULT my_company_id(), und die restriktive tenant_boundary-Policy
//   erzwingt sie zusaetzlich. Ein manipulierter Eintrag koennte deshalb
//   nichts in eine fremde Firma schreiben.
//
// WARUM IndexedDB UND NICHT localStorage
//   Fotos. Ein auf 1600 px verkleinertes Foto sind als data:-URL rund
//   200-400 kB; ein Arbeitstag kommt schnell ueber die 5 MB, die
//   localStorage typischerweise haelt. IndexedDB hat diese Grenze nicht.
//   Laesst sich IndexedDB nicht oeffnen (privates Fenster, gesperrter
//   Speicher), wird NICHT stillschweigend nichts gespeichert - dann kommt
//   die alte, klare Absage.
// ===========================================================================

const WS_DB="sd_warteschlange";
const WS_DB_VERSION=1;
const WS_SPEICHER="eintraege";
let wsDbHandle=null;

// ---- IndexedDB, klein gehalten -------------------------------------------
function wsDb(){
 if(wsDbHandle)return Promise.resolve(wsDbHandle);
 return new Promise((fertig,fehler)=>{
  if(typeof indexedDB==="undefined"){fehler(new Error("IndexedDB fehlt"));return}
  let anfrage;
  try{anfrage=indexedDB.open(WS_DB,WS_DB_VERSION)}catch(e){fehler(e);return}
  anfrage.onupgradeneeded=()=>{
   const db=anfrage.result;
   if(!db.objectStoreNames.contains(WS_SPEICHER)){
    const s=db.createObjectStore(WS_SPEICHER,{keyPath:"id"});
    s.createIndex("firma","firma",{unique:false});
   }
  };
  anfrage.onsuccess=()=>{wsDbHandle=anfrage.result;fertig(wsDbHandle)};
  anfrage.onerror=()=>fehler(anfrage.error||new Error("IndexedDB nicht verfügbar"));
 });
}
function wsAktion(modus,fn){
 return wsDb().then(db=>new Promise((fertig,fehler)=>{
  const t=db.transaction(WS_SPEICHER,modus);
  const s=t.objectStore(WS_SPEICHER);
  let wert;
  try{wert=fn(s)}catch(e){fehler(e);return}
  t.oncomplete=()=>fertig(wert&&wert.result!==undefined?wert.result:wert);
  t.onerror=()=>fehler(t.error);
  t.onabort=()=>fehler(t.error||new Error("abgebrochen"));
 }));
}
async function wsAlle(){
 const roh=await wsAktion("readonly",s=>s.getAll());
 const liste=Array.isArray(roh)?roh:[];
 const firma=wsFirma();
 // Fremde Firma: nichts herausgeben UND sofort entfernen - dieselbe Regel
 // wie beim Offline-Cache (js/27).
 const fremd=liste.filter(e=>String(e.firma)!==String(firma));
 if(fremd.length){await wsLeeren();return []}
 return wsSortieren(liste);
}

// Reihenfolge der Warteschlange. Zeitstempel zuerst - aber ein Eintrag, der
// auf eine temporaere Projekt-ID zeigt, muss NACH dem Eintrag stehen, der
// dieses Projekt anlegt.
//
// Warum das noetig ist: 'erstellt' hat Millisekunden-Aufloesung. Werden
// Projekt und Massaufnahme in derselben Millisekunde eingereiht - beim
// Anlegen aus dem Cockpit heraus der Normalfall -, sind die Zeitstempel
// gleich, und dann entschied bisher die zufaellige Schluesselreihenfolge von
// getAll(). Landete die Massaufnahme vorne, meldete das Senden fuer sie
// "wartet" und sie ging erst eine Runde spaeter durch. Kein Datenverlust,
// aber fuer den Benutzer ein unerklaerliches "1 wartet noch".
// Die erste temporaere ID, auf die ein Eintrag zeigt (oder null).
function wsErsteTmp(payload){
 const k=Object.keys(payload||{}).find(x=>wsIstTmp(payload[x]));
 return k?String(payload[k]):null;
}
function wsSortieren(liste){
 const nach=liste.slice().sort((a,b)=>String(a.erstellt).localeCompare(String(b.erstellt)));
 const erg=[], offen=nach.slice(), fertig=new Set();
 let runden=0;
 while(offen.length && runden++ <= nach.length){
  let bewegt=false;
  for(let i=0;i<offen.length;){
   const e=offen[i];
   // v3.23: JEDE temporaere ID im Payload zaehlt, nicht nur project_id - ein
   // abgehaktes Stueck haengt an measurement_id.
   const braucht=wsErsteTmp(e.payload);
   if(!braucht || fertig.has(braucht)){
    erg.push(e);
    if(e.tmpId)fertig.add(String(e.tmpId));
    offen.splice(i,1); bewegt=true;
   }else i++;
  }
  if(!bewegt)break;   // nicht aufloesbar (das Projekt ist nicht mehr in der Liste)
 }
 return erg.concat(offen);
}
async function wsLegen(e){ await wsAktion("readwrite",s=>s.put(e)); return e }
async function wsWeg(id){ await wsAktion("readwrite",s=>s.delete(id)) }
async function wsLeeren(){ try{ await wsAktion("readwrite",s=>s.clear()) }catch(e){} }

// ---- Zustand --------------------------------------------------------------
function wsFirma(){
 return (typeof currentProfile!=="undefined"&&currentProfile&&currentProfile.company_id)
  ?String(currentProfile.company_id):"";
}
function wsIstOffline(){
 return typeof offlineIstOffline==="function"?offlineIstOffline():false;
}
function wsTmpId(){
 return "tmp-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
}
function wsIstTmp(id){ return typeof id==="string"&&id.indexOf("tmp-")===0 }

// Deutsche Bezeichnung einer Tabelle - fuer jede Meldung dieselbe.
// Diese Liste ist zugleich die abschliessende Erlaubnis: NUR in diese fuenf
// Tabellen schreibt die Warteschlange. Der Tabellenname steht im Eintrag auf
// dem Geraet - jemand mit Zugriff auf den Browserspeicher koennte ihn
// aendern. Die Firmengrenze haelt ohnehin (restriktive tenant_boundary-Policy
// und DEFAULT my_company_id()), aber eine Warteschlange soll erst gar nicht
// in Tabellen schreiben koennen, fuer die sie nie gedacht war.
const WS_NAMEN={projects:"Projekt",measurements:"Massaufnahme",ausmass:"Ausmass",
 reports:"Regierapport",feedback:"Feedback",zuschnitt_erledigt:"Zuschnitt abgehakt"};
function wsName(t){ return WS_NAMEN[t]||t }
function wsTabelleErlaubt(t){ return Object.prototype.hasOwnProperty.call(WS_NAMEN,String(t)) }

// ---- Einreihen ------------------------------------------------------------
// Wird von den Speicherwegen gerufen, wenn keine Verbindung besteht.
// Gibt {ok:true,tmpId} zurueck, wenn der Eintrag in der Warteschlange liegt,
// sonst {ok:false} - dann muss der Aufrufer wie bisher absagen.
async function wsEinreihen(o){
 const firma=wsFirma();
 if(!firma)return {ok:false,grund:"keine Firma"};
 if(!wsTabelleErlaubt(o.tabelle))return {ok:false,grund:"unzulässiger Bereich"};
 // Zweimal speichern darf keinen zweiten Eintrag ergeben - sonst entstuende
 // beim Uebertragen ein doppelter Datensatz (bei "neu") oder ein Konflikt
 // gegen die EIGENE erste Aenderung (bei "aendern"). Der Schluessel ist
 // deshalb: bei einer Aenderung die Zielzeile, bei einem neuen Datensatz die
 // Marke, die das Formular sich merkt.
 const schluessel=o.zielId?`${o.tabelle}:${o.zielId}`:(o.schluessel||null);
 let vorhanden=null;
 if(schluessel){
  try{ vorhanden=(await wsAlle()).find(x=>x.schluessel===schluessel)||null }catch(err){ vorhanden=null }
 }
 const e={
  id:vorhanden?vorhanden.id:wsTmpId(),
  schluessel,
  firma,
  tabelle:o.tabelle,
  // v3.23: "upsert" fuer das Abhaken - der Aufrufer sagt es ausdruecklich.
  art:o.art||(o.zielId?"update":"insert"),
  zielId:o.zielId||null,
  // Die temporaere ID bleibt beim Ersetzen dieselbe - sonst zeigten bereits
  // eingereihte Massaufnahmen auf ein Projekt, das es nicht mehr gibt.
  tmpId:o.zielId?null:((vorhanden&&vorhanden.tmpId)||wsTmpId()),
  payload:o.payload||{},
  // Bilder liegen als data:-URLs im Eintrag und werden erst beim Senden
  // hochgeladen - offline gibt es weder Zeilen-ID noch Storage.
  bilder:o.bilder||null,
  // Stand des Datensatzes beim Erfassen (nur bei einer Aenderung) - damit
  // laesst sich beim Senden erkennen, ob jemand anderes ihn geaendert hat.
  // Der Stand VOR der ersten Aenderung ist der richtige Vergleichspunkt -
  // nicht der nach der eigenen zweiten.
  standVorher:(vorhanden?vorhanden.standVorher:o.standVorher)||null,
  titel:o.titel||"",
  erstellt:vorhanden?vorhanden.erstellt:new Date().toISOString(),
  geaendert:new Date().toISOString(),
  versuche:0,
  fehler:null,
  konflikt:null
 };
 try{ await wsLegen(e) }catch(err){ return {ok:false,grund:String(err&&err.message||err)} }
 wsAnzeigeAuffrischen();
 return {ok:true,tmpId:e.tmpId,id:e.id,schluessel,ersetzt:!!vorhanden};
}

// ---- Senden ---------------------------------------------------------------
let wsLaeuft=false;
// Temporaere ID -> echte ID, innerhalb eines Sendelaufs.
let wsIdKarte={};

function wsErsetzeIds(payload){
 const p={...payload};
 Object.keys(p).forEach(k=>{
  if(wsIstTmp(p[k])&&wsIdKarte[p[k]]!==undefined)p[k]=wsIdKarte[p[k]];
 });
 return p;
}
// Zeigt der Eintrag noch auf eine temporaere ID, die es nicht gibt?
function wsHaengtAn(payload){
 return Object.keys(payload||{}).some(k=>wsIstTmp(payload[k])&&wsIdKarte[payload[k]]===undefined);
}

// Ein Bildfeld hochladen und die Pfade zurueckgeben.
async function wsBilderHoch(bilder,ordner){
 const raus={};
 for(const feld of Object.keys(bilder||{})){
  const liste=bilder[feld]||[];
  const pfade=[];
  for(const b of liste){
   if(typeof b!=="string"){continue}
   if(!b.startsWith("data:")){pfade.push(b);continue}
   const unter=(feld==="sketch_paths")?"sketches":"photo";
   pfade.push(await uploadMeasurementImage(b,`${ordner}/${unter}`));
  }
  raus[feld]=pfade;
 }
 return raus;
}

// Der Ordner, unter dem die Bilder eines Eintrags liegen. Ohne bekannten
// Ordner werden KEINE Bilder hochgeladen - lieber der Datensatz ohne Bild
// als ein Bild an einer falschen Stelle.
function wsOrdner(tabelle,payload,id){
 if(tabelle==="measurements"&&payload.project_id)return `measurements/${payload.project_id}/${id}`;
 if(tabelle==="ausmass")return "ausmass-photo";
 if(tabelle==="reports"&&payload.project_id)return `reports/${payload.project_id}/${id}`;
 return null;
}

// Passt der Haken noch zum jetzigen Zuschnittplan? Verglichen wird der
// mitgespeicherte Beleg (Laenge/Breite) mit dem Stueck, das die Nummer HEUTE
// bezeichnet. Ohne Pruefmoeglichkeit (pmatStuecke fehlt) wird nicht blockiert -
// dann ist der Haken so gut wie einer, der online gesetzt worden waere.
async function wsHakenPasst(payload,entschieden){
 const {data,error}=await sb.from("measurements").select("id,data")
   .eq("id",payload.measurement_id).maybeSingle();
 if(error)return {ok:false,fehler:error.message};
 if(!data)return {ok:false,fehler:"Die Massaufnahme existiert nicht mehr."};
 if(entschieden)return {ok:true};
 if(typeof pmatStuecke!=="function")return {ok:true};
 const stuecke=pmatStuecke(data);
 if(!stuecke.length)return {ok:true};   // kein Plan mehr - nicht ueberdeuten
 const s=stuecke.find(x=>Number(x.nr)===Number(payload.stueck_nr));
 if(!s)return {ok:false,text:"Stück "+payload.stueck_nr
   +" gibt es im jetzigen Zuschnitt nicht mehr. Der Haken wurde nicht gesetzt."};
 const l=Number(payload.laenge_mm), b=Number(payload.breite_mm);
 const gleich=(a,c)=>!Number.isFinite(a)||!Number.isFinite(Number(c))||Math.round(a)===Math.round(Number(c));
 if(!gleich(l,s.laenge)||!gleich(b,s.breite))
  return {ok:false,text:"Stück "+payload.stueck_nr+" hat jetzt ein anderes Mass ("
   +Math.round(Number(s.laenge)||0)+" mm statt "+Math.round(l||0)
   +" mm). Der Zuschnitt wurde nach dem Abhaken geändert."};
 return {ok:true};
}

async function wsSendeEinen(e){
 // Auch beim Senden noch einmal - der Eintrag lag zwischenzeitlich auf dem
 // Geraet und koennte veraendert worden sein.
 if(!wsTabelleErlaubt(e.tabelle))return {status:"fehler",fehler:"Unzulässiger Bereich."};
 const payload=wsErsetzeIds(e.payload);
 if(wsHaengtAn(payload))return {status:"wartet"};
 const jetzt=new Date().toISOString();

 // v3.23: Ein abgehaktes Zuschnittstueck. Die Positionsnummer allein reicht
 // nicht: wurde die Massaufnahme zwischenzeitlich geaendert, kann dieselbe
 // Nummer inzwischen zu einem anderen Blech gehoeren. Genau dafuer liegt seit
 // v3.15 der Beleg (Laenge, Breite, Merkmal) an jedem Haken - er wird hier
 // gegen den jetzigen Plan geprueft. Passt er nicht, wird NICHTS geschrieben:
 // der Eintrag bleibt als Konflikt stehen und die Person entscheidet.
 if(e.art==="upsert"){
  const pruef=await wsHakenPasst(payload,e.konfliktEntschieden);
  if(pruef.fehler)return {status:"fehler",fehler:pruef.fehler};
  if(!pruef.ok)return {status:"konflikt",serverStand:null,text:pruef.text};
  const {data,error}=await sb.from(e.tabelle)
   .upsert([payload],{onConflict:"measurement_id,stueck_nr"}).select();
  if(error)return {status:"fehler",fehler:error.message};
  if(!data||!data.length)
   return {status:"fehler",fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
  return {status:"ok",id:data[0].id};
 }

 if(e.art==="update"){
  // Konfliktpruefung: hat jemand anderes den Datensatz zwischenzeitlich
  // geaendert? Dann wird NICHTS ueberschrieben.
  const {data:ist,error:eLese}=await sb.from(e.tabelle).select("id,updated_at")
    .eq("id",e.zielId).maybeSingle();
  if(eLese)return {status:"fehler",fehler:eLese.message};
  if(!ist)return {status:"fehler",fehler:"Der Datensatz existiert nicht mehr."};
  const serverStand=ist.updated_at||null;
  if(e.standVorher&&serverStand&&String(serverStand)!==String(e.standVorher)&&!e.konfliktEntschieden){
   return {status:"konflikt",serverStand};
  }
 }

 // Erst die Zeile, dann die Bilder - der Storage-Pfad braucht die ID.
 let zeilenId=e.zielId;
 const ohneBilder={...payload};
 if(e.bilder)Object.keys(e.bilder).forEach(f=>{delete ohneBilder[f]});
 if(e.art==="insert"){
  const {data,error}=await sb.from(e.tabelle)
   .insert({...ohneBilder,created_at:e.erstellt,updated_at:jetzt}).select().maybeSingle();
  if(error)return {status:"fehler",fehler:error.message};
  if(!data)return {status:"fehler",fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
  zeilenId=data.id;
  if(e.tmpId)wsIdKarte[e.tmpId]=data.id;
 }else{
  const {data,error}=await sb.from(e.tabelle).update({...ohneBilder,updated_at:jetzt})
   .eq("id",e.zielId).select();
  if(error)return {status:"fehler",fehler:error.message};
  if(!data||!data.length)return {status:"fehler",fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 }

 if(e.bilder&&Object.keys(e.bilder).length){
  const ordner=wsOrdner(e.tabelle,payload,zeilenId);
  if(ordner){
   try{
    const pfade=await wsBilderHoch(e.bilder,ordner);
    const nach={};
    Object.keys(pfade).forEach(f=>{
     nach[f]=pfade[f];
     if(f==="photo_paths")nach.photo_path=pfade[f][0]||null;
     if(f==="sketch_paths")nach.sketch_path=pfade[f][0]||null;
    });
    const {error:eB}=await sb.from(e.tabelle).update(nach).eq("id",zeilenId);
    if(eB)return {status:"teilweise",id:zeilenId,
      fehler:"Der Datensatz ist gespeichert, die Bilder konnten nicht verknüpft werden: "+eB.message};
   }catch(err){
    return {status:"teilweise",id:zeilenId,
      fehler:"Der Datensatz ist gespeichert, die Bilder konnten nicht hochgeladen werden: "+String(err&&err.message||err)};
   }
  }
 }
 return {status:"ok",id:zeilenId};
}

// Sendet die ganze Warteschlange der Reihe nach. Ein Eintrag, der scheitert,
// haelt die von ihm abhaengigen zurueck - sie wuerden sonst auf eine
// Projekt-ID zeigen, die es nicht gibt.
async function wsSynchronisieren(){
 if(wsLaeuft)return {laeuft:true};
 if(wsIstOffline())return {offline:true};
 let liste;
 try{ liste=await wsAlle() }catch(e){ return {fehler:String(e&&e.message||e)} }
 if(!liste.length)return {leer:true};
 wsLaeuft=true; wsIdKarte={};
 const bericht={gesendet:0,konflikt:0,fehler:0,wartet:0,teilweise:0};
 try{
  for(const e of liste){
   if(e.konflikt&&!e.konfliktEntschieden){bericht.konflikt++;continue}
   let r;
   try{ r=await wsSendeEinen(e) }
   catch(err){ r={status:"fehler",fehler:String(err&&err.message||err)} }
   if(r.status==="ok"){ await wsWeg(e.id); bericht.gesendet++; }
   else if(r.status==="teilweise"){
    // Die Zeile steht - der Eintrag darf NICHT noch einmal gesendet werden,
    // sonst entstuende sie doppelt. Er wird entfernt und der Fehler gemeldet.
    await wsWeg(e.id); bericht.teilweise++;
    bericht.hinweis=(bericht.hinweis||[]).concat(r.fehler);
   }
   else if(r.status==="konflikt"){
    e.konflikt={serverStand:r.serverStand,text:r.text||null,erkannt:new Date().toISOString()};
    await wsLegen(e); bericht.konflikt++;
   }
   else if(r.status==="wartet"){ bericht.wartet++; }
   else {
    e.versuche=(e.versuche||0)+1; e.fehler=r.fehler||"unbekannter Fehler";
    await wsLegen(e); bericht.fehler++;
   }
  }
 }finally{ wsLaeuft=false; }
 wsAnzeigeAuffrischen();
 // Nach erfolgreichem Senden die Stammdaten neu laden, damit die frisch
 // angelegten Projekte und Massaufnahmen sichtbar werden.
 if(bericht.gesendet&&typeof loadAllData==="function"){
  try{ await loadAllData() }catch(e){}
 }
 // v3.23: Uebertragene Haken sind jetzt echte Zeilen - der Zwischenspeicher
 // in js/56 haelt sie noch als "wartet". Er wird geleert und neu geholt,
 // damit die Anzeige nicht faelschlich "wartet noch" behauptet.
 if(bericht.gesendet&&typeof zeNachUebertragung==="function"){
  try{ await zeNachUebertragung() }catch(e){}
 }
 // v3.06: Beim Senden kann eine Freigabe verfallen sein (der Trigger prueft
 // erst jetzt) - die Aufgabenzentrale muss das mitbekommen.
 if(bericht.gesendet&&typeof aufgabenNeuLaden==="function"){
  try{ await aufgabenNeuLaden() }catch(e){}
 }
 return bericht;
}

// ---- Anzeige --------------------------------------------------------------
async function wsAnzeigeAuffrischen(){
 const knopf=typeof $==="function"?$("wsKnopf"):null;
 if(!knopf)return;
 let liste=[];
 try{ liste=await wsAlle() }catch(e){ liste=[] }
 const konflikte=liste.filter(e=>e.konflikt&&!e.konfliktEntschieden).length;
 const fehler=liste.filter(e=>e.fehler&&!e.konflikt).length;
 knopf.hidden=liste.length===0;
 knopf.textContent=liste.length
  ? `📤 ${liste.length} ${liste.length===1?"Eintrag wartet":"Einträge warten"} auf die Übertragung`
    +(konflikte?` · ${konflikte} Konflikt${konflikte===1?"":"e"}`:"")
    +(fehler?` · ${fehler} Fehler`:"")
  : "";
 knopf.classList.toggle("rot",konflikte>0||fehler>0);
 if(typeof wsListeZeichnen==="function"&&$("wsModal")&&!$("wsModal").hidden)wsListeZeichnen();
}

function wsZeitText(iso){
 const d=new Date(iso);
 if(isNaN(d.getTime()))return "";
 return d.toLocaleString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",
   hour:"2-digit",minute:"2-digit"});
}

async function wsListeZeichnen(){
 const box=$("wsListe"); if(!box)return;
 let liste=[];
 try{ liste=await wsAlle() }catch(e){
  box.innerHTML=`<div class="empty">Die Warteschlange lässt sich auf diesem Gerät nicht lesen: ${esc(String(e&&e.message||e))}</div>`;
  return;
 }
 if(!liste.length){
  box.innerHTML='<div class="empty">Nichts wartet auf die Übertragung – alles ist gespeichert.</div>';
  return;
 }
 box.innerHTML=liste.map(e=>{
  const konf=e.konflikt&&!e.konfliktEntschieden;
  return `<div class="ws-eintrag${konf?" ws-konflikt":(e.fehler?" ws-fehler":"")}">
<div class="ws-kopf"><b>${esc(wsName(e.tabelle))}${e.art==="update"?" (Änderung)":""}</b>
<span class="ws-zeit">${esc(wsZeitText(e.erstellt))}</span></div>
<div class="ws-titel">${esc(e.titel||"ohne Bezeichnung")}</div>
${konf?`<div class="ws-meldung">${esc(e.konflikt.text
  ||"Jemand anderes hat diesen Datensatz zwischenzeitlich geändert.")}
Es wurde nichts überschrieben. Bitte entscheiden:</div>
<div class="ws-knoepfe"><button class="blue" data-ws-nehmen="${esc(e.id)}">Meine Fassung nehmen</button>
<button class="red" data-ws-weg="${esc(e.id)}">Meine Fassung verwerfen</button></div>`
  :(e.fehler?`<div class="ws-meldung">Nicht übertragen: ${esc(e.fehler)}${
     e.versuche>1?` (${e.versuche} Versuche)`:""}</div>
<div class="ws-knoepfe"><button class="red" data-ws-weg="${esc(e.id)}">Eintrag verwerfen</button></div>`:"")}
</div>`;
 }).join("");
}

// ---- Verdrahtung ----------------------------------------------------------
if(typeof document!=="undefined"){
 document.addEventListener("click",async e=>{
  const t=e.target;
  if(!t||!t.closest)return;
  if(t.closest("#wsKnopf")){ $("wsModal").hidden=false; await wsListeZeichnen(); return }
  if(t.closest("#wsSchliessen")){ $("wsModal").hidden=true; return }
  if(t.closest("#wsJetztSenden")){
   const k=$("wsJetztSenden"); k.disabled=true;
   const alt=k.textContent; k.textContent="Wird übertragen …";
   const b=await wsSynchronisieren();
   k.disabled=false; k.textContent=alt;
   await wsListeZeichnen();
   const m=$("wsMeldung");
   if(m){
    if(b.offline)m.textContent="Keine Verbindung – es wurde nichts übertragen.";
    else if(b.leer)m.textContent="Nichts zu übertragen.";
    else if(b.fehler&&typeof b.fehler==="string")m.textContent="Die Warteschlange lässt sich nicht lesen: "+b.fehler;
    else m.textContent=[`${b.gesendet||0} übertragen`,
      b.teilweise?`${b.teilweise} teilweise (siehe Meldung)`:"",
      b.konflikt?`${b.konflikt} Konflikt${b.konflikt===1?"":"e"}`:"",
      b.fehler?`${b.fehler} Fehler`:"",
      b.wartet?`${b.wartet} wartet auf einen anderen Eintrag`:""].filter(Boolean).join(" · ")
      +(b.hinweis?"\n"+b.hinweis.join("\n"):"");
   }
   return;
  }
  const nehmen=t.closest("[data-ws-nehmen]");
  if(nehmen){
   const id=nehmen.dataset.wsNehmen;
   const liste=await wsAlle();
   const eintrag=liste.find(x=>x.id===id);
   if(eintrag){ eintrag.konfliktEntschieden=true; await wsLegen(eintrag) }
   await wsSynchronisieren(); await wsListeZeichnen();
   return;
  }
  const weg=t.closest("[data-ws-weg]");
  if(weg){
   if(!confirm("Diesen wartenden Eintrag endgültig verwerfen? Die erfassten Werte gehen dabei verloren."))return;
   await wsWeg(weg.dataset.wsWeg);
   await wsListeZeichnen(); wsAnzeigeAuffrischen();
   return;
  }
 });
}
if(typeof window!=="undefined"){
 // Sobald wieder Verbindung besteht, von selbst uebertragen.
 window.addEventListener("online",()=>{ setTimeout(()=>wsSynchronisieren(),1200) });
}
