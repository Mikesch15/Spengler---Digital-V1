"use strict";
// ===========================================================================
// Metalldach - Erfassung in sieben Registern (v3.398)
// ===========================================================================
// Die Fachrechnung steht in js/99-metalldach.js (berechneMetalldach, mdBleche,
// mdPlanSvg). Diese Datei ist die Bedienung darum herum und rechnet nichts
// selbst. Zuschnitt und PDF laufen ueber die gemeinsamen Bausteine (js/33, js/35).
// ===========================================================================

const MD_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Grundriss",hilfe:"md-grundriss"},
 {nr:3,kurz:"Scharen",hilfe:"md-scharen"},{nr:4,kurz:"Falz",hilfe:"md-falz"},
 {nr:5,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:6,kurz:"Ausmass",hilfe:"reg-ausmass"},{nr:7,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
const MD_KONTROLLE=MD_REGISTER.length;
let mdSchritt=1;
let mdBestaetigt=new Set();
// true, solange die Registerflaeche neu gezeichnet wird (siehe lukaZeichnet in js/36)
let mdZeichnet=false;

const MD_FALZ_MODI=[
 ["alle_rechts","Alle Falze nach rechts"],["alle_links","Alle Falze nach links"],
 ["von_passbahn_weg","Von der Passbahn weg"],["zur_passbahn_hin","Zur Passbahn hin"],
 ["von_mitte_weg","Von der Mitte weg"]
];

function mdLeer(){
 return {
  material:"",uhrzeiger:true,
  seiten:["","","",""],diagonalen:[],
  bezugsseite:0,winkel:90,start:"links",
  achsabstand:"",hilfsriss:"",zugabeLaenge:"",falzUnter:"",falzOber:"",
  passbahnen:[],falzModus:"alle_rechts",falzEinzel:{},
  rollenAuswahl:[]
 };
}
let mdA=mdLeer();

function mdEingaben(){return mdA}
function mdErgebnis(){return berechneMetalldach(mdEingaben())}
function mdaBleche(){return mdBleche(mdErgebnis())}

// ---- Zuschnitt (gemeinsame Bausteine, wie js/36) --------------------------
function mdaFlaecheM2(){return mdaBleche().reduce((s,x)=>s+x.laenge*x.breite,0)/1e6}
function mdaRollenbreiten(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(mdA&&mdA.rollenAuswahl)
  :((typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[]);
}
function mdaRollenPlan(){
 const bleche=mdaBleche(),netto=mdaFlaecheM2();
 if(!bleche.length||typeof ebaFormatPlan!=="function")
  return {gruppen:[],moeglich:[],zuSchmal:[],bestes:null,netto,optimal:true,...ebaFormLeer(mdA&&mdA.material)};
 const nach=new Map();
 bleche.forEach(x=>{if(!nach.has(x.breite))nach.set(x.breite,[]);nach.get(x.breite).push(x)});
 let optimal=true;
 const ausResten=[];
 const gruppen=Array.from(nach.keys()).sort((a,b)=>b-a).map(B=>{
  const vor=(typeof ebaVorabzug==="function")
   ?ebaVorabzug(nach.get(B),{material:mdA.material,abwicklung:B})
   :{bleche:nach.get(B),ausResten:[],abschnittLaenge:0};
  const liste=vor.bleche||[];
  (vor.ausResten||[]).forEach(x=>ausResten.push(x));
  return {breite:B,stuecke:liste,bleche:liste};
 }).filter(g=>g.stuecke.length);
 const fm=ebaFormate({material:mdA.material,rollen:mdA.rollenAuswahl});
 const p=ebaFormatPlan({gruppen,formate:fm.formate,form:fm.form,netto});
 if(p.optimal===false)optimal=false;
 return {gruppen:p.gruppen,moeglich:p.moeglich,zuSchmal:p.zuSchmal,zuLang:p.zuLang,zuKurz:p.zuKurz,bestes:p.bestes,
  netto:p.netto,optimal,form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,formate:p.formate,ausResten};
}
function mdaZuschnittPlan(){
 const rp=mdaRollenPlan(),g=mdErgebnis();
 return {art:rp.form,form:rp.form,formGrund:rp.formGrund,formQuelle:rp.formQuelle,
  einheit:"Bahn",material:mdA.material,
  einleitung:zuEinleitung(rp.form),quelle:zuQuelle(rp.form),
  leer:ebaLeerText({form:rp.form,formate:rp.formate||[]},
   (g.scharenOk&&g.bahnen.length)?"":"Noch nichts zuzuschneiden – bitte zuerst Grundriss und Scharen erfassen."),
  streifenbreiten:rp.gruppen.map(g2=>g2.breite),
  gruppen:rp.gruppen,moeglich:rp.moeglich,netto:rp.netto,ausResten:rp.ausResten||[],
  zuLang:rp.zuLang||[],zuKurz:rp.zuKurz||[],zuSchmal:rp.zuSchmal,optimal:rp.optimal!==false};
}

// ---- Ausmass ----------------------------------------------------------------
const mdaQm=v=>mdZ(v).toFixed(2).replace(".",",");
function mdaFalzLaenge(g){
 // Laenge aller Falze = Laenge der Trennlinien zwischen den Bahnen
 let l=0;
 if(!g.scharenOk)return 0;
 g.bahnen.forEach((b,i)=>{if(i<g.bahnen.length-1)b.stuecke.forEach(s=>{l+=Math.max(0,s.rechts.hi-s.rechts.lo)})});
 return l;
}
function mdaAusmassZeilen(){
 const g=mdErgebnis(),z=[];let pos=0;
 const zeile=(bez,menge,einheit,herkunft)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:false});
 if(!g.konstruktion||!g.konstruktion.ok)return z;
 zeile("Metalldach, Fläche",mdaQm(g.flaeche/1e6),"m²","Fläche des Grundrisses");
 zeile("Umfang",String(Math.round(g.konstruktion.umfang)),"mm","Summe der Seiten");
 if(g.scharenOk){
  zeile("Scharen",String(g.anzahl),"Stk.","aus Breite ÷ Achsabstand");
  if(g.anzahlPassbahnen)zeile("Passbahnen",String(g.anzahlPassbahnen),"Stk.","gewählte Stellen");
  zeile("Blechfläche Zuschnitt",mdaQm(mdaFlaecheM2()),"m²","Zuschnittlänge × Zuschnittbreite");
  zeile("Falzlänge",mdaQm(mdaFalzLaenge(g)/1000),"m","Trennlinien zwischen den Bahnen");
 }
 return z;
}

