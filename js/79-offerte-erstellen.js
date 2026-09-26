"use strict";

/* ===========================================================================
 * OFFERTE ERSTELLEN  (v3.200)
 *
 * Eine Offerte, die der Betrieb SELBST schreibt und dem Kunden schickt.
 *
 * ABGRENZUNG - das ist der ganze Punkt dieses Moduls:
 *
 *   js/63-angebote.js  "Offerte importieren"  Eine FREMDE, bereits
 *       bestehende Offerte kommt als Foto oder PDF in die App; die
 *       Positionen werden erkannt, damit daraus Massaufnahmen abgeleitet
 *       werden koennen. Sie ist eine Aufnahme dessen, was schon existiert.
 *
 *   js/79 (hier)       "Offerte erstellen"    Das eigene Dokument: Kunde,
 *       Positionen aus den Katalogen, Rabatt, MwSt, Vor- und Schlusstext,
 *       daraus ein PDF fuer den Kunden. Sie entsteht, BEVOR gearbeitet wird.
 *
 * Ansage des Anwenders: "die neue offertfunktion soll dazu da sein, wirklich
 * eine neue offerte für den kunden zu erstellen. Komplett getrennt von der
 * anderen funktion." Deshalb eigene Tabelle (offerten), eigenes Modul, eigene
 * Cockpit-Karte. js/63 wird dabei nicht umgebaut - nur der Katalog-Dialog,
 * der in v3.199 versehentlich dort gelandet ist, zieht hierher um.
 *
 * WAS BEWUSST GETEILT WIRD (und warum kein zweites davon entsteht):
 *  - Briefkopf und MwSt-Satz: companyName/companyAddress/logoUrl/defaultVat
 *    aus app_settings - dieselben Werte, die der Regierapport druckt.
 *  - Positionsstruktur {pos,description,quantity,unit,preis,abschnitt} -
 *    identisch zur importierten Offerte (CLAUDE.md: dieselbe Struktur).
 *  - Materialsuche: searchMaterials() aus js/06.
 *  - Rechte: Ressource "angebote" und Freischaltung feature_access
 *    'angebote'. Wer Offerten darf, darf beide Arten; ein zweiter Schalter
 *    waere eine zweite Stelle zum Vergessen.
 *  - Projektauswahl, Storage-Upload-Pfad, Cockpit-Anbindung.
 *
 * EINE QUELLE FUER DAS DOKUMENT: offDokument() baut die Offerte als reine
 * Datenstruktur (Bloecke und Zeilen, in Millimeter noch nicht ausgelegt),
 * offPdfBauen() rendert genau diese Struktur nach PDF. Es gibt KEINE zweite,
 * per HTML/CSS nachgebaute Druckansicht: die Vorschau in der App zeigt das
 * erzeugte PDF selbst. Was auf dem Bildschirm steht, ist damit Byte fuer
 * Byte das, was der Kunde bekommt.
 * =========================================================================== */

// ---- Zustand --------------------------------------------------------------
let offSelectedProjectId=null;
let offPositionen=[];
let currentOfferteId=null;
let currentOfferteMeta={};
let offEditReturnTo="cockpitOfferten";
let projectOffertenCache=[];
let offSektionOffen=new Set();
// Das zuletzt erzeugte PDF dieser Offerte, solange sie offen ist:
// {blob,url,name}. url ist eine Blob-URL fuer die Vorschau und wird beim
// naechsten Erzeugen wieder freigegeben - sonst haelt der Browser jede
// Fassung im Speicher.
let offPdfVorschau=null;
// Bereits gespeichertes PDF: {path,name} oder null.
let offPdfAbgelegt=null;

// ===========================================================================
// RECHNEN - kennt kein DOM, ist die einzige Quelle fuer jeden Betrag
// ===========================================================================

// Der Firmen-MwSt-Satz steht als Text da ("8.1 %"), weil er im Regierapport
// so gedruckt wird. Hier wird gerechnet, also braucht es die Zahl - und zwar
// aus DERSELBEN Quelle, nicht aus einem zweiten Feld.
function offMwstZahl(x){
 const n=Number(String(x==null?"":x).replace("%","").replace(",",".").trim());
 return Number.isFinite(n)?n:0;
}
function offZahl(x){
 const n=Number(String(x==null?"":x).replace(",","."));
 return Number.isFinite(n)?n:0;
}
// Auf Rappen runden. Ohne das schleppt jede Zwischensumme
// Gleitkomma-Reste mit, und das gedruckte Total stimmt am Ende um einen
// Rappen nicht mit der Summe der gedruckten Zeilen ueberein - genau der
// Fehler, den ein Kunde als Erstes findet.
function offRappen(n){ return Math.round((Number(n)||0)*100)/100 }

function offZeilenBetrag(p){ return offRappen(offZahl(p&&p.quantity)*offZahl(p&&p.preis)) }

/* Die ganze Geldrechnung einer Offerte an einer Stelle.
 *
 * rabattArt "prozent": Abzug in % auf das Zwischentotal.
 * rabattArt "betrag":  Abzug als Franken-Betrag.
 * Ein Rabatt kann das Total nicht unter null druecken (ein Betrag groesser
 * als das Zwischentotal waere ein Tippfehler, keine Gutschrift).
 */
function offRechnung(positionen,rabattArt,rabattWert,mwstSatz){
 const liste=Array.isArray(positionen)?positionen:[];
 const zwischentotal=offRappen(liste.reduce((s,p)=>s+offZeilenBetrag(p),0));
 const wert=offZahl(rabattWert);
 let rabatt=0;
 if(wert>0){
  rabatt=(rabattArt==="betrag")?offRappen(wert):offRappen(zwischentotal*wert/100);
  if(rabatt>zwischentotal)rabatt=zwischentotal;
 }
 const netto=offRappen(zwischentotal-rabatt);
 const satz=offMwstZahl(mwstSatz);
 const mwst=offRappen(netto*satz/100);
 return {
  zwischentotal, rabatt, netto, mwstSatz:satz, mwst,
  total:offRappen(netto+mwst)
 };
}

// Positionen eines Abschnitts zusammenfassen - fuer die Zwischensumme je
// Block im Dokument. Aufeinanderfolgende Zeilen mit demselben Titel bilden
// einen Block, genau wie in der Tabelle (keine zweite Gruppierungsregel).
function offBloecke(positionen){
 const liste=Array.isArray(positionen)?positionen:[];
 const raus=[];
 let i=0;
 while(i<liste.length){
  const titel=String((liste[i]&&liste[i].abschnitt)||"").trim();
  let j=i;
  while(j<liste.length&&String((liste[j]&&liste[j].abschnitt)||"").trim()===titel)j++;
  const zeilen=liste.slice(i,j);
  raus.push({titel, zeilen, summe:offRappen(zeilen.reduce((s,p)=>s+offZeilenBetrag(p),0))});
  i=j;
 }
 return raus;
}

