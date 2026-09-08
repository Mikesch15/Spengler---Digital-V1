// v3.27: Lagerbestand, Reststueckmerkmale und Reststuecke als Eingang der
// Zuschnittsplanung.
//
// Der Kern des Auftrags ist nicht "es sieht plausibel aus", sondern:
//   - ein Rest darf NUR verwendet werden, wenn Materialart, Staerke UND
//     Ausfuehrung exakt stimmen (0,70 ist kein Ersatz fuer 0,80),
//   - beide Grenzen (Laenge UND Breite) entscheiden ueber verwertbar,
//   - ausgeschaltet rechnet die App byteweise wie bis v3.26,
//   - es gibt weiterhin nur EINE Packrechnung.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lager-reste-v3-27.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 const ATTRAPPE=`window.supabase={createClient:()=>{
  const tabelle=t=>({
   select:(sp)=>{window.__spalten=window.__spalten||{};window.__spalten[t]=sp;return tabelle(t)},
   eq:()=>tabelle(t), order:()=>tabelle(t), in:()=>tabelle(t), range:()=>tabelle(t),
   limit:()=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}),
   maybeSingle:()=>Promise.resolve({data:(window.__einzeln&&window.__einzeln[t])||null,error:null}),
   then:(f)=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}).then(f),
   insert:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"insert",d});
     return {select:()=>Promise.resolve({data:window.__leer?[]:(Array.isArray(d)?d:[d]).map((x,i)=>Object.assign({id:900+i},x)),error:null})}},
   upsert:(d,o)=>{(window.__schreib=window.__schreib||[]).push({t,op:"upsert",d,o});
     return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]),error:null})}},
   update:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"update",d});
     const k={eq:()=>k,select:()=>Promise.resolve({data:window.__leer?[]:[Object.assign({id:1},d)],error:null})};
     return k},
   delete:()=>{(window.__schreib=window.__schreib||[]).push({t,op:"delete"});
     return {eq:()=>({select:()=>Promise.resolve({data:window.__leer?[]:[{id:1}],error:null})})}}
  });
  return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:tabelle, storage:{from:()=>({upload:()=>Promise.resolve({error:null}),
     createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
   rpc:()=>Promise.resolve({data:null,error:null}),
   functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}};
 }};`;
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"f1"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  settings.materials=[["103.01","Titanzinkblech blank","0.70","m²",30],
                      ["103.02","Titanzinkblech blank","0.80","m²",34]];
  materialIds=[11,12];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0;
  restMindestlaenge=1000; restMindestbreite=100; resteImZuschnitt=false;
  reststuecke=[]; lagerbestand=[]; appSettingsId=1;
  window.__schreib=[]; window.__lese={}; window.__leer=false;
  projektModule={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  // Ein Plan IMMER ueber das echte Modul - nie nachgebaut.
  window.__plan=(laengen,A,mat)=>{
   ebA=ebaLeer(); ebA.abwicklung=A; ebA.material=mat===undefined?2:mat;
   ebA.rollenAuswahl=[]; ebA.stuecke=laengen.map(l=>({laenge:l})); ebPieces=ebA.stuecke;
   return ebaZuschnittPlan();
  };
  window.__lagerTitan=()=>{lagerbestand=[{id:1,material_id:2,artikel_id:11,
    bezeichnung:"Titanzink blank",staerke_mm:0.7,ausfuehrung:"blank",
    laenge_mm:2000,breite_mm:1000,menge:5,einheit:"Tafeln"}]};
  window.__rest=(id,st,aus,l,br,extra)=>Object.assign({id,material_id:2,staerke_mm:st,
    ausfuehrung:aus,laenge_mm:l,breite_mm:br,anzahl:1,verbraucht:false},extra||{});
 });

 // ---- 1/2/3/4/5  Grenzen -------------------------------------------------
 console.log("\n1-5 · Mindestlaenge und Mindestbreite");
 let r=await page.evaluate(()=>({
  laenge:restGrenze(), breite:restGrenzeBreite(), text:restGrenzeText(),
  f1:restVerwertbar(800,300),    // zu kurz
  f2:restVerwertbar(1500,80),    // zu schmal
  f3:restVerwertbar(1500,300),   // beides erfuellt
  f4:restVerwertbar(1000,100)    // genau auf beiden Grenzen
 }));
 p(r.laenge===1000,"1 · die bestehende Mindestlaenge (1000) gilt unveraendert",r);
 p(r.breite===100,"2 · Mindestbreite 100 mm ist der Startwert",r);
 p(r.f1===false,"3 · Rest unter der Mindestlaenge ist nicht verwertbar",r);
 p(r.f2===false,"4 · Rest unter der Mindestbreite ist nicht verwertbar",r);
 p(r.f3===true&&r.f4===true,"5 · Rest, der beide Grenzen erfuellt, ist verwertbar",r);
 p(/1.000 mm L/.test(r.text)&&/100 mm Breite/.test(r.text),"5 · beide Grenzen stehen im Text",r);

 // Der zu kleine Rest verschwindet nicht - er wird als Verschnitt ausgewiesen.
 r=await page.evaluate(()=>{
  restMindestbreite=400;   // damit der seitliche Rand (250) zu schmal ist
  const pl=window.__plan([2000,1800],250);
  const alle=restAlle(pl);
  restMindestbreite=100;
  return {gesamt:alle.length,klein:alle.filter(x=>x.zuKlein).length,
          gut:alle.filter(x=>!x.zuKlein).length};
 });
 p(r.klein>0,"3/4 · zu kleine Reste verschwinden nicht, sie gelten als Verschnitt",r);

 // ---- 6/7/8  Exaktes Material ------------------------------------------
 console.log("\n6-8 · Material, Staerke und Ausfuehrung muessen exakt passen");
 r=await page.evaluate(()=>{
  window.__lagerTitan();
  const bedarf=restBedarfMerkmale(2);
  return {
   eindeutig:bedarf.eindeutig, merkmale:bedarf.merkmale,
   exakt:restPasstZu(window.__rest(50,0.7,"blank",2200,600),bedarf),
   staerke:restPasstZu(window.__rest(51,0.8,"blank",2200,600),bedarf),
   ausf:restPasstZu(window.__rest(52,0.7,"vorbewittert",2200,600),bedarf),
   material:restPasstZu(Object.assign(window.__rest(53,0.7,"blank",2200,600),{material_id:3}),bedarf),
   ohneStaerke:restPasstZu(window.__rest(54,null,"blank",2200,600),bedarf),
   ohneAusf:restPasstZu(window.__rest(55,0.7,null,2200,600),bedarf)
  };
 });
 p(r.eindeutig===true&&r.merkmale&&r.merkmale.staerke===0.7&&r.merkmale.ausfuehrung==="blank",
   "6 · der Lagerbestand macht den Bedarf eindeutig",r);
 p(r.exakt.passt===true,"6 · exakt passendes Material wird erkannt",r.exakt);
 p(r.staerke.passt===false&&r.staerke.grund==="staerke",
   "7 · 0,80 mm darf NICHT fuer 0,70 mm verwendet werden",r.staerke);
 p(r.ausf.passt===false&&r.ausf.grund==="ausfuehrung",
   "8 · eine andere Ausfuehrung darf nicht verwendet werden",r.ausf);
 p(r.material.passt===false,"6 · eine andere Materialart passt nicht",r.material);
 p(r.ohneStaerke.passt===false&&r.ohneAusf.passt===false,
   "7/8 · eine fehlende Angabe gilt als Nein, nicht als Ja",r);

 // Mehrdeutiger Bestand: die App raet NICHT.
 r=await page.evaluate(()=>{
  lagerbestand=[{id:1,material_id:2,staerke_mm:0.7,ausfuehrung:"blank"},
                {id:2,material_id:2,staerke_mm:0.8,ausfuehrung:"blank"}];
  const b=restBedarfMerkmale(2);
  const raus={grund:b.grund,eindeutig:b.eindeutig,gefunden:b.gefunden.length};
  window.__lagerTitan();
  return raus;
 });
 p(r.eindeutig===false&&r.grund==="mehrdeutig"&&r.gefunden===2,
   "7 · fuehrt die Firma 0,70 UND 0,80, wird nichts geraten",r);

 // Ende zu Ende: ein Rest mit falscher Staerke bzw. Ausfuehrung darf im
 // echten Plan NICHTS abziehen - sonst faellt eine ignorierte Pruefung erst
 // beim Zuschneiden auf.
 r=await page.evaluate(()=>{
  window.__lagerTitan(); resteImZuschnitt=true;
  reststuecke=[window.__rest(56,0.8,"blank",2200,600)];
  const a=window.__plan([2000,1800],250);
  reststuecke=[window.__rest(57,0.7,"vorbewittert",2200,600)];
  const b=window.__plan([2000,1800],250);
  reststuecke=[window.__rest(58,0.7,"blank",2200,600)];
  const c=window.__plan([2000,1800],250);
  resteImZuschnitt=false;
  return {staerke:(a.ausResten||[]).length,ausf:(b.ausResten||[]).length,
          richtig:(c.ausResten||[]).length};
 });
 p(r.staerke===0,"7 · im echten Plan zieht 0,80 mm nichts fuer 0,70 mm ab",r);
 p(r.ausf===0,"8 · im echten Plan zieht eine andere Ausfuehrung nichts ab",r);
 p(r.richtig===1,"6 · der exakt passende Rest zieht sehr wohl ab",r);

 // ---- 9/10  Der Schalter -------------------------------------------------
 console.log("\n9-10 · Reststueckverwendung ein und aus");
 r=await page.evaluate(()=>{
  window.__lagerTitan();
  reststuecke=[window.__rest(50,0.7,"blank",2200,600)];
  resteImZuschnitt=false; const aus=window.__plan([2000,1800,1500],250);
  resteImZuschnitt=true;  const ein=window.__plan([2000,1800,1500],250);
  const f=x=>x.moeglich&&x.moeglich[0]?Math.round(x.moeglich[0].flaeche*1000)/1000:null;
  return {aus:{n:(aus.ausResten||[]).length,fl:f(aus)},
          ein:{n:(ein.ausResten||[]).length,fl:f(ein),
               st:(ein.ausResten||[]).map(x=>({id:x.id,l:x.stuecke.map(s=>s.laenge)}))}};
 });
 p(r.aus.n===0,"10 · ausgeschaltet wird kein Rest abgezogen",r.aus);
 p(r.aus.fl===2,"10 · ausgeschaltet ist die Flaeche unveraendert (2,000 m²)",r.aus);
 p(r.ein.n===1&&r.ein.st[0].id===50,"9 · eingeschaltet wird der passende Rest verwendet",r.ein);
 p(!!r.ein.st[0]&&JSON.stringify(r.ein.st[0].l)==="[2000,1800]",
   "9 · 2 Streifen zu 250 mm in 600 mm Breite nehmen 2000 und 1800 auf",r.ein);
 p(r.ein.fl!==null&&r.ein.fl<r.aus.fl,"9 · die Rolle wird dadurch kleiner",r);

 // ---- 11  Mehrere passende Reststuecke ----------------------------------
 console.log("\n11 · mehrere passende Reste");
 r=await page.evaluate(()=>{
  resteImZuschnitt=true; window.__lagerTitan();
  // Der kleinere Rest zuerst - die App soll den kleinsten nehmen, der
  // ueberhaupt etwas aufnimmt, statt einen grossen zu zerschneiden.
  reststuecke=[window.__rest(60,0.7,"blank",2200,600),
               window.__rest(61,0.7,"blank",1600,300)];
  const pl=window.__plan([1500,1400,1300,1200],250);
  return (pl.ausResten||[]).map(x=>({id:x.id,l:x.stuecke.map(s=>s.laenge)}));
 });
 p(r.length>=1,"11 · mehrere passende Reste werden verwendet",r);
 p(r.every(x=>x.l.length>0),"11 · jeder verwendete Rest traegt wirklich Stuecke",r);
 p(r.map(x=>x.id).length===new Set(r.map(x=>x.id)).size,
   "12 · kein Rest wird zweimal verplant",r);
 r=await page.evaluate(()=>{
  const pl=window.__plan([1500,1400,1300,1200],250);
  const ausRest=[];
  (pl.ausResten||[]).forEach(x=>(x.stuecke||[]).forEach(s=>ausRest.push(s.laenge)));
  // Seit v3.29 enthaelt zuAlleStuecke() BEIDES: die Stuecke von der Rolle
  // und die aus einem Rest. Das ist der Sinn der Aenderung - bis v3.28
  // fehlten die aus dem Rest ueberall, auch auf der Ruestliste. Geprueft
  // wird deshalb weiterhin dasselbe, nur an der richtigen Stelle: jedes
  // Stueck kommt genau einmal vor, und die aus dem Rest sind als solche
  // gekennzeichnet.
  const alle=zuAlleStuecke(pl);
  const mitId=alle.filter(s=>s.ausRestId).map(s=>s.laenge);
  const ohneId=alle.filter(s=>!s.ausRestId).map(s=>s.laenge);
  return {ausResten:ausRest.slice().sort(),gekennzeichnet:mitId.slice().sort(),
          aufRolle:ohneId.slice().sort(),gesamt:alle.length};
 });
 p(r.gesamt===4,"12 · jedes Stueck kommt genau einmal vor - aus Rest ODER von der Rolle",r);
 p(JSON.stringify(r.gekennzeichnet)===JSON.stringify(r.ausResten),
   "12 · und die aus dem Rest sind als solche gekennzeichnet",r);

 // ---- 12  Keine Doppelverwendung ----------------------------------------
 console.log("\n12 · verbrauchte und reservierte Reste");
 r=await page.evaluate(()=>{
  window.__lagerTitan(); resteImZuschnitt=true;
  reststuecke=[Object.assign(window.__rest(70,0.7,"blank",2200,600),{verbraucht:true})];
  const a=window.__plan([2000],250);
  reststuecke=[Object.assign(window.__rest(71,0.7,"blank",2200,600),{reserviert_fuer_project_id:9})];
  const b=window.__plan([2000],250);
  return {verbraucht:(a.ausResten||[]).length,reserviert:(b.ausResten||[]).length};
 });
 p(r.verbraucht===0,"12 · ein verbrauchter Rest wird nicht mehr verwendet",r);
 p(r.reserviert===0,"12 · ein fuer ein anderes Projekt reservierter Rest ebenfalls nicht",r);

 // ---- 13  Entstehende Reste ---------------------------------------------
 console.log("\n13 · entstehende Reste nach dem Zuschnitt");
 r=await page.evaluate(()=>{
  resteImZuschnitt=false; reststuecke=[];
  const pl=window.__plan([2000,1200],250);
  const alle=restAlle(pl);
  return {n:alle.length,gut:alle.filter(x=>!x.zuKlein).length,
          quellen:[...new Set(alle.map(x=>x.quelle))]};
 });
 p(r.n>0,"13 · nach dem Zuschnitt entstehen Reste",r);
 p(r.gut>0,"13 · davon sind welche verwertbar",r);

 // ---- 14  Schnittfuge ----------------------------------------------------
 console.log("\n14 · Schnittfuge");
 r=await page.evaluate(()=>{
  resteImZuschnitt=false; reststuecke=[];
  blechSchnittfuge=0; const a=zuBilanz(window.__plan([2000,1800],250));
  blechSchnittfuge=3; const b=zuBilanz(window.__plan([2000,1800],250));
  blechSchnittfuge=0;
  // aufgeht ist die Pruefung der App selbst (js/33): brutto = Zuschnitte +
  // Fuge + verwertbare Reste + zu kleine Reste, Toleranz 1 mm².
  return {ohne:a?Math.round(a.fuge*1e6):null,mit:b?Math.round(b.fuge*1e6):null,
          summeA:a?a.aufgeht:null,summeB:b?b.aufgeht:null,
          handA:a?Math.abs(a.brutto-a.zuschnitte-a.fuge-a.verwertbar-a.zuKlein)<1e-6:null,
          handB:b?Math.abs(b.brutto-b.zuschnitte-b.fuge-b.verwertbar-b.zuKlein)<1e-6:null};
 });
 p(r.mit>r.ohne,"14 · mit Schnittfuge faellt Fugenverlust an",r);
 p(r.summeA===true&&r.summeB===true&&r.handA===true&&r.handB===true,
   "14 · die Materialbilanz geht in beiden Faellen exakt auf",r);

 // Mit Rest UND Fuge: die Bilanz muss weiterhin aufgehen.
 r=await page.evaluate(()=>{
  window.__lagerTitan(); resteImZuschnitt=true; blechSchnittfuge=3;
  reststuecke=[window.__rest(80,0.7,"blank",2200,600)];
  const pl=window.__plan([2000,1800,1500],250);
  const b=zuBilanz(pl);
  blechSchnittfuge=0; resteImZuschnitt=false;
  return b?{diff:Math.abs(b.brutto-b.zuschnitte-b.fuge-b.verwertbar-b.zuKlein),
            aufgeht:b.aufgeht,ausResten:b.ausResten,anzahl:b.ausRestenAnzahl}:null;
 });
 p(r&&r.diff<1e-6&&r.aufgeht===true,"14 · auch mit Reststuecken und Fuge geht die Bilanz auf",r);
 p(r&&r.anzahl===1&&r.ausResten>0,"10 · die Bilanz weist das Material aus Resten eigens aus",r);

 // ---- 15  Bestehende Zuschnittplanung ohne Reste ------------------------
 console.log("\n15 · bestehende Zuschnittplanung, ohne Reste");
 r=await page.evaluate(()=>{
  reststuecke=[]; lagerbestand=[]; resteImZuschnitt=false; blechSchnittfuge=0;
  const arten={};
  // Alle elf Arten muessen weiterhin einen Plan liefern - der Vorabzug darf
  // ihn bei ausgeschalteter Einstellung nicht beruehren.
  const pl=window.__plan([2070,2000,1420,980],250);
  arten.einlaufblech={n:zuAlleStuecke(pl).length,fl:pl.moeglich[0]?Math.round(pl.moeglich[0].flaeche*1000)/1000:null,
    ausResten:(pl.ausResten||[]).length,abschnitt:pl.gruppen&&pl.gruppen[0]?pl.gruppen[0].abschnittLaenge:null};
  return arten;
 });
 p(r.einlaufblech.n===4&&r.einlaufblech.ausResten===0,
   "15 · ohne Reste bleibt der Plan vollstaendig auf der Rolle",r);
 p(r.einlaufblech.abschnitt===2070,"15 · der Abschnitt ist so lang wie das laengste Stueck",r);

 // Der Vorabzug greift in ALLEN Arten - geprueft am Quelltext, damit eine
 // vergessene Art auffaellt.
 const fs=require("fs");
 const quellen={};
 ["29-einlaufblech-aufnahme","30-einlaufblech-konisch-aufnahme",
  "31-freies-profil-aufnahme","32-mauerabdeckung-aufnahme","34-kehle-aufnahme",
  "36-lukarne-aufnahme","37-kamin-aufnahme","38-einfassung-aufnahme",
  "39-rinne-aufnahme","40-anschlussblech-aufnahme","49-projekt-zuschnitt"].forEach(d=>{
  const t=fs.readFileSync("js/"+d+".js","utf8");
  quellen[d]={vorabzug:/ebaVorabzug\(/.test(t),ausResten:/ausResten/.test(t)};
 });
 const fehlt=Object.keys(quellen).filter(k=>!quellen[k].vorabzug||!quellen[k].ausResten);
 p(fehlt.length===0,"9 · jede Zuschnittart geht durch den EINEN Vorabzug",fehlt);

 // Und er wirkt in einer Art mit MEHREREN Streifenbreiten auch wirklich -
 // je Gruppe mit deren eigener Abwicklung, nicht mit einer angenommenen.
 console.log("\n15 · mehrere Streifenbreiten (Lukarne)");
 r=await page.evaluate(()=>{
  window.__lagerTitan();
  // Zwei Zuschnittbreiten: 400 und 250. Der Rest ist 600 breit - fuer 250 mm
  // passen zwei Streifen nebeneinander, fuer 400 mm nur einer.
  const bau=()=>{
   lukA=lukaLeer(); lukA.material=2; lukA.rollenAuswahl=[];
   window.lukaBleche=()=>[{nr:1,laenge:2000,breite:400},{nr:2,laenge:1800,breite:400},
                          {nr:3,laenge:1500,breite:250},{nr:4,laenge:1400,breite:250}];
   return lukaZuschnittPlan();
  };
  reststuecke=[]; resteImZuschnitt=false; const aus=bau();
  reststuecke=[window.__rest(95,0.7,"blank",2100,600)];
  resteImZuschnitt=true; const ein=bau();
  resteImZuschnitt=false;
  return {aus:(aus.ausResten||[]).length,
          ein:(ein.ausResten||[]).map(x=>({b:x.breite,a:x.abwicklung,n:x.streifenJeRest,st:x.stuecke.map(s=>s.laenge)})),
          breitenAus:aus.streifenbreiten,breitenEin:ein.streifenbreiten};
 });
 p(r.aus===0,"10 · ausgeschaltet aendert sich auch bei mehreren Breiten nichts",r);
 p(r.ein.length>=1,"9 · bei mehreren Breiten wird je Gruppe abgezogen",r);
 // 600 mm Rest: fuer 400 mm Zuschnittbreite ein Streifen, fuer 250 mm zwei.
 p(r.ein.every(x=>x.n===Math.floor(600/x.a))&&new Set(r.ein.map(x=>x.a)).size===r.ein.length,
   "8 · die Streifenzahl im Rest folgt DER Abwicklung dieser Gruppe",r.ein);

 // Es gibt weiterhin nur EINE Packrechnung.
 const q42=fs.readFileSync("js/42-reste.js","utf8");
 const pack={nutztKern:/ebaVerteile\(/.test(q42)&&/ebaStreifenJeAbschnitt\(/.test(q42),
             eigeneVerteilung:/function\s+rest(Verteile|PackeIn)/.test(q42)};
 p(pack.nutztKern&&!pack.eigeneVerteilung,
   "8 · der Vorabzug nutzt die bestehende Packrechnung und baut keine zweite",pack);

 // ---- 16/17  Offline-Abhaken und Konfliktpruefung ------------------------
 console.log("\n16-17 · Abhaken ohne Verbindung und Konfliktpruefung");
 r=await page.evaluate(()=>({
  offlineSperre:typeof offlineSperrtSpeichern==="function",
  wsHaken:typeof wsHakenPasst==="function",
  zeSetzen:typeof zeSetzen==="function",
  wsNamen:(typeof wsTabelleErlaubt==="function")?wsTabelleErlaubt("zuschnitt_erledigt"):null
 }));
 p(r.offlineSperre&&r.wsHaken&&r.zeSetzen&&r.wsNamen===true,
   "16/17 · Offline-Warteschlange und Konfliktpruefung sind unveraendert vorhanden",r);
 r=await page.evaluate(()=>{
  // Der Schalter wird hier ausdruecklich ausgeschaltet: geprueft wird die
  // Konfliktpruefung, nicht der Vorabzug. Zieht eine fehlerhafte Fassung
  // trotzdem alles ab, ist die Liste leer - dann muss die Pruefung sauber
  // fehlschlagen und nicht abstuerzen (CLAUDE.md 78).
  resteImZuschnitt=false;
  const plan=window.__plan([2000,1800],250);
  const st=zuAlleStuecke(plan);
  if(!st.length)return {typ:"keine Stuecke im Plan",leer:true};
  const gut=wsHakenPasst({payload:{measurement_id:1,stueck_nr:st[0].nr,
    laenge_mm:st[0].laenge,breite_mm:st[0].breite||250}},
    {id:1,data:{material:2,abwicklung:250,rollen:plan.rollen||{}}});
  return {typ:typeof gut,stuecke:st.length};
 });
 p(r.typ==="object","17 · die Konfliktpruefung laeuft weiterhin ueber wsHakenPasst",r);

 // ---- 18  Ruestliste -----------------------------------------------------
 console.log("\n18 · Ruestliste");
 r=await page.evaluate(()=>({projekt:typeof ruestlisteProjekt==="function",
   einzeln:typeof ruestlisteMassaufnahme==="function",
   planBauer:typeof pmatPlanFuer==="function"}));
 p(r.projekt&&r.einzeln&&r.planBauer,"18 · die Ruestliste ist unveraendert vorhanden",r);

 // ---- 19  Modulschalter --------------------------------------------------
 console.log("\n19 · Modulschalter");
 r=await page.evaluate(()=>{
  const vorher=JSON.parse(JSON.stringify(projektModule));
  projektModule={haupt:true,material:true,zuschnitt:false};
  const aus={abhaken:zeAbhakenMoeglich?zeAbhakenMoeglich():null,grund:zeAbhakenGrund?zeAbhakenGrund():null};
  projektModule=vorher;
  return {aus,ein:zeAbhakenMoeglich?zeAbhakenMoeglich():null};
 });
 p(r.aus.abhaken===false&&r.ein===true,"19 · der Modulschalter wirkt unveraendert",r);
 p(!!r.aus.grund,"19 · und er blockiert nicht stumm, sondern nennt den Grund",r);

 // ---- 20  Lagerbestand-Register -----------------------------------------
 console.log("\n20 · Lagerbestand");
 r=await page.evaluate(()=>{
  window.__lagerTitan(); renderLagerbestand();
  const t=$("lagerListe").innerText;
  const tab=document.querySelector('[data-settings-tab="lager"]');
  return {tab:!!tab,panel:!!document.querySelector('[data-settings-panel="lager"]'),
    text:t,hatStaerke:/0,7 mm/.test(t),hatAusf:/blank/.test(t),
    // v3.31: Menge und Abmessung sind bewusst weg - die Liste legt fest,
    // WELCHE Materialien die Firma fuehrt, sie ist keine Bestandsfuehrung.
    hatMass:!/2.000 × 1.000 mm/.test(t)&&!/Tafel/.test(t)};
 });
 p(r.tab&&r.panel,"20 · das Register Lager gibt es",r);
 p(r.hatStaerke&&r.hatAusf&&r.hatMass,"20 · Staerke und Ausfuehrung stehen in der Zeile, Menge und Abmessung nicht mehr",
   {text:r.text.slice(0,150)});

 // Fehlende Merkmale werden ausdruecklich benannt, nicht verschwiegen.
 r=await page.evaluate(()=>{
  lagerbestand=[{id:9,material_id:2,bezeichnung:"Titanzink",laenge_mm:2000,breite_mm:1000}];
  renderLagerbestand();
  const t=$("lagerListe").innerText;
  window.__lagerTitan(); renderLagerbestand();
  return {text:t,warnt:/Stärke/.test(t)&&/Ausführung/.test(t)};
 });
 p(r.warnt,"20 · ein unvollstaendiger Eintrag sagt, was fehlt",{text:r.text.slice(0,200)});

 // Mehrdeutiger Bestand wird in der Liste genannt.
 r=await page.evaluate(()=>{
  lagerbestand=[{id:1,material_id:2,staerke_mm:0.7,ausfuehrung:"blank"},
                {id:2,material_id:2,staerke_mm:0.8,ausfuehrung:"blank"}];
  renderLagerbestand();
  const t=$("lagerListe").innerText;
  window.__lagerTitan(); renderLagerbestand();
  return {warnt:/kein/i.test(t)&&/Titanzink/.test(t),text:t};
 });
 p(r.warnt,"20 · mehrere Kombinationen werden als Hinweis genannt",{text:r.text.slice(0,220)});

 // Speichern: EIN Schreibvorgang, NIE eine company_id vom Client.
 r=await page.evaluate(async()=>{
  window.__schreib=[]; lagFormularOeffnen({});
  $("lag_material").value="2"; $("lag_staerke").value="0.7";
  $("lag_ausfuehrung").value="blank";
  await lagSpeichern();
  return {n:window.__schreib.length,eintrag:window.__schreib[0]||null,
    offen:!$("lagerFormModal").hidden};
 });
 p(r.n===1&&r.eintrag&&r.eintrag.t==="lagerbestand"&&r.eintrag.op==="insert",
   "20 · Speichern schreibt genau einmal in lagerbestand",r);
 p(r.eintrag&&!("company_id" in r.eintrag.d),
   "20 · die company_id kommt NIE vom Client",r.eintrag&&r.eintrag.d);
 p(r.offen===false,"20 · nach dem Speichern ist der Dialog zu",r);

 // 0 geschriebene Zeilen gelten NICHT als Erfolg.
 r=await page.evaluate(async()=>{
  window.__leer=true; window.__schreib=[]; lagFormularOeffnen({});
  $("lag_material").value="2"; $("lag_bezeichnung").value="Test";
  await lagSpeichern();
  const raus={offen:!$("lagerFormModal").hidden,fehler:$("lagerFormFehler").textContent};
  window.__leer=false; lagFormularSchliessen();
  return raus;
 });
 p(r.offen===true&&/Berechtigung/.test(r.fehler),
   "20 · 0 betroffene Zeilen gelten nicht als Erfolg",r);

 // Der Artikel schlaegt die Staerke vor, ueberschreibt aber nichts.
 r=await page.evaluate(()=>{
  lagFormularOeffnen({});
  $("lag_artikel").value="11"; $("lag_artikel").dispatchEvent(new Event("change"));
  const leer=$("lag_staerke").value;
  $("lag_staerke").value="0.9";
  $("lag_artikel").value="12"; $("lag_artikel").dispatchEvent(new Event("change"));
  const gesetzt=$("lag_staerke").value;
  lagFormularSchliessen();
  return {leer,gesetzt};
 });
 p(r.leer==="0.7","20 · der Artikel schlaegt die Staerke vor",r);
 p(r.gesetzt==="0.9","20 · ein bereits gesetzter Wert wird nicht ueberschrieben",r);

 // ---- Reststueck-Merkmale ------------------------------------------------
 console.log("\nMerkmale am Reststueck");
 r=await page.evaluate(()=>{
  reststuecke=[window.__rest(90,null,null,2000,400)];
  renderRestLager();
  const t=$("restLagerListe").innerText;
  return {text:t,warnt:/Stärke/.test(t)&&/Ausführung/.test(t),
          knopf:!!document.querySelector('[data-rest-merkmale="90"]')};
 });
 p(r.warnt,"6 · einem Rest ohne Merkmale steht an, dass er nicht verwendet wird",{t:r.text.slice(0,200)});
 p(r.knopf,"6 · und er laesst sich nachtragen",r);

 // Beim Einlagern kommen die Merkmale aus dem Lagerbestand - nie geraten.
 r=await page.evaluate(async()=>{
  window.__lagerTitan(); window.__schreib=[]; reststuecke=[];
  const e=await restEinlagern([{material_id:2,material_name:"Titanzink",
    laenge_mm:1500,breite_mm:400,staerke_mm:0.7,ausfuehrung:"blank",artikel_id:11}],"Test",null);
  const s=window.__schreib[0];
  return {fehler:e.fehler,d:s?s.d:null};
 });
 p(r.d&&r.d[0]&&r.d[0].staerke_mm===0.7&&r.d[0].ausfuehrung==="blank",
   "6 · ein eingelagerter Rest traegt Staerke und Ausfuehrung",r.d);
 p(r.d&&r.d[0]&&!("company_id" in r.d[0]),"6 · auch hier keine company_id vom Client",r.d);

 // ---- Darstellung --------------------------------------------------------
 console.log("\nDarstellung");
 r=await page.evaluate(()=>{
  window.__lagerTitan(); resteImZuschnitt=true;
  reststuecke=[window.__rest(50,0.7,"blank",2200,600)];
  const pl=window.__plan([2000,1800,1500],250);
  const html=zuschnittHtml(pl);
  resteImZuschnitt=false;
  return {hat:/Reststücke-Lager/.test(html),verbucht:/[Vv]erbucht/.test(html),
          nr:/2.200 × 600/.test(html)};
 });
 p(r.hat,"9 · die Zuschnittliste sagt, was aus Resten kommt",r);
 p(r.verbucht,"9 · und sagt ausdruecklich, dass nichts verbucht ist",r);

 // ---- Einstellungen speichern -------------------------------------------
 console.log("\nEinstellungen");
 r=await page.evaluate(async()=>{
  window.__schreib=[]; renderSchnittfugeFelder();
  const vorhanden={breite:!!$("set_restMindestBreite"),schalter:!!$("set_resteImZuschnitt")};
  $("set_schnittfuge").value="3"; $("set_restMindest").value="1200";
  $("set_restMindestBreite").value="150"; $("set_resteImZuschnitt").value="ja";
  await $("saveSchnittfuge").onclick();
  const s=window.__schreib.find(x=>x.t==="app_settings");
  return {vorhanden,d:s?s.d:null,breite:restMindestbreite,schalter:resteImZuschnitt};
 });
 p(r.vorhanden.breite&&r.vorhanden.schalter,"11 · beide neuen Felder stehen in den Einstellungen",r);
 p(r.d&&r.d.rest_mindestbreite_mm===150&&r.d.reste_im_zuschnitt===true,
   "11 · beide werden gespeichert",r.d);
 p(r.breite===150&&r.schalter===true,"11 · und wirken sofort",r);
 await page.evaluate(()=>{restMindestbreite=100;resteImZuschnitt=false;blechSchnittfuge=0;restMindestlaenge=1000});

 // ---- Mobile -------------------------------------------------------------
 console.log("\nBildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:800});
  const u=await page.evaluate(()=>{
   $("settingsModal").hidden=false;
   document.querySelectorAll('[data-settings-panel]').forEach(x=>x.hidden=x.dataset.settingsPanel!=="lager");
   renderLagerbestand();
   const box=document.querySelector('[data-settings-panel="lager"]');
   const r=box.getBoundingClientRect();
   let raus=0;
   box.querySelectorAll("*").forEach(el=>{const b=el.getBoundingClientRect();
     if(b.width>0&&b.right>r.right+1)raus++});
   $("settingsModal").hidden=true;
   return {raus,scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(u.raus===0&&!u.scroll,"Lager passt bei "+w+" px",u);
 }
 await page.setViewportSize({width:1280,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log("\n"+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
