// Prueft, dass die Anlege-Knoepfe auffindbar und eindeutig sind (v3.140).
//
// Gemeldet: "Hab den button gefunden, das muss aber einfacher und
// verstaendlicher aufgebaut werden, das ist alles zu sehr versteckt."
//
// Der Befund war dreifach:
//   1. "＋ Material hinzufuegen" stand DREIMAL wortgleich in den
//      Einstellungen - in drei verschiedenen Listen.
//   2. Der Knopf des Regiematerials sass UNTER der Liste, hinter bis zu 20
//      Zeilen und den Blaetter-Knoepfen.
//   3. In der Lagerverwaltung war "＋ Neues Produkt" ein grauer Nebenknopf
//      zwischen "Alle zuklappen" und "Archiv anzeigen".
//
// Dieser Pruefstand misst die STELLUNG im Dokument, nicht nur die Existenz -
// ein Knopf, den man erst nach 20 Zeilen sieht, ist praktisch keiner.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-anlegen-sichtbar-v3-140.js
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
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  meineRechte={admin:true,kataloge:true,lager:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nA · Jeder Anlege-Knopf sagt, WAS er anlegt");
 const texte=await page.evaluate(()=>{
  const ids=["newMaterial","newBzMaterial","newMeasMaterial","lagerNeu","lagerNeuesProduktStart"];
  const o={}; ids.forEach(i=>{ o[i]=$(i)?$(i).textContent.trim():null; });
  return o;
 });
 Object.keys(texte).forEach(id=>{
  p(!!texte[id],`der Knopf ${id} ist vorhanden`,texte[id]);
 });
 // DIE Gegenprobe auf das Gemeldete: kein Text darf zweimal vorkommen.
 const werte=Object.values(texte).filter(Boolean);
 const doppelt=werte.filter((t,i)=>werte.indexOf(t)!==i);
 p(doppelt.length===0,
   "GEGENPROBE: kein Anlege-Knopf heisst wie ein anderer",{texte,doppelt});
 // Und keiner darf mehr die alte, nichtssagende Beschriftung tragen.
 p(!werte.some(t=>/^＋ Material hinzuf/.test(t)),
   "GEGENPROBE: die alte Beschriftung „＋ Material hinzufügen\" gibt es nicht mehr",werte);
 p(/Materialposition/.test(texte.newMaterial||""),
   "der Regiematerial-Knopf nennt die Materialposition",texte.newMaterial);
 p(/Massaufnahmen/.test(texte.newMeasMaterial||""),
   "der Massaufnahme-Knopf nennt die Massaufnahmen",texte.newMeasMaterial);
 p(/Blitzschutz/.test(texte.newBzMaterial||""),
   "der Blitzschutz-Knopf nennt den Blitzschutz",texte.newBzMaterial);
 p(/Blech|Rolle|Tafel/.test(texte.lagerNeu||""),
   "der Blech-Knopf nennt das Blech - er hat mit dem Katalog nichts zu tun",texte.lagerNeu);

 console.log("\nB · Der Knopf steht VOR der Liste, nicht dahinter");
 // Gemessen wird die Stellung im Dokument: compareDocumentPosition sagt,
 // was zuerst kommt. Das ist der Unterschied zwischen "sofort sichtbar"
 // und "nach 20 Zeilen".
 const stellung=await page.evaluate(()=>{
  const vor=(a,b)=>{
   const A=$(a),B=$(b); if(!A||!B)return null;
   return !!(A.compareDocumentPosition(B)&Node.DOCUMENT_POSITION_FOLLOWING);
  };
  return {mat:vor("newMaterial","materialSettings"),
          bz:vor("newBzMaterial","bzMaterialSettings"),
          meas:vor("newMeasMaterial","measMaterialSettings"),
          matVorBlaettern:vor("newMaterial","materialPrev")};
 });
 p(stellung.mat===true,
   "„Neue Materialposition\" steht VOR der Materialliste",stellung);
 p(stellung.bz===true,"ebenso beim Blitzschutz-Katalog",stellung);
 p(stellung.meas===true,"ebenso beim Massaufnahme-Material",stellung);
 p(stellung.matVorBlaettern===true,
   "GEGENPROBE: und VOR den Blaetter-Knoepfen - nicht dahinter wie bis v3.139",stellung);

 console.log("\nC · Die Lagerverwaltung kommt ohne die Einstellungen aus");
 const lager=await page.evaluate(()=>{
  const leiste=$("lagerNeuesProduktStart")?$("lagerNeuesProduktStart").parentNode:null;
  const knoepfe=leiste?Array.from(leiste.querySelectorAll("button")).map(k=>k.id):[];
  return {ersterKnopf:knoepfe[0]||null, knoepfe,
    klasse:$("lagerNeuesProduktStart")?$("lagerNeuesProduktStart").className:null};
 });
 p(lager.ersterKnopf==="lagerNeuesProduktStart",
   "er steht an erster Stelle der Leiste",lager);
 // Gegenprobe auf den Zustand bis v3.139: grau, hinter "Alle zuklappen".
 p(!/gray/.test(lager.klasse||""),
   "GEGENPROBE: er ist kein grauer Nebenknopf mehr",lager.klasse);
 p((lager.knoepfe.indexOf("lagerNeuesProduktStart"))
     <(lager.knoepfe.indexOf("lagerAlleZuklappen")),
   "GEGENPROBE: er steht VOR „Alle zuklappen\"",lager.knoepfe);
 // Und er muss wirklich in den gemeinsamen Dialog fuehren.
 await page.evaluate(()=>$("lagerNeuesProduktStart").click());
 await page.waitForTimeout(400);
 const auf=await page.evaluate(()=>!$("lagerNeuesProduktModal").hidden);
 p(auf,"und er oeffnet den gemeinsamen Anlege-Dialog",auf);

 console.log("\nD · Kein Knopf ist doppelt im Dokument");
 const mehrfach=await page.evaluate(()=>{
  const o={};
  ["newMaterial","newBzMaterial","newMeasMaterial","lagerNeuesProduktStart","lagerNeu"]
   .forEach(i=>{o[i]=document.querySelectorAll("#"+i).length});
  return o;
 });
 p(Object.values(mehrfach).every(n=>n===1),
   "jede Kennung kommt genau einmal vor",mehrfach);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
