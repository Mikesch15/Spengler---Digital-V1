// ---------------------------------------------------------------------------
// Materialstaerke je Massaufnahme                       Version 3.31
//
// WOZU: Bis v3.30 wusste eine Massaufnahme nur die MATERIALART (Titanzink,
// Kupfer ...) - measurement_materials fuehrt weder Staerke noch Ausfuehrung
// (CLAUDE.md 132.2). Ob 0,70 oder 0,80 mm gemeint war, liess sich nur
// erraten, und genau deshalb musste der Restabgleich aufgeben, sobald eine
// Firma zwei Staerken derselben Art fuehrt ("mehrdeutig").
//
// Jetzt steht die Staerke an der Massaufnahme selbst - und zwar AUSSCHLIESS-
// LICH als Auswahl aus dem Materialbestand der Firma (js/59). Es wird nichts
// erfunden und nichts hart verdrahtet: was nicht im Bestand steht, steht
// auch nicht zur Auswahl. Fuehrt die Firma fuer eine Materialart gar nichts,
// sagt das Feld das ausdruecklich, statt eine Zahl vorzuschlagen.
//
// KEIN FACHMODUL WIRD ANGEFASST. Die zwoelf Material-Auswahlfelder stehen
// hier zentral; ein Beobachter haengt das Staerkefeld an - gleiches Muster
// wie WINKEL_FELDER in js/55 (CLAUDE.md 117.3) und HILFE_TEXTE in js/41.
//
// EINE WAHRHEIT: der Wert liegt in measStaerke, nicht im DOM. Kehle (js/34)
// und Kamin (js/37) zeichnen ihr Register bei jeder Eingabe neu und wuerden
// ein eingehaengtes Feld samt Wert mitreissen; ausserdem gibt es zwoelf
// Auswahlfelder im Dokument, aber immer nur eine offene Massaufnahme. Das
// eingehaengte Feld ist deshalb nur die Anzeige.
// ---------------------------------------------------------------------------

// Die zwoelf SICHTBAREN Material-Auswahlfelder, eines je Art.
//
// Ausdruecklich einzeln aufgezaehlt und NICHT ueber die Klasse
// ".meas-material-select": die tragen zwar zehn Felder, aber sieben davon
// stehen in den versteckten Stummel-Bloecken (#ebStummel, #rinneStummel,
// #madStummel, #lukStummel, #einfStummel, #ebkStummel, #fpStummel), damit
// die alten Fachdateien unveraendert laden koennen. Das sichtbare Feld
// bauen dort die Register-Module selbst - mit eigener id. Gemessen, nicht
// aus dem Namensschema geraten.
//
// Kommt eine dreizehnte Art dazu, gehoert sie in diese Liste; der Pruefstand
// sucht in allen Arten nach einem Materialfeld ohne Staerkefeld.
const MEAS_MATERIAL_FELDER=[
 "#foto_material",   // Skizze/Foto        (im HTML, ohne Register)
 "#anb_material",    // Ort- und Seitenbleche (im HTML, Register 1)
 "#rp_material",     // Rinne (Zuschnittliste) (im HTML, Register 1)
 "#eba_material",    // Einlaufblech gerade   (js/29)
 "#ebka_material",   // Einlaufblech konisch  (js/30)
 "#ra_material",     // Rinne Halbrund        (js/28)
 "#fpa_material",    // Freies Profil         (js/31)
 "#mada_material",   // Mauerabdeckung        (js/32)
 "#kea_material",    // Kehle                 (js/34)
 "#luka_material",   // Lukarne               (js/36)
 "#kam_material",    // Kamineinfassung       (js/37)
 "#einfa_material"   // Einfassung Rund       (js/38)
];

// Nicht jede Art schneidet aus Rolle oder Tafel:
//   * Skizze/Foto rechnet gar nichts.
//   * Rinne Halbrund bezieht ein fertiges Profil in NORMLAENGEN (raNormPlan,
//     js/28) - dort gibt es weder Rollenbreite noch Tafelformat.
// An diesen beiden Feldern erscheint die Wahl deshalb nicht; ein Feld, das
// nichts bewirkt, waere schlechter als keines.
const MEAS_FORM_FELDER=MEAS_MATERIAL_FELDER.filter(
  s=>s!=="#foto_material"&&s!=="#ra_material");

let measZuschnittForm=null;   // "rolle" | "tafel" | null = automatisch
let measFormZeichnet=false; // laeuft gerade das Neuzeichnen des Registers?

let measStaerke=null;      // die eine Wahrheit fuer das offene Formular
let measStaerkeBaut=false; // laeuft gerade das Anhaengen der Felder?

