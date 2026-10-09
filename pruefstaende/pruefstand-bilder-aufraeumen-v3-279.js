// Prueft "ersetzte Bilder loescht die App beim Speichern selbst" (v3.279).
//
// Ansage des Anwenders (9.10.2026): "wenn dadurch keine dateien verloren gehen,
// kann die app die verwaisten dateien selbststaendig loeschen beim ersetzen".
//
// Ausgangslage (belegt am Aenderungsprotokoll der Massaufnahme 114): wer eine
// Skizze bearbeitet und erneut speichert, laedt eine NEUE Datei hoch - die alte
// blieb im Speicher liegen.
//
// Gewuenscht ist "loeschen", gefuerchtet ist "Datei verloren". Darum prueft
// dieser Pruefstand vor allem die SICHERUNGEN - jede mit Gegenprobe:
//   A  das Aufraeumen: ersetzte/entfernte Bilder weg, alles andere bleibt
//   B  nie etwas ausserhalb des eigenen Ordners der Massaufnahme
//   C  nie etwas, worauf eine andere Massaufnahme noch zeigt
//   D  im Zweifel (Fehler bei der Abfrage / beim Loeschen) nichts - und kein
//      Fehler beim Speichern
//   E  der echte Speichern-Weg: gelesen VOR dem UPDATE, geloescht NACH dem
//      UPDATE, und bei einem gescheiterten UPDATE gar nicht
// Die Datenbank und der Speicher sind gestubbt.
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
 page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  window.__ereignisse=[]; window.__zeilen=[]; window.__entfernt=[];
  window.__abfrageFehler=false; window.__loeschFehler=false; window.__updateFehler=false;
  const rolle=(r,k)=>({id:r.id,project_id:r.project_id});
  sb.from=t=>{
   const q={t,op:null,vals:null,f:[],neq:null};
   const run=async()=>{
    if(t!=="measurements")return {data:[],error:null};
    if(q.op==="update"){
     window.__ereignisse.push("UPDATE");
     if(window.__updateFehler)return {data:null,error:{message:"update kaputt"}};
     const z=window.__zeilen.find(r=>String(r.id)===String(q.f[0][1]));
     Object.assign(z,q.vals); return {data:[{id:z.id}],error:null};
    }
    window.__ereignisse.push("LESEN");
    if(window.__abfrageFehler&&q.neq!==null)return {data:null,error:{message:"abfrage kaputt"}};
    let z=window.__zeilen.slice();
    q.f.forEach(([c,v])=>{z=z.filter(r=>String(r[c])===String(v))});
    if(q.neq!==null)z=z.filter(r=>String(r.id)!==String(q.neq));
    return {data:z.map(r=>Object.assign({},r)),error:null};
   };
   const chain={select:()=>chain,update:v=>{q.op="update";q.vals=v;return chain},
    eq:(c,v)=>{q.f.push([c,v]);return chain},neq:(c,v)=>{q.neq=v;return chain},
    maybeSingle:async()=>{const r=await run();return {data:(r.data||[])[0]||null,error:r.error}},
    then:(a,r)=>run().then(a,r)};
   return chain;
  };
  sb.storage={from:()=>({remove:async pfade=>{window.__ereignisse.push("LOESCHEN");
    if(window.__loeschFehler)return {error:{message:"loeschen kaputt"}};
    window.__entfernt.push(...pfade);return {error:null}}})};
  window.__neu=()=>{window.__ereignisse.length=0;window.__entfernt.length=0;
    window.__abfrageFehler=window.__loeschFehler=window.__updateFehler=false};
 });

 const P="measurements/59/114/";
 const aufraeumen=(vorher,nachher,anderes)=>page.evaluate(async([v,n,a])=>{
  window.__neu();
  window.__zeilen=[{id:114,project_id:59,photo_path:null,sketch_path:null,photo_paths:[],sketch_paths:[]}].concat(a||[]);
  const anz=await measBilderAufraeumen(114,59,v,n);
  return {anz,entfernt:window.__entfernt.slice(),ereignisse:window.__ereignisse.slice()};
 },[vorher,nachher,anderes]);

 console.log("\nA · Ersetzt oder entfernt: weg. Alles andere: bleibt");
 let r=await aufraeumen([P+"sketches/alt.png",P+"photo/f1.jpg"],[P+"sketches/neu.png",P+"photo/f1.jpg"]);
 p(r.entfernt.join()===P+"sketches/alt.png","die ersetzte Skizze wird entfernt, das unveraenderte Foto bleibt",r);
 r=await aufraeumen([P+"photo/f1.jpg",P+"photo/f2.jpg"],[P+"photo/f1.jpg"]);
 p(r.entfernt.join()===P+"photo/f2.jpg","ein im Formular entferntes Foto wird ebenfalls entfernt",r);
 r=await aufraeumen([P+"photo/f1.jpg"],[P+"photo/f1.jpg",P+"photo/neu.jpg"]);
 p(r.entfernt.length===0&&!r.ereignisse.includes("LOESCHEN"),"ein hinzugekommenes Foto: nichts wird geloescht, nicht einmal gefragt",r);
 r=await aufraeumen([],[P+"sketches/neu.png"]);
 p(r.entfernt.length===0,"eine neue Massaufnahme (nichts davor gespeichert): nichts wird geloescht",r);
 r=await aufraeumen([P+"sketches/alt.png"],[P+"sketches/alt.png"]);
 p(r.entfernt.length===0,"Speichern ohne Aenderung an den Bildern: nichts wird geloescht",r);

 console.log("\nB · Nur im eigenen Ordner dieser Massaufnahme");
 r=await aufraeumen(["measurements/59/115/sketches/fremd.png"],[]);
 p(r.entfernt.length===0,"eine Datei einer ANDEREN Massaufnahme (115) bleibt, auch wenn sie in der Liste stand",r);
 r=await aufraeumen(["measurements/60/114/sketches/fremd.png"],[]);
 p(r.entfernt.length===0,"eine Datei eines anderen PROJEKTS (60) bleibt",r);
 r=await aufraeumen(["sketches/flach-alt.png","project-files/59/plan.pdf","company-logo/x.png"],[]);
 p(r.entfernt.length===0,"aeltere flache Pfade, Projektdateien und das Logo werden nie angefasst",r);
 r=await aufraeumen([P+"sketches/alt.png","measurements/59/115/sketches/fremd.png"],[]);
 p(r.entfernt.join()===P+"sketches/alt.png","gemischt: nur die eigene wird entfernt",r);
 r=await aufraeumen(["measurements/59/1140/sketches/x.png"],[]);
 p(r.entfernt.length===0,"Gegenprobe zum Ordnervergleich: Massaufnahme 1140 ist nicht 114 (kein blosser Vorsatz-Treffer)",r);

 console.log("\nC · Nie, was eine andere Massaufnahme noch braucht");
 r=await aufraeumen([P+"sketches/geteilt.png"],[],[{id:200,project_id:59,photo_path:null,sketch_path:null,photo_paths:[],sketch_paths:[P+"sketches/geteilt.png"]}]);
 p(r.entfernt.length===0,"zeigt eine andere Massaufnahme des Projekts darauf (sketch_paths), bleibt die Datei",r);
 r=await aufraeumen([P+"photo/geteilt.jpg"],[],[{id:201,project_id:59,photo_path:P+"photo/geteilt.jpg",sketch_path:null,photo_paths:[],sketch_paths:[]}]);
 p(r.entfernt.length===0,"ebenso ueber photo_path",r);
 r=await aufraeumen([P+"sketches/alt.png",P+"sketches/geteilt.png"],[],[{id:200,project_id:59,photo_path:null,sketch_path:null,photo_paths:[],sketch_paths:[P+"sketches/geteilt.png"]}]);
 p(r.entfernt.join()===P+"sketches/alt.png","gemischt: nur die unbenutzte wird entfernt, die geteilte bleibt",r);
 r=await aufraeumen([P+"sketches/alt.png"],[],[{id:300,project_id:77,photo_path:null,sketch_path:null,photo_paths:[],sketch_paths:["measurements/59/114/sketches/alt.png"]}]);
 p(r.entfernt.join()===P+"sketches/alt.png","Gegenprobe: eine Massaufnahme eines ANDEREN Projekts zaehlt nicht als Verweis (die Abfrage ist je Projekt)",r);

 console.log("\nD · Im Zweifel nichts - und das Speichern bleibt heil");
 let z=await page.evaluate(async([v])=>{window.__neu();window.__abfrageFehler=true;
  window.__zeilen=[{id:114,project_id:59,photo_paths:[],sketch_paths:[]}];
  const a=await measBilderAufraeumen(114,59,v,[]);return {a,entfernt:window.__entfernt.slice()}},[[P+"sketches/alt.png"]]);
 p(z.a===0&&z.entfernt.length===0,"scheitert die Abfrage nach anderen Verweisen, wird NICHTS geloescht",z);
 z=await page.evaluate(async([v])=>{window.__neu();window.__loeschFehler=true;
  window.__zeilen=[{id:114,project_id:59,photo_paths:[],sketch_paths:[]}];
  let werfen=false,a;try{a=await measBilderAufraeumen(114,59,v,[])}catch(e){werfen=true}
  return {werfen,a}},[[P+"sketches/alt.png"]]);
 p(!z.werfen&&z.a===0,"scheitert das Loeschen, wirft die Funktion nicht - das Speichern bliebe heil",z);

 console.log("\nE · Der echte Speichern-Weg");
 // Die ganze Kette: Formular -> Hochladen -> Lesen -> UPDATE -> Loeschen.
 const speichern=(optionen)=>page.evaluate(async o=>{
  window.__neu();
  window.__zeilen=[{id:114,project_id:59,type:"skizze_foto",title:"x",
   photo_path:P_+"photo/f1.jpg",sketch_path:P_+"sketches/alt.png",
   photo_paths:[P_+"photo/f1.jpg"],sketch_paths:[P_+"sketches/alt.png"]}];
  window.__updateFehler=!!o.updateFehler;
  currentMeasurementId=114; measSelectedProjectId=59;
  measPhotos=[P_+"photo/f1.jpg"];
  measSketches=["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="]; // bearbeitete Skizze
  $("measType").value="skizze_foto"; $("measTitle").value="x"; $("measDate").value="2026-10-09";
  window.__hoch=0;
  uploadMeasurementImage=async(d,ordner)=>{window.__ereignisse.push("HOCHLADEN");return ordner+"/neu_"+(++window.__hoch)+".png"};
  measEditZurueck=async()=>{}; mwNachSpeichern=()=>{}; aufgabenNeuLaden=()=>{};
  $("saveMeasurement").click();
  await new Promise(r=>setTimeout(r,500));
  return {ereignisse:window.__ereignisse.slice(),entfernt:window.__entfernt.slice(),
   gespeichert:window.__zeilen[0].sketch_paths.slice()};
 },optionen);
 await page.evaluate(()=>{window.P_="measurements/59/114/"});
 z=await speichern({});
 const ablauf=z.ereignisse.join(">");
 p(z.entfernt.join()===P+"sketches/alt.png","Speichern einer bearbeiteten Skizze entfernt die ALTE Fassung",z);
 p(z.gespeichert.length===1&&/neu_1\.png$/.test(z.gespeichert[0]),"und gespeichert ist die neue",z);
 p(/LESEN>.*UPDATE>.*LOESCHEN/.test(ablauf.replace(/HOCHLADEN>/g,"")),"Reihenfolge: erst lesen was gespeichert ist, dann UPDATE, erst danach loeschen",ablauf);
 z=await speichern({updateFehler:true});
 p(z.entfernt.length===0&&!z.ereignisse.includes("LOESCHEN"),
   "Gegenprobe: scheitert das UPDATE, wird NICHTS geloescht - die gespeicherte Zeile zeigt noch auf die alte Datei",z);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
