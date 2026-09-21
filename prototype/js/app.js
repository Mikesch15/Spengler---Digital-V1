"use strict";
// ===========================================================================
// Spengler-DIGITAL 2.0 - PROTOTYP  ·  Rahmen, Navigation, Hilfsmittel
// ===========================================================================
// Kein Framework, kein Bauschritt - wie die bestehende App. Der Prototyp
// laesst sich damit als einzelne Datei oeffnen und im Browser beurteilen.
//
// Die Adresse traegt den Zustand (#/heute, #/projekt/3/produktion). Das ist
// hier nicht Ziererei: nur so tut die ZURUECK-TASTE des Geraets das, was ein
// Handwerker von ihr erwartet - und nur so laesst sich ein Bildschirm zum
// Zeigen verschicken.
// ===========================================================================

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>
 ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ---- kleine Helfer --------------------------------------------------------
function pProjekt(id){ return P_PROJEKTE.find(p=>String(p.id)===String(id))||null }
function pMitarbeiter(id){ return P_MITARBEITER.find(m=>m.id===id)||null }
function pName(id){ const m=pMitarbeiter(id); return m?m.name:"—" }
function pKurz(id){ const m=pMitarbeiter(id); return m?m.kurz:"–" }
function pIch(){ return P_MITARBEITER.find(m=>m.ich)||P_MITARBEITER[0] }

// Alle Teile eines Projekts, flach - Produktion und Werkstatt rechnen beide
// damit, und zwar mit DERSELBEN Funktion.
function pTeile(projekt){
 const raus=[];
 (projekt.massaufnahmen||[]).forEach(m=>(m.teile||[]).forEach(t=>
  raus.push(Object.assign({},t,{massaufnahme:m.titel,art:m.art,mid:m.id}))));
 return raus;
}
function pFortschritt(teile){
 const gesamt=teile.reduce((s,t)=>s+t.stueck,0);
 const fertig=teile.reduce((s,t)=>s+t.fertig,0);
 return {gesamt,fertig,prozent:gesamt?Math.round(fertig/gesamt*100):0};
}
function pProjektFortschritt(projekt){ return pFortschritt(pTeile(projekt)) }

// "1 Teil" / "4 Teile" - nicht "4 Teil(e)". Eine Klammer im Satz ist der
// Verzicht darauf, den Satz zu Ende zu schreiben.
function pAnzahl(n,einzahl,mehrzahl){ return n+" "+(n===1?einzahl:mehrzahl) }

// Datum wie in der Schweiz gesprochen, nicht wie in der Datenbank.
function pDatum(iso){
 if(!iso)return "";
 const d=new Date(iso+"T00:00:00");
 if(isNaN(d))return iso;
 const heute=new Date("2026-09-21T00:00:00");
 const tage=Math.round((d-heute)/86400000);
 if(tage===0)return "heute";
 if(tage===1)return "morgen";
 if(tage===-1)return "gestern";
 const txt=d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear();
 return tage>1&&tage<8?("in "+tage+" Tagen · "+txt):txt;
}
function pFranken(n){ return "CHF "+Number(n||0).toLocaleString("de-CH") }

// ---- Marken ---------------------------------------------------------------
const P_STAND={
 offen:    {text:"Offen",     farbe:"grau",  zeichen:"○"},
 arbeit:   {text:"In Arbeit", farbe:"blau",  zeichen:"●"},
 fertig:   {text:"Fertig",    farbe:"gruen", zeichen:"✓"},
 verfallen:{text:"Freigabe verfallen",farbe:"rot",zeichen:"!"}
};
function pMarke(stand){
 const s=P_STAND[stand]||P_STAND.offen;
 return `<span class="p-marke p-m-${s.farbe}">${s.zeichen} ${esc(s.text)}</span>`;
}

