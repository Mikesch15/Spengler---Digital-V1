// ===========================================================================
// v3.366  Nachkalkulation: Abacus-Stundenrapporte lesen (PDF, Excel, CSV)
// ---------------------------------------------------------------------------
// REINE Funktionen ohne Datenbank und ohne Oberfläche - die Oberfläche steht
// in js/88-nachkalkulation.js. Hier wird nur gelesen, geprüft und verglichen.
//
// GRUNDSÄTZE (Auftrag "Nachkalkulation aus Abacus"):
//  - Keine Werte erfinden. Was nicht eindeutig lesbar ist, bleibt leer und wird
//    markiert; es wird nie stillschweigend interpretiert.
//  - Kein festes Layout: Kopfzeile und Spalten werden über Synonyme erkannt, die
//    Zuordnung ist von Hand änderbar.
//  - Kein OCR, keine externen Dienste: PDF-Text wird im Browser mit der
//    mitgelieferten pdf.js (vendor/) gelesen. Ein Scan ohne Text wird abgelehnt.
//  - Dateiinhalt wird nie als HTML eingefügt (Oberfläche escaped alles).
// ===========================================================================

const AB_MAX_DATEI_BYTES={pdf:15*1024*1024,xlsx:10*1024*1024,csv:5*1024*1024};
const AB_MAX_ZEILEN=5000;
const AB_RUNDUNG_PRO_BUCHUNG=0.05;   // Stunden - bis hierhin kann eine Abweichung reine Rundung sein
const AB_TOLERANZ=0.01;              // Stunden - darunter gilt als gleich

// ---- Hilfen ---------------------------------------------------------------
function abRund2(n){return Math.round((Number(n)+Number.EPSILON)*100)/100}
function abTrim(v){return v===null||v===undefined?"":String(v).replace(/ /g," ").replace(/\s+/g," ").trim()}
function abNorm(v){
 return abTrim(v).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ß/g,"ss");
}
function abNameSchluessel(v){
 const t=abNorm(v).replace(/[^a-z\s]/g," ").split(/\s+/).filter(Boolean);
 return t.sort().join(" ");
}
function abNr(v){
 return abTrim(v).replace(/^(auftrag|projekt|proj\.?|auftr\.?)\s*(nr\.?|nummer)?\s*[:\-]?\s*/i,"").replace(/\s+/g,"").toUpperCase();
}

