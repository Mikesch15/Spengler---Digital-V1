// Prueft die Firmenadmin-Uebersicht ueber alle Massaufnahmen (v3.08).
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche. Wer den Einstieg ueberhaupt sieht,
// welche Datenbankfunktion mit welchen Werten gerufen wird, was in der Liste
// steht, ob die Filter greifen, und dass eine projektlose Massaufnahme als
// solche gekennzeichnet ist und ueber die Zuordnung repariert werden kann.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt. Das
// ist serverseitig und wurde per SQL gegen das echte Produktivschema geprueft
// (siehe CLAUDE.md 113): Mitarbeiter abgewiesen, fremde Firma abgewiesen,
// Admin einer gesperrten Firma abgewiesen, fremdes Projekt abgewiesen.
// Die Oberflaeche ist reine Fuehrung.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-admin-uebersicht-v3-08.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
// Ein fehlendes Element darf den Lauf NICHT abbrechen - ein abgebrochener
// Pruefstand sieht aus wie "keine Fehler" (CLAUDE.md 78).
const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s);
 if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
const klick=async(page,sel,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,120));return false}
};
const waehle=async(page,sel,wert,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Auswahl")+" sichtbar ("+sel+")");return false}
 try{await page.selectOption(sel,wert,{timeout:4000});return true}
 catch(e){p(false,(was||"Auswahl")+" bedienbar ("+sel+")",String(e).slice(0,120));return false}
};

const STUB=`window.__ruf=[];window.__zeilen=[];window.__rpcAntwort={};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   const a=window.__rpcAntwort&&window.__rpcAntwort[name];
   if(a&&a.fehler)return {data:null,error:{message:a.fehler}};
   return {data:a?a.data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_eq:{}};
   ['select','order','limit','range','in'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.maybeSingle=async()=>{
     const r=(window.__zeilen||[]).find(z=>String(z.id)===String(f._eq.id));
     return {data:r||null,error:null}};
   f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);
   return f},
 storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}
})};`;

const MIKE="aaaa1111-1111-1111-1111-111111111111";
const LEO ="bbbb2222-2222-2222-2222-222222222222";
const ANNA="cccc3333-3333-3333-3333-333333333333";

// Der Aufbau bildet den echten Produktivbestand nach: Massaufnahmen mit
// Projekt in verschiedenen Stadien - und welche ganz ohne Projekt, die es
// dort tatsaechlich gibt.
const ZEILEN=[
 {id:11,project_id:3,projekt_name:"Test Strasse 11",projekt_adresse:"Teststrasse 11, 3000 Bern",
  projekt_archiviert:false,projekt_status:"in_arbeit",type:"rinne_halbrund",title:"Rinne Nord",
  datum:"2026-09-01",created_by:MIKE,created_at:"2026-09-01T08:00:00Z",updated_by:MIKE,
  updated_at:"2026-09-05T10:00:00Z",workflow_status:"zu_ruesten",freigabe_verfallen:false,
  freigegeben_von:MIKE,freigegeben_am:"2026-09-02T09:00:00Z",ruester_id:LEO,
  geruestet_von:null,geruestet_am:null,monteur_id:ANNA,montiert_von:null,montiert_am:null},
 {id:12,project_id:3,projekt_name:"Test Strasse 11",projekt_adresse:"Teststrasse 11, 3000 Bern",
  projekt_archiviert:false,projekt_status:"in_arbeit",type:"lukarne",title:"Lukarne West",
  datum:"2026-09-03",created_by:LEO,created_at:"2026-09-03T08:00:00Z",updated_by:LEO,
  updated_at:"2026-09-04T10:00:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:true,
  freigegeben_von:null,freigegeben_am:null,ruester_id:LEO,
  geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null},
 {id:13,project_id:4,projekt_name:"Steildachsanierung",projekt_adresse:"Bergweg 5",
  projekt_archiviert:true,projekt_status:"abgeschlossen",type:"kehle",title:"Kehle Ost",
  datum:"2026-08-20",created_by:ANNA,created_at:"2026-08-20T08:00:00Z",updated_by:ANNA,
  updated_at:"2026-08-25T10:00:00Z",workflow_status:"abgeschlossen",freigabe_verfallen:false,
  freigegeben_von:ANNA,freigegeben_am:"2026-08-21T09:00:00Z",ruester_id:null,
  geruestet_von:null,geruestet_am:null,monteur_id:ANNA,montiert_von:ANNA,montiert_am:"2026-08-24T10:00:00Z"},
 {id:14,project_id:null,projekt_name:null,projekt_adresse:null,projekt_archiviert:null,
  projekt_status:null,type:"mauerabdeckung",title:"Jklk",datum:"2026-08-28",
  created_by:MIKE,created_at:"2026-08-28T20:31:00Z",updated_by:MIKE,updated_at:"2026-08-28T20:31:00Z",
  workflow_status:"in_bearbeitung",freigabe_verfallen:false,freigegeben_von:null,freigegeben_am:null,
  ruester_id:null,geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null},
 {id:16,project_id:null,projekt_name:null,projekt_adresse:null,projekt_archiviert:null,
  projekt_status:null,type:"lukarne",title:"Test",datum:"2026-08-30",
  created_by:MIKE,created_at:"2026-08-30T17:33:00Z",updated_by:MIKE,updated_at:"2026-08-30T17:33:00Z",
  workflow_status:"in_bearbeitung",freigabe_verfallen:false,freigegeben_von:null,freigegeben_am:null,
  ruester_id:null,geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null}
];

