"use strict";
// ---- Pruefstand: Lagerverwaltung Phase 1 (v3.98, Artikelbasis + Barcode
// v3.102, mehrere Produkte je Position v3.106) --------------------------
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
//  10 Einscannen/Ausscannen (v3.102, auf Produkte umgestellt v3.106):
//     Barcode -> Produkt -> Buchen-Dialog mit vorbelegter Art; ein
//     unbekannter Barcode beim Einscannen bietet an, daraus ein neues
//     Produkt anzulegen, beim Ausscannen meldet er sich nur klar. Die echte
//     Kamera/ZXing-Logik wird dabei GESTUBBT (window.barcodeScannen
//     ersetzt) - genau wie openSketchFullscreen beim Unterschrift-
//     Pruefstand: geprueft wird die Verdrahtung, nicht die
//     Hardware-Ansteuerung.
//  11 Mehrere Produkte je Materialposition (v3.106): eine Position mit nur
//     einer Variante bleibt flach wie bisher, ab der zweiten wird sie zur
//     Gruppe mit eigenen, einzeln buchbaren Unter-Karten je Produkt.
//  12 Neues Produkt erfassen (v3.106): per "＋ Weiteres Produkt" und per
//     unbekanntem Barcode - legt lager_varianten an und oeffnet danach
//     direkt den Buchen-Dialog fuer Zugang. v3.118 ergaenzt ein Suchfeld
//     ueber der Materialpositions-Auswahl, das die Liste live nach
//     EDV-Nr./Bezeichnung/Dim. filtert, ohne eine bereits getroffene
//     Auswahl beim Weitertippen zu verlieren.
//  13 Tippen-zum-Fokussieren (v3.113, komplett umgebaut, js/01-basis.js):
//     zwei fruehere Versuche (v3.108: zweiter gleichzeitiger
//     getUserMedia()-Zugriff VOR dem Stoppen des ersten Streams; v3.111:
//     ImageCapture.takePhoto() auf einem WEITERLAUFENDEN Track) fuehrten
//     beim Anwender unabhaengig voneinander zu einem schwarzen Kamerabild -
//     in beiden Faellen waren zu einem Zeitpunkt zwei Kamerazugriffe
//     gleichzeitig aktiv. v3.113 stellt sicher, dass das nie mehr passiert:
//     Vorschau ERST VOLLSTAENDIG STOPPEN, DANN einen neuen Stream NUR fuer
//     ein Einzelfoto anfordern (derselbe Aufnahmepfad wie eine native
//     Kamera-App), sofort danach freigeben, und erst DANACH die Vorschau
//     fuer die Weitersuche neu anfordern - mit einem GESTUBBTEN
//     MediaStreamTrack (kein echter Kamera-Zugriff, siehe Abschnitt 10)
//     wird die REIHENFOLGE dieser Aufrufe geprueft, nicht die echte
//     Hardware-Ansteuerung. v3.114 ergaenzt zwei Dinge: eine laengere
//     Aufwaermzeit vor der Aufnahme (der frische Foto-Stream braucht selbst
//     Zeit zum Fokussieren) sowie eine manuelle Code-Eingabe im Overlay als
//     garantierten Rueckweg, unabhaengig von jeder Kamera-Eigenheit. v3.115
//     ergaenzt einen weiteren, komplett anderen Aufnahmeweg: ein
//     verstecktes <input type="file" accept="image/*" capture="environment">
//     oeffnet die ECHTE, native Kamera-App des Geraets (kein getUserMedia/
//     ImageCapture mehr) - genau der Weg, den der Anwender bereits als
//     scharf bestaetigt hat. v3.116 fand die TATSAECHLICHE Ursache des
//     gesamten bisherigen "unscharf"-Verhaltens: decodeFromImageElement()
//     der ZXing-Bibliothek akzeptiert laut eigener Typdefinition nur ein
//     <img>-Element, kein <canvas> - jeder bisherige Dekodierversuch
//     uebergab aber ein <canvas> und scheiterte dadurch VOR jedem echten
//     Dekodierversuch, unabhaengig von der Bildschaerfe. Der Fehler wurde
//     bislang von try/catch-Bloecken still verschluckt; erst v3.115s
//     sichtbare Statusmeldung machte ihn ueberhaupt bemerkbar. Neue
//     Hilfsfunktion barcodeScanBildElement() baut jetzt ein echtes
//     <img>-Element auf, wie es die Bibliothek erwartet. v3.119 macht die
//     native Kamera-App zum automatischen Standardweg: barcodeScannen()
//     loest den Klick auf das versteckte Datei-Feld jetzt selbst aus,
//     sofort beim Oeffnen des Overlays - der Anwender muss nicht mehr
//     zuerst auf einen Knopf tippen.
//
// WICHTIGSTE AENDERUNG SEIT v3.98: Die Lagerverwaltung baute urspruenglich
// auf lagerbestand auf (dem Blech-Materialbestand). Das war fachlich falsch
// - seit v3.102 baut sie auf materials auf (der Artikelliste der Firma,
// ueber lagArtikelListe() aus js/59-lagerbestand.js), lagerbestand hat mit
// der Lagerverwaltung nichts mehr zu tun. Seit v3.106 hat jede
// Materialposition mindestens eine (einzeln buchbare) Variante in
// lager_varianten; lagerbestand_bewegungen zeigt auf lager_varianten
// (variante_id) statt direkt auf materials (materials.barcode entfiel).
// Dieser Pruefstand nutzt deshalb settings.materials/materialIds (ohne
// Barcode-Spalte) plus ein eigenes window.__lese.lager_varianten statt eines
// globalen lagerbestand-Arrays.
//
// WAS HIER NICHT GEPRUEFT WIRD: die serverseitige RLS (tenant_boundary_
// lagerbestand_bewegungen/lager_varianten, feature_boundary_lager/
// lager_varianten, die Firmen-Konsistenzpruefungen enforce_lager_bewegung_
// firma()/enforce_lager_variante_firma()) - die wurden beim Anlegen der
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
  &&typeof renderMitarbeiterSettings==="function"&&typeof lagerZugriffVon==="function"
  &&typeof lagerNeuesProduktOeffnen==="function",
  null,{timeout:15000});
 await page.waitForTimeout(200);

 await page.evaluate(()=>{
  window.__lese={lagerbestand_bewegungen:[],feature_access:[],
   // v3.106: material_id 1 hat genau eine Standard-Variante (flache
   // Darstellung), material_id 2 hat zwei Varianten (Gruppen-Darstellung,
   // Abschnitt 11).
   lager_varianten:[
    {id:501,material_id:1,bezeichnung:"Dichtband 15 mm",barcode:"4006381333931"},
    {id:601,material_id:2,bezeichnung:"Rohrbogen 87° 100mm",barcode:"ROHR-87-100"},
    {id:602,material_id:2,bezeichnung:"Rohrbogen 45° 100mm",barcode:"ROHR-45-100"}
   ]};
  currentProfile={id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"};
  allProfiles=[
   {id:"u1",role:"employee",first_name:"Anna",last_name:"Muster",company_id:"f1"},
   {id:"u2",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"}
  ];
  meineRechte={admin:false};
  settings={employees:["Anna Muster","Mike Ledermann"],rates:[],
   // [edv_nr,name,dim,unit,price] - seit v3.106 ohne Barcode-Spalte, der
   // Barcode gehoert jetzt zum einzelnen Produkt (lager_varianten), nicht
   // mehr zur Materialposition.
   materials:[["205.30","Dichtband 15 mm","15 mm","m",2.80],
              ["300.10","Rohrbogen","","Stk",4.50]]};
  materialIds=[1,2];
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
 let z=await page.evaluate(()=>({zugriff:lagerverwaltungZugriff,versteckt:$("lagerverwaltungSection").hidden,
  ausbuchenVersteckt:$("measLagerAusbuchen").hidden}));
 p(z.zugriff===false&&z.versteckt===true,"ohne Freigabe bleibt lagerverwaltungZugriff false und der Bereich versteckt",z);
 // v3.120: derselbe Schalter traegt den Ausbuchen-Knopf in der Massaufnahme.
 p(z.ausbuchenVersteckt===true,"ohne Freigabe bleibt auch der Ausbuchen-Knopf in der Massaufnahme versteckt",z);

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
 z=await page.evaluate(()=>({zugriff:lagerverwaltungZugriff,versteckt:$("lagerverwaltungSection").hidden,
  ausbuchenVersteckt:$("measLagerAusbuchen").hidden}));
 p(z.zugriff===true&&z.versteckt===false,"mit granted:true wird der Bereich sichtbar",z);
 p(z.ausbuchenVersteckt===false,"und mit Freigabe erscheint der Ausbuchen-Knopf in der Massaufnahme",z);

 // ---- 3 · Bestand ist die Summe der Buchungen ---------------------------
 console.log("\n3 · Bestand = Summe der Buchungen, nie eine editierbare Zahl");
 await page.evaluate(()=>{
  window.__lese.lagerbestand_bewegungen=[
   {id:1,variante_id:501,art:"zugang",menge:10,grund:"Lieferung",created_at:"2026-09-01T08:00:00Z"},
   {id:2,variante_id:501,art:"abgang",menge:-3,grund:"Baustelle Muster",created_at:"2026-09-05T08:00:00Z"},
   {id:3,variante_id:501,art:"korrektur",menge:-1,grund:"Inventur",created_at:"2026-09-10T08:00:00Z"}
  ];
  lagerBewegungen=window.__lese.lagerbestand_bewegungen.slice();
  renderLagerverwaltung();
 });
 z=await page.evaluate(()=>({
  text:$("lagerverwaltungListe").textContent,
  bestand:lagerBestandVon(501)
 }));
 p(z.bestand===6,"10 Zugang - 3 Abgang - 1 Korrektur ergibt 6",z);
 p(/6/.test(z.text)&&/Dichtband/.test(z.text),"der Bestand und die Bezeichnung (aus dem Material-Katalog) stehen in der Liste",z.text.slice(0,200));
 // v3.104: die Karte ist standardmaessig zugeklappt - die letzten Buchungen
 // stehen erst nach dem Aufklappen im Text (dasselbe Muster wie die
 // Werkstatt-Karte, js/51-werkstatt.js).
 p(!/Lieferung/.test(z.text)&&!/Inventur/.test(z.text),"zugeklappt stehen die einzelnen Buchungen noch nicht im Text",z.text.slice(0,200));
 z=await page.evaluate(()=>{
  // renderLagerverwaltung() ersetzt das innerHTML komplett - "kopf" muss
  // deshalb NACH dem Klick neu gesucht werden, sonst zeigt die alte,
  // inzwischen aus dem DOM entfernte Referenz weiterhin den alten Pfeil.
  document.querySelector('[data-lager-karte="501"]').click();
  const kopfNeu=document.querySelector('[data-lager-karte="501"]');
  return {pfeil:kopfNeu.querySelector(".lager-karte-pfeil").textContent,text:$("lagerverwaltungListe").textContent};
 });
 p(z.pfeil==="▾","ein Klick auf den Kartenkopf klappt ihn auf (Pfeil dreht sich)",z);
 p(/Lieferung/.test(z.text)&&/Inventur/.test(z.text),"aufgeklappt stehen die letzten Buchungen mit ihrem Grund im Text",z.text.slice(0,400));
 z=await page.evaluate(()=>{
  document.querySelector('[data-lager-karte="501"]').click();
  const kopfNeu=document.querySelector('[data-lager-karte="501"]');
  return {pfeil:kopfNeu.querySelector(".lager-karte-pfeil").textContent};
 });
 p(z.pfeil==="▸","ein zweiter Klick klappt sie wieder zu",z);

 // v3.104: "Alle zuklappen" blendet die GESAMTE Liste aus (keine einzige
 // Artikel-Karte mehr sichtbar), nicht nur die Buchungen einer Karte.
 z=await page.evaluate(()=>{
  $("lagerAlleZuklappen").click();
  return {knopfText:$("lagerAlleZuklappen").textContent,karten:document.querySelectorAll(".lager-karte").length,
   text:$("lagerverwaltungListe").textContent};
 });
 p(z.karten===0,"nach \"Alle zuklappen\" ist keine einzige Artikel-Karte mehr im DOM",z);
 p(!/Dichtband/.test(z.text),"auch die Bezeichnung steht nicht mehr im Text - die Liste ist wirklich leer, nicht nur eingeklappt",z.text);
 p(/⯈ Alle anzeigen/.test(z.knopfText),"der Knopf zeigt jetzt \"Alle anzeigen\" an",z.knopfText);
 z=await page.evaluate(()=>{
  $("lagerAlleZuklappen").click();
  return {knopfText:$("lagerAlleZuklappen").textContent,karten:document.querySelectorAll(".lager-karte").length};
 });
 p(z.karten>0,"\"Alle anzeigen\" zeigt die Artikel-Karten wieder",z);
 p(/⯆ Alle zuklappen/.test(z.knopfText),"der Knopf zeigt wieder \"Alle zuklappen\" an",z.knopfText);

 // ---- 4 · Buchen: Zugang/Abgang/Korrektur -------------------------------
 console.log("\n4 · Buchen setzt die richtige Richtung");
 async function buchen(art,eingabe,grund){
  return await page.evaluate(async({art,eingabe,grund})=>{
   window.__schreib=[];
   lagerBuchenOeffnen(501);
   $("lagerBuchenArt").value=art;
   $("lagerBuchenMenge").value=String(eingabe);
   $("lagerBuchenGrund").value=grund||"";
   // v3.123: das Ziel ist Pflicht. Hier geht es um die RICHTUNG der Menge,
   // deshalb die neutrale Wahl - geprueft wird das Ziel in Abschnitt 15.
   $("lagerBuchenZiel").value="werkstatt";
   $("lagerBuchenSpeichern").click();
   await new Promise(r=>setTimeout(r,50));
   const insert=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
   return {insert,d:insert&&(Array.isArray(insert.d)?insert.d[0]:insert.d),
     modalZu:$("lagerBuchenModal").hidden};
  },{art,eingabe,grund});
 }
 let r=await buchen("zugang",5,"Lieferschein 123");
 p(!!r.insert,"Zugang loest genau einen insert() auf lagerbestand_bewegungen aus",r);
 p(r.d&&r.d.variante_id===501&&r.d.art==="zugang"&&r.d.menge===5&&r.d.grund==="Lieferschein 123",
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
  lagerBuchenOeffnen(501);
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

 // ---- 10 · Einscannen/Ausscannen (v3.102, auf Produkte umgestellt v3.106) --
 console.log("\n10 · Einscannen/Ausscannen: Barcode -> Produkt -> vorbelegter Buchen-Dialog");
 // barcodeScannen wird gestubbt (siehe Kopfkommentar) - ruft den Callback
 // sofort mit einem fest hinterlegten Code auf, ohne echte Kamera/ZXing.
 // barcodeScannen ist als "function" (nicht const/let) global auf window -
 // window.barcodeScannen=... ueberschreibt deshalb die echte Funktion
 // DAUERHAFT, nicht nur fuer diesen Test. Die echte Funktion wird deshalb
 // einmalig gesichert, damit Abschnitt 13b sie spaeter fuer einen echten
 // Aufruf zurueckholen kann (siehe dort).
 const scanStubben=code=>page.evaluate(c=>{
  window.__scanAufrufe=window.__scanAufrufe||[];
  if(!window.__barcodeScannenEcht)window.__barcodeScannenEcht=window.barcodeScannen;
  window.barcodeScannen=cb=>{window.__scanAufrufe.push(true);cb(c)};
 },code);

 await scanStubben("4006381333931"); // bekannter Barcode des Testprodukts
 z=await page.evaluate(()=>{
  window.__scanAufrufe=[];
  $("lagerEinscannen").click();
  return {
   aufgerufen:window.__scanAufrufe.length===1,
   modalOffen:!$("lagerBuchenModal").hidden,
   art:$("lagerBuchenArt").value,
   varianteId:lagerBuchenVarianteId
  };
 });
 p(z.aufgerufen,"Einscannen ruft barcodeScannen() auf",z);
 p(z.modalOffen&&z.art==="zugang"&&z.varianteId===501,
   "bekannter Barcode oeffnet den Buchen-Dialog direkt mit Art=Zugang fuer das richtige Produkt",z);
 await page.evaluate(()=>{$("lagerBuchenModal").hidden=true});

 await scanStubben("4006381333931");
 z=await page.evaluate(()=>{
  $("lagerAusscannen").click();
  return {modalOffen:!$("lagerBuchenModal").hidden,art:$("lagerBuchenArt").value};
 });
 p(z.modalOffen&&z.art==="abgang","Ausscannen oeffnet denselben Dialog mit Art=Abgang",z);
 await page.evaluate(()=>{$("lagerBuchenModal").hidden=true});

 // Unbekannter Barcode BEIM AUSSCANNEN (Abgang): kein Bestand ohne
 // vorherigen Zugang moeglich - bleibt bei der reinen Meldung.
 await scanStubben("KEIN-TREFFER-999");
 z=await page.evaluate(()=>{
  $("lagerAusscannen").click();
  return {
   modalGeschlossen:$("lagerBuchenModal").hidden,
   neuesProduktGeschlossen:$("lagerNeuesProduktModal").hidden,
   hinweisSichtbar:!$("lagerverwaltungHinweis").hidden,
   hinweisText:$("lagerverwaltungHinweis").textContent
  };
 });
 p(z.modalGeschlossen&&z.neuesProduktGeschlossen,"ein unbekannter Barcode beim Ausscannen oeffnet KEINEN Dialog",z);
 p(z.hinweisSichtbar&&/nicht gefunden|Barcode/.test(z.hinweisText),
   "stattdessen erscheint eine klare Meldung statt eines stillen Fehlschlags",z);

 // Unbekannter Barcode BEIM EINSCANNEN (Zugang): bietet direkt an, daraus
 // ein neues Produkt anzulegen - siehe Abschnitt 12.
 await scanStubben("NEU-777");
 z=await page.evaluate(()=>{
  $("lagerEinscannen").click();
  return {
   neuesProduktOffen:!$("lagerNeuesProduktModal").hidden,
   barcodeVorbelegt:$("lagerNeuesProduktBarcode").value,
   materialVorbelegt:$("lagerNeuesProduktMaterial").value
  };
 });
 p(z.neuesProduktOffen,"ein unbekannter Barcode beim Einscannen oeffnet das Neues-Produkt-Formular",z);
 p(z.barcodeVorbelegt==="NEU-777","der gescannte Barcode ist darin vorausgefuellt",z);
 p(z.materialVorbelegt==="","die Materialposition ist noch nicht vorbelegt - muss gewaehlt werden",z);
 await page.evaluate(()=>{$("lagerNeuesProduktModal").hidden=true});

 // ---- 11 · Mehrere Produkte je Materialposition (v3.106) ----------------
 console.log("\n11 · Mehrere Produkte je Position: Gruppen-Darstellung");
 z=await page.evaluate(()=>({
  text:$("lagerverwaltungListe").textContent,
  karten:document.querySelectorAll(".lager-karte").length,
  variantenImDom:document.querySelectorAll(".lager-variante").length
 }));
 p(z.karten===2,"zwei Karten: eine flache Position (Dichtband) und eine Gruppe (Rohrbogen)",z);
 p(/Rohrbogen/.test(z.text)&&/2 Produkte/.test(z.text),"die Rohrbogen-Gruppe zeigt Positionsname und Produktanzahl",z.text);
 p(z.variantenImDom===0,"die einzelnen Produkte stehen erst nach dem Aufklappen der Gruppe im DOM",z);

 z=await page.evaluate(()=>{
  document.querySelector('[data-lager-karte="m2"]').click();
  return {
   varianten:Array.from(document.querySelectorAll(".lager-variante")).map(el=>el.textContent),
   buchenKnoepfeInGruppe:document.querySelectorAll('.lager-variante [data-lager-buchen]').length
  };
 });
 p(z.varianten.length===2,"aufgeklappt erscheinen beide Produkte als eigene Unter-Karten",z);
 p(z.varianten.some(t=>/87°/.test(t))&&z.varianten.some(t=>/45°/.test(t)),
   "mit ihrer jeweils eigenen Bezeichnung",z.varianten);
 p(z.buchenKnoepfeInGruppe===2,"jedes Produkt hat einen eigenen Buchen-Knopf",z);

 const buchenRohrbogen87=await page.evaluate(async()=>{
  window.__schreib=[];
  document.querySelector('[data-lager-buchen="601"]').click();
  const artikelText=$("lagerBuchenArtikel").textContent;
  $("lagerBuchenArt").value="zugang";
  $("lagerBuchenMenge").value="12";
  $("lagerBuchenZiel").value="werkstatt";   // v3.123: Ziel ist Pflicht
  $("lagerBuchenSpeichern").click();
  await new Promise(r=>setTimeout(r,50));
  const insert=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return {artikelText,d:insert&&insert.d[0]};
 });
 p(/Rohrbogen/.test(buchenRohrbogen87.artikelText)&&/87°/.test(buchenRohrbogen87.artikelText),
   "der Buchen-Dialog nennt Position UND Produktname, damit klar ist, welches Produkt gemeint ist",buchenRohrbogen87);
 p(buchenRohrbogen87.d&&buchenRohrbogen87.d.variante_id===601,
   "gebucht wird auf die Variante (601), nicht auf die Materialposition (2)",buchenRohrbogen87.d);
 z=await page.evaluate(()=>({bestand601:lagerBestandVon(601),bestand602:lagerBestandVon(602)}));
 p(z.bestand601===12&&z.bestand602===0,
   "der Bestand ist je Produkt getrennt - das zweite Produkt bleibt bei 0",z);

 // ---- 12 · Neues Produkt erfassen (v3.106) -------------------------------
 console.log("\n12 · Neues Produkt erfassen und einer Position zuordnen");
 z=await page.evaluate(()=>{
  document.querySelector('[data-lager-neues-produkt="2"]').click();
  return {
   offen:!$("lagerNeuesProduktModal").hidden,
   materialVorbelegt:$("lagerNeuesProduktMaterial").value
  };
 });
 p(z.offen,"\"＋ Weiteres Produkt\" innerhalb einer Position oeffnet dasselbe Formular",z);
 p(z.materialVorbelegt==="2","diesmal ist die Materialposition (Rohrbogen) bereits vorbelegt",z);

 z=await page.evaluate(async()=>{
  $("lagerNeuesProduktBezeichnung").value="";
  $("lagerNeuesProduktSpeichern").click();
  await new Promise(r=>setTimeout(r,20));
  return {fehlerSichtbar:!$("lagerNeuesProduktFehler").hidden,offenGeblieben:!$("lagerNeuesProduktModal").hidden};
 });
 p(z.fehlerSichtbar&&z.offenGeblieben,"ohne Bezeichnung wird nichts angelegt, das Formular bleibt offen",z);

 const neuesProdukt=await page.evaluate(async()=>{
  window.__schreib=[];
  $("lagerNeuesProduktBezeichnung").value="Rohrbogen 30° 100mm";
  $("lagerNeuesProduktBarcode").value="ROHR-30-100";
  $("lagerNeuesProduktSpeichern").click();
  await new Promise(r=>setTimeout(r,50));
  const insert=window.__schreib.find(x=>x.op==="insert"&&x.t==="lager_varianten");
  return {
   insert,d:insert&&insert.d[0],
   modalZu:$("lagerNeuesProduktModal").hidden,
   buchenOffen:!$("lagerBuchenModal").hidden,
   buchenArt:$("lagerBuchenArt").value
  };
 });
 p(!!neuesProdukt.insert,"ein insert() auf lager_varianten wird ausgeloest",neuesProdukt);
 p(neuesProdukt.d&&neuesProdukt.d.material_id===2&&neuesProdukt.d.bezeichnung==="Rohrbogen 30° 100mm"&&neuesProdukt.d.barcode==="ROHR-30-100",
   "mit der gewaehlten Position, Bezeichnung und dem Barcode",neuesProdukt.d);
 p(neuesProdukt.modalZu===true,"das Neues-Produkt-Formular schliesst nach dem Anlegen",neuesProdukt);
 p(neuesProdukt.buchenOffen&&neuesProdukt.buchenArt==="zugang",
   "direkt danach oeffnet sich der Buchen-Dialog mit Art=Zugang fuer das neue Produkt",neuesProdukt);
 z=await page.evaluate(()=>$("lagerverwaltungListe").textContent);
 p(/3 Produkte/.test(z),"die Position zeigt jetzt 3 Produkte in der Liste",z);
 await page.evaluate(()=>{$("lagerBuchenModal").hidden=true});

 // v3.118: bei einem groesseren Materialkatalog ist die reine Auswahlliste
 // unpraktisch - ein Suchfeld filtert die sichtbaren Positionen live.
 console.log("\n12b · Materialposition im Neues-Produkt-Formular suchen");
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(null,"");
  return {anzahlOptionenVoll:$("lagerNeuesProduktMaterial").options.length};
 });
 p(z.anzahlOptionenVoll===3,"ohne Suchbegriff zeigt die Liste alle Positionen (Platzhalter + 2 Materialien)",z);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktMaterialSuche").value="Dichtband";
  $("lagerNeuesProduktMaterialSuche").dispatchEvent(new Event("input"));
  const texte=[...$("lagerNeuesProduktMaterial").options].map(o=>o.textContent);
  return {anzahl:$("lagerNeuesProduktMaterial").options.length,texte};
 });
 p(z.anzahl===2&&z.texte.some(t=>/Dichtband/.test(t))&&!z.texte.some(t=>/Rohrbogen/.test(t)),
   "die Eingabe 'Dichtband' filtert die Liste auf den Platzhalter plus die passende Position",z);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktMaterialSuche").value="300";
  $("lagerNeuesProduktMaterialSuche").dispatchEvent(new Event("input"));
  const texte=[...$("lagerNeuesProduktMaterial").options].map(o=>o.textContent);
  return {texte};
 });
 p(z.texte.some(t=>/Rohrbogen/.test(t))&&!z.texte.some(t=>/Dichtband/.test(t)),
   "die Suche wirkt auch auf die EDV-Nr. ('300' findet '300.10 Rohrbogen'), nicht nur auf die Bezeichnung",z);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktMaterialSuche").value="gibtesnicht";
  $("lagerNeuesProduktMaterialSuche").dispatchEvent(new Event("input"));
  return {anzahl:$("lagerNeuesProduktMaterial").options.length};
 });
 p(z.anzahl===1,"ein Suchbegriff ohne Treffer laesst nur den Platzhalter uebrig, statt eines Fehlers",z);

 // eine bereits getroffene Auswahl darf beim Weitertippen nicht verloren
 // gehen, auch wenn sie selbst nicht mehr zum Suchbegriff passt
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(2,"");
  $("lagerNeuesProduktMaterialSuche").value="Dichtband";
  $("lagerNeuesProduktMaterialSuche").dispatchEvent(new Event("input"));
  return {
   ausgewaehlt:$("lagerNeuesProduktMaterial").value,
   texte:[...$("lagerNeuesProduktMaterial").options].map(o=>o.textContent)
  };
 });
 p(z.ausgewaehlt==="2"&&z.texte.some(t=>/Rohrbogen/.test(t)),
   "eine bereits vorbelegte Position bleibt beim Weitertippen ausgewaehlt, auch wenn sie selbst nicht zum Suchbegriff passt",z);
 await page.evaluate(()=>{lagerNeuesProduktSchliessen()});

 // ---- 13 · Tippen-zum-Fokussieren (v3.113, komplett umgebaut) ------------
 console.log("\n13 · Tippen-zum-Fokussieren (Kamera-Nahfokus)");
 // Nach zwei bestaetigten Fehlschlaegen (v3.108: zweiter Stream VOR dem
 // Stoppen des ersten; v3.111: takePhoto() auf einem WEITERLAUFENDEN Track)
 // komplett neue Architektur in v3.113: die Vorschau wird ERST VOLLSTAENDIG
 // GESTOPPT, DANN ein neuer Stream NUR fuer die Fotoaufnahme angefordert,
 // sofort danach wieder freigegeben, und erst DANACH ein neuer
 // Vorschau-Stream angefordert - zu keinem Zeitpunkt zwei gleichzeitige
 // Kamerazugriffe. Kein echter Kamera-Zugriff in dieser Umgebung -
 // srcObject verlangt aber ein echtes MediaStream-Objekt; captureStream()
 // auf einem <canvas> liefert einen echten (aber kameralosen) MediaStream.
 // window.ImageCapture und navigator.mediaDevices.getUserMedia werden
 // gestubbt, um die REIHENFOLGE der Aufrufe zu pruefen - nicht die echte
 // Hardware-Ansteuerung.
 z=await page.evaluate(async()=>{
  const ereignisse=[];
  const alterStream=document.createElement("canvas").captureStream();
  const alterTrack=alterStream.getVideoTracks()[0];
  alterTrack.stop=()=>{ereignisse.push("alten-Stream-gestoppt")};
  $("barcodeScanVideo").srcObject=alterStream;

  const fotoStream=document.createElement("canvas").captureStream();
  const fotoTrack=fotoStream.getVideoTracks()[0];
  fotoTrack.stop=()=>{ereignisse.push("foto-Stream-gestoppt")};
  const vorschauStream=document.createElement("canvas").captureStream();

  window.ImageCapture=class{
   constructor(){ereignisse.push("ImageCapture-erzeugt")}
   async takePhoto(){ereignisse.push("takePhoto");return new Blob(["x"],{type:"image/png"})}
  };
  let gumAufrufe=0;
  navigator.mediaDevices.getUserMedia=async()=>{
   gumAufrufe++;
   ereignisse.push("getUserMedia-"+gumAufrufe);
   return gumAufrufe===1?fotoStream:vorschauStream;
  };

  $("barcodeScanVideo").click();
  // v3.114: vor der Aufnahme wartet die Funktion jetzt 1s, damit der frisch
  // geoeffnete Foto-Stream selbst Zeit zum Fokussieren hat - die Wartezeit
  // hier muss entsprechend laenger sein als die interne Wartezeit.
  await new Promise(r=>setTimeout(r,1800));
  return {ereignisse,gumAufrufe,srcObjectAmEnde:$("barcodeScanVideo").srcObject===vorschauStream};
 });
 p(z.ereignisse[0]==="alten-Stream-gestoppt","zuerst wird der alte Vorschau-Stream vollstaendig gestoppt",z);
 p(z.ereignisse.indexOf("getUserMedia-1")>z.ereignisse.indexOf("alten-Stream-gestoppt"),
   "erst DANACH wird ein neuer Stream angefordert - nie zwei Kamerazugriffe gleichzeitig",z);
 p(z.ereignisse.includes("ImageCapture-erzeugt")&&z.ereignisse.includes("takePhoto"),
   "mit diesem neuen Stream wird ein Einzelfoto aufgenommen",z);
 p(z.ereignisse.indexOf("foto-Stream-gestoppt")>z.ereignisse.indexOf("takePhoto"),
   "der Foto-Stream wird direkt danach wieder freigegeben",z);
 p(z.gumAufrufe===2,"ohne gefundenen Code wird danach ein zweiter Stream fuer die Vorschau angefordert",z);
 p(z.srcObjectAmEnde===true,"das Kamerabild haengt am Ende an diesem neuen Vorschau-Stream",z);

 z=await page.evaluate(async()=>{
  // Ohne ImageCapture-Unterstuetzung darf die Vorschau gar nicht erst
  // angefasst werden - kein sinnloses Stoppen/Neustarten ohne Nutzen.
  delete window.ImageCapture;
  const stream=document.createElement("canvas").captureStream();
  const track=stream.getVideoTracks()[0];
  let gestoppt=false;
  track.stop=()=>{gestoppt=true};
  $("barcodeScanVideo").srcObject=stream;
  let gumAufrufe=0;
  navigator.mediaDevices.getUserMedia=async()=>{gumAufrufe++;return document.createElement("canvas").captureStream()};
  $("barcodeScanVideo").click();
  await new Promise(r=>setTimeout(r,350));
  return {gestoppt,gumAufrufe,srcObjectUnveraendert:$("barcodeScanVideo").srcObject===stream};
 });
 p(z.gestoppt===false&&z.gumAufrufe===0&&z.srcObjectUnveraendert===true,
   "ohne ImageCapture-Unterstuetzung wird die Vorschau gar nicht erst angefasst",z);

 z=await page.evaluate(async()=>{
  // Schlaegt die Fotoanforderung fehl (z. B. Kamera kurzzeitig nicht
  // verfuegbar), darf kein Fehler sichtbar werden - die Vorschau wird
  // trotzdem danach neu angefordert, damit weitergesucht werden kann.
  const alterStream=document.createElement("canvas").captureStream();
  alterStream.getVideoTracks()[0].stop=()=>{};
  $("barcodeScanVideo").srcObject=alterStream;
  window.ImageCapture=class{ constructor(){} async takePhoto(){return new Blob(["x"],{type:"image/png"})} };
  const vorschauStream=document.createElement("canvas").captureStream();
  let gumAufrufe=0;
  navigator.mediaDevices.getUserMedia=async()=>{
   gumAufrufe++;
   if(gumAufrufe===1)throw new Error("Kamera gerade nicht verfuegbar");
   return vorschauStream;
  };
  let fehler=null;
  try{ $("barcodeScanVideo").click(); await new Promise(r=>setTimeout(r,600)); }catch(e){fehler=e}
  return {fehler,gumAufrufe,srcObjectAmEnde:$("barcodeScanVideo").srcObject===vorschauStream};
 });
 p(z.fehler===null,"ein fehlschlagender Fotoversuch wirft keinen sichtbaren Fehler",z);
 p(z.gumAufrufe===2&&z.srcObjectAmEnde===true,
   "die Vorschau wird trotzdem danach neu angefordert, damit weitergesucht werden kann",z);

 // v3.114: manuelle Code-Eingabe als garantierter Rueckweg, unabhaengig von
 // jeder Kamera-Eigenheit. barcodeScanAktuellerCallback ist in dieser
 // Testumgebung nie gesetzt (barcodeScannen() wird hier nie echt
 // aufgerufen, siehe Kopfkommentar) - geprueft wird deshalb nur, dass das
 // Overlay schliesst und das Eingabefeld sich leert, nicht der Callback
 // selbst.
 z=await page.evaluate(async()=>{
  $("barcodeScanOverlay").hidden=false;
  $("barcodeScanManuellInput").value="";
  $("barcodeScanManuellUebernehmen").click();
  return {ueberlebtLeer:!$("barcodeScanOverlay").hidden};
 });
 p(z.ueberlebtLeer===true,"leere manuelle Eingabe wird ignoriert - Overlay bleibt offen",z);

 z=await page.evaluate(async()=>{
  const stream=document.createElement("canvas").captureStream();
  let gestoppt=false;
  stream.getVideoTracks()[0].stop=()=>{gestoppt=true};
  $("barcodeScanVideo").srcObject=stream;
  $("barcodeScanOverlay").hidden=false;
  $("barcodeScanManuellInput").value="  ABC123  ";
  $("barcodeScanManuellUebernehmen").click();
  return {overlayGeschlossen:$("barcodeScanOverlay").hidden,eingabeGeleert:$("barcodeScanManuellInput").value==="",gestoppt};
 });
 p(z.overlayGeschlossen===true,"Klick auf Uebernehmen mit ausgefuellter Eingabe schliesst das Overlay",z);
 p(z.eingabeGeleert===true,"das Eingabefeld wird danach geleert",z);
 p(z.gestoppt===true,"die Kamera wird dabei wie gewohnt gestoppt",z);

 z=await page.evaluate(async()=>{
  $("barcodeScanVideo").srcObject=document.createElement("canvas").captureStream();
  $("barcodeScanOverlay").hidden=false;
  $("barcodeScanManuellInput").value="XYZ789";
  $("barcodeScanManuellInput").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter"}));
  return {overlayGeschlossen:$("barcodeScanOverlay").hidden};
 });
 p(z.overlayGeschlossen===true,"die Eingabetaste (Enter) im Feld uebernimmt die Eingabe genauso wie der Knopf",z);

 // v3.115: "Andere Kamera-App verwenden" -> versteckter <input type="file">
 // mit capture="environment" oeffnet die native Kamera-App statt getUserMedia.
 z=await page.evaluate(async()=>{
  $("barcodeScanOverlay").hidden=false;
  let geklickt=false;
  $("barcodeScanNativeInput").click=()=>{geklickt=true};
  $("barcodeScanNativeKamera").click();
  return {geklickt};
 });
 p(z.geklickt===true,"der Knopf 'Andere Kamera-App verwenden' loest einen Klick auf das versteckte native Datei-Feld aus",z);

 const einPixelPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64");
 const tmpPngPfad=require("path").join(require("os").tmpdir(),"barcode-native-test-"+Date.now()+".png");
 require("fs").writeFileSync(tmpPngPfad,einPixelPng);
 let fehler=null;
 try{
  await page.setInputFiles("#barcodeScanNativeInput",tmpPngPfad);
  await page.waitForTimeout(200);
 }catch(e){ fehler=e.message; }
 finally{ try{ require("fs").unlinkSync(tmpPngPfad); }catch(e){} }
 z=await page.evaluate(()=>({status:$("barcodeScanStatus")?$("barcodeScanStatus").textContent:null}));
 p(fehler===null,"eine ueber die native Kamera-App ausgewaehlte Bilddatei loest den change-Handler auf, ohne einen Fehler zu werfen",{fehler,...z});
 p(/nicht ausgewertet werden/.test(z.status||""),"ohne echten barcodeScanCodeReader (Testumgebung, siehe Abschnitt 10) meldet das Overlay verstaendlich, dass das Foto nicht ausgewertet werden konnte, statt stillschweigend zu haengen",z);

 // v3.116: die TATSAECHLICHE Ursache des seit v3.109 beobachteten
 // "unscharf"/"kein Code gefunden"-Verhaltens war kein Kamera-Problem,
 // sondern ein API-Fehler: decodeFromImageElement() der ZXing-Bibliothek
 // akzeptiert laut eigener Typdefinition NUR ein <img>-Element (oder dessen
 // ID) - jeder bisherige Versuch uebergab stattdessen ein <canvas>, das die
 // Bibliothek intern nicht erkennt und das den Aufruf VOR jedem echten
 // Dekodierversuch scheitern liess. Dieser Test prueft direkt (ohne ZXing,
 // das in dieser Testumgebung wie in Abschnitt 10 dokumentiert nicht zur
 // Verfuegung steht) die neue Hilfsfunktion barcodeScanBildElement(): sie
 // muss aus einer Bilddatei ein ECHTES <img>-Element erzeugen, kein Canvas.
 z=await page.evaluate(async()=>{
  const antwort=await fetch("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
  const blob=await antwort.blob();
  const {img,url}=await barcodeScanBildElement(blob);
  const ergebnis={istImg:img instanceof HTMLImageElement,istCanvas:img instanceof HTMLCanvasElement,breite:img.naturalWidth,hoehe:img.naturalHeight};
  try{URL.revokeObjectURL(url)}catch(e){}
  return ergebnis;
 });
 p(z.istImg===true&&z.istCanvas===false,"barcodeScanBildElement() liefert ein echtes <img>-Element (nicht ein <canvas>) - genau das, was decodeFromImageElement() laut ZXing-API verlangt",z);
 p(z.breite===1&&z.hoehe===1,"das <img>-Element hat die Abmessungen der uebergebenen Bilddatei tatsaechlich geladen (naturalWidth/naturalHeight), ist also fertig einsatzbereit fuer den Dekodierversuch",z);

 // v3.117: ZXing wiederholt decodeFromImageElement() bei einer
 // Checksum-/FormatException OHNE eingebaute Obergrenze automatisch per
 // setTimeout - ein Foto, das wiederholt genau diesen Fehler ausloest,
 // koennte die Auswertung sonst unbegrenzt lange "haengen" lassen, ohne je
 // eine Rueckmeldung zu zeigen. barcodeScanMitZeitlimit() stellt sicher,
 // dass immer irgendeine Rueckmeldung erscheint.
 z=await page.evaluate(async()=>{
  const ergebnis={};
  // schneller Erfolg VOR dem Limit muss durchgereicht werden
  try{
   const wert=await barcodeScanMitZeitlimit(Promise.resolve("XYZ"),1000);
   ergebnis.schnellerErfolg=wert;
  }catch(e){ ergebnis.schnellerErfolgFehler=e.message; }
  // ein Fehler VOR dem Limit muss durchgereicht werden, nicht verschluckt
  try{
   await barcodeScanMitZeitlimit(Promise.reject(new Error("echter Fehler")),1000);
  }catch(e){ ergebnis.schnellerFehler=e.message; }
  // ein Versprechen, das NIE von selbst fertig wird, muss nach dem Limit
  // trotzdem mit einer klaren Meldung abgebrochen werden
  try{
   await barcodeScanMitZeitlimit(new Promise(()=>{}),150);
  }catch(e){ ergebnis.zeitlimitFehler=e.message; }
  return ergebnis;
 });
 p(z.schnellerErfolg==="XYZ","ein Versprechen, das vor dem Zeitlimit erfolgreich ist, wird unveraendert durchgereicht",z);
 p(z.schnellerFehler==="echter Fehler","ein Versprechen, das vor dem Zeitlimit mit einem echten Fehler abbricht, wird nicht verschluckt",z);
 p(/Zeitueberschreitung/.test(z.zeitlimitFehler||""),"ein Versprechen, das NIE von selbst fertig wird (wie ZXings unbegrenzte interne Wiederholung), wird nach dem Zeitlimit trotzdem mit einer klaren Meldung abgebrochen statt die App haengen zu lassen",z);

 // v3.119: barcodeScannen() (der echte Einstieg, den Einscannen/Ausscannen
 // aufrufen - in Abschnitt 10 zugunsten der stillgelegten ZXing/Netzwerk-
 // Abhaengigkeit gestubbt, siehe dortiger Kommentar) soll die native
 // Kamera-App jetzt sofort automatisch oeffnen, ohne dass der Anwender
 // zuerst auf einen Knopf tippen muss. Ein programmatischer Klick auf das
 // Datei-Feld wird von Browsern nur akzeptiert, wenn er noch innerhalb des
 // urspruenglichen Nutzer-Klicks passiert - deshalb muss er VOR jedem
 // "await" in der Funktion passieren. Getestet wird das hier direkt an der
 // ECHTEN Funktion (window.__barcodeScannenEcht aus Abschnitt 10, siehe
 // dortiger Kommentar - window.barcodeScannen zeigt seit Abschnitt 10
 // dauerhaft auf den Stub), indem der Klick auf das Datei-Feld abgefangen
 // wird und sofort - ohne die Funktion abzuwarten - geprueft wird, ob er
 // bereits ausgeloest wurde.
 console.log("\n13b · Kamera-App oeffnet sich automatisch (v3.119)");
 z=await page.evaluate(async()=>{
  const echteBarcodeScannen=window.__barcodeScannenEcht;
  const input=$("barcodeScanNativeInput");
  let geklickt=false;
  const echterClick=input.click.bind(input);
  input.click=()=>{geklickt=true};
  const aufruf=echteBarcodeScannen(()=>{});
  const sofort={
   geklicktSofort:geklickt,
   overlayOffen:!$("barcodeScanOverlay").hidden,
   callbackGesetzt:typeof barcodeScanAktuellerCallback==="function"
  };
  await aufruf; // laesst den (im Testnetz zwangslaeufig scheiternden) ZXing-Ladeversuch sauber abschliessen
  input.click=echterClick;
  barcodeScanSchliessen();
  return sofort;
 });
 p(z.geklicktSofort===true,"barcodeScannen() klickt das versteckte native Datei-Feld sofort, noch bevor irgendetwas anderes abgewartet wird",z);
 p(z.overlayOffen===true,"das Scan-Overlay ist zu diesem Zeitpunkt bereits geoeffnet",z);
 p(z.callbackGesetzt===true,"der callback ist zu diesem Zeitpunkt bereits hinterlegt, damit ein sehr schnell zurueckkommendes Foto nicht verloren gehen kann",z);

 // ---- 14 · Massaufnahme ab Lager ausbuchen (v3.120) ----------------------
 // Quelle sind die von Hand erfassten Materialzeilen der Massaufnahme
 // (measRapportMaterial, js/57). Gebucht wird NIE von selbst - erst der
 // Knopf im Dialog loest die Buchung aus.
 console.log("\n14 · Material der Massaufnahme ab Lager ausbuchen");
 z=await page.evaluate(()=>{
  currentMeasurementId=77;
  $("measType").value="kamin";
  $("measTitle").value="Kamin Nordseite";
  // 205.30 -> Position mit genau EINEM Produkt, 300.10 -> Position mit
  // mehreren, 999.99 -> nicht im Katalog, letzte Zeile ohne Menge.
  measRapportMaterial=[{no:"205.30",qty:5},{no:"300.10",qty:3},
                       {no:"999.99",qty:1},{no:"205.30",qty:0}];
  // v3.121: die Liste traegt jetzt zwei Herkuenfte. Hier geprueft wird der
  // von Hand erfasste Teil - die Halbfabrikate kommen in 14b.
  const zeilen=measLagerZeilenBauen().filter(x=>x.art==="erfasst");
  return zeilen.map(x=>({no:x.no,menge:x.menge,grund:x.grund,
   varianteId:x.varianteId,anzahlVarianten:x.varianten.length}));
 });
 p(z.length===4,"jede Materialzeile der Massaufnahme wird angeboten - auch die nicht buchbaren",z);
 p(z[0].grund===""&&z[0].varianteId==="501",
   "eine Position mit genau einem Lager-Produkt ist ohne Rueckfrage buchbar, das Produkt steht fest",z[0]);
 p(z[1].grund===""&&z[1].varianteId===""&&z[1].anzahlVarianten>1,
   "bei mehreren Produkten je Position waehlt die App KEINES aus - das muss der Anwender entscheiden",z[1]);
 p(/nicht im Material-Katalog/.test(z[2].grund),
   "eine EDV-Nr. ausserhalb des Katalogs wird mit Grund angezeigt, statt still zu verschwinden",z[2]);
 p(/keine Menge/.test(z[3].grund),"eine Zeile ohne Menge ist nicht buchbar und sagt das auch",z[3]);

 z=await page.evaluate(async()=>{
  await measLagerOeffnen();
  return {
   offen:!$("measLagerModal").hidden,
   knopf:$("measLagerBuchenBtn").textContent,
   warnungVersteckt:$("measLagerWarnung").hidden
  };
 });
 p(z.offen===true,"der Knopf oeffnet den Dialog, gebucht ist damit noch nichts",z);
 p(/\(1\)/.test(z.knopf),"vorgewaehlt ist nur die eindeutige Zeile - die Zeile mit mehreren Produkten nicht",z);
 p(z.warnungVersteckt===true,"ohne frueheren Vorgang steht keine Warnung im Dialog",z);

 // Produkt waehlen und Menge anpassen - genau der Fall "gegebenenfalls
 // Positionen anpassen".
 z=await page.evaluate(async()=>{
  const sel=document.querySelector("[data-meas-lager-variante]");
  sel.value="602";
  sel.dispatchEvent(new Event("change",{bubbles:true}));
  const box=document.querySelector('[data-meas-lager-wahl="z1"]');
  box.checked=true;
  box.dispatchEvent(new Event("change",{bubbles:true}));
  const menge=document.querySelector('[data-meas-lager-menge="z1"]');
  menge.value="2";
  menge.dispatchEvent(new Event("input",{bubbles:true}));
  return {knopf:$("measLagerBuchenBtn").textContent};
 });
 p(/\(2\)/.test(z.knopf),"nach der Produktwahl laesst sich die Zeile anwaehlen und zaehlt mit",z);

 const ausbuchen=await page.evaluate(async()=>{
  window.__schreib=[];
  $("measLagerBuchenBtn").click();
  await new Promise(r=>setTimeout(r,60));
  const ins=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return {ins,zeilen:ins?ins.d:null,zu:$("measLagerModal").hidden};
 });
 p(!!ausbuchen.ins&&ausbuchen.zeilen.length===2,
   "erst der Knopf bucht - und zwar alle gewaehlten Zeilen in EINER Anfrage",ausbuchen);
 p(ausbuchen.zeilen.every(d=>d.art==="abgang"&&d.menge<0),
   "gebucht wird als Abgang mit negativer Menge",ausbuchen.zeilen);
 p(ausbuchen.zeilen.some(d=>d.variante_id===501&&d.menge===-5)
   &&ausbuchen.zeilen.some(d=>d.variante_id===602&&d.menge===-2),
   "gebucht wird auf das gewaehlte Produkt und mit der im Dialog stehenden Menge, nicht mit der aus der Massaufnahme",ausbuchen.zeilen);
 p(ausbuchen.zeilen.every(d=>/\(#MA77\)/.test(d.grund||"")&&/Kamin Nordseite/.test(d.grund||"")),
   "der Buchungsgrund nennt die Massaufnahme - in der Lagerverwaltung ist spaeter sichtbar, woher die Buchung stammt",ausbuchen.zeilen);
 p(ausbuchen.zu===true,"der Dialog schliesst nach dem Buchen",ausbuchen);

 // Zweiter Anlauf: die frueheren Buchungen stehen jetzt in lagerBewegungen.
 z=await page.evaluate(async()=>{
  await measLagerOeffnen();
  const w=$("measLagerWarnung");
  const text=w.textContent;
  measLagerSchliessen();
  return {versteckt:w.hidden,text};
 });
 p(z.versteckt===false&&/bereits ausgebucht/.test(z.text),
   "ein zweiter Anlauf warnt sichtbar, dass fuer diese Massaufnahme schon ausgebucht wurde",z);


 // ---- 14b · Halbfabrikate mit ausbuchen (v3.121) -------------------------
 // Der Anwender hat die Abgrenzung von v3.120 korrigiert: Halbfabrikate
 // (bei einer Dachrinne Rinnenboeden, Stutzen, Halter, Winkel) gehoeren
 // sehr wohl ins Lager, nur das BLECH selbst nicht. Quelle ist
 // rmatTeileZeilen() (js/57) - dieselbe Funktion wie im
 // Regierapport-Dialog, keine zweite Ableitung.
 console.log("\n14b · Halbfabrikate der Massaufnahme mit ausbuchen");
 z=await page.evaluate(async()=>{
  // Katalog und Lager um zwei Halbfabrikat-Positionen erweitern:
  //  412.10 Rinnenhalter -> genau EIN Produkt (eindeutiger Treffer)
  //  413.20 Rinnenboden  -> ZWEI Produkte (links/rechts)
  settings.materials=settings.materials.concat([
   ["412.10","Rinnenhalter alle Materialien","330 mm","Stk",6.50],
   ["413.20","Rinnenboden","330 mm","Stk",9.90]]);
  materialIds=[1,2,3,4];
  window.__lese.lager_varianten=window.__lese.lager_varianten.concat([
   {id:701,material_id:3,bezeichnung:"Rinnenhalter 330 verzinkt",barcode:"RH-330"},
   {id:801,material_id:4,bezeichnung:"Rinnenboden links 330",barcode:"RB-L-330"},
   {id:802,material_id:4,bezeichnung:"Rinnenboden rechts 330",barcode:"RB-R-330"}]);
  // Eine echte Dachrinne im Formular - der Zustand des Moduls selbst,
  // buildMeasurementFromForm() (js/16) macht daraus data.ausmass.
  currentMeasurementId=78;
  $("measType").value="rinne_halbrund";
  $("measTitle").value="Dachrinne Nord";
  measRapportMaterial=[{no:"205.30",qty:4}];
  rinneA=raLeer();
  rinneA.groesse="330";
  rinneA.segmente=[{laenge:"6000",linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null},
                   {laenge:"4000",linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
  rinneA.halter={anzahl:21,abstand_mm:"500",typ:""};
  rinneA.rinnenboden={links:true,rechts:true};
  await measLagerOeffnen();
  return measLagerZeilen.map(x=>({art:x.art,bez:x.bezeichnung,menge:x.menge,
   einheit:x.einheit,no:x.no,grund:x.grund,varianteId:x.varianteId,
   anzahlVarianten:x.varianten.length,gewaehlt:x.gewaehlt,vorschlag:x.vorschlag||""}));
 });
 const erfasst=z.filter(x=>x.art==="erfasst");
 const teile=z.filter(x=>x.art==="teil");
 p(erfasst.length===1&&erfasst[0].no==="205.30",
   "das von Hand erfasste Material steht unveraendert weiter in der Liste",erfasst);
 p(teile.length>=3,"die Halbfabrikate der Massaufnahme kommen dazu - eine Zeile je Teil",teile);
 p(teile.some(x=>/Rinnenhalter/.test(x.bez)&&x.menge===21)
   &&teile.some(x=>/Rinnenboden links/.test(x.bez))
   &&teile.some(x=>/Rinnenboden rechts/.test(x.bez)),
   "Rinnenhalter und beide Rinnenboeden stehen mit ihrer gerechneten Menge da",teile);

 const blech=teile.find(x=>/^Dachrinne/.test(x.bez));
 p(!!blech,"auch die Blech-Zeile der Dachrinne wird angezeigt statt still zu verschwinden",teile);
 p(!!blech&&blech.no===""&&blech.varianteId===""&&blech.gewaehlt===false,
   "das Blech selbst bleibt ohne Materialposition und unangehakt - es gehoert nicht ins Lager",blech);

 const halter=teile.find(x=>/Rinnenhalter/.test(x.bez));
 p(!!halter&&halter.no==="412.10"&&halter.varianteId==="701"&&halter.gewaehlt===true,
   "ein eindeutiger Katalogtreffer mit genau EINEM Lager-Produkt wird vorgewaehlt",halter);
 const bodenL=teile.find(x=>/Rinnenboden links/.test(x.bez));
 p(!!bodenL&&bodenL.no===""&&bodenL.gewaehlt===false&&/413\.20/.test(bodenL.vorschlag),
   "ein unsicherer Treffer wird nur als Vorschlag genannt, aber NICHT gewaehlt - die App raet nicht",bodenL);

 // Die Suche filtert die Positionsliste, ohne die getroffene Wahl zu verlieren.
 z=await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  const feld=document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]');
  const sel=()=>document.querySelector('[data-meas-lager-position="'+zeile.id+'"]');
  const alle=sel().options.length;
  feld.value="rinnenboden";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  const gefiltert=[...sel().options].map(o=>o.textContent);
  // Jetzt die Position waehlen und danach nach etwas ganz anderem suchen.
  const s2=sel(); s2.value=String(zeile.positionen.find(a=>a.edv_nr==="413.20").id);
  s2.dispatchEvent(new Event("change",{bubbles:true}));
  const nachWahl={no:zeile.no,anzahlVarianten:zeile.varianten.length,varianteId:zeile.varianteId};
  const feld2=document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]');
  feld2.value="dichtband";
  feld2.dispatchEvent(new Event("input",{bubbles:true}));
  const nachFremdsuche=[...sel().options].map(o=>o.value);
  return {alle,gefiltert,nachWahl,nachFremdsuche,
   gewaehlteId:String(zeile.artikel?zeile.artikel.id:"")};
 });
 p(z.gefiltert.length<z.alle&&z.gefiltert.some(t=>/Rinnenboden/.test(t)),
   "das Suchfeld filtert die Positionsliste der Zeile",z);
 p(z.nachWahl.no==="413.20"&&z.nachWahl.anzahlVarianten===2&&z.nachWahl.varianteId==="",
   "mit der Position wechselt die Produktliste - bei zwei Produkten waehlt weiterhin der Anwender",z.nachWahl);
 p(z.nachFremdsuche.indexOf(z.gewaehlteId)>=0,
   "eine bereits gewaehlte Position bleibt in der Liste, auch wenn die Suche sie nicht mehr trifft",z);

 // Produkt waehlen, anhaken, buchen - zusammen mit dem erfassten Material.
 const ausbuchen2=await page.evaluate(async()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  const sel=document.querySelector('[data-meas-lager-variante="'+zeile.id+'"]');
  sel.value="801";
  sel.dispatchEvent(new Event("change",{bubbles:true}));
  const box=document.querySelector('[data-meas-lager-wahl="'+zeile.id+'"]');
  box.checked=true;
  box.dispatchEvent(new Event("change",{bubbles:true}));
  window.__schreib=[];
  $("measLagerBuchenBtn").click();
  await new Promise(r=>setTimeout(r,60));
  const ins=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return {zeilen:ins?ins.d:null};
 });
 p(!!ausbuchen2.zeilen&&ausbuchen2.zeilen.some(d=>d.variante_id===801&&d.menge===-1),
   "ein Halbfabrikat wird auf das gewaehlte Produkt ausgebucht",ausbuchen2.zeilen);
 p(!!ausbuchen2.zeilen&&ausbuchen2.zeilen.some(d=>d.variante_id===701&&d.menge===-21)
   &&ausbuchen2.zeilen.some(d=>d.variante_id===501&&d.menge===-4),
   "Halbfabrikate und von Hand erfasstes Material gehen gemeinsam in EINER Anfrage weg",ausbuchen2.zeilen);
 p(!!ausbuchen2.zeilen&&ausbuchen2.zeilen.every(d=>/\(#MA78\)/.test(d.grund||"")),
   "auch diese Buchungen tragen die Marke dieser Massaufnahme im Grund",ausbuchen2.zeilen);

 // Gegenprobe: ohne gewaehlte Position ist eine Halbfabrikat-Zeile nicht buchbar.
 z=await page.evaluate(async()=>{
  await measLagerOeffnen();
  const zeile=measLagerZeilen.find(x=>/^Dachrinne/.test(x.bezeichnung));
  zeile.gewaehlt=true;                       // von Hand angehakt, aber ohne Position
  const buchbar=measLagerBuchbar().map(x=>x.bezeichnung);
  measLagerSchliessen();
  return {buchbar,dabei:buchbar.some(b=>/^Dachrinne/.test(b))};
 });
 p(z.dabei===false,
   "eine angehakte Zeile OHNE Materialposition wird trotzdem nicht gebucht",z);


 // ---- 15 · Objekt/Projekt an der Buchung (v3.123) ------------------------
 // Bis v3.122 hielt eine Buchung nicht fest, WOHIN das Material ging - das
 // Projekt stand hoechstens als Freitext im Grund. Seit der Migration
 // "lagerbuchung_projekt_zuordnung" traegt jede Buchung project_id und
 // ziel. Die Wahl ist Pflicht, aber "Werkstatt / Lager" ist eine gueltige,
 // ausdrueckliche Antwort - so faellt nichts stillschweigend weg.
 console.log("\n15 · Objekt/Projekt an der Lagerbuchung");
 z=await page.evaluate(async()=>{
  allProjects=[
   {id:11,name:"Neubau Hof",object:"Alpeneggstrasse 7",order_no:"A-101",customer:"Muster AG",archived:false},
   {id:12,name:"Sanierung Schule",object:"Schulweg 3",order_no:"A-102",customer:"Gemeinde",archived:false},
   {id:13,name:"Altes Projekt",object:"Nirgendwo 1",order_no:"",customer:"",archived:true}
  ];
  lagerBuchenOeffnen("501");
  const sel=$("lagerBuchenZiel");
  return {werte:[...sel.options].map(o=>o.value),
   texte:[...sel.options].map(o=>o.textContent),
   vorbelegt:sel.value};
 });
 p(z.vorbelegt==="","nichts ist vorbelegt - die Zuordnung wird bewusst getroffen, nicht geraten",z);
 p(z.werte[1]==="werkstatt"&&/Werkstatt/.test(z.texte[1]),
   "gleich nach der leeren Zeile steht Werkstatt/Lager als ausdrueckliche Wahl",z.texte);
 p(z.werte.includes("11")&&z.werte.includes("12"),"die offenen Projekte stehen zur Wahl",z.werte);
 p(!z.werte.includes("13"),"ein archiviertes Projekt steht NICHT mehr zur Wahl",z.werte);
 p(z.texte.some(t=>/Alpeneggstrasse 7/.test(t)),
   "zuerst steht das OBJEKT (die Adresse) - danach sucht der Spengler, nicht nach dem Projektnamen",z.texte);

 // Ohne Ziel wird nicht gebucht.
 z=await page.evaluate(async()=>{
  $("lagerBuchenArt").value="abgang";
  $("lagerBuchenMenge").value="4";
  $("lagerBuchenZiel").value="";
  window.__schreib=[];
  $("lagerBuchenSpeichern").click();
  await new Promise(r=>setTimeout(r,60));
  return {geschrieben:window.__schreib.filter(x=>x.op==="insert").length,
   fehler:$("lagerBuchenFehler").textContent,versteckt:$("lagerBuchenFehler").hidden};
 });
 p(z.geschrieben===0&&z.versteckt===false&&/Projekt/.test(z.fehler),
   "ohne Zuordnung wird nichts gebucht und der Dialog sagt warum",z);

 // Suche filtert, ohne Werkstatt oder die getroffene Wahl zu verlieren.
 z=await page.evaluate(()=>{
  const feld=$("lagerBuchenZielSuche"), sel=$("lagerBuchenZiel");
  sel.value="11";
  feld.value="Schulweg";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  return {werte:[...sel.options].map(o=>o.value)};
 });
 p(z.werte.includes("werkstatt"),
   "die Suche filtert Werkstatt/Lager nie weg - sie ist keine Projektsuche, sondern die Alternative",z.werte);
 p(z.werte.includes("12"),"das gesuchte Projekt ist dabei",z.werte);
 p(z.werte.includes("11"),"und die bereits getroffene Wahl bleibt drin, obwohl die Suche sie nicht trifft",z.werte);

 // Mit Projekt buchen.
 z=await page.evaluate(async()=>{
  const feld=$("lagerBuchenZielSuche");
  feld.value=""; feld.dispatchEvent(new Event("input",{bubbles:true}));
  $("lagerBuchenZiel").value="11";
  $("lagerBuchenArt").value="abgang";
  $("lagerBuchenMenge").value="4";
  window.__schreib=[];
  $("lagerBuchenSpeichern").click();
  await new Promise(r=>setTimeout(r,60));
  const ins=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return ins?ins.d:null;
 });
 z=Array.isArray(z)?z[0]:z;
 p(!!z&&z.project_id===11&&z.ziel==="projekt"&&z.menge===-4,
   "mit gewaehltem Projekt gehen project_id und ziel='projekt' mit in die Buchung",z);

 // Mit Werkstatt buchen.
 z=await page.evaluate(async()=>{
  lagerBuchenOeffnen("501");
  $("lagerBuchenZiel").value="werkstatt";
  $("lagerBuchenArt").value="abgang";
  $("lagerBuchenMenge").value="2";
  window.__schreib=[];
  $("lagerBuchenSpeichern").click();
  await new Promise(r=>setTimeout(r,60));
  const ins=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return ins?ins.d:null;
 });
 z=Array.isArray(z)?z[0]:z;
 p(!!z&&z.project_id===null&&z.ziel==="werkstatt",
   "Werkstatt/Lager wird ausdruecklich als ziel='werkstatt' ohne Projekt gebucht - nicht als Luecke",z);

 // Die Ausbuchung aus der Massaufnahme fragt nicht, sie uebernimmt.
 z=await page.evaluate(async()=>{
  currentMeasurementId=91;
  measSelectedProjectId=12;
  $("measType").value="kamin";
  $("measTitle").value="Kamin West";
  measRapportMaterial=[{no:"205.30",qty:6}];
  await measLagerOeffnen();
  const hinweis=$("measLagerZiel").textContent;
  window.__schreib=[];
  $("measLagerBuchenBtn").click();
  await new Promise(r=>setTimeout(r,60));
  const ins=window.__schreib.find(x=>x.op==="insert"&&x.t==="lagerbestand_bewegungen");
  return {hinweis,zeilen:ins?ins.d:null};
 });
 p(/Schulweg 3/.test(z.hinweis),
   "der Ausbuchen-Dialog sagt, welchem Projekt die Buchung zugeordnet wird",z.hinweis);
 p(!!z.zeilen&&z.zeilen.every(d=>d.project_id===12&&d.ziel==="projekt"),
   "die Ausbuchung aus der Massaufnahme uebernimmt deren Projekt, ohne zu fragen",z.zeilen);

 // ---- 15b · Materialzusammenfassung im Projekt ---------------------------
 console.log("\n15b · Materialzusammenfassung im Projekt");
 z=await page.evaluate(()=>{
  const heute=new Date().toISOString();
  lagerBewegungen=[
   {id:1,variante_id:501,art:"abgang",menge:-10,project_id:11,ziel:"projekt",grund:null,created_at:heute},
   {id:2,variante_id:501,art:"zugang",menge:3,project_id:11,ziel:"projekt",grund:"Rest zurueck",created_at:heute},
   {id:3,variante_id:601,art:"abgang",menge:-2,project_id:11,ziel:"projekt",grund:null,created_at:heute},
   {id:4,variante_id:501,art:"abgang",menge:-99,project_id:12,ziel:"projekt",grund:null,created_at:heute},
   {id:5,variante_id:501,art:"abgang",menge:-5,project_id:null,ziel:"werkstatt",grund:null,created_at:heute},
   // Der scharfe Fall fuer den Werkstatt-Filter: ausdruecklich der Werkstatt
   // zugeordnet, traegt aber trotzdem die Marke einer Massaufnahme dieses
   // Projekts im Grund (z. B. weil jemand den Text hineinkopiert hat). Ohne
   // den Filter wuerde die Marke gewinnen und die Zeile faelschlich zaehlen.
   {id:7,variante_id:501,art:"abgang",menge:-42,project_id:null,ziel:"werkstatt",
    grund:"Rest aus Massaufnahme: Kamin Nordseite (#MA77) in die Werkstatt",created_at:heute},
   // Vor v3.123 aus einer Massaufnahme gebucht: kein project_id, aber die
   // Marke im Grund. Massaufnahme 77 gehoert zu Projekt 11.
   {id:6,variante_id:602,art:"abgang",menge:-7,project_id:null,ziel:"unbekannt",
    grund:"Massaufnahme: Kamin Nordseite (#MA77)",created_at:heute}
  ];
  const zeilen=lagerZusammenfassung(lagerBuchungenFuerProjekt(11,[77]));
  return zeilen.map(x=>({v:x.varianteId,raus:x.raus,zurueck:x.zurueck,netto:x.netto,n:x.buchungen.length}));
 });
 p(z.length===3,"je Produkt eine Zeile - nur fuer dieses Projekt",z);
 const d501=z.find(x=>String(x.v)==="501");
 p(!!d501&&d501.raus===10&&d501.zurueck===3&&d501.netto===7,
   "Abgang und Rueckgabe werden verrechnet: verbraucht ist die Differenz",d501);
 p(!z.some(x=>x.raus===99),"die Buchung eines ANDEREN Projekts zaehlt nicht mit",z);
 p(!z.some(x=>x.raus===5),"eine ausdruecklich der Werkstatt zugeordnete Buchung zaehlt nicht mit",z);
 p(!!d501&&d501.raus===10,
   "ziel='werkstatt' schlaegt die Marke im Grund - eine bewusst der Werkstatt zugeordnete Buchung "
   +"zaehlt auch dann nicht mit, wenn zufaellig eine Massaufnahme-Marke im Text steht",d501);
 p(z.some(x=>String(x.v)==="602"&&x.raus===7),
   "eine vor v3.123 aus einer Massaufnahme gebuchte Zeile wird ueber die Marke im Grund trotzdem gefunden",z);

 z=await page.evaluate(()=>{
  cockpitLagerZeilen=lagerZusammenfassung(lagerBuchungenFuerProjekt(11,[77]));
  renderCockpitLager();
  return {anzahl:$("cockpitLagerCount").textContent,
   text:$("cockpitLagerBody").innerText.replace(/\s+/g," "),
   druckAus:$("cockpitLagerDruck").disabled};
 });
 p(z.anzahl==="3","die Karte zeigt die Anzahl der Positionen",z);
 p(/Verbraucht/.test(z.text)&&/7/.test(z.text),"und fuer jede die verbrauchte Menge",z.text);
 p(z.druckAus===false,"der Druck-Knopf ist benutzbar, sobald es etwas zu drucken gibt",z);

 z=await page.evaluate(()=>{
  cockpitLagerZeilen=[];
  renderCockpitLager();
  return {text:$("cockpitLagerBody").innerText,druckAus:$("cockpitLagerDruck").disabled};
 });
 p(z.druckAus===true&&/noch nichts ab Lager/i.test(z.text),
   "ohne Buchungen sagt die Karte das und der Druck-Knopf ist gesperrt",z);

 // Das Druckdokument wird aus denselben Zeilen gebaut - geprueft wird das
 // Dokument selbst, nicht das Fenster (window.open geht im Pruefstand nicht).
 z=await page.evaluate(()=>{
  const zeilen=lagerZusammenfassung(lagerBuchungenFuerProjekt(11,[77]));
  const html=lagerZusammenfassungDokument(
   allProjects.find(x=>x.id===11),zeilen,"");
  return {html,zeilen:(html.match(/<tr>/g)||[]).length};
 });
 p(/Materialzusammenfassung/.test(z.html),"das Druckdokument traegt den Dokumenttyp im Kopf",z.html.slice(0,200));
 p(z.zeilen===4,"eine Kopfzeile und drei Positionszeilen",z.zeilen);
 p(/Verbraucht = ausgebucht/.test(z.html),
   "und es sagt ausdruecklich, was die Zahl bedeutet und was NICHT mitgezaehlt ist",z.html.slice(-300));


 // ---- 16 · Suche in der Lagerverwaltung (v3.124) -------------------------
 // 372 Materialpositionen im Produktivkatalog - Scrollen ist dort kein
 // Bedienweg mehr. Gesucht wird ueber BEIDE Ebenen: Position und Produkt.
 console.log("\n16 · Suche in der Lagerverwaltung");
 z=await page.evaluate(()=>{
  lagerSuche=""; lagerListeVersteckt=false;
  lagerVarianten=window.__lese.lager_varianten.slice();
  renderLagerverwaltung();
  const zaehle=()=>document.querySelectorAll("#lagerverwaltungListe .lager-karte").length;
  const suche=t=>{const f=$("lagerSuche");f.value=t;f.dispatchEvent(new Event("input",{bubbles:true}));return zaehle()};
  const alle=zaehle();
  return {alle,
   nachName:suche("Dichtband"),
   textNachName:$("lagerverwaltungListe").innerText,
   standNachName:$("lagerSucheStand").textContent,
   nachNr:suche("300.10"),
   nachProdukt:suche("87°"),
   nachBarcode:suche("4006381333931"),
   ohneTreffer:suche("gibtesnicht"),
   textOhne:$("lagerverwaltungListe").innerText,
   zuklappenVersteckt:$("lagerAlleZuklappen").hidden,
   zurueck:suche(""),
   zuklappenWieder:$("lagerAlleZuklappen").hidden};
 });
 p(z.alle>z.nachName&&z.nachName===1,"die Suche nach der Bezeichnung findet genau die eine Position",z);
 p(/Dichtband/.test(z.textNachName),"und zeigt sie auch an",z.textNachName);
 p(/1 von /.test(z.standNachName),"darueber steht, wie viele von wie vielen gefunden wurden",z.standNachName);
 p(z.nachNr===1,"die Suche nach der EDV-Nr. findet die Position",z);
 p(z.nachProdukt===1,"die Suche nach einer PRODUKTbezeichnung findet die Position darueber - nicht nur der Positionsname zaehlt",z);
 p(z.nachBarcode===1,"und die Suche nach dem Barcode findet sie ebenfalls - ein Rueckweg, wenn die Kamera streikt",z);
 p(z.ohneTreffer===0&&/Kein Treffer/.test(z.textOhne),
   "ohne Treffer steht das da, statt einer leeren Flaeche",z);
 p(z.zuklappenVersteckt===true,
   "waehrend einer Suche ist 'Alle zuklappen' ausgeblendet - die Trefferliste ist ja das Gesuchte",z);
 p(z.zurueck===z.alle&&z.zuklappenWieder===false,
   "eine geleerte Suche stellt die ganze Liste wieder her",z);

 // Die Suche schlaegt das Zuklappen - sonst waere ein Treffer unsichtbar.
 z=await page.evaluate(()=>{
  lagerListeVersteckt=true;
  const f=$("lagerSuche"); f.value="Dichtband";
  f.dispatchEvent(new Event("input",{bubbles:true}));
  const mitSuche=document.querySelectorAll("#lagerverwaltungListe .lager-karte").length;
  f.value=""; f.dispatchEvent(new Event("input",{bubbles:true}));
  const ohneSuche=document.querySelectorAll("#lagerverwaltungListe .lager-karte").length;
  lagerListeVersteckt=false; renderLagerverwaltung();
  return {mitSuche,ohneSuche};
 });
 p(z.mitSuche===1&&z.ohneSuche===0,
   "bei eingeklappter Liste zeigt eine Suche den Treffer trotzdem - ohne Suche bleibt sie eingeklappt",z);

 // ---- 16b · Produkte ausserhalb der Regiematerialliste -------------------
 // Statt eines zweiten Datenmodells entsteht eine richtige Katalogposition.
 console.log("\n16b · Neue Materialposition aus der Lagerverwaltung");
 z=await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:true};
  lagerNeuesProduktOeffnen(null,"");
  const sel=$("lagerNeuesProduktMaterial");
  return {werte:[...sel.options].map(o=>o.value),
   letzterText:sel.options[sel.options.length-1].textContent,
   blockVersteckt:$("lagerNeuePositionBlock").hidden,
   vorschlag:lagerNaechsteFreieEdvNr()};
 });
 p(z.werte[z.werte.length-1]==="__neu"&&/Neue Materialposition/.test(z.letzterText),
   "ganz unten in der Positionsauswahl steht 'Neue Materialposition anlegen'",z);
 p(z.blockVersteckt===true,"das Formular dafuer ist erst einmal zu",z);
 p(z.vorschlag==="999.01",
   "vorgeschlagen wird die erste freie Nummer aus dem eigenen Lager-Nummernkreis 999.xx",z.vorschlag);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktBezeichnung").value="Spezialschraube A2";
  const sel=$("lagerNeuesProduktMaterial");
  sel.value="__neu";
  sel.dispatchEvent(new Event("change",{bubbles:true}));
  return {offen:!$("lagerNeuePositionBlock").hidden,
   nr:$("lagerNeuePositionNr").value,
   name:$("lagerNeuePositionName").value,
   einheit:$("lagerNeuePositionEinheit").value};
 });
 p(z.offen===true,"die Wahl oeffnet das Formular",z);
 p(z.nr==="999.01","die EDV-Nr. ist vorgeschlagen, nicht leer",z);
 p(z.name==="Spezialschraube A2",
   "die Bezeichnung folgt der des Produkts - auf dem Handy tippt niemand dasselbe zweimal",z);
 p(z.einheit==="Stk.","und die Einheit hat einen brauchbaren Ausgangswert",z);

 // Eine bereits vergebene Nummer wird abgelehnt, statt einen Konflikt zu bauen.
 z=await page.evaluate(async()=>{
  $("lagerNeuePositionNr").value="205.30";
  window.__schreib=[];
  $("lagerNeuesProduktSpeichern").click();
  await new Promise(r=>setTimeout(r,60));
  return {geschrieben:window.__schreib.filter(x=>x.op==="insert").length,
   fehler:$("lagerNeuesProduktFehler").textContent};
 });
 p(z.geschrieben===0&&/205\.30/.test(z.fehler)&&/bereits/.test(z.fehler),
   "eine schon vergebene EDV-Nr. wird abgelehnt und die App nennt die Position, die sie traegt",z);

 // Der gute Fall: erst die Position, dann das Produkt daran.
 const neuePos=await page.evaluate(async()=>{
  $("lagerNeuePositionNr").value="999.01";
  $("lagerNeuePositionDim").value="4,5 × 35 mm";
  $("lagerNeuePositionPreis").value="0.35";
  $("lagerNeuesProduktBarcode").value="SCHR-A2-45";
  window.__schreib=[];
  const vorherMat=settings.materials.length;
  $("lagerNeuesProduktSpeichern").click();
  await new Promise(r=>setTimeout(r,80));
  const inserts=window.__schreib.filter(x=>x.op==="insert");
  return {
   reihenfolge:inserts.map(x=>x.t),
   // Die Attrappe reicht insert() als Array weiter - erste Zeile nehmen.
   material:((inserts.find(x=>x.t==="materials")||{}).d||[])[0],
   variante:((inserts.find(x=>x.t==="lager_varianten")||{}).d||[])[0],
   katalogGewachsen:settings.materials.length-vorherMat,
   idsGewachsen:materialIds.length,
   imKatalog:settings.materials.some(m=>m[0]==="999.01"),
   zu:$("lagerNeuesProduktModal").hidden};
 });
 p(JSON.stringify(neuePos.reihenfolge)===JSON.stringify(["materials","lager_varianten"]),
   "zuerst entsteht die Katalogposition, danach haengt das Produkt daran - zwei Schritte, EIN Datenmodell",neuePos.reihenfolge);
 p(!!neuePos.material&&neuePos.material.edv_nr==="999.01"
   &&neuePos.material.name==="Spezialschraube A2"&&neuePos.material.unit==="Stk.",
   "die Katalogposition wird mit den eingegebenen Angaben geschrieben",neuePos.material);
 p(neuePos.katalogGewachsen===1&&neuePos.imKatalog===true,
   "settings.materials wird sofort nachgezogen - sonst kaeme die neue Position erst nach dem naechsten Laden an",neuePos);
 p(!!neuePos.variante&&neuePos.variante.barcode==="SCHR-A2-45",
   "das Produkt haengt an der neuen Position und traegt seinen Barcode",neuePos.variante);
 p(neuePos.zu===true,"der Dialog schliesst danach",neuePos);

 // Ohne das Recht, den Katalog zu aendern, wird die Moeglichkeit gar nicht
 // erst angeboten - besser als eine Fehlermeldung aus der Datenbank.
 z=await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:false};
  lagerNeuesProduktOeffnen(null,"");
  const sel=$("lagerNeuesProduktMaterial");
  const da=[...sel.options].some(o=>o.value==="__neu");
  lagerNeuesProduktSchliessen();
  meineRechte={admin:false,kataloge:true};
  return {da};
 });
 p(z.da===false,
   "ohne das Recht, den Material-Katalog zu aendern, erscheint 'Neue Materialposition' gar nicht",z);

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
