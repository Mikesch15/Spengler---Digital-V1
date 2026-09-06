// Prueft die Aufgabenzentrale auf dem Startbildschirm (v3.07):
//   - sie ist zugeklappt und braucht dann eine Zeile,
//   - sie laesst sich auf- und zuklappen,
//   - der Startzustand kommt aus einer Einstellung je Geraet,
//   - der ganze Arbeitsablauf laesst sich firmenweit abschalten.
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
     Object.keys(f._eq).forEach(s=>{d=d.filter(z=>String(z[s])===String(f._eq[s]))});
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

// Aufgaben laden und den Zustand der Karte messen.
const stand=async(page)=>page.evaluate(()=>{
 const k=$("aufgabenKarte"), b=$("aufgabenListe"), kopf=$("aufgabenKopf");
 const r=k.getBoundingClientRect();
 return {hidden:k.hidden, offen:k.classList.contains("offen"),
  kartenDisplay:getComputedStyle(k).display,
  bodyDisplay:getComputedStyle(b).display,
  hoehe:Math.round(r.height),
  titel:($("aufgabenTitel").innerText||"").trim(),
  dringendRot:(()=>{const d=k.querySelector(".aufgaben-dringend");
    if(!d)return null;const c=getComputedStyle(d).color;
    const m=c.match(/\d+/g);return m?{text:d.innerText.trim(),r:+m[0],g:+m[1],b:+m[2]}:null})(),
  ariaExpanded:kopf?kopf.getAttribute("aria-expanded"):null,
  kopfTag:kopf?kopf.tagName:null,
  // innerText liefert bei verstecktem Inhalt "" - deshalb zaehlen wir die
  // Elemente und lesen den Text nur im offenen Zustand.
  anzahlKarten:k.querySelectorAll("#aufgabenListe .aufgabe").length,
  jetztSichtbar:!$("aufgabenJetzt").hidden&&$("aufgabenJetzt").getBoundingClientRect().height>0,
  jetztText:($("aufgabenJetzt").innerText||"").replace(/\s+/g," ").trim()};
});

