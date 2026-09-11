"use strict";
// ============================================================================
// Rinne · Zuschnittliste als Aufnahme in sechs Registern (v3.00)
//
//   1 Grunddaten · 2 Profil · 3 Stücke · 4 Zuschnitt · 5 Ausmass · 6 Kontrolle
//
// Zehntes Modul nach demselben Muster wie Rinne Halbrund (v2.71), Einlaufblech
// gerade (v2.74) und konisch (v2.76), Freies Profil (v2.77), Mauerabdeckung
// (v2.79), Kehle (v2.83), Lukarne (v2.87), Kamineinfassung (v2.90) und
// Einfassung Rund (v2.96).
//
// EIN UNTERSCHIED ZU DEN NEUN VORHERIGEN, und er bestimmt den ganzen Aufbau:
// js/26-rinne.js haengt seine Handler DIREKT an #rp_profilBody und
// #rp_stueckeBody (nicht delegiert an einen stabilen Vorfahren) und zeichnet
// selbst in diese Elemente. Ein Neuschreiben per innerHTML wuerde sie samt
// Handler vernichten - dieselbe Falle wie beim Uebernahme-Block des
// Einlaufblechs (CLAUDE.md 84.3) und beim Erkennungs-Block des Freien Profils
// (85.2). Deshalb gibt es hier KEINEN Stummel: die Register 1 bis 3 stehen
// FEST im HTML und werden nur ein- und ausgeblendet; js/39 schreibt
// ausschliesslich in die Register 4 bis 6, in die Registerleiste und in die
// Blaetterleiste.
//
// Die FACHRECHNUNG bleibt js/26-rinne.js - byteweise unveraendert. Gerechnet
// wird ueber rinneStueckRechnen(), rinneFixSumme(), rinneVariable() und
// rinneWerte(); es gibt KEINEN Nachbau. Die Excel-Vorlage "Zuschnittliste
// Rinnen.xlsx" bleibt damit unveraendert die Referenz.
// ============================================================================

