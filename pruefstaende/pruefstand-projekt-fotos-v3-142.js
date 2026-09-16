// Prueft die Fotowand des Projekt-Cockpits (v3.142):
//   - sie sammelt die Bilder aus ALLEN fuenf Quellen, die das Cockpit
//     ohnehin schon geladen hat (Massaufnahmen inkl. Skizzen, Ausmass,
//     Regierapport, Offerte, Projektdateien),
//   - an jedem Bild steht, woher es stammt, und bei mehreren Bildern
//     derselben Quelle auch die wievielten sie sind,
//   - aeltere Datensaetze mit nur dem Einzelfeld photo_path kommen mit,
//   - Dateien, die keine Bilder sind (PDF, Excel), kommen NICHT mit,
//   - es faellt keine einzige zusaetzliche Datenbankabfrage an,
//   - die signierten URLs werden erst beim Aufklappen geholt (zugeklappt
//     keine einzige) und danach kein zweites Mal,
//   - der Klick auf eine Kachel oeffnet die BESTEHENDE Grossansicht,
//     nicht eine zweite,
//   - beim Projektwechsel bleibt kein Bild des vorigen Projekts stehen,
//   - ohne Bilder steht der Leertext und der Zaehler 0.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projekt-fotos-v3-142.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const STUB=`window.__ruf=[];window.__signiert=[];
window.__db={measurements:[],ausmass:[],reports:[],angebote:[],project_files:[],audit_log:[],feature_access:[]};
function __tab(name){
 const st={name,filter:[]};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.indexOf(r[k])>=0:String(r[k])===String(v));
 const lauf=()=>{window.__ruf.push({tabelle:name,filter:st.filter.slice()});
  const q=window.__db[name]||[];
  return {data:q.filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null}};
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});return {data:null,error:null}},
 from:(t)=>__tab(t),
 storage:{from:()=>({createSignedUrl:async(pf)=>{window.__signiert.push(pf);
   return {data:{signedUrl:'https://beispiel.test/'+pf},error:null}}})}
})};`;

const MIKE="aaaa1111-1111-1111-1111-111111111111";

// Projekt 3: alle fuenf Quellen tragen bei. Projekt 4: kein einziges Bild.
const MESS=[
 // drei Fotos und eine Skizze - Mehrzahl-Felder, also "Foto 1/3" usw.
 {id:11,project_id:3,type:"kamineinfassung",title:"Ost",date:"2026-09-01",data:{},
  photo_paths:["m/f1.jpg","m/f2.jpg","m/f3.jpg"],sketch_paths:["m/s1.png"]},
 // alter Datensatz: NUR die Einzelfelder
 {id:12,project_id:3,type:"kehle",title:"",date:"2026-08-20",data:{},
  photo_path:"alt/einzel.jpg",sketch_path:"alt/skizze.png"},
 // ohne jedes Bild - darf keine Kachel erzeugen
 {id:13,project_id:3,type:"lukarne",title:"West",date:"2026-08-10",data:{}}
];
const AUSM=[{id:21,project_id:3,type:"blitzschutz_ausmass",title:"Dach",date:"2026-09-05",
  photo_paths:["am/a1.jpg"]}];
const REPS=[{id:31,project_id:3,date:"2026-03-14",order_no:"A-77",
  photo_paths:["rp/r1.jpg","rp/r2.jpg"]}];
const ANGE=[{id:41,project_id:3,title:"Offerte Dach",date:"2026-02-01",
  photo_path:"an/o1.jpg"}];
const DATEI=[
 {id:51,project_id:3,name:"plan.jpg",mime_type:"image/jpeg",file_path:"pf/plan.jpg",
  size_bytes:1000,created_at:"2026-09-06T08:00:00Z",created_by:MIKE},
 {id:52,project_id:3,name:"offerte.pdf",mime_type:"application/pdf",file_path:"pf/offerte.pdf",
  size_bytes:2000,created_at:"2026-09-06T09:00:00Z",created_by:MIKE}
];

const oeffnen=async(page,projektId,bestueckt)=>{
 await page.evaluate(([id,best,MIKE,MESS,AUSM,REPS,ANGE,DATEI])=>{
  currentProfile={id:MIKE,role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:MIKE,first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:3,name:"Test Strasse 11",object:"Teststrasse 11, 3000 Bern",archived:false},
               {id:4,name:"Leer Weg 4",object:"Leerweg 4, 3000 Bern",archived:false}];
  offerteZugriff=true;
  if(typeof lagerverwaltungZugriff!=="undefined")lagerverwaltungZugriff=false;
  window.__db.measurements =best?JSON.parse(JSON.stringify(MESS)):[];
  window.__db.ausmass      =best?JSON.parse(JSON.stringify(AUSM)):[];
  window.__db.reports      =best?JSON.parse(JSON.stringify(REPS)):[];
  window.__db.angebote     =best?JSON.parse(JSON.stringify(ANGE)):[];
  window.__db.project_files=best?JSON.parse(JSON.stringify(DATEI)):[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.__ruf=[];window.__signiert=[];
 },[projektId,bestueckt,MIKE,MESS,AUSM,REPS,ANGE,DATEI]);
 await page.evaluate(id=>openProjectCockpit(id),projektId);
 await page.waitForTimeout(250);
};

const klappen=async(page,auf)=>{
 await page.evaluate(a=>{
  const k=[...document.querySelectorAll('#projectCockpitModal .klapp-kopf[data-klapp="fotos"]')][0];
  cockpitKlappSetzen(k,a);
 },auf);
 await page.waitForTimeout(250);
};

const wand=page=>page.evaluate(()=>{
 const box=$("cockpitFotosBody");
 return {
  zahl:($("cockpitFotosCount")||{}).textContent,
  leer:!box.querySelector(".medien-kachel"),
  text:(box.innerText||"").replace(/\s+/g," ").trim(),
  kacheln:[...box.querySelectorAll(".medien-kachel")].map(k=>({
   label:k.dataset.label,
   pfad:(k.querySelector("img")||{dataset:{}}).dataset.signedSrc,
   src:(k.querySelector("img")||{}).src||"",
   bereit:k.dataset.bereit||""
  }))
 };
});

(async()=>{
 const browser=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · zugeklappt: gesammelt, aber noch keine einzige signierte URL");
 await oeffnen(page,3,true);
 await klappen(page,false);
 let w=await wand(page);
 // 3+1 (Massaufnahme 11) + 1+1 (alter Datensatz 12) + 1 Ausmass + 2 Rapport
 // + 1 Offerte + 1 Bilddatei = 11. Die PDF-Datei zaehlt NICHT mit.
 p(w.kacheln.length===11,"elf Bilder aus fuenf Quellen",w.kacheln.length);
 p(w.zahl==="11","die Zahl in der Ueberschrift stimmt damit ueberein",w.zahl);
 let sig=await page.evaluate(()=>window.__signiert.slice());
 // Der Dateien-Abschnitt holt die Vorschau seiner Bilddatei schon seit v2.49
 // selbst (resolveSignedThumbnails) - das ist nicht die Fotowand. Geprueft
 // wird deshalb, dass KEIN Pfad dabei ist, den nur die Wand kennt.
 const nurWand=["m/f1.jpg","m/f2.jpg","m/f3.jpg","m/s1.png","alt/einzel.jpg",
                "alt/skizze.png","am/a1.jpg","rp/r1.jpg","rp/r2.jpg","an/o1.jpg"];
 p(!sig.some(x=>nurWand.indexOf(x)>=0),"zugeklappt holt die Wand KEINE signierte URL",sig);

 console.log("\nB · keine zusaetzliche Abfrage fuer die Fotowand");
 const ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle).map(r=>r.tabelle));
 // Genau die Tabellen, die die Abschnitte des Cockpits ohnehin lesen -
 // die Fotowand selbst fragt nichts ab.
 const erlaubt=["measurements","ausmass","reports","project_files","angebote",
                "leistungen","audit_log"];
 p(ruf.every(t=>erlaubt.indexOf(t)>=0),"nur die Abfragen der Abschnitte selbst",ruf);
 const doppelt=erlaubt.filter(t=>ruf.filter(x=>x===t).length>1);
 p(doppelt.length===0,"keine Tabelle wird ein zweites Mal gelesen",{ruf,doppelt});

 console.log("\nC · an jedem Bild steht, woher es stammt");
 const L=w.kacheln.map(k=>k.label);
 p(L[0]==="📐 Kamineinfassung · Ost · Foto 1/3","Massaufnahme: Art, Titel und Nummer",L[0]);
 p(L[2]==="📐 Kamineinfassung · Ost · Foto 3/3","und zwar durchnummeriert",L[2]);
 p(L[3]==="📐 Kamineinfassung · Ost · Skizze","die einzige Skizze ohne Zaehler",L[3]);
 p(L[4]==="📐 Kehle · Foto","alter Datensatz: nur die Art, kein Titel erfunden",L[4]);
 p(L[5]==="📐 Kehle · Skizze","auch die Einzelfeld-Skizze kommt mit",L[5]);
 p(/^📏 Blitzschutzausmass · Dach/.test(L[6]),"Ausmass mit Art und Titel",L[6]);
 p(/^📋 Regierapport · 14\.3\.2026 · A-77 · Foto 1\/2$/.test(L[7]),"Rapport mit Datum und Auftrags-Nr.",L[7]);
 p(/^🧾 Offerte · Offerte Dach/.test(L[9]),"Offerte mit Bezeichnung",L[9]);
 p(L[10]==="📎 Datei · plan.jpg","Projektdatei mit Dateinamen",L[10]);
 p(!L.some(x=>/offerte\.pdf/.test(x)),"das PDF ist kein Foto und fehlt",L);
 p(!L.some(x=>/Lukarne/.test(x)),"die bildlose Massaufnahme erzeugt keine Kachel",L);
 p(w.kacheln.map(k=>k.pfad).join()==="m/f1.jpg,m/f2.jpg,m/f3.jpg,m/s1.png,alt/einzel.jpg,"
   +"alt/skizze.png,am/a1.jpg,rp/r1.jpg,rp/r2.jpg,an/o1.jpg,pf/plan.jpg",
   "und jede Kachel zeigt genau ihren gespeicherten Pfad",w.kacheln.map(k=>k.pfad));

 console.log("\nD · beim Aufklappen kommen die Vorschauen - genau eine je Bild");
 await page.evaluate(()=>{window.__signiert=[]});
 await klappen(page,true);
 sig=await page.evaluate(()=>window.__signiert.slice());
 p(sig.length===11,"elf signierte URLs, eine je Bild",sig.length);
 p(sig.join()===w.kacheln.map(k=>k.pfad).join(),"fuer genau die elf Pfade",sig);
 w=await wand(page);
 p(w.kacheln.every(k=>k.bereit==="1"&&/^https:\/\/beispiel\.test\//.test(k.src)),
   "jede Kachel zeigt ihr Bild",w.kacheln.map(k=>[k.bereit,k.src.slice(0,40)]));
 // Gegenprobe: erneutes Auf- und Zuklappen holt die URLs NICHT nochmal.
 await klappen(page,false);
 await klappen(page,true);
 sig=await page.evaluate(()=>window.__signiert.length);
 p(sig===11,"erneutes Aufklappen holt sie kein zweites Mal",sig);
 // Gegenprobe zur Gegenprobe: wird eine Quelle neu geladen, MUSS die Wand
 // neu zeichnen und ihre Vorschauen wieder holen - sonst haengt sie fest.
 await page.evaluate(()=>{window.__signiert=[];return cockpitBereichAktualisieren("meas")});
 await page.waitForTimeout(250);
 sig=await page.evaluate(()=>window.__signiert.slice());
 p(sig.length===11,"nach dem Neuladen einer Quelle zeichnet die Wand neu",sig.length);

 console.log("\nE · der Klick oeffnet die BESTEHENDE Grossansicht");
 const gross=await page.evaluate(()=>{
  const k=$("cockpitFotosBody").querySelector(".medien-kachel");
  k.click();
  return {
   offen:!$("measMediaViewer").hidden,
   bild:$("measMediaViewerImg").src,
   label:$("measMediaViewerLabel").textContent,
   // es darf KEIN zweiter Betrachter im Dokument stehen
   anzahl:document.querySelectorAll(".medien-viewer").length,
   // und die Medienansicht der einzelnen Massaufnahme bleibt zu
   modal:!$("measMediaModal").hidden
  };
 });
 p(gross.offen,"der Betrachter ist offen");
 p(gross.anzahl===1,"es gibt genau EINEN Betrachter in der App",gross.anzahl);
 p(gross.bild==="https://beispiel.test/m/f1.jpg","er zeigt das angetippte Bild",gross.bild);
 p(gross.label==="📐 Kamineinfassung · Ost · Foto 1/3","mit der Herkunft als Beschriftung",gross.label);
 p(!gross.modal,"die Einzelansicht einer Massaufnahme wurde nicht mitgeoeffnet");
 await page.evaluate(()=>$("measMediaViewerClose").click());

 console.log("\nF · Projektwechsel: kein Bild des vorigen Projekts");
 await oeffnen(page,4,false);
 w=await wand(page);
 p(w.leer,"keine Kachel mehr",w.kacheln.length);
 p(w.zahl==="0","der Zaehler steht auf 0",w.zahl);
 p(/Noch keine Fotos in diesem Projekt/.test(w.text),"und der Leertext steht da",w.text.slice(0,120));
 sig=await page.evaluate(()=>window.__signiert.slice());
 p(sig.length===0,"ohne Bilder wird keine signierte URL geholt",sig);

 console.log("\nG · Gegenprobe: die alte Einzelansicht einer Massaufnahme ist unveraendert");
 await oeffnen(page,3,true);
 const einzel=await page.evaluate(()=>{
  window.__signiert=[];
  openMeasMedien(11);
  return {offen:!$("measMediaModal").hidden,
          kacheln:$("measMediaBody").querySelectorAll(".medien-kachel").length,
          titel:$("measMediaTitle").textContent};
 });
 await page.waitForTimeout(150);
 p(einzel.offen&&einzel.kacheln===4,"sie zeigt weiterhin ihre eigenen vier Bilder",einzel);
 p(/Kamineinfassung/.test(einzel.titel),"mit der Art als Titel",einzel.titel);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log(`\nErgebnis: ${ok} ok, ${fail} fehlgeschlagen`);
 await browser.close();
 process.exit(fail?1:0);
})();
