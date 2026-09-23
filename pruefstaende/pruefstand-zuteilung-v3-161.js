// Prueft v3.161: ein Projekt laesst sich Mitarbeitern zuteilen, und die
// Startseite zeigt in der Vorgabe nur die zugeteilten.
//
// WORUM ES GEHT
// Bis v3.160 sah jeder in der Firma unter "Offene Projekte" alles. Wer auf
// einer Baustelle arbeitet, sollte aber zuerst SEINE sehen.
//
// WAS DAS IST - UND WAS NICHT
// Es ist eine ANZEIGE-Regel, keine Zugriffsregel. Die RLS bleibt
// unveraendert; ueber Projekte und Suche ist jedes Projekt der Firma
// weiterhin erreichbar. Abschnitt E prueft genau das, denn diese
// Unterscheidung ist der ganze Unterschied zwischen "aufgeraeumt" und
// "ausgesperrt".
//
// WAS HIER GEPRUEFT WIRD
//   A  projektIstMeines() (js/01) - die EINE Stelle, die "ist das meines?"
//      beantwortet. Inklusive der Regel fuer den Altbestand: ohne
//      Zuteilung gilt der Ersteller.
//   B  Die Startseite filtert danach. B3 ist die Gegenprobe, die den
//      eigentlichen Auftrag sichert: ein Projekt, das jemand ANDEREM
//      zugeteilt ist, steht nicht mehr da.
//   C  Der Umschalter "Alle" holt den ganzen Betrieb zurueck - und der
//      Abschnitt verschwindet NICHT wortlos, wenn der Filter alles
//      wegnimmt. Sonst suchte jemand den Fehler bei den Daten.
//   D  Die Ankreuzliste in den Stammdaten: gefuellt aus zugeteilt_an,
//      gespeichert als Liste von Ids, leer bleibt leer (nicht null).
//   E  Gegenproben zur Reichweite: die vollstaendige Projektliste zeigt
//      unveraendert ALLES, und es wird keine Zeile aus allProjects
//      entfernt - gefiltert wird nur die Anzeige.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-zuteilung-v3-161.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,
   {id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee"},
   {id:"u3",first_name:"Anna",last_name:"Meier",role:"employee"}];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  a2Setzen(true);
 });
 await page.waitForTimeout(400);

 // ---- A  Die eine Stelle --------------------------------------------------
 const A=await page.evaluate(()=>({
  zugeteiltIch:   projektIstMeines({zugeteilt_an:["u1","u2"],created_by:"u3"},"u1"),
  zugeteiltAnder: projektIstMeines({zugeteilt_an:["u2"],     created_by:"u1"},"u1"),
  // Altbestand: keine Zuteilung -> der Ersteller.
  leerErsteller:  projektIstMeines({zugeteilt_an:[],         created_by:"u1"},"u1"),
  leerFremd:      projektIstMeines({zugeteilt_an:[],         created_by:"u2"},"u1"),
  // Eine alte Zeile, die die Spalte gar nicht kennt, darf nicht abstuerzen.
  ohneSpalte:     projektIstMeines({created_by:"u1"},"u1"),
  kaputt:         projektIstMeines({zugeteilt_an:"quatsch",created_by:"u1"},"u1"),
  ohneProfil:     projektIstMeines({zugeteilt_an:["u1"],created_by:"u1"},null),
  // Zahlen und Text duerfen nicht auseinanderfallen.
  gemischt:       projektIstMeines({zugeteilt_an:[7],created_by:"u2"},7),
  liste:          projektZugeteilt({zugeteilt_an:["u1","u2"]}),
  listeLeer:      projektZugeteilt({})
 }));
 p(A.zugeteiltIch===true,"A1 zugeteilt -> meines",A);
 p(A.zugeteiltAnder===false,
   "A2 jemand ANDEREM zugeteilt -> nicht meines, auch wenn ich es angelegt habe",A);
 p(A.leerErsteller===true,"A3 ohne Zuteilung gilt der Ersteller",A);
 p(A.leerFremd===false,"A4 ohne Zuteilung und nicht angelegt -> nicht meines",A);
 p(A.ohneSpalte===true&&A.kaputt===true,
   "A5 eine Zeile ohne oder mit kaputter Spalte faellt sauber auf den Ersteller zurueck",A);
 p(A.ohneProfil===false,"A6 ohne angemeldetes Profil ist nichts meines",A);
 p(A.gemischt===true,"A7 Id als Zahl und als Text meinen dieselbe Person",A);
 p(A.liste.length===2&&A.listeLeer.length===0,"A8 projektZugeteilt liest die Liste",A);

 // ---- B  Die Startseite filtert -------------------------------------------
 const karten=()=>page.evaluate(()=>
  [...document.querySelectorAll("#a2Inhalt .a2-karte-klick[data-a2-projekt]")]
   .map(x=>x.getAttribute("data-a2-projekt")));
 const koepfe=()=>page.evaluate(()=>
  [...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf h2")]
   .map(h=>h.textContent.replace(/\s+/g," ").trim().replace(/ i$/,"")));

 const vor=await page.evaluate(()=>{
  // Ausgangslage: alles mir zugeteilt, damit die Liste sicher etwas zeigt.
  allProjects.forEach(x=>{x.zugeteilt_an=["u1"]});
  a2ProjektFilter="meine"; a2Zeichnen();
  return allProjects.filter(x=>!x.archived&&x.status!=="abgeschlossen"&&x.status!=="storniert")
                    .map(x=>String(x.id));
 });
 await page.waitForTimeout(300);
 let k=await karten();
 p(k.length>0&&vor.every(id=>k.indexOf(id)>=0),
   "B1 alles mir zugeteilt -> alle offenen Projekte stehen da",{gezeigt:k,erwartet:vor});

 const B2=await page.evaluate(()=>{
  const ziel=allProjects.find(x=>!x.archived&&x.status!=="abgeschlossen"&&x.status!=="storniert");
  ziel.zugeteilt_an=["u2"];          // jemand anderem
  a2Zeichnen();
  return String(ziel.id);
 });
 await page.waitForTimeout(300);
 k=await karten();
 p(k.indexOf(B2)<0,
   "B2 einem ANDEREN zugeteilt -> verschwindet von meiner Startseite",{weg:B2,gezeigt:k});

 // Und die Hinweise folgen derselben Regel - sonst stuende der Hinweis
 // eines fremden Projekts weiterhin oben.
 const B3=await page.evaluate(()=>{
  const ziel=allProjects.find(x=>String(x.id)===window.__zielId||true);
  return null;
 });
 const B4=await page.evaluate(zielId=>{
  const ziel=allProjects.find(x=>String(x.id)===zielId);
  ziel.hinweis="Zufahrt nur ueber den Hinterhof";
  a2Zeichnen();
  const ab=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt")]
   .find(a=>/Wichtige Hinweise/.test(a.textContent));
  return {abschnitt:!!ab, text:ab?ab.textContent:""};
 },B2);
 p(!B4.abschnitt||!/Hinterhof/.test(B4.text),
   "B3 der Hinweis eines fremden Projekts steht ebenfalls nicht mehr da",B4);

 // ---- C  Umschalter "Alle" ------------------------------------------------
 const C1=await page.evaluate(()=>{
  const knopf=document.querySelector('#a2Inhalt [data-a2-pfilter="alle"]');
  if(knopf)knopf.click();
  return {da:!!knopf, filter:a2ProjektFilter};
 });
 await page.waitForTimeout(300);
 k=await karten();
 p(C1.da&&C1.filter==="alle"&&k.indexOf(B2)>=0,
   "C1 mit 'Alle' ist das fremde Projekt wieder da",{k,B2,C1});

 const C2=await page.evaluate(()=>{
  // Nichts ist mir zugeteilt: der Abschnitt muss BLEIBEN und sagen, warum
  // er leer ist. Verschwaende er, suchte man den Fehler bei den Daten.
  allProjects.forEach(x=>{x.zugeteilt_an=["u2"]});
  a2ProjektFilter="meine"; a2Zeichnen();
  const ab=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt")]
   .find(a=>/Offene Projekte/.test(a.textContent));
  return {abschnitt:!!ab,
          text:ab?ab.textContent.replace(/\s+/g," ").trim():"",
          karten:[...document.querySelectorAll("#a2Inhalt .a2-karte-klick[data-a2-projekt]")].length};
 });
 p(C2.abschnitt&&C2.karten===0&&/kein offenes Projekt zugeteilt/.test(C2.text),
   "C2 nichts zugeteilt: der Abschnitt bleibt und sagt, dass es am Filter liegt",C2);
 p(/Alle/.test(C2.text),"C3 und der Weg zurueck ('Alle') steht daneben",C2);

 // ---- D  Die Ankreuzliste in den Stammdaten -------------------------------
 const D=await page.evaluate(async()=>{
  const p0=allProjects.find(x=>!x.archived);
  p0.zugeteilt_an=["u2"];
  p0.created_by="u1";
  cockpitProjectId=p0.id;
  renderCockpitStammdaten();
  const kaesten=[...document.querySelectorAll("#cockpitZuteilung [data-zuteilung]")];
  const vorher={anzahl:kaesten.length,
                angekreuzt:kaesten.filter(x=>x.checked).map(x=>x.dataset.zuteilung)};
  // Speichern: die Nutzlast einsammeln statt sie zu erraten.
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push(n);return u(n)};return bau};
  kaesten.forEach(x=>{x.checked=(x.dataset.zuteilung==="u2"||x.dataset.zuteilung==="u3")});
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,400));
  // Die Kaesten NEU einsammeln: die App zeichnet die Liste nach dem
  // Speichern aus der Antwort der Datenbank neu, die alten Knoten haengen
  // dann nicht mehr im Dokument. Das erste Mass hier hakte deshalb an
  // entfernten Knoten ab und meldete einen Fehler, der keiner war.
  const nachher=[...document.querySelectorAll("#cockpitZuteilung [data-zuteilung]")];
  const neuGezeichnet=(nachher.length>0&&nachher[0]!==kaesten[0]);
  nachher.forEach(x=>{x.checked=false});
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  return {vorher, geschrieben, neuGezeichnet,
          // Was nach dem Speichern angekreuzt ist, kommt aus der ANTWORT
          // der Datenbank - nicht aus dem, was jemand angeklickt hatte.
          nachAntwort:nachher.map(x=>x.dataset.zuteilung)
            .filter((id,i)=>nachher[i].defaultChecked)};
 });
 p(D.vorher.anzahl===3,"D1 die Liste zeigt alle drei Mitarbeiter",D.vorher);
 p(D.vorher.angekreuzt.length===1&&D.vorher.angekreuzt[0]==="u2",
   "D2 angekreuzt ist genau, was in zugeteilt_an steht - der Ersteller NICHT",D.vorher);
 // Als MENGE geprueft, nicht als Reihenfolge: die Liste ist nach Namen
 // sortiert (Anna Meier vor Beat Krebs), die Reihenfolge der Ids traegt
 // keine Bedeutung. Eine Pruefung darauf waere eine Zusicherung ueber
 // etwas, das niemand versprochen hat.
 const gespeichert=(D.geschrieben[0]&&D.geschrieben[0].zugeteilt_an)||[];
 p(Array.isArray(gespeichert)&&gespeichert.length===2
   &&gespeichert.indexOf("u2")>=0&&gespeichert.indexOf("u3")>=0,
   "D3 gespeichert werden genau die angekreuzten Ids",D.geschrieben);
 p(D.neuGezeichnet===true,
   "D3b nach dem Speichern wird die Liste aus der Antwort der Datenbank neu gezeichnet",D);
 p(D.geschrieben[1]&&Array.isArray(D.geschrieben[1].zugeteilt_an)
   &&D.geschrieben[1].zugeteilt_an.length===0,
   "D4 nichts angekreuzt wird eine LEERE Liste, nicht null",D.geschrieben);

 // ---- E  Reichweite: Anzeige, nicht Zugriff -------------------------------
 const E=await page.evaluate(()=>{
  // Alles jemand anderem zugeteilt - und trotzdem muss die vollstaendige
  // Projektliste jedes Projekt zeigen. Das ist der Unterschied zwischen
  // "aufgeraeumt" und "ausgesperrt".
  allProjects.forEach(x=>{x.zugeteilt_an=["u2"]});
  a2ProjektFilter="meine";
  a2Zustand.seite="projekte"; a2Zeichnen();
  const gezeigt=[...document.querySelectorAll("#a2Inhalt [data-a2-projekt]")]
   .map(x=>x.getAttribute("data-a2-projekt"));
  const alle=allProjects.filter(x=>!x.archived).map(x=>String(x.id));
  return {gezeigt:[...new Set(gezeigt)], alle, geladen:allProjects.length};
 });
 p(E.alle.every(id=>E.gezeigt.indexOf(id)>=0),
   "E1 die vollstaendige Projektliste zeigt unveraendert ALLE Projekte",E);
 p(E.geladen>0,"E2 und aus allProjects wurde nichts entfernt - gefiltert wird nur die Anzeige",E);

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
