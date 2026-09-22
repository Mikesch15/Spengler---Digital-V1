"use strict";
// ===========================================================================
// ANSICHT 2.0 (v3.150) - eine zweite Oberflaeche fuer dieselbe App
// ===========================================================================
// WAS DAS IST
// Der Einstieg in die App ist heute nach Modulen gegliedert (Projekte,
// Werkstatt, Lagerverwaltung, Einstellungen). Diese Ansicht gliedert ihn
// nach dem Arbeitsablauf: Heute - Projekte - Werkstatt - Lager - Mehr,
// mit den offenen Aufgaben als Startpunkt statt einer Begruessung.
//
// WAS DAS AUSDRUECKLICH NICHT IST
// Keine zweite App und kein zweiter Schreibweg. Diese Datei speichert
// nichts, loescht nichts und rechnet nichts aus. Sie zeigt an, was die App
// ohnehin geladen hat (allProjects, aufgabenListe, die Cockpit-Listen), und
// ruft fuer jede Handlung die BESTEHENDE Funktion auf:
//
//   Aufgabe erledigen  -> aufgabeAusfuehren()      (js/45-aufgaben.js)
//   Projekt oeffnen    -> openProjectCockpit()     (js/24-projekt-cockpit.js)
//   Werkstatt          -> werkstattOeffnen()       (js/51-werkstatt.js)
//   Lagerverwaltung    -> openSettingsTo(...)      (js/07-einstellungen.js)
//   Suche/Einstellungen/Feedback/Abmelden -> die vorhandenen Knoepfe
//
// Dadurch gelten hier unveraendert dieselbe Rechtepruefung, dieselbe Row
// Level Security, dieselbe Offline-Warteschlange und dieselben Rueckfragen
// wie in der klassischen Ansicht. Ein Fehler in dieser Datei kann eine
// falsche LISTE zeigen - er kann keine falschen Daten schreiben.
// Nachpruefbar: grep -nE "\.(insert|update|delete|upsert|rpc)\(" js/70-ansicht2.js
//
// DER WEG ZURUECK
// Der Schalter setzt ausschliesslich die Klasse "a2-an" am <html>-Element
// und merkt sich das pro Geraet. Die klassische Startseite wird dabei nicht
// umgebaut, sondern nur per CSS ausgeblendet (css/05-ansicht2.css) - kein
// Element wird entfernt, kein hidden-Attribut angefasst. Zurueckschalten
// ist deshalb wirklich ein Zurueck und nicht ein Wiederaufbau.
// ===========================================================================

const A2_SPEICHER="sd_ansicht2";
const A2_HINWEIS="sd_ansicht2Hinweis";

// v3.151: Die neue Ansicht ist die VORGABE. Massgeblich ist deshalb nicht
// "steht dort ja", sondern "steht dort nicht ausdruecklich nein" - wer sich
// in v3.150 bewusst fuer die klassische Ansicht entschieden hat, behaelt sie.
// Eine getroffene Wahl umzustossen, weil sich die Vorgabe geaendert hat,
// waere das Gegenteil einer Einstellung.
// Ohne Zugriff auf den Geraetespeicher (privates Fenster, gesperrte
// Seitendaten) gilt ebenfalls die Vorgabe.
function a2Aktiv(){
 try{ return localStorage.getItem(A2_SPEICHER)!=="nein" }catch(e){ return true }
}
// Der einmalige Hinweis beim ersten Start in der neuen Ansicht. Er erscheint
// genau so lange, bis er weggeklickt wurde - wer die Ansicht selbst
// eingeschaltet hat, braucht ihn nicht und bekommt ihn deshalb auch nicht.
function a2HinweisNoetig(){
 try{
  if(localStorage.getItem(A2_HINWEIS)==="weg")return false;
  return localStorage.getItem(A2_SPEICHER)===null;
 }catch(e){ return false }
}
function a2HinweisWeg(){
 try{ localStorage.setItem(A2_HINWEIS,"weg") }catch(e){}
 a2Zeichnen();
}
function a2Setzen(an){
 try{ localStorage.setItem(A2_SPEICHER,an?"ja":"nein") }catch(e){}
 a2Anwenden();
 if(an)a2Zeichnen();
 window.scrollTo(0,0);
}
function a2Anwenden(){
 document.documentElement.classList.toggle("a2-an",a2Aktiv());
 // Die Ablaufleiste sitzt im Cockpit und wird dort beim Laden gezeichnet.
 // Beim Umschalten muss sie mitgehen - sonst bliebe sie nach dem Wechsel in
 // die klassische Ansicht als fremder Balken im Projekt stehen.
 a2AblaufZeichnen();
}

