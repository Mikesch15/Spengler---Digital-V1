// v3.417: Teile aus dem CAD (js/104) - Anzeige im Cockpit, Uebernahme als Massaufnahme "Freies Profil", Verknuepfung nach dem Speichern.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.__tab={};window.__aufrufe=[];
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:(tab)=>{const q={};['select','eq','order','limit','in','neq','is'].forEach(k=>q[k]=()=>q);
   q.update=(w)=>{window.__aufrufe.push({tab,update:w});return q};
   q.then=r=>Promise.resolve({data:window.__tab[tab]||[],error:null}).then(r);return q},
  storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
const TEIL={id:"t1",project_id:7,teil_nr:1,teil_label:"18162-01",name:"Ortgang",stueck:2,material_name:"Alu",staerke_mm:0.7,zuschnitt_breite_mm:200,zuschnitt_laenge_mm:3000,
 vorlage_name:"Winkelfalz",dokument:"Dach",measurement_id:null,status:"neu",
 app_data:{material:"",ansicht:"rechts",konisch:"nein",schenkel:[{laenge:168,winkel:0},{laenge:25,winkel:90},{laenge:7,winkel:180}],segmente:[{laenge:3000,massen:[]}],cad:{material_name:"Alu"}}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 const ev=(f,...a)=>page.evaluate(f,...a);
 console.log("\nA · Anzeige");
 let r=await ev(t=>({leer:cadTeileHtml([]),html:cadTeileHtml([t,Object.assign({},t,{id:"t2",teil_label:"18162-02",app_data:{},measurement_id:55})])}),TEIL);
 p(r.leer==="","ohne CAD-Teile erscheint nichts",r.leer);
 p(/18162-01 Ortgang/.test(r.html)&&/Zuschnitt 200 × 3000 mm/.test(r.html)&&/Alu, 0.7 mm/.test(r.html)&&/2 Stück/.test(r.html)&&/Vorlage Winkelfalz/.test(r.html),"Teil mit Zuschnitt, Material, Stückzahl, Vorlage",r.html.slice(0,300));
 p(/data-cad-teil-nehmen="t1"/.test(r.html)&&/data-open-project-measurement="55"/.test(r.html),"neu: Übernehmen; übernommen: Massaufnahme öffnen");
 p(/\(2, 1 neu\)/.test(r.html),"Zähler 2, davon 1 neu");
 r=await ev(()=>({a:cadTeilKannUebernehmen({app_data:{}}),b:cadTeilKannUebernehmen({app_data:{schenkel:[{}]}}),c:cadTeilKannUebernehmen(null)}));
 p(!r.a&&!r.b&&!r.c,"ohne mindestens zwei Schenkel nicht übernehmbar",r);
 r=await ev(()=>cadTeileHtml([{id:"x",name:'<img src=x onerror=alert(1)>',teil_label:"",app_data:{}}]));
 p(!/<img src=x/.test(r),"Texte werden maskiert",r.slice(0,200));
 console.log("\nB · Übernehmen und Verknüpfen");
 r=await ev(t=>{window.__got=null;window.measType={value:"freies_profil"};
  window.measurementAlsVorlage=(m,pid)=>{window.__got={m,pid};document.body.insertAdjacentHTML("beforeend",'<select id="measType"></select><input id="measTitle">');$("measType").innerHTML='<option value="freies_profil" selected>x</option>'};
  window.measStaerkeSetzen=v=>{window.__staerke=v};
  cadTeileCache=[t];const ret=cadTeilUebernehmen("t1");
  return {ret,got:window.__got,titel:$("measTitle").value,staerke:window.__staerke,cad:window.__got&&window.__got.m.data.cad,offen:cadTeilOffen&&cadTeilOffen.id}},TEIL);
 p(r.ret===true&&r.got.m.type==="freies_profil"&&r.got.pid===7&&r.got.m.data.schenkel.length===3,"öffnet eine neue Massaufnahme «Freies Profil» im Projekt mit den Schenkeln",r.got);
 p(r.cad===undefined&&r.titel==="18162-01 Ortgang"&&r.staerke===0.7&&r.offen==="t1","Titel, Dicke gesetzt, Herkunftsfeld entfernt, Teil gemerkt",r);
 r=await ev(async()=>{window.__aufrufe=[];await cadTeilNachSpeichern({id:901});const a=window.__aufrufe.slice();window.__aufrufe=[];await cadTeilNachSpeichern({id:902});return {a,b:window.__aufrufe,offen:cadTeilOffen}});
 p(r.a.length===1&&r.a[0].tab==="cad_teile"&&r.a[0].update.measurement_id===901&&r.a[0].update.status==="uebernommen","nach dem Speichern: measurement_id und Status am Teil",r.a);
 p(r.b.length===0&&r.offen===null,"nur einmal: eine weitere Aufnahme wird nicht verknüpft",r);
 r=await ev(async()=>{cadTeilOffen={id:"alt",projectId:7,zeit:Date.now()-31*60*1000};window.__aufrufe=[];await cadTeilNachSpeichern({id:5});return window.__aufrufe.length});
 p(r===0,"nach 30 Minuten verfällt die Vormerkung");
 r=await ev(()=>{measurementAlsVorlage=()=>{};cadTeileCache=[];return cadTeilUebernehmen("gibtsnicht")});
 p(r===false,"unbekanntes Teil: nichts passiert");
 console.log("\nC · Einbindung in die Cockpit-Liste");
 r=await ev(async t=>{document.body.insertAdjacentHTML("beforeend",'<div id="cockpitMeasBody"><div class="empty">x</div></div>');
  window.__tab.cad_teile=[t];cockpitProjectId=7;await cadTeileNachListe(7);await cadTeileNachListe(7);
  return {n:document.querySelectorAll("#cadTeileBox").length,text:$("cockpitMeasBody").textContent}},TEIL);
 p(r.n===1&&/Ortgang/.test(r.text),"erscheint unter der Liste, bei erneutem Laden nicht doppelt",r);
 r=await ev(async()=>{window.__tab.cad_teile=[];await cadTeileNachListe(7);return document.querySelectorAll("#cadTeileBox").length});
 p(r===0,"keine Teile mehr: Karte verschwindet");
 r=await ev(async t=>{window.__tab.cad_teile=[t];cockpitProjectId=8;await cadTeileNachListe(7);return document.querySelectorAll("#cadTeileBox").length},TEIL);
 p(r===0,"anderes Projekt inzwischen offen: nichts eingefügt");
 p(await ev(()=>typeof loadProjectMeasurements==="function"&&/cadTeileNachListe/.test(loadProjectMeasurements.toString())),"js/09 ruft den Hook auf");
 p(await ev(()=>/cadTeilNachSpeichern/.test(document.documentElement.innerHTML)||true),"js/16 Hook vorhanden (Dateiprüfung unten)");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();
 const fs=require("fs");
 p(/cadTeilNachSpeichern/.test(fs.readFileSync("js/16-massaufnahme-formular.js","utf8")),"js/16 ruft cadTeilNachSpeichern auf");
 p(/js\/104-cad-teile\.js/.test(fs.readFileSync("index.html","utf8"))&&/js\/104-cad-teile\.js/.test(fs.readFileSync("sw.js","utf8")),"js/104 steht in index.html und sw.js");
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");process.exit(fail?1:0);
})();
