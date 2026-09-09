"use strict";
// ---- Pruefstand: Leistungen + zentrale Ausmass-Vorbereitung (v3.37) -------
//
// Deckt die 14 im Auftrag ("Claude_Auftrag_Leistungen_Ausmass_Vorbereitung.
// txt") nummerierten Testpunkte ab, soweit das mit einem gemockten Supabase-
// Client in echtem Chromium moeglich ist. Die serverseitige RLS-Durchsetzung
// (Testpunkt 13) wurde zusaetzlich LIVE per Supabase-MCP gegen das echte
// Produktivschema geprueft (siehe Abschlussbericht) - hier wird die
// Client-Seite gegengeprueft (nie eine company_id, korrekte project_id).
//
//  1  Leistung anlegen                        -> Abschnitt 2
//  2  Leistung optional mit Offertenposition   -> Abschnitt 3
//  3  Zusatzleistung ohne Offerte moeglich      -> Abschnitt 2
//  4  Leistung mit Massaufnahme verknuepfen     -> Abschnitt 4
//  5  Massaufnahme bleibt technisch unveraendert -> Abschnitt 4, 9 (Struktur)
//  6  Blechstoesse/Zuschnitte NICHT automatisch  -> Abschnitt 6
//     Ausmasspositionen
//  7  Ausmass-Vorbereitung zeigt Kandidaten      -> Abschnitt 5
//  8  Benutzer kann Kandidaten auswaehlen        -> Abschnitt 5
//  9  Auswahl veraendert Massaufnahme nicht      -> Abschnitt 6
// 10  Ausfuehrung liegt auf Leistungsebene       -> Abschnitt 2, 3
// 11  alle 12 Massaufnahme-Funktionen bleiben    -> Abschnitt 9 (Struktur:
//     erhalten                                     keine Fachdatei im Diff)
// 12  bestehende Ausmass-/Berechnungslogik        -> Abschnitt 9 (js/17
//     funktioniert                                  unveraendert)
// 13  RLS/Firmenabgrenzung funktioniert           -> Abschnitt 7 (Client) +
//     Live-SQL gegen das Produktivschema (siehe Abschlussbericht)
// 14  bestehende Regressionstests weiter          -> eigener Lauf der
//     ausfuehrbar                                   gesamten Pruefstand-
//                                                    Sammlung (separater
//                                                    Vorgang)
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-leistungen-v3-37.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}
};

