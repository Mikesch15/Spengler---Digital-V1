// Prueft v3.208: Materialliste als Excel herausgeben, Werkstoff-Startwerte,
// und zwei Aufraeumarbeiten an den Einstellungs-Registern.
//
// GEWUENSCHT
// "Kannst du noch einbauen, dass der firmenadmin die materialliste als
//  exceldatei exportieren kann? Und ich denke, dass die werkstoffe so wie sie
//  jetzt bei mir sind, in allen firmen standartmaessig hinterlegt sind...
//  Entferne das ausmassregister in den einstellungen, es ist leer.
//  Benenne das geschuetzte register in Firma oder etwas passenderes um"
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-material-export-v3-208.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

// Ein Katalog mit genau den Faellen, die zaehlen: ein Blech mit allem, ein
// Blech ohne Werkstoff, eine gewoehnliche Position ohne jedes Blechmerkmal.
const DATEN=()=>{
 settings.materials=[
  ["102.01","Kupferblech","0.6","m²",76.2],
  ["103.02","Titanzink Tafel","0.8","m²",51.95],
  ["301.01","Rinnenhalter","3x25","Stk.",4.2]
 ];
 materialIds=[1,2,3];
 materialWerkstoffe=[3,null,null];
 materialFormate=[
  {staerke_mm:0.6,ausfuehrung:"Blank",form:"rolle",laenge_mm:null,breite_mm:null},
  {staerke_mm:0.8,ausfuehrung:null,form:"tafel",laenge_mm:2000,breite_mm:1000},
  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}
 ];
 materialDemo=[false,false,false];
 measurementMaterials=[{id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000}];
 companyName="PETER KÜNZI AG";
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 const meldungen=[]; page.on("dialog",d=>{meldungen.push(d.message());d.accept()});
 await stubSchuetzen(page);
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,kataloge:true,lager:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(`window.__daten=${DATEN.toString()}`);

 // ---- A  Die Zeilen der Datei ---------------------------------------------
 console.log("\nA · Was in der Datei steht");
 const A=await page.evaluate(()=>{ window.__daten(); return materialExportZeilen(); });
 p(A.length===4,"eine Kopfzeile und drei Positionen",A.length);
 p(JSON.stringify(A[0].slice(0,5))===JSON.stringify(["EDV-Nr.","Material","Dim.","Einheit","Preis"]),
   "die ersten fuenf Spalten sind die des Imports",A[0]);
 p(A[0].length===11&&A[0][5]==="Werkstoff"&&A[0][8]==="Form",
   "dahinter Werkstoff und Blechformat",A[0]);
 p(JSON.stringify(A[1])===JSON.stringify(
    ["102.01","Kupferblech","0.6","m²",76.2,"Kupfer",0.6,"Blank","rolle","",""]),
   "das Blech steht vollstaendig da - Werkstoff aufgeloest, Format dabei",A[1]);
 p(JSON.stringify(A[2])===JSON.stringify(
    ["103.02","Titanzink Tafel","0.8","m²",51.95,"",0.8,"","tafel",2000,1000]),
   "ohne Werkstoff bleibt die Spalte LEER - es wird keiner geraten",A[2]);
 p(JSON.stringify(A[3])===JSON.stringify(
    ["301.01","Rinnenhalter","3x25","Stk.",4.2,"","","","","",""]),
   "eine gewoehnliche Position traegt keine Blechmerkmale",A[3]);
 // Die Falle: null/undefined duerfen nie als Text in der Datei landen.
 const textAlles=JSON.stringify(A);
 p(!/null|undefined|\[object/.test(textAlles),
   "nirgends steht 'null' oder 'undefined' in der Datei",textAlles.slice(0,200));

 // ---- B  Der Dateiname -----------------------------------------------------
 console.log("\nB · Der Dateiname");
 const B=await page.evaluate(()=>materialExportDateiname());
 p(/^Materialliste .+ \d{4}-\d{2}-\d{2}\.xlsx$/.test(B),"Materialliste, Firma, Datum, .xlsx",B);
 p(B.indexOf("PETER")>=0,"die Firma steht drin",B);
 p(!/[\\\/:*?"<>|]/.test(B),"keine Zeichen, die kein Dateisystem mag",B);

 // ---- C  Der ganze Weg -----------------------------------------------------
 console.log("\nC · Herausgeben");
 const C=await page.evaluate(async()=>{
  window.__daten();
  const gerufen=[];
  window.XLSX={utils:{
    aoa_to_sheet:z=>({__zeilen:z}),
    book_new:()=>({blaetter:{}}),
    book_append_sheet:(mappe,blatt,name)=>{mappe.blaetter[name]=blatt}
   },
   writeFile:(mappe,name)=>{gerufen.push({name,blaetter:Object.keys(mappe.blaetter),
     zeilen:mappe.blaetter[Object.keys(mappe.blaetter)[0]].__zeilen.length})}};
  const r=await materialExcelExport();
  return {r,gerufen};
 });
 p(C.r===true&&C.gerufen.length===1,"die Datei wird genau einmal geschrieben",C);
 p(C.gerufen[0].blaetter.join()==="Material","das Blatt heisst Material",C.gerufen[0]);
 p(C.gerufen[0].zeilen===4,"mit Kopfzeile und drei Positionen",C.gerufen[0]);

 // ---- D  Wann NICHT geschrieben wird ---------------------------------------
 console.log("\nD · Wann nichts geschrieben wird");
 const D=await page.evaluate(async()=>{
  window.__daten();
  settings.materials=[]; materialIds=[]; materialFormate=[]; materialWerkstoffe=[];
  const gerufen=[];
  window.XLSX={utils:{aoa_to_sheet:z=>({__zeilen:z}),book_new:()=>({blaetter:{}}),
    book_append_sheet:(m,bl,n)=>{m.blaetter[n]=bl}},
   writeFile:(m,n)=>gerufen.push(n)};
  const leer=await materialExcelExport();
  window.__daten();
  meineRechte={admin:false};
  currentProfile={id:"u1",role:"user",company_id:"c1"};
  const ohneRecht=await materialExcelExport();
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,kataloge:true,lager:true};
  return {leer,ohneRecht,gerufen};
 });
 p(D.leer===false,"leerer Katalog: keine Datei",D.leer);
 p(D.ohneRecht===false,"kein Firmenadministrator: keine Datei",D.ohneRecht);
 p(D.gerufen.length===0,"in beiden Faellen wurde WIRKLICH nichts geschrieben",D.gerufen);
 p(meldungen.length>=2,"und beide Male steht der Grund da, statt stiller Leere",meldungen);

 // ---- E  Der Knopf ---------------------------------------------------------
 console.log("\nE · Der Knopf steht im Bereich des Firmenadministrators");
 const html=lies("index.html");
 p(html.indexOf('id="materialExcelExport"')>=0,"der Knopf steht in index.html");
 const iPanel=html.indexOf('data-settings-panel="protected"');
 const iKnopf=html.indexOf('id="materialExcelExport"');
 p(iPanel>=0&&iKnopf>iPanel,"und zwar INNERHALB des geschuetzten Registers",{iPanel,iKnopf});
 const E=await page.evaluate(()=>{
  const k=$("materialExcelExport");
  return {da:!!k,verdrahtet:!!(k&&typeof k.onclick==="function"),text:k?k.textContent.trim():""};
 });
 p(E.da&&E.verdrahtet,"und ist verdrahtet",E);
 p(/Excel/.test(E.text),"und sagt, was er tut",E.text);

 // ---- F  Das leere Ausmass-Register ist weg --------------------------------
 console.log("\nF · Das leere Register Ausmass");
 p(html.indexOf('data-settings-tab="ausmass"')<0,"der Registerknopf ist weg");
 p(html.indexOf('data-settings-panel="ausmass"')<0,"und die leere Seite dahinter auch");
 const F=await page.evaluate(()=>({
  tabs:[...document.querySelectorAll("#settingsModal .settings-tab")].map(t=>t.dataset.settingsTab),
  panels:[...document.querySelectorAll("#settingsModal .settings-tab-panel")].map(t=>t.dataset.settingsPanel)
 }));
 p(F.tabs.indexOf("ausmass")<0&&F.panels.indexOf("ausmass")<0,"auch im geladenen Schirm nicht mehr da",F);
 // GEGENPROBE: die uebrigen vier Register sind unveraendert da - es wurde
 // nicht versehentlich mehr entfernt als das eine leere.
 p(JSON.stringify(F.tabs)===JSON.stringify(["general","measurements","lager","protected"]),
   "die vier uebrigen Register stehen unveraendert",F.tabs);
 p(JSON.stringify(F.panels)===JSON.stringify(["general","measurements","lager","protected"]),
   "und zu jedem gibt es genau eine Seite",F.panels);

 // ---- G  "Geschützt" heisst jetzt "Betrieb" --------------------------------
 console.log("\nG · Das Register heisst nach seinem Inhalt");
 const G=await page.evaluate(()=>{
  const k=document.querySelector('[data-settings-tab="protected"]');
  return {text:k?k.textContent.trim():"",schluessel:k?k.dataset.settingsTab:""};
 });
 p(G.text==="Betrieb","der Registerknopf heisst Betrieb",G);
 p(G.schluessel==="protected",
   "der interne Schluessel bleibt 'protected' - daran haengen die openSettingsTo-Aufrufe",G);
 // Kein sichtbarer Text sagt mehr "Geschützt". Kommentare zaehlen nicht.
 const sichtbar=t=>t.replace(/<!--[\s\S]*?-->/g,"").replace(/^\s*\/\/.*$/gm,"");
 p(sichtbar(html).indexOf("Geschützt")<0,"in index.html steht das Wort nirgends mehr");
 p(lies("js/41-hilfe.js").indexOf("Geschützt")<0,"und in der Hilfe auch nicht");
 p((lies("js/41-hilfe.js").match(/→ Betrieb/g)||[]).length>=2,
   "die Hilfe nennt den neuen Namen",(lies("js/41-hilfe.js").match(/→ Betrieb/g)||[]).length);

 // ---- H  Die Werkstoffe jeder neuen Firma ----------------------------------
 console.log("\nH · Werkstoffe als Startwert jeder Firma");
 const start=lies("supabase/functions/register-company/_startwerte.ts");
 const erwartet=[["Aluminium (Aluman)",4000,2000],["Titanzink",5000,2500],["Kupfer",6000,3000],
   ["CrNi-Stahl",6000,3000],["Chromstahl, verzinnt",6000,3000],["Stahl",8000,4000],
   ["Messing",0,0],["Blei",0,0]];
 erwartet.forEach(([name,maxA,fix])=>{
  const z=new RegExp('name:\\s*"'+name.replace(/[()\\.*+?^${}|[\]]/g,"\\$&")
    +'"[^\\n]*max_abstand_mm:\\s*'+maxA+',\\s*ab_fixpunkt_mm:\\s*'+fix);
  p(z.test(start),"Startwert "+name+" ("+maxA+"/"+fix+" mm)");
 });
 p((start.match(/legacy_key:/g)||[]).length===8,
   "genau acht Werkstoffe - nicht mehr und nicht weniger",
   (start.match(/legacy_key:/g)||[]).length);

 // Und die beiden ohne Dehnungswerte kommen mit der Entscheidung dazu, sonst
 // stuende jede neue Firma am ersten Tag vor zwei roten Meldungen.
 const idx=lies("supabase/functions/register-company/index.ts");
 p(/kontroll_abweisungen/.test(idx),"die Registrierung schreibt Abweisungen");
 p(/pruefung:\s*"werkstoff-ohne-dila"/.test(idx),"und zwar fuer genau diese Pruefung");
 p(/!\(w\.max_abstand_mm > 0\) \|\| !\(w\.ab_fixpunkt_mm > 0\)/.test(idx),
   "abgehakt wird nur, was WIRKLICH keine Dehnungswerte hat");
 p(/gegenstand:\s*String\(nachSchluessel\[w\.legacy_key\]/.test(idx),
   "abgehakt wird der einzelne Werkstoff ueber seine Id, nicht die Pruefung");
 p(/\.filter\(\(z\) => z\.gegenstand\)/.test(idx),
   "ohne Id wird nichts geschrieben - es wird nicht auf gut Glueck abgehakt");

 // ---- I  Verdrahtung und Sauberkeit ----------------------------------------
 console.log("\nI · Verdrahtung");
 p(lies("js/08-katalog-blitzschutz.js").indexOf("XLSX.writeFile")>=0,"der Export schreibt ueber XLSX");
 p(/if\(!await xlsxLaden\(\)\)/.test(lies("js/08-katalog-blitzschutz.js").split("materialExcelExport")[1]||""),
   "und laedt die Excel-Funktion vorher nach, wie der Import");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
