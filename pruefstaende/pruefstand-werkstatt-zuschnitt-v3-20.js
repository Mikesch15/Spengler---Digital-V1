// Prueft die Werkstatt (v3.20, umgebaut in v3.21): beim Ruesten steht die
// Zuschnittliste SOFORT da - ohne Aufklappen, ohne zweiten Klick - und
// laesst sich sofort abhaken.
//   - je Massaufnahme eine Karte mit ihrer EIGENEN Liste (nicht der
//     projektweite Sammelplan, in dem nicht abgehakt werden darf),
//   - jede Positionsnummer ist derselbe Abhak-Knopf wie im Formular,
//     gezeichnet von js/33 und bedient von js/56 - keine zweite Umsetzung,
//   - ein Tap schreibt genau ein upsert auf zuschnitt_erledigt, ohne
//     company_id vom Client,
//   - der Stand wird danach nachgezogen, ohne die Werkstatt neu zu zeichnen,
//   - ein Knopf fuehrt direkt ins Zuschnitt-Register der Massaufnahme,
//   - Block 2 zeigt keine abgeleiteten Masse mehr (Abwicklung, Flaeche,
//     Stueckzahl) - daraus holt an der Abkantbank niemand etwas.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
const QUELLE51=require("fs").readFileSync("js/51-werkstatt.js","utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];
window.__db={mess:[],res:[],ze:[],fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.upsert=(w,o)=>{st.op='upsert';st.werte=w;st.opt=o;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='measurements'?window.__db.mess:
               (name==='material_reservierungen'?window.__db.res:
               (name==='zuschnitt_erledigt'?window.__db.ze:[]));
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:r[k]===v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),
    werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null,opt:st.opt||null});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  if(st.op==='upsert'){
   const raus=[];
   (Array.isArray(st.werte)?st.werte:[st.werte]).forEach(w=>{
    const i=window.__db.ze.findIndex(x=>Number(x.measurement_id)===Number(w.measurement_id)
      &&Number(x.stueck_nr)===Number(w.stueck_nr));
    const z=Object.assign({id:900+window.__db.ze.length,company_id:'c1'},w);
    if(i>=0)window.__db.ze[i]=z; else window.__db.ze.push(z);
    raus.push(JSON.parse(JSON.stringify(z)));
   });
   return {data:raus,error:null};
  }
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:{id:(a&&a.p_id)||0,workflow_status:'geruestet'},error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};

