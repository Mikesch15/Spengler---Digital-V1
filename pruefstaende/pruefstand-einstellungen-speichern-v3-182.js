// Prueft v3.182: Die Einstellungen speichern wirklich - und der Werkstoff
// wird aus dem Positionstext vorgeschlagen.
//
// GEMELDET
// "Ich wollte Blei und Messing noch als Werkstoff hinzufuegen, laesst sich
// aber nicht speichern... und kann die App nicht automatisch den Werkstoff
// vorschlagen, er steht ja eigentlich ueberall im Positionstext?"
//
// BEFUND ZUM ERSTEN TEIL
// Das ANLEGEN ging (zwei Zeilen "Neuer Werkstoff" standen in der Datenbank),
// das UMBENENNEN nicht. Ursache:
//
//   debounce((id,patch)=>sb.from(T).update(patch).eq("id",id),500)
//
// Das BAUT die Abfrage nur. supabase-js schickt sie erst, wenn jemand auf das
// Ergebnis wartet (then/await). Ohne das passiert nichts - und weil die
// lokale Liste sofort geaendert wurde, sah die Oberflaeche trotzdem richtig
// aus. Weg war die Aenderung erst nach dem Neuladen.
//
// Das betraf SECHS Stellen: rates, materials, profiles, blitzschutz_materials
// (js/07) sowie rinne_fitting_types und measurement_materials (js/08). An den
// echten Daten belegt: von 381 Artikeln, 12 Ansaetzen, 487
// Blitzschutz-Positionen und 9 Werkstoffen trug KEINE EINZIGE Zeile je ein
// veraendertes updated_at - und genau das schicken diese Aufrufe mit.
//
// BEFUND ZUM ZWEITEN TEIL
// Ja, der Werkstoff steht fast immer im Namen. Gesucht wird das erste Wort
// jedes bekannten Werkstoffnamens, und es muss ein WORT IM NAMEN BEGINNEN.
// Ohne diese Bedingung bekaeme "Chromnickelstahl 1.4301" den Vorschlag
// "Stahl" - 1.4301 ist aber CrNi-Stahl.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einstellungen-speichern-v3-182.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,kataloge:true,lager:true};
  measurementMaterials=[
   {id:1,name:"Aluminium (Aluman)"},{id:2,name:"Titanzink"},{id:3,name:"Kupfer"},
   {id:4,name:"CrNi-Stahl"},{id:5,name:"Chromstahl, verzinnt"},{id:6,name:"Stahl"},
   {id:20,name:"Blei"},{id:21,name:"Messing"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---- A  Die Einstellungen speichern wirklich ------------------------------
 console.log("\nA · Die Einstellungen speichern wirklich");
 const A=await page.evaluate(async()=>{
  let neuAbgeschickt=0, altAbgeschickt=0;
  const bauer=(zaehler)=>(t)=>{
   const q={};
   ["eq","order","limit","not","select"].forEach(k=>q[k]=()=>q);
   q.update=()=>q;
   q.then=(f,g)=>{zaehler();return Promise.resolve({data:[{id:1}],error:null}).then(f,g)};
   return q;
  };
  const echt=sb.from;

  // Die HEUTIGE Fassung
  sb.from=bauer(()=>neuAbgeschickt++);
  katalogSpeicher("measurement_materials",0)(1,{name:"Blei"});
  await new Promise(f=>setTimeout(f,200));

  // GEGENPROBE: die Fassung bis v3.181, Zeichen fuer Zeichen dieselbe Form.
  // Sie baut die Abfrage - und schickt sie nie.
  sb.from=bauer(()=>altAbgeschickt++);
  debounce((id,patch)=>sb.from("measurement_materials").update(patch).eq("id",id),0)(1,{name:"Blei"});
  await new Promise(f=>setTimeout(f,200));
  sb.from=echt;
  return {neuAbgeschickt,altAbgeschickt};
 });
 p(A.neuAbgeschickt===1,
   "A1 der Speicherer schickt die Abfrage wirklich ab",A);
 p(A.altAbgeschickt===0,
   "A2 GEGENPROBE: die Fassung bis v3.181 baut sie nur - supabase-js schickt "
   +"erst beim await. Genau daran scheiterte das Umbenennen",A);

 const A3=await page.evaluate(async()=>{
  const bauen=(antwort)=>(t)=>{
   const q={};["eq","order","limit","not","select"].forEach(k=>q[k]=()=>q);
   q.update=()=>q; q.then=(f,g)=>Promise.resolve(antwort).then(f,g); return q;
  };
  const echt=sb.from;
  const raus={};
  sb.from=bauen({data:[{id:1}],error:null});
  await katalogFeldSchreiben("measurement_materials",1,{name:"Blei"})
    .then(r=>raus.gut=r);
  sb.from=bauen({data:[],error:null});
  await katalogFeldSchreiben("measurement_materials",1,{name:"Blei"})
    .then(r=>raus.leer=r);
  sb.from=bauen({data:null,error:{message:"permission denied for table"}});
  await katalogFeldSchreiben("measurement_materials",1,{name:"Blei"})
    .then(r=>raus.fehler=r);
  sb.from=echt;
  return raus;
 });
 p(A3.gut&&A3.gut.ok===true,"A3 eine geschriebene Zeile gilt als Erfolg",A3.gut);
 p(A3.leer&&A3.leer.ok===false,
   "A4 GEGENPROBE: 0 betroffene Zeilen gelten NICHT als Erfolg - ein von RLS "
   +"blockiertes Schreiben meldet keinen Fehler, es betrifft still nichts",A3.leer);
 p(A3.fehler&&A3.fehler.ok===false&&A3.fehler.rls===true,
   "A5 ein echter Fehler wird durchgereicht und als Rechteproblem erkannt",A3.fehler);

 const A6=await page.evaluate(async()=>{
  katalogHinweis("");
  const echt=sb.from;
  sb.from=(t)=>{const q={};["eq","order","limit","not","select"].forEach(k=>q[k]=()=>q);
   q.update=()=>q; q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g); return q};
  katalogSpeicher("measurement_materials",0)(1,{name:"Blei"});
  await new Promise(f=>setTimeout(f,200));
  const el=$("katalogHinweis");
  const raus={text:el.textContent,fehler:el.classList.contains("fehler"),an:el.classList.contains("an")};
  sb.from=echt; katalogHinweis("");
  return raus;
 });
 p(A6.an===true&&A6.fehler===true&&/Berechtigung/.test(A6.text),
   "A6 und der Anwender SIEHT es - stilles Nichtstun war das eigentliche "
   +"Problem",A6);

 // Struktur: keine der sechs Stellen baut die Abfrage noch selbst.
 const q07=lies("js/07-einstellungen.js"), q08=lies("js/08-katalog-blitzschutz.js");
 const altMuster=/debounce\(\(id,patch\)=>sb\.from/;
 p(!altMuster.test(q07)&&!altMuster.test(q08),
   "A7 keine Stelle baut die Abfrage mehr selbst");
 ["rates","materials","profiles","blitzschutz_materials"].forEach(t=>{
  p(new RegExp('katalogSpeicher\\("'+t+'"\\)').test(q07),
    "A8 "+t+" speichert ueber die gemeinsame Funktion");
 });
 ["rinne_fitting_types","measurement_materials"].forEach(t=>{
  p(new RegExp('katalogSpeicher\\("'+t+'"\\)').test(q08),
    "A8 "+t+" speichert ueber die gemeinsame Funktion");
 });

 // ---- B  Der Werkstoff aus dem Positionstext -------------------------------
 console.log("\nB · Der Werkstoff steht im Positionstext");
 const B=await page.evaluate(()=>{
  const f=t=>{const id=werkstoffAusText(t);
    const m=measurementMaterials.find(x=>x.id===id);return m?m.name:null};
  return {
   stahl:f("Stahlblech svz / evz / dek"),
   titanzink:f("Titanzinkblech blank"),
   messing:f("Messingblech halb hart"),
   kupfer:f("Kupferblech"),
   chromstahl:f("Chromstahl 1.4016 magnetisch"),
   loch:f("Lochblech Titanzink blank Lg5 Tg7"),
   chromnickel:f("Chromnickelstahl 1.4301 2b 2d"),
   walzblei:f("Walzblei"),
   cns:f("CNS 1.4301 geschl. & MATT PLUS"),
   dichtband:f("Dichtband"),
   leer:f("")
  };
 });
 p(B.stahl==="Stahl"&&B.titanzink==="Titanzink"&&B.kupfer==="Kupfer"
   &&B.messing==="Messing"&&B.loch==="Titanzink",
   "B1 die echten Positionsnamen werden richtig zugeordnet",B);
 p(B.chromstahl==="Chromstahl, verzinnt",
   "B2 auch ein mehrteiliger Werkstoffname - gesucht wird sein ERSTES Wort",B);
 p(B.chromnickel===null,
   "B3 GEGENPROBE: „Chromnickelstahl 1.4301\" bekommt KEINEN Vorschlag. Das "
   +"Wort muss ein Wort beginnen - sonst stuende hier „Stahl\", und 1.4301 "
   +"ist CrNi-Stahl",B);
 p(B.cns===null&&B.dichtband===null&&B.leer===null,
   "B4 wo nichts zu erkennen ist, wird nichts vorgeschlagen",B);
 p(B.walzblei===null,
   "B5 die bekannte Grenze: bei „Walzblei\" steht der Werkstoff hinten im "
   +"Wort und wird nicht gefunden - das ist der Preis dafuer, nicht falsch "
   +"zu raten",B);

 const B6=await page.evaluate(()=>{
  // Die Quelle ist die Werkstoffliste der Firma, keine einprogrammierte.
  const vorher=werkstoffAusText("Bronzeblech 0.8");
  measurementMaterials=measurementMaterials.concat([{id:99,name:"Bronze"}]);
  const nachher=werkstoffAusText("Bronzeblech 0.8");
  measurementMaterials=measurementMaterials.filter(m=>m.id!==99);
  return {vorher,nachher};
 });
 p(B6.vorher===null&&B6.nachher===99,
   "B6 GEGENPROBE: ein neu angelegter Werkstoff wird sofort erkannt - die "
   +"Quelle ist die Liste der Firma, keine fest einprogrammierte Tabelle",B6);

 const B7=await page.evaluate(async()=>{
  settings.materials=[
   ["104.11","Messingblech halb hart","1.00","m²",1],
   ["102.01","Kupferblech","0.60","m²",1]];
  materialIds=[104,36];
  materialWerkstoffe=[null,3];        // 104 ohne, 36 schon Kupfer
  materialFormate=[{staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null},
                   {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}];
  lagKandidatenOffen=true;
  renderLagerbestand();
  const z=id=>document.querySelector('[data-lag-kandidat="'+id+'"]');
  return {
   ohne:z(104)?z(104).querySelector("[data-k-material]").value:null,
   ohneMarke:z(104)?/vorgeschlagen/.test(z(104).innerHTML):false,
   mit:z(36)?z(36).querySelector("[data-k-material]").value:null,
   mitMarke:z(36)?/vorgeschlagen/.test(z(36).innerHTML):false
  };
 });
 p(B7.ohne==="21"&&B7.ohneMarke===true,
   "B7 in der Vorschlagsliste steht der erkannte Werkstoff vorbelegt da - "
   +"sichtbar als Vorschlag gekennzeichnet",B7);
 p(B7.mit==="3"&&B7.mitMarke===false,
   "B8 GEGENPROBE: ein am Artikel bereits gesetzter Werkstoff gilt und wird "
   +"nicht als Vorschlag ausgegeben",B7);

 p(fehler.length===0,"C1 keine Javascript-Fehler",fehler.slice(0,3));

 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 await b.close();
 process.exit(fail?1:0);
})();