function measStaerkeZahl(v){
 if(v===null||v===undefined||v==="")return null;
 const n=Number(String(v).replace(",","."));
 return Number.isFinite(n)&&n>0?n:null;
}
function measStaerkeText(v){
 const n=measStaerkeZahl(v);
 return n===null?"":String(n).replace(".",",")+" mm";
}
function measStaerkeGet(){return measStaerke}
function measStaerkeSetzen(v){
 measStaerke=measStaerkeZahl(v);
 measStaerkeFelderFuellen();
}
function measStaerkeZuruecksetzen(){measStaerkeSetzen(null)}

// Welche Staerken fuehrt die Firma fuer diese Materialart? Ausschliesslich
// aus dem Materialbestand (js/59) - keine zweite Quelle, keine Vorgabewerte.
function measStaerkenFuer(materialId){
 const mid=Number(materialId);
 if(!Number.isFinite(mid)||mid<=0)return [];
 const liste=(typeof lagerbestand!=="undefined"?lagerbestand:[])||[];
 const raus=[];
 liste.forEach(l=>{
  if(Number(l.material_id)!==mid)return;
  const st=measStaerkeZahl(l.staerke_mm);
  if(st===null)return;
  if(raus.indexOf(st)<0)raus.push(st);
 });
 return raus.sort((a,b)=>a-b);
}
// ---- Anzeige --------------------------------------------------------------
// Das eingehaengte Feld ist eine reine Anzeige von measStaerke. Es kann
// jederzeit verschwinden (Neuzeichnen eines Registers) und wird dann wieder
// gesetzt - das Fachmodul weiss davon nichts.
function measStaerkeBlock(){
 const d=document.createElement("div");
 d.dataset.measStaerkeBlock="1";
 return d;
}
function measStaerkeOptionen(materialId){
 const st=measStaerkenFuer(materialId);
 const jetzt=measStaerke;
 let o=`<option value="">– keine Angabe –</option>`;
 st.forEach(x=>{
  o+=`<option value="${x}"${jetzt!==null&&Math.abs(x-jetzt)<1e-9?" selected":""}>${measStaerkeText(x)}</option>`;
 });
 // Ein gespeicherter Wert, den der Bestand nicht (mehr) fuehrt, wird
 // ausdruecklich mitgezeigt statt stillschweigend auf leer zu fallen.
 if(jetzt!==null&&!st.some(x=>Math.abs(x-jetzt)<1e-9))
  o+=`<option value="${jetzt}" selected>${measStaerkeText(jetzt)} (nicht im Materialbestand)</option>`;
 return o;
}
function measStaerkeHinweis(materialId){
 const mid=Number(materialId);
 if(!Number.isFinite(mid)||mid<=0)
  return "Zuerst das Material wählen – die Stärken kommen aus dem Materialbestand der Firma.";
 if(!measStaerkenFuer(mid).length)
  return "Für dieses Material ist im Materialbestand keine Stärke hinterlegt "
        +"(Einstellungen → Allgemein → Materialbestand).";
 return "";
}
function measStaerkeInhalt(feld){
 const mid=feld?feld.value:"";
 const hinweis=measStaerkeHinweis(mid);
 // Der Info-Knopf entsteht ueber die zentrale Stelle (js/41) - der Text
 // erklaert, woher die Auswahl kommt und was das Feld bewirkt.
 const info=(typeof hilfeKnopf==="function")?hilfeKnopf("meas-staerke"):"";
 return `<label>Materialstärke ${info}</label>`
  +`<select data-meas-staerke="1">${measStaerkeOptionen(mid)}</select>`
  +(hinweis?`<div class="small" style="color:var(--muted);margin-top:2px">${esc(hinweis)}</div>`:"");
}
// Schreibt nur, wenn sich wirklich etwas geaendert hat - und vergleicht dafuer
// die ERZEUGTE Zeichenkette mit der zuletzt geschriebenen, NICHT mit
// element.innerHTML. Der Browser serialisiert naemlich anders, als hier
// geschrieben wird: aus <option selected> wird <option selected="">. Ein
// Vergleich gegen innerHTML ist damit immer ungleich, der Block wird bei jedem
// Lauf neu geschrieben, und der Beobachter unten feuert endlos. Das hat den
// 60-ms-Debounce von js/56 dauerhaft zurueckgesetzt: zeNachziehen() kam nie
// zum Zug, der Abhak-Stand blieb ueberall auf "-". Vom Pruefstand gefunden,
// im Browser gemessen. Die Signatur haengt als Eigenschaft am Knoten, nicht
// als Attribut - sonst waere sie selbst eine DOM-Aenderung.
function measStaerkeSchreiben(el,html){
 if(!el)return;
 if(el.__sdSig===html)return;
 el.innerHTML=html;
 el.__sdSig=html;
}
// Haengt an jedes Materialfeld genau einen Staerke-Block.
function measStaerkeFelderSetzen(){
 if(measStaerkeBaut)return;
 measStaerkeBaut=true;
 try{
  document.querySelectorAll(MEAS_MATERIAL_FELDER.join(",")).forEach(sel=>{
   if(!sel||sel.tagName!=="SELECT")return;
   // Der Block gehoert neben das Materialfeld, also in dessen Elternzelle.
   const zelle=sel.parentElement;
   if(!zelle)return;
   let b=zelle.nextElementSibling;
   if(!(b&&b.dataset&&b.dataset.measStaerkeBlock)){
    b=measStaerkeBlock();
    zelle.insertAdjacentElement("afterend",b);
   }
   const soll=measStaerkeInhalt(sel);
   measStaerkeSchreiben(b,soll);
   // v3.33: direkt daneben die Wahl Rolle/Tafel - nur bei den Arten, die
   // wirklich aus Rolle oder Tafel schneiden (MEAS_FORM_FELDER).
   if(MEAS_FORM_FELDER.indexOf("#"+sel.id)<0)return;
   let f=b.nextElementSibling;
   if(!(f&&f.dataset&&f.dataset.measZformBlock)){
    f=document.createElement("div");
    f.dataset.measZformBlock="1";
    b.insertAdjacentElement("afterend",f);
   }
   const sollF=measZuschnittFormInhalt(sel);
   measStaerkeSchreiben(f,sollF);
  });
 }catch(e){/* eine kaputte Auswahl darf die App nicht anhalten */}
 measStaerkeBaut=false;
}
function measStaerkeFelderFuellen(){measStaerkeFelderSetzen()}

