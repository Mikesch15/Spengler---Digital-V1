// Prueft die drei Neuerungen von v3.23:
//
//   A  RUESTLISTE ZUM DRUCKEN - je Projekt UND je einzelner Massaufnahme,
//      mit Kaestchen zum Abhaken von Hand. Kein zweiter Druckweg: derselbe
//      Kopf (pdfKopfHtml), dasselbe Stylesheet (PDF_LAYOUT_CSS), dasselbe
//      Fenster (pdfDruckVorbereiten). Nichts wird neu gerechnet.
//   B  ABHAKEN OHNE VERBINDUNG - der Haken wandert in die Warteschlange
//      (js/43) statt abgelehnt zu werden, erscheint sofort als wartend und
//      wird beim Senden gegen den JETZIGEN Plan geprueft (Beleg aus v3.15).
//   C  DIE VIER KLEINIGKEITEN - "Ruesten bestaetigen" unter der fertigen
//      Liste, wer/wann am Haken, gebuendelter Verlauf, gemerkter Filter.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ruestliste-offline-v3-23.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const Q51=fs.readFileSync("js/51-werkstatt.js","utf8");
const Q56=fs.readFileSync("js/56-material-zuschnitt.js","utf8");
const Q58=fs.readFileSync("js/58-ruestliste.js","utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,420):""))}};

// Supabase-Attrappe: protokolliert JEDEN Aufruf. window.open wird ersetzt,
// damit der erzeugte Ausdruck lesbar ist statt in einem echten Fenster zu
// verschwinden.
const STUB=`window.__ruf=[];
window.__druck=[];
window.__open=window.open;
// Jedes geoeffnete Fenster bekommt GENAU EINEN Platz. print() schreibt
// bewusst nichts: die Druckfunktionen rufen es zweimal (onload und nach
// 800 ms), und ein spaeter Aufruf wuerde sonst in einen bereits geleerten
// Speicher schreiben und den vorigen Ausdruck vortaeuschen.
window.open=function(){
 const merker=window.__druck.length;
 window.__druck.push("");
 const d={geschrieben:"",write(h){this.geschrieben+=h;window.__druck[merker]=this.geschrieben},
   close(){window.__druck[merker]=this.geschrieben}};
 return {document:d,focus(){},print(){},set onload(f){}};
};
window.__db={mess:[],res:[],ze:[],fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.upsert=(w,o)=>{st.op='upsert';st.werte=w;st.opt=o;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='measurements'?window.__db.mess:
               (name==='material_reservierungen'?window.__db.res:
               (name==='zuschnitt_erledigt'?window.__db.ze:[]));
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.map(String).indexOf(String(r[k]))>=0:String(r[k])===String(v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),
    werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null,opt:st.opt||null});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  if(st.op==='upsert'){
   const raus=[];
   (Array.isArray(st.werte)?st.werte:[st.werte]).forEach(w=>{
    const i=window.__db.ze.findIndex(x=>Number(x.measurement_id)===Number(w.measurement_id)
      &&Number(x.stueck_nr)===Number(w.stueck_nr));
    const z=Object.assign({id:900+window.__db.ze.length,company_id:'c1',
      created_by:'aaaa1111-1111-1111-1111-111111111111',
      updated_by:'aaaa1111-1111-1111-1111-111111111111',
      updated_at:'2026-09-07T08:14:00Z'},w);
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
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});
   return {data:{id:(a&&a.p_id)||0,workflow_status:'geruestet'},error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const ANDERER="bbbb2222-2222-2222-2222-222222222222";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
const OHNE_ZU={haupt:true,material:true,zuschnitt:false,reservierung:true,werkstatt:true};

// Projekt 7: Einlaufblech mit drei Zuschnitten (1200/700/2000), Kehle mit einem.
const MESS=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,
  data:{material:2,abwicklung:250,
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]},
                     {rest:0,stuecke:[{nr:3,laenge:2000}]}],optimal:true}}},
 {id:12,project_id:7,type:"kehle",title:"Kehle West",date:"2026-09-02",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T11:00:00Z",created_by:ICH,
  data:{material:3,abwicklung:500,
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}}
];
const RES=[
 {id:301,project_id:7,measurement_id:11,material_name:"Titanzink",bezeichnung:"Zuschnitt",
  menge:3,einheit:"Stk",status:"reserviert",breite_mm:250,laenge_mm:1200}
];

const vorbereiten=async(page,module,ze,mess)=>{
 await page.evaluate(([m,res,zeR,mod,ich,anderer])=>{
  currentProfile={id:ich,role:"admin",first_name:"Peter",last_name:"Test",company_id:"c1"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"},
               {id:anderer,first_name:"Bruno",last_name:"Ruester"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",
    order_no:"2026-1",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=[]; companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8\n3006 Bern";
  logoUrl="";
  window.__db.mess=JSON.parse(JSON.stringify(m));
  window.__db.res=JSON.parse(JSON.stringify(res));
  window.__db.ze=JSON.parse(JSON.stringify(zeR||[]));
  window.__db.fehler=null;
  pmUebernehmen(mod);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("projectCockpitModal").hidden=true;$("werkstattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle"; werkOffenKarte.clear();
  werkstattKnopfAktualisieren();
  window.__ruf=[]; window.__druck=[];
 },[mess||MESS,RES,ze,module,ICH,ANDERER]);
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
async function werkstattAuf(page){
 if(!await klick(page,"#navWerkstatt","Werkstatt-Knopf"))return false;
 await page.waitForTimeout(600);
 return true;
}
const druckHtml=(page)=>page.evaluate(()=>(window.__druck||[]).filter(x=>x&&x.length).slice(-1)[0]||"");

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 // =========================================================================
 console.log("\nA · Die Rüstliste zum Drucken");
 // =========================================================================
 await vorbereiten(page,MODULE,[]);
 p(await page.evaluate(()=>typeof ruestlisteProjekt==="function"
    &&typeof ruestlisteMassaufnahme==="function"),"das Rüstlisten-Modul ist geladen");
 // Gemessen, nicht im Quelltext gesucht: eine Zeichenkette steht auch in
 // einem Kommentar. Gezaehlt wird, was beim Drucken TATSAECHLICH gerufen wird.
 await page.evaluate(()=>{
  window.__gemeinsam={vorbereiten:0,kopf:0};
  const v=window.pdfDruckVorbereiten, k=window.pdfKopfHtml;
  window.pdfDruckVorbereiten=function(){window.__gemeinsam.vorbereiten++;return v.apply(this,arguments)};
  window.pdfKopfHtml=function(){window.__gemeinsam.kopf++;return k.apply(this,arguments)};
 });
 p(Q58.indexOf("ebaPackeInStreifen")<0&&Q58.indexOf("ebaVerteile")<0,
   "es rechnet NICHTS selbst - keine zweite Packrechnung");

 if(await werkstattAuf(page)){
  const knoepfe=await page.evaluate(()=>({
   projekt:document.querySelectorAll("#werkstattBody [data-werk-druck]").length,
   mess:[...document.querySelectorAll("#werkstattBody [data-werk-druck-mess]")]
     .map(x=>x.dataset.werkDruckMess)}));
  p(knoepfe.projekt===1,"im Projektkopf steht genau ein Rüstlisten-Knopf",knoepfe);
  p(knoepfe.mess.length===2,"und an jeder Massaufnahme-Karte einer",knoepfe);

  // --- Projekt-Rüstliste ---
  await klick(page,'[data-werk-druck]',"Rüstliste Projekt");
  await page.waitForTimeout(400);
  const d=await druckHtml(page);
  p(d.length>0,"ein Ausdruck entsteht",d.length);
  p(/RÜSTLISTE/.test(d),"der Kopf nennt den Dokumenttyp Rüstliste");
  p(/Musterstrasse 12, 3000 Bern/.test(d),"die Objektadresse steht als Haupttitel");
  p(/Peter Künzi AG/.test(d),"die Firma steht im Kopf");
  p(/Einlaufblech gerade · Dach Nord/.test(d)&&/Kehle · Kehle West/.test(d),
    "beide Massaufnahmen des Projekts stehen darauf");
  const kaesten=(d.match(/class="rl-box"/g)||[]).length;
  p(kaesten===4,"je Stück ein leeres Kästchen zum Abhaken von Hand",kaesten);
  const massZeile=(d.match(/<td class="rl-mass">[^<]*<b>([^<]*)<\/b>/)||[])[1]||"";
  p(/1.200 × 250 mm/.test(d)&&/2.000 × 500 mm/.test(d),
    "die Zuschnitte stehen als Länge × Breite",massZeile);
  p(/0 von 3 bereits zugeschnitten/.test(d),"der Stand je Massaufnahme steht darauf");
  p(!/NaN|undefined/.test(d),"kein NaN und kein undefined im Ausdruck");
  const gem=await page.evaluate(()=>window.__gemeinsam);
  p(gem.vorbereiten===1&&gem.kopf===1,
    "gedruckt wird über den gemeinsamen Weg - kein zweites Druckfenster, kein zweiter Kopf",gem);
  p(/PDF_LAYOUT/.test(d)||/@page/.test(d),
    "und mit dem gemeinsamen Stylesheet",d.slice(0,0));

  // --- Einzelne Massaufnahme ---
  await page.evaluate(()=>{window.__druck=[]});
  await klick(page,'[data-werk-druck-mess="11"]',"Rüstliste einzelne Massaufnahme");
  await page.waitForTimeout(400);
  const d2=await druckHtml(page);
  p(/Einlaufblech gerade · Dach Nord/.test(d2),"sie enthält die gewählte Massaufnahme");
  p(!/Kehle West/.test(d2),"und NUR diese - die zweite fehlt");
  p((d2.match(/class="rl-box"/g)||[]).length===3,"drei Kästchen, nicht vier",
    (d2.match(/class="rl-box"/g)||[]).length);
 }

 // --- Bereits abgehakte Stücke sind angekreuzt ---
 await vorbereiten(page,MODULE,[{id:901,measurement_id:11,stueck_nr:2,erledigt:true,
   laenge_mm:700,breite_mm:250,company_id:"c1"}]);
 if(await werkstattAuf(page)){
  await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__druck=[]});
  await klick(page,'[data-werk-druck-mess="11"]',"Rüstliste mit gesetztem Haken");
  await page.waitForTimeout(400);
  const d3=await druckHtml(page);
  p((d3.match(/class="rl-box rl-box-an"/g)||[]).length===1,"das abgehakte Stück ist angekreuzt gedruckt",
    (d3.match(/class="rl-box rl-box-an"/g)||[]).length);
  p(/1 von 3 bereits zugeschnitten/.test(d3),"und der Stand stimmt",d3.slice(0,60));
 }

 // --- Ohne das Abhak-Modul: ehrlicher Hinweis statt falscher Stand ---
 await vorbereiten(page,OHNE_ZU,[]);
 if(await werkstattAuf(page)){
  await page.evaluate(()=>{window.__druck=[]});
  await klick(page,'[data-werk-druck-mess="11"]',"Rüstliste ohne Abhak-Modul");
  await page.waitForTimeout(400);
  const d4=await druckHtml(page);
  p(/Das Abhaken in der App ist ausgeschaltet/.test(d4),
    "ohne das Modul sagt das Blatt ausdrücklich, dass es keinen Stand zeigt");
  p((d4.match(/class="rl-box rl-box-an"/g)||[]).length===0,"und kreuzt nichts an");
 }

 // =========================================================================
 console.log("\nB · Abhaken ohne Verbindung");
 // =========================================================================
 await vorbereiten(page,MODULE,[]);
 await page.evaluate(async()=>{await wsLeeren()});
 p(await page.evaluate(()=>typeof wsEinreihen==="function"),"die Warteschlange ist da");
 p(await page.evaluate(()=>wsTabelleErlaubt("zuschnitt_erledigt")),
   "zuschnitt_erledigt ist eine erlaubte Tabelle");
 p(Q56.indexOf("wsEinreihen")>=0,"js/56 reiht ein, statt abzusagen");

 // Offline: ein Tap auf eine Positionsnummer
 await page.evaluate(()=>{window.__offline=true;
   window.wsIstOffline=()=>true;});
 if(await werkstattAuf(page)){
  await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__ruf=[]});
  await klick(page,'#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]',"Positionsnummer 1");
  await page.waitForTimeout(500);
  const b1=await page.evaluate(async()=>{
   const l=await wsAlle();
   const knopf=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]');
   return {eintraege:l.map(e=>({tabelle:e.tabelle,art:e.art,schluessel:e.schluessel,
     payload:e.payload,titel:e.titel})),
     db:window.__ruf.filter(x=>x.tabelle==="zuschnitt_erledigt").length,
     gesetzt:!!knopf&&knopf.classList.contains("ze-ok"),
     wartet:!!knopf&&knopf.classList.contains("ze-wartet"),
     titel:knopf?knopf.title:""};
  });
  p(b1.eintraege.length===1,"genau ein Eintrag in der Warteschlange",b1.eintraege);
  p(b1.eintraege[0]&&b1.eintraege[0].tabelle==="zuschnitt_erledigt"
    &&b1.eintraege[0].art==="upsert","er schreibt als upsert auf zuschnitt_erledigt",b1.eintraege[0]);
  p(b1.db===0,"dabei wird KEIN Datenbank-Aufruf abgesetzt",b1.db);
  const pl=(b1.eintraege[0]||{}).payload||{};
  p(pl.measurement_id===11&&pl.stueck_nr===1&&pl.erledigt===true,
    "der Eintrag nennt Massaufnahme, Stück und Zustand",pl);
  p(pl.laenge_mm===1200&&pl.breite_mm===250,
    "der Beleg (Länge/Breite) reist mit - sonst liesse sich später nichts prüfen",pl);
  p(pl.company_id===undefined,"eine company_id schickt der Client NIE mit",pl);
  p(b1.gesetzt,"der Haken erscheint sofort");
  p(b1.wartet,"und ist als wartend gekennzeichnet");
  p(/wartet noch auf die Übertragung/.test(b1.titel),"der Hinweis sagt das auch im Klartext",b1.titel);

  // Zweimal tippen darf keinen zweiten Eintrag ergeben
  await klick(page,'#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]',"dieselbe Nummer erneut");
  await page.waitForTimeout(400);
  const b2=await page.evaluate(async()=>{
   const l=await wsAlle();
   return {n:l.length,erledigt:l.map(e=>e.payload.erledigt)};
  });
  p(b2.n===1,"zweimal tippen ergibt EINEN Eintrag, nicht zwei",b2);
  p(b2.erledigt[0]===false,"und er trägt den zuletzt gewählten Zustand",b2);
 }

 // --- Beim Senden: Beleg-Prüfung ---
 console.log("\nB2 · Beim Senden wird der Beleg geprüft");
 await page.evaluate(()=>{window.wsIstOffline=()=>false});
 const passt=await page.evaluate(async()=>{
  await wsLeeren(); window.__db.ze=[];
  await wsEinreihen({tabelle:"zuschnitt_erledigt",art:"upsert",
    schluessel:"zuschnitt_erledigt:11:1",
    payload:{measurement_id:11,stueck_nr:1,erledigt:true,laenge_mm:1200,breite_mm:250},
    titel:"Stück 1"});
  const b=await wsSynchronisieren();
  return {b,ze:window.__db.ze.map(x=>({nr:x.stueck_nr,e:x.erledigt})),
    rest:(await wsAlle()).length};
 });
 p(passt.b.gesendet===1&&passt.ze.length===1,"ein passender Haken wird übertragen",passt);
 p(passt.rest===0,"und verlässt die Warteschlange",passt.rest);

 const konflikt=await page.evaluate(async()=>{
  await wsLeeren(); window.__db.ze=[];
  // Stück 1 misst im Datensatz 1200 mm - der Haken behauptet 999 mm.
  await wsEinreihen({tabelle:"zuschnitt_erledigt",art:"upsert",
    schluessel:"zuschnitt_erledigt:11:1",
    payload:{measurement_id:11,stueck_nr:1,erledigt:true,laenge_mm:999,breite_mm:250},
    titel:"Stück 1"});
  const b=await wsSynchronisieren();
  const l=await wsAlle();
  return {b,ze:window.__db.ze.length,konflikt:l.length?!!l[0].konflikt:false,
    text:l.length&&l[0].konflikt?l[0].konflikt.text:""};
 });
 p(konflikt.b.konflikt===1,"ein Haken auf einem geänderten Zuschnitt wird zum Konflikt",konflikt.b);
 p(konflikt.ze===0,"und es wird NICHTS geschrieben",konflikt.ze);
 p(/anderes Mass/.test(konflikt.text||""),"der Grund steht dabei",konflikt.text);

 const weg=await page.evaluate(async()=>{
  await wsLeeren(); window.__db.ze=[];
  await wsEinreihen({tabelle:"zuschnitt_erledigt",art:"upsert",
    schluessel:"zuschnitt_erledigt:11:99",
    payload:{measurement_id:11,stueck_nr:99,erledigt:true,laenge_mm:100,breite_mm:250},
    titel:"Stück 99"});
  const b=await wsSynchronisieren();
  const l=await wsAlle();
  return {b,ze:window.__db.ze.length,text:l.length&&l[0].konflikt?l[0].konflikt.text:""};
 });
 p(weg.b.konflikt===1&&weg.ze===0,"ein Stück, das es nicht mehr gibt, wird nicht geschrieben",weg);
 p(/gibt es im jetzigen Zuschnitt nicht mehr/.test(weg.text||""),"auch hier steht der Grund",weg.text);

 const entschieden=await page.evaluate(async()=>{
  const l=await wsAlle();
  if(l.length){l[0].konfliktEntschieden=true;await wsLegen(l[0])}
  const b=await wsSynchronisieren();
  return {b,ze:window.__db.ze.length};
 });
 p(entschieden.b.gesendet===1&&entschieden.ze===1,
   "„Meine Fassung nehmen\" schreibt ihn dann doch",entschieden);

 // Der ganze Weg am Stueck: offline abhaken -> der Zuschnitt aendert sich ->
 // senden. Ohne den Beleg aus zeSetzen waere das ein stilles Ueberschreiben.
 const ende=await page.evaluate(async()=>{
  await wsLeeren(); window.__db.ze=[];
  window.wsIstOffline=()=>true;
  // Genau der Weg, den der Finger in der Werkstatt geht.
  const knopf=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]');
  if(!knopf)return {kein:true};
  knopf.click();
  await new Promise(r=>setTimeout(r,400));
  // Jetzt wird die Massaufnahme geaendert: Stueck 1 misst nur noch 999 mm.
  const m=window.__db.mess.find(x=>x.id===11);
  m.data.rollen.streifen[0].stuecke[0].laenge=999;
  window.wsIstOffline=()=>false;
  const b=await wsSynchronisieren();
  const l=await wsAlle();
  return {b,ze:window.__db.ze.length,
    text:l.length&&l[0].konflikt?l[0].konflikt.text:"",
    beleg:l.length?l[0].payload:null};
 });
 if(!ende.kein){
  p(ende.b.konflikt===1&&ende.ze===0,
    "der ganze Weg: offline abgehakt, Zuschnitt geändert, nichts überschrieben",ende);
  p(/anderes Mass/.test(ende.text||""),
    "die Person erfährt, dass sich das Mass geändert hat",ende.text);
 }

 // Und die Gegenrichtung: bleibt der Zuschnitt gleich, muss der Haken glatt
 // durchgehen. Nur mit einem echten Beleg kann die Pruefung das unterscheiden -
 // ohne ihn waere entweder alles ein Konflikt oder gar nichts.
 const glatt=await page.evaluate(async()=>{
  await wsLeeren(); window.__db.ze=[];
  const m=window.__db.mess.find(x=>x.id===11);
  m.data.rollen.streifen[0].stuecke[0].laenge=1200;
  window.wsIstOffline=()=>true;
  const knopf=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="2"]');
  if(!knopf)return {kein:true};
  knopf.click();
  await new Promise(r=>setTimeout(r,400));
  window.wsIstOffline=()=>false;
  const b=await wsSynchronisieren();
  return {b,ze:window.__db.ze.length,rest:(await wsAlle()).length};
 });
 if(!glatt.kein){
  p(glatt.b.gesendet===1&&glatt.ze===1&&glatt.rest===0,
    "ein unveränderter Zuschnitt geht ohne Rückfrage durch",glatt);
 }

 // =========================================================================
 console.log("\nC · Rüsten bestätigen unter der fertigen Liste");
 // =========================================================================
 await page.evaluate(async()=>{await wsLeeren()});
 // Alle drei Stücke der Massaufnahme 11 abgehakt
 const ALLE=[1,2,3].map((nr,i)=>({id:910+i,measurement_id:11,stueck_nr:nr,erledigt:true,
   laenge_mm:[1200,700,2000][i],breite_mm:250,company_id:"c1",
   updated_by:"aaaa1111-1111-1111-1111-111111111111",updated_at:"2026-09-07T08:14:00Z"}));
 await vorbereiten(page,MODULE,ALLE);
 if(await werkstattAuf(page)){
  await page.waitForTimeout(700);
  const c=await page.evaluate(()=>{
   const k=[...document.querySelectorAll("#werkstattBody .werk-karte")]
     .find(x=>x.innerText.indexOf("Dach Nord")>=0);
   const leiste=k?k.querySelector(".werk-fertig"):null;
   const knopf=leiste?leiste.querySelector("[data-aufgabe]"):null;
   return {leiste:!!leiste,text:leiste?leiste.innerText:"",
     aufgabe:knopf?knopf.dataset.aufgabe:null,id:knopf?knopf.dataset.aufgabeId:null,
     hoch:knopf?Math.round(knopf.getBoundingClientRect().height):0};
  });
  p(c.leiste,"unter der fertigen Liste steht eine Leiste",c);
  p(/Alle 3 Stück sind geschnitten/.test(c.text),"sie nennt die Zahl",c.text);
  p(c.aufgabe==="ruesten"&&c.id==="11","der Knopf ruft denselben Weg wie in der Kopfzeile",c);
  p(c.hoch>=42,"und ist gross genug für einen Finger",c.hoch);
 }

 // Ein anderer Rüster: kein Knopf, aber der Satz
 await vorbereiten(page,MODULE,ALLE,MESS.map(m=>m.id===11?{...m,ruester_id:ANDERER}:m));
 await page.evaluate(()=>{currentProfile.role="employee";meineRechte={admin:false}});
 if(await werkstattAuf(page)){
  await page.waitForTimeout(700);
  const c2=await page.evaluate(()=>{
   const k=[...document.querySelectorAll("#werkstattBody .werk-karte")]
     .find(x=>x.innerText.indexOf("Dach Nord")>=0);
   const leiste=k?k.querySelector(".werk-fertig"):null;
   return {leiste:!!leiste,knopf:!!(leiste&&leiste.querySelector("[data-aufgabe]")),
     text:leiste?leiste.innerText:""};
  });
  p(c2.leiste&&!c2.knopf,"wer nicht eingeteilt ist, sieht keinen Bestätigen-Knopf",c2);
  p(/Bruno Ruester/.test(c2.text),"sondern wer es bestätigen kann",c2.text);
 }
 await page.evaluate(()=>{currentProfile.role="admin";meineRechte={admin:true}});

 // Verfallene Freigabe: keine Leiste
 await vorbereiten(page,MODULE,ALLE,
   MESS.map(m=>m.id===11?{...m,freigabe_verfallen:true}:m));
 if(await werkstattAuf(page)){
  await page.waitForTimeout(700);
  const c3=await page.evaluate(()=>{
   const k=[...document.querySelectorAll("#werkstattBody .werk-karte")]
     .find(x=>x.innerText.indexOf("Dach Nord")>=0);
   return {leiste:!!(k&&k.querySelector(".werk-fertig"))};
  });
  p(!c3.leiste,"bei verfallener Freigabe steht dort NICHTS zu bestätigen",c3);
 }

 // =========================================================================
 console.log("\nD · Wer hat abgehakt");
 // =========================================================================
 await vorbereiten(page,MODULE,ALLE);
 if(await werkstattAuf(page)){
  await page.waitForTimeout(700);
  // Die Karte ist fertig und deshalb zugeklappt (v3.21) - erst aufklappen.
  await klick(page,'[data-werk-karte="11"]',"fertige Karte aufklappen");
  await page.waitForTimeout(600);
  const d=await page.evaluate(()=>{
   const k=document.querySelector('#werkstattBody [data-ze-meas="11"][data-ze-nr="1"]');
   return {titel:k?k.title:"",ok:!!k&&k.classList.contains("ze-ok")};
  });
  p(d.ok,"der Haken ist gesetzt");
  p(/Peter Test/.test(d.titel),"der Hinweis nennt, WER abgehakt hat",d.titel);
  p(/07\.09/.test(d.titel),"und WANN",d.titel);
  p(/zurück/.test(d.titel),"und dass ein zweiter Tipp ihn zurücknimmt",d.titel);
 }

 // =========================================================================
 console.log("\nE · Der Verlauf bündelt abgehakte Stücke");
 // =========================================================================
 const e=await page.evaluate(()=>{
  const roh=[];
  // 12 Stücke, dieselbe Person, dieselbe Massaufnahme, wenige Minuten
  for(let i=0;i<12;i++)roh.push({id:i+1,entity_type:"zuschnitt",entity_id:11,project_id:7,
    action:"created",user_id:"aaaa1111-1111-1111-1111-111111111111",
    description:"Stück "+(12-i)+" zugeschnitten",
    created_at:new Date(Date.parse("2026-09-07T08:30:00Z")-i*60000).toISOString()});
  // Dazwischen etwas anderes
  roh.push({id:99,entity_type:"measurement",entity_id:11,project_id:7,action:"updated",
    user_id:"aaaa1111-1111-1111-1111-111111111111",description:"Dach Nord",
    created_at:"2026-09-07T08:10:00Z"});
  // Und derselbe Benutzer viel spaeter
  roh.push({id:100,entity_type:"zuschnitt",entity_id:11,project_id:7,action:"created",
    user_id:"aaaa1111-1111-1111-1111-111111111111",description:"Stück 1 zugeschnitten",
    created_at:"2026-09-07T05:00:00Z"});
  // Eine ANDERE Massaufnahme
  roh.push({id:101,entity_type:"zuschnitt",entity_id:12,project_id:7,action:"created",
    user_id:"aaaa1111-1111-1111-1111-111111111111",description:"Stück 1 zugeschnitten",
    created_at:"2026-09-07T08:29:30Z"});
  const g=verlaufBuendeln(roh);
  return {n:g.length,
    erst:g[0]&&g[0]._buendel?g[0]._buendel.length:0,
    typen:g.map(x=>x.entity_type+":"+(x._buendel?x._buendel.length:1)),
    text:g[0]?verlaufEntryHtml(g[0],true):""};
 });
 p(e.erst===12,"zwölf Stücke werden zu einem Eintrag gebündelt",e);
 p(/12 Stücke zugeschnitten/.test(e.text),"der Text nennt die Anzahl",e.text.slice(0,220));
 p(/–/.test(e.text),"und die Zeitspanne",e.text.slice(0,220));
 p(e.typen.indexOf("measurement:1")>=0,
   "eine andere Aktion dazwischen bleibt eine eigene Zeile",e.typen);
 p(e.typen.filter(x=>x.startsWith("zuschnitt")).length===3,
   "andere Massaufnahme und späterer Zeitpunkt bleiben getrennt",e.typen);

 const eEinzeln=await page.evaluate(()=>{
  const roh=[{id:1,entity_type:"zuschnitt",entity_id:11,project_id:7,action:"created",
    user_id:"x",description:"Stück 1 zugeschnitten",created_at:"2026-09-07T08:30:00Z"}];
  const g=verlaufBuendeln(roh);
  return {text:verlaufEntryHtml(g[0],true)};
 });
 p(/Stück 1 zugeschnitten/.test(eEinzeln.text),
   "ein einzelnes Stück behält seinen eigenen Text",eEinzeln.text.slice(0,200));

 // =========================================================================
 console.log("\nF · Der Filter bleibt gemerkt");
 // =========================================================================
 await vorbereiten(page,MODULE,[]);
 if(await werkstattAuf(page)){
  await klick(page,'[data-werk-filter="meine"]',"Filter „Nur meine\"");
  await page.waitForTimeout(300);
  const f=await page.evaluate(()=>({gespeichert:localStorage.getItem("sd_werkFilter")}));
  p(f.gespeichert==="meine","der gewählte Filter wird auf dem Gerät gemerkt",f);
  // Werkstatt schliessen und neu oeffnen
  await page.evaluate(()=>{$("werkstattModal").hidden=true;$("startScreen").hidden=false});
  await werkstattAuf(page);
  await page.waitForTimeout(400);
  const f2=await page.evaluate(()=>({aktiv:werkFilter,
    chip:!!document.querySelector('[data-werk-filter="meine"].aktiv')}));
  p(f2.aktiv==="meine"&&f2.chip,"und beim nächsten Öffnen wieder gesetzt",f2);
  await page.evaluate(()=>{localStorage.removeItem("sd_werkFilter")});
 }

 // =========================================================================
 console.log("\nG · Bildschirmbreiten");
 // =========================================================================
 await vorbereiten(page,MODULE,ALLE);
 for(const w of [320,390,412,768]){
  await page.setViewportSize({width:w,height:900});
  await vorbereiten(page,MODULE,ALLE);
  if(!await werkstattAuf(page))continue;
  await page.waitForTimeout(500);
  const u=await page.evaluate(()=>{
   const raus=[];
   document.querySelectorAll("#werkstattBody *").forEach(el=>{
    if(el.closest(".mw-leiste"))return;      // scrollt bewusst seitwaerts
    if(el.closest(".scroll"))return;
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>window.innerWidth+1)
     raus.push((el.className||el.tagName)+" r="+Math.round(r.right));
   });
   return {ueber:raus.slice(0,4),scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(u.ueber.length===0&&!u.scroll,"bei "+w+" px läuft nichts aus dem Bild",u);
 }
 await page.setViewportSize({width:412,height:900});

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
