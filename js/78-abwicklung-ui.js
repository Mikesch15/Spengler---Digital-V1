"use strict";
// ===========================================================================
// Abwicklung: Oberflaeche, Ausgabe und Speichern (v3.188)
//
// Die Rechnung steht in js/77 und wird hier NICHT wiederholt - diese Datei
// liest Felder, zeichnet, exportiert und speichert. Jede Zahl, die hier
// erscheint, kommt aus abwRechne().
//
// BEIM LADEN EINER GESPEICHERTEN ABWICKLUNG WIRD NEU GERECHNET, aber die
// gespeicherten Kennzahlen bleiben daneben stehen, falls sie abweichen. Ein
// Zuschnitt, nach dem schon geschnitten wurde, darf nicht stillschweigend
// andere Zahlen bekommen, nur weil eine spaetere Version anders rechnet.
// ===========================================================================

const ABW_FELDER=["D","t","H","alpha","b","r","nahtLang","f","faktorA","faktorB","zugabeOben","lappen"];
let abwLetztes=null;        // das zuletzt gerechnete Ergebnis
let abwGespeichert=[];      // die Liste aus der Datenbank
let abwGeladenVon=null;     // id des geladenen Datensatzes (fuer den Vergleich)
// v3.191: Woher die Masse kommen, wenn die Abwicklung aus einer Massaufnahme
// heraus geoeffnet wurde. {measurementId, text, uebernommen:[...]}
let abwHerkunft=null;

function abwEl(k){ return (typeof $==="function")?$("abw_"+k):document.getElementById("abw_"+k) }

function abwFelderLesen(){
 const p={};
 ABW_FELDER.forEach(k=>{
  const el=abwEl(k);
  if(!el)return;
  p[k]=(k==="nahtLang")?(el.value==="ja"):el.value;
 });
 return p;
}
function abwFelderSetzen(p){
 const e=Object.assign({},ABW_STANDARD,p||{});
 ABW_FELDER.forEach(k=>{
  const el=abwEl(k);
  if(!el)return;
  el.value=(k==="nahtLang")?(e[k]?"ja":"nein"):String(e[k]);
 });
}

// ---- Zeichnen -------------------------------------------------------------
function abwPfad(punkte,zu){
 if(!punkte||!punkte.length)return "";
 return "M"+punkte.map(p=>abwRund(p[0])+","+abwRund(p[1])).join(" L")+(zu?" Z":"");
}
function abwRund(x){ return Math.round(Number(x)*1000)/1000 }

// Der Zuschnitt in Blechkoordinaten: x nach rechts, y nach oben. SVG rechnet
// y nach unten, deshalb wird einmal zentral gespiegelt statt an jeder
// einzelnen Stelle.
function abwSvg(r,opt){
 opt=opt||{};
 const rand=opt.rand===undefined?8:opt.rand;
 const alleY=r.kontur.map(p=>p[1]);
 const yMin=Math.min.apply(null,alleY), yMax=Math.max.apply(null,alleY);
 const w=r.breite, h=yMax-yMin;
 const flip=p=>[p[0],yMax-p[1]];
 const k=r.kontur.map(flip), bk=r.biegeSchweifbord.map(flip);
 const fl=r.falzLinien.map(l=>l.map(flip));
 const ein=r.einschnitte.map(l=>l.map(flip));
 const mm=opt.mm?' width="'+abwRund(w+2*rand)+'mm" height="'+abwRund(h+2*rand)+'mm"':' width="100%"';
 return `<svg xmlns="http://www.w3.org/2000/svg"${mm}
 viewBox="${-rand} ${-rand} ${abwRund(w+2*rand)} ${abwRund(h+2*rand)}"
 preserveAspectRatio="xMidYMid meet" class="abw-svg">
 <path d="${abwPfad(k,true)}" fill="none" stroke="#17202a" stroke-width="0.6"/>
 <path d="${abwPfad(bk,false)}" fill="none" stroke="#c62828" stroke-width="0.5" stroke-dasharray="4,2"/>
 ${fl.map(l=>`<path d="${abwPfad(l,false)}" fill="none" stroke="#1565c0" stroke-width="0.5" stroke-dasharray="4,2"/>`).join("")}
 ${ein.map(l=>`<path d="${abwPfad(l,false)}" fill="none" stroke="#7a8894" stroke-width="0.3"/>`).join("")}
</svg>`;
}

