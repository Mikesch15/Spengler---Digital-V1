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

function rbMasseHtml(m){
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
 h+=rbSkizzenHtml(m);
 h+=rbMasseHtml(m);
 if(o.ausfuehrung==="montieren")return h+"</div>";
 h+=plan
  ? ((typeof zuListeHtml==="function")?zuListeHtml(plan):"")
    // v3.295: werden mehrere Streifen/Stangen geschnitten, steht dabei, welches Stueck woraus kommt.
    +((typeof zuBelegungKurzHtml==="function")?zuBelegungKurzHtml(plan):"")
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
 rbZurueck=zurueck||"";
 const ausf=(opt&&opt.ausfuehrung)||"";
 koerper.innerHTML=rbBlattHtml(m,{kopf:true,ausfuehrung:ausf});
 rbAktionZeichnen(m,ausf);
 schirm.hidden=false;
 window.scrollTo(0,0);
 // Der Leerraum der festen viewBox wird erst NACH dem Einfuegen
 // weggeschnitten - vorher gibt getBBox nichts her (js/60).
 if(typeof rsZuschneiden==="function")rsZuschneiden(koerper);
 if(typeof medienThumbsAufloesen==="function")medienThumbsAufloesen(koerper);
 return true;
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
 const bild=e.target.closest("#ruestblattBody [data-medien-gross]");
 if(bild){ if(typeof medienGrossOeffnen==="function")medienGrossOeffnen(bild); return }
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
