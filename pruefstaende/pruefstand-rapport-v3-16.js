// Prueft die beiden Rueckmeldungen vom 05.09.2026 (v3.16):
//
//  1. "Im regierapport sollte es einen button geben, um materialien aus den
//      massaufnahmen des passenden objekts direkt in den regierapport zu
//      uebernehmen. Hierzu ist evt. in den einzelnen massaufnahmen eine
//      liste noetig ..."
//  2. "Mitarbeiter sollen fest hinterlegte funktionen haben (zb. Polier) und
//      im Regierapport soll dann automatisch die initialien und
//      stundenansaetze des angemeldeten benutzers angezeigt werden."
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche gegen die echte index.html - was
// die App wirklich anzeigt, was sie wirklich an die Datenbank schickt und
// was sie in den Speicher-Payload legt.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt (RLS
// auf profiles und measurements). Das ist serverseitig und wurde per SQL
// gegen das echte Produktivschema geprueft - siehe CLAUDE.md 121.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rapport-v3-16.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,340):""))}};
// Ein Klick auf etwas Verdecktes wuerde 30 s haengen und den Lauf abbrechen -
// das saehe aus wie "keine Fehler" (CLAUDE.md 78).
const waehle=async(page,sel,wert)=>{
 try{ await page.selectOption(sel,wert,{timeout:3000}); return true }
 catch(e){ fail++; console.log("  FEHLGESCHLAGEN: nicht auswaehlbar: "+sel+"  "+String(e.message).split("\n")[0]); return false }
};
const tipp=async(page,sel)=>{
 try{ await page.click(sel,{timeout:3000}); return true }
 catch(e){ fail++; console.log("  FEHLGESCHLAGEN: nicht antippbar: "+sel+"  "+String(e.message).split("\n")[0]); return false }
};

// Der Stub protokolliert jeden Aufruf. profiles-UPDATE und der
// measurements-SELECT sind die beiden Wege, auf die es hier ankommt.
const STUB=`window.__ruf=[];window.__mess=[];window.__profilFehler=false;window.__leereAntwort=false;
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({art:"rpc",name:n,args:a});return {data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_eq:{},_upd:null};
   ['select','order','limit','range','in'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.maybeSingle=async()=>({data:null,error:null});
   f.update=(patch)=>{f._upd=JSON.parse(JSON.stringify(patch));
     window.__ruf.push({art:"update",tabelle:t,patch:f._upd,eq:f._eq});
     const g={_eq:f._eq};
     ['eq'].forEach(k=>g[k]=(s,v)=>{g._eq[s]=v;window.__ruf[window.__ruf.length-1].eq=g._eq;return g});
     g.select=()=>Promise.resolve(window.__profilFehler
        ?{data:null,error:{message:"permission denied"}}
        :{data:window.__leereAntwort?[]:[Object.assign({id:g._eq.id},f._upd)],error:null});
     g.then=(cb)=>g.select().then(cb);
     return g};
   f.then=(cb)=>{
     window.__ruf.push({art:"select",tabelle:t,eq:f._eq});
     let d=[];
     if(t==="measurements")d=window.__mess.filter(m=>m.project_id===f._eq.project_id);
     return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:window.__ladefehler||null}).then(cb)};
   return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'x'},error:null})})}
})};`;

// Der echte Ansatzkatalog von PETER KUENZI AG (per SQL gelesen).
const RATES=[["Meister",145],["SM FZ",126],["Polier",118],["Spe1",110],["Spe2",98]];
const RATE_IDS=[1,2,3,4,5];
const MATERIALS=[
 ["101.10","Schraube 4.5x35","A2","Stk.",0.45],
 ["205.30","Dichtband 15 mm","15 mm","m",2.80],
 ["310.05","Rinnenhalter","","Stk.",6.20]
];

