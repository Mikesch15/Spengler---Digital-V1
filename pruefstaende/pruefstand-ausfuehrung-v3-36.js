// Prueft Geplant -> Ausgefuehrt (v3.36):
//   - eine Position aus data.ausmass bekommt einen eigenen Ausfuehrungsstand,
//     UNABHAENGIG von den anderen Positionen derselben Massaufnahme
//     (Auftrag Abschnitt 3),
//   - die Planung (measurements.data) wird an KEINER Stelle ueberschrieben -
//     ausfAllePositionen() liest nur ueber buildMeasurementFromForm(), es
//     gibt keinen einzigen Schreibzugriff auf "measurements" in js/64
//     (Auftrag Abschnitt 2, woertlich: "darf NICHT ueberschrieben werden"),
//   - der Client schreibt NIE eine company_id (die Firmengrenze erzwingt
//     ausschliesslich die restriktive tenant_boundary_ausfuehrungen-Policy),
//   - 0 geschriebene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1),
//   - eine Position, die es im aktuellen Plan nicht mehr gibt, bleibt sichtbar,
//     aber nur noch lesbar - nichts geht verloren, nichts laesst sich mehr
//     anfassen,
//   - eine veraltete Planung (die Massaufnahme wurde seither geaendert) wird
//     benannt statt stillschweigend uebernommen,
//   - der Aenderungsverlauf zeigt die deutsche Bezeichnung des Status statt
//     des Rohwerts.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ausfuehrung-v3-36.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];
window.__db={ausf:[],fehler:null,leer:false};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.upsert=(w,o)=>{st.op='upsert';st.werte=w;st.opt=o;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='ausfuehrungen'?window.__db.ausf:[];
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:r[k]===v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),
    werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null,opt:st.opt||null});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  if(st.op==='upsert'){
   if(window.__db.leer)return {data:[],error:null};   // simuliert einen RLS-Block: 0 Zeilen
   const raus=[];
   (Array.isArray(st.werte)?st.werte:[st.werte]).forEach(w=>{
    const i=window.__db.ausf.findIndex(x=>Number(x.measurement_id)===Number(w.measurement_id)
      &&Number(x.position_nr)===Number(w.position_nr));
    const z=Object.assign({id:900+window.__db.ausf.length,company_id:'c1',
      created_by:'aaaa1111-1111-1111-1111-111111111111',created_at:'2026-09-01T07:00:00Z'},w,
      {updated_by:'aaaa1111-1111-1111-1111-111111111111',updated_at:'2026-09-08T10:00:00Z'});
    if(i>=0)window.__db.ausf[i]=z; else window.__db.ausf.push(z);
    raus.push(JSON.parse(JSON.stringify(z)));
   });
   return {data:raus,error:null};
  }
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>({data:null,error:null}),
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const vorbereiten=async(page,aktiv)=>{
 await page.evaluate((aktiv)=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Anna",last_name:"Auf"},
               {id:"bbbb2222-2222-2222-2222-222222222222",first_name:"Bruno",last_name:"Berg"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  workflowAktiv=aktiv; moduleImTest={};
  window.__db.ausf=[]; window.__db.fehler=null; window.__db.leer=false; window.__ruf=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  ["settingsModal","projectCockpitModal","werkstattModal"].forEach(i=>{if($(i))$(i).hidden=true});
  $("measurementEditModal").hidden=false;
 },aktiv);
};

