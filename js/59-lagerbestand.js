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
//   Materialart - keine Staerke, keine Ausfuehrung.
//   materials (die Artikelliste der Firma) hat beides bereits, aber die
//   Massaufnahme zeigt nicht darauf.
// Traegt die Firma hier ein, welche Staerke und Ausfuehrung sie fuer eine
// Materialart fuehrt, ist der Bedarf eindeutig - und nur dann darf ein Rest
// automatisch verwendet werden (restBedarfMerkmale() in js/42).
//
// Nichts davon ist hart verdrahtet: Materialarten kommen aus
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
function lagArtikel(id){
 const n=lagNummer(id);
 if(n===null)return null;
 return lagArtikelListe().find(a=>lagNummer(a.id)===n)||null;
}
function lagArtikelText(a){
 if(!a)return "";
 return (a.edv_nr?a.edv_nr+" ":"")+(a.name||"")+(a.dim?" · "+a.dim:"");
}
function lagMaterialName(id){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(id):null;
 return m?m.name:"";
}

// ---- Rolle oder Tafel (v3.33) ---------------------------------------------
// Genau zwei Werte, dieselben wie in der Datenbank-Constraint. NULL heisst
// "nicht angegeben" - dann verhaelt sich der Zuschnitt wie bis v3.32 (Rolle).
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