function abwVorschauZeichnen(r){
 const box=(typeof $==="function")?$("abwVorschau"):document.getElementById("abwVorschau");
 if(!box)return;
 if(!r||!r.ok){ box.innerHTML=`<p class="small">Keine Vorschau – die Masse sind noch nicht vollständig.</p>`; return }
 box.innerHTML=abwSvg(r)
  +`<div class="small abw-legende">
    <span class="abw-l abw-l-schnitt"></span> Zuschnitt
    <span class="abw-l abw-l-schweifbord"></span> Biegelinie Schweifbord
    <span class="abw-l abw-l-falz"></span> Falz
    <span class="abw-l abw-l-lappen"></span> Einschnitte
   </div>
   <div class="small" style="color:var(--muted)">Zuschnittbreite ${abwMm(r.breite)} · Umfang ${abwMm(r.L)} · Höhe an der Naht ${abwMm(r.hoeheMax)}</div>`;
}

function abwMm(x){ return Number(x).toFixed(2).replace(".",",")+" mm" }
function abwGrad(x){ return Number(x).toFixed(1).replace(".",",")+"°" }

function abwErgebnisZeichnen(r){
 const box=(typeof $==="function")?$("abwErgebnis"):document.getElementById("abwErgebnis");
 if(!box)return;
 if(!r||!r.ok){ box.innerHTML=""; return }
 box.innerHTML=`<table class="abw-tabelle">
  <tr><td>Zuschnittbreite</td><td>${abwMm(r.breite)}</td></tr>
  <tr><td>Umfang neutrale Faser</td><td>${abwMm(r.L)}</td></tr>
  <tr><td>Höhe max (an der Naht)</td><td>${abwMm(r.hoeheMax)}</td></tr>
  <tr><td>Höhe min</td><td>${abwMm(r.hoeheMin)}</td></tr>
  <tr><td>Schweifbord-Zugabe</td><td>${abwMm(r.zugMin)}</td></tr>
  <tr><td>Biegewinkel Schweifbord</td><td>${abwGrad(r.betaMinGrad)} … ${abwGrad(r.betaMaxGrad)}</td></tr>
  <tr><td>Bord fertig (rechnerisch)</td><td>${abwMm(r.bFertigMin)} … ${abwMm(r.bFertigMax)}</td></tr>
  <tr><td>Streckung Schweifbord-Rand</td><td>${(r.streckung*100).toFixed(1).replace(".",",")} %</td></tr>
 </table>`;
}

// v3.191: Was aus der Massaufnahme kam - und was NICHT. Eine Uebernahme,
// die nicht sagt, welche Felder sie gesetzt hat, laesst den Anwender raten,
// welche Zahl er noch pruefen muss.
function abwHerkunftHtml(){
 if(!abwHerkunft)return "";
 const alle=["Ø Standrohr","Winkel Dach/Rohr","Materialstärke","Rohrhöhe (Richtwert)","Schweifbord-Breite (Richtwert)"];
 const da=abwHerkunft.uebernommen||[];
 const fehlt=alle.filter(x=>da.indexOf(x)<0);
 return `<div class="abw-herkunft">
  <b>Aus der Massaufnahme:</b> ${esc(abwHerkunft.text||"")}
  <div class="small">Übernommen: ${da.length?esc(da.join(", ")):"nichts"}${
   fehlt.length?` · <b>nicht übernommen:</b> ${esc(fehlt.join(", "))} – bitte prüfen`:""}</div>
  <button type="button" class="kon-klein kon-k-grau" data-abw-herkunft-weg="1">Verbindung lösen</button>
 </div>`;
}
function abwHerkunftZeichnen(){
 const box=(typeof $==="function")?$("abwHerkunft"):document.getElementById("abwHerkunft");
 if(box)box.innerHTML=abwHerkunftHtml();
}

