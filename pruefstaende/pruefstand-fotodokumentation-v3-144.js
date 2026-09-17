// Prueft die Fotodokumentation des Projekts (v3.144):
//   - der Druckknopf erscheint nur, wenn es wirklich Bilder gibt,
//   - gedruckt wird GENAU das, was die Fotowand zeigt - gleiche Anzahl,
//     gleiche Herkunftsangaben, keine zweite Sammelstelle,
//   - der Ausdruck nimmt den gemeinsamen Briefkopf (pdfKopfHtml) und die
//     gemeinsame Fusszeile (pdfFooterHtml), keinen eigenen,
//   - das Druckfenster wird SOFORT im Klick geoeffnet (sonst blockiert es
//     der Browser, weil die Benutzeraktion beim Warten verbraucht waere),
//   - und es wird ERST gedruckt, wenn jedes Bild geladen ist. Das ist der
//     Kern: wird zu frueh gedruckt, stehen auf dem Papier leere Kaesten.
//   - ein Bild ohne signierte Adresse verschwindet nicht still, sondern
//     wird als Platzhalter ausgewiesen und im Text gezaehlt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-fotodokumentation-v3-144.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const STUB=`window.__ruf=[];window.__signiert=[];window.__keineUrlFuer=[];
window.__db={measurements:[],ausmass:[],reports:[],angebote:[],project_files:[],audit_log:[]};
function __tab(name){
 const st={name,filter:[]};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.indexOf(r[k])>=0:String(r[k])===String(v));
 const lauf=()=>{window.__ruf.push({tabelle:name});
  const q=window.__db[name]||[];
  return {data:q.filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null}};
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>__tab(t),
 storage:{from:()=>({createSignedUrl:async(pf)=>{window.__signiert.push(pf);
   if(window.__keineUrlFuer.indexOf(pf)>=0)return {data:null,error:{message:'kaputt'}};
   return {data:{signedUrl:'https://beispiel.test/'+pf},error:null}}})}
})};

