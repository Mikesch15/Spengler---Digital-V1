// ===========================================================================
// Was die App gelernt hat  (v3.174)
// ===========================================================================
// Eine Stelle, an der alles steht, was das Zaehlwerk (js/71) ueber diese
// Firma weiss. Bis hierher war die Zaehlung nur an ihren Wirkungen zu
// erkennen - eine andere Reihenfolge in der Suche, ein Chip am Feld. Wer
// wissen wollte, WORAUF sich das stuetzt, musste die Hinweise einzeln
// aufsuchen.
//
// WARUM DAS DAZUGEHOERT
// Regel 2 des Zaehlwerks heisst "immer die Zahl dazu": ein Vorschlag, den
// man nachsehen kann, ist ueberpruefbar. Diese Seite ist die Fortsetzung
// davon - sie macht die ganze Zaehlung auf einmal nachsehbar, nicht nur
// den einen Vorschlag, der gerade am Feld steht.
//
// WAS SICH HIER NICHT KORRIGIEREN LAESST - UND WARUM DAS RICHTIG IST
// Die Zahlen sind GERECHNET, nicht gespeichert (keine zweite Wahrheit,
// siehe js/71). Es gibt deshalb keinen Wert, den man hier geradebiegen
// koennte: "4x benutzt" heisst, dass es in vier gespeicherten Datensaetzen
// steht. Stimmt die Zahl nicht, stimmt einer dieser Datensaetze nicht -
// und der gehoert dort korrigiert, wo er erfasst wurde. Ein Korrekturfeld
// an dieser Stelle waere genau die zweite Wahrheit, die das Zaehlwerk
// vermeidet.
//
// WIDERSPRECHEN GEHT TROTZDEM
// Ueber den Schalter unten. Er nimmt die HINWEISE zurueck - die App
// verhaelt sich dann wie vor v3.168 - und laesst diese Uebersicht stehen.
// Sonst koennte niemand nachsehen, worauf er gerade verzichtet.
// ===========================================================================

// Wie viele Zeilen je Abschnitt? Die Uebersicht soll lesbar bleiben und
// nicht zum zweiten Materialkatalog werden. Der Rest steht als Zahl da,
// damit klar ist, dass etwas fehlt - verschwiegen wird nichts (Regel 1).
const ZWU_ZEILEN=12;

function zwuEsc(v){ return (typeof esc==="function")?esc(v):String(v==null?"":v) }