// Projekt 7: ein Einlaufblech mit drei Zuschnitten, eine Kehle mit einem.
const MESS=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,
  data:{material:2,abwicklung:250,massA:120,winkel:30,montage:"links",
   // Die Stuecke gehoeren dazu: das Register rechnet den Plan live aus ihnen.
   pieces:[{laenge:1200,stossStoss:1200,gehrungLinks:false,gehrungRechts:false,winkel:0},
           {laenge:700,stossStoss:700,gehrungLinks:false,gehrungRechts:false,winkel:0},
           {laenge:2000,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0}],
   ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"3,90",einheit:"m"},
            {pos:2,bezeichnung:"Haltebleche (GAVA Blech)",menge:5,einheit:"Stk.",teil:true}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]},
                     {rest:0,stuecke:[{nr:3,laenge:2000}]}],optimal:true}}},
 {id:12,project_id:7,type:"kehle",title:"Kehle West",date:"2026-09-02",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T11:00:00Z",created_by:ICH,
  data:{material:3,abwicklung:500,
   ausmass:[{pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²"}],
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}}
];
// Vier Reservierungszeilen: ein Zuschnitt, ein echtes Teil, zwei abgeleitete
// Masse aus einer Uebernahme vor v3.18.
const RES=[
 {id:301,project_id:7,measurement_id:11,material_name:"Titanzink",bezeichnung:"Zuschnitt",
  menge:3,einheit:"Stk",status:"reserviert",breite_mm:250,laenge_mm:1200},
 {id:302,project_id:7,measurement_id:11,material_name:"Titanzink",bezeichnung:"Haltebleche (GAVA Blech)",
  menge:5,einheit:"Stk.",status:"reserviert",breite_mm:null,laenge_mm:null},
 {id:303,project_id:7,measurement_id:11,material_name:"Titanzink",bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",
  menge:"3.90",einheit:"m",status:"reserviert",breite_mm:null,laenge_mm:null},
 {id:304,project_id:7,measurement_id:12,material_name:"Kupfer",bezeichnung:"Blechfläche",
  menge:"1.00",einheit:"m²",status:"reserviert",breite_mm:null,laenge_mm:null}
];

const vorbereiten=async(page,module,ze)=>{
 await page.evaluate(([mess,res,zeR,mod,ich])=>{
  currentProfile={id:ich,role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=[];
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  window.__db.res=JSON.parse(JSON.stringify(res));
  window.__db.ze=JSON.parse(JSON.stringify(zeR||[]));
  window.__db.fehler=null;
  pmUebernehmen(mod);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("projectCockpitModal").hidden=true;$("werkstattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle";
  werkstattKnopfAktualisieren();
  window.__ruf=[];
 },[MESS,RES,ze,module,ICH]);
};
const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
const klick=async(page,sel,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,140));return false}
};
// v3.21: NUR die Werkstatt oeffnen. Die Zuschnittkarten muessen danach ohne
// jeden weiteren Klick dastehen - das ist die Eigenschaft, um die es geht.
async function werkstattAuf(page){
 if(!await klick(page,"#navWerkstatt","Werkstatt-Knopf"))return false;
 await page.waitForTimeout(600);
 return true;
}
// Material und Reservierungen liegen seit v3.21 in einem zugeklappten
// Bereich - fuer die Pruefungen dort einmal aufklappen.
async function mehrAuf(page){
 if(!await werkstattAuf(page))return false;
 if(!await klick(page,'[data-werk-auf="7"]',"Material und Reservierungen"))return false;
 await page.waitForTimeout(600);
 return true;
}

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 console.log("\nA · Die Zuschnittliste steht in der Werkstatt und ist abhakbar");
 await vorbereiten(page,MODULE,[]);
 if(await werkstattAuf(page)){
  const a=await page.evaluate(()=>{
   const box=$("werkstattBody");
   return {da:!!box&&document.querySelectorAll("#werkstattBody [data-ze-nr]").length>0,
     karten:document.querySelectorAll("#werkstattBody .werk-karte").length,
     knoepfe:[...document.querySelectorAll("#werkstattBody [data-ze-nr]")]
       .map(x=>x.dataset.zeMeas+":"+x.dataset.zeNr),
     zugeklappt:!document.querySelector("#werkstattBody .werk-grundlage"),
     text:box?box.innerText:""};
  });
  p(a.da,"die Zuschnittliste steht OHNE Aufklappen da");
  p(a.zugeklappt,"Material und Reservierungen sind dabei zugeklappt",a.zugeklappt);
  p(a.karten===2,"je Massaufnahme eine Karte",a.karten);
  // Einlaufblech 3 Stuecke + Kehle 1 Stueck = 4 Abhak-Knoepfe
  p(a.knoepfe.length===4,"jede Position ist ein Abhak-Knopf",a.knoepfe);
  p(a.knoepfe.filter(x=>x.startsWith("11:")).length===3
    &&a.knoepfe.filter(x=>x.startsWith("12:")).length===1,
    "die Knoepfe gehoeren zur richtigen Massaufnahme",a.knoepfe);
  p(/0 von 3 zugeschnitten/.test(a.text)&&/0 von 1 zugeschnitten/.test(a.text),
    "je Karte steht der Stand",a.text.slice(0,240));
  p(/0 von 4 Stück zugeschnitten/.test(a.text),"und der Gesamtstand ganz oben",a.text.slice(0,200));
  // Die Nummern DUERFEN nur hier abhakbar sein, weil sie zu genau einer
  // Aufnahme gehoeren. Der projektweite Sammelplan darf es nicht.
  const s=await page.evaluate(()=>{
   const plan=(typeof pzuSammeln==="function"&&typeof pzuPlan==="function")
     ?pzuPlan(pzuSammeln(werkZeilen).materialien[0]):null;
   return {sammel:plan?!!plan.sammel:null,
           einzel:werkZuschnittPlan(werkZeilen.find(m=>m.id===11)).erledigtFuer};
  });
  p(s.sammel===true,"der projektweite Plan bleibt ausdruecklich NICHT abhakbar",s);
  p(Number(s.einzel)===11,"die Karte sagt js/33, zu welcher Aufnahme sie gehoert",s);
 }

 console.log("\nB · Ein Tap hakt ab - und der Stand zieht nach");
 const t=await page.evaluate(async()=>{
  window.__ruf=[];
  const k=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]');
  if(!k)return {fehlt:true};
  k.click();
  await new Promise(r=>setTimeout(r,500));
  const schreibt=window.__ruf.filter(x=>x.tabelle==="zuschnitt_erledigt"&&x.op==="upsert");
  const box=$("werkstattBody");
  return {schreibt:schreibt.length, werte:schreibt[0]?schreibt[0].werte:null,
    opt:schreibt[0]?schreibt[0].opt:null,
    gedrueckt:k.getAttribute("aria-pressed"),
    text:box?box.innerText:""};
 });
 p(!t.fehlt&&t.schreibt===1,"ein Tap = genau ein Schreibaufruf",t);
 p(!!t.werte&&Number(t.werte[0].measurement_id)===11&&Number(t.werte[0].stueck_nr)===1,
   "auf die richtige Massaufnahme und das richtige Stueck",t.werte);
 p(!!t.werte&&t.werte[0].company_id===undefined,"kein company_id vom Client",t.werte);
 p(!!t.werte&&Number(t.werte[0].laenge_mm)===1200&&Number(t.werte[0].breite_mm)===250,
   "Laenge und Breite reisen als Beleg mit",t.werte);
 p(t.opt&&t.opt.onConflict==="measurement_id,stueck_nr","upsert auf (Aufnahme, Stueck)",t.opt);
 p(t.gedrueckt==="true","der Knopf ist danach gedrueckt",t.gedrueckt);
 p(/1 von 3 zugeschnitten/.test(t.text||""),"der Stand der Karte zieht nach",(t.text||"").slice(0,200));
 p(/1 von 4 Stück zugeschnitten/.test(t.text||""),"und der Gesamtstand ebenfalls",(t.text||"").slice(0,200));

 console.log("\nC · Direkt ins Zuschnitt-Register der Massaufnahme");
 const dir=await page.evaluate(()=>{
  const k=document.querySelector('#werkstattBody [data-werk-mess="11"][data-werk-zu]');
  const karte=k?k.closest(".werk-karte"):null;
  return {da:!!k,txt:k?k.textContent.trim():"",
    stand:karte?(karte.querySelector("[data-werk-zu-stand]")||{}).textContent||"":"",
    hoehe:k?Math.round(k.getBoundingClientRect().height):0};
 });
 p(dir.da,"in der Karte steht ein Knopf ins Formular");
 p(/1 von 3 zugeschnitten/.test(dir.stand),"mit dem Stand daneben",dir.stand);
 p(dir.hoehe>=34,"gross genug fuer den Finger",dir.hoehe);
 if(dir.da){
  await page.click('#werkstattBody [data-werk-mess="11"][data-werk-zu]');
  await page.waitForTimeout(700);
  const nach=await page.evaluate(()=>({
   formular:!$("measurementEditModal").hidden,
   werkstattZu:$("werkstattModal").hidden,
   rueck:typeof measEditReturnTo!=="undefined"?measEditReturnTo:null,
   register:(typeof ebaSchritt!=="undefined")?ebaSchritt:null,
   soll:(typeof EBA_REGISTER!=="undefined")
     ?EBA_REGISTER.findIndex(r=>r.kurz==="Zuschnitt")+1:null,
   knoepfe:document.querySelectorAll('#einlaufblechAufnahme [data-ze-nr]').length
  }));
  p(nach.formular&&nach.werkstattZu,"das Formular ist offen, die Werkstatt zu",nach);
  p(nach.rueck==="werkstatt","der Rueckweg fuehrt in die Werkstatt",nach.rueck);
  p(nach.register===nach.soll&&nach.soll>0,"und zwar direkt ins Register Zuschnitt",nach);
  p(nach.knoepfe===3,"dort stehen dieselben Abhak-Knoepfe",nach.knoepfe);
  const stand=await page.evaluate(()=>{
   const k=document.querySelector('#einlaufblechAufnahme [data-ze-nr="1"]');
   return k?k.getAttribute("aria-pressed"):null;
  });
  p(stand==="true","der in der Werkstatt gesetzte Haken steht auch hier",stand);
 }

 console.log("\nC2 · Bereits gesetzte Haken stehen beim Oeffnen da");
 // Beim ersten Zeichnen sind die Haken noch nicht geladen - sie kommen erst
 // aus der Datenbank nach. Ohne Nachziehen stuende hier dauerhaft 0 von 3.
 await vorbereiten(page,MODULE,[
  {id:901,measurement_id:11,stueck_nr:1,erledigt:true,laenge_mm:1200,breite_mm:250},
  {id:902,measurement_id:11,stueck_nr:2,erledigt:true,laenge_mm:700,breite_mm:250}
 ]);
 if(await werkstattAuf(page)){
  await page.waitForTimeout(500);
  const v=await page.evaluate(()=>{
   const box=$("werkstattBody");
   const k=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]');
   return {text:box?box.innerText:"", gedrueckt:k?k.getAttribute("aria-pressed"):null};
  });
  p(/2 von 3 zugeschnitten/.test(v.text),"der Stand der Karte kommt aus der Datenbank",v.text.slice(0,240));
  p(/2 von 4 Stück zugeschnitten/.test(v.text),"und der Gesamtstand ebenfalls",v.text.slice(0,200));
  p(v.gedrueckt==="true","der Knopf ist gedrueckt gezeichnet",v.gedrueckt);
 }

 console.log("\nD · Reservierungen: nur was man aus dem Lager holt");
 await vorbereiten(page,MODULE,[]);
 if(await mehrAuf(page)){
  const r=await page.evaluate(()=>{
   const blk=document.querySelector('[data-werk-block="reservieren"]');
   return {text:blk?blk.innerText:"",
     zeilen:blk?blk.querySelectorAll("tbody tr").length:0};
  });
  p(r.zeilen===2,"nur die zwei Zeilen, die man wirklich holt",r);
  p(/Zuschnitt/.test(r.text)&&/Haltebleche/.test(r.text),"Zuschnitt und Halbfabrikat stehen da",r.text.slice(0,200));
  p(!/Abwicklung 250/.test(r.text)&&!/Blechfl/.test(r.text),
    "Abwicklung und Blechflaeche nicht",r.text.slice(0,300));
  p(/2 abgeleitete Zeilen/.test(r.text)&&/weggelassen/.test(r.text),
    "und es steht ehrlich da, dass zwei weggelassen sind",r.text.slice(0,400));
 }

 console.log("\nE · Modul aus: nichts davon");
 await vorbereiten(page,{haupt:true,werkstatt:true,material:true,reservierung:true},[]);
 if(await werkstattAuf(page)){
  const aus=await page.evaluate(()=>({
   knoepfe:document.querySelectorAll("#werkstattBody [data-ze-nr]").length,
   zuKnopf:!!document.querySelector('#werkstattBody [data-werk-mess][data-werk-zu]')
  }));
  p(!aus.knoepfe&&!aus.zuKnopf,"ohne das Zuschnittmodul weder Liste noch Knopf",aus);
 }

 console.log("\nF · Breiten");
 await vorbereiten(page,MODULE,[]);
 if(await mehrAuf(page)){
  for(const w of [320,390,412,768]){
   await page.setViewportSize({width:w,height:900});
   await page.waitForTimeout(250);
   const u=await page.evaluate(()=>{
    const box=$("werkstattBody"); if(!box)return {ueber:0};
    const r=box.getBoundingClientRect(); let ueber=0;
    box.querySelectorAll("*").forEach(e=>{
     // .mw-leiste (Fortschritt) scrollt bewusst seitwaerts - CLAUDE.md 115.4
     if(e.closest(".scroll")||e.closest(".ra-registerleiste")||e.closest(".mw-leiste"))return;
     const x=e.getBoundingClientRect();
     if(x.width&&x.right>r.right+1)ueber++;
    });
    return {ueber,seite:document.documentElement.scrollWidth>window.innerWidth+1};
   });
   p(u.ueber===0&&!u.seite,"Breite "+w+" px: nichts laeuft hinaus",u);
  }
  await page.setViewportSize({width:412,height:900});
 }

 console.log("\nH · v3.21: der Umbau selbst");
 await vorbereiten(page,MODULE,[]);
 if(await werkstattAuf(page)){
  const h=await page.evaluate(()=>{
   const box=$("werkstattBody");
   // Die Abfrage der Werkstatt MUSS data enthalten - sonst kann keine Zeile
   // ihren Zuschnittstand kennen und die Liste bliebe leer.
   const abf=(window.__ruf||[]).filter(x=>x.tabelle==="measurements"&&x.op==="select");
   return {
    kartenKlasse:document.querySelectorAll("#werkstattBody .werk-karte").length,
    alteKarte:document.querySelectorAll(".werk-zu-karte, .werk-zeile").length,
    mehrKnopf:!!document.querySelector('[data-werk-auf]'),
    grundlageZu:!document.querySelector(".werk-grundlage"),
    hatData:null,
    streifen:(document.querySelector(".mw-streifen-satz")||{}).textContent||"",
    text:box?box.innerText:""};
  });
  p(h.kartenKlasse===2&&h.alteKarte===0,"eine Darstellung je Massaufnahme, nicht zwei",h);
  // Der Stub liefert data unabhaengig vom select() mit - eine Messung an
  // werkZeilen waere hier wertlos. Geprueft wird der Quelltext.
  p(/created_by,data"\)/.test(QUELLE51),
    "die Werkstatt-Abfrage laedt data - sonst bliebe die Liste leer",
    (QUELLE51.match(/\.select\("id,project_id[^)]*\)/)||[""])[0].slice(0,200));
  p(h.mehrKnopf&&h.grundlageZu,"Material und Reservierungen liegen zugeklappt darunter",h);
  p(/0 von 4 Stück geschnitten/.test(h.streifen),
    "der naechste Schritt nennt die Stuecke, nicht die Materialpositionen",h.streifen);
  // Alles geschnitten -> die Liste klappt zu, laesst sich aber wieder oeffnen.
  const f=await page.evaluate(async()=>{
   const alle=[1,2,3].map(n=>({id:900+n,measurement_id:11,stueck_nr:n,erledigt:true,
     laenge_mm:[1200,700,2000][n-1],breite_mm:250}));
   window.__db.ze=alle; if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
   await werkstattNeuLaden(); await new Promise(r=>setTimeout(r,400));
   const k=[...document.querySelectorAll(".werk-karte")].find(x=>/Einlaufblech/.test(x.innerText));
   const auf=k?k.querySelector("[data-werk-karte]"):null;
   const vor={zu:!!auf, knoepfe:k?k.querySelectorAll("[data-ze-nr]").length:-1,
     stand:k?(k.querySelector("[data-werk-zu-stand]")||{}).textContent||"":""};
   if(auf){auf.click();await new Promise(r=>setTimeout(r,300))}
   const k2=[...document.querySelectorAll(".werk-karte")].find(x=>/Einlaufblech/.test(x.innerText));
   return {...vor, nachher:k2?k2.querySelectorAll("[data-ze-nr]").length:-1};
  });
  p(f.zu&&f.knoepfe===0,"eine fertig geschnittene Karte klappt ihre Liste zu",f);
  p(/3 von 3 zugeschnitten/.test(f.stand),"der Stand steht trotzdem da",f.stand);
  p(f.nachher===3,"ein Tipp klappt sie wieder auf - es geht nichts verloren",f);
  // Und der Fall, der an der Abkantbank wehtut: das LETZTE Stueck abhaken.
  // Die Liste muss stehen bleiben - sonst spraenge sie unter dem Finger weg
  // und ein versehentlicher Haken waere nur ueber einen Extraklick zurueck.
  const l=await page.evaluate(async()=>{
   window.__db.ze=[{id:951,measurement_id:11,stueck_nr:1,erledigt:true,laenge_mm:1200,breite_mm:250},
                   {id:952,measurement_id:11,stueck_nr:2,erledigt:true,laenge_mm:700,breite_mm:250}];
   if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
   await werkstattOeffnen(); await new Promise(r=>setTimeout(r,600));
   const k=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="3"]');
   if(!k)return {fehlt:true};
   k.click(); await new Promise(r=>setTimeout(r,600));
   const karte=[...document.querySelectorAll(".werk-karte")].find(x=>/Einlaufblech/.test(x.innerText));
   return {knoepfe:karte?karte.querySelectorAll("[data-ze-nr]").length:-1,
     stand:karte?(karte.querySelector("[data-werk-zu-stand]")||{}).textContent||"":""};
  });
  p(!l.fehlt&&l.knoepfe===3,"das letzte Stueck abhaken laesst die Liste stehen",l);
  p(/3 von 3 zugeschnitten/.test(l.stand||""),"und der Stand ist danach vollstaendig",l.stand);
 }

 console.log("\nG · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 console.log("\n"+(ok+fail?ok+"/"+(ok+fail):"0")+"  "+(fail?fail+" FEHLGESCHLAGEN":"alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH",e);process.exit(2)});
