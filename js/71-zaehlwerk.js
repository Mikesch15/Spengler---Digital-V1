"use strict";
// ===========================================================================
// Das Zaehlwerk  (v3.168)
// ===========================================================================
// Die App merkt sich, was die Firma tatsaechlich benutzt, und stellt es nach
// vorne. Angefangen bei der Materialsuche: der Katalog hat mehrere hundert
// Positionen, die Suche zeigt fuenfzehn davon - bisher in Katalogreihenfolge.
// Welche fuenfzehn das waren, hatte mit dem Betrieb nichts zu tun.
//
// DREI DINGE HEISSEN "LERNEN", DAS HIER IST DAS MITTLERE
//   Merken  - der zuletzt benutzte Wert. Gibt es an einigen Stellen schon.
//   ZAEHLEN - Haeufigkeit in der EIGENEN Firmengeschichte. Das hier.
//   Raten   - ein Modell sagt etwas voraus. Ausdruecklich NICHT gebaut:
//             teuer, nicht nachpruefbar, und beim Blech auf eine Art falsch,
//             die niemand auf der Baustelle bemerken wuerde.
// Zaehlen ist nachvollziehbar ("3x benutzt"), kostet nichts pro Abfrage und
// funktioniert offline.
//
// VIER REGELN, DIE DAS UNGEFAEHRLICH MACHEN
//  1. NIE VERSTECKEN, NUR SORTIEREN. Eine Position, die "wir nie brauchen",
//     ist genau die, die beim fuenften Auftrag fehlt. Es verschwindet nichts,
//     es wandert nur nach oben. Die Obergrenze von fuenfzehn Vorschlaegen ist
//     die bestehende und wird NICHT verschaerft - nur die Reihenfolge
//     innerhalb davon aendert sich.
//  2. IMMER DIE ZAHL DAZU. "Richtwert 500" ist eine Behauptung, "8x so
//     benutzt" kann man nachsehen. Deshalb steht die Zahl am Vorschlag -
//     ein falscher Vorschlag ist dann sichtbar falsch.
//  3. NIE EINE ZAHL SELBST SETZEN. Masse, Mengen und Preise bleiben
//     unberuehrt. Das Zaehlwerk ordnet an, es entscheidet nicht.
//  4. JE FIRMA. Die Sicht material_nutzung laeuft mit security_invoker,
//     die bestehende RLS grenzt also unveraendert ein.
//
// EHRLICH ZUM UMFANG
// Am Tag der Einfuehrung hat der Betrieb wenige Rapporte und Massaufnahmen.
// Das Zaehlwerk ist dann fast still - es sortiert nur die paar Positionen
// nach vorne, die schon vorkamen, und schweigt zum Rest. Das ist richtig so:
// es faengt an zu helfen, sobald es etwas weiss, und behauptet vorher nichts.
//
// KEINE ZWEITE WAHRHEIT
// Gezaehlt wird nicht nebenbei mitgeschrieben, sondern aus den vorhandenen
// Daten gerechnet (Sicht material_nutzung). Ein eigener Zaehler muesste bei
// jedem Speichern, Aendern und Loeschen nachgefuehrt werden und waere nach
// dem ersten vergessenen Fall dauerhaft falsch.
// ===========================================================================

// Die Zaehlung, wie sie beim Anmelden geladen wurde: [{edv_nr,anzahl,zuletzt}]
let materialNutzung=[];

// Schneller Zugriff je EDV-Nr. Wird einmal je Ladevorgang gebaut - die
// Materialsuche laeuft bei jedem Tastenanschlag, eine lineare Suche ueber
// hunderte Eintraege waere dort spuerbar.
let zwMaterialKarte=Object.create(null);

// EDV-Nummern werden ohne Rand-Leerzeichen und ohne Gross-/Kleinschreibung
// verglichen - dieselbe Ueberlegung wie bei der Auftrags-Nr. (js/01).
function zwSchluessel(wert){
 return String(wert==null?"":wert).trim().toLowerCase();
}

// Aus der geladenen Liste die Karte bauen. Defensiv: eine kaputte oder
// fehlende Zeile darf die Materialsuche nicht lahmlegen.
function zwMaterialUebernehmen(zeilen){
 materialNutzung=Array.isArray(zeilen)?zeilen:[];
 zwMaterialKarte=Object.create(null);
 materialNutzung.forEach(z=>{
  const k=zwSchluessel(z&&z.edv_nr);
  if(!k)return;
  const n=Number(z&&z.anzahl)||0;
  if(n<=0)return;
  // Kommt dieselbe Nummer mehrfach (zwei Firmen in einer Antwort waere nur
  // moeglich, wenn die RLS umgangen wuerde): addieren statt ueberschreiben.
  zwMaterialKarte[k]={anzahl:(zwMaterialKarte[k]?zwMaterialKarte[k].anzahl:0)+n,
                      zuletzt:(zwMaterialKarte[k]&&zwMaterialKarte[k].zuletzt>z.zuletzt)
                               ?zwMaterialKarte[k].zuletzt:(z&&z.zuletzt)||""};
 });
}