function abwMeldungZeigen(r){
 const m=(typeof $==="function")?$("abwMeldung"):document.getElementById("abwMeldung");
 if(!m)return;
 if(!r){ m.innerHTML=""; return }
 const teile=[];
 (r.fehler||[]).forEach(t=>teile.push(`<div class="abw-fehler">⚠️ ${esc(t)}</div>`));
 (r.warnungen||[]).forEach(t=>teile.push(`<div class="abw-warnung">${esc(t)}</div>`));
 m.innerHTML=teile.join("");
}

// EINE Stelle, die rechnet und zeichnet. Jede Feldaenderung ruft sie.
function abwAktualisieren(){
 const r=abwRechne(abwFelderLesen());
 abwLetztes=r.ok?r:null;
 abwMeldungZeigen(r);
 abwVorschauZeichnen(r);
 abwErgebnisZeichnen(r);
 return r;
}

// ---- Ausgabe --------------------------------------------------------------
// DXF, ASCII R12. Kurven als LWPOLYLINE-Ersatz: eine POLYLINE mit VERTEX je
// Stuetzpunkt - das liest jedes Programm, auch alte Zuschnittsoftware.
function abwDxfLinie(code,wert){ return code+"\n"+wert+"\n" }
function abwDxfPolylinie(punkte,layer,zu){
 let s=abwDxfLinie(0,"POLYLINE")+abwDxfLinie(8,layer)+abwDxfLinie(66,1)
      +abwDxfLinie(70,zu?1:0);
 punkte.forEach(p=>{
  s+=abwDxfLinie(0,"VERTEX")+abwDxfLinie(8,layer)
    +abwDxfLinie(10,abwRund(p[0]))+abwDxfLinie(20,abwRund(p[1]))+abwDxfLinie(30,0);
 });
 return s+abwDxfLinie(0,"SEQEND")+abwDxfLinie(8,layer);
}
function abwDxfText(r){
 let s=abwDxfLinie(0,"SECTION")+abwDxfLinie(2,"HEADER")
      +abwDxfLinie(9,"$INSUNITS")+abwDxfLinie(70,4)      // 4 = Millimeter
      +abwDxfLinie(0,"ENDSEC")
      +abwDxfLinie(0,"SECTION")+abwDxfLinie(2,"ENTITIES");
 s+=abwDxfPolylinie(r.kontur,"ZUSCHNITT",true);
 s+=abwDxfPolylinie(r.biegeSchweifbord,"BIEGELINIE_SCHWEIFBORD",false);
 r.falzLinien.forEach(l=>{ s+=abwDxfPolylinie(l,"BIEGELINIE_FALZ",false) });
 r.einschnitte.forEach(l=>{ s+=abwDxfPolylinie(l,"EINSCHNITT",false) });
 return s+abwDxfLinie(0,"ENDSEC")+abwDxfLinie(0,"EOF");
}

function abwDateiname(endung){
 const b=(typeof $==="function"&&$("abw_bezeichnung")&&$("abw_bezeichnung").value.trim())||"Abwicklung";
 return b.replace(/[^\wÄÖÜäöüß .-]/g,"_").slice(0,60)+"."+endung;
}
function abwHerunterladen(text,name,typ){
 try{
  const blob=new Blob([text],{type:typ});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  return true;
 }catch(e){ return false }
}

