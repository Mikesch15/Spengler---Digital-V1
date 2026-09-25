"use strict";
// ---------------------------------------------------------------------------
// Materialbestand der Firma (v3.27)
//
// Was liegt an NEUEM Material im Betrieb - Tafeln, Rollen, Stangen. Bewusst
// KEINE Lagerverwaltung und kein ERP: es wird nichts automatisch abgebucht,
// nichts bestellt und kein Bestand fortgeschrieben. Der Bestand ist ein
// Nachschlagewerk und - das ist sein eigentlicher Zweck seit v3.27 - die
// Bruecke zwischen der Massaufnahme und dem exakten Material.
//
// Warum diese Bruecke noetig ist:
//   measurement_materials (was die Massaufnahme kennt) hat NUR die
//   Werkstoff - keine Staerke, keine Ausfuehrung.
//   materials (die Artikelliste der Firma) hat beides bereits, aber die
//   Massaufnahme zeigt nicht darauf.
// Traegt die Firma hier ein, welche Staerke und Ausfuehrung sie fuer eine
// Werkstoff fuehrt, ist der Bedarf eindeutig - und nur dann darf ein Rest
// automatisch verwendet werden (restBedarfMerkmale() in js/42).
//
// Nichts davon ist hart verdrahtet: Werkstoffe kommen aus
// measurement_materials, Artikel aus materials - beide firmenspezifisch.
//
// v3.33: Dazu kommt die FORM - Rolle oder Tafel. Bis v3.32 rechnete der
// Zuschnitt ausschliesslich mit Rollenblech (Abschnitt abziehen, quer in
// Streifen teilen). Eine Tafel hat dagegen eine feste Laenge; geometrisch ist
// sie nichts anderes als ein Abschnitt mit fester Laenge und fester Breite.
// Deshalb stehen bei 'tafel' Laenge und Breite hier am Eintrag - und zwar in
// den Spalten laenge_mm/breite_mm, die es seit v3.27 gibt (v3.31 hat sie nur
// aus dem Formular genommen, nie geloescht). Es kommt keine neue Massspalte
// dazu.
//
// Bei 'rolle' bleibt es bei den firmenweiten Rollenbreiten (Einstellungen ->
// Allgemein): eine Rolle hat keine feste Laenge, und ihre Breite gehoert zum
// Lager der ganzen Firma, nicht zum einzelnen Artikel.
// ---------------------------------------------------------------------------

function lagZahl(v){const n=Number(v);return Number.isFinite(n)?n:0}
function lagNummer(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}

// Der Artikel einer Firma - dort stehen Staerke (dim) und Ausfuehrung (im
// Namen) bereits. Wird ein Artikel gewaehlt, uebernimmt das Formular sie als
// Vorschlag; geraten wird nichts, beide bleiben frei aenderbar.
// settings.materials ist seit je ein Array aus Arrays
// [edv_nr, name, dim, unit, price]; die Datenbank-IDs stehen parallel dazu in
// materialIds (js/05). Beides wird hier zu einer Liste zusammengefuehrt -
// eine zweite Artikelliste wird ausdruecklich NICHT gebaut.
function lagArtikelListe(){
 const roh=(typeof settings==="object"&&settings&&Array.isArray(settings.materials))?settings.materials:[];
 const ids=(typeof materialIds!=="undefined"&&Array.isArray(materialIds))?materialIds:[];
 return roh.map((m,i)=>({id:ids[i]||null,edv_nr:m[0],name:m[1],dim:m[2],unit:m[3]}))
           .filter(a=>a.id!==null);
}
// ---- Eine neue Katalogposition anlegen (v3.179) ---------------------------
// EINE Stelle, an der eine Position entsteht. Bis v3.178 stand das nur in der
// Lagerverwaltung (js/68) und war an deren Formularfelder gebunden; der
// Materialbestand konnte deshalb keine anlegen - ein neues Blech musste
// zweimal erfasst werden: erst die Position im Katalog, dann hier das Format.
//
// Hier steht nur das Anlegen selbst. WELCHE Werte hineingehen und wie sie
// geprueft werden, bleibt beim jeweiligen Formular - die Lagerverwaltung
// prueft ihre EDV-Nr. weiterhin selbst, mit ihrer eigenen Meldung.
//
// Wichtig sind die PARALLELEN Listen: settings.materials ist seit je ein
// Array aus Arrays, materialIds, materialWerkstoffe (v3.176) und
// materialFormate (v3.177) laufen daneben und werden ueber denselben Index
// angesprochen. Wer nur zwei davon nachzieht, bringt sie aus dem Tritt -
// genau das war bis v3.178 der Fall.
async function katalogPositionAnlegen(werte){
 const w=werte||{};
 const satz={
  edv_nr:(w.edv_nr||"").trim(),
  name:(w.name||"").trim(),
  dim:(w.dim||"").trim(),
  unit:(w.unit||"").trim()||"Stk.",
  price:Number.isFinite(Number(w.price))?Number(w.price):0
 };
 if(w.werkstoff_id!==undefined)satz.werkstoff_id=w.werkstoff_id;
 const {data,error}=await sb.from("materials").insert(satz).select("*");
 if(error)return {id:null,fehler:error.message,rls:/permission|policy|row-level/i.test(error.message||"")};
 // Ein von RLS blockiertes Schreiben meldet keinen Fehler, es betrifft still
 // 0 Zeilen (CLAUDE.md 24.1) - 0 gilt deshalb NICHT als Erfolg.
 if(!data||!data.length)return {id:null,fehler:"",rls:false};
 const m=data[0];
 if(typeof settings==="object"&&settings&&Array.isArray(settings.materials))
  settings.materials.push([m.edv_nr,m.name,m.dim,m.unit,m.price]);
 if(typeof materialIds!=="undefined"&&Array.isArray(materialIds))materialIds.push(m.id);
 if(typeof materialWerkstoffe!=="undefined"&&Array.isArray(materialWerkstoffe))
  materialWerkstoffe.push(m.werkstoff_id??null);
 if(typeof materialFormate!=="undefined"&&Array.isArray(materialFormate))
  materialFormate.push({staerke_mm:m.staerke_mm??null,ausfuehrung:m.ausfuehrung??null,
    form:m.form??null,laenge_mm:m.laenge_mm??null,breite_mm:m.breite_mm??null});
 return {id:m.id,fehler:null,rls:false};
}

