"use strict";
// ===========================================================================
// Zuschnittrechner (v3.418)
// ===========================================================================
// Ein freies Werkzeug ohne Projekt und ohne Massaufnahme: Blechformat (Rolle
// oder Tafel) eingeben, Zuschnittmasse von Hand oder per Excel/CSV-Import,
// daraus ein Zuschnittplan mit sichtbarer Belegung - mit denselben Bausteinen
// wie der Zuschnitt in den Massaufnahmen:
//   * Packrechnung            ebaFormatPlan / ebaPackeInStreifen (js/29)
//   * Darstellung der Belegung zuschnittHtml (js/33), Druck zuDruckHtml (js/33)
// Hier steht nur die Eingabe, die Aufbereitung der Stuecke und der Import.
// Es wird nichts in der Datenbank gespeichert; der letzte Stand bleibt als
// Bequemlichkeit im Browser dieses Geraets (localStorage).
// ===========================================================================

const ZR_SPEICHER="sd_zuschnittrechner";
const ZR_MAX_ZEILEN=500;
const ZR_ROLLEN=Object.freeze([1000,670,500,400,330,250,200]);
const ZR_TAFELN=Object.freeze([[1000,2000],[1000,3000],[1250,2500],[1250,3000],[1500,3000]]);

function zrLeer(){
 return {form:"rolle",rolle:"1000",tafelBreite:"1000",tafelLaenge:"2000",drehen:false,material:"",
  zeilen:[{bez:"",laenge:"",breite:"",anzahl:"1"}]};
}
let zrA=zrLeer();

