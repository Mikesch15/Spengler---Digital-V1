"use strict";
// ---- Änderungsverlauf (Verlauf) --------------------------------
// Liest ausschliesslich aus audit_log (siehe CLAUDE.md Abschnitt 38/40).
// Eine einzige wiederverwendbare Komponente für Projekt/Massaufnahme/
// Ausmass/Report - Aufrufstellen in js/09-projekte.js, js/10-
// massaufnahme.js, js/17-ausmass.js, js/08-katalog-blitzschutz.js,
// keine vierfach kopierte Logik. Rein lesend: kein INSERT/UPDATE/DELETE
// von hier aus, RLS filtert automatisch auf die eigene Firma - siehe
// CLAUDE.md Abschnitt 38.4/39/40.
//
// Seit v2.32 (Abschnitt 40) trägt jede Zeile zusätzlich project_id
// (serverseitig ermittelt, siehe write_audit_log()). Der Projekt-
// Verlauf nutzt das für EINE Abfrage, die Projekt+Massaufnahme+Ausmass+
// Report gemeinsam zeigt; die bestehenden direkten Einzel-Verläufe
// (entity_type+entity_id) bleiben davon unberührt und unverändert.

const VERLAUF_ACTION_LABELS={created:"Erstellt",updated:"Geändert",deleted:"Gelöscht",status_changed:"Status geändert",
 // v2.36: eigene Aktionen für eindeutige Foto-/Skizzen-Ereignisse (siehe
 // CLAUDE.md Abschnitt 44) - serverseitig aus der tatsächlichen
 // Spaltenänderung abgeleitet, nie vom Client gesetzt.
 photo_added:"Foto hinzugefügt",photo_deleted:"Foto gelöscht",
 sketch_added:"Skizze hinzugefügt",sketch_deleted:"Skizze gelöscht"};
// Aktionen, die der Filter "Foto/Skizze" zusammenfasst.
const VERLAUF_BILD_ACTIONS=["photo_added","photo_deleted","sketch_added","sketch_deleted"];
const VERLAUF_ENTITY_LABELS={project:"Projekt",measurement:"Massaufnahme",ausmass:"Ausmass",report:"Regierapport",
 // v3.09: dieselbe Historie, nur drei weitere Arten - kein zweites Protokoll.
 reservierung:"Reservierung",reststueck:"Reststück",vorlage:"Vorlage",
 // v3.15: ein abgehaktes Zuschnittstueck.
 zuschnitt:"Zuschnitt",
 // v3.36: Ausfuehrungsstand je Position (Geplant -> Ausgefuehrt).
 ausfuehrung:"Ausführung"};
// v2.35: dieselben Symbole, die bereits in den jeweiligen Hauptbereichen
// verwendet werden (index.html: "📁 Projekte", "📐 Massaufnahme",
// "📏 Ausmass", "📋 Regierapport") - keine neue Symbolsprache, dezente
// Kennzeichnung der Entität statt Farbcodierung (Auftrag Abschnitt 9).
const VERLAUF_ENTITY_ICONS={project:"📁",measurement:"📐",ausmass:"📏",report:"📋",
 reservierung:"📦",reststueck:"♻️",vorlage:"📄",zuschnitt:"✂️",ausfuehrung:"📋"};

