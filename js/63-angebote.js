"use strict";

/*
 * OFFERTEN
 *
 * Dieses Modul verwaltet Offerten als eigenständigen Bestandteil eines Projekts.
 *
 * Fachliche Trennung:
 * - Offerte      = dem Kunden angeboten
 * - Massaufnahme = aufgenommen / ermittelt
 * - Produktion   = daraus hergestellt
 * - Ausmass      = tatsächlich ausgeführt / verrechnet
 *
 * Bestehende Funktionen werden wiederverwendet:
 * - recognizePhoto() für die Positions-Erkennung
 * - uploadMeasurementImage() für Foto-Uploads
 * - searchProjects() / projektVorschlagHtml() / positionSuggest()
 * - resolveSignedThumbnails() für Vorschaubilder
 * - COCKPIT_BEREICHE für die Cockpit-Integration
 *
 * PDF- und Foto-Import verwenden möglichst dieselbe Positionsstruktur.
 *
 * Der Zugriff wird über die bestehende Berechtigungs- und RLS-Logik
 * abgesichert. Die Frontend-Sichtbarkeit ist keine Sicherheitsgrenze.
 *
 * Keine parallele Erkennungs-, Upload-, Projekt- oder Berechtigungslogik
 * aufbauen, wenn bestehende Funktionen verwendet werden können.
 */

// Aktuelle Offerten-Funktionalität 

let offerteZugriff=false;
let angSelectedProjectId=null;
let angPhotos=[]; // "data:..." (neu) oder Speicherpfad (bereits gespeichert)
let angPositions=[];
let currentAngebotId=null;
let currentAngebotMeta={};
let angEditReturnTo="cockpitAngebote";
let projectAngeboteCache=[];
// ---- PDF der Offerte (v3.38) --------------------------------------
// Getrennt von den Fotos (die dienen der KI-Positionserkennung, das PDF
// ist das eigentliche Offert-Dokument zum Ablegen/Weitergeben).
// angPdfExisting  = {path,name} des bereits GESPEICHERTEN PDFs, oder null.
// angPdfNewFile   = ausgewaehltes File-Objekt, das beim Speichern erst
//                   hochgeladen wird - noch NICHTS im Storage/DB.
// Liegt bewusst NICHT in "project_files" (das ist eine projektweite,
// von der Offerte unabhaengige Liste - ein Projekt kann mehrere Offerten
// haben, project_files koennte die Zuordnung nicht eindeutig abbilden),
// sondern als eigene Spalte auf der angebote-Zeile selbst - exakt wie
// photo_path/photo_paths bereits seit v3.34. Pfad "project-files/
// <projectId>/…": dieser Pfad ist ueber storage_object_insert_allowed()/
// storage_object_is_own_company() bereits REIN STRUKTURELL autorisiert
// (Pfadsegmente + Projekt-Firmenzugehoerigkeit), unabhaengig davon, ob
// eine project_files-Zeile existiert - am echten Funktionskoerper
// verifiziert, siehe CLAUDE.md. Keine neue Storage-/RLS-Migration noetig.
let angPdfExisting=null;
let angPdfNewFile=null;

// Wird aus afterLogin() (js/03-login.js) aufgerufen, wie checkSystemAdmin().
// Fragt die Zugriffs-Tabelle direkt ab (keine RPC noetig - die Zeile
// gehoert bereits dem angemeldeten Benutzer selbst, feature_access_select
// erlaubt profile_id = auth.uid()).
async function checkOfferteZugriff(){
 offerteZugriff=false;
 if(currentProfile){
  try{
   const {data,error}=await sb.from("feature_access").select("granted")
    .eq("profile_id",currentProfile.id).eq("feature","angebote").maybeSingle();
   offerteZugriff=!error&&!!data&&!!data.granted;
  }catch(e){offerteZugriff=false;}
 }
 if($("cockpitAngeboteCard"))$("cockpitAngeboteCard").hidden=!offerteZugriff;
 // v3.200: die selbst erstellte Offerte (js/79) haengt an DERSELBEN
 // Freischaltung. Wer Offerten darf, darf beide Arten - ein zweiter
 // Schalter waere eine zweite Stelle zum Vergessen.
 if($("cockpitOffertenCard"))$("cockpitOffertenCard").hidden=!offerteZugriff;
 if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=!offerteZugriff;
 if($("cockpitStandOffertenZeile"))$("cockpitStandOffertenZeile").hidden=!offerteZugriff;
}

// ---- Einbindung ins Cockpit (js/24-projekt-cockpit.js) -----------
// Reine Objekt-Mutation - COCKPIT_BEREICHE ist mit const deklariert, das
// sperrt nur die Bindung, nicht den Objektinhalt. Dadurch uebernimmt
// js/24 automatisch: Body leeren bei Projektwechsel, Anzahl/Marke/Stand
// setzen, Klapp-Karte, "Alles auf/zuklappen", Tastatur, Sprung aus dem
// Arbeitsstand (data-cockpit-goto="angebote").
if(typeof COCKPIT_BEREICHE==="object"&&COCKPIT_BEREICHE){
 COCKPIT_BEREICHE.angebote={
  count:"cockpitAngeboteCount",body:"cockpitAngeboteBody",card:"cockpitAngeboteCard",
  mark:"cockpitAngeboteMark",stand:"cockpitAngeboteStand",leer:"Noch keine",
  load:id=>loadProjectAngebote(id)
 };
}

