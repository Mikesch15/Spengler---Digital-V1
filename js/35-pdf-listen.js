"use strict";
// ============================================================================
// PDF-Listenauswahl - EIN Dialog für alle Massaufnahmen und das Ausmass
// ============================================================================
// Vor dem Erzeugen eines PDFs wählt der Benutzer, welche Listen darauf
// erscheinen. Es gibt dafür genau EINEN Dialog und EINE Reihenfolge - kein
// Modul baut sich einen eigenen.
//
// Wie es zusammenhängt:
//   1  Die Druckfunktion baut ihr Dokument wie bisher als ein HTML-Stück
//      zusammen. Jeder Abschnitt beginnt mit <div class="eb-section-head">…
//      (bzw. "am-section-head" beim Ausmass) - diese Überschriften gab es
//      schon, sie werden hier nur als Trennstellen benutzt.
//   2  pdfAbschnitteZerlegen() schneidet das Dokument an diesen Stellen auf.
//   3  Jede Überschrift wird über PDF_LISTE_FUER einer der zehn Kategorien
//      zugeordnet. Was ein Modul gar nicht hat, ist im Dialog ausgegraut.
//   4  pdfListenZusammenbauen() setzt NUR die gewählten Abschnitte wieder
//      zusammen - nicht ausgewählte werden gar nicht erst erzeugt und nicht
//      per CSS versteckt. Ein leerer Abschnitt kann so nicht entstehen.
//
// Der Kopf (Firma, Projekt, Objektadresse, Kunde, Datum, Art) steht vor der
// ersten Überschrift und wird IMMER gedruckt - er ist keine wählbare Liste.
// ============================================================================

// Die zehn Kategorien in ihrer verbindlichen Reihenfolge.
const PDF_LISTEN=[
 {key:"kopf",          nr:1,  name:"Kopf / Projekt / Adresse", immer:true},
 {key:"zusammenfassung",nr:2, name:"Zusammenfassung"},
 {key:"masse",         nr:3,  name:"Massaufnahme / Masse"},
 {key:"stueckliste",   nr:4,  name:"Stückliste"},
 {key:"rollenblech",   nr:5,  name:"Rollenblech-Zuschnitt"},
 {key:"ausmass",       nr:6,  name:"Ausmass"},
 {key:"material",      nr:7,  name:"Materialliste"},
 {key:"kontrolle",     nr:8,  name:"Kontrolle / Hinweise"},
 {key:"fotos",         nr:9,  name:"Fotos"},
 {key:"skizze",        nr:10, name:"Skizze"}
];
const PDF_LISTEN_REIHENFOLGE=PDF_LISTEN.map(x=>x.key);

// Welche Abschnitts-Überschrift gehört zu welcher Kategorie.
// Die Überschriften stammen aus den bestehenden Druckfunktionen - hier wird
// nichts umbenannt, nur zugeordnet.
const PDF_LISTE_FUER={
 // 2 · Zusammenfassung - Ergebnisse in Kürze
 "blechfläche":"zusammenfassung", "abwicklung":"zusammenfassung",
 "hauptresultate":"zusammenfassung", "weitere resultate":"zusammenfassung",
 // 3 · Massaufnahme / Masse - Eingaben und Zeichnungen
 "angaben":"masse", "eingaben":"masse", "masse":"masse", "schnitt":"masse",
 "grundriss":"masse", "profil":"masse", "profil (querschnitt)":"masse",
 "profilskizze":"masse", "plan":"masse", "kehlblech":"masse",
 // 4 · Stückliste - alles, was Stück für Stück aufgelistet wird
 "stücke":"stueckliste", "stückliste":"stueckliste", "segmente":"stueckliste",
 "rinnenstücke":"stueckliste", "scharen":"stueckliste",
 "zuschnittliste":"stueckliste", "schieber und zuschnitt":"stueckliste",
 "dilatationselemente":"stueckliste", "positionen":"stueckliste",
 "bleilappen":"stueckliste",
 // 5 · Rollenblech-Zuschnitt
 "zuschnitt aus rollenblech":"rollenblech",
 "normlängen und verschnitt":"rollenblech",
 // 6 · Ausmass
 "ausmass":"ausmass",
 // 7 · Materialliste
 "materialliste":"material", "material":"material",
 // 8 · Kontrolle / Hinweise
 "notiz":"kontrolle", "kontrolle":"kontrolle", "hinweise":"kontrolle",
 // 9/10 · Bilder
 "foto":"fotos", "fotos":"fotos", "skizze":"skizze", "skizzen":"skizze"
};