// ---- Zeit -----------------------------------------------------------------
// Ergebnis: {wert, art} | {wert:null, leer:true} | {wert:null, unklar:"Grund"}
function abZeit(roh){
 if(roh===null||roh===undefined||roh==="")return {wert:null,leer:true};
 if(typeof roh==="number")return isFinite(roh)?{wert:abRund2(roh),art:"dezimal"}:{wert:null,unklar:"Keine Zahl"};
 let s=abTrim(roh);
 if(!s)return {wert:null,leer:true};
 s=s.replace(/\s*(stunden|std\.?|h)$/i,"").trim();
 let m=s.match(/^(-?)(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
 if(m){
  const min=Number(m[3]);
  if(min>59)return {wert:null,unklar:"Minuten über 59 in „"+abTrim(roh)+"“"};
  const w=Number(m[2])+min/60+(m[4]?Number(m[4])/3600:0);
  return {wert:abRund2(m[1]?-w:w),art:"hm"};
 }
 m=s.match(/^(-?)(\d{1,3})\s*(?:h|std\.?)\s*(\d{1,2})\s*(?:min\.?|m)?$/i);
 if(m){
  const min=Number(m[3]);
  if(min>59)return {wert:null,unklar:"Minuten über 59 in „"+abTrim(roh)+"“"};
  const w=Number(m[2])+min/60;
  return {wert:abRund2(m[1]?-w:w),art:"hm"};
 }
 s=s.replace(/[’']/g,"");
 if(/^-?\d+$/.test(s))return {wert:Number(s),art:"dezimal"};
 if(/^-?\d+[.,]\d{1,2}$/.test(s))return {wert:abRund2(Number(s.replace(",","."))),art:"dezimal"};
 if(/^-?\d+[.,]\d{3}$/.test(s))return {wert:null,unklar:"„"+abTrim(roh)+"“ kann Tausender oder drei Dezimalstellen sein"};
 if(/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s))return {wert:abRund2(Number(s.replace(/\./g,"").replace(",","."))),art:"dezimal"};
 if(/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s))return {wert:abRund2(Number(s.replace(/,/g,""))),art:"dezimal"};
 if(/^-?\d+[.,]\d{4,}$/.test(s))return {wert:abRund2(Number(s.replace(",","."))),art:"dezimal",gerundet:true};
 return {wert:null,unklar:"Zeitangabe „"+abTrim(roh)+"“ nicht lesbar"};
}

// ---- Datum ----------------------------------------------------------------
// Ergebnis: {iso} | {iso:null, leer:true} | {iso:null, unklar:"Grund"}
function abDatum(roh){
 if(roh===null||roh===undefined||roh==="")return {iso:null,leer:true};
 const pad=n=>String(n).padStart(2,"0");
 const gueltig=(y,mo,d)=>{
  if(y<1990||y>2100||mo<1||mo>12||d<1||d>31)return null;
  const dt=new Date(Date.UTC(y,mo-1,d));
  return (dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d)?y+"-"+pad(mo)+"-"+pad(d):null;
 };
 if(roh instanceof Date&&!isNaN(roh)){
  // SheetJS liefert Excel-Daten teils um Sekunden vor Mitternacht (Zeitzonen-Rundung) - das gehoert zum naechsten Tag.
  const t=(roh.getHours()===23&&roh.getMinutes()>=50)?new Date(roh.getTime()+15*60000):roh;
  return {iso:t.getFullYear()+"-"+pad(t.getMonth()+1)+"-"+pad(t.getDate())};
 }
 if(typeof roh==="number"){
  // Excel-Seriennummer (1900-System)
  if(roh>=32000&&roh<=80000){
   const dt=new Date(Date.UTC(1899,11,30)+Math.floor(roh)*86400000);
   return {iso:dt.getUTCFullYear()+"-"+pad(dt.getUTCMonth()+1)+"-"+pad(dt.getUTCDate())};
  }
  return {iso:null,unklar:"Zahl "+roh+" ist kein Datum"};
 }
 const s=abTrim(roh);
 if(!s)return {iso:null,leer:true};
 let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
 if(m){const r=gueltig(+m[1],+m[2],+m[3]);return r?{iso:r}:{iso:null,unklar:"Datum „"+s+"“ ungültig"}}
 m=s.match(/^(?:[A-Za-zÄÖÜäöü]{2,3}\.?,?\s*)?(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})$/);
 if(m){
  let y=+m[3];if(y<100)y+=2000;
  const r=gueltig(y,+m[2],+m[1]);return r?{iso:r}:{iso:null,unklar:"Datum „"+s+"“ ungültig"};
 }
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
 if(m){
  let y=+m[3];if(y<100)y+=2000;
  if(+m[1]>12){const r=gueltig(y,+m[2],+m[1]);return r?{iso:r}:{iso:null,unklar:"Datum „"+s+"“ ungültig"}}
  return {iso:null,unklar:"Datum „"+s+"“ mit Schrägstrich: Tag/Monat nicht eindeutig"};
 }
 return {iso:null,unklar:"Datum „"+s+"“ nicht lesbar"};
}

// ---- Kopfzeile und Spalten ------------------------------------------------
const AB_SPALTEN=[
 {k:"datum",       name:"Datum",                 syn:["datum","date","tag","arbeitsdatum","leistungsdatum","buchungsdatum"]},
 {k:"auftrag_nr",  name:"Auftrags-/Projektnummer",syn:["auftrag","auftragsnr","auftragsnummer","auftrags-nr","projekt","projektnr","projektnummer","proj-nr","projnr","kommission","auftr","auftr-nr","pnr","proj","prj"]},
 {k:"mitarbeiter", name:"Mitarbeiter",           syn:["mitarbeiter","ma","mitarb","personal","pers","name","kuerzel","kurzzeichen","arbeitnehmer","erfasser","leistungserbringer","person"]},
 {k:"taetigkeit",  name:"Tätigkeit",             syn:["taetigkeit","leistung","beschreibung","text","arbeit","arbeitsart","bezeichnung","bemerkung","lohnart","leistungsart","tatigkeit"]},
 {k:"stunden",     name:"Stunden",               syn:["stunden","std","h","zeit","dauer","iststunden","ist-stunden","arbeitszeit","stundenzahl","menge","anzahl","stdn"]},
 {k:"kostenstelle",name:"Kostenstelle",          syn:["kostenstelle","kst","ks","kstn","kostentraeger"]},
 {k:"rapport_ref", name:"Rapport-/Buchungsnummer",syn:["rapport","rapportnr","rapportnummer","rapport-nr","beleg","belegnr","belegnummer","buchung","buchungsnr","buchungsnummer","journal","id","lfd","lfdnr","nr"]}
];
function abKopfKey(zelle){
 const t=abNorm(zelle).replace(/[.\s:_/]+/g,"").replace(/\(.*?\)/g,"");
 if(!t)return null;
 // Beträge und Sätze sind keine Stunden (Stundensatz, Ansatz, Preis, Betrag, Kosten)
 if(/satz|preis|betrag|kosten(?!stelle|traeger)|lohn(?!art)|fr$|chf/.test(t))return null;
 for(const sp of AB_SPALTEN){
  if(sp.syn.some(s=>s.replace(/[.\s:_/-]+/g,"")===t||(t.length>3&&t.startsWith(s.replace(/[.\s:_/-]+/g,""))&&s.length>3)))return sp.k;
 }
 return null;
}
// Sucht in den ersten Zeilen die Kopfzeile: mindestens zwei erkannte Spalten, darunter Stunden.
function abKopfSuchen(zeilen){
 const grenze=Math.min(zeilen.length,40);
 for(let i=0;i<grenze;i++){
  const map={};let treffer=0;
  (zeilen[i]||[]).forEach((c,ci)=>{const k=abKopfKey(c);if(k&&map[k]===undefined){map[k]=ci;treffer++}});
  if(treffer>=2&&map.stunden!==undefined)return {zeile:i,zuordnung:map};
 }
 return null;
}

// ---- Tabelle -> Buchungszeilen ---------------------------------------------
const AB_SUMME=/^(summe|total|gesamt|gesamtsumme|zwischentotal|zwischensumme|subtotal|übertrag|uebertrag|saldo|stunden total|total stunden)\b/i;

// zeilen: Array von Zeilen (Array von Zellen). zuordnung: {feld:spaltenIndex}. Gibt die rohen Buchungszeilen zurück.
function abZeilenAusTabelle(zeilen,zuordnung,startZeile,dok){
 const out=[];
 let laufSumme=0,davor=[];
 for(let i=startZeile;i<zeilen.length&&out.length<AB_MAX_ZEILEN;i++){
  const r=zeilen[i]||[];
  const zell=k=>zuordnung[k]===undefined?"":r[zuordnung[k]];
  if(r.every(c=>abTrim(c)===""))continue;
  const roh={
   quelle:"Zeile "+(i+1)+(dok.blatt?" ("+dok.blatt+")":""),
   rapport_ref:abTrim(zell("rapport_ref")),
   auftrag_nr:abNr(zell("auftrag_nr")),
   datum_roh:zell("datum"),
   mitarbeiter:abTrim(zell("mitarbeiter")),
   taetigkeit:abTrim(zell("taetigkeit")),
   zeit_roh:zell("stunden"),
   kostenstelle:abTrim(zell("kostenstelle"))
  };
  roh.alleText=r.map(abTrim).join(" ").trim();
  const z=abZeit(roh.zeit_roh),d=abDatum(roh.datum_roh);
  // Summenzeile: Schlüsselwort ohne Datum, oder Stunden = Summe der Zeilen davor (ohne Datum/Tätigkeit)
  const wort=AB_SUMME.test(roh.alleText)||r.some(c=>AB_SUMME.test(abTrim(c)));
  const ohneDetail=!d.iso&&!roh.taetigkeit&&!roh.mitarbeiter;
  if(z.wert!==null&&wort&&!d.iso){roh.summe="Schlüsselwort „Summe/Total“";}
  else if(z.wert!==null&&ohneDetail&&davor.length>1&&Math.abs(z.wert-laufSumme)<=AB_TOLERANZ){roh.summe="entspricht der Summe der Zeilen darüber";}
  if(!roh.summe&&z.wert!==null&&d.iso){laufSumme=abRund2(laufSumme+z.wert);davor.push(z.wert)}
  else if(roh.summe){laufSumme=0;davor=[]}
  // Zeilen ohne jede Buchungsangabe (Überschriften, Zwischentitel) sind keine Buchung
  if(!roh.summe&&z.leer&&!d.iso&&!d.unklar&&!roh.mitarbeiter&&!roh.rapport_ref)continue;
  out.push(roh);
 }
 return out;
}

// Passt die Auftragsnummer der Zeile zum gewählten Projekt? (v3.367)
//  "falsch"        Zeile nennt eine Nummer, das Projekt hat eine andere -> NIE importierbar
//  "fehlt"         Zeile (und Dokumentkopf) nennen keine Nummer -> nur nach ausdrücklicher Projektbestätigung
//  "nicht_pruefbar" Zeile nennt eine Nummer, das Projekt hat keine -> unklar, nicht vorgewählt
//  "passt"         gleiche Nummer
//  "kein_projekt"  noch kein Projekt gewählt
function abAuftragPruefen(zeilenNr,projektNr){
 const z=abNr(zeilenNr),p=abNr(projektNr);
 if(projektNr===undefined||projektNr===null)return "kein_projekt";
 if(!z)return "fehlt";
 if(!p)return "nicht_pruefbar";
 return z===p?"passt":"falsch";
}
// Bewertet EINE Buchungszeile (auch nach manueller Korrektur in der Vorschau erneut aufrufbar).
function abZeileBewerten(roh,ctx){
 ctx=ctx||{};
 const z=abZeit(roh.zeit_roh),d=abDatum(roh.datum_roh);
 const z2={
  quelle:roh.quelle,rapport_ref:roh.rapport_ref||"",auftrag_nr:roh.auftrag_nr||"",
  datum_roh:roh.datum_roh,datum:d.iso||null,mitarbeiter:roh.mitarbeiter||"",taetigkeit:roh.taetigkeit||"",
  zeit_roh:roh.zeit_roh,stunden:z.wert,kostenstelle:roh.kostenstelle||"",summe:roh.summe||"",
  hinweise:[],fehler:[]
 };
 if(z2.summe){z2.status="summe";z2.hinweise.push("Summenzeile: "+z2.summe+" – wird nicht zusätzlich importiert");return z2}
 // v3.367: Auftrag prüfen, BEVOR irgendetwas anderes zählt. Die Nummer des Dokumentkopfes gilt nur für Zeilen ohne eigene Nummer
 // (und nur, wenn ctx.dokAuftrag gesetzt ist, d. h. das Dokument genau eine Nummer nennt) - nie von Zeile zu Zeile.
 z2.auftrag_eff=z2.auftrag_nr||abNr(ctx.dokAuftrag||"");
 z2.auftrag_quelle=z2.auftrag_nr?"zeile":(z2.auftrag_eff?"dokumentkopf":"");
 z2.auftragPruefung=abAuftragPruefen(z2.auftrag_eff,ctx.projektNr);
 if(z2.auftragPruefung==="falsch"){
  z2.status="falscher_auftrag";
  z2.hinweise.push("Falscher Auftrag: "+(z2.auftrag_quelle==="dokumentkopf"?"Das Dokument nennt ":"Die Zeile nennt ")+z2.auftrag_eff+", das gewählte Projekt hat "+abNr(ctx.projektNr)+" – wird nicht importiert");
  return z2;
 }
 if(z2.auftragPruefung==="fehlt"){z2.ohneAuftrag=true;z2.hinweise.push("Auftrag nicht in der Zeile vorhanden – nur mit ausdrücklich bestätigter Projektzuordnung")}
 else if(z2.auftragPruefung==="nicht_pruefbar")z2.hinweise.push("Auftrag "+z2.auftrag_eff+" nicht prüfbar: das Projekt hat keine Auftragsnummer");
 else if(z2.auftrag_quelle==="dokumentkopf")z2.hinweise.push("Auftrag "+z2.auftrag_eff+" aus dem Dokumentkopf");
 if(z.unklar)z2.fehler.push(z.unklar);
 else if(z.leer)z2.fehler.push("Stunden fehlen");
 if(z.gerundet)z2.hinweise.push("Stunden auf zwei Stellen gerundet");
 if(d.unklar)z2.fehler.push(d.unklar);
 else if(d.leer)z2.hinweise.push("Datum fehlt");
 if(z.wert!==null){
  if(z.wert<0)z2.hinweise.push("Negative Stunden (Korrekturbuchung?)");
  if(z.wert===0)z2.hinweise.push("0 Stunden");
  if(z.wert>16)z2.hinweise.push("Mehr als 16 Stunden in einer Buchung – bitte prüfen");
 }
 if(!z2.mitarbeiter)z2.hinweise.push("Mitarbeiter fehlt");
 z2.status=z2.fehler.length?"fehler":(z2.hinweise.some(h=>/nicht prüfbar|Datum fehlt|Mehr als 16|Negative/.test(h))?"unklar":"neu");
 return z2;
}

// Fingerabdruck: lesbarer Schlüssel aus Quellreferenz und Buchungsfeldern. Gleiche Zeilen im selben Dokument bekommen #2, #3 …
function abFingerabdruck(z,zaehler){
 const k=["abx",abNorm(z.rapport_ref),abNr(z.auftrag_nr),z.datum||"",abNameSchluessel(z.mitarbeiter),abNorm(z.taetigkeit),(z.stunden===null?"":abRund2(z.stunden).toFixed(2)),abNorm(z.kostenstelle)].join("|");
 if(!zaehler)return k;
 zaehler[k]=(zaehler[k]||0)+1;
 return zaehler[k]>1?k+"#"+zaehler[k]:k;
}

// Markiert Dubletten gegen bereits gespeicherte Zeilen (vorhanden: Menge der Fingerabdrücke; bestehende: Liste der Zeilen).
function abDublettenPruefen(zeilen,vorhanden,bestehende){
 const zaehler={};
 const exist=vorhanden instanceof Set?vorhanden:new Set(vorhanden||[]);
 zeilen.forEach(z=>{
  if(z.status==="summe"||z.status==="fehler"||z.status==="falscher_auftrag"){z.fingerprint=null;return}
  z.fingerprint=abFingerabdruck(z,zaehler);
  if(exist.has(z.fingerprint)){z.status="vorhanden";z.hinweise.push("Bereits importiert – wird nicht doppelt gespeichert");return}
  const aehnlich=(bestehende||[]).find(b=>b.datum&&z.datum&&b.datum===z.datum&&Math.abs(Number(b.stunden)-z.stunden)<=AB_TOLERANZ
     &&(abNameSchluessel(b.mitarbeiter)===abNameSchluessel(z.mitarbeiter)));
  if(aehnlich){z.status="moegliche_dublette";z.hinweise.push("Mögliche Dublette: gleiches Datum, Mitarbeiter und Stunden wie ein bereits importierter Eintrag, aber sonst nicht identisch")}
 });
 return zeilen;
}
// Standard-Auswahl: nur sichere neue Zeilen. Unklare und mögliche Dubletten bleiben abgewählt, bis jemand sie bewusst einschliesst.
function abStandardAuswahl(z){return z.status==="neu"}

// ---- Dokument-Ebene -------------------------------------------------------
function abDokumentKennung(text){
 const t=String(text||"");
 const r={};
 let m=t.match(/(?:Auftrags?-?(?:Nr\.?|nummer)|Projekt-?(?:Nr\.?|nummer)|Auftrag|Projekt|Kommission)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/\.]{2,20})/i);
 if(m)r.auftrag_nr=abNr(m[1]);
 m=t.match(/(?:Rapport-?(?:Nr\.?|nummer)|Beleg-?(?:Nr\.?|nummer)|Rapport)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/\.]{2,20})/i);
 if(m)r.rapport_ref=abTrim(m[1]);
 return r;
}

