// Prueft v3.165: In der Rapportliste steht, worum es in jedem Rapport geht.
//
// WORUM ES GEHT
// Bis v3.164 zeigte jede Zeile nur Kopfdaten - Datum, Auftrags-Nr.,
// Auftraggeber, Objekt. Bei fuenf Rapporten zur selben Baustelle sahen
// alle fuenf gleich aus; man musste jeden einzeln oeffnen.
//
// ABGELEITET, NICHT ERFASST
// Der Text wird aus dem gerechnet, was im Rapport ohnehin steht. Das
// wirkt rueckwirkend auf jeden bestehenden Rapport und kann nicht
// veralten. Entsprechend prueft Abschnitt A die Ableitung selbst, und
// die Abschnitte B bis D pruefen, dass ALLE DREI Listen denselben Text
// zeigen - drei eigene Ableitungen waeren drei Gelegenheiten, dasselbe
// unterschiedlich zu formulieren.
//
// WAS HIER GEPRUEFT WIRD
//   A  rapportKurz() - Texte, Entdoppelung, Stunden, Materialzahl,
//      Kappung, Rueckfaelle und Robustheit gegen alte/kaputte Zeilen.
//   B  Die Rapportliste im Projekt-Cockpit zeigt die Zeile.
//   C  Die neue Ansicht zeigt WORTGLEICH dieselbe Zeile.
//   D  Die Rapport-Uebersicht ebenfalls.
//   E  Gegenproben: ein Rapport ohne Inhalt bekommt KEINE leere Zeile
//      untergeschoben, es wird nichts erfunden, die Kopfdaten von vorher
//      bleiben stehen, und keine der drei Listen rechnet selbst.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rapport-kurz-v3-165.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice().map(x=>({...x}));
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
 });
 await page.waitForTimeout(300);

 // ---- A  Die Ableitung selbst --------------------------------------------
 const A=await page.evaluate(()=>{
  const lang=(n,z)=>Array(n+1).join(z);      // n-mal dasselbe Zeichen
  const t40a="Rinne Nordseite komplett ausgebessert.xx"; // 39
  return {
   normal: rapportKurz({
    work_entries:[{desc:"Rinne ausbessern",hours:1.5},
                  {desc:"Kaminanschluss abdichten",hours:.75},
                  // dieselbe Arbeit noch einmal, anders geschrieben
                  {desc:"  RINNE AUSBESSERN ",hours:0}],
    material_entries:[{no:"101.20"},{no:"204.05"}]}),
   // Eine einzige Materialzeile heisst Einzahl.
   einzahl: rapportKurz({work_entries:[{desc:"Abdichten",hours:1}],
                         material_entries:[{no:"101.20"}]}),
   // Stunden: Gleitkomma darf nicht durchschlagen (0.1+0.2).
   krumm: rapportKurz({work_entries:[{desc:"A",hours:.1},{desc:"B",hours:.2}],
                       material_entries:[]}),
   ganz: rapportKurz({work_entries:[{desc:"A",hours:8}],material_entries:[]}),
   halb: rapportKurz({work_entries:[{desc:"A",hours:2.5}],material_entries:[]}),
   // Ohne Stunden steht keine "0 h" da.
   ohneStunden: rapportKurz({work_entries:[{desc:"Kontrolle",hours:0}],
                             material_entries:[]}),
   // Kappung an der Trennstelle
   gekappt: rapportKurz({work_entries:[{desc:t40a,hours:0},{desc:"Zweite Arbeit "+t40a,hours:0}],
                         material_entries:[]}),
   // Ein einzelner, viel zu langer Text wird hart gekuerzt
   hart: rapportKurz({work_entries:[{desc:lang(140,"x"),hours:0}],material_entries:[]}),
   // Arbeitszeilen ohne Text: wird gesagt, nicht verschwiegen
   ohneText: rapportKurz({work_entries:[{desc:"",hours:2},{desc:"   ",hours:1}],
                          material_entries:[]}),
   // Nur Material, keine Arbeit
   nurMaterial: rapportKurz({work_entries:[],material_entries:[{no:"1"},{no:"2"},{no:"3"}]}),
   // Rueckfaelle und kaputte Zeilen duerfen NICHT abstuerzen
   leer:    rapportKurz({work_entries:[],material_entries:[]}),
   nullFeld:rapportKurz({work_entries:null,material_entries:null}),
   ohneFeld:rapportKurz({}),
   kaputt:  rapportKurz({work_entries:"quatsch",material_entries:7}),
   nichts:  rapportKurz(null)
  };
 });
 p(A.normal==="Rinne ausbessern · Kaminanschluss abdichten — 2,25 h · 2 Materialpositionen",
   "A1 Texte, Stunden und Materialzahl in einer Zeile - die doppelte Arbeit nur einmal",A.normal);
 p(/1 Materialposition$/.test(A.einzahl),"A2 eine Materialzeile ist Einzahl",A.einzahl);
 p(/ 0,3 h/.test(A.krumm),"A3 0.1 + 0.2 ergibt 0,3 h, nicht 0,30000000000000004",A.krumm);
 p(/ 8 h/.test(A.ganz)&&/ 2,5 h/.test(A.halb),
   "A4 ganze Stunden ohne Nachkomma, halbe mit Komma",{ganz:A.ganz,halb:A.halb});
 p(A.ohneStunden==="Kontrolle","A5 ohne Stunden steht kein '0 h' da",A.ohneStunden);
 p(A.gekappt.length<=84&&/…$/.test(A.gekappt)&&A.gekappt.indexOf("Zweite Arbeit")<0,
   "A6 zu lang: an der Trennstelle gekappt, nicht mitten im Wort",
   {text:A.gekappt,laenge:A.gekappt.length});
 p(A.hart.length<=82&&/…$/.test(A.hart),
   "A7 ein einzelner zu langer Text wird hart gekuerzt - die Zeile laeuft nie aus",
   {laenge:A.hart.length});
 p(A.ohneText==="2 Arbeitspositionen ohne Text — 3 h",
   "A8 Arbeitszeilen ohne Text werden gesagt, nicht verschwiegen",A.ohneText);
 p(A.nurMaterial==="3 Materialpositionen","A9 nur Material: dann eben nur Material",A.nurMaterial);
 p(A.leer===""&&A.nullFeld===""&&A.ohneFeld===""&&A.kaputt===""&&A.nichts==="",
   "A10 ohne Inhalt kommt ein LEERER Text - es wird nichts erfunden",A);

 // ---- Beispieldaten fuer die drei Listen ---------------------------------
 const ERWARTET="Rinne Nordseite ausbessern · Kaminanschluss neu abdichten — 6,25 h · 2 Materialpositionen";
 await page.evaluate(()=>{
  window.__demo.reports=[
   {id:7,project_id:1,date:"2026-09-01",order_no:"2026-118",
    customer:"Muster Immobilien AG",object:"Dachfläche Nord",vat:"8.1 %",
    work_entries:[{desc:"Rinne Nordseite ausbessern",hours:4,employee:"ML"},
                  {desc:"Kaminanschluss neu abdichten",hours:2.25,employee:"ML"}],
    material_entries:[{no:"101.20",qty:3},{no:"204.05",qty:1}],
    created_by:"u1",created_at:"2026-09-01T17:00:00Z",
    updated_by:"u1",updated_at:"2026-09-01T17:00:00Z"},
   // Der zweite Rapport hat bewusst gar nichts - Abschnitt E.
   {id:8,project_id:1,date:"2026-09-02",order_no:"2026-118",
    customer:"Muster Immobilien AG",object:"Dachfläche Süd",vat:"8.1 %",
    work_entries:[],material_entries:[],
    created_by:"u1",created_at:"2026-09-02T17:00:00Z",
    updated_by:"u1",updated_at:"2026-09-02T17:00:00Z"}
  ];
 });

 // Die Zeilen werden ueber die Rapport-Id gelesen, nicht ueber ihre
 // Position: die Listen sortieren nach Datum absteigend, der VOLLE Rapport
 // (7) steht also hinter dem leeren (8). Eine Pruefung auf "die erste
 // Zeile" wuerde eine Reihenfolge zusichern, die niemand versprochen hat.
 // ---- B  Die Rapportliste im Projekt-Cockpit -----------------------------
 const B=await page.evaluate(async()=>{
  await loadProjectReports(1);
  const zeilen=[...document.querySelectorAll("#cockpitRepBody .report-row")];
  const raus={};
  zeilen.forEach(z=>{
   const id=(z.querySelector("[data-open-report]")||{}).dataset.openReport;
   const k=z.querySelector(".rapport-kurz");
   raus[id]=k?k.textContent.trim():null;
  });
  return {anzahl:zeilen.length,kurz:raus};
 });
 p(B.anzahl===2,"B1 beide Rapporte stehen in der Liste",B);
 p(B.kurz["7"]===ERWARTET,"B2 der volle Rapport zeigt, worum es geht",{ist:B.kurz["7"],soll:ERWARTET});

 // ---- C  Die neue Ansicht zeigt WORTGLEICH dasselbe ----------------------
 const C=await page.evaluate(()=>{
  a2Setzen(true);
  a2Zustand.seite="projekt"; a2Zustand.projektId=1; a2Zustand.reg="rapport";
  a2Zeichnen();
  const zeilen=[...document.querySelectorAll("#a2Inhalt [data-a2-rep]")];
  const raus={};
  zeilen.forEach(z=>{
   const k=z.querySelector(".rapport-kurz");
   raus[z.getAttribute("data-a2-rep")]=k?k.textContent.trim():null;
  });
  return {anzahl:zeilen.length,kurz:raus};
 });
 p(C.anzahl===2,"C1 die neue Ansicht zeigt beide Rapporte",C);
 p(C.kurz["7"]===ERWARTET,
   "C2 und WORTGLEICH denselben Text wie das Cockpit - eine Quelle, nicht zwei",
   {ansicht2:C.kurz["7"],cockpit:B.kurz["7"]});

 // ---- D  Die Rapport-Uebersicht ------------------------------------------
 const D=await page.evaluate(async()=>{
  a2Setzen(false);
  await renderReportsOverview();
  const zeilen=[...document.querySelectorAll("#recentReportsList .meas-row")];
  const raus={};
  zeilen.forEach(z=>{
   const id=(z.querySelector("[data-open-report-overview]")||{}).dataset.openReportOverview;
   const k=z.querySelector(".rapport-kurz");
   raus[id]=k?k.textContent.trim():null;
  });
  return {anzahl:zeilen.length,kurz:raus};
 });
 p(D.anzahl===2,"D1 die Rapport-Uebersicht zeigt beide",D);
 p(D.kurz["7"]===ERWARTET,"D2 und ebenfalls denselben Text",D.kurz);

 // ---- E  Gegenproben ------------------------------------------------------
 // Der leere Rapport (8) darf KEINE Zusammenfassungszeile bekommen. Eine
 // leere Zeile waere schlimmer als keine: sie sieht aus wie eine Aussage.
 p(B.kurz["8"]===null,"E1 Cockpit: der leere Rapport bekommt gar keine Zeile",B.kurz);
 p(C.kurz["8"]===null,"E2 neue Ansicht: ebenso",C.kurz);
 p(D.kurz["8"]===null,"E3 Rapport-Uebersicht: ebenso",D.kurz);

 // Und die Kopfdaten von vorher stehen unveraendert weiter da - die neue
 // Zeile kommt DAZU, sie ersetzt nichts.
 const E4=await page.evaluate(async()=>{
  await loadProjectReports(1);
  const z=document.querySelector("#cockpitRepBody .report-row");
  return {titel:z.querySelector("b").textContent,
          kopf:z.querySelectorAll("span")[0].textContent};
 });
 p(/2026-118/.test(E4.titel)&&/Muster Immobilien AG/.test(E4.kopf),
   "E4 Titel und Kopfdaten stehen unveraendert weiter da",E4);

 // Strukturpruefung: die drei Listen leiten NICHT je selbst ab.
 const quellen={
  cockpit:  fs.readFileSync(path.join(process.cwd(),"js/09-projekte.js"),"utf8"),
  ansicht2: fs.readFileSync(path.join(process.cwd(),"js/70-ansicht2.js"),"utf8"),
  uebersicht:fs.readFileSync(path.join(process.cwd(),"js/04-start-suche.js"),"utf8")
 };
 p(/rapportKurz\(r\)/.test(quellen.cockpit)&&/rapportKurz\(r\)/.test(quellen.ansicht2)
   &&/rapportKurz\(r\)/.test(quellen.uebersicht),
   "E5 alle drei Listen benutzen dieselbe Funktion statt einer eigenen Rechnung");
 p(!/work_entries/.test(quellen.ansicht2),
   "E6 die neue Ansicht fasst work_entries gar nicht erst an");
 // js/04 liest work_entries sehr wohl - aber im CSV-Export (Stundensummen),
 // nicht in der Liste. Geprueft wird deshalb genau die Listen-Funktion.
 const ueberRender=(quellen.uebersicht.split("async function renderReportsOverview")[1]||"")
   .split("\n}")[0];
 p(ueberRender.length>0&&!/work_entries/.test(ueberRender)&&/rapportKurz/.test(ueberRender),
   "E7 die Rapport-Uebersicht leitet in der Liste nicht selbst ab",
   {laenge:ueberRender.length});

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
