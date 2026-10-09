// Prueft "abgeschlossen -> Rueckfrage -> archivieren" (v3.275).
//
// Ansage des Anwenders (9.10.2026): "Wenn ich ein projekt auf abgeschlossen
// setze, soll es automatisch archiviert werden mit einer kurzen
// bestaetigungsanfrage."
//
// Der Status wird an genau einer Stelle gesetzt (js/24, #cockpitStatus). Hinter
// dem Setzen steht jetzt die Rueckfrage. Geprueft wird:
//   A  die Rueckfrage kommt - und nennt das Projekt
//   B  "OK" archiviert, "Abbrechen" laesst es aktiv (Status bleibt trotzdem)
//   C  sie kommt NUR beim Wechsel auf "abgeschlossen" (nicht bei den anderen
//      Status, nicht bei einem schon archivierten Projekt)
//   D  scheitert das Archivieren, wird es gemeldet statt Erfolg anzunehmen
// Die Datenbank ist gestubbt (sb.from wird ersetzt und protokolliert); gegen
// die echte laeuft hier nichts - archived und status sind zwei Spalten, das
// Schreiben selbst unterscheidet sich nicht von dem der Projektliste.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let antwort=true; const fragen=[];
 page.on("dialog",d=>{fragen.push(d.message());antwort?d.accept():d.dismiss()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=[
   {id:7001,name:"Dach Nord",object:"Bahnhofstrasse 12, 3011 Bern",order_no:"1",customer:"",archived:false,status:"in_arbeit"},
   {id:7002,name:"Dach Sued",object:"Rosenweg 8, 3006 Bern",order_no:"2",customer:"",archived:true,status:"in_arbeit"}
  ];
  window.__db=[]; window.__archivFehler=false;
  sb.from=t=>({
   update:vals=>({eq:(c,id)=>({select:async()=>{
     window.__db.push({t,vals,id});
     if(vals.archived&&window.__archivFehler)return {data:[],error:null};
     const alt=allProjects.find(x=>x.id===id);
     return {data:[Object.assign({},alt,vals)],error:null};
   }})}),
   select:()=>({eq:()=>({order:()=>({limit:async()=>({data:[],error:null})}),maybeSingle:async()=>({data:null,error:null})})}),
  });
 });
 const stelle=(id,status)=>page.evaluate(async([id,status])=>{
  cockpitProjectId=id;
  const sel=$("cockpitStatus");
  sel.innerHTML=PROJEKT_STATUS.map(x=>`<option value="${x.wert}">${x.label}</option>`).join("");
  sel.value=projektStatusInfo(allProjects.find(x=>x.id===id)).wert;
  window.__db.length=0;
  sel.value=status; sel.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,250));
  const pr=allProjects.find(x=>x.id===id);
  return {db:window.__db.map(x=>Object.keys(x.vals).join("+")),
   status:pr.status,archiviert:!!pr.archived,msg:$("cockpitStatusMsg").textContent};
 },[id,status]);
 const zurueck=()=>page.evaluate(()=>{allProjects[0].status="in_arbeit";allProjects[0].archived=false;});

 console.log("\nA · Die Rueckfrage kommt");
 fragen.length=0; antwort=true;
 let r=await stelle(7001,"abgeschlossen");
 p(fragen.length===1,"genau eine Rueckfrage beim Wechsel auf \"abgeschlossen\"",fragen);
 p(/Bahnhofstrasse 12/.test(fragen[0]||"")&&/archivieren/i.test(fragen[0]||""),"sie nennt das Projekt und fragt nach dem Archivieren",fragen[0]);

 console.log("\nB · OK archiviert, Abbrechen nicht");
 p(r.db.join("|")==="status|archived"&&r.status==="abgeschlossen"&&r.archiviert,
   "OK: erst der Status, dann archived=true - beides gespeichert und im Speicher nachgefuehrt",r);
 p(/archiviert/.test(r.msg),"und die Meldung sagt es",r.msg);
 await zurueck(); fragen.length=0; antwort=false;
 r=await stelle(7001,"abgeschlossen");
 p(fragen.length===1&&r.db.join("|")==="status","Abbrechen: nur der Status wird gespeichert, kein Archivieren",r);
 p(r.status==="abgeschlossen"&&!r.archiviert,"das Projekt ist abgeschlossen, aber noch aktiv",r);

 console.log("\nC · Nur beim Wechsel auf abgeschlossen");
 for(const s of ["offen","in_arbeit","storniert"]){
  await zurueck(); fragen.length=0; antwort=true;
  r=await stelle(7001,s==="in_arbeit"?"offen":s);
  p(fragen.length===0&&!r.archiviert,"Wechsel auf \""+(s==="in_arbeit"?"offen":s)+"\": keine Rueckfrage, nicht archiviert",{fragen,r});
 }
 fragen.length=0; antwort=true;
 r=await stelle(7002,"abgeschlossen");
 p(fragen.length===0&&r.db.join("|")==="status","ein schon archiviertes Projekt: keine Rueckfrage, es wird nicht noch einmal archiviert",{fragen,r});

 console.log("\nD · Scheitert das Archivieren, wird es gemeldet");
 await zurueck(); await page.evaluate(()=>{window.__archivFehler=true}); fragen.length=0; antwort=true;
 r=await stelle(7001,"abgeschlossen");
 p(r.status==="abgeschlossen"&&!r.archiviert,"der Status steht, das Projekt ist NICHT archiviert",r);
 p(/nicht archiviert werden/.test(r.msg),"und die Meldung sagt, dass das Archivieren nicht ging - kein stiller Erfolg",r.msg);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
