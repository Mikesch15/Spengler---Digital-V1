// Prueft v3.255: ein Projekt laesst sich schon BEIM ANLEGEN zuteilen.
//
// Ansage des Anwenders: "Beim projekt erstellen, soll auch schon ein
// zugeteilter mitarbeiter ausgewaehlt werden koennen."
//
// Bis v3.254 ging das erst danach, im Stammdaten-Formular des Projekts
// (js/24): anlegen, oeffnen, Stammdaten aufklappen, ankreuzen, speichern.
// Wer schon beim Anlegen wusste, wer hingeht, musste denselben Weg zweimal
// gehen.
//
// WAS HIER GEPRUEFT WIRD
//   A  Es ist DIESELBE Liste wie im Cockpit - eine Quelle, eine Sortierung.
//      Die Zusage, die sonst beim naechsten Mitarbeiterkonto leise bricht.
//   B  Angekreuzt wird nichts von selbst, auch man selbst nicht. Und der
//      Satz darunter sagt, was bei leerer Auswahl passiert - beim Anlegen
//      ein anderer als im Cockpit, weil man es selbst anlegt.
//   C  Die Auswahl landet wirklich im insert, in derselben Spalte
//      zugeteilt_an. Leer bleibt ein leeres Array, nicht null.
//   D  Nach dem Anlegen sind die Haken weg - sonst truege das naechste
//      Projekt stillschweigend die Zuteilung des vorigen. Das ist die
//      Gegenprobe, die ein falsch zugeteiltes Projekt verhindert.
//   E  Ohne Verbindung geht die Zuteilung MIT in die Warteschlange.
//   F  Der Vorschlag des Zaehlwerks (wer bei diesem Auftraggeber sonst
//      zugeteilt ist) haengt am getippten Auftraggeber - und kreuzt nichts
//      von selbst an.
//   G  Gegenprobe zur Reichweite: ein Vorschlag im Anlegen-Formular darf
//      NICHT den Haken im Cockpit setzen. Beide Kaesten tragen dieselben
//      data-Attribute; vor v3.255 gab es nur einen, und der Beobachter
//      griff fest auf den des Cockpits zu.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-zuteilung-anlegen-v3-255.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1200},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 const dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,
   {id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee"},
   {id:"u3",first_name:"Anna",last_name:"Meier",role:"employee"}];
  meineRechte={admin:true};
  // Zwei Projekte desselben Auftraggebers, beide an Anna - daraus entsteht
  // der Vorschlag in Abschnitt F.
  allProjects=[
   {id:"p1",name:"Dach Nord",order_no:"1001",object:"Weg 1",customer:"Kirchgemeinde Worb",
    zugeteilt_an:["u3"],archived:false,status:"offen",created_by:"u1"},
   {id:"p2",name:"Dach Sued",order_no:"1002",object:"Weg 2",customer:"Kirchgemeinde Worb",
    zugeteilt_an:["u3"],archived:false,status:"offen",created_by:"u1"}];
  zaehlwerkAktiv=true;
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  $("projectsModal").hidden=false;
  renderProjectList();
 });
 await page.waitForTimeout(400);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const kasten=()=>page.evaluate(()=>{
  const box=$("newProjectZuteilung");
  return {da:!!box,
   namen:box?[...box.querySelectorAll(".zuteilung-person span")].map(x=>x.textContent.trim()):[],
   ids:box?[...box.querySelectorAll("[data-zuteilung]")].map(x=>x.dataset.zuteilung):[],
   angekreuzt:box?[...box.querySelectorAll("[data-zuteilung]")].filter(x=>x.checked).map(x=>x.dataset.zuteilung):[],
   hinweis:($("newProjectZuteilungHinweis")||{}).textContent||""};
 });

 console.log("\nA · Dieselbe Liste wie im Cockpit");
 const a=await kasten();
 p(a.da,"A1 der Kasten steht im Anlegen-Formular",a);
 // Eine Quelle, eine Sortierung: die Namen muessen zeichengleich mit denen
 // im Cockpit sein. Haetten die beiden Orte je eigenen Code, faellt das hier
 // beim naechsten Mitarbeiterkonto auf - und nicht erst beim Anwender.
 const ausCockpit=await page.evaluate(()=>{
  const h=document.createElement("div");
  h.innerHTML=zuteilungListeHtml([]);
  return [...h.querySelectorAll(".zuteilung-person span")].map(x=>x.textContent.trim());
 });
 p(a.namen.join("|")===ausCockpit.join("|")&&a.namen.length===3,
   "A2 dieselben Namen in derselben Reihenfolge wie zuteilungListeHtml()",{anlegen:a.namen,quelle:ausCockpit});
 p(a.namen[0]==="Anna Meier",
   "A3 nach Namen sortiert, nicht nach Reihenfolge der Konten",a.namen);

 console.log("\nB · Nichts wird von selbst angekreuzt");
 p(a.angekreuzt.length===0,
   "B1 beim Oeffnen ist niemand angekreuzt - auch man selbst nicht",a.angekreuzt);
 p(/Niemand zugeteilt/.test(a.hinweis)&&/du legst es an/.test(a.hinweis),
   "B2 und der Satz sagt, dass das Projekt dann bei EINEM SELBST landet",a.hinweis);
 // Gegenprobe: im Cockpit lautet derselbe Satz anders - dort hat jemand
 // anderes das Projekt angelegt.
 const satzCockpit=await page.evaluate(()=>zuteilungHinweisText(0,"Beat Krebs (hat es angelegt)"));
 p(/Beat Krebs/.test(satzCockpit)&&!/du legst es an/.test(satzCockpit),
   "B3 GEGENPROBE: derselbe Satz, im Cockpit mit dem Ersteller",satzCockpit);
 // Und mit Auswahl sagt er, was es bewirkt - sofort, nicht erst beim Speichern.
 await page.evaluate(()=>{
  const k=$("newProjectZuteilung").querySelector('[data-zuteilung="u2"]');
  k.checked=true; k.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await page.waitForTimeout(150);
 const b2=await kasten();
 p(/bei dieser Person/.test(b2.hinweis),
   "B4 ein Haken zieht den Satz sofort nach",b2.hinweis);

 console.log("\nC · Die Auswahl landet im insert");
 const c=await page.evaluate(async()=>{
  window.__log=[];
  const echt=sb.from;
  sb.from=(t)=>{
   if(t!=="projects")return echt(t);
   const q={};
   q.insert=(d)=>{window.__log.push({t,d});const r={};
     r.then=(f,g)=>Promise.resolve({data:[{id:"neu"}],error:null}).then(f,g);return r};
   q.select=()=>{const r={};r.order=()=>({then:(f,g)=>Promise.resolve({data:[],error:null}).then(f,g)});
     r.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g);return r};
   ["eq","order","limit","update","delete"].forEach(k=>{if(!q[k])q[k]=()=>q});
   return q;
  };
  $("newProjectName").value="Geraete Schopf";
  $("newProjectOrderNo").value="18224";
  $("newProjectObject").value="Enggisteinstrasse 4, 3076 Worb";
  $("newProjectCustomer").value="Kirchgemeinde Worb";
  await $("addProject").onclick();
  sb.from=echt;
  return window.__log.slice();
 });
 p(c.length===1&&c[0].t==="projects","C1 genau EIN Schreibvorgang, auf projects",c);
 p(Array.isArray(c[0]&&c[0].d.zugeteilt_an)&&c[0].d.zugeteilt_an.join(",")==="u2",
   "C2 die angekreuzte Person steht in zugeteilt_an",c[0]&&c[0].d);
 p(c[0]&&c[0].d.name==="Geraete Schopf"&&c[0].d.order_no==="18224",
   "C3 und die uebrigen Felder unveraendert",c[0]&&c[0].d);

 console.log("\nD · Nach dem Anlegen sind die Haken weg");
 await page.waitForTimeout(250);
 const d=await kasten();
 p(d.angekreuzt.length===0,
   "D1 GEGENPROBE: das naechste Projekt traegt NICHT die Zuteilung des vorigen",d.angekreuzt);
 p(/Niemand zugeteilt/.test(d.hinweis),"D2 und der Satz steht wieder auf Anfang",d.hinweis);

 console.log("\nE · Ohne Verbindung geht sie mit in die Warteschlange");
 const e=await page.evaluate(async()=>{
  window.__ws=[];
  const echtOff=window.wsIstOffline, echtEin=window.wsEinreihen;
  window.wsIstOffline=()=>true;
  window.wsEinreihen=async(o)=>{window.__ws.push(o);return {ok:true,tmpId:"tmp-1"}};
  const k=$("newProjectZuteilung").querySelector('[data-zuteilung="u3"]');
  k.checked=true;
  $("newProjectName").value="Offline Projekt";
  $("newProjectOrderNo").value="18225";
  $("newProjectObject").value="Weg 9";
  $("newProjectCustomer").value="Kunde X";
  await $("addProject").onclick();
  window.wsIstOffline=echtOff; window.wsEinreihen=echtEin;
  const neu=allProjects.find(x=>String(x.id)==="tmp-1");
  return {ws:window.__ws.slice(),inListe:neu?neu.zugeteilt_an:null};
 });
 p(e.ws.length===1&&e.ws[0].payload&&e.ws[0].payload.zugeteilt_an.join(",")==="u3",
   "E1 die Zuteilung steht im Warteschlangen-Eintrag",e.ws[0]&&e.ws[0].payload);
 p(e.inListe&&e.inListe.join(",")==="u3",
   "E2 und am wartenden Projekt in der Liste - sonst saehe man es bis zur Uebertragung nicht",e.inListe);

 console.log("\nF · Der Vorschlag haengt am Auftraggeber");
 await page.evaluate(()=>{
  // Die Projektliste wieder herstellen: das Anlegen in Abschnitt C laedt sie
  // neu, und die Attrappe liefert dabei eine leere Liste. Ohne andere
  // Projekte gaebe es nichts zu vergleichen - der Vorschlag waere dann
  // zurecht leer, und F2 pruefte nichts. (Beim ersten Lauf genau so
  // passiert: die Pruefung war rot, die App richtig.)
  allProjects=[
   {id:"p1",name:"Dach Nord",order_no:"1001",object:"Weg 1",customer:"Kirchgemeinde Worb",
    zugeteilt_an:["u3"],archived:false,status:"offen",created_by:"u1"},
   {id:"p2",name:"Dach Sued",order_no:"1002",object:"Weg 2",customer:"Kirchgemeinde Worb",
    zugeteilt_an:["u3"],archived:false,status:"offen",created_by:"u1"}];
  ["newProjectName","newProjectOrderNo","newProjectObject","newProjectCustomer"]
   .forEach(i=>{$(i).value=""});
  neuesProjektZuteilungZeichnen();
 });
 const leer=await page.evaluate(()=>$("newProjectZuteilungVorschlag").hidden);
 p(leer===true,"F1 ohne Auftraggeber kein Vorschlag - es gibt nichts zu vergleichen",leer);
 const f=await page.evaluate(async()=>{
  const feld=$("newProjectCustomer");
  feld.value="Kirchgemeinde Worb"; feld.dispatchEvent(new Event("input"));
  await new Promise(r=>setTimeout(r,150));
  const el=$("newProjectZuteilungVorschlag");
  return {versteckt:el.hidden,text:el.innerText.replace(/\s+/g," ").trim(),
   angekreuzt:[...$("newProjectZuteilung").querySelectorAll("[data-zuteilung]")]
     .filter(x=>x.checked).map(x=>x.dataset.zuteilung)};
 });
 p(f.versteckt===false&&/Anna Meier/.test(f.text),
   "F2 bei einem bekannten Auftraggeber wird vorgeschlagen, wer dort sonst zugeteilt ist",f);
 p(f.angekreuzt.length===0,
   "F3 GEGENPROBE: vorgeschlagen heisst NICHT angekreuzt - die Zuteilung bleibt eine Entscheidung",f.angekreuzt);
 const f2=await page.evaluate(async()=>{
  $("newProjectZuteilungVorschlag").querySelector("[data-zuteilung-vorschlag]").click();
  await new Promise(r=>setTimeout(r,150));
  return {angekreuzt:[...$("newProjectZuteilung").querySelectorAll("[data-zuteilung]")]
     .filter(x=>x.checked).map(x=>x.dataset.zuteilung),
   versteckt:$("newProjectZuteilungVorschlag").hidden};
 });
 p(f2.angekreuzt.join(",")==="u3","F4 ein Tipp uebernimmt ihn",f2);
 p(f2.versteckt===true,
   "F5 und er verschwindet danach - ein Knopf, der nichts mehr tut, gehoert weg",f2);

 console.log("\nG · Gegenprobe: die beiden Kaesten kommen sich nicht ins Gehege");
 const g=await page.evaluate(async()=>{
  // Den Kasten des Cockpits daneben aufbauen, wie er im Betrieb dasteht.
  $("cockpitZuteilung").innerHTML=zuteilungListeHtml([]);
  $("newProjectZuteilung").innerHTML=zuteilungListeHtml([]);
  $("newProjectZuteilungVorschlag").hidden=false;
  $("newProjectZuteilungVorschlag").innerHTML=
   '<button type="button" data-zuteilung-vorschlag="u2">Beat</button>';
  $("newProjectZuteilungVorschlag").querySelector("[data-zuteilung-vorschlag]").click();
  await new Promise(r=>setTimeout(r,150));
  const an=id=>[...$(id).querySelectorAll("[data-zuteilung]")].filter(x=>x.checked)
    .map(x=>x.dataset.zuteilung);
  return {anlegen:an("newProjectZuteilung"),cockpit:an("cockpitZuteilung")};
 });
 p(g.anlegen.join(",")==="u2",
   "G1 der Vorschlag setzt den Haken in SEINEM Kasten",g);
 p(g.cockpit.length===0,
   "G2 GEGENPROBE: und NICHT im Cockpit - dort ist ein anderes Projekt gemeint",g);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