// ===========================================================================
// DAS DOKUMENT als Datenstruktur - die eine Quelle fuer den Ausdruck
// ===========================================================================
// offPdfBauen() rendert genau das hier und erfindet nichts dazu. Dadurch
// laesst sich die ganze Offerte ohne PDF-Bibliothek nachrechnen und pruefen.
function offDokument(d,firma){
 const f=firma||{};
 const daten=d||{};
 const r=offRechnung(daten.positionen,daten.rabatt_art,daten.rabatt_wert,daten.mwst_satz);
 const datumText=x=>(typeof datumCH==="function"&&x)?datumCH(x):(x||"");
 const kopfRechts=[];
 if(String(daten.offert_nr||"").trim())kopfRechts.push(["Offert-Nr.",String(daten.offert_nr).trim()]);
 kopfRechts.push(["Datum",datumText(daten.date)]);
 if(daten.gueltig_bis)kopfRechts.push(["Gültig bis",datumText(daten.gueltig_bis)]);

 const summen=[["Zwischentotal",r.zwischentotal]];
 if(r.rabatt>0){
  const bez=(daten.rabatt_art==="betrag")
   ?"Rabatt"
   :"Rabatt "+String(offZahl(daten.rabatt_wert)).replace(".",",")+" %";
  summen.push([bez,-r.rabatt]);
  summen.push(["Netto",r.netto]);
 }
 summen.push(["MwSt "+String(r.mwstSatz).replace(".",",")+" %",r.mwst]);
 summen.push(["Total CHF",r.total]);

 return {
  absender:{
   name:String(f.name||""),
   adresse:String(f.adresse||"").split("\n").map(s=>s.trim()).filter(Boolean)
  },
  empfaenger:[daten.kunde_name,daten.kunde_zusatz,daten.kunde_strasse,daten.kunde_plz_ort]
   .map(s=>String(s||"").trim()).filter(Boolean),
  titel:String(daten.title||"Offerte").trim()||"Offerte",
  kopfRechts,
  vortext:String(daten.vortext||"").trim(),
  bloecke:offBloecke(daten.positionen).map(b=>({
   titel:b.titel,
   summe:b.summe,
   zeilen:b.zeilen.map(p=>({
    pos:String(p.pos||"").trim(),
    text:String(p.description||"").trim(),
    menge:offZahl(p.quantity),
    einheit:String(p.unit||"").trim(),
    preis:offZahl(p.preis),
    betrag:offZeilenBetrag(p)
   }))
  })),
  summen,
  rechnung:r,
  schlusstext:String(daten.schlusstext||"").trim()
 };
}