// ---- Schablone 1:1 --------------------------------------------------------
// Aufteilung auf A4 mit Ueberlappung, Passmarken, Seitennummern und einem
// 100-mm-Kontrollmass je Seite. Das Kontrollmass ist kein Schmuck: ohne
// Nachmessen weiss niemand, ob der Drucker wirklich 1:1 gedruckt hat, und
// eine um 4 % verkleinerte Schablone faellt erst am Blech auf.
const ABW_A4={breite:210,hoehe:297,rand:10,ueberlappung:10};
function abwSeiten(r){
 const nutzB=ABW_A4.breite-2*ABW_A4.rand-ABW_A4.ueberlappung;
 const nutzH=ABW_A4.hoehe-2*ABW_A4.rand-ABW_A4.ueberlappung-12;   // 12 mm Fuss
 const alleY=r.kontur.map(p=>p[1]);
 const yMin=Math.min.apply(null,alleY), yMax=Math.max.apply(null,alleY);
 const spalten=Math.max(1,Math.ceil(r.breite/nutzB));
 const zeilen=Math.max(1,Math.ceil((yMax-yMin)/nutzH));
 const seiten=[];
 for(let z=0;z<zeilen;z++)for(let sp=0;sp<spalten;sp++){
  seiten.push({nr:seiten.length+1, spalte:sp+1, zeile:z+1, spalten, zeilen,
   x0:sp*nutzB, y0:yMin+z*nutzH, breite:nutzB+ABW_A4.ueberlappung, hoehe:nutzH+ABW_A4.ueberlappung});
 }
 return seiten;
}
function abwSeiteSvg(r,seite){
 const yMaxSeite=seite.y0+seite.hoehe;
 const flip=p=>[p[0]-seite.x0, yMaxSeite-p[1]];
 const k=r.kontur.map(flip), bk=r.biegeSchweifbord.map(flip);
 const fl=r.falzLinien.map(l=>l.map(flip));
 const ein=r.einschnitte.map(l=>l.map(flip));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${seite.breite}mm" height="${seite.hoehe}mm"
 viewBox="0 0 ${seite.breite} ${seite.hoehe}">
 <path d="${abwPfad(k,true)}" fill="none" stroke="#000" stroke-width="0.35"/>
 <path d="${abwPfad(bk,false)}" fill="none" stroke="#000" stroke-width="0.3" stroke-dasharray="4,2"/>
 ${fl.map(l=>`<path d="${abwPfad(l,false)}" fill="none" stroke="#000" stroke-width="0.3" stroke-dasharray="2,2"/>`).join("")}
 ${ein.map(l=>`<path d="${abwPfad(l,false)}" fill="none" stroke="#000" stroke-width="0.2"/>`).join("")}
 <path d="M0,0 L8,0 M0,0 L0,8" stroke="#000" stroke-width="0.3"/>
 <path d="M${seite.breite},${seite.hoehe} L${seite.breite-8},${seite.hoehe} M${seite.breite},${seite.hoehe} L${seite.breite},${seite.hoehe-8}" stroke="#000" stroke-width="0.3"/>
</svg>`;
}
function abwDruckHtml(r){
 const seiten=abwSeiten(r);
 const name=(typeof $==="function"&&$("abw_bezeichnung")&&$("abw_bezeichnung").value.trim())||"Abwicklung";
 return seiten.map(s=>`<div class="abw-blatt">
  <div class="abw-blatt-kopf">${esc(name)} · Blatt ${s.nr} von ${seiten.length}
   (Spalte ${s.spalte}/${s.spalten}, Zeile ${s.zeile}/${s.zeilen})</div>
  <div class="abw-blatt-bild">${abwSeiteSvg(r,s)}</div>
  <div class="abw-blatt-fuss">
   <span class="abw-kontrollmass"></span>
   <span>Kontrollmass 100 mm – nachmessen. Druck auf <b>100 %</b>, nicht „an Seite anpassen“.</span>
  </div>
 </div>`).join("");
}
function abwDrucken(){
 const r=abwLetztes||abwAktualisieren();
 if(!r||!r.ok)return false;
 const box=(typeof $==="function")?$("abwDruck"):document.getElementById("abwDruck");
 if(!box)return false;
 box.innerHTML=abwDruckHtml(r);
 box.hidden=false;
 document.body.classList.add("abw-drucken");
 // Nach dem Druckdialog wieder aufraeumen - der Druckbereich darf nicht am
 // Bildschirm stehenbleiben.
 const weg=()=>{ box.hidden=true; box.innerHTML=""; document.body.classList.remove("abw-drucken");
                 window.removeEventListener("afterprint",weg) };
 window.addEventListener("afterprint",weg);
 if(typeof window.print==="function")window.print();
 return true;
}

// ---- Speichern ------------------------------------------------------------
function abwProjektWahl(){
 const sel=(typeof $==="function")?$("abw_projekt"):document.getElementById("abw_projekt");
 if(!sel)return;
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 const alt=sel.value;
 sel.innerHTML=`<option value="">– ohne Projekt –</option>`
  +liste.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.title||("Projekt "+p.id))}</option>`).join("");
 if(alt)sel.value=alt;
}

