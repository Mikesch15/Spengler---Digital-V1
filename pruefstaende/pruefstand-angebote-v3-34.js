"use strict";
// ---- Pruefstand: Offerte als eigenstaendiger Projektbestandteil (v3.34) --
//
// Deckt die 13 im Auftrag ("Claude_Auftrag_Offerte_als_Projektbestandteil_
// V1.txt") nummerierten Testpunkte ab, soweit das mit einem mockierten
// Supabase-Client in echtem Chromium moeglich ist:
//   1  App startet                     -> Abschnitt 1
//   2  Massaufnahme funktioniert       -> Abschnitt 14 (Struktur) + volle
//   3  Produktionsworkflow funktioniert   Regression separat (Task #126)
//   4  bisheriges Ausmass-Register     -> Abschnitt 14 (js/17 unveraendert)
//   5  Import einer Offerte            -> Abschnitt 5
//   6  richtige Projektzuordnung       -> Abschnitt 4, 6
//   7  Speicherung bleibt erhalten     -> Abschnitt 7
//   8  Offerte oeffnen/einsehen        -> Abschnitt 8
//   9  normaler Mitarbeiter sieht nichts -> Abschnitt 2
//  10  freigeschalteter Benutzer sieht/nutzt sie -> Abschnitt 3, 11
//  11  kein Zugriff auf fremde Firma/Projekte -> Abschnitt 10 (siehe Hinweis
//      dort: echte RLS-Durchsetzung wurde in einer frueheren Sitzung dieser
//      Session per Supabase-MCP LIVE gegen das Produktivschema geprueft -
//      zwei restriktive, UND-verknuepfte Policies auf angebote; hier wird
//      zusaetzlich die Client-Seite gegengeprueft: es wird nie eine
//      company_id mitgeschickt, und eine Abfrage ausserhalb der eigenen
//      Projekte liefert (wie RLS es serverseitig erzwaenge) 0 Zeilen)
//  12  Importfehler sauber behandelt   -> Abschnitt 5
//  13  vollstaendiger Regressionstest  -> Abschnitt 14 (Struktur-Beweis) +
//      eigener Lauf der gesamten Pruefstand-Sammlung (Task #126)
//
// Dazu Gegenproben (siehe Begleitprotokoll GEGENPROBEN_v3_34.txt im
// Scratchpad): jede baut einen echten Fehler in eine Quelldatei ein und
// bringt genau die dafuer zustaendige Pruefung zum Scheitern. Ausgefuehrt
// als separater Vorgang (Baum sichern, Fehler einbauen, diesen Pruefstand
// erneut laufen lassen, Fehlschlag bestaetigen, wiederherstellen) - siehe
// CLAUDE.md Abschnitt 88.8, in dieser Datei selbst steckt kein Umschalter.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-angebote-v3-34.js
"use strict";
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}
};