// Die Zeile, wie sie im Lager steht. Nur echte Angaben - fehlt eine, wird sie
// weggelassen statt erfunden.
// v3.31: Menge, Laenge und Breite sind hier bewusst KEIN Thema mehr. Die
// Liste legt fest, WELCHE Materialien die Firma fuehrt - sie ist kein
// Lagerbestand im Sinne einer Bestandsfuehrung und war es nie (es wurde nie
// etwas abgebucht). Die Spalten laenge_mm, breite_mm, menge und einheit
// bleiben in der Datenbank stehen: nichts wird geloescht, sie werden nur
// nicht mehr geschrieben und nicht mehr angezeigt.
function lagBeschreibung(l){
 const t=[];
 const bez=(l.bezeichnung||"").trim()||lagMaterialName(l.material_id)||"Material";
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
 if(lagNummer(l.material_id)===null)f.push("Materialart");
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

// Fuehrt die Firma fuer eine Materialart mehrere Staerken oder Ausfuehrungen,
// ist der Bedarf einer Massaufnahme NICHT eindeutig - dann wird kein Rest
// automatisch verwendet. Das ist kein Fehler, aber es gehoert gesagt.
function lagMehrdeutig(){
 const nach=new Map();
 (typeof lagerbestand!=="undefined"?lagerbestand:[]||[]).forEach(l=>{
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
 const liste=(typeof lagerbestand!=="undefined"?lagerbestand:[])||[];
 const mehr=lagMehrdeutig();
 const warnung=mehr.length?`<div class="ra-warnung">Für ${esc(mehr.map(x=>x.name||("Material "+x.material)).join(", "))}
 sind mehrere Kombinationen aus Stärke und Ausführung erfasst. Solange das so ist, wird für diese
 Materialart <b>kein</b> Reststück automatisch verwendet – die App rät nicht, welche gemeint ist.</div>`:"";
 if(!liste.length){
  box.innerHTML=`<div class="small" style="color:var(--muted);margin:6px 0">Noch kein Material erfasst.
  Ohne Eintrag bleibt für die App offen, welche Stärke und Ausführung eine Materialart hat – dann wird
  auch kein Reststück automatisch verwendet.</div>`;
  return;
 }
 box.innerHTML=warnung+liste.map(l=>{
  const fehlt=lagFehlt(l);
  const tafelFehlt=lagTafelFehlt(l);
  const a=lagArtikel(l.artikel_id);
  return `<div class="report-row">
 <div class="report-row-info">
  <b>${esc(lagBeschreibung(l))}</b>
  <span class="small" style="color:var(--muted)">${esc(a?lagArtikelText(a):(lagMaterialName(l.material_id)||"ohne Materialart"))}${l.notiz?" · "+esc(l.notiz):""}</span>
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
   `<option value="${m.id}"${String(m.id)===String(l.material_id||"")?" selected":""}>${esc(m.name)}</option>`).join("");
 const artListe=lagArtikelListe();
 const artOpt=`<option value="">– keiner –</option>`+artListe.map(a=>
   `<option value="${a.id}"${String(a.id)===String(l.artikel_id||"")?" selected":""}>${esc(lagArtikelText(a))}</option>`).join("");
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
 <div><label>Materialart</label><select id="lag_material">${matOpt}</select></div>
 <div><label>Artikel aus dem Katalog</label><select id="lag_artikel">${artOpt}</select></div>
 <div><label>Bezeichnung</label><input id="lag_bezeichnung" type="text" value="${esc(l.bezeichnung||"")}" placeholder="z. B. Titanzink vorbewittert"></div>
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
führt – keine Mengen. Materialart, Stärke und Ausführung zusammen machen den Bedarf eindeutig: nur dann
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
 if(sel)sel.onchange=()=>{
  const a=lagArtikel(sel.value);
  if(!a)return;
  const st=$("lag_staerke"), au=$("lag_ausfuehrung"), bez=$("lag_bezeichnung");
  const dim=Number(String(a.dim||"").replace(",","."));
  if(st&&!st.value&&Number.isFinite(dim)&&dim>0)st.value=String(dim);
  if(bez&&!bez.value)bez.value=a.name||"";
  // Die Ausfuehrung steht im Artikelnamen und laesst sich nicht sicher
  // herausloesen - sie wird deshalb NICHT geraten, sondern nur der Name
  // vorgeschlagen. Eintragen muss sie die Firma selbst.
  if(au&&!au.value)au.placeholder="aus \""+(a.name||"")+"\" eintragen";
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

function lagFormularWerte(){
 const z=id=>{const el=$(id);return el?el.value.trim():""};
 const n=id=>{const v=z(id);if(!v)return null;const x=Number(v.replace(",","."));return Number.isFinite(x)?x:null};
 return {
  material_id:lagNummer(z("lag_material")),
  artikel_id:lagNummer(z("lag_artikel")),
  bezeichnung:z("lag_bezeichnung")||null,
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

// Geschrieben wird ueber die gewoehnliche, RLS-gepruefte Tabelle. Die
// company_id kommt NIE vom Client - sie hat serverseitig DEFAULT
// my_company_id(), und die restriktive Policy erzwingt sie zusaetzlich.
async function lagSpeichern(){
 const fehler=$("lagerFormFehler");
 const zeig=t=>{if(fehler){fehler.textContent=t;fehler.hidden=!t}};
 const w=lagFormularWerte();
 if(w.material_id===null&&!w.bezeichnung){zeig("Bitte eine Materialart wählen oder eine Bezeichnung eintragen.");return}
 // Eine Tafel ohne Format laesst sich nicht planen - das wird hier gesagt,
 // statt beim Rechnen stillschweigend auf Rollenblech zurueckzufallen.
 if(w.form==="tafel"&&(w.laenge_mm===null||w.breite_mm===null)){
  zeig("Bitte Länge und Breite der Tafel eintragen – ohne das Format lässt sich kein Zuschnitt planen.");return}
 if(w.form==="tafel"&&(w.laenge_mm<=0||w.breite_mm<=0)){
  zeig("Länge und Breite der Tafel müssen grösser als 0 sein.");return}
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Lagereintrag"))return;
 const id=lagBearbeitet&&lagBearbeitet.id;
 const {data,error}=id
  ? await sb.from("lagerbestand").update(w).eq("id",id).select()
  : await sb.from("lagerbestand").insert(w).select();
 if(error){zeig(error.message);return}
 // Ein von RLS blockiertes Schreiben meldet keinen Fehler, es betrifft still
 // 0 Zeilen (CLAUDE.md 24.1) - 0 gilt deshalb ausdruecklich NICHT als Erfolg.
 if(!data||!data.length){zeig("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
 if(id)lagerbestand=(lagerbestand||[]).map(x=>x.id===id?data[0]:x);
 else lagerbestand=(lagerbestand||[]).concat(data);
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
  const l=(lagerbestand||[]).find(x=>Number(x.id)===id);
  if(l)lagFormularOeffnen(Object.assign({},l));
  return;
 }
 const d=e.target.closest?e.target.closest("[data-lager-loeschen]"):null;
 if(!d)return;
 const id=Number(d.dataset.lagerLoeschen);
 const l=(lagerbestand||[]).find(x=>Number(x.id)===id);
 if(!l)return;
 if(!confirm("„"+lagBeschreibung(l)+"“ aus dem Materialbestand entfernen?"))return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Lagereintrag"))return;
 const {data,error}=await sb.from("lagerbestand").delete().eq("id",id).select();
 if(error){lagHinweis(error.message,true);return}
 if(!data||!data.length){lagHinweis("Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?",true);return}
 lagerbestand=(lagerbestand||[]).filter(x=>Number(x.id)!==id);
 renderLagerbestand();
 if(typeof renderRestLager==="function")renderRestLager();
 lagHinweis("✓ Entfernt.");
});