// Dateiname des erzeugten PDFs - aus Offert-Nr. und Bezeichnung, ohne
// Zeichen, die ein Dateisystem oder ein Mailprogramm stoeren.
function offPdfDateiname(daten){
 const teile=[String((daten&&daten.offert_nr)||"").trim(),String((daten&&daten.title)||"").trim()]
  .filter(Boolean).join(" ");
 const rein=(teile||"Offerte")
  .replace(/[\\/:*?"<>|]+/g," ")
  .replace(/\s+/g," ").trim().slice(0,80);
 return "Offerte "+rein+".pdf";
}

// ===========================================================================
// PDF
// ===========================================================================
const OFF_PDF={
 randLinks:20, randRechts:20, randOben:18, randUnten:20,
 breite:210, hoehe:297,
 // Adressfeld fuer ein Schweizer Fenstercouvert C5/6 mit rechtem Fenster.
 adresseX:120, adresseY:52,
 spalten:{pos:20, text:34, menge:120, einheit:136, preis:150, betrag:178}
};
function offPdfVerfuegbar(){
 return typeof window!=="undefined"&&window.jspdf&&typeof window.jspdf.jsPDF==="function";
}
function offFr(n){
 // Dieselbe Darstellung wie ueberall in der App (money() aus js/03).
 return (typeof money==="function")?money(n):(Number(n)||0).toFixed(2);
}

/* Rendert offDokument() nach PDF. Bewusst ohne Tabellen-Zusatzbibliothek:
 * eine Offerte ist eine Liste mit fixen Spalten, und eine zweite fremde
 * Abhaengigkeit dafuer waere mehr Risiko als Gewinn. */
function offPdfBauen(dok,optionen){
 if(!offPdfVerfuegbar())throw new Error("Die PDF-Bibliothek ist nicht geladen.");
 // komprimieren:false ist der Weg des Pruefstands, in das fertige Dokument
 // hineinzusehen: unkomprimiert stehen die Texte im Klartext im
 // Inhaltsstrom und lassen sich gegen die Erwartung pruefen. Im Betrieb
 // wird immer komprimiert - sonst waere die Datei unnoetig gross.
 const komprimieren=!(optionen&&optionen.komprimieren===false);
 const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4",compress:komprimieren});
 const L=OFF_PDF.randLinks, R=OFF_PDF.breite-OFF_PDF.randRechts;
 const textBreite=OFF_PDF.spalten.menge-OFF_PDF.spalten.text-4;
 let y=OFF_PDF.randOben;

 const setz=(groesse,fett)=>{doc.setFontSize(groesse);doc.setFont("helvetica",fett?"bold":"normal")};
 const umbruch=(neueHoehe)=>{
  if(y+neueHoehe<=OFF_PDF.hoehe-OFF_PDF.randUnten)return false;
  doc.addPage();
  y=OFF_PDF.randOben;
  return true;
 };

 // --- Briefkopf
 setz(14,true);
 doc.text(dok.absender.name||"",L,y);
 y+=5;
 setz(8.5,false);
 doc.setTextColor(90);
 dok.absender.adresse.forEach(z=>{doc.text(z,L,y);y+=3.8});
 doc.setTextColor(0);

 // --- Empfaenger im Fensterbereich
 setz(10.5,false);
 let ay=OFF_PDF.adresseY;
 dok.empfaenger.forEach(z=>{doc.text(z,OFF_PDF.adresseX,ay);ay+=5});

 // --- Kopfdaten links neben dem Adressfeld
 y=Math.max(y+6,OFF_PDF.adresseY);
 setz(9,false);
 dok.kopfRechts.forEach(([k,v])=>{
  doc.setTextColor(90);doc.text(k,L,y);
  doc.setTextColor(0);doc.text(String(v),L+26,y);
  y+=4.6;
 });
 y=Math.max(y,ay)+10;

 // --- Titel
 setz(13,true);
 doc.text(dok.titel,L,y);
 y+=7;

 // --- Vortext
 if(dok.vortext){
  setz(9.5,false);
  const zeilen=doc.splitTextToSize(dok.vortext,R-L);
  zeilen.forEach(z=>{umbruch(5);doc.text(z,L,y);y+=4.4});
  y+=4;
 }

 // --- Positionen
 const kopfzeile=()=>{
  setz(8,true);
  doc.setTextColor(90);
  doc.text("Pos.",OFF_PDF.spalten.pos,y);
  doc.text("Bezeichnung",OFF_PDF.spalten.text,y);
  doc.text("Menge",OFF_PDF.spalten.menge+10,y,{align:"right"});
  doc.text("Einheit",OFF_PDF.spalten.einheit,y);
  doc.text("Preis",OFF_PDF.spalten.preis+16,y,{align:"right"});
  doc.text("Betrag",R,y,{align:"right"});
  doc.setTextColor(0);
  y+=1.6;
  doc.setDrawColor(170);doc.line(L,y,R,y);
  y+=4;
 };
 if(dok.bloecke.length){ kopfzeile() }

 dok.bloecke.forEach(b=>{
  if(b.titel){
   if(umbruch(12))kopfzeile();
   setz(9.5,true);
   doc.text(b.titel,L,y);
   y+=5;
  }
  b.zeilen.forEach(z=>{
   setz(9,false);
   const text=doc.splitTextToSize(z.text||"",textBreite);
   const hoehe=Math.max(text.length,1)*4.2+1.4;
   if(umbruch(hoehe))kopfzeile();
   if(z.pos)doc.text(z.pos,OFF_PDF.spalten.pos,y);
   text.forEach((t,i)=>doc.text(t,OFF_PDF.spalten.text,y+i*4.2));
   const zahl=String(z.menge).replace(".",",");
   doc.text(zahl,OFF_PDF.spalten.menge+10,y,{align:"right"});
   if(z.einheit)doc.text(z.einheit,OFF_PDF.spalten.einheit,y);
   doc.text(offFr(z.preis),OFF_PDF.spalten.preis+16,y,{align:"right"});
   doc.text(offFr(z.betrag),R,y,{align:"right"});
   y+=hoehe;
  });
  if(b.titel&&b.zeilen.length){
   if(umbruch(8))kopfzeile();
   setz(9,true);
   doc.text("Zwischensumme "+b.titel,OFF_PDF.spalten.text,y);
   doc.text(offFr(b.summe),R,y,{align:"right"});
   y+=6;
  }
 });

 // --- Summen
 umbruch(10+dok.summen.length*5);
 y+=2;
 doc.setDrawColor(120);doc.line(OFF_PDF.spalten.preis-10,y,R,y);
 y+=5;
 dok.summen.forEach(([bez,betrag],i)=>{
  const letzte=(i===dok.summen.length-1);
  setz(letzte?11:9.5,letzte);
  doc.text(bez,OFF_PDF.spalten.preis-10,y);
  doc.text(offFr(betrag),R,y,{align:"right"});
  y+=letzte?6:4.8;
 });

 // --- Schlusstext
 if(dok.schlusstext){
  y+=6;
  setz(9,false);
  const zeilen=doc.splitTextToSize(dok.schlusstext,R-L);
  zeilen.forEach(z=>{umbruch(5);doc.text(z,L,y);y+=4.2});
 }

 // --- Fusszeile mit Seitenzahlen, erst am Schluss (die Gesamtzahl steht
 //     vorher noch nicht fest).
 const seiten=doc.getNumberOfPages();
 for(let s=1;s<=seiten;s++){
  doc.setPage(s);
  setz(7.5,false);
  doc.setTextColor(130);
  doc.text(dok.absender.name||"",L,OFF_PDF.hoehe-10);
  doc.text("Seite "+s+" von "+seiten,R,OFF_PDF.hoehe-10,{align:"right"});
  doc.setTextColor(0);
 }
 return doc;
}

function offFirmaFuerPdf(){
 return {
  name:(typeof companyName==="string"&&companyName)?companyName:"",
  adresse:(typeof companyAddress==="string")?companyAddress:""
 };
}

// ===========================================================================
// KATALOG-DIALOG  (aus js/63 hierher gezogen, v3.199 -> v3.200)
// ===========================================================================
// Stundenansaetze (settings.rates) und Regiematerial (settings.materials)
// als Offertpositionen, getrennt nach Zeit und Material. Die Preise kommen
// UNVERAENDERT aus dem Katalog (Ansage des Betriebs).
let offKatMengen={};
let offKatSuchtext="";

function offKatRaten(){
 return (typeof settings==="object"&&settings&&Array.isArray(settings.rates))?settings.rates:[];
}
function offKatAlleMaterialien(){
 return (typeof settings==="object"&&settings&&Array.isArray(settings.materials))?settings.materials:[];
}
// Dieselbe Suche wie im Regierapport - eine zweite Suchlogik ueber denselben
// Katalog waere eine zweite Wahrheit darueber, was ein Treffer ist.
function offKatTrefferMaterial(){
 if(typeof searchMaterials==="function")return searchMaterials(offKatSuchtext);
 return offKatAlleMaterialien().slice(0,15);
}
function offKatSchluessel(art,id){ return art+":"+String(id) }

// Welche Abschnitte hat DIESE Offerte schon? Damit man in einen bestehenden
// hineinwaehlt, statt ihn durch einen Tippfehler zu verdoppeln.
function offAbschnitte(){
 const raus=[];
 offPositionen.forEach(p=>{
  const t=String(p.abschnitt||"").trim();
  if(t&&raus.indexOf(t)<0)raus.push(t);
 });
 return raus;
}

/* Aus der Auswahl werden Offertpositionen. KENNT KEIN DOM.
 * Ein leeres Abschnittsfeld heisst die Vorgabe, nicht "kein Abschnitt":
 * getrennt nach Zeit und Material ist der Sinn der Sache. */
function offKatZeilen(mengen,abschnittArbeit,abschnittMaterial){
 const m=mengen||{};
 const aA=String(abschnittArbeit||"").trim()||"Arbeit";
 const aM=String(abschnittMaterial||"").trim()||"Material";
 const raus=[];
 offKatRaten().forEach(r=>{
  const menge=offZahl(m[offKatSchluessel("rate",r[0])]);
  if(!(menge>0))return;
  raus.push({pos:"", description:String(r[0]||""), quantity:menge, unit:"h",
             preis:offZahl(r[1]), abschnitt:aA});
 });
 // Ueber ALLE Materialien, nicht nur die gerade gefilterten: wer sucht, eine
 // Menge eintraegt und weitersucht, darf seine Eingabe nicht verlieren.
 offKatAlleMaterialien().forEach(x=>{
  const menge=offZahl(m[offKatSchluessel("mat",x[0])]);
  if(!(menge>0))return;
  const dim=String(x[2]||"").trim();
  raus.push({pos:String(x[0]||""),
             description:String(x[1]||"")+(dim?" · "+dim:""),
             quantity:menge, unit:String(x[3]||""),
             preis:offZahl(x[4]), abschnitt:aM});
 });
 return raus;
}

/* Eine Position an die RICHTIGE Stelle setzen. Die Tabelle gruppiert
 * AUFEINANDERFOLGENDE Zeilen mit demselben Titel - wer stumpf ans Ende
 * anhaengt, bekommt denselben Abschnitt zweimal. */
function offPositionEinfuegen(p){
 const titel=String(p.abschnitt||"").trim();
 if(!titel){ offPositionen.push(p); return offPositionen.length-1 }
 let letzte=-1;
 offPositionen.forEach((x,i)=>{ if(String(x.abschnitt||"").trim()===titel)letzte=i });
 if(letzte<0){ offPositionen.push(p); return offPositionen.length-1 }
 offPositionen.splice(letzte+1,0,p);
 return letzte+1;
}

function offAbschnittUmbenennen(alt,neu){
 const a=String(alt||"").trim(), n=String(neu||"").trim();
 if(a===""||a===n)return 0;
 let getroffen=0;
 offPositionen.forEach(p=>{ if(String(p.abschnitt||"").trim()===a){ p.abschnitt=n; getroffen++ } });
 if(getroffen&&offSektionOffen.has(a)){
  offSektionOffen.delete(a);
  if(n)offSektionOffen.add(n);
 }
 return getroffen;
}

// ===========================================================================
// OBERFLAECHE
// ===========================================================================

// ---- Positionstabelle ------------------------------------------------------
function offPositionZeileHtml(p,i,versteckt,titel){
 return `<tr${versteckt?' style="display:none"':""}${titel?` data-off-sek-row="${esc(titel)}"`:""}>
<td><div class="search"><input data-off-pos="${i}" value="${esc(p.pos||"")}" autocomplete="off" placeholder="EDV-Nr."><div class="suggest" id="offSug${i}"></div></div></td>
<td><input data-off-desc="${i}" value="${esc(p.description||"")}"></td>
<td><input data-off-qty="${i}" type="number" step=".01" value="${p.quantity||0}"></td>
<td><input data-off-unit="${i}" value="${esc(p.unit||"")}"></td>
<td><input data-off-preis="${i}" type="number" step=".01" value="${p.preis||0}"></td>
<td class="small" style="text-align:right;white-space:nowrap" data-off-betrag="${i}">${offFr(offZeilenBetrag(p))}</td>
<td style="white-space:nowrap"><button type="button" class="red" data-off-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`;
}
function renderOffPositionsTabelle(){
 if(!$("offPositionsBody"))return;
 if(!offPositionen.length){
  $("offPositionsBody").innerHTML='<tr><td colspan="7" class="small">Noch keine Positionen. „📋 Aus Katalog“ oder „＋ Position“.</td></tr>';
 }else{
  let html="",i=0;
  while(i<offPositionen.length){
   const titel=String(offPositionen[i].abschnitt||"").trim();
   if(titel){
    let j=i;
    while(j<offPositionen.length&&String(offPositionen[j].abschnitt||"").trim()===titel)j++;
    const offen=offSektionOffen.has(titel);
    html+=`<tr><td colspan="7"><div class="klapp-kopf ang-sek-kopf${offen?" open":""}" data-off-sek-toggle="${esc(titel)}" role="button" tabindex="0"><input class="ang-sek-titel" data-off-sek-name="${esc(titel)}" value="${esc(titel)}" title="Abschnitt umbenennen"><span class="klapp-chevron">›</span></div></td></tr>`;
    for(let k=i;k<j;k++)html+=offPositionZeileHtml(offPositionen[k],k,!offen,titel);
    i=j;
   }else{
    html+=offPositionZeileHtml(offPositionen[i],i,false,"");
    i++;
   }
  }
  $("offPositionsBody").innerHTML=html;
 }
 renderOffSummen();
}

// Die Summenanzeige im Formular kommt aus derselben offRechnung() wie das
// PDF - was hier steht, steht auch im Dokument.
function offFormularDaten(){
 return {
  offert_nr:$("offNr")?$("offNr").value:"",
  title:$("offTitle")?$("offTitle").value:"",
  date:($("offDate")&&$("offDate").value)||new Date().toISOString().slice(0,10),
  gueltig_bis:($("offGueltigBis")&&$("offGueltigBis").value)||null,
  kunde_name:$("offKundeName")?$("offKundeName").value:"",
  kunde_zusatz:$("offKundeZusatz")?$("offKundeZusatz").value:"",
  kunde_strasse:$("offKundeStrasse")?$("offKundeStrasse").value:"",
  kunde_plz_ort:$("offKundePlzOrt")?$("offKundePlzOrt").value:"",
  vortext:$("offVortext")?$("offVortext").value:"",
  schlusstext:$("offSchlusstext")?$("offSchlusstext").value:"",
  positionen:offPositionen,
  rabatt_art:($("offRabattArt")&&$("offRabattArt").value)||"prozent",
  rabatt_wert:offZahl($("offRabattWert")?$("offRabattWert").value:0),
  mwst_satz:offMwstSatzAusFeld()
 };
}
// Ein LEERES MwSt-Feld ist kein Nullsatz. Der Unterschied kostet hier
// richtiges Geld: eine Offerte, die versehentlich mit 0 % hinausgeht, ist
// beim Kunden eine Zusage. Leer heisst deshalb "Firmenvorgabe", und nur eine
// ausdrueckliche 0 heisst 0 %.
function offMwstSatzAusFeld(){
 const roh=$("offMwst")?String($("offMwst").value).trim():"";
 if(roh==="")return offMwstZahl(typeof defaultVat!=="undefined"?defaultVat:"8.1 %");
 return offMwstZahl(roh);
}
function renderOffSummen(){
 const box=$("offSummen");
 if(!box)return;
 const d=offFormularDaten();
 const r=offRechnung(d.positionen,d.rabatt_art,d.rabatt_wert,d.mwst_satz);
 const zeile=(bez,betrag,fett)=>`<div class="off-summe${fett?" off-summe-total":""}"><span>${esc(bez)}</span><b>${offFr(betrag)}</b></div>`;
 let html=zeile("Zwischentotal",r.zwischentotal);
 if(r.rabatt>0){
  html+=zeile(d.rabatt_art==="betrag"?"Rabatt":"Rabatt "+String(offZahl(d.rabatt_wert)).replace(".",",")+" %",-r.rabatt);
  html+=zeile("Netto",r.netto);
 }
 html+=zeile("MwSt "+String(r.mwstSatz).replace(".",",")+" %",r.mwst);
 html+=zeile("Total CHF",r.total,true);
 box.innerHTML=html;
 if($("offPositionsSummary"))$("offPositionsSummary").textContent=offPositionen.length?`${offPositionen.length} Positionen`:"";
}
function offBetragAktualisieren(i){
 const p=offPositionen[i];
 if(!p||!$("offPositionsBody"))return;
 const zelle=$("offPositionsBody").querySelector(`[data-off-betrag="${i}"]`);
 if(zelle)zelle.textContent=offFr(offZeilenBetrag(p));
 renderOffSummen();
}

/* v3.201: Wer eine Positionsnummer tippt, soll sofort die passenden
 * Materialpositionen sehen - Ansage des Anwenders. Gesucht wird mit
 * searchMaterials() aus js/06, genau wie im Regierapport und im
 * Katalog-Dialog: eine zweite Suchlogik ueber denselben Katalog waere eine
 * zweite Wahrheit darueber, was ein Treffer ist.
 *
 * Der Vorschlag ist ein ANGEBOT, kein Zwang: wer eine Nummer tippt, die es
 * im Katalog nicht gibt, behaelt sie, und Bezeichnung, Einheit und Preis
 * bleiben frei von Hand ausfuellbar ("Es soll aber immer noch möglich sein,
 * die Positionen so zu erfassen wie es jetzt ist"). Uebernommen wird NUR,
 * was angeklickt wird. */
function offPosVorschlaege(i,text){
 const box=$("offSug"+i);
 if(!box)return;
 const q=String(text||"").trim();
 if(!q){ box.innerHTML=""; return }
 const treffer=(typeof searchMaterials==="function")?searchMaterials(q):[];
 box.innerHTML=treffer.map(x=>
  `<div class="item" data-off-pick-mat="${i}" data-no="${esc(String(x[0]||""))}">`
  +`<b>${esc(String(x[0]||""))} · ${esc(String(x[1]||""))}</b>`
  +`<span>${esc([String(x[2]||""),String(x[3]||""),"CHF "+offFr(offZahl(x[4]))].filter(Boolean).join(" · "))}</span>`
  +`</div>`).join("");
 const feld=$("offPositionsBody")&&$("offPositionsBody").querySelector(`[data-off-pos="${i}"]`);
 if(box.innerHTML&&feld&&typeof positionSuggest==="function")positionSuggest(feld,box);
}
// Einen Treffer uebernehmen: Nummer, Bezeichnung, Einheit und Preis in die
// Zeile. Eine bereits eingetragene MENGE bleibt stehen - sie gehoert zur
// Zeile, nicht zum Artikel.
function offPosUebernehmen(i,nr){
 const p=offPositionen[i];
 if(!p)return false;
 const x=offKatAlleMaterialien().find(m=>String(m[0])===String(nr));
 if(!x)return false;
 const dim=String(x[2]||"").trim();
 p.pos=String(x[0]||"");
 p.description=String(x[1]||"")+(dim?" · "+dim:"");
 p.unit=String(x[3]||"");
 p.preis=offZahl(x[4]);
 return true;
}
if($("offPositionsBody")){
 $("offPositionsBody").addEventListener("input",e=>{
  const i=Number(e.target.dataset.offPos??e.target.dataset.offDesc??e.target.dataset.offQty??e.target.dataset.offUnit??e.target.dataset.offPreis);
  if(Number.isNaN(i)||!offPositionen[i])return;
  let geld=false;
  if(e.target.dataset.offPos!==undefined){
   offPositionen[i].pos=e.target.value;
   offPosVorschlaege(i,e.target.value);
  }
  else if(e.target.dataset.offDesc!==undefined)offPositionen[i].description=e.target.value;
  else if(e.target.dataset.offUnit!==undefined)offPositionen[i].unit=e.target.value;
  else if(e.target.dataset.offQty!==undefined){offPositionen[i].quantity=offZahl(e.target.value);geld=true}
  else if(e.target.dataset.offPreis!==undefined){offPositionen[i].preis=offZahl(e.target.value);geld=true}
  isDirty=true;
  if(geld)offBetragAktualisieren(i);
 });
 $("offPositionsBody").addEventListener("click",e=>{
  // Ein Treffer aus der Vorschlagsliste - vor allem anderen, sonst faenge
  // ihn der Klapp-Zweig darunter ab.
  const pick=e.target.closest("[data-off-pick-mat]");
  if(pick){
   const i=Number(pick.dataset.offPickMat);
   if(offPosUebernehmen(i,pick.dataset.no)){
    isDirty=true;
    renderOffPositionsTabelle();
   }
   const box=$("offSug"+i); if(box)box.innerHTML="";
   return;
  }
  // Klick INS Titelfeld heisst umbenennen, nicht klappen.
  if(e.target.closest("[data-off-sek-name]"))return;
  const del=e.target.closest("[data-off-del]");
  if(del){offPositionen.splice(Number(del.dataset.offDel),1);isDirty=true;renderOffPositionsTabelle();return}
  const sek=e.target.closest("[data-off-sek-toggle]");
  if(sek){
   const titel=sek.dataset.offSekToggle;
   const offen=!sek.classList.contains("open");
   if(offen)offSektionOffen.add(titel);else offSektionOffen.delete(titel);
   sek.classList.toggle("open",offen);
   $("offPositionsBody").querySelectorAll("[data-off-sek-row]").forEach(tr=>{
    if(tr.dataset.offSekRow===titel)tr.style.display=offen?"":"none";
   });
  }
 });
 // Umbenennen erst beim Verlassen des Feldes - ein Neuzeichnen je Buchstabe
 // wuerde den Fokus wegnehmen.
 $("offPositionsBody").addEventListener("change",e=>{
  const t=e.target.closest?e.target.closest("[data-off-sek-name]"):null;
  if(!t)return;
  const alt=t.dataset.offSekName, neu=String(t.value||"").trim();
  // Ein leerer Titel wuerde den Abschnitt stillschweigend aufloesen.
  if(!neu){ t.value=alt; return }
  if(neu===alt)return;
  offAbschnittUmbenennen(alt,neu);
  isDirty=true;
  renderOffPositionsTabelle();
 });
 $("offPositionsBody").addEventListener("keydown",e=>{
  if(e.target.closest&&e.target.closest("[data-off-sek-name]")){
   if(e.key==="Enter"){e.preventDefault();e.target.blur()}
   return;
  }
  if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
  const k=e.target.closest?e.target.closest("[data-off-sek-toggle]"):null;
  if(!k)return;
  e.preventDefault();
  k.click();
 });
}
if($("offAddPosition")){
 $("offAddPosition").onclick=()=>{
  offPositionen.push({pos:"",description:"",quantity:0,unit:"",preis:0,abschnitt:""});
  isDirty=true;
  renderOffPositionsTabelle();
 };
}
if($("offAddAbschnitt")){
 $("offAddAbschnitt").onclick=()=>{
  const name=prompt("Name des neuen Abschnitts?\n\n(z. B. Arbeit, Material, Gerüst, Entsorgung)");
  if(name===null)return;
  const titel=String(name).trim();
  if(!titel)return;
  offSektionOffen.add(titel);
  offPositionEinfuegen({pos:"",description:"",quantity:0,unit:"",preis:0,abschnitt:titel});
  isDirty=true;
  renderOffPositionsTabelle();
 };
}
if($("offDeleteAllPositions")){
 $("offDeleteAllPositions").onclick=()=>{
  if(!offPositionen.length)return;
  if(!confirm(`Wirklich alle ${offPositionen.length} Position(en) löschen?`))return;
  offPositionen=[];
  isDirty=true;
  renderOffPositionsTabelle();
 };
}
// Kopf- und Summenfelder wirken sofort auf die Summenanzeige.
["offRabattArt","offRabattWert","offMwst"].forEach(id=>{
 if($(id))$(id).addEventListener("input",()=>{isDirty=true;renderOffSummen()});
});

// ---- Katalog-Dialog --------------------------------------------------------
function offKatMaterialAnzeige(){
 // Schon Gewaehltes bleibt oben sichtbar, auch wenn die Suche etwas anderes
 // zeigt - sonst glaubt man, die Eingabe sei verloren.
 const gewaehlt=offKatAlleMaterialien().filter(x=>offZahl(offKatMengen[offKatSchluessel("mat",x[0])])>0);
 const drin={}; gewaehlt.forEach(x=>drin[String(x[0])]=true);
 return gewaehlt.concat(offKatTrefferMaterial().filter(x=>!drin[String(x[0])]));
}
function renderOffKatRaten(){
 const body=$("offKatRatenBody");
 if(!body)return;
 const raten=offKatRaten();
 if(!raten.length){
  body.innerHTML='<tr><td colspan="3" class="small">Es sind noch keine Stundenansätze erfasst – Einstellungen → Stundenansätze.</td></tr>';
  return;
 }
 body.innerHTML=raten.map(r=>{
  const k=offKatSchluessel("rate",r[0]);
  return `<tr><td>${esc(String(r[0]||""))}</td>
<td class="small" style="text-align:right;white-space:nowrap">CHF ${offFr(offZahl(r[1]))}</td>
<td><input type="number" step=".25" min="0" inputmode="decimal" data-off-kat-menge="${esc(k)}" value="${esc(String(offKatMengen[k]||""))}" placeholder="0"></td></tr>`;
 }).join("");
}
function renderOffKatMaterial(){
 const body=$("offKatMatBody");
 if(!body)return;
 const liste=offKatMaterialAnzeige();
 if(!liste.length){
  body.innerHTML=`<tr><td colspan="4" class="small">${offKatAlleMaterialien().length
   ?"Kein Treffer – anderes Stichwort oder EDV-Nr. versuchen."
   :"Es ist noch kein Regiematerial erfasst – Einstellungen → Regiematerial."}</td></tr>`;
  return;
 }
 body.innerHTML=liste.map(x=>{
  const k=offKatSchluessel("mat",x[0]);
  const dim=String(x[2]||"").trim();
  return `<tr><td class="small">${esc(String(x[0]||""))}</td>
<td>${esc(String(x[1]||""))}${dim?`<div class="small" style="color:var(--muted)">${esc(dim)}</div>`:""}</td>
<td class="small" style="text-align:right;white-space:nowrap">CHF ${offFr(offZahl(x[4]))}<div class="small" style="color:var(--muted)">${esc(String(x[3]||""))}</div></td>
<td><input type="number" step=".01" min="0" inputmode="decimal" data-off-kat-menge="${esc(k)}" value="${esc(String(offKatMengen[k]||""))}" placeholder="0"></td></tr>`;
 }).join("");
}
function renderOffKatHinweis(){
 if(!$("offKatHinweis"))return;
 const zeilen=offKatZeilen(offKatMengen,
   $("offKatAbschnittArbeit")?$("offKatAbschnittArbeit").value:"",
   $("offKatAbschnittMaterial")?$("offKatAbschnittMaterial").value:"");
 const summe=zeilen.reduce((s,z)=>s+offRappen(z.quantity*z.preis),0);
 $("offKatHinweis").textContent=zeilen.length
  ?`${zeilen.length} Position(en) · CHF ${offFr(summe)} zum Katalogpreis`
  :"Noch nichts gewählt – bei den gewünschten Zeilen eine Menge eintragen.";
 if($("offKatUebernehmen"))$("offKatUebernehmen").disabled=!zeilen.length;
}
function renderOffKatTabellen(){ renderOffKatRaten(); renderOffKatMaterial(); renderOffKatHinweis() }
function offKatOeffnen(){
 offKatMengen={}; offKatSuchtext="";
 if($("offKatSuche"))$("offKatSuche").value="";
 const da=offAbschnitte();
 const treffer=w=>da.find(t=>t.toLowerCase()===w.toLowerCase())||w;
 if($("offKatAbschnittArbeit"))$("offKatAbschnittArbeit").value=treffer("Arbeit");
 if($("offKatAbschnittMaterial"))$("offKatAbschnittMaterial").value=treffer("Material");
 if($("offKatAbschnitte"))$("offKatAbschnitte").innerHTML=da.map(t=>`<option value="${esc(t)}"></option>`).join("");
 renderOffKatTabellen();
 $("offKatalogModal").hidden=false;
}
function offKatUebernehmen(){
 const zeilen=offKatZeilen(offKatMengen,
   $("offKatAbschnittArbeit")?$("offKatAbschnittArbeit").value:"",
   $("offKatAbschnittMaterial")?$("offKatAbschnittMaterial").value:"");
 if(!zeilen.length)return 0;
 zeilen.forEach(z=>{
  offPositionEinfuegen(z);
  if(z.abschnitt)offSektionOffen.add(z.abschnitt);
 });
 isDirty=true;
 renderOffPositionsTabelle();
 if($("offKatalogModal"))$("offKatalogModal").hidden=true;
 return zeilen.length;
}
if($("offKatalogOeffnen"))$("offKatalogOeffnen").onclick=()=>offKatOeffnen();
if($("offKatAbbrechen"))$("offKatAbbrechen").onclick=()=>{$("offKatalogModal").hidden=true};
if($("offKatUebernehmen"))$("offKatUebernehmen").onclick=()=>offKatUebernehmen();
if($("offKatSuche")){
 $("offKatSuche").addEventListener("input",e=>{
  offKatSuchtext=e.target.value;
  renderOffKatMaterial();   // nur die Trefferliste - das Suchfeld behaelt den Fokus
 });
}
if($("offKatalogModal")){
 $("offKatalogModal").addEventListener("input",e=>{
  const f=e.target.closest?e.target.closest("[data-off-kat-menge]"):null;
  if(f){
   offKatMengen[f.dataset.offKatMenge]=e.target.value;
   renderOffKatHinweis();   // NICHT neu zeichnen: der Fokus bleibt im Feld
   return;
  }
  if(e.target.id==="offKatAbschnittArbeit"||e.target.id==="offKatAbschnittMaterial")renderOffKatHinweis();
 });
}

// ---- Projektauswahl (dieselben Bausteine wie ueberall) ---------------------
function setOffProjectField(projId){
 offSelectedProjectId=projId||null;
 const proj=(typeof allProjects!=="undefined"&&allProjects||[]).find(x=>x.id===offSelectedProjectId);
 if($("offProjectSearch"))$("offProjectSearch").value=proj?proj.name:"";
 if($("offProjectSelectedLabel"))$("offProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
}
if($("offProjectSearch")){
 const zeigen=e=>{
  const box=$("offProjectResults");
  box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-off-project")).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
 };
 $("offProjectSearch").addEventListener("input",zeigen);
 $("offProjectSearch").addEventListener("focus",e=>{e.target.select();zeigen(e)});
}
if($("offProjectResults")){
 $("offProjectResults").addEventListener("click",e=>{
  const it=e.target.closest("[data-pick-off-project]");if(!it)return;
  setOffProjectField(Number(it.dataset.pickOffProject));
  $("offProjectResults").innerHTML="";
 });
}

// ---- Formular oeffnen, anlegen, schliessen ---------------------------------
function updateOffFormTitle(){
 const h2=$("offTitelH2");
 if(h2){
  const t=$("offTitle")?$("offTitle").value:"";
  h2.textContent="🧾 "+((typeof eintragAdresse==="function")
   ?eintragAdresse({project_id:offSelectedProjectId},t||"Neue Offerte")
   :(t||"Neue Offerte"));
 }
 const meta=(typeof erstelltGeaendertText==="function")?erstelltGeaendertText(currentOfferteMeta):"";
 if($("offMetaInfo")){$("offMetaInfo").textContent=meta;$("offMetaInfo").hidden=!meta;}
}
// Gueltigkeitsdatum aus der Firmenvorgabe. Kein zweites Datum-Feld in der
// Datenbank: gespeichert wird das ausgerechnete Datum, nicht die Regel -
// sonst wuerde eine Aenderung der Vorgabe alte Offerten rueckwirkend
// umdatieren.
function offGueltigVorschlag(ab){
 const tage=Number((typeof offerteGueltigTage!=="undefined")?offerteGueltigTage:30)||30;
 const d=new Date((ab||new Date().toISOString().slice(0,10))+"T12:00:00");
 if(isNaN(d.getTime()))return "";
 d.setDate(d.getDate()+tage);
 return d.toISOString().slice(0,10);
}
function offPdfVorschauFreigeben(){
 if(offPdfVorschau&&offPdfVorschau.url){
  try{URL.revokeObjectURL(offPdfVorschau.url)}catch(e){}
 }
 offPdfVorschau=null;
}
function offFelderSetzen(o){
 const heute=new Date().toISOString().slice(0,10);
 $("offNr").value=(o&&o.offert_nr)||"";
 $("offTitle").value=(o&&o.title)||"";
 $("offDate").value=(o&&o.date)||heute;
 $("offGueltigBis").value=(o&&o.gueltig_bis)||(o?"":offGueltigVorschlag(heute));
 $("offKundeName").value=(o&&o.kunde_name)||"";
 $("offKundeZusatz").value=(o&&o.kunde_zusatz)||"";
 $("offKundeStrasse").value=(o&&o.kunde_strasse)||"";
 $("offKundePlzOrt").value=(o&&o.kunde_plz_ort)||"";
 // Vor-/Schlusstext: bei einer NEUEN Offerte die Firmenvorgabe, bei einer
 // gespeicherten das, was dort steht - auch wenn es leer ist. Sonst
 // erschiene ein geloeschter Text beim naechsten Oeffnen wieder.
 $("offVortext").value=o?(o.vortext||""):((typeof offerteVortext!=="undefined"&&offerteVortext)||"");
 $("offSchlusstext").value=o?(o.schlusstext||""):((typeof offerteSchlusstext!=="undefined"&&offerteSchlusstext)||"");
 $("offRabattArt").value=(o&&o.rabatt_art)||"prozent";
 $("offRabattWert").value=(o&&Number(o.rabatt_wert))||0;
 $("offMwst").value=o?offMwstZahl(o.mwst_satz):offMwstZahl(typeof defaultVat!=="undefined"?defaultVat:"8.1 %");
 offPositionen=(o&&Array.isArray(o.positionen))?o.positionen.map(p=>({...p})):[];
 offSektionOffen=new Set(offAbschnitte());
 offPdfAbgelegt=(o&&o.pdf_path)?{path:o.pdf_path,name:o.pdf_name||"Offerte.pdf"}:null;
 offPdfVorschauFreigeben();
 renderOffPositionsTabelle();
 renderOffPdfBereich();
}
function neueOfferte(){
 isDirty=false;
 offEditReturnTo="cockpitOfferten";
 currentOfferteId=null;
 currentOfferteMeta={};
 offFelderSetzen(null);
 setOffProjectField(typeof cockpitProjectId!=="undefined"?cockpitProjectId:null);
 $("offerteEditModal").hidden=false;
 updateOffFormTitle();
}
function openOfferte(o){
 isDirty=false;
 offEditReturnTo="cockpitOfferten";
 currentOfferteId=o.id;
 currentOfferteMeta={created_by:o.created_by,created_at:o.created_at,updated_by:o.updated_by,updated_at:o.updated_at};
 offFelderSetzen(o);
 setOffProjectField(o.project_id);
 $("offerteEditModal").hidden=false;
 updateOffFormTitle();
}
if($("offTitle"))$("offTitle").addEventListener("input",()=>{isDirty=true;updateOffFormTitle()});
async function offEditZurueck(){
 if(offEditReturnTo==="cockpitOfferten"&&typeof cockpitProjectId!=="undefined"&&cockpitProjectId
    &&typeof zurueckInsCockpit==="function"){
  await zurueckInsCockpit("offerten");
 }else if($("startScreen")&&typeof showStart==="function"){
  showStart();
 }
 offEditReturnTo="cockpitOfferten";
}
if($("cancelOfferte")){
 $("cancelOfferte").onclick=async()=>{
  offPdfVorschauFreigeben();
  $("offerteEditModal").hidden=true;
  await offEditZurueck();
  isDirty=false;
 };
}
if($("startFromOfferteEdit"))$("startFromOfferteEdit").onclick=()=>{
 offPdfVorschauFreigeben();
 $("offerteEditModal").hidden=true;
 if(typeof goToStart==="function")goToStart();
};

// ---- Speichern -------------------------------------------------------------
// company_id/created_by/… werden NICHT mitgeschickt: DEFAULT my_company_id()
// bzw. der Trigger set_creator_editor_meta_offerten setzen sie serverseitig.
async function offerteSpeichern(){
 const title=String($("offTitle").value||"").trim();
 if(!title){alert("Bitte eine Bezeichnung für die Offerte eintragen.");return false}
 if(!offSelectedProjectId){alert("Eine Offerte gehört immer zu einem Projekt.\n\nBitte oben ein Projekt wählen.");return false}
 const d=offFormularDaten();
 const payload={
  project_id:offSelectedProjectId,
  offert_nr:String(d.offert_nr||"").trim(),
  title,
  date:d.date,
  gueltig_bis:d.gueltig_bis||null,
  kunde_name:String(d.kunde_name||"").trim(),
  kunde_zusatz:String(d.kunde_zusatz||"").trim(),
  kunde_strasse:String(d.kunde_strasse||"").trim(),
  kunde_plz_ort:String(d.kunde_plz_ort||"").trim(),
  vortext:String(d.vortext||""),
  schlusstext:String(d.schlusstext||""),
  positionen:offPositionen,
  rabatt_art:d.rabatt_art==="betrag"?"betrag":"prozent",
  rabatt_wert:offZahl(d.rabatt_wert),
  mwst_satz:offMwstZahl(d.mwst_satz),
  pdf_path:offPdfAbgelegt?offPdfAbgelegt.path:null,
  pdf_name:offPdfAbgelegt?offPdfAbgelegt.name:null
 };
 // 0 betroffene Zeilen gelten NICHT als Erfolg: ein von RLS blockiertes
 // Schreiben meldet in PostgREST keinen Fehler, es betrifft still 0 Zeilen.
 if(currentOfferteId){
  const {data,error}=await sb.from("offerten").update(payload).eq("id",currentOfferteId).select();
  if(error)throw error;
  if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return false}
  currentOfferteMeta={...currentOfferteMeta,updated_by:data[0].updated_by,updated_at:data[0].updated_at};
 }else{
  const {data,error}=await sb.from("offerten").insert(payload).select();
  if(error)throw error;
  if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return false}
  currentOfferteId=data[0].id;
  currentOfferteMeta={created_by:data[0].created_by,created_at:data[0].created_at,
                      updated_by:data[0].updated_by,updated_at:data[0].updated_at};
 }
 isDirty=false;
 updateOffFormTitle();
 return true;
}
if($("saveOfferte")){
 $("saveOfferte").onclick=async()=>{
  $("saveOfferte").disabled=true;
  try{
   if(await offerteSpeichern()){
    offPdfVorschauFreigeben();
    $("offerteEditModal").hidden=true;
    await offEditZurueck();
   }
  }catch(e){alert("Fehler beim Speichern: "+(e&&e.message?e.message:e))}
  $("saveOfferte").disabled=false;
 };
}

// ---- PDF: erzeugen, ansehen, im Projekt ablegen ----------------------------
// Derselbe Storage-Pfad wie beim hochgeladenen Offert-PDF der Import-Offerte
// (js/63): "project-files/<projectId>/…" ist ueber die bestehenden
// Storage-Policies rein strukturell autorisiert - keine neue Migration.
async function offPdfHochladen(projectId,blob,name){
 const path=`project-files/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.pdf`;
 const {error}=await sb.storage.from("measurements").upload(path,blob,{contentType:"application/pdf",upsert:false});
 if(error)throw error;
 return {path,name};
}
function renderOffPdfBereich(){
 const box=$("offPdfBereich");
 if(!box)return;
 const teile=[];
 if(offPdfVorschau){
  teile.push(`<div class="report-row">
<div class="report-row-info"><b>📄 ${esc(offPdfVorschau.name)}</b><span>erzeugt – noch nicht abgelegt</span></div>
<div class="report-row-actions">
<button type="button" class="blue" data-off-pdf-ansehen>Ansehen</button>
<button type="button" class="green" data-off-pdf-ablegen>Im Projekt ablegen</button>
</div>
</div>`);
 }
 if(offPdfAbgelegt&&offPdfAbgelegt.path){
  teile.push(`<div class="report-row">
<div class="report-row-info"><b>📕 ${esc(offPdfAbgelegt.name)}</b><span>im Projekt abgelegt</span></div>
<div class="report-row-actions">
<button type="button" class="blue" data-off-pdf-oeffnen>Öffnen</button>
<button type="button" class="red" data-off-pdf-entfernen title="Aus der Offerte entfernen">✕</button>
</div>
</div>`);
 }
 if(!teile.length){
  teile.push('<div class="small" style="color:var(--muted)">Noch kein PDF erzeugt.</div>');
 }
 box.innerHTML=teile.join("");
}
function offPdfErzeugen(){
 const dok=offDokument(offFormularDaten(),offFirmaFuerPdf());
 const doc=offPdfBauen(dok);
 const blob=doc.output("blob");
 offPdfVorschauFreigeben();
 offPdfVorschau={blob,url:URL.createObjectURL(blob),name:offPdfDateiname(offFormularDaten())};
 renderOffPdfBereich();
 return offPdfVorschau;
}
if($("offPdfErzeugen")){
 $("offPdfErzeugen").onclick=()=>{
  if(!offPositionen.length){alert("Die Offerte hat noch keine Positionen.");return}
  if(!offPdfVerfuegbar()){
   alert("Die PDF-Bibliothek konnte nicht geladen werden.\n\nBitte die Seite einmal neu laden.");
   return;
  }
  try{
   const v=offPdfErzeugen();
   if($("offPdfRahmen")){$("offPdfRahmen").src=v.url;$("offPdfRahmen").hidden=false}
  }catch(e){alert("Das PDF konnte nicht erzeugt werden: "+(e&&e.message?e.message:e))}
 };
}
if($("offPdfBereich")){
 $("offPdfBereich").addEventListener("click",async e=>{
  if(e.target.closest("[data-off-pdf-ansehen]")&&offPdfVorschau){
   window.open(offPdfVorschau.url,"_blank","noopener");
   return;
  }
  if(e.target.closest("[data-off-pdf-entfernen]")){
   if(!confirm("Das abgelegte PDF aus dieser Offerte entfernen?\n\nDie Datei selbst bleibt im Projekt-Speicher."))return;
   offPdfAbgelegt=null;
   isDirty=true;
   renderOffPdfBereich();
   return;
  }
  const oeffnen=e.target.closest("[data-off-pdf-oeffnen]");
  if(oeffnen&&offPdfAbgelegt&&offPdfAbgelegt.path){
   // Der Bucket ist privat: das Fenster muss synchron im Klick geoeffnet
   // und danach befuellt werden, sonst blockiert es der Browser.
   const w=window.open("","_blank","noopener");
   try{
    const url=await storageSignedUrl(offPdfAbgelegt.path);
    if(w)w.location=url; else window.location=url;
   }catch(err){ if(w)w.close(); alert("Das PDF konnte nicht geöffnet werden: "+(err&&err.message?err.message:err)) }
   return;
  }
  const ablegen=e.target.closest("[data-off-pdf-ablegen]");
  if(ablegen&&offPdfVorschau){
   if(!offSelectedProjectId){alert("Eine Offerte gehört immer zu einem Projekt.\n\nBitte oben ein Projekt wählen.");return}
   ablegen.disabled=true;
   try{
    offPdfAbgelegt=await offPdfHochladen(offSelectedProjectId,offPdfVorschau.blob,offPdfVorschau.name);
    // Sofort mitspeichern: ein hochgeladenes PDF, das nur im Formular
    // steht, waere nach einem Abbruch eine verwaiste Datei im Speicher.
    await offerteSpeichern();
    offPdfVorschauFreigeben();
    renderOffPdfBereich();
    if($("offPdfRahmen")){$("offPdfRahmen").hidden=true;$("offPdfRahmen").src=""}
   }catch(err){
    offPdfAbgelegt=null;
    alert("Das PDF konnte nicht abgelegt werden: "+(err&&err.message?err.message:err));
   }
   ablegen.disabled=false;
  }
 });
}

// ---- Cockpit ---------------------------------------------------------------
if(typeof COCKPIT_BEREICHE==="object"&&COCKPIT_BEREICHE){
 COCKPIT_BEREICHE.offerten={
  count:"cockpitOffertenCount",body:"cockpitOffertenBody",card:"cockpitOffertenCard",
  mark:"cockpitOffertenMark",stand:"cockpitOffertenStand",leer:"Noch keine",
  load:id=>loadProjectOfferten(id)
 };
}
// Gegatet VOR jeder Abfrage: ein nicht freigeschalteter Benutzer loest gar
// keine Netzwerkanfrage aus. Dieselbe Freischaltung wie die Import-Offerte
// (offerteZugriff aus js/63).
async function loadProjectOfferten(projectId){
 const box=$("cockpitOffertenBody");
 if(typeof offerteZugriff==="undefined"||!offerteZugriff){
  if(box)box.innerHTML="";
  projectOffertenCache=[];
  return 0;
 }
 if(box)box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("offerten").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){
  if(box)box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  projectOffertenCache=[];
  return undefined;
 }
 const list=data||[];
 projectOffertenCache=list;
 if(box)box.innerHTML=list.length?list.map(o=>{
  const r=offRechnung(o.positionen,o.rabatt_art,o.rabatt_wert,o.mwst_satz);
  const zusatz=[String(o.offert_nr||"").trim(),o.date?datumCH(o.date):"","CHF "+offFr(r.total)]
   .filter(Boolean).join(" · ");
  return `<div class="report-row">
<div class="report-row-info"><b>${esc(o.title||"Ohne Bezeichnung")}</b><span>${esc(zusatz)}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-offerte="${o.id}">Öffnen</button>
<button class="red" data-del-project-offerte="${o.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine eigene Offerte zu diesem Projekt.</div>';
 return list.length;
}
if($("cockpitNeueOfferteErstellen")){
 $("cockpitNeueOfferteErstellen").onclick=()=>{
  if(typeof cockpitProjectId==="undefined"||!cockpitProjectId)return;
  if(typeof offerteZugriff==="undefined"||!offerteZugriff)return;
  neueOfferte();
 };
}
// Eigener Listener auf #cockpitWorkArea - js/24, js/09 und js/63 haben dort
// bereits je einen; mehrere Listener auf demselben Knoten sind unproblematisch.
if($("cockpitWorkArea")){
 $("cockpitWorkArea").addEventListener("click",e=>{
  const openO=e.target.closest("[data-open-project-offerte]");
  if(openO){
   const o=projectOffertenCache.find(x=>x.id===Number(openO.dataset.openProjectOfferte));
   if(o)openOfferte(o);
   return;
  }
  const delO=e.target.closest("[data-del-project-offerte]");
  if(delO){
   if(!confirm("Diese Offerte wirklich löschen?"))return;
   sb.from("offerten").delete().eq("id",Number(delO.dataset.delProjectOfferte)).then(({error})=>{
    if(error){alert("Fehler: "+error.message);return}
    if(typeof cockpitBereichAktualisieren==="function")cockpitBereichAktualisieren("offerten");
   });
  }
 });
}