// ---- Eingabe --------------------------------------------------------------
// Beide Handler laufen delegiert am Dokument: die Felder werden staendig neu
// gezeichnet, ein direkt gebundener Handler waere danach weg.
(function measStaerkeStarten(){
 if(typeof document==="undefined")return;
 document.addEventListener("change",e=>{
  const t=e.target;
  if(!t)return;
  if(measFormZeichnet)return;
  if(t.dataset&&t.dataset.measStaerke){
   measStaerke=measStaerkeZahl(t.value);
   measStaerkeFelderSetzen();
   // v3.33: die Staerke entscheidet ueber den Bestandseintrag und damit ueber
   // Rolle oder Tafel - der Zuschnitt muss deshalb mit.
   if(typeof measZuschnittNeuZeichnen==="function")measZuschnittNeuZeichnen();
   return;
  }
  // v3.33: die ausdrueckliche Wahl Rolle/Tafel. Sie schlaegt den
  // Materialbestand; "automatisch" gibt die Entscheidung dorthin zurueck.
  if(t.dataset&&t.dataset.measZform){
   measZuschnittForm=measZuschnittFormWert(t.value);
   measStaerkeFelderSetzen();
   // Der Zuschnitt haengt daran - die offene Aufnahme wird neu gezeichnet.
   if(typeof measZuschnittNeuZeichnen==="function")measZuschnittNeuZeichnen();
   return;
  }
  // Wechselt das Material, aendern sich die angebotenen Staerken. Der
  // bisherige Wert bleibt stehen - er wird oben als "nicht im
  // Materialbestand" gekennzeichnet, statt still zu verschwinden.
  if(t.matches&&t.matches(MEAS_MATERIAL_FELDER.join(",")))measStaerkeFelderSetzen();
 });
 let geplant=false;
 const nachziehen=()=>{
  if(geplant)return;
  geplant=true;
  requestAnimationFrame(()=>{geplant=false;measStaerkeFelderSetzen()});
 };
 const los=()=>{
  measStaerkeFelderSetzen();
  try{
   new MutationObserver(()=>{if(!measStaerkeBaut)nachziehen()})
    .observe(document.body,{childList:true,subtree:true});
  }catch(e){/* ohne Beobachter bleiben die Felder des ersten Aufbaus */}
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",los);
 else los();
})();

// ---------------------------------------------------------------------------
// Zuschnitt aus Rolle oder Tafel                          Version 3.33
//
// WOZU: Die Form entscheidet, WIE gerechnet wird - eine Rolle hat nur eine
// Breite (die Abschnittlaenge folgt aus dem laengsten Stueck), eine Tafel hat
// Laenge UND Breite. Normalerweise steht sie im Materialbestand (js/59): fuehrt
// die Firma fuer diese Materialart und Staerke nur eine Form, ist die Sache
// eindeutig, und hier muss niemand etwas waehlen.
//
// Fuehrt sie beides, kann die App es nicht wissen - dann waehlt der Anwender.
// Es wird NICHTS geraten: ohne eindeutigen Bestand und ohne Wahl rechnet die
// App wie bisher mit der Rolle und sagt in der Zuschnittliste ausdruecklich,
// warum (js/29 ebaFormate -> js/33 zuMeldungenHtml).
//
// GLEICHES MUSTER wie die Materialstaerke oben: die Wahrheit liegt in
// measZuschnittForm, nicht im DOM, und das Feld haengt sich an dieselben zwoelf
// Materialfelder. Kein Fachmodul wird angefasst.
// ---------------------------------------------------------------------------


function measZuschnittFormWert(v){
 return (v==="rolle"||v==="tafel")?v:null;
}
function measZuschnittFormGet(){return measZuschnittForm}
function measZuschnittFormSetzen(v){
 measZuschnittForm=measZuschnittFormWert(v);
 measStaerkeFelderSetzen();
}
function measZuschnittFormZuruecksetzen(){measZuschnittFormSetzen(null)}

// Was der Materialbestand fuer diese Art und Staerke hergibt - ausschliesslich
// ueber restBedarfForm (js/42), keine zweite Quelle.
function measFormBedarf(materialId){
 if(typeof restBedarfForm!=="function")return {form:null,grund:"kein-lager",formate:[]};
 return restBedarfForm(materialId,measStaerkeGet());
}
function measZuschnittFormHinweis(materialId){
 const mid=Number(materialId);
 if(!Number.isFinite(mid)||mid<=0)
  return "Zuerst das Material wählen – Rolle oder Tafel kommt aus dem Materialbestand der Firma.";
 const b=measFormBedarf(mid);
 if(measZuschnittForm)
  return measZuschnittForm==="tafel"&&!(b.formate||[]).length
   ? "Für dieses Material ist im Materialbestand kein Tafelformat hinterlegt – "
    +"gerechnet wird mit der Rolle, und das steht auch in der Zuschnittliste."
   : "";
 if(b.form==="rolle")return "Laut Materialbestand: Rollenmaterial.";
 if(b.form==="tafel")
  return (b.formate||[]).length
   ? "Laut Materialbestand: Tafelmaterial ("+(b.formate||[]).map(f=>f.text).join(" · ")+")."
   : "Laut Materialbestand Tafelmaterial, aber ohne Format – gerechnet wird mit der Rolle.";
 return (typeof restFormGrundText==="function")?restFormGrundText(b.grund):"";
}
function measZuschnittFormInhalt(feld){
 const mid=feld?feld.value:"";
 const hinweis=measZuschnittFormHinweis(mid);
 const info=(typeof hilfeKnopf==="function")?hilfeKnopf("meas-zuschnitt-form"):"";
 const w=measZuschnittForm;
 return `<label>Zuschnitt aus ${info}</label>`
  +`<select data-meas-zform="1">`
  +`<option value=""${w?"":" selected"}>– automatisch (Materialbestand) –</option>`
  +`<option value="rolle"${w==="rolle"?" selected":""}>Rolle</option>`
  +`<option value="tafel"${w==="tafel"?" selected":""}>Tafel</option>`
  +`</select>`
  +(hinweis?`<div class="small" style="color:var(--muted);margin-top:2px">${esc(hinweis)}</div>`:"");
}

// Der Zuschnitt haengt an Form UND Staerke (die Staerke entscheidet ueber den
// Bestandseintrag und damit ueber Rolle oder Tafel). Aendert sich eines von
// beiden, muss das offene Register neu gezeichnet werden - sonst stuende dort
// ein Plan, der nicht mehr zur Wahl passt.
//
// Gezeichnet wird ausschliesslich mit der Renderfunktion des jeweiligen
// Moduls; es entsteht keine zweite Zeichenlogik.
const MEAS_FORM_RENDER={
 einlaufblech_gerade:"renderEinlaufblechAufnahme",
 einlaufblech_konisch:"renderEinlaufblechKonischAufnahme",
 freies_profil:"renderFreiesProfilAufnahme",
 mauerabdeckung:"renderMauerabdeckungAufnahme",
 lukarne:"renderLukarneAufnahme",
 anschlussblech:"renderAnschlussblechAufnahme",
 einfassung_rund:"renderEinfassungAufnahme",
 kamineinfassung:"renderKaminAufnahme",
 kehle:"renderKehleAufnahme",
 rinne:"renderRinneAufnahme"
};
function measZuschnittNeuZeichnen(){
 if(measFormZeichnet)return;
 const sel=(typeof $==="function")?$("measType"):null;
 const name=sel?MEAS_FORM_RENDER[sel.value]:null;
 if(!(name&&typeof window[name]==="function"))return;
 // Chromium feuert auf einem Feld mit Fokus beim Ersetzen des Inhalts noch
 // ein "change" (CLAUDE.md 103.4). Ohne diese Sperre riefe der Handler sich
 // ueber das gerade ersetzte Auswahlfeld selbst wieder auf.
 measFormZeichnet=true;
 try{window[name]()}finally{measFormZeichnet=false}
}