// Hauptfunktion für Tabellendaten (Excel, CSV, aus PDF abgeleitet).
// opts: {zuordnung, kopfZeile, blatt}
function abTabelleLesen(zeilen,opts){
 opts=opts||{};
 let kopf=null;
 if(opts.zuordnung){kopf={zeile:opts.kopfZeile===undefined?-1:opts.kopfZeile,zuordnung:opts.zuordnung}}
 else kopf=abKopfSuchen(zeilen);
 if(!kopf)return {ok:false,fehler:"Keine Kopfzeile mit Spalte „Stunden“ erkannt. Bitte die Spalten von Hand zuordnen.",zeilen:[],spalten:null,tabelle:zeilen};
 const roh=abZeilenAusTabelle(zeilen,kopf.zuordnung,kopf.zeile+1,{blatt:opts.blatt});
 return {ok:true,kopfZeile:kopf.zeile,zuordnung:kopf.zuordnung,roh,tabelle:zeilen};
}

// ---- CSV ------------------------------------------------------------------
function abCsvZeilen(text){
 const kopf=String(text||"").split(/\r?\n/).slice(0,5).join("\n");
 const zaehl=c=>(kopf.match(new RegExp(c==="\t"?"\\t":"\\"+c,"g"))||[]).length;
 const trenner=[";","\t",","].sort((a,b)=>zaehl(b)-zaehl(a))[0];
 const out=[];let zeile=[],zelle="",q=false;
 const s=String(text||"").replace(/^﻿/,"");
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(q){if(c==='"'){if(s[i+1]==='"'){zelle+='"';i++}else q=false}else zelle+=c}
  else if(c==='"')q=true;
  else if(c===trenner){zeile.push(zelle);zelle=""}
  else if(c==="\n"||c==="\r"){if(c==="\r"&&s[i+1]==="\n")i++;zeile.push(zelle);out.push(zeile);zeile=[];zelle=""}
  else zelle+=c;
 }
 if(zelle!==""||zeile.length){zeile.push(zelle);out.push(zeile)}
 return out;
}