function lagArtikel(id){
 const n=lagNummer(id);
 if(n===null)return null;
 return lagArtikelListe().find(a=>lagNummer(a.id)===n)||null;
}
// v3.177: Traegt der Artikel ein Blech-Format, steht es hier mit dabei. Das
// ist kein Schoenheitsfehler-Fix, sondern der Grund fuer diese Stufe: die
// Positionen 102.01/102.02/102.03 heissen ALLE DREI "Kupferblech", und in der
// Lagerverwaltung standen dadurch drei gleich benannte Produkte. Wer eines
// ausscannte, riet, ob er 0,6 oder 1,0 mm erwischt.
//
// Es wird bewusst an dieser EINEN Stelle ergaenzt: lagArtikelText() ist das
// Etikett eines Artikels in der ganzen App - Lagerverwaltung, Buchen-Dialog,
// Ausbuchen aus der Massaufnahme, Produktsuche, Katalogmeldungen. Damit
// stimmt es ueberall gleichzeitig, und die Suchfelder, die auf diesem Text
// filtern (js/68), finden ab jetzt auch nach Staerke und Form.
//
// dim ist der unstrukturierte Vorlaeufer der Staerke ("0.60"). Wo ein echtes
// Format steht, tritt es an dessen Stelle statt daneben - sonst stuende die
// Staerke zweimal da.
function lagArtikelFormatText(a){
 const f=(typeof artikelFormat==="function")?artikelFormat(a&&a.id):null;
 if(!f)return "";
 const t=[];
 const st=lagNummer(f.staerke_mm);
 if(st!==null)t.push(String(st).replace(".",",")+" mm");
 if((f.ausfuehrung||"").trim())t.push(f.ausfuehrung.trim());
 const form=lagFormText(f.form);
 const tafel=lagTafelText(f);
 if(form)t.push(form==="Tafel"&&tafel?(form+" "+tafel):form);
 return t.join(" · ");
}
function lagArtikelText(a){
 if(!a)return "";
 const fmt=lagArtikelFormatText(a);
 return (a.edv_nr?a.edv_nr+" ":"")+(a.name||"")+(fmt?" · "+fmt:(a.dim?" · "+a.dim:""));
}
function lagMaterialName(id){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(id):null;
 return m?m.name:"";
}

// ---- Rolle oder Tafel (v3.33) ---------------------------------------------
// Genau zwei Werte, dieselben wie in der Datenbank-Constraint. NULL heisst
// "nicht angegeben" - dann verhaelt sich der Zuschnitt wie bis v3.32 (Rolle).
// v3.179: Der Wert, mit dem die Artikel-Auswahl sagt "es gibt ihn noch nicht".
// Derselbe Gedanke wie LAGER_NEUE_POSITION in js/68 - dort heisst er "__neu".
const LAG_NEUE_POSITION="__neu";
const LAG_FORMEN=Object.freeze([
 {wert:"rolle",text:"Rolle"},
 {wert:"tafel",text:"Tafel"}
]);
function lagForm(v){
 const t=String(v===null||v===undefined?"":v).trim().toLowerCase();
 return (t==="rolle"||t==="tafel")?t:null;
}
function lagFormText(v){
 const f=lagForm(v);
 const e=LAG_FORMEN.find(x=>x.wert===f);
 return e?e.text:"";
}
// Das Tafelformat als Text - nur wenn beide Masse da sind, sonst nichts.
function lagTafelText(l){
 const a=lagNummer(l&&l.laenge_mm), b=lagNummer(l&&l.breite_mm);
 return (a!==null&&b!==null)?(lagMm(a)+" × "+lagMm(b)+" mm"):"";
}
function lagMm(v){return Math.round(lagZahl(v)).toLocaleString("de-CH")}
// Ein bestehender Eintrag ohne Form: die Firma hat die Angabe bis v3.32
// mangels Feld teils in die NOTIZ geschrieben ("Rolle", "Tafel"). Das wird
// beim Bearbeiten als VORSCHLAG uebernommen und ausdruecklich als solcher
// gekennzeichnet - gespeichert wird erst, wenn jemand bestaetigt. Geraten
// wird also nichts, und in der Datenbank aendert sich von allein nichts.
function lagFormAusNotiz(l){
 if(lagForm(l&&l.form)!==null)return null;
 return lagForm((l&&l.notiz)||"");
}

