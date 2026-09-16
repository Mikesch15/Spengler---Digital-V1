// Prueft den Positionsvorschlag im Neues-Produkt-Dialog (v3.136).
//
// Gemeldet vom Anwender: "Wird in der Materialverwaltung ein neues Produkt
// eingescannt oder angelegt, wird nicht mehr automatisch und intelligent eine
// Position vorgeschlagen."
//
// Befund: eine BESTEHENDE Materialposition wurde nie vorgeschlagen. Die
// intelligente Erkennung aus v3.126 gab es, aber sie schlug nur die EDV-Nummer
// einer NEU anzulegenden Position vor - und zeigte sich erst nach einem Klick
// auf "Neue Materialposition anlegen". Wer ein Produkt einscannte, bekam den
// ungeordneten Katalog und musste von Hand suchen.
//
// Der Vertrag, den dieser Pruefstand festhaelt:
//   1. Die Bezeichnung des Produkts fuehrt passende BESTEHENDE Positionen
//      zuoberst in der Trefferliste - ohne zusaetzlichen Klick.
//   2. Getippte Suche hat Vorrang: sie ist die Absicht des Anwenders.
//   3. Passt nichts, wird nichts behauptet.
//   4. Vorgewaehlt wird NIE etwas - ein Tippfehler wuerde sonst Bestand auf
//      die falsche Position buchen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-position-vorschlag-v3-136.js
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
   body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};["insert","upsert","select","eq","order","limit","not","delete","update"].forEach(k=>q[k]=()=>q);
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g); return q}})};`}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  meineRechte={admin:true,kataloge:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  // Ein kleiner, aber echter Ausschnitt des Katalogs - mit zwei sehr
  // aehnlichen Positionen (712.40/712.41), damit der "unsicher"-Fall
  // wirklich vorkommt und nicht nur behauptet wird.
  settings.materials=[
   ["712.40","Spenglerschraube 4.5x35 Chromnickelstahl","","Stk",0.45],
   ["712.41","Spenglerschraube 4.5x45 Chromnickelstahl","","Stk",0.52],
   ["252.10","Rohrbogen 72° Kupfer","","Stk",12.0],
   ["101.10","Titanzink Band 0.7","","m2",42.5],
   ["333.20","Rinnenhalter verzinkt","","Stk",3.2],
   ["444.10","Dichtungsband EPDM","","m",2.1]];
  materialIds=[1,2,3,4,5,6];
  lagerVarianten=[];
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const treffer=()=>page.evaluate(()=>({
   text:$("lagerNeuesProduktTreffer").innerText.replace(/\s+/g," ").trim(),
   versteckt:$("lagerNeuesProduktTreffer").hidden,
   knoepfe:Array.from($("lagerNeuesProduktTreffer")
     .querySelectorAll("[data-lager-produkt-artikel]")).map(k=>k.textContent.trim()),
   gewaehlt:typeof lagerNeuesProduktArtikel!=="undefined"&&lagerNeuesProduktArtikel
     ?String(lagerNeuesProduktArtikel.edv_nr||""):null}));
 const tippen=(id,wert)=>page.evaluate(a=>{
   const f=$(a.id); f.value=a.wert; f.dispatchEvent(new Event("input"));
 },{id,wert});

 console.log("\nA · Die Bausteine sind da");
 const da=await page.evaluate(()=>({
   fn:typeof lagerPositionenVorschlag==="function",
   punkte:typeof lagerZeilePunkte==="function",
   schwelle:typeof LAGER_GRUPPE_MIN!=="undefined"?LAGER_GRUPPE_MIN:null}));
 p(da.fn,"lagerPositionenVorschlag ist vorhanden",da);
 // Eine Quelle: dieselbe Bewertung und dieselbe Schwelle wie der
 // Nummernvorschlag aus v3.126 - kein zweites, parallel gepflegtes Mass.
 p(da.punkte&&da.schwelle===2.5,"sie nutzt die bestehende Bewertung und Schwelle",da);

 console.log("\nB · Scan ohne Treffer: Dialog auf, noch nichts behauptet");
 await page.evaluate(()=>lagerNeuesProduktOeffnen(null,"7612345678901"));
 await page.waitForTimeout(300);
 const a=await treffer();
 p(!a.versteckt,"die Trefferliste ist offen",a);
 p(a.knoepfe.length===6,"der ganze Katalog steht zur Wahl",a.knoepfe.length);
 // Gegenprobe: ohne Bezeichnung darf NICHTS vorgeschlagen werden.
 p(!/Vorschlag der App|könnte passen/.test(a.text),
   "GEGENPROBE: ohne Bezeichnung kein Vorschlag",a.text.slice(0,90));
 p(a.gewaehlt===null,"und nichts ist gewaehlt",a.gewaehlt);

 console.log("\nC · Bezeichnung tippen fuehrt die passenden Positionen zuoberst");
 await tippen("lagerNeuesProduktBezeichnung","Spenglerschrauben 4.5x35 CrNi");
 await page.waitForTimeout(300);
 const c=await treffer();
 p(/712\.40/.test(c.knoepfe[0])&&/712\.41/.test(c.knoepfe[1]),
   "die beiden Schrauben-Positionen stehen an erster und zweiter Stelle",c.knoepfe.slice(0,3));
 // Gegenprobe auf den Zustand vor v3.136: dort stand 712.40 an erster
 // Stelle, WEIL es die erste Katalogzeile ist - nicht weil es passt. Der
 // Beweis ist deshalb eine Position, die NICHT vorne steht.
 p(!/Rohrbogen|Titanzink|Rinnenhalter|Dichtungsband/.test(c.knoepfe[0]+c.knoepfe[1]),
   "GEGENPROBE: die unpassenden Positionen sind NICHT vorne",c.knoepfe.slice(0,3));
 p(/könnte passen/.test(c.text),
   "bei zwei aehnlich guten Treffern behauptet die App keine Sicherheit",c.text.slice(0,80));
 p(/Oder aus dem ganzen Katalog/.test(c.text),
   "der ganze Katalog bleibt darunter erreichbar",c.text.slice(0,140));
 p(c.knoepfe.length===6,"und zwar vollstaendig - nichts faellt weg",c.knoepfe.length);
 // Gegenprobe: keine Position doppelt (oben als Vorschlag, unten nochmal).
 p(new Set(c.knoepfe).size===c.knoepfe.length,
   "GEGENPROBE: keine Position steht zweimal in der Liste",c.knoepfe);
 p(c.gewaehlt===null,
   "GEGENPROBE: es wird NICHTS vorgewaehlt - ein Tippfehler darf nicht buchen",c.gewaehlt);

 console.log("\nD · Ein klarer Treffer wird als solcher benannt");
 await tippen("lagerNeuesProduktBezeichnung","Rinnenhalter verzinkt gross");
 await page.waitForTimeout(300);
 const d=await treffer();
 p(/333\.20/.test(d.knoepfe[0]),"der Rinnenhalter steht zuoberst",d.knoepfe.slice(0,2));
 p(/✓ Vorschlag der App/.test(d.text),
   "und wird als Vorschlag der App gekennzeichnet",d.text.slice(0,70));
 p(!/könnte passen/.test(d.text),
   "GEGENPROBE: nicht gleichzeitig als unsicher",d.text.slice(0,70));

 console.log("\nE · Getippte Suche hat Vorrang");
 await tippen("lagerNeuesProduktMaterialSuche","Rohrbogen");
 await page.waitForTimeout(300);
 const e=await treffer();
 p(e.knoepfe.length===1&&/252\.10/.test(e.knoepfe[0]),
   "die Suche filtert wie bisher",e.knoepfe);
 // Gegenprobe: der Vorschlag darf die getippte Suche NICHT ueberstimmen.
 p(!/Vorschlag der App|könnte passen/.test(e.text),
   "GEGENPROBE: waehrend gesucht wird, steht KEIN Vorschlag da",e.text.slice(0,90));
 await tippen("lagerNeuesProduktMaterialSuche","");
 await page.waitForTimeout(300);
 const e2=await treffer();
 p(/333\.20/.test(e2.knoepfe[0]),"leere Suche bringt den Vorschlag zurueck",e2.knoepfe.slice(0,2));

 console.log("\nF · Passt nichts, wird nichts behauptet");
 await tippen("lagerNeuesProduktBezeichnung","Kaffeemaschine Vollautomat");
 await page.waitForTimeout(300);
 const f=await treffer();
 p(!/Vorschlag der App|könnte passen/.test(f.text),
   "kein Vorschlag fuer etwas, das nicht im Katalog steht",f.text.slice(0,90));
 p(f.knoepfe.length===6,"der Katalog steht trotzdem vollstaendig zur Wahl",f.knoepfe.length);

 console.log("\nG · Ein Tipp uebernimmt die Position");
 await tippen("lagerNeuesProduktBezeichnung","Rinnenhalter verzinkt gross");
 await page.waitForTimeout(300);
 await page.evaluate(()=>{
  const k=$("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-artikel]");
  k.click();
 });
 await page.waitForTimeout(300);
 const g=await page.evaluate(()=>({
   gewaehlt:lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.edv_nr):null,
   text:$("lagerNeuesProduktGewaehlt").innerText.replace(/\s+/g," ").trim(),
   sichtbar:!$("lagerNeuesProduktGewaehlt").hidden}));
 p(g.gewaehlt==="333.20","ein Tipp auf den Vorschlag waehlt die Position",g);
 p(g.sichtbar&&/Rinnenhalter/.test(g.text),"und sie steht sichtbar als Wahl da",g);
 // Gegenprobe: die bestehende Wahl darf durch weiteres Tippen in der
 // Bezeichnung nicht wieder umgeworfen werden.
 await tippen("lagerNeuesProduktBezeichnung","Rinnenhalter verzinkt gross verzinkt");
 await page.waitForTimeout(300);
 const g2=await page.evaluate(()=>lagerNeuesProduktArtikel?String(lagerNeuesProduktArtikel.edv_nr):null);
 p(g2==="333.20",
   "GEGENPROBE: weiteres Tippen wirft die getroffene Wahl NICHT um",g2);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
