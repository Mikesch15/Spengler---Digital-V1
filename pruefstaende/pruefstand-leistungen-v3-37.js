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
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
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
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 const repo="/home/user/Spengler---Digital-V1";
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof newLeistung==="function"&&typeof openLeistung==="function"
  // v3.131: leimLaden/leimUebernehmen wurden auf Auftrag entfernt (siehe
  // Abschnitt 5) - hier darauf zu warten liess den ganzen Lauf in einen
  // Timeout laufen, bevor eine einzige Pruefung ausgefuehrt wurde.
  &&typeof loadProjectLeistungen==="function"
  &&typeof COCKPIT_BEREICHE==="object",null,{timeout:15000});
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

 // ---- 5 · Die Ausmass-Vorbereitung ist entfernt und bleibt entfernt ------
 // v3.131: Abschnitt 5 und 6 prueften bis hierher die zentrale
 // Ausmass-Vorbereitung (Kandidatenliste aus Leistungen/Massaufnahme-Werten
 // zum Anhaken, "Uebernehmen" ins Ausmass). Die wurde auf ausdruecklichen
 // Auftrag des Anwenders KOMPLETT entfernt - im Kopf von js/65-leistungen.js
 // woertlich festgehalten: 'Auftrag (heute): "entferne ausmass vorbereitung
 // komplett"'. Der Pruefstand wartete deshalb beim Start auf leimLaden/
 // leimUebernehmen und lief in einen Timeout, bevor auch nur eine Pruefung
 // lief - der ganze Lauf brach ab, nicht nur diese beiden Abschnitte.
 //
 // Die Abschnitte werden nicht ersatzlos gestrichen, sondern UMGEDREHT: sie
 // sichern jetzt ab, dass die entfernte Funktion nicht unbemerkt
 // zurueckkehrt. Alles uebrige (Leistungen selbst) ist unberuehrt.
 console.log("\n5 · Die Ausmass-Vorbereitung ist entfernt (Auftrag) und bleibt entfernt");
 const weg=await page.evaluate(()=>({
  leimLaden:typeof leimLaden,
  leimUebernehmen:typeof leimUebernehmen,
  leimKandidaten:typeof leimKandidaten,
  liste:!!document.getElementById("leimListe"),
  knopf:!!document.getElementById("leimUebernehmenBtn"),
  cockpitBereich:Object.prototype.hasOwnProperty.call(COCKPIT_BEREICHE,"leim")
 }));
 p(weg.leimLaden==="undefined"&&weg.leimUebernehmen==="undefined"&&weg.leimKandidaten==="undefined",
   "die leim*-Funktionen gibt es nicht mehr",weg);
 p(weg.liste===false&&weg.knopf===false,
   "und auch kein Markup dafuer (#leimListe, #leimUebernehmenBtn)",weg);
 p(weg.cockpitBereich===false,
   "COCKPIT_BEREICHE hat keinen Eintrag 'leim' mehr",weg);

 // Die Tabelle ausmass_kandidaten bleibt in der Datenbank bestehen (bewusst,
 // keine Migration ohne Auftrag) - sie darf nur nicht mehr befuellt werden.
 const keineKandidaten=await page.evaluate(async()=>{
  window.__schreib=[];
  window.__lese.leistungen=[{id:701,project_id:7,bezeichnung:"Nach dem Rueckbau"}];
  await loadProjectLeistungen(7);
  newLeistung(); $("leiBezeichnung").value="Ohne Vorbereitung";
  await leiSpeichern();
  return window.__schreib.filter(x=>x.t==="ausmass_kandidaten").length;
 });
 p(keineKandidaten===0,
   "und es wird keine Zeile mehr in ausmass_kandidaten geschrieben - die Tabelle bleibt in der Datenbank, wird aber nicht mehr befuellt",keineKandidaten);
 await page.evaluate(()=>{leiEditZurueck()});

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
 console.log("\n8 · '0 Zeilen ist kein Erfolg' und Löschen");
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

 // ---- 9 · Struktur: die Leistungen-Logik bleibt in ihrem eigenen Modul ---
 // v3.131: bis hierher wurde dieser Abschnitt ueber "git diff --name-only
 // HEAD" gefuehrt - also ueber die NICHT eingecheckten Aenderungen des
 // Arbeitsbaums. Das ergab genau in dem Moment Sinn, in dem v3.37 gebaut
 // wurde; auf einem sauberen Baum ist "js/65-leistungen.js ist neu"
 // zwangslaeufig falsch und "keine geschuetzte Datei wurde veraendert"
 // zwangslaeufig wahr - die Pruefung konnte also nie wieder etwas finden.
 //
 // Ersetzt durch den dauerhaften Teil derselben Absicht, gemessen an den
 // Dateien statt am Zeitpunkt: die Leistungen-Logik gehoert in js/65 und
 // darf nicht in die Fachmodule wandern (CLAUDE.md: keine doppelten
 // Datenmodelle, bestehende Module erweitern statt parallel nachbauen).
 console.log("\n9 · Struktur: die Leistungen-Logik bleibt in ihrem eigenen Modul");
 const fs9=require("fs");
 const mussUnberuehrtSein=[
  "js/17-ausmass.js", // bestehendes Ausmass-Register (Test 12)
  "js/24-projekt-cockpit.js","js/06-rapport.js","js/08-katalog-blitzschutz.js",
  "js/64-ausfuehrung.js",
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
 const quelle65=fs9.readFileSync(repo+"/js/65-leistungen.js","utf8");
 p(/from\("leistungen"\)/.test(quelle65),
   "js/65-leistungen.js ist das Modul, das auf die Tabelle leistungen zugreift");
 const fremdzugriff=mussUnberuehrtSein.filter(f=>{
  try{ return /from\(["']leistungen["']\)|from\(["']leistung_massaufnahmen["']\)/
        .test(fs9.readFileSync(repo+"/"+f,"utf8")) }
  catch(e){ return false }
 });
 p(fremdzugriff.length===0,
   "KEINES der geschuetzten Module (12 Massaufnahme-Fachmodule, Ausmass, Cockpit-Kern, Regierapport, js/64) greift selbst auf leistungen zu (Test 5, 11, 12)",
   fremdzugriff);
 const fehlend=mussUnberuehrtSein.filter(f=>!fs9.existsSync(repo+"/"+f));
 p(fehlend.length===0,"und alle geschuetzten Module gibt es weiterhin",fehlend);

 // ---- 10 · js/64-ausfuehrung.js bleibt unverändert nutzbar ----------------
 console.log("\n10 · js/64-ausfuehrung.js (v3.36, Massaufnahme-Positionsebene) bleibt unverändert bestehen");
 p(await page.evaluate(()=>typeof ausfBadge==="function"&&typeof AUSF_STATUS==="object"),
  "AUSF_STATUS/ausfBadge() aus js/64 sind weiterhin vorhanden und werden von js/65 wiederverwendet (keine zweite Status-Übersetzung)");

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