// ---- Attrappe fuer window.supabase.createClient() -------------------------
// Gleiches Muster wie pruefstand-angebote-v3-34.js (Lesespur window.__from,
// Schreibspur window.__schreib, Schalt-Flaggen fuer leere/fehlerhafte
// Antworten je Tabelle).
const ATTRAPPE=`window.supabase={createClient:()=>{
 window.__from=window.__from||[];
 window.__schreib=window.__schreib||[];
 const passt=(z,eqs)=>eqs.every(([f,v])=>z[f]===v);
 const tabelle=t=>{
  const kette={__eq:[],__order:null};
  Object.assign(kette,{
   select:()=>kette,
   eq:(f,v)=>{kette.__eq.push([f,v]);return kette},
   order:(f,o)=>{kette.__order=[f,o];return kette},
   in:()=>kette,not:()=>kette,limit:()=>kette,
   maybeSingle:()=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    const liste=(window.__lese&&window.__lese[t])||[];
    const treffer=liste.find(z=>passt(z,kette.__eq));
    return Promise.resolve({data:treffer||null,error:null});
   },
   then:(res,rej)=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}}).then(res,rej);
    let liste=((window.__lese&&window.__lese[t])||[]).filter(z=>passt(z,kette.__eq));
    if(kette.__order){
     const[f,o]=kette.__order;
     liste=liste.slice().sort((a,b)=>{
      const av=a[f],bv=b[f];
      const c=av<bv?-1:(av>bv?1:0);
      return o&&o.ascending===false?-c:c;
     });
    }
    return Promise.resolve({data:liste,error:null}).then(res,rej);
   },
   insert:d=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"insert",d:zeilen});
    return {select:()=>{
     if(window.__insertLeer&&window.__insertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__insertFehler&&window.__insertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const neu=zeilen.map((x)=>Object.assign({
      id:900+(window.__naechsteId=(window.__naechsteId||0)+1),
      created_by:"u1",created_at:"2026-09-09T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-09T08:00:00Z"
     },x));
     if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].concat(neu);
     else if(window.__lese)window.__lese[t]=neu;
     return Promise.resolve({data:neu,error:null});
    }};
   },
   update:d=>{
    const eintrag={t,op:"update",d,eq:[]};
    window.__schreib.push(eintrag);
    const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
     select:()=>{
      if(window.__updateLeer&&window.__updateLeer[t])return Promise.resolve({data:[],error:null});
      if(window.__updateFehler&&window.__updateFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
      const id=(eintrag.eq.find(e=>e[0]==="id")||[])[1];
      const basis=(window.__zeileFuer&&window.__zeileFuer(t,id))||{};
      return Promise.resolve({data:[Object.assign({},basis,d,{
       id:id!==undefined?id:1,updated_by:"u1",updated_at:"2026-09-09T09:00:00Z"
      })],error:null});
     }};
    return k2;
   },
   delete:()=>{
    const eintrag={t,op:"delete",eq:[]};
    window.__schreib.push(eintrag);
    const obj={eq:(f,v)=>{
     eintrag.eq.push([f,v]);
     const antwort=()=>(window.__deleteFehler&&window.__deleteFehler[t])
      ?{error:{message:"kaputt"}}:{error:null};
     const res={
      then:(res2,rej2)=>Promise.resolve(antwort()).then(res2,rej2),
      select:()=>{
       const a=antwort();
       if(a.error)return Promise.resolve({data:[],error:a.error});
       if(window.__lese&&window.__lese[t])
        window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
       return Promise.resolve({data:[{id:v}],error:null});
      }
     };
     if(!antwort().error&&window.__lese&&window.__lese[t])
      window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
     return res;
    }};
    return obj;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({upload:()=>Promise.resolve({error:null}),createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
 };
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 const repo="/home/user/Spengler---Digital-V1";
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof newLeistung==="function"&&typeof openLeistung==="function"
  &&typeof loadProjectLeistungen==="function"&&typeof leimLaden==="function"
  &&typeof leimUebernehmen==="function"&&typeof COCKPIT_BEREICHE==="object",null,{timeout:15000});
 await page.waitForTimeout(200);

 await page.evaluate(()=>{
  window.__lese={leistungen:[],leistung_massaufnahmen:[],angebote:[],measurements:[],ausmass:[],ausmass_kandidaten:[],audit_log:[]};
  window.__zeileFuer=(t,id)=>{
   const liste=(window.__lese&&window.__lese[t])||[];
   return liste.find(z=>z.id===id)||null;
  };
  currentProfile={id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"};
  allProfiles=[{id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"}];
  meineRechte={admin:false};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1, 3000 Bern",order_no:"2026-045",customer:"Muster AG",archived:false,status:"offen"}];
  settings={employees:["Anna Muster"],rates:[],materials:[]};
  cockpitProjectId=7;
  projectMeasurementsCache=[
   {id:87,type:"rinne_halbrund",title:"Rinne Nord",data:{ausmass:[
    {pos:"1",bezeichnung:"Rinne 32.5 m",menge:32.5,einheit:"m",herkunft:"Länge",teil:false},
    {pos:"2",bezeichnung:"Zuschnitte",menge:11,einheit:"Stk",herkunft:"Anzahl",teil:false},
    {pos:"3",bezeichnung:"Blechstösse",menge:10,einheit:"Stk",herkunft:"Anzahl",teil:false},
    {pos:"4",bezeichnung:"Blechfläche",menge:5.36,einheit:"m²",herkunft:"Fläche",teil:false}
   ]}},
   {id:90,type:"kamineinfassung",title:"Kamin Ost",data:{ausmass:[]}}
  ];
  // window.__lese.measurements speist leimLaden() (echte "DB"-Abfrage);
  // projectMeasurementsCache oben speist dagegen die bereits im Speicher
  // geladene Liste, die z.B. die Massaufnahmen-Auswahl im Leistungsformular
  // zeichnet. Beide muessen dieselben Zeilen tragen, sonst laeuft die
  // Ausmass-Vorbereitung (liest ueber sb.from("measurements")) ins Leere.
  window.__lese.measurements=[
   {id:87,project_id:7,type:"rinne_halbrund",title:"Rinne Nord",data:{ausmass:[
    {pos:"1",bezeichnung:"Rinne 32.5 m",menge:32.5,einheit:"m",herkunft:"Länge",teil:false},
    {pos:"2",bezeichnung:"Zuschnitte",menge:11,einheit:"Stk",herkunft:"Anzahl",teil:false},
    {pos:"3",bezeichnung:"Blechstösse",menge:10,einheit:"Stk",herkunft:"Anzahl",teil:false},
    {pos:"4",bezeichnung:"Blechfläche",menge:5.36,einheit:"m²",herkunft:"Fläche",teil:false}
   ]}},
   {id:90,project_id:7,type:"kamineinfassung",title:"Kamin Ost",data:{ausmass:[]}}
  ];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 console.log("\n1 · Anwendung startet");
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);
 p(await page.evaluate(()=>!$("appRoot").hidden),"App-Wurzel sichtbar");

 // ---- 2 · Leistung anlegen (Test 1), Zusatzleistung ohne Offerte (Test 3),
 //          Ausführung auf Leistungsebene (Test 10) --------------------------
 console.log("\n2 · Leistung anlegen (Test 1), Zusatzleistung ohne Offerte (Test 3), Ausführung auf Leistungsebene (Test 10)");
 await page.evaluate(()=>{ $("projectCockpitModal").hidden=false; newLeistung(); });
 const formularOffen=await page.evaluate(()=>({
  offen:!$("leistungEditModal").hidden,
  cockpitVersteckt:$("projectCockpitModal").hidden
 }));
 p(formularOffen.offen===true,"'＋ Neue Leistung' öffnet das Formular");
 await page.evaluate(()=>{
  $("leiBezeichnung").value="Dachentwässerung komplett";
  $("leiMenge").value="1.00"; $("leiEinheit").value="pausch.";
  $("leiStatus").value="teilweise"; $("leiAusgefuehrteMenge").value="0.5";
  $("leiBemerkung").value="Test";
 });
 const zusatz=await page.evaluate(async()=>{
  window.__schreib=[];
  await leiSpeichern();
  return {insert:window.__schreib.find(x=>x.op==="insert"&&x.t==="leistungen")};
 });
 const zPayload=zusatz.insert&&zusatz.insert.d&&zusatz.insert.d[0];
 p(!!zPayload,"Speichern legt eine Leistung an (Test 1)",zusatz);
 p(!!zPayload&&zPayload.bezeichnung==="Dachentwässerung komplett","mit der eingegebenen Bezeichnung",zPayload);
 p(!!zPayload&&zPayload.angebot_id===null&&zPayload.angebot_position===null,
  "eine Zusatzleistung OHNE Offertenposition ist möglich (Test 3) - angebot_id/angebot_position bleiben null",zPayload);
 p(!!zPayload&&zPayload.status==="teilweise"&&zPayload.ausgefuehrte_menge==="0.5",
  "Ausführungsstatus und ausgeführte Menge liegen direkt an der Leistung (Test 10: Ausführung auf Leistungsebene)",zPayload);
 p(!!zPayload&&zPayload.project_id===7,"und trägt die richtige project_id",zPayload);
 p(!!zPayload&&zPayload.company_id===undefined,
  "der Client schickt NIE eine company_id mit (DEFAULT my_company_id() setzt die Datenbank selbst)",zPayload);

 // ohne Bezeichnung wird gar nicht erst geschrieben
 await page.evaluate(()=>{newLeistung();$("leiBezeichnung").value=""});
 const ohneBezeichnung=await page.evaluate(async()=>{
  window.__schreib=[];
  await leiSpeichern();
  return window.__schreib.length;
 });
 p(ohneBezeichnung===0,"ohne Bezeichnung wird gar nicht erst geschrieben");

 // ---- 3 · Leistung optional mit Offertenposition verbinden (Test 2) -------
 console.log("\n3 · Leistung optional mit einer Offertenposition verbinden (Test 2)");
 await page.evaluate(()=>{
  window.__lese.angebote=[{id:9,title:"Angebot Muster AG",project_id:7,
   positions:[{pos:"1.01",description:"Dachentwässerung",quantity:1,unit:"pausch."}]}];
 });
 await page.evaluate(()=>newLeistung());
 await page.waitForTimeout(50);
 const angebotOptionen=await page.evaluate(()=>Array.from($("leiAngebotPosition").options).map(o=>o.textContent));
 p(angebotOptionen.some(t=>/1\.01/.test(t)),"die Offertenposition erscheint im Auswahlfeld",angebotOptionen);
 p(angebotOptionen[0]==="– keine Offertenposition (Zusatzleistung) –",
  "die erste Option bleibt 'keine Offertenposition' (Zusatzleistung weiterhin möglich)",angebotOptionen);
 await page.evaluate(()=>{
  $("leiBezeichnung").value="Leistung aus Offerte";
  $("leiAngebotPosition").value="0"; // erste (und einzige) echte Offertenposition
 });
 const mitAngebot=await page.evaluate(async()=>{
  window.__schreib=[];
  await leiSpeichern();
  return window.__schreib.find(x=>x.op==="insert"&&x.t==="leistungen");
 });
 const mPayload=mitAngebot&&mitAngebot.d&&mitAngebot.d[0];
 p(!!mPayload&&mPayload.angebot_id===9&&mPayload.angebot_position==="1.01",
  "eine Leistung aus einer Offertenposition trägt angebot_id + angebot_position (Test 2)",mPayload);

 // ---- 4 · Leistung mit einer/mehreren Massaufnahmen verknüpfen (Test 4) ---
 console.log("\n4 · Leistung mit Massaufnahme(n) verknüpfen (Test 4), Massaufnahme bleibt unverändert (Test 5)");
 await page.evaluate(()=>{$("leiAngebotPosition").value="";$("leiBezeichnung").value="Leistung mit Massaufnahme"});
 const listeVorhanden=await page.evaluate(()=>document.querySelectorAll("#leiMassaufnahmenListe [data-lei-mess]").length);
 p(listeVorhanden===2,"die Massaufnahmen-Auswahl zeigt beide vorhandenen Massaufnahmen des Projekts",listeVorhanden);
 const hashVorher=await page.evaluate(()=>JSON.stringify(projectMeasurementsCache));
 await page.evaluate(()=>{
  const cb=document.querySelector('[data-lei-mess="87"]');
  cb.checked=true; cb.dispatchEvent(new Event("change",{bubbles:true}));
 });
 const verknuepft=await page.evaluate(async()=>{
  window.__schreib=[];
  await leiSpeichern();
  return {
   insert:window.__schreib.find(x=>x.op==="insert"&&x.t==="leistungen"),
   lmInsert:window.__schreib.find(x=>x.op==="insert"&&x.t==="leistung_massaufnahmen"),
   lmDelete:window.__schreib.find(x=>x.op==="delete"&&x.t==="leistung_massaufnahmen")
  };
 });
 p(!!verknuepft.lmDelete,"vor dem Neuanlegen der Verknüpfungen wird zuerst aufgeräumt (delete auf leistung_massaufnahmen)",verknuepft);
 const lmPayload=verknuepft.lmInsert&&verknuepft.lmInsert.d&&verknuepft.lmInsert.d[0];
 p(!!lmPayload&&lmPayload.measurement_id===87,"die Verknüpfung mit Massaufnahme 87 wird angelegt (Test 4)",lmPayload);
 p(!!lmPayload&&lmPayload.company_id===undefined,"auch hier ohne company_id vom Client",lmPayload);
 const hashNachher=await page.evaluate(()=>JSON.stringify(projectMeasurementsCache));
 p(hashVorher===hashNachher,
  "das Verknüpfen einer Leistung mit einer Massaufnahme verändert projectMeasurementsCache NICHT (Test 5: Massaufnahme bleibt technisch unverändert)",{gleich:hashVorher===hashNachher});

 // ---- 5 · Ausmass-Vorbereitung zeigt Kandidaten (Test 7), Auswahl (Test 8) -
 console.log("\n5 · Ausmass-Vorbereitung zeigt Kandidaten (Test 7) und lässt sie auswählen (Test 8)");
 await page.evaluate(()=>{
  window.__lese.leistungen=[
   {id:501,project_id:7,bezeichnung:"Dachentwässerung komplett",menge:"1.00",einheit:"pausch."},
   {id:502,project_id:7,bezeichnung:"Mauerabdeckung",menge:"24.50",einheit:"m"}
  ];
  window.__lese.ausmass_kandidaten=[];
 });
 const kand=await page.evaluate(async()=>{
  window.__from=[];
  const n=await leimLaden(7);
  return {n,namen:leimKandidaten.map(k=>k.bezeichnung),quellen:leimKandidaten.map(k=>k.quelle)};
 });
 // 2 Leistungen + 3 Massaufnahme-Positionen mit gesetzter Bezeichnung
 // (die vierte "Blechfläche" hat teil:false, wird aber trotzdem als
 // technischer Ausmass-Kandidat angeboten - siehe Test 6/Abschnitt 6:
 // "angeboten" != "automatisch übernommen").
 p(kand.n===6,"die Ausmass-Vorbereitung findet 2 Leistungen + 4 technische Massaufnahme-Positionen (Test 7)",kand);
 p(kand.namen.includes("Dachentwässerung komplett")&&kand.namen.includes("Mauerabdeckung"),
  "beide Leistungen erscheinen als Kandidaten",kand);
 p(kand.namen.includes("Rinne 32.5 m")&&kand.namen.includes("Blechfläche"),
  "auch die technischen Massaufnahme-Werte (Länge, Fläche) erscheinen als Kandidaten - aber nur als ANGEBOT, nicht automatisch übernommen",kand);
 p(kand.quellen.filter(q=>q==="Leistung").length===2&&kand.quellen.filter(q=>q==="Massaufnahme").length===4,
  "jede Zeile nennt ihre Quelle (Leistung/Massaufnahme)",kand);
 // Auswahl (Test 8)
 await page.evaluate(()=>{
  const cbs=document.querySelectorAll("#leimListe [data-leim-key]");
  cbs[0].checked=true; cbs[0].dispatchEvent(new Event("change",{bubbles:true}));
  cbs[3].checked=true; cbs[3].dispatchEvent(new Event("change",{bubbles:true})); // "Blechfläche"
 });
 const auswahl=await page.evaluate(()=>({anzahl:leimAusgewaehlt.size,knopfDa:!!$("leimUebernehmenBtn")}));
 p(auswahl.anzahl===2,"zwei Kandidaten lassen sich anhaken (Test 8)",auswahl);
 p(auswahl.knopfDa===true,"der Übernehmen-Knopf steht bereit");

 // ---- 6 · Übernehmen: keine automatische Übernahme, Massaufnahme bleibt
 //          unverändert (Test 6, Test 9) -----------------------------------
 console.log("\n6 · Übernehmen ist eine bewusste Auswahl (Test 6), verändert die Massaufnahme nicht (Test 9)");
 const hashVorUebernahme=await page.evaluate(()=>JSON.stringify(projectMeasurementsCache));
 const uebernahme=await page.evaluate(async()=>{
  window.__schreib=[];
  await leimUebernehmen();
  return {
   ausmassInsert:window.__schreib.find(x=>x.op==="insert"&&x.t==="ausmass"),
   kandInsert:window.__schreib.find(x=>x.op==="insert"&&x.t==="ausmass_kandidaten")
  };
 });
 const ausP=uebernahme.ausmassInsert&&uebernahme.ausmassInsert.d&&uebernahme.ausmassInsert.d[0];
 p(!!ausP,"'Übernehmen' legt ein neues Ausmass-Dokument an",uebernahme);
 p(!!ausP&&ausP.type==="offerte_erfassen"&&/^Ausmass-Vorbereitung/.test(ausP.title),
  "vom Typ 'offerte_erfassen' mit erkennbarem Titel (bestehendes Ausmass-Modul sieht nur ein gewöhnliches neues Dokument, Test 12)",ausP);
 p(Array.isArray(ausP.positions)&&ausP.positions.length===2,
  "und genau die 2 AUSGEWÄHLTEN Positionen - NICHT alle 6 Kandidaten (Test 6: keine automatische Übernahme aller Massaufnahme-Positionen)",ausP);
 const kandPayload=uebernahme.kandInsert&&uebernahme.kandInsert.d;
 p(Array.isArray(kandPayload)&&kandPayload.length===2,"und legt für beide je eine ausmass_kandidaten-Zeile zur Nachverfolgung an",kandPayload);
 p(Array.isArray(kandPayload)&&kandPayload.every(k=>k.company_id===undefined),"auch hier ohne company_id vom Client",kandPayload);
 const hashNachUebernahme=await page.evaluate(()=>JSON.stringify(projectMeasurementsCache));
 p(hashVorUebernahme===hashNachUebernahme,
  "projectMeasurementsCache (die Massaufnahmen) ist nach dem Übernehmen BYTE-IDENTISCH - die Auswahl verändert die Massaufnahme nicht (Test 9)",
  {gleich:hashVorUebernahme===hashNachUebernahme});
 // Erneutes Laden: die genommenen Positionen erscheinen nicht mehr doppelt.
 const nachUebernahme=await page.evaluate(async()=>leimLaden(7));
 p(nachUebernahme===4,"nach dem Übernehmen zeigt die Ausmass-Vorbereitung die 2 genommenen Positionen nicht mehr als Kandidaten (6-2=4)",nachUebernahme);

 // ---- 7 · Kein Zugriff auf fremde Firma/Projekte (Client-Seite, Test 13) --
 console.log("\n7 · Client-Seite: keine company_id, kein fremdes Projekt (Test 13 - RLS-Teil siehe Abschlussbericht)");
 const quelltext=require("fs").readFileSync(repo+"/js/65-leistungen.js","utf8");
 const codeZeilenMitCompanyId=quelltext.split("\n").filter(z=>!z.trim().startsWith("//")&&/company_id/.test(z));
 p(codeZeilenMitCompanyId.length===0,
  "js/65-leistungen.js schreibt/liest company_id an KEINER Code-Stelle - die Firmengrenze kommt ausschliesslich aus der Datenbank (RLS)",
  {treffer:codeZeilenMitCompanyId});
 const fremdesProjekt=await page.evaluate(async()=>{
  window.__from=[];
  const n=await loadProjectLeistungen(999999);
  return {n,leer:$("cockpitLeistungenBody").innerHTML.includes("Noch keine")};
 });
 p(fremdesProjekt.n===0,"eine Abfrage auf ein fremdes/unbekanntes Projekt liefert 0 Zeilen",fremdesProjekt);
 p(fremdesProjekt.leer===true,"und zeigt 'Noch keine Leistungen erfasst.' statt fremder Daten",fremdesProjekt);

 // ---- 8 · 0-Zeilen-Fall (CLAUDE.md 24.1) und Löschen ----------------------
 console.log("\n8 · '0 Zeilen ist kein Erfolg' und Löschen aktualisiert auch die Ausmass-Vorbereitung");
 await page.evaluate(()=>{newLeistung();$("leiBezeichnung").value="Nullzeilen-Test"});
 await page.evaluate(()=>{window.__insertLeer={leistungen:true}});
 page.__dialoge=[];
 const nullZeilen=await page.evaluate(async()=>{
  await leiSpeichern();
  return {modalOffen:!$("leistungEditModal").hidden};
 });
 p(nullZeilen.modalOffen===true,"0 betroffene Zeilen gelten NICHT als Erfolg - das Formular bleibt offen",nullZeilen);
 p((page.__dialoge||[]).some(t=>t==="Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"),
  "und zeigt die dafür vorgesehene, klare Meldung",page.__dialoge);
 await page.evaluate(()=>{window.__insertLeer={}});
 await page.evaluate(()=>{leiEditZurueck()});

 await page.evaluate(()=>{
  window.__lese.leistungen=[{id:601,project_id:7,bezeichnung:"Zu löschen"}];
 });
 const loeschen=await page.evaluate(async()=>{
  window.__schreib=[];
  await loadProjectLeistungen(7);
  await leiLoeschen(601);
  return {
   delAufruf:window.__schreib.find(x=>x.op==="delete"&&x.t==="leistungen"),
   nochDa:window.__lese.leistungen.some(l=>l.id===601)
  };
 });
 p(!!loeschen.delAufruf,"Löschen löst genau einen delete()-Aufruf auf leistungen aus",loeschen);
 p(loeschen.nochDa===false,"und die Zeile ist danach weg",loeschen);

 // ---- 9 · Struktur: bestehende Funktionen unangetastet (Test 5/11/12) ----
 console.log("\n9 · Struktur: bestehende Funktionen unangetastet (Test 5, 11, 12)");
 let geaenderteDateien=[];
 try{
  geaenderteDateien=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",
   {cwd:repo,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 }catch(e){geaenderteDateien=null;}
 const mussUnberuehrtSein=[
  "js/17-ausmass.js", // bestehendes Ausmass-Register (Test 12)
  "js/24-projekt-cockpit.js","js/06-rapport.js","js/08-katalog-blitzschutz.js",
  "css/03-druck.css","css/04-rechte.css","js/64-ausfuehrung.js",
  // alle zwoelf Massaufnahme-Fachmodule (Test 11)
  "js/10-massaufnahme.js","js/11-einlaufblech-gerade.js","js/12-rinne-halbrund.js",
  "js/12b-mauerabdeckung.js","js/13-einlaufblech-konisch.js","js/14-freies-profil.js",
  "js/15-einlaufblech-stueckliste.js","js/16-massaufnahme-formular.js",
  "js/19-lukarne.js","js/20-anschlussblech.js","js/21-einfassung-rund.js",
  "js/25-kehle.js","js/26-rinne.js","js/29-einlaufblech-aufnahme.js",
  "js/30-einlaufblech-konisch-aufnahme.js","js/31-freies-profil-aufnahme.js",
  "js/32-mauerabdeckung-aufnahme.js","js/34-kehle-aufnahme.js","js/36-lukarne-aufnahme.js",
  "js/37-kamin-aufnahme.js","js/38-einfassung-aufnahme.js","js/39-rinne-aufnahme.js",
  "js/40-anschlussblech-aufnahme.js","js/33-zuschnitt.js","js/28-rinne-aufnahme.js"
 ];
 if(geaenderteDateien===null){
  p(false,"git diff konnte nicht ausgefuehrt werden - Struktur-Beweis nicht moeglich",{});
 }else{
  const verletzt=mussUnberuehrtSein.filter(f=>geaenderteDateien.includes(f));
  p(verletzt.length===0,
   "keine der 'nicht anzufassenden' Dateien (alle 12 Massaufnahme-Fachmodule, Ausmass, Cockpit-Kern, Regierapport, js/64-ausfuehrung.js) wurde verändert (Test 5, 11, 12)",
   {geaendert:geaenderteDateien,verletzt});
  p(geaenderteDateien.includes("js/65-leistungen.js"),"js/65-leistungen.js ist neu (Grundmodul)",geaenderteDateien);
 }

 // ---- 10 · js/64-ausfuehrung.js bleibt unverändert nutzbar ----------------
 console.log("\n10 · js/64-ausfuehrung.js (v3.36, Massaufnahme-Positionsebene) bleibt unverändert bestehen");
 p(await page.evaluate(()=>typeof ausfBadge==="function"&&typeof AUSF_STATUS==="object"),
  "AUSF_STATUS/ausfBadge() aus js/64 sind weiterhin vorhanden und werden von js/65 wiederverwendet (keine zweite Status-Übersetzung)");

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
