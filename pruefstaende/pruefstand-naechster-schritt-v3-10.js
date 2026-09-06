// Prueft "Der naechste Schritt" (v3.10).
//
// WORUM ES GEHT: bis v3.09 sagte die App den Status ("Zu ruesten"), aber
// nicht, was zu tun ist und von wem - und zwei Zustaende (geruestet,
// montiert) erzeugten gar keine Aufgabe. Geprueft wird deshalb vor allem,
// dass ueberall DIESELBE Antwort steht und dass keine Kette mehr abbricht.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt. Das
// ist serverseitig (CLAUDE.md 110) und unveraendert - diese Runde aendert
// keine Migration und keine Funktion in der Datenbank.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-naechster-schritt-v3-10.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

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

const A="aaaa1111-1111-1111-1111-111111111111";  // Anna, Aufnehmerin
const B="bbbb2222-2222-2222-2222-222222222222";  // Bruno, Rüster
const C="cccc3333-3333-3333-3333-333333333333";  // Carla, Monteurin
const D="dddd4444-4444-4444-4444-444444444444";  // Dora, Administratorin

const anmelden=(page,wer,rolle)=>page.evaluate(([id,r,A,B,C,D])=>{
 currentProfile={id,role:r,first_name:"P",last_name:id.slice(0,4)};
 allProfiles=[{id:A,first_name:"Anna",last_name:"Aufnehmer"},
              {id:B,first_name:"Bruno",last_name:"Ruester"},
              {id:C,first_name:"Carla",last_name:"Monteur"},
              {id:D,first_name:"Dora",last_name:"Chefin"}];
 meineRechte={admin:r==="admin"};
 workflowAktiv=true;
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 measurementMaterials=[{id:2,name:"Titanzink"}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;
},[wer,rolle,A,B,C,D]);

const M=(o)=>Object.assign({id:1,project_id:7,type:"kamineinfassung",title:"Kamin Nord",
  date:"2026-09-01",data:{},created_by:A,created_at:"2026-09-01T08:00:00Z",
  workflow_status:"in_bearbeitung",freigabe_verfallen:false,
  sketch_paths:[],photo_paths:[]},o);

const oeffne=(page,m)=>page.evaluate(z=>{openMeasurement(z)},m);
// Ein Klick auf ein verstecktes Element laesst page.click() 30 s lang haengen
// und bricht den Lauf ab - das saehe aus wie "keine Fehler" (CLAUDE.md 78).
// Deshalb erst messen, dann ueber evaluate klicken.
const klick=async(page,sel,name)=>{
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
   if(!e)return "fehlt";
   const b=e.getBoundingClientRect();
   if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
   e.click(); return "ok"},sel);
 if(r!=="ok"){fail++;console.log("  FEHLGESCHLAGEN: Klick auf "+(name||sel)+" – "+r)}
 await page.waitForTimeout(250);
 return r==="ok";
};