// v2.33: Feld-Diffing. Bewusst nur dasselbe kleine, zuverlässige Feld-Set,
// das write_audit_log() serverseitig vergleicht (siehe CLAUDE.md
// Abschnitt 41) - reine Anzeige-/Übersetzungslogik, keine eigene
// Diff-Berechnung im Frontend (der Diff selbst kommt immer aus der DB).
const VERLAUF_FIELD_LABELS={
 // v2.46: status = Geschaeftsstatus (offen/in_arbeit/…), archived = das
 // davon getrennte Archiv. Beide erscheinen als action "status_changed".
 project:{name:"Projektname",order_no:"Auftrags-Nr.",customer:"Auftraggeber",object:"Adresse",
          status:"Status",archived:"Archiv"},
 // v3.09 Reservierung und Reststueck.
 reservierung:{status:"Status",menge:"Menge",bezeichnung:"Position",notiz:"Notiz"},
 reststueck:{reserviert_fuer:"Reserviert für Projekt",verbraucht:"Verbraucht",anzahl:"Anzahl"},
 vorlage:{name:"Name",notiz:"Notiz",type:"Art",vorlage_data:"Masse"},
 // v3.15: das Abhaken eines Zuschnittstuecks.
 zuschnitt:{erledigt:"Zugeschnitten"},
 // v3.36: Geplant -> Ausgefuehrt je Position. Exakt die vier Felder, die
 // write_audit_log() fuer entity_type='ausfuehrung' tatsaechlich diffed
 // (kein einheit/position_bezeichnung - die werden nicht mitgeschrieben).
 ausfuehrung:{status:"Status",ausgefuehrte_menge:"Ausgeführte Menge",bemerkung:"Bemerkung",geplante_menge:"Geplante Menge"},
 measurement:{
  title:"Bezeichnung",date:"Datum",note:"Notiz / Masse",
  // v3.05 Arbeitsworkflow (Freigabe, Zuweisung, Ruesten, Montage)
  workflow_status:"Arbeitsstatus",ruester_id:"Rüsten",monteur_id:"Montage",
  freigabe_verfallen:"Freigabe",
  // v2.34: Detail-Diff innerhalb measurements.data (siehe CLAUDE.md
  // Abschnitt 42) - nur die dort als Klasse A eingestuften, flachen,
  // typübergreifend eindeutigen Felder. Kollisionsfreie Feldnamen über
  // alle neun Massaufnahme-Typen hinweg geprüft (a/b/c nur bei
  // Einfassung Rund, deckung/lattenabstand bei Ort-/Seitenblech UND
  // Einfassung Rund mit gleicher Bedeutung, nur pro Typ andere Katalog-
  // Werte - siehe VERLAUF_DECKUNG_NAMES).
  massA:"Mass A",winkel:"Winkel",montage:"Montage",abwicklung:"Abwicklung",material:"Material",
  dachneigung:"Dachneigung",rinneAbwicklung:"Abwicklung",
  konisch:"Konisch",ansicht:"Ansichtspfeil",
  hoehe:"Höhe",laengeOben:"Länge oben",achsabstand:"Achsabstand",hilfsrissWunsch:"Hilfsriss unter Oberkante",seite:"Seite",
  deckung:"Eindeckung / Deckmaterial",art:"Anschlussart",ausfuehrung:"Ausführung",saum:"Umschlag am Blechende",
  stossLaenge:"Stücklänge",ueberlappung:"Überlappung am Stoss",lattenabstand:"Lattenabstand",firstgehrung:"Firstgehrung",
  durchmesser:"Rohrdurchmesser",a:"Mass a",b:"Mass b",c:"Mass c",
  // v2.36: Foto/Skizzen - die Werte sind bewusst nur Anwesenheit (0/1)
  // bzw. Anzahl, nie ein Speicherpfad (Auftrag Abschnitt 16).
  photo:"Foto",sketches:"Skizzen"
 },
 ausmass:{title:"Bezeichnung",date:"Datum",note:"Notiz"},
 report:{date:"Datum",order_no:"Auftrags-Nr.",customer:"Auftraggeber",object:"Objekt / Gebäudeteil",vat:"MWST"}
};

// Einheiten für die v2.34-Detailfelder - nur wo eine Einheit tatsächlich
// eindeutig bekannt ist (Auftrag Abschnitt 11: "keine Einheit erfinden").
const VERLAUF_MEAS_FIELD_UNITS={
 massA:"mm",winkel:"°",abwicklung:"mm",dachneigung:"°",
 hoehe:"mm",laengeOben:"mm",achsabstand:"mm",hilfsrissWunsch:"mm",
 saum:"mm",stossLaenge:"mm",ueberlappung:"mm",lattenabstand:"mm",durchmesser:"mm",a:"mm",b:"mm",c:"mm",
 rinneAbwicklung:"mm"
};

// Werte, die als Katalog-Schlüssel gespeichert sind (nie als lesbarer Name
// im UI anzeigen, Auftrag Abschnitt 12) - über die bereits vorhandenen,
// clientseitig geladenen Kataloge aufgelöst statt neu abgefragt. deckung
// kommt sowohl bei Ort-/Seitenblech (ANB_DECKUNGEN) als auch bei
// Einfassung Rund (EINF_DECKUNGEN) vor, mit disjunkten Schlüsseln
// (geprüft: kein gemeinsamer Schlüsselname) - deshalb sicher zu einer
// einzigen Nachschlagetabelle zusammengeführt.
function verlaufDeckungNamen(){
 const namen={};
 if(typeof ANB_DECKUNGEN!=="undefined")Object.keys(ANB_DECKUNGEN).forEach(k=>namen[k]=ANB_DECKUNGEN[k].name);
 if(typeof EINF_DECKUNGEN!=="undefined")Object.keys(EINF_DECKUNGEN).forEach(k=>namen[k]=EINF_DECKUNGEN[k].name);
 return namen;
}
const VERLAUF_MEAS_VALUE_LABELS={
 montage:{links:"von links",rechts:"von rechts"},
 konisch:{ja:"Ja",nein:"Nein"},
 ansicht:{keiner:"kein Pfeil",links:"von links",oben:"von oben",rechts:"von rechts",unten:"von unten"},
 seite:{rechts:"Rechte Seite",links:"Linke Seite"},
 ausfuehrung:{seite:"Seitenblech (Wand)",ort:"Ortblech (Giebel)"}
};

