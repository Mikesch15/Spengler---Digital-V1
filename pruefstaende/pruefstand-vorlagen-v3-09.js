// Prueft Vorlagen und Serienaufnahmen (v3.09):
//   - bei AUS gibt es keinen Knopf, keine Karte und keine Abfrage,
//   - eine Vorlage enthaelt NUR type und data - kein Projekt, keine
//     Bezeichnung, keine Notiz, kein Datum, keine Fotos, keinen Status,
//   - der Client schickt NIE eine company_id mit,
//   - gleicher Name und gleiche Art ueberschreibt statt zu verdoppeln,
//   - eine daraus erzeugte Massaufnahme ist eigenstaendig: keine
//     Verknuepfung zurueck, die Vorlage taucht im Payload nicht auf,
//   - eine Serie legt N eigenstaendige Zeilen an, jede mit eigener
//     Bezeichnung, alle ohne Arbeitsstatus (den setzt der Trigger),
//   - ein still blockiertes UPDATE/DELETE (0 Zeilen) gilt NICHT als Erfolg.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-vorlagen-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];
window.__db={vorlagen:[],messungen:[],naechste:200,blockiert:false,fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const schluessel=()=>name==='measurement_vorlagen'?'vorlagen':(name==='measurements'?'messungen':null);
 const quelle=()=>{const k=schluessel();return k?window.__db[k]:[]};
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:String(r[k])===String(v)));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),
                     werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  if(st.op==='insert'){
   if(window.__db.blockiert)return {data:[],error:null};
   const rows=(Array.isArray(st.werte)?st.werte:[st.werte]).map(w=>({
     id:window.__db.naechste++,company_id:'FIRMA-AUS-DER-DB',
     workflow_status:'in_bearbeitung',created_by:'AUS-DEM-TRIGGER',
     created_at:'2026-09-06T08:00:00Z',...w}));
   quelle().push(...rows); return {data:rows.map(r=>({...r})),error:null};
  }
  if(st.op==='update'){
   if(window.__db.blockiert)return {data:[],error:null};
   const treffer=quelle().filter(passt);
   treffer.forEach(r=>Object.assign(r,st.werte));
   return {data:treffer.map(r=>({...r})),error:null};
  }
  if(st.op==='delete'){
   if(window.__db.blockiert)return {data:[],error:null};
   const treffer=quelle().filter(passt).map(r=>({...r}));
   const k=schluessel();
   if(k)window.__db[k]=quelle().filter(r=>!passt(r));
   return {data:treffer,error:null};
  }
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:null,error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const vorbereiten=async(page,module,vorlagen)=>{
 await page.evaluate(([mod,vl])=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"},
               {id:99,name:"Anderes",object:"Andere Gasse 3"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  moduleImTest={};
  window.__db.vorlagen=JSON.parse(JSON.stringify(vl||[]));
  window.__db.messungen=[]; window.__db.naechste=200;
  window.__db.blockiert=false; window.__db.fehler=null;
  cockpitProjectId=7; projectMeasurementsCache=[];
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  ["settingsModal","measurementEditModal","projectCockpitModal","measTypeChooserModal",
   "vorlageSpeichernModal","vorlageWahlModal","serieModal"].forEach(i=>{if($(i))$(i).hidden=true});
  vorlageKnopfAktualisieren();
  window.__ruf=[];
 },[module,vorlagen]);
 await page.evaluate(()=>vorlagenNeuLaden());
 await page.waitForTimeout(60);
};

// Sichtbarkeit gemessen, nicht aus dem hidden-Attribut geschlossen: eine
// Klassenregel mit display wuerde [hidden] schlagen (CLAUDE.md 59).
// Die Bibliothek liegt in den Einstellungen: zum Messen muss der Dialog
// offen sein, sonst misst man nur seinen Elternteil.
const karteSichtbar=async page=>{
 await page.evaluate(()=>{$("settingsModal").hidden=false;
  const t=document.querySelector('[data-settings-panel="measurements"]'); if(t)t.hidden=false;
  const a=$("vorlagenKarte"); if(a)a.classList.add("open");
  if(typeof renderVorlagenListe==="function")renderVorlagenListe();});
 const r=await page.evaluate(()=>{
  const e=$("vorlagenKarte"); if(!e)return {da:false};
  const b=e.getBoundingClientRect(), st=getComputedStyle(e);
  return {da:true,hoehe:Math.round(b.height),display:st.display,
          sichtbar:st.display!=="none"&&b.height>0};
 });
 await page.evaluate(()=>{$("settingsModal").hidden=true});
 return r;
};