const zrZ=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
// Zahl aus Eingabe oder Excel-Zelle: 1250 | "1'250,5" | "1250 mm" | "1 250"
function zrZahl(v){
 if(typeof v==="number")return Number.isFinite(v)?v:NaN;
 let s=String(v==null?"":v).trim().replace(/mm$/i,"").replace(/[\s'’]/g,"");
 if(!s)return NaN;
 if(/^-?\d+,\d+$/.test(s))s=s.replace(",",".");
 else s=s.replace(/,/g,"");
 return /^-?\d+(\.\d+)?$/.test(s)?Number(s):NaN;
}
const zrMm=v=>Math.round(zrZ(v)).toLocaleString("de-CH");

function zrSpeichern(){try{localStorage.setItem(ZR_SPEICHER,JSON.stringify(zrA))}catch(e){}}
function zrLaden(){
 try{
  const w=JSON.parse(localStorage.getItem(ZR_SPEICHER)||"null");
  if(!w||typeof w!=="object")return;
  const a=zrLeer();
  a.form=w.form==="tafel"?"tafel":"rolle";
  ["rolle","tafelBreite","tafelLaenge","material"].forEach(k=>{if(w[k]!==undefined)a[k]=String(w[k])});
  a.drehen=!!w.drehen;
  if(Array.isArray(w.zeilen)&&w.zeilen.length)
   a.zeilen=w.zeilen.slice(0,ZR_MAX_ZEILEN).map(z=>({bez:String(z.bez||""),laenge:String(z.laenge===undefined?"":z.laenge),
    breite:String(z.breite===undefined?"":z.breite),anzahl:String(z.anzahl===undefined?"1":z.anzahl)}));
  zrA=a;
 }catch(e){}
}

// ---- Aus den Zeilen werden einzelne Stuecke -------------------------------
// Jedes Stueck bekommt eine fortlaufende Nummer; eine Zeile mit Anzahl 3 sind
// drei Stuecke mit aufeinanderfolgenden Nummern (zrNummern: von-bis je Zeile).
// "Drehen erlaubt": die kuerzere Seite wird Streifenbreite, die laengere Laenge.
function zrBleche(a){
 a=a||zrA;
 const out=[],bereich=[];
 let nr=0;
 (a.zeilen||[]).forEach((z,i)=>{
  let L=zrZ(z.laenge),B=zrZ(z.breite);
  const n=Math.max(1,Math.min(1000,Math.floor(zrZ(z.anzahl)||1)));
  if(!(L>0&&B>0)){bereich[i]=null;return}
  if(a.drehen&&B>L){const t=L;L=B;B=t}
  const von=nr+1;
  for(let k=0;k<n;k++)out.push({nr:++nr,laenge:L,breite:B,zeile:i,bez:z.bez||"",merkmal:"",hinweis:""});
  bereich[i]={von,bis:nr};
 });
 return {bleche:out,bereich};
}
function zrFormate(a){
 a=a||zrA;
 if(a.form==="tafel"){
  const B=zrZ(a.tafelBreite),L=zrZ(a.tafelLaenge);
  return (B>0&&L>0)?[{breite:B,laenge:L,text:ebaFormatText({breite:B,laenge:L})}]:[];
 }
 const R=zrZ(a.rolle);
 return R>0?[{breite:R,laenge:null,text:ebaFormatText({breite:R,laenge:null})}]:[];
}

// ---- Der Plan (gleiche Form wie in den Massaufnahmen, vgl. mdaZuschnittPlan) ----
function zrPlan(a){
 a=a||zrA;
 const form=a.form==="tafel"?"tafel":"rolle";
 const {bleche}=zrBleche(a);
 const formate=zrFormate(a);
 const netto=bleche.reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
 let p={gruppen:[],moeglich:[],zuSchmal:[],zuLang:[],zuKurz:[],bestes:null,netto,optimal:true,form,formate};
 if(bleche.length&&typeof ebaFormatPlan==="function"){
  const nach=new Map();
  bleche.forEach(x=>{if(!nach.has(x.breite))nach.set(x.breite,[]);nach.get(x.breite).push(x)});
  const gruppen=Array.from(nach.keys()).sort((x,y)=>y-x).map(B=>({breite:B,stuecke:nach.get(B),bleche:nach.get(B)}));
  p=ebaFormatPlan({gruppen,formate,form,netto});
 }
 return {art:form,form,formGrund:"",formQuelle:"wahl",einheit:"Stück",material:a.material||"",
  einleitung:zuEinleitung(form),quelle:zuQuelle(form),
  leer:ebaLeerText({form,formate},bleche.length?"":"Noch nichts zuzuschneiden – bitte Zuschnittmasse eingeben oder importieren."),
  streifenbreiten:(p.gruppen||[]).map(g=>g.breite),
  gruppen:p.gruppen||[],moeglich:p.moeglich||[],bestes:p.bestes||null,netto:p.netto,ausResten:[],
  zuLang:p.zuLang||[],zuKurz:p.zuKurz||[],zuSchmal:p.zuSchmal||[],optimal:p.optimal!==false,formate:p.formate||formate};
}
// Gespeicherte Form fuer zuDruckHtml (gleiche Felder wie mdDaten().zuschnitt)
function zrZuschnittDaten(p){
 return {auswahl:[],breiten:(p.formate||[]).map(f=>f.breite),
  form:p.form,formGrund:"",formQuelle:"wahl",formLaenge:p.bestes?(p.bestes.laenge||null):null,
  netto:Number(zrZ(p.netto).toFixed(3)),bestes:p.bestes||null,moeglich:p.moeglich||[],
  gruppen:(p.gruppen||[]).map(g=>({breite:g.breite,rollenLaenge:g.rollenLaenge,abschnittLaenge:g.abschnittLaenge,jeAbschnitt:g.jeAbschnitt,abschnitte:g.abschnitte,
   streifen:(g.streifen||[]).map(s=>({stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,breite:x.breite,merkmal:x.merkmal||""})),rest:s.rest,abschnittLaenge:s.abschnittLaenge,abschnittNr:s.abschnittNr}))})),
  optimal:p.optimal!==false,ausResten:[]};
}