const anmelden=(page,opt)=>page.evaluate(([rates,ids,materials,o])=>{
 // ACHTUNG: der Parameter darf NICHT rateIds heissen - er wuerde die globale
 // Variable verdecken, und die Funktionszuordnung liefe ins Leere.
 settings.rates=rates; rateIds.length=0; rateIds.push(...ids);
 settings.materials=materials;
 // Der angemeldete Benutzer steht BEWUSST nicht an erster Stelle - sonst
 // liesse sich "ist er vorbelegt" nicht von "der erste der Liste" trennen.
 settings.employees=["Anna Bucher","Mike Ledermann","Test Test"];
 employeeIds.length=0; employeeIds.push("u0","u1","u3");
 allProfiles=[{id:"u0",first_name:"Anna",last_name:"Bucher",role:"employee",rate_id:null,company_id:"firma-a"},
              {id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin",rate_id:o.meineFunktion,company_id:"firma-a"},
              {id:"u3",first_name:"Test",last_name:"Test",role:"employee",rate_id:null,company_id:"firma-a"}];
 currentProfile=allProfiles[1];
 meineRechte={admin:true};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 defaultRate=o.defaultRate||"";
 window.__mess=o.mess||[];
 currentProjectId=o.projekt===undefined?7:o.projekt;
 mats.length=0; works.length=0;
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 window.__ruf.length=0;
},[RATES,RATE_IDS,MATERIALS,opt||{}]);

const MESS=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  rapport_material:[{no:"101.10",qty:24},{no:"205.30",qty:12.5}]},
 {id:12,project_id:7,type:"rinne_halbrund",title:"Rinne West",date:"2026-09-02",
  rapport_material:[{no:"310.05",qty:8}]},
 {id:13,project_id:7,type:"skizze_foto",title:"Foto",date:"2026-09-03",rapport_material:[]}
];

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzteMeldung=""; page.on("dialog",d=>{letzteMeldung=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // =========================================================================
 // A · Mitarbeiter-Funktion: die Vorbelegung
 // =========================================================================
 console.log("\nA · Vorbelegung einer neuen Arbeitsposition");

 // A1: Der angemeldete Benutzer hat "Polier" hinterlegt (rate_id 3).
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3});
 let z=await page.evaluate(()=>{const w=neueArbeitsposition();
   return {w,ansatz:rateFor(w.rateName)}});
 p(z.w.employee==="Mike Ledermann","der angemeldete Benutzer ist vorbelegt",z.w);
 p(z.w.rateName==="Polier","seine hinterlegte Funktion ist vorbelegt",z.w);
 p(z.ansatz===118,"und damit sein Stundenansatz",z);

 // A2: In der Tabelle steht er wirklich - mit seinen Initialen.
 await page.evaluate(()=>{works.push(neueArbeitsposition());renderMain()});
 z=await page.evaluate(()=>{
  const emp=document.querySelector('[data-w-emp="0"]');
  const rate=document.querySelector('[data-w-rate="0"]');
  return {emp:emp.value,initialen:emp.options[emp.selectedIndex].textContent,
    rate:rate.value,ansatzZelle:document.querySelector('[data-work-rate-cell="0"]').textContent};
 });
 p(z.emp==="Mike Ledermann"&&z.initialen==="ML","die Zeile zeigt seine Initialen",z);
 p(z.rate==="Polier"&&/118/.test(z.ansatzZelle),"und seinen Ansatz",z);

 // A3: Ohne hinterlegte Funktion bleibt es beim bisherigen Verhalten.
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:null,defaultRate:"Spe1"});
 z=await page.evaluate(()=>neueArbeitsposition());
 p(z.employee==="Mike Ledermann","ohne Funktion ist der Benutzer trotzdem vorbelegt",z);
 p(z.rateName==="Spe1","und die Funktion faellt auf den Standard aus den Einstellungen zurueck",z);

 // A4: Weder Funktion noch Standard -> erste Funktion, wie bis v3.15.
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:null,defaultRate:""});
 z=await page.evaluate(()=>neueArbeitsposition());
 p(z.rateName==="Meister","ohne beides die erste Funktion - unveraendert",z);

 // A5: Angemeldeter Benutzer steht NICHT in der Mitarbeiterliste -> es wird
 //     niemand erfunden.
 z=await page.evaluate(()=>{
  const merk=currentProfile;
  currentProfile={id:"x",first_name:"Fremd",last_name:"Person",rate_id:null};
  const w=neueArbeitsposition(); currentProfile=merk; return w;
 });
 p(z.employee==="Anna Bucher","wer nicht in der Liste steht, wird nicht eingesetzt - dann der erste",z);

 // A6: Eine geloeschte Funktion (rate_id zeigt ins Leere) erfindet nichts.
 z=await page.evaluate(()=>{
  const merk=currentProfile.rate_id; currentProfile.rate_id=999;
  const f=profilFunktion(currentProfile); const w=neueArbeitsposition();
  currentProfile.rate_id=merk; return {f,w};
 });
 p(z.f===""&&z.w.rateName==="Meister","eine nicht mehr vorhandene Funktion wird nicht geraten",z);

 // A7: EINE Quelle - alle fuenf Stellen rufen sie auf.
 const fs=require("fs");
 const dateien=["js/03-login.js","js/04-start-suche.js","js/06-rapport.js","js/08-katalog-blitzschutz.js","js/09-projekte.js"];
 const rufe=dateien.filter(d=>/neueArbeitsposition\(\)/.test(fs.readFileSync(d,"utf8")));
 p(rufe.length===5,"alle fuenf Stellen nutzen dieselbe Funktion",rufe);
 const alt=dateien.filter(d=>/employee:settings\.employees\[0\]/.test(fs.readFileSync(d,"utf8"))&&d!=="js/06-rapport.js");
 p(alt.length===0,"und keine baut die Arbeitsposition noch selbst",alt);

 // =========================================================================
 // B · Mitarbeiter-Funktion: die Einstellung
 // =========================================================================
 console.log("\nB · Funktion in den Einstellungen");
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3});
 await page.evaluate(()=>{
  // Ueber den echten Weg oeffnen. Ohne geoeffneten Einstellungsdialog UND
  // aufgeklappten Abschnitt ist jedes Feld unsichtbar und jede gemessene
  // Hoehe 0 (CLAUDE.md 113.5).
  $("startScreen").hidden=true;
  openSettingsTo("protected","employees");
  renderMitarbeiterSettings();
 });
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>{
  const s=$("empFunktion1");   // Mike, mit hinterlegter Funktion
  return {da:!!s,anzahl:s?s.options.length:0,wert:s?s.value:null,
   erste:s?s.options[0].textContent:"",
   texte:s?[...s.options].slice(1,3).map(o=>o.textContent.trim()):[],
   hoehe:s?Math.round(s.getBoundingClientRect().height):0,
   anzahlZeilen:document.querySelectorAll("[data-emp-funktion]").length};
 });
 p(z.da&&z.anzahlZeilen===3,"jeder Mitarbeiter hat ein Auswahlfeld",z);
 p(z.anzahl===RATES.length+1&&/keine hinterlegt/.test(z.erste),"mit allen Funktionen und einem Leereintrag",z);
 p(z.wert==="3","die hinterlegte Funktion ist vorgewaehlt",z);
 p(/Polier · CHF 118/.test(z.texte.join("|"))||/CHF/.test(z.texte.join("|")),"der Ansatz steht dabei",z.texte);

 // B2: Auswahl aendern -> genau ein UPDATE auf profiles, ohne company_id.
 await page.evaluate(()=>{window.__ruf.length=0});
 await waehle(page,"#empFunktion0","2");
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>({rufe:window.__ruf.slice(),
   profil:(allProfiles.find(x=>x.id==="u0")||{}).rate_id}));
 const upd=z.rufe.filter(r=>r.art==="update"&&r.tabelle==="profiles");
 p(upd.length===1,"genau ein UPDATE",z.rufe);
 p(upd[0]&&upd[0].patch.rate_id===2,"mit der gewaehlten Funktion",upd[0]);
 p(upd[0]&&upd[0].eq.id==="u0","auf genau diesen Mitarbeiter",upd[0]);
 p(upd[0]&&upd[0].patch.company_id===undefined,"und OHNE company_id vom Client",upd[0]);
 p(z.profil===2,"der geladene Stand wird nachgefuehrt",z);

 // B3: "keine hinterlegt" -> NULL.
 await page.evaluate(()=>{window.__ruf.length=0});
 await waehle(page,"#empFunktion0","");
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>window.__ruf.filter(r=>r.art==="update"));
 p(z.length===1&&z[0].patch.rate_id===null,"\"keine hinterlegt\" speichert NULL",z);

 // B4: Von RLS still abgelehnt (0 Zeilen) gilt NICHT als Erfolg.
 await page.evaluate(()=>{window.__leereAntwort=true;renderMitarbeiterSettings()});
 letzteMeldung="";
 await waehle(page,"#empFunktion2","4");
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>({wert:$("empFunktion2")?$("empFunktion2").value:null,
   profil:(allProfiles.find(x=>x.id==="u3")||{}).rate_id}));
 p(/nichts gespeichert/i.test(letzteMeldung),"0 geschriebene Zeilen sind KEIN Erfolg",letzteMeldung);
 p(z.wert===""&&(z.profil===null||z.profil===undefined),"die Auswahl springt zurueck",z);
 await page.evaluate(()=>{window.__leereAntwort=false});

 // B5: Echter Fehler der Datenbank wird genannt.
 await page.evaluate(()=>{window.__profilFehler=true;renderMitarbeiterSettings()});
 letzteMeldung="";
 await waehle(page,"#empFunktion2","4");
 await page.waitForTimeout(200);
 p(/permission denied/.test(letzteMeldung),"ein echter Fehler kommt beim Benutzer an",letzteMeldung);
 await page.evaluate(()=>{window.__profilFehler=false});

 // =========================================================================
 // C · Materialliste in der Massaufnahme
 // =========================================================================
 console.log("\nC · Material fuer den Regierapport in der Massaufnahme");
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3,mess:MESS});
 await page.evaluate(()=>{
  $("settingsModal").hidden=true;
  $("measurementEditModal").hidden=false;
  $("measType").value="skizze_foto"; showMeasTypeSection("skizze_foto");
  measRapportMaterialZuruecksetzen();
 });
 await page.waitForTimeout(120);
 z=await page.evaluate(()=>({block:!!$("measRapportMaterial"),
   text:($("measRapportMaterialBody").innerText||"").trim(),
   knopf:!!$("measRapportMaterialAdd")}));
 p(z.block&&z.knopf,"der Block steht im Massaufnahme-Formular",z);
 p(/Noch kein Material erfasst/.test(z.text),"leer sagt er das auch",z);

 // C2: Zeile anlegen, Nummer Zeichen fuer Zeichen tippen, Fokus behalten.
 if(await tipp(page,"#measRapportMaterialAdd")){
  if(!await tipp(page,'[data-rmat-nr="0"]'))throw new Error("Feld nicht erreichbar");
  await page.keyboard.type("101.10",{delay:15});
  z=await page.evaluate(()=>({wert:document.querySelector('[data-rmat-nr="0"]').value,
    fokus:document.activeElement&&document.activeElement.dataset.rmatNr==="0",
    vorschlag:($("rmatSug0").innerText||"").trim(),
    modell:JSON.parse(JSON.stringify(measRapportMaterial))}));
  p(z.wert==="101.10"&&z.fokus,"die Nummer laesst sich tippen, ohne den Fokus zu verlieren",z);
  p(/Schraube/.test(z.vorschlag),"die Vorschlagsliste kommt aus dem bestehenden Katalog",z.vorschlag);
  p(z.modell[0]&&z.modell[0].no==="101.10","und steht im Modell",z.modell);
 }
 // C3: Menge, dann Feld verlassen -> Bezeichnung aus dem Katalog daneben.
 // Erst aus dem Nummernfeld heraus - die Vorschlagsliste muss sich dabei
 // schliessen, sonst ist das Mengenfeld verdeckt (im Browser gemessen).
 await page.evaluate(()=>{document.querySelector('[data-rmat-nr="0"]').blur()});
 await page.waitForTimeout(250);
 p(await page.evaluate(()=>($("rmatSug0").innerHTML||"").trim()===""),
   "die Vorschlagsliste schliesst beim Verlassen des Feldes und verdeckt die Menge nicht");
 // Und der Fall, den das Neuzeichnen NICHT abdeckt: die Liste ist offen,
 // der Wert wurde aber nicht veraendert - dann feuert kein change.
 await page.evaluate(()=>{const f=document.querySelector('[data-rmat-nr="0"]');
   f.focus(); f.dispatchEvent(new Event("input",{bubbles:true}))});
 await page.waitForTimeout(100);
 const offen=await page.evaluate(()=>($("rmatSug0").innerHTML||"").trim()!=="");
 await page.evaluate(()=>{document.querySelector('[data-rmat-nr="0"]').blur()});
 await page.waitForTimeout(250);
 p(offen&&await page.evaluate(()=>($("rmatSug0").innerHTML||"").trim()===""),
   "auch ohne Wertaenderung schliesst sie beim Verlassen",{offen});
 if(!await tipp(page,'[data-rmat-qty="0"]')){console.log("  (Mengenfeld nicht erreichbar - Abschnitt C unvollstaendig)")}
 await page.keyboard.type("24",{delay:15});
 await page.evaluate(()=>{document.querySelector('[data-rmat-nr="0"]').dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(100);
 z=await page.evaluate(()=>({text:($("measRapportMaterialBody").innerText||"").replace(/\s+/g," ").trim(),
   payload:measRapportMaterialAusFormular()}));
 p(/Schraube 4.5x35/.test(z.text)&&/A2/.test(z.text),"die Bezeichnung aus dem Katalog steht daneben",z.text);
 p(z.payload.length===1&&z.payload[0].no==="101.10"&&z.payload[0].qty===24,"der Payload traegt Nummer und Menge",z.payload);

 // C4: Eine unbekannte Nummer wird als solche ausgewiesen, nicht geraten.
 await page.evaluate(()=>{measRapportMaterial=[{no:"999.01",qty:3}];renderMeasRapportMaterial()});
 z=await page.evaluate(()=>($("measRapportMaterialBody").innerText||"").replace(/\s+/g," ").trim());
 p(/nicht im Katalog/.test(z),"eine unbekannte EDV-Nr. wird benannt statt geraten",z);

 // C5: Der Payload landet wirklich im Speicher-Objekt - fuer JEDE Art.
 z=await page.evaluate(()=>{
  measRapportMaterial=[{no:"101.10",qty:5}];
  const raus={};
  ["skizze_foto","einlaufblech_gerade","rinne_halbrund","kehle","kamineinfassung"].forEach(t=>{
   $("measType").value=t;
   const f=buildMeasurementFromForm();
   raus[t]=f.rapport_material;
  });
  return raus;
 });
 p(Object.keys(z).every(t=>z[t]&&z[t].length===1&&z[t][0].no==="101.10"),
   "jede Art traegt die Liste im Speicher-Objekt",z);

 // C6: Leere Zeilen fallen weg.
 z=await page.evaluate(()=>{measRapportMaterial=[{no:"",qty:""},{no:"101.10",qty:2},{no:"  ",qty:9}];
   return measRapportMaterialAusFormular()});
 p(z.length===1,"leere Zeilen kommen nicht in den Payload",z);

 // C7: Ein Datensatz VOR v3.16 (ohne Spalte) oeffnet mit leerer Liste - es
 //     wird nichts erfunden.
 z=await page.evaluate(()=>{measRapportMaterialFuellen({id:5,title:"Alt"});
   return {modell:measRapportMaterial,text:($("measRapportMaterialBody").innerText||"").trim()}});
 p(z.modell.length===0&&/Noch kein Material/.test(z.text),"ein alter Datensatz erfindet nichts",z);

 // C8: rapport_material steht NICHT in data - sonst wuerde die Freigabe
 //     bei jeder Materialzeile verfallen (v3.06).
 z=await page.evaluate(()=>{measRapportMaterial=[{no:"101.10",qty:5}];
   $("measType").value="skizze_foto";
   const f=buildMeasurementFromForm();
   return {inData:Object.keys(f.data||{}).indexOf("rapport_material")>=0,
           obenDran:Array.isArray(f.rapport_material)}});
 p(!z.inData&&z.obenDran,"die Liste steht ausserhalb von data",z);

 // C9: Auch der Speicherweg schickt sie mit (Payload wird dort eigens gebaut).
 const q16=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
 p((q16.match(/rapport_material:form\.rapport_material\|\|\[\]/g)||[]).length===2,
   "beide Speicherwege (online und Warteschlange) schicken sie mit");

 // =========================================================================
 // D · Uebernahme in den Regierapport
 // =========================================================================
 console.log("\nD · Uebernahme in den Regierapport");
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3,mess:MESS});
 z=await page.evaluate(()=>({knopf:!!$("rmatOeffnen"),text:($("rmatOeffnen").innerText||"").trim(),
   hoehe:0}));
 p(z.knopf&&/Aus Massaufnahmen/i.test(z.text),"der Knopf steht im Regierapport",z);

 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>({offen:!$("rmatModal").hidden,
   text:($("rmatListe").innerText||"").replace(/\s+/g," ").trim(),
   kaesten:document.querySelectorAll("[data-rmat-wahl]").length,
   gewaehlt:document.querySelectorAll("[data-rmat-wahl]:checked").length,
   knopf:($("rmatUebernehmenBtn").innerText||"").trim(),
   rufe:window.__ruf.filter(r=>r.art==="select"&&r.tabelle==="measurements")}));
 p(z.offen,"der Dialog geht auf");
 p(z.rufe.length===1&&z.rufe[0].eq.project_id===7,"genau eine Abfrage, auf dieses Projekt",z.rufe);
 p(z.rufe[0]&&z.rufe[0].eq.company_id===undefined,"OHNE company_id-Filter im Client",z.rufe[0]);
 p(z.kaesten===3,"alle drei Materialzeilen der beiden Massaufnahmen",z);
 p(z.gewaehlt===3,"beim Oeffnen ist alles gewaehlt",z);
 p(/\(3\)/.test(z.knopf),"die Zahl am Knopf ist die Zahl der Zeilen",z.knopf);
 p(/Kein Material erfasst/.test(z.text),"eine Massaufnahme ohne Liste sagt das und nennt den Weg",z.text);
 p(/Schraube/.test(z.text)&&/Rinnenhalter/.test(z.text),"die Bezeichnung kommt aus dem Katalog",z.text.slice(0,200));

 // D2: Uebernehmen -> Zeilen im Rapport, mit dem Datum der Massaufnahme.
 if(await tipp(page,"#rmatUebernehmenBtn")){
  await page.waitForTimeout(150);
  z=await page.evaluate(()=>({mats:JSON.parse(JSON.stringify(mats)),
    zu:$("rmatModal").hidden,zeilen:document.querySelectorAll("[data-mat-search]").length}));
  p(z.mats.length===3,"drei Zeilen sind im Rapport",z.mats);
  p(z.mats[0]&&z.mats[0].no&&z.mats[0].qty!==undefined,"mit Nummer und Menge",z.mats[0]);
  p(z.mats.every(m=>/^2026-09-0[12]$/.test(m.date)),"mit dem Datum der jeweiligen Massaufnahme",z.mats.map(m=>m.date));
  p(z.mats.every(m=>m.price===undefined),"OHNE mitkopierten Preis - der kommt aus dem Katalog",z.mats);
  p(z.zu&&z.zeilen===3,"der Dialog schliesst und die Tabelle zeigt sie",z);
 }
 // D3: Das Zeilentotal rechnet mit dem Katalogpreis.
 z=await page.evaluate(()=>({total:$("matTotal").textContent,
   erwartet:(24*0.45+12.5*2.80+8*6.20).toFixed(2)}));
 p(z.total.replace("'","")===z.erwartet,"das Total rechnet mit dem Katalogpreis",z);

 // D4: Zweiter Aufruf - was schon drin ist, ist NICHT vorgewaehlt.
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>({kaesten:document.querySelectorAll("[data-rmat-wahl]").length,
   gewaehlt:document.querySelectorAll("[data-rmat-wahl]:checked").length,
   knopf:($("rmatUebernehmenBtn").innerText||"").trim(),
   gesperrt:$("rmatUebernehmenBtn").disabled,
   text:($("rmatListe").innerText||"").replace(/\s+/g," ").trim()}));
 p(z.kaesten===3&&z.gewaehlt===0,"was schon im Rapport steht, ist nicht vorgewaehlt",z);
 p(/steht bereits im Rapport/.test(z.text),"und wird als solches benannt",z.text.slice(0,200));
 p(/\(0\)/.test(z.knopf)&&z.gesperrt,"der Knopf ist dann gesperrt - man drueckt nie ins Leere",z);

 // D5: "Alle auswaehlen" und "Keine" wirken.
 await tipp(page,"#rmatAlle");
 z=await page.evaluate(()=>({gewaehlt:document.querySelectorAll("[data-rmat-wahl]:checked").length,
   gesperrt:$("rmatUebernehmenBtn").disabled}));
 p(z.gewaehlt===3&&!z.gesperrt,"\"Alle auswaehlen\" waehlt alle",z);
 await tipp(page,"#rmatKeine");
 z=await page.evaluate(()=>({gewaehlt:document.querySelectorAll("[data-rmat-wahl]:checked").length,
   gesperrt:$("rmatUebernehmenBtn").disabled}));
 p(z.gewaehlt===0&&z.gesperrt,"\"Keine\" waehlt ab und sperrt",z);

 // D6: Ein einzelnes Haken wirkt.
 await page.evaluate(()=>{const k=document.querySelector("[data-rmat-wahl]");k.checked=true;
   k.dispatchEvent(new Event("change",{bubbles:true}))});
 z=await page.evaluate(()=>({knopf:($("rmatUebernehmenBtn").innerText||"").trim(),
   gesperrt:$("rmatUebernehmenBtn").disabled}));
 p(/\(1\)/.test(z.knopf)&&!z.gesperrt,"ein einzelnes Haken zaehlt mit",z);
 await tipp(page,"#rmatSchliessen");

 // D7: Ohne Projekt wird nichts geladen.
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3,mess:MESS,projekt:null});
 letzteMeldung="";
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>({offen:!$("rmatModal").hidden,
   rufe:window.__ruf.filter(r=>r.tabelle==="measurements").length}));
 p(!z.offen&&z.rufe===0&&/Projekt auswählen/i.test(letzteMeldung),
   "ohne Projekt wird nichts geladen und klar gesagt warum",{z,letzteMeldung});

 // D8: Ein Projekt ohne Massaufnahmen.
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3,mess:[]});
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>($("rmatListe").innerText||"").trim());
 p(/noch keine Massaufnahme/i.test(z),"ein Projekt ohne Massaufnahme sagt das",z);
 await page.evaluate(()=>{$("rmatModal").hidden=true});

 // D9: Ladefehler wird gezeigt, nicht verschwiegen.
 await page.evaluate(()=>{window.__ladefehler={message:"permission denied"}});
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>($("rmatListe").innerText||"").trim());
 p(/permission denied/.test(z),"ein Ladefehler steht im Dialog",z);
 await page.evaluate(()=>{window.__ladefehler=null;$("rmatModal").hidden=true});

 // =========================================================================
 // E · Sichtbarkeit und Struktur
 // =========================================================================
 console.log("\nE · Sichtbarkeit und Struktur");
 await anmelden(page,{rateIds:RATE_IDS,meineFunktion:3,mess:MESS});
 // Register-Art: der Block folgt derselben Regel wie die Fotos.
 z=await page.evaluate(()=>{
  $("measType").value="einlaufblech_gerade"; showMeasTypeSection("einlaufblech_gerade");
  ebaSetzeSchritt(1);
  const a={mat:$("measRapportMaterial").hidden,foto:$("measMedienBereich").hidden};
  ebaSetzeSchritt(EBA_REGISTER.length);
  const b={mat:$("measRapportMaterial").hidden,foto:$("measMedienBereich").hidden};
  $("measType").value="skizze_foto"; showMeasTypeSection("skizze_foto");
  const c={mat:$("measRapportMaterial").hidden,foto:$("measMedienBereich").hidden};
  return {a,b,c};
 });
 p(z.a.mat&&z.a.foto,"waehrend der Register ist der Block zu - wie die Fotos",z.a);
 p(!z.b.mat&&!z.b.foto,"auf dem letzten Register steht er da",z.b);
 p(!z.c.mat&&!z.c.foto,"bei einer Art ohne Register immer",z.c);

 // E2: Hilfetexte vorhanden (Regel 108.2).
 z=await page.evaluate(()=>["meas-rapportmaterial","rmat-uebernehmen"].map(k=>({k,
   text:!!(HILFE_TEXTE[k]&&HILFE_TEXTE[k].text),
   knopf:!!document.querySelector('[data-hilfe="'+k+'"]')})));
 p(z.every(x=>x.text&&x.knopf),"beide neuen Bereiche haben einen Info-Knopf mit Text",z);

 // E3: Vier Bildschirmbreiten - nichts laeuft seitlich hinaus.
 console.log("\nF · Bildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  await page.evaluate(async()=>{await rmatOeffnen()});
  await page.waitForTimeout(200);
  const u=await page.evaluate(()=>{
   const raus=[];
   document.querySelectorAll("#rmatModal *").forEach(e=>{
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)raus.push(e.tagName+"."+e.className);
   });
   return {raus:raus.slice(0,3),scrollt:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(u.raus.length===0&&!u.scrollt,"Dialog passt bei "+w+" px",u);
  await page.evaluate(()=>{$("rmatModal").hidden=true});
 }
 await page.setViewportSize({width:412,height:1800});
 // Das Kaestchen ist nicht 40 px hoch und die Zeile nicht GROSS (CLAUDE.md 72.5).
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>{
  const k=document.querySelector("[data-rmat-wahl]");
  const l=k.closest("label");
  const cs=getComputedStyle(l);
  const r=k.getBoundingClientRect();
  return {h:Math.round(r.height),w:Math.round(r.width),tt:cs.textTransform,
    links:Math.round(r.left)<Math.round(l.getBoundingClientRect().left)+40};
 });
 p(z.h>=16&&z.h<=26&&z.w>=16&&z.w<=26,"das Kaestchen hat eine normale Groesse",z);
 p(z.tt==="none","die Auswahlzeile steht nicht in GROSSBUCHSTABEN",z);
 await page.evaluate(()=>{$("rmatModal").hidden=true});

 p(fehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",fehler.slice(0,3));
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
