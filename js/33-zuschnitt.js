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
// ---------------------------------------------------------------------------
// Zuschnittliste: STÜCKZAHL × LÄNGE × ABWICKLUNG
// ---------------------------------------------------------------------------
// Die Hauptdarstellung in jeder Art. Gleiche Zuschnitte werden zusammengefasst
// und mit ihrer Stückzahl gezeigt - drei identische Einzelzeilen sind auf dem
// Handy unleserlich.
//
// Zusammengefasst wird NUR, was für den tatsächlichen Zuschnitt wirklich
// gleich ist: gleiche Länge, gleiche Abwicklung UND gleiches "merkmal". Das
// merkmal liefert das Modul selbst (Gehrung, konische Masse, …) - eine
// fachlich unterschiedliche Bearbeitung darf nie in einer Zeile verschwinden.
// Reine Beschriftungen ohne Einfluss auf den Zuschnitt (z. B. "Traufstück")
// stehen als "hinweis" in den Einzelheiten, nicht im Gruppenschlüssel.
function zuAlleStuecke(p){
 const liste=[];
 if(!p)return liste;
 if(p.art==="stange"){
  (p.stangen||[]).forEach((s,si)=>(s.stuecke||[]).forEach(x=>
   liste.push(Object.assign({},x,{breite:p.breite,platz:si+1}))));
 }else{
  (p.gruppen||[]).forEach(g=>(g.streifen||[]).forEach((s,si)=>(s.stuecke||[]).forEach(x=>
   liste.push(Object.assign({},x,{breite:g.breite,platz:si+1})))));
 }
 return liste;
}
function zuGruppen(p){
 const nach=new Map();
 zuAlleStuecke(p).forEach(x=>{
  const l=Math.round(zuZahl(x.laenge)), b=Math.round(zuZahl(x.breite));
  const schluessel=l+"|"+b+"|"+(x.merkmal||"");
  if(!nach.has(schluessel))nach.set(schluessel,{laenge:l,breite:b,merkmal:x.merkmal||"",stuecke:[]});
  nach.get(schluessel).stuecke.push(x);
 });
 // Längste zuerst - so steht der grösste Zuschnitt oben, wie auf dem Zettel.
 return Array.from(nach.values()).sort((a,b)=>b.laenge-a.laenge||b.breite-a.breite);
}
// Ein Eintrag der Liste: "3 × 1'850 × 250 mm".
function zuGruppenZeileHtml(g,einheit){
 const nummern=g.stuecke.map(x=>x.nr).filter(x=>x!==undefined&&x!==null);
 const hinweise=[];
 g.stuecke.forEach(x=>{if(x.hinweis&&hinweise.indexOf(x.hinweis)<0)hinweise.push(x.hinweis)});
 const unten=[];
 if(g.merkmal)unten.push(esc(g.merkmal));
 if(hinweise.length)unten.push(esc(hinweise.join(" · ")));
 if(nummern.length)unten.push(esc((einheit||"Stück")+" "+nummern.join(", ")));
 return `<div class="zu-zeile">
<span class="zu-anzahl">${g.stuecke.length} ×</span>
<span class="zu-mass">${esc(zuMm(g.laenge))}${g.breite>0?" × "+esc(zuMm(g.breite)):""}<span class="zu-einheit"> mm</span></span>
${unten.length?`<span class="zu-zusatz">${unten.join(" · ")}</span>`:""}
</div>`;
}
// Die Liste selbst - Kopf (welche Rolle), Zeilen, Fuss (wie viele Tafeln).
function zuListeHtml(p){
 const gruppen=zuGruppen(p);
 if(!gruppen.length)return "";
 const bestes=(p.moeglich||[])[0];
 let kopf="Zuschnittliste", fuss="";
 if(p.art==="rolle"&&bestes){
  kopf="Rollenblech "+zuMm(bestes.breite)+" mm";
  const tl=(p.gruppen||[])[0];
  fuss=bestes.tafeln+" Tafel"+(bestes.tafeln===1?"":"n")
    +(tl&&zuZahl(tl.tafelLaenge)>0?" à "+zuMm(tl.tafelLaenge)+" mm":"");
 }else if(p.art==="stange"){
  kopf="Zuschnittliste";
  fuss=(p.stangen||[]).length+" Stange"+((p.stangen||[]).length===1?"":"n");
 }
 return `<div class="zu-liste">
<div class="zu-liste-kopf">${esc(kopf)}</div>
${gruppen.map(g=>zuGruppenZeileHtml(g,p.einheit)).join("")}
${fuss?`<div class="zu-liste-fuss">${esc(fuss)}</div>`:""}
</div>`;
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
 if(p.art==="rolle"&&!(p.moeglich||[]).length){
  const b=(p.streifenbreiten||[]).filter(x=>zuZahl(x)>0);
  h+=`<div class="ra-warnung">Keine hinterlegte Rollenbreite ist so breit wie
${b.length>1?"die breiteste Abwicklung":"die Abwicklung"} (${esc(b.length?zuMm(Math.max.apply(null,b)):"–")} mm).
Der Zuschnitt lässt sich so <b>nicht</b> aus dem hinterlegten Rollenblech schneiden.</div>`;
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
 if(!(p.moeglich||[]).length)return "";   // Meldung steht in zuMeldungenHtml
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
 // Hauptansicht: die Liste. Alles Technische steht darunter aufklappbar -
 // auf dem Handy zaehlt zuerst, WAS zugeschnitten wird.
 return `${zuListeHtml(p)}
${zuMeldungenHtml(p)}
<details class="zu-details"><summary>Einzelheiten: Rollenbreiten vergleichen, Belegung der Streifen</summary>
<div class="info">${p.einleitung||""}${p.zusatz?" "+p.zusatz:""}</div>
${zuKennzahlenHtml(p)}
${zuPlanTabelleHtml(p)}
${zuBelegungHtml(p)}
${p.quelle?`<div class="small zu-hinweis">${p.quelle}</div>`:""}
</details>`;
}

// Einleitungssatz, damit er nirgends abweicht.
const ZU_EINLEITUNG_ROLLE="Von der Rolle wird eine <b>Tafel</b> abgeschnitten und quer in "
 +"<b>Streifen der Abwicklungsbreite</b> geteilt. Die Tafel ist so lang wie das längste Stück; "
 +"in einem Streifen dürfen mehrere Stücke hintereinander liegen.";
const ZU_EINLEITUNG_STANGE="Aus welchen Normlängen die Stücke geschnitten werden, so dass "
 +"möglichst wenig übrig bleibt. Mehrere Stücke dürfen aus derselben Stange kommen.";
const ZU_QUELLE_ROLLE="Blechlager aus <b>Einstellungen → Allgemein → Rollenbreiten des "
 +"Blechlagers</b> (firmenweit, gilt für alle Arten).";
const ZU_QUELLE_STANGE="Normlängen aus <b>Einstellungen → Massaufnahmen → Rinne</b>.";

// ---------------------------------------------------------------------------
// Dieselbe Zuschnittliste im Ausdruck
// ---------------------------------------------------------------------------
// Das PDF zeigt denselben Aufbau wie der Bildschirm: zuerst die Liste
// STÜCKZAHL × LÄNGE × ABWICKLUNG, danach die technischen Einzelheiten
// (Rollenbreiten-Vergleich, Belegung der Streifen).
//
// Gerechnet wird NICHTS - gedruckt wird ausschliesslich der beim Speichern
// abgelegte Plan, damit ein einmal gedrucktes Blatt gleich bleibt, auch wenn
// die Rollenbreiten der Firma später geändert werden.
//
// Die Module haben ihren Plan historisch in zwei Formen abgelegt:
//   flach    {tafelLaenge, streifen:[…]}            bzw. {verteilung:{streifen}}
//   gruppiert{gruppen:[{breite,tafelLaenge,streifen}]}   (Freies Profil)
// zuPlanAusGespeichert() bringt beide in die eine Planform von oben.
function zuPlanAusGespeichert(r,breite,einheit){
 if(!r)return null;
 let gruppen=[];
 if(Array.isArray(r.gruppen)&&r.gruppen.length)gruppen=r.gruppen;
 else{
  const st=Array.isArray(r.streifen)?r.streifen
          :((r.verteilung&&r.verteilung.streifen)||[]);
  const b=zuZahl(breite)||zuZahl(r.abwicklung);
  if(st.length)gruppen=[{breite:b,tafelLaenge:r.tafelLaenge,streifen:st}];
 }
 const optimal=r.optimal===false?false
   :((r.verteilung&&r.verteilung.optimal===false)?false:true);
 return {art:"rolle",einheit:einheit||"Stück",
  streifenbreiten:gruppen.map(g=>zuZahl(g.breite)).filter(x=>x>0),
  gruppen,moeglich:r.moeglich||[],netto:r.netto,
  tafelLaenge:r.tafelLaenge,optimal};
}
function zuDruckHtml(r,breite,einheit,zusatz){
 const p=zuPlanAusGespeichert(r,breite,einheit);
 if(!p||!p.gruppen.length)return "";
 const gruppen=zuGruppen(p);
 if(!gruppen.length)return "";
 const eh=p.einheit;
 const zeilen=gruppen.map(g=>{
  const nummern=g.stuecke.map(x=>x.nr).filter(x=>x!==undefined&&x!==null);
  const hinweise=[];
  g.stuecke.forEach(x=>{if(x.hinweis&&hinweise.indexOf(x.hinweis)<0)hinweise.push(x.hinweis)});
  const bem=[];
  if(g.merkmal)bem.push(g.merkmal);
  if(hinweise.length)bem.push(hinweise.join(" · "));
  if(nummern.length)bem.push(eh+" "+nummern.join(", "));
  return `<tr><td><b>${g.stuecke.length} ×</b></td>
<td><b>${esc(zuMm(g.laenge))}${g.breite>0?" × "+esc(zuMm(g.breite)):""} mm</b></td>
<td>${esc(bem.join(" · "))||"–"}</td></tr>`;
 }).join("");
 const b0=(p.moeglich||[])[0];
 const tafelLaenge=zuZahl(p.tafelLaenge)||zuZahl((p.gruppen[0]||{}).tafelLaenge);
 const kopf=b0?"Rollenblech "+zuMm(b0.breite)+" mm · "+b0.tafeln+" Tafel"+(b0.tafeln===1?"":"n")
   +(tafelLaenge>0?" à "+zuMm(tafelLaenge)+" mm":""):"";
 const vergleich=(p.moeglich||[]).length?`<table class="eb-cutlist">
<thead><tr><th>Rollenbreite</th><th>Streifen je Tafel</th><th>Tafeln</th><th>Tafelfläche (m²)</th><th>Verschnitt (m²)</th></tr></thead>
<tbody>${p.moeglich.map((x,i)=>`<tr><td>${esc(zuMm(x.breite))} mm${i===0?" (beste)":""}</td>
<td>${x.jeTafel===undefined?"–":esc(x.jeTafel)}</td><td>${esc(x.tafeln)}</td>
<td>${esc(zuQm(x.flaeche))}</td><td>${esc(zuQm(x.verschnitt))}</td></tr>`).join("")}</tbody>
</table>`:"";
 const belegung=p.gruppen.map(g=>{
  const st=(g.streifen||[]);
  if(!st.length)return "";
  const tl=zuZahl(g.tafelLaenge)||tafelLaenge;
  return `<table class="eb-cutlist">
<thead><tr><th>Streifen à ${esc(zuMm(g.breite))} mm</th><th>${eh==="Segment"?"Segmente":"Stücke"}</th><th>belegt (mm)</th><th>Rest (mm)</th></tr></thead>
<tbody>${st.map((sf,i)=>`<tr><td>${i+1}</td>
<td>${esc((sf.stuecke||[]).map(x=>eh+" "+x.nr+" · "+zuMm(x.laenge)+" mm").join(" + "))||"–"}</td>
<td>${esc(zuMm(tl-zuZahl(sf.rest)))}</td><td>${esc(zuMm(sf.rest))}</td></tr>`).join("")}</tbody>
</table>`;
 }).join("");
 return `<div class="eb-section-head">Zuschnitt aus Rollenblech</div>
<table class="eb-cutlist">
<thead><tr><th>Anzahl</th><th>Zuschnitt L × B (mm)</th><th>Bemerkung</th></tr></thead>
<tbody>${zeilen}</tbody>
</table>
<div class="note">${kopf?esc(kopf)+". ":""}Von der Rolle wird eine Tafel abgeschnitten und quer in
Streifen der Abwicklungsbreite geteilt; in einem Streifen dürfen mehrere Stücke
hintereinander liegen.${zusatz?" "+zusatz:""}${p.optimal===false
  ?" Beste gefundene Verteilung – nicht nachweislich die günstigste.":""}</div>
${vergleich}${belegung}`;
}


// ---------------------------------------------------------------------------
// Welche Rollen sollen fuer DIESE Massaufnahme verwendet werden?
// ---------------------------------------------------------------------------
// Das Blechlager der Firma steht in den Einstellungen (Allgemein). Hier wird
// je Massaufnahme davon eine Teilmenge angehakt - z. B. weil auf dieser
// Baustelle nur die 1000er Rolle mitkommt.
//
// Leere Auswahl = alle Rollen des Lagers. So aendert sich fuer eine bestehende
// Aufnahme nichts, solange niemand etwas abwaehlt.
function zuLagerbreiten(){
 return (typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[];
}
function zuRollenGefiltert(gewaehlt){
 const lager=zuLagerbreiten();
 const w=(Array.isArray(gewaehlt)?gewaehlt:[]).map(Number).filter(x=>x>0);
 if(!w.length)return lager;
 const genommen=lager.filter(x=>w.indexOf(x)>=0);
 return genommen.length?genommen:lager;   // nie leer rechnen
}
// Der aufklappbare Kasten. "attribut" ist der data-Name, den das Modul in
// seinem Klick-Handler auswertet (z. B. "data-eba-rolle").
// Merkt sich, ob der Kasten offen war. Nach jedem Haken zeichnet das Modul
// neu - ohne das wuerde der Kasten dabei jedes Mal zuklappen.
let zuRollenAuf=false, zuRollenFuer="";
function zuRollenAuswahlHtml(gewaehlt,attribut){
 if(attribut!==zuRollenFuer){zuRollenFuer=attribut;zuRollenAuf=false}
 const lager=zuLagerbreiten();
 if(!lager.length)return `<div class="ra-warnung">Im Blechlager ist keine Rollenbreite
hinterlegt – Einstellungen → Allgemein → Rollenbreiten des Blechlagers.</div>`;
 const genommen=zuRollenGefiltert(gewaehlt);
 const alle=genommen.length===lager.length;
 return `<details class="zu-rollen"${zuRollenAuf?" open":""}><summary>Rollen für diese Massaufnahme:
<b>${esc(genommen.map(x=>zuMm(x)+" mm").join(" · "))}</b>${alle?" (alle aus dem Lager)":""}</summary>
<div class="small">Aus dem Blechlager der Firma. Ohne Haken wird das ganze Lager
gerechnet – abgewählte Rollen kommen im Vergleich nicht mehr vor.</div>
<div class="zu-rollen-liste">${lager.map(x=>`<label class="zu-rolle">
<input type="checkbox" ${attribut}="${x}"${genommen.indexOf(x)>=0?" checked":""}>
<span>${esc(zuMm(x))} mm</span></label>`).join("")}</div>
</details>`;
}

// Der Klick auf ein Kaestchen im Auswahlkasten. Das Modul ruft das in seinem
// bestehenden change-Handler mit einer Zeile auf.
// Rueckgabe: die neue Auswahl, oder null wenn das Ereignis nicht dazu gehoert.
function zuRollenKlick(target,attribut){
 if(!target||!target.hasAttribute||!target.hasAttribute(attribut))return null;
 const wurzel=target.closest(".zu-rollen")||document;
 const an=Array.from(wurzel.querySelectorAll("["+attribut+"]"))
   .filter(e=>e.checked).map(e=>Number(e.getAttribute(attribut)))
   .filter(x=>Number.isFinite(x)&&x>0);
 zuRollenAuf=true;          // nach dem Neuzeichnen offen bleiben
 // Gar nichts angehakt = wieder das ganze Lager. So bleibt der Zuschnitt
 // rechenbar, statt in eine leere Liste zu laufen.
 return an;
}