// ---- Import aus Excel / CSV -------------------------------------------------
// rows: Tabelle als Array von Zeilen (wie XLSX.utils.sheet_to_json mit header:1).
// Kopfzeile wird erkannt (Laenge, Breite, Anzahl, Bezeichnung); ohne Kopfzeile
// gilt die Reihenfolge Laenge, Breite, Anzahl (mit einer Textspalte davor:
// Bezeichnung, Laenge, Breite, Anzahl).
function zrZeilenAusTabelle(rows){
 const tab=(rows||[]).map(r=>Array.isArray(r)?r:[]).filter(r=>r.some(c=>String(c==null?"":c).trim()!==""));
 if(!tab.length)return {zeilen:[],grund:"leer"};
 const kopfTest={
  laenge:c=>/^(l|len|length)$/i.test(c)||/l(ä|ae|Ã¤)nge/i.test(c),
  breite:c=>/^(breite|b|width)$/i.test(c)||/breite/i.test(c),
  anzahl:c=>/^(anz\.?|anzahl|stk\.?|stück|stueck|menge|qty|n)$/i.test(c)||/anzahl|st(ü|ue)ck/i.test(c),
  bez:c=>/^(bez\.?|bezeichnung|name|text|teil|pos\.?|position|nr\.?)$/i.test(c)||/bezeichnung/i.test(c)
 };
 const kopf=tab[0].map(c=>String(c==null?"":c).trim());
 const idx={};
 Object.keys(kopfTest).forEach(k=>{const i=kopf.findIndex(c=>c&&Number.isNaN(zrZahl(c))&&kopfTest[k](c));if(i>=0)idx[k]=i});
 let start=0;
 if(idx.laenge!==undefined&&idx.breite!==undefined)start=1;
 else{
  // ohne Kopfzeile: Spalten nach Position
  const erste=tab[0];
  const nZahl=erste.filter(c=>!Number.isNaN(zrZahl(c))).length;
  const textVorn=erste.length>0&&Number.isNaN(zrZahl(erste[0]))&&nZahl>=2;
  const o=textVorn?1:0;
  idx.bez=textVorn?0:undefined;idx.laenge=o;idx.breite=o+1;idx.anzahl=o+2;
  if(Number.isNaN(zrZahl(erste[idx.laenge]))&&tab.length>1){start=1}   // doch eine unbekannte Kopfzeile
 }
 const zeilen=[];let uebersprungen=0;
 for(let i=start;i<tab.length&&zeilen.length<ZR_MAX_ZEILEN;i++){
  const r=tab[i];
  const L=zrZahl(r[idx.laenge]),B=zrZahl(r[idx.breite]);
  if(!(L>0&&B>0)){uebersprungen++;continue}
  let n=idx.anzahl!==undefined?zrZahl(r[idx.anzahl]):1;
  if(!(n>=1))n=1;
  zeilen.push({bez:idx.bez!==undefined?String(r[idx.bez]==null?"":r[idx.bez]).trim():"",
   laenge:String(L),breite:String(B),anzahl:String(Math.floor(n))});
 }
 return {zeilen,uebersprungen,grund:zeilen.length?"":"keine"};
}
async function zrImportDatei(datei){
 if(typeof xlsxLaden!=="function"||!(await xlsxLaden())){appAlert("Der Excel-Import ist gerade nicht verfügbar (Bibliothek nicht geladen).");return}
 let rows;
 try{
  // CSV/Text als Text lesen (UTF-8, sonst werden Umlaute in der Kopfzeile zerstoert), Excel als Bytes
  const istText=/\.(csv|txt)$/i.test(datei.name||"")||/^text\//.test(datei.type||"");
  const wb=istText?XLSX.read(await datei.text(),{type:"string"}):XLSX.read(await datei.arrayBuffer(),{type:"array"});
  rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""});
 }catch(e){appAlert("Die Datei konnte nicht gelesen werden: "+(e&&e.message||e));return}
 const r=zrZeilenAusTabelle(rows);
 if(!r.zeilen.length){appAlert("In der Datei wurden keine Zuschnittmasse gefunden. Erwartet werden die Spalten Länge, Breite und Anzahl (mm).");return}
 const leer=zrA.zeilen.every(z=>!String(z.laenge).trim()&&!String(z.breite).trim());
 zrA.zeilen=(leer?[]:zrA.zeilen).concat(r.zeilen).slice(0,ZR_MAX_ZEILEN);
 zrSpeichern();zrZeichnen();
 appAlert(r.zeilen.length+" Zeile"+(r.zeilen.length===1?"":"n")+" importiert"+(r.uebersprungen?" ("+r.uebersprungen+" ohne gültige Länge/Breite übersprungen)":"")+".");
}
async function zrVorlage(){
 if(typeof xlsxLaden!=="function"||!(await xlsxLaden())){appAlert("Die Vorlage ist gerade nicht verfügbar (Bibliothek nicht geladen).");return}
 const ws=XLSX.utils.aoa_to_sheet([["Bezeichnung","Länge (mm)","Breite (mm)","Anzahl"],["Beispiel Abdeckung",2000,310,4],["Beispiel Winkel",1500,250,2]]);
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,"Zuschnitt");
 XLSX.writeFile(wb,"Zuschnittliste-Vorlage.xlsx");
}