// Wie oft hat diese Firma diese Position benutzt? 0, wenn noch nie oder
// wenn das Zaehlwerk nicht geladen werden konnte.
function zwMaterialAnzahl(edvNr){
 const e=zwMaterialKarte[zwSchluessel(edvNr)];
 return e?e.anzahl:0;
}
// Wann zuletzt? Leerer Text, wenn unbekannt - es wird kein Datum erfunden.
function zwMaterialZuletzt(edvNr){
 const e=zwMaterialKarte[zwSchluessel(edvNr)];
 return (e&&e.zuletzt)||"";
}

// Der Hinweis am Vorschlag. Leer, solange es nichts zu sagen gibt - eine
// Zeile "0x benutzt" waere eine Aussage ueber nichts.
function zwMaterialText(edvNr){
 const n=zwMaterialAnzahl(edvNr);
 return n>0?(n+"× benutzt"):"";
}

// Eine Liste von Katalogzeilen nach eigener Benutzung ordnen.
//
// nummerVon: wie aus einer Zeile ihre EDV-Nr. wird. Die Materialliste ist
// ein Array ([edv_nr,name,dim,einheit,preis]), andere Listen koennten
// Objekte sein - deshalb wird das Herausholen uebergeben statt geraten.
//
// Sortiert wird STABIL (Array.prototype.sort ist das seit ES2019): bei
// gleicher Benutzung bleibt die bisherige Reihenfolge - also die
// Katalogreihenfolge - unveraendert erhalten. Ohne diese Zusicherung wuerde
// sich die Trefferliste bei gleichwertigen Positionen scheinbar zufaellig
// umsortieren, und niemand koennte sich mehr merken, wo etwas steht.
//
// Die Liste wird KOPIERT, nicht an Ort und Stelle umgestellt: settings.materials
// ist der Katalog selbst, und der behaelt seine Ordnung.
function zwNachNutzung(liste,nummerVon){
 if(!Array.isArray(liste))return [];
 const nr=(typeof nummerVon==="function")?nummerVon:(x=>x&&x[0]);
 return liste.slice().sort((a,b)=>zwMaterialAnzahl(nr(b))-zwMaterialAnzahl(nr(a)));
}

// ---- Laden ----------------------------------------------------------------
// Wird aus loadAllData() (js/05) mitgeladen und wandert mit in den
// Offline-Zwischenspeicher. Schlaegt es fehl, bleibt die Zaehlung leer und
// alles verhaelt sich exakt wie vor v3.168 - das Zaehlwerk ist eine
// Verbesserung der Reihenfolge, keine Voraussetzung fuer irgendetwas.
async function zaehlwerkLaden(){
 try{
  const {data,error}=await sb.from("material_nutzung").select("edv_nr,anzahl,zuletzt");
  if(error)return null;
  return data||[];
 }catch(e){ return null }
}

// ===========================================================================
// Zaehlwerk, zweiter Teil  (v3.169)
// ===========================================================================
// Dieselben vier Regeln wie oben. Zwei weitere Fragen, die der Betrieb sich
// sonst jedes Mal neu beantworten muss:
//
//   "Was brauchen wir ueblicherweise NACH einer Kamineinfassung?"
//   "Welche Positionen aus der Offerte kommen bei uns nie zum Tragen?"
// ===========================================================================

// ---- Material je Massaufnahme-Art -----------------------------------------
// Getrennt von der Gesamtzaehlung, weil es eine ANDERE Frage ist: was der
// Betrieb ueberhaupt benutzt, und was zu genau dieser Arbeit gehoert, sind
// zwei verschiedene Dinge. material_nutzung bleibt der Rueckfall, wenn zu
// einer Art noch nichts bekannt ist.
let materialNutzungArt=[];
let zwArtKarte=Object.create(null);   // "art\u0000edv_nr" -> anzahl

function zwArtSchluessel(art,edvNr){
 return zwSchluessel(art)+"\u0000"+zwSchluessel(edvNr);
}
function zwMaterialArtUebernehmen(zeilen){
 materialNutzungArt=Array.isArray(zeilen)?zeilen:[];
 zwArtKarte=Object.create(null);
 materialNutzungArt.forEach(z=>{
  const art=zwSchluessel(z&&z.art), nr=zwSchluessel(z&&z.edv_nr);
  if(!art||!nr)return;
  const n=Number(z&&z.anzahl)||0;
  if(n<=0)return;
  const k=zwArtSchluessel(art,nr);
  zwArtKarte[k]=(zwArtKarte[k]||0)+n;
 });
}
// Wie oft wurde diese Position an DIESER Art Massaufnahme erfasst?
function zwMaterialAnzahlArt(art,edvNr){
 if(!art)return 0;
 return zwArtKarte[zwArtSchluessel(art,edvNr)]||0;
}