// Oeffnet eine "gespeicherte" Kehle mit drei Positionen (Kehlblech Abwicklung,
// Kehlblech Flaeche, Kehlblech Stuecke) - echte Nutzung von
// buildMeasurementFromForm(), keine ausgedachte Stub-Struktur.
//
// WICHTIG: keaAusmassZeilen() (js/34) haengt AUSSCHLIESSLICH an
// kehleA.segmente (ueber keaBleche()) und keaAbwicklung() - nh/nl/gl
// (Register 2, "Winkel") speisen ausschliesslich die getrennte
// Winkelberechnung aus js/25-kehle.js und wirken sich auf data.ausmass
// NICHT aus. Um echte Positionen zu bekommen, muss deshalb ein Segment
// auf Register 3 ("Segmente") erfasst werden - nicht nh/nl/gl auf
// Register 2.
const oeffneKehle=async(page,{laenge}={laenge:780})=>{
 await page.evaluate((laenge)=>{
  newMeasurementWithType("kehle");
  keaSetzeSchritt(3);
  document.getElementById("kea_segPlus").click();
  const feld=document.querySelector('[data-kea-laenge="0"]');
  feld.value=String(laenge); feld.dispatchEvent(new Event("input",{bubbles:true}));
  currentMeasurementId=55;
 },laenge);
 await page.evaluate(()=>ausfNeuLaden());
 await page.waitForTimeout(60);
};

const stand=page=>page.evaluate(()=>{
 const b=$("measAusfuehrungBereich"), r=b.getBoundingClientRect(), st=getComputedStyle(b);
 const fehlerEl=$("ausfSchreibFehler");
 return {hidden:b.hidden, hoehe:Math.round(r.height),
         sichtbar:st.display!=="none"&&r.height>0,
         text:($("measAusfuehrungBody")||{textContent:""}).textContent.replace(/\s+/g," ").trim(),
         zeilen:[...document.querySelectorAll("[data-ausf-row]")].map(z=>z.dataset.ausfRow),
         verwaist:document.querySelectorAll(".ausf-zeile-verwaist").length,
         fehler:(fehlerEl&&fehlerEl.hidden===false)?fehlerEl.textContent:null};
});

const klickChip=async(page,nr,status)=>{
 const r=await page.evaluate(([nr,status])=>{
  const e=document.querySelector(`[data-ausf-row="${nr}"] [data-ausf-status="${status}"]`);
  if(!e)return "fehlt";
  const b=e.getBoundingClientRect();
  if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
  e.click(); return "ok";
 },[nr,status]);
 await page.waitForTimeout(80);
 return r;
};

// Jede Zeile zeigt IMMER alle drei Chip-Beschriftungen (das sind Knoepfe,
// keine Statusanzeige) - ein blosses Suchen nach "Teilweise"/"Vollständig"
// im Gesamttext waere deshalb IMMER wahr, egal welchen Stand eine Position
// wirklich hat. Massgeblich ist ausschliesslich, welcher Chip einer
// bestimmten Zeile die Klasse "aktiv" traegt.
const aktivStatus=(page,nr)=>page.evaluate((nr)=>{
 const row=document.querySelector(`[data-ausf-row="${nr}"]`);
 const a=row&&row.querySelector(".ausf-chip.aktiv");
 return a?a.dataset.ausfStatus:null;
},nr);

