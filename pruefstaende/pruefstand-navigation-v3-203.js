// Prueft die Navigation der neuen Ansicht (v3.203).
//
// Ansage des Anwenders: "ich bin noch nicht ganz zufrieden mit der navigation
// in der app, es ist mir zu verwinkelt und unübersichtlich... wenn du eine
// bessere idee hast kannst du auch die ganze ansicht nochmal umbauen."
//
// Die Diagnose, gegen die hier geprueft wird:
//   - "Mehr" hiess ZWEIMAL etwas anderes (untere Leiste = App, Projekt =
//     Offerte/Leistungen/Dateien),
//   - es gab ZWEI Landkarten desselben Gebiets: die Ablaufleiste zeigte den
//     Weg, die Registerleiste ging ihn, beide anders geschnitten,
//   - "Werkstatt" hiess die der FIRMA und die des PROJEKTS,
//   - Dateien/Fotos/Verlauf gaben an die alte Projektansicht ab.
//
// Geprueft wird:
//   A  die Register: Namen eindeutig, kein "Mehr …" mehr, Offerte und
//      Dateien sind eigene Register,
//   B  die Ablaufleiste IST die Navigation: jede Station ist ein Knopf und
//      fuehrt auf ihr Register; eine Station ohne Register bleibt Anzeige,
//   C  das Dateien-Register zeigt die Liste, statt nur weiterzureichen,
//   D  die Mehr-Seite ist gruppiert und jeder Eintrag hat seine Gruppe,
//   E  ERREICHBARKEIT: jedes Register laesst sich oeffnen und zeigt dann
//      wirklich Inhalt (gemessen, nicht nur vorhanden). Diesen Abschnitt
//      gibt es, weil in v3.201 "Vortext und Schlusstext" zwar da, aber
//      unerreichbar war - und kein Pruefstand das gemerkt hat.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-navigation-v3-203.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async x=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:()=>{const q={};["insert","update","upsert","delete","select","eq","order","limit","not","in","is","range","ilike"].forEach(k=>q[k]=()=>q);
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=f=>Promise.resolve({data:[],error:null}).then(f);return q}})};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:430,height:900}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 // Ein Projekt mit Daten in allen Bereichen - sonst sagt eine leere Liste
 // nichts darueber, ob man hinkommt.
 const grund=async()=>{
  await page.evaluate(()=>{
   currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"A"};
   allProfiles=[currentProfile]; meineRechte={admin:true};
   offerteZugriff=true; workflowAktiv=true;
   allProjects=[{id:7,name:"Sanierung",object:"Bahnhofstrasse 12",archived:false}];
   $("appRoot").hidden=false; $("authScreen").hidden=true;
   // #a2Screen liegt IN #startScreen - ist der versteckt, hat alles darin
   // Hoehe 0, und Abschnitt E koennte nichts messen.
   $("startScreen").hidden=false;
   ["navWerkstatt","navLagerverwaltung","navAdminMeas","navSystemAdmin"]
    .forEach(id=>{ if($(id))$(id).hidden=false });
   $("cockpitStandAngeboteZeile").hidden=false;
   $("cockpitStandOffertenZeile").hidden=false;
   // Die Projektmodule einschalten, damit Material und Rüsten & Montage da
   // sind. pmAktiv() (js/47) verlangt den HAUPTschalter dazu - ohne ihn ist
   // jedes Untermodul aus, egal was daneben steht.
   projektModule={haupt:true,material:true,werkstatt:true};
   projectMeasurementsCache=[{id:1,title:"Dachrinne",type:"rinne_halbrund",workflow_status:null}];
   projectAusmassCache=[{id:2,title:"Ausmass Nord",date:"2026-09-01"}];
   projectReportsCache=[{id:3,date:"2026-09-02"}];
   projectAngeboteCache=[{id:4,title:"Fremdofferte",date:"2026-09-03"}];
   projectOffertenCache=[{id:5,title:"Dachsanierung",offert_nr:"2026-014",date:"2026-09-26",
     positionen:[{quantity:2,preis:100}],rabatt_art:"prozent",rabatt_wert:0,mwst_satz:8.1}];
   projectLeistungenCache=[{id:6,bezeichnung:"Rinne ersetzen",menge:12,einheit:"m"}];
   projectFilesCache=[{id:9,name:"Plan Dach.pdf",size:120345,created_at:"2026-09-05"},
                      {id:10,name:"Foto Kamin.jpg",size:54321,created_at:"2026-09-06"}];
   a2Zustand.seite="projekt"; a2Zustand.projektId=7; a2Zustand.reg="uebersicht";
   a2ProjLaedt=false; a2ProjFehler="";
   a2Zeichnen();
  });
  await page.waitForTimeout(150);
 };
 await grund();

 // =========================================================================
 console.log("\nA · die Register");
 let a=await page.evaluate(()=>({
  namen:a2ProjRegister().map(r=>r.name),
  schluessel:a2ProjRegister().map(r=>r.k),
  leiste:a2Leisten().map(r=>r.name),
  gezeichnet:[...document.querySelectorAll("#a2Inhalt .a2-register button")].map(x=>x.textContent.trim())
 }));
 p(a.schluessel.indexOf("mehr")<0,"es gibt kein Register „Mehr …“ mehr",a.schluessel);
 p(a.schluessel.indexOf("offerte")>=0&&a.schluessel.indexOf("dateien")>=0,
   "Offerte und Dateien sind eigene Register",a.schluessel);
 p(new Set(a.namen).size===a.namen.length,"kein Registername kommt zweimal vor",a.namen);
 // Der gemeldete Namenszusammenstoss: Werkstatt unten UND im Projekt
 const beide=a.namen.filter(n=>a.leiste.indexOf(n)>=0);
 p(beide.length===0,
   "kein Register heisst gleich wie ein Eintrag der unteren Leiste",
   {register:a.namen,leiste:a.leiste,doppelt:beide});
 p(a.namen.indexOf("Rüsten & Montage")>=0,
   "die Werkstatt DES PROJEKTS heisst „Rüsten & Montage“",a.namen);
 p(JSON.stringify(a.gezeichnet)===JSON.stringify(a.namen),
   "die gezeichnete Registerleiste stimmt mit der Liste ueberein",a.gezeichnet);

 // =========================================================================
 console.log("\nB · die Ablaufleiste IST die Navigation");
 let bl=await page.evaluate(()=>{
  const st=[...document.querySelectorAll("#a2Inhalt .a2-ablauf .a2-ablauf-st")];
  return {
   anzahl:st.length,
   knoepfe:st.filter(x=>x.tagName==="BUTTON").length,
   ziele:st.filter(x=>x.tagName==="BUTTON").map(x=>x.dataset.a2Station),
   texte:st.map(x=>x.textContent.replace(/\s+/g," ").trim())
  };
 });
 p(bl.anzahl===6,"sechs Stationen",bl.texte);
 p(bl.knoepfe===6,"jede Station ist ein Knopf",bl);
 p(JSON.stringify(bl.ziele)===JSON.stringify(
    ["offerte","aufmass","aufmass","werkstatt","werkstatt","ausmass"]),
   "und fuehrt auf das Register, das zu ihr gehoert",bl.ziele);
 // Der eigentliche Beweis: klicken und nachsehen, wo man landet
 const springe=async(i)=>page.evaluate(n=>{
  const st=[...document.querySelectorAll("#a2Inhalt .a2-ablauf .a2-ablauf-st")];
  st[n].click();
  return {reg:a2Zustand.reg,
          markiert:[...document.querySelectorAll("#a2Inhalt .a2-register button.ist-auf")]
            .map(x=>x.textContent.trim())};
 },i);
 let s0=await springe(0);
 p(s0.reg==="offerte"&&s0.markiert[0]==="Offerte",
   "ein Klick auf „Offerte“ fuehrt ins Offerte-Register",s0);
 await page.evaluate(()=>{a2Zustand.reg="uebersicht";a2Zeichnen()});
 let s3=await springe(3);
 p(s3.reg==="werkstatt"&&s3.markiert[0]==="Rüsten & Montage",
   "„Rüsten“ fuehrt auf Rüsten & Montage",s3);
 // Gegenprobe: ohne das Modul gibt es kein Ziel - dann bleibt die Station Anzeige
 let ohne=await page.evaluate(()=>{
  projektModule={haupt:true,material:false,werkstatt:false};
  a2Zustand.reg="uebersicht"; a2Zeichnen();
  const st=[...document.querySelectorAll("#a2Inhalt .a2-ablauf .a2-ablauf-st")];
  const raus={arten:st.map(x=>x.tagName),
              ziele:st.filter(x=>x.tagName==="BUTTON").map(x=>x.dataset.a2Station)};
  projektModule={haupt:true,material:true,werkstatt:true}; a2Zeichnen();
  return raus;
 });
 p(ohne.ziele.indexOf("werkstatt")<0&&ohne.arten.indexOf("DIV")>=0,
   "eine Station ohne Register ist kein Knopf, der nichts tut",ohne);

 // =========================================================================
 console.log("\nC · das Dateien-Register zeigt die Liste");
 let dz=await page.evaluate(()=>{
  a2Zustand.reg="dateien"; a2Zeichnen();
  // innerText gibt den GERENDERTEN Text - die Abschnitts-Ueberschriften sind
  // per CSS in Grossbuchstaben. Deshalb ohne Ruecksicht auf Gross/Klein.
  const txt=$("a2Inhalt").innerText.toLowerCase();
  return {plan:txt.indexOf("plan dach.pdf")>=0, foto:txt.indexOf("foto kamin.jpg")>=0,
          zahl:txt.indexOf("2 dateien")>=0,
          fotowand:txt.indexOf("alle fotos")>=0, verlauf:txt.indexOf("verlauf")>=0,
          hochladen:txt.indexOf("hochladen")>=0};
 });
 p(dz.plan&&dz.foto&&dz.zahl,"die Dateien stehen mit Namen da, nicht nur ein Knopf",dz);
 p(dz.fotowand&&dz.verlauf&&dz.hochladen,
   "Fotowand, Verlauf und Hochladen sind von hier aus beschriftet erreichbar",dz);

 // =========================================================================
 console.log("\nD · die Mehr-Seite ist gruppiert");
 let m=await page.evaluate(()=>{
  a2Zustand.seite="mehr"; a2Zeichnen();
  const koepfe=[...$("a2Inhalt").querySelectorAll(".a2-abschnitt-kopf h2")].map(x=>x.textContent.trim());
  const zeilen=[...$("a2Inhalt").querySelectorAll(".a2-abschnitt .a2-zeile[data-a2-tu]")].length;
  const alle=[...$("a2Inhalt").querySelectorAll("[data-a2-tu]")]
    .map(x=>x.dataset.a2Tu).filter(z=>z!=="klassisch"&&z!=="abmelden");
  return {koepfe,zeilen,alle};
 });
 p(m.koepfe.indexOf("Arbeiten")>=0&&m.koepfe.indexOf("Firma")>=0&&m.koepfe.indexOf("Verwaltung")>=0,
   "drei Gruppen statt einer langen Liste",m.koepfe);
 p(m.zeilen===m.alle.length,
   "jeder Eintrag steht in einer Gruppe - keiner faellt heraus",{ingruppen:m.zeilen,gesamt:m.alle.length});
 // Gegenprobe zur Erreichbarkeit: die frueher vorhandenen Ziele gibt es noch
 ["suche","einstell","anleitung","feedback","konten","zaehlwerk","abwicklung",
  "einrichtung","kontrollen","adminmeas","sysadmin"].forEach(z=>{
  p(m.alle.indexOf(z)>=0,"„"+z+"“ ist weiterhin erreichbar",m.alle);
 });

 // =========================================================================
 console.log("\nE · Erreichbarkeit: jedes Register laesst sich oeffnen und zeigt Inhalt");
 // Diesen Abschnitt gibt es, weil in v3.201 "Vortext und Schlusstext" zwar
 // im Dokument stand, aber unerreichbar war - und das kein Pruefstand
 // gemerkt hat. Geprueft wird deshalb die SICHTBARE Hoehe, nicht das
 // Vorhandensein.
 await grund();
 let err=await page.evaluate(()=>{
  const raus=[];
  const regs=a2ProjRegister().map(r=>r.k);
  regs.forEach(k=>{
   a2Zustand.reg=k; a2Zeichnen();
   const inhalt=$("a2Inhalt");
   // Alles ausser der Registerleiste selbst
   const koerper=[...inhalt.children].filter(el=>!el.classList.contains("a2-register"));
   const hoehe=koerper.reduce((s,el)=>s+el.getBoundingClientRect().height,0);
   const knoepfe=[...inhalt.querySelectorAll("button")]
     .filter(x=>!x.closest(".a2-register")&&x.getBoundingClientRect().height>0).length;
   raus.push({k, hoehe:Math.round(hoehe), knoepfe,
              markiert:!!inhalt.querySelector(`.a2-register button.ist-auf[data-a2-reg="${k}"]`)});
  });
  return raus;
 });
 err.forEach(x=>{
  p(x.hoehe>40,"Register „"+x.k+"“ zeigt sichtbaren Inhalt",x);
  p(x.markiert,"und ist in der Registerleiste markiert",x);
  p(x.knoepfe>0,"und hat mindestens einen bedienbaren Knopf",x);
 });

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);

 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
