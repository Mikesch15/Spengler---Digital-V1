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
