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
// v3.292: Eine Aufgabe auf "Heute" kennt nur wenige Spalten der Massaufnahme. Fuer die
// Ausfuehrungsansicht wird die VOLLE Zeile geladen (js/45 aufgabeAusfuehrungOeffnen) und
// hier abgelegt - rbFinde() findet sie dann wie jede andere. Keine zweite Datenquelle.
const rbExtern={};
function rbExternMerken(zeile){ if(zeile&&zeile.id!==undefined)rbExtern[String(zeile.id)]=zeile }

function rbFinde(id){
 const gleich=x=>x&&String(x.id)===String(id);
 if(rbExtern[String(id)])return rbExtern[String(id)];
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

// v3.292: Was ein Ruester oder Monteur ausser Skizze und Zuschnitt wissen muss: wo
// (Projekt/Baustelle), wo es steht (Status, wer ist zustaendig), Hinweise, Fotos.
// Alles aus bereits vorhandenen Feldern - es wird nichts erfunden: fehlt eine Angabe,
// steht die Zeile nicht da (ausser Zustaendigkeit: "niemand" ist dort eine Auskunft).
function rbInfoHtml(m){
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects.find(x=>x.id===m.project_id):null;
 const wo=p?[(typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||""),
   p.name&&p.object&&p.name!==p.object?p.name:"",p.order_no?"Auftrag "+p.order_no:""].filter(Boolean).join(" · "):"";
 const person=id=>id?((typeof mwPerson==="function")?mwPerson(id):"?"):"niemand";
 const status=(typeof mwStatusText==="function")?mwStatusText(m.workflow_status):String(m.workflow_status||"");
 const zeilen=[];
 if(wo)zeilen.push(["Projekt",wo]);
 zeilen.push(["Status",status]);
 zeilen.push(["Aufgenommen von",person(m.created_by)]);
 zeilen.push(["Rüster",person(m.ruester_id)]);
 zeilen.push(["Monteur",person(m.monteur_id)]);
 let h='<dl class="rb-info a2-daten a2-daten-kompakt">'+zeilen.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")+"</dl>";
 const hinweise=[];
 if(p&&p.hinweis&&String(p.hinweis).trim())hinweise.push(["📌 Hinweis zum Projekt",String(p.hinweis).trim()]);
 if(m.note&&String(m.note).trim())hinweise.push(["📝 Notiz zur Massaufnahme",String(m.note).trim()]);
 hinweise.forEach(([t,x])=>{h+=`<div class="a2-hinweis a2-h-merk"><b>${esc(t)}</b>${esc(x)}</div>`});
 if(m.freigabe_verfallen)h+='<div class="a2-hinweis a2-h-warnung"><b>Nach der Freigabe geändert</b>Die Freigabe ist verfallen – sie muss erneut erteilt werden, bevor daran weitergearbeitet wird.</div>';
 const alt=(typeof dfaVeraltetHinweis==="function")?dfaVeraltetHinweis(m):"";
 if(alt)h+=`<div class="a2-hinweis a2-h-warnung"><b>⚠️ Alter Zuschnitt</b>${esc(alt.replace(/^Alter Zuschnitt:\s*/,""))}</div>`;
 const med=(typeof measMedienPfade==="function")?measMedienPfade(m):{fotos:[],skizzen:[]};
 const kachel=(pfad,label)=>`<button type="button" class="medien-kachel" data-label="${esc(label)}" data-medien-gross>`
  +`<img data-signed-src="${esc(pfad)}" alt="${esc(label)}"><span class="medien-label">${esc(label)}</span></button>`;
 const bilder=[];
 med.fotos.forEach((f,i)=>bilder.push(kachel(f,med.fotos.length>1?"Foto "+(i+1):"Foto")));
 med.skizzen.forEach((s,i)=>bilder.push(kachel(s,med.skizzen.length>1?"Skizze "+(i+1):"Skizze")));
 if(bilder.length)h+=`<div class="rb-bilder"><div class="small" style="color:var(--muted)">Fotos und Skizzen der Aufnahme</div><div class="medien-galerie">${bilder.join("")}</div></div>`;
 return h;
}

// v3.293, Ansage des Anwenders: "Auf dem Rüstblatt müssen wirklich alle für die Produktion
// nötigen Masse vorhanden sein, es darf kein zusätzlicher Klick brauchen." Bis v3.292 zeigte
// das Blatt nur die Zeichnung (mit ihren eingetragenen Massen) und die Zuschnittliste - die
// Angaben (Abwicklung, Gesamtlänge, Winkel, Montage, Mass A ...), die Segmente, Stücke mit
// Gehrung, Bleilappen, Normlängen und Verschnitt standen nur im Formular und im PDF.
// Jetzt kommen sie aus DERSELBEN Quelle wie das PDF (measPdfAufbau, js/16) und werden
// nach denselben Kategorien (js/35) ausgewaehlt: Masse/Angaben, Zusammenfassung, Stueckliste
// und Normlaengen/Verschnitt. Nicht gezeigt, weil schon da oder nicht fuer die Produktion:
// Zeichnungen (rbSkizzenHtml), abhakbarer Zuschnitt (zuListeHtml), Ausmass, Material,
// Notiz/Kontrolle (Notiz steht in rbInfoHtml), Bilder. Es wird nichts gerechnet, nichts
// zweimal zusammengestellt - ein Fehler beim Aufbau laesst das Blatt wie bisher.
// v3.294, Ansage des Anwenders: "Jetzt steht mir zu viel dort, z. B. beim Dachfenster. Es reicht,
// wenn die Breite vorne und hinten sowie der Lattenabstand, die Gesamtzahl Bleilappen, die
// Eindeckart und das Material da steht und ob gefalzt oder nicht - die restlichen Infos stehen
// zum Teil doppelt da." Alles andere steht in der Zeichnung (M, H, G, I ...) bzw. in der
// Zuschnittliste. Fuer diese Arten gilt deshalb eine kurze Auswahl; jede andere Art behaelt
// den vollen Block. Die Zellen werden aus dem PDF-Aufbau gelesen (gleiche Beschriftung, gleicher
// Wert), nicht neu formuliert. Kamineinfassung: dieselbe Idee, zusaetzlich die Kaminlaenge -
// sie steht nicht in der Zeichnung (Annahme, bei Bedarf streichen).
const RB_ANGABEN={
 dachfenstereinfassung:/^(Deckungsmaterial|Material|Ausführung|Breite vorne \/ hinten|Lattenabstand)$/,
 kamineinfassung:/^(Deckungsmaterial|Material|Breite vorne \/ hinten|Kaminlänge längs Dach|Lattenabstand)$/
};
function rbKurzeAngabenHtml(m,teile){
 const wahl=RB_ANGABEN[m.type];
 const angaben=teile.find(t=>/^angaben$/i.test(t.titel));
 const zellen=[];
 if(angaben){
  const box=document.createElement("div"); box.innerHTML=angaben.html;
  box.querySelectorAll("td").forEach(td=>{
   const l=td.querySelector("label"), v=td.querySelector(".val");
   if(l&&v&&wahl.test(l.textContent.trim()))zellen.push([l.textContent.trim(),v.textContent.trim()]);
  });
 }
 const bl=m.data&&m.data.bleilappen&&Number(m.data.bleilappen.gesamt);
 if(bl>0)zellen.push(["Bleilappen gesamt",bl+" Stück"]);
 if(!zellen.length)return "";
 let h='<div class="eb-section-head">Angaben</div><table class="eb-info-table">';
 for(let i=0;i<zellen.length;i+=2){
  const z=c=>c?`<td><label>${esc(c[0])}</label><div class="val">${esc(c[1])}</div></td>`:"<td></td>";
  h+="<tr>"+z(zellen[i])+z(zellen[i+1])+"</tr>";
 }
 return h+"</table>";
}

// v3.296, Ansage des Anwenders: "Alle Angaben kürzen, so dass nirgends Masse doppelt stehen."
// Ein Wert gilt als doppelt, wenn JEDE Zahl darin (ab 10 oder mit Nachkommastelle - kleine
// Ganzzahlen wie Nummern und Stueckzahlen zaehlen nicht) schon im Text der Zeichnung oder der
// Zuschnittliste auf demselben Blatt steht. Dann bleibt er dort stehen und faellt hier weg:
// kein Mass geht verloren, es steht nur noch einmal da. Zellen/Zeilen ohne solche Zahl
// (Worte, Winkel unter 10, kleine Zahlen) bleiben immer.
function rbZahlen(t){
 return (String(t||"").match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>x.replace(",",".")).map(x=>String(parseFloat(x)));
}
function rbBekannteZahlen(html){
 const box=document.createElement("div"); box.innerHTML=html||"";
 const t=[...box.querySelectorAll("svg text")].map(x=>x.textContent).join(" ")+" "+box.textContent.replace(/(\d)[’']+(\d)/g,"$1$2");
 return new Set(rbZahlen(t.replace(/(\d)[’']+(\d)/g,"$1$2")));
}
function rbDoppelt(text,bekannt){
 const z=rbZahlen(String(text||"").replace(/(\d)[’']+(\d)/g,"$1$2")).filter(x=>parseFloat(x)>=10||x.includes("."));
 return z.length>0&&z.every(x=>bekannt.has(x));
}
function rbDoppeltesEntfernen(box,bekannt){
 box.querySelectorAll("table.eb-info-table").forEach(t=>{       // Angaben: Zelle fuer Zelle
  t.querySelectorAll("td").forEach(td=>{
   const v=td.querySelector(".val");
   if(td.querySelector("label")&&v&&rbDoppelt(v.textContent,bekannt)){ td.innerHTML="" }
  });
  t.querySelectorAll("tr").forEach(tr=>{
   if([...tr.children].every(c=>!c.textContent.trim()))tr.remove();
  });
 });
 box.querySelectorAll("table:not(.eb-info-table)").forEach(t=>{ // Listen: nur ganze Zeilen
  const zeilen=[...t.querySelectorAll("tbody tr")];
  zeilen.forEach(tr=>{
   const tds=[...tr.querySelectorAll("td")];
   const mitZahl=tds.filter(c=>rbZahlen(c.textContent).some(x=>parseFloat(x)>=10||x.includes(".")));
   if(mitZahl.length&&tds.every(c=>!c.textContent.trim()||rbDoppelt(c.textContent,bekannt)||!rbZahlen(c.textContent).some(x=>parseFloat(x)>=10||x.includes("."))))tr.remove();
  });
  if(zeilen.length&&!t.querySelector("tbody tr"))t.remove();
 });
}

function rbMasseHtml(m,bekanntHtml){
 if(typeof measPdfAufbau!=="function"||typeof pdfAbschnitteZerlegen!=="function")return "";
 let teile;
 try{
  const r=measPdfAufbau(m,{logoSrc:"",medienHtml:"",photoSrcs:[],sketchSrcs:[],ohneKopf:true});
  teile=pdfAbschnitteZerlegen(r.koerper,"eb-section-head").teile;
 }catch(e){ console.error("Rüstblatt Masse",e); return "" }
 if(RB_ANGABEN[m.type]){
  const k=rbKurzeAngabenHtml(m,teile);
  return k?`<div class="rb-masse">${k}</div>`:"";
 }
 const bekannt=bekanntHtml?rbBekannteZahlen(bekanntHtml):null;
 const gewollt=new Set(["masse","zusammenfassung","stueckliste","rollenblech"]);
 let h="";
 teile.forEach(t=>{
  if(!gewollt.has(t.key))return;
  if(/^zuschnitt aus rollenblech/i.test(t.titel))return;       // steht als abhakbare Liste darunter
  const box=document.createElement("div");
  box.innerHTML=t.html;
  box.querySelectorAll(".eb-diagram-title").forEach(x=>x.remove());
  box.querySelectorAll("svg").forEach(x=>x.remove());
  box.querySelectorAll(".eb-diagram,.eb-diagram-row,.pdf-bild").forEach(x=>{if(!x.textContent.trim()&&!x.querySelector("table,img"))x.remove()});
  if(bekannt)rbDoppeltesEntfernen(box,bekannt);
  const kopf=box.querySelector(".eb-section-head");
  const rest=(box.textContent||"").replace((kopf&&kopf.textContent)||"","").trim();
  if(!rest&&!box.querySelector("table"))return;             // war nur eine Zeichnung
  h+=box.innerHTML;
 });
 return h?`<div class="rb-masse">${h}</div>`:"";
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
 // v3.292: Ausfuehrungsansicht (Aufgabe "Zu rüsten"/"Zu montieren") - zuerst die Angaben
 // zur Baustelle, dann die Zeichnung; der Monteur braucht die Zuschnittliste nicht.
 if(o.ausfuehrung)h+=rbInfoHtml(m);
 const skizzen=rbSkizzenHtml(m);
 const liste=plan&&(typeof zuListeHtml==="function")?zuListeHtml(plan,{herkunft:true}):"";
 h+=skizzen;
 // v3.296: was Zeichnung oder Zuschnittliste schon zeigen, steht nicht noch einmal in den Angaben.
 h+=rbMasseHtml(m,skizzen+" "+(o.ausfuehrung==="montieren"?"":liste));   // der Monteur sieht die Zuschnittliste nicht
 if(o.ausfuehrung==="montieren")return h+"</div>";
 h+=plan
  ? liste
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
function rbGross(id,zurueck,opt){
 const m=rbFinde(id);
 if(!m)return false;
 const schirm=$("ruestblattModal"), koerper=$("ruestblattBody");
 if(!schirm||!koerper)return false;
 rbOffenId=m.id;
 rbProjektModus=null;
 rbProjektAuswahl=null;
 if($("ruestblattFormular"))$("ruestblattFormular").style.display="";
 rbZurueck=zurueck||"";
 const ausf=(opt&&opt.ausfuehrung)||"";
 rbZeichnen(m,ausf);
 schirm.hidden=false;
 window.scrollTo(0,0);
 // v3.332: Die gezeigte Zeile kann veraltet sein (Aufgaben-/Werkstatt-/Cockpit-Zwischenspeicher) - nach dem Oeffnen
 // frisch aus der Datenbank lesen und, wenn sich etwas geaendert hat (z. B. Rollen in der Massaufnahme), neu zeichnen.
 rbFrischLesen([m.id]).then(()=>{
  const neu=rbFinde(m.id);
  if(rbOffenId!==null&&String(rbOffenId)===String(m.id)&&neu&&$("ruestblattBody"))rbZeichnen(neu,ausf);
 });
 return true;
}
function rbZeichnen(m,ausf){
 const koerper=$("ruestblattBody");
 if(!koerper)return;
 koerper.innerHTML=rbBlattHtml(m,{kopf:true,ausfuehrung:ausf});
 rbAktionZeichnen(m,ausf);
 // Der Leerraum der festen viewBox wird erst NACH dem Einfuegen
 // weggeschnitten - vorher gibt getBBox nichts her (js/60).
 if(typeof rsZuschneiden==="function")rsZuschneiden(koerper);
 if(typeof medienThumbsAufloesen==="function")medienThumbsAufloesen(koerper);
}
// v3.332: Die aktuellen Zeilen der Massaufnahmen aus der Datenbank holen und IN die vorhandenen Objekte einarbeiten
// (Aufgaben-Zeile, Cockpit-, Werkstatt-Zwischenspeicher) - so sehen alle Ansichten denselben, frischen Stand. Ohne
// Verbindung oder bei einem Fehler bleibt der bisherige Stand (nichts bricht ab). Liest nur, schreibt nichts.
async function rbFrischLesen(ids){
 try{
  const liste=(ids||[]).filter(x=>x!==undefined&&x!==null);
  if(!liste.length||typeof sb==="undefined"||!sb||typeof sb.from!=="function")return null;
  const {data,error}=await sb.from("measurements").select("*").in("id",liste);
  if(error||!Array.isArray(data))return null;
  data.forEach(z=>{
   let da=false;
   const quellen=[
    (typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache:[],
    (typeof werkZeilen!=="undefined"&&Array.isArray(werkZeilen))?werkZeilen:[]
   ];
   // Leichte Listen ohne data (Werkstatt) werden nicht aufgebläht - dort liefert rbExtern die frische Zeile.
   quellen.forEach(q=>q.forEach(x=>{if(x&&String(x.id)===String(z.id)&&("data" in x)){Object.assign(x,z);da=true}}));
   if(rbExtern[String(z.id)]){Object.assign(rbExtern[String(z.id)],z);da=true}
   if(!da)rbExternMerken(z);
  });
  return data.map(z=>String(z.id));      // v3.335: welche Zeilen die Datenbank (unter RLS) wirklich geliefert hat
 }catch(e){ /* ohne Verbindung: der bisherige Stand bleibt */ return null }
}
// v3.292: Der Bestaetigen-Knopf der Ausfuehrungsansicht. Er traegt dieselbe Marke wie in
// der Werkstatt (data-aufgabe -> aufgabeAusfuehren, js/45): dieselbe Rueckfrage, derselbe
// serverseitige Aufruf. Hier wird nur entschieden, OB er da steht - dieselbe Regel wie
// die Datenbank (zugewiesene Person oder Administrator, passender Status).
function rbAktionZeichnen(m,ausf){
 const box=$("ruestblattAktion"); if(!box)return;
 box.innerHTML="";
 if(!ausf)return;
 const ich=(typeof currentProfile!=="undefined"&&currentProfile)?currentProfile.id:null;
 const admin=(typeof isAdmin==="function")&&isAdmin();
 const regeln={ruesten:{status:"zu_ruesten",wer:m.ruester_id,knopf:"✓ Rüsten bestätigen",rolle:"der eingeteilte Rüster"},
               montieren:{status:"zu_montieren",wer:m.monteur_id,knopf:"🏠 Montage bestätigen",rolle:"der eingeteilte Monteur"}};
 const r=regeln[ausf]; if(!r)return;
 if(m.workflow_status!==r.status){
  box.innerHTML='<div class="small" style="color:var(--muted)">Dieser Schritt steht nicht (mehr) an.</div>';
  return;
 }
 if(!(admin||(r.wer&&r.wer===ich))){
  const name=r.wer&&typeof profileName==="function"?profileName(r.wer):"";
  box.innerHTML=`<div class="small" style="color:var(--muted)">Bestätigen kann ${esc(name||r.rolle)}.</div>`;
  return;
 }
 box.innerHTML=`<button type="button" class="blue" data-aufgabe="${esc(ausf)}" data-aufgabe-id="${esc(m.id)}">${esc(r.knopf)}</button>`;
}

// v3.322: Das Ruestblatt als PDF drucken ("Als PDF speichern" im Druckdialog). Eine Kopie des gerade gezeigten Blatts
// kommt in einen Druckbereich; nur der wird gedruckt (gleiches Muster wie abwDrucken, js/78). Schreibt nichts.
function rbDrucken(){
 const m=rbOffenId===null?null:rbFinde(rbOffenId);
 if(!m){appAlert("Es ist kein Rüstblatt geöffnet.");return}
 rbDruckenAufnahmen([m]);
}
// v3.326: Druck im Aufbau und Aussehen der uebrigen Dokumente (PDF_LAYOUT_CSS, Kopf mit Logo, Abschnittsbalken, Fusszeile,
// Seitenzahl), Schrift im PDF-Mass. Gedruckt wird ein eigenes Dokument in einem unsichtbaren Rahmen (kein Popup, keine
// Bildschirm-Stile): je Massaufnahme eine Seite mit Zeichnung, allen Massen, Zuschnittliste (Abschnitt/Streifen/Stueck),
// Baustellenangaben. Auch die "Ruestliste" der Werkstatt (js/58) druckt darueber.
const RB_DRUCK_CSS=`
 .rb-druck-seite+.rb-druck-seite{break-before:page;page-break-before:always}
 .rb-blatt{margin:0}
 .rb-kopf{background:#17202a;color:#fff;padding:1.6mm 2.4mm;margin:4mm 0 2.5mm;display:flex;gap:4mm;align-items:baseline;flex-wrap:wrap}
 .rb-kopf b{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
 .rb-kopf .small{font-size:7pt;color:#d7dde1}
 .rb-info{display:grid;grid-template-columns:30mm 1fr;gap:.6mm 3mm;font-size:8pt;margin:0 0 2mm}
 .rb-info dt{font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b757c;align-self:center}
 .rb-info dd{margin:0;font-weight:700}
 .a2-hinweis{border:.5pt solid #b3bcc2;padding:1.5mm 2.4mm;margin:2mm 0;font-size:7.5pt}
 .a2-hinweis b{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.06em}
 .a2-h-warnung{border-color:#c0392b;color:#7a1f14}
 .werk-skizzen{display:flex;flex-wrap:wrap;gap:4mm;justify-content:center;margin:2mm 0 3mm}
 .werk-skizze{flex:1 1 70mm;max-width:105mm;margin:0;text-align:center;break-inside:avoid}
 .werk-skizze figcaption{font-size:6.2pt;text-transform:uppercase;letter-spacing:.1em;color:#6b757c}
 .werk-skizze svg{max-width:100%;height:auto;max-height:58mm}
 .werk-skizze-leer{font-size:7.5pt;color:#6b757c}
 .rb-masse{margin:3mm 0 0}
 .note,.small{font-size:7.5pt}
 .zu-liste{margin:4mm 0 0}
 .zu-liste-kopf{background:#17202a;color:#fff;font-size:6.9pt;font-weight:800;text-transform:uppercase;letter-spacing:.11em;padding:1.6mm 2.4mm}
 .zu-liste-fuss{font-size:7pt;color:#5b666e;padding:1mm 2.4mm}
 .zu-abschnitt{border:.5pt solid #b3bcc2;border-top:0;break-inside:avoid}
 .zu-abschnitt-kopf{background:#e9edf0;font-size:7.5pt;font-weight:800;padding:1mm 2.4mm}
 .zu-streifen-zeile,.zu-zeile{display:flex;flex-wrap:wrap;align-items:center;gap:1mm 5mm;padding:1.2mm 2.4mm;border-top:.5pt solid #cfd6db}
 .zu-liste>.zu-zeile{border:.5pt solid #b3bcc2;border-top:0}
 .zu-streifen-name{flex:1 1 100%;font-size:7pt;font-weight:700;color:#3d4850}
 .zu-streifen-stuecke,.zu-pos{display:flex;flex-wrap:wrap;gap:1mm 4mm;align-items:center}
 .zu-st{display:inline-flex;align-items:center;gap:1.5mm}
 .zu-nr{display:inline-block;border:.5pt solid #17202a;min-width:5mm;text-align:center;font-size:7.5pt;font-weight:700;padding:0 1.2mm;background:#fff;color:#17202a}
 .zu-st-mass,.zu-mass,.zu-anzahl{font-size:8pt;font-weight:700;white-space:nowrap}
 .zu-st-zusatz,.zu-zusatz{font-size:7pt;font-weight:600;color:#5b666e}
 .zu-bilder{margin:2mm 0;padding:1.2mm 2mm;border:.5pt solid #b3bcc2;break-inside:avoid}
 .zu-bilder-kopf{font-size:6.9pt;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1mm}
 .zu-bilder-legende{font-weight:400;text-transform:none;letter-spacing:0;color:#5b666e}
 .zu-bild{margin:1mm 0 2mm;break-inside:avoid}
 .zu-bild figcaption{font-size:7pt;font-weight:700}
 .zu-bild svg{display:block;width:100%;max-height:34mm;height:auto}
 .zu-nr.ze-ok{background:#17202a;color:#fff}
 .zu-nr.ze-ok::before{content:"✓ "}
 .ze-alle,.ze-stand,.medien-kachel,.rb-bilder,.ze-ein,.ze-aus-hinweis,.zu-abhak-hinweis{display:none !important}
`;
async function rbDokumentHtml(ms,opt){
 let logoSrc="";
 try{ logoSrc=(typeof storageSignedUrl==="function"&&typeof logoUrl!=="undefined")?await storageSignedUrl(logoUrl):(typeof logoUrl!=="undefined"?logoUrl:"") }catch(e){ logoSrc="" }
 const erste=ms[0];
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects.find(x=>String(x.id)===String(erste.project_id)):null;
 const alleGleich=ms.every(m=>m.project_id===erste.project_id);
 const kopf=(typeof pdfKopfHtml==="function")?pdfKopfHtml({
  datensatz:alleGleich?erste:{project_id:null},projekt:alleGleich?p:null,
  bezeichnung:ms.length===1?(erste.title||""):"",dokumenttyp:"Rüstblatt",
  unterart:(opt&&opt.gemeinsam)?"Projekt-Rüstblatt · "+ms.length+" Massaufnahmen":(ms.length===1?rbTitel(erste):ms.length+" Massaufnahmen"),
  datum:new Date().toISOString().slice(0,10),
  bearbeiter:(typeof currentProfile!=="undefined"&&currentProfile)?`${currentProfile.first_name} ${currentProfile.last_name}`:"",
  logoSrc
 }):"";
 // v3.335 Projekt-Rüstblatt: erste Seite = Kopf + gemeinsamer Rollenzuschnitt (Vorschau), danach je Massaufnahme ihr Rüstblatt.
 const gem=(opt&&opt.gemeinsam)?'<div class="rb-druck-seite">'+kopf+opt.gemeinsam+"</div>":"";
 const seiten=gem+ms.map((m,i)=>'<div class="rb-druck-seite">'+((i===0&&!gem)?kopf:"")+rbBlattHtml(m,{kopf:true,ausfuehrung:"ruesten"})+"</div>").join("");
 // v3.336: bereits abgehakte Stücke sind auch im Druck abgehakt (das Dokument ist statisch, die Haken kommen aus dem Speicher).
 const seitenMitHaken=typeof zeIstErledigt==="function"
  ?seiten.replace(/class="zu-nr zu-nr-hak" aria-pressed="false" data-ze-meas="([^"]*)" data-ze-nr="([^"]*)"/g,
    (t,mid,nr)=>zeIstErledigt(mid,nr)?t.replace('class="zu-nr zu-nr-hak"','class="zu-nr zu-nr-hak ze-ok"').replace('aria-pressed="false"','aria-pressed="true"'):t)
  :seiten;
 const foot=(typeof pdfFooterHtml==="function")?pdfFooterHtml(alleGleich?erste:null):"";
 return `<!doctype html><html><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>Rüstblatt</title><style>${typeof PDF_LAYOUT_CSS!=="undefined"?PDF_LAYOUT_CSS:""}${RB_DRUCK_CSS}</style></head><body>${seitenMitHaken}${foot}</body></html>`;
}
async function rbDruckenAufnahmen(liste,opt){
 let ms=(liste||[]).filter(Boolean);
 if(!ms.length){appAlert("Es gibt nichts zu drucken.");return}
 // v3.332: vor dem Druck frisch lesen - gedruckt wird der aktuelle Stand, nicht ein alter Zwischenspeicher.
 await rbFrischLesen(ms.map(m=>m.id));
 ms=ms.map(m=>rbFinde(m.id)||m);
 if(typeof zeLaden==="function"){try{await zeLaden(ms.map(m=>m.id),true)}catch(e){}}   // v3.336: Abhak-Stand frisch
 let html;
 try{ html=await rbDokumentHtml(ms,(opt&&typeof opt.gemeinsamFn==="function")?{gemeinsam:opt.gemeinsamFn(ms)}:undefined) }catch(err){ appAlert("Das Rüstblatt konnte nicht aufgebaut werden: "+((err&&err.message)||err));return }
 const alt=document.getElementById("rbDruckRahmen");if(alt)alt.remove();
 const fr=document.createElement("iframe");
 fr.id="rbDruckRahmen";fr.setAttribute("aria-hidden","true");
 fr.style.cssText="position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden";
 const weg=()=>{try{fr.remove()}catch(e){}};
 fr.onload=()=>{
  const w=fr.contentWindow;
  if(!w)return;
  // Zeichnung auf ihren Inhalt zuschneiden (js/60) - geht nur im gerenderten Dokument.
  try{ if(typeof rsZuschneiden==="function")rsZuschneiden(w.document.body) }catch(e){}
  // Alles auf eine Seite, wenn moeglich: zu hohe Seiten werden verkleinert (nicht unter 55 %), danach laeuft es notfalls auf die naechste Seite.
  try{
   const verfuegbar=Math.round((297-14-17-14)*96/25.4);
   w.document.querySelectorAll(".rb-druck-seite").forEach(sei=>{
    const h=sei.getBoundingClientRect().height;
    if(h>verfuegbar){ sei.style.zoom=String(Math.max(0.55,Math.floor(verfuegbar/h*97)/100)) }
   });
  }catch(e){}
  setTimeout(()=>{
   try{ w.focus(); w.addEventListener("afterprint",()=>setTimeout(weg,500)); w.print() }
   catch(e){ weg();appAlert("Das Drucken ist hier nicht möglich.") }
  },300);
  setTimeout(weg,10*60*1000);
 };
 fr.srcdoc=html;
 document.body.appendChild(fr);
}
// v3.335: Projekt-Rüstblatt (Vorschau) - die ausgewählten Massaufnahmen eines Projekts gemeinsam: oben der gemeinsame Rollenzuschnitt
// (js/49 pzuProjektRuestblattHtml), darunter je Massaufnahme ihr Einzel-Rüstblatt. Liest frisch (rbFrischLesen) und meldet Ids, die es
// nicht (mehr) gibt oder die nicht zum geöffneten Projekt gehören; diese werden ignoriert. Schreibt nichts.
let rbProjektModus=null;
let rbProjektAuswahl=null;   // {projId, alle:[Massaufnahmen], gewaehlt:Set<id>, hinweise:[]} - nur im Speicher, nichts wird gespeichert
// v3.336: Das Projekt-Rüstblatt sitzt in der Werkstatt (Knopf „Rüstliste“ am Projekt): dort werden die Massaufnahmen ausgewählt.
// Abgeschlossene (und archivierte) Massaufnahmen kommen nie vor. Liest frisch, meldet Ids, die es nicht (mehr) gibt oder die nicht zum
// Projekt gehören (werden ignoriert), und lädt die Abhak-Stände frisch, damit bereits abgehakte Stücke im Blatt abgehakt sind.
async function rbProjektOeffnen(liste,opt){
 const schirm=$("ruestblattModal"), koerper=$("ruestblattBody");
 if(!schirm||!koerper||typeof pzuProjektRuestblattHtml!=="function")return false;
 const projId=(opt&&opt.projectId!==undefined&&opt.projectId!==null)?opt.projectId:((typeof cockpitProjectId!=="undefined")?cockpitProjectId:null);
 let ms=(liste||[]).filter(Boolean);
 const ids=ms.map(m=>String(m.id));
 const gefunden=await rbFrischLesen(ms.map(m=>m.id));
 const hinweise=[];
 if(gefunden!==null){
  const fehlen=ids.filter(id=>gefunden.indexOf(id)<0);
  if(fehlen.length){hinweise.push(fehlen.length+" Massaufnahme"+(fehlen.length===1?"":"n")+" gibt es nicht mehr oder sie ist für dich nicht sichtbar – ignoriert.");ms=ms.filter(m=>fehlen.indexOf(String(m.id))<0)}
 }else hinweise.push("Ohne Verbindung: es wird der zuletzt geladene Stand gezeigt.");
 ms=ms.map(m=>rbFinde(m.id)||m);
 const fremd=ms.filter(m=>projId!==null&&projId!==0&&String(m.project_id)!==String(projId));
 if(fremd.length){hinweise.push(fremd.length+" Massaufnahme"+(fremd.length===1?"":"n")+" gehört nicht zu diesem Projekt – ignoriert.");ms=ms.filter(m=>fremd.indexOf(m)<0)}
 const zu=ms.filter(m=>!pzuRuestbar(m));
 if(zu.length){hinweise.push(zu.length+" abgeschlossene Massaufnahme"+(zu.length===1?"":"n")+" nicht aufgeführt.");ms=ms.filter(m=>pzuRuestbar(m))}
 ms=ms.filter(m=>pzuHatPlan(m));
 if(!ms.length){appAlert("Keine Massaufnahme dieses Projekts kann gerüstet werden."+(hinweise.length?"\n\n"+hinweise.join("\n"):""));return false}
 if(typeof zeLaden==="function"){try{await zeLaden(ms.map(m=>m.id),true)}catch(e){}}
 const alt=rbProjektAuswahl&&String(rbProjektAuswahl.projId)===String(projId)?rbProjektAuswahl.gewaehlt:null;
 const gewaehlt=new Set(ms.map(m=>String(m.id)).filter(id=>!alt||alt.has(id)));
 if(!gewaehlt.size)ms.forEach(m=>gewaehlt.add(String(m.id)));
 rbProjektAuswahl={projId,alle:ms,gewaehlt,hinweise,geaendert:false,rollen:null};
 rbOffenId=null;
 if($("ruestblattAktion"))$("ruestblattAktion").innerHTML="";
 if($("ruestblattFormular"))$("ruestblattFormular").style.display="none";
 rbProjektZeichnen();
 schirm.hidden=false;
 window.scrollTo(0,0);
 return true;
}
function rbProjektGewaehlt(){
 const a=rbProjektAuswahl;
 return a?a.alle.filter(m=>a.gewaehlt.has(String(m.id))):[];
}
function rbProjektZeichnen(opt){
 const koerper=$("ruestblattBody"), a=rbProjektAuswahl;
 if(!koerper||!a)return;
 const ms=rbProjektGewaehlt();
 rbProjektModus={liste:ms,rollen:a.rollen};
 // v3.337: Rollen für den gemeinsamen Zuschnitt separat wählbar. Ohne eigene Wahl (rollen=null) gilt je Massaufnahme ihre Wahl; angezeigt
 // wird dann die Vereinigung dieser Wahlen (leer = das ganze Lager).
 const lager=(typeof zuLagerbreiten==="function")?zuLagerbreiten():[];
 const eigen=new Set();
 ms.forEach(m=>{const r=(typeof pmatPlanRoh==="function")?pmatPlanRoh(m):null;((r&&r.auswahl)||[]).forEach(b=>eigen.add(Number(b)))});
 const an=b=>a.rollen?a.rollen.indexOf(b)>=0:(eigen.size?eigen.has(b):true);
 const rollenHtml=lager.length?`<div class="pzu-rollen" style="margin:6px 0">
  <div class="pmat-unter">Rollen für den gemeinsamen Zuschnitt <span class="small muted">· ${a.rollen?"eigene Wahl für dieses Blatt":"Wahl der einzelnen Massaufnahmen"}</span></div>
  <div class="small muted">Mehrere Rollen werden automatisch gemischt, wenn das Blech spart. Gilt nur für dieses Blatt.</div>
  ${lager.map(b=>`<label style="display:inline-block;margin-right:12px"><input type="checkbox" data-rbp-rolle="${b}" ${an(b)?"checked":""}> ${b} mm</label>`).join("")}
  ${a.rollen?'<button type="button" class="gray mz-klein" data-rbp-rollen-eigene="1">Wahl der Massaufnahmen verwenden</button>':""}
 </div>`:"";
 const auswahl=`<div class="pzu-auswahl">
  <div class="pmat-unter">Massaufnahmen für das Rüstblatt <span class="small muted">· ${ms.length} von ${a.alle.length} ausgewählt</span></div>
  <div class="small muted">Nur Auswahl für dieses Blatt – sie ändert keine Massaufnahme und keinen Zuschnitt und wird nicht gespeichert. Abgeschlossene Massaufnahmen sind nicht aufgeführt.</div>
  ${rollenHtml}
  <div class="bar" style="margin:6px 0">
   <button type="button" class="gray mz-klein" data-rbp-alle="1">Alle auswählen</button>
   <button type="button" class="gray mz-klein" data-rbp-keine="1">Auswahl aufheben</button>
   <button type="button" class="blue mz-klein" data-rbp-erstellen="1">📐 Rüstblatt erstellen/aktualisieren</button>
  </div>
  ${a.alle.map(m=>`<label class="pzu-auswahl-zeile" style="padding:4px 0">
    <input type="checkbox" data-rbp-auswahl="${esc(m.id)}" ${a.gewaehlt.has(String(m.id))?"checked":""}>
    <b>${esc(typeof pzuQuelle==="function"?pzuQuelle(m):rbTitel(m))}</b>
    <span class="small muted">· ${esc(pzuMatText(m))} · ${esc(pzuStandText(m))}</span>
   </label>`).join("")}
  ${a.geaendert?'<div class="small" style="color:var(--red)">Auswahl geändert – „Rüstblatt erstellen/aktualisieren“ tippen.</div>':""}
 </div>`;
 let ergebnis;
 if(!ms.length){ergebnis='<div class="small muted">Keine Massaufnahme ausgewählt.</div>'}
 else{
  const rb=pzuProjektRuestblattHtml(ms,{rollen:a.rollen});
  const einzel=ms.map(m=>`<details class="rb-einzel" style="margin:6px 0"><summary><b>${esc(rbTitel(m))}</b> <span class="small muted">${esc(pzuMatText(m))}</span></summary>${rbBlattHtml(m,{kopf:false,ausfuehrung:"ruesten"})}</details>`).join("");
  ergebnis=`<div id="rbpErgebnis"><div class="rb-kopf"><b>Projekt-Rüstblatt</b><span class="small">${ms.length} Massaufnahme${ms.length===1?"":"n"} · Vorschau – nichts wird gespeichert, reserviert oder gebucht</span></div>
${rb.html||'<div class="small muted">Kein gemeinsamer Rollenzuschnitt: keine der ausgewählten Massaufnahmen hat Rollenstücke.</div>'}
<h2 style="margin-top:12px">Einzelne Rüstblätter</h2>${einzel}</div>`;
 }
 koerper.innerHTML=auswahl+(a.hinweise||[]).map(h=>`<div class="small" style="color:var(--red)">${esc(h)}</div>`).join("")+ergebnis;
 koerper.querySelectorAll("details.rb-einzel").forEach(d=>d.addEventListener("toggle",()=>{
  if(!d.open)return;
  if(typeof rsZuschneiden==="function")rsZuschneiden(d);
  if(typeof medienThumbsAufloesen==="function")medienThumbsAufloesen(d);
 }));
 if(typeof zeMarkierungAuffrischen==="function")zeMarkierungAuffrischen(koerper);
 // Das Blatt steht unter der Auswahl: nach „erstellen/aktualisieren“ dorthin springen und die Aktualisierung bestätigen,
 // sonst sieht man auf dem Handy nichts passieren (die Auswahl ist lang).
 if(opt&&opt.springen){
  const z=koerper.querySelector("#rbpErgebnis");
  if(z){
   const t=new Date().toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
   const k=z.querySelector(".rb-kopf .small");
   if(k)k.textContent+=" · aktualisiert "+t;
   try{z.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){z.scrollIntoView()}
  }
 }
}
document.addEventListener("change",e=>{
 const rc=e.target.closest?e.target.closest("#ruestblattBody [data-rbp-rolle]"):null;
 if(rc&&rbProjektAuswahl){
  const a=rbProjektAuswahl;
  const alle=[...document.querySelectorAll("#ruestblattBody [data-rbp-rolle]")];
  const gew=alle.filter(c=>c.checked).map(c=>Number(c.dataset.rbpRolle));
  a.rollen=gew.length?gew:null;   // nie leer rechnen: keine Rolle gewählt = Wahl der Massaufnahmen
  a.geaendert=false;
  rbProjektZeichnen();
  return;
 }
 const cb=e.target.closest?e.target.closest("#ruestblattBody [data-rbp-auswahl]"):null;
 if(!cb||!rbProjektAuswahl)return;
 const id=String(cb.dataset.rbpAuswahl);
 rbProjektAuswahl.gewaehlt=new Set([...rbProjektAuswahl.gewaehlt].filter(x=>x!==id));
 if(cb.checked)rbProjektAuswahl.gewaehlt.add(id);
 rbProjektAuswahl.geaendert=true;
 // nur der Hinweis wird nachgezogen - das Blatt selbst bleibt bis „erstellen/aktualisieren“ stehen
 const koerper=$("ruestblattBody"), z=koerper&&koerper.querySelector(".pmat-unter .small");
 if(z)z.textContent="· "+rbProjektAuswahl.gewaehlt.size+" von "+rbProjektAuswahl.alle.length+" ausgewählt – „Rüstblatt erstellen/aktualisieren“ tippen";
});
function rbZu(){
 const schirm=$("ruestblattModal");
 if(schirm)schirm.hidden=true;
 rbOffenId=null;
 rbProjektModus=null;
 rbProjektAuswahl=null;
 if($("ruestblattFormular"))$("ruestblattFormular").style.display="";
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
 // v3.339: Im Projekt-Rüstblatt lässt sich abhaken (Nummer oder Schnittbild); der Plan rechnet erst bei „erstellen/aktualisieren“ neu,
 // damit das Blatt nicht unter dem Finger wegspringt - das steht dann dort.
 const hk=e.target.closest?e.target.closest("#ruestblattBody [data-ze-nr]"):null;
 if(hk&&rbProjektAuswahl&&!hk.closest("details.rb-einzel")&&!document.getElementById("rbpHakenHinweis")){
  const z=document.querySelector("#ruestblattBody .pzu-auswahl");
  if(z)z.insertAdjacentHTML("beforeend",'<div class="small" id="rbpHakenHinweis" style="color:var(--red)">Haken gesetzt – „Rüstblatt erstellen/aktualisieren“ tippen: abgehakte Stücke verlassen dann den gemeinsamen Plan.</div>');
 }
 const rbp=e.target.closest?e.target.closest("#ruestblattBody [data-rbp-alle],#ruestblattBody [data-rbp-keine],#ruestblattBody [data-rbp-erstellen],#ruestblattBody [data-rbp-rollen-eigene]"):null;
 if(rbp&&rbProjektAuswahl){
  const a=rbProjektAuswahl;
  if(rbp.hasAttribute("data-rbp-alle")){a.alle.forEach(m=>a.gewaehlt.add(String(m.id)));a.geaendert=true}
  else if(rbp.hasAttribute("data-rbp-keine")){a.gewaehlt.clear();a.geaendert=true}
  else if(rbp.hasAttribute("data-rbp-rollen-eigene")){a.rollen=null;a.geaendert=true}
  else a.geaendert=false;
  rbProjektZeichnen({springen:rbp.hasAttribute("data-rbp-erstellen")});
  return;
 }
 const bild=e.target.closest("#ruestblattBody [data-medien-gross]");
 if(bild){ if(typeof medienGrossOeffnen==="function")medienGrossOeffnen(bild); return }
 const gross=e.target.closest("[data-rb-gross]");
 if(gross){
  rbGross(gross.getAttribute("data-rb-gross"),gross.getAttribute("data-rb-zurueck")||"");
  return;
 }
 if(e.target.closest("#ruestblattDrucken")){
  if(rbProjektModus)rbDruckenAufnahmen(rbProjektModus.liste,{gemeinsamFn:ms=>pzuProjektRuestblattHtml(ms,{rollen:rbProjektModus.rollen}).html});
  else rbDrucken();
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
