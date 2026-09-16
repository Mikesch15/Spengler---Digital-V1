// Prueft den Aufbau-Hinweis am Excel-Import (v3.135).
//
// Der Anwender fragte, wie seine Datei aussehen muss, damit die Positionen
// richtig erkannt werden. Der Hinweis dazu stand bisher NUR im Vorschau-
// Fenster - also erst, nachdem die Datei schon ausgewaehlt war. Zu spaet.
//
// Der Vertrag, den dieser Pruefstand festhaelt:
//   1. Der Hinweis ist VOR dem Auswaehlen der Datei erreichbar.
//   2. Er wird aus cfg.felder erzeugt, nicht daneben von Hand gepflegt -
//      jede Spalte des Imports steht darin, mit Pflicht-Kennzeichnung und
//      den Ueberschriften, mit denen die Zuordnung wirklich arbeitet.
//   3. Er nennt die Schluesselspalte, ueber die abgeglichen wird.
//   4. Eine Zahlenspalte, in der Text steht ("Fr. 7.90"), wird in der
//      Vorschau benannt - sie wuerde sonst still zu 0.00.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-excel-aufbau-hinweis-v3-135.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};["insert","upsert","select","eq","order","limit","not","delete","update"].forEach(k=>q[k]=()=>q);
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g); return q}})};`}));
 const xlsxPfad=path.join(process.env.SP,"node_modules","xlsx","dist","xlsx.full.min.js");
 if(!fs.existsSync(xlsxPfad)){
  console.log("  FEHLGESCHLAGEN: SheetJS fehlt in node_modules ("+xlsxPfad+")");
  console.log("\n=== 0 ok, 1 fehlgeschlagen ===");
  await b.close(); process.exit(1);
 }
 const code=fs.readFileSync(xlsxPfad,"utf8");
 await page.route("**://cdn.sheetjs.com/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));
 await page.route("**xlsx.full.min.js",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{currentProfile={id:"u1",role:"admin",company_id:"A"};meineRechte={admin:true};allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;});
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nA · Der Hinweis steht VOR dem Auswaehlen der Datei");
 const lage=await page.evaluate(()=>{
  const el=$("materialExcelAufbau");
  if(!el)return {da:false};
  const vorschau=$("materialExcelPreview");
  return {da:true, text:el.innerText.replace(/\s+/g," ").trim(),
    // Entscheidend: der Kasten darf NICHT im (versteckten) Vorschaufenster
    // liegen, sonst ist er erst nach der Dateiwahl zu sehen.
    imVorschaufenster:vorschau.contains(el),
    vorschauVersteckt:vorschau.hidden,
    // Er haengt in einem <details> - zugeklappt, aber jederzeit da.
    imDetails:!!el.closest("details"),
    zusammenfassung:(el.closest("details")||{}).querySelector
      ? el.closest("details").querySelector("summary").innerText.trim() : ""};
 });
 p(lage.da,"der Kasten fuer den Aufbau-Hinweis ist vorhanden",lage);
 p(lage.vorschauVersteckt===true,"das Vorschaufenster ist ohne Datei noch versteckt",lage);
 p(lage.imVorschaufenster===false,
   "GEGENPROBE: der Hinweis liegt NICHT im versteckten Vorschaufenster",lage);
 p(lage.imDetails,"er haengt in einem aufklappbaren Abschnitt",lage);
 p(/aufgebaut/i.test(lage.zusammenfassung),
   "dessen Titel die Frage des Anwenders aufnimmt",lage.zusammenfassung);
 p((lage.text||"").length>200,"und er ist nicht leer",(lage.text||"").slice(0,80));

 console.log("\nB · Der Hinweis kommt aus cfg.felder, nicht aus einer zweiten Liste");
 const txt=lage.text;
 // Jedes Feld des Material-Imports muss vorkommen. Kaeme spaeter eine
 // Spalte dazu und der Hinweis waere von Hand gepflegt, fiele das hier auf.
 ["EDV-Nr.","Material","Dim.","Einheit","Preis"].forEach(f=>{
  p(txt.includes(f),`die Spalte „${f}" steht im Hinweis`,txt.slice(0,120));
 });
 p(/EDV-Nr\.\s*Pflicht/.test(txt)&&/Material\s*Pflicht/.test(txt),
   "die beiden Pflichtspalten sind als Pflicht gekennzeichnet",txt.slice(0,200));
 p(/Dim\.\s*freiwillig/.test(txt),"eine freiwillige Spalte ist als solche gekennzeichnet",txt);
 // Die Ueberschriften, mit denen importAutoZuordnen wirklich arbeitet.
 p(txt.includes("artikelnummer")&&txt.includes("verkaufspreis"),
   "die erkannten Ueberschriften stammen aus der echten Alias-Liste",txt);
 p(/Schreibweise kommt es nicht an/.test(txt),
   "und es steht da, dass die Schreibweise egal ist",txt);
 p(/EDV-Nr\./.test(txt)&&/aktualisiert statt doppelt angelegt/.test(txt),
   "der Abgleich ueber die Schluesselspalte wird genannt",txt);
 p(/nur einmal vorkommen/.test(txt),
   "ebenso, dass dieselbe Nummer nur einmal vorkommen darf",txt);
 p(/7\.90/.test(txt)&&/als reine Zahl/.test(txt),
   "und wie Preise geschrieben werden muessen",txt);

 console.log("\nC · Der Blitzschutz-Katalog bekommt SEINE Spalten, nicht dieselben");
 const bz=await page.evaluate(()=>$("bzMaterialExcelAufbau").innerText.replace(/\s+/g," ").trim());
 p(bz.includes("Artikel-Nr.")&&bz.includes("Bezeichnung")&&bz.includes("werkstoff"),
   "der Hinweis nennt die Spalten des Blitzschutz-Katalogs",bz.slice(0,140));
 // Gegenprobe: waere der Hinweis fest verdrahtet statt aus cfg.felder
 // erzeugt, stuenden hier die Material-Spalten.
 p(!bz.includes("EDV-Nr.")&&!bz.includes("Dim."),
   "GEGENPROBE: NICHT die Spalten des Material-Katalogs",bz.slice(0,140));
 p(/Artikel-Nr\./.test(bz)&&/aktualisiert statt doppelt angelegt/.test(bz),
   "und seine eigene Schluesselspalte",bz);
 // Blitzschutz hat keine Zahlenspalte - der Preis-Satz gehoert dort nicht hin.
 p(!/als reine Zahl/.test(bz),
   "GEGENPROBE: ohne Zahlenspalte steht der Preis-Hinweis nicht da",bz);

 console.log("\nD · Text in einer Zahlenspalte wird benannt, statt still 0.00 zu werden");
 await page.evaluate(async()=>{
  const daten=[["EDV-Nr.","Material","Preis"],
    ["1.1","Mit Waehrung","Fr. 7.90"],
    ["1.2","Sauber","7.90"],
    ["1.3","Echte Null","0.00"],
    ["1.4","Strich","-"]];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(daten),"T");
  const roh=XLSX.write(wb,{bookType:"xlsx",type:"array"});
  const dt=new DataTransfer(); dt.items.add(new File([roh],"k.xlsx",{type:"application/octet-stream"}));
  const inp=$("materialExcelInput"); inp.files=dt.files; inp.dispatchEvent(new Event("change"));
 });
 await page.waitForTimeout(700);
 const warn=await page.evaluate(()=>$("materialExcelFehler").innerText.replace(/\s+/g," ").trim());
 p(/1 Zeile\(n\) haben bei .Preis/.test(warn),
   "genau EINE Zeile wird bemaengelt",warn);
 p(/Fr\. 7\.90/.test(warn),"mit dem Wert, der das Problem macht",warn);
 p(/0\.00/.test(warn),"und der Folge, die sonst unbemerkt bliebe",warn);
 // Gegenproben: eine echte Null und ein Strich sind gewollt, kein Lesefehler.
 p(!/2 Zeile|3 Zeile/.test(warn),
   "GEGENPROBE: „0.00\" und „-\" gelten NICHT als Lesefehler",warn);

 console.log("\nE · Der Text im Vorschaufenster stimmt mit dem Verhalten ueberein");
 const info=await page.evaluate(()=>
   $("materialExcelPreview").querySelector(".info").innerText.replace(/\s+/g," ").trim());
 p(/aktualisiert/.test(info),"er sagt, dass eine bekannte Nummer aktualisiert wird",info);
 p(/Gelöscht wird nie/.test(info),"und dass nie geloescht wird",info);
 // Gegenprobe auf den Stand vor v3.134: damals stand dort, es werde nichts
 // ueberschrieben. Das war schon vor dem Umbau nicht wahr und ist es jetzt
 // erst recht nicht.
 p(!/nichts wird gelöscht oder überschrieben/i.test(info),
   "GEGENPROBE: der ueberholte Satz „nichts wird überschrieben\" ist weg",info);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