// ---- PDF -> Tabelle -------------------------------------------------------
// items: pdf.js-TextContent-Teile {str, transform, width}. Gibt Zeilen aus Zellen {s,x,w} zurück.
function abPdfZeilenBilden(items){
 const teile=items.filter(it=>it&&typeof it.str==="string"&&it.str.trim()!=="").map(it=>({s:it.str,x:it.transform[4],y:it.transform[5],w:it.width||0}));
 teile.sort((a,b)=>b.y-a.y||a.x-b.x);
 const zeilen=[];
 teile.forEach(t=>{
  const z=zeilen.find(z=>Math.abs(z.y-t.y)<=2.5);
  if(z)z.teile.push(t);else zeilen.push({y:t.y,teile:[t]});
 });
 zeilen.sort((a,b)=>b.y-a.y);
 return zeilen.map(z=>{
  z.teile.sort((a,b)=>a.x-b.x);
  const zellen=[];
  z.teile.forEach(t=>{
   const l=zellen[zellen.length-1];
   if(l&&t.x-(l.x+l.w)<4){l.s+=(/\s$/.test(l.s)||/^\s/.test(t.s)?"":" ")+t.s;l.w=t.x+t.w-l.x}
   else zellen.push({s:t.s,x:t.x,w:t.w});
  });
  zellen.forEach(c=>c.s=abTrim(c.s));
  return zellen;
 });
}
// Wandelt PDF-Zeilen in eine Tabelle: mit Kopfzeile nach Spaltenlage, sonst nach Muster (Datum ... Stunden).
function abPdfZuTabelle(pdfZeilen){
 const text=pdfZeilen.map(z=>z.map(c=>c.s));
 const kopf=abKopfSuchen(text);
 if(kopf){
  const hk=pdfZeilen[kopf.zeile];
  const spalten=hk.map((c,i)=>({k:abKopfKey(c.s),mitte:c.x+c.w/2,label:c.s,i}));
  const tab=[];
  pdfZeilen.forEach((z,zi)=>{
   if(zi<kopf.zeile){return}
   const reihe=new Array(hk.length).fill("");
   z.forEach(c=>{
    const m=c.x+c.w/2;
    let best=0,bd=Infinity;
    spalten.forEach((s,si)=>{const d=Math.abs(s.mitte-m);if(d<bd){bd=d;best=si}});
    reihe[best]=reihe[best]?reihe[best]+" "+c.s:c.s;
   });
   tab.push(reihe);
  });
  return {tabelle:tab,modus:"kopfzeile"};
 }
 // ohne Kopfzeile: Zeile mit Datum am Anfang und einer Zahl am Ende
 const tab=[["Datum","Tätigkeit","Stunden"]];
 pdfZeilen.forEach(z=>{
  const s=z.map(c=>c.s).join(" ");
  const m=s.match(/^(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))\s+(.*?)\s+(-?\d+[.,:]\d{1,2}|-?\d+)\s*(?:h|Std\.?)?$/);
  if(m)tab.push([m[1],m[2],m[3]]);
 });
 return {tabelle:tab,modus:"muster"};
}