// ---- Kontrolle --------------------------------------------------------------
function mdaPruefungen(){
 const m=[],a=mdA,g=mdErgebnis(),k=g.konstruktion;
 if(!a.material)m.push({art:"warnung",text:"Es ist noch kein Material gewählt."});
 g.fehler.forEach(t=>m.push({art:"fehler",text:t}));
 g.warn.forEach(t=>m.push({art:"warnung",text:t}));
 if(k&&k.ok){
  k.kontrolle.forEach(c=>{
   if(Math.abs(c.abw)>MD_KONTROLL_TOL)
    m.push({art:"warnung",text:"Kontrollmass "+mdName(c.von)+"–"+mdName(c.nach)+": gemessen "+mdMm(c.soll)+" mm, aus dem Grundriss "+mdMm(c.ist)+" mm (Abweichung "+(c.abw>0?"+":"")+Math.round(c.abw)+" mm). Seiten oder Diagonalen prüfen."});
  });
  if(k.n>4&&!k.kontrolle.length)m.push({art:"warnung",text:"Es ist kein Kontrollmass erfasst – ohne eine zusätzliche Diagonale lässt sich der Grundriss nicht prüfen."});
  if(k.n===4&&!k.kontrolle.length)m.push({art:"warnung",text:"Es ist kein Kontrollmass erfasst – die zweite Diagonale prüft den Grundriss."});
 }
 const pflicht=(wert,text)=>{if(!mdHat(wert))m.push({art:"fehler",text})};
 pflicht(a.achsabstand,"Der Achsabstand der Scharen fehlt.");
 if(mdHat(a.achsabstand)&&!(mdZ(a.achsabstand)>0))m.push({art:"fehler",text:"Der Achsabstand muss grösser als 0 sein."});
 pflicht(a.zugabeLaenge,"Die Längenzugabe Zuschnitt fehlt (0 eingeben, falls keine gewünscht).");
 pflicht(a.falzUnter,"Die Falzzugabe Untergriff fehlt (0 eingeben, falls keine gewünscht).");
 pflicht(a.falzOber,"Die Falzzugabe Obergriff fehlt (0 eingeben, falls keine gewünscht).");
 if(mdZ(a.zugabeLaenge)<0||mdZ(a.falzUnter)<0||mdZ(a.falzOber)<0)m.push({art:"fehler",text:"Eine Zugabe kann nicht negativ sein."});
 if(g.scharenOk){
  if(g.falzHinweis)m.push({art:"warnung",text:g.falzHinweis});
  const letzte=g.bahnen[g.bahnen.length-1];
  if(letzte&&letzte.art!=="passbahn"&&g.anzahl>1&&!g.anzahlPassbahnen&&letzte.breite<0.2*mdZ(a.achsabstand))
   m.push({art:"warnung",text:"Die letzte Schar ist mit "+mdMm(letzte.breite)+" mm sehr schmal – eine Passbahn oder ein anderer Achsabstand ergibt gleichmässigere Scharen."});
  g.bahnen.filter(b=>b.art==="passbahn").forEach(b=>{
   if(b.breite<0.2*mdZ(a.achsabstand))m.push({art:"warnung",text:"Passbahn "+b.label+" ist nur "+mdMm(b.breite)+" mm breit."});
   if(b.breite>mdZ(a.achsabstand)+1)m.push({art:"warnung",text:"Passbahn "+b.label+" ist mit "+mdMm(b.breite)+" mm breiter als eine Schar."});
  });
  if(g.rest>1&&(a.passbahnen||[]).length&&!g.bahnen.some(b=>b.art==="passbahn"||b.art==="rest"))
   m.push({art:"warnung",text:"Es bleibt ein Rest von "+mdMm(g.rest)+" mm, der keiner Bahn zugeordnet ist."});
  if(g.bahnen.some(b=>!b.stuecke.length))m.push({art:"warnung",text:"Mindestens eine Bahn liegt vollständig ausserhalb der Form (Aussparung) und hat keinen Zuschnitt."});
  const mehr=g.bahnen.filter(b=>b.stuecke.length>1);
  if(mehr.length)m.push({art:"warnung",text:"Bahn "+mehr.map(b=>b.label).join(", ")+": die Form hat dort eine Aussparung – die Bahn besteht aus mehreren Teilen."});
  (a.passbahnen||[]).forEach(p=>{
   if(mdHat(p.nach)&&mdZ(p.nach)>g.anzahlScharen)m.push({art:"warnung",text:"Eine Passbahn steht nach Schar "+mdZ(p.nach)+", es gibt aber nur "+g.anzahlScharen+" ganze Scharen – sie kommt ans Ende."});
  });
  if(mdaBleche().length){
   const rp=mdaRollenPlan(),tafel=rp.form==="tafel";
   if(!(rp.formate||[]).length)m.push({art:"warnung",text:"Es ist "+(tafel?"kein Tafelformat":"keine Rollenbreite")+" hinterlegt – der Materialbedarf wird nicht gerechnet."});
  }
 }
 return m;
}

// ---- Anzeige ----------------------------------------------------------------
function mdaKarte(titel,inhalt){
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,MD_REGISTER):"";
 return `<div class="card"><h2>${mdEsc(titel)}${h}</h2>${inhalt}</div>`;
}
function mdaFeld(label,inhalt,voll){return `<div${voll?' style="grid-column:1/-1"':""}><label>${mdEsc(label)}</label>${inhalt}</div>`}
function mdaZahlFeld(label,id,wert,pflicht,schritt,extra){
 const leer=!mdHat(wert);
 return mdaFeld(label,`<input id="${id}" type="number" step="${schritt||1}"${pflicht?' data-pflicht="1"':""} inputmode="${schritt&&schritt!=="1"?"decimal":"numeric"}" value="${leer?"":mdEsc(wert)}"${extra||""}>`);
}
function mdaSelect(id,optionen,wert,extra){
 return `<select id="${id}"${extra||""}>${optionen.map(([v,t])=>`<option value="${mdEsc(v)}"${String(v)===String(wert)?" selected":""}>${mdEsc(t)}</option>`).join("")}</select>`;
}
const mdaPunktOptionen=()=>mdA.seiten.map((_,i)=>[i,mdName(i)]);
const mdaSeitenOptionen=()=>mdA.seiten.map((_,i)=>[i,"Seite "+mdName(i)+"–"+mdName((i+1)%mdA.seiten.length)]);
function mdaDiagWert(a,b){
 const key=mdKey(a,b);
 const d=(mdA.diagonalen||[]).find(x=>mdKey(Number(x.von),Number(x.nach))===key);
 return d?d.mass:"";
}
function mdaDiagSetzen(a,b,wert){
 const key=mdKey(a,b);
 let d=(mdA.diagonalen||[]).find(x=>mdKey(Number(x.von),Number(x.nach))===key);
 if(!d){d={von:Math.min(a,b),nach:Math.max(a,b),mass:""};mdA.diagonalen.push(d)}
 d.mass=wert;
}

