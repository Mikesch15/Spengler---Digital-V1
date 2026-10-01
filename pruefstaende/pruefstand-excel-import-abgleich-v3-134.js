// Prueft den Excel-Import ab v3.134: Abgleich (upsert) statt reinem Anlegen.
//
// Der Anwender wollte seine bestehende Materialliste einlesen koennen, ohne
// dass dabei etwas kaputtgeht. Der Vertrag, den dieser Pruefstand festhaelt:
//   1. Vor dem Speichern steht da, was passiert: wie viele Positionen neu
//      sind, wie viele geaendert werden (mit alt -> neu je Feld) und wie
//      viele unveraendert bleiben.
//   2. Geschrieben wird NUR, was neu oder geaendert ist.
//   3. Geloescht wird NIE. Positionen, die in der Datei fehlen, bleiben.
//   4. Spalten, die die Datei nicht mitbringt, stehen nicht im Datensatz -
//      der Wert in der Datenbank bleibt dadurch stehen statt geleert zu
//      werden.
//   5. Dieselbe Nummer zweimal in einer Datei wird abgelehnt, bevor
//      irgendetwas geschrieben wird.
//
// Jede dieser Zusagen hat hier eine Gegenprobe - eine Pruefung, die
// anschlaegt, wenn das alte Verhalten (alles blind anlegen) zurueckkommt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-excel-import-abgleich-v3-134.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__db={log:[],fehler:null,nurEine:false};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:(t)=>{const z={t};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.upsert=(d,o)=>{z.op="upsert";z.daten=d;z.opt=o;return q};
  q.delete=()=>{z.op="delete";return q};   // nur da, damit ein Loeschversuch auffaellt
  q.update=d=>{z.op="update";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q}; q.eq=()=>q; q.order=()=>q; q.limit=()=>q; q.not=()=>q;
  const lauf=()=>{window.__db.log.push({t,op:z.op,daten:z.daten,opt:z.opt});
   if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
   if(z.op==="upsert"||z.op==="insert"){
    const alle=(z.daten||[]).map((x,i)=>Object.assign({id:i+1},x));
    return {data:window.__db.nurEine?alle.slice(0,1):alle,error:null};
   }
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`}));
 const xlsxPfad=path.join(process.env.SP,"node_modules","xlsx","dist","xlsx.full.min.js");
 if(!fs.existsSync(xlsxPfad)){
  // Ohne SheetJS waere dieser Pruefstand ohne Aussage - das muss auffallen,
  // statt als "keine Fehler" durchzugehen.
  console.log("  FEHLGESCHLAGEN: SheetJS fehlt in node_modules ("+xlsxPfad+")");
  console.log("\n=== 0 ok, 1 fehlgeschlagen ===");
  await b.close(); process.exit(1);
 }
 const code=fs.readFileSync(xlsxPfad,"utf8");
 await page.route("**://cdn.sheetjs.com/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));
 await page.route("**xlsx.full.min.js",r=>r.fulfill({status:200,contentType:"application/javascript",body:code}));

 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // Ein Katalog, wie ihn der Anwender heute hat. dim ist bewusst gefuellt:
 // die Testdatei bringt keine Dim.-Spalte mit, und genau dieser Wert darf
 // nicht verlorengehen.
 async function katalogSetzen(){
  await page.evaluate(()=>{
   currentProfile={id:"u1",role:"admin",company_id:"A"}; meineRechte={admin:true}; allProjects=[];
   $("appRoot").hidden=false;$("authScreen").hidden=true;
   settings.materials=[
    ["101.10","Titanzink Band","0.7 mm","m2",42.5],
    ["202.20","Kupferrohr","80 mm","m",18.0],
    ["777.77","Nicht in der Datei","","Stk",3.0]];
  });
 }
 // Eine echte xlsx im Browser bauen und dem Eingabefeld unterschieben.
 async function dateiLaden(zeilen,eingabe){
  dialoge=[];
  await page.evaluate(async a=>{
   // v3.205: xlsx haengt nicht mehr im Kopf von index.html, sondern wird
   // bei Bedarf geholt (xlsxLaden in js/01) - hier genauso wie in der App.
   await xlsxLaden();
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a.zeilen),"T");
   const roh=XLSX.write(wb,{bookType:"xlsx",type:"array"});
   const dt=new DataTransfer();
   dt.items.add(new File([roh],"katalog.xlsx",{type:"application/octet-stream"}));
   const inp=$(a.eingabe); inp.files=dt.files; inp.dispatchEvent(new Event("change"));
  },{zeilen,eingabe:eingabe||"materialExcelInput"});
  await page.waitForTimeout(700);
 }
 const vorschau=id=>page.evaluate(x=>({
   zahl:$(x.count).innerText.replace(/\s+/g," ").trim(),
   knopf:$(x.confirm).textContent,
   gesperrt:$(x.confirm).disabled,
   hinweis:$(x.fehler).innerText.replace(/\s+/g," ").trim(),
   zeilen:Array.from($(x.table).querySelectorAll("tr")).slice(1)
     .map(r=>Array.from(r.querySelectorAll("td")).map(c=>c.innerText))
 }),id);
 const MAT={count:"materialExcelCount",confirm:"materialExcelConfirm",
   fehler:"materialExcelFehler",table:"materialExcelTable"};
 const schreibungen=()=>page.evaluate(()=>window.__db.log
   .filter(x=>x.op==="upsert"||x.op==="insert"||x.op==="update"||x.op==="delete"));
 async function importieren(){
  await page.evaluate(()=>{window.__db.log=[]});
  dialoge=[];
  await page.evaluate(()=>$("materialExcelConfirm").click());
  await page.waitForTimeout(700);
 }

 console.log("\nA · Die Vorschau sagt vor dem Speichern, was passiert");
 await katalogSetzen();
 await dateiLaden([["EDV-Nr.","Material","Einheit","Preis"],
   ["101.10","Titanzink Band","m2","42.50"],   // unveraendert
   ["202.20","Kupferrohr","m","19.80"],        // Preis geaendert
   ["303.30","Neues Blech","Stk","7.00"]]);    // neu
 const v=await vorschau(MAT);
 p(/\b1\b[^0-9]*neu/.test(v.zahl),"eine Position wird als neu gezaehlt",v.zahl);
 p(/1[^0-9]*werden geändert/.test(v.zahl),"eine als geaendert",v.zahl);
 p(/1 unverändert/.test(v.zahl),"und eine als unveraendert",v.zahl);
 p(/nichts gelöscht/i.test(v.zahl),
   "und es steht ausdruecklich da, dass nichts geloescht wird",v.zahl);
 p(/1 anlegen, 1 ändern/.test(v.knopf),"der Knopf sagt dasselbe",v.knopf);
 const geaendert=v.zeilen.filter(z=>z[0]==="geändert");
 p(geaendert.length===1&&geaendert[0][1]==="202.20","die geaenderte Zeile steht zuerst",v.zeilen.map(z=>z[0]));
 p(geaendert.length===1&&/Preis: 18 → 19\.8/.test(geaendert[0][6]),
   "mit alt → neu genau beim Preis",geaendert.length?geaendert[0][6]:null);
 p(v.zeilen.some(z=>z[0]==="neu"&&z[1]==="303.30"),"die neue Position ist als neu gekennzeichnet",v.zeilen);
 p(v.zeilen.some(z=>z[0]==="gleich"&&z[1]==="101.10"),"die unveraenderte als gleich",v.zeilen);
 // Gegenprobe: ohne Abgleich waeren alle drei Zeilen "neu" gewesen.
 p(v.zeilen.filter(z=>z[0]==="neu").length===1,
   "GEGENPROBE: NICHT alle Zeilen gelten als neu (altes Verhalten)",v.zeilen.map(z=>z[0]));
 p(/Ohne Spalte: Dim/.test(v.hinweis)&&/unverändert/.test(v.hinweis),
   "die fehlende Dim.-Spalte wird als „bleibt unveraendert\" erklaert",v.hinweis);

 console.log("\nB · Geschrieben wird nur, was neu oder geaendert ist");
 await importieren();
 const s1=await schreibungen();
 const up=s1.filter(x=>x.t==="materials"&&x.op==="upsert");
 p(up.length===1,"genau ein Schreibvorgang auf den Katalog",s1.map(x=>x.t+"/"+x.op));
 // v3.143: Die Eindeutigkeitsregel heisst jetzt UNIQUE (company_id, edv_nr) -
 // die Nummer ist je FIRMA eindeutig, nicht mehr weltweit. onConflict muss
 // genau die Spalten dieser Regel nennen, sonst findet Postgres sie nicht
 // und der ganze Import bricht ab. Erwartung nachgezogen, nicht gelockert.
 p(up.length===1&&up[0].opt&&up[0].opt.onConflict==="company_id,edv_nr",
   "und zwar ein Abgleich ueber Firma + EDV-Nr.",up.length?up[0].opt:null);
 // Gegenprobe dazu: company_id gehoert in das KONFLIKTZIEL, aber NIE in die
 // gesendeten Daten - die Firmenzuordnung kommt in diesem Projekt immer
 // serverseitig aus dem Vorgabewert my_company_id(), nie vom Client.
 p(up.length===1&&up[0].daten.every(x=>!("company_id" in x)),
   "GEGENPROBE: keine company_id in den gesendeten Daten",up.length?up[0].daten:null);
 const gesendet=up.length?up[0].daten:[];
 p(gesendet.length===2,"es werden zwei Zeilen gesendet, nicht drei",gesendet.map(x=>x.edv_nr));
 p(gesendet.some(x=>x.edv_nr==="303.30")&&gesendet.some(x=>x.edv_nr==="202.20"),
   "die neue und die geaenderte",gesendet.map(x=>x.edv_nr));
 // Gegenprobe 1: die unveraenderte Zeile wird gar nicht erst angefasst.
 p(gesendet.length===2&&!gesendet.some(x=>x.edv_nr==="101.10"),
   "GEGENPROBE: die unveraenderte Zeile wird NICHT mitgeschrieben",gesendet.map(x=>x.edv_nr));
 // Gegenprobe 2: nichts wird geloescht - auch nicht die Position, die in
 // der Datei fehlt.
 p(!s1.some(x=>x.op==="delete"),"GEGENPROBE: es wird nichts geloescht",s1.map(x=>x.op));
 p(gesendet.length===2&&!gesendet.some(x=>x.edv_nr==="777.77"),
   "die Position, die in der Datei fehlt, wird nicht angefasst",gesendet.map(x=>x.edv_nr));
 // Gegenprobe 3: kein blosses insert mehr - das waere an der
 // Eindeutigkeitsregel der Datenbank gescheitert.
 p(!s1.some(x=>x.t==="materials"&&x.op==="insert"),
   "GEGENPROBE: kein reines insert mehr (v3.133 und frueher)",s1.map(x=>x.op));
 // Gegenprobe 4: nicht zugeordnete Felder duerfen NICHT im Datensatz stehen,
 // sonst wuerde die gefuellte Dim. in der Datenbank mit "" ueberschrieben.
 p(gesendet.length===2&&gesendet.every(x=>!("dim" in x)),
   "GEGENPROBE: die nicht zugeordnete Dim. steht in KEINEM Datensatz",gesendet);
 p(gesendet.length===2&&gesendet.every(x=>x.company_id===undefined),
   "ohne company_id – die setzt die Datenbank",gesendet);
 p(dialoge.some(m=>/1 Position\(en\) angelegt, 1 geändert, 1 unverändert/.test(m)),
   "die Rueckmeldung nennt dieselben Zahlen wie die Vorschau",dialoge);

 console.log("\nC · Preise: 18.00 und 18 sind dasselbe, 18.01 nicht");
 await katalogSetzen();
 await dateiLaden([["EDV-Nr.","Material","Preis"],
   ["101.10","Titanzink Band","42.500"],
   ["202.20","Kupferrohr","18.00"]]);
 const v2=await vorschau(MAT);
 p(/2 unverändert/.test(v2.zahl),"eine andere Schreibweise derselben Zahl ist keine Aenderung",v2.zahl);
 p(v2.gesperrt===false,"der Knopf bleibt bedienbar",v2);
 await importieren();
 const s2=await schreibungen();
 p(!s2.some(x=>x.t==="materials"&&(x.op==="upsert"||x.op==="insert")),
   "und es wird gar nichts geschrieben",s2.map(x=>x.t+"/"+x.op));
 p(dialoge.some(m=>/bereits so im Katalog/.test(m)),
   "stattdessen wird gesagt, dass es nichts zu tun gibt",dialoge);
 // Gegenprobe: ein Rappen Unterschied MUSS als Aenderung erkannt werden.
 await dateiLaden([["EDV-Nr.","Material","Preis"],
   ["202.20","Kupferrohr","18.01"]]);
 const v3=await vorschau(MAT);
 p(/1[^0-9]*werden geändert/.test(v3.zahl),
   "GEGENPROBE: ein Rappen Unterschied ist sehr wohl eine Aenderung",v3.zahl);

 console.log("\nD · Dieselbe Nummer zweimal in der Datei");
 await katalogSetzen();
 await dateiLaden([["EDV-Nr.","Material","Preis"],
   ["505.50","Erste Zeile","1.00"],
   ["505.50","Zweite Zeile","2.00"],
   ["606.60","Sauber","3.00"]]);
 await importieren();
 const s4=await schreibungen();
 p(dialoge.some(m=>/mehrfach/.test(m)&&/505\.50/.test(m)),
   "die doppelte Nummer wird benannt",dialoge);
 // Gegenprobe: es darf NICHTS geschrieben werden - auch nicht die saubere
 // Zeile. Halb importiert waere schlimmer als gar nicht.
 p(!s4.some(x=>x.t==="materials"&&(x.op==="upsert"||x.op==="insert")),
   "GEGENPROBE: es wird nichts geschrieben, auch nicht die saubere Zeile",s4.map(x=>x.t+"/"+x.op));

 console.log("\nE · Teilweise geschrieben wird nicht als voller Erfolg gemeldet");
 await katalogSetzen();
 await page.evaluate(()=>{window.__db.nurEine=true});
 await dateiLaden([["EDV-Nr.","Material","Preis"],
   ["808.80","Eins","1.00"],
   ["909.90","Zwei","2.00"]]);
 await importieren();
 p(dialoge.some(m=>/1 von 2/.test(m)&&/Achtung/i.test(m)),
   "1 von 2 geschriebenen Zeilen wird ehrlich gemeldet",dialoge);
 p(!dialoge.some(m=>/2 Position\(en\) angelegt/.test(m)),
   "GEGENPROBE: es wird NICHT „2 angelegt\" gemeldet",dialoge);
 await page.evaluate(()=>{window.__db.nurEine=false});

 console.log("\nF · Der Blitzschutz-Katalog geht denselben Weg");
 await page.evaluate(()=>{
  blitzschutzMaterials=[{id:1,artikel_nr:"BZ-1",bezeichnung:"Fangstange",material:"Alu",einheit:"Stk"}];
 });
 await dateiLaden([["Artikel-Nr.","Bezeichnung","Einheit"],
   ["BZ-1","Fangstange","Stk"],       // unveraendert
   ["BZ-2","Trennfunkenstrecke","Stk"]],"bzMaterialExcelInput");
 const vb=await vorschau({count:"bzMaterialExcelCount",confirm:"bzMaterialExcelConfirm",
   fehler:"bzMaterialExcelFehler",table:"bzMaterialExcelTable"});
 p(/\b1\b[^0-9]*neu/.test(vb.zahl)&&/1 unverändert/.test(vb.zahl),
   "auch hier wird abgeglichen statt blind angelegt",vb.zahl);
 await page.evaluate(()=>{window.__db.log=[]});
 dialoge=[];
 await page.evaluate(()=>$("bzMaterialExcelConfirm").click());
 await page.waitForTimeout(700);
 const sb2=await schreibungen();
 const upb=sb2.filter(x=>x.t==="blitzschutz_materials"&&x.op==="upsert");
 // v3.143: wie beim Katalog - UNIQUE (company_id, artikel_nr).
 p(upb.length===1&&upb[0].opt.onConflict==="company_id,artikel_nr",
   "der Abgleich laeuft ueber Firma + Artikel-Nr.",upb.length?upb[0].opt:null);
 p(upb.length===1&&upb[0].daten.every(x=>!("company_id" in x)),
   "GEGENPROBE: auch hier keine company_id in den gesendeten Daten",
   upb.length?upb[0].daten:null);
 p(upb.length===1&&upb[0].daten.length===1&&upb[0].daten[0].artikel_nr==="BZ-2",
   "GEGENPROBE: nur die neue Position wird gesendet",upb.length?upb[0].daten:null);
 // Die Material-Spalte ist in dieser Datei nicht enthalten - "Alu" muss
 // stehen bleiben, darf also in keinem Datensatz auftauchen.
 p(upb.length===1&&upb[0].daten.every(x=>!("material" in x)),
   "GEGENPROBE: die fehlende Material-Spalte leert nichts",upb.length?upb[0].daten:null);

 // ---- Eine Pflegedatei darf eine Spalte weniger haben (v3.245) ----------
 //
 // WARUM: Eine Preisliste vom Haendler hat zwei Spalten - Artikelnummer und
 // Preis. Keine Bezeichnung. Die war bisher unbedingt Pflicht, also war
 // KEINE Zeile verwendbar und der Import tat nichts, mit der Meldung "Das
 // Pflichtfeld Bezeichnung ist keiner Spalte zugeordnet". Genau fuer die
 // eine Datei, die mit Sicherheit noch kommt: 0 von 439 Artikeln im
 // Lieferanten-Lager haben einen Preis (gemessen 01.10.2026).
 //
 // Eine Bezeichnung braucht, wer einen Artikel ANLEGT. Wer einen vorhandenen
 // pflegt, hat sie in der Datenbank - und ein nicht zugeordnetes Feld wird
 // ohnehin nie geleert. Dass bezeichnung dort NOT NULL ist, sagt beides:
 // fuer neue Zeilen bleibt sie Pflicht, sonst braeche der ganze Upsert ab.
 console.log("\nF · Eine Pflegedatei darf eine Spalte weniger haben");
 const LIEF={count:"liefExcelCount",confirm:"liefExcelConfirm",
   fehler:"liefExcelFehler",table:"liefExcelTable"};
 async function lagerSetzen(){
  await page.evaluate(()=>{
   lfArtikel=[
    {id:1,lieferant:"B-Team",artikelnr:"409373",bezeichnung:"Dachrinnen 330x0.7 mm Titanzink",
     gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:330,vpe:5,ean:"111"},
    {id:2,lieferant:"B-Team",artikelnr:"422640",bezeichnung:"Rinnenseiher 60 mm Kupfer",
     gruppe:"Rinnenseiher",material:"Kupfer",vpe:1,ean:"222"}];
   lfBewegungen=[]; lfEinkauf=[];
   $("liefExcelLieferant").value="B-Team";
  });
 }
 await lagerSetzen();
 // Die Preisliste: zwei Spalten. Eine Nummer kennt das Lager, eine nicht.
 await dateiLaden([["Artikel-Nr.","Preis"],
   ["409373","24.50"],
   ["422640","11.80"],
   ["999999","3.20"]],"liefExcelInput");
 const vp=await vorschau(LIEF);
 p(/\b0\b[^0-9]*neu/.test(vp.zahl)&&/2[^0-9]*werden geändert/.test(vp.zahl),
   "F1 die Preisliste ohne Bezeichnungsspalte wird GELESEN: zwei bekannte Artikel werden geaendert",vp.zahl);
 p(/2 von 3 Zeilen sind vollständig/.test(vp.zahl),
   "F2 und es steht da, dass 2 von 3 Zeilen verwendbar sind",vp.zahl);
 // Das Anfuehrungszeichen bewusst als . - der Wortlaut der Meldung soll
 // nicht an der Typografie haengen.
 p(/Ohne Spalte .Bezeichnung./.test(vp.hinweis)&&/trotzdem gepflegt/.test(vp.hinweis),
   "F3 der Hinweis nennt es eine Pflegedatei, nicht einen Fehler",vp.hinweis);
 p(/1 Zeile\(n\) sind noch nicht im Lager und werden ausgelassen/.test(vp.hinweis),
   "F4 und sagt, dass die unbekannte Nummer ausgelassen wird - eine neue Position ohne Namen waere eine Zeile ohne Namen",vp.hinweis);
 p(vp.gesperrt===false,
   "F5 der Knopf ist nicht gesperrt - die Datei ist brauchbar",vp.gesperrt);
 // GEGENPROBE zum alten Verhalten: es darf NICHT mehr "Das Pflichtfeld
 // Bezeichnung ist keiner Spalte zugeordnet" heissen und nicht 0 Zeilen.
 p(!/Pflichtfeld .Bezeichnung. ist keiner Spalte/.test(vp.hinweis)
   &&!/0 von 3 Zeilen/.test(vp.zahl),
   "F6 GEGENPROBE: das alte 'Pflichtfeld nicht zugeordnet' mit null verwendbaren Zeilen ist weg",vp);
 await page.evaluate(()=>{window.__db.log=[]});
 dialoge=[];
 await page.evaluate(()=>$("liefExcelConfirm").click());
 await page.waitForTimeout(700);
 const sb3=await schreibungen();
 const upl=sb3.filter(x=>x.t==="lieferanten_artikel"&&x.op==="upsert");
 p(upl.length===1&&upl[0].daten.length===2,
   "F7 geschrieben werden genau die zwei bekannten Artikel",upl.length?upl[0].daten:null);
 p(upl.length===1&&upl[0].daten.every(x=>!("bezeichnung" in x)),
   "F8 UND ZWAR OHNE bezeichnung - sonst haette die Pflegedatei die Namen geleert",upl.length?upl[0].daten:null);
 p(upl.length===1&&upl[0].daten.every(x=>x.lieferant==="B-Team"),
   "F9 der Lieferant kommt aus dem Feld mit - der Schluessel bleibt vollstaendig",upl.length?upl[0].daten:null);
 p(upl.length===1&&upl[0].daten.map(x=>String(x.preis)).sort().join(",")==="11.8,24.5",
   "F10 und die Preise stehen drin",upl.length?upl[0].daten.map(x=>x.preis):null);
 // GEGENPROBE: beim MATERIALKATALOG (js/08s eigener Import) hat sich nichts
 // geaendert - dort ist der Name unbedingt Pflicht, und eine Datei ohne ihn
 // bleibt unbrauchbar. Sonst waere die Regel still ueberall weicher
 // geworden, auch wo sie gelten soll.
 await katalogSetzen();
 await dateiLaden([["EDV-Nr.","Preis"],["101.10","44.00"]]);
 const vm=await vorschau(MAT);
 p(/Pflichtfeld .Material. ist keiner Spalte/.test(vm.hinweis)&&/0 von 1 Zeilen/.test(vm.zahl)
   &&vm.gesperrt===true,
   "F11 GEGENPROBE: der Materialkatalog verlangt den Namen weiterhin unbedingt - die Regel gilt nur, wo sie gesetzt ist",vm);
 // Und noch eine: eine Lieferantendatei MIT Bezeichnung legt weiterhin neue
 // Artikel an - die Aufweichung gilt nur fuer die fehlende Spalte.
 await lagerSetzen();
 await dateiLaden([["Artikel-Nr.","Bezeichnung","Preis"],
   ["888888","Neuer Artikel",'7.50']],"liefExcelInput");
 const vn=await vorschau(LIEF);
 p(/\b1\b[^0-9]*neu/.test(vn.zahl)&&/1 von 1 Zeilen sind vollständig/.test(vn.zahl),
   "F12 GEGENPROBE: mit Bezeichnungsspalte wird ein neuer Artikel weiterhin angelegt",vn.zahl);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