function verlaufFormatWann(iso){
 if(!iso)return "–";
 const d=new Date(iso);
 const datum=d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric"});
 const zeit=d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
 return `${datum} ${zeit}`;
}

// Werte benutzerfreundlich darstellen: NULL/leer → "–", Datumsfelder im
// Schweizer Format, Kataloge (material/deckung) über bestehende, bereits
// geladene Nachschlagelisten aufgelöst statt einer neuen Abfrage
// (Auftrag Abschnitt 25), Zahlen mit Schweizer Tausendertrennzeichen +
// bekannter Einheit, Booleans als Ja/Nein, alles andere als reiner Text.
function verlaufFormatDiffValue(field,v){
 // v3.05: eine leere Zuweisung heisst ausdruecklich "niemand", nicht "-".
 if((field==="ruester_id"||field==="monteur_id")&&(v===null||v===undefined||v===""))return "niemand";
 // v3.06: "Freigabe: gültig → verfallen" liest sich klarer als "Ja/Nein".
 if(field==="freigabe_verfallen")return v?"verfallen":"gültig";
 if(v===null||v===undefined||v==="")return "–";
 // Arbeitsstatus und Personen ueber die bereits vorhandenen Tabellen
 // aufloesen - keine zweite Namens- oder Statuslogik.
 if(field==="workflow_status")return (typeof mwStatusText==="function")?mwStatusText(v):String(v);
 if(field==="ruester_id"||field==="monteur_id"){
  const n=typeof profileName==="function"?profileName(v):"";
  return n||"Unbekannter Benutzer";
 }
 if(field==="date"){
  const d=new Date(v);
  return isNaN(d)?String(v):d.toLocaleDateString("de-CH");
 }
 if(field==="material"){
  const m=typeof findMeasurementMaterial==="function"?findMeasurementMaterial(v):null;
  return m?m.name:String(v);
 }
 if(field==="deckung")return verlaufDeckungNamen()[v]||String(v);
 if(VERLAUF_MEAS_VALUE_LABELS[field]&&Object.prototype.hasOwnProperty.call(VERLAUF_MEAS_VALUE_LABELS[field],v))return VERLAUF_MEAS_VALUE_LABELS[field][v];
 if(typeof v==="boolean")return v?"Ja":"Nein";
 if(typeof v==="number"){
  const einheit=VERLAUF_MEAS_FIELD_UNITS[field];
  return v.toLocaleString("de-CH")+(einheit?" "+einheit:"");
 }
 return String(v);
}

// Rendert die Feldänderungen eines UPDATE-Eintrags (leer, wenn keine
// Whitelist-Felder betroffen waren - dann bleibt nur der Aktionstext).
// archived wird bei action=status_changed nicht generisch, sondern als
// "Aktiv → Archiviert" dargestellt (Auftrag v2.33 Abschnitt 18), der
// Geschäftsstatus (v2.46) mit seinen deutschen Bezeichnungen. Seit v2.46
// erfasst write_audit_log() bei einer Statusänderung zusätzlich auch
// gleichzeitig geänderte Stammdatenfelder, statt sie zu verschlucken -
// mehrere Zeilen in einem Eintrag sind also möglich.
// v2.35: Label und Wert als eigene Zeile in einer Flex-Reihe statt reinem
// Fliesstext - bleibt auf Smartphone/Tablet umbruchfähig (Auftrag
// Abschnitt 15: kein horizontales Scrollen), liest sich auf breiteren
// Bildschirmen tabellenartig wie im Auftragsbeispiel (Abschnitt 8).
// v2.36: Foto-/Skizzen-Einträge fachlich formulieren statt "0 → 1".
// Ein solcher Eintrag existiert nur, wenn sich tatsächlich etwas geändert
// hat - deshalb bedeutet Foto 1→1 eindeutig "ersetzt" und Skizzen n→n
// "bearbeitet". Rückgabe null = Zeile weglassen, weil der Aktionstext
// (Badge) bereits exakt dasselbe aussagt.
function verlaufBildWert(row,c){
 if(c.field==="photo"){
  if(c.old===0&&c.new===1)return (row.action==="photo_added")?null:"hinzugefügt";
  if(c.old===1&&c.new===0)return (row.action==="photo_deleted")?null:"gelöscht";
  return "ersetzt";
 }
 const alt=Number(c.old)||0,neu=Number(c.new)||0,d=Math.abs(neu-alt);
 if(neu>alt){
  if(d===1&&row.action==="sketch_added")return null;
  return `${d} hinzugefügt (${alt} → ${neu})`;
 }
 if(neu<alt){
  if(d===1&&row.action==="sketch_deleted")return null;
  return `${d} gelöscht (${alt} → ${neu})`;
 }
 return `bearbeitet (${neu})`;
}

