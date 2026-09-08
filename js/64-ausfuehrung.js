// ---------------------------------------------------------------------------
// v3.36  GEPLANT -> AUSGEFUEHRT
// ---------------------------------------------------------------------------
// Auftrag "Naechster Entwicklungsschritt: GEPLANT -> AUSGEFUEHRT".
//
// Ergaenzt den bestehenden Arbeitsstatus (js/44, v3.05) um eine zweite,
// unabhaengige Ebene: WAS wurde an JEDER EINZELNEN Position tatsaechlich
// ausgefuehrt - unabhaengig davon, wie weit der Arbeitsstatus insgesamt ist.
// Eine Rinne kann vollstaendig fertig sein, waehrend ein Stutzen daneben noch
// nicht ausgefuehrt ist (Auftrag Abschnitt 3).
//
// GRUNDREGEL (Auftrag Abschnitt 2, woertlich): die urspruengliche Planung
// darf NIE durch die tatsaechliche Ausfuehrung ueberschrieben werden. Geplant
// und ausgefuehrt bleiben deshalb zwei getrennte Werte in zwei getrennten
// Spalten - measurements.data (die Planung/Berechnung) wird von dieser Datei
// an KEINER Stelle beschrieben, nur gelesen (ueber buildMeasurementFromForm(),
// denselben Weg, den auch js/53-versionen.js fuer den "aktuellen Stand"
// verwendet).
//
// Eine Position ist eine Zeile aus data.ausmass (der zeile()-Helfer, seit
// v3.09 in neun Register-Modulen identisch, siehe js/29/30/31/32/34/36/37/
// 39/40) - {pos,bezeichnung,menge,einheit,herkunft,teil}. position_nr in der
// neuen Tabelle ist genau dieses "pos", 1-basiert und fortlaufend, dieselbe
// Konvention wie stueck_nr bei zuschnitt_erledigt (v3.15).
//
// Keine zweite Pack-/Berechnungslogik: es wird nichts aus data.ausmass neu
// gerechnet, nur gelesen und je Position ein Ausfuehrungsstand daruebergelegt.
// Keine automatische Ausmass-Uebernahme (Auftrag Abschnitt 5/11) - das
// bestehende Ausmass-Register (js/17) ist von dieser Datei nicht beruehrt.
//
// Architektur mirror: js/53-versionen.js (verCache/verLaden/verNeuLaden/
// renderMeasVersionen - dasselbe Lade-/Render-Skelett, auf currentMeasurementId
// gestuetzt, kein zweiter Zustandshalter). Wer/Wann-Zeilen, Fehleranzeige und
// der Firmenschalter kommen unveraendert aus js/44 (mwPerson/mwWann/mwZeile/
// mwAktiv) - keine zweite Implementierung derselben generischen Helfer.
//
// EIN Schreibweg: ausfSchreiben() liest den aktuellen Stand der Zeile
// (Chip-Auswahl bzw. Feldwerte) und schreibt IMMER die ganze Zeile per
// upsert() - .upsert() ersetzt die ganze Datenbankzeile, ein Teil-Update
// wuerde die uebrigen Felder stillschweigend leeren. 0 geschriebene Zeilen
// gelten NICHT als Erfolg (CLAUDE.md 24.1, exakt das Muster aus zeSetzen(),
// js/56).
// ---------------------------------------------------------------------------

const AUSF_STATUS={
 nicht_ausgefuehrt:{text:"Nicht ausgeführt",farbe:"grau", zeichen:"○"},
 teilweise:        {text:"Teilweise",       farbe:"orange",zeichen:"◐"},
 vollstaendig:     {text:"Vollständig",     farbe:"gruen", zeichen:"✓"}
};

let ausfCache=new Map();   // position_nr (Number) -> Zeile aus ausfuehrungen
let ausfLadeFehler=null;
let ausfLauf=0;
let ausfMessungId=null;

function ausfAktiv(){ return typeof mwAktiv==="function"?mwAktiv():true }