// --- Druckfenster nachbilden -------------------------------------------
// window.open() gibt es im Prueffeld nicht sinnvoll. Der Ersatz haelt fest,
// was geschrieben wurde, WANN gedruckt wurde und wie viele Bilder zu
// diesem Zeitpunkt geladen waren - genau darum geht es hier.
window.__druck={fenster:[],blockieren:false};
window.open=function(){
 if(window.__druck.blockieren)return null;
 const f={
  geschrieben:"", ersterText:null, closed:false, druckAufrufe:0,
  geladenBeimDruck:null, _bilder:[],
  focus(){}, print(){ f.druckAufrufe++;
    if(f.geladenBeimDruck===null)f.geladenBeimDruck=f._bilder.filter(b=>b.__geladen).length; },
  document:{
   open(){ f.geschrieben=""; f._bilder=[]; },
   write(h){ if(f.ersterText===null)f.ersterText=h;   // was der Anwender ZUERST sieht
             f.geschrieben+=h; },
   close(){
    // Bilder aus dem geschriebenen HTML ableiten, wie sie ein echtes
    // Fenster nach dem Schreiben haette: vorhanden, aber noch nicht geladen.
    f._bilder=[...f.geschrieben.matchAll(/<img[^>]+src="([^"]*)"/g)].map(m=>({
     src:m[1], complete:false, __geladen:false, __hoerer:{},
     addEventListener(art,fn){ (this.__hoerer[art]=this.__hoerer[art]||[]).push(fn) }
    }));
   },
   get images(){ return f._bilder; }
  }
 };
 window.__druck.fenster.push(f);
 return f;
};
// Laedt die Bilder eines Fensters einzeln nach - so laesst sich messen,
// ob VOR dem letzten Bild schon gedruckt wurde.
window.__bildFertig=function(fensterNr,bildNr,art){
 const f=window.__druck.fenster[fensterNr]; if(!f)return;
 const b=f._bilder[bildNr]; if(!b)return;
 b.complete=true; b.__geladen=true;
 (b.__hoerer[art||"load"]||[]).forEach(fn=>fn());
};`;

const MIKE="aaaa1111-1111-1111-1111-111111111111";
const MESS=[
 {id:11,project_id:3,type:"kamineinfassung",title:"Ost",date:"2026-09-01",data:{},
  photo_paths:["m/f1.jpg","m/f2.jpg"],sketch_paths:["m/s1.png"]}
];
const REPS=[{id:31,project_id:3,date:"2026-03-14",order_no:"A-77",photo_paths:["rp/r1.jpg"]}];

const oeffnen=async(page,bestueckt)=>{
 await page.evaluate(([best,MIKE,MESS,REPS])=>{
  currentProfile={id:MIKE,role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:MIKE,first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:3,name:"Test Strasse 11",object:"Teststrasse 11, 3000 Bern",
                order_no:"2026-1",customer:"Muster AG",archived:false}];
  offerteZugriff=false;
  if(typeof lagerverwaltungZugriff!=="undefined")lagerverwaltungZugriff=false;
  window.__db.measurements=best?JSON.parse(JSON.stringify(MESS)):[];
  window.__db.reports     =best?JSON.parse(JSON.stringify(REPS)):[];
  window.__db.ausmass=[];window.__db.angebote=[];window.__db.project_files=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.__druck={fenster:[],blockieren:false};
  window.__signiert=[];
 },[bestueckt,MIKE,MESS,REPS]);
 await page.evaluate(()=>openProjectCockpit(3));
 await page.waitForTimeout(300);
};

(async()=>{
 const browser=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>{page.__letzterDialog=d.message();d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · ohne Bilder gibt es keinen Druckknopf");
 await oeffnen(page,false);
 let sicht=await page.evaluate(()=>{
  const k=$("cockpitFotosDruck");
  return {da:!!k,versteckt:k?k.hidden:null};
 });
 p(sicht.da&&sicht.versteckt===true,"der Knopf ist da, aber ausgeblendet",sicht);

 console.log("\nB · mit Bildern erscheint er");
 await oeffnen(page,true);
 sicht=await page.evaluate(()=>({versteckt:$("cockpitFotosDruck").hidden,
   wand:$("cockpitFotosBody").querySelectorAll(".medien-kachel").length}));
 p(sicht.versteckt===false,"der Knopf ist sichtbar",sicht);
 p(sicht.wand===4,"die Wand zeigt vier Bilder (2 Fotos, 1 Skizze, 1 Rapportfoto)",sicht.wand);

 console.log("\nC · der Klick oeffnet SOFORT ein Fenster, gedruckt wird noch nicht");
 await page.evaluate(()=>{window.__druck={fenster:[],blockieren:false};$("cockpitFotosDruck").click()});
 // Gemessen wird der ERSTE Schreibvorgang, nicht der Stand nach kurzem
 // Warten: ob das fertige Dokument danach in 5 ms oder in 5 s folgt, darf
 // die Aussage nicht umkippen lassen (sonst misst der Pruefstand die Uhr
 // des Rechners statt das Verhalten der App).
 let st=await page.evaluate(()=>({
  fenster:window.__druck.fenster.length,
  erster:window.__druck.fenster[0]?window.__druck.fenster[0].ersterText:"",
  gedruckt:window.__druck.fenster[0]?window.__druck.fenster[0].druckAufrufe:-1
 }));
 p(st.fenster===1,"genau ein Fenster",st.fenster);
 p(/wird vorbereitet/.test(st.erster)&&/4 Bild/.test(st.erster),
   "der erste Inhalt sagt, dass vorbereitet wird - und wie viele Bilder",st.erster.slice(0,160));
 p(st.gedruckt===0,"und es wird noch nicht gedruckt",st.gedruckt);

 console.log("\nD · das fertige Dokument");
 await page.waitForTimeout(600);
 st=await page.evaluate(()=>{
  const f=window.__druck.fenster[0];
  return {text:f.geschrieben,bilder:f._bilder.map(b=>b.src),gedruckt:f.druckAufrufe};
 });
 p(st.bilder.length===4,"vier Bilder im Dokument - so viele wie an der Wand",st.bilder.length);
 p(st.bilder.join()==="https://beispiel.test/m/f1.jpg,https://beispiel.test/m/f2.jpg,"
   +"https://beispiel.test/m/s1.png,https://beispiel.test/rp/r1.jpg",
   "und zwar genau die vier gespeicherten Pfade",st.bilder);
 p(/FOTODOKUMENTATION/.test(st.text),"der gemeinsame Briefkopf traegt den Dokumenttyp",
   (st.text.match(/FOTODOKUMENTATION/)||[])[0]);
 p(/pdf-head/.test(st.text)&&/pdf-foot/.test(st.text),
   "es sind der gemeinsame Kopf UND die gemeinsame Fusszeile (js/16), kein eigener");
 p(/Test Strasse 11/.test(st.text)&&/Muster AG/.test(st.text),
   "Projekt und Auftraggeber stehen drauf");
 // Die Herkunft muss im Ausdruck genauso stehen wie an der Wand.
 const wandLabels=await page.evaluate(()=>[...$("cockpitFotosBody")
   .querySelectorAll(".medien-kachel")].map(k=>k.dataset.label));
 p(wandLabels.every(l=>st.text.indexOf(l)>=0),
   "jede Herkunftsangabe der Wand steht auch im Ausdruck",wandLabels);
 p(/Kamineinfassung · Ost · Foto 1\/2/.test(st.text),"z. B. die der ersten Massaufnahme");
 p(/Regierapport · 14\.3\.2026 · A-77/.test(st.text),"und die des Rapports");

 console.log("\nE · der Kern: gedruckt wird ERST, wenn jedes Bild geladen ist");
 p(st.gedruckt===0,"nach dem Schreiben ist noch nicht gedruckt",st.gedruckt);
 for(const nr of [0,1,2]){
  await page.evaluate(i=>window.__bildFertig(0,i,"load"),nr);
  const zw=await page.evaluate(()=>window.__druck.fenster[0].druckAufrufe);
  p(zw===0,`auch nach Bild ${nr+1} von 4 noch nicht`,zw);
 }
 await page.evaluate(()=>window.__bildFertig(0,3,"load"));
 const fertig=await page.evaluate(()=>({
  gedruckt:window.__druck.fenster[0].druckAufrufe,
  geladenBeimDruck:window.__druck.fenster[0].geladenBeimDruck
 }));
 p(fertig.gedruckt===1,"erst nach dem vierten wird gedruckt - genau einmal",fertig.gedruckt);
 p(fertig.geladenBeimDruck===4,"und zwar mit allen vier Bildern geladen",fertig.geladenBeimDruck);

 console.log("\nF · ein Bild, dessen Adresse nicht zu holen ist, verschwindet NICHT still");
 await oeffnen(page,true);
 await page.evaluate(()=>{window.__keineUrlFuer=["m/f2.jpg"];
   window.__druck={fenster:[],blockieren:false};$("cockpitFotosDruck").click()});
 await page.waitForTimeout(700);
 const f2=await page.evaluate(()=>{
  const f=window.__druck.fenster[0];
  return {text:f.geschrieben,bilder:f._bilder.length};
 });
 p(f2.bilder===3,"drei echte Bilder statt vier",f2.bilder);
 p(/Bild konnte nicht geladen werden/.test(f2.text),"an der Stelle steht ein Platzhalter");
 p(/1 von 4 Bildern konnten nicht\s+geladen werden/.test(f2.text),
   "und der Ausdruck sagt es ausdruecklich",(f2.text.match(/Achtung:[^<]*/)||[""])[0]);
 p(/Kamineinfassung · Ost · Foto 2\/2/.test(f2.text),
   "die Herkunft steht auch beim Platzhalter dabei");
 await page.evaluate(()=>{window.__keineUrlFuer=[]});

 console.log("\nG · blockiertes Fenster: eine klare Ansage statt stiller Wirkungslosigkeit");
 await oeffnen(page,true);
 page.__letzterDialog="";
 await page.evaluate(()=>{window.__druck={fenster:[],blockieren:true};$("cockpitFotosDruck").click()});
 await page.waitForTimeout(300);
 p(/Pop-?ups/i.test(page.__letzterDialog||""),"der Anwender wird auf die Pop-up-Sperre hingewiesen",
   page.__letzterDialog);

 console.log("\nH · Gegenprobe: die Fotowand selbst ist unveraendert geblieben");
 await oeffnen(page,true);
 const wand=await page.evaluate(()=>({
  kacheln:$("cockpitFotosBody").querySelectorAll(".medien-kachel").length,
  zahl:$("cockpitFotosCount").textContent
 }));
 p(wand.kacheln===4&&wand.zahl==="4","sie zeigt weiterhin ihre vier Bilder",wand);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log(`\nErgebnis: ${ok} ok, ${fail} fehlgeschlagen`);
 await browser.close();
 process.exit(fail?1:0);
})();
