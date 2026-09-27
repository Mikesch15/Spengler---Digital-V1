"use strict";
// ---------------------------------------------------------------------------
// v3.211  Das Ruestblatt - die kurze Sicht auf eine Massaufnahme
// ---------------------------------------------------------------------------
// GEWUENSCHT
// "Ich will eine ansicht, die nicht die komplette massaufnahme oeffnet. Ich
//  will nur das wichtigste sehen wie das vermasste profil mit den
//  entsprechenden laengen."
//
// Genau diese Sicht gab es bisher an EINER Stelle: in der Werkstatt nach
// Projekt, beim Aufklappen einer Karte (v3.30). Ueberall sonst - Werkstatt
// nach Material, Seite "Material & Zuschnitt", Projektseite der neuen Ansicht
// - fuehrte jeder Weg ins volle Formular mit allen Registern.
//
// Hier steht sie EINMAL und wird von allen vier Stellen benutzt. Sie ist
// bewusst kein zweites Formular: es gibt nichts zu tippen und nichts zu
// speichern ausser dem Abhaken, das ohnehin zur Zuschnittliste gehoert.
//
// GERECHNET WIRD NICHTS.
//   Zeichnungen      rsSkizzen()      js/60 - dieselbe Quelle wie der Ausdruck
//   Zuschnittplan    pmatPlanFuer()   js/48 - der GESPEICHERTE Plan
//   Liste            zuListeHtml()    js/33 - derselbe Zeichner wie ueberall
//   Stand            zeStand()        js/56 - dieselbe Zaehlung wie ueberall
// Kein zweiter Zusammenbau, keine zweite Rechnung, keine zweite Wahrheit.
//
// Zwei Groessen, EIN Blatt (so vom Anwender gewaehlt):
//   - in der Liste aufgeklappt (rbBlattHtml), wo man vergleicht
//   - gross auf eigenem Schirm (rbGross), wo man an der Abkantbank steht
// Beide zeigen dasselbe HTML aus derselben Funktion.
// ---------------------------------------------------------------------------

// Die Massaufnahme zu einer Id - aus den Listen, die ohnehin geladen sind.
// Zuerst der Projekt-Zwischenspeicher (Projektseite, Material & Zuschnitt),
// dann die Werkstattzeilen. Beide fuehren den vollen Datensatz mit (select *
// bzw. werkZeilen seit v3.21), und ohne data gaebe es keine Zeichnung.
// Nicht gefunden heisst: fuer diesen Benutzer gibt es die Zeile nicht (RLS) -
// dann passiert nichts, statt eine Id weiterzureichen, die nirgends aufgeht.
function rbFinde(id){
 const gleich=x=>x&&String(x.id)===String(id);
 const quellen=[
  (typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache:[],
  (typeof werkZeilen!=="undefined"&&Array.isArray(werkZeilen))?werkZeilen:[]
 ];
 for(let i=0;i<quellen.length;i++){
  const t=quellen[i].find(gleich);
  if(t)return t;
 }
 return null;
}

function rbPlan(m){
 return (typeof pmatPlanFuer==="function")?pmatPlanFuer(m):null;
}
function rbStand(m){
 return (typeof zeStand==="function")?zeStand(m)
  :{gesamt:0,erledigt:0,offen:0,veraltet:0,fertig:false};
}
// Art und Titel - dieselbe Beschriftung wie im Cockpit und in der Werkstatt.
function rbTitel(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m&&m.type])||(m&&m.type)||"Massaufnahme";
 const t=String((m&&m.title)||"").trim();
 return t?(art+" · "+t):art;
}
// Material und Staerke. Der Plan traegt den lesbaren Namen bereits mit
// (plan.materialText, js/48); ohne Plan wird derselbe Name ueber dieselbe
// Funktion geholt, die die Seite "Material & Zuschnitt" verwendet. Erfunden
// wird nichts: fehlt beides, steht hier nichts.
function rbMaterialText(m,plan){
 if(plan&&plan.materialText)return String(plan.materialText);
 const name=(typeof pmatMaterialName==="function")
  ?String(pmatMaterialName(((m&&m.data)||{}).material)||""):"";
 const st=(typeof measStaerkeText==="function")?measStaerkeText(m&&m.staerke_mm):"";
 return [name,st].filter(Boolean).join(" · ");
}
// Der Stand als Text. Dieselbe Regel wie werkStandText (js/51) und
// mzStandText (js/56): ohne eingeschaltetes Abhaken sind keine Haken geladen,
// dann waere "0 von 41" eine falsche Aussage - es kommt nur die Stueckzahl.
function rbStandText(s){
 if(!s||!s.gesamt)return "keine Stücke";
 if(typeof zeAbhakenMoeglich==="function"&&!zeAbhakenMoeglich())
  return s.gesamt+" Stück";
 return (s.fertig?"✓ ":"")+s.erledigt+" von "+s.gesamt+" zugeschnitten";
}

