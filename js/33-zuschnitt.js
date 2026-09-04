"use strict";
// ============================================================================
// Zuschnitt-Optimierung - EINE Darstellung für alle Massaufnahme-Arten
// ============================================================================
// Rinne Halbrund, Einlaufblech gerade, Einlaufblech konisch, Freies Profil und
// Mauerabdeckung zeigen ihren Zuschnitt seit v2.80 mit derselben Funktion und
// damit im selben Aufbau:
//
//   1  Einleitungssatz (was geschnitten wird)
//   2  Kennzahlen - immer zuerst die STREIFENBREITE, also das Mass, auf das
//      der Streifen geschnitten werden muss
//   3  Fehler und Hinweise
//   4  Tabelle je Rollenbreite bzw. je Normlänge, beste Zeile hervorgehoben
//   5  Belegung: welches Stück liegt in welchem Streifen bzw. in welcher Stange
//   6  Fusszeile: woher die Breiten/Längen kommen
//
// Die Rechnung selbst bleibt in den einzelnen Modulen - hier wird nur
// dargestellt. Es gibt weiterhin nur EINE Packrechnung (ebaPackeInStreifen in
// js/29) und EINE Normlängen-Rechnung (raNormPlan in js/28).
//
// Der Plan wird von jedem Modul in dieselbe Form gebracht:
//
//   {art:"rolle"|"stange", einheit:"Stück"|"Segment",
//    einleitung, zusatz, leer, quelle,
//    streifenbreiten:[mm],            // "rolle": auf dieses Mass schneiden
//    gruppen:[{breite,tafelLaenge,streifen:[{stuecke:[{nr,laenge}],rest}]}],
//    moeglich:[{breite,jeTafel,tafeln,flaeche,verschnitt,anteil}],
//    netto,                            // m² ("rolle")
//    stangen:[{laenge,stuecke:[{nr,laenge}],rest}], normen:[mm],
//    gesamt,summeStuecke,verschnitt,   // mm ("stange")
//    zuSchmal:[mm], zuLang:[{nr,laenge}], optimal}
// ============================================================================

const zuZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const zuMm=v=>Math.round(zuZahl(v)).toLocaleString("de-CH");
const zuMeter=v=>(zuZahl(v)/1000).toFixed(2).replace(".",",");
const zuQm=v=>zuZahl(v).toFixed(2).replace(".",",");

// Ein Zuschnittstueck wird ueberall gleich geschrieben: Laenge x Breite,
// z. B. "2'070 mm × 250 mm". Die Breite ist die Streifenbreite bzw. die
// Abwicklung - ohne bekannte Breite steht nur die Laenge, es wird keine
// erfunden.
function zuMasse(laenge,breite){
 const b=zuZahl(breite);
 return zuMm(laenge)+"\u00a0mm"+(b>0?" × "+zuMm(b)+"\u00a0mm":"");
}
function zuKennzahl(label,wert,klein){
 return `<div><label>${esc(label)}</label><div class="ra-wert${klein?" ra-wert-klein":""}">${wert}</div></div>`;
}
// Die Kennzahlen stehen in jeder Art an derselben Stelle und in derselben
// Reihenfolge. Die Streifenbreite kommt zuerst: sie ist das Mass, auf das der
// Streifen tatsächlich geschnitten werden muss.
function zuKennzahlenHtml(p){
 if(p.art==="stange"){
 const n=(p.normen||[]).slice().sort((a,b)=>b-a);
  return `<div class="grid zu-kennzahlen">
${zuKennzahl("Streifenbreite","entfällt",true)}
${zuKennzahl("Normlängen",n.length?esc(n.map(x=>zuMeter(x)+" m").join(" · ")):"–",n.length>2)}
${zuKennzahl("Stangen",(p.stangen||[]).length)}
${zuKennzahl("Zuschnitt netto",zuMm(p.summeStuecke)+" mm")}
</div>
<div class="small zu-hinweis">Eine Rinne wird als fertiges Profil in Normlängen
bezogen – es ist <b>kein Streifen von der Rolle</b> zu schneiden.</div>`;
 }
 const b=(p.streifenbreiten||[]).filter(x=>zuZahl(x)>0);
 const breiteText=b.length?b.map(x=>zuMm(x)+" mm").join(" · "):"–";
 const tafeln=(p.gruppen||[]).map(g=>zuZahl(g.tafelLaenge));
 const tafelText=tafeln.length?(Math.max.apply(null,tafeln)===Math.min.apply(null,tafeln)
   ?zuMm(tafeln[0])+" mm":zuMm(Math.min.apply(null,tafeln))+"–"+zuMm(Math.max.apply(null,tafeln))+" mm"):"–";
 const streifen=(p.gruppen||[]).reduce((s,g)=>s+(g.streifen||[]).length,0);
 return `<div class="grid zu-kennzahlen">
${zuKennzahl(b.length>1?"Streifenbreiten":"Streifenbreite",breiteText)}
${zuKennzahl("Tafellänge",tafelText)}
${zuKennzahl("Streifen",streifen)}
${zuKennzahl("Blech netto",zuQm(p.netto)+" m²")}
</div>
<div class="small zu-hinweis">Auf <b>${esc(breiteText)}</b> muss der Streifen
geschnitten werden – das ist die Abwicklung des Profils.</div>`;
}