const RPA_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Profil",hilfe:"rp-profil"},{nr:3,kurz:"Stücke",hilfe:"rp-stuecke"},
 {nr:4,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:5,kurz:"Ausmass",hilfe:"reg-ausmass"},{nr:6,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt an der
// Registerzahl, nicht an einer festen Nummer.
const RPA_KONTROLLE=RPA_REGISTER.length;
let rpaSchritt=1;
// true, solange die Registerflaeche neu gezeichnet wird. Chromium feuert auf
// einem Eingabefeld, das gerade den Fokus hat, beim Ersetzen des Inhalts noch
// ein change - und der Knoten meldet sich dabei als weiterhin im Dokument
// (gemessen, CLAUDE.md 103.4). Ohne diese Sperre schriebe der delegierte
// Handler den alten Feldwert in den GERADE FRISCH gesetzten Zustand zurueck.
// Waehrend des Zeichnens ist kein input/change eine echte Benutzereingabe.
let rpaZeichnet=false;
// Welche Rollen fuer DIESE Massaufnahme gelten. Leer = ganzes Blechlager.
let rpaRollenAuswahl=[];

const rpaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const rpaMm=v=>Math.round(rpaZahl(v)).toLocaleString("de-CH");
const rpaQm=v=>rpaZahl(v).toFixed(2).replace(".",",");
const rpaMeter=v=>(rpaZahl(v)/1000).toFixed(2).replace(".",",");

// ---- Brücke zur Fachrechnung (js/26) ---------------------------------------
// rinneProfil, rinneAnsetz und rinneStuecke sind der Zustand von js/26; dieses
// Modul haelt keinen zweiten. Gerechnet wird ausschliesslich mit den dortigen
// Funktionen.
function rpaWerte(){
 return (typeof rinneAktiveWerte==="function")?rinneAktiveWerte():{profil:[],ansetz:{}};
}
function rpaStuecke(){
 return (typeof rinneStuecke!=="undefined"&&Array.isArray(rinneStuecke))?rinneStuecke:[];
}
function rpaProfil(){
 return (typeof rinneProfil!=="undefined"&&Array.isArray(rinneProfil))?rinneProfil:[];
}
function rpaRechnen(st){
 if(typeof rinneStueckRechnen!=="function")return null;
 return rinneStueckRechnen(st,rpaWerte());
}
function rpaVarListe(){
 return (typeof rinneVariable==="function")?rinneVariable(rpaProfil()):[];
}
function rpaFixSumme(){
 return (typeof rinneFixSumme==="function")?rinneFixSumme(rpaProfil()):0;
}
function rpaMaterialWert(){
 return $("rp_material")?$("rp_material").value:"";
}
function rpaMaterialText(){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(rpaMaterialWert()):null;
 return m?m.name:"kein Material gewählt";
}
function rpaAnsetzText(k){
 return (typeof RINNE_ANSETZ_LABELS==="object"&&RINNE_ANSETZ_LABELS[k])||k||"–";
}

// ---- Zuschnitte -------------------------------------------------------------
// Ein Rinnenstueck ist EIN Zuschnitt: Laenge = Zuschnittlaenge (Laenge M/M +
// Ansetzen links + rechts), Breite = Abwicklung.
//
// Links und rechts koennen unterschiedlich abwickeln. Die STREIFENBREITE ist
// dann die GROESSERE der beiden - das breitere Ende muss Platz haben. Genau so
// steht es seit v2.84 auch im Ausdruck.
//
// merkmal trennt die Gruppen in der Zuschnittliste (js/33): gleiche Laenge und
// gleiche Breite genuegen nicht, wenn die Enden anders bearbeitet werden - ein
// Stueck mit Gehrung ist ein anderer Zuschnitt als eines mit Dila. Ein
// konisches Stueck wird ebenfalls getrennt, sonst verschwaende der schmalere
// Wert in einer Sammelzeile.
function rpaBleche(){
 const out=[];
 rpaStuecke().forEach((st,i)=>{
  const g=rpaRechnen(st);
  if(!g)return;
  const l=Math.round(rpaZahl(g.zuschnitt));
  const bL=Math.round(rpaZahl(g.abwicklungLinks));
  const bR=Math.round(rpaZahl(g.abwicklungRechts));
  const b=Math.max(bL,bR);
  if(!(l>0)||!(b>0))return;          // ohne Laenge oder Breite kein Zuschnitt
  const konisch=bL!==bR;
  out.push({nr:i+1,laenge:l,breite:b,
    merkmal:rpaAnsetzText(st.ansetzL)+" / "+rpaAnsetzText(st.ansetzR)
      +(konisch?" · konisch "+rpaMm(bL)+"/"+rpaMm(bR):""),
    hinweis:konisch?("Abw. "+rpaMm(bL)+" / "+rpaMm(bR)+" mm"):""});
 });
 return out;
}
function rpaFlaecheM2(){
 return rpaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
}
function rpaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(rpaRollenAuswahl)
   :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
// Gepackt wird je Streifenbreite - mit derselben Packrechnung wie ueberall
// (ebaPackeInStreifen, js/29). Es gibt in der App nur EINE. Gleiches Vorgehen
// wie beim Freien Profil und bei der Lukarne, wo ebenfalls nicht jedes Stueck
// dieselbe Breite hat.
function rpaRollenPlan(){
 const bleche=rpaBleche();
 const netto=rpaFlaecheM2();
 if(!bleche.length||typeof ebaFormatPlan!=="function")
  return {gruppen:[],moeglich:[],zuSchmal:[],bestes:null,netto,optimal:true,
          ...ebaFormLeer((typeof rpaMaterialWert==="function")?rpaMaterialWert():null)};
 const nach=new Map();
 bleche.forEach(x=>{
  if(!nach.has(x.breite))nach.set(x.breite,[]);
  nach.get(x.breite).push(x);
 });
 // v3.27: passende Reststuecke fallen VOR der Rollenrechnung aus dem Bedarf -
 // je Gruppe mit DEREN Zuschnittbreite, denn ein Rest muss dazu passen.
 // Gerechnet wird in restVorabzug() (js/42) mit der bestehenden Packrechnung;
 // bei ausgeschalteter Einstellung kommt die Liste unveraendert zurueck.
 let optimal=true;
 const ausResten=[];
 const gruppen=Array.from(nach.keys()).sort((a,b)=>b-a).map(B=>{
  const vor=(typeof ebaVorabzug==="function")
   ?ebaVorabzug(nach.get(B),{material:rpaMaterialWert(),abwicklung:B})
   :{bleche:nach.get(B),ausResten:[],abschnittLaenge:0};
  const liste=vor.bleche||[];
  (vor.ausResten||[]).forEach(x=>ausResten.push(x));
  if(!liste.length)return {breite:B,stuecke:[],abschnittLaenge:0,streifen:[]};
  return {breite:B,stuecke:liste,bleche:liste};
 // Eine Gruppe, deren Stuecke vollstaendig aus Resten kommen, hat fuer die
 // Rolle nichts mehr - sie faellt raus.
 }).filter(g=>g.stuecke.length);
 // v3.33: Rolle oder Tafel entscheidet der Materialbestand bzw. die Wahl an
 // der Massaufnahme. Gepackt wird weiterhin je Gruppe mit DERSELBEN
 // Packrechnung (ebaPackeInStreifen, js/29) - es gibt in der App nur EINE.
 const fm=ebaFormate({material:rpaMaterialWert()});
 const p=ebaFormatPlan({gruppen,formate:fm.formate,form:fm.form,netto});
 if(p.optimal===false)optimal=false;
 return {gruppen:p.gruppen,moeglich:p.moeglich,zuSchmal:p.zuSchmal,
         zuLang:p.zuLang,zuKurz:p.zuKurz,bestes:p.bestes,netto:p.netto,optimal,
         form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,formate:p.formate,
         ausResten};
}
// Der Plan in der gemeinsamen Form (js/33) - damit sieht der Zuschnitt in
// allen Arten gleich aus.
function rpaZuschnittPlan(){
 const rp=rpaRollenPlan();
 return {art:rp.form, form:rp.form,
  formGrund:rp.formGrund, formQuelle:rp.formQuelle,
  einheit:"Stück",
  material:($("rp_material")?$("rp_material").value:null)||null,
  einleitung:(typeof zuEinleitung==="function")?zuEinleitung(rp.form):"",
  quelle:(typeof zuQuelle==="function")?zuQuelle(rp.form):"",
  leer:(typeof ebaLeerText==="function")
    ?ebaLeerText({form:rp.form,formate:rp.formate||[]},
       rpaBleche().length?"":"Noch nichts zuzuschneiden – bitte zuerst Rinnenstücke mit einer Länge M/M erfassen.")
    :"",
  streifenbreiten:rp.gruppen.map(g=>g.breite),
  gruppen:rp.gruppen, moeglich:rp.moeglich, netto:rp.netto,
  ausResten:rp.ausResten||[],
  zuLang:rp.zuLang||[], zuKurz:rp.zuKurz||[],
  zuSchmal:rp.zuSchmal, optimal:rp.optimal!==false};
}

// Bei Tafelmaterial gibt es keine Rollenbreite zu waehlen (js/33).
function rpaZuschnittHtml(){
 if(typeof zuschnittHtml!=="function")return "";
 const plan=rpaZuschnittPlan();
 return ((typeof zuAuswahlHtml==="function")
   ?zuAuswahlHtml(rpaRollenAuswahl,"data-rpa-rolle",plan.art):"")
  +zuschnittHtml(plan);
}

// ---- Ausmass ----------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function rpaAusmassZeilen(){
 const st=rpaStuecke();
 const z=[]; let pos=0;
 // v3.17: teil sagt, ob die Zeile ein Teil ist, das beschafft wird (Halbfabrikat,
 // gekaufter Artikel), oder ein abgeleitetes Mass. Die Reservierung nimmt nur
 // Teile. Ohne vierten Wert gilt "abgeleitet" - eine Zahl ueber die Arbeit ist
 // nichts, was jemand aus dem Lager holt.
 const zeile=(bez,menge,einheit,herkunft,teil)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:teil===true});
 if(!st.length)return z;
 const summeZuschnitt=st.reduce((s,x)=>{const g=rpaRechnen(x);return s+(g?rpaZahl(g.zuschnitt):0)},0);
 const summeMM=st.reduce((s,x)=>s+rpaZahl(x.laenge),0);
 zeile("Rinnenstücke",String(st.length),"Stk.","erfasste Stücke");
 zeile("Länge M/M gesamt",rpaMeter(summeMM),"m","Summe der Längen M/M");
 zeile("Zuschnittlänge gesamt",rpaMeter(summeZuschnitt),"m","Länge M/M + Ansetzen links und rechts");
 zeile("Blechfläche Zuschnitt",rpaQm(rpaFlaecheM2()),"m²","Zuschnittlänge × Abwicklung");
 const fix=rpaFixSumme(), varListe=rpaVarListe();
 zeile("Fixmasse des Profils",rpaMm(fix),"mm","Summe aller fixen Profilsegmente");
 if(varListe.length)
  zeile("Variable Masse je Stück",String(varListe.length),"Stk.",
    varListe.map(v=>v.buchstabe).join(", "));
 // Je verwendeten Ansetztyp eine Position - er ist ein echter Arbeitsschritt
 // am Stueckende, kein Rechenwert.
 const zaehler={};
 st.forEach(x=>{
  [x.ansetzL,x.ansetzR].forEach(k=>{if(!k)return; zaehler[k]=(zaehler[k]||0)+1});
 });
 const reihe=(typeof RINNE_ANSETZ_REIHE!=="undefined"&&Array.isArray(RINNE_ANSETZ_REIHE))
   ?RINNE_ANSETZ_REIHE:Object.keys(zaehler);
 reihe.forEach(k=>{
  if(!zaehler[k])return;
  if(k==="nichts")return;            // kein Arbeitsschritt, nichts zu messen
  zeile("Ansetzen "+rpaAnsetzText(k),String(zaehler[k]),"Stk.","gezählte Stückenden");
 });
 return z;
}
function rpaMaterialTabelle(){
 const m=(typeof findMeasurementMaterial==="function")?findMeasurementMaterial(rpaMaterialWert()):null;
 return m?[{name:m.name}]:[];
}