// ---- Die Bleche, die die Firma fuehrt (v3.177) -----------------------------
// EINE Quelle. Bis v3.176 war ein gefuehrtes Blech eine Zeile in der Tabelle
// lagerbestand, die per artikel_id auf den Katalogartikel zeigte - der Artikel
// trug den Namen, die Lagerzeile das Format. Zwei Datensaetze fuer EIN Blech.
//
// Ab jetzt traegt der Artikel sein Format selbst (Migration
// artikel_traegt_sein_blechformat). Das Kriterium ist die FORM: wer eine Form
// hat, ist ein Blech, das die Firma fuehrt. Schrauben und Dichtband haben
// keine und bleiben aussen vor - ohne Liste, ohne Schalter, ohne Pflege.
//
// Zurueckgegeben wird GENAU die Gestalt, die die bisherigen Leser erwarten
// (js/42 restBedarfMerkmale/restBedarfForm, js/61 measStaerkenFuer, die Liste
// hier). Das ist Absicht: die Zuschnitt-Logik ist durchgerechnet und geprueft,
// sie soll sich nicht aendern - sie bekommt nur eine andere Quelle. Der
// Werkstoff kommt aus artikelWerkstoffId() (js/01, seit v3.176) und wird als
// material_id gefuehrt, weil genau so danach gefiltert wird.
//
// id ist die Artikel-Id: der Artikel IST der Eintrag, es gibt daneben keinen
// zweiten mehr.
function lagFormate(){
 if(typeof artikelFormat!=="function")return [];
 return lagArtikelListe().map(a=>{
  const f=artikelFormat(a.id);
  if(!f)return null;
  return {
   id:a.id,
   artikel_id:a.id,
   material_id:(typeof artikelWerkstoffId==="function")?artikelWerkstoffId(a.id):null,
   staerke_mm:f.staerke_mm,
   ausfuehrung:f.ausfuehrung,
   form:lagForm(f.form),
   laenge_mm:f.laenge_mm,
   breite_mm:f.breite_mm,
   // Der Name steht seit v3.176 nur noch im Katalog - hier wird er bewusst
   // NICHT mitkopiert, sondern ueber lagArtikelName() aus dem Artikel geholt.
   bezeichnung:null,
   notiz:null
  };
 }).filter(x=>x!==null);
}

// Die Zeile, wie sie im Lager steht. Nur echte Angaben - fehlt eine, wird sie
// weggelassen statt erfunden.
// v3.31: Menge, Laenge und Breite sind hier bewusst KEIN Thema mehr. Die
// Liste legt fest, WELCHE Materialien die Firma fuehrt - sie ist kein
// Lagerbestand im Sinne einer Bestandsfuehrung und war es nie (es wurde nie
// etwas abgebucht). Die Spalten laenge_mm, breite_mm, menge und einheit
// bleiben in der Datenbank stehen: nichts wird geloescht, sie werden nur
// nicht mehr geschrieben und nicht mehr angezeigt.
// v3.176: Der NAME steht nur noch an EINER Stelle. Bis hierher trug die
// Lagerzeile eine eigene bezeichnung - eine Kopie des Katalognamens. Kopien
// laufen auseinander, und genau das war passiert: im Katalog stand
// "Cava-Band Kupfer", an der Lagerzeile nur "Cava-Band". Welcher Name gilt,
// war damit nicht mehr zu beantworten.
//
// Ist ein Artikel verknuepft, gilt ab jetzt SEIN Name. Die gespeicherte
// bezeichnung bleibt als Rueckfall fuer Zeilen ohne Artikel - geloescht wird
// in der Datenbank nichts.
function lagArtikelName(l){
 const a=lagArtikel(l&&l.artikel_id);
 return a?String(a.name||"").trim():"";
}
function lagBeschreibung(l){
 const t=[];
 const bez=lagArtikelName(l)||(l.bezeichnung||"").trim()
   ||lagMaterialName(l.material_id)||"Material";
 t.push(bez);
 const st=lagNummer(l.staerke_mm);
 if(st!==null)t.push(String(st).replace(".",",")+" mm");
 if((l.ausfuehrung||"").trim())t.push(l.ausfuehrung.trim());
 // v3.33: die Form gehoert an die Zeile - sie entscheidet, WIE der Zuschnitt
 // gerechnet wird. Bei einer Tafel steht das Format dabei, bei einer Rolle
 // nicht: eine Rolle hat keine feste Laenge, und ihre Breite kommt aus den
 // firmenweiten Rollenbreiten.
 const f=lagFormText(l&&l.form);
 if(f){
  const tf=lagForm(l&&l.form)==="tafel"?lagTafelText(l):"";
  t.push(tf?(f+" "+tf):f);
 }
 return t.join(" · ");
}

// Was einem Eintrag fehlt, damit er den Bedarf eindeutig macht. Steht
// ausdruecklich an der Zeile - sonst waere unerklaerlich, warum ein passender
// Rest nicht verwendet wird.
function lagFehlt(l){
 const f=[];
 if(lagNummer(l.material_id)===null)f.push("Werkstoff");
 if(lagNummer(l.staerke_mm)===null)f.push("Stärke");
 if(!(l.ausfuehrung||"").trim())f.push("Ausführung");
 if(lagForm(l&&l.form)===null)f.push("Form (Rolle oder Tafel)");
 return f;
}

// Eine Tafel ohne Format ist fuer die Planung wertlos: der Zuschnitt braucht
// Laenge UND Breite, sonst weiss er nicht, worin er die Stuecke unterbringt.
// Steht ausdruecklich an der Zeile, statt beim Rechnen stillschweigend auf
// Rollenblech zurueckzufallen.
function lagTafelFehlt(l){
 if(lagForm(l&&l.form)!=="tafel")return [];
 const f=[];
 if(lagNummer(l&&l.laenge_mm)===null)f.push("Länge");
 if(lagNummer(l&&l.breite_mm)===null)f.push("Breite");
 return f;
}

// Fuehrt die Firma fuer einen Werkstoff mehrere Staerken oder Ausfuehrungen,
// ist der Bedarf einer Massaufnahme NICHT eindeutig - dann wird kein Rest
// automatisch verwendet. Das ist kein Fehler, aber es gehoert gesagt.
function lagMehrdeutig(){
 const nach=new Map();
 lagFormate().forEach(l=>{
  const mid=lagNummer(l.material_id);
  if(mid===null)return;
  const st=lagNummer(l.staerke_mm), aus=(l.ausfuehrung||"").trim().toLowerCase();
  if(st===null||!aus)return;
  if(!nach.has(mid))nach.set(mid,new Set());
  nach.get(mid).add(st+"|"+aus);
 });
 const raus=[];
 nach.forEach((set,mid)=>{if(set.size>1)raus.push({material:mid,name:lagMaterialName(mid),anzahl:set.size})});
 return raus;
}

