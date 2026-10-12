// Prueft v3.336: Das Projekt-Rüstblatt sitzt in der WERKSTATT (Knopf "Rüstliste" am Projekt): dort werden die Massaufnahmen
// ausgewaehlt. Abgeschlossene Massaufnahmen kommen nicht vor, bereits abgehakte Stuecke sind abgehakt (App und Druck),
// im Projekt-Zuschnitt (Cockpit) steht der Rüstblatt-Knopf nicht mehr. Nichts wird geschrieben.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-ruestblatt-auswahl-v3-336.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
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
  // v3.218: Der Einstieg in die Werkstatt ist der Eintrag in der Leiste
  // unten - der grosse Knopf auf dem klassischen Startbildschirm ist weg.
  // Die Leiste muss also gezeichnet sein. Bewusst auf der Seite "Mehr":
  // die Seite "Heute" holt sich selbst die Werkstattzahlen, und mehrere
  // dieser Pruefstaende zaehlen die Abfragen mit. Die Leiste ist auf jeder
  // Seite dieselbe.
  if(typeof a2Zustand!=="undefined")a2Zustand.seite="mehr";
  if(typeof a2Zeichnen==="function")a2Zeichnen();
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

const MESS3=MESS.concat([{id:13,project_id:7,type:"einlaufblech_gerade",title:"Dach Süd",date:"2026-09-03",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T12:00:00Z",created_by:ICH,
  data:{material:2,abwicklung:250,massA:120,winkel:30,montage:"links",
   pieces:[{laenge:900,stossStoss:900,gehrungLinks:false,gehrungRechts:false,winkel:0}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:900}]}],optimal:true}}}]);