// ---- Darstellung -------------------------------------------------------------
function zrFormatHtml(){
 const a=zrA;
 const rollen=ZR_ROLLEN.map(r=>`<button type="button" class="gray zr-chip" data-zr-rolle="${r}">${r}</button>`).join("");
 const tafeln=ZR_TAFELN.map(([b,l])=>`<button type="button" class="gray zr-chip" data-zr-tafel="${b}x${l}">${b} × ${l}</button>`).join("");
 return `<div class="grid">
<div class="wide"><label>Blechformat</label><select data-zr="form"><option value="rolle"${a.form!=="tafel"?" selected":""}>Rolle (Streifen ab Rolle)</option><option value="tafel"${a.form==="tafel"?" selected":""}>Tafel (feste Grösse)</option></select></div>
${a.form==="tafel"
 ?`<div><label>Tafelbreite (mm)</label><input data-zr="tafelBreite" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.tafelBreite)}"></div>
<div><label>Tafellänge (mm)</label><input data-zr="tafelLaenge" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.tafelLaenge)}"></div>`
 :`<div><label>Rollenbreite (mm)</label><input data-zr="rolle" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.rolle)}"></div>`}
<div class="wide"><label>Material / Bezeichnung (für den Ausdruck)</label><input data-zr="material" type="text" placeholder="z. B. Titanzink 0,7 mm" value="${esc(a.material)}"></div>
</div>
<div class="small" style="margin:6px 0 2px">Häufige Formate:</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">${a.form==="tafel"?tafeln:rollen}</div>
<label class="ra-schalter" style="margin-top:8px"><input type="checkbox" data-zr="drehen"${a.drehen?" checked":""}> Stücke dürfen gedreht werden (die kürzere Seite wird die Streifenbreite)</label>`;
}
function zrZeilenHtml(){
 const {bereich}=zrBleche();
 return zrA.zeilen.map((z,i)=>{
  const b=bereich[i];
  const nr=b?(b.von===b.bis?"Nr. "+b.von:"Nr. "+b.von+"–"+b.bis):"";
  return `<div class="zr-zeile" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr) auto;gap:6px;align-items:end;margin-bottom:6px">
<div><label>${i===0?"Bezeichnung":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="bez" type="text" placeholder="optional" value="${esc(z.bez)}"></div>
<div><label>${i===0?"Länge":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="laenge" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.laenge)}"></div>
<div><label>${i===0?"Breite":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="breite" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.breite)}"></div>
<div><label>${i===0?"Anzahl":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="anzahl" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.anzahl)}"></div>
<div><button type="button" class="red" data-zr-weg="${i}" title="Zeile löschen" style="padding:8px 10px">×</button></div>
<div style="grid-column:1/-1;margin-top:-4px"><span class="small" data-zr-nr="${i}" style="color:var(--muted)">${esc(nr)}</span></div>
</div>`;
 }).join("");
}
function zrEingabeHtml(){
 return `<div id="zrZeilen">${zrZeilenHtml()}</div>