// Eine Tabelle aus fertigen Zeilen. leerText steht da, wenn noch nichts
// gezaehlt ist - und sagt dann, was noetig waere, damit etwas dasteht.
function zwuTabelle(kopf,zeilen,leerText,gesamt){
 if(!zeilen||!zeilen.length)
  return `<div class="zwu-leer">${zwuEsc(leerText)}</div>`;
 const mehr=(gesamt>zeilen.length)
  ?`<div class="zwu-mehr">… und ${gesamt-zeilen.length} weitere</div>`:"";
 return `<div class="scroll"><table class="eb-table zwu-tab">
<thead><tr>${kopf.map(k=>`<th>${zwuEsc(k)}</th>`).join("")}</tr></thead>
<tbody>${zeilen.map(z=>`<tr>${z.map((c,i)=>
  `<td${i>0?' class="p-mitte"':""}>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>${mehr}`;
}

function zwuAbschnitt(titel,wozu,inhalt){
 return `<div class="card zwu-karte">
<h2>${zwuEsc(titel)}</h2>
<p class="zwu-wozu">${wozu}</p>
${inhalt}</div>`;
}

// ---- Die fuenf Zaehlungen -------------------------------------------------
// Gelesen wird IMMER der rohe Bestand aus js/71, nie ueber die gesperrten
// Abfragefunktionen: diese Seite muss auch dann zeigen, was gezaehlt wurde,
// wenn die Hinweise abgeschaltet sind.

function zwuMaterialName(nr){
 const m=(typeof settings==="object"&&settings&&Array.isArray(settings.materials))
  ?settings.materials.find(x=>x&&String(x[0]).trim().toLowerCase()===String(nr).trim().toLowerCase())
  :null;
 return m?String(m[1]||""):"";
}
function zwuMaterial(){
 const liste=(Array.isArray(materialNutzung)?materialNutzung:[])
  .filter(z=>z&&Number(z.anzahl)>0)
  .sort((a,b)=>Number(b.anzahl)-Number(a.anzahl));
 const zeilen=liste.slice(0,ZWU_ZEILEN).map(z=>[
  `<b>${zwuEsc(z.edv_nr)}</b>${zwuMaterialName(z.edv_nr)
    ?` <span class="zwu-name">${zwuEsc(zwuMaterialName(z.edv_nr))}</span>`:""}`,
  `<span class="zw-zahl">${zwuEsc(z.anzahl)}×</span>`,
  zwuEsc(z.zuletzt||"–")]);
 return zwuAbschnitt("Material, das ihr benutzt",
  "Ordnet die EDV-Nr.-Suche im Regierapport und an der Massaufnahme. "
  +"Gezählt über Regierapporte und über das Material an den Massaufnahmen.",
  zwuTabelle(["EDV-Nr.","Benutzt","Zuletzt"],zeilen,
   "Noch nichts gezählt. Sobald Material in einem Regierapport oder an "
   +"einer Massaufnahme erfasst ist, steht es hier.",liste.length));
}

function zwuArtName(art){
 return (typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS&&MEAS_TYPE_LABELS[art])
  ?MEAS_TYPE_LABELS[art]:String(art||"");
}
function zwuMaterialArt(){
 const liste=(Array.isArray(materialNutzungArt)?materialNutzungArt:[])
  .filter(z=>z&&Number(z.anzahl)>0)
  .sort((a,b)=>Number(b.anzahl)-Number(a.anzahl));
 const zeilen=liste.slice(0,ZWU_ZEILEN).map(z=>[
  zwuEsc(zwuArtName(z.art)),
  `<b>${zwuEsc(z.edv_nr)}</b>${zwuMaterialName(z.edv_nr)
    ?` <span class="zwu-name">${zwuEsc(zwuMaterialName(z.edv_nr))}</span>`:""}`,
  `<span class="zw-zahl">${zwuEsc(z.anzahl)}×</span>`]);
 return zwuAbschnitt("Material je Art der Massaufnahme",
  "Stellt beim Material an einer Massaufnahme das nach vorne, was zu "
  +"<b>dieser Arbeit</b> gehört – vor die Gesamtzählung darüber.",
  zwuTabelle(["Art","EDV-Nr.","Benutzt"],zeilen,
   "Noch nichts gezählt.",liste.length));
}

function zwuAusmass(){
 const liste=(Array.isArray(ausmassPositionNutzung)?ausmassPositionNutzung:[])
  .filter(z=>z&&Number(z.vorgekommen)>=ZW_AUSMASS_MINDESTENS)
  .filter(z=>Number(z.gebraucht)*3<=Number(z.vorgekommen))
  .sort((a,b)=>Number(b.vorgekommen)-Number(a.vorgekommen));
 const zeilen=liste.slice(0,ZWU_ZEILEN).map(z=>[
  zwuEsc(z.text),
  `<span class="zw-zahl">${Number(z.vorgekommen)-Number(z.gebraucht)}</span>`
   +` von ${zwuEsc(z.vorgekommen)}`]);
 return zwuAbschnitt("Ausmass-Positionen, die selten eine Menge bekommen",
  "Erscheint als Hinweis an der Position im Ausmass. Die Position bleibt "
  +"sichtbar und bedienbar – es wird <b>nichts ausgeblendet</b>. Verlangt "
  +"sind mindestens "+ZW_AUSMASS_MINDESTENS+" Vorkommen.",
  zwuTabelle(["Position","Ohne Menge"],zeilen,
   "Nichts zu melden – entweder ist noch zu wenig erfasst, oder es gibt "
   +"keine Position, die regelmässig leer bleibt.",liste.length));
}

function zwuMesswerte(){
 const liste=(Array.isArray(messwertNutzung)?messwertNutzung:[]).slice()
  .sort((a,b)=>Number(b.anzahl)-Number(a.anzahl));
 const zeilen=liste.slice(0,ZWU_ZEILEN).map(z=>[
  zwuEsc(zwuArtName(z.art)),
  zwuEsc(z.feld),
  `<b>${zwuEsc(z.wert)}</b>`,
  `<span class="zw-zahl">${zwuEsc(z.anzahl)}×</span>`]);
 return zwuAbschnitt("Masse, die ihr immer wieder gleich messt",
  "Steht als zweiter Knopf neben dem Richtwert aus den Einstellungen. "
  +"Gezählt werden nur <b>gemessene</b> Felder – Abwicklung, Zuschnitte "
  +"und Flächen sind gerechnet und werden nicht zurückgespiegelt.",
  zwuTabelle(["Art","Feld","Wert","Gemessen"],zeilen,
   "Noch nichts gezählt. Ab der zweiten Messung desselben Feldes steht "
   +"hier etwas.",liste.length));
}

function zwuAuswahlWert(feld,wert){
 if(feld==="material"&&typeof zwMaterialName==="function"){
  const n=zwMaterialName(wert);
  if(n)return n;
 }
 return String(wert==null?"":wert);
}
function zwuAuswahlen(){
 const liste=(Array.isArray(auswahlNutzung)?auswahlNutzung:[]).slice()
  .sort((a,b)=>Number(b.anzahl)-Number(a.anzahl));
 const zeilen=liste.slice(0,ZWU_ZEILEN).map(z=>[
  zwuEsc(zwuArtName(z.art)),
  zwuEsc(z.feld),
  `<b>${zwuEsc(zwuAuswahlWert(z.feld,z.wert))}</b>`,
  `<span class="zw-zahl">${zwuEsc(z.anzahl)}×</span>`]);
 return zwuAbschnitt("Auswahlen, die bei euch fast immer gleich ausfallen",
  "Steht neben einer noch leeren Auswahl – oder neben einer, die noch auf "
  +"der einprogrammierten Vorgabe steht. Hat jemand selbst gewählt, "
  +"schweigt die App.",
  zwuTabelle(["Art","Feld","Wert","Gewählt"],zeilen,
   "Noch nichts gezählt. Ab der zweiten gleichen Wahl steht hier etwas.",
   liste.length));
}

// ---- Der Schalter ---------------------------------------------------------
function zwuSchalter(){
 const darf=(typeof isAdmin==="function")&&isAdmin();
 return `<div class="card zwu-karte">
<h2>Hinweise aus dem Zählwerk</h2>
<label class="ra-schalter"><input type="checkbox" id="zwuAktiv"${
  (typeof zaehlwerkAktiv==="undefined"||zaehlwerkAktiv!==false)?" checked":""}${
  darf?"":" disabled"}> Vorschläge und Hinweise anzeigen</label>
<p class="zwu-wozu">Aus bedeutet: die Materialsuche ordnet wieder nach
Katalog, es erscheinen keine Richtwert- und Auswahlvorschläge, keine
Ausmass-Hinweise und kein Zuteilungsvorschlag – die App verhält sich wie
vor Version 3.168. Diese Übersicht bleibt.</p>
${darf?"":`<p class="zwu-wozu">Ändern darf das ein Administrator.</p>`}
<div class="small" id="zwuMeldung" style="margin-top:6px"></div>
</div>`;
}

// ---- Zeichnen und Öffnen --------------------------------------------------
function zwuZeichnen(){
 const ziel=$("zaehlwerkBody");
 if(!ziel)return;
 ziel.innerHTML=
  `<div class="info">Alles hier ist <b>gerechnet, nicht gespeichert</b>: die
Zahlen entstehen beim Nachschlagen aus euren Rapporten, Massaufnahmen und
Ausmassen. Deshalb lässt sich hier nichts geradebiegen – stimmt eine Zahl
nicht, stimmt der Datensatz nicht, aus dem sie kommt, und der gehört dort
korrigiert, wo er erfasst wurde. Gezählt wird ausschliesslich innerhalb der
eigenen Firma.</div>`
  +zwuMaterial()+zwuMaterialArt()+zwuMesswerte()+zwuAuswahlen()+zwuAusmass()
  +zwuSchalter();
}

function openZaehlwerk(){
 if(!$("zaehlwerkModal"))return;
 zwuZeichnen();
 $("zaehlwerkModal").hidden=false;
}

document.addEventListener("click",e=>{
 if(!e.target)return;
 if(e.target.id==="closeZaehlwerk"){ $("zaehlwerkModal").hidden=true; return }
 // Der Weg aus der klassischen Ansicht. In der neuen Ansicht fuehrt der
 // Eintrag unter "Mehr" hierher (js/70) - beide rufen dieselbe Funktion.
 if(e.target.closest&&e.target.closest("#navZaehlwerk")){ openZaehlwerk(); return }
});

document.addEventListener("change",async e=>{
 if(!e.target||e.target.id!=="zwuAktiv")return;
 const an=!!e.target.checked;
 const meldung=$("zwuMeldung");
 if(meldung)meldung.textContent="Wird gespeichert …";
 const {fehler}=await speichereAppSettings({zaehlwerk_aktiv:an});
 if(fehler){
  // Der Schalter springt zurueck: es waere schlimmer, eine Aenderung
  // anzuzeigen, die gar nicht angekommen ist.
  e.target.checked=!an;
  if(meldung)meldung.textContent="Nicht gespeichert: "+fehler;
  return;
 }
 zaehlwerkAktiv=an;
 if(meldung)meldung.textContent=an
  ? "Gespeichert. Die Hinweise erscheinen wieder."
  : "Gespeichert. Die App verhält sich jetzt wie vor Version 3.168.";
});
