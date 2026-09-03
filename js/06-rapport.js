"use strict";
function rateFor(name){const r=settings.rates.find(x=>x[0]===name);return r?Number(String(r[1]).replace(",","."))||0:0}
function materialFor(no){return settings.materials.find(x=>x[0]===no)}
// Freie Position: EDV-Nr. 999.99 steht fuer "nicht im Katalog". Bezeichnung,
// Dim., Einheit und Preis werden dann direkt in der Zeile erfasst und im
// Rapport selbst gespeichert (material_entries) - der Katalog bleibt
// unberuehrt. Die Nummer ist frei: in keinem Katalog kommt 999.xx vor.
// Zehn gleichwertige Nummern: 999.90 bis 999.99. So kann ein Rapport
// mehrere freie Positionen mit unterschiedlichen Nummern enthalten - alle
// verhalten sich identisch. Keine davon kommt in einem Katalog vor.
const FREIE_POSITION_NRN=Object.freeze(Array.from({length:10},(_,i)=>"999."+(90+i)));
const FREIE_POSITION_NR=FREIE_POSITION_NRN[FREIE_POSITION_NRN.length-1];
function istFreiePosition(no){
 return FREIE_POSITION_NRN.indexOf(String(no==null?"":no).trim())>=0;
}
// Naechste in diesem Rapport noch nicht benutzte freie Nummer. Sind alle
// belegt, wird die letzte der Auswahl erneut angeboten - doppelte Nummern
// sind unschaedlich, jede Zeile traegt ihre eigenen Werte.
function naechsteFreiePositionNr(kandidaten){
 const liste=(kandidaten&&kandidaten.length)?kandidaten:FREIE_POSITION_NRN;
 const zeilen=(typeof mats!=="undefined"&&mats)?mats:[];
 const belegt=new Set(zeilen.map(m=>String(m&&m.no!=null?m.no:"").trim()));
 return liste.find(nr=>!belegt.has(nr))||liste[liste.length-1];
}
function matZahl(v){return Number(String(v==null?"":v).replace(",","."))||0}
// Preis je Einheit - aus der Zeile selbst (freie Position) oder aus dem Katalog.
function matPreis(m){
 if(!m)return 0;
 if(istFreiePosition(m.no))return matZahl(m.price);
 const x=materialFor(m.no);
 return x?matZahl(x[4]):0;
}
// Zeilentotal. Eine unbekannte EDV-Nr. bleibt wie bisher ohne Betrag.
function matZeileTotal(m){return matPreis(m)*(Number(m&&m.qty)||0)}
// Hat die Zeile ueberhaupt einen Bezug (Katalog oder freie Position)?
function matBekannt(m){return !!m&&(istFreiePosition(m.no)||!!materialFor(m.no))}
function searchMaterials(q){
 q=(q||"").trim().toLowerCase();
 return (!q?settings.materials:settings.materials.filter(x=>String(x[0]).toLowerCase().startsWith(q)||String(x[1]).toLowerCase().includes(q))).slice(0,15)
}