// ---- Ablaufleiste ---------------------------------------------------------
// Sie beantwortet die Frage, die beim Oeffnen eines Projekts zuerst kommt:
// WO STEHT DAS HIER? Alles davor ist abgehakt, eines ist dran, der Rest
// steht noch aus.
function pAblaufHtml(projekt){
 const jetzt=P_ABLAUF.findIndex(s=>s.k===projekt.phase);
 return '<div class="p-ablauf">'+P_ABLAUF.map((s,i)=>{
  const kl=i<jetzt?"ist-fertig":(i===jetzt?"ist-jetzt":"");
  const z=i<jetzt?"✓":(i===jetzt?"●":"○");
  return `<div class="p-ablauf-st ${kl}">
   <div class="p-ablauf-marke">${z}</div>
   <div class="p-ablauf-text">${esc(s.name)}</div></div>`;
 }).join("")+"</div>";
}
function pFortschrittHtml(f,beschriftung){
 return `<div class="p-fort">
  <div class="p-fort-kopf"><span>${esc(beschriftung||"Fertig")}</span>
   <span><b>${f.fertig}</b> von ${f.gesamt} Stück · ${f.prozent}%</span></div>
  <div class="p-balken${f.prozent>=100?" ist-fertig":""}"><i style="width:${f.prozent}%"></i></div>
 </div>`;
}

// ---- Navigation -----------------------------------------------------------
// Die Symbole sind gezeichnet, nicht als Emoji gesetzt. Emoji sehen auf
// jedem Geraet anders aus, sind bunt und wirken verspielt - fuer eine
// Produktionssoftware falsch. Diese hier sind schlichte Striche in der
// Textfarbe, also auch im blauen Zustand richtig.
const P_SYMBOL={
 heute:'<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10v9h12v-9"/>',
 projekte:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 werkstatt:'<path d="M14.5 4.5a4.5 4.5 0 0 0-6 5.9L4 15v4h4l4.6-4.6a4.5 4.5 0 0 0 5.9-6L16 11l-3-3z"/>',
 lager:'<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
 mehr:'<path d="M4 7h16M4 12h16M4 17h16"/>'
};
function pSymbol(k){
 return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" '
  +'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
  +'stroke-linejoin="round" aria-hidden="true">'+(P_SYMBOL[k]||"")+'</svg>';
}
const P_LEISTE=[
 {k:"heute",   name:"Heute"},
 {k:"projekte",name:"Projekte"},
 {k:"werkstatt",name:"Werkstatt"},
 {k:"lager",   name:"Lager"},
 {k:"mehr",    name:"Mehr"}
];

// Der Zustand der Oberflaeche. Bewusst EIN Objekt - im Prototyp soll man
// sehen koennen, woran etwas haengt.
const pZustand={seite:"heute", projektId:null, register:"uebersicht",
                massId:null, schritt:1, suche:"", werkSicht:"projekt", lagerSuche:""};

function pGehe(pfad){ location.hash="#/"+pfad }
function pZurueck(){ history.length>1?history.back():pGehe("heute") }

