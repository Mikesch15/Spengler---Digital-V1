// Prueft v3.285: Massaufnahmen im Projekt - 1. nach Status (abgeschlossene am
// Ende), 2. nach Bezeichnung (alphabetisch). Gegenproben: Zwischenspeicher bleibt
// unsortiert, die Eingabe wird nicht veraendert, ohne Bezeichnung steht am Ende.
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
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 const r=await page.evaluate(()=>{
  const m=(id,title,st,type)=>({id,title,workflow_status:st,type:type||"einlaufblech",date:"2026-10-0"+id});
  const eing=[m(1,"Zeta","in_bearbeitung"),m(2,"Anna","abgeschlossen"),m(3,"Berta","zu_ruesten"),
   m(4,"","in_bearbeitung"),m(5,"Alpha","abgeschlossen"),m(6,"anton","in_bearbeitung"),m(7,"Tor 10","freigegeben"),m(8,"Tor 2","freigegeben")];
  const vorher=JSON.stringify(eing);
  const o={};
  o.reihe=measSortiert(eing).map(x=>x.id);
  o.unveraendert=JSON.stringify(eing)===vorher;
  // neue Ansicht: gleiche Reihenfolge
  projectMeasurementsCache=eing.slice(); a2Zustand.seite="projekt"; a2Zustand.projektId=1;
  const h=a2RegAufmass({});
  o.a2=[...h.matchAll(/data-a2-meas="(\d+)"/g)].map(x=>+x[1]);
  o.cacheUnveraendert=projectMeasurementsCache.map(x=>x.id).join()==="1,2,3,4,5,6,7,8";
  return o;
 });
 // Erwartet: offene zuerst (Bezeichnung alphabetisch, ohne Bezeichnung zuletzt), dann abgeschlossene
 // offen: anton, Berta, Tor 2, Tor 10, Zeta, (ohne) ; fertig: Alpha, Anna
 const soll=[6,3,8,7,1,4,5,2];
 p(JSON.stringify(r.reihe)===JSON.stringify(soll),"Reihenfolge: offene alphabetisch (Tor 2 vor Tor 10), ohne Bezeichnung zuletzt, abgeschlossene am Ende",r.reihe);
 p(r.unveraendert,"Gegenprobe: die uebergebene Liste wird nicht veraendert");
 p(JSON.stringify(r.a2)===JSON.stringify(soll),"die neue Ansicht zeigt dieselbe Reihenfolge",r.a2);
 p(r.cacheUnveraendert,"Gegenprobe: der Zwischenspeicher bleibt unsortiert (Bedarf/Zuschnitt unberuehrt)");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();