function mdaGrunddatenHtml(){
 const a=mdA;
 const matOpt=['<option value="">– keine Auswahl –</option>']
  .concat((measurementMaterials||[]).map(m=>`<option value="${mdEsc(m.id)}"${String(m.id)===String(a.material)?" selected":""}>${mdEsc(m.name)}</option>`)).join("");
 return `<div class="info">Eine Dachfläche aus Metall, in Scharen eingeteilt. Der Grundriss darf eine beliebige Form haben: erfasst werden die Seiten und die Diagonalen als Kontrollmasse. Alle Masse in wahrer Grösse auf der Dachfläche.</div>
<div class="grid">
${mdaFeld("Werkstoff",`<select id="md_material" data-pflicht="1">${matOpt}</select>`+(typeof zwMaterialChip==="function"?zwMaterialChip("md_material","metalldach",a.material):""),true)}
</div>`;
}
function mdaKontrollTabelleHtml(g){
 const k=g.konstruktion;
 if(!k||!k.ok||!k.kontrolle.length)return "";
 return `<div class="scroll" style="margin-top:8px"><table class="eb-table ra-tab"><thead><tr><th>Kontrollmass</th><th>Gemessen</th><th>Aus Grundriss</th><th>Abweichung</th></tr></thead><tbody>${
  k.kontrolle.map(c=>{
   const schlecht=Math.abs(c.abw)>MD_KONTROLL_TOL;
   return `<tr${schlecht?' class="ra-dila-zeile"':""}><td>${mdName(c.von)}–${mdName(c.nach)}</td><td>${mdMm(c.soll)}</td><td>${mdMm(c.ist)}</td><td><b>${c.abw>0?"+":""}${Math.round(c.abw)} mm</b>${schlecht?" ⚠":" ✓"}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}