// ---- Zustand --------------------------------------------------------------
// Bewusst ein Objekt und nur zwei Werte: welche Seite offen ist und was in
// der Projektsuche steht. Alles andere ist Anzeige aus den Daten der App.
const a2Zustand={seite:"heute",suche:""};

// ---- Navigation -----------------------------------------------------------
// Die Symbole sind gezeichnet, nicht als Emoji gesetzt: Emoji sehen auf jedem
// Geraet anders aus und wirken fuer eine Produktionssoftware verspielt.
const A2_SYMBOL={
 heute:'<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10v9h12v-9"/>',
 projekte:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 werkstatt:'<path d="M14.5 4.5a4.5 4.5 0 0 0-6 5.9L4 15v4h4l4.6-4.6a4.5 4.5 0 0 0 5.9-6L16 11l-3-3z"/>',
 lager:'<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
 mehr:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
function a2Symbol(k){
 return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" '
  +'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
  +'stroke-linejoin="round" aria-hidden="true">'+(A2_SYMBOL[k]||"")+'</svg>';
}

// Ob Werkstatt und Lagerverwaltung ueberhaupt erscheinen, entscheidet NICHT
// diese Datei. Beide Knoepfe der klassischen Startseite werden von der App
// selbst ein- und ausgeblendet (werkstattKnopfAktualisieren() in js/51,
// checkLagerZugriff() in js/68). Hier wird nur abgelesen, was dort bereits
// entschieden wurde - eine zweite Rechtepruefung waere eine zweite Wahrheit.
function a2KnopfSichtbar(id){
 const k=$(id);
 return !!k&&!k.hidden;
}
function a2Leisten(){
 const raus=[{k:"heute",name:"Heute"},{k:"projekte",name:"Projekte"}];
 if(a2KnopfSichtbar("navWerkstatt"))raus.push({k:"werkstatt",name:"Werkstatt",oeffnet:true});
 if(a2KnopfSichtbar("navLagerverwaltung"))raus.push({k:"lager",name:"Lager",oeffnet:true});
 raus.push({k:"mehr",name:"Mehr"});
 return raus;
}

// ---- kleine Helfer --------------------------------------------------------
// "1 Aufgabe" / "4 Aufgaben" - nicht "4 Aufgabe(n)". Eine Klammer im Satz
// ist der Verzicht darauf, den Satz zu Ende zu schreiben.
function a2Anzahl(n,einzahl,mehrzahl){ return n+" "+(n===1?einzahl:mehrzahl) }
function a2Kuerzel(profil){
 if(!profil)return "··";
 const v=String(profil.first_name||"").trim(), n=String(profil.last_name||"").trim();
 const k=(v.slice(0,1)+n.slice(0,1)).toUpperCase();
 return k||"··";
}
function a2Name(profil){
 if(!profil)return "Angemeldet";
 return `${profil.first_name||""} ${profil.last_name||""}`.trim()||"Angemeldet";
}
// Das Firmenlogo. Es wird NICHT ein zweites Mal aus dem Speicher geholt:
// applyCompanyName() (js/05) loest den privaten Speicherpfad bereits in eine
// signierte Adresse auf und setzt sie an #startLogo. Hier wird genau diese
// Adresse abgelesen - eine zweite Aufloesung waere eine zweite Abfrage und
// koennte einen anderen Stand zeigen.
function a2LogoQuelle(){
 const el=$("startLogo");
 if(!el||el.hidden)return "";
 return el.getAttribute("src")||"";
}
// Markenzeile: Logo und Firmenname. Ohne hinterlegtes Logo steht nur der
// Name da - ein Platzhalterkasten waere schlechter als nichts.
function a2MarkeHtml(klasse){
 const logo=a2LogoQuelle();
 const name=(typeof companyName!=="undefined"&&companyName)?companyName:"SPENGLER-DIGITAL";
 return `<div class="${klasse}">`
  +(logo?`<img src="${esc(logo)}" alt="${esc(name)}">`:"")
  +`<span>${esc(name)}</span></div>`;
}
function a2Datum(iso){
 if(!iso)return "";
 const d=new Date(iso);
 if(isNaN(d))return "";
 return d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear();
}
// Die Aufgaben der App sind bereits gefiltert und sortiert (js/45). Hier wird
// nur gelesen - nie neu abgeleitet, was als Naechstes dran ist.
function a2Aufgaben(){
 return (typeof aufgabenListe!=="undefined"&&Array.isArray(aufgabenListe))?aufgabenListe:[];
}
function a2Projekte(){
 return (typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
}
function a2AufgabenAktiv(){
 return typeof aufgabenAktiv!=="function"||aufgabenAktiv();
}

// ===========================================================================
// HEUTE
// ===========================================================================
function a2SeiteHeute(){
 const auf=a2Aufgaben();
 const dringend=auf.filter(a=>typeof aufgabenArt==="function"&&aufgabenArt(a.art).farbe==="rot").length;
 const laufend=a2Projekte().filter(p=>!p.archived).length;

 let html=a2MarkeHtml("a2-marke");

 // Der einmalige Hinweis nach der Umstellung. Er sagt, was sich geaendert
 // hat und wo der Weg zurueck steht - eine Ansicht, die sich ungefragt
 // aendert und nichts dazu sagt, ist eine Zumutung.
 if(a2HinweisNoetig()){
  html+=`<div class="a2-karte a2-karte-hinweis">
   <div class="a2-karte-titel">Die Ansicht ist neu</div>
   <p class="a2-karte-unter">Die App ist jetzt nach dem Arbeitsablauf
   gegliedert: unten die Leiste, hier deine offenen Aufgaben. Es sind
   dieselben Formulare, dieselben Daten, dieselben Rechte wie bisher –
   nur anders sortiert.</p>
   <p class="a2-karte-unter" style="margin-top:6px">Die gewohnte Ansicht ist
   unverändert da: <b>Mehr → Zurück zur klassischen Ansicht</b>.</p>
   <div class="a2-knopf-reihe">
    <button type="button" class="a2-knopf a2-k-blau" data-a2-tu="hinweisweg">Verstanden</button>
    <button type="button" class="a2-knopf a2-k-grau" data-a2-tu="klassisch">Lieber die gewohnte</button>
   </div></div>`;
 }

 // Das Zahlenband sagt in einer Zeile, wie der Tag aussieht. Alle drei
 // Zahlen stammen aus Listen, die ohnehin geladen sind - keine zusaetzliche
 // Abfrage, keine Schaetzung.
 if(a2AufgabenAktiv()){
  html+=`<div class="a2-zahlen">
   <div class="a2-zahl a2-z-blau"><b>${auf.length}</b><span>offen</span></div>
   <div class="a2-zahl a2-z-rot"><b>${dringend}</b><span>jetzt dran</span></div>
   <div class="a2-zahl a2-z-gruen"><b>${laufend}</b><span>Projekte</span></div>
  </div>`;
 }

 // Ohne Verbindung wird die Aufgabenliste NICHT geleert (js/45 laesst sie
 // stehen). Der Hinweis sagt deshalb, dass der Stand aelter sein kann -
 // "nichts offen" waere hier eine Behauptung, die niemand geprueft hat.
 if(typeof offlineIstOffline==="function"&&offlineIstOffline()){
  html+=`<div class="a2-hinweis a2-h-warnung"><b>Keine Verbindung</b>
   Die Liste zeigt den zuletzt geladenen Stand. Erfasstes wird gesammelt und
   übertragen, sobald wieder Netz da ist.</div>`;
 }

 html+='<div class="a2-abschnitt">';
 if(!a2AufgabenAktiv()){
  html+=`<div class="a2-leer">Der Arbeitsablauf ist für diese Firma
   ausgeschaltet. Es gibt deshalb keine Aufgabenliste – gearbeitet wird
   direkt über die Projekte.</div>`;
 }else if(!auf.length){
  html+=`<div class="a2-abschnitt-kopf"><h2>Meine Aufgaben</h2></div>
   <div class="a2-leer">Nichts offen. Alles, was dir zugeteilt ist, ist erledigt.</div>`;
 }else{
  html+=`<div class="a2-abschnitt-kopf"><h2>Meine Aufgaben</h2>
   <span class="a2-marke a2-m-grau">${esc(a2Anzahl(auf.length,"Aufgabe","Aufgaben"))}</span></div>`;
  html+='<div class="a2-liste-zwei">'+auf.map(a2AufgabeHtml).join("")+"</div>";
 }
 html+="</div>";

 // Zuletzt bearbeitete Projekte - aus derselben Liste wie die Projektseite,
 // nur nach Zeit statt nach Name sortiert.
 const letzte=a2Projekte().filter(p=>!p.archived)
  .slice().sort((x,y)=>String(y.updated_at||"").localeCompare(String(x.updated_at||"")))
  .slice(0,5);
 if(letzte.length){
  html+=`<div class="a2-abschnitt">
   <div class="a2-abschnitt-kopf"><h2>Zuletzt bearbeitet</h2>
    <button type="button" data-a2-tab="projekte">Alle Projekte ›</button></div>`
   +letzte.map(a2ProjektZeileHtml).join("")+"</div>";
 }
 return html;
}

// Eine Aufgabe. Titel, Farbe und Knopfbeschriftung kommen aus js/45 - dieselbe
// Quelle wie in der klassischen Ansicht, damit dort und hier nie zwei
// verschiedene Dinge stehen.
function a2AufgabeHtml(a){
 if(!a||typeof aufgabenArt!=="function")return "";
 const art=aufgabenArt(a.art);
 const b=(typeof aufgabenBeschriftung==="function")?aufgabenBeschriftung(a.m):{adresse:"Massaufnahme",zusatz:""};
 const zweiter=(a.art==="freigeben"||a.art==="erneut_freigeben")?""
  :`<button type="button" class="a2-knopf a2-knopf-klein a2-k-grau"
      data-a2-aufgabe="oeffnen" data-a2-id="${esc(a.m.id)}">Öffnen</button>`;
 return `<div class="a2-auf a2-auf-${esc(art.farbe)}">
  <div class="a2-auf-schritt">${esc(art.titel)}</div>
  <div class="a2-auf-titel">${esc(b.adresse)}</div>
  ${b.zusatz?`<div class="a2-auf-zusatz">${esc(b.zusatz)}</div>`:""}
  <div class="a2-knopf-reihe">
   <button type="button" class="a2-knopf a2-knopf-klein a2-k-blau"
     data-a2-aufgabe="${esc(a.art)}" data-a2-id="${esc(a.m.id)}">${esc(art.knopf)}</button>
   ${zweiter}
  </div>
 </div>`;
}

// ===========================================================================
// PROJEKTE
// ===========================================================================
function a2SeiteProjekte(){
 // Das Suchfeld steht AUSSERHALB von #a2ProjListe und wird beim Tippen
 // deshalb nicht neu gebaut. Wuerde es mitgezeichnet, verloere es bei jedem
 // Anschlag den Fokus - auf dem Handy klappt damit die Tastatur zu, und
 // ein Suchfeld, das sich nach einem Buchstaben schliesst, ist keines.
 return `<div class="a2-suche">
  <input id="a2Suche" type="search" placeholder="Adresse, Projekt, Auftrags-Nr."
   value="${esc(a2Zustand.suche)}" autocomplete="off" enterkeyhint="search"></div>
 <div id="a2ProjListe">${a2ProjListeHtml()}</div>
 <div class="a2-knopf-reihe">
  <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="projekteklassisch">
   ＋ Neues Projekt / Archiv</button></div>`;
}
// Gesucht wird mit projektPasstZuSuche() aus js/09 - genau derselbe Vergleich
// wie in der klassischen Projektliste und in den Auswahlfeldern. Eine zweite
// Suchregel waere eine zweite Wahrheit darueber, was ein Treffer ist.
function a2ProjListeHtml(){
 const q=a2Zustand.suche;
 const treffer=a2Projekte()
  .filter(p=>!p.archived&&(typeof projektPasstZuSuche!=="function"||projektPasstZuSuche(p,q)));
 if(!treffer.length){
  return `<div class="a2-leer">${q?"Kein Projekt passt zu dieser Suche.":"Noch keine Projekte."}</div>`;
 }
 return `<div class="a2-abschnitt-kopf"><h2>${esc(a2Anzahl(treffer.length,"Projekt","Projekte"))}</h2></div>`
  +'<div class="a2-liste-zwei">'+treffer.map(a2ProjektZeileHtml).join("")+"</div>";
}
function a2ProjektZeileHtml(p){
 const titel=(typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||"Projekt");
 const s=(typeof projektStatusInfo==="function")?projektStatusInfo(p):null;
 const unten=[p.name&&p.name!==titel?p.name:"",p.order_no?"Auftrag "+p.order_no:""]
  .filter(Boolean).join(" · ");
 return `<button type="button" class="a2-zeile" data-a2-projekt="${esc(p.id)}">
  <span class="a2-zeile-text"><b>${esc(titel)}</b>
   <span>${esc(unten||"—")}</span></span>
  ${s?`<span class="a2-marke a2-m-grau">${esc(s.icon+" "+s.label)}</span>`:""}
  <span class="a2-zeile-pfeil">›</span></button>`;
}

// ===========================================================================
// MEHR
// ===========================================================================
// Jeder Eintrag loest den vorhandenen Knopf der klassischen Ansicht aus.
// Deshalb steht hier keine einzige eigene Bedingung darueber, wer was darf -
// ein Eintrag erscheint genau dann, wenn sein Knopf dort sichtbar ist.
function a2SeiteMehr(){
 const eintraege=[
  {id:"suche",      zeichen:"🔍", text:"Suche",                 unter:"Projekte, Massaufnahmen, Rapporte"},
  {id:"einstell",   zeichen:"⚙️", text:"Einstellungen",         unter:"Firma, Katalog, Module"},
  {id:"anleitung",  zeichen:"📖", text:"Anleitung",             unter:"Das ganze Handbuch als PDF"},
  {id:"feedback",   zeichen:"💬", text:"Feedback geben",        unter:"Fehler melden, Wunsch äussern"}
 ];
 if(a2KnopfSichtbar("navAdminMeas"))
  eintraege.push({id:"adminmeas",zeichen:"📋",text:"Alle Massaufnahmen",unter:"Übersicht für die Firmenleitung"});
 if(a2KnopfSichtbar("navSystemAdmin"))
  eintraege.push({id:"sysadmin",zeichen:"⚙️",text:"System-Administration",unter:"Betreiber-Einstellungen"});

 const version=$("appVersion")?$("appVersion").textContent.trim():"";
 return eintraege.map(e=>`
  <button type="button" class="a2-zeile" data-a2-tu="${esc(e.id)}">
   <span class="a2-zeile-nr">${e.zeichen}</span>
   <span class="a2-zeile-text"><b>${esc(e.text)}</b><span>${esc(e.unter)}</span></span>
   <span class="a2-zeile-pfeil">›</span></button>`).join("")
 +`<div class="a2-abschnitt" style="margin-top:22px">
   <div class="a2-abschnitt-kopf"><h2>Ansicht</h2></div>
   <div class="a2-karte">
    <div class="a2-karte-titel">Neue Ansicht</div>
    <p class="a2-karte-unter">Du arbeitest gerade mit der neuen, nach dem
    Arbeitsablauf gegliederten Oberfläche. Die klassische Ansicht ist
    unverändert da – alle Formulare, Listen und Auswertungen sind in beiden
    dieselben.</p>
    <div class="a2-knopf-reihe">
     <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="klassisch">
      ↩ Zurück zur klassischen Ansicht</button></div>
   </div>
   <div class="a2-karte">
    <div class="a2-karte-titel">${esc(a2Name(typeof currentProfile!=="undefined"?currentProfile:null))}</div>
    <p class="a2-karte-unter">${esc(version)}</p>
    <div class="a2-knopf-reihe">
     <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-a2-tu="abmelden">
      🔓 Abmelden</button></div>
   </div>
  </div>`;
}

// ===========================================================================
// Zeichnen
// ===========================================================================
function a2Zeichnen(){
 if(!a2Aktiv())return;
 const schirm=$("a2Screen");
 if(!schirm||!$("a2Inhalt")||!$("a2Kopf")||!$("a2Leiste"))return;

 const leisten=a2Leisten();
 // Eine Seite, die es nicht (mehr) gibt - etwa weil die Werkstatt firmenweit
 // abgeschaltet wurde - faellt auf HEUTE zurueck statt leer zu bleiben.
 if(!leisten.some(e=>e.k===a2Zustand.seite))a2Zustand.seite="heute";

 const eintrag=leisten.find(e=>e.k===a2Zustand.seite);
 const profil=(typeof currentProfile!=="undefined")?currentProfile:null;
 $("a2Kopf").innerHTML=
  `<div class="a2-kopf-titel"><b>${esc(eintrag?eintrag.name:"Heute")}</b>`
  +(a2Zustand.seite==="heute"?`<span>${esc(a2Name(profil))}${typeof companyName!=="undefined"&&companyName?" · "+esc(companyName):""}</span>`:"")
  +`</div><div class="a2-kopf-ich" title="${esc(a2Name(profil))}">${esc(a2Kuerzel(profil))}</div>`;

 const offen=a2AufgabenAktiv()?a2Aufgaben().length:0;
 // Der Markenblock steht nur in der Seitenleiste (ab 1000px) - in der
 // unteren Leiste eines Handys ist kein Platz dafuer, und dort steht das
 // Logo ohnehin oben auf der Heute-Seite.
 $("a2Leiste").innerHTML=a2MarkeHtml("a2-marke-leiste")+leisten.map(e=>{
  const auf=a2Zustand.seite===e.k;
  const punkt=(e.k==="heute"&&offen)?`<span class="a2-punkt">${offen}</span>`:"";
  return `<button type="button" class="${auf?"ist-auf":""}" data-a2-tab="${esc(e.k)}">
   <i>${a2Symbol(e.k)}</i>${punkt}<span>${esc(e.name)}</span></button>`;
 }).join("");

 let inhalt="";
 if(a2Zustand.seite==="projekte")inhalt=a2SeiteProjekte();
 else if(a2Zustand.seite==="mehr")inhalt=a2SeiteMehr();
 else inhalt=a2SeiteHeute();
 $("a2Inhalt").innerHTML=inhalt;
}

// ===========================================================================
// Bedienung
// ===========================================================================
// Ein einziger Klick-Beobachter auf dem ganzen Schirm. Die Inhalte werden bei
// jeder Aenderung neu gezeichnet - einzeln angehaengte Handler waeren damit
// nach dem ersten Neuzeichnen tot.
document.addEventListener("click",async e=>{
 if(!a2Aktiv())return;

 const tab=e.target.closest("[data-a2-tab]");
 if(tab&&$("a2Screen")&&$("a2Screen").contains(tab)){
  const k=tab.getAttribute("data-a2-tab");
  const eintrag=a2Leisten().find(x=>x.k===k);
  // Werkstatt und Lager sind keine eigenen Seiten dieser Ansicht, sondern
  // die vorhandenen Arbeitsplaetze der App. Sie werden geoeffnet, nicht
  // nachgebaut - sonst gaebe es sie zweimal und nur eine waere gepflegt.
  if(eintrag&&eintrag.oeffnet){
   if(k==="werkstatt"&&$("navWerkstatt"))$("navWerkstatt").click();
   if(k==="lager"&&$("navLagerverwaltung"))$("navLagerverwaltung").click();
   return;
  }
  a2Zustand.seite=k;
  a2Zeichnen();
  window.scrollTo(0,0);
  return;
 }

 const projekt=e.target.closest("[data-a2-projekt]");
 if(projekt){
  const id=projekt.getAttribute("data-a2-projekt");
  if(typeof openProjectCockpit==="function"){
   // Die Startseite wird hier ABSICHTLICH nicht ausgeblendet. Das Cockpit
   // ist ein .modal und deckt sie ohnehin zu; bricht openProjectCockpit
   // dagegen ab (unbekannte Projekt-ID - js/24 kehrt dann still zurueck),
   // bleibt der Benutzer auf der Liste stehen statt vor einer leeren Seite.
   a2AusNeuerAnsicht=true;
   await openProjectCockpit(Number(id));
   if($("projectCockpitModal").hidden)a2AusNeuerAnsicht=false;
  }
  return;
 }

 const aufgabe=e.target.closest("[data-a2-aufgabe]");
 if(aufgabe){
  const art=aufgabe.getAttribute("data-a2-aufgabe");
  const id=aufgabe.getAttribute("data-a2-id");
  // Genau derselbe Weg wie in der klassischen Ansicht, samt Rueckfragen,
  // Offline-Sperre und serverseitiger Pruefung.
  if(typeof aufgabeAusfuehren==="function")await aufgabeAusfuehren(art,id);
  return;
 }

 const tu=e.target.closest("[data-a2-tu]");
 if(tu&&$("a2Screen")&&$("a2Screen").contains(tu)){
  const was=tu.getAttribute("data-a2-tu");
  if(was==="hinweisweg"){a2HinweisWeg();return}
  if(was==="klassisch"){a2Setzen(false);return}
  if(was==="projekteklassisch"&&$("startOpenProjects")){$("startOpenProjects").click();return}
  if(was==="suche"&&$("openGlobalSearch")){$("openGlobalSearch").click();return}
  if(was==="einstell"&&$("settings")){$("settings").click();return}
  if(was==="feedback"&&$("openFeedback")){$("openFeedback").click();return}
  if(was==="adminmeas"&&$("navAdminMeas")){$("navAdminMeas").click();return}
  if(was==="sysadmin"&&$("navSystemAdmin")){$("navSystemAdmin").click();return}
  if(was==="abmelden"&&$("logout")){$("logout").click();return}
  if(was==="anleitung"&&typeof openSettingsTo==="function"){openSettingsTo("general","anleitung");return}
  return;
 }
});

// Die Projektsuche tippt sich fluessig: neu gezeichnet wird nur die Liste,
// nicht das Feld - sonst verloere es bei jedem Anschlag den Fokus.
document.addEventListener("input",e=>{
 if(!a2Aktiv())return;
 if(!e.target||e.target.id!=="a2Suche")return;
 a2Zustand.suche=e.target.value;
 const liste=$("a2ProjListe");
 if(liste)liste.innerHTML=a2ProjListeHtml();
});

// Der Knopf auf der klassischen Startseite, der hierher fuehrt.
if($("a2Ein"))$("a2Ein").onclick=()=>a2Setzen(true);

// ===========================================================================
// Anschluss an die bestehende App
// ===========================================================================
// Drei bestehende Funktionen werden umhuellt statt veraendert: so steht in
// js/03, js/45 und js/24 keine Zeile ueber diese Ansicht, und die klassische
// Ansicht laeuft auch dann unveraendert weiter, wenn diese Datei fehlt.
(function a2Anschluss(){
 // Nach der Anmeldung und bei jeder Rueckkehr auf die Startseite.
 if(typeof showStart==="function"){
  const vorher=showStart;
  showStart=function(){ vorher.apply(this,arguments); a2Anwenden(); a2Zeichnen(); };
 }
 // Das Firmenlogo liegt in einem privaten Speicher und wird erst nach dem
 // Zeichnen in eine signierte Adresse aufgeloest (js/05, asynchron). Ohne
 // diesen Beobachter bliebe die Markenzeile bis zum naechsten Neuzeichnen
 // leer - also meist den ganzen Besuch lang.
 if(typeof MutationObserver==="function"&&$("startLogo")){
  new MutationObserver(()=>{ if(a2Aktiv())a2Zeichnen() })
   .observe($("startLogo"),{attributes:true,attributeFilter:["src","hidden"]});
 }
 // Sobald die Aufgabenliste neu geladen wurde (js/45 zeichnet dann die
 // klassische Karte - hier kommt die neue Ansicht dazu).
 if(typeof renderAufgaben==="function"){
  const vorher=renderAufgaben;
  renderAufgaben=function(){ vorher.apply(this,arguments); if(a2Aktiv())a2Zeichnen(); };
 }
 // Sobald die Listen eines Projekts geladen sind, steht fest, wo das Projekt
 // im Ablauf steht - erst dann laesst sich die Ablaufleiste zeichnen.
 if(typeof loadProjectCockpitData==="function"){
  const vorher=loadProjectCockpitData;
  loadProjectCockpitData=async function(){
   const r=await vorher.apply(this,arguments);
   a2AblaufZeichnen();
   return r;
  };
 }
})();

// Wurde das Cockpit aus der neuen Ansicht heraus geoeffnet? Dann fuehrt sein
// Zurueck-Knopf auch dorthin zurueck. Ohne das landete man in der
// KLASSISCHEN Projektliste - dem Schirm, den der Knopf seit je oeffnet,
// weil das bis v3.149 der einzige Weg ins Cockpit war.
let a2AusNeuerAnsicht=false;
(function a2CockpitZurueck(){
 const knopf=$("cockpitBack");
 if(!knopf)return;
 const vorher=knopf.onclick;
 knopf.onclick=function(ereignis){
  if(a2Aktiv()&&a2AusNeuerAnsicht){
   a2AusNeuerAnsicht=false;
   $("projectCockpitModal").hidden=true;
   // #startScreen wurde beim Oeffnen nie ausgeblendet - die neue Ansicht
   // steht also schon da. Neu gezeichnet wird trotzdem: im Cockpit kann
   // sich der Projektstatus geaendert haben.
   $("startScreen").hidden=false;
   a2Zeichnen();
   return;
  }
  // Sonst unveraendert der bisherige Weg (zurueck in die Projektliste).
  if(typeof vorher==="function")return vorher.call(this,ereignis);
 };
 // Der Sprung auf die Startseite beendet den Ausflug ebenfalls.
 const start=$("cockpitStart");
 if(start){
  const vorherStart=start.onclick;
  start.onclick=function(ereignis){
   a2AusNeuerAnsicht=false;
   if(typeof vorherStart==="function")return vorherStart.call(this,ereignis);
  };
 }
})();

// ===========================================================================
// Ablaufleiste im Projekt
// ===========================================================================
// Die eine Frage, die beim Oeffnen eines Projekts zuerst kommt: WO STEHT DAS?
// Der Arbeitsstand darunter zaehlt auf, WAS vorhanden ist - die Leiste sagt,
// wie weit es ist. Sie rechnet nichts Neues aus, sondern liest die Listen,
// die das Cockpit soeben geladen hat.
const A2_STATIONEN=[
 {k:"offerte",     name:"Offerte"},
 {k:"massaufnahme",name:"Mass­aufnahme"},
 {k:"freigabe",    name:"Freigabe"},
 {k:"ruesten",     name:"Rüsten"},
 {k:"montage",     name:"Montage"},
 {k:"ausmass",     name:"Ausmass"}
];
// Wie weit eine einzelne Massaufnahme ist. Die Zustandsnamen stammen aus
// js/44-workflow.js; ein unbekannter Wert zaehlt als "noch nicht angefangen"
// statt die ganze Leiste zum Absturz zu bringen.
const A2_WF_RANG={in_bearbeitung:0,freigegeben:1,zu_ruesten:1,geruestet:2,
                  zu_montieren:2,montiert:3,abgeschlossen:3};
function a2MessRang(m){
 // Eine verfallene Freigabe ist keine Freigabe - die Massaufnahme faellt
 // dadurch zurueck, genau wie im Arbeitsablauf selbst.
 if(m&&m.freigabe_verfallen)return 0;
 const r=A2_WF_RANG[m&&m.workflow_status];
 return (typeof r==="number")?r:0;
}
// Die drei Listen des Cockpits. Sie sind mit "let" auf oberster Ebene
// angelegt (js/01, js/63) und stehen deshalb NICHT als window.name zur
// Verfuegung - ein Zugriff ueber window[...] waere hier immer leer und die
// Ablaufleiste stuende dauerhaft auf der ersten Station. Deshalb werden sie
// beim Namen genannt; typeof faengt ab, dass eine davon fehlt (die Offerte
// gibt es nur mit Freigabe).
function a2Mess(){
 return (typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))
  ?projectMeasurementsCache:[];
}
function a2Ang(){
 return (typeof projectAngeboteCache!=="undefined"&&Array.isArray(projectAngeboteCache))
  ?projectAngeboteCache:[];
}
function a2Am(){
 return (typeof projectAusmassCache!=="undefined"&&Array.isArray(projectAusmassCache))
  ?projectAusmassCache:[];
}
// Welche Stationen ueberhaupt gezeigt werden. Ist der Arbeitsablauf
// firmenweit aus, gibt es die drei mittleren Stationen nicht - dann waere
// eine Leiste mit ewig offenen Schritten eine Luege.
function a2StationenFuerFirma(){
 const wf=(typeof workflowAktiv==="undefined")||workflowAktiv!==false;
 const offerte=a2KnopfSichtbar("cockpitStandAngeboteZeile");
 return A2_STATIONEN.filter(s=>{
  if(s.k==="offerte")return offerte;
  if(s.k==="freigabe"||s.k==="ruesten"||s.k==="montage")return wf;
  return true;
 });
}
function a2AblaufStand(){
 const mess=a2Mess(), ang=a2Ang(), am=a2Am();
 // Ohne Massaufnahmen ist keine der drei Ablauf-Stationen erreicht. Ohne
 // diese Zeile waere jede von ihnen "fertig" - eine leere Menge erfuellt
 // jede Bedingung, und das Projekt stuende faelschlich auf "montiert".
 const alleAb=r=>mess.length>0&&mess.every(m=>a2MessRang(m)>=r);
 return {
  offerte:ang.length>0,
  massaufnahme:mess.length>0,
  freigabe:alleAb(1),
  ruesten:alleAb(2),
  montage:alleAb(3),
  ausmass:am.length>0
 };
}
function a2AblaufZeichnen(){
 const box=$("a2Ablauf");
 if(!box)return;
 if(!a2Aktiv()){box.hidden=true;box.innerHTML="";return}
 const stationen=a2StationenFuerFirma();
 const stand=a2AblaufStand();
 // Die aktuelle Station ist die erste, die noch nicht fertig ist. Ist alles
 // fertig, ist keine "dran" - dann sind schlicht alle abgehakt.
 const jetzt=stationen.findIndex(s=>!stand[s.k]);
 box.hidden=false;
 box.innerHTML='<div class="a2-ablauf">'+stationen.map((s,i)=>{
  const fertig=stand[s.k], dran=(i===jetzt);
  const kl=fertig?"ist-fertig":(dran?"ist-jetzt":"");
  const z=fertig?"✓":(dran?"●":"○");
  return `<div class="a2-ablauf-st ${kl}">
   <div class="a2-ablauf-marke">${z}</div>
   <div class="a2-ablauf-text">${esc(s.name)}</div></div>`;
 }).join("")+"</div>";
}

// Beim Laden der Seite gilt, was zuletzt gewaehlt wurde. Gezeichnet wird
// erst nach der Anmeldung (ueber showStart) - vorher gibt es keine Daten.
a2Anwenden();
