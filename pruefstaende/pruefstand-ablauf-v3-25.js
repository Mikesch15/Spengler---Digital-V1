// Prueft den Produktionsablauf Massaufnahme -> Freigabe -> Material & Zuschnitt
// -> Abhaken -> Werkstatt -> Ruestliste aus Sicht eines Mitarbeiters am
// Telefon (v3.25).
//
// Worum es geht - jede Pruefung haengt an einem gemessenen Befund:
//   1. Die Seite "Material & Zuschnitt" traegt ihre Zuschnittliste selbst und
//      laesst abhaken. Bis v3.24 hatte sie NULL Abhak-Knoepfe und schickte
//      einen ins Formular - vier Klicks fuer das erste Stueck, waehrend die
//      Werkstatt es nach einem zeigt.
//   2. Eine noch nicht freigegebene Massaufnahme sah dort aus wie eine
//      freigegebene. Jetzt steht der Arbeitsstatus da (derselbe Badge wie in
//      der Werkstatt) und ihre Liste bleibt zugeklappt.
//   3. Der Rueckweg fuehrt auf die Seite zurueck, nicht ins Cockpit.
//   4. Dieselbe Tatsache heisst ueberall "zugeschnitten" - nicht hier
//      "erledigt" und dort "zugeschnitten".
//   5. Ein Tap zeichnet die Seite NICHT neu (sonst spraenge die gerade
//      angetippte Nummer weg) und schreibt genau einmal, ohne company_id.
//   6. Die Ruestliste ist auch ohne Werkstattmodul erreichbar.
//   7. Die Rechnung fuer den gespeicherten Plan steht EINMAL da (js/48) -
//      sie war bis v3.24 in js/51 und js/58 byteweise doppelt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ablauf-v3-25.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"), fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}
  else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

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
  window.__ruf.push({tabelle:name,op:st.op||'select',
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
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:{id:(a&&a.p_id)||0,workflow_status:'zu_ruesten'},error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};

// Projekt 7: ein FREIGEGEBENES Einlaufblech (3 Zuschnitte) und eine Kehle,
// die noch IN BEARBEITUNG ist (1 Zuschnitt) - genau der Fall, den die Seite
// bis v3.24 nicht unterschieden hat.
const MESS=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:ICH,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,
  created_at:"2026-09-01T08:00:00Z",sketch_paths:[],photo_paths:[],
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Haltebleche (GAVA Blech)",menge:5,einheit:"Stk.",teil:true}],
   rollen:{abwicklung:250,streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]},
                                    {rest:0,stuecke:[{nr:3,laenge:2000}]}],optimal:true}}},
 {id:12,project_id:7,type:"kehle",title:"Kehle West",date:"2026-09-02",
  workflow_status:"in_bearbeitung",freigabe_verfallen:false,ruester_id:null,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T11:00:00Z",created_by:ICH,
  created_at:"2026-09-02T08:00:00Z",sketch_paths:[],photo_paths:[],
  data:{material:3,abwicklung:500,ausmass:[],
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}}
];
const RES=[{id:301,project_id:7,measurement_id:11,material_name:"Titanzink",bezeichnung:"Haltebleche (GAVA Blech)",
  menge:5,einheit:"Stk.",status:"reserviert",breite_mm:null,laenge_mm:null}];