async function abwSpeichern(){
 const r=abwAktualisieren();
 if(!r.ok)return {ok:false,meldung:"Die Masse stimmen noch nicht – es wird nichts gespeichert."};
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const bez=(typeof $==="function"&&$("abw_bezeichnung"))?$("abw_bezeichnung").value.trim():"";
 const projSel=(typeof $==="function")?$("abw_projekt"):null;
 const projId=(projSel&&projSel.value)?Number(projSel.value):null;
 const satz={
  bezeichnung:bez||"Abwicklung",
  project_id:projId,
  // v3.191: Kommt die Abwicklung aus einer Massaufnahme, gehoert sie zu
  // GENAU dieser - sonst weiss spaeter niemand mehr, zu welchem Rohr der
  // Zuschnitt war.
  measurement_id:abwHerkunft?abwHerkunft.measurementId:null,
  parameter:r.eingaben,
  // Nur die Kennzahlen, nicht die 360 Stuetzpunkte: die Kontur laesst sich
  // aus den Parametern jederzeit wieder rechnen, und eine Kopie davon waere
  // eine zweite Wahrheit.
  ergebnis:{breite:r.breite,umfang:r.L,hoeheMax:r.hoeheMax,hoeheMin:r.hoeheMin,
            zugMin:r.zugMin,zugMax:r.zugMax,
            betaMinGrad:r.betaMinGrad,betaMaxGrad:r.betaMaxGrad,
            bFertigMin:r.bFertigMin,bFertigMax:r.bFertigMax,
            streckung:r.streckung},
  erstellt_von:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
 };
 const {data,error}=await sb.from("abwicklungen").insert(satz).select("*");
 if(error)return {ok:false,meldung:error.message};
 // Ein von RLS geblockter Schreibvorgang meldet keinen Fehler, er betrifft
 // still 0 Zeilen (CLAUDE.md 24.1).
 if(!data||!data.length)return {ok:false,meldung:"Nicht gespeichert – fehlt die nötige Berechtigung?"};
 abwGespeichert.unshift(data[0]);
 abwListeZeichnen();
 return {ok:true};
}

async function abwListeLaden(){
 if(typeof sb==="undefined")return;
 const {data,error}=await sb.from("abwicklungen")
  .select("id,bezeichnung,project_id,measurement_id,parameter,ergebnis,created_at")
  .order("created_at",{ascending:false}).limit(100);
 abwGespeichert=(!error&&Array.isArray(data))?data:[];
 abwListeZeichnen();
}
async function abwLoeschen(id){
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const {data,error}=await sb.from("abwicklungen").delete().eq("id",id).select("id");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nichts gelöscht – fehlt die nötige Berechtigung?"};
 abwGespeichert=abwGespeichert.filter(x=>String(x.id)!==String(id));
 abwListeZeichnen();
 return {ok:true};
}