function verlaufChangesHtml(row){
 if(!Array.isArray(row.changes)||!row.changes.length)return "";
 const labels=VERLAUF_FIELD_LABELS[row.entity_type]||{};
 const lines=[];
 row.changes.forEach(c=>{
  let wert;
  if(row.action==="status_changed"&&c.field==="archived"){
   wert=`${esc(c.old?"Archiviert":"Aktiv")} → ${esc(c.new?"Archiviert":"Aktiv")}`;
  }else if(row.entity_type==="project"&&c.field==="status"){
   // Deutsche Bezeichnung statt des gespeicherten Rohwerts (v2.46).
   wert=`${esc(projektStatusText(c.old))} → ${esc(projektStatusText(c.new))}`;
  }else if(row.entity_type==="reservierung"&&c.field==="status"){
   // v3.09: deutsche Bezeichnung des Reservierungsstatus. Die Entitaet
   // entscheidet, nicht der Wert - project.status heisst anders.
   const n=v=>(typeof resvStatusName==="function")?resvStatusName(v):String(v||"-");
   wert=`${esc(n(c.old))} → ${esc(n(c.new))}`;
  }else if(row.entity_type==="reststueck"&&c.field==="reserviert_fuer"){
   const n=v=>{
    if(v===null||v===undefined)return "niemand";
    const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))
      ?allProjects.find(x=>x.id===v):null;
    return p?((typeof projektTitel==="function")?projektTitel(p):(p.name||("Projekt "+v)))
            :("Projekt "+v);
   };
   wert=`${esc(n(c.old))} → ${esc(n(c.new))}`;
  }else if(row.entity_type==="vorlage"&&c.field==="vorlage_data"){
   // Der Inhalt der Vorlage steht bewusst nicht im Log (er kann gross sein),
   // festgehalten ist nur, DASS sich die Masse geaendert haben.
   wert="geändert";
  }else if(row.entity_type==="vorlage"&&c.field==="type"){
   const n=v=>(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[v])||String(v||"–");
   wert=`${esc(n(c.old))} → ${esc(n(c.new))}`;
  }else if(row.entity_type==="zuschnitt"&&c.field==="erledigt"){
   // v3.15: "nein -> ja" saehe aus wie ein Schalter; hier steht, was es
   // fachlich heisst.
   wert=`${esc(c.old?"zugeschnitten":"offen")} → ${esc(c.new?"zugeschnitten":"offen")}`;
  }else if(row.entity_type==="reststueck"&&c.field==="verbraucht"){
   wert=`${esc(c.old?"verbraucht":"im Lager")} → ${esc(c.new?"verbraucht":"im Lager")}`;
  }else if(row.entity_type==="ausfuehrung"&&c.field==="status"){
   // v3.36: deutsche Bezeichnung des Ausfuehrungsstands - gleiches Muster
   // wie reservierung/status oben, nur mit dem Vokabular aus js/64.
   const n=v=>(typeof ausfStatusText==="function")?ausfStatusText(v):String(v||"-");
   wert=`${esc(n(c.old))} → ${esc(n(c.new))}`;
  }else if(row.entity_type==="measurement"&&(c.field==="photo"||c.field==="sketches")){
   const text=verlaufBildWert(row,c);
   if(text===null)return;
   wert=esc(text);
  }else{
   wert=`${esc(verlaufFormatDiffValue(c.field,c.old))} → ${esc(verlaufFormatDiffValue(c.field,c.new))}`;
  }
  const label=labels[c.field]||c.field;
  lines.push(`<div class="verlauf-change-row"><span class="verlauf-change-label">${esc(label)}</span><span class="verlauf-change-value">${wert}</span></div>`);
 });
 if(!lines.length)return "";
 return `<div class="verlauf-entry-changes">${lines.join("")}</div>`;
}

