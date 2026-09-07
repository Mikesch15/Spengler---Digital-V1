// v3.26: Schnittfuge, Reststuecke und tatsaechlicher Materialverbrauch.
//
// Bis v3.25 verschwanden Reste stillschweigend: ein ungenutzter Streifenplatz
// wurde nie erwaehnt, der seitliche Rand nur bei EINER Streifenbreite, und die
// Formel B - jeAbschnitt*A zog die Laengsschnitte nicht ab. Es gab ausserdem
// keine Stelle, an der man saehe, wo das Material geblieben ist.
//
// Geprueft wird deshalb nicht "es sieht plausibel aus", sondern:
//   - die Bilanz geht EXAKT auf (brutto = Zuschnitte + Fuge + Reste)
//   - kein Rest verschwindet, auch nicht bei aelteren gespeicherten Plaenen
//   - der bestehende Produktionsablauf ist unveraendert
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-reste-schnittfuge-v3-26.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 const ATTRAPPE=`window.supabase={createClient:()=>{
  const tabelle=t=>({
   select:()=>tabelle(t), eq:()=>tabelle(t), order:()=>tabelle(t), in:()=>tabelle(t),
   limit:()=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}),
   maybeSingle:()=>Promise.resolve({data:(window.__einzeln&&window.__einzeln[t])||null,error:null}),
   then:(f)=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}).then(f),
   insert:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"insert",d});
     return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]).map((x,i)=>Object.assign({id:900+i},x)),error:null})}},
   upsert:(d,o)=>{(window.__schreib=window.__schreib||[]).push({t,op:"upsert",d,o});
     return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]),error:null})}},
   update:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"update",d});
     const kette={eq:()=>kette,select:()=>Promise.resolve({data:window.__updateLeer?[]:[{id:1}],error:null})};
     return kette},
   delete:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})})
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
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; restMindestlaenge=1000;
  reststuecke=[]; appSettingsId=1; window.__schreib=[]; window.__lese={};
  projektModule={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  // Ein Plan aus echten Stuecken - immer ueber ebaZuschnittPlan(), nie nachgebaut.
  window.__plan=(fuge,laengen,A,breiten)=>{
   blechSchnittfuge=fuge;
   if(breiten)blechRollenbreiten=breiten;
   ebA=ebaLeer(); ebA.abwicklung=A; ebA.material=2; ebA.rollenAuswahl=[];
   ebA.stuecke=laengen.map(l=>({laenge:l})); ebPieces=ebA.stuecke;
   return ebaZuschnittPlan();
  };
  // Die Bilanz von Hand nachgerechnet - unabhaengig von zuBilanz().
  window.__vonHand=pl=>{
   const g=zuGeometrie(pl); let brutto=0,zu=0,fuge=0;
   g.forEach(x=>{ brutto+=x.B*x.rollenLaenge; fuge+=x.fugeQuer*x.rollenLaenge;
    (x.streifen||[]).forEach(st=>{
     const s=(st.stuecke||[]).reduce((a,y)=>a+Number(y.laenge||0),0);
     zu+=s*x.A; fuge+=Math.max(0,x.L-s-Number(st.rest||0))*x.A; }); });
   const r=restAlle(pl);
   const f=y=>Number(y.laenge_mm)*Number(y.breite_mm)*Math.max(1,y.anzahl||1);
   const gut=r.filter(y=>!y.zuKlein).reduce((a,y)=>a+f(y),0);
   const klein=r.filter(y=>y.zuKlein).reduce((a,y)=>a+f(y),0);
   return {brutto,zu,fuge,gut,klein,diff:brutto-zu-fuge-gut-klein};
  };
 });

 // =========================================================== 1
 console.log("1 · Ein einziger Zuschnitt, der die Rolle genau aufbraucht");
 const t1=await page.evaluate(()=>{
  // 4 x 250 = 1000 = Rollenbreite, ein Stueck so lang wie der Abschnitt.
  const pl=__plan(0,[2000,2000,2000,2000],250,[1000]);
  const b=zuBilanz(pl);
  return {b:{brutto:b.brutto,zu:b.zuschnitte,fuge:b.fuge,gut:b.verwertbar,klein:b.zuKlein,auf:b.aufgeht},
          reste:restAlle(pl).length, hand:__vonHand(pl)};
 });
 p(t1.b.auf===true,"die Bilanz geht auf",t1.b);
 p(t1.reste===0,"kein Rest - die Rolle ist restlos aufgebraucht",t1);
 p(Math.abs(t1.b.brutto-t1.b.zu)<1e-9,"Ausgangsmaterial = Zuschnitte",t1.b);
 p(Math.abs(t1.hand.diff)<1e-6,"von Hand nachgerechnet: geht ebenfalls auf",t1.hand);

 // =========================================================== 2
 console.log("\n2 · Ein Zuschnitt mit verwertbarem Rest");
 const t2=await page.evaluate(()=>{
  const pl=__plan(0,[2000,2000,2000],250,[1000]);   // 4 Plaetze, 3 belegt
  const r=restAlle(pl), b=zuBilanz(pl);
  return {reste:r.map(x=>({l:x.laenge_mm,br:x.breite_mm,n:x.anzahl,klein:x.zuKlein,q:x.quelle})),
          auf:b.aufgeht, gut:b.verwertbar, hand:__vonHand(pl)};
 });
 p(t2.reste.length===1&&t2.reste[0].l===2000&&t2.reste[0].br===250&&!t2.reste[0].klein,
   "der ungenutzte Streifenplatz ist ein verwertbarer Rest (2000 x 250)",t2.reste);
 p(/ungenutzt/i.test(t2.reste[0]&&t2.reste[0].q||""),"und wird als solcher benannt",t2.reste[0]);
 p(Math.abs(t2.gut-0.5)<1e-9,"er steht mit 0.5 m2 in der Bilanz",t2.gut);
 p(t2.auf===true&&Math.abs(t2.hand.diff)<1e-6,"die Bilanz geht auf",t2);

 // =========================================================== 3
 console.log("\n3 · Mehrere Zuschnitte aus einem Ausgangsstueck");
 const t3=await page.evaluate(()=>{
  // 600+600+600 = 1800 passen zusammen in einen 2000er Abschnitt.
  // Dieselben Stuecke wie Fall 4, dort dann MIT Schnittfuge.
  const pl=__plan(0,[2000,600,600,600],250,[1000]);
  const g=zuGeometrie(pl), b=zuBilanz(pl);
  const st=g[0].streifen.find(x=>(x.stuecke||[]).length===3)||g[0].streifen[0];
  return {streifen:g[0].streifen.length, imStreifen:st.stuecke.length,
          rest:Number(st.rest), L:g[0].L, auf:b.aufgeht, hand:__vonHand(pl)};
 });
 p(t3.imStreifen===3&&t3.streifen===2,
   "drei Stuecke liegen hintereinander in EINEM Streifen, das vierte im zweiten",t3);
 p(t3.L===2000,"der Abschnitt ist so lang wie das laengste Stueck",t3);
 p(t3.rest===200,"ohne Schnittfuge bleiben 2000-1800 = 200 mm uebrig",t3);
 p(t3.auf===true&&Math.abs(t3.hand.diff)<1e-6,"die Bilanz geht auf",t3);

 // =========================================================== 4
 console.log("\n4 · Mehrere Schnittfugen");
 const t4=await page.evaluate(()=>{
  // 2000 fuellt Streifen 1; 600+3+600+3+600 = 1806 passen zusammen in Streifen 2.
  const pl=__plan(3,[2000,600,600,600],250,[1000]);
  const g=zuGeometrie(pl), b=zuBilanz(pl);
  const st=g[0].streifen.find(x=>(x.stuecke||[]).length===3)||g[0].streifen[0];
  const summe=(st.stuecke||[]).reduce((a,x)=>a+Number(x.laenge),0);
  return {stuecke:st.stuecke.length, summe, rest:Number(st.rest), L:g[0].L,
          n:g[0].jeAbschnitt, rand:g[0].restBreite, fq:g[0].fugeQuer,
          fuge:b.fuge, auf:b.aufgeht, hand:__vonHand(pl)};
 });
 // 3 Stuecke in einem Streifen = 2 Fugen laengs; 3 Streifen nebeneinander = 2 Fugen quer.
 p(t4.stuecke===3&&t4.L-t4.summe-t4.rest===6,
   "drei Stuecke in einem Streifen kosten ZWEI Fugen (2 x 3 = 6 mm), nicht drei",t4);
 p(t4.n===3&&t4.rand===1000-3*250-2*3,
   "drei Streifen nebeneinander: der Rand ist 1000 - 3x250 - 2x3 = 244 mm",t4);
 p(t4.fq===6,"das sind zwei Laengsschnitte quer ueber die Rolle",t4);
 p(t4.auf===true&&Math.abs(t4.hand.diff)<1e-6,"die Bilanz geht mit Fuge exakt auf",t4);

 // Was EINGESTELLT ist und was in DIESEM Zuschnitt anfaellt, sind zwei Dinge.
 // Ein Plan, bei dem jedes Stueck allein in seinem Streifen liegt und die
 // Rollenbreite ohne Laengsschnitt aufgeht, hat auch bei 3 mm Fuge keine.
 const t4b=await page.evaluate(()=>{
  const eins=__plan(3,[2000,1500],250,[250]);   // Rolle = Abwicklung
  const bE=zuBilanz(eins);
  const htmlMit=zuBilanzHtml(eins);
  blechSchnittfuge=0;
  const htmlOhne=zuBilanzHtml(__plan(0,[2000,1500],250,[250]));
  blechSchnittfuge=3;
  return {fuge:bE.fuge, mit:htmlMit, ohne:htmlOhne};
 });
 p(t4b.fuge===0,"ein Stueck je Streifen und Rolle = Abwicklung: keine Fuge",t4b.fuge);
 p(/rechnerisch keine Schnittfuge/.test(t4b.mit)&&!/0.mm hinterlegt/.test(t4b.mit),
   "bei eingestellter Fuge steht dann 'faellt rechnerisch keine an'",t4b.mit.slice(-260));
 p(/hinterlegt/.test(t4b.ohne)&&!/rechnerisch keine/.test(t4b.ohne),
   "bei 0 mm Einstellung steht, dass 0 mm hinterlegt sind",t4b.ohne.slice(-260));

 // =========================================================== 5
 console.log("\n5 · Rest unter der Mindestgroesse");
 const t5=await page.evaluate(()=>{
  restMindestlaenge=1000;
  const pl=__plan(0,[2000,1500],250,[1000]);   // Streifen 2 laesst 500 uebrig
  const alle=restAlle(pl), kand=restKandidaten(pl);
  const b=zuBilanz(pl);
  const html=restBlockHtml(pl,"Titanzink");
  return {alle:alle.map(x=>({l:x.laenge_mm,klein:x.zuKlein})), kand:kand.length,
          klein:b.zuKlein, verlust:b.verlust, genannt:/[Zz]u klein/.test(html),
          auf:b.aufgeht, hand:__vonHand(pl)};
 });
 p(t5.alle.some(x=>x.l===500&&x.klein),"der 500er Rest ist als zu klein erkannt",t5.alle);
 p(!t5.kand||t5.kand===t5.alle.filter(x=>!x.klein).length,
   "zum Einlagern vorgeschlagen wird er nicht",t5);
 p(t5.klein>0&&Math.abs(t5.verlust-t5.klein)<1e-9,
   "er zaehlt als echter Verschnitt, nicht als Rest",t5);
 p(t5.genannt,"und wird trotzdem ausdruecklich genannt - er verschwindet nicht",t5);
 p(t5.auf===true&&Math.abs(t5.hand.diff)<1e-6,"die Bilanz geht auf",t5);

 // =========================================================== 6
 console.log("\n6 · Ein Rest wird spaeter wieder verwendet");
 const t6=await page.evaluate(async()=>{
  reststuecke=[{id:41,breite_mm:300,laenge_mm:2500,verbraucht:false,material_name:"Titanzink"}];
  const pl=__plan(0,[2000],250,[1000]);
  pl.erledigtFuer=55; pl.projektFuer=7;
  const html=restBlockHtml(pl,"Titanzink");
  const zeigt=/Aus dem Reststücke-Lager/.test(html);
  const knopf=/data-rest-verwenden="41"/.test(html)&&/data-rest-fuer="55"/.test(html);
  const nichtAuto=/nicht automatisch eingeplant/.test(html);
  // Der Plan darf sich durch einen vorhandenen Rest NICHT aendern.
  const vorher=JSON.stringify(zuBilanz(pl));
  reststuecke=[];
  const ohne=JSON.stringify(zuBilanz(__plan(0,[2000],250,[1000])));
  reststuecke=[{id:41,breite_mm:300,laenge_mm:2500,verbraucht:false}];
  return {zeigt,knopf,nichtAuto,gleich:vorher===ohne};
 });
 p(t6.zeigt,"ein passender Rest aus dem Lager wird angeboten",t6);
 p(t6.knopf,"mit einem Knopf, der ihn dieser Massaufnahme zuordnet",t6);
 p(t6.nichtAuto,"und dem ausdruecklichen Hinweis, dass nichts automatisch eingeplant wird",t6);
 p(t6.gleich,"der Zuschnittplan aendert sich durch einen Lagerrest NICHT",t6);

 const t6b=await page.evaluate(async()=>{
  window.__schreib=[];
  reststuecke=[{id:41,breite_mm:300,laenge_mm:2500,verbraucht:false}];
  const box=document.createElement("div"); box.id="__t6"; document.body.appendChild(box);
  const pl={art:"rolle",erledigtFuer:55,projektFuer:7,streifenbreiten:[250],
    gruppen:[{breite:250,abschnittLaenge:2000,jeAbschnitt:4,abschnitte:1,
      streifen:[{stuecke:[{nr:1,laenge:2000}],rest:0}]}],
    moeglich:[{breite:1000,restBreite:0,rollenLaenge:2000,jeAbschnitt:4,abschnitte:1,abschnittLaenge:2000}]};
  box.innerHTML=restBlockHtml(pl,"Titanzink");
  const k=box.querySelector("[data-rest-verwenden]");
  if(!k)return {fehlt:true};
  k.click(); await new Promise(r=>setTimeout(r,150));
  const s=(window.__schreib||[]).filter(x=>x.t==="reststuecke");
  box.remove();
  return {schreib:s, frei:(reststuecke||[]).length};
 });
 p(!t6b.fehlt&&t6b.schreib.length===1&&t6b.schreib[0].op==="update",
   "ein Klick schreibt genau einmal",t6b.schreib);
 p(!t6b.fehlt&&t6b.schreib[0].d.verbraucht===true&&t6b.schreib[0].d.verbraucht_fuer_measurement_id===55,
   "und haelt fest, fuer welche Massaufnahme der Rest gebraucht wurde",t6b.schreib);
 p(!t6b.fehlt&&!("company_id" in t6b.schreib[0].d),
   "der Client schickt KEINE company_id mit",t6b.schreib);
 p(t6b.frei===0,"der Rest ist danach aus dem Lager verschwunden",t6b);

 const t6c=await page.evaluate(async()=>{
  window.__schreib=[]; window.__updateLeer=true;
  reststuecke=[{id:41,breite_mm:300,laenge_mm:2500,verbraucht:false}];
  const box=document.createElement("div"); box.id="__t6c"; document.body.appendChild(box);
  const pl={art:"rolle",erledigtFuer:55,streifenbreiten:[250],
    gruppen:[{breite:250,abschnittLaenge:2000,jeAbschnitt:4,abschnitte:1,
      streifen:[{stuecke:[{nr:1,laenge:2000}],rest:0}]}],
    moeglich:[{breite:1000,restBreite:0,rollenLaenge:2000,jeAbschnitt:4,abschnitte:1,abschnittLaenge:2000}]};
  box.innerHTML=restBlockHtml(pl,"Titanzink");
  box.querySelector("[data-rest-verwenden]").click();
  await new Promise(r=>setTimeout(r,150));
  const t=box.textContent; const frei=(reststuecke||[]).length;
  box.remove(); window.__updateLeer=false;
  return {meldung:/nichts geändert/i.test(t), frei};
 });
 p(t6c.meldung&&t6c.frei===1,
   "0 geschriebene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1)",t6c);

 // =========================================================== 7
 console.log("\n7 · Verschiedene Materialarten und Abmessungen");
 const t7=await page.evaluate(()=>{
  const raus={};
  [[0,[2000,1500,900],250],[3,[3000,2000],300],[5,[1800,1200,600],180],
   [2,[5000,2500],500],[0,[700],120]].forEach((f,i)=>{
   const pl=__plan(f[0],f[1],f[2],[1000,670]);
   const b=zuBilanz(pl); raus["fall"+i]={auf:b&&b.aufgeht,diff:__vonHand(pl).diff};
  });
  // Zwei Streifenbreiten in EINEM Plan (Freies Profil)
  const mehr={art:"rolle",streifenbreiten:[300,180],
   gruppen:[
    {breite:300,abschnittLaenge:2000,jeAbschnitt:3,abschnitte:1,rollenLaenge:2000,
     streifen:[{stuecke:[{nr:1,laenge:2000}],rest:0},{stuecke:[{nr:2,laenge:1200}],rest:800}]},
    {breite:180,abschnittLaenge:1000,jeAbschnitt:5,abschnitte:1,rollenLaenge:1000,
     streifen:[{stuecke:[{nr:3,laenge:1000}],rest:0}]}],
   moeglich:[{breite:1000,zeilen:[
     {breite:300,jeAbschnitt:3,abschnitte:1,abschnittLaenge:2000,rollenLaenge:2000,restBreite:100},
     {breite:180,jeAbschnitt:5,abschnitte:1,abschnittLaenge:1000,rollenLaenge:1000,restBreite:100}]}]};
  raus.mehrBreiten={geo:zuGeometrie(mehr).length,
   reste:restAlle(mehr).map(x=>({l:x.laenge_mm,b:x.breite_mm,n:x.anzahl,q:x.quelle}))};
  return raus;
 });
 [0,1,2,3,4].forEach(i=>p(t7["fall"+i].auf===true&&Math.abs(t7["fall"+i].diff)<1e-6,
   "Fall "+(i+1)+": andere Masse, andere Fuge - die Bilanz geht auf",t7["fall"+i]));
 p(t7.mehrBreiten.geo===2,"ein Plan mit zwei Streifenbreiten liefert zwei Geometrien",t7.mehrBreiten);
 p(t7.mehrBreiten.reste.filter(x=>x.b===100).length===2,
   "und JEDE Breite bekommt ihren eigenen seitlichen Rand",t7.mehrBreiten.reste);
 p(t7.mehrBreiten.reste.some(x=>x.b===300&&x.n===1&&/ungenutzt/i.test(x.q)),
   "der ungenutzte dritte 300er Streifenplatz faellt nicht unter den Tisch",t7.mehrBreiten.reste);

 // =========================================================== 8
 console.log("\n8 · Der bestehende Zuschnitt bleibt korrekt");
 const t8=await page.evaluate(()=>{
  // Mit Fuge 0 - dem Startwert des Betriebs - darf sich KEINE Zahl aendern.
  blechSchnittfuge=0;
  const je=ebaStreifenJeAbschnitt(1000,250);
  const rand=ebaRestBreite(1000,250,4);
  const pl=__plan(0,[2070,2070,1420,1200],250,[1000,670]);
  const best=pl.moeglich[0];
  return {je,rand,breite:best.breite,abschnitte:best.abschnitte,
          L:pl.gruppen[0].abschnittLaenge,flaeche:+best.flaeche.toFixed(4),
          restBreite:best.restBreite};
 });
 p(t8.je===4&&t8.rand===0,"ohne Fuge: 4 Streifen aus 1000 mm, kein Rand",t8);
 p(t8.L===2070,"die Abschnittlaenge ist unveraendert das laengste Stueck",t8);
 p(t8.breite===1000&&t8.abschnitte===1&&Math.abs(t8.flaeche-2.07)<1e-9,
   "der Plan ist Zahl fuer Zahl derselbe wie vor v3.26",t8);

 const t8b=await page.evaluate(()=>{
  // Ein aelterer gespeicherter Plan OHNE jeAbschnitt darf seine Reste behalten.
  restMindestlaenge=1000;
  const alt={art:"rolle",streifenbreiten:[250],
   gruppen:[{breite:250,abschnittLaenge:2070,streifen:[
     {stuecke:[{nr:1,laenge:2070}],rest:0},
     {stuecke:[{nr:2,laenge:800}],rest:1270}]}],
   moeglich:[{breite:1000,restBreite:0,rollenLaenge:4140}]};
  return {kand:restKandidaten(alt), bilanz:zuBilanz(alt)};
 });
 p(t8b.kand.length===1&&t8b.kand[0].laenge_mm===1270,
   "ein alter Plan ohne Streifenzahl behaelt seine Reste",t8b.kand);
 p(t8b.bilanz===null,
   "aber eine Bilanz wird dafuer NICHT geschaetzt - lieber gar keine",t8b);

 const t8c=await page.evaluate(()=>{
  // Ein Plan ganz OHNE moeglich-Eintrag (keine Rolle passt, oder ein alter
  // Teilplan): zuGeometrie() liefert dafuer nichts. Der Rest am Ende eines
  // Streifens ist trotzdem da - er haengt nur an der Gruppe, nicht an der
  // Rolle. Genau das ging bis v3.25 verloren.
  restMindestlaenge=1000;
  const alt={art:"rolle",streifenbreiten:[250],
   gruppen:[{breite:250,streifen:[{stuecke:[{nr:1,laenge:800}],rest:1270}]}],
   moeglich:[]};
  return {geo:zuGeometrie(alt).length, kand:restKandidaten(alt)};
 });
 p(t8c.geo===0,"ohne passende Rolle gibt es keine Rollengeometrie",t8c);
 p(t8c.kand.length===1&&t8c.kand[0].laenge_mm===1270,
   "der Streifenrest bleibt trotzdem erhalten - er haengt an der Gruppe",t8c.kand);

 // =========================================================== 9
 console.log("\n9 · Abhaken bleibt korrekt");
 const t9=await page.evaluate(async()=>{
  window.__schreib=[]; zuschnittErledigt=[];
  const pl=__plan(0,[2000,1500],250,[1000]);
  pl.erledigtFuer=55;
  const box=document.createElement("div"); box.id="__t9"; document.body.appendChild(box);
  box.innerHTML=zuschnittHtml(pl);
  const knoepfe=box.querySelectorAll("[data-ze-nr]").length;
  const erster=box.querySelector("[data-ze-nr]");
  if(erster)erster.click();
  await new Promise(r=>setTimeout(r,150));
  const s=(window.__schreib||[]).filter(x=>x.t==="zuschnitt_erledigt");
  box.remove();
  return {knoepfe,schreib:s};
 });
 p(t9.knoepfe>=2,"die Positionsnummern sind weiterhin antippbar",t9.knoepfe);
 p(t9.schreib.length===1&&t9.schreib[0].op==="upsert",
   "ein Tipp schreibt genau einmal, per upsert",t9.schreib);
 p(t9.schreib.length===1&&!("company_id" in (t9.schreib[0].d[0]||t9.schreib[0].d)),
   "ohne company_id vom Client",t9.schreib);
 p(t9.schreib.length===1&&(t9.schreib[0].d[0]||t9.schreib[0].d).laenge_mm>0,
   "mit den Massen als Beleg (fuer die Konfliktpruefung)",t9.schreib);

 // =========================================================== 10
 console.log("\n10 · Abhaken ohne Verbindung");
 const t10=await page.evaluate(async()=>{
  window.__schreib=[]; zuschnittErledigt=[];
  const alt=navigator.onLine;
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false});
  const r=await zeSetzen(55,[1],true,{laenge_mm:2000,breite_mm:250,merkmal:""});
  const eintraege=(typeof wsAlle==="function")?await wsAlle():[];
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>alt});
  return {db:(window.__schreib||[]).length, warten:eintraege.filter(e=>e.tabelle==="zuschnitt_erledigt").length,
          fehler:r&&r.fehler||null};
 });
 p(t10.db===0,"ohne Netz geht KEIN Aufruf an die Datenbank",t10);
 p(t10.warten===1,"der Haken wartet stattdessen in der Warteschlange",t10);

 // =========================================================== 11
 console.log("\n11 · Konfliktpruefung bleibt korrekt");
 const t11=await page.evaluate(async()=>{
  // Der Beleg (Laenge/Breite) entscheidet, ob der wartende Haken noch passt.
  const pl=__plan(0,[2000,1500],250,[1000]);
  window.__einzeln={measurements:{id:55,type:"einlaufblech_gerade",
    data:{abwicklung:250,rollen:{gruppen:pl.gruppen,moeglich:pl.moeglich,
      abschnittLaenge:pl.gruppen[0].abschnittLaenge}}}};
  const passt=await wsHakenPasst({measurement_id:55,stueck_nr:1,laenge_mm:2000,breite_mm:250},false);
  const passtNicht=await wsHakenPasst({measurement_id:55,stueck_nr:1,laenge_mm:1234,breite_mm:250},false);
  const entschieden=await wsHakenPasst({measurement_id:55,stueck_nr:1,laenge_mm:1234,breite_mm:250},true);
  return {passt,passtNicht,entschieden};
 });
 p(t11.passt&&t11.passt.ok===true,"ein unveraenderter Zuschnitt wird uebertragen",t11.passt);
 p(t11.passtNicht&&t11.passtNicht.ok===false&&/anderes Mass/i.test(t11.passtNicht.text||""),
   "ein geaenderter Zuschnitt ergibt einen Konflikt mit Begruendung",t11.passtNicht);
 p(t11.entschieden&&t11.entschieden.ok===true,
   "\"meine Fassung nehmen\" schreibt ihn dann doch",t11.entschieden);

 // =========================================================== 12
 console.log("\n12 · Die Ruestliste bleibt korrekt");
 const t12=await page.evaluate(async()=>{
  zuschnittErledigt=[];
  const pl=__plan(0,[2000,1500,900],250,[1000]);
  const m={id:77,project_id:7,type:"einlaufblech_gerade",title:"Dach",
    data:{abwicklung:250,material:2,rollen:{gruppen:pl.gruppen,moeglich:pl.moeglich,
      abschnittLaenge:pl.gruppen[0].abschnittLaenge}}};
  const rp=rlPlan(m);
  let doc=""; const alt=window.open;
  window.open=()=>({document:{write:t=>{doc+=t},close:()=>{}},focus:()=>{},print:()=>{}});
  await ruestlisteMassaufnahme(m);
  window.open=alt;
  return {gruppen:(rp&&rp.gruppen||[]).length, stuecke:(rp&&rp.gruppen||[]).reduce((a,g)=>a+(g.anzahl||1),0),
          kaestchen:(doc.match(/<span class="rl-box[ "]/g)||[]).length, kopf:/RÜSTLISTE/i.test(doc),
          adresse:/Musterweg 1/.test(doc)};
 });
 p(t12.gruppen>0,"die Ruestliste baut ihren Plan weiterhin",t12);
 p(t12.kaestchen===3,"drei Stuecke, drei Kaestchen zum Abhaken von Hand",t12);
 p(t12.kopf&&t12.adresse,"mit Kopf und Objektadresse",t12);

 // =========================================================== 13
 console.log("\n13 · Die Modulschalter bleiben korrekt");
 const t13=await page.evaluate(()=>{
  const pl=__plan(0,[2000,1500],250,[1000]); pl.erledigtFuer=55;
  projektModule={haupt:true,material:true,zuschnitt:false};
  const aus=zuschnittHtml(pl);
  projektModule={haupt:true,material:true,zuschnitt:true};
  const an=zuschnittHtml(pl);
  const box=document.createElement("div"); document.body.appendChild(box);
  box.innerHTML=aus; const nAus=box.querySelectorAll("[data-ze-nr]").length;
  box.innerHTML=an;  const nAn =box.querySelectorAll("[data-ze-nr]").length;
  box.remove();
  return {nAus,nAn, grundAus:/Zuschnitt und Abhaken/.test(aus),
          liste:/1'?500|1500/.test(aus.replace(/’/g,"'")),
          bilanzAus:/Materialbilanz/.test(aus), bilanzAn:/Materialbilanz/.test(an)};
 });
 p(t13.nAus===0&&t13.nAn>0,"ohne Modul wird nicht abgehakt, mit Modul schon",t13);
 p(t13.grundAus,"und der Grund steht dabei (v3.22)",t13);
 p(t13.liste,"die Liste selbst bleibt auch ohne Modul sichtbar",t13);
 p(t13.bilanzAus&&t13.bilanzAn,
   "die Materialbilanz haengt nicht am Abhak-Modul - sie beschreibt das Material",t13);

 // =========================================================== 14
 console.log("\n14 · Die Bilanz als EINE Quelle, keine zweite Rechnung");
 // Am Quelltext, nicht ueber fetch: eine file://-Seite darf nicht lesen.
 const fs=require("fs");
 const lies=d=>fs.readFileSync(d,"utf-8");
 const q33=lies("js/33-zuschnitt.js"), q42=lies("js/42-reste.js"), q29=lies("js/29-einlaufblech-aufnahme.js");
 const module=["js/29-einlaufblech-aufnahme.js","js/30-einlaufblech-konisch-aufnahme.js",
  "js/31-freies-profil-aufnahme.js","js/32-mauerabdeckung-aufnahme.js","js/34-kehle-aufnahme.js",
  "js/36-lukarne-aufnahme.js","js/37-kamin-aufnahme.js","js/38-einfassung-aufnahme.js",
  "js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js","js/49-projekt-zuschnitt.js"];
 // Positiv geprueft, nicht ueber ein Verdachtsmuster: JEDES "restBreite:" in
 // einem Modul muss ueber ebaRestBreite() laufen. Eine selbst gerechnete Zahl
 // - egal wie geschrieben - faellt damit auf.
 let eigeneRand=0, eigeneBilanz=0; const randStellen=[];
 module.forEach(d=>{const t=lies(d);
  (t.match(/restBreite\s*:[^,;\n}]*/g)||[]).forEach(m=>{
   if(!/ebaRestBreite\(/.test(m)&&!/z\.restBreite|g\.restBreite|best\.restBreite/.test(m)){
    eigeneRand++; randStellen.push(d+": "+m.trim().slice(0,60));}});
  if(/function\s+\w*[Bb]ilanz/.test(t))eigeneBilanz++;});
 const kopf=q33.indexOf("function zuBilanz(");
 const t14={eigeneRand,eigeneBilanz,randStellen,
  bilanzEinmal:(q33.match(/function zuBilanz\(/g)||[]).length,
  restAlleEinmal:(q42.match(/function restAlle\(/g)||[]).length,
  randEinmal:(q29.match(/function ebaRestBreite\(/g)||[]).length,
  bilanzNutztRestAlle:/restAlle/.test(q33.slice(kopf,kopf+900))};
 p(t14.eigeneRand===0,"kein Modul rechnet den seitlichen Rand mehr selbst",randStellen);
 p(t14.eigeneBilanz===0,"kein Modul hat eine eigene Materialbilanz",t14);
 p(t14.bilanzEinmal===1&&t14.restAlleEinmal===1&&t14.randEinmal===1,
   "zuBilanz, restAlle und ebaRestBreite gibt es je genau einmal",t14);
 p(t14.bilanzNutztRestAlle,"die Bilanz nimmt die Reste aus restAlle - keine zweite Ermittlung",t14);

 // =========================================================== Bildschirmbreiten
 console.log("\nBildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:800});
  const ueber=await page.evaluate(()=>{
   const pl=(function(){const p2=__plan(3,[2000,1500,900],250,[1000,670]);p2.erledigtFuer=55;return p2})();
   const box=document.createElement("div"); box.id="__breit";
   box.style.cssText="padding:12px"; document.body.appendChild(box);
   box.innerHTML=zuschnittHtml(pl);
   const w=document.documentElement.clientWidth;
   let raus=0, wo=[];
   box.querySelectorAll("*").forEach(e=>{const r=e.getBoundingClientRect();
     // .scroll-Rahmen duerfen breiter sein - genau dafuer sind sie da.
     if(r.width>0&&r.right>w+1&&!e.closest(".scroll")){raus++;
       wo.push(String(e.className).slice(0,30)||e.tagName)}});
   const scroll=document.documentElement.scrollWidth>w+1;
   const bil=box.querySelector(".zu-bilanz");
   const bilRaus=bil?bil.getBoundingClientRect().right>w+1:false;
   box.remove();
   return {raus,wo,scroll,bilRaus};
  });
  p(ueber.raus===0&&!ueber.scroll&&!ueber.bilRaus,
    w+" px: die Seite scrollt nicht, und die Materialbilanz passt",ueber);
 }

 console.log("\nSauberkeit");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 console.log("\npruefstand-reste-schnittfuge-v3-26: "+ok+"/"+(ok+fail)+
   (fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