function mdaWinkelTabelleHtml(g){
 const k=g.konstruktion;
 if(!k||!k.ok||!k.winkel||!k.winkel.length)return "";
 const sum=k.winkel.reduce((a,b)=>a+b,0);
 return `<div class="scroll" style="margin-top:8px"><table class="eb-table ra-tab"><thead><tr><th>Ecke</th><th>Innenwinkel</th><th>Art</th></tr></thead><tbody>${
  k.winkel.map((w,i)=>`<tr><td>${mdName(i)}</td><td><b>${mdWinkel(w)}</b></td><td class="small">${Math.abs(w-90)<0.05?"rechter Winkel":(w>180?"Einbuchtung (über 180°)":(w<90?"spitz":"stumpf"))}</td></tr>`).join("")}</tbody></table></div>
<div class="small" style="margin-top:4px">Summe ${mdWinkel(sum)} (bei ${k.n} Ecken ${mdWinkel((k.n-2)*180)}). Die Winkel sind aus den Seiten und Diagonalen gerechnet – zum Nachmessen mit dem Winkelmesser.</div>`;
}
function mdaGrundrissHtml(){
 const a=mdA,n=a.seiten.length,g=mdErgebnis();
 const seiten=a.seiten.map((s,i)=>mdaZahlFeld("Seite "+mdName(i)+"–"+mdName((i+1)%n)+" (mm)","md_seite_"+i,s,true,"1",` data-md-seite="${i}"`)).join("");
 const pflicht=mdPflichtDiagonalen(n).map(([x,y])=>mdaZahlFeld("Diagonale "+mdName(x)+"–"+mdName(y)+" (mm)","md_diag_"+x+"_"+y,mdaDiagWert(x,y),false,"1",` data-md-diag="${x}-${y}"`)).join("");
 const pflichtKeys=new Set(mdPflichtDiagonalen(n).map(([x,y])=>mdKey(x,y)));
 const extra=(a.diagonalen||[]).map((d,i)=>({d,i})).filter(({d})=>!pflichtKeys.has(mdKey(Number(d.von),Number(d.nach)))).map(({d,i})=>`<div class="ra-zeile"><div class="grid">
${mdaFeld("Von",mdaSelect("md_dvon_"+i,mdaPunktOptionen(),d.von,` data-md-dvon="${i}"`))}
${mdaFeld("Nach",mdaSelect("md_dnach_"+i,mdaPunktOptionen(),d.nach,` data-md-dnach="${i}"`))}
${mdaZahlFeld("Mass (mm)","md_dmass_"+i,d.mass,false,"1",` data-md-dmass="${i}"`)}
</div><div class="bar"><button type="button" class="red" data-md-diagweg="${i}">✕ Kontrollmass entfernen</button></div></div>`).join("");
 const kennz=`<div class="grid ra-kennzahlen" id="md_kennzahlen" style="margin-top:10px">${g.konstruktion&&g.konstruktion.ok?`<div><label>Fläche</label><div class="ra-wert">${mdaQm(g.flaeche/1e6)} m²</div></div>
<div><label>Umfang</label><div class="ra-wert">${mdMm(g.konstruktion.umfang)} mm</div></div>`:""}</div>`;
 const fehler=(g.fehler||[]).map(t=>`<div class="ra-fehler">${mdEsc(t)}</div>`).join("");
 return `<div class="info">Die Ecken heissen A, B, C … in der Reihenfolge, in der du um die Fläche gehst. Für jede Ecke ab C braucht die App <b>mindestens eine Diagonale</b> zu einer früheren Ecke (vorgegeben: A–C, A–D …), damit die Form feststeht. Die Diagonalen liegen innerhalb der Fläche. Jede <b>weitere Diagonale</b> ist ein Kontrollmass: die App vergleicht sie mit dem Grundriss und meldet Abweichungen – bei Einbuchtungen hilft sie ausserdem, die richtige Form zu finden.</div>
<div class="grid">
${mdaFeld("Umlaufsinn der Punkte",mdaSelect("md_uhrzeiger",[["ja","im Uhrzeigersinn (Ansicht von oben)"],["nein","gegen den Uhrzeigersinn"]],a.uhrzeiger!==false?"ja":"nein"))}
</div>
<div class="bar" style="margin:8px 0"><button type="button" class="gray" id="md_eckePlus"${n>=MD_MAX_ECKEN?" disabled":""}>+ Ecke</button><button type="button" class="gray" id="md_eckeMinus"${n<=3?" disabled":""}>− Ecke</button><span class="small" style="align-self:center">${n} Ecken</span></div>
<div class="grid">${seiten}</div>
${pflicht?`<div class="eb-section-head" style="margin-top:10px">Diagonalen von A</div><div class="grid">${pflicht}</div>`:""}
<div class="eb-section-head" style="margin-top:10px">Weitere Kontrollmasse</div>
${extra||'<div class="small">Noch keines. Jede zusätzliche Diagonale prüft den Grundriss.</div>'}
<div class="bar" style="margin-top:6px"><button type="button" class="gray" id="md_diagPlus">+ Kontrollmass</button></div>
<div id="md_fehler">${fehler}</div>
<div id="md_kontrollTab">${mdaKontrollTabelleHtml(g)}</div>
<div id="md_winkelTab">${mdaWinkelTabelleHtml(g)}</div>
${kennz}
<div id="md_plan" class="eb-diagram-box eb-diagram-scroll" style="margin-top:10px">${mdPlanSvg(g,{diagonalen:a.diagonalen})}</div>`;
}
function mdaPassbahnenHtml(){
 const a=mdA;
 const z=(a.passbahnen||[]).map((p,i)=>`<div class="ra-zeile"><div class="grid">
${mdaZahlFeld("Nach Schar Nr. (0 = ganz am Anfang)","md_pnach_"+i,p.nach,true,"1",` data-md-pnach="${i}"`)}
${mdaZahlFeld("Breite (mm, leer = Restbreite)","md_pbreite_"+i,p.breite,false,"1",` data-md-pbreite="${i}"`)}
</div><div class="bar"><button type="button" class="red" data-md-pweg="${i}">✕ Passbahn entfernen</button></div></div>`).join("");
 return z||'<div class="small">Keine Passbahn – die letzte Schar nimmt die Restbreite.</div>';
}
const mdaFalzText=(dir,ober)=>(dir==="links"?"← links":"→ rechts")+" · "+(ober?"Ober":"Unter");
function mdaScharenTabelleHtml(g){
 if(!g.scharenOk)return `<div class="ra-warnung">Bitte zuerst den Grundriss und den Achsabstand erfassen.</div>`;
 const hr=g.hilfsriss;
 const zeilen=g.bahnen.map(b=>b.stuecke.map((s,j)=>`<tr${b.art==="passbahn"?' class="ra-dila-zeile"':""}>
<td>${mdEsc(b.label)}${b.art==="passbahn"?' <span class="small">Pass</span>':(b.art==="rest"?' <span class="small">Rest</span>':"")}${b.stuecke.length>1?` <span class="small">Teil ${j+1}</span>`:""}</td>
<td>${mdMm(b.breite)}</td><td>${mdMm(s.untenLinks)}</td><td>${mdMm(s.obenLinks)}</td><td>${mdMm(s.laengeLinks)}</td>
<td>${mdMm(s.untenRechts)}</td><td>${mdMm(s.obenRechts)}</td><td>${mdMm(s.laengeRechts)}</td>
<td><b>${mdMm(s.laenge)} × ${mdMm(b.zuschnittBreite)}</b></td><td>${mdaFalzText(b.falzLinks,b.oberLinks)}</td><td>${mdaFalzText(b.falzRechts,b.oberRechts)}</td></tr>`).join("")).join("");
 return `<div class="scroll"><table class="eb-table" style="table-layout:auto;min-width:700px"><thead>
<tr><th rowspan="2">Bahn</th><th rowspan="2">Breite</th><th colspan="3">Linke Kante</th><th colspan="3">Rechte Kante</th><th rowspan="2">Zuschnitt<br>L × B</th><th rowspan="2">Falz links</th><th rowspan="2">Falz rechts</th></tr>
<tr><th>↓ ab HR</th><th>↑ ab HR</th><th>Länge</th><th>↓ ab HR</th><th>↑ ab HR</th><th>Länge</th></tr></thead><tbody>${zeilen}</tbody></table></div>
<div class="small" style="margin-top:6px">Links und rechts mit Blick Richtung First. ↓/↑ = Mass ab dem Hilfsriss (HR, ${mdMm(hr)} mm über dem tiefsten Punkt) nach unten bzw. oben. Länge = ganze Kante der Bahn.</div>`;
}
function mdaScharenHtml(){
 const a=mdA,g=mdErgebnis();
 const kennz=`<div class="grid ra-kennzahlen" id="md_kennzahlen" style="margin-top:10px">${g.scharenOk?`<div><label>Breite der Fläche</label><div class="ra-wert">${mdMm(g.breite)} mm</div></div>
<div><label>Höhe (Fallrichtung)</label><div class="ra-wert">${mdMm(g.hoehe)} mm</div></div>
<div><label>Scharen</label><div class="ra-wert">${g.anzahl}</div></div>
<div><label>Passbahnen</label><div class="ra-wert">${g.anzahlPassbahnen}</div></div>`:""}</div>`;
 return `<div class="info">Die Scharen laufen unter dem gewählten <b>Winkel</b> zur Bezugsseite (90° = senkrecht dazu, meist von der Traufe zum First). Der Achsabstand ist die Deckbreite einer Schar. Eine <b>Passbahn</b> fügst du an der gewünschten Stelle ein: ihre Breite ist der Rest, sodass alle anderen Scharen volle Breite haben.</div>
<div class="grid">
${mdaFeld("Bezugsseite (Traufe)",mdaSelect("md_bezug",mdaSeitenOptionen(),a.bezugsseite))}
${mdaZahlFeld("Winkel der Scharen zur Bezugsseite (°)","md_winkel",a.winkel,true,"0.1")}
${mdaFeld("Scharen zählen von",mdaSelect("md_start",[["links","links (Blick Richtung First)"],["rechts","rechts (Blick Richtung First)"]],a.start))}
${mdaZahlFeld("Achsabstand Scharen (mm)","md_achsabstand",a.achsabstand,true)}
${mdaZahlFeld("Hilfsriss über dem tiefsten Punkt (mm, leer = 0)","md_hilfsriss",a.hilfsriss,false)}
</div>
<div class="eb-section-head" style="margin-top:10px">Passbahnen</div>
<div id="md_passbahnen">${mdaPassbahnenHtml()}</div>
<div class="bar" style="margin-top:6px"><button type="button" class="gray" id="md_passPlus">+ Passbahn</button></div>
<div id="md_fehler2">${(g.fehler||[]).map(t=>`<div class="ra-fehler">${mdEsc(t)}</div>`).join("")}</div>
${kennz}
<div id="md_plan" class="eb-diagram-box eb-diagram-scroll" style="margin-top:10px">${mdPlanSvg(g,{diagonalen:a.diagonalen})}</div>
<div id="md_scharenTab" style="margin-top:10px">${mdaScharenTabelleHtml(g)}</div>`;
}
function mdaFalzTabelleHtml(g){
 if(!g.scharenOk)return `<div class="ra-warnung">Bitte zuerst Grundriss und Scharen erfassen.</div>`;
 const opt=[["links","← nach links"],["rechts","→ nach rechts"]];
 return `<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Bahn</th><th>Breite</th><th>Falz links</th><th>Falz rechts</th><th>Zuschnitt B</th></tr></thead><tbody>${
  g.bahnen.map(b=>`<tr><td>${mdEsc(b.label)}${b.art==="passbahn"?' <span class="small">Pass</span>':""}</td><td>${mdMm(b.breite)}</td>
<td>${mdaSelect("md_falzj_"+b.index,opt,b.falzLinks,` data-md-falzj="${b.index}"`)}<div class="small">${b.oberLinks?"Obergriff":"Untergriff"}</div></td>
<td>${mdaSelect("md_falzj_"+(b.index+1),opt,b.falzRechts,` data-md-falzj="${b.index+1}"`)}<div class="small">${b.oberRechts?"Obergriff":"Untergriff"}</div></td>
<td><b>${mdMm(b.zuschnittBreite)}</b></td></tr>`).join("")}</tbody></table></div>`;
}
function mdaFalzHtml(){
 const a=mdA,g=mdErgebnis();
 return `<div class="info">Jede Bahn hat <b>zwei Falze</b> (linke und rechte Kante, Blick Richtung First). Für jeden Falz gibst du die <b>Falzrichtung</b> an: der gebogene Pfeil im Plan steht quer zum Falz und zeigt zur Seite, auf die der Falz gelegt wird. Benachbarte Bahnen teilen sich einen Falz – ändert man den rechten Falz einer Bahn, ändert sich der linke der nächsten. Die Bahn, von der der Pfeil <b>wegzeigt</b>, hat den <b>Obergriff</b>, die andere den Untergriff. Mit der Schnellwahl setzt du alle Falze auf einmal, danach kannst du jeden einzeln umschalten.</div>
<div class="grid">
${mdaFeld("Schnellwahl",mdaSelect("md_falzModus",MD_FALZ_MODI,a.falzModus))}
${mdaZahlFeld("Längenzugabe Zuschnitt (mm)","md_zugabeLaenge",a.zugabeLaenge,true)}
${mdaZahlFeld("Falzzugabe Untergriff (mm)","md_falzUnter",a.falzUnter,true)}
${mdaZahlFeld("Falzzugabe Obergriff (mm)","md_falzOber",a.falzOber,true)}
</div>
<div class="small" style="margin:4px 0 8px">Zuschnittbreite = Deckbreite + Zugabe am linken Falz + Zugabe am rechten Falz (je nach Ober-/Untergriff). Zuschnittlänge = längste Länge der Bahn + Längenzugabe.</div>
<div id="md_falzTab">${mdaFalzTabelleHtml(g)}</div>
<div id="md_plan" class="eb-diagram-box eb-diagram-scroll" style="margin-top:10px">${mdPlanSvg(g,{diagonalen:a.diagonalen})}</div>`;
}
function mdaAusmassHtml(){
 const z=mdaAusmassZeilen();
 if(!z.length)return `<div class="ra-warnung">Noch nichts zu messen – bitte zuerst den Grundriss erfassen.</div>`;
 const m=findMeasurementMaterial(mdA.material);
 return `<div class="info">Entsteht aus der Aufnahme, ohne zweite Eingabe.</div>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${mdEsc(x.bezeichnung)}</td><td>${mdEsc(x.menge)}</td><td>${mdEsc(x.einheit)}</td><td class="small">${mdEsc(x.herkunft)}</td></tr>`).join("")}</tbody></table></div>
