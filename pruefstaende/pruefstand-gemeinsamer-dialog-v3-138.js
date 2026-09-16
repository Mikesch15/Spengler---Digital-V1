// Prueft den gemeinsamen Anlege-Dialog (v3.138).
//
// Gemeldet vom Anwender: "ich wuerde auch gerne in der materialverwaltung ein
// neues produkt anlegen koennen. Soll beides die gleiche funktion sein."
//
// Vorher waren es zwei Wege:
//   - Einstellungen -> Material: "＋ Material hinzufuegen" legte STUMM eine
//     leere Zeile an, die man danach in der Liste ausfuellen musste.
//   - Lagerverwaltung: ein vollstaendiger Dialog mit Bezeichnung, Einheit,
//     Preis und begruendetem Nummernvorschlag.
//
// Jetzt ist es EIN Dialog. Ein Schalter entscheidet, ob zur Katalogposition
// gleich ein Lager-Produkt (mit Barcode) entsteht: aus der Lagerverwaltung
// gesetzt, aus dem Katalog nicht - beides jederzeit umstellbar.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-gemeinsamer-dialog-v3-138.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1600}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__db={materials:[{id:1,edv_nr:"100.55",name:"CNS 1.4301",dim:"",unit:"Stk.",price:0}],log:[]};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:(t)=>{const z={t};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  ["eq","order","limit","not","delete","update","upsert"].forEach(k=>{if(!q[k])q[k]=()=>q});
  const lauf=()=>{
   if(z.op==="insert"){window.__db.log.push({t,d:z.daten});
    if(t==="materials"){
     // Die ECHTE Eindeutigkeitsregel - sonst beweist der Lauf nichts.
     if(window.__db.materials.some(m=>m.edv_nr===z.daten.edv_nr))
      return {data:null,error:{message:'duplicate key value violates unique constraint "materials_edv_nr_key"'}};
     const m=Object.assign({id:window.__db.materials.length+1},z.daten);
     window.__db.materials.push(m); return {data:[m],error:null};}
    return {data:[Object.assign({id:99},z.daten)],error:null};}
   if(t==="materials")return {data:window.__db.materials,error:null};
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 const grund=()=>page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  meineRechte={admin:true,kataloge:true,lager:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  settings.materials=[["100.55","CNS 1.4301","","Stk.",0]]; materialIds=[1];
  lagerVarianten=[]; window.__db.log=[];
 });
 await grund();
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const zustand=()=>page.evaluate(()=>({
   offen:!$("lagerNeuesProduktModal").hidden,
   titel:$("lagerNeuesProduktTitel").innerText.trim(),
   knopf:$("lagerNeuesProduktSpeichern").textContent.trim(),
   mitProdukt:$("lagerNeuesProduktMitProdukt").checked,
   bezeichnung:!$("lagerNeuesProduktBezeichnungFeld").hidden,
   positionSuche:!$("lagerNeuesProduktPositionFeld").hidden,
   barcode:!$("lagerNeuesProduktBarcodeFeld").hidden,
   neuePosition:!$("lagerNeuePositionBlock").hidden,
   nr:$("lagerNeuePositionNr").value}));
 const schalter=an=>page.evaluate(a=>{
   const c=$("lagerNeuesProduktMitProdukt"); c.checked=a; c.dispatchEvent(new Event("change"));
 },an);

 console.log("\nA · Es ist wirklich EIN Dialog");
 const eins=await page.evaluate(()=>({
   modal:!!$("lagerNeuesProduktModal"), schalter:!!$("lagerNeuesProduktMitProdukt"),
   fn:typeof lagerNeuesProduktOeffnen==="function"}));
 p(eins.modal&&eins.schalter&&eins.fn,"Dialog, Schalter und Oeffnen-Funktion sind da",eins);
 // Die eigentliche Zusicherung des Auftrags ("soll beides die gleiche
 // Funktion sein"): beide Wege oeffnen DASSELBE Fenster. Sie faellt durch,
 // sobald jemand daneben einen zweiten Anlege-Dialog baut.
 const ausKatalog=await page.evaluate(()=>{
   $("settingsModal").hidden=false; $("newMaterial").click();
   return Array.from(document.querySelectorAll(".modal")).filter(m=>!m.hidden).map(m=>m.id);
 });
 await page.waitForTimeout(300);
 const ausLager=await page.evaluate(()=>{
   lagerNeuesProduktSchliessen(); $("settingsModal").hidden=true;
   lagerNeuesProduktOeffnen(null,"");
   return Array.from(document.querySelectorAll(".modal")).filter(m=>!m.hidden).map(m=>m.id);
 });
 await page.waitForTimeout(300);
 p(ausKatalog.includes("lagerNeuesProduktModal")&&ausLager.includes("lagerNeuesProduktModal"),
   "beide Wege oeffnen DASSELBE Fenster",{ausKatalog,ausLager});
 await page.evaluate(()=>{lagerNeuesProduktSchliessen();window.__db.log=[]});

 console.log("\nB · Aus dem Material-Katalog: nur die Position");
 await page.evaluate(()=>{$("settingsModal").hidden=false;$("newMaterial").click()});
 await page.waitForTimeout(400);
 const a=await zustand();
 p(a.offen,"der Knopf oeffnet den gemeinsamen Dialog",a);
 // Gegenprobe auf v3.137 und frueher: dort legte der Knopf STUMM eine Zeile
 // an, ohne dass je ein Dialog erschien.
 const stumm=await page.evaluate(()=>window.__db.log.slice());
 p(stumm.length===0,
   "GEGENPROBE: es wird NICHTS stumm angelegt, bevor der Anwender bestaetigt",stumm);
 p(a.mitProdukt===false,"der Produkt-Schalter ist aus",a);
 p(!a.bezeichnung&&!a.barcode,"Produktfelder und Barcode bleiben weg",a);
 p(!a.positionSuche,"und die Positions-Suche auch - die Position entsteht ja gerade",a);
 p(a.neuePosition,"der Block fuer die neue Position steht offen",a);
 p(/^\d+\.\d\d$/.test(a.nr),"mit einer berechneten, freien Nummer",a.nr);
 p(/materialposition/i.test(a.titel),"der Titel sagt, worum es geht",a.titel);
 p(/position anlegen/i.test(a.knopf),"der Knopf ebenso",a.knopf);

 console.log("\nC · Derselbe Dialog, Schalter an: das volle Produkt-Formular");
 await schalter(true);
 const c=await zustand();
 p(c.bezeichnung&&c.barcode&&c.positionSuche,
   "Bezeichnung, Barcode und Positions-Suche kommen zurueck",c);
 p(/produkt/i.test(c.titel),"und der Titel wechselt mit",c.titel);
 p(c.nr===a.nr,"die schon gerechnete Nummer bleibt stehen",{vorher:a.nr,jetzt:c.nr});

 console.log("\nD · Nur Position speichern - ein Schreibvorgang, kein Produkt");
 await schalter(false);
 await page.evaluate(()=>{
  $("lagerNeuePositionName").value="Spezialschraube 6x60";
  $("lagerNeuePositionPreis").value="1.25";
 });
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(600);
 const d=await page.evaluate(()=>({log:window.__db.log,
   offen:!$("lagerNeuesProduktModal").hidden,
   katalog:settings.materials.map(m=>String(m[0])+" "+String(m[1]))}));
 p(d.log.length===1&&d.log[0].t==="materials","genau EIN Schreibvorgang, auf materials",d.log);
 // Gegenprobe: ohne Schalter darf KEIN Lager-Produkt entstehen.
 p(!d.log.some(x=>x.t==="lager_varianten"),
   "GEGENPROBE: es entsteht KEIN Lager-Produkt",d.log.map(x=>x.t));
 p(d.log[0]&&d.log[0].d.name==="Spezialschraube 6x60"&&d.log[0].d.price===1.25,
   "Bezeichnung und Preis kommen aus dem Formular",d.log[0]&&d.log[0].d);
 p(d.log[0]&&d.log[0].d.company_id===undefined,
   "ohne company_id - die setzt die Datenbank",d.log[0]&&d.log[0].d);
 p(!d.offen,"der Dialog schliesst sich",d);
 p(d.katalog.some(x=>/Spezialschraube/.test(x)),
   "und die Position steht sofort im Katalog",d.katalog);

 console.log("\nE · Aus der Lagerverwaltung bleibt alles wie bisher");
 await page.evaluate(()=>{$("settingsModal").hidden=true;window.__db.log=[];
   lagerNeuesProduktOeffnen(null,"7612345678901")});
 await page.waitForTimeout(400);
 const e=await zustand();
 p(e.mitProdukt===true,"dort ist der Schalter gesetzt",e);
 p(e.bezeichnung&&e.barcode&&e.positionSuche,"das Produkt-Formular steht vollstaendig da",e);
 // Gegenprobe: der Weg der Lagerverwaltung darf sich NICHT in einen
 // reinen Positions-Dialog verwandelt haben.
 p(!e.neuePosition,
   "GEGENPROBE: der Neue-Position-Block ist zu - es wird zuerst gesucht",e);
 const bc=await page.evaluate(()=>$("lagerNeuesProduktBarcode").value);
 p(bc==="7612345678901","der gescannte Barcode steht im Feld",bc);

 console.log("\nF · Ohne Bezeichnung wird nichts angelegt");
 await page.evaluate(()=>{$("settingsModal").hidden=false;window.__db.log=[];$("newMaterial").click()});
 await page.waitForTimeout(400);
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(400);
 const f=await page.evaluate(()=>({log:window.__db.log,
   fehler:$("lagerNeuesProduktFehler").textContent.trim(),
   fehlerSichtbar:!$("lagerNeuesProduktFehler").hidden,
   offen:!$("lagerNeuesProduktModal").hidden}));
 p(f.log.length===0,"GEGENPROBE: ohne Bezeichnung wird nichts geschrieben",f.log);
 p(f.fehlerSichtbar&&/Bezeichnung/.test(f.fehler),"und es steht da, was fehlt",f.fehler);
 p(f.offen,"der Dialog bleibt offen, damit man es nachtragen kann",f);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