function renderMain(){
  sortWorksLive();
  sortMaterialsLive();
 $("workBody").innerHTML=works.length?works.map((w,i)=>`
<tr>
<td><input data-w-date="${i}" type="date" value="${esc(w.date||"")}"></td>
<td><input data-w-desc="${i}" value="${esc(w.desc)}" placeholder="Arbeit"></td>
<td><select data-w-emp="${i}">${settings.employees.map(e=>`<option value="${esc(e)}" ${e===w.employee?"selected":""}>${esc(initials(e))}</option>`).join("")}</select></td>
<td><select data-w-rate="${i}">${settings.rates.map(r=>`<option ${r[0]===w.rateName?"selected":""}>${esc(r[0])}</option>`).join("")}</select></td>
<td><input data-w-hours="${i}" type="number" step=".25" min="0" value="${w.hours}"></td>
<td class="money" data-work-rate-cell="${i}">${money(rateFor(w.rateName))}</td>
<td class="money" data-work-total="${i}">${money(w.hours*rateFor(w.rateName))}</td>
<td class="no-print"><button class="red" data-del-work="${i}">×</button></td></tr>`).join(""):'<tr><td colspan="8" class="empty">Noch keine Arbeitsposition.</td></tr>';

 $("matBody").innerHTML=mats.length?mats.map((m,i)=>{
 const x=materialFor(m.no);
 const frei=istFreiePosition(m.no);
 // Bei der freien Position sind Bezeichnung, Dim., Einheit und Preis
 // Eingabefelder statt Katalogtexte.
 const beschreibung=frei
  ?`<td><input data-mat-desc="${i}" value="${esc(m.desc||"")}" placeholder="Bezeichnung"></td>
 <td><input data-mat-dim="${i}" value="${esc(m.dim||"")}" placeholder="Dim."></td>
 <td><input data-mat-unit="${i}" value="${esc(m.unit||"")}" placeholder="Einheit"></td>`
  :`<td>${x?esc(x[1]):"—"}</td><td>${x?esc(x[2]):"—"}</td><td>${x?esc(x[3]):"—"}</td>`;
 const preis=frei
  ?`<td class="money"><input data-mat-price="${i}" class="mat-preis" type="number" step=".01" min="0" value="${esc(m.price==null?"":m.price)}" placeholder="0.00"></td>`
  :`<td class="money">${x?money(matZahl(x[4])):"—"}</td>`;
 return `<tr><td><input data-mat-date="${i}" type="date" value="${esc(m.date||"")}"></td><td><div class="search"><input data-mat-search="${i}" value="${esc(m.no)}" placeholder="EDV-Nr." autocomplete="off"><div id="matSug${i}" class="suggest"></div></div></td>
 ${beschreibung}
 <td><input data-mat-qty="${i}" type="number" step=".01" min="0" value="${m.qty}"></td>
 ${preis}<td class="money" data-mat-total="${i}">${matBekannt(m)?money(matZeileTotal(m)):"0.00"}</td>
 <td class="no-print"><button class="red" data-del-mat="${i}">×</button></td></tr>`
 }).join(""):'<tr><td colspan="9" class="empty">Noch kein Material erfasst.</td></tr>';

 updateTotals();
}

function updatePrintRates(wt){
 const names=$("printRateNames"), vals=$("printRateValues");
 if(!names||!vals)return;
 names.innerHTML=settings.rates.map(r=>`<th>${esc(r[0])}</th>`).join("");
 vals.innerHTML=settings.rates.map(r=>`<td>${money(r[1])}</td>`).join("");
 $("printRateWorkTotal").textContent=money(wt);
}
function updateMaterialRowTotal(i){
  const row=document.querySelector(`#matBody tr:nth-child(${i+1})`);
  if(!row)return;
  const m=mats[i];
  const moneyCells=row.querySelectorAll(".money");
  if(moneyCells.length>=2){
    moneyCells[moneyCells.length-1].textContent=money(matZeileTotal(m));
  }
}

function sortDate(v){
  const x=String(v||"").trim();
  if(!x) return "9999-12-31";
  let m=x.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m=x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return x;
}
function sortMaterialsLive(){
  mats.sort((a,b)=>{
    const dateA=sortDate(a.date);
    const dateB=sortDate(b.date);
    if(dateA!==dateB) return dateA.localeCompare(dateB);

    const na=String(a.no||"");
    const nb=String(b.no||"");
    const ma=na.match(/\d+(?:[.,]\d+)?/);
    const mb=nb.match(/\d+(?:[.,]\d+)?/);
    if(ma && mb){
      const va=parseFloat(ma[0].replace(",",".")), vb=parseFloat(mb[0].replace(",","."));
      if(va!==vb) return va-vb;
    }
    return na.localeCompare(nb, "de", {numeric:true, sensitivity:"base"});
  });
}
function sortWorksLive(){
  works.sort((a,b)=>sortDate(a.date).localeCompare(sortDate(b.date)));
}

function updateTotals(){
 const wt=works.reduce((s,w)=>s+(Number(w.hours)||0)*rateFor(w.rateName),0);
 const mt=mats.reduce((s,m)=>s+matZeileTotal(m),0);
 $("workTotal").textContent=money(wt);$("matTotal").textContent=money(mt);
 $("netTotal").value=money(wt+mt);
 const vat=Number(String($("vat").value).replace(",","." ).replace("%",""))||0;
 $("grossTotal").value=money((wt+mt)*(1+vat/100));
 $("employee").value=currentProfile?`${currentProfile.first_name} ${currentProfile.last_name}`:"";
 updatePrintRates(wt);
}