<h2 style="margin-top:14px">Material</h2>
${m?`<div class="ra-ok">${mdEsc(m.name)}</div>`:`<div class="ra-warnung">Es ist noch kein Material gewählt.</div>`}`;
}
function mdaKontrolleHtml(){
 const m=mdaPruefungen(),g=mdErgebnis(),k=g.konstruktion;
 const mat=findMeasurementMaterial(mdA.material);
 const uebersicht=`<div class="scroll"><table class="eb-table ra-tab"><tbody>
<tr><td>Material</td><td>${mdEsc(mat?mat.name:"kein Material gewählt")}</td></tr>
<tr><td>Ecken</td><td>${mdA.seiten.length}</td></tr>
<tr><td>Fläche</td><td>${k&&k.ok?mdaQm(g.flaeche/1e6)+" m²":"–"}</td></tr>
<tr><td>Scharen / Passbahnen</td><td>${g.scharenOk?g.anzahl+" / "+g.anzahlPassbahnen:"–"}</td></tr>
<tr><td>Winkel zur Bezugsseite</td><td>${mdEsc(mdZ(mdA.winkel))}° (Seite ${mdName(mdZ(mdA.bezugsseite))}–${mdName((mdZ(mdA.bezugsseite)+1)%mdA.seiten.length)})</td></tr>
<tr><td>Achsabstand</td><td>${mdMm(mdA.achsabstand)} mm</td></tr>
<tr><td>Kontrollmasse</td><td>${k&&k.ok?k.kontrolle.length:"–"}</td></tr>
</tbody></table></div>`;
 if(!m.length)return uebersicht+`<div class="ra-ok" style="margin-top:8px">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div>`;
 return uebersicht+`<div style="margin-top:8px">`+m.map(x=>`<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${mdEsc(x.text)}</div>`).join("")+`</div>`;
}
function mdaAbschluss(){
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function mdaSetzeSchritt(n){
 mdSchritt=Math.max(1,Math.min(MD_REGISTER.length,Number(n)||1));
 renderMetalldachAufnahme();
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("md_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function mdaRegisterHtml(){
 const pr=mdaPruefungen();
 const fehler=pr.filter(x=>x.art==="fehler").length,warn=pr.length-fehler;
 return raFortschrittHtml(mdSchritt,MD_REGISTER.length)+`<div class="ra-register" id="md_register">`+MD_REGISTER.map(r=>{
  const marke=r.nr===MD_KONTROLLE&&(fehler||warn)
   ?`<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===mdSchritt?" aktiv":""}" data-md-schritt="${r.nr}"><span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${mdEsc(r.kurz)}</span>${marke}${raRegisterHakenHtml(mdBestaetigt,r.nr)}</button>`;
 }).join("")+`</div>`;
}
function mdaKopfInhalt(){
 if(mdSchritt===1)return mdaKarte("1 · Grunddaten",mdaGrunddatenHtml());
 if(mdSchritt===2)return mdaKarte("2 · Grundriss",mdaGrundrissHtml());
 if(mdSchritt===3)return mdaKarte("3 · Scharen",mdaScharenHtml());
 if(mdSchritt===4)return mdaKarte("4 · Falz",mdaFalzHtml());
 if(mdSchritt===5){
  const zp=mdaZuschnittPlan();
  return mdaKarte(zuTitel(5,zp.art),zuAuswahlHtml(mdA.rollenAuswahl,"data-md-rolle",zp.art)+zuschnittHtml(zp));
 }
 if(mdSchritt===6)return mdaKarte("6 · Ausmass und Material",mdaAusmassHtml());
 return mdaKarte("7 · Kontrolle",mdaKontrolleHtml());
}
function renderMetalldachAufnahme(){
 const ziel=$("metalldachAufnahme");
 if(!ziel)return;
 mdaVerdrahten();
 mdZeichnet=true;
 try{
  ziel.innerHTML=mdaRegisterHtml()+mdaKopfInhalt()+`<div class="bar ra-blaettern">
<button type="button" class="gray" id="md_zurueck"${mdSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="md_weiter">${mdSchritt>=MD_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+mdEsc(MD_REGISTER[mdSchritt].kurz)}</button>
</div>`;
 }finally{mdZeichnet=false}
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 const strip=$("md_register"),aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(),ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Live-Aktualisierung ohne Neuzeichnen der Eingabefelder (der Fokus bleibt)
function mdaLive(){
 const g=mdErgebnis();
 const plan=$("md_plan");if(plan)plan.innerHTML=mdPlanSvg(g,{diagonalen:mdA.diagonalen});
 const f=$("md_fehler");if(f)f.innerHTML=(g.fehler||[]).map(t=>`<div class="ra-fehler">${mdEsc(t)}</div>`).join("");
 const f2=$("md_fehler2");if(f2)f2.innerHTML=(g.fehler||[]).map(t=>`<div class="ra-fehler">${mdEsc(t)}</div>`).join("");
 const kt=$("md_kontrollTab");if(kt)kt.innerHTML=mdaKontrollTabelleHtml(g);
 const wt=$("md_winkelTab");if(wt)wt.innerHTML=mdaWinkelTabelleHtml(g);
 const st=$("md_scharenTab");if(st)st.innerHTML=mdaScharenTabelleHtml(g);
 const kz=$("md_kennzahlen");
 if(kz){
  if(mdSchritt===2&&g.konstruktion&&g.konstruktion.ok)kz.innerHTML=`<div><label>Fläche</label><div class="ra-wert">${mdaQm(g.flaeche/1e6)} m²</div></div><div><label>Umfang</label><div class="ra-wert">${mdMm(g.konstruktion.umfang)} mm</div></div>`;
  if(mdSchritt===3&&g.scharenOk)kz.innerHTML=`<div><label>Breite der Fläche</label><div class="ra-wert">${mdMm(g.breite)} mm</div></div><div><label>Höhe (Fallrichtung)</label><div class="ra-wert">${mdMm(g.hoehe)} mm</div></div><div><label>Scharen</label><div class="ra-wert">${g.anzahl}</div></div><div><label>Passbahnen</label><div class="ra-wert">${g.anzahlPassbahnen}</div></div>`;
 }
 const ft=$("md_falzTab");
 if(ft&&mdSchritt===4){
  ft.innerHTML=mdaFalzTabelleHtml(g);
 }
 const pr=mdaPruefungen(),fehler=pr.filter(x=>x.art==="fehler").length;
 const knopf=document.querySelector('#md_register [data-md-schritt="'+MD_KONTROLLE+'"]');
 if(knopf){
  const alt=knopf.querySelector(".ra-register-punkt");
  if(alt)alt.remove();
  if(pr.length){const s=document.createElement("span");s.className="ra-register-punkt"+(fehler?" fehler":"");knopf.appendChild(s)}
 }
}
function mdaZahl(v){return v===""?"":mdZ(v)}
function mdaVerdrahten(){
 const wurzel=$("measTypeMetalldach");
 if(!wurzel||wurzel.dataset.mdVerdrahtet)return;
 wurzel.dataset.mdVerdrahtet="1";
 const feldNamen={md_achsabstand:"achsabstand",md_hilfsriss:"hilfsriss",md_zugabeLaenge:"zugabeLaenge",md_falzUnter:"falzUnter",md_falzOber:"falzOber",md_winkel:"winkel"};
 wurzel.addEventListener("input",e=>{
  if(mdZeichnet)return;
  const t=e.target,d=t.dataset||{};
  if(d.mdSeite!==undefined)mdA.seiten[Number(d.mdSeite)]=mdaZahl(t.value);
  else if(d.mdDiag!==undefined){const [x,y]=d.mdDiag.split("-").map(Number);mdaDiagSetzen(x,y,mdaZahl(t.value))}
  else if(d.mdDmass!==undefined){const x=mdA.diagonalen[Number(d.mdDmass)];if(x)x.mass=mdaZahl(t.value)}
  else if(d.mdPnach!==undefined){const x=mdA.passbahnen[Number(d.mdPnach)];if(x)x.nach=mdaZahl(t.value)}
  else if(d.mdPbreite!==undefined){const x=mdA.passbahnen[Number(d.mdPbreite)];if(x)x.breite=mdaZahl(t.value)}
  else if(feldNamen[t.id]!==undefined)mdA[feldNamen[t.id]]=mdaZahl(t.value);
  else return;
  mdaLive();
 });
 wurzel.addEventListener("change",e=>{
  if(mdZeichnet)return;
  const t=e.target,d=t.dataset||{};
  {const w=zuRollenKlick(t,"data-md-rolle");if(w!==null){mdA.rollenAuswahl=w;renderMetalldachAufnahme();return}}
  if(t.id==="md_material"){mdA.material=t.value;renderMetalldachAufnahme();return}
  if(t.id==="md_uhrzeiger"){mdA.uhrzeiger=t.value!=="nein";mdaLive();return}
  if(t.id==="md_bezug"){mdA.bezugsseite=Number(t.value)||0;mdaLive();return}
  if(t.id==="md_start"){mdA.start=t.value==="rechts"?"rechts":"links";mdA.falzEinzel={};mdaLive();return}
  if(t.id==="md_falzModus"){mdA.falzModus=t.value;mdA.falzEinzel={};renderMetalldachAufnahme();return}
  if(d.mdFalzj!==undefined){mdA.falzEinzel[String(Number(d.mdFalzj))]=t.value==="links"?"links":"rechts";mdaLive();return}
  if(d.mdDvon!==undefined){const x=mdA.diagonalen[Number(d.mdDvon)];if(x)x.von=Number(t.value);mdaLive();return}
  if(d.mdDnach!==undefined){const x=mdA.diagonalen[Number(d.mdDnach)];if(x)x.nach=Number(t.value);mdaLive();return}
 });
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  const reg=t.closest("[data-md-schritt]");
  if(reg){mdaSetzeSchritt(reg.dataset.mdSchritt);return}
  const b=t.closest("button");
  if(!b)return;
  if(b.id==="md_zurueck"){mdaSetzeSchritt(mdSchritt-1);return}
  if(b.id==="md_weiter"){
   if(!pflichtPruefenUndSpringen(wurzel))return;
   mdBestaetigt.add(mdSchritt);
   if(mdSchritt>=MD_REGISTER.length)mdaAbschluss();else mdaSetzeSchritt(mdSchritt+1);
   return;
  }
  if(b.id==="md_eckePlus"){if(mdA.seiten.length<MD_MAX_ECKEN){mdA.seiten.push("");renderMetalldachAufnahme()}return}
  if(b.id==="md_eckeMinus"){
   if(mdA.seiten.length>3){
    mdA.seiten.pop();
    const n=mdA.seiten.length;
    mdA.diagonalen=mdA.diagonalen.filter(x=>Number(x.von)<n&&Number(x.nach)<n);
    if(mdA.bezugsseite>=n)mdA.bezugsseite=0;
    renderMetalldachAufnahme();
   }
   return;
  }
  if(b.id==="md_diagPlus"){
   const n=mdA.seiten.length;
   const frei=[];
   for(let x=0;x<n;x++)for(let y=x+2;y<n;y++){if(!mdBenachbart(x,y,n)&&mdaDiagWert(x,y)==="")frei.push([x,y])}
   const pflicht=new Set(mdPflichtDiagonalen(n).map(([x,y])=>mdKey(x,y)));
   const w=frei.find(([x,y])=>!pflicht.has(mdKey(x,y)))||[1,n>3?3:2];
   mdA.diagonalen.push({von:w[0],nach:w[1],mass:""});
   renderMetalldachAufnahme();return;
  }
  if(b.dataset.mdDiagweg!==undefined){mdA.diagonalen.splice(Number(b.dataset.mdDiagweg),1);renderMetalldachAufnahme();return}
  if(b.id==="md_passPlus"){
   const g=mdErgebnis();
   mdA.passbahnen.push({nach:g.scharenOk?Math.max(0,Math.floor(g.anzahlScharen/2)):"",breite:""});
   mdA.falzEinzel={};renderMetalldachAufnahme();return;
  }
  if(b.dataset.mdPweg!==undefined){mdA.passbahnen.splice(Number(b.dataset.mdPweg),1);mdA.falzEinzel={};renderMetalldachAufnahme();return}
 });
}