<div class="bar">
<button type="button" class="gray" id="zrPlus">＋ Zeile</button>
<button type="button" class="gray" id="zrImport">📥 Excel / CSV importieren</button>
<button type="button" class="gray" id="zrVorlage">⬇ Vorlage</button>
<button type="button" class="gray" id="zrLoeschen">Alles löschen</button>
</div>
<input type="file" id="zrDatei" accept=".xlsx,.xls,.csv,.ods,.txt" hidden>
<div class="small">Masse in mm. Beim Import werden die Spalten <b>Länge</b>, <b>Breite</b> und <b>Anzahl</b> (und optional <b>Bezeichnung</b>) erkannt – mit oder ohne Kopfzeile. Eine Zeile mit Anzahl 3 sind drei gleiche Stücke.</div>`;
}
function zrPlanHtml(){
 const {bleche}=zrBleche();
 const p=zrPlan();
 const stk=bleche.length;
 const kenn=`<div class="grid" style="margin-bottom:8px">
<div><label>Stücke</label><div class="ra-wert">${stk}</div></div>
<div><label>Nettofläche</label><div class="ra-wert">${zrZ(p.netto).toFixed(2).replace(".",",")} m²</div></div>
</div>`;
 return kenn+zuschnittHtml(p)+`<div class="bar" style="margin-top:10px"><button type="button" class="blue" id="zrDruck"${stk?"":" disabled"}>🖨️ Plan drucken / PDF</button></div>`;
}
// Nur die Zeilennummern aktualisieren (die Eingabefelder bleiben stehen, der Fokus auch)
function zrNummernNeu(){
 const {bereich}=zrBleche();
 document.querySelectorAll("#zrModal [data-zr-nr]").forEach(el=>{
  const b=bereich[Number(el.dataset.zrNr)];
  el.textContent=b?(b.von===b.bis?"Nr. "+b.von:"Nr. "+b.von+"–"+b.bis):"";
 });
}
function zrPlanNeu(){
 const el=$("zrPlan");
 if(el)el.innerHTML=zrPlanHtml();
 zrNummernNeu();
}
let zrTimer=null;
function zrPlanSpaeter(){
 clearTimeout(zrTimer);
 zrTimer=setTimeout(zrPlanNeu,250);
}
function zrZeichnen(){
 const a=$("zrFormat"),b=$("zrEingabe");
 if(!a||!b)return;
 a.innerHTML=zrFormatHtml();
 b.innerHTML=zrEingabeHtml();
 zrPlanNeu();
}
function zrOeffnen(){
 const m=$("zrModal");
 if(!m)return;
 zrLaden();
 zrZeichnen();
 m.hidden=false;
}

// ---- Ausdruck ------------------------------------------------------------------
async function zrDrucken(){
 const {bleche,bereich}=zrBleche();
 if(!bleche.length)return;
 const win=window.open("","_blank");
 if(!win){appAlert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return}
 const p=zrPlan();
 let logoSrc="";
 try{logoSrc=(typeof storageSignedUrl==="function")?await storageSignedUrl(logoUrl):logoUrl}catch(e){logoSrc=""}
 const kopf=(typeof pdfKopfHtml==="function")
  ?pdfKopfHtml({logoSrc,dokumenttyp:"Zuschnittplan",unterart:"Zuschnittrechner",material:zrA.material||"",datum:new Date().toISOString().slice(0,10)})
  :`<h1>Zuschnittplan</h1>`;
 const tabelle=zrA.zeilen.map((z,i)=>bereich[i]?`<tr><td>${bereich[i].von===bereich[i].bis?bereich[i].von:bereich[i].von+"–"+bereich[i].bis}</td><td>${esc(z.bez)}</td><td>${zrMm(z.laenge)}</td><td>${zrMm(z.breite)}</td><td>${esc(z.anzahl)}</td></tr>`:"").join("");
 const fmt=(p.formate||[])[0];
 const html=`${kopf}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr><td><label>Blechformat</label><div class="val">${esc(zrA.form==="tafel"?"Tafel":"Rolle")} ${esc(fmt?fmt.text:"–")}</div></td><td><label>Stücke / Nettofläche</label><div class="val">${bleche.length} / ${zrZ(p.netto).toFixed(2).replace(".",",")} m²</div></td></tr>