// Deutsche Bezeichnung eines Status-Rohwerts - fuer js/23-verlauf.js, damit
// der Aenderungsverlauf "Nicht ausgeführt -> Teilweise" zeigt statt der
// Rohwerte (gleiches Muster wie resvStatusName() in js/50).
function ausfStatusText(k){
 const i=AUSF_STATUS[k];
 return i?i.text:(k||"–");
}

function ausfBadge(status){
 const i=AUSF_STATUS[status]||AUSF_STATUS.nicht_ausgefuehrt;
 return `<span class="mw-badge mw-${i.farbe}">${i.zeichen} ${esc(i.text)}</span>`;
}

// ---- Laden ------------------------------------------------------------
// Kein company_id-Filter im Client: die Firmengrenze erzwingt allein die
// restriktive tenant_boundary_ausfuehrungen-Policy.
async function ausfLaden(messungId){
 ausfLadeFehler=null; ausfMessungId=messungId||null;
 if(!ausfAktiv()||!messungId){ausfCache=new Map();return}
 const lauf=++ausfLauf;
 const {data,error}=await sb.from("ausfuehrungen").select("*").eq("measurement_id",messungId);
 if(lauf!==ausfLauf)return;
 if(error){ausfLadeFehler=error.message;ausfCache=new Map();return}
 ausfCache=new Map((data||[]).map(z=>[Number(z.position_nr),z]));
}

// ---- Live-Plan lesen (NICHT measurements.data schreiben) ----------------
// Dieselbe Funktion, die auch js/53 fuer den "aktuellen Stand"-Vergleich
// verwendet - sicher aufrufbar, solange die Massaufnahme bereits gespeichert
// und ihr Formular gefuellt ist (genau die Bedingung, unter der diese Karte
// ueberhaupt sichtbar wird, siehe renderMeasAusfuehrung()).
function ausfAllePositionen(){
 if(typeof buildMeasurementFromForm!=="function")return [];
 const g=buildMeasurementFromForm();
 return (g&&g.data&&Array.isArray(g.data.ausmass))?g.data.ausmass:[];
}
function ausfLivePosition(nr){
 return ausfAllePositionen().find(p=>Number(p.pos)===Number(nr))||null;
}

function ausfZusammenfassungText(positionen){
 if(!positionen.length)return "";
 let voll=0,teil=0,keine=0;
 positionen.forEach(p=>{
  const z=ausfCache.get(Number(p.pos));
  const s=(z&&z.status)||"nicht_ausgefuehrt";
  if(s==="vollstaendig")voll++; else if(s==="teilweise")teil++; else keine++;
 });
 const teile=[];
 if(voll)teile.push(voll+" vollständig");
 if(teil)teile.push(teil+" teilweise");
 if(keine)teile.push(keine+" nicht ausgeführt");
 return positionen.length+" Position"+(positionen.length===1?"":"en")+": "+teile.join(", ")+".";
}