// ---- Speichern / Laden --------------------------------------------------------
function mdDaten(){
 const g=mdErgebnis(),rp=mdaRollenPlan();
 const a=mdA;
 return {
  material:a.material,uhrzeiger:a.uhrzeiger!==false,
  seiten:a.seiten.slice(),diagonalen:a.diagonalen.map(x=>({von:Number(x.von),nach:Number(x.nach),mass:x.mass})),
  bezugsseite:a.bezugsseite,winkel:a.winkel,start:a.start,
  achsabstand:a.achsabstand,hilfsriss:a.hilfsriss,zugabeLaenge:a.zugabeLaenge,falzUnter:a.falzUnter,falzOber:a.falzOber,
  passbahnen:a.passbahnen.map(x=>({nach:x.nach,breite:x.breite})),falzModus:a.falzModus,falzEinzel:{...a.falzEinzel},
  flaeche:g.flaeche,flaeche_m2:Number(mdaFlaecheM2().toFixed(3)),
  umfang:g.konstruktion.umfang||0,
  punkte:(g.konstruktion.punkte||[]).map(p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10})),
  anzahl:g.anzahl||0,anzahlPassbahnen:g.anzahlPassbahnen||0,
  scharen:g.scharenOk?g.bahnen.map(b=>({label:b.label,art:b.art,breite:Math.round(b.breite*10)/10,zuschnittBreite:b.zuschnittBreite,falzLinks:b.falzLinks,falzRechts:b.falzRechts,oberLinks:!!b.oberLinks,oberRechts:!!b.oberRechts,
   stuecke:b.stuecke.map(s=>({laenge:s.laenge,laengeLinks:Math.round(s.laengeLinks),laengeRechts:Math.round(s.laengeRechts),
    untenLinks:Math.round(s.untenLinks),obenLinks:Math.round(s.obenLinks),untenRechts:Math.round(s.untenRechts),obenRechts:Math.round(s.obenRechts)}))})):[],
  eckwinkel:(g.konstruktion.winkel||[]).map(w=>Math.round(w*100)/100),
  kontrollmasse:(g.konstruktion.kontrolle||[]).map(c=>({von:c.von,nach:c.nach,soll:c.soll,ist:Math.round(c.ist),abw:Math.round(c.abw)})),
  ausmass:mdaAusmassZeilen(),kontrolle:mdaPruefungen(),
  zuschnitt:{auswahl:(a.rollenAuswahl||[]).slice(),breiten:mdaRollenbreiten(),
   form:rp.form,formGrund:rp.formGrund||"",formQuelle:rp.formQuelle||"",
   formLaenge:rp.bestes?(rp.bestes.laenge||null):null,netto:Number(rp.netto.toFixed(3)),
   bestes:rp.bestes||null,moeglich:rp.moeglich||[],
   gruppen:(rp.gruppen||[]).map(g2=>({breite:g2.breite,rollenLaenge:g2.rollenLaenge,abschnittLaenge:g2.abschnittLaenge,jeAbschnitt:g2.jeAbschnitt,abschnitte:g2.abschnitte,
    streifen:(g2.streifen||[]).map(s=>({stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,merkmal:x.merkmal||""})),rest:s.rest,abschnittLaenge:s.abschnittLaenge,abschnittNr:s.abschnittNr}))})),
   optimal:rp.optimal!==false,ausResten:ebaAusRestenSpeicher(rp.ausResten)}
 };
}
function mdZuruecksetzen(){
 mdA=mdLeer();mdSchritt=1;mdBestaetigt=new Set();
 renderMetalldachAufnahme();
}
function mdFuellen(d){
 const w=d||{};
 const a=mdLeer();
 a.material=w.material??"";
 a.uhrzeiger=w.uhrzeiger!==false;
 if(Array.isArray(w.seiten)&&w.seiten.length>=3)a.seiten=w.seiten.slice(0,MD_MAX_ECKEN).map(x=>mdHat(x)?mdZ(x):"");
 a.diagonalen=Array.isArray(w.diagonalen)?w.diagonalen.map(x=>({von:Number(x.von),nach:Number(x.nach),mass:mdHat(x.mass)?mdZ(x.mass):""})):[];
 a.bezugsseite=Number.isInteger(Number(w.bezugsseite))?Number(w.bezugsseite):0;
 if(mdHat(w.winkel))a.winkel=mdZ(w.winkel);
 a.start=w.start==="rechts"?"rechts":"links";
 ["achsabstand","hilfsriss","zugabeLaenge","falzUnter","falzOber"].forEach(k=>{if(mdHat(w[k]))a[k]=mdZ(w[k])});
 a.passbahnen=Array.isArray(w.passbahnen)?w.passbahnen.map(x=>({nach:mdHat(x.nach)?mdZ(x.nach):"",breite:mdHat(x.breite)?mdZ(x.breite):""})):[];
 a.falzModus=MD_FALZ_MODI.some(x=>x[0]===w.falzModus)?w.falzModus:"alle_rechts";
 a.falzEinzel=(w.falzEinzel&&typeof w.falzEinzel==="object")?{...w.falzEinzel}:{};
 const rq=w.zuschnitt&&w.zuschnitt.auswahl;
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 mdA=a;mdSchritt=1;
 mdBestaetigt=mdaPruefungen().some(x=>x.art==="fehler")?new Set():new Set(MD_REGISTER.filter(r=>r.nr!==MD_KONTROLLE).map(r=>r.nr));
 renderMetalldachAufnahme();
}