// Der Streifen ganz oben - gemessen, nicht aus dem hidden-Attribut gefolgert
// (eine Klassenregel mit display schlaegt [hidden], CLAUDE.md 59).
const streifen=(page)=>page.evaluate(()=>{
 const e=$("measNaechsterSchritt"); if(!e)return {da:false};
 const r=e.getBoundingClientRect(), st=getComputedStyle(e);
 return {da:true,hidden:e.hidden,sichtbar:st.display!=="none"&&r.height>0,
  hoehe:Math.round(r.height),
  text:(e.innerText||"").replace(/\s+/g," ").trim(),
  knopf:(()=>{const b=e.querySelector("[data-mw-aktion]");
    return b?{aktion:b.dataset.mwAktion,text:b.textContent.trim()}:null})()};
});
const karte=(page)=>page.evaluate(()=>{
 const e=$("measWorkflowBereich");
 return {hidden:e.hidden,text:(e.innerText||"").replace(/\s+/g," ").trim(),
   knoepfe:[...e.querySelectorAll("button")].map(b=>b.id||b.textContent.trim()),
   stationen:[...e.querySelectorAll(".mw-station")].map(x=>({
     text:(x.querySelector(".mw-st-text").textContent||"").trim(),
     zustand:[...x.classList].filter(c=>c.indexOf("mw-st-")===0).join("")}))};
});

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:2000}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzterDialog=""; page.on("dialog",d=>{letzterDialog=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await anmelden(page,A,"employee");
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ---- A · Eine Quelle: mwNaechsterSchritt fuer jeden Zustand -------------
 console.log("\nA · Eine Antwort fuer jeden Zustand");
 const faelle=await page.evaluate(([A,B,C])=>{
  const M=(o)=>Object.assign({id:1,project_id:7,created_by:A,
    workflow_status:"in_bearbeitung",freigabe_verfallen:false},o);
  const f=(o)=>{const n=mwNaechsterSchritt(M(o));
    return {k:n.schluessel,kurz:n.kurz,farbe:n.farbe,satz:n.satz,wer:n.wer,
            ich:n.ichBinDran,aktion:n.aktion,kurztext:mwSchrittKurzText(M(o))}};
  return {
   bearbeitung:f({}),
   verfallen:  f({freigabe_verfallen:true}),
   freigegeben:f({workflow_status:"freigegeben"}),
   ruesten:    f({workflow_status:"zu_ruesten",ruester_id:B}),
   geruestet:  f({workflow_status:"geruestet",geruestet_von:B}),
   montieren:  f({workflow_status:"zu_montieren",monteur_id:C}),
   montiert:   f({workflow_status:"montiert",montiert_von:C}),
   fertig:     f({workflow_status:"abgeschlossen"})};
 },[A,B,C]);
 p(faelle.bearbeitung.k==="freigeben"&&faelle.bearbeitung.ich,"in Bearbeitung -> Freigeben, und ich darf",faelle.bearbeitung);
 p(faelle.verfallen.k==="erneut_freigeben","verfallene Freigabe -> Erneut freigeben",faelle.verfallen);
 p(faelle.freigegeben.k==="zuweisen","freigegeben -> Zuweisen (nicht Ende der Kette)",faelle.freigegeben);
 p(faelle.ruesten.k==="ruesten"&&faelle.ruesten.wer===B,"zu ruesten -> Ruesten, Bruno ist dran",faelle.ruesten);
 p(faelle.geruestet.k==="monteur","geruestet -> Monteur zuweisen (Luecke aus v3.09)",faelle.geruestet);
 p(faelle.montieren.k==="montieren"&&faelle.montieren.wer===C,"zu montieren -> Montieren, Carla ist dran",faelle.montieren);
 p(faelle.montiert.k==="abschliessen","montiert -> Abschliessen (Luecke aus v3.09)",faelle.montiert);
 p(faelle.fertig.k==="fertig"&&faelle.fertig.aktion===null,"abgeschlossen -> kein naechster Schritt",faelle.fertig);
 // Jeder Satz nennt eine Person oder sagt ausdruecklich, dass niemand da ist.
 const ohnePerson=Object.entries(faelle).filter(([k,v])=>k!=="fertig"&&!/\bdu\b|\bdir\b|Anna|Bruno|Carla|niemand/i.test(v.satz));
 p(ohnePerson.length===0,"jeder Satz sagt, wer dran ist",ohnePerson.map(x=>x[0]));
 p(faelle.ruesten.farbe==="rot"&&faelle.montiert.farbe==="orange","rot = jetzt dran, orange = weniger dringend",
   {r:faelle.ruesten.farbe,m:faelle.montiert.farbe});
 p(faelle.ruesten.kurztext==="Rüsten – Bruno Ruester","Kurzform nennt Schritt und Person",faelle.ruesten.kurztext);
 p(faelle.bearbeitung.kurztext==="Freigeben – du","fuer mich selbst steht 'du'",faelle.bearbeitung.kurztext);

 // Ein anderer Mitarbeiter sieht dieselbe Antwort - nur darf er sie nicht tun.
 await anmelden(page,B,"employee");
 const alsB=await page.evaluate(([A])=>{
  const n=mwNaechsterSchritt({id:1,project_id:7,created_by:A,workflow_status:"in_bearbeitung"});
  return {k:n.schluessel,ich:n.ichBinDran,satz:n.satz}},[A]);
 p(alsB.k==="freigeben"&&!alsB.ich&&/Anna Aufnehmer/.test(alsB.satz),
   "ein anderer sieht denselben Schritt, darf ihn aber nicht ausloesen",alsB);
 await anmelden(page,A,"employee");

 // ---- B · Der Streifen ganz oben -----------------------------------------
 console.log("\nB · Der Streifen ganz oben im Formular");
 await page.evaluate(()=>{newMeasurement&&null}); // kein Aufruf, nur Klarheit
 await oeffne(page,M({}));
 let st=await streifen(page);
 p(st.da&&st.sichtbar,"eine gespeicherte Massaufnahme zeigt den Streifen",st);
 p(/NÄCHSTER SCHRITT/i.test(st.text)&&/Freigeben/.test(st.text),"er nennt den naechsten Schritt",st.text);
 p(st.knopf&&st.knopf.aktion==="freigeben","und traegt den Knopf dazu",st.knopf);
 p(st.hoehe>0&&st.hoehe<=110,"er bleibt schmal (hoechstens zwei Zeilen)",st.hoehe);

 // Er steht ausserhalb der Register - deshalb in jedem Register sichtbar.
 const proRegister=await page.evaluate(()=>{
  const r=[];
  const knoepfe=[...document.querySelectorAll("#measTypeKamin .ra-register-knopf")];
  knoepfe.forEach((k,i)=>{k.click();
    const e=$("measNaechsterSchritt");
    r.push({nr:i+1,sichtbar:getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0})});
  return r});
 p(proRegister.length>=6&&proRegister.every(x=>x.sichtbar),
   "in JEDEM Register sichtbar",proRegister);

 // Ein anderer Mitarbeiter sieht den Streifen, aber keinen Knopf.
 await anmelden(page,B,"employee"); await oeffne(page,M({}));
 st=await streifen(page);
 p(st.sichtbar&&!st.knopf&&/Anna Aufnehmer/.test(st.text),
   "wer nicht dran ist, sieht den Satz ohne Knopf",st);
 await anmelden(page,A,"employee");

 // Ohne gespeicherte Massaufnahme und bei abgeschaltetem Ablauf: weg.
 await page.evaluate(()=>{mwStandAusZeile(null);renderMeasWorkflow()});
 st=await streifen(page);
 p(!st.sichtbar,"eine noch nicht gespeicherte Massaufnahme zeigt keinen Streifen",st);
 await oeffne(page,M({}));
 await page.evaluate(()=>{workflowAktiv=false;renderMeasWorkflow()});
 st=await streifen(page);
 p(!st.sichtbar,"abgeschalteter Arbeitsablauf: kein Streifen",st);
 await page.evaluate(()=>{workflowAktiv=true;renderMeasWorkflow()});

 // ---- C · Die Fortschrittsleiste -----------------------------------------
 console.log("\nC · Fortschrittsleiste");
 await oeffne(page,M({}));
 let k=await karte(page);
 p(k.stationen.length===5,"fuenf Stationen",k.stationen);
 p(k.stationen.map(x=>x.text).join("|").toUpperCase()==="AUFGENOMMEN|FREIGEGEBEN|GERÜSTET|MONTIERT|ABSCHLUSS",
   "in der Reihenfolge des Ablaufs",k.stationen.map(x=>x.text));
 p(k.stationen[0].zustand==="mw-st-fertig"&&k.stationen[1].zustand==="mw-st-jetzt",
   "aufgenommen ist erledigt, Freigabe ist dran",k.stationen);
 await oeffne(page,M({workflow_status:"zu_montieren",freigegeben_von:A,freigegeben_am:"2026-09-02T08:00:00Z",
   ruester_id:B,geruestet_von:B,geruestet_am:"2026-09-03T08:00:00Z",monteur_id:C}));
 k=await karte(page);
 p(k.stationen[2].zustand==="mw-st-fertig"&&k.stationen[3].zustand==="mw-st-jetzt",
   "geruestet erledigt, Montage dran",k.stationen);
 // Ohne Ruester wird die Station uebersprungen - nicht stillschweigend als
 // erledigt gezeigt.
 await oeffne(page,M({workflow_status:"zu_montieren",freigegeben_von:A,freigegeben_am:"2026-09-02T08:00:00Z",
   monteur_id:C}));
 k=await karte(page);
 p(k.stationen[2].zustand==="mw-st-uebersprungen","ohne Ruester: Station uebersprungen, nicht erledigt",k.stationen);
 await oeffne(page,M({workflow_status:"abgeschlossen",freigegeben_von:A,freigegeben_am:"2026-09-02T08:00:00Z",
   montiert_von:C,montiert_am:"2026-09-04T08:00:00Z"}));
 k=await karte(page);
 p(k.stationen[4].zustand==="mw-st-fertig","abgeschlossen: letzte Station erledigt",k.stationen);
 st=await streifen(page);
 p(/Abgeschlossen/i.test(st.text)&&!st.knopf,"und der Streifen sagt: fertig, kein Knopf",st);

 // ---- D · Keine Sackgasse nach dem Freigeben -----------------------------
 console.log("\nD · Nach dem Freigeben geht es weiter");
 await oeffne(page,M({}));
 await page.evaluate(([A])=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:{
   workflow_status:"freigegeben",freigegeben_von:A,freigegeben_am:"2026-09-05T10:00:00Z"}}}},[A]);
 await klick(page,'#measNaechsterSchritt [data-mw-aktion="freigeben"]',"Freigeben im Streifen");
 let ruf=await page.evaluate(()=>window.__ruf);
 p(ruf.length===1&&ruf[0].name==="measurement_freigeben","der Knopf im Streifen loest dieselbe Funktion aus",ruf);
 p(await page.evaluate(()=>!$("mwZuweisenModal").hidden),
   "danach geht die Zuweisung direkt auf - keine Sackgasse mehr");
 const erklaerung=await page.evaluate(()=>($("mwZuweisenModal").innerText||"").replace(/\s+/g," "));
 p(/Wer rüstet das Material, wer montiert/.test(erklaerung),"der Dialog erklaert sich selbst",erklaerung.slice(0,120));
 await page.evaluate(()=>{$("mwZuweisenModal").hidden=true});
 st=await streifen(page);
 p(/Zuweisen/.test(st.text),"der Streifen zeigt danach 'Zuweisen'",st.text);

 // Ist bereits jemand eingeteilt, geht der Dialog NICHT auf.
 await oeffne(page,M({ruester_id:B}));
 await page.evaluate(([A])=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:{
   workflow_status:"zu_ruesten",freigegeben_von:A,freigegeben_am:"2026-09-05T10:00:00Z",ruester_id:"bbbb2222-2222-2222-2222-222222222222"}}}},[A]);
 await klick(page,"#mwFreigeben","Freigeben in der Karte");
 p(await page.evaluate(()=>$("mwZuweisenModal").hidden),
   "ist schon jemand eingeteilt, geht der Dialog nicht auf");

 // ---- E · Die Kette bricht nicht mehr ab (Aufgabenzentrale) --------------
 console.log("\nE · Aufgabenzentrale: die ganze Kette");
 const aufgaben=async(wer,rolle,zeilen)=>{
  await anmelden(page,wer,rolle);
  await page.evaluate(()=>{$("measurementEditModal").hidden=true;$("startScreen").hidden=false});
  await page.evaluate(z=>{window.__zeilen=z},zeilen);
  await page.evaluate(()=>aufgabenNeuLaden()); await page.waitForTimeout(250);
  await page.evaluate(()=>{aufgabenOffen=true;renderAufgaben()});
  return page.evaluate(()=>[...document.querySelectorAll("#aufgabenListe .aufgabe")].map(x=>({
    kopf:(x.querySelector(".aufgabe-kopf").innerText||"").trim(),
    knopf:(x.querySelector(".aufgabe-haupt").textContent||"").trim(),
    art:x.querySelector(".aufgabe-haupt").dataset.aufgabe})));
 };
 let l=await aufgaben(A,"employee",[M({id:11,workflow_status:"geruestet",freigegeben_von:A,
   freigegeben_am:"x",ruester_id:B,geruestet_von:B,geruestet_am:"y"})]);
 p(l.length===1&&l[0].art==="monteur","geruestet erzeugt jetzt die Aufgabe 'Monteur zuweisen'",l);
 l=await aufgaben(A,"employee",[M({id:12,workflow_status:"montiert",freigegeben_von:A,
   freigegeben_am:"x",monteur_id:C,montiert_von:C,montiert_am:"z"})]);
 p(l.length===1&&l[0].art==="abschliessen","montiert erzeugt jetzt die Aufgabe 'Abschliessen'",l);
 l=await aufgaben(A,"employee",[M({id:13,workflow_status:"freigegeben",freigegeben_von:A,freigegeben_am:"x",ruester_id:B})]);
 p(l.length===0,"ist schon jemand eingeteilt, ist 'Zuweisen' keine Aufgabe mehr",l);
 l=await aufgaben(A,"employee",[M({id:14,workflow_status:"abgeschlossen"})]);
 p(l.length===0,"eine abgeschlossene Massaufnahme ist keine Aufgabe",l);
 // Eine Massaufnahme ohne Projekt bleibt draussen (unveraendert seit v3.05).
 l=await aufgaben(A,"employee",[M({id:15,project_id:null})]);
 p(l.length===0,"ohne Projekt keine Aufgabe",l);

 // Abschliessen aus der Aufgabe heraus ruft die richtige Funktion.
 await aufgaben(A,"employee",[M({id:12,workflow_status:"montiert",freigegeben_von:A,
   freigegeben_am:"x",monteur_id:C,montiert_von:C,montiert_am:"z"})]);
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'#aufgabenListe [data-aufgabe="abschliessen"]',"Abschliessen in der Aufgabe");
 ruf=await page.evaluate(()=>window.__ruf);
 p(ruf.length===1&&ruf[0].name==="measurement_abschliessen"&&ruf[0].args.p_id===12,
   "Abschliessen aus der Aufgabe ruft measurement_abschliessen",ruf);

 // ---- F · Zugeklappt steht die dringendste Aufgabe da --------------------
 console.log("\nF · Startseite zugeklappt");
 await aufgaben(A,"employee",[
   M({id:21,workflow_status:"montiert",freigegeben_von:A,freigegeben_am:"x",monteur_id:C,montiert_von:C,montiert_am:"z"}),
   M({id:22,workflow_status:"in_bearbeitung",title:"Dringend"})]);
 await page.evaluate(()=>{aufgabenOffen=false;renderAufgaben()});
 const jetzt=await page.evaluate(()=>{
  const e=$("aufgabenJetzt"), st=getComputedStyle(e), r=e.getBoundingClientRect();
  const kk=$("aufgabenKarte").getBoundingClientRect();
  return {sichtbar:st.display!=="none"&&r.height>0,hoehe:Math.round(r.height),
   karte:Math.round(kk.height),text:(e.innerText||"").replace(/\s+/g," ").trim(),
   knopf:!!e.querySelector("[data-aufgabe]"),
   listeSichtbar:getComputedStyle($("aufgabenListe")).display!=="none"};
 });
 p(jetzt.sichtbar&&!jetzt.listeSichtbar,"zugeklappt: eine Aufgabe steht da, die Liste nicht",jetzt);
 p(/Massaufnahme freigeben/.test(jetzt.text),"und zwar die dringendste (rot vor orange)",jetzt.text);
 p(jetzt.knopf,"mit ihrem Knopf",jetzt);
 p(jetzt.karte<=150,"die Karte bleibt schmal",jetzt.karte);
 await page.evaluate(()=>{aufgabenOffen=true;renderAufgaben()});
 const beimOeffnen=await page.evaluate(()=>getComputedStyle($("aufgabenJetzt")).display);
 p(beimOeffnen==="none","offen faellt die Zeile weg - sie steht dann in der Liste",beimOeffnen);

 // ---- G · Cockpit-Liste nennt den Schritt --------------------------------
 console.log("\nG · Projektliste und Arbeitsstand");
 await anmelden(page,A,"employee");
 const badges=await page.evaluate(([A,B])=>({
  frisch:  mwBadgeFuerListe({id:1,project_id:7,created_by:A,workflow_status:"in_bearbeitung"}),
  ruesten: mwBadgeFuerListe({id:2,project_id:7,created_by:A,workflow_status:"zu_ruesten",ruester_id:B}),
  fertig:  mwBadgeFuerListe({id:3,project_id:7,created_by:A,workflow_status:"abgeschlossen"}),
  verfallen:mwBadgeFuerListe({id:4,project_id:7,created_by:A,workflow_status:"in_bearbeitung",freigabe_verfallen:true})
 }),[A,B]);
 p(/Freigeben – du/.test(badges.frisch),"die Liste nennt den Schritt und wer dran ist",badges);
 p(/Rüsten – Bruno Ruester/.test(badges.ruesten),"auch fuer eine fremde Zustaendigkeit",badges);
 p(/Abgeschlossen/.test(badges.fertig)&&!/▸/.test(badges.fertig),"abgeschlossen: nur das Abzeichen",badges);
 p(/⚠️/.test(badges.verfallen)&&/Erneut freigeben/.test(badges.verfallen)&&/title=/.test(badges.verfallen),
   "verfallene Freigabe: Warnzeichen, Schritt und der Grund im Tooltip",badges);

 // Arbeitsstand im Projekt-Cockpit
 const stand=await page.evaluate(([A,B])=>{
  projectMeasurementsCache=[
   {id:1,project_id:7,created_by:A,workflow_status:"in_bearbeitung"},
   {id:2,project_id:7,created_by:A,workflow_status:"in_bearbeitung"},
   {id:3,project_id:7,created_by:A,workflow_status:"zu_ruesten",ruester_id:B},
   {id:4,project_id:7,created_by:A,workflow_status:"abgeschlossen"}];
  cockpitSchrittStand(4);
  const z=$("cockpitStandSchrittZeile");
  return {hidden:z.hidden,sichtbar:getComputedStyle(z).display!=="none",
   wert:$("cockpitSchrittStand").textContent,mark:$("cockpitSchrittMark").textContent}},[A,B]);
 p(stand.sichtbar&&/2 × Freigeben/.test(stand.wert)&&/1 × Rüsten/.test(stand.wert),
   "das Cockpit sagt, was im Projekt ansteht",stand);
 const leer=await page.evaluate(()=>{
  projectMeasurementsCache=[{id:1,workflow_status:"abgeschlossen"}];
  cockpitSchrittStand(1); return $("cockpitSchrittStand").textContent});
 p(leer==="Alles erledigt","alles fertig sagt das auch so",leer);
 const unbekannt=await page.evaluate(()=>{cockpitSchrittStand(null);return $("cockpitSchrittStand").textContent});
 p(unbekannt==="?","ein Ladefehler bleibt ein Fragezeichen, keine erfundene Null",unbekannt);
 const aus=await page.evaluate(()=>{workflowAktiv=false;cockpitSchrittStand(2);
  const z=$("cockpitStandSchrittZeile");
  const r={hidden:z.hidden,sichtbar:getComputedStyle(z).display!=="none"};
  workflowAktiv=true; return r});
 p(aus.hidden&&!aus.sichtbar,"abgeschalteter Ablauf: die Zeile ist wirklich weg (nicht nur hidden)",aus);
 // Dieselbe Falle betrifft die Modulzeile. Seit v3.15 ist es EINE Zeile
 // (Material & Zuschnitt) statt der drei aus v3.09 - ueberholte Erwartung,
 // kein Codefehler; geprueft wird weiterhin dasselbe.
 const modulzeile=await page.evaluate(()=>{
  const z=$("cockpitStandMatZuZeile"); if(!z)return {fehlt:true};
  z.hidden=true;
  return {hidden:z.hidden,sichtbar:getComputedStyle(z).display!=="none"}});
 p(!modulzeile.fehlt&&!modulzeile.sichtbar,"auch die Modulzeile verschwindet wirklich",modulzeile);

 // ---- H · Status korrigieren als Dialog ----------------------------------
 console.log("\nH · Status korrigieren");
 await anmelden(page,D,"admin");
 await oeffne(page,M({workflow_status:"zu_ruesten",freigegeben_von:A,freigegeben_am:"x",ruester_id:B}));
 k=await karte(page);
 p(k.knoepfe.includes("mwKorrigieren"),"der Administrator sieht den Knopf",k.knoepfe);
 letzterDialog="";
 await klick(page,"#mwKorrigieren","Status korrigieren");
 const kor=await page.evaluate(()=>({offen:!$("mwKorrigierenModal").hidden,
   optionen:[...$("mwKorrigierenStatus").options].map(o=>o.textContent),
   gewaehlt:$("mwKorrigierenStatus").value,
   davor:(()=>{const a=$("mwKorrigierenModal").getBoundingClientRect();
     const mitte=document.elementFromPoint(a.left+a.width/2,a.top+30);
     return !!(mitte&&mitte.closest("#mwKorrigierenModal"))})()}));
 p(kor.offen&&letzterDialog==="","ein Dialog statt eines prompt()",{...kor,letzterDialog});
 p(kor.optionen.length===7&&kor.optionen[0]==="In Bearbeitung","alle sieben Zustaende zur Auswahl",kor.optionen);
 p(kor.gewaehlt==="zu_ruesten","der aktuelle Zustand ist vorgewaehlt",kor.gewaehlt);
 p(kor.davor,"der Dialog liegt vor dem Formular",kor);
 await page.evaluate(()=>{window.__ruf=[];window.__rpcAntwort={measurement_workflow_korrigieren:{data:{
   workflow_status:"freigegeben"}}};$("mwKorrigierenStatus").value="freigegeben"});
 await klick(page,"#mwKorrigierenSpeichern","Status setzen");
 ruf=await page.evaluate(()=>window.__ruf);
 p(ruf.length===1&&ruf[0].name==="measurement_workflow_korrigieren"&&ruf[0].args.p_status==="freigegeben",
   "er ruft measurement_workflow_korrigieren mit dem gewaehlten Wert",ruf);
 p(await page.evaluate(()=>$("mwKorrigierenModal").hidden),"und schliesst sich danach");
 // Ein Fehler der Datenbank wird gezeigt, nicht verschluckt.
 await klick(page,"#mwKorrigieren","Status korrigieren (2)");
 await page.evaluate(()=>{window.__rpcAntwort={measurement_workflow_korrigieren:{fehler:"Nur für Firmenadministratoren."}}});
 await klick(page,"#mwKorrigierenSpeichern","Status setzen");
 const kfehler=await page.evaluate(()=>({offen:!$("mwKorrigierenModal").hidden,
   text:$("mwKorrigierenFehler").textContent,sichtbar:!$("mwKorrigierenFehler").hidden}));
 p(kfehler.offen&&kfehler.sichtbar&&/Firmenadministratoren/.test(kfehler.text),
   "eine Ablehnung der Datenbank steht im Dialog",kfehler);
 await page.evaluate(()=>{$("mwKorrigierenModal").hidden=true});
 // Ein Mitarbeiter sieht den Knopf gar nicht.
 await anmelden(page,B,"employee");
 await oeffne(page,M({workflow_status:"zu_ruesten",freigegeben_von:A,freigegeben_am:"x",ruester_id:B}));
 k=await karte(page);
 p(!k.knoepfe.includes("mwKorrigieren"),"ein Mitarbeiter sieht ihn nicht",k.knoepfe);

 // ---- I · Breiten --------------------------------------------------------
 console.log("\nI · Breiten");
 await anmelden(page,A,"employee");
 await oeffne(page,M({workflow_status:"zu_montieren",freigegeben_von:A,freigegeben_am:"x",
   ruester_id:B,geruestet_von:B,geruestet_am:"y",monteur_id:C}));
 for(const w of [320,360,412,768]){
  await page.setViewportSize({width:w,height:1600}); await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const modal=$("measurementEditModal").querySelector(".modalbox");
   const r=modal.getBoundingClientRect();
   const raus=[...modal.querySelectorAll(".mw-streifen,.mw-schritt,.mw-liste,.mw-aktionen")]
     .filter(e=>e.getBoundingClientRect().right>r.right+1).length;
   const leiste=$("measWorkflowBereich").querySelector(".mw-leiste");
   return {raus,scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
     leisteScrollt:leiste?leiste.scrollWidth>leiste.clientWidth+1:false}});
  p(m.raus===0&&!m.scroll,w+" px: nichts laeuft seitlich hinaus",m);
 }
 await page.setViewportSize({width:412,height:2000});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close();
 process.exit(fail?1:0);
})();