$("workBody").addEventListener("input",e=>{
 let i=e.target.dataset.wDesc??e.target.dataset.wHours??e.target.dataset.wDate;
 if(i!==undefined){i=Number(i);
  if(e.target.dataset.wDesc!==undefined)works[i].desc=e.target.value;
  else if(e.target.dataset.wDate!==undefined)works[i].date=e.target.value;
  else works[i].hours=Number(e.target.value)||0;
  const cell=document.querySelector(`[data-work-total="${i}"]`);
  if(cell)cell.textContent=money(works[i].hours*rateFor(works[i].rateName));
  updateTotals()
 }
});
$("workBody").addEventListener("change",e=>{
 if(e.target.dataset.wDate!==undefined){sortWorksLive();renderMain();return}
 const i=Number(e.target.dataset.wEmp??e.target.dataset.wRate);
 if(Number.isNaN(i))return;
 if(e.target.dataset.wEmp!==undefined)works[i].employee=e.target.value;
 if(e.target.dataset.wRate!==undefined)works[i].rateName=e.target.value;
 const rateCell=document.querySelector(`[data-work-rate-cell="${i}"]`);
 const totalCell=document.querySelector(`[data-work-total="${i}"]`);
 if(rateCell)rateCell.textContent=money(rateFor(works[i].rateName));
 if(totalCell)totalCell.textContent=money(works[i].hours*rateFor(works[i].rateName));
 updateTotals();
 // Keep the current input focused; no full table redraw while typing/selecting.

});
$("workBody").addEventListener("click",e=>{const b=e.target.closest("[data-del-work]");if(b){works.splice(Number(b.dataset.delWork),1);renderMain()}});

// Eintrag "Freie Position" fuer die Vorschlagsliste einer Materialzeile.
// Getippte Nummer grenzt die Auswahl ein ("999.93" -> genau diese), sonst
// wird die naechste noch freie Nummer angeboten. Leere Eingabe zeigt den
// Eintrag ebenfalls, damit er auffindbar ist.
function freiePositionVorschlag(q,n){
 const s=String(q==null?"":q).trim().toLowerCase();
 const treffer=s?FREIE_POSITION_NRN.filter(nr=>nr.startsWith(s)):FREIE_POSITION_NRN.slice();
 const wort=!s||"freie position".startsWith(s)||"frei".startsWith(s);
 if(!treffer.length&&!wort)return "";
 const auswahl=treffer.length?treffer:FREIE_POSITION_NRN.slice();
 const nr=naechsteFreiePositionNr(auswahl);
 const zusatz=auswahl.length>1?" · 999.90–999.99":"";
 return `<div class="item" data-pick-mat="${n}" data-no="${nr}">`
  +`<b>${nr} · Freie Position</b>`
  +`<span>Bezeichnung, Dim., Einheit und Preis frei eintragen${zusatz}</span></div>`;
}

function positionSuggest(input,box){
 const r=input.getBoundingClientRect();
 const vv=window.visualViewport;
 const vw=vv?vv.width:(window.innerWidth||document.documentElement.clientWidth);
 const vh=vv?vv.height:(window.innerHeight||document.documentElement.clientHeight);
 const offX=vv?vv.offsetLeft:0, offY=vv?vv.offsetTop:0;
 const w=Math.min(560,Math.max(320,vw*0.92));
 let left=Math.min(r.left,offX+vw-w-8); left=Math.max(offX+8,left);
 const maxH=Math.min(260,vh-24);
 let top=r.bottom+4;
 if(top+maxH>offY+vh && r.top-maxH-4>offY+8) top=r.top-maxH-4;
 box.style.left=left+"px";box.style.top=top+"px";box.style.width=w+"px";box.style.maxHeight=maxH+"px";
}
function repositionAllSuggests(){
 document.querySelectorAll(".suggest").forEach(box=>{
  if(!box.innerHTML.trim())return;
  let input;
  if(box.id==="sheetResults")input=$("sheetSearch");
  else if(box.id==="projectResults")input=$("projectSearch");
  else if(box.id==="measProjectResults")input=$("measProjectSearch");
  else if(box.id==="measurementProjectResults")input=$("measurementProjectSearch");
  else if(box.id==="amProjectResults")input=$("amProjectSearch");
  else if(box.id==="bzPositionResults")input=$("bzPositionSearch");
  else if(box.id==="ausmassProjectResults")input=$("ausmassProjectSearch");
  else input=document.querySelector(`[data-mat-search="${box.id.slice(6)}"]`);
  if(input)positionSuggest(input,box);
 });
}
window.addEventListener("scroll",repositionAllSuggests,true);
window.addEventListener("resize",repositionAllSuggests);
if(window.visualViewport){
 window.visualViewport.addEventListener("resize",repositionAllSuggests);
 window.visualViewport.addEventListener("scroll",repositionAllSuggests);
}