function abwProjektName(id){
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 const p=liste.find(x=>String(x.id)===String(id));
 return p?(p.name||p.title||("Projekt "+p.id)):"";
}
function abwListeZeichnen(){
 const box=(typeof $==="function")?$("abwListe"):document.getElementById("abwListe");
 if(!box)return;
 if(!abwGespeichert.length){ box.innerHTML=`<p class="small">Noch nichts gespeichert.</p>`; return }
 box.innerHTML=abwGespeichert.map(a=>{
  const proj=abwProjektName(a.project_id);
  const e=a.ergebnis||{};
  return `<div class="abw-zeile">
   <div class="abw-zeile-text"><b>${esc(a.bezeichnung||"Abwicklung")}</b>
    <div class="small">${proj?esc(proj)+" · ":""}${e.breite?abwMm(e.breite):"–"}</div></div>
   <button type="button" class="kon-klein kon-k-blau" data-abw-laden="${esc(a.id)}">laden</button>
   <button type="button" class="kon-klein kon-k-grau" data-abw-doppeln="${esc(a.id)}">duplizieren</button>
   <button type="button" class="kon-klein kon-k-grau" data-abw-weg="${esc(a.id)}">löschen</button>
  </div>`;
 }).join("");
}

// Laden: die Parameter in die Felder, dann NEU rechnen. Weichen die frisch
// gerechneten Kennzahlen von den gespeicherten ab, steht das ausdruecklich
// da - stillschweigend andere Zahlen waeren das Schlimmste.
function abwLaden(id,alsKopie){
 const a=abwGespeichert.find(x=>String(x.id)===String(id));
 if(!a)return false;
 abwFelderSetzen(a.parameter||{});
 if(typeof $==="function"&&$("abw_bezeichnung"))
  $("abw_bezeichnung").value=(a.bezeichnung||"")+(alsKopie?" (Kopie)":"");
 if(typeof $==="function"&&$("abw_projekt"))$("abw_projekt").value=a.project_id?String(a.project_id):"";
 abwGeladenVon=alsKopie?null:a.id;
 abwHerkunft=a.measurement_id
  ? {measurementId:a.measurement_id,text:"gespeicherte Massaufnahme",uebernommen:[]}
  : null;
 abwHerkunftZeichnen();
 const r=abwAktualisieren();
 const e=a.ergebnis||{};
 const abweichung=[];
 if(r.ok&&e.breite&&Math.abs(e.breite-r.breite)>0.05)
  abweichung.push("Zuschnittbreite "+abwMm(e.breite)+" → "+abwMm(r.breite));
 // v3.190: auch die Hoehe. Sie hat sich mit der konstanten Zugabe geaendert -
 // ein vorher gespeicherter Plan traegt noch die alte, und das darf nicht
 // stillschweigend durchgehen.
 if(r.ok&&e.hoeheMax&&Math.abs(e.hoeheMax-r.hoeheMax)>0.05)
  abweichung.push("Höhe an der Naht "+abwMm(e.hoeheMax)+" → "+abwMm(r.hoeheMax));
 if(abweichung.length){
  const m=(typeof $==="function")?$("abwMeldung"):document.getElementById("abwMeldung");
  if(m)m.innerHTML+=`<div class="abw-warnung">Gespeichert war etwas anderes: ${esc(abweichung.join(" · "))}. Seit v3.190 ist die Zugabe über den ganzen Zuschnitt gleich. Bitte prüfen, bevor danach geschnitten wird.</div>`;
 }
 return true;
}

// ---- Einstieg aus einer Massaufnahme (v3.191) -----------------------------
// Setzt NUR die Felder, zu denen es dort wirklich eine Zahl gibt. Alles
// andere bleibt stehen, wie es war - es wird nichts geleert und nichts
// erfunden.
async function abwAusMassaufnahme(v){
 if(!v||typeof $!=="function")return false;
 await abwOeffnen();
 const w=v.werte||{};
 Object.keys(w).forEach(k=>{
  const el=abwEl(k);
  if(el&&w[k]!==undefined&&w[k]!==null&&w[k]!=="")el.value=String(w[k]);
 });
 if($("abw_bezeichnung")&&v.bezeichnung)$("abw_bezeichnung").value=v.bezeichnung;
 if($("abw_projekt")&&v.projectId)$("abw_projekt").value=String(v.projectId);
 abwHerkunft={measurementId:v.measurementId||null,
              text:v.herkunft||"",
              uebernommen:Array.isArray(v.uebernommen)?v.uebernommen:[]};
 abwHerkunftZeichnen();
 abwAktualisieren();
 return true;
}

