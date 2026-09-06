// Prueft den Arbeitsworkflow der Massaufnahme (v3.05):
// Freigabe -> Zuweisung -> Geruestet -> Montiert, und die persoenliche
// Aufgabenzentrale auf der Startseite.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche. Also welche Knoepfe wem angeboten
// werden, welche Datenbankfunktion mit welchen Werten gerufen wird, welche
// Aufgaben ein bestimmter Mitarbeiter sieht - und welche er NICHT sieht.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt. Das
// ist serverseitig und wurde per SQL gegen das echte Produktivschema geprueft
// (18 Faelle, siehe CLAUDE.md 110). Die Oberflaeche ist reine Fuehrung.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-workflow-v3-05.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

// Der Aufbau: vier Personen einer Firma, drei Massaufnahmen in verschiedenen
// Stadien, dazu eine, die einem anderen Mitarbeiter gehoert.
const STUB=`window.__ruf=[];window.__zeilen=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   const a=window.__rpcAntwort&&window.__rpcAntwort[name];
   if(a&&a.fehler)return {data:null,error:{message:a.fehler}};
   return {data:a?a.data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_eq:{},_in:null};
   ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.in=(s,v)=>{f._in={s,v};return f};
   f.maybeSingle=async()=>{
     const r=(window.__zeilen||[]).find(z=>String(z.id)===String(f._eq.id));
     return {data:r||null,error:null}};
   f.then=(r)=>{
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
const C="cccc3333-3333-3333-3333-333333333333";
const D="dddd4444-4444-4444-4444-444444444444";

const anmelden=(page,wer,rolle)=>page.evaluate(([id,r,A,B,C,D])=>{
 currentProfile={id,role:r,first_name:"P",last_name:id.slice(0,4)};
 allProfiles=[{id:A,first_name:"Anna",last_name:"Aufnehmer"},
              {id:B,first_name:"Bruno",last_name:"Ruester"},
              {id:C,first_name:"Carla",last_name:"Monteur"},
              {id:D,first_name:"Dora",last_name:"Chefin"}];
 meineRechte={admin:r==="admin"};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"},
              {id:8,name:"Neubau",object:"Hauptstrasse 8",order_no:"2026-2",customer:"Bau AG"}];
 measurementMaterials=[{id:2,name:"Titanzink"}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;
},[wer,rolle,A,B,C,D]);

const oeffne=(page,m)=>page.evaluate(z=>{openMeasurement(z)},m);
const box=(page)=>page.evaluate(()=>{
 const e=$("measWorkflowBereich");
 return {hidden:e.hidden,text:(e.innerText||"").replace(/\s+/g," ").trim(),
         knoepfe:[...e.querySelectorAll("button")].map(b=>b.id||b.textContent.trim())};
});

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzterDialog="";
 page.on("dialog",d=>{letzterDialog=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await anmelden(page,A,"employee");
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const M=(o)=>Object.assign({id:1,project_id:7,type:"kamineinfassung",title:"Kamin Nord",
   date:"2026-09-01",data:{},created_by:A,created_at:"2026-09-01T08:00:00Z",
   workflow_status:"in_bearbeitung",sketch_paths:[],photo_paths:[]},o);

 // ---- A · Freigabe: nur der Aufnehmer -------------------------------------
 console.log("\nA · Freigabe");
 await oeffne(page,M({}));
 let s=await box(page);
 p(!s.hidden,"eine gespeicherte Massaufnahme zeigt den Arbeitsstatus",s.hidden);
 p(/In Bearbeitung/.test(s.text),"Status: In Bearbeitung",s.text.slice(0,80));
 p(s.knoepfe.includes("mwFreigeben"),"der Aufnehmer sieht den Freigabe-Knopf",s.knoepfe);
 p(/aufgenommen von/i.test(s.text)&&/Anna Aufnehmer/.test(s.text),"Aufnehmer mit Namen genannt",s.text.slice(0,120));

 await anmelden(page,B,"employee");
 await oeffne(page,M({}));
 s=await box(page);
 p(!s.knoepfe.includes("mwFreigeben"),"ein anderer Mitarbeiter sieht den Freigabe-Knopf NICHT",s.knoepfe);
 p(/Anna Aufnehmer muss die Massaufnahme freigeben/.test(s.text),"und erfaehrt, warum",s.text.slice(0,160));

 // Auch ein Administrator darf nicht freigeben - das ist Sache des Aufnehmers.
 await anmelden(page,D,"admin");
 await oeffne(page,M({}));
 s=await box(page);
 p(!s.knoepfe.includes("mwFreigeben"),"selbst ein Administrator sieht den Freigabe-Knopf nicht",s.knoepfe);

 // Der echte Klick: Rueckfrage mit dem geforderten Wortlaut, dann der Aufruf.
 await anmelden(page,A,"employee");
 await oeffne(page,M({}));
 await page.evaluate(()=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:{
   workflow_status:"freigegeben",freigegeben_von:"aaaa1111-1111-1111-1111-111111111111",
   freigegeben_am:"2026-09-05T10:00:00Z"}}}});
 await page.click("#mwFreigeben"); await page.waitForTimeout(200);
 const rufe=await page.evaluate(()=>window.__ruf);
 p(/Massaufnahme freigeben\?/.test(letzterDialog)&&/vollständig aufgenommen und kontrolliert/.test(letzterDialog),
   "Rueckfrage mit dem geforderten Wortlaut",letzterDialog);
 p(rufe.length===1&&rufe[0].name==="measurement_freigeben"&&rufe[0].args.p_id===1,
   "ruft measurement_freigeben mit der richtigen ID",rufe);
 s=await box(page);
 p(/Freigegeben/.test(s.text),"der Status folgt der Antwort",s.text.slice(0,80));
 p(/freigegeben von/i.test(s.text)&&/Anna Aufnehmer/.test(s.text),"Freigeber und Zeitpunkt stehen da",s.text.slice(0,200));

 // v3.10: Nach der Freigabe oeffnet sich der Zuweisungs-Dialog von selbst.
 // Fuer den naechsten Abschnitt wieder schliessen.
 p(await page.evaluate(()=>!$("mwZuweisenModal").hidden),
   "nach der Freigabe geht die Zuweisung direkt auf (keine Sackgasse)");
 await page.evaluate(()=>{$("mwZuweisenModal").hidden=true});

 // ---- B · Zuweisung -------------------------------------------------------
 console.log("\nB · Zuweisung");
 await oeffne(page,M({workflow_status:"freigegeben",freigegeben_von:A,freigegeben_am:"2026-09-05T10:00:00Z"}));
 s=await box(page);
 p(s.knoepfe.includes("mwZuweisenOeffnen"),"der Aufnehmer darf zuweisen",s.knoepfe);
 await page.click("#mwZuweisenOeffnen"); await page.waitForTimeout(150);
 const dlg=await page.evaluate(()=>({
  offen:!$("mwZuweisenModal").hidden,
  ruester:[...$("mwZuweisenRuester").options].map(o=>o.textContent),
  monteur:[...$("mwZuweisenMonteur").options].length}));
 p(dlg.offen,"der Zuweisungs-Dialog geht auf");
 // Er muss VOR dem Formular liegen - alle .modal teilen z-index 500, dann
 // entscheidet die Reihenfolge im Dokument. Gemessen statt geklickt: ein
 // verdeckter Knopf wuerde den Pruefstand sonst haengen lassen, und ein
 // abgebrochener Lauf sieht aus wie "keine Fehler".
 const oben=await page.evaluate(()=>{
  const k=$("mwZuweisenSpeichern"), r=k.getBoundingClientRect();
  const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {treffer:!!t&&(t===k||k.contains(t)),tag:t?(t.id||t.className||t.tagName):"-"}});
 p(oben.treffer,"der Dialog liegt vor dem Massaufnahme-Formular",oben);
 p(dlg.ruester.length===5&&dlg.ruester[0]==="– niemand –","alle Mitarbeiter zur Auswahl, dazu 'niemand'",dlg.ruester);
 p(dlg.monteur===5,"dieselbe Liste fuer die Montage",dlg.monteur);
 await page.evaluate(([B,C])=>{
  window.__ruf=[];
  window.__rpcAntwort={measurement_zuweisen:{data:{workflow_status:"zu_ruesten",ruester_id:B,monteur_id:C,
    ruester_zugewiesen_am:"2026-09-05T11:00:00Z",monteur_zugewiesen_am:"2026-09-05T11:00:00Z"}}};
  $("mwZuweisenRuester").value=B; $("mwZuweisenMonteur").value=C;
 },[B,C]);
 await page.evaluate(()=>$("mwZuweisenSpeichern").click()); await page.waitForTimeout(200);
 const z=await page.evaluate(()=>({ruf:window.__ruf,zu:$("mwZuweisenModal").hidden}));
 p(z.ruf.length===1&&z.ruf[0].name==="measurement_zuweisen"&&z.ruf[0].args.p_ruester===B&&z.ruf[0].args.p_monteur===C,
   "ruft measurement_zuweisen mit beiden Personen",z.ruf);
 p(z.zu,"der Dialog schliesst nach dem Speichern");
 s=await box(page);
 p(/Bruno Ruester/.test(s.text)&&/Carla Monteur/.test(s.text),"beide Zuweisungen stehen im Status",s.text.slice(0,260));

 // Ein unbeteiligter Mitarbeiter darf nicht zuweisen.
 await anmelden(page,B,"employee");
 await oeffne(page,M({workflow_status:"freigegeben",freigegeben_von:A}));
 s=await box(page);
 p(!s.knoepfe.includes("mwZuweisenOeffnen"),"ein Unbeteiligter sieht den Zuweisen-Knopf nicht",s.knoepfe);
 await anmelden(page,D,"admin");
 await oeffne(page,M({workflow_status:"freigegeben",freigegeben_von:A}));
 s=await box(page);
 p(s.knoepfe.includes("mwZuweisenOeffnen"),"ein Administrator darf zuweisen",s.knoepfe);

 // ---- C · Ruesten ---------------------------------------------------------
 console.log("\nC · Ruesten");
 const ZUR=M({workflow_status:"zu_ruesten",freigegeben_von:A,ruester_id:B,monteur_id:C});
 await anmelden(page,C,"employee");
 await oeffne(page,ZUR);
 s=await box(page);
 p(!s.knoepfe.includes("mwGeruestet"),"der Monteur sieht den Geruestet-Knopf nicht",s.knoepfe);
 p(/Bruno Ruester rüstet das Material/.test(s.text),"stattdessen: auf wen gewartet wird",s.text.slice(0,240));
 await anmelden(page,B,"employee");
 await oeffne(page,ZUR);
 s=await box(page);
 p(s.knoepfe.includes("mwGeruestet"),"der zugewiesene Ruester sieht den Knopf",s.knoepfe);
 await page.evaluate(([B])=>{window.__ruf=[];window.__rpcAntwort={measurement_geruestet:{data:{
   workflow_status:"zu_montieren",geruestet_von:B,geruestet_am:"2026-09-05T12:00:00Z"}}}},[B]);
 await page.click("#mwGeruestet"); await page.waitForTimeout(200);
 const g=await page.evaluate(()=>window.__ruf);
 p(g.length===1&&g[0].name==="measurement_geruestet","ruft measurement_geruestet",g);
 s=await box(page);
 p(/Zu montieren/.test(s.text),"danach steht die Montage an",s.text.slice(0,80));
 p(/gerüstet von/i.test(s.text),"Ruester und Zeitpunkt gespeichert",s.text.slice(0,240));

 // ---- D · Montage ---------------------------------------------------------
 console.log("\nD · Montage");
 const ZUM=M({workflow_status:"zu_montieren",freigegeben_von:A,ruester_id:B,monteur_id:C,geruestet_von:B});
 await anmelden(page,B,"employee");
 await oeffne(page,ZUM);
 s=await box(page);
 p(!s.knoepfe.includes("mwMontiert"),"der Ruester sieht den Montiert-Knopf nicht",s.knoepfe);
 await anmelden(page,C,"employee");
 await oeffne(page,ZUM);
 s=await box(page);
 p(s.knoepfe.includes("mwMontiert"),"der zugewiesene Monteur sieht ihn",s.knoepfe);
 await page.evaluate(([C])=>{window.__ruf=[];window.__rpcAntwort={measurement_montiert:{data:{
   workflow_status:"montiert",montiert_von:C,montiert_am:"2026-09-05T15:00:00Z"}}}},[C]);
 await page.click("#mwMontiert"); await page.waitForTimeout(200);
 const mo=await page.evaluate(()=>window.__ruf);
 p(mo.length===1&&mo[0].name==="measurement_montiert","ruft measurement_montiert",mo);
 s=await box(page);
 p(/Montiert/.test(s.text)&&/Carla Monteur/.test(s.text),"Monteur und Zeitpunkt gespeichert",s.text.slice(0,260));

 // Abschliessen: Aufnehmer oder Administrator
 await anmelden(page,C,"employee");
 await oeffne(page,M({workflow_status:"montiert",created_by:A,montiert_von:C}));
 s=await box(page);
 p(!s.knoepfe.includes("mwAbschliessen"),"der Monteur schliesst nicht selbst ab",s.knoepfe);
 await anmelden(page,A,"employee");
 await oeffne(page,M({workflow_status:"montiert",montiert_von:C}));
 s=await box(page);
 p(s.knoepfe.includes("mwAbschliessen"),"der Aufnehmer darf abschliessen",s.knoepfe);

 // ---- E · Fehler der Datenbank kommen an ----------------------------------
 console.log("\nE · Fehlermeldung");
 await oeffne(page,M({}));
 await page.evaluate(()=>{window.__rpcAntwort={measurement_freigeben:{fehler:"Diese Massaufnahme ist bereits freigegeben."}}});
 await page.click("#mwFreigeben"); await page.waitForTimeout(200);
 const f=await page.evaluate(()=>{const e=$("mwFehler");return {hidden:e.hidden,text:e.textContent}});
 p(!f.hidden&&/bereits freigegeben/.test(f.text),"die Meldung der Datenbank steht im Formular",f);
 s=await box(page);
 p(/In Bearbeitung/.test(s.text),"und der Status wird NICHT vorgetaeuscht",s.text.slice(0,80));

 // ---- F · Neue Massaufnahme hat keinen Workflow ---------------------------
 console.log("\nF · Neue Massaufnahme");
 await page.evaluate(()=>{newMeasurementWithType("kamineinfassung")});
 await page.waitForTimeout(150);
 s=await box(page);
 p(s.hidden,"eine noch nicht gespeicherte Massaufnahme zeigt keinen Arbeitsstatus",s);

 // ---- G · Aufgabenzentrale ------------------------------------------------
 console.log("\nG · Meine offenen Aufgaben");
 const zeilen=[
  M({id:11,project_id:7,title:"Kamin Nord",created_by:A,workflow_status:"in_bearbeitung"}),
  M({id:12,project_id:8,title:"Rinne Nord",type:"rinne_halbrund",created_by:A,workflow_status:"freigegeben"}),
  M({id:13,project_id:7,title:"Mauer Süd",type:"mauerabdeckung",created_by:A,workflow_status:"zu_ruesten",ruester_id:B,monteur_id:C}),
  M({id:14,project_id:8,title:"Ort West",type:"anschlussblech",created_by:B,workflow_status:"zu_montieren",ruester_id:B,monteur_id:C}),
  M({id:15,project_id:7,title:"Fremd",created_by:B,workflow_status:"in_bearbeitung"}),
  M({id:16,project_id:null,title:"Ohne Projekt",created_by:A,workflow_status:"in_bearbeitung"})
 ];
 await page.evaluate(z=>{window.__zeilen=z},zeilen);

 const aufgaben=async(wer,rolle)=>{
  await anmelden(page,wer,rolle||"employee");
  // Wie nach dem Anmelden: Startseite offen, Formulare zu.
  await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false;
    aufgabenListe=[];renderAufgaben()});
  await page.evaluate(()=>aufgabenNeuLaden());
  await page.waitForTimeout(250);
  // v3.07: Die Karte startet zugeklappt. Fuer alles, was die einzelnen
  // Aufgaben liest oder anklickt, muss sie offen sein.
  await page.evaluate(()=>{if(!$("aufgabenKarte").hidden){aufgabenOffen=true;renderAufgaben()}});
  return page.evaluate(()=>({
   hidden:$("aufgabenKarte").hidden,
   titel:($("aufgabenTitel").innerText||"").trim(),
   karten:[...document.querySelectorAll("#aufgabenListe .aufgabe")].map(k=>({
     art:(k.querySelector(".aufgabe-kopf").innerText||"").trim(),
     titel:(k.querySelector(".aufgabe-titel").innerText||"").trim(),
     zusatz:k.querySelector(".aufgabe-zusatz")?k.querySelector(".aufgabe-zusatz").innerText.trim():"",
     rot:k.className.indexOf("aufgabe-rot")>=0,
     knopf:k.querySelector(".aufgabe-haupt").textContent.trim(),
     id:k.querySelector(".aufgabe-haupt").dataset.aufgabeId}))}));
 };

 let av=await aufgaben(A);
 p(!av.hidden&&av.karten.length===2,"A sieht genau seine zwei eigenen Aufgaben",av.karten);
 const sichtbar=await page.evaluate(()=>{const e=$("aufgabenKarte");
   return {display:getComputedStyle(e).display,hoehe:Math.round(e.getBoundingClientRect().height),
           offen:e.classList.contains("offen")}});
 p(sichtbar.display!=="none"&&sichtbar.hoehe>60,"die Karte ist auf der Startseite wirklich zu sehen",sichtbar);
 // Seit v3.07 nennt die Zeile die Anzahl im Klartext statt in Klammern
 // (ueberholte Erwartung, kein Codefehler). Die Karte ist zugeklappt eine
 // Zeile hoch - das prueft pruefstand-aufgaben-schalter-v3-07.js.
 p(/\b2 offene Aufgaben\b/.test(av.titel),"die Anzahl steht in der Zeile",av.titel);
 p(av.karten.some(k=>/freigeben/i.test(k.art)&&k.id==="11"),"seine unfreigegebene Massaufnahme",av.karten);
 p(av.karten.some(k=>/zuweisen/i.test(k.art)&&k.id==="12"),"seine freigegebene ohne Zuweisung",av.karten);
 p(!av.karten.some(k=>k.id==="15"),"die fremde Massaufnahme erscheint NICHT",av.karten);
 p(!av.karten.some(k=>k.id==="16"),"eine Massaufnahme ohne Projekt erscheint nicht",av.karten);
 p(!av.karten.some(k=>k.id==="13"||k.id==="14"),"fremde Ruest-/Montageaufgaben erscheinen nicht",av.karten);
 const frei=av.karten.find(k=>k.id==="11");
 p(frei&&/Musterstrasse 12/.test(frei.titel),"die Projektadresse ist der Haupttitel",frei);
 p(frei&&/Kamineinfassung/.test(frei.zusatz),"die Art der Massaufnahme steht darunter",frei);

 av=await aufgaben(B);
 p(av.karten.length===2,"B sieht seine Ruestaufgabe und seine eigene Massaufnahme",av.karten);
 const r=av.karten.find(k=>k.id==="13");
 p(r&&/rüsten/i.test(r.art)&&r.rot&&r.knopf==="Gerüstet","die Ruestaufgabe ist rot und traegt den richtigen Knopf",r);
 p(!av.karten.some(k=>k.id==="14"),"die Montageaufgabe von C sieht B nicht",av.karten);

 av=await aufgaben(C);
 p(av.karten.length===1&&av.karten[0].id==="14","C sieht genau seine Montageaufgabe",av.karten);
 p(!av.karten[0].rot&&av.karten[0].knopf==="Montiert","sie ist orange und traegt den Montiert-Knopf",av.karten[0]);

 av=await aufgaben(D,"admin");
 p(av.hidden&&av.karten.length===0,"wer nichts offen hat, sieht die Karte gar nicht",av);

 // ---- H · Klick fuehrt zur richtigen Massaufnahme -------------------------
 console.log("\nH · Klick aus der Aufgabe");
 await aufgaben(B);
 await page.evaluate(()=>{window.__ruf=[];window.__geoeffnet=null;
   const alt=window.openMeasurement; window.openMeasurement=(m)=>{window.__geoeffnet=m.id;alt(m)}});
 await page.click('#aufgabenListe [data-aufgabe="oeffnen"]'); await page.waitForTimeout(250);
 const off=await page.evaluate(()=>({id:window.__geoeffnet,modal:!$("measurementEditModal").hidden,start:$("startScreen").hidden}));
 p(off.id===13&&off.modal,"oeffnet genau die Massaufnahme der Aufgabe",off);

 await aufgaben(B);
 await page.evaluate(()=>{window.__ruf=[];window.__rpcAntwort={measurement_geruestet:{data:{workflow_status:"geruestet"}}}});
 await page.click('#aufgabenListe [data-aufgabe="ruesten"]'); await page.waitForTimeout(250);
 const rr=await page.evaluate(()=>window.__ruf);
 p(rr.some(x=>x.name==="measurement_geruestet"&&x.args.p_id===13),
   "der Knopf 'Geruestet' bestaetigt direkt aus der Startseite",rr);
 p(/Rüsten bestätigen\?/.test(letzterDialog),"auch hier mit Rueckfrage",letzterDialog);

 // ---- I · Verlauf: deutsche Bezeichnungen --------------------------------
 console.log("\nI · Aenderungsverlauf");
 const v=await page.evaluate(([B])=>({
  status:VERLAUF_FIELD_LABELS.measurement.workflow_status,
  ruester:VERLAUF_FIELD_LABELS.measurement.ruester_id,
  wert:verlaufFormatDiffValue("workflow_status","zu_ruesten"),
  person:verlaufFormatDiffValue("ruester_id",B),
  leer:verlaufFormatDiffValue("monteur_id",null)}),[B]);
 p(v.status==="Arbeitsstatus"&&v.ruester==="Rüsten","die neuen Felder haben deutsche Bezeichnungen",v);
 p(v.wert==="Zu rüsten","der Status erscheint im Klartext, nicht als Rohwert",v);
 p(v.person==="Bruno Ruester","die zugewiesene Person erscheint mit Namen",v);
 p(v.leer==="niemand","eine zurueckgenommene Zuweisung heisst 'niemand'",v);
 const v2=await page.evaluate(()=>({
  label:VERLAUF_FIELD_LABELS.measurement.freigabe_verfallen,
  wahr:verlaufFormatDiffValue("freigabe_verfallen",true),
  falsch:verlaufFormatDiffValue("freigabe_verfallen",false)}));
 p(v2.label==="Freigabe","der Verfall hat eine deutsche Bezeichnung",v2);
 p(v2.wahr==="verfallen"&&v2.falsch==="gültig","er liest sich als 'gültig -> verfallen', nicht als Ja/Nein",v2);

 // ---- K · Verfallene Freigabe (v3.06) -------------------------------------
 // Eine wesentliche Aenderung nach der Freigabe laesst die Freigabe verfallen.
 // Das entscheidet ausschliesslich der Trigger in der Datenbank (per SQL
 // geprueft, 20 Faelle) - hier wird nur geprueft, ob die Oberflaeche es
 // richtig anzeigt und nicht darueber hinweggeht.
 console.log("\nK · Verfallene Freigabe");
 const VERFALLEN=M({id:21,workflow_status:"in_bearbeitung",freigabe_verfallen:true,
   ruester_id:B,monteur_id:C,freigegeben_von:null,freigegeben_am:null});

 await anmelden(page,A,"employee");
 await oeffne(page,VERFALLEN);
 s=await box(page);
 p(/nach der Freigabe geändert/i.test(s.text),"der Verfall wird ausdruecklich benannt",s.text.slice(0,220));
 p(/verfallen/i.test(s.text),"und heisst beim Namen: verfallen",s.text.slice(0,220));
 p(/rüster und monteur bleiben zugewiesen/i.test(s.text),
   "es steht da, dass die Zuweisungen bestehen bleiben",s.text.slice(0,260));
 const knopfText=await page.evaluate(()=>{const k=$("mwFreigeben");return k?k.textContent.trim():""});
 p(/erneut freigeben/i.test(knopfText),"der Knopf heisst 'Erneut freigeben'",knopfText);
 const warnSichtbar=await page.evaluate(()=>{
   const w=document.querySelector("#measWorkflowBereich .mw-warnung");
   if(!w)return {da:false};
   const st=getComputedStyle(w);
   return {da:true,display:st.display,hoehe:Math.round(w.getBoundingClientRect().height)}});
 p(warnSichtbar.da&&warnSichtbar.display!=="none"&&warnSichtbar.hoehe>20,
   "der Hinweis ist wirklich zu sehen, nicht nur im Markup",warnSichtbar);

 // Die Rueckfrage muss sagen, dass es eine ERNEUTE Freigabe ist.
 await page.evaluate(()=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:{
   workflow_status:"zu_ruesten",freigabe_verfallen:false,
   freigegeben_von:"aaaa1111-1111-1111-1111-111111111111",freigegeben_am:"2026-09-06T09:00:00Z",
   ruester_id:"bbbb2222-2222-2222-2222-222222222222",
   monteur_id:"cccc3333-3333-3333-3333-333333333333"}}}});
 letzterDialog="";
 await page.click("#mwFreigeben"); await page.waitForTimeout(200);
 p(/erneut freigeben\?/i.test(letzterDialog)&&/nach der letzten Freigabe geändert/i.test(letzterDialog),
   "die Rueckfrage nennt die erneute Freigabe und den Grund",letzterDialog);
 s=await box(page);
 p(/Zu rüsten/.test(s.text)&&!/nach der Freigabe geändert/i.test(s.text),
   "nach der erneuten Freigabe steht der Hinweis nicht mehr da",s.text.slice(0,200));

 // Wer nicht der Aufnehmer ist, sieht den Hinweis auch - aber keinen Knopf.
 await anmelden(page,B,"employee");
 await oeffne(page,VERFALLEN);
 s=await box(page);
 p(/nach der Freigabe geändert/i.test(s.text),"auch der Ruester erfaehrt, dass die Freigabe verfallen ist",s.text.slice(0,200));
 p(!s.knoepfe.includes("mwFreigeben"),"er bekommt dafuer aber keinen Freigabe-Knopf",s.knoepfe);
 p(/Anna Aufnehmer/.test(s.text),"es steht da, wer sie erneut freigeben muss",s.text.slice(0,260));

 // Ohne Verfall kein Hinweis.
 await anmelden(page,A,"employee");
 await oeffne(page,M({workflow_status:"zu_ruesten",freigegeben_von:A,ruester_id:B,monteur_id:C}));
 s=await box(page);
 p(!/nach der Freigabe geändert/i.test(s.text),"ohne Verfall erscheint kein Hinweis",s.text.slice(0,160));

 // Speichern: der Trigger kann die Freigabe verfallen lassen. Der Client
 // erfaehrt das nur ueber die zurueckgelesene Zeile.
 letzterDialog="";
 const nachher=await page.evaluate(()=>{
  mwNachSpeichern({id:1,workflow_status:"in_bearbeitung",freigabe_verfallen:true});
  return {status:mwStand.workflow_status,verfallen:mwStand.freigabe_verfallen,
          frei:mwStand.freigegeben_von,text:($("measWorkflowBereich").innerText||"").replace(/\s+/g," ")}});
 p(nachher.status==="in_bearbeitung"&&nachher.verfallen===true&&nachher.frei===null,
   "mwNachSpeichern uebernimmt den Verfall aus der zurueckgelesenen Zeile",nachher);
 await page.waitForTimeout(120);
 p(/Freigabe ist verfallen/i.test(letzterDialog),"und sagt es der Person, statt es zu verschlucken",letzterDialog);

 // Ein Speichern ohne Verfall meldet nichts.
 await oeffne(page,M({workflow_status:"zu_ruesten",freigegeben_von:A,ruester_id:B,monteur_id:C}));
 letzterDialog="";
 await page.evaluate(()=>{mwNachSpeichern({id:1,workflow_status:"zu_ruesten",freigabe_verfallen:false})});
 await page.waitForTimeout(120);
 p(letzterDialog==="","ein Speichern ohne Verfall meldet nichts",letzterDialog);

 // js/16 liest die Zeile beim Speichern wirklich zurueck - sonst koennte der
 // Client den Verfall gar nicht bemerken.
 const q16=require("fs").readFileSync("js/16-massaufnahme-formular.js","utf8");
 p(/\.select\("id,workflow_status,freigabe_verfallen"\)/.test(q16)
   &&/mwNachSpeichern\(/.test(q16),
   "js/16 liest workflow_status und freigabe_verfallen beim Speichern zurueck");

 // Die Aufgabenzentrale: eine verfallene Freigabe ist eine eigene Art.
 await page.evaluate(z=>{window.__zeilen=z},[
  M({id:31,project_id:7,title:"Verfallen",created_by:A,workflow_status:"in_bearbeitung",
     freigabe_verfallen:true,ruester_id:B,monteur_id:C,date:"2026-09-01"}),
  M({id:32,project_id:8,title:"Ganz neu",created_by:A,workflow_status:"in_bearbeitung",date:"2026-09-05"})
 ]);
 av=await aufgaben(A);
 p(av.karten.length===2,"beide erscheinen als Aufgabe",av.karten);
 p(/erneut freigeben/i.test(av.karten[0].art)&&av.karten[0].id==="31",
   "die verfallene Freigabe steht zuoberst",av.karten);
 p(/nach der freigabe geändert/i.test(av.karten[0].art),
   "und sagt, warum sie da ist",av.karten[0]);
 p(av.karten[0].rot,"sie ist rot",av.karten[0]);
 p(av.karten[1].id==="32"&&!/erneut/i.test(av.karten[1].art),
   "eine noch nie freigegebene bleibt die gewohnte Freigabe-Aufgabe",av.karten[1]);
 // In einer Liste (Cockpit) darf eine verfallene Freigabe nicht wie eine
 // frisch erfasste aussehen - sonst sieht niemand, dass sie Leute blockiert.
 const badges=await page.evaluate(()=>({
  verfallen:mwBadgeFuerListe({workflow_status:"in_bearbeitung",freigabe_verfallen:true}),
  frisch:mwBadgeFuerListe({workflow_status:"in_bearbeitung",freigabe_verfallen:false}),
  laufend:mwBadgeFuerListe({workflow_status:"zu_ruesten"})}));
 p(/verfallen/i.test(badges.verfallen)&&/mw-rot/.test(badges.verfallen)&&/⚠️/.test(badges.verfallen),
   "in der Liste steht bei einer verfallenen Freigabe ein roter Hinweis",badges);
 p(/Erneut freigeben/.test(badges.verfallen)&&/⚠️/.test(badges.verfallen)
   &&/Freigeben/.test(badges.frisch)&&!/Erneut/.test(badges.frisch)&&!/⚠️/.test(badges.frisch),
   "eine frisch erfasste ist von einer verfallenen zu unterscheiden",badges);
 p(/Rüsten/.test(badges.laufend)&&!/Zu rüsten/.test(badges.laufend),
   "die Liste nennt den naechsten Schritt, nicht den Status",badges);
 p(/Rüsten/.test(badges.laufend),"ein laufender Schritt wird weiterhin genannt",badges);
 const q09=require("fs").readFileSync("js/09-projekte.js","utf8");
 p(/mwBadgeFuerListe\(m\)/.test(q09)&&!/mwBadge\(m\.workflow_status\)/.test(q09),
   "die Cockpit-Liste entscheidet das nicht selbst, sondern ueber js/44");

 // Die lange Beschriftung muss auf einem schmalen Handy umbrechen duerfen,
 // statt die Karte aufzureissen.
 for(const w of [320,390]){
  await page.setViewportSize({width:w,height:1400});
  await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const k=document.querySelector("#aufgabenListe .aufgabe");
   const r=k.getBoundingClientRect();
   return {rechts:Math.round(r.right),fenster:window.innerWidth,
           scroll:document.documentElement.scrollWidth>window.innerWidth+1}});
  p(m.rechts<=m.fenster+1&&!m.scroll,"die lange Beschriftung passt bei "+w+" px",m);
 }
 await page.setViewportSize({width:412,height:1800});

 // Zurueck auf den Stand von Abschnitt G, damit J unveraendert weiterlaeuft.
 await page.evaluate(z=>{window.__zeilen=z},zeilen);

 // ---- J · Darstellung auf Handy, Tablet und Bildschirm --------------------
 console.log("\nJ · Responsive");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  await aufgaben(B);
  await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const k=document.querySelector("#aufgabenListe .aufgabe");
   const r=k.getBoundingClientRect();
   const kn=[...k.querySelectorAll("button")].map(b=>Math.round(b.getBoundingClientRect().height));
   return {rechts:Math.round(r.right),fenster:window.innerWidth,
           scroll:document.documentElement.scrollWidth>window.innerWidth+1,knopf:Math.min(...kn)}});
  p(m.rechts<=m.fenster+1&&!m.scroll,"Aufgabenkarte passt bei "+w+" px",m);
  p(m.knopf>=38,"die Knoepfe bleiben gut treffbar bei "+w+" px",m);
 }
 await page.setViewportSize({width:412,height:1800});
 await anmelden(page,A,"employee");
 await oeffne(page,M({workflow_status:"zu_ruesten",freigegeben_von:A,ruester_id:B,monteur_id:C}));
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:1600});
  await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const e=$("measWorkflowBereich"), r=e.getBoundingClientRect();
   return {rechts:Math.round(r.right),fenster:window.innerWidth,
           scroll:document.documentElement.scrollWidth>window.innerWidth+1}});
  p(m.rechts<=m.fenster+1&&!m.scroll,"Arbeitsstatus passt bei "+w+" px",m);
 }

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 await b.close();
 process.exit(fail?1:0);
})();