// ---- Ausdruck (PDF) ------------------------------------------------------------
// Gedruckt wird der gespeicherte Datensatz - ein einmal gedrucktes Blatt bleibt gleich.
function mdDruckHtml(m,kopfHtml){
 const d=m.data||{};
 const cell=(label,val)=>`<td><label>${mdEsc(label)}</label><div class="val">${val}</div></td>`;
 const g=berechneMetalldach(d);
 const matName=mdEsc((findMeasurementMaterial(d.material)||{}).name||"–");
 const n=Array.isArray(d.seiten)?d.seiten.length:0;
 const seitenTxt=(d.seiten||[]).map((s,i)=>mdName(i)+"–"+mdName((i+1)%n)+" "+mdMm(s)).join(" · ");
 const diagTxt=(d.diagonalen||[]).filter(x=>mdZ(x.mass)>0).map(x=>mdName(x.von)+"–"+mdName(x.nach)+" "+mdMm(x.mass)).join(" · ");
 const sc=Array.isArray(d.scharen)?d.scharen:[];
 const zeilen=sc.map(b=>b.stuecke.map((s,j)=>`<tr><td>${mdEsc(b.label)}${b.art==="passbahn"?" (Pass)":""}${b.stuecke.length>1?" T"+(j+1):""}</td><td>${mdMm(b.breite)}</td>
<td>${mdMm(s.untenLinks)}</td><td>${mdMm(s.obenLinks)}</td><td>${mdMm(s.laengeLinks)}</td><td>${mdMm(s.untenRechts)}</td><td>${mdMm(s.obenRechts)}</td><td>${mdMm(s.laengeRechts)}</td>
<td><b>${mdMm(s.laenge)} &#215; ${mdMm(b.zuschnittBreite)}</b></td><td>${mdaFalzText(b.falzLinks,b.oberLinks)}</td><td>${mdaFalzText(b.falzRechts,b.oberRechts)}</td></tr>`).join("")).join("");
 const kontr=(d.kontrollmasse||[]).map(c=>`<tr><td>${mdName(c.von)}–${mdName(c.nach)}</td><td>${mdMm(c.soll)}</td><td>${mdMm(c.ist)}</td><td>${c.abw>0?"+":""}${mdZ(c.abw)} mm</td></tr>`).join("");
 return `${kopfHtml}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr>${cell("Material",matName)}${cell("Anzahl Ecken",esc(n))}</tr>
<tr>${cell("Fläche",mdEsc(((mdZ(d.flaeche)/1e6)).toFixed(2).replace(".",","))+" m²")}${cell("Umfang",mdMm(d.umfang)+" mm")}</tr>
<tr>${cell("Seiten (mm)",mdEsc(seitenTxt))}${cell("Diagonalen (mm)",mdEsc(diagTxt||"–"))}</tr>
<tr>${cell("Innenwinkel der Ecken",mdEsc((g.konstruktion.winkel||[]).map((w,i)=>mdName(i)+" "+mdWinkel(w)).join(" · ")||"–"))}<td></td></tr>
<tr>${cell("Achsabstand",mdMm(d.achsabstand)+" mm")}${cell("Winkel zur Seite "+mdName(mdZ(d.bezugsseite))+"–"+mdName((mdZ(d.bezugsseite)+1)%(n||1)),mdEsc(mdZ(d.winkel))+"°")}</tr>
<tr>${cell("Scharen / Passbahnen",esc((d.anzahl||0)+" / "+(d.anzahlPassbahnen||0)))}${cell("Zählung der Scharen von",d.start==="rechts"?"rechts":"links")}</tr>
<tr>${cell("Längenzugabe",mdMm(d.zugabeLaenge)+" mm")}${cell("Falz Untergriff / Obergriff",mdMm(d.falzUnter)+" / "+mdMm(d.falzOber)+" mm")}</tr>
</table>
<div class="eb-section-head">Plan</div>
<div class="eb-diagram">${mdPlanSvg(g,{diagonalen:d.diagonalen})}</div>
${kontr?`<div class="eb-section-head">Kontrollmasse</div><table class="eb-cutlist"><thead><tr><th>Mass</th><th>Gemessen</th><th>Aus Grundriss</th><th>Abweichung</th></tr></thead><tbody>${kontr}</tbody></table>`:""}
<div class="eb-section-head">Bahnen</div>
<table class="eb-cutlist">
<thead><tr><th rowspan="2">Bahn</th><th rowspan="2">Breite</th><th colspan="3">Linke Kante</th><th colspan="3">Rechte Kante</th><th rowspan="2">Zuschnitt L &#215; B</th><th rowspan="2">Falz links</th><th rowspan="2">Falz rechts</th></tr><tr><th>&#8595; ab HR</th><th>&#8593; ab HR</th><th>L&#228;nge</th><th>&#8595; ab HR</th><th>&#8593; ab HR</th><th>L&#228;nge</th></tr></thead>
<tbody>${zeilen}</tbody></table>
<div class="note" style="font-size:8pt;color:#68737d">Alle Masse in mm, links/rechts mit Blick Richtung First. &#8595; / &#8593; = Mass ab Hilfsriss (HR) nach unten bzw. oben. Falz = Richtung, in die der Falz gelegt wird (Pfeil quer zum Falz); die Bahn, von der der Pfeil wegzeigt, hat den Obergriff.</div>
${(Array.isArray(d.ausmass)&&d.ausmass.length)?`<div class="eb-section-head">Ausmass</div>
<table class="eb-cutlist"><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th></tr></thead>
<tbody>${d.ausmass.map(z=>`<tr><td>${mdEsc(z.pos)}</td><td>${mdEsc(z.bezeichnung)}</td><td>${mdEsc(z.menge)}</td><td>${mdEsc(z.einheit)}</td></tr>`).join("")}</tbody></table>`:""}
${zuDruckHtml(d.zuschnitt,0,"Bahn")}
${m.note?`<div class="eb-section-head">Notiz</div><div class="note">${mdEsc(m.note)}</div>`:""}`;
}
