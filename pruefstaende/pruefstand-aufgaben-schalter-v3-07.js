// Prueft die Aufgabenzentrale auf der Startseite (v3.07, auf v3.218 umgestellt):
//   - die offenen Aufgaben stehen da, mit Anzahl und Adresse,
//   - die dringenden sind als solche zu erkennen,
//   - der ganze Arbeitsablauf laesst sich firmenweit abschalten.
//
// v3.218: Bis v3.217 war das die zuklappbare Karte des klassischen
// Startbildschirms - mit Kopfzeile, Zaehler, Chevron und einer Einstellung
// "zugeklappt / geoeffnet" je Geraet. Beides gibt es nicht mehr: die
// klassische Ansicht ist weg ("Klassische alte ansicht kann komplett weg"),
// und die Ansicht zeigt die Liste offen. Geprueft wird deshalb dasselbe an
// der Liste der Ansicht, plus Gegenproben, dass die alte Karte und ihre
// Einstellung nicht zurueckkommen.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche - gemessen, nicht behauptet
// (getComputedStyle, echte Rechtecke, echte Klicks).
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt. Der
// Schalter ist reine Anzeige; schuetze_measurement_workflow() und die sechs
// measurement_*-Funktionen pruefen unabhaengig davon weiter (CLAUDE.md 110).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-aufgaben-schalter-v3-07.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {aufgabenAufklappen,aufklappenEinbauen}=require(__dirname+"/aufgaben-aufklappen.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const STUB=`window.__ruf=[];window.__zeilen=[];window.__appSettings=[{id:1}];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});return {data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_eq:{},_in:null,_upd:null};
   ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
   f.update=(v)=>{f._upd=v;window.__ruf.push({name:"update:"+t,args:v});return f};
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.in=(s,v)=>{f._in={s,v};return f};
   f.maybeSingle=async()=>{
     const r=(window.__zeilen||[]).find(z=>String(z.id)===String(f._eq.id));
     return {data:r||null,error:null}};
   f.then=(r)=>{
     if(f._t==="app_settings"){
       // Wie PostgREST: ein von RLS blockiertes UPDATE meldet keinen Fehler,
       // es betrifft still 0 Zeilen (CLAUDE.md 24.1).
       return Promise.resolve({data:window.__updateErlaubt===false?[]:window.__appSettings,error:null}).then(r)}
     let d=(window.__zeilen||[]).slice();
     Object.keys(f._eq).forEach(s=>{d=d.filter(z=>String(s==="archived"&&z[s]===undefined?false:z[s])===String(f._eq[s]))});
     if(f._in)d=d.filter(z=>f._in.v.indexOf(z[f._in.s])>=0);
     if(f._t!=="measurements")d=[];
     return Promise.resolve({data:d,error:null}).then(r)};
   return f},
 storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}
})};`;

const A="aaaa1111-1111-1111-1111-111111111111";
const B="bbbb2222-2222-2222-2222-222222222222";

const anmelden=(page,wer,rolle)=>page.evaluate(([id,r,A,B])=>{
 currentProfile={id,role:r,first_name:"P",last_name:"Test"};
 allProfiles=[{id:A,first_name:"Anna",last_name:"Aufnehmer"},
              {id:B,first_name:"Bruno",last_name:"Ruester"}];
 meineRechte={admin:r==="admin"};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 measurementMaterials=[{id:2,name:"Titanzink"}];
 appSettingsId=1;
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 $("measurementEditModal").hidden=true;$("settingsModal").hidden=true;$("startScreen").hidden=false;
},[wer,rolle,A,B]);

// Aufgaben laden und messen, was auf der Startseite wirklich dasteht.
// v3.218: gemessen wird der Abschnitt "Meine Aufgaben" der Ansicht - es gibt
// keine zweite Darstellung mehr, an der sich das noch pruefen liesse.
const stand=async(page)=>page.evaluate(()=>{
 const inhalt=document.getElementById("a2Inhalt");
 const kopf=[...inhalt.querySelectorAll(".a2-abschnitt-kopf")]
   .find(k=>/meine aufgaben/i.test(k.innerText||""));
 const abschnitt=kopf?kopf.parentElement:null;
 const zeilen=abschnitt?[...abschnitt.querySelectorAll('[data-a2-aufgabe="oeffnen"]')]:[];
 const marke=kopf?kopf.querySelector(".a2-marke"):null;
 const rot=zeilen.filter(z=>z.querySelector(".a2-zeile-nr.ist-rot"));
 const farbe=rot.length?getComputedStyle(rot[0].querySelector(".a2-zeile-nr")).color:null;
 const m=farbe?farbe.match(/\d+/g):null;
 return {
  // "hidden" heisst hier: der Abschnitt ist gar nicht da.
  hidden:!abschnitt,
  hoehe:abschnitt?Math.round(abschnitt.getBoundingClientRect().height):0,
  anzahlKarten:zeilen.length,
  titel:marke?(marke.innerText||"").trim():"",
  dringend:rot.length,
  dringendFarbe:m?{r:+m[0],g:+m[1],b:+m[2]}:null,
  ersterText:zeilen.length?(zeilen[0].innerText||"").replace(/\s+/g," ").trim():"",
  texte:zeilen.map(z=>(z.innerText||"").replace(/\s+/g," ").trim()),
  // Gegenprobe an Ort und Stelle: die alte Karte ist nicht zurueck.
  alteKarte:!!document.getElementById("aufgabenKarte")||!!document.querySelector(".aufgaben-toggle"),
  abgeschaltet:/arbeitsablauf ist/i.test(inhalt.innerText||"")};
});

const laden=async(page,wer,rolle)=>{
 await anmelden(page,wer,rolle||"employee");
 await page.evaluate(()=>{aufgabenListe=[];renderAufgaben()});
 await page.evaluate(()=>aufgabenNeuLaden());
 await page.waitForTimeout(200);
 // v3.218: renderAufgaben() zeichnet nichts mehr selbst - es ist das Zeichen,
 // an dem die Ansicht haengt. Hier wird sichergestellt, dass sie auch wirklich
 // gezeichnet ist, bevor gemessen wird.
 await page.evaluate(()=>{a2Zustand.seite="heute";a2Zeichnen()});
 // v3.258: Die Aufgabenliste startet zugeklappt (Ansage des Anwenders).
 // Was hier gemessen wird, sind AUFGABENZEILEN - also vorher aufklappen.
 // Der Ablauf steht in pruefstaende/aufgaben-aufklappen.js, an EINER Stelle.
 await aufgabenAufklappen(page);
 await page.waitForTimeout(150);
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 // v3.151: Die neue Ansicht ist seit dieser Version die VORGABE. Dieser
 // Pruefstand prueft Ablaeufe, die von der KLASSISCHEN Startseite ausgehen
 // (ihre Knoepfe, ihre Karten) - sie wird deshalb ausdruecklich gewaehlt.
 // Ohne diese Zeile traegt jedes Element der klassischen Startseite
 // display:none, und jede Messung daran ergaebe 0.
 // Das ist keine Abschwaechung: die klassische Ansicht ist ein
 // unterstuetzter, jederzeit erreichbarer Zustand der App, und genau der
 // wird hier geprueft. Was die NEUE Ansicht tut, pruefen
 // pruefstand-ansicht2-v3-150.js und die beiden v3-151-Pruefstaende.
  // v3.218: Die klassische Startseite gibt es nicht mehr - bis v3.217 wurde
 // hier auf sie umgeschaltet, um ihre Knoepfe und Karten zu erreichen.
 // Geprueft wird unveraendert dasselbe, nur an der einen Ansicht.
 await page.evaluate(()=>{if(typeof a2Zeichnen==="function")a2Zeichnen()});
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const M=(o)=>Object.assign({id:1,project_id:7,type:"kamineinfassung",title:"Kamin Nord",
   date:"2026-09-01",data:{},created_by:A,created_at:"2026-09-01T08:00:00Z",
   workflow_status:"in_bearbeitung",sketch_paths:[],photo_paths:[]},o);

 // Drei eigene Aufgaben: zwei rot (freigeben), eine orange (zuweisen).
 const DREI=[M({id:11,title:"Eins"}),M({id:12,title:"Zwei"}),
             M({id:13,title:"Drei",workflow_status:"freigegeben"})];
 await page.evaluate(z=>{window.__zeilen=z},DREI);

 // ---- A . Die Aufgaben stehen da ----------------------------------------
 console.log("\nA . Die offenen Aufgaben");
 await laden(page,A);
 let s=await stand(page);
 p(!s.hidden&&s.hoehe>0,"der Abschnitt Meine Aufgaben steht da",s);
 p(s.anzahlKarten===3,"drei Aufgaben sind geladen",s);
 p(/3 offen/.test(s.titel),"die Marke nennt die Anzahl",s.titel);
 // v3.218 Gegenprobe: die zuklappbare Karte von v3.07 ist wirklich weg -
 // sonst stuenden die Aufgaben wieder zweimal da, und die Messung oben
 // koennte an der falschen haengen.
 p(s.alteKarte===false,"die alte, zuklappbare Aufgabenkarte gibt es nicht mehr",s.alteKarte);
 // Die dringendste steht zuoberst, mit der Adresse - das war der Grund fuer
 // v3.10 ("zugeklappt sah man nur eine Zahl"). Jetzt steht die ganze Liste
 // da, und die dringendste bleibt trotzdem die erste Zeile.
 p(/Musterstrasse|Hauptstrasse/.test(s.ersterText),
   "die dringendste Aufgabe steht zuoberst, mit Adresse",s.ersterText);
 p(s.dringend===2,"zwei der drei sind als dringend gekennzeichnet",s);
 p(/dringend/.test(s.ersterText),"und sagen das auch im Text",s.ersterText);
 p(s.dringendFarbe&&s.dringendFarbe.r>s.dringendFarbe.g+40&&s.dringendFarbe.r>s.dringendFarbe.b+40,
   "die Kennzeichnung ist rot",s.dringendFarbe);

 // Einzahl
 await page.evaluate(()=>{window.__zeilen=[window.__zeilen[0]]});
 await laden(page,A);
 s=await stand(page);
 p(/^1 offen$/.test(s.titel),"bei einer Aufgabe heisst es 1 offen",s.titel);
 await page.evaluate(z=>{window.__zeilen=z},DREI);

 // ---- B . Kein Zuklappen mehr, aber der Info-Knopf ist da ----------------
 console.log("\nB . Info-Knopf");
 await laden(page,A);
 // Der Info-Knopf steht NEBEN der Ueberschrift. Er darf nur die Hilfe
 // oeffnen und sonst nichts am Abschnitt aendern (dieselbe Falle wie bei den
 // Einstellungen, CLAUDE.md 107.4).
 const vorher=await stand(page);
 const hatKnopf=await page.evaluate(()=>{
  const k=document.querySelector('#a2Inhalt [data-hilfe="aufgaben"]');
  if(!k)return false; k.click(); return true;
 });
 await page.waitForTimeout(250);
 const nachHilfe=await page.evaluate(()=>!$("hilfeModal").hidden);
 const nachher=await stand(page);
 p(hatKnopf,"neben der Ueberschrift steht ein Info-Knopf",hatKnopf);
 p(nachHilfe,"er oeffnet die Hilfe",nachHilfe);
 p(nachher.anzahlKarten===vorher.anzahlKarten&&!nachher.hidden,
   "und laesst die Liste unveraendert stehen",{vorher:vorher.anzahlKarten,nachher:nachher.anzahlKarten});
 await page.evaluate(()=>{$("hilfeModal").hidden=true});

 // ---- C . Die Einstellung "zugeklappt / geoeffnet" ist weg ---------------
 console.log("\nC . Die alte Geraete-Einstellung");
 // v3.218: Sie steuerte ausschliesslich die Karte des klassischen
 // Startbildschirms. Ein Schalter, der nichts mehr tut, ist schlimmer als
 // keiner - deshalb ist er entfallen. Geprueft wird, dass er wirklich weg
 // ist UND dass die uebrigen Geraete-Einstellungen unveraendert speichern
 // (sonst waere der Wegfall ein Schaden statt einer Aufraeumung).
 const einst=await page.evaluate(async()=>{
  localStorage.removeItem("sd_aufgabenOffen");
  $("recentCountInput").value="5"; $("darkModeInput").value="nein";
  $("photoQualityInput").value="schnell";
  await $("saveRecentCount").onclick();
  return {feld:!!document.getElementById("aufgabenOffenInput"),
          gespeichert:localStorage.getItem("sd_aufgabenOffen"),
          anzahl:localStorage.getItem("sd_recentCount"),
          global:typeof window.aufgabenOffenStart};
 });
 p(einst.feld===false,"das Auswahlfeld gibt es nicht mehr",einst);
 p(einst.gespeichert===null,"und es wird auch nichts mehr dafuer gespeichert",einst);
 p(einst.anzahl==="5","Gegenprobe: die uebrigen Geraete-Einstellungen speichern unveraendert",einst);

 // ---- D · Firmenweiter Schalter ------------------------------------------
 console.log("\nD · Arbeitsablauf ein/aus");
 await page.evaluate(()=>{workflowAktiv=false});
 await laden(page,A);
 s=await stand(page);
 p(s.hidden&&s.abgeschaltet,
   "ausgeschaltet: die Aufgabenliste erscheint gar nicht, obwohl Aufgaben da waeren - und die Seite sagt warum",s);

 const wf=async()=>page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  openMeasurement({id:11,project_id:7,type:"kamineinfassung",title:"Kamin",date:"2026-09-01",
    data:{},created_by:currentProfile.id,workflow_status:"freigegeben",sketch_paths:[],photo_paths:[]});
  const e=$("measWorkflowBereich");
  const r={hidden:e.hidden,text:(e.innerText||"").trim(),
           badge:(typeof mwBadgeFuerListe==="function")?mwBadgeFuerListe({id:11,workflow_status:"freigegeben"}):"?"};
  $("measurementEditModal").hidden=true; $("startScreen").hidden=false;
  return r});
 let w=await wf();
 p(w.hidden&&!w.text,"ausgeschaltet: die Karte 'Arbeitsstatus' verschwindet aus der Massaufnahme",w);
 p(w.badge==="","ausgeschaltet: auch das Statusabzeichen in der Projektliste faellt weg",w);

 await page.evaluate(()=>{workflowAktiv=true});
 await laden(page,A);
 p(!(await stand(page)).hidden,"eingeschaltet: die Aufgabenliste ist wieder da");
 w=await wf();
 p(!w.hidden&&/Arbeitsstatus/i.test(w.text),"eingeschaltet: die Karte 'Arbeitsstatus' ebenfalls",w);
 // v3.10: In der Liste steht der naechste Schritt statt des Status.
 p(/Zuweisen/.test(w.badge),"und der naechste Schritt in der Projektliste auch",w);

 // Speichern: was wirklich zur Datenbank geht.
 const sp=await page.evaluate(async()=>{
  window.__ruf=[];window.__updateErlaubt=true;
  $("workflowAktivInput").value="nein";
  await $("saveWorkflowAktiv").onclick();
  return {ruf:window.__ruf.filter(x=>x.name==="update:app_settings"),
          aktiv:workflowAktiv,
          karte:(await (async()=>{a2Zeichnen();await new Promise(f=>setTimeout(f,60));
                  return !/meine aufgaben/i.test($("a2Inhalt").innerText||"")})()),
          hinweis:($("workflowAktivHinweis").innerText||"").trim(),
          hinweisAn:!$("workflowAktivHinweis").hidden};
 });
 p(sp.ruf.length===1&&sp.ruf[0].args.workflow_aktiv===false,
   "Speichern schreibt genau app_settings.workflow_aktiv",sp.ruf);
 p(sp.aktiv===false&&sp.karte===true,"und die Liste verschwindet sofort",sp);
 p(sp.hinweisAn&&/nichts gelöscht/i.test(sp.hinweis),
   "der Hinweis sagt ausdruecklich, dass nichts geloescht wird",sp.hinweis);

 // Ohne Adminrecht: das UPDATE betrifft still 0 Zeilen - kein vorgetaeuschter Erfolg.
 const ohne=await page.evaluate(async()=>{
  workflowAktiv=true; window.__updateErlaubt=false; window.__ruf=[];
  $("workflowAktivInput").value="nein";
  await $("saveWorkflowAktiv").onclick();
  const r={aktiv:workflowAktiv,hinweis:($("workflowAktivHinweis").innerText||"").trim(),
           farbe:getComputedStyle($("workflowAktivHinweis")).color};
  window.__updateErlaubt=true; return r;
 });
 p(ohne.aktiv===true,"ein blockiertes UPDATE schaltet nichts um",ohne);
 p(/Berechtigung/.test(ohne.hinweis),"und meldet den Grund, statt Erfolg vorzutaeuschen",ohne.hinweis);
 const fm=ohne.farbe.match(/\d+/g);
 p(fm&&+fm[0]>+fm[1]+40,"die Fehlermeldung ist rot",ohne.farbe);

 // ---- E · Hilfe -----------------------------------------------------------
 console.log("\nE · Hilfe");
 const h=await page.evaluate(()=>({
  text:!!(HILFE_TEXTE["einst-workflow"]&&HILFE_TEXTE["einst-workflow"].text),
  knopf:!!document.querySelector('[data-hilfe="einst-workflow"]'),
  loeschen:/nichts gelöscht/i.test((HILFE_TEXTE["einst-workflow"]||{}).text||""),
  server:/Datenbank/i.test((HILFE_TEXTE["einst-workflow"]||{}).text||""),
  aufgaben:/zugeklappt/i.test((HILFE_TEXTE["aufgaben"]||{}).text||"")}));
 p(h.text&&h.knopf,"der neue Bereich hat einen Info-Knopf mit Text",h);
 p(h.loeschen,"der Text sagt, dass nichts geloescht wird",h);
 p(h.server,"und dass die Datenbank unabhaengig davon weiter prueft",h);
 p(h.aufgaben,"der Aufgaben-Text erklaert das Zuklappen",h);

 // ---- F . Breiten ---------------------------------------------------------
 console.log("\nF . Bildschirmbreiten");
 // v3.218: Gemessen wird der Abschnitt der Ansicht. Den zweiten Durchgang
 // "offen/zugeklappt" gibt es nicht mehr - es gibt nur noch einen Zustand.
 await page.evaluate(()=>{workflowAktiv=true});
 for(const breite of [320,360,412,768]){
  await page.setViewportSize({width:breite,height:1400});
  await laden(page,A);
  const m=await page.evaluate(()=>{
   const kopf=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf")]
     .find(k=>/meine aufgaben/i.test(k.innerText||""));
   const k=kopf?kopf.parentElement:null;
   if(!k)return {raus:"Abschnitt fehlt",scroll:true,hoehe:0};
   let raus=null;
   k.querySelectorAll("*").forEach(e=>{const r=e.getBoundingClientRect();
     if(r.width&&r.right>document.documentElement.clientWidth+1&&!raus)raus=e.className||e.tagName});
   return {raus,scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
           hoehe:Math.round(k.getBoundingClientRect().height)};
  });
  p(!m.raus&&!m.scroll,breite+" px: nichts laeuft seitlich hinaus",m);
 }
 await page.setViewportSize({width:412,height:1400});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close();
 process.exit(fail?1:0);
})();