// ---- Vergleich mit den Regiestunden der App --------------------------------
// appEintraege: aus reports.work_entries: {datum, mitarbeiter, text, stunden, rapportId}
function abAppEintraege(reports){
 const out=[];let unlesbar=0;
 (reports||[]).forEach(rp=>{
  const we=Array.isArray(rp.work_entries)?rp.work_entries:null;
  if(!we){unlesbar++;return}
  we.forEach((w,i)=>{
   const h=Number(String(w&&w.hours!==undefined?w.hours:"").replace(",","."));
   out.push({rapportId:rp.id,pos:i+1,datum:(w&&w.date)||rp.date||null,mitarbeiter:abTrim(w&&w.employee),
     text:abTrim((w&&w.desc)||""),funktion:abTrim(w&&w.rateName),stunden:isFinite(h)?abRund2(h):null});
  });
 });
 return {eintraege:out,unlesbar};
}
function abVergleichen(abacus,app,optionen){
 const A=(abacus||[]).map((x,i)=>({...x,_i:i}));
 const B=(app&&app.eintraege||[]).map((x,i)=>({...x,_i:i}));
 const sumA=abRund2(A.reduce((s,x)=>s+Number(x.stunden||0),0));
 const bSumme=abRund2(B.reduce((s,x)=>s+(x.stunden||0),0));
 const diff=abRund2(sumA-bSumme);
 const gruende=[];
 if(!A.length)gruende.push("Es sind keine Abacus-Stunden importiert.");
 if(!B.length)gruende.push("In der App sind für dieses Projekt keine Regiestunden erfasst.");
 if(A.some(x=>!x.datum))gruende.push("Abacus-Buchungen ohne Datum: Datum kann nicht verglichen werden.");
 if(B.some(x=>!x.datum))gruende.push("App-Regiestunden ohne Datum.");
 if(B.some(x=>x.stunden===null))gruende.push("App-Regiestunden ohne gültige Stundenzahl.");
 if(app&&app.unlesbar)gruende.push(app.unlesbar+" Regierapport(e) mit unlesbaren Arbeitseinträgen.");
 // Einzelzuordnung - nur wo sicher
 const frei=new Set(B.map(x=>x._i));
 const sicher=[],moeglich=[];
 const gleich=(a,b)=>b.stunden!==null&&Math.abs(a.stunden-b.stunden)<=AB_TOLERANZ;
 const nameA=a=>abNameSchluessel(a.mitarbeiter);
 // 1. sicher: Datum + Mitarbeiter (voller Name gleich) + Stunden
 A.forEach(a=>{
  if(!a.datum||!nameA(a))return;
  const b=B.find(b=>frei.has(b._i)&&b.datum===a.datum&&abNameSchluessel(b.mitarbeiter)===nameA(a)&&gleich(a,b));
  if(b){frei.delete(b._i);a._z=1;sicher.push({abacus:a,app:b})}
 });
 // 2. möglich: Datum + Stunden gleich, Mitarbeiter nicht verifizierbar - NIE als sicher ausgeben
 A.forEach(a=>{
  if(a._z||!a.datum)return;
  const b=B.find(b=>frei.has(b._i)&&b.datum===a.datum&&gleich(a,b));
  if(b){frei.delete(b._i);a._z=2;moeglich.push({abacus:a,app:b,grund:(nameA(a)&&b.mitarbeiter)?"Mitarbeiter stimmt nicht überein ("+a.mitarbeiter+" ↔ "+b.mitarbeiter+")":"Mitarbeiter nicht eindeutig zuordenbar"})}
 });
 const nurAbacus=A.filter(a=>!a._z);
 const nurApp=B.filter(b=>frei.has(b._i));
 // je Datum
 const tage={};
 A.forEach(a=>{const k=a.datum||"ohne Datum";(tage[k]=tage[k]||{datum:k,abacus:0,app:0}).abacus=abRund2(tage[k].abacus+a.stunden)});
 B.forEach(b=>{const k=b.datum||"ohne Datum";(tage[k]=tage[k]||{datum:k,abacus:0,app:0}).app=abRund2(tage[k].app+(b.stunden||0))});
 const proTag=Object.values(tage).sort((x,y)=>String(x.datum).localeCompare(String(y.datum))).map(t=>({...t,diff:abRund2(t.abacus-t.app)}));
 const eingeschraenkt=moeglich.length>0||(A.length>0&&A.some(a=>!nameA(a)))||B.some(b=>!b.mitarbeiter);
 let status;
 if(gruende.length)status="Nicht vollständig vergleichbar";
 else if(Math.abs(diff)<=AB_TOLERANZ)status="Übereinstimmend";
 else status="Abweichung";
 let rundung="";
 if(status==="Abweichung"&&Math.abs(diff)<=AB_RUNDUNG_PRO_BUCHUNG*Math.max(A.length,B.length,1))
  rundung="Die Differenz liegt innerhalb einer möglichen Rundung (bis "+AB_RUNDUNG_PRO_BUCHUNG+" h je Buchung) – bitte die Zeitformate beider Seiten prüfen.";
 return {abacus:sumA,app:bSumme,diff,status,gruende,rundung,eingeschraenkt,
  sicher,moeglich,nurAbacus,nurApp,proTag,anzAbacus:A.length,anzApp:B.length};
}