(async()=>{
 const br=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await br.newPage({viewport:{width:1100,height:1400}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>{console.log("DIALOG",d.message().slice(0,300));d.accept()});page.on("console",m=>{if(m.type()==="error")console.log("CONSOLE",m.text().slice(0,200))});
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.evaluate(()=>{if(typeof a2Zeichnen==="function")a2Zeichnen()});
 await page.waitForTimeout(500);
 const ZE=[{id:1,company_id:"c1",measurement_id:11,stueck_nr:1,erledigt:true,laenge_mm:1200,breite_mm:250}];
 // vorbereiten ist in dieser Datei als Funktion definiert
 await vorbereiten(page,MODULE,ZE);
 await page.evaluate(m=>{window.__db.mess=JSON.parse(JSON.stringify(m))},MESS3);
 await page.evaluate(async()=>{await werkLaden();});
 if(!await klick(page,'#a2Leiste [data-a2-tab="werkstatt"]',"Werkstatt-Knopf")){await br.close();process.exit(1)}
 await page.waitForTimeout(600);
 await page.evaluate(()=>{if(typeof werkZuBlock!=="undefined"){werkZuBlock.clear();renderWerkstatt()}});
 await page.waitForTimeout(200);

 console.log("\nA · Knopf in der Werkstatt öffnet die Auswahl");
 p(await sichtbar(page,"#werkstattBody [data-werk-druck]"),"Projektkopf der Werkstatt hat den Rüstlisten-Knopf");
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,"#werkstattBody [data-werk-druck]","Rüstliste im Projekt");
 await page.waitForTimeout(700);
 let t=await page.evaluate(()=>({offen:!$("ruestblattModal").hidden,t:$("ruestblattBody").textContent.replace(/\s+/g," "),
   cb:[...document.querySelectorAll("#ruestblattBody [data-rbp-auswahl]")].map(c=>[c.dataset.rbpAuswahl,c.checked]),
   tools:["alle","keine","erstellen"].map(k=>!!document.querySelector("#ruestblattBody [data-rbp-"+k+"]"))}));
 p(t.offen&&/Massaufnahmen für das Rüstblatt/.test(t.t)&&/3 von 3 ausgewählt/.test(t.t),"Rüstblatt-Schirm mit Auswahl, alle 3 vorausgewählt",t.t.slice(0,200));
 p(t.cb.length===3&&t.cb.every(x=>x[1]),"je Massaufnahme eine Checkbox",t.cb);
 p(t.tools.every(Boolean),"Alle auswählen / Auswahl aufheben / Rüstblatt erstellen-aktualisieren vorhanden");
 p(/Titanzink/.test(t.t)&&/Kupfer/.test(t.t)&&/Dach Nord/.test(t.t)&&/Kehle West/.test(t.t)&&/zugeschnitten/.test(t.t),"Titel, Material und Stand je Massaufnahme",t.t.slice(0,500));
 p(/Projekt-Rüstblatt/.test(t.t)&&/Gemeinsamer Zuschnitt/.test(t.t),"gemeinsamer Zuschnitt (Vorschau) erscheint");
 const wr=await page.evaluate(()=>window.__ruf.filter(r=>r.op&&r.op!=="select"));
 p(wr.length===0,"Öffnen schreibt nichts",wr);

 console.log("\nB · Auswahl");
 await page.evaluate(()=>{document.querySelector('#ruestblattBody [data-rbp-auswahl="12"]').click()});
 let t2=await page.evaluate(()=>({t:$("ruestblattBody").textContent.replace(/\s+/g," "),modus:rbProjektModus.liste.map(m=>m.id)}));
 p(/2 von 3 ausgewählt/.test(t2.t)&&/tippen/.test(t2.t)&&t2.modus.length===3,"Abwählen: Zähler ändert sich, Blatt wird erst bei „erstellen/aktualisieren“ neu gerechnet",t2);
 await page.evaluate(()=>{document.querySelector("#ruestblattBody [data-rbp-erstellen]").click()});
 t2=await page.evaluate(()=>({t:$("ruestblattBody").textContent.replace(/\s+/g," "),modus:rbProjektModus.liste.map(m=>m.id).sort(),einzel:document.querySelectorAll("#ruestblattBody details.rb-einzel").length}));
 p(JSON.stringify(t2.modus)==="[11,13]"&&t2.einzel===2&&!/Kehle West/.test(t2.t.split("Einzelne")[1])&&!/Gemeinsamer Zuschnitt · Kupfer/.test(t2.t),"aktualisieren: nur die 2 ausgewählten (11, 13); Kehle West/Kupfer nicht im Blatt",t2.modus);
 p(await page.evaluate(()=>/aktualisiert \d\d:\d\d/.test(document.querySelector("#rbpErgebnis .rb-kopf").textContent)),"„erstellen/aktualisieren“ zeigt sichtbar, dass aktualisiert wurde (und springt zum Blatt)");
 await page.evaluate(()=>{document.querySelector("#ruestblattBody [data-rbp-keine]").click()});
 t2=await page.evaluate(()=>({t:$("ruestblattBody").textContent.replace(/\s+/g," "),n:rbProjektModus.liste.length}));
 p(t2.n===0&&/0 von 3 ausgewählt/.test(t2.t)&&/Keine Massaufnahme ausgewählt/.test(t2.t),"Auswahl aufheben: leer, klare Meldung",t2.t.slice(0,200));
 await page.evaluate(()=>{document.querySelector("#ruestblattBody [data-rbp-alle]").click()});
 t2=await page.evaluate(()=>rbProjektModus.liste.length);
 p(t2===3,"Alle auswählen: 3");
 const wr2=await page.evaluate(()=>window.__ruf.filter(r=>r.op&&r.op!=="select"));
 p(wr2.length===0,"Auswahl wird nicht gespeichert (keine Schreibzugriffe, keine Ausschlussliste)",wr2);

 console.log("\nC · Abgeschlossene kommen nicht vor");
 const ab=await page.evaluate(async()=>{
  rbZu();
  const l=JSON.parse(JSON.stringify(window.__db.mess));
  l[2].workflow_status="abgeschlossen";
  const alt=sb.from;
  sb.from=(t)=>t==="measurements"?{select:()=>({in:async()=>({data:l,error:null})})}:alt(t);
  await rbProjektOeffnen(l,{projectId:7});
  sb.from=alt;
  werkZeilen.forEach(z=>{if(z.id===13)z.workflow_status="zu_ruesten"});   // der frische Lesevorgang hat den Zwischenspeicher überschrieben
  return {ids:rbProjektAuswahl.alle.map(m=>m.id).sort(),t:$("ruestblattBody").textContent.replace(/\s+/g," ")};
 });
 p(JSON.stringify(ab.ids)==="[11,12]"&&!/Dach Süd/.test(ab.t)&&/abgeschlossene Massaufnahme nicht aufgeführt/.test(ab.t),"abgeschlossene Massaufnahme fehlt in Auswahl und Blatt, mit Hinweis",ab.ids);
 const raus=await page.evaluate(()=>{
  const l=JSON.parse(JSON.stringify(window.__db.mess));l[0].workflow_status="abgeschlossen";l[1].archived=true;
  return {sammeln:pzuProjektRuestblattHtml(l).html.length,ruestbar:l.map(m=>pzuRuestbar(m))};
 });
 p(JSON.stringify(raus.ruestbar)==="[false,false,true]"&&raus.sammeln>0,"pzuRuestbar: abgeschlossen und archiviert raus, offene bleibt; gemeinsamer Plan nur aus offenen",raus);
 const nurAb=await page.evaluate(()=>{
  const l=JSON.parse(JSON.stringify(window.__db.mess)).map(m=>Object.assign(m,{workflow_status:"abgeschlossen"}));
  return pzuProjektRuestblattHtml(l).gruppen;
 });
 p(nurAb===0,"nur abgeschlossene: gemeinsamer Plan leer",nurAb);

 console.log("\nD · Bereits abgehakte Stücke sind abgehakt");
 await page.evaluate(()=>{rbZu()});
 await klick(page,"#werkstattBody [data-werk-druck]","Rüstliste im Projekt");
 await page.waitForTimeout(700);
 const hk=await page.evaluate(()=>{
  const gr=[...document.querySelectorAll("#ruestblattBody .pzu-rb-gruppe")].find(g=>/Titanzink/.test(g.textContent));
  const sp=[...gr.querySelectorAll(".zu-abschnitt .zu-nr-hak, .pzu-erledigt .zu-nr-ist")];
  return {n:sp.length,ok:sp.filter(s=>s.classList.contains("ze-ok")).map(s=>s.textContent),
   stand:"",
   einzel:[...document.querySelectorAll("#ruestblattBody details.rb-einzel [data-ze-meas='11'].ze-ok")].map(b=>b.dataset.zeNr),
   all:gr.textContent.replace(/\s+/g," ")};
 });
 p(hk.n>=3,"gemeinsamer Plan zeigt die Stücke der Gruppe",hk);
 p(hk.ok.length===1&&/Bereits abgehakt: 1 von 4 Stück/.test(hk.all),"genau das abgehakte Stück (Dach Nord, Nr 1) ist abgehakt; Stand 1 von 4",hk);
 p(JSON.stringify(hk.einzel)==='["1"]',"auch im Einzel-Rüstblatt dieselbe Massaufnahme abgehakt",hk.einzel);
 // Stueck aus anderer Massaufnahme mit gleicher Nummer bleibt offen
 const kreuz=await page.evaluate(()=>{
  const gr=[...document.querySelectorAll("#ruestblattBody .pzu-rb-gruppe")].find(g=>/Titanzink/.test(g.textContent));
  const sp=[...gr.querySelectorAll(".zu-abschnitt .zu-nr-hak, .pzu-erledigt .zu-nr-ist")];
  return sp.map(s=>s.textContent+":"+(s.classList.contains("ze-ok")?"x":"o")).join(" ");
 });
 p(/1:x/.test(kreuz)&&(kreuz.match(/1:o/g)||[]).length===1,"Stück Nr 1 aus Dach Süd (andere Massaufnahme, gleiche Nummer) bleibt offen",kreuz);
 // Druck
 const druck=await page.evaluate(async()=>{
  const ms=rbProjektGewaehlt();
  await zeLaden(ms.map(m=>m.id),true);
  const h=await rbDokumentHtml(ms,{gemeinsam:pzuProjektRuestblattHtml(ms).html});
  return {ist:(h.match(/zu-nr-ist ze-ok/g)||[]).length,hak:(h.match(/zu-nr zu-nr-hak ze-ok/g)||[]).length,css:/\.zu-nr\.ze-ok\{/.test(h)};
 });
 p(druck.ist===1&&druck.hak===1&&druck.css,"Druck: abgehakt im gemeinsamen Plan (1) und im Einzelblatt (1), mit Druck-Stil",druck);
 await page.evaluate(()=>{rbProjektAuswahl.alle.length&&0;});

 console.log("\nE · Projekt-Zuschnitt (Cockpit) ohne Rüstblatt-Knopf, Rüstliste ohne Abgeschlossene");
 const q49=require("fs").readFileSync("js/49-projekt-zuschnitt.js","utf8");
 p(!/data-pzu-ruestblatt/.test(q49),"Projekt-Zuschnitt enthält den Rüstblatt-Knopf nicht mehr");
 p(/pzuRuestbar\(m\)&&\(typeof pmatPlanFuer/.test(q49)&&/pzuHatPlan\(m\)&&pzuRuestbar\(m\)/.test(q49),"Rüstliste des Projekts (Cockpit) lässt Abgeschlossene weg");
 const q51=QUELLE51;
 p(/rbProjektOeffnen\(g\.aufnahmen/.test(q51)&&/workflow_status!=="abgeschlossen"/.test(q51),"Werkstatt-Knopf ruft die Auswahl; Rückfall-Weg ohne Abgeschlossene");
 const q80=require("fs").readFileSync("js/80-ruestblatt.js","utf8");
 const blk=q80.slice(q80.indexOf("async function rbProjektOeffnen"),q80.indexOf("function rbZu()"));
 p(!/\.insert\(|\.update\(|\.upsert\(|\.rpc\(|sb\.from\([^)]*\)\.delete/.test(blk)&&!/zuschnitt_ausschluss|pzuAuswahlSpeichern/.test(blk),"Projekt-Rüstblatt schreibt nichts und speichert die Auswahl nicht");
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await br.close();
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