function ausfZeileHtml(pos){
 const nr=Number(pos.pos);
 const z=ausfCache.get(nr);
 const status=(z&&z.status)||"nicht_ausgefuehrt";
 // Beleg-Abgleich (mirrors zeStand()'s veraltet-Logik, js/56): weicht die bei
 // der letzten Erfassung gespeicherte geplante Menge/Einheit vom AKTUELLEN
 // Plan ab, hat sich die Massaufnahme seither geaendert.
 const geplantText=[pos.menge,pos.einheit].filter(x=>x!=null&&x!=="").join(" ")||"–";
 const veraltet=!!(z&&z.geplante_menge!=null
   &&(String(z.geplante_menge)!==String(pos.menge??"")||String(z.einheit||"")!==String(pos.einheit||"")));
 const chips=Object.keys(AUSF_STATUS).map(k=>{
  const info=AUSF_STATUS[k];
  return `<button type="button" class="ausf-chip${status===k?" aktiv":""}" data-ausf-status="${k}">${info.zeichen} ${esc(info.text)}</button>`;
 }).join("");
 const wer=z?mwZeile("Zuletzt erfasst",mwPerson(z.updated_by||z.created_by),z.updated_at||z.created_at):"";
 return `<div class="ausf-zeile" data-ausf-row="${nr}">
  <div class="ausf-zeile-kopf">
   <span class="ausf-bez">${esc(pos.bezeichnung||("Position "+nr))}</span>
   <span class="ausf-geplant">Geplant: ${esc(geplantText)}</span>
  </div>
  ${veraltet?`<div class="ausf-veraltet">Die Planung wurde seither geändert – bei der Erfassung: ${esc(String(z.geplante_menge||"–")+" "+(z.einheit||"")).trim()}, jetzt: ${esc(geplantText)}.</div>`:""}
  <div class="ausf-chips">${chips}</div>
  <div class="ausf-felder">
   <label>Ausgeführte Menge<input type="text" data-ausf-menge value="${esc((z&&z.ausgefuehrte_menge)||"")}" placeholder="${esc(geplantText)}"></label>
   <label>Bemerkung<input type="text" data-ausf-bemerkung value="${esc((z&&z.bemerkung)||"")}" placeholder="bei Abweichungen"></label>
  </div>
  ${wer}
 </div>`;
}

// Eine Position, die es im aktuellen Plan nicht mehr gibt (die Massaufnahme
// wurde umgebaut) - bleibt sichtbar, ist aber nicht mehr editierbar (kein
// data-ausf-row, keine Chips/Felder): es gibt nichts mehr, worauf ein Klick
// schreiben koennte. Nichts geht verloren, nichts wird stillschweigend
// geloescht.
function ausfVerwaistHtml(z){
 const wer=mwZeile("Erfasst",mwPerson(z.updated_by||z.created_by),z.updated_at||z.created_at);
 const teile=[];
 if(z.geplante_menge)teile.push("erfasst war "+esc(String(z.geplante_menge)+(z.einheit?(" "+z.einheit):"")));
 if(z.ausgefuehrte_menge)teile.push("ausgeführt "+esc(z.ausgefuehrte_menge));
 return `<div class="ausf-zeile ausf-zeile-verwaist">
  <div class="ausf-zeile-kopf">
   <span class="ausf-bez">${esc(z.position_bezeichnung||("Position "+z.position_nr))}</span>
   ${ausfBadge(z.status)}
  </div>
  <div class="small" style="color:var(--muted)">Diese Position ist im aktuellen Plan nicht mehr vorhanden${teile.length?(" – "+teile.join(", ")+"."):"."}</div>
  ${z.bemerkung?`<div class="small">Bemerkung: ${esc(z.bemerkung)}</div>`:""}
  ${wer}
 </div>`;
}

function renderMeasAusfuehrung(){
 const box=$("measAusfuehrungBereich"), inhalt=$("measAusfuehrungBody");
 if(!box||!inhalt)return;
 // Eine noch nicht gespeicherte Massaufnahme hat noch keine Positionen zum
 // Ausfuehren, und eine Firma, die den Ablauf abgeschaltet hat, sieht die
 // Karte nicht - der Stand bleibt dabei in der Datenbank stehen (mwAktiv(),
 // js/44).
 if(!ausfAktiv()||!currentMeasurementId){box.hidden=true;inhalt.innerHTML="";return}
 box.hidden=false;
 if(ausfLadeFehler){
  inhalt.innerHTML=`<div class="small" style="color:var(--red)">Ausführung konnte nicht geladen werden: ${esc(ausfLadeFehler)}</div>`;
  return;
 }
 const positionen=ausfAllePositionen();
 if(!positionen.length){
  inhalt.innerHTML=`<div class="small" style="color:var(--muted)">Diese Massaufnahme hat keine Positionen zum Ausführen.</div>`;
  return;
 }
 const lebendeNr=new Set(positionen.map(p=>Number(p.pos)));
 const verwaist=[...ausfCache.values()].filter(z=>!lebendeNr.has(Number(z.position_nr)));
 let html=`<div class="small" style="margin-bottom:8px">${esc(ausfZusammenfassungText(positionen))}</div>`;
 html+=positionen.map(ausfZeileHtml).join("");
 if(verwaist.length){
  html+=`<div class="small" style="color:var(--muted);margin:10px 0 4px"><b>Frühere Positionen</b> (nicht mehr im aktuellen Plan):</div>`;
  html+=verwaist.map(ausfVerwaistHtml).join("");
 }
 html+=`<div id="ausfSchreibFehler" class="mw-fehler small" hidden></div>`;
 inhalt.innerHTML=html;
}

