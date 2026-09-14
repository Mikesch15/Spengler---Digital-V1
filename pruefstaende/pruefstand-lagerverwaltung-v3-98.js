"use strict";
// ---- Pruefstand: Lagerverwaltung Phase 1 (v3.98, Artikelbasis + Barcode v3.102) --
//
// Prueft:
//  1  Sichtbarkeit ueber feature_access (feature:"lager") - dasselbe Muster
//     wie Offerte-Zugriff: ohne Freigabe bleibt der Bereich versteckt, auch
//     fuer einen Administrator.
//  2  Bestand ist IMMER die Summe der Buchungen, nie eine editierbare Zahl.
//  3  Buchen: Zugang/Abgang wandeln eine vom Benutzer immer positiv
//     eingegebene Menge in die richtige Richtung um; Korrektur uebernimmt
//     die Eingabe unveraendert (auch negativ).
//  4  Eine Buchung ohne Menge wird abgelehnt, bevor ueberhaupt geschrieben wird.
//  5  Rechte-Oberflaeche (js/05a-rechte.js): eigener Lager-Schalter je
//     Mitarbeiter, unabhaengig vom Offerte-Schalter.
//  8  Direkter Einstieg von der Startseite (v3.101).
//  9  Buchen-/Formular-Dialog liegt ueber den Einstellungen (v3.101/v3.102).
//  10 Einscannen/Ausscannen (v3.102): Barcode -> Artikel -> Buchen-Dialog
//     mit vorbelegter Art; unbekannter Barcode meldet sich klar statt still
//     zu scheitern. Die echte Kamera/ZXing-Logik wird dabei GESTUBBT
//     (window.barcodeScannen ersetzt) - genau wie openSketchFullscreen beim
//     Unterschrift-Pruefstand: geprueft wird die Verdrahtung, nicht die
//     Hardware-Ansteuerung.
//  11 Material-Katalog (Einstellungen): Barcode-Feld und Scan-Knopf je
//     Artikel.
//
// WICHTIGSTE AENDERUNG SEIT v3.98: Die Lagerverwaltung baute urspruenglich
// auf lagerbestand auf (dem Blech-Materialbestand). Das war fachlich falsch
// - seit v3.102 baut sie auf materials auf (der Artikelliste der Firma,
// ueber lagArtikelListe() aus js/59-lagerbestand.js), lagerbestand hat mit
// der Lagerverwaltung nichts mehr zu tun. Dieser Pruefstand nutzt deshalb
// settings.materials/materialIds statt eines globalen lagerbestand-Arrays.
//
// WAS HIER NICHT GEPRUEFT WIRD: die serverseitige RLS (tenant_boundary_
// lagerbestand_bewegungen, feature_boundary_lager, die Firmen-Konsistenz-
// pruefung enforce_lager_bewegung_firma()) - die wurde beim Anlegen der
// Migration gegen das echte Produktivschema entworfen (exaktes Abbild von
// feature_boundary_angebote, das bereits produktiv laeuft). Hier wird nur
// geprueft, dass der Client company_id an KEINER Stelle selbst mitschickt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lagerverwaltung-v3-98.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const repo=process.cwd();
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Dieselbe generische Attrappe wie in pruefstand-angebote-v3-34.js (dort
// ausfuehrlich begruendet) - eine Lesespur (window.__lese) und eine
// Schreibspur (window.__schreib) je Tabelle, insert() haengt echte IDs an
// und schreibt in window.__lese zurueck.
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
      created_by:"u1",created_at:"2026-09-14T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-14T08:00:00Z"
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
   update:patch=>{
    const g={};
    g.eq=(f,v)=>{
     window.__schreib.push({t,op:"update",patch,eq:[[f,v]]});
     if(window.__updateFehler&&window.__updateFehler[t])return Promise.resolve({error:{message:"kaputt"}});
     return Promise.resolve({error:null});
    };
    return g;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
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

 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkLagerZugriff==="function"
  &&typeof renderLagerverwaltung==="function"&&typeof lagerBuchenOeffnen==="function"
  &&typeof renderMitarbeiterSettings==="function"&&typeof lagerZugriffVon==="function",
  null,{timeout:15000});
 await page.waitForTimeout(200);

 await page.evaluate(()=>{
  window.__lese={lagerbestand_bewegungen:[],feature_access:[]};
  currentProfile={id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"};
  allProfiles=[
   {id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"},
   {id:"u2",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"}
  ];
  meineRechte={admin:false};
  settings={employees:["Anna Muster","Mike Ledermann"],rates:[],
   // [edv_nr,name,dim,unit,price,barcode] - m[5]=barcode seit v3.102.
   materials:[["205.30","Dichtband 15 mm","15 mm","m",2.80,"4006381333931"]]};
  materialIds=[1];
  employeeIds=["u1","u2"];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 console.log("\n1 · Anwendung startet");
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);

 // ---- 2 · Sichtbarkeit ueber feature_access -----------------------------
 console.log("\n2 · Sichtbarkeit nur mit eigens vergebenem Lager-Zugriff");
 await page.evaluate(async()=>{
  window.__lese.feature_access=[];
  await checkLagerZugriff();
 });
 let z=await page.evaluate(()=>({zugriff:lagerverwaltungZugriff,versteckt:$("lagerverwaltungSection").hidden}));
 p(z.zugriff===false&&z.versteckt===true,"ohne Freigabe bleibt lagerverwaltungZugriff false und der Bereich versteckt",z);

 await page.evaluate(async()=>{
  currentProfile={id:"u2",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"};
  window.__lese.feature_access=[]; // kein Eintrag -> auch ein Administrator sieht nichts
  await checkLagerZugriff();
 });
 z=await page.evaluate(()=>({zugriff:lagerverwaltungZugriff,versteckt:$("lagerverwaltungSection").hidden}));
 p(z.zugriff===false&&z.versteckt===true,"auch ein Administrator ohne eigens vergebene Freigabe sieht nichts - wie beim Offerte-Zugriff",z);

 await page.evaluate(async()=>{
  window.__lese.feature_access=[{profile_id:"u2",feature:"lager",granted:true}];
  await checkLagerZugriff();
 });
 z=await page.evaluate(()=>({zugriff:lagerverwaltungZugriff,versteckt:$("lagerverwaltungSection").hidden}));
 p(z.zugriff===true&&z.versteckt===false,"mit granted:true wird der Bereich sichtbar",z);

 // ---- 3 · Bestand ist die Summe der Buchungen ---------------------------
 console.log("\n3 · Bestand = Summe der Buchungen, nie eine editierbare Zahl");
 await page.evaluate(()=>{
  window.__lese.lagerbestand_bewegungen=[
   {id:1,material_id:1,art:"zugang",menge:10,grund:"Lieferung",created_at:"2026-09-01T08:00:00Z"},
   {id:2,material_id:1,art:"abgang",menge:-3,grund:"Baustelle Muster",created_at:"2026-09-05T08:00:00Z"},
   {id:3,material_id:1,art:"korrektur",menge:-1,grund:"Inventur",created_at:"2026-09-10T08:00:00Z"}
  ];
  lagerBewegungen=window.__lese.lagerbestand_bewegungen.slice();
  renderLagerverwaltung();
 });
 z=await page.evaluate(()=>({
  text:$("lagerverwaltungListe").textContent,
  bestand:lagerBestandVon(1)
 }));
 p(z.bestand===6,"10 Zugang - 3 Abgang - 1 Korrektur ergibt 6",z);
 p(/6/.test(z.text)&&/Dichtband/.test(z.text),"der Bestand und die Bezeichnung (aus dem Material-Katalog) stehen in der Liste",z.text.slice(0,200));
 p(/Lieferung/.test(z.text)&&/Inventur/.test(z.text),"die letzten Buchungen mit ihrem Grund stehen dabei",z.text.slice(0,400));

 // ---- 4 · Buchen: Zugang/Abgang/Korrektur -------------------------------
 console.log("\n4 · Buchen setzt die richtige Richtung");
 async function buchen(art,eingabe,grund){
  return await page.evaluate(async({art,eingabe,grund})=>{
   window.__schreib=[];
   lagerBuchenOeffnen(1);
   $("lagerBuchenArt").value=art;
   $("lagerBuchenMenge").value=String(eingabe);
   $("lagerBuchenGrund").value=grund||"";
   $("lagerBuchenSpeichern").click();
   await new Promise(r=>setTimeout(r,50));
   const insert=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
   return {insert,d:insert&&(Array.isArray(insert.d)?insert.d[0]:insert.d),
     modalZu:$("lagerBuchenModal").hidden};
  },{art,eingabe,grund});
 }
 let r=await buchen("zugang",5,"Lieferschein 123");
 p(!!r.insert,"Zugang loest genau einen insert() auf lagerbestand_bewegungen aus",r);
 p(r.d&&r.d.material_id===1&&r.d.art==="zugang"&&r.d.menge===5&&r.d.grund==="Lieferschein 123",
   "Zugang: die eingegebene positive Menge bleibt positiv",r.d);
 p(r.modalZu===true,"der Dialog schliesst nach erfolgreichem Buchen",r);

 r=await buchen("abgang",5,"Verbrauch");
 p(r.d&&r.d.menge===-5,"Abgang: dieselbe positive Eingabe wird zu -5 - der Benutzer muss nie an ein Minuszeichen denken",r.d);

 r=await buchen("korrektur",-2,"Inventur ergab weniger");
 p(r.d&&r.d.menge===-2,"Korrektur: eine negative Eingabe bleibt unveraendert -2",r.d);
 r=await buchen("korrektur",3,"Inventur ergab mehr");
 p(r.d&&r.d.menge===3,"Korrektur: eine positive Eingabe bleibt unveraendert 3",r.d);

 // ---- 5 · Ohne Menge wird nichts gebucht --------------------------------
 console.log("\n5 · Eine Buchung ohne Menge wird abgelehnt");
 const leer=await page.evaluate(async()=>{
  window.__schreib=[];
  lagerBuchenOeffnen(1);
  $("lagerBuchenArt").value="zugang";
  $("lagerBuchenMenge").value="";
  $("lagerBuchenSpeichern").click();
  await new Promise(r=>setTimeout(r,50));
  return {
   insert:window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen"),
   fehlerSichtbar:!$("lagerBuchenFehler").hidden,
   modalOffen:!$("lagerBuchenModal").hidden
  };
 });
 p(!leer.insert,"ohne Menge wird gar nicht erst geschrieben",leer);
 p(leer.fehlerSichtbar===true&&leer.modalOffen===true,"der Dialog bleibt offen mit einer Fehlermeldung",leer);

 // ---- 6 · Rechte-Oberflaeche: eigener Lager-Schalter --------------------
 console.log("\n6 · Rechte-Oberflaeche (js/05a-rechte.js): Lager-Zugriff je Mitarbeiter");
 await page.evaluate(()=>{
  meineRechte={admin:true};
  window.__lese.feature_access=[{profile_id:"u1",feature:"lager",granted:true},
                                 {profile_id:"u1",feature:"angebote",granted:false}];
  alleFeatureAccess=window.__lese.feature_access.slice();
  renderMitarbeiterSettings();
 });
 z=await page.evaluate(()=>({
  vorhanden:document.querySelectorAll("[data-emp-lager]").length,
  ersterAngehakt:document.querySelector('[data-emp-lager="0"]').checked,
  zweiterAngehakt:document.querySelector('[data-emp-lager="1"]').checked
 }));
 p(z.vorhanden===2,"fuer beide Mitarbeiter erscheint der Lager-Schalter",z);
 p(z.ersterAngehakt===true,"Anna (granted:true fuer 'lager') ist angehakt",z);
 p(z.zweiterAngehakt===false,"Mike (kein Eintrag fuer 'lager') ist nicht angehakt",z);

 await page.evaluate(()=>{meineRechte={admin:false};renderMitarbeiterSettings()});
 p(await page.evaluate(()=>document.querySelectorAll("[data-emp-lager]").length)===0,
  "fuer einen Nicht-Administrator entsteht gar kein Schalter");
 await page.evaluate(()=>{meineRechte={admin:true};renderMitarbeiterSettings()});

 const vergeben=await page.evaluate(async()=>{
  window.__schreib=[];
  const feld=document.querySelector('[data-emp-lager="1"]');
  feld.checked=true;
  feld.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,50));
  return {
   upsert:window.__schreib.find(x=>x.op==="upsert"&&x.t==="feature_access"),
   angebotUpsertAusgeloest:window.__schreib.some(x=>x.op==="upsert"&&x.t==="feature_access"&&
     (Array.isArray(x.d)?x.d[0]:x.d).feature==="angebote")
  };
 });
 p(!!vergeben.upsert,"das Umschalten loest genau einen upsert() auf feature_access aus",vergeben);
 const upsertD=vergeben.upsert&&(Array.isArray(vergeben.upsert.d)?vergeben.upsert.d[0]:vergeben.upsert.d);
 p(!!upsertD&&upsertD.profile_id==="u2"&&upsertD.feature==="lager"&&upsertD.granted===true,
   "mit profile_id, feature:'lager' und granted:true",upsertD);
 p(vergeben.upsert&&vergeben.upsert.o&&vergeben.upsert.o.onConflict==="profile_id,feature",
   "und onConflict:'profile_id,feature' - trifft dieselbe UNIQUE-Constraint wie der Offerte-Schalter",vergeben.upsert&&vergeben.upsert.o);
 p(vergeben.angebotUpsertAusgeloest===false,"der Lager-Schalter loest KEINEN zweiten Aufruf fuer 'angebote' aus - beide Schalter sind unabhaengig",vergeben);

 // ---- 8 · Direkter Einstieg von der Startseite (v3.101) -----------------
 console.log("\n8 · Startseiten-Knopf folgt derselben Freigabe, oeffnet Einstellungen->Lagerverwaltung");
 await page.evaluate(async()=>{window.__lese.feature_access=[];await checkLagerZugriff()});
 z=await page.evaluate(()=>({versteckt:$("navLagerverwaltung").hidden}));
 p(z.versteckt===true,"ohne Freigabe bleibt auch der Startseiten-Knopf versteckt",z);
 await page.evaluate(async()=>{
  window.__lese.feature_access=[{profile_id:"u2",feature:"lager",granted:true}];
  await checkLagerZugriff();
 });
 z=await page.evaluate(()=>({versteckt:$("navLagerverwaltung").hidden}));
 p(z.versteckt===false,"mit Freigabe erscheint der Startseiten-Knopf",z);
 z=await page.evaluate(()=>{
  window.__settingsAufruf=null;
  const original=window.openSettingsTo;
  window.openSettingsTo=(tab,section)=>{window.__settingsAufruf={tab,section}};
  $("navLagerverwaltung").click();
  const aufruf=window.__settingsAufruf;
  window.openSettingsTo=original;
  return aufruf;
 });
 p(z&&z.tab==="lager"&&z.section==="lagerverwaltung","ein Klick navigiert direkt zum Register Lagerverwaltung in den Einstellungen",z);

 // ---- 9 · Buchen-/Formular-Dialog erscheint VOR den Einstellungen -------
 // (v3.101 Fehlerbehebung: beide Dialoge stehen in index.html vor
 // #settingsModal - bei gleichem z-index waere das spaeter im DOM stehende
 // #settingsModal sonst obendrauf, waehrend die Einstellungen, aus denen
 // heraus man sie oeffnet, im Hintergrund offen bleiben.)
 console.log("\n9 · Buchen-/Formular-Dialog liegt ueber den (bereits offenen) Einstellungen");
 z=await page.evaluate(()=>({
  buchen:Number(getComputedStyle($("lagerBuchenModal")).zIndex),
  formular:Number(getComputedStyle($("lagerFormModal")).zIndex),
  einstellungen:Number(getComputedStyle($("settingsModal")).zIndex)
 }));
 p(z.buchen>z.einstellungen,"lagerBuchenModal hat einen hoeheren z-index als settingsModal",z);
 p(z.formular>z.einstellungen,"lagerFormModal ebenso",z);

 // ---- 10 · Einscannen/Ausscannen (v3.102) --------------------------------
 console.log("\n10 · Einscannen/Ausscannen: Barcode -> Artikel -> vorbelegter Buchen-Dialog");
 // barcodeScannen wird gestubbt (siehe Kopfkommentar) - ruft den Callback
 // sofort mit einem fest hinterlegten Code auf, ohne echte Kamera/ZXing.
 const scanStubben=code=>page.evaluate(c=>{
  window.__scanAufrufe=window.__scanAufrufe||[];
  window.barcodeScannen=cb=>{window.__scanAufrufe.push(true);cb(c)};
 },code);

 await scanStubben("4006381333931"); // bekannter Barcode des Testartikels
 z=await page.evaluate(()=>{
  window.__scanAufrufe=[];
  $("lagerEinscannen").click();
  return {
   aufgerufen:window.__scanAufrufe.length===1,
   modalOffen:!$("lagerBuchenModal").hidden,
   art:$("lagerBuchenArt").value,
   artikelId:lagerBuchenArtikelId
  };
 });
 p(z.aufgerufen,"Einscannen ruft barcodeScannen() auf",z);
 p(z.modalOffen&&z.art==="zugang"&&z.artikelId===1,
   "bekannter Barcode oeffnet den Buchen-Dialog direkt mit Art=Zugang fuer den richtigen Artikel",z);
 await page.evaluate(()=>{$("lagerBuchenModal").hidden=true});

 await scanStubben("4006381333931");
 z=await page.evaluate(()=>{
  $("lagerAusscannen").click();
  return {modalOffen:!$("lagerBuchenModal").hidden,art:$("lagerBuchenArt").value};
 });
 p(z.modalOffen&&z.art==="abgang","Ausscannen oeffnet denselben Dialog mit Art=Abgang",z);
 await page.evaluate(()=>{$("lagerBuchenModal").hidden=true});

 await scanStubben("KEIN-TREFFER-999");
 z=await page.evaluate(()=>{
  $("lagerEinscannen").click();
  return {
   modalGeschlossen:$("lagerBuchenModal").hidden,
   hinweisSichtbar:!$("lagerverwaltungHinweis").hidden,
   hinweisText:$("lagerverwaltungHinweis").textContent
  };
 });
 p(z.modalGeschlossen,"ein unbekannter Barcode oeffnet KEINEN Buchen-Dialog",z);
 p(z.hinweisSichtbar&&/nicht gefunden|Barcode/.test(z.hinweisText),
   "stattdessen erscheint eine klare Meldung statt eines stillen Fehlschlags",z);

 // ---- 11 · Material-Katalog: Barcode-Feld + Scan-Knopf (v3.102) ---------
 console.log("\n11 · Material-Katalog: Barcode-Feld und Scan-Knopf je Artikel");
 await page.evaluate(()=>{
  meineRechte={admin:true};
  materialFilter="";materialPage=0;materialExpanded=new Set([0]);
  renderMaterialSettings();
 });
 z=await page.evaluate(()=>({
  feldWert:document.querySelector('[data-set-mbarcode="0"]').value,
  scanKnopfDa:!!document.querySelector('[data-scan-mbarcode="0"]')
 }));
 p(z.feldWert==="4006381333931","das Barcode-Feld zeigt den hinterlegten Wert",z);
 p(z.scanKnopfDa,"daneben steht ein Scan-Knopf",z);

 await scanStubben("NEUER-CODE-42");
 const barcodeGespeichert=await page.evaluate(async()=>{
  window.__schreib=[];
  document.querySelector('[data-scan-mbarcode="0"]').click();
  await new Promise(r=>setTimeout(r,50));
  const update=window.__schreib.find(x=>x.op==="update"&&x.t==="materials");
  return {
   feldWert:document.querySelector('[data-set-mbarcode="0"]').value,
   stateWert:settings.materials[0][5],
   update,
   eqId:update&&update.eq&&update.eq[0]&&update.eq[0][1]
  };
 });
 p(barcodeGespeichert.feldWert==="NEUER-CODE-42"&&barcodeGespeichert.stateWert==="NEUER-CODE-42",
   "ein gescannter Code landet im Feld und im State",barcodeGespeichert);
 p(!!barcodeGespeichert.update&&barcodeGespeichert.update.patch.barcode==="NEUER-CODE-42"&&barcodeGespeichert.eqId===1,
   "und wird direkt (nicht debounced) fuer den richtigen Artikel gespeichert",barcodeGespeichert);

 // ---- 7 · company_id nie vom Client -------------------------------------
 console.log("\n7 · Firmengrenze kommt ausschliesslich aus der Datenbank");
 const quelltext=require("fs").readFileSync(repo+"/js/68-lagerverwaltung.js","utf8");
 const treffer=quelltext.split("\n").filter(zl=>!zl.trim().startsWith("//")&&/company_id/.test(zl));
 p(treffer.length===0,"js/68-lagerverwaltung.js schreibt/liest company_id an KEINER Code-Stelle",{treffer});

 p(jsFehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",jsFehler);
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