const laden=async(page,wer,rolle)=>{
 await anmelden(page,wer,rolle||"employee");
 await page.evaluate(()=>{aufgabenListe=[];renderAufgaben()});
 await page.evaluate(()=>aufgabenNeuLaden());
 await page.waitForTimeout(200);
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const M=(o)=>Object.assign({id:1,project_id:7,type:"kamineinfassung",title:"Kamin Nord",
   date:"2026-09-01",data:{},created_by:A,created_at:"2026-09-01T08:00:00Z",
   workflow_status:"in_bearbeitung",sketch_paths:[],photo_paths:[]},o);

 // Drei eigene Aufgaben: zwei rot (freigeben), eine orange (zuweisen).
 const DREI=[M({id:11,title:"Eins"}),M({id:12,title:"Zwei"}),
             M({id:13,title:"Drei",workflow_status:"freigegeben"})];
 await page.evaluate(z=>{window.__zeilen=z},DREI);

 // ---- A · zugeklappt und schmal -----------------------------------------
 console.log("\nA · Zugeklappt");
 await page.evaluate(()=>{aufgabenOffenStart=false;aufgabenOffen=false});
 await laden(page,A);
 let s=await stand(page);
 p(!s.hidden&&s.kartenDisplay!=="none","die Karte ist sichtbar",s);
 p(s.anzahlKarten===3,"drei Aufgaben sind geladen",s);
 p(!s.offen&&s.bodyDisplay==="none","zugeklappt: die Liste ist nicht zu sehen",s);
 // v3.10: Zugeklappt steht jetzt auch die eine Aufgabe da, die dran ist -
 // eine kompakte Zeile, nicht die volle Karte. Gemessen: Kopfzeile plus
 // diese eine Zeile. Die volle Liste (drei Aufgaben) war 420 px hoch.
 p(s.hoehe>0&&s.hoehe<=140,"zugeklappt: Kopfzeile plus die eine Aufgabe, die dran ist",s);
 p(s.jetztSichtbar&&/Musterstrasse|Hauptstrasse/.test(s.jetztText),
   "zugeklappt steht die dringendste Aufgabe mit Adresse da",s);
 p(/3 offene Aufgaben/.test(s.titel),"die Zeile nennt die Anzahl",s.titel);
 p(s.dringendRot&&/2 dringend/.test(s.dringendRot.text),"und wie viele davon jetzt dran sind",s.dringendRot);
 p(s.dringendRot&&s.dringendRot.r>s.dringendRot.g+40&&s.dringendRot.r>s.dringendRot.b+40,
   "der dringende Teil ist rot",s.dringendRot);
 p(s.ariaExpanded==="false","aria-expanded meldet zugeklappt",s.ariaExpanded);
 p(s.kopfTag==="BUTTON","der Kopf ist ein echter Knopf (Tastatur bedienbar)",s.kopfTag);
 const zuHoehe=s.hoehe;

 // Einzahl
 await page.evaluate(()=>{window.__zeilen=[window.__zeilen[0]]});
 await laden(page,A);
 s=await stand(page);
 p(/1 offene Aufgabe\b/.test(s.titel)&&!/Aufgaben/.test(s.titel),"bei einer Aufgabe heisst es Einzahl",s.titel);
 await page.evaluate(z=>{window.__zeilen=z},DREI);

 // ---- B · Auf- und Zuklappen ---------------------------------------------
 console.log("\nB · Auf- und Zuklappen");
 await laden(page,A);
 await page.click("#aufgabenKopf"); await page.waitForTimeout(200);
 s=await stand(page);
 p(s.offen&&s.bodyDisplay!=="none","ein Klick klappt die Liste auf",s);
 p(s.ariaExpanded==="true","aria-expanded meldet offen",s.ariaExpanded);
 p(s.hoehe>zuHoehe+80,"offen braucht die Karte deutlich mehr Platz als zugeklappt",{zu:zuHoehe,auf:s.hoehe});
 const lesbar=await page.evaluate(()=>[...document.querySelectorAll("#aufgabenListe .aufgabe")]
   .map(k=>({art:(k.querySelector(".aufgabe-kopf").innerText||"").trim(),
             titel:(k.querySelector(".aufgabe-titel").innerText||"").trim()})));
 p(lesbar.length===3&&lesbar.every(x=>x.art&&x.titel),"die Aufgaben sind offen wirklich lesbar",lesbar);
 p(lesbar[0].titel.indexOf("Musterstrasse 12")>=0,"mit der Projektadresse als Haupttitel",lesbar[0]);

 await page.click("#aufgabenKopf"); await page.waitForTimeout(200);
 s=await stand(page);
 p(!s.offen&&s.bodyDisplay==="none","noch ein Klick klappt sie wieder zu",s);

 // Der Info-Knopf steht NEBEN dem Kopf-Knopf und darf die Karte nicht mit
 // aufklappen (dieselbe Falle wie bei den Einstellungen, CLAUDE.md 107.4).
 // Geprueft wird das Verhalten, nicht die Verschachtelung: einen Knopf im
 // Knopf loest der HTML-Parser ohnehin auf, eine solche Pruefung koennte
 // also gar nie fehlschlagen.
 await page.click('.aufgaben-leiste .hilfe-knopf'); await page.waitForTimeout(250);
 const nachHilfe=await page.evaluate(()=>({offen:$("aufgabenKarte").classList.contains("offen"),
   hilfe:!$("hilfeModal").hidden}));
 p(nachHilfe.hilfe&&!nachHilfe.offen,"der Info-Knopf oeffnet die Hilfe und klappt die Karte NICHT auf",nachHilfe);
 await page.evaluate(()=>{$("hilfeModal").hidden=true});

 // Tastatur
 await page.evaluate(()=>$("aufgabenKopf").focus());
 await page.keyboard.press("Enter"); await page.waitForTimeout(200);
 p((await stand(page)).offen,"mit der Tastatur (Enter) laesst sie sich ebenfalls oeffnen");
 await page.click("#aufgabenKopf"); await page.waitForTimeout(150);

 // ---- C · Startzustand aus der Einstellung -------------------------------
 console.log("\nC · Startzustand");
 await page.evaluate(()=>{aufgabenOffenStart=true;aufgabenOffen=true});
 await laden(page,A);
 p((await stand(page)).offen,"Einstellung 'geoeffnet': die Karte startet offen");
 await page.evaluate(()=>{aufgabenOffenStart=false;aufgabenOffen=false});
 await laden(page,A);
 p(!(await stand(page)).offen,"Einstellung 'zugeklappt': sie startet zu");

 const gespeichert=await page.evaluate(async()=>{
  localStorage.removeItem("sd_aufgabenOffen");
  $("recentCountInput").value="5"; $("darkModeInput").value="nein";
  $("photoQualityInput").value="schnell"; $("aufgabenOffenInput").value="auf";
  await $("saveRecentCount").onclick();
  return {gespeichert:localStorage.getItem("sd_aufgabenOffen"),start:aufgabenOffenStart,
          jetzt:$("aufgabenKarte").classList.contains("offen")};
 });
 p(gespeichert.gespeichert==="auf"&&gespeichert.start===true,
   "die Einstellung wird je Geraet gespeichert",gespeichert);
 p(gespeichert.jetzt,"und wirkt sofort, ohne die Seite neu zu laden",gespeichert);

 const feld=await page.evaluate(()=>{aufgabenOffenStart=false;
   if(typeof renderSettings==="function")renderSettings();
   return $("aufgabenOffenInput").value});
 p(feld==="zu","das Auswahlfeld zeigt den aktuellen Stand",feld);
 await page.evaluate(()=>{localStorage.setItem("sd_aufgabenOffen","zu");aufgabenOffenStart=false;aufgabenOffen=false});

 // ---- D · Firmenweiter Schalter ------------------------------------------
 console.log("\nD · Arbeitsablauf ein/aus");
 await page.evaluate(()=>{workflowAktiv=false});
 await laden(page,A);
 s=await stand(page);
 p(s.hidden,"ausgeschaltet: die Aufgabenkarte erscheint gar nicht, obwohl Aufgaben da waeren",s);

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
 p(!(await stand(page)).hidden,"eingeschaltet: die Aufgabenkarte ist wieder da");
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
          karte:$("aufgabenKarte").hidden,
          hinweis:($("workflowAktivHinweis").innerText||"").trim(),
          hinweisAn:!$("workflowAktivHinweis").hidden};
 });
 p(sp.ruf.length===1&&sp.ruf[0].args.workflow_aktiv===false,
   "Speichern schreibt genau app_settings.workflow_aktiv",sp.ruf);
 p(sp.aktiv===false&&sp.karte===true,"und die Karte verschwindet sofort",sp);
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

 // ---- F · Breiten ---------------------------------------------------------
 console.log("\nF · Bildschirmbreiten");
 await page.evaluate(()=>{workflowAktiv=true});
 for(const breite of [320,360,412,768]){
  await page.setViewportSize({width:breite,height:1400});
  await laden(page,A);
  for(const offen of [false,true]){
   await page.evaluate(o=>{aufgabenOffen=o;renderAufgaben()},offen);
   await page.waitForTimeout(120);
   const m=await page.evaluate(()=>{
    const k=$("aufgabenKarte");
    let raus=null;
    k.querySelectorAll("*").forEach(e=>{const r=e.getBoundingClientRect();
      if(r.width&&r.right>document.documentElement.clientWidth+1&&!raus)raus=e.className||e.tagName});
    return {raus,scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
            hoehe:Math.round(k.getBoundingClientRect().height)};
   });
   p(!m.raus&&!m.scroll,`${breite} px ${offen?"offen":"zugeklappt"}: nichts laeuft seitlich hinaus`,m);
  }
 }
 await page.setViewportSize({width:412,height:1400});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close();
 process.exit(fail?1:0);
})();