// Aus der Adresse den Zustand lesen. Unbekanntes landet auf HEUTE statt auf
// einer leeren Seite.
function pAdresseLesen(){
 const roh=(location.hash||"#/heute").replace(/^#\/?/,"");
 const t=roh.split("/").filter(Boolean);
 const s=t[0]||"heute";
 if(s==="projekt"&&t[1]){
  pZustand.seite="projekt";
  pZustand.projektId=t[1];
  pZustand.register=t[2]||"uebersicht";
  pZustand.massId=t[3]||null;
  if(!t[3])pZustand.schritt=1;
  return;
 }
 pZustand.seite=P_LEISTE.some(x=>x.k===s)?s:"heute";
 pZustand.projektId=null; pZustand.massId=null;
}

// ---- Kopfzeile und Leiste -------------------------------------------------
function pKopfZeichnen(){
 const z=pZustand;
 let titel="Spengler-DIGITAL", unter="", zurueck=false;
 if(z.seite==="projekt"){
  const p=pProjekt(z.projektId);
  titel=p?p.name:"Projekt"; unter=p?(p.adresse+" · Auftrag #"+p.nr):""; zurueck=true;
 }else{
  const e=P_LEISTE.find(x=>x.k===z.seite);
  titel=e?e.name:"Heute";
  unter=z.seite==="heute"?("Sonntag, 21. September · "+pIch().name):"";
 }
 $("pKopf").innerHTML=
  (zurueck?'<button class="p-kopf-zurueck" data-zurueck aria-label="Zurück">‹</button>':"")
  +`<div class="p-kopf-titel"><b>${esc(titel)}</b>${unter?`<span>${esc(unter)}</span>`:""}</div>`
  +`<div class="p-kopf-ich" title="${esc(pIch().name)}">${esc(pIch().kurz)}</div>`;
}
function pLeisteZeichnen(){
 const offen=P_AUFGABEN.length;
 $("pLeiste").innerHTML=P_LEISTE.map(e=>{
  const auf=(pZustand.seite===e.k)||(pZustand.seite==="projekt"&&e.k==="projekte");
  const punkt=(e.k==="heute"&&offen)?`<span class="p-punkt">${offen}</span>`:"";
  return `<button class="${auf?"ist-auf":""}" data-navi="${e.k}">
   <i>${pSymbol(e.k)}</i>${punkt}<span>${esc(e.name)}</span></button>`;
 }).join("");
}

// ---- Zeichnen -------------------------------------------------------------
function pZeichnen(){
 pAdresseLesen();
 pKopfZeichnen();
 pLeisteZeichnen();
 const ziel=$("pInhalt");
 const nach={heute:pHeuteHtml, projekte:pProjekteHtml, projekt:pProjektHtml,
             werkstatt:pWerkstattHtml, lager:pLagerHtml, mehr:pMehrHtml};
 const fn=nach[pZustand.seite]||pHeuteHtml;
 ziel.innerHTML=fn();
 // Manche Seiten fuellen eine Liste erst NACH dem Einsetzen - damit es nur
 // EINEN Weg gibt, wie sie entsteht (auch beim Tippen in der Suche). Der
 // Haken ist optional; fehlt er, passiert schlicht nichts.
 const danach={projekte:typeof pProjekteListeNeu==="function"?pProjekteListeNeu:null,
               lager:typeof pLagerListeNeu==="function"?pLagerListeNeu:null}[pZustand.seite];
 if(danach)danach();
 ziel.scrollTop=0;
 window.scrollTo(0,0);
}

// EIN Klickfaenger fuer die ganze Oberflaeche. Jede Schaltflaeche traegt
// ihre Absicht als data-Attribut - so gibt es keine verstreuten Handler,
// die beim Umbauen uebersehen werden.
document.addEventListener("click",e=>{
 const t=e.target.closest?e.target.closest("[data-navi],[data-zurueck],[data-gehe],[data-tu]"):null;
 if(!t)return;
 if(t.hasAttribute("data-zurueck")){pZurueck();return}
 if(t.dataset.navi){pGehe(t.dataset.navi);return}
 if(t.dataset.gehe){pGehe(t.dataset.gehe);return}
 if(t.dataset.tu){pTun(t.dataset.tu,t);return}
});
document.addEventListener("input",e=>{
 const t=e.target;
 if(t.id==="pProjektSuche"){pZustand.suche=t.value;pProjekteListeNeu();return}
 if(t.id==="pLagerSuche"){pZustand.lagerSuche=t.value;pLagerListeNeu();return}
});

// Alles, was der Prototyp NICHT wirklich tut, laeuft hier zusammen - an
// EINER Stelle, ehrlich benannt. Ein Prototyp, der so tut, als haette er
// gespeichert, beantwortet die falsche Frage.
function pTun(was,el){
 if(was==="register"){
  pGehe("projekt/"+pZustand.projektId+"/"+el.dataset.register);return;
 }
 if(was==="massauf"){
  pGehe("projekt/"+pZustand.projektId+"/aufmass/"+el.dataset.mass);return;
 }
 if(was==="schritt"){
  pZustand.schritt=Number(el.dataset.schritt)||1;pZeichnen();return;
 }
 if(was==="werksicht"){
  pZustand.werkSicht=el.dataset.sicht;pZeichnen();return;
 }
 pNochNicht(el.dataset.text||"Dieser Schritt");
}
function pNochNicht(text){
 alert(text+" ist im Prototyp noch nicht hinterlegt.\n\n"
  +"Der Prototyp zeigt die BEDIENUNG mit Beispieldaten – er speichert nichts "
  +"und rechnet nichts. Sobald die Struktur überzeugt, werden die bestehenden "
  +"Funktionen und die Supabase-Daten dahintergehängt.");
}

window.addEventListener("hashchange",pZeichnen);
window.addEventListener("DOMContentLoaded",()=>{
 if(!location.hash)location.hash="#/heute";
 pZeichnen();
});
