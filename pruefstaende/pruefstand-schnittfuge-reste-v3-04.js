// Punkt 2 der Ideenliste: Schnittfuge und Reststuecke-Lager.
//
// Bis v3.03 rechnete der Rollenblech-Zuschnitt ohne Schnittbreite und ohne
// Wiederverwendung von Resten - die Zahlen waren dadurch systematisch etwas
// zu optimistisch (CLAUDE.md 92.9, 105.7).
//
// Der Betrieb hat 0 mm als Startwert der Schnittfuge gewaehlt: damit aendert
// sich zunaechst KEINE bestehende Zahl. Genau das wird hier zuerst gemessen -
// und danach, dass ein echter Wert auch wirklich wirkt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-schnittfuge-reste-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 const dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 const ATTRAPPE=`window.supabase={createClient:()=>{
  const tabelle=t=>({
   select:()=>tabelle(t), eq:()=>tabelle(t), order:()=>tabelle(t),
   insert:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"insert",d});
     return {select:()=>Promise.resolve({data:(d||[]).map((x,i)=>Object.assign({id:900+i},x)),error:null})}},
   update:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"update",d});
     return {eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})}},
   delete:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})}),
   limit:()=>Promise.resolve({data:[],error:null}),
   maybeSingle:()=>Promise.resolve({data:null,error:null})
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
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L"};
  allProfiles=[]; meineRechte={admin:true}; allProjects=[];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; restMindestlaenge=1000;
  reststuecke=[]; appSettingsId=1; window.__schreib=[];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ------------------------------------------- A Streifen je Abschnitt
 console.log("A · Wie viele Streifen nebeneinander");
 // 1000er Rolle, 250er Abwicklung: ohne Fuge vier Streifen (4x250 = 1000).
 // Mit 3 mm Fuge braucht es zwischen ihnen drei Schnitte: 4x250 + 3x3 = 1009
 // > 1000, also passen nur noch drei.
 const a0=await page.evaluate(()=>{blechSchnittfuge=0;return ebaStreifenJeAbschnitt(1000,250)});
 p(a0===4,"ohne Schnittfuge: 4 Streifen aus 1000 mm bei 250 mm",a0);
 const a3=await page.evaluate(()=>{blechSchnittfuge=3;return ebaStreifenJeAbschnitt(1000,250)});
 p(a3===3,"mit 3 mm Schnittfuge sind es nur noch 3",a3);
 const a670=await page.evaluate(()=>{blechSchnittfuge=0;return ebaStreifenJeAbschnitt(670,250)});
 p(a670===2,"670er Rolle bei 250 mm: 2 Streifen",a670);
 const aNull=await page.evaluate(()=>ebaStreifenJeAbschnitt(0,250));
 p(aNull===0,"ohne Rollenbreite gibt es keine Streifen",aNull);

 // ------------------------------------------- B Die Packrechnung
 console.log("\nB · Die Schnittfuge wirkt in der Packrechnung");
 // Die Fuge faellt ZWISCHEN zwei Stuecken an, nicht vor dem ersten: der
 // Abschnitt ist beim Abziehen von der Rolle schon abgetrennt. n Stuecke
 // brauchen deshalb n-1 Fugen - dieselbe Regel, die
 // ebaStreifenJeAbschnitt() in der Breite verwendet.
 //
 // Bis v3.08 rechnete die Laengsrichtung mit n Fugen UND verglich das
 // laengste Stueck plus Fuge gegen einen Abschnitt ohne Fugenzugabe. Damit
 // war ab jeder Fuge > 0 jedes laengste Stueck "zu lang" und der ganze Plan
 // leer. Beide Firmen standen auf 0, deshalb ist es nie aufgefallen.
 // In v3.09 korrigiert; die folgenden Erwartungen sind die der richtigen
 // Regel und von Hand nachgerechnet.
 const eng=await page.evaluate(()=>{
  const bl=[{nr:1,laenge:1000},{nr:2,laenge:1000}];
  const n=(f,L)=>{blechSchnittfuge=f;const r=ebaPackeInStreifen(bl,L);
                  blechSchnittfuge=0;return r.streifen?r.streifen.length:null};
  return {ohne:n(0,2070),           // 1000+1000        = 2000 <= 2070 -> 1
          mit40:n(40,2070),         // 1000+40+1000     = 2040 <= 2070 -> 1
          mit100:n(100,2070),       // 1000+100+1000    = 2100 >  2070 -> 2
          knapp:n(70,2070)};        // 1000+70+1000     = 2070 <= 2070 -> 1
 });
 p(eng.ohne===1,"ohne Fuge liegen beide im selben Streifen",eng);
 p(eng.mit40===1,"mit 40 mm Fuge passen sie weiterhin zusammen (1000+40+1000=2040)",eng);
 p(eng.knapp===1,"bei genau passender Fuge (2070) noch zusammen",eng);
 p(eng.mit100===2,"mit 100 mm Fuge braucht es zwei Streifen (2100 > 2070)",eng);
 // Ein einzelnes Stueck braucht keine Fuge - der Abschnitt ist schon
 // abgetrennt. Erst ein Stueck laenger als der Abschnitt ist zu lang.
 const zuLang=await page.evaluate(()=>{
  const f=(l,fu)=>{blechSchnittfuge=fu;const r=ebaPackeInStreifen([{nr:1,laenge:l}],2070);
                   blechSchnittfuge=0;
                   return {streifen:r.streifen?r.streifen.length:null,zuLang:(r.zuLang||[]).length}};
  return {passt:f(2050,40), genau:f(2070,40), zuLang:f(2100,40)};
 });
 p(zuLang.passt.streifen===1&&zuLang.passt.zuLang===0,
   "ein einzelnes Stueck von 2050 passt in 2070 - eine Fuge davor gibt es nicht",zuLang.passt);
 p(zuLang.genau.streifen===1,"auch ein Stueck von genau 2070 passt",zuLang.genau);
 p(zuLang.zuLang.streifen===null&&zuLang.zuLang.zuLang===1,
   "erst ein Stueck laenger als der Abschnitt wird als zu lang gemeldet",zuLang.zuLang);

 // ------------------------------------------- C Vorgabe 0 aendert nichts
 console.log("\nC · Mit der Vorgabe 0 mm bleibt jede Zahl wie bisher");
 const gleich=await page.evaluate(()=>{
  const bl=[{nr:1,laenge:2000},{nr:2,laenge:1800},{nr:3,laenge:1600},{nr:4,laenge:1400},{nr:5,laenge:1200}];
  blechSchnittfuge=0;
  const r=ebaPackeInStreifen(bl,2000);
  return {streifen:r.streifen.length,je:ebaStreifenJeAbschnitt(1000,250)};
 });
 p(gleich.streifen===5&&gleich.je===4,"dieselben Zahlen wie vor v3.04",gleich);

 // ------------------------------------------- D Reste zu einem Plan
 console.log("\nD · Was bei einem Zuschnitt uebrig bleibt");
 const kand=await page.evaluate(()=>{
  restMindestlaenge=1000;
  const plan={art:"rolle",streifenbreiten:[250],
   gruppen:[{breite:250,abschnittLaenge:2070,streifen:[
     {stuecke:[{nr:1,laenge:2070}],rest:0},
     {stuecke:[{nr:2,laenge:800}],rest:1270},
     {stuecke:[{nr:3,laenge:1600}],rest:470}]}],
   moeglich:[{breite:1000,restBreite:0,rollenLaenge:4140}]};
  return restKandidaten(plan);
 });
 p(kand.length===1&&kand[0].laenge_mm===1270&&kand[0].breite_mm===250,
   "nur der Rest ueber der Mindestlaenge zaehlt (1270, nicht 470 und nicht 0)",kand);

 const seit=await page.evaluate(()=>{
  const plan={art:"rolle",streifenbreiten:[250],gruppen:[{breite:250,streifen:[]}],
   moeglich:[{breite:1000,restBreite:0,rollenLaenge:4140}]};
  const ohneRand=restKandidaten(plan).length;
  plan.moeglich[0].restBreite=250;
  const mitRand=restKandidaten(plan);
  return {ohneRand,mitRand};
 });
 p(seit.ohneRand===0&&seit.mitRand.length===1&&seit.mitRand[0].breite_mm===250,
   "der seitliche Rest der Rolle wird mitgezaehlt, wenn er breit genug ist",seit);

 const grenze=await page.evaluate(()=>{
  restMindestlaenge=2000;
  const plan={art:"rolle",streifenbreiten:[250],
   gruppen:[{breite:250,streifen:[{stuecke:[],rest:1270}]}],moeglich:[]};
  const r=restKandidaten(plan); restMindestlaenge=1000; return r.length;
 });
 p(grenze===0,"eine hoehere Mindestlaenge laesst den Rest weg",grenze);

 // ------------------------------------------- E Passende Reste aus dem Lager
 console.log("\nE · Passende Reste werden angezeigt, nicht eingeplant");
 const passend=await page.evaluate(()=>{
  reststuecke=[
   {id:1,breite_mm:300,laenge_mm:2500,verbraucht:false,material_name:"Titanzink"},
   {id:2,breite_mm:200,laenge_mm:3000,verbraucht:false},   // zu schmal
   {id:3,breite_mm:260,laenge_mm:1200,verbraucht:false},   // kuerzer als das laengste
   {id:4,breite_mm:400,laenge_mm:5000,verbraucht:true}];   // verbraucht
  return restPassend(250,[2070,900]).map(r=>({id:r.id,lang:r.passtFuerLaengste}));
 });
 p(passend.length===2,"zu schmale und verbrauchte Reste fallen weg",passend);
 p(passend.some(r=>r.id===1&&r.lang===true),"ein langer Rest ist als solcher erkannt",passend);
 p(passend.some(r=>r.id===3&&r.lang===false),"ein kurzer Rest wird gezeigt, aber gekennzeichnet",passend);

 const block=await page.evaluate(()=>{
  const plan={art:"rolle",streifenbreiten:[250],material:2,
   gruppen:[{breite:250,streifen:[{stuecke:[{nr:1,laenge:800}],rest:1270}]}],moeglich:[]};
  return restBlockHtml(plan,plan.material);
 });
 p(/Reststücke-Lager/.test(block),"der Block nennt das Lager",block.slice(0,80));
 p(/nicht automatisch eingeplant/.test(block),"und sagt ausdruecklich, dass nichts automatisch eingeplant wird");
 p(/data-rest-einlagern/.test(block),"der Knopf zum Einlagern ist da");

 // Der Block haengt in der GEMEINSAMEN Zuschnittdarstellung - also in jedem
 // Modul, ohne dass es zehnmal eingebaut waere.
 const inZuschnitt=fs.readFileSync(path.join(process.cwd(),"js/33-zuschnitt.js"),"utf8");
 p(/restBlockHtml\(p,p\.material\)/.test(inZuschnitt),
   "zuschnittHtml() haengt ihn einmal fuer alle Module ein");

 // ------------------------------------------- F Einlagern
 console.log("\nF · Einlagern");
 const eingelagert=await page.evaluate(async()=>{
  window.__schreib=[]; reststuecke=[];
  const r=await restEinlagern([{laenge_mm:1270,breite_mm:250,anzahl:1}],"aus einem Zuschnitt");
  return {r,schreib:window.__schreib,lager:reststuecke.length};
 });
 p(!eingelagert.r.fehler&&eingelagert.r.anzahl===1,"der Rest wird angelegt",eingelagert.r);
 p(eingelagert.lager===1,"und steht danach im Lager",eingelagert.lager);
 const nutz=eingelagert.schreib[0];
 p(nutz&&nutz.t==="reststuecke"&&!("company_id" in (nutz.d[0]||{})),
   "der Client schickt KEINE company_id mit - die setzt die Datenbank",nutz&&nutz.d[0]);

 // Ein von RLS blockiertes INSERT meldet keinen Fehler, es betrifft 0 Zeilen.
 const still=await page.evaluate(async()=>{
  const alt=sb.from;
  sb.from=()=>({insert:()=>({select:()=>Promise.resolve({data:[],error:null})})});
  const r=await restEinlagern([{laenge_mm:1270,breite_mm:250}],"test");
  sb.from=alt; return r;
 });
 p(!!still.fehler,"ein still gescheitertes Speichern gilt NICHT als Erfolg",still);

 // ------------------------------------------- G Einstellungen
 console.log("\nG · Die Einstellungen");
 await page.evaluate(()=>{$("settingsModal").hidden=false;renderSchnittfugeFelder()});
 const felder=await page.evaluate(()=>({f:$("set_schnittfuge").value,m:$("set_restMindest").value}));
 p(felder.f==="0"&&felder.m==="1000","die Felder zeigen die aktuellen Werte",felder);
 const gespeichert=await page.evaluate(async()=>{
  window.__schreib=[];
  $("set_schnittfuge").value="3"; $("set_restMindest").value="1500";
  await $("saveSchnittfuge").onclick();
  return {fuge:blechSchnittfuge,mind:restMindestlaenge,schreib:window.__schreib};
 });
 p(gespeichert.fuge===3&&gespeichert.mind===1500,"Speichern uebernimmt beide Werte",gespeichert);
 p(gespeichert.schreib.some(x=>x.t==="app_settings"&&x.d&&x.d.schnittfuge_mm===3),
   "und schreibt sie nach app_settings",gespeichert.schreib);
 const abgelehnt=await page.evaluate(async()=>{
  $("set_schnittfuge").value="99";
  await $("saveSchnittfuge").onclick();
  return {text:$("set_schnittfugeHinweis").textContent,fuge:blechSchnittfuge};
 });
 p(/zwischen 0 und 50/.test(abgelehnt.text)&&abgelehnt.fuge===3,
   "ein unsinniger Wert wird abgelehnt, der alte bleibt",abgelehnt);

 console.log("\nSauberkeit");
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-schnittfuge-reste: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