function zuMeldungenHtml(p){
 let h="";
 const zuLang=p.zuLang||[];
 if(zuLang.length){
  const br=p.art==="stange"?p.breite:((p.streifenbreiten||[])[0]);
  const namen=zuLang.map(x=>(x&&x.nr!==undefined)
    ?p.einheit+" "+x.nr+" ("+zuMasse(x.laenge,br)+")":zuMasse(x,br)).join(", ");
  h+=`<div class="ra-fehler">Zu lang für eine ${p.art==="stange"?"Stange":"Tafel"}: ${esc(namen)}.
Diese ${p.einheit==="Segment"?"Segmente sind":"Stücke sind"} im Plan <b>nicht</b> enthalten.</div>`;
 }
 if((p.zuSchmal||[]).length)
  h+=`<div class="small zu-hinweis">Zu schmal für dieses Profil: ${esc(p.zuSchmal.map(x=>zuMm(x)+" mm").join(", "))}.</div>`;
 if(p.optimal===false)
  h+=`<div class="ra-warnung">Beste gefundene Verteilung – die Suche wurde abgebrochen,
sie ist nicht nachweislich die günstigste.</div>`;
 return h;
}

function zuPlanTabelleHtml(p){
 if(p.art==="stange"){
  const nach={};
  (p.stangen||[]).forEach(s=>{nach[s.laenge]=(nach[s.laenge]||0)+1});
  const zeilen=Object.keys(nach).map(Number).sort((a,b)=>b-a).map((l,i)=>{
   const anzahl=nach[l], gesamt=anzahl*l;
   return `<tr${i===0?' class="ra-dila-zeile"':""}><td>${esc(zuMeter(l))} m</td>
<td>${anzahl}</td><td>${esc(zuMm(gesamt))} mm</td></tr>`;
  }).join("");
  if(!zeilen)return "";
  const anteil=p.gesamt>0?(p.verschnitt/p.gesamt*100):0;
  return `<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Normlänge</th><th>Stangen</th><th>Gesamtlänge</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="ra-ok">Am wenigsten Material: <b>${esc(zuMm(p.gesamt))} mm</b> Normlänge für
${esc(zuMm(p.summeStuecke))} mm Zuschnitt – <b>${esc(zuMm(p.verschnitt))} mm</b> Verschnitt
(${anteil.toFixed(0)} %).</div>`;
 }
 if(!(p.moeglich||[]).length){
  const b=(p.streifenbreiten||[]).filter(x=>zuZahl(x)>0);
  return `<div class="ra-warnung">Keine hinterlegte Rollenbreite ist so breit wie
${b.length>1?"die breiteste Abwicklung":"die Abwicklung"} (${esc(b.length?zuMm(Math.max.apply(null,b)):"–")} mm).</div>`;
 }
 const zeilen=p.moeglich.map((x,i)=>`<tr${i===0?' class="ra-dila-zeile"':""}>
<td>${esc(zuMm(x.breite))} mm</td>
<td>${x.jeTafel===undefined?"–":esc(x.jeTafel)}</td>
<td>${esc(x.tafeln)}</td>
<td>${esc(zuQm(x.flaeche))} m²</td>
<td><b>${esc(zuQm(x.verschnitt))} m²</b></td>
<td>${esc(zuZahl(x.anteil).toFixed(0))} %</td></tr>`).join("");
 const b0=p.moeglich[0];
 return `<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Rolle</th><th>Str./Tafel</th><th>Tafeln</th><th>Fläche</th><th>Verschnitt</th><th>Anteil</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="ra-ok">Am wenigsten Material: <b>${esc(zuMm(b0.breite))} mm</b> –
${esc(b0.tafeln)} Tafel(n), ${esc(zuQm(b0.flaeche))} m² Blech,
<b>${esc(zuQm(b0.verschnitt))} m²</b> Verschnitt (${esc(zuZahl(b0.anteil).toFixed(0))} %).</div>`;
}