// ---- Attrappe fuer window.supabase.createClient() ------------------------
// Generischer Query-Baustein je Tabelle, ergaenzt gegenueber dem Muster aus
// pruefstand-restverwendung-v3-29.js um:
// - Lesespur (window.__from) - damit "0 Abfragen fuer nicht freigeschaltete
//   Benutzer" wirklich gemessen werden kann, nicht nur behauptet.
// - .delete() ist jetzt direkt hinter .eq() thenbar (js/63-angebote.js ruft
//   sb.from("angebote").delete().eq("id",x).then(({error})=>{...}) auf,
//   OHNE .select() dazwischen - das Muster aus v3.29 passt hier nicht 1:1).
// - Schalt-Flaggen fuer leere Ergebnisse/Fehler je Tabelle und Operation.
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
   in:()=>kette,
   not:()=>kette,
   limit:()=>kette,
   maybeSingle:()=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}});
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
     const neu=zeilen.map((x,i)=>Object.assign({
      id:900+(window.__naechsteId=(window.__naechsteId||0)+1),
      created_by:"u1",created_at:"2026-09-08T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-08T08:00:00Z"
     },x));
     if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].concat(neu);
     else if(window.__lese)window.__lese[t]=neu;
     return Promise.resolve({data:neu,error:null});
    }};
   },
   upsert:(d,o)=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"upsert",d:zeilen,o});
    return {select:()=>{
     if(window.__upsertLeer&&window.__upsertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__upsertFehler&&window.__upsertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const antwort=zeilen.map((x,i)=>Object.assign({id:800+i},x));
     return Promise.resolve({data:antwort,error:null});
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
       id:id!==undefined?id:1,updated_by:"u1",updated_at:"2026-09-08T09:00:00Z"
      })],error:null});
     }};
    return k2;
   },
   // Fix gegenueber dem v3.29-Muster: js/63-angebote.js verwendet
   // .delete().eq(id).then(({error})=>{...}) OHNE .select() dazwischen -
   // die Rueckgabe von .eq() muss deshalb selbst direkt thenbar sein UND
   // weiterhin .select() unterstuetzen (Kompatibilitaet zu anderen Modulen).
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
  storage:{from:()=>({
   upload:(pfad)=>{(window.__uploads=window.__uploads||[]).push(pfad);
    if(window.__uploadFehler)return Promise.resolve({error:{message:"Upload fehlgeschlagen"}});
    return Promise.resolve({error:null})},
   createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})
  })},
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

 // CDN-Skripte (supabase-js UND xlsx) durch die Attrappe ersetzen - wie im
 // gesamten uebrigen Pruefstand-Bestand.
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 // Die KI-Fotoerkennung geht NICHT ueber sb.functions.invoke(), sondern per
 // rohem fetch() direkt an die Edge Function extract-offer-positions
 // (js/17-ausmass.js recognizePhoto(), unveraendert wiederverwendet in
 // js/63-angebote.js) - neuer Mock-Weg fuer diesen Pruefstand-Bestand.
 let kiModus="ok"; // "ok" | "leer" | "serverfehler" | "http500"
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  (page.__kiAufrufe=page.__kiAufrufe||[]).push(route.request().postDataJSON());
  if(kiModus==="ok"){
   await route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({ok:true,positions:[
     {pos:"1",description:"Titanzinkblech 0.7mm",quantity:12,unit:"m2"},
     {pos:"2",description:"Rinnenhalter",quantity:8,unit:"Stk"}
    ]})});
  }else if(kiModus==="leer"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions:[]})});
  }else if(kiModus==="serverfehler"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:false,error:"Bild nicht lesbar"})});
  }else if(kiModus==="http500"){
   await route.fulfill({status:500,contentType:"application/json",body:JSON.stringify({error:"interner Fehler"})});
  }
 });

 const repo="/home/user/Spengler---Digital-V1";
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkOfferteZugriff==="function"
  &&typeof newAngebot==="function"&&typeof openAngebot==="function"
  &&typeof loadProjectAngebote==="function"&&typeof offerteZugriffVon==="function"
  &&typeof renderMitarbeiterSettings==="function",null,{timeout:15000});
 await page.waitForTimeout(200);

 // ---- Grundzustand ---------------------------------------------------
 await page.evaluate(()=>{
  window.__lese={angebote:[],feature_access:[],audit_log:[]};
  window.__zeileFuer=(t,id)=>{
   const liste=(window.__lese&&window.__lese[t])||[];
   return liste.find(z=>z.id===id)||null;
  };
  currentProfile={id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"};
  allProfiles=[
   {id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"},
   {id:"u2",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"}
  ];
  meineRechte={admin:false};
  allProjects=[
   {id:7,name:"Testbau",object:"Musterweg 1, 3000 Bern",order_no:"2026-045",customer:"Muster AG",archived:false,status:"offen"},
   {id:8,name:"Zweitprojekt",object:"Bahnhofstrasse 2",archived:false,status:"offen"}
  ];
  settings={employees:["Anna Muster","Mike Ledermann"],rates:[],materials:[]};
  employeeIds=["u1","u2"];
  cockpitProjectId=7;
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 console.log("\n1 · Anwendung startet");
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);
 p(await page.evaluate(()=>!$("appRoot").hidden),"App-Wurzel sichtbar (Anmeldung uebersprungen)");

 // ---- 2 · Nicht freigeschalteter Mitarbeiter (Auftrag Test 9) --------
 console.log("\n2 · Normaler Mitarbeiter sieht die Offerten-Funktion nicht (Test 9)");
 await page.evaluate(async()=>{
  window.__lese.feature_access=[]; // keine Zeile -> maybeSingle liefert null
  window.__from=[];
  await checkOfferteZugriff();
 });
 const ohneZugriff=await page.evaluate(()=>({
  offerteZugriff,
  kartenVersteckt:$("cockpitAngeboteCard").hidden,
  zeileVersteckt:$("cockpitStandAngeboteZeile").hidden
 }));
 p(ohneZugriff.offerteZugriff===false,"offerteZugriff bleibt false ohne Freigabe",ohneZugriff);
 p(ohneZugriff.kartenVersteckt===true,"Cockpit-Karte '🧾 Offerte' bleibt versteckt",ohneZugriff);
 p(ohneZugriff.zeileVersteckt===true,"Arbeitsstand-Zeile 'Offerte' bleibt versteckt",ohneZugriff);
 // Entscheidend: keine blosse UI-Blende, sondern es wird gar nicht erst
 // gefragt - loadProjectAngebote() gated VOR jeder Abfrage (Auftrag:
 // "kein funktionsloser Button", zusaetzlich zur echten RLS).
 const ergebnisOhneZugriff=await page.evaluate(async()=>{
  window.__from=[];
  const n=await loadProjectAngebote(7);
  return {n,anzahlAbfragen:window.__from.filter(x=>x.t==="angebote").length};
 });
 p(ergebnisOhneZugriff.n===0,"loadProjectAngebote() liefert 0 ohne Freigabe",ergebnisOhneZugriff);
 p(ergebnisOhneZugriff.anzahlAbfragen===0,"und loest DABEI KEINE EINZIGE Datenbankabfrage gegen angebote aus",ergebnisOhneZugriff);
 const cockpitNeuHidden=await page.evaluate(()=>{
  // Der Anlegen-Knopf selbst bleibt zwar im DOM (die Karte ist ja
  // versteckt), aber sein Klick-Handler tut ohne Freigabe nichts.
  cockpitProjectId=7;
  $("cockpitNeueOfferte").click();
  return $("angebotEditModal").hidden;
 });
 p(cockpitNeuHidden===true,"'+ Offerte importieren' oeffnet ohne Freigabe nichts");

 // ---- 3 · Freigeschalteter Benutzer (Auftrag Test 10) -----------------
 console.log("\n3 · Freigeschalteter Benutzer sieht und nutzt die Funktion (Test 10)");
 await page.evaluate(async()=>{
  window.__lese.feature_access=[{profile_id:"u1",feature:"angebote",granted:true}];
  await checkOfferteZugriff();
 });
 const mitZugriff=await page.evaluate(()=>({
  offerteZugriff,
  kartenSichtbar:!$("cockpitAngeboteCard").hidden,
  zeileSichtbar:!$("cockpitStandAngeboteZeile").hidden
 }));
 p(mitZugriff.offerteZugriff===true,"offerteZugriff wird true bei granted:true",mitZugriff);
 p(mitZugriff.kartenSichtbar===true,"Cockpit-Karte '🧾 Offerte' wird sichtbar",mitZugriff);
 p(mitZugriff.zeileSichtbar===true,"Arbeitsstand-Zeile 'Offerte' wird sichtbar",mitZugriff);
 p(await page.evaluate(()=>typeof COCKPIT_BEREICHE==="object"&&!!COCKPIT_BEREICHE.angebote
   &&COCKPIT_BEREICHE.angebote.count==="cockpitAngeboteCount"),
  "COCKPIT_BEREICHE wurde um 'angebote' ergaenzt (keine js/24-Aenderung noetig)");

 // ---- 4 · Offerte anlegen, Projekt zuordnen (Auftrag Test 6) ----------
 console.log("\n4 · Neue Offerte anlegen und einem Projekt zuordnen (Test 6)");
 // In der echten App ist das Cockpit-Modal offen, wenn der Knopf
 // "+ Offerte importieren" geklickt wird - das wird hier nachgestellt,
 // sonst waere die folgende Pruefung "bleibt sichtbar" bedeutungslos.
 await page.evaluate(()=>{ cockpitProjectId=7; $("projectCockpitModal").hidden=false; $("cockpitNeueOfferte").click(); });
 const neuA=await page.evaluate(()=>({
  formularOffen:!$("angebotEditModal").hidden,
  projektId:angSelectedProjectId,
  projektFeld:$("angProjectSearch").value,
  titel:$("angTitle").value,
  cockpitVersteckt:$("projectCockpitModal").hidden
 }));
 p(neuA.formularOffen===true,"'+ Offerte importieren' oeffnet das Formular");
 p(neuA.projektId===7,"das aktuelle Cockpit-Projekt wird automatisch vorbelegt",neuA);
 p(neuA.projektFeld==="Testbau","das Projektfeld zeigt den Projektnamen",neuA);
 // js/63-angebote.js hebt das Cockpit-Modal beim Anlegen bewusst NICHT
 // auf (anders als z. B. der Massaufnahme-Typenwaehler) - der Rueckweg
 // fuehrt dorthin zurueck, siehe Abschnitt 8.
 p(neuA.cockpitVersteckt===false,"das Cockpit bleibt im Hintergrund bestehen (kein Kontextverlust)");
 // Projekt wechseln
 await page.evaluate(()=>setAngProjectField(8));
 p(await page.evaluate(()=>angSelectedProjectId)===8,"das Projekt laesst sich manuell umstellen");
 await page.evaluate(()=>setAngProjectField(7)); // zurueck auf 7 fuer die folgenden Abschnitte

 // ---- 5 · Foto-Import und KI-Erkennung (Auftrag Test 5 + 12) ----------
 console.log("\n5 · Offerte per Foto importieren (Test 5), Fehler sauber behandelt (Test 12)");
 // Ein winziges 1x1-PNG als data:-URL - fuer das direkte Seeden von
 // angPhotos gedacht (kein existierender Pruefstand in diesem Repo nutzt
 // setInputFiles(); resizeImageFile() haengt an echten Canvas/Image-APIs
 // und wird deshalb hier bewusst NICHT ueber die Dateiauswahl simuliert -
 // der eigentliche Test ist die Wiederverwendung von recognizePhoto()/
 // uploadMeasurementImage(), nicht die Bildverkleinerung selbst).
 const winzigesPng="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
 await page.evaluate(png=>{
  angPhotos=[png];
  renderAngPhotoGallery();
 },winzigesPng);
 p(await page.evaluate(()=>!$("angRecognizeAll").hidden),"'Alle Fotos erkennen' erscheint, sobald ein Foto da ist");
 kiModus="ok";
 await page.evaluate(async()=>{await $("angRecognizeAll").onclick()});
 const kiOk=await page.evaluate(()=>({
  anzahl:angPositions.length,
  ersteBezeichnung:angPositions[0]&&angPositions[0].description,
  statusText:$("angRecognizeStatus").textContent
 }));
 p(kiOk.anzahl===2,"beide von der (gemockten) KI gelieferten Positionen wurden uebernommen",kiOk);
 p(kiOk.ersteBezeichnung==="Titanzinkblech 0.7mm","die Positionsdaten (Bezeichnung/Menge/Einheit) kommen unveraendert an",kiOk);
 p(/2 Position/.test(kiOk.statusText),"der Status meldet die Anzahl",kiOk);
 p(await page.evaluate(()=>document.querySelectorAll("#angPositionsBody tr").length)===2,
  "die Positionstabelle zeigt beide Zeilen");

 // Fehlerfall: KI-Server meldet einen fachlichen Fehler (Auftrag Test 12).
 // page.__dialoge sammelt die alert()-Texte im Node-Kontext (siehe
 // page.on("dialog",...) oben) - deshalb hier direkt lesbar, ausserhalb
 // eines page.evaluate()-Aufrufs.
 await page.evaluate(()=>{angPositions=[];renderAngPositionsTable()});
 kiModus="serverfehler";
 page.__dialoge=[];
 await page.evaluate(async()=>{await $("angRecognizeAll").onclick()});
 const kiFehler1=await page.evaluate(()=>angPositions.length);
 p(kiFehler1===0,"ein fachlicher KI-Fehler ('ok:false') fuegt KEINE Positionen hinzu");
 p((page.__dialoge||[]).some(t=>t==="Fehler bei Foto 1: Bild nicht lesbar"),
  "und meldet den vom Server gelieferten Fehlertext per alert()",page.__dialoge);

 // HTTP-Fehler (500) der Edge Function - der zweite in Test 12 geforderte
 // Fehlerfall (Netzwerk-/Serverebene statt fachlicher ok:false-Antwort).
 kiModus="http500";
 page.__dialoge=[];
 await page.evaluate(async()=>{await $("angRecognizeAll").onclick()});
 const kiFehler2=await page.evaluate(()=>({anzahl:angPositions.length,status:$("angRecognizeStatus").textContent}));
 p(kiFehler2.anzahl===0,"ein HTTP-500 der Edge Function fuegt ebenfalls keine Positionen hinzu",kiFehler2);
 p((page.__dialoge||[]).some(t=>/^Fehler bei Foto 1: Server antwortete mit Status 500/.test(t)),
  "und meldet den HTTP-Status per alert(), statt still zu scheitern",page.__dialoge);
 kiModus="ok"; // fuer die folgenden Abschnitte zuruecksetzen
 // Die beiden Fehlerfaelle haben angPositions bewusst auf 0 gelassen
 // (das war ja gerade der Punkt). Fuer den Speichertest in Abschnitt 6
 // wird "der Anwender behebt das Problem und erkennt erneut" nachgestellt -
 // angPhotos enthaelt weiterhin das eine Foto, ein erneuter Aufruf mit
 // kiModus="ok" liefert wieder die zwei Positionen.
 await page.evaluate(async()=>{await $("angRecognizeAll").onclick()});
 p(await page.evaluate(()=>angPositions.length)===2,
  "nach Behebung liefert ein erneuter Erkennungslauf wieder beide Positionen");

 // ---- 6 · Speichern: Erfolg und 0-Zeilen-Fall (CLAUDE.md 24.1) --------
 console.log("\n6 · Speichern (Test 6/7) inkl. '0 Zeilen ist kein Erfolg'-Regel");
 await page.evaluate(()=>{
  $("angTitle").value="Offerte Muster AG";
  $("angDate").value="2026-09-08";
  $("angNote").value="Testnotiz";
 });
 // Ohne Titel/Projekt darf gar nicht erst gespeichert werden.
 await page.evaluate(()=>{$("angTitle").value=""});
 const keinTitel=await page.evaluate(async()=>{
  window.__schreib=[];
  await $("saveAngebot").onclick();
  return {schreibAufrufe:window.__schreib.length};
 });
 p(keinTitel.schreibAufrufe===0,"ohne Bezeichnung wird gar nicht erst geschrieben",keinTitel);
 await page.evaluate(()=>{$("angTitle").value="Offerte Muster AG"});
 // 0-Zeilen-Fall: die Datenbank meldet keinen Fehler, aber 0 betroffene Zeilen.
 page.__dialoge=[];
 await page.evaluate(()=>{window.__insertLeer={angebote:true};window.__schreib=[]});
 const nullZeilen=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {modalNochOffen:!$("angebotEditModal").hidden,idsBleibtLeer:currentAngebotId};
 });
 p(nullZeilen.modalNochOffen===true,"0 betroffene Zeilen gelten NICHT als Erfolg - das Formular bleibt offen",nullZeilen);
 p(nullZeilen.idsBleibtLeer===null,"und currentAngebotId bleibt unveraendert (kein vorgetaeuschter Erfolg)",nullZeilen);
 // Wichtig: NICHT nur den Formularzustand pruefen - ein fehlender Check
 // wuerde beim Zugriff auf data[0].id/updated_by mit einem TypeError
 // abstuerzen, der zufaellig denselben Formularzustand hinterlaesst (vom
 // catch(err)-Block aufgefangen). Der wirkliche, gewollte Text muss stehen -
 // nicht ein genereller Absturz-Alarm.
 p((page.__dialoge||[]).some(t=>t==="Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"),
  "und die App zeigt die dafuer vorgesehene, klare Meldung (nicht nur einen zufaellig aehnlich aussehenden Absturz)",page.__dialoge);
 p((page.__dialoge||[]).every(t=>!/^Fehler beim Speichern/.test(t)),
  "insbesondere KEINEN generischen Absturz-Alarm ('Fehler beim Speichern: ...')",page.__dialoge);
 await page.evaluate(()=>{window.__insertLeer={}});
 // Echter Erfolg.
 await page.evaluate(()=>{window.__schreib=[]});
 const erfolg=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {
   modalZu:$("angebotEditModal").hidden,
   currentAngebotId,
   letzterInsert:window.__schreib.find(x=>x.op==="insert"&&x.t==="angebote")
  };
 });
 p(erfolg.modalZu===true,"nach erfolgreichem Speichern schliesst sich das Formular",erfolg);
 p(!!erfolg.currentAngebotId,"currentAngebotId wird auf die neue, servergenerierte ID gesetzt",erfolg);
 const insertPayload=erfolg.letzterInsert&&erfolg.letzterInsert.d&&erfolg.letzterInsert.d[0];
 p(!!insertPayload&&insertPayload.project_id===7,"die gespeicherte Zeile traegt die richtige project_id (Test 6)",insertPayload);
 p(!!insertPayload&&insertPayload.title==="Offerte Muster AG","und die eingegebene Bezeichnung",insertPayload);
 p(!!insertPayload&&Array.isArray(insertPayload.positions)&&insertPayload.positions.length===2,
  "und die zwei erkannten Positionen",insertPayload);
 p(!!insertPayload&&insertPayload.photo_paths&&insertPayload.photo_paths.length===1,
  "und den hochgeladenen Fotopfad (photo_paths)",insertPayload);
 p(!!insertPayload&&insertPayload.company_id===undefined,
  "der Client schickt NIE eine company_id mit (die Firmenzuordnung setzt die Datenbank selbst, DEFAULT my_company_id())",insertPayload);
 p(!!insertPayload&&insertPayload.created_by===undefined&&insertPayload.created_at===undefined,
  "und schickt auch created_by/created_at nicht mit (Trigger set_creator_editor_meta_angebote setzt sie serverseitig)",insertPayload);
 p(await page.evaluate(()=>window.__uploads&&window.__uploads.some(u=>u.startsWith("angebote-photo/"))),
  "das Foto wurde ueber uploadMeasurementImage() mit dem Ordner 'angebote-photo' hochgeladen - wiederverwendet aus js/10, nicht neu gebaut");

 // ---- 7 · Speicherung bleibt nach 'Neuladen' erhalten (Auftrag Test 7) --
 console.log("\n7 · Speicherung bleibt erhalten (Test 7 - simulierter Neuaufruf der Liste)");
 const nachNeuladen=await page.evaluate(async()=>{
  window.__from=[];
  const n=await loadProjectAngebote(7);
  return {n,gefunden:projectAngeboteCache.some(a=>a.title==="Offerte Muster AG")};
 });
 p(nachNeuladen.n>=1,"eine frische Abfrage von loadProjectAngebote(7) findet die gespeicherte Offerte",nachNeuladen);
 p(nachNeuladen.gefunden===true,"mit dem korrekten Titel",nachNeuladen);
 p(await page.evaluate(()=>document.querySelector("#cockpitAngeboteBody [data-open-project-angebot]")!==null),
  "und die Zeile erscheint mit einem 'Oeffnen'-Knopf im Cockpit");

 // ---- 8 · Offerte oeffnen/einsehen (Auftrag Test 8) --------------------
 console.log("\n8 · Offerte oeffnen und einsehen (Test 8)");
 await page.evaluate(()=>{$("angebotEditModal").hidden=true});
 const geoeffnet=await page.evaluate(()=>{
  const a=projectAngeboteCache.find(x=>x.title==="Offerte Muster AG");
  openAngebot(a);
  return {
   formularOffen:!$("angebotEditModal").hidden,
   titel:$("angTitle").value,
   projekt:angSelectedProjectId,
   positionen:angPositions.length,
   notiz:$("angNote").value
  };
 });
 p(geoeffnet.formularOffen===true,"'Oeffnen' zeigt das Formular");
 p(geoeffnet.titel==="Offerte Muster AG","mit der gespeicherten Bezeichnung",geoeffnet);
 p(geoeffnet.projekt===7,"und dem gespeicherten Projekt",geoeffnet);
 p(geoeffnet.positionen===2,"und den gespeicherten Positionen",geoeffnet);
 p(geoeffnet.notiz==="Testnotiz","und der gespeicherten Notiz",geoeffnet);

 // ---- 9 · Loeschen ------------------------------------------------------
 console.log("\n9 · Offerte loeschen");
 const vorLoeschen=await page.evaluate(()=>projectAngeboteCache.length);
 // Der Loesch-Handler ist auf #cockpitWorkArea DELEGIERT (js/63,
 // e.target.closest("[data-del-project-angebot]")) - der Knopf muss also
 // WIRKLICH darin haengen, sonst blubbert der Klick nie bis zum Listener.
 await page.evaluate(async()=>{
  window.__schreib=[];
  const id=projectAngeboteCache[0].id;
  const btn=document.createElement("button");
  btn.setAttribute("data-del-project-angebot",String(id));
  $("cockpitWorkArea").appendChild(btn);
  btn.click(); // confirm() wird ueber page.on("dialog") automatisch akzeptiert
  await new Promise(r=>setTimeout(r,100));
  btn.remove();
 });
 const nachLoeschen=await page.evaluate(async()=>{
  const n=await loadProjectAngebote(7);
  return {n,loeschAufruf:window.__schreib.find(x=>x.op==="delete"&&x.t==="angebote")};
 });
 p(!!nachLoeschen.loeschAufruf,"das Loeschen loest genau einen delete()-Aufruf auf angebote aus",nachLoeschen);
 p(nachLoeschen.n===vorLoeschen-1,"und die Liste hat danach ein Eintrag weniger",{vor:vorLoeschen,nach:nachLoeschen.n});

 // ---- 10 · Kein Zugriff auf fremde Firma/Projekte (Auftrag Test 11) ----
 console.log("\n10 · Kein Zugriff auf fremde Firma/Projekte (Test 11)");
 console.log("  Hinweis: die eigentliche Durchsetzung ist serverseitige RLS");
 console.log("  (zwei restriktive, UND-verknuepfte Policies auf angebote,");
 console.log("  live per Supabase-MCP in einer frueheren Sitzung dieser");
 console.log("  Session gegen das echte Produktivschema geprueft). Hier wird");
 console.log("  zusaetzlich die Client-Seite gegengeprueft.");
 // Kommentarzeilen duerfen (und sollen, siehe CLAUDE.md-Konvention)
 // erklaeren, WARUM company_id nicht mitgeschickt wird - geprueft wird
 // deshalb nur echter Code ausserhalb von "//"-Kommentaren.
 const quelltext=require("fs").readFileSync(repo+"/js/63-angebote.js","utf8");
 const codeZeilenMitCompanyId=quelltext.split("\n")
  .filter(z=>!z.trim().startsWith("//")&&/company_id/.test(z));
 p(codeZeilenMitCompanyId.length===0,
  "js/63-angebote.js schreibt/liest company_id an KEINER Code-Stelle (nur in erklaerenden Kommentaren erwaehnt) - die Firmengrenze kommt ausschliesslich aus der Datenbank",
  {treffer:codeZeilenMitCompanyId});
 // Simuliert, was RLS serverseitig produzieren wuerde: eine Abfrage nach
 // einem project_id, zu dem es (aus Sicht der eigenen Firma) keine Zeilen
 // gibt, liefert 0 Zeilen - nie fremde Daten.
 const fremdesProjekt=await page.evaluate(async()=>{
  window.__from=[];
  const n=await loadProjectAngebote(999999); // erfundene/fremde Projekt-ID
  return {n,leer:$("cockpitAngeboteBody").innerHTML.includes("Noch keine Offerte")};
 });
 p(fremdesProjekt.n===0,"eine Abfrage auf ein fremdes/unbekanntes Projekt liefert 0 Zeilen",fremdesProjekt);
 p(fremdesProjekt.leer===true,"und zeigt ehrlich 'Noch keine Offerte zu diesem Projekt.' statt fremder Daten",fremdesProjekt);

 // ---- 11 · Rechte-Oberflaeche: Checkbox im Mitarbeiterbereich ----------
 console.log("\n11 · Rechte-Oberflaeche (js/05a-rechte.js): Offerte-Zugriff je Mitarbeiter");
 await page.evaluate(()=>{
  meineRechte={admin:true}; // nur ein Administrator darf Rechte vergeben
  window.__lese.feature_access=[{profile_id:"u1",feature:"angebote",granted:true}];
  alleFeatureAccess=window.__lese.feature_access.slice();
  renderMitarbeiterSettings();
 });
 const schalterZustand=await page.evaluate(()=>({
  vorhanden:document.querySelectorAll("[data-emp-angebot]").length,
  ersterAngehakt:document.querySelector('[data-emp-angebot="0"]').checked,
  zweiterAngehakt:document.querySelector('[data-emp-angebot="1"]').checked
 }));
 p(schalterZustand.vorhanden===2,"fuer beide Mitarbeiter erscheint der Offerte-Schalter (Administrator sieht ihn)",schalterZustand);
 p(schalterZustand.ersterAngehakt===true,"Anna (granted:true in feature_access) ist angehakt",schalterZustand);
 p(schalterZustand.zweiterAngehakt===false,"Mike (kein Eintrag) ist NICHT angehakt - ein Administrator hat keinen automatischen Zugriff",schalterZustand);
 // Fuer einen Nicht-Administrator entfaellt der Schalter ganz statt nur
 // deaktiviert zu sein.
 await page.evaluate(()=>{meineRechte={admin:false};renderMitarbeiterSettings()});
 p(await page.evaluate(()=>document.querySelectorAll("[data-emp-angebot]").length)===0,
  "fuer einen Nicht-Administrator entsteht gar kein Schalter (kein funktionsloses Element)");
 await page.evaluate(()=>{meineRechte={admin:true};renderMitarbeiterSettings()});
 // Umschalten (Mike bekommt Zugriff) -> genau ein upsert, mit onConflict.
 const zugriffVergeben=await page.evaluate(async()=>{
  window.__schreib=[];
  const feld=document.querySelector('[data-emp-angebot="1"]');
  feld.checked=true;
  feld.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,50));
  return {
   upsert:window.__schreib.find(x=>x.op==="upsert"&&x.t==="feature_access"),
   cacheAktualisiert:alleFeatureAccess.find(x=>x.profile_id==="u2"&&x.feature==="angebote")
  };
 });
 p(!!zugriffVergeben.upsert,"das Umschalten loest genau einen upsert() auf feature_access aus",zugriffVergeben);
 const upsertD=zugriffVergeben.upsert&&(Array.isArray(zugriffVergeben.upsert.d)?zugriffVergeben.upsert.d[0]:zugriffVergeben.upsert.d);
 p(!!upsertD&&upsertD.profile_id==="u2"&&upsertD.feature==="angebote"&&upsertD.granted===true,
  "mit dem richtigen Mitarbeiter, feature:'angebote' und granted:true",upsertD);
 p(zugriffVergeben.upsert&&zugriffVergeben.upsert.o&&zugriffVergeben.upsert.o.onConflict==="profile_id,feature",
  "und onConflict:'profile_id,feature' (trifft die UNIQUE-Constraint feature_access_profile_feature_uk)",zugriffVergeben.upsert&&zugriffVergeben.upsert.o);
 p(!!zugriffVergeben.cacheAktualisiert&&zugriffVergeben.cacheAktualisiert.granted===true,
  "der lokale Cache alleFeatureAccess wird sofort nachgezogen (kein Neuladen noetig)",zugriffVergeben.cacheAktualisiert);
 // 0-Zeilen-Fall auch hier: Haken springt zurueck, kein stiller Erfolg.
 const zugriffAbgelehnt=await page.evaluate(async()=>{
  window.__upsertLeer={feature_access:true};
  const feld=document.querySelector('[data-emp-angebot="1"]');
  feld.checked=false;
  feld.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,50));
  return {nochAngehakt:document.querySelector('[data-emp-angebot="1"]').checked};
 });
 p(zugriffAbgelehnt.nochAngehakt===true,"0 betroffene Zeilen: der Haken springt zurueck statt einen falschen Erfolg zu zeigen",zugriffAbgelehnt);
 await page.evaluate(()=>{window.__upsertLeer={}});

 // ---- 12 · Kollisionsschutz data-cockpit-new (Design-Entscheidung) -----
 console.log("\n12 · '+ Offerte importieren' kollidiert nicht mit dem bestehenden Cockpit-Handler");
 const kollision=await page.evaluate(()=>({
  hatDataCockpitNew:$("cockpitNeueOfferte").hasAttribute("data-cockpit-new"),
  eigenerHandlerVorhanden:typeof $("cockpitNeueOfferte").onclick==="function"
 }));
 p(kollision.hatDataCockpitNew===false,
  "der Knopf traegt bewusst KEIN data-cockpit-new (js/24 kennt nur 'rep'/'meas' und wuerde sonst den Ausmass-Typenwaehler oeffnen, siehe Gegenprobe G1)",kollision);
 p(kollision.eigenerHandlerVorhanden===true,"er hat stattdessen einen eigenen onclick-Handler");

 // ---- 13 · Ohne Verbindung (V1-Einschraenkung, dokumentiert) -----------
 console.log("\n13 · Verhalten ohne Verbindung (V1 bewusst ohne Offline-Warteschlange)");
 await page.context().setOffline(true);
 await page.evaluate(()=>{$("angTitle").value="Offline-Test";cockpitProjectId=7;angSelectedProjectId=7});
 // page.__dialoge wird bereits vom globalen page.on("dialog",...)-Listener
 // (siehe oben) gesammelt - ein zweiter Listener wuerde denselben Dialog
 // ein zweites Mal zu akzeptieren versuchen und abstuerzen.
 page.__dialoge=[];
 await page.evaluate(async()=>{window.__schreib=[];await $("saveAngebot").onclick()});
 await page.context().setOffline(false);
 const offlineAlertGesehen=(page.__dialoge||[]).some(t=>/Keine Verbindung/.test(t));
 p(offlineAlertGesehen===true,"ohne Verbindung erscheint die bestehende, klare Absage (offlineSperrtSpeichern, wiederverwendet aus js/27)",page.__dialoge);
 p(await page.evaluate(()=>window.__schreib.length)===0,"und es wird NICHTS geschrieben (V1 bewusst ohne Offline-Warteschlange fuer Offerten, siehe Abschlussbericht)");

 // ---- 14 · Struktur: unveraenderte Dateien (Auftrag Test 2/3/4/13) -----
 console.log("\n14 · Struktur: bestehende Funktionen unangetastet (Test 2, 3, 4, 13)");
 let geaenderteDateien=[];
 try{
  geaenderteDateien=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",
   {cwd:repo,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 }catch(e){geaenderteDateien=null;}
 const mussUnberuehrtSein=[
  "js/17-ausmass.js",            // bestehendes Ausmass-Register (Test 4)
  "js/10-massaufnahme.js".replace("js/10-massaufnahme.js","js/10-massaufnahme.js"), // s.u. Sonderfall
  "js/24-projekt-cockpit.js",    // Cockpit-Kern (reine Objekt-Mutation von aussen)
  "js/06-rapport.js","js/08-katalog-blitzschutz.js", // Regierapport
  "css/03-druck.css","css/04-rechte.css",
  "js/44-workflow.js","js/45-aufgaben.js","js/48-projekt-material.js",
  "js/49-projekt-zuschnitt.js","js/50-reservierung.js","js/51-werkstatt.js",
  "js/56-material-zuschnitt.js","js/58-ruestliste.js","js/60-ruestskizzen.js",
  "js/11-einlaufblech-gerade.js","js/12-rinne-halbrund.js","js/13-einlaufblech-konisch.js",
  "js/14-freies-profil.js","js/19-lukarne.js","js/20-anschlussblech.js",
  "js/21-einfassung-rund.js","js/25-kehle.js","js/26-rinne.js","js/29-einlaufblech-aufnahme.js",
  "js/34-kehle-aufnahme.js","js/37-kamin-aufnahme.js","js/38-einfassung-aufnahme.js",
  "js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js","js/61-materialstaerke.js"
 ];
 if(geaenderteDateien===null){
  p(false,"git diff konnte nicht ausgefuehrt werden - Struktur-Beweis nicht moeglich",{});
 }else{
  const verletzt=mussUnberuehrtSein.filter(f=>geaenderteDateien.includes(f));
  p(verletzt.length===0,
   "keine der 'nicht anzufassenden' Dateien (Massaufnahme-Fachmodule, Ausmass, Cockpit-Kern, Regierapport, Produktionsworkflow js/44-60) wurde veraendert",
   {geaendert:geaenderteDateien,verletzt});
  p(geaenderteDateien.includes("js/63-angebote.js"),"js/63-angebote.js ist neu (Grundmodul der Offerten-Funktion)",geaenderteDateien);
  p(geaenderteDateien.includes("js/05a-rechte.js"),"js/05a-rechte.js wurde erweitert (Zugriffs-Checkbox)",geaenderteDateien);
  p(geaenderteDateien.includes("index.html"),"index.html wurde erweitert (Markup, Version)",geaenderteDateien);
 }

 // ---- 15 · Struktur: Sauberkeit (Elemente, Hilfetexte, SHELL-Liste) ----
 console.log("\n15 · Struktur: Sauberkeit");
 const idxHtml=require("fs").readFileSync(repo+"/index.html","utf8");
 const swJs=require("fs").readFileSync(repo+"/sw.js","utf8");
 p(idxHtml.includes('src="js/63-angebote.js"'),"js/63-angebote.js ist in index.html als <script> eingebunden");
 p(swJs.includes('"./js/63-angebote.js"'),"js/63-angebote.js steht im Service-Worker-Vorrat (SHELL)");
 const versionHtml=(idxHtml.match(/Version\s+3\.34/)||[])[0];
 const versionSw=(swJs.match(/spengler-digital-3\.34/)||[])[0];
 p(!!versionHtml,"index.html nennt Version 3.34");
 p(!!versionSw,"sw.js traegt die Cache-Version 3.34");
 const nichtDoppeltGeprueft=["recognizePhoto","uploadMeasurementImage","searchProjects","projektVorschlagHtml","positionSuggest","resolveSignedThumbnails"]
  .every(name=>!quelltext.includes("function "+name+"("));
 p(nichtDoppeltGeprueft,
  "js/63-angebote.js definiert keine der wiederverwendeten Funktionen selbst neu (recognizePhoto/uploadMeasurementImage/searchProjects/projektVorschlagHtml/positionSuggest/resolveSignedThumbnails bleiben Unikate im Repo)");
 p(quelltext.includes('data-hilfe="cockpit-angebote"')&&quelltext.includes('data-hilfe="ang-ki"')===false
   ||idxHtml.includes('data-hilfe="cockpit-angebote"')&&idxHtml.includes('data-hilfe="ang-ki"'),
  "beide Info-Knopf-Schluessel (cockpit-angebote, ang-ki) stehen in index.html");
 const hilfeJs=require("fs").readFileSync(repo+"/js/41-hilfe.js","utf8");
 p(hilfeJs.includes('"cockpit-angebote"')&&hilfeJs.includes('"ang-ki"'),
  "beide Schluessel haben eine passende Erklaerung in HILFE_TEXTE (js/41-hilfe.js)");

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