// ---- Oeffnen und Schliessen ----------------------------------------------
async function abwOeffnen(){
 if(typeof $!=="function")return;
 const modal=$("abwicklungModal");
 if(!modal)return;
 if(!abwEl("D")||!abwEl("D").value)abwFelderSetzen(ABW_STANDARD);
 abwProjektWahl();
 modal.hidden=false;
 abwHerkunftZeichnen();
 abwAktualisieren();
 try{ await abwListeLaden() }catch(e){}
}

// ---- Ereignisse -----------------------------------------------------------
document.addEventListener("input",e=>{
 if(!e.target||!e.target.id||e.target.id.indexOf("abw_")!==0)return;
 if(e.target.id==="abw_bezeichnung"||e.target.id==="abw_projekt")return;
 abwAktualisieren();
});
document.addEventListener("change",e=>{
 if(e.target&&e.target.id==="abw_nahtLang")abwAktualisieren();
});

document.addEventListener("click",async e=>{
 if(e.target.closest("[data-abw-oeffnen]")){ await abwOeffnen(); return }
 const zu=e.target.closest("#closeAbwicklung");
 if(zu){ const m=$("abwicklungModal"); if(m)m.hidden=true; return }
 if(e.target.closest("#abwZuruecksetzen")){
  abwFelderSetzen(ABW_STANDARD);
  // Mit den Standardmassen stimmt die Herkunft nicht mehr - sie stehen zu
  // lassen waere eine Behauptung ueber Zahlen, die niemand uebernommen hat.
  abwHerkunft=null; abwHerkunftZeichnen();
  abwAktualisieren(); return;
 }
 if(e.target.closest("[data-abw-herkunft-weg]")){ abwHerkunft=null; abwHerkunftZeichnen(); return }
 if(e.target.closest("#abwDxf")){
  const r=abwLetztes||abwAktualisieren();
  if(r&&r.ok)abwHerunterladen(abwDxfText(r),abwDateiname("dxf"),"application/dxf");
  return;
 }
 if(e.target.closest("#abwSvg")){
  const r=abwLetztes||abwAktualisieren();
  if(r&&r.ok)abwHerunterladen(abwSvg(r,{mm:true}),abwDateiname("svg"),"image/svg+xml");
  return;
 }
 if(e.target.closest("#abwDrucken")){ abwDrucken(); return }
 if(e.target.closest("#abwSpeichern")){
  const r=await abwSpeichern();
  const m=$("abwMeldung");
  if(m&&!r.ok)m.innerHTML=`<div class="abw-fehler">⚠️ ${esc(r.meldung)}</div>`;
  else if(m)m.innerHTML=`<div class="abw-ok">Gespeichert.</div>`;
  return;
 }
 const laden=e.target.closest("[data-abw-laden]");
 if(laden){ abwLaden(laden.getAttribute("data-abw-laden"),false); return }
 const doppeln=e.target.closest("[data-abw-doppeln]");
 if(doppeln){ abwLaden(doppeln.getAttribute("data-abw-doppeln"),true); return }
 const weg=e.target.closest("[data-abw-weg]");
 if(weg){
  const a=abwGespeichert.find(x=>String(x.id)===String(weg.getAttribute("data-abw-weg")));
  if(a&&typeof confirm==="function"&&!confirm(`„${a.bezeichnung||"Abwicklung"}“ wirklich löschen?`))return;
  const r=await abwLoeschen(weg.getAttribute("data-abw-weg"));
  if(!r.ok&&typeof alert==="function")alert(r.meldung);
  return;
 }
});