// Beschreibung: vorhandene description anzeigen, sonst aus Entität+Aktion
// einen verständlichen Text erzeugen (nie rohe JSON-Metadaten, nie
// versuchen den evtl. gelöschten Datensatz nachzuladen).
function verlaufEntryText(row){
 if(row._buendel&&row._buendel.length>1)return verlaufBuendelText(row);
 if(row.description)return esc(row.description);
 const label=VERLAUF_ENTITY_LABELS[row.entity_type]||"Datensatz";
 const aktion=(VERLAUF_ACTION_LABELS[row.action]||row.action).toLowerCase();
 return esc(`${label} ${aktion}`);
}

// withEntityBadge: im kombinierten Projekt-Verlauf (mehrere Entitäts-
// typen in einer Liste) zusätzlich anzeigen, um WAS es sich handelt -
// im direkten Einzel-Verlauf (immer derselbe Typ) unnötig, deshalb dort
// weiterhin weggelassen wie in v2.31. v2.35: Wer+Wann auf einer Zeile
// mit 🕒 zusammengefasst (Auftrag Abschnitt 8), Entität als kleines,
// dezentes Icon+Label-Badge statt Farbcodierung (Abschnitt 9).
function verlaufEntryHtml(row,withEntityBadge){
 const wer=row.user_id?(profileName(row.user_id)||"Unbekannter Benutzer"):"Unbekannter Benutzer";
 const aktion=VERLAUF_ACTION_LABELS[row.action]||row.action;
 const entityBadge=withEntityBadge?`<span class="verlauf-entry-entity">${VERLAUF_ENTITY_ICONS[row.entity_type]||""} ${esc(VERLAUF_ENTITY_LABELS[row.entity_type]||row.entity_type)}</span>`:"";
 return `<div class="verlauf-entry">
<div class="verlauf-entry-top">
<span class="verlauf-entry-who">🕒 ${esc(wer)} · ${esc(verlaufFormatWann(row.created_at))}</span>
<span class="verlauf-entry-badges">${entityBadge}<span class="verlauf-entry-action">${esc(aktion)}</span></span>
</div>
<div class="verlauf-entry-desc">${verlaufEntryText(row)}</div>
${(row._buendel&&row._buendel.length>1)?"":verlaufChangesHtml(row)}
</div>`;
}

// v3.23: Abgehakte Zuschnittstuecke buendeln.
// Ein Blech mit 41 Stuecken erzeugt 41 Verlaufseintraege - alle von derselben
// Person, innerhalb weniger Minuten, alle mit demselben Text. Der Verlauf war
// danach nicht mehr lesbar.
//
// Gebuendelt wird NUR die ANZEIGE. In der Datenbank steht weiterhin eine Zeile
// je Stueck - das ist richtig, jedes Stueck wurde wirklich abgehakt, und ein
// spaeterer Bericht darf sich darauf verlassen. Zusammengefasst wird nur, was
// wirklich zusammengehoert: derselbe Benutzer, dieselbe Massaufnahme,
// dieselbe Aktion, hoechstens VERLAUF_BUENDEL_MINUTEN auseinander und
// unmittelbar hintereinander in der Liste. Sobald etwas anderes dazwischen
// steht, faengt ein neues Buendel an - so kann nichts verdeckt werden.
const VERLAUF_BUENDEL_MINUTEN=30;
function verlaufBuendelbar(r){
 return r&&r.entity_type==="zuschnitt";
}
function verlaufBuendeln(rows){
 const raus=[];
 (rows||[]).forEach(r=>{
  const letzte=raus[raus.length-1];
  const passt=letzte&&letzte._buendel&&verlaufBuendelbar(r)
   &&letzte.entity_type===r.entity_type
   &&letzte.action===r.action
   &&String(letzte.user_id||"")===String(r.user_id||"")
   &&String(letzte.project_id||"")===String(r.project_id||"")
   &&letzte._buendelBezug===verlaufBuendelBezug(r)
   // Verglichen wird gegen den JUENGSTEN Eintrag des Buendels, nicht gegen den
   // zuletzt hinzugefuegten - sonst koennte sich eine Kette ueber Stunden
   // ziehen, solange nur jeder einzelne Abstand klein genug ist.
   &&Math.abs(new Date(letzte.created_at)-new Date(r.created_at))<=VERLAUF_BUENDEL_MINUTEN*60000;
  if(passt){
   letzte._buendel.push(r);
   // Der Eintrag traegt den Zeitpunkt des JUENGSTEN Stuecks (die Liste ist
   // absteigend sortiert) und die Spanne bis zum aeltesten.
   letzte._buendelVon=r.created_at;
   return;
  }
  if(!verlaufBuendelbar(r)){raus.push(r);return}
  raus.push(Object.assign({},r,{_buendel:[r],_buendelVon:r.created_at,
    _buendelBezug:verlaufBuendelBezug(r)}));
 });
 return raus;
}
// Woran haengt das Buendel? Bei einem Zuschnitt an der Massaufnahme, damit
// Stuecke zweier Massaufnahmen nie in einer Zeile landen.
function verlaufBuendelBezug(r){
 return String(r.entity_id||"");
}
// Der Text eines gebuendelten Eintrags. Genannt werden die Anzahl und die
// Zeitspanne - beides steht wirklich in den Daten, es wird nichts geglaettet.
function verlaufBuendelText(row){
 const n=(row._buendel||[]).length;
 // Die Liste ist absteigend: row.created_at ist der juengste Eintrag,
 // _buendelVon der aelteste. Genannt wird die Spanne von alt nach neu.
 const aeltest=verlaufFormatWann(row._buendelVon);
 const juengst=verlaufFormatWann(row.created_at);
 const spanne=(aeltest&&juengst&&aeltest!==juengst)?(aeltest+" – "+juengst):juengst;
 const was=(row.action==="deleted")?"Haken zurückgenommen":"Stücke zugeschnitten";
 return esc(n+" "+was+" · "+spanne);
}

