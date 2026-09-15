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
     // v3.127: die Lesespur muss die Aenderung mitbekommen, sonst zeigt eine
     // spaetere Pruefung noch den alten Stand (archiviert bleibt sonst false).
     if(window.__lese&&window.__lese[t])
      window.__lese[t].forEach(z=>{if(z[f]===v)Object.assign(z,patch)});
     return Promise.resolve({error:null});
    };
    return g;
   },
   // v3.127: Loeschen gibt es erst, seit ein Produkt (und auf Nachfrage
   // seine Katalogposition) wirklich entfernt werden kann.
   delete:()=>{
    const g={};
    g.eq=(f,v)=>{
     window.__schreib.push({t,op:"delete",eq:[[f,v]]});
     if(window.__deleteFehler&&window.__deleteFehler[t])return Promise.resolve({error:{message:"kaputt"}});
     if(window.__lese&&window.__lese[t])
      window.__lese[t]=window.__lese[t].filter(z=>z[f]!==v);
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
   materialVorbelegt:lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.id):""
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
   materialVorbelegt:lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.id):""
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

 // v3.118 setzte hier ein Suchfeld VOR ein <select>. Der Filter lief bei
 // jedem Tastendruck, aber ein <select> zeigt seine Liste erst beim
 // Aufklappen - man tippte und sah nichts. In v3.125 wurde genau das im
 // Ausbuchen-Dialog behoben; dass hier dieselbe Konstruktion stand, wurde
 // dabei uebersehen und vom Anwender gemeldet. Seit v3.126 steht auch hier
 // eine Trefferliste.
 console.log("\n12b · Materialposition im Neues-Produkt-Formular suchen (v3.126)");
 const produktTreffer=()=>page.evaluate(()=>
  [...document.querySelectorAll('#lagerNeuesProduktTreffer [data-lager-produkt-artikel]')]
   .map(b=>b.textContent.trim()));
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(null,"");
  return {keinSelect:!document.getElementById("lagerNeuesProduktMaterial"),
   sichtbar:!$("lagerNeuesProduktTreffer").hidden};
 });
 p(z.keinSelect===true,
   "die Positionswahl ist kein Auswahlfeld mehr - ein <select> zeigt seine Treffer erst beim Aufklappen",z);
 let t=await produktTreffer();
 p(t.length===2,"ohne Suchbegriff stehen alle Positionen als Treffer da, nicht eine leere Flaeche",t);

 await page.evaluate(()=>{
  const f=$("lagerNeuesProduktMaterialSuche");
  f.value="Dichtband"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 t=await produktTreffer();
 p(t.length===1&&/Dichtband/.test(t[0]),
   "nach dem blossen Tippen - ohne jeden weiteren Klick - steht nur noch der passende Treffer da",t);

 await page.evaluate(()=>{
  const f=$("lagerNeuesProduktMaterialSuche");
  f.value="300"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 t=await produktTreffer();
 p(t.length===1&&/Rohrbogen/.test(t[0]),
   "die Suche wirkt auch auf die EDV-Nr. ('300' findet '300.10 Rohrbogen'), nicht nur auf die Bezeichnung",t);

 z=await page.evaluate(()=>{
  const f=$("lagerNeuesProduktMaterialSuche");
  f.value="gibtesnicht"; f.dispatchEvent(new Event("input",{bubbles:true}));
  return {text:$("lagerNeuesProduktTreffer").innerText,
   fokus:document.activeElement===f||document.body.contains(f)};
 });
 p(/Kein Treffer/.test(z.text),"ohne Treffer steht das da, statt einer leeren Flaeche",z);
 p(z.fokus===true,"das Suchfeld bleibt dabei stehen und verliert den Fokus nicht",z);

 // Antippen waehlt - danach steht die Position als Text da.
 z=await page.evaluate(()=>{
  const f=$("lagerNeuesProduktMaterialSuche");
  f.value="Dichtband"; f.dispatchEvent(new Event("input",{bubbles:true}));
  document.querySelector('#lagerNeuesProduktTreffer [data-lager-produkt-artikel]').click();
  return {gewaehlt:lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.id):"",
   text:$("lagerNeuesProduktGewaehlt").innerText,
   sucheDa:!$("lagerNeuesProduktMaterialSuche").hidden,
   sucheLeer:$("lagerNeuesProduktMaterialSuche").value==="",
   trefferZu:$("lagerNeuesProduktTreffer").hidden};
 });
 p(z.gewaehlt==="1"&&/Dichtband/.test(z.text),"ein Antippen des Treffers waehlt die Position",z);
 // v3.128: GEAENDERTER VERTRAG - bis v3.127 verschwand hier auch das
 // Suchfeld. Genau das hat der Anwender gemeldet: wer den Dialog mit
 // vorbelegter Position oeffnet, bekam es nie zu sehen. Siehe Abschnitt 19.
 p(z.sucheDa===true&&z.trefferZu===true&&z.sucheLeer===true,
   "danach steht die Position als Text da, die Trefferliste klappt zu - das Suchfeld bleibt aber stehen",z);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktGewaehlt").querySelector("[data-lager-produkt-aendern]").click();
  return {gewaehlt:lagerNeuesProduktArtikel,sucheDa:!$("lagerNeuesProduktMaterialSuche").hidden};
 });
 p(z.gewaehlt===null&&z.sucheDa===true,"und 'aendern' oeffnet die Suche wieder",z);

 // Eine vorbelegte Position (Weg "＋ Weiteres Produkt") steht direkt fest.
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(2,"");
  return {gewaehlt:lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.id):"",
   text:$("lagerNeuesProduktGewaehlt").innerText};
 });
 p(z.gewaehlt==="2"&&/Rohrbogen/.test(z.text),
   "wird das Formular aus einer Position heraus geoeffnet, steht sie ohne Suche fest",z);
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

 // v3.125: Die Treffer erscheinen SOFORT beim Tippen. Bis v3.124 stand hier
 // ein <select>: das Suchfeld filterte dessen Optionen zwar bei jedem
 // Zeichen, aber ein Auswahlfeld zeigt seine Liste erst beim Aufklappen -
 // der Anwender tippte und sah nichts. Genau so gemeldet.
 z=await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  const feld=document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]');
  const treffer=()=>[...document.querySelectorAll('[data-meas-lager-treffer="'+zeile.id+'"] [data-meas-lager-waehlen]')]
    .map(b=>b.textContent.trim());
  const vorher=treffer();
  feld.value="rinnenboden";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  return {vorher,nachher:treffer(),
   keinSelect:!document.querySelector('[data-meas-lager-position]'),
   fokusBleibt:document.activeElement===feld||document.body.contains(feld)};
 });
 p(z.keinSelect===true,
   "die Positionswahl ist kein Auswahlfeld mehr - ein <select> zeigt seine Treffer erst beim Aufklappen",z);
 p(z.vorher.length>0,
   "schon ohne Suchbegriff stehen Treffer da, statt einer leeren Flaeche",z.vorher);
 p(z.nachher.length>0&&z.nachher.length<=z.vorher.length&&z.nachher.every(t=>/Rinnenboden/i.test(t)),
   "nach dem blossen Tippen - ohne jeden weiteren Klick - stehen nur noch die passenden Treffer da",z);
 p(z.fokusBleibt===true,
   "das Suchfeld bleibt dabei stehen und verliert den Fokus nicht (nur die Trefferliste wird neu gezeichnet)",z);

 z=await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  const feld=document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]');
  feld.value="gibtesnicht";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  const box=document.querySelector('[data-meas-lager-treffer="'+zeile.id+'"]');
  return {text:box.innerText,knoepfe:box.querySelectorAll("[data-meas-lager-waehlen]").length};
 });
 p(z.knoepfe===0&&/Kein Treffer/.test(z.text),
   "ohne Treffer steht das da, statt einer leeren Flaeche",z);

 // Einen Treffer antippen waehlt die Position - und mit ihr die Produktliste.
 z=await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  const feld=document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]');
  feld.value="rinnenboden";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  const knopf=document.querySelector('[data-meas-lager-treffer="'+zeile.id+'"] [data-meas-lager-waehlen]');
  const text=knopf.textContent.trim();
  knopf.click();
  return {text,no:zeile.no,anzahlVarianten:zeile.varianten.length,varianteId:zeile.varianteId,
   suchfeldDa:!!document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]'),
   sucheLeer:(document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]')||{}).value==="",
   trefferZu:(document.querySelector('[data-meas-lager-treffer="'+zeile.id+'"]')||{}).hidden,
   aendernDa:!!document.querySelector('[data-meas-lager-position-aendern="'+zeile.id+'"]')};
 });
 p(z.no==="413.20","ein Antippen des Treffers waehlt die Position",z);
 p(z.anzahlVarianten===2&&z.varianteId==="",
   "mit der Position wechselt die Produktliste - bei zwei Produkten waehlt weiterhin der Anwender",z);
 // v3.128: GEAENDERTER VERTRAG. Bis v3.127 verschwand das Suchfeld hier
 // ("die Suche ist erledigt"). Der Anwender hat gemeldet, dass genau das im
 // Produkt-Dialog den Suchweg verstellt; dieselbe Konstruktion steht hier,
 // also gilt dieselbe Regel: das Feld bleibt, nur die Trefferliste klappt zu.
 p(z.suchfeldDa===true&&z.aendernDa===true,
   "danach steht die Position als Text da - das Suchfeld bleibt aber erreichbar, nicht nur der Aendern-Knopf",z);
 p(z.sucheLeer===true&&z.trefferZu===true,
   "die Suche ist geleert und die Trefferliste zu - sie steht nicht zwischen Position und Mengenfeld",z);

 // Und der Weg zurueck.
 z=await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  document.querySelector('[data-meas-lager-position-aendern="'+zeile.id+'"]').click();
  return {no:zeile.no,gewaehlt:zeile.gewaehlt,
   suchfeldDa:!!document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]'),
   sucheErhalten:(document.querySelector('[data-meas-lager-suche="'+zeile.id+'"]')||{}).value};
 });
 p(z.no===""&&z.gewaehlt===false&&z.suchfeldDa===true,
   "'Position aendern' hebt die Wahl auf und nimmt die Zeile aus der Buchung",z);
 // v3.128: GEAENDERTER VERTRAG. Bis v3.127 stand der Suchbegriff hier noch
 // im Feld, weil ihn nur dieser Knopf zuruecksetzte. Seit die WAHL ihn leert
 // (damit die Trefferliste nicht offen stehen bleibt), ist er auch hier leer.
 // Das kostet ein erneutes Tippen - dafuer ist das Feld jetzt jederzeit da,
 // statt nur ueber diesen Knopf.
 p(z.sucheErhalten==="",
   "das Feld ist dabei leer - geleert wurde es schon bei der Wahl",z);

 // Danach wieder waehlen, damit die folgende Buchung dieselbe bleibt.
 await page.evaluate(()=>{
  const zeile=measLagerZeilen.find(x=>/Rinnenboden links/.test(x.bezeichnung));
  measLagerPositionSetzen(zeile,zeile.positionen.find(a=>a.edv_nr==="413.20"));
  renderMeasLagerListe();
 });

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
  const knopf=$("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]");
  return {neuDa:!!knopf,neuText:knopf?knopf.textContent:"",
   blockVersteckt:$("lagerNeuePositionBlock").hidden,
   vorschlag:lagerNaechsteFreieEdvNr()};
 });
 p(z.neuDa===true&&/Neue Materialposition/.test(z.neuText),
   "unter den Treffern steht 'Neue Materialposition anlegen'",z);
 p(z.blockVersteckt===true,"das Formular dafuer ist erst einmal zu",z);
 p(z.vorschlag==="999.01",
   "vorgeschlagen wird die erste freie Nummer aus dem eigenen Lager-Nummernkreis 999.xx",z.vorschlag);

 z=await page.evaluate(()=>{
  $("lagerNeuesProduktBezeichnung").value="Spezialschraube A2";
  $("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]").click();
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
  const da=!!$("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]");
  lagerNeuesProduktSchliessen();
  meineRechte={admin:false,kataloge:true};
  return {da};
 });
 p(z.da===false,
   "ohne das Recht, den Material-Katalog zu aendern, erscheint 'Neue Materialposition' gar nicht",z);


 // ---- 17 · EDV-Nr. aus der passenden Katalogruppe (v3.126) ---------------
 // Der Katalog ist fachlich nach Nummerngruppen geordnet. Ein neues
 // Rinnenzubehoer-Produkt gehoert deshalb nicht in den Lager-Kreis 999,
 // sondern zu 203 - dort stehen Rinnenwinkel, Rinnenboden, Stutzen, Seiher.
 // Geprueft wird gegen einen AUSSCHNITT DES ECHTEN Produktivkatalogs, nicht
 // gegen erfundene Namen: sonst belegte der Pruefstand nur sich selbst.
 console.log("\n17 · EDV-Nr. wird aus der passenden Katalogruppe vorgeschlagen");
 await page.evaluate(()=>{
  settings.materials=[
   ["201.01","Dachrinnen halbrund Kupfer","250","m1",0],
   ["201.11","Dachrinnen halbrund Titanzink","250","m1",0],
   ["202.01","Rinnenhalter Kupfer","250","St",0],
   ["202.11","Rinnenhalter Titanzink","250","St",0],
   // Gruppe 203 VOLLSTAENDIG wie im Produktivkatalog (beide Dimensionen je
   // Position). Mit einem verkleinerten Ausschnitt waere die Gruppe zu
   // schwach, um die Gewichtung der Teiltreffer ueberhaupt auf die Probe zu
   // stellen - die Gegenprobe schlug dann nicht an.
   ["203.01","Rinnenwinkel, alle Materialien","250","St",0],
   ["203.02","Rinnenwinkel, alle Materialien","330","St",0],
   ["203.11","Gehrschildwinkel, alle Materialien","250","St",0],
   ["203.12","Gehrschildwinkel, alle Materialien","330","St",0],
   ["203.21","Rinnenboden gerade, alle Materialien","250","St",0],
   ["203.22","Rinnenboden gerade, alle Materialien","330","St",0],
   ["203.31","Rinnen-Dehnungselement alle Materialien","250","St",0],
   ["203.32","Rinnen-Dehnungselement alle Materialien","330","St",0],
   ["203.41","Einhängestutzen gerade, alle Materialien","250","St",0],
   ["203.42","Einhängestutzen gerade, alle Materialien","330","St",0],
   ["203.51","Rinnenseiher, alle Materialien","bis 120","St",0],
   ["203.61","Rinnenkasten, alle Materialien","bis 100","St",0],
   ["251.01","Ablaufrohre rund Kupfer","bis 75","m1",0],
   ["252.21","Rohrbogen 70-85° alle Materialien","bis 75","St",0],
   ["259.01","Rohrbogen PVC 15-45°","bis 125","St",0],
   ["261.01","Lüftungs-Rohrbogen Safe 90°","bis 100","St",0],
   ["811.01","Dichtungsmasse Neutralsilikon","350ml","Kart.",0],
   ["826.21","Holzschrauben Spax bis","5x50","St",0],
   ["851.01","Trennscheibe","D 115","St",0]
  ];
  materialIds=settings.materials.map((m,i)=>2001+i);
 });

 z=await page.evaluate(()=>{
  const f=b=>{const v=lagerNummernVorschlag(b);
   return {art:v.art,gruppe:v.gruppe||null,nummer:v.nummer,
     bester:v.bester?v.bester.name:null,kandidaten:(v.kandidaten||[]).map(k=>k.gruppe)};};
  return {
   boden:f("Rinnenboden links 333"),
   halter:f("Rinnenhalter 333 verzinkt"),
   stutzen:f("Einhängestutzen 100 Kupfer"),
   seiher:f("Rinnenseiher 120 Kupfer"),
   rinne:f("Dachrinne halbrund 333 Titanzink"),
   schraube:f("Holzschraube Spax 6x100"),
   bogen:f("Rohrbogen 87 Grad 100"),
   fremd:f("Kaffeemaschine für die Werkstatt")
  };
 });
 p(z.boden.gruppe==="203"&&z.boden.nummer==="203.62",
   "Rinnenboden landet bei 203 (Rinnenzubehör) - genau der gemeldete Fall",z.boden);
 p(z.boden.art==="gruppe"&&/Rinnenboden/.test(z.boden.bester||""),
   "und die App nennt die Katalogzeile, auf die sie sich stützt",z.boden);
 p(z.stutzen.gruppe==="203"&&z.seiher.gruppe==="203",
   "Einhängestutzen und Rinnenseiher ebenfalls - nicht nur der wörtliche Treffer",z);
 p(z.halter.gruppe==="202",
   "der Rinnenhalter kommt zu den Rinnenhaltern (202), nicht zum übrigen Rinnenzubehör",z.halter);
 // Der scharfe Fall fuer die anteilige Gewichtung: "Rinnen-Dehnungselement"
 // zerfaellt in "rinnen" + "dehnungselement", und "rinnen" steckt in
 // "rinnenhalter". Mit einem FLACHEN Gewicht fuer Teiltreffer wuerde 203
 // dadurch mithalten und 202 den Vorsprung verlieren - genau so am echten
 // Katalog gemessen.
 p(z.halter.art==="gruppe",
   "und zwar EINDEUTIG - ein blosser Wortteil („rinnen“ in „Rinnen-Dehnungselement“) "
   +"zaehlt weniger als das ganze Wort, sonst gaebe es hier keinen Vorsprung",z.halter);
 p(z.rinne.gruppe==="201",
   "die Dachrinne selbst zu den Dachrinnen (201)",z.rinne);
 p(z.schraube.gruppe==="826","eine Holzschraube zu den Schrauben (826)",z.schraube);

 p(z.bogen.art==="unklar"&&z.bogen.nummer.indexOf("999.")===0,
   "„Rohrbogen“ steht in 252, 259 UND 261 - dort behauptet die App nichts und nimmt den eigenen Bereich",z.bogen);
 p(z.bogen.kandidaten.length>=2&&z.bogen.kandidaten.indexOf("252")>=0,
   "sie legt die Kandidaten aber offen, damit der Anwender selbst wählen kann",z.bogen);
 p(z.fremd.art==="eigen"&&z.fremd.nummer.indexOf("999.")===0,
   "was gar nicht in den Katalog passt, bekommt weiterhin eine Nummer aus dem Lager-Bereich",z.fremd);

 // Die naechste freie Nummer wird INNERHALB der Gruppe gesucht.
 z=await page.evaluate(()=>({
  inGruppe:lagerNaechsteFreieEdvNr("203"),
  eigen:lagerNaechsteFreieEdvNr(null),
  leereGruppe:lagerNaechsteFreieEdvNr("777")
 }));
 p(z.inGruppe==="203.62","die naechste freie Nummer wird INNERHALB der Gruppe gesucht (203.61 ist belegt)",z);
 p(z.eigen==="999.01","ohne Gruppe bleibt es beim eigenen Lager-Bereich",z);
 p(z.leereGruppe==="777.01","eine noch leere Gruppe beginnt bei .01",z);

 // Und die Bedienung: der Vorschlag steht im Feld, begruendet, und die
 // Eingabe des Anwenders wird nicht ueberschrieben.
 z=await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:true};
  lagerNeuesProduktOeffnen(null,"");
  $("lagerNeuesProduktBezeichnung").value="Rinnenboden rechts 333";
  $("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]").click();
  const nachOeffnen={nr:$("lagerNeuePositionNr").value,
    hinweis:$("lagerNeuePositionHinweis").innerText.replace(/\s+/g," ")};
  // Bezeichnung aendern -> Vorschlag folgt
  const name=$("lagerNeuePositionName");
  name.value="Holzschraube Spax 8x120";
  name.dispatchEvent(new Event("input",{bubbles:true}));
  const nachAendern=$("lagerNeuePositionNr").value;
  // Von Hand eintippen -> Vorschlag haelt sich raus
  const nr=$("lagerNeuePositionNr");
  nr.value="1.000.00"; nr.dispatchEvent(new Event("input",{bubbles:true}));
  name.value="Rinnenboden links";
  name.dispatchEvent(new Event("input",{bubbles:true}));
  return {nachOeffnen,nachAendern,vonHand:$("lagerNeuePositionNr").value};
 });
 p(z.nachOeffnen.nr==="203.62","beim Oeffnen steht die vorgeschlagene Nummer im Feld",z.nachOeffnen);
 p(/Gruppe 203/.test(z.nachOeffnen.hinweis)&&/Rinnenboden/.test(z.nachOeffnen.hinweis),
   "darunter steht, WARUM - mit der Katalogzeile, auf die sich die App stuetzt",z.nachOeffnen.hinweis);
 p(z.nachAendern==="826.22","aendert sich die Bezeichnung, folgt der Vorschlag",z);
 p(z.vonHand==="1.000.00",
   "eine von Hand eingetippte Nummer wird NICHT mehr ueberschrieben - der Vorschlag haelt sich dann raus",z);

 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(null,"");
  $("lagerNeuesProduktBezeichnung").value="Rohrbogen 87 Grad";
  $("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]").click();
  const knoepfe=[...$("lagerNeuePositionHinweis").querySelectorAll("[data-lager-gruppe]")]
    .map(b=>b.dataset.lagerGruppe);
  const vorher=$("lagerNeuePositionNr").value;
  const k=$("lagerNeuePositionHinweis").querySelector('[data-lager-gruppe="252"]');
  if(k)k.click();
  const nachher=$("lagerNeuePositionNr").value;
  // Danach darf die Bezeichnung die bewusste Wahl nicht mehr umwerfen.
  $("lagerNeuePositionName").value="Rohrbogen PVC";
  $("lagerNeuePositionName").dispatchEvent(new Event("input",{bubbles:true}));
  const nachTippen=$("lagerNeuePositionNr").value;
  lagerNeuesProduktSchliessen();
  return {knoepfe,vorher,nachher,nachTippen};
 });
 p(z.knoepfe.indexOf("252")>=0&&z.knoepfe.indexOf("999")>=0,
   "bei mehreren passenden Gruppen stehen sie als Knoepfe da, samt dem eigenen Lager-Bereich",z.knoepfe);
 p(z.vorher.indexOf("999.")===0&&z.nachher==="252.22",
   "ein Klick auf eine Gruppe uebernimmt deren naechste freie Nummer",z);
 p(z.nachTippen==="252.22",
   "eine bewusst gewaehlte Gruppe wird durch Weitertippen nicht wieder umgeworfen",z);


 // ---- 18 · Produkt loeschen / archivieren / wieder aktivieren (v3.127) ---
 // Die Regel folgt der Unveraenderlichkeit der Buchungen: ohne Buchung wird
 // wirklich geloescht, mit Buchungen wird ARCHIVIERT. Der Fremdschluessel
 // lagerbestand_bewegungen.variante_id steht auf NO ACTION - die Datenbank
 // wuerde ein Loeschen ohnehin abweisen. Wichtiger ist der fachliche Grund:
 // eine Buchung ist ein Beleg, kein Entwurf.
 console.log("\n18 · Produkte loeschen, archivieren, wieder aktivieren");
 await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:true};
  settings.materials=[
   ["301.01","Rinnenboden Kupfer","250","St",0],
   ["301.02","Rinnenboden Titanzink","250","St",0]
  ];
  materialIds=[3001,3002];
  window.__lese.materials=[{id:3001},{id:3002}];
  window.__lese.lager_varianten=[
   // 3001: zwei Produkte - eines gebucht, eines unberuehrt.
   {id:"v-gebucht",material_id:3001,bezeichnung:"Boden Kupfer gebucht",barcode:"111",archiviert:false},
   {id:"v-frei",material_id:3001,bezeichnung:"Boden Kupfer unberuehrt",barcode:"222",archiviert:false},
   // 3002: das EINZIGE Produkt seiner Position, ohne Buchung.
   {id:"v-einzeln",material_id:3002,bezeichnung:"Boden Titanzink einzeln",barcode:"333",archiviert:false}
  ];
  window.__lese.lagerbestand_bewegungen=[
   {id:"b1",variante_id:"v-gebucht",art:"zugang",menge:10,grund:"Einkauf",created_at:"2026-09-01T08:00:00Z"}
  ];
  lagerVarianten=window.__lese.lager_varianten.slice();
  lagerBewegungen=window.__lese.lagerbestand_bewegungen.slice();
  lagerSuche=""; lagerListeVersteckt=false; lagerArchivZeigen=false;
  renderLagerverwaltung();
 });

 // Welcher Knopf angeboten wird, haengt allein an den Buchungen.
 z=await page.evaluate(()=>{
  // Bei zwei Produkten je Position ist der Positionskopf eine eigene
  // Klappebene ("m"+material_id) - beide muessen offen sein, sonst steht
  // die Produktkarte gar nicht im DOM.
  const knopf=id=>{
   lagerOffenArtikel.add("m3001"); lagerOffenArtikel.add("m3002");
   lagerOffenArtikel.add(String(id)); renderLagerverwaltung();
   const el=document.querySelector('#lagerverwaltungListe [data-lager-loeschen="'+id+'"]')
     ||document.querySelector('#lagerverwaltungListe [data-lager-archivieren="'+id+'"]')
     ||document.querySelector('#lagerverwaltungListe [data-lager-aktivieren="'+id+'"]');
   return el?{art:el.dataset.lagerLoeschen?"loeschen":(el.dataset.lagerArchivieren?"archivieren":"aktivieren"),
     text:el.textContent}:null;
  };
  return {gebucht:knopf("v-gebucht"),frei:knopf("v-frei")};
 });
 p(z.gebucht&&z.gebucht.art==="archivieren",
   "ein Produkt MIT Buchungen bekommt 'Archivieren' - nicht 'Loeschen'",z.gebucht);
 p(z.frei&&z.frei.art==="loeschen",
   "ein Produkt OHNE jede Buchung bekommt 'Loeschen' - da ist nichts zu verlieren",z.frei);

 // Gegenprobe zur Regel selbst: waere die Buchung weg, kippte der Knopf.
 z=await page.evaluate(async()=>{
  const gesichert=lagerBewegungen.slice();
  lagerBewegungen=[];
  lagerOffenArtikel.add("m3001"); lagerOffenArtikel.add("v-gebucht");
  renderLagerverwaltung();
  const jetzt=!!document.querySelector('#lagerverwaltungListe [data-lager-loeschen="v-gebucht"]');
  lagerBewegungen=gesichert; renderLagerverwaltung();
  return {jetzt};
 });
 p(z.jetzt===true,
   "Gegenprobe: ohne die Buchung waere DASSELBE Produkt loeschbar - der Knopf haengt wirklich an den Buchungen, nicht am Zufall",z);

 // Loeschen trotz Buchungen wird abgefangen, bevor die Datenbank es tut.
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const alt=window.confirm; window.confirm=()=>true;
  const gesagt=[]; const altA=window.alert; window.alert=t=>gesagt.push(String(t));
  await lagerProduktLoeschen("v-gebucht");
  window.confirm=alt; window.alert=altA;
  return {gesagt,schreib:window.__schreib.slice(),
   nochDa:lagerVarianten.some(v=>String(v.id)==="v-gebucht")};
 });
 p(z.schreib.length===0,
   "ein gebuchtes Produkt wird auch bei direktem Aufruf NICHT geloescht - es geht gar kein Schreibbefehl raus",z.schreib);
 p(z.nochDa===true&&z.gesagt.length===1&&/archivieren/i.test(z.gesagt[0]),
   "stattdessen erklaert die App den Weg ueber das Archiv, statt die Datenbank mit einem Fremdschluessel-Fehler antworten zu lassen",z.gesagt);

 // Archivieren: die Buchungen bleiben, das Produkt verschwindet aus der Liste.
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const alt=window.confirm; window.confirm=()=>true;
  await lagerProduktArchivSetzen("v-gebucht",true);
  window.confirm=alt;
  const up=window.__schreib.find(x=>x.op==="update"&&x.t==="lager_varianten");
  const del=window.__schreib.find(x=>x.op==="delete");
  return {patch:up?up.patch:null,eq:up?up.eq:null,gabDelete:!!del,
   buchungenNoch:lagerBewegungenVon("v-gebucht").length,
   sichtbar:!!document.querySelector('#lagerverwaltungListe [data-lager-buchen="v-gebucht"]'),
   inAuswahl:lagerVariantenVonMaterial(3001).map(v=>String(v.id)),
   mitArchiv:lagerVariantenVonMaterialAlle(3001).map(v=>String(v.id))};
 });
 p(z.patch&&z.patch.archiviert===true&&z.eq[0][0]==="id"&&z.eq[0][1]==="v-gebucht",
   "Archivieren setzt archiviert=true auf genau diesem Produkt",z);
 p(z.gabDelete===false&&z.buchungenNoch===1,
   "und loescht nichts - die Buchung bleibt als Beleg stehen",z);
 p(z.sichtbar===false,"das archivierte Produkt ist nicht mehr bebuchbar",z);
 p(z.inAuswahl.indexOf("v-gebucht")<0&&z.mitArchiv.indexOf("v-gebucht")>=0,
   "es faellt aus lagerVariantenVonMaterial() heraus (die Quelle aller Auswahlwege) und steht nur noch in ...Alle()",z);

 // Der Archiv-Knopf zeigt nur auf etwas, das es auch gibt.
 z=await page.evaluate(()=>{
  lagerOffenArtikel.add("m3001"); lagerOffenArtikel.add("v-gebucht");
  renderLagerverwaltung();
  const a={versteckt:$("lagerArchivZeigen").hidden,text:$("lagerArchivZeigen").textContent};
  const ohneArchiv=[...document.querySelectorAll("#lagerverwaltungListe .lager-archiviert")].length;
  $("lagerArchivZeigen").click();
  const mitArchiv=[...document.querySelectorAll("#lagerverwaltungListe .lager-archiviert")].length;
  const text2=$("lagerArchivZeigen").textContent;
  return {a,ohneArchiv,mitArchiv,text2};
 });
 p(z.a.versteckt===false&&/\(1\)/.test(z.a.text),
   "sobald etwas im Archiv liegt, erscheint 'Archiv anzeigen' mit der Anzahl",z.a);
 p(z.ohneArchiv===0&&z.mitArchiv===1&&/ausblenden/.test(z.text2),
   "erst ein Klick zeigt das archivierte Produkt - abgesetzt markiert, nicht mitten in der Liste",z);

 // Eine Position mit GENAU EINEM Produkt wird flach gezeichnet, nicht als
 // Gruppe - ein zweiter Codeweg, der dieselbe Regel einhalten muss. Genau
 // hier fehlte die Markierung zuerst: die flache Karte zeigte noch "Buchen".
 z=await page.evaluate(()=>{
  lagerArchivZeigen=true;
  // Der Zustand der uebrigen Pruefungen wird dafuer nur geliehen, nicht
  // ueberschrieben - danach steht er wieder genau so da wie vorher.
  const gesichert=lagerVarianten.slice();
  const gesichertLese=window.__lese.lager_varianten.slice();
  lagerVarianten=[
   {id:"v-flach",material_id:3002,bezeichnung:"Einziges Produkt",barcode:"444",archiviert:true}
  ];
  renderLagerverwaltung();
  const karte=document.querySelector("#lagerverwaltungListe .lager-karte.lager-archiviert");
  const r={karteDa:!!karte,
   buchbar:!!document.querySelector('#lagerverwaltungListe [data-lager-buchen="v-flach"]'),
   marke:!!(karte&&karte.querySelector(".lager-archiviert-marke"))};
  lagerVarianten=gesichert; window.__lese.lager_varianten=gesichertLese;
  renderLagerverwaltung();
  return r;
 });
 p(z.karteDa===true&&z.marke===true,
   "auch die flache Karte (Position mit genau einem Produkt) ist als archiviert markiert",z);
 p(z.buchbar===false,
   "und zeigt keinen Buchen-Knopf - die Regel gilt auf BEIDEN Zeichenwegen, nicht nur im Gruppenfall",z);

 // Wieder aktivieren - der Rueckweg muss es geben, sonst waere Archivieren
 // eine Einbahnstrasse.
 z=await page.evaluate(async()=>{
  lagerOffenArtikel.add("m3001"); lagerOffenArtikel.add("v-gebucht");
  renderLagerverwaltung();
  const knopf=document.querySelector('#lagerverwaltungListe [data-lager-aktivieren="v-gebucht"]');
  window.__schreib=[];
  const alt=window.confirm; window.confirm=()=>true;
  if(knopf)knopf.click();
  await new Promise(r=>setTimeout(r,60));
  window.confirm=alt;
  const up=window.__schreib.find(x=>x.op==="update"&&x.t==="lager_varianten");
  return {knopfDa:!!knopf,patch:up?up.patch:null,
   wiederBuchbar:!!document.querySelector('#lagerverwaltungListe [data-lager-buchen="v-gebucht"]')};
 });
 p(z.knopfDa===true&&z.patch&&z.patch.archiviert===false,
   "am archivierten Produkt steht 'Wieder aktivieren' und es setzt archiviert zurueck",z);
 p(z.wiederBuchbar===true,"danach ist es sofort wieder bebuchbar",z);

 // Loeschen ohne Buchungen: die Zeile verschwindet wirklich. Die Position
 // hat danach noch ein zweites Produkt - es darf also NICHT nach der
 // Katalogposition gefragt werden.
 z=await page.evaluate(async()=>{
  lagerArchivZeigen=false;
  window.__schreib=[];
  const gefragt=[]; const alt=window.confirm;
  window.confirm=t=>{gefragt.push(String(t));return true};
  await lagerProduktLoeschen("v-frei");
  window.confirm=alt;
  const del=window.__schreib.find(x=>x.op==="delete"&&x.t==="lager_varianten");
  return {del:del?del.eq:null,gefragt,
   wegAusState:!lagerVarianten.some(v=>String(v.id)==="v-frei"),
   materialGeloescht:window.__schreib.some(x=>x.op==="delete"&&x.t==="materials"),
   positionNoch:settings.materials.length};
 });
 p(z.del&&z.del[0][0]==="id"&&z.del[0][1]==="v-frei"&&z.wegAusState===true,
   "ein Produkt ohne Buchung wird wirklich geloescht und ist danach aus der Liste",z);
 p(z.gefragt.length===1,
   "gefragt wird genau einmal - nach dem Produkt, nicht nach der Katalogposition: die hat ja noch ein zweites Produkt",z.gefragt);
 p(z.materialGeloescht===false&&z.positionNoch===2,
   "der Material-Katalog bleibt dabei unangetastet",z);

 // War es das LETZTE Produkt der Position, wird zusaetzlich nach der
 // Katalogposition gefragt - mit ausdruecklicher Warnung, so vom Anwender
 // entschieden.
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const gefragt=[]; const alt=window.confirm;
  window.confirm=t=>{gefragt.push(String(t));return true};
  await lagerProduktLoeschen("v-einzeln");
  window.confirm=alt;
  return {gefragt,
   materialDel:window.__schreib.find(x=>x.op==="delete"&&x.t==="materials"),
   positionen:settings.materials.map(m=>m[0]),ids:materialIds.slice()};
 });
 p(z.gefragt.length===2&&/MATERIAL-KATALOG/.test(z.gefragt[1]),
   "war es das letzte Produkt seiner Position, fragt die App zusaetzlich nach der Katalogposition",z.gefragt);
 p(/Regierapport/.test(z.gefragt[1])&&/Offerten/.test(z.gefragt[1]),
   "und nennt dabei ausdruecklich, was sonst noch am Katalog haengt",z.gefragt[1]);
 p(z.materialDel&&z.materialDel.eq[0][1]===3002,
   "erst nach dem Ja wird die Position wirklich entfernt",z);
 p(z.positionen.length===1&&z.positionen[0]==="301.01"&&z.ids.length===1&&z.ids[0]===3001,
   "settings.materials und materialIds werden zeilenweise nachgezogen - nicht als Ganzes zurueckgeschrieben",z);

 // Gegenprobe: ein Nein laesst die Position stehen.
 z=await page.evaluate(async()=>{
  settings.materials=[["302.01","Testposition","x","St",0]];
  materialIds=[3003];
  window.__lese.materials=[{id:3003}];
  window.__schreib=[];
  const alt=window.confirm; window.confirm=()=>false;
  await lagerPositionAufraeumenAnbieten(3003);
  window.confirm=alt;
  return {schreib:window.__schreib.slice(),noch:settings.materials.length};
 });
 p(z.schreib.length===0&&z.noch===1,
   "Gegenprobe: wer die Nachfrage verneint, behaelt die Position - ohne Produkt",z);

 // Der Blech-Materialbestand zeigt mit artikel_id auf die Position, der
 // Fremdschluessel steht dort auf SET NULL: der Eintrag bleibt, verliert aber
 // seine Zuordnung. Das muss in der Warnung stehen, nicht erst auffallen.
 z=await page.evaluate(async()=>{
  // lagerbestand ist eine lexikalische Bindung in js/59 - window.lagerbestand
  // waere eine zweite, davon unabhaengige Eigenschaft.
  lagerbestand=[{id:1,artikel_id:3003,material_id:null},
                {id:2,artikel_id:9999,material_id:null}];
  let gefragt=""; const alt=window.confirm;
  window.confirm=t=>{gefragt=String(t);return false};
  await lagerPositionAufraeumenAnbieten(3003);
  window.confirm=alt;
  let ohne=""; const alt2=window.confirm;
  lagerbestand=[{id:2,artikel_id:9999,material_id:null}];
  window.confirm=t=>{ohne=String(t);return false};
  await lagerPositionAufraeumenAnbieten(3003);
  window.confirm=alt2;
  return {gefragt,ohne};
 });
 p(/1 Eintrag/.test(z.gefragt)&&/Blech-Materialbestand/.test(z.gefragt),
   "zeigt der Blech-Materialbestand auf die Position, nennt die Warnung die betroffene Anzahl",z.gefragt);
 p(/Restst/.test(z.gefragt),
   "und die Reststuecke werden benannt - sie sind hier nicht geladen, also wird keine Zahl behauptet",z.gefragt);
 p(!/Blech-Materialbestand/.test(z.ohne),
   "Gegenprobe: zeigt nichts darauf, steht die Zeile auch nicht da - gezaehlt wird wirklich, nicht pauschal gewarnt",z.ohne);

 // Ohne das Recht am Material-Katalog kommt die Nachfrage gar nicht.
 z=await page.evaluate(async()=>{
  meineRechte={admin:false,kataloge:false};
  window.__schreib=[];
  const gefragt=[]; const alt=window.confirm;
  window.confirm=t=>{gefragt.push(String(t));return true};
  await lagerPositionAufraeumenAnbieten(3003);
  window.confirm=alt;
  meineRechte={admin:false,kataloge:true};
  return {gefragt,schreib:window.__schreib.slice()};
 });
 p(z.gefragt.length===0&&z.schreib.length===0,
   "ohne das Recht, den Material-Katalog zu aendern, wird gar nicht erst gefragt",z);

 // Der Knopf, den es bis v3.127 nicht gab, obwohl die Hilfe ihn nannte.
 z=await page.evaluate(()=>{
  const k=$("lagerNeuesProduktStart");
  if(!k)return {da:false};
  settings.materials=[["301.01","Rinnenboden Kupfer","250","St",0]];
  materialIds=[3001];
  k.click();
  const offen=!$("lagerNeuesProduktModal").hidden;
  const r={da:true,text:k.textContent,offen,
   artikel:typeof lagerNeuesProduktArtikel==="undefined"?"?":lagerNeuesProduktArtikel,
   barcode:$("lagerNeuesProduktBarcode").value};
  lagerNeuesProduktSchliessen();
  return r;
 });
 p(z.da===true&&/Neues Produkt/.test(z.text||""),
   "in der Leiste der Lagerverwaltung steht '+ Neues Produkt' - der Einstieg, den der Hilfetext seit v3.124 nannte, ohne dass es ihn gab",z);
 p(z.offen===true&&z.artikel===null&&z.barcode==="",
   "er oeffnet den Dialog ohne Position und ohne Barcode - beides wird dort gewaehlt",z);

 // Der Barcode klebt weiter auf der Ware: ein Scan findet das archivierte
 // Produkt. Weder stumm buchen noch stumm ablehnen.
 z=await page.evaluate(async()=>{
  window.__lese.lager_varianten=[
   {id:"v-arch",material_id:3001,bezeichnung:"Archivierter Boden",barcode:"999",archiviert:true}
  ];
  lagerVarianten=window.__lese.lager_varianten.slice();
  lagerBuchenSchliessen();
  window.barcodeScannen=cb=>cb("999");
  const alt=window.confirm; let gefragt="";
  window.confirm=t=>{gefragt=String(t);return false};
  lagerScannenUndBuchen("abgang");
  await new Promise(r=>setTimeout(r,60));
  window.confirm=alt;
  return {gefragt,hinweis:$("lagerverwaltungHinweis").textContent,
   dialogOffen:!$("lagerBuchenModal").hidden};
 });
 p(/archiviert/.test(z.gefragt)&&/wieder aktiviert/.test(z.gefragt),
   "ein Scan auf ein archiviertes Produkt nennt den Zustand und bietet das Wieder-Aktivieren an",z);
 p(z.dialogOffen===false&&/archiviert/.test(z.hinweis),
   "wer ablehnt, bucht nicht - und erfaehrt warum, statt vor einer stummen Oberflaeche zu stehen",z);


 // ---- 19 · Suchfeld bleibt stehen, auch bei gewaehlter Position (v3.128) --
 // Gemeldet: "Auch in der Karte neues Produkt erfassen muss nach Positionen
 // gesucht werden koennen". Ursache war nicht die Suche selbst (die gibt es
 // seit v3.126), sondern dass das Feld verschwand, sobald eine Position
 // gewaehlt war - und ueber "＋ Weiteres Produkt zu dieser Position" ist sie
 // von Anfang an vorbelegt. Man bekam das Suchfeld also nie zu Gesicht.
 console.log("\n19 · Position suchen, auch wenn schon eine gewaehlt ist");
 await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:true};
  settings.materials=[
   ["401.01","Dachrinne Kupfer","250","m1",0],
   ["402.01","Rinnenhalter Kupfer","250","St",0],
   ["403.01","Rinnenboden Kupfer","250","St",0]
  ];
  materialIds=[4001,4002,4003];
 });

 // Der gemeldete Weg: Dialog MIT vorbelegter Position.
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(4001,"");
  const s=$("lagerNeuesProduktMaterialSuche");
  return {sichtbar:!s.hidden,platzhalter:s.placeholder,
   trefferZu:$("lagerNeuesProduktTreffer").hidden,
   gewaehlt:$("lagerNeuesProduktGewaehlt").innerText};
 });
 p(z.sichtbar===true,
   "auch mit vorbelegter Position steht das Suchfeld da - genau der gemeldete Fall",z);
 p(/Andere Position/.test(z.platzhalter),
   "der Platzhalter sagt, wozu es hier dient",z.platzhalter);
 p(z.trefferZu===true&&/401\.01/.test(z.gewaehlt),
   "die Trefferliste bleibt zu, solange nichts getippt ist - die gewaehlte Position steht oben",z);

 // Tippen oeffnet die Treffer, ein Klick wechselt die Position.
 z=await page.evaluate(()=>{
  const s=$("lagerNeuesProduktMaterialSuche");
  s.value="Rinnenboden";
  s.dispatchEvent(new Event("input",{bubbles:true}));
  const offen=!$("lagerNeuesProduktTreffer").hidden;
  const knoepfe=[...$("lagerNeuesProduktTreffer").querySelectorAll("[data-lager-produkt-artikel]")]
    .map(b=>b.textContent);
  const k=$("lagerNeuesProduktTreffer").querySelector('[data-lager-produkt-artikel="4003"]');
  if(k)k.click();
  return {offen,knoepfe,
   jetzt:$("lagerNeuesProduktGewaehlt").innerText,
   sucheLeer:$("lagerNeuesProduktMaterialSuche").value==="",
   wiederZu:$("lagerNeuesProduktTreffer").hidden};
 });
 p(z.offen===true&&z.knoepfe.length===1&&/403\.01/.test(z.knoepfe[0]),
   "Tippen oeffnet die Treffer und filtert sie - ohne Umweg ueber „ändern“",z);
 p(/403\.01/.test(z.jetzt),"ein Klick wechselt die Position wirklich",z);
 p(z.sucheLeer===true&&z.wiederZu===true,
   "nach der Wahl ist die Suche geleert und die Liste wieder zu - sie steht nicht dauerhaft im Weg",z);

 // Gegenprobe: ohne Vorbelegung war und bleibt alles offen.
 z=await page.evaluate(()=>{
  lagerNeuesProduktOeffnen(null,"");
  const s=$("lagerNeuesProduktMaterialSuche");
  const r={sichtbar:!s.hidden,platzhalter:s.placeholder,
   trefferOffen:!$("lagerNeuesProduktTreffer").hidden,
   anzahl:$("lagerNeuesProduktTreffer").querySelectorAll("[data-lager-produkt-artikel]").length};
  lagerNeuesProduktSchliessen();
  return r;
 });
 p(z.sichtbar===true&&z.trefferOffen===true&&z.anzahl===3,
   "ohne Vorbelegung stehen Feld UND Liste von Anfang an da - wie bisher",z);
 p(!/Andere Position/.test(z.platzhalter),
   "und der Platzhalter ist dort der schlichte „Position suchen“",z.platzhalter);

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