// Belegung: welches Stueck liegt in welchem Streifen bzw. in welcher Stange.
// In jeder Art dieselben vier Spalten.
function zuBelegungHtml(p){
 const zeilenAus=(liste,laenge,breite)=>liste.map((s,i)=>`<tr><td>${i+1}</td>
<td>${esc((s.stuecke||[]).map(x=>p.einheit+" "+x.nr+" · "+zuMasse(x.laenge,breite)).join(" + "))||"–"}</td>
<td>${esc(zuMm(zuZahl(laenge!==undefined?laenge:s.laenge)-zuZahl(s.rest)))} mm</td>
<td>${esc(zuMm(s.rest))} mm</td></tr>`).join("");
 const kopf=`<thead><tr><th>${p.art==="stange"?"Stange":"Streifen"}</th>
<th>${p.einheit==="Segment"?"Segmente":"Stücke"} · Zuschnitt (Länge × Breite)</th><th>belegt</th><th>Rest</th></tr></thead>`;
 if(p.art==="stange"){
  if(!(p.stangen||[]).length)return "";
  return `<h2 style="margin-top:14px">So liegen die ${p.einheit==="Segment"?"Segmente":"Stücke"} in den Stangen</h2>
<div class="scroll"><table class="eb-table ra-tab">${kopf}
<tbody>${(p.stangen||[]).map((s,i)=>`<tr><td>${i+1}</td>
<td>${esc((s.stuecke||[]).map(x=>p.einheit+" "+x.nr+" · "+zuMasse(x.laenge,p.breite)).join(" + "))||"–"}</td>
<td>${esc(zuMm(zuZahl(s.laenge)-zuZahl(s.rest)))} mm</td>
<td>${esc(zuMm(s.rest))} mm</td></tr>`).join("")}</tbody></table></div>`;
 }
 const gruppen=p.gruppen||[];
 if(!gruppen.length)return "";
 const eine=gruppen.length===1;
 return `<h2 style="margin-top:14px">So liegen die ${p.einheit==="Segment"?"Segmente":"Stücke"} in den Streifen</h2>`
  +gruppen.map(g=>`${eine?"":`<div class="small zu-gruppe"><b>Streifenbreite ${esc(zuMm(g.breite))} mm</b>
· Tafellänge ${esc(zuMm(g.tafelLaenge))} mm</div>`}
<div class="scroll"><table class="eb-table ra-tab">${kopf}
<tbody>${zeilenAus(g.streifen||[],g.tafelLaenge,g.breite)||'<tr><td colspan="4" class="small">–</td></tr>'}</tbody>
</table></div>`).join("");
}

// Die eine Darstellung. Jede Art ruft genau diese Funktion auf.
function zuschnittHtml(p){
 if(!p)return "";
 const leer=p.art==="stange"?!(p.stangen||[]).length&&!(p.zuLang||[]).length
                            :!(p.gruppen||[]).length;
 if(leer)return `<div class="info">${esc(p.leer||"Noch nichts zuzuschneiden.")}</div>`
   +zuMeldungenHtml(p);
 return `<div class="info">${p.einleitung||""}${p.zusatz?" "+p.zusatz:""}</div>
${zuKennzahlenHtml(p)}
${zuMeldungenHtml(p)}
${zuPlanTabelleHtml(p)}
${zuBelegungHtml(p)}
${p.quelle?`<div class="small zu-hinweis">${p.quelle}</div>`:""}`;
}

// Einleitungssatz, damit er nirgends abweicht.
const ZU_EINLEITUNG_ROLLE="Von der Rolle wird eine <b>Tafel</b> abgeschnitten und quer in "
 +"<b>Streifen der Abwicklungsbreite</b> geteilt. Die Tafel ist so lang wie das längste Stück; "
 +"in einem Streifen dürfen mehrere Stücke hintereinander liegen.";
const ZU_EINLEITUNG_STANGE="Aus welchen Normlängen die Stücke geschnitten werden, so dass "
 +"möglichst wenig übrig bleibt. Mehrere Stücke dürfen aus derselben Stange kommen.";
const ZU_QUELLE_ROLLE="Rollenbreiten aus <b>Einstellungen → Massaufnahmen → Einlaufblech gerade</b> "
 +"(firmenweit, gilt für alle Arten).";
const ZU_QUELLE_STANGE="Normlängen aus <b>Einstellungen → Massaufnahmen → Rinne</b>.";