// Zustand je Container (geladene Zeilen + aktuelle Filter), damit die// Zustand je Container (geladene Zeilen + aktuelle Filter), damit die
// Filter rein clientseitig umschalten - keine erneute Abfrage pro Klick.
const verlaufState=new WeakMap();

function renderVerlaufFiltered(box){
 const st=verlaufState.get(box);
 const list=box.querySelector(".verlauf-entries");
 if(!st||!list)return;
 let rows=st.rows;
 // "bild" fasst die vier v2.36-Foto-/Skizzen-Aktionen zusammen, damit sie
 // nicht nur unter "Alle" auffindbar sind (Auftrag Abschnitt 23).
 if(st.actionFilter==="bild")rows=rows.filter(r=>VERLAUF_BILD_ACTIONS.indexOf(r.action)>=0);
 else if(st.actionFilter!=="alle")rows=rows.filter(r=>r.action===st.actionFilter);
 if(st.entityFilter&&st.entityFilter!=="alle")rows=rows.filter(r=>r.entity_type===st.entityFilter);
 list.innerHTML=rows.length?verlaufBuendeln(rows).map(r=>verlaufEntryHtml(r,st.combined)).join(""):'<div class="empty">Keine Einträge für diesen Filter.</div>';
}

function verlaufFiltersHtml(withEntityFilter){
 const entityBar=withEntityFilter?`<div class="bar verlauf-filters" data-verlauf-filter-group="entity" style="margin-bottom:4px">
<button type="button" class="gray active" data-verlauf-entity-filter="alle">Alle</button>
<button type="button" class="gray" data-verlauf-entity-filter="project">Projekt</button>
<button type="button" class="gray" data-verlauf-entity-filter="measurement">Massaufnahme</button>
<button type="button" class="gray" data-verlauf-entity-filter="ausmass">Ausmass</button>
<button type="button" class="gray" data-verlauf-entity-filter="report">Regierapport</button>
</div>`:"";
 return `${entityBar}
<div class="bar verlauf-filters" data-verlauf-filter-group="action" style="margin-bottom:6px">
<button type="button" class="gray active" data-verlauf-filter="alle">Alle</button>
<button type="button" class="gray" data-verlauf-filter="created">Erstellt</button>
<button type="button" class="gray" data-verlauf-filter="updated">Geändert</button>
<button type="button" class="gray" data-verlauf-filter="deleted">Gelöscht</button>
<button type="button" class="gray" data-verlauf-filter="status_changed">Status geändert</button>
<button type="button" class="gray" data-verlauf-filter="bild">Foto/Skizze</button>
</div>`;
}

