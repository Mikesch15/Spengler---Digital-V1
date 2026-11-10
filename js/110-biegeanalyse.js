"use strict";
// ===========================================================================
// Biegeanalyse - Oberflaeche (v3.441)
// ===========================================================================
// Seitenansicht einer Schwenkbiegemaschine mit echter Bewegung: Blech, Unter-/Klemmwange, Biegewange; abspielen, Schritt fuer
// Schritt oder mit dem Regler fahren. Rechnen tut js/108, die Maschinendaten kommen aus js/109. Geoeffnet wird sie aus dem
// Freien Profil (Register «Zeichnung»). Nichts wird gespeichert - es ist eine Planungshilfe; die Massaufnahme bleibt unberuehrt.
// ===========================================================================

const bgaS={
 offen:false,schenkel:[],profil:null,maschineId:"",t:0,laenge:0,titel:"",
 folge:[],auto:true,autoErgebnis:null,analyse:null,
 schritt:0,fortschritt:0,spielt:false,pauseBis:0,letzt:0,raf:0
};
function bgaMaschine(){return bmFinden(bgaS.maschineId)}
function bgaZahlText(n){return String(Math.round(n*10)/10).replace(".",",")}

// ---- Rechnen ---------------------------------------------------------------------------
function bgaVorbereiten(){
 bgaS.profil=bgaProfil(bgaS.schenkel);
 const m=bgaMaschine();
 bgaS.fehler=[];
 if(!m)bgaS.fehler.push("Keine Maschine gewählt – unter Einstellungen → Firma → Biegemaschinen eintragen.");
 else bgaMaschineFehler(m).forEach(f=>bgaS.fehler.push(f));
 if(!(bgaS.t>0))bgaS.fehler.push("Die Blechstärke fehlt – bitte unten eintragen.");
 if(!bgaS.profil.biegungen.length)bgaS.fehler.push("Das Profil hat keine Biegung.");
}
function bgaNeuRechnen(neuVorschlagen){
 bgaVorbereiten();
 bgaS.analyse=null;
 if(bgaS.fehler.length){bgaS.folge=[];bgaS.schritt=0;bgaS.fortschritt=0;return}
 const m=bgaMaschine();
 if(neuVorschlagen||bgaS.auto||!bgaS.folge.length){
  const r=bgaFolgeSuchen(bgaS.profil,m,bgaS.t);
  bgaS.autoErgebnis=r;
  if(r.ok)bgaS.folge=r.schritte.map(s=>({k:s.k,klemm:s.cfg.klemm,flip:s.cfg.flip}));
  else bgaS.folge=bgaS.profil.biegungen.map(k=>({k,klemm:"links",flip:false}));
  bgaS.auto=true;
 }
 bgaS.analyse=bgaFolgeAnalysieren(bgaS.profil,m,bgaS.t,bgaS.folge);
 if(bgaS.schritt>=bgaS.folge.length)bgaS.schritt=Math.max(0,bgaS.folge.length-1);
}