const setzeFeld=async(page,nr,attr,wert)=>{
 await page.evaluate(([nr,attr,wert])=>{
  const e=document.querySelector(`[data-ausf-row="${nr}"] [${attr}]`);
  e.value=wert; e.dispatchEvent(new Event("change",{bubbles:true}));
 },[nr,attr,wert]);
 await page.waitForTimeout(80);
};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · Sichtbarkeit haengt am Firmenschalter UND an einer gespeicherten Massaufnahme");
 await vorbereiten(page,false);
 await oeffneKehle(page);
 let s=await stand(page);
 p(s.hidden===true&&!s.sichtbar,"Ablauf abgeschaltet: Karte unsichtbar",s);
 let ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="ausfuehrungen"));
 p(ruf.length===0,"und es wird gar nicht erst geladen",{n:ruf.length});

 await vorbereiten(page,true);
 await page.evaluate(()=>{newMeasurementWithType("kehle");currentMeasurementId=null;ausfNeuLaden()});
 await page.waitForTimeout(60);
 s=await stand(page);
 p(!s.sichtbar,"Ablauf an, aber noch nicht gespeichert (keine ID): weiterhin unsichtbar",s);

 await vorbereiten(page,true);
 await oeffneKehle(page);
 s=await stand(page);
 p(s.sichtbar,"Ablauf an und gespeichert: Karte sichtbar",{y:s.hoehe});

 console.log("\nB · echte Positionen aus buildMeasurementFromForm() (keine Stub-Erfindung)");
 p(s.zeilen.length===3,"drei echte Kehle-Positionen (Abwicklung/Flaeche/Stuecke)",s.zeilen);
 p(/Kehlblech/.test(s.text),"die echte Bezeichnung aus js/34 steht da",{t:s.text.slice(0,200)});
 p(/3 Positionen/.test(s.text),"Zusammenfassung nennt die Anzahl",{t:s.text.slice(0,120)});
 p(/3 nicht ausgeführt/.test(s.text),"und den Anfangsstand (alle drei offen)",{t:s.text.slice(0,120)});

 console.log("\nC · die Planung wird NIE ueberschrieben (Quellcode-Nachweis)");
 const quelle64=fs.readFileSync("js/64-ausfuehrung.js","utf8");
 p(!/from\("measurements"\)[\s\S]{0,120}\.(insert|update|delete|upsert)\(/.test(quelle64),
   "js/64 schreibt niemals in measurements (weder insert/update/delete/upsert)");
 p(/buildMeasurementFromForm/.test(quelle64),"Positionen kommen ueber buildMeasurementFromForm()");
 p(!/sb\.rpc\(/.test(quelle64),"js/64 ruft keine Datenbankfunktion auf - reines Insert/Update/Select");

 console.log("\nD · Schreiben: Chip-Klick");
 p((await klickChip(page,"1","teilweise"))==="ok","Chip 'Teilweise' an Position 1 bedienbar");
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="ausfuehrungen"&&r.op==="upsert"));
 p(ruf.length===1,"genau EIN upsert",ruf.length);
 const w=ruf[0].werte;
 p(w.measurement_id===55&&w.position_nr===1,"measurement_id und position_nr korrekt",w);
 p(w.status==="teilweise","der geklickte Status wird geschrieben",w.status);
 p(!("company_id" in w),"KEIN company_id im geschriebenen Datensatz",w);
 p(ruf[0].opt&&ruf[0].opt.onConflict==="measurement_id,position_nr","onConflict exakt wie bei zuschnitt_erledigt",ruf[0].opt);
 p(typeof w.geplante_menge==="string"&&w.geplante_menge.length>0,"die Beleg-Menge wird mitgeschrieben (kein leerer Wert)",w.geplante_menge);
 s=await stand(page);
 p((await aktivStatus(page,"1"))==="teilweise","nach dem Schreiben zeigt die Karte den neuen Status (aktiver Chip)",await aktivStatus(page,"1"));

 console.log("\nE · Schreiben: Feldaenderung (Menge/Bemerkung)");
 await page.evaluate(()=>{window.__ruf=[]});
 await setzeFeld(page,"1","data-ausf-menge","18,90");
 await setzeFeld(page,"1","data-ausf-bemerkung","Rest folgt spaeter");
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="ausfuehrungen"&&r.op==="upsert"));
 p(ruf.length===2,"je Feldaenderung ein eigener upsert",ruf.length);
 p(ruf[1].werte.status==="teilweise","der zuvor gesetzte Status bleibt beim Feld-Schreiben erhalten",ruf[1].werte.status);
 p(ruf[1].werte.ausgefuehrte_menge==="18,90"&&ruf[1].werte.bemerkung==="Rest folgt spaeter","beide Felder korrekt uebernommen",ruf[1].werte);

 console.log("\nF · andere Positionen bleiben beim Schreiben unberuehrt");
 p((await klickChip(page,"2","vollstaendig"))==="ok","Position 2 auf 'Vollstaendig'");
 s=await stand(page);
 // Massgeblich ist der jeweils AKTIVE Chip jeder einzelnen Zeile, nicht ein
 // Suchen nach den Woertern im Gesamttext (die stehen als Knopfbeschriftung
 // ohnehin in JEDER Zeile). Das ist der eigentliche Kern von Abschnitt 3:
 // zwei Positionen mit unabhaengigem, gleichzeitigem Stand.
 p((await aktivStatus(page,"1"))==="teilweise","Position 1 bleibt 'teilweise' (unveraendert durch Position 2)",await aktivStatus(page,"1"));
 p((await aktivStatus(page,"2"))==="vollstaendig","Position 2 zeigt gleichzeitig 'vollstaendig' - beide Staende unabhaengig nebeneinander",await aktivStatus(page,"2"));
 const w2=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="ausfuehrungen"&&r.op==="upsert").slice(-1)[0].werte);
 p(w2.position_nr===2,"das upsert betrifft nur Position 2, nicht 1",w2);

 console.log("\nG · 0 geschriebene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1)");
 await page.evaluate(()=>{window.__db.leer=true});
 await klickChip(page,"3","vollstaendig");
 s=await stand(page);
 p(/Es wurde nichts gespeichert/.test(s.fehler||""),"verstaendliche Fehlermeldung statt vorgetaeuschtem Erfolg",s.fehler);
 p((await aktivStatus(page,"3"))==="nicht_ausgefuehrt","Position 3 zeigt weiterhin NICHT vollstaendig (aktiver Chip unveraendert)",await aktivStatus(page,"3"));
 await page.evaluate(()=>{window.__db.leer=false});

 console.log("\nH · echter Datenbankfehler wird angezeigt");
 await page.evaluate(()=>{window.__db.fehler="permission denied for table ausfuehrungen"});
 await klickChip(page,"3","vollstaendig");
 s=await stand(page);
 p(/permission denied/.test(s.fehler||""),"die Serverantwort steht im Fehlerfeld",s.fehler);
 await page.evaluate(()=>{window.__db.fehler=null});

 console.log("\nI · Beleg-Abgleich: veraltete Planung wird benannt");
 // Position 1 wurde mit Segmentlaenge 780 erfasst (geplante_menge daraus -
 // keaAusmassZeilen() haengt an kehleA.segmente, NICHT an nh/nl/gl, siehe
 // oeffneKehle()). Aendern wir jetzt die Segmentlaenge, weicht der
 // LIVE-Plan vom BELEG ab.
 await page.evaluate(()=>{
  const e=document.querySelector('[data-kea-laenge="0"]');
  e.value="1990"; e.dispatchEvent(new Event("input",{bubbles:true}));
  renderMeasAusfuehrung();
 });
 s=await stand(page);
 p(/Die Planung wurde seither geändert/.test(s.text),"Hinweis auf die veraltete Planung erscheint",{t:s.text.slice(0,400)});
 // zurueck auf den Ursprungswert - der Hinweis muss wieder verschwinden
 await page.evaluate(()=>{
  const e=document.querySelector('[data-kea-laenge="0"]');
  e.value="780"; e.dispatchEvent(new Event("input",{bubbles:true}));
  renderMeasAusfuehrung();
 });
 s=await stand(page);
 p(!/Die Planung wurde seither geändert/.test(s.text),"und verschwindet wieder, sobald der Plan wieder passt",{t:s.text.slice(0,200)});

 console.log("\nJ · verwaiste Positionen (Massaufnahme wurde umgebaut)");
 // Eine vierte, in der Datenbank vorhandene Position, die es im aktuellen
 // (dreiteiligen) Kehle-Plan gar nicht gibt.
 await page.evaluate(()=>{
  window.__db.ausf.push({id:999,company_id:"c1",measurement_id:55,position_nr:7,
   position_bezeichnung:"Stösse",geplante_menge:"3",einheit:"Stk.",
   ausgefuehrte_menge:"3",status:"vollstaendig",bemerkung:"alt erledigt",
   created_by:"aaaa1111-1111-1111-1111-111111111111",created_at:"2026-08-01T07:00:00Z",
   updated_by:"aaaa1111-1111-1111-1111-111111111111",updated_at:"2026-08-01T07:00:00Z"});
 });
 await page.evaluate(()=>ausfNeuLaden());
 s=await stand(page);
 p(s.verwaist===1,"genau eine verwaiste Zeile erkannt",s.verwaist);
 p(/Stösse/.test(s.text)&&/nicht mehr vorhanden/.test(s.text),"sie wird benannt und als nicht mehr vorhanden gekennzeichnet",{t:s.text.slice(0,400)});
 p(/Vollständig/.test(s.text),"ihr letzter Stand (vollstaendig) bleibt lesbar",{t:s.text.slice(0,400)});
 const verwaistKlick=await page.evaluate(()=>{
  const v=document.querySelector(".ausf-zeile-verwaist");
  return {chips:v.querySelectorAll("[data-ausf-status]").length,felder:v.querySelectorAll("[data-ausf-menge],[data-ausf-bemerkung]").length};
 });
 p(verwaistKlick.chips===0&&verwaistKlick.felder===0,"keine Chips, keine Eingabefelder - nichts mehr anfassbar",verwaistKlick);

 console.log("\nK · kein company_id-Filter beim Lesen (die Firmengrenze ist RLS)");
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="ausfuehrungen"&&r.op==="select"));
 p(ruf.length>=1,"mindestens eine lesende Abfrage",ruf.length);
 p(ruf.every(r=>r.filter.some(f=>f[0]==="measurement_id")),"gefiltert nach der Massaufnahme",ruf.map(r=>r.filter));
 p(!ruf.some(r=>r.filter.some(f=>f[0]==="company_id")),"KEIN company_id-Filter im Client",ruf.map(r=>r.filter));

 console.log("\nL · Verlauf (js/23): deutsche Bezeichnung statt Rohwert");
 const verlauf=await page.evaluate(()=>({
  entityLabel:VERLAUF_ENTITY_LABELS.ausfuehrung,
  entityIcon:VERLAUF_ENTITY_ICONS.ausfuehrung,
  feldLabel:(VERLAUF_FIELD_LABELS.ausfuehrung||{}).status,
  changesHtml:verlaufChangesHtml({entity_type:"ausfuehrung",action:"status_changed",
    changes:[{field:"status",old:"nicht_ausgefuehrt",new:"teilweise"}]}),
  entryText:verlaufEntryText({entity_type:"ausfuehrung",action:"created",description:""})
 }));
 p(verlauf.entityLabel==="Ausführung","Entitaets-Bezeichnung vorhanden",verlauf.entityLabel);
 p(verlauf.entityIcon==="📋","Entitaets-Symbol vorhanden",verlauf.entityIcon);
 p(verlauf.feldLabel==="Status","Feld-Bezeichnung fuer 'status' vorhanden",verlauf.feldLabel);
 p(/Nicht ausgeführt.*→.*Teilweise/.test(verlauf.changesHtml),"Diff zeigt deutsche Statusnamen, nicht Rohwerte",verlauf.changesHtml);
 p(!/nicht_ausgefuehrt|teilweise(?!\<)/i.test(verlauf.changesHtml.replace(/Teilweise/,"")),"kein Rohwert mehr im Text",verlauf.changesHtml);
 p(/Ausführung erstellt/.test(verlauf.entryText),"Beschreibungstext ohne eigene description",verlauf.entryText);

 console.log("\nM · Bildschirmbreiten");
 for(const b of [360,412,768,1200]){
  await page.setViewportSize({width:b,height:900});
  await vorbereiten(page,true);
  await oeffneKehle(page);
  const ueb=await page.evaluate(()=>{
   const r=$("measAusfuehrungBereich").getBoundingClientRect();
   return {raus:r.right>window.innerWidth+1,scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(!ueb.raus&&!ueb.scroll,b+" px: nichts laeuft seitlich hinaus",ueb);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await browser.close();
 process.exit(fail?1:0);
})();