// ---- Kontrolle --------------------------------------------------------------
// Nur Pruefungen, die sich aus dem bestehenden Modul und den erfassten Daten
// ableiten lassen. Es werden KEINE eigenen Grenzwerte erfunden.
function rpaPruefungen(){
 const m=[];
 const profil=rpaProfil(), stuecke=rpaStuecke();
 if(!rpaMaterialWert())m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 if(!profil.length){
  m.push({art:"fehler",text:"Das Rinnenprofil ist leer – bitte mindestens ein Segment anlegen."});
  return m;
 }
 const varListe=rpaVarListe();
 if(!varListe.length)
  m.push({art:"warnung",text:"Das Profil hat kein variables Mass – die Abwicklung ist dann bei "
    +"jedem Stück gleich (nur die Fixmasse)."});
 profil.forEach((seg,i)=>{
  // v3.66: ein fixes Segment ohne Laenge ist jetzt ein Fehler (Pflichtfeld),
  // keine blosse Warnung mehr.
  if(seg.art==="fix"&&!(rpaZahl(seg.laenge)>0))
   m.push({art:"fehler",text:"Segment "+(i+1)+(seg.name?" („"+seg.name+"“)":"")
     +" ist fix, hat aber keine Länge."});
  if(rpaZahl(seg.laenge)<0)
   m.push({art:"fehler",text:"Segment "+(i+1)+" hat eine negative Länge."});
  // Der Winkel darf bewusst 0° sein ("gerade weiter") - aber nicht leer.
  if(seg.winkel===""||seg.winkel===null||seg.winkel===undefined)
   m.push({art:"fehler",text:"Segment "+(i+1)+(seg.name?" („"+seg.name+"“)":"")
     +": der Winkel fehlt (0° eingeben, falls gerade weiter)."});
 });
 if(!stuecke.length){
  m.push({art:"fehler",text:"Es ist noch kein Rinnenstück erfasst."});
  return m;
 }
 stuecke.forEach((st,i)=>{
  const g=rpaRechnen(st);
  if(!(rpaZahl(st.laenge)>0))
   m.push({art:"fehler",text:"Stück "+(i+1)+": die Länge M/M fehlt."});
  if(g&&rpaZahl(st.laenge)>0&&!(rpaZahl(g.zuschnitt)>0))
   m.push({art:"fehler",text:"Stück "+(i+1)+": die Zuschnittlänge ist "
     +rpaMm(g.zuschnitt)+" mm – das Ansetzen zieht mehr ab, als das Stück lang ist."});
  const leer=[];
  varListe.forEach((v,j)=>{
   const l=(st.links||[])[j], r=(st.rechts||[])[j];
   if(l===""||l===null||l===undefined)leer.push(v.buchstabe+" links");
   if(r===""||r===null||r===undefined)leer.push(v.buchstabe+" rechts");
  });
  // v3.66: ein fehlendes variables Mass ist jetzt ein Fehler, kein blosser
  // Hinweis mehr - "wird mit 0 gerechnet" ist genau das stille Verhalten,
  // das kein Mass mehr vergessen werden darf.
  if(leer.length)
   m.push({art:"fehler",text:"Stück "+(i+1)+": Mass "+leer.join(", ")+" fehlt."});
 });
 const plan=rpaRollenPlan();
 // v3.33: die Meldung nennt, woraus wirklich geschnitten wird.
 const rpaTafel=plan.form==="tafel";
 if(rpaBleche().length&&!(plan.formate||[]).length)
  m.push({art:"warnung",text:"Es ist "+(rpaTafel?"kein Tafelformat":"keine Rollenbreite")
    +" hinterlegt – der Materialbedarf wird nicht gerechnet."});
 else if(rpaBleche().length&&!plan.bestes)
  m.push({art:"warnung",text:rpaTafel
    ?"Kein hinterlegtes Tafelformat passt zu diesem Zuschnitt."
    :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung."});
 return m;
}

// ---- Anzeige ----------------------------------------------------------------
function rpaKarte(titel,inhalt){
 // Info-Knopf nur an der Hauptkarte des Registers (js/41-hilfe.js).
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,RPA_REGISTER):"";
 return `<div class="card"><h2>${esc(titel)}${h}</h2>${inhalt}</div>`;
}
function rpaAusmassHtml(){
 const z=rpaAusmassZeilen();
 const mat=rpaMaterialTabelle();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst Rinnenstücke erfassen.</div>`;
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe. Ohne
Artikelnummern und ohne Preise – die Materialliste der Firma kommt später dazu.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td>
<td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td>
<td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:14px">Material</h2>
${mat.length?`<div class="ra-ok">${esc(mat[0].name)}</div>`
 :`<div class="ra-warnung">Es ist noch kein Material gewählt.</div>`}`;
}
function rpaKontrolleHtml(){
 const m=rpaPruefungen();
 const varListe=rpaVarListe();
 const stuecke=rpaStuecke();
 const summeZuschnitt=stuecke.reduce((s,x)=>{const g=rpaRechnen(x);return s+(g?rpaZahl(g.zuschnitt):0)},0);
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td>${esc(rpaMaterialText())}</td></tr>
<tr><td>Profilsegmente</td><td>${rpaProfil().length}</td></tr>
<tr><td>Variable Masse</td><td>${varListe.length?esc(varListe.map(v=>v.buchstabe).join(", ")):"keine"}</td></tr>
<tr><td>Fixmasse gesamt</td><td>${rpaMm(rpaFixSumme())} mm</td></tr>
<tr><td>Rinnenstücke</td><td>${stuecke.length}</td></tr>
<tr><td>Zuschnittlänge gesamt</td><td>${rpaMm(summeZuschnitt)} mm</td></tr>
<tr><td>Blechfläche</td><td>${rpaQm(rpaFlaecheM2())} m²</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit.
Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

// ---- Register und Blättern --------------------------------------------------
function rpaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function rpaSetzeSchritt(n){
 rpaSchritt=Math.max(1,Math.min(RPA_REGISTER.length,Number(n)||1));
 renderRinneAufnahmeRegister();
 // Der Foto-/Skizzenbereich haengt am Register: nur das letzte zeigt ihn.
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("rpa_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function rpaRegisterHtml(){
 const pr=rpaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const warn=pr.length-fehler;
 return RPA_REGISTER.map(r=>{
  const marke=r.nr===RPA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===rpaSchritt?" aktiv":""}" data-rpa-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("");
}
// Die Register 1 bis 3 stehen FEST im HTML (siehe Kopf dieser Datei) und
// werden nur ein- und ausgeblendet. Geschrieben wird ausschliesslich in die
// Register 4 bis 6.
function renderRinneAufnahmeRegister(){
 const wurzel=$("measTypeRinneProfil");
 if(!wurzel)return;
 rpaVerdrahten();
 const leiste=$("rpa_register");
 rpaZeichnet=true;
 try{
 if(leiste)leiste.innerHTML=rpaRegisterHtml();
 for(let n=1;n<=RPA_REGISTER.length;n++){
  const seite=$("rpa_seite"+n);
  if(seite)seite.hidden=(n!==rpaSchritt);
 }
 if(rpaSchritt===4){
  const z=$("rpa_seite4");
  if(z)z.innerHTML=rpaKarte(zuTitel(4,ebaFormLeer(rpaMaterialWert()).form),
    rpaZuschnittHtml());
 }
 if(rpaSchritt===5){
  const z=$("rpa_seite5");
  if(z)z.innerHTML=rpaKarte("5 · Ausmass und Material",rpaAusmassHtml());
 }
 if(rpaSchritt===6){
  const z=$("rpa_seite6");
  if(z)z.innerHTML=rpaKarte("6 · Kontrolle",rpaKontrolleHtml());
 }
 const bl=$("rpa_blaettern");
 if(bl)bl.innerHTML=`<button type="button" class="gray" id="rpa_zurueck"${rpaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="rpa_weiter">${
 rpaSchritt>=RPA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(RPA_REGISTER[rpaSchritt].kurz)}</button>`;
 }finally{rpaZeichnet=false}
 const aktiv=leiste&&leiste.querySelector(".ra-register-knopf.aktiv");
 if(leiste&&aktiv){
  const sr=leiste.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)leiste.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)leiste.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Die Marke am Kontroll-Register nachfuehren, OHNE neu zu zeichnen - sonst
// verliert ein gerade bearbeitetes Feld von js/26 den Fokus.
function rpaMarkeNachfuehren(){
 const knopf=document.querySelector('#rpa_register [data-rpa-schritt="'+RPA_KONTROLLE+'"]');
 if(!knopf)return;
 const pr=rpaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length;
 const alt=knopf.querySelector(".ra-register-punkt");
 if(alt)alt.remove();
 if(pr.length){
  const s=document.createElement("span");
  s.className="ra-register-punkt"+(fehler?" fehler":"");
  knopf.appendChild(s);
 }
}
function rpaVerdrahten(){
 const wurzel=$("measTypeRinneProfil");
 if(!wurzel||wurzel.dataset.rpaVerdrahtet)return;
 wurzel.dataset.rpaVerdrahtet="1";

 // Jede Eingabe in den Registern 1 bis 3 gehoert js/26. Hier wird NICHT neu
 // gezeichnet - nur die Marke am Kontroll-Register nachgefuehrt.
 wurzel.addEventListener("input",()=>{if(rpaZeichnet)return;rpaMarkeNachfuehren()});
 wurzel.addEventListener("change",e=>{
  if(rpaZeichnet)return;
  const t=e.target;
  if(typeof zuRollenKlick==="function"){
   const w=zuRollenKlick(t,"data-rpa-rolle");
   if(w!==null){rpaRollenAuswahl=w; renderRinneAufnahmeRegister(); return}
  }
  rpaMarkeNachfuehren();
 });
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-rpa-schritt]");
  if(reg){rpaSetzeSchritt(reg.dataset.rpaSchritt);return}
  if(t.id==="rpa_zurueck"){rpaSetzeSchritt(rpaSchritt-1);return}
  if(t.id==="rpa_weiter"){
   if(!pflichtPruefenUndSpringen(wurzel))return;
   if(rpaSchritt>=RPA_REGISTER.length)rpaAbschluss();
   else rpaSetzeSchritt(rpaSchritt+1);
   return;
  }
  // Ein Klick in den Registern 1 bis 3 (Segment loeschen, Stueck hinzufuegen,
  // Winkel umkehren …) gehoert js/26. Danach kann sich die Zahl der Hinweise
  // geaendert haben - die Marke wird nachgefuehrt, sonst nichts.
  setTimeout(rpaMarkeNachfuehren,0);
 });
}

// ---- Speichern / Laden ------------------------------------------------------
// js/16 schreibt weiterhin genau dieselben Felder wie bisher; hier kommen nur
// die neuen dazu. Eine Aufnahme vor v3.00 oeffnet unveraendert.
function rpaZusatzDaten(){
 const rp=rpaRollenPlan();
 return {
  flaeche_m2:Number(rpaFlaecheM2().toFixed(3)),
  ausmass:rpaAusmassZeilen(),
  // Der Kontrollstand wird MITGESPEICHERT, damit ihn der Ausdruck zeigen
  // kann, ohne ihn neu zu rechnen - genauso wie Ausmass und Rollenplan.
  kontrolle:rpaPruefungen(),
  zuschnitt:{auswahl:(rpaRollenAuswahl||[]).slice(),
             breiten:rpaRollenbreiten(),
             // v3.33: ohne die Form kann der Ausdruck nicht sagen, ob von der
             // Rolle oder aus der Tafel geschnitten wurde.
             form:rp.form, formGrund:rp.formGrund||"", formQuelle:rp.formQuelle||"",
             formLaenge:rp.bestes?(rp.bestes.laenge||null):null,
             netto:Number(rp.netto.toFixed(3)),
             bestes:rp.bestes||null,
             moeglich:rp.moeglich||[],
             gruppen:(rp.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,
               abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
               streifen:(g.streifen||[]).map(s=>({
                 stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,
                   merkmal:x.merkmal||"",hinweis:x.hinweis||""})),
                 rest:s.rest}))})),
             optimal:rp.optimal!==false,
          // v3.29: die Stuecke aus vorhandenen Resten - sie fielen bis v3.28
          // beim Speichern weg und fehlten dadurch im gespeicherten Plan ganz.
          ausResten:ebaAusRestenSpeicher(rp.ausResten)}
 };
}
// Wird von js/10 nach rinneFormularZuruecksetzen()/rinneFormularFuellen()
// aufgerufen - der Zustand selbst liegt in js/26.
function rpaZuruecksetzen(){
 rpaRollenAuswahl=[];
 rpaSchritt=1;
 renderRinneAufnahmeRegister();
}
function rpaFuellen(d){
 const w=d||{};
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v3.00), bleibt es leer = ganzes Blechlager.
 const rq=(w.zuschnitt&&w.zuschnitt.auswahl);
 rpaRollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 rpaSchritt=1;
 renderRinneAufnahmeRegister();
}