// "Foto 2 von 3", "Positionen (12)" -> "foto", "positionen"
function pdfTitelSchluessel(titel){
 return String(titel||"").replace(/\s*\(\d+\)\s*$/,"")
   .replace(/\s+\d+\s+von\s+\d+\s*$/i,"")
   .replace(/\s+/g," ").trim().toLowerCase();
}
// Ordnet eine Überschrift ihrer Kategorie zu. Eine unbekannte Überschrift
// landet bewusst bei "masse" statt zu verschwinden - lieber zu viel drucken
// als eine Liste stillschweigend unterschlagen.
function pdfKategorieFuer(titel){
 return PDF_LISTE_FUER[pdfTitelSchluessel(titel)]||"masse";
}

// Schneidet ein fertiges Druckdokument an seinen Abschnitts-Überschriften auf.
// Rückgabe: {kopf, teile:[{titel,key,html}]}
// Geschnitten wird ueber den DOM, nicht mit einem regulaeren Ausdruck: eine
// Skizze steht als <div class="sketch-page"><div class="eb-section-head">…
// im Dokument. Ein reiner Textschnitt an der Ueberschrift wuerde diesen
// Rahmen zerreissen und offene <div> hinterlassen. So bleibt jedes
// Wurzelelement als Ganzes bei seinem Abschnitt.
function pdfAbschnitteZerlegen(html,klasse){
 const kl=klasse||"eb-section-head";
 const wurzel=document.createElement("div");
 wurzel.innerHTML=String(html||"");
 let kopf=""; const teile=[]; let aktuell=null;
 Array.from(wurzel.childNodes).forEach(n=>{
  const el=n.nodeType===1?n:null;
  const ueber=el?(el.classList&&el.classList.contains(kl)?el:el.querySelector("."+kl)):null;
  if(ueber){aktuell={titel:(ueber.textContent||"").trim(),html:""};teile.push(aktuell)}
  const stueck=el?el.outerHTML:(n.textContent||"");
  if(aktuell)aktuell.html+=stueck; else kopf+=stueck;
 });
 teile.forEach(t=>{t.key=pdfKategorieFuer(t.titel)});
 return {kopf,teile};
}

// Welche Kategorien hat dieses Dokument überhaupt?
function pdfVerfuegbareListen(zerlegt){
 const da=new Set();
 (zerlegt.teile||[]).forEach(t=>da.add(t.key));
 return da;
}

// Setzt das Dokument aus den GEWÄHLTEN Abschnitten neu zusammen - in der
// verbindlichen Reihenfolge aus PDF_LISTEN. Innerhalb einer Kategorie bleibt
// die ursprüngliche Reihenfolge des Moduls erhalten (z. B. Angaben, dann
// Schnitt, dann Grundriss).
function pdfListenZusammenbauen(zerlegt,auswahl){
 const gewaehlt=auswahl instanceof Set?auswahl:new Set(auswahl||[]);
 let h=zerlegt.kopf||"";
 PDF_LISTEN_REIHENFOLGE.forEach(k=>{
  if(k==="kopf")return;
  if(!gewaehlt.has(k))return;
  (zerlegt.teile||[]).forEach(t=>{if(t.key===k)h+=t.html});
 });
 return h;
}