// Gemeinsamer Kern: führt die Abfrage aus (Query wird von den beiden
// Aufrufern loadVerlauf()/loadProjectVerlauf() zusammengestellt) und
// rendert Filterleiste(n) + Liste in box.
// Wie viele Eintraege eine Seite umfasst. Bis v3.03 war das ein fester
// Deckel ohne Nachladen - bei einem langlaufenden Projekt fehlte irgendwann
// der Anfang (CLAUDE.md 40.10). Jetzt eine Seitengroesse mit "Mehr laden".
const VERLAUF_SEITE=50;

async function runVerlaufQuery(box,query,combined,nachladen){
 box.innerHTML=`${verlaufFiltersHtml(combined)}
<div class="verlauf-entries"><div class="small">Lädt…</div></div>`;
 const {data,error}=await query(0);
 const list=box.querySelector(".verlauf-entries");
 if(error){
  list.innerHTML=`<div class="small" style="color:var(--red)">Verlauf konnte nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 verlaufState.set(box,{rows:data||[],actionFilter:"alle",entityFilter:"alle",combined,
   query,vollstaendig:!data||data.length<VERLAUF_SEITE});
 if(!data||!data.length){
  list.innerHTML='<div class="empty">Noch keine Aktivitäten vorhanden.</div>';
  return;
 }
 renderVerlaufFiltered(box);
 verlaufMehrKnopf(box);
}

// Zeigt "Mehr laden", solange die letzte Seite voll war - dann kann es noch
// aeltere Eintraege geben. Ist alles geladen, steht das ausdruecklich da,
// statt den Knopf wortlos verschwinden zu lassen.
function verlaufMehrKnopf(box){
 const st=verlaufState.get(box);
 if(!st)return;
 let fuss=box.querySelector(".verlauf-mehr");
 if(!fuss){
  fuss=document.createElement("div");
  fuss.className="verlauf-mehr";
  fuss.style.marginTop="6px";
  box.appendChild(fuss);
 }
 if(st.vollstaendig){
  fuss.innerHTML=st.rows.length>VERLAUF_SEITE
   ? `<div class="small" style="color:var(--muted)">Alle ${st.rows.length} Einträge geladen.</div>`
   : "";
  return;
 }
 fuss.innerHTML=`<button type="button" class="gray verlauf-mehr-knopf">↓ Weitere ${VERLAUF_SEITE} Einträge laden</button>
<div class="small" style="color:var(--muted);margin-top:2px">${st.rows.length} Einträge geladen – es gibt ältere.</div>`;
}

// Haengt die naechste Seite an. Die bereits geladenen Zeilen bleiben stehen -
// die Liste waechst, sie wird nicht ersetzt.
async function verlaufMehrLaden(box){
 const st=verlaufState.get(box);
 if(!st||!st.query||st.vollstaendig)return;
 const knopf=box.querySelector(".verlauf-mehr-knopf");
 if(knopf){knopf.disabled=true;knopf.textContent="Lädt…"}
 const {data,error}=await st.query(st.rows.length);
 if(error){
  const fuss=box.querySelector(".verlauf-mehr");
  if(fuss)fuss.innerHTML=`<div class="small" style="color:var(--red)">Weitere Einträge konnten nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 // Dieselbe id kann durch einen zwischenzeitlich neuen Eintrag zweimal
 // kommen - deshalb ueber die id zusammenfuehren statt blind anzuhaengen.
 const bekannt=new Set(st.rows.map(r=>r.id));
 const neu=(data||[]).filter(r=>!bekannt.has(r.id));
 st.rows=st.rows.concat(neu);
 st.vollstaendig=!data||data.length<VERLAUF_SEITE;
 verlaufState.set(box,st);
 renderVerlaufFiltered(box);
 verlaufMehrKnopf(box);
}

// Direkter Verlauf genau eines Datensatzes (Massaufnahme/Ausmass/Report/
// einzelnes Projekt) - unverändert seit v2.31, RLS filtert automatisch
// auf die eigene Firma, bewusst kein company_id-Filter vom Client.
async function loadVerlauf(box,entityType,entityId){
 await runVerlaufQuery(box,
  ab=>sb.from("audit_log").select("*").eq("entity_type",entityType).eq("entity_id",entityId)
    .order("created_at",{ascending:false}).range(ab,ab+VERLAUF_SEITE-1),
  false);
}

// Kombinierter Projekt-Verlauf (v2.32): eine einzige Abfrage über
// project_id zeigt Projekt + zugehörige Massaufnahmen/Ausmasse/Reports
// gemeinsam chronologisch - project_id wird serverseitig in
// write_audit_log() gesetzt, nie vom Client (siehe CLAUDE.md 40.3/40.4).
async function loadProjectVerlauf(box,projectId){
 await runVerlaufQuery(box,
  ab=>sb.from("audit_log").select("*").eq("project_id",projectId)
    .order("created_at",{ascending:false}).range(ab,ab+VERLAUF_SEITE-1),
  true);
}

// Delegierte Klick-Handler für alle Filter-Leisten (egal in welchem
// Kontext) statt eigener Listener pro Aufrufstelle. Action- und
// Entitäts-Filter sind unabhängige Zustände und wirken kombiniert.
document.addEventListener("click",e=>{
 // "Mehr laden" - der Knopf entsteht erst beim Zeichnen, deshalb delegiert.
 const mehr=e.target.closest?e.target.closest(".verlauf-mehr-knopf"):null;
 if(mehr){
  // Der Knopf sitzt in ".verlauf-mehr", das ein direktes Kind der Box ist -
  // und genau dieses Element ist der Schluessel in verlaufState.
  const fuss=mehr.closest(".verlauf-mehr");
  const box=fuss&&fuss.parentElement;
  if(box)verlaufMehrLaden(box);
  return;
 }
 const afb=e.target.closest("[data-verlauf-filter]");
 if(afb){
  const box=afb.closest("[data-verlauf-filter-group]")?.parentElement;
  if(!box||!verlaufState.has(box))return;
  verlaufState.get(box).actionFilter=afb.dataset.verlaufFilter;
  box.querySelectorAll('[data-verlauf-filter-group="action"] [data-verlauf-filter]').forEach(b=>b.classList.toggle("active",b===afb));
  renderVerlaufFiltered(box);
  return;
 }
 const efb=e.target.closest("[data-verlauf-entity-filter]");
 if(efb){
  const box=efb.closest("[data-verlauf-filter-group]")?.parentElement;
  if(!box||!verlaufState.has(box))return;
  verlaufState.get(box).entityFilter=efb.dataset.verlaufEntityFilter;
  box.querySelectorAll('[data-verlauf-filter-group="entity"] [data-verlauf-entity-filter]').forEach(b=>b.classList.toggle("active",b===efb));
  renderVerlaufFiltered(box);
 }
});

// Auf/Zu für einen Verlauf-Container, gleiches Öffnen/Schliessen-Muster
// wie die bestehenden Massaufnahmen-/Ausmass-/Rapporte-/Dateien-Listen
// im Projekt (.report-list.open, js/09-projekte.js).
async function toggleVerlaufBox(box,btn,entityType,entityId){
 if(!entityId)return;
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"🕒 Verlauf ausblenden":"🕒 Verlauf anzeigen";
 if(willOpen)await loadVerlauf(box,entityType,entityId);
}

// Gleiches Muster, aber für den kombinierten Projekt-Verlauf (v2.32).
async function toggleProjectVerlaufBox(box,btn,projectId){
 if(!projectId)return;
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"🕒 Verlauf ausblenden":"🕒 Verlauf anzeigen";
 if(willOpen)await loadProjectVerlauf(box,projectId);
}

// Beim Öffnen/Neu-Anlegen einer Massaufnahme/eines Ausmasses/Rapports:
// Verlauf-Knopf nur zeigen, wenn der Datensatz bereits gespeichert ist
// (eine neue, ungespeicherte Erfassung hat noch keine Historie), und
// einen evtl. noch offenen Verlauf des vorherigen Datensatzes schliessen.
function updateVerlaufToggleVisibility(btn,box,entityId){
 box.classList.remove("open");
 box.innerHTML="";
 btn.textContent="🕒 Verlauf anzeigen";
 btn.hidden=!entityId;
}

// Feste Knöpfe (nicht Teil einer wiederholten Liste wie project-row) -
// einmalige Bindung genügt, currentMeasurementId/currentAusmassId/
// currentReportId werden erst zum Klickzeitpunkt gelesen.
$("measVerlaufToggle").onclick=()=>toggleVerlaufBox($("measVerlaufBody"),$("measVerlaufToggle"),"measurement",currentMeasurementId);
$("amVerlaufToggle").onclick=()=>toggleVerlaufBox($("amVerlaufBody"),$("amVerlaufToggle"),"ausmass",currentAusmassId);
$("reportVerlaufToggle").onclick=()=>toggleVerlaufBox($("reportVerlaufBody"),$("reportVerlaufToggle"),"report",currentReportId);