// Die vermasste Profil-/Schnittskizze und der Grundriss. Bis v3.210 stand
// diese Funktion als werkSkizzenHtml in js/51 - sie ist hierher gezogen,
// weil jetzt vier Stellen sie brauchen; js/51 ruft sie von hier.
function rbSkizzenHtml(m){
 if(typeof rsSkizzen!=="function")return "";
 const liste=rsSkizzen(m);
 if(!liste.length)return '<div class="small werk-skizze-leer">Für diese Art gibt es keine Skizze.</div>';
 return '<div class="werk-skizzen">'+liste.map(s=>
   `<figure class="werk-skizze"><figcaption>${esc(s.titel)}</figcaption>${s.svg}</figure>`).join("")+"</div>";
}

// Das Blatt selbst. kopf:true stellt Art, Titel, Material und Stand darueber -
// auf dem grossen Schirm noetig, in einer Liste steht das schon in der Zeile.
function rbBlattHtml(m,opt){
 if(!m)return '<div class="small" style="color:var(--muted)">Diese Massaufnahme steht gerade nicht zur Verfügung.</div>';
 const o=opt||{};
 const plan=rbPlan(m);
 const stand=rbStand(m);
 let h='<div class="rb-blatt">';
 if(o.kopf){
  const mat=rbMaterialText(m,plan);
  h+=`<div class="rb-kopf"><b>${esc(rbTitel(m))}</b>`
   +(mat?`<span class="small">${esc(mat)}</span>`:"")
   +(plan?`<span class="small rb-stand">${esc(rbStandText(stand))}</span>`:"")
   +`</div>`;
 }
 h+=rbSkizzenHtml(m);
 h+=plan
  ? ((typeof zuListeHtml==="function")?zuListeHtml(plan):"")
  : '<div class="small" style="color:var(--muted)">Für diese Massaufnahme ist kein Zuschnitt gespeichert.</div>';
 return h+"</div>";
}

// Der Knopf, der dasselbe Blatt gross zeigt. Steht ueberall gleich, damit er
// ueberall gleich aussieht und gleich heisst.
function rbGrossKnopfHtml(id,zurueck){
 return `<button type="button" class="gray" data-rb-gross="${esc(id)}"`
  +(zurueck?` data-rb-zurueck="${esc(zurueck)}"`:"")
  +`>⤢ Gross ansehen</button>`;
}

// ---- Der grosse Schirm ----------------------------------------------------
// Ein eigener Schirm, kein zweiter Arbeitsplatz: dasselbe Blatt, nur gross
// genug fuer die Abkantbank. Der Weg ins Formular steht darin - wer wirklich
// etwas aendern will, kommt mit einem Tipp hin und danach wieder zurueck.
let rbOffenId=null;
let rbZurueck="";          // wohin measEditZurueck() spaeter zurueckfuehrt
function rbGross(id,zurueck){
 const m=rbFinde(id);
 if(!m)return false;
 const schirm=$("ruestblattModal"), koerper=$("ruestblattBody");
 if(!schirm||!koerper)return false;
 rbOffenId=m.id;
 rbZurueck=zurueck||"";
 koerper.innerHTML=rbBlattHtml(m,{kopf:true});
 schirm.hidden=false;
 window.scrollTo(0,0);
 // Der Leerraum der festen viewBox wird erst NACH dem Einfuegen
 // weggeschnitten - vorher gibt getBBox nichts her (js/60).
 if(typeof rsZuschneiden==="function")rsZuschneiden(koerper);
 return true;
}
function rbZu(){
 const schirm=$("ruestblattModal");
 if(schirm)schirm.hidden=true;
 rbOffenId=null;
}
// Nach einem Haken nur die Zahl nachziehen, NICHT neu zeichnen - sonst
// spraenge das Blatt unter dem Finger weg und die gerade angetippte Nummer
// waere verschwunden (dieselbe Falle wie in js/51 und js/56). Gerufen wird
// das von zeNachziehen() in js/56, wie die uebrigen Nachzieher auch.
function rbStandAuffrischen(){
 const schirm=$("ruestblattModal");
 if(!schirm||schirm.hidden||rbOffenId===null)return;
 const m=rbFinde(rbOffenId);
 const feld=schirm.querySelector(".rb-stand");
 if(m&&feld)feld.textContent=rbStandText(rbStand(m));
}

document.addEventListener("click",e=>{
 const gross=e.target.closest("[data-rb-gross]");
 if(gross){
  rbGross(gross.getAttribute("data-rb-gross"),gross.getAttribute("data-rb-zurueck")||"");
  return;
 }
 if(e.target.closest("#closeRuestblatt")){ rbZu(); return }
 if(e.target.closest("#ruestblattFormular")){
  const m=rbOffenId===null?null:rbFinde(rbOffenId);
  const wohin=rbZurueck;
  rbZu();
  if(m&&typeof openMeasurement==="function"){
   if(wohin&&typeof measEditReturnTo!=="undefined")measEditReturnTo=wohin;
   openMeasurement(m);
  }
 }
});