${zrA.drehen?`<tr><td colspan="2"><label>Drehen</label><div class="val">erlaubt (kürzere Seite = Streifenbreite)</div></td></tr>`:""}
</table>
<div class="eb-section-head">Zuschnittmasse</div>
<table class="eb-cutlist"><thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Länge (mm)</th><th>Breite (mm)</th><th>Anzahl</th></tr></thead><tbody>${tabelle}</tbody></table>
${zuDruckHtml(zrZuschnittDaten(p),0,"Stück")}`;
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Zuschnittplan</title>
<style>
${PDF_LAYOUT_CSS}
</style></head><body>
${(typeof pdfZahlenRechts==="function")?pdfZahlenRechts(html):html}
</body></html>`);
 win.document.close();
 const drucken=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=drucken;
 setTimeout(drucken,800);
}

// ---- Bedienung -----------------------------------------------------------------
document.addEventListener("input",e=>{
 const t=e.target;
 if(!t||!t.closest||!t.closest("#zrModal"))return;
 if(t.dataset.zrFeld!==undefined){
  const z=zrA.zeilen[Number(t.dataset.zrZeile)];
  if(z){z[t.dataset.zrFeld]=t.value;zrSpeichern();zrPlanSpaeter();zrNummernNeu()}
  return;
 }
 if(t.dataset.zr&&t.dataset.zr!=="form"&&t.dataset.zr!=="drehen"){
  zrA[t.dataset.zr]=t.value;zrSpeichern();
  if(t.dataset.zr!=="material")zrPlanSpaeter();
 }
});
document.addEventListener("change",async e=>{
 const t=e.target;
 if(!t||!t.closest||!t.closest("#zrModal"))return;
 if(t.id==="zrDatei"){
  const f=t.files&&t.files[0];
  t.value="";
  if(f)await zrImportDatei(f);
  return;
 }
 if(t.dataset.zr==="form"){zrA.form=t.value==="tafel"?"tafel":"rolle";zrSpeichern();zrZeichnen();return}
 if(t.dataset.zr==="drehen"){zrA.drehen=!!t.checked;zrSpeichern();zrPlanNeu();return}
});
document.addEventListener("click",async e=>{
 const k=e.target&&e.target.closest?e.target.closest("#zrModal button, [data-zr-oeffnen]"):null;
 if(!k)return;
 if(k.hasAttribute("data-zr-oeffnen")){zrOeffnen();return}
 if(k.id==="closeZr"){$("zrModal").hidden=true;return}
 if(k.dataset.zrRolle!==undefined){zrA.rolle=k.dataset.zrRolle;zrSpeichern();zrZeichnen();return}
 if(k.dataset.zrTafel!==undefined){const [b,l]=k.dataset.zrTafel.split("x");zrA.tafelBreite=b;zrA.tafelLaenge=l;zrSpeichern();zrZeichnen();return}
 if(k.dataset.zrWeg!==undefined){
  zrA.zeilen.splice(Number(k.dataset.zrWeg),1);
  if(!zrA.zeilen.length)zrA.zeilen.push({bez:"",laenge:"",breite:"",anzahl:"1"});
  zrSpeichern();zrZeichnen();return;
 }
 if(k.id==="zrPlus"){
  if(zrA.zeilen.length>=ZR_MAX_ZEILEN){appAlert("Höchstens "+ZR_MAX_ZEILEN+" Zeilen.");return}
  zrA.zeilen.push({bez:"",laenge:"",breite:"",anzahl:"1"});zrSpeichern();zrZeichnen();
  const f=document.querySelector('#zrZeilen [data-zr-zeile="'+(zrA.zeilen.length-1)+'"][data-zr-feld="laenge"]');if(f)f.focus();
  return;
 }
 if(k.id==="zrImport"){const d=$("zrDatei");if(d)d.click();return}
 if(k.id==="zrVorlage"){await zrVorlage();return}
 if(k.id==="zrLoeschen"){
  if(!await appConfirm("Alle Zuschnittmasse löschen?"))return;
  zrA.zeilen=[{bez:"",laenge:"",breite:"",anzahl:"1"}];zrSpeichern();zrZeichnen();return;
 }
 if(k.id==="zrDruck"){await zrDrucken();return}
});