// ---- Bild ------------------------------------------------------------------------------
function bgaSzene(){
 const m=bgaMaschine(),a=bgaS.analyse;
 if(!m||!a||!a.schritte.length)return null;
 const s=a.schritte[Math.min(bgaS.schritt,a.schritte.length-1)];
 if(!s||!s.lage)return null;
 const winkel=s.theta*bgaS.fortschritt;
 return {m,s,pose:bgaPose(s.lage,m,bgaS.t,winkel),ende:bgaPose(s.lage,m,bgaS.t,s.theta),start:bgaPose(s.lage,m,bgaS.t,0),winkel};
}
function bgaBildHtml(){
 if(bgaS.fehler&&bgaS.fehler.length)return `<div class="info">${bgaS.fehler.map(esc).join("<br>")}</div>`;
 const sz=bgaSzene();
 if(!sz)return '<div class="small">Keine Biegung zu zeigen.</div>';
 const {m,pose,ende,start,s}=sz;
 // Ausschnitt: das Blech (Anfang und Ende der Bewegung) mit etwas Rand, mindestens die Umgebung der Biegekante
 const xs=[-170,130],ys=[-120,140];
 [pose,ende,start].forEach(p=>p.punkte.forEach(q=>{xs.push(q[0]);ys.push(q[1])}));
 const x0=Math.min(...xs)-15,x1=Math.max(...xs)+15,y0=Math.min(...ys)-15,y1=Math.max(...ys)+15;
 const W=x1-x0,H=y1-y0,pxW=340,sc=pxW/W,sicht=Math.max(bgaS.t,3/sc);
 const poly=(p,fill,stroke)=>`<polygon points="${p.map(q=>q[0].toFixed(2)+","+q[1].toFixed(2)).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
 const koll=pose.kollisionen,hat=n=>koll.some(k=>k.teil===n);
 const tools=pose.unter.map(p=>poly(p,hat("Unterwange")?"#f3b4ae":"#9aa7b3","#6b7a88")).join("")
  +pose.klemm.map(p=>poly(p,hat("Klemmwange")?"#f3b4ae":"#7d8b99","#566573")).join("")
  +pose.beam.map(p=>poly(p,hat("Biegewange")?"#f3b4ae":(s.theta>0?"#8fb8dc":"#9fd3bb"),s.theta>0?"#1769aa":"#16845c")).join("");
 const pts=pose.punkte;
 const linie=pts.map(q=>q[0].toFixed(2)+","+q[1].toFixed(2)).join(" ");
 const rot=pose.kollisionen.filter(k=>k.teil!=="Unterwange"&&k.teil!=="Klemmwange"||true).map(k=>k.schenkel);
 const rotSeg=[...new Set(rot)].map(j=>j<pts.length-1?`<line x1="${pts[j][0].toFixed(2)}" y1="${pts[j][1].toFixed(2)}" x2="${pts[j+1][0].toFixed(2)}" y2="${pts[j+1][1].toFixed(2)}" stroke="#d92d20" stroke-width="${(sicht*1.5).toFixed(2)}" stroke-linecap="butt" opacity=".85"/>`:"").join("");
 const geister=`<polyline points="${ende.punkte.map(q=>q[0].toFixed(2)+","+q[1].toFixed(2)).join(" ")}" fill="none" stroke="#16845c" stroke-width="${(sicht*.6).toFixed(2)}" stroke-dasharray="${(6/sc).toFixed(1)} ${(4/sc).toFixed(1)}" opacity=".55"/>`;
 return `<svg viewBox="${x0.toFixed(1)} ${(-y1).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}" width="100%" style="max-width:${pxW}px;background:#fff;border:1px solid var(--card-line);border-radius:10px" role="img" aria-label="Seitenansicht der Biegemaschine">
<g transform="scale(1,-1)">${tools}${geister}
<polyline points="${linie}" fill="none" stroke="#17242d" stroke-width="${sicht.toFixed(2)}" stroke-linejoin="miter" stroke-linecap="butt"/>${rotSeg}
<circle cx="${pose.piv[0]}" cy="${pose.piv[1]}" r="${(3/sc).toFixed(2)}" fill="#d97706"/></g></svg>
<div class="small" style="margin-top:4px">Blech zur Sichtbarkeit verstärkt gezeichnet · grün gestrichelt: Endlage · orange: Drehpunkt · rot: Kollision${koll.length?` · <b style="color:var(--red)">jetzt: ${esc(koll.map(k=>k.teil+" (Schenkel "+(k.schenkel+1)+")").join(", "))}</b>`:""}</div>`;
}
function bgaSteuerungHtml(){
 const a=bgaS.analyse;
 if(!a||!a.schritte.length)return "";
 const n=a.schritte.length,s=a.schritte[bgaS.schritt],gr=Math.round(Math.abs(s.theta)*bgaS.fortschritt);
 return `<div class="bar" style="margin:8px 0 4px">
 <button type="button" class="gray" data-bga-akt="zurueck" title="Voriger Schritt">⏮</button>
 <button type="button" class="blue" data-bga-akt="spielen">${bgaS.spielt?"⏸ Pause":"▶ Abspielen"}</button>
 <button type="button" class="gray" data-bga-akt="weiter" title="Nächster Schritt">⏭</button>
 <span class="small" style="align-self:center">Schritt ${bgaS.schritt+1} von ${n} · ${gr}° von ${Math.round(Math.abs(s.theta))}° ${s.theta>0?"nach oben":"nach unten"}</span></div>
<input type="range" id="bgaRegler" min="0" max="1000" value="${Math.round(bgaS.fortschritt*1000)}" style="width:100%" aria-label="Biegewinkel des aktuellen Schritts">`;
}
function bgaErgebnisHtml(){
 const m=bgaMaschine(),a=bgaS.analyse;
 let h="";
 if(m&&m.beispiel)h+='<div class="info" style="border-left-color:var(--orange,#d97706)"><b>BEISPIEL-Testmaschine</b> – nicht eure Maschine. Die Ergebnisse gelten nur für diese Testwerte.</div>';
 else if(m&&!m.geprueft)h+='<div class="info" style="border-left-color:var(--orange,#d97706)">Die Maschinenwerte sind nicht als «mit der Herstellerzeichnung geprüft» markiert – das Ergebnis ist mit Vorsicht zu lesen.</div>';
 if(!a)return h;
 const lang=bgaTeilLaengePruefen(m,bgaS.laenge);
 const probleme=a.schritte.reduce((x,r)=>x+r.probleme.length,0);
 if(a.ok&&!lang)h+=`<div class="info" style="border-left-color:var(--green)"><b>✓ Machbar</b> – ${a.schritte.length} Biegung(en), ${a.wenden} Wenden.${bgaS.auto?" Die Reihenfolge ist ein Vorschlag mit möglichst wenig Wenden.":""}</div>`;
 else if(a.ok)h+=`<div class="info" style="border-left-color:var(--red)"><b>Im Querschnitt machbar, aber:</b> ${esc(lang)}</div>`;
 else h+=`<div class="info" style="border-left-color:var(--red)"><b>✗ So nicht machbar</b> (${probleme} Problem${probleme===1?"":"e"}).${bgaS.auto&&bgaS.autoErgebnis&&!bgaS.autoErgebnis.ok?" Auch mit anderer Reihenfolge, Klemmseite oder Wenden wurde keine machbare Folge gefunden – die Probleme gelten für die Folge von vorn nach hinten.":""}${lang?"<br>"+esc(lang):""}</div>`;
 if(bgaS.autoErgebnis&&bgaS.autoErgebnis.zuViele)h+=`<div class="small">Mehr als ${BGA_MAX_BIEGUNGEN_SUCHE} Biegungen: keine automatische Suche, die Folge wird so geprüft, wie sie unten steht.</div>`;
 if(bgaS.autoErgebnis&&bgaS.autoErgebnis.abgebrochen)h+='<div class="small">Die Suche wurde wegen ihres Umfangs abgebrochen – die Folge kann unten von Hand angepasst werden.</div>';
 return h;
}
function bgaFolgeHtml(){
 const a=bgaS.analyse;
 if(!a||!a.schritte.length)return '<div class="small">Noch keine Folge.</div>';
 const n=a.schritte.length;
 return a.schritte.map((r,i)=>{
  const f=bgaS.folge[i];
  const gr=Math.round(Math.abs(r.theta));
  const ist=i===bgaS.schritt;
  return `<div class="bga-schritt${ist?" ist-auf":""}" style="border:1px solid ${ist?"var(--blue)":"var(--card-line)"};border-radius:10px;padding:8px 10px;margin:0 0 8px">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
   <button type="button" class="${ist?"blue":"gray"} mz-klein" data-bga-waehle="${i}">${i+1}</button>
   <b>Schenkel ${f.k+1}: ${gr}° ${r.theta>0?"nach oben":"nach unten"}</b>
   ${r.moeglich?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--red)">✗</span>'}
   ${r.wendet?'<span class="small">↻ Blech wenden</span>':""}
   <span style="margin-left:auto;display:flex;gap:4px">
    <button type="button" class="gray mz-klein" data-bga-hoch="${i}"${i===0?" disabled":""} aria-label="Früher">↑</button>
    <button type="button" class="gray mz-klein" data-bga-runter="${i}"${i===n-1?" disabled":""} aria-label="Später">↓</button></span></div>
  <div class="small" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
   Klemmen:<select data-bga-klemm="${i}" style="min-height:34px;width:auto"><option value="links"${f.klemm==="links"?" selected":""}>links der Biegung</option><option value="rechts"${f.klemm==="rechts"?" selected":""}>rechts der Biegung</option></select>
   <label style="display:inline-flex;gap:4px;align-items:center;margin:0"><input type="checkbox" data-bga-flip="${i}"${f.flip?" checked":""} style="min-height:0;width:auto"> Blech gedreht eingelegt</label></div>
  ${r.probleme.map(p=>`<div class="small" style="color:var(--red)">${esc(p.text)}</div>`).join("")}
  ${r.hinweise.map(p=>`<div class="small">${esc(p)}</div>`).join("")}</div>`;
 }).join("")+`<div class="bar"><button type="button" class="gray" data-bga-akt="vorschlag">↻ Neu vorschlagen</button></div>`;
}
function bgaEingabeHtml(){
 const l=bmListe();
 const opt=l.map(m=>`<option value="${esc(m.id)}"${String(m.id)===String(bgaS.maschineId)?" selected":""}>${esc(m.name||"(ohne Name)")}</option>`).join("");
 return `<div class="grid">
  <div class="wide"><label>Maschine</label><select id="bgaMaschine">${opt||'<option value="">– keine Maschine eingetragen –</option>'}</select></div>
  <div><label>Blechstärke (mm)</label><input id="bgaStaerke" type="number" step="0.1" min="0" value="${esc(bgaS.t||"")}"></div>
  <div><label>Teillänge (mm, optional)</label><input id="bgaLaenge" type="number" step="10" min="0" value="${esc(bgaS.laenge||"")}"></div>
 </div>
 <div class="small">Nicht gerechnet: Innenradius, Rückfederung und die Falzdicke bei Umschlägen. Die Biegewange dreht mit demselben Winkel wie der Flansch. Eine Planungshilfe, keine zertifizierte Simulation.</div>`;
}
function bgaZeichnen(nurBild){
 const bild=$("bgaBild");if(!bild)return;
 bild.innerHTML=bgaBildHtml();
 const st=$("bgaSteuerung");if(st)st.innerHTML=bgaSteuerungHtml();
 if(nurBild)return;
 $("bgaErgebnis").innerHTML=bgaErgebnisHtml();
 $("bgaFolge").innerHTML=bgaFolgeHtml();
 $("bgaEingabe").innerHTML=bgaEingabeHtml();
}

// ---- Bewegung --------------------------------------------------------------------------
function bgaStopp(){bgaS.spielt=false;if(bgaS.raf)cancelAnimationFrame(bgaS.raf);bgaS.raf=0}
function bgaSchleife(zeit){
 if(!bgaS.spielt||!bgaS.offen){bgaS.raf=0;return}
 const a=bgaS.analyse;
 if(!a||!a.schritte.length){bgaStopp();return}
 const dt=bgaS.letzt?Math.min(80,zeit-bgaS.letzt):16;bgaS.letzt=zeit;
 if(zeit<bgaS.pauseBis){bgaS.raf=requestAnimationFrame(bgaSchleife);return}
 const s=a.schritte[bgaS.schritt],dauer=Math.max(900,Math.abs(s.theta)/60*1000);
 bgaS.fortschritt+=dt/dauer;
 if(bgaS.fortschritt>=1){
  bgaS.fortschritt=1;bgaZeichnen(true);
  if(bgaS.schritt<a.schritte.length-1){bgaS.schritt++;bgaS.fortschritt=0;bgaS.pauseBis=zeit+450;bgaZeichnen()}
  else{bgaS.spielt=false;bgaS.raf=0;bgaZeichnen();return}
 }else bgaZeichnen(true);
 bgaS.raf=requestAnimationFrame(bgaSchleife);
}
function bgaSpielen(){
 const a=bgaS.analyse;if(!a||!a.schritte.length)return;
 if(bgaS.spielt){bgaStopp();bgaZeichnen(true);return}
 if(bgaS.schritt>=a.schritte.length-1&&bgaS.fortschritt>=1){bgaS.schritt=0;bgaS.fortschritt=0}
 bgaS.spielt=true;bgaS.letzt=0;bgaS.pauseBis=0;bgaS.raf=requestAnimationFrame(bgaSchleife);bgaZeichnen(true);
}

// ---- Oeffnen / Schliessen --------------------------------------------------------------
function bgaOeffnen(schenkel,opt){
 const o=opt||{};
 const m=$("bgaModal");if(!m)return;
 bgaS.schenkel=JSON.parse(JSON.stringify(schenkel||[]));
 bgaS.t=Number(o.staerke)>0?Number(o.staerke):0;
 bgaS.laenge=Number(o.laenge)>0?Number(o.laenge):0;
 bgaS.titel=o.titel||"";
 const l=bmListe();
 if(!l.some(x=>String(x.id)===String(bgaS.maschineId)))bgaS.maschineId=l.length?l[0].id:"";
 bgaS.auto=true;bgaS.schritt=0;bgaS.fortschritt=0;bgaStopp();
 bgaS.offen=true;
 bgaNeuRechnen(true);
 m.hidden=false;
 const k=$("bgaKopf");if(k)k.textContent=(bgaS.titel?bgaS.titel+" · ":"")+(bgaS.profil.biegungen.length)+" Biegung(en)";
 bgaZeichnen();
 const mb=m.querySelector(".modalbox");if(mb)mb.scrollTop=0;
}
function bgaSchliessen(){bgaStopp();bgaS.offen=false;const m=$("bgaModal");if(m)m.hidden=true}

// ---- Bedienung -------------------------------------------------------------------------
function bgaFolgeVerschieben(i,d){
 const j=i+d;if(j<0||j>=bgaS.folge.length)return;
 const f=bgaS.folge;[f[i],f[j]]=[f[j],f[i]];bgaS.auto=false;
 bgaS.schritt=j;bgaS.fortschritt=0;bgaNeuRechnen(false);bgaZeichnen();
}
document.addEventListener("click",e=>{
 const t=e.target&&e.target.closest?e.target.closest("[data-bga-offen],#closeBga,[data-bga-akt],[data-bga-waehle],[data-bga-hoch],[data-bga-runter]"):null;
 if(!t)return;
 if(t.hasAttribute("data-bga-offen")){
  if(typeof fpA==="undefined"||!fpA||!Array.isArray(fpA.schenkel)||!fpA.schenkel.length){appAlert("Noch kein Profil erfasst.");return}
  const lang=(fpA.segmente||[]).reduce((x,s)=>Math.max(x,Number(s.laenge)||0),0);
  bgaOeffnen(fpA.schenkel,{staerke:typeof measStaerkeGet==="function"?measStaerkeGet():0,laenge:lang,titel:"Freies Profil"});
  return;
 }
 if(t.id==="closeBga"){bgaSchliessen();return}
 if(t.hasAttribute("data-bga-waehle")){bgaStopp();bgaS.schritt=Number(t.getAttribute("data-bga-waehle"));bgaS.fortschritt=0;bgaZeichnen();return}
 if(t.hasAttribute("data-bga-hoch")){bgaFolgeVerschieben(Number(t.getAttribute("data-bga-hoch")),-1);return}
 if(t.hasAttribute("data-bga-runter")){bgaFolgeVerschieben(Number(t.getAttribute("data-bga-runter")),1);return}
 const akt=t.getAttribute("data-bga-akt");
 if(akt==="spielen")bgaSpielen();
 else if(akt==="weiter"||akt==="zurueck"){
  bgaStopp();const n=bgaS.analyse?bgaS.analyse.schritte.length:0;
  bgaS.schritt=Math.max(0,Math.min(n-1,bgaS.schritt+(akt==="weiter"?1:-1)));bgaS.fortschritt=akt==="weiter"?0:1;bgaZeichnen();
 }
 else if(akt==="vorschlag"){bgaStopp();bgaS.auto=true;bgaS.schritt=0;bgaS.fortschritt=0;bgaNeuRechnen(true);bgaZeichnen()}
});
document.addEventListener("input",e=>{
 if(!e.target||!e.target.closest||!e.target.closest("#bgaModal"))return;
 if(e.target.id==="bgaRegler"){bgaStopp();bgaS.fortschritt=Number(e.target.value)/1000;bgaZeichnen(true);const st=$("bgaSteuerung");if(st){const r=$("bgaRegler");const v=r?r.value:"";st.innerHTML=bgaSteuerungHtml();const r2=$("bgaRegler");if(r2&&r){r2.value=v;r2.focus()}}return}
});
document.addEventListener("change",e=>{
 const t=e.target;
 if(!t||!t.closest||!t.closest("#bgaModal"))return;
 if(t.id==="bgaMaschine"){bgaS.maschineId=t.value;bgaS.auto=true;bgaS.schritt=0;bgaS.fortschritt=0;bgaNeuRechnen(true);bgaZeichnen();return}
 if(t.id==="bgaStaerke"){bgaS.t=Number(String(t.value).replace(",","."))>0?Number(String(t.value).replace(",",".")):0;bgaS.auto=true;bgaS.schritt=0;bgaS.fortschritt=0;bgaNeuRechnen(true);bgaZeichnen();return}
 if(t.id==="bgaLaenge"){bgaS.laenge=Number(t.value)>0?Number(t.value):0;bgaZeichnen();return}
 if(t.hasAttribute("data-bga-klemm")){const i=Number(t.getAttribute("data-bga-klemm"));bgaS.folge[i].klemm=t.value;bgaS.auto=false;bgaNeuRechnen(false);bgaZeichnen();return}
 if(t.hasAttribute("data-bga-flip")){const i=Number(t.getAttribute("data-bga-flip"));bgaS.folge[i].flip=!!t.checked;bgaS.auto=false;bgaNeuRechnen(false);bgaZeichnen();return}
});