function lagHinweis(text,fehler){
 const el=$("lagerHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

function renderLagerbestand(){
 const box=$("lagerListe");
 if(!box)return;
 const liste=lagFormate();
 const mehr=lagMehrdeutig();
 const warnung=mehr.length?`<div class="ra-warnung">Für ${esc(mehr.map(x=>x.name||("Material "+x.material)).join(", "))}
 sind mehrere Kombinationen aus Stärke und Ausführung erfasst. Solange das so ist, wird für diesen
 Werkstoff <b>kein</b> Reststück automatisch verwendet – die App rät nicht, welche gemeint ist.</div>`:"";
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material erfasst.
  Ohne Eintrag bleibt für die App offen, welche Stärke und Ausführung ein Werkstoff hat – dann wird
  auch kein Reststück automatisch verwendet.</div>`;
  return;
 }
 box.innerHTML=warnung+liste.slice().sort((x,y)=>
   lagBeschreibung(x).localeCompare(lagBeschreibung(y),"de-CH")).map(l=>{
  const fehlt=lagFehlt(l);
  const tafelFehlt=lagTafelFehlt(l);
  const a=lagArtikel(l.artikel_id);
  return `<div class="report-row">
 <div class="report-row-info">
  <b>${esc(lagBeschreibung(l))}</b>
  <span class="small" style="color:var(--muted)">${esc(a?lagArtikelText(a):(lagMaterialName(l.material_id)||"ohne Werkstoff"))}${l.notiz?" · "+esc(l.notiz):""}</span>
  ${fehlt.length?`<span class="small lag-fehlt" style="color:var(--red)">Ohne ${esc(fehlt.join(" und "))} macht dieser Eintrag den Bedarf nicht eindeutig.</span>`:""}
  ${tafelFehlt.length?`<span class="small lag-tafel-fehlt" style="color:var(--red)">Tafel ohne ${esc(tafelFehlt.join(" und "))} – damit lässt sich kein Zuschnitt planen.</span>`:""}
 </div>
 <div class="report-row-actions">
  <button type="button" class="gray" data-lager-bearbeiten="${l.id}">✏️ Bearbeiten</button>
  <button type="button" class="red" data-lager-loeschen="${l.id}">🗑</button>
 </div>
</div>`;}).join("");
}

// ---- Formular --------------------------------------------------------------
// Bewusst ein einfacher Dialog aus den bestehenden Bausteinen - der Auftrag
// verlangt ausdruecklich keine UI-Grossbaustelle.
let lagBearbeitet=null;

function lagFormularHtml(l){
 const matOpt=`<option value="">– bitte wählen –</option>`+
  ((typeof measurementMaterials!=="undefined"?measurementMaterials:[])||[]).map(m=>
   `<option value="${m.id}"${String(m.id)===String(l.material_id||"")?" selected":""}>${esc(m.name)}</option>`).join("")
   +`<option value="${LAG_NEUE_POSITION}">＋ neuen Werkstoff anlegen …</option>`;
 // v3.177: Der Artikel IST der Eintrag - ohne ihn gibt es kein Blech mehr,
 // weil das Format auf ihm steht. Deshalb ist er Pflicht (kein "- keiner -")
 // und beim BEARBEITEN fest: ihn zu wechseln hiesse, das Format auf einen
 // anderen Artikel zu verschieben - das waere ein neuer Eintrag, kein
 // geaenderter. Angelegt wird ueber die Auswahl, gewechselt gar nicht.
 const artListe=lagArtikelListe().filter(a=>
   String(a.id)===String(l.artikel_id||"")||artikelFormat(a.id)===null);
 const artOpt=`<option value="">– bitte wählen –</option>`+artListe.map(a=>
   `<option value="${a.id}"${String(a.id)===String(l.artikel_id||"")?" selected":""}>${esc(lagArtikelText(a))}</option>`).join("")
   +`<option value="${LAG_NEUE_POSITION}">＋ neue Katalogposition anlegen …</option>`;
 const artFest=lagNummer(l&&l.artikel_id)!==null;
 // v3.33: Form. Ein Altbestand ohne Form bekommt einen VORSCHLAG aus der
 // Notiz - die Firma hat dort improvisiert, solange das Feld fehlte. Es wird
 // nichts automatisch migriert: der Vorschlag steht sichtbar da und wird
 // erst durch Speichern zum Wert.
 const vorschlag=lagFormAusNotiz(l);
 const form=lagForm(l&&l.form)||vorschlag||"";
 const formOpt=`<option value="">– nicht angegeben –</option>`+LAG_FORMEN.map(f=>
   `<option value="${f.wert}"${f.wert===form?" selected":""}>${f.text}</option>`).join("");
 const tafel=form==="tafel";
 return `<div class="grid">
 <div><label>Werkstoff</label><select id="lag_material">${matOpt}</select></div>
 <div><label>Artikel aus dem Katalog</label>${artFest
   ?`<div class="ra-wert" id="lag_artikelFest">${esc(lagArtikelText(lagArtikel(l.artikel_id)))}</div>
     <input id="lag_artikel" type="hidden" value="${esc(String(l.artikel_id))}">
     <div class="small" style="color:var(--muted)">Der Artikel bleibt – das Format gehört zu ihm.</div>`
   :`<select id="lag_artikel">${artOpt}</select>`}</div>
 <div data-lag-bez-aus-katalog="1"${lagArtikelName(l)?"":" hidden"}><label>Bezeichnung</label>
  <div class="ra-wert" id="lag_bezAusKatalog">${esc(lagArtikelName(l))}</div>
  <div class="small" style="color:var(--muted)">Kommt aus dem Katalog und wird dort geändert.</div></div>
 <div data-lag-neu="1" hidden><label>EDV-Nr. der neuen Position</label>
  <input id="lag_neuNr" type="text" placeholder="z. B. 102.04"></div>
 <div data-lag-neu="1" hidden><label>Bezeichnung der neuen Position</label>
  <input id="lag_neuName" type="text" placeholder="z. B. Kupferblech"></div>
 <div data-lag-neu="1" hidden><label>Einheit</label>
  <input id="lag_neuEinheit" type="text" value="m²" placeholder="m²"></div>
 <div data-lag-neuw="1" hidden><label>Name des neuen Werkstoffs</label>
  <input id="lag_neuWName" type="text" placeholder="z. B. Aluminium"></div>
 <div data-lag-neuw="1" hidden><label>Dehnung: Abstand zwischen zwei (mm)</label>
  <input id="lag_neuWAbstand" type="number" step="1" placeholder="z. B. 4000"></div>
 <div data-lag-neuw="1" hidden><label>Dehnung: Abstand ab Fixpunkt (mm)</label>
  <input id="lag_neuWFix" type="number" step="1" placeholder="z. B. 2000"></div>
 <div data-lag-neuw="1" hidden class="wide"><div class="small" style="color:var(--muted)">
  Die beiden Dehnungswerte (SIA 271) braucht nur die Dila-Berechnung von
  Rinne halbrund und Mauerabdeckung. Bleiben sie leer, lässt sich der
  Werkstoff überall sonst trotzdem wählen – nachtragen geht jederzeit unter
  Einstellungen → Massaufnahmen → Werkstoffe.</div></div>
 <div><label>Stärke (mm)</label><input id="lag_staerke" type="number" step="0.05" min="0" value="${l.staerke_mm==null?"":l.staerke_mm}" placeholder="0.70"></div>
 <div><label>Oberfläche / Ausführung</label><input id="lag_ausfuehrung" type="text" value="${esc(l.ausfuehrung||"")}" placeholder="z. B. blank, vorbewittert"></div>
 <div><label>Form</label><select id="lag_form">${formOpt}</select></div>
 <div class="lag-tafelmass" data-lag-tafelmass="1"${tafel?"":" hidden"}><label>Tafellänge (mm)</label><input id="lag_laenge" type="number" step="1" min="0" value="${l.laenge_mm==null?"":l.laenge_mm}" placeholder="2000"></div>
 <div class="lag-tafelmass" data-lag-tafelmass="1"${tafel?"":" hidden"}><label>Tafelbreite (mm)</label><input id="lag_breite" type="number" step="1" min="0" value="${l.breite_mm==null?"":l.breite_mm}" placeholder="1000"></div>
 <div class="wide"><label>Notiz</label><input id="lag_notiz" type="text" value="${esc(l.notiz||"")}" placeholder="z. B. Regal 3"></div>
</div>
${vorschlag&&lagForm(l&&l.form)===null?`<div class="small lag-form-vorschlag" style="color:var(--blue);margin-top:4px">Aus der Notiz
 vorgeschlagen: <b>${esc(lagFormText(vorschlag))}</b>. Bitte prüfen – erst mit dem Speichern wird daraus der Wert.</div>`:""}
<div class="small" style="color:var(--muted);margin-top:4px">Diese Liste sagt, <b>welche</b> Materialien die Firma
führt – keine Mengen. Werkstoff, Stärke und Ausführung zusammen machen den Bedarf eindeutig: nur dann
darf die App ein passendes Reststück verwenden, und nur diese Stärken stehen in der Massaufnahme zur Auswahl.
0,70 mm ist kein Ersatz für 0,80 mm.</div>
<div class="small" style="color:var(--muted);margin-top:4px"><b>Rolle oder Tafel</b> entscheidet, wie der Zuschnitt
gerechnet wird. Von der <b>Rolle</b> wird ein Abschnitt abgezogen, so lang wie das längste Stück, und quer in Streifen
geteilt – die Breiten stehen firmenweit unter Einstellungen → Allgemein. Eine <b>Tafel</b> hat eine feste Länge und
Breite; die gehören deshalb hier an den Eintrag.</div>`;
}

function lagFormularOeffnen(l){
 lagBearbeitet=l||{};
 const box=$("lagerFormBody");
 if(!box)return;
 box.innerHTML=lagFormularHtml(lagBearbeitet);
 // Der Titel steht in einem eigenen <span> - eine Zuweisung auf die ganze
 // <h2> wuerde den Info-Knopf darin mitloeschen (CLAUDE.md 107.6).
 const titel=$("lagerFormTitel");
 if(titel)titel.textContent=lagBearbeitet.id?"Material bearbeiten":"Material erfassen";
 const fehler=$("lagerFormFehler");
 if(fehler){fehler.textContent="";fehler.hidden=true}
 const modal=$("lagerFormModal");
 if(modal)modal.hidden=false;
 // Der Artikel fuellt Staerke und Ausfuehrung als VORSCHLAG - beides bleibt
 // frei aenderbar, und ein bereits gesetzter Wert wird nicht ueberschrieben.
 const sel=$("lag_artikel");
 // v3.176/v3.177: Der Name kommt aus dem Katalog und wird nur angezeigt. Ein
 // eigenes Eingabefeld gibt es nicht mehr - es war der Rueckfall fuer
 // Eintraege OHNE Artikel, und die gibt es nicht mehr.
 const mt=$("lag_material");
 const bezZeigen=()=>{
  const neu=sel&&sel.value===LAG_NEUE_POSITION;
  const a=neu?null:lagArtikel(sel?sel.value:"");
  const name=a?String(a.name||"").trim():"";
  const ausKatalog=box.querySelector("[data-lag-bez-aus-katalog]");
  if(ausKatalog){
   ausKatalog.hidden=!name;
   const w=$("lag_bezAusKatalog");
   if(w)w.textContent=name;
  }
  // v3.179: Die Felder der neuen Position stehen nur da, wenn sie gebraucht
  // werden - sonst fragte das Formular nach einer EDV-Nr., die es schon gibt.
  box.querySelectorAll("[data-lag-neu]").forEach(el=>{el.hidden=!neu});
  const neuW=mt&&mt.value===LAG_NEUE_POSITION;
  box.querySelectorAll("[data-lag-neuw]").forEach(el=>{el.hidden=!neuW});
 };
 bezZeigen();
 if(sel)sel.onchange=()=>{
  bezZeigen();
  if(sel.value===LAG_NEUE_POSITION){
   // Die EDV-Nr. schlaegt dieselbe Stelle vor wie in der Lagerverwaltung
   // (js/68, v3.126) - es wird keine zweite Nummernlogik gebaut.
   const nr=$("lag_neuNr"), nm=$("lag_neuName");
   if(nr&&!nr.value&&nm&&nm.value&&typeof lagerNummernVorschlag==="function"){
    const v=lagerNummernVorschlag(nm.value);
    if(v&&v.nummer)nr.value=v.nummer;
   }
   return;
  }
  const a=lagArtikel(sel.value);
  if(!a)return;
  const st=$("lag_staerke"), au=$("lag_ausfuehrung");
  const dim=Number(String(a.dim||"").replace(",","."));
  if(st&&!st.value&&Number.isFinite(dim)&&dim>0)st.value=String(dim);
  // v3.177: Der Werkstoff steht seit v3.176 am Artikel. Ist er dort
  // hinterlegt, wird er hier uebernommen - er ist keine Vermutung, sondern
  // derselbe Wert aus derselben Spalte. Eine bereits getroffene Auswahl
  // wird dabei nicht ueberschrieben.
  const mt=$("lag_material");
  const wk=(typeof artikelWerkstoffId==="function")?artikelWerkstoffId(a.id):null;
  if(mt&&!mt.value&&wk!==null)mt.value=String(wk);
  // Die Ausfuehrung steht im Artikelnamen und laesst sich nicht sicher
  // herausloesen - sie wird deshalb NICHT geraten, sondern nur der Name
  // vorgeschlagen. Eintragen muss sie die Firma selbst.
  if(au&&!au.value)au.placeholder="aus \""+(a.name||"")+"\" eintragen";
 };
 // Die Werkstoff-Auswahl blendet ihre eigenen Felder ein bzw. aus.
 if(mt)mt.onchange=bezZeigen;
 // Der Name der neuen Position kommt oft erst nach der Auswahl - die
 // EDV-Nr. wird deshalb auch dann noch vorgeschlagen, solange das Feld leer
 // ist. Eine selbst eingetippte Nummer wird nie ueberschrieben.
 const nn=$("lag_neuName");
 if(nn)nn.onblur=()=>{
  const nr=$("lag_neuNr");
  if(!nr||nr.value||!nn.value||typeof lagerNummernVorschlag!=="function")return;
  const v=lagerNummernVorschlag(nn.value);
  if(v&&v.nummer)nr.value=v.nummer;
 };
 // Die Tafelmasse gehoeren nur zur Tafel. Bei einer Rolle blieben sie leer
 // stehen und wuerden fragen lassen, ob man sie ausfuellen muss.
 const fm=$("lag_form");
 if(fm)fm.onchange=()=>{
  const tafel=lagForm(fm.value)==="tafel";
  box.querySelectorAll("[data-lag-tafelmass]").forEach(el=>{el.hidden=!tafel});
 };
}

function lagFormularSchliessen(){
 const modal=$("lagerFormModal");
 if(modal)modal.hidden=true;
 lagBearbeitet=null;
}

// v3.177: Die Werte gehen auf den ARTIKEL (materials), nicht mehr auf eine
// eigene lagerbestand-Zeile. Deshalb kommt artikel_id hier auch nicht mehr im
// Rueckgabewert vor - sie ist nicht Teil des Eintrags, sie IST der Eintrag
// und wird getrennt gefuehrt (lagFormularArtikelId).
//
// Die Bezeichnung faellt als Feld ganz weg. Sie war bis v3.176 der Rueckfall
// fuer Eintraege OHNE Artikel - und die gibt es nicht mehr, weil das Format
// auf dem Artikel steht. Der Name kommt seit v3.176 ohnehin aus dem Katalog.
function lagFormularArtikelId(){
 const el=$("lag_artikel");
 return lagNummer(el?String(el.value).trim():"");
}
function lagFormularWerte(){
 const z=id=>{const el=$(id);return el?el.value.trim():""};
 const n=id=>{const v=z(id);if(!v)return null;const x=Number(v.replace(",","."));return Number.isFinite(x)?x:null};
 return {
  // Der Werkstoff steht seit v3.176 am Artikel (materials.werkstoff_id) und
  // wird hier auf DIESELBE Spalte geschrieben - dieselbe Wahrheit, zwei
  // Tueren. Nicht etwa eine zweite Ablage daneben.
  werkstoff_id:lagNummer(z("lag_material")),
  staerke_mm:n("lag_staerke"),
  ausfuehrung:z("lag_ausfuehrung")||null,
  form:lagForm(z("lag_form")),
  // Bei einer Rolle werden die Masse ausdruecklich auf null gesetzt: ein
  // stehengebliebener Tafelwert wuerde den Zuschnitt sonst falsch rechnen.
  laenge_mm:lagForm(z("lag_form"))==="tafel"?n("lag_laenge"):null,
  breite_mm:lagForm(z("lag_form"))==="tafel"?n("lag_breite"):null,
  notiz:z("lag_notiz")||null
 };
}
// Der lokale Stand wird nach dem Schreiben nachgezogen, damit die Liste ohne
// Neuladen stimmt. materialFormate wird parallel zu materialIds gefuehrt
// (js/01), also wird an genau derselben Stelle geschrieben.
function lagFormatMerken(artikelId,w){
 const i=(typeof materialIds!=="undefined"?materialIds:[]).findIndex(x=>String(x)===String(artikelId));
 if(i<0)return;
 materialFormate[i]={staerke_mm:w.staerke_mm,ausfuehrung:w.ausfuehrung,
   form:w.form,laenge_mm:w.laenge_mm,breite_mm:w.breite_mm};
 if(typeof materialWerkstoffe!=="undefined"&&"werkstoff_id" in w)
  materialWerkstoffe[i]=w.werkstoff_id;
}

// Geschrieben wird ueber die gewoehnliche, RLS-gepruefte Tabelle. Die
// company_id kommt NIE vom Client - sie hat serverseitig DEFAULT
// my_company_id(), und die restriktive Policy erzwingt sie zusaetzlich.
//
// v3.177: Ziel ist materials, nicht mehr lagerbestand. Es wird ausschliesslich
// UPDATE gemacht - nie INSERT: der Artikel existiert bereits im Katalog, hier
// bekommt er nur sein Format. Ein neuer Artikel entsteht im Katalog
// (Einstellungen -> Material), nicht im Materialbestand.
async function lagSpeichern(){
 const fehler=$("lagerFormFehler");
 const zeig=t=>{if(fehler){fehler.textContent=t;fehler.hidden=!t}};
 const wahl=($("lag_artikel")||{}).value;
 const neueStelle=wahl===LAG_NEUE_POSITION;
 let artikelId=lagFormularArtikelId();
 if(artikelId===null&&!neueStelle){
  zeig("Bitte einen Artikel aus dem Katalog wählen – das Format gehört zu ihm.");return}

 // v3.180: Fehlt auch der WERKSTOFF noch, entsteht er hier - im selben
 // Dialog. Zuerst, weil Artikel und Format beide auf ihn zeigen.
 //
 // Verschmolzen wird deshalb trotzdem nichts: die Dehnungswerte gehoeren zum
 // Werkstoff (sechs Stueck), nicht an jede der ueber 380 Katalogpositionen.
 // Es wird nur der Weg dorthin kuerzer.
 const mtFeld=$("lag_material");
 if(mtFeld&&mtFeld.value===LAG_NEUE_POSITION){
  const wname=(($("lag_neuWName")||{}).value||"").trim();
  if(!wname){zeig("Bitte einen Namen für den neuen Werkstoff eingeben.");return}
  const schonW=((typeof measurementMaterials!=="undefined"?measurementMaterials:[])||[])
    .find(m=>String(m.name||"").trim().toLowerCase()===wname.toLowerCase());
  if(schonW){
   zeig("Den Werkstoff „"+wname+"“ gibt es bereits. Bitte ihn oben direkt auswählen.");
   return;
  }
  const zahl=id=>{const v=(($(id)||{}).value||"").trim();
    if(!v)return undefined;const x=Number(v.replace(",","."));
    return Number.isFinite(x)?x:undefined};
  const rausW=await werkstoffAnlegen({name:wname,
    max_abstand_mm:zahl("lag_neuWAbstand"),ab_fixpunkt_mm:zahl("lag_neuWFix")});
  if(rausW.id===null){
   zeig(rausW.fehler
     ?("Der Werkstoff konnte nicht angelegt werden: "+rausW.fehler
       +(rausW.rls?" Dafür fehlt das Recht, die Kataloge zu ändern.":""))
     :"Der Werkstoff wurde nicht angelegt. Fehlt die nötige Berechtigung?");
   return;
  }
  // Die Auswahl steht ab jetzt auf dem neuen Werkstoff - lagFormularWerte()
  // liest sie gleich darunter. Die Option muss dafuer eigens eingetragen
  // werden: renderMeasMaterialOptions() (js/01) fuellt nur die Dropdowns mit
  // der Klasse "meas-material-select", und dieses hier wird vom Formular
  // selbst gebaut. Ohne die Option liefe value=<id> ins Leere und der
  // Werkstoff waere nach dem Anlegen wieder leer.
  const opt=document.createElement("option");
  opt.value=String(rausW.id); opt.textContent=wname;
  mtFeld.insertBefore(opt,mtFeld.lastElementChild);
  mtFeld.value=String(rausW.id);
  // Die Felder des neuen Werkstoffs haben ihren Zweck erfuellt.
  const rumpf=$("lagerFormBody");
  if(rumpf)rumpf.querySelectorAll("[data-lag-neuw]").forEach(el=>{el.hidden=true});
 }
 const w=lagFormularWerte();
 // Ohne Form ist es kein gefuehrtes Blech: der Eintrag waere nach dem
 // Speichern aus der Liste verschwunden, ohne dass jemand das wollte.
 if(w.form===null){zeig("Bitte Rolle oder Tafel wählen – daran erkennt die App, dass dieser Artikel ein geführtes Blech ist.");return}
 // Eine Tafel ohne Format laesst sich nicht planen - das wird hier gesagt,
 // statt beim Rechnen stillschweigend auf Rollenblech zurueckzufallen.
 if(w.form==="tafel"&&(w.laenge_mm===null||w.breite_mm===null)){
  zeig("Bitte Länge und Breite der Tafel eintragen – ohne das Format lässt sich kein Zuschnitt planen.");return}
 if(w.form==="tafel"&&(w.laenge_mm<=0||w.breite_mm<=0)){
  zeig("Länge und Breite der Tafel müssen grösser als 0 sein.");return}
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Lagereintrag"))return;
 // v3.179: Ein neues Blech in EINEM Zug. Bis v3.178 musste die Position
 // zuerst im Katalog angelegt werden und danach hier das Format - zweimal
 // erfassen fuer ein Blech. Jetzt entsteht beides hintereinander, im selben
 // Dialog. Angelegt wird ueber katalogPositionAnlegen() (dieselbe Funktion
 // wie in der Lagerverwaltung), damit es nur EINEN Weg gibt, wie eine
 // Katalogposition entsteht.
 //
 // Reihenfolge mit Absicht: erst die Position, dann das Format. Schlaegt das
 // Anlegen fehl, ist nichts halb passiert.
 if(neueStelle){
  const nr=(($("lag_neuNr")||{}).value||"").trim();
  const name=(($("lag_neuName")||{}).value||"").trim();
  const einheit=(($("lag_neuEinheit")||{}).value||"").trim()||"m²";
  if(!nr){zeig("Bitte eine EDV-Nr. für die neue Katalogposition eingeben.");return}
  if(!name){zeig("Bitte eine Bezeichnung für die neue Katalogposition eingeben.");return}
  const schon=lagArtikelListe().find(a=>
    String(a.edv_nr||"").trim().toLowerCase()===nr.toLowerCase());
  if(schon){
   zeig("Die EDV-Nr. "+nr+" gibt es bereits ("+lagArtikelText(schon)
     +"). Bitte eine andere wählen – oder die Position oben direkt auswählen.");
   return;
  }
  const raus=await katalogPositionAnlegen({edv_nr:nr,name,unit:einheit,
    werkstoff_id:w.werkstoff_id});
  if(raus.id===null){
   zeig(raus.fehler
     ?("Die Katalogposition konnte nicht angelegt werden: "+raus.fehler
       +(raus.rls?" Dafür fehlt das Recht, den Material-Katalog zu ändern.":""))
     :"Die Katalogposition wurde nicht angelegt. Fehlt die nötige Berechtigung?");
   return;
  }
  artikelId=raus.id;
 }
 const neuerEintrag=artikelFormat(artikelId)===null;
 const {data,error}=await sb.from("materials").update(w).eq("id",artikelId).select();
 if(error){zeig(error.message);return}
 // Ein von RLS blockiertes Schreiben meldet keinen Fehler, es betrifft still
 // 0 Zeilen (CLAUDE.md 24.1) - 0 gilt deshalb ausdruecklich NICHT als Erfolg.
 if(!data||!data.length){zeig("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
 lagFormatMerken(artikelId,w);
 const id=neuerEintrag?null:artikelId;
 lagFormularSchliessen();
 renderLagerbestand();
 // Der Bedarf kann dadurch eindeutig geworden sein - die Restanzeige haengt
 // daran und wird deshalb mitgezogen.
 if(typeof renderRestLager==="function")renderRestLager();
 lagHinweis(id?"✓ Gespeichert.":"✓ Material erfasst.");
}

if($("lagerNeu"))$("lagerNeu").onclick=()=>lagFormularOeffnen({});
if($("lagerFormAbbrechen"))$("lagerFormAbbrechen").onclick=lagFormularSchliessen;
if($("lagerFormSpeichern"))$("lagerFormSpeichern").onclick=lagSpeichern;

document.addEventListener("click",async e=>{
 const b=e.target.closest?e.target.closest("[data-lager-bearbeiten]"):null;
 if(b){
  const id=Number(b.dataset.lagerBearbeiten);
  const l=lagFormate().find(x=>Number(x.id)===id);
  if(l)lagFormularOeffnen(Object.assign({},l));
  return;
 }
 const d=e.target.closest?e.target.closest("[data-lager-loeschen]"):null;
 if(!d)return;
 const id=Number(d.dataset.lagerLoeschen);
 const l=lagFormate().find(x=>Number(x.id)===id);
 if(!l)return;
 // v3.177: Der Eintrag IST der Katalogartikel - geloescht wird deshalb
 // ausdruecklich NICHTS. Entfernt wird nur sein Format; damit faellt er aus
 // der Blech-Liste (Kriterium: form), bleibt aber als Katalogposition mit
 // EDV-Nr., Preis, Barcode und allen Buchungen vollstaendig erhalten.
 // Ein DELETE waere hier ein Datenverlust, den niemand bestellt hat.
 if(!confirm("„"+lagBeschreibung(l)+"“ nicht mehr als geführtes Blech behandeln?\n\n"
   +"Der Katalogartikel bleibt erhalten – es wird nur das Format (Stärke, Ausführung, "
   +"Rolle/Tafel) entfernt. Der Zuschnitt rechnet danach nicht mehr mit diesem Blech."))return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Lagereintrag"))return;
 // Der Werkstoff bleibt stehen: woraus ein Artikel ist, haengt nicht daran,
 // ob die Firma ihn gerade als Blech fuehrt (v3.176).
 const leer={staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null};
 const {data,error}=await sb.from("materials").update(leer).eq("id",id).select();
 if(error){lagHinweis(error.message,true);return}
 if(!data||!data.length){lagHinweis("Es wurde nichts geändert. Fehlt die nötige Berechtigung?",true);return}
 lagFormatMerken(id,leer);
 renderLagerbestand();
 if(typeof renderRestLager==="function")renderRestLager();
 lagHinweis("✓ Entfernt – der Katalogartikel bleibt.");
});