const sichtbar=(page,id)=>page.evaluate(i=>{
 const e=document.getElementById(i);
 if(!e)return {da:false};
 const r=e.getBoundingClientRect(), st=getComputedStyle(e);
 return {da:true,hoehe:Math.round(r.height),breite:Math.round(r.width),
         display:st.display,sichtbar:st.display!=="none"&&r.height>0};
},id);

const klick=async(page,wahl)=>{
 const ok=await page.evaluate(w=>{
  const e=document.querySelector(w);
  if(!e)return "fehlt";
  const r=e.getBoundingClientRect();
  if(getComputedStyle(e).display==="none"||r.height===0)return "unsichtbar";
  e.click(); return "ok";
 },wahl);
 await page.waitForTimeout(80);
 return ok;
};

const VORLAGEN=[
 {id:1,name:"Standardrinne",type:"rinne_halbrund",notiz:"Reihenhaus",
  data:{material:2,rinneAbwicklung:333,segments:[{laenge:4000}]},
  created_by:"aaaa1111-1111-1111-1111-111111111111",created_at:"2026-09-01T07:00:00Z"},
 {id:2,name:"Lukarne Nord",type:"lukarne",notiz:null,
  data:{material:3,hoehe:1500,laengeOben:4000,winkel:100,achsabstand:500},
  created_by:"aaaa1111-1111-1111-1111-111111111111",created_at:"2026-09-02T07:00:00Z"}
];

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 // ------------------------------------------------------------------ A
 console.log("\nA · bei AUS gibt es nichts");
 await vorbereiten(page,{},VORLAGEN);
 let s=await karteSichtbar(page);
 p(s.da&&!s.sichtbar,"Bibliothek in den Einstellungen unsichtbar",s);
 let ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurement_vorlagen"));
 p(ruf.length===0,"bei AUS wird gar nicht erst geladen",{n:ruf.length});
 let cache=await page.evaluate(()=>vorlagenCache.length);
 p(cache===0,"nichts im Speicher",{n:cache});
 // Knoepfe: measAlsVorlage haengt zusaetzlich am geoeffneten Formular
 let knopf=await page.evaluate(()=>({v:$("measAlsVorlage").hidden,c:$("chooseFromVorlage").hidden,s:$("cockpitSerie").hidden}));
 p(knopf.v===true&&knopf.c===true&&knopf.s===true,"alle drei Knoepfe versteckt",knopf);

 await vorbereiten(page,{haupt:false,vorlagen:true,serien:true},VORLAGEN);
 s=await karteSichtbar(page);
 p(!s.sichtbar,"Untermodul an, Hauptschalter aus: weiterhin nichts");
 const abh=await page.evaluate(()=>{pmUebernehmen({haupt:true,serien:true});return {v:pmAktiv("vorlagen"),s:pmAktiv("serien")}});
 p(abh.s===false,"Serien ohne Vorlagen bleiben aus",abh);

 // ------------------------------------------------------------------ B
 console.log("\nB · eingeschaltet: Bibliothek");
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
 s=await karteSichtbar(page);
 p(s.sichtbar,"Bibliothek sichtbar",s);
 knopf=await page.evaluate(()=>({c:$("chooseFromVorlage").hidden,s:$("cockpitSerie").hidden}));
 p(knopf.c===false&&knopf.s===false,"„Aus Vorlage\" und „Serie\" sichtbar",knopf);
 let liste=await page.evaluate(()=>({
  text:$("vorlagenListe").textContent.replace(/\s+/g," ").trim(),
  zeilen:[...$("vorlagenListe").querySelectorAll(".vorlage-zeile")].length,
  umb:[...$("vorlagenListe").querySelectorAll("[data-vorlage-umbenennen]")].map(x=>x.dataset.vorlageUmbenennen),
  del:[...$("vorlagenListe").querySelectorAll("[data-vorlage-loeschen]")].map(x=>x.dataset.vorlageLoeschen)
 }));
 p(liste.zeilen===2,"zwei Vorlagen gelistet",{n:liste.zeilen});
 p(/Standardrinne/.test(liste.text)&&/Rinne Halbrund/.test(liste.text),"Name und deutsche Art",{t:liste.text.slice(0,120)});
 p(/Reihenhaus/.test(liste.text),"Notiz angezeigt");
 p(liste.umb.join()==="1,2"&&liste.del.join()==="1,2","Umbenennen und Loeschen je Zeile",liste);

 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},[]);
 liste=await page.evaluate(()=>$("vorlagenListe").textContent.replace(/\s+/g," ").trim());
 p(/Noch keine Vorlage/.test(liste),"Leerzustand benannt",{t:liste.slice(0,90)});

 // ------------------------------------------------------------------ C
 console.log("\nC · aus einer Massaufnahme eine Vorlage machen");
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},[]);
 await page.evaluate(()=>{
  newMeasurementWithType("kehle");
  // Die Eingabefelder entstehen erst beim Zeichnen des Registers 2.
  if(typeof keaSetzeSchritt==="function")keaSetzeSchritt(2);
  setMeasProjectField(7);
  $("measTitle").value="Kehle West";
  $("measNote").value="Vorsicht, Ziegel lose";
  // Ueber echte input-Ereignisse, damit der Modul-Handler den Wert wirklich
  // in seinen Zustand uebernimmt - ein blosses .value setzt nichts.
  [["kea_nh","42.5"],["kea_nl","23.5"],["kea_gl","100"]].forEach(([i,v])=>{
   const e=$(i); e.value=v; e.dispatchEvent(new Event("input",{bubbles:true}));
  });
  window.__ruf=[];
 });
 p((await klick(page,"#measAlsVorlage"))==="ok","Knopf im Formular bedienbar");
 let dlg=await page.evaluate(()=>({
  offen:!$("vorlageSpeichernModal").hidden,
  name:$("vorlageName").value, typ:$("vorlageTypName").textContent
 }));
 p(dlg.offen,"Dialog offen");
 p(dlg.name==="Kehle West","Bezeichnung als Namensvorschlag",dlg);
 p(dlg.typ==="Kehle","deutsche Art im Dialog",dlg);

 await page.evaluate(()=>{$("vorlageName").value="Standardkehle";$("vorlageNotiz").value="42.5/23.5"});
 await klick(page,"#saveVorlage");
 let ins=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurement_vorlagen"&&r.op==="insert"));
 p(ins.length===1,"genau ein Insert",{n:ins.length});
 const satz=ins[0]?ins[0].werte:{};
 p(satz.name==="Standardkehle"&&satz.type==="kehle","Name und Art gespeichert",satz);
 p(!("company_id" in satz),"KEINE company_id vom Client",Object.keys(satz));
 ["project_id","title","note","date","photo_path","photo_paths","sketch_paths",
  "workflow_status","freigegeben_von","id"].forEach(k=>{
  p(!(k in satz),"kein "+k+" in der Vorlage");
 });
 p(Object.keys(satz).sort().join()==="data,name,notiz,type",
   "genau vier Felder: name, type, data, notiz",Object.keys(satz).sort());
 // Die Masse stammen aus demselben Payload, aus dem auch gespeichert wird
 const gleich=await page.evaluate(()=>{
  const m=buildMeasurementFromForm();
  const v=window.__db.vorlagen[0];
  return {a:JSON.stringify(m.data), b:JSON.stringify(v.data)};
 });
 p(gleich.a===gleich.b,"Masse identisch zum Speicher-Payload",{n:gleich.a.length});
 p(/"nh":42.5|"nh":"42.5"/.test(gleich.b),"die eingetippten Werte stehen wirklich drin",{b:gleich.b.slice(0,90)});
 let inhalt=await page.evaluate(()=>JSON.stringify(window.__db.vorlagen[0].data));
 p(!/Kehle West|Vorsicht/.test(inhalt),"weder Bezeichnung noch Notiz in den Massen",{i:inhalt.slice(0,120)});

 // gleicher Name + gleiche Art -> ueberschreiben statt verdoppeln
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,"#measAlsVorlage");
 await page.evaluate(()=>{$("vorlageName").value="standardkehle"});
 await klick(page,"#saveVorlage");
 let auf=await page.evaluate(()=>({
  ins:window.__ruf.filter(r=>r.tabelle==="measurement_vorlagen"&&r.op==="insert").length,
  upd:window.__ruf.filter(r=>r.tabelle==="measurement_vorlagen"&&r.op==="update").length,
  n:window.__db.vorlagen.length
 }));
 p(auf.ins===0&&auf.upd===1,"gleicher Name: Update statt Insert",auf);
 p(auf.n===1,"es bleibt bei einer Vorlage",auf);

 // still blockiert (0 Zeilen) darf kein Erfolg sein
 await page.evaluate(()=>{window.__db.blockiert=true;window.__ruf=[]});
 await klick(page,"#measAlsVorlage");
 await page.evaluate(()=>{$("vorlageName").value="Blockiert"});
 await klick(page,"#saveVorlage");
 let blo=await page.evaluate(()=>({
  offen:!$("vorlageSpeichernModal").hidden,
  hinweis:$("vorlageSpeichernHinweis").textContent,
  hAn:!$("vorlageSpeichernHinweis").hidden,
  n:window.__db.vorlagen.length
 }));
 p(blo.offen&&blo.hAn&&/Berechtigung/.test(blo.hinweis),"blockiert: Dialog bleibt offen und sagt warum",blo);
 p(blo.n===1,"nichts angelegt",blo);
 await page.evaluate(()=>{window.__db.blockiert=false;$("vorlageSpeichernModal").hidden=true});

 // ------------------------------------------------------------------ D
 console.log("\nD · aus einer Vorlage eine Massaufnahme");
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
 await page.evaluate(()=>{
  $("measurementsModal").hidden=true;
  $("measTypeChooserModal").hidden=false;
  cockpitTypWahl=null;
  window.__ruf=[];
 });
 p((await klick(page,"#chooseFromVorlage"))==="ok","„Aus Vorlage\" bedienbar");
 await page.waitForTimeout(120);
 let wahl=await page.evaluate(()=>({
  offen:!$("vorlageWahlModal").hidden,
  titel:$("vorlageWahlTitel").textContent,
  n:[...$("vorlageWahlBody").querySelectorAll("[data-vorlage-nehmen]")].length,
  text:[...$("vorlageWahlBody").querySelectorAll("[data-vorlage-nehmen]")].map(b=>b.textContent.trim())
 }));
 p(wahl.offen&&wahl.n===2,"beide Vorlagen zur Wahl",wahl);
 p(/Massaufnahme aus Vorlage/.test(wahl.titel),"Titel nennt den Zweck",wahl);
 p(wahl.text.every(t=>/Verwenden/.test(t)),"Knopftext „Verwenden\"",wahl);

 await klick(page,'[data-vorlage-nehmen="2"]');
 let neu=await page.evaluate(()=>{
  const m=buildMeasurementFromForm();
  return {typ:$("measType").value, titel:$("measTitle").value, notiz:$("measNote").value,
          projekt:measSelectedProjectId, data:m.data,
          fotos:(measPhotos||[]).length, skizzen:(measSketches||[]).length,
          id:currentMeasurementId, wahlZu:$("vorlageWahlModal").hidden,
          chooserZu:$("measTypeChooserModal").hidden};
 });
 p(neu.typ==="lukarne","richtige Art uebernommen",{t:neu.typ});
 p(neu.titel==="","Bezeichnung bleibt LEER - sie gehoert zum Objekt",{t:neu.titel});
 p(neu.notiz==="","Notiz bleibt leer",{n:neu.notiz});
 p(neu.id===null,"es ist eine neue, noch nicht gespeicherte Aufnahme",{i:neu.id});
 p(neu.fotos===0&&neu.skizzen===0,"keine Fotos, keine Skizzen",neu);
 p(neu.wahlZu&&neu.chooserZu,"beide Dialoge geschlossen",neu);
 p(Number(neu.data.hoehe)===1500&&Number(neu.data.laengeOben)===4000,"die Masse der Vorlage sind da",neu.data);
 const spuren=await page.evaluate(()=>{
  const m=buildMeasurementFromForm();
  return Object.keys(m).concat(Object.keys(m.data||{})).filter(k=>/vorlage/i.test(k));
 });
 p(spuren.length===0,"KEINE Verknuepfung zur Vorlage im Payload",spuren);

 // Vorlage aendern - die offene Massaufnahme bleibt unberuehrt
 await page.evaluate(()=>{window.__db.vorlagen.find(v=>v.id===2).data.hoehe=9999});
 await page.evaluate(()=>vorlagenNeuLaden());
 await page.waitForTimeout(60);
 let unber=await page.evaluate(()=>Number(buildMeasurementFromForm().data.hoehe));
 p(unber===1500,"Vorlagenaenderung wirkt NICHT auf die Massaufnahme",{h:unber});

 // ------------------------------------------------------------------ E
 console.log("\nE · Serie");
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;window.__ruf=[]});
 // v3.11: die Cockpit-Abschnitte sind klappbar und starten zugeklappt.
 // Fuer diesen Pruefstand wird alles aufgeklappt - eine ueberholte
 // Erwartung, kein Codefehler; geprueft wird weiterhin dasselbe.
 await page.evaluate(()=>{document.querySelectorAll("#projectCockpitModal .klapp:not(.open) .klapp-kopf[data-klapp]").forEach(k=>k.click())});
 await page.waitForTimeout(120);
 p((await klick(page,"#cockpitSerie"))==="ok","Serien-Knopf im Cockpit bedienbar");
 await page.waitForTimeout(120);
 wahl=await page.evaluate(()=>({offen:!$("vorlageWahlModal").hidden,titel:$("vorlageWahlTitel").textContent,
  text:[...$("vorlageWahlBody").querySelectorAll("[data-vorlage-nehmen]")].map(b=>b.textContent.trim())}));
 p(wahl.offen&&/Serie aus Vorlage/.test(wahl.titel),"Wahl im Serien-Modus",wahl);
 p(wahl.text.every(t=>/Serie daraus/.test(t)),"Knopftext „Serie daraus\"",wahl);

 await klick(page,'[data-vorlage-nehmen="2"]');
 let ser=await page.evaluate(()=>({offen:!$("serieModal").hidden,
  vorlage:$("serieVorlageName").textContent, typ:$("serieTypName").textContent,
  anzahl:$("serieAnzahl").value, praefix:$("serieBezeichnung").value,
  vorschau:$("serieVorschau").textContent}));
 p(ser.offen,"Seriendialog offen");
 p(ser.vorlage==="Lukarne Nord"&&ser.typ==="Lukarne Seitenverkleidung","Vorlage und Art benannt",ser);
 p(/3 eigenständige Massaufnahmen/.test(ser.vorschau),"Vorschau nennt die Zahl",{v:ser.vorschau});
 p(/„Lukarne Nord 1“/.test(ser.vorschau),"und die Bezeichnungen",{v:ser.vorschau});

 await page.evaluate(()=>{
  $("serieAnzahl").value="4"; $("serieBezeichnung").value="Lukarne"; $("serieStart").value="3";
  ["serieAnzahl","serieBezeichnung","serieStart"].forEach(i=>$(i).dispatchEvent(new Event("input")));
 });
 let vs=await page.evaluate(()=>$("serieVorschau").textContent);
 p(/4 eigenständige/.test(vs)&&/„Lukarne 3“/.test(vs)&&/„Lukarne 6“/.test(vs),"Vorschau folgt der Eingabe",{v:vs});

 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,"#serieAnlegenBtn");
 await page.waitForTimeout(150);
 let sins=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurements"&&r.op==="insert"));
 p(sins.length===1,"ein einziger Insert-Aufruf",{n:sins.length});
 const zeilen=sins[0]?sins[0].werte:[];
 p(Array.isArray(zeilen)&&zeilen.length===4,"vier Zeilen",{n:zeilen.length});
 p(zeilen.map(z=>z.title).join("|")==="Lukarne 3|Lukarne 4|Lukarne 5|Lukarne 6","eigene Bezeichnung je Zeile",zeilen.map(z=>z.title));
 p(zeilen.every(z=>z.project_id===7),"alle im geoeffneten Projekt",zeilen.map(z=>z.project_id));
 p(zeilen.every(z=>z.type==="lukarne"),"Art aus der Vorlage",zeilen.map(z=>z.type));
 p(zeilen.every(z=>Number(z.data.hoehe)===1500),"Masse aus der Vorlage");
 p(zeilen.every(z=>!("workflow_status" in z)&&!("freigegeben_von" in z)&&!("company_id" in z)),
   "kein Arbeitsstatus, keine company_id vom Client",Object.keys(zeilen[0]||{}));
 p(zeilen.every(z=>Array.isArray(z.photo_paths)&&z.photo_paths.length===0&&
                   Array.isArray(z.sketch_paths)&&z.sketch_paths.length===0),"keine Fotos, keine Skizzen");
 // eigenstaendig: die Masse sind KOPIEN, nicht dasselbe Objekt
 let eigen=await page.evaluate(()=>{
  const m=window.__db.messungen;
  m[0].data.hoehe=1;
  return {erste:m[0].data.hoehe, zweite:m[1].data.hoehe,
          vorlage:window.__db.vorlagen.find(v=>v.id===2).data.hoehe, n:m.length};
 });
 p(eigen.n===4&&eigen.erste===1&&eigen.zweite===1500&&eigen.vorlage===1500,
   "eine Aenderung wirkt weder auf die anderen noch auf die Vorlage",eigen);
 let zu=await page.evaluate(()=>$("serieModal").hidden);
 p(zu===true,"Dialog danach geschlossen");

 // ohne Projekt keine Serie
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
 let ohne=await page.evaluate(async()=>{
  cockpitProjectId=null;
  serieVorlage=window.__db.vorlagen[1]; serieProjektId=null;
  $("serieModal").hidden=false; $("serieAnzahl").value="2"; $("serieBezeichnung").value="X";
  await serieAnlegen();
  return {hinweis:$("serieHinweis").textContent,an:!$("serieHinweis").hidden,n:window.__db.messungen.length};
 });
 p(ohne.an&&/Projekt/.test(ohne.hinweis)&&ohne.n===0,"ohne Projekt wird nichts angelegt",ohne);

 // ------------------------------------------------------------------ F
 console.log("\nF · Umbenennen und Loeschen");
 await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
 let um=await page.evaluate(async()=>{
  window.prompt=()=>"Neuer Name"; window.confirm=()=>true;
  await vorlageUmbenennen(1);
  return {name:window.__db.vorlagen.find(v=>v.id===1).name,
          hinweis:$("vorlagenHinweis").textContent,
          liste:$("vorlagenListe").textContent.replace(/\s+/g," ")};
 });
 p(um.name==="Neuer Name"&&/Umbenannt/.test(um.hinweis)&&/Neuer Name/.test(um.liste),"Umbenennen wirkt",um);
 let leer=await page.evaluate(async()=>{
  window.prompt=()=>"   ";
  await vorlageUmbenennen(1);
  return {name:window.__db.vorlagen.find(v=>v.id===1).name,hinweis:$("vorlagenHinweis").textContent};
 });
 p(leer.name==="Neuer Name"&&/nicht leer/.test(leer.hinweis),"leerer Name wird abgewiesen",leer);
 let del=await page.evaluate(async()=>{
  window.confirm=()=>true;
  await vorlageLoeschen(2);
  return {n:window.__db.vorlagen.length,hinweis:$("vorlagenHinweis").textContent};
 });
 p(del.n===1&&/gelöscht/.test(del.hinweis),"Loeschen wirkt",del);
 let dblo=await page.evaluate(async()=>{
  window.__db.blockiert=true; window.confirm=()=>true;
  await vorlageLoeschen(1);
  window.__db.blockiert=false;
  return {n:window.__db.vorlagen.length,hinweis:$("vorlagenHinweis").textContent};
 });
 p(dblo.n===1&&/Berechtigung/.test(dblo.hinweis),"blockiertes Loeschen gilt nicht als Erfolg",dblo);
 let abbr=await page.evaluate(async()=>{
  window.confirm=()=>false;
  await vorlageLoeschen(1);
  return window.__db.vorlagen.length;
 });
 p(abbr===1,"Abbrechen loescht nichts",{n:abbr});

 // ------------------------------------------------------------------ G
 console.log("\nG · Verlauf");
 let vl=await page.evaluate(()=>{
  const zeile={entity_type:"vorlage",action:"updated",
   changes:[{field:"name",old:"Alt",new:"Neu"},
            {field:"vorlage_data",old:null,new:null},
            {field:"type",old:"kehle",new:"lukarne"}]};
  return verlaufChangesHtml(zeile).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 });
 p(/Name Alt → Neu/.test(vl),"Name im Klartext",{v:vl});
 p(/Masse geändert/.test(vl),"Masse: nur DASS geaendert wurde",{v:vl});
 p(/Art Kehle → Lukarne/.test(vl),"Art in deutscher Bezeichnung",{v:vl});
 p(!/vorlage_data/.test(vl),"kein Rohfeldname sichtbar",{v:vl});

 // ------------------------------------------------------------------ H
 console.log("\nH · Bildschirmbreiten");
 for(const w of [360,412,768,1200]){
  await page.setViewportSize({width:w,height:900});
  await vorbereiten(page,{haupt:true,vorlagen:true,serien:true},VORLAGEN);
  await page.evaluate(()=>{$("settingsModal").hidden=false;renderVorlagenListe()});
  const ueb=await page.evaluate(()=>{
   const b=$("vorlagenListe").getBoundingClientRect();
   return {raus:b.right>window.innerWidth+1, scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(!ueb.raus&&!ueb.scroll,w+" px: nichts laeuft seitlich hinaus",ueb);
  await page.evaluate(()=>{$("settingsModal").hidden=true});
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await browser.close();
 process.exit(fail?1:0);
})();