// Gegatet VOR jeder Abfrage: ein nicht freigeschalteter Benutzer loest gar
// keine Netzwerkanfrage aus, nicht nur eine leere Anzeige (dasselbe
// Vorgehen wie cockpitMatZuStand()/pmSichtbarkeitAuffrischen() bei
// abgeschalteten Projektmodulen, js/56/js/47).
// v3.340: Offertmengen auf einen Blick im Arbeitsstand des Cockpits (nur aus Offertpositionen, klar beschriftet, nie addiert).
function angMengenZeileSetzen(list){
 const z=$("cockpitStandMengenZeile"), w=$("cockpitMengenStand");
 if(!z||!w)return;
 const t=(typeof angMengenKurz==="function")?angMengenKurz(list,angMatListe()):"";
 z.hidden=!t||!offerteZugriff;
 w.textContent=t;
}
async function loadProjectAngebote(projectId){
 const box=$("cockpitAngeboteBody");
 if(!offerteZugriff){
  if(box)box.innerHTML="";
  projectAngeboteCache=[];
  angMengenZeileSetzen([]);
  return 0;
 }
 if(box)box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("angebote").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){
  if(box)box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  projectAngeboteCache=[];
  angMengenZeileSetzen([]);
  return undefined;
 }
 const list=data||[];
 projectAngeboteCache=list;
 angMengenZeileSetzen(list);
 if(box)box.innerHTML=list.length?list.map(a=>{
  const zusatz=a.date?datumCH(a.date):"";
  return `<div class="report-row">
<div class="report-row-info"><b>${esc(a.title||"Ohne Bezeichnung")}</b>${zusatz?`<span>${esc(zusatz)}</span>`:""}</div>
<div class="report-row-actions">
<button class="blue" data-open-project-angebot="${a.id}">Öffnen</button>
<button class="red" data-del-project-angebot="${a.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join("")+angGiltHtml(list)+(typeof angMengenHtml==="function"?angMengenHtml(list,angMatListe()):""):'<div class="empty">Noch keine Offerte zu diesem Projekt.</div>';
 return list.length;
}

// ---- Positionstabelle (identischer Aufbau wie amPositionsBody) ---
// v3.71: "abschnitt" (fett gedruckter Zwischentitel aus der Erkennung, seit
// Edge-Function-v20/recognizePhoto()) gruppiert aufeinanderfolgende
// Positionen zu klappbaren Bloecken; "preis" (Einzelpreis) ergibt zusammen
// mit "quantity" den Betrag je Zeile und die Summe aller Betraege das
// Total. Beide Felder sind rein additiv - bereits gespeicherte Offerten
// ohne diese Felder zeigen einfach 0.00 bzw. keine Abschnittsueberschrift.
// Titel der Abschnitte, die der Benutzer in DIESER Offerte per Klick
// aufgeklappt hat. Standard ist zugeklappt (nicht in der Menge -> zu) -
// so bleibt bei vielen Abschnitten sofort ein Ueberblick sichtbar, statt
// einer langen, unuebersichtlichen Liste.
let angSektionOffen=new Set();

function angBetrag(p){
 return (Number(p.quantity)||0)*(Number(p.preis)||0);
}
function angTotal(){
 return angPositions.reduce((summe,p)=>summe+angBetrag(p),0);
}
// Setzt die Klapp-Zustaende zurueck, wenn eine (andere) Offerte geoeffnet
// oder neu angelegt wird - sonst koennte ein bei einer anderen Offerte
// aufgeklappter Abschnitt hier faelschlich offen erscheinen. Die ganze
// Liste ("Erkannte Positionen") bleibt dabei weiterhin offen, nur die
// einzelnen Abschnitte starten zugeklappt (angSektionOffen leer).
function angPositionsAufklappen(){
 angSektionOffen=new Set();
 angMatOffen=new Set();
 const box=$("angPositionsKlapp");
 if(box){
  box.classList.add("open");
  const kopf=box.querySelector("[data-klapp='ang-positionen']");
  if(kopf)kopf.setAttribute("aria-expanded","true");
 }
}
// ---- Offertposition: optionale Materialdaten (v3.333) ---------------------------------------------------------------
// Eine Position darf optional tragen: material_id (Werkstoff aus measurement_materials der Firma), staerke_mm,
// abwicklung_mm. Die Felder stehen im bestehenden Positions-JSON (angebote.positions) - keine Migration, alte Positionen ohne
// die Felder laden, bearbeiten und speichern wie bisher. Material, Stärke und Abwicklung aus dem TEXT werden nur VORGESCHLAGEN
// und erst nach ausdrücklicher Bestätigung übernommen. Es wird nichts reserviert, gebucht oder an Massaufnahmen geändert;
// die drei Materiallisten bleiben getrennt (hier nur measurement_materials).
const ANG_MAT_STAERKE_MIN=0.05, ANG_MAT_STAERKE_MAX=10, ANG_MAT_ABW_MIN=5, ANG_MAT_ABW_MAX=3000;
// Eine Eingabe als positive Zahl in den Grenzen - sonst null (leer, 0, negativ, Text, NaN, unplausibel gross/klein).
// Dezimalkomma oder -punkt, Tausender nur als Apostroph ("1'000"); "1.000" gilt als 1,0 und fällt bei der Abwicklung durch die Grenze.
function angMatZahl(v,min,max){
 if(v===null||v===undefined||typeof v==="boolean")return null;
 if(typeof v==="number"){return (Number.isFinite(v)&&v>=min&&v<=max)?v:null}
 const t=String(v).trim().replace(/['’\s]/g,"").replace(",",".");
 if(!/^\d+(\.\d+)?$/.test(t))return null;
 const n=Number(t);
 return (Number.isFinite(n)&&n>=min&&n<=max)?n:null;
}
const ANG_MAT_ZAHL="(\\d{1,4}(?:['’]\\d{3})*(?:[.,]\\d{1,3})?)";
// Alle (plausiblen) Zahlen, die ein Muster im Text findet; leer = nichts, ein Wert = eindeutig, mehrere verschiedene = mehrdeutig.
function angMatTexttreffer(text,muster,min,max){
 const werte=[];
 let m;const re=new RegExp(muster,"gi");
 while((m=re.exec(text))!==null){
  const roh=m.slice(1).find(x=>x!==undefined);
  const n=angMatZahl(roh,min,max);
  werte.push(n);
  if(m.index===re.lastIndex)re.lastIndex++;
 }
 if(!werte.length)return {art:"keiner"};
 if(werte.some(x=>x===null))return {art:"unklar"};     // ein Treffer, der keine plausible Zahl ist: nichts raten
 const eind=Array.from(new Set(werte));
 return eind.length===1?{art:"eindeutig",wert:eind[0]}:{art:"mehrdeutig",werte:eind};
}
// Welcher Werkstoff der Firma steht im Text? Nur als Werkstoff-Wort erkannt, nicht als beliebiges Wort: "Kupferblech",
// "Stahlblech", "Titanzinkband", "Walzblei" - nicht "Auf Stahl nieten" oder "Bleilappen" allein. Genau ein Werkstoff = Treffer,
// mehrere = mehrdeutig (Namen, nichts geraten). liste = measurement_materials der aktiven Firma (RLS-gefiltert geladen).
// locker=true (nur Offertanfang: Titel/Notiz): der Werkstoffname darf auch allein als Wort stehen ("Material: Kupfer") - dort steht er
// als Angabe zur ganzen Offerte, nicht als Befestigungsuntergrund einer Zeile. Mehrere Werkstoffe bleiben mehrdeutig.
function angMatWerkstoffErkennen(text,liste,locker){
 const t=String(text||"");
 const treffer=[];
 (Array.isArray(liste)?liste:[]).forEach(m=>{
  if(!m||m.id===undefined||m.id===null)return;
  const name=String(m.name||"").toLowerCase().replace(/\([^)]*\)/g," ").split(/[,;\/]/)[0].trim();
  const stamm=name.replace(/[^a-zäöüß-]/g,"");
  if(stamm.length<3)return;
  const varianten=Array.from(new Set([stamm,stamm.replace(/-/g,"")]))
    .map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const re=new RegExp("(^|[^a-zäöüß-])(?:(?:walz)?(?:"+varianten.join("|")+")(?:bleche?|band|tafeln?|platte|folie)"+(locker?"?":"")+"|walz(?:"+varianten.join("|")+"))(?![a-zäöüß])","i");
  if(re.test(t))treffer.push(m);
 });
 if(!treffer.length)return {art:"keiner"};
 const ids=Array.from(new Set(treffer.map(m=>String(m.id))));
 if(ids.length===1)return {art:"eindeutig",id:treffer[0].id,name:treffer[0].name};
 return {art:"mehrdeutig",namen:treffer.map(m=>m.name)};
}
// Abwicklung als Muster (v3.334 auch "Abw."); die Zahl braucht immer die Einheit mm (davor oder danach).
const ANG_MAT_ABW_KERN="(?:abwicklung|abw\\.?)(?![a-zäöüß])\\s*(?:mm\\s*"+ANG_MAT_ZAHL+"|[:=]?\\s*"+ANG_MAT_ZAHL+"\\s*mm)";
// "Zu Abwicklung mm 250" ist die Schreibweise der Mehr-/Zusatzleistungen ("Rinnenwinkel. Zu Abwicklung mm 250"): sie nennt die Abwicklung
// des Profils, zu dem die Leistung gehört, und beginnt KEINE eigene Hauptgruppe. Hier wird dieser Teil vom Text getrennt.
const ANG_MAT_ZU_ABW="(?:^|[^a-zäöüß])zu\\s+"+ANG_MAT_ABW_KERN;
function angMatOhneZuAbwicklung(text){return String(text||"").replace(new RegExp(ANG_MAT_ZU_ABW,"gi")," ")}
function angMatZuAbwicklung(text){
 const t=String(text||"");
 const teile=t.match(new RegExp(ANG_MAT_ZU_ABW,"gi"));
 return teile?angMatTexttreffer(teile.join(" "),"(?:^|[^a-zäöüß])zu\\s+"+ANG_MAT_ABW_KERN,ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX):{art:"keiner"};
}
// Die rohe Erkennung aus dem Positionstext - ohne Rücksicht darauf, was schon ausgefüllt ist.
// ohneZu=true: "Zu Abwicklung ..." (Zusatzleistung) zählt nicht als Abwicklung dieser Position.
function angMatErkennen(text,liste,ohneZu){
 const t=String(text||"");
 const abwText=ohneZu?angMatOhneZuAbwicklung(t):t;
 return {
  material:angMatWerkstoffErkennen(t,liste),
  staerke:angMatTexttreffer(t,
   "(?:dicke|stärke|staerke|blechdicke|blechstärke)\\s*(?:mm\\s*"+ANG_MAT_ZAHL+"|[:=]?\\s*"+ANG_MAT_ZAHL+"\\s*mm)"
   +"|[a-zäöüß]*(?:blech|walzblei|bleiband)\\s+(?:gerippt\\s+)?mm\\s*"+ANG_MAT_ZAHL,ANG_MAT_STAERKE_MIN,ANG_MAT_STAERKE_MAX),
  // v3.334: auch die Kurzform "Abw." ("Abw. 500 mm", "Abw. mm 500", "Abw.: 500 mm") - die Zahl braucht immer die Einheit mm
  // (davor oder danach); "Abwicklung 500" ohne Einheit und "Abwicklungen" bleiben unerkannt.
  abwicklung:angMatTexttreffer(abwText,"(?:^|[^a-zäöüß])"+ANG_MAT_ABW_KERN,ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX)
 };
}
// Hat die Position eine (eindeutige) Abwicklung? Aus dem gepflegten Feld oder eindeutig aus dem eigenen Text. Sie ist dann eine HAUPTposition.
function angMatAbwicklungVonPosition(p,liste){
 if(!p)return null;
 const f=angMatZahl(p.abwicklung_mm,ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX);
 if(f!==null)return {wert:f,quelle:"feld"};
 const r=angMatErkennen(p.description,liste,true).abwicklung;
 return r.art==="eindeutig"?{wert:r.wert,quelle:"text"}:null;
}
// Positionsgruppen (v3.334): eine Position mit Abwicklung beginnt eine Hauptgruppe; alle folgenden Positionen OHNE Abwicklung sind
// Zusatzpositionen dieser Hauptposition, bis die nächste Position mit Abwicklung kommt. Positionen vor der ersten Hauptposition werden
// nicht zugeordnet. Gearbeitet wird mit dem Platz in der Liste (nicht mit "pos": doppelte oder leere Nummern sind egal).
// Rückgabe je Platz: {rolle:"haupt"|"zusatz"|"davor", haupt:Platz der Hauptposition|null, abw:{wert,quelle}|null, zusaetze:[Plätze]}
function angMatGruppen(positionen,liste){
 const pos=Array.isArray(positionen)?positionen:[];
 const g=pos.map(()=>({rolle:"davor",haupt:null,abw:null,zusaetze:[]}));
 let aktuell=-1;
 pos.forEach((p,i)=>{
  const abw=angMatAbwicklungVonPosition(p,liste);
  if(abw){aktuell=i;g[i]={rolle:"haupt",haupt:i,abw,zusaetze:[]}}
  else if(aktuell>=0){
   // "Zu Abwicklung mm N" gehört zur laufenden Hauptposition; weicht N von deren Abwicklung ab, wird das angezeigt (kein Vorschlag).
   const zu=angMatZuAbwicklung(p&&p.description);
   g[i]={rolle:"zusatz",haupt:aktuell,abw:g[aktuell].abw,zusaetze:[],zuAbw:zu.art==="eindeutig"?zu.wert:null,
         abweichend:zu.art==="eindeutig"&&g[aktuell].abw&&zu.wert!==g[aktuell].abw.wert};
   g[aktuell].zusaetze.push(i);
  }
 });
 return g;
}
// Was für DIESE Position wirklich vorgeschlagen wird: nur eindeutige Treffer, und nur für Felder, die noch leer sind.
// Bereits gepflegte Werte werden nie durch die Textanalyse ersetzt (kein Vorschlag für dieses Feld).
// opt (v3.334): {kontext: Text des Offertanfangs (Titel + Notiz), rolle: "haupt"|"zusatz"|"davor"}.
//  - Ohne opt (v3.333-Aufruf) verhält es sich wie bisher: nur der eigene Text, keine Gruppenregel.
//  - Material: erst der eigene Text; steht dort keines, der Offertanfang ("Materialvorschlag aus Offertanfang"), aber nur wenn dort
//    GENAU ein Werkstoff der Firma steht. Ist der eigene Text mehrdeutig, wird nicht auf den Offertanfang ausgewichen.
//  - Zusatz- und Vorab-Positionen bekommen keine Vorschläge: Werte gehören zur Hauptposition und werden nie still auf andere geschrieben.
function angMatVorschlag(p,liste,opt){
 const o=opt||{};
 const gruppenregel=o.rolle!==undefined;
 const v={}, unklar=[];
 if(gruppenregel&&o.rolle!=="haupt")return {vorschlag:v,unklar};
 const r=angMatErkennen(p&&p.description,liste,gruppenregel);
 const leerMat=(p==null)||p.material_id===undefined||p.material_id===null||p.material_id==="";
 const leerSt=(p==null)||p.staerke_mm===undefined||p.staerke_mm===null||p.staerke_mm==="";
 const leerAb=(p==null)||p.abwicklung_mm===undefined||p.abwicklung_mm===null||p.abwicklung_mm==="";
 if(leerMat){
  if(r.material.art==="eindeutig")v.material={id:r.material.id,name:r.material.name,herkunft:"position"};
  else if(r.material.art==="mehrdeutig")unklar.push("Material mehrdeutig ("+r.material.namen.join(", ")+")");
  else if(o.kontext){
   const k=angMatWerkstoffErkennen(o.kontext,liste,true);
   if(k.art==="eindeutig")v.material={id:k.id,name:k.name,herkunft:"offertanfang"};
   else if(k.art==="mehrdeutig")unklar.push("Material im Offertanfang mehrdeutig ("+k.namen.join(", ")+")");
  }
 }
 if(leerSt&&r.staerke.art==="eindeutig")v.staerke_mm=r.staerke.wert;
 if(leerAb&&r.abwicklung.art==="eindeutig")v.abwicklung_mm=r.abwicklung.wert;
 if(leerSt&&(r.staerke.art==="mehrdeutig"||r.staerke.art==="unklar"))unklar.push("Stärke nicht eindeutig");
 if(leerAb&&(r.abwicklung.art==="mehrdeutig"||r.abwicklung.art==="unklar"))unklar.push("Abwicklung nicht eindeutig");
 return {vorschlag:v,unklar};
}
// Blechfläche als reine Vorschau: NUR bei Einheit Meter, Menge × Abwicklung (mm → m). Keine Rundung der Rechnung.
function angMatEinheitArt(unit){
 const u=String(unit==null?"":unit).trim().toLowerCase().replace(/\.$/,"");
 if(u==="m")return "meter";
 if(u==="m2"||u==="m²")return "flaeche";
 return "andere";
}
function angBlechflaeche(p){
 if(!p)return {status:"keine"};
 const art=angMatEinheitArt(p.unit);
 const menge=Number(p.quantity);
 if(art==="flaeche"){
  if(!(Number.isFinite(menge)&&menge>0))return {status:"keine_menge"};
  return {status:"flaeche",m2:menge,hinweis:"Die Menge ist bereits eine Fläche."};
 }
 if(art!=="meter")return {status:"einheit"};
 const abw=angMatZahl(p.abwicklung_mm,ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX);
 if(abw===null)return {status:"keine_abwicklung"};
 if(!(Number.isFinite(menge)&&menge>0))return {status:"keine_menge"};
 return {status:"meter",m2:menge*(abw/1000)};
}
// Eine Position für das Speichern bereinigen: nur gültige Materialfelder bleiben. material_id muss in der (RLS-gefilterten) Liste
// der Firma vorkommen - ist die Liste leer/nicht geladen, bleibt sie unberührt (nichts löschen, was nicht geprüft werden kann).
function angMatBereinigen(p,liste){
 const q={...p};
 const gueltig=Array.isArray(liste)&&liste.length>0;
 if(q.material_id!==undefined&&q.material_id!==null&&q.material_id!==""){
  if(gueltig&&!liste.some(m=>String(m.id)===String(q.material_id)))delete q.material_id;
 }else delete q.material_id;
 ["staerke_mm","abwicklung_mm"].forEach(k=>{
  if(q[k]===undefined)return;
  const [mi,ma]=k==="staerke_mm"?[ANG_MAT_STAERKE_MIN,ANG_MAT_STAERKE_MAX]:[ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX];
  const n=angMatZahl(q[k],mi,ma);
  if(n===null)delete q[k];else q[k]=n;
 });
 return q;
}
// ---- Offertmengen (v3.335) -------------------------------------------------------------------------------------------
// Gesamtmengen einer Offerte in m² und Stück - ausdrücklich OFFERTMENGEN: keine Massaufnahme-, Zuschnitt-, Ausmass- oder verrechneten
// Mengen. Nur was die Positionen eindeutig hergeben:
//  - Einheit m2/m²: die Menge ist die Fläche.
//  - Einheit m: Fläche = Menge × bestätigte Abwicklung (Feld abwicklung_mm) / 1000. Eine nur im Text erkannte, nicht bestätigte
//    Abwicklung zählt NICHT (wird als "wartet auf bestätigte Abwicklung" gezählt); eine Zusatzposition ohne eigene Abwicklung erzeugt
//    keine Fläche.
//  - Einheit St/Stk/Stück: nur Stücksumme. Alle anderen Einheiten (h, Fr, kg, lfm, leer …) werden nicht eingerechnet, nur gezählt.
//  - Ungültige Menge (leer, 0, negativ, keine Zahl): nicht gerechnet, gezählt. Nichts wird geraten oder umgerechnet.
function angMengenEinheit(unit){
 const u=String(unit==null?"":unit).trim().toLowerCase().replace(/\.$/,"");
 if(u==="m")return "meter";
 if(u==="m2"||u==="m²")return "flaeche";
 if(u==="st"||u==="stk"||u==="stück"||u==="stueck")return "stueck";
 return "andere";
}
function angMengenUebersicht(positionen,liste){
 const pos=Array.isArray(positionen)?positionen:[];
 const gr=angMatGruppen(pos,liste);
 const r={positionen:pos.length,flaeche_m2:0,stueck:0,flaecheAus:0,stueckAus:0,zusatzOhneFlaeche:0,wartetAufAbwicklung:0,
          ohneAbwicklung:0,ungueltigeMenge:0,andere:{},nachMaterial:{},nachMatStaerke:{}};
 const mat=(p)=>{
  const id=p&&p.material_id;
  const m=(Array.isArray(liste)?liste:[]).find(x=>id!==undefined&&id!==null&&id!==""&&String(x.id)===String(id));
  const k=m?String(m.name):"ohne Material";
  if(!r.nachMaterial[k])r.nachMaterial[k]={flaeche_m2:0,stueck:0};
  return r.nachMaterial[k];
 };
 // v3.343: dieselbe Summe zusätzlich je Werkstoff UND Stärke (Stärke nur, wenn an der Position bestätigt erfasst; sonst "nicht erfasst")
 const matSt=(p)=>{
  const id=p&&p.material_id;
  const m=(Array.isArray(liste)?liste:[]).find(x=>id!==undefined&&id!==null&&id!==""&&String(x.id)===String(id));
  const st=angMatZahl(p&&p.staerke_mm,ANG_MAT_STAERKE_MIN,ANG_MAT_STAERKE_MAX);
  const name=m?String(m.name):"";
  const k=name+"|"+(st===null?"":st);
  if(!r.nachMatStaerke[k])r.nachMatStaerke[k]={material:name,staerke:st,flaeche_m2:0,stueck:0};
  return r.nachMatStaerke[k];
 };
 pos.forEach((p,i)=>{
  const art=angMengenEinheit(p&&p.unit);
  const menge=Number(p&&p.quantity);
  const gueltig=Number.isFinite(menge)&&menge>0&&!(typeof (p&&p.quantity)==="boolean");
  if(art==="andere"){const k=String((p&&p.unit)||"").trim()||"(leer)";r.andere[k]=(r.andere[k]||0)+1;return}
  if(!gueltig){r.ungueltigeMenge++;return}
  if(art==="stueck"){r.stueck+=menge;r.stueckAus++;mat(p).stueck+=menge;matSt(p).stueck+=menge;return}
  if(art==="flaeche"){r.flaeche_m2+=menge;r.flaecheAus++;mat(p).flaeche_m2+=menge;matSt(p).flaeche_m2+=menge;return}
  // Meter
  const abw=angMatZahl(p.abwicklung_mm,ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX);
  if(abw!==null){const f=menge*(abw/1000);r.flaeche_m2+=f;r.flaecheAus++;mat(p).flaeche_m2+=f;matSt(p).flaeche_m2+=f;return}
  const g=gr[i]||{rolle:"davor"};
  if(g.rolle==="zusatz")r.zusatzOhneFlaeche++;
  else if(g.rolle==="haupt")r.wartetAufAbwicklung++;
  else r.ohneAbwicklung++;
 });
 r.vollstaendig=r.wartetAufAbwicklung===0&&r.ohneAbwicklung===0&&r.ungueltigeMenge===0;
 return r;
}
// Anzeige für das Projekt: je Offerte eigene Summen; bei GENAU einer Offerte zugleich die Projektsumme. Bei mehreren Offerten wird NICHT
// addiert (es ist nicht erkennbar, ob es Alternativen oder Revisionen derselben Leistung sind) - ein klarer Hinweis steht dabei.
// v3.340: Anzeige-Teile einer Offerte. Ein Wert, der nicht berechnet werden konnte, steht als „nicht erfasst“ da - nie als 0.
function angMengenTeile(r){
 const f=x=>Number(x).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
 const n=x=>Number(x).toLocaleString("de-CH",{maximumFractionDigits:2});
 const offen=!!(r.wartetAufAbwicklung||r.ohneAbwicklung||r.ungueltigeMenge);
 const flaeche=(r.flaeche_m2===0&&offen)?"nicht erfasst":f(r.flaeche_m2)+" m²";
 const stueck=(r.stueck===0&&r.ungueltigeMenge&&!r.flaeche_m2)?"Stück nicht erfasst":n(r.stueck)+" Stück";
 return {flaeche,stueck};
}
// Kurztext für die Arbeitsstand-Zeile im Cockpit: eine Offerte = ihre Summe, mehrere = nie addiert.
// v3.346: Welche importierten Offerten gelten? Kennzeichen angebote.gilt (Standard true; nur ein ausdrückliches false schliesst aus).
// Mehrere geltende Offerten werden immer getrennt gezeigt, nie addiert.
function angGeltende(offerten){return (offerten||[]).filter(a=>a&&a.gilt!==false)}
function angMengenKurz(offerten,liste){
 const alle=(offerten||[]).filter(a=>a&&Array.isArray(a.positions)&&a.positions.length);
 if(!alle.length)return "";
 const o=angGeltende(alle);
 if(!o.length)return "keine Offerte als geltend markiert";
 if(o.length>1)return o.length+" geltende Offerten – je Offerte getrennt, nicht addiert";
 const r=angMengenUebersicht(o[0].positions,liste);
 const t=angMengenTeile(r);
 return "Fläche "+t.flaeche+" · "+t.stueck+(r.vollstaendig?"":" (unvollständig)");
}
function angMengenHtml(offerten,liste){
 const alle=(offerten||[]).filter(a=>a&&Array.isArray(a.positions)&&a.positions.length);
 if(!alle.length)return "";
 const o=angGeltende(alle);
 const f=x=>Number(x).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
 const n=x=>Number(x).toLocaleString("de-CH",{maximumFractionDigits:2});
 const zeile=a=>{
  const r=angMengenUebersicht(a.positions,liste);
  const tt=angMengenTeile(r);
  const teile=[`Fläche <b>${tt.flaeche}</b>`,`<b>${tt.stueck}</b>`];
  const hinw=[];
  if(r.wartetAufAbwicklung)hinw.push(r.wartetAufAbwicklung+" Hauptposition"+(r.wartetAufAbwicklung===1?"":"en")+" in Metern wartet auf eine bestätigte Abwicklung");
  if(r.ohneAbwicklung)hinw.push(r.ohneAbwicklung+" Meter-Position"+(r.ohneAbwicklung===1?"":"en")+" ohne Abwicklung");
  if(r.ungueltigeMenge)hinw.push(r.ungueltigeMenge+" Position"+(r.ungueltigeMenge===1?"":"en")+" mit ungültiger Menge");
  const andere=Object.keys(r.andere);
  const rest=[];
  if(r.zusatzOhneFlaeche)rest.push(r.zusatzOhneFlaeche+" Zusatzposition"+(r.zusatzOhneFlaeche===1?"":"en")+" ohne eigene Fläche");
  if(andere.length)rest.push("andere Einheiten nicht eingerechnet: "+andere.map(k=>k+" ("+r.andere[k]+")").join(", "));
  const mats=Object.keys(r.nachMaterial).filter(k=>k!=="ohne Material"||Object.keys(r.nachMaterial).length>1);
  const matZeile=mats.length?`<div class="small muted">${mats.map(k=>esc(k)+": "+f(r.nachMaterial[k].flaeche_m2)+" m² · "+n(r.nachMaterial[k].stueck)+" Stück").join(" · ")}</div>`:"";
  return `<div style="padding:3px 0"><b>${esc(a.title||"Ohne Bezeichnung")}</b>: ${teile.join(" · ")}
${r.vollstaendig?"":`<span class="small" style="color:var(--red)"> – unvollständig: ${esc(hinw.join("; "))}</span>`}
${rest.length?`<div class="small muted">${esc(rest.join(" · "))}</div>`:""}${matZeile}</div>`;
 };
 return `<div class="small ang-mengen" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--line)">
<b>Offertmengen</b> <span class="muted">(nur aus den Offertpositionen – keine Massaufnahme-, Zuschnitt-, Ausmass- oder verrechneten Mengen)</span>
${o.map(zeile).join("")}
${!o.length?`<div class="small" style="color:var(--red)">Keine Offerte ist als geltend markiert.</div>`:""}
${o.length>1?`<div class="small muted">Mehrere geltende Offerten: die Summen stehen je Offerte und sind nicht addiert.</div>`:""}
${alle.length>o.length?`<div class="small muted">${alle.length-o.length} von ${alle.length} Offerten sind nicht als geltend markiert und stehen hier nicht.</div>`:""}
</div>`;
}
// Auswahl der geltenden Offerten (Kontrollkästchen je importierter Offerte); das Schreiben macht der Handler weiter unten.
function angGiltHtml(offerten){
 const o=(offerten||[]).filter(a=>a);
 if(o.length<2)return "";
 return `<div class="ang-gilt" style="margin:8px 0"><b>Geltende Offerten</b> <span class="small muted">· mehrere dürfen gelten, sie werden getrennt angezeigt</span>
 ${o.map(a=>`<label style="display:flex;align-items:flex-start;gap:8px;padding:4px 0"><input type="checkbox" data-ang-gilt="${esc(a.id)}" ${a.gilt===false?"":"checked"} style="width:20px;min-width:20px;height:20px;min-height:0;padding:0;margin:2px 0 0;flex:0 0 auto"><span>${esc(a.title||"Ohne Bezeichnung")}${a.date?` <span class="small muted">· ${esc(String(a.date))}</span>`:""}</span></label>`).join("")}</div>`;
}
// ---- Ende Offertposition Materialdaten (rein)

function angPositionZeileHtml(p,i,versteckt,sektionTitel){
 return `<tr${versteckt?' style="display:none"':""}${sektionTitel?` data-ang-sek-row="${esc(sektionTitel)}"`:""}>
<td><input data-ang-pos="${i}" value="${esc(p.pos||"")}"></td>
<td><input data-ang-desc="${i}" value="${esc(p.description||"")}"></td>
<td><input data-ang-qty="${i}" type="number" step=".01" value="${p.quantity||0}"></td>
<td><input data-ang-unit="${i}" value="${esc(p.unit||"")}"></td>
<td><input data-ang-preis="${i}" type="number" step=".01" value="${p.preis||0}"></td>
<td class="small" style="text-align:right;white-space:nowrap" data-ang-betrag="${i}">${money(angBetrag(p))}</td>
<td style="white-space:nowrap"><button type="button" class="${angMatHatDaten(p)?"blue":((angMatGruppenStand[i]&&angMatGruppenStand[i].rolle==="haupt"&&Object.keys(angMatVorschlagFuer(i).vorschlag).length)?"green":"gray")}" data-ang-mat="${i}" style="padding:6px 8px" title="Materialdaten dieser Position (optional) – 💡 = Vorschlag vorhanden, ↳ = Zusatzposition einer Hauptposition">${angMatKnopfText(i)}</button><button type="button" class="gray" data-ang-meas="${i}" style="padding:6px 8px" title="Massaufnahme aus dieser Position anlegen">📐</button><button type="button" class="red" data-ang-del="${i}" style="padding:6px 8px">×</button></td>
</tr>
<tr data-ang-mat-row="${i}"${angMatOffen.has(i)?"":" hidden"}${versteckt?' style="display:none"':""}${sektionTitel?` data-ang-sek-row="${esc(sektionTitel)}"`:""}><td colspan="7">${angMatOffen.has(i)?angMatPanelHtml(p,i):""}</td></tr>`;
}
// ---- Offertposition: Materialfelder in der Oberfläche (v3.333) -----------------------------------------------------
// Je Position ein einklappbarer Bereich unter der Zeile. Angesprochen wird die Position über ihren Platz in angPositions (nicht
// über "pos": die Nummer kann doppelt oder leer sein). Vorschläge werden bei jedem Zeichnen NEU aus dem aktuellen Text gerechnet
// und nie gespeichert; übernommen wird nur, was angehakt und ausdrücklich bestätigt wird.
let angMatOffen=new Set();
function angMatListe(){
 return (typeof measurementMaterials!=="undefined"&&Array.isArray(measurementMaterials))?measurementMaterials:[];
}
// Der Offertanfang: Bezeichnung und Notiz der Offerte (die einzigen Kopftexte, die die Offerte speichert - der Einleitungstext eines
// importierten PDFs wird nicht mit abgelegt). Steht dort GENAU ein Werkstoff der Firma, wird er als Materialvorschlag angeboten.
function angMatKontext(){
 return [($("angTitle")&&$("angTitle").value)||"",($("angNote")&&$("angNote").value)||""].join("\n");
}
// Gruppen und Vorschläge werden bei jedem Zeichnen EINMAL frisch gerechnet (nie gespeichert).
let angMatGruppenStand=[];
function angMatGruppenNeu(){
 angMatGruppenStand=angMatGruppen(angPositions,angMatListe());
 return angMatGruppenStand;
}
function angMatVorschlagFuer(i){
 const g=angMatGruppenStand[i]||{rolle:"davor"};
 return angMatVorschlag(angPositions[i],angMatListe(),{kontext:angMatKontext(),rolle:g.rolle});
}
function angMatPosName(i){
 const p=angPositions[i]||{};
 const nr=String(p.pos||"").trim();
 return "Zeile "+(i+1)+(nr?" (Pos. "+nr+")":" (ohne Nummer)");
}
function angMatGruppeText(i){
 const g=angMatGruppenStand[i];
 if(!g)return "";
 const abw=x=>x?(x.wert.toLocaleString("de-CH")+" mm"+(x.quelle==="feld"?" (Feld)":" (aus dem Text)")):"";
 if(g.rolle==="haupt"){
  const z=g.zusaetze.length?`Zusatzpositionen dieser Hauptposition: ${esc(g.zusaetze.map(angMatPosName).join(", "))} – sie zählen <b>nicht</b> als weitere Blechfläche.`:"Keine Zusatzpositionen bis zur nächsten Position mit Abwicklung.";
  return `<b>Hauptposition</b> mit Abwicklung ${esc(abw(g.abw))}. ${z}`;
 }
 if(g.rolle==="zusatz"){
  const zu=g.zuAbw?(g.abweichend?` Diese Position nennt „Zu Abwicklung mm ${esc(g.zuAbw.toLocaleString("de-CH"))}“ – <b>abweichend</b> von der Hauptposition, bitte prüfen.`:` Sie nennt „Zu Abwicklung mm ${esc(g.zuAbw.toLocaleString("de-CH"))}“ – passt zur Hauptposition.`):"";
  return `<b>Zusatzposition</b> zur Hauptposition ${esc(angMatPosName(g.haupt))} (Abwicklung ${esc(abw(g.abw))}).${zu} Werte werden bei der Hauptposition vorgeschlagen, nie hierher geschrieben.`;
 }
 return `Liegt <b>vor der ersten Position mit Abwicklung</b> – keiner Gruppe zugeordnet, kein Vorschlag.`;
}
function angMatZahlText(n){
 return (n===undefined||n===null||n==="")?"":String(n).replace(".",",");
}
function angMatFlaecheText(p){
 const r=angBlechflaeche(p);
 const f=x=>x.toLocaleString("de-CH",{maximumFractionDigits:4});
 if(r.status==="meter")return `Blechfläche (Vorschau): ${f(Number(p.quantity))} m × ${f(Number(p.abwicklung_mm)/1000)} m = <b>${f(r.m2)} m²</b>`;
 if(r.status==="flaeche")return `Menge ist bereits eine Fläche: <b>${f(r.m2)} m²</b> (Abwicklung wird nicht zusätzlich gerechnet)`;
 if(r.status==="einheit")return "Keine Flächenrechnung: die Einheit dieser Position ist nicht „m“ (Stunden, Pauschalen, Franken und Stück sind keine Blechfläche).";
 if(r.status==="keine_abwicklung")return "Für die Blechfläche fehlt eine gültige Abwicklung.";
 return "Für die Blechfläche fehlt eine gültige Menge.";
}
function angMatVorschlagHtml(p,i){
 const v=angMatVorschlagFuer(i);
 const zeilen=[];
 if(v.vorschlag.material){
  const her=v.vorschlag.material.herkunft==="offertanfang"?` <span class="small muted">– Materialvorschlag aus Offertanfang (Bezeichnung/Notiz der Offerte)</span>`:` <span class="small muted">– aus dem Text dieser Position</span>`;
  zeilen.push(`<label class="check-row"><input type="checkbox" data-ang-mat-vs="material" data-ang-mat-i="${i}" data-ang-mat-wert="${esc(v.vorschlag.material.id)}"> Material: <b>${esc(v.vorschlag.material.name)}</b>${her}</label>`);
 }
 if(v.vorschlag.staerke_mm!==undefined)zeilen.push(`<label class="check-row"><input type="checkbox" data-ang-mat-vs="staerke_mm" data-ang-mat-i="${i}" data-ang-mat-wert="${esc(v.vorschlag.staerke_mm)}"> Stärke: <b>${esc(angMatZahlText(v.vorschlag.staerke_mm))} mm</b> <span class="small muted">– aus dem Text dieser Position</span></label>`);
 if(v.vorschlag.abwicklung_mm!==undefined)zeilen.push(`<label class="check-row"><input type="checkbox" data-ang-mat-vs="abwicklung_mm" data-ang-mat-i="${i}" data-ang-mat-wert="${esc(v.vorschlag.abwicklung_mm)}"> Abwicklung: <b>${esc(angMatZahlText(v.vorschlag.abwicklung_mm))} mm</b> <span class="small muted">– aus dem Text dieser Position</span></label>`);
 const unklar=v.unklar.length?`<div class="small muted">Nicht eindeutig, deshalb kein Vorschlag: ${esc(v.unklar.join(" · "))}</div>`:"";
 const g=angMatGruppenStand[i];
 const p0=angPositions[i]||{};
 const materialHinweis=(g&&g.rolle==="haupt"&&!v.vorschlag.material&&(p0.material_id===undefined||p0.material_id===null||p0.material_id==="")&&!v.unklar.some(x=>/^Material/.test(x)))
   ?`<div class="small muted">Kein Material erkannt. Steht es am Anfang der Offerte? Dann in „Bezeichnung“ oder „Notiz“ der Offerte eintragen (z. B. „Kupferblech“) – es wird dann als Vorschlag angeboten.</div>`:"";
 if(!zeilen.length)return unklar+materialHinweis;
 return `<div class="small" style="margin-top:8px"><b>Vorschlag aus dem Positionstext</b> – nichts ist gespeichert, bis du es bestätigst:</div>
${zeilen.join("")}
<button type="button" class="gray" data-ang-mat-uebernehmen="${i}" style="margin-top:4px">Ausgewählte übernehmen</button>${unklar}${materialHinweis}`;
}
function angMatPanelHtml(p,i){
 const liste=angMatListe();
 const hatId=p.material_id!==undefined&&p.material_id!==null&&p.material_id!=="";
 const bekannt=!hatId||liste.some(m=>String(m.id)===String(p.material_id));
 const optionen=liste.map(m=>`<option value="${esc(m.id)}"${hatId&&String(m.id)===String(p.material_id)?" selected":""}>${esc(m.name)}</option>`).join("");
 const warn=(!bekannt&&liste.length)?`<div class="small" style="color:var(--red)">Das gespeicherte Material gibt es in der Werkstoffliste dieser Firma nicht (mehr) – es wird beim Speichern entfernt.</div>`:"";
 return `<div class="ang-mat" style="padding:8px 4px 10px">
<div class="small muted" style="margin-bottom:6px">Optionale Materialdaten dieser Position (Werkstoff wie bei der Massaufnahme). Es wird nichts reserviert oder gebucht.</div>
<div class="small" style="margin-bottom:6px" data-ang-mat-gruppe="${i}">${angMatGruppeText(i)}</div>
<div class="grid">
<div><label>Material</label><select data-ang-mat-feld="material_id" data-ang-mat-i="${i}"><option value="">– kein Material –</option>${optionen}</select></div>
<div><label>Blechstärke (mm)</label><input data-ang-mat-feld="staerke_mm" data-ang-mat-i="${i}" inputmode="decimal" placeholder="z. B. 0,6" value="${esc(angMatZahlText(p.staerke_mm))}"></div>
<div><label>Abwicklung (mm)</label><input data-ang-mat-feld="abwicklung_mm" data-ang-mat-i="${i}" inputmode="decimal" placeholder="z. B. 500" value="${esc(angMatZahlText(p.abwicklung_mm))}"></div>
</div>${warn}
<div class="small" data-ang-mat-fehler="${i}" style="color:var(--red)"></div>
<div class="small" data-ang-mat-flaeche="${i}" style="margin-top:6px">${angMatFlaecheText(p)}</div>
<div data-ang-mat-vorschlag="${i}">${angMatVorschlagHtml(p,i)}</div>
</div>`;
}
function angMatHatDaten(p){
 return (p.material_id!==undefined&&p.material_id!==null&&p.material_id!=="")||p.staerke_mm!==undefined||p.abwicklung_mm!==undefined;
}
// Nur Vorschlag und Flächenzeile eines geöffneten Bereichs neu zeichnen (nach Änderung von Text, Menge, Einheit, Abwicklung).
function angMatTeileAktualisieren(i){
 const p=angPositions[i];
 const box=$("angPositionsBody");
 if(!p||!box)return;
 const vs=box.querySelector(`[data-ang-mat-vorschlag="${i}"]`);
 if(vs)vs.innerHTML=angMatVorschlagHtml(p,i);
 const fl=box.querySelector(`[data-ang-mat-flaeche="${i}"]`);
 if(fl)fl.innerHTML=angMatFlaecheText(p);
}
// Nach jeder Änderung, die Gruppen oder Vorschläge beeinflussen kann (Positionstext, Abwicklungsfeld, Offertanfang): Gruppen frisch
// rechnen und in allen sichtbaren Teilen neu zeigen - Knopf-Kennzeichnung aller Positionen, Gruppenzeilen und Vorschläge offener Bereiche.
function angMatAlleAktualisieren(){
 const box=$("angPositionsBody");
 if(!box)return;
 angMatGruppenNeu();
 angPositions.forEach((p,i)=>{
  const k=box.querySelector(`[data-ang-mat="${i}"]`);
  if(k){k.className=angMatHatDaten(p)?"blue":(angMatGruppenStand[i]&&angMatGruppenStand[i].rolle==="haupt"&&Object.keys(angMatVorschlagFuer(i).vorschlag).length?"green":"gray");k.textContent=angMatKnopfText(i)}
  const gz=box.querySelector(`[data-ang-mat-gruppe="${i}"]`);
  if(gz)gz.innerHTML=angMatGruppeText(i);
  if(angMatOffen.has(i))angMatTeileAktualisieren(i);
 });
}
// Beschriftung des Knopfes: 🧱 allein; 💡 = es gibt einen Vorschlag; ↳ = Zusatzposition einer Hauptposition.
function angMatKnopfText(i){
 const g=angMatGruppenStand[i];
 if(g&&g.rolle==="zusatz")return "🧱↳";
 if(g&&g.rolle==="haupt"&&Object.keys(angMatVorschlagFuer(i).vorschlag).length)return "🧱💡";
 return "🧱";
}
["angTitle","angNote"].forEach(id=>{
 if($(id))$(id).addEventListener("input",()=>{if(angPositions.length)angMatAlleAktualisieren()});
});
if($("angPositionsBody")){
 $("angPositionsBody").addEventListener("click",e=>{
  const tg=e.target.closest?e.target.closest("[data-ang-mat]"):null;
  if(tg){
   const i=Number(tg.dataset.angMat);
   if(angMatOffen.has(i))angMatOffen.delete(i);else angMatOffen.add(i);
   const zeile=$("angPositionsBody").querySelector(`[data-ang-mat-row="${i}"]`);
   if(zeile){
    zeile.hidden=!angMatOffen.has(i);
    const zelle=zeile.firstElementChild;
    if(angMatOffen.has(i)&&zelle&&!zelle.innerHTML.trim()&&angPositions[i])zelle.innerHTML=angMatPanelHtml(angPositions[i],i);
   }
   return;
  }
  const ok=e.target.closest?e.target.closest("[data-ang-mat-uebernehmen]"):null;
  if(!ok)return;
  const i=Number(ok.dataset.angMatUebernehmen);
  const p=angPositions[i];
  if(!p)return;
  // Frisch aus dem aktuellen Text rechnen: stimmt der angezeigte Vorschlag nicht mehr, wird nichts übernommen.
  angMatGruppenNeu();
  const aktuell=angMatVorschlagFuer(i).vorschlag;
  const gewaehlt=Array.from(ok.closest("[data-ang-mat-vorschlag]").querySelectorAll("[data-ang-mat-vs]")).filter(c=>c.checked);
  let veraltet=false, uebernommen=0;
  gewaehlt.forEach(c=>{
   const k=c.dataset.angMatVs;
   const soll=k==="material"?(aktuell.material?String(aktuell.material.id):null):(aktuell[k]!==undefined?String(aktuell[k]):null);
   if(soll===null||soll!==c.dataset.angMatWert){veraltet=true;return}
   if(k==="material")p.material_id=aktuell.material.id;else p[k]=aktuell[k];
   uebernommen++;
  });
  if(veraltet)appAlert("Der Vorschlag passt nicht mehr zum aktuellen Positionstext. Es wurde nur übernommen, was noch stimmt.");
  else if(!gewaehlt.length)appAlert("Bitte zuerst anhaken, was übernommen werden soll.");
  if(uebernommen||veraltet){angMatOffen.add(i);renderAngPositionsTable()}
 });
 const feldAenderung=e=>{
  const t=e.target;
  if(!t.dataset||t.dataset.angMatFeld===undefined)return;
  const i=Number(t.dataset.angMatI);
  const p=angPositions[i];
  if(!p)return;
  const k=t.dataset.angMatFeld;
  const fehler=$("angPositionsBody").querySelector(`[data-ang-mat-fehler="${i}"]`);
  const meld=x=>{if(fehler)fehler.textContent=x};
  if(k==="material_id"){
   const id=t.value;
   if(id===""){delete p.material_id;meld("")}
   else{
    const treffer=angMatListe().find(m=>String(m.id)===String(id));
    if(treffer){p.material_id=treffer.id;meld("")}
    else{delete p.material_id;t.value="";meld("Dieses Material gehört nicht zur Werkstoffliste der Firma – nicht gespeichert.")}
   }
  }else{
   const leer=String(t.value).trim()==="";
   const [mi,ma]=k==="staerke_mm"?[ANG_MAT_STAERKE_MIN,ANG_MAT_STAERKE_MAX]:[ANG_MAT_ABW_MIN,ANG_MAT_ABW_MAX];
   const n=angMatZahl(t.value,mi,ma);
   if(leer){delete p[k];meld("")}
   else if(n===null){delete p[k];meld((k==="staerke_mm"?"Stärke":"Abwicklung")+": ungültig oder unplausibel (erlaubt "+angMatZahlText(mi)+" bis "+angMatZahlText(ma)+" mm) – nicht gespeichert.")}
   else{p[k]=n;meld("")}
  }
  angMatAlleAktualisieren();      // Abwicklungsfeld/Material ändern Gruppen und Vorschläge
 };
 $("angPositionsBody").addEventListener("input",feldAenderung);
 $("angPositionsBody").addEventListener("change",feldAenderung);
}
// ---- Ende Offertposition Materialfelder (Oberfläche)

function renderAngPositionsTable(){
 if(!$("angPositionsBody"))return;
 angMatGruppenNeu();
 if(!angPositions.length){
  $("angPositionsBody").innerHTML='<tr><td colspan="7" class="small">Noch keine Positionen. Foto aufnehmen und "Alle Fotos erkennen" klicken, oder manuell hinzufügen.</td></tr>';
 }else{
  // Aufeinanderfolgende Positionen mit demselben (nicht leeren) Abschnitts-
  // titel bilden EINEN klappbaren Block mit fett gedrucktem Titel; Positionen
  // ohne Titel (manuell hinzugefuegt, oder aus einer Erkennung vor v3.71 ohne
  // dieses Feld) erscheinen wie bisher ohne Kopfzeile.
  let html="",i=0;
  while(i<angPositions.length){
   const titel=(angPositions[i].abschnitt||"").trim();
   if(titel){
    let j=i;
    while(j<angPositions.length&&(angPositions[j].abschnitt||"").trim()===titel)j++;
    const offen=angSektionOffen.has(titel);
    html+=`<tr><td colspan="7"><div class="klapp-kopf ang-sek-kopf${offen?" open":""}" data-ang-sek-toggle="${esc(titel)}" role="button" tabindex="0"><b>${esc(titel)}</b><span class="klapp-chevron">›</span></div></td></tr>`;
    for(let k=i;k<j;k++)html+=angPositionZeileHtml(angPositions[k],k,!offen,titel);
    i=j;
   }else{
    html+=angPositionZeileHtml(angPositions[i],i,false,"");
    i++;
   }
  }
  $("angPositionsBody").innerHTML=html;
 }
 $("angPositionsSummary").textContent=angPositions.length?`${angPositions.length} Positionen`:"";
 if($("angPositionsTotal"))$("angPositionsTotal").textContent=angPositions.length?`Total: CHF ${money(angTotal())}`:"";
}
// Menge/Preis wirken sich auf den Betrag dieser Zeile und das Total aus -
// beide werden gezielt aktualisiert statt die ganze Tabelle neu zu
// rendern, damit der Eingabefokus beim Tippen nicht verloren geht.
function angAktualisiereBetrag(i){
 const p=angPositions[i];
 if(!p)return;
 const zelle=$("angPositionsBody").querySelector(`[data-ang-betrag="${i}"]`);
 if(zelle)zelle.textContent=money(angBetrag(p));
 if($("angPositionsTotal"))$("angPositionsTotal").textContent=`Total: CHF ${money(angTotal())}`;
}
if($("angPositionsBody")){
 $("angPositionsBody").addEventListener("input",e=>{
  const i=Number(e.target.dataset.angPos??e.target.dataset.angDesc??e.target.dataset.angQty??e.target.dataset.angUnit??e.target.dataset.angPreis);
  if(Number.isNaN(i)||!angPositions[i])return;
  let mengenAenderung=false;
  if(e.target.dataset.angPos!==undefined)angPositions[i].pos=e.target.value;
  else if(e.target.dataset.angDesc!==undefined)angPositions[i].description=e.target.value;
  else if(e.target.dataset.angUnit!==undefined)angPositions[i].unit=e.target.value;
  else if(e.target.dataset.angQty!==undefined){angPositions[i].quantity=Number(e.target.value)||0;mengenAenderung=true;}
  else if(e.target.dataset.angPreis!==undefined){angPositions[i].preis=Number(e.target.value)||0;mengenAenderung=true;}
  if(mengenAenderung)angAktualisiereBetrag(i);
  // v3.333/334: Text/Menge/Einheit ändern Vorschlag, Gruppen und Flächenvorschau - alte Vorschläge verfallen, neue werden gerechnet.
  if(e.target.dataset.angDesc!==undefined)angMatAlleAktualisieren();
  else if(angMatOffen.has(i))angMatTeileAktualisieren(i);
 });
 $("angPositionsBody").addEventListener("click",e=>{
  const del=e.target.closest("[data-ang-del]");
  if(del){angPositions.splice(Number(del.dataset.angDel),1);angMatOffen=new Set();renderAngPositionsTable();return}
  // v3.149: aus DIESER Position eine Massaufnahme - das gewohnte Formular,
  // vorbelegt. Vor dem Loeschen-Knopf abgefragt waere falsch herum, beide
  // sitzen in derselben Zelle und schliessen sich gegenseitig aus.
  const meas=e.target.closest("[data-ang-meas]");
  if(meas){angMassaufnahmeAusPosition(Number(meas.dataset.angMeas));return}
  const sek=e.target.closest("[data-ang-sek-toggle]");
  if(sek){
   const titel=sek.dataset.angSekToggle;
   const offen=!sek.classList.contains("open");
   if(offen)angSektionOffen.add(titel);else angSektionOffen.delete(titel);
   sek.classList.toggle("open",offen);
   $("angPositionsBody").querySelectorAll("[data-ang-sek-row]").forEach(tr=>{
    if(tr.dataset.angSekRow===titel)tr.style.display=offen?"":"none";
   });
  }
 });
 $("angPositionsBody").addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
  const k=e.target.closest?e.target.closest("[data-ang-sek-toggle]"):null;
  if(!k)return;
  e.preventDefault();
  k.click();
 });
}
if($("angPositionsKlapp")){
 $("angPositionsKlapp").addEventListener("click",e=>{
  const k=e.target.closest("[data-klapp='ang-positionen']");
  if(!k)return;
  const box=k.closest(".klapp");
  if(!box)return;
  const offen=!box.classList.contains("open");
  box.classList.toggle("open",offen);
  k.setAttribute("aria-expanded",offen?"true":"false");
 });
 $("angPositionsKlapp").addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
  const k=e.target.closest?e.target.closest("[data-klapp='ang-positionen']"):null;
  if(!k)return;
  e.preventDefault();
  k.click();
 });
}
if($("angAddPosition"))$("angAddPosition").onclick=()=>{
 angPositions.push({pos:"",description:"",quantity:0,unit:"",preis:0,abschnitt:""});
 renderAngPositionsTable();
};
if($("angDeleteAllPositions")){
 $("angDeleteAllPositions").onclick=async ()=>{
  if(!angPositions.length)return;
  if(!await appConfirm(`Wirklich alle ${angPositions.length} Position(en) löschen?`))return;
  angPositions=[];
  angMatOffen=new Set();
  renderAngPositionsTable();
 };
}

// ---- Fotos + Erkennung (recognizePhoto() unveraendert aus js/17) -
function renderAngPhotoGallery(){
 if(!$("angPhotoGallery"))return;
 $("angPhotoGallery").innerHTML=angPhotos.map((src,i)=>`<div class="sketch-thumb-wrap">
<img class="sketch-thumb" data-signed-src="${esc(src)}">
<div class="sketch-thumb-actions">
<button type="button" class="gray" data-recognize-ang-photo="${i}" title="Nur dieses Foto erkennen">🔎</button>
<button type="button" class="red" data-remove-ang-photo="${i}">✕</button>
</div>
</div>`).join("")||'<div class="small" style="color:var(--muted)">Noch kein Foto</div>';
 resolveSignedThumbnails($("angPhotoGallery"));
 if($("angRecognizeAll"))$("angRecognizeAll").hidden=angPhotos.length===0;
}
if($("angPhotoInput")){
 // v3.122: derselbe Handler fuer BEIDE Felder (Kamera und Galerie).
 fotoFelderVerdrahten("angPhotoInput",async e=>{
  const files=Array.from(e.target.files||[]);
  if(!files.length)return;
  for(const file of files){
   try{
    const pq=photoQualitySettings();const dataUrl=await resizeImageFile(file,pq.maxDim,pq.quality);
    angPhotos.push(dataUrl);
   }catch(err){appAlert("Foto konnte nicht geladen werden: "+err.message)}
  }
  fotoFelderLeeren("angPhotoInput");
  renderAngPhotoGallery();
 });
}
if($("angPhotoGallery")){
 $("angPhotoGallery").addEventListener("click",async e=>{
  const rm=e.target.closest("[data-remove-ang-photo]");
  if(rm){angPhotos.splice(Number(rm.dataset.removeAngPhoto),1);renderAngPhotoGallery();return}
  const rec=e.target.closest("[data-recognize-ang-photo]");
  if(rec){
   const i=Number(rec.dataset.recognizeAngPhoto);
   const src=angPhotos[i];
   if(!src)return;
   rec.disabled=true;
   $("angRecognizeStatus").textContent=`Erkenne Foto ${i+1} … das kann einige Sekunden dauern.`;
   try{
    const found=await erkenneEinzeln(src,()=>angPositions,l=>{angPositions=l;renderAngPositionsTable()},`Foto ${i+1}`);
    $("angRecognizeStatus").textContent=found===null?"":`${found.length} Position(en) aus Foto ${i+1} erkannt.`+(found.length?" Bitte prüfen.":ERKENNUNG_LEER);
   }catch(err){
    $("angRecognizeStatus").textContent="";
    appAlert("Fehler bei der Erkennung: "+(err.message||err));
   }
   rec.disabled=false;
  }
 });
}
if($("angRecognizeAll")){
 $("angRecognizeAll").onclick=async()=>{
  if(!angPhotos.length){appAlert("Bitte zuerst mindestens ein Foto hinzufügen.");return}
  $("angRecognizeAll").disabled=true;
  try{
   await erkenneAlleFotos(angPhotos,()=>angPositions,l=>{angPositions=l;renderAngPositionsTable()},t=>{$("angRecognizeStatus").textContent=t});
  }finally{$("angRecognizeAll").disabled=false}
 };
}

// ---- PDF -> Positionen (v3.39) --------------------------------------
// Auftrag: "aus dem pdf sollen jetzt auch die positionen importiert
// werden wie mit einem foto". recognizePhoto() (js/17-ausmass.js) ist
// dafuer UNVERAENDERT wiederverwendbar: die Edge Function
// extract-offer-positions liest den mimeType direkt aus der "data:"-URL
// und reicht ihn ungeprueft an Gemini weiter (resolveImage() hat fuer
// data:-URLs KEINE Bildformat-Einschraenkung, nur fuer https?://-URLs -
// am echten Funktionskoerper verifiziert). Es war also keine Aenderung
// an recognizePhoto() oder der Edge Function noetig, nur ein neuer Weg,
// eine gueltige "data:application/pdf;base64,..."-URL zu erzeugen.
//
// Eine eigene, KLEINERE Groessengrenze fuer die Erkennung selbst (anders
// als MAX_DATEI_BYTES/MAX_DATEI_TEXT, die 50 MB fuer den reinen Upload
// erlauben): Gemini begrenzt eine inline_data-Anfrage auf praktisch rund
// 20 MB, und Base64 blaeht die Rohbytes um ca. 1/3 auf - ein 50-MB-PDF
// wuerde die Erkennungsanfrage also verlaesslich zum Scheitern bringen.
const ANG_PDF_ERKENNEN_MAX_BYTES=15*1024*1024;
const ANG_PDF_ERKENNEN_MAX_TEXT="15 MB";

function fileZuDataUrl(fileOderBlob){
 return new Promise((resolve,reject)=>{
  const r=new FileReader();
  r.onload=()=>resolve(r.result);
  r.onerror=()=>reject(new Error("Die Datei konnte nicht gelesen werden."));
  r.readAsDataURL(fileOderBlob);
 });
}

// Liefert eine gueltige PDF-"data:"-URL fuer die KI-Erkennung - egal ob
// das PDF gerade erst ausgewaehlt wurde (angPdfNewFile, noch NICHT im
// Storage) oder bereits gespeichert ist (angPdfExisting, nur ein
// Speicherpfad). Fuer den gespeicherten Fall werden die echten Bytes
// ueber die signierte URL geholt (storageSignedUrl() + fetch() + Blob) -
// ein blosser Speicherpfad wuerde an resolveImage() scheitern (derselbe
// Fehlertyp, der bei bereits gespeicherten FOTOS in js/17-ausmass.js
// besteht, siehe CLAUDE.md - hier bewusst NICHT repliziert).
async function angPdfDatenUrlFuerErkennung(){
 let quelle=null;
 if(angPdfNewFile){
  quelle=angPdfNewFile;
 }else if(angPdfExisting&&angPdfExisting.path){
  const url=await storageSignedUrl(angPdfExisting.path);
  if(!url)throw new Error("PDF konnte nicht geladen werden.");
  let res;
  try{res=await fetch(url)}
  catch(e){throw new Error("Das gespeicherte PDF konnte nicht aus dem Speicher geladen werden (keine Verbindung zum Speicher). Bitte Verbindung prüfen und nochmals versuchen.")}
  if(!res.ok)throw new Error(`PDF konnte nicht geladen werden (Status ${res.status}).`);
  quelle=await res.blob();
 }
 if(!quelle)throw new Error("Kein PDF vorhanden.");
 const groesse=Number(quelle.size)||0;
 if(groesse>ANG_PDF_ERKENNEN_MAX_BYTES){
  throw new Error(`Das PDF ist für die Positionserkennung zu gross (${formatFileSize(groesse)}). Erlaubt sind höchstens ${ANG_PDF_ERKENNEN_MAX_TEXT} für die Erkennung (unabhängig vom 50-MB-Limit für den reinen Upload).`);
 }
 return await fileZuDataUrl(quelle);
}

// ---- PDF der Offerte (eigenes Dokument, kein Foto) -----------------
// dateiEndung()/dateiZuGross()/formatFileSize()/MAX_DATEI_TEXT kommen aus
// js/09-projekte.js (dort seit v2.48/v2.49 die eine Quelle fuer
// Groessengrenze/Formatierung, siehe CLAUDE.md 56/57) - lediglich als
// globale Funktionen aufgerufen, js/09 selbst wird nicht angefasst.
async function uploadAngebotPdf(projectId,file){
 if(dateiEndung(file)!=="pdf")throw new Error("Nur PDF-Dateien können hier hochgeladen werden.");
 if(typeof dateiZuGross==="function"&&dateiZuGross(file))
  throw new Error(`Die Datei ist zu gross (${formatFileSize(file.size)}). Erlaubt sind höchstens ${MAX_DATEI_TEXT} pro Datei.`);
 const path=`project-files/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.pdf`;
 const {error}=await sb.storage.from("measurements").upload(path,file,{contentType:"application/pdf",upsert:false});
 if(error)throw error;
 return path;
}
function renderAngPdfBereich(){
 const box=$("angPdfBereich");
 if(!box)return;
 if(angPdfNewFile){
  box.innerHTML=`<div class="report-row">
<div class="report-row-info"><b>📕 ${esc(angPdfNewFile.name)}</b><span>${formatFileSize(angPdfNewFile.size)} · wird beim Speichern hochgeladen</span></div>
<div class="report-row-actions">
<button type="button" class="gray" data-ang-pdf-erkennen title="Positionen aus diesem PDF erkennen">🔎 Positionen erkennen</button>
<button type="button" class="red" data-ang-pdf-entfernen title="Auswahl verwerfen">✕</button>
</div>
</div>`;
 }else if(angPdfExisting&&angPdfExisting.path){
  box.innerHTML=`<div class="report-row">
<div class="report-row-info"><b>📕 ${esc(angPdfExisting.name||"Offerte.pdf")}</b></div>
<div class="report-row-actions">
<button type="button" class="blue" data-ang-pdf-oeffnen>Öffnen</button>
<button type="button" class="gray" data-ang-pdf-erkennen title="Positionen aus diesem PDF erkennen">🔎 Positionen erkennen</button>
<button type="button" class="red" data-ang-pdf-entfernen title="Entfernen">✕</button>
</div>
</div>`;
 }else{
  box.innerHTML='<div class="small" style="color:var(--muted)">Noch kein PDF hochgeladen.</div>';
 }
}
if($("angPdfInput")){
 $("angPdfInput").addEventListener("change",e=>{
  const file=(e.target.files||[])[0];
  e.target.value="";
  if(!file)return;
  if(dateiEndung(file)!=="pdf"){appAlert("Bitte nur eine PDF-Datei auswählen.");return}
  if(typeof dateiZuGross==="function"&&dateiZuGross(file)){
   appAlert(`Die Datei ist zu gross (${formatFileSize(file.size)}). Erlaubt sind höchstens ${MAX_DATEI_TEXT} pro Datei.`);
   return;
  }
  angPdfNewFile=file;
  renderAngPdfBereich();
 });
}
if($("angPdfBereich")){
 $("angPdfBereich").addEventListener("click",async e=>{
  if(e.target.closest("[data-ang-pdf-entfernen]")){
   if(angPdfNewFile)angPdfNewFile=null;
   else angPdfExisting=null;
   renderAngPdfBereich();
   return;
  }
  const oeffnen=e.target.closest("[data-ang-pdf-oeffnen]");
  if(oeffnen&&angPdfExisting&&angPdfExisting.path){
   // Bucket ist privat: window.open() muss synchron im Klick bleiben,
   // sonst blockieren Popup-Blocker - gleiches Muster wie beim Oeffnen
   // einer Projektdatei (js/09-projekte.js, data-open-project-file).
   const fenster=window.open("","_blank");
   const url=await storageSignedUrl(angPdfExisting.path);
   if(url&&fenster)fenster.location.href=url;
   else if(fenster)fenster.close();
   if(!url)appAlert("PDF konnte nicht geöffnet werden.");
   return;
  }
  const erkennen=e.target.closest("[data-ang-pdf-erkennen]");
  if(erkennen){
   erkennen.disabled=true;
   if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="Erkenne Positionen aus dem PDF … das kann einige Sekunden dauern.";
   try{
    const dataUrl=await angPdfDatenUrlFuerErkennung();
    const found=await erkenneEinzeln(dataUrl,()=>angPositions,l=>{angPositions=l;renderAngPositionsTable()},"Dieses PDF");
    if($("angRecognizeStatus"))$("angRecognizeStatus").textContent=found===null?"":`${found.length} Position(en) aus dem PDF erkannt.`+(found.length?ERKENNUNG_PRUEFEN:ERKENNUNG_LEER.replace("Bei einem Foto: die ganze Seite, scharf und gut beleuchtet aufnehmen – oder, falls vorhanden, das Original-PDF verwenden.","Ist es ein gescanntes PDF (nur Bilder), hilft oft ein scharfes Foto der Seiten."));
   }catch(err){
    if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
    appAlert("Fehler bei der Erkennung: "+(err.message||err));
   }
   erkennen.disabled=false;
  }
 });
}

// ---- Projektauswahl (gleiche Bausteine wie bei Massaufnahme/Ausmass) --
function setAngProjectField(projId){
 angSelectedProjectId=projId||null;
 const proj=allProjects.find(x=>x.id===angSelectedProjectId);
 if($("angProjectSearch"))$("angProjectSearch").value=proj?proj.name:"";
 if($("angProjectSelectedLabel"))$("angProjectSelectedLabel").textContent=proj?"":"Kein Projekt ausgewählt";
}
if($("angProjectSearch")){
 $("angProjectSearch").addEventListener("input",e=>{
  const box=$("angProjectResults");
  box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-ang-project")).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
 });
 $("angProjectSearch").addEventListener("focus",e=>{
  e.target.select();
  const box=$("angProjectResults");
  box.innerHTML=searchProjects(e.target.value).map(p=>projektVorschlagHtml(p,"data-pick-ang-project")).join("");
  if(box.innerHTML)positionSuggest(e.target,box);
 });
}
if($("angProjectResults")){
 $("angProjectResults").addEventListener("click",e=>{
  const it=e.target.closest("[data-pick-ang-project]");if(!it)return;
  setAngProjectField(Number(it.dataset.pickAngProject));
  $("angProjectResults").innerHTML="";
 });
}

// ---- Formular oeffnen/anlegen ------------------------------------
function updateAngFormTitle(){
 const h2=$("angTitelH2");
 if(h2)h2.textContent="🧾 "+(typeof eintragAdresse==="function"
  ?eintragAdresse({project_id:angSelectedProjectId},$("angTitle").value)
  :($("angTitle").value||"Neue Offerte"));
 const meta=(typeof erstelltGeaendertText==="function")?erstelltGeaendertText(currentAngebotMeta):"";
 if($("angMetaInfo")){$("angMetaInfo").textContent=meta;$("angMetaInfo").hidden=!meta;}
}
function newAngebot(){
 isDirty=false;
 angEditReturnTo="cockpitAngebote";
 currentAngebotId=null;
 currentAngebotMeta={};
 $("angTitle").value="";
 $("angNote").value="";
 $("angDate").value=new Date().toISOString().slice(0,10);
 fotoFelderLeeren("angPhotoInput");
 if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
 angPhotos=[];
 renderAngPhotoGallery();
 angPositions=[];
 angPositionsAufklappen();
 renderAngPositionsTable();
 angPdfExisting=null;
 angPdfNewFile=null;
 if($("angPdfInput"))$("angPdfInput").value="";
 renderAngPdfBereich();
 setAngProjectField(cockpitProjectId);
 $("angebotEditModal").hidden=false;
 updateAngFormTitle();
}
function openAngebot(a){
 isDirty=false;
 currentAngebotId=a.id;
 currentAngebotMeta={created_by:a.created_by,created_at:a.created_at,updated_by:a.updated_by,updated_at:a.updated_at};
 $("angTitle").value=a.title||"";
 $("angNote").value=a.note||"";
 $("angDate").value=a.date||new Date().toISOString().slice(0,10);
 setAngProjectField(a.project_id);
 fotoFelderLeeren("angPhotoInput");
 angPhotos=(a.photo_paths&&a.photo_paths.length)?[...a.photo_paths]:(a.photo_path?[a.photo_path]:[]);
 renderAngPhotoGallery();
 angPositions=Array.isArray(a.positions)?a.positions.map(p=>({...p})):[];
 angPositionsAufklappen();
 renderAngPositionsTable();
 angPdfExisting=a.pdf_path?{path:a.pdf_path,name:a.pdf_name||"Offerte.pdf"}:null;
 angPdfNewFile=null;
 if($("angPdfInput"))$("angPdfInput").value="";
 renderAngPdfBereich();
 if($("angRecognizeStatus"))$("angRecognizeStatus").textContent="";
 angEditReturnTo="cockpitAngebote";
 $("angebotEditModal").hidden=false;
 updateAngFormTitle();
}
async function angEditZurueck(){
 if(angEditReturnTo==="cockpitAngebote"&&cockpitProjectId&&typeof zurueckInsCockpit==="function"){
  await zurueckInsCockpit("angebote");
 }else if($("startScreen")){
  showStart();
 }
 angEditReturnTo="cockpitAngebote";
}
if($("cancelAngebot")){
 $("cancelAngebot").onclick=async()=>{
  $("angebotEditModal").hidden=true;
  await angEditZurueck();
  isDirty=false;
 };
}
if($("startFromAngebotEdit"))$("startFromAngebotEdit").onclick=()=>{
 $("angebotEditModal").hidden=true;
 goToStart();
};

// ---- Speichern -----------------------------------------------------
// company_id/created_by/created_at/updated_by/updated_at werden NICHT
// mitgeschickt: company_id hat DEFAULT my_company_id(), die vier
// Verlaufsfelder setzt der Trigger set_creator_editor_meta_angebote
// serverseitig (gleiches Muster wie measurements/projects/reports seit
// v2.28/v2.29, siehe CLAUDE.md 36/37) - ein Client-Wert wuerde ohnehin
// ueberschrieben. Ein vom Client mitgeschickter Wert waere hier also
// wirkungslos, wird aber trotzdem gar nicht erst erzeugt.
if($("saveAngebot")){
 $("saveAngebot").onclick=async()=>{
  const title=$("angTitle").value.trim();
  if(!title){appAlert("Bitte eine Bezeichnung eingeben.");return}
  if(!angSelectedProjectId){appAlert("Bitte zuerst ein Projekt auswählen. Eine Offerte kann nur einem Projekt zugeordnet gespeichert werden.");return}
  // V1 bewusst ohne Offline-Warteschlange (anders als Massaufnahme/
  // Ausmass) - klare Absage statt stillem Zwischenspeichern, siehe
  // Abschlussbericht "Einschraenkungen".
  if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Diese Offerte"))return;
  $("saveAngebot").disabled=true;
  try{
   const photoUrls=[];
   for(const p of angPhotos){
    photoUrls.push(p.startsWith("data:")?await uploadMeasurementImage(p,"angebote-photo"):p);
   }
   // Neues PDF erst JETZT hochladen (nicht schon bei der Auswahl) - erst
   // wenn wirklich gespeichert wird, entsteht eine Storage-Datei. Ohne
   // Auswahl bleibt ein bereits gespeichertes PDF unveraendert stehen;
   // wurde es entfernt (angPdfExisting===null), wird pdf_path/pdf_name null.
   let pdfPath=angPdfExisting?angPdfExisting.path:null;
   let pdfName=angPdfExisting?angPdfExisting.name:null;
   if(angPdfNewFile){
    pdfPath=await uploadAngebotPdf(angSelectedProjectId,angPdfNewFile);
    pdfName=angPdfNewFile.name;
   }
   const payload={
    project_id:angSelectedProjectId,
    title,
    note:$("angNote").value,
    date:$("angDate").value||new Date().toISOString().slice(0,10),
    photo_path:photoUrls[0]||null,
    photo_paths:photoUrls,
    // v3.333: nur gültige Materialfelder speichern (material_id muss zur Werkstoffliste der Firma gehören, Zahlen plausibel).
    positions:angPositions.map(p=>angMatBereinigen(p,angMatListe())),
    pdf_path:pdfPath,
    pdf_name:pdfName
   };
   // 0 betroffene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1): ein von
   // RLS blockiertes Schreiben meldet in PostgREST keinen Fehler, es
   // betrifft still 0 Zeilen.
   if(currentAngebotId){
    const {data,error}=await sb.from("angebote").update(payload).eq("id",currentAngebotId).select();
    if(error)throw error;
    if(!data||!data.length){appAlert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");$("saveAngebot").disabled=false;return}
    currentAngebotMeta={...currentAngebotMeta,updated_by:data[0].updated_by,updated_at:data[0].updated_at};
   }else{
    const {data,error}=await sb.from("angebote").insert(payload).select();
    if(error)throw error;
    if(!data||!data.length){appAlert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");$("saveAngebot").disabled=false;return}
    currentAngebotId=data[0].id;
    currentAngebotMeta={created_by:data[0].created_by,created_at:data[0].created_at,updated_by:data[0].updated_by,updated_at:data[0].updated_at};
   }
   angPdfExisting=pdfPath?{path:pdfPath,name:pdfName}:null;
   angPdfNewFile=null;
   $("angebotEditModal").hidden=true;
   await angEditZurueck();
   isDirty=false;
  }catch(err){
   appAlert("Fehler beim Speichern: "+(err.message||err));
  }
  $("saveAngebot").disabled=false;
 };
}

// ---- Anlegen-Knopf und Cockpit-Zeilen-Aktionen --------------------
// Bewusst KEIN data-cockpit-new="angebot": der bestehende Handler in
// js/24 kennt nur "rep"/"meas" und wuerde jeden anderen Wert faelschlich
// in den Ausmass-Typenwaehler leiten (geprueft, siehe Abschlussbericht).
// Eigener Knopf mit eigenem Handler stattdessen.
if($("cockpitNeueOfferte")){
 $("cockpitNeueOfferte").onclick=()=>{
  if(!cockpitProjectId||!offerteZugriff)return;
  newAngebot();
 };
}
// Dritter, unabhaengiger Listener auf #cockpitWorkArea (js/24 und js/09
// haben dort bereits je einen eigenen - siehe CLAUDE.md, unproblematisch).
if($("cockpitWorkArea")){
 $("cockpitWorkArea").addEventListener("click",async e=>{
  const openA=e.target.closest("[data-open-project-angebot]");
  if(openA){
   const a=projectAngeboteCache.find(x=>x.id===Number(openA.dataset.openProjectAngebot));
   if(a)openAngebot(a);
   return;
  }
  const delA=e.target.closest("[data-del-project-angebot]");
  if(delA){
   if(!await appConfirm("Diese Offerte wirklich löschen?"))return;
   sb.from("angebote").delete().eq("id",Number(delA.dataset.delProjectAngebot)).then(({error})=>{
    if(error){appAlert("Fehler: "+error.message);return}
    if(typeof cockpitBereichAktualisieren==="function")cockpitBereichAktualisieren("angebote");
   });
  }
 });
}

// ===========================================================================
// v3.149  Massaufnahmen aus den Offertpositionen ableiten
// ===========================================================================
// Der Ablauf des Betriebs ist PROJEKT -> OFFERTE -> MASSAUFNAHME (CLAUDE.md).
// Bis hierher endete die Offerte aber bei sich selbst: was in ihr als Position
// steht, musste danach als Massaufnahme von Hand noch einmal angelegt und
// benannt werden - bei einer Offerte mit zwoelf Positionen zwoelfmal.
//
// Abgeleitet wird NUR, was in der Offerte wirklich steht: Bezeichnung, Menge,
// Einheit und die Positionsnummer. Es wird nichts gerechnet und nichts
// erfunden - die Massaufnahme entsteht LEER und wird danach wie gewohnt
// ausgemessen. Die Menge landet in der Notiz, nicht in einem Massfeld: was
// die Offerte als "12.5 m2" fuehrt, ist eine Schaetzung des Verkaufs, kein
// aufgenommenes Mass.

// Welche Woerter deuten auf welche Massaufnahme-Art? Bewusst eine kurze,
// handverlesene Liste statt einer Bewertung ueber den ganzen Katalog: hier
// geht es um dreizehn feste Arten, nicht um hunderte Katalogzeilen.
// Mehrwortige Eintraege sind Absicht - "einlaufblech konisch" muss
// "einlaufblech" schlagen, "dachrinne" das blosse "rinne".
const ANG_MEAS_WOERTER=Object.freeze({
 kamineinfassung:      ["kamineinfassung","kaminanschluss","kaminverkleidung","kamin","schornstein","camin"],
 dachfenstereinfassung:["dachfenstereinfassung","dachfenster","dachflaechenfenster","velux","fenstereinfassung"],
 lukarne:              ["lukarne","gaube","gaupe","seitenverkleidung"],
 einlaufblech_konisch: ["einlaufblech konisch","konisches einlaufblech","konisch"],
 einlaufblech_gerade:  ["einlaufblech gerade","einlaufblech","einlauf"],
 rinne_halbrund:       ["dachrinne","halbrundrinne","rinne halbrund","haengerinne","haengrinne"],
 rinne:                ["kastenrinne","rinne"],
 kehle:                ["kehlblech","kehlrinne","kehle"],
 mauerabdeckung:       ["mauerabdeckung","attikaabdeckung","mauerabdeck","attika","abdeckblech"],
 anschlussblech:       ["anschlussblech","ortabschluss","ortblech","seitenblech","windbrett","ortblende"],
 einfassung_rund:      ["einfassung rund","rundeinfassung","rohrdurchfuehrung","entlueftung","lueftungsrohr","durchfuehrung"],
 dachrandblech:        ["dachrandblech","dachrandabschluss","randblech","dachrand"],
 freies_profil:        ["freies profil","sonderprofil","sonderanfertigung"]
});
// Dieselbe Schreibweise fuer Suchtext und Stichwort: klein, ohne Umlaute,
// alles Uebrige zu Leerzeichen. Sonst faende "Dachrinne" kein "dachrinne"
// und "Kamin-Einfassung" kein "kamineinfassung".
function angMeasNorm(text){
 return String(text==null?"":text).toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .replace(/[^a-z0-9]+/g," ").trim();
}
// Welche Art passt zur Bezeichnung? Es gewinnt das LAENGSTE gefundene
// Stichwort - damit schlaegt "einlaufblech konisch" das kuerzere
// "einlaufblech", und "dachrinne" das in ihm enthaltene "rinne". Steht das
// Stichwort als ganzes Wort da, zaehlt es etwas mehr als mitten in einem
// anderen Wort.
//
// Wird nichts erkannt, ist die Art "skizze_foto" - die Auffangart ohne
// Register. Die Position faellt also NICHT unter den Tisch, und die Art
// laesst sich im Dialog von Hand richtigstellen.
function angMeasArtRaten(text){
 const t=angMeasNorm(text);
 if(!t)return {type:"skizze_foto",wort:"",erkannt:false};
 let best=null;
 Object.keys(ANG_MEAS_WOERTER).forEach(type=>{
  ANG_MEAS_WOERTER[type].forEach(wort=>{
   const n=angMeasNorm(wort);
   if(!n||t.indexOf(n)<0)return;
   const ganz=new RegExp("(^| )"+n.replace(/ /g,"\\s")+"( |$)").test(t);
   const punkte=n.length+(ganz?2:0);
   if(!best||punkte>best.punkte)best={type,wort,punkte};
  });
 });
 return best?{type:best.type,wort:best.wort,erkannt:true}
            :{type:"skizze_foto",wort:"",erkannt:false};
}
// Der Titel der Massaufnahme ist die Bezeichnung der Position. Ohne
// Bezeichnung (leere Zeile) bleibt die Positionsnummer - irgendetwas muss
// in der Liste stehen, sonst ist die Massaufnahme nicht wiederzuerkennen.
function angMeasTitel(p){
 const bez=String((p&&p.description)||"").trim();
 if(bez)return bez.slice(0,120);
 const nr=String((p&&p.pos)||"").trim();
 return nr?("Position "+nr):"Ohne Bezeichnung";
}
// Woher kommt diese Massaufnahme? Das steht in ihrer Notiz - nachvollziehbar
// auch Monate spaeter, ohne die Offerte danebenzulegen.
function angMeasNotiz(p){
 const teile=[];
 const nr=String((p&&p.pos)||"").trim();
 const titel=String($("angTitle")?$("angTitle").value:"").trim();
 teile.push("Aus Offerte"+(titel?" „"+titel+"“":"")+(nr?", Position "+nr:""));
 const menge=Number(p&&p.quantity)||0;
 if(menge){
  const einheit=String((p&&p.unit)||"").trim();
  teile.push("Offerte-Menge: "+menge+(einheit?" "+einheit:"")+" (Schaetzung, kein aufgenommenes Mass)");
 }
 return teile.join("\n");
}

// Welche Arten stehen ueberhaupt zur Wahl? Ein Modul, das noch in Entwicklung
// ist, faellt fuer Nicht-Administratoren weg - dieselbe Regel wie in der
// Auswahl "Neue Massaufnahme" (applyModuleTest, js/05a).
function angMeasArtenListe(){
 return Object.keys(MEAS_TYPE_LABELS).filter(t=>
   typeof modulGesperrt!=="function"||!modulGesperrt("meas:"+t));
}
function angMeasArtErlaubt(type){
 return angMeasArtenListe().indexOf(type)>=0?type:"skizze_foto";
}

// ---- Der Weg fuer EINE Position ------------------------------------------
// Sie oeffnet das gewohnte Formular mit vorbelegter Art, Bezeichnung und
// Projekt - gespeichert wird erst, wenn der Anwender speichert. Das
// Offerten-Formular wird dabei nur VERDECKT und kommt danach unveraendert
// zurueck (measEditReturnTo="angebotEdit", js/24).
function angMassaufnahmeAusPosition(i){
 const p=angPositions[i];
 if(!p)return;
 if(!angSelectedProjectId){
  appAlert("Diese Offerte gehört noch zu keinem Projekt.\n\nEine Massaufnahme braucht ein Projekt – bitte oben eines wählen.");
  return;
 }
 const geraten=angMeasArtRaten(p.description);
 const typ=angMeasArtErlaubt(geraten.type);
 if(typeof newMeasurementWithType!=="function")return;
 $("angebotEditModal").hidden=true;
 newMeasurementWithType(typ);
 // Ein gesperrtes Modul laesst das Formular nicht umstellen - dann lieber
 // zurueck in die Offerte als eine falsche Art anzulegen.
 if($("measType").value!==typ){$("angebotEditModal").hidden=false;return}
 if(typeof setMeasProjectField==="function")setMeasProjectField(angSelectedProjectId);
 $("measTitle").value=angMeasTitel(p);
 $("measNote").value=angMeasNotiz(p);
 measEditReturnTo="angebotEdit";
 if(typeof updateMeasFormTitle==="function")updateMeasFormTitle();
}

// ---- Der Sammel-Dialog fuer den ganzen Auftrag ----------------------------
let angMeasZeilen=[];          // {index,pos,titel,type,erkannt,schonDa,haken}
async function angMassaufnahmenDialog(){
 if(!angPositions.length){
  appAlert("Diese Offerte hat noch keine Positionen.");
  return;
 }
 if(!angSelectedProjectId){
  appAlert("Diese Offerte gehört noch zu keinem Projekt.\n\nMassaufnahmen brauchen ein Projekt – bitte oben eines wählen.");
  return;
 }
 // Was gibt es im Projekt schon? Gefragt wird die Datenbank, nicht ein
 // Zwischenspeicher: der Dialog laesst sich auch aus einer Offerte heraus
 // oeffnen, deren Projekt gerade nicht im Cockpit steht.
 let vorhanden=[];
 try{
  const {data}=await sb.from("measurements").select("title").eq("project_id",angSelectedProjectId);
  vorhanden=(data||[]).map(m=>angMeasNorm(m.title));
 }catch(e){ /* ohne Verbindung bleibt die Liste leer - siehe Hinweis unten */ }
 angMeasZeilen=angPositions.map((p,index)=>{
  const geraten=angMeasArtRaten(p.description);
  const titel=angMeasTitel(p);
  const schonDa=vorhanden.indexOf(angMeasNorm(titel))>=0;
  return {index,pos:String(p.pos||"").trim(),titel,
          type:angMeasArtErlaubt(geraten.type),erkannt:geraten.erkannt,wort:geraten.wort,
          schonDa,haken:!schonDa};
 });
 if($("angMeasFehler"))$("angMeasFehler").hidden=true;
 renderAngMeasTabelle();
 $("angMeasModal").hidden=false;
}
function renderAngMeasTabelle(){
 const body=$("angMeasBody");
 if(!body)return;
 const arten=angMeasArtenListe();
 body.innerHTML=angMeasZeilen.map((z,i)=>`<tr>
<td><input type="checkbox" data-ang-meas-haken="${i}"${z.haken?" checked":""}></td>
<td class="small">${esc(z.pos)}</td>
<td>${esc(z.titel)}${z.schonDa?'<div class="small" style="color:var(--muted)">gibt es im Projekt schon – deshalb nicht angehakt</div>':""}</td>
<td><select data-ang-meas-art="${i}">${arten.map(t=>
  `<option value="${esc(t)}"${t===z.type?" selected":""}>${esc(MEAS_TYPE_LABELS[t])}</option>`).join("")}</select>
${z.erkannt?`<div class="small" style="color:var(--muted)">erkannt an „${esc(z.wort)}“</div>`
           :'<div class="small" style="color:var(--muted)">nichts erkannt – Auffangart, bitte prüfen</div>'}</td>
</tr>`).join("");
 const angehakt=angMeasZeilen.filter(z=>z.haken).length;
 const unklar=angMeasZeilen.filter(z=>z.haken&&!z.erkannt).length;
 if($("angMeasHinweis")){
  $("angMeasHinweis").textContent=`${angehakt} von ${angMeasZeilen.length} Positionen angehakt`
   +(unklar?` · bei ${unklar} davon konnte die App die Art nicht erkennen`:"");
 }
 if($("angMeasAnlegen"))$("angMeasAnlegen").disabled=!angehakt;
}
if($("angMeasBody")){
 $("angMeasBody").addEventListener("change",e=>{
  const h=e.target.closest?e.target.closest("[data-ang-meas-haken]"):null;
  if(h){angMeasZeilen[Number(h.dataset.angMeasHaken)].haken=h.checked;renderAngMeasTabelle();return}
  const a=e.target.closest?e.target.closest("[data-ang-meas-art]"):null;
  if(a)angMeasZeilen[Number(a.dataset.angMeasArt)].type=a.value;
 });
}
if($("angMeasAlle"))$("angMeasAlle").onclick=()=>{
 angMeasZeilen.forEach(z=>z.haken=true);renderAngMeasTabelle();
};
if($("angMeasKeine"))$("angMeasKeine").onclick=()=>{
 angMeasZeilen.forEach(z=>z.haken=false);renderAngMeasTabelle();
};
if($("angMeasAbbrechen"))$("angMeasAbbrechen").onclick=()=>{$("angMeasModal").hidden=true};
if($("angMassaufnahmenAbleiten"))$("angMassaufnahmenAbleiten").onclick=()=>angMassaufnahmenDialog();

if($("angMeasAnlegen"))$("angMeasAnlegen").onclick=async()=>{
 const fehler=$("angMeasFehler");
 if(fehler)fehler.hidden=true;
 const gewaehlt=angMeasZeilen.filter(z=>z.haken);
 if(!gewaehlt.length)return;
 if(typeof offlineSperrtSpeichern==="function"
    &&offlineSperrtSpeichern(gewaehlt.length+" Massaufnahme(n) anzulegen"))return;
 const knopf=$("angMeasAnlegen");
 knopf.disabled=true;
 const heute=new Date().toISOString().slice(0,10);
 const jetzt=new Date().toISOString();
 // project_id ist die einzige Zuordnung, die hier gesetzt wird - die Firma
 // haengt am Projekt (measurements hat keine eigene company_id), und die RLS
 // entscheidet, ob geschrieben werden darf.
 const zeilen=gewaehlt.map(z=>({
  project_id:angSelectedProjectId,
  type:z.type,
  title:z.titel,
  note:angMeasNotiz(angPositions[z.index]),
  date:heute,
  data:{},
  created_by:currentProfile?currentProfile.id:null,
  created_at:jetzt
 }));
 try{
  const {data,error}=await sb.from("measurements").insert(zeilen).select("id");
  // 0 geschriebene Zeilen gelten NICHT als Erfolg - die RLS kann stillschweigend
  // herausfiltern, und eine Erfolgsmeldung waere dann eine Luege.
  if(error||!data||!data.length){
   if(fehler){
    fehler.textContent=error
     ?("Die Massaufnahmen konnten nicht angelegt werden: "+error.message
       +(/permission|policy|row-level/i.test(error.message||"")
         ?" – dafür fehlt die Berechtigung in diesem Projekt."
         :""))
     :"Es wurde nichts angelegt. Fehlt die nötige Berechtigung?";
    fehler.hidden=false;
   }
   return;
  }
  $("angMeasModal").hidden=true;
  // v3.320: je Position eine Projekt-Leistung (angelegt oder vorhandene) und Verknuepfung. Scheitert das, bleiben die
  // Massaufnahmen bestehen - es wird ehrlich dazugesagt, nichts zurueckgerollt.
  let leiText="";
  const leiWunsch=!$("angMeasLeistungen")||$("angMeasLeistungen").checked;
  if(leiWunsch&&typeof leiAusOffertePositionen==="function"){
   if(!currentAngebotId){
    leiText="\n\nDie Offerte ist noch nicht gespeichert – deshalb wurden keine Projekt-Leistungen angelegt. Offerte speichern und die Massaufnahmen später über „Leistungen“ zuordnen.";
   }else if(data.length!==gewaehlt.length){
    leiText="\n\nProjekt-Leistungen wurden nicht angelegt (Antwort unvollständig). Das kannst du später unter „Leistungen“ nachholen.";
   }else{
    const lr=await leiAusOffertePositionen(currentAngebotId,angSelectedProjectId,gewaehlt.map((z,i)=>{
     const p=angPositions[z.index]||{};
     return {pos:p.pos,description:p.description,quantity:p.quantity,unit:p.unit,measurementId:data[i].id};
    }));
    if(lr.fehler)leiText="\n\nDie Projekt-Leistungen konnten nicht (vollständig) angelegt werden: "+lr.fehler+"\nDie Massaufnahmen sind trotzdem angelegt. Leistungen kannst du unter „Leistungen“ nachholen.";
    else leiText="\n\nLeistungen: "+lr.neu+" neu, "+lr.vorhanden+" vorhandene verwendet, "+lr.verknuepft+" verknüpft"+(lr.uebersprungen?(", "+lr.uebersprungen+" nicht eindeutig – bitte unter „Leistungen“ von Hand zuordnen"):"")+".";
    if(typeof cockpitProjectId!=="undefined"&&cockpitProjectId===angSelectedProjectId&&typeof cockpitBereichAktualisieren==="function")await cockpitBereichAktualisieren("leistungen");
   }
  }
  // Das Cockpit zeigt die neuen Massaufnahmen sofort, und die Aufgabenzahl
  // stimmt wieder: jede neue Massaufnahme ist eine offene Freigabe (v3.05).
  if(typeof cockpitBereichAktualisieren==="function"
     &&typeof cockpitProjectId!=="undefined"&&cockpitProjectId===angSelectedProjectId){
   await cockpitBereichAktualisieren("meas");
  }
  if(typeof aufgabenNeuLaden==="function")aufgabenNeuLaden();
  appAlert((data.length===1
   ?"1 Massaufnahme wurde im Projekt angelegt – noch ohne Masse."
   :data.length+" Massaufnahmen wurden im Projekt angelegt – noch ohne Masse.")+leiText);
 }catch(err){
  if(fehler){fehler.textContent="Fehler: "+((err&&err.message)||err);fehler.hidden=false}
 }finally{
  knopf.disabled=false;
 }
};

// v3.346: Kennzeichen „gilt“ setzen. Eine Spalte der Offerte, geschrieben mit den bestehenden Rechten (RLS prüft Firma, Freigabe und Recht edit);
// ein von RLS blockiertes UPDATE meldet keinen Fehler, sondern betrifft 0 Zeilen - deshalb wird das Ergebnis geprüft.
document.addEventListener("change",async e=>{
 const cb=e.target&&e.target.closest?e.target.closest("[data-ang-gilt]"):null;
 if(!cb)return;
 const id=Number(cb.dataset.angGilt), neu=cb.checked;
 cb.disabled=true;
 let ok=false;
 try{
  const {data,error}=await sb.from("angebote").update({gilt:neu}).eq("id",id).select("id");
  ok=!error&&Array.isArray(data)&&data.length>0;
 }catch(err){ok=false}
 cb.disabled=false;
 if(!ok){cb.checked=!neu;if(typeof appAlert==="function")appAlert("Die Auswahl konnte nicht gespeichert werden (keine Verbindung oder keine Berechtigung).");return}
 const a=projectAngeboteCache.find(x=>Number(x.id)===id);
 if(a)a.gilt=neu;
 angMengenZeileSetzen(projectAngeboteCache);
 const box=$("cockpitAngeboteBody");
 if(box&&typeof cockpitProjectId!=="undefined"&&cockpitProjectId)loadProjectAngebote(cockpitProjectId);
 if(typeof a2Zeichnen==="function")a2Zeichnen();
});
