// Prueft den LAGERKREIS in EINEM Durchgang - nicht die einzelnen Stuecke.
//
// WARUM ES DIESEN PRUEFSTAND GIBT
// v3.231 bis v3.246 haben je ein Stueck des Kreises gebaut, jedes mit
// eigenem Pruefstand:
//
//   Inventur -> Mindestbestand -> Einkaufsliste -> Wareneingang
//        ^                                              |
//        |                                              v
//   Bewegungen <- Ausbuchen beim Scannen im Regierapport
//
// Jedes Stueck ist fuer sich gemessen. Die UEBERGABEN dazwischen sind es
// nicht: ob die Zahl, die die Inventur bucht, dieselbe ist, mit der die
// Einkaufsliste rechnet; ob die Bestellmenge, die der Wareneingang
// vorbelegt, dieselbe Rundung benutzt; ob ein Scan im Regierapport den
// Bestand so senkt, dass die Einkaufsliste es merkt. Genau dort sitzen die
// Fehler, die kein Einzelpruefstand sehen kann - jeder von ihnen baut sich
// seinen eigenen Anfangszustand.
//
// Hier laeuft deshalb EINE Sitzung durch den ganzen Kreis, mit denselben
// Funktionen, die die Bedienung aufruft, und mit dem echten Nachladen
// zwischen den Schritten (lfLaden). Geprueft werden die Zahlen an jeder
// Uebergabe.
//
// DIE EINE WAHRHEIT, auf die am Schluss alles zurueckfaellt:
//   Bestand = Summe ueber die Bewegungen. Nie ein Feld.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lager-rundgang-v3-246.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Eine Attrappe, die sich wie die Datenbank VERHAELT: Buchungen sammeln
// sich an, der Einkaufswunsch laesst sich aendern und abhaken. Nur so hat
// ein Rundgang Aussagekraft - mit einer Attrappe, die jeden Schritt
// vergisst, waere es wieder ein Einzelpruefstand.
const SB=`()=>{
 window.__db={lieferanten_artikel:[
   {id:1,lieferant:"B-Team",artikelnr:"409373",bezeichnung:"Dachrinnen 330x0.7 mm Titanzink",
    ean:"3661587017460",vpe:5,gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:330,
    mindestbestand:0},
   {id:2,lieferant:"B-Team",artikelnr:"422640",bezeichnung:"Rinnenseiher 60 mm Kupfer",
    ean:"1019006000005",vpe:1,gruppe:"Rinnenseiher",material:"Kupfer",mindestbestand:0}],
  lieferanten_bewegungen:[],lieferanten_einkauf:[],ruf:[]};
 let n=100;
 const tisch=name=>({
  select(){ const q={ order(){return q},
    is(spalte,wert){ q.__filter=x=>(x[spalte]===undefined?null:x[spalte])===wert; return q },
    then(r){ let d=window.__db[name].slice();
     if(q.__filter)d=d.filter(q.__filter);
     return r({data:d,error:null}) } }; return q; },
  insert(zeile){ window.__db.ruf.push({tisch:name,was:"insert",zeile});
   (Array.isArray(zeile)?zeile:[zeile]).forEach(z=>
    window.__db[name].push(Object.assign({id:++n},z)));
   return Promise.resolve({error:null}); },
  update(werte){ const w=werte; return {
    eq(spalte,wert){ window.__db.ruf.push({tisch:name,was:"update",spalte,wert,werte:w});
     const da=window.__db[name].find(x=>String(x[spalte])===String(wert));
     if(da)Object.assign(da,w);
     return Promise.resolve({error:null}); },
    then(r){ window.__db.ruf.push({tisch:name,was:"update-ohne-eq",werte:w});
     return r({error:null}) } }; },
  delete(){ window.__db.ruf.push({tisch:name,was:"delete"}); return Promise.resolve({error:null}) }
 });
 sb.from=name=>tisch(name);
 sb.rpc=(name,args)=>{
  window.__db.ruf.push({tisch:"rpc:"+name,was:"rpc",args});
  ((args&&args.paare)||[]).forEach(z=>{
   const a=window.__db.lieferanten_artikel.find(x=>String(x.id)===String(z.id));
   if(!a)return;
   if(name==="lieferanten_mindestbestand_setzen")a.mindestbestand=z.mindestbestand;
   else a.material_id=z.material_id===""?null:z.material_id;
  });
  return Promise.resolve({data:((args&&args.paare)||[]).length,error:null});
 };
}`;
// Der Regie-Katalog: der 409373 ist zugeordnet, der Seiher nicht. Beides
// kommt im Kreis vor - gescannt werden kann nur der zugeordnete.
const KATALOG=`()=>{
 settings.materials=[
  ["201.12","Dachrinnen halbrund Titanzink","330","m1",22],
  ["203.51","Rinnenseiher, alle Materialien","bis 120","St",12]];
 materialIds=[7012,7051];
 window.__db.lieferanten_artikel[0].material_id=7012;
}`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,
   r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // Der Anfang des Rundgangs: einmal setzen, danach NICHT mehr. Jeder
 // weitere Schritt baut auf dem Zustand auf, den der vorige hinterlassen
 // hat - das ist der Sinn der Sache.
 await page.evaluate(async(o)=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  eval("("+o.s+")()"); eval("("+o.k+")()");
  await lfLaden();
 },{s:SB,k:KATALOG});

 const stand=()=>page.evaluate(()=>({
  bestand1:lfBestand(1), bestand2:lfBestand(2),
  mindest1:lfMindest(lfArtikelZuId(1)), mindest2:lfMindest(lfArtikelZuId(2)),
  fehlt1:lfFehlt(lfArtikelZuId(1)),
  bestell1:lfBestellmenge(lfArtikelZuId(1)),
  einkauf:lfEinkaufsliste().map(a=>({nr:a.artikelnr,bedarf:lfBedarf(a),
    bestell:lfBestellmenge(a),herkunft:lfHerkunftText(a)})),
  bewegungen:lfBewegungenGefiltert().map(x=>({art:x.art,menge:x.menge,ziel:x.ziel||null})),
  summe1:(lfBewegungen||[]).filter(x=>String(x.artikel_id)==="1")
    .reduce((s,x)=>s+(x.art==="abgang"?-Math.abs(Number(x.menge)||0):(Number(x.menge)||0)),0)
 }));

 // ---- 1  Der leere Anfang ------------------------------------------------
 console.log("\n1 · Der leere Anfang: nichts gezaehlt, nichts ueberwacht");
 let z=await stand();
 p(z.bestand1===0&&z.bestand2===0,"1a ohne Buchung ist der Bestand 0 - nicht leer, sondern null",z);
 p(z.mindest1===0&&z.einkauf.length===0,
   "1b kein Mindestbestand, also auch keine Einkaufsliste - genau der Zustand, in dem das Lager heute steht",z);

 // ---- 2  Inventur: zaehlen und Mindestbestand setzen ---------------------
 console.log("\n2 · Inventur -> Bestand und Mindestbestand");
 z=await page.evaluate(async()=>{
  lfInvGezaehlt={"1":"10","2":"4"};
  lfInvMindest={"1":"8","2":"2"};
  await lfInvSpeichern();
  await lfLaden();
  const r=window.__db.ruf.filter(x=>x.was==="insert"||x.was==="rpc");
  return {rufe:r.map(x=>({tisch:x.tisch,was:x.was})),
          buchungen:window.__db.lieferanten_bewegungen.map(x=>({art:x.art,menge:x.menge,ziel:x.ziel})),
          mindest:window.__db.lieferanten_artikel.map(x=>x.mindestbestand)};
 });
 p(z.rufe.filter(x=>x.was==="insert").length===1,
   "2a alle Korrekturen gehen in EINEM insert weg - nicht eine Runde pro Artikel",z.rufe);
 p(z.buchungen.length===2&&z.buchungen.every(x=>x.art==="korrektur"&&x.ziel==="inventur"),
   "2b gebucht wird als KORREKTUR mit Herkunft 'inventur' - ein Zugang wuerde behaupten, Ware sei angekommen",z.buchungen);
 p(z.mindest.join(",")==="8,2","2c und die Mindestbestaende stehen",z.mindest);
 z=await stand();
 p(z.bestand1===10&&z.bestand2===4,
   "2d DIE UEBERGABE: der gezaehlte Bestand ist jetzt der Bestand - die Inventur rechnet nicht in einer eigenen Welt",z);
 p(z.einkauf.length===0,
   "2e und nichts fehlt: 10 von 8 und 4 von 2 - die Einkaufsliste bleibt leer, obwohl jetzt ueberwacht wird",z.einkauf);

 // ---- 3  Scannen im Regierapport: dreimal Material verbaut ---------------
 console.log("\n3 · Scannen im Regierapport -> Bestand sinkt");
 z=await page.evaluate(async()=>{
  const raus=[];
  for(let i=0;i<3;i++){
   const t=await lfScanVerbrauch("3661587017460",{menge:1,ausbuchen:true,
     projekt:null,grund:"Regierapport"});
   // Die EDV-Nr. steht in t.regie.edv_nr - der Scan antwortet mit der
   // Regie-POSITION, nicht mit einer Nummer neben ihr.
   raus.push({ok:t.ok,no:(t.regie&&t.regie.edv_nr)||null,hinweis:t.buchhinweis||null});
  }
  await lfLaden();
  return raus;
 });
 p(z.length===3&&z.every(x=>x.ok===true&&x.no==="201.12"),
   "3a jeder Scan fuellt die Rapportzeile mit EURER EDV-Nr. - das ist der Zweck der ganzen Bruecke",z);
 p(/Bestand jetzt 7/.test(z[2].hinweis||""),
   "3b und sagt nach jedem Scan den neuen Bestand - der dritte Scan steht auf 7",z[2]);
 z=await stand();
 p(z.bestand1===7,"3c DIE UEBERGABE: drei Scans sind drei Stueck weniger im Lager",z);
 p(z.fehlt1===1,"3d 7 von 8 - es fehlt genau eines",z);
 p(z.einkauf.length===1&&z.einkauf[0].nr==="409373",
   "3e DIE UEBERGABE: und damit steht der Artikel in der Einkaufsliste, ohne dass jemand etwas eingetragen hat",z.einkauf);
 p(z.einkauf[0].bestell===5,
   "3f bestellt werden 5, nicht 1: die Verpackungseinheit ist 5 - eine Bestellung von 1 waere nicht lieferbar",z.einkauf[0]);
 p(/Mindestbestand/.test(z.einkauf[0].herkunft),
   "3g und es steht dran, WOHER der Bedarf kommt",z.einkauf[0]);

 // ---- 4  Wareneingang auf den Mindestbestand-Bedarf ----------------------
 console.log("\n4 · Wareneingang -> die Zeile verschwindet von selbst");
 z=await page.evaluate(async()=>{
  // Genau der Weg, den der 📥 in der Einkaufsliste nimmt: mit der
  // BESTELLmenge vorbelegt.
  const a=lfArtikelZuId(1);
  lfBuchenOeffnen(1,"zugang",lfBestellmenge(a));
  const vorbelegt=$("liefBuchenMenge").value;
  await lfBuchenSpeichern();
  await lfLaden();
  return {vorbelegt, fehler:$("liefBuchenFehler").textContent};
 });
 p(z.vorbelegt==="5",
   "4a der Zugang ist mit der Bestellmenge vorbelegt - mit dem Lieferschein in der Hand ist das die Zahl",z);
 p(!z.fehler,"4b und laeuft ohne Fehler durch",z.fehler);
 z=await stand();
 p(z.bestand1===12,"4c DIE UEBERGABE: 7 + 5 = 12",z);
 p(z.einkauf.length===0,
   "4d und die Zeile ist WEG, ohne Abhaken: 12 von 8 - was da ist, fehlt nicht mehr",z.einkauf);

 // ---- 5  Der Einkaufswunsch von Hand und die Teillieferung ---------------
 console.log("\n5 · Einkaufswunsch von Hand -> Teillieferung -> Rest");
 z=await page.evaluate(async()=>{
  lfArtikelOffenId=2;
  $("liefArtikelWunschMenge").value="3";
  $("liefArtikelWunschGrund").value="für Baustelle Müller";
  await lfAufEinkaufsliste();
  await lfLaden();
  const a=lfArtikelZuId(2);
  return {liste:lfEinkaufsliste().map(x=>({nr:x.artikelnr,bedarf:lfBedarf(x),
    herkunft:lfHerkunftText(x)})), wunsch:lfHandMenge(a)};
 });
 p(z.liste.length===1&&z.liste[0].nr==="422640"&&z.liste[0].bedarf===3,
   "5a der Wunsch von Hand steht in der Liste - obwohl beim Bestand nichts fehlt",z);
 p(/Hand|Einmalig|einmalig/.test(z.liste[0].herkunft),
   "5b und auch hier steht die Herkunft dran",z.liste[0]);
 z=await page.evaluate(async()=>{
  lfBuchenOeffnen(2,"zugang",2);          // Teillieferung: 2 von 3
  const vor=$("liefBuchenWunschHinweis")?$("liefBuchenWunschHinweis").textContent.replace(/\s+/g," ").trim():"";
  await lfBuchenSpeichern();
  await lfLaden();
  const a=lfArtikelZuId(2);
  return {vor, bestand:lfBestand(2), wunsch:lfHandMenge(a),
          liste:lfEinkaufsliste().map(x=>({nr:x.artikelnr,bedarf:lfBedarf(x)}))};
 });
 p(/3/.test(z.vor)&&/1/.test(z.vor),
   "5c vor dem Buchen steht da, was passieren wird: offener Wunsch 3, danach bleibt 1 offen",z.vor);
 p(z.bestand===6&&z.wunsch===1,
   "5d DIE UEBERGABE: 4 + 2 = 6, und der Wunsch ist auf 1 VERRINGERT - nicht abgehakt und nicht stehengelassen",z);
 p(z.liste.length===1&&z.liste[0].bedarf===1,
   "5e die Liste verlangt jetzt genau den Rest - sonst kaeme das Zuwenig beim naechsten Bestellen doppelt",z.liste);
 z=await page.evaluate(async()=>{
  lfBuchenOeffnen(2,"zugang",1);          // der Rest
  await lfBuchenSpeichern();
  await lfLaden();
  return {bestand:lfBestand(2), liste:lfEinkaufsliste().length,
          erledigt:window.__db.lieferanten_einkauf.filter(x=>x.erledigt_am).length};
 });
 p(z.bestand===7&&z.liste===0&&z.erledigt===1,
   "5f mit dem Rest ist der Wunsch erledigt und die Liste leer",z);

 // ---- 6  Die Bewegungen erzaehlen den ganzen Rundgang --------------------
 console.log("\n6 · Die Bewegungen erzaehlen den Rundgang nach");
 z=await stand();
 p(z.bewegungen.length===8,
   "6a acht Buchungen: 2 Inventur-Korrekturen, 3 Abgaenge vom Scannen, 3 Zugaenge",z.bewegungen.length);
 const arten=z.bewegungen.reduce((m,x)=>{m[x.art]=(m[x.art]||0)+1;return m},{});
 p(arten.korrektur===2&&arten.abgang===3&&arten.zugang===3,
   "6b und zwar in genau diesen Arten - jede Art bedeutet etwas anderes",arten);
 p(z.bewegungen.some(x=>x.ziel==="inventur"),
   "6c die Herkunft 'inventur' ist noch da - in der Liste muss erkennbar sein, woher eine Zahl kommt",z.bewegungen);

 // ---- 7  Die eine Wahrheit ----------------------------------------------
 console.log("\n7 · Die eine Wahrheit: Bestand = Summe der Buchungen");
 p(z.bestand1===z.summe1&&z.bestand1===12,
   "7a der angezeigte Bestand IST die Summe ueber die Bewegungen - nie ein Feld",
   {bestand:z.bestand1,summe:z.summe1});
 z=await page.evaluate(()=>{
  // Gegenprobe: ein Feld 'bestand' am Artikel darf die Anzeige nicht
  // beeinflussen. Gaebe es eine zweite Wahrheit, wuerde sie hier gewinnen.
  lfArtikelZuId(1).bestand=999;
  return lfBestand(1);
 });
 p(z===12,
   "7b GEGENPROBE: ein Feld 'bestand' am Artikel aendert nichts - es gibt keine zweite Wahrheit",z);
 // Und die Gegenprobe ueber den ganzen Rundgang: ohne die Buchungen waere
 // der Bestand 0. Dass er 12 ist, kommt NUR aus dem Weg, der gelaufen ist.
 z=await page.evaluate(async()=>{
  window.__db.lieferanten_bewegungen=[];
  await lfLaden();
  return {bestand:lfBestand(1), einkauf:lfEinkaufsliste().length};
 });
 // BEIDE Artikel sind ueberwacht (8 und 2) - ohne Buchungen fehlen also
 // beide. Eins waere die falsche Zahl.
 p(z.bestand===0&&z.einkauf===2,
   "7c GEGENPROBE: nimmt man die Buchungen weg, ist der Bestand 0 - und die Einkaufsliste meldet sofort Mangel bei BEIDEN ueberwachten Artikeln",z);

 p(fehler.length===0,"keine JavaScript-Fehler im ganzen Rundgang",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
