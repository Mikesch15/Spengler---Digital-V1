"use strict";
// ---- Einlaufblech gerade (Stueckliste, max. 2m pro Stueck) -------
let ebPieces=[];
function ebEngeSeite(){
 return $("eb_montage").value==="links"?"rechts":"links";
}
function ebRestbreite(){
 const massA=Number($("eb_massA").value)||0;
 const abwicklung=Number($("eb_abwicklung").value);
 const umschlagOben=Number(einlaufblechSettings.umschlag_oben)||0;
 const umschlagUnten=Number(einlaufblechSettings.umschlag_unten)||0;
 return abwicklung-massA-umschlagOben-umschlagUnten;
}
function renderEbDiagram(){
 const winkel=$("eb_winkel").value;
 const massA=$("eb_massA").value;
 const restBreite=ebRestbreite();
 $("eb_diagram").innerHTML=einlaufblechDiagramSvg(winkel,massA,restBreite,einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten);
}
function renderEbPiecesTable(){
 const massA=Number($("eb_massA").value)||0;
 const massAEng=Math.max(0,massA-2);
 const engeSeite=ebEngeSeite();
 const restBreite=ebRestbreite();
 $("eb_engHeader").textContent=`Eng ${engeSeite} (mm)`;
 $("eb_engeSeiteHint").textContent=`Mass A gilt für alle Stücke. Enges Mass (${massAEng} mm) wird bei Montage "von ${$("eb_montage").value}" auf der ${engeSeite}en Seite jedes Stücks berechnet.`;
 $("eb_resultBody").innerHTML=ebPieces.map((p,i)=>`<tr>
<td>${i+1}</td>
<td><input data-eb-stossstoss="${i}" type="number" step="1" value="${p.stossStoss||0}"></td>
<td><input data-eb-laenge="${i}" type="number" step="1" value="${p.laenge||0}"></td>
<td><input data-eb-gl="${i}" type="checkbox" ${p.gehrungLinks?"checked":""}></td>
<td><input data-eb-gr="${i}" type="checkbox" ${p.gehrungRechts?"checked":""}></td>
<td style="display:flex;gap:4px;align-items:center"><input data-eb-winkel="${i}" type="number" step="1" value="${p.winkel||0}" style="flex:1"><button type="button" class="gray" data-eb-flip="${i}" title="Winkel umkehren" style="padding:4px 8px">🔄</button></td>
<td${restBreite<0?' style="color:var(--red)"':""}>${massAEng}${restBreite<0?" ⚠️":""}</td>
<td><button type="button" class="red" data-eb-del="${i}" style="padding:6px 8px">×</button></td>
</tr>`).join("")||'<tr><td colspan="8" class="small">Noch keine Stücke. "🔄 Stücke aus Gesamtlänge berechnen" oder "+ Stück hinzufügen".</td></tr>';
 const gesamtlaenge=ebPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 const restBreiteText=restBreite<0?`⚠️ Restbreite ${restBreite} mm (Mass A + Umschläge grösser als Abwicklung!)`:`Restbreite (Dachschräge) ${restBreite} mm`;
 $("eb_summary").textContent=ebPieces.length?`${ebPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${$("eb_abwicklung").value} mm · ${restBreiteText}`:"";
 renderEbDiagram();
 $("eb_grundriss").innerHTML=generateEbkGrundriss(ebPieces);
 $("eb_toggleEndzugabeStart").textContent=`Endzugabe erstes Stück: ${(ebPieces.length&&ebPieces[ebPieces.length-1].endzugabeStart)?"ein":"aus"}`;
 $("eb_toggleEndzugabeEnd").textContent=`Endzugabe letztes Stück: ${(ebPieces.length&&ebPieces[ebPieces.length-1].endzugabeEnd)?"ein":"aus"}`;
}
function toggleEbEndzugabe(position){
 if(!ebPieces.length){alert("Bitte zuerst Stücke erfassen.");return}
 const endZugabe=Number(einlaufblechSettings.end_zugabe)||0;
 if(!endZugabe){alert("Bitte zuerst in Einstellungen → Massaufnahmen eine Endzugabe > 0 mm hinterlegen.");return}
 // Die Endzugabe wird immer auf das Reststück (letztes Stück) gerechnet, nie auf ein reguläres
 // Stück, da kein Stück länger als Länge Stoss bis Stoss + Überlappung sein darf (ausser dem Reststück).
 const idx=ebPieces.length-1;
 const flagKey=position==="start"?"endzugabeStart":"endzugabeEnd";
 const piece=ebPieces[idx];
 if(piece[flagKey]){
  piece.laenge=Math.max(0,(Number(piece.laenge)||0)-piece[flagKey]);
  piece[flagKey]=0;
 }else{
  piece.laenge=(Number(piece.laenge)||0)+endZugabe;
  piece[flagKey]=endZugabe;
 }
 renderEbPiecesTable();
}
$("eb_toggleEndzugabeStart").onclick=()=>toggleEbEndzugabe("start");
$("eb_toggleEndzugabeEnd").onclick=()=>toggleEbEndzugabe("end");
function buildEbPiecesFromGesamtlaenge(gesamtlaenge){
 const stossLaenge=Number(einlaufblechSettings.stoss_laenge)||1;
 // Dieselbe Aufteilung wie bei Einlaufblech konisch (js/13), nur mit den
 // Einstellungen von Einlaufblech gerade.
 const laengen=teileLaengeInStuecke(gesamtlaenge,einlaufblechSettings);
 return laengen.map((len,i)=>{
  const istLetztes=i===laengen.length-1;
  return {laenge:len,stossStoss:istLetztes?len:stossLaenge,
          gehrungLinks:false,gehrungRechts:false,winkel:0};
 });
}
$("eb_regenerate").onclick=()=>{
 const gesamtlaenge=Number($("eb_gesamtlaenge").value)||0;
 if(!gesamtlaenge||gesamtlaenge<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
 if(ebPieces.length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
 ebPieces=buildEbPiecesFromGesamtlaenge(gesamtlaenge);
 renderEbPiecesTable();
};
$("eb_appendGesamtlaenge").onclick=()=>{
 const gesamtlaenge=Number($("eb_gesamtlaenge").value)||0;
 if(!gesamtlaenge||gesamtlaenge<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
 const neue=buildEbPiecesFromGesamtlaenge(gesamtlaenge);
 ebPieces=ebPieces.concat(neue);
 renderEbPiecesTable();
};
// ---- Stuecke aus einer Rinne-Halbrund-Massaufnahme uebernehmen -------
// Genau dieselben Bausteine wie bei Einlaufblech konisch (js/13), nur mit
// den Einstellungen von Einlaufblech gerade und ohne Mass links/rechts.
let ebRinneCache=[];
async function refreshEbRinneList(){
 const zustand=await ladeRinneHalbrundMassaufnahmen(measSelectedProjectId);
 ebRinneCache=zustand.liste||[];
 zeigeRinneUebernahmeListe("eb_rinneHint","eb_rinneList",zustand,"pick-eb-rinne");
}
$("eb_rinneList").addEventListener("click",e=>{
 const btn=e.target.closest("[data-pick-eb-rinne]");
 if(!btn)return;
 const m=ebRinneCache.find(x=>x.id===Number(btn.dataset.pickEbRinne));
 const segs=(m&&m.data&&m.data.segments)||[];
 if(!segs.length){alert("Diese Rinnen-Massaufnahme hat keine Segmente.");return}
 // Bestehende Stuecke werden nur nach ausdruecklicher Bestaetigung ersetzt.
 if(ebPieces.length&&!confirm("Vorhandene Stücke werden durch die aus dieser Rinne erzeugten Stücke ersetzt. Fortfahren?"))return;
 ebPieces=baueEinlaufblechStueckeAusRinne(segs,einlaufblechSettings,
  l=>teileLaengeInStuecke(l,einlaufblechSettings),false);
 renderEbPiecesTable();
 alert(`${ebPieces.length} Stück(e) aus ${segs.length} Segment(en) übernommen.`);
});

$("eb_addPiece").onclick=()=>{
 const stossStoss=Number(einlaufblechSettings.stoss_laenge)||2000;
 const defaultLen=stossStoss+(Number(einlaufblechSettings.ueberlappung)||0);
 ebPieces.push({laenge:defaultLen,stossStoss,gehrungLinks:false,gehrungRechts:false,winkel:0});
 renderEbPiecesTable();
};
$("eb_resultBody").addEventListener("input",e=>{
 const i=Number(e.target.dataset.ebStossstoss??e.target.dataset.ebLaenge??e.target.dataset.ebWinkel);
 if(Number.isNaN(i)||!ebPieces[i])return;
 if(e.target.dataset.ebStossstoss!==undefined){
  ebPieces[i].stossStoss=Number(e.target.value)||0;
  const ueberlappung=Number(einlaufblechSettings.ueberlappung)||0;
  ebPieces[i].laenge=ebPieces[i].stossStoss+ueberlappung;
  const row0=e.target.closest("tr");
  const laengeInput=row0?row0.querySelector(`[data-eb-laenge="${i}"]`):null;
  if(laengeInput)laengeInput.value=ebPieces[i].laenge;
 }
 else if(e.target.dataset.ebLaenge!==undefined)ebPieces[i].laenge=Number(e.target.value)||0;
 else if(e.target.dataset.ebWinkel!==undefined)ebPieces[i].winkel=Number(e.target.value)||0;
 const gesamtlaenge=ebPieces.reduce((s,p)=>s+(Number(p.laenge)||0),0);
 const restBreite=ebRestbreite();
 const restBreiteText=restBreite<0?`⚠️ Restbreite ${restBreite} mm (Mass A + Umschläge grösser als Abwicklung!)`:`Restbreite (Dachschräge) ${restBreite} mm`;
 $("eb_summary").textContent=`${ebPieces.length} Stück(e) · Gesamtlänge ${gesamtlaenge} mm · Abwicklung ${$("eb_abwicklung").value} mm · ${restBreiteText}`;
 $("eb_grundriss").innerHTML=generateEbkGrundriss(ebPieces);
});
function applyEbGehrung(piece,side){
 const zugabe=Number(einlaufblechSettings.gehrungszugabe)||0;
 const key=side==="links"?"gehrungLinks":"gehrungRechts";
 if(!piece[key]){
  piece[key]=true;
  piece.laenge=(Number(piece.laenge)||0)+zugabe;
  piece.winkel=90;
 }
}
$("eb_resultBody").addEventListener("change",e=>{
 const i=Number(e.target.dataset.ebGl??e.target.dataset.ebGr);
 if(Number.isNaN(i)||!ebPieces[i])return;
 const zugabe=Number(einlaufblechSettings.gehrungszugabe)||0;
 if(e.target.dataset.ebGl!==undefined){
  const war=ebPieces[i].gehrungLinks;
  ebPieces[i].gehrungLinks=e.target.checked;
  if(e.target.checked&&!war){
   ebPieces[i].laenge=(Number(ebPieces[i].laenge)||0)+zugabe;
   ebPieces[i].winkel=90;
   // Vorheriges Stück: gleiche physische Ecke, Gehrung rechts automatisch mitsetzen
   const prev=ebPieces[i-1];
   if(prev)applyEbGehrung(prev,"rechts");
  }
  else if(!e.target.checked&&war)ebPieces[i].laenge=Math.max(0,(Number(ebPieces[i].laenge)||0)-zugabe);
 }else if(e.target.dataset.ebGr!==undefined){
  const war=ebPieces[i].gehrungRechts;
  ebPieces[i].gehrungRechts=e.target.checked;
  if(e.target.checked&&!war){
   ebPieces[i].laenge=(Number(ebPieces[i].laenge)||0)+zugabe;
   ebPieces[i].winkel=90;
   // Folgestück: gleiche physische Ecke, Gehrung links automatisch mitsetzen
   const next=ebPieces[i+1];
   if(next)applyEbGehrung(next,"links");
  }
  else if(!e.target.checked&&war)ebPieces[i].laenge=Math.max(0,(Number(ebPieces[i].laenge)||0)-zugabe);
 }
 if(!ebPieces[i].gehrungLinks&&!ebPieces[i].gehrungRechts)ebPieces[i].winkel=0;
 renderEbPiecesTable();
});
$("eb_resultBody").addEventListener("click",e=>{
 const del=e.target.closest("[data-eb-del]");
 if(del){ebPieces.splice(Number(del.dataset.ebDel),1);renderEbPiecesTable();return}
 const flip=e.target.closest("[data-eb-flip]");
 if(flip){
  const i=Number(flip.dataset.ebFlip);
  if(!ebPieces[i])return;
  ebPieces[i].winkel=-(Number(ebPieces[i].winkel)||0);
  renderEbPiecesTable();
 }
});
$("eb_massA").addEventListener("input",renderEbPiecesTable);
$("eb_winkel").addEventListener("input",renderEbDiagram);
$("eb_montage").addEventListener("change",renderEbPiecesTable);
$("eb_abwicklung").addEventListener("change",renderEbPiecesTable);