// ---------------------------------------------------------------------------
// Der Dialog
// ---------------------------------------------------------------------------
// Er löst mit {auswahl,win} auf. Das Druckfenster wird bewusst IM
// Klick-Handler von "PDF erstellen" geöffnet: window.open() braucht eine
// frische Benutzeraktion, sonst blockiert der Browser das Fenster.
let pdfListenAufloesen=null;
function pdfListenAuswahl(verfuegbar,titel){
 const modal=$("pdfListenModal");
 if(!modal)return Promise.resolve({auswahl:new Set(PDF_LISTEN_REIHENFOLGE),win:window.open("","_blank")});
 const da=verfuegbar instanceof Set?verfuegbar:new Set(verfuegbar||[]);
 const box=$("pdfListenBox");
 box.innerHTML=PDF_LISTEN.filter(x=>!x.immer).map(x=>{
  const hat=da.has(x.key);
  return `<label class="pdf-liste${hat?"":" pdf-liste-aus"}">
<input type="checkbox" data-pdf-liste="${x.key}"${hat?" checked":" disabled"}>
<span class="pdf-liste-name">${esc(x.name)}</span>
${hat?"":'<span class="pdf-liste-hinweis">nicht vorhanden</span>'}</label>`;
 }).join("");
 $("pdfListenTitel").textContent=titel||"PDF erstellen";
 modal.hidden=false;
 return new Promise(fertig=>{pdfListenAufloesen=fertig});
}
function pdfListenGewaehlt(){
 const s=new Set(["kopf"]);
 document.querySelectorAll("#pdfListenBox [data-pdf-liste]").forEach(e=>{
  if(e.checked&&!e.disabled)s.add(e.dataset.pdfListe);
 });
 return s;
}
function pdfListenSchliessen(ergebnis){
 const modal=$("pdfListenModal");
 if(modal)modal.hidden=true;
 const f=pdfListenAufloesen; pdfListenAufloesen=null;
 if(f)f(ergebnis);
}

// Der eine Weg, den jede Druckfunktion geht.
//  html   fertiges Dokument (Kopf + alle Abschnitte)
//  klasse "eb-section-head" bzw. "am-section-head"
//  opt.listen  "alle" oder eine Liste von Schlüsseln -> ohne Dialog drucken
// Rückgabe: {html,win} oder null, wenn der Benutzer abbricht.
async function pdfDruckVorbereiten(html,klasse,opt){
 const zerlegt=pdfAbschnitteZerlegen(html,klasse);
 const da=pdfVerfuegbareListen(zerlegt);
 const wunsch=opt&&opt.listen;
 if(wunsch){
  const auswahl=wunsch==="alle"?new Set(PDF_LISTEN_REIHENFOLGE)
    :new Set([].concat(wunsch).concat(["kopf"]));
  const win=window.open("","_blank");
  if(!win){alert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return null}
  return {html:pdfListenZusammenbauen(zerlegt,auswahl),win};
 }
 const r=await pdfListenAuswahl(da,opt&&opt.titel);
 if(!r)return null;
 if(!r.win){alert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return null}
 return {html:pdfListenZusammenbauen(zerlegt,r.auswahl),win:r.win};
}

// --- Bedienung -------------------------------------------------------------
if($("pdfListenAlle"))$("pdfListenAlle").onclick=()=>{
 document.querySelectorAll("#pdfListenBox [data-pdf-liste]").forEach(e=>{if(!e.disabled)e.checked=true});
};
if($("pdfListenKeine"))$("pdfListenKeine").onclick=()=>{
 document.querySelectorAll("#pdfListenBox [data-pdf-liste]").forEach(e=>{e.checked=false});
};
if($("pdfListenAbbrechen"))$("pdfListenAbbrechen").onclick=()=>pdfListenSchliessen(null);
if($("pdfListenOk"))$("pdfListenOk").onclick=()=>{
 // Fenster HIER öffnen - dieser Klick ist die frische Benutzeraktion.
 const auswahl=pdfListenGewaehlt();
 const win=window.open("","_blank");
 pdfListenSchliessen({auswahl,win});
};
