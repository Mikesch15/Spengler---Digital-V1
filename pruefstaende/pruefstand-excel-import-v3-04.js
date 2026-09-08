// Prueft den generischen Excel-Import aus v3.04: Spalten zuordnen,
// Pflichtspalten pruefen, Vorschau, verstaendliche Fehler.
// CLAUDE.md 7 verlangt genau das - bis v3.03 war die Spaltenreihenfolge fest.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-excel-import-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Klick ueber evaluate mit Pruefung: der Einstellungsbereich ist zugeklappt,
// page.click liefe in einen Timeout - und ein abgebrochener Pruefstand sieht
// aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(300);
 return r;
}

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__db={log:[],fehler:null,leer:false};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:(t)=>{const z={t};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q}; q.eq=()=>q; q.order=()=>q; q.limit=()=>q;
  q.not=()=>q; // seit v3.29 fragt js/05 die verbrauchten Reste mit .not(...) ab
  const lauf=()=>{window.__db.log.push({t,op:z.op,daten:z.daten});
   if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
   if(z.op==="insert")return {data:window.__db.leer?[]:(z.daten||[]).map((x,i)=>Object.assign({id:i+1},x)),error:null};
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`}));
 // Die echte SheetJS aus node_modules - keine Attrappe.
 const xlsxPfad=path.join(process.env.SP,"node_modules","xlsx","dist","xlsx.full.min.js");
 const hatXlsx=fs.existsSync(xlsxPfad);
 if(hatXlsx){
  const code=fs.readFileSync(xlsxPfad,"utf8");
  await page.route("**://cdn.sheetjs.com/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));
  await page.route("**xlsx.full.min.js",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));
 }
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>{page.__dialog=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"A"};
  meineRechte={admin:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nA · Die Bausteine der Zuordnung");
 const da=await page.evaluate(()=>({auto:typeof importAutoZuordnen==="function",
   name:typeof importSpaltenName==="function", norm:typeof importNormal==="function",
   box:!!$("materialExcelMapping"), fehler:!!$("materialExcelFehler"),
   bzBox:!!$("bzMaterialExcelMapping")}));
 p(da.auto&&da.name&&da.norm,"die Zuordnungs-Funktionen sind vorhanden",da);
 p(da.box&&da.fehler&&da.bzBox,"beide Importe haben einen Zuordnungs-Kasten",da);
 const sp=await page.evaluate(()=>[0,1,25,26,27].map(importSpaltenName));
 p(JSON.stringify(sp)===JSON.stringify(["A","B","Z","AA","AB"]),
   "die Spalten heissen wie in Excel",sp);

 console.log("\nB · Automatisch zuordnen – auch bei anderer Reihenfolge");
 const felder=[{key:"edv_nr",label:"EDV-Nr.",alias:["artikelnr","nummer"]},
   {key:"name",label:"Material",alias:["bezeichnung"]},
   {key:"dim",label:"Dim.",alias:["dimension","abmessung"]},
   {key:"unit",label:"Einheit",alias:["me"]},
   {key:"price",label:"Preis",alias:["chf","verkaufspreis"]}];
 const z1=await page.evaluate(f=>importAutoZuordnen(f,
   ["Artikel-Nr.","Bezeichnung","Abmessung","ME","Verkaufspreis"]),felder);
 p(z1.edv_nr===0&&z1.name===1&&z1.dim===2&&z1.unit===3&&z1.price===4,
   "eine Lieferantenliste mit anderen Spaltennamen wird erkannt",z1);
 const z2=await page.evaluate(f=>importAutoZuordnen(f,
   ["Verkaufspreis","ME","Bezeichnung","Artikel-Nr."]),felder);
 p(z2.price===0&&z2.unit===1&&z2.name===2&&z2.edv_nr===3,
   "auch bei völlig anderer Reihenfolge",z2);
 p(z2.dim===undefined,"eine fehlende Spalte bleibt leer statt geraten",z2);
 const z3=await page.evaluate(f=>importAutoZuordnen(f,["Spalte1","Spalte2","Spalte3"]),felder);
 p(Object.keys(z3).length===0,"nichtssagende Kopfzeilen ergeben KEINE Zuordnung",z3);
 const z4=await page.evaluate(f=>importAutoZuordnen(f,["EDV-Nr.","Material","Dim.","Einheit","Preis"]),felder);
 p(z4.edv_nr===0&&z4.name===1&&z4.price===4,"die eigene Schreibweise trifft ebenfalls",z4);
 // Eine Spalte darf nicht zweimal vergeben werden
 const z5=await page.evaluate(f=>importAutoZuordnen(f,["Nummer","Nummer","Bezeichnung"]),
   [{key:"a",label:"Nummer"},{key:"b",label:"Nummer"},{key:"c",label:"Bezeichnung"}]);
 p(z5.a===0&&z5.b===1,"zwei gleich benannte Spalten werden nicht doppelt vergeben",z5);

 if(!hatXlsx){
  console.log("\n  (SheetJS liegt nicht in node_modules – der Datei-Teil wird uebersprungen)");
 }else{
  console.log("\nC · Eine echte Datei einlesen, zuordnen, importieren");
  // Eine echte xlsx im Browser bauen und dem Eingabefeld unterschieben.
  const geladen=await page.evaluate(async()=>{
   if(typeof XLSX==="undefined")return {xlsx:false};
   const daten=[["Verkaufspreis","ME","Bezeichnung","Artikel-Nr."],
     ["42.50","m2","Titanzink Band","101.10"],
     ["18.00","m","Kupferrohr","202.20"],
     ["","Stk","Ohne Preis","303.30"],
     ["9.90","Stk","","404.40"]];               // ohne Bezeichnung -> Pflicht fehlt
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(daten),"Tabelle1");
   const roh=XLSX.write(wb,{bookType:"xlsx",type:"array"});
   const dt=new DataTransfer();
   dt.items.add(new File([roh],"lieferant.xlsx",
     {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
   const inp=$("materialExcelInput"); inp.files=dt.files;
   inp.dispatchEvent(new Event("change"));
   return {xlsx:true};});
  await page.waitForTimeout(600);
  p(geladen.xlsx,"SheetJS ist geladen");
  const vor=await page.evaluate(()=>({
    sichtbar:!$("materialExcelPreview").hidden,
    zahl:$("materialExcelCount").textContent,
    fehler:$("materialExcelFehler").innerText.replace(/\s+/g," ").trim(),
    felder:Array.from($("materialExcelMapping").querySelectorAll("[data-import-feld]"))
      .map(s=>({feld:s.dataset.importFeld,wert:s.value})),
    kopf:Array.from($("materialExcelTable").querySelectorAll("th")).map(t=>t.textContent),
    zeilen:Array.from($("materialExcelTable").querySelectorAll("tr")).slice(1)
      .map(r=>Array.from(r.querySelectorAll("td")).map(c=>c.textContent))}));
  p(vor.sichtbar,"die Vorschau erscheint");
  const zu={}; vor.felder.forEach(f=>zu[f.feld]=f.wert);
  p(zu.price==="0"&&zu.unit==="1"&&zu.name==="2"&&zu.edv_nr==="3",
    "die Spalten sind automatisch richtig zugeordnet",zu);
  p(zu.dim==="","fuer Dim. gibt es keine Spalte - das Feld bleibt leer",zu);
  p(/3 von 4 Zeilen/.test(vor.zahl),"nur die vollständigen Zeilen werden importiert",vor.zahl);
  p(/kein .Material/.test(vor.fehler),"und es steht verstaendlich da, warum eine fehlt",vor.fehler);
  p(vor.zeilen.length===3&&vor.zeilen[0][0]==="101.10"&&vor.zeilen[0][1]==="Titanzink Band",
    "die Vorschau zeigt die Werte in den richtigen Feldern",vor.zeilen[0]);
  p(vor.zeilen[0][4]==="42.5","der Preis wird als Zahl gelesen",vor.zeilen[0]);
  // Von Hand umstellen
  const nach=await page.evaluate(()=>{
    const sel=$("materialExcelMapping").querySelector('[data-import-feld="name"]');
    sel.value="1"; sel.dispatchEvent(new Event("change"));
    return {zeile:Array.from($("materialExcelTable").querySelectorAll("tr"))[1]
      .querySelectorAll("td")[1].textContent};});
  p(nach.zeile==="m2","eine Zuordnung von Hand wirkt sofort auf die Vorschau",nach);
  await page.evaluate(()=>{const sel=$("materialExcelMapping").querySelector('[data-import-feld="name"]');
    sel.value="2"; sel.dispatchEvent(new Event("change"))});
  // Import
  await page.evaluate(()=>{window.__db.log=[]});
  const kR=await klick(page,"#materialExcelConfirm"); p(kR==="ok","der Import-Knopf laesst sich bedienen",kR);
  const lg=await page.evaluate(()=>window.__db.log.filter(x=>x.op==="insert"));
  p(lg.length===1&&lg[0].daten.length===3,"genau die drei Zeilen werden gesendet",
    lg.length?lg[0].daten.length:lg);
  p(lg.length===1&&lg[0].daten[0].edv_nr==="101.10"&&lg[0].daten[0].name==="Titanzink Band"
    &&lg[0].daten[0].price===42.5&&lg[0].daten[0].unit==="m2",
    "mit den richtig zugeordneten Werten",lg.length?lg[0].daten[0]:null);
  p(lg.length===1&&lg[0].daten[0].company_id===undefined,
    "ohne company_id – die setzt die Datenbank",lg.length?lg[0].daten[0]:null);

  console.log("\nD · Fehlende Pflichtspalte");
  await page.evaluate(async()=>{
   const daten=[["Preis","Einheit"],["1.00","m"]];
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(daten),"T");
   const roh=XLSX.write(wb,{bookType:"xlsx",type:"array"});
   const dt=new DataTransfer(); dt.items.add(new File([roh],"halb.xlsx",{type:"application/octet-stream"}));
   const inp=$("materialExcelInput"); inp.files=dt.files; inp.dispatchEvent(new Event("change"));});
  await page.waitForTimeout(500);
  const halb=await page.evaluate(()=>({
    fehler:$("materialExcelFehler").innerText.replace(/\s+/g," ").trim(),
    zahl:$("materialExcelCount").textContent,
    gesperrt:$("materialExcelConfirm").disabled}));
  p(/Pflichtfeld .EDV-Nr/.test(halb.fehler),"eine fehlende Pflichtspalte wird benannt",halb.fehler);
  p(/0 von 1/.test(halb.zahl),"und es wird nichts importiert",halb.zahl);
  p(halb.gesperrt===true,"der Import-Knopf ist dabei gesperrt",halb);
  // Von Hand zuordnen macht es brauchbar
  const geheilt=await page.evaluate(()=>{
    const a=$("materialExcelMapping").querySelector('[data-import-feld="edv_nr"]');
    a.value="0"; a.dispatchEvent(new Event("change"));
    const n=$("materialExcelMapping").querySelector('[data-import-feld="name"]');
    n.value="1"; n.dispatchEvent(new Event("change"));
    return {zahl:$("materialExcelCount").textContent,gesperrt:$("materialExcelConfirm").disabled}});
  p(/1 von 1/.test(geheilt.zahl),"nach der Zuordnung von Hand geht es",geheilt.zahl);
  p(geheilt.gesperrt===false,"und der Knopf wird frei",geheilt);
  await klick(page,"#materialExcelCancel");

  console.log("\nE · Stiller Fehlschlag wird nicht als Erfolg gemeldet");
  await page.evaluate(async()=>{
   window.__db.leer=true; window.__db.log=[];
   const daten=[["EDV-Nr.","Material"],["1","X"]];
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(daten),"T");
   const roh=XLSX.write(wb,{bookType:"xlsx",type:"array"});
   const dt=new DataTransfer(); dt.items.add(new File([roh],"x.xlsx",{type:"application/octet-stream"}));
   const inp=$("materialExcelInput"); inp.files=dt.files; inp.dispatchEvent(new Event("change"));});
  await page.waitForTimeout(500);
  page.__dialog="";
  const kR2=await klick(page,"#materialExcelConfirm"); p(kR2==="ok","der Import-Knopf laesst sich auch hier bedienen",kR2);
  const meldung=await page.evaluate(()=>"");
  p(/nichts importiert/i.test(page.__dialog||""),
    "0 betroffene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1)",page.__dialog);
  await page.evaluate(()=>{window.__db.leer=false});
 }

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