const anmelden=(page,rolle)=>page.evaluate(([r,MIKE,LEO,ANNA,zeilen])=>{
 currentProfile={id:MIKE,role:r,first_name:"Mike",last_name:"Ledermann"};
 allProfiles=[{id:MIKE,first_name:"Mike",last_name:"Ledermann"},
              {id:LEO,first_name:"Leo",last_name:"Bock"},
              {id:ANNA,first_name:"Anna",last_name:"Weber"}];
 meineRechte={admin:r==="admin"};
 allProjects=[{id:3,name:"Test Strasse 11",object:"Teststrasse 11, 3000 Bern",archived:false},
              {id:4,name:"Steildachsanierung",object:"Bergweg 5",archived:true},
              {id:36,name:"Brandschaden",object:"Dorfstrasse 2",archived:false}];
 window.__rpcAntwort["admin_alle_massaufnahmen"]={data:zeilen};
 window.__zeilen=zeilen.map(z=>({id:z.id,project_id:z.project_id,type:z.type,title:z.title,data:{}}));
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 // showStart() - sonst ist der Startbildschirm versteckt und jede Messung an
 // seinen Knoepfen liefert 0 px.
 if(typeof showStart==="function")showStart();
 if(typeof auKnopfAktualisieren==="function")auKnopfAktualisieren();
},[rolle,MIKE,LEO,ANNA,ZEILEN]);

