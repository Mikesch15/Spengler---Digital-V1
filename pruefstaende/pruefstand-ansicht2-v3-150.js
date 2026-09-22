// Prueft die ANSICHT 2.0 (v3.150) - die zweite Oberflaeche fuer dieselbe App.
//
// WAS HIER GEPRUEFT WIRD
//   A  Ohne Schalter ist die klassische Ansicht unveraendert da.
//   B  Mit Schalter erscheint die neue Ansicht mit ihren Registern.
//   C  Die Listen kommen aus den Daten der App, nicht aus eigenen.
//   D  Die Ablaufleiste rechnet richtig - besonders im leeren Fall.
//   E  Der Weg zurueck stellt den vorherigen Zustand wirklich wieder her.
//   F  Gegenproben: kein zweiter Schreibweg, keine zweite Rechtepruefung,
//      keine Stilregel, die ohne den Schalter wirkt.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Ob die Datenbank die Regeln durchsetzt. Diese Ansicht schreibt nichts;
//   sie ruft dieselben Funktionen wie die klassische Ansicht, und die sind
//   an ihrer eigenen Stelle geprueft. Genau das wird in F1/F2 belegt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ansicht2-v3-150.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const fs=require("fs");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:()=>{const f={};['select','order','limit','range','eq','in','not'].forEach(k=>f[k]=()=>f);
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})}
})};`;

// Die Anmeldung nachstellen. Bewusst nur das, was die neue Ansicht liest -
// so faellt auf, wenn sie heimlich noch etwas anderes braucht.
const anmelden=page=>page.evaluate(()=>{
 currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin"};
 companyName="Muster Spenglerei AG";
 allProjects=[
  {id:1,name:"Neubau Hofmatt",object:"Hofmattstrasse 4, 3400 Burgdorf",order_no:"26-011",customer:"Hofmatt AG",status:"in_arbeit",archived:false,updated_at:"2026-09-20T10:00:00Z"},
  {id:2,name:"Sanierung Kirche",object:"Kirchweg 1, 3550 Langnau",order_no:"26-004",customer:"Kirchgemeinde",status:"offen",archived:false,updated_at:"2026-09-18T10:00:00Z"},
  {id:3,name:"Altbau",object:"Bahnhofstrasse 9, 3000 Bern",order_no:"25-099",customer:"X AG",status:"abgeschlossen",archived:true,updated_at:"2026-01-01T10:00:00Z"}
 ];
 aufgabenListe=[
  {art:"erneut_freigeben",m:{id:11,project_id:1,type:"kamin_einfassung",title:"Kamin Ost",workflow_status:"in_bearbeitung",freigabe_verfallen:true}},
  {art:"ruesten",m:{id:12,project_id:2,type:"rinne_halbrund",title:"Rinne Nord",workflow_status:"zu_ruesten"}}
 ];
 $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
 if($("navWerkstatt"))$("navWerkstatt").hidden=false;
 if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
});

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad()});
 const page=await b.newPage({viewport:{width:390,height:844}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("console",m=>{
  if(m.type()!=="error")return;
  // Ohne Netz laedt die Pruefumgebung cdn.jsdelivr.net nicht (Supabase und
  // xlsx). Das ist eine Grenze der Umgebung, kein Fehler der App - und es
  // ist genau diese eine Meldung, die ausgenommen wird, nichts sonst.
  if(/ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(m.text()))return;
  fehler.push("console: "+m.text());
 });
 await page.addInitScript(STUB);
 await page.goto(APP);

 // ===== A0  Die Vorgabe (seit v3.151) =====================================
 // Bis v3.150 war die klassische Ansicht die Vorgabe, seit v3.151 die neue.
 // Geprueft wird beides: dass die Vorgabe greift UND dass sie eine bereits
 // getroffene Wahl NICHT umstoesst.
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 let a0=await page.evaluate(()=>({
  gespeichert:localStorage.getItem("sd_ansicht2"),
  vorgabe:a2Aktiv()
 }));
 p(a0.gespeichert===null&&a0.vorgabe===true,"A0 auf einem frischen Geraet gilt die neue Ansicht",a0);
 let a0b=await page.evaluate(()=>{
  localStorage.setItem("sd_ansicht2","ja");   const ja=a2Aktiv();
  localStorage.setItem("sd_ansicht2","nein"); const nein=a2Aktiv();
  return {ja,nein};
 });
 p(a0b.ja===true&&a0b.nein===false,"A0b eine ausdrueckliche Wahl schlaegt die Vorgabe",a0b);

 // Fuer alles Weitere: die klassische Ansicht als Ausgangspunkt, damit der
 // Weg HINEIN in die neue Ansicht geprueft werden kann. "nein" steht seit
 // A0b bereits im Speicher.
 await page.reload();
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);

 // ===== A  Mit der Wahl "klassisch" ist sie unveraendert ==================
 let a=await page.evaluate(()=>({
  aktiv:a2Aktiv(),
  klasse:document.documentElement.classList.contains("a2-an"),
  a2:$("a2Screen").getClientRects().length>0,
  nav:$("startNav").getClientRects().length>0,
  ein:$("a2Ein").getClientRects().length>0,
  ablauf:$("a2Ablauf").hidden
 }));
 p(a.aktiv===false,"A1 die Wahl 'klassisch' ist wirksam",a);
 p(!a.klasse&&!a.a2,"A2 der neue Schirm ist unsichtbar",a);
 p(a.nav,"A3 die klassische Startnavigation ist da",a);
 p(a.ein,"A4 der Einstiegsknopf ist da",a);
 p(a.ablauf,"A5 die Ablaufleiste im Cockpit ist aus",a);

 // ===== B  Mit Schalter =====================================================
 await page.click("#a2Ein");
 let bb=await page.evaluate(()=>({
  gemerkt:localStorage.getItem("sd_ansicht2"),
  a2:$("a2Screen").getClientRects().length>0,
  nav:$("startNav").getClientRects().length>0,
  version:$("appVersion").getClientRects().length>0,
  oben:$("topUserBar").getClientRects().length>0,
  tabs:[...$("a2Leiste").querySelectorAll("button")].map(x=>x.getAttribute("data-a2-tab")),
  zahlen:[...document.querySelectorAll("#a2Inhalt .a2-zahl b")].map(x=>x.textContent),
  karten:document.querySelectorAll("#a2Inhalt .a2-auf").length,
  punkt:document.querySelector("#a2Leiste .a2-punkt")?document.querySelector("#a2Leiste .a2-punkt").textContent:""
 }));
 p(bb.gemerkt==="ja","B1 die Wahl wird pro Geraet gemerkt",bb);
 p(bb.a2&&!bb.nav&&!bb.version&&!bb.oben,"B2 neuer Schirm da, klassischer samt Kopfzeile aus",bb);
 p(JSON.stringify(bb.tabs)===JSON.stringify(["heute","projekte","werkstatt","lager","mehr"]),"B3 fuenf Register",bb.tabs);
 // erneut_freigeben UND ruesten sind in MW_SCHRITTE (js/44) beide "rot".
 p(JSON.stringify(bb.zahlen)===JSON.stringify(["2","2","2"]),"B4 Zahlenband 2 offen / 2 dringend / 2 Projekte",bb.zahlen);
 p(bb.karten===2,"B5 beide Aufgaben als Karte",bb);
 p(bb.punkt==="2","B6 die Zahl am Register Heute stimmt",bb);

 // Der Knopf einer Aufgabe muss GENAU die bestehende Funktion aufrufen.
 await page.evaluate(()=>{window.__ruf=[];aufgabeAusfuehren=async(art,id)=>{window.__ruf.push([art,String(id)])}});
 await page.click('[data-a2-aufgabe="ruesten"]');
 let ruf=await page.evaluate(()=>window.__ruf);
 p(JSON.stringify(ruf)===JSON.stringify([["ruesten","12"]]),"B7 der Knopf ruft aufgabeAusfuehren('ruesten',12) - kein eigener Weg",ruf);

 // ===== C  Projekte =========================================================
 await page.click('[data-a2-tab="projekte"]');
 let c=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#a2ProjListe .a2-zeile").length,
  text:$("a2ProjListe").textContent.replace(/\s+/g," "),
  feld:!!$("a2Suche")
 }));
 p(c.zeilen===2,"C1 nur die zwei nicht archivierten Projekte",c);
 p(!c.text.includes("Bahnhofstrasse"),"C2 das archivierte Projekt fehlt",c.text.slice(0,200));
 p(c.text.includes("Hofmattstrasse 4"),"C3 die Adresse ist der Haupttitel (projektTitel)",c.text.slice(0,200));

 await page.fill("#a2Suche","kirch");
 let c2=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#a2ProjListe .a2-zeile").length,
  fokus:document.activeElement?document.activeElement.id:""
 }));
 p(c2.zeilen===1,"C4 Suche 'kirch' findet genau ein Projekt",c2);
 p(c2.fokus==="a2Suche","C5 das Suchfeld behaelt beim Tippen den Fokus",c2);

 // Ein Projekt oeffnet seit v3.151 die eigene PROJEKTSEITE (sechs Register),
 // nicht mehr das klassische Cockpit. Bis v3.150 war es umgekehrt - der
 // Vertrag ist umgestellt, nicht abgeschwaecht: das Cockpit bleibt ueber
 // "Mehr" erreichbar, und dass es dort wirklich aufgeht, prueft C8.
 await page.click('[data-a2-projekt="2"]');
 await page.waitForFunction(()=>!a2ProjLaedt);
 let c6=await page.evaluate(()=>({
  seite:a2Zustand.seite, projektId:a2Zustand.projektId,
  cockpit:!$("projectCockpitModal").hidden,
  register:[...document.querySelectorAll("#a2Inhalt .a2-register button")].length,
  // Die Startseite bleibt liegen - die Projektseite steckt darin.
  startNochDa:!$("startScreen").hidden
 }));
 p(c6.seite==="projekt"&&String(c6.projektId)==="2","C6 Tippen auf ein Projekt oeffnet die Projektseite",c6);
 p(!c6.cockpit,"C6b das klassische Cockpit bleibt dabei zu",c6);
 p(c6.register>=4,"C6c mit ihren Registern",c6);

 // Der Zurueck-Knopf der Kopfzeile fuehrt in die Projektliste.
 await page.click("[data-a2-zurueck]");
 let c7=await page.evaluate(()=>({
  seite:a2Zustand.seite, projektId:a2Zustand.projektId,
  a2:$("a2Screen").getClientRects().length>0
 }));
 p(c7.seite==="projekte"&&!c7.projektId&&c7.a2,"C7 Zurueck fuehrt in die Projektliste",c7);

 // Gegenprobe: das vollstaendige Cockpit ist weiterhin erreichbar, und sein
 // Zurueck-Knopf fuehrt in die neue Ansicht statt in die klassische Liste.
 await page.click('[data-a2-projekt="2"]');
 await page.waitForFunction(()=>!a2ProjLaedt);
 await page.click('[data-a2-reg="mehr"]');
 await page.click('[data-a2-tu="cockpit"]');
 let c8=await page.evaluate(()=>({
  cockpit:!$("projectCockpitModal").hidden,
  titel:$("cockpitTitle").textContent
 }));
 p(c8.cockpit,"C8 das vollstaendige Cockpit ist ueber 'Mehr' erreichbar",c8);
 await page.click("#cockpitBack");
 await page.waitForFunction(()=>!a2ProjLaedt);
 let c9=await page.evaluate(()=>({
  cockpit:!$("projectCockpitModal").hidden,
  projektListe:!$("projectsModal").hidden,
  seite:a2Zustand.seite
 }));
 p(!c9.cockpit&&!c9.projektListe&&c9.seite==="projekt",
   "C9 sein Zurueck fuehrt auf die Projektseite, nicht in die klassische Liste",c9);

 // Eine fremde oder geloeschte Projekt-ID darf keine leere Seite hinterlassen.
 let c10=await page.evaluate(async()=>{
  a2Zustand.seite="projekte"; a2Zustand.projektId=null; a2Zeichnen();
  const knopf=document.querySelector('[data-a2-projekt]');
  knopf.setAttribute("data-a2-projekt","999999");
  knopf.click();
  await new Promise(r=>setTimeout(r,60));
  return {seite:a2Zustand.seite,a2:$("a2Screen").getClientRects().length>0};
 });
 p(c10.seite==="projekte"&&c10.a2,"C10 eine unbekannte Projekt-ID laesst die Liste stehen",c10);

 // ===== D  Ablaufleiste =====================================================
 // D1 ist der Fall, an dem eine naive Fassung scheitert: OHNE Massaufnahmen
 // erfuellt "jede ist montiert" die Bedingung leer - das Projekt stuende
 // faelschlich ganz hinten im Ablauf.
 let d1=await page.evaluate(()=>{
  projectMeasurementsCache=[];projectAngeboteCache=[];projectAusmassCache=[];
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=false;
  a2AblaufZeichnen();
  return {stand:a2AblaufStand(),
   fertig:[...document.querySelectorAll("#a2Ablauf .ist-fertig")].length,
   jetzt:document.querySelector("#a2Ablauf .ist-jetzt .a2-ablauf-text").textContent};
 });
 p(d1.fertig===0,"D1 ohne Massaufnahmen ist keine Station fertig (leere Menge)",d1);
 p(d1.jetzt==="Offerte","D1b die erste offene Station ist die Offerte",d1);
 p(d1.stand.montage===false&&d1.stand.ruesten===false,"D1c weder Ruesten noch Montage gelten als erledigt",d1.stand);

 let d2=await page.evaluate(()=>{
  projectAngeboteCache=[{id:1}];
  projectMeasurementsCache=[
   {id:1,workflow_status:"geruestet"},
   {id:2,workflow_status:"zu_ruesten"}     // die schwaechste Station entscheidet
  ];
  projectAusmassCache=[];
  a2AblaufZeichnen();
  return {stand:a2AblaufStand(),
   jetzt:document.querySelector("#a2Ablauf .ist-jetzt .a2-ablauf-text").textContent};
 });
 p(d2.stand.freigabe===true&&d2.stand.ruesten===false,"D2 eine noch nicht geruestete Massaufnahme haelt das ganze Projekt",d2.stand);
 p(d2.jetzt==="Rüsten","D2b die aktuelle Station ist Ruesten",d2);

 let d3=await page.evaluate(()=>{
  projectMeasurementsCache=[{id:1,workflow_status:"freigegeben",freigabe_verfallen:true}];
  a2AblaufZeichnen();
  return a2AblaufStand();
 });
 p(d3.freigabe===false,"D3 eine verfallene Freigabe ist keine Freigabe",d3);

 let d4=await page.evaluate(()=>{
  workflowAktiv=false;
  a2AblaufZeichnen();
  const t=[...document.querySelectorAll("#a2Ablauf .a2-ablauf-text")].map(x=>x.textContent);
  workflowAktiv=true;
  return t;
 });
 p(d4.length===3&&d4.indexOf("Rüsten")<0,"D4 ohne Arbeitsablauf gibt es nur drei Stationen",d4);

 let d5=await page.evaluate(()=>{
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=true;
  a2AblaufZeichnen();
  const t=[...document.querySelectorAll("#a2Ablauf .a2-ablauf-text")].map(x=>x.textContent);
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=false;
  return t;
 });
 p(d5.indexOf("Offerte")<0,"D5 ohne Offerten-Freigabe fehlt die Station Offerte",d5);

 // ===== E  Der Weg zurueck ==================================================
 // Werkstatt und Lager erscheinen nur, wenn ihre Knoepfe sichtbar sind -
 // die Rechtepruefung bleibt bei der App.
 let e0=await page.evaluate(()=>{
  $("navWerkstatt").hidden=true;$("navLagerverwaltung").hidden=true;
  a2Zeichnen();
  return [...$("a2Leiste").querySelectorAll("button")].map(x=>x.getAttribute("data-a2-tab"));
 });
 p(JSON.stringify(e0)===JSON.stringify(["heute","projekte","mehr"]),"E1 abgeschaltete Module fehlen in der Leiste",e0);

 await page.evaluate(()=>{$("navWerkstatt").hidden=false;$("navLagerverwaltung").hidden=false;a2Zeichnen()});
 await page.click('[data-a2-tab="mehr"]');
 await page.click('[data-a2-tu="klassisch"]');
 let e=await page.evaluate(()=>({
  gemerkt:localStorage.getItem("sd_ansicht2"),
  a2:$("a2Screen").getClientRects().length>0,
  nav:$("startNav").getClientRects().length>0,
  oben:$("topUserBar").getClientRects().length>0,
  version:$("appVersion").textContent.trim(),
  werkstatt:$("navWerkstatt").hidden,
  ablauf:$("a2Ablauf").hidden
 }));
 p(e.gemerkt==="nein","E2 die Rueckkehr wird ebenfalls gemerkt",e);
 p(!e.a2&&e.nav&&e.oben,"E3 die klassische Ansicht ist vollstaendig zurueck",e);
 p(e.werkstatt===false,"E4 die hidden-Zustaende der klassischen Knoepfe sind unberuehrt",e);
 p(e.ablauf,"E5 die Ablaufleiste ist wieder aus",e);

 // ===== F  Gegenproben am Quelltext =========================================
 const jsQ=fs.readFileSync("js/70-ansicht2.js","utf8");
 const schreib=jsQ.match(/\.(insert|update|delete|upsert|rpc)\(/g)||[];
 p(schreib.length===0,"F1 js/70 enthaelt keinen einzigen Schreibweg",schreib);
 p(!/\bsb\.from\(/.test(jsQ),"F2 js/70 fragt die Datenbank nicht selbst ab",jsQ.match(/sb\.from\([^)]*\)/g));

 // Jede Stilregel muss am Schalter oder an einer a2-Klasse haengen. Sonst
 // wuerde die Datei die klassische Ansicht veraendern, obwohl sie aus ist.
 const cssQ=fs.readFileSync("css/05-ansicht2.css","utf8").replace(/\/\*[\s\S]*?\*\//g,"");
 const lose=[];
 cssQ.split("}").forEach(bl=>{
  const i=bl.indexOf("{"); if(i<0)return;
  const sel=bl.slice(0,i).trim();
  if(!sel||sel.startsWith("@"))return;
  sel.split(",").forEach(s=>{s=s.trim();
   if(s&&!/#a2/.test(s)&&!/\.a2-/.test(s))lose.push(s)});
 });
 p(lose.length===0,"F3 keine Stilregel wirkt ohne den Schalter",lose);

 // Die neuen Dateien muessen in der App-Shell des Service Workers stehen -
 // sonst fehlen sie ohne Verbindung.
 const swQ=fs.readFileSync("sw.js","utf8");
 p(swQ.includes('"./js/70-ansicht2.js"')&&swQ.includes('"./css/05-ansicht2.css"'),
   "F4 beide neuen Dateien stehen in der App-Shell");

 p(fehler.length===0,"F5 keine Javascript-Fehler",fehler);

 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