function ausfFehlerZeigen(text){
 const f=$("ausfSchreibFehler"); if(!f){alert(text);return}
 f.textContent=text; f.hidden=false;
}

// Der EINE Schreibweg. Liest die aktuelle Zeile (Chip/Feld-Zustand) und die
// aktuelle Planposition, schreibt IMMER die ganze Zeile - .upsert() ersetzt
// die Datenbankzeile vollstaendig, ein Teil-Update wuerde die uebrigen
// Felder stillschweigend leeren.
async function ausfSchreiben(nr,ueberschreibung){
 if(!currentMeasurementId)return;
 const plan=ausfLivePosition(nr);
 if(!plan)return;   // verwaiste Positionen sind nicht mehr schreibbar
 const row=document.querySelector(`[data-ausf-row="${nr}"]`);
 if(!row)return;
 const bestehend=ausfCache.get(Number(nr));
 const aktiverChip=row.querySelector(".ausf-chip.aktiv");
 const status=(ueberschreibung&&ueberschreibung.status)
  ||(aktiverChip&&aktiverChip.dataset.ausfStatus)
  ||(bestehend&&bestehend.status)||"nicht_ausgefuehrt";
 const mengeFeld=row.querySelector("[data-ausf-menge]");
 const bemFeld=row.querySelector("[data-ausf-bemerkung]");
 const zeile={
  measurement_id:currentMeasurementId,
  position_nr:Number(nr),
  position_bezeichnung:plan.bezeichnung||"",
  geplante_menge:plan.menge==null?null:String(plan.menge),
  einheit:plan.einheit||null,
  ausgefuehrte_menge:mengeFeld?(mengeFeld.value.trim()||null):(bestehend?bestehend.ausgefuehrte_menge:null),
  status,
  bemerkung:bemFeld?(bemFeld.value.trim()||null):(bestehend?bestehend.bemerkung:null)
 };
 const {data,error}=await sb.from("ausfuehrungen")
  .upsert(zeile,{onConflict:"measurement_id,position_nr"}).select();
 if(error){ausfFehlerZeigen(error.message||"Es konnte nicht gespeichert werden.");return}
 if(!data||!data.length){ausfFehlerZeigen("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
 ausfCache.set(Number(nr),data[0]);
 renderMeasAusfuehrung();
}

async function ausfNeuLaden(){
 await ausfLaden(currentMeasurementId);
 renderMeasAusfuehrung();
}

// Angehaengt an den AEUSSEREN, nie ersetzten Wrapper - nur measAusfuehrungBody
// wird bei jedem Render neu geschrieben (dasselbe Muster wie js/53).
if($("measAusfuehrungBereich")){
 $("measAusfuehrungBereich").addEventListener("click",e=>{
  const c=e.target.closest(".ausf-chip[data-ausf-status]");
  if(!c)return;
  const row=c.closest("[data-ausf-row]");
  if(!row)return;
  ausfSchreiben(row.dataset.ausfRow,{status:c.dataset.ausfStatus});
 });
 $("measAusfuehrungBereich").addEventListener("change",e=>{
  const f=e.target.closest("[data-ausf-menge],[data-ausf-bemerkung]");
  if(!f)return;
  const row=f.closest("[data-ausf-row]");
  if(!row)return;
  ausfSchreiben(row.dataset.ausfRow,null);
 });
}