const liste=(page)=>page.evaluate(()=>{
 const e=$("auListe");
 return {text:(e.innerText||"").replace(/\s+/g," ").trim(),
         zeilen:[...e.querySelectorAll(".au-zeile")].map(z=>({
           text:(z.innerText||"").replace(/\s+/g," ").trim(),
           ohneProjekt:z.classList.contains("au-ohne-projekt"),
           knoepfe:[...z.querySelectorAll("button")].map(b=>b.textContent.trim())})),
         zaehler:($("auZaehler").innerText||"").replace(/\s+/g," ").trim()};
});

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);

 // --- A) Wer sieht den Einstieg ------------------------------------------
 console.log("\nA) Einstieg nur fuer Firmenadministratoren");
 await anmelden(page,"employee");
 p(await page.evaluate(()=>$("navAdminMeas").hidden)===true,"Mitarbeiter sieht den Knopf nicht");
 await anmelden(page,"admin");
 p(await page.evaluate(()=>$("navAdminMeas").hidden)===false,"Administrator sieht den Knopf");
 const knopfH=await page.evaluate(()=>$("navAdminMeas").getBoundingClientRect().height);
 p(knopfH>=34,"Knopf ist gross genug ("+Math.round(knopfH)+" px)",knopfH);

 // --- B) Laden ------------------------------------------------------------
 console.log("\nB) Laden");
 await page.evaluate(()=>{window.__ruf=[];auOeffnen()});
 await page.waitForTimeout(300);
 const ruf=await page.evaluate(()=>window.__ruf);
 p(ruf.length===1&&ruf[0].name==="admin_alle_massaufnahmen","genau ein Aufruf, und zwar der geschuetzten Funktion",ruf);
 p(ruf[0]&&ruf[0].args&&ruf[0].args.p_limit===1000,"mit Obergrenze 1000",ruf[0]&&ruf[0].args);
 p(await page.evaluate(()=>$("adminMeasModal").hidden)===false,"Uebersicht ist offen");

 let L=await liste(page);
 p(L.zeilen.length===5,"alle 5 Massaufnahmen angezeigt",L.zeilen.length);
 p(/5 Massaufnahmen/.test(L.zaehler),"Zaehler nennt die Gesamtzahl",L.zaehler);
 p(/2 ohne Projekt/.test(L.zaehler),"Zaehler nennt die projektlosen",L.zaehler);

 // --- C) Was in einer Zeile steht ----------------------------------------
 console.log("\nC) Zuordnung und Status in der Zeile");
 const z11=L.zeilen.find(z=>/Rinne Nord/.test(z.text));
 p(!!z11,"Zeile der Massaufnahme 11 vorhanden");
 p(z11&&/Teststrasse 11, 3000 Bern/.test(z11.text),"Adresse als Haupttitel",z11&&z11.text);
 p(z11&&/Rinne Halbrund/.test(z11.text),"Art der Massaufnahme genannt",z11&&z11.text);
 p(z11&&/Zu rüsten/.test(z11.text),"Arbeitsstatus genannt",z11&&z11.text);
 p(z11&&/Aufgenommen: Mike Ledermann/.test(z11.text),"Ersteller genannt",z11&&z11.text);
 p(z11&&/Rüsten: Leo Bock/.test(z11.text),"Ruester genannt",z11&&z11.text);
 p(z11&&/Montage: Anna Weber/.test(z11.text),"Monteur genannt",z11&&z11.text);
 p(z11&&/Zuletzt geändert/.test(z11.text),"letzte Aenderung genannt",z11&&z11.text);
 p(z11&&!/undefined|NaN|null/.test(z11.text),"kein undefined/NaN/null",z11&&z11.text);

 const z12=L.zeilen.find(z=>/Lukarne West/.test(z.text));
 p(z12&&/Freigabe verfallen/.test(z12.text),"verfallene Freigabe wird als solche gezeigt",z12&&z12.text);
 const z13=L.zeilen.find(z=>/Kehle Ost/.test(z.text));
 p(z13&&/Archiviert/.test(z13.text),"archiviertes Projekt gekennzeichnet",z13&&z13.text);
 p(z13&&/Abgeschlossen/.test(z13.text),"abgeschlossener Status gezeigt",z13&&z13.text);

 // --- D) Ohne Projekt -----------------------------------------------------
 console.log("\nD) Massaufnahmen ohne Projekt");
 const ohne=L.zeilen.filter(z=>z.ohneProjekt);
 p(ohne.length===2,"beide projektlosen erkannt",ohne.length);
 p(ohne.every(z=>/Ohne Projekt/.test(z.text)),"als 'Ohne Projekt' gekennzeichnet",ohne.map(z=>z.text));
 p(ohne.every(z=>z.knoepfe.some(k=>/Projekt zuordnen/.test(k))),"bieten 'Projekt zuordnen' an",ohne.map(z=>z.knoepfe));
 p(ohne.every(z=>!z.knoepfe.some(k=>/Massaufnahme öffnen/.test(k))),
   "bieten NICHT 'oeffnen' an - ohne Projekt laesst sich nichts oeffnen",ohne.map(z=>z.knoepfe));
 const mit=L.zeilen.filter(z=>!z.ohneProjekt);
 p(mit.every(z=>z.knoepfe.some(k=>/Massaufnahme öffnen/.test(k))),"Zeilen mit Projekt bieten 'oeffnen'",mit.map(z=>z.knoepfe));

 // --- E) Filter -----------------------------------------------------------
 console.log("\nE) Filter und Suche");
 await page.evaluate(()=>{window.__ruf=[]});
 await page.fill("#auSuche","lukarne");
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===2,"Suche 'lukarne' findet 2",L.zeilen.length);
 p((await page.evaluate(()=>window.__ruf)).length===0,"Suche loest KEINE neue Abfrage aus");
 await page.fill("#auSuche","Leo");
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===2,"Suche nach Person findet 2 (Ersteller + Rüster)",L.zeilen.length);
 await page.fill("#auSuche","");
 await page.waitForTimeout(120);

 if(!await waehle(page,"#auFilterProjekt","ohne","Filter auFilterProjekt")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===2&&L.zeilen.every(z=>z.ohneProjekt),"Filter 'ohne Projekt' zeigt genau die zwei",L.zeilen.length);
 if(!await waehle(page,"#auFilterProjekt","3","Filter auFilterProjekt")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===2,"Filter nach Projekt 3 zeigt 2",L.zeilen.length);
 if(!await waehle(page,"#auFilterProjekt","","Filter auFilterProjekt")){}
 await page.waitForTimeout(120);

 if(!await waehle(page,"#auFilterTyp","kehle","Filter auFilterTyp")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===1&&/Kehle Ost/.test(L.zeilen[0].text),"Filter nach Art",L.zeilen.length);
 if(!await waehle(page,"#auFilterTyp","","Filter auFilterTyp")){}
 await page.waitForTimeout(120);

 if(!await waehle(page,"#auFilterPerson",ANNA,"Filter auFilterPerson")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===2,"Filter nach Person findet Ersteller UND Monteur",L.zeilen.length);
 if(!await waehle(page,"#auFilterPerson","","Filter auFilterPerson")){}
 await page.waitForTimeout(120);

 const chips=await page.evaluate(()=>({hidden:$("auStatusFilter").hidden,
   text:($("auStatusFilter").innerText||"").replace(/\s+/g," ").trim()}));
 p(chips.hidden===false,"Status-Chips sichtbar (mehrere Status vorhanden)",chips);
 p(/Freigabe verfallen/.test(chips.text),"eigener Chip fuer verfallene Freigabe",chips.text);
 if(!await klick(page,'[data-au-status="verfallen"]',"Chip verfallen")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===1&&/Lukarne West/.test(L.zeilen[0].text),"Chip 'verfallen' filtert richtig",L.zeilen.length);
 if(!await klick(page,'[data-au-status=""]',"Chip Alle")){}
 await page.waitForTimeout(120);
 L=await liste(page);
 p(L.zeilen.length===5,"Chip 'Alle' zeigt wieder alle",L.zeilen.length);

 // Kombination, die nichts trifft
 await page.fill("#auSuche","gibtesnicht");
 await page.waitForTimeout(120);
 L=await liste(page);
 p(/Keine Massaufnahme passt/.test(L.text),"eigene Meldung, wenn nichts passt",L.text);
 await page.fill("#auSuche","");
 await page.waitForTimeout(120);

 // --- F) Oeffnen ----------------------------------------------------------
 console.log("\nF) Oeffnen und Rueckkehr");
 await page.evaluate(()=>{window.__ruf=[]});
 if(!await klick(page,'[data-au-oeffnen="11"]',"Oeffnen-Knopf")){}
 await page.waitForTimeout(300);
 const nachOeffnen=await page.evaluate(()=>({
   uebersicht:$("adminMeasModal").hidden, formular:$("measurementEditModal").hidden,
   rueckziel:measEditReturnTo}));
 p(nachOeffnen.uebersicht===true&&nachOeffnen.formular===false,"Massaufnahme geoeffnet",nachOeffnen);
 p(nachOeffnen.rueckziel==="adminMeasModal","Rueckziel ist die Uebersicht",nachOeffnen.rueckziel);
 // Ueber den echten Knopf zurueck - jeder Aufrufer schliesst das Formular
 // selbst, bevor er measEditZurueck() ruft (js/16).
 if(!await klick(page,"#cancelMeasurement","Abbrechen im Formular")){}
 await page.waitForTimeout(400);
 p(await page.evaluate(()=>$("adminMeasModal").hidden)===false,"Zurueck fuehrt in die Uebersicht");
 p(await page.evaluate(()=>$("measurementEditModal").hidden)===true,"Formular ist danach zu");

 // --- G) Projekt zuordnen -------------------------------------------------
 console.log("\nG) Projekt zuordnen");
 if(!await klick(page,'[data-au-zuweisen="14"]',"Zuordnen-Knopf")){}
 await page.waitForTimeout(200);
 const dlg=await page.evaluate(()=>({
   offen:!$("adminMeasZuweisenModal").hidden,
   titel:($("auZuweisenTitel").innerText||"").trim(),
   optionen:[...$("auZuweisenProjekt").options].map(o=>o.text)}));
 p(dlg.offen===true,"Dialog geoeffnet");
 p(/Jklk/.test(dlg.titel),"Dialog nennt die Massaufnahme",dlg.titel);
 p(dlg.optionen.some(o=>/Teststrasse 11/.test(o)),"aktive Projekte zur Auswahl",dlg.optionen);
 p(!dlg.optionen.some(o=>/Bergweg 5/.test(o)),"archiviertes Projekt NICHT zur Auswahl",dlg.optionen);
 // Der Dialog liegt ueber dem Modal darunter (sonst waere er nicht bedienbar)
 const obenauf=await page.evaluate(()=>{
   const b=$("auZuweisenSpeichern").getBoundingClientRect();
   const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
   return !!(e&&(e.id==="auZuweisenSpeichern"||e.closest("#auZuweisenSpeichern")))});
 p(obenauf,"Dialog liegt oben auf und ist bedienbar");

 // ohne Auswahl -> klare Meldung, kein Aufruf
 await page.evaluate(()=>{window.__ruf=[]});
 if(!await klick(page,"#auZuweisenSpeichern","Zuordnen-Speichern")){}
 await page.waitForTimeout(150);
 p((await page.evaluate(()=>window.__ruf)).length===0,"ohne Projektwahl kein Aufruf");
 p(await page.evaluate(()=>!$("auZuweisenFehler").hidden),"ohne Projektwahl klare Meldung");

 if(!await waehle(page,"#auZuweisenProjekt","3","Projektauswahl")){}
 await page.evaluate(()=>{window.__ruf=[];window.__rpcAntwort["admin_massaufnahme_projekt_zuweisen"]={data:14}});
 if(!await klick(page,"#auZuweisenSpeichern","Zuordnen-Speichern")){}
 await page.waitForTimeout(300);
 const zuRuf=(await page.evaluate(()=>window.__ruf)).find(r=>r.name==="admin_massaufnahme_projekt_zuweisen");
 p(!!zuRuf,"die geschuetzte Zuordnungsfunktion wird gerufen");
 p(zuRuf&&zuRuf.args.p_id===14&&zuRuf.args.p_project_id===3,"mit den richtigen Werten",zuRuf&&zuRuf.args);
 p(await page.evaluate(()=>$("adminMeasZuweisenModal").hidden)===true,"Dialog danach zu");
 p((await page.evaluate(()=>window.__ruf)).some(r=>r.name==="admin_alle_massaufnahmen"),"Liste wird neu geladen");

 // Fehler der Datenbank kommt an und wird NICHT als Erfolg ausgegeben
 if(!await klick(page,'[data-au-zuweisen="16"]',"Zuordnen-Knopf (zweite)")){}
 await page.waitForTimeout(150);
 if(!await waehle(page,"#auZuweisenProjekt","3","Projektauswahl")){}
 await page.evaluate(()=>{window.__rpcAntwort["admin_massaufnahme_projekt_zuweisen"]={fehler:"Dieses Projekt gehört nicht zu Ihrer Firma."}});
 if(!await klick(page,"#auZuweisenSpeichern","Zuordnen-Speichern")){}
 await page.waitForTimeout(200);
 const fz=await page.evaluate(()=>({offen:!$("adminMeasZuweisenModal").hidden,
   text:($("auZuweisenFehler").innerText||"").trim(),sichtbar:!$("auZuweisenFehler").hidden}));
 p(fz.offen&&fz.sichtbar&&/gehört nicht zu Ihrer Firma/.test(fz.text),
   "Fehler der Datenbank wird gezeigt, Dialog bleibt offen",fz);
 if(!await klick(page,"#auZuweisenAbbrechen","Zuordnen-Abbrechen")){}
 await page.waitForTimeout(120);

 // --- H) Fehler- und Leerfaelle -------------------------------------------
 console.log("\nH) Fehler- und Leerfaelle");
 await page.evaluate(()=>{window.__rpcAntwort["admin_alle_massaufnahmen"]={fehler:"Nur für Firmenadministratoren."}});
 await page.evaluate(()=>auNeuLaden());
 await page.waitForTimeout(250);
 L=await liste(page);
 p(/konnte nicht geladen werden/.test(L.text)&&/Firmenadministratoren/.test(L.text),
   "Fehlermeldung der Datenbank wird gezeigt",L.text);
 p(L.zeilen.length===0,"und keine erfundene Liste",L.zeilen.length);

 await page.evaluate(()=>{window.__rpcAntwort["admin_alle_massaufnahmen"]={data:[]}});
 await page.evaluate(()=>auNeuLaden());
 await page.waitForTimeout(250);
 L=await liste(page);
 p(/Noch keine Massaufnahmen/.test(L.text),"eigener Text, wenn es wirklich keine gibt",L.text);

 // --- I) Info-Knoepfe ------------------------------------------------------
 console.log("\nI) Info-Knoepfe (CLAUDE.md 108.2)");
 for(const k of ["admin-uebersicht","admin-zuordnen"]){
  const da=await page.evaluate(s=>typeof HILFE_TEXTE!=="undefined"&&!!HILFE_TEXTE[s]
    &&HILFE_TEXTE[s].titel&&HILFE_TEXTE[s].text.length>=80,k);
  p(da,"Hilfetext '"+k+"' vorhanden und ausreichend lang");
  p(await page.evaluate(s=>!!document.querySelector('.hilfe-knopf[data-hilfe="'+s+'"]'),k),
    "Info-Knopf '"+k+"' im Markup");
 }

 // --- J) Breiten -----------------------------------------------------------
 console.log("\nJ) Bildschirmbreiten");
 await page.evaluate(z=>{window.__rpcAntwort["admin_alle_massaufnahmen"]={data:z}},ZEILEN);
 await page.evaluate(()=>auNeuLaden());
 await page.waitForTimeout(250);
 for(const w of [320,390,412,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  await page.waitForTimeout(120);
  const ueber=await page.evaluate(()=>{
   const m=$("adminMeasModal");
   const b=[...m.querySelectorAll(".au-zeile,.au-filter,#auStatusFilter,#auListe,#auZaehler")];
   const rand=m.getBoundingClientRect().right;
   return b.filter(e=>e.getBoundingClientRect().right>rand+1).length;
  });
  const scroll=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  p(ueber===0&&!scroll,"Breite "+w+" px: nichts laeuft hinaus, kein seitliches Scrollen",{ueber,scroll});
 }
 await page.setViewportSize({width:412,height:1800});

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH",e);process.exit(2)});