$("matBody").addEventListener("input",e=>{
 // Felder der freien Position: Modell und Zeilentotal auffrischen, aber die
 // Tabelle NICHT neu zeichnen - sonst verliert das Feld beim Tippen den Fokus.
 const frei=e.target.dataset.matDesc??e.target.dataset.matDim
           ??e.target.dataset.matUnit??e.target.dataset.matPrice;
 if(frei!==undefined){
  const k=Number(frei);
  if(e.target.dataset.matDesc!==undefined)mats[k].desc=e.target.value;
  else if(e.target.dataset.matDim!==undefined)mats[k].dim=e.target.value;
  else if(e.target.dataset.matUnit!==undefined)mats[k].unit=e.target.value;
  else mats[k].price=e.target.value;
  updateMaterialRowTotal(k);
  updateTotals();
  return;
 }
 const i=e.target.dataset.matSearch??e.target.dataset.matQty??e.target.dataset.matDate;if(i===undefined)return;
 const n=Number(i);
 if(e.target.dataset.matDate!==undefined){
  mats[n].date=e.target.value; updateTotals(); return;
 }
 if(e.target.dataset.matSearch!==undefined){
  mats[n].no=e.target.value;
  const box=$("matSug"+n);
  // Die freie Position steht zuoberst - sie gehoert nicht in den Katalog
  // (searchMaterials wird auch vom Blechverbrauch benutzt) und wird deshalb
  // nur hier ergaenzt.
  box.innerHTML=freiePositionVorschlag(e.target.value,n)
   +searchMaterials(e.target.value).map(x=>`<div class="item" data-pick-mat="${n}" data-no="${esc(x[0])}"><b>${esc(x[0])} · ${esc(x[1])}</b><span>${esc(x[2])} · ${esc(x[3])} · CHF ${money(x[4])}</span></div>`).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
  }else{
   mats[n].qty=Number(e.target.value)||0;
   const totalCell=document.querySelector(`[data-mat-total="${n}"]`);
   if(totalCell)totalCell.textContent=matBekannt(mats[n])?money(matZeileTotal(mats[n])):"0.00";
   updateTotals();
}
});
$("matBody").addEventListener("change",e=>{
 if(e.target.dataset.matDate!==undefined){sortMaterialsLive();renderMain();return}
 // Wird 999.99 von Hand eingetippt (oder wieder ersetzt), muss die Zeile
 // zwischen Katalogtext und Eingabefeldern umschalten. Das passiert beim
 // Verlassen des Feldes, nicht schon beim Tippen.
 if(e.target.dataset.matSearch!==undefined){
  const n=Number(e.target.dataset.matSearch);
  const jetztFrei=istFreiePosition(mats[n].no);
  const zeigtFelder=!!document.querySelector(`[data-mat-desc="${n}"]`);
  if(jetztFrei!==zeigtFelder)renderMain();
 }
});
$("matBody").addEventListener("click",e=>{
 const p=e.target.closest("[data-pick-mat]"),d=e.target.closest("[data-del-mat]");
 if(p){const i=Number(p.dataset.pickMat);mats[i].no=p.dataset.no;renderMain();updateMaterialRowTotal(i);updateTotals()}
 if(d){mats.splice(Number(d.dataset.delMat),1);renderMain()}
});

$("addWork").onclick=()=>{works.push({date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0});renderMain()};
$("addMat").onclick=()=>{mats.push({date:new Date().toISOString().slice(0,10),no:"",qty:0});renderMain()};
$("vat").addEventListener("input",updateTotals);
