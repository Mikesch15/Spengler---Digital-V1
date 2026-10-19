"use strict";
// ===========================================================================
// v3.394: Einstellungen der Massaufnahme-Arten gelten FIRMENWEIT.
//
// Bisher lagen sie nur im localStorage des Geraets. Folge: Handy und Buero
// rechneten mit verschiedenen Umschlaegen/Zugaben, und dieselbe Massaufnahme
// ergab je Geraet einen anderen Zuschnitt (Einfassung Seilsicherungsstuetze:
// 530 mm gespeichert, 535 mm auf dem Handy).
//
// Jetzt: app_settings.massaufnahme_einstellungen (jsonb) = { <localStorage-
// Schluessel>: {Einstellungen} }. Beim Laden gilt der Firmenwert und ersetzt
// den lokalen (der lokale Wert bleibt als Zwischenspeicher fuers Offline-
// Arbeiten). Beim Speichern schreibt nur ein Administrator (RLS) - alle
// anderen behalten ihren Wert nur lokal, und die Meldung sagt das.
// Nur der geaenderte Schluessel wird geschrieben, nie alle Geraetewerte auf einmal.
// ===========================================================================
const EFIRMA_LISTE=[
 {key:"sd_einlaufblechSettings",laden:()=>{einlaufblechSettings={...EINLAUFBLECH_STANDARD,...efLokal("sd_einlaufblechSettings")}}},
 {key:"sd_einlaufblechKonischSettings",laden:()=>{einlaufblechKonischSettings={...EINLAUFBLECH_STANDARD,...efLokal("sd_einlaufblechKonischSettings")}}},
 {key:"sd_kehleSettings",laden:()=>{kehleSettings={...KEHLE_STANDARD,...efLokal("sd_kehleSettings")}}},
 {key:"sd_anschlussblechSettings",laden:()=>{anschlussblechSettings=anbEinstellungenLaden()}},
 {key:"sd_einfassungRundSettings",laden:()=>{einfassungSettings=einfEinstellungenLaden()}},
 {key:"sd_rinneProfilSettings",laden:()=>{rinneProfilSettings=rinneProfilEinstellungenLaden()}},
 {key:"sd_kaminSettings",laden:()=>{kaminSettings=kamEinstellungenLaden()}},
 {key:"sd_dfaSettings",laden:()=>{dfaSettings=dfaEinstellungenLaden()}}
];
let efFirma={};
function efLokal(key){
 try{const w=JSON.parse(localStorage.getItem(key)||"null");return (w&&typeof w==="object")?w:{}}catch(e){return {}}
}
// Beim Laden der Firmeneinstellungen (js/05). Fehlt ein Schluessel, bleibt der lokale Wert unangetastet.
function efUebernehmen(obj){
 efFirma=(obj&&typeof obj==="object"&&!Array.isArray(obj))?obj:{};
 EFIRMA_LISTE.forEach(e=>{
  const w=efFirma[e.key];
  if(!w||typeof w!=="object"||Array.isArray(w))return;
  try{localStorage.setItem(e.key,JSON.stringify(w))}catch(x){}
  try{e.laden()}catch(x){}
 });
}
// Schreibt den aktuellen lokalen Wert EINES Schluessels in die Firmeneinstellungen.
async function efFirmaSichern(key){
 if(!EFIRMA_LISTE.some(e=>e.key===key))return {fehler:"Unbekannte Einstellung."};
 if(typeof appSettingsId==="undefined"||appSettingsId==null)return {fehler:"Die Firmeneinstellungen wurden nicht geladen."};
 try{
  const {data,error}=await sb.from("app_settings").select("massaufnahme_einstellungen").eq("id",appSettingsId).maybeSingle();
  if(error)return {fehler:error.message};
  const alt=(data&&data.massaufnahme_einstellungen&&typeof data.massaufnahme_einstellungen==="object")?data.massaufnahme_einstellungen:{};
  const neu={...alt,[key]:efLokal(key)};
  const r=await speichereAppSettings({massaufnahme_einstellungen:neu});
  if(!r.fehler)efFirma=neu;
  return r;
 }catch(e){return {fehler:String(e&&e.message||e)}}
}
// Text der Rueckmeldung - ehrlich, ob es die Firma oder nur dieses Geraet betrifft.
function efMeldeText(text,r){
 const t=text||"Gespeichert";
 return r&&r.fehler
  ? t+" – aber nur auf diesem Gerät. Für die Firma konnte es nicht gespeichert werden: "+r.fehler
  : t+" – gilt für die ganze Firma.";
}
async function efMelden(key,text,zusatz){
 const r=await efFirmaSichern(key);
 appAlert(efMeldeText(text,r)+(zusatz?"\n\n"+zusatz:""));
 return r;
}