const vorbereiten=async(page,mod)=>{
 await page.evaluate(([mess,res,m,ich])=>{
  currentProfile={id:ich,role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",
    order_no:"2026-1",customer:"Muster AG",status:"in_arbeit",archived:false,
    created_at:"2026-08-01T08:00:00Z"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true; reststuecke=[];
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  window.__db.res=JSON.parse(JSON.stringify(res));
  window.__db.ze=[]; window.__db.fehler=null;
  pmUebernehmen(m);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  if(typeof mzOffenKarte!=="undefined")mzOffenKarte.clear();
  projectMeasurementsCache=JSON.parse(JSON.stringify(mess));
  cockpitProjectId=7;
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  ["matZuModal","projectCockpitModal","measurementEditModal","werkstattModal","projectsModal"]
    .forEach(id=>{if($(id))$(id).hidden=true});
  werkOffen=null; werkGrundlage=null;
  try{localStorage.setItem("sd_werkFilter","alle")}catch(e){}
  if(typeof werkFilter!=="undefined")werkFilter="alle";
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  window.__ruf=[];
 },[MESS,RES,mod||MODULE,ICH]);
};
// §78: ein Klick, der haengt oder ins Leere geht, darf den Lauf nicht
// abbrechen - ein abgebrochener Lauf sieht aus wie "keine Fehler".
const klick=async(page,sel,was)=>{
 const da=await page.evaluate(s=>{const e=document.querySelector(s);
   if(!e)return false; const r=e.getBoundingClientRect();
   return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden"},sel);
 if(!da){p(false,(was||"Element")+" sichtbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,120));return false}
};
const seite=page=>page.evaluate(()=>({
 abhak:document.querySelectorAll("#matZuBody [data-ze-nr]").length,
 kennzahlen:[...document.querySelectorAll("#matZuKennzahlen .mz-kennzahl")]
   .map(x=>x.innerText.replace(/\s+/g," ").trim()),
 karten:[...document.querySelectorAll("#matZuBody .mz-karte")].map(k=>({
   titel:(k.querySelector(".mz-karte-titel")||{}).textContent||"",
   text:k.innerText.replace(/\s+/g," ").trim(),
   knoepfe:[...k.querySelectorAll("button")].map(x=>x.textContent.trim()).join(" | "),
   listeOffen:!!k.querySelector("[data-ze-nr]"),
   aufklappen:!!k.querySelector("[data-mz-karte]")})),
 text:($("matZuModal").innerText||"").replace(/\s+/g," ")
}));

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 // ---- A · Der Weg vom Projekt zum ersten Stueck --------------------------
 console.log("\nA · Vom Projekt zum ersten Stueck");
 await vorbereiten(page);
 let klicks=0;
 if(await klick(page,"#startOpenProjects","Projekte"))klicks++;
 await page.waitForTimeout(300);
 await page.evaluate(()=>openProjectCockpit(7)); klicks++;
 await page.waitForTimeout(500);
 await page.evaluate(()=>openMaterialZuschnitt(7)); klicks++;
 await page.waitForTimeout(800);
 let s=await seite(page);
 p(s.abhak===3,"die Seite traegt die Zuschnittliste selbst und laesst abhaken",s.abhak);
 p(klicks===3,"drei Klicks vom Startbildschirm bis zum ersten Stueck",klicks);
 const zuK=s.karten.filter(k=>/Einlaufblech|Kehle/.test(k.titel));
 p(zuK.length===2,"je Massaufnahme mit Zuschnitt eine Karte",zuK.map(k=>k.titel));

 // ---- B · Freigegeben oder nicht ----------------------------------------
 console.log("\nB · Freigegeben oder nicht - das muss man sehen");
 const frei=zuK.find(k=>/Einlaufblech/.test(k.titel));
 const noch=zuK.find(k=>/Kehle/.test(k.titel));
 p(!!frei&&/Zu rüsten/.test(frei.text),"die freigegebene Karte nennt ihren Arbeitsstatus",frei&&frei.text.slice(0,120));
 p(!!frei&&frei.listeOffen,"und zeigt ihre Liste offen",frei&&frei.listeOffen);
 p(!!noch&&/In Bearbeitung/.test(noch.text),"die noch nicht freigegebene nennt ihren auch",noch&&noch.text.slice(0,140));
 p(!!noch&&/Noch nicht freigegeben/.test(noch.text),
   "und sagt ausdruecklich, dass hier noch nichts geschnitten werden sollte",noch&&noch.text.slice(0,180));
 p(!!noch&&!noch.listeOffen&&noch.aufklappen,"ihre Liste bleibt zugeklappt, ist aber erreichbar",noch);
 // Erreichbar heisst: aufklappen geht wirklich.
 if(await klick(page,'[data-mz-karte="12"]',"Zuschnittliste zeigen")){
  await page.waitForTimeout(400);
  s=await seite(page);
  p(s.abhak===4,"aufgeklappt steht auch ihre Liste da",s.abhak);
 }

 // ---- C · Begriffe -------------------------------------------------------
 console.log("\nC · Dieselbe Tatsache, dasselbe Wort");
 await vorbereiten(page);
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(700);
 s=await seite(page);
 const woerter=await page.evaluate(()=>({
  karte:[...document.querySelectorAll("#matZuBody [data-mz-stand]")].map(x=>x.textContent),
  gruppe:[...document.querySelectorAll("#matZuBody [data-ze-stand]")].map(x=>x.textContent),
  cockpit:($("cockpitMatZuText")||{}).innerText||""
 }));
 p(s.kennzahlen.some(k=>/ZUGESCHNITTEN/i.test(k))&&!s.kennzahlen.some(k=>/ERLEDIGT/i.test(k)),
   "die Kennzahl heisst Zugeschnitten",s.kennzahlen);
 p(woerter.karte.every(t=>/zugeschnitten/.test(t))&&!woerter.karte.some(t=>/erledigt/.test(t)),
   "der Kartenstand auch",woerter.karte);
 p(woerter.gruppe.length>0&&woerter.gruppe.every(t=>/zugeschnitten/.test(t)),
   "und der Gruppenstand in der Liste",woerter.gruppe);
 p(/zugeschnitten/.test(woerter.cockpit)&&!/erledigt/.test(woerter.cockpit),
   "die Cockpit-Karte ebenso",woerter.cockpit.replace(/\s+/g," "));
 // Gegenprobe gegen das eigene Mass: die Werkstatt sagte es schon immer so.
 await page.evaluate(()=>{$("matZuModal").hidden=true});
 if(await klick(page,"#navWerkstatt","Werkstatt")){
  await page.waitForTimeout(900);
  const w=await page.evaluate(()=>[...document.querySelectorAll("#werkstattBody .werk-zu-text")]
    .map(x=>x.textContent.trim()));
  p(w.length>0&&w.every(t=>/zugeschnitten|Stück/.test(t)),"und die Werkstatt unveraendert",w);
 }

 // ---- D · Ein Tap --------------------------------------------------------
 console.log("\nD · Ein Tap - und die Seite springt nicht weg");
 await vorbereiten(page);
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(700);
 await page.evaluate(()=>{window.__ruf=[];
   const b=document.querySelector('#matZuBody [data-ze-nr="1"]'); if(b)b.dataset.probe="1"});
 if(await klick(page,'#matZuBody [data-ze-nr="1"]',"Positionsnummer")){
  await page.waitForTimeout(500);
  const t=await page.evaluate(()=>{
   const b=document.querySelector('#matZuBody [data-ze-nr="1"]');
   return {ruf:window.__ruf.filter(x=>x.op==="upsert"),
     ueberlebt:!!(b&&b.dataset.probe==="1"),
     an:!!(b&&b.classList.contains("ze-ok")),
     stand:[...document.querySelectorAll("#matZuBody [data-mz-stand]")].map(x=>x.textContent),
     kennz:[...document.querySelectorAll("#matZuKennzahlen .mz-kennzahl")]
       .map(x=>x.innerText.replace(/\s+/g," ").trim())};
  });
  p(t.ruf.length===1&&t.ruf[0].tabelle==="zuschnitt_erledigt","ein Tap schreibt genau einmal",t.ruf.length);
  const z0=(t.ruf[0]&&t.ruf[0].werte&&t.ruf[0].werte[0])||null;
  p(!!z0&&z0.company_id===undefined,"und OHNE company_id vom Client",z0);
  p(!!z0&&z0.laenge_mm>0&&z0.breite_mm===250,"die Masse reisen als Beleg mit",z0);
  p(t.ueberlebt,"die angetippte Nummer wird NICHT ersetzt - die Seite zeichnet sich nicht neu",t.ueberlebt);
  p(t.an,"sie ist danach markiert",t.an);
  p(t.stand.some(x=>/1 von 3 zugeschnitten/.test(x)),"der Kartenstand folgt an Ort und Stelle",t.stand);
  p(t.kennz.some(x=>/1 von 4/.test(x)),"die Kennzahl auch",t.kennz);
 }

 // ---- E · Der Rueckweg ---------------------------------------------------
 console.log("\nE · Der Rueckweg fuehrt dorthin zurueck, wo man war");
 await page.evaluate(()=>mzZuschnittOeffnen(11)); await page.waitForTimeout(600);
 let e=await page.evaluate(()=>({ziel:measEditReturnTo,formular:!$("measurementEditModal").hidden,
   register:typeof ebaSchritt!=="undefined"?ebaSchritt:null}));
 p(e.formular,"die Massaufnahme oeffnet sich",e);
 p(e.ziel==="matZu","das Rueckziel ist die Seite, nicht das Cockpit",e.ziel);
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;return measEditZurueck()});
 await page.waitForTimeout(700);
 e=await page.evaluate(()=>({seite:!$("matZuModal").hidden,
   abhak:document.querySelectorAll("#matZuBody [data-ze-nr]").length,
   ziel:measEditReturnTo}));
 p(e.seite&&e.abhak>0,"und man landet mit der Liste wieder dort",e);
 p(e.ziel==="measurementsModal","danach steht das Rueckziel wieder auf dem Normalweg",e.ziel);

 // ---- F · Die Ruestliste -------------------------------------------------
 console.log("\nF · Die Ruestliste ist auch ohne Werkstattmodul erreichbar");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:false});
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(700);
 let f=await page.evaluate(()=>({
   werkstattKnopf:$("navWerkstatt")?!$("navWerkstatt").hidden:null,
   projekt:document.querySelectorAll("#matZuModal [data-mz-druck-projekt]").length,
   jeKarte:document.querySelectorAll("#matZuModal [data-mz-druck]").length}));
 p(f.werkstattKnopf===false,"die Werkstatt ist aus",f);
 p(f.projekt===1&&f.jeKarte===2,"trotzdem gibt es die Ruestliste je Projekt und je Massaufnahme",f);
 // Sie druckt auch wirklich - ueber den bestehenden Einstieg aus js/58.
 await page.evaluate(()=>{window.__druck=[];
   const alt=ruestlisteMassaufnahme, alt2=ruestlisteProjekt;
   window.ruestlisteMassaufnahme=async m=>{window.__druck.push({art:"mess",id:m&&m.id})};
   window.ruestlisteProjekt=async(id,l)=>{window.__druck.push({art:"projekt",id,n:(l||[]).length})};
 });
 if(await klick(page,'[data-mz-druck="11"]',"Ruestliste der Massaufnahme")){
  await page.waitForTimeout(300);
  const d=await page.evaluate(()=>window.__druck);
  p(d.length===1&&d[0].art==="mess"&&Number(d[0].id)===11,"der Knopf druckt genau diese Massaufnahme",d);
 }
 if(await klick(page,'[data-mz-druck-projekt="1"]',"Ruestliste des Projekts")){
  await page.waitForTimeout(300);
  const d=await page.evaluate(()=>window.__druck);
  p(d.length===2&&d[1].art==="projekt"&&d[1].n===2,"und der andere das ganze Projekt",d);
 }

 // ---- G · Das Modul entscheidet weiterhin --------------------------------
 console.log("\nG · Der Modulschalter wird weiterhin respektiert");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:false,reservierung:false,werkstatt:false});
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(700);
 let g=await page.evaluate(()=>({
   abhak:document.querySelectorAll("#matZuBody [data-ze-nr]").length,
   hinweis:/Zuschnitt und Abhaken/.test($("matZuModal").innerText||""),
   karten:document.querySelectorAll("#matZuBody .mz-karte").length}));
 p(g.abhak===0,"ohne das Modul ist nichts abhakbar",g);
 p(g.hinweis,"und der Grund steht da, statt stiller Leere",g);
 await vorbereiten(page,{haupt:false});
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(400);
 g=await page.evaluate(()=>({offen:!$("matZuModal").hidden,karte:$("cockpitMatZuCard")?!$("cockpitMatZuCard").hidden:null}));
 p(!g.offen,"ganz ohne den erweiterten Ablauf gibt es die Seite nicht",g);

 // ---- H · Die Rechnung steht einmal da -----------------------------------
 console.log("\nH · Kein zweiter Plan-Bauer, keine zweite Rechnung");
 const t48=fs.readFileSync("js/48-projekt-material.js","utf8");
 const t51=fs.readFileSync("js/51-werkstatt.js","utf8");
 const t56=fs.readFileSync("js/56-material-zuschnitt.js","utf8");
 const t58=fs.readFileSync("js/58-ruestliste.js","utf8");
 p(/function pmatPlanFuer\(/.test(t48),"pmatPlanFuer steht in js/48");
 const zaehl=t=>(t.match(/zuPlanAusGespeichert\(/g)||[]).length;
 p(zaehl(t51)===0&&zaehl(t58)===0&&zaehl(t56)===0,
   "js/51, js/56 und js/58 rechnen den Plan nicht mehr selbst",
   {j51:zaehl(t51),j56:zaehl(t56),j58:zaehl(t58)});
 p(/pmatPlanFuer/.test(t51)&&/pmatPlanFuer/.test(t56)&&/pmatPlanFuer/.test(t58),
   "alle drei nutzen die eine Funktion");
 p(!/function\s+mz\w*Pack|ebaVerteile/.test(t56),"js/56 baut keine eigene Packrechnung");
 p(/zuListeHtml/.test(t56),"und zeichnet die Liste mit zuListeHtml aus js/33");
 // Der projektweite Sammelplan darf weiterhin NICHT abgehakt werden.
 await vorbereiten(page);
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(600);
 const sam=await page.evaluate(()=>{
  const g=pzuSammeln(projectMeasurementsCache);
  if(!g.materialien.length)return {leer:true};
  const pl=pzuPlan(g.materialien[0]);
  return {sammel:!!pl.sammel,html:/data-ze-nr/.test(zuschnittHtml(pl))};
 });
 p(sam.leer||(sam.sammel&&!sam.html),"im projektweiten Sammelplan wird weiterhin nicht abgehakt",sam);

 // ---- I · Breiten --------------------------------------------------------
 console.log("\nI · Telefon, Tablet, Schreibtisch");
 for(const br of [320,390,412,768,1280]){
  await page.setViewportSize({width:br,height:900});
  await page.evaluate(()=>mzAuffrischen()); await page.waitForTimeout(250);
  const u=await page.evaluate(()=>{
   const imRahmen=e=>{let x=e.parentElement;while(x){const cs=getComputedStyle(x);
     if(/auto|scroll/.test(cs.overflowX))return true;x=x.parentElement}return false};
   const raus=[];
   document.querySelectorAll("#matZuModal *").forEach(el=>{
    if(el.offsetParent===null)return;
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1&&!imRahmen(el))
     raus.push((el.id||el.className||el.tagName).toString().slice(0,40));
   });
   const kn=[...document.querySelectorAll("#matZuBody [data-ze-nr]")]
     .map(x=>{const r=x.getBoundingClientRect();return Math.min(r.width,r.height)});
   return {ueber:raus.slice(0,3),scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
           klein:kn.filter(v=>v<34).length};
  });
  p(u.ueber.length===0&&!u.scroll,br+" px: nichts laeuft aus dem Bild",u);
  p(u.klein===0,br+" px: die Trefferflaechen bleiben gross genug",u.klein);
 }

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