// Ordnen mit der Art als erstem Massstab, der Gesamtzaehlung als zweitem.
//
// Warum zweistufig: waere nur die Art massgeblich, wuerde eine Position,
// die der Betrieb staendig benutzt, hinter eine rutschen, die genau einmal
// zufaellig an dieser Art vorkam. Und waere nur die Gesamtzahl massgeblich,
// braeuchte es diese Funktion gar nicht. Die dritte Stufe ist wie ueberall
// die Katalogreihenfolge - die bleibt durch die stabile Sortierung erhalten.
function zwNachNutzungArt(liste,nummerVon,art){
 if(!Array.isArray(liste))return [];
 if(!art)return zwNachNutzung(liste,nummerVon);
 const nr=(typeof nummerVon==="function")?nummerVon:(x=>x&&x[0]);
 return liste.slice().sort((a,b)=>{
  const d=zwMaterialAnzahlArt(art,nr(b))-zwMaterialAnzahlArt(art,nr(a));
  if(d!==0)return d;
  return zwMaterialAnzahl(nr(b))-zwMaterialAnzahl(nr(a));
 });
}
// Der Hinweis dazu. Er nennt die Art mit, sonst waere nicht klar, WORAUF
// sich "4x benutzt" bezieht - auf den ganzen Betrieb oder auf diese Arbeit.
function zwMaterialTextArt(art,edvNr){
 const n=zwMaterialAnzahlArt(art,edvNr);
 if(n>0)return n+"× bei dieser Art";
 return zwMaterialText(edvNr);
}

// ---- Ausmass: welche Positionen werden gebraucht? -------------------------
// Gezaehlt wird je Positionstext: wie oft er vorkam und wie oft er dabei
// eine Menge bekam. Daraus wird ein HINWEIS - die Position bleibt sichtbar
// und bedienbar. Genau hier waere Ausblenden am verlockendsten und am
// gefaehrlichsten: die Position, die "wir nie brauchen", ist die, die beim
// fuenften Auftrag fehlt.
let ausmassPositionNutzung=[];
let zwAusmassKarte=Object.create(null);

// Ab wann darf die App ueberhaupt etwas sagen?
//
// Hier ist - anders als beim Sortieren - eine SCHWELLE noetig, denn dies
// ist eine Behauptung ueber ein Muster, keine blosse Reihenfolge. Aus einem
// einzigen Ausmass "wird nie gebraucht" zu folgern, waere geraten.
// Verlangt werden mindestens drei Vorkommen, und die Position darf in
// hoechstens einem Drittel davon eine Menge bekommen haben.
const ZW_AUSMASS_MINDESTENS=3;

function zwAusmassUebernehmen(zeilen){
 ausmassPositionNutzung=Array.isArray(zeilen)?zeilen:[];
 zwAusmassKarte=Object.create(null);
 ausmassPositionNutzung.forEach(z=>{
  const k=zwSchluessel(z&&z.text);
  if(!k)return;
  const vor=Number(z&&z.vorgekommen)||0;
  const geb=Number(z&&z.gebraucht)||0;
  if(vor<=0)return;
  const alt=zwAusmassKarte[k];
  zwAusmassKarte[k]={vorgekommen:(alt?alt.vorgekommen:0)+vor,
                     gebraucht:(alt?alt.gebraucht:0)+geb};
 });
}
function zwAusmassZahlen(text){
 return zwAusmassKarte[zwSchluessel(text)]||null;
}
// Leerer Text, solange nichts Belastbares dasteht. Es wird lieber nichts
// gesagt als etwas Ungedecktes.
function zwAusmassHinweis(text){
 const z=zwAusmassZahlen(text);
 if(!z||z.vorgekommen<ZW_AUSMASS_MINDESTENS)return "";
 if(z.gebraucht*3>z.vorgekommen)return "";
 return "in "+(z.vorgekommen-z.gebraucht)+" von "+z.vorgekommen
   +" Ausmassen nicht gebraucht";
}

// ---- Laden ----------------------------------------------------------------
// Wie zaehlwerkLaden(): faengt seine Fehler selbst ab und liefert dann null.
async function zaehlwerkArtLaden(){
 try{
  const {data,error}=await sb.from("material_nutzung_art").select("art,edv_nr,anzahl");
  if(error)return null;
  return data||[];
 }catch(e){ return null }
}
async function zaehlwerkAusmassLaden(){
 try{
  const {data,error}=await sb.from("ausmass_position_nutzung")
    .select("text,vorgekommen,gebraucht");
  if(error)return null;
  return data||[];
 }catch(e){ return null }
}