// Stand-Kennung für den Prüfvermerk: ändert sich, sobald ein Import oder ein Rapport etwas verändert.
function abStandKennung(abacus,app){
 const a=(abacus||[]);
 const b=(app&&app.eintraege)||[];
 return a.length+"|"+abRund2(a.reduce((s,x)=>s+Number(x.stunden||0),0)).toFixed(2)+"|"+Math.max(0,...a.map(x=>Number(x.import_id)||0))+"|"
  +b.length+"|"+abRund2(b.reduce((s,x)=>s+(x.stunden||0),0)).toFixed(2);
}

// ---- Sollstunden aus der Offerte -------------------------------------------
// Nur eindeutig als Stunden ausgewiesene Positionen (Einheit h/Std/Stunden) mit gültiger Menge. Nichts wird geschätzt.
// Bei mehreren geltenden Offerten mit Stunden wird NICHT addiert (Alternativen oder Revisionen sind nicht unterscheidbar).
function abEinheitIstStunde(u){
 const t=abNorm(u).replace(/\.$/,"");
 return t==="h"||t==="std"||t==="stunde"||t==="stunden"||t==="stdn";
}
function abSollStunden(angebote){
 const geltende=(angebote||[]).filter(a=>a&&a.gilt!==false);
 const je=[];
 geltende.forEach(a=>{
  const pos=Array.isArray(a.positions)?a.positions:[];
  let summe=0,n=0;
  pos.forEach(p=>{
   if(!p||!abEinheitIstStunde(p.unit))return;
   const m=Number(p.quantity);
   if(typeof p.quantity==="boolean"||!isFinite(m)||m<=0)return;
   summe+=m;n++;
  });
  if(n)je.push({id:a.id,titel:a.title||"Ohne Bezeichnung",stunden:abRund2(summe),positionen:n});
 });
 if(!je.length)return {verfuegbar:false,grund:geltende.length?"In den geltenden Offerten sind keine Positionen mit Einheit „h“/„Std“ und gültiger Menge.":"Keine geltende Offerte mit Stundenpositionen.",je};
 if(je.length>1)return {verfuegbar:false,grund:"Mehrere geltende Offerten mit Stundenpositionen – sie werden nicht addiert, weil nicht erkennbar ist, ob es Alternativen sind.",je};
 return {verfuegbar:true,stunden:je[0].stunden,je};
}
function abAbweichungProzent(ist,soll){
 if(!(soll>0))return null;
 return abRund2((ist-soll)/soll*100);
}
